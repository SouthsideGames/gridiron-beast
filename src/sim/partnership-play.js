// Captain Partnerships on the field (GDD §27.4B). Two pure, read-only pieces used by `runScrimmagePlay`:
//   boostSlots   — the gameplay bonus: the two captains' own attributes ×(1 + level/100) for one snap, only when both are on
//                  the field. Level 0, no partnership, or a captain missing returns the very same slot object (no copy), so a
//                  game without chemistry is the game as it was.
//   qualifyingEvent — does this snap earn the pair one chemistry credit? Read only from what the engine already recorded
//                  (`sim.stats`, `sim.events`) and the slot -> monster mapping the play used. Nothing here is read by the
//                  engine and nothing draws a random number.
// The franchise side (who the captains are, thresholds, levels, the ledger) lives in src/franchise/partnerships.js.
import { clampAttr } from '../data/monsters.js';

/** The eight approved pairing types (owner decision, 2026-10-24). Roles are primary positions; `a` is listed first. */
export const PAIR_TYPES = Object.freeze({
  'QB-RB': { side: 'offense', a: 'QB', b: 'RB', label: 'QB + RB' },
  'QB-WR': { side: 'offense', a: 'QB', b: 'WR', label: 'QB + WR' },
  'QB-TE': { side: 'offense', a: 'QB', b: 'TE', label: 'QB + TE' },
  'RB-OL': { side: 'offense', a: 'RB', b: 'OL', label: 'RB + OL' },
  'OL-OL': { side: 'offense', a: 'OL', b: 'OL', label: 'OL + OL' },
  'DL-DL': { side: 'defense', a: 'DL', b: 'DL', label: 'DL + DL' },
  'DL-LB': { side: 'defense', a: 'DL', b: 'LB', label: 'DL + LB' },
  'DL-CB': { side: 'defense', a: 'DL', b: 'CB', label: 'DL + CB' },
});

/** The attributes the bonus touches, by the captain's role in the pair. Speed is never one of them. */
export const BONUS_ATTRS = Object.freeze({
  'QB-RB': { a: ['accuracy', 'awareness'], b: ['agility', 'awareness', 'catching'] },
  'QB-WR': { a: ['accuracy', 'awareness'], b: ['catching', 'awareness'] },
  'QB-TE': { a: ['accuracy', 'awareness'], b: ['catching', 'awareness'] },
  'RB-OL': { a: ['agility', 'awareness'], b: ['blocking', 'awareness'] },
  'OL-OL': { a: ['blocking', 'awareness'], b: ['blocking', 'awareness'] },
  'DL-DL': { a: ['strength', 'agility'], b: ['strength', 'agility'] },
  'DL-LB': { a: ['strength', 'agility'], b: ['tackling', 'awareness'] },
  'DL-CB': { a: ['strength', 'agility'], b: ['coverage', 'awareness'] },
});
export const MAX_LEVEL = 4;

/**
 * The partnership bonus for one snap. `active` = { type, a, b, level } with a/b monster ids (a = role a), or null.
 * Returns `slots` itself unless both captains are on the field and level > 0; then a shallow copy where only the two captains
 * carry new `attrs` objects (the lineup entries themselves are never written).
 */
export function boostSlots(slots, active) {
  if (!active || !slots) return slots;
  const level = Math.max(0, Math.min(MAX_LEVEL, Math.floor(active.level || 0)));
  if (!level) return slots;
  const map = BONUS_ATTRS[active.type]; if (!map) return slots;
  const sa = slotOf(slots, active.a), sb = slotOf(slots, active.b);
  if (!sa || !sb || sa === sb) return slots;
  const out = { ...slots }; const k = 1 + level / 100;
  for (const [slot, keys] of [[sa, map.a], [sb, map.b]]) {
    const p = slots[slot]; const attrs = { ...(p.attrs || {}) };
    for (const key of keys) if (attrs[key] != null) attrs[key] = clampAttr(attrs[key] * k);
    out[slot] = { ...p, attrs };
  }
  return out;
}
export function slotOf(slots, id) { if (!id) return null; for (const [s, p] of Object.entries(slots || {})) if (p?.id === id) return s; return null; }

