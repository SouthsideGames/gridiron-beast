import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import { teamSchedule, leagueSeasonFixtures, standings, blankRecord, applyResult, ALL_TEAMS } from '../src/data/league.js';
import { STAFF_ROLES } from '../src/data/staff.js';
import { ROSTER_MAX } from '../src/data/monsters.js';
import { exportJson, importJson, importLegacy, legacySummary } from '../src/franchise/save.js';
import { monsterOverall } from '../src/data/monsters.js';
import * as awaitRules from '../src/sim/rules.js';

/** Hold the draft (passing every pick) so a test can start the next season. */
function holdDraft(f) { for (const i of F.offseasonPending(f)) F.resolveContract(f, i.id, 'sign'); const b = F.beginDraft(f); if (!b.ok) return b; let guard = 0; while (!f.draft.done && guard++ < 60) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; } return { ok: f.draft.done }; }
/** Step one in-season day with the staff's defaults, draft window included. */
function stepDay(f) {
  const d = f.season.day;
  if (F.draftWindow(f)) { if (d === 0) return F.scoutDraft(f); if (d === 1) return F.recoveryDay(f); }
  if (d === 0) return F.scoutRegion(f, 'Coral Coast'); if (d === 1) return F.skipRecruit(f); if (d === 2) return F.setTraining(f, 'coverage'); if (d === 3) return F.scoutOpponent(f, 'defense'); if (d === 4) return F.setGamePlan(f, F.catalog(f, 'offense').slice(0, 6), F.catalog(f, 'defense').slice(0, 6)); if (d === 5) return F.lineupCheck(f);
  return null;
}
function newFranchise(seed = 7) {
  const f = F.createFranchise({ owner: { first: 'Sam', last: 'Rivera', gender: 'Female', portrait: 1, hometown: 'Ember City' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed });
  for (const id of ['hc_vale', 'oc_park', 'dc_ice', 'sc_moss', 'tr_focus']) assert.equal(F.hireStaff(f, id).ok, true, id);
  return f;
}

test('schedule generator matches the golden vectors (campaign schedule)', () => {
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
  assert.equal(f.roster.length, 28);
  assert.ok(f.roster.some((m) => m.cornerstone && m.name === 'Zappard' && m.species === 'voltfang')); // old cornerstone names still resolve
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
  if (signed) assert.equal(f.roster.length, 29);
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
    if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); continue; } // eliminated: skip the bracket
    if (f.season.day < 6) stepDay(f);
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
  assert.ok(f.roster.some((m) => (m.stats.career.reg.games || 0) > 0), 'career games recorded');
  const ev = F.postseasonEvent(f);
  if (ev) { assert.ok(F.record(f).w < F.record(f).l, 'an event only after a losing record'); assert.equal(F.startNextSeason(f).ok, false, 'the event gates the next season'); assert.equal(F.resolvePostseason(f, ev.options[0].id).ok, true); }
  else assert.ok(F.record(f).w >= F.record(f).l, 'no event after a winning season');
  holdDraft(f); const next = F.startNextSeason(f); assert.equal(next.ok, true, next.reason); assert.equal(f.season.year, 2); assert.equal(f.season.week, 1);
});

test('postseason events: a losing record raises one; each option has its consequence; roster fit and severance exist', () => {
  const f = newFranchise(21);
  const fit = F.rosterFit(f); assert.ok(fit.offense.total >= 5 && fit.defense.total >= 5 && fit.offense.coach);
  // Fake a losing season end: 3–6, then run the real end-of-season path by finishing the schedule quickly.
  while (!f.season.finished) { if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); continue; } F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; } const g = F.simulatePlayerGame(f); const side = F.sundayMatchup(f).playerSide; const other = side === 'home' ? 'away' : 'home'; const score = { home: 0, away: 0 }; score[other] = 21; F.finishSunday(f, { ...g, winner: other, score }); }
  assert.ok(F.record(f).l > F.record(f).w);
  const ev = F.postseasonEvent(f); assert.ok(ev, 'event raised'); assert.ok(ev.lines[0].length > 20);
  assert.ok(!ev.options.find((o) => o.id === 'talk'), 'no free option on Pro');
  const star = f.roster.find((m) => m.id === f.postseason.starId);
  if (ev.kind === 'star_out') { const before = star.salary; assert.equal(F.resolvePostseason(f, 'raise').ok, true); assert.ok(star.salary > before); }
  else if (ev.kind === 'coordinator_offer') { assert.equal(F.resolvePostseason(f, 'bonus').ok, true); assert.ok(f.pendingDeadCap > 0); }
  else { assert.equal(F.resolvePostseason(f, 'fire').ok, true); assert.ok(f.pendingDeadCap > 0); }
  assert.equal(F.resolvePostseason(f, 'raise').ok, false, 'resolved once');
  holdDraft(f); { const sn = F.startNextSeason(f); assert.equal(sn.ok, true, sn.reason); }
  if (f.pendingDeadCap === 0 && f.deadCap > 0) assert.ok(F.salarySummary(f).dead > 0, 'offseason bonuses land on the new season');
  // Mid-season firing leaves severance on the books.
  const oc = f.staff.offensive_coordinator; const cand = ['oc_swift', 'oc_brock', 'oc_park'].find((id) => id !== oc);
  const r = F.replaceStaff(f, cand);
  if (r.ok) { assert.ok(r.severance > 0); assert.ok(F.salarySummary(f).dead >= r.severance); } else assert.match(r.reason, /cap/i, 'only the cap may refuse a hire');
});

test('economy: cap, release rules and roster limits', () => {
  const f = newFranchise(5);
  const before = f.roster.length;
  const k = f.roster.find((m) => m.position === 'K');
  const kickers = f.roster.filter((m) => m.position === 'K'); if (kickers.length > 1) assert.equal(F.releaseMonster(f, kickers[1].id).ok, true, 'a spare kicker may go');
  assert.equal(F.releaseMonster(f, k.id).ok, false, 'cannot release the only kicker');
  const wr = f.roster.filter((m) => m.position === 'WR').sort((a, b) => monsterOverall(a) - monsterOverall(b))[0];
  assert.equal(F.releaseMonster(f, wr.id).ok, true); assert.equal(f.roster.length, before - 2);
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
  assert.ok(imported.roster.some((m) => m.name === 'Pyronix' && m.position === 'QB'));
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

test('media day: 250 nature questions (ten per nature), answers lift the monsters who share that nature, no repeats in a season', async () => {
  const M = await import('../src/data/media.js'); const { NATURE_IDS, NATURES } = await import('../src/data/monsters.js');
  for (const n of NATURE_IDS) assert.equal(M.questionCount(n), 10, `${n} has ten questions`);
  for (const q of M.QUESTIONS) { assert.equal(q.a.length, 3); for (const a of q.a) assert.ok(NATURE_IDS.includes(a.t), `${a.t} is a nature`); if (!M.isSituational(q)) assert.equal(q.a[0].t, q.nature, 'the first answer speaks the question’s own nature'); }
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 55 });
  F.hireDefaultStaff(f); f.season.day = 5;
  const qs = F.mediaQuestions(f); assert.equal(qs.length, 3);
  for (const q of qs) for (const a of q.a) { assert.ok(a.reach && typeof a.reach.total === 'number', 'every answer says how many monsters it reaches'); assert.ok(!/\{(opp|star|record|rival|club|week)\}/.test(a.text + q.q), 'placeholders are filled'); }
  const before = F.playerTeam(f);
  const t = qs[0].a[0].t;
  const r = F.answerMedia(f, [0, 0, 0]); assert.equal(f.season.day, 6); assert.equal(r.boosts[t], F.MEDIA_BOOST);
  const after = F.playerTeam(f);
  const onField = (team) => [...Object.values(team.offense), ...Object.values(team.defense)];
  const m = f.roster.find((x) => x.nature === t && onField(after).some((p) => p.id === x.id));
  if (m) { const slotOf = (team) => onField(team).find((p) => p.id === m.id); const up = NATURES[t].up || 'awareness'; assert.ok(slotOf(after).attrs[up] > slotOf(before).attrs[up], `${t} monster lifted on ${up}`); assert.equal(after.boosts[m.id].media.amount, F.MEDIA_BOOST); }
  const other = f.roster.find((x) => x.nature !== t && !qs.some((q) => q.a[0].t === x.nature) && onField(after).some((p) => p.id === x.id));
  if (other) assert.ok(!after.boosts[other.id]?.media, 'a nature nobody spoke for gets nothing');
  // Asked questions are not asked again this season; a rival week leads with the rival question.
  assert.deepEqual(f.season.mediaAsked, qs.map((q) => q.id));
  f.week.mediaQs = null; f.week.media = null; f.season.day = 5; const qs2 = F.mediaQuestions(f); assert.ok(!qs2.some((q) => qs.some((p) => p.id === q.id)), 'no repeats');
  const rivalIdx = M.QUESTIONS.findIndex((q) => q.rival); f.week.mediaQs = null; const sm = F.sundayMatchup(f); const save = f.season.schedule.find((g) => g.week === f.season.week); const wasOpp = save.opponent; save.opponent = f.rivals[f.tier].team; void sm;
  const qs3 = F.mediaQuestions(f); if (F.sundayMatchup(f)?.rival) assert.equal(qs3[0].id, rivalIdx, 'rival question first in a rival week'); save.opponent = wasOpp;
});

