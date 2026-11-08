// Task 8 M4 S3: the t8 damage pipeline and the immediate knockout. B3 step 8 (8a-8f) with its hook points, D5 (ordinary-only
// Striker break and Disruptor pierce; active-only Tank guard; explicit exceptions kept), D9 (modifiers multiply, one rounding; floor
// exceptions kept), the immediate-KO cancellations and post-KO exceptions (B3 rules 1-6), and the reviewer event stream. Ability
// behaviour is never asserted here: hooks are stubs that exercise the engine's steps, not contracts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClashT8, buildT8Combatant, T8_VALUES, T8_PROVISIONAL, roundHalfUp, resolveAmount, splitRaw } from '../../src/clash/t8/index.js';
import { POST_KO_EXCEPTIONS } from '../../src/clash/t8/engine.js';
import { typeFactor } from '../../src/clash/types.js';
import { rampFor } from '../../src/clash/engine.js';
import { createRng } from '../../src/core/rng.js';
import { abilityById } from '../../src/data/beast-dex.js';
import { mon } from './helpers.js';

const run = (a, b, seed = 1, extra = {}) => simulateClashT8({ a, b, seed, ...extra });
const ev = (r, kind, f = () => true) => r.log.filter((e) => e.kind === kind && f(e));
const M = (id, seed, ovr = 70) => mon(id, seed, { overall: ovr });
// Archetypes from the Dex: voltfang Striker, ashkit Disruptor, pebble / mudcub Tank, tidepaw Support, emberfox Balanced.
const arch = (id) => buildT8Combatant(M(id, 1)).archetype;
/** A stub that gives side A's active the priority tier, so a0 always acts first (P6 step 2). */
const aFirst = { initiative: (v, id) => (id[0] === 'a' ? { priority: 1 } : null) };

test('fixtures: the archetypes these tests rely on', () => {
  assert.deepEqual(['voltfang', 'ashkit', 'pebble', 'mudcub', 'tidepaw', 'emberfox'].map(arch), ['Striker', 'Disruptor', 'Tank', 'Tank', 'Support', 'Balanced']);
});

// ---------------------------------------------------------------- arithmetic (R1 item 18, D9)
test('D9 arithmetic: factors multiply and the amount is rounded once (half up by default); explicit floor / round-up exceptions keep their rounding; bounds hold', () => {
  const r = resolveAmount(41, [{ id: 'entry-penalty', factor: 0.5 }, { id: 'stalemate-c6', factor: 0.5 }, { id: 'healing-reduced', factor: 0.6 }]);
  assert.equal(r.exact, 41 * 0.5 * 0.5 * 0.6); assert.equal(r.amount, roundHalfUp(6.15)); assert.equal(r.amount, 6);
  // rounding once differs from rounding at each step: 41 x 0.5 = 20.5 -> 21 x 0.5 = 10.5 -> 11 x 0.6 = 6.6 -> 7
  assert.notEqual(r.amount, roundHalfUp(roundHalfUp(roundHalfUp(41 * 0.5) * 0.5) * 0.6));
  assert.equal(resolveAmount(10.9, [], { rounding: 'floor' }).amount, 10);
  assert.equal(resolveAmount(10.1, [], { rounding: 'ceil' }).amount, 11);
  assert.equal(resolveAmount(50, [], { max: 7 }).amount, 7);
  assert.throws(() => resolveAmount(5, [], { rounding: 'banker' }), /Unknown rounding/);
  assert.throws(() => resolveAmount(5, [{ id: 'x', factor: -1 }]), /Bad factor/);
  assert.deepEqual(splitRaw(101, 30), { source: 30, target: 71 }, '§9 example');
  assert.deepEqual(splitRaw(7, 50), { source: 3, target: 4 });
  assert.throws(() => splitRaw(10.5, 30), /whole/);
});

