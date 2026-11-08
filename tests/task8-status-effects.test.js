// Task 8 M3: football effects of the shared statuses (spec §10, §11; Appendix B STA-01..STA-11). A test-only contract stands in for
// the producing abilities: it reads the actors at the snap (after the engine has applied pre-play statuses) and applies statuses
// mid-play through ctx.applyStatus. The family is synthetic and registered only in this test process.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS } from '../src/data/playbook.js';
import { lineup } from './tools/lineup.js';
import { registerAbility } from '../src/sim/abilities/registry.js';
import * as S from '../src/sim/t8/status-runtime.js';
import * as K from '../src/sim/t8/stamina-runtime.js';
import { effectiveMaxSpeed, effectiveAttr, footballApplyRefusal } from '../src/sim/t8/status-effects.js';
import * as F from '../src/core/fraction.js';

const PROBE = { start: null };
registerAbility({ family: 'statusprobe', abilityId: 'TEST-PROBE', hooks: { playStart: (ctx, self) => PROBE.start?.(ctx, self) } });

const RUN = Object.values(PLAYS).find((p) => p.side === 'offense' && p.type === 'run' && !p.legendary && !p.reserve);
const DEF = PLAYS.cover_2 || Object.values(PLAYS).find((p) => p.side === 'defense');
/** One play; the offense QB carries the probe contract. `onStart(ctx, self, find)` runs at the snap; find(slot, team) gives an actor. */
function play(t8, onStart, seed = 3, { mismatch = false } = {}) {
  const L = lineup(11, 60), D = lineup(12, 64);
  if (mismatch) { for (const x of Object.values(L.offense)) Object.assign(x.attrs, { blocking: 99, strength: 99, awareness: 99 }); for (const x of Object.values(D.defense)) Object.assign(x.attrs, { strength: 20, agility: 20, tackling: 20, awareness: 20 }); }
  for (const [s, x] of Object.entries(L.offense)) x.id = `o_${s}`; for (const [s, x] of Object.entries(D.defense)) x.id = `d_${s}`;
  L.offense.QB = { ...L.offense.QB, species: 'statusprobe', form: 'statusprobe:0' };
  const seen = {};
  PROBE.start = (ctx, self) => {
    const all = [...ctx.opponents('def'), ...ctx.opponents('off')];
    const find = (slot, team = 'off') => all.find((a) => a.slot === slot && a.team === team);
    onStart?.(ctx, self, find, seen);
  };
  const r = simulatePlay({ offensePlay: RUN, defensePlay: DEF, offense: L.offense, defense: D.defense, ballOn: 30, seed, options: { t8 } });
  PROBE.start = null; return { r, seen };
}
const snap = (a) => ({ maxSpeed: a.maxSpeed, accel: a.accel, strength: a.attrs.strength, awareness: a.attrs.awareness, durability: a.attrs.durability, stun: a.stun });
const base = play({ status: {} }, (ctx, self, find, seen) => { seen.RB = snap(find('RB')); seen.QB = snap(self); }).seen;
const slot = (id, strength, duration = 1, extra = {}) => ({ id, strength, originalStrength: strength, remaining: duration, applications: 1, appliedThisUnit: false, restOfPlay: false, sourceId: null, abilityId: null, ...extra });
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('the shared maximum-speed aggregation (§11): same-property modifiers add, bounded at -75% / +50%', () => {
  near(effectiveMaxSpeed(8, { status: -15, field: -10 }), 6, 'status -15% + field -10% = -25%');
  near(effectiveMaxSpeed(8, { status: -15 }), 6.8, 'leaving the field restores -15%');
  near(effectiveMaxSpeed(8, { status: 20, field: -10 }), 8.8, 'opposite changes cancel arithmetically');
  near(effectiveMaxSpeed(8, { status: -60, field: -30 }), 2, 'reduction bounded at 75%');
  near(effectiveMaxSpeed(8, { status: 40, field: 30 }), 12, 'boost bounded at 50%');
  near(effectiveMaxSpeed(8, {}), 8, 'no modifiers');
});

