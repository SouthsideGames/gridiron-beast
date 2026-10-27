// Practice field and the developer Playbook Audit. Both use the same engine
// and field renderer as matches.

import { esc, delegate, toast, sheet } from '../dom.js';
import * as F from '../../franchise/franchise.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS, RESERVE_OFFENSE_IDS, RESERVE_DEFENSE_IDS } from '../../data/playbook.js';
import { simulatePlay } from '../../sim/engine.js';
import { pickSlots } from '../../sim/rules.js';
import { fieldSvg, FIELD_VIEWBOX, cameraFor } from '../field-view.js';
import { playCardSvg, legendHtml } from '../play-art.js';
import { playDetailHtml, lessonHtml } from './hq.js';
import { generatedTeam } from '../../franchise/roster.js';
import { createRng } from '../../core/rng.js';
import { buildFx, endHold } from '../ability-fx.js';
import { reviewHtml, reviewHandlers, reviewState, NEEDS_OWNER, STATE_BADGE, reviewsText, devBadge, flagPlayMoment } from '../dev-review.js';
import { syncReviews } from '../../franchise/review-store.js';
import { resolveSpecies } from '../../data/monsters.js';
import { qbReadPanelHtml, qbReadsShown } from '../qb-read-ui.js';

export function registerPracticeScreens(Router, app) {
  const prac = { offense: 'quick_slants', defense: 'cover_3', ballOn: 30, sim: null, i: 0, raf: null, seed: 1, showArt: true };

  function teamsForPractice(f) {
    if (f) { const t = F.playerTeam(f); return { offense: t, defense: t, offensePlays: F.catalog(f, 'offense'), defensePlays: F.catalog(f, 'defense') }; }
    const t = generatedTeam(77, { id: 'p', name: 'Practice Squad', abbr: 'PRA' });
    return { offense: t, defense: t, offensePlays: OFFENSE_IDS, defensePlays: DEFENSE_IDS };
  }

  Router.registerScreen('practice', {
    title: 'Practice Field', tabs: false,
    render({ f, params }) {
      if (params.play && PLAYS[params.play]) { prac[PLAYS[params.play].side] = params.play; params.play = null; }
      const T = teamsForPractice(f);
      if (!T.offensePlays.includes(prac.offense)) prac.offense = T.offensePlays[0];
      if (!T.defensePlays.includes(prac.defense)) prac.defense = T.defensePlays[0];
      const frame = prac.sim ? prac.sim.frames[Math.min(prac.i, prac.sim.frames.length - 1)] : null;
      const presnap = !prac.sim && prac.showArt ? { play: PLAYS[prac.offense], offensePlay: PLAYS[prac.offense], defensePlay: PLAYS[prac.defense] } : !prac.sim ? { offensePlay: PLAYS[prac.offense], defensePlay: PLAYS[prac.defense] } : null;
      const field = fieldSvg({ ballOn: prac.ballOn, ballLat: 0, toGo: 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame, prevFrame: prac.sim ? prac.sim.frames[Math.min(prac.i, prac.sim.frames.length - 1) - 1] || null : null, fx: prac.sim ? prac.fx : null, fxQuality: app.settings.reducedMotion ? 'min' : 'full', qbRead: qbReadsShown(app.f?.settings || app.settings, { live: true }), sprites: prac.sim ? prac.sprites : null, presnap, ownLabel: 'OWN', oppLabel: 'OPP', camera: cameraFor(prac.ballOn) });
      const sel = (id, list, name) => `<label class="field">${name}<select data-change="${name === 'Offense' ? 'off' : 'def'}">${list.map((p) => `<option value="${p}" ${p === id ? 'selected' : ''}>${esc(PLAYS[p].name)}</option>`).join('')}</select></label>`;
      const result = prac.sim ? `<div class="field-banner ${prac.sim.touchdown || prac.sim.turnover ? 'important' : ''}">${esc(resultText(prac.sim))}</div>` : '';
      return `<p class="muted">Run your plays against your own defense. Same engine as Sunday; ${f ? 'your current starters' : 'a practice squad'} on both sides.</p>
        <div class="field-wrap" id="fieldwrap"><svg id="field" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Practice field">${field}</svg>${result}</div>
        <div class="grid2">${sel(prac.offense, T.offensePlays, 'Offense')}${sel(prac.defense, T.defensePlays, 'Defense')}</div>
        <div class="row between"><label class="row muted" style="gap:4px"><input type="checkbox" data-change="art" ${prac.showArt ? 'checked' : ''} style="width:auto;min-height:0;margin:0"> Show play art</label><label class="row muted" style="gap:4px">Ball on <input type="number" min="1" max="99" value="${prac.ballOn}" data-change="spot" style="width:64px;min-height:36px;margin:0"></label></div>
        <div class="grid2" style="margin-top:8px"><button class="btn primary big" data-action="run">▶ Run play</button><button class="btn big" data-action="again" ${prac.sim ? '' : 'disabled'}>↻ Same seed</button></div>
        <div class="grid2" style="margin-top:8px"><button class="btn" data-action="detail" data-id="${prac.offense}">Offense details</button><button class="btn" data-action="detail" data-id="${prac.defense}">Defense details</button></div>
        ${lessonHtml(prac.lessonSide === 'defense' ? prac.defense : prac.offense)}<div class="row" style="justify-content:center"><button class="btn small ${prac.lessonSide !== 'defense' ? 'primary' : ''}" data-action="lesson" data-v="offense">Offense lesson</button><button class="btn small ${prac.lessonSide === 'defense' ? 'primary' : ''}" data-action="lesson" data-v="defense">Defense lesson</button></div>
        ${prac.sim?.qb && qbReadsShown(app.f?.settings || app.settings) ? qbReadPanelHtml(prac.sim, (slot, side) => `${prac.sim.names?.[side === 'def' ? 'def' : 'off']?.[slot] || slot} (${slot})`) : ''}
        ${prac.sim ? `<h3>Events</h3><div class="log">${prac.sim.events.map((e) => `<div class="entry"><span class="t">${e.t.toFixed(1)}s</span><span>${esc(e.text)}</span></div>`).join('')}</div><p class="dim">Seed ${prac.sim.seed} · ${prac.sim.frames.length} frames · ${prac.sim.elapsed}s</p>` : ''}`;
    },
    mount(root, ctx) {
      const run = (seed) => {
        const T = teamsForPractice(app.f);
        const o = PLAYS[prac.offense], d = PLAYS[prac.defense];
        prac.seed = seed; prac.sim = simulatePlay({ offensePlay: o, defensePlay: d, offense: pickSlots(T.offense.offense, o.onField), defense: pickSlots(T.defense.defense, d.onField), ballOn: prac.ballOn, seed });
        const lookup = (team, slot) => { const m = (team === 'off' ? T.offense.offense : T.defense.defense)?.[slot]; if (!m) return null; const sp = resolveSpecies(m); return { element: sp?.element || null, name: m.name, species: sp?.id || null }; };
        prac.fx = buildFx(prac.sim, lookup); prac.sprites = app.settings.fieldMarkers === 'simple' ? null : { off: { map: T.offense.offense, pool: [] }, def: { map: T.defense.defense, pool: [] } };
        prac.i = 0; Router.render();
        const svg = document.querySelector('#field'); const start = performance.now(); const ms = 100 / (app.settings.speed || 1);
        const n = prac.sim.frames.length; const hold = endHold(prac.fx, prac.sim.frames[n - 1].t ?? 0);
        const tick = (now) => { const raw = Math.floor((now - start) / ms); if (raw > n - 1) { const extra = (raw - (n - 1)) * 0.1; if (extra < hold && svg) { svg.innerHTML = fieldSvg({ ballOn: prac.ballOn, ballLat: 0, toGo: 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame: prac.sim.frames[n - 1], prevFrame: prac.sim.frames[n - 1], fx: prac.fx, fxQuality: app.settings.reducedMotion ? 'min' : 'full', qbRead: qbReadsShown(app.f?.settings || app.settings, { live: true }), sprites: prac.sprites, time: (prac.sim.frames[n - 1].t ?? 0) + extra, camera: cameraFor(prac.ballOn), ownLabel: 'OWN', oppLabel: 'OPP' }); prac.raf = requestAnimationFrame(tick); return; } Router.render(); return; }
          const idx = Math.min(n - 1, raw); if (idx !== prac.i && svg) { prac.i = idx; svg.innerHTML = fieldSvg({ ballOn: prac.ballOn, ballLat: 0, toGo: 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame: prac.sim.frames[idx], prevFrame: prac.sim.frames[idx - 1] || null, fx: prac.fx, fxQuality: app.settings.reducedMotion ? 'min' : 'full', qbRead: qbReadsShown(app.f?.settings || app.settings, { live: true }), sprites: prac.sprites, camera: cameraFor(prac.ballOn), ownLabel: 'OWN', oppLabel: 'OPP' }); } prac.raf = requestAnimationFrame(tick); };
        cancelAnimationFrame(prac.raf); prac.raf = app.settings.reducedMotion ? (prac.i = prac.sim.frames.length - 1, Router.render(), null) : requestAnimationFrame(tick);
      };
      delegate(root, {
        off: (el) => { prac.offense = el.value; prac.sim = null; Router.render(); }, def: (el) => { prac.defense = el.value; prac.sim = null; Router.render(); },
        art: (el) => { prac.showArt = el.checked; Router.render(); }, spot: (el) => { prac.ballOn = Math.max(1, Math.min(99, Number(el.value) || 30)); prac.sim = null; Router.render(); },
        run: () => run(createRng(Date.now() >>> 0).seed()), again: () => run(prac.seed),
        detail: (el) => sheet(playDetailHtml(el.dataset.id), { title: PLAYS[el.dataset.id].name }),
        lesson: (el) => { prac.lessonSide = el.dataset.v; Router.render(); },
      });
    },
    unmount() { cancelAnimationFrame(prac.raf); },
  });

  // ------------------------------------------------------------ Playbook audit (developer)
  // "Run the play" (owner request, 2026-10-20): every play animates right here, so routes can be checked
  // against their art. Routes only = nobody across (offense) / the QB holds the ball (defense), a walk-through
  // that never happens in a game; Live = the real engine against the chosen opponent.
  const audit = { side: 'offense', list: 'all', play: 'quick_slants', opponent: 'cover_3', seed: 1, mode: 'walk', speed: 1, art: true, trails: true, run: null, i: 0, playing: false, raf: null };
  const auditOpen = new Set(); let auditSynced = false;
  const BALL_ON = 30;
  const AUDIT_CAM = { bottom: BALL_ON - 8, top: BALL_ON - 8 + 46 }; // 46 visible yards, framed for routes that run 30+ yards deep
  const live = (side) => (side === 'offense' ? OFFENSE_IDS : DEFENSE_IDS);
  const reserve = (side) => (side === 'offense' ? RESERVE_OFFENSE_IDS : RESERVE_DEFENSE_IDS);
  const listFor = (side, which) => (which === 'live' ? live(side) : which === 'reserve' ? reserve(side) : [...live(side), ...reserve(side)]);
  const otherSide = () => (audit.side === 'offense' ? 'defense' : 'offense');
  const pair = () => (audit.side === 'offense' ? [audit.play, audit.opponent] : [audit.opponent, audit.play]);
  const modeLabel = () => (audit.mode === 'live' ? 'Live play' : audit.side === 'offense' ? 'Routes only' : 'Drops only');
  function auditRun() {
    const [o, d] = pair(); const T = teamsForPractice(app.f);
    const dryRun = audit.mode === 'walk' ? (audit.side === 'offense' ? { noDefense: true } : {}) : null;
    audit.run = simulatePlay({ offensePlay: PLAYS[o], defensePlay: PLAYS[d], offense: pickSlots(T.offense.offense, PLAYS[o].onField), defense: pickSlots(T.defense.defense, PLAYS[d].onField), ballOn: BALL_ON, seed: audit.seed, options: dryRun ? { dryRun } : {} });
    audit.runKey = `${o}|${d}|${audit.mode}|${audit.seed}`; audit.i = 0;
  }
  /** Where each player actually went, frame 0..i, drawn under the players. */
  function trailsSvg(run, i) {
    const top = AUDIT_CAM.top; const P = (x, y) => `${y.toFixed(2)},${(top - (BALL_ON + x)).toFixed(2)}`;
    let s = '';
    for (const team of ['off', 'def']) {
      const by = {};
      for (const f of run.frames.slice(0, i + 1)) for (const [slot, x, y] of f[team]) (by[slot] ||= []).push(P(x, y));
      const col = team === 'off' ? '#bfe6ff' : '#ffc4bb';
      for (const pts of Object.values(by)) if (pts.length > 1) s += `<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="0.32" stroke-dasharray="0.7 0.5" stroke-opacity="0.9" stroke-linecap="round"/>`;
    }
    return s;
  }
  function auditField() {
    const [o, d] = pair(); const run = audit.run;
    const n = run ? run.frames.length : 0; const idx = run ? Math.min(audit.i, n - 1) : 0;
    const artPlay = PLAYS[audit.play];
    const noDefense = audit.mode === 'walk' && audit.side === 'offense';
    const presnap = run ? (audit.art ? { play: artPlay, offensePlay: PLAYS[o] } : null) : { ...(audit.art ? { play: artPlay } : {}), offensePlay: PLAYS[o], defensePlay: noDefense ? null : PLAYS[d] };
    return fieldSvg({ ballOn: BALL_ON, ballLat: 0, toGo: 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame: run ? run.frames[idx] : null, prevFrame: run ? run.frames[idx - 1] || null : null, presnap, camera: AUDIT_CAM, ownLabel: 'OWN', oppLabel: 'OPP', underlay: run && audit.trails ? trailsSvg(run, idx) : '', fxQuality: 'min' });
  }
  const timeText = () => { const run = audit.run; if (!run) return ''; const f = run.frames[Math.min(audit.i, run.frames.length - 1)]; return `${(f.t ?? 0).toFixed(1)}s / ${run.elapsed.toFixed(1)}s`; };
  const runResult = (run) => (run.result === 'dry_run' ? (audit.side === 'offense' ? 'Walk-through: every route run to its end, no defense on the field.' : 'Walk-through: the quarterback held the ball so every drop and rush plays out.') : resultText(run));
  function drawFrame() {
    const svg = document.querySelector('#auditfield'); if (svg) svg.innerHTML = auditField();
    const sc = document.querySelector('#auditscrub'); if (sc) sc.value = String(audit.i);
    const tt = document.querySelector('#audittime'); if (tt) tt.textContent = timeText();
  }
  function stopAnim() { cancelAnimationFrame(audit.raf); audit.raf = null; audit.playing = false; }
  function playAnim() {
    const run = audit.run; if (!run) return; const n = run.frames.length;
    if (audit.i >= n - 1) audit.i = 0;
    audit.playing = true; const ms = 100 / audit.speed; let last = performance.now(); let acc = 0;
    const btn = () => { const b = document.querySelector('[data-action="a-pause"]'); if (b) b.textContent = audit.playing ? '⏸ Pause' : '▶ Resume'; };
    btn();
    const tick = (now) => {
      acc += now - last; last = now;
      while (acc >= ms && audit.i < n - 1) { acc -= ms; audit.i += 1; }
      drawFrame();
      if (audit.i >= n - 1) { audit.playing = false; audit.raf = null; Router.render(); return; } // redraw once for the result banner
      audit.raf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(audit.raf); audit.raf = requestAnimationFrame(tick);
  }
  Router.registerScreen('audit', {
    title: 'Playbook Audit', tabs: false,
    render() {
      const mine = listFor(audit.side, audit.list), other = listFor(otherSide(), 'all');
      if (!mine.length) audit.list = 'all';
      const shown = mine.length ? mine : listFor(audit.side, 'all');
      if (!shown.includes(audit.play)) { audit.play = shown[0]; audit.run = null; }
      if (!other.includes(audit.opponent)) audit.opponent = audit.side === 'defense' ? 'smash' : 'cover_3'; // a pass play, so the drops have routes to cover
      const states = Object.fromEntries(shown.map((id) => [id, reviewState('play', id)]));
      const approved = shown.filter((id) => states[id] === 'approved').length;
      const queue = shown.filter((id) => NEEDS_OWNER.has(states[id]) && id !== audit.play);
      const mark = (id) => (states[id] ? ({ approved: '✓ ', needs_work: '✎ ', new: '• ', changed: '🔔 ', updated: '🔔 ' })[states[id]] : '');
      const opts = (list, value, marks = () => '') => list.map((p) => `<option value="${p}" ${p === value ? 'selected' : ''}>${marks(p)}${esc(PLAYS[p].name)}</option>`).join('');
      const groups = (side, list, value, marks) => { const L = list.filter((id) => !PLAYS[id].reserve), R = list.filter((id) => PLAYS[id].reserve); return (L.length && R.length) ? `<optgroup label="In the game (${L.length})">${opts(L, value, marks)}</optgroup><optgroup label="Reserve (${R.length})">${opts(R, value, marks)}</optgroup>` : opts(list, value, marks); };
      const sel = (name, key, side, list, value, marks) => `<label class="field">${name}<select data-change="${key}">${groups(side, list, value, marks)}</select></label>`;
      const count = (side, which) => listFor(side, which).length;
      const due = (side) => listFor(side, 'all').filter((id) => NEEDS_OWNER.has(reviewState('play', id))).length;
      const chip = (key, v, label) => `<button class="btn small ${audit[key] === v ? 'primary' : ''}" data-action="a-set" data-k="${key}" data-v="${v}">${label}</button>`;
      const run = audit.run; const n = run ? run.frames.length : 0;
      const isReservePlay = !!PLAYS[audit.play].reserve;
      return `<p class="muted">Every play with its art, assignments and a run you can watch. ${approved}/${shown.length} approved in this list · 🔔 ${shown.filter((id) => NEEDS_OWNER.has(states[id])).length} to review. In the list: ✓ good, ✎ waiting on dev, • new, 🔔 changed since your review.</p>
        <div class="row" style="margin-bottom:8px;flex-wrap:wrap;gap:6px"><button class="btn small ${audit.side === 'offense' ? 'primary' : ''}" data-action="side" data-v="offense">Offense (${count('offense', 'all')})${devBadge(app.settings, due('offense'))}</button><button class="btn small ${audit.side === 'defense' ? 'primary' : ''}" data-action="side" data-v="defense">Defense (${count('defense', 'all')})${devBadge(app.settings, due('defense'))}</button></div>
        <div class="row" style="margin-bottom:8px;flex-wrap:wrap;gap:6px"><span class="muted" style="font-size:12px">Show</span>${chip('list', 'all', `All ${count(audit.side, 'all')}`)}${chip('list', 'live', `In the game ${count(audit.side, 'live')}`)}${chip('list', 'reserve', `Reserve ${count(audit.side, 'reserve')}`)}</div>
        <div class="grid2">${sel('Play', 'play', audit.side, shown, audit.play, mark)}${sel('Against', 'opp', otherSide(), other, audit.opponent)}</div>
        ${isReservePlay ? '<p class="dim" style="font-size:12px;margin:4px 0 0">Reserve play: built and reviewable here, but no coach, AI club or practice field can call it yet.</p>' : ''}
        <div class="panel" style="margin-top:10px">
          <div class="field-wrap"><svg id="auditfield" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Play animation">${auditField()}</svg></div>${run && audit.i >= n - 1 ? `<p style="margin:6px 0 0"><b>${esc(runResult(run))}</b></p>` : ''}
          <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px"><span class="muted" style="font-size:12px">Mode</span>${chip('mode', 'walk', audit.side === 'offense' ? 'Routes only' : 'Drops only')}${chip('mode', 'live', 'Live vs ' + esc(PLAYS[audit.opponent].name))}</div>
          <div class="grid2" style="margin-top:8px"><button class="btn primary big" data-action="a-run">▶ Run the play</button><button class="btn big" data-action="a-pause" ${run ? '' : 'disabled'}>${audit.playing ? '⏸ Pause' : run && audit.i >= n - 1 ? '↻ Replay' : '▶ Resume'}</button></div>
          ${run ? `<div class="row" style="gap:8px;margin-top:8px;align-items:center"><input id="auditscrub" type="range" min="0" max="${n - 1}" value="${Math.min(audit.i, n - 1)}" style="flex:1;min-height:0;margin:0" aria-label="Scrub through the play"><span id="audittime" class="dim" style="font-size:12px;min-width:76px;text-align:right">${timeText()}</span></div>` : ''}
          <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px"><span class="muted" style="font-size:12px">Speed</span>${chip('speed', 1, '1×')}${chip('speed', 0.5, '½×')}${chip('speed', 0.25, '¼×')}</div>
          <div class="row" style="flex-wrap:wrap;gap:14px;margin-top:8px"><label class="row muted" style="gap:4px"><input type="checkbox" data-change="a-art" ${audit.art ? 'checked' : ''} style="width:auto;min-height:0;margin:0"> Show drawn routes</label><label class="row muted" style="gap:4px"><input type="checkbox" data-change="a-trails" ${audit.trails ? 'checked' : ''} style="width:auto;min-height:0;margin:0"> Show where they ran</label>${audit.mode === 'live' ? `<label class="row muted" style="gap:4px">Seed <input type="number" value="${audit.seed}" data-change="seed" style="width:72px;min-height:32px;margin:0"></label>` : ''}</div>
          ${run ? `<div class="row" style="margin-top:10px"><button class="btn small" data-action="a-flag">🚩 Flag this moment</button><span class="dim" style="font-size:11px">Marks the play Needs work and notes the time, mode and opponent.</span></div>` : ''}
          ${run && audit.mode === 'live' ? `<details style="margin-top:8px"><summary class="muted">Play log</summary><div class="log">${run.events.map((e) => `<div class="entry"><span class="t">${e.t.toFixed(1)}s</span><span>${esc(e.text)}</span></div>`).join('')}</div></details>` : ''}
        </div>
        ${playDetailHtml(audit.play, null, { practiceButton: false })}
        ${lessonHtml(audit.play)}
        <div class="panel"><div class="row between"><b>Your review</b>${STATE_BADGE[reviewState('play', audit.play)] || ''}</div>${reviewHtml('play', audit.play, { open: auditOpen.has('play:' + audit.play) })}
          <div class="row between" style="margin-top:10px"><button class="btn small ghost" data-action="rv-copy">Copy notes</button>${queue.length ? `<button class="btn small primary" data-action="nextreview">Next to review ▸ <span class="dim">${queue.length} left</span></button>` : '<span class="dim">Nothing left to review in this list.</span>'}</div></div>`;
    },
    mount(root) {
      if (!auditSynced) { auditSynced = true; syncReviews('play').then((ok) => { if (ok) Router.render(); }); }
      const reset = () => { stopAnim(); audit.run = null; audit.i = 0; };
      const scrub = root.querySelector('#auditscrub');
      if (scrub) scrub.addEventListener('input', () => { stopAnim(); audit.i = Number(scrub.value) || 0; drawFrame(); const b = root.querySelector('[data-action="a-pause"]'); if (b) b.textContent = '▶ Resume'; });
      if (audit.playing) playAnim(); // a re-render mid-play keeps it going
      delegate(root, {
        side: (el) => { audit.side = el.dataset.v; reset(); Router.render(); },
        play: (el) => { audit.play = el.value; reset(); Router.render(); }, opp: (el) => { audit.opponent = el.value; reset(); Router.render(); },
        seed: (el) => { audit.seed = Number(el.value) || 1; reset(); Router.render(); },
        'a-set': (el) => { const k = el.dataset.k; const v = k === 'speed' ? Number(el.dataset.v) : el.dataset.v; if (audit[k] === v) return; audit[k] = v; if (k !== 'speed') reset(); else if (audit.playing) playAnim(); Router.render(); },
        'a-art': (el) => { audit.art = el.checked; drawFrame(); }, 'a-trails': (el) => { audit.trails = el.checked; drawFrame(); },
        'a-run': () => { stopAnim(); auditRun(); audit.playing = true; Router.render(); },
        'a-pause': () => { if (!audit.run) return; if (audit.playing) { stopAnim(); Router.render(); } else { playAnim(); } },
        'a-flag': () => {
          const run = audit.run; if (!run) return; const f = run.frames[Math.min(audit.i, run.frames.length - 1)];
          const line = `🚩 ${(f.t ?? 0).toFixed(1)}s · ${modeLabel()}${audit.mode === 'live' ? ` vs ${PLAYS[audit.opponent].name} · seed ${audit.seed}` : audit.side === 'defense' ? ` vs ${PLAYS[audit.opponent].name}` : ''}: `;
          stopAnim(); auditOpen.add('play:' + audit.play);
          flagPlayMoment(audit.play, line).then((ok) => { if (!ok && globalThis.claude?.use) toast('Saved on this device; the cloud copy did not save.', 'bad'); });
          Router.render();
          setTimeout(() => { const t = document.querySelector(`.review-note[data-id="${audit.play}"]`); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); t.scrollIntoView({ block: 'center' }); } }, 40);
          toast('Flagged. Add what looks wrong at the end of the note.', 'good');
        },
        ...reviewHandlers(() => Router.render(), auditOpen, () => toast('Saved on this device; the cloud copy did not save.', 'bad')),
        nextreview: () => { const mine = listFor(audit.side, audit.list); const i = mine.indexOf(audit.play); const order = [...mine.slice(i + 1), ...mine.slice(0, i)]; const nx = order.find((id) => NEEDS_OWNER.has(reviewState('play', id))); if (nx) { audit.play = nx; reset(); Router.render(); window.scrollTo(0, 0); } },
        'rv-copy': async () => { const txt = reviewsText(); if (!txt) { toast('No reviews yet.'); return; } try { await navigator.clipboard.writeText(txt); toast('Notes copied.', 'good'); } catch { sheet(`<textarea class="review-note" rows="12" readonly>${esc(txt)}</textarea>`, { title: 'Your notes' }); } },
      });
    },
    unmount() { stopAnim(); },
  });
}

