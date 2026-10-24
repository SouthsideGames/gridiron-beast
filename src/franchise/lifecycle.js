// Franchise lifecycle (GDD §42.1, §42.4; Phase 2). A franchise is `active` while it plays, and becomes a read-only archive,
// `retired` or `fired`, through one guarded set of steps that run only after a season is complete. Nothing here deletes
// anything: an archive keeps its history, roster, awards, records and careers, and stays in its slot until the owner deletes
// it (export first, §42.5).
//
// Rules: at most SEASON_CAP complete seasons (retirement is mandatory after Season 20, once that season has run in full);
// voluntary retirement is available once the Hall of Fame checklist is met (decision R); a franchise already beyond the cap
// finishes its current season first (decision M); a Hall of Fame card is written only when the checklist is met (decision L);
// every mutating entry point refuses an archived franchise (`assertActive`).

import { monsterOverall } from '../data/monsters.js';
import { divisionOf, TIERS } from '../data/league.js';
import { GYM_BY_CLUB } from '../data/gyms.js';
import { careerSnapshot } from './career-profile.js';

export const SEASON_CAP = 20;
export const ARCHIVE_STATUSES = Object.freeze(['retired', 'fired']);

export const seasonsCompleted = (f) => (f?.history || []).length;
/**
 * An archive is a franchise whose retirement steps have run: it carries its Legacy record. A franchise the board has just
 * fired is not an archive yet (Phase 1 already recorded `status: 'fired'` for it): its season is settled, then it is archived.
 */
export const isArchived = (f) => !!f?.lifecycle?.legacy && ARCHIVE_STATUSES.includes(f.lifecycle.status);
/** The same test on a stored manifest, whose lifecycle carries the Legacy headline instead of the record. */
export const isArchivedManifest = (m) => !!m?.lifecycle?.legacyHeadline && ARCHIVE_STATUSES.includes(m.lifecycle.status);
/** The status shown: the archive's, else fired/active from the board. */
export const lifecycleStatus = (f) => (isArchived(f) ? f.lifecycle.status : (f?.board?.fired ? 'fired' : 'active'));
export const isRetired = (f) => isArchived(f) && f.lifecycle.status === 'retired';

/** The error every mutating function returns for an archive. `code: 'read-only'`, worded for the player. */
export function readOnlyError(f) {
  const fired = lifecycleStatus(f) === 'fired';
  return Object.assign(new Error(fired ? 'This franchise ended when the board let you go: it is a read-only archive.' : 'This franchise is retired: it is a read-only archive.'), { code: 'read-only', status: lifecycleStatus(f) });
}
export function assertActive(f) { if (f && typeof f === 'object' && isArchived(f)) throw readOnlyError(f); }
/** Wrap a mutating function whose first argument is the franchise: an archive gets the read-only error instead. */
export const guarded = (fn) => function guardedMutator(f, ...rest) { assertActive(f); return fn.call(this, f, ...rest); };

// ------------------------------------------------------------ when retirement is due
/**
 * Why retirement is due now, or null: 'fired' (the board let the owner go), 'season-cap' (SEASON_CAP seasons complete),
 * 'voluntary' (the owner asked, §42.4). Only ever after the season is complete; never inside one.
 */
export function retirementDue(f) {
  if (!f || isArchived(f) || !f.season?.finished) return null;
  if (f.board?.fired) return 'fired';
  if (seasonsCompleted(f) >= SEASON_CAP) return 'season-cap';
  if (f.lifecycle?.pendingRetirement) return 'voluntary';
  return null;
}
/** Seasons the franchise may still begin: 0 at the cap. A grandfathered franchise beyond the cap gets 0 too (decision M). */
export const seasonsLeft = (f) => Math.max(0, SEASON_CAP - seasonsCompleted(f));
/** Can a new season start, as far as the lifecycle is concerned? {ok, reason} */
export function mayStartSeason(f) {
  if (isArchived(f)) return { ok: false, reason: readOnlyError(f).message };
  if (seasonsCompleted(f) >= SEASON_CAP) return { ok: false, reason: `This franchise has completed its ${SEASON_CAP} seasons. Retire it to the Hall of Fame and the Franchise Legacy; a new franchise can begin in another slot.`, cap: true };
  return { ok: true };
}

