// Captain Partnerships (GDD §27.4B): the franchise side. Pure rules (pairing types, thresholds, levels, per-game cap), the
// one deterministic captain-selection function every club uses (AI clubs, the owner's automatic pick and the "Suggested"
// badge), and the optional `f.partnerships` record: permanent chemistry by pair of monster ids, captains by season and club,
// and the ledger of games already credited.
//
// Nothing here draws a random number, and nothing here is created by loading a save: `f.partnerships` appears only when the
// feature is first activated (the one-time initial selection, an offseason pick, or the first game or season after it).
// The field side (the bonus and which plays qualify) is src/sim/partnership-play.js.
import { PAIR_TYPES, MAX_LEVEL } from '../sim/partnership-play.js';
import { overall } from '../data/monsters.js';

export { PAIR_TYPES };
export const LEVEL_NAMES = Object.freeze(['New', 'Developing', 'Established', 'Strong', 'Elite']);
/**
 * Joint successful plays (lifetime, for the exact pair) needed for +1% … +4%. Elite = what a strong (75th-percentile) pair of
 * that type earns in one nine-game regular season; the steps are 20 / 45 / 70 / 100% of it (audit 2026-10-24; DL–DL recalibrated
 * on the owner's strict rule plus the shed → partner's stop event, 2026-10-25).
 */
export const THRESHOLDS = Object.freeze({
  'QB-RB': [15, 34, 53, 75],
  'QB-WR': [6, 14, 21, 30],
  'QB-TE': [7, 16, 25, 36],
  'RB-OL': [6, 14, 22, 32],
  'OL-OL': [4, 9, 14, 20],
  'DL-DL': [1, 3, 4, 6],
  'DL-LB': [2, 4, 6, 9],
  'DL-CB': [1, 3, 4, 6],
});
/** Per-game ceiling: 25% of the Elite target, rounded half up, never below 3 (owner decision 2026-10-25). */
export const GAME_CAP_SHARE = 0.25;
export const GAME_CAP_MIN = 3;
/** Pairs that build slowly (few qualifying plays a season); the selection screen says so. */
export const SLOW_TYPES = Object.freeze(['DL-CB']);
/** Selection weight by type: how quickly a pair of that type can actually earn (measured joint-play frequency). */
export const TYPE_PRIORITY = Object.freeze({ 'QB-RB': 3, 'QB-WR': 3, 'QB-TE': 2, 'RB-OL': 1, 'OL-OL': 1, 'DL-DL': 2, 'DL-LB': 2, 'DL-CB': 1 });
export const GARBAGE_LEAD = 21; // fourth quarter, leading by more than this before the snap: no chemistry (rules.js applies it)
export const LEDGER_SEASONS = 2; // the credit ledger keeps this season and the last
const SIDES = ['offense', 'defense'];

export const pairKey = (a, b) => [String(a), String(b)].sort().join('|');
export function levelOf(type, n) { const t = THRESHOLDS[type]; if (!t) return 0; let l = 0; for (const x of t) if ((n || 0) >= x) l += 1; return Math.min(MAX_LEVEL, l); }
export function gameCap(type) { const t = THRESHOLDS[type]; return t ? Math.max(GAME_CAP_MIN, Math.floor(t[3] * GAME_CAP_SHARE + 0.5)) : 0; }
/** Level, name, bonus and the way to the next level for a pair of `type` with `n` joint plays. */
export function progressOf(type, n = 0) {
  const t = THRESHOLDS[type] || [0, 0, 0, 0]; const level = levelOf(type, n);
  const prev = level ? t[level - 1] : 0; const next = level < MAX_LEVEL ? t[level] : null;
  return { level, name: LEVEL_NAMES[level], bonus: level, n, next, toNext: next == null ? 0 : next - n, prev, elite: t[3], pct: next == null ? 1 : Math.max(0, Math.min(1, (n - prev) / (next - prev))) };
}
/** The pairing type two primary positions make, with its side, or null. */
export function typeOf(posX, posY) {
  for (const [type, d] of Object.entries(PAIR_TYPES)) if ((d.a === posX && d.b === posY) || (d.a === posY && d.b === posX)) return type;
  return null;
}
/** { type, a, b } with a = the role listed first (for a same-position type, the lower id first), or null when not a pair. */
export function orderPair(x, y) {
  if (!x?.id || !y?.id || x.id === y.id) return null;
  const type = typeOf(x.position, y.position); if (!type) return null;
  const d = PAIR_TYPES[type];
  const [a, b] = d.a === d.b ? [x, y].sort((p, q) => String(p.id).localeCompare(String(q.id))) : x.position === d.a ? [x, y] : [y, x];
  return { type, a: a.id, b: b.id };
}
export const sideOf = (type) => PAIR_TYPES[type]?.side || null;

