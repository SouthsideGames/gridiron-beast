// Developer → Ability Reviewer (Task 8 M3, M3_PLAN.md item 6; Reviewer v2, spec §25 "Both ability reviewers"). Every Dex football
// ability, each form and mastery tier. "▶ Scenario" (the default, deterministic) runs the complete-interaction sequence
// (src/sim/abilities/review-sequence.js): the scenario stages charge, readiness, participants and the qualifying conditions on the real
// game runner and engine, plays until the activation and keeps playing until the cleanup. Before playback the sheet explains the
// source, the targets and the expected result; the phase checklist (trigger met → ability activated → effect resolved → cleanup) ticks
// from the recorded engine events as playback reaches them. Controls: pause / play, replay, 0.25× / 0.5× / 1× speed, step by event and
// step by play. A missing phase or an exception shows the failure panel (the unmet condition or the implementation error), never a
// silent ordinary play. A variant selector runs the separately labelled blocked / failure / interaction scenarios. "▶ Natural game"
// (reviewAbility) stays as the optional demonstration of ordinary activation frequency. Nothing here writes to a franchise: no XP,
// mastery, collection, reward or save writes (the owner's verdicts and notes are review notes, as in the Playbook Audit).
import { esc, delegate, sheet, toast } from '../dom.js';
import { abilityById } from '../../data/beast-dex.js';
import { reviewCatalog, reviewAbility } from '../../sim/abilities/review.js';
import { reviewSequence, sequenceVariants } from '../../sim/abilities/review-sequence.js';
import { fieldSvg, fieldDraw, FIELD_VIEWBOX, cameraFor } from '../field-view.js';
import { buildFx, elementFx } from '../ability-fx.js';
import { syncReviews } from '../../franchise/review-store.js';
import { reviewHtml, reviewHandlers as sharedHandlers, reviewState, NEEDS_OWNER, STATE_BADGE, setFootballFingerprint } from '../dev-review.js';

const NS = 'fbability';
const FORM_LABEL = (form) => `Stage ${Number(String(form).split(':')[1] || 0) + 1}`;
const SPEEDS = [0.25, 0.5, 1];
const KIND_CHIP = { main: '', blocked: '⛔ Blocked', failure: '✗ Failure', interaction: '⇄ Interaction' };