test('monster bio: birthplace, seasons pro, and a stint per club (regional league before the first known club; drafted rookies carry their pick)', () => {
  const f = newFranchise(5);
  const vet = f.roster.find((m) => m.yearsPro >= 3); const b = F.monsterBio(f, vet);
  assert.ok(b.birthplace && b.stints.at(-1).current && b.stints.at(-1).club === f.club && b.stints.at(-1).from === 1);
  assert.ok(b.stints[0].regional && b.stints[0].to - b.stints[0].from + 1 === vet.yearsPro, 'seasons before the club are the regional league');
  const d = f.draft; const pick = d.class.find((m) => d.available.includes(m.id)); assert.equal(F.myDraftPick(f, pick.id).ok, true);
  assert.equal(pick.drafted.club, f.club); assert.ok(pick.drafted.overall >= 1 && pick.drafted.round === 1);
  const rb = F.monsterBio(f, pick); assert.ok(rb.rookie && rb.stints.length === 1 && rb.stints[0].current);
  // A monster that walked to the pool and is signed back shows both stints.
  const left = f.roster.find((m) => m.yearsPro === 0 && m !== pick) || f.roster[3]; left.history = [{ club: f.club, from: 1, to: 2, reason: 'walked' }, { club: 'Harbor Sentinels', from: 3, to: null, reason: 'signed' }]; left.joined = 5; f.season.year = 5;
  const lb = F.monsterBio(f, left); assert.deepEqual(lb.stints.map((s) => s.club), [f.club, 'Harbor Sentinels', f.club]);
});

test('commissioner welcome: six beats, names the lottery pick and the board, ends ominous', () => {
  const f = newFranchise(5); const beats = F.commissionerWelcome(f);
  assert.equal(beats.length, 6); assert.ok(beats[2].text.includes(`#${f.draft.lotterySlot} pick`)); assert.ok(/the league’s/.test(beats[3].text));
  assert.ok(beats[4].ominous && /I answer to the Board/.test(beats[4].text) && beats.at(-1).ominous && /never seen a face/.test(beats.at(-1).text)); assert.ok(!beats.some((b) => /undefined|NaN/.test(b.text)));
});

test('draft-pick trading: picks change hands and the order follows; a veteran arrives and leaves the AI club; two asks per pick; protected monsters never offered; closed mid-season', async () => {
  const T = await import('../src/franchise/trades.js');
  const f = newFranchise(3); // creation draft: on the clock
  const mine = F.myTradablePicks(f);
  assert.equal(mine.filter((p) => p.year === 1).length, 3); assert.equal(mine.length, 12, 'this class plus three ahead');
  assert.ok(mine.find((p) => p.onClock)?.round === 1);
  // Picks for picks: my 1R3 for next class's R2 (exact or a counter), accept the first offer.
  const r3 = mine.find((p) => p.year === 1 && p.round === 3);
  const r = F.tradeAskPicks(f, { give: [r3], year: 2, round: 2, count: 1 }); assert.equal(r.ok, true); assert.ok(r.offers.length >= 1, 'somebody answers a picks ask');
  const offer = r.offers[0]; const acc = F.acceptTrade(f, offer); assert.equal(acc.ok, true);
  assert.equal(T.pickOwner(f, r3), offer.team, 'my R3 now belongs to them');
  for (const p of offer.get.picks) assert.equal(T.pickOwner(f, p), f.club);
  const slot = f.draft.order.find((o) => o.round === 3 && o.original === f.club); assert.equal(slot.team, offer.team, 'the draft order follows the trade');
  assert.ok(!F.myTradablePicks(f).some((p) => T.samePick(p, r3)));
  // Player ask with the pick on the clock: the lead pick spends an ask; an accepted veteran joins and leaves the AI roster.
  const lead = F.myTradablePicks(f).find((p) => p.onClock); const rosterBefore = f.roster.length;
  let got = null;
  for (const pos of ['S', 'LB', 'CB', 'OL', 'DL', 'WR']) { const a = F.tradeAskPlayer(f, { give: [lead], position: pos }); if (!a.ok) break; if (a.offers.length) { got = { a, pos }; break; } }
  if (got) {
    for (const o of got.a.offers) { const m = o.get.player; assert.ok(!m.legendary && !m.signature && !m.rookie && !m.drafted, 'protected monsters are never offered'); assert.equal(m.position, got.pos); }
    const o = got.a.offers[0]; const before = F.aiTeam(f, o.team).roster.some((m) => m.id === o.get.player.id); assert.ok(before);
    const acc2 = F.acceptTrade(f, o); assert.equal(acc2.ok, true);
    assert.equal(f.roster.length, rosterBefore + 1); const m = f.roster.find((x) => x.id === o.get.player.id); assert.ok(m.contract && m.history.at(-1).reason === 'traded' && m.traded.from === o.team);
    assert.ok(!F.aiTeam(f, o.team).roster.some((x) => x.id === o.get.player.id), 'gone from the AI club');
    assert.ok(F.onTheClock(f) !== f.club || f.draft.index > 0, 'the pick that went out was used by its new holder');
  }
  // Asks are limited to two per pick.
  const spare = F.myTradablePicks(f).find((p) => p.year === 3); F.tradeAskPicks(f, { give: [spare], year: 4, round: 3 }); F.tradeAskPicks(f, { give: [spare], year: 4, round: 3 });
  assert.equal(F.tradeAskPicks(f, { give: [spare], year: 4, round: 3 }).ok, false, 'third ask refused');
  // Mid-season the phone is off.
  while (f.draft && !f.draft.done) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  assert.equal(F.tradeAskPlayer(f, { give: [F.myTradablePicks(f)[0]], position: 'S' }).ok, false);
  // Value sanity: a pick this year is worth about a round more than the same round next year.
  assert.ok(T.pickValue({ year: 2, round: 1 }, { yearsAhead: 1 }) < T.pickValue({ year: 1, round: 1 }) && T.pickValue({ year: 2, round: 1 }, { yearsAhead: 1 }) > T.pickValue({ year: 1, round: 3 }));
});

test('traded future picks are honored when that draft comes', async () => {
  const T = await import('../src/franchise/trades.js');
  const f = newFranchise(9); while (f.draft && !f.draft.done) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  // Hand my season-2 class R1 to a club directly (ownership table), then play to that draft.
  const other = 'Bayou Stalkers' === f.club ? 'Harbor Sentinels' : 'Bayou Stalkers';
  T.setPickOwner(f, { year: 2, round: 1, original: f.club }, other); T.setPickOwner(f, { year: 2, round: 2, original: other }, f.club);
  let guard = 0; while (!f.season.finished && guard++ < 80) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) { const m = F.sundayMatchup(f); if (m?.forfeit) F.forfeitSunday(f); else F.finishSunday(f, F.simulatePlayerGame(f)); } else F.skipPlayoffs(f); }
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id);
  if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  for (const i of F.offseasonPending(f)) F.resolveContract(f, i.id, 'sign');
  const b = F.beginDraft(f); assert.equal(b.ok, true);
  const mineR1 = f.draft.order.find((o) => o.round === 1 && o.original === f.club); assert.equal(mineR1.team, other, 'my R1 is theirs');
  const theirR2 = f.draft.order.find((o) => o.round === 2 && o.original === other); assert.equal(theirR2.team, f.club, 'their R2 is mine');
  assert.equal(f.draft.order.filter((o) => o.team === f.club).length, 3);
});

