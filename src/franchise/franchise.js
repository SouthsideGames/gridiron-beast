// The franchise: owner, club, staff, roster, weekly loop, season, league
// simulation, progression and economy. One plain state object; every
// mutation goes through a function here so the UI stays thin.

import { createRng, rngFromState, hashString } from '../core/rng.js';
import { DIVISIONS, ALL_TEAMS, TEAM_META, STARTER_CLUBS, RIVAL_GMS, TIERS, tierById, leagueSeasonFixtures, teamSchedule, blankRecord, applyResult, standings, playoffRound, divisionOf, conferenceFor } from '../data/league.js';
import { STAFF, STAFF_ROLES, PLAYBOOKS, staffById, alignment, trainingBonus, REGIONS, TRAINING_FOCI } from '../data/staff.js';
import { createRoster, generateMonster, monsterOverall, ROSTER_MAX, ROSTER_MIN, CORNERSTONES, NATURES, salaryFor } from '../data/monsters.js';
import { PLAYS } from '../data/playbook.js';
import { OFFENSE_BASE, DEFENSE_BASE, positionOf } from '../data/personnel.js';
import { buildTeam, generatedTeam, buildDepthChart, lineupProblems, teamOverall } from './roster.js';
import { afterGame, recoverWeek, offseason } from './progression.js';
import { playGame } from '../sim/game-runner.js';
import { teamStrengths } from '../sim/coach-ai.js';

export const SCHEMA_VERSION = 6;
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_ACTIONS = ['Scout a region', 'Recruit', 'Training focus', 'Scout opponent', 'Game plan', 'Lineup check', 'Game day'];
export const PLAN_SIZE = 6;

// ------------------------------------------------------------ creation
export function createFranchise({ owner, club, rival = null, cornerstoneOffense, cornerstoneDefense, seed = Date.now() >>> 0, settings = {} }) {
  const rng = createRng(seed);
  const division = divisionOf(club);
  const rivalChoices = DIVISIONS[division].filter((t) => t !== club);
  const rivalTeam = rivalChoices.includes(rival) ? rival : rng.pick(rivalChoices);
  const roster = createRoster(rng.seed(), { cornerstoneOffense, cornerstoneDefense, quality: 56 });
  const f = {
    schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), seed, rngState: rng.state,
    owner: { ...owner }, club, tier: 'challenger', staff: {},
    roster, lineupManual: {},
    season: null, week: blankWeek(), game: null,
    rivals: { challenger: { team: rivalTeam, gm: RIVAL_GMS[rivalTeam] || 'Rival GM', headToHead: { w: 0, l: 0 } } },
    badges: { challenger: 0, vanguard: 0, sovereign: 0 }, qualification: { challenger: 0, vanguard: 0, sovereign: 0 }, bottomFourStreak: 0,
    history: [], news: [],
    settings: { quarterLength: 180, mode: 'key', speed: 1, reducedMotion: false, liveClock: false, ...settings },
    tutorial: { seen: {} },
  };
  startSeason(f, 1);
  return f;
}
function blankWeek() { return { region: null, prospects: [], recruitAttempts: 0, recruited: null, trainingFocus: null, scoutReport: null, plan: { offense: [], defense: [] }, lineupChecked: false, gameResult: null, events: [] }; }
const frng = (f) => { const r = rngFromState(f.rngState); return { r, save: () => { f.rngState = r.state; } }; };

export function news(f, text, kind = 'info') { f.news.unshift({ text, kind, week: f.season?.week, year: f.season?.year }); if (f.news.length > 60) f.news.pop(); }

