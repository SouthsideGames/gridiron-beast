// The franchise: owner, club, staff, roster, weekly loop, season, league
// simulation, progression and economy. One plain state object; every
// mutation goes through a function here so the UI stays thin.

import { createRng, rngFromState, hashString } from '../core/rng.js';
import { recordGame, ensureStats, rolloverMonster, leadersSnapshot, monsterLine } from './stats.js';
import { AWARDS, computeAwards, headCoachName } from './awards.js';
export { AWARDS } from './awards.js';
export * as Stats from './stats.js';
import { DIVISIONS, ALL_TEAMS, TEAM_META, STARTER_CLUBS, RIVAL_GMS, TIERS, tierById, leagueSeasonFixtures, teamSchedule, blankRecord, applyResult, standings, playoffRound, divisionOf, conferenceFor } from '../data/league.js';
import { STAFF, STAFF_ROLES, PLAYBOOKS, staffById, alignment, trainingBonus, REGIONS, TRAINING_FOCI, BACKGROUNDS } from '../data/staff.js';
import { createRoster, generateMonster, monsterOverall, schemeFit, ROSTER_MAX, ROSTER_MIN, CORNERSTONES, NATURES, salaryFor, regionSpecies, resolveSpecies, speciesName, speciesEffect, spendPoint } from '../data/monsters.js';
import { SPECIES_DEX, LEGEND_RULES } from '../data/species.js';
import { dexRecordGlobal, dexStatusGlobal, dexFormGlobal, dexFormsGlobal, noteNewFranchise } from './dex-store.js';
import { GYMS, GYM_BY_CLUB, GYM_TIER, GYM_GROWTH_PER_SEASON, GYM_STUDIED_TAPE, ORDINARY_GROWTH_PER_SEASON, FREE_LEGENDARIES } from '../data/gyms.js';
import { PLAYS } from '../data/playbook.js';
import { QUESTIONS, TEMPERAMENTS, temperamentOf, MEDIA_BOOST, MEDIA_CAP, HYPE_BOOST } from '../data/media.js';
import { pregameDialogue, dialogueState, REPLIES } from '../data/dialogue.js';
import { POSTSEASON_EVENTS, RAISE_PCT, RETENTION_BONUS_PCT, PROMISE_BENCH_LIMIT } from '../data/postseason.js';
import { OFFENSE_BASE, DEFENSE_BASE, OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf } from '../data/personnel.js';
import { buildTeam, generatedTeam, buildDepthChart, lineupProblems, borrowedSlots, unavailableSlots, teamOverall, depthOrder, GROUP_SLOTS } from './roster.js';
import { afterGame, recoverWeek, offseason, OUT_OF_POSITION_RISK } from './progression.js';
import { playGame } from '../sim/game-runner.js';
import { teamStrengths } from '../sim/coach-ai.js';

export const SCHEMA_VERSION = 6;
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_ACTIONS = ['Scout a region', 'Recruit', 'Training focus', 'Scout opponent', 'Game plan', 'Lineup check', 'Game day'];
export const PLAN_SIZE = 6;

// ------------------------------------------------------------ creation
export function createFranchise({ owner, club, rival = null, cornerstone = null, cornerstoneOffense, cornerstoneDefense, seed = Date.now() >>> 0, settings = {} }) {
  const rng = createRng(seed);
  const division = divisionOf(club);
  const rivalChoices = DIVISIONS[division].filter((t) => t !== club);
  const rivalTeam = rivalChoices.includes(rival) ? rival : rng.pick(rivalChoices);
  const roster = createRoster(rng.seed(), { cornerstone, cornerstoneOffense, cornerstoneDefense, quality: 56 });
  const f = {
    schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(), seed, rngState: rng.state,
    owner: { ...owner }, club, tier: 'challenger', staff: {},
    roster, lineupManual: {}, depth: {},
    season: null, week: blankWeek(), game: null,
    rivals: { challenger: { team: rivalTeam, gm: RIVAL_GMS[rivalTeam] || 'Rival GM', headToHead: { w: 0, l: 0 } } },
    badges: { challenger: 0, vanguard: 0, sovereign: 0 }, qualification: { challenger: 0, vanguard: 0, sovereign: 0 }, bottomFourStreak: 0,
    history: [], news: [], dex: { seen: {}, signed: {} },
    campaign: { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 },
    settings: { quarterLength: 180, mode: 'key', speed: 1, reducedMotion: false, liveClock: false, difficulty: 'pro', ...settings },
    tutorial: { seen: {} },
  };
  startSeason(f, 1);
  noteNewFranchise();
  for (const m of roster) dexRecord(f, m, 'signed');
  return f;
}

// ------------------------------------------------------------ play stats (per season, the player's own calls)
/** Tally this game's calls: offense plays when we had the ball, defense plays when they did. */
export function recordPlayStats(f, gameState, side) {
  const ps = (f.playStats ||= {}); const year = f.season.year; const S = (ps[year] ||= {});
  for (const c of gameState.calls || []) {
    const mine = c.side === side ? c.off : c.def; if (!mine) continue;
    const e = (S[mine] ||= { used: 0, yards: 0, turnovers: 0, big: 0 });
    e.used += 1; e.yards += c.yards || 0; if (c.turnover) e.turnovers += 1; if ((c.yards || 0) >= 15) e.big += 1;
  }
}
/** {used, avg, turnovers, big} for a play this season (or all seasons with `{ career: true }`). */
export function playStat(f, playId, { career = false } = {}) {
  const years = career ? Object.values(f.playStats || {}) : [(f.playStats || {})[f.season?.year] || {}];
  const t = { used: 0, yards: 0, turnovers: 0, big: 0 };
  for (const y of years) { const e = y[playId]; if (e) { t.used += e.used; t.yards += e.yards; t.turnovers += e.turnovers; t.big += e.big; } }
  return { ...t, avg: t.used ? t.yards / t.used : null };
}

// ------------------------------------------------------------ the commissioner's office (GDD §15.6)
/** Saturday: if the club is still over the cap, the commissioner names the monsters the GM must choose between. */
export function commissionerReview(f) {
  const cap = salarySummary(f);
  if (!cap.over) { f.week.commissioner = null; return null; }
  const over = -cap.remaining;
  const picks = difficultyOf(f).commissionerPicks || 3;
  const sal = (m) => m.salary || salaryFor(m);
  // The cheapest monsters that would each, alone, bring the club under; failing that, the most expensive.
  const alone = f.roster.filter((m) => sal(m) >= over).sort((a, b) => sal(a) - sal(b));
  const names = (alone.length ? alone : f.roster.slice().sort((a, b) => sal(b) - sal(a))).slice(0, picks).map((m) => m.id);
  f.week.commissioner = { over, names, enough: alone.length > 0, visits: (f.week.commissioner?.visits || 0) + 1 };
  if (f.week.commissioner.visits === 1) news(f, `The commissioner has called you in: over the cap by ${Math.round(over).toLocaleString('en-US')} cr.`, 'loss');
  return f.week.commissioner;
}
/** Release one of the named monsters. Nothing comes back for it. Repeats until the club is under the cap. */
export function commissionerRelease(f, id) {
  const c = f.week.commissioner; if (!c) return { ok: false, reason: 'No review pending.' };
  if (!c.names.includes(id)) return { ok: false, reason: 'The commissioner named other monsters.' };
  const m = f.roster.find((x) => x.id === id); if (!m) return { ok: false, reason: 'Not on roster.' };
  f.roster = f.roster.filter((x) => x.id !== id);
  for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === id) delete f.lineupManual[slot];
  f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 }; f.campaign.commissionerReleases = (f.campaign.commissionerReleases || 0) + 1;
  news(f, `${m.name} released by order of the commissioner.`, 'loss');
  const again = commissionerReview(f);
  return { ok: true, released: m, done: !again };
}

