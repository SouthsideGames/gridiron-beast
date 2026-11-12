// Beast Dex wording for display (central text, stage 5: owner 2026-11-12).
// The Dex itself (docs/beast-dex/data, built into src/data/beast-dex.generated.js) stays the one source of its English text and of
// every id and value the simulations read. Nothing here changes that data. A screen that SHOWS a Dex line asks for it through
// dexLine(key, english): in English it gets the Dex's own line back; in another language it gets that language's line for the key.
// The keys below are what a translator's file uses; tools/dex-text.mjs lists every key with its English line for the export.
import { tOr } from './index.js';

/** The Dex's rule sections (ids in the data) and the short name each has in a key. */
export const SECTION_SLUG = Object.freeze({ 'Trigger / eligibility': 'trigger', 'Targets / placement': 'targets', 'Core resolution': 'core', 'Recharge / frequency': 'recharge', 'Lifetime / persistence': 'lifetime', 'Exceptions / counterplay': 'exceptions', 'Progression / notes': 'progression', 'Ability story': 'story' });
export const dexKey = Object.freeze({
  familyDescription: (familyId) => `dex.family.${familyId}.description`,
  abilityName: (abilityId) => `dex.ability.${abilityId}.name`,
  abilityMechanic: (abilityId) => `dex.ability.${abilityId}.mechanic`,
  abilityRule: (abilityId, section) => `dex.ability.${abilityId}.${SECTION_SLUG[section] || 'rule'}`,
  abilitySummary: (familyId) => `dex.summary.${familyId}`,
});
/** The line to show for a Dex key: the chosen language's, or the Dex's own English. */
export const dexLine = (key, english) => tOr(key, english);
