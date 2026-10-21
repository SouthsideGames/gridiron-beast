// Beast Clash values 1.1.0: the owner-approved permanent balance configuration (authorization 2026-10-21).
// Proves (1) the permanent game is exactly the approved configuration and nothing else, (2) the values 1.0.0 ruleset still replays
// every pre-implementation battle byte for byte, (3) the permanent defaults play exactly like the approved candidate did on the old
// build, (4) the declined Noctlet exception is not active anywhere, and (5) the two owner-added changes behave as written.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { simulateClash, logHash, replayKey, parseReplayKey } from '../../src/clash/engine.js';
import { CLASH_VALUES, battleConfig, activeExperiments, patchedMove } from '../../src/clash/values.js';
import { CLASH_MOVES } from '../../src/data/clash-moves.js';
import { CLASH_MOVES_V1_0_0 } from '../../src/data/clash-moves-v1.0.0.js';
import { validateMoves } from '../../src/clash/validate.js';
import { syntheticMonster } from '../../src/clash/batch.js';
import { moveTableFor } from '../../src/clash/stats.js';
import { APPROVED_PATCHES, FINAL_PATCHES, OWNER_ADDED, APPROVED_SETTINGS, DECLINED_PATCHES, TEXT_CORRECTIONS, REVIEW, MANIFEST, ALTERNATES, decisionOf, gateConfig, permanentConfig, finalMoveTable } from '../../src/clash/balance-manifest.js';
import { integrityProblems } from '../../src/clash/level1.js';
import { createRng } from '../../src/core/rng.js';
import { mon } from './helpers.js';

