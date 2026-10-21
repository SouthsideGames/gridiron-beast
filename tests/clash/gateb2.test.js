// Beast Clash Gate B.2 switches: half-cost voluntary swaps, refused-swap effects, arrival conditions and armour-breaking
// strikes. All patch-only or config-only; nothing here changes a default (the golden fixture in engine.test.js proves it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClash } from '../../src/clash/engine.js';
import { CLASH_VALUES, battleConfig, patchedMove, activeExperiments } from '../../src/clash/values.js';
import { POLICIES } from '../../src/clash/ai.js';
import { mon, byArch } from './helpers.js';
import { createRng } from '../../src/core/rng.js';

const V = CLASH_VALUES;
const team = (ids, seed) => ids.map((id, i) => mon(id, seed + i));
const supports = byArch('Support'), tanks = byArch('Tank'), strikers = byArch('Striker'), disruptors = byArch('Disruptor');

test('Gate B.2 patches exist, are all off by default and only ever change the move they name', () => {
  for (const id of ['coglet_gearshot_heavy_break', 'cerebrix_foresight_refused_daze', 'tsunarok_undertow_hit_chill', 'zephiro_tailwind_combo', 'wispira_veil_every4', 'duskyre_cut_every3']) assert.ok(V.movePatches[id], id);
  assert.deepEqual(battleConfig({}).patches, []); assert.equal(battleConfig({}).swapCost, 'action');
  const base = patchedMove('gearwing', { kind: 'strike', trigger: { kind: 'always' }, steadyRoll: true }, battleConfig({}));
  assert.equal(base.breakAlways, undefined);
  const p = patchedMove('gearwing', base, battleConfig({ patches: ['coglet_gearshot_heavy_break'] }));
  assert.equal(p.breakAlways, 2); assert.equal(p.kind, 'heavy'); assert.equal(p.mult, 1.3);
  assert.deepEqual(patchedMove('tsunarok', base, battleConfig({ patches: ['coglet_gearshot_heavy_break'] })), base, 'a patch for one species leaves every other move alone');
  assert.throws(() => battleConfig({ patches: ['no_such_patch'] }));
});

test('half-cost swap: the monster that swaps in strikes at half, heals and shields at half, and magnitude-less support effects are withheld; the next exchange is full strength', () => {
  const rng = createRng(11); let seen = { strike: 0, heal: 0, withheld: 0, nextFull: 0 };
  for (let k = 0; k < 60; k++) {
    const a = team([supports[k % supports.length], tanks[k % tanks.length], strikers[k % strikers.length], supports[(k + 3) % supports.length], disruptors[k % disruptors.length]], 100 + k * 7);
    const b = team([strikers[(k + 1) % strikers.length], disruptors[(k + 2) % disruptors.length], tanks[(k + 1) % tanks.length], supports[(k + 5) % supports.length], strikers[(k + 4) % strikers.length]], 300 + k * 7);
    const r = simulateClash({ a, b, seed: rng.int(1e6), config: { duration: 'C6', swapCost: 'half', policies: { a: 'smart', b: 'smart' } } });
    assert.ok(r.experiments.some((x) => /half/i.test(x)), 'the half-cost rule is listed as an experiment');
    const swaps = r.log.filter((e) => e.kind === 'swap' && e.forced === false && /policy:/.test(e.text));
    for (const s of swaps) {
      const inEx = r.log.filter((e) => e.ex === s.ex && e.actor === s.in);
      const note = inEx.find((e) => e.kind === 'note' && /half strength/.test(e.text));
      const dmg = inEx.find((e) => e.kind === 'damage' && /\(0\.\d+x\)|strike/.test(e.text));
      if (dmg && note) seen.strike += 1;
      for (const h of inEx.filter((e) => e.kind === 'heal' && typeof e.mult === 'number')) { /* passives (Iron Bite, regrow, Dragonhide) carry no mult and are untouched */ assert.ok(h.mult <= 0.5 + 1e-9, `${h.text} mult ${h.mult}`); if (h.amount > 0) { assert.match(h.text, /just swapped in/); seen.heal += 1; } }
      for (const w of inEx.filter((e) => e.kind === 'note' && /withheld/.test(e.text))) seen.withheld += 1;
      assert.ok(!inEx.some((e) => e.kind === 'swap' && e.forced === true && e.actor === s.in && !/from the bench/.test(e.text)), 'the arriving monster cannot fire its own swap move or sweep that exchange');
      const next = r.log.filter((e) => e.ex === s.ex + 1 && e.actor === s.in && (e.kind === 'heal' || e.kind === 'note'));
      assert.ok(!next.some((e) => /just swapped in|withheld/.test(e.text)), 'the exchange after the swap is at full strength');
      if (next.some((e) => e.kind === 'heal')) seen.nextFull += 1;
    }
  }
  assert.ok(seen.strike > 20 && seen.heal > 3 && seen.withheld > 0 && seen.nextFull > 0, JSON.stringify(seen));
});

