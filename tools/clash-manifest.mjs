#!/usr/bin/env node
// Prints the Beast Clash balance manifest (src/clash/balance-manifest.js) as Markdown, with current and proposed values read from
// the data. Usage: node tools/clash-manifest.mjs [--out=BEAST_CLASH_BALANCE_MANIFEST.md]. Nothing here changes a default.
import { CLASH_MOVES } from '../src/data/clash-moves.js';
import fs from 'node:fs';
import { MANIFEST, ENGINE_HOOKS, GATE_PATCHES, gateConfig, describeEntry, REVIEW, ALTERNATES, FINAL_PATCHES, TEXT_CORRECTIONS, APPROVED_PATCHES, OWNER_ADDED, DECLINED_PATCHES, decisionOf, STATUS_TEXT } from '../src/clash/balance-manifest.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { CLASH_VALUES } from '../src/clash/values.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const name = Object.fromEntries(SPECIES_DEX.map((s) => [s.id, s.name]));
const J = (o) => '`' + JSON.stringify(o).replace(/\|/g, '\\|') + '`';
const lines = [];
lines.push('# Beast Clash balance manifest', '', `Generated from \`src/clash/balance-manifest.js\` by \`node tools/clash-manifest.mjs\`. Values version ${CLASH_VALUES.version}, engine ${CLASH_VALUES.engineVersion}.`, '',
  `**Permanent configuration (values ${CLASH_VALUES.version}, owner approval 2026-10-21):** duration \`${CLASH_VALUES.duration.default}\`, swap cost \`${CLASH_VALUES.experiments.swapCost.default}\`, ${APPROVED_PATCHES.length} move patches (the Final preset's ${FINAL_PATCHES.length} plus ${OWNER_ADDED.join(' and ')}) and the Terrabull card correction, all copied into \`src/data/clash-moves.js\` and \`src/clash/values.js\`. \`battleConfig({})\` is the permanent game; it lists no patch and no experiment.`, '',
  `**Declined:** ${DECLINED_PATCHES.join(', ')} (and its proposed validation exception, which was removed). **Every other patch is an inactive Lab experiment** and never part of the permanent game.`, '',
  '**Historical:** every gate below was measured on the values 1.0.0 game. `gateConfig(gate)` replays it under the frozen `v1.0.0` ruleset (`src/data/clash-moves-v1.0.0.js`, Model F and action-cost swaps unless the gate set them), so earlier reports keep their meaning. "Current" values in the tables are the values 1.0.0 ones the gates started from.', '');
lines.push('## Configurations', '', '| Gate | Ruleset | Duration | Swap cost | Patches | Reproduce |', '|---|---|---|---|---|---|', `| **Permanent (values ${CLASH_VALUES.version})** | current | ${CLASH_VALUES.duration.default} | ${CLASH_VALUES.experiments.swapCost.default} | 0 listed (15 in the table) | \`battleConfig({})\` |`);
for (const g of Object.keys(GATE_PATCHES)) { const c = gateConfig(g); lines.push(`| ${g} | ${c.ruleset} | ${c.duration} | ${c.swapCost} | ${c.patches.length} | \`gateConfig('${g}')\` |`); }
lines.push('', '**Engine correction (values 1.1.0 ruleset only):** a Magma Crust or thorns knockout of the attacker is recorded once, right after the blow that broke the shield; the attacker does nothing more and its replacement steps up before the opponent acts. The values 1.0.0 ruleset (every gate below) keeps the historical behaviour.');
lines.push('', 'Every gate also uses the defaults: back row E, Shock 40-45% every second strike, sudden death E from 12 (1-3 per side) / F (4-5), forced swap every 3 exchanges, voluntary every 4, O1-O3 off.', '');
lines.push('## Changes', '', '| # | Gate | Kind | Target | Move / mechanic | Values 1.0.0 | Proposed | Exact values: 1.0.0 → proposed | Switch | Depends on | Tests | Status |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
MANIFEST.forEach((e, i) => {
  const d = describeEntry(e);
  if (e.kind === 'config') lines.push(`| ${i + 1} | ${e.gate} | config | ${e.target} | ${e.mechanic} | ${d.current} | ${d.proposed} | — | ${J(e.key)} | ${e.deps.join('; ') || '—'} | ${e.tests.join('; ')} | ${e.status} |`);
  else lines.push(`| ${i + 1} | ${e.gate} | ${e.kind === 'rule' ? 'rule correction' : 'move patch'} | ${name[e.target]} (${e.target}) | ${d.move} | ${d.currentText} | ${d.proposedText}${e.note ? ` (${e.note})` : ''} | ${J(d.current)} → ${J(d.proposed)} | ${J(e.key)} | ${e.deps.join('; ') || '—'} | ${e.tests.join('; ')} | ${e.status} |`);
});
const VERDICT = { recommend: 'Recommended', keep: 'Optional: keep (in Final)', drop: 'Optional: drop (not in Final)', not: 'Not recommended' };
lines.push('', '## Final implementation review and owner decision', '', `The review recommended \`gateConfig('Final')\` (C6, half-cost swaps, ${FINAL_PATCHES.length} patches). The owner approved it plus ${OWNER_ADDED.join(' and ')}, declined the Noctlet exception, and left every other item unapproved.`, '',
  '| Item | Gate | Review verdict | Basis | Reason | Card text | Owner decision |', '|---|---|---|---|---|---|---|');
const DEC = { implemented: '**Implemented (1.1.0)**', declined: 'Declined', 'not approved': 'Not approved (inactive Lab experiment)' };
for (const e of [...MANIFEST, ...ALTERNATES]) { const r = REVIEW[e.id]; lines.push(`| \`${e.id}\` | ${e.gate} | ${VERDICT[r.verdict]} | ${r.basis} | ${r.reason.replace(/\|/g, '/')} | ${r.cardText || '—'} | ${DEC[decisionOf(e.id)]} |`); }
lines.push('', '**Card text corrections (no mechanic change), implemented in values 1.1.0:**', '');
for (const [sp, t] of Object.entries(TEXT_CORRECTIONS)) lines.push(`- \`${sp}\`: "${t.text}" (${t.reason}); the permanent card reads "${CLASH_MOVES[sp].text}"`);
lines.push('', '**Validation:** no exceptions. `validateMoves` takes no exception option; a move that always strikes first fails it, and `battleConfig` refuses a declined patch outside the values 1.0.0 ruleset (history replay only).');
lines.push('', '## Engine hooks', '', 'Each hook is inert unless a move carries its key. "Permanent" marks hooks a move in the permanent table uses; the rest serve only inactive Lab experiments and historical replays.', '', '| Key | Gate | Used by the permanent table | Meaning |', '|---|---|---|---|');
const usesKey = (k) => Object.values(CLASH_MOVES).some((m) => k.replace(/\(.*?\)/g, '').split(/[,/]\s*/).some((kk) => { const w = kk.trim().split(' '); if (w[0] === 'swapKind') return m.swapKind === w[1]; const [a, b] = w[0].split('.'); return b ? m[a] && typeof m[a] === 'object' && b in m[a] : a in m || m.trigger?.kind === a; }));
for (const h of ENGINE_HOOKS) lines.push(`| \`${h.key}\` | ${h.gate} | ${usesKey(h.key) ? 'Permanent' : 'Lab only'} | ${h.meaning} |`);
lines.push('');
const md = lines.join('\n');
if (args.out) { fs.writeFileSync(String(args.out), md); console.log(`wrote ${args.out} (${MANIFEST.length} entries)`); } else console.log(md);
