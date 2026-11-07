// Task 8 WP4: the reward ledger (spec §15). Rewards are awarded once per persistent activity and monster, aggregated by monster
// rather than by the depth-chart slot it occupied, and an interrupted application resumes without duplicating or skipping anyone.
// This module is pure bookkeeping: it does not decide reward amounts (those follow spec §6 and the open decisions), and nothing in
// the running game uses it yet.
//
// Ledger shape (plain JSON, saved with the franchise):
//   { v: 1, activities: { [activityId]: { complete: true } | { complete: false, done: [monsterId…] } } }
// A finished activity keeps only its completion flag, so the ledger stays small; `prune` drops old completed activities.

export const LEDGER_VERSION = 1;
export const createRewardLedger = () => ({ v: LEDGER_VERSION, activities: {} });

/** Activity ids are stable strings built by the caller, e.g. `fb:2027:w5:g3`, `clash:pregame:2027:w5:g3`, `offseason:2027`. */
export function assertActivityId(id) { if (typeof id !== 'string' || !id || /\s/.test(id)) throw new TypeError(`invalid activity id "${id}"`); return id; }

export const isComplete = (ledger, activityId) => ledger.activities[activityId]?.complete === true;
export function wasAwarded(ledger, activityId, monsterId) {
  const a = ledger.activities[activityId]; if (!a) return false; return a.complete === true || a.done.includes(monsterId);
}

/**
 * Aggregate per-slot contributions into one entry per monster (spec §15: "aggregate football statistics and actual participation
 * by monster, not occupied slot"). `rows` are { monsterId, … } objects; `merge(a, b)` combines two rows of the same monster.
 */
export function byMonster(rows, merge) {
  const out = new Map();
  for (const r of rows) { if (!r || r.monsterId == null) throw new TypeError('reward row without monsterId'); out.set(r.monsterId, out.has(r.monsterId) ? merge(out.get(r.monsterId), r) : r); }
  return [...out.values()];
}

/**
 * Apply one activity's awards exactly once per monster.
 * - `entries`: one per monster (duplicates are an error; aggregate with `byMonster` first).
 * - `apply(entry)`: performs the award for one monster. It runs in stable monsterId order, and the monster is marked done
 *   immediately after its award, in the same synchronous step, so the save captures award and mark together.
 * If `apply` throws, the monsters already marked keep their award and mark; calling `applyActivity` again with the same entries
 * resumes with the rest. Once every entry is done the activity is closed and later calls apply nothing.
 * Returns { applied: [monsterId…], skipped: [monsterId…], complete }.
 */
export function applyActivity(ledger, activityId, entries, apply) {
  assertActivityId(activityId);
  if (ledger?.v !== LEDGER_VERSION) throw new Error('reward ledger missing or from another version');
  const ids = entries.map((e) => e.monsterId);
  if (new Set(ids).size !== ids.length) throw new Error(`activity ${activityId}: duplicate monster entries; aggregate by monster first`);
  if (isComplete(ledger, activityId)) return { applied: [], skipped: ids, complete: true };
  const rec = (ledger.activities[activityId] ||= { complete: false, done: [] });
  const applied = []; const skipped = [];
  for (const e of [...entries].sort((a, b) => (String(a.monsterId) < String(b.monsterId) ? -1 : String(a.monsterId) > String(b.monsterId) ? 1 : 0))) {
    if (rec.done.includes(e.monsterId)) { skipped.push(e.monsterId); continue; }
    apply(e); rec.done.push(e.monsterId); applied.push(e.monsterId);
  }
  ledger.activities[activityId] = { complete: true };
  return { applied, skipped, complete: true };
}

/** Drop completed activities the caller no longer needs (for example, seasons older than the current one). */
export function prune(ledger, keep) {
  for (const [id, a] of Object.entries(ledger.activities)) if (a.complete === true && !keep(id)) delete ledger.activities[id];
  return ledger;
}
