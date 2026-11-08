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

// ---------------------------------------------------------------- generator v2: proportion controls, 60 features, face and markings
import { CONTROLS, recipeDiagnostics } from '../src/ui/sprite-gen.js';
import { FEATURES, FEATURE_IDS, FEATURE_GROUPS, FACE, MARKINGS } from '../src/ui/sprite-features.js';
const H = (g) => createHash('sha256').update(JSON.stringify(g)).digest('hex').slice(0, 16);
const key = (g) => JSON.stringify(g);
const ok = (r) => { const d = recipeDiagnostics(r); return !d.problems.length && !d.invisible.length && !d.warnings.length; };
const checks = JSON.parse(readFileSync(new URL('../docs/beast-dex/art/generator/library-checks.json', import.meta.url)));

test('the owner-approved checkpoint 1 renders are unchanged by the control and feature layers (150/150)', () => {
  const fx = JSON.parse(readFileSync(new URL('./fixtures/v2-structures-approved.json', import.meta.url))).grids;
  for (const s of STRUCTURE_IDS) for (const p of POSES) assert.equal(H(spriteGrid({ structure: s, pose: p, colors: C })), fx[`${s}/${p}`], `${s}/${p}`);
});

test('every proportion control value changes the render on its demonstration structure', () => {
  for (const [k, def] of Object.entries(CONTROLS)) {
    const fx = checks.controls[k]; assert.ok(fx, `${k} has a fixture`); const vals = Object.keys(def.values);
    const feat = k === 'tailCurve' ? [{ id: 'tufted_tail' }] : k === 'wingFold' ? [{ id: 'feathered_wings' }] : undefined;
    const gs = vals.map((v) => spriteGrid({ structure: fx.structure, colors: C, proportions: { [k]: v }, ...(feat ? { features: feat } : {}) }));
    assert.equal(new Set(gs.map(key)).size, vals.length, `${k} on ${fx.structure}`);
    for (const v of vals.slice(1)) assert.ok(ok({ structure: fx.structure, proportions: { [k]: v }, ...(feat ? { features: feat } : {}) }), `${k}=${v} visible`);
  }
});

test('60 features in 10 groups; each has a visible demonstration fixture and the required variant sets render distinctly', () => {
  assert.equal(FEATURE_IDS.length, 60); assert.equal(Object.keys(FEATURE_GROUPS).length, 10);
  for (const id of FEATURE_IDS) {
    const fx = checks.featureFixtures[id]; assert.ok(fx, `${id} fixture`);
    const vars = FEATURES[id].variants || [null]; const base = key(spriteGrid({ structure: fx.structure, colors: C })); const seen = new Set();
    for (const v of vars) { const r = { structure: fx.structure, colors: C, features: [v ? { id, variant: v } : { id }] }; assert.ok(ok(r), `${id}/${v} visible on ${fx.structure}`); const g = key(spriteGrid(r)); assert.notEqual(g, base, `${id}/${v} changes pixels`); seen.add(g); }
    assert.equal(seen.size, vars.length, `${id} variants distinct`);
  }
  for (const id of ['ears', 'horns', 'antlers', 'crest', 'frill', 'shell', 'claws', 'pincers', 'antennae', 'tufted_tail', 'feathered_wings', 'membrane_wings', 'insect_wings']) assert.ok(FEATURES[id].variants?.length >= 3, `${id} has three shapes`);
});

test('face and marking controls each change the render', () => {
  for (const [k, vals] of Object.entries(FACE)) assert.equal(new Set(vals.map((v) => key(spriteGrid({ structure: 'compact_upright', colors: C, face: { [k]: v } })))).size, vals.length, `face ${k}`);
  assert.equal(new Set(MARKINGS.pattern.map((p) => key(spriteGrid({ structure: 'compact_quadruped', colors: C, markings: { pattern: p } })))).size, MARKINGS.pattern.length);
});

test('unsupported and invisible combinations produce diagnostics instead of passing silently', () => {
  assert.match(recipeProblems({ structure: 'jellyfish', features: [{ id: 'hooves' }] }).join(), /hooves/);
  assert.match(recipeProblems({ structure: 'compact_quadruped', features: [{ id: 'horns', variant: 'giant' }] }).join(), /variant/);
  assert.match(recipeProblems({ structure: 'compact_quadruped', features: [{ id: 'wings' }] }).join(), /unknown feature/);
  assert.match(recipeProblems({ structure: 'compact_quadruped', proportions: { tailCurve: 'curled' } }).join(), /needs a tail feature/);
  assert.match(recipeProblems({ structure: 'batlike', features: [{ id: 'membrane_wings' }] }).join(), /membrane/);
  assert.match(recipeProblems({ structure: 'compact_quadruped', features: [{ id: 'tufted_tail' }, { id: 'club_tail' }] }).join(), /tail/);
  assert.throws(() => spriteGrid({ structure: 'jellyfish', colors: C, features: [{ id: 'hooves' }] }), /sprite recipe/);
  // an occluded choice is reported by the render check: no proportion or feature may count as diversity without changing pixels
  let invisible = 0;
  for (const s of STRUCTURE_IDS) for (const id of FEATURE_IDS) { const v = FEATURES[id].variants?.[0]; const r = { structure: s, features: [v ? { id, variant: v } : { id }] }; if (recipeProblems(r).length) continue;
    const d = recipeDiagnostics(r); const same = key(spriteGrid({ structure: s, colors: C })) === key(spriteGrid({ ...r, colors: C }));
    assert.equal(same, d.invisible.length > 0, `${s} ${id}: diagnostics agree with the pixels`); if (same) invisible++; }
  assert.ok(invisible > 0, 'the matrix contains reported invisible cases (e.g. horns with no room above the head)');
});

