#!/usr/bin/env node
// Captain Partnerships study (GDD §27.4B): multi-season league simulations with the real feature on, all 16 clubs.
//   node tools/partnership-study.mjs --seed=1 [--seasons=4] [--json=OUT]
// A. Progression: every captain pair's lifetime count at each season's end (all clubs), so the seasons each pairing type takes
//    to reach every level can be read off, per pair, from real league play (owner and AI alike).
// B. Balance: at the start of the following season, every club with its real captains and real chemistry plays every other
//    club once, twice over: with the partnerships as they stand, and with every level forced to 0 (which is the game without
//    chemistry, proven byte-identical in tests/partnership-play.test.js). Same teams, same seeds; only the bonus differs.
import fs from 'node:fs';
import { runFranchise } from './franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';
import * as CP from '../src/franchise/partnerships.js';
import { playGame } from '../src/sim/game-runner.js';
import { teamOverall } from '../src/franchise/roster.js';
import { createRng } from '../src/core/rng.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SEED = Number(args.seed || 1), SEASONS = Number(args.seasons || 4);
const snaps = []; // { year, pairs: { key: { type, n, seasons } } }
const { f, problems } = runFranchise(SEED, { seasons: SEASONS, difficulty: 'pro', onSeason: (g) => snaps.push({ year: g.season.year, pairs: Object.fromEntries(Object.entries(g.partnerships?.pairs || {}).map(([k, r]) => [k, { type: r.type, n: r.n, seasons: r.seasons.map((s) => s.y) }])) }) });
// A. per pair: seasons as captains when each level was first reached (seasons counted from its first captaincy)
const reach = []; const keys = new Set(snaps.flatMap((s) => Object.keys(s.pairs)));
for (const k of keys) {
  const hist = snaps.filter((s) => s.pairs[k]); if (!hist.length) continue; const first = hist[0].pairs[k].seasons[0];
  const type = hist[hist.length - 1].pairs[k].type; const lv = {};
  for (const s of hist) { const l = CP.levelOf(type, s.pairs[k].n); for (let i = 1; i <= l; i++) if (lv[i] == null) lv[i] = s.year - first + 1; }
  const captained = new Set(hist[hist.length - 1].pairs[k].seasons).size;
  reach.push({ type, first, captained, n: hist[hist.length - 1].pairs[k].n, lv });
}
// B. balance at the next season's start
const g = JSON.parse(JSON.stringify(f)); const st = F.startNextSeason(g); if (!st.ok) throw new Error(st.reason);
const clubs = Object.keys(g.season.records);
const team = (c, zero) => { const t = c === g.club ? F.playerTeam(g) : F.aiTeam(g, c); const p = CP.kickoffPartnership(g, c); if (p) t.partnership = zero ? { offense: p.offense && { ...p.offense, level: 0 }, defense: p.defense && { ...p.defense, level: 0 } } : p; return t; };
const ovr = Object.fromEntries(clubs.map((c) => [c, teamOverall(c === g.club ? F.playerTeam(g) : F.aiTeam(g, c))]));
const lvl = Object.fromEntries(clubs.map((c) => { const p = CP.kickoffPartnership(g, c); return [c, (p?.offense?.level || 0) + (p?.defense?.level || 0)]; }));
const games = []; const rng = createRng(SEED * 104729);
for (let i = 0; i < clubs.length; i++) for (let j = i + 1; j < clubs.length; j++) {
  const seed = rng.int(1e9); const [h, a] = [clubs[i], clubs[j]];
  const on = playGame({ home: team(h, false), away: team(a, false), seed, quarterLength: 180 });
  const off = playGame({ home: team(h, true), away: team(a, true), seed, quarterLength: 180 });
  games.push({ h, a, ovrDiff: ovr[h] - ovr[a], lvlDiff: lvl[h] - lvl[a], on: on.score.home - on.score.away, off: off.score.home - off.score.away });
}
const out = { seed: SEED, seasons: SEASONS, problems: problems.length, reach, games, levels: lvl, ovr };
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out)); else console.log(JSON.stringify(out).slice(0, 2000));
