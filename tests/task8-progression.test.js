// Task 8 M1 progression core (src/franchise/t8/progression.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/core/fraction.js';
import { createRng } from '../src/core/rng.js';
import * as P from '../src/franchise/t8/progression.js';
import { FORMS, formById, ATTRIBUTES } from '../src/data/beast-dex.js';
import { NEUTRAL_TEMPERS, TEMPERS } from '../src/data/temper.js';

const young = { id: 'm1', age: 21, position: 'RB' };

test('generation: uniform independent rolls inside approved ranges; Apex 10-15 / all 99 / neutral; legendaries never Apex', () => {
  const rng = createRng(42); let apex = 0; const N = 4000;
  for (let i = 0; i < N; i++) {
    const form = FORMS[i % FORMS.length]; const d = P.generateIndividual(rng, form.id);
    assert.deepEqual(P.devProblems(d), []);
    if (d.apex) { apex++; assert.notEqual(form.rarity, 'legendary'); assert.ok(NEUTRAL_TEMPERS.includes(d.temper));
      for (const a of ATTRIBUTES) { assert.ok(d.ref[a] >= 10 && d.ref[a] <= 15); assert.equal(d.potential[a], 99); } }
    else for (const a of ATTRIBUTES) { const [sl, sh] = form.starting[a], [pl, ph] = form.potential[a];
      assert.ok(d.ref[a] >= sl && d.ref[a] <= Math.min(sh, d.potential[a]), `${form.id} ${a}`); assert.ok(d.potential[a] >= pl && d.potential[a] <= ph); }
  }
  assert.ok(apex > 10 && apex < 80, `apex count ${apex} for ${N} rolls at 1%`); // reported rate check, not a frozen tolerance (B12 freezes those)
  const forced = P.generateIndividual(createRng(1), 'emberfox:0', { apex: true }); assert.equal(forced.apex, true);
  const a = P.generateIndividual(createRng(9), 'emberfox:0'), b = P.generateIndividual(createRng(9), 'emberfox:0'); assert.deepEqual(a, b);
});

test('natural growth: allowance floor((P-S)/2), linear cumulative entitlement over levels 2-50, 75 XP per level, MAX at 50', () => {
  const d = P.generateIndividual(createRng(3), 'emberfox:0', { apex: false });
  d.ref.speed = d.current.speed = 40; d.potential.speed = 78; d.ref.arm = d.current.arm = 10; d.potential.arm = 99;
  assert.equal(P.allowance(d, 'speed'), 19); assert.equal(P.allowance(d, 'arm'), 44);
  assert.deepEqual(P.entitlementAt(d, 'speed', 1), F.ZERO); assert.deepEqual(P.entitlementAt(d, 'speed', 50), F.frac(19));
  assert.equal(P.addLevelXp(d, 74), 0); assert.equal(P.addLevelXp(d, 1), 1); assert.equal(d.level, 2);
  P.addLevelXp(d, 75 * 60); assert.equal(d.level, 50); assert.equal(d.xp, 0);
  assert.equal(d.current.speed, 59); assert.equal(d.current.arm, 54); assert.equal(d.natural.speed, 19);
  assert.equal(P.addLevelXp(d, 500), 0); assert.equal(d.current.speed, 59);
});

test('training: C/E examples from spec §4, carry, one-point and exact-cost purchases, ceiling refund, early training keeps the allowance', () => {
  const d = P.generateIndividual(createRng(5), 'emberfox:0', { apex: false });
  d.temper = 'swift'; // favored speed, unfavored strength
  const fav = TEMPERS.swift.favored, unf = TEMPERS.swift.unfavored;
  assert.deepEqual(P.trainingCost(d, young, fav).effective, F.frac(1, 2));
  assert.deepEqual(P.trainingCost(d, young, 'awareness').effective, F.ONE);
  assert.deepEqual(P.trainingCost(d, young, unf).effective, F.frac(2));
  assert.equal(P.addTrainingProgress(d, F.frac(5, 4)), 1); assert.deepEqual(d.bar, F.frac(1, 4)); assert.deepEqual(d.bank, F.ONE);
  const s0 = d.current[fav]; assert.equal(P.invest(d, young, fav, 1).increases, 2); assert.equal(d.current[fav], s0 + 2); // C=1 favored: +2
  P.addBankedPoints(d, 1); const u0 = d.current[unf]; assert.equal(P.invest(d, young, unf, 1).increases, 0); // half a bar
  assert.deepEqual(P.attributeBar(d, young, unf), F.frac(1, 2)); assert.deepEqual(P.costToNext(d, young, unf), F.ONE);
  P.addBankedPoints(d, 1); assert.equal(P.invest(d, young, unf, P.costToNext(d, young, unf)).increases, 1); assert.equal(d.current[unf], u0 + 1);
  // ceiling refund
  d.current.kicking = d.potential.kicking - 1; P.addBankedPoints(d, 5); const bank0 = d.bank;
  const r = P.invest(d, young, 'kicking', 3); assert.equal(r.increases, 1); assert.deepEqual(d.bank, F.sub(bank0, 1)); // 1 used, 2 refunded
  // older monster: cost recomputed on the current age, invested points preserved
  const old = { id: 'm1', age: 34, position: 'RB' }; P.addBankedPoints(d, F.frac(1, 2)); P.invest(d, young, 'speed', F.frac(1, 4));
  const inv = d.invest.speed; assert.deepEqual(P.attributeBar(d, old, 'speed'), F.min(F.ONE, F.div(inv, P.trainingCost(d, old, 'speed').effective)));
  // early training does not reduce the natural allowance
  const e = P.generateIndividual(createRng(8), 'emberfox:0', { apex: false }); const all0 = P.allowance(e, 'awareness');
  P.addBankedPoints(e, 10); P.invest(e, young, 'awareness', 3); assert.equal(P.allowance(e, 'awareness'), all0);
  assert.deepEqual(P.devProblems(d), []);
});

