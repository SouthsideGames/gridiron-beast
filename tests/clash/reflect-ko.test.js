// Reflected-damage knockout correction (owner authorization 2026-10-21, values 1.1.0 'current' ruleset).
// When Magma Crust (Pyroclast) or thorns (Thornback) knock out the attacker: the blow that broke the shield lands, the attacker is
// knocked out exactly once right after that blow, nothing else in its action happens, it never acts again, and its side's next
// monster steps up before the opponent acts. The values 1.0.0 ruleset keeps the historical behaviour (no knockout recorded).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClash, logHash } from '../../src/clash/engine.js';
import { battleConfig } from '../../src/clash/values.js';
import { stateAt } from '../../src/ui/clash/choreographer.js';
import { integrityProblems } from '../../src/clash/level1.js';
import { mon } from './helpers.js';
import { createRng } from '../../src/core/rng.js';

const REFLECT = (e) => e.kind === 'damage' && /Magma Crust erupts|thorns:/.test(e.text);
const ACTIVE = new Set(['damage', 'heal', 'shield', 'condition', 'swap', 'buff', 'debuff', 'bench_miss', 'swap_refused', 'skip', 'bench_blocked']);
const STRIKERS = ['emberfox', 'cinderclaw', 'firestorm', 'duskrunner', 'breezefang', 'vyrnax', 'stormlynx', 'ashkit', 'rockram', 'mudcub', 'leafhorn', 'elderoot', 'tidepaw', 'glimmer'];

/** Every reflected knockout in a battle, with the indexes the rules care about. */
function reflectedKOs(r) {
  const out = [];
  r.log.forEach((e, i) => {
    if (!REFLECT(e) || e.hpAfter !== 0) return;
    const att = e.target; const ko = r.log.findIndex((x, j) => j > i && x.kind === 'ko' && x.target === att);
    out.push({ i, att, by: e.actor, ko, ex: e.ex });
  });
  return out;
}

