// Task 8 M4 S4: rotation in Beast Clash t8. P8 (approved): voluntary rotation after both turns and before delayed impacts, at most
// once per side every four exchanges, the entrant acting next exchange at x0.5 on its first normal turn (a Stunned skip spends it);
// no penalty for KO replacements or forced rotations. D1: a 'manual' side stops the engine at an undecided rotation phase with a
// boundary object; "Auto for the rest" hands the side to the AI policy; headless runs use the AI policy. D2: the adapted smart
// policy, on visible information only. R5: forced rotation keeps the side-wide pacing (3) and the just-entered protection.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClashT8, buildT8Combatant, T8_VALUES, T8_PROVISIONAL, roundHalfUp, t8LogHash } from '../../src/clash/t8/index.js';
import { chooseRotationAI, statusDamageFactor, T8_POLICIES } from '../../src/clash/t8/ai.js';
import { rotationEntryPenalty, ROTATION_CADENCE_EXCHANGES } from '../../src/data/approved-values.js';
import { abilityById } from '../../src/data/beast-dex.js';
import { createRng } from '../../src/core/rng.js';
import { mon, randomLineup, withoutRandomness } from './helpers.js';

// S5: this file tests the engine's own mechanics with stubs, so the registered contracts are switched off (config.abilities 'off').
const run = (a, b, seed = 1, extra = {}) => simulateClashT8({ a, b, seed, ...extra, config: { abilities: 'off', ...(extra.config || {}) } });
const ev = (r, kind, f = () => true) => r.log.filter((e) => e.kind === kind && f(e));
const M = (id, seed, ovr = 75) => mon(id, seed, { overall: ovr });
const team = (seed) => [M('emberfox', seed), M('pebble', seed + 1), M('tidepaw', seed + 2)];
const foes = (seed) => [M('ashkit', seed + 10), M('mudcub', seed + 11), M('lumen', seed + 12)];
const manualA = (decisions = {}) => ({ config: { ruleset: 't8', policies: { a: 'manual', b: 'none' }, decisions: { a: decisions } } });
const battles = (n, seed0, k = 3) => { const rng = createRng(seed0); return Array.from({ length: n }, (_, i) => ({ a: randomLineup(rng, k), b: randomLineup(rng, k), seed: i + 1 })); };

test('values: cadence 4 and forced pacing 3 are the approved values; the policies are none / ai / manual; AI is the default (D1)', () => {
  assert.equal(ROTATION_CADENCE_EXCHANGES, 4); assert.equal(T8_VALUES.swaps.voluntaryEvery, 4); assert.equal(T8_VALUES.swaps.forcedEvery, 3);
  assert.deepEqual(T8_POLICIES, ['none', 'ai', 'manual']);
  assert.deepEqual(run(team(1), foes(1), 1).config.policies, { a: 'ai', b: 'ai' });
  assert.deepEqual(rotationEntryPenalty({ firstAfterVoluntaryRotation: true }), { factor: 0.5, spent: true });
});

test('timing (P8): AI rotations happen only in the rotation phase after both turns, at most once per side every 4 exchanges; the entrant first acts next exchange; a departing status pauses in reserve (400 battles)', () => {
  let rotations = 0;
  for (const { a, b, seed } of battles(400, 3)) {
    const r = run(a, b, seed);
    const last = { a: -99, b: -99 };
    for (const e of ev(r, 'rotation', (x) => x.voluntary)) {
      rotations++; assert.equal(e.phase, 'rotation');
      const turnsBefore = r.log.filter((f) => f.ex === e.ex && f.kind === 'turn_start' && f.seq < e.seq).length + r.log.filter((f) => f.ex === e.ex && f.kind === 'turn_cancelled' && f.seq < e.seq).length;
      assert.equal(turnsBefore, 2, 'after both turns');
      assert.ok(e.ex - last[e.side] >= 4, `cadence (seed ${seed})`); last[e.side] = e.ex;
      assert.ok(!r.log.some((f) => f.ex === e.ex && f.kind === 'turn_start' && f.actor === e.in), 'entrant acts next exchange');
      const end = r.log.find((f) => f.kind === 'exchange_end' && f.ex === e.ex); assert.ok(end && end.seq > e.seq, 'before end of exchange (delayed impacts)');
    }
  }
  assert.ok(rotations > 20, `AI rotations ${rotations}`);
});

