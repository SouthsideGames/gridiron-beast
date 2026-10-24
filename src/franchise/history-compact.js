// Historical-data compaction (GDD §46, Phase 4; forward-only, owner's decision of 2026-10-24). The one duplicate the books
// make safe to remove: an award winner's row in the season history copies his season line, which his season book now
// holds (the owner's monsters since v39, every persistent AI monster since Phase 3). At season end the winner row drops only
// the keys his book for that year holds; every other key stays where it is, so every number keeps exactly one copy and
// `expandWinner` rebuilds the original row from the book. Nothing already in a save is touched, and a monster who leaves the
// league decorated keeps his season books in his legend stub, so the copy survives him.

import { addInto, statLine } from './stats.js';

export const COMPACT_VERSION = 1;
/** Identity and award fields a winner row always keeps (what the screens show without a book). */
export const KEEP = new Set(['id', 'name', 'type', 'species', 'position', 'age', 'yearsPro', 'team', 'games', 'starts', 'score', 'prod', 'components', 'why', 'record', 'minGames', 'rookie', 'coach', 'w', 'l', 'line', 'slim']);

/** The book of a monster for a season: { reg, post } or null. */
export function seasonBookOf(m, year) {
  const s = m?.stats; if (!s) return null;
  if (s.season?.year === year) return { reg: s.season.reg || {}, post: s.season.post || {} };
  const b = (s.seasons || []).find((x) => x.year === year); return b ? { reg: b.reg || {}, post: b.post || {} } : null;
}
/** The keys of a winner row that his regular-season book holds with the same value (the table rows awards are read from are regular season). */
export function duplicatedKeys(w, book) {
  if (!book) return [];
  return Object.keys(w).filter((k) => !KEEP.has(k) && typeof w[k] === 'number' && book.reg[k] === w[k]);
}
/**
 * Slim one winner row in place: drop the keys his book duplicates, keep the stat line as text. Returns the keys dropped.
 * `monsterOf(id)` finds the monster (roster, registry, legends) at the time of the season end.
 */
export function slimWinner(w, year, monsterOf) {
  if (!w || !w.id || w.slim) return [];
  const m = monsterOf(w.id); const book = seasonBookOf(m, year); const dup = duplicatedKeys(w, book);
  if (!dup.length) return [];
  w.line = w.line || statLine(w);
  for (const k of dup) delete w[k];
  w.slim = COMPACT_VERSION;
  return dup;
}
/** Every winner of a season's award sheet, slimmed. Returns how many keys went. */
export function slimSeasonAwards(awards, year, monsterOf) {
  let n = 0; const L = awards?.league; if (!L) return 0;
  for (const [k, w] of Object.entries(L)) { if (!w || typeof w !== 'object') continue; const copy = { ...w }; const dropped = slimWinner(copy, year, monsterOf); if (dropped.length) { L[k] = copy; n += dropped.length; } } // a copy: the season's own award sheet stays whole until the season is gone
  return n;
}
/** The original row again: the winner row with his book's regular-season numbers merged back (numbers the row still carries win). */
export function expandWinner(w, year, monsterOf) {
  if (!w || !w.slim) return w;
  const book = seasonBookOf(monsterOf(w.id), year); const out = { ...w };
  if (book) for (const [k, v] of Object.entries(book.reg)) if (typeof v === 'number' && !(k in out) && !KEEP.has(k)) out[k] = v;
  delete out.slim; return out;
}
export { addInto };
