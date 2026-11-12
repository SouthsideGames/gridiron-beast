// Names that stay in English in every language (owner 2026-11-11): club, stadium, species and reporter names, and the
// reporters' outlets. Their lines live in en.js like any other so there is still one place to edit them, but a translation
// never replaces them (setLanguage drops any entry for these keys) and the translator export leaves them out.
// Club and species names are not here yet only because their text has not moved into en.js; add their keys when it does.
export const KEEP_ENGLISH = Object.freeze(new Set([
  'stadiums.howling_glacier_bowl',
  'stadiums.guardian_icefield',
  'stadiums.northstar_park',
  'stadiums.ironpeak_foundry_dome',
  'stadiums.the_bolt_yard',
  'stadiums.crusher_canyon',
  'stadiums.sundown_mesa_field',
  'stadiums.thunderhead_stadium',
  'stadiums.stonehaven_field',
  'stadiums.gaslight_park',
  'stadiums.sentinel_pier_field',
  'stadiums.ashford_commons',
  'stadiums.the_ember_pit',
  'stadiums.cypress_hollow',
  'stadiums.sunfire_coliseum',
  'stadiums.palmetto_grove',
  'press.dirk_stirwell',
  'press.the_daily_snap',
  'press.dr_prudence_ledger',
  'press.gridiron_quarterly',
  'press.toby_fumbleton',
  'press.beast_beat_junior',
]));
