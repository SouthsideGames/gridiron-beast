// Monster Career Injury History (GDD §50): a career record of injuries, not an injury mechanic. It never changes who gets hurt,
// for how long, or how anyone recovers; it watches `m.injury` (set by progression.js and the practice roll, cleared by the
// weekly recovery and the season rollover) at fixed points of every league game — before kickoff and after the final whistle,
// for both clubs, owner and AI alike — and writes what it sees into the optional `f.injuryHistory` record.
//
//   Before a game: injuries that appeared since the last look are opened (practice, or "before tracking began" the first
//   time); open injuries whose monster is healthy again are closed with the week of his return; every injured monster on the
//   club's roster misses this game (counted once per game id); every monster in the game-day lineup (kicker aside: injuries are
//   rolled for lineup players only) gains one appearance. Opportunity = appearances + games missed to injury.
//   After a game: injuries suffered in it are opened ("in the game against X").
//
// A new injury object is stamped with its incident key (`m.injury.rec`), so the same injury is never opened twice and a fresh
// one is never merged into an older one, even across reloads. Nothing here draws a random number or reads by the engine.
export const MIN_OPPORTUNITY = 9; // games of opportunity (in the lineup or missed to injury) before the history is classified
/**
 * Injury History classification, by two rates since tracking began, over opportunity (games in the lineup + games missed to
 * injury): games missed per game, and injuries per nine games (a regular season). High when either rate reaches its High line,
 * Moderate when either reaches its Moderate line, else Low. Calibrated on 4 franchises × 5 seasons (1,275 monsters with 9+
 * games): 84% Low, 12% Moderate, 4% High; 29% of them had no injury at all. A record of the past, not a forecast.
 */
export const INDICATOR = Object.freeze({ missedRate: { moderate: 0.05, high: 0.10 }, perSeason: { moderate: 0.6, high: 1.0 } });
export const INDICATOR_LABEL = Object.freeze({ low: 'Low Injury History', moderate: 'Moderate Injury History', high: 'High Injury History', early: 'Not enough history yet' });
const KEEP_SEASONS = 1; // the pre-game ledger keeps this season only (a game of an earlier season can no longer be played)

export const isTracking = (f) => !!f?.injuryHistory?.v;
function ensure(f) {
  return (f.injuryHistory ||= { v: 1, since: { y: f.season.year, w: f.season.week }, opp: {}, open: {}, log: {}, done: {}, seq: 0 });
}
const where = (f) => ({ y: f.season.year, w: f.season.week });

/** Open a record for a monster's current injury (stamping the injury), or return the one already open for it. */
function openFor(H, m, ctx, src) {
  const cur = H.open[m.id];
  if (cur && m.injury?.rec === cur.k) return cur;
  if (cur) closeRec(H, m.id, ctx.y, ctx.w, false); // a different injury: the earlier one ended unseen
  const k = `${m.id}:${++H.seq}`;
  const rec = { k, y: ctx.y, w: ctx.w, po: ctx.playoff ? ctx.round || 1 : 0, type: m.injury.type || null, sev: m.injury.severity || null, est: Number.isFinite(m.injury.weeks) ? m.injury.weeks : null, src, club: ctx.club || null, vs: src === 'game' ? ctx.vs || null : null, g: [], back: null };
  m.injury.rec = k; H.open[m.id] = rec;
  return rec;
}
function closeRec(H, id, y, w, offseason) {
  const rec = H.open[id]; if (!rec) return null;
  rec.missed = rec.g.length; const mp = rec.g.filter((g) => /\|p\d+\|/.test(g)).length; if (mp) rec.mp = mp; delete rec.g; delete rec.k; rec.back = offseason ? { y, off: 1 } : { y, w };
  delete rec.club; if (rec.src === 'game') delete rec.src; // compact: the club is on the Team History page; 'game' is the default source
  for (const key of ['vs', 'type', 'sev', 'est']) if (rec[key] == null) delete rec[key]; if (!rec.po) delete rec.po; // and only what is known
  (H.log[id] ||= []).push(rec); delete H.open[id];
  return rec;
}
/** Sync one monster: open a new injury, close a healed one. Returns 'opened' | 'closed' | null. */
function sync(H, m, ctx, src) {
  const cur = H.open[m.id];
  if (m.injury && (!cur || m.injury.rec !== cur.k)) { openFor(H, m, ctx, src); return 'opened'; }
  if (!m.injury && cur) { closeRec(H, m.id, ctx.y, ctx.w, ctx.y > cur.y && !cur.g.some((g) => g.startsWith(`${ctx.y}|`))); return 'closed'; }
  return null;
}

/**
 * Before kickoff for one club: sync every rostered monster, then count the game (once per game id): opportunity for all,
 * a missed game for each one injured. `ctx` = { gameId, club, vs, playoff, round }. Returns the closed records (returns).
 */
