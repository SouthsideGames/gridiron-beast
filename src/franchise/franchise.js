// The franchise: owner, club, staff, roster, weekly loop, season, league
// simulation, progression and economy. One plain state object; every
// mutation goes through a function here so the UI stays thin.

import { venueFor } from '../data/stadiums.js';
import { noteJoin, markCareerFresh, noteEvolution, careerAfterGame, careerSeasonEnd, noteHallOfFame, backfillCareer, careerTimeline, careerSummary } from './career.js';
import { syncLegendaryPlays, legendaryAvailable, legendaryStatus, equipLegendaryForAI, legendOf, LEGENDARY_IDS } from './legendary.js';
import { createRng, rngFromState, hashString } from '../core/rng.js';
import { recordGame, ensureStats, rolloverMonster, leadersSnapshot, monsterLine, updateSeasonRecords, archiveSeasonTables } from './stats.js';
import { AWARDS, computeAwards, headCoachName } from './awards.js';
import { newContract, contractEnds, renewalAsk, acceptsCounter, staffSalary, openOffseason, offseasonPending, offseasonReady, CONTRACT_YEARS, COUNTER_PCT, STAFF_RAISE } from './contracts.js';
export { offseasonPending, offseasonReady, renewalAsk, CONTRACT_YEARS } from './contracts.js';
import { openDraftClass, scoutDraftClass as draftScout, startDraft as draftStart, advanceDraft as draftAdvance, playerPick as draftPlayerPick, passPick as draftPassPick, prospectView, injectDraftees, ageDraftees, onTheClock, DRAFT_ROUNDS, ROOKIE_SCALE } from './draft.js';
export { prospectView, onTheClock, DRAFT_ROUNDS, ROOKIE_SCALE } from './draft.js';
import { ensureBoard, goalOffers, needsGoal, chooseGoal as boardChooseGoal, settleGoal, onHotSeat, isFired, scoutBonusActive, confidenceLabel, boardForecast } from './board.js';
export { needsGoal, onHotSeat, isFired, confidenceLabel } from './board.js';
export { AWARDS } from './awards.js';
export { MEDIA_BOOST, MEDIA_CAP, HYPE_BOOST } from '../data/media.js';
export { pickKey, currentClassYear, tradableYears, ASKS_PER_PICK, TRADE_YEARS_AHEAD, pickValue, describePick, canTakePlayer } from './trades.js';
export * as Stats from './stats.js';
export { GROUP_SLOTS } from './roster.js';
import { DIVISIONS, ALL_TEAMS, TEAM_META, STARTER_CLUBS, RIVAL_GMS, TIERS, tierById, leagueSeasonFixtures, teamSchedule, blankRecord, applyResult, standings, playoffRound, divisionOf, conferenceFor } from '../data/league.js';
import { STAFF, STAFF_ROLES, PLAYBOOKS, staffById, alignment, trainingBonus, REGIONS, TRAINING_FOCI, BACKGROUNDS } from '../data/staff.js';
import { createRoster, generateMonster, monsterOverall, schemeFit, evolutionReady, nextEvolution, tryEvolve, autoSpendPoints as autoSpendPointsFn, ROSTER_MAX, ROSTER_MIN, CORNERSTONES, NATURES, salaryFor, regionSpecies, resolveSpecies, speciesName, speciesEffect, spendPoint, FULL_ROSTER } from '../data/monsters.js';
import { ELEMENT_REGIONS } from '../data/species.js';
export { ROSTER_MAX, ROSTER_MIN } from '../data/monsters.js';
import { SPECIES_DEX, LEGEND_RULES } from '../data/species.js';
import { dexRecordGlobal, dexStatusGlobal, dexFormGlobal, dexFormsGlobal, noteNewFranchise } from './dex-store.js';
import { GYMS, GYM_BY_CLUB, GYM_TIER, GYM_GROWTH_PER_SEASON, GYM_STUDIED_TAPE, ORDINARY_GROWTH_PER_SEASON, FREE_LEGENDARIES } from '../data/gyms.js';
import { PLAYS } from '../data/playbook.js';
import { yearOf } from '../data/calendar.js';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import { recordAchievementGlobal } from './achievement-store.js';
import { pickOwner, setPickOwner, currentClassYear, picksOwnedBy, pickUsed, tradableYears, askForPlayer, askForPicks, executeTrade, canTakePlayer, pickKey, samePick, ASKS_PER_PICK, TRADE_YEARS_AHEAD, pickValue, playerValue, positionNeeds, buildTradeCall } from './trades.js';
import { QUESTIONS, isSituational, MEDIA_BOOST, MEDIA_CAP, HYPE_BOOST, MEDIA_QUESTIONS_PER_WEEK } from '../data/media.js';
import { pregameDialogue, dialogueState, REPLIES } from '../data/dialogue.js';
import { POSTSEASON_EVENTS, RAISE_PCT, RETENTION_BONUS_PCT, PROMISE_BENCH_LIMIT } from '../data/postseason.js';
import { OFFENSE_BASE, DEFENSE_BASE, OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf } from '../data/personnel.js';
import { careerSnapshot } from './career-profile.js';
import { ensureLeagueNews, addLeagueNews, resultsNews, playoffNews, championNews, playoffFieldNews, raceNews, awardNews, recordNews } from './league-news.js';
import { buildTeam, generatedTeam, buildDepthChart, lineupProblems, borrowedSlots, unavailableSlots, teamOverall, depthOrder, GROUP_SLOTS, playbookFor, adaptPlaybook } from './roster.js';
import { joinAsDraftee, takeFromPool, takeFromWaivers, leaveLeague } from './league.js';
import { leagueSeasonEnd, leagueContracts, leagueAgeing, leagueFreeAgency, leagueNudge, validateClubs, notePreseason, noteGrowth, preseasonTarget, leagueInjuryCover, leagueTrim, CREATION_LIFT } from './league-season.js';
export { validateClubs } from './league-season.js';
import { hasLeague, clubRecord, clubRoster, leagueClubs, claimMonster, clubCapRoom, captureLeague, verifyLeague, addToClub, removeFromClub, isProtected, findInLeague } from './league-registry.js';
export { hasLeague, isProtected, clubRoster, findInLeague } from './league-registry.js';
import { afterGame, recoverWeek, offseason, OUT_OF_POSITION_RISK } from './progression.js';
import { playGame } from '../sim/game-runner.js';
import { teamStrengths } from '../sim/coach-ai.js';
import { guarded, mayStartSeason, isArchived } from './lifecycle.js';
import { newUid } from '../core/uid.js';
import { CLASH_SIZE, SWAP_EVERY, FRANCHISE_POLICIES, policiesOf, normalizeMode, snapMonster, autoLineup, eligibleBattlers, runBattle, battleSummary, pendingDecision, applyBattleEffects, aiPossessionChoice, POSSESSION_CHOICES } from './clash-link.js';

export const SCHEMA_VERSION = 8; // 8: the league registry (GDD §42.6, Phase 3); 6: every save before it, still read and migrated
export const LEGACY_SCHEMA_VERSION = 6;
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_ACTIONS = ['Scout a region', 'Recruit', 'Training focus', 'Scout opponent', 'Game plan', 'Lineup check', 'Game day'];
export const PLAN_SIZE = 6;

// ------------------------------------------------------------ creation
/** `persistentLeague`: false builds a v40-style universe (generated AI rosters, no registry) for parity and balance baselines only; the game always passes true. */
export function createFranchise({ owner, club, rival = null, cornerstone = null, cornerstoneOffense, cornerstoneDefense, seed = Date.now() >>> 0, settings = {}, persistentLeague = true }) {
  const rng = createRng(seed);
  const division = divisionOf(club);
  const rivalChoices = DIVISIONS[division].filter((t) => t !== club);
  const rivalTeam = rivalChoices.includes(rival) ? rival : rng.pick(rivalChoices);
  const roster = createRoster(rng.seed(), { cornerstone, cornerstoneOffense, cornerstoneDefense, quality: 56 });
  const f = {
    schemaVersion: LEGACY_SCHEMA_VERSION, uid: newUid(), createdAt: new Date().toISOString(), seed, rngState: rng.state, // uid: the permanent identity of this franchise universe (GDD §42.3)
    owner: { ...owner }, club, tier: 'challenger', staff: {},
    roster, lineupManual: {}, depth: {},
    season: null, week: blankWeek(), game: null,
    rivals: { challenger: { team: rivalTeam, gm: RIVAL_GMS[rivalTeam] || 'Rival GM', headToHead: { w: 0, l: 0 } } },
    badges: { challenger: 0, vanguard: 0, sovereign: 0 }, qualification: { challenger: 0, vanguard: 0, sovereign: 0 }, bottomFourStreak: 0,
    history: [], news: [], leagueNews: [], leagueNewsMeta: { v: 1, leaders: {} }, dex: { seen: {}, signed: {} },
    campaign: { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 },
    settings: { quarterLength: 180, mode: 'key', speed: 1, reducedMotion: false, liveClock: false, difficulty: 'pro', ...settings },
    tutorial: { seen: {} },
    pool: {}, staffContracts: {}, staffRaise: {}, offseason: null,
  };
  // Contracts (GDD §18.1): about 35% of the founding roster, never a cornerstone, is on a one-year deal, so the first
  // offseason already brings renewals, walks and the market. Chosen by a hash of the id, so no rng is consumed.
  const expiring = roster.filter((m) => !m.cornerstone).sort((a, b) => hashString(`${a.id}|1yr`) - hashString(`${b.id}|1yr`)).slice(0, Math.round(roster.length * FOUNDING_ONE_YEAR_SHARE));
  for (const m of roster) m.contract = newContract(1, expiring.includes(m) ? 1 : 2);
  startSeason(f, 1); f.achievementsBackfilled = true;
  noteNewFranchise();
  for (const m of roster) dexRecord(f, m, 'signed');
  for (const m of roster) { noteJoin(f, m, 'founding', m.cornerstone ? { cornerstone: 1 } : {}); markCareerFresh(m); } // Career Timeline (GDD §38)
  if (persistentLeague) ensureLeague(f, { qualityDelta: -CREATION_LIFT }); // a new universe starts persistent (GDD §42.6): rosters open a little under today's year-1 quality because they will grow by playing (league-season.js calibration)
  openCreationDraft(f);
  return f;
}
/** A new GM arrives on draft day (GDD §19.2): a lottery pick 1-5 (15% for #1), the outgoing staff's scouting notes, the rest of the league slotted by their natural level. */
export const CREATION_LOTTERY = Object.freeze([0.15, 0.20, 0.22, 0.22, 0.21]);
/** Share of the founding roster on one-year deals (GDD §18.1): the first offseason has contracts to decide. */
export const FOUNDING_ONE_YEAR_SHARE = 0.35;
export function openCreationDraft(f) {
  const { r, save } = frng(f);
  const d = openDraftClass(f, r, { uniqueName: (m, extra) => uniqueName(f, m, extra) });
  for (const m of d.class) claimMonster(f, m, 'class0');
  d.year = 0; d.creation = true; // the class before season 1; week 10 of season 1 brings a new one
  for (const m of d.class) dexRecord(f, m, 'seen');
  // Notes: the top dozen fully scouted, the next ten glanced.
  d.class.slice(0, 12).forEach((m) => { d.revealed[m.id] = 6; }); d.class.slice(12, 22).forEach((m) => { d.revealed[m.id] = 3; });
  // Lottery slot, then the other clubs from weakest to strongest.
  const roll = r.next(); let acc = 0, slot = 4; for (let i = 0; i < CREATION_LOTTERY.length; i++) { acc += CREATION_LOTTERY[i]; if (roll < acc) { slot = i; break; } }
  const others = ALL_TEAMS.filter((t) => t !== f.club).sort((a, b) => clubQuality(f, a, 1) - clubQuality(f, b, 1));
  const worstFirst = [...others.slice(0, slot), f.club, ...others.slice(slot)];
  save();
  draftStart(f, worstFirst.slice().reverse(), { ownerOf: (o) => pickOwner(f, { year: 1, ...o }) }); // draftStart expects best→worst
  d.lotterySlot = slot + 1;
  runDraftToMe(f);
  news(f, `Draft day. The lottery gave ${f.club} the #${slot + 1} pick; the previous staff left scouting notes on ${12} prospects.`, 'info');
  return d;
}
export const creationDraftPending = (f) => !!f.draft?.creation && !f.draft.done;

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
  toPool(f, m, 'commissioner');
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
  const vars = { star: star?.name || 'your star', club: f.club, rival, record: `${rec.w}-${rec.l}`, coach: coach?.name || 'Your coordinator', role: coordRole, side: coordRole === 'offensive_coordinator' ? 'offense' : 'defense', other, scheme: coach?.style || 'my scheme', fit: weakSide?.fit ?? 0, total: weakSide?.total ?? 0 };
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
  checkAchievements(f, 'legend', { region: (sp.regions || [])[0] });
  return { ok: true, tracks: n, unlocked, species: sp };
}

// ------------------------------------------------------------ campaign
/** The other coach's words before Sunday's game (GDD §15.5), or null on a bye. */
export function pregameTalk(f) {
  const opp = opponentName(f); if (!opp) return null;
  const gym = GYM_BY_CLUB[opp]; const rival = f.rivals[f.tier]?.team === opp;
  const h2h = f.campaign?.h2h?.[opp] || null;
  const state = rival && onHotSeat(f) && !inPlayoffs(f) ? 'hotSeat' : dialogueState({ playoff: inPlayoffs(f), h2h, badgeHeld: !!badgeOf(f, opp) });
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
/**
 * A monster's bio for the card (GDD §20.2): birthplace, seasons pro, and the clubs it has played for. The current
 * club's stint runs from `m.joined` (season 1 for the founding roster); earlier stints come from `m.history`
 * (written when a monster leaves a club or is signed out of a pool); seasons pro before any known club are
 * "the regional leagues" of its home region.
 */
export function monsterBio(f, m) {
  const year = f.season?.year || 1; const birthplace = homeRegion(m);
  const joined = m.joined ?? (m.rookie != null ? m.rookie + 1 : m.contract?.signed ?? 1);
  const past = (m.history || []).filter((h) => h.club && (h.to != null || h.club !== f.club)).map((h) => ({ club: h.club, from: h.from, to: h.to, reason: h.reason }));
  const stints = [...past, { club: f.club, from: joined, to: null, current: true }].sort((a, b) => a.from - b.from);
  const known = stints.reduce((n, s) => n + Math.max(1, (s.to ?? year) - s.from + 1), 0);
  const before = Math.max(0, (m.yearsPro || 0) + 1 - known); // seasons pro not covered by a known club
  if (before > 0) stints.unshift({ club: `${birthplace} regional league`, from: stints[0].from - before, to: stints[0].from - 1, regional: true });
  return { birthplace, yearsPro: m.yearsPro ?? 0, rookie: m.yearsPro === 0, joined, stints };
}
/** Evolve one of the owner's monsters once its level allows (GDD §20.6). */
export function evolveMonster(f, id) {
  const m = f.roster.find((x) => x.id === id); if (!m) return { ok: false, reason: 'Not on roster.' };
  if (!evolutionReady(m)) { const n = nextEvolution(m); return { ok: false, reason: n ? `${m.name} evolves at level ${n.level}.` : `${m.name} is fully evolved.` }; }
  const from = m.name; const ev = tryEvolve(m); if (!ev) return { ok: false, reason: 'Nothing happened.' };
  noteEvolution(m, { year: f.season.year, week: f.season.week, club: f.club, from, to: m.name }); // Career Timeline
  dexRecord(f, m, 'signed');
  news(f, `EVOLUTION: ${from} evolved into ${m.name}!`, 'win', { mid: m.id, mname: m.name });
  return { ok: true, event: ev, monster: m };
}
/**
 * Notices (GDD §20.6): things that want the owner's attention, grouped by the tab they live on. Each has a screen,
 * a kind, a short text and (for roster notices) the monster. Pure: computed from state, nothing to dismiss.
 */
export function notices(f) {
  const list = [];
  if (!f?.roster) return list;
  for (const m of f.roster) {
    if (evolutionReady(m)) list.push({ screen: 'roster', kind: 'evolve', id: m.id, text: `${m.name} is ready to evolve` });
    if ((m.points || 0) > 0 && !f.settings?.autoPoints && !pointsLocked(f)) list.push({ screen: 'roster', kind: 'points', id: m.id, text: `${m.name} has ${m.points} attribute point${m.points === 1 ? '' : 's'} to spend` });
  }
  if (f.season?.finished && f.offseason && offseasonPending(f).length) list.push({ screen: 'hq', kind: 'contracts', text: `${offseasonPending(f).length} contract decision${offseasonPending(f).length === 1 ? '' : 's'} waiting` });
  if (tradeCall(f)) list.push({ screen: 'hq', kind: 'call', text: `📞 The ${tradeCall(f).team} are on the line with an offer` });
  if (f.week?.commissioner) list.push({ screen: 'hq', kind: 'commissioner', text: 'The commissioner is waiting on a cap decision' });
  else if (salarySummary(f).over) list.push({ screen: 'hq', kind: 'cap', text: `Over the cap by ${Math.round(-salarySummary(f).remaining).toLocaleString('en-US')} cr` });
  return list;
}
export const noticesFor = (f, screen) => notices(f).filter((n) => n.screen === screen);
export const monsterNotices = (f, id) => notices(f).filter((n) => n.id === id);
// ------------------------------------------------------------ achievements (GDD §21)
/**
 * Check the achievements for a trigger ('sunday' | 'season' | 'playoffs' | 'legend' | 'trade'; 'any' ones are
 * checked every time). Each earned achievement is recorded once and queues a cutscene in f.scenes.
 */
export function checkAchievements(f, trigger, ctx = {}) {
  f.achievements ||= {}; f.scenes ||= [];
  const c = { ...ctx, hofEligible: hallOfFameProgress(f).eligible };
  const earned = [];
  for (const a of ACHIEVEMENTS) {
    if (f.achievements[a.id] || (a.trigger !== trigger && a.trigger !== 'any')) continue;
    let ok = false; try { ok = !!a.when(f, c); } catch { ok = false; }
    if (!ok) continue;
    f.achievements[a.id] = { year: f.season?.year || 1, week: f.season?.week || 1 };
    const vars = sceneVars(f, c); f.scenes.push({ id: a.id, ctx: vars }); earned.push(a.id); stampGlobal(f, a, vars);
    news(f, `ACHIEVEMENT: ${fillScene(a.title, sceneVars(f, c))}.`, 'win');
  }
  return earned;
}
/** Record an achievement for the player across all franchises, with its cutscene as it played (GDD §21.4). */
/** The permanent identity a global record names: the franchise `uid` (GDD §42.3); older saves without one keep their seed. */
export const franchiseKey = (f) => f?.uid || f?.seed;
function stampGlobal(f, a, vars) {
  try { recordAchievementGlobal(a.id, { club: f.club, owner: `${f.owner.first} ${f.owner.last}`.trim(), year: f.season?.year || 1, difficulty: f.settings?.difficulty || 'pro', franchise: franchiseKey(f), scene: { title: fillScene(a.title, vars), speaker: a.speaker, beats: a.beats.map((b) => fillScene(b, vars)), rivalTeam: f.rivals?.[f.tier]?.team || null, rivalGm: f.rivals?.[f.tier]?.gm || null } }); } catch { /* storage unavailable */ }
}
function sceneVars(f, c) {
  const rv = f.rivals?.[f.tier]; const rec = f.season?.records?.[f.club] || { w: 0, l: 0 };
  return { club: f.club, CLUB: String(f.club).toUpperCase(), owner: `${f.owner.first} ${f.owner.last}`.trim(), first: f.owner.first, rival: rv?.team || 'your rival', gm: rv?.gm || 'their GM', year: yearOf(f.season?.year || 1), YEAR: yearOf(f.season?.year || 1), week: f.season?.week || 1, record: `${rec.w}-${rec.l}`, wins: f.campaign?.wins || 0, badges: Object.keys(f.campaign?.badges || {}).length, titles: f.campaign?.titles || 0, awardLine: c.awardLine || '', REGION: String(c.region || 'home region').toUpperCase() };
}
function fillScene(text, v) { return String(text).replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)); }
/** The next cutscene to play, filled in: { id, title, speaker, beats, earned }. */
export function nextScene(f) {
  const q = f.scenes?.[0]; if (!q) return null; const a = ACHIEVEMENT_BY_ID[q.id]; if (!a) { f.scenes.shift(); return nextScene(f); }
  return { id: a.id, title: fillScene(a.title, q.ctx), speaker: a.speaker, beats: a.beats.map((b) => fillScene(b, q.ctx)), earned: f.achievements?.[a.id] || null, rivalTeam: f.rivals?.[f.tier]?.team || null, rivalGm: f.rivals?.[f.tier]?.gm || null };
}
/**
 * One-time backfill for a career that predates achievements (GDD §21.1): grant what the record already shows and queue
 * those scenes once, in career order. Milestones that need the moment itself (a first win's week, a sweep) are granted
 * by the record alone where the record proves them.
 */