// ------------------------------------------------------------ postseason story events (GDD §15.7)
function makePostseasonEvent(f) {
  const { r, save } = frng(f);
  const rec = record(f); const rival = f.rivals[f.tier]?.team || 'a rival';
  const star = f.roster.slice().sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
  const fit = rosterFit(f);
  const weakSide = ['offense', 'defense'].map((k) => ({ k, ...fit[k] })).filter((x) => x.coach && x.total).sort((a, b) => a.fit / a.total - b.fit / b.total)[0];
  const kinds = ['star_out', 'coordinator_offer'];
  if (weakSide && weakSide.fit / weakSide.total < 0.5) kinds.push('scheme_mutiny', 'scheme_mutiny');
  const kind = r.pick(kinds);
  const coordRole = kind === 'scheme_mutiny' && weakSide ? weakSide.role : r.pick(['offensive_coordinator', 'defensive_coordinator']);
  const coach = staffMember(f, coordRole);
  const other = r.pick(ALL_TEAMS.filter((t) => t !== f.club));
  save();
  const vars = { star: star?.name || 'your star', club: f.club, rival, record: `${rec.w}–${rec.l}`, coach: coach?.name || 'Your coordinator', role: coordRole, side: coordRole === 'offensive_coordinator' ? 'offense' : 'defense', other, scheme: coach?.style || 'my scheme', fit: weakSide?.fit ?? 0, total: weakSide?.total ?? 0 };
  return { kind, starId: star?.id || null, coordRole, vars, resolved: false, chosen: null };
}
const fillVars = (t, vars) => String(t).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
/** The pending event rendered for the UI, or null. */
export function postseasonEvent(f) {
  const e = f.postseason; if (!e || e.resolved) return null;
  const def = POSTSEASON_EVENTS[e.kind]; if (!def) return null;
  const options = def.options.map((o) => ({ ...o, label: fillVars(o.label, e.vars), text: fillVars(o.text, e.vars) }));
  if (difficultyOf(f) === DIFFICULTY.rookie && def.rookie) options.push({ ...def.rookie });
  return { kind: e.kind, title: def.title, speaker: def.speaker, lines: def.lines.map((l) => fillVars(l, e.vars)), options, vars: e.vars };
}
export function resolvePostseason(f, optionId) {
  const e = f.postseason; if (!e || e.resolved) return { ok: false, reason: 'No decision pending.' };
  const ev = postseasonEvent(f); if (!ev.options.find((o) => o.id === optionId)) return { ok: false, reason: 'Not an option.' };
  const star = f.roster.find((m) => m.id === e.starId); const coach = staffMember(f, e.coordRole); let text = '';
  const hireBest = (role, { preferScheme = null } = {}) => { const cands = STAFF.filter((c) => c.role === role && c.id !== f.staff[role]).sort((a, b) => (preferScheme ? (b.scheme === preferScheme) - (a.scheme === preferScheme) : 0) || b.overall - a.overall); const c = cands[0]; if (c) f.staff[role] = c.id; return c; };
  if (e.kind === 'star_out') {
    if (optionId === 'raise' && star) { star.salary = Math.round((star.salary || salaryFor(star)) * (1 + RAISE_PCT)); text = `${star.name} stays on a raise.`; }
    else if (optionId === 'promise' && star) { star.promise = { benched: 0 }; text = `${star.name} stays with a promised starting spot.`; }
    else if (optionId === 'release' && star) { f.roster = f.roster.filter((m) => m.id !== star.id); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === star.id) delete f.lineupManual[slot]; f.campaign.poached = f.campaign.poached || {}; f.campaign.poached[e.vars.rival] = star.name; text = `${star.name} signs with ${e.vars.rival}.`; }
    else text = `${star?.name || 'Your star'} stays.`;
  } else if (e.kind === 'coordinator_offer') {
    if (optionId === 'bonus' && coach) { f.pendingDeadCap = (f.pendingDeadCap || 0) + Math.round(coach.salary * RETENTION_BONUS_PCT); text = `${coach.name} stays; the bonus hits next season's cap.`; }
    else if (optionId === 'leave') { const c = hireBest(e.coordRole); text = `${coach?.name || 'Your coordinator'} leaves for ${e.vars.other}. ${c ? c.name + ' is hired.' : ''}`; }
    else text = `${coach?.name || 'Your coordinator'} stays.`;
  } else if (e.kind === 'scheme_mutiny') {
    if (optionId === 'scheme') { const want = bestSchemeFor(f, e.coordRole); const c = hireBest(e.coordRole, { preferScheme: want }); text = `${c ? c.name + ' (' + c.style + ') takes over' : 'No replacement found'}; ${coach?.name || 'the coordinator'} leaves without severance.`; }
    else if (optionId === 'fire' && coach) { f.pendingDeadCap = (f.pendingDeadCap || 0) + Math.round(coach.salary * 0.5); const c = hireBest(e.coordRole); text = `${coach.name} fired; ${c ? c.name + ' hired' : 'no replacement'}. Half their salary counts against next season.`; }
    else text = `${coach?.name || 'Your coordinator'} stays; the roster is on you.`;
  }
  e.resolved = true; e.chosen = optionId; news(f, `Postseason: ${text}`, 'info');
  return { ok: true, text };
}
/** Which scheme most of the side's starters fit (for "change the scheme to the roster"). */
function bestSchemeFor(f, role) {
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
  const offense = role === 'offensive_coordinator'; const slots = offense ? OFFENSE_SLOTS : DEFENSE_SLOTS;
  const schemes = offense ? ['pass', 'run', 'balanced'] : ['pressure', 'coverage', 'man'];
  const starters = slots.map((s) => byId[chart[s]]).filter(Boolean);
  return schemes.map((sc) => [sc, starters.filter((m) => schemeFit(m, offense ? { offense: sc } : { defense: sc })?.fits).length]).sort((a, b) => b[1] - a[1])[0][0];
}

// ------------------------------------------------------------ Legend Tracks (GDD §15.8)
/** Legendaries a champion may track: the four no club holds, plus gym legendaries whose badge the player holds; never one already unlocked or signed. */
export function legendChoices(f) {
  const held = Object.keys(f.campaign?.badges || {});
  const ids = [...FREE_LEGENDARIES, ...GYMS.filter((g) => held.includes(g.club)).map((g) => g.legendary)];
  return ids.filter((id) => !f.campaign?.unlocked?.[id] && !f.roster.some((m) => m.species === id)).map((id) => ({ id, tracks: f.campaign?.tracks?.[id] || 0, species: SPECIES_DEX.find((s) => s.id === id) }));
}
export function chooseLegendTrack(f, speciesId) {
  if (!f.legendPick || f.legendPick.resolved) return { ok: false, reason: 'No Legend Track to choose.' };
  if (!legendChoices(f).some((c) => c.id === speciesId)) return { ok: false, reason: 'Not available.' };
  f.campaign.tracks ||= {}; f.campaign.unlocked ||= {};
  f.campaign.tracks[speciesId] = (f.campaign.tracks[speciesId] || 0) + 1;
  const sp = SPECIES_DEX.find((s) => s.id === speciesId); const n = f.campaign.tracks[speciesId];
  let unlocked = false;
  if (n >= LEGEND_RULES.tracksNeeded) { f.campaign.unlocked[speciesId] = true; unlocked = true; news(f, `LEGEND UNLOCKED: ${sp.name} can now be scouted in ${(sp.regions || [])[0]}.`, 'win'); }
  else news(f, `Legend Track ${n} of ${LEGEND_RULES.tracksNeeded} toward ${sp.name}.`, 'win');
  f.legendPick.resolved = true; f.legendPick.chosen = speciesId;
  return { ok: true, tracks: n, unlocked, species: sp };
}

// ------------------------------------------------------------ campaign
/** The other coach's words before Sunday's game (GDD §15.5), or null on a bye. */
export function pregameTalk(f) {
  const opp = opponentName(f); if (!opp) return null;
  const gym = GYM_BY_CLUB[opp]; const rival = f.rivals[f.tier]?.team === opp;
  const h2h = f.campaign?.h2h?.[opp] || null;
  const state = dialogueState({ playoff: inPlayoffs(f), h2h, badgeHeld: !!badgeOf(f, opp) });
  const star = f.roster.slice().sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
  const vars = { club: f.club, me: opp, star: star?.name || 'star', badge: gym?.badge || '' };
  const seed = hashString(`${opp}|${f.season?.year}|${f.season?.week}|${f.seed}`);
  const kind = gym ? 'gym' : rival ? 'rival' : 'ordinary';
  const speaker = gym ? { name: gym.coach.name, portrait: gym.coach.portrait, hue: null, element: gym.element } : rival ? { name: f.rivals[f.tier].gm, portrait: `gm|${opp}`, hue: null } : { name: `${opp} head coach`, portrait: `hc|${opp}`, hue: null };
  return { ...pregameDialogue({ kind, club: opp, speaker, state, vars, seed }), kind, opponent: opp, reply: f.week.pregameReply || null, replies: REPLIES };
}
export function replyToCoach(f, replyId) {
  if (f.week.pregameReply) return { ok: false, reason: 'Already answered.' };
  if (!REPLIES.find((r) => r.id === replyId)) return { ok: false, reason: 'Unknown reply.' };
  f.week.pregameReply = replyId; return { ok: true };
}
/** Hall of Fame progress against the franchise's difficulty (GDD §15.9). */
export function hallOfFameProgress(f) {
  const c = f.campaign || { badges: {}, titles: 0, wins: 0, awards: 0 };
  const goals = difficultyOf(f).hofGoals;
  const have = { badges: Object.keys(c.badges || {}).length, titles: c.titles || 0, wins: c.wins || 0, awards: c.awards || 0 };
  const rows = Object.entries(goals).map(([k, goal]) => ({ key: k, have: have[k], goal, done: have[k] >= goal }));
  return { rows, eligible: rows.every((r) => r.done) };
}
export function badgeOf(f, club) { return f.campaign?.badges?.[club] || null; }
/** First time the checklist completes, the commissioner calls (returns true once). */
export function hallOfFameNotice(f) {
  if (!hallOfFameProgress(f).eligible || f.campaign?.hofNoticed) return false;
  f.campaign.hofNoticed = true; news(f, 'THE COMMISSIONER CALLED: you are eligible for the Hall of Fame. Retire whenever you choose; your career is written.', 'win');
  return true;
}
/** Retire: the career card that goes to the Hall of Fame. The caller stores it and ends the franchise. */
export function retire(f) {
  const p = hallOfFameProgress(f); if (!p.eligible) return { ok: false, reason: 'Not yet eligible for the Hall of Fame.' };
  const seasons = f.history.map((h) => ({ year: h.year, w: h.record.w, l: h.record.l, place: h.place, champion: h.champion === h.club, playoffs: h.playoffs }));
  const wins = seasons.reduce((a, h) => a + h.w, 0), losses = seasons.reduce((a, h) => a + h.l, 0);
  const best = f.roster.slice().sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, 5).map((m) => ({ name: m.name, species: m.species, position: m.position, ovr: monsterOverall(m), level: m.level }));
  const card = {
    id: `hof_${f.seed}_${Date.now().toString(36)}`, owner: `${f.owner.first} ${f.owner.last}`, portrait: f.owner.portrait, club: f.club, difficulty: f.settings?.difficulty || 'pro',
    seasons: seasons.length, record: { w: wins, l: losses }, titles: f.campaign.titles || 0, badges: Object.keys(f.campaign.badges || {}).map((club) => GYM_BY_CLUB[club]?.badge || club), awards: f.campaign.awards || 0,
    bestMonsters: best, dexSeen: dexCounts(f).seen, retiredAt: Date.now(), seasonsList: seasons, rival: f.rivals[f.tier]?.team || null, rivalRecord: f.rivals[f.tier]?.headToHead || null,
  };
  return { ok: true, card };
}

