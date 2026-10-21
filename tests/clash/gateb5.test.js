// Beast Clash Gate B.5: the balance manifest (the authoritative record of every proposed change), the eight-species
// candidates and their patch-only hooks, and the integrity of the full candidate configuration. Defaults unchanged:
// the golden fixture in engine.test.js proves it, and the first test here checks the default configuration.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClash } from '../../src/clash/engine.js';
import { CLASH_VALUES, battleConfig, patchedMove } from '../../src/clash/values.js';
import { CLASH_MOVES } from '../../src/data/clash-moves.js';
import { KINDS, TRIGGERS, EFFECTS } from '../../src/clash/handlers.js';
import { MANIFEST, GATE_PATCHES, B4_PATCHES, B5_PATCHES, B5_ADDED, gateConfig, describeEntry, manifestPatchIds } from '../../src/clash/balance-manifest.js';
import { mon, byArch } from './helpers.js';
import { createRng } from '../../src/core/rng.js';

const V = CLASH_VALUES; const P = V.movePatches;
const tanks = byArch('Tank'), strikers = byArch('Striker'), supports = byArch('Support'), balanced = byArch('Balanced'), disruptors = byArch('Disruptor');
const withOnly = (base, id) => [...base.filter((x) => P[x].species !== P[id].species), id];

test('every manifest move patch: the manifest equals the B.5 configuration, one patch per species, values read from the data; defaults carry none of it', () => {
  assert.deepEqual(battleConfig({}).patches, []); assert.equal(battleConfig({}).swapCost, 'action'); assert.equal(battleConfig({}).duration, 'F');
  assert.equal(B4_PATCHES.length, 20, 'B.4 = 20 patch switches (19 move changes + the Umbrikit rule correction)');
  assert.equal(B5_ADDED.length, 8); assert.equal(B5_PATCHES.length, 26, 'B.5 = B.4 + 8, with Nocturne and Aeralis replacing their earlier patches');
  assert.deepEqual([...manifestPatchIds()].sort(), [...B5_PATCHES].sort(), 'manifest move/rule entries are exactly the B.5 patches');
  const species = B5_PATCHES.map((id) => P[id].species); assert.equal(new Set(species).size, species.length);
  for (const g of Object.keys(GATE_PATCHES)) { const c = gateConfig(g); assert.equal(c.duration, 'C6'); assert.equal(c.swapCost, g === 'Gate B' ? 'action' : 'half'); assert.deepEqual([...c.patches], [...GATE_PATCHES[g]].sort()); }
  for (const e of MANIFEST) {
    assert.ok(['move', 'rule', 'config'].includes(e.kind)); assert.ok(e.gate && e.tests.length && e.status, e.id);
    if (e.kind === 'config') continue;
    const d = describeEntry(e); const base = CLASH_MOVES[P[e.id].species];
    for (const [k, v] of Object.entries(d.current)) assert.deepEqual(v, base[k] === undefined ? null : base[k], `${e.id}.${k} current`);
    assert.deepEqual(d.proposed, P[e.id].changes);
  }
  // Under B.5 every species' move is its card plus at most its one listed patch; species without a patch are untouched.
  const cfg = gateConfig('B.5');
  for (const [sp, card] of Object.entries(CLASH_MOVES)) { const id = B5_PATCHES.find((x) => P[x].species === sp); const m = patchedMove(sp, card, cfg); if (!id) assert.equal(m, card); else assert.deepEqual(m, { ...card, ...P[id].changes }); }
});

