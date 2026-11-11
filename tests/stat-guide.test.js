// The attribute guide (GDD §8.2): what each attribute does per position, and the rule that points only go where they help.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POSITIONS, ATTR_ORDER, STAT_GUIDE, attributeHelps, usefulAttributes, statMeaning } from '../src/data/stat-guide.js';
import { ATTRIBUTES, POSITION_WEIGHTS } from '../src/data/personnel.js';
import { generateMonster, spendPoint, autoSpendPoints, levelUp, monsterOverall, syncFromDev, bankedPoints } from '../src/data/monsters.js';
import { addBankedPoints } from '../src/franchise/t8/progression.js';
import * as FR from '../src/core/fraction.js';
import { createRng } from '../src/core/rng.js';
import { RULES } from '../src/data/beast-dex.js';

test('the guide covers all twelve attributes and all ten positions; every attribute helps someone; overall-rating attributes always help', () => {
  assert.deepEqual([...ATTR_ORDER].sort(), [...ATTRIBUTES].sort());
  assert.deepEqual([...POSITIONS].sort(), Object.keys(POSITION_WEIGHTS).sort());
  for (const a of ATTR_ORDER) { assert.ok(STAT_GUIDE[a].summary); assert.ok(POSITIONS.some((p) => attributeHelps(p, a)), `${a} helps someone`); for (const p of Object.keys(STAT_GUIDE[a].by)) assert.ok(POSITIONS.includes(p)); }
  for (const [p, w] of Object.entries(POSITION_WEIGHTS)) for (const a of Object.keys(w)) assert.ok(attributeHelps(p, a), `${p} OVR uses ${a}, so it must be spendable`);
  for (const p of POSITIONS) { assert.ok(usefulAttributes(p).length >= 2); for (const a of ATTR_ORDER) assert.ok(statMeaning(p, a).length > 10); }
});

test('engine-backed rules: arm and accuracy only help the QB, kicking only the K, coverage only LB/CB/S, blocking only offensive blockers, tackling only defenders', () => {
  for (const p of POSITIONS) {
    assert.equal(attributeHelps(p, 'arm'), p === 'QB'); assert.equal(attributeHelps(p, 'accuracy'), p === 'QB'); assert.equal(attributeHelps(p, 'kicking'), p === 'K');
    assert.equal(attributeHelps(p, 'coverage'), ['LB', 'CB', 'S'].includes(p)); assert.equal(attributeHelps(p, 'blocking'), ['RB', 'WR', 'TE', 'OL'].includes(p));
    assert.equal(attributeHelps(p, 'tackling'), ['DL', 'LB', 'CB', 'S'].includes(p));
  }
  assert.ok(attributeHelps('QB', 'catching'), 'ball security'); assert.ok(attributeHelps('CB', 'catching'), 'interceptions'); assert.ok(!attributeHelps('OL', 'catching'));
  assert.ok(!attributeHelps('K', 'durability'), 'kickers are never injured and fatigue does not touch kicking');
});

// Spec §58 (Task 8): all monsters can train all 12 attributes up to their individual ceilings; the old refusal of points in an
// attribute the position does not use is superseded. Training such an attribute still does not make it help the position (no OVR).
test('points: a QB may train kicking (spec §58), but it does not help him; useful attributes still take points; nothing is spent on a refusal', () => {
  const rng = createRng(5); const rookie = (position) => { const m = generateMonster(rng, { position, quality: 60, age: 20, yearsPro: 0 }); m.dev.temper = 'calm'; return m; }; // level 1, cost 1, neutral Temper
  const qb = rookie('QB'); addBankedPoints(qb.dev, 2); const ovr = monsterOverall(qb); const kick = qb.attributes.kicking;
  const r = spendPoint(qb, 'kicking'); assert.equal(r.ok, true); assert.equal(qb.attributes.kicking, kick + 1); assert.equal(attributeHelps('QB', 'kicking'), false);
  assert.equal(monsterOverall(qb), ovr, 'kicking is not in a QB\'s overall');
  const acc = qb.attributes.accuracy; assert.ok(spendPoint(qb, 'accuracy').ok); assert.equal(qb.attributes.accuracy, acc + 1); assert.ok(monsterOverall(qb) >= ovr);
  const a0 = { ...qb.attributes }; const none = spendPoint(qb, 'accuracy'); assert.equal(none.ok, false); assert.match(none.reason, /No training points/); assert.deepEqual(qb.attributes, a0);
  const wr = rookie('WR'); addBankedPoints(wr.dev, 1); wr.dev.current.catching = wr.dev.potential.catching; syncFromDev(wr); const w0 = { ...wr.attributes };
  const capped = spendPoint(wr, 'catching'); assert.equal(capped.ok, false); assert.match(capped.reason, /ceiling/); assert.ok(FR.eq(bankedPoints(wr), 1), 'nothing spent on a refusal'); assert.deepEqual(wr.attributes, w0);
  assert.ok(spendPoint(wr, 'speed').ok); assert.ok(FR.eq(bankedPoints(wr), 0));
  const k = rookie('K'); addBankedPoints(k.dev, 1); assert.ok(spendPoint(k, 'kicking').ok);
});

// The trainer (allocateTraining, spec §4) spends an ordinary monster's points only on his position's OVR attributes or on an attribute
// with an approved non-OVR use there (Appendix C role register, RULES.attributeRoles); never on one "Not used" at the position
// (e.g. arm for a WR, kicking for a QB). The register is wider than this guide's attributeHelps (e.g. tackling for a WR). Level-up growth
// is the approved natural schedule (B6, spec §161): every attribute grows toward its own allowance, so it is not position-filtered.
test('the trainer only ever raises attributes used at the position; level-up growth follows the natural schedule', () => {
  const rng = createRng(9);
  for (let i = 0; i < 300; i++) {
    const pos = POSITIONS[i % POSITIONS.length]; const m = generateMonster(rng, { position: pos, quality: 55 });
    const before = { ...m.attributes }; const bank0 = bankedPoints(m);
    for (let l = 0; l < 4; l++) levelUp(m, rng);
    for (const a of ATTR_ORDER) assert.ok(m.attributes[a] >= before[a] && m.attributes[a] <= m.dev.potential[a], `${pos} ${a} level-up growth within the ceiling`);
    assert.ok(FR.eq(bankedPoints(m), bank0), 'no points on level-up (B6)');
    const mid = { ...m.attributes }; addBankedPoints(m.dev, 6); autoSpendPoints(m, rng);
    if (!m.dev.apex) for (const a of ATTR_ORDER) if (m.attributes[a] > mid[a]) assert.ok(POSITION_WEIGHTS[pos][a] || RULES.attributeRoles[pos][a] === true, `${pos} trained ${a}`);
  }
});