// ------------------------------------------------------------ selection (one function for every club)
const ROLE_RANK = { base: 2, package: 1, bench: 0 };
const PACKAGE = new Set(['WR3', 'C', 'DL3', 'SS']);
/**
 * Selection candidates from a built team ({ offense, defense, bench }): each monster once, with primary position, OVR from the
 * attributes the team fields, and expected playing time as a role: 'base' (a base-formation starter), 'package' (a package slot
 * only) or 'bench'. Borrowed and empty slots are skipped. Injured monsters are not in a built lineup, so they rank as bench.
 */
export function candidatesFromTeam(team) {
  const out = new Map();
  const put = (p, role) => { if (!p?.id || p.borrowed || !p.position) return; const prev = out.get(p.id); if (prev && ROLE_RANK[prev.role] >= ROLE_RANK[role]) return; out.set(p.id, { id: p.id, name: p.name, position: p.position, ovr: Math.round(overall(p.attrs || {}, p.position)), role }); };
  for (const L of [team?.offense, team?.defense]) for (const [slot, p] of Object.entries(L || {})) put(p, PACKAGE.has(slot) ? 'package' : 'base');
  for (const p of team?.bench || []) put(p, 'bench');
  return [...out.values()];
}
/**
 * The captains a club would choose (deterministic; no random number). For each side: candidate pairs of an approved type,
 * first among base starters, then starters including package slots, then anyone on the roster. Score = 10 × the pair's existing
 * chemistry level + the type's priority + both OVRs / 20 (+1 when both are base starters). Ties go to the lower pair key.
 * Offense is chosen first; a monster holds one captaincy, so the defense never reuses an offensive captain.
 * Returns { offense, defense, reason } with each pick { type, a, b, score } or null (reason says why).
 */
export function suggestCaptains(cands, { count = () => 0, exclude = [] } = {}) {
  const used = new Set(exclude); const res = { offense: null, defense: null, reason: { offense: null, defense: null } };
  for (const side of SIDES) {
    const pool = cands.filter((c) => !used.has(c.id) && Object.values(PAIR_TYPES).some((d) => d.side === side && (d.a === c.position || d.b === c.position)));
    let best = null;
    for (const minRank of [2, 1, 0]) {
      const tier = pool.filter((c) => ROLE_RANK[c.role] >= minRank);
      for (let i = 0; i < tier.length; i++) for (let j = i + 1; j < tier.length; j++) {
        const p = orderPair(tier[i], tier[j]); if (!p || sideOf(p.type) !== side) continue;
        const ca = tier[i].id === p.a ? tier[i] : tier[j], cb = ca === tier[i] ? tier[j] : tier[i];
        const score = 10 * levelOf(p.type, count(p.a, p.b)) + TYPE_PRIORITY[p.type] + (ca.ovr + cb.ovr) / 20 + (ca.role === 'base' && cb.role === 'base' ? 1 : 0);
        const key = pairKey(p.a, p.b);
        if (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) <= 1e-9 && key < pairKey(best.a, best.b))) best = { ...p, score: Math.round(score * 100) / 100 };
      }
      if (best) break;
    }
    if (best) { res[side] = best; used.add(best.a); used.add(best.b); }
    else res.reason[side] = side === 'offense' ? 'No eligible pair on offense: it needs a QB with an RB, WR or TE, an RB with an OL, or two OLs.' : 'No eligible pair on defense: it needs a DL with another DL, an LB or a CB.';
  }
  return res;
}
/**
 * Check the owner's choice for one side against the club's candidates. `pick` = [idX, idY]. Returns { ok, pair } or
 * { ok: false, reason }. Primary positions decide; the type is fixed here; the other side's captains cannot be reused.
 */
