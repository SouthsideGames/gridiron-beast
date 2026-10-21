// Beast Clash experimental switches: all off by default, each visible in the log when on, and the back-row tests A-E differ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClash, logHash } from '../../src/clash/engine.js';
import { CLASH_VALUES, battleConfig, activeExperiments } from '../../src/clash/values.js';
import { mon, byArch, randomLineup } from './helpers.js';
import { createRng } from '../../src/core/rng.js';

const V = CLASH_VALUES;
const fiveSupports = (seed) => [mon('tidepaw', seed), mon('glimmer', seed + 1), mon('elderoot', seed + 2), mon('lumen', seed + 3), mon('sunwhistle', seed + 4)];
const fiveTanks = (seed) => [mon('pebble', seed), mon('aegistron', seed + 1), mon('rootram', seed + 2), mon('icehorn', seed + 3), mon('glaciron', seed + 4)];

test('Gate A defaults: back row E, duration F, O1/O2 off, policies none; the start event names them and lists no experiments', () => {
  const c = battleConfig({}); assert.equal(c.backRow, 'E'); assert.equal(c.duration, 'F'); assert.equal(c.O1, false); assert.equal(c.O2, false); assert.deepEqual(c.policies, { a: 'none', b: 'none' });
  assert.deepEqual(activeExperiments(c), []);
  const r = simulateClash({ a: [mon('pebble', 1)], b: [mon('emberfox', 2)], seed: 1 }); assert.deepEqual(r.experiments, []); assert.match(r.log[0].text, /Back row E; duration F\./);
  for (const k of ['O1', 'O2']) assert.equal(V.experiments[k].on, false);
  assert.throws(() => battleConfig({ backRow: 'Z' })); assert.throws(() => battleConfig({ duration: 'R9' }));
});

test('experiments never activate silently: when on, the start event and the result list them, and the log explains each effect', () => {
  const a = fiveSupports(10), b = fiveSupports(20);
  const r = simulateClash({ a, b, seed: 3, config: { O1: true, O2: true, duration: 'C6', backRow: 'B' } });
  assert.deepEqual(r.experiments, ['Back row B', 'Duration C6', 'O3 (O1 + O2)']); assert.match(r.log[0].text, /experiments: Back row B, Duration C6, O3/);
  assert.ok(r.log.some((e) => e.kind === 'heal' && /O1 later heal/.test(e.text)), 'O1 is explained on the heal it reduces');
});

test('O1: in 4-5 per side, a side\'s second and later heals in one exchange are 60% strength; not in 3v3; off by default', () => {
  const a = fiveSupports(30), b = fiveTanks(40);
  const off = simulateClash({ a, b, seed: 5 }), on = simulateClash({ a, b, seed: 5, config: { O1: true } });
  const later = on.log.filter((e) => e.kind === 'heal' && /O1 later heal/.test(e.text)); assert.ok(later.length > 0);
  for (const e of later) assert.ok(e.mult <= 0.6 + 1e-9, `mult ${e.mult}`);
  assert.ok(!off.log.some((e) => /O1/.test(e.text)));
  const small = simulateClash({ a: a.slice(0, 3), b: b.slice(0, 3), seed: 5, config: { O1: true } }); assert.ok(!small.log.some((e) => e.kind === 'heal' && /O1/.test(e.text)), 'O1 does nothing in 3v3');
});

test('O2: Tanks have 6% more HP only with 4-5 per side and only when on; the monster records are untouched', () => {
  const a = fiveTanks(50), b = fiveSupports(60); const snap = structuredClone(a);
  const off = simulateClash({ a, b, seed: 7 }), on = simulateClash({ a, b, seed: 7, config: { O2: true } });
  for (let i = 0; i < 5; i++) assert.equal(on.lines.a[i].maxHp, Math.round(off.lines.a[i].combatant.breakdown.hpBase * V.archetypes.Tank.hp * off.lines.a[i].combatant.breakdown.durabilityTilt * 1.06));
  for (const x of on.lines.b) assert.equal(x.maxHp, off.lines.b.find((y) => y.id === x.id).maxHp);
  assert.deepEqual(a, snap);
});