const V = CLASH_VALUES; const P = V.movePatches;
const SNAP = JSON.parse(fs.readFileSync(new URL('./fixtures/pre-1.1.0-snapshot.json', import.meta.url)));
const hashOf = (log) => { let h = 2166136261; const s = log.map((e) => `${e.ex}|${e.kind}|${e.actor}|${e.target}|${e.text}`).join('\n'); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const mk = (L) => L.map((x) => syntheticMonster(x.species, { seed: x.seed, overall: x.overall }));
const APPROVED_IDS = ['scorchulk_maul_first', 'wispira_veil_every4', 'duskyre_cut_every3', 'umbrikit_pounce_not_voluntary', 'echolot_echo_flat', 'zephiro_tailwind_combo', 'tsunarok_undertow_hit_chill', 'ripplet_undercurrent_08',
  'aurodrax_sovereign_surge', 'cindruff_tumble_always', 'cerebrix_foresight_refused_daze', 'nocturne_eclipse_2', 'aeralis_downdraft_daze', 'elderoot_grove_12', 'tempestra_cyclone_storm'];
// Hooks used only by unapproved experiments: the permanent table must carry none of them.
const EXPERIMENT_ONLY_KEYS = ['breakCharge', 'forgeOnHit', 'healCut', 'healCutFor', 'opening', 'sweepHit', 'sweepAbove', 'hasteOnSwap', 'stripOnCond', 'mostHurt', 'shieldPierce', 'stripOnSwap', 'vsShield', 'breakAlways', 'priorityExchanges'];

test('permanent configuration: values 1.1.0, C6, half-cost swaps, no patches or experiments by default', () => {
  assert.equal(V.version, '1.1.0'); assert.equal(V.duration.default, 'C6'); assert.equal(V.experiments.swapCost.default, 'half');
  const c = battleConfig({}); assert.equal(c.ruleset, 'current'); assert.equal(c.duration, 'C6'); assert.equal(c.swapCost, 'half'); assert.deepEqual([...c.patches], []);
  assert.deepEqual(activeExperiments(c), [], 'the permanent runtime reports no active experiment');
  assert.deepEqual(APPROVED_SETTINGS, { duration: 'C6', swapCost: 'half' });
  assert.deepEqual(permanentConfig(), c);
  assert.equal(c.backRow, 'E'); assert.equal(c.O1, false); assert.equal(c.O2, false); assert.equal(c.sdFromE, 12);
});

test('approved patch list is exactly the 15 the owner approved, and each is marked implemented; nothing else is', () => {
  assert.deepEqual([...APPROVED_PATCHES].sort(), [...APPROVED_IDS].sort());
  assert.deepEqual([...OWNER_ADDED], ['elderoot_grove_12', 'tempestra_cyclone_storm']); assert.equal(FINAL_PATCHES.length, 13);
  const implemented = Object.entries(P).filter(([, p]) => p.implemented).map(([id]) => id).sort();
  assert.deepEqual(implemented, [...APPROVED_IDS].sort());
  for (const id of APPROVED_IDS) assert.equal(P[id].implemented, '1.1.0');
  const sp = APPROVED_IDS.map((id) => P[id].species); assert.equal(new Set(sp).size, 15, 'one patch per species');
  for (const e of [...MANIFEST, ...ALTERNATES]) assert.equal(decisionOf(e.id), APPROVED_IDS.includes(e.id) || e.kind === 'config' ? 'implemented' : (e.id === 'noctlet_always_first' ? 'declined' : 'not approved'), e.id);
});

test('the permanent move table is the values 1.0.0 table plus exactly the 15 approved changes and the approved card text', () => {
  assert.deepEqual(CLASH_MOVES, finalMoveTable(APPROVED_PATCHES));
  const changed = Object.keys(CLASH_MOVES).filter((sp) => JSON.stringify(CLASH_MOVES[sp]) !== JSON.stringify(CLASH_MOVES_V1_0_0[sp])).sort();
  assert.deepEqual(changed, [...new Set([...APPROVED_IDS.map((id) => P[id].species), 'terrabull'])].sort(), '15 patched species plus the Terrabull card');
  for (const id of APPROVED_IDS) {
    const sp = P[id].species; const now = CLASH_MOVES[sp], was = CLASH_MOVES_V1_0_0[sp];
    for (const [k, v] of Object.entries(P[id].changes)) assert.deepEqual(now[k], v, `${id}.${k}`);
    for (const k of Object.keys(was)) if (!(k in P[id].changes) && k !== 'text') assert.deepEqual(now[k], was[k], `${id}: ${k} unchanged`);
    assert.equal(now.text, REVIEW[id].cardText, `${id} card`); assert.equal(now.name, was.name);
  }
  // owner-specified exact values
  assert.equal(CLASH_MOVES.elderoot.heal, 0.12); assert.equal(CLASH_MOVES.elderoot.target, 'all'); assert.deepEqual(CLASH_MOVES.elderoot.trigger, CLASH_MOVES_V1_0_0.elderoot.trigger);
  assert.deepEqual(Object.keys(CLASH_MOVES.elderoot).filter((k) => JSON.stringify(CLASH_MOVES.elderoot[k]) !== JSON.stringify(CLASH_MOVES_V1_0_0.elderoot[k])), ['text', 'heal'], 'Elderoot: heal only');
  assert.deepEqual(CLASH_MOVES.tempestra.trigger, { kind: 'every', n: 3 }); assert.equal(CLASH_MOVES.tempestra.cycloneArrival, true);
  assert.equal(CLASH_MOVES.cerebrix.refusedEffect.hit, undefined, 'Cerebrix: B.2 version, no 0.15x hit'); assert.deepEqual(CLASH_MOVES.cerebrix.refusedEffect, { cond: 'daze' });
  assert.equal(CLASH_MOVES.nocturne.duration, 2); assert.deepEqual(CLASH_MOVES.nocturne.trigger, CLASH_MOVES_V1_0_0.nocturne.trigger); assert.equal(CLASH_MOVES.nocturne.opening, undefined, 'Nocturne: B.2 version, no opening');
  assert.equal(CLASH_MOVES.skywarden.arrivalCond, 'daze'); assert.equal(CLASH_MOVES.skywarden.hit, false); assert.equal(CLASH_MOVES.skywarden.anywhere, undefined); assert.equal(CLASH_MOVES.skywarden.hasteOnSwap, undefined, 'Aeralis: B.3 version');
  assert.equal(CLASH_MOVES.tidefin.hitMult, 0.8); assert.equal(CLASH_MOVES.cinderclaw.neverFirst, false); assert.deepEqual(CLASH_MOVES.shadewisp.trigger, { kind: 'every', n: 4 });
  assert.deepEqual(CLASH_MOVES.duskrunner.trigger, { kind: 'every', n: 3 }); assert.equal(CLASH_MOVES.shadowkit.dodgeEntry, 'notVoluntary');
  assert.equal(CLASH_MOVES.echolot.echo, 0); assert.equal(CLASH_MOVES.echolot.echoFlat, 0.5); assert.equal(CLASH_MOVES.ashkit.afflict.belowHp, undefined);
  assert.deepEqual(CLASH_MOVES.zephyr.rally, { bonus: 0.15, exchanges: 3 }); assert.equal(CLASH_MOVES.zephyr.heal, 0.06);
  assert.equal(CLASH_MOVES.tsunarok.hit, true); assert.equal(CLASH_MOVES.tsunarok.arrivalCond, 'chill'); assert.equal(CLASH_MOVES.aurodrax.mult, 1.3);
  // Terrabull: card text only
  assert.equal(CLASH_MOVES.terrabull.text, TEXT_CORRECTIONS.terrabull.text); assert.equal(CLASH_MOVES.terrabull.text, 'From the back, every second exchange shakes the opposing front two, Chilling them');
  assert.deepEqual({ ...CLASH_MOVES.terrabull, text: null }, { ...CLASH_MOVES_V1_0_0.terrabull, text: null });
  for (const [sp, m] of Object.entries(CLASH_MOVES)) for (const k of EXPERIMENT_ONLY_KEYS) if (!(k in CLASH_MOVES_V1_0_0[sp])) assert.ok(!(k in m), `${sp} carries experiment-only key ${k}`);
  assert.equal(CLASH_MOVES.nightowl.priority === true && CLASH_MOVES.nightowl.trigger.kind === 'always', false, 'Noctlet is unchanged');
  assert.deepEqual(CLASH_MOVES.nightowl, CLASH_MOVES_V1_0_0.nightowl);
});

test('validation: the permanent table passes; the declined Noctlet change fails and has no exception path anywhere', () => {
  assert.deepEqual(validateMoves(), []); assert.deepEqual(validateMoves(CLASH_MOVES_V1_0_0), []);
  assert.equal(validateMoves.length, 0, 'validateMoves takes no exception option');
  const noct = { ...CLASH_MOVES, nightowl: patchedMove('nightowl', CLASH_MOVES.nightowl, battleConfig({ ruleset: 'v1.0.0', patches: ['noctlet_always_first'] })) };
  assert.deepEqual(validateMoves(noct, { alwaysFirstExceptions: ['nightowl'] }), ['nightowl: a move that always strikes first is not allowed'], 'an exception option is ignored');
  assert.deepEqual([...DECLINED_PATCHES], ['noctlet_always_first']); assert.equal(P.noctlet_always_first.declined, '1.1.0');
  assert.throws(() => battleConfig({ patches: ['noctlet_always_first'] }), /declined/);
  assert.throws(() => battleConfig({ ruleset: 'current', patches: ['noctlet_always_first'] }), /declined/);
  assert.doesNotThrow(() => gateConfig('B.4'), 'history still replays under values 1.0.0');
  for (const f of ['src/clash/validate.js', 'src/clash/balance-manifest.js', 'src/clash/engine.js', 'src/clash/values.js']) assert.ok(!/alwaysFirstExceptions|PROPOSED_ALWAYS_FIRST/.test(fs.readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8')), `${f} has no exception path`);
});

test('the values 1.0.0 ruleset replays all 200 pre-implementation battles byte for byte', () => {
  assert.equal(SNAP.values, '1.0.0'); assert.equal(SNAP.records.length, 200);
  for (const r of SNAP.records) {
    const config = r.name === 'defaults' ? battleConfig({ ruleset: 'v1.0.0', policies: r.config.policies }) : battleConfig({ ...r.config, ruleset: 'v1.0.0' });
    if (r.name !== 'defaults') assert.deepEqual(config, gateConfig(r.name, r.config.policies.a !== 'none' ? { policies: r.config.policies } : {}), `${r.name} #${r.i} gate config`);
    const out = simulateClash({ a: mk(r.a), b: mk(r.b), seed: r.seed, config });
    assert.equal(logHash(out), r.hash, `${r.name} #${r.i}`);
  }
});

test('the permanent defaults play exactly like the approved candidate did on the values 1.0.0 build', () => {
  const recs = SNAP.records.filter((r) => r.name === 'Approved'); assert.equal(recs.length, 40);
  for (const r of recs) {
    const out = simulateClash({ a: mk(r.a), b: mk(r.b), seed: r.seed, config: battleConfig({ policies: r.config.policies }) });
    assert.equal(hashOf(out.log.slice(1)), r.bodyHash, `Approved #${r.i}`); assert.equal(out.winner, r.winner); assert.equal(out.by, r.by); assert.equal(out.exchanges, r.exchanges);
    const again = simulateClash({ a: mk(r.a), b: mk(r.b), seed: r.seed, config: battleConfig({ policies: r.config.policies }) }); assert.equal(logHash(again), logHash(out), 'deterministic');
    // and the Approved gate (values 1.0.0 + 15 patches) on this build is the same battle too
    const hist = simulateClash({ a: mk(r.a), b: mk(r.b), seed: r.seed, config: gateConfig('Approved', r.config.policies.a !== 'none' ? { policies: r.config.policies } : {}) });
    assert.equal(hashOf(hist.log.slice(1)), r.bodyHash);
  }
  // the old defaults are now the values 1.0.0 ruleset, not the permanent game
  const old = SNAP.records.find((r) => r.name === 'defaults' && r.winner);
  assert.equal(moveTableFor(battleConfig({ ruleset: 'v1.0.0' })), CLASH_MOVES_V1_0_0); assert.equal(moveTableFor(battleConfig({})), CLASH_MOVES); assert.ok(old);
});

test('replay keys: 1.1.0 keys round-trip; 1.0.0 keys replay under the historical ruleset; unknown versions are refused', () => {
  const r0 = SNAP.records[5]; const a = mk(r0.a), b = mk(r0.b);
  const out = simulateClash({ a, b, seed: r0.seed, config: battleConfig({}) });
  const k = parseReplayKey(out.replayKey); assert.equal(k.config.ruleset, 'current');
  const old = JSON.parse(replayKey({ a, b, seed: r0.seed, config: r0.config })); old.values = '1.0.0'; delete old.config.ruleset;
  const k0 = parseReplayKey(JSON.stringify(old)); assert.equal(k0.config.ruleset, 'v1.0.0');
  assert.equal(logHash(simulateClash({ a, b, seed: r0.seed, config: battleConfig(k0.config) })), r0.hash, 'an old key reproduces its old battle');
  assert.throws(() => parseReplayKey(JSON.stringify({ ...old, values: '0.9.0' })), /Replay key/);
});

test('Elderoot (12%): heals every living ally at most 12% of max HP, never above max, every second exchange', () => {
  const rng = createRng(1201); let heals = 0;
  for (let k = 0; k < 30; k++) {
    const a = [mon('elderoot', 100 + k), mon(['rockram', 'emberfox', 'shadewisp', 'leafhorn'][k % 4], 200 + k), mon('windlynx', 300 + k)];
    const b = [mon(['firestorm', 'cinderclaw', 'mudcub', 'tidepaw'][k % 4], 400 + k), mon('duskrunner', 500 + k), mon('reefclaw', 600 + k)];
    const r = simulateClash({ a, b, seed: rng.int(1e6), config: battleConfig({}) }); assert.deepEqual(integrityProblems(r), []);
    const hp = Object.fromEntries([...r.lines.a, ...r.lines.b].map((x) => [x.id, x.maxHp]));
    for (const e of r.log) if (e.kind === 'heal' && /Ancient Grove/.test(e.text)) { heals++; assert.ok(e.amount <= Math.round(hp[e.target] * 0.12) + 1e-9, e.text); assert.ok(e.hpAfter <= hp[e.target]); }
  }
  assert.ok(heals > 50, `heals ${heals}`);
});

test('Tempestra (Storm Cyclone): every third strike; a sweep Dazes the monster pulled forward, a refusal Dazes the front', () => {
  const rng = createRng(1301); let cyclones = 0, sweeps = 0, refused = 0;
  for (let k = 0; k < 80; k++) {
    const a = [mon('tempestra', 700 + k), mon('rockram', 710 + k), mon('leafhorn', 720 + k)];
    const b = k % 3 ? [mon('reefclaw', 730 + k), mon('emberfox', 740 + k), mon('tidepaw', 750 + k)] : [mon('reefclaw', 730 + k)];
    const r = simulateClash({ a, b, seed: rng.int(1e6), config: battleConfig({ policies: { a: 'smart', b: 'smart' } }) }); assert.deepEqual(integrityProblems(r), []);
    const tid = r.lines.a[0].id; let strikes = 0;
    r.log.forEach((e, i) => {
      if (e.actor !== tid) return;
      if (e.kind === 'damage' && /^Tempestra's (strike|Cyclone)/.test(e.text)) { strikes++; if (/Cyclone/.test(e.text)) { cyclones++; assert.equal(strikes % 3, 0, 'every third strike'); } }
      const later = r.log.slice(i + 1).filter((x) => x.ex === e.ex && x.actor === tid && /^Cyclone/.test(x.text) && (x.kind === 'condition' || x.kind === 'resist' || /already/.test(x.text)));
      if (e.kind === 'swap' && /^Cyclone/.test(e.text)) { sweeps++; assert.ok(later.some((x) => x.target === e.in), `the monster pulled forward is Dazed: ${e.text}`); }
      if (e.kind === 'swap_refused' && /^Cyclone/.test(e.text)) { refused++; const front = r.log.slice(0, i).reverse().find((x) => x.ex === e.ex && x.kind === 'damage' && x.actor === tid).target; assert.ok(later.some((x) => x.target === front), `a refused sweep Dazes the front: ${e.text}`); }
    });
  }
  assert.ok(cyclones > 20, `cyclones ${cyclones}`); assert.ok(sweeps > 10 && refused > 5, `sweeps ${sweeps} refused ${refused}`);
});
