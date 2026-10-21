// Beast Clash engine: determinism, skip-equals-watch, invariants, safeguards, interaction rulings, policies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { simulateClash, logHash, parseReplayKey, rampFor, rampModelFor } from '../../src/clash/engine.js';
import { CLASH_VALUES } from '../../src/clash/values.js';
import { createRng } from '../../src/core/rng.js';
import { mon, byArch, randomLineup, withoutRandomness, deepFrozen } from './helpers.js';

const V = CLASH_VALUES;
const quick = (a, b, seed = 1, config = {}) => simulateClash({ a, b, seed, config });

test('determinism: the same inputs give the same log hash, with Math.random and Date.now unavailable; 20 golden seeds', () => {
  const file = new URL('./fixtures/golden.json', import.meta.url);
  const golden = {};
  withoutRandomness(() => {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = createRng(seed * 101); const a = randomLineup(rng, 1 + rng.int(5)), b = randomLineup(rng, 1 + rng.int(5));
      const r1 = simulateClash({ a, b, seed }), r2 = simulateClash({ a, b, seed });
      assert.equal(logHash(r1), logHash(r2)); golden[seed] = { hash: logHash(r1), key: r1.replayKey };
    }
  });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(golden, null, 1));
  const stored = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const seed of Object.keys(stored)) { assert.equal(golden[seed].hash, stored[seed].hash, `golden seed ${seed}`); const k = parseReplayKey(stored[seed].key); assert.equal(logHash(simulateClash({ a: k.a, b: k.b, seed: k.seed, config: k.config })), stored[seed].hash, `replay key ${seed}`); }
});

test('skip equals watch: log none gives the same winner, exchanges and resolution as the full log', () => {
  const rng = createRng(77);
  for (let i = 0; i < 50; i++) { const a = randomLineup(rng, 3), b = randomLineup(rng, 3); const full = simulateClash({ a, b, seed: i }), none = simulateClash({ a, b, seed: i, log: 'none' });
    assert.equal(none.winner, full.winner); assert.equal(none.exchanges, full.exchanges); assert.equal(none.by, full.by); assert.equal(none.log.length, 0); assert.deepEqual(none.hpShare, full.hpShare); }
});

test('invariants over 2,000 random battles: HP never below 0 or NaN, every battle ends by the cap, the winner has a monster standing unless the cap decided it, inputs are unchanged', () => {
  const rng = createRng(5);
  let capped = 0, coin = 0;
  for (let i = 0; i < 2000; i++) {
    const n = 1 + rng.int(5); const a = randomLineup(rng, n), b = randomLineup(rng, n); const snapA = structuredClone(a), snapB = structuredClone(b);
    const r = simulateClash({ a, b, seed: i, log: i % 20 === 0 ? 'full' : 'none', config: { policies: { a: ['none', 'defensive', 'type', 'balanced'][i % 4], b: ['balanced', 'none', 'defensive', 'type'][i % 4] } } });
    assert.ok(r.exchanges >= 1 && r.exchanges <= V.battle.exchangeCap);
    for (const x of [...r.lines.a, ...r.lines.b]) { assert.ok(Number.isFinite(x.hp) && x.hp >= 0 && x.hp <= x.maxHp, `${x.name} hp ${x.hp}`); assert.ok(x.shield >= 0); }
    if (r.by === 'knockout') assert.ok(r.lines[r.winner].some((x) => x.hp > 0) && r.lines[r.winner === 'a' ? 'b' : 'a'].every((x) => x.hp <= 0));
    else { assert.ok(r.capped); capped++; if (r.by === 'coin') coin++; }
    assert.deepEqual(a, snapA); assert.deepEqual(b, snapB); assert.ok(deepFrozen(r));
  }
  assert.ok(capped < 100, `capped ${capped} of 2000`);
});