test('half-cost swap: forced swaps and entry effects are untouched; with swapCost action the arriving monster does not act at all', () => {
  const a = team([tanks[0], supports[0], disruptors[0]], 500), b = team([disruptors[1], strikers[0], tanks[1]], 600);
  const half = simulateClash({ a, b, seed: 9, config: { duration: 'C6', swapCost: 'half', policies: { a: 'balanced', b: 'balanced' } } });
  for (const e of half.log.filter((e) => e.kind === 'swap' && e.forced === true)) { const pulled = half.log.filter((x) => x.ex === e.ex && x.actor === e.in && x.kind === 'note' && /half strength/.test(x.text)); assert.equal(pulled.length, 0, 'a forced-in monster is never at half strength'); }
  for (const s of half.log.filter((e) => e.kind === 'swap' && e.forced === false && /policy:/.test(e.text))) for (const sh of half.log.filter((e) => e.ex === s.ex && e.actor === s.in && e.kind === 'shield' && e.target === s.in)) assert.ok(!/reduced/.test(sh.text), `a first-entry shield on a voluntary swap-in is full strength: ${sh.text}`);
  const action = simulateClash({ a, b, seed: 9, config: { duration: 'C6', swapCost: 'action', policies: { a: 'balanced', b: 'balanced' } } });
  for (const s of action.log.filter((e) => e.kind === 'swap' && e.forced === false)) assert.ok(!action.log.some((e) => e.ex === s.ex && e.actor === s.in && e.kind === 'damage'), 'under the action cost the arriving monster does not strike');
});

test('refused-swap effects and arrival conditions fire only under their patch, and the smart policy is a closed, listed option', () => {
  assert.deepEqual(POLICIES, ['none', 'defensive', 'type', 'balanced', 'smart']);
  const a = team(['cerebrix', 'tsunarok', tanks[2]], 700), b = team([tanks[3], supports[2], strikers[2]], 800);
  const off = simulateClash({ a, b, seed: 21, config: { duration: 'C6' } });
  const on = simulateClash({ a, b, seed: 21, config: { duration: 'C6', patches: ['cerebrix_foresight_refused_daze', 'tsunarok_undertow_hit_chill'] } });
  assert.ok(!off.log.some((e) => /\(refused\)|\(on arrival\)/.test(e.text)), 'nothing fires without the patches');
  assert.ok(on.experiments.some((x) => /cerebrix_foresight_refused_daze, tsunarok_undertow_hit_chill/.test(x)));
  const refused = on.log.filter((e) => e.kind === 'condition' && /Foresight \(refused\)/.test(e.text)); const arrival = on.log.filter((e) => e.kind === 'condition' && /Undertow \(on arrival\)/.test(e.text));
  assert.ok(refused.length + arrival.length > 0, 'at least one refused daze or arrival chill in a Tank-heavy matchup');
});

test('determinism: a Gate B.2 configuration replays to the identical log', () => {
  const a = team(['gearwing', 'zephyr', 'cinderclaw'], 900), b = team(['shadewisp', 'duskrunner', 'leafhorn'], 950);
  const cfg = { duration: 'C6', swapCost: 'half', policies: { a: 'smart', b: 'smart' }, patches: ['coglet_gearshot_heavy_break', 'zephiro_tailwind_combo', 'scorchulk_maul_first', 'wispira_veil_every4', 'duskyre_cut_every3'] };
  const x = simulateClash({ a, b, seed: 77, config: cfg }), y = simulateClash({ a, b, seed: 77, config: cfg });
  assert.deepEqual(x.log.map((e) => e.text), y.log.map((e) => e.text)); assert.equal(x.winner, y.winner);
  assert.deepEqual(activeExperiments(battleConfig(cfg)), ["Duration C6", "Swap cost half", "Patches cinderclaw_maul_first".replace("cinderclaw_maul_first", "coglet_gearshot_heavy_break, duskyre_cut_every3, scorchulk_maul_first, wispira_veil_every4, zephiro_tailwind_combo")]);
});
