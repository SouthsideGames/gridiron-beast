// The final single-position rule for existing saves (owner approval 2026-11-05, section 11): every monster takes its family's position,
// once, at the next offseason boundary; nothing else about it changes; lineups are repaired; the franchise carries on.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { leagueClubs, clubRoster } from '../src/franchise/league-registry.js';
import { familyPosition, migrationDue } from '../src/franchise/position-migration.js';
import { monsterOverall } from '../src/data/monsters.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { t7Settle, t7FillToMin } from './t7-support.js';

const OTHER = { LB: 'DL', RB: 'WR', CB: 'S', DL: 'OL', S: 'CB', OL: 'TE', WR: 'RB', TE: 'OL', QB: 'QB', K: 'K' };
/** A save as an older build left it: about a quarter of the monsters hold another position than their family's (the v42.21.0 share). */
function legacyLike(seed) {
  const f = newFranchise(seed); let i = 0;
  const all = [...f.roster, ...leagueClubs(f).flatMap((c) => clubRoster(f, c))];
  for (const m of all) if (i++ % 4 === 0 && OTHER[m.position] !== m.position) m.position = OTHER[m.position];
  return Save.importJson(Save.exportJson(f));
}
const everyone = (f) => [...f.roster, ...leagueClubs(f).flatMap((c) => clubRoster(f, c)), ...Object.values(f.pool || {}).flat(), ...(f.league?.waivers || [])];
const snapshot = (m) => JSON.stringify({ id: m.id, species: m.species, attributes: m.attributes, level: m.level, xp: m.xp, stage: m.stage, ability: m.ability, contract: m.contract, salary: m.salary, potential: m.potential, nature: m.nature });

test('in season: nothing moves until the season closes; then every monster plays its family position, once, with nothing else changed', () => {
  const f = legacyLike(71); assert.ok(migrationDue(f), 'an old save is due'); assert.equal(f.positionMigration, undefined, 'not mid-season');
  const before = new Map(everyone(f).map((m) => [m.id, snapshot(m)]));
  for (let g = 0; g < 40 && !f.season.finished; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  const rep = f.positionMigration; assert.ok(rep && rep.moved > 0 && rep.year === 1, JSON.stringify(rep).slice(0, 200));
  for (const m of everyone(f)) assert.equal(m.position, familyPosition(m), `${m.name} plays his family position`);
  let same = 0; for (const m of everyone(f)) if (before.has(m.id)) { const b = JSON.parse(before.get(m.id)); assert.equal(b.species, m.species); assert.deepEqual(b.attributes && Object.keys(b.attributes), m.attributes && Object.keys(m.attributes)); same++; }
  assert.ok(same > 300);
  assert.ok(f.roster.some((m) => m.positionMigrated), 'moved monsters carry the audit note');
  assert.ok(f.news.some((n) => /Single-position rule/.test(n.text || '')), 'the owner is told');
  assert.equal(migrationDue(f), false);
  const again = Save.importJson(Save.exportJson(f)); assert.equal(again.positionMigration.moved, rep.moved, 'once per save');
  // the franchise carries on: offseason, draft, the next season starts, every club legal
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  t7Settle(f); assert.ok(F.openFreeAgency(f).ok); F.finishFreeAgency(f); assert.ok(F.beginDraft(f).ok); let g = 0; while (!f.draft.done && g++ < 60) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  t7FillToMin(f); for (const role of ['head_coach', 'offensive_coordinator', 'defensive_coordinator', 'head_scout', 'monster_trainer']) if (!f.staff?.[role]) F.hireDefaultStaff(f);
  const go = F.startNextSeason(f); assert.ok(go.ok, go.reason);
  assert.deepEqual(F.validateClubs(f, { cap: 1e9 }).filter((p) => !/cap/.test(p)), [], 'every AI club fields a legal lineup');
  for (const m of everyone(f)) assert.equal(m.position, familyPosition(m));
});

test('a save opened during an offseason migrates at load (the boundary); a save made by this build never needs it', () => {
  const f = legacyLike(72); f.season.finished = true; const g = Save.importJson(Save.exportJson(f));
  assert.ok(g.positionMigration && g.positionMigration.moved > 0); for (const m of everyone(g)) assert.equal(m.position, familyPosition(m));
  const fresh = newFranchise(73); assert.equal(migrationDue(fresh), false);
});
