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

const COUNTS = [25, 50, 100, 300];
export function registerAttrLab(Router, app) {
  const S = { attr: 'speed', trial: null, low: 50, high: 95, n: 50, busy: false, progress: 0, result: null, watch: null, raf: 0, i: 0 };
  const trialsFor = (attr) => T.TRIALS.filter((t) => t.attr === attr);
  const current = () => trialsFor(S.attr).find((t) => t.id === S.trial) || trialsFor(S.attr)[0] || null;
  const isPlay = (attr) => !['durability', 'kicking'].includes(attr);
  const fmt = (k, v) => { if (v == null) return '—'; const m = T.METRIC[k]; const unit = m?.[1]; if (unit === '%') return `${Math.round(v * 100)}%`; return `${(+v).toFixed(unit === 's' ? 2 : unit === 'yd' ? 1 : 2)}${unit ? ' ' + unit : ''}`; };
  const delta = (k, lo, hi) => { if (lo == null || hi == null) return ''; const m = T.METRIC[k]; const d = hi - lo; if (m?.[1] === '%') return `${d >= 0 ? '+' : ''}${Math.round(d * 100)} pts`; return `${d >= 0 ? '+' : ''}${d.toFixed(m?.[1] === 's' ? 2 : 2)}`; };
  const stop = () => { cancelAnimationFrame(S.raf); S.raf = 0; };

  /** Run both ratings in slices so the page stays responsive on a phone. */
  async function run() {
    const t = current(); if (S.busy) return;
    const low = Math.max(1, Math.min(99, Math.round(Number(S.low) || 50))), high = Math.max(1, Math.min(99, Math.round(Number(S.high) || 95)));
    S.low = low; S.high = high; S.busy = true; S.progress = 0; S.result = null; S.watch = null; stop(); Router.render();
    await new Promise((r) => setTimeout(r, 20));
    try {
      if (!isPlay(S.attr)) {
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
    const t = current(); if (!t || !S.result?.play) return; stop();
    const runs = [S.low, S.high].map((v) => { const sim = t.run(v, seed); return { v, sim, subjects: { off: [...T.lastSetup.offSubjects], def: [...T.lastSetup.defSubjects] } }; });
    const n = Math.max(...runs.map((r) => r.sim.frames.length));
    S.watch = { seed, runs, n }; S.i = 0; Router.render();
    const start = performance.now(); const ms = 100 / (app.settings?.speed || 1) / 2; // the frames are 0.05 s apart
    const tick = (now) => { if (!S.watch) return; const i = Math.min(n - 1, Math.floor((now - start) / ms)); if (i !== S.i) { S.i = i; drawWatch(); } if (i < n - 1) S.raf = requestAnimationFrame(tick); };
    S.raf = requestAnimationFrame(tick);
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
      svg.innerHTML = html;
      const c = document.querySelector(`#attrclock${k}`); if (c) c.textContent = `${(f.t ?? 0).toFixed(1)} s`;
    });
  }
  const resultText = (sim) => `${sim.result}${sim.yards ? ` · ${sim.yards} yd` : ''}`;

  function resultsHtml() {
    const r = S.result; if (!r) return '';
    if (r.error) return `<p class="warn">The trial failed: ${esc(r.error)}</p>`;
    const lo = r.levels[S.low], hi = r.levels[S.high]; const keys = Object.keys(lo || {});
    return `<div class="panel lab-compare attr-results">
      <h3 style="margin-top:0">${esc(ATTR_NAME[S.attr])} ${S.low} vs ${S.high} · ${r.n} ${r.play ? 'plays each' : 'trials each'}</h3>
      <p class="dim" style="margin-top:0">${esc(r.label)}. Measured by the engine; everyone else is a plain 65, same seeds for both.</p>
      <table class="lab-table"><tr><th>Measure</th><th class="mono">${S.low}</th><th class="mono">${S.high}</th><th>Diff</th></tr>${keys.map((k) => `<tr><th>${esc(T.METRIC[k]?.[0] || k)}</th><td class="mono">${fmt(k, lo[k])}</td><td class="mono">${fmt(k, hi[k])}</td><td class="mono dim">${esc(delta(k, lo[k], hi[k]))}</td></tr>`).join('')}</table>
      <p class="dim">A rate at ${r.n} trials is accurate to about ±${Math.round(100 / Math.sqrt(r.n))} points; smaller changes may be noise.</p>
      ${r.play ? `<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn" data-action="attr-watch" data-seed="${r.seed}">▶ Watch one play side by side</button><button class="btn small" data-action="attr-watch" data-seed="${r.seed + 1 + Math.floor(Math.random() * (r.n - 1))}">Another seed</button></div>` : ''}
      ${S.watch ? watchHtml() : ''}</div>`;
  }
  function watchHtml() {
    const w = S.watch;
    return `<div class="attr-watch">${w.runs.map((r, k) => `<div><div class="lab-line"><b>${esc(ATTR_NAME[S.attr])} ${r.v}</b><span class="dim">seed ${w.seed} · ${esc(resultText(r.sim))}</span></div><div class="field-wrap" style="position:relative"><svg id="attrfield${k}" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(ATTR_NAME[S.attr])} ${r.v}"></svg><div class="lab-clock" id="attrclock${k}">0.0 s</div></div></div>`).join('')}</div>
      <p class="dim" style="margin:4px 0 0">The ringed monster is the one whose ${esc(ATTR_NAME[S.attr])} differs. Same play, same defense, same dice on both fields.</p>
      <button class="btn small" data-action="attr-replay" data-seed="${w.seed}">↻ Replay</button>`;
  }
  Router.registerScreen('attr-lab', {
    title: 'Attribute Testing Lab', tabs: false,
    render() {
      const t = current(); const trials = trialsFor(S.attr);
      return `<p class="muted">Compare two ratings of one attribute on the real football engine, everything else equal. Separate from your franchises: nothing here touches a save.</p>
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
      if (S.watch) drawWatch();
      delegate(root, {
        'attr-attr': (el) => { S.attr = el.value; S.trial = null; S.result = null; S.watch = null; stop(); Router.render(); },
        'attr-trial': (el) => { S.trial = el.value; S.result = null; S.watch = null; stop(); Router.render(); },
        'attr-low': (el) => { S.low = el.value; }, 'attr-high': (el) => { S.high = el.value; }, 'attr-n': (el) => { S.n = Number(el.value); },
        'attr-run': () => run(), 'attr-watch': (el) => watch(Number(el.dataset.seed)), 'attr-replay': (el) => watch(Number(el.dataset.seed)),
      });
    },
    unmount() { stop(); },
  });
}
