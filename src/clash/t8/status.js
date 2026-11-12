// Beast Clash t8 (M4 S2): the Clash side of the ONE shared status slot. The gate itself is src/sim/t8/status.js (pure, imports
// nothing), used here in mode 'clash'; this module adds only what Clash needs on top of it. Pure: every function returns a new slot.
//
// Rules carried by the shared gate (spec §10, Appendix B): one status per monster, beneficial or harmful; a different status is
// blocked; equal same-status applications add duration only (no strength, shield HP or charges); stronger ones replace strength and
// remaining duration, count an application and keep the episode; weaker ones are ignored and use no application; an episode accepts
// at most three applications, after which even stronger attempts are blocked until it ends. Stumbled and Knocked Down are football
// only and are refused (and cleared on entry) in Clash.
//
// What this module adds for Clash:
//  - the APPLICATION TURN (spec §10 "the application play/turn does not consume duration"): the slot's `appliedThisUnit` flag is set
//    only when the recipient is in its own normal turn at the moment of application. A status applied outside the recipient's turn
//    (for example by the opponent's attack) is consumed by the recipient's next normal turn. This is the same reading the S1 clock
//    uses (clock.js);
//  - the per-status Clash effects (Appendix B) as factors the engine reads (`clashEffect`);
//  - the countdown at the end of the recipient's normal turn (`endOfTurn`), with the D4 hold for the protected turn and the Deep
//    Winter freeze counter kept separate from harmful-effect execution (ICE-06-C);
//  - the Shielded pool payload (D11): original pool, remaining pool, remaining fraction, spent fumble-save flag, application history;
//  - mode-transfer payloads (D10, D11) for the opening / overtime carry. Football integration itself is S12;
//  - tie order for simultaneous attempts (§9: established event order, then sourceID, then abilityID, no random roll);
//  - the explicit removal and replacement API (ordinary cleanse removes harmful statuses only; an uncleansable payload refuses it;
//    an explicit replacement such as Mountain Shelter starts a fresh episode).
import { STATUS, MAX_APPLICATIONS, tryApply, endOfUnit, transfer } from '../../sim/t8/status.js';
import { roundHalfUp } from './arith.js';
import { E as $E } from '../../core/english.js';

export { STATUS, MAX_APPLICATIONS };

/** Approved cross-mode values (D10, D11; spec §25 items 10-11; Appendix B STA-07). */
export const CLASH_STATUS_VALUES = Object.freeze({
  confusedRedirectPct: 25,          // spec §10 / STA-07: "Confused defaults to 25% redirect of an eligible normal attack"
  confusedFootballAwarenessPct: 20, // D10: "Confused carried into football reduces effective Awareness by 20%"
  footballShieldClashPct: 15,       // D11: "A football-origin shield becomes 15% of maximum Clash HP, scaled by its remaining fraction"
});

/** Percentage magnitude of a slot (the same reading as football status-effects.js: payload.pct, else strength). */
export const statusPct = (slot) => Math.abs(Number(slot?.payload?.pct ?? slot?.strength ?? 0)) || 0;

/**
 * The Clash effect of the slot as factors (Appendix B, Clash column; D10 "same percentage across modes"):
 *  - initiative: Slowed (1 - pct), Quickened (1 + pct) multiply initiative speed (STA-02 "reduce combat speed and likelihood of
 *    acting first"; STA-11 "increase combat speed/initiative likelihood; no extra action or guaranteed first action");
 *  - outgoing: Weakened (1 - pct), Empowered (1 + pct) multiply outgoing attack damage (STA-06, STA-10);
 *  - incoming: Guarded (1 - pct) multiplies incoming damage, with no shield HP (STA-12);
 *  - heal: Healing Reduced (1 - pct, floor 0) multiplies HP restoration; 100% blocks it (STA-08). Shields still work;
 *  - stunned: the normal action is skipped under the D4 safeguard (STA-01);
 *  - confusedChance: the redirect chance of an eligible normal attack (STA-07);
 *  - shieldPool: the remaining Shielded pool (STA-09).
 * Afflicted (STA-05) is a recurring end-of-turn tick whose size comes from its producer's payload (afflictedTick).
 * D7 (approved): Afflicted has NO healing penalty; only Healing Reduced reduces healing.
 */
export function clashEffect(slot) {
  const p = statusPct(slot) / 100; const id = slot?.id;
  return {
    initiative: id === 'slowed' ? Math.max(0, 1 - p) : id === 'quickened' ? 1 + p : 1,
    outgoing: id === 'weakened' ? Math.max(0, 1 - p) : id === 'empowered' ? 1 + p : 1,
    incoming: id === 'guarded' ? Math.max(0, 1 - p) : 1,
    heal: id === 'healingReduced' ? Math.max(0, 1 - p) : 1,
    stunned: id === 'stunned' && slot.remaining > 0,
    confusedChance: id === 'confused' ? Number(slot.payload?.redirectPct ?? CLASH_STATUS_VALUES.confusedRedirectPct) / 100 : 0,
    shieldPool: id === 'shielded' ? slot.payload?.remaining ?? 0 : 0,
  };
}

