// Sprite generator v2 (docs/beast-dex/SPRITE_GENERATOR_BRIEF.md), checkpoint 1 foundation: 30 structures × 5 poses, opt-in,
// with the legacy seven-template path unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spriteGrid, sprite16, palette } from '../src/ui/sprite16.js';
import { STRUCTURE_IDS, STRUCTURES, POSES, structureGrid, recipeProblems } from '../src/ui/sprite-gen.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { evolvedSpec } from '../src/data/monsters.js';

const C = ['#8f9a94', '#c9d1cc'];
const mask = (g) => g.map((r) => r.map((v) => (v ? 1 : 0)).join('')).join('/');

test('30 structures, each with its own defining anatomy; 150 structure/pose combinations render valid 16×16 output', () => {
  assert.equal(STRUCTURE_IDS.length, 30); assert.equal(POSES.length, 5);
  const pal = palette(C);
  for (const id of STRUCTURE_IDS) {
    assert.ok(STRUCTURES[id].name && STRUCTURES[id].anatomy, id);
    for (const pose of POSES) {
      const g = spriteGrid({ structure: id, pose, colors: C });
      assert.equal(g.length, 16); assert.ok(g.every((r) => r.length === 16));
      for (const v of g.flat()) if (v) assert.ok(v in pal, `${id}/${pose}: palette code ${v}`);
      assert.ok(g.flat().filter(Boolean).length >= 40, `${id}/${pose}: too few pixels`);
      const body = (v) => v && v !== 'O'; assert.ok(!g[0].some(body) && !g.some((r) => body(r[0]) || body(r[15])), `${id}/${pose}: clipped at the frame edge`);
    }
  }
});

test('silhouettes: no two of the 150 combinations share a mask; every structure has five distinct pose silhouettes', () => {
  const seen = new Map();
  for (const id of STRUCTURE_IDS) {
    const own = new Set();
    for (const pose of POSES) { const m = mask(spriteGrid({ structure: id, pose, colors: C })); assert.ok(!seen.has(m), `${id}/${pose} repeats ${seen.get(m)}`); seen.set(m, `${id}/${pose}`); own.add(m); }
    assert.equal(own.size, 5, id);
  }
});

test('deterministic: the same recipe always gives the same pixels; size and mirroring are real controls', () => {
  for (const id of STRUCTURE_IDS) {
    const r = { structure: id, pose: 'alert', colors: C };
    assert.deepEqual(structureGrid(r).grid, structureGrid({ ...r }).grid);
    assert.notEqual(mask(spriteGrid({ ...r, size: 'small' })), mask(spriteGrid(r)), `${id}: size changes nothing`);
  }
  const m = spriteGrid({ structure: 'crustacean', pose: 'expressive', colors: C, mirror: true }); assert.ok(m.every((r) => mask([r]) === mask([r.slice().reverse()])), 'mirror makes it symmetric');
  assert.notEqual(mask(m), mask(spriteGrid({ structure: 'crustacean', pose: 'expressive', colors: C })), 'mirroring is optional: the default keeps the raised claw');
});

test('legacy path unchanged: all 102 original forms and the 120 Basic recipes render exactly as before generator v2', () => {
  const snap = JSON.parse(readFileSync(new URL('./fixtures/legacy-sprites-before-v2.json', import.meta.url), 'utf8')).sprites;
  const fams = JSON.parse(readFileSync(new URL('../docs/beast-dex/data/families.json', import.meta.url), 'utf8')).filter((f) => f.rarity === 'basic');
  const specs = [];
  for (const s of SPECIES_DEX) { specs.push([s.id, s]); s.evolution.forEach((_, i) => specs.push([`${s.id}_e${i + 1}`, evolvedSpec(s, i + 1)])); }
  for (const f of fams) specs.push([f.id, { id: f.id, name: f.name, ...f.art.spec }]);
  assert.equal(specs.length, 222);
  const h = (x) => createHash('sha256').update(x).digest('hex').slice(0, 16);
  for (const [id, sp] of specs) assert.deepEqual({ grid: h(JSON.stringify(spriteGrid(sp))), svg48: h(sprite16(sp, 48, { tint: 2 })) }, snap[id], id);
});

test('diagnostics: unknown structures, poses, sizes and fields are reported, never silently drawn as a biped', () => {
  assert.match(recipeProblems({ structure: 'dragon_thing' })[0], /unknown structure "dragon_thing"/);
  assert.match(recipeProblems({ structure: 'shelled', pose: 'sleeping' })[0], /unknown pose "sleeping"/);
  assert.match(recipeProblems({ structure: 'shelled', size: 'huge' })[0], /unknown size/);
  assert.match(recipeProblems({ structure: 'shelled', horns: 'big' })[0], /unknown recipe field "horns"/);
  assert.throws(() => spriteGrid({ structure: 'nope', colors: C }), /sprite recipe: unknown structure/);
  assert.deepEqual(recipeProblems({ structure: 'shelled', pose: 'braced', size: 'medium', colors: C, mirror: false }), []);
});

test('cache identity includes every v2 control; preview SVG and the exported grid agree pixel for pixel', () => {
  const r = { id: 'probe', structure: 'hopping', colors: C };
  const svgs = new Set(POSES.map((pose) => sprite16({ ...r, pose }, 48)));
  assert.equal(svgs.size, 5, 'each pose is a separate cache entry');
  assert.notEqual(sprite16({ ...r, pose: 'alert', mirror: true }, 48), sprite16({ ...r, pose: 'alert' }, 48));
  for (const id of STRUCTURE_IDS) {
    const spec = { id: `p_${id}`, structure: id, pose: 'forward', colors: C }; const g = spriteGrid(spec); const pal = palette(C);
    const decoded = Array.from({ length: 16 }, () => Array(16).fill(null));
    for (const [, x, y, w, fill] of sprite16(spec, 16).matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1" fill="([^"]+)"/g)) for (let k = 0; k < +w; k++) decoded[+y][+x + k] = fill;
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) assert.equal(decoded[y][x], g[y][x] ? pal[g[y][x]] : null, `${id} (${x},${y})`);
  }
});