export function backfillAchievements(f) {
  if (!f?.campaign || f.achievementsBackfilled) return [];
  f.achievementsBackfilled = true; f.achievements ||= {}; f.scenes ||= [];
  const hist = f.history || []; const c = f.campaign; const badges = Object.keys(c.badges || {}).length;
  const facts = { first_win: c.wins >= 1, rival_beaten: Object.entries(c.h2h || {}).some(([t, h]) => t === f.rivals?.[f.tier]?.team && h.w >= 1), first_badge: badges >= 1, half_badges: badges >= 4, all_badges: badges >= 8,
    winning_season: hist.some((h) => h.record.w > h.record.l), undefeated: hist.some((h) => h.record.w >= 9 && h.record.l === 0), first_playoffs: hist.some((h) => h.playoffs) || !!(f.season?.playoffs && Object.values(f.season.playoffs.seeds).flat().includes(f.club)),
    conference_title: hist.some((h) => h.champion === f.club) || (f.season?.playoffs?.results || []).some((r) => r.round === 2 && r.winner === f.club), first_title: (c.titles || 0) >= 1, second_title: (c.titles || 0) >= 2, first_award: (c.awards || 0) >= 1,
    wins_10: c.wins >= 10, wins_30: c.wins >= 30, wins_50: c.wins >= 50, legend_tracked: Object.values(c.tracks || {}).some((n) => n >= 1), legend_unlocked: Object.keys(c.unlocked || {}).length >= 1, hof_eligible: hallOfFameProgress(f).eligible, traded_up: (f.trades || []).length >= 1 };
  const got = [];
  for (const a of ACHIEVEMENTS) if (!f.achievements[a.id] && facts[a.id]) { f.achievements[a.id] = { year: f.season?.year || 1, week: f.season?.week || 1, backfilled: true }; const vars = sceneVars(f, {}); f.scenes.push({ id: a.id, ctx: vars }); got.push(a.id); stampGlobal(f, a, vars); }
  return got;
}
/** Copy a franchise's achievements into the player's account store (saves that earned them before the store existed). */
export function syncAchievementsToGlobal(f) {
  if (!f?.achievements) return 0; let n = 0;
  for (const [id, e] of Object.entries(f.achievements)) { const a = ACHIEVEMENT_BY_ID[id]; if (!a) continue; const vars = sceneVars(f, {}); try { if (recordAchievementGlobal(id, { club: f.club, owner: `${f.owner.first} ${f.owner.last}`.trim(), year: e.year || 1, difficulty: f.settings?.difficulty || 'pro', franchise: franchiseKey(f), scene: { title: fillScene(a.title, vars), speaker: a.speaker, beats: a.beats.map((b) => fillScene(b, vars)), rivalTeam: f.rivals?.[f.tier]?.team || null, rivalGm: f.rivals?.[f.tier]?.gm || null } })) n++; } catch { /* ignore */ } }
  return n;
}
export function dismissScene(f) { f.scenes?.shift(); return { ok: true, left: f.scenes?.length || 0 }; }
export function achievementList(f) { return ACHIEVEMENTS.map((a) => ({ id: a.id, speaker: a.speaker, title: f.achievements?.[a.id] ? fillScene(a.title, sceneVars(f, {})) : null, earned: f.achievements?.[a.id] || null })); }
export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;
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
  const best = f.roster.slice().sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, 5).map((m) => ({ id: m.id, name: m.name, species: m.species, position: m.position, ovr: monsterOverall(m), level: m.level }));
  const card = {
    id: `hof_${franchiseKey(f)}_${Date.now().toString(36)}`, uid: f.uid || null, seed: f.seed ?? null, owner: `${f.owner.first} ${f.owner.last}`, portrait: f.owner.portrait, club: f.club, difficulty: f.settings?.difficulty || 'pro',
    seasons: seasons.length, record: { w: wins, l: losses }, titles: f.campaign.titles || 0, badges: Object.keys(f.campaign.badges || {}).map((club) => GYM_BY_CLUB[club]?.badge || club), awards: f.campaign.awards || 0,
    bestMonsters: best.map(({ id, ...rest }) => rest), dexSeen: dexCounts(f).seen, retiredAt: Date.now(), seasonsList: seasons, rival: f.rivals[f.tier]?.team || null, rivalRecord: f.rivals[f.tier]?.headToHead || null,
  };
  noteHallOfFame(f.roster, best.map((b) => b.id), { year: f.season.year, club: f.club, owner: card.owner }); // Career Timeline: the Hall of Fame card
  // Career Presentation (GDD §40.5): the card outlives the franchise, so it keeps each best monster's career as it stood (about 1 KB each).
  card.careers = best.map((b) => { const m = f.roster.find((x) => x.id === b.id); try { return m ? careerSnapshot(f, m) : null; } catch { return null; } });
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
function blankWeek() { return { region: null, prospects: [], recruitAttempts: 0, recruited: null, encounter: null, pregame: null, overtime: null, trainingFocus: null, scoutReport: null, plan: { offense: [], defense: [] }, lineupChecked: false, gameResult: null, events: [] }; }
const frng = (f) => { const r = rngFromState(f.rngState); return { r, save: () => { f.rngState = r.state; } }; };

/** A club note. `who` = { mid, mname } when the note names one monster (the club log links it to his career, GDD §40.5). */
export function news(f, text, kind = 'info', who = null) { const n = { text, kind, week: f.season?.week, year: f.season?.year }; if (who?.mid) { n.mid = who.mid; n.mname = who.mname; } f.news.unshift(n); if (f.news.length > 60) f.news.pop(); }

// ------------------------------------------------------------ staff
export const staffHired = (f) => STAFF_ROLES.every((r) => f.staff[r]);
export const nextStaffRole = (f) => STAFF_ROLES.find((r) => !f.staff[r]) || null;
export const staffMember = (f, role) => staffById(f.staff[role]);
/** Welcome news for a brand-new franchise: the first week is a normal week, with a short guide. */
/**
 * The commissioner's welcome at creation (GDD §19.3): the situation, the one piece of good news (the lottery pick),
 * and the board's expectations, with the last beat left hanging. Pure on the franchise, so the screen can replay it.
 */
export function commissionerWelcome(f) {
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = difficultyOf(f); const slot = f.draft?.creation ? f.draft.lotterySlot : null;
  const forecast = f.season?.expectations?.[f.club] ? Math.round(boardForecastFor(f).wins) : null; // the Board's forecast (GDD §29)
  const rival = f.rivals?.[f.tier]?.team; const gm = f.rivals?.[f.tier]?.gm || f.rivals?.[f.tier]?.name;
  const owner = `${f.owner.first} ${f.owner.last}`.trim();
  const beats = [
    { text: `${esc(owner)}. Sit down. I’ll be brief; the league doesn’t wait for introductions.` },
    { text: `You’re taking over <b>${esc(f.club)}</b>. I won’t dress it up: the last staff left in the night, the roster is thin at the back, and ${D.label === 'Rookie' ? 'even in this league' : D.label === 'All-Star' ? 'in this league, the one everybody says is the hardest,' : 'in this league'} the other fifteen clubs have had years to build what you’re starting today.${rival ? ` ${esc(rival)} in particular${gm ? ` · ${esc(gm)}` : ''} · has already asked me how long I think you’ll last.` : ''}` },
    { text: slot ? `Some good news. The lottery was kind to you: you hold the <b>#${slot} pick</b> in today’s draft. The outgoing scouts left notes on a dozen prospects. Use them. A top-five pick is the one gift this office gives a new GM, and it gives it once.` : `Some good news. The draft class is deep this year and your scouts have been watching it. Use that.` },
    { text: `Now the part nobody enjoys. This league has a <b>Board</b>. Not your club’s, the league’s. ${forecast != null ? `Their forecast has ${esc(f.club)} at ${forecast} wins. Before week one they will ask you to commit to something, and they will remember whether you kept it.` : 'Before week one they will ask you to commit to something, and they will remember whether you kept it.'} New GM or not, miss twice in a row and they will let you go. I won’t be consulted.` },
    { text: `Understand how this works. You answer to me. I answer to the Board. Nobody is above the Board, not the other GMs, not the owners, not this office. If they decide you’re done, I can’t save you. Nobody can.`, ominous: true },
    { text: `You’ll want to know who sits on it. So would I. In all my years I have never seen a face or heard a name, only the letters. Welcome to the league, ${esc(f.owner.first)}. Your office is down the hall.`, ominous: true },
  ];
  return beats;
}
export function firstWeekWelcome(f) {
  news(f, 'Welcome, owner. A balanced coaching staff has been hired for you. Replace anyone from Staff once you know the league.', 'info');
  news(f, 'Your first week: Monday scout a region, Tuesday recruit, Wednesday train, Thursday scout the opponent, Friday set your game plan, Saturday check the lineup, Sunday play.', 'info');
}
export const DEFAULT_STAFF = Object.freeze({ head_coach: 'hc_vale', offensive_coordinator: 'oc_park', defensive_coordinator: 'dc_ice', head_scout: 'sc_moss', monster_trainer: 'tr_focus' });
/** Quick start: a balanced default staff so a new owner can play immediately. */
export function hireDefaultStaff(f) { for (const [role, id] of Object.entries(DEFAULT_STAFF)) if (!f.staff[role]) { f.staff[role] = id; (f.staffContracts ||= {})[role] = newContract(f.season?.year || 1); (f.staffRaise ||= {})[role] = 1; } }
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
  f.staff[c.role] = id; (f.staffContracts ||= {})[c.role] = newContract(f.season?.year || 1); (f.staffRaise ||= {})[c.role] = 1;
  news(f, `${c.name} hired as ${c.role.replace(/_/g, ' ')}${current ? `, replacing ${current.name}` : ''}${severance ? ` (${severance.toLocaleString('en-US')} cr severance this season)` : ''}.`, 'roster');
  return { ok: true, replaced: current, severance };
}
export function hireStaff(f, id) {
  const c = staffById(id); if (!c) throw new Error('unknown staff');
  if (f.staff[c.role]) throw new Error('role filled');
  const budget = salarySummary(f, c.salary);
  if (budget.over) return { ok: false, reason: 'Exceeds the salary cap.' };
  f.staff[c.role] = id; (f.staffContracts ||= {})[c.role] = newContract(f.season?.year || 1); (f.staffRaise ||= {})[c.role] = 1;
  return { ok: true };
}
export function schemeAlignment(f) {
  const hc = staffMember(f, 'head_coach');
  return { offense: alignment(hc, staffMember(f, 'offensive_coordinator')), defense: alignment(hc, staffMember(f, 'defensive_coordinator')) };
}
/** How many starters fit each coordinator's scheme (the staff-screen line that makes "my players are run guys but my OC is a pass guy" visible). */
export function rosterFit(f) {
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
  const side = (slots, role) => { const starters = slots.map((s) => byId[chart[s]]).filter(Boolean); const fit = starters.filter((m) => fitFor(f, m)?.fits).length; const c = staffMember(f, role); return { fit, total: starters.length, scheme: c?.style || '·', coach: c?.name || null, role }; };
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
  const staff = Object.keys(f.staff).reduce((sum, role) => sum + staffSalary(f, role), 0);
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
  toPool(f, m, 'released');
  news(f, `${m.name} released. Back to ${homeRegion(m)}.`, 'roster');
  return { ok: true };
}
// ------------------------------------------------------------ the free-agent pool (GDD §18.3)
/** A monster's home region: where it was scouted, else its element's first region. */
export function homeRegion(m) { return m.origin || (ELEMENT_REGIONS[m.type] || [])[0] || Object.keys(REGIONS)[0]; }
/** Released, cut or walked monsters return to their region's pool with their stats and history; any club may sign them. */
export function toPool(f, m, reason = 'released') {
  f.pool ||= {}; const region = homeRegion(m);
  (m.history ||= []).push({ club: f.club, from: m.contract?.signed || f.season?.year || 1, to: f.season?.year || 1, reason });
  m.contract = null; m.origin = region;
  (f.pool[region] ||= []).push(m);
  if (f.pool[region].length > 12) { const old = f.pool[region].shift(); if (hasLeague(f)) leaveLeague(f, old, { year: f.season?.year || 1 }); } // the oldest leaves the league (a decorated one keeps a legend stub, GDD §42.6)
}
export function poolMonsters(f, region) { return (f.pool?.[region] || []); }
/** Once a week an AI club may sign from the pool (15% per monster). */
export function poolActivity(f, r) {
  if (hasLeague(f)) for (const m of (f.league.waivers || []).slice()) { if (!r.chance(0.15)) continue; const club = clubInNeed(f, m, r); if (!club) continue; takeFromWaivers(f, m.id); m.salary = salaryFor(m); addToClub(f, club, m, { year: f.season.year, via: 'signed', contract: newContract(f.season.year, 2) }); }
  for (const [region, list] of Object.entries(f.pool || {})) {
    for (const m of list.slice()) {
      if (!r.chance(0.15)) continue;
      if (hasLeague(f)) { // persistent rosters (GDD §42.6): the club that needs him most, with room under the cap, really signs him
        const club = clubInNeed(f, m, r); if (!club) continue;
        takeFromPool(f, m.id); m.salary = salaryFor(m); addToClub(f, club, m, { year: f.season.year, via: 'signed', contract: newContract(f.season.year, 2) });
        news(f, `${m.name} (${m.position}) signed with ${club} from the ${region} pool.`, 'info'); continue;
      }
      const club = r.pick(ALL_TEAMS.filter((t) => t !== f.club)); f.pool[region] = f.pool[region].filter((x) => x !== m); (m.history ||= []).push({ club, from: f.season.year, to: null, reason: 'signed' }); news(f, `${m.name} (${m.position}) signed with ${club} from the ${region} pool.`, 'info');
    }
  }
}
/** The AI club a pooled monster would sign with: the one that needs his position most among those with roster room and cap room; a tie goes to the generator. */
function clubInNeed(f, m, r) {
  const cap = tierById(f.tier).cap; const salary = salaryFor(m);
  const cands = leagueClubs(f).filter((c) => clubRoster(f, c).length < ROSTER_MAX && clubCapRoom(f, c, cap) >= salary).map((c) => ({ c, need: positionNeeds(clubRoster(f, c))[m.position] || 0 })).filter((x) => x.need >= 0.15);
  if (!cands.length) return null;
  const top = Math.max(...cands.map((x) => x.need)); const best = cands.filter((x) => x.need >= top - 0.05);
  return r.pick(best).c;
}
/** Games are never locked by the cap itself; the commissioner's review on Saturday is what has to be settled (GDD §15.6). */
export function canPlayGames(f) { return !f.week?.commissioner; }

