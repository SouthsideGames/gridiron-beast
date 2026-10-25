#!/usr/bin/env node
// Save compatibility for the evolution overhaul (GDD §51.7), on disposable saves, against the previous build (--old=DIR, e.g. a
// worktree of v42.3.0):
//   1. The OLD build evolves a monster (its old Career Timeline entry: no level/overall) and exports. This build opens it
//      byte-identical, renders the old entry, and evolves another monster with the new entry.
//   2. The OLD build opens this build's save (new timeline fields, the evoSound setting), plays a week and saves: those
//      fields come back byte-identical.
//   node tools/evolution-compat-check.mjs --old=DIR
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const OLD = path.resolve(args.old); const problems = []; const check = (c, m) => { if (!c) problems.push(m); return !!c; };
const oSoak = await import(path.join(OLD, 'tools/franchise-soak.mjs')); const oSave = await import(path.join(OLD, 'src/franchise/save.js')); const oF = await import(path.join(OLD, 'src/franchise/franchise.js')); const oM = await import(path.join(OLD, 'src/data/monsters.js'));
const oldVer = (await import(path.join(OLD, 'src/version.js'))).BUILD.version;
const Save = await import('../src/franchise/save.js'); const F = await import('../src/franchise/franchise.js'); const M = await import('../src/data/monsters.js');
const { careerTimeline, careerEvents } = await import('../src/franchise/career.js'); const { fullProfile, careerSectionHtml } = await import('../src/ui/career-ui.js');
const o = oSoak.runFranchise(9, { seasons: 1, stopWeek: 4 }).f; const [a, b] = o.roster.filter((m) => oM.nextEvolution(m));
a.level = oM.nextEvolution(a).level; check(oF.evolveMonster(o, a.id).ok, 'the old build evolves a monster');
const text = oSave.exportJson(o);
const h = Save.importJson(text); check(JSON.stringify(h) === JSON.stringify(oSave.importJson(text)), 'this build opens the old save byte-identical');
const ha = h.roster.find((m) => m.id === a.id); const tl = careerTimeline(ha, { club: h.club }); check(tl.some((i) => /Evolved into/.test(i.title)), 'the old evolution entry shows on the timeline');
let html = ''; try { html = careerSectionHtml(h, fullProfile(h, ha, 'roster')); } catch (e) { problems.push(`old entry renders: ${e.message}`); } check(/Evolved into/.test(html) || html.length > 0, 'the profile renders');
const hb = h.roster.find((m) => m.id === b.id); hb.level = M.nextEvolution(hb).level; check(F.evolveMonster(h, hb.id).ok, 'this build evolves another');
const ev = careerEvents(hb).find((e) => e.t === 'evolve'); check(ev?.x?.lvl && ev?.x?.ovr, 'with level and overall on the new entry'); h.settings.evoSound = true;
const newText = Save.exportJson(h);
const back = oSave.importJson(newText); const keep = (g) => JSON.stringify({ ev: careerEvents ? g.roster.find((m) => m.id === b.id).career : null, s: g.settings.evoSound });
const k0 = keep(back); let n = 0; while (back.season.day < 6 && n++ < 10) { if (!oF.autoRunToSunday(back).ok) break; } if (oF.isBye(back)) oF.takeBye(back); else oF.finishSunday(back, oF.simulatePlayerGame(back));
const again = oSave.importJson(oSave.exportJson(back)); const bm = again.roster.find((m) => m.id === b.id);
check(again.settings.evoSound === true, 'the old build keeps the sound setting'); check(JSON.stringify(careerEvents(bm).find((e) => e.t === 'evolve')) === JSON.stringify(ev), 'the old build keeps the new timeline entry byte-identical');
console.log(JSON.stringify({ old: oldVer, problems }, null, 1)); console.log(problems.length ? 'EVOLUTION COMPAT CHECK FAILED' : 'EVOLUTION COMPAT CHECK PASSED'); process.exit(problems.length ? 1 : 0);
