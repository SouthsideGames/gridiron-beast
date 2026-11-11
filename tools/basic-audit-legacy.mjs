#!/usr/bin/env node
// Duplicate and exposure audit on the game's CURRENT generator (Basic creation brief, "Duplicate and long-career audit").
// LEGACY GENERATION: this branch still generates monsters with the pre-Task 8 model (position template + quality + type bias +
// Nature, one scalar potential, no Temper, no Apex) and the Basic families are not in the game, so this run measures repetition among
// the 72 original species only. It validates nothing about the approved Task 8 model; see basic-audit-reference.mjs for that.
//
//   node tools/basic-audit-legacy.mjs --seed=11 --seasons=20 [--difficulty=pro] --out=path.json
//
// One hands-off franchise (tools/franchise-soak.mjs runFranchise; difficulty pro unless given) is played for the given seasons. Recorded, each the
// first time an individual appears (its creation profile, before any development):
//   draft   every prospect in each season's draft class (all of them are offered to the player)
//   scout   every prospect in a weekly scouting report (f.week.prospects, generated fresh when the staff scouts)
//   ai      every monster on an AI club's roster (the league registry), unseen by the player unless he looks
import { writeFileSync } from 'node:fs';
import { runFranchise, newFranchise } from './franchise-soak.mjs';
import { POSITION_WEIGHTS, ATTRIBUTES } from '../src/data/personnel.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const seed = Number(args.seed || 11), seasons = Number(args.seasons || 20), difficulty = args.difficulty || 'pro', out = args.out || `basic-audit-legacy-${seed}.json`;
const seen = { draft: new Map(), scout: new Map(), ai: new Map() };
const profile = (m, season, channel) => ({ id: m.id, species: m.species, position: m.position, attributes: ATTRIBUTES.map((k) => m.attributes[k]), potential: m.potential, nature: m.nature, level: m.level || 1, season, channel });
const note = (channel, m, season) => { if (m && !seen[channel].has(m.id)) seen[channel].set(m.id, profile(m, season, channel)); };
let season = 1;
const t0 = Date.now();
// Scouting reports live only between Monday's scouting and the recruit decision inside autoRunToSunday, so they are recorded when the
// game assigns f.week.prospects (a diagnostic property trap on this one franchise object; the game code is not changed).
const f0 = newFranchise(seed, { difficulty });
const trapWeek = (w) => (w && typeof w === 'object' ? new Proxy(w, { set(t, k, v) { if (k === 'prospects') for (const p of v || []) if (!p.fromPool && !p.legend) note('scout', p.monster, season); t[k] = v; return true; } }) : w);
let week = trapWeek(f0.week);
Object.defineProperty(f0, 'week', { get: () => week, set: (w) => { week = trapWeek(w); }, enumerable: true, configurable: true });
const { problems, log } = runFranchise(seed, {
  difficulty, seasons, from: f0,
  onOffseason(f) { for (const m of f.draft?.class || []) note('draft', m, season); },
  onSeason(f, s) { for (const m of Object.values(f.league?.monsters || {})) note('ai', m, s); season = s + 1; },
});
const result = { generator: 'LEGACY (pre-Task 8) — Basic families not reachable', seed, seasons, played: log.seasons.length, fired: log.fired, problems: problems.length, ms: Date.now() - t0,
  frozen: { difficulty, owner: 'tools/franchise-soak.mjs hands-off owner (staff scouts weekly, best visible prospect drafted, cheapest free agents to the roster minimum)', draftClass: '53 prospects (src/franchise/draft.js CLASS_SHAPE)', scouting: 'one region per week as the staff chooses (franchise.js scoutRegion)', weights: POSITION_WEIGHTS },
  individuals: Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, [...v.values()]])) };
writeFileSync(out, JSON.stringify(result));
console.log(JSON.stringify({ seed, played: result.played, problems: result.problems, draft: seen.draft.size, scout: seen.scout.size, ai: seen.ai.size, s: Math.round(result.ms / 1000) }));
