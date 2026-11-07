// Basic art: build, check and lay out the 120 Basic sprites with the game's own 16×16 sprite builder (src/ui/sprite16.js).
// Review tooling only: it reads the game's art code and never changes it, and nothing here is wired into gameplay.
//
//   node docs/beast-dex/tools/art_review.mjs            (from the repository root)
//
// Writes, under docs/beast-dex/art/:
//   basic/<id>.svg            the sprite exactly as the game's builder draws it (16×16 viewBox, transparent background)
//   basic-art.json            every recipe with its checks and the SVG's SHA-256
//   review/<POS>.html         contact sheets by position: large labeled sprites, the game's display sizes, the same-position originals
//   review/in-context.html    the sprites inside the game's own Beast Dex markup and stylesheet
// Exit 1 when a recipe fails a check.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sprite16, spriteGrid } from '../../../src/ui/sprite16.js';
import { SPECIES_DEX } from '../../../src/data/species.js';
import { evolvedSpec, TYPES } from '../../../src/data/monsters.js';

const DEX = join(dirname(fileURLToPath(import.meta.url)), '..');
const families = JSON.parse(readFileSync(join(DEX, 'data/families.json'), 'utf8'));
const basics = families.filter((f) => f.rarity === 'basic');
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
// The builder's vocabulary (src/data/species.js design-spec comment and src/ui/sprite16.js).
const BODIES = ['biped', 'quadruped', 'serpent', 'avian', 'blob', 'insectoid', 'shelled'];
const SIZES = ['small', 'medium', 'large'], LOOKS = ['cute', 'cool', 'fierce'];
const FEATURES = ['horns', 'horn', 'ears', 'mane', 'spikes', 'fins', 'tail', 'flametail', 'wings', 'claws', 'crest', 'antennae', 'plates', 'glow', 'halo', 'crown', 'tusks', 'shell', 'beak', 'fangs', 'whiskers', 'ridge', 'collar', 'bulb'];
const PATTERNS = ['stripes', 'spots', 'mask', 'band', 'backstripe'];
const sha = (s) => createHash('sha256').update(s).digest('hex');
const gridKey = (g) => g.map((r) => r.map((c) => c || '.').join(',')).join('/');

// Every existing form (72 base species and their evolved forms) as the game draws it.
const existing = [];
for (const s of SPECIES_DEX) { existing.push({ name: s.name, spec: s }); (s.evolution || []).forEach((_, i) => existing.push({ name: s.evolution[i].name, spec: evolvedSpec(s, i + 1) })); }
const existingGrids = new Map(existing.map((e) => [gridKey(spriteGrid(e.spec)), e.name]));
const existingLooks = new Map(existing.map((e) => [gridKey(spriteGrid(e.spec)) + '|' + (e.spec.colors || []).join(), e.name]));