// ------------------------------------------------------------ team objects
export function playerTeam(f, { trainingBonus: tb = null } = {}) {
  const meta = TEAM_META[f.club];
  const plan = f.week.plan;
  // A Legendary Play whose monster is gone or hurt never stays in a usable slot (GDD §36.2): the coordinator's pick fills in.
  const usable = (side, list) => { const ok = list.filter((id) => !legendOf(id) || legendaryStatus(f, id).available); return ok.length === list.length ? list : [...ok, ...defaultPlan(f, side).filter((id) => !ok.includes(id))].slice(0, PLAN_SIZE); };
  const offense = usable('offense', plan.offense.length ? plan.offense : defaultPlan(f, 'offense'));
  const defense = usable('defense', plan.defense.length ? plan.defense : defaultPlan(f, 'defense'));
  const align = schemeAlignment(f);
  // Package rule (GDD §17.2): a play whose package needs a slot nobody legal can fill is unavailable this week.
  const avail = playAvailability(f);
  const offenseOk = offense.filter((id) => !avail.blocked[id]), defenseOk = defense.filter((id) => !avail.blocked[id]);
  const team = buildTeam({ id: f.club, name: f.club, abbr: meta.abbr, color: meta.color, roster: f.roster, manual: f.lineupManual, depth: f.depth, offensePlays: offenseOk.length ? offenseOk : offense, defensePlays: defenseOk.length ? defenseOk : defense, coach: coachProfile(f), trainingBonus: tb });
  team.blockedSlots = avail.slots; team.blockedPlays = Object.keys(avail.blocked).filter((id) => offense.includes(id) || defense.includes(id));
  team.forfeit = f.roster.length < ROSTER_MIN || !offenseOk.length || !defenseOk.length || lineupProblems(f.roster, team.chart).length > 0;
  team.forfeitReason = f.roster.length < ROSTER_MIN ? `Only ${f.roster.length} monsters on the roster; the league minimum is ${ROSTER_MIN}` : lineupProblems(f.roster, team.chart).length ? `No legal monster for ${lineupProblems(f.roster, team.chart).join(', ')}` : !offenseOk.length ? 'Every offensive play in the plan needs a package you cannot field' : !defenseOk.length ? 'Every defensive play in the plan needs a package you cannot field' : null;
  { const lock = schemeLock(f); if (lock.offense || lock.defense) team.schemeLock = { offense: lock.offense, defense: lock.defense }; }
  // Scheme alignment: a small execution bonus/penalty on awareness for every starter.
  const bump = (side, pct) => { const delta = Math.round((pct - 80) / 10); for (const p of Object.values(team[side])) if (p.attrs.awareness) p.attrs.awareness = Math.max(1, Math.min(99, p.attrs.awareness + delta)); };
  bump('offense', align.offense); bump('defense', align.defense);
  // Per-monster boost ledger for the pregame screen: which starters carry a training or media-day boost today.
  team.boosts = {};
  if (tb) { const keys = Object.keys(tb); for (const side of ['offense', 'defense']) for (const p of Object.values(team[side])) if (p.id) (team.boosts[p.id] ||= {}).training = keys; }
  // Saturday media day (GDD §20.1): monsters whose nature matches an answer get a boost to their nature's strength and to awareness.
  // The pregame reply to the other coach adds one more point to the physical or the mental natures (GDD §15.5).
  const reply = REPLIES.find((r) => r.id === f.week.pregameReply)?.effect || null;
  const md = f.week.media || (reply ? { boosts: {} } : null);
  if (md) {
    const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
    for (const side of ['offense', 'defense']) for (const p of Object.values(team[side])) {
      const m = byId[p.id]; if (!m || !p.attrs) continue;
      let amt = (md.boosts?.[m.nature] || 0) + (md.hype ? HYPE_BOOST : 0) + (md.star === m.id ? 2 : 0) + (reply && natureGroup(m.nature) === reply.natureGroup ? reply.amount : 0);
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
  pro: { label: 'Pro', quality: -1, iq: 1, text: 'The standard league. Comeback mode: a side down 10+ in the fourth quarter gets a lift, you included.', hof: 'Hall of Fame: 8 badges, 2 titles, 50 wins, 3 awards.', hofGoals: { badges: 8, titles: 2, wins: 50, awards: 3 }, commissionerPicks: 3 },
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
/** An AI club's coach: the gym's named coach, or one shaped by the club's hash; difficulty sets the IQ (GDD §15.2). */
function aiCoach(f, name, year) {
  const h = hashString(`${name}|${year}|${f.seed}`); const D = difficultyOf(f); const gym = GYM_BY_CLUB[name];
  return gym
    ? { aggression: gym.coach.aggression, passBias: gym.coach.passBias, iq: D.iq + 0.2, identity: { offense: gym.coach.offense, defense: gym.coach.defense } }
    : { aggression: 0.35 + ((h >>> 8) % 40) / 100, passBias: 0.45 + ((h >>> 16) % 25) / 100, iq: D.iq };
}
/**
 * An AI club's team for a week. With the league registry (GDD §42.6, Phase 3) it is built from the club's persistent roster;
 * without one (a save that has not been migrated, the parity baseline) it is regenerated from the hash as before.
 */
export function aiTeam(f, name, year = f.season?.year || 1, { scouting = null } = {}) {
  return hasLeague(f) && clubRecord(f, name) ? leagueTeam(f, name, year, { scouting }) : legacyAiTeam(f, name, year, { scouting });
}
/** Today's generator (v40 and before): the same 38 monsters all season, a new set each season. Kept for migration and parity. */
export function legacyAiTeam(f, name, year = f.season?.year || 1, { scouting = null, qualityDelta = 0 } = {}) {
  const meta = TEAM_META[name];
  const h = hashString(`${name}|${year}|${f.seed}`);
  const quality = clubQuality(f, name, year) + qualityDelta;
  const gym = GYM_BY_CLUB[name];
  const coach = aiCoach(f, name, year);
  const rival = f.rivals[f.tier]?.team === name ? rivalSignature(f) : null;
  const evolveStage = gym ? (year >= 4 ? 2 : year >= 2 ? 1 : 0) : (year >= 5 ? 2 : year >= 3 ? 1 : 0);
  const team = generatedTeam(h, { id: name, name, abbr: meta.abbr, color: meta.color, quality, coach, scouting, element: gym?.element || null, legendary: gym?.legendary || null, signature: rival, evolveStage, composition: FULL_ROSTER, afterRoster: (roster) => { const gone = new Set(f.aiTransfers?.[year]?.[name] || []); return injectDraftees(f, name, roster, year).filter((m) => !gone.has(m.id)); } });
  return equipLegendaryForAI(team); // AI clubs holding a Legendary call its play too (GDD §36.6)
}
/** The persistent club: the registry roster (injuries and fatigue included), the same coach, playbook and scouting rules as before. */
function leagueTeam(f, name, year, { scouting = null } = {}) {
  const meta = TEAM_META[name]; const h = hashString(`${name}|${year}|${f.seed}`);
  const coach = aiCoach(f, name, year);
  let pb = playbookFor(h ^ 0x9e37, coach); let notes = [];
  if (scouting) { const a = adaptPlaybook(h, pb, scouting, { swaps: scouting.swaps ?? 2 }); pb = a; notes = a.notes; }
  const team = buildTeam({ id: name, name, abbr: meta.abbr, color: meta.color, roster: clubRoster(f, name), coach, offensePlays: pb.offense, defensePlays: pb.defense });
  team.scoutingNotes = notes;
  return equipLegendaryForAI(team);
}
/**
 * The league registry for this universe (GDD §42.6; schema 8). A new franchise gets one at creation; an older save gets one the
 * first time it is opened by this build, built from the very rosters it was facing (`persistentFrom`), verified on the copy
 * before anything is kept. Returns { ok, created, rekeyed, problems }. Archives are never migrated (they are read-only).
 */
export function ensureLeague(f, { qualityDelta = 0 } = {}) {
  if (hasLeague(f)) return { ok: true, created: false, rekeyed: [], problems: [] };
  if (!f?.season || isArchived(f)) return { ok: false, created: false, rekeyed: [], problems: ['not an active franchise'] };
  const year = f.season.year, week = f.season.week;
  const clubs = ALL_TEAMS.filter((t) => t !== f.club);
  const tableRows = (club, id) => f.season.leagueStats?.[club]?.[id] || null;
  const snapshot = JSON.stringify(f);
  let result, before;
  try {
    before = Object.fromEntries(clubs.map((c) => [c, legacyAiTeam(f, c, year, { qualityDelta })]));
    const onRosters = new Set(Object.values(before).flatMap((t) => t.roster.map((m) => m.id)));
    // Every id already in the save keeps its place. A draftee the roster brings in is the same monster the class and
    // `draftResults` list, not a clash; the owner's monsters, pools and market can never be the same individual as an AI one.
    const existing = [...f.roster, ...Object.values(f.pool || {}).flat(), ...(f.offseason?.market || []), ...[...(f.draft?.class || []), ...Object.values(f.draftResults || {}).flatMap((byTeam) => Object.values(byTeam || {}).flat())].filter((m) => !onRosters.has(m.id))];
    // Captured monsters are copies: an injected draftee stays in `draftResults` as the historical record it is (decision 6).
    result = captureLeague(f, { clubs, teamOf: (c) => ({ roster: before[c].roster.map((m) => structuredClone(m)) }), year, week, existing, tableRows, staffAllowance: STAFF_ALLOWANCE });
    // A re-keyed monster: the current season's table rows and club-log lines that named him follow (nothing else outside the
    // registry refers to an AI monster by id).
    for (const { from, to, club } of result.rekeyed) {
      for (const table of [f.season.leagueStats, f.season.playoffStats]) { const T = table?.[club]; if (T?.[from]) { T[to] = { ...T[from], id: to }; delete T[from]; } }
      for (const n of f.news || []) if (n.mid === from) n.mid = to;
    }
    const problems = verifyLeague(f, { clubs });
    for (const c of clubs) { const was = teamOverall(before[c]); const now = teamOverall(leagueTeam(f, c, year)); if (was !== now) problems.push(`${c}: team overall ${was} before, ${now} after`); }
    if (problems.length) throw Object.assign(new Error(problems.join('; ')), { problems });
  } catch (e) {
    const back = JSON.parse(snapshot); for (const k of Object.keys(f)) delete f[k]; Object.assign(f, back); // nothing kept
    return { ok: false, created: false, rekeyed: [], problems: e.problems || [e.message] };
  }
  f.schemaVersion = SCHEMA_VERSION;
  notePreseason(f, (c) => leagueTeam(f, c, year));
  return { ok: true, created: true, rekeyed: result.rekeyed, problems: [] };
}
/** The fixed staff cost every AI club carries against the cap: the default staff's salaries (owner's decision, 2026-10-23). */
export const STAFF_ALLOWANCE = Object.values(DEFAULT_STAFF).reduce((s, id) => s + (staffById(id)?.salary || 0), 0);
/** How long the league's part of the last season transition took (tools and the test plan read it; never saved). */
let lastTransitionMs = null; export const leagueTransitionMs = () => lastTransitionMs;
/** The team overall today's generator would give a club for a season: the figure the season end stored for the coming season, else generated now. */
function todayOverall(f, club, year) { const st = clubRecord(f, club)?.strategy; if (st && st.todayYear === year && st.today != null) return st.today; return teamOverall(legacyAiTeam(f, club, year)); }
/** Persistent AI monsters keep season and career totals (decision G); the generated rosters of older saves keep nothing. */
const leagueBooks = (f, team) => team !== f.club && hasLeague(f) && !!clubRecord(f, team);
/** One simulated game's consequences for a persistent AI roster: XP, level-ups (points spent by the club), evolution when ready, fatigue, injuries. */
function aiAfterGame(f, team, game, side, r) {
  if (!leagueBooks(f, team.name)) return [];
  const won = game.winner === side;
  return afterGame(team.roster, team.chart, game.stats?.[side]?.players || {}, r, { won, autoSpend: true, autoEvolve: true, xpScale: slowScale(clubRecord(f, team.name)?.strategy?.slow || 0) });
}
/** In-season cover for a persistent club that injuries left without a legal lineup (league-season.js). */
function leagueCover(f) { if (!hasLeague(f)) return; const { r, save } = frng(f); const n = leagueInjuryCover(f, r, { year: f.season.year, cap: tierById(f.tier).cap, targetOf: (c) => clubQuality(f, c) }); if (n) save(); }
/** Weekly rest and healing for the 15 persistent rosters, as the owner's roster gets on Saturday. */
function leagueRecoverWeek(f, { bye = false } = {}) { if (!hasLeague(f)) return; for (const club of leagueClubs(f)) recoverWeek(clubRoster(f, club), { bye }); }
/** The balance nudge's brake (GDD §42.6 decision C): a club above its band develops at a share of the XP for one season, by how far above it sits. */
export const SLOW_XP = Object.freeze({ mild: 0.75, strong: 0.5, strongFrom: 3 });
export const slowScale = (excess) => (excess <= 0 ? 1 : excess >= SLOW_XP.strongFrom ? SLOW_XP.strong : SLOW_XP.mild);
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
  if (hasLeague(f)) { for (const club of leagueClubs(f)) for (const m of clubRoster(f, club)) { m.fatigue = 0; rolloverMonster(m, { year, team: club }); } notePreseason(f, (c) => aiTeam(f, c, year)); } // every persistent monster opens a new season book; the club's strength now is what its growth is measured from
  // Preseason expectations for Coach of the Year: recorded now, never reconstructed from the final table (GDD §16.4).
  for (const team of ALL_TEAMS) {
    // An AI club's preseason talent is what today's generator would field (GDD §45.6): a persistent club opens below that and
    // grows to it as it plays, so the Board's forecast and Coach of the Year keep today's calibration.
    const talent = team === f.club ? teamOverall(playerTeam(f)) : todayOverall(f, team, year);
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
/** Forfeit (GDD §17.2): no legal lineup, or no legal plays left. Recorded as a 0-21 loss, no stats, no experience. */
export function forfeitSunday(f) {
  const m = sundayMatchup(f); if (!m) return { ok: false, reason: 'No game today.' };
  const side = m.playerSide, oppSide = side === 'home' ? 'away' : 'home';
  const score = { [side]: 0, [oppSide]: 21 };
  const res = { week: f.season.week, home: m.home.name, away: m.away.name, homeScore: score.home, awayScore: score.away, ot: false, player: true, forfeit: true };
  f.week.gameResult = { ...res, won: false, playerScore: 0, oppScore: 21, opponent: m.opponent, tag: m.tag, forfeit: true };
  if (m.playoff) recordPlayoffResult(f, res); else { applyResult(f.season.records, res); f.season.results.push(res); const fx = currentFixture(f); fx.result = { playerScore: 0, oppScore: 21, won: false, forfeit: true }; }
  f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 }; f.campaign.h2h ||= {}; const h2h = (f.campaign.h2h[m.opponent] ||= { w: 0, l: 0, last: null, streakL: 0 }); h2h.l += 1; h2h.last = 'l'; h2h.streakL += 1;
  news(f, `FORFEIT: ${f.club} could not field a legal lineup against ${m.opponent}. Recorded as a 0-21 loss.`, 'loss');
  f.game = null; f.lastGame = { ...f.week.gameResult, events: [], year: f.season.year, week: f.season.week, newBadge: null };
  advanceWeek(f);
  return { ok: true, result: f.lastGame };
}
// ------------------------------------------------------------ the offseason (GDD §18.1)
/** Decide one renewal: 'sign' at the ask, 'counter' at 85% (they may walk), 'walk' (to the pool; a coach's role falls empty). */
export function resolveContract(f, id, choice, { years = CONTRACT_YEARS } = {}) {
  years = Math.max(1, Math.min(CONTRACT_YEARS, years | 0)); // one year for the veteran you want one more season of, two at most
  const item = (f.offseason?.items || []).find((i) => i.id === id && !i.status); if (!item) return { ok: false, reason: 'Nothing to decide.' };
  const nextYear = f.season.year + 1;
  if (item.kind === 'staff') {
    if (choice === 'sign') { (f.staffRaise ||= {})[item.role] = (f.staffRaise[item.role] || 1) * STAFF_RAISE; f.staffContracts[item.role] = newContract(nextYear, years); item.status = 'signed'; item.years = years; news(f, `${item.name} re-signed for ${years === 1 ? 'one season' : 'two seasons'} at ${staffSalary(f, item.role).toLocaleString('en-US')} cr.`, 'roster'); return { ok: true, status: 'signed' }; }
    delete f.staff[item.role]; delete f.staffContracts[item.role]; item.status = 'walked'; news(f, `${item.name} leaves. Hire a new ${item.role.replace(/_/g, ' ')} before the season.`, 'loss'); return { ok: true, status: 'walked' };
  }
  const m = f.roster.find((x) => x.id === id); if (!m) { item.status = 'gone'; return { ok: true, status: 'gone' }; }
  const { r, save } = frng(f);
  const sign = (salary) => { m.salary = salary; m.contract = newContract(nextYear, years); item.status = 'signed'; item.final = salary; item.years = years; news(f, `${m.name} re-signed for ${years === 1 ? 'one season' : 'two seasons'} at ${salary.toLocaleString('en-US')} cr.`, 'roster'); };
  const walk = (why) => { f.roster = f.roster.filter((x) => x.id !== id); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === id) delete f.lineupManual[slot]; toPool(f, m, 'walked'); item.status = 'walked'; news(f, `${m.name} ${why}. Back to ${homeRegion(m)}'s pool.`, 'loss'); };
  if (choice === 'sign') sign(item.ask);
  else if (choice === 'counter') { const counter = Math.round(item.ask * COUNTER_PCT / 100) * 100; const yes = acceptsCounter(m, { winningRecord: !!f.offseason.winningRecord, rng: r }); save(); if (yes) { sign(counter); item.countered = 'accepted'; } else { walk('turned down your counter and walks'); item.countered = 'refused'; } }
  else walk('walks as a free agent');
  return { ok: true, status: item.status, countered: item.countered || null };
}
/** Offseason market: free agents the owner may sign to reach the roster floor, the regional pools plus a dozen generated veterans. */
export function offseasonMarket(f) {
  if (!f.offseason) return [];
  if (!f.offseason.market) { const { r, save } = frng(f); const gen = []; const positions = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'CB', 'S', 'K']; for (const pos of positions) { const regionName = r.pick(Object.keys(REGIONS)); const sp = r.pick(regionSpecies(regionName, REGIONS[regionName].types, 10).filter((x) => x.position === pos) || []) || null; if (!sp) continue; const m = generateMonster(r, { position: pos, quality: 50 + r.int(10), species: sp.id }); m.origin = regionName; claimMonster(f, m, 'market'); uniqueName(f, m, gen.map((x) => x.name)); gen.push(m); } save(); f.offseason.market = gen; }
  const pool = Object.values(f.pool || {}).flat();
  return [...pool.map((m) => ({ monster: m, fromPool: true })), ...f.offseason.market.map((m) => ({ monster: m, fromPool: false }))];
}
/**
 * What the owner knows about a free agent (polish 2.0): like a recruit, it depends on the head
 * scout's skill in the monster's home region. Monsters who played for this club are fully known.
 * level 1..6: headline ratings known = ceil(level * 4 / 6); OVR at 4+; potential at 5+; full card at 6.
 */
export function freeAgentView(f, m) {
  const formerOwn = (m.history || []).some((h) => h.club === f.club);
  const scout = staffMember(f, 'head_scout'); const region = REGIONS[homeRegion(m)];
  const skill = scout ? (scout.biomes?.[region?.biome] ?? scout.overall ?? 50) : 30;
  const level = formerOwn ? 6 : Math.min(6, (skill >= 85 ? 6 : skill >= 65 ? 4 : skill >= 40 ? 2 : 1) + (ownerPerk(f) === 'scouting' ? 1 : 0));
  return { level, formerOwn, skill, scoutName: scout?.name || null, region: homeRegion(m), headlineKnown: Math.min(4, Math.ceil(level * 4 / 6)), ovr: level >= 4 ? monsterOverall(m) : null, potential: level >= 5 ? m.potential : null, natureKnown: level >= 6 || skill >= 70, full: level >= 6 };
}
/**
 * The ask the owner sees (polish 2.0). Salary follows overall exactly, so an exact ask would give away a
 * hidden overall: until the scout knows his overall it is shown as an estimate, a steady ±10% around the
 * real figure rounded to the thousand. The real figure is what he signs for.
 */
export function freeAgentAsk(f, m) {
  const exact = Math.round(salaryFor(m) / 100) * 100; const v = freeAgentView(f, m);
  if (v.ovr != null) return { exact, shown: exact, estimate: false };
  const jitter = ((hashString(`${m.id}|ask`) % 2001) / 1000 - 1) * 0.1; // -10%..+10%, the same every time
  return { exact, shown: Math.round(exact * (1 + jitter) / 1000) * 1000, estimate: true };
}
export function signFreeAgent(f, id) {
  if (!f.offseason) return { ok: false, reason: 'The market is open in the offseason.' };
  if (f.roster.length >= ROSTER_MAX) return { ok: false, reason: `Roster full (${ROSTER_MAX}).` };
  const entry = offseasonMarket(f).find((e) => e.monster.id === id); if (!entry) return { ok: false, reason: 'Not on the market.' };
  const m = entry.monster; m.salary = salaryFor(m); m.contract = newContract(f.season.year + 1);
  if (entry.fromPool) { for (const list of Object.values(f.pool || {})) { const i = list.indexOf(m); if (i >= 0) list.splice(i, 1); } } else f.offseason.market = f.offseason.market.filter((x) => x !== m);
  uniqueName(f, m); m.joined = f.season.year + (f.offseason ? 1 : 0); backfillCareer(f, m); noteJoin(f, m, 'free_agent', entry.fromPool ? { region: homeRegion(m) } : {}); f.roster.push(m); dexRecord(f, m, 'signed');
  const cap = salarySummary(f);
  news(f, `${m.name} (${m.position}, ${monsterOverall(m)} OVR) signed as a free agent${cap.over ? ', over the cap; the commissioner will review in week 1' : ''}.`, cap.over ? 'loss' : 'roster', { mid: m.id, mname: m.name });
  return { ok: true, overCap: cap.over };
}
// ------------------------------------------------------------ the draft (GDD §19)
export function ensureDraftClass(f) {
  if (!draftWindow(f) && !f.season.finished) return null;
  if (f.draft && f.draft.year === f.season.year) return f.draft;
  const { r, save } = frng(f); const d = openDraftClass(f, r, { uniqueName: (m, extra) => uniqueName(f, m, extra) }); save();
  for (const m of d.class) { claimMonster(f, m, 'class'); dexRecord(f, m, 'seen'); } // ids unique in the universe (GDD §42.3)
  news(f, `The draft class is in: ${d.class.length} first-year monsters. Mondays from here on, your scout studies them.`, 'info');
  return d;
}
/** Monday in the draft window: study prospects (focus position first). */
export function scoutDraft(f, { focus = null } = {}) {
  if (f.season.day !== 0) return { ok: false, reason: 'Not Monday.' };
  if (!draftWindow(f)) return { ok: false, reason: 'The draft class is not in yet.' };
  const d = ensureDraftClass(f); const scout = staffMember(f, 'head_scout');
  const skill = scout?.overall ?? 50; const { r, save } = frng(f);
  const res = draftScout(f, r, { skill, focus, bonus: scoutBonusActive(f) ? 1 : 0 }); save();
  f.week.draftScouted = { studied: res.studied.map((m) => m.id), glanced: res.glanced.map((m) => m.id) };
  f.season.day = 1;
  return { ok: true, ...res, scout: scout?.name || 'Your scout' };
}
/** Tuesday in the draft window: recovery, fatigue off, injuries a week closer to healed. */
export function recoveryDay(f) {
  if (f.season.day !== 1) return { ok: false, reason: 'Not Tuesday.' };
  if (!draftWindow(f)) return { ok: false, reason: 'Recovery days are for the final week and the playoffs.' };
  const healed = [];
  for (const m of f.roster) { m.fatigue = Math.max(0, (m.fatigue || 0) - 15); if (m.injury) { m.injury.weeks -= 1; if (m.injury.weeks <= 0) { m.injury = null; healed.push(m.name); } } }
  f.week.recovered = true; f.season.day = 2;
  if (healed.length) news(f, `Recovery day: ${healed.join(', ')} cleared to play.`, 'roster');
  return { ok: true, healed };
}
/** Offseason: the draft runs after contracts. */
export function draftReady(f) { return !!f.draft && f.draft.year === f.season.year && f.season.finished && offseasonReady(f); }
export function beginDraft(f) {
  if (!f.season.finished) return { ok: false, reason: 'The season is not over.' };
  if (!offseasonReady(f)) return { ok: false, reason: 'Settle the contracts first.' };
  ensureDraftClass(f);
  const r = draftStart(f, leagueStandings(f).overall, { ownerOf: (o) => pickOwner(f, { year: f.season.year + 1, ...o }) }); if (!r.ok) return r;
  runDraftToMe(f);
  return { ok: true, draft: f.draft };
}
function runDraftToMe(f) {
  const { r, save } = frng(f);
  const league = hasLeague(f); const creation = !!f.draft?.creation; const year = creation ? f.season.year : f.season.year + 1;
  const made = draftAdvance(f, r, { playerClub: f.club, persist: !league, onAiPick: league ? (team, m) => { if (clubRecord(f, team)) joinAsDraftee(f, team, m, { year, silent: creation }); } : null });
  save(); return made;
}
export function myDraftPick(f, id) { const r = draftPlayerPick(f, id, { playerClub: f.club, nextYear: f.draft?.creation ? f.season.year : f.season.year + 1 }); if (!r.ok) return r; uniqueName(f, r.monster); dexRecord(f, r.monster, 'signed'); news(f, `Drafted ${r.monster.name} (${r.monster.position}), rookie deal ${r.monster.salary.toLocaleString('en-US')} cr for two seasons.`, 'roster', { mid: r.monster.id, mname: r.monster.name }); runDraftToMe(f); return r; }
export function passDraftPick(f) { const r = draftPassPick(f, { playerClub: f.club }); if (!r.ok) return r; runDraftToMe(f); return r; }
export const draftDone = (f) => !f.draft || f.draft.year !== f.season.year || f.draft.done;
// ------------------------------------------------------------ draft-pick trading (GDD §19.6)
const tradeCtx = (f) => ({ teams: ALL_TEAMS.filter((t) => t !== f.club), allTeams: ALL_TEAMS, rosterOf: (team) => aiTeam(f, team).roster, difficulty: f.settings?.difficulty || 'pro' });
/** The owner's tradable picks: this class (unused) and the next three, with how many asks each has left. */
export function myTradablePicks(f) {
  const out = [];
  for (const year of tradableYears(f)) for (const p of picksOwnedBy(f, f.club, year, ALL_TEAMS)) { if (pickUsed(f, p)) continue; const d = f.draft; const i = d?.started && currentClassYear(f) === year ? d.order.findIndex((o) => o.round === p.round && (o.original || o.team) === p.original) : -1; out.push({ ...p, asksLeft: ASKS_PER_PICK - (f.pickAsks?.[pickKey(p)] || 0), overall: i >= 0 ? i + 1 : null, onClock: i >= 0 && i === d.index }); }
  return out;
}
/** Picks the owner has sent away or taken in (for the office and the draft panel). */
export function pickLedger(f) { const mine = myTradablePicks(f); const acquired = mine.filter((p) => p.original !== f.club); const gone = []; for (const year of tradableYears(f)) for (let round = 1; round <= DRAFT_ROUNDS; round++) { const p = { year, round, original: f.club }; if (pickOwner(f, p) !== f.club) gone.push({ ...p, owner: pickOwner(f, p) }); } return { acquired, gone }; }
function tradeOpen(f) { return (f.draft?.started && !f.draft.done) || (f.season?.finished && !isFired(f)); }
function spendAsk(f, give) { const key = pickKey(give[0]); const n = f.pickAsks?.[key] || 0; if (n >= ASKS_PER_PICK) return { ok: false, reason: `That pick has been shopped ${ASKS_PER_PICK} times already.` }; (f.pickAsks ||= {})[key] = n + 1; return { ok: true }; }
function checkGive(f, give) {
  if (!tradeOpen(f)) return { ok: false, reason: 'Trades are open on the clock and in the offseason.' };
  if (!give?.length) return { ok: false, reason: 'Choose at least one pick to offer.' };
  const mine = myTradablePicks(f);
  for (const p of give) { const m = mine.find((x) => samePick(x, p)); if (!m) return { ok: false, reason: 'You do not hold that pick.' }; }
  return { ok: true };
}
/** Shop picks for a veteran at a position. Up to three offers; each ask costs one of the lead pick's two. */
export function tradeAskPlayer(f, { give, position }) {
  const c = checkGive(f, give); if (!c.ok) return c;
  if (!canTakePlayer(f)) return { ok: false, reason: `Roster full (${ROSTER_MAX}). Release someone before trading for a player.` };
  const a = spendAsk(f, give); if (!a.ok) return a;
  const r = askForPlayer(f, { give, position, ...tradeCtx(f) });
  news(f, `Shopped ${give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')} for a ${position}: ${r.offers.length ? `${r.offers.length} club${r.offers.length === 1 ? '' : 's'} interested` : 'no takers'}.`, 'info');
  return { ok: true, offers: r.offers, interested: r.teams, asksLeft: ASKS_PER_PICK - (f.pickAsks[pickKey(give[0])] || 0) };
}
/** Shop picks for future picks: `count` picks of `round` in class `year`. Clubs counter with the nearest package they would accept. */
export function tradeAskPicks(f, { give, year, round, count = 1 }) {
  const c = checkGive(f, give); if (!c.ok) return c;
  if (!tradableYears(f).includes(year)) return { ok: false, reason: `Picks can be traded up to ${TRADE_YEARS_AHEAD} classes ahead.` };
  const a = spendAsk(f, give); if (!a.ok) return a;
  const r = askForPicks(f, { give, year, round, count, ...tradeCtx(f) });
  news(f, `Shopped ${give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')} for ${count} × ${yearOf(year)} R${round}: ${r.offers.length ? `${r.offers.filter((o) => o.exact).length} yes, ${r.offers.filter((o) => !o.exact).length} counter${r.offers.filter((o) => !o.exact).length === 1 ? '' : 's'}` : 'no takers'}.`, 'info');
  return { ok: true, offers: r.offers, interested: r.teams, asksLeft: ASKS_PER_PICK - (f.pickAsks[pickKey(give[0])] || 0) };
}
/** Take an offer. Picks change hands at once; a veteran joins on a two-year deal at his salary (over the cap means the commissioner's review, like any signing). */
export function acceptTrade(f, offer) {
  const c = checkGive(f, offer.give); if (!c.ok) return c;
  if (offer.get?.player && !canTakePlayer(f)) return { ok: false, reason: `Roster full (${ROSTER_MAX}).` };
  const year = f.season.year; const nextYear = f.draft?.creation ? year : year + 1;
  const got = executeTrade(f, offer, { club: f.club, year, nextYear }); if (got.player) uniqueName(f, got.player);
  if (got.player) { dexRecord(f, got.player, 'signed'); const cap = salarySummary(f); news(f, `Trade: ${got.player.name} (${got.player.position}, ${monsterOverall(got.player)} OVR) arrives from ${offer.team} for ${offer.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')}${cap.over ? ', over the cap; the commissioner will review' : ''}.`, 'roster', { mid: got.player.id, mname: got.player.name }); }
  else news(f, `Trade: ${offer.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')} to ${offer.team} for ${got.picks.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')}.`, 'roster');
  if (f.draft?.started && !f.draft.done) runDraftToMe(f); // if the pick on the clock went out, the new holder uses it now
  checkAchievements(f, 'trade');
  return { ok: true, got };
}

// ---------------------------------------------------------------- AI clubs calling (GDD §19.6, second pass)
/** The week (or offseason) a call belongs to: it lasts until this changes. */
function callStamp(f) { return f.offseason ? `off:${f.season.year}` : `wk:${f.season.year}:${f.season.week}`; }
/** The call waiting for an answer, or null. */
export function tradeCall(f) { const c = f.tradeCall; return c && c.expires === callStamp(f) ? c : null; }
/** Once a week in season (weeks 2-8) and once when the offseason opens, a club may call with an offer. */
export function maybeTradeCall(f) {
  const stamp = callStamp(f);
  if (f.tradeCall && f.tradeCall.expires !== stamp) { news(f, `The ${f.tradeCall.team} offer for your ${f.tradeCall.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')} expired.`, 'info'); f.tradeCall = null; }
  if (f.tradeCall || isFired(f)) return null;
  const inSeason = !f.offseason && !f.season.finished && !inPlayoffs(f) && f.season.week >= 2 && f.season.week <= 8;
  if (!inSeason && !f.offseason) return null;
  f.callsMade ||= {}; if (f.callsMade[stamp]) return null; f.callsMade[stamp] = true;
  const c = buildTradeCall(f, { ...tradeCtx(f), myRoster: f.roster, myPicks: myTradablePicks(f), key: stamp });
  if (!c) return null;
  f.tradeCall = { ...c, expires: stamp };
  news(f, `📞 The ${c.team} called: ${c.player.name} (${c.player.position}, ${c.player.ovr} OVR) for your ${c.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')}. The offer stands until ${f.offseason ? 'the new season' : 'the end of the week'}.`, 'info');
  return f.tradeCall;
}
/** Answer the call: accept (picks go out, he joins on a two-year deal) or decline. */
export function answerTradeCall(f, accept) {
  const c = tradeCall(f); if (!c) return { ok: false, reason: 'No call is waiting.' };
  if (!accept) { f.tradeCall = null; news(f, `Declined the ${c.team} offer for ${c.player.name}.`, 'info'); return { ok: true, declined: true }; }
  if (!canTakePlayer(f)) return { ok: false, reason: `Roster full (${ROSTER_MAX}). Release someone first.` };
  const mine = myTradablePicks(f); if (!c.give.every((p) => mine.some((x) => samePick(x, p)))) { f.tradeCall = null; return { ok: false, reason: 'You no longer hold those picks; the offer is off.' }; }
  const src = aiTeam(f, c.team).roster.find((m) => m.id === c.playerId); if (!src) { f.tradeCall = null; return { ok: false, reason: `${c.player.name} is no longer with the ${c.team}.` }; }
  const year = f.season.year; const nextYear = f.offseason || f.season.finished ? year + 1 : year; // in season he joins now, on a deal starting this year
  const got = executeTrade(f, { team: c.team, give: c.give, get: { player: src } }, { club: f.club, year, nextYear });
  f.tradeCall = null; uniqueName(f, got.player); dexRecord(f, got.player, 'signed');
  const cap = salarySummary(f);
  news(f, `Trade: ${got.player.name} (${got.player.position}, ${monsterOverall(got.player)} OVR) arrives from the ${c.team} for ${c.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + ')}${cap.over ? ', over the cap; the commissioner will review' : ''}.`, 'roster', { mid: got.player.id, mname: got.player.name });
  checkAchievements(f, 'trade');
  return { ok: true, got };
}

/** The commissioner's three goal offers for this season (GDD §17.4). */
/** The Board's forecast for the player's club this season (GDD §29): its preseason talent against the league's average. */
export function boardForecastFor(f, games = 9) {
  const ex = f.season?.expectations || {}; const talents = ALL_TEAMS.map((t) => ex[t]?.talent).filter(Number.isFinite);
  if (!talents.length || !Number.isFinite(ex[f.club]?.talent)) return { winPct: 0.5, wins: games / 2 };
  return boardForecast({ talent: ex[f.club].talent, leagueTalent: talents.reduce((a, b) => a + b, 0) / talents.length, games });
}
export function commissionerGoals(f) {
  ensureBoard(f);
  const games = f.season.schedule.filter((g) => !g.bye).length || 9;
  const gyms = new Set(f.season.schedule.filter((g) => !g.bye && GYM_BY_CLUB[g.opponent] && !badgeOf(f, g.opponent)).map((g) => g.opponent)).size; // badges still to win
  return goalOffers(f, { expectedWinPct: boardForecastFor(f, games).winPct, gamesInSeason: games, gymsThisSeason: gyms });
}
export function chooseGoal(f, id) { const r = boardChooseGoal(f, id, commissionerGoals(f)); if (r.ok) news(f, `Commissioner's office: you committed to "${r.goal.label}" this season.`, 'info'); return r; }
/** Where the goal stands mid-season (for HQ). */
export function goalProgress(f) {
  const g = f.board?.goal; if (!g) return null; const rec = record(f);
  if (g.id === 'wins') return { text: `${rec.w} of ${g.target} wins`, pct: Math.min(1, rec.w / g.target) };
  if (g.id === 'badges') { const n = Object.values(f.campaign?.badges || {}).filter((b) => b.year === f.season.year).length; return { text: `${n} of ${g.target} badges`, pct: Math.min(1, n / g.target) }; }
  if (g.id === 'playoffs') { const p = playoffPicture(f); return { text: p.inPlayoffs ? `In: ${p.text}` : p.text, pct: p.inPlayoffs ? 1 : 0.4 }; }
  if (g.id === 'title') return { text: f.season.champion === f.club ? 'Champions!' : inPlayoffs(f) ? 'Alive in the playoffs' : `${rec.w}-${rec.l}`, pct: inPlayoffs(f) ? 0.7 : 0.3 };
  return null;
}
/** Spend one attribute point on a roster monster (GDD §17.3). */
/** The trainer spends every banked point by position weight (GDD §17.3), one tap instead of a card per monster. */
export function autoSpendAllPoints(f, { only = null } = {}) {
  if (pointsLocked(f)) return { ok: false, spent: 0, monsters: 0, reason: 'Attribute points are frozen until every contract decision is made.' };
  const { r, save } = frng(f); let spent = 0, monsters = 0;
  for (const m of f.roster) { if (only && m.id !== only) continue; const before = m.points || 0; if (!before) continue; autoSpendPointsFn(m, r); const used = before - (m.points || 0); if (used) { spent += used; monsters++; } }
  save(); if (spent) news(f, `The trainer spent ${spent} attribute point${spent === 1 ? '' : 's'} across ${monsters} monster${monsters === 1 ? '' : 's'}.`, 'info');
  return { ok: true, spent, monsters };
}
/** The league year the player reads (GDD §21.7): once the offseason's contracts are settled, the draft opens the next year. */
export function displayYear(f) { const s = f.season; if (!s) return 1; return s.finished && f.offseason && !offseasonPending(f).length ? s.year + 1 : s.year; }
/** Attribute points are frozen while contract decisions are open (GDD §21.6): settle the book first. */
export function pointsLocked(f) { return !!(f.season?.finished && f.offseason && offseasonPending(f).length); }
export function spendAttributePoint(f, id, attr) { if (pointsLocked(f)) return { ok: false, reason: 'Attribute points are frozen until every contract decision is made.' }; const m = f.roster.find((x) => x.id === id); if (!m) return { ok: false, reason: 'Not found.' }; return spendPoint(m, attr); }
/** Monsters with points waiting to be spent. */
export function unspentPoints(f) { return f.roster.filter((m) => (m.points || 0) > 0); }
/** The club's head coach by name (COY recipient). */
export function coachNameOf(f, team) { return headCoachName(team, { seed: f.seed, playerClub: f.club, playerCoach: staffMember(f, 'head_coach')?.name || null }); }
export const currentFixture = (f) => f.season.schedule.find((g) => g.week === f.season.week) || null;
export const isBye = (f) => !!currentFixture(f)?.bye;
export const inPlayoffs = (f) => f.season.week > 10;
export const LAST_REGULAR_WEEK = 10;
/** The final regular-season week and the playoffs: no region scouting or recruiting; Mondays scout the draft class, Tuesdays are recovery days (GDD §19). */
export const draftWindow = (f) => f.season.week >= LAST_REGULAR_WEEK && !f.season.finished;
export function opponentName(f) { const fx = currentFixture(f); if (fx && !fx.bye) return fx.opponent; const p = playoffFixture(f); return p ? (p.home === f.club ? p.away : p.home) : null; }
export function playoffFixture(f) { const p = f.season.playoffs; if (!p) return null; return p.fixtures.find((g) => g.round === p.round && (g.home === f.club || g.away === f.club) && !g.result) || null; }
export function playerAlive(f) { return !inPlayoffs(f) || !!playoffFixture(f); }

export function record(f) { return f.season.records[f.club]; }
/** Legendary Plays (GDD §36): discover new ones and clear unavailable ones from the plan, refilled with the coordinator's picks. */
export function syncLegendary(f) {
  return syncLegendaryPlays(f, { news: (t, k) => news(f, t, k), refill: (side, kept) => [...kept, ...defaultPlan(f, side).filter((id) => !kept.includes(id))].slice(0, PLAN_SIZE) });
}
export { legendaryStatus, legendaryAvailable, LEGENDARY_IDS };
/** A roster or pool monster's Career Timeline, newest first (GDD §38). Older saves are rebuilt once from what they prove. */
export function monsterTimeline(f, m) { backfillCareer(f, m); return careerTimeline(m, { club: f.club }); }
export { careerSummary };
/**
 * Developer test aid (Developer Tools only, never offered in play): put one of the pilot Legendaries on the roster so the
 * Legendary Play flow can be tested without winning titles first. The franchise is marked `devAssisted` for good.
 */
export function devGrantLegendary(f, speciesId) {
  if (f.roster.length >= ROSTER_MAX) return { ok: false, reason: `Roster full (${ROSTER_MAX}). Release someone first.` };
  if (f.roster.some((m) => m.species === speciesId)) return { ok: false, reason: 'Already on your roster.' };
  const { r, save } = frng(f); const sp = SPECIES_DEX.find((x) => x.id === speciesId); if (!sp) return { ok: false, reason: 'Unknown species.' };
  const m = generateMonster(r, { position: sp.position, quality: 64, species: speciesId }); save(); claimMonster(f, m, 'dev');
  m.salary = salaryFor(m); m.contract = newContract(f.season.year, 2); m.devGranted = true; (m.history ||= []).push({ club: f.club, from: f.season.year, to: null, reason: 'developer' });
  noteJoin(f, m, 'developer'); markCareerFresh(m); f.roster.push(m); f.devAssisted = true; const res = syncLegendary(f);
  news(f, `Developer test: ${m.name} joins the roster.`, 'info');
  return { ok: true, monster: m, discovered: res.discovered };
}
/** The venue of this week's game at `home` (GDD §33): the club's stadium (or an owner's future override) and the weather. */
export function gameVenue(f, home) { return venueFor(home, `${f.seed}|${f.season.year}|${f.season.week}`, f.stadiums || null); }
/** This week's game venue for the player, or null on a bye or when there is no game. */
export function sundayVenue(f) {
  const po = playoffFixture(f); if (po) return { ...gameVenue(f, po.home), home: po.home, away: po.away };
  const fx = currentFixture(f); if (!fx || fx.bye) return null;
  const home = fx.home ? f.club : fx.opponent; return { ...gameVenue(f, home), home, away: fx.home ? fx.opponent : f.club };
}
export function leagueStandings(f) { return standings(f.season.records); }

/** Where the club stands in the playoff race (conference seed or games back). */
export function playoffPicture(f) {
  const st = leagueStandings(f); const conf = conferenceFor(divisionOf(f.club));
  const c = st.conferences[conf]; const seed = c.seeds.indexOf(f.club);
  const divLeader = st.divisions[divisionOf(f.club)][0];
  if (seed >= 0) return { inPlayoffs: true, seed: seed + 1, text: `${conf} #${seed + 1} seed${divLeader === f.club ? ' · division leader' : ' · wild card'}` };
  const lastIn = c.seeds[c.seeds.length - 1]; const a = f.season.records[f.club], b = f.season.records[lastIn];
  const back = ((b.w - a.w) + (a.l - b.l)) / 2;
  return { inPlayoffs: false, seed: null, text: back <= 0 ? 'On the bubble, tiebreakers decide' : `${back} game${back === 1 ? '' : 's'} back of the last playoff spot` };
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
      const toss = leaguePregame(f, r, home, away);
      const game = playGame({ home, away, venue: gameVenue(f, home.name), seed: r.seed(), quarterLength: 180, comeback: comebackRule(f), coinWinner: toss.coinWinner, choice: toss.choice, otPeriods: OT_PERIODS });
      leagueTiebreak(f, r, home, away, game);
      aiAfterGame(f, home, game, 'home', r); aiAfterGame(f, away, game, 'away', r); // persistent rosters develop as they play (GDD §42.6, decision B)
      recordGame(f, game, { home, away }, { playoff: false, booksFor: (t) => leagueBooks(f, t) });
      const res = { week: f.season.week, home: g.home, away: g.away, homeScore: game.score.home, awayScore: game.score.away, ot: !!game.ot, winner: game.winner ? (game.winner === 'home' ? g.home : g.away) : null, clash: game.tiebreak || null, pregameClash: toss.clash ? { winner: toss.coinWinner, choice: toss.choice, by: toss.clash.by, exchanges: toss.clash.exchanges } : null };
      applyResult(f.season.records, res); results.push(res);
    }
  }
  poolActivity(f, r);
  save();
  f.season.results.push(...results);
  // The rival's result is on the League News scoreboard (GDD §39), highlighted; no club-log line.
  return results;
}

