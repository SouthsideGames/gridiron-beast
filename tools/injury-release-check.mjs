#!/usr/bin/env node
// v42.3.0 release check for existing franchises (GDD §50.6), on disposable saves only.
//   node tools/injury-release-check.mjs --old=DIR     (DIR = a v42.2.1 checkout, e.g. a worktree at 4d32865)
// 1. The OLD build plays a franchise into its third season (week 5) and exports it: a real v42.2.1 save, injuries and all.
// 2. This build imports it: everything is byte-identical after load and no injury history appears.
// 3. A week is played: tracking begins that week (`since` = season 3, week of play); nothing is dated before it; injuries
//    already in progress are recorded as "before tracking" and are not counted as career injuries; the profile shows the
//    "tracking began in Season 3" note for every veteran.
// 4. Reload after reload adds nothing; the franchise plays on into the next season with a valid record.
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args.old) { console.log('--old=DIR is required'); process.exit(2); }
const OLD = path.resolve(args.old); const problems = []; const check = (c, m) => { if (!c) problems.push(m); return !!c; };
const oldSoak = await import(path.join(OLD, 'tools/franchise-soak.mjs')); const oldSave = await import(path.join(OLD, 'src/franchise/save.js'));
const oldF = await import(path.join(OLD, 'src/franchise/franchise.js')); const oldVer = (await import(path.join(OLD, 'src/version.js'))).BUILD.version;
const o = oldSoak.runFranchise(Number(args.seed || 12), { seasons: 2, difficulty: 'pro' }).f; oldF.startNextSeason(o);
const wk = (F, g) => { let n = 0; while (g.season.day < 6 && n++ < 10) { if (!F.autoRunToSunday(g).ok) break; } if (F.isBye(g)) F.takeBye(g); else F.finishSunday(g, F.simulatePlayerGame(g)); };
while (o.season.week < 5) wk(oldF, o);
const text = oldSave.exportJson(o); const injuredAtUpgrade = [...o.roster].filter((m) => m.injury).length;
const Save = await import('../src/franchise/save.js'); const F = await import('../src/franchise/franchise.js'); const IH = await import('../src/franchise/injury-history.js');
const { careerInjuryHtml } = await import('../src/ui/injury-ui.js'); const { yearOf } = await import('../src/data/calendar.js');
const h = Save.importJson(text);
check(JSON.stringify(Save.importJson(Save.exportJson(h))) === JSON.stringify(oldSave.importJson(text)), 'the save is byte-identical after load in this build');
check(!h.injuryHistory, 'no injury history is created by loading');
const at = { y: h.season.year, w: h.season.week }; wk(F, h);
const H = h.injuryHistory; check(H && H.since.y === at.y && H.since.w === at.w, `tracking begins the week it is first played (${JSON.stringify(H?.since)} vs ${JSON.stringify(at)})`);
const all = Object.entries(H.log).flatMap(([id, l]) => l.map((r) => ({ id, ...r }))).concat(Object.entries(H.open).map(([id, r]) => ({ id, ...r })));
check(all.every((r) => r.y > at.y || (r.y === at.y && r.w >= at.w)), 'nothing is dated before tracking began');
const before = all.filter((r) => r.src === 'before'); check(before.length >= injuredAtUpgrade, `injuries in progress at the upgrade are recorded as before tracking (${before.length} ≥ ${injuredAtUpgrade} on the owner's club)`);
for (const r of before) check(IH.injurySummary(h, r.id).incidents === IH.recordsOf(h, r.id).filter((x) => x.src !== 'before').length, 'before-tracking injuries are not counted');
const vet = h.roster.find((m) => (m.career?.seasons || m.seasonsPlayed || 0) > 0 || h.history) || h.roster[0];
const html = careerInjuryHtml(h, vet.id, { firstSeason: 1 }); check(html.includes(`tracking began in ${yearOf(3)}, week 5`), `the veteran profile shows "Injury history tracking began in ${yearOf(3)}, week 5" (season 3, as the game labels seasons)`);
const snap = JSON.stringify(h.injuryHistory); for (let i = 0; i < 3; i++) { const r = Save.importJson(Save.exportJson(h)); check(JSON.stringify(r.injuryHistory) === snap, 'reload adds nothing'); }
let g = 0; const y0 = h.season.year; while (h.season.year === y0 && g++ < 60) { const st = F.franchiseState ? null : null; if (h.season.phase && h.season.phase !== 'regular' && h.season.phase !== 'playoffs') break; wk(F, h); }
check(IH.injuryProblems(h).length === 0, `valid record: ${IH.injuryProblems(h).join('; ')}`);
console.log(JSON.stringify({ old: oldVer, injuredAtUpgrade, since: H.since, records: all.length, beforeTracking: before.length, problems }, null, 1));
console.log(problems.length ? 'INJURY RELEASE CHECK FAILED' : 'INJURY RELEASE CHECK PASSED'); process.exit(problems.length ? 1 : 0);