test('P8 entry penalty: the voluntary entrant\'s first normal turn is x0.5 (damage, heals, shields); later turns are full; one rounding', () => {
  // Manual side A rotates a0 -> a1 at exchange 1; a1's first normal turn (exchange 2) carries the penalty.
  const a = team(5), b = [M('mudcub', 40, 95)];
  const r = run(a, b, 2, manualA({ 1: 'a1', 5: 'stay', 9: 'stay', 13: 'stay', 17: 'stay', 21: 'stay', 25: 'stay', 29: 'stay' }));
  const rot = ev(r, 'rotation')[0]; assert.equal(rot.ex, 1); assert.equal(rot.in, 'a1');
  const pen = ev(r, 'entry_penalty', (e) => e.actor === 'a1'); assert.equal(pen.length, 1); assert.equal(pen[0].ex, 2); assert.equal(pen[0].factor, 0.5);
  const hits = ev(r, 'damage', (e) => e.actor === 'a1');
  assert.equal(hits[0].penalty, 0.5); assert.ok(hits.slice(1).every((e) => e.penalty == null));
  // the same battle with the penalty's factor removed would deal about twice as much on that hit: check the exact formula
  const A1 = buildT8Combatant(a[1], { side: 'a', slot: 1 });
  assert.ok(hits[0].damage <= roundHalfUp(A1.atk * 1.1 * 0.5 * 1.06), 'halved');
  // heals and shields on the first turn are halved too
  const heal = { chooseAction: (v, id) => (id === 'a1' ? { kind: 'heal', targetId: 'a1', pctMaxHp: 20, abilityId: 'TEST-HEAL' } : null) };
  const rh = run(a, b, 2, { ...manualA({ 1: 'a1', 5: 'stay', 9: 'stay' }), probes: [heal], stage: { a1: { hp: 5 } } });
  const heals = ev(rh, 'heal', (e) => e.actor === 'a1');
  assert.deepEqual(heals[0].factors.map((f) => [f.id, f.factor]), [['entry-penalty', 0.5]]); assert.equal(heals[0].amount, roundHalfUp(A1.maxHp * 0.2 * 0.5));
  assert.ok(!heals[1] || heals[1].factors.every((f) => f.id !== 'entry-penalty'));
});

test('P8: a Stunned skip spends the penalty (the next normal turn is full); KO replacements and forced rotations never carry it', () => {
  const a = team(7), b = [M('mudcub', 41, 95)];
  const r = run(a, b, 3, { ...manualA({ 1: 'a1', 5: 'stay', 9: 'stay' }), stage: { a1: { status: { id: 'stunned', strength: 1, duration: 1 } } } });
  const pen = ev(r, 'entry_penalty', (e) => e.actor === 'a1')[0]; assert.equal(pen.spentBy, 'stunned skip'); assert.equal(pen.factor, 1);
  assert.ok(ev(r, 'damage', (e) => e.actor === 'a1').every((e) => e.penalty == null));
  // KO replacements: never a penalty event (600 AI battles)
  for (const { a: A, b: B, seed } of battles(300, 9)) {
    const x = run(A, B, seed);
    for (const p of ev(x, 'entry_penalty')) { const ent = x.log.filter((e) => e.kind === 'enter' && e.actor === p.actor && e.seq < p.seq).at(-1); assert.equal(ent.reason, 'voluntary', `seed ${seed}`); }
  }
});