// ------------------------------------------------------------ weekly loop
export function dayIndex(f) { return f.season.day; }
/** Positions with fewer healthy monsters than depth-chart slots (base + package), thinnest first. */
export function shortPositions(f) { return depthNeeds(f).filter((n) => n.status === 'short').map((n) => n.position); }
/** Depth by position: short (fewer healthy than slots), thin (no backup), ok. Thinnest first. */
export function depthNeeds(f) {
  const out = [];
  for (const [g, slots] of Object.entries(GROUP_SLOTS)) { const healthy = f.roster.filter((m) => m.position === g && !m.injury).length; out.push({ position: g, slots: slots.length, healthy, status: healthy < slots.length ? 'short' : healthy === slots.length ? 'thin' : 'ok', gap: slots.length - healthy }); }
  const rank = { short: 0, thin: 1, ok: 2 };
  return out.sort((a, b) => rank[a.status] - rank[b.status] || b.gap - a.gap);
}
export function scoutRegion(f, regionName, { focus = null } = {}) {
  if (f.season.day !== 0) return { ok: false, reason: 'Not Monday.' };
  if (draftWindow(f)) return { ok: false, reason: 'No region scouting from the final week on: the scout is on the draft class.' };
  const region = REGIONS[regionName]; if (!region) return { ok: false, reason: 'Unknown region.' };
  const scout = staffMember(f, 'head_scout');
  const skill = scout?.biomes?.[region.biome] ?? 50;
  const { r, save } = frng(f);
  const count = (skill >= 80 ? 3 : skill >= 45 ? 2 : 1) + (scoutBonusActive(f) ? 1 : 0); // the board's expanded scouting department after a goal met (GDD §17.4)
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
    const m = generateMonster(r, { position, quality, species: sp.id }); claimMonster(f, m, 'scout');
    uniqueName(f, m, prospects.map((p) => p.monster.name));
    dexRecord(f, m, 'seen');
    const revealed = Math.min(6, (skill >= 85 ? 6 : skill >= 65 ? 4 : skill >= 40 ? 2 : 1) + (ownerPerk(f) === 'scouting' ? 1 : 0));
    prospects.push({ monster: m, revealed, natureKnown: skill >= 70, potentialKnown: skill >= 55 });
  }
  // The scout also goes looking for the position you need: the one you asked for, else the shortest-handed, else one with no backup (GDD §17.6).
  const needs = depthNeeds(f); const needList = focus ? [focus] : needs.filter((n) => n.status !== 'ok').map((n) => n.position);
  const need = needList.find((pos) => !prospects.some((p) => p.monster.position === pos)) || null;
  const needPool = need ? pool.filter((sp) => sp.position === need || sp.secondary === need) : [];
  if (need && needPool.length) {
    const sp = needPool[r.int(needPool.length)];
    const m = generateMonster(r, { position: need, quality: 50 + r.int(10), species: sp.id }); claimMonster(f, m, 'scout-need');
    uniqueName(f, m, prospects.map((p) => p.monster.name)); dexRecord(f, m, 'seen');
    prospects.push({ monster: m, revealed: Math.min(6, (skill >= 65 ? 4 : 2) + (ownerPerk(f) === 'scouting' ? 1 : 0)), natureKnown: skill >= 70, potentialKnown: skill >= 55, need: needs.find((n) => n.position === need)?.status || 'focus' });
  }
  // An unlocked legendary is a reward for three titles, not a lottery ticket: it turns up the first time its home region is scouted each season.
  for (const sp of unlocked) {
    const seen = ((f.campaign.legendSeen ||= {})[f.season.year] ||= {});
    if (seen[sp.id] || prospects.some((p) => p.monster.species === sp.id)) continue;
    const m = generateMonster(r, { position: sp.position, quality: 52 + r.int(12) + 8, species: sp.id }); claimMonster(f, m, 'legend');
    uniqueName(f, m, prospects.map((p) => p.monster.name)); dexRecord(f, m, 'seen'); seen[sp.id] = true;
    prospects.push({ monster: m, revealed: 6, natureKnown: true, potentialKnown: true, legend: true });
  }
  for (const m of poolMonsters(f, regionName).slice(0, 2)) prospects.push({ monster: m, revealed: 6, natureKnown: true, potentialKnown: true, fromPool: true }); // free agents in the region: fully known
  for (const p of prospects) p.depth = needs.find((n) => n.position === p.monster.position)?.status || 'ok';
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
  const taken = new Set([...f.roster.filter((x) => x !== m && x.id !== m.id).map((x) => x.name), ...extra]);
  if (!taken.has(m.name)) return m;
  const roman = ['II', 'III', 'IV', 'V', 'VI'];
  const base = speciesName(m);
  for (const n of roman) { const cand = `${base} ${n}`; if (!taken.has(cand)) { m.name = cand; return m; } }
  for (let k = 7; ; k++) { const cand = `${base} ${k}`; if (!taken.has(cand)) { m.name = cand; return m; } }
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
  if (draftWindow(f)) return { ok: false, reason: 'No signings from the final week on. Tuesday is a recovery day.' };
  const p = f.week.prospects[prospectIndex]; if (!p) return { ok: false, reason: 'No such prospect.' };
  // Tuesday Monster Encounters (GDD §26.1): a pitch is the consolation after a lost battle, once, for the monster you fought.
  const enc = f.week.encounter;
  if (!enc || enc.status !== 'pitch') return { ok: false, reason: enc?.status === 'offer' ? 'They already want to sign: accept or decline the offer.' : 'Battle the monster first: a win brings an offer, a loss one pitch.' };
  if (enc.prospectIndex !== prospectIndex) return { ok: false, reason: 'Only the monster you battled will listen this week.' };
  if (f.week.recruitAttempts >= 1) return { ok: false, reason: 'No attempts left this week.' };
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
  enc.pitch = { approach: approachId, success };
  if (success) { enc.status = 'signed'; return { ok: true, success: true, ...signProspect(f, p, rc.needed ? releaseId : null) }; }
  enc.status = 'walked'; f.season.day = 2; return { ok: true, success: false, final: true };
}
/** Add a prospect to the roster: the release (if one was chosen), a two-season contract, salary, dex and news. Shared by the battle offer and the pitch. */
function signProspect(f, p, releaseId) {
  const m = p.monster;
  if (releaseId) { const out = f.roster.find((x) => x.id === releaseId); if (out) { f.roster = f.roster.filter((x) => x.id !== releaseId); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === releaseId) delete f.lineupManual[slot]; news(f, `${out.name} released to make room for ${m.name}.`, 'roster'); } }
  m.contract = newContract(f.season.year); m.origin = m.origin || f.week.region; m.salary = m.salary || salaryFor(m);
  if (p.fromPool) { for (const list of Object.values(f.pool || {})) { const i = list.indexOf(m); if (i >= 0) list.splice(i, 1); } }
  uniqueName(f, m); m.joined = f.season.year; backfillCareer(f, m); noteJoin(f, m, 'encounter', f.week.region ? { region: f.week.region } : {}); f.roster.push(m); dexRecord(f, m, 'signed'); f.week.recruited = m.id; f.week.prospects = []; f.season.day = 2;
  news(f, `${m.name} (${m.position}, ${monsterOverall(m)} OVR) signed from ${f.week.region}.`, 'roster', { mid: m.id, mname: m.name });
  const cap = salarySummary(f);
  if (cap.over) news(f, `Over the salary cap by ${Math.round(-cap.remaining).toLocaleString('en-US')} cr. The commissioner reviews the books on Saturday.`, 'loss');
  return { monster: m, overCap: cap.over };
}
/** Skip the encounter: no battle, no signing, no penalty of any kind; Wednesday begins. */
export function skipRecruit(f) { if (f.season.day === 1) { if (f.week.encounter && !['signed', 'walked', 'declined'].includes(f.week.encounter.status)) f.week.encounter.status = 'skipped'; f.season.day = 2; f.week.prospects = []; } }
export const skipEncounter = skipRecruit;