export function checkPick(cands, side, pick, { other = [] } = {}) {
  if (!Array.isArray(pick) || pick.length !== 2) return { ok: false, reason: 'Choose two captains.' };
  const [x, y] = pick.map((id) => cands.find((c) => c.id === id));
  if (!x || !y) return { ok: false, reason: 'Both captains must be on your roster.' };
  if (x.id === y.id) return { ok: false, reason: 'Choose two different monsters.' };
  if (other.includes(x.id) || other.includes(y.id)) return { ok: false, reason: 'A monster can hold only one captaincy.' };
  const p = orderPair(x, y);
  if (!p) return { ok: false, reason: `${x.position} + ${y.position} is not a captain pairing.` };
  if (sideOf(p.type) !== side) return { ok: false, reason: `${PAIR_TYPES[p.type].label} is a${side === 'offense' ? ' defensive' : 'n offensive'} pairing.` };
  return { ok: true, pair: p };
}

// ------------------------------------------------------------ the save record
export const isActive = (f) => !!f?.partnerships?.v;
export function captainsOf(f, club, year = f?.season?.year) { return f?.partnerships?.captains?.[year]?.[club] || null; }
export function pairRecord(f, a, b) { return f?.partnerships?.pairs?.[pairKey(a, b)] || null; }
export function chemistryCount(f, a, b) { return pairRecord(f, a, b)?.n || 0; }
export function captaincyOf(f, club, id, year = f?.season?.year) { const c = captainsOf(f, club, year); if (!c || !id) return null; for (const side of SIDES) { const p = c[side]; if (p && (p.a === id || p.b === id)) return { side, pair: p, partner: p.a === id ? p.b : p.a }; } return null; }
function ensure(f, year) { return (f.partnerships ||= { v: 1, startedYear: year, pairs: {}, captains: {}, credited: {} }); }
function touchPair(P, p, year, club) {
  const k = pairKey(p.a, p.b); const rec = (P.pairs[k] ||= { a: p.a, b: p.b, type: p.type, n: 0, first: year, last: year, seasons: [] });
  rec.type = p.type; rec.last = Math.max(rec.last ?? year, year); rec.first = Math.min(rec.first ?? year, year);
  if (!rec.seasons.some((s) => s.y === year && s.club === club)) rec.seasons.push({ y: year, club, type: p.type });
  return rec;
}
/**
 * Name a club's captains for a season (stored once; a season's choice is never replaced). `choice` = { offense, defense } of
 * { type, a, b } or null, `reason` explains a missing side. Returns the stored entry, or the existing one untouched.
 */
export function nameCaptains(f, club, year, choice, { mode = 'auto', reason = {} } = {}) {
  const P = ensure(f, year); const byYear = (P.captains[year] ||= {});
  if (byYear[club]) return byYear[club];
  const strip = (p) => (p ? { type: p.type, a: p.a, b: p.b } : null);
  const entry = { offense: strip(choice.offense), defense: strip(choice.defense), mode, reason: { offense: choice.offense ? null : reason.offense || null, defense: choice.defense ? null : reason.defense || null } };
  byYear[club] = entry;
  for (const side of SIDES) if (entry[side]) touchPair(P, entry[side], year, club);
  return entry;
}
/** Each side's active pair for a game, with its chemistry level fixed now (kickoff) and its per-game cap; null if none. */
export function kickoffPartnership(f, club, year = f?.season?.year) {
  const c = captainsOf(f, club, year); if (!c) return null;
  const one = (p) => (p ? { type: p.type, a: p.a, b: p.b, level: levelOf(p.type, chemistryCount(f, p.a, p.b)), cap: gameCap(p.type) } : null);
  const out = { offense: one(c.offense), defense: one(c.defense) };
  return out.offense || out.defense ? out : null;
}
/** A stable identity for one league game: never the week alone (eight games a week; playoff rounds are their own). */
export function gameIdOf({ year, week, playoff = false, round = null, home, away }) { return `${year}|${playoff ? `p${round ?? week}` : `w${week}`}|${home}|${away}`; }
/**
 * Commit a finished game's chemistry (GDD §27.4B): the credits `runScrimmagePlay` tallied in `state.partnerCredits` are added to
 * each pair's lifetime count, once. A game id already in the ledger adds nothing (reload, replay, re-simulation); a game without
 * a kickoff snapshot adds nothing. Returns one row per pair that played, or [] when nothing was committed.
 */
