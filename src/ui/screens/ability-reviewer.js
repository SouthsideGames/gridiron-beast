// Developer → Ability Reviewer (Task 8 M3, M3_PLAN.md item 6). Every Dex football ability, each form and mastery tier; a scenario
// runs on the real game runner and engine (src/sim/abilities/review.js) and replays the executing play with its cues. "▶ Scenario"
// (the default, deterministic: reviewScenario stages the contract's conditions from review-scenarios.js) is the direct test; "▶ Natural
// game" (reviewAbility) is the optional demonstration that searches AI games until the ability executes on its own. Nothing here
// writes to a franchise: no XP, mastery, collection or save writes (the owner's verdicts and notes are review notes, as in the
// Playbook Audit). It replaces the legacy Ability Audit for football; abilities without a registered contract are listed as such.
import { esc, delegate, sheet, toast } from '../dom.js';
import { abilityById } from '../../data/beast-dex.js';
import { reviewCatalog, reviewAbility, reviewScenario } from '../../sim/abilities/review.js';
import { fieldSvg, FIELD_VIEWBOX, cameraFor } from '../field-view.js';
import { buildFx, elementFx } from '../ability-fx.js';
import { syncReviews } from '../../franchise/review-store.js';
import { reviewHtml, reviewHandlers as sharedHandlers, reviewState, NEEDS_OWNER, STATE_BADGE, setFootballFingerprint } from '../dev-review.js';

const NS = 'fbability';
const FORM_LABEL = (form) => `Stage ${Number(String(form).split(':')[1] || 0) + 1}`;

