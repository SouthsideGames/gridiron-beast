// Beast Clash conditions: Burn, Chill, Daze, Shock. One active condition per combatant, with the
// approved priority rules (addendum A) and the safeguards (addendum E). Every call returns a
// result the engine logs, so the lifecycle is visible: applied, resisted, replaced, paused,
// resumed, expired. The lifecycle never depends on act order: ticks happen once per exchange
// in the engine's fixed step, and immunity is counted in exchanges, not actions.
import { CLASH_VALUES } from './values.js';

const C = CLASH_VALUES.conditions;

/** Mutable condition state for one combatant (kept on the engine's live record, not the frozen combatant). */
export function freshState() { return { cond: null, lastEnded: null, paused: null }; }

/**
 * Try to apply `kind` at exchange `ex`. Returns { result, words, before, after }.
 * result: 'applied' | 'replaced' | 'resisted_same' | 'resisted_weaker' | 'resisted_immune'
 */
export function applyCondition(state, kind, ex, { duration = C.duration, skips = 1 } = {}) {
  // A benched monster's condition is paused; the same rules compare against the paused one and the result stays paused.
  const benched = !state.cond && !!state.paused; const cur = benched ? state.paused : state.cond;
  const set = (c) => { if (benched) state.paused = c; else state.cond = c; };
  // Safeguard: one-exchange immunity after the same condition ends (two for Shock).
  if (state.lastEnded && state.lastEnded.kind === kind) {
    const gap = kind === 'shock' ? C.shockImmunityExchanges : C.immunityExchanges;
    if (ex - state.lastEnded.ex <= gap) return { result: 'resisted_immune', words: `immune to ${kind} this exchange` };
  }
  if (!cur) { set({ kind, left: duration, skips, skipped: 0 }); return { result: 'applied', words: `${kind} applied` }; }
  if (cur.kind === kind) return { result: 'resisted_same', words: `already ${kind === 'burn' ? 'burning' : kind === 'chill' ? 'chilled' : kind === 'daze' ? 'dazed' : 'shocked'} (no refresh)` };
  const curSev = cur.left <= 1 ? 0 : C.severity[cur.kind];
  if (C.severity[kind] > curSev) {
    const was = cur.kind; set({ kind, left: duration, skips, skipped: 0 });
    return { result: 'replaced', words: cur.left <= 1 ? `${was} wears off; ${kind} takes hold` : `${kind} replaces ${was}`, replaced: was };
  }
  return { result: 'resisted_weaker', words: `${cur.kind} holds; ${kind} has no effect` };
}

/** End-of-exchange tick for a front combatant: Burn damage, counters, expiry. Returns { burn, expired }. */
export function tickCondition(state, ex, maxHp) {
  const cur = state.cond; if (!cur) return { burn: 0, expired: null };
  let burn = 0;
  if (cur.kind === 'burn') burn = Math.round(maxHp * C.burnPerExchange);
  cur.left -= 1;
  if (cur.left <= 0) { state.cond = null; state.lastEnded = { kind: cur.kind, ex }; return { burn, expired: cur.kind }; }
  return { burn, expired: null };
}

/** Shock: the actor loses this action; the Shock is used up (unless it carries extra skips, e.g. Whiteout). Returns true when skipped. */
export function consumeShock(state, ex) {
  const cur = state.cond; if (!cur || cur.kind !== 'shock') return false;
  cur.skipped += 1;
  if (cur.skipped >= cur.skips) { state.cond = null; state.lastEnded = { kind: 'shock', ex }; }
  return true;
}
/** Remove the current condition outright (a cleanse). Returns the kind removed or null. */
export function cleanse(state, ex, only = 'any') {
  const cur = state.cond; if (!cur || (only !== 'any' && cur.kind !== only)) return null;
  state.cond = null; state.lastEnded = { kind: cur.kind, ex }; return cur.kind;
}
/** Bench: pause the condition with its remaining count. */
export function pauseCondition(state) { if (state.cond) { state.paused = state.cond; state.cond = null; return state.paused.kind; } return null; }
/** Return to the front: the paused condition resumes with its remaining count. */
export function resumeCondition(state) { if (state.paused) { state.cond = state.paused; state.paused = null; return state.cond.kind; } return null; }
export const CONDITION_KINDS = Object.freeze(['burn', 'chill', 'daze', 'shock']);