// ------------------------------------------------------------ Tuesday Monster Encounters (Beast Clash in Franchise Mode, GDD §26.1)
// The scouted monster is met in a Beast Clash. Enter it or skip it. Win: it offers to sign (you may still decline). Lose: one
// ordinary recruiting pitch at the usual odds. Either way your battlers earn Arena XP and a little fatigue. Skipping costs nothing.
/** Can the player battle today? Who is eligible, how big the battle would be, and the proposed lineup. */
/**
 * Tuesday companions (GDD §26.1, owner authorization 2026-10-22): the chosen prospect fights beside two wild companions that
 * cannot be signed. Their strength follows the club, not the scout: the wild group as a whole (the prospect and its companions)
 * averages the club's battle strength (the average overall of its automatic 3v3 lineup, healthy monsters only) minus `gap`, so
 * the companions make up for a weak or strong prospect, with a small spread, and never fight above the club's battle strength. The chosen lineup never
 * changes them, so fielding weaker monsters cannot make the battle easier; the scouted prospect keeps every rating it was
 * scouted with. Companions are drawn from their own seed (franchise seed, season, week, prospect), so the preview and the battle
 * always match and the franchise generator is untouched.
 */
export const COMPANION_RULE = Object.freeze({ gap: 4, spread: 2, floor: 50, ceiling: 95 }); // gap 9 under the smart-swap battles of 2026-10-22 (morning); 4 under fixed-order battles (afternoon), where the ceiling rule binds
export function clubBattleStrength(f) {
  const line = autoLineup(f.roster, CLASH_SIZE.encounter, hashString(`${f.seed}|enc|${f.season.year}|${f.season.week}`));
  return line.length ? line.reduce((a, m) => a + monsterOverall(m), 0) / line.length : 0;
}
export function encounterCompanions(f, prospectIndex, n = CLASH_SIZE.encounter - 1, rule = COMPANION_RULE) {
  const p = f.week.prospects[prospectIndex]; if (!p || n <= 0) return [];
  const r = createRng(hashString(`${f.seed}|companions|${f.season.year}|${f.season.week}|${prospectIndex}`));
  const regionName = f.week.region && REGIONS[f.week.region] ? f.week.region : Object.keys(REGIONS)[0];
  const pool = regionSpecies(regionName, REGIONS[regionName].types, f.season.week).filter((sp) => sp.rarity !== 'legendary');
  const S = clubBattleStrength(f); const R = { ...COMPANION_RULE, ...rule }; const out = [];
  for (let i = 0; i < n; i++) {
    const sp = pool[r.int(pool.length)] || pool[0];
    // The wild group as a whole (prospect + companions) is matched to the club: S − gap on average. Companions make up for a weak
    // or strong prospect, but never fight above the club's own battle strength.
    const base = (CLASH_SIZE.encounter * (S - R.gap) - monsterOverall(p.monster)) / (CLASH_SIZE.encounter - 1);
    const target = Math.max(R.floor, Math.min(R.ceiling, Math.round(S), Math.round(base + (r.next() * 2 - 1) * R.spread)));
    // generateMonster's quality is only roughly the overall a position and species end up with: re-roll the same monster
    // (same seed) with a corrected quality until its overall is within a point of the target.
    const seed = r.seed(); let q = target, m = null;
    for (let k = 0; k < 4; k++) { m = generateMonster(createRng(seed), { position: sp.position, quality: q, species: sp.id, id: `wild_${f.season.year}_${f.season.week}_${prospectIndex}_${i}` }); const d = target - monsterOverall(m); if (Math.abs(d) <= 1) break; q += d; }
    m.companion = true; m.name = `Wild ${speciesName(m)}`; out.push(m);
  }
  return out;
}
export function encounterPreview(f, prospectIndex) {
  const p = f.week.prospects[prospectIndex]; if (!p) return { ok: false, reason: 'No such prospect.' };
  const eligible = eligibleBattlers(f.roster);
  const size = Math.min(CLASH_SIZE.encounter, eligible.length);
  if (size < 1) return { ok: false, reason: 'Nobody healthy enough to battle this week.', eligible, size: 0 };
  const wild = [p.monster, ...encounterCompanions(f, prospectIndex, size - 1)];
  return { ok: true, eligible, size, wild, lineup: autoLineup(f.roster, size, hashString(`${f.seed}|enc|${f.season.year}|${f.season.week}`)) };
}
/** Enter the encounter: draw the battle seed once and fix the lineup (yours in the order given; the wild side is the monster you chose plus the others the scout found). */
export function startEncounter(f, prospectIndex, { lineup = null, mode = 'watch' } = {}) {
  if (f.season.day !== 1) return { ok: false, reason: 'Not Tuesday.' };
  if (draftWindow(f)) return { ok: false, reason: 'No encounters from the final week on. Tuesday is a recovery day.' };
  if (f.week.encounter && f.week.encounter.status !== 'ready') return { ok: false, reason: 'One encounter per Tuesday.' };
  const pv = encounterPreview(f, prospectIndex); if (!pv.ok) return pv;
  const eligibleIds = new Set(pv.eligible.map((m) => m.id));
  let mine = (lineup || pv.lineup.map((m) => m.id)).filter((id, i, arr) => eligibleIds.has(id) && arr.indexOf(id) === i).slice(0, pv.size);
  if (mine.length < 1) return { ok: false, reason: 'Pick at least one healthy monster.' };
  const size = Math.min(pv.size, mine.length);
  const { r, save } = frng(f); const seed = r.seed(); save();
  const wild = pv.wild.slice(0, size);
  f.week.encounter = { prospectIndex, seed, size, mine, wild: wild.map((m) => m.id), a: mine.map((id) => snapMonster(f.roster.find((m) => m.id === id))), b: wild.map(snapMonster), mode: normalizeMode(mode) || 'watch', policies: { ...FRANCHISE_POLICIES }, decisions: {}, status: 'battle', result: null };
  return { ok: true, encounter: f.week.encounter };
}
/** Rebuild the encounter's battle from the save (deterministic): the result the screen shows, or replays. */
export function encounterBattle(f, { log = 'full' } = {}) {
  const e = f.week.encounter; if (!e || !e.seed) return null;
  const a = e.a || e.mine.map((id) => f.roster.find((m) => m.id === id)).filter(Boolean);
  const byId = new Map(f.week.prospects.map((p) => [p.monster.id, p.monster]));
  const b = e.b || e.wild.map((id) => byId.get(id)).filter(Boolean);
  if (!a.length || !b.length) return null;
  return runBattle({ a, b, seed: e.seed, mode: e.mode, decisions: e.decisions, policies: policiesOf(e), log });
}
/** The player's answer at a swap decision (play mode): a bench monster's id, or 'stay' (recorded for this exchange and the next three, so the question is not asked every exchange). */
export function encounterDecide(f, ex, choice) {
  const e = f.week.encounter; if (!e || e.status !== 'battle') return { ok: false, reason: 'No battle in progress.' };
  if (choice === 'stay') for (let k = 0; k < SWAP_EVERY; k++) e.decisions[ex + k] = 'stay'; else e.decisions[ex] = choice;
  return { ok: true };
}
/** Settle the battle: record the summary, pay out XP and fatigue, and open the offer (win) or the pitch (loss). Idempotent. */
export function resolveEncounter(f) {
  const e = f.week.encounter; if (!e) return { ok: false, reason: 'No encounter.' };
  if (e.status !== 'battle') return { ok: true, encounter: e, already: true };
  const result = encounterBattle(f); if (!result) return { ok: false, reason: 'The battle could not be rebuilt.' };
  if (policiesOf(e).a === 'manual' && pendingDecision(result)) return { ok: false, reason: 'A swap decision is still open.', pending: pendingDecision(result) };
  const { r, save } = frng(f);
  const events = applyBattleEffects(f.roster, result, 'a', 'encounter', r, { autoSpend: !!f.settings.autoPoints });
  save();
  e.result = battleSummary(result); e.events = events;
  const won = result.winner === 'a'; e.status = won ? 'offer' : 'pitch';
  const p = f.week.prospects[e.prospectIndex];
  news(f, won ? `Beast Clash won: ${p.monster.name} wants to join ${f.club}.` : `Beast Clash lost to ${p.monster.name}. One pitch left to win them over.`, won ? 'win' : 'info');
  return { ok: true, encounter: e, won, result, events };
}
/** After a won encounter: sign the monster (the usual roster-limit and cap rules apply) or let it go. */
export function acceptOffer(f, { releaseId = null } = {}) {
  const e = f.week.encounter; if (!e || e.status !== 'offer') return { ok: false, reason: 'No offer on the table.' };
  const p = f.week.prospects[e.prospectIndex]; if (!p) return { ok: false, reason: 'No such prospect.' };
  const rc = releaseCandidates(f, p);
  if (rc.needed && !releaseId) return { ok: false, reason: rc.reason, needRelease: true };
  if (rc.needed && !rc.list.find((c) => c.id === releaseId)) return { ok: false, reason: 'That monster cannot be released.' };
  e.status = 'signed';
  return { ok: true, success: true, ...signProspect(f, p, rc.needed ? releaseId : null) };
}
/** Let the monster go: after a win (turn down its offer) or after a loss (skip the one pitch). Nothing else changes. */
export function declineOffer(f) {
  const e = f.week.encounter; if (!e || (e.status !== 'offer' && e.status !== 'pitch')) return { ok: false, reason: 'No offer on the table.' };
  e.status = 'declined'; f.season.day = 2; f.week.prospects = [];
  return { ok: true };
}
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
/**
 * The plan Friday starts from: this week's plan, else last week's, keeping only plays still in the playbook (a new coordinator
 * brings a different catalog), topped up from the coordinators' default to exactly PLAN_SIZE. Found by the acceptance walkthrough:
 * a stale play blocked "Save game plan" and the staff's auto-run alike.
 */
