// AI Testing Lab screen (GDD §53.8), Developer Tools only. The owner plays quarterback on the real engine and compares his decision
// with the AI's from the identical situation. v42.6: he picks an offensive pass play (or Random), studies its play art (the same
// renderer as Franchise Mode, offense only), snaps, and decides by tapping a receiving monster on the field (throw) or his
// quarterback (scramble). If he waits, the rush can get home: holding the ball is allowed, a throw-away is not a choice. The defense
// is chosen from the live playbook by a per-play rotation (every defense once, shuffled, then a new cycle) and stays hidden (no
// name, no coverage, no art; only the base alignment a quarterback sees before the snap) until the play is over.
// Mode Live: real time. Mode Paused: the play runs to the AI's decision point and freezes there.
// Generated practice clubs only: no franchise is read or written. Records and the rotation live in the Lab's own storage
// (src/lab/lab-store.js) and leave the device only by export.
import { esc, delegate, toast, confirmSheet } from '../dom.js';
import { PLAYS } from '../../data/playbook.js';
import { fieldSvg, FIELD_VIEWBOX, presnapLook } from '../field-view.js';
import { playCardSvg } from '../play-art.js';
import * as Lab from '../../lab/qb-lab.js';
import { labAll, labPut, labClear, labUsage, labStorageMode, labMetaGet, labMetaPut } from '../../lab/lab-store.js';
import { qbReadPanelHtml, resultText } from '../qb-read-ui.js';
import { createRng } from '../../core/rng.js';
import { offerFile } from '../file-offer.js';

const ROT_KEY = 'rotation-v1';
const TAP_RADIUS = 3.2; // yards around a monster that count as tapping it (about 46 px across on a phone)