/** The owner asks to retire (available once the Hall of Fame checklist is met: the caller checks). Takes effect at season end. */
export function requestRetirement(f) { assertActive(f); f.lifecycle = { ...(f.lifecycle || {}), pendingRetirement: true, retirementRequestedAt: Date.now() }; return { ok: true, immediate: !!f.season?.finished }; }
export function cancelRetirement(f) { assertActive(f); if (f.lifecycle) { delete f.lifecycle.pendingRetirement; delete f.lifecycle.retirementRequestedAt; } return { ok: true }; }

// ------------------------------------------------------------ the checklist (GDD §42.4)
/** Every condition that must hold before the archive is written. `ready` only when all do; `rows` explain each. */
export function retirementChecklist(f) {
  const s = f?.season || {}; const last = f?.history?.[f.history.length - 1];
  const rows = [
    { key: 'finished', label: 'The season is complete', ok: !!s.finished },
    { key: 'champion', label: 'The Beast Bowl has a champion', ok: !!s.playoffs?.champion },
    { key: 'awards', label: 'The season awards are written', ok: !!s.awards && !!last?.awards },
    { key: 'history', label: 'The season is in the history', ok: !!last && last.year === s.year },
    { key: 'tables', label: 'The league tables are archived', ok: !!last?.leagueStats },
    { key: 'records', label: 'The records book is written', ok: !!f?.records },
    { key: 'news', label: 'League News is written', ok: Array.isArray(f?.leagueNews) },
    { key: 'noGame', label: 'No game is in progress', ok: !f?.game || !!f.game.state?.finished },
    { key: 'noScene', label: 'No scene is waiting', ok: !(f?.scenes?.length) },
  ];
  return { rows, ready: rows.every((r) => r.ok), missing: rows.filter((r) => !r.ok).map((r) => r.label) };
}

// ------------------------------------------------------------ the Franchise Legacy summary (GDD §42.4 step 4)
const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };
/** Built from the save's own records, never invented: a field is null when the save holds nothing for it. */
export function buildLegacy(f, { now = Date.now(), reason = 'retired' } = {}) {
  const hist = f.history || []; const c = f.campaign || {};
  const seasons = hist.map((h) => ({ year: h.year, club: h.club, tier: h.tier ?? null, w: h.record?.w ?? 0, l: h.record?.l ?? 0, t: h.record?.t ?? 0, place: h.place ?? null, playoffs: !!h.playoffs, champion: h.champion === h.club, runnerUp: !!(h.championship === undefined && h.final?.loser === h.club) || null, boardGoalMet: f.board?.history?.find((g) => g.year === h.year)?.met ?? null }));
  const record = seasons.reduce((a, h) => ({ w: a.w + h.w, l: a.l + h.l, t: a.t + h.t }), { w: 0, l: 0, t: 0 });
  const titles = c.titles ?? seasons.filter((h) => h.champion).length;
  const tier = TIERS.find((t) => t.id === f.tier) || null;
  const recordsHeld = safe(() => Object.values(f.records?.season || {}).filter((r) => r && r.team === f.club).length, null);
  const roster = f.roster || [];
  const best = roster.slice().sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, 5)
    .map((m) => ({ id: m.id, name: m.name, species: m.species, position: m.position, ovr: monsterOverall(m), level: m.level, career: safe(() => careerSnapshot(f, m), null) }));
  const rival = f.rivals?.[f.tier] || null;
  return {
    v: 1, reason, archivedAt: now,
    owner: f.owner ? { first: f.owner.first, last: f.owner.last, portrait: f.owner.portrait ?? null } : null, club: f.club, division: divisionOf(f.club) || null,
    tier: tier ? { id: tier.id, name: tier.name, rank: tier.rank } : (f.tier ?? null), difficulty: f.settings?.difficulty || null,
    seasonsCompleted: hist.length, finalYear: f.season?.year ?? null, record,
    titles, playoffAppearances: seasons.filter((h) => h.playoffs).length,
    beastBowls: { won: titles, appearances: null }, // appearances beyond titles are not recorded by the game today: shown as unavailable
    badges: Object.keys(c.badges || {}).map((club) => ({ club, badge: GYM_BY_CLUB[club]?.badge || club, year: c.badges[club]?.year ?? null })),
    leagueAwards: c.awards ?? null, recordsHeld,
    bestMonsters: best, rosterSize: roster.length,
    rival: rival ? { team: rival.team, gm: rival.gm, headToHead: { ...(rival.headToHead || {}) } } : null,
    board: f.board ? { confidence: f.board.confidence ?? null, fired: !!f.board.fired, history: (f.board.history || []).map((g) => ({ ...g })) } : null,
    hallOfFame: null, // the card id, set by the archive step when a card was written
    seasons,
  };
}