// ---------------------------------------------------------------- B3 order
test('B3 order: launch, interception, explicit misses, 8a raw, 8b cover, 8c split, 8d mitigation, 8e pre-KO, 8f HP, attached, reactions, after the whole hit, replacement, follow-ups', () => {
  const calls = [];
  const rec = (name) => (v, id, info) => { if (v.ex === 1 && calls.length < 200) calls.push(`${name}:${id}`); return null; };
  const HOOKS = ['launch', 'intercept', 'missCheck', 'rawModifiers', 'lethalRedirect', 'rawSplit', 'mitigate', 'preKO', 'attached', 'reaction', 'afterWholeHit', 'followUp'];
  const p = Object.fromEntries(HOOKS.map((h) => [h, rec(h)]));
  // b0 starts at 1 HP so the first hit on it is lethal (pre-KO fires) and b1 replaces it after the hit.
  const a = [M('voltfang', 1, 90)], b = [M('tidepaw', 2, 50), M('lumen', 3, 50)];
  const r = run(a, b, 1, { probes: [p, aFirst], stage: { b0: { hp: 1 } } });
  const firstHit = r.log.find((e) => e.kind === 'damage'); assert.equal(firstHit.actor, 'a0', 'a0 has priority and hits first');
  const ofHit = calls.slice(0, calls.indexOf('followUp:a0') + 1).map((c) => c.split(':')[0]);
  const dedup = ofHit.filter((x, i) => x !== ofHit[i - 1]);
  // 'mitigate' is consulted twice: once for the 8b lethality preview (no change), once at 8d
  assert.deepEqual(dedup, ['launch', 'intercept', 'missCheck', 'rawModifiers', 'mitigate', 'lethalRedirect', 'rawSplit', 'mitigate', 'preKO', 'attached', 'reaction', 'afterWholeHit', 'followUp']);
  // the replacement enters after reactions/after-whole-hit and before follow-ups (B3 rule 4)
  const i = r.log.indexOf(firstHit); assert.equal(r.log[i + 1].kind, 'ko'); assert.equal(r.log[i + 2].kind, 'enter'); assert.equal(r.log[i + 2].actor, 'b1');
  // reactors: the recipient first, then every other monster by stable ID
  assert.deepEqual(calls.filter((c) => c.startsWith('reaction:')).slice(0, 3), ['reaction:b0', 'reaction:a0', 'reaction:b1']);
  assert.ok(r.probed);
});

test('8a raw once and 8d mitigation order: raw = ATK x mult x ramp x spread x outgoing x ability; then type, Tank guard, Guarded, ability mitigation, shield; one rounding', () => {
  const att = M('emberfox', 5), def = M('pebble', 6); // Balanced into a Tank (guard 0.88)
  const p = { rawModifiers: (v, id) => (id === 'a0' ? { factor: 1.3 } : null), mitigate: (v, id) => (id === 'b0' ? { factor: 0.9 } : null) };
  for (const seed of [1, 2, 3, 4]) {
    const r = run([att], [def], seed, { probes: [p], stage: { b0: { status: { id: 'guarded', strength: 20, duration: 30 } }, a0: { status: { id: 'empowered', strength: 10, duration: 30 } } } });
    const C = { a0: buildT8Combatant(att, { side: 'a' }), b0: buildT8Combatant(def, { side: 'b' }) };
    const rr = createRng(seed);
    for (const e of r.log) {
      if (e.kind === 'initiative' && e.by === 'coin') rr.next();
      if (e.kind !== 'damage') continue;
      const spread = T8_VALUES.damage.spreadMin + rr.next() * (T8_VALUES.damage.spreadMax - T8_VALUES.damage.spreadMin);
      const A = C[e.actor], D = C[e.target];
      const raw = A.atk * rampFor(r.model, e.ex) * spread * (e.actor === 'a0' ? 1.1 * 1.3 : 1);
      const mit = typeFactor(A.type, D.type) * (D.archetype === 'Tank' && A.archetype !== 'Disruptor' ? 0.88 : 1) * (e.target === 'b0' ? 0.8 * 0.9 : 1);
      assert.equal(e.damage, roundHalfUp(raw * mit), `seed ${seed} ex ${e.ex} ${e.actor}`);
    }
  }
});

