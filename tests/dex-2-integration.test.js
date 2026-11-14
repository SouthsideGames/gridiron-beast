// Beast Dex 2.0 integration checks (Claude's QA pass). The rules under test are the owner-facing ones from the Dex 2.0 brief:
// one knowledge credit per family per completed owner football game (members in the played lineup only, never multiplied),
// duplicate-proof through replay, save export/import and cloud merging; locked lore absent from every always-visible section;
// presentation and reviewer previews never write to a franchise, a monster or the shared Dex; samples carry no invented career;
// and every form has an anatomy-consistent portrait motion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { resetDex, dexData, dexKnowledge, dexKnowledgeGame, mergeDex } from '../src/franchise/dex-store.js';
import { playedIds } from '../src/franchise/development.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { formsOf } from '../src/data/beast-dex.js';
import { dexContent } from '../src/dex/content.js';
import { speciesSheet } from '../src/ui/screens/dex.js';
import { DEX_REVIEW_CATALOG, registerBeastDexReviewer } from '../src/ui/screens/beast-dex-reviewer.js';
import { dexMotion, dexFormSpec } from '../src/ui/dex-motion.js';

function toSunday(seed) {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed });
  F.hireDefaultStaff(f); let g = 0; while (F.creationDraftPending(f) && g++ < 400) F.passDraftPick(f);
  if (F.needsGoal(f)) F.chooseGoal(f, F.commissionerGoals(f)[0]?.id);
  for (let k = 0; k < 20; k++) {
    if (f.week.commissioner) { const id = f.week.commissioner.names?.[0]; if (id) F.commissionerRelease(f, id); continue; }
    F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; }
    return f;
  }
  return null;
}
const counts = (f) => Object.fromEntries(Object.entries(f.dex?.knowledge || {}).map(([id, e]) => [id, Object.keys(e).length]));

test('one knowledge credit per family per completed owner game: lineup members only, never multiplied, duplicate-proof', () => {
  resetDex();
  const f = toSunday(17); assert.ok(f, 'reached a Sunday');
  const m = F.sundayMatchup(f); const side = m.playerSide;
  const chart = m[side].chart; const played = playedIds(chart);
  const starters = f.roster.filter((x) => played.has(x.id));
  // Two lineup members of one family: give a second starter the first starter's family (setup only; nothing else reads it here).
  const [a, b] = starters.filter((x) => x.species !== starters[0].species || x === starters[0]);
  b.species = a.species;
  const benched = f.roster.filter((x) => !played.has(x.id) && !starters.some((s) => s.species === x.species));
  const before = counts(f); const globalBefore = Object.fromEntries(SPECIES_DEX.map((s) => [s.id, dexKnowledge(s.id).games]));
  F.finishSunday(f, F.simulatePlayerGame(f));
  const after = counts(f);
  const families = new Set(starters.map((x) => x.species));
  for (const id of families) {
    assert.equal((after[id] || 0) - (before[id] || 0), 1, `${id}: one credit for this game`);
    assert.equal(dexKnowledge(id).games - globalBefore[id], 1, `${id}: one credit in the shared Dex`);
  }
  assert.equal(after[a.species] - (before[a.species] || 0), 1, 'two lineup members of one family still earn one credit');
  for (const x of benched) assert.equal(after[x.species] || 0, before[x.species] || 0, `${x.species}: not in the played lineup, no credit`);
  const opp = m[side === 'home' ? 'away' : 'home'];
  for (const id of new Set(Object.values(opp.chart || {}).map((pid) => (opp.roster || []).find((x) => x.id === pid)?.species).filter(Boolean))) {
    if (!f.roster.some((x) => x.species === id)) assert.equal(after[id] || 0, 0, `${id}: an opponent's family earns nothing`);
  }
  // Replay of the same game, a save export/import, and a cloud merge of the same records add nothing.
  const event = Object.keys(f.dex.knowledge[a.species]).pop();
  assert.equal(dexKnowledgeGame([...families], event), false, 'replaying the same game is ignored');
  const g = Save.importJson(Save.exportJson(f)); mergeDex(g.dex); mergeDex(JSON.parse(JSON.stringify(dexData())));
  for (const id of families) assert.equal(dexKnowledge(id).games - globalBefore[id], 1, `${id}: still one credit after reload and merges`);
  assert.deepEqual(counts(g), after, 'the franchise save keeps the same knowledge');
  // Another franchise's game with the same family counts separately: knowledge is shared across franchises.
  dexKnowledgeGame([a.species], 'another-franchise:game-1');
  assert.equal(dexKnowledge(a.species).games - globalBefore[a.species], 2);
});

