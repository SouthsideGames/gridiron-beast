// Task 8 M4 S15 (engine side, no UI): the reviewer covers all 72 Clash abilities with no silent missing entries; every Dex form x mastery
// tier row lists at least one runnable acceptance scenario; scenario kinds are known; provisional scenarios are labelled; runs are
// deterministic and independent of logging.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../../src/clash/t8/index.js';
import { reviewMatrix, listScenarios, runScenario, determinismCheck, SCENARIO_KINDS } from '../../src/clash/t8/review.js';
import { registeredClashAbilities } from '../../src/clash/t8/registry.js';
import { ABILITY_KINDS } from '../../src/clash/t8/ability-kinds.js';

const IDS = ABILITY_KINDS.map((k) => k.id);

test('S15: all 72 Clash abilities are registered and present in the reviewer matrix', () => {
  assert.equal(IDS.length, 72); const reg = registeredClashAbilities();
  for (const id of IDS) assert.ok(reg.includes(id), `${id} registered`);
  const rows = reviewMatrix(); const seen = new Set(rows.map((r) => r.abilityId));
  for (const id of IDS) assert.ok(seen.has(id), `${id} in the matrix`);
});

test('S15: every (ability, form, tier) row lists at least one non-provisional scenario of a known kind', () => {
  for (const row of reviewMatrix()) {
    const scs = listScenarios(row.abilityId, row.stage, row.tier);
    for (const s of scs) assert.ok(SCENARIO_KINDS.includes(s.kind), `${row.abilityId}/${s.id} kind ${s.kind}`);
    assert.ok(scs.some((s) => !s.provisional), `${row.abilityId} ${row.form} tier ${row.tier} has an acceptance scenario`);
  }
});

test('S15: one scenario per ability runs on the real engine with a meta block; provisional scenarios carry the PROVISIONAL label', () => {
  for (const id of IDS) {
    const s = listScenarios(id, 0, 0).find((x) => !x.provisional) || listScenarios(id, 0, 1)[0];
    const r = runScenario({ abilityId: id, stage: 0, tier: listScenarios(id, 0, 0).includes(s) ? 0 : 1, scenarioId: s.id });
    assert.equal(r.meta.abilityId, id); assert.equal(r.meta.provisional, false); assert.ok(Array.isArray(r.stream));
  }
  for (const id of IDS) for (const s of listScenarios(id, 0, 3).filter((x) => x.provisional)) {
    const r = runScenario({ abilityId: id, stage: 0, tier: 3, scenarioId: s.id }); assert.match(r.meta.label, /PROVISIONAL/);
  }
});

test('S15: determinism: a sample of scenarios gives identical hashes twice and the same state with logging off', () => {
  for (const id of ['FIR-06-C', 'DAR-05-C', 'WAT-06-C', 'EAR-05-C', 'NAT-05-C', 'LIG-06-C']) {
    const s = listScenarios(id, 0, 1).find((x) => !x.provisional); const d = determinismCheck({ abilityId: id, stage: 0, tier: 1, scenarioId: s.id });
    assert.ok(d.same, `${id} same twice`); assert.ok(d.logIndependent, `${id} log-independent`);
  }
});