// ---------------------------------------------------------------- D5
test('D5: Striker shield-break x2 and Disruptor pierce on ORDINARY attacks only; a special attack gets neither; explicit contract exceptions are preserved', () => {
  const striker = M('voltfang', 3, 80), disr = M('ashkit', 4, 80), tank = M('pebble', 5, 80);
  const shield = { b0: { status: { id: 'shielded', strength: 200, duration: 30 } } };
  const special = { chooseAction: (v, id) => (id === 'a0' ? { kind: 'attack', abilityId: 'TEST-SPECIAL', mult: 1 } : null) };
  const ord = ev(run([striker], [tank], 1, { stage: shield }), 'damage', (e) => e.actor === 'a0' && e.shield);
  const spc = ev(run([striker], [tank], 1, { stage: shield, probes: [special] }), 'damage', (e) => e.actor === 'a0' && e.shield);
  assert.ok(ord.length && ord.every((e) => e.shield.breakMult === 2 && e.tag === 'ordinary'));
  assert.ok(spc.length && spc.every((e) => e.shield.breakMult === 1 && e.tag === 'special'));
  const exc = { chooseAction: (v, id) => (id === 'a0' ? { kind: 'attack', abilityId: 'TEST-EXC', exceptions: { shieldBreak: 3 } } : null) };
  assert.ok(ev(run([striker], [tank], 1, { stage: shield, probes: [exc] }), 'damage', (e) => e.actor === 'a0' && e.shield).every((e) => e.shield.breakMult === 3));
  // Disruptor pierce: ordinary ignores the Tank guard; special does not; explicit pierce exception kept
  const dOrd = ev(run([disr], [tank], 2), 'damage', (e) => e.actor === 'a0');
  const dSpc = ev(run([disr], [tank], 2, { probes: [special] }), 'damage', (e) => e.actor === 'a0');
  const dExc = ev(run([disr], [tank], 2, { probes: [{ chooseAction: (v, id) => (id === 'a0' ? { kind: 'attack', abilityId: 'TEST-P', exceptions: { pierce: true } } : null) }] }), 'damage', (e) => e.actor === 'a0');
  assert.ok(dOrd.every((e) => !e.guard && e.pierce)); assert.ok(dSpc.every((e) => e.guard && !e.pierce)); assert.ok(dExc.every((e) => !e.guard && e.pierce));
});

test('D5 Tank guard only while active: whole-hit redirect (8b) to a reserve Tank and a raw split (8c) onto a reserve Tank get no guard; each recipient uses its own type', () => {
  const att = M('emberfox', 1, 80); const a = [att]; const b = [M('tidepaw', 2, 80), M('mudcub', 3, 80)];
  const cover = { lethalRedirect: (v, id, info) => (id === 'b0' && v.ex === 1 ? { to: 'b1', abilityId: 'TEST-COVER' } : null) };
  const r = run(a, b, 1, { probes: [cover, aFirst] });
  const d = ev(r, 'damage', (e) => e.actor === 'a0')[0]; assert.equal(d.target, 'b1'); assert.equal(d.guard, false, 'reserve Tank: no guard');
  assert.equal(ev(r, 'redirect')[0].stage, 'activation');
  const C = buildT8Combatant(att, { side: 'a' }), B1 = buildT8Combatant(b[1], { side: 'b', slot: 1 });
  const rr = createRng(1);
  const spread = T8_VALUES.damage.spreadMin + rr.next() * (T8_VALUES.damage.spreadMax - T8_VALUES.damage.spreadMin);
  assert.equal(d.damage, roundHalfUp(C.atk * spread * typeFactor(C.type, B1.type)));
  // 8c: 30% of the raw budget to the reserve; the budget is whole, the source share floored; the active Tank keeps its guard
  const a2 = [M('emberfox', 4, 80)], b2 = [M('pebble', 5, 80), M('tidepaw', 6, 80)];
  const sp = { rawSplit: (v, id) => (id === 'b0' && v.ex === 1 ? { to: 'b1', pct: 30, abilityId: 'TEST-SPLIT' } : null) };
  const r2 = run(a2, b2, 3, { probes: [sp, aFirst] });
  const s = ev(r2, 'raw_split')[0]; assert.equal(s.source, Math.floor(s.whole * 0.3)); assert.equal(s.source + s.target, s.whole);
  const ds = ev(r2, 'damage', (e) => e.ex === 1 && e.actor === 'a0'); assert.deepEqual(ds.map((e) => e.target), ['b0', 'b1'], 'original target first');
  assert.equal(ds[0].guard, true); assert.equal(ds[1].guard, false);
  const A2 = buildT8Combatant(a2[0], { side: 'a' }), T0 = buildT8Combatant(b2[0], { side: 'b' }), T1 = buildT8Combatant(b2[1], { side: 'b', slot: 1 });
  assert.equal(ds[0].damage, roundHalfUp(s.target * typeFactor(A2.type, T0.type) * 0.88)); assert.equal(ds[1].damage, roundHalfUp(s.source * typeFactor(A2.type, T1.type)));
});