test('duration models: R2 shrinks healing by the ramp from exchange 12; C6 only after 5 quiet exchanges, 25% after 9, reset by a knockout; F changes nothing', () => {
  const a = fiveSupports(70), b = fiveSupports(80);
  const F = simulateClash({ a, b, seed: 9 }), R2 = simulateClash({ a, b, seed: 9, config: { duration: 'R2' } }), C6 = simulateClash({ a, b, seed: 9, config: { duration: 'C6' } });
  assert.ok(!F.log.some((e) => e.kind === 'stalemate'));
  const r2 = R2.log.filter((e) => e.kind === 'stalemate'); assert.ok(r2.length && r2.every((e) => e.ex >= 12 && Math.abs(e.healMult - 1 / e.ramp) < 1e-9));
  const c6 = C6.log.filter((e) => e.kind === 'stalemate');
  for (const e of c6) { assert.ok(e.ex >= 12); assert.ok([0.5, 0.25].includes(e.healMult)); const m = e.text.match(/no knockout for (\d+)/); assert.ok(Number(m[1]) >= 5); if (e.healMult === 0.25) assert.ok(Number(m[1]) >= 9); }
  // After a knockout the C6 rule resets: the next exchange has no stalemate line.
  for (const ko of C6.log.filter((e) => e.kind === 'ko')) assert.ok(!C6.log.some((e) => e.kind === 'stalemate' && e.ex === ko.ex + 1), `stalemate right after the knockout at ${ko.ex}`);
});

test('back-row tests A-E are selectable and behave differently; E limits bench Disruptor actions to one per side and scales the bench chance to the lineup size', () => {
  const rng = createRng(3); const a = randomLineup(rng, 5, byArch('Disruptor')), b = randomLineup(rng, 5, byArch('Balanced'));
  const hashes = {}; for (const t of ['A', 'B', 'C', 'D', 'E', 'E2']) hashes[t] = logHash(simulateClash({ a, b, seed: 4, config: { backRow: t } }));
  assert.equal(new Set(Object.values(hashes)).size, 6, 'six distinct battles');
  const E = simulateClash({ a, b, seed: 4, config: { backRow: 'E' } });
  const perEx = {}; for (const e of E.log) if (/from the bench/.test(e.text) && e.actor?.[0] === 'a' && (e.kind === 'condition' || e.kind === 'bench_miss' || e.kind === 'swap' || e.kind === 'swap_refused')) perEx[e.ex] = (perEx[e.ex] || 0) + 1;
  for (const [ex, n] of Object.entries(perEx)) assert.ok(n <= 1, `exchange ${ex}: ${n} bench actions`);
  assert.ok(E.log.some((e) => e.kind === 'bench_blocked'), 'the others log that they waited');
  assert.equal(V.backRow.tests.E.chanceBig, 0.35); assert.equal(V.backRow.tests.E.chanceSmall, 0.6); assert.equal(V.backRow.tests.E.swapHit, 0.5);
  const A = simulateClash({ a, b, seed: 4, config: { backRow: 'A' } }); assert.ok(!A.log.some((e) => e.kind === 'bench_blocked'));
  const E2 = simulateClash({ a, b, seed: 4, config: { backRow: 'E2' } }); const landedPerEx = {}; for (const e of E2.log) if (/from the bench/.test(e.text) && e.actor?.[0] === 'a' && ((e.kind === 'condition' && (e.result === 'applied' || e.result === 'replaced')) || (e.kind === 'swap'))) landedPerEx[e.ex] = (landedPerEx[e.ex] || 0) + 1; for (const [ex, n] of Object.entries(landedPerEx)) assert.ok(n <= 1, `E2 exchange ${ex}: ${n} landed`);
});

test('Shock: 40-45% chance, attempted every second strike; the log shows attempts, successes, immunity and the skipped action', async () => {
  const r = simulateClash({ a: [mon('stormlynx', 1, { overall: 80 }), mon('stormlynx', 2, { overall: 80 })], b: [mon('pebble', 3), mon('rootram', 4)], seed: 11 });
  const attempts = r.log.filter((e) => e.actor === 'a0' && e.condition === 'shock' && e.kind === 'condition' && !/from the bench/.test(e.text));
  assert.ok(attempts.length > 0); const strikes = r.log.filter((e) => e.kind === 'damage' && e.actor === 'a0' && !/arrival/.test(e.text));
  assert.ok(attempts.length <= Math.ceil(strikes.length / 2) + 1, `${attempts.length} attempts on ${strikes.length} strikes`);
  let skipped = false, landed = false;
  for (let seed = 1; seed <= 20 && !(skipped && landed); seed++) { const x = simulateClash({ a: [mon('stormlynx', 1, { overall: 80 }), mon('stormlynx', 2, { overall: 80 })], b: [mon('pebble', 3), mon('rootram', 4)], seed }); skipped ||= x.log.some((e) => e.kind === 'skip' && /shocked/.test(e.text)); landed ||= x.log.some((e) => e.kind === 'condition' && e.condition === 'shock' && e.result === 'applied'); }
  assert.ok(skipped && landed, 'across seeds a Shock lands and the target skips an action');
  const mv = (await import('../../src/data/clash-moves.js')).CLASH_MOVES.stormlynx; assert.ok(mv.chance >= 0.40 && mv.chance <= 0.45); assert.equal(mv.trigger.n, 2);
});