test('Slowed (STA-02) before the play: maximum speed down by its percentage, acceleration and attributes unchanged', () => {
  const { seen } = play({ status: { o_RB: slot('slowed', 15) } }, (ctx, self, find, seen) => { seen.RB = snap(find('RB')); });
  near(seen.RB.maxSpeed, base.RB.maxSpeed * 0.85, 'max speed -15%'); near(seen.RB.accel, base.RB.accel, 'acceleration');
  assert.equal(seen.RB.strength, base.RB.strength); assert.equal(seen.RB.stun, 0, 'movement remains possible');
  const pct = play({ status: { o_RB: slot('slowed', 1, 1, { payload: { pct: 20 } }) } }, (ctx, self, find, seen) => { seen.RB = snap(find('RB')); }).seen;
  near(pct.RB.maxSpeed, base.RB.maxSpeed * 0.8, 'payload.pct is the magnitude when given');
});

test('Quickened (STA-11): maximum speed (shared aggregation, +50% bound) and acceleration up', () => {
  const { seen } = play({ status: { o_RB: slot('quickened', 20) } }, (ctx, self, find, seen) => { seen.RB = snap(find('RB')); });
  near(seen.RB.maxSpeed, base.RB.maxSpeed * 1.2, 'max speed +20%'); near(seen.RB.accel, base.RB.accel * 1.2, 'acceleration +20%');
  const big = play({ status: { o_RB: slot('quickened', 90) } }, (ctx, self, find, seen) => { seen.RB = snap(find('RB')); }).seen;
  near(big.RB.maxSpeed, base.RB.maxSpeed * 1.5, 'bounded at +50%');
});

test('Weakened / Empowered (Strength), Confused (Awareness), Afflicted (Durability): effective values only', () => {
  const cases = [['weakened', 20, 'strength', 0.8], ['empowered', 15, 'strength', 1.15], ['confused', 20, 'awareness', 0.8], ['afflicted', 25, 'durability', 0.75]];
  for (const [id, pct, attr, k] of cases) {
    const { seen } = play({ status: { o_RB: slot(id, pct) } }, (ctx, self, find, seen) => { seen.RB = snap(find('RB')); });
    near(seen.RB[attr], base.RB[attr] * k, `${id} ${attr}`);
    near(seen.RB.maxSpeed, base.RB.maxSpeed, `${id}: no movement slowdown`); assert.equal(seen.RB.stun, 0, `${id}: no skipped action`);
    for (const other of ['strength', 'awareness', 'durability'].filter((x) => x !== attr)) assert.equal(seen.RB[other], base.RB[other], `${id} leaves ${other}`);
  }
});

test('Afflicted (B10): the stamina drain uses the effective Durability under its payload', () => {
  const st = { t8: { status: { m1: slot('afflicted', 25) } } }; const x = { id: 'm1', attrs: { durability: 60 } };
  K.afterPlay(st, [x]); assert.deepEqual(K.staminaOf(st, x).stamina, F.sub(F.frac(60), F.frac(60, 45)), '60 - 60/45');
  const plain = { t8: { status: {} } }; K.afterPlay(plain, [x]); assert.deepEqual(K.staminaOf(plain, x).stamina, F.frac(59));
  assert.equal(effectiveAttr(slot('afflicted', 100), 'durability', 60), 0, 'floored at 0; drainPlay keeps the denominator at 1');
});

test('Shielded (STA-09) and Empowered/Quickened are beneficial: Shielded changes nothing else in football', () => {
  const { seen } = play({ status: { o_RB: slot('shielded', 1) } }, (ctx, self, find, seen) => { seen.RB = snap(find('RB')); });
  assert.deepEqual(seen.RB, base.RB, 'no protection from tackles or stuns, no attribute change');
});