export function registerAiLab(Router, app) {
  const L = { tab: 'decide', mode: 'live', offense: 'random', awareness: 'team', ballOn: 35, sit: null, hold: null, ai: null, human: null, humanSim: null, out: null, rec: null, i: 0, phase: 'idle', raf: 0, startedAt: 0, pauseAt: null, records: null, store: null, busy: false, rot: null, done: false };
  const rng = createRng((Date.now() % 1e9) || 7);
  globalThis.__gbLab = L; // read-only handle for tools/ai-lab-check.py (a Developer Tools screen: the defense is revealed after each play anyway)
  const colors = { off: '#74c5ff', def: '#ff9385' };
  const cam = () => ({ bottom: L.sit.ballOn - 10, top: L.sit.ballOn + 36 }); // deeper than the match camera: deep routes stay in view
  const sprites = () => { if (app.settings?.fieldMarkers === 'simple') return null; const T = Lab.labTeams(); return { off: { map: T.off.offense, pool: [] }, def: { map: T.def.defense, pool: [] } }; };
  const frames = () => (L.phase === 'after' ? L.humanSim?.frames : L.hold?.frames) || [];
  const frameAt = (fs, t) => { const i = fs.findIndex((f) => f.t >= t - 1e-6); return i < 0 ? fs.length - 1 : i; };
  const preSnap = () => L.phase === 'ready';
  function draw() {
    const svg = document.querySelector('#labfield'); if (!svg || !L.sit) return;
    const fs = frames(); const f = preSnap() ? null : fs[Math.min(L.i, fs.length - 1)] || null;
    // Before the snap: the offense's own play art and the defense's base alignment, exactly what Franchise Mode shows; never the call.
    const presnap = f ? null : { play: PLAYS[L.sit.offense], offensePlay: PLAYS[L.sit.offense], defensePlay: presnapLook(L.sit.defense) };
    svg.innerHTML = fieldSvg({ ballOn: L.sit.ballOn, ballLat: 0, toGo: L.sit.toGo, colors, frame: f, prevFrame: f ? fs[L.i - 1] || null : null, presnap, camera: cam(), sprites: sprites(), qbRead: false });
  }
  const stop = () => { cancelAnimationFrame(L.raf); L.raf = 0; };
  const name = (slot, side) => { const inp = Lab.playInput(L.sit); return `${(side === 'def' ? inp.defense : inp.offense)[slot]?.name || slot} (${slot})`; };

  async function loadRecords() { L.records = await labAll(); L.store = await labStorageMode(); }
  async function loadRotation() { if (!L.rot) L.rot = (await labMetaGet(ROT_KEY)) || {}; }
  const saveRotation = () => labMetaPut(ROT_KEY, L.rot).catch(() => {});
  const entryFor = (off) => (L.rot[off] = Lab.rotationEnsure(L.rot[off], rng));

  /** A situation for the chosen offense against its rotation's current defense (`same`: replay the situation as it was). */
  async function newSituation({ same = false } = {}) {
    stop(); await loadRotation();
    if (!same || !L.sit) {
      const off = L.offense === 'random' ? Lab.LAB_PASS_PLAYS[Math.floor(rng.next() * Lab.LAB_PASS_PLAYS.length)] : L.offense;
      const def = Lab.rotationCurrent(entryFor(off)); saveRotation();
      L.sit = Lab.makeSituation({ offense: off, defense: def, ballOn: L.ballOn, awareness: L.awareness === 'team' ? null : Number(L.awareness), rng });
    }
    L.hold = Lab.runHold(L.sit); L.human = L.humanSim = L.out = L.rec = L.ai = null; L.i = 0; L.done = false; L.pauseAt = null;
    if (L.mode === 'paused') { const p = Lab.pausePoint(L.sit); L.ai = p.ai; L.pauseAt = p.at; }
    L.phase = 'ready'; Router.render();
  }
  /** Snap: the held play runs (the AI never acts in it); Paused mode freezes at the decision point. */
  function snap() {
    if (L.phase !== 'ready') return; L.phase = 'live'; L.startedAt = performance.now(); const ms = 100 / (app.settings?.speed || 1); const fs = L.hold.frames; const n = fs.length;
    const freezeAt = L.mode === 'paused' ? frameAt(fs, L.pauseAt) : Infinity;
    const tick = (now) => {
      if (L.phase !== 'live') return; const i = Math.min(n - 1, freezeAt, Math.floor((now - L.startedAt) / ms));
      if (i !== L.i) { L.i = i; draw(); const c = document.querySelector('#labclock'); if (c) c.textContent = `${(fs[i].t ?? 0).toFixed(1)} s`; }
      if (i >= freezeAt) { L.phase = 'frozen'; Router.render(); return; }
      const fr = fs[i]; if (i >= n - 1 || (fr.holder && fr.holder !== 'QB') || fr.phase === 'carry') { held(); return; } // sacked (or the play ended) before he decided
      L.raf = requestAnimationFrame(tick);
    };
    Router.render(); L.raf = requestAnimationFrame(tick);
  }
  /** Store the record, count the matchup, show the comparison. */
  async function finish(ms) {
    L.rec = Lab.decisionRecord({ sit: L.sit, mode: L.mode, human: L.human, humanSim: L.humanSim, aiSim: L.ai, holdSim: L.hold, outcomes: L.out, ms });
    if (!L.done) { L.done = true; Lab.rotationComplete(entryFor(L.sit.offense), L.sit.defense); saveRotation(); }
    try { await labPut(L.rec); await loadRecords(); } catch { toast('The decision could not be stored on this device.', 'bad'); }
    L.busy = false; L.phase = 'after';
  }
  async function held() {
    stop(); if (L.busy) return; L.busy = true; L.phase = 'resolving'; Router.render(); await new Promise((r) => setTimeout(r, 20));
    const fs = L.hold.frames; L.ai ||= Lab.runAI(L.sit); L.humanSim = L.hold; L.human = { at: fs[fs.length - 1]?.t ?? 0, action: 'hold', target: null };
    L.out = { human: null, ai: Lab.rollouts(L.sit, null) };
    await finish(null); L.i = fs.length - 1; Router.render();
  }
  async function decide(action, target = null) {
    if (!['live', 'frozen'].includes(L.phase) || L.busy) return;
    const fs = L.hold.frames; const at = L.phase === 'frozen' ? L.pauseAt : (fs[L.i]?.t ?? 0); const ms = L.phase === 'live' ? Math.round(performance.now() - L.startedAt) : null;
    stop(); L.busy = true; L.phase = 'resolving'; L.human = { at, action, target }; Router.render();
    await new Promise((r) => setTimeout(r, 20));
    L.ai ||= Lab.runAI(L.sit); L.humanSim = Lab.runHuman(L.sit, L.human);
    if (!L.humanSim.qb?.decision || L.humanSim.qb.decision.by !== 'human') { L.busy = false; L.phase = 'live'; held(); return; } // already over for him
    L.out = { human: Lab.rollouts(L.sit, L.human), ai: Lab.rollouts(L.sit, null) };
    await finish(ms); L.i = frameAt(L.humanSim.frames, at); Router.render();
    // The play finishes from the decision point.
    const start = performance.now(); const i0 = L.i; const ms2 = 100 / (app.settings?.speed || 1); const n = L.humanSim.frames.length;
    const tick = (now) => { if (L.phase !== 'after') return; const i = Math.min(n - 1, i0 + Math.floor((now - start) / ms2)); if (i !== L.i) { L.i = i; draw(); } if (i < n - 1) L.raf = requestAnimationFrame(tick); };
    L.raf = requestAnimationFrame(tick);
  }
  function watchAI() { if (!L.ai) return; stop(); const fs = L.ai.frames; const start = performance.now(); const ms = 100 / (app.settings?.speed || 1); const saved = L.humanSim; L.humanSim = L.ai; L.i = 0;
    const tick = (now) => { const i = Math.min(fs.length - 1, Math.floor((now - start) / ms)); if (i !== L.i) { L.i = i; draw(); } if (i < fs.length - 1) L.raf = requestAnimationFrame(tick); else L.humanSim = saved; }; L.raf = requestAnimationFrame(tick); }

  /** Field tap → the monster under the finger: an eligible receiver (throw) or the quarterback (scramble). Defenders never count. */
  function pickAt(svg, clientX, clientY) {
    const m = svg.getScreenCTM(); if (!m) return null; const pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY; const p = pt.matrixTransform(m.inverse());
    const f = L.hold.frames[Math.min(L.i, L.hold.frames.length - 1)]; if (!f) return null; const c = cam();
    const eligible = new Set([...Lab.receiverButtons(L.sit).map((b) => b.slot), 'QB']);
    let best = null;
    for (const [slot, x, y] of f.off) {
      if (!eligible.has(slot)) continue;
      const d = Math.hypot(p.x - y, p.y - (c.top - (L.sit.ballOn + x) - 0.6)); // the sprite stands just above its spot
      if (d <= TAP_RADIUS && (!best || d < best.d)) best = { slot, d };
    }
    return best?.slot || null;
  }

  const actLabel = (a, slot) => (a === 'throw' ? `Throw to ${name(slot)}` : a === 'scramble' ? 'Scramble' : a === 'hold' ? 'Held the ball' : a === 'throwaway' ? 'Throw it away' : '—');
  const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);
  function defenseReveal() {
    const d = PLAYS[L.sit.defense]; const rec = L.rec; const n = L.rot?.[L.sit.offense]?.counts?.[L.sit.defense] || 1;
    return `<div class="lab-reveal"><div class="lab-reveal-art">${playCardSvg(d.id, { ariaLabel: `${d.name} defensive play diagram` })}</div><div><span class="lbl">The defense was</span><b>${esc(d.name)}</b><span class="dim">${esc(rec.situation.coverage)} coverage${rec.situation.blitz ? ' · blitz' : ''}</span><span class="dim">${esc(PLAYS[L.sit.offense].name)} vs ${esc(d.name)}: played ${n} time${n === 1 ? '' : 's'}</span></div></div>`;
  }
  function compareHtml() {
    const H = L.humanSim.qb?.decision?.by === 'human' ? L.humanSim.qb.decision : null; const A = L.ai.qb?.decision, rec = L.rec; const w = H?.windows || {};
    const rows = Object.entries(w).sort((a, b) => b[1].q - a[1].q).map(([slot, x]) => `<tr><th>${esc(name(slot))}</th><td><span class="lab-bar"><i style="width:${Math.max(0, Math.min(100, Math.round(x.q * 100)))}%"></i></span></td><td class="mono">${x.ready ? `${x.m1 >= 99 ? '—' : x.m1.toFixed(1)} yd` : 'not ready'}</td><td>${[x.m2 < 1.8 && x.m1 < 2.2 ? 'double' : '', x.lane ? 'lane' : '', !x.reachable ? 'out of range' : ''].filter(Boolean).join(', ')}</td></tr>`).join('');
    const ex = L.out; const better = ex.human ? ex.human.yards - ex.ai.yards : null;
    return `<div class="panel lab-compare">
      ${defenseReveal()}
      <div class="lab-vs"><div><span class="lbl">You</span><b>${esc(actLabel(L.human.action, L.human.target))}</b><span class="dim">${H ? `at ${H.t.toFixed(2)} s` : 'no throw or scramble before the play ended'}</span></div>
      <div><span class="lbl">AI (Awareness ${rec.qb.awareness})</span><b>${A ? esc(actLabel(A.action, A.slot)) : 'no decision'}</b><span class="dim">${A ? `at ${A.t.toFixed(2)} s · ${esc(A.reason)}` : ''}</span></div></div>
      <p class="${rec.agree ? 'good' : 'warn'}" style="margin:6px 0">${rec.agree ? '✓ Same decision as the AI' : '✗ Different decision from the AI'}</p>
      <h3>What happened</h3><div class="lab-vs"><div><span class="lbl">Your play</span><b>${esc(resultText(L.humanSim))}</b></div><div><span class="lbl">The AI's play</span><b>${esc(resultText(L.ai))}</b></div></div>
      ${rows ? `<h3>Receivers at your decision</h3><p class="dim" style="margin-top:0">The engine's measurement when you decided: completion-minus-risk quality, separation when the ball would arrive, and why a window was tight.</p><table class="lab-table">${rows}</table>` : ''}
      <p class="dim">${rec.pressure.sensedAt != null ? `Pressure arrived at ${rec.pressure.sensedAt.toFixed(2)} s.` : 'No pressure before your decision.'}</p>
      <h3>Expected over ${ex.ai.n} replays from the decision</h3><p class="dim" style="margin-top:0">One result proves little: each decision was replayed ${ex.ai.n} times from the moment it was made.</p>
      <table class="lab-table"><tr><th></th><th>You</th><th>AI</th></tr><tr><th>Yards</th><td class="mono">${ex.human?.yards ?? '—'}</td><td class="mono">${ex.ai.yards}</td></tr><tr><th>Completion</th><td class="mono">${pct(ex.human?.complete)}</td><td class="mono">${pct(ex.ai.complete)}</td></tr><tr><th>Interception</th><td class="mono">${pct(ex.human?.int)}</td><td class="mono">${pct(ex.ai.int)}</td></tr><tr><th>Sack</th><td class="mono">${pct(ex.human?.sack)}</td><td class="mono">${pct(ex.ai.sack)}</td></tr></table>
      ${better == null ? '' : `<p class="dim">${Math.abs(better) < 0.5 ? 'About even in expected yards.' : better > 0 ? `Your decision averaged ${better.toFixed(1)} more yards.` : `The AI's decision averaged ${(-better).toFixed(1)} more yards.`}</p>`}
      ${qbReadPanelHtml(L.ai, name, { title: "The AI's reads" })}
      <div class="grid2" style="margin-top:8px"><button class="btn" data-action="lab-again">↻ Same situation</button><button class="btn" data-action="lab-watch">▶ Watch the AI's play</button></div></div>`;
  }
  function progressHtml() {
    if (!L.sit || !L.rot) return '';
    const e = L.rot[L.sit.offense]; if (!e) return ''; const p = Lab.rotationProgress(e);
    return `<span class="lab-progress" title="Each defense once per cycle, in a random order">Defenses tested: <b class="mono">${p.tested}/${p.total}</b>${p.cycle > 1 ? ` · cycle ${p.cycle}` : ''}</span>`;
  }
  function decideHtml() {
    const s = L.sit; const canAct = ['live', 'frozen'].includes(L.phase);
    const status = !s ? 'Choose a pass play, then start.' : L.phase === 'ready' ? (L.mode === 'paused' ? 'Study your routes, then Snap. The play freezes at the decision point.' : 'Study your routes, then Snap.')
      : L.phase === 'live' ? 'Tap a receiver to throw · tap your QB to scramble' : L.phase === 'frozen' ? `Frozen at ${L.pauseAt.toFixed(2)} s · tap a receiver or your QB` : L.phase === 'resolving' ? 'Comparing with the AI…' : '';
    return `<div class="lab-setup">
        <label class="field lab-off">Offensive play<select data-change="lab-off"><option value="random" ${L.offense === 'random' ? 'selected' : ''}>Random pass play</option>${Lab.LAB_PASS_PLAYS.map((id) => `<option value="${id}" ${L.offense === id ? 'selected' : ''}>${esc(PLAYS[id].name)}${PLAYS[id].tags.includes('play_action') ? ' (play-action)' : ''}</option>`).join('')}</select></label>
        <div class="row" style="gap:6px;align-items:flex-end"><div class="seg"><button class="btn small ${L.mode === 'live' ? 'primary' : ''}" data-action="lab-mode" data-v="live">Live</button><button class="btn small ${L.mode === 'paused' ? 'primary' : ''}" data-action="lab-mode" data-v="paused">Paused</button></div>
        <label class="field" style="flex:1">QB Awareness<select data-change="lab-aw">${['team', '50', '75', '95'].map((v) => `<option value="${v}" ${String(L.awareness) === v ? 'selected' : ''}>${v === 'team' ? 'Lab QB' : v}</option>`).join('')}</select></label></div></div>
      ${s ? `<div class="lab-line"><span><b>${esc(PLAYS[s.offense].name)}</b> · 1st & 10 at the ${s.ballOn} · QB Awareness ${Lab.playInput(s).offense.QB?.attrs?.awareness ?? '—'}</span>${progressHtml()}</div>` : ''}
      ${s ? `<div class="field-wrap${canAct ? ' lab-live' : ''}" id="labwrap"><svg id="labfield" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Lab field: tap a receiver to throw, your quarterback to scramble"></svg>${['live', 'frozen'].includes(L.phase) ? `<div class="lab-clock" id="labclock">${L.phase === 'frozen' ? `${L.pauseAt.toFixed(1)} s ⏸` : '0.0 s'}</div>` : ''}</div>` : ''}
      <p class="lab-status ${canAct ? 'go' : ''}" role="status">${esc(status)}</p>
      ${s && L.phase === 'ready' ? '<button class="btn primary big block" data-action="lab-snap">▶ Snap</button>' : ''}
      ${L.phase === 'after' ? '<button class="btn primary big block" data-action="lab-next">Next situation ▶</button>' : ''}
      ${L.phase === 'after' && L.humanSim ? compareHtml() : ''}
      ${!s ? '<button class="btn primary big block" data-action="lab-next">Start</button>' : ''}`;
  }
  function dataHtml() {
    const recs = L.records || []; const A = Lab.analyse(recs);
    const tbl = (obj) => `<table class="lab-table">${Object.entries(obj).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `<tr><th>${esc(k)}</th><td class="mono">${v.n}</td><td class="mono">${v.agreement ?? '—'}%</td></tr>`).join('')}</table>`;
    const pairs = Object.values(L.rot || {}).reduce((a, e) => a + Object.keys(e.counts || {}).length, 0); const allPairs = Lab.LAB_PASS_PLAYS.length * Lab.LAB_DEFENSES.length;
    const ta = A.scrambleThrowAway;
    return `<p class="muted">Decisions are stored only on this device, separately from your franchises. Nothing is uploaded; export a file to keep or share them.</p>
      ${L.store === 'memory' ? '<p class="warn">Device storage is unavailable here: decisions last until you close the game. Export before leaving.</p>' : ''}
      <div class="lab-stats"><div><b class="mono">${A.total}</b><span>decisions</span></div><div><b class="mono">${A.agreement ?? '—'}${A.agreement != null ? '%' : ''}</b><span>agree with AI</span></div><div><b class="mono">${A.expectedYardsYouMinusAI ?? '—'}</b><span>exp. yards you − AI</span></div></div>
      <p class="dim">Matchups played: ${pairs} of ${allPairs} (${Lab.LAB_PASS_PLAYS.length} pass plays × ${Lab.LAB_DEFENSES.length} defenses).</p>
      ${A.total ? `<h3>Findings for review</h3>${A.findings.length ? `<ul class="lab-findings">${A.findings.map((x) => `<li><b>${esc(x.text)}</b><span class="dim">Possible adjustment: ${esc(x.suggest)}</span></li>`).join('')}</ul><p class="dim">Suggestions only: the production AI changes only after review, tests and your approval.</p>` : '<p class="dim">No recurring difference yet (findings need a dozen or more similar decisions).</p>'}
      <h3>Missed open receivers and forced throws</h3><p>AI left an open receiver ${A.missedOpen.aiMissed} times; you threw to him ${A.missedOpen.youTookIt} times. Forced throws (quality under 0.25): AI ${A.forced.ai}, you ${A.forced.you}.</p>
      <h3>Scrambles and sacks</h3><p>Scrambles: AI ${ta.aiScrambles}, you ${ta.youScrambled}. You held the ball until the play ended ${recs.filter((r) => r.human.action === 'hold').length} times.${ta.aiThrowAways || ta.youThrewAway ? ` Older records include throw-aways (AI ${ta.aiThrowAways}, you ${ta.youThrewAway}), no longer an option.` : ''}</p>
      <h3>By offensive play</h3>${tbl(A.byOffense)}<h3>By coverage</h3>${tbl(A.byCoverage)}<h3>By QB Awareness</h3>${tbl(A.byAwareness)}` : '<p class="dim">No decisions yet.</p>'}
      <div class="grid2" style="margin-top:10px"><button class="btn" data-action="lab-export" ${recs.length ? '' : 'disabled'}>⬇ Export data</button><label class="btn" style="text-align:center">⬆ Import<input type="file" accept=".json,application/json" data-change="lab-import" style="display:none"></label></div>
      <button class="btn block danger" data-action="lab-clear" style="margin-top:6px" ${recs.length ? '' : 'disabled'}>Clear all Lab data</button>
      <p class="dim" id="labusage"></p>`;
  }

  Router.registerScreen('ai-lab', {
    title: 'AI Testing Lab', tabs: false,
    render() {
      if (!L.records) loadRecords().then(() => Router.render());
      if (!L.rot) loadRotation().then(() => Router.render());
      return `${L.sit ? '' : '<p class="muted">Play quarterback on the real football engine, then compare your decision with the AI\'s from the identical situation. The defense stays hidden until the play is over. Separate from your franchises: nothing here touches a save.</p>'}
        <div class="seg roster-bar" role="tablist"><button class="btn small ${L.tab === 'decide' ? 'primary' : ''}" data-action="lab-tab" data-v="decide" role="tab">Play</button><button class="btn small ${L.tab === 'data' ? 'primary' : ''}" data-action="lab-tab" data-v="data" role="tab">Data (${(L.records || []).length})</button></div>
        ${L.tab === 'decide' ? decideHtml() : dataHtml()}`;
    },
    mount(root) {
      draw();
      if (L.tab === 'data') labUsage(L.records).then((u) => { const el = root.querySelector('#labusage'); if (el) el.textContent = `About ${Math.round(u.bytes / 1024)} KB of Lab data${u.quota ? ` · device storage ${Math.round((u.usage || 0) / 1048576)} of ${Math.round(u.quota / 1048576)} MB used` : ''}.${u.quota && u.usage / u.quota > 0.8 ? ' Storage is nearly full: export and clear old data.' : ''}`; });
      const svg = root.querySelector('#labfield');
      if (svg) svg.addEventListener('pointerdown', (e) => {
        if (!['live', 'frozen'].includes(L.phase) || L.busy) return;
        e.preventDefault(); const slot = pickAt(svg, e.clientX, e.clientY); if (!slot) return;
        if (slot === 'QB') decide('scramble'); else decide('throw', slot);
      });
      delegate(root, {
        'lab-tab': (el) => { L.tab = el.dataset.v; Router.render(); },
        'lab-mode': (el) => { L.mode = el.dataset.v; if (L.sit && L.phase !== 'after') newSituation({ same: true }); else Router.render(); },
        // A different play: its own rotation; an unfinished situation is set aside without counting (its defense stays next for that play).
        'lab-off': (el) => { L.offense = el.value; if (L.sit && L.phase !== 'after' && L.phase !== 'resolving') newSituation(); },
        'lab-aw': (el) => { L.awareness = el.value; if (L.sit && L.phase === 'ready') { L.sit = { ...L.sit, awareness: L.awareness === 'team' ? null : Number(L.awareness) }; newSituation({ same: true }); } },
        'lab-next': () => newSituation(), 'lab-again': () => newSituation({ same: true }), 'lab-snap': () => snap(), 'lab-watch': () => watchAI(),
        'lab-export': async () => { const r = await offerFile({ name: `gridiron-beast-qb-decisions-${new Date().toISOString().slice(0, 10)}.json`, text: JSON.stringify(Lab.exportPayload(L.records || []), null, 1) }); if (r.ok === false) toast('Export was not completed.', 'bad'); },
        'lab-import': async (el) => { const file = el.files?.[0]; if (!file) return; let data = null; try { data = JSON.parse(await file.text()); } catch { toast('That file is not JSON.', 'bad'); return; } const v = Lab.validateRecords(data); if (!v.ok) { toast(`Nothing imported: ${v.rejected[0] || 'no valid records'}.`, 'bad'); return; } await labPut(v.records); await loadRecords(); toast(`Imported ${v.records.length} decisions${v.rejected.length ? `, skipped ${v.rejected.length}` : ''}.`, 'good'); Router.render(); },
        'lab-clear': async () => { if (!(await confirmSheet('Delete every decision and the defensive rotation progress stored in the AI Testing Lab on this device? Franchises are not affected. Export first if you want to keep them.', { title: 'Clear Lab data', okLabel: 'Delete', danger: true }))) return; await labClear(); L.rot = {}; await labMetaPut(ROT_KEY, {}); await loadRecords(); toast('Lab data cleared.'); Router.render(); },
      });
    },
    unmount() { stop(); if (['live', 'frozen'].includes(L.phase)) { L.phase = 'ready'; L.i = 0; } },
  });
}