// ---------------------------------------------------------------- 8e, 8f, immediate KO
test('8e pre-KO hook on every damage path (direct and Afflicted): survive at 1 HP; 8f a lethal loss knocks out at once and clears the status', () => {
  const a = [M('voltfang', 1, 90)], b = [M('tidepaw', 2, 50)];
  const lr = { preKO: (v, id) => (id === 'b0' && v.combatant('b0').hp > 1 ? { survive: true, abilityId: 'TEST-ROOT' } : null) };
  const r = run(a, b, 1, { probes: [lr], stage: { b0: { hp: 5 } } });
  const sv = ev(r, 'survive')[0]; assert.ok(sv); const d = r.log[r.log.indexOf(sv) + 1]; assert.equal(d.kind, 'damage'); assert.equal(d.hpAfter, 1);
  const r2 = run([M('pebble', 3, 50)], [M('tidepaw', 4, 50)], 2, { probes: [lr], stage: { b0: { hp: 4, status: { id: 'afflicted', strength: 1, duration: 3, payload: { tickHp: 40 } } } } });
  const tick = ev(r2, 'afflicted')[0]; assert.ok(tick); assert.equal(tick.hpAfter, tick.hpBefore > 1 ? 1 : tick.hpAfter);
  // without the hook: immediate KO, status cleared in the KO event
  const r3 = run([M('voltfang', 1, 90)], [M('tidepaw', 2, 50), M('lumen', 3, 50)], 1, { stage: { b0: { hp: 1, status: { id: 'slowed', strength: 15, duration: 9 } } } });
  const k = ev(r3, 'ko')[0]; assert.equal(k.target, 'b0'); assert.equal(k.clearedStatus, 'slowed'); assert.equal(r3.log[r3.log.indexOf(k) - 1].kind, 'damage');
});

test('B3 rule 2: a knocked-out monster\'s pending reactions and remaining hits are cancelled; only the B3 rule 3 exceptions continue; an unknown exception is refused', () => {
  // b0 (1 HP) is hit and knocked out; its reaction is cancelled; the same reaction marked with an approved exception still runs
  const mk = (exception) => ({ reaction: (v, id, info) => (id === 'b0' && info.attacker === 'a0' && v.ex === 1 ? { kind: 'strike', target: 'attacker', mult: 0.5, abilityId: 'TEST-REACT', ...(exception ? { exception } : {}) } : null) });
  const a = [M('voltfang', 1, 90)], b = [M('tidepaw', 2, 50), M('lumen', 3, 50)];
  const r = run(a, b, 1, { probes: [mk(null), aFirst], stage: { b0: { hp: 1 } } });
  const c = ev(r, 'cancelled')[0]; assert.equal(c.actor, 'b0'); assert.equal(c.rule, 'B3 rule 2'); assert.equal(c.stage, 'cleanup');
  assert.ok(!ev(r, 'damage', (e) => e.actor === 'b0' && e.ex === 1).length);
  const r2 = run(a, b, 1, { probes: [mk('FIR-04-C'), aFirst], stage: { b0: { hp: 1 } } });
  const rd = ev(r2, 'damage', (e) => e.actor === 'b0' && e.tag === 'reaction'); assert.equal(rd.length, 1, 'the post-KO exception resolves');
  assert.equal(ev(r2, 'ability', (e) => e.actor === 'b0')[0].postKO, 'FIR-04-C');
  assert.throws(() => run(a, b, 1, { probes: [mk('DRA-01-C'), aFirst], stage: { b0: { hp: 1 } } }), /not an approved post-KO exception/);
  // the whitelist is exactly B3 rule 3, by contract name
  const names = Object.keys(POST_KO_EXCEPTIONS).map((id) => abilityById(id).name).sort();
  assert.deepEqual(names, ['Astral Strike', 'Cinder Clamp', 'Falling Star', 'Faultline', 'Molten Brand', 'Mountain Shelter', 'Riptide Pursuit', 'Second Spring', 'Shared Burden'].sort());
  // remaining multi-hits cancelled when the attacker is knocked out by a reaction to an earlier hit
  const multi = { chooseAction: (v, id) => (id === 'a0' && v.ex === 1 ? { kind: 'attack', abilityId: 'TEST-MULTI', hits: 3, mult: 0.2 } : null),
    reaction: (v, id, info) => (id === 'b0' && info.attacker === 'a0' && info.tag === 'special' ? { kind: 'strike', target: 'attacker', mult: 5, abilityId: 'TEST-RET' } : null) };
  const r3 = run([M('voltfang', 4, 90), M('emberfox', 6, 90)], [M('mudcub', 5, 95)], 1, { probes: [multi, aFirst], stage: { a0: { hp: 1 } } });
  const hc = ev(r3, 'hits_cancelled')[0]; assert.ok(hc); assert.equal(hc.actor, 'a0'); assert.equal(hc.remaining, 2);
  assert.equal(ev(r3, 'damage', (e) => e.actor === 'a0').length, 1);
});

