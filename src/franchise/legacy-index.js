// Task 9: compact, read-only historical index from existing franchise facts.
// No gameplay mutations, speculative rosters, or fabricated historical outcomes.
import { monsterHofInductees } from './monster-hof-voting.js';

const yearSort = (a, b) => (a.year ?? 0) - (b.year ?? 0);
const safe = (v) => v && typeof v === 'object' ? v : {};
const winnerId = (winner) => winner?.id ?? null;

/** Permanent season summaries, excluding full game logs and league tables. */
export function franchiseSeasonHistory(f) {
  return (f?.history || []).map((h) => ({
    year: h.year, club: h.club, tier: h.tier, record: h.record ? { ...h.record } : null,
    place: h.place ?? null, champion: h.champion ?? null, playoffs: h.playoffs ?? null,
    awards: Object.fromEntries(Object.entries(safe(h.awards)).map(([kind, winners]) =>
      [kind, (Array.isArray(winners) ? winners : winners ? [winners] : []).map((w) =>
        ({ id: winnerId(w), name: w?.name ?? null, team: w?.team ?? null }))])),
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
  const elections = f?.monsterHallOfFame?.elections || [];
  return { elections: elections.map((e) => ({
    year: e.year, candidates: e.ballot?.length || 0,
    inductees: (e.inductees || []).map((c) => ({ ...c })),
  })).sort(yearSort), inductees: monsterHofInductees(elections) };
}

/** Cross-system view for the franchise history screen. */
export function franchiseLegacyIndex(f) {
  const seasons = franchiseSeasonHistory(f);
  return {
    seasons, championships: championshipHistory(f), awards: historicalAwards(f),
    hallOfFame: historicalHallOfFame(f),
    completedSeasons: seasons.length,
    ownerTitles: seasons.filter((s) => s.champion != null && s.champion === s.club).length,
  };
}
