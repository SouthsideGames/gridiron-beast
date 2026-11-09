// Task 8 M4 S15 (UI bridge): the Clash Ability Reviewer's engine-side bridge (src/clash/t8/review-phases.js). Every ability x form x
// mastery variant, every scenario (blocked, failure, interaction and provisional ones included): the FIRST run demonstrates the
// complete interaction with all four phases evidenced by engine events (§25); the phases are ordered; the explanation names the
// source and the targets; a failing run is reported as a failure with its unmet condition or error, never silently; the bridge is
// deterministic; the reviewer never writes progression or saves; the arena record keeps one event per engine event.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../../src/clash/t8/index.js';
import { reviewMatrix, listScenarios } from '../../src/clash/t8/review.js';
import { reviewClashScenario, clashVariants, evaluateClashPhases, PHASE_LABELS, BLOCKED_LABELS } from '../../src/clash/t8/review-phases.js';
import { toArenaRecord, nextTurnIndex, nextExchangeStart } from '../../src/ui/clash/t8-record.js';
import { stateAt, cuesFor } from '../../src/ui/clash/choreographer.js';

test('S15 UI: every variant (72 abilities x forms x 4 tiers x every scenario) demonstrates all four phases on the FIRST run, with ordered engine evidence and passing checks', () => {
  const rows = reviewMatrix(); let runs = 0, provisional = 0; const byKind = {};
  for (const row of rows) for (const s of listScenarios(row.abilityId, row.stage, row.tier)) {
    const r = reviewClashScenario({ abilityId: row.abilityId, stage: row.stage, tier: row.tier, scenarioId: s.id }); runs++; if (s.provisional) provisional++; byKind[s.kind] = (byKind[s.kind] || 0) + 1;
    const tag = `${row.abilityId}/${s.id} ${row.form} t${row.tier}`;
    assert.equal(r.error, null, `${tag}: no implementation error`); assert.ok(r.ok, `${tag}: ${r.failure?.condition} ${r.failure?.detail || ''}`);
    assert.equal(r.phases.length, 4); assert.deepEqual(r.phases.map((p) => p.id), ['trigger', 'activation', 'resolution', 'cleanup']);
    for (const p of r.phases) { assert.ok(p.ok && Number.isInteger(p.seq) && p.evidence, `${tag}: ${p.label} evidenced`); assert.equal(r.run.result.log[p.seq].seq, p.seq, 'the evidence is an engine event'); }
    for (let i = 1; i < 4; i++) assert.ok(r.phases[i].seq >= r.phases[i - 1].seq, `${tag}: phases in order`);
    const labels = r.blocked ? BLOCKED_LABELS : PHASE_LABELS; assert.deepEqual(r.phases.map((p) => p.label), Object.values(labels));
    assert.ok(r.explain.source && r.explain.source.id, `${tag}: the source is named`); assert.ok(r.explain.targets, 'targets named'); assert.ok(typeof r.explain.expected === 'string');
    if (s.provisional) assert.match(r.explain.provisional || '', /PROVISIONAL/); else assert.equal(r.explain.provisional, null);
    assert.equal(r.run.result.provisional, !!s.provisional, 'provisional mode only for provisional scenarios');
  }
  assert.ok(runs >= 1375, `runs ${runs}`); assert.ok(provisional >= 80); assert.ok(byKind.blocked > 100 && byKind.valid > 300, JSON.stringify(byKind));
});

test('S15 UI: a failing scenario is reported, never silent: a wrong check gives a failure with the condition; a thrown setup gives an implementation error', () => {
  const r = reviewClashScenario({ abilityId: 'FIR-03-C', stage: 0, tier: 0, scenarioId: 'no-such-scenario' });
  assert.equal(r.ok, false); assert.equal(r.failure.condition, 'Implementation error'); assert.match(r.error.message, /no scenario/); assert.equal(r.phases.length, 4); assert.ok(r.phases.every((p) => !p.ok));
  // a run whose checks fail (simulated by evaluating a tampered run object)
  const good = reviewClashScenario({ abilityId: 'FIR-03-C', stage: 0, tier: 1, scenarioId: listScenarios('FIR-03-C', 0, 1)[0].id });
  const tampered = { ...good.run, checks: [...good.run.checks, { check: 'impossible', ok: false, detail: 'x' }] };
  const ph = evaluateClashPhases(tampered); assert.equal(ph.done, false); assert.match(ph.failure.condition, /impossible/);
});

test('S15 UI: determinism: the same scenario twice gives identical phases, evidence and state hash; the variant list is stable and groups main / blocked / failure / interaction', () => {
  for (const id of ['FIR-06-C', 'DAR-05-C', 'WAT-06-C', 'EAR-05-C', 'NAT-05-C', 'LIG-06-C', 'ELE-06-C', 'PSY-06-C']) {
    const vars = clashVariants(id, 0, 1); assert.ok(vars.length >= 2); assert.equal(vars[0].group, 'main'); assert.ok(vars.every((v) => ['main', 'blocked', 'failure', 'interaction'].includes(v.group)));
    for (const v of vars.slice(0, 3)) {
      const a = reviewClashScenario({ abilityId: id, stage: 0, tier: 1, scenarioId: v.id }), b = reviewClashScenario({ abilityId: id, stage: 0, tier: 1, scenarioId: v.id });
      assert.deepEqual(a.phases, b.phases); assert.equal(a.run.result.stateHash, b.run.result.stateHash); assert.deepEqual(a.explain, b.explain);
    }
  }
});

test('S15 UI: the arena record of a scenario keeps one event per engine event; step-by-turn and step-by-exchange indices advance; the reviewer writes nothing (no save, progression or storage calls in its source)', () => {
  const r = reviewClashScenario({ abilityId: 'ELE-06-C', stage: 0, tier: 2, scenarioId: listScenarios('ELE-06-C', 0, 2)[0].id });
  const rec = toArenaRecord(r.run.result); assert.equal(rec.log.length, r.run.result.log.length); assert.equal(cuesFor(rec).length, rec.log.length);
  let i = 0, turns = 0; while (i < rec.log.length - 1) { const j = nextTurnIndex(rec, i); assert.ok(j > i); i = j; turns++; } assert.ok(turns >= 2);
  i = 0; let exs = 0; while (i < rec.log.length - 1) { const j = nextExchangeStart(rec, i); assert.ok(j > i); i = j; exs++; } assert.ok(exs >= 1 && exs <= r.run.result.exchanges + 1);
  for (const p of r.phases) { const st = stateAt(rec, p.seq); assert.ok(st.i === p.seq); }
  const src = fs.readFileSync(new URL('../../src/ui/screens/clash-ability-reviewer.js', import.meta.url), 'utf8');
  for (const bad of [/app\.save\(/, /applyBattleEffects/, /applyAward/, /dexRecord/, /localStorage/, /resolveEncounter|resolvePregameClash|resolveOvertimeClash/, /f\.roster/]) assert.ok(!bad.test(src), `reviewer never calls ${bad}`);
  const bridge = fs.readFileSync(new URL('../../src/clash/t8/review-phases.js', import.meta.url), 'utf8'); assert.ok(!/franchise|localStorage|Math\.random/.test(bridge));
});
