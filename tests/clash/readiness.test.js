// Beast Clash implementation readiness (final review, 2026-10-21): the recommended final configuration, the review record,
// validation of the move table as it would stand if approved, the proposed Noctlet exception (not active), the integrity of the
// final configuration, and the Level 1 check. Nothing here changes a default: the game still validates and plays its own table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClash } from '../../src/clash/engine.js';
import { CLASH_VALUES, battleConfig } from '../../src/clash/values.js';
import { CLASH_MOVES } from '../../src/data/clash-moves.js';
import { validateMoves } from '../../src/clash/validate.js';
import { FINAL_PATCHES, REVIEW, REVIEWED_ENTRIES, ALTERNATES, TEXT_CORRECTIONS, PROPOSED_ALWAYS_FIRST_EXCEPTIONS, gateConfig, finalMoveTable, B5_PATCHES } from '../../src/clash/balance-manifest.js';
import { level1Check, integrityProblems } from '../../src/clash/level1.js';
import { REFERENCE_TEAMS, REFERENCE_PARTNERS } from '../../src/clash/reference-teams.js';
import { mon, byArch } from './helpers.js';
import { createRng } from '../../src/core/rng.js';

const V = CLASH_VALUES; const P = V.movePatches;
const tanks = byArch('Tank'), supports = byArch('Support'), strikers = byArch('Striker');

test('final configuration: every reviewed item has a verdict, and the final set is exactly the recommended and kept patches, one per species', () => {
  for (const e of REVIEWED_ENTRIES) { const r = REVIEW[e.id]; assert.ok(r, e.id); assert.ok(['recommend', 'keep', 'drop', 'not'].includes(r.verdict)); assert.ok(r.basis && r.reason, e.id); if (e.kind !== 'config') assert.ok(r.cardText, `${e.id} has a proposed card`); }
  const kept = REVIEWED_ENTRIES.filter((e) => e.kind !== 'config' && ['recommend', 'keep'].includes(REVIEW[e.id].verdict)).map((e) => e.id);
  assert.deepEqual([...FINAL_PATCHES].sort(), [...kept].sort());
  const sp = FINAL_PATCHES.map((id) => P[id].species); assert.equal(new Set(sp).size, sp.length, 'no species carries two patches');
  for (const a of ALTERNATES) assert.ok(!B5_PATCHES.includes(a.id) && P[a.id], a.id);
  const c = gateConfig('Final'); assert.equal(c.duration, 'C6'); assert.equal(c.swapCost, 'half'); assert.deepEqual([...c.patches], [...FINAL_PATCHES].sort());
  assert.deepEqual(battleConfig({}).patches, [], 'nothing is active by default');
});

test('validation: the move table as it would stand if approved passes every rule; each reviewed patch passes with its proposed card; the game table is unchanged', () => {
  assert.deepEqual(validateMoves(), [], 'the current game table');
  assert.deepEqual(validateMoves(finalMoveTable()), [], 'the final table with proposed cards and text corrections');
  for (const id of Object.keys(REVIEW)) {
    if (!P[id]) continue; const sp = P[id].species;
    const table = finalMoveTable([...FINAL_PATCHES.filter((x) => P[x].species !== sp), id]);
    const probs = validateMoves(table).filter((x) => x.startsWith(`${sp}:`));
    if (id === 'noctlet_always_first') assert.deepEqual(probs, ['nightowl: a move that always strikes first is not allowed']); else assert.deepEqual(probs, [], id);
  }
  for (const [sp, t] of Object.entries(TEXT_CORRECTIONS)) assert.notEqual(CLASH_MOVES[sp].text, t.text, `${sp} correction is proposed, not applied`);
});

test('Noctlet exception (proposed, not active): exempts only Night Swoop, ordering stays deterministic and valid, battles always end', () => {
  const withNoctlet = finalMoveTable([...FINAL_PATCHES, 'noctlet_always_first']);
  assert.deepEqual(validateMoves(withNoctlet, { alwaysFirstExceptions: PROPOSED_ALWAYS_FIRST_EXCEPTIONS }), []);
  const other = { ...withNoctlet, rockram: { ...withNoctlet.rockram, priority: true, trigger: { kind: 'always' } } };
  assert.ok(validateMoves(other, { alwaysFirstExceptions: PROPOSED_ALWAYS_FIRST_EXCEPTIONS }).includes('rockram: a move that always strikes first is not allowed'), 'the rule still applies to every other move');
  const cfg = gateConfig('Final', { patches: [...FINAL_PATCHES, 'noctlet_always_first'], policies: { a: 'smart', b: 'smart' } });
  const rng = createRng(61); let checked = 0, first = 0, overridden = 0;
  for (let k = 0; k < 40; k++) {
    const b = k % 3 === 0 ? [mon('nightowl', 900 + k), mon(tanks[k % tanks.length], 950 + k), mon('vyrnax', 990 + k)] : [mon(strikers[k % strikers.length], 900 + k), mon('windlynx', 950 + k), mon('vyrnax', 990 + k)];
    const a = [mon('nightowl', 800 + k), mon(supports[k % supports.length], 850 + k), mon(tanks[(k + 2) % tanks.length], 870 + k)];
    const seed = rng.int(1e6); const r = simulateClash({ a, b, seed, config: cfg }); const r2 = simulateClash({ a, b, seed, config: cfg });
    assert.deepEqual(r.log.map((e) => e.text), r2.log.map((e) => e.text), 'deterministic'); assert.ok(r.exchanges <= V.battle.exchangeCap);
    assert.deepEqual(integrityProblems(r), []);
    const acted = {};
    for (const e of r.log) {
      if (e.kind === 'damage' && e.actor && !/arrival|splash|thorns|erupts|refused|burns/.test(e.text)) { const key = `${e.ex}|${e.actor}`; acted[key] = (acted[key] || 0) + 1; }
      if (e.kind === 'initiative' && e.target && /^a/.test(e.actor + e.target)) {
        const noct = r.lines.a.find((x) => x.species === 'nightowl').id;
        if (e.actor === noct || e.target === noct) { checked++; if (e.actor === noct) first++; else if (/Updraft|roared down|Night Swoop/.test(e.text) || e.coin) overridden++; }
      }
    }
    for (const [key, n] of Object.entries(acted)) { const mult = r.lines.a.concat(r.lines.b).find((x) => x.id === key.split('|')[1]).combatant.move.hits || 1; assert.ok(n <= mult + 1, `one action per front per exchange (${key}: ${n})`); }
  }
  assert.ok(checked > 50 && first + overridden === checked, `Noctlet first ${first}, overridden by haste/Roar/mirror ${overridden}, of ${checked}`);
});

