#!/usr/bin/env node
// Browser check for the second Task 8 presentation pass (docs/task8/FX_FOOTBALL_MATRIX.md I2, I4, I5): headless Chromium as a phone
// (390x844) opens the real game, starts a real franchise Sunday game on the match screen (the render-perf harness's setup) and
//   1. I5 Sovereign Arm: puts a defender on the game's own absence list, and photographs the play-call screen with his spot empty
//      under the dragon mouth, the real snap that serves the absence (the mark stays on the empty spot), and the next play-call
//      screen, where his return plays once and is not replayed by a re-render;
//   2. I5 in the Ability Reviewer: the Sovereign Arm sequence, the served play and the pre-rolled return;
//   3. I4 inspect: makes the club's linebacker a Steelpaw and its safety a Noctlet, plays real defensive snaps, and opens the inspect
//      sheet from the formation and from the ability strip: stamina with Iron Lungs' saved-drain tick, Night Watch's Dark-awareness
//      protection;
//   4. I2: makes the club's receiver a Gustling and photographs the Runway on the play-call screen before the snap and in the play.
// Nothing is saved to a real career (a throwaway franchise in a fresh browser profile). Screenshots go to --shots=DIR.
//   node tools/fx-finish2-check.mjs --shots=DIR
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname); const ROOT = path.resolve(HERE, '..');
const req = createRequire(import.meta.url);
let playwright; try { playwright = req('playwright'); } catch { playwright = createRequire(path.join(execSync('npm root -g').toString().trim(), 'x.js'))('playwright'); }
const arg = (k, d = null) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(a.indexOf('=') + 1) : d; };
const SHOTS = path.resolve(arg('shots', 'fx-finish2-shots')); fs.mkdirSync(SHOTS, { recursive: true });
async function waitHttp(url, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { const r = await fetch(url); if (r.ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 150)); } throw new Error(`server not up: ${url}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 9200 + Math.floor(Math.random() * 300); const BASE = `http://127.0.0.1:${port}/`;
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
  const closeSheet = () => page.evaluate(() => document.querySelector('.sheet [data-action="sheet-close"]')?.click());
  const clickAny = () => page.evaluate(() => { const q = (s) => document.querySelector(s); const close = q('.sheet [data-action="sheet-close"]'); if (close) close.click();
    for (const a of ['kickoff', 'continue', 'trykick']) { const b = q(`#controls [data-action="${a}"]`); if (b) { b.click(); return a; } } return null; });
  const phase = () => page.evaluate(() => { const G = globalThis.__gb.f.game; return { phase: G.state.phase, mine: G.state.possession === G.playerSide, down: G.state.down, finished: G.state.finished }; });
  const field = () => page.evaluate(() => { const f = document.querySelector('#field'); const h = f?.innerHTML || ''; return { out: (h.match(/>OUT</g) || []).length, returns: (h.match(/>returns</g) || []).length, sprites: f?.querySelector('.fv-pl')?.children.length || 0, rects: f?.querySelectorAll('rect.t8-field').length || 0, post: f?.querySelector('.fv-post')?.querySelectorAll('*').length || 0 }; });
  /** Put the game on a first down for the given side (the player's offense or defense) and redraw the play-call screen. */
  const situation = (mine, k = 0) => page.evaluate(async ([own, n]) => { const f = globalThis.__gb.f; const R = await import('/src/ui/router.js'); const G = f.game; const s = G.state; const me = G.playerSide; const them = me === 'home' ? 'away' : 'home';
    Object.assign(s, { phase: 'scrimmage', possession: own ? me : them, down: 1, toGo: 10, ballOn: 35, ballLat: 0, finished: false }); if (s.quarter > 3) { s.quarter = 1; s.clock = 600; } if (n) s.rngState = (Number(s.rngState) + 7919 * n) >>> 0; G.lastEvent = null; G.aiCall = null; R.render(); }, [mine, k]);
  const pickCard = (i = 0) => page.evaluate((k) => { const c = document.querySelectorAll('#controls .card')[k]; if (c) c.click(); return !!c; }, i);
  const snap = async (hold = true) => { if (hold) await page.evaluate(() => { globalThis.__gbRenderPerf.clock = () => 0; }); await page.evaluate(() => document.querySelector('#controls [data-action="snap"]')?.click()); await settle(); return page.evaluate(() => globalThis.__gbRenderPerf.animInfo()); };
  const holdAt = async (info, frames) => { await page.evaluate((t) => { globalThis.__gbRenderPerf.clock = () => t; }, info.start + frames * info.msPerFrame); await settle(); };

  for (let i = 0; i < 12; i++) { const p = await phase(); if (p.phase === 'scrimmage' && !(await busy())) break; await clickAny(); await settle(); await finishPlay(); }
  check((await phase()).phase === 'scrimmage', 'a real franchise game is at its first play-call screen');

  // ---- 1. I5: Sovereign Arm on the real match screen: absence on the formation, the served snap, the return
  let sov = null;
  for (let attempt = 0; attempt < 8 && !sov; attempt++) {
    await situation(true, attempt); await pickCard(0); await settle(); const base = await field();
    const who = await page.evaluate(async () => { const f = globalThis.__gb.f; const F = await import('/src/franchise/franchise.js'); const R = await import('/src/ui/router.js'); const G = f.game; const s = G.state; const me = G.playerSide; const them = me === 'home' ? 'away' : 'home';
      const T = F.sundayMatchup(f); const cb = T[them].defense.CB1; s.t8 ||= { status: {} }; s.t8.absences = [{ mid: cb.id, serveOn: me, ability: 'DRA-06-F', by: T[me].offense.QB.id }]; R.render(); return { name: cb.name, id: cb.id }; });
    await settle(); const out = await field(); const chip = await page.evaluate(() => document.querySelector('.edge-chip.absent:not(.returned)')?.textContent.trim() || '');
    if (!out.out) { await page.evaluate(() => { globalThis.__gb.f.game.state.t8.absences = []; }); continue; } // this defensive look does not line him up: try the next situation
    await shot('1a-playcall-defender-out');
    const info = await snap(); if (!info) { await finishPlay(); continue; }
    await holdAt(info, 4); const inPlay = await field(); await shot('1b-served-play-empty-spot');
    await finishPlay(); const st = await page.evaluate(() => { const G = globalThis.__gb.f.game; const s = G.state; return { phase: s.phase, mine: s.possession === G.playerSide, absences: (s.t8?.absences || []).length, finished: s.finished }; });
    const back0 = await field(); const chipBack = await page.evaluate(() => document.querySelector('.edge-chip.absent.returned')?.textContent.trim() || '');
    if (st.phase !== 'scrimmage' || !st.mine || !back0.returns) { await clickAny(); await settle(); await finishPlay(); continue; } // a score or a turnover: his defense is not lined up next; stage it again
    await shot('1c-playcall-return-opening'); await sleep(380); const back1 = await field(); await shot('1d-playcall-return-lifting');
    await sleep(1500); await settle(); const back2 = await field(); await shot('1e-playcall-returned-settled');
    await pickCard(1); await settle(); await sleep(150); const again = await field(); const chipStill = await page.evaluate(() => !!document.querySelector('.edge-chip.absent.returned'));
    sov = { attempt: attempt + 1, who: who.name, base, out, chip, inPlay, served: st, back0, back1, back2, again, chipBack, chipStill };
  }
  report.sovereign = sov;
  check(!!sov, `the Sovereign Arm sequence ran on the real match screen (attempt ${sov?.attempt ?? '-'}, defender ${sov?.who ?? '-'})`);
  if (sov) {
    check(sov.out.out === 1 && sov.out.sprites === sov.base.sprites - 1, `while he is out the formation is drawn without him and his spot is marked (${sov.base.sprites} -> ${sov.out.sprites} monsters, mark ${sov.out.out})`);
    check(/swallowed/.test(sov.chip), `the portrait chip under the dragon mouth stays in the scoreboard strip: "${sov.chip}"`);
    check(sov.inPlay.out === 1, 'the play that serves the absence keeps the mark on his empty spot'); check(sov.served.absences === 0, 'the engine served the absence at that snap');
    check(sov.back0.returns === 1 && sov.back0.sprites === sov.base.sprites && sov.back0.out === 0, `on the next play-call screen he is back in the formation and his return plays (${sov.back0.sprites} monsters)`);
    check(sov.back1.returns === 1 && sov.back1.post !== sov.back0.post || sov.back1.returns === 1, 'the return is still animating a moment later'); check(sov.back2.returns === 0, 'the return ends on its own');
    check(sov.again.returns === 0 && sov.chipStill, 're-rendering the play-call screen (another play chosen) does not replay the return; the chip stays for this play'); check(/is back in the formation/.test(sov.chipBack), `the strip says so: "${sov.chipBack}"`);
  }

  // ---- 3. I4: inspect on the real match screen (the club's own defense: a Steelpaw at linebacker, a Noctlet at safety)
  const defenseSetup = await page.evaluate(async () => { const f = globalThis.__gb.f; const F = await import('/src/franchise/franchise.js'); const { PLAYS } = await import('/src/data/playbook.js'); const G = f.game; const s = G.state; const me = G.playerSide; const T = F.sundayMatchup(f)[me];
    // the roster monster is what the game reads (form and mastery live in its development record); the line-up object is updated too
    const turn = (m, species, type, mastery) => { Object.assign(m, { species, form: `${species}:0`, type, mastery }); const r = f.roster.find((x) => x.id === m.id); if (r) { Object.assign(r, { species, type }); r.dev = { ...(r.dev || {}), form: `${species}:0`, mastery: { ...(r.dev?.mastery || {}), football: mastery } }; } };
    // the defensive call that lines the most allies up inside the safety's watch (7 yd at mastery 3). When none of this week's six
    // cards does, the club's Friday plan gets that call as its first card (a plan the player could have set himself).
    const inside = (id, slot) => { const p = PLAYS[id]; if (!p?.align?.[slot] || !p.onField.includes('LB1')) return -1; return p.onField.filter((sl) => sl !== slot && T.defense[sl]?.id && Math.hypot(p.align[sl][0] - p.align[slot][0], p.align[sl][1] - p.align[slot][1]) <= 7).length; };
    const cards = (T.defensePlays || []).slice(0, 6); let pick = { slot: 'FS', id: cards[0], n: -1 };
    for (const slot of ['FS', 'SS'].filter((sl) => T.defense[sl]?.id)) for (const id of cards) { const k = inside(id, slot); if (k > pick.n) pick = { slot, id, n: k }; }
    let planned = false;
    if (pick.n < 1) { const all = Object.values(PLAYS).filter((p) => p.side === 'defense' && !p.legendary && p.onField.every((sl) => T.defense[sl]?.id)); for (const p of all) { const k = inside(p.id, 'FS'); if (k > pick.n) pick = { slot: 'FS', id: p.id, n: k }; }
      if (!cards.includes(pick.id)) { f.week.plan.defense = [pick.id, ...cards.filter((x) => x !== pick.id)].slice(0, 6); planned = true; } }
    const lb = T.defense.LB1, fs = T.defense[pick.slot]; turn(lb, 'steelpaw', 'Metal', 0); turn(fs, 'nightowl', 'Dark', 3);
    if (s.t8) { s.t8.absences = []; if (s.t8.ability) { delete s.t8.ability[lb.id]; delete s.t8.ability[fs.id]; } if (s.t8.fields) { s.t8.fields.list = []; s.t8.fields.pending = []; } }
    return { lb: { id: lb.id, name: lb.name }, fs: { id: fs.id, name: fs.name, slot: pick.slot }, card: pick.id, planned, inside: pick.n, cb: T.defense.CB1?.id }; });
  const pickDef = () => page.evaluate((id) => { const c = document.querySelector(`#controls .card[data-id="${id}"]`) || document.querySelector('#controls .card'); if (c && c.getAttribute('aria-pressed') !== 'true') c.click(); return c?.dataset.id || null; }, defenseSetup.card);
  /** Click a monster of the drawn formation (a real click on its sprite) by monster id; returns whether it was found. */
  const tapMonster = (mid) => page.evaluate(async (id) => { const f = globalThis.__gb.f; const F = await import('/src/franchise/franchise.js'); const R = await import('/src/sim/rules.js'); const { PLAYS } = await import('/src/data/playbook.js'); const G = f.game; const s = G.state; const me = G.playerSide; const T = F.sundayMatchup(f);
    const dS = s.possession === 'home' ? 'away' : 'home'; if (dS !== me) return false; const play = PLAYS[G.selected.defense]; if (!play) return false; const sl = R.pickSlots(T[me].defense, play.onField, T[me], play); const i = play.onField.findIndex((x) => sl[x]?.id === id); if (i < 0) return false;
    const g = document.querySelector('#field .fv-pl').children[i]; const el = g?.querySelector('use') || g?.firstElementChild; if (!el) return false; el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); return true; }, mid);
  const sheetText = async () => { await sleep(320); return sheetText0(); }; // the sheet's own slide-in has finished
  const sheetText0 = () => page.evaluate(() => { const el = document.querySelector('.sheet .inspect'); if (!el) return null; const sec = (k) => el.querySelector(`[data-sec="${k}"]`)?.textContent.replace(/\s+/g, ' ').trim() || ''; return { who: el.querySelector('b')?.textContent || '', stamina: sec('stamina'), awareness: sec('awareness'), status: sec('status'), ability: sec('ability'), ticks: [...el.querySelectorAll('.inspect-note.tick')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()), bar: !!el.querySelector('.inspect-bar') }; });
  const bankDark = () => page.evaluate((cb) => { const G = globalThis.__gb.f.game; const s = G.state; s.t8 ||= { status: {} }; s.t8.fields ||= { list: [], pending: [], seq: 0 }; if (s.t8.fields.list.some((f) => f.type === 'Dark') || s.t8.fields.pending.length) return;
    s.t8.fields.pending.push({ owner: cb, ownerTeam: G.playerSide, side: 'def', type: 'Dark', ability: 'DAR-01-F', strength: 20, lifetime: 3, clock: 'teamDefense', width: 44, length: 24, lbDepth: 8, latHome: 0 }); }, defenseSetup.cb);
  const strip = () => page.evaluate(() => [...document.querySelectorAll('.ability-strip span[data-inspect]')].map((x) => ({ text: x.textContent.replace(/\s+/g, ' ').trim(), mid: x.dataset.inspect })));
  let ins = { first: null, lungs: null, lungsAlly: null, watchPre: null, watchTick: null, hint: '' };
  await situation(false, 0); await bankDark(); await pickDef(); await settle(); await sleep(1200);
  ins.hint = await page.evaluate(() => document.querySelector('.tm-legend')?.textContent.trim() || '');
  await shot('3a-defense-playcall-tap-to-inspect');
  check(await tapMonster(defenseSetup.lb.id), 'a monster of the formation is tappable'); await settle(); ins.first = await sheetText(); await shot('3b-inspect-steelpaw-first-qualifying-play'); await closeSheet(); await settle();
  // Night Watch before the snap: an ally lined up inside the safety's watch, and the safety's own sheet
  const allyInside = await page.evaluate(async (d) => { const f = globalThis.__gb.f; const F = await import('/src/franchise/franchise.js'); const { PLAYS } = await import('/src/data/playbook.js'); const G = f.game; const T = F.sundayMatchup(f)[G.playerSide]; const p = PLAYS[G.selected.defense];
    const at = p.align[d.slot]; const c = p.onField.filter((sl) => sl !== d.slot && T.defense[sl]?.type !== 'Dark').map((sl) => ({ sl, id: T.defense[sl].id, name: T.defense[sl].name, d: Math.hypot(p.align[sl][0] - at[0], p.align[sl][1] - at[1]) })).sort((a, b) => a.d - b.d)[0]; return c && c.d <= 7 ? c : null; }, defenseSetup.fs);
  if (allyInside) { await tapMonster(allyInside.id); await settle(); ins.watchPre = await sheetText(); await shot('3c-inspect-ally-inside-night-watch'); await closeSheet(); await settle(); }
  await tapMonster(defenseSetup.fs.id); await settle(); ins.watchOwn = await sheetText(); await shot('3d-inspect-noctlet-night-watch'); await closeSheet(); await settle();
  // real defensive snaps until Iron Lungs saves a point (its second qualifying play) and Night Watch protects an ally in the Dark field
  for (let k = 0; k < 14 && !(ins.lungs && ins.watchTick); k++) {
    const p = await phase(); if (p.phase !== 'scrimmage' || p.mine) { await situation(false, k + 1); await pickDef(); await settle(); } else if (!(await page.evaluate(() => !!document.querySelector('#controls [data-action="snap"]:not([disabled])')))) { await pickDef(); await settle(); }
    await bankDark(); const info = await snap(false); if (info) await finishPlay(); await settle();
    (ins.trace ||= []).push(await page.evaluate(() => { const G = globalThis.__gb.f.game; return { text: (G.lastEvent?.text || '').slice(0, 60), abilities: (G.lastEvent?.abilities || []).map((a) => `${a.who}: ${a.what}${a.tick ? ' (' + a.tick + ')' : ''}`) }; }));
    const S = await strip(); const lungs = S.find((x) => /Iron Lungs/.test(x.text) && /saved 1 stamina/.test(x.text)); const watch = S.find((x) => /Night Watch/.test(x.text));
    if (lungs && !ins.lungs) { await shot('3e-ability-strip-iron-lungs-tick');
      await page.evaluate((id) => document.querySelector(`.ability-strip span[data-inspect="${id}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })), lungs.mid); await settle(); ins.lungs = { strip: lungs.text, sheet: await sheetText() }; await shot('3f-inspect-steelpaw-saved-drain-tick'); await closeSheet(); await settle(); }
    if (watch && !ins.watchTick) { const ally = await page.evaluate(() => globalThis.__gb.f.game.lastEvent?.inspect?.watch?.[0] || null);
      if (ally) { const p2 = await phase(); if (p2.phase === 'scrimmage' && !p2.mine) { await pickDef(); await settle(); if (await tapMonster(ally)) { await settle(); ins.watchTick = { strip: watch.text, sheet: await sheetText() }; await shot('3g-inspect-ally-night-watch-tick'); await closeSheet(); await settle(); } } } }
    if (await page.evaluate(() => !!document.querySelector('#controls [data-action="continue"]'))) { await clickAny(); await settle(); await finishPlay(); }
  }
  report.inspect = { setup: defenseSetup, ...ins };
  check(/inspect/i.test(ins.hint), `the play-call screen says monsters can be inspected: "${ins.hint}"`);
  check(!!ins.first && ins.first.bar && /Stamina\s*\d+(\.\d)? \/ \d+/.test(ins.first.stamina), `the inspect sheet opens from the formation with the stamina block: "${(ins.first?.stamina || '').slice(0, 150)}"`);
  check(/Steadied by his own Iron Lungs: first of two qualifying plays/.test(ins.first?.stamina || ''), 'Iron Lungs: before his first qualifying play the stamina block says the saving comes on the next one');
  check(/Iron Lungs/.test(ins.first?.ability || ''), `the sheet names his ability: "${(ins.first?.ability || '').slice(0, 80)}"`);
  check(!!ins.lungs && ins.lungs.sheet?.ticks.some((t) => /Iron Lungs saved 1 stamina on the last play/.test(t)), `Iron Lungs: after a real second qualifying play the stamina block carries the saved-drain tick (strip: "${ins.lungs?.strip || '-'}")`);
  check(!allyInside || /Dark-awareness protection: inside .*Night Watch \(7 yd\)/.test(ins.watchPre?.awareness || ''), `Night Watch: an ally inside the watch shows the Dark-awareness protection before the snap: "${(ins.watchPre?.awareness || '(no ally lined up inside the watch)').slice(0, 170)}"`);
  check(/Night Watch \(7 yd\): watching over /.test(ins.watchOwn?.awareness || ''), `Night Watch: the safety's own sheet says whom he watches: "${(ins.watchOwn?.awareness || '').slice(0, 150)}"`);
  check(!!ins.watchTick && ins.watchTick.sheet?.ticks.some((t) => /Night Watch kept his Awareness full/.test(t)), `Night Watch: after a real play in a Dark field the protected ally's sheet carries the tick (strip: "${ins.watchTick?.strip || '-'}")`);

  // ---- 4. I2: a field the snap itself creates, shown before the snap when its place does not follow the calls (Runway)
  await page.evaluate(async () => { const f = globalThis.__gb.f; const F = await import('/src/franchise/franchise.js'); const G = f.game; const s = G.state; const T = F.sundayMatchup(f)[G.playerSide]; const wr = T.offense.WR1;
    for (const x of [wr, f.roster.find((r) => r.id === wr.id)]) if (x) Object.assign(x, { species: 'gustling', form: 'gustling:0', type: 'Wind', mastery: 0 }); if (s.t8?.ability) delete s.t8.ability[wr.id]; if (s.t8?.fields) { s.t8.fields.list = []; s.t8.fields.pending = []; } });
  await situation(true, 11); await pickCard(0); await sleep(450); const rw0 = await field(); await shot('4a-playcall-runway-reveal'); await sleep(1600); await settle(); const rw1 = await field(); await shot('4b-playcall-runway-settled');
  const place0 = await page.evaluate(() => { const r = document.querySelector('#field rect.t8-field'); return r ? ['x', 'y', 'width', 'height'].map((k) => r.getAttribute(k)).join(',') : null; });
  await pickCard(1); await settle(); await sleep(120); const place1 = await page.evaluate(() => { const r = document.querySelector('#field rect.t8-field'); return r ? ['x', 'y', 'width', 'height'].map((k) => r.getAttribute(k)).join(',') : null; });
  const infoR = await snap(); let rwPlay = null; if (infoR) { await holdAt(infoR, 3); rwPlay = await page.evaluate(() => { const r = document.querySelector('#field rect.t8-field'); return r ? { opacity: r.getAttribute('opacity') || '1', el: r.dataset.element } : null; }); await shot('4c-snap-runway-in-play'); await finishPlay(); }
  report.runway = { rw0, rw1, place0, place1, rwPlay };
  check(rw1.rects === 1 && rw0.post + rw0.rects > 0, `Runway is drawn on the play-call screen before the snap (rect ${rw1.rects})`);
  check(!!place0 && (place1 === null || place1 === place0), `choosing another play does not move it (${place0} -> ${place1 ?? 'not on the field for that call'})`);
  check(!!rwPlay && Number(rwPlay.opacity) === 1 && rwPlay.el === 'Wind', 'the snap creates it there and the play does not reveal it a second time');

  // ---- 2. I5 in the Ability Reviewer: the served play and the pre-rolled return
  await closeSheet(); await page.evaluate(() => import('/src/ui/router.js').then((R) => R.go('ability-reviewer', {}))); await page.waitForSelector('[data-action="scenario"]', { timeout: 20000 });
  await page.click('[data-action="scenario"][data-f="aurodrax"]'); await page.waitForSelector('#fbreview', { state: 'attached', timeout: 120000 }); await page.waitForFunction(() => document.querySelector('#fbreview')?.__rv2, null, { timeout: 60000 });
  const plan = await page.evaluate(() => { const R = document.querySelector('#fbreview').__rv2; return R.prepared.map((P, i) => ({ i, preroll: P.preroll, staged: (P.fx?.t8?.items || []).filter((it) => it.staged).map((it) => it.kind) })); });
  const sPlay = plan.find((p) => p.staged.includes('dragon_absent')), bPlay = plan.find((p) => p.staged.includes('dragon_return'));
  const rv = async (pi, t, name) => { const n = await page.evaluate(([i, time]) => { const R = document.querySelector('#fbreview').__rv2; R.seek(i, time); const h = document.querySelector('#fbreview').innerHTML; return { out: (h.match(/>OUT</g) || []).length, returns: (h.match(/>returns</g) || []).length, swallow: /out next play/.test(h) }; }, [pi, t]);
    await page.evaluate(() => document.querySelector('#fbreview').scrollIntoView({ block: 'center' })); await shot(name); return n; };
  const rvSw = await rv(0, 2.45, '2a-reviewer-swallow'); const rvOut = sPlay ? await rv(sPlay.i, 0.6, '2b-reviewer-served-play-empty-spot') : null;
  const rvR0 = bPlay ? await rv(bPlay.i, -1.05, '2c-reviewer-return-opening') : null, rvR1 = bPlay ? await rv(bPlay.i, -0.45, '2d-reviewer-return-lifting') : null, rvR2 = bPlay ? await rv(bPlay.i, 0.3, '2e-reviewer-back-in-formation') : null;
  report.reviewer = { plan, rvSw, rvOut, rvR0, rvR1, rvR2 };
  check(!!sPlay && rvOut?.out === 1, `reviewer: play ${sPlay ? sPlay.i + 1 : '-'} (the absence served) shows the empty spot`);
  check(!!bPlay && bPlay.preroll >= 1.4 && rvR0?.returns === 1 && rvR1?.returns === 1 && rvR2?.returns === 0, `reviewer: play ${bPlay ? bPlay.i + 1 : '-'} pre-rolls the return before the snap (${bPlay?.preroll?.toFixed(2)} s) and it is over at the snap`);

  check(errors.length === 0, `page errors: ${errors.length}${errors.length ? ' ' + errors.slice(0, 3).join(' | ') : ''}`);
  report.errors = errors; await browser.close();
} catch (e) { problems.push(String(e?.stack || e)); console.log('FAIL', String(e?.stack || e)); }
finally { server.kill(); }
fs.writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify({ problems, ...report }, null, 2));
console.log(problems.length ? `PROBLEMS: ${problems.length}` : 'OK: no problems'); process.exit(problems.length ? 1 : 0);
