// Attribute Testing Lab (GDD §8.2 audit, v42.6), Developer Tools only. The owner picks an attribute, a trial (a position and a
// situation), a low and a high rating, and runs the real football engine on both: every monster on the field is a plain 65 with
// no ability and no elemental type, only the subject's one attribute differs, and both ratings play the same seeds. The results
// are the engine's own measurements (completion, separation, time to pressure, broken tackles, ...), never assumed values, and
// one seeded play can be watched side by side (low on the left, high on the right) with the subject ringed. Pure diagnostics:
// generated slots only, no franchise, no save, nothing stored. Trials live in src/lab/attr-trials.js, shared with tools/attr-study.mjs.
import { esc, delegate } from '../dom.js';
import { fieldSvg, FIELD_VIEWBOX } from '../field-view.js';
import { ATTR_NAME, ATTR_ORDER, POSITION_NAME } from '../../data/stat-guide.js';
import * as T from '../../lab/attr-trials.js';
import * as D from '../../lab/def-scenario.js';
import { PLAYS } from '../../data/playbook.js';
import { defOverlaySvg, decisionText } from '../def-overlay.js';

const COUNTS = [25, 50, 100, 300];
export function registerAttrLab(Router, app) {
  const S = { mode: 'attr', attr: 'speed', trial: null, low: 50, high: 95, n: 50, busy: false, progress: 0, result: null, watch: null, raf: 0, i: 0,
    sc: { ...D.PRESETS[0] }, paused: false, speed: 0.5, show: { assign: true, aim: true, path: true, labels: true }, focus: '' };
  const trialsFor = (attr) => T.TRIALS.filter((t) => t.attr === attr);
  const current = () => trialsFor(S.attr).find((t) => t.id === S.trial) || trialsFor(S.attr)[0] || null;
  const isPlay = (attr) => !['durability', 'kicking'].includes(attr);
  const fmt = (k, v, MET = T.METRIC) => { if (v == null) return '—'; const m = MET[k]; const unit = m?.[1]; if (unit === '%') return `${Math.round(v * 100)}%`; return `${(+v).toFixed(unit === 's' ? 2 : unit === 'yd' ? 1 : 2)}${unit ? ' ' + unit : ''}`; };
  const delta = (k, lo, hi, MET = T.METRIC) => { if (lo == null || hi == null) return ''; const m = MET[k]; const d = hi - lo; if (m?.[1] === '%') return `${d >= 0 ? '+' : ''}${Math.round(d * 100)} pts`; return `${d >= 0 ? '+' : ''}${d.toFixed(m?.[1] === 's' ? 2 : 2)}`; };
  const stop = () => { cancelAnimationFrame(S.raf); S.raf = 0; };

  /** Run both ratings in slices so the page stays responsive on a phone. */
  async function run() {
    const t = current(); if (S.busy) return;
    const low = Math.max(1, Math.min(99, Math.round(Number(S.low) || 50))), high = Math.max(1, Math.min(99, Math.round(Number(S.high) || 95)));
    S.low = low; S.high = high; S.busy = true; S.progress = 0; S.result = null; S.watch = null; stop(); Router.render();
    await new Promise((r) => setTimeout(r, 20));
    try {
      if (S.mode === 'def') {
        const rows = { [low]: [], [high]: [] }; const total = 2 * S.n; let done = 0;
        for (const v of [low, high]) for (let i = 0; i < S.n; i++) {
          rows[v].push(D.measureScenario(D.runScenario(S.sc, v, 1000 + i))); done++;
          if (done % 10 === 0) { S.progress = done / total; const el = document.querySelector('#attrprog'); if (el) el.textContent = `${Math.round(S.progress * 100)}%`; await new Promise((r) => setTimeout(r, 0)); }
        }
        S.result = { id: 'def', label: scenarioLabel(), n: S.n, levels: { [low]: D.aggregate(rows[low]), [high]: D.aggregate(rows[high]) }, play: true, def: true, seed: 1000 };
      } else if (!isPlay(S.attr)) {
        const r = S.attr === 'durability' ? T.durabilityStudy(S.n, [low, high]) : T.kickingStudy(S.n, [low, high]);
        S.result = { id: r.id, label: r.label, n: S.n, levels: r.levels, play: false };
      } else {
        const rows = { [low]: [], [high]: [] }; const total = 2 * S.n; let done = 0;
        for (const v of [low, high]) {
          for (let i = 0; i < S.n; i++) {
            rows[v].push(t.measure(t.run(v, 1000 + i))); done++;
            if (done % 10 === 0) { S.progress = done / total; const el = document.querySelector('#attrprog'); if (el) el.textContent = `${Math.round(S.progress * 100)}%`; await new Promise((r) => setTimeout(r, 0)); }
          }
        }
        const agg = (list) => { const out = {}; for (const k of Object.keys(list[0] || {})) { const xs = list.map((r) => r[k]).filter((x) => x != null); if (!xs.length) { out[k] = null; continue; } out[k] = typeof xs[0] === 'boolean' ? xs.filter(Boolean).length / xs.length : xs.reduce((a, b) => a + b, 0) / xs.length; } return out; };
        S.result = { id: t.id, label: t.label, n: S.n, levels: { [low]: agg(rows[low]), [high]: agg(rows[high]) }, play: true, seed: 1000 };
      }
    } catch (e) { S.result = { error: String(e?.message || e) }; }
    S.busy = false; Router.render();
  }
  /** One seeded play at each rating, drawn side by side; the subject(s) ringed. */
  function watch(seed) {
    if (S.mode === 'def') return watchDef(seed);
    const t = current(); if (!t || !S.result?.play) return; stop();
    const runs = [S.low, S.high].map((v) => { const sim = t.run(v, seed); return { v, sim, subjects: { off: [...T.lastSetup.offSubjects], def: [...T.lastSetup.defSubjects] } }; });
    const n = Math.max(...runs.map((r) => r.sim.frames.length));
    S.watch = { seed, runs, n }; S.i = 0; Router.render();
    const start = performance.now(); const ms = 100 / (app.settings?.speed || 1) / 2; // the frames are 0.05 s apart
    const tick = (now) => { if (!S.watch) return; const i = Math.max(0, Math.min(n - 1, Math.floor((now - start) / ms))); /* rAF can stamp a frame just before start */ if (i !== S.i) { S.i = i; drawWatch(); } if (i < n - 1) S.raf = requestAnimationFrame(tick); };
    S.raf = requestAnimationFrame(tick);
  }
  // ---- Defensive scenario: traced plays, pause / step / slow motion, and the developer overlay
  const scenarioLabel = () => `${PLAYS[S.sc.off]?.name} vs ${PLAYS[S.sc.def]?.name} · ${S.sc.qb === 'throw' ? `ball to ${S.sc.target} at ${S.sc.at} s` : S.sc.qb === 'hold' ? 'QB holds 4 s' : 'real AI quarterback'} · ${ATTR_NAME[S.sc.attr]} on ${D.subjectsOf(S.sc.def, S.sc.subject).join(', ')}`;
  function watchDef(seed) {
    if (!S.result?.def) return; stop();
    const runs = [S.low, S.high].map((v) => ({ v, sim: D.runScenario(S.sc, v, seed, { trace: true }), subjects: { off: [], def: D.subjectsOf(S.sc.def, S.sc.subject) } }));
    const n = Math.max(...runs.map((r) => r.sim.frames.length));
    S.watch = { seed, runs, n, def: true, asg: D.assignmentsOf(S.sc) }; S.i = 0; S.paused = false; Router.render(); playLoop();
  }
  function playLoop() {
    stop(); let last = performance.now(), acc = 0;
    const tick = (now) => { const w = S.watch; if (!w) return; const dt = Math.max(0, now - last); last = Math.max(last, now); // rAF can stamp a frame slightly before performance.now()
      if (!S.paused) { acc += dt * S.speed * (app.settings?.speed || 1); const step = Math.floor(acc / 50); if (step) { acc -= step * 50; S.i = Math.max(0, Math.min(w.n - 1, S.i + step)); drawWatch(); } if (S.i >= w.n - 1) { S.paused = true; syncControls(); } }
      S.raf = requestAnimationFrame(tick); };
    S.raf = requestAnimationFrame(tick);
  }
  function syncControls() { const b = document.querySelector('[data-action="def-pause"]'); if (b) b.textContent = S.paused ? '▶ Play' : '❚❚ Pause'; }
  function decisionsHtml() {
    const w = S.watch; if (!w?.def) return '';
    return w.runs.map((r) => { const f = r.sim.frames[Math.min(S.i, r.sim.frames.length - 1)]; const why = Object.fromEntries((f.dbg || []).map((e) => [e[0], e]));
      return `<div><b>${esc(ATTR_NAME[S.sc.attr])} ${r.v}</b><ul class="def-decisions">${f.def.filter((d) => !S.focus || d[0] === S.focus).map((d) => `<li><span class="mono">${esc(d[0])}</span> <span class="dim">${esc(w.asg[d[0]]?.label || '')}</span> → ${esc(decisionText(why[d[0]]) || '—')}</li>`).join('')}</ul></div>`; }).join('');
  }
  function drawWatch() {
    const w = S.watch; if (!w) return;
    w.runs.forEach((r, k) => {
      const svg = document.querySelector(`#attrfield${k}`); if (!svg) return; const fs = r.sim.frames; const f = fs[Math.min(S.i, fs.length - 1)];
      const subj = r.subjects.off[0] || null; const defSubj = r.subjects.def[0] || null;
      // The subject marker: fieldSvg's read ring draws around frame.read (an offensive slot); a defender subject is marked below.
      const frame = subj ? { ...f, read: subj } : f;
      let html = fieldSvg({ ballOn: r.sim.ballOn, ballLat: 0, toGo: 10, colors: { off: '#74c5ff', def: '#ff9385' }, frame, prevFrame: fs[S.i - 1] || null, camera: { bottom: r.sim.ballOn - 10, top: r.sim.ballOn + 36 }, qbRead: !!subj });
      if (!subj && defSubj) { const p = f.def.find((q) => q[0] === defSubj); if (p) { const cy = (r.sim.ballOn + 36) - (r.sim.ballOn + p[1]); html += `<circle class="qb-read-ring" cx="${p[2].toFixed(2)}" cy="${(cy - 0.6).toFixed(2)}" r="2.3" fill="none" stroke="#ffe26c" stroke-width="0.28" stroke-dasharray="0.9 0.6" opacity="0.85"/>`; } }
      for (const extra of r.subjects.off.slice(1)) { const p = f.off.find((q) => q[0] === extra); if (p) { const cy = (r.sim.ballOn + 36) - (r.sim.ballOn + p[1]); html += `<circle cx="${p[2].toFixed(2)}" cy="${(cy - 0.6).toFixed(2)}" r="2.3" fill="none" stroke="#ffe26c" stroke-width="0.28" stroke-dasharray="0.9 0.6" opacity="0.85"/>`; } }
      for (const extra of (subj ? r.subjects.def : r.subjects.def.slice(1))) { const p = f.def.find((q) => q[0] === extra); if (p) { const cy = (r.sim.ballOn + 36) - (r.sim.ballOn + p[1]); html += `<circle cx="${p[2].toFixed(2)}" cy="${(cy - 0.6).toFixed(2)}" r="2.3" fill="none" stroke="#ffe26c" stroke-width="0.28" stroke-dasharray="0.9 0.6" opacity="0.85"/>`; } }
      if (w.def) html += defOverlaySvg({ frames: fs, i: Math.min(S.i, fs.length - 1), ballOn: r.sim.ballOn, camTop: r.sim.ballOn + 36, assignments: w.asg, show: S.show, focus: S.focus || null });
      svg.innerHTML = html;
      const c = document.querySelector(`#attrclock${k}`); if (c) c.textContent = `${(f.t ?? 0).toFixed(w.def ? 2 : 1)} s`;
    });
    if (w.def) { const el = document.querySelector('#defdecisions'); if (el) el.innerHTML = decisionsHtml(); }
  }
  const resultText = (sim) => `${sim.result}${sim.yards ? ` · ${sim.yards} yd` : ''}`;

  function resultsHtml() {
    const r = S.result; if (!r) return '';
    if (r.error) return `<p class="warn">The trial failed: ${esc(r.error)}</p>`;
    const lo = r.levels[S.low], hi = r.levels[S.high]; const keys = Object.keys(lo || {}).filter((k) => !r.def || lo[k] != null || hi[k] != null);
    const MET = r.def ? D.SCENARIO_METRIC : T.METRIC; const name = r.def ? ATTR_NAME[S.sc.attr] : ATTR_NAME[S.attr];
    return `<div class="panel lab-compare attr-results">
      <h3 style="margin-top:0">${esc(name)} ${S.low} vs ${S.high} · ${r.n} ${r.play ? 'plays each' : 'trials each'}</h3>
      <p class="dim" style="margin-top:0">${esc(r.label)}. Measured by the engine; everyone else is a plain 65, same seeds for both.</p>
      <table class="lab-table"><tr><th>Measure</th><th class="mono">${S.low}</th><th class="mono">${S.high}</th><th>Diff</th></tr>${keys.map((k) => `<tr><th>${esc(MET[k]?.[0] || k)}</th><td class="mono">${fmt(k, lo[k], MET)}</td><td class="mono">${fmt(k, hi[k], MET)}</td><td class="mono dim">${esc(delta(k, lo[k], hi[k], MET))}</td></tr>`).join('')}</table>
      <p class="dim">A rate at ${r.n} trials is accurate to about ±${Math.round(100 / Math.sqrt(r.n))} points; smaller changes may be noise.</p>
      ${r.play ? `<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn" data-action="attr-watch" data-seed="${r.seed}">▶ Watch one play side by side</button><button class="btn small" data-action="attr-watch" data-seed="${r.seed + 1 + Math.floor(Math.random() * (r.n - 1))}">Another seed</button></div>` : ''}
      ${S.watch ? watchHtml() : ''}</div>`;
  }
  function watchHtml() {
    const w = S.watch;
    if (w.def) {
      const slots = PLAYS[S.sc.def].onField;
      return `<div class="attr-watch">${w.runs.map((r, k) => `<div><div class="lab-line"><b>${esc(ATTR_NAME[S.sc.attr])} ${r.v}</b><span class="dim">seed ${w.seed} · ${esc(resultText(r.sim))}</span></div><div class="field-wrap" style="position:relative"><svg id="attrfield${k}" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(ATTR_NAME[S.sc.attr])} ${r.v}"></svg><div class="lab-clock" id="attrclock${k}">0.0 s</div></div></div>`).join('')}</div>
        <div class="row def-controls" style="gap:6px;flex-wrap:wrap;margin-top:6px">
          <button class="btn small" data-action="def-step" data-d="-1" aria-label="Back one frame">◀︎</button><button class="btn small primary" data-action="def-pause">${S.paused ? '▶ Play' : '❚❚ Pause'}</button><button class="btn small" data-action="def-step" data-d="1" aria-label="Forward one frame">▶︎</button>
          <div class="seg" role="radiogroup" aria-label="Playback speed">${[0.25, 0.5, 1].map((x) => `<button class="btn small ${S.speed === x ? 'primary' : ''}" data-action="def-speed" data-v="${x}" role="radio" aria-checked="${S.speed === x}">${x}×</button>`).join('')}</div>
          <button class="btn small" data-action="attr-replay" data-seed="${w.seed}">↻ Replay</button>
        </div>
        <div class="row def-toggles" style="gap:10px;flex-wrap:wrap;margin-top:6px">${[['assign', 'Assignments'], ['aim', 'Intended path'], ['path', 'Actual path'], ['labels', 'Decisions']].map(([k, l]) => `<label class="check"><input type="checkbox" data-change="def-show" data-k="${k}" ${S.show[k] ? 'checked' : ''}> ${l}</label>`).join('')}
          <label class="field" style="margin:0">Defender<select data-change="def-focus"><option value="">All</option>${slots.map((x) => `<option ${S.focus === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
        <p class="dim" style="margin:4px 0 0">Developer view: orange line = his man, dashed circle = his zone, cyan dashes = where the engine is steering him, white trail = where he actually went (last second). Shown only here, never in a game.</p>
        <div class="def-decision-grid" id="defdecisions">${decisionsHtml()}</div>`;
    }
    return `<div class="attr-watch">${w.runs.map((r, k) => `<div><div class="lab-line"><b>${esc(ATTR_NAME[S.attr])} ${r.v}</b><span class="dim">seed ${w.seed} · ${esc(resultText(r.sim))}</span></div><div class="field-wrap" style="position:relative"><svg id="attrfield${k}" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(ATTR_NAME[S.attr])} ${r.v}"></svg><div class="lab-clock" id="attrclock${k}">0.0 s</div></div></div>`).join('')}</div>
      <p class="dim" style="margin:4px 0 0">The ringed monster is the one whose ${esc(ATTR_NAME[S.attr])} differs. Same play, same defense, same dice on both fields.</p>
      <button class="btn small" data-action="attr-replay" data-seed="${w.seed}">↻ Replay</button>`;
  }
  function defSetupHtml() {
    const sc = S.sc; const offs = D.offensePlays(), defs = D.defensePlays(); const kinds = ['Man', 'Zone', 'Blitz', 'Run front'];
    const subjOpts = [...Object.entries(D.GROUPS).map(([k, l]) => [k, l]), ...PLAYS[sc.def].onField.map((x) => [x, `${x} only (${D.assignmentsOf(sc)[x]?.label})`])];
    const recv = D.receiversOf(sc.off);
    return `<div class="lab-setup">
      <label class="field">Scenario<select data-change="def-preset"><option value="">Custom</option>${D.PRESETS.map((p) => `<option value="${p.id}" ${sc.id === p.id ? 'selected' : ''}>${esc(p.label)}</option>`).join('')}</select></label>
      <label class="field">Offensive play<select data-change="def-off">${offs.map((k) => `<option value="${k}" ${sc.off === k ? 'selected' : ''}>${esc(PLAYS[k].name)} · ${esc(PLAYS[k].type || '')}</option>`).join('')}</select></label>
      <label class="field">Defensive call<select data-change="def-def">${kinds.map((g) => `<optgroup label="${g}">${defs.filter((k) => D.defenseKind(k) === g).map((k) => `<option value="${k}" ${sc.def === k ? 'selected' : ''}>${esc(PLAYS[k].name)}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <div class="row" style="gap:6px;align-items:flex-end;flex-wrap:wrap">
        <label class="field" style="flex:1;min-width:130px">Defenders tested<select data-change="def-subject">${subjOpts.map(([k, l]) => `<option value="${k}" ${sc.subject === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label class="field" style="flex:1;min-width:110px">Attribute<select data-change="def-attr">${D.DEF_ATTRS.map((a) => `<option value="${a}" ${sc.attr === a ? 'selected' : ''}>${esc(ATTR_NAME[a])}</option>`).join('')}</select></label></div>
      <div class="row" style="gap:6px;align-items:flex-end;flex-wrap:wrap">
        <label class="field" style="flex:1;min-width:130px">Quarterback<select data-change="def-qb"><option value="ai" ${sc.qb === 'ai' ? 'selected' : ''}>Real AI (reads, run plays run)</option><option value="hold" ${sc.qb === 'hold' ? 'selected' : ''}>Holds the ball 4 s (rush test)</option><option value="throw" ${sc.qb === 'throw' ? 'selected' : ''}>Throws to one receiver</option></select></label>
        ${sc.qb === 'throw' ? `<label class="field" style="flex:1;min-width:70px">Receiver<select data-change="def-target">${recv.map((x) => `<option ${sc.target === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label><label class="field" style="flex:1;min-width:60px">At (s)<input type="number" min="0.5" max="4" step="0.1" value="${sc.at}" data-change="def-at" inputmode="decimal"></label>` : ''}</div>
      <p class="dim" style="margin:0">${esc(scenarioLabel())}. Everyone is a plain 65 with no ability or type; only the tested defenders' ${esc(ATTR_NAME[sc.attr])} changes.</p>
      <div class="row" style="gap:6px;align-items:flex-end"><label class="field" style="flex:1">Low<input type="number" min="1" max="99" value="${S.low}" data-change="attr-low" inputmode="numeric"></label><label class="field" style="flex:1">High<input type="number" min="1" max="99" value="${S.high}" data-change="attr-high" inputmode="numeric"></label><label class="field" style="flex:1">Plays<select data-change="attr-n">${COUNTS.map((c) => `<option value="${c}" ${S.n === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div>
      <button class="btn primary big block" data-action="attr-run" ${S.busy ? 'disabled' : ''}>${S.busy ? `Running… <span id="attrprog">${Math.round(S.progress * 100)}%</span>` : '▶ Run the scenario'}</button>
    </div>`;
  }
  const scChange = (patch) => { S.sc = { ...S.sc, id: '', ...patch }; S.result = null; S.watch = null; stop(); Router.render(); };
  Router.registerScreen('attr-lab', {
    title: 'Attribute Testing Lab', tabs: false,
    render() {
      const t = current(); const trials = trialsFor(S.attr);
      const modeSeg = `<div class="seg" role="radiogroup" aria-label="Lab mode"><button class="btn small ${S.mode === 'attr' ? 'primary' : ''}" data-action="lab-mode" data-v="attr" role="radio" aria-checked="${S.mode === 'attr'}">Attribute trials</button><button class="btn small ${S.mode === 'def' ? 'primary' : ''}" data-action="lab-mode" data-v="def" role="radio" aria-checked="${S.mode === 'def'}">🛡 Defensive scenario</button></div>`;
      if (S.mode === 'def') return `<p class="muted">Test the defensive AI on any play against any call, two ratings side by side, with the defenders' assignments and decisions drawn on the field. Nothing here touches a save.</p>${modeSeg}${defSetupHtml()}${resultsHtml()}`;
      return `<p class="muted">Compare two ratings of one attribute on the real football engine, everything else equal. Separate from your franchises: nothing here touches a save.</p>
        ${modeSeg}
        <div class="lab-setup">
          <label class="field">Attribute<select data-change="attr-attr">${ATTR_ORDER.map((a) => `<option value="${a}" ${S.attr === a ? 'selected' : ''}>${esc(ATTR_NAME[a])} · ${esc(T.CATEGORY[a])}</option>`).join('')}</select></label>
          ${isPlay(S.attr) ? `<label class="field">Trial (position · situation)<select data-change="attr-trial">${trials.map((x) => `<option value="${x.id}" ${t?.id === x.id ? 'selected' : ''}>${esc(POSITION_NAME[x.pos] || x.pos)} · ${esc(x.label.split(':')[0])}</option>`).join('')}</select></label>` : `<p class="dim" style="margin:0">${S.attr === 'durability' ? 'One game at fatigue 30: injury rate and fatigue gained (progression.js).' : 'Field goals, punts and kickoffs (special-teams.js).'}</p>`}
          ${t && isPlay(S.attr) ? `<p class="dim" style="margin:0">${esc(t.label)}</p>` : ''}
          <div class="row" style="gap:6px;align-items:flex-end"><label class="field" style="flex:1">Low<input type="number" min="1" max="99" value="${S.low}" data-change="attr-low" inputmode="numeric"></label><label class="field" style="flex:1">High<input type="number" min="1" max="99" value="${S.high}" data-change="attr-high" inputmode="numeric"></label><label class="field" style="flex:1">${isPlay(S.attr) ? 'Plays' : 'Trials'}<select data-change="attr-n">${COUNTS.map((c) => `<option value="${c}" ${S.n === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label></div>
          <button class="btn primary big block" data-action="attr-run" ${S.busy ? 'disabled' : ''}>${S.busy ? `Running… <span id="attrprog">${Math.round(S.progress * 100)}%</span>` : '▶ Run the comparison'}</button>
        </div>
        ${resultsHtml()}`;
    },
    mount(root) {
      if (S.watch) { drawWatch(); if (S.watch.def && !S.raf) playLoop(); }
      delegate(root, {
        'attr-attr': (el) => { S.attr = el.value; S.trial = null; S.result = null; S.watch = null; stop(); Router.render(); },
        'attr-trial': (el) => { S.trial = el.value; S.result = null; S.watch = null; stop(); Router.render(); },
        'attr-low': (el) => { S.low = el.value; }, 'attr-high': (el) => { S.high = el.value; }, 'attr-n': (el) => { S.n = Number(el.value); },
        'lab-mode': (el) => { S.mode = el.dataset.v; S.result = null; S.watch = null; stop(); Router.render(); },
        'def-preset': (el) => { const p = D.PRESETS.find((x) => x.id === el.value); if (p) { S.sc = { ...p }; S.result = null; S.watch = null; stop(); Router.render(); } },
        'def-off': (el) => { const recv = D.receiversOf(el.value); scChange({ off: el.value, target: recv.includes(S.sc.target) ? S.sc.target : recv[0] }); },
        'def-def': (el) => scChange({ def: el.value, subject: D.GROUPS[S.sc.subject] || PLAYS[el.value].onField.includes(S.sc.subject) ? S.sc.subject : 'coverage' }),
        'def-subject': (el) => scChange({ subject: el.value }), 'def-attr': (el) => scChange({ attr: el.value }),
        'def-qb': (el) => { const recv = D.receiversOf(S.sc.off); scChange({ qb: el.value, target: S.sc.target || recv[0], at: S.sc.at || 1.8 }); },
        'def-target': (el) => scChange({ target: el.value }), 'def-at': (el) => { S.sc = { ...S.sc, id: '', at: Math.max(0.5, Math.min(4, Number(el.value) || 1.8)) }; S.result = null; },
        'def-pause': () => { if (!S.watch) return; if (S.paused && S.i >= S.watch.n - 1) S.i = 0; S.paused = !S.paused; syncControls(); },
        'def-step': (el) => { if (!S.watch) return; S.paused = true; S.i = Math.max(0, Math.min(S.watch.n - 1, S.i + Number(el.dataset.d))); syncControls(); drawWatch(); },
        'def-speed': (el) => { S.speed = Number(el.dataset.v); document.querySelectorAll('[data-action="def-speed"]').forEach((b) => { const on = Number(b.dataset.v) === S.speed; b.classList.toggle('primary', on); b.setAttribute('aria-checked', String(on)); }); },
        'def-show': (el) => { S.show = { ...S.show, [el.dataset.k]: el.checked }; drawWatch(); },
        'def-focus': (el) => { S.focus = el.value; drawWatch(); },
        'attr-run': () => run(), 'attr-watch': (el) => watch(Number(el.dataset.seed)), 'attr-replay': (el) => watch(Number(el.dataset.seed)),
      });
    },
    unmount() { stop(); },
  });
}