test('Stunned (STA-01): a counted carryover disables the whole play; a play-applied Stunned is rest-of-play only (N7a, B18)', () => {
  const t8 = { status: { o_RB: slot('stunned', 1, 1) } };
  const { seen } = play(t8, (ctx, self, find, seen) => { const rb = find('RB'); seen.RB = snap(rb); seen.out = rb.sitsOut; });
  assert.ok(seen.RB.stun > 1e5 && seen.out, 'disabled from the snap even without options.sitsOut');
  S.afterPlay({ t8 }, ['o_RB']); assert.equal(t8.status.o_RB, undefined, 'the counted play consumed it');
  assert.ok(footballApplyRefusal({ id: 'stunned', duration: 2 })); assert.ok(footballApplyRefusal({ id: 'stunned', duration: 0 }));
  assert.equal(footballApplyRefusal({ id: 'stunned', duration: 0, restOfPlay: true }), null);
  const t8b = { status: {} };
  const m = play(t8b, (ctx, self, find, seen) => {
    const lb = find('LB1', 'def') || ctx.opponents('off')[0]; lb.vx = 3;
    seen.bad = ctx.applyStatus(lb, { id: 'stunned', strength: 1, duration: 2, source: self });
    seen.ok = ctx.applyStatus(lb, { id: 'stunned', strength: 1, duration: 0, restOfPlay: true, source: self });
    seen.lb = { stun: lb.stun, vx: lb.vx, noEngage: lb.noEngage, slot: lb.slot }; seen.st = ctx.statusOf(lb)?.id;
  });
  assert.equal(m.seen.bad.accepted, false); assert.match(m.seen.bad.reason, /rest-of-play/);
  assert.equal(m.seen.ok.accepted, true); assert.equal(m.seen.st, 'stunned');
  assert.ok(m.seen.lb.stun > 1e5 && m.seen.lb.noEngage > 1e5 && m.seen.lb.vx === 0, 'movement stops; cannot block or tackle');
  const ev = m.r.events.filter((e) => e.kind === 'status');
  assert.deepEqual(ev.map((e) => [e.status, e.by, e.victim, e.accepted]), [['stunned', 'QB', m.seen.lb.slot, false], ['stunned', 'QB', m.seen.lb.slot, true]]);
  const lbId = Object.keys(t8b.status)[0]; S.afterPlay({ t8: t8b }, [lbId]); assert.equal(t8b.status[lbId], undefined, 'rest-of-play Stunned clears at the whistle');
});

test('Knocked Down (STA-04) and Stumbled (STA-03) mid-play: on the ground / 40% of current speed and the engagement lost; both clear at the whistle', () => {
  const t8 = { status: {} };
  const { seen } = play(t8, (ctx, self, find, seen) => {
    const de = ctx.opponents('off')[0], lt = find('LT') || ctx.opponents('def').find((a) => a !== self);
    seen.kd = ctx.applyStatus(de, { id: 'knockedDown', strength: 1, duration: 0, restOfPlay: true, source: self });
    seen.de = { kd: de.knockedDown, stun: de.stun, vx: de.vx, maxSpeed: de.maxSpeed, base: de.baseMaxSpeed };
    lt.vx = 4; lt.vy = 2; lt.engaged = de; de.engaged = lt; const max0 = lt.maxSpeed, acc0 = lt.accel;
    seen.sb = ctx.applyStatus(lt, { id: 'stumbled', strength: 1, duration: 0, restOfPlay: true, source: de });
    seen.lt = { vx: lt.vx, vy: lt.vy, engaged: lt.engaged, deEngaged: de.engaged, maxSame: lt.maxSpeed === max0, accSame: lt.accel === acc0, stun: lt.stun };
    seen.ids = [de.mid, lt.mid];
  });
  assert.equal(seen.kd.accepted, true); assert.ok(seen.de.kd && seen.de.stun > 1e5 && seen.de.vx === 0);
  assert.equal(seen.sb.accepted, true); near(seen.lt.vx, 2.4, 'current speed -40%'); near(seen.lt.vy, 1.2, 'current speed -40%');
  assert.equal(seen.lt.engaged, null); assert.equal(seen.lt.deEngaged, null); assert.ok(seen.lt.maxSame && seen.lt.accSame, 'max speed and acceleration kept');
  assert.equal(seen.lt.stun, 0, 'not immobilised');
  S.afterPlay({ t8 }, seen.ids); assert.deepEqual(t8.status, {}, 'both clear at the whistle');
});