/**
 * The Afflicted end-of-turn tick in whole HP, from its producer's payload: `tickHp` (whole HP) or `tickPctMaxHp` (percent of the
 * recipient's max HP, rounded half up). No Clash producer of Afflicted exists in the 72 contracts, so no default size is invented:
 * a payload without either gives 0 (T8_PROVISIONAL 'afflicted-tick-payload').
 */
export function afflictedTick(slot, maxHp) {
  if (slot?.id !== 'afflicted') return 0;
  const p = slot.payload || {};
  if (Number.isInteger(p.tickHp) && p.tickHp > 0) return p.tickHp;
  if (Number.isFinite(p.tickPctMaxHp) && p.tickPctMaxHp > 0) return roundHalfUp((maxHp * p.tickPctMaxHp) / 100);
  return 0;
}

const historyEntry = (attempt, result) => ({ mode: 'clash', strength: attempt.strength, duration: attempt.duration, sourceId: attempt.sourceId ?? null, abilityId: attempt.abilityId ?? null, result });

/**
 * Apply an attempt through the shared gate in mode 'clash'.
 * attempt: { id, strength, duration, payload?, sourceId?, abilityId? }. For Shielded, `strength` is the original pool in whole HP
 *   (D11: "shields are compared by original strength"), and the pool payload is built here.
 * ctx: { recipientInTurn } — true when the recipient is in its own normal turn (that turn is then excluded from the countdown).
 * Returns { slot, accepted, reason }.
 */
export function applyClash(slot, attempt, { recipientInTurn = false } = {}) {
  if (!Number.isInteger(attempt.duration) || attempt.duration < 1) throw new Error(`A Clash status needs a positive whole number of recipient normal turns (got ${attempt.duration})`);
  let a = attempt;
  if (attempt.id === 'shielded') {
    if (!Number.isInteger(attempt.strength) || attempt.strength < 1) throw new Error('A Clash Shielded strength is its original pool in whole HP');
    a = { ...attempt, payload: { ...(attempt.payload || {}), pool: attempt.strength, remaining: attempt.strength, fraction: 1, saveSpent: false } };
  }
  const prev = slot;
  const r = tryApply(slot, { ...a, mode: 'clash' });
  if (!r.accepted) return r;
  const next = { ...r.slot, appliedThisUnit: !!recipientInTurn || (!!prev && !!prev.appliedThisUnit && prev.id === r.slot.id) };
  next.history = [...(prev && prev.id === next.id ? prev.history || [] : []), historyEntry(attempt, r.reason)];
  if (prev && prev.id === next.id && prev.freeze) next.freeze = 0; // ICE-06-C B: an accepted same-status application ends the freeze
  if (next.id === 'shielded' && next.payload) next.payload = { ...next.payload, fraction: next.payload.pool ? next.payload.remaining / next.payload.pool : 0 };
  return { slot: next, accepted: true, reason: r.reason };
}

/**
 * §9 tie order: attempts at the same boundary keep established event order (`order`), then stable sourceID, then abilityID. The
 * first accepted one occupies the slot; later attempts go through the normal gate. No random roll.
 */
export function orderAttempts(attempts) {
  const s = (v) => (v == null ? '' : String(v));
  return attempts.map((a, i) => ({ a, i })).sort((p, q) => (p.a.order ?? p.i) - (q.a.order ?? q.i) || s(p.a.sourceId).localeCompare(s(q.a.sourceId)) || s(p.a.abilityId).localeCompare(s(q.a.abilityId)) || p.i - q.i).map((x) => x.a);
}

/**
 * End of the recipient's normal turn (spec §10, P6 step 3.14): the countdown, kept separate from harmful-effect execution.
 *  - The application turn does not count (appliedThisUnit).
 *  - hold (D4): on the turn the Stunned safeguard protects, Stunned's remaining duration is preserved (no decrement). See the D4
 *    note in engine.js and docs/task8/M4_STATUS.md.
 *  - freeze (Deep Winter, ICE-06-C): while a harmful status has freeze counters, each recipient normal turn spends one freeze
 *    counter instead of the expiration countdown; the ordinary countdown resumes on the following normal turn.
 * Returns { slot (null when expired), decremented, held, froze }.
 */
export function endOfTurn(slot, { hold = false } = {}) {
  if (!slot) return { slot: null, decremented: false, held: false, froze: false };
  if (slot.appliedThisUnit) return { slot: { ...slot, appliedThisUnit: false }, decremented: false, held: false, froze: false };
  if (slot.freeze > 0 && STATUS[slot.id].kind === 'harmful') return { slot: { ...slot, freeze: slot.freeze - 1 }, decremented: false, held: hold && slot.id === 'stunned', froze: true };
  if (hold && slot.id === 'stunned') return { slot, decremented: false, held: true, froze: false };
  return { slot: endOfUnit(slot), decremented: true, held: false, froze: false };
}