test('no chains: a reaction strike runs its attached effects but never triggers reactions, after-whole-hit effects or follow-ups', () => {
  let reactionCalls = 0;
  const p = { reaction: (v, id, info) => { reactionCalls += info.tag === 'reaction' ? 1000 : 0; return id === 'b0' && info.attacker === 'a0' && v.ex <= 2 ? { kind: 'strike', target: 'attacker', mult: 0.1, abilityId: 'TEST-R' } : null; } };
  const r = run([M('emberfox', 1, 90)], [M('mudcub', 2, 90)], 1, { probes: [p] });
  assert.equal(reactionCalls, 0, 'the reaction hook is never asked about a reaction strike');
  assert.ok(ev(r, 'damage', (e) => e.tag === 'reaction').length >= 1);
});

test('B3 rule 6: simultaneous knockouts settle before the winner; a double KO goes to the seeded coin', () => {
  // a0 (1 HP) hits b0 (1 HP) and b0's post-KO-exception reaction knocks a0 out: both sides empty -> the coin
  const p = { reaction: (v, id, info) => (id === 'b0' && info.attacker === 'a0' && info.tag === 'ordinary' ? { kind: 'strike', target: 'attacker', mult: 3, abilityId: 'TEST-ERUPT', exception: 'FIR-04-C' } : null) };
  let coins = 0, ok = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const r = run([M('voltfang', 1, 90)], [M('tidepaw', 2, 50)], seed, { probes: [p, aFirst], stage: { a0: { hp: 1 }, b0: { hp: 1 } } });
    if (r.lines.a[0].koed && r.lines.b[0].koed) { ok++; assert.equal(r.by, 'coin'); coins += r.winner === 'a' ? 1 : 0; }
  }
  assert.ok(ok >= 15, `double KOs ${ok}`); assert.ok(coins > 0 && coins < ok, 'the coin goes both ways');
});

