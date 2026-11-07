import test from 'node:test';
import assert from 'node:assert/strict';
import * as S from '../src/sim/t8/status.js';

const fb = (id, strength, duration, extra = {}) => ({ id, strength, duration, mode: 'football', ...extra });
const cl = (id, strength, duration, extra = {}) => ({ id, strength, duration, mode: 'clash', ...extra });

test('episode rules: one slot; equal adds duration; stronger replaces; weaker ignored; three-application cap; other status blocked', () => {
  let r = S.tryApply(null, cl('slowed', 20, 2)); assert.ok(r.accepted); let s = r.slot;
  r = S.tryApply(s, cl('slowed', 20, 1)); assert.equal(r.slot.remaining, 3); assert.equal(r.slot.applications, 2); s = r.slot;
  r = S.tryApply(s, cl('slowed', 10, 5)); assert.equal(r.accepted, false); assert.equal(r.slot.applications, 2);
  r = S.tryApply(s, cl('slowed', 30, 1)); assert.equal(r.slot.strength, 30); assert.equal(r.slot.remaining, 1); assert.equal(r.slot.applications, 3); s = r.slot;
  r = S.tryApply(s, cl('slowed', 40, 4)); assert.equal(r.accepted, false); assert.match(r.reason, /three/);
  assert.equal(S.tryApply(s, cl('afflicted', 5, 2)).accepted, false);
  assert.equal(S.tryApply(null, fb('guarded', 10, 1)).accepted, false); // Clash only
});

test('clocks: application unit excluded; then one unit per counted play or turn', () => {
  let s = S.tryApply(null, cl('weakened', 10, 2)).slot;
  s = S.endOfUnit(s); assert.equal(s.remaining, 2); // application turn
  s = S.endOfUnit(s); assert.equal(s.remaining, 1); s = S.endOfUnit(s); assert.equal(s, null);
});

test('football Stunned: approved rest-of-play sources clear at the whistle; B18 carryover disables one participating play per unit', () => {
  let s = S.tryApply(null, fb('stunned', 1, 0, { restOfPlay: true })).slot;
  assert.equal(S.disablesPlay(s), false); assert.equal(S.atWhistle(s), null);
  // Clash Stunned with 2 turns left carries 1:1 into football
  let c = S.tryApply(null, cl('stunned', 1, 2)).slot; c = S.endOfUnit(c); // application turn
  let f = S.transfer(c, 'football'); assert.equal(f.remaining, 2); assert.equal(S.disablesPlay(f), true);
  f = S.endOfUnit(S.atWhistle(f)); assert.equal(f.remaining, 1); assert.equal(S.disablesPlay(f), true);
  f = S.endOfUnit(S.atWhistle(f)); assert.equal(f, null);
  // a partly served carryover returns 1:1 to the overtime Clash
  let g = S.transfer(S.tryApply(null, cl('stunned', 1, 3)).slot, 'football'); g = S.endOfUnit(S.atWhistle(g));
  const back = S.transfer(g, 'clash'); assert.equal(back.remaining, 2); assert.equal(back.applications, 1);
});

test('mode transfer clears unsupported statuses; KO and game end clear; Shielded prevents one fumble and ends', () => {
  assert.equal(S.transfer(S.tryApply(null, cl('guarded', 30, 2)).slot, 'football'), null);
  assert.equal(S.transfer(S.tryApply(null, fb('stumbled', 1, 0)).slot, 'clash'), null);
  const sh = S.tryApply(null, cl('shielded', 40, 2, { payload: { pool: 40, remainingFraction: 1 } })).slot;
  const t = S.transfer(sh, 'football'); assert.deepEqual(t.payload, { pool: 40, remainingFraction: 1 });
  const ext = S.tryApply(t, fb('shielded', 40, 1)); assert.deepEqual(ext.slot.payload, t.payload); // equal extension never refills
  const save = S.shieldedFumbleSave(ext.slot); assert.equal(save.prevented, true); assert.equal(save.slot, null);
  assert.equal(S.shieldedFumbleSave(null).prevented, false);
  assert.equal(S.onKnockout(sh), null); assert.equal(S.atGameEnd(sh), null);
});
