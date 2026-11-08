// Beast Clash t8: the normal-turn clock. Pure helpers over a combatant's live record; no randomness.
//
// Every combatant counts its own NORMAL turns (`turns`): one per turn it takes as the active monster, whether it acts or its turn
// is skipped (spec §10: "Clash counts recipient normal turns, including Stunned skips"; P6 step 3.2). Reserve time, reactions and
// counters are not normal turns and never advance it.
//
// A clock is a countdown held by one combatant and advanced only by that combatant's normal turns:
//   - kind 'duration' is held by the RECIPIENT of an effect (spec §10: durations count recipient normal turns);
//   - kind 'cooldown' is held by the OWNER of an ability (contracts: "subsequent owner normal turns").
// The turn a clock starts on is excluded when the holder is mid-turn (spec §10 "the application turn does not consume duration";
// contracts: "exclude application turn"). A clock started outside the holder's turn counts the holder's next normal turn.
// Clocks advance at the end of the holder's turn (P6 step 3.14), and expire when they reach 0.

export const CLOCK_KINDS = Object.freeze(['duration', 'cooldown']);

/** Start a clock on holder `x`. Returns the clock. `turns` must be a positive whole number. */
export function addClock(x, { id, kind, turns, source = null }) {
  if (!CLOCK_KINDS.includes(kind)) throw new Error(`Unknown clock kind ${kind}`);
  if (!Number.isInteger(turns) || turns < 1) throw new Error(`A clock needs a positive whole number of turns (got ${turns})`);
  if (typeof id !== 'string' || !id) throw new Error('A clock needs an id');
  if (x.clocks.some((k) => k.id === id)) throw new Error(`${x.c.id} already holds clock ${id}`);
  const clock = { id, kind, left: turns, total: turns, source, startedTurn: x.turns, excludeTurn: x.inTurn ? x.turns : -1 };
  x.clocks.push(clock);
  return clock;
}

/** End of the holder's normal turn: advance its clocks. Returns the clocks that expired (removed), in the order they were added. */
export function tickClocks(x) {
  const expired = [];
  for (const k of x.clocks) { if (k.excludeTurn === x.turns) continue; k.left -= 1; if (k.left <= 0) expired.push(k); }
  if (expired.length) x.clocks = x.clocks.filter((k) => k.left > 0);
  return expired;
}

/** Remove every clock of `kind` the holder has (a knockout clears durations). Returns the removed clocks. */
export function clearClocks(x, kind) {
  const gone = x.clocks.filter((k) => k.kind === kind); if (gone.length) x.clocks = x.clocks.filter((k) => k.kind !== kind);
  return gone;
}
