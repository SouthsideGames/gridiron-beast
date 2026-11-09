#!/usr/bin/env node
// Builds docs/task8/ABILITY_COMPLETION_MATRIX.md: one row for each of the 144 approved abilities (72 football, 72 Beast Clash).
// Everything is read from the code and from the existing generated matrices, so the file can be regenerated at any commit:
//   implementation   the registered engine contract (src/sim/abilities/<family>.js, src/clash/abilities/<family>.js)
//   presentation     the look (src/ui/fx/looks, src/ui/clash/t8/looks), the status recorded in FX_FOOTBALL_MATRIX.md / computed as in
//                    tools/fx-clash-matrix.mjs, and the integration items this tool checks in the code (I1 to I6 below)
//   reviewer         every Dex form x mastery tier run through the reviewer's own first run (reviewSequence, reviewClashScenario)
//   tests            the test files that name the ability (its id or its family's contract) plus the suites that iterate every ability
//   flags            Clash points awaiting a ruling (src/clash/t8/flags.js PROVISIONAL_POINTS) and PROVISIONAL scenarios
//   node tools/ability-completion-matrix.mjs            writes the file
//   node tools/ability-completion-matrix.mjs --check    exits 1 when the file on disk differs from a fresh build
//   node tools/ability-completion-matrix.mjs --stdout   prints instead of writing
import fs from 'node:fs';
import path from 'node:path';
import { reviewCatalog } from '../src/sim/abilities/review.js';
import { reviewSequence } from '../src/sim/abilities/review-sequence.js';
import { contractOf } from '../src/sim/abilities/registry.js';
import '../src/clash/abilities/index.js';
import { registeredClashAbilities, clashContractById } from '../src/clash/t8/registry.js';
import { abilityById, familyById, formsOf } from '../src/data/beast-dex.js';
import { listScenarios } from '../src/clash/t8/review.js';
import { reviewClashScenario } from '../src/clash/t8/review-phases.js';
import { PROVISIONAL_POINTS } from '../src/clash/t8/flags.js';
import { LOOKS as FOOTBALL_LOOKS } from '../src/ui/fx/looks/index.js';
import { LOOKS as CLASH_LOOKS } from '../src/ui/clash/t8/looks/index.js';
import { KICK_ABILITY } from '../src/ui/fx/kick-fx.js';
import { FIELD_REVEAL } from '../src/ui/fx/fields-fx.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const has = (rel) => fs.existsSync(path.join(ROOT, rel));
const OUT = 'docs/task8/ABILITY_COMPLETION_MATRIX.md';
const cell = (s) => String(s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- integration items, checked in the code (FX_FOOTBALL_MATRIX I1 to I6)
const MATCH = read('src/ui/screens/match.js'); const MATCH_FX = has('src/ui/fx/match-fx.js') ? read('src/ui/fx/match-fx.js') : ''; const RULES = read('src/sim/rules.js');
const DONE = {
  I1: /kickPlay\(ev, kickLookup/.test(MATCH) && /buildKickFx/.test(MATCH_FX), // formula kicks draw their kick ability in real matches
  I2: /presnapFields\(/.test(MATCH) && /export function previewPendingFields/.test(RULES), // active and banked fields on the play-call screen
  I3: /fxOptions: fxOptionsFor\(f\.settings\)/.test(MATCH) && /data-change="reducedflash"/.test(read('src/ui/screens/menu.js')), // Reduce flashes setting
  I4: /abilityTicks\(/.test(MATCH), // ability-strip ticks (Anchor Plate, Iron Lungs, Night Watch)
  I5: /absentMonsters\(/.test(MATCH), // Sovereign Arm's absent-defender chip
  I6: /preroll: true/.test(MATCH) && /anim\.pre\b/.test(MATCH), // the match plays the time before the snap
};
// Fields a contract queues inside the snap itself (a preSnap hook reading the chosen plays): they do not exist on the play-call screen.
const IN_SNAP_FIELDS = new Set(fs.readdirSync(path.join(ROOT, 'src/sim/abilities')).filter((f) => f.endsWith('.js')).flatMap((f) => { const s = read(`src/sim/abilities/${f}`); return [...s.matchAll(/(?:pctx|api)\.queueField\(\{[^\n]*?ability: '([A-Z]{3}-\d\d-F)'/g)].map((m) => m[1]); }));
// What is still missing after this branch, per football ability (the reason is stated; nothing here is hidden as "complete").
const REMAINING_F = {
  'MET-02-F': 'The Dex puts the saved-drain tick on a stamina inspect panel; the match screen has none. The tick is shown in the last play\'s ability strip instead (I4).',
  'DAR-02-F': 'The Dex puts the Dark-awareness protection note on an ally inspect panel; the match screen has none. The note is shown in the last play\'s ability strip instead (I4).',
  'DRA-06-F': 'The return animation before the formation is not built (it needs a pre-snap formation animation the play-call screen does not have). The portrait indicator while the defender is out is in the scoreboard strip (I5).',
  'PSY-03-F': 'The marked candidate is drawn in the pre-roll (I6), after both calls; the Dex shows it before either side selects. The engine draws the mark inside the snap, so showing it earlier needs a pre-choice phase in the rules (a gameplay change, not made here).',
  'LIG-04-F': 'The prism, beam and fracture are drawn in the pre-roll (I6), after both calls; the Dex fractures the field before the play choices. The engine removes the field inside the snap, so showing it earlier needs a pre-choice phase in the rules (a gameplay change, not made here).',
};
for (const id of IN_SNAP_FIELDS) REMAINING_F[id] = 'Its field is created inside the snap from the two chosen plays, so the play-call screen cannot show it before the choices; the reveal plays in the pre-roll (I6), and the field shows on later play-call screens while it lasts (I2). A reveal before both choices needs a pre-choice phase in the rules (a gameplay change, not made here).';

const NOTE_F = {
  'FIR-02-F': 'placed from the linebacker\'s own alignment: previewed before the snap when it is your linebacker; against the opponent\'s hidden defensive call it is not previewed (the call stays secret) and its reveal plays in the pre-roll',
};
function footballMatrixRows() {
  const out = {}; if (!has('docs/task8/FX_FOOTBALL_MATRIX.md')) return out;
  for (const line of read('docs/task8/FX_FOOTBALL_MATRIX.md').split('\n')) { const m = /^\| ([A-Z]{3}-\d\d-F) \|/.exec(line); if (!m) continue; const cols = line.split('|').map((x) => x.trim()); const last = cols[cols.length - 2] || ''; const st = /\*\*(complete|partial|blocked)\*\*:?\s*(.*)$/.exec(last);
    out[m[1]] = { status: st ? st[1] : 'unknown', note: st ? st[2] : last, reviewer: cols[cols.length - 4] || '' }; }
  return out;
}
function clashMatrixRows() {
  const out = {}; if (!has('docs/task8/M4_ABILITY_MATRIX.md')) return out;
  for (const line of read('docs/task8/M4_ABILITY_MATRIX.md').split('\n')) { const cols = line.split('|').map((x) => x.trim()); if (!/^[A-Z]{3}-\d\d-C$/.test(cols[2] || '')) continue; out[cols[2]] = { d16: cols[6], scenarios: cols[8], cases: cols[9], provScenarios: cols[10], points: cols[11], question: cols[12] }; }
  return out;
}

// ---------------------------------------------------------------- tests that name an ability
const TEST_FILES = [...fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).map((f) => `tests/${f}`), ...fs.readdirSync(path.join(ROOT, 'tests/clash')).filter((f) => f.endsWith('.test.js')).map((f) => `tests/clash/${f}`)];
const TEST_SRC = Object.fromEntries(TEST_FILES.map((f) => [f, read(f)]));
const short = (f) => f.replace(/^tests\//, '').replace(/\.test\.js$/, '');
const FOOT_ELEMENT_TESTS = { Fire: 'task8-abilities-fire-water', Water: 'task8-abilities-fire-water', Nature: 'task8-abilities-nature-electric', Electric: 'task8-abilities-nature-electric', Earth: 'task8-abilities-earth-ice', Ice: 'task8-abilities-earth-ice', Wind: 'task8-abilities-wind-dark', Dark: 'task8-abilities-wind-dark', Light: 'task8-abilities-light-metal', Metal: 'task8-abilities-light-metal', Psychic: 'task8-abilities-psychic-dragon', Dragon: 'task8-abilities-psychic-dragon' };
const FX_A = new Set(['Fire', 'Water', 'Nature', 'Electric', 'Ice', 'Wind']);
function testsFor(id, family, mode, element) {
  const named = TEST_FILES.filter((f) => TEST_SRC[f].includes(`'${id}'`) || TEST_SRC[f].includes(`"${id}"`) || TEST_SRC[f].includes(`${id} `) || (mode === 'F' && !f.startsWith('tests/clash/') && new RegExp(`abilities/${family}\\.js|family: '${family}'|=== '${family}'`).test(TEST_SRC[f]))).map(short);
  const every = mode === 'F' ? [FOOT_ELEMENT_TESTS[element], FX_A.has(element) ? 'task8-fx-football-a' : 'task8-fx-football-b', 'task8-fx-render', 'task8-review-sequences-a', 'task8-review-sequences-b', 'task8-reduced-flash'] : ['task8-fx-clash-a', 'task8-fx-clash-b', 'task8-fx-clash-render', 'task8-reduced-flash', 'clash/t8-review'];
  return [...new Set([...named, ...every.filter((x) => x && has(`tests/${x}.test.js`))])].sort();
}

// ---------------------------------------------------------------- football rows
const FM = footballMatrixRows(); const footRows = []; const footTotals = { complete: 0, partial: 0, awaiting: 0, variants: 0, shown: 0, unfinished: [] };
for (const c of reviewCatalog()) {
  const id = c.abilityId; const contract = contractOf(c.family); const look = FOOTBALL_LOOKS[id]; const base = FM[id] || { status: 'unknown', note: '' };
  const impl = contract && has(`src/sim/abilities/${c.family}.js`) ? `implemented (src/sim/abilities/${c.family}.js)` : 'MISSING';
  // reviewer: every form x mastery on its first run
  let shown = 0, total = 0; const failed = [];
  for (const form of c.forms) for (const mastery of c.tiers) { total += 1; const r = reviewSequence({ family: c.family, form, mastery }); if (r.ok) shown += 1; else failed.push(`${form}@${mastery}`); }
  footTotals.variants += total; footTotals.shown += shown;
  // presentation
  const missing = []; const done = [];
  if (!look) missing.push('no look');
  if (KICK_ABILITY[id]) { if (DONE.I1) done.push('drawn on real match kicks (I1)'); else missing.push('match screen kick hook (I1)'); }
  if (FIELD_REVEAL[id] && !IN_SNAP_FIELDS.has(id)) { if (DONE.I2) done.push('field shown on the play-call screen before the snap, reveal once (I2)'); else missing.push('pre-snap field on the play-call screen (I2)'); }
  if (/softened flash|reduced-flash/i.test(base.note) || ['LIG-06-F'].includes(id)) { if (DONE.I3) done.push('softened by the Reduce flashes setting (I3)'); else missing.push('Reduce flashes setting (I3)'); }
  if (id === 'MET-01-F') { if (DONE.I4) done.push('absorbed-push tick beside its entry in the ability strip (I4)'); else missing.push('progress tick (I4)'); }
  if (['MET-02-F', 'DAR-02-F'].includes(id) && !DONE.I4) missing.push('ability-strip tick (I4)');
  if (id === 'DRA-06-F' && !DONE.I5) missing.push('portrait indicator (I5)');
  if (/I6/.test(base.note) || /pre-snap|before the snap/i.test(base.note)) { if (DONE.I6) done.push('time before the snap is played in the match (I6)'); else missing.push('match pre-roll (I6)'); }
  if (REMAINING_F[id]) missing.push(REMAINING_F[id]);
  const status = missing.length || !look ? 'partial' : 'complete'; footTotals[status] += 1; if (status === 'partial') footTotals.unfinished.push([id, c.name, missing.join(' ')]);
  const pres = status === 'complete' ? `**complete**${done.length ? ': ' + done.join('; ') : ''}` : `**partial**: ${missing.join(' ')}${done.length ? ' Done: ' + done.join('; ') + '.' : ''}`;
  const notes = [`look: ${look ? look.name : 'none'}`, base.status !== 'unknown' ? `FX_FOOTBALL_MATRIX before this branch: ${base.status}` : null, NOTE_F[id] || null].filter(Boolean).join('; ');
  footRows.push(`| ${id} | ${cell(c.name)} | ${c.family} (${c.element} ${c.position}) | ${impl} | ${cell(pres)} | ${shown}/${total} variants complete on the first run (${c.forms.length} form(s) x ${c.tiers.length} mastery)${failed.length ? '; not complete: ' + failed.join(', ') : ''} | ${testsFor(id, c.family, 'F', c.element).join(', ')} | none | ${cell(notes)} |`);
}

// ---------------------------------------------------------------- Clash rows
const CM = clashMatrixRows(); const clashRows = []; const clashTotals = { complete: 0, partial: 0, awaiting: 0, variants: 0, shown: 0, unfinished: [], gated: [] };
const pickMain = (id, stage, tier) => { const scs = listScenarios(id, stage, tier); return scs.find((s) => s.kind === 'valid' && !s.provisional) || scs.find((s) => s.kind === 'valid') || scs.find((s) => !s.provisional) || scs[0]; };
const gatedBy = (id) => Object.entries(PROVISIONAL_POINTS).filter(([, p]) => (p.abilities || []).includes(id)).map(([k]) => k);
for (const id of registeredClashAbilities()) {
  const a = abilityById(id); const fam = familyById(a.familyId); const forms = formsOf(a.familyId); const look = CLASH_LOOKS[id]; const m4 = CM[id] || {};
  const impl = clashContractById(id) && has(`src/clash/abilities/${a.familyId}.js`) ? `implemented (src/clash/abilities/${a.familyId}.js)` : 'MISSING';
  let shown = 0, total = 0, provOnly = 0; const failed = [];
  for (const f of forms) for (const tier of [0, 1, 2, 3]) { total += 1; const sc = pickMain(id, f.stage, tier); if (sc?.provisional) provOnly += 1; const r = reviewClashScenario({ abilityId: id, stage: f.stage, tier, scenarioId: sc.id }); if (r.ok) shown += 1; else failed.push(`${f.stage}@${tier}`); }
  clashTotals.variants += total; clashTotals.shown += shown;
  const points = [...new Set([...gatedBy(id), ...String(m4.points || '').split(',').map((x) => x.replace(/`/g, '').trim()).filter((x) => x && x !== '-')])];
  const provScenarios = listScenarios(id, 0, 0).filter((s) => s.provisional).length;
  const missing = []; if (!look) missing.push('no look'); if (provOnly === total) missing.push('its only valid demonstration is a PROVISIONAL scenario (the gated reading awaits a ruling): the look is shown in reviewer / provisional mode only, labelled'); else if (provOnly) missing.push(`at ${provOnly}/${total} variants the only valid demonstration is PROVISIONAL (awaiting a ruling); the other variants are complete`);
  const status = !look || provOnly === total ? 'partial' : 'complete'; clashTotals[status] += 1; if (status === 'partial') clashTotals.unfinished.push([id, a.name, missing.join(' ')]);
  if (points.length) { clashTotals.awaiting += 1; clashTotals.gated.push([id, a.name, points.join(', ')]); }
  const pres = status === 'complete' ? `**complete**${missing.length ? ' (' + missing.join(' ') + ')' : ''}${DONE.I3 ? '; flashes softened by the Reduce flashes setting' : ''}` : `**partial**: ${missing.join(' ')}`;
  const flags = points.length ? `awaiting ruling: ${points.join(', ')}${provScenarios ? `; ${provScenarios} PROVISIONAL scenario(s)` : ''}` : provScenarios ? `${provScenarios} PROVISIONAL scenario(s)` : 'none';
  const notes = [`look: ${look ? look.name : 'none'}`, m4.d16 === 'review' ? 'D16 owner-review row (implemented literally)' : null, m4.question && m4.question !== '-' ? `open question: ${m4.question}` : null, m4.cases ? `${m4.cases} contract cases` : null].filter(Boolean).join('; ');
  clashRows.push(`| ${id} | ${cell(a.name)} | ${a.familyId} (${fam.type}) | ${impl} | ${cell(pres)} | ${shown}/${total} variants complete on the first run (${forms.length} form(s) x 4 mastery)${failed.length ? '; not complete: ' + failed.join(', ') : ''} | ${testsFor(id, a.familyId, 'C', fam.type).join(', ')} | ${cell(flags)} | ${cell(notes)} |`);
}

// ---------------------------------------------------------------- the document
const head = '| ID | Ability | Family | Implementation (engine contract) | Presentation | Reviewer coverage | Tests | Provisional / awaiting ruling | Notes |\n|---|---|---|---|---|---|---|---|---|';
const tick = (b) => (b ? 'done' : 'NOT done');
const doc = `# Task 8 ability completion matrix (144 abilities)

Generated by \`node tools/ability-completion-matrix.mjs\` from the code and the existing matrices (FX_FOOTBALL_MATRIX.md,
FX_CLASH_MATRIX.md, M4_ABILITY_MATRIX.md). Do not edit by hand: regenerate. \`--check\` fails when this file is stale.

How to read it:
- **Implementation**: the registered engine contract. "Implemented" means the contract module exists and is registered; the
  contract tests are listed under Tests.
- **Presentation**: *complete* means every part of the approved Dex visual that the game can show is drawn where the Dex puts it.
  *Partial* names exactly what is missing and why. Final visual acceptance is the owner's, in the reviewers; this column records
  presence, not taste.
- **Reviewer coverage**: every Dex form x mastery tier run through the reviewer's own code; a variant counts when its main
  demonstration completes every checklist phase on the first run (football: \`reviewSequence\`; Clash: \`reviewClashScenario\` on the
  scenario the reviewer opens first).
- **Provisional / awaiting ruling**: Clash points in \`src/clash/t8/flags.js\` \`PROVISIONAL_POINTS\` (docs/task8/M4_DECISIONS_PENDING.md
  part A). In normal play the ability reports \`unmet: awaiting ruling\` on that path and keeps its use; everything else runs as
  approved. Football has no point awaiting a ruling.

## Totals

| | Abilities | Implemented | Presentation complete | Presentation partial | Awaiting a ruling (any path) | Reviewer variants complete on the first run |
|---|---|---|---|---|---|---|
| Football | ${footRows.length} | ${footRows.filter((r) => /\| implemented \(/.test(r)).length} | ${footTotals.complete} | ${footTotals.partial} | ${footTotals.awaiting} | ${footTotals.shown} / ${footTotals.variants} |
| Beast Clash | ${clashRows.length} | ${clashRows.filter((r) => /\| implemented \(/.test(r)).length} | ${clashTotals.complete} | ${clashTotals.partial} | ${clashTotals.awaiting} | ${clashTotals.shown} / ${clashTotals.variants} |
| **All** | ${footRows.length + clashRows.length} | ${[...footRows, ...clashRows].filter((r) => /\| implemented \(/.test(r)).length} | ${footTotals.complete + clashTotals.complete} | ${footTotals.partial + clashTotals.partial} | ${footTotals.awaiting + clashTotals.awaiting} | ${footTotals.shown + clashTotals.shown} / ${footTotals.variants + clashTotals.variants} |

Integration items (docs/task8/FX_FOOTBALL_MATRIX.md), as found in the code:

| Item | State | What it is |
|---|---|---|
| I1 | ${tick(DONE.I1)} | Formula kicks draw their kick ability on the match screen (Second Chance, Dragon Roar, Stone Cradle), through the reviewer's builder |
| I2 | ${tick(DONE.I2)} | Fields on the play-call screen before the snap: every active field, and the banked fields the next snap creates, with a once-only reveal. Fields a contract creates inside the snap are not known before it (listed below) |
| I3 | ${tick(DONE.I3)} | "Reduce flashes" setting, passed to the football and Clash effect layers |
| I4 | ${tick(DONE.I4)} | Ability-strip ticks (Anchor Plate, Iron Lungs, Night Watch); no inspect panel exists |
| I5 | ${tick(DONE.I5)} | Sovereign Arm: the absent defender's portrait indicator. The return animation is not built |
| I6 | ${tick(DONE.I6)} | The match plays the time before the snap (pre-roll) |

### Unfinished presentation, football (${footTotals.unfinished.length})

${footTotals.unfinished.length ? footTotals.unfinished.map(([id, name, why]) => `- **${id} ${name}**: ${why}`).join('\n') : 'None.'}

### Unfinished presentation, Beast Clash (${clashTotals.unfinished.length})

${clashTotals.unfinished.length ? clashTotals.unfinished.map(([id, name, why]) => `- **${id} ${name}**: ${why}`).join('\n') : 'None.'}

### Beast Clash abilities with a path awaiting a ruling (${clashTotals.gated.length})

${clashTotals.gated.length ? clashTotals.gated.map(([id, name, pts]) => `- ${id} ${name}: ${pts}`).join('\n') : 'None.'}

## Football (72)

${head}
${footRows.join('\n')}

## Beast Clash (72)

${head}
${clashRows.join('\n')}
`;
if (process.argv.includes('--stdout')) process.stdout.write(doc);
else if (process.argv.includes('--check')) { const cur = has(OUT) ? read(OUT) : ''; if (cur !== doc) { console.error(`${OUT} is stale: run node tools/ability-completion-matrix.mjs`); process.exit(1); } console.log(`${OUT} is up to date`); }
else { fs.writeFileSync(path.join(ROOT, OUT), doc); console.log(`${OUT}: football ${footTotals.complete} complete / ${footTotals.partial} partial / ${footTotals.awaiting} awaiting; Clash ${clashTotals.complete} complete / ${clashTotals.partial} partial / ${clashTotals.awaiting} awaiting; reviewer ${footTotals.shown + clashTotals.shown}/${footTotals.variants + clashTotals.variants}`); }