export function registerAbilityReviewer(Router, app) {
  const cat = reviewCatalog();
  for (const c of cat) { const a = abilityById(c.abilityId) || {}; setFootballFingerprint(c.abilityId, [a.name, a.category, a.activation, a.mechanic, a.details, a.ruling, a.values, c.registered]); }
  const st = { element: 'All', status: 'all', pick: {}, notesOpen: new Set(), raf: null, synced: false };
  const elements = ['All', ...new Set(cat.map((c) => c.element))];
  const pickOf = (c) => (st.pick[c.family] ||= { form: c.forms[0], mastery: 0, primed: true });

  Router.registerScreen('ability-reviewer', {
    title: 'Ability Reviewer', tabs: false,
    render() {
      const state = Object.fromEntries(cat.map((c) => [c.abilityId, reviewState(NS, c.abilityId)]));
      const count = { approved: 0, needs_work: 0, todo: 0, pending: 0 }; for (const c of cat) { if (!c.registered) count.pending += 1; count[NEEDS_OWNER.has(state[c.abilityId]) ? 'todo' : state[c.abilityId]] += 1; }
      const ok = (c) => (st.element === 'All' || c.element === st.element) && (st.status === 'all' || (st.status === 'pending' ? !c.registered : st.status === 'todo' ? NEEDS_OWNER.has(state[c.abilityId]) : state[c.abilityId] === st.status));
      const list = cat.filter(ok);
      return `<p class="muted">Every football ability from the Beast Dex. <b>▶ Scenario</b> (the direct test) stages the ability's conditions on the real engine with a fixed seed, fixed plays and the build-up the contract needs, at the chosen stage and mastery tier, and replays the play where it executes: the same result every time. <b>▶ Natural game</b> is the optional demonstration: it plays real AI games until the ability executes on its own (<b>Primed</b> starts with the build-up already done where it has one). Nothing is written to any franchise.</p>
        <div class="panel tight review-summary"><div class="row between"><b>Your review</b><span class="dim">${cat.length} abilities · ${cat.length - count.pending} on the engine</span></div>
          <div class="row" style="gap:10px;font-size:13px;margin-top:4px"><span style="color:var(--good)">✓ ${count.approved} good</span><span style="color:var(--warn)">✎ ${count.needs_work} need work</span><span class="dim">🔔 ${count.todo} to review</span><span class="dim">⏳ ${count.pending} not built yet</span></div></div>
        <div class="chips" style="margin:8px 0 4px">${[['all', 'All'], ['todo', '🔔 To review'], ['approved', '✓ Good'], ['needs_work', '✎ Waiting on dev'], ['pending', '⏳ Not built']].map(([v, l]) => `<button class="chip ${v === st.status ? 'on' : ''}" data-action="st" data-v="${v}">${l}${v === 'all' ? '' : ` ${count[v]}`}</button>`).join('')}</div>
        <div class="chips" style="margin:4px 0 8px">${elements.map((el) => `<button class="chip ${el === st.element ? 'on' : ''}" data-action="el" data-v="${el}">${el === 'All' ? 'All' : elementFx(el).glyph + ' ' + el}</button>`).join('')}</div>
        <div class="stack">${list.length ? '' : '<p class="dim center">Nothing here with these filters.</p>'}${list.map((c) => {
          const a = abilityById(c.abilityId) || {}; const L = elementFx(c.element); const p = pickOf(c); const rv = state[c.abilityId];
          return `<div class="panel tight audit-row ${rv === 'approved' ? 'rv-approved' : rv === 'needs_work' ? 'rv-needswork' : ''}" id="fb-${c.family}">
            <div class="row between"><b style="color:${L.a}">${esc(c.name)}</b> ${rv ? STATE_BADGE[rv] : ''}<span class="chip" style="border-color:${L.a};color:${L.a}">${L.glyph} ${esc(c.element)} · ${esc(c.position)} · ${esc(c.rarity)}</span></div>
            <div class="dim" style="font-size:12px">${esc(c.abilityId)} · ${esc(c.family)} · ${esc(a.category || '')}${a.activation ? ` · ${esc(a.activation)}` : ''}</div>
            ${a.mechanic ? `<div class="muted" style="font-size:12px;margin-top:2px">${esc(a.mechanic)}</div>` : ''}
            <div class="dim" style="font-size:11px;margin-top:2px">Kickoffs: ${esc(c.specialPlays.kickoff)} · Two-point conversions: ${esc(c.specialPlays.twoPoint)} <span class="dim">(owner N8b)</span></div>
            ${c.registered ? `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">
              <select data-change="form" data-f="${c.family}">${c.forms.map((f) => `<option value="${f}" ${f === p.form ? 'selected' : ''}>${FORM_LABEL(f)}</option>`).join('')}</select>
              <select data-change="mastery" data-f="${c.family}">${c.tiers.map((t) => `<option value="${t}" ${t === p.mastery ? 'selected' : ''}>Mastery ${t}</option>`).join('')}</select>
              <button class="btn small" data-action="scenario" data-f="${c.family}">▶ Scenario</button>
              <button class="btn small ghost" data-action="run" data-f="${c.family}">▶ Natural game</button>
              <label class="row" style="gap:4px"><input type="checkbox" style="width:auto;min-height:0" data-change="primed" data-f="${c.family}" ${p.primed ? 'checked' : ''}> Primed</label></div>` : '<div class="chip warn" style="margin-top:6px">⏳ contract not built yet (legacy behaviour until it is)</div>'}
            ${reviewHtml(NS, c.abilityId, { open: st.notesOpen.has(`${NS}:${c.abilityId}`) })}</div>`; }).join('')}</div>`;
    },
    mount(root) {
      if (!st.synced) { st.synced = true; syncReviews(NS).then((ok) => { if (ok) Router.render(); }); }
      delegate(root, {
        el: (el) => { st.element = el.dataset.v; Router.render(); },
        st: (el) => { st.status = el.dataset.v; Router.render(); },
        form: (el) => { st.pick[el.dataset.f].form = el.value; },
        mastery: (el) => { st.pick[el.dataset.f].mastery = Number(el.value); },
        primed: (el) => { st.pick[el.dataset.f].primed = el.checked; },
        scenario: (el) => go(el, 'scenario'),
        run: (el) => go(el, 'natural'),
        ...sharedHandlers(() => Router.render(), st.notesOpen, () => toast('Saved on this device; the cloud copy did not save.', 'bad')),
      });
    },
    unmount() { stop(); },
  });

  function go(el, mode) {
    const c = cat.find((x) => x.family === el.dataset.f); const label = el.textContent; el.disabled = true; el.textContent = 'Running…';
    setTimeout(() => { try { run(c, mode); } finally { el.disabled = false; el.textContent = label; } }, 20);
  }
  function stop() { if (st.raf) cancelAnimationFrame(st.raf); st.raf = null; }
  const stateText = (x) => (x == null ? '—' : esc(JSON.stringify(x)));

  function run(c, mode = 'scenario') {
    stop(); const p = pickOf(c); const scen = mode === 'scenario';
    const r = scen ? reviewScenario({ family: c.family, form: p.form, mastery: p.mastery }) : reviewAbility({ family: c.family, form: p.form, mastery: p.mastery, primed: p.primed, seed: 1, games: 3 });
    const modeLine = scen ? `<div class="chip" style="margin:0 0 6px">▶ Scenario: deterministic, staged on the real engine</div>${r.how ? `<div class="dim" style="font-size:12px">${esc(r.how)}</div>` : ''}${r.staged ? `<div class="chip warn" style="margin:4px 0 6px;white-space:normal">⚠ ${esc(r.staged)}</div>` : ''}`
      : `<div class="chip" style="margin:0 0 6px">▶ Natural game: AI games searched until it executes${r.primed ? ' (primed)' : ''}</div>`;
    const head = `${esc(c.name)} · ${FORM_LABEL(p.form)} · Mastery ${p.mastery}${!scen && r.primed ? ' · primed' : ''}`;
    if (!r.found) { sheet(`<p class="muted">${head}</p>${modeLine}<p>${esc(r.reason)}.</p><p class="dim">${scen ? 'The scenario did not execute: report it with a note.' : 'Some abilities need a rare situation. Try ▶ Scenario, Primed, another stage, or report it with a note.'}</p>`, { title: c.name }); return; }
    const evLog = r.events.map((e) => `<div class="entry"><span class="t">${(e.t ?? 0).toFixed(1)}s</span><span>${esc(e.text || e.kind)}</span></div>`).join('') || '<div class="entry"><span>Executed (recorded for mastery) with no logged cue.</span></div>';
    const meta = `${modeLine}<div class="dim" style="font-size:12px">${scen ? `Seed ${r.seed}, snap ${r.step}${r.calls ? ` (${esc(r.calls.offense)} vs ${esc(r.calls.defense)})` : ''}` : `Game ${r.game}, step ${r.step}`} · ${esc(r.kind)} · Q${r.situation.quarter} · his slot ${esc(r.slot)}${r.executed ? ' · valid execution recorded (mastery is awarded in franchise games only, from M5)' : ''}</div>
      <div class="dim mono" style="font-size:11px;margin-top:4px">State before: ${stateText(r.before)}<br>State after: ${stateText(r.after)}${r.fields.length ? `<br>Fields: ${esc(r.fields.map((f) => `${f.type} (${f.remaining} left)`).join(', '))}` : ''}</div>`;
    const review = `<div class="sheet-review" style="margin-top:10px">${reviewHtml(NS, c.abilityId, { open: true })}</div>`;
    if (!r.sim?.frames?.length) { sheet(`<p class="muted">${head}</p><p>${esc(r.text)}</p>${meta}<div class="log" style="margin-top:6px">${evLog}</div>${review}`, { title: c.name }); bindReview(c); return; }
    const sim = r.sim; const ballOn = sim.ballOn ?? r.ballOn ?? 35;
    const lookup = (team, slot) => { const m = r.sprites[team]?.[slot]; return m ? { element: m.type, name: m.name, species: m.species } : null; };
    const fx = buildFx(sim, lookup); const cam = cameraFor(ballOn);
    const sprites = { off: { map: r.sprites.off, pool: [] }, def: { map: r.sprites.def, pool: [] } };
    const draw = (i, time = null) => fieldSvg({ time, ballOn, ballLat: sim.ballLat || 0, toGo: r.situation.toGo || 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame: sim.frames[i], prevFrame: sim.frames[i - 1] || null, fx, fxQuality: app.settings?.reducedMotion ? 'min' : 'full', sprites, camera: cam, ownLabel: 'OWN', oppLabel: 'OPP' });
    sheet(`<p class="muted" style="margin:0 0 6px">${head}</p><div class="field-wrap"><svg id="fbreview" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet">${draw(0)}</svg></div><p class="dim" style="margin:6px 0 0">${esc(r.text || sim.result || '')} · loops</p>${meta}<div class="log" style="margin-top:6px">${evLog}</div>${review}`, { title: `${elementFx(c.element).glyph} ${c.name}`, onClose: stop });
    bindReview(c);
    const svg = document.querySelector('#fbreview'); const ms = 100 / (app.settings?.speed || 1); let start = performance.now(); let last = -1;
    const tick = (now) => {
      if (!svg?.isConnected) { st.raf = null; return; }
      const n = sim.frames.length; let idx = Math.floor((now - start) / ms); if (idx >= n + 10) { start = now; idx = 0; }
      const time = idx > n - 1 ? (sim.frames[n - 1].t ?? 0) + (idx - (n - 1)) * 0.1 : null;
      if (idx !== last) { last = idx; svg.innerHTML = draw(Math.min(n - 1, idx), time); }
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }
  function bindReview(c) { const box = document.querySelector('.sheet .sheet-review'); if (box) delegate(box, sharedHandlers(() => { box.innerHTML = reviewHtml(NS, c.abilityId, { open: true }); Router.render(); }, st.notesOpen)); }
}
