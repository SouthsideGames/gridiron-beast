// The attribute guide (GDD §8.2): what each attribute does per position, and the rule that points only go where they help.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POSITIONS, ATTR_ORDER, STAT_GUIDE, attributeHelps, usefulAttributes, statMeaning } from '../src/data/stat-guide.js';
import { ATTRIBUTES, POSITION_WEIGHTS } from '../src/data/personnel.js';
import { generateMonster, spendPoint, autoSpendPoints, levelUp } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';

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

test('points: a QB cannot put a point into kicking (or a WR into accuracy); useful attributes still take points; nothing is spent on a refusal', () => {
  const rng = createRng(5);
  const qb = generateMonster(rng, { position: 'QB', quality: 60 }); qb.points = 2; qb.potential = 99;
  const r = spendPoint(qb, 'kicking'); assert.equal(r.ok, false); assert.equal(r.notUseful, true); assert.match(r.reason, /does not help a quarterback/); assert.equal(qb.points, 2);
  const acc = qb.attributes.accuracy; assert.ok(spendPoint(qb, 'accuracy').ok); assert.equal(qb.attributes.accuracy, acc + 1);
  const wr = generateMonster(rng, { position: 'WR', quality: 60 }); wr.points = 1; wr.potential = 99;
  assert.equal(spendPoint(wr, 'accuracy').ok, false); assert.equal(spendPoint(wr, 'arm').ok, false); assert.ok(spendPoint(wr, 'catching').ok);
  const k = generateMonster(rng, { position: 'K', quality: 60 }); k.points = 1; k.potential = 99; assert.equal(spendPoint(k, 'speed').ok, false); assert.ok(spendPoint(k, 'kicking').ok);
});

test('the trainer and level-up growth only ever raise attributes that help the position', () => {
  const rng = createRng(9);
  for (let i = 0; i < 300; i++) {
    const pos = POSITIONS[i % POSITIONS.length]; const m = generateMonster(rng, { position: pos, quality: 55 }); m.potential = 99;
    const before = { ...m.attributes };
    for (let l = 0; l < 4; l++) levelUp(m, rng, { autoSpend: true });
    m.points = 6; autoSpendPoints(m, rng);
    for (const a of ATTR_ORDER) if (m.attributes[a] > before[a]) assert.ok(attributeHelps(pos, a), `${pos} grew ${a}`);
  }
});
