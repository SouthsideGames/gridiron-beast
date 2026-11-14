// The franchise: owner, club, staff, roster, weekly loop, season, league
// simulation, progression and economy. One plain state object; every
// mutation goes through a function here so the UI stays thin.

import { migrationDue, migratePositions, migrateAmbitions } from './position-migration.js';
import { staffDemand, staffOptions, staffAnswer, noteStaffPreseason, noteStaffSeason, noteStaffTraining, noteStaffDraft, STAFF_BANDS } from './staff-negotiation.js';
import { venueFor } from '../data/stadiums.js';
import { generatedVenue } from '../data/field-generator.js';
import { noteJoin, markCareerFresh, noteEvolution, careerAfterGame, careerSeasonEnd, noteHallOfFame, backfillCareer, careerTimeline, careerSummary, CAREER_MILESTONES, addEvent } from './career.js';
import * as CP from './partnerships.js';
import * as IH from './injury-history.js';
import { syncLegendaryPlays, legendaryAvailable, legendaryStatus, equipLegendaryForAI, legendOf, LEGENDARY_IDS } from './legendary.js';
import { createRng, rngFromState, hashString } from '../core/rng.js';
import { recordGame, ensureStats, rolloverMonster, leadersSnapshot, monsterLine, updateSeasonRecords, archiveSeasonTables, withDerived, addInto } from './stats.js';
import { AWARDS, computeAwards, headCoachName } from './awards.js';
import { newContract, contractEnds, renewalAsk, acceptsCounter, staffSalary, openOffseason, offseasonPending, offseasonReady, CONTRACT_YEARS, COUNTER_PCT, STAFF_RAISE } from './contracts.js';
export { offseasonPending, offseasonReady, renewalAsk, CONTRACT_YEARS } from './contracts.js';
import { openDraftClass, scoutDraftClass as draftScout, startDraft as draftStart, advanceDraft as draftAdvance, playerPick as draftPlayerPick, passPick as draftPassPick, prospectView, injectDraftees, ageDraftees, onTheClock, DRAFT_ROUNDS, ROOKIE_SCALE, rookieCharge } from './draft.js';
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
import { retirementPass, agingContext, nativeAging, retirementOutlook } from './retirement.js';
import { recordRetiredMonsterCandidates, electMonsterHallOfFame } from './monster-hof-voting.js';
import { pickChannelSpecies, basicsFor, raiseToLevel } from '../data/monsters.js';
import { BASIC_SHARE } from './t8/generation.js';
import { createRewardLedger, prune as pruneLedger } from './reward-ledger.js';
import { approvedRule, FAMILIES, formsOf } from '../data/beast-dex.js';
import { createRoster, generateMonster, monsterOverall, schemeFit, evolutionReady, nextEvolution, tryEvolve, autoSpendPoints as autoSpendPointsFn, ROSTER_MAX, ROSTER_MIN, NATURES, salaryFor, regionSpecies, resolveSpecies, speciesName, speciesEffect, spendPoint, FULL_ROSTER } from '../data/monsters.js';
import { ELEMENT_REGIONS } from '../data/species.js';
export { ROSTER_MAX, ROSTER_MIN } from '../data/monsters.js';
import { SPECIES_DEX, LEGEND_RULES } from '../data/species.js';
import { dexRecordGlobal, dexStatusGlobal, dexFormGlobal, dexFormsGlobal, noteNewFranchise } from './dex-store.js';
import { clubIdentity, identityCoach, lineupPreference, trainingPriority } from '../data/identities.js';
import { GYMS, GYM_BY_CLUB, GYM_TIER, GYM_STUDIED_TAPE, ORDINARY_GROWTH_PER_SEASON, FREE_LEGENDARIES, gymGrowth } from '../data/gyms.js';
import { PLAYS } from '../data/playbook.js';
import { yearOf } from '../data/calendar.js';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../data/achievements.js';
import { recordAchievementGlobal } from './achievement-store.js';
import { pickOwner, setPickOwner, currentClassYear, picksOwnedBy, pickUsed, tradableYears, askForPlayer, askForPicks, executeTrade, canTakePlayer, pickKey, samePick, ASKS_PER_PICK, TRADE_YEARS_AHEAD, pickValue, playerValue, positionNeeds, buildTradeCall, contractYear, transferPick, CALL_CHANCE } from './trades.js';
import { evaluateProposal, deskAssets, deskUsage, spendProposal, buildIncomingOffer, DESK_RULES } from './trade-desk.js';
export { DESK_RULES } from './trade-desk.js';
import { MEDIA_BOOST, MEDIA_CAP, HYPE_BOOST } from '../data/media.js';
import { PRESS_QUESTIONS } from '../data/press.js';
import { pressFacts, pickQuestions, fillQuestion, settlePress, pressQuestion, PRESS_PER_WEEK } from './press.js';
import { pregameDialogue, dialogueState, REPLIES } from '../data/dialogue.js';
import { POSTSEASON_EVENTS, RAISE_PCT, RETENTION_BONUS_PCT, PROMISE_BENCH_LIMIT } from '../data/postseason.js';
import { OFFENSE_BASE, DEFENSE_BASE, OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf, PACKAGE_SLOT_USE } from '../data/personnel.js';
import { careerSnapshot } from './career-profile.js';
import { ensureLeagueNews, addLeagueNews, resultsNews, playoffNews, championNews, playoffFieldNews, raceNews, awardNews, recordNews, movesNews, offseasonDigest, draftDigest } from './league-news.js';
import { buildTeam, generatedTeam, buildDepthChart, lineupProblems, borrowedSlots, unavailableSlots, teamOverall, depthOrder, GROUP_SLOTS, OFFENSE_GROUPS, DEFENSE_GROUPS, playbookFor, adaptPlaybook } from './roster.js';
import { joinAsDraftee, takeFromPool, takeFromWaivers, leaveLeague, releaseFromClub } from './league.js';
import { aiTrades } from './league-trades.js';
import { tradeWindowState, seasonTradeWeek } from './trade-window.js';
import { slimSeasonAwards } from './history-compact.js';
import { rosterPlan } from './roster-plan.js';
import { selectDevSlots, practiceAfterGame, playedIds, devIneligibility, DEV, DEV_REASON } from './development.js';
import { evaluateStrategies, modeOf } from './strategy.js';
import { leagueSeasonEnd, leagueBenchOf, leagueUpgrades, leagueContracts, leagueAgeing, leagueFreeAgency, leagueNudge, validateClubs, notePreseason, noteGrowth, preseasonTarget, leagueInjuryCover, leagueTrim, CREATION_LIFT, floorSpare } from './league-season.js';
export { validateClubs } from './league-season.js';
import { hasLeague, clubRecord, clubRoster, leagueClubs, claimMonster, clubCapRoom, captureLeague, verifyLeague, addToClub, removeFromClub, isProtected, findInLeague, leagueEvent, takeEvents, moveIdentity } from './league-registry.js';
export { hasLeague, isProtected, clubRoster, findInLeague } from './league-registry.js';
import { afterGame, recoverWeek, offseason, OUT_OF_POSITION_RISK } from './progression.js';
import { ensureFreeAgency, hasFreeAgency, task7Offseason, leagueYear, pruneLocks, noteReleased, noteTraded, tradeLock, returnLock } from './fa-state.js';
import { negotiation, negotiate, countersLeft, NEG, extWindow, talksOpen, noteClubResults, strengthTable, counterTerms, registerOwnerHooks, submitOffer, reviseOffer, withdrawOffer, acceptCounter, resolvePeriod, ageMarket, negotiateNow, extend, promoteExtensions, rateOffer, askOf, FA_RULES, capView, liveOffers, marketList, competingOffers, unsigned as unsignedFA, sign as signFA, blocker as faBlocker, entryOf } from './fa-engine.js';
import { aiMarketTurn, aiTerms, aiYears, aiExtensions, aiBargain, EXTENSION_WEEK } from './fa-ai.js';
import { overLimit, legendsBySide, legendSide, legendCheck } from './fa-legendary.js';
import { bonusCharge, capCharge, makeContract, allocateBonus } from './fa-contracts.js';
import { playGame } from '../sim/game-runner.js';
import { teamStrengths } from '../sim/coach-ai.js';
import { guarded, mayStartSeason, isArchived, seasonsCompleted, SEASON_CAP } from './lifecycle.js';
import { newUid } from '../core/uid.js';
import { CLASH_SIZE, SWAP_EVERY, policiesOf, normalizeMode, snapMonster, autoLineup, eligibleBattlers, runBattle, runRecord, battleSummary, pendingDecision, applyBattleEffects, aiPossessionChoice, POSSESSION_CHOICES, newBattleRecord, isT8Record, recordDecision, settleHeadless, upgradeUnresolvedRecord, carryOutOf, masteryRecord, recordSession } from './clash-link.js';
import { carryInto as t8CarryInto, atGameEnd as t8AtGameEnd } from '../sim/t8/status-runtime.js';
import { exhaustedSet as t8ExhaustedSet } from '../sim/t8/stamina-runtime.js';
import { t as $t, line as $L, lineParts as $P, lineText, lineFields, lineField, captured, recording, recalled, fieldLine, fieldText, labelLine } from '../text/index.js';

export const SCHEMA_VERSION = 10; // 10: Task 8, the fresh-save break (Dex individuals with `m.dev`; spec §15): saves 6, 8 and 9 are refused with a Start New Franchise message (save.js). Earlier: 9 Task 7 free agency, 8 the league registry, 6 every save before it
export const LEAGUE_SCHEMA_VERSION = 8;
export const LEGACY_SCHEMA_VERSION = 6;
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_ACTIONS = [$t('franchise.scout_a_region'), 'Recruit', $t('franchise.training_focus'), $t('franchise.scout_opponent'), $t('franchise.game_plan'), $t('franchise.lineup_check'), 'Game day'];
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
    schemaVersion: SCHEMA_VERSION, uid: newUid(), createdAt: new Date().toISOString(), seed, rngState: rng.state, // uid: the permanent identity of this franchise universe (GDD §42.3)
    owner: { ...owner }, club, tier: 'challenger', staff: {},
    roster, lineupManual: {}, depth: {}, aging: nativeAging(), // born under the ageing rules of GDD §55: no transition
    season: null, week: blankWeek(), game: null,
    rivals: { challenger: { team: rivalTeam, gm: RIVAL_GMS[rivalTeam] || $t('franchise.rival_gm'), headToHead: { w: 0, l: 0 } } },
    badges: { challenger: 0, vanguard: 0, sovereign: 0 }, qualification: { challenger: 0, vanguard: 0, sovereign: 0 }, bottomFourStreak: 0,
    history: [], news: [], leagueNews: [], leagueNewsMeta: { v: 1, leaders: {} }, dex: { seen: {}, signed: {} },
    campaign: { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 },
    settings: { quarterLength: 180, mode: 'key', speed: 1, reducedMotion: false, reducedFlash: false, liveClock: false, difficulty: 'pro', ...settings },
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
  if (persistentLeague) ensureLeague(f, { qualityDelta: -CREATION_LIFT, fresh: true }); // a new universe starts persistent (GDD §42.6): rosters open a little under today's year-1 quality because they will grow by playing (league-season.js calibration)
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
  news(f, $L('franchise.draft_day_the_lottery_gave_the', { club: f.club, slot: slot + 1, n: 12 }), 'info');
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
  if (f.week.commissioner.visits === 1) news(f, $L('franchise.the_commissioner_has_called_you_in', { toLocaleString: Math.round(over).toLocaleString('en-US') }), 'loss');
  return f.week.commissioner;
}
/** Release one of the named monsters. Nothing comes back for it. Repeats until the club is under the cap. */
export function commissionerRelease(f, id) {
  const c = f.week.commissioner; if (!c) return { ok: false, reason: $t('franchise.no_review_pending') };
  if (!c.names.includes(id)) return { ok: false, reason: $t('franchise.the_commissioner_named_other_monsters') };
  const m = f.roster.find((x) => x.id === id); if (!m) return { ok: false, reason: $t('franchise.not_on_roster') };
  f.roster = f.roster.filter((x) => x.id !== id);
  for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === id) delete f.lineupManual[slot];
  toPool(f, m, 'commissioner');
  f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 }; f.campaign.commissionerReleases = (f.campaign.commissionerReleases || 0) + 1;
  news(f, $L('franchise.released_by_order_of_the_commissioner', { name: m.name }), 'loss');
  noteCaptainLeft(f, f.club, m, 'released');
  const again = commissionerReview(f);
  return { ok: true, released: m, done: !again };
}

// ------------------------------------------------------------ postseason story events (GDD §15.7)
function makePostseasonEvent(f) {
  const { r, save } = frng(f);
  const rec = record(f); const rival = f.rivals[f.tier]?.team || $t('franchise.a_rival');
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
  const vars = { star: star?.name || $t('franchise.your_star'), club: f.club, rival, record: `${rec.w}-${rec.l}`, coach: coach?.name || $t('franchise.your_coordinator'), role: coordRole, side: coordRole === 'offensive_coordinator' ? 'offense' : 'defense', other, ...lineField('scheme', labelLine(coach?.style || 'my scheme')), fit: weakSide?.fit ?? 0, total: weakSide?.total ?? 0 };
  return { kind, starId: star?.id || null, coordRole, vars, resolved: false, chosen: null };
}
const fillVars = (t, vars) => String(t).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
/** The pending event rendered for the UI, or null. */
export function postseasonEvent(f) {
  const e = f.postseason; if (!e || e.resolved) return null;
  const def = POSTSEASON_EVENTS[e.kind]; if (!def) return null;
  const vars = e.vars?.schemeL ? { ...e.vars, scheme: fieldText(e.vars, 'scheme') } : e.vars;   // the coach's style is a saved line
  const options = def.options.map((o) => ({ ...o, label: fillVars(o.label, vars), text: fillVars(o.text, vars) }));
  if (difficultyOf(f) === DIFFICULTY.rookie && def.rookie) options.push({ ...def.rookie });
  return { kind: e.kind, title: def.title, speaker: def.speaker, lines: def.lines.map((l) => fillVars(l, vars)), options, vars: vars };
}
export function resolvePostseason(f, optionId) {
  const e = f.postseason; if (!e || e.resolved) return { ok: false, reason: $t('franchise.no_decision_pending') };
  const ev = postseasonEvent(f); if (!ev.options.find((o) => o.id === optionId)) return { ok: false, reason: $t('franchise.not_an_option') };
  const star = f.roster.find((m) => m.id === e.starId); const coach = staffMember(f, e.coordRole); let text = ''; const done = recording();   // the result sentence is saved in the club log as a line
  const hireBest = (role, { preferScheme = null } = {}) => { const cands = STAFF.filter((c) => c.role === role && c.id !== f.staff[role]).sort((a, b) => (preferScheme ? (b.scheme === preferScheme) - (a.scheme === preferScheme) : 0) || b.overall - a.overall); const c = cands[0]; if (c) { f.staff[role] = c.id; (f.staffContracts ||= {})[role] = newContract(f.season?.year || 1); (f.staffRaise ||= {})[role] = 1; withdrawStaffRenewal(f, role); } return c; }; // Task 10 fix: the replacement gets his own contract at his own salary (he inherited the departed coordinator's contract and raise, and the departed one's renewal stayed open)
  if (e.kind === 'star_out') {
    if (optionId === 'raise' && star) { star.salary = Math.round((star.salary || salaryFor(star)) * (1 + RAISE_PCT)); text = `${$t('franchise.stays_on_a_raise', { name: star.name })}`; }
    else if (optionId === 'promise' && star) { star.promise = { benched: 0 }; text = `${$t('franchise.stays_with_a_promised_starting_spot', { name: star.name })}`; }
    else if (optionId === 'release' && star) { f.roster = f.roster.filter((m) => m.id !== star.id); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === star.id) delete f.lineupManual[slot]; f.campaign.poached = f.campaign.poached || {}; f.campaign.poached[e.vars.rival] = star.name; text = `${$t('franchise.signs_with', { name: star.name, rival: e.vars.rival })}`; }
    else text = `${star?.name || $t('franchise.your_star_2')} stays.`;
  } else if (e.kind === 'coordinator_offer') {
    if (optionId === 'bonus' && coach) { f.pendingDeadCap = (f.pendingDeadCap || 0) + Math.round(coach.salary * RETENTION_BONUS_PCT); text = `${$t('franchise.stays_the_bonus_hits_next_seasons', { name: coach.name })}`; }
    else if (optionId === 'leave') { const c = hireBest(e.coordRole); text = `${$t('franchise.leaves_for', { name: coach?.name || $t('franchise.your_coordinator'), other: e.vars.other, c: c ? $t('franchise.is_hired', { name: c.name }) : '' })}`; }
    else text = $t('franchise.coach_stays', { name: coach?.name || $t('franchise.your_coordinator') });
  } else if (e.kind === 'scheme_mutiny') {
    if (optionId === 'scheme') { const want = bestSchemeFor(f, e.coordRole); const c = hireBest(e.coordRole, { preferScheme: want }); text = `${$t('franchise.leaves_without_severance', { c: c ? $t('franchise.takes_over', { name: c.name, style: c.style }) : $t('franchise.no_replacement_found'), name: coach?.name || $t('franchise.the_coordinator') })}`; }
    else if (optionId === 'fire' && coach) { f.pendingDeadCap = (f.pendingDeadCap || 0) + Math.round(coach.salary * 0.5); const c = hireBest(e.coordRole); text = `${$t('franchise.fired_half_their_salary_counts_against', { name: coach.name, c: c ? $t('franchise.hired_short', { name: c.name }) : $t('franchise.no_replacement') })}`; }
    else text = `${$t('franchise.stays_the_roster_is_on_you', { name: coach?.name || $t('franchise.your_coordinator') })}`;
  }
  const textL = done(text);
  e.resolved = true; e.chosen = optionId; news(f, $L('franchise.postseason', { text: textL }), 'info');
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
  if (!f.legendPick || f.legendPick.resolved) return { ok: false, reason: $t('franchise.no_legend_track_to_choose') };
  if (!legendChoices(f).some((c) => c.id === speciesId)) return { ok: false, reason: $t('franchise.not_available') };
  f.campaign.tracks ||= {}; f.campaign.unlocked ||= {};
  f.campaign.tracks[speciesId] = (f.campaign.tracks[speciesId] || 0) + 1;
  const sp = SPECIES_DEX.find((s) => s.id === speciesId); const n = f.campaign.tracks[speciesId];
  let unlocked = false;
  if (n >= LEGEND_RULES.tracksNeeded) { f.campaign.unlocked[speciesId] = true; unlocked = true; news(f, $L('franchise.legend_unlocked_can_now_be_scouted', { name: sp.name, regions: (sp.regions || [])[0] }), 'win'); }
  else news(f, $L('franchise.legend_track_of_toward', { n, tracksNeeded: LEGEND_RULES.tracksNeeded, name: sp.name }), 'win');
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
  if (f.week.pregameReply) return { ok: false, reason: $t('franchise.already_answered') };
  if (!REPLIES.find((r) => r.id === replyId)) return { ok: false, reason: $t('franchise.unknown_reply') };
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
  const m = f.roster.find((x) => x.id === id); if (!m) return { ok: false, reason: $t('franchise.not_on_roster') };
  if (!evolutionReady(m)) { const n = nextEvolution(m); return { ok: false, reason: n ? `${$t('franchise.evolves_at_level', { name: m.name, level: n.level })}` : `${$t('franchise.is_fully_evolved', { name: m.name })}` }; }
  const from = m.name; const ovr0 = monsterOverall(m); const ev = tryEvolve(m); if (!ev) return { ok: false, reason: $t('franchise.nothing_happened') };
  noteEvolution(m, { year: f.season.year, week: f.season.week, club: f.club, from, to: m.name, level: m.level, ovr: [ovr0, monsterOverall(m)] }); // Career Timeline (level and overall: GDD §51.6)
  dexRecord(f, m, 'signed');
  news(f, $L('franchise.evolution_evolved_into', { from, name: m.name }), 'win', { mid: m.id, mname: m.name });
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
    if (evolutionReady(m)) list.push({ screen: 'roster', kind: 'evolve', id: m.id, text: `${$t('franchise.is_ready_to_evolve', { name: m.name })}` });
    if ((m.points || 0) > 0 && !f.settings?.autoPoints && !pointsLocked(f)) list.push({ screen: 'roster', kind: 'points', id: m.id, text: `${$t('franchise.has_attribute_points_to_spend', { name: m.name, points: m.points, n: m.points })}` });
  }
  if (f.season?.finished && f.offseason && offseasonPending(f).length) list.push({ screen: 'hq', kind: 'contracts', text: `${$t('franchise.contract_decisions_waiting', { n: offseasonPending(f).length })}` });
  if (tradeCall(f)) list.push({ screen: 'hq', kind: 'call', text: `${$t('franchise.the_are_on_the_line_with', { team: tradeCall(f).team })}` });
  if (f.week?.commissioner) list.push({ screen: 'hq', kind: 'commissioner', text: $t('franchise.the_commissioner_is_waiting_on_a') });
  else if (salarySummary(f).over) list.push({ screen: 'hq', kind: 'cap', text: `${$t('franchise.over_the_cap_by_cr', { toLocaleString: Math.round(-salarySummary(f).remaining).toLocaleString('en-US') })}` });
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
  const c = { ...ctx, hofEligible: hallOfFameProgress(f).eligible, get dex() { return dexCounts(f); } }; // dex: the family collection counts (Task 8: 72 / 120 / 192), read only by the collection achievements
  const earned = [];
  for (const a of ACHIEVEMENTS) {
    if (f.achievements[a.id] || (a.trigger !== trigger && a.trigger !== 'any')) continue;
    let ok = false; try { ok = !!a.when(f, c); } catch { ok = false; }
    if (!ok) continue;
    f.achievements[a.id] = { year: f.season?.year || 1, week: f.season?.week || 1 };
    const vars = sceneVars(f, c); f.scenes.push({ id: a.id, ctx: vars }); earned.push(a.id); stampGlobal(f, a, vars);
    news(f, $L('franchise.achievement', { fillScene: captured(() => fillScene(a.titleKey ? $t(a.titleKey) : a.title, sceneVars(f, c))) }), 'win'); // Task 10: the title is kept as a line (it was a finished sentence inside the saved line)
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
  return { club: f.club, CLUB: String(f.club).toUpperCase(), owner: `${f.owner.first} ${f.owner.last}`.trim(), first: f.owner.first, rival: rv?.team || $t('franchise.your_rival'), gm: rv?.gm || $t('franchise.their_gm'), year: yearOf(f.season?.year || 1), YEAR: yearOf(f.season?.year || 1), week: f.season?.week || 1, record: `${rec.w}-${rec.l}`, wins: f.campaign?.wins || 0, badges: Object.keys(f.campaign?.badges || {}).length, titles: f.campaign?.titles || 0, awardLine: fieldText(c, 'awardLine') || '', ...(c.awardLineL ? { awardLineL: c.awardLineL } : {}), REGION: String(c.region || 'home region').toUpperCase() };
}
function fillScene(text, v) { if (v?.awardLineL) v = { ...v, awardLine: fieldText(v, 'awardLine') }; return String(text).replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)); }   // the award sentence is a saved line
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
  f.campaign.hofNoticed = true; news(f, $L('franchise.the_commissioner_called_you_are_eligible'), 'win');
  return true;
}
/** Retire: the career card that goes to the Hall of Fame. The caller stores it and ends the franchise. */
export function retire(f) {
  const p = hallOfFameProgress(f); if (!p.eligible) return { ok: false, reason: $t('franchise.not_yet_eligible_for_the_hall') };
  const seasons = f.history.map((h) => ({ year: h.year, w: h.record.w, l: h.record.l, place: h.place, champion: h.champion === h.club, playoffs: h.playoffs }));
  const wins = seasons.reduce((a, h) => a + h.w, 0), losses = seasons.reduce((a, h) => a + h.l, 0);
  const best = f.roster.slice().sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, 5).map((m) => ({ id: m.id, name: m.name, species: m.species, position: m.position, ovr: monsterOverall(m), level: m.level }));
  const card = {
    id: `hof_${franchiseKey(f)}_${Date.now().toString(36)}`, uid: f.uid || null, seed: f.seed ?? null, owner: `${f.owner.first} ${f.owner.last}`, portrait: f.owner.portrait, club: f.club, difficulty: f.settings?.difficulty || 'pro',
    seasons: seasons.length, record: { w: wins, l: losses }, titles: f.campaign.titles || 0, badges: Object.keys(f.campaign.badges || {}).map((club) => GYM_BY_CLUB[club]?.badge || club), awards: f.campaign.awards || 0,
    bestMonsters: best.map(({ id, ...rest }) => rest), dexSeen: dexCounts(f).seen, dexGroups: (({ original, basic, all }) => ({ original: original.seen, basic: basic.seen, all: all.seen }))(dexCounts(f)), retiredAt: Date.now(), seasonsList: seasons, rival: f.rivals[f.tier]?.team || null, rivalRecord: f.rivals[f.tier]?.headToHead || null,
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
  const id = dexFamilyOf(m); const stamp = { year: f.season?.year || 1, week: f.season?.week || 1, club: f.club };
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
// Beast Dex collection groups (owner ruling 2026-11-07: the original 72 families, the 120 Basics and all 192 are tallied separately;
// evolutions do not add family counts). Every record is keyed by family, so an evolved form counts once, as its family.
export const DEX_GROUPS = Object.freeze({
  original: Object.freeze(SPECIES_DEX.filter((s) => s.rarity !== 'basic').map((s) => s.id)),
  basic: Object.freeze(SPECIES_DEX.filter((s) => s.rarity === 'basic').map((s) => s.id)),
  all: Object.freeze(SPECIES_DEX.map((s) => s.id)),
});
const DEX_FAMILY_OF = new Map(FAMILIES.flatMap((fam) => [[fam.id, fam.id], ...formsOf(fam.id).flatMap((fm) => [[fm.id, fam.id], [fm.name, fam.id], [fm.name.toLowerCase(), fam.id]])]));
/** The family a monster, family id, form id or form name belongs to (the Dex's key). */
export function dexFamilyOf(m) {
  const key = typeof m === 'string' ? m : m?.species;
  return DEX_FAMILY_OF.get(key) || DEX_FAMILY_OF.get(String(key || '').toLowerCase()) || resolveSpecies(m).id;
}
function tally(ids, statusOf) {
  let seen = 0, signed = 0;
  for (const id of ids) { const st = statusOf(id); if (st !== 'unknown') seen++; if (st === 'signed') signed++; }
  return { seen, signed, total: ids.length };
}
/** Family-based collection counts: `original` (72), `basic` (120) and `all` (192). `seen`/`signed` at the top are the all-192 tally. */
export function dexCounts(f, { career = false } = {}) {
  const statusOf = career ? (id) => dexStatusGlobal(id) : (id) => dexStatus(f, id);
  const groups = Object.fromEntries(Object.entries(DEX_GROUPS).map(([k, ids]) => [k, tally(ids, statusOf)]));
  return { seen: groups.all.seen, signed: groups.all.signed, ...groups };
}
function blankWeek() { return { region: null, prospects: [], recruitAttempts: 0, recruited: null, encounter: null, pregame: null, overtime: null, trainingFocus: null, scoutReport: null, plan: { offense: [], defense: [] }, lineupChecked: false, gameResult: null, events: [] }; }
const frng = (f) => { const r = rngFromState(f.rngState); return { r, save: () => { f.rngState = r.state; } }; };

/** A club note. `who` = { mid, mname } when the note names one monster (the club log links it to his career, GDD §40.5). */
/** One item of the club log. `text` is a sentence, or a saved line (src/text/index.js line / lineParts) so the item can be shown in another language later. */
export function news(f, text, kind = 'info', who = null) { text = recalled(text); const n = { text: lineText(text), ...lineFields(text), kind, week: f.season?.week, year: f.season?.year }; if (who?.mid) { n.mid = who.mid; n.mname = who.mname; } f.news.unshift(n); if (f.news.length > 60) f.news.pop(); }

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
    { text: `${$t('franchise.sit_down_ill_be_brief_the', { owner: esc(owner) })}` },
    { text: `${$t('franchise.youre_taking_over_b_b_i', { club: esc(f.club), label: D === DIFFICULTY.rookie ? $t('franchise.even_in_this_league') : D === DIFFICULTY.allstar ? $t('franchise.in_this_league_the_one_everybody') : $t('franchise.in_this_league') })}${rival ? ` ${$t('franchise.in_particular', { rival: esc(rival) })}${gm ? ` · ${esc(gm)}` : ''} ${$t('franchise.has_already_asked_me_how_long')}` : ''}` },
    { text: slot ? `${$t('franchise.some_good_news_the_lottery_was', { slot })}` : `${$t('franchise.some_good_news_the_draft_class')}` },
    { text: `${$t('franchise.now_the_part_nobody_enjoys_this')} ${forecast != null ? `${$t('franchise.their_forecast_has_at_wins_before', { club: esc(f.club), forecast })}` : $t('franchise.before_week_one_they_will_ask')} ${$t('franchise.new_gm_or_not_miss_twice')}` },
    { text: `${$t('franchise.understand_how_this_works_you_answer')}`, ominous: true },
    { text: `${$t('franchise.youll_want_to_know_who_sits', { first: esc(f.owner.first) })}`, ominous: true },
  ];
  return beats;
}
export function firstWeekWelcome(f) {
  news(f, $L('franchise.welcome_owner_a_balanced_coaching_staff'), 'info');
  news(f, $L('franchise.your_first_week_monday_scout_a'), 'info');
}
export const DEFAULT_STAFF = Object.freeze({ head_coach: 'hc_vale', offensive_coordinator: 'oc_park', defensive_coordinator: 'dc_ice', head_scout: 'sc_moss', monster_trainer: 'tr_focus' });
/** Quick start: a balanced default staff so a new owner can play immediately. */
export function hireDefaultStaff(f) {
  const t7 = task7Offseason(f) && f.season?.finished; const out = [];
  for (const [role, id0] of Object.entries(DEFAULT_STAFF)) if (!f.staff[role]) {
    let id = id0; let exception = false;
    if (t7) { // R7: the default if he fits next season's cap; else the cheapest candidate who fits; else the default under a logged, limited exception
      const room = staffRoom(f, role); if (staffById(id0).salary > room) { const fit = STAFF.filter((c) => c.role === role && c.salary <= room).sort((a, b) => a.salary - b.salary || (a.id < b.id ? -1 : 1))[0]; if (fit) id = fit.id; else exception = true; } }
    f.staff[role] = id; (f.staffContracts ||= {})[role] = newContract(f.season?.year || 1); (f.staffRaise ||= {})[role] = 1;
    if (exception) { const ly = f.season.year + 1; const x = { ly, role, id, salary: staffById(id).salary, kind: 'minimum-staff', why: $t('franchise.no_candidate_fits_the_cap') };
      if ((f.capExceptions ||= []).some((e) => e.ly === ly && e.role === role && e.kind === 'minimum-staff')) { /* once per role per league year: already logged */ } else f.capExceptions.push(x);
      news(f, $L('franchise.commissioner_exception_hired_as_at_the', { name: staffById(id).name, replace: role.replace(/_/g, ' ') }), 'loss'); }
    out.push({ role, id, exception });
  }
  f.lastStaffHires = out; // what was hired, and whether under the exception (callers keep the old void return)
}
/** Front office: swap one staff member for a candidate (cap permitting). */
/**
 * Task 10 fix: a role that gets a new staff member (a postseason event's replacement, a front-office swap) starts a fresh contract,
 * so an offseason renewal still open for that role belonged to the person who left. It is withdrawn; signing it used to set the new
 * hire's salary from the old one's demand (the staff renewal ±8% weakness in tests/franchise.test.js).
 */