test('locked lore and relationships never appear anywhere in a profile before their thresholds (every form, all boundaries)', () => {
  for (const { species, form } of DEX_REVIEW_CATALOG) {
    const c = dexContent(species.id, form.stage);
    for (const n of [5, 15, 30]) {
      const html = speciesSheet(species, null, { previewStage: form.stage, previewGames: n - 1, revealAll: true });
      const at = speciesSheet(species, null, { previewStage: form.stage, previewGames: n, revealAll: true });
      for (const entry of c.lore.filter((x) => x.games >= n)) {
        assert.ok(!html.includes(entry.text), `${form.id}: ${entry.games}-game lore text hidden at ${n - 1}`);
        assert.ok(!html.includes(entry.title.replace(/'/g, '&#39;')) || c.biography.join(' ').includes(entry.title), `${form.id}: ${entry.games}-game lore title hidden at ${n - 1}`);
      }
      for (const entry of c.lore.filter((x) => x.games === n)) assert.ok(at.includes(entry.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')) || at.includes(entry.text), `${form.id}: ${n}-game lore shown at ${n}`);
      for (const rel of c.relationships.filter((x) => x.games >= n)) assert.ok(!html.includes(rel.text), `${form.id}: relationship hidden at ${n - 1}`);
    }
  }
});

test('profiles and reviewer previews never write to the franchise, its monsters or the shared Dex; samples have no career', () => {
  resetDex();
  const f = toSunday(23); F.finishSunday(f, F.simulatePlayerGame(f));
  const snapshot = JSON.stringify(f); const dex = JSON.stringify(dexData());
  for (const m of f.roster) {
    const s = SPECIES_DEX.find((x) => x.id === m.species);
    const html = speciesSheet(s, f, { monster: m });
    assert.ok(html.includes('My Beast View'));
    speciesSheet(s, f, { previewGames: 30, previewStage: m.stage || 0 });
  }
  let screen; registerBeastDexReviewer({ registerScreen: (_id, v) => { screen = v; } });
  screen.render({ f });
  assert.equal(JSON.stringify(f), snapshot, 'rendering profiles changed nothing in the franchise');
  assert.equal(JSON.stringify(dexData()), dex, 'previews did not unlock or count anything');
  // A sample beast (no roster match) shows preview ratings and no personal history or accomplishments.
  for (const { species, form } of DEX_REVIEW_CATALOG.filter((_, i) => i % 7 === 0)) {
    const sample = { id: `dex-preview:${form.id}`, species: species.id, stage: form.stage, name: `${form.name} (sample)`, attributes: { speed: 40 } };
    const html = speciesSheet(species, null, { monster: sample, previewStage: form.stage, revealAll: true });
    assert.ok(html.includes('No history recorded yet.'), `${form.id}: the sample has no personal history`);
    assert.ok(!/Season \d/.test(html), `${form.id}: no season-dated entries for a sample`);
    assert.ok(!html.includes('Career statistics'), `${form.id}: no career statistics for a sample`);
  }
});

test('every form has a portrait motion consistent with its sprite anatomy', () => {
  const HOPS = new Set(['hop', 'jump', 'pounce', 'stomp']); const FLIGHT = new Set(['flutter', 'flyby', 'hover', 'buzz']);
  let n = 0; const signatures = new Set();
  for (const s of SPECIES_DEX) for (const form of formsOf(s.id)) {
    const m = dexMotion(s.id, form.stage); const spec = dexFormSpec(s.id, form.stage); n++;
    assert.ok(m && m.idle && m.tap && m.rare, `${form.id}: has a motion profile`);
    const wings = (spec.features || []).includes('wings');
    if (['serpent', 'blob', 'shelled'].includes(spec.body)) assert.ok(!HOPS.has(m.tap) && !HOPS.has(m.rare), `${form.id}: a ${spec.body} never hops on legs`);
    if (!wings) assert.ok(![m.idle, m.tap, m.rare].some((k) => FLIGHT.has(k)), `${form.id}: only a winged form flies`);
    assert.ok(m.tempo >= 500 && m.tempo <= 2500, `${form.id}: tempo in range (${m.tempo})`);
    signatures.add(`${m.idle}|${m.tap}|${m.rare}|${m.tempo}|${m.amp}`);
    assert.deepEqual(dexMotion(s.id, form.stage), m, 'deterministic');
  }
  assert.equal(n, DEX_REVIEW_CATALOG.length);
  assert.ok(signatures.size > n * 0.6, `forms do not all move identically (${signatures.size} distinct of ${n})`);
});
