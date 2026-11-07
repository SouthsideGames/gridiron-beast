// Generates tests/fixtures/save-v10-season2.json: a deterministic schema-10 (Task 8) franchise at the offseason after season 1,
// with a league registry and free agency. It replaces save-v31-season2.json (schema 6, refused since the Task 8 fresh-save break,
// spec §15) as the generic franchise payload of the storage, slot and journal tests.
// Run: node tests/tools/make-v10-fixture.mjs   (writes the fixture; the same code always writes the same franchise)
import fs from 'node:fs';
import * as F from '../../src/franchise/franchise.js';
import * as Save from '../../src/franchise/save.js';

// The franchise must not depend on the wall clock or on random ids: Date.now() is stepped from a fixed origin.
const T0 = 1_790_000_000_000; let tick = 0; const realNow = Date.now; Date.now = () => T0 + (tick++) * 1000;

export function makeV10Season2() {
  const f = F.createFranchise({ owner: { first: 'Fixture', last: 'Owner', gender: 'Female', portrait: 1, hometown: '' }, club: 'Ember City Beasts', seed: 20261107 });
  // A fixed creation time, and no storage identity: like the v39.1-era payload this replaces, the franchise carries no `uid`, so the
  // storage layer gives it one (legacyUid) exactly as it does a pre-IndexedDB save; the migration tests depend on that.
  f.createdAt = '2026-11-07T00:00:00.000Z'; delete f.uid;
  F.hireDefaultStaff(f);
  while (F.creationDraftPending(f) && F.onTheClock(f) === f.club) F.passDraftPick(f);
  f.settings.tutorial = false; f.welcomed = true; F.chooseGoal(f, 'wins');
  for (let g = 0; g < 80 && !f.season.finished; g++) {
    F.autoRunToSunday(f);
    if (F.isBye(f)) F.takeBye(f);
    else if (F.playerAlive(f)) { const m = F.sundayMatchup(f); if (m?.forfeit) F.forfeitSunday(f); else F.finishSunday(f, F.simulatePlayerGame(f)); }
    else F.skipPlayoffs(f);
  }
  if (!f.season.finished) throw new Error('season 1 did not finish');
  return f;
}

const f = makeV10Season2(); Date.now = realNow;
const wrapper = { app: 'gridiron-beast', schemaVersion: f.schemaVersion, exportedAt: '2026-11-07T00:00:00.000Z', franchise: f };
const text = JSON.stringify(wrapper);
const back = Save.migrate(JSON.parse(text).franchise);
if (!back || back.schemaVersion !== 10) throw new Error('migrate refused the generated save');
const out = process.argv[2] ? new URL(`file://${process.argv[2]}`) : new URL('../fixtures/save-v10-season2.json', import.meta.url);
fs.writeFileSync(out, text);
console.log(`wrote ${out.pathname}: ${text.length} bytes, ${f.club} year ${f.season.year} finished=${f.season.finished}, roster ${f.roster.length}, history ${f.history.length}, offseason ${!!f.offseason}`);
