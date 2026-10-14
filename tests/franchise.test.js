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
  const t = F.setTraining(f, 'passing'); assert.equal(t.ok, true); assert.ok(t.amount >= 1); assert.equal(f.season.day, 3);
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

test('new franchise: default staff, first week starts Monday', () => {
  const f = F.createFranchise({ owner: { first: 'Sam', last: 'Rivera', gender: 'Female', portrait: 1, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 7 });
  F.hireDefaultStaff(f); F.firstWeekWelcome(f);
  assert.equal(Object.keys(f.staff).length, STAFF_ROLES.length);
  assert.equal(F.nextStaffRole(f), null);
  assert.equal(f.season.day, 0, 'the first week starts on Monday');
  assert.ok(f.news.some((n) => n.text.includes('first week')), 'welcome guide posted');
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

test('sprites: same species share a shape, individuals differ only in colour', async () => {
  const { monsterSprite } = await import('../src/ui/pixel-monster.js');
  const shape = (s) => s.replace(/fill="[^"]+"/g, '');
  const a = monsterSprite({ id: 'x1', species: 'Tidepaw', type: 'Water' }, 8), b = monsterSprite({ id: 'x2', species: 'Tidepaw', type: 'Water' }, 8);
  const c = monsterSprite({ id: 'x3', species: 'Voltfang', type: 'Water' }, 8);
  assert.equal(shape(a), shape(b)); assert.notEqual(a, b); assert.notEqual(shape(a), shape(c));
  assert.equal(shape(monsterSprite({ id: 'x4', name: 'Tidepaw II', type: 'Water' }, 8)), shape(a), 'numbered names map back to the species');
});

test('AI clubs carry exactly six offensive and six defensive plays and only call those', async () => {
  const { playbookFor, AI_PLAN_SIZE } = await import('../src/franchise/roster.js');
  for (let s = 1; s < 40; s++) { const pb = playbookFor(s, { passBias: 0.4 + (s % 5) / 10, aggression: (s % 7) / 7 }); assert.equal(pb.offense.length, AI_PLAN_SIZE); assert.equal(pb.defense.length, AI_PLAN_SIZE); assert.equal(new Set(pb.offense).size, 6); }
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 21 });
  F.hireDefaultStaff(f);
  const opp = F.aiTeam(f, F.opponentName(f));
  const { playGame } = await import('../src/sim/game-runner.js');
  const called = new Set();
  playGame({ home: F.playerTeam(f), away: opp, seed: 9, quarterLength: 180, onStep: (ev, st) => { if (ev?.kind === 'play' && ev.sim && opp.offensePlays.concat(opp.defensePlays).length) { called.add(ev.offensePlayId); called.add(ev.defensePlayId); } } });
  const mine = F.playerTeam(f); const legal = new Set([...opp.offensePlays, ...opp.defensePlays, ...mine.offensePlays, ...mine.defensePlays]);
  assert.ok(called.size > 4);
  for (const id of called) assert.ok(legal.has(id), `${id} was never equipped`);
  f.season.day = 3; const r = F.scoutOpponent(f, 'defense');
  assert.equal(r.report.plays.length, 6); assert.ok(r.report.star.ovr > 40);
});

test('depth chart: owner order decides starters and the next healthy monster replaces an injured one', () => {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 33 });
  F.hireDefaultStaff(f);
  const wrs = F.depthList(f, 'WR'); assert.ok(wrs.length >= 3);
  const last = wrs[wrs.length - 1];
  for (let i = 0; i < wrs.length - 1; i++) F.moveDepth(f, 'WR', last, -1);
  assert.equal(F.depthList(f, 'WR')[0], last);
  const chart1 = F.lineupCheck(f).chart; assert.equal(chart1.WR1, last, 'the owner\'s first WR starts');
  f.roster.find((m) => m.id === last).injury = { severity: 'Minor', weeks: 1 };
  const chart2 = F.lineupCheck(f).chart; assert.equal(chart2.WR1, F.depthList(f, 'WR')[1], 'next in order steps in');
  F.assignSlot(f, 'WR2', last); assert.equal(F.depthList(f, 'WR').indexOf(last) >= 1, true);
});

test('training: odds shown match the rule, the third straight week of one focus usually fails', () => {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 44 });
  F.hireDefaultStaff(f);
  assert.ok(F.trainingOdds(f, 'passing', 'normal').success > 0.7);
  f.trainingHistory = ['passing', 'passing'];
  assert.ok(F.trainingOdds(f, 'passing', 'normal').success < 0.4, 'third week running');
  assert.ok(F.trainingOdds(f, 'rushing', 'normal').success > 0.7, 'switching resets it');
  assert.ok(F.trainingOdds(f, 'rushing', 'full').amount > F.trainingOdds(f, 'rushing', 'light').amount);
  f.season.day = 2; const r = F.setTraining(f, 'coverage', 'full'); assert.ok(r.ok); assert.equal(f.season.day, 3);
  assert.equal(f.week.trainingFocus, r.success ? 'coverage' : null);
});

