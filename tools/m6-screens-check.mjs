#!/usr/bin/env node
// Task 8 M6 browser check: headless Chromium as a phone (390x844) opens the real game on a throwaway franchise and checks the
// player screens M6 finished:
//   1. the monster profile: three bars (level, the mode's ability mastery, shared training), the Dex abilities of both modes, the
//      Football / Beast Clash mastery switch, a Basic (no ability, no mastery bar), training against each attribute's own ceiling;
//   2. Apex concealment and discovery: an unidentified Apex prospect shows nothing Apex-specific; the potential-revealing report
//      discovers it and plays the first-discovery panel once (stages, skip, confirmation, continue); a page reload does not replay it;
//      Replay on the profile does; reduced flash gives the steady version; an interrupted panel is not replayed after a reload;
//   3. the Beast Dex sheet and "See it" (the real engine demonstration), the collection achievements, the 60 / 30 FPS setting;
// and reports every page error (expected: none). Nothing touches a real franchise. Usage: node tools/m6-screens-check.mjs [--shots=DIR]
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname); const ROOT = path.resolve(HERE, '..');
const req = createRequire(import.meta.url);
let playwright; try { playwright = req('playwright'); } catch { playwright = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(a.indexOf('=') + 1) : d; };
const SHOTS = arg('shots', null); if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const port = 8700 + Math.floor(Math.random() * 200); const BASE = `http://127.0.0.1:${port}/`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const problems = []; const notes = []; const errors = [];
const ok = (c, m) => { (c ? notes : problems).push(m); console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); return c; };
try {
  for (let i = 0; i < 80; i++) { try { if ((await fetch(BASE + 'index.html')).ok) break; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 150)); }
  const browser = await playwright.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e))); page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
  const boot = async () => { await page.goto(BASE); await page.waitForFunction(() => globalThis.__gb && __gb.storage && __gb.storage.mode !== 'starting', null, { timeout: 60000 }); };
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${n}.png`), fullPage: false }); };
  const go = async (name, params = {}) => { await page.evaluate(([n, p]) => import('/src/ui/router.js').then((R) => R.go(n, p)), [name, params]); await page.waitForTimeout(350); };
  const text = (sel) => page.evaluate((s) => document.querySelector(s)?.textContent || '', sel);
  await boot();
  // ---- a throwaway franchise with no founding Apex, a Basic, and an unidentified Apex prospect
  const S = await page.evaluate(async () => {
    const soak = await import('/tools/franchise-soak.mjs'); const F = await import('/src/franchise/franchise.js'); const M = await import('/src/data/monsters.js'); const P = await import('/src/franchise/t8/progression.js'); const R = await import('/src/core/rng.js'); const D = await import('/src/data/species.js'); const B = await import('/src/data/beast-dex.js');
    let f = null; for (let seed = 11; seed < 60 && !f; seed++) { const g = soak.newFranchise(seed, { difficulty: 'rookie' }); if (!g.roster.some((m) => m.dev?.apex)) f = g; }
    Object.assign(f.settings, { devNotices: false, tutorial: false, reducedMotion: false, reducedFlash: false }); f.scenes = []; f.achievementsBackfilled = true;
    const rng = R.createRng(91);
    const mk = (sp, id, apex) => { const m = M.generateMonster(rng, { species: sp.id, quality: 58, age: 20, yearsPro: 0, id, apexRoll: false }); if (apex) { m.dev = P.generateIndividual(rng, m.dev.form, { apex: true }); M.syncFromDev(m); } m.salary = M.salaryFor(m); return m; };
    const basicSp = D.SPECIES_DEX.find((s) => s.rarity === 'basic' && s.position === 'WR'); const ordSp = D.SPECIES_DEX.find((s) => s.rarity !== 'basic' && s.rarity !== 'legendary' && s.position === 'RB');
    const basic = mk(basicSp, 'chk_basic', false); basic.contract = { ends: f.season.year + 1 }; f.roster.push(basic);
    const ord = f.roster.find((m) => B.abilitiesOf(m.species)?.football); ord.dev.mastery = { football: 12, clash: 3 }; ord.dev.bank = { n: 3, d: 1 }; M.syncFromDev(ord);
    const r = F.scoutRegion(f, 'Coral Coast'); const apex = mk(ordSp, 'chk_apex', true); apex.origin = 'Coral Coast';
    f.week.prospects[0] = { ...f.week.prospects[0], monster: apex, revealed: 6, potentialKnown: false, natureKnown: false };
    __gb.f = f; await __gb.save({ immediate: true });
    const ab = B.abilitiesOf(ord.species);
    return { scout: r.ok, ord: ord.id, ordName: ord.name, fb: ab.football.name, cl: ab.clash.name, basic: basic.id, apex: apex.id, apexName: apex.name, bankShape: JSON.stringify(ord.dev.bank) };
  });
  ok(S.scout, 'setup: a franchise with no founding Apex, a Basic, an unidentified Apex prospect');

  // ---- 1. the monster profile
  await go('monster', { id: S.ord }); await shot('1-profile');
  const bars = await page.evaluate(() => [...document.querySelectorAll('.t8-bar-label')].map((e) => e.dataset.bar));
  ok(JSON.stringify(bars) === JSON.stringify(['level', 'mastery', 'training']), `profile: three bars in order (${bars.join(', ')})`);
  ok((await text('[data-bar="mastery"]')).includes(S.fb) && /Practiced/.test(await text('[data-bar="mastery"]')) && /12\/30/.test(await text('[data-bar="mastery"]')), `profile: football mastery bar names ${S.fb}, Practiced, 12/30`);
  const blocks = await page.evaluate(() => [...document.querySelectorAll('.ab-block')].map((e) => ({ id: e.dataset.ability, t: e.textContent })));
  ok(blocks.length === 2 && blocks[0].t.includes(S.fb) && blocks[1].t.includes(S.cl) && /-F$/.test(blocks[0].id) && /-C$/.test(blocks[1].id), `profile: both Dex abilities shown (${S.fb}; ${S.cl})`);
  await page.click('[data-action="mastery-mode"][data-v="clash"]'); await page.waitForTimeout(200);
  ok((await text('[data-bar="mastery"]')).includes(S.cl) && /Developing/.test(await text('[data-bar="mastery"]')) && /3\/10/.test(await text('[data-bar="mastery"]')), 'profile: the switch shows the Clash mastery record (Developing, 3/10)');
  await page.click('[data-action="mastery-mode"][data-v="football"]'); await page.waitForTimeout(200);
  ok(/3 training points to invest/.test(await text('[data-training="open"]')) && /Level-ups no longer give points/.test(await text('[data-training="open"]')), 'profile: 3 banked training points, explained without the retired level-up points');
  const tr = await page.evaluate(async (id) => { const rows = [...document.querySelectorAll('[data-attr-row]')]; const m = __gb.f.roster.find((x) => x.id === id); const d = m.dev;
    const ceilOk = rows.every((r) => r.querySelector('.v small')?.textContent === `/${d.potential[r.dataset.attrRow]}`);
    const k = rows.map((r) => r.dataset.attrRow).find((a) => d.current[a] < d.potential[a]); const before = d.current[k]; const bank0 = d.bank.n / d.bank.d;
    document.querySelector(`[data-action="spend"][data-attr="${k}"]`).click(); await new Promise((r) => setTimeout(r, 250));
    const m2 = __gb.f.roster.find((x) => x.id === id); return { rows: rows.length, ceilOk, plus: document.querySelectorAll('[data-action="spend"]').length, k, before, after: m2.dev.current[k], bank0, bank1: m2.dev.bank.n / m2.dev.bank.d, invest: m2.dev.invest[k].n / m2.dev.invest[k].d }; }, S.ord);
  ok(tr.rows === 12 && tr.ceilOk, 'training: all twelve attributes shown against their own ceilings');
  ok(tr.bank1 === tr.bank0 - 1 && (tr.after > tr.before || tr.invest > 0), `training: a + invests exactly one point (${tr.k}: ${tr.before} to ${tr.after}, bank ${tr.bank0} to ${tr.bank1})`);
  const capped = await page.evaluate(async (id) => { const m = __gb.f.roster.find((x) => x.id === id); const a = Object.keys(m.dev.current)[0]; m.dev.current[a] = m.dev.potential[a]; m.dev.bank = { n: 2, d: 1 }; (await import('/src/data/monsters.js')).syncFromDev(m); (await import('/src/ui/router.js')).render(); await new Promise((r) => setTimeout(r, 200)); const b = document.querySelector(`[data-action="spend"][data-attr="${a}"]`); return { disabled: !!b?.disabled, title: b?.title || '' }; }, S.ord);
  ok(capped.disabled && /ceiling/.test(capped.title), 'training: the + is disabled at an attribute\'s ceiling');
  await go('monster', { id: S.basic }); await shot('2-basic');
  ok(/Basic family has no signature ability/.test(await text('[data-bar="mastery"]')) && !(await page.$('.bar.mastery')) && !!(await page.$('[data-ability="none"]')), 'Basic: no ability, no mastery bar, said plainly');

  // ---- 2. Apex concealment and discovery
  await go('recruit', {}); await shot('3-recruit-hidden');
  const hidden = await page.evaluate(() => ({ html: document.querySelector('#screen').innerHTML, scene: !!document.querySelector('.apex-scene') }));
  ok(!hidden.scene && !/apex/i.test(hidden.html) && /potential unknown/.test(hidden.html) && !/potential 99/.test(hidden.html), 'unidentified Apex prospect: no panel, no emblem, no accent, no Apex text, potential unknown');
  ok(await page.evaluate((id) => !__gb.f.discovery?.apex?.[id], S.apex), 'unidentified Apex prospect: no discovery record');
  await page.evaluate(async () => { __gb.f.week.prospects[0].potentialKnown = true; (await import('/src/ui/router.js')).render(); });
  await page.waitForSelector('.apex-scene', { timeout: 4000 }); await page.waitForTimeout(300); await shot('4-apex-silhouette');
  const rec0 = await page.evaluate((id) => ({ ...__gb.f.discovery.apex[id] }), S.apex);
  ok(rec0.via === 'scouting' && rec0.shown === true, 'the potential-revealing report discovers the Apex; the panel is stamped as shown when it opens');
  const stage0 = await page.evaluate(() => document.querySelector('.apex-scene').dataset.stage); ok(stage0 === 'silhouette', 'panel: opens on the silhouette');
  await page.waitForFunction(() => document.querySelector('.apex-scene')?.dataset.stage === 'summary', null, { timeout: 8000 }); await page.waitForTimeout(700); await shot('5-apex-summary');
  const pan = await page.evaluate(() => { const el = document.querySelector('.apex-scene'); return { log: el.__apex.log.join('>'), text: el.textContent, steady: el.__apex.steady }; });
  ok(pan.log === 'silhouette>reveal>title>summary' && !pan.steady, `panel: plays its four stages (${pan.log})`);
  ok(/APEX DISCOVERED/.test(pan.text) && pan.text.includes(S.apexName) && /Potential 99 in every attribute/.test(pan.text) && /Starts undeveloped/.test(pan.text) && /Ageless/.test(pan.text) && /Neutral Temper/.test(pan.text) && /Current overall/.test(pan.text), 'panel: APEX DISCOVERED, the name, the four facts, current ratings kept apart');
  await page.click('[data-apex="replay"]'); await page.waitForTimeout(200); ok(await page.evaluate(() => document.querySelector('.apex-scene').dataset.stage === 'silhouette'), 'panel: Replay restarts it');
  await page.click('[data-apex="skip"]'); await page.waitForTimeout(150); ok(await page.evaluate(() => document.querySelector('.apex-scene').dataset.stage === 'summary'), 'panel: Skip goes straight to the confirmation');
  await page.click('[data-apex="continue"]'); await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({ scene: !!document.querySelector('.apex-scene'), html: document.querySelector('#screen').innerHTML }));
  ok(!after.scene && /apex-emblem/.test(after.html), 'after the panel: the prospect card carries the Apex emblem');
  // reload: the discovery stays, the panel does not replay
  await page.evaluate(() => __gb.save({ immediate: true })); await page.waitForTimeout(400); await boot();
  await page.evaluate(() => document.querySelector('[data-action="continue"], [data-action="resume"]')?.click()); await page.waitForTimeout(600);
  if (!(await page.evaluate(() => !!__gb.f))) { await page.evaluate(async () => { const st = __gb.storage.store; const list = await st.list?.(); if (list?.[0]) await __gb.open?.(list[0].id); }); await page.waitForTimeout(600); }
  const loaded = await page.evaluate((id) => ({ has: !!__gb.f, rec: __gb.f?.discovery?.apex?.[id] || null }), S.apex);
  ok(loaded.has && loaded.rec?.shown === true, 'reload: the franchise reopens with the discovery record');
  await go('hq', {}); await go('recruit', {}); await page.waitForTimeout(600);
  ok(!(await page.$('.apex-scene')) && /apex-emblem/.test(await page.evaluate(() => document.querySelector('#screen').innerHTML)), 'reload: the first discovery does not replay; the Apex stays identified');
  // acquisition of an unidentified Apex, an interrupted panel, the profile, replay, reduced flash
  const own = await page.evaluate(async () => { const M = await import('/src/data/monsters.js'); const P = await import('/src/franchise/t8/progression.js'); const R = await import('/src/core/rng.js'); const D = await import('/src/data/species.js'); const rng = R.createRng(55);
    const sp = D.SPECIES_DEX.find((s) => s.rarity !== 'basic' && s.rarity !== 'legendary' && s.position === 'LB'); const m = M.generateMonster(rng, { species: sp.id, quality: 58, age: 20, yearsPro: 0, id: 'chk_own_apex', apexRoll: false }); m.dev = P.generateIndividual(rng, m.dev.form, { apex: true }); M.syncFromDev(m); m.salary = M.salaryFor(m); m.contract = { ends: __gb.f.season.year + 1 }; const dev = JSON.stringify(m.dev); __gb.f.roster.push(m); return { id: m.id, dev }; });
  await go('roster', {}); await page.waitForSelector('.apex-scene', { timeout: 4000 });
  ok(await page.evaluate((id) => __gb.f.discovery.apex[id]?.via === 'roster', own.id), 'acquiring an unidentified Apex reveals it at once (panel opens on the next screen)');
  await page.waitForTimeout(500); await boot(); // interruption: the page is reloaded while the panel is still on its first stage
  await page.evaluate(() => document.querySelector('[data-action="continue"], [data-action="resume"]')?.click()); await page.waitForTimeout(600);
  await go('roster', {}); await page.waitForTimeout(700);
  const intr = await page.evaluate((o) => { const m = __gb.f?.roster.find((x) => x.id === o.id); return { scene: !!document.querySelector('.apex-scene'), same: m ? JSON.stringify(m.dev) === o.dev : false, emblem: /apex-emblem/.test(document.querySelector('#screen').innerHTML) }; }, own);
  ok(!intr.scene && intr.same && intr.emblem, 'interrupted panel: not replayed after the reload, the individual is unchanged, the roster card shows the emblem');
  await go('monster', { id: own.id }); await shot('6-apex-profile');
  const prof = await page.evaluate(() => ({ head: document.querySelector('#screen .panel').textContent, known: !!document.querySelector('.panel.apex-known'), facts: document.querySelector('.apex-panel')?.textContent || '' }));
  ok(prof.known && /APEX/.test(prof.head) && /potential 99 in every attribute/.test(prof.head) && /Ageless: never declines or retires/.test(prof.head), 'Apex profile: emblem, gold outline, potential 99 in every attribute, ageless');
  ok(/Potential 99 in every attribute/.test(prof.facts) && /Current overall/.test(prof.facts) && /Discovered/.test(prof.facts), 'Apex profile: the facts block with current ratings kept apart and when it was discovered');
  await page.click('[data-action="apex-replay"]'); await page.waitForSelector('.apex-scene', { timeout: 3000 }); ok(true, 'Apex profile: Replay discovery opens the panel again');
  await page.evaluate(() => { const a = document.querySelector('.apex-scene').__apex; a.skip(); a.close(); });
  await page.evaluate(() => { __gb.f.settings.reducedFlash = true; }); await page.click('[data-action="apex-replay"]'); await page.waitForSelector('.apex-scene', { timeout: 3000 });
  const st = await page.evaluate(() => { const el = document.querySelector('.apex-scene'); const r = { steady: el.__apex.steady, cls: el.className, anim: getComputedStyle(el.querySelector('.apex-figure')).animationName }; el.__apex.skip(); el.__apex.close(); __gb.f.settings.reducedFlash = false; return r; });
  ok(st.steady && /steady/.test(st.cls) && !/shake-ok/.test(st.cls) && st.anim === 'none', 'reduced flash: the steady version (plain outline and fades, no shake)');
  const ordinary = await page.evaluate((id) => { const html = document.querySelector('#screen').innerHTML; void html; return true; }, S.ord); void ordinary;
  await go('monster', { id: S.ord }); ok(!/apex/i.test(await page.evaluate(() => document.querySelector('#screen').innerHTML)), 'an ordinary monster\'s profile carries nothing Apex-specific');

  // ---- 3. Dex, See it, achievements, frame rate
  await go('dex', {}); const famId = await page.evaluate((id) => __gb.f.roster.find((m) => m.id === id).species, S.ord);
  await page.click(`[data-action="open"][data-id="${famId}"]`); await page.waitForSelector('.sheet .ab-block', { timeout: 3000 }); await shot('7-dex-sheet');
  const dex = await page.evaluate(() => document.querySelector('.sheet').textContent);
  ok(dex.includes(S.fb) && dex.includes(S.cl) && !/shared traits were retired/.test(dex), 'Beast Dex sheet: the family\'s two Dex abilities');
  await page.click('.sheet [data-see-it]'); await page.waitForSelector('#fbreview', { timeout: 15000 }); await page.waitForTimeout(1500); await shot('8-see-it');
  const see = await page.evaluate(() => ({ demo: !!document.querySelector('[data-see="demo"]'), review: !!document.querySelector('.sheet .sheet-review'), drawn: document.querySelector('#fbreview').childElementCount > 0 }));
  ok(see.demo && !see.review && see.drawn, 'See it: the real-engine demonstration plays, without the review tools');
  await page.evaluate(() => document.querySelectorAll('.sheet-backdrop').forEach((e) => e.querySelector('[data-action="sheet-close"]')?.click())); await page.waitForTimeout(300);
  await go('achievements', {}); const ach = await text('#screen');
  ok(/The original 72/.test(ach) && /Every Basic/.test(ach) && /The complete Beast Dex/.test(ach), 'achievements: the three collection achievements are listed');
  await go('settings', {}); await page.selectOption('[data-change="framerate"]', '30'); await page.waitForTimeout(200);
  const fr = await page.evaluate(() => ({ root: document.documentElement.dataset.frameRate, saved: __gb.f.settings.frameRate, flash: !!document.querySelector('[data-change="reducedflash"]') }));
  ok(fr.root === '30' && fr.saved === 30 && fr.flash, 'settings: 30 FPS battery saver is selectable and saved; Reduce flashes is there');
  await page.selectOption('[data-change="framerate"]', '60'); await page.waitForTimeout(150); ok(await page.evaluate(() => document.documentElement.dataset.frameRate === '60' && __gb.f.settings.frameRate === 60), 'settings: back to 60 FPS');
  ok(errors.length === 0, `page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close();
} catch (e) { problems.push('check crashed: ' + (e.stack || e)); console.log('FAIL check crashed: ' + (e.stack || e)); } finally { server.kill(); }
console.log(problems.length ? `\n${problems.length} PROBLEM(S)` : '\nOK: no problems'); process.exit(problems.length ? 1 : 0);