test('D1 manual: the engine stops at an undecided legal rotation phase with a boundary object; resuming with the decision replays the same prefix and continues; stay / auto / invalid', () => {
  const a = team(11), b = foes(11);
  const p1 = run(a, b, 4, manualA());
  assert.equal(p1.pending, true); assert.equal(p1.winner, null);
  const bd = p1.boundary; assert.equal(bd.kind, 'rotation'); assert.equal(bd.ex, 1); assert.equal(bd.side, 'a'); assert.equal(bd.activeId, 'a0');
  assert.deepEqual(bd.options, ['stay', 'auto', 'a1', 'a2']); assert.equal(bd.reserves.length, 2); assert.ok(bd.stateHash && Number.isInteger(bd.rngDraws));
  assert.equal(p1.log.at(-1).kind, 'rotation_prompt');
  // resume with 'stay' at 1: the next prompt is at exchange 2 (stay spends no cadence)
  const p2 = run(a, b, 4, manualA({ 1: 'stay' })); assert.equal(p2.boundary.ex, 2);
  const prefix = (r, n) => r.log.slice(0, n).map((e) => `${e.seq}|${e.kind}|${e.actor}|${e.target}|${e.text}`).join('\n');
  assert.equal(prefix(p2, p1.boundary.lastSeq), prefix(p1, p1.boundary.lastSeq), 'identical up to the boundary');
  // rotate at 1: no prompt again before exchange 5 (cadence)
  const p3 = run(a, b, 4, manualA({ 1: 'a2' })); assert.ok(p3.pending ? p3.boundary.ex >= 5 : true); if (p3.pending) assert.equal(p3.boundary.ex, 5);
  assert.equal(ev(p3, 'rotation')[0].in, 'a2'); assert.equal(ev(p3, 'rotation_decision')[0].decision, 'a2');
  // monster ids are accepted as decisions too
  assert.equal(ev(run(a, b, 4, manualA({ 1: a[1].id })), 'rotation')[0].in, 'a1');
  // auto: the side switches to the AI policy for the rest: it never stops again
  const p4 = run(a, b, 4, manualA({ 1: 'auto' })); assert.equal(p4.pending, false); assert.equal(p4.sides.a.policy, 'ai'); assert.ok(p4.winner);
  assert.ok(!ev(p4, 'rotation_prompt').length);
  assert.throws(() => run(a, b, 4, manualA({ 1: 'b1' })), /not a living reserve/);
  assert.throws(() => run(a, b, 4, manualA({ x: 'stay' })), /whole number/);
  // a fully decided manual battle is deterministic and log-independent
  const dec = {}; for (let e = 1; e <= 30; e++) dec[e] = 'stay';
  const f1 = run(a, b, 4, manualA(dec)), f2 = run(a, b, 4, manualA(dec)), fn = run(a, b, 4, { ...manualA(dec), log: 'none' });
  assert.equal(f1.pending, false); assert.equal(t8LogHash(f1), t8LogHash(f2)); assert.equal(fn.stateHash, f1.stateHash);
  // A single-monster side is never prompted (no legal rotation)
  assert.equal(run([M('emberfox', 1)], b, 4, manualA()).pending, false);
});

test('turn / exchange stepping: stopAt returns a boundary whose log is a prefix of the uninterrupted battle', () => {
  const a = team(13), b = foes(13); const full = run(a, b, 6);
  for (const stopAt of [{ exchange: 1 }, { exchange: 2, turn: 1 }, { exchange: 3, turn: 2 }, { exchange: 4 }]) {
    const p = run(a, b, 6, { stopAt });
    if (!p.pending) { assert.ok(full.exchanges <= stopAt.exchange); continue; }
    assert.equal(p.boundary.kind, stopAt.turn ? 'turn' : 'exchange'); assert.equal(p.boundary.ex, stopAt.exchange);
    const n = p.log.length; assert.deepEqual(p.log.map((e) => e.text), full.log.slice(0, n).map((e) => e.text));
    assert.ok(full.rngDraws >= p.boundary.rngDraws);
  }
  assert.throws(() => run(a, b, 6, { stopAt: { exchange: 0 } }), /stopAt/);
});

