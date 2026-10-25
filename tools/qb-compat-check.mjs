#!/usr/bin/env node
// Save compatibility for the QB Intelligence update (GDD §53.11), on disposable saves, against the previous build (--old=DIR):
//   1. The OLD build plays a franchise to week 4 and exports. This build opens it byte-identical and plays the rest of the season
//      and the next one with the new quarterback logic: no invariant problems, the season finishes, the save round-trips.
//   2. The new optional setting (settings.qbReads) round-trips, and the OLD build keeps it when it opens this build's save.
//   node tools/qb-compat-check.mjs --old=DIR
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const OLD = path.resolve(args.old); const problems = []; const check = (c, m) => { if (!c) problems.push(m); return !!c; };
const oSoak = await import(path.join(OLD, 'tools/franchise-soak.mjs')); const oSave = await import(path.join(OLD, 'src/franchise/save.js')); const oF = await import(path.join(OLD, 'src/franchise/franchise.js'));
const oldVer = (await import(path.join(OLD, 'src/version.js'))).BUILD.version;
const Save = await import('../src/franchise/save.js'); const F = await import('../src/franchise/franchise.js'); const soak = await import('./franchise-soak.mjs');
const o = oSoak.runFranchise(21, { seasons: 1, stopWeek: 4 }).f; const text = oSave.exportJson(o);
const h = Save.importJson(text); check(JSON.stringify(h) === JSON.stringify(oSave.importJson(text)), 'this build opens the old save byte-identical');
let guard = 0, weeks = 0; const y0 = h.season.year;
while (h.season.year === y0 && guard++ < 80) { if (h.season.finished) { F.endSeason?.(h); F.startNextSeason?.(h); break; } if (F.inPlayoffs(h) && !F.playoffFixture(h)) { F.skipPlayoffs(h); continue; } if (h.week.commissioner) break; let n = 0; while (h.season.day < 6 && n++ < 10) { if (!F.autoRunToSunday(h).ok) break; } if (F.isBye(h)) F.takeBye(h); else F.finishSunday(h, F.simulatePlayerGame(h)); weeks++; }
const inv = (soak.invariants || (() => []))(h, 'after'); check(inv.length === 0, `invariants: ${inv.slice(0, 3).join('; ')}`);
check(weeks >= 5, `played on (${weeks} weeks)`);
h.settings.qbReads = true; const t2 = Save.exportJson(h); check(Save.importJson(t2).settings.qbReads === true, 'the new setting round-trips');
const back = oSave.importJson(t2); check(back.settings.qbReads === true, 'the old build keeps the new setting');
console.log(JSON.stringify({ old: oldVer, weeksPlayed: weeks, year: h.season.year, problems }, null, 1)); console.log(problems.length ? 'QB COMPAT CHECK FAILED' : 'QB COMPAT CHECK PASSED'); process.exit(problems.length ? 1 : 0);
