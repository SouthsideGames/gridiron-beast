import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import { teamSchedule, leagueSeasonFixtures, standings, blankRecord, applyResult, ALL_TEAMS } from '../src/data/league.js';
import { STAFF_ROLES } from '../src/data/staff.js';
import { ROSTER_MAX } from '../src/data/monsters.js';
import { exportJson, importJson, importLegacy, legacySummary } from '../src/franchise/save.js';
import { monsterOverall } from '../src/data/monsters.js';

function newFranchise(seed = 7) {
  const f = F.createFranchise({ owner: { first: 'Sam', last: 'Rivera', gender: 'Female', portrait: 1, hometown: 'Ember City' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed });
  for (const id of ['hc_vale', 'oc_park', 'dc_ice', 'sc_moss', 'tr_focus']) assert.equal(F.hireStaff(f, id).ok, true, id);
  return f;
}

test('schedule generator matches the golden vectors from the v5 prototype', () => {
  const v = JSON.parse(fs.readFileSync(new URL('./schedule-vectors.json', import.meta.url)));
  let checked = 0;
  for (const season of v.seasons) for (const [team, games] of Object.entries(season.teams)) {
    const mine = teamSchedule(season.year, team);
    games.forEach((g, i) => { checked++; assert.equal(!!g.bye, !!mine[i].bye); assert.equal(g.opponent ?? null, mine[i].opponent ?? null); assert.equal(g.home ?? null, mine[i].home ?? null); });
  }
  assert.ok(checked >= 300);
  for (let y = 1; y <= 16; y++) { const w = leagueSeasonFixtures(y); assert.equal(w.filter((x) => x.bye).length, 1); for (const wk of w) if (!wk.bye) assert.equal(wk.games.length, 8); }
});

test('a new franchise has a legal roster, staff, cap room and a rival in its division', () => {
  const f = newFranchise();
  assert.equal(f.roster.length, 22);
  assert.ok(f.roster.some((m) => m.cornerstone && m.name === 'Voltfang'));
  assert.ok(STAFF_ROLES.every((r) => f.staff[r]));
  assert.equal(F.salarySummary(f).over, false);
  assert.ok(['Bayou Stalkers', 'Sunfire Lions', 'Palmetto Vipers'].includes(f.rivals.challenger.team));
  const team = F.playerTeam(f);
  assert.ok(Object.values(team.chart).every(Boolean), 'every slot filled');
  assert.equal(team.offensePlays.length, 6);
});

test('the weekly loop: scout, recruit, train, scout opponent, plan, lineup', () => {
  const f = newFranchise(11);
  const s = F.scoutRegion(f, 'Volcanic Fields');
  assert.equal(s.ok, true); assert.ok(s.prospects.length >= 1); assert.equal(f.season.day, 1);
  let signed = false;
  for (let i = 0; i < 3 && f.season.day === 1; i++) { const r = F.recruit(f, 0, 'playing_time'); if (r.success) signed = true; }
  assert.equal(f.season.day, 2);
  if (signed) assert.equal(f.roster.length, 23);
  const t = F.setTraining(f, 'passing'); assert.equal(t.ok, true); assert.ok(t.bonus.accuracy >= 1); assert.equal(f.season.day, 3);
  const o = F.scoutOpponent(f, 'offense'); assert.equal(o.ok, true); assert.ok(o.report.star.name); assert.equal(f.season.day, 4);
  const cat = F.catalog(f, 'offense'), catD = F.catalog(f, 'defense');
  assert.equal(F.setGamePlan(f, cat.slice(0, 5), catD.slice(0, 6)).ok, false, 'needs six and six');
  assert.equal(F.setGamePlan(f, cat.slice(0, 6), catD.slice(0, 6)).ok, true); assert.equal(f.season.day, 5);
  const l = F.lineupCheck(f); assert.equal(l.ok, true); assert.equal(f.season.day, 6);
  const m = F.sundayMatchup(f); assert.ok(m.opponent); assert.ok(['home', 'away'].includes(m.playerSide));
  assert.ok(m[m.playerSide].offensePlays.every((id) => cat.includes(id)));
});

test('a full season plus playoffs completes with standings from real games', () => {
  const f = newFranchise(3);
  let games = 0;
  while (!f.season.finished && games < 20) {
    if (f.season.day === 0) F.scoutRegion(f, 'Coral Coast');
    if (f.season.day === 1) F.skipRecruit(f);
    if (f.season.day === 2) F.setTraining(f, 'coverage');
    if (f.season.day === 3) F.scoutOpponent(f, 'defense');
    if (f.season.day === 4) F.setGamePlan(f, F.catalog(f, 'offense').slice(0, 6), F.catalog(f, 'defense').slice(0, 6));
    if (f.season.day === 5) F.lineupCheck(f);
    if (f.season.day === 6) {
      if (F.isBye(f)) { F.takeBye(f); continue; }
      const g = F.simulatePlayerGame(f); assert.ok(g.finished); F.finishSunday(f, g); games++;
    }
  }
  assert.ok(f.season.finished, 'season finished');
  assert.ok(f.season.champion, 'a champion was crowned');
  const rec = F.record(f); assert.equal(rec.w + rec.l + rec.t, 9, 'nine regular-season games');
  const st = F.leagueStandings(f);
  assert.equal(st.overall.length, 16);
  for (const t of ALL_TEAMS) { const r = f.season.records[t]; assert.equal(r.w + r.l + r.t, 9, `${t} played nine`); }
  assert.ok(f.history.length === 1 && f.history[0].year === 1);
  assert.ok(f.roster.some((m) => m.stats.games > 0));
  const next = F.startNextSeason(f); assert.equal(next.ok, true); assert.equal(f.season.year, 2); assert.equal(f.season.week, 1);
});

test('economy: cap, release rules and roster limits', () => {
  const f = newFranchise(5);
  const before = f.roster.length;
  const k = f.roster.find((m) => m.position === 'K');
  assert.equal(F.releaseMonster(f, k.id).ok, false, 'cannot release the only kicker');
  const wr = f.roster.filter((m) => m.position === 'WR').sort((a, b) => monsterOverall(a) - monsterOverall(b))[0];
  assert.equal(F.releaseMonster(f, wr.id).ok, true); assert.equal(f.roster.length, before - 1);
  const cap = F.salarySummary(f); assert.ok(cap.remaining > 0 && cap.total === cap.monsters + cap.staff);
  assert.ok(ROSTER_MAX >= f.roster.length);
});

test('standings tiebreakers and playoff seeding', () => {
  const records = Object.fromEntries(ALL_TEAMS.map((t) => [t, blankRecord()]));
  applyResult(records, { home: 'Ember City Beasts', away: 'Bayou Stalkers', homeScore: 20, awayScore: 10 });
  applyResult(records, { home: 'Sunfire Lions', away: 'Palmetto Vipers', homeScore: 21, awayScore: 20 });
  const st = standings(records);
  assert.deepEqual(st.divisions.South.slice(0, 2), ['Ember City Beasts', 'Sunfire Lions']); // better point differential wins the tie
  assert.equal(st.conferences.Titan.seeds.length, 4);
});

test('save round-trips and the legacy v5 import preserves owner, club, staff and record', () => {
  const f = newFranchise(9);
  const json = exportJson(f);
  const back = importJson(json);
  assert.equal(back.club, f.club); assert.equal(back.roster.length, f.roster.length);
  const legacy = { coach: { first: 'Dana', last: 'Cole', gender: 'Female', city: 'Stonehaven', team: 'Stonehaven Titans' }, staff: { head_coach: 'hc_flint', offensive_coordinator: 'oc_brock', defensive_coordinator: 'dc_stone', head_scout: 'sc_ash', monster_trainer: 'tr_power' }, franchise: { season: 3, week: 4, record: { w: 2, l: 1 }, starterOffense: 'Firestorm', starterDefense: 'Skywarden', rivals: { challenger: { team: 'Ashford Hawks' } }, championshipBadges: { challenger: 1, vanguard: 0, sovereign: 0 }, seasonHistory: [{ season: 1, record: { w: 4, l: 5 }, schedule: [] }, { season: 2, record: { w: 6, l: 3 }, schedule: [] }] } };
  const s = legacySummary(legacy); assert.equal(s.club, 'Stonehaven Titans');
  const imported = importLegacy(legacy);
  assert.equal(imported.owner.first, 'Dana'); assert.equal(imported.club, 'Stonehaven Titans');
  assert.equal(imported.staff.head_coach, 'hc_flint'); assert.equal(imported.rivals.challenger.team, 'Ashford Hawks');
  assert.equal(imported.badges.challenger, 1); assert.equal(imported.history.length, 2); assert.equal(imported.season.year, 3);
  assert.ok(imported.roster.some((m) => m.name === 'Firestorm' && m.position === 'QB'));
});

test('quick start: default staff, first-week plan and a Sunday game straight away', () => {
  const f = F.createFranchise({ owner: { first: 'Sam', last: 'Rivera', gender: 'Female', portrait: 1, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 7 });
  F.hireDefaultStaff(f); F.quickStartWeek(f);
  assert.equal(Object.keys(f.staff).length, STAFF_ROLES.length);
  assert.equal(F.nextStaffRole(f), null);
  assert.equal(f.week.plan.offense.length, F.PLAN_SIZE); assert.equal(f.week.plan.defense.length, F.PLAN_SIZE);
  assert.equal(f.season.day, 6);
  assert.ok(F.sundayMatchup(f), 'a matchup exists on the first Sunday');
  assert.equal(f.settings.mode, 'key', 'new players default to Key Moments');
  assert.ok(!F.TIERS_ENABLED, 'promotion/relegation is hidden in this release');
  const r = F.replaceStaff(f, f.staff.head_coach); assert.equal(r.ok, false);
});

test('headline attributes derive four values from the twelve', async () => {
  const { headlineAttributes, HEADLINE } = await import('../src/data/monsters.js');
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 3 });
  for (const m of f.roster) { const h = headlineAttributes(m); for (const { key: k } of HEADLINE) { assert.ok(Number.isFinite(h[k]) && h[k] >= 1 && h[k] <= 99, `${m.name} ${k}`); } }
});

test('season awards are produced when a season ends', () => {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 11 });
  F.hireDefaultStaff(f);
  const a = F.seasonAwards(f);
  assert.ok(a && 'mvp' in a && a.rivalry && a.rivalry.team, 'awards object has an MVP slot and a rivalry line');
});