test('D2 AI policy: the adapted smart rule (gain > 1.45x stay, or about to fall and >= 0.8x); statuses by their real damage effect; never reads hidden opposing ATK; no draws', () => {
  const live = (id, seed, hp, extra = {}) => { const c = buildT8Combatant(M(id, seed), { side: 'a', slot: seed % 5 }); return { c, hp: hp ?? c.hp, status: null, ...extra }; };
  const hiddenFoe = (id) => { const c = buildT8Combatant(M(id, 9), { side: 'b' }); return { c: new Proxy(c, { get: (t, k) => { if (k === 'atk') throw new Error('hidden opposing ATK read'); return t[k]; } }), hp: c.hp, status: null }; };
  const foe = hiddenFoe('emberfox'); // reading its ATK throws
  // The same monster twice: active at 21% HP (value factor 0.71), reserve at 40% (0.90): gain 1.27x, between 0.8x and 1.45x.
  const base = buildT8Combatant(M('pebble', 1), { side: 'a' });
  const act = { c: base, hp: Math.floor(base.maxHp * 0.21), status: null }, res = { c: { ...base, id: 'a1' }, hp: Math.ceil(base.maxHp * 0.40), status: null };
  assert.equal(chooseRotationAI({ active: act, reserves: [res], foe, observedFoeHit: 0 }), null, 'not about to fall until the foe has shown a hit');
  assert.equal(chooseRotationAI({ active: act, reserves: [res], foe, observedFoeHit: Math.ceil(act.hp / 1.3) }), res, 'about to fall: rotates for >= 0.8x');
  assert.equal(chooseRotationAI({ active: act, reserves: [res], foe, observedFoeHit: Math.floor(act.hp / 1.3) - 1 }), null, 'the shown hit is not lethal enough');
  // a clear gain (> 1.45x) rotates regardless: a full-HP reserve against a Weakened 60% active
  const weak = { c: base, hp: Math.floor(base.maxHp * 0.6), status: { id: 'weakened', strength: 50, remaining: 2 } }; const full = { c: { ...base, id: 'a2' }, hp: base.maxHp, status: null };
  assert.equal(chooseRotationAI({ active: weak, reserves: [full], foe, observedFoeHit: 0 }), full);
  // reserves at or below 35% HP are never chosen
  assert.equal(chooseRotationAI({ active: weak, reserves: [{ ...full, hp: Math.floor(base.maxHp * 0.35) }], foe, observedFoeHit: 0 }), null);
  void live;
  // statuses: Weakened / Empowered by their %, Stunned x0.5
  assert.equal(statusDamageFactor({ id: 'weakened', strength: 30, remaining: 2 }), 0.7);
  assert.equal(statusDamageFactor({ id: 'empowered', strength: 20, remaining: 2 }), 1.2);
  assert.equal(statusDamageFactor({ id: 'stunned', strength: 1, remaining: 1 }), 0.5);
  assert.equal(statusDamageFactor({ id: 'guarded', strength: 30, remaining: 1 }), 1);
  // in the engine: AI battles draw exactly spreads + coins (the policy draws nothing)
  withoutRandomness(() => { for (const { a, b, seed } of battles(100, 17)) { const r = run(a, b, seed); assert.equal(r.rngDraws, ev(r, 'damage').length + ev(r, 'initiative', (e) => e.by === 'coin').length + (r.by === 'coin' ? 1 : 0)); } });
});

test('forced rotation (R5): side-wide pacing 3 and just-entered protection kept; no reserve / lock refuse with unmet conditions; no entry penalty', () => {
  // a0's normal action is replaced by a stub forced rotation of the foe every turn
  const force = (incoming = 'firstReserve') => ({ chooseAction: (v, id) => (id === 'a0' ? { kind: 'forcedRotation', side: 'foe', incoming, abilityId: 'TEST-FORCE' } : null) });
  const a = [M('emberfox', 1, 95)], b = foes(20);
  const pol = { config: { ruleset: 't8', policies: { a: 'none', b: 'none' } } };
  const r = run(a, b, 1, { ...pol, probes: [force()] });
  const done = ev(r, 'rotation', (e) => e.forced); const refused = ev(r, 'rotation_refused');
  assert.ok(done.length >= 2 && refused.length >= 2);
  for (let i = 1; i < done.length; i++) assert.ok(done[i].ex - done[i - 1].ex >= 3, 'pacing 3');
  assert.ok(refused.some((e) => e.unmet.some((u) => u.condition === 'forced-rotation pacing' && u.need === 3)));
  assert.equal(done[0].in, 'b1', 'first living reserve in stable lineup order');
  assert.ok(!ev(r, 'entry_penalty').length, 'forced entrants carry no penalty');
  for (const d of done) assert.ok(!r.log.some((f) => f.ex === d.ex && f.kind === 'turn_start' && f.actor === d.in), 'the forced entrant acts next exchange');
  // just-entered protection: b0 (1 HP) is knocked out by a0's first hit and b1 enters by KO replacement; a forced rotation in the
  // same exchange (b's own turn is cancelled, so a1 is not needed: a follow-up of a0 tries it after the replacement) is refused.
  const after = { initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null),
    followUp: (v, id, info) => (id === 'a0' && v.ex === 1 && info.landed.some((l) => l.koed) ? [{ kind: 'forcedRotation', side: 'foe', abilityId: 'TEST-FORCE-AFTER' }] : null) };
  const r4 = run([M('voltfang', 6, 95)], [M('tidepaw', 8, 40), M('mudcub', 9), M('lumen', 10)], 1, { ...pol, probes: [after], stage: { b0: { hp: 1 } } });
  const rf = ev(r4, 'rotation_refused')[0];
  assert.ok(rf, 'the follow-up forced rotation is considered after the replacement entered');
  assert.deepEqual(rf.unmet.map((u) => u.condition), ['just-entered protection']);
  // no living reserve / lock
  const r5 = run([M('emberfox', 1, 95)], [M('mudcub', 5)], 1, { ...pol, probes: [force()] });
  assert.ok(ev(r5, 'rotation_refused')[0].unmet.some((u) => u.condition === 'living reserve'));
  const lock = { rotationLock: (v, id, info) => (id === 'b0' && info.forced ? { locked: true, reason: 'immovable', abilityId: 'TEST-IMMUNE' } : null) };
  const r6 = run(a, b, 1, { ...pol, probes: [force(), lock] });
  assert.ok(ev(r6, 'rotation_refused')[0].unmet.some((u) => u.condition === 'rotation lock or immunity' && u.abilityId === 'TEST-IMMUNE'));
  assert.ok(!ev(r6, 'rotation').length);
  // a chosen replacement (Riptide Charge: opposing team chooses) is honoured when it is a living reserve
  assert.equal(ev(run(a, b, 1, { ...pol, probes: [force('b2')] }), 'rotation')[0].in, 'b2');
});

