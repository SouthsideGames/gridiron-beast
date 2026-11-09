#!/usr/bin/env node
// End-of-play save check (docs/task8/RENDER_OPT.md): in headless Chromium, on the real game page with its real IndexedDB store.
//   node tools/perf/render/save-check.mjs [--steps=6]
// 1. A real franchise (seed 3, week 3) on the match screen; `--steps` plays snapped by hand through the screen's own buttons, each
//    animated to its end (the end-of-play save is requested by the screen and written by the store as in the game).
// 2. Encoding identity: for the live franchise, every save part encoded inline (pack.js encodeRaw, the code the old store ran on the
//    main thread) and by the store's worker give the same part checksum, the same bytes and the same entry; and the manifest the
//    store committed matches them (the committed content is the franchise exactly: read back and compared as JSON).
// 3. Reload after a play: the franchise read from IndexedDB on a fresh page equals the one in memory before the reload.
// 4. Full game: Sim to final, Continue (the final whistle: finishSunday, rewards, XP), the result sheets closed; reload; the loaded
//    franchise equals the one in memory, the game is over and the week moved on.
// Exit code 1 if any check fails.
import path from 'node:path';
import net from 'node:net';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '..', '..', '..');
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(a.indexOf('=') + 1) : d; };
const STEPS = Number(arg('steps', 6));
const req = createRequire(import.meta.url);
let playwright; try { playwright = req('playwright'); } catch { playwright = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
async function waitHttp(url, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(url); if (r.ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 150)); } throw new Error(`server not up: ${url}`); }