// ------------------------------------------------------------ Beast Dex
/** Mark a species as seen (scouted or faced) or signed; first time only, with the week it happened. */
export function dexRecord(f, m, how = 'seen') {
  f.dex ||= { seen: {}, signed: {} };
  const id = resolveSpecies(m).id; const stamp = { year: f.season?.year || 1, week: f.season?.week || 1, club: f.club };
  if (!f.dex.seen[id]) f.dex.seen[id] = stamp;
  if (how === 'signed' && !f.dex.signed[id]) f.dex.signed[id] = stamp;
  dexRecordGlobal(id, how, stamp); // the player's dex outlives this franchise
  if (m?.stage) { f.dex.forms ||= {}; if ((f.dex.forms[id] || 0) < m.stage) f.dex.forms[id] = m.stage; dexFormGlobal(id, m.stage); }
}
/** Status across the player's whole career (every franchise), or this franchise only with `{ franchiseOnly: true }`. */
export function dexStatus(f, id, { franchiseOnly = false } = {}) {
  const mine = !f?.dex ? 'unknown' : f.dex.signed[id] ? 'signed' : f.dex.seen[id] ? 'seen' : 'unknown';
  if (franchiseOnly) return mine;
  const all = dexStatusGlobal(id);
  return all === 'signed' || mine === 'signed' ? 'signed' : all === 'seen' || mine === 'seen' ? 'seen' : 'unknown';
}
/** Highest evolved stage of a species the player has seen (any franchise). */
export function dexFormSeen(f, id) { return Math.max(f?.dex?.forms?.[id] || 0, dexFormsGlobal()[id] || 0); }
export function dexCounts(f) {
  const ids = new Set(SPECIES_DEX.map((s) => s.id)); let seen = 0, signed = 0;
  for (const id of ids) { const st = dexStatus(f, id); if (st !== 'unknown') seen++; if (st === 'signed') signed++; }
  return { seen, signed };
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
  // Firing mid-season costs: the rest of the outgoing coach's salary stays on the books this season.
  let severance = 0;
  if (current && f.season && !f.season.finished) { severance = Math.round(current.salary * Math.max(0, (10 - (f.season.week || 1)) / 10)); f.deadCap = (f.deadCap || 0) + severance; }
  f.staff[c.role] = id;
  news(f, `${c.name} hired as ${c.role.replace(/_/g, ' ')}${current ? `, replacing ${current.name}` : ''}${severance ? ` (${severance.toLocaleString('en-US')} cr severance this season)` : ''}.`, 'roster');
  return { ok: true, replaced: current, severance };
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
/** How many starters fit each coordinator's scheme (the staff-screen line that makes "my players are run guys but my OC is a pass guy" visible). */
export function rosterFit(f) {
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
  const side = (slots, role) => { const starters = slots.map((s) => byId[chart[s]]).filter(Boolean); const fit = starters.filter((m) => fitFor(f, m)?.fits).length; const c = staffMember(f, role); return { fit, total: starters.length, scheme: c?.style || '—', coach: c?.name || null, role }; };
  return { offense: side(OFFENSE_SLOTS, 'offensive_coordinator'), defense: side(DEFENSE_SLOTS, 'defensive_coordinator') };
}
export function coachProfile(f) {
  const hc = staffMember(f, 'head_coach');
  return hc ? { aggression: hc.identity.aggression, passBias: hc.identity.passBias } : { aggression: 0.5, passBias: null };
}
/** The club's schemes, from its coordinators. */
export function clubSchemes(f) { return { offense: staffMember(f, 'offensive_coordinator')?.scheme || 'balanced', defense: staffMember(f, 'defensive_coordinator')?.scheme || 'coverage' }; }
export function fitFor(f, m) { return schemeFit(m, clubSchemes(f)); }
/** The coordinator's default six: a balanced mix from their playbook (used until the owner sets a plan). */
export function defaultPlan(f, side) {
  const cat = catalog(f, side); const has = (id, t) => PLAYS[id]?.tags.includes(t);
  const pick = (pred, n, taken) => cat.filter((id) => !taken.has(id) && pred(id)).slice(0, n);
  const taken = new Set(); const out = [];
  const add = (pred, n) => { for (const id of pick(pred, n, taken)) { taken.add(id); out.push(id); } };
  if (side === 'offense') {
    add((id) => PLAYS[id].type === 'run' && !has(id, 'trick'), 2);
    add((id) => PLAYS[id].type === 'pass' && (has(id, 'short') || has(id, 'quick')), 2);
    add((id) => PLAYS[id].type === 'pass' && (has(id, 'medium') || has(id, 'intermediate')), 1);
    add((id) => PLAYS[id].type === 'pass' && (has(id, 'deep') || has(id, 'shot')) && !has(id, 'desperation'), 1);
  } else {
    add((id) => has(id, 'pass') && !has(id, 'blitz') && !has(id, 'prevent') && !has(id, 'risky'), 3);
    add((id) => has(id, 'blitz') && !has(id, 'risky'), 1);
    add((id) => has(id, 'run') && !has(id, 'goalline'), 1);
    add((id) => has(id, 'goalline') || has(id, 'run'), 1);
  }
  add((id) => !has(id, 'desperation') && !has(id, 'prevent'), PLAN_SIZE - out.length);
  add(() => true, PLAN_SIZE - out.length);
  return out.slice(0, PLAN_SIZE);
}
export function catalog(f, side) {
  const role = side === 'offense' ? 'offensive_coordinator' : 'defensive_coordinator';
  const id = f.staff[role];
  const fallback = side === 'offense' ? PLAYBOOKS.oc_park : PLAYBOOKS.dc_ice;
  return (PLAYBOOKS[id] || fallback).filter((p) => PLAYS[p]);
}

// ------------------------------------------------------------ economy
export const ownerPerk = (f) => BACKGROUNDS[f?.owner?.background]?.perk || null;
export const capFor = (f) => Math.round(tierById(f.tier).cap * (ownerPerk(f) === 'cap' ? 1.04 : 1));
export function salarySummary(f, proposed = 0) {
  const monsters = f.roster.reduce((s, m) => s + (m.salary || salaryFor(m)), 0);
  const staff = Object.values(f.staff).reduce((s, id) => s + (staffById(id)?.salary || 0), 0);
  const dead = f.deadCap || 0; // severance for fired staff and retention bonuses, this season only
  const cap = capFor(f);
  const total = monsters + staff + dead + proposed;
  return { cap, monsters, staff, dead, proposed, total, remaining: cap - total, over: total > cap, rosterCount: f.roster.length };
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
/** Games are never locked by the cap itself; the commissioner's review on Saturday is what has to be settled (GDD §15.6). */
export function canPlayGames(f) { return !f.week?.commissioner; }

// ------------------------------------------------------------ team objects
export function playerTeam(f, { trainingBonus: tb = null } = {}) {
  const meta = TEAM_META[f.club];
  const plan = f.week.plan;
  const offense = plan.offense.length ? plan.offense : defaultPlan(f, 'offense');
  const defense = plan.defense.length ? plan.defense : defaultPlan(f, 'defense');
  const align = schemeAlignment(f);
  // Package rule (GDD §17.2): a play whose package needs a slot nobody legal can fill is unavailable this week.
  const avail = playAvailability(f);
  const offenseOk = offense.filter((id) => !avail.blocked[id]), defenseOk = defense.filter((id) => !avail.blocked[id]);
  const team = buildTeam({ id: f.club, name: f.club, abbr: meta.abbr, color: meta.color, roster: f.roster, manual: f.lineupManual, depth: f.depth, offensePlays: offenseOk.length ? offenseOk : offense, defensePlays: defenseOk.length ? defenseOk : defense, coach: coachProfile(f), trainingBonus: tb });
  team.blockedSlots = avail.slots; team.blockedPlays = Object.keys(avail.blocked).filter((id) => offense.includes(id) || defense.includes(id));
  team.forfeit = !offenseOk.length || !defenseOk.length || lineupProblems(f.roster, team.chart).length > 0;
  team.forfeitReason = lineupProblems(f.roster, team.chart).length ? `No legal monster for ${lineupProblems(f.roster, team.chart).join(', ')}` : !offenseOk.length ? 'Every offensive play in the plan needs a package you cannot field' : !defenseOk.length ? 'Every defensive play in the plan needs a package you cannot field' : null;
  { const lock = schemeLock(f); if (lock.offense || lock.defense) team.schemeLock = { offense: lock.offense, defense: lock.defense }; }
  // Scheme alignment: a small execution bonus/penalty on awareness for every starter.
  const bump = (side, pct) => { const delta = Math.round((pct - 80) / 10); for (const p of Object.values(team[side])) if (p.attrs.awareness) p.attrs.awareness = Math.max(1, Math.min(99, p.attrs.awareness + delta)); };
  bump('offense', align.offense); bump('defense', align.defense);
  // Per-monster boost ledger for the pregame screen: which starters carry a training or media-day boost today.
  team.boosts = {};
  if (tb) { const keys = Object.keys(tb); for (const side of ['offense', 'defense']) for (const p of Object.values(team[side])) if (p.id) (team.boosts[p.id] ||= {}).training = keys; }
  // Saturday media day: matching temperaments get a boost to their nature's strength and to awareness.
  // The pregame reply to the other coach adds one more point to one temperament (GDD §15.5).
  const reply = REPLIES.find((r) => r.id === f.week.pregameReply)?.effect || null;
  const md = f.week.media || (reply ? { boosts: {} } : null);
  if (md) {
    const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
    for (const side of ['offense', 'defense']) for (const p of Object.values(team[side])) {
      const m = byId[p.id]; if (!m || !p.attrs) continue;
      let amt = (md.boosts?.[temperamentOf(m.nature)] || 0) + (md.hype ? HYPE_BOOST : 0) + (md.star === m.id ? 2 : 0) + (reply && temperamentOf(m.nature) === reply.temperament ? reply.amount : 0);
      if (!amt) continue;
      const up = NATURES[m.nature]?.up || 'awareness';
      p.attrs[up] = Math.min(99, (p.attrs[up] || 0) + amt); if (up !== 'awareness') p.attrs.awareness = Math.min(99, (p.attrs.awareness || 0) + 1);
      (team.boosts[p.id] ||= {}).media = { amount: amt, attr: up };
    }
  }
  team.alignment = align;
  return team;
}
/** Deterministic AI club for a season (quality drifts per year; the rival is slightly better). */
/** Difficulty: how good and how smart the other 15 clubs are. */
/** Chosen at franchise creation and locked for its life (GDD §15.2). `hof` is the Hall of Fame bar at that difficulty (§15.9). */
/** Comeback mode (GDD §17): on Pro and All-Star, whichever side trails by 10+ in the fourth quarter gets +5 on every core rating. Symmetric, never on Rookie. */
export const COMEBACK = Object.freeze({ margin: 10, edge: 5 });
export function comebackRule(f) { return difficultyOf(f) === DIFFICULTY.rookie ? null : { ...COMEBACK }; }
/** Scheme lock (GDD §17): when every starter on a side fits the coordinator's scheme, that side plays with +3 on every core rating. */
export const SCHEME_LOCK_EDGE = 3;
export function schemeLock(f) { const rf = rosterFit(f); const on = (x) => x.total > 0 && x.fit === x.total; return { offense: on(rf.offense) ? SCHEME_LOCK_EDGE : 0, defense: on(rf.defense) ? SCHEME_LOCK_EDGE : 0, fit: rf }; }
export const DIFFICULTY = Object.freeze({
  rookie: { label: 'Rookie', quality: -4, iq: 0.6, text: 'Weaker clubs that call plays loosely.', hof: 'Hall of Fame: 8 badges, 1 title, 30 wins, 2 awards.', hofGoals: { badges: 8, titles: 1, wins: 30, awards: 2 }, commissionerPicks: 5 },
  pro: { label: 'Pro', quality: -1, iq: 1, text: 'The standard league. Comeback mode: a side down 10+ in the fourth quarter gets a lift — you included.', hof: 'Hall of Fame: 8 badges, 2 titles, 50 wins, 3 awards.', hofGoals: { badges: 8, titles: 2, wins: 50, awards: 3 }, commissionerPicks: 3 },
  allstar: { label: 'All-Star', quality: 3, iq: 1.5, text: 'Stronger clubs whose coaches read the situation sharply. Comeback mode on.', hof: 'Hall of Fame: 8 badges, 4 titles, 80 wins, 5 awards.', hofGoals: { badges: 8, titles: 4, wins: 80, awards: 5 }, commissionerPicks: 3 },
});
export const difficultyOf = (f) => DIFFICULTY[f?.settings?.difficulty] || DIFFICULTY.pro;
/** Club quality for a season: base by difficulty, gym tier, growth per season, the title raising the floor, and "studied tape" after the player first beats a gym (GDD §15.3, §15.8). */
export function clubQuality(f, name, year = f.season?.year || 1) {
  const tier = tierById(f.tier);
  const base = tier.id === 'challenger' ? 56 : tier.id === 'vanguard' ? 64 : 72;
  const h = hashString(`${name}|${f.seed}`); // a club's natural level is fixed for the franchise; seasons add growth on top
  const D = difficultyOf(f);
  const gym = GYM_BY_CLUB[name];
  const seasons = Math.max(0, year - 1);
  const growth = gym ? GYM_TIER[gym.tier] + seasons * GYM_GROWTH_PER_SEASON + (f.campaign?.gymWins?.[name] ? GYM_STUDIED_TAPE : 0) : seasons * ORDINARY_GROWTH_PER_SEASON;
  const floor = (f.campaign?.titles || 0) * 1; // every Beast Bowl the player wins lifts the whole league
  return Math.round(base + (h % 9) - 4 + (f.rivals[f.tier]?.team === name ? 2 : 0) + D.quality + growth + floor);
}
export function aiTeam(f, name, year = f.season?.year || 1, { scouting = null } = {}) {
  const meta = TEAM_META[name];
  const h = hashString(`${name}|${year}|${f.seed}`);
  const D = difficultyOf(f);
  const quality = clubQuality(f, name, year);
  const gym = GYM_BY_CLUB[name];
  const coach = gym
    ? { aggression: gym.coach.aggression, passBias: gym.coach.passBias, iq: D.iq + 0.2, identity: { offense: gym.coach.offense, defense: gym.coach.defense } }
    : { aggression: 0.35 + ((h >>> 8) % 40) / 100, passBias: 0.45 + ((h >>> 16) % 25) / 100, iq: D.iq };
  const rival = f.rivals[f.tier]?.team === name ? rivalSignature(f) : null;
  const evolveStage = gym ? (year >= 4 ? 2 : year >= 2 ? 1 : 0) : (year >= 5 ? 2 : year >= 3 ? 1 : 0);
  return generatedTeam(h, { id: name, name, abbr: meta.abbr, color: meta.color, quality, coach, scouting, element: gym?.element || null, legendary: gym?.legendary || null, signature: rival, evolveStage });
}
/** The rival GM's signature monster: the same species every season, a little stronger each year (GDD §15.8). */
export function rivalSignature(f) {
  const team = f.rivals[f.tier]?.team; if (!team) return null;
  const pool = SPECIES_DEX.filter((s) => s.evolution.length && ['QB', 'RB', 'WR', 'LB', 'CB', 'S'].includes(s.position)); // a signature that evolves as the years pass
  const sp = pool[hashString(`rival|${team}|${f.seed}`) % pool.length];
  const seasons = Math.max(0, (f.season?.year || 1) - 1);
  return { species: sp.id, bonus: 6 + seasons * 2, seasons };
}

// ------------------------------------------------------------ season
export function startSeason(f, year) {
  const records = Object.fromEntries(ALL_TEAMS.map((t) => [t, blankRecord()]));
  const lastRecords = f.season?.records || null;
  f.season = { year, week: 1, day: 0, records, results: [], playoffs: null, champion: null, finished: false, schedule: teamSchedule(year, f.club), leagueStats: {}, playoffStats: {}, recorded: [], expectations: {} };
  f.week = blankWeek();
  for (const m of f.roster) { m.fatigue = 0; if (m.yearsPro == null) m.yearsPro = Math.max(0, (m.age || 22) - 22); rolloverMonster(m, { year, team: f.club }); }
  // Preseason expectations for Coach of the Year: recorded now, never reconstructed from the final table (GDD §16.4).
  for (const team of ALL_TEAMS) {
    const talent = team === f.club ? teamOverall(playerTeam(f)) : teamOverall(aiTeam(f, team, year));
    const lr = lastRecords?.[team]; const lastWinPct = lr && lr.w + lr.l ? lr.w / (lr.w + lr.l) : null;
    f.season.expectations[team] = { talent, expectedWinPct: Math.max(0.1, Math.min(0.9, 0.5 + (talent - 60) * 0.025)), lastWinPct };
  }
}
/** Which plays are unavailable this week because their package needs a slot nobody legal can fill. {slots, blocked: {playId: slot}} */
export function playAvailability(f) {
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
  const slots = unavailableSlots(f.roster, chart);
  const blocked = {};
  if (slots.length) for (const [id, p] of Object.entries(PLAYS)) { const hit = (p.onField || []).find((sl) => slots.includes(sl)); if (hit) blocked[id] = hit; }
  return { slots, blocked };
}
/** Forfeit (GDD §17.2): no legal lineup, or no legal plays left. Recorded as a 0–21 loss, no stats, no experience. */
export function forfeitSunday(f) {
  const m = sundayMatchup(f); if (!m) return { ok: false, reason: 'No game today.' };
  const side = m.playerSide, oppSide = side === 'home' ? 'away' : 'home';
  const score = { [side]: 0, [oppSide]: 21 };
  const res = { week: f.season.week, home: m.home.name, away: m.away.name, homeScore: score.home, awayScore: score.away, ot: false, player: true, forfeit: true };
  f.week.gameResult = { ...res, won: false, playerScore: 0, oppScore: 21, opponent: m.opponent, tag: m.tag, forfeit: true };
  if (m.playoff) recordPlayoffResult(f, res); else { applyResult(f.season.records, res); f.season.results.push(res); const fx = currentFixture(f); fx.result = { playerScore: 0, oppScore: 21, won: false, forfeit: true }; }
  f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 }; f.campaign.h2h ||= {}; const h2h = (f.campaign.h2h[m.opponent] ||= { w: 0, l: 0, last: null, streakL: 0 }); h2h.l += 1; h2h.last = 'l'; h2h.streakL += 1;
  news(f, `FORFEIT: ${f.club} could not field a legal lineup against ${m.opponent}. Recorded as a 0–21 loss.`, 'loss');
  f.game = null; f.lastGame = { ...f.week.gameResult, events: [], year: f.season.year, week: f.season.week, newBadge: null };
  advanceWeek(f);
  return { ok: true, result: f.lastGame };
}
/** Spend one attribute point on a roster monster (GDD §17.3). */
export function spendAttributePoint(f, id, attr) { const m = f.roster.find((x) => x.id === id); if (!m) return { ok: false, reason: 'Not found.' }; return spendPoint(m, attr); }
/** Monsters with points waiting to be spent. */
export function unspentPoints(f) { return f.roster.filter((m) => (m.points || 0) > 0); }
/** The club's head coach by name (COY recipient). */
export function coachNameOf(f, team) { return headCoachName(team, { seed: f.seed, playerClub: f.club, playerCoach: staffMember(f, 'head_coach')?.name || null }); }
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
/** League-wide per-monster season stats (all 16 clubs) for award races. */
function simulateLeagueWeek(f) {
  const { r, save } = frng(f);
  const fixtures = leagueSeasonFixtures(f.season.year).find((w) => w.week === f.season.week);
  const results = [];
  if (fixtures && !fixtures.bye) {
    for (const g of fixtures.games) {
      if (g.home === f.club || g.away === f.club) continue;
      const home = aiTeam(f, g.home), away = aiTeam(f, g.away);
      const game = playGame({ home, away, seed: r.seed(), quarterLength: 180, comeback: comebackRule(f) });
      recordGame(f, game, { home, away }, { playoff: false });
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
/** Positions with fewer healthy monsters than depth-chart slots (base + package), thinnest first. */
export function shortPositions(f) {
  const out = [];
  for (const [g, slots] of Object.entries(GROUP_SLOTS)) { const healthy = f.roster.filter((m) => m.position === g && !m.injury).length; if (healthy < slots.length) out.push([g, slots.length - healthy]); }
  return out.sort((a, b) => b[1] - a[1]).map(([g]) => g);
}
export function scoutRegion(f, regionName) {
  if (f.season.day !== 0) return { ok: false, reason: 'Not Monday.' };
  const region = REGIONS[regionName]; if (!region) return { ok: false, reason: 'Unknown region.' };
  const scout = staffMember(f, 'head_scout');
  const skill = scout?.biomes?.[region.biome] ?? 50;
  const { r, save } = frng(f);
  const count = skill >= 80 ? 3 : skill >= 45 ? 2 : 1;
  const prospects = [];
  // Species come from the region's elements by rarity weight; rares only in their home region from their week.
  const unlocked = Object.keys(f.campaign?.unlocked || {}).map((id) => SPECIES_DEX.find((s) => s.id === id)).filter((sp) => sp && (sp.regions || [])[0] === regionName && !f.roster.some((m) => m.species === sp.id));
  const pool = [...regionSpecies(regionName, region.types, f.season.week), ...unlocked]; // a legendary with three Legend Tracks is scoutable in its home region
  const rarityBonus = skill >= 80 ? 1.6 : skill >= 60 ? 1.25 : 1;
  const weights = pool.map((sp) => [sp.id, (sp.rarity === 'common' ? 60 : sp.rarity === 'uncommon' ? 30 * rarityBonus : sp.rarity === 'legendary' ? 14 * rarityBonus : 9 * rarityBonus)]);
  for (let i = 0; i < count; i++) {
    const pickId = r.weighted(weights); const sp = pool.find((x) => x.id === pickId);
    const position = sp.secondary && r.chance(0.2) ? sp.secondary : sp.position;
    const quality = 52 + r.int(12) + (skill >= 80 ? 3 : 0) + (sp.rarity === 'legendary' ? 8 : sp.rarity === 'rare' ? 3 : sp.rarity === 'uncommon' ? 1 : 0);
    const m = generateMonster(r, { position, quality, species: sp.id });
    uniqueName(f, m, prospects.map((p) => p.monster.name));
    dexRecord(f, m, 'seen');
    const revealed = Math.min(6, (skill >= 85 ? 6 : skill >= 65 ? 4 : skill >= 40 ? 2 : 1) + (ownerPerk(f) === 'scouting' ? 1 : 0));
    prospects.push({ monster: m, revealed, natureKnown: skill >= 70, potentialKnown: skill >= 55 });
  }
  // Short-handed somewhere? The scout goes looking for that position too, so a thin spot never stays thin for want of a prospect (playtest round 3).
  const need = shortPositions(f).find((pos) => !prospects.some((p) => p.monster.position === pos));
  const needPool = need ? pool.filter((sp) => sp.position === need || sp.secondary === need) : [];
  if (need && needPool.length) {
    const sp = needPool[r.int(needPool.length)];
    const m = generateMonster(r, { position: need, quality: 50 + r.int(10), species: sp.id });
    uniqueName(f, m, prospects.map((p) => p.monster.name)); dexRecord(f, m, 'seen');
    prospects.push({ monster: m, revealed: Math.min(6, (skill >= 65 ? 4 : 2) + (ownerPerk(f) === 'scouting' ? 1 : 0)), natureKnown: skill >= 70, potentialKnown: skill >= 55, need: true });
  }
  save();
  f.week.region = regionName; f.week.prospects = prospects; f.week.recruitAttempts = 0; f.season.day = 1;
  return { ok: true, prospects, skill, scout: scout?.name || 'Your scout', need };
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
  const base = speciesName(m);
  for (const n of roman) { const cand = `${base} ${n}`; if (!taken.has(cand)) { m.name = cand; return m; } }
  m.name = `${base} ${f.roster.length + 1}`; return m;
}
/** Who could be released to make room/cap for a prospect (never the only one at a position, never a cornerstone). */
export function releaseCandidates(f, prospect) {
  const m = prospect.monster; const need = f.roster.length >= ROSTER_MAX;
  if (!need) return { needed: false, list: [], capWarning: salarySummary(f, m.salary).over };
  const list = f.roster.filter((x) => !x.cornerstone && (f.roster.filter((y) => y.position === x.position).length > 1 || x.position === m.position))
    .map((x) => ({ id: x.id, name: x.name, position: x.position, ovr: monsterOverall(x), salary: x.salary || salaryFor(x), capOk: !salarySummary(f, m.salary - (x.salary || salaryFor(x))).over }))
    .sort((a, b) => (a.position === m.position ? -1 : 0) - (b.position === m.position ? -1 : 0) || a.ovr - b.ovr);
  return { needed: true, reason: `Roster is full (${ROSTER_MAX}).`, list, capWarning: salarySummary(f, m.salary).over };
}
export function recruit(f, prospectIndex, approachId, { releaseId = null } = {}) {
  if (f.season.day !== 1) return { ok: false, reason: 'Not Tuesday.' };
  const p = f.week.prospects[prospectIndex]; if (!p) return { ok: false, reason: 'No such prospect.' };
  if (f.week.recruitAttempts >= 3) return { ok: false, reason: 'No attempts left this week.' };
  const m = p.monster;
  const rc = releaseCandidates(f, p);
  if (rc.needed && !releaseId) return { ok: false, reason: rc.reason, needRelease: true };
  if (rc.needed) { const cand = rc.list.find((c) => c.id === releaseId); if (!cand) return { ok: false, reason: 'That monster cannot be released.' }; }
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
    if (rc.needed && releaseId) { const out = f.roster.find((x) => x.id === releaseId); f.roster = f.roster.filter((x) => x.id !== releaseId); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === releaseId) delete f.lineupManual[slot]; news(f, `${out.name} released to make room for ${m.name}.`, 'roster'); }
    f.roster.push(m); dexRecord(f, m, 'signed'); f.week.recruited = m.id; f.week.prospects = []; f.season.day = 2;
    news(f, `${m.name} (${m.position}, ${monsterOverall(m)} OVR) signed from ${f.week.region}.`, 'roster');
    const cap = salarySummary(f);
    if (cap.over) news(f, `Over the salary cap by ${Math.round(-cap.remaining).toLocaleString('en-US')} cr. The commissioner reviews the books on Saturday.`, 'loss');
    return { ok: true, success: true, monster: m, overCap: cap.over };
  }
  if (f.week.recruitAttempts >= 3) { f.season.day = 2; return { ok: true, success: false, final: true }; }
  return { ok: true, success: false, final: false };
}
export function skipRecruit(f) { if (f.season.day === 1) { f.season.day = 2; f.week.prospects = []; } }
const scaledBonus = (b, k) => b && Object.fromEntries(Object.entries(b).map(([a, v]) => [a, Math.max(1, Math.round(v * k))]));
/** Practice intensity: bigger boosts cost more injury risk. */
export const INTENSITIES = Object.freeze({
  light: { label: 'Light', factor: 0.5, risk: 0.01, success: 0.06, fatigue: 4, text: 'Walk-through. Small boost, almost no risk, +4% fatigue.' },
  normal: { label: 'Normal', factor: 1, risk: 0.04, success: 0, fatigue: 8, text: 'A regular practice. +8% fatigue.' },
  full: { label: 'Full pads', factor: 1.6, risk: 0.09, success: -0.05, fatigue: 14, text: 'Big boost, real injury risk, +14% fatigue.' },
});
/** Practice tires the healthy roster; Saturday recovery (−28) takes a game plus a normal practice back to rested. */
export function practiceFatigue(roster, intensity = 'normal') {
  const I = INTENSITIES[intensity] || INTENSITIES.normal;
  for (const m of roster) { if (m.injury) continue; const stamina = speciesEffect(m)?.effect?.fatigue || 1; m.fatigue = Math.min(100, (m.fatigue || 0) + Math.round(I.fatigue * stamina)); }
}
/** How many weeks in a row the club has already practised this focus. */
export function trainingStreak(f, focus) { const h = f.trainingHistory || []; let n = 0; for (let i = h.length - 1; i >= 0 && h[i] === focus; i--) n++; return n; }
/** Odds shown before choosing: success chance, injury risk, bonus per attribute. */
export function trainingOdds(f, focus, intensity = 'normal') {
  const tr = staffMember(f, 'monster_trainer'); const I = INTENSITIES[intensity] || INTENSITIES.normal;
  const streak = trainingStreak(f, focus);
  let success = 0.82 + ((tr?.overall ?? 75) - 75) / 200 + I.success;
  if (streak >= 2) success *= streak >= 3 ? 0.25 : 0.42; // third week running: monsters tune it out
  if (f.rattled) success -= 0.12;
  if (ownerPerk(f) === 'training') success += 0.06;
  success = Math.max(0.05, Math.min(0.97, success));
  const base = Object.values(trainingBonus(tr, focus) || {})[0] || 1;
  return { success, risk: I.risk, amount: Math.max(1, Math.round(base * I.factor)), streak, factor: I.factor };
}
/** After Wednesday on a bye week the rest of the week is rest: straight to the bye. */
export function skipToByeIfIdle(f) { if (isBye(f) && f.season.day >= 3 && f.season.day < 6) { f.season.day = 6; news(f, 'Bye week: no opponent, no game plan, no press. Rest up.', 'info'); return true; } return false; }
export function setTraining(f, focus, intensity = 'normal') {
  if (f.season.day !== 2) return { ok: false, reason: 'Not Wednesday.' };
  if (!TRAINING_FOCI[focus]) return { ok: false, reason: 'Unknown focus.' };
  const odds = trainingOdds(f, focus, intensity);
  const { r, save } = frng(f);
  const success = r.chance(odds.success);
  let injury = null;
  if (r.chance(odds.risk)) {
    const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
    // Out-of-position starters are 1.75× as likely to be the one who gets hurt (GDD §17.2).
    const pool = Object.entries(chart).filter(([slot, id]) => id && slot !== 'K').map(([slot, id]) => [slot, f.roster.find((m) => m.id === id)]).filter(([, m]) => m && !m.injury);
    const mId = pool.length ? r.weighted(pool.map(([slot, mon]) => [mon.id, positionOf(slot) !== mon.position ? OUT_OF_POSITION_RISK : 1])) : null;
    const m = mId ? f.roster.find((x) => x.id === mId) : null;
    if (m) { const severity = r.chance(0.8) ? 'Minor' : 'Moderate'; const weeks = severity === 'Minor' ? 1 : 2; m.injury = { severity, weeks, type: r.pick(['hamstring', 'ankle', 'shoulder', 'wrist']) }; injury = { id: m.id, name: m.name, severity, weeks }; news(f, `${m.name} hurt in practice: ${severity}, out ${weeks} week${weeks === 1 ? '' : 's'}.`, 'injury'); }
  }
  save();
  practiceFatigue(f.roster, intensity);
  (f.trainingHistory ||= []).push(focus); if (f.trainingHistory.length > 12) f.trainingHistory.shift();
  f.week.trainingFocus = success ? focus : null; f.week.trainingFactor = odds.factor;
  f.week.training = { focus, intensity, success, injury, amount: odds.amount, fatigue: (INTENSITIES[intensity] || INTENSITIES.normal).fatigue }; f.rattled = false;
  f.season.day = 3; skipToByeIfIdle(f);
  return { ok: true, success, injury, amount: odds.amount, streak: odds.streak };
}
export function scoutOpponent(f, side) {
  if (f.season.day !== 3) return { ok: false, reason: 'Not Thursday.' };
  if (isBye(f)) return { ok: false, reason: 'Bye week: nobody to scout.' };
  const opp = opponentName(f);
  let report = null;
  if (opp) {
    const team = aiTeam(f, opp, undefined, { scouting: playerProfile(f, { opponent: opp }) }); // the same six they will bring on Sunday
    const str = teamStrengths(team);
    // Star = best starter by positional overall (the same rating shown everywhere else).
    const byId = Object.fromEntries(team.roster.map((m) => [m.id, m]));
    const best = (slots) => slots.map((slot) => ({ slot, m: byId[team.chart[slot]] })).filter((x) => x.m).map(({ slot, m }) => ({ slot, name: m.name, ovr: monsterOverall(m, { slotPosition: positionOf(slot) }) })).sort((a, b) => b.ovr - a.ovr)[0];
    report = side === 'offense'
      ? { side, passBias: Math.round(team.coach.passBias * 100), aggression: Math.round(team.coach.aggression * 100), pass: Math.round(str.pass), run: Math.round(str.run), star: best(OFFENSE_BASE), plays: [...team.offensePlays] }
      : { side, passD: Math.round(str.passD), runD: Math.round(str.runD), aggression: Math.round(team.coach.aggression * 100), star: best(DEFENSE_BASE), plays: [...team.defensePlays] };
    // Rematch scouting (GDD §15.8): a club you have faced before gives up one play from its other side too.
    const h2h = f.campaign?.h2h?.[opp];
    if ((h2h && (h2h.w + h2h.l) > 0) || ownerPerk(f) === 'analyst') { const other = side === 'offense' ? team.defensePlays : team.offensePlays; const h = hashString(`${opp}|${f.season.year}|${f.season.week}`); report.bonus = { side: side === 'offense' ? 'defense' : 'offense', play: other[h % other.length], games: h2h ? h2h.w + h2h.l : 0, analyst: !h2h }; }
  }
  f.week.scoutReport = report; f.season.day = 4;
  return { ok: true, report };
}
export function setGamePlan(f, offense, defense) {
  const catO = catalog(f, 'offense'), catD = catalog(f, 'defense');
  const o = [...new Set(offense)].filter((id) => catO.includes(id)), d = [...new Set(defense)].filter((id) => catD.includes(id));
  if (o.length !== PLAN_SIZE || d.length !== PLAN_SIZE) return { ok: false, reason: `Pick exactly ${PLAN_SIZE} offensive and ${PLAN_SIZE} defensive plays.` };
  f.week.plan = { offense: o, defense: d }; f.lastPlan = { offense: [...o], defense: [...d] };
  if (f.season.day === 4) f.season.day = 5;
  return { ok: true };
}
/** Saturday: three press questions for this week (a rival question when it's the rival game). */
export function mediaQuestions(f) {
  if (!f.week.mediaQs) {
    const { r, save } = frng(f);
    const rivalGame = !!sundayMatchup(f)?.rival;
    const pool = QUESTIONS.map((q, i) => ({ q, i })).filter(({ q }) => !q.rival);
    const picks = [];
    if (rivalGame) picks.push(QUESTIONS.findIndex((q) => q.rival));
    while (picks.length < 3 && pool.length) picks.push(pool.splice(r.int(pool.length), 1)[0].i);
    save(); f.week.mediaQs = picks;
  }
  const m = sundayMatchup(f); const rec = record(f); const star = mediaStar(f);
  const fill = (t) => t.replace('{opp}', m?.opponent || 'our opponent').replace('{rival}', f.rivals[f.tier]?.team || 'your rival').replace('{star}', star?.name || 'your star').replace('{record}', `${rec.w}–${rec.l}`);
  return f.week.mediaQs.map((i) => ({ id: i, q: fill(QUESTIONS[i].q), a: QUESTIONS[i].a.map((a) => ({ ...a, text: fill(a.text) })) }));
}
function mediaStar(f) { return f.roster.filter((m) => !m.injury).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0] || null; }
/** Answers: array of answer indexes, one per question. Boosts apply on Sunday. */
export function answerMedia(f, answers) {
  const qs = mediaQuestions(f); const boosts = {}; let hype = false; let star = null;
  qs.forEach((q, k) => { const a = q.a[answers[k]]; if (!a) return; boosts[a.t] = Math.min(MEDIA_CAP, (boosts[a.t] || 0) + MEDIA_BOOST); if (a.hype) hype = true; if (a.star) star = mediaStar(f)?.id || null; });
  f.week.media = { answers, boosts, hype, star };
  lineupCheck(f); // Saturday is done: lineup confirmed, on to Sunday
  const groups = Object.entries(boosts).map(([t, v]) => `${TEMPERAMENTS[t].label} +${v}`).join(', ');
  news(f, `Media day: ${groups || 'no headlines'}${hype ? ' · you talked trash before the rival game' : ''}.`, 'info');
  return { ok: true, boosts, hype, star };
}
/**
 * Let the staff run the rest of the week with sensible defaults: the scout picks
 * the best region for their skills, recruiting only signs a clear upgrade that fits
 * the cap, training rotates focus at normal intensity, the opponent's weaker side is
 * scouted, the coordinators keep last week's plan (or their defaults), and media day
 * gets safe answers. Stops on Sunday. Returns a summary of what was done.
 */
export function autoRunToSunday(f) {
  if (f.week?.commissioner) return { ok: false, reason: 'The commissioner is waiting for your decision.', did: [] };
  const did = [];
  let guard = 0;
  while (f.season.day < 6 && guard++ < 10) {
    const day = f.season.day;
    if (isBye(f) && day >= 3) { f.season.day = 6; did.push('Bye week: rested'); break; }
    if (day === 0) { const scout = staffMember(f, 'head_scout'); const best = Object.entries(REGIONS).sort((a, b) => (scout?.biomes?.[b[1].biome] ?? 50) - (scout?.biomes?.[a[1].biome] ?? 50))[0][0]; const r = scoutRegion(f, best); did.push(`Scouted ${best}: ${r.prospects?.length || 0} prospects`); }
    else if (day === 1) {
      const pick = f.week.prospects.map((p, i) => ({ p, i })).filter(({ p }) => p.revealed >= 4 && !salarySummary(f, p.monster.salary).over && f.roster.length < ROSTER_MAX)
        .map((x) => ({ ...x, gain: monsterOverall(x.p.monster) - Math.max(0, ...f.roster.filter((m) => m.position === x.p.monster.position).map((m) => monsterOverall(m))) }))
        .filter((x) => x.gain >= 2).sort((a, b) => b.gain - a.gain)[0];
      if (pick) { const r = recruit(f, pick.i, 'development'); did.push(r.success ? `Signed ${pick.p.monster.name}` : `${pick.p.monster.name} turned us down`); if (f.season.day === 1) skipRecruit(f); }
      else { skipRecruit(f); did.push('Passed on the prospects'); }
    }
    else if (day === 2) { const order = ['passing', 'rushing', 'coverage', 'pass_rush']; const last = (f.trainingHistory || []).slice(-1)[0]; const focus = order[(order.indexOf(last) + 1) % order.length]; const r = setTraining(f, focus, 'normal'); did.push(`${TRAINING_FOCI[focus].label} practice ${r.success ? 'went well' : 'was sloppy'}${r.injury ? `; ${r.injury.name} hurt` : ''}`); }
    else if (day === 3) { const opp = opponentName(f); const side = opp ? (teamStrengths(aiTeam(f, opp)).passD < teamStrengths(aiTeam(f, opp)).runD ? 'defense' : 'offense') : 'offense'; scoutOpponent(f, side); did.push(opp ? `Scouted ${opp}'s ${side}` : 'Bye week'); }
    else if (day === 4) { const o = f.week.plan.offense.length ? f.week.plan.offense : (f.lastPlan?.offense || defaultPlan(f, 'offense')); const d = f.week.plan.defense.length ? f.week.plan.defense : (f.lastPlan?.defense || defaultPlan(f, 'defense')); setGamePlan(f, o, d); did.push('Coordinators set the game plan'); }
    else if (day === 5) { const qs = mediaQuestions(f); answerMedia(f, qs.map((q) => Math.max(0, q.a.findIndex((a) => a.t === 'steady' || a.t === 'calm')))); did.push('Press conference: safe answers'); }
  }
  news(f, `Staff ran the week: ${did.join(' · ')}.`, 'info');
  return { ok: true, did };
}
export function lineupCheck(f, { advance = true } = {}) {
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth);
  const problems = lineupProblems(f.roster, chart);
  const tired = f.roster.filter((m) => Object.values(chart).includes(m.id) && m.fatigue >= 60).map((m) => m.name);
  const injured = f.roster.filter((m) => m.injury).map((m) => `${m.name} (${m.injury.severity}, ${m.injury.weeks} wk)`);
  if (advance) { f.week.lineupChecked = true; if (f.season.day === 5) { f.season.day = 6; recoverWeek(f.roster); commissionerReview(f); } }
  return { ok: problems.length === 0, problems, borrowed: borrowedSlots(f.roster, chart), tired, injured, chart, commissioner: f.week.commissioner || null };
}
/** Put a monster into a slot by moving them to that slot's place in the position's depth order. */
export function assignSlot(f, slot, monsterId) {
  const group = positionOf(slot); f.depth ||= {};
  for (const s of GROUP_SLOTS[group] || [slot]) delete f.lineupManual[s];
  if (monsterId == null) { delete f.depth[group]; return { ok: true }; }
  const m = f.roster.find((x) => x.id === monsterId); if (!m) return { ok: false, reason: 'Unknown monster.' };
  const list = depthList(f, group).filter((id) => id !== monsterId);
  // Index among HEALTHY monsters, so injured ones ahead of the slot don't push the pick down.
  let idx = (GROUP_SLOTS[group] || [slot]).indexOf(slot), pos = 0, healthy = 0;
  while (pos < list.length && healthy < idx) { const x = f.roster.find((r) => r.id === list[pos]); if (x && !x.injury) healthy++; pos++; }
  list.splice(pos, 0, monsterId);
  f.depth[group] = list;
  return { ok: true };
}
/** Depth chart: the full order for a position group (ids). */
export function depthList(f, group) { return depthOrder(f.roster, f.depth, group).map((m) => m.id); }
/** Move a monster up (-1) or down (+1) its position group's depth order. Clears legacy manual picks for that group. */
export function moveDepth(f, group, monsterId, dir) {
  f.depth ||= {};
  const list = depthList(f, group); const i = list.indexOf(monsterId); const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: false };
  [list[i], list[j]] = [list[j], list[i]];
  f.depth[group] = list;
  for (const slot of GROUP_SLOTS[group]) delete f.lineupManual[slot];
  return { ok: true };
}

