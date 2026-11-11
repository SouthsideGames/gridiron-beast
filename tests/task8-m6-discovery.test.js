// Task 8 M6 (spec §5 "Discovery and presentation"): the player's persistent discovery records and the Apex first-discovery stamp.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newFranchise } from '../tools/franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';
import { exportJson, importJson } from '../src/franchise/save.js';
import { generateMonster, syncFromDev } from '../src/data/monsters.js';
import { generateIndividual } from '../src/franchise/t8/progression.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { createRng } from '../src/core/rng.js';
import { discover, syncDiscovery, apexKnown, apexRecord, potentialKnown, pendingApexPanels, markApexPanelShown, APEX_FACTS, DISCOVERY_VIA } from '../src/franchise/t8/discovery.js';

const ORD = SPECIES_DEX.find((s) => s.rarity !== 'basic' && s.rarity !== 'legendary' && s.position === 'RB');
function monster(seed, { apex = false, id = `t_${seed}` } = {}) {
  const rng = createRng(seed); const m = generateMonster(rng, { species: ORD.id, quality: 58, age: 20, yearsPro: 0, id, apexRoll: false });
  if (apex) { m.dev = generateIndividual(rng, m.dev.form, { apex: true }); syncFromDev(m); }
  return m;
}
/** A franchise whose founding roster has no Apex, so every Apex in a test is one the test placed. */
function franchise() { for (let seed = 11; seed < 60; seed++) { const f = newFranchise(seed, { difficulty: 'pro' }); if (!f.roster.some((m) => m.dev?.apex)) return f; } throw new Error('no Apex-free founding roster found'); }
const without = (f) => { const { discovery, ...rest } = f; return JSON.stringify(rest); };

test('an undiscovered Apex is not known; an ordinary monster is never an Apex to the player', () => {
  const f = franchise(); const a = monster(1, { apex: true }); const o = monster(2);
  assert.equal(a.dev.apex, true); assert.equal(apexKnown(f, a), false); assert.equal(potentialKnown(f, a), false); assert.equal(apexRecord(f, a), null);
  assert.equal(discover(f, o, 'scouting'), false, 'a full report on an ordinary monster discovers no Apex');
  assert.equal(apexKnown(f, o), false); assert.equal(potentialKnown(f, o), true); assert.deepEqual(pendingApexPanels(f), []);
});

test('a potential-revealing report discovers an Apex once, with when and how; the panel is pending exactly once', () => {
  const f = franchise(); const a = monster(3, { apex: true });
  assert.equal(discover(f, a, 'draft-report'), true);
  assert.equal(apexKnown(f, a), true); const r = apexRecord(f, a);
  assert.deepEqual([r.via, r.year, r.week, r.name, r.shown], ['draft-report', f.season.year, f.season.week, a.name, false]);
  assert.deepEqual(pendingApexPanels(f).map((p) => p.id), [a.id]);
  assert.equal(discover(f, a, 'scouting'), false, 'a second report is not a new discovery'); assert.equal(apexRecord(f, a).via, 'draft-report');
  assert.equal(markApexPanelShown(f, a.id), true); assert.deepEqual(pendingApexPanels(f), []); assert.equal(markApexPanelShown(f, a.id), false);
  assert.throws(() => discover(f, monster(4, { apex: true }), 'rumour'), RangeError);
  assert.equal(APEX_FACTS.length, 4); assert.ok(DISCOVERY_VIA.includes('roster'));
});

test('sync: acquisition reveals at once; a draft report reveals at level 6 only; a regional report only when it shows potential', () => {
  const f = franchise(); assert.deepEqual(syncDiscovery(f), [], 'no Apex on this founding roster');
  for (const m of f.roster) assert.equal(potentialKnown(f, m), true);
  const d1 = monster(5, { apex: true, id: 'draft_a' }), d2 = monster(6, { apex: true, id: 'draft_b' });
  f.draft = { class: [d1, d2], revealed: { draft_a: 5, draft_b: 6 } };
  assert.deepEqual(syncDiscovery(f), ['draft_b']); assert.equal(apexKnown(f, d1), false); assert.equal(apexKnown(f, d2), true);
  const p1 = monster(7, { apex: true, id: 'pro_a' }), p2 = monster(8, { apex: true, id: 'pro_b' });
  f.week.prospects = [{ monster: p1, revealed: 4, potentialKnown: false }, { monster: p2, revealed: 4, potentialKnown: true }];
  assert.deepEqual(syncDiscovery(f), ['pro_b']); assert.equal(apexKnown(f, p1), false);
  const own = monster(9, { apex: true, id: 'own_a' }); f.roster.push(own);
  assert.deepEqual(syncDiscovery(f), ['own_a']); assert.equal(apexRecord(f, own).via, 'roster');
  assert.deepEqual(syncDiscovery(f), [], 'idempotent');
});

test('the record outlives its source, a reload and a reacquisition; the panel never becomes pending again', () => {
  const f = franchise(); const a = monster(10, { apex: true, id: 'keep_a' });
  f.draft = { class: [a], revealed: { keep_a: 6 } }; syncDiscovery(f); markApexPanelShown(f, a.id);
  f.draft = null; assert.equal(apexKnown(f, a), true, 'known after the draft class is gone');
  f.roster.push(a); assert.deepEqual(syncDiscovery(f), [], 'acquiring a known Apex is not a new discovery');
  f.roster.splice(f.roster.indexOf(a), 1); f.roster.push(a); assert.deepEqual(syncDiscovery(f), [], 'reacquisition');
  const g = importJson(exportJson(f)); const b = g.roster.find((m) => m.id === a.id);
  assert.equal(apexKnown(g, b), true); assert.deepEqual(syncDiscovery(g), []); assert.deepEqual(pendingApexPanels(g), [], 'a reload does not replay the first discovery');
  assert.equal(g.schemaVersion, f.schemaVersion);
});

test('an interrupted panel: stamped before it opens, so a reload mid-panel does not replay it; identity is unchanged', () => {
  const f = franchise(); const a = monster(12, { apex: true, id: 'int_a' }); f.roster.push(a); syncDiscovery(f);
  const dev = JSON.stringify(a.dev); markApexPanelShown(f, a.id); // the panel opens here; the app saves; the player closes the app mid-panel
  const g = importJson(exportJson(f)); syncDiscovery(g);
  assert.deepEqual(pendingApexPanels(g), []); assert.equal(JSON.stringify(g.roster.find((m) => m.id === a.id).dev), dev);
});

test('discovery is bookkeeping only: nothing else in the franchise changes, and another club\'s knowledge is separate', () => {
  const f = franchise(); const a = monster(13, { apex: true, id: 'ai_a' });
  const opened = F.openDraft ? F.openDraft(f) : null; void opened;
  f.draft = f.draft || { class: [], revealed: {} }; f.draft.class = [...(f.draft.class || []), a]; f.draft.revealed = { ...(f.draft.revealed || {}) };
  (f.draft.aiScouting ||= {})['Some Other Club'] = { skill: 90, revealed: { ai_a: 6 }, weeks: 3 }; // another club has the full report
  const before = without(f); assert.deepEqual(syncDiscovery(f).filter((id) => id === 'ai_a'), []);
  assert.equal(apexKnown(f, a), false, 'another club\'s discovery does not reveal it to the player');
  f.draft.revealed.ai_a = 6; const mid = without(f); syncDiscovery(f);
  assert.equal(apexKnown(f, a), true); assert.equal(without(f), mid, 'only f.discovery changed'); assert.notEqual(before, undefined);
});