export function startingPlan(f, side) {
  const cat = [...catalog(f, side), ...legendaryAvailable(f, side)]; const base = (f.week?.plan?.[side]?.length ? f.week.plan[side] : f.lastPlan?.[side]) || [];
  const plan = [...new Set(base)].filter((id) => cat.includes(id));
  for (const id of [...defaultPlan(f, side), ...cat]) { if (plan.length >= PLAN_SIZE) break; if (!plan.includes(id)) plan.push(id); }
  return plan.slice(0, PLAN_SIZE);
}
export function setGamePlan(f, offense, defense) {
  const catO = [...catalog(f, 'offense'), ...legendaryAvailable(f, 'offense')], catD = [...catalog(f, 'defense'), ...legendaryAvailable(f, 'defense')]; // Legendary Plays use the same six slots (GDD §36.3)
  const o = [...new Set(offense)].filter((id) => catO.includes(id)), d = [...new Set(defense)].filter((id) => catD.includes(id));
  if (o.length !== PLAN_SIZE || d.length !== PLAN_SIZE) return { ok: false, reason: `Pick exactly ${PLAN_SIZE} offensive and ${PLAN_SIZE} defensive plays.` };
  f.week.plan = { offense: o, defense: d }; f.lastPlan = { offense: [...o], defense: [...d] };
  if (f.season.day === 4) f.season.day = 5;
  return { ok: true };
}
/** Saturday: three press questions for this week (a rival question when it's the rival game). */
/** Natures split two ways for the pregame reply: physical (speed, strength, agility, arm, tackling) and mental (the rest, and the neutral three). */
export function natureGroup(nature) { const up = NATURES[nature]?.up; return up && ['speed', 'strength', 'agility', 'arm', 'tackling', 'durability'].includes(up) ? 'physical' : 'mental'; }
/** Natures on the field this week, counted: starters weigh three, the rest of the roster one. Drives which questions the press asks. */
export function natureWeights(f) {
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const starting = new Set(Object.values(chart));
  const w = {}; for (const m of f.roster) if (!m.injury) w[m.nature] = (w[m.nature] || 0) + (starting.has(m.id) ? 3 : 1);
  return w;
}
/** Monsters a nature-tagged answer reaches: {total, starters, names}. */
export function natureReach(f, nature) {
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const starting = new Set(Object.values(chart));
  const list = f.roster.filter((m) => m.nature === nature && !m.injury);
  return { total: list.length, starters: list.filter((m) => starting.has(m.id)).length, names: list.map((m) => m.name) };
}
/**
 * Three questions for Saturday (GDD §20.1). Situational questions (rival game, hot seat, playoff, three-game streak,
 * injured starter) jump the queue when live; the rest are drawn by the natures on the field, so the press mostly asks
 * about the monsters the owner actually has. No question repeats within a season.
 */
export function mediaQuestions(f) {
  if (!f.week.mediaQs) {
    const { r, save } = frng(f);
    f.season.mediaAsked ||= [];
    const asked = new Set(f.season.mediaAsked);
    const m = sundayMatchup(f);
    const live = { rival: !!m?.rival, hotseat: onHotSeat(f), playoff: !!f.season.playoffs && !f.season.finished, streakW: streakOf(f) >= 3, streakL: streakOf(f) <= -3, injury: injuredStarter(f) };
    const picks = [];
    for (const [i, q] of QUESTIONS.entries()) { if (!isSituational(q) || asked.has(i)) continue; const key = Object.keys(live).find((k) => q[k]); if (key && live[key] && picks.length < 2) picks.push(i); }
    const weights = natureWeights(f);
    const pool = QUESTIONS.map((q, i) => ({ q, i })).filter(({ q, i }) => !isSituational(q) && !asked.has(i) && !picks.includes(i));
    while (picks.length < MEDIA_QUESTIONS_PER_WEEK && pool.length) {
      const weighted = pool.map(({ q, i }) => [i, 1 + (weights[q.nature] || 0) * 2]);
      const i = r.weighted(weighted); picks.push(i); pool.splice(pool.findIndex((x) => x.i === i), 1);
    }
    if (picks.length < MEDIA_QUESTIONS_PER_WEEK) { f.season.mediaAsked = []; } // a very long season: the press repeats itself
    else f.season.mediaAsked.push(...picks);
    save(); f.week.mediaQs = picks;
  }
  const m = sundayMatchup(f); const rec = record(f); const star = mediaStar(f);
  const fill = (t) => t.replace(/\{opp\}/g, m?.opponent || 'our opponent').replace(/\{rival\}/g, f.rivals[f.tier]?.team || 'your rival').replace(/\{star\}/g, star?.name || 'your star').replace(/\{record\}/g, `${rec.w}-${rec.l}`).replace(/\{club\}/g, f.club).replace(/\{week\}/g, String(f.season.week));
  return f.week.mediaQs.map((i) => ({ id: i, nature: QUESTIONS[i].nature, q: fill(QUESTIONS[i].q), a: QUESTIONS[i].a.map((a) => ({ ...a, text: fill(a.text), reach: natureReach(f, a.t) })) }));
}
function mediaStar(f) { return f.roster.filter((m) => !m.injury).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0] || null; }
function streakOf(f) { let n = 0; for (const g of f.season.schedule.filter((x) => x.result && !x.bye).reverse()) { const won = !!g.result.won; if (n === 0) n = won ? 1 : -1; else if ((n > 0) === won) n += won ? 1 : -1; else break; } return n; }
/** A monster who would start if healthy is injured. */
function injuredStarter(f) { const hurt = f.roster.filter((m) => m.injury); if (!hurt.length) return false; return hurt.some((m) => { const healthy = f.roster.filter((x) => x.position === m.position && !x.injury).map(monsterOverall); return !healthy.length || monsterOverall(m) >= Math.max(...healthy); }); }
/** Answers: array of answer indexes, one per question. Boosts apply on Sunday. */
export function answerMedia(f, answers) {
  const qs = mediaQuestions(f); const boosts = {}; let hype = false; let star = null;
  qs.forEach((q, k) => { const a = q.a[answers[k]]; if (!a) return; boosts[a.t] = Math.min(MEDIA_CAP, (boosts[a.t] || 0) + MEDIA_BOOST); if (a.hype) hype = true; if (a.star) star = mediaStar(f)?.id || null; });
  f.week.media = { answers, boosts, hype, star };
  lineupCheck(f); // Saturday is done: lineup confirmed, on to Sunday
  const groups = Object.entries(boosts).map(([t, v]) => { const reach = natureReach(f, t); return `${NATURES[t].name} +${v}${reach.total ? ` (${reach.total})` : ' (nobody)'}`; }).join(', ');
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
  syncLegendary(f); // Legendary Plays: discovery and plan cleanup (GDD §36)
  if (f.week?.commissioner) return { ok: false, reason: 'The commissioner is waiting for your decision.', did: [] };
  const did = [];
  let guard = 0;
  while (f.season.day < 6 && guard++ < 10) {
    const day = f.season.day;
    if (isBye(f) && day >= 3) { f.season.day = 6; did.push('Bye week: rested'); break; }
    if (draftWindow(f) && day === 0) { const r = scoutDraft(f); did.push(r.ok ? `Studied ${r.studied.length} draft prospects` : 'Draft class not ready'); continue; }
    if (draftWindow(f) && day === 1) { const r = recoveryDay(f); did.push(`Recovery day${r.healed?.length ? ': ' + r.healed.join(', ') + ' healed' : ''}`); continue; }
    if (day === 0) { const scout = staffMember(f, 'head_scout'); const best = Object.entries(REGIONS).sort((a, b) => (scout?.biomes?.[b[1].biome] ?? 50) - (scout?.biomes?.[a[1].biome] ?? 50))[0][0]; const r = scoutRegion(f, best); did.push(`Scouted ${best}: ${r.prospects?.length || 0} prospects`); }
    else if (day === 1) {
      const pick = f.week.prospects.map((p, i) => ({ p, i })).filter(({ p }) => p.revealed >= 4 && !salarySummary(f, p.monster.salary).over && f.roster.length < ROSTER_MAX)
        .map((x) => ({ ...x, gain: monsterOverall(x.p.monster) - Math.max(0, ...f.roster.filter((m) => m.position === x.p.monster.position).map((m) => monsterOverall(m))) }))
        .filter((x) => x.gain >= 2).sort((a, b) => b.gain - a.gain)[0];
      if (pick && startEncounter(f, pick.i).ok) {
        const b = resolveEncounter(f);
        if (b.won) { const r = acceptOffer(f); did.push(r.ok ? `Beast Clash won: signed ${pick.p.monster.name}` : `Beast Clash won, but ${pick.p.monster.name} could not be fitted on the roster`); if (!r.ok) declineOffer(f); }
        else { const r = recruit(f, pick.i, 'development'); did.push(r.success ? `Beast Clash lost, but ${pick.p.monster.name} signed anyway` : `Beast Clash lost; ${pick.p.monster.name} turned us down`); }
        if (f.season.day === 1) skipRecruit(f);
      }
      else { skipRecruit(f); did.push('Skipped the encounter'); }
    }
    else if (day === 2) { const order = ['passing', 'rushing', 'coverage', 'pass_rush']; const last = (f.trainingHistory || []).slice(-1)[0]; const focus = order[(order.indexOf(last) + 1) % order.length]; const r = setTraining(f, focus, 'normal'); did.push(`${TRAINING_FOCI[focus].label} practice ${r.success ? 'went well' : 'was sloppy'}${r.injury ? `; ${r.injury.name} hurt` : ''}`); }
    else if (day === 3) { const opp = opponentName(f); const side = opp ? (teamStrengths(aiTeam(f, opp)).passD < teamStrengths(aiTeam(f, opp)).runD ? 'defense' : 'offense') : 'offense'; scoutOpponent(f, side); did.push(opp ? `Scouted ${opp}'s ${side}` : 'Bye week'); }
    else if (day === 4) { setGamePlan(f, startingPlan(f, 'offense'), startingPlan(f, 'defense')); did.push('Coordinators set the game plan'); }
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
/** Best lineup (GDD §20.8): every position ordered by overall, highest first; manual slot picks cleared. Injured monsters stay in order and are skipped on Sunday as always. */
export function autoDepth(f) {
  f.depth = {}; f.lineupManual = {};
  for (const group of Object.keys(GROUP_SLOTS)) f.depth[group] = f.roster.filter((m) => m.position === group).sort((a, b) => monsterOverall(b) - monsterOverall(a)).map((m) => m.id);
  return { ok: true };
}
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
  syncLegendary(f); // Legendary Plays: discovery and plan cleanup (GDD §36)
  const m = sundayMatchup(f); if (!m) return;
  const playoffRoundNow = playoffFixture(f)?.round || null;
  const side = m.playerSide, oppSide = side === 'home' ? 'away' : 'home';
  for (const x of m[oppSide].roster) dexRecord(f, x, 'seen'); // every monster you face goes in the dex
  const won = gameState.winner === side;
  settleTiebreak(f, gameState); // a tied game that reached the screen's end without the Clash (should not happen) is settled headless
  const pg = f.week.pregame; const res = { week: f.season.week, home: m.home.name, away: m.away.name, homeScore: gameState.score.home, awayScore: gameState.score.away, ot: !!gameState.ot, player: true, winner: gameState.winner ? m[gameState.winner].name : null, clash: gameState.tiebreak || null, pregameClash: pg?.result ? { winner: gameState.coin?.winner || null, choice: gameState.coin?.choice || null, by: pg.result.by, exchanges: pg.result.exchanges, playerWon: pg.result.winner === 'a' } : null };
  const { r, save } = frng(f);
  const events = afterGame(f.roster, m[side].chart, gameState.stats[side].players, r, { won, autoSpend: !!f.settings.autoPoints, autoEvolve: false });
  aiAfterGame(f, m[oppSide], gameState, oppSide, r); // the persistent opponent develops from this game too (GDD §42.6)
  save();
  f.week.events = events;
  f.week.gameResult = { ...res, won, playerScore: gameState.score[side], oppScore: gameState.score[oppSide], opponent: m.opponent, tag: m.tag };
  { const offense = {}, defense = {}; let passes = 0, plays = 0;
    for (const c of gameState.calls || []) { if (c.side === side) { offense[c.off] = (offense[c.off] || 0) + 1; plays++; if (PLAYS[c.off]?.type === 'pass') passes++; } else defense[c.def] = (defense[c.def] || 0) + 1; }
    (f.season.scouting ||= []).push({ week: f.season.week, opponent: m.opponent, offense, defense, passes, plays }); }
  if (m.rival) { f.rivals[f.tier].headToHead[won ? 'w' : 'l'] += 1; news(f, won ? `RIVALRY WIN over ${m.opponent}. GM ${f.rivals[f.tier].gm} will remember this.` : `${m.opponent}'s GM ${f.rivals[f.tier].gm} gets bragging rights this time.`, won ? 'win' : 'loss'); 
    if (f.week.media?.hype) { if (won) news(f, 'You backed up the trash talk. The locker room loves it.', 'win'); else { f.rattled = true; news(f, 'The trash talk backfired. The team is rattled: next week\'s practice is harder.', 'loss'); } }
  }
  recordGame(f, gameState, { home: m.home, away: m.away }, { playoff: !!m.playoff, booksFor: (t) => leagueBooks(f, t) });
  if (m.playoff) { recordPlayoffResult(f, res); }
  else { applyResult(f.season.records, res); f.season.results.push(res); const fx = currentFixture(f); fx.result = { playerScore: gameState.score[side], oppScore: gameState.score[oppSide], won }; }
  news(f, `${won ? 'WIN' : 'LOSS'} ${gameState.score[side]}-${gameState.score[oppSide]} vs ${m.opponent}${gameState.tiebreak ? ` (OT · ${gameState.tiebreak.size}v${gameState.tiebreak.size} Beast Clash)` : gameState.ot ? ' (OT)' : ''}.`, won ? 'win' : 'loss');
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
    if (!f.campaign.badges[m.opponent]) { f.campaign.badges[m.opponent] = { year: f.season.year, week: f.season.week, score: `${gameState.score[side]}-${gameState.score[oppSide]}` }; f.campaign.lastBadge = { club: m.opponent, year: f.season.year, week: f.season.week, n: Object.keys(f.campaign.badges).length }; news(f, `BADGE EARNED: the ${gym.badge} · badge ${Object.keys(f.campaign.badges).length} of 8. ${gym.coach.name}'s ${m.opponent} fall to ${f.club} ${gameState.score[side]}-${gameState.score[oppSide]}.`, 'win'); }
  }
  // Level-ups are shown after the game and on the Career Timeline; the club log keeps evolutions and injuries.
  for (const e of events.filter((x) => x.kind !== 'xp' && x.kind !== 'levelup')) news(f, e.kind === 'levelup' ? `${e.name} reached level ${e.level} (${e.from} → ${e.to} OVR)${f.settings.autoPoints ? '' : ', 2 attribute points to spend on the roster'}.` : e.kind === 'evolve' ? `EVOLUTION! ${e.from} evolved into ${e.to}.` : e.kind === 'injury' ? `${e.name} injured: ${e.severity}, out ${e.weeks} week${e.weeks === 1 ? '' : 's'}.` : e.name, e.kind === 'evolve' ? 'win' : e.kind, e.id ? { mid: e.id, mname: e.kind === 'evolve' ? e.to : e.name } : null);
  for (const e of events) if (e.kind === 'evolve') { const x = f.roster.find((p) => p.id === e.id); if (x) dexRecord(f, x, 'signed'); }
  f.game = null;
  recordPlayStats(f, gameState, side);
  // Career Timeline (GDD §38): read-only, after the game's stats are in the books.
  careerAfterGame(f.roster, { year: f.season.year, week: f.season.week, club: f.club, playoffRound: playoffRoundNow, rival: !!m.rival, won, opponent: m.opponent, records: f.records });
  for (const e of events) if (e.kind === 'evolve') { const x = f.roster.find((p) => p.id === e.id); if (x) noteEvolution(x, { year: f.season.year, week: f.season.week, club: f.club, from: e.from, to: e.to }); }
  f.lastGame = { ...f.week.gameResult, events, year: f.season.year, week: f.season.week, newBadge: f.campaign.badges[m.opponent]?.year === f.season.year && f.campaign.badges[m.opponent]?.week === f.season.week && won ? m.opponent : null };
  { const rvTeam = f.rivals?.[f.tier]?.team; const vsRival = f.season.schedule.filter((g) => g.opponent === rvTeam && g.result);
    checkAchievements(f, 'sunday', { won, opponent: m.opponent, rival: rvTeam === m.opponent, newBadge: !!f.lastGame?.newBadge, playoffRound: playoffRoundNow, rivalSeasonWins: vsRival.filter((g) => g.result.won).length + (rvTeam === m.opponent && won && !f.season.schedule.find((g) => g.week === f.season.week)?.result ? 1 : 0), rivalSeasonLosses: vsRival.filter((g) => !g.result.won).length + (rvTeam === m.opponent && !won && !f.season.schedule.find((g) => g.week === f.season.week)?.result ? 1 : 0) }); }
  advanceWeek(f);
  return f.lastGame;
}
export function takeBye(f) {
  if (!isBye(f) || f.season.day !== 6) return { ok: false };
  f.week.gameResult = { bye: true };
  advanceWeek(f, { bye: true });
  return { ok: true };
}
/**
 * League News for the week just played (GDD §39): scoreboard, headlines, records, award races, or a playoff round. Read-only:
 * written after every game of the week is in the books, never drawing a random number.
 */