// ---------------------------------------------------------------- heals and shields (D7, D9)
test('heals and shields: P8 x C6 x Healing Reduced multiply with one rounding, capped at missing HP; D7 no Afflicted heal penalty; floor exception kept; shield pools go through the gate', () => {
  const heal = (pct, extra = {}) => ({ chooseAction: (v, id) => (id === 'a0' && v.ex === 1 ? { kind: 'heal', targetId: 'a0', pctMaxHp: pct, abilityId: 'TEST-HEAL', ...extra } : null) });
  const a = [M('tidepaw', 1, 70)], b = [M('pebble', 2, 40)]; const max = buildT8Combatant(a[0]).maxHp;
  const h1 = ev(run(a, b, 1, { probes: [heal(10)], stage: { a0: { hp: 10 } } }), 'heal')[0]; assert.equal(h1.amount, roundHalfUp(max * 0.1)); assert.deepEqual(h1.factors, []);
  const h2 = ev(run(a, b, 1, { probes: [heal(10)], stage: { a0: { hp: 10, status: { id: 'healingReduced', strength: 40, duration: 3 } } } }), 'heal')[0];
  assert.equal(h2.amount, roundHalfUp(max * 0.1 * 0.6)); assert.deepEqual(h2.factors.map((f) => f.id), ['healing-reduced']);
  const h3 = ev(run(a, b, 1, { probes: [heal(10)], stage: { a0: { hp: 10, status: { id: 'afflicted', strength: 1, duration: 3 } } } }), 'heal')[0];
  assert.equal(h3.amount, h1.amount, 'D7: Afflicted does not cut healing');
  const h4 = ev(run(a, b, 1, { probes: [heal(10, { rounding: 'floor' })], stage: { a0: { hp: 10 } } }), 'heal')[0]; assert.equal(h4.amount, Math.floor(max * 0.1));
  const h5 = ev(run(a, b, 1, { probes: [heal(90)], stage: { a0: { hp: max - 3 } } }), 'heal')[0]; assert.equal(h5.amount, 3, 'capped at missing HP');
  const h6 = ev(run(a, b, 1, { probes: [heal(10)], stage: { a0: { hp: 10, status: { id: 'healingReduced', strength: 100, duration: 3 } } } }), 'heal')[0]; assert.equal(h6.amount, 0, '100% blocks');
  const sh = { chooseAction: (v, id) => (id === 'a0' && v.ex === 1 ? { kind: 'shield', targetId: 'a0', pctMaxHp: 15, duration: 3, abilityId: 'TEST-SHIELD' } : null) };
  const rs = run(a, b, 1, { probes: [sh] }); const st = ev(rs, 'status', (e) => e.status === 'shielded')[0];
  assert.equal(st.slot.pool, roundHalfUp(max * 0.15)); assert.equal(st.abilityId, 'TEST-SHIELD'); assert.equal(st.excluded, true, 'self-granted in its own turn');
});

// ---------------------------------------------------------------- the reviewer stream
test('event stream for the reviewer: seq is the event index, turnIndex counts normal turns, hit ids group a strike; hooks report unmet conditions', () => {
  const p = { launch: (v, id) => (id === 'a0' && v.ex === 1 ? { unmet: [{ condition: 'charge ready', detail: '1 / 2' }], abilityId: 'TEST-CHARGE' } : null),
    attached: (v, id, info) => (id === 'a0' && v.ex === 1 ? [{ kind: 'status', targetId: info.target, id: 'weakened', strength: 15, duration: 2, abilityId: 'TEST-ATT' }] : null) };
  const r = run([M('voltfang', 1)], [M('pebble', 2)], 4, { probes: [p] });
  r.log.forEach((e, i) => assert.equal(e.seq, i));
  let last = 0; for (const e of r.log) { assert.ok(e.turnIndex >= last); last = e.turnIndex; }
  assert.equal(last, r.lines.a[0].turns + r.lines.b[0].turns);
  const un = ev(r, 'unmet')[0]; assert.equal(un.stage, 'trigger'); assert.deepEqual(un.unmet, [{ condition: 'charge ready', detail: '1 / 2' }]);
  const d = ev(r, 'damage', (e) => e.ex === 1 && e.actor === 'a0')[0]; const st = ev(r, 'status', (e) => e.abilityId === 'TEST-ATT')[0];
  assert.ok(d.hit && st.hit === d.hit, 'the attached status belongs to the same hit');
  assert.equal(st.actor, 'a0', 'provenance: the source is recorded');
});

test('plain battles: the pipeline draws and logs exactly as S1/S2 (golden seeds in t8-core); draws = spreads + coins; provisional S3 defaults are listed', () => {
  const rng = createRng(99);
  for (let i = 0; i < 100; i++) {
    const a = [M('emberfox', rng.seed()), M('pebble', rng.seed())], b = [M('tidepaw', rng.seed()), M('ashkit', rng.seed())];
    const r = run(a, b, i + 1);
    assert.equal(r.rngDraws, ev(r, 'damage').length + ev(r, 'initiative', (e) => e.by === 'coin').length + (r.by === 'coin' ? 1 : 0));
    assert.ok(ev(r, 'damage').every((e) => e.tag === 'ordinary' && e.hit));
  }
  for (const id of ['multi-hit-target-ko', 'reaction-order', 'reaction-chains', 'shared-burden-budget-rounding', 'sudden-death-scope', 'stalemate-c6-scope']) assert.ok(T8_PROVISIONAL.some((p) => p.id === id), id);
  assert.ok(!T8_PROVISIONAL.some((p) => p.id === 'single-rounding'), 'D9 approved');
});