/** The Sunday matchup as team objects (home/away correct) for the game module. */
/** What the league has seen of the owner's club this season (play-calling tendencies). Opponents use it to prepare. */
export function playerProfile(f, { opponent = null } = {}) {
  const S = f.season.scouting || []; if (!S.length) return null;
  const vs = opponent ? S.filter((g) => g.opponent === opponent) : [];
  const games = vs.length ? vs : S.slice(-4); // a repeat opponent remembers that game; everyone else reads the recent film
  const offense = {}, defense = {}; let passes = 0, plays = 0;
  for (const g of games) { for (const [id, n] of Object.entries(g.offense)) offense[id] = (offense[id] || 0) + n; for (const [id, n] of Object.entries(g.defense)) defense[id] = (defense[id] || 0) + n; passes += g.passes; plays += g.plays; }
  const D = DIFFICULTY[f.settings?.difficulty] || DIFFICULTY.pro;
  return { games: games.length, offense, defense, passRate: plays ? passes / plays : 0.5, rematch: vs.length > 0, swaps: D.iq >= 1.5 ? 3 : D.iq < 1 ? 1 : 2 };
}
export function sundayMatchup(f) {
  const fx = currentFixture(f); const po = playoffFixture(f);
  let home, away, oppName, tag;
  if (po) { oppName = po.home === f.club ? po.away : po.home; home = po.home; away = po.away; tag = po.tag; }
  else if (fx && !fx.bye) { oppName = fx.opponent; home = fx.home ? f.club : oppName; away = fx.home ? oppName : f.club; tag = `Week ${fx.week} · ${fx.category}`; }
  else return null;
  const mine = playerTeam(f, { trainingBonus: f.week.trainingFocus ? scaledBonus(trainingBonus(staffMember(f, 'monster_trainer'), f.week.trainingFocus), f.week.trainingFactor ?? 1) : null });
  const theirs = aiTeam(f, oppName, undefined, { scouting: playerProfile(f, { opponent: oppName }) });
  const rival = f.rivals[f.tier]?.team === oppName;
  return { home: home === f.club ? mine : theirs, away: away === f.club ? mine : theirs, playerSide: home === f.club ? 'home' : 'away', opponent: oppName, tag, rival, playoff: !!po, forfeit: !!mine.forfeit, forfeitReason: mine.forfeitReason || null };
}

