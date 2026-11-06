// Task 7 Phase 8: migration and global legendary enforcement (audit resolutions 2, 3, 5, 7; owner D3).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import * as E from '../src/franchise/fa-engine.js';
import { overLimit, legendsBySide } from '../src/franchise/fa-legendary.js';
import { generateMonster, ROSTER_MAX } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';
import { leagueClubs, clubRoster, addToClub, removeFromClub, isProtected } from '../src/franchise/league-registry.js';
import { retirementPass } from '../src/franchise/retirement.js';
import { picksOwnedBy } from '../src/franchise/trades.js';
import { ALL_TEAMS } from '../src/data/league.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { t7FillToMin } from './t7-support.js';

const legend = (sp, id) => { const m = generateMonster(createRng(id.length * 17), { species: sp, quality: 70, id }); m.contract = { signed: 1, ends: 3, years: 3 }; return m; };
/** A pre-Task-7 save (schema 8, no free-agency block) opened by this build. */
function asLegacy(f) { const raw = JSON.parse(Save.exportJson(f)).franchise; delete raw.freeAgency; raw.schemaVersion = 8; return Save.importJson(JSON.stringify(raw)); }
function offseasonToGate(f) {
  f.season.finished = true; f.offseason = null; assert.ok(F.openFreeAgency(f).ok); F.finishFreeAgency(f);
  assert.ok(F.beginDraft(f).ok); let g = 0; while (!f.draft.done && g++ < 60) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  t7FillToMin(f); for (const role of ['head_coach', 'off_coord', 'def_coord', 'head_scout', 'monster_trainer']) if (!f.staff?.[role]) F.hireDefaultStaff(f);
}

test('legacy save over the legendary limit: keeps every monster, cannot add on that side, and must comply before the deadline season', () => {
  const base = newFranchise(61); base.roster.push(legend('stormcrown', 'L1'), legend('aurodrax', 'L2'));
  const f = asLegacy(base); assert.ok(f, 'the old save is read');
  assert.equal(f.schemaVersion, 9); assert.deepEqual(f.freeAgency.legacy.legends[f.club], { offense: 1, defense: 0 }, 'the excess is recorded, nothing removed');
  assert.equal(f.freeAgency.complianceFrom, 2, 'opened in season 1: compliance before season 2');
  assert.ok(f.roster.some((m) => m.id === 'L1') && f.roster.some((m) => m.id === 'L2'));
  const third = legend('tempestra', 'L3'); third.contract = null; (f.freeAgency.extra ||= []).push(third);
  assert.equal(E.blocker(f, f.club, third, null).code, 'legendary', 'no third offensive legendary');
  const def = legend('tsunarok', 'D1'); def.contract = null; f.freeAgency.extra.push(def);
  assert.equal(E.blocker(f, f.club, def, null), null, 'the defensive side is still open');
  offseasonToGate(f);
  const blocked = F.startNextSeason(f); assert.equal(blocked.ok, false); assert.equal(blocked.code, 'legendary'); assert.ok(blocked.compliance.offense.length === 2);
  assert.ok(f.roster.some((m) => m.id === 'L1') && f.roster.some((m) => m.id === 'L2'), 'the gate never deletes anyone');
  assert.ok(F.releaseMonster(f, 'L2').ok, 'release is an available compliance option');
  const go = F.startNextSeason(f); assert.equal(go.ok, true, go.reason);
  assert.ok(E.marketList(f).some((x) => x.m.id === 'L2'), 'the released legendary is on the market, unsigned');
});

test('AI clubs comply by legal transactions before the gate; no AI club can acquire a forbidden legendary', () => {
  const f = newFranchise(62);
  const gym = leagueClubs(f).find((c) => clubRoster(f, c).some((m) => m.legendary && legendsBySide([m]).offense.length));
  assert.ok(gym, 'a gym with an offensive legendary');
  const extra = legend('tempestra', 'AIL'); extra.contract = null; (f.freeAgency.extra ||= []).push(extra);
  assert.equal(E.blocker(f, gym, extra, null, { newSpot: false }).code, 'legendary', 'a protected offensive legendary closes the side');
  // force an excess (as an old save might hold) and run the gate
  const ordinary = leagueClubs(f).find((c) => !clubRoster(f, c).some((m) => m.legendary));
  const a = legend('pyroclast', 'AX1'), b = legend('astralux', 'AX2'); f.freeAgency.extra = f.freeAgency.extra.filter((m) => m !== extra);
  for (const m of clubRoster(f, ordinary).filter((x) => !isProtected(x) && x.position === 'WR').slice(-2)) removeFromClub(f, ordinary, m.id, { year: 1 }); // room for two
  addToClub(f, ordinary, a, { year: 1 }); addToClub(f, ordinary, b, { year: 1 });
  assert.deepEqual(overLimit(clubRoster(f, ordinary)), { offense: 1, defense: 0 });
  offseasonToGate(f); const r = F.startNextSeason(f); assert.ok(r.ok, r.reason);
  assert.deepEqual(overLimit(clubRoster(f, ordinary)), { offense: 0, defense: 0 }, 'complied');
  assert.ok([a, b].some((m) => E.marketList(f).some((x) => x.m === m)), 'the excess went to the market, not deleted');
  for (const c of leagueClubs(f)) { const o = overLimit(clubRoster(f, c)); assert.equal(o.offense + o.defense, 0, c); }
});

test('D3: a save opened in an offseason finishes it the old way (draft included, nothing rewound); the next offseason is Task 7', () => {
  const base = newFranchise(63); base.season.finished = true; base.offseason = null;
  const f = asLegacy(base); assert.equal(f.freeAgency.activeFrom, 2); assert.equal(F.task7Offseason(f), false);
  assert.ok(F.beginDraft(f).ok, 'the draft opens without free agency, as before');
  let g = 0; while (!f.draft.done && g++ < 60) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  while (f.roster.length < F.ROSTER_MIN) { const e = F.offseasonMarket(f)[0]; F.signFreeAgent(f, e.monster.id); }
  for (const role of ['head_coach', 'off_coord', 'def_coord', 'head_scout', 'monster_trainer']) if (!f.staff?.[role]) F.hireDefaultStaff(f);
  const r = F.startNextSeason(f); assert.ok(r.ok, r.reason); assert.equal(f.season.year, 2);
  assert.equal(F.task7Offseason(f), true, 'the offseason after season 2 is a Task 7 offseason');
});

test('the 20-season endpoint: no free-agency offseason after the last season', () => {
  const f = newFranchise(64); f.freeAgency.lastSeason = f.season.year; f.season.finished = true; f.offseason = null;
  assert.equal(F.task7Offseason(f), false); assert.equal(F.openFreeAgency(f).ok, false);
});

test('legends never retire, however long unsigned; no compensatory pick for any departure', () => {
  const f = newFranchise(65); const L = legend('elderoot', 'NR1'); L.contract = null; L.age = 40; (f.pool['Emerald Wilds'] ||= []).push(L);
  for (let y = 1; y <= 12; y++) retirementPass(f, createRng(100 + y), { year: y, news: () => {} });
  assert.ok(Object.values(f.pool).flat().includes(L), 'still on the market after many unsigned years');
  const total = () => ALL_TEAMS.reduce((n, t) => n + picksOwnedBy(f, t, 2, ALL_TEAMS).length, 0); const before = total(); // picks may change hands in trades; none is created
  f.season.finished = true; f.offseason = null; F.openFreeAgency(f); F.finishFreeAgency(f);
  assert.equal(total(), before, 'departures add no picks'); assert.equal(before, ALL_TEAMS.length * 3);
});