// A marker in the log that shows each recommended patch doing its job under the B.5 configuration.
const MARK = {
  zephiro_tailwind_combo: /Tailwind heals/, elderoot_grove_12: /Ancient Grove heals/, scorchulk_maul_first: /Cinder Maul/, tsunarok_undertow_hit_chill: /Undertow.*\(on arrival\).*chill/,
  lumini_mend_10: /Glow Mend heals/, zippit_charge_40: /next strike \+40%/, wispira_veil_every4: /Mirage Veil/, duskyre_cut_every3: /Vanishing Cut/, ripplet_undercurrent_08: /Undercurrent \(from the bench\) arrival hit \(0\.8x\)/,
  umbrikit_pounce_not_voluntary: /Umbrikit dodges/, coglet_break_charge: /shield broken, next strike \+50%/, cerebrix_refused_daze_hit015: /Foresight \(refused\)/, craggo_ram_chill: /Ram Butt: .* chill applied/,
  noctlet_always_first: /acts first \(Night Swoop\)/, sablewing_shadow_hex: /Wing Shadow: .* daze applied/, aurodrax_sovereign_surge: /Sovereign Arm \(1\.3x\)/, scalor_hide_15_8: /Dragonhide heals/, spriglet_seed_brace: /Seed Drop heals/,
  ferrcub_temper_big: /tempers under the blow/, terrabull_quake_sap_hex: /healing is cut to 50%/, nocturne_eclipse_opening3_80: /Eclipse \(opening\)/, tempestra_cyclone_storm: /Cyclone \(on arrival\): .* daze applied/,
  tideram_riptide_crash: /Riptide Charge arrival hit \(0\.5x\)/, aeralis_downdraft_anywhere_tailwind: /Downdraft: .* acts first this exchange/, echolot_echo_flat: /Echo Strike \(1\.3x\)/, cindruff_tumble_always: /Cinder Tumble: .* burn applied/,
};
test('every recommended move patch fires in battle under the B.5 configuration', () => {
  assert.deepEqual(Object.keys(MARK).sort(), [...B5_PATCHES].sort());
  const cfg = gateConfig('B.5', { policies: { a: 'smart', b: 'smart' } });
  for (const id of B5_PATCHES) {
    const sp = P[id].species; let seen = 0;
    for (let k = 0; k < 60 && !seen; k++) {
      const a = [mon(sp, 100 + k), mon(tanks[k % tanks.length], 200 + k), mon(strikers[k % strikers.length], 300 + k)]; if (k % 3 === 1) a.reverse();
      const b = [mon(tanks[(k + 3) % tanks.length], 400 + k), mon(supports[k % supports.length], 500 + k), mon(['metalhorn', 'snowmoth'][k % 2], 600 + k)];
      const r = simulateClash({ a, b, seed: 700 + k, config: cfg }); seen += r.log.filter((e) => MARK[id].test(e.text)).length;
    }
    assert.ok(seen > 0, `${id} never fired`);
  }
});