// ------------------------------------------------------------ staff
export const staffHired = (f) => STAFF_ROLES.every((r) => f.staff[r]);
export const nextStaffRole = (f) => STAFF_ROLES.find((r) => !f.staff[r]) || null;
export const staffMember = (f, role) => staffById(f.staff[role]);
/** Welcome news for a brand-new franchise: the first week is a normal week, with a short guide. */
export function firstWeekWelcome(f) {
  news(f, 'Welcome, owner. A balanced coaching staff has been hired for you — replace anyone from Staff once you know the league.', 'info');
  news(f, 'Your first week: Monday scout a region, Tuesday recruit, Wednesday train, Thursday scout the opponent, Friday set your game plan, Saturday check the lineup, Sunday play.', 'info');
}
export const DEFAULT_STAFF = Object.freeze({ head_coach: 'hc_vale', offensive_coordinator: 'oc_park', defensive_coordinator: 'dc_ice', head_scout: 'sc_moss', monster_trainer: 'tr_focus' });
/** Quick start: a balanced default staff so a new owner can play immediately. */
export function hireDefaultStaff(f) { for (const [role, id] of Object.entries(DEFAULT_STAFF)) if (!f.staff[role]) f.staff[role] = id; }
/** Front office: swap one staff member for a candidate (cap permitting). */
export function replaceStaff(f, id) {
  const c = staffById(id); if (!c) return { ok: false, reason: 'Unknown candidate.' };
  if (f.staff[c.role] === id) return { ok: false, reason: 'Already on staff.' };
  const current = staffById(f.staff[c.role]);
  const budget = salarySummary(f, c.salary - (current?.salary || 0));
  if (budget.over) return { ok: false, reason: 'Exceeds the salary cap.' };
  f.staff[c.role] = id;
  news(f, `${c.name} hired as ${c.role.replace(/_/g, ' ')}${current ? `, replacing ${current.name}` : ''}.`, 'roster');
  return { ok: true, replaced: current };
}
export function hireStaff(f, id) {
  const c = staffById(id); if (!c) throw new Error('unknown staff');
  if (f.staff[c.role]) throw new Error('role filled');
  const budget = salarySummary(f, c.salary);
  if (budget.over) return { ok: false, reason: 'Exceeds the salary cap.' };
  f.staff[c.role] = id;
  return { ok: true };
}
export function schemeAlignment(f) {
  const hc = staffMember(f, 'head_coach');
  return { offense: alignment(hc, staffMember(f, 'offensive_coordinator')), defense: alignment(hc, staffMember(f, 'defensive_coordinator')) };
}
export function coachProfile(f) {
  const hc = staffMember(f, 'head_coach');
  return hc ? { aggression: hc.identity.aggression, passBias: hc.identity.passBias } : { aggression: 0.5, passBias: null };
}
export function catalog(f, side) {
  const role = side === 'offense' ? 'offensive_coordinator' : 'defensive_coordinator';
  const id = f.staff[role];
  const fallback = side === 'offense' ? PLAYBOOKS.oc_park : PLAYBOOKS.dc_ice;
  return (PLAYBOOKS[id] || fallback).filter((p) => PLAYS[p]);
}

// ------------------------------------------------------------ economy
export const capFor = (f) => tierById(f.tier).cap;
export function salarySummary(f, proposed = 0) {
  const monsters = f.roster.reduce((s, m) => s + (m.salary || salaryFor(m)), 0);
  const staff = Object.values(f.staff).reduce((s, id) => s + (staffById(id)?.salary || 0), 0);
  const cap = capFor(f);
  const total = monsters + staff + proposed;
  return { cap, monsters, staff, proposed, total, remaining: cap - total, over: total > cap, rosterCount: f.roster.length };
}
export function releaseMonster(f, id) {
  const m = f.roster.find((x) => x.id === id); if (!m) return { ok: false, reason: 'Not on roster.' };
  if (f.roster.length <= ROSTER_MIN) return { ok: false, reason: `You must keep at least ${ROSTER_MIN} monsters.` };
  const positionCount = f.roster.filter((x) => x.position === m.position).length;
  if (positionCount <= 1 && m.position !== 'TE') return { ok: false, reason: `${m.name} is your only ${m.position}.` };
  f.roster = f.roster.filter((x) => x.id !== id);
  for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === id) delete f.lineupManual[slot];
  news(f, `${m.name} released.`, 'roster');
  return { ok: true };
}
export function canPlayGames(f) { return !salarySummary(f).over; }

