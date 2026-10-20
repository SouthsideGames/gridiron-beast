// Practice field and the developer Playbook Audit. Both use the same engine
// and field renderer as matches.

import { esc, delegate, toast, sheet } from '../dom.js';
import * as F from '../../franchise/franchise.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../../data/playbook.js';
import { simulatePlay } from '../../sim/engine.js';
import { pickSlots } from '../../sim/rules.js';
import { fieldSvg, FIELD_VIEWBOX, cameraFor } from '../field-view.js';
import { playCardSvg, legendHtml } from '../play-art.js';
import { playDetailHtml, lessonHtml } from './hq.js';
import { generatedTeam } from '../../franchise/roster.js';
import { createRng } from '../../core/rng.js';
import { buildFx, endHold } from '../ability-fx.js';
import { reviewHtml, reviewHandlers, reviewState, NEEDS_OWNER, STATE_BADGE, reviewsText, devBadge } from '../dev-review.js';
import { syncReviews } from '../../franchise/review-store.js';
import { resolveSpecies } from '../../data/monsters.js';

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
      const field = fieldSvg({ ballOn: prac.ballOn, ballLat: 0, toGo: 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame, prevFrame: prac.sim ? prac.sim.frames[Math.min(prac.i, prac.sim.frames.length - 1) - 1] || null : null, fx: prac.sim ? prac.fx : null, fxQuality: app.settings.reducedMotion ? 'min' : 'full', sprites: prac.sim ? prac.sprites : null, presnap, ownLabel: 'OWN', oppLabel: 'OPP', camera: cameraFor(prac.ballOn) });
      const sel = (id, list, name) => `<label class="field">${name}<select data-change="${name === 'Offense' ? 'off' : 'def'}">${list.map((p) => `<option value="${p}" ${p === id ? 'selected' : ''}>${esc(PLAYS[p].name)}</option>`).join('')}</select></label>`;
      const result = prac.sim ? `<div class="field-banner ${prac.sim.touchdown || prac.sim.turnover ? 'important' : ''}">${esc(resultText(prac.sim))}</div>` : '';
      return `<p class="muted">Run your plays against your own defense. Same engine as Sunday; ${f ? 'your current starters' : 'a practice squad'} on both sides.</p>
        <div class="field-wrap" id="fieldwrap"><svg id="field" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Practice field">${field}</svg>${result}</div>
        <div class="grid2">${sel(prac.offense, T.offensePlays, 'Offense')}${sel(prac.defense, T.defensePlays, 'Defense')}</div>
        <div class="row between"><label class="row muted" style="gap:4px"><input type="checkbox" data-change="art" ${prac.showArt ? 'checked' : ''} style="width:auto;min-height:0;margin:0"> Show play art</label><label class="row muted" style="gap:4px">Ball on <input type="number" min="1" max="99" value="${prac.ballOn}" data-change="spot" style="width:64px;min-height:36px;margin:0"></label></div>
        <div class="grid2" style="margin-top:8px"><button class="btn primary big" data-action="run">▶ Run play</button><button class="btn big" data-action="again" ${prac.sim ? '' : 'disabled'}>↻ Same seed</button></div>
        <div class="grid2" style="margin-top:8px"><button class="btn" data-action="detail" data-id="${prac.offense}">Offense details</button><button class="btn" data-action="detail" data-id="${prac.defense}">Defense details</button></div>
        ${lessonHtml(prac.lessonSide === 'defense' ? prac.defense : prac.offense)}<div class="row" style="justify-content:center"><button class="btn small ${prac.lessonSide !== 'defense' ? 'primary' : ''}" data-action="lesson" data-v="offense">Offense lesson</button><button class="btn small ${prac.lessonSide === 'defense' ? 'primary' : ''}" data-action="lesson" data-v="defense">Defense lesson</button></div>
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
        const tick = (now) => { const raw = Math.floor((now - start) / ms); if (raw > n - 1) { const extra = (raw - (n - 1)) * 0.1; if (extra < hold && svg) { svg.innerHTML = fieldSvg({ ballOn: prac.ballOn, ballLat: 0, toGo: 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame: prac.sim.frames[n - 1], prevFrame: prac.sim.frames[n - 1], fx: prac.fx, fxQuality: app.settings.reducedMotion ? 'min' : 'full', sprites: prac.sprites, time: (prac.sim.frames[n - 1].t ?? 0) + extra, camera: cameraFor(prac.ballOn), ownLabel: 'OWN', oppLabel: 'OPP' }); prac.raf = requestAnimationFrame(tick); return; } Router.render(); return; }
          const idx = Math.min(n - 1, raw); if (idx !== prac.i && svg) { prac.i = idx; svg.innerHTML = fieldSvg({ ballOn: prac.ballOn, ballLat: 0, toGo: 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame: prac.sim.frames[idx], prevFrame: prac.sim.frames[idx - 1] || null, fx: prac.fx, fxQuality: app.settings.reducedMotion ? 'min' : 'full', sprites: prac.sprites, camera: cameraFor(prac.ballOn), ownLabel: 'OWN', oppLabel: 'OPP' }); } prac.raf = requestAnimationFrame(tick); };
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
  const audit = { side: 'offense', play: 'quick_slants', opponent: 'cover_3', seed: 1, sim: null };
  const auditOpen = new Set(); let auditSynced = false;
  Router.registerScreen('audit', {
    title: 'Playbook Audit', tabs: false,
    render() {
      const mine = audit.side === 'offense' ? OFFENSE_IDS : DEFENSE_IDS, other = audit.side === 'offense' ? DEFENSE_IDS : OFFENSE_IDS;
      if (!mine.includes(audit.play)) audit.play = mine[0]; if (!other.includes(audit.opponent)) audit.opponent = other[0];
      const sel = (name, key, list, value, marks = () => '') => `<label class="field">${name}<select data-change="${key}">${list.map((p) => `<option value="${p}" ${p === value ? 'selected' : ''}>${marks(p)}${esc(PLAYS[p].name)}</option>`).join('')}</select></label>`;
      const states = Object.fromEntries(mine.map((id) => [id, reviewState('play', id)]));
      const approved = mine.filter((id) => states[id] === 'approved').length;
      const queue = mine.filter((id) => NEEDS_OWNER.has(states[id]) && id !== audit.play);
      const mark = (id) => (states[id] ? ({ approved: '✓ ', needs_work: '✎ ', new: '• ', changed: '🔔 ', updated: '🔔 ' })[states[id]] : '');
      return `<p class="muted">Every play with its art, assignments and a seeded simulation. ${approved}/${mine.length} ${audit.side} plays approved · 🔔 ${mine.filter((id) => NEEDS_OWNER.has(states[id])).length} to review. In the list: ✓ good, ✎ waiting on dev, • new, 🔔 changed since your review.</p>
        <div class="row" style="margin-bottom:8px"><button class="btn small ${audit.side === 'offense' ? 'primary' : ''}" data-action="side" data-v="offense">Offense (${OFFENSE_IDS.length})${devBadge(app.settings, OFFENSE_IDS.filter((id) => NEEDS_OWNER.has(reviewState('play', id))).length)}</button><button class="btn small ${audit.side === 'defense' ? 'primary' : ''}" data-action="side" data-v="defense">Defense (${DEFENSE_IDS.length})${devBadge(app.settings, DEFENSE_IDS.filter((id) => NEEDS_OWNER.has(reviewState('play', id))).length)}</button></div>
        <div class="grid2">${sel('Play', 'play', mine, audit.play, mark)}${sel('Against', 'opp', other, audit.opponent)}</div>
        ${playDetailHtml(audit.play)}
        <div class="panel" style="margin-top:12px"><div class="row between"><label class="row muted" style="gap:4px">Seed <input type="number" value="${audit.seed}" data-change="seed" style="width:80px;min-height:36px;margin:0"></label><button class="btn primary" data-action="sim">▶ Simulate</button></div>
          ${audit.sim ? `<p style="margin-top:8px"><b>${esc(resultText(audit.sim))}</b></p><div class="log">${audit.sim.events.map((e) => `<div class="entry"><span class="t">${e.t.toFixed(1)}s</span><span>${esc(e.text)}</span></div>`).join('')}</div><button class="btn small" data-action="watch" style="margin-top:8px">Watch on the practice field</button>` : ''}</div>
        <div class="panel"><div class="row between"><b>Your review</b>${STATE_BADGE[reviewState('play', audit.play)] || ''}</div>${reviewHtml('play', audit.play, { open: auditOpen.has('play:' + audit.play) })}
          <div class="row between" style="margin-top:10px"><button class="btn small ghost" data-action="rv-copy">Copy notes</button>${queue.length ? `<button class="btn small primary" data-action="nextreview">Next to review ▸ <span class="dim">${queue.length} left</span></button>` : '<span class="dim">Nothing left to review on this side.</span>'}</div></div>`;
    },
    mount(root) {
      if (!auditSynced) { auditSynced = true; syncReviews('play').then((ok) => { if (ok) Router.render(); }); }
      delegate(root, {
        side: (el) => { audit.side = el.dataset.v; audit.sim = null; Router.render(); },
        play: (el) => { audit.play = el.value; audit.sim = null; Router.render(); }, opp: (el) => { audit.opponent = el.value; audit.sim = null; Router.render(); }, seed: (el) => { audit.seed = Number(el.value) || 1; },
        sim: () => { const o = audit.side === 'offense' ? audit.play : audit.opponent, d = audit.side === 'offense' ? audit.opponent : audit.play; const T = teamsForPractice(app.f); audit.sim = simulatePlay({ offensePlay: PLAYS[o], defensePlay: PLAYS[d], offense: pickSlots(T.offense.offense, PLAYS[o].onField), defense: pickSlots(T.defense.defense, PLAYS[d].onField), ballOn: 30, seed: audit.seed }); Router.render(); },
        watch: () => { prac.offense = audit.side === 'offense' ? audit.play : audit.opponent; prac.defense = audit.side === 'offense' ? audit.opponent : audit.play; prac.sim = null; Router.go('practice'); },
        ...reviewHandlers(() => Router.render(), auditOpen, () => toast('Saved on this device; the cloud copy did not save.', 'bad')),
        nextreview: () => { const mine = audit.side === 'offense' ? OFFENSE_IDS : DEFENSE_IDS; const i = mine.indexOf(audit.play); const order = [...mine.slice(i + 1), ...mine.slice(0, i)]; const nx = order.find((id) => NEEDS_OWNER.has(reviewState('play', id))); if (nx) { audit.play = nx; audit.sim = null; Router.render(); window.scrollTo(0, 0); } },
        'rv-copy': async () => { const txt = reviewsText(); if (!txt) { toast('No reviews yet.'); return; } try { await navigator.clipboard.writeText(txt); toast('Notes copied.', 'good'); } catch { sheet(`<textarea class="review-note" rows="12" readonly>${esc(txt)}</textarea>`, { title: 'Your notes' }); } },
      });
    },
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
