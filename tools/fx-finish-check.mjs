#!/usr/bin/env node
// Browser check for the Task 8 presentation integration (docs/task8/FX_FOOTBALL_MATRIX.md I1, I2, I3, I6): headless Chromium as a
// phone (390x844) opens the real game, starts a real franchise Sunday game on the match screen (the render-perf harness's setup) and
//   1. I2: banks a field for the next snap (a Shadow Patch for the defending corner; staged into the game's own pending list), and
//      photographs the play-call screen during the reveal and settled, the snap, and the next play-call screen (the field active);
//   2. I1: makes the club's kicker a Glacivern, sets a long fourth-down field goal and kicks it through the screen's own button until
//      a miss triggers Second Chance; photographs the kick animation with the ice shard and the redirected flight;
//   3. I3: plays a Daybreak catch (the reviewer's recorded play) through the match playback, held at the flare, with the real
//      "Reduce flashes" checkbox off and on, and compares the drawn flare.
// Nothing is saved to a real career (a throwaway franchise in a fresh browser profile). Screenshots go to --shots=DIR.
//   node tools/fx-finish-check.mjs --shots=DIR
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname); const ROOT = path.resolve(HERE, '..');
const req = createRequire(import.meta.url);
let playwright; try { playwright = req('playwright'); } catch { playwright = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(a.indexOf('=') + 1) : d; };
const SHOTS = path.resolve(arg('shots', 'fx-finish-shots')); fs.mkdirSync(SHOTS, { recursive: true });
async function waitHttp(url, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(url); if (r.ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 150)); } throw new Error(`server not up: ${url}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 8900 + Math.floor(Math.random() * 300); const BASE = `http://127.0.0.1:${port}/`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const problems = []; const report = {}; const errors = [];
const check = (ok, what) => { if (!ok) problems.push(what); console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); };
try {
  await waitHttp(BASE + 'index.html');
  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => { globalThis.__gbRenderPerf = {}; });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(BASE); await page.waitForFunction(() => globalThis.__gb && globalThis.__gb.storage && globalThis.__gb.storage.mode !== 'starting', null, { timeout: 60000 });
  await page.evaluate(() => import('/tools/perf/render/driver.js').then((m) => { globalThis.__rpDriver = m; }));
  report.setup = await page.evaluate(() => globalThis.__rpDriver.setupFootball({ seed: 3, stopWeek: 3 }));
  const shot = async (name) => { await page.evaluate(() => document.querySelector('#toast')?.classList.remove('show')); await page.screenshot({ path: path.join(SHOTS, `${name}.png`) }); };
  const settle = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
  const busy = () => page.evaluate(() => globalThis.__gbRenderPerf.matchBusy());
  const finishPlay = async () => { await page.evaluate(() => { globalThis.__gbRenderPerf.clock = () => 1e12; }); for (let i = 0; i < 300 && await busy(); i++) await settle(); await page.evaluate(() => { globalThis.__gbRenderPerf.clock = null; }); await settle(); };
  const clickAny = () => page.evaluate(() => { const q = (s) => document.querySelector(s); const close = q('.sheet [data-action="sheet-close"]'); if (close) close.click();
    for (const a of ['kickoff', 'continue', 'trykick']) { const b = q(`#controls [data-action="${a}"]`); if (b) { b.click(); return a; } } return null; });
  const phase = () => page.evaluate(() => { const G = globalThis.__gb.f.game; return { phase: G.state.phase, mine: G.state.possession === G.playerSide, down: G.state.down, finished: G.state.finished }; });

  // ---- to the first play-call screen
  for (let i = 0; i < 12; i++) { const p = await phase(); if (p.phase === 'scrimmage' && !(await busy())) break; await clickAny(); await settle(); await finishPlay(); }
  check((await phase()).phase === 'scrimmage', 'a real franchise game is at its first play-call screen');

  // ---- 1. I2: a banked field on the play-call screen
  await page.evaluate(async () => { const f = globalThis.__gb.f; const F = await import('/src/franchise/franchise.js'); const G = f.game; const s = G.state; const m = F.sundayMatchup(f); const T = { home: m.home, away: m.away };
    const dside = s.possession === 'home' ? 'away' : 'home'; const cb = T[dside].defense.CB1;
    s.t8 ||= { status: {} }; s.t8.fields ||= { list: [], pending: [], seq: 0 };
    s.t8.fields.pending.push({ owner: cb.id, ownerTeam: dside, side: 'def', type: 'Dark', ability: 'DAR-01-F', strength: 20, lifetime: 3, clock: 'teamDefense', width: 8, length: 7, lbDepth: 6, latHome: 3 }); });
  await page.evaluate(() => { const card = document.querySelector('#controls .card'); if (card) card.click(); }); // choosing a play re-renders the play-call screen
  await sleep(260); await shot('1a-playcall-field-reveal');
  const mid = await page.evaluate(() => ({ rects: document.querySelectorAll('#field rect.t8-field').length, opacity: document.querySelector('#field rect.t8-field')?.getAttribute('opacity') || '1', pre: document.querySelector('#field .fv-pre')?.children.length || 0 }));
  await sleep(1700); await shot('1b-playcall-field-settled');
  const settled = await page.evaluate(() => ({ rects: document.querySelectorAll('#field rect.t8-field').length, opacity: document.querySelector('#field rect.t8-field')?.getAttribute('opacity') || '1', pre: document.querySelector('#field .fv-pre')?.children.length || 0, snap: !!document.querySelector('#controls [data-action="snap"]') }));
  report.presnap = { mid, settled };
  check(mid.rects === 1 && settled.rects === 1, `the banked field is drawn on the play-call screen before the snap (rect ${settled.rects}, decoration elements ${settled.pre})`);
  check(Number(mid.opacity) < 1 && Number(settled.opacity) === 1, `its reveal plays once and settles (opacity ${mid.opacity} during the reveal, ${settled.opacity} after)`);
  check(settled.pre > 0 && settled.snap, 'element decoration is drawn and the play-call controls are still there');
  await page.evaluate(() => { const card = document.querySelectorAll('#controls .card')[1]; if (card) card.click(); }); await sleep(200);
  const again = await page.evaluate(() => document.querySelector('#field rect.t8-field')?.getAttribute('opacity') || '1');
  check(Number(again) === 1, 're-rendering the play-call screen (another play chosen) does not replay the reveal');
  // the snap: the field is created where it was shown, and the play does not reveal it a second time
  await page.evaluate(() => { globalThis.__gbRenderPerf.clock = () => 0; }); await page.evaluate(() => document.querySelector('#controls [data-action="snap"]')?.click()); await settle();
  const info = await page.evaluate(() => globalThis.__gbRenderPerf.animInfo());
  if (info) { await page.evaluate((t) => { globalThis.__gbRenderPerf.clock = () => t; }, info.start + 3 * info.msPerFrame); await settle(); await shot('1c-snap-field-in-play');
    const inPlay = await page.evaluate(() => ({ rects: document.querySelectorAll('#field rect.t8-field').length, opacity: document.querySelector('#field rect.t8-field')?.getAttribute('opacity') || '1' }));
    check(inPlay.rects === 1 && Number(inPlay.opacity) === 1, `at the snap the field is simply there (no second reveal): opacity ${inPlay.opacity}`); report.snap = inPlay; }
  else check(false, 'the snap animated');
  await finishPlay();
  const after = await page.evaluate(() => { const s = globalThis.__gb.f.game.state; return { list: (s.t8?.fields?.list || []).map((f) => f.ability), pending: (s.t8?.fields?.pending || []).length, phase: s.phase }; });
  check(after.list.includes('DAR-01-F') && after.pending === 0, `the engine created the field at that snap (active: ${after.list.join(', ') || 'none'})`);
  for (let i = 0; i < 6; i++) { const p = await phase(); if (p.phase === 'scrimmage' && !(await busy())) break; await clickAny(); await settle(); await finishPlay(); }
  await shot('1d-next-playcall-field-active');
  const next = await page.evaluate(() => ({ rects: document.querySelectorAll('#field rect.t8-field').length, opacity: document.querySelector('#field rect.t8-field')?.getAttribute('opacity') || '1' }));
  check(after.phase !== 'scrimmage' || (next.rects >= 1 && Number(next.opacity) === 1), `the active field stays on the next play-call screen without a reveal (rects ${next.rects})`);

  // ---- 2. I1: Second Chance on a real field goal
  let kick = null;
  for (let attempt = 0; attempt < 30 && !kick; attempt++) {
    await page.evaluate(async (k) => { const f = globalThis.__gb.f; const F = await import('/src/franchise/franchise.js'); const R = await import('/src/ui/router.js'); const G = f.game; const s = G.state; const me = G.playerSide;
      const K = F.sundayMatchup(f)[me].kicker; const mon = f.roster.find((x) => x.id === K.id) || K; mon.species = 'glacivern'; mon.form = 'glacivern:0'; mon.type = 'Ice';
      if (s.t8?.ability) delete s.t8.ability[K.id]; if (s.t8?.fields) { s.t8.fields.list = []; s.t8.fields.pending = []; }
      Object.assign(s, { phase: 'scrimmage', possession: me, down: 4, toGo: 12, ballOn: 52, ballLat: 0, finished: false }); s.rngState = (Number(s.rngState) + 7919 * (k + 1)) >>> 0; G.lastEvent = null; R.render(); }, attempt);
    await settle();
    const has = await page.evaluate(() => !!document.querySelector('#controls [data-action="fg"]')); if (!has) { check(false, 'the field goal button is offered on fourth down'); break; }
    await page.evaluate(() => { globalThis.__gbRenderPerf.clock = () => 0; }); await page.evaluate(() => document.querySelector('#controls [data-action="fg"]').click()); await settle();
    const ai = await page.evaluate(() => globalThis.__gbRenderPerf.animInfo());
    if (ai?.hasFx) {
      const marks = [0.3, 0.5, 0.62, 0.75, 0.95]; const counts = [];
      for (const [i, k] of marks.entries()) { await page.evaluate((t) => { globalThis.__gbRenderPerf.clock = () => t; }, ai.start + Math.floor(ai.frames * k) * ai.msPerFrame); await settle(); await shot(`2${'abcde'[i]}-second-chance-kick-${Math.round(k * 100)}`);
        counts.push(await page.evaluate(() => (document.querySelector('#field .fv-post')?.querySelectorAll('*').length || 0) + (document.querySelector('#field .fv-pre')?.querySelectorAll('*').length || 0))); }
      await finishPlay(); await shot('2f-second-chance-result');
      const res = await page.evaluate(() => { const G = globalThis.__gb.f.game; return { text: G.lastEvent?.text || '', strip: [...document.querySelectorAll('.ability-strip span')].map((x) => x.textContent.trim()) }; });
      kick = { attempt: attempt + 1, frames: ai.frames, counts, ...res };
    } else await finishPlay();
  }
  report.kick = kick;
  check(!!kick, `a real field goal in the match drew Second Chance (attempt ${kick?.attempt ?? '-'}; effect elements per held frame ${kick?.counts?.join(', ') ?? '-'})`);
  check(/Second Chance/.test(kick?.text || ''), `the result line is the engine's: "${(kick?.text || '').slice(0, 110)}"`);
  check((kick?.strip || []).some((x) => /Second Chance/.test(x)), `the ability strip names it: ${JSON.stringify(kick?.strip || [])}`);
  check(Math.max(0, ...(kick?.counts || [])) > Math.min(...(kick?.counts || [0])), 'the look draws on the kick animation (shard and trail elements appear)');

  // ---- 3. I3: Reduce flashes
  const flare = async (name) => {
    await page.evaluate(() => import('/src/ui/router.js').then((R) => R.go('match', {}, { reset: true }))); await page.waitForSelector('#field'); await settle();
    const t0 = await page.evaluate(async () => { const { reviewSequence } = await import('/src/sim/abilities/review-sequence.js'); const { buildFx } = await import('/src/ui/ability-fx.js');
      const r = reviewSequence({ family: 'aurelion' }); const p = r.plays[r.activation]; const lookup = (team, slot) => { const m = p.sprites?.[team]?.[slot]; return m ? { element: m.type, name: m.name, species: m.species } : null; };
      const fx = buildFx(p.sim, lookup, { preroll: true }); const it = fx.t8.items.find((x) => x.id === 'LIG-06-F' && x.main); globalThis.__gbRenderPerf.clock = () => 0;
      globalThis.__gbRenderPerf.playMatch({ sim: p.sim, offenseSide: globalThis.__gb.f.game.state.possession, toGo: 10, text: 'Daybreak (reviewer play)' }, { lookup }); return it.t0; });
    const ai = await page.evaluate(() => globalThis.__gbRenderPerf.animInfo());
    await page.evaluate((t) => { globalThis.__gbRenderPerf.clock = () => t; }, ai.start + (Math.round(t0 / 0.1) + 1) * ai.msPerFrame); await settle(); await shot(name);
    const drawn = await page.evaluate(() => { const g = document.querySelector('#field .fv-dyn'); const ops = [...g.querySelectorAll('[opacity]')].map((e) => Number(e.getAttribute('opacity'))); return { n: g.querySelectorAll('*').length, sum: +ops.reduce((a, b) => a + b, 0).toFixed(2), html: g.innerHTML.length }; });
    await finishPlay(); return drawn;
  };
  const off = await flare('3a-daybreak-flare-flashes-normal');
  await page.evaluate(() => import('/src/ui/router.js').then((R) => R.go('settings', {}))); await page.waitForSelector('[data-change="reducedflash"]'); await shot('3b-settings-reduce-flashes-off');
  const before = await page.evaluate(() => ({ checked: document.querySelector('[data-change="reducedflash"]').checked, saved: globalThis.__gb.f.settings.reducedFlash, html: document.documentElement.dataset.reducedFlash }));
  await page.click('[data-change="reducedflash"]'); await settle();
  await page.evaluate(() => document.querySelector('[data-change="reducedflash"]').scrollIntoView({ block: 'center' })); await shot('3c-settings-reduce-flashes-on');
  const afterSet = await page.evaluate(() => ({ checked: document.querySelector('[data-change="reducedflash"]').checked, saved: globalThis.__gb.f.settings.reducedFlash, html: document.documentElement.dataset.reducedFlash, label: document.querySelector('[data-change="reducedflash"]').closest('label').textContent.trim() }));
  check(before.checked === false && !before.saved, 'Reduce flashes is off by default'); check(afterSet.checked && afterSet.saved === true && afterSet.html === '1', `the toggle saves the setting and marks the page (${afterSet.label})`);
  const on = await flare('3d-daybreak-flare-flashes-reduced');
  report.flash = { off, on, before, after: afterSet };
  check(on.n === off.n, `the same shapes are drawn with the setting on (${on.n} elements): nothing is hidden`); check(on.sum < off.sum, `the flare is softer with the setting on (summed opacity ${off.sum} -> ${on.sum})`);
  const td = await page.evaluate(() => { const w = document.createElement('div'); w.className = 'field-wrap td-flash mine'; document.body.appendChild(w); const a = getComputedStyle(w, '::after').animationName; w.remove(); return a; });
  check(td === 'none', `the full-field touchdown flash is off under the setting (animation: ${td})`);

  check(errors.length === 0, `page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
  report.errors = errors; await browser.close();
} catch (e) { problems.push(String(e?.stack || e)); console.log('FAIL', String(e?.stack || e)); }
finally { server.kill(); }
fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify({ problems, ...report }, null, 2));
console.log(problems.length ? `PROBLEMS: ${problems.length}` : 'OK: no problems'); process.exit(problems.length ? 1 : 0);
