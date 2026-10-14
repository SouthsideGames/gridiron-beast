import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES_DEX, RARITIES, TRAITS, ELEMENT_REGIONS } from '../src/data/species.js';
import { TYPES } from '../src/data/monsters.js';
import { REGIONS } from '../src/data/staff.js';
import { sprite16, spriteGrid } from '../src/ui/sprite16.js';

const POS = new Set(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']);

test('species dex: 72 species, 6 per element with the rarity split', () => {
  assert.equal(SPECIES_DEX.length, 72);
  for (const el of Object.keys(TYPES)) {
    const s = SPECIES_DEX.filter((x) => x.element === el);
    assert.equal(s.length, 6, el);
    const r = (k) => s.filter((x) => x.rarity === k).length;
    assert.deepEqual([r('common'), r('uncommon'), r('rare'), r('legendary')], [2, 2, 1, 1], el);
  }
});

test('species dex: names unique (including evolutions), fields valid', () => {
  const names = SPECIES_DEX.flatMap((s) => [s.name, ...s.evolution.map((e) => e.name)]);
  assert.equal(new Set(names).size, names.length);
  assert.equal(names.length, 102);
  const regionNames = new Set(Object.keys(REGIONS));
  for (const s of SPECIES_DEX) {
    assert.ok(RARITIES[s.rarity], s.id);
    assert.ok(POS.has(s.position) && (s.secondary == null || POS.has(s.secondary)), s.id);
    assert.ok(s.rarity === 'common' ? TRAITS[s.trait] : s.ability?.name, s.id);
    assert.ok(s.rarity === 'common' || s.evolution.length === 0, `${s.id} only commons evolve`);
    for (const r of s.regions || []) assert.ok(regionNames.has(r) && ELEMENT_REGIONS[s.element].includes(r), `${s.id} ${r}`);
    assert.match(s.colors[0], /^#[0-9a-f]{6}$/); assert.match(s.colors[1], /^#[0-9a-f]{6}$/);
  }
});

test('element regions match the region element lists', () => {
  for (const [el, regs] of Object.entries(ELEMENT_REGIONS)) for (const r of regs) assert.ok(REGIONS[r].types.includes(el), `${el} ${r}`);
});

test('sprite16: every species draws a distinct, outlined 16×16 sprite', () => {
  const seen = new Set();
  for (const s of SPECIES_DEX) {
    const g = spriteGrid(s);
    assert.equal(g.length, 16); assert.equal(g[0].length, 16);
    const filled = g.flat().filter(Boolean).length;
    assert.ok(filled > 50, `${s.id} too sparse (${filled})`);
    assert.ok(g.flat().includes('O'));
    const key = g.map((r) => r.join(',')).join('/');
    assert.ok(!seen.has(key), `${s.id} duplicates another sprite`); seen.add(key);
    assert.match(sprite16(s, 32), /^<svg/);
  }
});