const diffPath = (a, b, p = '') => { if (JSON.stringify(a) === JSON.stringify(b)) return null; if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = diffPath(a[k], b[k], `${p}.${k}`); if (d) return d; } return `${p} (key order)`; } return `${p}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`; };
const results = []; const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`); };

const port = await freePort(); const BASE = `http://127.0.0.1:${port}/`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
try {
  await waitHttp(BASE);
  const browser = await playwright.chromium.launch({ headless: true, channel: 'chromium' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { globalThis.__gbRenderPerf = {}; });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
  const ready = () => page.waitForFunction(() => globalThis.__gb && globalThis.__gb.storage && globalThis.__gb.storage.mode !== 'starting', null, { timeout: 60000 });
  await page.goto(BASE); await ready();
  await page.evaluate(() => import('/tools/perf/render/driver.js').then((m) => { globalThis.__rpDriver = m; }));
  await page.evaluate(() => globalThis.__rpDriver.setupFootball({ seed: 3, stopWeek: 3 }));
  check('storage is IndexedDB', (await page.evaluate(() => globalThis.__gb.storage.mode)) === 'indexeddb');
  const settled = () => page.evaluate(async () => { const st = globalThis.__gb.storage.store; for (let i = 0; i < 400 && (st.busy() || globalThis.__gbRenderPerf.matchBusy()); i++) { await st.flush(); await new Promise((r) => setTimeout(r, 25)); } return !st.busy(); });
  // 1. plays by hand
  let played = 0;
  for (let i = 0; i < STEPS * 3 && played < STEPS; i++) {
    const did = await page.evaluate(() => {
      const q = (s) => document.querySelector(s); const close = q('.sheet [data-action="sheet-close"]'); if (close) close.click();
      for (const a of ['kickoff', 'continue', 'trykick']) { const b = q(`#controls [data-action="${a}"]`); if (b) { b.click(); return a; } }
      const snap = q('#controls [data-action="snap"]'); if (snap) { if (snap.disabled) q('#controls .card')?.click(); const s2 = q('#controls [data-action="snap"]'); if (s2 && !s2.disabled) { s2.click(); return 'snap'; } }
      const punt = q('#controls [data-action="punt"]'); if (punt) { punt.click(); return 'punt'; }
      return null;
    });
    if (!did) break;
    await page.waitForFunction(() => !globalThis.__gbRenderPerf.matchBusy(), null, { timeout: 60000 }); played++;
  }
  check(`${played} plays snapped and animated to their end`, played >= Math.min(STEPS, 3));
  check('saves settled', await settled());
  // 2. encoding identity, and the committed content
  const enc = await page.evaluate(async () => {
    const P = await import('/src/franchise/pack.js'); const ST = await import('/src/franchise/store.js');
    const f = globalThis.__gb.f; const { history, draftResults, savedAt, ...core } = f;
    const raws = { core: JSON.stringify(core), history: JSON.stringify(history ?? null), draft: JSON.stringify(draftResults ?? null) };
    const inline = {}; for (const n of Object.keys(raws)) inline[n] = await P.encodeRaw(raws[n]);
    // the store's worker, the way the store builds it
    const w = new Worker(URL.createObjectURL(new Blob([P.encodeWorkerSource(new globalThis.URL('/src/franchise/pack.js', location.href).href)], { type: 'text/javascript' })), { type: 'module' });
    const viaWorker = await new Promise((res, rej) => { w.onmessage = (e) => (e.data.ok ? res(e.data.parts) : rej(new Error(e.data.error))); w.onerror = (e) => rej(new Error(e.message)); w.postMessage({ id: 1, raws, skip: {} }); }); w.terminate();
    const bytesEq = (a, b) => { if (typeof a === 'string' || typeof b === 'string') return a === b; if (a.byteLength !== b.byteLength) return false; for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false; return true; };
    const same = {}; for (const n of Object.keys(raws)) same[n] = inline[n].part.sum === viaWorker[n].part.sum && bytesEq(inline[n].part.data, viaWorker[n].part.data) && JSON.stringify(inline[n].entry) === JSON.stringify(viaWorker[n].entry);
    const store = globalThis.__gb.storage.store; const m = await store.readManifest(); const loaded = await store.loadManifest(m);
    const manifestMatches = Object.keys(raws).every((n) => m.parts[n].sum === inline[n].part.sum && m.parts[n].raw === inline[n].entry.raw);
    return { workerInUse: ST.encodeInWorker(), same, manifestMatches, committedEqualsLive: JSON.stringify(loaded) === JSON.stringify(f), bytes: Object.fromEntries(Object.keys(raws).map((n) => [n, [raws[n].length, inline[n].part.bytes]])) };
  });
  check('the store encodes in a worker', enc.workerInUse);
  for (const n of Object.keys(enc.same)) check(`part ${n}: worker and inline encoding identical (checksum, bytes, entry)`, enc.same[n], `raw ${enc.bytes[n][0]} B, stored ${enc.bytes[n][1]} B`);
  check('committed manifest = inline encoding of the live franchise', enc.manifestMatches);
  check('committed franchise read back = live franchise (JSON)', enc.committedEqualsLive);
  // 3. reload after a play
  // What a reload must give back: the franchise as it was, through the load-time migration (Save.migrate, which may add fields of
  // its own), without savedAt (the page's own unload save restamps it while reloading).
  const asLoaded = () => page.evaluate(async () => { const Save = await import('/src/franchise/save.js'); const g = Save.migrate(structuredClone(globalThis.__gb.f)); delete g.savedAt; return JSON.stringify(g); });
  const asIs = () => page.evaluate(() => { const g = { ...globalThis.__gb.f }; delete g.savedAt; return JSON.stringify(g); });
  const before = await asLoaded();
  await page.reload(); await ready(); await page.waitForFunction(() => !!globalThis.__gb.f, null, { timeout: 60000 });
  const after = await asIs();
  check('reload after a play: the franchise survives exactly', before === after, before === after ? `${before.length} chars` : diffPath(JSON.parse(before), JSON.parse(after)));
  // 4. full game: Sim to final, Continue, close the result sheets
  await page.evaluate(() => import('/tools/perf/render/driver.js').then((m) => { globalThis.__rpDriver = m; }));
  const onMatch = await page.evaluate(async () => { const R = await import('/src/ui/router.js'); if (R.currentScreen()?.name !== 'match') R.go('match', {}, { reset: true }); await new Promise((r) => setTimeout(r, 300)); return !!document.querySelector('#controls'); });
  check('back on the match screen after the reload', onMatch, await page.evaluate(() => [...document.querySelectorAll('#controls [data-action]')].map((b) => b.dataset.action).join(',')));
  for (let i = 0; i < 20 && !(await page.evaluate(() => !!document.querySelector('#controls [data-action="simfinal"]'))); i++) {
    await page.evaluate(() => { for (const a of ['trykick', 'kickoff', 'continue']) { const b = document.querySelector(`#controls [data-action="${a}"]`); if (b) { b.click(); return; } } });
    await page.waitForFunction(() => !globalThis.__gbRenderPerf.matchBusy(), null, { timeout: 60000 });
  }
  await page.evaluate(async () => { document.querySelector('#controls [data-action="simfinal"]')?.click(); await new Promise((r) => setTimeout(r, 200)); document.querySelector('.sheet [data-action="yes"]')?.click(); await new Promise((r) => setTimeout(r, 300)); });
  const fin = await page.evaluate(() => ({ finished: !!globalThis.__gb.f.game?.state?.finished, needsTiebreak: !!globalThis.__gb.f.game?.state?.needsTiebreak, winner: globalThis.__gb.f.game?.state?.winner ?? null }));
  check('the game is simulated to the final whistle', fin.finished, JSON.stringify(fin));
  const weekBefore = await page.evaluate(() => globalThis.__gb.f.season.week);
  if (fin.finished && !(fin.needsTiebreak && !fin.winner)) {
    await page.evaluate(async () => { document.querySelector('#controls [data-action="finish"]')?.click(); for (let i = 0; i < 12; i++) { await new Promise((r) => setTimeout(r, 250)); const b = document.querySelector('.sheet [data-action="shake"], .sheet [data-action="badge-ok"], .sheet [data-action="sheet-close"]'); if (b) b.click(); } });
  }
  check('saves settled after the final whistle', await settled());
  const fullJson = await asLoaded();
  const full = await page.evaluate(() => ({ json: '', game: !!globalThis.__gb.f.game, week: globalThis.__gb.f.season.week, xp: globalThis.__gb.f.roster.reduce((a, m) => a + (m.xp || 0), 0) }));
  await page.reload(); await ready(); await page.waitForFunction(() => !!globalThis.__gb.f, null, { timeout: 60000 });
  const full2Json = await asIs();
  const full2 = await page.evaluate(() => ({ json: '', game: !!globalThis.__gb.f.game, week: globalThis.__gb.f.season.week, xp: globalThis.__gb.f.roster.reduce((a, m) => a + (m.xp || 0), 0) }));
  check('full game: the game is closed and the result kept', !full.game && !full2.game, `week ${weekBefore} -> ${full2.week}`);
  check('reload after a full game: the franchise survives exactly (rewards, XP, records)', fullJson === full2Json, fullJson === full2Json ? `${fullJson.length} chars, roster XP ${full2.xp}` : diffPath(JSON.parse(fullJson), JSON.parse(full2Json)));
  check('no page errors', !errors.length, errors.join(' | '));
  await browser.close();
} finally { server.kill(); }
const bad = results.filter((r) => !r.ok);
console.log(`[save-check] ${results.length - bad.length} of ${results.length} checks passed`);
process.exit(bad.length ? 1 : 0);
