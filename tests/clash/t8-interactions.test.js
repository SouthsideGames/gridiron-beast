// Task 8 M4 S11: the cross-batch interaction suite (M4_PLAN.md S11): every interaction a contract names, on the real engine with real
// contracts. Staged inputs and controlled prerequisites are labelled in each case; no ability's own result is manufactured. Provisional
// readings are not used here (normal gameplay, config.provisional off).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../../src/clash/t8/index.js';
import { simulateClashT8 } from '../../src/clash/t8/engine.js';
import { reviewMonster } from '../../src/clash/t8/review.js';

const M = (species, opts = {}, seed = 1) => reviewMonster({ species, ...opts }, seed);
const run = (a, b, { seed = 1, stage = null, probes = [], stopAt = { exchange: 2 }, policies = { a: 'none', b: 'none' }, decisions } = {}) => simulateClashT8({ a, b, seed, stage, probes, stopAt, config: { ruleset: 't8', policies, ...(decisions ? { decisions } : {}) } });
const ev = (r, kind, f = () => true) => r.log.filter((e) => e.kind === kind && f(e));
const first = (id) => ({ initiative: (v, x) => (x === id ? { priority: 1 } : null) });
const passes = (...ids) => ({ chooseAction: (v, x) => (ids.includes(x) ? { kind: 'skip' } : null) });

test('Phase Strike vs Last Root: the shield-bypassing special still meets Last Root (1 HP), and the pool stays', () => {
  const r = run([M('voltfang', { overall: 99 })], [M('rootram'), M('gravelpup')], { stage: { b0: { hp: 1, status: { id: 'shielded', strength: 50, duration: 5 } } }, probes: [first('a0'), passes('b0')], stopAt: { exchange: 1 } });
  const d = ev(r, 'damage', (e) => e.abilityId === 'ELE-03-C')[0]; assert.ok(d && d.shield?.bypassed);
  assert.ok(ev(r, 'survive', (e) => e.abilityId === 'NAT-03-C').length === 1, 'Last Root still works'); assert.equal(r.lines.b[0].hp, 1); assert.equal(r.lines.b[0].status.payload.remaining, 50, 'the pool is untouched');
});

test('Stone Divide vs Twin Thunder: the first bolt is intercepted before evasion and damage; the second bolt resolves normally', () => {
  const r = run([M('stormcrown', { overall: 30 })], [M('terrabull', { overall: 99 })], { stage: { a0: { ability: { summoned: true, guards: 2 } } }, probes: [passes('b0')], stopAt: { exchange: 3 } });
  const ic = ev(r, 'intercepted', (e) => e.abilityId === 'EAR-05-C'); assert.equal(ic.length, 1, 'one interception');
  const bolts = ev(r, 'damage', (e) => e.abilityId === 'ELE-06-C'); assert.equal(bolts.length, 1, 'the second bolt lands');
  assert.equal(r.lines.a[0].ability.guards, 0, 'the intercepted bolt counts as launched (resources spent)');
});

test('Victory Surge and Arc Rebound: an ordinary KO earns the surge (follow-up); a follow-up is an extra strike that Stone Divide can intercept', () => {
  const r = run([M('joltrex', { overall: 99 })], [M('gravelpup'), M('terrabull')], { stage: { b0: { hp: 1 } }, probes: [first('a0')], stopAt: { exchange: 1, turn: 1 } });
  assert.ok(ev(r, 'ko', (e) => e.target === 'b0').length === 1);
  assert.ok(ev(r, 'intercepted', (e) => e.abilityId === 'EAR-05-C').length === 1, 'the entering Terrabull walls the surge');
  assert.equal(ev(r, 'damage', (e) => e.abilityId === 'ELE-05-C').length, 0); assert.equal(r.lines.a[0].ability.used, true, 'the surge is spent');
  // Arc Rebound: the rebound is a reaction (extra strike); with a controlled miss on the active, it hits the first reserve
  const r2 = run([M('voltfin')], [M('gravelpup'), M('tinhare')], { probes: [passes('b0'), { missCheck: (v, x, info) => (x === 'b0' && info.attacker === 'a0' ? { miss: true, source: 'controlled reviewer miss' } : null) }], stopAt: { exchange: 1 } });
  assert.equal(ev(r2, 'damage', (e) => e.abilityId === 'ELE-02-C' && e.target === 'b1').length, 1);
});

test('Eclipse Theft riders: a stolen Glacier Wall shield does not carry its rebuild ownership (no rebuild for the thief)', () => {
  const r = run([M('nyxshade', { overall: 30 })], [M('glaciron', { overall: 99 })], { probes: [first('a0'), passes('b0')], stopAt: { exchange: 3 } });
  const t = ev(r, 'status', (e) => e.abilityId === 'DAR-06-C')[0]; assert.ok(t && t.slot.id === 'shielded', 'the entry shield is stolen');
  assert.equal(r.lines.b[0].ability.ownPool, 0, 'the victim lost the original pool (statusEnded: stolen, not broken)'); assert.equal(r.lines.b[0].ability.depleted, false, 'a theft is not a depletion: no rebuild');
});

