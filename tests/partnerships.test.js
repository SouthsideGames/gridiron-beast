// Captain Partnerships (GDD §27.4B), phase 1: the pure rules. Pairing types, threshold boundaries, levels, the per-game cap,
// pair ordering, the owner's pick checks, and the one deterministic selection function every club uses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../src/franchise/partnerships.js';
import { PAIR_TYPES, BONUS_ATTRS } from '../src/sim/partnership-play.js';

const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];

test('exactly the eight approved pairing types, each with thresholds, a cap and bonus attributes (never speed)', () => {
  assert.deepEqual(Object.keys(PAIR_TYPES).sort(), ['DL-CB', 'DL-DL', 'DL-LB', 'OL-OL', 'QB-RB', 'QB-TE', 'QB-WR', 'RB-OL']);
  for (const t of Object.keys(PAIR_TYPES)) {
    assert.equal(P.THRESHOLDS[t].length, 4, t); assert.ok(P.gameCap(t) >= P.GAME_CAP_MIN, t);
    for (const role of ['a', 'b']) { assert.ok(BONUS_ATTRS[t][role].length >= 2); assert.ok(!BONUS_ATTRS[t][role].includes('speed'), `${t} ${role}: speed is never boosted`); }
  }
  assert.deepEqual(Object.keys(PAIR_TYPES).filter((t) => PAIR_TYPES[t].side === 'offense').sort(), ['OL-OL', 'QB-RB', 'QB-TE', 'QB-WR', 'RB-OL']);
});

test('every unsupported combination is rejected (LB–LB, CB–S, LB–S and all others)', () => {
  const ok = new Set(['QB|RB', 'QB|WR', 'QB|TE', 'OL|RB', 'OL|OL', 'DL|DL', 'DL|LB', 'CB|DL']);
  for (const x of POS) for (const y of POS) {
    const t = P.typeOf(x, y); const k = [x, y].sort().join('|');
    if (ok.has(k)) assert.ok(t, `${x}+${y} is approved`); else assert.equal(t, null, `${x}+${y} must be rejected`);
  }
  for (const [x, y] of [['LB', 'LB'], ['CB', 'S'], ['LB', 'S']]) assert.equal(P.typeOf(x, y), null);
});

test('every threshold boundary: one play short stays, the threshold itself reaches the level; Elite keeps counting at +4%', () => {
  for (const [type, t] of Object.entries(P.THRESHOLDS)) {
    assert.equal(P.levelOf(type, 0), 0);
    t.forEach((x, i) => { assert.equal(P.levelOf(type, x - 1), i, `${type} ${x - 1}`); assert.equal(P.levelOf(type, x), i + 1, `${type} ${x}`); });
    assert.equal(P.levelOf(type, t[3] * 10), 4, 'no level above Elite');
    for (let i = 1; i < 4; i++) assert.ok(t[i] > t[i - 1], `${type}: thresholds rise`);
    const pr = P.progressOf(type, t[3] + 50); assert.equal(pr.name, 'Elite'); assert.equal(pr.bonus, 4); assert.equal(pr.next, null); assert.equal(pr.n, t[3] + 50);
  }
  assert.deepEqual(P.THRESHOLDS['QB-RB'], [15, 34, 53, 75]); assert.deepEqual(P.THRESHOLDS['DL-CB'], [1, 3, 4, 6]); assert.deepEqual(P.THRESHOLDS['DL-DL'], [1, 3, 4, 6]);
  assert.deepEqual(P.LEVEL_NAMES, ['New', 'Developing', 'Established', 'Strong', 'Elite']);
  const pr = P.progressOf('QB-WR', 10); assert.deepEqual([pr.level, pr.prev, pr.next, pr.toNext], [1, 6, 14, 4]);
});

test('per-game cap: 25% of Elite rounded half up, never below 3', () => {
  assert.deepEqual(Object.fromEntries(Object.keys(P.THRESHOLDS).map((t) => [t, P.gameCap(t)])), { 'QB-RB': 19, 'QB-WR': 8, 'QB-TE': 9, 'RB-OL': 8, 'OL-OL': 5, 'DL-DL': 3, 'DL-LB': 3, 'DL-CB': 3 });
  assert.equal(P.gameCap('LB-LB'), 0);
});

test('pairs are ordered by role, same-position pairs by id; keys are order-free', () => {
  assert.deepEqual(P.orderPair({ id: 'r', position: 'RB' }, { id: 'q', position: 'QB' }), { type: 'QB-RB', a: 'q', b: 'r' });
  assert.deepEqual(P.orderPair({ id: 'z', position: 'OL' }, { id: 'b', position: 'OL' }), { type: 'OL-OL', a: 'b', b: 'z' });
  assert.deepEqual(P.orderPair({ id: 'c', position: 'CB' }, { id: 'd', position: 'DL' }), { type: 'DL-CB', a: 'd', b: 'c' });
  assert.equal(P.orderPair({ id: 'x', position: 'QB' }, { id: 'x', position: 'QB' }), null);
  assert.equal(P.pairKey('b', 'a'), P.pairKey('a', 'b'));
});

