#!/usr/bin/env node
// Balance audit R-2 / R-17 (2026-11-25): what ONE attribute is worth at each position, in full games. The same design as
// tools/position-leverage.mjs (paired: the same generated clubs and game seed, once as generated and once with the starters of one
// position group raised), but only `--attr` is raised, by `--bump`. Reports the margin per game per group, its standard error, and
// the overall the bump bought under the current position weights (what a club pays for it in salary). A position where an
// attribute buys much margin for little overall is where that attribute is underpriced. Measurement only.
//   node tools/balance-audit/attr-leverage.mjs --attr=speed [--bump=12] [--games=120] [--json=FILE]
import fs from 'node:fs';
import { generatedTeam, buildDepthChart, GROUP_SLOTS } from '../../src/franchise/roster.js';
import { playGame } from '../../src/sim/game-runner.js';
import { monsterOverall } from '../../src/data/monsters.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const G = Number(args.games || 120), BUMP = Number(args.bump || 12), ATTR = String(args.attr || 'speed'), QUALITY = Number(args.quality || 62);
const groups = args.groups ? String(args.groups).split(',') : Object.keys(GROUP_SLOTS).filter((g) => g !== 'K');
let lastGain = 0;
const bump = (group) => (roster) => { const chart = buildDepthChart(roster); const ids = GROUP_SLOTS[group].map((sl) => chart[sl]).filter(Boolean); let d = 0, n = 0;
  for (const m of roster) if (ids.includes(m.id)) { const before = monsterOverall(m); m.attributes[ATTR] = Math.min(99, (m.attributes[ATTR] || 1) + BUMP); d += monsterOverall(m) - before; n++; }
  lastGain = n ? d / n : 0; return roster; };
const mk = (s, id, afterRoster = null) => generatedTeam(s, { id, name: id, quality: QUALITY, afterRoster });
const sums = {};
for (let i = 1; i <= G; i++) {
  const base = playGame({ home: mk(500 + i, 'h'), away: mk(700 + i, 'a'), seed: 900 + i, quarterLength: 180 }); const b = base.score.home - base.score.away;
  for (const group of groups) {
    const home = mk(500 + i, 'h', bump(group)); const gain = lastGain;
    const up = playGame({ home, away: mk(700 + i, 'a'), seed: 900 + i, quarterLength: 180 }); const u = up.score.home - up.score.away;
    const s = (sums[group] ||= { diff: 0, diff2: 0, gain: 0, n: 0 }); s.diff += u - b; s.diff2 += (u - b) ** 2; s.gain += gain; s.n++;
  }
}
const rows = {};
for (const [group, s] of Object.entries(sums)) { const m = s.diff / s.n, sd = Math.sqrt(Math.max(0, s.diff2 / s.n - m * m)); rows[group] = { attr: ATTR, bump: BUMP, games: s.n, slots: GROUP_SLOTS[group].length, marginPerGroup: +m.toFixed(3), se: +(sd / Math.sqrt(s.n)).toFixed(3), ovrGainPerStarter: +(s.gain / s.n).toFixed(2), marginPerOvr: s.gain ? +(m / (s.gain / s.n * GROUP_SLOTS[group].length)).toFixed(3) : null }; }
console.log(JSON.stringify(rows, null, 1)); if (args.json) fs.writeFileSync(String(args.json), JSON.stringify({ tool: 'balance-audit/attr-leverage', args: { attr: ATTR, bump: BUMP, games: G, quality: QUALITY }, rows }, null, 1));