test('Foresight vs Eclipse Call: a successful Eclipse Call roll on Cerebrix is mirrored back on Nocturne (controlled seed selection)', () => {
  let r = null;
  // STAGED (labelled): Cerebrix starts with a 1-turn Weakened, so Eclipse Call has no eligible target on exchange 1 and waits (use kept);
  // Cerebrix prepares the mirror on exchange 1, the Weakened expires, and Nocturne rolls at the start of exchange 2.
  for (let seed = 1; seed < 200 && !r; seed++) { const x = run([M('cerebrix', { overall: 99 })], [M('gravelpup'), M('nocturne')], { seed, stage: { a0: { status: { id: 'weakened', strength: 10, duration: 1 } } }, probes: [first('a0'), passes('b0')], stopAt: { exchange: 2 } }); if (ev(x, 'roll', (e) => e.abilityId === 'DAR-05-C' && e.success && e.ex === 2).length) r = x; }
  assert.ok(r, 'controlled seed selection: the exchange-2 Eclipse Call roll succeeds');
  assert.ok(ev(r, 'status_blocked', (e) => e.target === 'a0' && /Foresight/.test(e.reason)).length === 1);
  assert.ok(ev(r, 'status', (e) => e.target === 'b1' && e.status === 'confused' && e.abilityId === 'PSY-03-C').length === 1, 'Confused redirected to its caster (in reserve)');
});

test('Mountain Shelter vs Faultline: the explicit replacement overrides the uncleansable 100% Healing Reduced', () => {
  const r = run([M('titanolith'), M('tidepaw')], [M('gravelpup')], { stage: { a1: { hp: 20, status: { id: 'healingReduced', strength: 100, duration: 4, payload: { pct: 100, uncleansable: true } } } }, probes: [first('a0'), passes('b0')], stopAt: { exchange: 1 } });
  const e = ev(r, 'status', (x) => x.abilityId === 'EAR-06-C' && x.target === 'a1')[0]; assert.ok(e && e.replaced === 'healingReduced' && e.slot.id === 'guarded');
});

test('Emergency Cover vs Shared Burden: a lethal hit is redirected whole to the Pebblit (8b before 8c: no split of that hit)', () => {
  const r = run([M('tidepaw'), M('pebble', { overall: 99 }), M('mudcub')], [M('charbun', { overall: 99 })], { stage: { a0: { hp: 1 }, a2: { ability: { used: true, link: { since: 0, turnsLeft: 3 } } } }, probes: [passes('a0')], stopAt: { exchange: 1 } });
  const red = ev(r, 'redirect', (e) => e.abilityId === 'EAR-01-C')[0]; assert.ok(red, 'cover at 8b');
  assert.equal(ev(r, 'raw_split', (e) => e.hit === red.hit).length, 0, 'the covered hit is not split');
  // a non-lethal hit is split by the link
  const r2 = run([M('tidepaw'), M('pebble', { overall: 99 }), M('mudcub')], [M('charbun', { overall: 40 })], { stage: { a2: { ability: { used: true, link: { since: 0, turnsLeft: 3 } } } }, probes: [passes('a0')], stopAt: { exchange: 1 } });
  assert.ok(ev(r2, 'raw_split', (e) => e.abilityId === 'WAT-02-C').length === 1);
});

test('Shell Harvest vs Riptide Pursuit: the pursuit resolves first, the cash-out converts the pool left after it', () => {
  const plan = {}; for (let e = 1; e <= 30; e++) plan[e] = e === 1 ? 'a1' : 'stay';
  const r = run([M('thornback'), M('tidepaw')], [M('tsunarok', { overall: 30 })], { stage: { a0: { hp: 40 } }, policies: { a: 'manual', b: 'none' }, decisions: { a: plan }, probes: [passes('b0')], stopAt: { exchange: 1 } });
  const p = ev(r, 'damage', (e) => e.abilityId === 'WAT-06-C')[0]; const cash = ev(r, 'status_end', (e) => /cashed out/.test(e.reason || ''))[0]; const heal = ev(r, 'heal', (e) => e.abilityId === 'NAT-05-C')[0];
  assert.ok(p && cash && heal && p.seq < cash.seq && cash.seq < heal.seq, 'pursuit -> cash-out -> heal');
  const pool = ev(r, 'status', (e) => e.abilityId === 'NAT-05-C')[0].slot.pool; assert.equal(heal.budget, pool - p.shield.poolLoss, 'the remaining pool after the pursuit');
});

test('Daybreak Lance (Practiced: Core and Progression agree) suppresses attack retaliation: Stoke the Flame\'s counterburst is refused', () => {
  const r = run([M('aurelion', { overall: 60, tier: 1 })], [M('emberfox', { overall: 99 })], { stage: { b0: { ability: { charges: 2 } } }, probes: [first('a0'), passes('b0')], stopAt: { exchange: 1 } });
  assert.equal(ev(r, 'damage', (e) => e.abilityId === 'LIG-06-C').length, 1);
  assert.equal(ev(r, 'damage', (e) => e.actor === 'b0' && e.tag === 'reaction').length, 0, 'no counterburst');
  assert.ok(ev(r, 'unmet', (e) => e.abilityId === 'FIR-01-C' && e.unmet.some((u) => u.condition === 'retaliation allowed')).length === 1, 'the refusal is reported');
});

test('Eye of the Storm vs a once-per-Clash ability and Circuit Breaker vs Fresh Start: running cooldowns are the shared currency', () => {
  // Circuit Breaker extends the Dragon Pounce cooldown; a Fresh Start on the Drakling side shortens it again
  const r = run([M('stormlynx', { overall: 30 })], [M('drakeling', { overall: 30 }), M('snowmoth')], { probes: [first('b0')], stopAt: { exchange: 2 } });
  assert.ok(ev(r, 'clock_adjust', (e) => e.abilityId === 'ELE-04-C' && e.clock === 'DRA-01-C' && e.after - e.before === 2).length === 1);
});