test('safeguards: no monster loses two actions in a row; no entry effect fires twice; forced swaps at most once per side per 3 exchanges; the arrival cannot be forced out the same exchange', () => {
  const rng = createRng(9); const stress = [['Support', 5], ['Tank', 5], ['Disruptor', 5]];
  for (const [arch, n] of stress) for (let i = 0; i < 40; i++) {
    const a = randomLineup(rng, n, byArch(arch)), b = randomLineup(rng, n); const r = simulateClash({ a, b, seed: i });
    const lastSkip = {}; for (const e of r.log) { if (e.kind === 'skip') { assert.ok(!lastSkip[e.actor], `${e.actor} skipped twice in a row at exchange ${e.ex}`); lastSkip[e.actor] = true; } else if (e.kind === 'damage' && e.actor) lastSkip[e.actor] = false; }
    const entries = {}; for (const e of r.log) if (e.kind === 'shield' && e.actor === e.target && /Stone Skin|Shell Clamp|Rooted|Bramble|Permafrost|Glacier Wall:|Landslide|Fortress|Magma|Stone Charge/.test(e.text) && !/regrows/.test(e.text)) { entries[e.actor] = (entries[e.actor] || 0) + 1; assert.ok(entries[e.actor] <= 1, `${e.actor} entry shield twice`); }
    const forced = { a: [], b: [] }; for (const e of r.log) if (e.kind === 'swap' && e.forced) { const side = e.target[0]; const last = forced[side].at(-1); if (last != null) assert.ok(e.ex - last >= V.swaps.forcedEvery, `side ${side} forced at ${last} and ${e.ex}`); forced[side].push(e.ex); }
  }
});

test('interaction rulings: Burn bypasses a shield; a swap pauses a condition; no second Tank shield; overkill is lost; heal at full HP logs zero', () => {
  // Burn against a shield: the shielded Tank still loses HP to burn ticks.
  let burnTick = null;
  for (let seed = 1; seed <= 12 && !burnTick; seed++) { const r = quick([mon('ashkit', 1, { overall: 40 }), mon('cinderclaw', 2, { overall: 40 })], [mon('pebble', 3, { overall: 90 }), mon('metalhorn', 4, { overall: 90 })], seed); burnTick = r.log.find((e) => e.kind === 'tick' && e.target === 'b0' && e.targetState.shield > 0); }
  assert.ok(burnTick, 'a burn tick landed while a shield was up'); assert.equal(burnTick.hpAfter, burnTick.targetState.hp); assert.ok(burnTick.damage > 0, 'the burn hit HP, not the shield');
  // Swap pauses: a defensive policy swap with a condition logs the pause, and the return logs the resume.
  const r2 = quick([mon('stormlynx', 5), mon('hailfang', 6), mon('mudcub', 7)], [mon('ashkit', 8), mon('wyrmkit', 9), mon('rockram', 10)], 11, { policies: { b: 'defensive' } });
  const paused = r2.log.find((e) => e.kind === 'bench' && e.paused); if (paused) assert.ok(r2.log.some((e) => e.kind === 'enter' && e.resumed === paused.paused && e.actor === paused.actor) || r2.lines.b.find((x) => x.id === paused.actor).hp === 0, 'paused condition resumed on return (or the monster never returned)');
  // No second Tank shield: a Tank swapped out and back gets "no second entry effect".
  const r3 = quick([mon('pebble', 1), mon('reefclaw', 2), mon('ashkit', 3)], [mon('tidefin', 4), mon('skywarden', 5), mon('tsunarok', 6)], 2, { backRow: 'A' });
  const shields = r3.log.filter((e) => e.kind === 'shield' && e.actor === 'a0' && e.target === 'a0'); assert.ok(shields.length <= 1, 'Stone Skin at most once');
  if (r3.log.some((e) => e.kind === 'enter' && e.actor === 'a0' && e.ex > 0)) assert.ok(r3.log.some((e) => e.kind === 'note' && e.actor === 'a0' && /no second entry effect/.test(e.text)));
  // Overkill: a knockout leaves the next monster at full HP.
  const r4 = quick([mon('vyrnax', 1, { overall: 90 })], [mon('snowmoth', 2, { overall: 40 }), mon('glimmer', 3, { overall: 40 })], 4);
  const ko = r4.log.find((e) => e.kind === 'ko'); const next = r4.log.find((e) => e.kind === 'enter' && e.ex === ko.ex && e.actor === 'b1'); assert.ok(next && next.hp === next.maxHp);
  // Heal at full HP: logged as 0.
  const r5 = quick([mon('tidepaw', 1), mon('sunwhistle', 2)], [mon('tidepaw', 3), mon('sunwhistle', 4)], 5);
  assert.ok(r5.log.some((e) => e.kind === 'heal' && e.amount === 0 && /full HP \(0\)/.test(e.text)));
});

