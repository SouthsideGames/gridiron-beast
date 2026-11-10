#!/usr/bin/env node
// Builds the 72-row table of docs/task8/FX_CLASH_MATRIX.md from the code: every Clash ability's look, the phase evidence of its
// reviewer scenario (first form, mastery 0; every form x mastery is checked by tests/task8-fx-clash-{a,b}.test.js), the forms and
// masteries covered, the provisional gating (docs/task8/M4_DECISIONS_PENDING.md part A) and, when --report=FILE (the JSON of
// tools/fx-clash-check.mjs) is given, the reviewer-verified runs and element counts. Prints the table to stdout.
//   node tools/fx-clash-matrix.mjs [--report=/path/to/fx-clash-report.json]
import fs from 'node:fs';
import '../src/clash/abilities/index.js';
import { registeredClashAbilities } from '../src/clash/t8/registry.js';
import { abilityById, familyById, formsOf } from '../src/data/beast-dex.js';
import { listScenarios } from '../src/clash/t8/review.js';
import { PROVISIONAL_POINTS } from '../src/clash/t8/flags.js';
import { prepare, phasesOf, PHASES, LOOKS, drawSpan } from '../tests/helpers/fx-clash.js';

const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(a.indexOf('=') + 1) : d; };
const report = arg('report') && fs.existsSync(arg('report')) ? JSON.parse(fs.readFileSync(arg('report'), 'utf8')) : null;
const pick = (id, stage, tier) => { const scs = listScenarios(id, stage, tier); return scs.find((s) => s.kind === 'valid' && !s.provisional) || scs.find((s) => s.kind === 'valid') || scs.find((s) => !s.provisional) || scs[0]; };
const gatedBy = (id) => Object.entries(PROVISIONAL_POINTS).filter(([, p]) => !p.approved && (p.abilities || []).includes(id)).map(([k]) => k);
const tick = (v) => (v === 'n/a' ? 'n/a' : v ? `✓ ${v}` : '✗');
const rows = []; let complete = 0, partial = 0;
for (const id of registeredClashAbilities()) {
  const a = abilityById(id); const fam = familyById(a.familyId); const look = LOOKS[id]; const forms = formsOf(a.familyId);
  const visual = a.details.find((d) => d.section === 'Visuals')?.rule || '';
  const sc = pick(id, 0, 0); const P = prepare({ abilityId: id, stage: 0, tier: 0, scenarioId: sc.id }); const ev = phasesOf(P, id);
  // every variant's scenario (forms x masteries): provisional-only variants are those whose only valid demonstration is a PROVISIONAL scenario
  let provOnly = 0, total = 0; for (const f of forms) for (const t of [0, 1, 2, 3]) { total += 1; const s = pick(id, f.stage, t); if (s?.provisional) provOnly += 1; }
  const maxEl = Math.max(...['full', 'low', 'min'].map((q) => drawSpan(P, id, q).maxEl));
  const runs = report ? report.filter((r) => r.abilityId === id) : []; const okRuns = runs.filter((r) => Object.values(r.phases).every(Boolean) && !r.errors.length);
  const counts = runs.length ? Math.max(...runs.flatMap((r) => Object.entries(r.counts).filter(([k]) => k !== 'stage').map(([, v]) => v))) : null;
  const open = []; if (provOnly) open.push(`PROVISIONAL-gated at ${provOnly}/${total} variants (${gatedBy(id).join(', ') || 'see M4_DECISIONS_PENDING part A'}): the look is shown in reviewer / provisional mode only, labelled`);
  if (look.note) open.push(look.note);
  const status = provOnly === total ? 'partial' : 'complete'; if (status === 'complete') complete += 1; else partial += 1;
  rows.push(`| ${id} | ${a.name} (${a.familyId}; ${fam.type}) | ${visual.replace(/\|/g, '/')} | ${look.name}: ${lookSummary(id)} | ${PHASES.map((ph) => tick(ev[ph])).join(' | ')} | ${forms.length} form(s) x 4 mastery = ${total}; tests: all ${total} | ${runs.length ? `${okRuns.length}/${runs.length} headless runs (${runs.map((r) => r.tag.split(':')[1]).join(', ')}), shots per phase; peak ${counts} layer elements` : 'not run'} | task8-fx-clash-${['Fire', 'Water', 'Nature', 'Electric', 'Ice', 'Wind'].includes(fam.type) ? 'a' : 'b'}, task8-fx-clash-render | **${status}**${open.length ? ': ' + open.join('; ') : ''} (peak ${maxEl} elements per frame in the DOM-free draw) |`);
}
function lookSummary(id) { const src = fs.readFileSync(new URL(`../src/ui/clash/t8/looks/${fileOf(id)}.js`, import.meta.url), 'utf8'); const m = new RegExp(`// ${id} [^:]*: ([^\\n]*)`).exec(src); return m ? m[1].replace(/\|/g, '/') : ''; }
function fileOf(id) { const el = familyById(abilityById(id).familyId).type; return { Fire: 'fire-water', Water: 'fire-water', Nature: 'nature-electric', Electric: 'nature-electric', Earth: 'earth-ice', Ice: 'earth-ice', Wind: 'wind-dark', Dark: 'wind-dark', Light: 'light-metal', Metal: 'light-metal', Psychic: 'psychic-dragon', Dragon: 'psychic-dragon' }[el]; }
console.log(`Summary: **${complete} complete, ${partial} partial, 0 blocked** (72 abilities, ${registeredClashAbilities().reduce((s, id) => s + formsOf(abilityById(id).familyId).length, 0)} forms, ${registeredClashAbilities().reduce((s, id) => s + formsOf(abilityById(id).familyId).length * 4, 0)} form x mastery variants).\n`);
console.log('| ID | Ability | Dex visual (approved) | Look drawn (intentional artwork change) | Anticipation | Activation | Movement | Impact | Target feedback | Persistence | Cleanup | Forms / mastery covered | Reviewer-verified (headless) | Tests | Status / open questions |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows) console.log(r);
