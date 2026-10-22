// Type effectiveness in football (GDD §32). The chart is src/data/type-chart.js (shared with Beast Clash); this file
// holds football's own strengths and the helpers the engine, the coach AI and the match screen all call, so a matchup
// the player sees and a matchup the engine applies are computed by the same code.
//
// The rule: a modifier only ever applies to a contest between two opposing monsters who are actually meeting
// (a block, a shed, a tackle, a sack attempt, a route being covered, a contested catch), and each side's own
// contest score is scaled by its own edge against THAT opponent. Nothing is stored on a monster, nothing carries
// from one contest to the next, and helpers in a gang tackle or a double team never add their own modifier.
// Pre-snap matchups (expectedMatchups) are a forecast for the screen and the coach AI; the engine never reads them.

import { chartEdge, BEATS } from '../data/type-chart.js';
import { manKeyTargets, eligibleReceivers } from '../data/playbook.js';
import { positionOf } from '../data/personnel.js';

/** Football strengths (initial values from the owner's brief, 2026-10-22). Separate from the Clash's 1.05 / 0.952. */
export const FOOTBALL_TYPE_VALUES = Object.freeze({ version: 'f1.1', strong: 0.04, weak: -0.04, dragonNeutral: 0.02, envMatch: 0.02, positiveCap: 0.06 });
let active = FOOTBALL_TYPE_VALUES;
/** Run `fn` with other strengths (balance tools only; the game never calls this). `{ strong: 0, weak: 0, dragonNeutral: 0 }` turns types off. */
export function withTypeValues(values, fn) {
  const prev = active; active = { ...FOOTBALL_TYPE_VALUES, ...values };
  try { return fn(); } finally { active = prev; }
}
export const typeValues = () => active;

/**
 * Edge of a monster of type `a` against an opponent of type `b`, from a's side:
 *  'strong' / 'weak' from the chart; 'wild' when a is Dragon facing a non-Dragon the chart lists as neutral; else 'even'.
 */
export function footballEdge(a, b) {
  const e = chartEdge(a, b);
  if (e !== 'even') return e;
  if (a === 'Dragon' && b && b !== 'Dragon' && BEATS[b]) return 'wild';
  return 'even';
}
/** The fraction added to a's contest score against b (+0.04, −0.04, +0.02 or 0). */
export function typeMod(a, b) {
  const e = footballEdge(a, b);
  return e === 'strong' ? active.strong : e === 'weak' ? active.weak : e === 'wild' ? active.dragonNeutral : 0;
}
/** Multiplier for a's contest score against b (1.04, 0.96, 1.02 or 1). Missing types are neutral. */
export const typeScale = (a, b) => 1 + typeMod(a, b);

/** Stadium environment (GDD §33.2): +2% for a monster whose type matches the field's, whichever team he plays for. */
export function envMod(type, envType) { return type && envType && type === envType ? active.envMatch : 0; }
/**
 * Everything situational on a's side of one contest against b: the type edge plus the field, with the positive total
 * capped (+6%). Negative edges are never softened by the cap, and nothing here is stored anywhere.
 */
export function contestMod(a, b, envType = null) {
  const total = typeMod(a, b) + envMod(a, envType);
  return total > active.positiveCap ? active.positiveCap : total;
}

/** One line explaining why the relationship applies. */
export function edgeReason(a, b) {
  const e = footballEdge(a, b);
  if (e === 'strong') return `${a} is strong against ${b}.`;
  if (e === 'weak') return `${a} is weak against ${b}.`;
  if (e === 'wild') return `Dragon is the wildcard: a small edge against any type the chart lists as neutral.`;
  if (!a || !b) return 'No type relationship.';
  return a === b ? `${a} against ${b}: an even matchup.` : `${a} and ${b} are neutral.`;
}

// ------------------------------------------------------------ contests
/** The contests a modifier can touch, by id, with the label the info panel shows. */
export const CONTESTS = Object.freeze({
  separation: 'Route separation',
  coverage: 'Coverage (staying with the receiver)',
  catch: 'Contested catch',
  breakup: 'Contested catch (breaking it up)',
  block: 'Blocking',
  shed: 'Shedding blocks',
  tackle: 'Tackling',
  breakTackle: 'Breaking tackles',
  sack: 'Sack attempt',
  escape: 'Escaping the rush',
});
/** Contests in play for a matchup kind, from each side's point of view. */
const KIND_CONTESTS = {
  coverage: { off: ['separation', 'catch'], def: ['coverage', 'breakup'] },
  block: { off: ['block'], def: ['shed'] },
  run: { off: ['breakTackle'], def: ['tackle'] },
  rush: { off: ['escape'], def: ['sack'] },
};
export const contestsFor = (kind, team) => KIND_CONTESTS[kind]?.[team] || [];

// ------------------------------------------------------------ expected (pre-snap) matchups
const FRONT = (s) => /^(DL|LB)/.test(s);
const COVER = (s) => /^(CB|FS|SS|LB)/.test(s);
const BLOCKERS = new Set(['block', 'run_block', 'pull', 'release', 'stalk']);
const posAt = (play, slot) => play.align?.[slot] || [0, 0];
const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

/**
 * The matchup each monster is expected to have on this snap, from what the deciding side can see: its own play's
 * assignments and the other side's alignment (the other side's call is never read unless `both` is set, for tests).
 *   offensePlay / defensePlay: compiled plays (with assignments) or presnap looks (onField + align only).
 *   offense / defense: {slot: {type, name, ...}} lineups.
 * Returns [{ kind, off, def }] (slots), each offensive monster at most once and each defender at most once.
 */
