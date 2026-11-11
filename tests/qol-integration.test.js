// Franchise QoL update: one focused pass through the franchise week with all four changes together (edited coach, skipped
// Wednesday, generated field, new press conference), a save and load in the middle, and a Wednesday skip in the playoffs.
// Deliberately small: a few weeks and one season at most, not a soak.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { REGIONS } from '../src/data/staff.js';
import { coachSpec, DEFAULT_LOOK } from '../src/ui/coach-portrait.js';
import { GYMS } from '../src/data/gyms.js';
import { FIELD_BY_TYPE } from '../src/data/field-generator.js';

function toWednesday(f) { if (f.season.day === 0) { if (F.draftWindow(f)) F.scoutDraft(f); else F.scoutRegion(f, Object.keys(REGIONS)[0]); } if (f.season.day === 1) { if (F.draftWindow(f)) F.recoveryDay(f); else F.skipRecruit(f); } }
function sunday(f) { const m = F.sundayMatchup(f); if (!m) return null; if (m.forfeit) { F.forfeitSunday(f); return m; } F.finishSunday(f, F.simulatePlayerGame(f)); return m; }

test('three weeks: edit the coach, skip Wednesday, answer the press by hand, play on the generated field, save and load', () => {
  let f = newFranchise(91); const spec = coachSpec({ ...DEFAULT_LOOK, hair: 'cornrows', outfit: 'hoodie' }); f.owner.portrait = spec;
  const twin = newFranchise(91); twin.owner.portrait = spec; const fields = [];
  for (let w = 0; w < 3; w++) {
    for (const g of [f, twin]) {
      if (F.isBye(g)) { F.autoRunToSunday(g); F.takeBye(g); continue; }
      toWednesday(g); assert.equal(g.season.day, 2); assert.equal(F.skipTraining(g).ok, true); assert.equal(g.season.day, 3);
      // Thursday and Friday by the staff, stopping before Saturday is not offered; so do them directly
      if (g.season.day === 3) F.scoutOpponent(g, 'offense'); assert.equal(g.season.day, 4);
      F.autoRunToSunday(structuredClone(g)); // the staff can also finish a week that began with a skip
    }
    if (f.season.day !== 4) continue;
    f = Save.importJson(Save.exportJson(f)); assert.equal(f.week.trainingSkipped, true); assert.equal(f.owner.portrait, spec);
    for (const g of [f, twin]) { // Friday: the staff's plan; Saturday by hand
      const c = structuredClone(g); F.autoRunToSunday(c); g.week.plan = c.week.plan; g.season.day = 5;
      const qs = F.mediaQuestions(g); assert.equal(qs.length, 3); const r = F.answerMedia(g, [w % 4, (w + 1) % 4, (w + 2) % 4]); assert.equal(r.ok, true); assert.equal(g.season.day, 6);
      assert.equal(r.headline.paper, 'THE BEAST TIMES'); assert.ok(g.news.some((n) => n.text.includes('THE BEAST TIMES')));
    }
    assert.deepEqual(f.week.media, twin.week.media, 'the same save gets the same press conference and headline');
    const m = F.sundayMatchup(f); const v = F.gameVenue(f, m.home.name, m.away.name); assert.deepEqual(v, F.gameVenue(twin, m.home.name, m.away.name), 'same seed and week: same field');
    const boss = GYMS.find((g) => g.club === m.home.name) || GYMS.find((g) => g.club === m.away.name);
    if (boss) assert.equal(v.env, FIELD_BY_TYPE[boss.element] || 'grass', 'a boss plays on its own field'); fields.push(v.env);
    assert.equal(m.playerSide === 'home' ? m.home.boosts && Object.values(m.home.boosts).some((b) => b.training) : Object.values(m.away.boosts || {}).some((b) => b.training), false, 'no training bonus after a skip');
    sunday(f); sunday(twin); assert.equal(f.season.day, 0); assert.ok(!f.week.trainingSkipped && !f.week.media, 'the new week starts clean');
    assert.equal(JSON.stringify(f.season.records), JSON.stringify(twin.season.records), 'still deterministic');
  }
  assert.ok(fields.length >= 2); assert.equal(f.owner.portrait, spec);
});

test('Wednesday can be skipped in the last regular week and in a playoff week', () => {
  let done = { draftWeek: false, playoff: false };
  for (let seed = 92; seed < 98 && !(done.draftWeek && done.playoff); seed++) {
    const f = newFranchise(seed, { difficulty: 'rookie' });
    for (let w = 0; w < 16 && !f.season.finished; w++) {
      if (F.isBye(f)) { F.autoRunToSunday(f); F.takeBye(f); continue; }
      if (F.inPlayoffs(f) && !F.playoffFixture(f)) break;
      if (F.draftWindow(f) || F.inPlayoffs(f)) {
        toWednesday(f); if (f.season.day !== 2) break; const before = JSON.stringify(f.roster);
        assert.equal(F.skipTraining(f).ok, true); assert.equal(f.season.day, 3); assert.equal(JSON.stringify(f.roster), before);
        if (F.inPlayoffs(f)) done.playoff = true; else done.draftWeek = true;
      }
      F.autoRunToSunday(f); if (f.week.commissioner) break; if (!sunday(f)) break;
    }
  }
  assert.ok(done.draftWeek, 'skipped in the final regular-season week');
  assert.ok(done.playoff, 'skipped in a playoff week');
});
