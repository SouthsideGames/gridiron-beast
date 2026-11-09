#!/usr/bin/env node
// Task 8 football ability presentation check (docs/task8/FX_FOOTBALL_MATRIX.md): headless Chromium as a phone (390x844) opens the real
// game, Developer -> Ability Reviewer, runs "Scenario" for every ability (or --families=a,b) at the chosen form and mastery (default:
// every form at mastery 0, plus mastery 3 at the first form with --tiers=all), seeks the real player to each presentation phase and
// saves one screenshot per phase (anticipation, activation, movement, impact, persistence, cleanup) to --shots=DIR/<family>/, reporting
// per ability the Task 8 items drawn, the svg element count with and without effects, and any page error. Nothing is written to a
// franchise. Usage: node tools/fx-football-check.mjs [--families=emberfox,tempestra] [--shots=DIR] [--tiers=all] [--quality=full|low|min]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname); const ROOT = path.resolve(HERE, '..');
const req = createRequire(import.meta.url);
let playwright; try { playwright = req('playwright'); } catch { playwright = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`) || x === `--${k}`); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const FAMILIES = arg('families') ? String(arg('families')).split(',') : null; const SHOTS = arg('shots'); const TIERS = arg('tiers', 'first'); const QUALITY = arg('quality', null);
async function waitHttp(url, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(url); if (r.ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 150)); } throw new Error(`server not up: ${url}`); }

const port = 8600 + Math.floor(Math.random() * 300); const BASE = `http://127.0.0.1:${port}/`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const problems = []; const report = [];
try {
  await waitHttp(BASE + "index.html");
  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(BASE); await page.waitForFunction(() => globalThis.__gb && globalThis.__gb.storage && globalThis.__gb.storage.mode !== 'starting', null, { timeout: 60000 });
  await page.evaluate(() => import('./src/ui/router.js').then((R) => R.go('ability-reviewer', {}))); await page.waitForSelector('[data-action="scenario"]', { timeout: 20000 });
  const cat = await page.evaluate(() => import('./src/sim/abilities/review.js').then((m) => m.reviewCatalog().map((c) => ({ family: c.family, abilityId: c.abilityId, name: c.name, forms: c.forms, element: c.element }))));
  const list = cat.filter((c) => !FAMILIES || FAMILIES.includes(c.family));
  for (const c of list) {
    const variants = []; for (const f of c.forms) variants.push([f, 0]); if (TIERS === 'all') { for (const m of [1, 2, 3]) variants.push([c.forms[0], m]); }
    for (const [form, mastery] of variants) {
      const tag = `${c.family}:${String(form).split(':')[1]}@${mastery}`; const t0 = Date.now();
      await page.selectOption(`select[data-change="form"][data-f="${c.family}"]`, form); await page.selectOption(`select[data-change="mastery"][data-f="${c.family}"]`, String(mastery));
      await page.click(`[data-action="scenario"][data-f="${c.family}"]`); await page.waitForSelector('#fbreview', { state: 'attached', timeout: 120000 }); await page.waitForFunction(() => document.querySelector('#fbreview')?.__rv2, null, { timeout: 60000 });
      if (QUALITY) await page.click(`[data-pb="quality"][data-v="${QUALITY}"]`);
      await page.evaluate(() => document.querySelector('#toast')?.classList.remove('show')); // the Developer "new to review" toast is not the field
      // The plan: every play's Task 8 items with their windows, the pre-roll and the end; the phase moments follow from them.
      const plan = await page.evaluate(() => { const R = document.querySelector('#fbreview').__rv2; return R.prepared.map((P, i) => ({ i, preroll: P.preroll, end: P.end, frames: P.frames.length, executed: !!P.p.executed, fields: (P.sim?.fields || []).map((f) => ({ ability: f.ability, fresh: !!f.fresh })), items: (P.fx?.t8?.items || []).map((it) => ({ id: it.id, kind: it.kind, phase: it.phase, t0: it.t0, start: it.start, end: it.end, stop: it.stop, main: it.main, dur: it.dur })), badges: (P.fx?.t8?.badges || []).map((b) => ({ id: b.id, t0: b.t0, slot: b.slot })), hud: Object.keys(P.fx?.t8?.hud || {}).length })); });
      const own = (it) => it.id === c.abilityId && it.kind !== 'ambient';
      const ownField = (P) => P.fields.some((f) => f.ability === c.abilityId); const freshIn = plan.find((P) => P.fields.some((f) => f.ability === c.abilityId && f.fresh));
      const act = plan.find((P) => P.items.some((it) => own(it) && it.main)) || plan.find((P) => P.items.some(own)) || freshIn || plan.find((P) => P.executed) || plan[0];
      const moments = []; // [phase, play index, time]: one screenshot per presentation phase
      const m0 = act ? act.items.filter((it) => own(it) && it.main)[0] || act.items.find(own) : null;
      if (m0) {
        if (m0.start < m0.t0) moments.push(['anticipation', act.i, m0.start + Math.min(0.3, (m0.t0 - m0.start) / 2)]); else if (act.hud) moments.push(['anticipation', act.i, Math.max(-act.preroll, m0.t0 - 0.3)]);
        moments.push(['activation', act.i, m0.t0 + 0.15]); moments.push(['movement', act.i, m0.t0 + Math.min(0.5, Math.max(0.3, (m0.end - m0.t0) * 0.35))]);
        const subs = act.items.filter((it) => own(it) && !it.main); const impactIt = subs[0] || (m0.stop != null ? m0 : null);
        moments.push(['impact', act.i, impactIt ? (impactIt === m0 ? Math.min(impactIt.stop + 0.15, impactIt.end - 0.1) : impactIt.t0 + 0.15) : m0.t0 + Math.min(0.8, (m0.end - m0.t0) * 0.6)]);
        moments.push(['target', act.i, act.badges.length ? act.badges[0].t0 + 0.3 : m0.t0 + 0.35]);
        const endIt = act.items.filter(own).sort((x, y) => y.end - x.end)[0]; moments.push(['cleanup', act.i, Math.min(endIt.end - 0.1, act.end + 0.8)]);
      }
      if (freshIn) { const L = Math.max(0.2, freshIn.preroll);
        if (!m0) { moments.push(['anticipation', freshIn.i, -L * 0.7]); moments.push(['activation', freshIn.i, -L * 0.25]); moments.push(['movement', freshIn.i, 0.15]); moments.push(['impact', freshIn.i, 0.45]); }
        else if (freshIn.i !== act.i) { moments.push(['reveal-start', freshIn.i, -L * 0.7]); moments.push(['reveal-land', freshIn.i, 0.3]); } } // a banked field: its creation reveal on the later play
      const persistIn = (freshIn && freshIn.i >= (act?.i ?? 0) ? freshIn : null) || plan.find((P) => P.i > (act?.i ?? 0) && (ownField(P) || P.items.some(own) || P.hud));
      if (persistIn) moments.push(['persistence', persistIn.i, Math.min(1.5, Math.max(0.9, persistIn.end * 0.5))]);
      const lastF = plan.map(ownField).lastIndexOf(true); if (lastF >= 0 && lastF + 1 < plan.length) moments.push(['cleanup', lastF + 1, 0.5]); // the field is gone
      const seen = new Set(); for (let k = moments.length - 1; k >= 0; k--) { if (seen.has(moments[k][0])) moments.splice(k, 1); else seen.add(moments[k][0]); } // the later (field) moment wins
      const counts = {}; const dir = SHOTS ? path.join(SHOTS, c.family) : null; if (dir) fs.mkdirSync(dir, { recursive: true });
      for (const [ph, pi, time] of moments) {
        const n = await page.evaluate(([pi, time]) => { const R = document.querySelector('#fbreview').__rv2; R.seek(pi, time); const svg = document.querySelector('#fbreview'); return { el: svg.querySelectorAll('*').length, chars: svg.innerHTML.length, t8: (svg.innerHTML.match(/t8-field/g) || []).length }; }, [pi, time]);
        counts[ph] = n.el; if (dir) await page.locator('#fbreview').screenshot({ path: path.join(dir, `${ph}-${String(form).split(':')[1]}m${mastery}.png`) });
      }
      // The same frame without effects, for the element-count delta.
      const base = act ? await page.evaluate(([pi, time]) => { const R = document.querySelector('#fbreview').__rv2; const P = R.prepared[pi]; const fx = P.fx; P.fx = null; R.seek(pi, time); const n = document.querySelector('#fbreview').querySelectorAll('*').length; P.fx = fx; R.seek(pi, time); return n; }, [act.i, moments.find((m) => m[0] === 'activation')?.[2] ?? 0.2]) : null;
      const ownItems = plan.flatMap((P) => P.items.filter(own).map((it) => `${it.kind}${it.phase ? '/' + it.phase : ''}@p${P.i + 1}`));
      report.push({ tag, abilityId: c.abilityId, name: c.name, plays: plan.length, items: ownItems, phases: moments.map((m) => m[0]), counts, base, badges: plan.reduce((a, P) => a + P.badges.length, 0), fields: plan.reduce((a, P) => a + P.fields.filter((f) => f.ability === c.abilityId).length, 0), errors: errors.splice(0), ms: Date.now() - t0 });
      const r = report[report.length - 1]; console.log(`${tag.padEnd(16)} ${c.abilityId} plays=${r.plays} items=[${r.items.join(' ')}] phases=${r.phases.join(',')} els=${JSON.stringify(r.counts)} base=${r.base} badges=${r.badges} fields=${r.fields}${r.errors.length ? ' ERRORS ' + r.errors.join(' | ') : ''} ${r.ms}ms`);
      if (r.errors.length) problems.push(`${tag}: ${r.errors.join(' | ')}`); if (!r.items.length && !r.fields) problems.push(`${tag}: no Task 8 item of its own was drawn`);
      await page.evaluate(() => document.querySelector('.sheet-backdrop [data-action="sheet-close"]')?.click()); await page.waitForFunction(() => !document.querySelector('.sheet-backdrop'), null, { timeout: 5000 });
    }
  }
  await browser.close();
  if (arg('out')) fs.writeFileSync(arg('out'), JSON.stringify(report, null, 1));
} finally { server.kill(); }
console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n` + problems.join('\n') : '\nOK: no problems');
process.exit(problems.length ? 1 : 0);
