import { formOf } from '../data/monsters.js';
import { t as $t } from '../text/index.js';
import { esc } from './dom.js';
/** Current species/form is the secondary identity; the personal name remains the heading. */
export const beastSpeciesLabel = m => m?.species ? formOf(m).name : '';
export const beastSpeciesHtml = m => m?.species ? `<span class="beast-species">${esc(m.companion ? $t('franchise.wild', { species: beastSpeciesLabel(m) }) : beastSpeciesLabel(m))}</span>` : '';