test('media day: three questions, answers boost matching temperaments on Sunday', async () => {
  const { temperamentOf } = await import('../src/data/media.js');
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 55 });
  F.hireDefaultStaff(f); f.season.day = 5;
  const qs = F.mediaQuestions(f); assert.equal(qs.length, 3);
  const before = F.playerTeam(f);
  const t = qs[0].a[0].t;
  F.answerMedia(f, [0, 0, 0]); assert.equal(f.season.day, 6);
  const after = F.playerTeam(f);
  const m = f.roster.find((x) => temperamentOf(x.nature) === t && Object.values(after.offense).concat(Object.values(after.defense)).some((p) => p.id === x.id));
  if (m) { const slotOf = (team) => [...Object.values(team.offense), ...Object.values(team.defense)].find((p) => p.id === m.id); assert.ok(slotOf(after).attrs.awareness >= slotOf(before).attrs.awareness); }
});

test('auto-run takes a Monday franchise to Sunday with a legal plan and lineup', () => {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 66 });
  F.hireDefaultStaff(f);
  const r = F.autoRunToSunday(f);
  assert.equal(f.season.day, 6); assert.ok(r.did.length >= 5);
  assert.equal(f.week.plan.offense.length, F.PLAN_SIZE); assert.ok(F.sundayMatchup(f)); assert.ok(f.week.media);
});

test('award races: league-wide stats accumulate and every award has contenders after a few weeks', () => {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 77 });
  F.hireDefaultStaff(f);
  for (let w = 0; w < 3; w++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else F.finishSunday(f, F.simulatePlayerGame(f)); }
  const r = F.awardRaces(f);
  for (const k of ['mvp', 'opoy', 'dpoy', 'coy']) assert.ok(r[k].length === 3, `${k} has three contenders`);
  assert.ok(r.oroy.length >= 1 && r.droy.length >= 1);
  assert.ok(Object.keys(f.season.leagueStats).length >= 14, 'most clubs have stats');
  assert.ok(r.opoy[0].score > 0 && r.dpoy[0].score > 0);
});

test('training and media boosts reach the Sunday lineup (not just the UI)', () => {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 88 });
  F.hireDefaultStaff(f);
  const qb = (m) => (m.playerSide === 'home' ? m.home : m.away).offense.QB;
  const base = qb(F.sundayMatchup(f)).attrs.accuracy;
  f.week.trainingFocus = 'passing'; f.week.trainingFactor = 1.6; f.week.training = { amount: 8 };
  const m2 = F.sundayMatchup(f); const mine = m2.playerSide === 'home' ? m2.home : m2.away;
  assert.ok(qb(m2).attrs.accuracy > base, 'training boost applied to the QB on Sunday');
  assert.ok(Object.values(mine.boosts).every((b) => b.training?.includes('accuracy')), 'ledger marks every starter');
  f.season.day = 5; const qs = F.mediaQuestions(f); F.answerMedia(f, qs.map(() => 0));
  const m3 = F.sundayMatchup(f); const mine3 = m3.playerSide === 'home' ? m3.home : m3.away;
  assert.ok(Object.values(mine3.boosts).some((b) => b.media), 'media boosts marked on some starters');
});

test('AI scouting: a rematch opponent swaps in counters to the plays we leaned on', async () => {
  const { adaptPlaybook } = await import('../src/franchise/roster.js');
  const base = { offense: ['inside_zone', 'power_right', 'quick_slants', 'stick', 'smash', 'te_seam'], defense: ['cover_2_man', 'cover_3', 'cover_4', 'zone_blitz', 'run_wall', 'goal_line'] };
  const profile = { games: 1, passRate: 0.8, offense: { three_verticals: 10, deep_post: 8, dagger: 6 }, defense: { cover_0: 12, all_out: 8 }, rematch: true };
  const a = adaptPlaybook(123, base, profile);
  assert.equal(a.offense.length, 6); assert.equal(a.defense.length, 6);
  assert.ok(a.notes.length >= 2, 'at least two swaps');
  assert.ok(a.defense.includes('cover_4') || a.defense.includes('prevent') || a.notes.some((n) => n.side === 'defense'), 'defense answers the deep passing');
  assert.ok(a.offense.includes('rb_screen') || a.offense.includes('quick_slants'), 'offense punishes Cover 0 / All-Out');
  // The franchise records our calls and feeds them to the next opponent.
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 99 });
  F.hireDefaultStaff(f); assert.equal(F.playerProfile(f), null);
  F.autoRunToSunday(f); F.finishSunday(f, F.simulatePlayerGame(f));
  const p = F.playerProfile(f); assert.ok(p && p.games === 1 && Object.keys(p.offense).length > 0);
});

test('Thursday scouting shows exactly the six plays the opponent brings on Sunday (after it has prepared)', () => {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 101 });
  F.hireDefaultStaff(f);
  for (let w = 0; w < 2; w++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else F.finishSunday(f, F.simulatePlayerGame(f)); }
  while (f.season.day < 3) { if (f.season.day === 0) F.scoutRegion(f, 'Coral Coast'); else if (f.season.day === 1) F.skipRecruit(f); else F.setTraining(f, 'passing'); }
  if (!F.opponentName(f)) return;
  const r = F.scoutOpponent(f, 'defense');
  const m = F.sundayMatchup(f); const theirs = m.playerSide === 'home' ? m.away : m.home;
  assert.deepEqual([...r.report.plays].sort(), [...theirs.defensePlays].sort());
});