test('evolution: percentage of potential kept (halves up, capped), relative ceiling placement, ledgers scaled, nothing replayed', () => {
  const d = P.generateIndividual(createRng(11), 'emberfox:0', { apex: false });
  P.addLevelXp(d, 75 * 9); assert.equal(d.level, 10);
  P.addBankedPoints(d, 3); P.invest(d, young, 'awareness', 3);
  const from = formById('emberfox:0'), to = formById('emberfox:1'); const before = structuredClone(d);
  assert.equal(P.evolve(d), 'emberfox:1');
  for (const a of ATTRIBUTES) {
    const [lo, hi] = from.potential[a], [lo2, hi2] = to.potential[a];
    const P2 = Math.floor(lo2 + ((before.potential[a] - lo) * (hi2 - lo2)) / (hi - lo) + 0.5);
    assert.equal(d.potential[a], P2, a);
    assert.equal(d.current[a], Math.min(P2, Math.floor((before.current[a] * P2) / before.potential[a] + 0.5)), a);
    assert.equal(d.entitled[a], F.floor(P.entitlementAt(d, a, d.level)));
  }
  assert.deepEqual(d.bank, before.bank); assert.deepEqual(d.bar, before.bar); assert.equal(d.temper, before.temper); assert.equal(d.level, 10);
  assert.equal(P.evolve(d), null); // Blazynx -> Infernox needs its own level
  assert.deepEqual(P.devProblems(d), []);
  // approved worked example: developed 30/40 with a 4-point loss -> 45/60 with a 6-point loss, leaving 39/60
  const k = F.frac(60, 40); assert.equal(Math.floor(F.toNumber(F.mul(26, k)) + 0.5), 39); assert.equal(Math.floor(F.toNumber(F.mul(4, k)) + 0.5), 6);
});

test('B17 generation shares: Basic share per channel, original mix untouched, empty pools handled', async () => {
  const { pickFamily, BASIC_SHARE } = await import('../src/franchise/t8/generation.js');
  const { FAMILIES } = await import('../src/data/beast-dex.js');
  assert.deepEqual({ ...BASIC_SHARE }, { roster: 0.25, scouting: 0.25, encounter: 0.30, draft: 0.35, arrival: 0.40 });
  const basics = FAMILIES.filter((f) => f.rarity === 'basic' && f.position === 'WR');
  const originals = FAMILIES.filter((f) => !['basic', 'legendary'].includes(f.rarity) && f.position === 'WR');
  const uniform = (rng, list) => list[rng.int(list.length)];
  for (const [ch, s] of Object.entries(BASIC_SHARE)) {
    const rng = createRng(77); let b = 0; const N = 20000; const orig = {};
    for (let i = 0; i < N; i++) { const f = pickFamily(rng, { channel: ch, basics, originals, pickOriginal: uniform }); if (f.rarity === 'basic') b++; else orig[f.rarity] = (orig[f.rarity] || 0) + 1; assert.equal(f.position, 'WR'); }
    assert.ok(Math.abs(b / N - s) < 0.015, `${ch} basic share ${b / N}`);
  }
  assert.equal(pickFamily(createRng(1), { channel: 'draft', basics: [], originals, pickOriginal: uniform }).rarity !== 'basic', true);
  assert.equal(pickFamily(createRng(1), { channel: 'draft', basics, originals: [], pickOriginal: uniform }).rarity, 'basic');
  assert.throws(() => pickFamily(createRng(1), { channel: 'market', basics, originals, pickOriginal: uniform }));
});

test('career: AI allocation favours positional benefit without ignoring unfavored attributes; decline floor never raises; veteran history is deterministic and valid', async () => {
  const C = await import('../src/franchise/t8/career.js');
  const d = P.generateIndividual(createRng(21), 'emberfox:0', { apex: false }); d.temper = 'powerful'; // unfavored speed for an RB
  P.addBankedPoints(d, 40); const m = { id: 'v1', age: 22, position: 'RB' };
  const spent = C.allocateTraining(d, m);
  const by = spent.reduce((o, s) => ((o[s.attr] = (o[s.attr] || 0) + F.toNumber(s.points)), o), {});
  assert.ok(by.speed > 0, 'important unfavored Speed still developed'); assert.ok(!by.kicking && !by.arm, 'irrelevant attributes untouched');
  assert.deepEqual(P.devProblems(d), []);
  // decline floor never increases a rating
  const e = P.generateIndividual(createRng(4), 'emberfox:0', { apex: false }); e.current.speed = 15; const om = { id: 'old', age: 36, position: 'RB' };
  C.applyDecline(e, om, createRng(2)); assert.ok(e.current.speed <= 15);
  // veteran history
  const run = () => { const v = P.generateIndividual(createRng(31), 'emberfox:0', { apex: false }); const vm = { id: 'vet', age: 21, position: 'RB', yearsPro: 0 }; C.simulateHistory(createRng(32), v, vm, { seasons: 5 }); return { v, vm }; };
  const a = run(), b = run(); assert.deepEqual(a, b);
  assert.equal(a.vm.age, 26); assert.equal(a.vm.yearsPro, 5); assert.ok(a.v.level > 20, `level ${a.v.level}`); assert.ok(['emberfox:1', 'emberfox:2'].includes(a.v.form));
  assert.deepEqual(P.devProblems(a.v), []);
  assert.throws(() => C.simulateHistory(createRng(1), a.v, a.vm, { seasons: 1, xpMultiplier: 3 }));
});