export function beforeGame(f, roster, ctx) {
  const H = ensure(f); const c = { ...where(f), ...ctx }; const returns = [];
  for (const m of roster || []) {
    if (!m?.id) continue;
    // An injury first seen before kickoff: already there when this monster was first watched ('before'), else a practice injury
    // for the owner's club; AI clubs have no other source, so anything else is recorded as away from a game ('other').
    const first = c.y === H.since.y && c.w === H.since.w && !H.log[m.id]; // the opening week of tracking: it began before we watched
    const r = sync(H, m, c, first ? 'before' : ctx.owner ? 'practice' : 'other');
    if (r === 'closed') returns.push({ m, rec: (H.log[m.id] || []).at(-1) });
  }
  const led = (H.done[c.y] ||= {}); const key = `${ctx.gameId}|${ctx.club}`;
  if (led[key]) return returns;
  led[key] = 1;
  for (const m of roster || []) {
    if (!m?.id) continue;
    if (ctx.lineup?.has(m.id)) H.opp[m.id] = (H.opp[m.id] || 0) + 1; // appearances (opp)
    const rec = H.open[m.id]; if (m.injury && rec && !rec.g.includes(ctx.gameId)) rec.g.push(ctx.gameId);
  }
  return returns;
}
/** After the final whistle for one club: injuries suffered in this game are opened. Returns the opened records. */
export function afterGame(f, roster, ctx) {
  const H = ensure(f); const c = { ...where(f), ...ctx }; const out = [];
  for (const m of roster || []) { if (!m?.id) continue; if (sync(H, m, c, 'game') === 'opened') out.push({ m, rec: H.open[m.id] }); }
  return out;
}
/** Season end: drop the pre-game ledger of past seasons, and the records of monsters the save no longer knows at all (`known(id)`
 * false: gone from every club, pool and the legends). Retired legends keep their history. */
export function pruneLedger(f, year, known = null) {
  const H = f?.injuryHistory; if (!H) return;
  for (const y of Object.keys(H.done)) if (Number(y) <= year - KEEP_SEASONS) delete H.done[y];
  if (known) for (const id of new Set([...Object.keys(H.opp), ...Object.keys(H.log)])) if (!H.open[id] && !known(id)) { delete H.opp[id]; delete H.log[id]; }
}

/** Every record for a monster, oldest first (closed then the open one), with missed counts filled in. */
export function recordsOf(f, id) {
  const H = f?.injuryHistory; if (!H) return [];
  const out = (H.log[id] || []).map((r) => ({ src: 'game', ...r }));
  const o = H.open[id]; if (o) { const mp = o.g.filter((g) => /\|p\d+\|/.test(g)).length; out.push({ ...o, missed: o.g.length, ...(mp ? { mp } : {}), open: true }); }
  return out;
}
/** The profile's summary: incidents (since tracking), games missed, opportunity, the indicator and the tracking note. */
export function injurySummary(f, id, { firstSeason = null } = {}) {
  const H = f?.injuryHistory; if (!H) return null;
  const recs = recordsOf(f, id);
  const incidents = recs.filter((r) => r.src !== 'before').length;
  const missed = recs.reduce((a, r) => a + (r.missed || 0), 0);
  const opp = (H.opp[id] || 0) + missed; // appearances + games missed to injury
  const perSeason = opp ? incidents / opp * 9 : 0; const missedRate = opp ? missed / opp : 0;
  const I = INDICATOR; let indicator = 'early';
  if (opp >= MIN_OPPORTUNITY) indicator = missedRate >= I.missedRate.high || perSeason >= I.perSeason.high ? 'high' : missedRate >= I.missedRate.moderate || perSeason >= I.perSeason.moderate ? 'moderate' : 'low';
  const since = H.since; const startedLater = firstSeason != null && (firstSeason < since.y || (firstSeason === since.y && since.w > 1));
  return { incidents, missed, opp, perSeason: Math.round(perSeason * 100) / 100, missedRate: Math.round(missedRate * 1000) / 1000, indicator, label: INDICATOR_LABEL[indicator], since, note: startedLater ? since : null, records: recs, current: recs.find((r) => r.open) || null };
}
/** Structural checks for the soak and the tests. */
export function injuryProblems(f) {
  const H = f?.injuryHistory; if (!H) return []; const out = [];
  for (const [id, rec] of Object.entries(H.open)) { if (new Set(rec.g).size !== rec.g.length) out.push(`injury: ${id} open record counts a game twice`); if (rec.back) out.push(`injury: ${id} open record has a return`); }
  for (const [id, list] of Object.entries(H.log)) for (const r of list) { if (!Number.isInteger(r.missed) || r.missed < 0) out.push(`injury: ${id} bad missed ${r.missed}`); if (!r.back) out.push(`injury: ${id} closed record without a return`); }
  const keys = Object.values(H.open).map((r) => r.k); if (new Set(keys).size !== keys.length) out.push('injury: an open record appears twice');
  return out;
}