/** The rules every battle under the corrected ruleset must satisfy (checked on every scenario battle). */
function checkCorrected(r) {
  assert.deepEqual(integrityProblems(r), []);
  const all = [...r.lines.a, ...r.lines.b];
  for (const x of all) { // a monster at 0 HP has exactly one knockout; a standing one has none
    const kos = r.log.filter((e) => e.kind === 'ko' && e.target === x.id).length;
    assert.equal(kos, x.hp <= 0 ? 1 : 0, `${x.id} ${x.name}: ${kos} ko events at ${x.hp} HP`);
  }
  r.log.forEach((e, k) => { // nothing is done by a monster after its knockout, and its HP never rises again
    if (e.kind !== 'ko') return;
    for (const later of r.log.slice(k + 1)) {
      // (a condition that runs out on the burn tick that knocked it out is logged as expiring: a passive record, not an action)
      if (later.actor === e.target && !(later.kind === 'condition' && later.result === 'expired' && later.ex === e.ex)) assert.ok(!ACTIVE.has(later.kind), `${e.target} acted after its knockout: ${later.text}`);
      if (later.target === e.target && later.kind === 'heal') assert.fail(`${e.target} was healed after its knockout`);
    }
  });
  for (let i = 0; i < r.log.length; i++) { // front-row consistency (the display rule): the acting front is the engine's front
    const e = r.log[i]; if (e.kind !== 'damage' || !e.actor || !e.target || /back row|bench|arrival|splash/i.test(e.text) || REFLECT(e)) continue;
    const st = stateAt(r, i - 1); if (st.front[e.actor[0]]) assert.equal(st.front[e.actor[0]], e.actor, `event ${i}: ${e.text}`);
    if (st.front[e.target[0]]) assert.equal(st.front[e.target[0]], e.target, `event ${i} hits a monster that is not in front: ${e.text}`);
  }
  for (const k of reflectedKOs(r)) {
    assert.ok(k.ko > k.i, `${k.att} knocked out by reflected damage has a ko event`);
    const between = r.log.slice(k.i + 1, k.ko);
    // only the blow that broke the shield (and the defender's own knockout) may come between the reflected damage and the ko
    for (const e of between) assert.ok((e.kind === 'damage' && e.actor === k.att) || (e.kind === 'ko' && e.target === k.by) || e.kind === 'heal' && e.actor === k.by || e.kind === 'shield' && e.actor === k.by, `between reflected damage and ko: ${e.kind} ${e.text}`);
    assert.ok(between.filter((e) => e.kind === 'damage').length <= 1, 'at most the one blow that broke the shield');
    assert.match(r.log[k.ko].text, / by .*'s (Magma Crust|Bramble Shell)$/);
    // the next event on the attacker's side is its replacement stepping up (or the battle is over)
    const side = k.att[0]; if (stateAt(r, k.i - 1).front[side] !== k.att) continue; // a bench attacker (arrival hit) leaves no gap in front
    const next = r.log.slice(k.ko + 1).find((e) => (e.actor && e.actor[0] === side) || (e.target && e.target[0] === side && e.kind === 'damage'));
    if (next) assert.ok(next.kind === 'enter' || next.kind === 'ko' || r.log.slice(k.ko + 1).indexOf(next) === -1, `after the reflected ko the next ${side} event is ${next.kind}: ${next.text}`);
  }
}

/** Seeded battles until `want` returns a match; every battle examined is also held to the corrected rules. */
function find(label, mk, want, { config = {}, tries = 600, seed = 1 } = {}) {
  const rng = createRng(seed);
  for (let t = 0; t < tries; t++) {
    const { a, b } = mk(rng, t); const r = simulateClash({ a, b, seed: rng.int(1e6), config: battleConfig(config) });
    checkCorrected(r);
    const hit = want(r); if (hit) return { r, hit, a, b };
  }
  assert.fail(`no battle found for: ${label}`);
}
const lineup = (rng, ids) => ids.map((id) => mon(id, rng.seed(), { overall: 55 + rng.int(25) }));
const pick = (rng, L) => L[rng.int(L.length)];

test('1. Magma Crust knocks out the attacker: one ko right after the blow, nothing more from it, the replacement steps up before Pyroclast acts', () => {
  const { r, hit } = find('Pyroclast KO', (rng) => ({ a: lineup(rng, [pick(rng, STRIKERS), pick(rng, STRIKERS), pick(rng, STRIKERS)]), b: lineup(rng, [pick(rng, STRIKERS), 'pyroclast', pick(rng, STRIKERS)]) }),
    (r) => reflectedKOs(r).find((k) => /Magma Crust/.test(r.log[k.i].text) && r.lines.a.filter((x) => x.hp > 0 || r.log.findIndex((e) => e.kind === 'ko' && e.target === x.id) > k.ko).length > 0));
  const blow = r.log.slice(hit.i + 1, hit.ko).filter((e) => e.kind === 'damage' && e.actor === hit.att);
  assert.equal(blow.length, 1, 'the blow that broke the shield lands'); assert.equal(r.log[hit.i - 1].kind, 'shield_break');
  const enter = r.log.findIndex((e, j) => j > hit.ko && e.kind === 'enter' && e.actor[0] === 'a');
  const pyroNext = r.log.findIndex((e, j) => j > hit.ko && e.kind === 'damage' && e.actor === hit.by && e.target[0] === 'a');
  if (pyroNext > 0) assert.ok(enter > hit.ko && enter < pyroNext, 'the replacement enters before Pyroclast strikes it');
  // before the fix the same battle recorded no knockout (historical ruleset)
  assert.equal(r.log.filter((e) => e.kind === 'ko' && e.target === hit.att).length, 1);
});

test('2. thorns knock out the attacker: same rules for Thornback', () => {
  const { r, hit } = find('Thornback KO', (rng) => ({ a: lineup(rng, [pick(rng, STRIKERS), pick(rng, STRIKERS), pick(rng, STRIKERS)]), b: lineup(rng, [pick(rng, STRIKERS), 'thornback', pick(rng, STRIKERS)]) }),
    (r) => reflectedKOs(r).find((k) => /thorns/.test(r.log[k.i].text)), { tries: 1500 });
  assert.match(r.log[hit.ko].text, /Bramble Shell$/); assert.equal(r.log.filter((e) => e.kind === 'ko' && e.target === hit.att).length, 1);
});

test('3. reflected damage that does not knock out changes nothing: no ko, the attacker finishes its action and keeps acting', () => {
  const { r, hit } = find('reflect without KO', (rng) => ({ a: lineup(rng, [pick(rng, STRIKERS), pick(rng, STRIKERS)]), b: lineup(rng, [rng.int(2) ? 'pyroclast' : 'thornback', pick(rng, STRIKERS)]) }),
    (r) => { const i = r.log.findIndex((e) => REFLECT(e) && e.hpAfter > 0); return i >= 0 ? { i, att: r.log[i].target } : null; });
  assert.equal(r.log.filter((e) => e.kind === 'ko' && e.target === hit.att && r.log.indexOf(e) < hit.i + 3).length, 0);
  assert.ok(r.log.slice(hit.i + 1).some((e) => e.actor === hit.att && e.kind === 'damage'), 'the attacker still strikes');
  // a battle with no reflected knockout is identical under the historical and the corrected handling of the same configuration
  const rng = createRng(77); let compared = 0;
  for (let t = 0; t < 120; t++) {
    const a = lineup(rng, ['pyroclast', pick(rng, STRIKERS)]), b = lineup(rng, [pick(rng, STRIKERS), 'thornback']); const seed = rng.int(1e6);
    const now = simulateClash({ a, b, seed, config: battleConfig({}) }); checkCorrected(now);
    if (reflectedKOs(now).length) continue;
    const hist = simulateClash({ a, b, seed, config: battleConfig({ ruleset: 'v1.0.0', duration: 'C6', swapCost: 'half', patches: [] }) });
    if (hist.log.some((e) => REFLECT(e) && e.hpAfter === 0)) continue;
    // same rules except the move table; compare only battles where no approved move is involved
    if ([...a, ...b].some((m) => ['elderoot', 'tidefin', 'tsunarok', 'duskrunner', 'cinderclaw', 'ashkit'].includes(m.species))) continue;
    compared++; assert.equal(now.log.slice(1).map((e) => e.text).join('\n'), hist.log.slice(1).map((e) => e.text).join('\n'));
  }
  assert.ok(compared >= 10, `compared ${compared}`);
});

test('4. attacker and defender reach 0 HP in the same blow: the defender is knocked out first, then the attacker; each exactly once', () => {
  const { r, hit } = find('double KO', (rng) => ({ a: lineup(rng, [pick(rng, STRIKERS), pick(rng, STRIKERS)]), b: lineup(rng, [rng.int(2) ? 'pyroclast' : 'thornback', 'snowmoth', 'metalhorn']) }), // supports keep re-shielding a hurt Tank
    (r) => reflectedKOs(r).find((k) => r.log.slice(k.i + 1, k.ko).some((e) => e.kind === 'ko' && e.target === k.by)), { tries: 4000 });
  const defKo = r.log.findIndex((e, j) => j > hit.i && e.kind === 'ko' && e.target === hit.by);
  assert.ok(defKo > hit.i && defKo < hit.ko, 'defender ko, then attacker ko');
  assert.ok(['a', 'b'].includes(r.winner)); assert.ok(r.by === 'knockout' || r.by === 'coin');
});

test('5-6. a reflected knockout with a replacement available (it steps up) and with none left (the battle ends at once)', () => {
  find('with bench', (rng) => ({ a: lineup(rng, [pick(rng, STRIKERS), pick(rng, STRIKERS), pick(rng, STRIKERS)]), b: lineup(rng, [pick(rng, STRIKERS), 'pyroclast', 'thornback']) }),
    (r) => reflectedKOs(r).find((k) => r.log.slice(k.ko + 1).some((e) => e.kind === 'enter' && e.actor[0] === k.att[0])));
  const { r, hit } = find('last monster', (rng) => ({ a: lineup(rng, [pick(rng, STRIKERS), pick(rng, STRIKERS)]), b: lineup(rng, [pick(rng, STRIKERS), rng.int(2) ? 'pyroclast' : 'thornback', pick(rng, STRIKERS)]) }),
    (r) => reflectedKOs(r).find((k) => Object.values(stateAt(r, k.ko).S[k.att[0]]).every((x) => x.ko)), { tries: 4000 });
  const after = r.log.slice(hit.ko + 1).filter((e) => e.kind !== 'end');
  assert.deepEqual(after.filter((e) => ACTIVE.has(e.kind)), [], 'no action after the deciding knockout');
  assert.equal(r.by === 'knockout' ? r.winner : 'coin-or-knockout', r.by === 'knockout' ? (hit.att[0] === 'a' ? 'b' : 'a') : 'coin-or-knockout');
});

test('7. shields, conditions and forced swaps: a conditioned attacker, a multi-hit attacker, and a bench arrival hit that breaks an arriving shield', () => {
  // a multi-hit attacker stops after the hit that triggered the knockout
  find('multi-hit stops', (rng) => ({ a: lineup(rng, ['breezefang', 'breezefang']), b: lineup(rng, [pick(rng, STRIKERS), rng.int(2) ? 'pyroclast' : 'thornback', pick(rng, STRIKERS)]) }),
    (r) => reflectedKOs(r).find((k) => { const later = r.log.slice(k.ko + 1).filter((e) => e.actor === k.att); assert.equal(later.length, 0); return true; }), { tries: 3000 });
  // an attacker carrying a condition: no tick, expiry or resume after its knockout
  find('conditioned attacker', (rng) => ({ a: lineup(rng, [pick(rng, STRIKERS), pick(rng, STRIKERS)]), b: lineup(rng, ['mudcub', 'pyroclast', 'thornback', 'ashkit']) }),
    (r) => reflectedKOs(r).find((k) => { const st = stateAt(r, k.i); return st.S[k.att[0]][k.att].cond && r.log.slice(k.ko + 1).every((e) => !(e.actor === k.att && /tick|condition/.test(e.kind))); }), { tries: 3000 });
  // forced swaps: Undertow / Undercurrent arrival hits on an arriving Pyroclast or Thornback (shield on entry); every battle is
  // held to the corrected rules, and any bench attacker knocked out is never healed or used again in that pass
  const rng = createRng(909); let arrivals = 0;
  for (let t = 0; t < 400; t++) {
    const a = lineup(rng, [pick(rng, STRIKERS), 'tidefin', 'tsunarok']), b = lineup(rng, [pick(rng, STRIKERS), 'pyroclast', 'thornback', 'tidepaw']);
    const r = simulateClash({ a, b, seed: rng.int(1e6), config: battleConfig({ policies: { a: 'smart', b: 'smart' } }) }); checkCorrected(r);
    r.log.forEach((e, i) => { if (REFLECT(e) && /arrival hit/.test(r.log[i + 1]?.text || '')) arrivals++; });
  }
  assert.ok(arrivals > 0, `reflected damage from arrival hits: ${arrivals}`);
});

test('8. several retaliations in one exchange (Pyroclast and Thornback on both sides): every reflected knockout is settled in order and battles stay valid', () => {
  const { r } = find('two reflections in one exchange', (rng) => ({ a: lineup(rng, ['pyroclast', 'thornback', pick(rng, STRIKERS)]), b: lineup(rng, ['thornback', 'pyroclast', pick(rng, STRIKERS)]) }),
    (r) => { const by = {}; for (const e of r.log) if (REFLECT(e)) by[e.ex] = (by[e.ex] || 0) + 1; return Object.values(by).some((n) => n >= 2); }, { tries: 3000 });
  assert.ok(r.log.filter(REFLECT).length >= 2);
});

test('broad scan: 3,000 Tank-heavy battles under the permanent rules keep every reflected-knockout rule; the historical ruleset is unchanged', () => {
  const rng = createRng(31337); let reflectKOs = 0;
  const pool = ['pyroclast', 'thornback', ...STRIKERS, 'tidefin', 'tsunarok', 'reefclaw', 'pebble'];
  for (let t = 0; t < 3000; t++) {
    const n = 1 + rng.int(5); const a = Array.from({ length: n }, () => mon(pick(rng, pool), rng.seed(), { overall: 55 + rng.int(25) })), b = Array.from({ length: n }, () => mon(pick(rng, pool), rng.seed(), { overall: 55 + rng.int(25) }));
    const seed = rng.int(1e6); const policies = t % 3 ? { a: 'smart', b: 'smart' } : { a: 'none', b: 'none' };
    const r = simulateClash({ a, b, seed, config: battleConfig({ policies }) }); checkCorrected(r); reflectKOs += reflectedKOs(r).length;
    const r2 = simulateClash({ a, b, seed, config: battleConfig({ policies }) }); assert.equal(logHash(r2), logHash(r), 'deterministic');
  }
  assert.ok(reflectKOs > 50, `reflected knockouts ${reflectKOs}`);
  // the historical ruleset still has the defect (so old battles replay exactly)
  const hr = createRng(5); let defect = 0;
  for (let t = 0; t < 400 && !defect; t++) { const a = lineup(hr, [pick(hr, STRIKERS), pick(hr, STRIKERS)]), b = lineup(hr, ['pyroclast', 'thornback']); const h = simulateClash({ a, b, seed: hr.int(1e6), config: { ruleset: 'v1.0.0' } }); defect += reflectedKOs(h).filter((k) => k.ko < 0).length; }
  assert.ok(defect > 0, 'values 1.0.0 keeps its historical behaviour');
});