export function expectedMatchups({ offensePlay, defensePlay }) {
  if (!offensePlay?.onField || !defensePlay?.onField) return [];
  const offA = offensePlay.assignments || null, defA = defensePlay.assignments || null;
  const used = new Set(); const out = [];
  const take = (kind, off, def) => { if (!def || used.has(def)) return; used.add(def); out.push({ kind, off, def }); };
  const defs = defensePlay.onField;
  // Who runs routes, who blocks, who carries: the offense's own call when known, otherwise read from positions.
  const role = (s) => {
    const a = offA?.[s]?.a;
    if (a) return a === 'route' ? 'route' : BLOCKERS.has(a) ? 'block' : ['carry', 'keep', 'option', 'pitch'].includes(a) ? 'carry' : s === 'QB' ? 'qb' : 'other';
    const p = positionOf(s); return p === 'QB' ? 'qb' : p === 'OL' ? 'block' : p === 'RB' ? 'carry' : 'route';
  };
  const recv = eligibleReceivers(offensePlay).filter((s) => role(s) === 'route');
  // 1. Coverage. Man defenders the defense's call keys to a receiver; otherwise the nearest defender who can cover.
  const keys = defA ? manKeyTargets(offensePlay) : null;
  if (defA) for (const d of defs) { const a = defA[d]; if (a?.a === 'man') { const r = keys[a.key]; if (r && recv.includes(r) && !out.some((m) => m.off === r)) take('coverage', r, d); } }
  const wideFirst = recv.slice().sort((p, q) => Math.abs(posAt(offensePlay, q)[1]) - Math.abs(posAt(offensePlay, p)[1]));
  for (const r of wideFirst) {
    if (out.some((m) => m.off === r)) continue;
    const pool = defs.filter((d) => COVER(d) && !used.has(d) && !(defA && ['rush', 'contain'].includes(defA[d]?.a)));
    const best = pool.sort((p, q) => near(posAt(offensePlay, r), posAt(defensePlay, p)) - near(posAt(offensePlay, r), posAt(defensePlay, q)))[0];
    take('coverage', r, best);
  }
  // 2. Blocks: each blocker meets the nearest free front defender (rushers first when the defense's call is known).
  const blockers = offensePlay.onField.filter((s) => role(s) === 'block').sort((p, q) => Math.abs(posAt(offensePlay, p)[1]) - Math.abs(posAt(offensePlay, q)[1]));
  for (const b of blockers) {
    const rushers = defs.filter((d) => !used.has(d) && (defA ? ['rush', 'contain'].includes(defA[d]?.a) : FRONT(d)));
    const pool = rushers.length ? rushers : (offA?.[b]?.a === 'stalk' ? defs.filter((d) => !used.has(d) && /^(CB|FS|SS)/.test(d)) : []);
    const best = pool.sort((p, q) => near(posAt(offensePlay, b), posAt(defensePlay, p)) - near(posAt(offensePlay, b), posAt(defensePlay, q)))[0];
    take('block', b, best);
  }
  // 3. The ball carrier meets the nearest unblocked linebacker or safety: the first tackler he should expect.
  for (const c of offensePlay.onField.filter((s) => role(s) === 'carry')) {
    const pool = defs.filter((d) => !used.has(d) && /^(LB|SS|FS|DL)/.test(d));
    const best = pool.sort((p, q) => near(posAt(offensePlay, c), posAt(defensePlay, p)) - near(posAt(offensePlay, c), posAt(defensePlay, q)))[0];
    take('run', c, best);
  }
  return out;
}

/** A matchup described for the screen: both monsters, the edge each way, the contests and the numbers. */
export function describeMatchup(m, offense = {}, defense = {}) {
  const o = offense[m.off] || {}, d = defense[m.def] || {};
  const side = (me, them, slot, team) => ({ slot, name: me.name || slot, type: me.type || null, position: positionOf(slot), edge: footballEdge(me.type, them.type), mod: typeMod(me.type, them.type), contests: contestsFor(m.kind, team), reason: edgeReason(me.type, them.type) });
  return { kind: m.kind, off: side(o, d, m.off, 'off'), def: side(d, o, m.def, 'def') };
}
/** Expected matchups that carry an edge for either side, described. */
export function matchupEdges(plays, offense, defense) {
  return expectedMatchups(plays).map((m) => describeMatchup(m, offense, defense)).filter((x) => x.off.mod || x.def.mod);
}
/** "+4%" / "−4%" / "+2%". */
export const pct = (mod) => `${mod > 0 ? '+' : mod < 0 ? '−' : ''}${Math.round(Math.abs(mod) * 100)}%`;

// ------------------------------------------------------------ the coach AI's view (same numbers, no peeking)
/** Before the call is made neither coach knows the other's play: the usual opponent for each slot. */
export const USUAL_OPPONENT = Object.freeze({ WR1: 'CB1', WR2: 'CB2', WR3: 'SS', TE: 'LB1', RB: 'LB1', LG: 'DL1', C: 'DL1', RG: 'DL2' });
const n99 = (v) => Math.max(1, Math.min(99, v ?? 60));
const avg = (...xs) => xs.reduce((s, x) => s + n99(x), 0) / xs.length;
/**
 * How much the offensive monster wins his usual matchup, from about −0.3 to +0.3: the rating gap (ratings first),
 * plus the type edges (each side's own modifier, the same numbers the engine applies). `kind`: 'pass' or 'run'.
 */
export function matchupScore(offM, defM, kind) {
  if (!offM || !defM) return 0;
  const o = offM.attrs || {}, d = defM.attrs || {};
  const rating = kind === 'run' ? avg(o.strength, o.agility, o.speed) - avg(d.tackling, d.strength, d.speed) : avg(o.catching, o.speed, o.agility) - avg(d.coverage, d.speed, d.agility);
  return rating / 100 + typeMod(offM.type, defM.type) - typeMod(defM.type, offM.type);
}