export function registerAbilityReviewer(Router, app) {
  const cat = reviewCatalog();
  for (const c of cat) { const a = abilityById(c.abilityId) || {}; setFootballFingerprint(c.abilityId, [a.name, a.category, a.activation, a.mechanic, a.details, a.ruling, a.values, c.registered]); }
  const st = { element: 'All', status: 'all', pick: {}, notesOpen: new Set(), raf: null, synced: false, pb: null };
  const elements = ['All', ...new Set(cat.map((c) => c.element))];
  const pickOf = (c) => (st.pick[c.family] ||= { form: c.forms[0], mastery: 0, primed: true, variant: 'main' });

  Router.registerScreen('ability-reviewer', {
    title: 'Ability Reviewer', tabs: false,
    render() {
      const state = Object.fromEntries(cat.map((c) => [c.abilityId, reviewState(NS, c.abilityId)]));
      const count = { approved: 0, needs_work: 0, todo: 0, pending: 0 }; for (const c of cat) { if (!c.registered) count.pending += 1; count[NEEDS_OWNER.has(state[c.abilityId]) ? 'todo' : state[c.abilityId]] += 1; }
      const ok = (c) => (st.element === 'All' || c.element === st.element) && (st.status === 'all' || (st.status === 'pending' ? !c.registered : st.status === 'todo' ? NEEDS_OWNER.has(state[c.abilityId]) : state[c.abilityId] === st.status));
      const list = cat.filter(ok);
      return `<p class="muted">Every football ability from the Beast Dex. <b>▶ Scenario</b> demonstrates the complete interaction on the first run: it prepares the charge, readiness, participants and the qualifying conditions on the real engine (fixed seeds and plays), plays to the activation and on through later plays until the cleanup, and ticks each phase from the engine's own events. The <b>variant</b> list adds labelled blocked, failure and interaction scenarios. Staged and controlled runs do not show how often an ability fires: <b>▶ Natural game</b> plays real AI games for that. Nothing is written to any franchise.</p>
        <div class="panel tight review-summary"><div class="row between"><b>Your review</b><span class="dim">${cat.length} abilities · ${cat.length - count.pending} on the engine</span></div>
          <div class="row" style="gap:10px;font-size:13px;margin-top:4px"><span style="color:var(--good)">✓ ${count.approved} good</span><span style="color:var(--warn)">✎ ${count.needs_work} need work</span><span class="dim">🔔 ${count.todo} to review</span><span class="dim">⏳ ${count.pending} not built yet</span></div></div>
        <div class="chips" style="margin:8px 0 4px">${[['all', 'All'], ['todo', '🔔 To review'], ['approved', '✓ Good'], ['needs_work', '✎ Waiting on dev'], ['pending', '⏳ Not built']].map(([v, l]) => `<button class="chip ${v === st.status ? 'on' : ''}" data-action="st" data-v="${v}">${l}${v === 'all' ? '' : ` ${count[v]}`}</button>`).join('')}</div>
        <div class="chips" style="margin:4px 0 8px">${elements.map((el) => `<button class="chip ${el === st.element ? 'on' : ''}" data-action="el" data-v="${el}">${el === 'All' ? 'All' : elementFx(el).glyph + ' ' + el}</button>`).join('')}</div>
        <div class="stack">${list.length ? '' : '<p class="dim center">Nothing here with these filters.</p>'}${list.map((c) => {
          const a = abilityById(c.abilityId) || {}; const L = elementFx(c.element); const p = pickOf(c); const rv = state[c.abilityId]; const vars = sequenceVariants(c.family);
          return `<div class="panel tight audit-row ${rv === 'approved' ? 'rv-approved' : rv === 'needs_work' ? 'rv-needswork' : ''}" id="fb-${c.family}">
            <div class="row between"><b style="color:${L.a}">${esc(c.name)}</b> ${rv ? STATE_BADGE[rv] : ''}<span class="chip" style="border-color:${L.a};color:${L.a}">${L.glyph} ${esc(c.element)} · ${esc(c.position)} · ${esc(c.rarity)}</span></div>
            <div class="dim" style="font-size:12px">${esc(c.abilityId)} · ${esc(c.family)} · ${esc(a.category || '')}${a.activation ? ` · ${esc(a.activation)}` : ''}</div>
            ${a.mechanic ? `<div class="muted" style="font-size:12px;margin-top:2px">${esc(a.mechanic)}</div>` : ''}
            <div class="dim" style="font-size:11px;margin-top:2px">Kickoffs: ${esc(c.specialPlays.kickoff)} · Two-point conversions: ${esc(c.specialPlays.twoPoint)} <span class="dim">(owner N8b)</span></div>
            ${c.registered ? `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap">
              <select data-change="form" data-f="${c.family}">${c.forms.map((f) => `<option value="${f}" ${f === p.form ? 'selected' : ''}>${FORM_LABEL(f)}</option>`).join('')}</select>
              <select data-change="mastery" data-f="${c.family}">${c.tiers.map((t) => `<option value="${t}" ${t === p.mastery ? 'selected' : ''}>Mastery ${t}</option>`).join('')}</select>
              ${vars.length > 1 ? `<select data-change="variant" data-f="${c.family}" aria-label="Scenario variant">${vars.map((v) => `<option value="${v.id}" ${v.id === p.variant ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select>` : ''}
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
        variant: (el) => { st.pick[el.dataset.f].variant = el.value; },
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
    setTimeout(() => { try { if (mode === 'scenario') runSequence(c); else runNatural(c); } finally { el.disabled = false; el.textContent = label; } }, 20);
  }
  function stop() { if (st.raf) cancelAnimationFrame(st.raf); st.raf = null; st.pb = null; }
  const stateText = (x) => (x == null ? '—' : esc(JSON.stringify(x)));
  function bindReview(c, box = document.querySelector('.sheet .sheet-review')) { if (box) delegate(box, sharedHandlers(() => { box.innerHTML = reviewHtml(NS, c.abilityId, { open: true }); Router.render(); }, st.notesOpen)); }

  // ------------------------------------------------------------------------------------------- ▶ Natural game (optional demo)
  function runNatural(c) {
    stop(); const p = pickOf(c);
    const r = reviewAbility({ family: c.family, form: p.form, mastery: p.mastery, primed: p.primed, seed: 1, games: 3 });
    const head = `${esc(c.name)} · ${FORM_LABEL(p.form)} · Mastery ${p.mastery}${r.primed ? ' · primed' : ''}`;
    const modeLine = `<div class="chip" style="margin:0 0 6px">▶ Natural game: AI games searched until it executes${r.primed ? ' (primed)' : ''}</div>`;
    if (!r.found) { sheet(`<p class="muted">${head}</p>${modeLine}<p>${esc(r.reason)}.</p><p class="dim">Some abilities need a rare situation. ▶ Scenario demonstrates it directly.</p>`, { title: c.name }); return; }
    const evLog = r.events.map((e) => `<div class="entry"><span class="t">${(e.t ?? 0).toFixed(1)}s</span><span>${esc(e.text || e.kind)}</span></div>`).join('') || '<div class="entry"><span>Executed (recorded for mastery) with no logged cue.</span></div>';
    const meta = `${modeLine}<div class="dim" style="font-size:12px">Game ${r.game}, step ${r.step} · ${esc(r.kind)} · Q${r.situation.quarter} · his slot ${esc(r.slot)} · valid execution recorded (mastery is awarded in franchise games only)</div>
      <div class="dim mono" style="font-size:11px;margin-top:4px">State before: ${stateText(r.before)}<br>State after: ${stateText(r.after)}</div>`;
    const play = { n: 1, kind: r.kind, text: r.text, sim: r.sim, ballOn: r.ballOn, situation: r.situation, sprites: r.sprites, allEvents: r.sim?.events || [], followUp: false };
    openPlayer(c, { title: c.name, head, intro: meta, plays: [play], phases: [], ok: true, natural: true });
  }

  // ---------------------------------------------------------------------------------- ▶ Scenario: the complete interaction
  function runSequence(c) {
    stop(); const p = pickOf(c);
    const r = reviewSequence({ family: c.family, form: p.form, mastery: p.mastery, variant: p.variant || 'main' });
    const head = `${esc(c.name)} · ${FORM_LABEL(p.form)} · Mastery ${p.mastery}${r.kind && r.kind !== 'main' ? ` · ${esc(r.label)}` : ''}`;
    const a = abilityById(c.abilityId) || {}; const X = r.explain || {};
    const tgt = (X.actualTargets || []).map((t) => `${t.team === 'off' ? 'offense' : t.team === 'def' ? 'defense' : esc(t.team || '')} ${esc(t.slot)}`).join(', ');
    const intro = `<div class="panel tight rv2-explain" data-rv2="explain">
        <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:4px"><span class="chip">▶ Scenario: staged on the real engine</span>${r.kind && r.kind !== 'main' ? `<span class="chip warn">${KIND_CHIP[r.kind]}</span>` : ''}${r.controlled ? '<span class="chip warn" data-rv2="controlled">⚙ Controlled prerequisite</span>' : ''}</div>
        <div style="font-size:13px"><b>Source:</b> ${X.source ? `${esc(X.source.name)} (${esc(X.source.slot)}, ${X.source.unit === 'kicker' ? 'kicker' : esc(X.source.unit)})` : '—'}</div>
        <div style="font-size:13px"><b>Targets:</b> ${esc(X.targets || '—')}${tgt ? `<span class="dim"> · in this run: ${tgt}</span>` : ''}</div>
        <div style="font-size:13px"><b>Expected result:</b> ${esc(X.expect || '—')}</div>
        ${a.values ? `<div class="dim" style="font-size:11px;margin-top:2px">Approved values: ${esc(typeof a.values === 'string' ? a.values : JSON.stringify(a.values))}</div>` : ''}
        ${(r.staging || []).length ? `<div class="dim" style="font-size:11px;margin-top:4px"><b>How it is staged:</b><br>${r.staging.map((s) => `• ${esc(s)}`).join('<br>')}</div>` : ''}
        ${(r.controls || []).map((x) => `<div class="chip warn" style="margin-top:4px;white-space:normal;font-size:11px">⚙ ${esc(x.label)} (reviewer-only engine option, never the ability's result)</div>`).join('')}
        <div class="dim" style="font-size:11px;margin-top:4px">${esc(r.frequencyNote || '')}</div></div>`;
    const failure = r.ok ? '' : `<div class="panel tight" data-rv2="failure" style="border-color:var(--bad);margin-top:6px"><b style="color:var(--bad)">${r.error ? '⚠ Implementation error' : '✗ Not demonstrated'}</b>
        <div style="font-size:13px;margin-top:2px">${esc(r.failure?.condition || 'unknown')}</div>${r.failure?.detail ? `<div class="dim" style="font-size:12px">${esc(r.failure.detail)}</div>` : ''}
        ${r.error ? `<pre class="mono" style="font-size:10px;white-space:pre-wrap">${esc(r.error.stack || r.error.message)}</pre>` : ''}
        ${(r.failure?.snaps || []).length ? `<div class="dim mono" style="font-size:10px;margin-top:4px">${r.failure.snaps.map(esc).join('<br>')}</div>` : ''}</div>`;
    openPlayer(c, { title: `${elementFx(c.element).glyph} ${c.name}`, head, intro: intro + failure, plays: r.plays, phases: r.phases, ok: r.ok, r });
  }

  // ------------------------------------------------------------------------------------------------------------- the player
  function openPlayer(c, { title, head, intro, plays, phases, ok, natural = false }) {
    const checklist = phases.length ? `<div class="panel tight" data-rv2="phases" style="margin-top:6px"><b>Phases</b>${phases.map((ph, i) => `<div class="rv2-phase" data-phase="${ph.id}" data-i="${i}" style="font-size:13px;margin-top:3px"><span class="rv2-box">☐</span> ${esc(ph.label)}${ph.play != null ? ` <span class="dim" style="font-size:11px">· play ${ph.play + 1}</span>` : ""}<div class="dim rv2-ev" style="font-size:11px;display:none">${esc(ph.evidence || '')}</div></div>`).join('')}
      <div class="dim" data-rv2="verdict" style="font-size:12px;margin-top:4px">${ok ? 'Playing…' : 'Not every phase was observed (see above).'}</div></div>` : '';
    const controls = `<div class="row rv2-controls" style="gap:4px;flex-wrap:wrap;margin:6px 0">
        <button class="btn small" data-pb="toggle" aria-label="Pause">⏸</button><button class="btn small ghost" data-pb="replay" aria-label="Replay">↺</button>
        ${SPEEDS.map((s) => `<button class="btn small ghost" data-pb="speed" data-v="${s}" aria-label="Speed ${s}x">${s}×</button>`).join('')}
        <button class="btn small ghost" data-pb="prevplay" aria-label="Previous play">⏮</button><button class="btn small ghost" data-pb="event" aria-label="Next event">▸ event</button><button class="btn small ghost" data-pb="play" aria-label="Next play">⏭ play</button></div>`;
    const html = `<p class="muted" style="margin:0 0 6px">${head}</p>${intro}${checklist}
      <div class="dim" data-rv2="playinfo" style="font-size:12px;margin-top:6px"></div>
      <div class="field-wrap"><svg id="fbreview" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet"></svg></div>
      <div class="dim" data-rv2="kicktext" style="font-size:12px;display:none"></div>${controls}
      <div class="log" data-rv2="log" style="margin-top:6px;max-height:180px;overflow:auto"></div>
      <div class="sheet-review" style="margin-top:10px">${reviewHtml(NS, c.abilityId, { open: true })}</div>`;
    const { el } = sheet(html, { title, onClose: stop });
    bindReview(c, el.querySelector('.sheet-review'));
    const svg = el.querySelector('#fbreview'); const info = el.querySelector('[data-rv2="playinfo"]'); const logBox = el.querySelector('[data-rv2="log"]'); const kickBox = el.querySelector('[data-rv2="kicktext"]');
    const prepared = plays.map((p) => {
      const sim = p.sim; const frames = sim?.frames || [];
      const lookup = (team, slot) => { const m = p.sprites?.[team]?.[slot]; return m ? { element: m.type, name: m.name, species: m.species } : null; };
      const events = (p.allEvents || []).filter((e) => e.kind !== 'debug' && !/^qb_/.test(e.kind || ''));
      const end = Math.max(frames.length ? frames[frames.length - 1].t ?? 0 : 0, ...events.map((e) => e.t ?? 0), frames.length ? 0 : 1.5);
      return { p, sim, frames, events, end, fx: frames.length ? buildFx(sim, lookup) : null, sprites: { off: { map: p.sprites?.off || {}, pool: [] }, def: { map: p.sprites?.def || {}, pool: [] } }, cam: cameraFor(sim?.ballOn ?? p.ballOn ?? 35) };
    });
    const pb = st.pb = { pi: 0, time: 0, playing: true, speed: 1, last: performance.now(), hold: 0, done: false, drawn: '' };
    const ticked = (ph) => ph.ok && ph.play != null && (pb.pi > ph.play || (pb.pi === ph.play && (ph.atEnd ? pb.time >= prepared[ph.play].end - 1e-6 : pb.time >= (ph.t ?? 0) - 1e-6)));
    function frameAt(P, time) { let i = 0; while (i + 1 < P.frames.length && (P.frames[i + 1].t ?? 0) <= time + 1e-6) i++; return i; }
    function draw() {
      const P = prepared[pb.pi]; if (!P) return; const p = P.p;
      info.innerHTML = `<b>Play ${pb.pi + 1} / ${prepared.length}</b>${p.followUp ? ' · follow-up' : ''}${p.executed ? ' · <b>activation</b>' : ''} · ${esc(p.kind)} · ${pb.time.toFixed(1)}s / ${P.end.toFixed(1)}s · ${pb.speed}×${pb.playing ? '' : ' · paused'}${p.controls?.length ? ' · <span style="color:var(--warn)">⚙ controlled</span>' : ''}`;
      if (P.frames.length) {
        const i = frameAt(P, pb.time); const sim = P.sim; const key = `${pb.pi}:${i}:${pb.time > (P.frames[P.frames.length - 1].t ?? 0) ? pb.time.toFixed(1) : ''}`;
        if (key !== pb.drawn) { pb.drawn = key; fieldDraw(svg, { time: pb.time, ballOn: sim.ballOn ?? p.ballOn ?? 35, ballLat: sim.ballLat || 0, toGo: p.situation?.toGo || 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame: P.frames[i], prevFrame: P.frames[i - 1] || null, fx: P.fx, fxQuality: app.settings?.reducedMotion ? 'min' : 'full', sprites: P.sprites, camera: P.cam, ownLabel: 'OWN', oppLabel: 'OPP', fields: sim.fields || null }); }
        svg.style.display = ''; kickBox.style.display = 'none';
      } else { svg.style.display = 'none'; kickBox.style.display = ''; kickBox.innerHTML = `<div class="panel tight">${esc(p.kind)} (formula play, no field animation): ${esc(p.text)}${(p.gameLog || []).filter((x) => x.kind === 'ability').map((x) => `<br>• ${esc(x.text)}`).join('')}</div>`; }
      const subj = (e) => e.ability || e.contract;
      logBox.innerHTML = `<div class="entry dim"><span>${esc(p.text || '')}</span></div>` + P.events.map((e) => `<div class="entry${(e.t ?? 0) <= pb.time + 1e-6 ? '' : ' dim'}" style="${subj(e) ? 'font-weight:700' : ''}${(e.t ?? 0) <= pb.time + 1e-6 ? '' : ';opacity:0.45'}"><span class="t">${(e.t ?? 0).toFixed(1)}s</span><span>${esc(e.text || e.kind)}</span></div>`).join('');
      el.querySelectorAll('.rv2-phase').forEach((row) => { const ph = phases[Number(row.dataset.i)]; const on = ticked(ph); row.querySelector('.rv2-box').textContent = on ? '✓' : ph.ok ? '☐' : '✗'; row.classList.toggle('ticked', on); row.querySelector('.rv2-ev').style.display = on || !ph.ok ? '' : 'none'; row.style.color = on ? 'var(--good)' : ph.ok ? '' : 'var(--bad)'; });
      const v = el.querySelector('[data-rv2="verdict"]'); if (v && ok) { const all = phases.every(ticked); v.textContent = all ? 'Validated: every phase observed in the engine\'s events for this run (trigger, activation, resolution, cleanup).' : 'Playing… phases tick as playback reaches their engine events.'; v.dataset.done = all ? '1' : '0'; }
      el.querySelector('[data-pb="toggle"]').textContent = pb.playing ? '⏸' : '▶';
      el.querySelectorAll('[data-pb="speed"]').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === pb.speed));
    }
    const nextPlay = () => { if (pb.pi + 1 < prepared.length) { pb.pi += 1; pb.time = 0; pb.hold = 0; return true; } pb.time = prepared[pb.pi].end; pb.playing = false; pb.done = true; return false; };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pb]'); if (!b) return; const a = b.dataset.pb; const P = prepared[pb.pi];
      if (a === 'toggle') { if (pb.done) { pb.pi = 0; pb.time = 0; pb.done = false; } pb.playing = !pb.playing; }
      else if (a === 'replay') { pb.pi = 0; pb.time = 0; pb.hold = 0; pb.done = false; pb.playing = true; }
      else if (a === 'speed') pb.speed = Number(b.dataset.v);
      else if (a === 'event') { pb.playing = false; const nx = P.events.find((x) => (x.t ?? 0) > pb.time + 1e-6); if (nx) pb.time = nx.t; else if (pb.time < P.end - 1e-6) pb.time = P.end; else if (nextPlay()) { const f = prepared[pb.pi].events[0]; pb.time = f ? f.t ?? 0 : 0; } }
      else if (a === 'play') { pb.playing = false; if (pb.time < P.end - 1e-6 && pb.pi === prepared.length - 1) pb.time = P.end; else nextPlay(); }
      else if (a === 'prevplay') { pb.playing = false; pb.done = false; pb.pi = Math.max(0, pb.pi - 1); pb.time = 0; }
      pb.last = performance.now(); pb.drawn = ''; draw();
    });
    const tick = (now) => {
      if (!svg.isConnected || st.pb !== pb) { if (st.pb === pb) st.raf = null; return; }
      const dt = Math.min(0.1, (now - pb.last) / 1000); pb.last = now;
      if (pb.playing) { const P = prepared[pb.pi]; if (pb.time < P.end) pb.time = Math.min(P.end, pb.time + dt * pb.speed * (app.settings?.speed || 1)); else { pb.hold += dt; if (pb.hold > 0.8) nextPlay(); } draw(); }
      st.raf = requestAnimationFrame(tick);
    };
    draw(); st.raf = requestAnimationFrame(tick);
  }
}
