// Beast Clash Gate B.3 switches: Coglet 1.4x exception, Undercurrent arrival-hit values, Downdraft Daze, and the Lab's
// ordinary/pool lineup specs. All patch-only; defaults unchanged (the golden fixture in engine.test.js proves it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClash as baseSimulateClash } from '../../src/clash/engine.js';
import { CLASH_VALUES, battleConfig as baseBattleConfig, patchedMove } from '../../src/clash/values.js';
import { runFamily } from '../../src/clash/batch.js';
import { SPECIES_DEX } from '../../src/data/species.js';
import { CLASH_MOVES_V1_0_0 as CLASH_MOVES } from '../../src/data/clash-moves-v1.0.0.js';
import { mon, byArch } from './helpers.js';
import { createRng } from '../../src/core/rng.js';

// Historical gate tests: these verify the Gate A-B.5 mechanisms exactly as they were measured, on the values 1.0.0 game (ruleset
// 'v1.0.0': the frozen move table, Model F, swaps cost the action). The permanent values 1.1.0 game is covered by implementation.test.js.
const HIST = Object.freeze({ ruleset: 'v1.0.0' });
const battleConfig = (o = {}) => baseBattleConfig({ ...HIST, ...o });
const simulateClash = (o) => baseSimulateClash({ ...o, config: Object.isFrozen(o.config) && o.config?.ruleset ? o.config : { ...HIST, ...(o.config || {}) } });

const V = CLASH_VALUES;
const B3 = ['coglet_gearshot_heavy14_break', 'ripplet_undercurrent_065', 'ripplet_undercurrent_08', 'aeralis_downdraft_daze'];

test('Gate B.3 patches exist, are off by default and change only their own species', () => {
  for (const id of B3) assert.ok(V.movePatches[id], id);
  assert.deepEqual(battleConfig({}).patches, []);
  const c = patchedMove('gearwing', CLASH_MOVES.gearwing, battleConfig({ patches: ['coglet_gearshot_heavy14_break'] }));
  assert.equal(c.mult, 1.4); assert.equal(c.kind, 'heavy'); assert.equal(c.breakAlways, 2); assert.equal(c.steadyRoll, true, 'the reliable damage floor is kept');
  const r = patchedMove('tidefin', CLASH_MOVES.tidefin, battleConfig({ patches: ['ripplet_undercurrent_08'] }));
  assert.equal(r.hitMult, 0.8); assert.equal(r.swapKind, 'frontTwo');
  const d = patchedMove('skywarden', CLASH_MOVES.skywarden, battleConfig({ patches: ['aeralis_downdraft_daze'] }));
  assert.equal(d.hit, false); assert.equal(d.arrivalCond, 'daze');
  assert.equal(patchedMove('tidefin', CLASH_MOVES.tidefin, battleConfig({ patches: ['coglet_gearshot_heavy14_break'] })), CLASH_MOVES.tidefin);
});

test('Undercurrent arrival hit uses the patched multiplier; unpatched it stays at the back-row rule (0.5x)', () => {
  const seen = { base: new Set(), patched: new Set() };
  for (let k = 0; k < 40; k++) {
    const a = [mon(byArch('Tank')[k % 9], 10 + k), mon('tidefin', 20 + k), mon(byArch('Striker')[k % 12], 30 + k)];
    const b = [mon(byArch('Striker')[(k + 3) % 12], 40 + k), mon(byArch('Balanced')[k % 12], 50 + k), mon(byArch('Tank')[(k + 2) % 9], 60 + k)];
    for (const [key, patches] of [['base', []], ['patched', ['ripplet_undercurrent_08']]]) {
      const r = simulateClash({ a, b, seed: 100 + k, config: { duration: 'C6', patches } });
      for (const e of r.log) if (e.kind === 'damage' && /Undercurrent \(from the bench\) arrival hit/.test(e.text)) seen[key].add(e.mult);
    }
  }
  assert.deepEqual([...seen.base], [0.5]); assert.deepEqual([...seen.patched], [0.8]);
});