test('Gate B.5 hooks: each fires only under its patch (forge on hit, heal cut, opening, cyclone arrival, sweep hit, haste on swap, echo)', () => {
  const rng = createRng(31); const B4 = gateConfig('B.4');
  const seen = { temper: [0, 0], cut: [0, 0], cutLate: 0, opening: 0, openingTwice: 0, cyclone: [0, 0], cycloneRefusedFront: 0, crash: [0, 0], haste: [0, 0], hasteFirst: 0, hasteChecked: 0, echo: [0, 0] };
  for (let k = 0; k < 40; k++) {
    const seed = rng.int(1e6); const mk = (ids, s) => ids.map((id, i) => mon(id, s + i));
    const b = mk([tanks[k % tanks.length], supports[k % supports.length], strikers[(k + 2) % strikers.length]], 900 + k * 5);
    const pair = (sp, id, front = true) => { const a = mk(front ? [sp, balanced[k % balanced.length], supports[(k + 4) % supports.length]] : [balanced[k % balanced.length], supports[(k + 4) % supports.length], sp], 100 + k * 5); return [simulateClash({ a, b, seed, config: { ...B4, patches: withOnly(B4_PATCHES, id) } }), simulateClash({ a, b, seed, config: B4 })]; };
    let [on, off] = pair('ironcub', 'ferrcub_temper_big'); seen.temper[0] += on.log.filter((e) => /tempers under the blow/.test(e.text)).length; seen.temper[1] += off.log.filter((e) => /tempers/.test(e.text)).length;
    [on, off] = pair('terrabull', 'terrabull_quake_sap_hex', k % 2 === 0); const lastCut = {};
    for (const e of on.log) { if (e.kind === 'debuff' && /healing is cut/.test(e.text)) lastCut[e.target] = e.ex; if (e.kind === 'heal' && (e.reduced || []).includes('healing cut')) { seen.cut[0]++; if (!(e.target in lastCut) || e.ex > lastCut[e.target] + 2) seen.cutLate++; } }
    seen.cut[1] += off.log.filter((e) => e.kind === 'heal' && (e.reduced || []).includes('healing cut')).length;
    [on] = pair('nocturne', 'nocturne_eclipse_opening3_80', false); const op = on.log.filter((e) => /Eclipse \(opening\)/.test(e.text)); if (op.length) { seen.opening++; assert.ok(op.every((e) => e.ex === 1), 'opening fires at exchange 1'); } if (on.log.some((e) => e.kind === 'condition' && /^Eclipse: /.test(e.text))) seen.openingTwice++;
    [on, off] = pair('tempestra', 'tempestra_cyclone_storm'); seen.cyclone[0] += on.log.filter((e) => /Cyclone \(on arrival\)/.test(e.text)).length; seen.cyclone[1] += off.log.filter((e) => /Cyclone \(on arrival\)/.test(e.text)).length;
    for (let i = 0; i < on.log.length; i++) if (on.log[i].kind === 'swap_refused' && /^Cyclone/.test(on.log[i].text) && on.log.slice(i + 1, i + 3).some((e) => e.kind === 'condition' && /^Cyclone: /.test(e.text))) seen.cycloneRefusedFront++;
    [on, off] = pair('wavehorn', 'tideram_riptide_crash'); seen.crash[0] += on.log.filter((e) => /Riptide Charge arrival hit/.test(e.text) && e.mult === 0.5).length; seen.crash[1] += off.log.filter((e) => /Riptide Charge arrival hit/.test(e.text)).length;
    [on, off] = pair('skywarden', 'aeralis_downdraft_anywhere_tailwind', false);
    for (const e of on.log) if (e.kind === 'buff' && /acts first this exchange/.test(e.text)) { seen.haste[0]++; const ini = on.log.find((x) => x.ex === e.ex && x.kind === 'initiative'); if (ini) { seen.hasteChecked++; const otherHasted = on.log.some((x) => x.ex === e.ex && /Updraft/.test(x.text) && x.target === ini.actor) || on.log.some((x) => x.ex === e.ex - 1 && /Updraft/.test(x.text) && x.target === ini.actor); if (ini.actor === e.target || /roared down/.test(ini.text) || (otherHasted && ini.coin)) seen.hasteFirst++; } }
    seen.haste[1] += off.log.filter((e) => /acts first this exchange/.test(e.text)).length;
    [on, off] = pair('echolot', 'echolot_echo_flat'); const sum = (r) => r.log.filter((e) => e.kind === 'damage' && /Echo Strike/.test(e.text)).reduce((s, e) => s + e.damage, 0); seen.echo[0] += sum(on); seen.echo[1] += sum(off);
  }
  assert.ok(seen.temper[0] > 20 && seen.temper[1] === 0, JSON.stringify(seen.temper));
  assert.ok(seen.cut[0] > 10 && seen.cut[1] === 0 && seen.cutLate === 0, JSON.stringify({ cut: seen.cut, late: seen.cutLate }));
  assert.ok(seen.opening > 20 && seen.openingTwice === 0, `opening ${seen.opening}, strike-trigger repeats ${seen.openingTwice}`);
  assert.ok(seen.cyclone[0] > 10 && seen.cyclone[1] === 0, JSON.stringify(seen.cyclone));
  assert.ok(seen.crash[0] > 5 && seen.crash[1] === 0, JSON.stringify(seen.crash));
  assert.ok(seen.haste[0] > 5 && seen.haste[1] === 0 && seen.hasteFirst === seen.hasteChecked, JSON.stringify(seen));
  assert.ok(seen.echo[0] > seen.echo[1], `Echo Strike damage ${seen.echo[0]} with the flat echo v ${seen.echo[1]}`);
});

test('recommended patched moves stay inside the approved move rules, except the documented exception', () => {
  const FIXED = new Set(['name', 'archetype', 'text', 'kind', 'trigger']); const exceptions = [];
  for (const id of B5_PATCHES) {
    const sp = P[id].species; const m = patchedMove(sp, CLASH_MOVES[sp], gateConfig('B.5')); const B = V.bands[m.archetype];
    assert.ok(KINDS.includes(m.kind) && TRIGGERS.includes(m.trigger.kind), id);
    for (const k of Object.keys(m)) if (!FIXED.has(k)) assert.ok(EFFECTS[k], `${id}: unregistered key ${k}`);
    if (m.archetype === 'Balanced' && m.mult != null && !m.hits) assert.equal(m.mult, B.mult[0], id);
    if (m.archetype === 'Striker' && m.mult != null) assert.ok(m.mult >= B.mult[0] && m.mult <= B.mult[1], id);
    if (m.archetype === 'Support') assert.ok(m.kind === 'mend' && m.heal >= 0 && m.heal <= B.heal[1], id);
    if (m.archetype === 'Disruptor') { assert.ok(['hex', 'bench'].includes(m.kind), id); if (m.cond !== 'swap' && m.chance != null && m.chance < 1) { const band = m.cond === 'shock' ? B.shockChance : B.chance; assert.ok(m.chance >= band[0] && m.chance <= band[1], `${id}: chance ${m.chance}`); } }
    if (m.priority && m.trigger.kind === 'always') exceptions.push(id);
  }
  // Noctlet's B.4 candidate breaks the approved rule "a move that always strikes first is not allowed": an owner decision, listed in the manifest.
  assert.deepEqual(exceptions, ['noctlet_always_first']);
});