test('victory formation: a kneel with the clock running, no defensive timeouts and under 30 s ends the game', async () => {
  const R = await import('../src/sim/rules.js');
  const s = R.newGame({ home: { id: 'A', name: 'A', abbr: 'A' }, away: { id: 'B', name: 'B', abbr: 'B' }, quarterLength: 180 });
  s.phase = 'scrimmage'; s.quarter = 4; s.clock = 23; s.possession = 'home'; s.down = 1; s.toGo = 10; s.ballOn = 60; s.clockRunning = true; s.timeouts.away = 0; s.score = { home: 16, away: 3 };
  R.kneel(s); assert.equal(s.clock, 0); assert.ok(s.finished, 'the game is over'); assert.ok(/runs out/.test(s.lastPlay.text));
  const t = R.newGame({ home: { id: 'A', name: 'A', abbr: 'A' }, away: { id: 'B', name: 'B', abbr: 'B' }, quarterLength: 180 });
  t.phase = 'scrimmage'; t.quarter = 4; t.clock = 23; t.possession = 'home'; t.down = 1; t.toGo = 10; t.ballOn = 60; t.clockRunning = true; t.timeouts.away = 1;
  R.kneel(t); assert.equal(t.clock, 20); assert.ok(!t.finished, 'with a timeout left the defense can still stop it');
});

test('founding roster: about a third are on one-year deals (never a cornerstone), spread across positions', () => {
  const f = newFranchise(7);
  const oneYear = f.roster.filter((m) => m.contract.ends === 1); const share = oneYear.length / f.roster.length;
  assert.ok(share >= 0.3 && share <= 0.4, `one-year share ${share.toFixed(2)}`);
  assert.ok(!oneYear.some((m) => m.cornerstone));
  assert.ok(new Set(oneYear.map((m) => m.position)).size >= 4, 'not all at one position');
  assert.ok(f.roster.filter((m) => m.contract.ends === 2).length > oneYear.length);
});

test('notices and manual evolution: a monster at its evolution level is a roster notice; Evolve is by hand and does not reprice the contract', async () => {
  const M = await import('../src/data/monsters.js');
  const f = newFranchise(7); while (f.draft && !f.draft.done) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  const m = f.roster.find((x) => M.resolveSpecies(x).evolution.length); assert.ok(m);
  const level = M.resolveSpecies(m).evolution[0].level; m.level = level - 1;
  assert.equal(F.evolveMonster(f, m.id).ok, false, 'not yet'); assert.ok(!F.notices(f).some((n) => n.kind === 'evolve' && n.id === m.id));
  m.level = level; const sal = m.salary;
  assert.ok(F.notices(f).some((n) => n.kind === 'evolve' && n.id === m.id), 'ready = notice'); assert.ok(F.noticesFor(f, 'roster').length >= 1);
  const pref = M.schemePreferences(m); assert.ok(pref && pref.schemes.length >= 2 && pref.best, 'scheme preferences list every scheme on the side');
  const r = F.evolveMonster(f, m.id); assert.equal(r.ok, true); assert.equal(m.stage, 1); assert.equal(m.salary, sal, 'evolution does not change the contract');
  assert.ok(!F.notices(f).some((n) => n.kind === 'evolve' && n.id === m.id), 'notice clears');
});

test('best lineup: every position ordered by overall, manual picks cleared, starters are the best healthy monsters', async () => {
  const { buildDepthChart } = await import('../src/franchise/roster.js'); const { monsterOverall } = await import('../src/data/monsters.js');
  const f = newFranchise(5); const qbs = f.roster.filter((m) => m.position === 'QB').sort((a, b) => monsterOverall(a) - monsterOverall(b));
  F.moveDepth(f, 'QB', qbs[0].id, -1); f.lineupManual.QB = qbs[0].id; // the worst QB pushed to the top
  F.autoDepth(f); assert.deepEqual(f.lineupManual, {});
  for (const [g, ids] of Object.entries(f.depth)) { const o = ids.map((id) => monsterOverall(f.roster.find((m) => m.id === id))); assert.deepEqual(o, o.slice().sort((a, b) => b - a), `${g} ordered by OVR`); }
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const best = f.roster.filter((m) => m.position === 'QB' && !m.injury).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0]; assert.equal(chart.QB, best.id);
});

test('awards: a quarterback\'s kneel-downs no longer drag his efficiency (roles weighted by volume); the playtest case ranks the QB first', async () => {
  const A = await import('../src/franchise/awards.js');
  // A league of 16 QBs and 16 RBs; ours throws 205 times at 11.1 yds/att and also has 13 kneels/scrambles for 30 yards.
  const table = {}; const records = {};
  for (let i = 0; i < 16; i++) {
    const team = `T${i}`; records[team] = { w: 4 + (i % 4), l: 5 - (i % 4) };
    table[team] = { qb: { id: `q${i}`, name: `QB${i}`, team, position: 'QB', games: 9, snapsOff: 220, att: 180, comp: 110, passYds: 1300 + i * 30, passTd: 10 + (i % 5), intThrown: 4, passFd: 60, rush: 2, rushYds: 6 },
      rb: { id: `r${i}`, name: `RB${i}`, team, position: 'RB', games: 9, snapsOff: 200, rush: 100, rushYds: 420 + i * 10, rushTd: 4, rec: 15, targets: 20, recYds: 120, recTd: 1, rushFd: 20, recFd: 6 } };
  }
  Object.assign(table.T0.qb, { att: 205, comp: 141, passYds: 2273, passTd: 23, intThrown: 3, passFd: 95, rush: 13, rushYds: 30 }); records.T0 = { w: 7, l: 2 };
  Object.assign(table.T1.rb, { rush: 91, rushYds: 608, rushTd: 10, rec: 32, targets: 40, recYds: 689, recTd: 12, rushFd: 30, recFd: 28 }); records.T1 = { w: 9, l: 0 };
  const aw = A.computeAwards({ table, records, n: 5 });
  const qb = aw.mvp.find((r) => r.name === 'QB0'); assert.ok(qb, 'QB in the MVP race'); assert.ok(qb.components.efficiency > 0.5, `QB efficiency is high (${qb.components.efficiency})`);
  assert.equal(aw.mvp[0].name, 'QB0', 'the elite QB on a 7-2 club beats the 9-0 back');
  assert.ok(aw.mvp.slice(0, 3).some((r) => r.name === 'RB1'), 'the back is still a finalist');
});

