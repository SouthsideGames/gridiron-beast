#!/usr/bin/env node
// Beast Clash Level 1 new-monster check (GDD §25.6). Usage:
//   npm run clash:level1 -- --species=<id> [--patch=<movePatch id>] [--gate=defaults|Gate B|B.5|Final] [--n=24]
// Fails (exit 1) only on invalid states, determinism breaks or a move that never fires; win rates are information.
import { level1Check } from '../src/clash/level1.js';
import { gateConfig } from '../src/clash/balance-manifest.js';
import { validateMoves } from '../src/clash/validate.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args.species) { console.error('Pass --species=<id>'); process.exit(2); }
const gate = String(args.gate || 'defaults'); const config = gate === 'defaults' ? {} : gateConfig(gate);
const t0 = Date.now();
const r = level1Check({ species: String(args.species), config, patch: args.patch ? String(args.patch) : null, n: Number(args.n || 24) });
const card = validateMoves().filter((x) => x.startsWith(`${r.species}:`));
console.log(`Level 1 · ${r.species} · ${r.move}${r.patch ? ` (patch ${r.patch})` : ''} · rules: ${gate} · ${r.battles} battles · ${Date.now() - t0} ms`);
console.log(`Card: ${r.text}`);
console.log(`Card and registry validation: ${card.length ? card.join('; ') : 'pass'}`);
console.log(`Ability fired: ${r.fires} times (3v3 ${r.firesBy[3]}, 5v5 ${r.firesBy[5]})`);
console.log('Reference matchups (win %, information only):');
for (const m of r.matchups) console.log(`  ${m.size}v${m.size} v ${m.opponent.padEnd(10)} ${String(m.winPct).padStart(5)}%  (n ${m.n}${m.capped ? `, ${m.capped} capped` : ''})`);
console.log(`Flags to look at: ${r.flags.length ? '\n  ' + r.flags.join('\n  ') : 'none'}`);
console.log(`Integrity: ${r.problems.length ? 'FAIL\n  ' + r.problems.slice(0, 20).join('\n  ') : 'pass'}`);
const ok = r.pass && !card.length; console.log(ok ? 'RESULT: PASS' : 'RESULT: FAIL'); process.exit(ok ? 0 : 1);