/** Record the player's finished game and roll the week forward. */
export function finishSunday(f, gameState) {
  const m = sundayMatchup(f); if (!m) return;
  const side = m.playerSide, oppSide = side === 'home' ? 'away' : 'home';
  for (const x of m[oppSide].roster) dexRecord(f, x, 'seen'); // every monster you face goes in the dex
  const won = gameState.winner === side;
  const res = { week: f.season.week, home: m.home.name, away: m.away.name, homeScore: gameState.score.home, awayScore: gameState.score.away, ot: !!gameState.ot, player: true };
  const { r, save } = frng(f);
  const events = afterGame(f.roster, m[side].chart, gameState.stats[side].players, r, { won, autoSpend: !!f.settings.autoPoints });
  save();
  f.week.events = events;
  f.week.gameResult = { ...res, won, playerScore: gameState.score[side], oppScore: gameState.score[oppSide], opponent: m.opponent, tag: m.tag };
  { const offense = {}, defense = {}; let passes = 0, plays = 0;
    for (const c of gameState.calls || []) { if (c.side === side) { offense[c.off] = (offense[c.off] || 0) + 1; plays++; if (PLAYS[c.off]?.type === 'pass') passes++; } else defense[c.def] = (defense[c.def] || 0) + 1; }
    (f.season.scouting ||= []).push({ week: f.season.week, opponent: m.opponent, offense, defense, passes, plays }); }
  if (m.rival) { f.rivals[f.tier].headToHead[won ? 'w' : 'l'] += 1; news(f, won ? `RIVALRY WIN over ${m.opponent} — GM ${f.rivals[f.tier].gm} will remember this.` : `${m.opponent}'s GM ${f.rivals[f.tier].gm} gets bragging rights this time.`, won ? 'win' : 'loss'); 
    if (f.week.media?.hype) { if (won) news(f, 'You backed up the trash talk. The locker room loves it.', 'win'); else { f.rattled = true; news(f, 'The trash talk backfired. The team is rattled: next week\'s practice is harder.', 'loss'); } }
  }
  recordGame(f, gameState, { home: m.home, away: m.away }, { playoff: !!m.playoff });
  if (m.playoff) { recordPlayoffResult(f, res); }
  else { applyResult(f.season.records, res); f.season.results.push(res); const fx = currentFixture(f); fx.result = { playerScore: gameState.score[side], oppScore: gameState.score[oppSide], won }; }
  news(f, `${won ? 'WIN' : 'LOSS'} ${gameState.score[side]}–${gameState.score[oppSide]} vs ${m.opponent}${gameState.ot ? ' (OT)' : ''}.`, won ? 'win' : 'loss');
  // Promised starters: three games on the bench and they walk (GDD §15.7).
  for (const x of f.roster.filter((p) => p.promise)) {
    if (!Object.values(m[side].chart).includes(x.id)) { x.promise.benched += 1; if (x.promise.benched >= PROMISE_BENCH_LIMIT) { f.roster = f.roster.filter((p) => p.id !== x.id); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === x.id) delete f.lineupManual[slot]; news(f, `${x.name} walked out: you promised a starting spot and benched them ${PROMISE_BENCH_LIMIT} times.`, 'loss'); } else news(f, `${x.name} was promised a start and sat (${x.promise.benched}/${PROMISE_BENCH_LIMIT}).`, 'loss'); }
  }
  // Campaign: career wins, head-to-head memory (drives the pregame dialogue) and gym badges (first win over a gym club, in any counting game; no replays).
  f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 };
  if (won) f.campaign.wins += 1;
  f.campaign.h2h ||= {}; const h2h = (f.campaign.h2h[m.opponent] ||= { w: 0, l: 0, last: null, streakL: 0 });
  h2h[won ? 'w' : 'l'] += 1; h2h.last = won ? 'w' : 'l'; h2h.streakL = won ? 0 : h2h.streakL + 1;
  // The pregame reply: a confident word backed up is remembered; one that wasn't rattles the room.
  if (f.week.pregameReply === 'confident') { if (won) news(f, `You said you'd take it, and you did. ${m.opponent}'s coach will remember.`, 'win'); else { f.rattled = true; news(f, 'The confident talk before the game didn\'t age well. Next week\'s practice is harder.', 'loss'); } }
  const gym = GYM_BY_CLUB[m.opponent];
  if (gym && won) {
    f.campaign.gymWins[m.opponent] = (f.campaign.gymWins[m.opponent] || 0) + 1;
    if (!f.campaign.badges[m.opponent]) { f.campaign.badges[m.opponent] = { year: f.season.year, week: f.season.week, score: `${gameState.score[side]}–${gameState.score[oppSide]}` }; f.campaign.lastBadge = { club: m.opponent, year: f.season.year, week: f.season.week, n: Object.keys(f.campaign.badges).length }; news(f, `BADGE EARNED: the ${gym.badge} — badge ${Object.keys(f.campaign.badges).length} of 8. ${gym.coach.name}'s ${m.opponent} fall to ${f.club} ${gameState.score[side]}–${gameState.score[oppSide]}.`, 'win'); }
  }
  for (const e of events) news(f, e.kind === 'levelup' ? `${e.name} reached level ${e.level} (${e.from} → ${e.to} OVR)${f.settings.autoPoints ? '' : ' — 2 attribute points to spend on the roster'}.` : e.kind === 'evolve' ? `EVOLUTION! ${e.from} evolved into ${e.to}.` : e.kind === 'injury' ? `${e.name} injured: ${e.severity}, out ${e.weeks} week${e.weeks === 1 ? '' : 's'}.` : e.name, e.kind === 'evolve' ? 'win' : e.kind);
  for (const e of events) if (e.kind === 'evolve') { const x = f.roster.find((p) => p.id === e.id); if (x) dexRecord(f, x, 'signed'); }
  f.game = null;
  recordPlayStats(f, gameState, side);
  f.lastGame = { ...f.week.gameResult, events, year: f.season.year, week: f.season.week, newBadge: f.campaign.badges[m.opponent]?.year === f.season.year && f.campaign.badges[m.opponent]?.week === f.season.week && won ? m.opponent : null };
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
  if (bye) recoverWeek(f.roster, { bye: true }); // a normal week recovers on Saturday, so the week shows the fatigue from Sunday
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
  finalizeAwards(f);
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
    const home = aiTeam(f, g.home), away = aiTeam(f, g.away);
    const game = playGame({ home, away, seed: r.seed(), quarterLength: 180, comeback: comebackRule(f) });
    recordGame(f, game, { home, away }, { playoff: true });
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
  if (champion === f.club) { f.badges[f.tier] += 1; f.qualification[f.tier] += 1; f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 }; f.campaign.titles += 1; news(f, `BEAST BOWL CHAMPIONS! ${f.club} win the ${tierById(f.tier).name} title.`, 'win'); }
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
  if (rec.w < rec.l) f.postseason = makePostseasonEvent(f); // a losing record makes one story event mandatory (GDD §15.7)
  if (champion === f.club && legendChoices(f).length) f.legendPick = { year: s.year, resolved: false }; // Beast Bowl champions choose a Legend Track (GDD §15.8)
  // Campaign: league awards won by this club's monsters count toward the Hall of Fame.
  f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 };
  f.campaign.awards += Object.values(s.awards.league || {}).filter((w) => w && w.team === f.club).length;
  s.finished = true;
}
export const TIERS_ENABLED = false;