test('shared forced-swap cadence holds with all four swap users and the B.3 patches: one forced swap per side every 3 exchanges, one bench attempt per side per exchange', () => {
  const B2 = ['tsunarok_undertow_hit_chill', 'aeralis_downdraft_hit', 'cerebrix_foresight_refused_daze'];
  const rng = createRng(7); let forced = 0;
  for (const patches of [[...B2, 'ripplet_undercurrent_08'], [...B2.filter((x) => x !== 'aeralis_downdraft_hit'), 'aeralis_downdraft_daze', 'ripplet_undercurrent_065']]) {
    for (let k = 0; k < 40; k++) {
      const a = [mon('tsunarok', 200 + k), mon('tidefin', 300 + k), mon('cerebrix', 400 + k), mon('skywarden', 500 + k), mon(byArch('Tank')[k % 9], 600 + k)];
      const b = [mon(byArch('Striker')[k % 12], 700 + k), mon(byArch('Tank')[(k + 4) % 9], 800 + k), mon(byArch('Support')[k % 12], 900 + k), mon(byArch('Balanced')[k % 12], 1000 + k), mon(byArch('Striker')[(k + 5) % 12], 1100 + k)];
      const r = simulateClash({ a, b, seed: rng.int(1e6), config: { duration: 'C6', swapCost: 'half', policies: { a: 'smart', b: 'smart' }, patches } });
      const last = { a: -99, b: -99 }; const benchActs = {};
      for (const e of r.log) {
        if (e.kind === 'swap' && e.forced === true && e.target) { const side = e.target[0]; assert.ok(e.ex - last[side] >= V.swaps.forcedEvery, `side ${side} forced at ${last[side]} and again at ${e.ex}`); last[side] = e.ex; forced += 1; }
        if ((e.kind === 'swap' && /from the bench/.test(e.text)) || e.kind === 'bench_miss' || (e.kind === 'swap_refused' && /from the bench/.test(e.text))) { const key = `${e.ex}|${e.actor[0]}`; benchActs[key] = (benchActs[key] || 0) + 1; assert.ok(benchActs[key] <= 1, `two bench attempts by side ${e.actor[0]} at exchange ${e.ex}`); }
      }
    }
  }
  assert.ok(forced > 100, `forced swaps seen: ${forced}`);
});

test('ordinary and pool lineup specs draw only the species they name', () => {
  const r = runFamily({ a: ['ordinary:Striker', 'ordinary:Tank', 'ordinary:Support'], b: 'pool:shadewisp|leafhorn|windlynx', size: 3, n: 60, config: battleConfig({ duration: 'C6' }) });
  const rar = Object.fromEntries(SPECIES_DEX.map((s) => [s.id, s.rarity]));
  for (const id of Object.keys(r.species)) assert.ok(['shadewisp', 'leafhorn', 'windlynx'].includes(id) || ['common', 'uncommon'].includes(rar[id]), `${id} (${rar[id]})`);
  assert.throws(() => runFamily({ a: 'ordinary:Nope', b: 'random', size: 3, n: 1 }));
  assert.throws(() => runFamily({ a: 'pool:shadewisp|nosuch', b: 'random', size: 3, n: 1 }));
});

test('Umbrikit dodgeEntry patches: notVoluntary is identical without voluntary swaps and stops the re-arm on a voluntary swap-in', () => {
  const a = [mon('shadowkit', 1300), mon(byArch('Tank')[1], 1301), mon(byArch('Striker')[2], 1302)];
  const b = [mon(byArch('Striker')[4], 1400), mon(byArch('Balanced')[3], 1401), mon(byArch('Tank')[5], 1402)];
  const base = simulateClash({ a, b, seed: 31, config: { duration: 'C6' } });
  const nv = simulateClash({ a, b, seed: 31, config: { duration: 'C6', patches: ['umbrikit_pounce_not_voluntary'] } });
  assert.deepEqual(nv.log.slice(1).map((e) => e.text), base.log.slice(1).map((e) => e.text), 'no voluntary swaps: the patch changes nothing but the start line naming it');
  let reArmed = 0, blocked = 0;
  for (let k = 0; k < 60; k++) {
    const A = [mon(byArch('Tank')[k % 9], 2000 + k), mon('shadowkit', 2100 + k), mon(byArch('Striker')[k % 12], 2200 + k)];
    const B = [mon(byArch('Striker')[(k + 5) % 12], 2300 + k), mon(byArch('Tank')[(k + 3) % 9], 2400 + k), mon(byArch('Support')[k % 12], 2500 + k)];
    for (const [patches, key] of [[[], 'base'], [['umbrikit_pounce_not_voluntary'], 'nv']]) {
      const r = simulateClash({ a: A, b: B, seed: 500 + k, config: { duration: 'C6', swapCost: 'half', policies: { a: 'smart', b: 'none' }, patches } });
      for (const e of r.log) if (e.kind === 'swap' && e.forced === false && /policy:/.test(e.text) && /Umbrikit/.test(e.text.split('for ')[1] || '')) {
        const dodged = r.log.some((x) => x.ex >= e.ex && x.ex <= e.ex + 2 && x.kind === 'miss' && /Umbrikit dodges/.test(x.text));
        if (key === 'base' && dodged) reArmed += 1; if (key === 'nv' && dodged) blocked += 1;
      }
    }
  }
  assert.ok(reArmed > 0, 'without the patch a voluntary swap-in re-arms the dodge'); assert.equal(blocked, 0, 'with notVoluntary it never does');
});