/** The football success-rate definition the game uses for chemistry: 40% / 60% / 100% of the distance by down; a TD always. */
export function playSucceeded(sim, down, toGo) {
  const st = sim?.stats || {};
  if (!sim || sim.turnover || st.defensiveScore) return false;
  if (['interception', 'fumble', 'touchback_return', 'sack', 'safety', 'incomplete', 'throwaway'].includes(sim.result)) return false;
  if (sim.result === 'touchdown') return true;
  const need = down === 1 ? 0.4 * toGo : down === 2 ? 0.6 * toGo : toGo;
  return (sim.yards || 0) >= need;
}

/**
 * The qualifying event for one pair on one snap, or null. `side` is the pair's side ('offense' | 'defense'), `pair` = { type, a, b },
 * `slots` = { offense, defense } as the play used them, `pre` = { down, toGo } before the snap.
 * At most one event is returned (one credit per pair per play). The offense earns only on a successful play; the defense only
 * on a failed one, and only with recorded contributions from both captains.
 */
export function qualifyingEvent(side, pair, slots, sim, pre) {
  const def = PAIR_TYPES[pair?.type]; if (!def || def.side !== side || !sim?.stats) return null;
  const own = side === 'offense' ? slots.offense : slots.defense;
  const sa = slotOf(own, pair.a), sb = slotOf(own, pair.b);
  if (!sa || !sb) return null; // both captains must be on the field for this snap
  const ok = playSucceeded(sim, pre.down, pre.toGo);
  const st = sim.stats; const events = sim.events || [];
  const is = (x, y) => (x === sa && y === sb) || (x === sb && y === sa);
  if (side === 'offense') {
    if (!ok) return null;
    const handoffTo = events.find((e) => e.kind === 'handoff')?.to || null;
    const qb = def.a === 'QB' ? sa : null;
    const other = def.a === 'QB' ? sb : null;
    switch (pair.type) {
      case 'QB-RB':
        if (st.passer === qb && st.receiver === other) return 'completion';
        if (handoffTo === other && st.carrier === other && !st.passer && !st.receiver) return 'handoff';
        return null;
      case 'QB-WR': case 'QB-TE':
        return st.passer === qb && st.receiver === other ? 'completion' : null;
      case 'RB-OL': {
        if (!(handoffTo === sa && st.carrier === sa && !st.passer && !st.receiver)) return null;
        const b = st.blockers?.[sb];
        return b && b.run && !b.lost ? 'run-block' : null;
      }
      case 'OL-OL': {
        const clean = (s) => { const b = st.blockers?.[s]; return !!b && (b.pass || b.run) && !b.lost && st.sackAllowedBy !== s && st.pressureAllowedBy !== s; };
        return clean(sa) && clean(sb) ? 'blocks' : null;
      }
      default: return null;
    }
  }
  if (ok) return null; // the defense earns only when the offense's play failed
  const tk = st.tackler, as = st.assistBy, pr = st.pressureBy;
  const sack = sim.result === 'sack';
  if (is(tk, as)) return sack ? 'sack-assist' : 'tackle-assist';
  switch (pair.type) {
    case 'DL-DL':
      // Owner decisions (2026-10-24/25): both linemen shedding their blockers does not count by itself; joint tackles, sacks and
      // pressures count, and so does one lineman's recorded shed when the other makes the tackle or sack (as for DL–LB).
      if (is(pr, tk)) return sack ? 'pressure-sack' : 'pressure-tackle';
      if (tk === sa && events.some((e) => e.kind === 'shed' && e.by === sb)) return sack ? 'shed-sack' : 'shed-tackle';
      if (tk === sb && events.some((e) => e.kind === 'shed' && e.by === sa)) return sack ? 'shed-sack' : 'shed-tackle';
      return null;
    case 'DL-LB': {
      if (is(pr, tk)) return sack ? 'pressure-sack' : 'pressure-tackle';
      if (pr === sa && st.interceptor === sb) return 'pressure-interception';
      if (is(st.forcedBy, st.recoveredTeam === 'def' ? st.recoveredSlot : null)) return 'forced-recovered';
      if (tk === sb && events.some((e) => e.kind === 'shed' && e.by === sa)) return 'shed-tackle'; // the DL beat his block and the LB made the stop
      return null;
    }
    case 'DL-CB':
      if (pr !== sa) return null; // every DL–CB event starts with the captain lineman's recorded pressure
      if (st.interceptor === sb) return 'pressure-interception';
      if (st.pbuBy === sb) return 'pressure-breakup';
      if (sim.result === 'incomplete' && st.coverBy === sb) return 'pressure-coverage';
      return null;
    default: return null;
  }
}
