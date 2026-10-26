// Preview Evolution (Developer Tools): every real transition and nothing else; the real tryEvolve + evolutionReport on
// throwaway data; the gameplay scene; no save, roster, collection or timeline touched; normal evolution unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { previewTransitions, previewSpecies, buildPreview, isValidTransition } from '../src/lab/evo-preview.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { generateMonster, tryEvolve, evolutionReady } from '../src/data/monsters.js';
import { evolutionSnapshot, evolutionReport } from '../src/franchise/evolution-report.js';
import { createRng, hashString } from '../src/core/rng.js';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

test('transitions: exactly the dex evolutions (0→1, and 1→2 where a second form exists); none for Legendaries or standalone species', () => {
  const ts = previewTransitions(); const expected = SPECIES_DEX.filter((s) => s.rarity !== 'legendary').reduce((n, s) => n + (s.evolution || []).length, 0);
  assert.equal(ts.length, expected); assert.ok(ts.length >= 20);
  for (const t of ts) { const sp = SPECIES_DEX.find((s) => s.id === t.species); assert.equal(t.toName, sp.evolution[t.fromStage].name); assert.equal(t.level, sp.evolution[t.fromStage].level); assert.equal(t.toStage, t.fromStage + 1); }
  for (const sp of SPECIES_DEX.filter((s) => s.rarity === 'legendary' || !(s.evolution || []).length)) { assert.ok(!previewSpecies().some((x) => x.species === sp.id), sp.id); assert.equal(buildPreview(sp.id, 0), null, `${sp.id} cannot be evolved`); }
  const two = SPECIES_DEX.find((s) => (s.evolution || []).length === 2);
  assert.ok(isValidTransition(two.id, 0) && isValidTransition(two.id, 1) && !isValidTransition(two.id, 2)); assert.equal(buildPreview(two.id, 2), null, 'no transition past the final form');
});
test('a preview is the real evolution: tryEvolve on a copy, evolutionReport from the two snapshots, same as the roster Evolve button computes', () => {
  for (const t of previewTransitions()) {
    const p = buildPreview(t.species, t.fromStage); assert.ok(p, `${t.species} ${t.fromStage}`);
    assert.equal(p.beforeMon.stage, t.fromStage); assert.equal(p.afterMon.stage, t.toStage); assert.equal(p.report.fromName, t.fromName); assert.equal(p.report.toName, t.toName);
    // rebuild by hand with the gameplay functions: identical report
    const m = generateMonster(createRng(hashString(`evo-preview|${t.species}|${t.fromStage}|1`)), { species: t.species, quality: 62, id: `preview_${t.species}_${t.fromStage}` }); m.stage = t.fromStage; m.name = t.fromName; m.level = t.level; m.xp = 0; m.potential = m.potential ?? 72; m.salary = m.salary ?? null; m.fatigue = 0; m.injury = null;
    assert.ok(evolutionReady(m), 'the temporary monster is at the evolution level'); const before = evolutionSnapshot(m); tryEvolve(m);
    assert.deepEqual(p.report, evolutionReport(before, evolutionSnapshot(m), {}));
  }
});
test('replay: the same transition gives the same preview every time, as fresh objects (nothing shared, nothing kept)', () => {
  const t = previewTransitions()[0]; const a = buildPreview(t.species, t.fromStage), b = buildPreview(t.species, t.fromStage);
  assert.deepEqual(a, b); assert.notEqual(a.afterMon, b.afterMon); a.afterMon.attributes.speed = 1; assert.notEqual(buildPreview(t.species, t.fromStage).afterMon.attributes.speed, 1);
});
test('no side effects: building every preview with a franchise loaded changes no franchise, save, roster, collection or timeline; the dex is untouched', () => {
  const f = newFranchise(31); const save0 = JSON.stringify(f); const dex0 = JSON.stringify(SPECIES_DEX); // the export file adds a timestamp; the franchise object is what a save writes
  for (const t of previewTransitions()) buildPreview(t.species, t.fromStage);
  assert.equal(JSON.stringify(f), save0); assert.equal(JSON.stringify(SPECIES_DEX), dex0); assert.equal(Save.importJson(Save.exportJson(f)).roster.length, f.roster.length);
});
test('the screen opens the gameplay evolution scene and never imports save, franchise or settings writers', () => {
  const src = fs.readFileSync(new URL('../src/ui/screens/evo-preview.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ openEvolutionScene[^}]*\} from '\.\.\/evolution-scene\.js'/); assert.match(src, /openEvolutionScene\(\{ report: p\.report, beforeMon: p\.beforeMon, afterMon: p\.afterMon/);
  const imports = (txt) => txt.split('\n').filter((l) => l.startsWith('import ')).join('\n');
  assert.ok(!/franchise\/(franchise|save|store|slots|cloud-save|dex-store|achievement-store|career)\.js/.test(imports(src)) && !/app\.save\(|settings\.evoSound\s*=/.test(src), 'no save path, no saved-setting write');
  const lab = fs.readFileSync(new URL('../src/lab/evo-preview.js', import.meta.url), 'utf8'); assert.ok(!/franchise\/(franchise|save|store|slots|dex-store|achievement-store|career)\.js/.test(imports(lab)), 'the builder imports only the dex, monsters, the report and the rng');
});
test('normal evolution gameplay is unchanged: evolveMonster still evolves once, records the timeline and the Dex', () => {
  const f = newFranchise(44); const m = f.roster.find((x) => { const sp = SPECIES_DEX.find((s) => s.id === x.species); return sp?.evolution?.length && sp.rarity !== 'legendary'; });
  m.level = SPECIES_DEX.find((s) => s.id === m.species).evolution[0].level; const name0 = m.name;
  for (const t of previewTransitions()) buildPreview(t.species, t.fromStage); // previews first, then the real thing
  const r = F.evolveMonster(f, m.id); assert.equal(r.ok, true); assert.equal(m.stage, 1); assert.notEqual(m.name, name0);
  assert.ok((m.career?.ev || []).some((e) => e.t === 'evolve'), 'Career Timeline entry'); assert.equal(F.evolveMonster(f, m.id).ok, false, 'not twice');
});