/** (`together` is null for a game begun before v42.2.1, which counted no snaps.) */
export function commitGame(f, state, { year, gameId, clubs }) {
  if (!state?.partners || !isActive(f) || !gameId) return [];
  const P = f.partnerships; const led = (P.credited[year] ||= {});
  if (led[gameId]) return [];
  led[gameId] = 1;
  const rows = [];
  for (const s of ['home', 'away']) for (const side of SIDES) {
    const pair = state.partners[s]?.[side]; if (!pair) continue;
    const t = state.partnerCredits?.[s]?.[side] || { n: 0, capped: 0, garbage: 0, kinds: {} };
    const rec = touchPair(P, pair, year, clubs[s]); const before = rec.n || 0;
    rec.n = before + (t.n || 0); if (t.n) rec.last = Math.max(rec.last ?? year, year);
    const from = levelOf(pair.type, before), to = levelOf(pair.type, rec.n);
    rows.push({ club: clubs[s], side, type: pair.type, a: pair.a, b: pair.b, together: Number.isInteger(t.together) ? t.together : null, earned: t.n || 0, capped: t.capped || 0, garbage: t.garbage || 0, kinds: { ...(t.kinds || {}) }, before, n: rec.n, from, to, levelUp: to > from, playedAt: pair.level });
  }
  return rows;
}
/** Keep the ledger to this season and the last (games of older seasons can no longer be played). */
export function pruneLedger(f, year) { const L = f?.partnerships?.credited; if (!L) return; for (const y of Object.keys(L)) if (Number(y) <= year - LEDGER_SEASONS) delete L[y]; }

// ------------------------------------------------------------ status for the screens
/**
 * One side's captain partnership as the owner sees it: the pair, its chemistry, and whether it can be active this week.
 * `rosterIds` = the club's roster now; `lineupIds` = monsters in this week's lineup; `injured` = ids out injured.
 */
export function sideStatus(f, club, side, { rosterIds = [], lineupIds = [], injured = [], year = f?.season?.year } = {}) {
  const c = captainsOf(f, club, year); if (!c) return null;
  const p = c[side]; if (!p) return { side, pair: null, reason: c.reason?.[side] || 'No partnership this season.' };
  const prog = progressOf(p.type, chemistryCount(f, p.a, p.b));
  const R = new Set(rosterIds), L = new Set(lineupIds), I = new Set(injured);
  const why = (id) => (!R.has(id) ? 'gone' : I.has(id) ? 'injured' : !L.has(id) ? 'benched' : null);
  const wa = why(p.a), wb = why(p.b);
  return { side, pair: p, type: p.type, progress: prog, active: !wa && !wb, inactive: wa || wb ? { a: wa, b: wb } : null };
}
/** Every partnership a monster has had chemistry or a captaincy in, best first. */
export function partnershipsOf(f, id) {
  const out = []; for (const rec of Object.values(f?.partnerships?.pairs || {})) if (rec.a === id || rec.b === id) out.push({ ...rec, partner: rec.a === id ? rec.b : rec.a, progress: progressOf(rec.type, rec.n) });
  return out.sort((x, y) => (y.progress.level - x.progress.level) || (y.n - x.n) || String(x.partner).localeCompare(String(y.partner)));
}

/** Structural checks for the soak and the tests: valid types and sides, distinct captains, one captaincy each, sane counts. */
export function partnershipProblems(f) {
  const P = f?.partnerships; if (!P) return [];
  const out = []; const say = (s) => out.push(`partnerships: ${s}`);
  if (P.v !== 1) say(`version ${P.v}`);
  for (const [y, byClub] of Object.entries(P.captains || {})) for (const [club, e] of Object.entries(byClub || {})) {
    const ids = [];
    for (const side of SIDES) { const p = e[side]; if (!p) continue; if (!PAIR_TYPES[p.type]) say(`${y} ${club} ${side}: unknown type ${p.type}`); else if (PAIR_TYPES[p.type].side !== side) say(`${y} ${club} ${side}: ${p.type} is not a ${side} pair`); if (!p.a || !p.b || p.a === p.b) say(`${y} ${club} ${side}: bad pair`); ids.push(p.a, p.b); if (!P.pairs?.[pairKey(p.a, p.b)]) say(`${y} ${club} ${side}: no pair record`); }
    if (new Set(ids).size !== ids.length) say(`${y} ${club}: a monster holds two captaincies`);
  }
  for (const [k, r] of Object.entries(P.pairs || {})) { if (pairKey(r.a, r.b) !== k) say(`pair key ${k}`); if (!Number.isInteger(r.n) || r.n < 0) say(`pair ${k} count ${r.n}`); if (!PAIR_TYPES[r.type]) say(`pair ${k} type ${r.type}`); }
  return out;
}
