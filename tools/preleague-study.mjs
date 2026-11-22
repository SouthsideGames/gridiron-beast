#!/usr/bin/env node
// Pre-franchise archive study: is the generated history sound, and does it look like the game's own seasons?
//   node tools/preleague-study.mjs [--seeds=12] [--real=path.json] [--write-real=path.json] [--seasons=3]
// For each seed it creates a franchise, validates its archive (preleague-history.js validateLeagueArchive) and collects every
// archived season line. With --real it prints, per position, the starters' median / 90th percentile / maximum beside the same
// numbers from real simulated seasons. --write-real simulates franchises through full seasons (tools/franchise-soak.mjs) and
// saves every league monster's season lines as that reference (about ten seconds a season).
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import { validateLeagueArchive, ARCHIVE_AWARDS } from '../src/franchise/preleague-history.js';
import { STARTER_CLUBS } from '../src/data/league.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SEEDS = Number(args.seeds || 12);
const q = (a, p) => { a = [...a].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(p * a.length))] : 0; };
const KEYS = { QB: ['att', 'comp', 'passYds', 'passTd', 'intThrown', 'rushYds'], RB: ['rush', 'rushYds', 'rushTd', 'rec', 'recYds'], WR: ['targets', 'rec', 'recYds', 'recTd'], TE: ['targets', 'rec', 'recYds', 'recTd'], OL: ['pbSnaps', 'rbSnaps', 'blocksLost', 'sacksAllowed'], DL: ['tackles', 'assists', 'tfl', 'sacks', 'pressures', 'ff'], LB: ['tackles', 'assists', 'sacks', 'int', 'pd', 'covTargets'], CB: ['tackles', 'int', 'pd', 'covTargets', 'recAllowed', 'ydsAllowed'], S: ['tackles', 'int', 'pd', 'covTargets'], K: ['fga', 'fgm', 'fgLong', 'xpa', 'xpm'] };

if (args['write-real']) {
  const { runFranchise } = await import('./franchise-soak.mjs');
  const lines = [];
  for (let seed = 11; seed < 11 + Math.max(1, Math.min(4, SEEDS)); seed++) {
    const { f } = runFranchise(seed, { seasons: Number(args.seasons || 3) });
    for (const m of [...f.roster, ...Object.values(f.league?.monsters || {})]) for (const s of m.stats?.seasons || []) lines.push({ pos: m.position, reg: s.reg });
  }
  fs.writeFileSync(args['write-real'], JSON.stringify({ lines })); console.log(`wrote ${lines.length} real season lines to ${args['write-real']}`); process.exit(0);
}

const mine = []; let bad = 0; const dyn = { distinct: [], most: [], champWins: [], best: [], postBad: 0 }; const champs = {}; const awardPos = {}; let transfers = 0, careers = 0, sameMvpOpoy = 0, seasons = 0;
for (let seed = 1; seed <= SEEDS; seed++) {
  const club = STARTER_CLUBS[seed % STARTER_CLUBS.length].name;
  const f = F.createFranchise({ owner: { first: 'Study', last: `#${seed}`, background: 'player' }, club, seed });
  const A = f.preLeagueHistory; const errs = validateLeagueArchive(A, { live: [...f.roster, ...Object.values(f.league.monsters)] });
  if (errs.length) { bad++; console.log(`seed ${seed}: ${errs.length} problems`, errs.slice(0, 5)); }
  for (const c of Object.values(A.careers)) { careers++; if (c.transfers) transfers++; for (const b of c.seasons) mine.push({ pos: c.position, reg: b.reg, legend: !!c.retired }); }
  { const t = {}; for (const s of A.seasons) { t[s.champion] = (t[s.champion] || 0) + 1; dyn.champWins.push(s.standings.find((r) => r.club === s.champion).w); dyn.best.push(s.standings[0].w); } dyn.distinct.push(Object.keys(t).length); dyn.most.push(Math.max(...Object.values(t))); }
  for (const s of A.seasons) { seasons++; champs[s.champion] = (champs[s.champion] || 0) + 1; for (const k of ARCHIVE_AWARDS) { const w = s.awards.league[k]; awardPos[`${k}:${w.position}`] = (awardPos[`${k}:${w.position}`] || 0) + 1; } if (s.awards.league.mvp.id === s.awards.league.opoy.id) sameMvpOpoy++; }
}
console.log(`${SEEDS} franchises: ${bad} with problems · ${careers} careers, ${(100 * transfers / careers).toFixed(1)}% changed clubs · MVP is also OPOY in ${sameMvpOpoy}/${seasons} seasons`);
const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
console.log(`per franchise: ${avg(dyn.distinct)} different champions in eight seasons, most titles by one club ${avg(dyn.most)} (max ${Math.max(...dyn.most)}) · champion's wins ${avg(dyn.champWins)}, best record ${avg(dyn.best)} of 9`);
console.log('titles by club:', Object.entries(champs).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c.split(' ')[0]} ${n}`).join(', '));
console.log('award winners by position:', Object.entries(awardPos).sort().map(([k, n]) => `${k} ${n}`).join(', '));
const real = args.real ? JSON.parse(fs.readFileSync(args.real)).lines : null;
const starters = (ls, pos) => ls.filter((l) => l.pos === pos && (l.reg?.starts || 0) >= 6);
for (const [pos, keys] of Object.entries(KEYS)) {
  const a = starters(mine, pos), r = real ? starters(real, pos) : [];
  console.log(`\n${pos}  archive starters ${a.length}${real ? ` · real starters ${r.length}` : ''}   (median / p90 / max)`);
  for (const k of keys) { const v = (ls) => `${q(ls.map((l) => l.reg[k] || 0), 0.5)} / ${q(ls.map((l) => l.reg[k] || 0), 0.9)} / ${Math.max(0, ...ls.map((l) => l.reg[k] || 0))}`; console.log(`  ${k.padEnd(13)} archive ${v(a).padEnd(20)}${real ? ` real ${v(r)}` : ''}`); }
}
process.exit(bad ? 1 : 0);