export function resultText(sim) {
  const who = sim.stats.receiver || sim.stats.carrier;
  const name = (slot, team = 'off') => sim.names?.[team]?.[slot] || slot;
  switch (sim.result) {
    case 'touchdown': return sim.stats.defensiveScore ? `Returned for a touchdown by ${name(sim.stats.interceptor || sim.stats.carrier, 'def')}!` : `TOUCHDOWN · ${name(who)} ${sim.stats.receiver ? 'catches it' : 'runs it in'} from ${sim.yards} yards out.`;
    case 'tackle': return `${name(who)} ${sim.stats.receiver ? 'catches' : 'runs'} for ${sim.yards} yard${Math.abs(sim.yards) === 1 ? '' : 's'}, tackled by ${name(sim.stats.tackler, 'def')}.`;
    case 'out_of_bounds': return `${name(who)} gains ${sim.yards}, out of bounds.`;
    case 'incomplete': return `Incomplete to ${name(sim.stats.target)}.`;
    case 'throwaway': return 'Thrown away.';
    case 'sack': return `Sacked by ${name(sim.stats.tackler, 'def')} for ${sim.yards}.`;
    case 'interception': case 'touchback_return': return `INTERCEPTED by ${name(sim.stats.interceptor, 'def')}!`;
    case 'fumble': return `FUMBLE forced by ${name(sim.stats.forcedBy, 'def')}, recovered by the defense.`;
    case 'safety': return 'SAFETY!';
    default: return sim.result;
  }
}
