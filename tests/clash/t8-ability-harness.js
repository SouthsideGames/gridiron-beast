// Task 8 M4: the shared contract-case harness for the Clash ability batches (S6-S11). For every ability it is given, for every
// Dex form and every mastery tier, it runs each of the module's staged scenarios on the real engine (src/clash/t8/review.js) and
// asserts every check; it then checks determinism (same inputs -> identical log hash, state hash and draw count; log on / off ->
// identical outcome) and that every number the module's `values()` uses appears in the contract text (no invented values). The
// scenarios are the module's own review scenarios, so the reviewer and the tests exercise one and the same staged table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runScenario, listScenarios, determinismCheck, SCENARIO_KINDS } from '../../src/clash/t8/review.js';
import { clashContractById } from '../../src/clash/t8/registry.js';
import { kindOf } from '../../src/clash/t8/ability-kinds.js';
import { abilityById, formsOf } from '../../src/data/beast-dex.js';
import { withoutRandomness } from './helpers.js';

/** The numbers in a module's values() for every form x tier, flattened. */
const numbersIn = (v) => { const out = []; const walk = (x) => { if (typeof x === 'number') out.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === 'object') Object.values(x).forEach(walk); }; walk(v); return out; };
const contractText = (id) => { const a = abilityById(id); return [a.mechanic, ...a.details.map((d) => d.rule)].join(' ').replace(/\s+/g, '').toLowerCase(); };
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** A value is contract-sourced when its digits (or, for 0-10, its word; or its x100 percentage) appear in the contract text. */
const inContract = (text, n) => text.includes(String(n)) || (Number.isInteger(n) && n >= 0 && n <= 10 && text.includes(WORDS[n])) || (Number.isInteger(Math.round(n * 100)) && Math.abs(n * 100 - Math.round(n * 100)) < 1e-9 && text.includes(String(Math.round(n * 100))));

/**
 * The ACCEPTANCE contract cases: only scenarios that use no provisional reading (owner ruling 2026-11-09 rule 1). An ability whose
 * functioning depends on an unruled point is accepted here by its normal-gameplay behaviour: the explicit `awaiting ruling` report.
 * provisionalSuite() runs the labelled provisional scenarios; it is called only from tests/clash/t8-provisional-*.test.js.
 */
export function contractSuite(abilityIds, opts = {}) { return suite(abilityIds, { ...opts, provisional: false }); }
export function provisionalSuite(abilityIds, opts = {}) { return suite(abilityIds, { minScenarios: 1, requiredKinds: [], ...opts, provisional: true }); }
function suite(abilityIds, { minScenarios = 3, requiredKinds = ['valid', 'blocked'], provisional = false } = {}) {
  const pick = (list) => list.filter((s) => !!s.provisional === provisional);
  for (const id of abilityIds) {
    const mod = clashContractById(id); const a = abilityById(id);
    test(`${id} ${a.name}: registered with a kinds row, scenarios of the required kinds, and contract-sourced values`, () => {
      assert.ok(mod, `${id} is registered`); assert.ok(kindOf(id), `${id} has an ability-kind row`); assert.equal(kindOf(id).family, a.familyId);
      const sc = pick(mod.review?.scenarios || []); assert.ok(sc.length >= minScenarios, `${id}: ${sc.length} scenarios (need ${minScenarios})`);
      for (const s of sc) assert.ok(SCENARIO_KINDS.includes(s.kind), `${id}/${s.id}: kind ${s.kind}`);
      for (const k of requiredKinds) assert.ok(sc.some((s) => s.kind === k), `${id}: a '${k}' scenario`);
      assert.equal(new Set(sc.map((s) => s.id)).size, sc.length, 'scenario ids are unique');
      const text = contractText(id);
      for (const f of formsOf(a.familyId)) for (let tier = 0; tier < 4; tier++) {
        const v = mod.values(f.id, tier);
        for (const n of numbersIn(v)) assert.ok(inContract(text, n), `${id} ${f.id} t${tier}: value ${n} is not in the contract text`);
      }
    });
    for (const f of formsOf(a.familyId)) for (let tier = 0; tier < 4; tier++) {
      const scenarios = pick(listScenarios(id, f.stage, tier));
      if (!scenarios.length) continue;
      test(`${provisional ? '[PROVISIONAL] ' : ''}${id} ${f.name} (${f.id}) tier ${tier}: ${scenarios.length} ${provisional ? 'provisional' : 'contract'} cases run on the real engine`, () => {
        withoutRandomness(() => {
          for (const s of scenarios) {
            const out = runScenario({ abilityId: id, stage: f.stage, tier, scenarioId: s.id });
            assert.equal(out.result.provisional, provisional, `${s.id}: provisional mode ${provisional ? 'on' : 'off'}`);
            if (!provisional) assert.ok(!out.result.log.some((e) => e.kind === 'provisional'), `${s.id}: no provisional reading in an acceptance case`);
            const bad = out.checks.filter((c) => !c.ok);
            assert.deepEqual(bad, [], `${id} ${f.id} t${tier} ${s.id} (${s.kind}): ${bad.map((c) => `${c.check}: ${JSON.stringify(c.detail)}`).join('; ')}`);
            assert.ok(out.checks.length > 0, `${s.id} has checks`);
            if (s.kind === 'valid') assert.ok(out.stream.some((e) => e.stage === 'activation' || e.kind === 'ability'), `${s.id}: a valid scenario shows an activation event`);
            if (s.kind === 'blocked') assert.ok(out.stream.some((e) => e.kind === 'unmet' || e.kind === 'status_blocked' || e.kind === 'cleanse_refused' || e.kind === 'launch_cancelled') || out.checks.some((c) => /unmet|preserved|blocked|refused|no /i.test(c.check)), `${s.id}: a blocked scenario reports its unmet condition`);
            if (out.controlled) assert.ok(!out.controlled.failed, `${s.id}: controlled seed selection found no qualifying seed (${out.controlled.why})`);
          }
        });
      });
    }
    if (provisional) continue;
    test(`${id}: determinism (same seed -> identical log hash and state; log off -> identical outcome and draws)`, () => {
      const sc = pick(listScenarios(id, 0, 0));
      for (const s of sc.slice(0, 2)) { const d = determinismCheck({ abilityId: id, stage: 0, tier: 0, scenarioId: s.id }); assert.ok(d.same, `${s.id}: same inputs give the same hashes`); assert.ok(d.logIndependent, `${s.id}: log on / off agree`); }
    });
  }
}
