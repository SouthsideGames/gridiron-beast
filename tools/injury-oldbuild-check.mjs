#!/usr/bin/env node
// Older-build round trip for Injury History (GDD §50): the previous build (--old=DIR, e.g. a worktree of v42.2.1) loads a save
// that carries `f.injuryHistory`, plays a week with its own code and saves; the field must come back byte-identical. This build
// then opens that save and plays on: the record stays valid and keeps counting.
//   node tools/injury-oldbuild-check.mjs --old=DIR --save=EXPORT.json
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const OLD = path.resolve(args.old); const problems = []; const check = (c, m) => { if (!c) problems.push(m); return c; };
const oldSave = await import(path.join(OLD, 'src/franchise/save.js')); const oldF = await import(path.join(OLD, 'src/franchise/franchise.js'));
const oldVer = (await import(path.join(OLD, 'src/version.js'))).BUILD.version;
const f = oldSave.importJson(fs.readFileSync(args.save, 'utf8')); check(f?.injuryHistory, `the old build (${oldVer}) keeps the field on load`);
const before = JSON.stringify(f.injuryHistory);
const week = (F, g) => { let n = 0; while (g.season.day < 6 && n++ < 10) { if (!F.autoRunToSunday(g).ok) break; } if (F.isBye(g)) F.takeBye(g); else F.finishSunday(g, F.simulatePlayerGame(g)); };
week(oldF, f); const exported = oldSave.exportJson(f);
check(JSON.stringify(oldSave.importJson(exported).injuryHistory) === before, 'after a week played and saved by the old build, the field is byte-identical');
const Save = await import('../src/franchise/save.js'); const F = await import('../src/franchise/franchise.js'); const IH = await import('../src/franchise/injury-history.js');
const h = Save.importJson(exported); check(JSON.stringify(h.injuryHistory) === before, 'this build opens it untouched');
const n0 = Object.values(h.injuryHistory.opp).reduce((a, b) => a + b, 0); week(F, h); week(F, h);
check(Object.values(h.injuryHistory.opp).reduce((a, b) => a + b, 0) > n0, 'this build keeps counting'); check(IH.injuryProblems(h).length === 0, `valid record: ${IH.injuryProblems(h).join('; ')}`);
console.log(JSON.stringify({ old: oldVer, problems }, null, 1)); console.log(problems.length ? 'INJURY OLD-BUILD ROUND TRIP FAILED' : 'INJURY OLD-BUILD ROUND TRIP PASSED'); process.exit(problems.length ? 1 : 0);
