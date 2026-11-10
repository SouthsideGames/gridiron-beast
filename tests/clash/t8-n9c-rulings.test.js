import test from 'node:test';
import assert from 'node:assert/strict';
import '../../src/clash/t8/index.js';
import { perkTag, PROVISIONAL_POINTS } from '../../src/clash/t8/flags.js';
import { perkGate } from '../../src/clash/abilities/util.js';
import { runScenario, listScenarios } from '../../src/clash/t8/review.js';
import { formsOf, abilityById } from '../../src/data/beast-dex.js';

test('N9c approved attack classifications retain their identity even when shield-break or pierce is not decisive', () => {
  const ordinary = ['LIG-05-C', 'DAR-02-C', 'DAR-03-C', 'PSY-05-C'];
  const special = ['MET-04-C', 'LIG-06-C', 'ELE-04-C'];
  for (const [ids, tag] of [[ordinary, 'ordinary'], [special, 'special']]) for (const id of ids) {
    assert.equal(perkTag(id), tag);
    assert.deepEqual(perkGate({ perkDecisive: () => false }, {}, 'enemy', perkTag(id)), { ok: true, tag, decisive: false });
  }
});

test('N9c resolves only the approved gates and leaves value conflicts, Stone Divide and not-yet-due cap impacts open', () => {
  for (const id of ['d5-perk', 'd14-dawn-song-target', 'feather-relay-voluntary', 'clear-light-cooldown-unit', 'delayed-slot']) assert.equal(PROVISIONAL_POINTS[id].approved, 'N9c', id);
  for (const id of ['d13-values', 'forge-swipe-duration', 'fortress-storage-cap', 'stone-divide-scope', 'd8-cap-delayed']) assert.equal(PROVISIONAL_POINTS[id].approved, undefined, id);
});

test('approved valid demonstrations run without provisional mode at every form and mastery', () => {
  const ids = ['MET-04-C', 'LIG-02-C', 'DAR-02-C', 'DAR-03-C', 'LIG-05-C', 'PSY-05-C', 'ELE-04-C', 'WIN-01-C', 'FIR-03-C', 'FIR-06-C'];
  for (const id of ids) for (const form of formsOf(abilityById(id).familyId)) for (let tier = 0; tier < 4; tier++) {
    const sc = listScenarios(id, form.stage, tier).find((s) => s.kind === 'valid' && !s.provisional);
    assert.ok(sc, `${id}/${form.id}/${tier} has a normal-gameplay demonstration`);
    const result = runScenario({ abilityId: id, stage: form.stage, tier, scenarioId: sc.id });
    assert.equal(result.result.provisional, false);
    assert.equal(result.ok, true, `${id}/${sc.id}: ${JSON.stringify(result.checks.filter((x) => !x.ok))}`);
    assert.ok(result.result.log.some((e) => e.kind === 'execution' && e.abilityId === id), `${id} actually executes`);
  }
});