test('the final configuration keeps the shared forced-swap cadence, valid states, half-cost heals, the Umbrikit fix, sudden death and determinism', () => {
  const rng = createRng(73); let forced = 0, sd = 0; const cfg = gateConfig('Final', { policies: { a: 'smart', b: 'smart' } });
  for (let k = 0; k < 40; k++) {
    const a = [mon('tsunarok', 3100 + k), mon('skywarden', 3200 + k), mon('cerebrix', 3300 + k), mon('tidefin', 3400 + k), mon('nocturne', 3500 + k)];
    const b = [mon(tanks[k % tanks.length], 3600 + k), mon('shadowkit', 3700 + k), mon(supports[k % supports.length], 3800 + k), mon('echolot', 3900 + k), mon('duskrunner', 4000 + k)];
    const r = simulateClash({ a, b, seed: rng.int(1e6), config: cfg });
    assert.deepEqual(integrityProblems(r), []);
    const benchActs = {};
    for (const e of r.log) {
      if (e.kind === 'swap' && e.forced === true) forced++;
      if ((e.kind === 'swap' && /from the bench/.test(e.text)) || e.kind === 'bench_miss' || (e.kind === 'swap_refused' && /from the bench/.test(e.text)) || (e.kind === 'condition' && /from the bench/.test(e.text))) { const key = `${e.ex}|${e.actor[0]}`; (benchActs[key] ||= new Set()).add(e.actor); assert.ok(benchActs[key].size <= 1); }
      if (e.kind === 'swap' && e.forced === false && /policy:/.test(e.text)) for (const h of r.log.filter((x) => x.ex === e.ex && x.actor === e.in && x.kind === 'heal' && typeof x.mult === 'number')) assert.ok(h.mult <= 0.5 + 1e-9);
      if (e.kind === 'sudden_death') sd++;
    }
    const again = simulateClash({ a, b, seed: r.seed, config: cfg }); assert.equal(again.winner, r.winner); assert.equal(again.log.length, r.log.length);
  }
  assert.ok(forced > 100, `forced swaps ${forced}`); assert.ok(sd > 0);
  assert.ok(FINAL_PATCHES.includes('umbrikit_pounce_not_voluntary'), 'the exploit fix is in the final configuration (its behaviour is tested in gateb3/gateb5)');
});

test('Level 1 check: reference teams are fixed and valid, it passes a known species, and its integrity scan catches invalid states', () => {
  for (const size of [3, 5]) { for (const team of Object.values(REFERENCE_TEAMS[size])) { assert.equal(team.length, size); for (const id of team) assert.ok(CLASH_MOVES[id], id); } assert.equal(REFERENCE_PARTNERS[size].length, size - 1); }
  const r = level1Check({ species: 'ashkit', config: gateConfig('Final'), n: 4 });
  assert.ok(r.pass, r.problems.join('; ')); assert.ok(r.fires > 0); assert.equal(r.matchups.length, 12);
  const fake = { exchanges: 31, capped: true, lines: { a: [{ id: 'a0', maxHp: 50 }], b: [{ id: 'b0', maxHp: 50 }] }, log: [
    { ex: 1, kind: 'damage', actor: 'a0', target: 'b0', damage: -3, hpAfter: 53, text: 'x' }, { ex: 2, kind: 'ko', actor: 'a0', target: 'b0', text: 'ko' }, { ex: 3, kind: 'damage', actor: 'b0', target: 'a0', damage: 5, hpAfter: 40, text: 'y' },
    { ex: 4, kind: 'skip', actor: 'a0', text: 's' }, { ex: 5, kind: 'skip', actor: 'a0', text: 's' }] };
  const p = integrityProblems(fake).join(' | ');
  for (const want of ['cap', 'invalid damage', 'HP out of range', 'knocked-out monster acted', 'two actions in a row']) assert.ok(p.includes(want), `${want} in: ${p}`);
});