function withdrawStaffRenewal(f, role) {
  const items = f.offseason?.items; if (!Array.isArray(items)) return;
  for (let i = items.length - 1; i >= 0; i--) if (items[i]?.kind === 'staff' && items[i].role === role && !items[i].status) items.splice(i, 1);
}
export function replaceStaff(f, id) {
  const c = staffById(id); if (!c) return { ok: false, reason: $t('franchise.unknown_candidate') };
  if (f.staff[c.role] === id) return { ok: false, reason: $t('franchise.already_on_staff') };
  const current = staffById(f.staff[c.role]);
  if (task7Offseason(f) && f.season?.finished) { const room = staffRoom(f, c.role); if (c.salary > room) return { ok: false, code: 'cap', reason: `${$t('franchise.needs_cr_next_season_cr_is', { name: c.name, toLocaleString: c.salary.toLocaleString('en-US'), toLocaleString2: Math.max(0, room).toLocaleString('en-US') })}` }; } // R7
  else { const budget = salarySummary(f, c.salary - (current?.salary || 0)); if (budget.over) return { ok: false, reason: $t('franchise.exceeds_the_salary_cap') }; }
  // Firing mid-season costs: the rest of the outgoing coach's salary stays on the books this season.
  let severance = 0;
  if (current && f.season && !f.season.finished) { severance = Math.round(current.salary * Math.max(0, (10 - (f.season.week || 1)) / 10)); f.deadCap = (f.deadCap || 0) + severance; }
  f.staff[c.role] = id; (f.staffContracts ||= {})[c.role] = newContract(f.season?.year || 1); (f.staffRaise ||= {})[c.role] = 1; withdrawStaffRenewal(f, c.role);
  news(f, $P(c.name, ` hired as `, c.role.replace(/_/g, ' '), (current ? $L('franchise.replacing', { name: current.name }) : ''), (severance ? $P(` `, $L('franchise.cr_severance_this_season', { toLocaleString: severance.toLocaleString('en-US') })) : ''), `.`), 'roster');
  return { ok: true, replaced: current, severance };
}
export function hireStaff(f, id) {
  const c = staffById(id); if (!c) throw new Error('unknown staff');
  if (f.staff[c.role]) throw new Error('role filled');
  const budget = salarySummary(f, c.salary);
  if (budget.over) return { ok: false, reason: $t('franchise.exceeds_the_salary_cap') };
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
  const ly = f.freeAgency?.leagueYear ?? f.season?.year; const monsters = f.roster.reduce((s, m) => s + (m.salary || salaryFor(m)) + bonusCharge(m, ly), 0); // Task 7: plus this league year's bonus allocation
  const staff = Object.keys(f.staff).reduce((sum, role) => sum + staffSalary(f, role), 0);
  const dead = f.deadCap || 0; // severance for fired staff and retention bonuses, this season only
  const cap = capFor(f);
  const total = monsters + staff + dead + proposed;
  return { cap, monsters, staff, dead, proposed, total, remaining: cap - total, over: total > cap, rosterCount: f.roster.length };
}
registerOwnerHooks({ // Task 7: the engine's view of the owner's club (fa-engine.js)
  capFor: (f) => capFor(f), news: (f, text, kind) => news(f, text, kind),
  releaseAi: (f, club, id) => releaseFromClub(f, club, id, { year: leagueYear(f), reason: 'released', why: 'upgrade' }), // R1 c: an AI upgrade's release, made with the signing
  staffTotal: (f) => Object.keys(f.staff || {}).reduce((sum, role) => sum + staffSalary(f, role), 0),
  joinOwner: (f, m, via, start) => { uniqueName(f, m); m.origin ||= homeRegion(m); m.joined = start; backfillCareer(f, m); noteJoin(f, m, via, { region: homeRegion(m) }); f.roster.push(m); dexRecord(f, m, 'signed'); news(f, $P($L('franchise.ovr_signed_seasons_at_cr', { name: m.name, position: m.position, monsterOverall: monsterOverall(m), years: m.contract.years, toLocaleString: m.contract.salary.toLocaleString('en-US'), n: m.contract.years }), (m.contract.bonus ? $P(` `, $L('franchise.plus_a_cr_bonus', { toLocaleString: m.contract.bonus.toLocaleString('en-US') })) : ''), `.`), 'roster', { mid: m.id, mname: m.name }); },
});
/** Owner rule (2026-11-04): in a Task 7 offseason a club may release below the 26-monster minimum to free cap; the minimum still gates the next season. */
const offseasonRelease = (f) => hasFreeAgency(f) && !!f.season?.finished;
/** Why a release is refused, or null (the same rules as releaseMonster). */
function releaseRefusal(f, m) {
  if (f.roster.length <= ROSTER_MIN && !offseasonRelease(f)) return `${$t('franchise.you_must_keep_at_least_monsters', { rosterMin: ROSTER_MIN })}`;
  if (f.roster.filter((x) => x.position === m.position).length <= 1 && m.position !== 'TE') return `${$t('franchise.is_your_only', { name: m.name, position: m.position })}`;
  return null;
}
/**
 * The roster minimum against the cap (owner rule 2026-11-04). How many signings the club still needs, what the cheapest legal free
 * agents ask in total (first-season charge at their asks), the usable cap, the shortfall, and each release the owner may choose with
 * its cap saving (zero dead cap: his whole charge leaves the books) and what would still be missing after it. `path` is a sequence of
 * releases that closes the shortfall (a check that the club can recover); nothing is released here: the owner chooses.
 */
export function rosterFloorPlan(f) {
  const short = Math.max(0, ROSTER_MIN - f.roster.length);
  if (!hasFreeAgency(f) || !f.season?.finished) return { short, needed: 0, usable: null, gap: 0, releases: [], path: [], recoverable: short === 0 };
  const ly = leagueYear(f); const usable = capView(f, f.club).usable;
  const asks = freeAgentMarket(f).filter((x) => !faBlocker(f, f.club, x.monster, null, { final: true })).map((x) => x.ask.salary).sort((a, b) => a - b);
  const cost = (k) => (k <= asks.length ? asks.slice(0, k).reduce((a, b) => a + b, 0) : Infinity);
  const needed = cost(short); const gap = Math.max(0, needed - usable);
  const saving = (m) => capCharge(m, ly, { current: true });
  // Advisory only (the manual release policy in releaseMonster is unchanged): never suggest a release that leaves fewer eligible,
  // healthy monsters than the formation's required lineup slots, checked with the same depth-chart rule the season gate uses.
  const holes = (roster) => { const ids = new Set(roster.map((x) => x.id)); const manual = Object.fromEntries(Object.entries(f.lineupManual || {}).filter(([, id]) => ids.has(id))); return lineupProblems(roster, buildDepthChart(roster, manual, f.depth)).length; };
  const options = (roster) => { const base = holes(roster); return roster.filter((m) => !releaseRefusal({ ...f, roster }, m) && holes(roster.filter((x) => x !== m)) <= base); };
  const releases = options(f.roster).map((m) => { const sv = saving(m); const after = Math.max(0, cost(short + 1) - usable - sv); return { id: m.id, name: m.name, position: m.position, ovr: monsterOverall(m), saving: sv, gapAfter: after }; })
    .sort((a, b) => (a.gapAfter === 0) !== (b.gapAfter === 0) ? (a.gapAfter === 0 ? -1 : 1) : a.gapAfter - b.gapAfter || a.ovr - b.ovr || (a.id < b.id ? -1 : 1));
  const path = []; let roster = f.roster.slice(), k = short, room = usable;
  while (short > 0 && cost(k) > room && path.length < 12) {
    const best = options(roster).map((m) => ({ m, net: saving(m) - (asks[k] ?? Infinity) })).sort((a, b) => b.net - a.net || monsterOverall(a.m) - monsterOverall(b.m))[0];
    if (!best || best.net <= 0) break; path.push(best.m.id); roster = roster.filter((x) => x !== best.m); room += saving(best.m); k++;
  }
  return { short, needed, usable, gap, enough: asks.length >= short, releases, path, recoverable: short === 0 || cost(k) <= room };
}
export function releaseMonster(f, id) {
  const m = f.roster.find((x) => x.id === id); if (!m) return { ok: false, reason: $t('franchise.not_on_roster') };
  if (f.roster.length <= ROSTER_MIN && !offseasonRelease(f)) return { ok: false, reason: `${$t('franchise.you_must_keep_at_least_monsters', { rosterMin: ROSTER_MIN })}` }; // owner rule 2026-11-04: offseason releases may go below the minimum, which still gates the next season
  const positionCount = f.roster.filter((x) => x.position === m.position).length;
  if (positionCount <= 1 && m.position !== 'TE') return { ok: false, reason: `${$t('franchise.is_your_only', { name: m.name, position: m.position })}` };
  f.roster = f.roster.filter((x) => x.id !== id);
  for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === id) delete f.lineupManual[slot];
  toPool(f, m, 'released'); noteReleased(f, m, f.club); // Task 7 resolution 6: no re-signing him this league year
  news(f, $L('franchise.released_back_to', { name: m.name, homeRegion: homeRegion(m) }), 'roster');
  noteCaptainLeft(f, f.club, m, 'released');
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
  const t7 = hasFreeAgency(f) && hasLeague(f); // Task 7: the AI club makes its Task 6 offer and the monster answers at once (decision 17)
  if (hasLeague(f)) for (const m of (f.league.waivers || []).slice()) { if (!r.chance(0.15)) continue; const club = clubInNeed(f, m, r); if (!club) continue; if (t7) { aiSignNow(f, club, m); continue; } takeFromWaivers(f, m.id); m.salary = salaryFor(m); addToClub(f, club, m, { year: f.season.year, via: 'signed', contract: newContract(f.season.year, 2), source: 'waivers' }); }
  for (const [region, list] of Object.entries(f.pool || {})) {
    for (const m of list.slice()) {
      if (!r.chance(0.15)) continue;
      if (hasLeague(f)) { // persistent rosters (GDD §42.6): the club that needs him most, with room under the cap, really signs him
        const club = clubInNeed(f, m, r); if (!club) continue;
        if (t7) { if (aiSignNow(f, club, m)) news(f, $L('franchise.signed_with_from_the_pool', { name: m.name, position: m.position, club, region }), 'info'); continue; }
        takeFromPool(f, m.id); m.salary = salaryFor(m); addToClub(f, club, m, { year: f.season.year, via: 'signed', contract: newContract(f.season.year, 2), source: 'pool' });
        news(f, $L('franchise.signed_with_from_the_pool', { name: m.name, position: m.position, club, region }), 'info'); continue;
      }
      const club = r.pick(ALL_TEAMS.filter((t) => t !== f.club)); f.pool[region] = f.pool[region].filter((x) => x !== m); (m.history ||= []).push({ club, from: f.season.year, to: null, reason: 'signed' }); news(f, $L('franchise.signed_with_from_the_pool', { name: m.name, position: m.position, club, region }), 'info');
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
  team.forfeitReason = f.roster.length < ROSTER_MIN ? `${$t('franchise.only_monsters_on_the_roster_the', { n: f.roster.length, rosterMin: ROSTER_MIN })}` : lineupProblems(f.roster, team.chart).length ? `${$t('franchise.no_legal_monster_for')} ${lineupProblems(f.roster, team.chart).join(', ')}` : !offenseOk.length ? $t('franchise.every_offensive_play_in_the_plan') : !defenseOk.length ? $t('franchise.every_defensive_play_in_the_plan') : null;
  { const lock = schemeLock(f); if (lock.offense || lock.defense) team.schemeLock = { offense: lock.offense, defense: lock.defense }; }
  // Scheme alignment: a small execution bonus/penalty on awareness for every starter.
  const bump = (side, pct) => { const delta = Math.round((pct - 80) / 10); for (const p of Object.values(team[side])) if (p.attrs.awareness) p.attrs.awareness = Math.max(1, Math.min(99, p.attrs.awareness + delta)); };
  bump('offense', align.offense); bump('defense', align.defense);
  // Per-monster boost ledger for the pregame screen: which starters carry a training or media-day boost today.
  team.boosts = {};
  if (tb) { const keys = Object.keys(tb); for (const side of ['offense', 'defense']) for (const p of Object.values(team[side])) if (p.id) (team.boosts[p.id] ||= {}).training = keys; }
  // Saturday media day (GDD §20.1): the hype and star boosts remain. The nature-targeted boost and the pregame reply's
  // nature-group point are retired with Nature (N7c B14); press answers are flavour plus these non-nature effects.
  const md = f.week.media || null;
  if (md) {
    const byId = Object.fromEntries(f.roster.map((m) => [m.id, m]));
    for (const side of ['offense', 'defense']) for (const p of Object.values(team[side])) {
      const m = byId[p.id]; if (!m || !p.attrs) continue;
      const amt = (md.hype ? HYPE_BOOST : 0) + (md.star === m.id ? 2 : 0);
      if (!amt) continue;
      const up = 'awareness'; // the boost's attribute for every monster (it was already awareness for neutral natures)
      p.attrs[up] = Math.min(99, (p.attrs[up] || 0) + amt);
      (team.boosts[p.id] ||= {}).media = { amount: amt, attr: up };
    }
  }
  team.alignment = align;
  return team;
}
/** Deterministic AI club for a season (quality drifts per year; the rival is slightly better). */
/** Difficulty: how good and how smart the other 15 clubs are. */
/** Chosen at franchise creation and locked for its life (GDD §15.2). `hof` is the Hall of Fame bar at that difficulty (§15.9). */
/** Comeback mode (GDD §17) is RETIRED (owner ruling N8a, 2026-11-08; N7f: no rubber-banding): no side gets a rating lift for
 *  trailing. The rules engine's per-side edge stays for scheme lock; `comebackRule` returns null on every difficulty, so a game is
 *  created with no comeback rule. Unrelated comeback abilities and mechanics (the comeback route, abilities) are untouched. */
export const COMEBACK = Object.freeze({ margin: 10, edge: 5, retired: true }); // the former values, kept only for old saves' display text
export function comebackRule(f) { void f; return null; }
/** Scheme lock (GDD §17): when every starter on a side fits the coordinator's scheme, that side plays with +3 on every core rating. */
export const SCHEME_LOCK_EDGE = 3;
export function schemeLock(f) { const rf = rosterFit(f); const on = (x) => x.total > 0 && x.fit === x.total; return { offense: on(rf.offense) ? SCHEME_LOCK_EDGE : 0, defense: on(rf.defense) ? SCHEME_LOCK_EDGE : 0, fit: rf }; }
export const DIFFICULTY = Object.freeze({
  rookie: { label: 'Rookie', quality: -4, iq: 0.6, text: $t('franchise.weaker_clubs_that_call_plays_loosely'), hof: $t('franchise.hall_of_fame_8_badges_1'), hofGoals: { badges: 8, titles: 1, wins: 30, awards: 2 }, commissionerPicks: 5 },
  pro: { label: 'Pro', quality: -1, iq: 1, text: $t('franchise.the_standard_league'), hof: $t('franchise.hall_of_fame_8_badges_2'), hofGoals: { badges: 8, titles: 2, wins: 50, awards: 3 }, commissionerPicks: 3 },
  allstar: { label: 'All-Star', quality: 3, iq: 1.5, text: $t('franchise.stronger_clubs_whose_coaches_read_the'), hof: $t('franchise.hall_of_fame_8_badges_4'), hofGoals: { badges: 8, titles: 4, wins: 80, awards: 5 }, commissionerPicks: 3 },
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
  // Task 8 (N7f): initial strength only. No seasonal growth, title floor or 'studied tape' boost: a club changes through its own
  // roster (development, ageing, drafting, trades, free agency). `seasons` is kept for the signature, unused.
  void seasons; const growth = gym ? GYM_TIER[gym.tier] : 0; const floor = 0;
  return Math.round(base + (h % 9) - 4 + (f.rivals[f.tier]?.team === name ? 2 : 0) + difficultyQuality(D, !!gym) + growth + floor);
}
/** Task 8 D7 (owner N8b, AI_IDENTITIES.md §5 q4): Rookie's −4 lowers ordinary clubs only; a gym keeps the standard (Pro) level on
 *  Rookie, so it stays the stronger strategic test. Pro and All-Star apply to every club as before. */
export function difficultyQuality(D, gym) { return gym && D === DIFFICULTY.rookie ? DIFFICULTY.pro.quality : D.quality; }
/** An AI club's coach: the gym's named coach, or one shaped by the club's hash; difficulty sets the IQ (GDD §15.2). */
/** Task 8 D7: a club's fixed identity (identities.js) travels with its coach as `identity` { offense, defense, passStyle, runStyle,
 *  runFront }; the playbook reads it. A gym's named coach is fixed; an ordinary club's coach is still drawn from the season's hash (coaches
 *  may change, N8b) but his tendencies are centred on the identity. The owner's club has no identity (the hash-shaped coach as before). */
export function aiCoach(f, name, year) {
  const h = hashString(`${name}|${year}|${f.seed}`); const D = difficultyOf(f); const gym = GYM_BY_CLUB[name]; const id = clubIdentity(f, name);
  const identity = id ? { offense: id.offense, defense: id.defense, passStyle: id.passStyle || null, runStyle: id.runStyle || null, runFront: !!id.runFront, style: id.style || null } : null;
  if (gym) return { aggression: gym.coach.aggression, passBias: gym.coach.passBias, iq: D.iq + 0.2, identity: identity || { offense: gym.coach.offense, defense: gym.coach.defense } };
  if (id) return { ...identityCoach(id, h), iq: D.iq, identity };
  return { aggression: 0.35 + ((h >>> 8) % 40) / 100, passBias: 0.45 + ((h >>> 16) % 25) / 100, iq: D.iq };
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
  const team = generatedTeam(h, { id: name, name, abbr: meta.abbr, color: meta.color, quality, coach, scouting, element: gym?.element || null, legendary: gym?.legendary || null, signature: rival, evolveStage, composition: FULL_ROSTER, prefer: lineupPreference(clubIdentity(f, name)), afterRoster: (roster) => { const gone = new Set(f.aiTransfers?.[year]?.[name] || []); return injectDraftees(f, name, roster, year).filter((m) => !gone.has(m.id)); } });
  return equipLegendaryForAI(team); // AI clubs holding a Legendary call its play too (GDD §36.6)
}
/** The persistent club: the registry roster (injuries and fatigue included), the same coach, playbook and scouting rules as before. */
function leagueTeam(f, name, year, { scouting = null } = {}) {
  const meta = TEAM_META[name]; const h = hashString(`${name}|${year}|${f.seed}`);
  const coach = aiCoach(f, name, year);
  let pb = playbookFor(h ^ 0x9e37, coach); let notes = [];
  if (scouting) { const a = adaptPlaybook(h, pb, scouting, { swaps: scouting.swaps ?? 2 }); pb = a; notes = a.notes; }
  const team = buildTeam({ id: name, name, abbr: meta.abbr, color: meta.color, roster: clubRoster(f, name), coach, offensePlays: pb.offense, defensePlays: pb.defense, prefer: lineupPreference(clubIdentity(f, name)) });
  team.scoutingNotes = notes;
  return equipLegendaryForAI(team);
}
/**
 * The league registry for this universe (GDD §42.6; schema 8). A new franchise gets one at creation; an older save gets one the
 * first time it is opened by this build, built from the very rosters it was facing (`persistentFrom`), verified on the copy
 * before anything is kept. Returns { ok, created, rekeyed, problems }. Archives are never migrated (they are read-only).
 */
export function ensureLeague(f, { qualityDelta = 0, fresh = false } = {}) {
  if (hasLeague(f)) { ensureFreeAgency(f, { schema: SCHEMA_VERSION }); return { ok: true, created: false, rekeyed: [], problems: [] }; }
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
  ensureFreeAgency(f, { fresh, schema: SCHEMA_VERSION }); // the Task 7 block (fa-state.js); a Task 8 save keeps schema 10
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
/** The reward-ledger activity id of this week's football game for a club (spec §15: once per activity and monster). */
const actClub = (club) => String(club).replace(/\s+/g, '_');
export const gameActivityId = (f, club) => `fb:${f.season.year}:w${f.season.week}:${f.season.playoffs && !f.season.finished ? 'p' : 'r'}:${actClub(club)}`;
/** One simulated game's consequences for a persistent AI roster: XP, level-ups (points spent by the club), evolution when ready, fatigue, injuries. */
function aiAfterGame(f, team, game, side, r) {
  if (!leagueBooks(f, team.name)) return [];
  const won = game.winner === side;
  const xpScale = 1; // N7f: no rubber-banding; the decision-C development slowdown for a club above its target is retired
  const ledger = (f.rewardLedger ||= createRewardLedger()); const act = gameActivityId(f, team.name);
  const train = trainingPriority(clubIdentity(f, team.name)); // Task 8 D7: the identity's attributes first in the AI allocation (null for none)
  const events = afterGame(team.roster, team.chart, game.stats?.[side]?.players || {}, r, { won, autoSpend: true, autoEvolve: true, xpScale, ledger, activityId: act, train, mastery: game.t8?.mastery });
  { const played = playedIds(team.chart); const slots = selectDevSlots(team.roster, played); events.push(...practiceAfterGame(team.roster, slots.ids, played, r, { xpScale, autoSpend: true, autoEvolve: true, ledger, activityId: `${act}:reserve`, train })); } // C1 development slots (Task 6 Phase C)
  for (const e of events) if (e.kind === 'evolve') { const x = team.roster.find((p) => p.id === e.id); if (x) noteEvolution(x, { year: f.season.year, week: f.season.week, club: team.name, from: e.from, to: e.to }); } // Career Timeline (GDD §46)
  return events;
}
/** In-season cover for a persistent club that injuries left without a legal lineup (league-season.js). */
function leagueCover(f) { if (!hasLeague(f)) return; const { r, save } = frng(f); const n = leagueInjuryCover(f, r, { year: f.season.year, cap: tierById(f.tier).cap, targetOf: (c) => clubQuality(f, c) }); if (n) save(); }
/** Career marks League News reports for the league's monsters (the Timeline keeps every one). */
const MILESTONE_NEWS = new Set(['passYds', 'rushYds', 'recYds', 'tdTotal', 'sacks', 'int', 'tacklesTotal', 'games']);
const MILESTONE_LABEL = Object.freeze({ passYds: 'passing yards', rushYds: 'rushing yards', recYds: 'receiving yards', tdTotal: 'touchdowns', sacks: 'sacks', int: 'interceptions', tacklesTotal: 'tackles', games: 'games' });
/** The Career Timeline's per-game writers for persistent clubs (GDD §46): debuts, firsts, milestones, playoff stars, records, evolutions. */
function leagueCareerAfterGame(f, teams, _game, lines, { playoff = false, round = null, vsOwner = false } = {}) {
  for (const t of teams) {
    if (!leagueBooks(f, t.name)) continue;
    const rival = vsOwner && f.rivals?.[f.tier]?.team === t.name; // the rival's monsters remember big games against you, as yours do against them
    careerAfterGame(t.roster, { year: f.season.year, week: f.season.week, club: t.name, playoffRound: playoff ? round : null, rival, records: f.records }, { lineOf: (m) => lines.get(m.id) });
    // career marks crossed in this game, read from the books themselves (never from the Timeline, which must not change what the game does)
    for (const m of t.roster) { const g = lines.get(m.id); if (!g) continue; const total = withDerived(addInto(addInto({}, m.stats?.career?.reg), m.stats?.career?.post)); const line = withDerived(g.line || {});
      for (const M of CAREER_MILESTONES) { if (!MILESTONE_NEWS.has(M.key)) continue; const after = total[M.key] || 0, before = after - (line[M.key] || 0); for (const [i, at] of M.at.entries()) if (i >= 1 && before < at && after >= at) leagueEvent(f, { kind: 'milestone', tier: i, club: t.name, milestone: `${Number(at).toLocaleString('en-US')} career ${MILESTONE_LABEL[M.key] || M.key}`, ...moveIdentity(f, m) }); } }
  }
}
/** Weekly rest and healing for the 15 persistent rosters, as the owner's roster gets on Saturday. */
function leagueRecoverWeek(f, { bye = false } = {}) { if (!hasLeague(f)) return; for (const club of leagueClubs(f)) recoverWeek(clubRoster(f, club), { bye }); }
/** The balance nudge's brake (GDD §42.6 decision C): a club above its band develops at a share of the XP for one season, by how far above it sits. */
/** N7f (owner 2026-11-07): no rubber-banding, forced results or hidden boosts. The decision-C balance nudge (boost signings for a club
 *  below its target, the development slowdown and runaway-veteran attrition for one above it) no longer runs; clubs move only through
 *  their own development, ageing, drafting, trades, free agency and training. Kept for reference and the historical studies. */
export const RUBBER_BANDING_RETIRED = true;
export const SLOW_XP = Object.freeze({ mild: 0.75, strong: 0.5, strongFrom: 3 });
export const slowScale = (excess) => (excess <= 0 ? 1 : excess >= SLOW_XP.strongFrom ? SLOW_XP.strong : SLOW_XP.mild);
/** The rival GM's signature monster: the same species every season, a little stronger each year (GDD §15.8). */
export function rivalSignature(f) {
  const team = f.rivals[f.tier]?.team; if (!team) return null;
  const pool = SPECIES_DEX.filter((s) => s.evolution.length && ['QB', 'RB', 'WR', 'LB', 'CB', 'S'].includes(s.position)); // a signature that evolves as the years pass
  const sp = pool[hashString(`${`rival|${team}|${f.seed}`}`) % pool.length];
  const seasons = Math.max(0, (f.season?.year || 1) - 1);
  return { species: sp.id, bonus: 6 + seasons * 2, seasons };
}

// ------------------------------------------------------------ season
export function startSeason(f, year) {
  if (f.rewardLedger) pruneLedger(f.rewardLedger, (id) => Number(id.split(':')[1]) >= year); // completed activities of earlier seasons are no longer needed
  const records = Object.fromEntries(ALL_TEAMS.map((t) => [t, blankRecord()]));
  const lastRecords = f.season?.records || null;
  f.season = { year, week: 1, day: 0, records, results: [], playoffs: null, champion: null, finished: false, schedule: teamSchedule(year, f.club), leagueStats: {}, playoffStats: {}, recorded: [], expectations: {} };
  f.week = blankWeek();
  for (const m of f.roster) { m.fatigue = 0; if (m.yearsPro == null) m.yearsPro = Math.max(0, (m.age || 22) - 22); rolloverMonster(m, { year, team: f.club }); }
  if (hasLeague(f)) { for (const club of leagueClubs(f)) for (const m of clubRoster(f, club)) { m.fatigue = 0; rolloverMonster(m, { year, team: club }); } notePreseason(f, (c) => aiTeam(f, c, year)); noteStaffPreseason(f, year, strengthTable(f)); } // every persistent monster opens a new season book; the club's strength now is what its growth is measured from
  if (hasLeague(f) && year > 1) { // the offseason's moves and the draft, as digests (GDD §46)
    const rival = f.rivals?.[f.tier]?.team || null; const division = DIVISIONS[divisionOf(f.club)] || [];
    const d = f.draft && f.draft.done && !f.draft.creation ? f.draft : null; const scouted = new Set(Object.entries(d?.revealed || {}).filter(([, v]) => v >= 4).map(([id]) => id));
    addLeagueNews(f, [...(d ? draftDigest({ year, picks: d.picks, club: f.club, scouted }) : []), ...offseasonDigest({ year, events: takeEvents(f, year, 0), club: f.club, rival, division })]);
  }
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
  const m = sundayMatchup(f); if (!m) return { ok: false, reason: $t('franchise.no_game_today') };
  const side = m.playerSide, oppSide = side === 'home' ? 'away' : 'home';
  injuriesBeforeGame(f, [[f.club, f.roster, m.opponent, {}], [m.opponent, m[oppSide].roster, f.club, {}]], { home: m.home.name, away: m.away.name, week: f.season.week, playoff: !!m.playoff, round: playoffFixture(f)?.round || null }); // a forfeited game is still a scheduled game missed by the injured
  const score = { [side]: 0, [oppSide]: 21 };
  const res = { week: f.season.week, home: m.home.name, away: m.away.name, homeScore: score.home, awayScore: score.away, ot: false, player: true, forfeit: true };
  f.week.gameResult = { ...res, won: false, playerScore: 0, oppScore: 21, opponent: m.opponent, tag: m.tag, ...(m.tagL ? { tagL: m.tagL } : {}), forfeit: true };
  if (m.playoff) recordPlayoffResult(f, res); else { applyResult(f.season.records, res); f.season.results.push(res); const fx = currentFixture(f); fx.result = { playerScore: 0, oppScore: 21, won: false, forfeit: true }; }
  f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 }; f.campaign.h2h ||= {}; const h2h = (f.campaign.h2h[m.opponent] ||= { w: 0, l: 0, last: null, streakL: 0 }); h2h.l += 1; h2h.last = 'l'; h2h.streakL += 1;
  news(f, $L('franchise.forfeit_could_not_field_a_legal', { club: f.club, opponent: m.opponent }), 'loss');
  settleGymBadge(f, m, false, 0, 21); // a forfeit is a counted loss: a held badge goes back to its gym
  f.game = null; f.lastGame = { ...f.week.gameResult, events: [], year: f.season.year, week: f.season.week, newBadge: null };
  advanceWeek(f);
  return { ok: true, result: f.lastGame };
}
// ------------------------------------------------------------ the offseason (GDD §18.1)
/**
 * Task 7 contract processing (decision 23; §3.2 of the audit): a renewal is an extension in the contract's final league year. The
 * monster answers with the same evaluation every offer gets (personality, money, years, role, the club's results). 'sign' offers his
 * ask (or `salary`), 'counter' 85% of it; a refusal leaves him a free agent when Period 1 opens (the club may still bid), and a low
 * offer costs patience. 'walk' lets him go now. A contract runs 1–3 seasons, with an optional bonus.
 */
function renewTask7(f, item, m, choice, { years, salary, bonus }) {
  // owner 2026-11-05 (13:23): the renewal is a negotiation — his own decision to talk (or to test free agency), his opening demand, at
  // most two counteroffers from the club, his counters and his final decision; the AI clubs' renewals run the same negotiation
  const nextYear = f.season.year + 1;
  if (choice === 'walk') { f.roster = f.roster.filter((x) => x.id !== m.id); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === m.id) delete f.lineupManual[slot]; toPool(f, m, 'walked'); item.status = 'walked'; news(f, $L('franchise.walks_as_a_free_agent_back', { name: m.name, homeRegion: homeRegion(m) }), 'loss'); return { ok: true, status: 'walked' }; }
  const neg = renewalNeg(f, item, m);
  if (neg.state === 'no-talks') { item.status = 'declined'; return { ok: true, status: 'declined', talks: 'closed', ...lineField('clue', fieldLine(neg, 'clue')) }; }
  if (neg.state === 'ended') { item.status = 'declined'; return { ok: true, status: 'declined' }; }
  const accept = choice === 'sign' || choice === 'acceptcounter';
  let terms = accept ? { ...neg.demand } : { salary: Math.round((salary ?? (choice === 'counter' ? neg.demand.salary * COUNTER_PCT : neg.demand.salary)) / 100) * 100, years: years ?? neg.demand.years, bonus: Math.max(0, Math.round((bonus || 0) / 100) * 100) };
  const charge = terms.salary + allocateBonus(terms.bonus, terms.years)[0]; const room = capFor(f) - committedNext(f, m);
  if (charge > room) return { ok: false, code: 'cap', reason: `${$t('franchise.next_seasons_cap_has_cr_free', { toLocaleString: Math.max(0, room).toLocaleString('en-US'), toLocaleString2: charge.toLocaleString('en-US') })}` }; // checked before the offer counts
  const r = negotiate(f, m, neg, terms, { accept }); item.left = countersLeft(neg); item.ask = neg.demand.salary;
  if (r.outcome === 'agreed') {
    const t = r.terms; m.salary = t.salary; m.contract = makeContract({ start: nextYear, years: t.years, salary: t.salary, bonus: t.bonus, kind: 'renewal' }); m.contract.bonusPaid = { by: f.club, ly: nextYear };
    item.status = 'signed'; item.final = t.salary; item.years = t.years; if (neg.offers.length) item.countered = 'accepted'; delete item.counter;
    news(f, $P($L('franchise.re_signed_for', { name: m.name }), ` `, (t.years === 1 ? $L('franchise.one_season') : $L('franchise.count_seasons', { years: t.years })), ` `, $L('franchise.at_cr', { toLocaleString: t.salary.toLocaleString('en-US') }), (t.bonus ? $P(` `, $L('franchise.plus_a_cr_bonus', { toLocaleString: t.bonus.toLocaleString('en-US') })) : ''), `.`), 'roster');
    return { ok: true, status: 'signed' };
  }
  if (r.outcome === 'countered') { item.counter = r.counter; return { ok: true, status: 'countered', counter: r.counter, left: item.left }; }
  item.status = 'declined'; item.countered = 'refused';
  news(f, $L('franchise.ends_the_renewal_talks_and_will', { name: m.name }), 'loss');
  return { ok: true, status: 'declined', reason: r.reason };
}
/** The renewal negotiation behind an offseason book item (opened once; its opening demand becomes the item's ask). */
function renewalNeg(f, item, m) {
  const neg = negotiation(f, m, f.club, 'renew'); item.negKey = neg.key; if (item.opening == null) item.opening = neg.opening.salary;
  item.ask = neg.demand.salary; item.demandYears = neg.demand.years; item.left = countersLeft(neg);
  if (neg.state === 'no-talks' && !item.status) { item.status = 'declined'; item.talks = 'closed'; Object.assign(item, lineField('clue', fieldLine(neg, 'clue'))); news(f, $L('franchise.does_not_want_to_negotiate_a', { name: m.name, clue: fieldLine(neg, 'clue') }), 'loss'); }
  return neg;
}
/** Open the owner's renewal negotiations for the offseason book (Task 7): opening demands, and any monster who will not negotiate. */
function monsterRenewals(f) { for (const i of f.offseason?.items || []) if (i.kind === 'monster' && !i.status) { const m = f.roster.find((x) => x.id === i.id); if (m) renewalNeg(f, i, m); } }
/** The owner's commitments in the coming league year without `except` (whose deal is being renewed). */
function committedNext(f, except) { const ly = f.season.year + 1; let s = 0; for (const m of f.roster) if (m !== except) s += capCharge(m, ly); s += Object.keys(f.staff || {}).reduce((sum, role) => sum + staffSalary(f, role), 0) + (f.pendingDeadCap || 0); return s; }
// ------------------------------------------------------------ R7: staff affordability (owner approval 2026-11-05)
// Staff commitments are checked against next season's books in a Task 7 offseason. The renewal demand itself is unchanged (STAFF_RAISE)
// until the performance-based staff negotiation (owner's Section 9) is approved; this framework applies to whatever the demand is.
/** Owner 2026-11-05 §8: a Task 7 offseason's staff renewals ask a performance-based demand (staff-negotiation.js), not +10%. */
function staffDemands(f, year) {
  for (const i of f.offseason?.items || []) if (i.kind === 'staff' && !i.eval) staffItemEval(f, i, year);
}
function staffItemEval(f, i, year = f.season.year) {
  const d = staffDemand(f, i.role, i.current); i.ask = d.demand; i.year = year; i.round = 0;
  i.eval = { band: d.band.id, label: d.band.label, P: Math.round(d.P * 100) / 100, change: Math.round(d.change * 1000) / 1000, seasons: d.seasons.map((x) => ({ year: x.year, why: x.why })) };
  return i;
}
/** The salary of an owner option for a staff renewal: 'accept' | 'smaller' | 'same' | 'reduce' (null when it does not apply). */
export function staffOfferFor(item, option) { return staffOptions(item.current, item.ask)[option] ?? null; }
/** Next season's room for `role`: the cap less every commitment for next season except that role's current salary. */
export function staffRoom(f, role) { return capFor(f) - committedNext(f, null) + staffSalary(f, role); }
/** Can the owner renew `role` at its demand? { ok } or { ok: false, code: 'cap', demand, room, options }. */
export function staffRenewalCheck(f, role, salary = null) {
  const item = (f.offseason?.items || []).find((i) => i.kind === 'staff' && i.role === role);
  const demand = salary ?? (item?.eval ? item.ask : Math.round(staffSalary(f, role) * STAFF_RAISE)); const room = staffRoom(f, role);
  if (demand <= room) return { ok: true, demand, room };
  const fits = STAFF.filter((c) => c.role === role && c.salary <= room).sort((a, b) => a.salary - b.salary).map((c) => c.id);
  return { ok: false, code: 'cap', demand, room, fits, reason: `${$t('franchise.needs_cr_next_season_cr_is_2', { null: salary != null ? $t('franchise.that_offer') : $t('franchise.renewing'), toLocaleString: demand.toLocaleString('en-US'), toLocaleString2: Math.max(0, room).toLocaleString('en-US') })} ${fits.length ? $t('franchise.a_candidate_who_fits') : `${$t('franchise.the_default_a_logged_commissioner_exception', { replace: role.replace(/_/g, ' ') })}`}.` };
}
/**
 * A Task 7 staff renewal (owner 2026-11-05 §8): `choice` 'sign' (accept the demand), 'smaller', 'same', 'reduce', 'offer' (with `salary`)
 * or 'acceptcounter'. Every offer must fit next season's cap (R7) before it is made. He accepts, counters or rejects (staffAnswer); two
 * rounds at most; when talks end he leaves and the role is open (hire another; the default staff and the logged exception as before).
 */
function negotiateStaff(f, item, choice, { years, salary }) {
  if (!item.eval) staffItemEval(f, item);
  const name = item.name; const nextYear = f.season.year + 1; const yearsTxt = years === 1 ? 'one season' : 'two seasons'; years = Math.max(1, Math.min(CONTRACT_YEARS, years | 0));
  let pay = choice === 'acceptcounter' ? item.counter : choice === 'offer' ? salary : staffOfferFor(item, choice === 'sign' ? 'accept' : choice);
  if (pay == null) return { ok: false, code: 'option', reason: choice === 'acceptcounter' ? $t('franchise.there_is_no_counter_to_accept') : $t('franchise.that_option_does_not_apply_to') };
  pay = Math.max(100, Math.round(pay / 100) * 100);
  { const a = staffRenewalCheck(f, item.role, pay); if (!a.ok) return a; } // R7: never an offer the cap cannot carry
  const logR = (status, final = null) => { const L = (f.staffRenewalLog ||= []); L.push({ ly: nextYear, role: item.role, id: f.staff[item.role] || null, band: item.eval?.band || null, current: item.current, demand: item.ask, final, status, rounds: item.round || 0 }); if (L.length > 60) L.splice(0, L.length - 60); }; // a developer record of the outcomes
  const leave = (why) => { logR('left'); delete f.staff[item.role]; delete f.staffContracts[item.role]; item.status = 'walked'; item.ended = why; news(f, $L('franchise.leaves_hire_a_new_before_the', { name, why, replace: item.role.replace(/_/g, ' ') }), 'loss'); return { ok: true, status: 'walked', why }; };
  const sign = () => { logR('signed', pay); const base = staffById(f.staff[item.role])?.salary || pay; (f.staffRaise ||= {})[item.role] = pay / base; f.staffContracts[item.role] = newContract(nextYear, years); item.status = 'signed'; item.years = years; item.final = pay; delete item.counter;
    news(f, $L('franchise.re_signed_for_at_cr', { name, yearsTxt, toLocaleString: pay.toLocaleString('en-US'), current: pay >= item.current ? '+' : '', current2: Math.round(1000 * (pay / item.current - 1)) / 10 }), 'roster'); return { ok: true, status: 'signed', salary: pay }; };
  if (choice === 'acceptcounter') return sign();
  item.round = (item.round || 0) + 1; item.offers = [...(item.offers || []), pay];
  const a = staffAnswer(f, item, pay, item.round);
  if (a.answer === 'accept') return sign();
  if (a.answer === 'counter' && item.round < 2) { item.counter = a.counter; return { ok: true, status: 'countered', counter: { salary: a.counter, years } }; }
  if (a.answer === 'leave' || item.round >= 2) return leave(item.eval.band === 'very_poor' && item.round === 1 ? $t('franchise.he_would_not_take_less_than') : $t('franchise.the_talks_ended'));
  return { ok: true, status: 'rejected', reason: `${$t('franchise.turns_that_down_you_may_make', { name })}` };
}
/** Decide one renewal: 'sign' at the ask, 'counter' at 85% (they may walk), 'walk' (to the pool; a coach's role falls empty). */
export function resolveContract(f, id, choice, { years = CONTRACT_YEARS, salary = null, bonus = 0 } = {}) {
  const t7 = task7Offseason(f) && f.season.finished; const asked = arguments[3]?.years; // Task 7 monsters: a counteroffer without a term keeps his preferred term
  years = Math.max(1, Math.min(t7 ? 3 : CONTRACT_YEARS, years | 0)); // one year for the veteran you want one more season of; two at most before Task 7, three with it (resolution 1)
  const item = (f.offseason?.items || []).find((i) => i.id === id && !i.status); if (!item) return { ok: false, reason: $t('franchise.nothing_to_decide') };
  const nextYear = f.season.year + 1;
  if (item.kind === 'staff') {
    if (t7 && choice !== 'walk') return negotiateStaff(f, item, choice, { years, salary });
    if (choice === 'sign' && t7) { const a = staffRenewalCheck(f, item.role); if (!a.ok) return a; } // R7: the renewal must fit next season's cap
    if (choice === 'sign') { (f.staffRaise ||= {})[item.role] = (f.staffRaise[item.role] || 1) * STAFF_RAISE; f.staffContracts[item.role] = newContract(nextYear, years); item.status = 'signed'; item.years = years; news(f, $L('franchise.re_signed_for_at_cr_2', { name: item.name, years: years === 1 ? 'one season' : 'two seasons', toLocaleString: staffSalary(f, item.role).toLocaleString('en-US') }), 'roster'); return { ok: true, status: 'signed' }; }
    if (t7) { const L = (f.staffRenewalLog ||= []); L.push({ ly: nextYear, role: item.role, id: f.staff[item.role] || null, band: item.eval?.band || null, current: item.current, demand: item.ask, final: null, status: 'let go', rounds: item.round || 0 }); if (L.length > 60) L.splice(0, L.length - 60); }
    delete f.staff[item.role]; delete f.staffContracts[item.role]; item.status = 'walked'; news(f, $L('franchise.leaves_hire_a_new_before_the_2', { name: item.name, replace: item.role.replace(/_/g, ' ') }), 'loss'); return { ok: true, status: 'walked' };
  }
  const m = f.roster.find((x) => x.id === id); if (!m) { item.status = 'gone'; return { ok: true, status: 'gone' }; }
  if (t7) return renewTask7(f, item, m, choice, { years: asked == null ? null : years, salary, bonus });
  const { r, save } = frng(f);
  const sign = (salary) => { m.salary = salary; m.contract = newContract(nextYear, years); item.status = 'signed'; item.final = salary; item.years = years; news(f, $L('franchise.re_signed_for_at_cr_2', { name: m.name, years: years === 1 ? 'one season' : 'two seasons', toLocaleString: salary.toLocaleString('en-US') }), 'roster'); };
  const walk = (why) => { f.roster = f.roster.filter((x) => x.id !== id); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === id) delete f.lineupManual[slot]; toPool(f, m, 'walked'); item.status = 'walked'; news(f, $L('franchise.back_to_s_pool', { name: m.name, why, homeRegion: homeRegion(m) }), 'loss'); };
  if (choice === 'sign') sign(item.ask);
  else if (choice === 'counter') { const counter = Math.round(item.ask * COUNTER_PCT / 100) * 100; const yes = acceptsCounter(m, { winningRecord: !!f.offseason.winningRecord, rng: r }); save(); if (yes) { sign(counter); item.countered = 'accepted'; } else { walk($t('franchise.turned_down_your_counter_and_walks')); item.countered = 'refused'; } }
  else walk($t('franchise.walks_as_a_free_agent'));
  return { ok: true, status: item.status, countered: item.countered || null };
}
/** Offseason market: free agents the owner may sign to reach the roster floor, the regional pools plus a dozen generated veterans. */
export function offseasonMarket(f) {
  if (!f.offseason) return [];
  if (!f.offseason.market) { const { r, save } = frng(f); const gen = []; const positions = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'CB', 'S', 'K']; for (const pos of positions) { const regionName = r.pick(Object.keys(REGIONS)); const sp = marketSpecies(r, regionName, pos); if (!sp) continue; const m = generateMonster(r, { position: pos, quality: 50 + r.int(10), species: sp.id, channel: 'arrival' }); m.origin = regionName; claimMonster(f, m, 'market'); uniqueName(f, m, gen.map((x) => x.name)); gen.push(m); } save(); f.offseason.market = gen; }
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
  // v42.11 (owner decision): free agents are veterans with public pro records, so the whole card is known; scouting is for
  // the draft class and regional recruits. `skill` and `scoutName` are still reported for the sheet.
  const level = 6;
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
  if (!f.offseason) return { ok: false, reason: $t('franchise.the_market_is_open_in_the') };
  if (f.roster.length >= ROSTER_MAX) return { ok: false, reason: `${$t('franchise.roster_full', { rosterMax: ROSTER_MAX })}` };
  const entry = offseasonMarket(f).find((e) => e.monster.id === id); if (!entry) return { ok: false, reason: $t('franchise.not_on_the_market') };
  const m = entry.monster; m.salary = salaryFor(m); m.contract = newContract(f.season.year + 1);
  if (entry.fromPool) { for (const list of Object.values(f.pool || {})) { const i = list.indexOf(m); if (i >= 0) list.splice(i, 1); } } else f.offseason.market = f.offseason.market.filter((x) => x !== m);
  uniqueName(f, m); m.joined = f.season.year + (f.offseason ? 1 : 0); backfillCareer(f, m); noteJoin(f, m, 'free_agent', entry.fromPool ? { region: homeRegion(m) } : {}); f.roster.push(m); dexRecord(f, m, 'signed');
  const cap = salarySummary(f);
  news(f, $L('franchise.ovr_signed_as_a_free_agent', { name: m.name, position: m.position, monsterOverall: monsterOverall(m), over: (cap.over ? $L('franchise.over_the_cap_the_commissioner_will') : '')}), cap.over ? 'loss' : 'roster', { mid: m.id, mname: m.name });
  return { ok: true, overCap: cap.over };
}
// ------------------------------------------------------------ the draft (GDD §19)
export function ensureDraftClass(f) {
  if (!draftWindow(f) && !f.season.finished) return null;
  if (f.draft && f.draft.year === f.season.year) return f.draft;
  const { r, save } = frng(f); const d = openDraftClass(f, r, { uniqueName: (m, extra) => uniqueName(f, m, extra) }); save();
  for (const m of d.class) { claimMonster(f, m, 'class'); dexRecord(f, m, 'seen'); } // ids unique in the universe (GDD §42.3)
  news(f, $L('franchise.the_draft_class_is_in_first', { n: d.class.length }), 'info');
  return d;
}
/** Monday in the draft window: study prospects (focus position first). */
export function scoutDraft(f, { focus = null } = {}) {
  if (f.season.day !== 0) return { ok: false, reason: $t('franchise.not_monday') };
  if (!draftWindow(f)) return { ok: false, reason: $t('franchise.the_draft_class_is_not_in') };
  const d = ensureDraftClass(f); const scout = staffMember(f, 'head_scout');
  const skill = scout?.overall ?? 50; const { r, save } = frng(f);
  const res = draftScout(f, r, { skill, focus, bonus: scoutBonusActive(f) ? 1 : 0 }); save();
  f.week.draftScouted = { studied: res.studied.map((m) => m.id), glanced: res.glanced.map((m) => m.id) };
  f.season.day = 1;
  return { ok: true, ...res, scout: scout?.name || $t('franchise.your_scout') };
}
/** Tuesday in the draft window: recovery, fatigue off, injuries a week closer to healed. */
export function recoveryDay(f) {
  if (f.season.day !== 1) return { ok: false, reason: $t('franchise.not_tuesday') };
  if (!draftWindow(f)) return { ok: false, reason: $t('franchise.recovery_days_are_for_the_final') };
  const healed = [];
  for (const m of f.roster) { m.fatigue = Math.max(0, (m.fatigue || 0) - 15); if (m.injury) { m.injury.weeks -= 1; if (m.injury.weeks <= 0) { m.injury = null; healed.push(m.name); } } }
  f.week.recovered = true; f.season.day = 2;
  if (healed.length) news(f, $P($L('franchise.recovery_day'), ` `, healed.join(', '), ` `, $L('franchise.cleared_to_play')), 'roster');
  return { ok: true, healed };
}
/** Offseason: the draft runs after contracts. */
export function draftReady(f) { return !!f.draft && f.draft.year === f.season.year && f.season.finished && offseasonReady(f); }
export function beginDraft(f) {
  if (!f.season.finished) return { ok: false, reason: $t('franchise.the_season_is_not_over') };
  if (!offseasonReady(f)) return { ok: false, reason: $t('franchise.settle_the_contracts_first') };
  if (task7Offseason(f) && !freeAgencyDone(f)) return { ok: false, reason: $t('franchise.free_agency_comes_before_the_draft') };
  ensureDraftClass(f);
  const r = draftStart(f, leagueStandings(f).overall, { ownerOf: (o) => pickOwner(f, { year: f.season.year + 1, ...o }) }); if (!r.ok) return r;
  runDraftToMe(f);
  return { ok: true, draft: f.draft };
}
function runDraftToMe(f) {
  const { r, save } = frng(f);
  const league = hasLeague(f); const creation = !!f.draft?.creation; const year = creation ? f.season.year : f.season.year + 1;
  const bench = league ? leagueBenchOf(f) : null; // Task 6 Phase B (R7): each AI club drafts by its roster plan, derived at its pick
  const t7 = league && !creation && hasFreeAgency(f); const cap = tierById(f.tier).cap; // R7 (owner 2026-11-05): AI picks within the cap
  const r7 = t7 ? { affordOf: (team) => (m) => rookieCharge(m) <= clubCapRoom(f, team, cap), makeRoom: (team) => { const sp = floorSpare(f, team, null); if (!sp) return false; releaseFromClub(f, team, sp.id, { year, reason: 'released', why: 'cap' }); return true; },
    onAiPass: (team, why) => { (f.draft.aiPasses ||= []).push({ team, overall: f.draft.index, why }); news(f, $L('franchise.passed_at_pick', { team, index: f.draft.index, why }), 'info'); } } : {};
  const made = draftAdvance(f, r, { ...r7, playerClub: f.club, persist: !league, onAiPick: league ? (team, m) => { if (clubRecord(f, team)) joinAsDraftee(f, team, m, { year, silent: creation }); } : null, planOf: league ? (team) => (clubRecord(f, team) ? { ...rosterPlan(clubRoster(f, team), bench), mode: modeOf(f, team) } : null) : null }); // Phase D (R7): the club's strategy mode weights the pick
  save(); return made;
}
/**
 * R5 (owner 2026-11-05): what the owner's lineup cannot field. Base slots nobody can fill (a forfeit if it lasts to game day) and package
 * slots nobody can fill (the plays of that package drop out). Each warning names the slot, the position needed, the formation affected,
 * why (healthy players at the position, and the rule that nobody else may play it) and what would fix it. Nobody is ever substituted
 * out of position.
 */