/**
 * Award races (GDD §16.4): computed from the regular-season league table by
 * src/franchise/awards.js. Once the regular season ends the result is frozen
 * (f.season.awardsFinal) so playoff games cannot move it.
 */
export function awardRaces(f, { n = 3 } = {}) {
  if (f.season.awardsFinal) return Object.fromEntries(Object.entries(f.season.awardsFinal.races).map(([k, v]) => [k, Array.isArray(v) ? v.slice(0, n) : v]));
  const res = computeAwards({ table: f.season.leagueStats, records: f.season.records, expectations: f.season.expectations || {}, coachOf: (t) => coachNameOf(f, t), n });
  return res;
}
/** Freeze the regular-season awards (called when the playoffs are drawn). */
export function finalizeAwards(f) {
  if (f.season.awardsFinal) return f.season.awardsFinal;
  const races = computeAwards({ table: f.season.leagueStats, records: f.season.records, expectations: f.season.expectations || {}, coachOf: (t) => coachNameOf(f, t), n: 5 });
  f.season.awardsFinal = { year: f.season.year, races, winners: Object.fromEntries(Object.entries(AWARDS).map(([k]) => [k, races[k]?.[0] || null])) };
  for (const [k, w] of Object.entries(f.season.awardsFinal.winners)) if (w) news(f, `${AWARDS[k].short}: ${w.name}${w.team ? ` (${w.team})` : ''}${w.team === f.club ? ' — one of yours!' : ''}.`, w.team === f.club ? 'win' : 'info');
  return f.season.awardsFinal;
}
export function seasonAwards(f) {
  const s = f.season; const st = leagueStandings(f); const rec = record(f);
  const L = (m) => monsterLine(m, 'season', 'reg');
  const byStat = (key) => f.roster.slice().sort((a, b) => (L(b)[key] || 0) - (L(a)[key] || 0))[0];
  const line = (m, key, label) => m && (L(m)[key] || 0) > 0 ? { id: m.id, name: m.name, position: m.position, value: L(m)[key], label } : null;
  const mvpScore = (m) => { const x = L(m); return (x.passYds || 0) / 14 * 10 + (x.rushYds || 0) + (x.recYds || 0) + ((x.passTd || 0) + (x.rushTd || 0) + (x.recTd || 0)) * 20 + ((x.tackles || 0) + (x.assists || 0) * 0.5) * 4 + (x.sacks || 0) * 12 + (x.int || 0) * 15 + (x.rec || 0) * 2 + (x.pd || 0) * 4; };
  const mvp = f.roster.slice().sort((a, b) => mvpScore(b) - mvpScore(a))[0];
  const rival = f.rivals[f.tier];
  const rivalGames = s.schedule.filter((g) => g.opponent === rival?.team && g.result);
  return {
    year: s.year, club: f.club, record: { w: rec.w, l: rec.l, t: rec.t }, place: st.overall.indexOf(f.club) + 1,
    champion: s.champion, playoffs: !!s.playoffs?.seeds && Object.values(s.playoffs.seeds).flat().includes(f.club),
    mvp: mvp && mvpScore(mvp) > 0 ? { id: mvp.id, name: mvp.name, position: mvp.position, score: mvpScore(mvp) } : null,
    rusher: line(byStat('rushYds'), 'rushYds', 'rushing yards'), receiver: line(byStat('recYds'), 'recYds', 'receiving yards'), passer: line(byStat('passYds'), 'passYds', 'passing yards'),
    tackler: line(byStat('tackles'), 'tackles', 'solo tackles'), ballhawk: line(byStat('int'), 'int', 'interceptions'), rusherD: line(byStat('sacks'), 'sacks', 'sacks'),
    league: Object.fromEntries(Object.entries(AWARDS).map(([k]) => [k, (f.season.awardsFinal || finalizeAwards(f)).winners[k] || null])),
    leaders: leadersSnapshot(f.season.leagueStats), playoffLeaders: leadersSnapshot(f.season.playoffStats),
    rivalry: rival ? { team: rival.team, gm: rival.gm, wins: rivalGames.filter((g) => g.result.won).length, games: rivalGames.length, swept: rivalGames.length === 2 && rivalGames.every((g) => g.result.won) } : null,
  };
}
function ensureRival(f) { if (!f.rivals[f.tier]) { const { r, save } = frng(f); const choices = DIVISIONS[divisionOf(f.club)].filter((t) => t !== f.club); const team = r.pick(choices); save(); f.rivals[f.tier] = { team, gm: RIVAL_GMS[team] || 'Rival GM', headToHead: { w: 0, l: 0 } }; } }
export function startNextSeason(f) {
  if (!f.season.finished) return { ok: false, reason: 'The season is not over.' };
  if (f.postseason && !f.postseason.resolved) return { ok: false, reason: 'A postseason decision is waiting.' };
  if (f.legendPick && !f.legendPick.resolved) return { ok: false, reason: 'Choose your Legend Track first.' };
  f.deadCap = f.pendingDeadCap || 0; f.pendingDeadCap = 0; // bonuses and raises agreed in the offseason land on the new season's books
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
  const game = playGame({ home: m.home, away: m.away, seed: r.seed(), quarterLength: f.settings.quarterLength, comeback: comebackRule(f) });
  save();
  return game;
}

export function summary(f) {
  const rec = record(f);
  return { club: f.club, tier: tierById(f.tier).name, year: f.season.year, week: f.season.week, day: DAYS[f.season.day], record: `${rec.w}–${rec.l}${rec.t ? '–' + rec.t : ''}`, overall: teamOverall(playerTeam(f)), cap: salarySummary(f) };
}