function writeLeagueNews(f, round = null) {
  const year = f.season.year, week = f.season.week; const club = f.club; const rival = f.rivals?.[f.tier]?.team || null;
  ensureLeagueNews(f);
  const items = round
    ? playoffNews({ year, week, round, results: f.season.playoffs?.results || [], club, rival })
    : f.season.results.some((g) => g.week === week) // a league-wide bye week has no news
      ? [...resultsNews({ year, week, results: f.season.results, club, rival }), ...raceNews({ year, week, races: awardRaces(f, { n: 2 }), meta: f.leagueNewsMeta })]
      : [];
  items.push(...recordNews({ year, week, records: f.records, seasonsInBook: (f.history || []).length, scope: 'game' }));
  addLeagueNews(f, items);
}
function advanceWeek(f, { bye = false } = {}) {
  const round = inPlayoffs(f) ? f.season.playoffs?.round : null;
  if (!inPlayoffs(f)) simulateLeagueWeek(f);
  else simulatePlayoffWeek(f);
  writeLeagueNews(f, round);
  if (bye) recoverWeek(f.roster, { bye: true }); // a normal week recovers on Saturday, so the week shows the fatigue from Sunday
  leagueRecoverWeek(f, { bye }); // the 15 persistent rosters rest and heal once a week (GDD §42.6)
  leagueCover(f); // a club left without a legal lineup by injuries signs cover before next week
  f.season.week += 1; f.season.day = 0;
  const lastPlan = f.week.plan;
  f.week = blankWeek(); f.week.plan = lastPlan; // keep the plan as the default for next week
  maybeTradeCall(f); // a club may call with an offer this week (GDD §19.6)
  if (draftWindow(f)) ensureDraftClass(f);
  if (f.season.week === 11) startPlayoffs(f);
  if (inPlayoffs(f) && f.season.playoffs?.champion) { endSeason(f); return; }
  if (inPlayoffs(f) && !playoffFixture(f)) {
    // Eliminated (or never qualified): the owner watches the bracket round by round (advancePlayoffs) or skips to the offseason (skipPlayoffs).
    f.season.spectating = true;
    if (f.season.playoffs.champion) endSeason(f);
  }
}
/** Spectating: play the next playoff round. Returns that round's results; ends the season after the Beast Bowl. */
export function advancePlayoffs(f) {
  if (!inPlayoffs(f) || playoffFixture(f) || f.season.finished) return { ok: false, reason: 'Nothing to advance.' };
  const p = f.season.playoffs; const round = p.round;
  simulatePlayoffWeek(f); writeLeagueNews(f, round); leagueRecoverWeek(f, {}); f.season.week += 1; f.season.day = 0; { const lastPlan = f.week.plan; f.week = blankWeek(); f.week.plan = lastPlan; }
  const results = p.results.filter((x) => x.round === round);
  if (p.champion) endSeason(f);
  return { ok: true, round, results, champion: p.champion || null, finished: !!f.season.finished };
}
export function skipPlayoffs(f) { let guard = 0; while (!f.season.finished && guard++ < 5) { const r = advancePlayoffs(f); if (!r.ok) break; } return { ok: true }; }
export const ROUND_NAMES = Object.freeze({ 1: 'Wild Card round', 2: 'Conference finals', 3: 'Beast Bowl' });

// ------------------------------------------------------------ playoffs
function startPlayoffs(f) {
  const st = leagueStandings(f);
  const seeds = { Aurora: st.conferences.Aurora.seeds, Titan: st.conferences.Titan.seeds };
  const fixtures = playoffRound(1, [], seeds).map((g) => ({ ...g, round: 1, week: 11, result: null }));
  f.season.playoffs = { seeds, round: 1, fixtures, results: [], champion: null };
  addLeagueNews(f, playoffFieldNews({ year: f.season.year, week: 10, seeds, records: f.season.records }));
  finalizeAwards(f);
  const qualified = Object.values(seeds).flat().includes(f.club);
  checkAchievements(f, 'playoffs', { qualified });
  news(f, qualified ? `Playoffs! ${f.club} qualified as the ${seedLabel(seeds, f.club)}.` : `Regular season over: ${f.club} missed the playoffs.`, qualified ? 'win' : 'loss');
}
function seedLabel(seeds, club) { for (const [conf, s] of Object.entries(seeds)) { const i = s.indexOf(club); if (i >= 0) return `${conf} #${i + 1} seed`; } return 'a qualifier'; }
function recordPlayoffResult(f, res) {
  const p = f.season.playoffs;
  const g = p.fixtures.find((x) => x.round === p.round && x.home === res.home && x.away === res.away);
  const winner = res.winner || (res.homeScore > res.awayScore ? res.home : res.away);
  g.result = res; p.results.push({ round: p.round, conf: g.conf, winner, home: res.home, away: res.away, homeScore: res.homeScore, awayScore: res.awayScore, ot: res.ot, clash: res.clash || null });
}
function simulatePlayoffWeek(f) {
  const p = f.season.playoffs; if (!p || p.champion) return;
  const { r, save } = frng(f);
  for (const g of p.fixtures.filter((x) => x.round === p.round && !x.result)) {
    const home = aiTeam(f, g.home), away = aiTeam(f, g.away);
    const toss = leaguePregame(f, r, home, away);
    const game = playGame({ home, away, venue: gameVenue(f, home.name), seed: r.seed(), quarterLength: 180, comeback: comebackRule(f), coinWinner: toss.coinWinner, choice: toss.choice, otPeriods: OT_PERIODS });
    leagueTiebreak(f, r, home, away, game, { playoff: true });
    aiAfterGame(f, home, game, 'home', r); aiAfterGame(f, away, game, 'away', r);
    recordGame(f, game, { home, away }, { playoff: true, booksFor: (t) => leagueBooks(f, t) });
    const res = { week: f.season.week, home: g.home, away: g.away, homeScore: game.score.home, awayScore: game.score.away, ot: !!game.ot, winner: game.winner ? (game.winner === 'home' ? g.home : g.away) : null, clash: game.tiebreak || null, pregameClash: toss.clash ? { winner: toss.coinWinner, choice: toss.choice, by: toss.clash.by, exchanges: toss.clash.exchanges } : null };
    g.result = res; p.results.push({ round: p.round, conf: g.conf, ...res, winner: res.winner || (res.homeScore > res.awayScore ? g.home : g.away) });
  }
  save();
  if (p.round === 3) { p.champion = p.results.find((x) => x.round === 3).winner; f.season.champion = p.champion; return; }
  p.round += 1;
  p.fixtures.push(...playoffRound(p.round, p.results, p.seeds).map((g) => ({ ...g, round: p.round, week: 10 + p.round, result: null })));
}

// ------------------------------------------------------------ season end
function endSeason(f) {
  const s = f.season; const st = leagueStandings(f); const wasHotSeat = onHotSeat(f);
  const champion = s.playoffs?.champion || null;
  const rec = record(f);
  if (champion === f.club) { f.badges[f.tier] += 1; f.qualification[f.tier] += 1; f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 }; f.campaign.titles += 1; news(f, `BEAST BOWL CHAMPIONS! ${f.club} win the ${tierById(f.tier).name} title.`, 'win'); }
  if (champion) addLeagueNews(f, championNews({ year: s.year, week: 13, final: (s.playoffs?.results || []).find((x) => x.round === 3) }));
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
  if (champion === f.club) f.history[f.history.length - 1].championship = championshipRecord(f, s); // the ceremony and its summary (GDD §35)
  updateSeasonRecords(f, s.year); // the records book (GDD §17.8)
  addLeagueNews(f, recordNews({ year: s.year, week: 13, records: f.records, seasonsInBook: (f.history || []).length, scope: 'season' }));
  careerSeasonEnd(f.roster, { year: s.year, club: f.club, awards: s.awards, records: f.records, champion }); // Career Timeline (GDD §38)
  leagueSeasonEnd(f, { year: s.year, awards: s.awards, records: f.records, champion }); // the 15 persistent rosters' season-end events (GDD §42.6)
  archiveSeasonTables(f); // the season's league tables stay readable from the statistics screens (2026-10-22)
  { const winners = new Set(Object.values(s.awards?.league || {}).filter((w) => w && w.team === f.club).map((w) => w.id)); openOffseason(f, { year: s.year, awardWinnerIds: winners, winningRecord: rec.w > rec.l }); if (offseasonPending(f).length) news(f, `Offseason: ${offseasonPending(f).length} contract${offseasonPending(f).length === 1 ? '' : 's'} up for renewal.`, 'info'); }
  noteGrowth(f, (c) => aiTeam(f, c, s.year));
  if (hasLeague(f)) for (const c of leagueClubs(f)) { const st = clubRecord(f, c).strategy; st.today = teamOverall(legacyAiTeam(f, c, s.year + 1)); st.todayYear = s.year + 1; } // today's generated strength for the coming season, computed once and reused by the transition and the Board's forecast
  const excessOf = (c) => teamOverall(aiTeam(f, c, s.year)) - preseasonTarget(f, c, todayOverall(f, c, s.year + 1));
  if (hasLeague(f)) f.leagueOffseason = { ...(f.leagueOffseason?.opened === s.year ? f.leagueOffseason : {}), closed: s.year, contracts: leagueContracts(f, { year: s.year, cap: tierById(f.tier).cap, excessOf }) }; // AI clubs re-sign or let walk, and trim to the cap (GDD §42.6 steps 4; decision D)
  maybeTradeCall(f); // a club may call as the offseason opens (GDD §19.6)
  // The board's goal (GDD §17.4): settled now, before the offseason.
  { const gymWinsThisYear = Object.values(f.campaign?.badges || {}).filter((b) => b.year === s.year).length;
    const verdict = settleGoal(f, { wins: rec.w, playoffs: !!s.playoffs?.seeds && Object.values(s.playoffs.seeds).flat().includes(f.club), badgesWon: gymWinsThisYear, champion: champion === f.club, forecastWins: boardForecastFor(f, s.schedule.filter((g) => !g.bye).length || 9).wins });
    if (verdict) { s.boardVerdict = verdict; news(f, verdict.met ? `BOARD: goal met, ${verdict.goal.label}. Confidence ${verdict.confidence >= 0 ? '+' : ''}${verdict.confidence} (${confidenceLabel(verdict.confidence)}). The scouting department expands next season.` : verdict.status === 'fired' ? `BOARD: goal missed · ${verdict.goal.label} (${rec.w} wins, forecast ${verdict.goal.forecastWins ?? '?'}). ${verdict.reason ? verdict.reason[0].toUpperCase() + verdict.reason.slice(1) + '.' : ''} The board has let you go.` : verdict.status === 'warning' ? `BOARD: goal missed narrowly · ${verdict.goal.label} (${rec.w} wins, forecast ${verdict.goal.forecastWins ?? '?'}). Final warning: you stay on the hot seat. A clear miss, or a third missed season in a row, and you are out.` : verdict.status === 'hot_seat' ? `BOARD: goal missed · ${verdict.goal.label}. You are on the hot seat: miss again and you are out.` : `BOARD: goal missed · ${verdict.goal.label}. Confidence ${verdict.confidence}.`, verdict.met ? 'win' : 'loss'); } }
  if (rec.w < rec.l || onHotSeat(f)) f.postseason = makePostseasonEvent(f); // a losing record, or the hot seat, makes one story event mandatory (GDD §15.7, §17.4)
  if (champion === f.club && legendChoices(f).length) f.legendPick = { year: s.year, resolved: false }; // Beast Bowl champions choose a Legend Track (GDD §15.8)
  // Campaign: league awards won by this club's monsters count toward the Hall of Fame.
  f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 };
  const mine = Object.entries(s.awards.league || {}).filter(([, w]) => w && w.team === f.club);
  f.campaign.awards += mine.length;
  s.finished = true;
  checkAchievements(f, 'season', { wins: rec.w, losses: rec.l, champion: champion === f.club, awardsWon: mine.length, awardLine: mine.length ? mine.map(([k, w]) => `${w.name}: ${AWARDS[k]?.label || k}.`).join(' ') : '', wasHotSeat, goalMet: !!s.boardVerdict?.met });
}
export const TIERS_ENABLED = false;

/**
 * What the Beast Bowl ceremony needs, written once when the title is won (GDD §35.2): the final, the records, the awards
 * the club's monsters won, the starters and the active roster as small snapshots (name, species, type, position, slot,
 * ability name). No animation data: the ceremony is rebuilt from this, so it can be replayed from the history forever.
 */
export function championshipRecord(f, s = f.season) {
  const p = s.playoffs || {}; const fin = (p.results || []).find((x) => x.round === 3) || null;
  const mine = fin ? (fin.home === f.club ? 'home' : 'away') : null;
  const games = (p.results || []).filter((x) => x.home === f.club || x.away === f.club);
  const rec = s.records?.[f.club] || { w: 0, l: 0, t: 0 };
  const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
  const snap = (m, slot = null, side = null) => { return { id: m.id, name: m.name, species: m.species, stage: m.stage || 0, type: m.type, position: m.position, slot, side, ability: speciesEffect(m)?.name || null, abilityKind: speciesEffect(m)?.kind || null, ovr: monsterOverall(m) }; };
  const starters = [...OFFENSE_BASE.map((sl) => [sl, 'offense']), ...DEFENSE_BASE.map((sl) => [sl, 'defense'])].map(([sl, side]) => (byId[chart[sl]] ? snap(byId[chart[sl]], sl, side) : null)).filter(Boolean);
  const seen = new Set(); const startersU = starters.filter((x) => (seen.has(x.id) ? false : seen.add(x.id)));
  const captain = (f.roster.find((m) => m.cornerstone && seen.has(m.id)) || startersU.slice().sort((a, b) => b.ovr - a.ovr)[0] || null);
  const awards = Object.entries(s.awards?.league || {}).filter(([, w]) => w && w.team === f.club).map(([k, w]) => ({ key: k, label: AWARDS[k]?.label || k, name: w.name }));
  return {
    year: s.year, tier: f.tier, club: f.club, color: TEAM_META[f.club]?.color || '#f5c542',
    final: fin ? { opponent: mine === 'home' ? fin.away : fin.home, us: mine === 'home' ? fin.homeScore : fin.awayScore, them: mine === 'home' ? fin.awayScore : fin.homeScore, ot: !!fin.ot, venue: venueFor(fin.home, 'bowl', f.stadiums || null).name, venueEnv: venueFor(fin.home, 'bowl', f.stadiums || null).env, home: fin.home } : null,
    record: { w: rec.w, l: rec.l, t: rec.t || 0 }, playoffs: { w: games.filter((x) => x.winner === f.club).length, l: games.filter((x) => x.winner && x.winner !== f.club).length },
    awards, captain: captain ? captain.id : null, starters: startersU,
    roster: f.roster.filter((m) => !m.injury && !seen.has(m.id)).map((m) => snap(m)),
  };
}

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
  addLeagueNews(f, awardNews({ year: f.season.year, week: 10, winners: f.season.awardsFinal.winners }));
  for (const [k, w] of Object.entries(f.season.awardsFinal.winners)) if (w && w.team === f.club) news(f, `${AWARDS[k].short}: ${k === 'coy' ? 'your staff' : w.name}, one of yours!`, 'win');
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
  syncLegendary(f); // Legendary Plays: discovery and plan cleanup (GDD §36)
  if (!f.season.finished) return { ok: false, reason: 'The season is not over.' };
  if (isFired(f)) return { ok: false, reason: 'The board has let you go. This franchise is over.' };
  { const cap = mayStartSeason(f); if (!cap.ok) return { ok: false, reason: cap.reason, cap: !!cap.cap }; } // the 20-season career (GDD §42.1)
  if (!offseasonReady(f)) return { ok: false, reason: `${offseasonPending(f).length} contract decision${offseasonPending(f).length === 1 ? '' : 's'} still waiting.` };
  if (!draftDone(f)) return { ok: false, reason: 'The draft has not been held.' };
  if (f.roster.length < ROSTER_MIN) return { ok: false, reason: `You need at least ${ROSTER_MIN} monsters to start a season (you have ${f.roster.length}). Sign free agents in the offseason market.` };
  if (nextStaffRole(f)) return { ok: false, reason: 'Hire a full staff first.' };
  if (f.postseason && !f.postseason.resolved) return { ok: false, reason: 'A postseason decision is waiting.' };
  if (f.legendPick && !f.legendPick.resolved) return { ok: false, reason: 'Choose your Legend Track first.' };
  f.deadCap = f.pendingDeadCap || 0; f.pendingDeadCap = 0; // bonuses and raises agreed in the offseason land on the new season's books
  const { r, save } = frng(f);
  const events = offseason(f.roster, r);
  if (!hasLeague(f)) ageDraftees(f, f.season.year); // the generated rosters' draftees (v40 saves); persistent rosters age below
  for (const m of f.roster) if (m.rookie === f.season.year) { m.yearsPro = 0; m.age -= 1; } // just drafted: the coming season is their first (offseason() aged everyone)
  if (hasLeague(f)) { // the league's offseason after the owner's (GDD §42.6 steps 3, 6-8; decisions C, D, F)
    const t0 = globalThis.performance?.now?.() ?? Date.now();
    const year = f.season.year, next = year + 1, cap = tierById(f.tier).cap;
    const targetOf = (club) => clubQuality(f, club, next); // arrivals are generated at the club's quality for the coming season
    const overallTarget = (club) => preseasonTarget(f, club, todayOverall(f, club, next)); // today's generated team for the season, less the growth the club will gain by playing it (league-season.js calibration)
    leagueAgeing(f, r, { year }); leagueTrim(f, { year: next, cap }); // salaries refreshed with the ratings: back under the cap before anyone shops
    const fa = leagueFreeAgency(f, r, { year: next, cap, targetOf });
    const nudge = leagueNudge(f, r, { year: next, cap, targetOf: overallTarget, teamOf: (club) => aiTeam(f, club, next) });
    const overCap = leagueTrim(f, { year: next, cap }); leagueInjuryCover(f, r, { year: next, cap, targetOf });
    const problems = validateClubs(f, { cap }); const structural = verifyLeague(f);
    f.leagueOffseason = { ...(f.leagueOffseason?.closed === year ? f.leagueOffseason : {}), opened: next, freeAgency: fa, nudge, overCap, problems }; lastTransitionMs = Math.round(((globalThis.performance?.now?.() ?? Date.now()) - t0) * 10) / 10; // the timing stays out of the save
    if (structural.length) throw Object.assign(new Error(`The league registry is damaged: ${structural[0]}`), { code: 'league', problems: structural }); // never the owner's fault, never silent; a club over the cap at the roster floor is reported, not fatal
  }
  save();
  startSeason(f, f.season.year + 1);
  f.offseason = null; f.draft = null;
  news(f, `The ${yearOf(f.season.year)} season begins.`, 'info');
  return { ok: true, events };
}

/** Headless: simulate the player's game too (for Key Moments "sim to end" and tests). */
export function simulatePlayerGame(f) {
  const m = sundayMatchup(f); if (!m) return null;
  const toss = pregamePossession(f); // the pregame Clash decides possession (headless: Auto, and the AI's choice when it wins)
  const { r, save } = frng(f);
  const game = playGame({ home: m.home, away: m.away, venue: gameVenue(f, m.home.name), seed: r.seed(), quarterLength: f.settings.quarterLength, comeback: comebackRule(f), coinWinner: toss.coinWinner, choice: toss.choice, otPeriods: OT_PERIODS });
  save();
  settleTiebreak(f, game); // still tied after the overtime quarter: the overtime Clash decides (headless: Auto)
  return game;
}