test('deterministic, cache-keyed and preview/export-consistent with controls and features', () => {
  const r = { id: 'probe2', structure: 'compact_quadruped', colors: C, proportions: { headSize: 'large', limbLength: 'long' }, features: [{ id: 'horns', variant: 'curled' }, { id: 'tufted_tail', variant: 'raised' }], face: { mouth: 'grin' }, markings: { pattern: 'stripes' } };
  assert.equal(key(spriteGrid(r)), key(spriteGrid(structuredClone(r))));
  const svg = sprite16(r, 48);
  for (const alt of [{ proportions: { headSize: 'small' } }, { features: [{ id: 'horns', variant: 'swept' }] }, { face: { mouth: 'frown' } }, { markings: { pattern: 'spots' } }]) assert.notEqual(sprite16({ ...r, ...alt }, 48), svg, JSON.stringify(alt));
  const g = spriteGrid(r); const pal = palette(C); const decoded = Array.from({ length: 16 }, () => Array(16).fill(null));
  for (const [, x, y, w, fill] of sprite16(r, 16).matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1" fill="([^"]+)"/g)) for (let k = 0; k < +w; k++) decoded[+y][+x + k] = fill;
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) assert.equal(decoded[y][x], g[y][x] ? pal[g[y][x]] : null);
});

// ---------------------------------------------------------------- the 120 Basics redrawn with generator v2 (pending owner final review)
test('Basic v2 art: one clean recipe per Basic family; identities untouched; no duplicate or near-identical silhouettes', () => {
  const fams = JSON.parse(readFileSync(new URL('../docs/beast-dex/data/basic-authoring.json', import.meta.url))).families;
  const recs = JSON.parse(readFileSync(new URL('../docs/beast-dex/data/basic-art-v2.json', import.meta.url))).recipes;
  assert.equal(recs.length, 120); assert.deepEqual(recs.map((r) => r.id).sort(), fams.map((f) => f.id).sort());
  const allowed = new Set(['id', 'structure', 'pose', 'proportions', 'features', 'face', 'markings', 'colors']);
  for (const r of recs) for (const k of Object.keys(r)) assert.ok(allowed.has(k), `${r.id}: field ${k} (identity and gameplay fields stay in the family data)`);
  const F = Object.fromEntries(fams.map((f) => [f.id, f]));
  const grids = recs.map((r) => { const spec = { colors: F[r.id].art.colors, ...r, id: `${r.id}_v2`, size: F[r.id].art.size }; const d = recipeDiagnostics(spec);
    assert.deepEqual([d.problems.length, d.invisible.length, d.warnings.length], [0, 0, 0], `${r.id}: ${[...d.problems, ...d.invisible, ...d.warnings].join('; ')}`); return spriteGrid(spec); });
  const originals = SPECIES_DEX.flatMap((s) => [0, 1, 2].slice(0, s.evolution.length + 1).map((st) => spriteGrid(evolvedSpec(s, st))));
  const bitsOf = (g) => g.flat().map((v) => (v ? 1 : 0)); const mirr = (g) => g.map((row) => row.slice().reverse());
  const jac = (a, b) => { let i = 0, u = 0; for (let k = 0; k < 256; k++) { i += a[k] & b[k]; u += a[k] | b[k]; } return i / u; };
  const S = grids.map((g) => [bitsOf(g), bitsOf(mirr(g))]); const O = originals.map((g) => bitsOf(g));
  let worst = 0;
  for (let i = 0; i < S.length; i++) { for (let j = i + 1; j < S.length; j++) worst = Math.max(worst, jac(S[i][0], S[j][0]), jac(S[i][0], S[j][1])); for (const o of O) worst = Math.max(worst, jac(S[i][0], o), jac(S[i][1], o)); }
  assert.ok(worst < 0.85, `closest silhouette pair ${worst.toFixed(3)} must stay below the 0.85 review threshold`);
});
