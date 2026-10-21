#!/usr/bin/env node
// Prints the Beast Clash balance manifest (src/clash/balance-manifest.js) as Markdown, with current and proposed values read from
// the data. Usage: node tools/clash-manifest.mjs [--out=BEAST_CLASH_BALANCE_MANIFEST.md]. Nothing here changes a default.
import fs from 'node:fs';
import { MANIFEST, ENGINE_HOOKS, GATE_PATCHES, gateConfig, describeEntry } from '../src/clash/balance-manifest.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { CLASH_VALUES } from '../src/clash/values.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const name = Object.fromEntries(SPECIES_DEX.map((s) => [s.id, s.name]));
const J = (o) => '`' + JSON.stringify(o).replace(/\|/g, '\\|') + '`';
const lines = [];
lines.push('# Beast Clash balance manifest (Gates B.2-B.5)', '', `Generated from \`src/clash/balance-manifest.js\` by \`node tools/clash-manifest.mjs\`. Values version ${CLASH_VALUES.version}, engine ${CLASH_VALUES.engineVersion}.`, '',
  '**Nothing in this manifest is live.** Every change is a Lab-only switch until the owner approves permanent implementation. Current values are read from `src/data/clash-moves.js` and `src/clash/values.js`, so this file cannot drift from the code.', '');
lines.push('## Configurations', '', '| Gate | Duration | Swap cost | Patches | Reproduce |', '|---|---|---|---|---|');
for (const g of Object.keys(GATE_PATCHES)) { const c = gateConfig(g); lines.push(`| ${g} | ${c.duration} | ${c.swapCost} | ${c.patches.length} | \`gateConfig('${g}')\` |`); }
lines.push('', 'Every gate also uses the defaults: back row E, Shock 40-45% every second strike, sudden death E from 12 (1-3 per side) / F (4-5), forced swap every 3 exchanges, voluntary every 4, O1-O3 off.', '');
lines.push('## Changes', '', '| # | Gate | Kind | Target | Move / mechanic | Current (default) | Proposed | Exact values: current → proposed | Switch | Depends on | Tests | Status |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
MANIFEST.forEach((e, i) => {
  const d = describeEntry(e);
  if (e.kind === 'config') lines.push(`| ${i + 1} | ${e.gate} | config | ${e.target} | ${e.mechanic} | ${d.current} | ${d.proposed} | — | ${J(e.key)} | ${e.deps.join('; ') || '—'} | ${e.tests.join('; ')} | ${e.status} |`);
  else lines.push(`| ${i + 1} | ${e.gate} | ${e.kind === 'rule' ? 'rule correction' : 'move patch'} | ${name[e.target]} (${e.target}) | ${d.move} | ${d.currentText} | ${d.proposedText}${e.note ? ` (${e.note})` : ''} | ${J(d.current)} → ${J(d.proposed)} | ${J(e.key)} | ${e.deps.join('; ') || '—'} | ${e.tests.join('; ')} | ${e.status} |`);
});
lines.push('', '## Engine hooks', '', 'Each hook is inert unless a move carries its key; the Gate A golden fixture replays unchanged.', '', '| Key | Gate | Meaning |', '|---|---|---|');
for (const h of ENGINE_HOOKS) lines.push(`| \`${h.key}\` | ${h.gate} | ${h.meaning} |`);
lines.push('');
const md = lines.join('\n');
if (args.out) { fs.writeFileSync(String(args.out), md); console.log(`wrote ${args.out} (${MANIFEST.length} entries)`); } else console.log(md);
