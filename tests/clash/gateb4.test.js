// Beast Clash Gate B.4: species-identity candidates and their patch-only hooks (breakCharge, shieldPierce, refused effect with
// both/chance, stripOnSwap, firstAfterEntry kept off the bench). Defaults unchanged: the golden fixture in engine.test.js proves it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClash as baseSimulateClash } from '../../src/clash/engine.js';
import { CLASH_VALUES, battleConfig as baseBattleConfig, patchedMove } from '../../src/clash/values.js';
import { CLASH_MOVES_V1_0_0 as CLASH_MOVES } from '../../src/data/clash-moves-v1.0.0.js';
import { mon, byArch } from './helpers.js';
import { createRng } from '../../src/core/rng.js';

// Historical gate tests: these verify the Gate A-B.5 mechanisms exactly as they were measured, on the values 1.0.0 game (ruleset
// 'v1.0.0': the frozen move table, Model F, swaps cost the action). The permanent values 1.1.0 game is covered by implementation.test.js.
const HIST = Object.freeze({ ruleset: 'v1.0.0' });
const battleConfig = (o = {}) => baseBattleConfig({ ...HIST, ...o });
const simulateClash = (o) => baseSimulateClash({ ...o, config: Object.isFrozen(o.config) && o.config?.ruleset ? o.config : { ...HIST, ...(o.config || {}) } });

const V = CLASH_VALUES;
const B4_CANDIDATES = ['coglet_break_charge', 'cerebrix_refused_daze_hit015', 'craggo_ram_chill', 'noctlet_always_first', 'sablewing_shadow_hex', 'aurodrax_sovereign_surge', 'scalor_hide_15_8', 'spriglet_seed_brace'];
const B3 = ['zephiro_tailwind_combo', 'elderoot_grove_12', 'scorchulk_maul_first', 'tsunarok_undertow_hit_chill', 'aeralis_downdraft_daze', 'lumini_mend_10', 'zippit_charge_40', 'nocturne_eclipse_2', 'coglet_gearshot_heavy_break', 'cerebrix_foresight_refused_daze', 'wispira_veil_every4', 'duskyre_cut_every3', 'ripplet_undercurrent_08', 'umbrikit_pounce_not_voluntary'];
const combine = (base, add) => { let ids = [...base]; for (const v of add) { const sp = V.movePatches[v].species; ids = [...ids.filter((x) => V.movePatches[x].species !== sp), v]; } return ids; };
const B4 = combine(B3, B4_CANDIDATES);
const tanks = byArch('Tank');

test('Gate B.4 candidates exist, are off by default, change only their own species, and the combined manifest has one patch per species', () => {
  for (const id of B4_CANDIDATES) assert.ok(V.movePatches[id], id);
  assert.deepEqual(battleConfig({}).patches, []);
  const species = B4.map((id) => V.movePatches[id].species); assert.equal(new Set(species).size, species.length, 'no species carries two patches');
  assert.equal(B4.length, 20);
  const c = patchedMove('gearwing', CLASH_MOVES.gearwing, battleConfig({ patches: ['coglet_break_charge'] }));
  assert.equal(c.breakCharge, 0.5); assert.equal(c.mult, 1.3); assert.equal(c.steadyRoll, true);
  assert.equal(patchedMove('rockram', CLASH_MOVES.rockram, battleConfig({ patches: ['coglet_break_charge'] })), CLASH_MOVES.rockram);
  const n = patchedMove('nightowl', CLASH_MOVES.nightowl, battleConfig({ patches: ['noctlet_always_first'] }));
  assert.equal(n.priority, true); assert.equal(n.priorityExchanges, 30);
});

test('breakCharge: breaking a shield charges Coglet\'s next strike, only under the patch', () => {
  let charged = { on: 0, off: 0 };
  for (let k = 0; k < 30; k++) {
    const a = [mon('gearwing', 100 + k), mon(byArch('Striker')[k % 12], 200 + k), mon(tanks[k % 9], 300 + k)];
    const b = [mon(tanks[(k + 1) % 9], 400 + k), mon(tanks[(k + 4) % 9], 500 + k), mon('metalhorn', 600 + k)];
    for (const [key, patches] of [['on', ['coglet_break_charge']], ['off', ['coglet_gearshot_heavy_break']]]) {
      const r = simulateClash({ a, b, seed: 700 + k, config: { duration: 'C6', patches } });
      charged[key] += r.log.filter((e) => e.kind === 'buff' && /shield broken, next strike \+50%/.test(e.text)).length;
    }
  }
  assert.ok(charged.on > 10, `charges seen: ${charged.on}`); assert.equal(charged.off, 0);
});

test('shieldPierce: half of the hit skips the shield; without the key nothing changes', () => {
  // Same battle, Coglet with and without shieldPierce on top of the heavy strike: absorbed damage drops under the patch.
  let absorbedOn = 0, absorbedOff = 0;
  for (let k = 0; k < 30; k++) {
    const a = [mon('gearwing', 800 + k), mon(byArch('Striker')[k % 12], 900 + k), mon(tanks[k % 9], 1000 + k)];
    const b = [mon(tanks[(k + 2) % 9], 1100 + k), mon('snowmoth', 1200 + k), mon(tanks[(k + 5) % 9], 1300 + k)];
    for (const [patches, add] of [[['coglet_pierce_shield'], (x) => (absorbedOn += x)], [['coglet_gearshot_heavy_break'], (x) => (absorbedOff += x)]]) {
      const r = simulateClash({ a, b, seed: 1400 + k, config: { duration: 'C6', patches } });
      for (const e of r.log) if (e.kind === 'damage' && e.actor === 'a0' && e.absorbed > 0) add(e.absorbed);
    }
  }
  assert.ok(absorbedOn < absorbedOff, `absorbed with pierce ${absorbedOn} v without ${absorbedOff}`);
});

