#!/usr/bin/env node
// Older-build round trip for Captain Partnerships (GDD §27.4B, stop condition "older builds discard partnership data").
//   git worktree add /tmp/gb-v42.1 606bd62   (v42.1.0, the build before this feature)
//   node tools/partnerships-oldbuild-check.mjs --old=/tmp/gb-v42.1 --save=season.json
// 1. The OLD build loads a save that carries `f.partnerships`, plays a full week with its own code, exports and reloads it:
//    the field must come back byte-identical (the old build neither reads nor drops it).
// 2. THIS build then opens the old build's save: no fabricated chemistry for the week the old build played (nothing to
//    commit), captains still locked, and the next week commits normally.
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args.old || !args.save) { console.log('--old=DIR (a v42.1.0 checkout) and --save=EXPORT.json are required'); process.exit(2); }
const OLD = path.resolve(args.old); const NEW = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const problems = []; const check = (c, m) => { if (!c) problems.push(m); return c; };
const oldSave = await import(path.join(OLD, 'src/franchise/save.js')); const oldF = await import(path.join(OLD, 'src/franchise/franchise.js'));
const oldVer = (await import(path.join(OLD, 'src/version.js'))).BUILD.version;
const text = fs.readFileSync(args.save, 'utf8');
const f = oldSave.importJson(text); check(f && f.partnerships, `the old build (${oldVer}) imports the save and keeps the field on load`);
const before = JSON.stringify(f.partnerships);
let g = 0; while (f.season.day < 6 && g++ < 10) { if (!oldF.autoRunToSunday(f).ok) break; }
if (oldF.isBye(f)) oldF.takeBye(f); else oldF.finishSunday(f, oldF.simulatePlayerGame(f));
const exported = oldSave.exportJson(f); const back = oldSave.importJson(exported);
check(JSON.stringify(back.partnerships) === before, 'after a week played and saved by the old build, the field is byte-identical');
const newSave = await import(path.join(NEW, 'src/franchise/save.js')); const newF = await import(path.join(NEW, 'src/franchise/franchise.js')); const CP = await import(path.join(NEW, 'src/franchise/partnerships.js'));
const h = newSave.importJson(exported); check(JSON.stringify(h.partnerships) === before, 'this build opens the old build\'s save with the field untouched (nothing fabricated for the old build\'s week)');
const capsBefore = JSON.stringify(CP.captainsOf(h, h.club));
const total = (x) => Object.values(x.partnerships.pairs).reduce((a, r) => a + r.n, 0); const t0 = total(h);
g = 0; while (h.season.day < 6 && g++ < 10) { if (!newF.autoRunToSunday(h).ok) break; }
if (newF.isBye(h)) newF.takeBye(h); else newF.finishSunday(h, newF.simulatePlayerGame(h));
check(JSON.stringify(CP.captainsOf(h, h.club)) === capsBefore, 'captains stay locked');
check(total(h) > t0, 'the next week under this build earns chemistry again');
check(CP.partnershipProblems(h).length === 0, `valid partnership state: ${CP.partnershipProblems(h).join('; ')}`);
console.log(JSON.stringify({ old: oldVer, fieldKept: !problems.length, chemistryBefore: t0, after: total(h), problems }, null, 1));
console.log(problems.length ? 'OLD-BUILD ROUND TRIP FAILED' : 'OLD-BUILD ROUND TRIP PASSED');
process.exit(problems.length ? 1 : 0);
