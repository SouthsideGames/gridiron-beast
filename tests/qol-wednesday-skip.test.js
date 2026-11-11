// Franchise QoL update: Skip Wednesday. Neutral: straight to Thursday, nothing gained, nothing lost, no random draw.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

import { REGIONS } from '../src/data/staff.js';
// Monday and Tuesday by the ordinary player actions (scout a region, skip the encounter), in a regular week or a draft-window week.
function reachWednesday(f) { if (f.season.day === 0) { if (F.draftWindow(f)) F.scoutDraft(f); else F.scoutRegion(f, Object.keys(REGIONS)[0]); } if (f.season.day === 1) { if (F.draftWindow(f)) F.recoveryDay(f); else F.skipRecruit(f); } return f; }
function atWednesday(seed) { const f = reachWednesday(newFranchise(seed)); assert.equal(f.season.day, 2, 'Wednesday'); return f; }
const snapshot = (f) => JSON.stringify(f.roster.map((m) => [m.id, m.fatigue || 0, m.injury || null, m.morale ?? null, m.attributes, m.level, m.xp, m.dev || null]));

test('skipTraining: Thursday, no boost, no fatigue, no injury, no history, no random draw, no resources', () => {
  const f = atWednesday(41); const before = snapshot(f); const rng = JSON.stringify(f.rngState); const hist = JSON.stringify(f.trainingHistory || []); const budget = JSON.stringify([f.budget ?? null, f.cash ?? null, f.cap ?? null]);
  const r = F.skipTraining(f);
  assert.deepEqual(r, { ok: true, skipped: true }); assert.equal(f.season.day, 3, 'Thursday');
  assert.equal(snapshot(f), before, 'no monster changed: fatigue, injuries, morale, attributes, development');
  assert.equal(JSON.stringify(f.rngState), rng, 'the franchise dice did not move');
  assert.equal(JSON.stringify(f.trainingHistory || []), hist, 'not counted as a practice'); assert.equal(JSON.stringify([f.budget ?? null, f.cash ?? null, f.cap ?? null]), budget);
  assert.equal(f.week.trainingFocus, null); assert.equal(f.week.training, null); assert.equal(f.week.trainingSkipped, true);
});

test('skipTraining: only on Wednesday, and only once; training cannot follow a skip', () => {
  const f = atWednesday(42);
  assert.equal(F.skipTraining(f).ok, true);
  assert.deepEqual(F.skipTraining(f), { ok: false, reason: 'Not Wednesday.' }, 'no repeated skip');
  assert.equal(F.setTraining(f, 'passing', 'normal').ok, false, 'no training after the skip');
  const g = atWednesday(43); assert.equal(F.setTraining(g, 'passing', 'normal').ok, true); assert.equal(F.skipTraining(g).ok, false, 'no skip after training');
  const h = newFranchise(44); assert.equal(h.season.day, 0); assert.equal(F.skipTraining(h).ok, false, 'not on Monday');
});

test('skipTraining: Sunday carries no training bonus, and the existing training path is unchanged', () => {
  const a = atWednesday(45), b = atWednesday(45);
  F.skipTraining(a); const rb = F.setTraining(b, 'passing', 'normal'); assert.equal(rb.ok, true);
  assert.equal(a.week.trainingFocus, null); assert.ok((b.trainingHistory || []).includes('passing'));
  assert.equal(F.trainingStreak(a, 'passing'), 0); assert.equal(F.trainingStreak(b, 'passing'), 1);
  F.autoRunToSunday(a); if (!F.isBye(a)) { const g = F.simulatePlayerGame(a); assert.ok(g, 'the week finishes and the game is played after a skip'); }
});

test('skipTraining on a bye week goes straight to the bye; a skip survives save and load', () => {
  // find a bye week by playing ordinary weeks
  let f = null;
  for (let seed = 50; seed < 56 && !f; seed++) { const c = newFranchise(seed);
    for (let w = 0; w < 12 && !c.season.finished; w++) { reachWednesday(c); if (c.season.day !== 2) break; if (F.isBye(c)) { f = c; break; }
      F.autoRunToSunday(c); const m = F.sundayMatchup(c); if (!m) break; if (m.forfeit) { F.forfeitSunday(c); continue; } F.finishSunday(c, F.simulatePlayerGame(c)); } }
  assert.ok(f, 'a bye week was found'); assert.equal(F.skipTraining(f).ok, true); assert.equal(f.season.day, 6, 'bye week: the rest of the week is rest'); assert.equal(F.takeBye(f).ok !== false, true);
  const s = atWednesday(46); F.skipTraining(s); const back = Save.importJson(Save.exportJson(s));
  assert.equal(back.season.day, 3); assert.equal(back.week.trainingSkipped, true); assert.equal(F.skipTraining(back).ok, false, 'still skipped after loading');
  assert.equal(F.scoutOpponent(back, 'offense').ok || F.isBye(back), true, 'Thursday works after loading');
});
