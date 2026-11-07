// Task 8 (WP8 core): mastery records and tiers (spec §6). One shared threshold set (0/10/30/60); football and Clash never credit
// each other; evolution keeps both records. Pure; not yet wired.
export const THRESHOLDS = Object.freeze([0, 10, 30, 60]);
export const TIERS = Object.freeze(['Developing', 'Practiced', 'Expert', 'Mastered']);
export const tierOf = (credits) => { let t = 0; for (let i = 0; i < THRESHOLDS.length; i++) if (credits >= THRESHOLDS[i]) t = i; return TIERS[t]; };
export const tierIndex = (credits) => TIERS.indexOf(tierOf(credits));

/** One credit per valid active execution, regardless of outcome; none for invalid or prevented pre-execution activations. */
export function creditActive(record, mode, { valid }) { if (!valid) return record; return { ...record, [mode]: (record[mode] || 0) + 1 }; }

/**
 * Passive/aura credit: at most once per cap scope when the core effect actually applied. Scopes: one per football game; one per
 * standalone Clash battle; opening and overtime Clash share one scope with their football game. `seen` is a Set of scope keys.
 */
export function creditPassive(record, mode, { applied, scope, seen }) {
  if (!applied || seen.has(`${mode}|${scope}`)) return record;
  seen.add(`${mode}|${scope}`); return { ...record, [mode]: (record[mode] || 0) + 1 };
}
/** Cap scope key for an activity. */
export const passiveScope = ({ gameId = null, standaloneClashId = null }) => (standaloneClashId ? `clash:${standaloneClashId}` : `game:${gameId}`);