const problems = [], notes = [], records = [];
const seenGrid = new Map(), seenLook = new Map();
mkdirSync(join(DEX, 'art/basic'), { recursive: true }); mkdirSync(join(DEX, 'art/review'), { recursive: true });
for (const f of basics) {
  const spec = { id: f.id, name: f.name, ...f.art.spec };
  const p = (m) => problems.push(`${f.name}: ${m}`);
  if (!BODIES.includes(spec.body)) p(`unknown body ${spec.body}`);
  if (!SIZES.includes(spec.size)) p(`unknown size ${spec.size}`);
  if (spec.size === 'large') p('large is reserved for stronger designs; Basic recipes use small or medium');
  if (!LOOKS.includes(spec.look)) p(`unknown look ${spec.look}`);
  for (const x of spec.features || []) if (!FEATURES.includes(x)) p(`unknown feature ${x}`);
  if (!(spec.features || []).length || spec.features.length > 3) p(`Basic recipes carry 1-3 features (${(spec.features || []).length})`);
  if (spec.pattern && !PATTERNS.includes(spec.pattern)) p(`unknown pattern ${spec.pattern}`);
  if (!(Array.isArray(spec.colors) && spec.colors.length === 2 && spec.colors.every((c) => /^#[0-9a-f]{6}$/i.test(c)))) p('colors must be two #rrggbb values');
  const grid = spriteGrid(spec);
  const filled = grid.flat().filter(Boolean).length;
  if (grid.length !== 16 || grid.some((r) => r.length !== 16)) p('grid is not 16×16');
  if (filled < 40) p(`only ${filled} filled pixels`);
  const transparent = 256 - filled; if (transparent < 40) p('almost no transparent background');
  const key = gridKey(grid); const lookKey = key + '|' + spec.colors.join();
  if (existingLooks.has(lookKey)) p(`identical to existing ${existingLooks.get(lookKey)}`);
  if (seenLook.has(lookKey)) p(`identical to ${seenLook.get(lookKey)}`);
  if (existingGrids.has(key)) notes.push(`${f.name} shares its silhouette with existing ${existingGrids.get(key)} (different colours)`);
  if (seenGrid.has(key)) notes.push(`${f.name} shares its silhouette with ${seenGrid.get(key)} (different colours)`);
  seenGrid.set(key, f.name); seenLook.set(lookKey, f.name);
  const svg = sprite16(spec, 16, { cls: 'sprite' });
  const file = `art/basic/${f.id}.svg`;
  const standalone = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  writeFileSync(join(DEX, file), standalone + '\n');
  records.push({ id: f.id, name: f.name, type: f.type, position: f.position, archetype: f.clashArchetype, spec: f.art.spec, asset: file, svgSha256: sha(standalone + '\n'), filledPixels: filled, reviewStatus: f.reviewStatus });
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const hue = (t) => TYPES[t]?.hue ?? 0;
const css = `body{margin:0;padding:24px;background:#0d1a14;color:#e8efe9;font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}h1{margin:0 0 4px;font-size:22px}p{margin:0 0 16px;color:#a9b8ae}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.card{background:#14261d;border:1px solid #2a4034;border-radius:10px;padding:12px;display:flex;gap:12px;align-items:flex-start}
.big svg{width:128px;height:128px;background:repeating-conic-gradient(#1d3328 0% 25%,#183024 0% 50%) 50%/16px 16px;border-radius:6px}.meta b{font-size:16px;display:block}.tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:999px;margin:2px 4px 2px 0;background:#223a2e}
.sizes{display:flex;gap:6px;align-items:flex-end;margin-top:6px}.sizes span{font-size:10px;color:#7f9387;display:block;text-align:center}.small{font-size:12px;color:#a9b8ae;margin-top:4px}
.orig{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px;padding-top:12px;border-top:1px solid #2a4034}.orig div{text-align:center;font-size:11px;color:#a9b8ae}.orig svg{width:56px;height:56px}`;
for (const pos of POSITIONS) {
  const list = records.filter((r) => r.position === pos);
  const cards = list.map((r) => { const f = basics.find((x) => x.id === r.id); const spec = { id: r.id, ...r.spec };
    return `<div class="card"><div class="big">${sprite16(spec, 128)}</div><div class="meta"><b>${esc(r.name)}</b>
<span class="tag" style="background:hsl(${hue(r.type)} 45% 28%)">${esc(r.type)}</span><span class="tag">Basic</span><span class="tag">${esc(r.archetype)}</span>
<div class="small">${esc(f.buildIdentity)}. Weak: ${esc(f.weaknesses.join(', '))}.</div><div class="small">${esc(f.description)}</div>
<div class="small">${esc(r.spec.body)} · ${esc(r.spec.size)} · ${esc(r.spec.look)} · ${esc(r.spec.features.join(', '))}${r.spec.pattern ? ' · ' + esc(r.spec.pattern) : ''}</div>
<div class="sizes">${[24, 32, 40, 48].map((n) => `<div>${sprite16(spec, n)}<span>${n}px</span></div>`).join('')}</div><div class="small">ID <code>${esc(r.id)}</code></div></div></div>`; }).join('\n');
  const origs = existing.filter((e) => e.spec.position === pos).map((e) => `<div>${sprite16(e.spec, 56)}<br>${esc(e.name)}</div>`).join('');
  writeFileSync(join(DEX, `art/review/${pos}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Basic ${pos} art review</title><style>${css}</style></head><body>
<h1>Basic ${pos} families: art review</h1><p>12 designs drawn by the game's own sprite builder (src/ui/sprite16.js) at 128px on a transparency checkerboard, with the game's display sizes. Existing ${pos} forms are shown below for comparison. Status: pending owner review.</p>
<div class="grid">${cards}</div><div class="orig"><b style="width:100%;font-size:12px;color:#e8efe9">Existing ${pos} forms</b>${origs}</div></body></html>\n`);
}
// The game's own Beast Dex markup (src/ui/screens/dex.js) and stylesheet, with each element's six originals followed by its ten Basics.
const appCss = readFileSync(join(DEX, '../../styles/app.css'), 'utf8');
const sections = Object.keys(TYPES).map((el) => {
  const orig = SPECIES_DEX.filter((s) => s.element === el); const add = records.filter((r) => r.type === el);
  const cell = (s, rarity, label) => `<button class="dex-cell seen">${sprite16(s, 40)}<span class="dex-name">${esc(s.name)}</span><span class="dex-r r-${rarity}">${esc(label)}</span></button>`;
  return `<section class="dex-el"><div class="row between"><h3 style="color:hsl(${TYPES[el].hue} 70% 62%);margin:0">${esc(el)}</h3><span class="dim mono">${orig.length + add.length}</span></div>
<div class="dex-grid">${orig.map((s) => cell(s, s.rarity, s.rarity)).join('')}${add.map((r) => cell({ id: r.id, name: r.name, ...r.spec }, 'basic', `Basic · ${r.position}`)).join('')}</div></section>`;
}).join('\n');
writeFileSync(join(DEX, 'art/review/in-context.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Basic art in the Beast Dex</title><style>${appCss}\n.dex-r.r-basic{color:#9aa79f}</style></head><body><div id="app"><main class="screen"><h2>Beast Dex preview (review only)</h2>
<p class="muted">The game's Dex cells and stylesheet with the 120 Basics after each element's originals. Review preview only: the game's Dex is unchanged.</p>${sections}</main></div></body></html>\n`);

const summary = { generatedBy: 'docs/beast-dex/tools/art_review.mjs', pipeline: 'src/ui/sprite16.js (16×16 spec builder; static, no animation frames)', families: records.length, problems, notes, records };
writeFileSync(join(DEX, 'art/basic-art.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ families: records.length, problems, notes }, null, 2));
process.exit(problems.length ? 1 : 0);
