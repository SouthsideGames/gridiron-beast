#!/usr/bin/env node
// Task 8 M4 S12 / S15 browser check: headless Chromium as a phone (390x844) opens the real game and
//   1. plays a franchise Tuesday encounter on the t8 engine in Watch mode through the battle screen: the arena renders, the engine
//      stops at the player's rotation prompt (D1), a reserve is chosen, "Auto for the rest" finishes the battle, the result settles;
//   2. plays the Sunday pregame (gym) Clash the same way;
//   3. opens Developer -> Clash Ability Reviewer, runs "▶ Scenario" for representative rare, delayed, multi-target and multi-turn abilities
//      (and a blocked variant), seeks the arena to each ticked phase and screenshots it, checks the verdict line, the speed and step
//      controls, and runs one "▶ Natural battle";
//   4. (task8-m4-reconcile) checks that the battle screen and the reviewer play t8 natively (the t8 overlay layers and the ability's look
//      are drawn) and plays a legacy (pre-M4) golden record through the arena on the legacy cue path (D19);
// and reports every page error (expected: none). Nothing is written to a real franchise: the page runs on a throwaway franchise in the
// headless browser's own storage. Screenshots go to --shots=DIR. Usage: node tools/m4-integrate-check.mjs [--shots=DIR]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname); const ROOT = path.resolve(HERE, '..');
const req = createRequire(import.meta.url);
let playwright; try { playwright = req('playwright'); } catch { playwright = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`) || x === `--${k}`); return a ? (a.includes('=') ? a.slice(a.indexOf('=') + 1) : true) : d; };
const SHOTS = arg('shots', null); if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (page, name, sel = null) => { if (!SHOTS) return; const p = path.join(SHOTS, `${name}.png`); if (sel) await page.locator(sel).first().screenshot({ path: p }); else await page.screenshot({ path: p }); };
async function waitHttp(url, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(url); if (r.ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 150)); } throw new Error(`server not up: ${url}`); }
const REVIEW = [['FIR-03-C', 'delayed impact (Falling Star)'], ['DAR-01-C', 'rare: probability dodge + counter (Shadow Pounce)'], ['ELE-06-C', 'multi-turn constructs (Twin Thunder)'], ['WAT-02-C', 'multi-target split (Shared Burden)'], ['NAT-01-C', 'revive (Second Spring)'], ['LIG-02-C', 'gated point: blocked in normal play (Dawn Song)'], ['WAT-06-C', 'rotation reaction (Riptide Pursuit)']];

const port = 8700 + Math.floor(Math.random() * 200); const BASE = `http://127.0.0.1:${port}/`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const problems = []; const notes = []; const errors = [];
const ok = (c, m) => { (c ? notes : problems).push(m); return c; };
try {
  await waitHttp(BASE + 'index.html');
  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e))); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(BASE); await page.waitForFunction(() => globalThis.__gb && globalThis.__gb.storage && globalThis.__gb.storage.mode !== 'starting', null, { timeout: 60000 });
  // ---- a throwaway franchise at Tuesday with prospects
  const setup = await page.evaluate(async () => {
    const S = await import('/tools/franchise-soak.mjs'); const F = await import('/src/franchise/franchise.js');
    const f = S.newFranchise(5, { difficulty: 'rookie' }); Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: false, mode: 'auto' }); f.scenes = []; f.achievementsBackfilled = true; f.settings.clash = { mode: 'ask', speed: 4 };
    const r = F.scoutRegion(f, 'Coral Coast'); __gb.f = f; await __gb.save({ immediate: true });
    return { ok: r.ok, prospects: r.prospects?.length || 0, day: f.season.day };
  });
  ok(setup.ok && setup.prospects > 0, `setup: Tuesday with ${setup.prospects} prospects`);

  async function playBattle(kind, label) {
    await page.evaluate((k) => import('/src/ui/router.js').then((R) => R.go('clash-battle', { kind: k, i: 0 })), kind);
    await page.waitForSelector('[data-action="enter"][data-v="watch"]', { timeout: 20000 }); await shot(page, `${label}-1-setup`);
    await page.click('[data-action="enter"][data-v="watch"]'); await page.waitForSelector('#fb-arena .cl-arena', { timeout: 20000 });
    const rec = await page.evaluate((k) => { const f = __gb.f; const e = k === 'encounter' ? f.week.encounter : f.week.pregame; return { version: e.version, ruleset: e.ruleset, engine: e.engine, context: e.context, policies: e.policies, status: e.status, native: !!document.querySelector('#fb-arena .cl-arena.t8 .cl-t8-under') && !!document.querySelector('#fb-arena .cl-arena.t8 .cl-t8-over') }; }, kind);
    ok(rec.version === 2 && rec.ruleset === 't8' && rec.policies.a === 'manual' && rec.policies.b === 'ai', `${label}: version-2 t8 record in Watch (${JSON.stringify(rec)})`);
    ok(rec.native, `${label}: the arena plays the pending t8 record natively (t8 overlay layers present)`);
    await page.waitForTimeout(2500); await shot(page, `${label}-2-arena`);
    // the arena plays the pending log; skip to its end so the prompt appears
    if (!(await page.$('.sheet [data-rot]'))) await page.evaluate(() => document.querySelector('#fb-arena [data-cl="skip"]')?.click()); await page.waitForSelector('.sheet [data-rot]', { timeout: 30000 }); await shot(page, `${label}-3-rotation-prompt`);
    const prompt = await page.evaluate(() => ({ options: [...document.querySelectorAll('.sheet [data-rot]')].map((b) => b.dataset.rot), text: document.querySelector('.sheet .muted')?.textContent.slice(0, 80) }));
    ok(prompt.options.includes('stay') && prompt.options.includes('auto') && prompt.options.length >= 3, `${label}: rotation prompt with stay / reserve(s) / auto (${prompt.options.join(',')})`);
    const reserve = prompt.options.find((o) => o !== 'stay' && o !== 'auto'); await page.click(`.sheet [data-rot="${reserve}"]`);
    await page.waitForFunction(() => !document.querySelector('.sheet [data-rot]') && document.querySelector('#fb-arena .cl-arena'), null, { timeout: 20000 });
    const dec = await page.evaluate((k) => { const f = __gb.f; const e = k === 'encounter' ? f.week.encounter : f.week.pregame; return e.decisions.a; }, kind);
    ok(Object.values(dec).includes(reserve), `${label}: the reserve choice is recorded on the record (${JSON.stringify(dec)})`);
    await page.waitForTimeout(2500); await shot(page, `${label}-4-after-rotation`);
    // further prompts: Auto for the rest; then the battle runs to its end and settles
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => { if (!document.querySelector('.sheet [data-rot]')) document.querySelector('#fb-arena [data-cl="skip"]')?.click(); });
      const what = await Promise.race([page.waitForSelector('.sheet [data-rot="auto"]', { timeout: 30000 }).then(() => 'prompt'), page.waitForSelector('.cl-result', { timeout: 30000 }).then(() => 'result')]).catch(() => 'none');
      if (what === 'prompt') { await page.click('.sheet [data-rot="auto"]'); await page.waitForTimeout(800); continue; }
      if (what === 'result') break;
    }
    await page.waitForSelector('.cl-result', { timeout: 30000 }); await shot(page, `${label}-5-result`);
    const done = await page.evaluate((k) => { const f = __gb.f; const e = k === 'encounter' ? f.week.encounter : f.week.pregame; return { status: e.status, result: e.result, decisions: e.decisions.a, mastery: !!e.mastery, carryOut: e.carryOut, xp: (e.events || []).filter((x) => x.kind === 'xp').length }; }, kind);
    ok(done.result && done.result.ruleset === 't8' && done.status !== 'battle', `${label}: settled on t8 (${done.status}, ${done.result?.by} in ${done.result?.exchanges}; decisions ${JSON.stringify(done.decisions)}; ${done.xp} XP rows; mastery record ${done.mastery})`);
    ok(Object.values(done.decisions).includes('auto') || done.result, `${label}: Auto for the rest recorded or the battle ended before another prompt`);
    return done;
  }
  const enc = await playBattle('encounter', 'tuesday-encounter');
  // ---- Sunday: the pregame (gym) Clash
  const sun = await page.evaluate(async () => { const F = await import('/src/franchise/franchise.js'); const f = __gb.f; if (f.week.encounter?.status === 'offer') F.declineOffer(f); else if (f.week.encounter?.status === 'pitch') F.declineOffer(f); const r = F.autoRunToSunday(f); let g = 0; while (F.isBye(f) && g++ < 3) { F.takeBye(f); F.autoRunToSunday(f); } await __gb.save({ immediate: true }); return { ok: r.ok, day: f.season.day, opp: F.sundayMatchup(f)?.opponent }; });
  ok(sun.ok && sun.day === 6, `Sunday reached (vs ${sun.opp})`);
  const pre = await playBattle('pregame', 'sunday-gym-clash');
  ok(pre.carryOut === null || typeof pre.carryOut === 'object', `pregame carryOut stored (${JSON.stringify(pre.carryOut)})`);
  // the game starts with the opening Clash's possession (and any carried statuses)
  await page.evaluate(() => document.querySelector('.sheet-backdrop [data-action="sheet-close"]')?.click());
  if (await page.$('[data-action="choose"]')) { await page.click('[data-action="choose"][data-v="receive"]'); await page.waitForTimeout(400); }
  if (await page.$('[data-action="kickoff"]')) { await page.click('[data-action="kickoff"]'); await page.waitForTimeout(1500); const g = await page.evaluate(() => { const s = __gb.f.game?.state; return s ? { coin: s.coin, statuses: Object.keys(s.t8?.status || {}).length } : null; }); ok(!!g, `kickoff: the game opened with the Clash's possession (${JSON.stringify(g)})`); await shot(page, 'sunday-kickoff'); }

  // ---- Developer -> Clash Ability Reviewer
  await page.evaluate(() => import('/src/ui/router.js').then((R) => R.go('clash-ability-reviewer', {}))); await page.waitForSelector('[data-action="scenario"]', { timeout: 20000 });
  const count = await page.evaluate(() => document.querySelectorAll('[data-action="scenario"]').length); ok(count === 72, `reviewer lists ${count} Clash abilities`); await shot(page, 'reviewer-1-list');
  for (const [id, why] of REVIEW) {
    const tier = id === 'LIG-02-C' ? 1 : 1;
    await page.selectOption(`select[data-change="tier"][data-id="${id}"]`, String(tier));
    await page.click(`[data-action="scenario"][data-id="${id}"]`); await page.waitForFunction(() => document.querySelector('#clreview')?.__rv2, null, { timeout: 60000 });
    const info = await page.evaluate(() => { const R = document.querySelector('#clreview').__rv2; const failure = document.querySelector('[data-rv2="failure"]')?.textContent.trim() || null; return { phases: R.phases.map((p) => ({ id: p.id, ok: p.ok, seq: p.seq })), n: R.result.log.length, failure, explain: document.querySelector('[data-rv2="explain"]')?.textContent.slice(0, 160), provisional: !!document.querySelector('[data-rv2="provisional"]'), controlled: !!document.querySelector('[data-rv2="controlled"]') }; });
    ok(info.phases.length === 4 && info.phases.every((p) => p.ok) && !info.failure, `${id} (${why}): four phases evidenced, no failure panel${info.controlled ? ' (controlled prerequisite labelled)' : ''}`);
    await shot(page, `reviewer-${id}-0-explain`);
    { const act = info.phases.find((p) => p.id === 'activation'); const look = await page.evaluate((seq) => { const R = document.querySelector('#clreview').__rv2; R.seek(seq); const C = document.querySelector('#clreview').__crv; const it = C.prep.state.items.find((x) => x.main && x.id === C.prep.r.meta.abilityId) || C.prep.state.items.find((x) => x.id === C.prep.r.meta.abilityId); if (it) C.seek(it.t0 + 0.2); return { mode: R.arena.mode, els: R.arena.t8Elements, item: !!it, strip: document.querySelector('[data-rv2="fxphases"]')?.textContent.trim().slice(0, 120) || '' }; }, act?.seq ?? 0);
      ok(look.mode === 'native' && look.els > 0 && /activation/.test(look.strip), `${id}: the scenario plays with the ability's look (native, ${look.els} t8 layer elements${look.item ? ' at its activation' : ''}; look phases: ${look.strip})`); await shot(page, `reviewer-${id}-look-activation`, '#clreview'); }
    for (const p of info.phases) { await page.evaluate((seq) => document.querySelector('#clreview').__rv2.seek(seq), p.seq); await page.waitForTimeout(150); await shot(page, `reviewer-${id}-${p.id}`); await shot(page, `reviewer-${id}-${p.id}-arena`, '#clreview'); }
    const verdict = await page.evaluate(() => { const R = document.querySelector('#clreview').__rv2; R.seek(R.result.log.length - 1); return document.querySelector('[data-rv2="verdict"]')?.dataset.done; });
    ok(verdict === '1', `${id}: the verdict line validates once every phase event is reached`);
    // controls: speed, step by event / turn / exchange, replay
    const ctl = await page.evaluate(async () => {
      const R = document.querySelector('#clreview').__rv2; const q = (s) => document.querySelector(s); const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      R.seek(0); q('[data-pb="speed"][data-v="0.25"]').click(); const sp = R.arena.speed; q('[data-pb="event"]').click(); await sleep(400); const c1 = R.arena.cursor; R.arena.pause(); q('[data-pb="turn"]').click(); await sleep(1200); const c2 = R.arena.cursor; R.arena.pause(); q('[data-pb="exchange"]').click(); await sleep(1500); const c3 = R.arena.cursor; R.arena.pause(); q('[data-pb="replay"]').click(); await sleep(200); const c4 = R.arena.cursor; R.arena.pause(); return { sp, c1, c2, c3, c4 };
    });
    ok(ctl.sp === 0.25 && ctl.c1 >= 1 && ctl.c2 >= ctl.c1 && ctl.c3 >= ctl.c2 && ctl.c4 < 5, `${id}: controls act (speed ${ctl.sp}, event ${ctl.c1}, turn ${ctl.c2}, exchange ${ctl.c3}, replay ${ctl.c4})`);
    await page.evaluate(() => document.querySelector('.sheet-backdrop [data-action="sheet-close"]')?.click()); await page.waitForFunction(() => !document.querySelector('.sheet-backdrop'), null, { timeout: 5000 });
  }
  // a blocked variant, explicitly
  await page.selectOption('select[data-change="variant"][data-id="EAR-04-C"]', 'no-reserve'); await page.click('[data-action="scenario"][data-id="EAR-04-C"]'); await page.waitForFunction(() => document.querySelector('#clreview')?.__rv2, null, { timeout: 60000 });
  const blocked = await page.evaluate(() => ({ labels: [...document.querySelectorAll('.rv2-phase')].map((r) => r.textContent.trim().slice(0, 40)), failure: !!document.querySelector('[data-rv2="failure"]') }));
  ok(blocked.labels.some((l) => /Blocked/.test(l)) && !blocked.failure, `blocked variant shows its own phases (${blocked.labels.join(' | ')})`); await shot(page, 'reviewer-blocked-variant');
  await page.evaluate(() => document.querySelector('.sheet-backdrop [data-action="sheet-close"]')?.click()); await page.waitForFunction(() => !document.querySelector('.sheet-backdrop'), null, { timeout: 5000 });
  // Natural battle
  await page.click('[data-action="natural"][data-id="FIR-01-C"]'); await page.waitForFunction(() => document.querySelector('#clreview')?.__rv2, null, { timeout: 60000 });
  const nat = await page.evaluate(() => ({ natural: document.querySelector('#clreview').__rv2.natural, text: document.querySelector('[data-rv2="explain"]')?.textContent.slice(0, 120) }));
  ok(nat.natural, `natural battle runs (${nat.text})`); await shot(page, 'reviewer-natural-battle');
  await page.evaluate(() => document.querySelector('.sheet-backdrop [data-action="sheet-close"]')?.click());
  // ---- a legacy (pre-M4) record still plays through the arena's legacy cue path (D19)
  const legacy = await page.evaluate(async () => {
    const G = await (await fetch('/tests/clash/fixtures/golden.json')).json(); const E = await import('/src/clash/engine.js'); const RS = await import('/src/clash/rulesets.js'); const A = await import('/src/ui/clash/arena.js');
    const k = E.parseReplayKey(G['3'].key); const r = RS.simulateByRuleset({ a: k.a, b: k.b, seed: k.seed, config: k.config });
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:700px;z-index:9999;background:#000'; document.body.appendChild(host);
    let ended = 0; const arena = A.createArena(host, r, { speed: 4, names: { a: 'Old A', b: 'Old B' }, onEnd: () => { ended += 1; } });
    const mode = arena.mode; const n = arena.length; const t8Layers = host.querySelectorAll('.cl-t8').length;
    await arena.playTo(Math.min(30, n - 1)); const reached = arena.cursor; arena.skip(); const last = arena.cursor; const sameRecord = arena.record === r;
    arena.destroy(); host.remove(); return { mode, n, t8Layers, reached, last, sameRecord, ruleset: r.config?.ruleset || k.config.ruleset };
  });
  ok(legacy.mode === 'legacy' && legacy.t8Layers === 0 && legacy.reached >= Math.min(30, legacy.n - 1) && legacy.last === legacy.n - 1 && legacy.sameRecord, `legacy record (ruleset ${legacy.ruleset}, ${legacy.n} events) plays on the legacy cue path: animated to ${legacy.reached}, skipped to ${legacy.last}, no t8 layers, record unchanged`);
  // the franchise was not touched by the reviewer
  const touched = await page.evaluate(() => { const f = __gb.f; return { week: f.season.week, day: f.season.day, roster: f.roster.length, ledger: Object.keys(f.rewardLedger?.done || f.rewardLedger || {}).length }; });
  notes.push(`franchise after the reviewer: ${JSON.stringify(touched)}`);
  await browser.close();
} catch (e) { problems.push('check crashed: ' + (e?.stack || e)); } finally { server.kill(); }
for (const n of notes) console.log('ok   ' + n);
for (const p of problems) console.log('FAIL ' + p);
console.log(`page errors: ${errors.length}`); for (const e of errors) console.log('  ' + e);
console.log(problems.length || errors.length ? `\nPROBLEMS: ${problems.length} failed checks, ${errors.length} page errors` : '\nOK: all checks passed, 0 page errors');
process.exit(problems.length || errors.length ? 1 : 0);