test('achievements: earned once, queue a filled-in cutscene, listed in the office', () => {
  const f = newFranchise(21); while (f.draft && !f.draft.done) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  f.campaign.titles = 1;
  const got = F.checkAchievements(f, 'season', { champion: true, wins: 7, losses: 2 });
  assert.ok(got.includes('first_title') && got.includes('winning_season'));
  assert.deepEqual(F.checkAchievements(f, 'season', { champion: true, wins: 7, losses: 2 }), [], 'never twice');
  const sc = F.nextScene(f); assert.ok(sc && sc.beats.length >= 2); assert.ok(!sc.beats.some((b) => /\{\w+\}/.test(b)), 'placeholders filled');
  const board = [sc, ...[]].find((x) => x.speaker === 'board') || (F.dismissScene(f), F.nextScene(f)); void board;
  const list = F.achievementList(f); assert.equal(list.length, F.ACHIEVEMENT_COUNT); assert.equal(list.filter((a) => a.earned).length, 2);
  while (F.nextScene(f)) F.dismissScene(f); assert.equal(f.scenes.length, 0);
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
  for (const k of ['mvp', 'opoy', 'dpoy']) assert.ok(r[k][0].why && r[k][0].record, `${k} finalist carries an explanation and a record`);
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

test('difficulty is chosen at creation, carried in the save and exposed with Hall of Fame goals', () => {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Zappard', cornerstoneDefense: 'Cryolynx', seed: 5, settings: { difficulty: 'allstar' } });
  assert.equal(f.settings.difficulty, 'allstar');
  assert.deepEqual(F.difficultyOf(f).hofGoals, { badges: 8, titles: 4, wins: 80, awards: 5 });
  assert.equal(F.difficultyOf({ settings: {} }).label, 'Pro');
});

test('campaign: an ordinary club meets four gyms a season (all eight over two), never in week 1, alternating with ordinary games; gym clubs field their legendary and lean to their element', async () => {
  const { GYM_CLUBS, GYM_BY_CLUB } = await import('../src/data/gyms.js');
  const { SPECIES_BY_ID } = await import('../src/data/monsters.js');
  for (const y of [1, 2, 7]) for (const t of ALL_TEAMS) {
    const sched = teamSchedule(y, t).filter((g) => !g.bye); const opps = sched.map((g) => g.opponent);
    assert.equal(new Set(opps).size, 9, `${t} plays nine different clubs`);
    if (!GYM_CLUBS.includes(t)) {
      assert.equal(opps.filter((o) => GYM_CLUBS.includes(o)).length, 4, `${t} meets four gyms in season ${y}`);
      assert.ok(!GYM_CLUBS.includes(opps[0]), `${t}: week 1 is never a badge game`);
      for (let i = 1; i < opps.length; i++) assert.ok(!(GYM_CLUBS.includes(opps[i]) && GYM_CLUBS.includes(opps[i - 1])), `${t}: no back-to-back badge games`);
      const both = new Set([...opps, ...teamSchedule(y + 1, t).filter((g) => !g.bye).map((g) => g.opponent)].filter((o) => GYM_CLUBS.includes(o)));
      assert.equal(both.size, 8, `${t} meets every gym across seasons ${y} and ${y + 1}`);
    }
  }
  const f = newFranchise(3);
  for (const club of GYM_CLUBS) {
    const g = GYM_BY_CLUB[club]; const team = F.aiTeam(f, club);
    const leg = team.roster.find((m) => m.species === g.legendary);
    assert.ok(leg && leg.legendary, `${club} carries ${g.legendary}`);
    assert.ok(Object.values(team.chart).includes(leg.id), 'the legendary starts');
    const share = team.roster.filter((m) => SPECIES_BY_ID[m.species].element === g.element).length / team.roster.length;
    assert.ok(share >= 0.4, `${club} leans ${g.element} (${Math.round(share * 100)}%)`);
    assert.ok(F.clubQuality(f, club, 3) > F.clubQuality(f, club, 1), 'gym clubs grow by season');
  }
  // One legendary in the league: no other club rolls one.
  for (const t of ALL_TEAMS.filter((x) => !GYM_CLUBS.includes(x) && x !== f.club)) assert.ok(F.aiTeam(f, t).roster.every((m) => SPECIES_BY_ID[m.species].rarity !== 'legendary'), t);
});

test('campaign: beating a gym club earns its badge once; Hall of Fame progress reads the difficulty goals', () => {
  const f = newFranchise(4);
  const gymWeek = f.season.schedule.find((g) => !g.bye && ['Harbor Sentinels', 'Sunfire Lions', 'Thunder Mesa', 'Canyon Crushers', 'Eastport Phantoms', 'Frostpeak Howlers', 'Ironpeak Rams', 'Palmetto Vipers'].includes(g.opponent));
  assert.ok(gymWeek);
  while (f.season.week < gymWeek.week) { F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; } const g = F.simulatePlayerGame(f); F.finishSunday(f, g); }
  F.autoRunToSunday(f);
  const m = F.sundayMatchup(f); const side = m.playerSide;
  const score = { home: 0, away: 0 }; score[side] = 21;
  F.finishSunday(f, { winner: side, score, stats: { home: { players: {} }, away: { players: {} } }, ot: false });
  assert.ok(f.campaign.badges[gymWeek.opponent], 'badge earned');
  assert.equal(f.campaign.wins >= 1, true);
  const p = F.hallOfFameProgress(f);
  assert.equal(p.rows.find((r) => r.key === 'badges').have, 1);
  assert.equal(p.rows.find((r) => r.key === 'titles').goal, 2);
  assert.equal(p.eligible, false);
});

test('campaign: the other coach speaks before the game and remembers the result', () => {
  const f = newFranchise(8);
  F.autoRunToSunday(f);
  const t1 = F.pregameTalk(f);
  assert.ok(t1 && t1.lines.length >= 1 && t1.lines.length <= 3);
  assert.equal(t1.kind, t1.kind === 'rival' ? 'rival' : 'ordinary', 'week 1 is an ordinary club (or the rival), never a gym'); assert.equal(t1.state, t1.kind === 'rival' ? 'first' : 'generic');
  if (t1.kind === 'ordinary') { assert.equal(t1.replies, false); }
  // Week 2 is a badge game: the gym coach speaks and a reply is allowed.
  { const g = F.simulatePlayerGame(f); F.finishSunday(f, g); F.autoRunToSunday(f); }
  const t2 = F.pregameTalk(f); assert.equal(t2.kind, 'gym'); assert.equal(t2.state, 'first');
  assert.equal(F.replyToCoach(f, 'confident').ok, true);
  assert.equal(F.replyToCoach(f, 'respectful').ok, false, 'one reply per game');
  const team = F.playerTeam(f);
  assert.ok(Object.values(team.boosts).some((b) => b.media?.amount >= 1), 'the reply boosts the physical natures');
  const m = F.sundayMatchup(f); const side = m.playerSide; const other = side === 'home' ? 'away' : 'home';
  const score = { home: 0, away: 0 }; score[other] = 14;
  F.finishSunday(f, { winner: other, score, stats: { home: { players: {} }, away: { players: {} } }, ot: false });
  assert.equal(f.rattled, true, 'confident talk before a loss rattles the room');
  assert.equal(f.campaign.h2h[m.opponent].last, 'l');
});

test('commissioner: signing over the cap is allowed with a warning; Saturday names the cheapest monsters that each get you under; releasing one clears it', () => {
  const f = newFranchise(12);
  // Push the club over the cap with an expensive signing.
  const cap = F.salarySummary(f);
  const star = { ...f.roster[0], id: 'm_big', name: 'Big Signing', salary: cap.remaining + 40000, cornerstone: false };
  f.roster.push(star);
  assert.ok(F.salarySummary(f).over);
  assert.equal(F.canPlayGames(f), true, 'the cap alone does not lock games');
  F.autoRunToSunday(f);
  assert.ok(f.week.commissioner, 'Saturday review pending');
  assert.equal(F.canPlayGames(f), false);
  const over = f.week.commissioner.over;
  const named = f.week.commissioner.names.map((id) => f.roster.find((m) => m.id === id));
  assert.equal(named.length, 3);
  for (const m of named) assert.ok(m.salary >= over, 'each named monster alone brings the club under');
  const cheapestEnough = f.roster.filter((m) => m.salary >= over).sort((a, b) => a.salary - b.salary)[0];
  assert.ok(named.some((m) => m.id === cheapestEnough.id), 'the cheapest sufficient monster is named');
  assert.equal(F.commissionerRelease(f, f.roster.find((m) => !f.week.commissioner.names.includes(m.id)).id).ok, false, 'only named monsters');
  const r = F.commissionerRelease(f, named[0].id);
  assert.equal(r.ok && r.done, true);
  assert.equal(f.week.commissioner, null);
  assert.equal(F.canPlayGames(f), true);
  assert.equal(f.campaign.commissionerReleases, 1);
});

test('Legend Tracks: a champion chooses a track; three unlock the legendary in its home region; the rival keeps a signature monster', () => {
  const f = newFranchise(31);
  f.campaign.badges['Harbor Sentinels'] = { year: 1, week: 1, score: '1–0' };
  const choices = F.legendChoices(f).map((c) => c.id);
  assert.deepEqual(choices.slice(0, 4), ['pyroclast', 'elderoot', 'tempestra', 'astralux']);
  assert.ok(choices.includes('tsunarok'), 'a held badge opens that gym legendary');
  assert.ok(!choices.includes('aurodrax'));
  assert.equal(F.chooseLegendTrack(f, 'pyroclast').ok, false, 'only after a title');
  for (let i = 1; i <= 3; i++) { f.legendPick = { year: i, resolved: false }; const r = F.chooseLegendTrack(f, 'pyroclast'); assert.equal(r.ok, true); assert.equal(r.unlocked, i === 3); }
  assert.ok(f.campaign.unlocked.pyroclast);
  assert.ok(!F.legendChoices(f).some((c) => c.id === 'pyroclast'), 'unlocked legendaries leave the choice list');
  // Unlocked: scoutable in its home region (Volcanic Fields) and nowhere else.
  let found = 0, elsewhere = 0;
  for (let i = 0; i < 40; i++) {
    const g = newFranchise(100 + i); g.campaign.unlocked = { pyroclast: true }; g.staff.head_scout = 'sc_ash';
    const r = F.scoutRegion(g, i % 2 ? 'Volcanic Fields' : 'Coral Coast');
    for (const p of r.prospects) if (p.monster.species === 'pyroclast') { if (i % 2) found++; else elsewhere++; }
  }
  assert.ok(found >= 20, `an unlocked legendary turns up the first time its home region is scouted each season (${found})`); assert.equal(elsewhere, 0);
  // Rival signature monster: same species each season, stronger later.
  const rival = f.rivals[f.tier].team;
  const t1 = F.aiTeam(f, rival); const sig1 = t1.roster.find((m) => m.signature); assert.ok(sig1);
  f.season.year = 3; const t3 = F.aiTeam(f, rival); const sig3 = t3.roster.find((m) => m.signature);
  assert.equal(sig1.species, sig3.species); assert.ok(sig3.level > sig1.level, 'the signature monster grows with the seasons');
  // Rematch scouting: a second meeting reveals one play from the other side.
  f.season.year = 1; f.campaign.h2h = { [F.opponentName(f)]: { w: 1, l: 0, last: 'w', streakL: 0 } };
  while (f.season.day < 3) { if (f.season.day === 0) F.scoutRegion(f, 'Coral Coast'); else if (f.season.day === 1) F.skipRecruit(f); else F.setTraining(f, 'coverage'); }
  const rep = F.scoutOpponent(f, 'offense').report; assert.ok(rep.bonus && rep.bonus.side === 'defense' && rep.bonus.play);
});

test('Hall of Fame: eligibility follows the checklist; retiring writes a career card', async () => {
  const H = await import('../src/franchise/hall-of-fame.js');
  const f = newFranchise(41);
  assert.equal(F.retire(f).ok, false);
  assert.equal(F.hallOfFameNotice(f), false);
  for (const g of ['Harbor Sentinels', 'Sunfire Lions', 'Thunder Mesa', 'Canyon Crushers', 'Eastport Phantoms', 'Frostpeak Howlers', 'Ironpeak Rams', 'Palmetto Vipers']) f.campaign.badges[g] = { year: 1, week: 1, score: '1–0' };
  Object.assign(f.campaign, { titles: 2, wins: 50, awards: 3 });
  f.history.push({ year: 1, club: f.club, record: { w: 9, l: 0 }, place: 1, champion: f.club, playoffs: true });
  assert.equal(F.hallOfFameProgress(f).eligible, true);
  assert.equal(F.hallOfFameNotice(f), true); assert.equal(F.hallOfFameNotice(f), false, 'the commissioner calls once');
  const r = F.retire(f); assert.equal(r.ok, true);
  assert.equal(r.card.badges.length, 8); assert.equal(r.card.titles, 2); assert.equal(r.card.record.w, 9); assert.ok(r.card.bestMonsters.length === 5);
  H.resetHof(); H.addHofCard(r.card); assert.equal(H.hallOfFame().length, 1); H.addHofCard(r.card); assert.equal(H.hallOfFame().length, 1, 'no duplicates');
  H.mergeHof([{ ...r.card, id: 'other' }]); assert.equal(H.hallOfFame().length, 2); H.resetHof();
});

test('cornerstone offers: three monsters of different positions and elements, each with an ability; the pick leads the roster', async () => {
  const { cornerstoneOffers } = await import('../src/data/monsters.js');
  for (const seed of [1, 2, 3, 99]) {
    const o = cornerstoneOffers(seed);
    assert.equal(o.length, 3);
    assert.equal(new Set(o.map((x) => x.position)).size, 3); assert.equal(new Set(o.map((x) => x.type)).size, 3);
    for (const x of o) assert.ok(x.abilityName && x.quality >= 68);
    assert.deepEqual(cornerstoneOffers(seed).map((x) => x.name), o.map((x) => x.name), 'deterministic per seed');
  }
  const offer = cornerstoneOffers(5)[1];
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Stonehaven Titans', cornerstone: offer, seed: 5 });
  const star = f.roster.find((m) => m.cornerstone);
  assert.ok(star && star.species === offer.species && star.position === offer.position);
  assert.equal(f.roster.filter((m) => m.cornerstone).length, 1, 'one cornerstone, no hidden second one');
  assert.ok(monsterOverall(star) >= 64);
});

test('owner backgrounds carry a perk: cap, training odds, scouting reveal, analyst play', () => {
  const mk = (background) => F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 'custom|1|2|curls|headset|210', hometown: 'X', background }, club: 'Ember City Beasts', cornerstoneOffense: 'Zappard', cornerstoneDefense: 'Cryolynx', seed: 61 });
  const base = mk('player'), biz = mk('business');
  assert.ok(F.capFor(biz) > F.capFor(base));
  F.hireDefaultStaff(base); F.hireDefaultStaff(biz);
  assert.ok(F.trainingOdds(base, 'coverage').success > F.trainingOdds(biz, 'coverage').success);
  const sc = mk('scout'); F.hireDefaultStaff(sc); const r = F.scoutRegion(sc, 'Coral Coast'); const r2 = F.scoutRegion(F.hireDefaultStaff(biz) || biz, 'Coral Coast');
  assert.ok(r.prospects[0].revealed > r2.prospects[0].revealed);
  const an = mk('analyst'); F.hireDefaultStaff(an); F.scoutRegion(an, 'Coral Coast'); F.skipRecruit(an); F.setTraining(an, 'coverage');
  assert.ok(F.scoutOpponent(an, 'offense').report.bonus?.analyst, 'analyst sees an extra play from week 1');
});

