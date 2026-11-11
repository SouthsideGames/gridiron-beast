// Task 8 M6: the data behind the player screens. Every family's abilities come from the Beast Dex (never the retired legacy cards),
// mastery is read per mode, the three collection achievements count families, and the 30 FPS mode only gates redraws.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIES, abilitiesOf } from '../src/data/beast-dex.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { THRESHOLDS, TIERS } from '../src/franchise/t8/mastery.js';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_ID } from '../src/data/achievements.js';
import { DEX_GROUPS, dexRecord, checkAchievements } from '../src/franchise/franchise.js';
import { resetDex } from '../src/franchise/dex-store.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { frameGate, applyFrameRate, frameRateOf, currentFrameRate, FRAME_RATES } from '../src/ui/frame-rate.js';

// ability-info.js imports the DOM helper module; it only needs `esc`, which is pure.
const { abilityInfo, abilitiesHtml, hasAbilities, masteryInfo, masteryBarHtml, MODES } = await import('../src/ui/ability-info.js');

test('every original family shows its two Dex abilities; every Basic shows none; no legacy card text is used', () => {
  let withAb = 0, basics = 0;
  for (const fam of FAMILIES) {
    const dex = abilitiesOf(fam.id);
    if (fam.rarity === 'basic') { basics++; assert.equal(hasAbilities(fam.id), false, fam.id); assert.equal(abilityInfo(fam.id, 'football'), null); assert.match(abilitiesHtml(fam.id), /Basic families have no signature ability/); continue; }
    withAb++;
    for (const mode of MODES) {
      const a = abilityInfo(fam.id, mode); assert.ok(a, `${fam.id} ${mode}`);
      assert.equal(a.id, dex[mode].id); assert.equal(a.name, dex[mode].name); assert.ok(a.summary.length > 10, `${a.id} summary`); assert.ok(a.sections.length >= 3, `${a.id} rules`);
      assert.ok(!a.summary.startsWith(`${a.id}:`), `${a.id}: the summary has no record prefix`);
    }
    const html = abilitiesHtml(fam.id); assert.ok(html.includes(dex.football.name.replace(/&/g, '&amp;').replace(/'/g, '&#39;')) || html.includes(dex.football.id)); assert.ok(html.includes(`data-ability="${dex.clash.id}"`));
    const legacy = SPECIES_DEX.find((s) => s.id === fam.id)?.ability;
    if (legacy && legacy.name !== dex.football.name && legacy.name !== dex.clash.name) assert.ok(!html.includes(`<b>${legacy.name}</b>`), `${fam.id}: the retired card "${legacy.name}" is not shown`);
    if (legacy) assert.ok(!html.includes(legacy.text), `${fam.id}: the retired card text is not shown`);
  }
  assert.deepEqual([withAb, basics], [72, 120]);
});

test('mastery per mode: tiers at 0 / 10 / 30 / 60, progress toward the next tier, two independent records', () => {
  const fam = FAMILIES.find((x) => x.rarity !== 'basic').id; const m = (football, clash) => ({ species: fam, dev: { mastery: { football, clash } } });
  assert.deepEqual(THRESHOLDS.slice(), [0, 10, 30, 60]);
  const at = (c) => masteryInfo(m(c, 0), 'football');
  assert.deepEqual([at(0).tier, at(9).tier, at(10).tier, at(29).tier, at(30).tier, at(59).tier, at(60).tier, at(500).tier], ['Developing', 'Developing', 'Practiced', 'Practiced', 'Expert', 'Expert', 'Mastered', 'Mastered']);
  assert.deepEqual([at(0).pct, at(5).pct, at(10).pct, at(20).pct, at(45).pct, at(60).pct], [0, 50, 0, 50, 50, 100]);
  assert.deepEqual([at(7).need, at(7).next, at(7).nextTier, at(60).mastered, at(60).need], [3, 10, TIERS[1], true, 0]);
  const both = m(30, 4); assert.equal(masteryInfo(both, 'football').tier, 'Expert'); assert.equal(masteryInfo(both, 'clash').tier, 'Developing');
  assert.match(masteryBarHtml(both, 'clash'), /data-mode="clash"/); assert.match(masteryBarHtml(both, 'clash'), /4\/10 uses/);
  const basic = FAMILIES.find((x) => x.rarity === 'basic').id; assert.equal(masteryBarHtml({ species: basic, dev: { mastery: { football: 0, clash: 0 } } }, 'football'), '');
});

test('collection achievements: the original 72, the 120 Basics and all 192, separately, by family, once each', () => {
  for (const id of ['dex_original', 'dex_basic', 'dex_all']) assert.ok(ACHIEVEMENT_BY_ID[id], id);
  assert.equal(ACHIEVEMENTS.length, 24);
  resetDex(); const f = newFranchise(3, { difficulty: 'pro' }); f.scenes = []; f.achievements = {};
  const earned = (ids) => ids.filter((id) => id.startsWith('dex_'));
  assert.deepEqual(earned(checkAchievements(f, 'sunday', {})), [], 'nothing at the start');
  for (const id of DEX_GROUPS.original) for (const stage of [0, 1, 2]) dexRecord(f, { species: id, stage }, 'seen'); // every form: still one family each
  assert.deepEqual(earned(checkAchievements(f, 'sunday', {})), ['dex_original']);
  for (const id of DEX_GROUPS.basic.slice(0, 119)) dexRecord(f, { species: id }, 'seen');
  assert.deepEqual(earned(checkAchievements(f, 'sunday', {})), [], '119 Basics is not all of them');
  dexRecord(f, { species: DEX_GROUPS.basic[119] }, 'seen');
  assert.deepEqual(earned(checkAchievements(f, 'sunday', {})).sort(), ['dex_all', 'dex_basic']);
  assert.deepEqual(earned(checkAchievements(f, 'sunday', {})), [], 'once each');
  resetDex();
});

test('30 FPS battery saver: the gate passes every frame at 60 and about every second 60 Hz frame at 30', () => {
  assert.deepEqual(FRAME_RATES.slice(), [60, 30]); assert.equal(frameRateOf(null), 60); assert.equal(frameRateOf({ frameRate: 30 }), 30); assert.equal(frameRateOf({ frameRate: 45 }), 60);
  const frames = Array.from({ length: 120 }, (_, i) => i * (1000 / 60));
  applyFrameRate({}); assert.equal(currentFrameRate(), 60); let g = frameGate(); assert.equal(frames.filter((t) => g(t)).length, 120);
  applyFrameRate({ frameRate: 30 }); g = frameGate(); assert.equal(frames.filter((t) => g(t)).length, 60);
  applyFrameRate({});
});

test('an Apex is ageless in fact: generated at a fixed young age, so his retirement chance is zero in the worst case (spec §5)', async () => {
  const { generateMonster } = await import('../src/data/monsters.js'); const { createRng } = await import('../src/core/rng.js'); const { retireChance, trueOnset } = await import('../src/data/aging.js');
  const { offseason } = await import('../src/franchise/progression.js');
  const rng = createRng(4242); const P = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']; const apex = [];
  for (let i = 0; i < 12000; i++) { const m = generateMonster(rng, { position: P[i % 10], quality: 40 + (i % 45), channel: ['roster', 'draft', 'scouting', 'encounter', 'arrival'][i % 5], age: i % 3 ? null : 20 + (i % 14), yearsPro: i % 3 ? null : i % 14 }); if (m.dev.apex) apex.push(m); }
  assert.ok(apex.length >= 60, `${apex.length} Apex in 12,000 events`);
  const before = apex.map((m) => m.age); offseason(apex, createRng(7), { autoAllocate: false }); offseason(apex, createRng(8), { autoAllocate: false });
  assert.deepEqual(apex.map((m) => m.age), before, 'two offseasons do not age an Apex');
  for (const m of apex) { const y = (m.age + 1) - (trueOnset(m) + 4); for (const o of [{}, { unsigned: true, injury: 'severe' }, { declinedReserve: true, injury: 'severe' }]) assert.equal(retireChance(y, o), 0, `${m.id} age ${m.age}`); }
});