test('the B.5 candidate configuration keeps the shared forced-swap cadence, one bench actor per side, half-cost heals, the Umbrikit fix, sudden death and determinism', () => {
  const rng = createRng(47); let forced = 0, sd = 0, umbSwapIns = 0; const cfg = gateConfig('B.5', { policies: { a: 'smart', b: 'smart' } });
  for (let k = 0; k < 40; k++) {
    const a = [mon('tsunarok', 2100 + k), mon('skywarden', 2200 + k), mon('cerebrix', 2300 + k), mon('tidefin', 2400 + k), mon('tempestra', 2500 + k)];
    const b = [mon(tanks[k % tanks.length], 2600 + k), mon('wavehorn', 2700 + k), mon(supports[k % supports.length], 2800 + k), mon('shadowkit', 2900 + k), mon(tanks[(k + 4) % tanks.length], 3000 + k)];
    const r = simulateClash({ a, b, seed: rng.int(1e6), config: cfg });
    const last = { a: -99, b: -99 }; const benchActs = {}; const umb = {};
    for (const e of r.log) {
      if (e.kind === 'swap' && e.forced === true && e.target) { const s = e.target[0]; assert.ok(e.ex - last[s] >= V.swaps.forcedEvery, `side ${s} forced at ${last[s]} and ${e.ex}`); last[s] = e.ex; forced++; }
      if ((e.kind === 'swap' && /from the bench/.test(e.text)) || e.kind === 'bench_miss' || (e.kind === 'swap_refused' && /from the bench/.test(e.text)) || (e.kind === 'condition' && /from the bench/.test(e.text))) { const key = `${e.ex}|${e.actor[0]}`; (benchActs[key] ||= new Set()).add(e.actor); assert.ok(benchActs[key].size <= 1, `two bench actors on side ${e.actor[0]} at ${e.ex}`); }
      if (e.kind === 'swap' && e.forced === false && /policy:/.test(e.text)) {
        for (const h of r.log.filter((x) => x.ex === e.ex && x.actor === e.in && x.kind === 'heal' && typeof x.mult === 'number')) assert.ok(h.mult <= 0.5 + 1e-9, 'half-cost heal');
      }
      if (e.kind === 'sudden_death') sd++;
      if (e.kind === 'enter' && /^Umbrikit /.test(e.text)) { umb[e.actor] = umb[e.actor] || { pending: false }; if (!/swaps in/.test(e.text)) { umb[e.actor].pending = true; umb[e.actor].noArm = false; } else if (!umb[e.actor].pending) umb[e.actor].noArm = true; else umb[e.actor].noArm = false; umbSwapIns += /swaps in/.test(e.text) ? 1 : 0; }
      if (e.kind === 'miss' && /^Umbrikit dodges/.test(e.text)) { const u = umb[e.target]; if (u) { assert.ok(!u.noArm, 'Umbrikit dodged after a voluntary swap-in with no entry dodge pending'); u.pending = false; } }
    }
  }
  assert.ok(forced > 100, `forced swaps ${forced}`); assert.ok(sd > 0, 'sudden death reached'); assert.ok(umbSwapIns > 3, `Umbrikit voluntary swap-ins seen: ${umbSwapIns}`);
  const a = [mon('ironcub', 1), mon('nocturne', 2), mon('ashkit', 3)], b = [mon('terrabull', 4), mon('wavehorn', 5), mon('echolot', 6)];
  const x = simulateClash({ a, b, seed: 77, config: cfg }), y = simulateClash({ a, b, seed: 77, config: cfg });
  assert.deepEqual(x.log.map((e) => e.text), y.log.map((e) => e.text)); assert.equal(x.winner, y.winner);
});