// ------------------------------------------------------------ team objects
export function playerTeam(f, { trainingBonus: tb = null } = {}) {
  const meta = TEAM_META[f.club];
  const plan = f.week.plan;
  const offense = plan.offense.length ? plan.offense : catalog(f, 'offense').slice(0, PLAN_SIZE);
  const defense = plan.defense.length ? plan.defense : catalog(f, 'defense').slice(0, PLAN_SIZE);
  const align = schemeAlignment(f);
  const team = buildTeam({ id: f.club, name: f.club, abbr: meta.abbr, color: meta.color, roster: f.roster, manual: f.lineupManual, offensePlays: offense, defensePlays: defense, coach: coachProfile(f), trainingBonus: tb });
  // Scheme alignment: a small execution bonus/penalty on awareness for every starter.
  const bump = (side, pct) => { const delta = Math.round((pct - 80) / 10); for (const p of Object.values(team[side])) if (p.attrs.awareness) p.attrs.awareness = Math.max(1, Math.min(99, p.attrs.awareness + delta)); };
  bump('offense', align.offense); bump('defense', align.defense);
  team.alignment = align;
  return team;
}
/** Deterministic AI club for a season (quality drifts per year; the rival is slightly better). */
export function aiTeam(f, name, year = f.season?.year || 1) {
  const meta = TEAM_META[name];
  const tier = tierById(f.tier);
  const base = tier.id === 'challenger' ? 56 : tier.id === 'vanguard' ? 64 : 72;
  const h = hashString(`${name}|${year}|${f.seed}`);
  const quality = base + (h % 9) - 4 + (f.rivals[f.tier]?.team === name ? 2 : 0);
  const coach = { aggression: 0.35 + ((h >>> 8) % 40) / 100, passBias: 0.45 + ((h >>> 16) % 25) / 100 };
  return generatedTeam(h, { id: name, name, abbr: meta.abbr, color: meta.color, quality, coach });
}

// ------------------------------------------------------------ season
export function startSeason(f, year) {
  const records = Object.fromEntries(ALL_TEAMS.map((t) => [t, blankRecord()]));
  f.season = { year, week: 1, day: 0, records, results: [], playoffs: null, champion: null, finished: false, schedule: teamSchedule(year, f.club) };
  f.week = blankWeek();
  for (const m of f.roster) { m.fatigue = 0; m.season = { games: 0, yards: 0, rushYds: 0, recYds: 0, passYds: 0, td: 0, tackles: 0, sacks: 0, int: 0, catches: 0 }; }
}
export const currentFixture = (f) => f.season.schedule.find((g) => g.week === f.season.week) || null;
export const isBye = (f) => !!currentFixture(f)?.bye;
export const inPlayoffs = (f) => f.season.week > 10;
export function opponentName(f) { const fx = currentFixture(f); if (fx && !fx.bye) return fx.opponent; const p = playoffFixture(f); return p ? (p.home === f.club ? p.away : p.home) : null; }
export function playoffFixture(f) { const p = f.season.playoffs; if (!p) return null; return p.fixtures.find((g) => g.round === p.round && (g.home === f.club || g.away === f.club) && !g.result) || null; }
export function playerAlive(f) { return !inPlayoffs(f) || !!playoffFixture(f); }

export function record(f) { return f.season.records[f.club]; }
export function leagueStandings(f) { return standings(f.season.records); }

/** Where the club stands in the playoff race (conference seed or games back). */
export function playoffPicture(f) {
  const st = leagueStandings(f); const conf = conferenceFor(divisionOf(f.club));
  const c = st.conferences[conf]; const seed = c.seeds.indexOf(f.club);
  const divLeader = st.divisions[divisionOf(f.club)][0];
  if (seed >= 0) return { inPlayoffs: true, seed: seed + 1, text: `${conf} #${seed + 1} seed${divLeader === f.club ? ' · division leader' : ' · wild card'}` };
  const lastIn = c.seeds[c.seeds.length - 1]; const a = f.season.records[f.club], b = f.season.records[lastIn];
  const back = ((b.w - a.w) + (a.l - b.l)) / 2;
  return { inPlayoffs: false, seed: null, text: back <= 0 ? 'On the bubble — tiebreakers decide' : `${back} game${back === 1 ? '' : 's'} back of the last playoff spot` };
}
/** Simulate every other game of the current week with the real engine. */
function simulateLeagueWeek(f) {
  const { r, save } = frng(f);
  const fixtures = leagueSeasonFixtures(f.season.year).find((w) => w.week === f.season.week);
  const results = [];
  if (fixtures && !fixtures.bye) {
    for (const g of fixtures.games) {
      if (g.home === f.club || g.away === f.club) continue;
      const home = aiTeam(f, g.home), away = aiTeam(f, g.away);
      const game = playGame({ home, away, seed: r.seed(), quarterLength: 180 });
      const res = { week: f.season.week, home: g.home, away: g.away, homeScore: game.score.home, awayScore: game.score.away, ot: !!game.ot };
      applyResult(f.season.records, res); results.push(res);
    }
  }
  save();
  f.season.results.push(...results);
  const rival = f.rivals[f.tier]?.team;
  const rg = results.find((x) => x.home === rival || x.away === rival);
  if (rg) { const rw = (rg.home === rival ? rg.homeScore > rg.awayScore : rg.awayScore > rg.homeScore); const other = rg.home === rival ? rg.away : rg.home; news(f, `Rival watch: ${rival} ${rw ? 'beat' : 'lost to'} ${other} ${rg.home === rival ? rg.homeScore + '–' + rg.awayScore : rg.awayScore + '–' + rg.homeScore}.`, 'info'); }
  return results;
}