export function lineupWarnings(f, roster = f.roster, chart = buildDepthChart(roster, f.lineupManual, f.depth)) {
  const healthy = (pos) => roster.filter((m) => m.position === pos && !m.injury).length; const hurt = (pos) => roster.filter((m) => m.position === pos && m.injury).length;
  const why = (pos) => `${healthy(pos)} healthy ${pos}${hurt(pos) ? ` ${$t('franchise.injured_2', { hurt: hurt(pos) })}` : ''}${$t('franchise.only_a_may_play_there_one', { pos })}`;
  const base = lineupProblems(roster, chart).map((slot) => { const pos = positionOf(slot); return { kind: 'base', slot, position: pos, formation: 'every play', severity: 'forfeit', why: why(pos), fix: `${$t('franchise.sign_draft_or_trade_for_a', { pos, pos2: hurt(pos) ? $t('franchise.or_wait_for_the_injured_to') : '' })}` }; });
  const pkg = borrowedSlots(roster, chart).filter((b) => !b.legal).map((b) => { const pos = positionOf(b.slot); return { kind: 'package', slot: b.slot, position: pos, formation: `${PACKAGE_SLOT_USE[b.slot]} plays`, severity: 'plays unavailable', why: why(pos), fix: `${$t('franchise.add_a_beyond_your_starters_to', { pos, packageSlotUse: PACKAGE_SLOT_USE[b.slot] })}` }; });
  return [...base, ...pkg];
}
/**
 * The lineup safeguard (owner's final Task 7 decision, 2026-11-05): before a season starts or a game is played, can the owner field a
 * complete legal starting lineup? Returns { ok, holes, fixes, cap, rosterFull, roster, canSign, noLegalReplacement, reason }.
 *   holes  each starting slot nobody legal and healthy can fill: { slot, position, healthy, injured, why }
 *   fixes  per open position, the cheapest legal healthy free agents on the market: { id, name, ovr, ask, fits, short, needsRoomOnRoster }
 * Read only. Nothing is signed, released, generated or moved out of position; the forfeit rule is unchanged. The caller shows it and lets
 * the owner act (sign, release, lineup) or continue deliberately under the forfeit rule.
 */