test('playtest round 2: fatigue shows all week and recovers Saturday; bye weeks skip to rest; play stats tally; award races need games played', () => {
  const f = newFranchise(71);
  F.autoRunToSunday(f); const g = F.simulatePlayerGame(f); const r = F.finishSunday(f, g);
  assert.equal(r.newBadge, null, 'week 1 is not a badge game');
  const starters = f.roster.filter((m) => m.fatigue > 0);
  assert.ok(starters.length >= 10, `fatigue visible on Monday (${starters.length} tired)`);
  const before = Math.max(...f.roster.map((m) => m.fatigue));
  const healthy = f.roster.find((m) => !m.injury); const preMon = healthy.fatigue;
  while (f.season.day < 5) { if (f.season.day === 0) F.scoutRegion(f, 'Coral Coast'); else if (f.season.day === 1) F.skipRecruit(f); else if (f.season.day === 2) { F.setTraining(f, 'coverage', 'full'); assert.equal(f.week.training.fatigue, 14); } else if (f.season.day === 3) F.scoutOpponent(f, 'offense'); else F.setGamePlan(f, F.catalog(f, 'offense').slice(0, 6), F.catalog(f, 'defense').slice(0, 6)); }
  assert.ok(healthy.fatigue > preMon, 'practice adds fatigue');
  assert.ok(Math.max(...f.roster.map((m) => m.fatigue)) > before, 'still tired on Friday, more after full pads');
  F.lineupCheck(f);
  assert.ok(Math.max(...f.roster.map((m) => m.fatigue)) < before, 'Saturday recovery takes off the game and the practice');
  // Play stats from the first game.
  const used = Object.values(f.playStats[1]); assert.ok(used.length >= 4 && used.every((e) => e.used > 0));
  const some = Object.keys(f.playStats[1])[0]; assert.ok(F.playStat(f, some).avg !== null);
  // Award races: a one-game monster does not qualify once the league has played several weeks.
  f.season.leagueStats['Zed FC'] = { x1: { id: 'x1', name: 'OneGame', type: 'Fire', species: 'emberfox', position: 'QB', age: 25, yearsPro: 2, team: 'Zed FC', games: 1, snapsOff: 40, passYds: 400, passTd: 5, att: 20, comp: 18 } };
  for (const T of Object.values(f.season.leagueStats)) for (const p of Object.values(T)) if (p.id !== 'x1') p.games = Math.max(p.games || 0, 5);
  assert.ok(!F.awardRaces(f).mvp.some((p) => p.id === 'x1'), 'needs 60% of the weeks played');
  assert.equal(F.awardRaces(f, { n: 5 }).mvp.length <= 5, true);
  // Bye week: after Wednesday the week skips to Sunday.
  const bye = f.season.schedule.find((w) => w.bye).week;
  while (f.season.week < bye) { F.autoRunToSunday(f); const gg = F.simulatePlayerGame(f); F.finishSunday(f, gg); }
  assert.ok(F.isBye(f));
  F.scoutRegion(f, 'Coral Coast'); F.skipRecruit(f); F.setTraining(f, 'coverage');
  assert.equal(f.season.day, 6, 'bye week goes straight from Wednesday to the bye');
  assert.equal(F.scoutOpponent(f, 'offense').ok, false);
});

