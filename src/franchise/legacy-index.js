// Task 9: compact, read-only historical index from existing franchise facts.
// No gameplay mutations, speculative rosters, or fabricated historical outcomes.
import { monsterHofInductees, WAIT_SEASONS } from './monster-hof-voting.js';
import { revealedElections } from './hall-ceremony.js';   // a sealed election (its ceremony not yet held) is shown nowhere
import { historicalRecords } from './records-history.js';

const yearSort = (a, b) => (a.year ?? 0) - (b.year ?? 0);
const safe = (v) => v && typeof v === 'object' ? v : {};
const winnerId = (winner) => winner?.id ?? null;

/** Permanent season summaries, excluding full game logs and league tables. */
export function franchiseSeasonHistory(f) {
  return (f?.history || []).map((h) => ({
    year: h.year, club: h.club, tier: h.tier, record: h.record ? { ...h.record } : null,
    place: h.place ?? null, champion: h.champion ?? null, playoffs: h.playoffs ?? null,
    // League award winners live under awards.league; other fields are
    // statistical leaders or season metadata, not additional league awards.
    awards: Object.fromEntries(Object.entries(safe(h.awards?.league)).map(([kind, winner]) =>
      [kind, winner && (winner.id != null || winner.name) ? [{
        id: winnerId(winner), name: winner.name ?? null, team: winner.team ?? null,
      }] : []])),
  })).sort(yearSort);
}

/** Real recorded champions only; absence is not interpreted as a loss. */
export function championshipHistory(f) {
  return franchiseSeasonHistory(f).filter((s) => s.champion != null)
    .map(({ year, champion, club }) => ({ year, champion, ownerWon: champion === club }));
}

/** Award index across recorded seasons. Winner rows remain linked to their saved year. */
export function historicalAwards(f, kind = null) {
  const out = [];
  for (const s of franchiseSeasonHistory(f)) for (const [award, winners] of Object.entries(s.awards)) {
    if (kind != null && award !== kind) continue;
    for (const w of winners) if (w?.id != null || w?.name) out.push({ year: s.year, award, ...w });
  }
  return out.sort((a, b) => b.year - a.year || a.award.localeCompare(b.award));
}

/** Annual Hall of Fame elections and inductees are read from the franchise save. */
export function historicalHallOfFame(f) {
  const elections = revealedElections(f);
  const inductees = monsterHofInductees(elections);
  const inductedIds = new Set(inductees.map((c) => String(c.id)));
  const candidates = (f?.monsterHallOfFame?.candidates || []).map((c) => ({
    id: c.id, name: c.name, position: c.position,
    retiredYear: c.retiredYear, seasons: c.seasons, games: c.games,
    honours: c.honours ? { ...c.honours } : null,
    inducted: inductedIds.has(String(c.id)),
  }));
  return {
    elections: elections.map((e) => ({
      year: e.year, candidates: e.ballot?.length || 0,
      ballot: (e.ballot || []).map((b) => ({ ...b })),
      inductees: (e.inductees || []).map((c) => ({ ...c })),
    })).sort(yearSort),
    inductees, candidates,
  };
}

/** Cross-system view for the franchise history screen. */
export function franchiseLegacyIndex(f) {
  const seasons = franchiseSeasonHistory(f);
  return {
    seasons, championships: championshipHistory(f), awards: historicalAwards(f),
    hallOfFame: historicalHallOfFame(f), records: historicalRecords(f),
    completedSeasons: seasons.length,
    ownerTitles: seasons.filter((s) => s.champion != null && s.champion === s.club).length,
  };
}

/**
 * Where one monster stands with the Monster Hall of Fame, from the saved candidates and elections only:
 * { candidate, induction, eligibleYear, lastBallot, ballots } or null when the Hall has no record of him.
 * `eligibleYear` is the first election he can appear in (retirement year + the waiting period).
 */
export function monsterHallStatus(f, id) {
  if (id == null) return null;
  const hof = f?.monsterHallOfFame; const key = String(id);
  const candidate = (hof?.candidates || []).find((c) => String(c.id) === key) || null;
  const elections = revealedElections(f).slice().sort(yearSort);
  const induction = monsterHofInductees(elections).find((c) => String(c.id) === key) || null;
  if (!candidate && !induction) return null;
  const ballots = elections.flatMap((e) => (e.ballot || []).filter((b) => String(b.id) === key).map((b) => ({ year: e.year, votes: b.votes, voters: b.voters, qualified: !!b.qualified })));
  const retiredYear = candidate?.retiredYear ?? induction?.retiredYear ?? null;
  return {
    candidate: candidate ? { ...candidate, honours: candidate.honours ? { ...candidate.honours } : null } : null,
    induction, retiredYear,
    eligibleYear: Number.isInteger(retiredYear) ? retiredYear + WAIT_SEASONS : null,
    lastBallot: ballots[ballots.length - 1] || null, ballots,
  };
}

/** The franchise's own totals across every recorded season: nothing here is estimated. */
export function franchiseTotals(f) {
  const seasons = franchiseSeasonHistory(f);
  const sum = (k) => seasons.reduce((n, s) => n + (s.record?.[k] || 0), 0);
  const rated = seasons.filter((s) => s.record && (s.record.w + s.record.l + (s.record.t || 0)) > 0);
  const pct = (s) => (s.record.w + (s.record.t || 0) / 2) / (s.record.w + s.record.l + (s.record.t || 0));
  const best = rated.slice().sort((a, b) => pct(b) - pct(a) || b.record.w - a.record.w || a.year - b.year)[0] || null;
  const titleYears = seasons.filter((s) => s.champion != null && s.champion === s.club).map((s) => s.year);
  const clubAwards = seasons.flatMap((s) => Object.entries(s.awards).flatMap(([award, ws]) => ws.filter((w) => w.team != null && w.team === s.club).map((w) => ({ year: s.year, award, id: w.id, name: w.name }))));
  const recordsHeld = historicalRecords(f).flatMap((sec) => sec.rows.filter((r) => r.record && r.record.team === f?.club).map((r) => ({ scope: sec.scope, category: r.category, label: r.label, ...r.record })));
  return {
    seasons: seasons.length, w: sum('w'), l: sum('l'), t: sum('t'),
    playoffs: seasons.filter((s) => s.playoffs === true).length,
    titleYears, best: best ? { year: best.year, record: { ...best.record }, place: best.place } : null,
    clubAwards, recordsHeld,
  };
}