test('refused-effect hooks: Daze + 0.15x hit with both, a chance gate, and stripOnSwap; each only under its patch', () => {
  const rng = createRng(17); const seen = { dazeHit: 0, hitOff: 0, strip: 0 };
  for (let k = 0; k < 40; k++) {
    const a = [mon('cerebrix', 1500 + k), mon(tanks[k % 9], 1600 + k), mon(byArch('Striker')[k % 12], 1700 + k)];
    const b = [mon(tanks[(k + 3) % 9], 1800 + k), mon(byArch('Support')[k % 12], 1900 + k), mon(tanks[(k + 6) % 9], 2000 + k)];
    const seed = rng.int(1e6);
    const on = simulateClash({ a, b, seed, config: { duration: 'C6', patches: ['cerebrix_refused_daze_hit015'] } });
    const off = simulateClash({ a, b, seed, config: { duration: 'C6', patches: ['cerebrix_foresight_refused_daze'] } });
    const strip = simulateClash({ a, b, seed, config: { duration: 'C6', patches: ['cerebrix_strip'] } });
    seen.dazeHit += on.log.filter((e) => e.kind === 'damage' && /Foresight \(refused\)/.test(e.text) && e.mult === 0.15).length;
    seen.hitOff += off.log.filter((e) => e.kind === 'damage' && /Foresight \(refused\)/.test(e.text)).length;
    seen.strip += strip.log.filter((e) => e.kind === 'debuff' && /loses its \d+ shield/.test(e.text)).length;
  }
  assert.ok(seen.dazeHit > 20, JSON.stringify(seen)); assert.equal(seen.hitOff, 0, 'the B.2 refused Daze carries no hit'); assert.ok(seen.strip > 0, JSON.stringify(seen));
});

test('a firstAfterEntry Disruptor never acts from the bench (Nocturne entry variant), and B.4 keeps the shared forced-swap cadence and the swap rules', () => {
  const rng = createRng(23); let forced = 0;
  for (let k = 0; k < 40; k++) {
    const a = [mon(tanks[k % 9], 2100 + k), mon('nocturne', 2200 + k), mon('cerebrix', 2300 + k), mon('tidefin', 2400 + k), mon('tsunarok', 2500 + k)];
    const b = [mon(byArch('Striker')[k % 12], 2600 + k), mon(tanks[(k + 2) % 9], 2700 + k), mon(byArch('Support')[k % 12], 2800 + k), mon(byArch('Balanced')[k % 12], 2900 + k), mon('skywarden', 3000 + k)];
    const r = simulateClash({ a, b, seed: rng.int(1e6), config: { duration: 'C6', swapCost: 'half', policies: { a: 'smart', b: 'smart' }, patches: combine(B4, ['nocturne_eclipse_entry']) } });
    assert.ok(!r.log.some((e) => /Eclipse \(from the bench\)/.test(e.text)), 'Eclipse never fires from the bench');
    const last = { a: -99, b: -99 }; const benchActs = {};
    for (const e of r.log) {
      if (e.kind === 'swap' && e.forced === true && e.target) { const s = e.target[0]; assert.ok(e.ex - last[s] >= V.swaps.forcedEvery); last[s] = e.ex; forced += 1; }
      if ((e.kind === 'swap' && /from the bench/.test(e.text)) || e.kind === 'bench_miss' || (e.kind === 'swap_refused' && /from the bench/.test(e.text)) || (e.kind === 'condition' && /from the bench/.test(e.text))) { const key = `${e.ex}|${e.actor[0]}`; (benchActs[key] ||= new Set()).add(e.actor); assert.ok(benchActs[key].size <= 1, `two bench actors on side ${e.actor[0]} at ${e.ex}`); }
      if (e.kind === 'swap' && e.forced === false && /policy:/.test(e.text)) for (const h of r.log.filter((x) => x.ex === e.ex && x.actor === e.in && x.kind === 'heal' && typeof x.mult === 'number')) assert.ok(h.mult <= 0.5 + 1e-9, 'half-cost heal on the swap exchange');
    }
  }
  assert.ok(forced > 50, `forced swaps: ${forced}`);
});

test('determinism: the combined B.4 configuration replays identically', () => {
  const a = [mon('gearwing', 3100), mon('nightowl', 3101), mon('thornkit', 3102)], b = [mon('shadewisp', 3200), mon('leafhorn', 3201), mon('windlynx', 3202)];
  const cfg = { duration: 'C6', swapCost: 'half', policies: { a: 'smart', b: 'none' }, patches: B4 };
  const x = simulateClash({ a, b, seed: 99, config: cfg }), y = simulateClash({ a, b, seed: 99, config: cfg });
  assert.deepEqual(x.log.map((e) => e.text), y.log.map((e) => e.text)); assert.equal(x.winner, y.winner);
});