test('mid-play application takes effect immediately; the gate holds (one status per monster, three applications, weaker ignored)', () => {
  const t8 = { status: {} };
  const { seen } = play(t8, (ctx, self, find, seen) => {
    const rb = find('RB'); const m0 = rb.maxSpeed, s0 = rb.attrs.strength;
    seen.a1 = ctx.applyStatus(rb, { id: 'slowed', strength: 10, duration: 1, source: self }); seen.m1 = rb.maxSpeed / m0;
    seen.other = ctx.applyStatus(rb, { id: 'weakened', strength: 30, duration: 1, source: self }); seen.s1 = rb.attrs.strength === s0;
    seen.weak = ctx.applyStatus(rb, { id: 'slowed', strength: 5, duration: 1, source: self });
    seen.a2 = ctx.applyStatus(rb, { id: 'slowed', strength: 20, duration: 1, source: self }); seen.m2 = rb.maxSpeed / m0;
    seen.a3 = ctx.applyStatus(rb, { id: 'slowed', strength: 20, duration: 1, source: self });
    seen.a4 = ctx.applyStatus(rb, { id: 'slowed', strength: 30, duration: 1, source: self }); seen.m4 = rb.maxSpeed / m0;
    seen.hr = ctx.applyStatus(find('WR1') || find('TE'), { id: 'healingReduced', strength: 1, duration: 1, source: self });
  });
  assert.equal(seen.a1.accepted, true); near(seen.m1, 0.9, 'Slowed 10% at once');
  assert.equal(seen.other.accepted, false); assert.match(seen.other.reason, /occupied/); assert.ok(seen.s1, 'blocked status has no effect');
  assert.equal(seen.weak.accepted, false); assert.equal(seen.a2.accepted, true); near(seen.m2, 0.8, 'stronger replaces strength');
  assert.equal(seen.a3.accepted, true, 'equal adds duration (third application)');
  assert.equal(seen.a4.accepted, false); assert.match(seen.a4.reason, /three/); near(seen.m4, 0.8, 'blocked at three applications');
  assert.equal(seen.hr.accepted, false, 'Clash-only status unsupported in football');
  assert.equal(t8.status.o_RB.remaining, 2, 'equal application added duration');
  // Clocks: the application play does not count; plays he does not take part in do not count; participated plays count.
  S.afterPlay({ t8 }, ['o_RB']); assert.equal(t8.status.o_RB.remaining, 2, 'application play not counted');
  S.afterPlay({ t8 }, ['o_QB']); assert.equal(t8.status.o_RB.remaining, 2, 'non-participation pauses');
  S.afterPlay({ t8 }, ['o_RB']); assert.equal(t8.status.o_RB.remaining, 1);
  const next = play(t8, (ctx, self, find, s) => { s.RB = snap(find('RB')); }).seen;
  near(next.RB.maxSpeed, base.RB.maxSpeed * 0.8, 'read again at the next snap'); S.afterPlay({ t8 }, ['o_RB']); assert.equal(t8.status.o_RB, undefined, 'expired after its last counted play');
});

test('pancakes go through the shared gate: Knocked Down lands in the slot and clears at the whistle; another status blocks it', () => {
  let pancakes = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const t8 = { status: {} }; const { r } = play(t8, () => {}, seed, { mismatch: true });
    const pc = r.events.filter((x) => x.kind === 'pancake'); pancakes += pc.length;
    for (const e of pc) { assert.equal(t8.status[`d_${e.victim}`]?.id, 'knockedDown'); }
    S.afterPlay({ t8 }, Object.keys(t8.status)); assert.ok(!Object.values(t8.status).some((x) => x.id === 'knockedDown' || x.id === 'stumbled'), 'cleared at the whistle');
  }
  assert.ok(pancakes > 0, 'the mismatch batch produces pancakes');
  const L = lineup(12, 64); let blockedSeen = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const blocked = { status: {} }; for (const s of Object.keys(L.defense)) blocked.status[`d_${s}`] = slot('slowed', 1);
    const { r } = play(blocked, () => {}, seed, { mismatch: true });
    for (const e of r.events.filter((x) => x.kind === 'pancake')) { blockedSeen++; assert.equal(blocked.status[`d_${e.victim}`]?.id, 'slowed', 'Knocked Down blocked by the occupied slot'); }
  }
  assert.ok(blockedSeen > 0, 'pancakes still happen as a blocking outcome');
});

test('one maximum-speed aggregation for statuses and fields (§11): −15% status and −10% field give −25%, not 0.85 × 0.90', async () => {
  const { effectiveMaxSpeed } = await import('../src/sim/t8/status-effects.js');
  assert.equal(+effectiveMaxSpeed(8, { status: -15, field: -10 }).toFixed(6), 6);
  assert.equal(+effectiveMaxSpeed(8, { status: -60, field: -30 }).toFixed(6), 2, 'bounded at −75%');
});