const C = (id, position, ovr, role = 'base') => ({ id, name: id, position, ovr, role });
const roster = () => [C('qb1', 'QB', 70), C('qb2', 'QB', 55, 'bench'), C('rb1', 'RB', 66), C('wr1', 'WR', 72), C('wr2', 'WR', 60), C('wr3', 'WR', 58, 'package'), C('te1', 'TE', 64), C('ol1', 'OL', 65), C('ol2', 'OL', 63),
  C('dl1', 'DL', 68), C('dl2', 'DL', 64), C('lb1', 'LB', 66), C('lb2', 'LB', 61), C('cb1', 'CB', 67), C('cb2', 'CB', 62), C('s1', 'S', 64)];

test('selection is deterministic, uses base starters, never reuses a captain, and needs no random number', () => {
  const a = P.suggestCaptains(roster()); const b = P.suggestCaptains(roster().reverse());
  assert.deepEqual(a, b, 'order of the roster does not matter');
  assert.equal(a.offense.type, 'QB-WR'); assert.deepEqual([a.offense.a, a.offense.b], ['qb1', 'wr1']);
  assert.equal(a.defense.type, 'DL-LB'); assert.deepEqual([a.defense.a, a.defense.b], ['dl1', 'lb1'], 'equal type priority: the better pair wins');
  const ids = [a.offense.a, a.offense.b, a.defense.a, a.defense.b]; assert.equal(new Set(ids).size, 4);
  for (const side of ['offense', 'defense']) assert.equal(PAIR_TYPES[a[side].type].side, side);
});

test('selection prefers an established partnership, but not a captain who no longer plays', () => {
  const chem = { [P.pairKey('qb1', 'te1')]: 20 }; // Established QB–TE (16+)
  const s = P.suggestCaptains(roster(), { count: (x, y) => chem[P.pairKey(x, y)] || 0 });
  assert.equal(s.offense.type, 'QB-TE');
  const benched = roster().map((c) => (c.id === 'te1' ? { ...c, role: 'bench' } : c));
  assert.equal(P.suggestCaptains(benched, { count: (x, y) => chem[P.pairKey(x, y)] || 0 }).offense.type, 'QB-WR', 'a benched partner falls back behind the starters');
});

test('a side with no valid pair gets none, with a reason; the franchise is never given an invalid pair', () => {
  const s = P.suggestCaptains([C('qb1', 'QB', 70), C('s1', 'S', 60), C('lb1', 'LB', 60), C('lb2', 'LB', 60)]);
  assert.equal(s.offense, null); assert.equal(s.defense, null); assert.match(s.reason.offense, /No eligible pair/); assert.match(s.reason.defense, /No eligible pair/);
  const t = P.suggestCaptains([C('qb1', 'QB', 70, 'bench'), C('rb1', 'RB', 60, 'bench')]); assert.equal(t.offense.type, 'QB-RB', 'falls back to anyone on the roster');
});

test('the owner\'s pick is checked by primary position, side and one captaincy each', () => {
  const r = roster();
  assert.deepEqual(P.checkPick(r, 'offense', ['wr1', 'qb1']).pair, { type: 'QB-WR', a: 'qb1', b: 'wr1' });
  assert.match(P.checkPick(r, 'offense', ['dl1', 'dl2']).reason, /defensive pairing/);
  assert.match(P.checkPick(r, 'defense', ['lb1', 'lb2']).reason, /not a captain pairing/);
  assert.match(P.checkPick(r, 'defense', ['s1', 'cb1']).reason, /not a captain pairing/);
  assert.match(P.checkPick(r, 'offense', ['qb1', 'nobody']).reason, /roster/);
  assert.match(P.checkPick(r, 'defense', ['dl1', 'cb1'], { other: ['dl1'] }).reason, /one captaincy/);
  assert.match(P.checkPick(r, 'offense', ['qb1']).reason, /two/);
});

test('game identity: distinct for every game of a week and for playoff rounds', () => {
  const a = P.gameIdOf({ year: 1203, week: 4, home: 'A', away: 'B' }), b = P.gameIdOf({ year: 1203, week: 4, home: 'C', away: 'D' });
  const c = P.gameIdOf({ year: 1203, week: 12, playoff: true, round: 2, home: 'A', away: 'B' });
  assert.notEqual(a, b); assert.notEqual(a, c); assert.match(c, /\|p2\|/);
});

test('all eight pairings stay eligible: each one can be picked by the owner and chosen by the selection when it is the only pair', () => {
  const pos = { 'QB-RB': ['QB', 'RB'], 'QB-WR': ['QB', 'WR'], 'QB-TE': ['QB', 'TE'], 'RB-OL': ['RB', 'OL'], 'OL-OL': ['OL', 'OL'], 'DL-DL': ['DL', 'DL'], 'DL-LB': ['DL', 'LB'], 'DL-CB': ['DL', 'CB'] };
  for (const [type, [x, y]] of Object.entries(pos)) {
    const side = PAIR_TYPES[type].side; const cands = [C('x1', x, 60), C('y1', y, 60)];
    const r = P.checkPick(cands, side, ['x1', 'y1']); assert.ok(r.ok, `${type}: ${r.reason}`); assert.equal(r.pair.type, type);
    assert.equal(P.suggestCaptains(cands)[side].type, type, `${type}: chosen when it is the club's only pair`);
  }
});

