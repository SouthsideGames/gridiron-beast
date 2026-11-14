// Task 10 (owner 2026-11-13, change 6): a ball-carrying quarterback is drawn above his linemen; nothing else in the draw order changes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fieldLayers } from '../src/ui/field-view.js';

const off = [['QB', -5, 0, 0, 0], ['LT', -1, -2, 1, 0], ['C', -1, 0, 1, 0], ['RT', -1, 2, 1, 0], ['RB', -6, 1, 0, 0], ['WR1', 0, 10, 0, 0], ['TE', -1, 3, 1, 0]];
const def = [['DL1', 0, -1, 1, 0], ['LB1', 4, 0, 0, 0]];
const order = (holder, holderTeam = 'off') => fieldLayers({ frame: { t: 1, off, def, holder, holderTeam, ball: [-5, 0, 0] } }).players.map((p) => p.key);

test('the quarterback is drawn last (on top) while he carries the ball, and in his usual place otherwise', () => {
  assert.equal(order('QB').at(-1), 'off:QB');
  for (const ol of ['off:LT', 'off:C', 'off:RT', 'off:TE']) assert.ok(order('QB').indexOf(ol) < order('QB').indexOf('off:QB'), `${ol} under the QB`);
  assert.deepEqual(order('RB'), ['def:DL1', 'def:LB1', ...off.map((p) => `off:${p[0]}`)], 'another carrier: the order is unchanged');
  assert.deepEqual(order('LB1', 'def'), order('RB'), 'a defensive holder: unchanged');
  assert.equal(new Set(order('QB')).size, off.length + def.length, 'every player is drawn exactly once');
});
