#!/usr/bin/env node
// Positional leverage study (Task 5): how much does one extra point of overall at a starting slot move the score?
// Paired design with the game's own engine: the same generated teams and the same game seed, once as generated and once with
// the starters of ONE position group raised by +BUMP in every attribute. Result: mean points of margin per +1 overall of ONE
// starter at that group, relative to the average slot. Used to ground the positional weights in trade valuation (src/franchise/trade-value.js);
// it changes nothing in the game. Usage: node tools/position-leverage.mjs --games=300 --bump=8 [--json=FILE]
import fs from 'node:fs';
import { generatedTeam, buildDepthChart, GROUP_SLOTS } from '../src/franchise/roster.js';
import { playGame } from '../src/sim/game-runner.js';
import { monsterOverall } from '../src/data/monsters.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const G = Number(args.games || 200), BUMP = Number(args.bump || 8), QUALITY = Number(args.quality || 62);
// The team object copies its players when it is built, so the bump is applied to the roster before that (generatedTeam's afterRoster hook).
let lastGain = 0;
const bumpGroup = (group) => (roster) => { const chart = buildDepthChart(roster); const ids = GROUP_SLOTS[group].map((sl) => chart[sl]).filter(Boolean); let d = 0, n = 0;
  for (const m of roster) if (ids.includes(m.id)) { const before = monsterOverall(m); for (const k of Object.keys(m.attributes)) m.attributes[k] = Math.min(99, m.attributes[k] + BUMP); d += monsterOverall(m) - before; n++; }
  lastGain = n ? d / n : 0; return roster; };
const START = Number(args.start || 1); let sums = {}; // accumulated so ranges can run in parallel and be merged (tools/position-leverage.mjs --start=1 --games=200, then --start=201)
const mk = (s, id, afterRoster = null) => generatedTeam(s, { id, name: id, quality: QUALITY, afterRoster });
if (args.merge) { for (const file of args.merge.split(',')) for (const [g, v] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')))) { const t = (sums[g] ||= { diff: 0, diff2: 0, wins: 0, gain: 0, n: 0 }); for (const k of Object.keys(t)) t[k] += v[k]; } }
for (let i = START; i < START + (args.merge ? 0 : G); i++) {
  const base = playGame({ home: mk(500 + i, 'h'), away: mk(700 + i, 'a'), seed: 900 + i, quarterLength: 180 }); const b = base.score.home - base.score.away;
  for (const group of Object.keys(GROUP_SLOTS)) {
    const home = mk(500 + i, 'h', bumpGroup(group)); const gain = lastGain;
    const up = playGame({ home, away: mk(700 + i, 'a'), seed: 900 + i, quarterLength: 180 }); const u = up.score.home - up.score.away;
    const s = (sums[group] ||= { diff: 0, diff2: 0, wins: 0, gain: 0, n: 0 }); s.diff += u - b; s.diff2 += (u - b) ** 2; s.wins += (u > 0) - (b > 0); s.gain += gain; s.n++;
  }
}
if (args.raw) { fs.writeFileSync(args.raw, JSON.stringify(sums)); process.exit(0); }
const rows = {};
for (const [group, s] of Object.entries(sums)) { const slots = GROUP_SLOTS[group].length, gain = s.gain / s.n, m = s.diff / s.n, sd = Math.sqrt(Math.max(0, s.diff2 / s.n - m * m));
  rows[group] = { slots, games: s.n, bump: BUMP, ovrGain: +gain.toFixed(2), marginPerGroup: +m.toFixed(3), se: +(sd / Math.sqrt(s.n)).toFixed(3), winPctPerGroup: +((s.wins / s.n) * 100).toFixed(2), marginPerOvrPerSlot: +(m / (gain * slots)).toFixed(4) }; }
const mean = Object.values(rows).reduce((s, r) => s + r.marginPerOvrPerSlot * r.slots, 0) / Object.values(rows).reduce((s, r) => s + r.slots, 0);
for (const r of Object.values(rows)) r.relative = +(r.marginPerOvrPerSlot / mean).toFixed(2);
console.log(JSON.stringify(rows, null, 1)); if (args.json) fs.writeFileSync(args.json, JSON.stringify(rows, null, 1));