export function lineupGate(f) {
  const warn = lineupWarnings(f).filter((w) => w.kind === 'base'); const shortRoster = f.roster.length < ROSTER_MIN;
  const holes = warn.map((w) => ({ slot: w.slot, position: w.position, healthy: f.roster.filter((m) => m.position === w.position && !m.injury).length, injured: f.roster.filter((m) => m.position === w.position && m.injury).length, why: w.why }));
  const usable = hasFreeAgency(f) ? freeAgencyCap(f).usable : salarySummary(f).remaining; const rosterFull = f.roster.length >= ROSTER_MAX;
  const market = hasFreeAgency(f) ? freeAgentMarket(f).filter((x) => !x.mine) : [];
  const fixes = {}; for (const pos of [...new Set(holes.map((h) => h.position))]) {
    fixes[pos] = market.filter((x) => x.monster.position === pos && !x.monster.injury && !faBlocker(f, f.club, x.monster, null, { newSpot: false })).sort((a, b) => a.ask.salary - b.ask.salary || (a.monster.id < b.monster.id ? -1 : 1)).slice(0, 4)
      .map((x) => ({ id: x.monster.id, name: x.monster.name, ovr: monsterOverall(x.monster), ask: x.ask.salary, fits: x.ask.salary <= usable, short: Math.max(0, x.ask.salary - usable), needsRoomOnRoster: rosterFull }));
  }
  const canSign = !f.freeAgency?.period && !(f.season?.finished && task7Offseason(f) && !freeAgencyDone(f)); // the year-round market is open (in the periods, offers are made and answered as they advance)
  const noLegalReplacement = holes.length > 0 && Object.values(fixes).some((l) => !l.length);
  const ok = !holes.length && !shortRoster;
  const reason = ok ? null : shortRoster ? `${$t('franchise.only_monsters_on_the_roster_the_2', { n: f.roster.length, rosterMin: ROSTER_MIN })}` : `${$t('franchise.no_legal_healthy_starter_for')} ${holes.map((h) => `${h.slot} (${h.position})`).join(', ')}${$t('franchise.only_a_monster_of_that_position')}`;
  return { ok, holes, fixes, cap: usable, rosterFull, roster: f.roster.length, shortRoster, canSign, noLegalReplacement, reason };
}
/** R7 (owner 2026-11-05): can the owner pay this prospect's rookie deal now (Task 7)? null when yes; else the shortfall and the options. */
export function draftAffordability(f, id) {
  if (!hasFreeAgency(f) || f.draft?.creation) return null; const m = f.draft?.class?.find((x) => x.id === id); if (!m) return null;
  const charge = rookieCharge(m); const usable = capView(f, f.club).usable; if (charge <= usable) return null;
  const cheaper = f.draft.class.filter((x) => f.draft.available.includes(x.id) && rookieCharge(x) <= usable).map((x) => x.id);
  return { code: 'cap', charge, usable, short: charge - Math.max(0, usable), cheaper, reason: `${$t('franchise.his_rookie_deal_needs_cr_in', { toLocaleString: charge.toLocaleString('en-US'), toLocaleString2: Math.max(0, usable).toLocaleString('en-US') })}${cheaper.length ? ` ${$t('franchise.available', { n: cheaper.length })}` : ''}${$t('franchise.release_a_monster_no_dead_cap', { rosterMin: ROSTER_MIN })}` };
}
/** R7: what the owner's remaining picks this draft are expected to cost (rookie deals at the board's prospect for each slot). */
export function draftReserve(f, club = f.club) {
  const d = f.draft; if (!hasFreeAgency(f) || !d?.class?.length || d.done || d.year !== f.season.year || d.creation) return { picks: 0, total: 0 };
  if (!d.started) { // before the draft: the order the standings will give (worst first), the board prospect at each of the club's slots
    const board = d.class.filter((x) => !d.available || d.available.includes(x.id)).sort((a, b) => a.boardRank - b.boardRank); const st = leagueStandings(f).overall; const n = st.length;
    const mine = picksOwnedBy(f, club, f.season.year + 1, ALL_TEAMS).filter((p) => !pickUsed(f, p)).map((p) => (p.round - 1) * n + (n - 1 - st.indexOf(p.original)));
    return { picks: mine.length, total: mine.reduce((s2, i) => s2 + (board[Math.min(board.length - 1, i)] ? rookieCharge(board[Math.min(board.length - 1, i)]) : 0), 0), estimate: true };
  }
  const board = d.class.filter((x) => d.available.includes(x.id)).sort((a, b) => a.boardRank - b.boardRank);
  const mine = d.order.map((o, i) => ({ ...o, i })).filter((o) => o.i >= d.index && o.team === club);
  const total = mine.reduce((s, o) => s + (board[Math.min(board.length - 1, o.i - d.index)] ? rookieCharge(board[Math.min(board.length - 1, o.i - d.index)]) : 0), 0);
  return { picks: mine.length, total };
}
export function myDraftPick(f, id) { { const a = draftAffordability(f, id); if (a) return { ok: false, ...a }; } const r = draftPlayerPick(f, id, { playerClub: f.club, nextYear: f.draft?.creation ? f.season.year : f.season.year + 1 }); if (!r.ok) return r; uniqueName(f, r.monster); dexRecord(f, r.monster, 'signed'); news(f, $L('franchise.drafted_rookie_deal_cr_for_two', { name: r.monster.name, position: r.monster.position, toLocaleString: r.monster.salary.toLocaleString('en-US') }), 'roster', { mid: r.monster.id, mname: r.monster.name }); runDraftToMe(f); return r; }
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
/** The trade calendar for this franchise right now (trade-window.js): is the owner's desk open, may clubs call, may clubs trade with each other. */
export function tradeWindow(f) {
  const s = f.season || {};
  return tradeWindowState({ fired: isFired(f), finished: !!s.finished, offseason: !!f.offseason, draftOpen: !!(f.draft?.started && !f.draft.done), playoffs: !s.finished && inPlayoffs(f), week: s.week });
}
export { TRADE_DEADLINE_WEEK, FIRST_TRADE_WEEK } from './trade-window.js';
function tradeOpen(f) { return tradeWindow(f).desk; }
function spendAsk(f, give) { const key = pickKey(give[0]); const n = f.pickAsks?.[key] || 0; if (n >= ASKS_PER_PICK) return { ok: false, reason: `${$t('franchise.that_pick_has_been_shopped_times', { asksPerPick: ASKS_PER_PICK })}` }; (f.pickAsks ||= {})[key] = n + 1; return { ok: true }; }
function checkGive(f, give) {
  if (!tradeOpen(f)) return { ok: false, reason: $t('franchise.trades_are_open_on_the_clock') };
  if (!give?.length) return { ok: false, reason: $t('franchise.choose_at_least_one_pick_to') };
  const mine = myTradablePicks(f);
  for (const p of give) { const m = mine.find((x) => samePick(x, p)); if (!m) return { ok: false, reason: $t('franchise.you_do_not_hold_that_pick') }; }
  return { ok: true };
}
/** Shop picks for a veteran at a position. Up to three offers; each ask costs one of the lead pick's two. */
export function tradeAskPlayer(f, { give, position }) {
  const c = checkGive(f, give); if (!c.ok) return c;
  if (!canTakePlayer(f)) return { ok: false, reason: `${$t('franchise.roster_full_release_someone_before_trading', { rosterMax: ROSTER_MAX })}` };
  const a = spendAsk(f, give); if (!a.ok) return a;
  const r = askForPlayer(f, { give, position, ...tradeCtx(f) });
  news(f, $P($L('franchise.shopped'), ` `, give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + '), ` `, $L('franchise.for_a', { position }), ` `, r.offers.length ? $L('franchise.clubs_interested', { n: r.offers.length }) : $L('franchise.no_takers'), `.`), 'info');
  return { ok: true, offers: r.offers, interested: r.teams, asksLeft: ASKS_PER_PICK - (f.pickAsks[pickKey(give[0])] || 0) };
}
/** Shop picks for future picks: `count` picks of `round` in class `year`. Clubs counter with the nearest package they would accept. */
export function tradeAskPicks(f, { give, year, round, count = 1 }) {
  const c = checkGive(f, give); if (!c.ok) return c;
  if (!tradableYears(f).includes(year)) return { ok: false, reason: `${$t('franchise.picks_can_be_traded_up_to', { tradeYearsAhead: TRADE_YEARS_AHEAD })}` };
  const a = spendAsk(f, give); if (!a.ok) return a;
  const r = askForPicks(f, { give, year, round, count, ...tradeCtx(f) });
  news(f, $P($L('franchise.shopped'), ` `, give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + '), ` for `, count, ` × `, yearOf(year), ` R`, round, `: `, (r.offers.length ? `${r.offers.filter((o) => o.exact).length} yes, ${r.offers.filter((o) => !o.exact).length} counter${r.offers.filter((o) => !o.exact).length === 1 ? '' : 's'}` : $L('franchise.no_takers')), `.`), 'info');
  return { ok: true, offers: r.offers, interested: r.teams, asksLeft: ASKS_PER_PICK - (f.pickAsks[pickKey(give[0])] || 0) };
}
/** Take an offer. Picks change hands at once; a veteran joins on a two-year deal at his salary (over the cap means the commissioner's review, like any signing). */
export function acceptTrade(f, offer) {
  const c = checkGive(f, offer.give); if (!c.ok) return c;
  if (offer.get?.player && !canTakePlayer(f)) return { ok: false, reason: `${$t('franchise.roster_full', { rosterMax: ROSTER_MAX })}` };
  const year = f.season.year; const nextYear = f.draft?.creation ? year : year + 1;
  const got = executeTrade(f, offer, { club: f.club, year, nextYear }); if (got.player) { uniqueName(f, got.player); leagueEvent(f, { kind: 'trade', from: offer.team, to: f.club, toOwner: true, consideration: offer.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + '), ...moveIdentity(f, got.player) }); }
  if (got.player) { dexRecord(f, got.player, 'signed'); const cap = salarySummary(f); news(f, $P($L('franchise.trade_ovr_arrives_from_for', { name: got.player.name, position: got.player.position, monsterOverall: monsterOverall(got.player), team: offer.team }), ` `, offer.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + '), (cap.over ? $L('franchise.over_the_cap_the_commissioner_will_2') : ''), `.`), 'roster', { mid: got.player.id, mname: got.player.name }); }
  else news(f, $P($L('franchise.trade'), ` `, offer.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + '), ` `, $L('franchise.to_for', { team: offer.team }), ` `, got.picks.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + '), `.`), 'roster');
  if (f.draft?.started && !f.draft.done) runDraftToMe(f); // if the pick on the clock went out, the new holder uses it now
  if (got.player) noteCaptainLeft(f, offer.team, got.player, 'traded'); // an AI captain traded to the owner leaves his club's partnership inactive
  checkAchievements(f, 'trade');
  return { ok: true, got };
}

// ---------------------------------------------------------------- the trade desk (GDD §19.6c, Task 5): monsters and picks, both ways
/** Everything the trade desk judges a deal with: the owner's roster, cap room and picks, and each club's roster and cap room. */
function deskEnv(f, extra = {}) {
  const cap = tierById(f.tier).cap;
  return { ownerRoster: f.roster, ownerRoom: salarySummary(f).remaining, ownerPicks: myTradablePicks(f), roster: (t) => clubRoster(f, t), room: (t) => clubCapRoom(f, t, cap), difficulty: f.settings?.difficulty || 'pro', year: contractYear(f), allTeams: ALL_TEAMS, clubs: leagueClubs(f), windowOpen: tradeOpen(f), ...extra };
}
/** Monster trades need the persistent league (every save since v41); older saves keep the picks-only desk. */
export const deskAvailable = (f) => hasLeague(f);
/** The 15 clubs and what the owner may still ask each this window. */
export function deskPartners(f) { return leagueClubs(f).slice().sort().map((team) => ({ team, ...deskUsage(f, team), roster: clubRoster(f, team).length, room: clubCapRoom(f, team, tierById(f.tier).cap) })); }
/** One club's side of the desk: who can move on each side and why not, the picks each holds, how many proposals are left. */
export function deskAssetsFor(f, team) { return deskAssets(f, team, deskEnv(f)); }
const proposalShape = (p) => ({ team: p.team, giveMonsters: [...(p.giveMonsters || [])], givePicks: (p.givePicks || []).map((x) => ({ year: x.year, round: x.round, original: x.original })), getMonsters: [...(p.getMonsters || [])], getPicks: (p.getPicks || []).map((x) => ({ year: x.year, round: x.round, original: x.original })) });
/** What a proposal would do, before you send it: legality, roster and cap, depth. Never says whether the club would accept. */
export function deskPreview(f, prop) {
  if (!deskAvailable(f)) return { ok: false, reason: $t('franchise.this_save_has_no_persistent_league') };
  const e = evaluateProposal(f, proposalShape(prop), deskEnv(f, { counter: false }));
  return { ok: e.ok, legal: e.legal, reasons: e.reasons.filter((r) => r.blocking), detail: e.detail };
}
const nameList = (ms, picks) => [...ms.map((m) => `${m.name} (${m.position}, ${monsterOverall(m)} OVR)`), ...picks.map((p) => `${yearOf(p.year)} R${p.round}`)].join(', ') || 'nothing';
/** Make the proposal. A club that is asked answers once; a legal proposal uses one of your calls to that club this window. */
export function deskPropose(f, prop) {
  if (!deskAvailable(f)) return { ok: false, reason: $t('franchise.this_save_has_no_persistent_league') };
  const p = proposalShape(prop); const env = deskEnv(f);
  const e = evaluateProposal(f, p, { ...env, count: true });
  if (!e.ok) return { ok: false, reason: e.reasons[0].text, reasons: e.reasons };
  if (!e.legal) return { ok: true, accepted: false, legal: false, reasons: e.reasons, detail: e.detail, counter: null };
  spendProposal(f, p.team);
  if (!e.accept) { news(f, $L('franchise.the_turned_down_your_proposal', { team: p.team }), 'info'); return { ok: true, accepted: false, legal: true, reasons: e.reasons, detail: e.detail, counter: e.counter }; }
  const got = executeProposal(f, p);
  return { ok: true, accepted: true, legal: true, reasons: [], detail: e.detail, got };
}
/** What accepting the waiting call would do to your roster, depth and cap (null for a call from before Task 5). */
export function callEffect(f) {
  const c = tradeCall(f); if (!c?.kind) return null;
  const prop = proposalShape({ team: c.team, giveMonsters: c.askIds || [], givePicks: c.give || [], getMonsters: c.sendIds || [], getPicks: c.sendPicks || [] });
  return evaluateProposal(f, prop, deskEnv(f, { windowOpen: true, noLimit: true, counter: false })).detail || null;
}
/** Carry out a deal that has been judged and accepted: monsters and picks both ways, news, career, captains, the draft clock. */
function executeProposal(f, p) {
  const year = f.season.year; const nextYear = f.draft?.creation ? year : (f.offseason || f.season.finished) ? year + 1 : year;
  const outs = p.giveMonsters.map((id) => f.roster.find((m) => m.id === id)); const ins = p.getMonsters.map((id) => clubRoster(f, p.team).find((m) => m.id === id));
  const sentLabel = nameList(outs, p.givePicks), gotLabel = nameList(ins, p.getPicks);
  for (const m of outs) {
    f.roster = f.roster.filter((x) => x.id !== m.id);
    for (const [slot, mid] of Object.entries(f.lineupManual || {})) if (mid === m.id) delete f.lineupManual[slot];
    (m.history ||= []).push({ club: f.club, from: m.contract?.signed || year, to: year, reason: 'traded' });
    addToClub(f, p.team, m, { year, via: 'traded', contract: m.contract && !m.contract.permanent ? { ...m.contract } : newContract(nextYear, 2), salary: m.salary || salaryFor(m) });
    m.traded = { from: f.club, year }; noteTraded(f, m, f.club);
    leagueEvent(f, { kind: 'trade', from: f.club, to: p.team, fromOwner: true, consideration: gotLabel, ...moveIdentity(f, m) });
    noteCaptainLeft(f, f.club, m, 'traded');
  }
  const got = { monsters: [], picks: [] };
  for (const src of ins) {
    const kept = src.contract ? { ...src.contract } : null; /* removeFromClub clears the contract: keep his copy first */
    const m = removeFromClub(f, p.team, src.id, { year, reason: 'traded' });
    m.salary = m.salary || salaryFor(m); m.contract = hasFreeAgency(f) && kept && !kept.permanent ? kept : newContract(nextYear, 2); m.joined = nextYear; m.traded = { from: p.team, year }; noteTraded(f, m, p.team); // Task 7: the contract and its remaining schedule move with him
    backfillCareer(f, m); noteJoin(f, m, 'trade', { from: p.team });
    f.roster.push(m); uniqueName(f, m); dexRecord(f, m, 'signed');
    leagueEvent(f, { kind: 'trade', from: p.team, to: f.club, toOwner: true, consideration: sentLabel, ...moveIdentity(f, m) });
    noteCaptainLeft(f, p.team, m, 'traded'); got.monsters.push(m);
  }
  for (const pick of p.givePicks) transferPick(f, pick, p.team);
  for (const pick of p.getPicks) { transferPick(f, pick, f.club); got.picks.push(pick); }
  (f.trades ||= []).push({ year, team: p.team, give: p.givePicks, got: ins.length ? { player: { id: got.monsters[0].id, name: got.monsters[0].name, position: got.monsters[0].position, ovr: monsterOverall(got.monsters[0]) } } : { picks: got.picks }, desk: { sent: outs.map((m) => m.id), received: got.monsters.map((m) => m.id) } });
  const cap = salarySummary(f);
  news(f, $L('franchise.trade_with_the_you_send_you', { team: p.team, sentLabel, gotLabel, over: (cap.over ? $L('franchise.over_the_cap_the_commissioner_will_3') : '')}), 'roster', got.monsters[0] ? { mid: got.monsters[0].id, mname: got.monsters[0].name } : null);
  if (f.draft?.started && !f.draft.done) runDraftToMe(f); // if the pick on the clock went out, the new holder uses it now
  checkAchievements(f, 'trade');
  return got;
}

// ---------------------------------------------------------------- AI clubs calling (GDD §19.6, second pass; Task 5: from the club's own needs, monsters and picks)
/** The week (or offseason) a call belongs to: it lasts until this changes. */
function callStamp(f) { return f.offseason ? `off:${f.season.year}` : `wk:${f.season.year}:${f.season.week}`; }
/** The call waiting for an answer, or null. */
export function tradeCall(f) { const c = f.tradeCall; return c && c.expires === callStamp(f) && tradeWindow(f).calls ? c : null; } // a call never outlives the window: past the deadline it is simply gone
const callMonster = (m) => ({ id: m.id, name: m.name, species: m.species, position: m.position, ovr: monsterOverall(m), age: m.age, salary: m.salary });
/** Once a week in season (weeks 1-7) and once when the offseason opens, a club may call with an offer. */
export function maybeTradeCall(f) {
  const stamp = callStamp(f);
  if (f.tradeCall && f.tradeCall.expires !== stamp) { news(f, $P($L('franchise.the_offer', { team: f.tradeCall.team }), ` `, (f.tradeCall.kind ? $L('franchise.to_you') : $P($L('franchise.for_your'), ` `, f.tradeCall.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + '))), ` expired.`), 'info'); f.tradeCall = null; }
  if (f.tradeCall || isFired(f)) return null;
  if (!tradeWindow(f).calls) return null; // weeks 1–7 and the offseason: trading closes when week 8 begins (trade-window.js)
  f.callsMade ||= {}; if (f.callsMade[stamp]) return null; f.callsMade[stamp] = true;
  const until = f.offseason ? $t('franchise.the_new_season') : $t('franchise.the_end_of_the_week');
  if (hasLeague(f)) { // the club's own roster decides who calls and what for (trade-desk.js buildIncomingOffer)
    const o = buildIncomingOffer(f, deskEnv(f, { windowOpen: true }), { key: stamp, chance: CALL_CHANCE[f.settings?.difficulty || 'pro'] ?? 0.26 });
    if (!o) return null;
    const p = o.proposal; const sends = p.getMonsters.map((id) => callMonster(clubRoster(f, o.team).find((m) => m.id === id))); const asks = p.giveMonsters.map((id) => callMonster(f.roster.find((m) => m.id === id)));
    f.tradeCall = { team: o.team, kind: o.kind, give: p.givePicks, askIds: p.giveMonsters, sendIds: p.getMonsters, sendPicks: p.getPicks, sends, asks, position: (sends[0] || asks[0]).position, playerId: sends[0]?.id || null, player: sends[0] || null, value: Math.round(o.gain), expires: stamp };
    const lines = { sell: `${$t('franchise.ovr_for_your', { name: sends[0]?.name, position: sends[0]?.position, ovr: sends[0]?.ovr })} ${p.givePicks.map((x) => `${yearOf(x.year)} R${x.round}`).join(' + ')}`, buy: `${$t('franchise.ovr_for_their', { name: asks[0]?.name, position: asks[0]?.position, ovr: asks[0]?.ovr })} ${p.getPicks.map((x) => `${yearOf(x.year)} R${x.round}`).join(' + ')}`, swap: `${sends[0]?.name} (${sends[0]?.position}, ${sends[0]?.ovr} OVR) for ${asks[0]?.name} (${asks[0]?.position}, ${asks[0]?.ovr} OVR)` };
    news(f, $L('franchise.the_called_the_offer_stands_until', { team: o.team, lines: lines[o.kind], until }), 'info');
    return f.tradeCall;
  }
  const c = buildTradeCall(f, { ...tradeCtx(f), myRoster: f.roster, myPicks: myTradablePicks(f), key: stamp });
  if (!c) return null;
  f.tradeCall = { ...c, expires: stamp };
  news(f, $P($L('franchise.the_called_ovr_for_your', { team: c.team, name: c.player.name, position: c.player.position, ovr: c.player.ovr }), ` `, c.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + '), $L('franchise.the_offer_stands_until', { until })), 'info');
  return f.tradeCall;
}
/** Answer the call: accept (the deal is carried out) or decline. A call made before Task 5 (no `kind`) is picks for one player, as it always was. */
export function answerTradeCall(f, accept) {
  if (f.tradeCall && !tradeWindow(f).calls) { f.tradeCall = null; return { ok: false, reason: $t('franchise.the_trade_deadline_has_passed_the') }; } // a pending offer cannot be accepted after the deadline, however it got here (a stale or edited save too)
  const c = tradeCall(f); if (!c) return { ok: false, reason: $t('franchise.no_call_is_waiting') };
  if (!accept) { f.tradeCall = null; news(f, $L('franchise.declined_the_offer', { team: c.team }), 'info'); return { ok: true, declined: true }; }
  if (c.kind) {
    const prop = proposalShape({ team: c.team, giveMonsters: c.askIds || [], givePicks: c.give || [], getMonsters: c.sendIds || [], getPicks: c.sendPicks || [] });
    const e = evaluateProposal(f, prop, deskEnv(f, { windowOpen: true, noLimit: true, counter: false }));
    if (!e.legal || !e.accept) { f.tradeCall = null; return { ok: false, reason: `${$t('franchise.the_offer_is_off', { text: (e.reasons[0]?.text || $t('franchise.the_situation_has_changed')) })}` }; }
    const got = executeProposal(f, prop); f.tradeCall = null;
    return { ok: true, got: { player: got.monsters[0] || null, monsters: got.monsters, picks: got.picks } };
  }
  if (!canTakePlayer(f)) return { ok: false, reason: `${$t('franchise.roster_full_release_someone_first', { rosterMax: ROSTER_MAX })}` };
  const mine = myTradablePicks(f); if (!c.give.every((p) => mine.some((x) => samePick(x, p)))) { f.tradeCall = null; return { ok: false, reason: $t('franchise.you_no_longer_hold_those_picks') }; }
  const src = aiTeam(f, c.team).roster.find((m) => m.id === c.playerId); if (!src) { f.tradeCall = null; return { ok: false, reason: `${$t('franchise.is_no_longer_with_the', { name: c.player.name, team: c.team })}` }; }
  const year = f.season.year; const nextYear = f.offseason || f.season.finished ? year + 1 : year; // in season he joins now, on a deal starting this year
  const got = executeTrade(f, { team: c.team, give: c.give, get: { player: src } }, { club: f.club, year, nextYear });
  f.tradeCall = null; uniqueName(f, got.player); dexRecord(f, got.player, 'signed'); leagueEvent(f, { kind: 'trade', from: c.team, to: f.club, toOwner: true, consideration: c.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + '), ...moveIdentity(f, got.player) });
  const cap = salarySummary(f);
  news(f, $P($L('franchise.trade_ovr_arrives_from_the_for', { name: got.player.name, position: got.player.position, monsterOverall: monsterOverall(got.player), team: c.team }), ` `, c.give.map((p) => `${yearOf(p.year)} R${p.round}`).join(' + '), (cap.over ? $L('franchise.over_the_cap_the_commissioner_will_2') : ''), `.`), 'roster', { mid: got.player.id, mname: got.player.name });
  noteCaptainLeft(f, c.team, got.player, 'traded');
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
export function chooseGoal(f, id) { const r = boardChooseGoal(f, id, commissionerGoals(f)); if (r.ok) news(f, $L('franchise.commissioners_office_you_committed_to_this', { label: fieldLine(r.goal, 'label') }), 'info'); return r; }
/** Where the goal stands mid-season (for HQ). */
export function goalProgress(f) {
  const g = f.board?.goal; if (!g) return null; const rec = record(f);
  if (g.id === 'wins') return { text: `${$t('franchise.of_wins', { w: rec.w, target: g.target })}`, pct: Math.min(1, rec.w / g.target) };
  if (g.id === 'badges') { const n = Object.values(f.campaign?.badges || {}).filter((b) => b.year === f.season.year).length; return { text: `${$t('franchise.of_badges', { n, target: g.target })}`, pct: Math.min(1, n / g.target) }; }
  if (g.id === 'playoffs') { const p = playoffPicture(f); return { text: p.inPlayoffs ? `In: ${p.text}` : p.text, pct: p.inPlayoffs ? 1 : 0.4 }; }
  if (g.id === 'title') return { text: f.season.champion === f.club ? 'Champions!' : inPlayoffs(f) ? $t('franchise.alive_in_the_playoffs') : `${rec.w}-${rec.l}`, pct: inPlayoffs(f) ? 0.7 : 0.3 };
  return null;
}
/** Spend one attribute point on a roster monster (GDD §17.3). */
/** The trainer spends every banked point by position weight (GDD §17.3), one tap instead of a card per monster. */
export function autoSpendAllPoints(f, { only = null } = {}) {
  if (pointsLocked(f)) return { ok: false, spent: 0, monsters: 0, reason: $t('franchise.attribute_points_are_frozen_until_every') };
  const { r, save } = frng(f); let spent = 0, monsters = 0;
  for (const m of f.roster) { if (only && m.id !== only) continue; const before = m.points || 0; if (!before) continue; autoSpendPointsFn(m, r); const used = before - (m.points || 0); if (used) { spent += used; monsters++; } }
  save(); if (spent) news(f, $L('franchise.the_trainer_spent_attribute_points_across', { spent, monsters, monsters2: monsters === 1 ? '' : 's', n: spent }), 'info');
  return { ok: true, spent, monsters };
}
/** The league year the player reads (GDD §21.7): once the offseason's contracts are settled, the draft opens the next year. */
export function displayYear(f) { const s = f.season; if (!s) return 1; return s.finished && f.offseason && !offseasonPending(f).length ? s.year + 1 : s.year; }
/** Attribute points are frozen while contract decisions are open (GDD §21.6): settle the book first. */
export function pointsLocked(f) { return !!(f.season?.finished && f.offseason && offseasonPending(f).length); }
export function spendAttributePoint(f, id, attr) { if (pointsLocked(f)) return { ok: false, reason: $t('franchise.attribute_points_are_frozen_until_every') }; const m = f.roster.find((x) => x.id === id); if (!m) return { ok: false, reason: $t('franchise.not_found') }; return spendPoint(m, attr); }
/** The owner's view of a monster's career stage and retirement outlook (GDD §55.6): observable facts only, never hidden longevity. */
export function monsterOutlook(f, m) { if (!m) return null; const starters = new Set(Object.values(buildDepthChart(f.roster, f.lineupManual, f.depth)).filter(Boolean)); return retirementOutlook(f, m, { starter: starters.has(m.id) }); }
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
  if (f.roster.length >= ROSTER_MAX) return { ok: false, reason: `${$t('franchise.roster_full_release_someone_first', { rosterMax: ROSTER_MAX })}` };
  if (f.roster.some((m) => m.species === speciesId)) return { ok: false, reason: $t('franchise.already_on_your_roster') };
  const { r, save } = frng(f); const sp = SPECIES_DEX.find((x) => x.id === speciesId); if (!sp) return { ok: false, reason: $t('franchise.unknown_species') };
  const m = generateMonster(r, { position: sp.position, quality: 64, species: speciesId }); save(); claimMonster(f, m, 'dev');
  m.salary = salaryFor(m); m.contract = newContract(f.season.year, 2); m.devGranted = true; (m.history ||= []).push({ club: f.club, from: f.season.year, to: null, reason: 'developer' });
  noteJoin(f, m, 'developer'); markCareerFresh(m); f.roster.push(m); f.devAssisted = true; const res = syncLegendary(f);
  news(f, $L('franchise.developer_test_joins_the_roster', { name: m.name }), 'info');
  return { ok: true, monster: m, discovered: res.discovered };
}
/**
 * The venue of this week's game at `home` against `away` (GDD §33; field generator, QoL update): the home club's stadium, the
 * field the generator gives this game (a boss's element, or the 65% grass / 35% elemental draw) and that field's weather.
 */
export function gameVenue(f, home, away = null) { return generatedVenue(home, away, `${f.seed}|${f.season.year}|${f.season.week}`, f.stadiums || null); }
/** This week's game venue for the player, or null on a bye or when there is no game. */
export function sundayVenue(f) {
  const po = playoffFixture(f); if (po) return { ...gameVenue(f, po.home, po.away), home: po.home, away: po.away };
  const fx = currentFixture(f); if (!fx || fx.bye) return null;
  const home = fx.home ? f.club : fx.opponent; const away = fx.home ? fx.opponent : f.club; return { ...gameVenue(f, home, away), home, away };
}
export function leagueStandings(f) { return standings(f.season.records); }

/** Where the club stands in the playoff race (conference seed or games back). */
export function playoffPicture(f) {
  const st = leagueStandings(f); const conf = conferenceFor(divisionOf(f.club));
  const c = st.conferences[conf]; const seed = c.seeds.indexOf(f.club);
  const divLeader = st.divisions[divisionOf(f.club)][0];
  if (seed >= 0) return { inPlayoffs: true, seed: seed + 1, text: `${$t('franchise.seed', { conf, seed: seed + 1, club: divLeader === f.club ? $t('franchise.division_leader') : $t('franchise.wild_card') })}` };
  const lastIn = c.seeds[c.seeds.length - 1]; const a = f.season.records[f.club], b = f.season.records[lastIn];
  const back = ((b.w - a.w) + (a.l - b.l)) / 2;
  return { inPlayoffs: false, seed: null, text: back <= 0 ? $t('franchise.on_the_bubble_tiebreakers_decide') : `${$t('franchise.games_back_of_the_last_playoff', { back, n: back })}` };
}
// ------------------------------------------------------------ Monster Career Injury History (GDD §50)
// A record of injuries, never a mechanic: read at fixed points of every league game for both clubs (src/franchise/injury-history.js).
const injuryClubTracked = (f, club) => club === f.club || hasLeague(f); // generated (v40) AI rosters change every season: no careers to record
function injuryContext(f, { home, away, week, playoff = false, round = null }) { return CP.gameIdOf({ year: f.season.year, week, playoff, round, home, away }); }
function injuriesBeforeGame(f, teams, g) {
  const gameId = injuryContext(f, g);
  for (const [club, roster, vs, chart] of teams) { if (!injuryClubTracked(f, club)) continue;
    const lineup = new Set(Object.entries(chart || {}).filter(([slot, id]) => id && slot !== 'K').map(([, id]) => id)); // injuries are rolled for these (progression.js)
    for (const { m, rec } of IH.beforeGame(f, roster, { gameId, club, vs, playoff: g.playoff, round: g.round, owner: club === f.club, lineup })) noteInjuryReturn(f, m, rec, club); }
}
function injuriesAfterGame(f, teams, g) {
  const gameId = injuryContext(f, g);
  for (const [club, roster, vs] of teams) { if (!injuryClubTracked(f, club)) continue;
    for (const { m, rec } of IH.afterGame(f, roster, { gameId, club, vs, playoff: g.playoff, round: g.round })) if (rec.src !== 'before' && IH.recordsOf(f, m.id).filter((r) => r.src !== 'before').length === 1) addEvent(m, { k: 'inj:first', t: 'injury', y: rec.y, w: rec.w, c: club, x: { type: rec.type, sev: rec.sev, vs: rec.vs || null } }); }
}
/** Career Timeline: back after missing 3+ games (shorter absences are routine and stay in the injury log only). */
function noteInjuryReturn(f, m, rec, club) { if (rec && rec.missed >= 3 && !rec.back?.off) addEvent(m, { k: `injback:${rec.k}`, t: 'injury-return', y: rec.back.y, w: rec.back.w, c: club, x: { missed: rec.missed, type: rec.type } }); }
/** Season end: the first full regular season a monster played every game (so missed none to injury), once per career. */
function injurySeasonEnd(f) {
  if (!IH.isTracking(f)) return; const H = f.injuryHistory; const s = f.season;
  if (H.since.y > s.year || (H.since.y === s.year && H.since.w > 1)) { IH.pruneLedger(f, s.year, (id) => !!findMonsterAnywhere(f, id)); return; } // tracking did not cover the whole season
  const games = (s.schedule || []).filter((g) => !g.bye).length || 9;
  const rosters = [[f.club, f.roster], ...(hasLeague(f) ? leagueClubs(f).map((c) => [c, clubRoster(f, c)]) : [])];
  for (const [club, roster] of rosters) for (const m of roster) if ((m.stats?.season?.year === s.year ? m.stats.season.reg?.games || 0 : 0) >= games) addEvent(m, { k: 'inj:fullseason', t: 'injury-free', y: s.year, c: club, x: { games } });
  IH.pruneLedger(f, s.year, (id) => !!findMonsterAnywhere(f, id));
}

// ------------------------------------------------------------ Captain Partnerships (GDD §27.4B)
// Four captains per club (two offense, two defense), named once a season and locked through the playoffs; chemistry by pair of
// monster ids, earned on the field (src/sim/partnership-play.js) and committed here after each game. Every club runs the same
// code: the owner's game, AI–AI games and the playoffs all attach the kickoff level the same way and commit the same way.
const captainName = (f, id) => findMonsterAnywhere(f, id)?.name || $t('franchise.a_former_captain');
function findMonsterAnywhere(f, id) { return f.roster.find((x) => x.id === id) || (hasLeague(f) ? f.league.monsters[id] || f.league.legends?.[id] || (f.league.waivers || []).find((x) => x.id === id) : null) || Object.values(f.pool || {}).flat().find((x) => x?.id === id) || null; }
/** Attach the club's active pairs (level fixed now) to a team about to play. Inactive feature: the team is untouched. */
function withCaptains(f, team, club) { if (team && CP.isActive(f)) { const p = CP.kickoffPartnership(f, club); if (p) team.partnership = p; } return team; }
/** Captain candidates for a club: the team as it would play now (base starters, package slots, bench). */
export function captainCandidates(f, club = f.club, year = f.season?.year) { return CP.candidatesFromTeam(club === f.club ? playerTeam(f) : aiTeam(f, club, year)); }
/** The suggested captains for a club now (the AI's choice, the owner's automatic pick and the "Suggested" badge). */
export function suggestedCaptains(f, club = f.club) { return CP.suggestCaptains(captainCandidates(f, club), { count: (a, b) => CP.chemistryCount(f, a, b) }); }
/** Resolve one club's season choice: the owner's valid pick side by side, the suggestion for anything missing or invalid. */
function resolveCaptains(f, club, year, ownerChoice) {
  const cands = captainCandidates(f, club, year); const count = (a, b) => CP.chemistryCount(f, a, b);
  const auto = CP.suggestCaptains(cands, { count });
  if (club !== f.club || !ownerChoice) return { choice: auto, reason: auto.reason, notes: [] };
  const notes = []; const choice = { offense: null, defense: null };
  const off = ownerChoice.offense ? CP.checkPick(cands, 'offense', ownerChoice.offense) : null; if (off?.ok) choice.offense = off.pair; else if (off) notes.push(`${$t('franchise.offense', { reason: off.reason })}`);
  const def = ownerChoice.defense ? CP.checkPick(cands, 'defense', ownerChoice.defense, { other: choice.offense ? [choice.offense.a, choice.offense.b] : [] }) : null; if (def?.ok) choice.defense = def.pair; else if (def) notes.push(`${$t('franchise.defense', { reason: def.reason })}`);
  const fill = CP.suggestCaptains(cands, { count, exclude: [choice.offense?.a, choice.offense?.b, choice.defense?.a, choice.defense?.b].filter(Boolean) });
  if (!choice.offense) choice.offense = fill.offense; if (!choice.defense) choice.defense = fill.defense;
  return { choice, reason: fill.reason, notes, auto: { offense: !off?.ok, defense: !def?.ok } };
}
/** Name captains for every club missing them this season. `ownerChoice` = { offense: [id, id], defense: [id, id] } or null. */
function nameAllCaptains(f, year, { ownerChoice = null, mode = 'auto' } = {}) {
  let owner = null;
  for (const club of ALL_TEAMS) {
    if (CP.captainsOf(f, club, year)) continue;
    const r = resolveCaptains(f, club, year, club === f.club ? ownerChoice : null);
    const entry = CP.nameCaptains(f, club, year, r.choice, { mode: club === f.club ? mode : 'auto', reason: r.reason });
    if (club === f.club) owner = { entry, notes: r.notes, auto: r.auto || { offense: true, defense: true } };
    for (const side of ['offense', 'defense']) { const p = entry[side]; if (!p) continue; for (const id of [p.a, p.b]) { const m = findMonsterAnywhere(f, id); if (m) addEvent(m, { k: `${`cap:${year}:${club}`}`, t: 'captain', y: year, c: club, x: { side, partner: id === p.a ? p.b : p.a, pname: captainName(f, id === p.a ? p.b : p.a), type: p.type } }); } }
  }
  CP.pruneLedger(f, year);
  return owner;
}
const pairText = (f, p) => `${captainName(f, p.a)} & ${captainName(f, p.b)} (${CP.PAIR_TYPES[p.type].label})`;
function announceCaptains(f, year, owner, how) {
  if (!owner) return;
  const e = owner.entry; const parts = ['offense', 'defense'].map((side) => (e[side] ? `${pairText(f, e[side])} on ${side}` : `${$t('franchise.no_partnership', { side, reason: e.reason?.[side] || $t('franchise.no_valid_pair') })}`));
  news(f, $P($L('franchise.captains_for', { year: yearOf(year) }), how ? ` (${how})` : '', `: `, parts.join('; '), `.`, owner.notes?.length ? ` ${owner.notes.join(' ')} ${$t('franchise.the_suggested_pair_was_used_instead')}` : ''), 'roster');
  addLeagueNews(f, [{ id: `${`${year}|${f.season?.week ?? 0}|captains|${f.club}`}`, year, week: f.season?.finished ? 0 : (f.season?.week ?? 0), kind: 'captains', tier: 'info', icon: '©', ...$P($L('franchise.name_their_captains', { club: f.club }), ` `, ['offense', 'defense'].filter((s) => e[s]).map((s) => pairText(f, e[s])).join(' and ') || $t('franchise.none_this_season'), `.`)}]);
}
/** A new season: every club names captains (the owner's offseason pick if still valid, else the suggestion). Never replaces. */
export function seasonCaptains(f, year = f.season.year) {
  if (isArchived(f)) return null;
  const pick = f.partnerships?.pick?.year === year ? f.partnerships.pick : null;
  if (f.partnerships?.pick) delete f.partnerships.pick;
  const owner = nameAllCaptains(f, year, { ownerChoice: pick, mode: pick ? 'offseason' : 'auto' });
  announceCaptains(f, year, owner, pick ? null : $t('franchise.chosen_automatically_no_captains_were_picked'));
  return owner?.entry || CP.captainsOf(f, f.club, year);
}
/** Before games are played: a season in progress without captains gets them (the initial selection, skipped, falls back here). */
export function ensureCaptains(f) {
  if (!f?.season || f.season.finished || isArchived(f)) return null;
  const year = f.season.year;
  if (ALL_TEAMS.every((c) => CP.captainsOf(f, c, year))) return CP.captainsOf(f, f.club, year);
  const first = !CP.captainsOf(f, f.club, year);
  const owner = nameAllCaptains(f, year, { mode: first ? 'initial-auto' : 'auto' });
  if (first) { f.partnerships.initial ||= { year, mode: 'auto' }; announceCaptains(f, year, owner, $t('franchise.chosen_automatically_before_the_game_the')); }
  return CP.captainsOf(f, f.club, year);
}
/** The one-time initial selection for a franchise that has none this season (an existing save, or a new franchise's first season). */
export function initialCaptainsDue(f) { return !!f?.season && !f.season.finished && !isArchived(f) && !CP.captainsOf(f, f.club, f.season.year); }
export function chooseInitialCaptains(f, choice = null) {
  if (!initialCaptainsDue(f)) return { ok: false, reason: $t('franchise.captains_for_this_season_are_already') };
  const year = f.season.year;
  if (choice) { const cands = captainCandidates(f); const off = CP.checkPick(cands, 'offense', choice.offense); if (!off.ok) return { ok: false, reason: `${$t('franchise.offense', { reason: off.reason })}` }; const def = CP.checkPick(cands, 'defense', choice.defense, { other: [off.pair.a, off.pair.b] }); if (!def.ok) return { ok: false, reason: `${$t('franchise.defense', { reason: def.reason })}` }; }
  const owner = nameAllCaptains(f, year, { ownerChoice: choice, mode: 'initial' });
  f.partnerships.initial = { year, mode: choice ? 'chosen' : 'suggested' };
  announceCaptains(f, year, owner, choice ? null : $t('franchise.the_suggested_captains'));
  return { ok: true, entry: owner?.entry || CP.captainsOf(f, f.club, year) };
}
/** The offseason pick for next season: checked now, checked again when the season starts. */
export function offseasonCaptainsOpen(f) { return !!f?.season?.finished && !isArchived(f); }
export function pickCaptains(f, choice) {
  if (!offseasonCaptainsOpen(f)) return { ok: false, reason: $t('franchise.captains_are_chosen_in_the_offseason') };
  const cands = captainCandidates(f); const off = CP.checkPick(cands, 'offense', choice?.offense); if (!off.ok) return { ok: false, reason: `${$t('franchise.offense', { reason: off.reason })}` };
  const def = CP.checkPick(cands, 'defense', choice?.defense, { other: [off.pair.a, off.pair.b] }); if (!def.ok) return { ok: false, reason: `${$t('franchise.defense', { reason: def.reason })}` };
  (f.partnerships ||= { v: 1, startedYear: f.season.year + 1, pairs: {}, captains: {}, credited: {} }).pick = { year: f.season.year + 1, offense: [off.pair.a, off.pair.b], defense: [def.pair.a, def.pair.b] };
  return { ok: true, pick: f.partnerships.pick, offense: off.pair, defense: def.pair };
}
/** Commit one finished game's chemistry (once per game id) and write the milestones. Returns the committed rows. */
function afterCaptainGame(f, game, { home, away, week, playoff = false, round = null }) {
  if (!game?.partners || !CP.isActive(f)) return [];
  const year = f.season.year;
  const rows = CP.commitGame(f, game, { year, gameId: CP.gameIdOf({ year, week, playoff, round, home, away }), clubs: { home, away } });
  for (const x of rows.filter((r) => r.levelUp)) {
    const name = CP.LEVEL_NAMES[x.to]; const mine = x.club === f.club;
    for (const id of [x.a, x.b]) { const m = findMonsterAnywhere(f, id); if (m && (x.to === 2 || x.to === 4)) addEvent(m, { k: `${`chem:${CP.pairKey(x.a, x.b)}:${x.to}`}`, t: 'chemistry', y: year, w: week, c: x.club, x: { level: x.to, partner: id === x.a ? x.b : x.a, pname: captainName(f, id === x.a ? x.b : x.a), type: x.type } }); }
    if (mine) news(f, $L('franchise.chemistry_reached_when_both_are_on', { captain: captainName(f, x.a), captain2: captainName(f, x.b), name, to: x.to }), 'win');
    if ((mine && (x.to === 2 || x.to === 4)) || (!mine && x.to === 4)) addLeagueNews(f, [{ id: `${year}|${week}|chem|${CP.pairKey(x.a, x.b)}|${x.to}`, year, week, kind: 'chemistry', tier: x.to === 4 ? 'notable' : 'info', icon: '🤝', ...$L('franchise.and_of_the_reach_chemistry', { captain: captainName(f, x.a), captain2: captainName(f, x.b), club: x.club, name }), mid: x.a, mname: captainName(f, x.a) }]);
  }
  return rows;
}
/** A captain left a club in season (released, traded, walked out): the partnership is inactive until he returns or next season. */
function noteCaptainLeft(f, club, m, how) {
  if (!CP.isActive(f) || !m || f.season?.finished) return;
  const c = CP.captaincyOf(f, club, m.id); if (!c) return;
  const year = f.season.year; const week = f.season.week;
  if (club === f.club) news(f, $L('franchise.was_a_captain_the_partnership_is', { name: m.name, label: CP.PAIR_TYPES[c.pair.type].label }), 'loss');
  addLeagueNews(f, [{ id: `${`${year}|${week}|capleft|${club}|${m.id}`}`, year, week, kind: 'captains', tier: 'info', icon: '©', ...$L('franchise.the_captain_their_partnership_is_inactive', { club, how: how === 'traded' ? 'traded' : $t('franchise.parted_with'), name: m.name, label: CP.PAIR_TYPES[c.pair.type].label }), mid: m.id, mname: m.name }]);
}
/** AI–AI deals (and AI clubs dealing a monster to the owner) that move a captain. */
function noteCaptainTrades(f, deals) { for (const d of deals || []) { if (d.toA) noteCaptainLeft(f, d.B, findMonsterAnywhere(f, d.toA), 'traded'); if (d.toB) noteCaptainLeft(f, d.A, findMonsterAnywhere(f, d.toB), 'traded'); } }
/** One side's partnership as the owner sees it this week (active, or why not). */
export function captainStatus(f, side, club = f.club) {
  const team = club === f.club ? playerTeam(f) : aiTeam(f, club);
  const lineupIds = Object.values(team[side] || {}).filter((p) => p?.id && !p.borrowed).map((p) => p.id);
  const roster = club === f.club ? f.roster : clubRoster(f, club);
  return CP.sideStatus(f, club, side, { rosterIds: roster.map((m) => m.id), lineupIds, injured: roster.filter((m) => m.injury).map((m) => m.id) });
}

/** Simulate every other game of the current week with the real engine. */
/** League-wide per-monster season stats (all 16 clubs) for award races. */
function simulateLeagueWeek(f) {
  const { r, save } = frng(f);
  ensureCaptains(f); // Captain Partnerships (GDD §27.4B): a season without captains yet gets them before its next games
  if (hasLeague(f)) { const deals = aiTrades(f, r, { year: f.season.year, cap: tierById(f.tier).cap, window: 'season' }); noteCaptainTrades(f, deals); }
  if (hasLeague(f) && hasFreeAgency(f) && f.season.week === EXTENSION_WEEK) { const st = (f.freeAgency.steps[f.season.year] ||= {}); if (!st.midExt) { st.midExt = aiExtensions(f); } } // R6: the mid-season extension window, once // weeks 2–8: an occasional deal between AI clubs (GDD §46); a traded captain leaves his partnership inactive
  const fixtures = leagueSeasonFixtures(f.season.year).find((w) => w.week === f.season.week);
  const results = [];
  if (fixtures && !fixtures.bye) {
    for (const g of fixtures.games) {
      if (g.home === f.club || g.away === f.club) continue;
      const home = withCaptains(f, aiTeam(f, g.home), g.home), away = withCaptains(f, aiTeam(f, g.away), g.away);
      const ig = { home: g.home, away: g.away, week: f.season.week }; const it = [[g.home, home.roster, g.away, home.chart], [g.away, away.roster, g.home, away.chart]];
      injuriesBeforeGame(f, it, ig); // Injury History (GDD §50): who misses this game
      const toss = leaguePregame(f, r, home, away);
      const game = playGame({ home, away, venue: gameVenue(f, home.name, away.name), seed: r.seed(), quarterLength: 180, comeback: comebackRule(f), coinWinner: toss.coinWinner, choice: toss.choice, otPeriods: OT_PERIODS, statusCarry: toss.statusCarry || null });
      leagueTiebreak(f, r, home, away, game);
      aiAfterGame(f, home, game, 'home', r); aiAfterGame(f, away, game, 'away', r); // persistent rosters develop as they play (GDD §42.6, decision B)
      injuriesAfterGame(f, it, ig);
      const lines = new Map(); recordGame(f, game, { home, away }, { playoff: false, booksFor: (t) => leagueBooks(f, t), onLine: (t, m, g) => lines.set(m.id, g) });
      leagueCareerAfterGame(f, [home, away], game, lines, { playoff: false });
      afterCaptainGame(f, game, { home: g.home, away: g.away, week: f.season.week });
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
/**
 * How a monster would fit THIS roster's depth at his position (v42.11): `kind` 'need' (an empty starting spot), 'starter' (better than
 * your weakest healthy starter), 'depth' (you have exactly the starters and no backup), or null (the position is covered);
 * `side` 'offense' | 'defense' | 'special'. Pass `ovr: null` when his overall is not known (a prospect not fully scouted): then
 * only the position's need counts. Free agency and the draft colour cards by this.
 */
export function positionFit(f, m, { ovr = monsterOverall(m) } = {}) {
  const pos = m.position; const n = GROUP_SLOTS[pos]?.length || 1;
  const side = OFFENSE_GROUPS.includes(pos) ? 'offense' : DEFENSE_GROUPS.includes(pos) ? 'defense' : 'special';
  const mine = f.roster.filter((x) => x.position === pos && x.id !== m.id && !x.injury).map(monsterOverall).sort((a, b) => b - a);
  if (mine.length < n) return { side, kind: 'need', position: pos, text: mine.length ? `${$t('franchise.fills_an_open_starting_spot_at', { pos, n: mine.length, n2: n })}` : `${$t('franchise.you_have_nobody_at_he_would', { pos })}` };
  if (ovr != null && ovr > mine[n - 1]) return { side, kind: 'starter', position: pos, text: `${$t('franchise.would_start_at_better_than_your', { pos, mine: mine[n - 1] })}` };
  if (mine.length === n) return { side, kind: 'depth', position: pos, text: `${$t('franchise.depth_at_you_have_no_healthy', { pos })}` };
  return { side, kind: null, position: pos, text: `${$t('franchise.is_covered_healthy_starters', { pos, n: mine.length })} ${mine.slice(0, n).join(' / ')} ${$t('franchise.ovr')}` };
}
/** The positions the owner should look for, worst first: open starting spots, then positions with no backup. */
export function ownerNeeds(f) { return depthNeeds(f).filter((n) => n.status !== 'ok').map((n) => ({ ...n, side: OFFENSE_GROUPS.includes(n.position) ? 'offense' : DEFENSE_GROUPS.includes(n.position) ? 'defense' : 'special' })); }
export function scoutRegion(f, regionName, { focus = null } = {}) {
  if (f.season.day !== 0) return { ok: false, reason: $t('franchise.not_monday') };
  if (draftWindow(f)) return { ok: false, reason: $t('franchise.no_region_scouting_from_the_final') };
  const region = REGIONS[regionName]; if (!region) return { ok: false, reason: $t('franchise.unknown_region') };
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
    // N7c B17: the scouting channel's Basic share (a Basic of the region's elements); otherwise the rarity-weighted pick as before.
    const regionBasics = SPECIES_DEX.filter((x) => x.rarity === 'basic' && region.types.includes(x.element));
    let sp; if (regionBasics.length && r.next() < BASIC_SHARE.scouting) sp = regionBasics[r.int(regionBasics.length)]; else { const pickId = r.weighted(weights); sp = pool.find((x) => x.id === pickId); }
    const position = sp.position; // one position per species (Task 7 D6)
    const quality = 52 + r.int(12) + (skill >= 80 ? 3 : 0) + (sp.rarity === 'legendary' ? 8 : sp.rarity === 'rare' ? 3 : sp.rarity === 'uncommon' ? 1 : 0);
    const m = generateMonster(r, { position, quality, species: sp.id, metric: 'potential' }); claimMonster(f, m, 'scout'); // N7f: recruits are prospects
    uniqueName(f, m, prospects.map((p) => p.monster.name));
    dexRecord(f, m, 'seen');
    const revealed = Math.min(6, (skill >= 85 ? 6 : skill >= 65 ? 4 : skill >= 40 ? 2 : 1) + (ownerPerk(f) === 'scouting' ? 1 : 0));
    prospects.push({ monster: m, revealed, natureKnown: skill >= 70, potentialKnown: skill >= 55 });
  }
  // The scout also goes looking for the position you need: the one you asked for, else the shortest-handed, else one with no backup (GDD §17.6).
  const needs = depthNeeds(f); const needList = focus ? [focus] : needs.filter((n) => n.status !== 'ok').map((n) => n.position);
  const need = needList.find((pos) => !prospects.some((p) => p.monster.position === pos)) || null;
  const needPool = need ? pool.filter((sp) => sp.position === need) : [];
  if (need && needPool.length) {
    const sp = pickChannelSpecies(r, 'scouting', need, { originals: needPool.filter((x) => x.rarity !== 'legendary'), basics: basicsFor(need, region.types), pickOriginal: (rr, list) => list[rr.int(list.length)] }) || needPool[r.int(needPool.length)];
    const m = generateMonster(r, { position: need, quality: 50 + r.int(10), species: sp.id }); claimMonster(f, m, 'scout-need'); // N7f: a need now, so current strength
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
  return { ok: true, prospects, skill, scout: scout?.name || $t('franchise.your_scout'), need };
}
export const RECRUIT_APPROACHES = Object.freeze([
  { id: 'development', label: $t('franchise.offer_development'), text: $t('franchise.promise_a_plan_to_grow_their'), weight: { young: 0.25 } },
  { id: 'facilities', label: $t('franchise.showcase_facilities'), text: $t('franchise.show_off_the_training_complex'), weight: { strong: 0.2 } },
  { id: 'playing_time', label: $t('franchise.promise_playing_time'), text: $t('franchise.a_starting_role_right_away'), weight: { need: 0.3 } },
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
  return { needed: true, reason: `${$t('franchise.roster_is_full', { rosterMax: ROSTER_MAX })}`, list, capWarning: salarySummary(f, m.salary).over };
}
export function recruit(f, prospectIndex, approachId, { releaseId = null } = {}) {
  if (f.season.day !== 1) return { ok: false, reason: $t('franchise.not_tuesday') };
  if (draftWindow(f)) return { ok: false, reason: $t('franchise.no_signings_from_the_final_week') };
  const p = f.week.prospects[prospectIndex]; if (!p) return { ok: false, reason: $t('franchise.no_such_prospect') };
  // Tuesday Monster Encounters (GDD §26.1): a pitch is the consolation after a lost battle, once, for the monster you fought.
  const enc = f.week.encounter;
  if (!enc || enc.status !== 'pitch') return { ok: false, reason: enc?.status === 'offer' ? $t('franchise.they_already_want_to_sign_accept') : $t('franchise.battle_the_monster_first_a_win') };
  if (enc.prospectIndex !== prospectIndex) return { ok: false, reason: $t('franchise.only_the_monster_you_battled_will') };
  if (f.week.recruitAttempts >= 1) return { ok: false, reason: $t('franchise.no_attempts_left_this_week') };
  const m = p.monster;
  const rc = releaseCandidates(f, p);
  if (rc.needed && !releaseId) return { ok: false, reason: rc.reason, needRelease: true };
  if (rc.needed) { const cand = rc.list.find((c) => c.id === releaseId); if (!cand) return { ok: false, reason: $t('franchise.that_monster_cannot_be_released') }; }
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
  if (success) { const blocked = recruitBlock(f, p, rc.needed ? releaseId : null); if (blocked) { enc.status = 'offer'; return { ok: true, success: true, signed: false, ...blocked }; } enc.status = 'signed'; return { ok: true, success: true, ...signProspect(f, p, rc.needed ? releaseId : null) }; } // Task 7 D5: a won pitch keeps its reward; a blocked signing waits as an offer
  enc.status = 'walked'; f.season.day = 2; return { ok: true, success: false, final: true };
}
/**
 * Task 7 (D4, D5): what keeps a won recruit from signing on his terms now (the shared rules: the legendary limit, a lock, usable cap),
 * or null. The reward is kept: he accepts his ask at his preferred term, and the offer waits while the owner makes room.
 */
function recruitTerms(f, m) { const a = askOf(f, m); return { salary: a.salary, years: a.years, bonus: 0 }; }
function recruitBlock(f, p, releaseId) {
  if (!hasFreeAgency(f) || !hasLeague(f)) return null;
  const m = p.monster; const out = releaseId ? f.roster.find((x) => x.id === releaseId) : null;
  if (out) f.roster = f.roster.filter((x) => x !== out);
  try { const b = faBlocker(f, f.club, m, recruitTerms(f, m), { final: true, newSpot: false }); return b ? { reason: b.reason, code: b.code } : null; }
  finally { if (out) f.roster.push(out); }
}
/** Add a prospect to the roster: the release (if one was chosen), a two-season contract, salary, dex and news. Shared by the battle offer and the pitch. */
function signProspect(f, p, releaseId) {
  const m = p.monster;
  if (hasFreeAgency(f) && hasLeague(f)) return signProspectTask7(f, p, releaseId);
  if (releaseId) { const out = f.roster.find((x) => x.id === releaseId); if (out) { f.roster = f.roster.filter((x) => x.id !== releaseId); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === releaseId) delete f.lineupManual[slot]; news(f, $L('franchise.released_to_make_room_for', { name: out.name, name2: m.name }), 'roster'); } }
  m.contract = newContract(f.season.year); m.origin = m.origin || f.week.region; m.salary = m.salary || salaryFor(m);
  if (p.fromPool) { for (const list of Object.values(f.pool || {})) { const i = list.indexOf(m); if (i >= 0) list.splice(i, 1); } }
  uniqueName(f, m); m.joined = f.season.year; backfillCareer(f, m); noteJoin(f, m, 'encounter', f.week.region ? { region: f.week.region } : {}); f.roster.push(m); dexRecord(f, m, 'signed'); f.week.recruited = m.id; f.week.prospects = []; f.season.day = 2;
  news(f, $L('franchise.ovr_signed_from', { name: m.name, position: m.position, monsterOverall: monsterOverall(m), region: f.week.region }), 'roster', { mid: m.id, mname: m.name });
  const cap = salarySummary(f);
  if (cap.over) news(f, $L('franchise.over_the_salary_cap_by_cr_2', { toLocaleString: Math.round(-cap.remaining).toLocaleString('en-US') }), 'loss');
  return { monster: m, overCap: cap.over };
}
/** Task 7: the recruit signs through the shared transaction (his ask, his preferred term: the Beast Clash reward, D5). */
function signProspectTask7(f, p, releaseId) {
  const m = p.monster;
  if (releaseId) { const out = f.roster.find((x) => x.id === releaseId); if (out) { f.roster = f.roster.filter((x) => x.id !== releaseId); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === releaseId) delete f.lineupManual[slot]; toPool(f, out, 'released'); noteReleased(f, out, f.club); news(f, $L('franchise.released_to_make_room_for', { name: out.name, name2: m.name }), 'roster'); } }
  m.origin = m.origin || f.week.region;
  if (!unsignedFA(f, m.id)) (f.freeAgency.extra ||= []).push(m); // a prospect met on the road joins through the same market transaction
  const s = signFA(f, f.club, m.id, recruitTerms(f, m), { via: 'encounter' });
  if (!s.ok) { f.freeAgency.extra = (f.freeAgency.extra || []).filter((x) => x !== m); return { monster: null, signed: false, reason: s.reason }; }
  f.week.recruited = m.id; f.week.prospects = []; f.season.day = 2;
  return { monster: m, overCap: false };
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
  const line = autoLineup(f.roster, CLASH_SIZE.encounter, hashString(`${`${f.seed}|enc|${f.season.year}|${f.season.week}`}`));
  return line.length ? line.reduce((a, m) => a + monsterOverall(m), 0) / line.length : 0;
}
/**
 * N7g Basic scouting encounter XP bonus: active when the recruitable target (the prospect, never a companion) is a Basic. It applies
 * on a win, whether or not he is then recruited; +pct level XP for every eligible participant; never training progress or mastery.
 */
export function basicEncounterBonus(target) {
  const pct = approvedRule('basic-encounter-xp-bonus').values.levelXpBonusPct;
  const active = !!target && !target.companion && resolveSpecies(target).rarity === 'basic';
  return { active, pct, onWin: true, label: `${$t('franchise.basic_encounter_bonus_level_xp', { pct })}` };
}
/** The most prior seasons a wild companion is given while matching the club (its legal development limit, with level 50). */
export const COMPANION_MAX_SEASONS = 12;
export function encounterCompanions(f, prospectIndex, n = CLASH_SIZE.encounter - 1, rule = COMPANION_RULE) {
  const p = f.week.prospects[prospectIndex]; if (!p || n <= 0) return [];
  const r = createRng(hashString(`${`${f.seed}|companions|${f.season.year}|${f.season.week}|${prospectIndex}`}`));
  const regionName = f.week.region && REGIONS[f.week.region] ? f.week.region : Object.keys(REGIONS)[0];
  const pool = regionSpecies(regionName, REGIONS[regionName].types, f.season.week).filter((sp) => sp.rarity !== 'legendary');
  const S = clubBattleStrength(f); const R = { ...COMPANION_RULE, ...rule }; const out = [];
  for (let i = 0; i < n; i++) {
    // N7c B17: the encounter channel's 30% Basic share applies to companions (owner 2026-11-07); strength matching is best-effort
    // within legal development limits, so a Basic companion may stay below the target (easier encounters are acceptable).
    const wildBasics = SPECIES_DEX.filter((x) => x.rarity === 'basic' && REGIONS[regionName].types.includes(x.element));
    const sp = wildBasics.length && r.next() < BASIC_SHARE.encounter ? wildBasics[r.int(wildBasics.length)] : (pool[r.int(pool.length)] || pool[0]);
    // The wild group as a whole (prospect + companions) is matched to the club: S − gap on average. Companions make up for a weak
    // or strong prospect, but never fight above the club's own battle strength.
    const base = (CLASH_SIZE.encounter * (S - R.gap) - monsterOverall(p.monster)) / (CLASH_SIZE.encounter - 1);
    const target = Math.max(R.floor, Math.min(R.ceiling, Math.round(S), Math.round(base + (r.next() * 2 - 1) * R.spread)));
    // generateMonster's quality is only roughly the overall a position and species end up with: re-roll the same monster
    // (same seed) with a corrected quality until its overall is within a point of the target.
    const seed = r.seed(); let q = target, m = null; // eslint-disable-line prefer-const
    // Task 8: the quality maps to a percentile of a level-1 form, so a wild companion is given the approved prior-career history
    // (B7: natural growth, training, evolution) for as many seasons as it takes to reach the target, then the quality is corrected
    // from above, all from the same seed (one Apex roll). Matched to the club's battle strength, best-effort within legal limits (owner 2026-11-07).
    const gen = (qq, y) => generateMonster(createRng(seed), { position: sp.position, quality: qq, species: sp.id, id: `wild_${f.season.year}_${f.season.week}_${prospectIndex}_${i}`, age: 21 + y, yearsPro: y, channel: 'encounter' });
    let y = 0; m = gen(q, 0);
    while (monsterOverall(m) < target - 1 && y < COMPANION_MAX_SEASONS && m.dev.level < 50) { y += 1; m = gen(q, y); }
    for (let k = 0; k < 4 && monsterOverall(m) > target + 1 && !m.dev.apex; k++) { q -= monsterOverall(m) - target; m = gen(q, y); }
    m.companion = true; m.name = `${$t('franchise.wild', { species: speciesName(m) })}`; out.push(m);
  }
  return out;
}
export function encounterPreview(f, prospectIndex) {
  const p = f.week.prospects[prospectIndex]; if (!p) return { ok: false, reason: $t('franchise.no_such_prospect') };
  const eligible = eligibleBattlers(f.roster);
  const size = Math.min(CLASH_SIZE.encounter, eligible.length);
  if (size < 1) return { ok: false, reason: $t('franchise.nobody_healthy_enough_to_battle_this'), eligible, size: 0 };
  const wild = [p.monster, ...encounterCompanions(f, prospectIndex, size - 1)];
  return { ok: true, eligible, size, wild, basicBonus: basicEncounterBonus(p.monster), lineup: autoLineup(f.roster, size, hashString(`${`${f.seed}|enc|${f.season.year}|${f.season.week}`}`)) };
}
/** Enter the encounter: draw the battle seed once and fix the lineup (yours in the order given; the wild side is the monster you chose plus the others the scout found). */
export function startEncounter(f, prospectIndex, { lineup = null, mode = 'watch' } = {}) {
  if (f.season.day !== 1) return { ok: false, reason: $t('franchise.not_tuesday') };
  if (draftWindow(f)) return { ok: false, reason: $t('franchise.no_encounters_from_the_final_week') };
  if (f.week.encounter && f.week.encounter.status !== 'ready') return { ok: false, reason: $t('franchise.one_encounter_per_tuesday') };
  const pv = encounterPreview(f, prospectIndex); if (!pv.ok) return pv;
  const eligibleIds = new Set(pv.eligible.map((m) => m.id));
  let mine = (lineup || pv.lineup.map((m) => m.id)).filter((id, i, arr) => eligibleIds.has(id) && arr.indexOf(id) === i).slice(0, pv.size);
  if (mine.length < 1) return { ok: false, reason: $t('franchise.pick_at_least_one_healthy_monster') };
  const size = Math.min(pv.size, mine.length);
  const { r, save } = frng(f); const seed = r.seed(); save();
  const wild = pv.wild.slice(0, size);
  // Task 8 M4 (S12): a version-2 record on the t8 engine (standalone context: statuses clear at the end, D12). Watch prompts the player's
  // rotations (policy 'manual', D1); Skip and staff auto-run use the AI policy (D2). The wild side is always the AI.
  f.week.encounter = { prospectIndex, seed, size, mine, wild: wild.map((m) => m.id), a: mine.map((id) => snapMonster(f.roster.find((m) => m.id === id))), b: wild.map((m) => snapMonster(m)), ...newBattleRecord({ occasion: 'encounter', mode }) };
  return { ok: true, encounter: f.week.encounter };
}
/** Rebuild the encounter's battle from the save (deterministic): the result the screen shows, or replays. A pending t8 result waits at the player's rotation prompt. */
export function encounterBattle(f, { log = 'full' } = {}) {
  const e = f.week.encounter; if (!e || !e.seed) return null;
  upgradeUnresolvedRecord(e); // D19: an unresolved pre-M4 record plays on t8 from here; finished ones keep their legacy replay
  const a = e.a || e.mine.map((id) => f.roster.find((m) => m.id === id)).filter(Boolean);
  const byId = new Map(f.week.prospects.map((p) => [p.monster.id, p.monster]));
  const b = e.b || e.wild.map((id) => byId.get(id)).filter(Boolean);
  if (!a.length || !b.length) return null;
  return runRecord(e, { a, b, log });
}
/** Task 10: the encounter's live continuous battle (Watch), or null (Skip, finished, legacy). See clash-link.js recordSession. */
export function encounterSession(f) {
  const e = f.week.encounter; if (!e || !e.seed) return null;
  upgradeUnresolvedRecord(e);
  const a = e.a || e.mine.map((id) => f.roster.find((m) => m.id === id)).filter(Boolean);
  const byId = new Map(f.week.prospects.map((p) => [p.monster.id, p.monster]));
  const b = e.b || e.wild.map((id) => byId.get(id)).filter(Boolean);
  return recordSession(e, { a, b });
}
/**
 * The player's answer at a rotation prompt (t8, D1): a reserve's id, 'stay' or 'auto' ("Auto for the rest of this battle"). Legacy
 * 'play' records keep the old swap answer ('stay' is recorded for this exchange and the next three).
 */
export function encounterDecide(f, ex, choice) {
  const e = f.week.encounter; if (!e || e.status !== 'battle') return { ok: false, reason: $t('franchise.no_battle_in_progress') };
  if (isT8Record(e)) return recordDecision(e, ex, choice) ? { ok: true } : { ok: false, reason: $t('franchise.not_a_legal_rotation_decision') };
  if (choice === 'stay') for (let k = 0; k < SWAP_EVERY; k++) e.decisions[ex + k] = 'stay'; else e.decisions[ex] = choice;
  return { ok: true };
}
/** A record whose player side still waits at a prompt: headless settlement answers 'auto' (D1) and the AI finishes it; otherwise the open prompt is reported. */
function battleOrPending(e, run, headless) {
  let result = headless ? settleHeadless(e, run) : run(); if (!result) return { reason: $t('franchise.the_battle_could_not_be_rebuilt') };
  const pend = isT8Record(e) ? (result.pending ? pendingDecision(result) : null) : (policiesOf(e).a === 'manual' ? pendingDecision(result) : null);
  if (pend) return { reason: isT8Record(e) ? $t('franchise.a_rotation_decision_is_still_open') : $t('franchise.a_swap_decision_is_still_open'), pending: pend };
  return { result };
}
/** Settle the battle: record the summary, pay out XP and fatigue, and open the offer (win) or the pitch (loss). Idempotent. `headless` settles an open prompt with Auto (staff, Skip). */
export function resolveEncounter(f, { headless = false } = {}) {
  const e = f.week.encounter; if (!e) return { ok: false, reason: $t('franchise.no_encounter') };
  if (e.status !== 'battle') return { ok: true, encounter: e, already: true };
  const bp = battleOrPending(e, () => encounterBattle(f), headless); if (!bp.result) return { ok: false, ...bp }; const result = bp.result;
  const { r, save } = frng(f);
  // N7g: winning against a Basic recruitable target adds the Basic encounter bonus (level XP only), once per encounter via the ledger
  const bonus = basicEncounterBonus(f.week.prospects[e.prospectIndex]?.monster); const winBonus = result.winner === 'a' && bonus.active ? bonus.pct : 0;
  const activityId = `${`encounter:${f.season.year}:w${f.season.week}:p${e.prospectIndex}`}`;
  const events = applyBattleEffects(f.roster, result, 'a', 'encounter', r, { autoSpend: !!f.settings.autoPoints, bonusPct: winBonus, bonusLabel: bonus.label, ledger: (f.rewardLedger ||= createRewardLedger()), activityId });
  save(); e.bonus = winBonus ? { pct: winBonus, label: bonus.label } : null;
  e.result = battleSummary(result); e.events = events;
  if (isT8Record(e)) { e.carryOut = carryOutOf(result); e.mastery = masteryRecord(result, `clash:${activityId}`); } // standalone: nothing carries (D12); execution counts kept per cap scope (M5 awards)
  const won = result.winner === 'a'; e.status = won ? 'offer' : 'pitch';
  const p = f.week.prospects[e.prospectIndex];
  news(f, won ? $L('franchise.beast_clash_won_wants_to_join', { name: p.monster.name, club: f.club }) : $L('franchise.beast_clash_lost_to_one_pitch', { name: p.monster.name }), won ? 'win' : 'info');
  return { ok: true, encounter: e, won, result, events };
}
/** After a won encounter: sign the monster (the usual roster-limit and cap rules apply) or let it go. */
export function acceptOffer(f, { releaseId = null } = {}) {
  const e = f.week.encounter; if (!e || e.status !== 'offer') return { ok: false, reason: $t('franchise.no_offer_on_the_table') };
  const p = f.week.prospects[e.prospectIndex]; if (!p) return { ok: false, reason: $t('franchise.no_such_prospect') };
  const rc = releaseCandidates(f, p);
  if (rc.needed && !releaseId) return { ok: false, reason: rc.reason, needRelease: true };
  if (rc.needed && !rc.list.find((c) => c.id === releaseId)) return { ok: false, reason: $t('franchise.that_monster_cannot_be_released') };
  { const blocked = recruitBlock(f, p, rc.needed ? releaseId : null); if (blocked) return { ok: false, ...blocked }; } // Task 7 (D4, D5): the offer stays on the table while the club makes the signing legal
  const out = signProspect(f, p, rc.needed ? releaseId : null);
  if (out.signed === false) return { ok: false, reason: out.reason }; /* the offer stays on the table */
  e.status = 'signed';
  return { ok: true, success: true, ...out };
}
/** Let the monster go: after a win (turn down its offer) or after a loss (skip the one pitch). Nothing else changes. */
export function declineOffer(f) {
  const e = f.week.encounter; if (!e || (e.status !== 'offer' && e.status !== 'pitch')) return { ok: false, reason: $t('franchise.no_offer_on_the_table') };
  e.status = 'declined'; f.season.day = 2; f.week.prospects = [];
  return { ok: true };
}
const scaledBonus = (b, k) => b && Object.fromEntries(Object.entries(b).map(([a, v]) => [a, Math.max(1, Math.round(v * k))]));
/** Practice intensity: bigger boosts cost more injury risk. */
export const INTENSITIES = Object.freeze({
  light: { label: 'Light', factor: 0.5, risk: 0.01, success: 0.06, fatigue: 4, text: $t('franchise.walk_through_small_boost_almost_no') },
  normal: { label: 'Normal', factor: 1, risk: 0.04, success: 0, fatigue: 8, text: $t('franchise.a_regular_practice_8_fatigue') },
  full: { label: $t('franchise.full_pads'), factor: 1.6, risk: 0.09, success: -0.05, fatigue: 14, text: $t('franchise.big_boost_real_injury_risk_14') },
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
export function skipToByeIfIdle(f) { if (isBye(f) && f.season.day >= 3 && f.season.day < 6) { f.season.day = 6; news(f, $L('franchise.bye_week_no_opponent_no_game'), 'info'); return true; } return false; }
export function setTraining(f, focus, intensity = 'normal') {
  if (f.season.day !== 2) return { ok: false, reason: $t('franchise.not_wednesday') };
  if (!TRAINING_FOCI[focus]) return { ok: false, reason: $t('franchise.unknown_focus') };
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
    if (m) { const severity = r.chance(0.8) ? 'Minor' : 'Moderate'; const weeks = severity === 'Minor' ? 1 : 2; m.injury = { severity, weeks, type: r.pick(['hamstring', 'ankle', 'shoulder', 'wrist']) }; injury = { id: m.id, name: m.name, severity, weeks }; news(f, $L('franchise.hurt_in_practice_out_weeks', { name: m.name, severity, weeks, n: weeks }), 'injury'); }
  }
  save();
  practiceFatigue(f.roster, intensity);
  (f.trainingHistory ||= []).push(focus); if (f.trainingHistory.length > 12) f.trainingHistory.shift();
  f.week.trainingFocus = success ? focus : null; f.week.trainingFactor = odds.factor;
  if (hasLeague(f)) { const tr = staffMember(f, 'monster_trainer'); noteStaffTraining(f, f.season.year, { success, amount: odds.amount, odds, focus, trainer: tr, bonusOf: (t, fc) => Object.values(trainingBonus(t, fc) || {})[0] || 1 }); }
  f.week.training = { focus, intensity, success, injury, amount: odds.amount, fatigue: (INTENSITIES[intensity] || INTENSITIES.normal).fatigue }; f.rattled = false;
  f.season.day = 3; skipToByeIfIdle(f);
  return { ok: true, success, injury, amount: odds.amount, streak: odds.streak };
}
/**
 * Skip Wednesday (QoL update): straight to Thursday with nothing gained and nothing lost. No practice is run, so there is no boost,
 * no fatigue, no injury roll, no random draw at all, no entry in the training history (a skipped week neither extends nor counts
 * toward a "same focus" streak) and no staff record. Only once: after it the day is no longer Wednesday.
 */
export function skipTraining(f) {
  if (f.season.day !== 2) return { ok: false, reason: $t('franchise.not_wednesday') };
  f.week.trainingFocus = null; f.week.trainingFactor = null; f.week.training = null; f.week.trainingSkipped = true;
  f.season.day = 3; skipToByeIfIdle(f);
  return { ok: true, skipped: true };
}
export function scoutOpponent(f, side) {
  if (f.season.day !== 3) return { ok: false, reason: $t('franchise.not_thursday') };
  if (isBye(f)) return { ok: false, reason: $t('franchise.bye_week_nobody_to_scout') };
  const opp = opponentName(f);
  let report = null;
  if (opp) {
    const team = aiTeam(f, opp, undefined, { scouting: playerProfile(f, { opponent: opp }) }); // the same six they will bring on Sunday
    const str = teamStrengths(team);
    // Star = best starter by positional overall (the same rating shown everywhere else).
    const byId = Object.fromEntries(team.roster.map((m) => [m.id, m]));
    const best = (slots) => slots.map((slot) => ({ slot, m: byId[team.chart[slot]] })).filter((x) => x.m).map(({ slot, m }) => ({ slot, id: m.id, name: m.name, ovr: monsterOverall(m, { slotPosition: positionOf(slot) }) })).sort((a, b) => b.ovr - a.ovr)[0];
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
  if (o.length !== PLAN_SIZE || d.length !== PLAN_SIZE) return { ok: false, reason: `${$t('franchise.pick_exactly_offensive_and_defensive_plays', { planSize: PLAN_SIZE, planSize2: PLAN_SIZE })}` };
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
/** The facts franchise.js knows that the press module reads (src/franchise/press.js). */
function pressHelp(f) {
  const m = sundayMatchup(f); const hurt = f.roster.filter((x) => x.injury).filter((x) => { const healthy = f.roster.filter((y) => y.position === x.position && !y.injury).map(monsterOverall); return !healthy.length || monsterOverall(x) >= Math.max(...healthy) - 3; }).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0] || null;
  return { matchup: m, record: record(f), streak: streakOf(f), hotseat: onHotSeat(f), star: mediaStar(f), injured: hurt, playoffLive: !f.season.finished && inPlayoffs(f) && !!playoffFixture(f), isLegend: (x) => !!x.legendary || (() => { try { return resolveSpecies(x)?.rarity === 'legendary'; } catch { return false; } })() };
}
/**
 * Saturday's three questions (Media Day comedy overhaul): one recurring reporter each where possible, up to two about what is
 * really happening at the club (read from saved data), every question with four answers (Professional, Trash Talk, Comedy,
 * Unhinged). Chosen once per week and kept in the save; choosing them uses no franchise dice.
 */
export function mediaQuestions(f) {
  const facts = pressFacts(f, pressHelp(f));
  if (!Array.isArray(f.week.mediaQs) || f.week.mediaQs.length !== PRESS_PER_WEEK || f.week.mediaQs.some((id) => !pressQuestion(id))) { // also replaces a list kept by a save from before the overhaul
    f.season.mediaAsked = (f.season.mediaAsked || []).filter((x) => typeof x === 'string');
    const generic = PRESS_QUESTIONS.filter((q) => !q.when).length; if (f.season.mediaAsked.filter((id) => !pressQuestion(id)?.when).length > generic - PRESS_PER_WEEK) f.season.mediaAsked = f.season.mediaAsked.filter((id) => pressQuestion(id)?.when); // a very long season: the generic questions come round again
    f.week.mediaQs = pickQuestions(f, facts, f.season.mediaAsked); f.season.mediaAsked.push(...f.week.mediaQs);
  }
  return f.week.mediaQs.map((id) => fillQuestion(id, facts));
}
function mediaStar(f) { return f.roster.filter((m) => !m.injury).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0] || null; }
function streakOf(f) { let n = 0; for (const g of f.season.schedule.filter((x) => x.result && !x.bye).reverse()) { const won = !!g.result.won; if (n === 0) n = won ? 1 : -1; else if ((n > 0) === won) n += won ? 1 : -1; else break; } return n; }
/**
 * Answers: one answer index per question (0 Professional, 1 Trash Talk, 2 Comedy, 3 Unhinged). The only gameplay effects are the
 * two that existed before the overhaul: `hype` (trash talk before the rival game: the risky whole-team lift) and `star` (one
 * monster in the spotlight). Everything else an answer does is narrative (the press's memory and tomorrow's headline).
 */
export function answerMedia(f, answers) {
  const qs = mediaQuestions(f); const facts = pressFacts(f, pressHelp(f)); const boosts = {}; // nature boosts retired (N7c B14)
  const out = settlePress(f, facts, qs, answers, mediaStar(f)?.id || null);
  f.week.media = { answers, boosts, hype: out.hype, star: out.star, styles: out.styles, headline: out.headline };
  lineupCheck(f); // Saturday is done: lineup confirmed, on to Sunday
  const starName = out.star ? f.roster.find((x) => x.id === out.star)?.name : null;
  news(f, $P($L('franchise.media_day'), ` `, [starName ? `${$t('franchise.in_the_spotlight', { starName })}` : null, out.hype ? $t('franchise.you_talked_trash_before_the_rival') : null].filter(Boolean).join(' · ') || $t('franchise.no_headlines'), `. `, out.headline.paper, `: “`, out.headline.title, `”`), 'info');
  return { ok: true, boosts, hype: out.hype, star: out.star, styles: out.styles, headline: out.headline };
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
  if (f.week?.commissioner) return { ok: false, reason: $t('franchise.the_commissioner_is_waiting_for_your'), did: [] };
  const did = [];
  let guard = 0;
  while (f.season.day < 6 && guard++ < 10) {
    const day = f.season.day;
    if (isBye(f) && day >= 3) { f.season.day = 6; did.push($t('franchise.bye_week_rested')); break; }
    if (draftWindow(f) && day === 0) { const r = scoutDraft(f); did.push(r.ok ? `${$t('franchise.studied_draft_prospects', { n: r.studied.length })}` : $t('franchise.draft_class_not_ready')); continue; }
    if (draftWindow(f) && day === 1) { const r = recoveryDay(f); did.push(`${$t('franchise.recovery_day_2')}${r.healed?.length ? ': ' + r.healed.join(', ') + ' healed' : ''}`); continue; }
    if (day === 0) { const scout = staffMember(f, 'head_scout'); const best = Object.entries(REGIONS).sort((a, b) => (scout?.biomes?.[b[1].biome] ?? 50) - (scout?.biomes?.[a[1].biome] ?? 50))[0][0]; const r = scoutRegion(f, best); did.push(`${$t('franchise.scouted_prospects', { best, n: r.prospects?.length || 0 })}`); }
    else if (day === 1) {
      const pick = f.week.prospects.map((p, i) => ({ p, i })).filter(({ p }) => p.revealed >= 4 && !salarySummary(f, p.monster.salary).over && f.roster.length < ROSTER_MAX)
        .map((x) => ({ ...x, gain: monsterOverall(x.p.monster) - Math.max(0, ...f.roster.filter((m) => m.position === x.p.monster.position).map((m) => monsterOverall(m))) }))
        .filter((x) => x.gain >= 2).sort((a, b) => b.gain - a.gain)[0];
      if (pick && startEncounter(f, pick.i, { mode: 'skip' }).ok) { // staff auto-run: the AI rotation policy (D1)
        const b = resolveEncounter(f, { headless: true });
        if (b.won) { const r = acceptOffer(f); did.push(r.ok ? `${$t('franchise.beast_clash_won_signed', { name: pick.p.monster.name })}` : `${$t('franchise.beast_clash_won_but_could_not', { name: pick.p.monster.name })}`); if (!r.ok) declineOffer(f); }
        else { const r = recruit(f, pick.i, 'development'); did.push(r.success ? `${$t('franchise.beast_clash_lost_but_signed_anyway', { name: pick.p.monster.name })}` : `${$t('franchise.beast_clash_lost_turned_us_down', { name: pick.p.monster.name })}`); }
        if (f.season.day === 1) skipRecruit(f);
      }
      else { skipRecruit(f); did.push($t('franchise.skipped_the_encounter')); }
    }
    else if (day === 2) { const order = ['passing', 'rushing', 'coverage', 'pass_rush']; const last = (f.trainingHistory || []).slice(-1)[0]; const focus = order[(order.indexOf(last) + 1) % order.length]; const r = setTraining(f, focus, 'normal'); did.push(`${TRAINING_FOCI[focus].label} practice ${r.success ? 'went well' : 'was sloppy'}${r.injury ? `${$t('franchise.hurt', { name: r.injury.name })}` : ''}`); }
    else if (day === 3) { const opp = opponentName(f); const side = opp ? (teamStrengths(aiTeam(f, opp)).passD < teamStrengths(aiTeam(f, opp)).runD ? 'defense' : 'offense') : 'offense'; scoutOpponent(f, side); did.push(opp ? `${$t('franchise.scouted_s', { opp, side })}` : $t('franchise.bye_week')); }
    else if (day === 4) { setGamePlan(f, startingPlan(f, 'offense'), startingPlan(f, 'defense')); did.push($t('franchise.coordinators_set_the_game_plan')); }
    else if (day === 5) { const qs = mediaQuestions(f); answerMedia(f, qs.map(() => 0)); did.push($t('franchise.press_conference_professional_answers')); } // the staff's default: Professional, which never talks trash
  }
  news(f, $P($L('franchise.staff_ran_the_week'), ` `, did.join(' · '), `.`), 'info');
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
  const m = f.roster.find((x) => x.id === monsterId); if (!m) return { ok: false, reason: $t('franchise.unknown_monster') };
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
/** The schedule's game categories as lines (the saved value stays the id in league.js). */
const CATEGORY_LINE = Object.freeze({ Division: $L('franchise.division'), Conference: $L('franchise.conference'), Interconference: $L('franchise.interconference') });
export function sundayMatchup(f) {
  const fx = currentFixture(f); const po = playoffFixture(f);
  let home, away, oppName, tag, tagL = null;
  if (po) { oppName = po.home === f.club ? po.away : po.home; home = po.home; away = po.away; tag = po.tag; }
  else if (fx && !fx.bye) { oppName = fx.opponent; home = fx.home ? f.club : oppName; away = fx.home ? oppName : f.club; tag = `${$t('franchise.week', { fx: fx.week, category: fx.category })}`; tagL = $L('franchise.week', { fx: fx.week, category: CATEGORY_LINE[fx.category] || fx.category }); }
  else return null;
  const mine = playerTeam(f, { trainingBonus: f.week.trainingFocus ? scaledBonus(trainingBonus(staffMember(f, 'monster_trainer'), f.week.trainingFocus), f.week.trainingFactor ?? 1) : null });
  const theirs = aiTeam(f, oppName, undefined, { scouting: playerProfile(f, { opponent: oppName }) });
  const rival = f.rivals[f.tier]?.team === oppName;
  withCaptains(f, mine, f.club); withCaptains(f, theirs, oppName); // Captain Partnerships (GDD §27.4B): the level is read here and fixed at kickoff
  return { home: home === f.club ? mine : theirs, away: away === f.club ? mine : theirs, playerSide: home === f.club ? 'home' : 'away', opponent: oppName, tag, ...(tagL ? { tagL: lineFields(tagL) } : {}), rival, playoff: !!po, forfeit: !!mine.forfeit, forfeitReason: mine.forfeitReason || null };
}

// ------------------------------------------------------------ development slots (Task 6 Phase C, GM slots; GDD §57)
/** The owner's depth-chart starters (the monsters who develop by playing). */
function ownerStarters(f) { return new Set(Object.values(buildDepthChart(f.roster, f.lineupManual, f.depth)).filter(Boolean)); }
/**
 * The owner's development slots now: his manual picks first (while eligible), the rest filled by the same priority as the AI's.
 * With `notify`, a manual pick that has become ineligible leaves the manual list, and League News says why and who fills the slot.
 */
export function ownerDevSlots(f, { notify = false } = {}) {
  const st = f.devSlots || { manual: [], excluded: [] };
  const res = selectDevSlots(f.roster, ownerStarters(f), { manual: st.manual || [], excluded: st.excluded || [] });
  if (notify && res.dropped.length) {
    f.devSlots = { manual: (st.manual || []).filter((id) => !res.dropped.some((d) => d.id === id)), excluded: st.excluded || [] };
    for (const d of res.dropped) {
      const m = f.roster.find((x) => x.id === d.id); const repl = f.roster.find((x) => res.auto.has(x.id) && !(st.manual || []).includes(x.id));
      news(f, $P($L('franchise.development_slots_so_he_leaves_his', { m: (m ? m.name : $L('franchise.a_monster')), devReason: DEV_REASON[d.reason] || $t('franchise.is_no_longer_eligible') }), (repl ? $P(` `, $L('franchise.suggested_replacement_ovr_potential_now_practici', { name: repl.name, position: repl.position, monsterOverall: monsterOverall(repl), potential: repl.potential })) : '')), 'roster', m ? { mid: m.id, mname: m.name } : undefined);
    }
  }
  return res;
}
/** What the Roster screen shows: the slots (manual or automatic), the eligible reserves not in a slot, and why the rest are not eligible. */
export function devSlotsView(f) {
  const starters = ownerStarters(f); const st = f.devSlots || { manual: [], excluded: [] }; const res = ownerDevSlots(f);
  const row = (m) => ({ id: m.id, name: m.name, position: m.position, age: m.age, ovr: monsterOverall(m), potential: m.potential, manual: (st.manual || []).includes(m.id), excluded: (st.excluded || []).includes(m.id) });
  const inSlot = new Set(res.ids);
  return { size: DEV.slots, perPosition: DEV.perPosition, share: DEV.share, xpPerGame: Math.round(DEV.share * DEV.baseXp),
    slots: res.ids.map((id) => row(f.roster.find((m) => m.id === id))),
    candidates: f.roster.filter((m) => !inSlot.has(m.id) && !devIneligibility(m, starters)).map(row),
    dropped: res.dropped };
}
/** Put a monster in a development slot (`on`) or take him out. A manual pick replaces the lowest-priority automatic one when full. */
export function setDevSlot(f, id, on) {
  const m = f.roster.find((x) => x.id === id); if (!m) return { ok: false, reason: $t('franchise.not_on_your_roster') };
  const st = { manual: [...(f.devSlots?.manual || [])], excluded: [...(f.devSlots?.excluded || [])] };
  if (on) {
    const why = devIneligibility(m, ownerStarters(f)); if (why) return { ok: false, reason: `${m.name} ${DEV_REASON[why]}.` };
    if (st.manual.includes(id)) return { ok: true };
    if (st.manual.length >= DEV.slots) return { ok: false, reason: `${$t('franchise.all_slots_hold_your_own_picks', { slots: DEV.slots })}` };
    if (st.manual.filter((x) => f.roster.find((y) => y.id === x)?.position === m.position).length >= DEV.perPosition) return { ok: false, reason: `${$t('franchise.at_most_in_development_slots', { perPosition: DEV.perPosition, position: m.position })}` };
    st.manual.push(id); st.excluded = st.excluded.filter((x) => x !== id);
  } else { st.manual = st.manual.filter((x) => x !== id); if (!st.excluded.includes(id)) st.excluded.push(id); }
  f.devSlots = st; return { ok: true, slots: devSlotsView(f) };
}
/** Hand every slot back to the automatic priority. */
export function resetDevSlots(f) { delete f.devSlots; return { ok: true, slots: devSlotsView(f) }; }

/** Record the player's finished game and roll the week forward. */
/**
 * Gym badges (Task 10 owner clarification, 2026-11-13; GDD "Reclaimable Gym Badges"). Every counting game against a gym club, regular
 * season or playoff, played or forfeited, puts that club's badge at stake: a win earns it (or keeps it), a loss gives it back to the
 * gym if it is held, and a later win earns it again. Badge progress is the badges held now. Achievements already awarded stay.
 * f.season.badgesEarned lists the badges taken this season (the board's "win a gym badge" goal counts those, even one lost again).
 */
function settleGymBadge(f, m, won, myScore, oppScore) {
  const gym = GYM_BY_CLUB[m.opponent]; if (!gym) return;
  const c = f.campaign; c.badges ||= {}; c.gymWins ||= {};
  if (won) {
    c.gymWins[m.opponent] = (c.gymWins[m.opponent] || 0) + 1;
    if (c.badges[m.opponent]) return; // kept
    c.badges[m.opponent] = { year: f.season.year, week: f.season.week, score: `${myScore}-${oppScore}` };
    const n = Object.keys(c.badges).length;
    c.lastBadge = { club: m.opponent, year: f.season.year, week: f.season.week, n };
    (f.season.badgesEarned ||= []).push(m.opponent);
    news(f, $L('franchise.badge_earned_the_badge_of_8', { badge: gym.badge, n, name: gym.coach.name, opponent: m.opponent, club: f.club, score: myScore, score2: oppScore }), 'win');
  } else if (c.badges[m.opponent]) {
    delete c.badges[m.opponent];
    if (c.lastBadge?.club === m.opponent) c.lastBadge = null; // the "new badge" banner is about this badge only
    news(f, $L('franchise.badge_lost_reclaimed', { badge: gym.badge, name: gym.coach.name, opponent: m.opponent, club: f.club, score: myScore, score2: oppScore, n: Object.keys(c.badges).length }), 'loss');
  }
}
export function finishSunday(f, gameState) {
  syncLegendary(f); // Legendary Plays: discovery and plan cleanup (GDD §36)
  const m = sundayMatchup(f); if (!m) return;
  const playoffRoundNow = playoffFixture(f)?.round || null;
  const side = m.playerSide, oppSide = side === 'home' ? 'away' : 'home';
  const ig = { home: m.home.name, away: m.away.name, week: f.season.week, playoff: !!m.playoff, round: playoffRoundNow }; const it = [[f.club, f.roster, m.opponent, m[side].chart], [m.opponent, m[oppSide].roster, f.club, m[oppSide].chart]];
  injuriesBeforeGame(f, it, ig); // Injury History (GDD §50): read before this game's injuries are rolled
  for (const x of m[oppSide].roster) dexRecord(f, x, 'seen'); // every monster you face goes in the dex
  const won = gameState.winner === side;
  settleTiebreak(f, gameState); // a tied game that reached the screen's end without the Clash (should not happen) is settled headless
  const pg = f.week.pregame; const res = { week: f.season.week, home: m.home.name, away: m.away.name, homeScore: gameState.score.home, awayScore: gameState.score.away, ot: !!gameState.ot, player: true, winner: gameState.winner ? m[gameState.winner].name : null, clash: gameState.tiebreak || null, pregameClash: pg?.result ? { winner: gameState.coin?.winner || null, choice: gameState.coin?.choice || null, by: pg.result.by, exchanges: pg.result.exchanges, playerWon: pg.result.winner === 'a' } : null };
  const { r, save } = frng(f);
  const ledger = (f.rewardLedger ||= createRewardLedger()); const act = gameActivityId(f, f.club);
  const events = afterGame(f.roster, m[side].chart, gameState.stats[side].players, r, { won, autoSpend: !!f.settings.autoPoints, autoEvolve: false, ledger, activityId: act, mastery: gameState.t8?.mastery });
  { const played = playedIds(m[side].chart); const slots = ownerDevSlots(f, { notify: true }); events.push(...practiceAfterGame(f.roster, slots.ids, played, r, { autoSpend: !!f.settings.autoPoints, autoEvolve: false, ledger, activityId: `${act}:reserve` })); } // C1: the owner's development slots (Task 6 Phase C)
  aiAfterGame(f, m[oppSide], gameState, oppSide, r); // the persistent opponent develops from this game too (GDD §42.6)
  save();
  injuriesAfterGame(f, it, ig);
  f.week.events = events;
  f.week.gameResult = { ...res, won, playerScore: gameState.score[side], oppScore: gameState.score[oppSide], opponent: m.opponent, tag: m.tag, ...(m.tagL ? { tagL: m.tagL } : {}) };
  { const offense = {}, defense = {}; let passes = 0, plays = 0;
    for (const c of gameState.calls || []) { if (c.side === side) { offense[c.off] = (offense[c.off] || 0) + 1; plays++; if (PLAYS[c.off]?.type === 'pass') passes++; } else defense[c.def] = (defense[c.def] || 0) + 1; }
    (f.season.scouting ||= []).push({ week: f.season.week, opponent: m.opponent, offense, defense, passes, plays }); }
  if (m.rival) { f.rivals[f.tier].headToHead[won ? 'w' : 'l'] += 1; news(f, won ? $L('franchise.rivalry_win_over_gm_will_remember', { opponent: m.opponent, gm: f.rivals[f.tier].gm }) : $L('franchise.s_gm_gets_bragging_rights_this', { opponent: m.opponent, gm: f.rivals[f.tier].gm }), won ? 'win' : 'loss'); 
    if (f.week.media?.hype) { if (won) news(f, $L('franchise.you_backed_up_the_trash_talk'), 'win'); else { f.rattled = true; news(f, $L('franchise.the_trash_talk_backfired_the_team'), 'loss'); } }
  }
  { const lines = new Map(); recordGame(f, gameState, { home: m.home, away: m.away }, { playoff: !!m.playoff, booksFor: (t) => leagueBooks(f, t), onLine: (t, x, g) => lines.set(x.id, g) }); leagueCareerAfterGame(f, [m[oppSide]], gameState, lines, { playoff: !!m.playoff, round: playoffRoundNow, vsOwner: true }); }
  const captainRows = afterCaptainGame(f, gameState, { home: m.home.name, away: m.away.name, week: f.season.week, playoff: !!m.playoff, round: playoffRoundNow }); // chemistry earned in this game, committed once
  const captainNote = !gameState.partners && CP.captainsOf(f, f.club) ? $t('franchise.this_game_kicked_off_before_your') : null;
  if (m.playoff) { recordPlayoffResult(f, res); }
  else { applyResult(f.season.records, res); f.season.results.push(res); const fx = currentFixture(f); fx.result = { playerScore: gameState.score[side], oppScore: gameState.score[oppSide], won }; }
  news(f, $P(won ? $L('franchise.win') : $L('franchise.loss'), ` `, gameState.score[side], `-`, gameState.score[oppSide], ` vs `, m.opponent, (gameState.tiebreak ? $P(` `, $L('franchise.ot_v_beast_clash', { size: gameState.tiebreak.size, size2: gameState.tiebreak.size })) : gameState.ot ? ' (OT)' : ''), `.`), won ? 'win' : 'loss');
  // Promised starters: three games on the bench and they walk (GDD §15.7).
  for (const x of f.roster.filter((p) => p.promise)) {
    if (!Object.values(m[side].chart).includes(x.id)) { x.promise.benched += 1; if (x.promise.benched >= PROMISE_BENCH_LIMIT) { f.roster = f.roster.filter((p) => p.id !== x.id); noteCaptainLeft(f, f.club, x, 'walked'); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === x.id) delete f.lineupManual[slot]; news(f, $L('franchise.walked_out_you_promised_a_starting', { name: x.name, promiseBenchLimit: PROMISE_BENCH_LIMIT }), 'loss'); } else news(f, $L('franchise.was_promised_a_start_and_sat', { name: x.name, benched: x.promise.benched, promiseBenchLimit: PROMISE_BENCH_LIMIT }), 'loss'); }
  }
  // Campaign: career wins, head-to-head memory (drives the pregame dialogue) and gym badges (Task 10, owner 2026-11-13: every counting game
  // against a gym club puts its badge at stake; see settleGymBadge).
  f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 };
  if (won) f.campaign.wins += 1;
  f.campaign.h2h ||= {}; const h2h = (f.campaign.h2h[m.opponent] ||= { w: 0, l: 0, last: null, streakL: 0 });
  h2h[won ? 'w' : 'l'] += 1; h2h.last = won ? 'w' : 'l'; h2h.streakL = won ? 0 : h2h.streakL + 1;
  // The pregame reply: a confident word backed up is remembered; one that wasn't rattles the room.
  if (f.week.pregameReply === 'confident') { if (won) news(f, $L('franchise.you_said_youd_take_it_and', { opponent: m.opponent }), 'win'); else { f.rattled = true; news(f, $L('franchise.the_confident_talk_before_the_game'), 'loss'); } }
  settleGymBadge(f, m, won, gameState.score[side], gameState.score[oppSide]);
  // Level-ups are shown after the game and on the Career Timeline; the club log keeps evolutions and injuries.
  for (const e of events.filter((x) => x.kind !== 'xp' && x.kind !== 'levelup')) news(f, e.kind === 'levelup' ? $L('franchise.reached_level_ovr', { name: e.name, level: e.level, from: e.from, to: e.to, autoPoints: (f.settings.autoPoints ? '' : $L('franchise.2_attribute_points_to_spend_on'))}) : e.kind === 'evolve' ? $L('franchise.evolution_evolved_into_2', { from: e.from, to: e.to }) : e.kind === 'injury' ? $L('franchise.injured_out_weeks', { name: e.name, severity: e.severity, weeks: e.weeks, n: e.weeks }) : e.name, e.kind === 'evolve' ? 'win' : e.kind, e.id ? { mid: e.id, mname: e.kind === 'evolve' ? e.to : e.name } : null);
  for (const e of events) if (e.kind === 'evolve') { const x = f.roster.find((p) => p.id === e.id); if (x) dexRecord(f, x, 'signed'); }
  f.game = null;
  recordPlayStats(f, gameState, side);
  // Career Timeline (GDD §38): read-only, after the game's stats are in the books.
  careerAfterGame(f.roster, { year: f.season.year, week: f.season.week, club: f.club, playoffRound: playoffRoundNow, rival: !!m.rival, won, opponent: m.opponent, records: f.records });
  for (const e of events) if (e.kind === 'evolve') { const x = f.roster.find((p) => p.id === e.id); if (x) noteEvolution(x, { year: f.season.year, week: f.season.week, club: f.club, from: e.from, to: e.to }); }
  f.lastGame = { ...f.week.gameResult, events, partnerships: captainRows.filter((x) => x.club === f.club), captainNote, year: f.season.year, week: f.season.week, newBadge: f.campaign.badges[m.opponent]?.year === f.season.year && f.campaign.badges[m.opponent]?.week === f.season.week && won ? m.opponent : null };
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
  if (hasLeague(f)) items.push(...movesNews({ year, week, events: takeEvents(f, year, week), club, rival, division: DIVISIONS[divisionOf(club)] || [] })); // the league's moves this week (GDD §46)
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
  if (!inPlayoffs(f) || playoffFixture(f) || f.season.finished) return { ok: false, reason: $t('franchise.nothing_to_advance') };
  const p = f.season.playoffs; const round = p.round;
  simulatePlayoffWeek(f); writeLeagueNews(f, round); leagueRecoverWeek(f, {}); f.season.week += 1; f.season.day = 0; { const lastPlan = f.week.plan; f.week = blankWeek(); f.week.plan = lastPlan; }
  const results = p.results.filter((x) => x.round === round);
  if (p.champion) endSeason(f);
  return { ok: true, round, results, champion: p.champion || null, finished: !!f.season.finished };
}
export function skipPlayoffs(f) { let guard = 0; while (!f.season.finished && guard++ < 5) { const r = advancePlayoffs(f); if (!r.ok) break; } return { ok: true }; }
export const ROUND_NAMES = Object.freeze({ 1: $t('franchise.wild_card_round'), 2: $t('franchise.conference_finals'), 3: $t('franchise.beast_bowl') });

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
  news(f, qualified ? $L('franchise.playoffs_qualified_as_the', { club: f.club, seed: seedLine(seeds, f.club) }) : $L('franchise.regular_season_over_missed_the_playoffs', { club: f.club }), qualified ? 'win' : 'loss');
}
/** The seed as a saved line (Task 10: it follows the language like the sentence around it). */
function seedLine(seeds, club) { for (const [conf, s] of Object.entries(seeds)) { const i = s.indexOf(club); if (i >= 0) return $L('franchise.seed_2', { conf, i: i + 1 }); } return $L('franchise.a_qualifier'); }
function recordPlayoffResult(f, res) {
  const p = f.season.playoffs;
  const g = p.fixtures.find((x) => x.round === p.round && x.home === res.home && x.away === res.away);
  const winner = res.winner || (res.homeScore > res.awayScore ? res.home : res.away);
  g.result = res; p.results.push({ round: p.round, conf: g.conf, winner, home: res.home, away: res.away, homeScore: res.homeScore, awayScore: res.awayScore, ot: res.ot, clash: res.clash || null });
}
function simulatePlayoffWeek(f) {
  const p = f.season.playoffs; if (!p || p.champion) return;
  ensureCaptains(f);
  const { r, save } = frng(f);
  for (const g of p.fixtures.filter((x) => x.round === p.round && !x.result)) {
    const home = withCaptains(f, aiTeam(f, g.home), g.home), away = withCaptains(f, aiTeam(f, g.away), g.away);
    const ig = { home: g.home, away: g.away, week: f.season.week, playoff: true, round: p.round }; const it = [[g.home, home.roster, g.away, home.chart], [g.away, away.roster, g.home, away.chart]];
    injuriesBeforeGame(f, it, ig);
    const toss = leaguePregame(f, r, home, away);
    const game = playGame({ home, away, venue: gameVenue(f, home.name, away.name), seed: r.seed(), quarterLength: 180, comeback: comebackRule(f), coinWinner: toss.coinWinner, choice: toss.choice, otPeriods: OT_PERIODS, statusCarry: toss.statusCarry || null });
    leagueTiebreak(f, r, home, away, game, { playoff: true });
    aiAfterGame(f, home, game, 'home', r); aiAfterGame(f, away, game, 'away', r);
    injuriesAfterGame(f, it, ig);
    const lines = new Map(); recordGame(f, game, { home, away }, { playoff: true, booksFor: (t) => leagueBooks(f, t), onLine: (t, m, g) => lines.set(m.id, g) });
    leagueCareerAfterGame(f, [home, away], game, lines, { playoff: true, round: p.round });
    afterCaptainGame(f, game, { home: g.home, away: g.away, week: f.season.week, playoff: true, round: p.round });
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
  injurySeasonEnd(f); // Injury History (GDD §50): the season's full-season marks, before anything rolls over
  const s = f.season; const st = leagueStandings(f); const wasHotSeat = onHotSeat(f);
  const champion = s.playoffs?.champion || null;
  const rec = record(f);
  if (champion === f.club) { f.badges[f.tier] += 1; f.qualification[f.tier] += 1; f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 }; f.campaign.titles += 1; news(f, $L('franchise.beast_bowl_champions_win_the_title', { club: f.club, name: tierById(f.tier).name }), 'win'); }
  if (champion) addLeagueNews(f, championNews({ year: s.year, week: 13, final: (s.playoffs?.results || []).find((x) => x.round === 3) }));
  const place = st.overall.indexOf(f.club) + 1;
  f.bottomFourStreak = place > 12 ? f.bottomFourStreak + 1 : 0;
  f.history.push({ year: s.year, club: f.club, tier: f.tier, record: { w: rec.w, l: rec.l, t: rec.t }, place, champion, playoffs: !!s.playoffs?.seeds && Object.values(s.playoffs.seeds).flat().includes(f.club), schedule: s.schedule.map((g) => ({ ...g })), rival: { ...f.rivals[f.tier] } });
  // Tier movement (promotion challenge / relegation) is designed but switched off for now:
  // the data model stays, the league stays one great season at a time.
  if (TIERS_ENABLED) {
    const tier = tierById(f.tier);
    if (tier.next && f.qualification[f.tier] >= tier.badgeGoal) { f.tier = tier.next; f.qualification[f.tier] = 0; news(f, $L('franchise.promoted_to_the', { name: tierById(f.tier).name }), 'win'); ensureRival(f); }
    else if (tier.rank < 3 && f.bottomFourStreak >= 2) { const lower = TIERS.find((t) => t.rank === tier.rank + 1); f.tier = lower.id; f.bottomFourStreak = 0; news(f, $L('franchise.relegated_to_the', { name: lower.name }), 'loss'); ensureRival(f); }
  }
  s.awards = seasonAwards(f);
  f.history[f.history.length - 1].awards = s.awards;
  if (champion === f.club) f.history[f.history.length - 1].championship = championshipRecord(f, s); // the ceremony and its summary (GDD §35)
  updateSeasonRecords(f, s.year); // the records book (GDD §17.8)
  addLeagueNews(f, recordNews({ year: s.year, week: 13, records: f.records, seasonsInBook: (f.history || []).length, scope: 'season' }));
  careerSeasonEnd(f.roster, { year: s.year, club: f.club, awards: s.awards, records: f.records, champion }); // Career Timeline (GDD §38)
  leagueSeasonEnd(f, { year: s.year, awards: s.awards, records: f.records, champion }); // the 15 persistent rosters' season-end events (GDD §42.6)
  archiveSeasonTables(f); // the season's league tables stay readable from the statistics screens (2026-10-22)
  if (hasLeague(f)) slimSeasonAwards(f.history[f.history.length - 1].awards, s.year, (id) => f.roster.find((m) => m.id === id) || f.league.monsters[id] || null); // forward-only compaction of the winner rows (GDD §46): every number keeps one copy, in the book
  { const { r, save } = frng(f); const retired = retirementPass(f, r, { year: s.year, news: (t, k) => news(f, t, k) }); save();
    // Task 9 history-only bookkeeping: no simulation RNG draws, retirement changes or award recalculation.
    recordRetiredMonsterCandidates(f, retired, s.year);
    const hof = (f.monsterHallOfFame ||= { v: 1, candidates: [], elections: [] });
    const result = electMonsterHallOfFame(hof.candidates, s.year, hof.elections);
    if (result.created) hof.elections = result.history;
  } // retirements as the offseason opens, before contracts and the draft (GDD §55.3)
  if (hasFreeAgency(f) && seasonsCompleted(f) >= SEASON_CAP) f.freeAgency.lastSeason = s.year; // the 20-season endpoint: no free-agency offseason after the last season (specification edge cases)
  if (hasLeague(f)) migrateAmbitions(f); // any monster still without his hidden Ambition gets it (idempotent; the same value every time)
  if (hasLeague(f) && migrationDue(f)) { const rep = migratePositions(f, { year: s.year }); news(f, $P($L('franchise.single_position_rule_monsters_now_play', { moved: rep.moved, n: rep.owner.length }), (rep.ownerHoles.length ? $P(` `, $L('franchise.your_lineup_has_open_starting_slots', { n: rep.ownerHoles.length })) : '')), rep.ownerHoles.length ? 'loss' : 'info'); } // owner 2026-11-05, once per save, at this offseason boundary
  if (hasLeague(f)) noteStaffSeason(f, s.year, { playoffs: f.history[f.history.length - 1]?.playoffs, champion: champion === f.club, table: strengthTable(f) }); // the staff's season, for performance-based renewals
  if (task7Offseason(f, s.year)) closeSeasonTask7(f, s, rec); else { // Task 7 (fa-state.js): strategy, ageing, then contract processing, before free agency
  { const winners = new Set(Object.values(s.awards?.league || {}).filter((w) => w && w.team === f.club).map((w) => w.id)); openOffseason(f, { year: s.year, awardWinnerIds: winners, winningRecord: rec.w > rec.l }); if (offseasonPending(f).length) news(f, $L('franchise.offseason_contracts_up_for_renewal', { n: offseasonPending(f).length }), 'info'); }
  noteGrowth(f, (c) => aiTeam(f, c, s.year));
  if (hasLeague(f)) for (const c of leagueClubs(f)) { const st = clubRecord(f, c).strategy; st.today = teamOverall(legacyAiTeam(f, c, s.year + 1)); st.todayYear = s.year + 1; } // today's generated strength for the coming season, computed once and reused by the transition and the Board's forecast
  const excessOf = () => 0; // N7f: no rubber-banding; the runaway-veteran attrition (decision C) is retired
  const modeChanges = hasLeague(f) ? evaluateStrategies(f, { year: s.year, cap: tierById(f.tier).cap, teamOf: (c) => aiTeam(f, c, s.year) }) : []; // Task 6 Phase D (R2): each AI club's strategy mode, before contracts and the draft
  if (hasLeague(f)) f.leagueOffseason = { ...(f.leagueOffseason?.opened === s.year ? f.leagueOffseason : {}), closed: s.year, modeChanges: modeChanges.length, contracts: leagueContracts(f, { year: s.year, cap: tierById(f.tier).cap, excessOf }) }; // AI clubs re-sign or let walk, and trim to the cap (GDD §42.6 steps 4; decision D)
  }
  maybeTradeCall(f); // a club may call as the offseason opens (GDD §19.6)
  // The board's goal (GDD §17.4): settled now, before the offseason.
  { const gymWinsThisYear = Array.isArray(s.badgesEarned) ? new Set(s.badgesEarned).size : Object.values(f.campaign?.badges || {}).filter((b) => b.year === s.year).length; // badges taken this season, even one lost again (older saves: the held ones)
    const verdict = settleGoal(f, { wins: rec.w, playoffs: !!s.playoffs?.seeds && Object.values(s.playoffs.seeds).flat().includes(f.club), badgesWon: gymWinsThisYear, champion: champion === f.club, forecastWins: boardForecastFor(f, s.schedule.filter((g) => !g.bye).length || 9).wins });
    if (verdict) { s.boardVerdict = verdict; news(f, verdict.met ? $L('franchise.board_goal_met_confidence_the_scouting', { label: fieldLine(verdict.goal, 'label'), confidence: verdict.confidence >= 0 ? '+' : '', confidence2: verdict.confidence, confidence3: confidenceLabel(verdict.confidence) }) : verdict.status === 'fired' ? $L('franchise.board_goal_missed_wins_forecast_the', { label: fieldLine(verdict.goal, 'label'), w: rec.w, forecastWins: verdict.goal.forecastWins ?? '?', reason: verdict.reason ? verdict.reason[0].toUpperCase() + verdict.reason.slice(1) + '.' : '' }) : verdict.status === 'warning' ? $L('franchise.board_goal_missed_narrowly_wins_forecast', { label: fieldLine(verdict.goal, 'label'), w: rec.w, forecastWins: verdict.goal.forecastWins ?? '?' }) : verdict.status === 'hot_seat' ? $L('franchise.board_goal_missed_you_are_on', { label: verdict.goal.label }) : $L('franchise.board_goal_missed_confidence', { label: fieldLine(verdict.goal, 'label'), confidence: verdict.confidence }), verdict.met ? 'win' : 'loss'); } }
  if (rec.w < rec.l || onHotSeat(f)) f.postseason = makePostseasonEvent(f); // a losing record, or the hot seat, makes one story event mandatory (GDD §15.7, §17.4)
  if (champion === f.club && legendChoices(f).length) f.legendPick = { year: s.year, resolved: false }; // Beast Bowl champions choose a Legend Track (GDD §15.8)
  // Campaign: league awards won by this club's monsters count toward the Hall of Fame.
  f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 };
  const mine = Object.entries(s.awards.league || {}).filter(([, w]) => w && w.team === f.club);
  f.campaign.awards += mine.length;
  s.finished = true;
  checkAchievements(f, 'season', { wins: rec.w, losses: rec.l, champion: champion === f.club, awardsWon: mine.length, ...lineField('awardLine', mine.length ? $P(...mine.flatMap(([k, w], i) => [i ? ' ' : '', w.name, ': ', labelLine(AWARDS[k]?.label || k), '.'])) : ''), wasHotSeat, goalMet: !!s.boardVerdict?.met });
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
  const res = computeAwards({ table: f.season.leagueStats, records: f.season.records, expectations: f.season.expectations || {}, coachOf: (t) => coachNameOf(f, t), n, priorRookieAwardIds: priorRookieAwardIds(f) });
  return res;
}
/** Previous rookie-award winners are never eligible to win another rookie award (a guard for saves made before the Task 10 rollover fix). */
function priorRookieAwardIds(f) {
  const ids = new Set();
  for (const season of f.history || []) {
    for (const key of ['oroy', 'droy']) {
      const id = season.awards?.league?.[key]?.id;
      if (id != null) ids.add(id);
    }
  }
  return [...ids];
}
/** Freeze the regular-season awards (called when the playoffs are drawn). */
export function finalizeAwards(f) {
  if (f.season.awardsFinal) return f.season.awardsFinal;
  const races = computeAwards({ table: f.season.leagueStats, records: f.season.records, expectations: f.season.expectations || {}, coachOf: (t) => coachNameOf(f, t), n: 5, priorRookieAwardIds: priorRookieAwardIds(f) });
  f.season.awardsFinal = { year: f.season.year, races, winners: Object.fromEntries(Object.entries(AWARDS).map(([k]) => [k, races[k]?.[0] || null])) };
  addLeagueNews(f, awardNews({ year: f.season.year, week: 10, winners: f.season.awardsFinal.winners, priorOf: (id, key) => (f.history || []).filter((h) => h.awards?.league?.[key]?.id === id).length }));
  for (const [k, w] of Object.entries(f.season.awardsFinal.winners)) if (w && w.team === f.club) news(f, $L('franchise.one_of_yours', { short: AWARDS[k].short, k: (k === 'coy' ? $L('franchise.your_staff') : w.name)}), 'win');
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
function ensureRival(f) { if (!f.rivals[f.tier]) { const { r, save } = frng(f); const choices = DIVISIONS[divisionOf(f.club)].filter((t) => t !== f.club); const team = r.pick(choices); save(); f.rivals[f.tier] = { team, gm: RIVAL_GMS[team] || $t('franchise.rival_gm'), headToHead: { w: 0, l: 0 } }; } }
// ------------------------------------------------------------ Task 7: the free-agency offseason (fa-*.js; specification "Offseason sequencing")
// Season close → retirement (Task 6, unchanged) → Task 6 strategy snapshot → ageing → contract processing (the owner's renewals and
// the AI's Task 6 renewals, each answered by the monster) → [the owner opens free agency: AI–AI trade window, the league year turns,
// extensions take over] → Periods 1–5 → draft → roster preparation → next season. Each step records itself in
// `f.freeAgency.steps[year]`, so a reload never repeats ageing, expiries or renewals.
function closeSeasonTask7(f, s, rec) {
  const year = s.year; const cap = tierById(f.tier).cap; const steps = (f.freeAgency.steps[year] ||= {});
  // Task 6 strategy, exactly where and from what Task 6 validated it: this season's results and the rosters before ageing
  noteGrowth(f, (c) => aiTeam(f, c, year));
  noteClubResults(f, year); // Ambition: every club's record, the last three seasons (competitive outlook)
  if (hasLeague(f)) for (const c of leagueClubs(f)) { const st = clubRecord(f, c).strategy; st.today = teamOverall(legacyAiTeam(f, c, year + 1)); st.todayYear = year + 1; }
  const excess = {}; // N7f: no rubber-banding; the runaway-veteran attrition (decision C) is retired
  const modeChanges = evaluateStrategies(f, { year, cap, teamOf: (c) => aiTeam(f, c, year) });
  // ageing, once: the owner's roster, the pools, the waivers and the AI clubs (moved here from the season start; GDD §55 rules unchanged)
  if (!steps.aged) {
    const { r, save } = frng(f); const ageCtx = agingContext(f, year);
    offseason(f.roster, r, { ...ageCtx, autoAllocate: !!f.settings?.autoPoints }); for (const list of Object.values(f.pool || {})) offseason(list, r, ageCtx);
    if (f.league.waivers?.length) offseason(f.league.waivers, r, ageCtx);
    leagueAgeing(f, r, { year, ctx: ageCtx }); save(); steps.aged = true;
  }
  // contract processing: the owner's renewals (answered by the monster when decided) and the AI's Task 6 renewals
  { const winners = new Set(Object.values(s.awards?.league || {}).filter((w) => w && w.team === f.club).map((w) => w.id)); openOffseason(f, { year, awardWinnerIds: winners, winningRecord: rec.w > rec.l }); staffDemands(f, year); monsterRenewals(f); if (offseasonPending(f).length) news(f, $L('franchise.offseason_contracts_up_for_renewal_free', { n: offseasonPending(f).length }), 'info'); }
  let renewBench = null; // one league bench for this offseason's AI renewal negotiations
  f.leagueOffseason = { ...(f.leagueOffseason?.opened === year ? f.leagueOffseason : {}), closed: year, modeChanges: modeChanges.length, contracts: leagueContracts(f, { year, cap, excessOf: (c) => excess[c] || 0, accepts: (club, m, terms, x) => aiRenewalAnswer(f, club, m, terms, cap, { ...x, bench: (renewBench ||= leagueBenchOf(f)) }) }) };
  steps.contracts = true;
}
/** A monster's answer to his AI club's renewal: yes; or, when close, his counter, which the club pays if next season's cap can carry it. */
function aiRenewalAnswer(f, club, m, terms, cap, { core = false, bench = null } = {}) {
  // the renewal negotiation of the expiring contract (owner 2026-11-05, 13:23): his own talk decision for this window, his opening demand,
  // the club's counteroffers within its mode's target and ceiling, his counters and final decision — the owner's rules exactly
  const neg = negotiation(f, m, club, 'renew'); if (neg.state === 'no-talks') return 'talks';
  const room = clubCapRoom(f, club, cap) + (m.salary || 0); // his current salary leaves with the old deal
  const t = aiBargain(f, club, m, neg, { core, fits: (x) => x.salary <= room, years: aiYears(f, club, m, bench || leagueBenchOf(f)), bonus: false }); // the club's term: Task 6 R3, moved to his preference when one season apart and the mode allows (as in the market)
  return t ? { salary: t.salary, years: t.years } : false;
}
/** A generated market veteran's family: the free-agent arrival channel's Basic share (N7c B17), else one of the region's families. */
function marketSpecies(r, regionName, pos) {
  const originals = regionSpecies(regionName, REGIONS[regionName].types, 10).filter((x) => x.position === pos);
  if (!originals.length) return null;
  return pickChannelSpecies(r, 'arrival', pos, { originals, basics: basicsFor(pos, REGIONS[regionName].types), pickOriginal: (rr, list) => rr.pick(list) });
}
/** This offseason's generated veterans (the market has always had a dozen besides the pools). */
function generateVeterans(f, r) {
  const gen = []; const positions = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'DL', 'DL', 'LB', 'CB', 'S', 'K'];
  for (const pos of positions) { const regionName = r.pick(Object.keys(REGIONS)); const sp = marketSpecies(r, regionName, pos); if (!sp) continue; const m = generateMonster(r, { position: pos, quality: 50 + r.int(10), species: sp.id, channel: 'arrival' }); m.origin = regionName; claimMonster(f, m, 'market'); uniqueName(f, m, gen.map((x) => x.name)); m.contract = null; gen.push(m); }
  return gen;
}
const t7fail = (reason, extra = {}) => ({ ok: false, reason, ...extra });
export const freeAgencyOpen = (f) => !!f?.freeAgency?.period;
export const freeAgencyDone = (f) => !!f?.freeAgency?.steps?.[f.season?.year]?.faDone;
/** Open free agency (Period 1): the owner's renewals must be settled. Idempotent. */
export function openFreeAgency(f) {
  if (!task7Offseason(f)) return t7fail($t('franchise.the_new_free_agency_begins_with'));
  if (!f.season.finished) return t7fail($t('franchise.the_season_is_not_over'));
  const fa = f.freeAgency; const year = f.season.year; const steps = (fa.steps[year] ||= {});
  if (steps.faOpen) return { ok: true, already: true, period: fa.period };
  if (!offseasonReady(f)) return t7fail(`${$t('franchise.contract_decisions_still_waiting', { n: offseasonPending(f).length })}`);
  const { r, save } = frng(f); const cap = tierById(f.tier).cap, next = year + 1;
  for (const i of f.offseason?.items || []) if (i.kind === 'monster' && i.status === 'declined') { const m = f.roster.find((x) => x.id === i.id); if (m) { f.roster = f.roster.filter((x) => x !== m); for (const [slot, mid] of Object.entries(f.lineupManual)) if (mid === m.id) delete f.lineupManual[slot]; toPool(f, m, 'walked'); news(f, $L('franchise.turned_down_your_renewal_and_is', { name: m.name }), 'loss'); } i.status = 'walked'; }
  const trades = hasLeague(f) ? aiTrades(f, r, { year: next, cap, window: 'offseason' }) : []; // AI–AI trades before the market, as before Task 7 (GDD §46)
  fa.leagueYear = next; pruneLocks(f); promoteExtensions(f, next); // the league year turns (Task 7 §3.2)
  fa.extra = generateVeterans(f, r); save();
  steps.ext = aiExtensions(f); // R6: the offseason extension window, at the league year's turn (contracts entering their final season)
  fa.period = 1; steps.faOpen = true; steps.trades = trades.length;
  aiMarketTurn(f);
  news(f, $L('franchise.free_agency_is_open_period_1', { periods: FA_RULES.periods }), 'info');
  return { ok: true, period: 1 };
}
/** The owner's live offers that this advance will settle or expire (the advance warning, decision 12). */
export function advanceWarning(f) {
  const p = f.freeAgency?.period; if (!p) return [];
  return liveOffers(f, (o) => o.club === f.club).filter((o) => o.expires <= p || p >= FA_RULES.periods || o.state === 'countered').map((o) => ({ id: o.id, mid: o.mid, state: o.state, expires: o.expires }));
}
/** Advance one period: monsters decide, the market relaxes, AI clubs act in the next period; Period 5 closes the market. */
export function advanceFreeAgency(f) {
  const fa = f.freeAgency; const p = fa?.period; if (!p) return t7fail($t('franchise.free_agency_is_not_open'));
  const closing = p >= FA_RULES.periods; const res = resolvePeriod(f, { closing }); ageMarket(f);
  const mine = res.signed.filter((x) => x.club === f.club).length;
  if (closing) { fa.period = null; fa.steps[f.season.year].faDone = true; news(f, $P($L('franchise.free_agency_closed'), (mine ? $P(` `, $L('franchise.signed', { mine })) : ''), $L('franchise.the_draft_is_next')), 'info'); }
  else { fa.period = p + 1; aiMarketTurn(f); }
  return { ok: true, period: fa.period, ...res };
}
/** Early completion (decision 12): advance through every remaining period. */
export function finishFreeAgency(f) { let last = null; let g = 0; while (f.freeAgency?.period && g++ < 10) last = advanceFreeAgency(f); return last || { ok: true, period: null }; }
// the owner's side of the market: the same engine as every AI club
export const offerFreeAgent = (f, mid, terms) => submitOffer(f, f.club, mid, terms);
export const reviseFreeAgentOffer = (f, id, terms) => reviseOffer(f, id, terms);
export const withdrawFreeAgentOffer = (f, id) => withdrawOffer(f, id);
export const acceptFreeAgentCounter = (f, id) => acceptCounter(f, id);
/** Immediate negotiation outside the periods (in season, and between the close of Period 5 and the season start; decision 17). */
export function negotiateFreeAgent(f, mid, terms) {
  if (!hasFreeAgency(f) || !hasLeague(f)) return t7fail($t('franchise.not_available_in_this_franchise'));
  if (f.freeAgency.period) return t7fail($t('franchise.during_the_free_agency_periods_make'));
  if (f.season.finished && !freeAgencyDone(f) && task7Offseason(f)) return t7fail($t('franchise.the_market_opens_with_free_agency'));
  return negotiateNow(f, f.club, mid, terms);
}
export function extendContract(f, id, terms, { accept = false } = {}) { const m = f.roster.find((x) => x.id === id); if (!m) return t7fail($t('franchise.not_on_the_roster')); if (!hasFreeAgency(f)) return t7fail($t('franchise.extensions_come_with_the_new_free')); return extend(f, f.club, m, terms, { accept }); }
/** The extension negotiation with `id` in the current window, as it stands (or as it would open: viewing opens nothing). */
export function extensionTalks(f, id) { const m = f.roster.find((x) => x.id === id); if (!m || !hasFreeAgency(f)) return null; const neg = negotiation(f, m, f.club, extWindow(f), { peek: true }); return neg ? { ...neg, left: countersLeft(neg) } : null; }
/** The renewal negotiation behind an offseason book item (Task 7), as it stands. */
export function renewalTalks(f, id) { const i = (f.offseason?.items || []).find((x) => x.id === id && x.kind === 'monster'); const neg = i?.negKey ? f.freeAgency?.talks?.[i.negKey] : null; return neg ? { ...neg, left: countersLeft(neg) } : null; }
export const freeAgencyCap = (f, club = f.club) => capView(f, club);
export { task7Offseason } from './fa-state.js';
/** The market the owner sees: every unsigned monster with his current ask and the offers on him (grounded, decision 11). */
export function freeAgentMarket(f) { if (!hasFreeAgency(f)) return []; return marketList(f).map((x) => ({ monster: x.m, where: x.where, ask: askOf(f, x.m), offers: competingOffers(f, x.m.id), mine: liveOffers(f, (o) => o.club === f.club && o.mid === x.m.id)[0] || null })); }
/** AI clubs over the legendary limit comply by legal transactions before the season gate: the lowest-rated unprotected excess is released (to the market, never deleted). */
function aiLegendCompliance(f, year) {
  let n = 0; if (!hasLeague(f)) return n;
  for (const club of leagueClubs(f).slice().sort()) { const sides = legendsBySide(clubRoster(f, club));
    for (const side of ['offense', 'defense']) { const list = sides[side].filter((m) => !isProtected(m)).sort((a, b) => monsterOverall(a) - monsterOverall(b)); let over = sides[side].length - 1;
      while (over > 0 && list.length) { const m = list.shift(); releaseFromClub(f, club, m.id, { year, reason: 'released', why: 'legendary limit' }); noteReleased(f, m, club); n++; over--; } } }
  return n;
}
/** The owner's legendary compliance at the deadline (resolution 3): null, or what must happen first (with the monsters to trade or release). */
export function legendCompliance(f) {
  if (!hasFreeAgency(f)) return null; const starting = f.season.year + 1; const over = overLimit(f.roster);
  if (!(over.offense || over.defense)) return null;
  const sides = legendsBySide(f.roster); const due = starting >= f.freeAgency.complianceFrom;
  return { due, deadline: f.freeAgency.complianceFrom, over, offense: sides.offense.map((m) => m.id), defense: sides.defense.map((m) => m.id), reason: `${$t('franchise.one_offensive_and_one_defensive_legendary')} ${[over.offense ? `${over.offense} offensive` : null, over.defense ? `${over.defense} defensive` : null].filter(Boolean).join(' and ')} ${$t('franchise.legendar_before_the_season', { defense: (over.offense + over.defense) === 1 ? 'y' : 'ies', year: yearOf(f.freeAgency.complianceFrom) })}` };
}
/** AI clubs sign from the market in roster preparation and in season through the same immediate negotiation (their Task 6 terms). */
function aiSignNow(f, club, m) { const t = aiTerms(f, club, m, null); return negotiateNow(f, club, m.id, t).outcome === 'signed'; }
export function startNextSeason(f, opts = {}) {
  syncLegendary(f); // Legendary Plays: discovery and plan cleanup (GDD §36)
  if (!f.season.finished) return { ok: false, reason: $t('franchise.the_season_is_not_over') };
  if (isFired(f)) return { ok: false, reason: $t('franchise.the_board_has_let_you_go') };
  { const cap = mayStartSeason(f); if (!cap.ok) return { ok: false, reason: cap.reason, cap: !!cap.cap }; } // the 20-season career (GDD §42.1)
  if (!offseasonReady(f)) return { ok: false, reason: `${$t('franchise.contract_decisions_still_waiting', { n: offseasonPending(f).length })}` };
  const t7 = task7Offseason(f);
  if (t7 && !freeAgencyDone(f)) return { ok: false, reason: freeAgencyOpen(f) ? `${$t('franchise.free_agency_is_in_period_of', { period: f.freeAgency.period, periods: FA_RULES.periods })}` : $t('franchise.free_agency_has_not_been_held') };
  if (!draftDone(f)) return { ok: false, reason: $t('franchise.the_draft_has_not_been_held') };
  { const lc = legendCompliance(f); if (lc?.due) return { ok: false, reason: lc.reason, code: 'legendary', compliance: lc }; } // Task 7 resolution 3: never deletes; trade or release
  if (f.roster.length < ROSTER_MIN) { const fp = t7 ? rosterFloorPlan(f) : null; const short = ROSTER_MIN - f.roster.length;
    const how = fp && fp.gap > 0 && Number.isFinite(fp.needed) ? ` ${$t('franchise.the_cheapest_free_agents_ask_cr', { short, toLocaleString: fp.needed.toLocaleString('en-US'), toLocaleString2: Math.max(0, fp.usable).toLocaleString('en-US'), toLocaleString3: fp.gap.toLocaleString('en-US'), rosterMin: ROSTER_MIN })}` : $t('franchise.sign_free_agents_in_the_offseason');
    return { ok: false, code: 'roster', reason: `${$t('franchise.you_need_at_least_monsters_to', { rosterMin: ROSTER_MIN, n: f.roster.length, how })}`, floor: fp }; }
  if (nextStaffRole(f)) return { ok: false, reason: $t('franchise.hire_a_full_staff_first') };
  if (hasFreeAgency(f) && !opts.acceptForfeits) { const g = lineupGate(f); if (!g.ok && !g.shortRoster) return { ok: false, code: 'lineup', reason: g.reason, gate: g }; } // the lineup safeguard: never start a season into forfeits unknowingly; the owner may continue deliberately
  if (f.postseason && !f.postseason.resolved) return { ok: false, reason: $t('franchise.a_postseason_decision_is_waiting') };
  if (f.legendPick && !f.legendPick.resolved) return { ok: false, reason: $t('franchise.choose_your_legend_track_first') };
  f.deadCap = f.pendingDeadCap || 0; f.pendingDeadCap = 0; // bonuses and raises agreed in the offseason land on the new season's books
  const { r, save } = frng(f);
  const ageCtx = agingContext(f, f.season.year); // GDD §55: ageing and decline, with the old-save transition
  const events = t7 ? [] : offseason(f.roster, r, { ...ageCtx, autoAllocate: !!f.settings?.autoPoints }); // Task 7: ageing ran at the season close, before contracts and free agency
  if (!t7) {
    for (const list of Object.values(f.pool || {})) offseason(list, r, ageCtx); // unsigned monsters age too (in pool order)
    if (hasLeague(f) && f.league.waivers?.length) offseason(f.league.waivers, r, ageCtx);
    if (!hasLeague(f)) ageDraftees(f, f.season.year); // the generated rosters' draftees (v40 saves); persistent rosters age below
    for (const m of f.roster) if (m.rookie === f.season.year && m.joined === f.season.year + 1) { m.yearsPro = 0; m.age -= 1; } // just drafted: the coming season is their first (offseason() aged everyone)
  }
  if (hasLeague(f)) { // the league's offseason after the owner's (GDD §42.6 steps 3, 6-8; decisions C, D, F)
    const t0 = globalThis.performance?.now?.() ?? Date.now();
    const year = f.season.year, next = year + 1, cap = tierById(f.tier).cap;
    const targetOf = (club) => clubQuality(f, club, next); // arrivals are generated at the club's quality for the coming season
    const overallTarget = (club) => preseasonTarget(f, club, todayOverall(f, club, next)); // today's generated team for the season, less the growth the club will gain by playing it (league-season.js calibration)
    if (!t7) leagueAgeing(f, r, { year, ctx: ageCtx }); leagueTrim(f, { year: next, cap }); // salaries refreshed with the ratings: back under the cap before anyone shops
    const trades = t7 ? [] : aiTrades(f, r, { year: next, cap, window: 'offseason' }); // AI–AI trades before the market opens (Task 7: at the market's opening)
    if (t7) aiLegendCompliance(f, next); // Task 7 resolution 3: AI clubs comply by legal transactions before the same gate
    const fa = leagueFreeAgency(f, r, { year: next, cap, targetOf, signUnsigned: t7 ? (club, m) => aiSignNow(f, club, m) : null }); // Task 7: pool and waiver monsters answer the AI's offer
    const upgrades = t7 ? null : leagueUpgrades(f, { year: next, cap }); // R5 free-agency upgrades from the pools (Task 6 Phase C; Task 7: bid for in the periods)
    const nudge = RUBBER_BANDING_RETIRED ? null : leagueNudge(f, r, { year: next, cap, targetOf: overallTarget, teamOf: (club) => aiTeam(f, club, next), rival: f.rivals?.[f.tier]?.team || null, signUnsigned: t7 ? (club, m) => aiSignNow(f, club, m) : null }); // Task 7 (owner §5): a gym tries an available monster before a generated arrival
    const overCap = leagueTrim(f, { year: next, cap }); leagueInjuryCover(f, r, { year: next, cap, targetOf });
    const problems = validateClubs(f, { cap }); const structural = verifyLeague(f);
    f.leagueOffseason = { ...(f.leagueOffseason?.closed === year ? f.leagueOffseason : {}), opened: next, freeAgency: fa, upgrades: upgrades?.signed?.length || 0, upgradesByMode: (upgrades?.signed || []).reduce((o, x) => { o[x.mode] = (o[x.mode] || 0) + 1; return o; }, {}), trades: trades.length, nudge, overCap, problems }; lastTransitionMs = Math.round(((globalThis.performance?.now?.() ?? Date.now()) - t0) * 10) / 10; // the timing stays out of the save
    if (structural.length) throw Object.assign(new Error(`${$t('franchise.the_league_registry_is_damaged', { structural: structural[0] })}`), { code: 'league', problems: structural }); // never the owner's fault, never silent; a club over the cap at the roster floor is reported, not fatal
  }
  save();
  startSeason(f, f.season.year + 1);
  if (hasLeague(f) && f.draft?.done && f.draft.picks?.length) noteStaffDraft(f, f.season.year, f.draft.picks, (id) => (f.roster.find((m) => m.id === id) || f.league.monsters?.[id])?.potential); // the scout's class (startSeason has run: this is the new season's record)
  f.offseason = null; f.draft = null;
  if (t7) { const fa = f.freeAgency; fa.extra = []; fa.leagueYear = f.season.year; for (const id of Object.keys(fa.offers)) if (fa.offers[id].ly < fa.leagueYear) delete fa.offers[id]; const un = new Set(marketList(f).map((x) => x.m.id)); for (const id of Object.keys(fa.market)) if (!un.has(id)) delete fa.market[id]; }
  news(f, $L('franchise.the_season_begins', { year: yearOf(f.season.year) }), 'info');
  seasonCaptains(f, f.season.year); // every club names its captains for the new season (the owner's offseason pick, else the suggestion)
  return { ok: true, events };
}

/** Headless: simulate the player's game too (for Key Moments "sim to end" and tests). */
export function simulatePlayerGame(f) {
  ensureCaptains(f);
  const m = sundayMatchup(f); if (!m) return null;
  const toss = pregamePossession(f); // the pregame Clash decides possession (headless: Auto, and the AI's choice when it wins)
  const { r, save } = frng(f);
  const game = playGame({ home: m.home, away: m.away, venue: gameVenue(f, m.home.name, m.away.name), seed: r.seed(), quarterLength: f.settings.quarterLength, comeback: comebackRule(f), coinWinner: toss.coinWinner, choice: toss.choice, otPeriods: OT_PERIODS, statusCarry: toss.statusCarry || null });
  save();
  settleTiebreak(f, game); // still tied after the overtime quarter: the overtime Clash decides (headless: Auto)
  return game;
}

// ------------------------------------------------------------ the overtime Clash (Beast Clash in Franchise Mode, GDD §26.3)
// Football plays one overtime period. If the score is still tied, a Beast Clash decides the game: 3v3 in the regular season, 5v5
// in the playoffs. The football score stands as played; the Clash is recorded separately and names the winner.
export const OT_PERIODS = 1;
export function overtimePreview(f) {
  const m = sundayMatchup(f); if (!m) return { ok: false, reason: $t('franchise.no_game_today') };
  const theirs = m[m.playerSide === 'home' ? 'away' : 'home'];
  const n = m.playoff ? CLASH_SIZE.overtimePlayoff : CLASH_SIZE.overtime;
  const eligible = eligibleBattlers(f.roster);
  const wild = autoLineup(theirs.roster, n, hashString(`${f.seed}|ot|${f.season.year}|${f.season.week}|${theirs.name}`));
  const size = Math.min(n, eligible.length, wild.length);
  if (size < 1) return { ok: false, reason: $t('franchise.nobody_healthy_enough_to_battle'), eligible, size: 0, opponent: m.opponent };
  return { ok: true, eligible, size, full: n, wild: wild.slice(0, size), lineup: autoLineup(f.roster, size, hashString(`${f.seed}|ot|${f.season.year}|${f.season.week}`)), opponent: m.opponent, matchup: m, playoff: !!m.playoff };
}
/**
 * The deciding Clash's continuity with its game (spec §10, §12; D10-D12): the battlers' football statuses carry in 1:1 (the engine
 * converts the payloads: Stunned per B18, Shielded per D11, unsupported ones clear) and a monster exhausted in the game fights on
 * halved attributes. The football state is the game on screen (`f.game.state`) or the one a headless caller passes.
 */
function overtimeCarry(f, state, ids) {
  const gs = state || f.game?.state || null; if (!gs) return { carryIn: null, exhausted: null };
  const book = gs.t8?.status || {}; const carryIn = {}; for (const id of ids) if (book[id]) carryIn[id] = book[id];
  return { carryIn: Object.keys(carryIn).length ? carryIn : null, exhausted: t8ExhaustedSet(gs) };
}
export function startOvertimeClash(f, { lineup = null, mode = 'watch', state = null } = {}) {
  if (f.week.overtime && f.week.overtime.status !== 'ready') return { ok: false, reason: $t('franchise.the_overtime_clash_is_already_under') };
  const pv = overtimePreview(f); if (!pv.ok) return pv;
  const eligibleIds = new Set(pv.eligible.map((x) => x.id));
  const mine = (lineup || pv.lineup.map((x) => x.id)).filter((id, i, arr) => eligibleIds.has(id) && arr.indexOf(id) === i).slice(0, pv.size);
  if (!mine.length) return { ok: false, reason: $t('franchise.pick_at_least_one_healthy_monster') };
  const size = Math.min(pv.size, mine.length);
  const { r, save } = frng(f); const seed = r.seed(); save();
  const theirs = pv.wild.slice(0, size);
  const { carryIn, exhausted } = overtimeCarry(f, state, [...mine, ...theirs.map((x) => x.id)]);
  const snap = (m) => snapMonster(m, { exhausted: !!exhausted?.has(m.id) });
  f.week.overtime = { opponent: pv.opponent, side: pv.matchup.playerSide, playoff: pv.playoff, seed, size, mine, theirs: theirs.map((x) => x.id), a: mine.map((id) => snap(f.roster.find((m) => m.id === id))), b: theirs.map(snap), ...newBattleRecord({ occasion: 'overtime', mode, carryIn }) };
  return { ok: true, overtime: f.week.overtime };
}
export function overtimeBattle(f, { log = 'full' } = {}) {
  const e = f.week.overtime; if (!e || !e.seed) return null;
  upgradeUnresolvedRecord(e); return runRecord(e, { log });
}
/** Task 10: the overtime Clash's live continuous battle (Watch), or null. */
export function overtimeSession(f) { const e = f.week.overtime; if (!e || !e.seed) return null; upgradeUnresolvedRecord(e); return recordSession(e); }
export function overtimeDecide(f, ex, choice) {
  const e = f.week.overtime; if (!e || e.status !== 'battle') return { ok: false, reason: $t('franchise.no_battle_in_progress') };
  if (isT8Record(e)) return recordDecision(e, ex, choice) ? { ok: true } : { ok: false, reason: $t('franchise.not_a_legal_rotation_decision') };
  if (choice === 'stay') for (let k = 0; k < SWAP_EVERY; k++) e.decisions[ex + k] = 'stay'; else e.decisions[ex] = choice;
  return { ok: true };
}
export function resolveOvertimeClash(f, { headless = false } = {}) {
  const e = f.week.overtime; if (!e) return { ok: false, reason: $t('franchise.no_overtime_clash') };
  if (e.status !== 'battle') return { ok: true, overtime: e, already: true, won: e.result?.winner === 'a' };
  const bp = battleOrPending(e, () => overtimeBattle(f), headless); if (!bp.result) return { ok: false, ...bp }; const result = bp.result;
  const { r, save } = frng(f);
  const events = applyBattleEffects(f.roster, result, 'a', 'overtime', r, { autoSpend: !!f.settings.autoPoints, ledger: (f.rewardLedger ||= createRewardLedger()), activityId: `${`clash:${f.season.year}:w${f.season.week}:overtime:${actClub(f.club)}`}`, masteryScope: `game:${gameActivityId(f, f.club)}` });
  aiClashEffects(f, aiTeam(f, e.opponent), result, 'b', 'overtime', r);
  save();
  e.result = battleSummary(result); e.events = events; e.status = 'done';
  if (isT8Record(e)) { e.carryOut = carryOutOf(result); e.mastery = masteryRecord(result, `${`game:${f.season.year}:w${f.season.week}:${actClub(f.club)}`}`); } // the OT Clash shares its game's cap scope (§6)
  return { ok: true, overtime: e, won: result.winner === 'a', result, events };
}
/** The Clash's verdict written onto the finished football state: `winner` is set, the score is untouched, `tiebreak` records the Clash. The game is now actually over, so every status clears (§10). */
export function applyTiebreak(f, state) {
  const e = f.week.overtime; if (!state?.needsTiebreak || state.winner || !e || e.status !== 'done') return false;
  const won = e.result.winner === 'a'; const me = e.side; state.winner = won ? me : (me === 'home' ? 'away' : 'home');
  state.tiebreak = { kind: 'clash', size: e.size, winner: state.winner, by: e.result.by, exchanges: e.result.exchanges, playerWon: won };
  t8AtGameEnd(state);
  return true;
}
/** Headless: settle a tied game with an Auto overtime Clash (a battle left at a prompt is finished with Auto, D1). */
export function settleTiebreak(f, state) {
  if (!state?.needsTiebreak || state.winner) return false;
  if (!f.week.overtime || f.week.overtime.status === 'ready') { const st = startOvertimeClash(f, { mode: 'skip', state }); if (!st.ok) { state.winner = null; t8AtGameEnd(state); return false; } }
  const e = f.week.overtime;
  if (e.status === 'battle') { if (!isT8Record(e) && policiesOf(e).a === 'manual') { e.policies = { a: 'smart', b: 'smart' }; e.mode = 'watch'; } resolveOvertimeClash(f, { headless: true }); } // a legacy Play battle left mid-decision: settled as it would have been in Auto
  return applyTiebreak(f, state);
}
/** Headless overtime Clash for a tied league game between two AI clubs: 3v3 in the season, 5v5 in the playoffs. Statuses carry in from the game and clear when it is decided. */
export function leagueTiebreak(f, r, home, away, state, { playoff = false } = {}) {
  if (!state.needsTiebreak || state.winner) return null;
  const n = playoff ? CLASH_SIZE.overtimePlayoff : CLASH_SIZE.overtime;
  const a = autoLineup(home.roster, n, hashString(`${f.seed}|ot|${f.season.year}|${f.season.week}|${home.name}`));
  const b = autoLineup(away.roster, n, hashString(`${f.seed}|ot|${f.season.year}|${f.season.week}|${away.name}`));
  if (!a.length || !b.length) { state.winner = r.chance(0.5) ? 'home' : 'away'; t8AtGameEnd(state); return { kind: 'coin' }; }
  const { carryIn, exhausted } = overtimeCarry(f, state, [...a, ...b].map((m) => m.id));
  const snap = (m) => snapMonster(m, { exhausted: !!exhausted?.has(m.id) });
  const result = runBattle({ a: a.map(snap), b: b.map(snap), seed: r.seed(), log: 'none', ruleset: 't8', context: 'overtime', policies: { a: 'ai', b: 'ai' }, carryIn });
  aiClashEffects(f, home, result, 'a', 'overtime', r); aiClashEffects(f, away, result, 'b', 'overtime', r);
  state.winner = result.winner === 'a' ? 'home' : 'away';
  state.tiebreak = { kind: 'clash', size: Math.min(a.length, b.length), winner: state.winner, by: result.by, exchanges: result.exchanges };
  t8AtGameEnd(state);
  return state.tiebreak;
}

// ------------------------------------------------------------ the pregame Clash (Beast Clash in Franchise Mode, GDD §26.2)
// The coin toss is a 3v3 Beast Clash between the two Sunday rosters. The winner chooses: receive, defer or kick. When the AI wins
// it chooses for itself (defer two times in three, as the coin-toss AI did). Every league game is decided the same way, headless.
/** Who can battle today and the proposed lineups (yours and theirs). Reasons when no battle can happen. */
export function pregamePreview(f) {
  const m = sundayMatchup(f); if (!m) return { ok: false, reason: $t('franchise.no_game_today') };
  if (m.forfeit) return { ok: false, reason: m.forfeitReason || $t('franchise.no_legal_lineup') };
  const theirs = m[m.playerSide === 'home' ? 'away' : 'home'];
  const eligible = eligibleBattlers(f.roster);
  const wild = autoLineup(theirs.roster, CLASH_SIZE.pregame, hashString(`${f.seed}|pre|${f.season.year}|${f.season.week}|${theirs.name}`));
  const size = Math.min(CLASH_SIZE.pregame, eligible.length, wild.length);
  if (size < 1) return { ok: false, reason: $t('franchise.nobody_healthy_enough_to_battle'), eligible, size: 0, opponent: m.opponent };
  return { ok: true, eligible, size, wild: wild.slice(0, size), lineup: autoLineup(f.roster, size, hashString(`${`${f.seed}|pre|${f.season.year}|${f.season.week}`}`)), opponent: m.opponent, matchup: m };
}
export function startPregameClash(f, { lineup = null, mode = 'watch' } = {}) {
  if (f.season.day !== 6) return { ok: false, reason: $t('franchise.not_sunday') };
  if (f.game) return { ok: false, reason: $t('franchise.the_game_has_already_started') };
  if (f.week.pregame && f.week.pregame.status !== 'ready') return { ok: false, reason: $t('franchise.the_pregame_clash_is_already_under') };
  const pv = pregamePreview(f); if (!pv.ok) return pv;
  const eligibleIds = new Set(pv.eligible.map((x) => x.id));
  const mine = (lineup || pv.lineup.map((x) => x.id)).filter((id, i, arr) => eligibleIds.has(id) && arr.indexOf(id) === i).slice(0, pv.size);
  if (!mine.length) return { ok: false, reason: $t('franchise.pick_at_least_one_healthy_monster') };
  const size = Math.min(pv.size, mine.length);
  const { r, save } = frng(f); const seed = r.seed(); save();
  const theirs = pv.wild.slice(0, size);
  // Task 8 M4 (S12): the opening Clash is a version-2 t8 record in the 'opening' context: the statuses its battlers end with carry
  // into the game at kickoff (`carryOut`, spec §10). Nothing carries in: the previous game's end cleared every status.
  f.week.pregame = { opponent: pv.opponent, side: pv.matchup.playerSide, seed, size, mine, theirs: theirs.map((x) => x.id), a: mine.map((id) => snapMonster(f.roster.find((m) => m.id === id))), b: theirs.map((m) => snapMonster(m)), ...newBattleRecord({ occasion: 'pregame', mode }), choice: null };
  return { ok: true, pregame: f.week.pregame };
}
export function pregameBattle(f, { log = 'full' } = {}) {
  const e = f.week.pregame; if (!e || !e.seed) return null;
  upgradeUnresolvedRecord(e); return runRecord(e, { log });
}
/** Task 10: the pregame Clash's live continuous battle (Watch), or null. */
export function pregameSession(f) { const e = f.week.pregame; if (!e || !e.seed) return null; upgradeUnresolvedRecord(e); return recordSession(e); }
export function pregameDecide(f, ex, choice) {
  const e = f.week.pregame; if (!e || e.status !== 'battle') return { ok: false, reason: $t('franchise.no_battle_in_progress') };
  if (isT8Record(e)) return recordDecision(e, ex, choice) ? { ok: true } : { ok: false, reason: $t('franchise.not_a_legal_rotation_decision') };
  if (choice === 'stay') for (let k = 0; k < SWAP_EVERY; k++) e.decisions[ex + k] = 'stay'; else e.decisions[ex] = choice;
  return { ok: true };
}
/** Settle the pregame Clash: XP and fatigue for your battlers; the AI's possession choice is drawn now if it won. */
export function resolvePregameClash(f, { headless = false } = {}) {
  const e = f.week.pregame; if (!e) return { ok: false, reason: $t('franchise.no_pregame_clash') };
  if (e.status !== 'battle') return { ok: true, pregame: e, already: true, won: e.result?.winner === 'a' };
  const bp = battleOrPending(e, () => pregameBattle(f), headless); if (!bp.result) return { ok: false, ...bp }; const result = bp.result;
  const { r, save } = frng(f);
  const events = applyBattleEffects(f.roster, result, 'a', 'pregame', r, { autoSpend: !!f.settings.autoPoints, ledger: (f.rewardLedger ||= createRewardLedger()), activityId: `${`clash:${f.season.year}:w${f.season.week}:pregame:${actClub(f.club)}`}`, masteryScope: `game:${gameActivityId(f, f.club)}` });
  aiClashEffects(f, aiTeam(f, e.opponent), result, 'b', 'pregame', r);
  const won = result.winner === 'a';
  if (!won) e.choice = aiPossessionChoice(r);
  save();
  e.result = battleSummary(result); e.events = events; e.status = won ? 'choose' : 'done';
  if (isT8Record(e)) { e.carryOut = carryOutOf(result); e.mastery = masteryRecord(result, `${`game:${f.season.year}:w${f.season.week}:${actClub(f.club)}`}`); } // the opening Clash shares its game's cap scope (§6)
  return { ok: true, pregame: e, won, result, events };
}
/** The winner's possession choice (only the player chooses here; the AI chose when the battle was settled). */
export function choosePossession(f, choice) {
  const e = f.week.pregame; if (!e || e.status !== 'choose') return { ok: false, reason: $t('franchise.it_is_not_your_choice_to') };
  if (!POSSESSION_CHOICES.includes(choice)) return { ok: false, reason: $t('franchise.choose_receive_defer_or_kick') };
  e.choice = choice; e.status = 'done'; return { ok: true };
}
/** The opening possession for the football engine: { coinWinner: 'home'|'away', choice }. Settles a pending Clash headless (Auto) when needed. */
export function pregamePossession(f) {
  const m = sundayMatchup(f); if (!m) return { coinWinner: null, choice: null };
  if (!f.week.pregame || f.week.pregame.status === 'ready') { const st = startPregameClash(f); if (!st.ok) return { coinWinner: null, choice: null, reason: st.reason }; }
  const e = f.week.pregame;
  if (e.status === 'battle') { if (!isT8Record(e) && policiesOf(e).a === 'manual') { e.policies = { a: 'smart', b: 'smart' }; e.mode = 'watch'; } resolvePregameClash(f, { headless: true }); }
  if (e.status === 'choose') { e.choice = 'receive'; e.status = 'done'; }
  const won = e.result?.winner === 'a'; const me = e.side; const them = me === 'home' ? 'away' : 'home';
  return { coinWinner: won ? me : them, choice: e.choice || 'receive', clash: e.result, statusCarry: e.carryOut || null }; // statusCarry: the opening Clash's statuses for kickoff (§10)
}
/** Both sides of a franchise Clash develop under the same reward/knowledge rules. */
function aiClashEffects(f, team, result, side, occasion, r) {
  if (!leagueBooks(f, team.name)) return [];
  const events = applyBattleEffects(team.roster, result, side, occasion, r, { autoSpend: true, ledger: (f.rewardLedger ||= createRewardLedger()), activityId: `${`clash:${gameActivityId(f, team.name)}:${occasion}`}`, masteryScope: `game:${gameActivityId(f, team.name)}` });
  Object.assign(team, buildTeam({ ...team, manual: team.chart }));
  return events;
}
/** Headless pregame Clash for a league game between two AI clubs: both lineups automatic, the AI policy on both sides, one seed. Its end statuses carry into the game. */
export function leaguePregame(f, r, home, away) {
  const a = autoLineup(home.roster, CLASH_SIZE.pregame, hashString(`${f.seed}|pre|${f.season.year}|${f.season.week}|${home.name}`));
  const b = autoLineup(away.roster, CLASH_SIZE.pregame, hashString(`${f.seed}|pre|${f.season.year}|${f.season.week}|${away.name}`));
  if (!a.length || !b.length) return { coinWinner: null, choice: null, clash: null, statusCarry: null };
  const result = runBattle({ a: a.map((m) => snapMonster(m)), b: b.map((m) => snapMonster(m)), seed: r.seed(), log: 'none', ruleset: 't8', context: 'opening', policies: { a: 'ai', b: 'ai' } });
  aiClashEffects(f, home, result, 'a', 'pregame', r); aiClashEffects(f, away, result, 'b', 'pregame', r);
  return { coinWinner: result.winner === 'a' ? 'home' : 'away', choice: aiPossessionChoice(r), clash: battleSummary(result), statusCarry: carryOutOf(result) };
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
  // Captain Partnerships (GDD §27.4B)
  'chooseInitialCaptains', 'pickCaptains', 'ensureCaptains', 'seasonCaptains',
]);
export const isReadOnly = isArchived;
/* eslint-disable no-func-assign */
openCreationDraft = guarded(openCreationDraft); startSeason = guarded(startSeason); startNextSeason = guarded(startNextSeason); finishSunday = guarded(finishSunday); takeBye = guarded(takeBye); forfeitSunday = guarded(forfeitSunday); advancePlayoffs = guarded(advancePlayoffs); skipPlayoffs = guarded(skipPlayoffs); simulatePlayerGame = guarded(simulatePlayerGame); finalizeAwards = guarded(finalizeAwards); autoRunToSunday = guarded(autoRunToSunday); skipToByeIfIdle = guarded(skipToByeIfIdle); recoveryDay = guarded(recoveryDay); lineupCheck = guarded(lineupCheck);
scoutRegion = guarded(scoutRegion); recruit = guarded(recruit); skipRecruit = guarded(skipRecruit); startEncounter = guarded(startEncounter); encounterBattle = guarded(encounterBattle); encounterDecide = guarded(encounterDecide); resolveEncounter = guarded(resolveEncounter); acceptOffer = guarded(acceptOffer); declineOffer = guarded(declineOffer); setTraining = guarded(setTraining); scoutOpponent = guarded(scoutOpponent); setGamePlan = guarded(setGamePlan); answerMedia = guarded(answerMedia); mediaQuestions = guarded(mediaQuestions);
recordPlayStats = guarded(recordPlayStats); startPregameClash = guarded(startPregameClash); pregameBattle = guarded(pregameBattle); pregameDecide = guarded(pregameDecide); resolvePregameClash = guarded(resolvePregameClash); choosePossession = guarded(choosePossession); startOvertimeClash = guarded(startOvertimeClash); overtimeBattle = guarded(overtimeBattle); overtimeDecide = guarded(overtimeDecide); resolveOvertimeClash = guarded(resolveOvertimeClash); applyTiebreak = guarded(applyTiebreak); settleTiebreak = guarded(settleTiebreak);
assignSlot = guarded(assignSlot); autoDepth = guarded(autoDepth); moveDepth = guarded(moveDepth); releaseMonster = guarded(releaseMonster); toPool = guarded(toPool); evolveMonster = guarded(evolveMonster); spendAttributePoint = guarded(spendAttributePoint); autoSpendAllPoints = guarded(autoSpendAllPoints); devGrantLegendary = guarded(devGrantLegendary); syncLegendary = guarded(syncLegendary);
hireStaff = guarded(hireStaff); replaceStaff = guarded(replaceStaff); hireDefaultStaff = guarded(hireDefaultStaff);
chooseInitialCaptains = guarded(chooseInitialCaptains); pickCaptains = guarded(pickCaptains); ensureCaptains = guarded(ensureCaptains); seasonCaptains = guarded(seasonCaptains);
resolveContract = guarded(resolveContract); signFreeAgent = guarded(signFreeAgent); offseasonMarket = guarded(offseasonMarket); ensureDraftClass = guarded(ensureDraftClass); scoutDraft = guarded(scoutDraft); beginDraft = guarded(beginDraft); myDraftPick = guarded(myDraftPick); passDraftPick = guarded(passDraftPick); tradeAskPlayer = guarded(tradeAskPlayer); tradeAskPicks = guarded(tradeAskPicks); acceptTrade = guarded(acceptTrade); maybeTradeCall = guarded(maybeTradeCall); answerTradeCall = guarded(answerTradeCall);
chooseGoal = guarded(chooseGoal); commissionerReview = guarded(commissionerReview); commissionerRelease = guarded(commissionerRelease); resolvePostseason = guarded(resolvePostseason); chooseLegendTrack = guarded(chooseLegendTrack); replyToCoach = guarded(replyToCoach);
checkAchievements = guarded(checkAchievements); backfillAchievements = guarded(backfillAchievements); nextScene = guarded(nextScene); dismissScene = guarded(dismissScene); hallOfFameNotice = guarded(hallOfFameNotice); dexRecord = guarded(dexRecord); news = guarded(news); retire = guarded(retire);
ensureLeague = guarded(ensureLeague);
/* eslint-enable no-func-assign */