// ------------------------------------------------------------ the archive (GDD §42.4 steps 2–6)
/** Working-only state an archive does not need (step 5). Nothing historical is touched. */
export function compactForArchive(f) {
  delete f.draft; delete f.offseason; delete f.game; delete f.lastGame; delete f.pickAsks;
  if (f.league) { delete f.league.waivers; delete f.leagueOffseason; } // the league's working lists go; its rosters, books and legends are part of the archive (GDD §42.6)
  if (f.season) { f.season.recorded = []; }
  f.scenes = [];
  // the week keeps its shape (readers expect a plan and lists) but no working content
  f.week = { region: null, prospects: [], recruitAttempts: 0, recruited: null, encounter: null, pregame: null, overtime: null, trainingFocus: null, scoutReport: null, plan: { offense: [], defense: [] }, lineupChecked: false, gameResult: f.week?.gameResult ?? null, events: [], media: f.week?.media ?? null };
  if (f.postseason) f.postseason.resolved = true;
  if (f.legendPick) f.legendPick.resolved = true;
  return f;
}
/**
 * Turn a franchise whose season is complete into an archive, in place. `reason`: 'season-cap' | 'voluntary' | 'fired'.
 * `hofCard`: the Hall of Fame card already built by the game when the checklist is met (its id is recorded here).
 * Returns { ok, legacy } or { ok: false, reason, missing } when the checklist does not hold; then nothing is changed.
 */
export function finalizeArchive(f, { reason, hofCard = null, now = Date.now() } = {}) {
  if (isArchived(f)) return { ok: false, reason: 'already archived', legacy: f.lifecycle?.legacy || null };
  const why = reason || retirementDue(f); if (!why) return { ok: false, reason: 'Retirement is not due.' };
  const check = retirementChecklist(f); if (!check.ready) return { ok: false, reason: `The season must be settled first: ${check.missing.join('; ')}.`, missing: check.missing };
  const legacy = buildLegacy(f, { now, reason: why === 'fired' ? 'fired' : 'retired' });
  if (hofCard?.id) legacy.hallOfFame = hofCard.id;
  compactForArchive(f);
  const status = why === 'fired' ? 'fired' : 'retired';
  f.lifecycle = { ...(f.lifecycle || {}), status, seasonsCompleted: seasonsCompleted(f), finalSeason: f.season?.year ?? null, legacy, ...(status === 'fired' ? { firedAt: now } : { retiredAt: now }), retirementReason: why };
  delete f.lifecycle.pendingRetirement; delete f.lifecycle.retirementRequestedAt;
  return { ok: true, legacy, status };
}

/** The competitive tier line for a slot card: league/division and the tier's standing (GDD §42.5; promotion-relegation data model). */
export function competitiveTier(f) {
  const tier = TIERS.find((t) => t.id === f?.tier) || null; const div = f?.club ? divisionOf(f.club) : null;
  const q = f?.qualification?.[f?.tier]; const goal = tier?.badgeGoal;
  return { tier: tier?.name || null, division: div || null, qualification: q ?? null, badgeGoal: goal ?? null, relegationStreak: f?.bottomFourStreak ?? null };
}