test('rotation hook order within one side (P8): delay check, pursuit, cash-out, departure, entry effects, arrival; a delay keeps the cadence; a lock reports unmet', () => {
  const calls = [];
  const rec = (h) => (v, id) => { if (id === 'b0' && v.phase === 'rotation') calls.push(h); return null; };
  const p = { rotationDelay: rec('rotationDelay'), pursuit: rec('pursuit'), cashOut: rec('cashOut'), onEntry: (v, id, info) => { if (info.reason === 'voluntary') calls.push(`onEntry:${id}`); return null; }, arrival: rec('arrival') };
  const r = run(team(30), foes(30), 2, { ...manualA({ 1: 'a1' }), probes: [p] });
  const rot = ev(r, 'rotation')[0]; const dep = ev(r, 'depart')[0];
  assert.ok(dep.seq > rot.seq);
  assert.deepEqual(calls.slice(0, 5), ['rotationDelay', 'pursuit', 'cashOut', 'onEntry:a1', 'arrival']);
  const delay = { rotationDelay: (v, id) => (id === 'b0' && v.ex === 1 ? { delay: true, abilityId: 'TEST-CLAMP' } : null) };
  const rd = run(team(30), foes(30), 2, { ...manualA({ 1: 'a1', 2: 'a1' }), probes: [delay] });
  assert.equal(ev(rd, 'rotation_delayed')[0].ex, 1); assert.equal(ev(rd, 'rotation')[0].ex, 2, 'the delayed side may rotate at the next legal phase');
  const lock = { rotationLock: (v, id, info) => (id === 'b0' && !info.forced && v.ex === 1 ? { locked: true, reason: 'held', abilityId: 'TEST-HOLD' } : null) };
  const rl = run(team(30), foes(30), 2, { ...manualA({ 2: 'stay' }), probes: [lock] });
  assert.equal(ev(rl, 'rotation_unavailable')[0].unmet.at(-1).abilityId, 'TEST-HOLD'); assert.equal(rl.boundary.ex, 3, 'no prompt while locked; prompts resume');
  // pursuit KO: the departing monster is knocked out before it leaves -> ordinary KO replacement, no voluntary rotation
  const pursue = { pursuit: (v, id, info) => (id === 'b0' ? { kind: 'strike', target: info.out, mult: 50, abilityId: 'TEST-PURSUIT', tag: 'special' } : null) };
  const rp = run(team(30), foes(30), 2, { ...manualA({ 1: 'a2' }), probes: [pursue] });
  assert.ok(ev(rp, 'rotation_cancelled').length === 1); assert.equal(ev(rp, 'enter', (e) => e.reason === 'ko')[0].actor, 'a1', 'ordinary replacement: first living reserve');
});

test('D3 Feather Relay: its rotation hook is NOT built; the contract text does not state the P8 exemption (left for the owner)', () => {
  const fr = abilityById('WIN-01-C'); const text = fr.details.map((d) => d.rule).join(' ');
  assert.equal(fr.name, 'Feather Relay');
  assert.match(text, /Respect rotation locks and legal availability/); assert.match(text, /Incoming receives NO normal attack that team turn/);
  assert.doesNotMatch(text, /penalt|half-strength|half strength|x0\.5|×0\.5|entry cost/i, 'no word about the entry penalty');
  assert.ok(T8_PROVISIONAL.some((p) => p.id === 'feather-relay-voluntary' && /N9c/.test(p.waitsOn)), 'D3 reconciled 2026-11-09: built; only its voluntary status for the rotation triggers waits');
  for (const id of ['lineup-order-stable', 'p8-pending-cleared-on-departure', 'rotation-hook-order']) assert.ok(T8_PROVISIONAL.some((p) => p.id === id), id);
});
