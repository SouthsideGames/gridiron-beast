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
// --basic: review the Beast Dex's Basic creation batch (docs/beast-dex/data/families.json) instead of the game's species dex.
const basicMode = process.argv.includes('--basic');
const out = process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(root, basicMode ? 'dex-review-basic.html' : 'dex-review.html');
const sprite = fs.readFileSync(path.join(root, 'src/ui/sprite16.js'), 'utf8').replace(/^export /gm, '');
const meta = {
  elements: Object.keys(TYPES), hues: Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [k, v.hue])),
  rarities: RARITIES, traits: TRAITS, elementRegions: ELEMENT_REGIONS, legend: LEGEND_RULES, milestones: COLLECTION_MILESTONES,
};
let dex = SPECIES_DEX, title = 'Gridiron Beast Dex', intro = 'Round 2. Your renames and edits from round 1 are now the baseline (and live in the game). Five monsters are back for another look: Flarynx, Craggo and Tsunarok were redesigned; Statyx and Shardok were renamed. Tap a monster to edit it, approve it, or leave a note.';
if (basicMode) {
  const fams = JSON.parse(fs.readFileSync(path.join(root, 'docs/beast-dex/data/families.json'), 'utf8')).filter((f) => f.rarity === 'basic');
  const label = (a) => a[0].toUpperCase() + a.slice(1);
  dex = fams.map((f) => ({ id: f.id, name: f.name, element: f.type, rarity: 'basic', position: f.position, ...f.art.spec, personality: f.description, evolution: [], ability: null,
    summary: { title: f.buildIdentity, text: `Clash: ${f.clashArchetype}. Weak: ${f.weaknesses.map(label).join(', ')}. No unique abilities.` } }));
  title = 'Gridiron Beast — Basic families review';
  intro = 'The Basic creation batch: 120 standalone families, one per type and position, drawn by the game’s own sprite builder. Not in the game yet. Tap a monster to approve it, mark it as needing changes with a note or an edited recipe, or cut it.';
  meta.rarities = { basic: { label: 'Basic', note: 'Weak, affordable roster depth below Common: one positional strength (primary potential at most 59), explicit weaknesses, no unique football or Beast Clash ability. Standalone: no evolutions.' } };
  meta.rulesHtml = '<div><h3>The batch</h3><p>120 standalone Basic families, exactly one per type and position. Shared type rules, shared type moves, the shared Clash archetype perks and ordinary teammate effects apply to them as to any monster (approved rules; not yet in the game).</p></div>'
    + '<div><h3>How to review</h3><p>Tap a monster to approve it, mark it as needing changes (with a note or an edited recipe), or cut it. Decisions are kept per design, so rejecting one never regenerates the others.</p></div>';
}
const html = fs.readFileSync(path.join(here, 'template.html'), 'utf8')
  .replaceAll('/*__TITLE__*/', title)
  .replace('/*__INTRO__*/', () => intro)
  .replace('/*__SPRITE__*/', () => sprite)
  .replace('/*__DEX__*/', () => JSON.stringify(dex))
  .replace('/*__META__*/', () => JSON.stringify(meta));
fs.writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(1)} KB)`);
