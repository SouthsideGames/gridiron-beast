// The one type chart (GDD §32). Beast Clash (src/clash/types.js) and football (src/sim/type-matchups.js) both read this
// table; each applies its own strength. Every type beats two types and loses to two; the other seven are neutral.
// This is the approved Beast Clash chart (values 1.1.0), unchanged. Imports nothing.

export const BEATS = Object.freeze({
  Water: Object.freeze(['Fire', 'Earth']), Fire: Object.freeze(['Nature', 'Ice']), Earth: Object.freeze(['Electric', 'Fire']), Electric: Object.freeze(['Water', 'Metal']),
  Ice: Object.freeze(['Dragon', 'Nature']), Light: Object.freeze(['Dark', 'Psychic']), Dark: Object.freeze(['Psychic', 'Electric']), Nature: Object.freeze(['Water', 'Light']),
  Metal: Object.freeze(['Ice', 'Light']), Wind: Object.freeze(['Dark', 'Earth']), Dragon: Object.freeze(['Metal', 'Wind']), Psychic: Object.freeze(['Dragon', 'Wind']),
});
/** The display order used by the Type Chart screen. */
export const CHART_TYPES = Object.freeze(['Fire', 'Water', 'Nature', 'Electric', 'Earth', 'Ice', 'Wind', 'Psychic', 'Dark', 'Light', 'Metal', 'Dragon']);

/** 'strong' when a's type beats b's, 'weak' when b's beats a's, otherwise 'even'. Unknown or missing types are 'even'. */
export function chartEdge(a, b) {
  if (!a || !b) return 'even';
  if (BEATS[a]?.includes(b)) return 'strong';
  if (BEATS[b]?.includes(a)) return 'weak';
  return 'even';
}
/** What a type beats, loses to, and is neutral against (itself included in neutral). */
export function typeProfile(type) {
  const strong = [...(BEATS[type] || [])];
  const weak = CHART_TYPES.filter((t) => BEATS[t]?.includes(type));
  const neutral = CHART_TYPES.filter((t) => !strong.includes(t) && !weak.includes(t));
  return { type, strong, weak, neutral };
}