// ------------------------------------------------------------ the overtime Clash (Beast Clash in Franchise Mode, GDD §26.3)
// Football plays one overtime period. If the score is still tied, a Beast Clash decides the game: 3v3 in the regular season, 5v5
// in the playoffs. The football score stands as played; the Clash is recorded separately and names the winner.
export const OT_PERIODS = 1;
export function overtimePreview(f) {
  const m = sundayMatchup(f); if (!m) return { ok: false, reason: 'No game today.' };
  const theirs = m[m.playerSide === 'home' ? 'away' : 'home'];
  const n = m.playoff ? CLASH_SIZE.overtimePlayoff : CLASH_SIZE.overtime;
  const eligible = eligibleBattlers(f.roster);
  const wild = autoLineup(theirs.roster, n, hashString(`${f.seed}|ot|${f.season.year}|${f.season.week}|${theirs.name}`));
  const size = Math.min(n, eligible.length, wild.length);
  if (size < 1) return { ok: false, reason: 'Nobody healthy enough to battle.', eligible, size: 0, opponent: m.opponent };
  return { ok: true, eligible, size, full: n, wild: wild.slice(0, size), lineup: autoLineup(f.roster, size, hashString(`${f.seed}|ot|${f.season.year}|${f.season.week}`)), opponent: m.opponent, matchup: m, playoff: !!m.playoff };
}
export function startOvertimeClash(f, { lineup = null, mode = 'watch' } = {}) {
  if (f.week.overtime && f.week.overtime.status !== 'ready') return { ok: false, reason: 'The overtime Clash is already under way.' };
  const pv = overtimePreview(f); if (!pv.ok) return pv;
  const eligibleIds = new Set(pv.eligible.map((x) => x.id));
  const mine = (lineup || pv.lineup.map((x) => x.id)).filter((id, i, arr) => eligibleIds.has(id) && arr.indexOf(id) === i).slice(0, pv.size);
  if (!mine.length) return { ok: false, reason: 'Pick at least one healthy monster.' };
  const size = Math.min(pv.size, mine.length);
  const { r, save } = frng(f); const seed = r.seed(); save();
  const theirs = pv.wild.slice(0, size);
  f.week.overtime = { opponent: pv.opponent, side: pv.matchup.playerSide, playoff: pv.playoff, seed, size, mine, theirs: theirs.map((x) => x.id), a: mine.map((id) => snapMonster(f.roster.find((m) => m.id === id))), b: theirs.map(snapMonster), mode: normalizeMode(mode) || 'watch', policies: { ...FRANCHISE_POLICIES }, decisions: {}, status: 'battle', result: null };
  return { ok: true, overtime: f.week.overtime };
}
export function overtimeBattle(f, { log = 'full' } = {}) {
  const e = f.week.overtime; if (!e || !e.seed) return null;
  const a = e.a, b = e.b; if (!a || !b) return null;
  if (!a.length || !b.length) return null;
  return runBattle({ a, b, seed: e.seed, mode: e.mode, decisions: e.decisions, policies: policiesOf(e), log });
}
export function overtimeDecide(f, ex, choice) {
  const e = f.week.overtime; if (!e || e.status !== 'battle') return { ok: false, reason: 'No battle in progress.' };
  if (choice === 'stay') for (let k = 0; k < SWAP_EVERY; k++) e.decisions[ex + k] = 'stay'; else e.decisions[ex] = choice;
  return { ok: true };
}
export function resolveOvertimeClash(f) {
  const e = f.week.overtime; if (!e) return { ok: false, reason: 'No overtime Clash.' };
  if (e.status !== 'battle') return { ok: true, overtime: e, already: true, won: e.result?.winner === 'a' };
  const result = overtimeBattle(f); if (!result) return { ok: false, reason: 'The battle could not be rebuilt.' };
  if (policiesOf(e).a === 'manual' && pendingDecision(result)) return { ok: false, reason: 'A swap decision is still open.', pending: pendingDecision(result) };
  const { r, save } = frng(f);
  const events = applyBattleEffects(f.roster, result, 'a', 'overtime', r, { autoSpend: !!f.settings.autoPoints });
  save();
  e.result = battleSummary(result); e.events = events; e.status = 'done';
  return { ok: true, overtime: e, won: result.winner === 'a', result, events };
}
/** The Clash's verdict written onto the finished football state: `winner` is set, the score is untouched, `tiebreak` records the Clash. */
export function applyTiebreak(f, state) {
  const e = f.week.overtime; if (!state?.needsTiebreak || state.winner || !e || e.status !== 'done') return false;
  const won = e.result.winner === 'a'; const me = e.side; state.winner = won ? me : (me === 'home' ? 'away' : 'home');
  state.tiebreak = { kind: 'clash', size: e.size, winner: state.winner, by: e.result.by, exchanges: e.result.exchanges, playerWon: won };
  return true;
}
/** Headless: settle a tied game with an Auto overtime Clash (a Play battle left mid-decision falls back to Auto). */
export function settleTiebreak(f, state) {
  if (!state?.needsTiebreak || state.winner) return false;
  if (!f.week.overtime || f.week.overtime.status === 'ready') { const st = startOvertimeClash(f); if (!st.ok) { state.winner = null; return false; } }
  const e = f.week.overtime; if (e.status === 'battle') { if (policiesOf(e).a === 'manual') { e.policies = { a: 'smart', b: 'smart' }; e.mode = 'watch'; } resolveOvertimeClash(f); } // a legacy Play battle left mid-decision: settled headless as it would have been in Auto
  return applyTiebreak(f, state);
}
/** Headless overtime Clash for a tied league game between two AI clubs: 3v3 in the season, 5v5 in the playoffs. */
export function leagueTiebreak(f, r, home, away, state, { playoff = false } = {}) {
  if (!state.needsTiebreak || state.winner) return null;
  const n = playoff ? CLASH_SIZE.overtimePlayoff : CLASH_SIZE.overtime;
  const a = autoLineup(home.roster, n, hashString(`${f.seed}|ot|${f.season.year}|${f.season.week}|${home.name}`));
  const b = autoLineup(away.roster, n, hashString(`${f.seed}|ot|${f.season.year}|${f.season.week}|${away.name}`));
  if (!a.length || !b.length) { state.winner = r.chance(0.5) ? 'home' : 'away'; return { kind: 'coin' }; }
  const result = runBattle({ a, b, seed: r.seed(), log: 'none' });
  state.winner = result.winner === 'a' ? 'home' : 'away';
  state.tiebreak = { kind: 'clash', size: Math.min(a.length, b.length), winner: state.winner, by: result.by, exchanges: result.exchanges };
  return state.tiebreak;
}

// ------------------------------------------------------------ the pregame Clash (Beast Clash in Franchise Mode, GDD §26.2)
// The coin toss is a 3v3 Beast Clash between the two Sunday rosters. The winner chooses: receive, defer or kick. When the AI wins
// it chooses for itself (defer two times in three, as the coin-toss AI did). Every league game is decided the same way, headless.
/** Who can battle today and the proposed lineups (yours and theirs). Reasons when no battle can happen. */
export function pregamePreview(f) {
  const m = sundayMatchup(f); if (!m) return { ok: false, reason: 'No game today.' };
  if (m.forfeit) return { ok: false, reason: m.forfeitReason || 'No legal lineup.' };
  const theirs = m[m.playerSide === 'home' ? 'away' : 'home'];
  const eligible = eligibleBattlers(f.roster);
  const wild = autoLineup(theirs.roster, CLASH_SIZE.pregame, hashString(`${f.seed}|pre|${f.season.year}|${f.season.week}|${theirs.name}`));
  const size = Math.min(CLASH_SIZE.pregame, eligible.length, wild.length);
  if (size < 1) return { ok: false, reason: 'Nobody healthy enough to battle.', eligible, size: 0, opponent: m.opponent };
  return { ok: true, eligible, size, wild: wild.slice(0, size), lineup: autoLineup(f.roster, size, hashString(`${f.seed}|pre|${f.season.year}|${f.season.week}`)), opponent: m.opponent, matchup: m };
}
export function startPregameClash(f, { lineup = null, mode = 'watch' } = {}) {
  if (f.season.day !== 6) return { ok: false, reason: 'Not Sunday.' };
  if (f.game) return { ok: false, reason: 'The game has already started.' };
  if (f.week.pregame && f.week.pregame.status !== 'ready') return { ok: false, reason: 'The pregame Clash is already under way.' };
  const pv = pregamePreview(f); if (!pv.ok) return pv;
  const eligibleIds = new Set(pv.eligible.map((x) => x.id));
  const mine = (lineup || pv.lineup.map((x) => x.id)).filter((id, i, arr) => eligibleIds.has(id) && arr.indexOf(id) === i).slice(0, pv.size);
  if (!mine.length) return { ok: false, reason: 'Pick at least one healthy monster.' };
  const size = Math.min(pv.size, mine.length);
  const { r, save } = frng(f); const seed = r.seed(); save();
  const theirs = pv.wild.slice(0, size);
  f.week.pregame = { opponent: pv.opponent, side: pv.matchup.playerSide, seed, size, mine, theirs: theirs.map((x) => x.id), a: mine.map((id) => snapMonster(f.roster.find((m) => m.id === id))), b: theirs.map(snapMonster), mode: normalizeMode(mode) || 'watch', policies: { ...FRANCHISE_POLICIES }, decisions: {}, status: 'battle', result: null, choice: null };
  return { ok: true, pregame: f.week.pregame };
}
export function pregameBattle(f, { log = 'full' } = {}) {
  const e = f.week.pregame; if (!e || !e.seed) return null;
  const a = e.a, b = e.b; if (!a || !b) return null;
  if (!a.length || !b.length) return null;
  return runBattle({ a, b, seed: e.seed, mode: e.mode, decisions: e.decisions, policies: policiesOf(e), log });
}
export function pregameDecide(f, ex, choice) {
  const e = f.week.pregame; if (!e || e.status !== 'battle') return { ok: false, reason: 'No battle in progress.' };
  if (choice === 'stay') for (let k = 0; k < SWAP_EVERY; k++) e.decisions[ex + k] = 'stay'; else e.decisions[ex] = choice;
  return { ok: true };
}
/** Settle the pregame Clash: XP and fatigue for your battlers; the AI's possession choice is drawn now if it won. */
export function resolvePregameClash(f) {
  const e = f.week.pregame; if (!e) return { ok: false, reason: 'No pregame Clash.' };
  if (e.status !== 'battle') return { ok: true, pregame: e, already: true, won: e.result?.winner === 'a' };
  const result = pregameBattle(f); if (!result) return { ok: false, reason: 'The battle could not be rebuilt.' };
  if (policiesOf(e).a === 'manual' && pendingDecision(result)) return { ok: false, reason: 'A swap decision is still open.', pending: pendingDecision(result) };
  const { r, save } = frng(f);
  const events = applyBattleEffects(f.roster, result, 'a', 'pregame', r, { autoSpend: !!f.settings.autoPoints });
  const won = result.winner === 'a';
  if (!won) e.choice = aiPossessionChoice(r);
  save();
  e.result = battleSummary(result); e.events = events; e.status = won ? 'choose' : 'done';
  return { ok: true, pregame: e, won, result, events };
}
/** The winner's possession choice (only the player chooses here; the AI chose when the battle was settled). */
export function choosePossession(f, choice) {
  const e = f.week.pregame; if (!e || e.status !== 'choose') return { ok: false, reason: 'It is not your choice to make.' };
  if (!POSSESSION_CHOICES.includes(choice)) return { ok: false, reason: 'Choose receive, defer or kick.' };
  e.choice = choice; e.status = 'done'; return { ok: true };
}
/** The opening possession for the football engine: { coinWinner: 'home'|'away', choice }. Settles a pending Clash headless (Auto) when needed. */
export function pregamePossession(f) {
  const m = sundayMatchup(f); if (!m) return { coinWinner: null, choice: null };
  if (!f.week.pregame || f.week.pregame.status === 'ready') { const st = startPregameClash(f); if (!st.ok) return { coinWinner: null, choice: null, reason: st.reason }; }
  const e = f.week.pregame;
  if (e.status === 'battle') { if (policiesOf(e).a === 'manual') { e.policies = { a: 'smart', b: 'smart' }; e.mode = 'watch'; } resolvePregameClash(f); }
  if (e.status === 'choose') { e.choice = 'receive'; e.status = 'done'; }
  const won = e.result?.winner === 'a'; const me = e.side; const them = me === 'home' ? 'away' : 'home';
  return { coinWinner: won ? me : them, choice: e.choice || 'receive', clash: e.result };
}
/** Headless pregame Clash for a league game between two AI clubs: both lineups automatic, smart policies, one seed. */
export function leaguePregame(f, r, home, away) {
  const a = autoLineup(home.roster, CLASH_SIZE.pregame, hashString(`${f.seed}|pre|${f.season.year}|${f.season.week}|${home.name}`));
  const b = autoLineup(away.roster, CLASH_SIZE.pregame, hashString(`${f.seed}|pre|${f.season.year}|${f.season.week}|${away.name}`));
  if (!a.length || !b.length) return { coinWinner: null, choice: null, clash: null };
  const result = runBattle({ a, b, seed: r.seed(), log: 'none' });
  return { coinWinner: result.winner === 'a' ? 'home' : 'away', choice: aiPossessionChoice(r), clash: battleSummary(result) };
}

export function summary(f) {
  const rec = record(f);
  return { club: f.club, tier: tierById(f.tier).name, year: f.season.year, week: f.season.week, day: DAYS[f.season.day], record: `${rec.w}-${rec.l}${rec.t ? '-' + rec.t : ''}`, overall: teamOverall(playerTeam(f)), cap: salarySummary(f) };
}

// ------------------------------------------------------------ the read-only archive guard (GDD §42.4 step 7)
// Every function that changes a franchise refuses a retired or fired one with the read-only error, so no path can advance,
// sign, trade, draft or otherwise alter an archive. Function declarations are live bindings: wrapping them here changes what
// every importer calls. Queries (standings, profiles, previews, catalog, summaries) stay unguarded: the archive shell reads them.
export const MUTATORS = Object.freeze([
  // season and days
  'openCreationDraft', 'startSeason', 'startNextSeason', 'finishSunday', 'takeBye', 'forfeitSunday', 'advancePlayoffs', 'skipPlayoffs', 'simulatePlayerGame', 'finalizeAwards', 'autoRunToSunday', 'skipToByeIfIdle', 'recoveryDay', 'lineupCheck',
  // the week
  'scoutRegion', 'recruit', 'skipRecruit', 'startEncounter', 'encounterBattle', 'encounterDecide', 'resolveEncounter', 'acceptOffer', 'declineOffer', 'setTraining', 'scoutOpponent', 'setGamePlan', 'answerMedia', 'mediaQuestions',
  // match and Clash
  'recordPlayStats', 'startPregameClash', 'pregameBattle', 'pregameDecide', 'resolvePregameClash', 'choosePossession', 'startOvertimeClash', 'overtimeBattle', 'overtimeDecide', 'resolveOvertimeClash', 'applyTiebreak', 'settleTiebreak',
  // roster and depth
  'assignSlot', 'autoDepth', 'moveDepth', 'releaseMonster', 'toPool', 'evolveMonster', 'spendAttributePoint', 'autoSpendAllPoints', 'devGrantLegendary', 'syncLegendary',
  // staff
  'hireStaff', 'replaceStaff', 'hireDefaultStaff',
  // offseason, draft and trades
  'resolveContract', 'signFreeAgent', 'offseasonMarket', 'ensureDraftClass', 'scoutDraft', 'beginDraft', 'myDraftPick', 'passDraftPick', 'tradeAskPlayer', 'tradeAskPicks', 'acceptTrade', 'maybeTradeCall', 'answerTradeCall',
  // board and story
  'chooseGoal', 'commissionerReview', 'commissionerRelease', 'resolvePostseason', 'chooseLegendTrack', 'replyToCoach',
  // achievements, dex, news, retirement
  'checkAchievements', 'backfillAchievements', 'nextScene', 'dismissScene', 'hallOfFameNotice', 'dexRecord', 'news', 'retire',
  // the league registry (Phase 3)
  'ensureLeague',
]);
export const isReadOnly = isArchived;
/* eslint-disable no-func-assign */
openCreationDraft = guarded(openCreationDraft); startSeason = guarded(startSeason); startNextSeason = guarded(startNextSeason); finishSunday = guarded(finishSunday); takeBye = guarded(takeBye); forfeitSunday = guarded(forfeitSunday); advancePlayoffs = guarded(advancePlayoffs); skipPlayoffs = guarded(skipPlayoffs); simulatePlayerGame = guarded(simulatePlayerGame); finalizeAwards = guarded(finalizeAwards); autoRunToSunday = guarded(autoRunToSunday); skipToByeIfIdle = guarded(skipToByeIfIdle); recoveryDay = guarded(recoveryDay); lineupCheck = guarded(lineupCheck);
scoutRegion = guarded(scoutRegion); recruit = guarded(recruit); skipRecruit = guarded(skipRecruit); startEncounter = guarded(startEncounter); encounterBattle = guarded(encounterBattle); encounterDecide = guarded(encounterDecide); resolveEncounter = guarded(resolveEncounter); acceptOffer = guarded(acceptOffer); declineOffer = guarded(declineOffer); setTraining = guarded(setTraining); scoutOpponent = guarded(scoutOpponent); setGamePlan = guarded(setGamePlan); answerMedia = guarded(answerMedia); mediaQuestions = guarded(mediaQuestions);
recordPlayStats = guarded(recordPlayStats); startPregameClash = guarded(startPregameClash); pregameBattle = guarded(pregameBattle); pregameDecide = guarded(pregameDecide); resolvePregameClash = guarded(resolvePregameClash); choosePossession = guarded(choosePossession); startOvertimeClash = guarded(startOvertimeClash); overtimeBattle = guarded(overtimeBattle); overtimeDecide = guarded(overtimeDecide); resolveOvertimeClash = guarded(resolveOvertimeClash); applyTiebreak = guarded(applyTiebreak); settleTiebreak = guarded(settleTiebreak);
assignSlot = guarded(assignSlot); autoDepth = guarded(autoDepth); moveDepth = guarded(moveDepth); releaseMonster = guarded(releaseMonster); toPool = guarded(toPool); evolveMonster = guarded(evolveMonster); spendAttributePoint = guarded(spendAttributePoint); autoSpendAllPoints = guarded(autoSpendAllPoints); devGrantLegendary = guarded(devGrantLegendary); syncLegendary = guarded(syncLegendary);
hireStaff = guarded(hireStaff); replaceStaff = guarded(replaceStaff); hireDefaultStaff = guarded(hireDefaultStaff);
resolveContract = guarded(resolveContract); signFreeAgent = guarded(signFreeAgent); offseasonMarket = guarded(offseasonMarket); ensureDraftClass = guarded(ensureDraftClass); scoutDraft = guarded(scoutDraft); beginDraft = guarded(beginDraft); myDraftPick = guarded(myDraftPick); passDraftPick = guarded(passDraftPick); tradeAskPlayer = guarded(tradeAskPlayer); tradeAskPicks = guarded(tradeAskPicks); acceptTrade = guarded(acceptTrade); maybeTradeCall = guarded(maybeTradeCall); answerTradeCall = guarded(answerTradeCall);
chooseGoal = guarded(chooseGoal); commissionerReview = guarded(commissionerReview); commissionerRelease = guarded(commissionerRelease); resolvePostseason = guarded(resolvePostseason); chooseLegendTrack = guarded(chooseLegendTrack); replyToCoach = guarded(replyToCoach);
checkAchievements = guarded(checkAchievements); backfillAchievements = guarded(backfillAchievements); nextScene = guarded(nextScene); dismissScene = guarded(dismissScene); hallOfFameNotice = guarded(hallOfFameNotice); dexRecord = guarded(dexRecord); news = guarded(news); retire = guarded(retire);
ensureLeague = guarded(ensureLeague);
/* eslint-enable no-func-assign */
