#!/usr/bin/env node
// Task 8 Clash ability presentation check (docs/task8/FX_CLASH_MATRIX.md): headless Chromium as a phone (390x844) opens the real game,
// Developer -> Clash Ability Reviewer (the unified screen, clash-ability-reviewer: the fx presentation check is folded into it), runs the chosen scenario for every Clash ability (or --ids=FIR-01-C,... / --families=emberfox,...)
// at every form (mastery 0; with --tiers=all also masteries 1-3 at the first form), seeks the real arena (t8 mode) to each presentation
// phase and saves one screenshot per phase (anticipation, activation, movement, impact, target, persistence, cleanup) to
// --shots=DIR/<family>/, reporting per variant the look items drawn, the t8 layer element count per phase, the stage's total element
// count and any page error. A variant whose only valid demonstration is a PROVISIONAL scenario runs that one, labelled (the gated
// reading is never enabled in normal play); --provisional prefers the provisional scenarios everywhere. Nothing is written to a franchise.
//   node tools/fx-clash-check.mjs [--ids=...] [--families=...] [--shots=DIR] [--tiers=all] [--quality=full|low|min] [--provisional] [--out=report.json]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname); const ROOT = path.resolve(HERE, '..');
const req = createRequire(import.meta.url);
let playwright; try { playwright = req('playwright'); } catch { playwright = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`) || x === `--${k}`); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const IDS = arg('ids') ? String(arg('ids')).split(',') : null; const FAMILIES = arg('families') ? String(arg('families')).split(',') : null; const SHOTS = arg('shots'); const TIERS = arg('tiers', 'first'); const QUALITY = arg('quality', null); const PROV = !!arg('provisional');
async function waitHttp(url, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(url); if (r.ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 150)); } throw new Error(`server not up: ${url}`); }

const port = 8900 + Math.floor(Math.random() * 300); const BASE = `http://127.0.0.1:${port}/`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const problems = []; const report = [];
try {
  await waitHttp(BASE + 'index.html');
  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(BASE); await page.waitForFunction(() => globalThis.__gb && globalThis.__gb.storage && globalThis.__gb.storage.mode !== 'starting', null, { timeout: 60000 });
  await page.evaluate(() => import('./src/ui/router.js').then((R) => R.go('clash-ability-reviewer', {}))); await page.waitForSelector('[data-action="scenario"]', { timeout: 20000 });
  await page.evaluate(() => document.querySelector('#toast')?.classList.remove('show'));
  await page.addStyleTag({ content: '#toast { display: none !important; } .sheet .cl-controls, .sheet .cl-strips, .sheet .cl-matchup { visibility: hidden; }' }); // the shots are of the stage; the strips and controls are the same in every frame
  const cat = await page.evaluate(() => import('./src/ui/screens/clash-ability-reviewer.js').then((m) => m.clashReviewCatalog()));
  const list = cat.filter((c) => (!IDS || IDS.includes(c.abilityId)) && (!FAMILIES || FAMILIES.includes(c.family)));
  for (const c of list) {
    const variants = []; for (const f of c.forms) variants.push([f.stage, 0]); if (TIERS === 'all') for (const m of [1, 2, 3]) variants.push([c.forms[0].stage, m]);
    for (const [stage, tier] of variants) {
      const tag = `${c.abilityId}:${stage}@${tier}`; const t0 = Date.now();
      await page.selectOption(`select[data-change="form"][data-id="${c.abilityId}"]`, String(stage)); await page.selectOption(`select[data-change="tier"][data-id="${c.abilityId}"]`, String(tier));
      // the scenario: the first valid one (or, with --provisional, the first provisional one when the ability has one)
      // the reviewer lists the main scenarios first; the pick follows the engine's own scenario order (listScenarios), as the tests and the matrix do
      const opts = await page.evaluate(async ([id, stage, tier]) => { const R = await import('./src/clash/t8/review.js'); const order = R.listScenarios(id, stage, tier).map((s) => s.id); return Array.from(document.querySelectorAll(`select[data-change="variant"][data-id="${id}"] option`)).map((o) => ({ v: o.value, kind: o.dataset.kind, prov: o.dataset.prov === '1' })).sort((x, y) => order.indexOf(x.v) - order.indexOf(y.v)); }, [c.abilityId, stage, tier]);
      // the same rule as the tests and the matrix: a valid non-provisional scenario; else a valid PROVISIONAL one (labelled: the look exists but normal
      // play awaits the ruling); --provisional prefers the provisional scenario where one exists
      const pick = PROV ? opts.find((o) => o.prov) || opts.find((o) => o.kind === 'valid') || opts[0] : opts.find((o) => o.kind === 'valid' && !o.prov) || opts.find((o) => o.kind === 'valid') || opts.find((o) => !o.prov) || opts[0];
      await page.selectOption(`select[data-change="variant"][data-id="${c.abilityId}"]`, pick.v);
      await page.evaluate((id) => document.querySelector(`[data-action="scenario"][data-id="${id}"]`).click(), c.abilityId); await page.waitForFunction(() => document.querySelector('#clreview')?.__crv, null, { timeout: 60000 });
      if (QUALITY) await page.evaluate((q) => document.querySelector('#clreview').__crv.arena.setQuality(q), QUALITY);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const plan = await page.evaluate((id) => { const R = document.querySelector('#clreview').__crv; const S = R.prep.state; return { last: S.last, provisional: !!R.prep.r.meta.provisional, ok: R.prep.r.ok, scenario: R.prep.r.meta.scenarioId, ev: R.prep.ev, items: S.items.filter((it) => it.id === id).map((it) => ({ kind: it.kind, t0: it.t0, start: it.start, end: it.end, stop: it.stop, main: it.main, move: !!it.look.move, impact: !!it.look.impact, persist: !!(it.look.until || it.look.persist), target: it.target, owner: it.owner, seq: it.seq })), pops: S.pops.filter((p) => p.abilityId === id).map((p) => ({ t0: p.t0, id: p.id })) }; }, c.abilityId);
      const items = plan.items; const main = items.find((it) => it.main) || items[0];
      const moments = [];
      if (main) {
        moments.push(['anticipation', main.start < main.t0 ? main.start + Math.min(0.15, (main.t0 - main.start) / 2) : Math.max(0, main.t0 - 0.3)]);
        moments.push(['activation', main.t0 + 0.15]);
        const mv = items.find((it) => it.move) || main; moments.push(['movement', mv.t0 + Math.min(0.45, Math.max(0.3, (mv.end - mv.t0) * 0.4))]);
        const im = items.find((it) => it.impact && it.seq > main.seq) || items.find((it) => it.impact) || items.find((it) => ['damage', 'heal', 'status', 'status_end', 'hp_set', 'revive', 'redirect', 'survive', 'intercepted', 'raw_split', 'rotation', 'miss', 'clock_adjust', 'status_freeze', 'delayed_impact'].includes(it.kind)) || main; moments.push(['impact', im === main ? main.t0 + Math.min(0.8, (main.end - main.t0) * 0.7) : im.t0 + 0.15]);
        const tg = items.find((it) => it.target && it.target !== it.owner && it.seq >= main.seq) || null; const pop = plan.pops[0]; moments.push(['target', tg ? tg.t0 + 0.3 : pop ? pop.t0 + 0.3 : main.t0 + 0.5]);
        const pe = items.find((it) => it.persist); moments.push(['persistence', pe ? (pe.stop != null ? Math.min(pe.stop - 0.2, pe.t0 + 2.5) : pe.t0 + Math.min(2.5, (pe.end - pe.t0) * 0.6)) : main.end + 1.0]);
        const last = items.slice().sort((x, y) => y.end - x.end)[0]; const cl = items.find((it) => it.kind === 'cleanup'); moments.push(['cleanup', cl ? cl.t0 + 0.3 : last.stop != null ? last.stop + 0.25 : last.end - 0.15]);
      }
      const counts = {}; const dir = SHOTS ? path.join(SHOTS, c.family) : null; if (dir) fs.mkdirSync(dir, { recursive: true });
      for (const [ph, time] of moments) {
        const n = await page.evaluate((time) => { const R = document.querySelector('#clreview').__crv; R.seek(time); const stage = document.querySelector('#clreview .cl-stage'); return { t8: R.arena.t8Elements, all: stage ? stage.querySelectorAll('*').length : 0 }; }, Math.max(0, time));
        counts[ph] = n.t8; counts.stage = Math.max(counts.stage || 0, n.all);
        if (dir) await page.locator('#clreview .cl-viewport').screenshot({ path: path.join(dir, `${c.abilityId}-${ph}-s${stage}m${tier}.png`) });
      }
      const r = { tag, abilityId: c.abilityId, name: c.name, scenario: plan.scenario, provisional: plan.provisional, ok: plan.ok, items: items.map((it) => `${it.kind}${it.main ? '*' : ''}@${it.t0.toFixed(1)}`), phases: plan.ev, counts, errors: errors.splice(0), ms: Date.now() - t0 };
      report.push(r);
      console.log(`${tag.padEnd(16)} ${plan.scenario.padEnd(22)}${plan.provisional ? ' PROVISIONAL' : ''} ok=${plan.ok} items=[${r.items.join(' ')}] phases=${Object.entries(plan.ev).map(([k, v]) => `${k[0]}:${v === 'n/a' ? '-' : v ? '✓' : '✗'}`).join(' ')} t8els=${JSON.stringify(counts)}${r.errors.length ? ' ERRORS ' + r.errors.join(' | ') : ''} ${r.ms}ms`);
      if (r.errors.length) problems.push(`${tag}: ${r.errors.join(' | ')}`); if (!items.length) problems.push(`${tag}: no look item of its own was drawn`); for (const [k, v] of Object.entries(plan.ev)) if (!v) problems.push(`${tag}: no evidence for the ${k} phase`);
      await page.evaluate(() => { const R = document.querySelector('#clreview')?.__crv; if (R) R.close(); for (const b of document.querySelectorAll('.sheet-backdrop')) b.remove(); });
    }
  }
  await browser.close();
  if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(report, null, 1));
} finally { server.kill(); }
console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n` + problems.join('\n') : '\nOK: no problems');
process.exit(problems.length ? 1 : 0);