test('playtest round 3: comeback mode lifts the trailing side in the fourth on Pro/All-Star only; scheme lock needs every starter; a badge win is remembered', () => {
  const f = newFranchise(71);
  assert.deepEqual(F.comebackRule(f), { margin: 10, edge: 5 });
  const rookie = newFranchise(72); rookie.settings.difficulty = 'rookie'; assert.equal(F.comebackRule(rookie), null);
  const m = F.sundayMatchup(f); const R = awaitRules;
  const st = R.newGame({ home: m.home, away: m.away, seed: 1, comeback: F.comebackRule(f) });
  assert.equal(R.comebackSide(st), null, 'first quarter: nothing');
  st.quarter = 4; st.score.home = 3; st.score.away = 20;
  assert.equal(R.comebackSide(st), 'home', 'home trails by 17 in the fourth');
  st.possession = 'home'; let e = R.edgesFor(st, { home: m.home, away: m.away }); assert.equal(e.off, 5); assert.equal(e.def, 0);
  st.possession = 'away'; e = R.edgesFor(st, { home: m.home, away: m.away }); assert.equal(e.def, 5, 'the trailing defense gets it too');
  st.score.home = 12; assert.equal(R.comebackSide(st), null, 'inside the margin: off');
  st.score.home = 3; st.ot = { period: 1 }; assert.equal(R.comebackSide(st), null, 'never in overtime');
  // Scheme lock: zero unless every starter fits; when it is on the Sunday team carries it.
  const lock = F.schemeLock(f); const rf = F.rosterFit(f);
  assert.equal(lock.offense, rf.offense.fit === rf.offense.total && rf.offense.total > 0 ? 3 : 0); assert.equal(lock.defense, rf.defense.fit === rf.defense.total && rf.defense.total > 0 ? 3 : 0);
  const team = F.playerTeam(f); assert.equal(!!team.schemeLock, !!(lock.offense || lock.defense));
  st.ot = null; st.score.home = 20; st.possession = 'home'; e = R.edgesFor(st, { home: { ...m.home, schemeLock: { offense: 3, defense: 0 } }, away: m.away }); assert.equal(e.off, 3); assert.ok(e.why.off.includes('scheme'));
  // Badge memory for the HQ banner.
  f.campaign.badges = {}; f.season.schedule.find((g) => g.week === f.season.week).opponent = 'Harbor Sentinels';
  const g = F.simulatePlayerGame(f); const side = F.sundayMatchup(f).playerSide; g.score[side] = 40; g.score[side === 'home' ? 'away' : 'home'] = 0; g.winner = side;
  const r = F.finishSunday(f, g);
  assert.equal(r.newBadge, 'Harbor Sentinels'); assert.deepEqual(f.campaign.lastBadge, { club: 'Harbor Sentinels', year: 1, week: 1, n: 1 });
});

test('a roster that cannot staff a package slot still plays: the package borrows a healthy body, the lineup check passes, nobody is on the field twice', async () => {
  const { buildDepthChart, lineupProblems, borrowedSlots } = await import('../src/franchise/roster.js');
  const { pickSlots } = await import('../src/sim/rules.js');
  const f = newFranchise(71);
  const S = f.roster.filter((m) => m.position === 'S'); for (const m of S.slice(1)) f.roster = f.roster.filter((x) => x !== m);
  for (const m of f.roster.filter((m) => m.position === 'CB').slice(2)) m.injury = { severity: 'Minor', weeks: 2, type: 'ankle' };
  for (const m of f.roster.filter((m) => m.position === 'LB').slice(2)) m.injury = { severity: 'Minor', weeks: 1, type: 'knee' };
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
  assert.equal(chart.SS, null, 'no dedicated strong safety');
  assert.deepEqual(lineupProblems(f.roster, chart), [], 'a package slot never blocks the game');
  const b = borrowedSlots(f.roster, chart); assert.equal(b.length, 1); assert.equal(b[0].slot, 'SS'); assert.ok(['LB', 'CB', 'S'].includes(b[0].position), 'borrows someone who can cover');
  F.autoRunToSunday(f); assert.equal(F.lineupCheck(f, { advance: false }).ok, true);
  for (const m of f.roster.filter((m) => m.position === 'S').slice(1)) f.roster = f.roster.filter((x) => x !== m); // the staff may have signed a safety on Tuesday; keep the scenario
  for (const m of f.roster.filter((m) => m.position === 'CB').slice(2)) m.injury = { severity: 'Minor', weeks: 2, type: 'ankle' };
  for (const m of f.roster.filter((m) => m.position === 'LB').slice(2)) m.injury = { severity: 'Minor', weeks: 1, type: 'knee' };
  const team = F.playerTeam(f); const nickel = ['DL1', 'DL2', 'LB1', 'CB1', 'CB2', 'FS', 'SS'];
  const on = pickSlots(team.defense, nickel, team);
  assert.ok(on.SS.id && on.SS.borrowed, 'SS is filled at the snap');
  assert.equal(new Set(Object.values(on).map((p) => p.id)).size, 7, 'seven different monsters on the field');
  const g = F.simulatePlayerGame(f); assert.ok(g.finished); F.finishSunday(f, g); assert.equal(f.season.week, 2, 'the week advances');
});

test('short-handed positions: Monday scouting always brings a prospect for the thinnest one', () => {
  const f = newFranchise(71);
  for (const m of f.roster.filter((m) => m.position === 'S').slice(1)) f.roster = f.roster.filter((x) => x !== m);
  assert.deepEqual(F.shortPositions(f), ['S']);
  const r = F.scoutRegion(f, 'Coral Coast');
  assert.ok(r.prospects.some((p) => p.monster.position === 'S'), 'a safety is on the board');
  const f2 = newFranchise(5); for (const m of f2.roster.filter((m) => m.position === 'K')) f2.roster = f2.roster.filter((x) => x !== m); const r2 = F.scoutRegion(f2, 'Coral Coast'); assert.ok(r2.prospects.some((p) => p.monster.position === 'K'), 'a kicker is on the board when the club has none');
});

test('a field goal can be kicked on any down (end of a half with no time for a play)', async () => {
  const GR = await import('../src/sim/game-runner.js'); const R = await import('../src/sim/rules.js'); const Ro = await import('../src/franchise/roster.js');
  const A = Ro.generatedTeam(5, { id: 'A', name: 'A', abbr: 'A', color: '#fff' }), B = Ro.generatedTeam(9, { id: 'B', name: 'B', abbr: 'B', color: '#000' });
  const st = R.newGame({ home: A, away: B, seed: 3 }); R.doKickoff(st, { home: A, away: B });
  const side = st.possession; st.ballOn = 78; st.down = 2; st.toGo = 5; st.quarter = 2; st.clock = 7;
  const ev = GR.step(st, { home: A, away: B }, { home: GR.aiController('home'), away: GR.aiController('away') }, { home: GR.newTendencies(), away: GR.newTendencies() }, { fourthDown: 'fg' });
  assert.equal(ev.kind, 'field_goal'); assert.ok(ev.res.distance > 0); if (ev.res.good) assert.equal(st.score[side], 3);
});