// ------------------------------------------------------------ weekly loop
export function dayIndex(f) { return f.season.day; }
export function scoutRegion(f, regionName) {
  if (f.season.day !== 0) return { ok: false, reason: 'Not Monday.' };
  const region = REGIONS[regionName]; if (!region) return { ok: false, reason: 'Unknown region.' };
  const scout = staffMember(f, 'head_scout');
  const skill = scout?.biomes?.[region.biome] ?? 50;
  const { r, save } = frng(f);
  const count = skill >= 80 ? 3 : skill >= 45 ? 2 : 1;
  const prospects = [];
  for (let i = 0; i < count; i++) {
    const position = r.pick(['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'LB', 'CB', 'CB', 'S', 'K']);
    const quality = 52 + r.int(12) + (skill >= 80 ? 3 : 0);
    const m = generateMonster(r, { position, quality, type: r.pick(region.types) });
    uniqueName(f, m, prospects.map((p) => p.monster.name));
    const revealed = skill >= 85 ? 6 : skill >= 65 ? 4 : skill >= 40 ? 2 : 1;
    prospects.push({ monster: m, revealed, natureKnown: skill >= 70, potentialKnown: skill >= 55 });
  }
  save();
  f.week.region = regionName; f.week.prospects = prospects; f.week.recruitAttempts = 0; f.season.day = 1;
  return { ok: true, prospects, skill, scout: scout?.name || 'Your scout' };
}
export const RECRUIT_APPROACHES = Object.freeze([
  { id: 'development', label: 'Offer development', text: 'Promise a plan to grow their game.', weight: { young: 0.25 } },
  { id: 'facilities', label: 'Showcase facilities', text: 'Show off the training complex.', weight: { strong: 0.2 } },
  { id: 'playing_time', label: 'Promise playing time', text: 'A starting role, right away.', weight: { need: 0.3 } },
]);
/** No two monsters on one club share a display name (the species name gets a numeral). */
export function uniqueName(f, m, extra = []) {
  const taken = new Set([...f.roster.map((x) => x.name), ...extra]);
  if (!taken.has(m.name)) return m;
  const roman = ['II', 'III', 'IV', 'V', 'VI'];
  for (const n of roman) { const cand = `${m.species} ${n}`; if (!taken.has(cand)) { m.name = cand; return m; } }
  m.name = `${m.species} ${f.roster.length + 1}`; return m;
}
export function recruit(f, prospectIndex, approachId) {
  if (f.season.day !== 1) return { ok: false, reason: 'Not Tuesday.' };
  const p = f.week.prospects[prospectIndex]; if (!p) return { ok: false, reason: 'No such prospect.' };
  if (f.week.recruitAttempts >= 3) return { ok: false, reason: 'No attempts left this week.' };
  const m = p.monster;
  if (f.roster.length >= ROSTER_MAX) return { ok: false, reason: `Roster is full (${ROSTER_MAX}). Release a monster first.` };
  if (salarySummary(f, m.salary).over) return { ok: false, reason: 'Signing would exceed the salary cap.' };
  const { r, save } = frng(f);
  f.week.recruitAttempts += 1;
  const need = f.roster.filter((x) => x.position === m.position).length <= 1;
  let chance = 0.38 + (staffMember(f, 'head_scout')?.overall || 70) / 400;
  if (approachId === 'development' && m.age <= 23) chance += 0.22;
  if (approachId === 'facilities' && monsterOverall(m) >= 60) chance += 0.18;
  if (approachId === 'playing_time' && need) chance += 0.28;
  const success = r.chance(chance);
  save();
  if (success) {
    f.roster.push(m); f.week.recruited = m.id; f.week.prospects = []; f.season.day = 2;
    news(f, `${m.name} (${m.position}, ${monsterOverall(m)} OVR) signed from ${f.week.region}.`, 'roster');
    return { ok: true, success: true, monster: m };
  }
  if (f.week.recruitAttempts >= 3) { f.season.day = 2; return { ok: true, success: false, final: true }; }
  return { ok: true, success: false, final: false };
}
export function skipRecruit(f) { if (f.season.day === 1) { f.season.day = 2; f.week.prospects = []; } }
export function setTraining(f, focus) {
  if (f.season.day !== 2) return { ok: false, reason: 'Not Wednesday.' };
  if (!TRAINING_FOCI[focus]) return { ok: false, reason: 'Unknown focus.' };
  f.week.trainingFocus = focus; f.season.day = 3;
  return { ok: true, bonus: trainingBonus(staffMember(f, 'monster_trainer'), focus) };
}
export function scoutOpponent(f, side) {
  if (f.season.day !== 3) return { ok: false, reason: 'Not Thursday.' };
  const opp = opponentName(f);
  let report = null;
  if (opp) {
    const team = aiTeam(f, opp);
    const str = teamStrengths(team);
    // Star = best starter by positional overall (the same rating shown everywhere else).
    const byId = Object.fromEntries(team.roster.map((m) => [m.id, m]));
    const best = (slots) => slots.map((slot) => ({ slot, m: byId[team.chart[slot]] })).filter((x) => x.m).map(({ slot, m }) => ({ slot, name: m.name, ovr: monsterOverall(m, { slotPosition: positionOf(slot) }) })).sort((a, b) => b.ovr - a.ovr)[0];
    report = side === 'offense'
      ? { side, passBias: Math.round(team.coach.passBias * 100), aggression: Math.round(team.coach.aggression * 100), pass: Math.round(str.pass), run: Math.round(str.run), star: best(OFFENSE_BASE), plays: [...team.offensePlays] }
      : { side, passD: Math.round(str.passD), runD: Math.round(str.runD), aggression: Math.round(team.coach.aggression * 100), star: best(DEFENSE_BASE), plays: [...team.defensePlays] };
  }
  f.week.scoutReport = report; f.season.day = 4;
  return { ok: true, report };
}
export function setGamePlan(f, offense, defense) {
  const catO = catalog(f, 'offense'), catD = catalog(f, 'defense');
  const o = [...new Set(offense)].filter((id) => catO.includes(id)), d = [...new Set(defense)].filter((id) => catD.includes(id));
  if (o.length !== PLAN_SIZE || d.length !== PLAN_SIZE) return { ok: false, reason: `Pick exactly ${PLAN_SIZE} offensive and ${PLAN_SIZE} defensive plays.` };
  f.week.plan = { offense: o, defense: d };
  if (f.season.day === 4) f.season.day = 5;
  return { ok: true };
}
export function lineupCheck(f) {
  const chart = buildDepthChart(f.roster, f.lineupManual);
  const problems = lineupProblems(f.roster, chart);
  const tired = f.roster.filter((m) => Object.values(chart).includes(m.id) && m.fatigue >= 60).map((m) => m.name);
  const injured = f.roster.filter((m) => m.injury).map((m) => `${m.name} (${m.injury.severity}, ${m.injury.weeks} wk)`);
  f.week.lineupChecked = true;
  if (f.season.day === 5) f.season.day = 6;
  return { ok: problems.length === 0, problems, tired, injured, chart };
}
export function assignSlot(f, slot, monsterId) {
  if (monsterId == null) { delete f.lineupManual[slot]; return { ok: true }; }
  const m = f.roster.find((x) => x.id === monsterId); if (!m) return { ok: false, reason: 'Unknown monster.' };
  for (const [s, id] of Object.entries(f.lineupManual)) if (id === monsterId && s !== slot) delete f.lineupManual[s];
  f.lineupManual[slot] = monsterId;
  return { ok: true };
}

/** The Sunday matchup as team objects (home/away correct) for the game module. */
export function sundayMatchup(f) {
  const fx = currentFixture(f); const po = playoffFixture(f);
  let home, away, oppName, tag;
  if (po) { oppName = po.home === f.club ? po.away : po.home; home = po.home; away = po.away; tag = po.tag; }
  else if (fx && !fx.bye) { oppName = fx.opponent; home = fx.home ? f.club : oppName; away = fx.home ? oppName : f.club; tag = `Week ${fx.week} · ${fx.category}`; }
  else return null;
  const mine = playerTeam(f, { trainingBonus: f.week.trainingFocus ? trainingBonus(staffMember(f, 'monster_trainer'), f.week.trainingFocus) : null });
  const theirs = aiTeam(f, oppName);
  const rival = f.rivals[f.tier]?.team === oppName;
  return { home: home === f.club ? mine : theirs, away: away === f.club ? mine : theirs, playerSide: home === f.club ? 'home' : 'away', opponent: oppName, tag, rival, playoff: !!po };
}

/** Record the player's finished game and roll the week forward. */
export function finishSunday(f, gameState) {
  const m = sundayMatchup(f); if (!m) return;
  const side = m.playerSide, oppSide = side === 'home' ? 'away' : 'home';
  const won = gameState.winner === side;
  const res = { week: f.season.week, home: m.home.name, away: m.away.name, homeScore: gameState.score.home, awayScore: gameState.score.away, ot: !!gameState.ot, player: true };
  const { r, save } = frng(f);
  const events = afterGame(f.roster, m[side].chart, gameState.stats[side].players, r, { won });
  save();
  f.week.events = events;
  f.week.gameResult = { ...res, won, playerScore: gameState.score[side], oppScore: gameState.score[oppSide], opponent: m.opponent, tag: m.tag };
  if (m.rival) { f.rivals[f.tier].headToHead[won ? 'w' : 'l'] += 1; news(f, won ? `RIVALRY WIN over ${m.opponent} — GM ${f.rivals[f.tier].gm} will remember this.` : `${m.opponent}'s GM ${f.rivals[f.tier].gm} gets bragging rights this time.`, won ? 'win' : 'loss'); }
  for (const slot of Object.keys(m[side].chart)) { const mon = f.roster.find((x) => x.id === m[side].chart[slot]); const st = gameState.stats[side].players[slot]; if (!mon || !st) continue; mon.season ||= { games: 0, yards: 0, rushYds: 0, recYds: 0, passYds: 0, td: 0, tackles: 0, sacks: 0, int: 0, catches: 0 }; mon.season.games += 1; mon.season.rushYds += st.rushYds || 0; mon.season.recYds += st.recYds || 0; mon.season.passYds += st.passYds || 0; mon.season.yards += (st.rushYds || 0) + (st.recYds || 0); mon.season.td += st.td || 0; mon.season.tackles += st.tackles || 0; mon.season.sacks += st.sacks || 0; mon.season.int += st.int || 0; mon.season.catches += st.rec || 0; }
  if (m.playoff) { recordPlayoffResult(f, res); }
  else { applyResult(f.season.records, res); f.season.results.push(res); const fx = currentFixture(f); fx.result = { playerScore: gameState.score[side], oppScore: gameState.score[oppSide], won }; }
  news(f, `${won ? 'WIN' : 'LOSS'} ${gameState.score[side]}–${gameState.score[oppSide]} vs ${m.opponent}${gameState.ot ? ' (OT)' : ''}.`, won ? 'win' : 'loss');
  for (const e of events) news(f, e.kind === 'levelup' ? `${e.name} reached level ${e.level} (${e.from} → ${e.to} OVR).` : e.kind === 'injury' ? `${e.name} injured: ${e.severity}, out ${e.weeks} week${e.weeks === 1 ? '' : 's'}.` : e.name, e.kind);
  f.game = null;
  f.lastGame = { ...f.week.gameResult, events, year: f.season.year, week: f.season.week };
  advanceWeek(f);
  return f.lastGame;
}
export function takeBye(f) {
  if (!isBye(f) || f.season.day !== 6) return { ok: false };
  f.week.gameResult = { bye: true };
  advanceWeek(f, { bye: true });
  return { ok: true };
}
function advanceWeek(f, { bye = false } = {}) {
  if (!inPlayoffs(f)) simulateLeagueWeek(f);
  else simulatePlayoffWeek(f);
  recoverWeek(f.roster, { bye });
  f.season.week += 1; f.season.day = 0;
  const lastPlan = f.week.plan;
  f.week = blankWeek(); f.week.plan = lastPlan; // keep the plan as the default for next week
  if (f.season.week === 11) startPlayoffs(f);
  if (inPlayoffs(f) && f.season.playoffs?.champion) { endSeason(f); return; }
  if (inPlayoffs(f) && !playoffFixture(f)) {
    // Eliminated (or never qualified): simulate the remaining rounds and close the season.
    let guard = 0;
    while (!f.season.playoffs.champion && guard++ < 4) { simulatePlayoffWeek(f); f.season.week += 1; }
    endSeason(f);
  }
}

// ------------------------------------------------------------ playoffs
function startPlayoffs(f) {
  const st = leagueStandings(f);
  const seeds = { Aurora: st.conferences.Aurora.seeds, Titan: st.conferences.Titan.seeds };
  const fixtures = playoffRound(1, [], seeds).map((g) => ({ ...g, round: 1, week: 11, result: null }));
  f.season.playoffs = { seeds, round: 1, fixtures, results: [], champion: null };
  const qualified = Object.values(seeds).flat().includes(f.club);
  news(f, qualified ? `Playoffs! ${f.club} qualified as the ${seedLabel(seeds, f.club)}.` : `Regular season over: ${f.club} missed the playoffs.`, qualified ? 'win' : 'loss');
}
function seedLabel(seeds, club) { for (const [conf, s] of Object.entries(seeds)) { const i = s.indexOf(club); if (i >= 0) return `${conf} #${i + 1} seed`; } return 'a qualifier'; }
function recordPlayoffResult(f, res) {
  const p = f.season.playoffs;
  const g = p.fixtures.find((x) => x.round === p.round && x.home === res.home && x.away === res.away);
  const winner = res.homeScore > res.awayScore ? res.home : res.away;
  g.result = res; p.results.push({ round: p.round, conf: g.conf, winner, home: res.home, away: res.away, homeScore: res.homeScore, awayScore: res.awayScore });
}
function simulatePlayoffWeek(f) {
  const p = f.season.playoffs; if (!p || p.champion) return;
  const { r, save } = frng(f);
  for (const g of p.fixtures.filter((x) => x.round === p.round && !x.result)) {
    const game = playGame({ home: aiTeam(f, g.home), away: aiTeam(f, g.away), seed: r.seed(), quarterLength: 180 });
    const res = { week: f.season.week, home: g.home, away: g.away, homeScore: game.score.home, awayScore: game.score.away, ot: !!game.ot };
    g.result = res; p.results.push({ round: p.round, conf: g.conf, winner: res.homeScore > res.awayScore ? g.home : g.away, ...res });
  }
  save();
  if (p.round === 3) { p.champion = p.results.find((x) => x.round === 3).winner; f.season.champion = p.champion; return; }
  p.round += 1;
  p.fixtures.push(...playoffRound(p.round, p.results, p.seeds).map((g) => ({ ...g, round: p.round, week: 10 + p.round, result: null })));
}

// ------------------------------------------------------------ season end
function endSeason(f) {
  const s = f.season; const st = leagueStandings(f);
  const champion = s.playoffs?.champion || null;
  const rec = record(f);
  if (champion === f.club) { f.badges[f.tier] += 1; f.qualification[f.tier] += 1; news(f, `BEAST BOWL CHAMPIONS! ${f.club} win the ${tierById(f.tier).name} title.`, 'win'); }
  else if (champion) news(f, `${champion} win the Beast Bowl.`, 'info');
  const place = st.overall.indexOf(f.club) + 1;
  f.bottomFourStreak = place > 12 ? f.bottomFourStreak + 1 : 0;
  f.history.push({ year: s.year, club: f.club, tier: f.tier, record: { w: rec.w, l: rec.l, t: rec.t }, place, champion, playoffs: !!s.playoffs?.seeds && Object.values(s.playoffs.seeds).flat().includes(f.club), schedule: s.schedule.map((g) => ({ ...g })), rival: { ...f.rivals[f.tier] } });
  // Tier movement (promotion challenge / relegation) is designed but switched off for now:
  // the data model stays, the league stays one great season at a time.
  if (TIERS_ENABLED) {
    const tier = tierById(f.tier);
    if (tier.next && f.qualification[f.tier] >= tier.badgeGoal) { f.tier = tier.next; f.qualification[f.tier] = 0; news(f, `PROMOTED to the ${tierById(f.tier).name}!`, 'win'); ensureRival(f); }
    else if (tier.rank < 3 && f.bottomFourStreak >= 2) { const lower = TIERS.find((t) => t.rank === tier.rank + 1); f.tier = lower.id; f.bottomFourStreak = 0; news(f, `Relegated to the ${lower.name}.`, 'loss'); ensureRival(f); }
  }
  s.awards = seasonAwards(f);
  f.history[f.history.length - 1].awards = s.awards;
  s.finished = true;
}
export const TIERS_ENABLED = false;

/** End-of-season awards from the roster's season stats and the league table. */
export function seasonAwards(f) {
  const s = f.season; const st = leagueStandings(f); const rec = record(f);
  const byStat = (key) => f.roster.slice().sort((a, b) => (b.season?.[key] || 0) - (a.season?.[key] || 0))[0];
  const line = (m, key, label) => m && (m.season?.[key] || 0) > 0 ? { id: m.id, name: m.name, position: m.position, value: m.season[key], label } : null;
  const mvpScore = (m) => (m.season?.yards || 0) + (m.season?.td || 0) * 20 + (m.season?.tackles || 0) * 4 + (m.season?.sacks || 0) * 12 + (m.season?.int || 0) * 15 + (m.season?.catches || 0) * 2;
  const mvp = f.roster.slice().sort((a, b) => mvpScore(b) - mvpScore(a))[0];
  const rival = f.rivals[f.tier];
  const rivalGames = s.schedule.filter((g) => g.opponent === rival?.team && g.result);
  return {
    year: s.year, record: { w: rec.w, l: rec.l, t: rec.t }, place: st.overall.indexOf(f.club) + 1,
    champion: s.champion, playoffs: !!s.playoffs?.seeds && Object.values(s.playoffs.seeds).flat().includes(f.club),
    mvp: mvp && mvpScore(mvp) > 0 ? { id: mvp.id, name: mvp.name, position: mvp.position, score: mvpScore(mvp) } : null,
    rusher: line(byStat('rushYds'), 'rushYds', 'rushing yards'), receiver: line(byStat('recYds'), 'recYds', 'receiving yards'), passer: line(byStat('passYds'), 'passYds', 'passing yards'),
    tackler: line(byStat('tackles'), 'tackles', 'tackles'), ballhawk: line(byStat('int'), 'int', 'interceptions'), rusherD: line(byStat('sacks'), 'sacks', 'sacks'),
    rivalry: rival ? { team: rival.team, gm: rival.gm, wins: rivalGames.filter((g) => g.result.won).length, games: rivalGames.length, swept: rivalGames.length === 2 && rivalGames.every((g) => g.result.won) } : null,
  };
}
function ensureRival(f) { if (!f.rivals[f.tier]) { const { r, save } = frng(f); const choices = DIVISIONS[divisionOf(f.club)].filter((t) => t !== f.club); const team = r.pick(choices); save(); f.rivals[f.tier] = { team, gm: RIVAL_GMS[team] || 'Rival GM', headToHead: { w: 0, l: 0 } }; } }
export function startNextSeason(f) {
  if (!f.season.finished) return { ok: false, reason: 'The season is not over.' };
  const { r, save } = frng(f);
  const events = offseason(f.roster, r);
  save();
  startSeason(f, f.season.year + 1);
  news(f, `Season ${f.season.year} begins.`, 'info');
  return { ok: true, events };
}

/** Headless: simulate the player's game too (for Key Moments "sim to end" and tests). */
export function simulatePlayerGame(f) {
  const m = sundayMatchup(f); if (!m) return null;
  const { r, save } = frng(f);
  const game = playGame({ home: m.home, away: m.away, seed: r.seed(), quarterLength: f.settings.quarterLength });
  save();
  return game;
}

export function summary(f) {
  const rec = record(f);
  return { club: f.club, tier: tierById(f.tier).name, year: f.season.year, week: f.season.week, day: DAYS[f.season.day], record: `${rec.w}–${rec.l}${rec.t ? '–' + rec.t : ''}`, overall: teamOverall(playerTeam(f)), cap: salarySummary(f) };
}