test('sudden death: Model E for up to 3 per side, Model F for 4-5, starting at exchange 12; the cap and HP-share tiebreak with a logged coin flip on an exact tie', () => {
  assert.equal(rampModelFor(3), 'E'); assert.equal(rampModelFor(4), 'F'); assert.equal(rampFor('E', 11), 1); assert.equal(rampFor('E', 12), 1.15); assert.equal(rampFor('F', 12), 1.25); assert.equal(rampFor('E', 30), 2.25); assert.equal(rampFor('F', 30), 4);
  const r = quick([mon('tidepaw', 1), mon('elderoot', 2), mon('glimmer', 3), mon('lumen', 4), mon('sunwhistle', 5)], [mon('tidepaw', 6), mon('elderoot', 7), mon('glimmer', 8), mon('lumen', 9), mon('sunwhistle', 10)], 12);
  assert.equal(r.model, 'F'); assert.ok(r.log.some((e) => e.kind === 'sudden_death' && e.ex === 12));
  if (r.capped) { assert.ok(['hp', 'coin'].includes(r.by)); const cap = r.log.find((e) => e.kind === 'cap'); assert.ok(cap && (r.by === 'coin' ? cap.coin : cap.share)); }
});

test('swap policies are a closed list; a function option is rejected; the defensive policy swaps out below 30% at most once per 4 exchanges', () => {
  assert.throws(() => simulateClash({ a: [mon('pebble', 1)], b: [mon('pebble', 2)], seed: 1, config: { policies: { a: 'clever', b: 'none' } } }), /Unknown swap policy/);
  assert.throws(() => simulateClash({ a: [mon('pebble', 1)], b: [mon('pebble', 2)], seed: 1, config: { swapPolicy: () => 1 } }), /cannot be functions/);
  const r = quick([mon('emberfox', 1), mon('ironjaw', 2), mon('cinderclaw', 3)], [mon('ashkit', 4), mon('voltfin', 5), mon('wyrmkit', 6)], 6, { policies: { b: 'defensive' } });
  const swaps = r.log.filter((e) => e.kind === 'swap' && !e.forced && e.actor?.[0] === 'b');
  for (const s of swaps) assert.ok(s.actorState.hp / r.lines.b.find((x) => x.id === s.actor).maxHp < 0.3 + 1e-9, 'swapped out below 30%');
  for (let i = 1; i < swaps.length; i++) assert.ok(swaps[i].ex - swaps[i - 1].ex >= V.swaps.voluntaryEvery);
});

test('performance: 10,000 3v3 battles without a log in under 5 seconds', () => {
  const rng = createRng(1); const lineups = Array.from({ length: 50 }, () => [randomLineup(rng, 3), randomLineup(rng, 3)]);
  const t0 = process.hrtime.bigint(); for (let i = 0; i < 10000; i++) { const [a, b] = lineups[i % 50]; simulateClash({ a, b, seed: i, log: 'none' }); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6; assert.ok(ms < 5000, `${ms.toFixed(0)} ms`);
});
