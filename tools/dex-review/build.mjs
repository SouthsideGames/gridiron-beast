// Builds the species review page: inlines the species dex and the 16×16
// sprite builder into one self-contained HTML file.
//   node tools/dex-review/build.mjs <out.html>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPECIES_DEX, RARITIES, TRAITS, ELEMENT_REGIONS, LEGEND_RULES, COLLECTION_MILESTONES } from '../../src/data/species.js';
import { TYPES } from '../../src/data/monsters.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const out = process.argv[2] || path.join(root, 'dex-review.html');
const sprite = fs.readFileSync(path.join(root, 'src/ui/sprite16.js'), 'utf8').replace(/^export /gm, '');
const meta = {
  elements: Object.keys(TYPES), hues: Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [k, v.hue])),
  rarities: RARITIES, traits: TRAITS, elementRegions: ELEMENT_REGIONS, legend: LEGEND_RULES, milestones: COLLECTION_MILESTONES,
};
const html = fs.readFileSync(path.join(here, 'template.html'), 'utf8')
  .replace('/*__SPRITE__*/', () => sprite)
  .replace('/*__DEX__*/', () => JSON.stringify(SPECIES_DEX))
  .replace('/*__META__*/', () => JSON.stringify(meta));
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(1)} KB)`);
