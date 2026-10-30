#!/usr/bin/env node
// Task 6 Phase A-1: old-save transition check (GDD §55.4; approved target: peak offseason retirements ≤ 2.5 × the steady rate, no
// lasting difference). Old saves are made by a pre-A-1 tree (tools/task6/make-old-save.mjs: the old ageing, no retirement), then
// loaded into this tree and played forward twice: with the transition (as a real old save meets it) and without it (the rules
// at once, `aging.native`), for comparison. Records every offseason's retirements, starter age and team strength.
//   node tools/task6-transition-check.mjs --old=OLD_TREE [--seeds=106-108] [--oldSeasons=15] [--newSeasons=8] [--json=out.json] [--keep=DIR]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import * as Save from '../src/franchise/save.js';
import * as R from '../src/franchise/league-registry.js';
import { monsterOverall } from '../src/data/monsters.js';
import { GROUP_SLOTS } from '../src/franchise/roster.js';
import { runFranchise } from './franchise-soak.mjs';
import { leagueInvariants, withBoardReset } from './league-soak.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const HERE = path.dirname(new URL(import.meta.url).pathname);
const [s0, s1] = String(args.seeds || '106-108').split('-').map(Number); const seeds = []; for (let s = s0; s <= (s1 || s0); s++) seeds.push(s);
const oldSeasons = Number(args.oldSeasons || 15), newSeasons = Number(args.newSeasons || 8);
const keep = args.keep || fs.mkdtempSync('/tmp/t6-old-'); fs.mkdirSync(keep, { recursive: true });
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null); const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const out = { old: args.old, oldSeasons, newSeasons, seeds: [], summary: null };

function starters(f) { const st = []; for (const c of R.leagueClubs(f)) { const r = R.clubRoster(f, c); for (const p of Object.keys(GROUP_SLOTS)) for (const m of r.filter((x) => x.position === p).sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, GROUP_SLOTS[p].length)) if (!R.isProtected(m)) st.push(m); } return st; }
for (const seed of seeds) {
  const file = path.join(keep, `old-${seed}-${oldSeasons}.json`);
  if (!fs.existsSync(file)) execFileSync('node', [path.join(HERE, 'task6/make-old-save.mjs'), `--root=${args.old}`, `--seed=${seed}`, `--seasons=${oldSeasons}`, `--out=${file}`], { stdio: 'inherit' });
  const text = fs.readFileSync(file, 'utf8'); const rec = { seed, variants: {} };
  { const f0 = Save.importJson(text); const st = starters(f0); rec.atLoad = { year: f0.season.year, starterAge: r1(mean(st.map((m) => m.age))), starters33Pct: r1(100 * st.filter((m) => m.age >= 33).length / st.length) }; }
  for (const variant of ['transition', 'none']) {
    const f = Save.importJson(text); if (!f) throw new Error('import failed');
    if (variant === 'none') f.aging = { v: 1, native: true };
    const rows = [];
    const { problems } = runFranchise(seed, { from: f, seasons: newSeasons, check: withBoardReset(leagueInvariants), onSeason: (g) => { const L = g.retirementsLast || {}; const st = starters(g); rows.push({ year: g.season.year, s: L.transition ?? null, retired: (L.league || 0) + (L.owner?.length || 0) + (L.unsigned || 0), aiRetired: L.league || 0, starterAge: r1(mean(st.map((m) => m.age))), starters33Pct: r1(100 * st.filter((m) => m.age >= 33).length / st.length), starterOvr: r1(mean(st.map(monsterOverall))) }); } });
    const ai = rows.map((x) => x.aiRetired); const steady = mean(ai.slice(4)); const peak = Math.max(...ai.slice(0, 4));
    rec.variants[variant] = { rows, problems: problems.length, problemSample: problems.slice(0, 3), peakFirst4: peak, steadyLater: r1(steady), peakRatio: steady ? r1(peak / steady) : null };
    console.error(`seed ${seed} ${variant}: AI retirements ${ai.join(', ')} | peak ${peak} / steady ${r1(steady)} | problems ${problems.length}`);
  }
  out.seeds.push(rec);
}
const T = out.seeds.map((x) => x.variants.transition), N = out.seeds.map((x) => x.variants.none);
const lastRow = (v) => v.rows[v.rows.length - 1];
out.summary = { peakRatioTransition: out.seeds.map((x) => x.variants.transition.peakRatio), peakRatioNone: out.seeds.map((x) => x.variants.none.peakRatio), firstOffseasonTransition: T.map((v) => v.rows[0].aiRetired), firstOffseasonNone: N.map((v) => v.rows[0].aiRetired),
  finalStarterAgeTransition: T.map((v) => lastRow(v).starterAge), finalStarterAgeNone: N.map((v) => lastRow(v).starterAge), finalStarterOvrTransition: T.map((v) => lastRow(v).starterOvr), finalStarterOvrNone: N.map((v) => lastRow(v).starterOvr), problems: T.concat(N).reduce((s, v) => s + v.problems, 0) };
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.summary, null, 1));