test('package rule: only primary/secondary positions fill a slot; plays needing an unfillable package are unavailable; no legal base lineup is a forfeit', async () => {
  const { buildDepthChart, unavailableSlots, lineupProblems } = await import('../src/franchise/roster.js');
  const { PLAYS } = await import('../src/data/playbook.js');
  const f = newFranchise(71);
  for (const m of f.roster.filter((m) => m.position === 'S').slice(1)) f.roster = f.roster.filter((x) => x !== m);
  for (const m of f.roster.filter((m) => m.position === 'CB').slice(2)) m.injury = { severity: 'Minor', weeks: 2, type: 'ankle' };
  for (const m of f.roster.filter((m) => m.position === 'LB').slice(1)) m.injury = { severity: 'Minor', weeks: 2, type: 'knee' }; // one healthy LB: a lineman fills LB2, nobody legal is left for SS
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
  assert.equal(f.roster.find((m) => m.id === chart.LB2)?.position, 'DL', 'a lineman covers LB2 (secondary)');
  assert.deepEqual(unavailableSlots(f.roster, chart), ['SS'], 'nobody with S as primary or secondary: SS cannot be filled');
  assert.deepEqual(lineupProblems(f.roster, chart), [], 'the base seven are legal');
  const av = F.playAvailability(f); assert.ok(Object.keys(av.blocked).length && Object.values(av.blocked).every((sl) => sl === 'SS'));
  assert.ok(Object.keys(av.blocked).every((id) => PLAYS[id].onField.includes('SS')));
  F.autoRunToSunday(f); const team = F.playerTeam(f);
  const stillOpen = unavailableSlots(f.roster, buildDepthChart(f.roster, f.lineupManual, f.depth)).includes('SS'); // Tuesday's signing may have filled the hole
  if (stillOpen) assert.ok(!team.defensePlays.some((id) => PLAYS[id].onField.includes('SS')), 'Nickel plays are not in the Sunday plan');
  assert.equal(team.forfeit, false);
  // Every defensive play needing SS → forfeit.
  const nickel = Object.keys(PLAYS).filter((id) => PLAYS[id].side === 'defense' && PLAYS[id].onField.includes('SS')).slice(0, 6);
  if (nickel.length === 6 && stillOpen) { f.week.plan.defense = nickel; const t2 = F.playerTeam(f); assert.equal(t2.forfeit, true); assert.ok(/package/.test(t2.forfeitReason)); const m = F.sundayMatchup(f); assert.equal(m.forfeit, true); const w = f.season.week; const r = F.forfeitSunday(f); assert.equal(r.ok, true); assert.equal(f.season.records[f.club].l, 1); assert.equal(f.season.week, w + 1); assert.ok(!f.season.leagueStats[f.club], 'no stats from a forfeit'); }
});

test('attribute points: level-ups bank 2 points, spent by hand up to potential, or by the trainer when the setting is on', async () => {
  const { levelUp, spendPoint, autoSpendPoints, POINTS_PER_LEVEL } = await import('../src/data/monsters.js');
  const { createRng } = await import('../src/core/rng.js');
  const f = newFranchise(71); const m = f.roster[0]; const rng = createRng(3);
  levelUp(m, rng); assert.equal(m.points, POINTS_PER_LEVEL);
  const k = Object.keys(m.attributes).find((a) => m.attributes[a] < m.potential); const before = m.attributes[k];
  assert.equal(F.spendAttributePoint(f, m.id, k).ok, true); assert.equal(m.attributes[k], before + 1); assert.equal(m.points, 1);
  m.attributes.kicking = m.potential; assert.equal(spendPoint(m, 'kicking').ok, false, 'capped at potential');
  autoSpendPoints(m, rng); assert.equal(m.points, 0);
  assert.equal(F.unspentPoints(f).length, 0);
  levelUp(m, rng, { autoSpend: true }); assert.equal(m.points, 0, 'auto-spent');
});

test('board goals: three scaled offers, one commitment per season, settled at season end into confidence, hot seat, firing and the scouting bonus', async () => {
  const B = await import('../src/franchise/board.js');
  const f = newFranchise(71);
  assert.equal(F.needsGoal(f), true, 'week 1: the commissioner wants a goal');
  const offers = F.commissionerGoals(f); assert.equal(offers.length, 3); assert.deepEqual(offers.map((o) => o.tier), ['safe', 'medium', 'stretch']);
  assert.equal(F.chooseGoal(f, 'title').ok, true); assert.equal(F.needsGoal(f), false); assert.equal(F.chooseGoal(f, 'wins').ok, false, 'one per season');
  // Pure settlement rules.
  assert.equal(B.goalMet({ id: 'wins', target: 5 }, { wins: 5 }), true); assert.equal(B.goalMet({ id: 'playoffs' }, { playoffs: false }), false); assert.equal(B.goalMet({ id: 'badges', target: 2 }, { badgesWon: 1 }), false);
  assert.equal(B.goalMet({ id: 'wins', target: 8 }, { wins: 7, champion: true }), true, 'a title meets any goal');
  for (const pct of [0.8, 0.95]) assert.ok(B.goalOffers({}, { expectedWinPct: pct }).find((o) => o.id === 'wins').target <= 7, 'safe goal never asks for more than seven of nine');
  const g = { board: { confidence: 0, goal: { id: 'wins', target: 5, label: 'Win 5', year: 1, weight: 1 }, history: [] }, season: { year: 1 } };
  let v = B.settleGoal(g, { wins: 3 }); assert.equal(v.met, false); assert.equal(v.status, 'hot_seat'); assert.equal(g.board.confidence, -1);
  g.board.goal = { id: 'title', label: 'Title', year: 1, weight: 2 }; v = B.settleGoal(g, { champion: true }); assert.equal(g.board.confidence, 2, 'a met goal resets the hole and the title counts double'); assert.equal(g.board.scoutBonusYear, 2);
  g.board.goal = { id: 'wins', target: 9, label: 'Win 9', year: 1, weight: 1 }; B.settleGoal(g, { wins: 0 }); g.board.goal = { id: 'wins', target: 9, label: 'Win 9', year: 1, weight: 1 }; B.settleGoal(g, { wins: 0 }); g.board.goal = { id: 'wins', target: 9, label: 'Win 9', year: 1, weight: 1 }; B.settleGoal(g, { wins: 0 }); g.board.goal = { id: 'wins', target: 9, label: 'Win 9', year: 1, weight: 1 }; v = B.settleGoal(g, { wins: 0 });
  assert.equal(v.status, 'fired'); assert.equal(g.board.fired, true);
  // A full season settles the real goal and a fired owner cannot start the next season.
  for (let guard = 0; guard < 40 && !f.season.finished; guard++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  assert.ok(f.season.boardVerdict && typeof f.season.boardVerdict.met === 'boolean'); assert.equal(f.board.goal, null); assert.equal(f.board.history.length, 1);
  f.board.fired = true; assert.equal(F.startNextSeason(f).ok, false);
});

test('spectating the playoffs: an eliminated owner advances the bracket a round at a time, or skips to the offseason', () => {
  const f = newFranchise(71);
  for (let guard = 0; guard < 20 && !F.inPlayoffs(f); guard++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else F.finishSunday(f, F.simulatePlayerGame(f)); }
  assert.ok(F.inPlayoffs(f) && f.season.playoffs && f.season.awardsFinal, 'playoffs drawn, awards frozen');
  // Knock the owner out (or play until out), then watch.
  let guard = 0; while (F.playoffFixture(f) && guard++ < 4) F.finishSunday(f, F.simulatePlayerGame(f));
  if (!f.season.finished) {
    assert.equal(f.season.spectating, true);
    const before = f.season.playoffs.round; const r = F.advancePlayoffs(f); assert.equal(r.ok, true); assert.equal(r.round, before); assert.ok(r.results.length >= 1);
    F.skipPlayoffs(f);
  }
  assert.ok(f.season.finished && f.season.champion, 'season closes with a champion');
  assert.equal(F.advancePlayoffs(f).ok, false);
});

test('contracts: two-year deals from signing, salaries frozen until renewal, the offseason book, counters and walks to the pool, the market and the roster floor', async () => {
  const { levelUp } = await import('../src/data/monsters.js'); const { createRng } = await import('../src/core/rng.js');
  const f = newFranchise(71);
  assert.ok(f.roster.every((m) => m.contract && (m.contract.ends === 1 || m.contract.ends === 2)), 'everyone signed for one season or two');
  assert.ok(Object.values(f.staffContracts).every((c) => c.ends === 2));
  const m = f.roster[0]; const sal = m.salary; levelUp(m, createRng(1)); assert.equal(m.salary, sal, 'level-ups do not change salary');
  assert.ok(F.renewalAsk(m).ask >= sal - 100, 'the ask follows ratings');
  assert.equal(F.aiTeam(f, 'Bayou Stalkers').roster.length, 38, 'AI clubs carry 38');
  // Release → pool → on the board → signable again.
  const victim = f.roster.find((x) => x.position === 'WR' && !x.cornerstone); const region = F.homeRegion(victim);
  assert.equal(F.releaseMonster(f, victim.id).ok, true); assert.ok(F.poolMonsters(f, region).includes(victim)); assert.equal(victim.contract, null); assert.equal(victim.history?.[0]?.reason, 'released');
  const r = F.scoutRegion(f, region); assert.ok(r.prospects.some((p) => p.fromPool && p.monster === victim), 'the released monster is on the board in its home region');
  // Two seasons to the renewal offseason.
  const run = () => { for (let g = 0; g < 40 && !f.season.finished; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); } };
  run(); { const n = f.offseason.items.filter((i) => i.kind === 'monster').length; assert.ok(n >= 7 && n <= 13, `about a third of the founding roster expires after season 1 (${n})`); assert.equal(f.offseason.items.filter((i) => i.kind === 'staff').length, 0); }
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  holdDraft(f); assert.equal(F.startNextSeason(f).ok, true);
  run();
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  const items = f.offseason.items; assert.ok(items.filter((i) => i.kind === 'monster').length >= 14 && items.filter((i) => i.kind === 'staff').length === 5, 'the two-year founders and the staff come up after season 2');
  assert.equal(F.startNextSeason(f).ok, false, 'decisions gate the new season');
  const first = items.find((i) => i.kind === 'monster'); const mon = f.roster.find((x) => x.id === first.id);
  assert.equal(F.resolveContract(f, first.id, 'sign').ok, true); assert.equal(mon.salary, first.ask); assert.equal(mon.contract.ends, 4);
  const second = items.find((i) => i.kind === 'monster' && !i.status); F.resolveContract(f, second.id, 'walk'); assert.ok(!f.roster.some((x) => x.id === second.id)); assert.ok(Object.values(f.pool).flat().some((x) => x.id === second.id), 'walked to the pool');
  for (const i of items.filter((x) => !x.status)) F.resolveContract(f, i.id, i.kind === 'staff' ? 'sign' : 'counter');
  assert.equal(F.offseasonPending(f).length, 0);
  assert.ok(Object.values(f.staffRaise).every((x) => Math.abs(x - 1.1) < 1e-9), 'staff raises');
  // Market: sign to the floor if needed, roster cap at 38.
  const market = F.offseasonMarket(f); assert.ok(market.length >= 10);
  while (f.roster.length < F.ROSTER_MIN) { const e = F.offseasonMarket(f)[0]; assert.equal(F.signFreeAgent(f, e.monster.id).ok, true); }
  holdDraft(f); const r3 = F.startNextSeason(f); assert.equal(r3.ok, true, r3.reason); assert.equal(f.season.year, 3); assert.equal(f.offseason, null);
});

