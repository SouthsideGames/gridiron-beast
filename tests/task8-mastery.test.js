import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../src/franchise/t8/mastery.js';
test('mastery: thresholds 0/10/30/60, valid executions only, passive cap per scope, modes separate', () => {
  assert.deepEqual([0, 9, 10, 29, 30, 59, 60, 500].map(M.tierOf), ['Developing', 'Developing', 'Practiced', 'Practiced', 'Expert', 'Expert', 'Mastered', 'Mastered']);
  let r = { football: 0, clash: 0 }; r = M.creditActive(r, 'football', { valid: true }); r = M.creditActive(r, 'football', { valid: false }); assert.equal(r.football, 1);
  const seen = new Set(); const g = M.passiveScope({ gameId: 'g1' });
  r = M.creditPassive(r, 'clash', { applied: true, scope: g, seen }); r = M.creditPassive(r, 'clash', { applied: true, scope: g, seen }); // opening + OT share
  assert.equal(r.clash, 1); r = M.creditPassive(r, 'clash', { applied: true, scope: M.passiveScope({ standaloneClashId: 'c9' }), seen }); assert.equal(r.clash, 2);
  r = M.creditPassive(r, 'football', { applied: false, scope: g, seen }); assert.equal(r.football, 1);
});