/**
 * Shielded absorbs incoming damage before HP (STA-09). `amount` is the exact (unrounded) damage after type, Tank guard and Guarded;
 * `breakMult` is the shield-break rate (Striker 2 on ordinary attacks only, D5; else 1): each point of damage removes `breakMult`
 * points of pool, as in values 1.1.0. Rounding (D9): the pool and the HP loss are each whole numbers, each rounded once.
 * Returns { slot, toHp (exact remainder for HP), poolLoss, absorbed (damage stopped), broken }.
 * A pool reduced to 0 ends the Shielded status (T8_PROVISIONAL 'shield-depleted-ends-status').
 */
export function absorb(slot, amount, breakMult = 1) {
  if (slot?.id !== 'shielded' || !(slot.payload?.remaining > 0) || amount <= 0) return { slot, toHp: amount, poolLoss: 0, absorbed: 0, broken: false };
  const pool = slot.payload.remaining;
  if (amount * breakMult < pool) {
    const poolLoss = Math.min(pool, roundHalfUp(amount * breakMult));
    const remaining = pool - poolLoss;
    if (remaining <= 0) return { slot: null, toHp: 0, poolLoss, absorbed: amount, broken: true };
    return { slot: { ...slot, payload: { ...slot.payload, remaining, fraction: remaining / slot.payload.pool } }, toHp: 0, poolLoss, absorbed: amount, broken: false };
  }
  const absorbed = pool / breakMult;
  return { slot: null, toHp: amount - absorbed, poolLoss: pool, absorbed, broken: true };
}

/** Ordinary cleanse (spec §10): removes a harmful status only; an uncleansable payload (Faultline) refuses. */
export function cleanse(slot) {
  if (!slot) return { slot: null, removed: false, reason: $E('clashlog.no_status') };
  if (STATUS[slot.id].kind !== 'harmful') return { slot, removed: false, reason: 'ordinary cleanse removes harmful statuses only' };
  if (slot.payload?.uncleansable) return { slot, removed: false, reason: 'uncleansable' };
  return { slot: null, removed: true, reason: 'cleansed' };
}

/**
 * Explicit replacement (spec §10: "different statuses cannot replace it without an explicit removal/replacement ability"; Mountain
 * Shelter "creates a fresh Guarded episode ... overriding existing status/episode as specifically approved"). Only a caller holding
 * that explicit permission may use this. `overridesUncleansable` must be set by the caller when its approval says so.
 */
export function replaceWith(slot, attempt, { recipientInTurn = false, overridesUncleansable = false } = {}) {
  if (slot?.payload?.uncleansable && !overridesUncleansable) return { slot, accepted: false, reason: $E('clashlog.uncleansable_status_is_not_overridden_by') };
  return applyClash(null, attempt, { recipientInTurn });
}

/**
 * Clash -> football carry payload (opening / overtime Clash, spec §10; D10, D11). Unsupported statuses clear (transfer -> null).
 *  - Shielded: football strength is the original pool as a percentage of the recipient's max Clash HP, so football and Clash
 *    shields compare by original strength in one unit; the payload keeps the pool, remaining HP, remaining fraction, the spent
 *    fumble-save flag and the history; one fumble save unless it is spent (STA-09).
 *  - Confused: -20% effective Awareness in football (D10) via payload.pct; the Clash redirect chance is not carried.
 *  - Slowed / Quickened / Weakened / Empowered / Afflicted: the same percentage (D10), unchanged.
 */
export function toFootball(slot, maxHp) {
  const t = transfer(slot, 'football'); if (!t) return null;
  if (t.id === 'shielded') {
    const pool = t.payload?.pool ?? t.strength; const remaining = t.payload?.remaining ?? pool;
    const pct = (pool / maxHp) * 100;
    return { ...t, strength: pct, originalStrength: pct, payload: { ...t.payload, pool, remaining, fraction: pool ? remaining / pool : 0, saveSpent: !!t.payload?.saveSpent, fumbleSaves: t.payload?.saveSpent ? 0 : 1, clashPoolPct: pct } };
  }
  if (t.id === 'confused') return { ...t, payload: { ...(t.payload || {}), pct: CLASH_STATUS_VALUES.confusedFootballAwarenessPct } };
  return t;
}

/**
 * Football -> Clash carry (D11): a football-origin Shielded becomes 15% of max Clash HP (its clashPoolPct when it names one, else the
 * approved 15) as its original strength, and its remaining pool is that times its remaining fraction (football-created shields start
 * at fraction 1). The mode switch never refills: a depleted fraction stays depleted. Other supported statuses carry 1:1.
 */
export function fromFootball(slot, maxHp) {
  const t = transfer(slot, 'clash'); if (!t) return null;
  if (t.id !== 'shielded') return t;
  const pct = Number(t.payload?.clashPoolPct ?? CLASH_STATUS_VALUES.footballShieldClashPct);
  const pool = roundHalfUp((maxHp * pct) / 100);
  const fraction = Math.max(0, Math.min(1, Number(t.payload?.fraction ?? 1)));
  const remaining = Math.min(pool, roundHalfUp(pool * fraction));
  if (remaining <= 0) return null; // nothing left to absorb (T8_PROVISIONAL 'shield-depleted-ends-status')
  return { ...t, strength: pool, originalStrength: pool, payload: { ...t.payload, pool, remaining, fraction: remaining / pool, saveSpent: !!t.payload?.saveSpent } };
}