test('contracts: a renewal may be one season or two, never more', async () => {
  const { newContract } = await import('../src/franchise/contracts.js');
  assert.deepEqual(newContract(3, 1), { signed: 3, ends: 3, years: 1 }); assert.deepEqual(newContract(3, 5), { signed: 3, ends: 4, years: 2 }); assert.equal(newContract(3).years, 2);
  const f = newFranchise(71); f.season.finished = true; f.season.year = 2; const m = f.roster[0]; m.contract = { signed: 1, ends: 2, years: 2 };
  f.offseason = { year: 2, items: [{ kind: 'monster', id: m.id, name: m.name, position: m.position, ovr: 60, current: m.salary, ask: 40000, status: null }], winningRecord: true };
  assert.equal(F.resolveContract(f, m.id, 'sign', { years: 1 }).ok, true); assert.equal(m.contract.ends, 3); assert.equal(m.contract.years, 1); assert.equal(m.salary, 40000);
});

test('the draft: class opens in the final week, Mondays scout it and Tuesdays recover, no recruiting; offseason draft runs worst-first snake with rookie deals; AI draftees persist and are rookies next season', async () => {
  const D = await import('../src/franchise/draft.js');
  assert.deepEqual(D.draftOrder(['A', 'B', 'C'], 2).map((o) => o.team), ['C', 'B', 'A', 'A', 'B', 'C']);
  const f = newFranchise(21); F.chooseGoal(f, 'wins');
  for (let g = 0; g < 20 && f.season.week < 10; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else F.finishSunday(f, F.simulatePlayerGame(f)); }
  assert.equal(f.season.week, 10); assert.ok(F.draftWindow(f)); assert.ok(f.draft && f.draft.class.length >= 40, 'class in');
  assert.ok(f.draft.class.every((m) => m.yearsPro === 0 && m.age >= 19 && m.age <= 22));
  assert.equal(F.scoutRegion(f, 'Coral Coast').ok, false, 'no region scouting in the final week');
  const r = F.scoutDraft(f, { focus: 'QB' }); assert.ok(r.ok && r.studied.length >= 1 && r.studied.every((m) => m.position === 'QB'), 'focus studied first'); assert.equal(f.season.day, 1);
  assert.equal(F.recruit(f, 0, 'development').ok, false, 'no signings in the final week');
  const hurt = f.roster.find((m) => !m.injury); hurt.injury = { severity: 'Minor', weeks: 1, type: 'ankle' }; hurt.fatigue = 40;
  const rec = F.recoveryDay(f); assert.ok(rec.ok && rec.healed.includes(hurt.name)); assert.equal(hurt.fatigue, 25); assert.equal(f.season.day, 2);
  for (let g = 0; g < 40 && !f.season.finished; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  for (const i of F.offseasonPending(f)) F.resolveContract(f, i.id, 'sign');
  assert.match(F.startNextSeason(f).reason, /draft/i);
  const b = F.beginDraft(f); assert.ok(b.ok); assert.equal(F.onTheClock(f), f.club);
  const st = F.leagueStandings(f).overall; const myRank = st.indexOf(f.club); assert.equal(f.draft.index, 15 - myRank, 'worst record picks first');
  const before = f.roster.length; const first = f.draft.class.find((m) => f.draft.available.includes(m.id));
  const p = F.myDraftPick(f, first.id); assert.ok(p.ok); assert.equal(f.roster.length, before + 1); assert.ok(p.monster.contract.rookie && p.monster.contract.ends === 3); assert.equal(p.monster.salary, Math.round((18000 + 280 * monsterOverall(p.monster)) * 0.7 / 100) * 100);
  assert.equal(F.myDraftPick(f, first.id).ok, false, 'not your pick again until the AI has gone');
  while (!f.draft.done) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  assert.ok(f.draft.done && f.draft.picks.length === 48);
  const ai = Object.values(f.draftResults[1]).flat(); assert.ok(ai.length >= 40, 'AI clubs drafted');
  const team = Object.keys(f.draftResults[1]).find((t) => t !== f.club); const got = f.draftResults[1][team];
  while (f.roster.length < F.ROSTER_MIN) F.signFreeAgent(f, F.offseasonMarket(f)[0].monster.id);
  const sn = F.startNextSeason(f); assert.ok(sn.ok, sn.reason);
  assert.ok(got.every((m) => m.yearsPro === 0), 'drafted rookies enter their first season');
  assert.equal(p.monster.yearsPro, 0); assert.ok(F.aiTeam(f, team).roster.some((m) => m.id === got[0].id), 'the AI draftee is on its club');
  assert.equal(f.draft, null);
});
