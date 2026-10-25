// AI Testing Lab screen (GDD §53.8), Developer Tools only. The owner makes the quarterback's decision on the real engine and
// compares it with the AI's from the identical situation. Mode A (Live): the play runs in real time and he taps an action when
// he is ready. Mode B (Paused): the play freezes at the AI's decision point and he chooses from the frozen field. Nothing hidden
// is shown before he decides (no scores, no defensive intentions); afterwards he sees the AI's choice, the measured windows, both
// results and the expected outcome of each decision over repeated plays from that moment. Generated practice clubs only: no
// franchise is read or written. Records go to the Lab's own storage (src/lab/lab-store.js) and leave the device only by export.
import { esc, delegate, toast, confirmSheet } from '../dom.js';
import { PLAYS } from '../../data/playbook.js';
import { fieldSvg, FIELD_VIEWBOX } from '../field-view.js';
import * as Lab from '../../lab/qb-lab.js';
import { labAll, labPut, labClear, labUsage, labStorageMode } from '../../lab/lab-store.js';
import { qbReadPanelHtml, resultText } from '../qb-read-ui.js';
import { REASON_TEXT } from '../../sim/qb-read.js';
import { offerFile } from '../file-offer.js';

export function registerAiLab(Router, app) {
  const L = { tab: 'decide', mode: 'live', offense: 'random', awareness: 'team', ballOn: 35, sit: null, hold: null, ai: null, human: null, humanSim: null, out: null, rec: null, i: 0, phase: 'idle', raf: 0, startedAt: 0, pauseAt: null, records: null, store: null, busy: false };
  const colors = { off: '#74c5ff', def: '#ff9385' };
  const sprites = () => { if (app.settings?.fieldMarkers === 'simple') return null; const T = Lab.labTeams(); return { off: { map: T.off.offense, pool: [] }, def: { map: T.def.defense, pool: [] } }; };
  const frames = () => (L.phase === 'after' || L.phase === 'resolving' ? L.humanSim?.frames : L.hold?.frames) || [];
  const frameAt = (fs, t) => { let i = fs.findIndex((f) => f.t >= t - 1e-6); return i < 0 ? fs.length - 1 : i; };
  const draw = () => { const svg = document.querySelector('#labfield'); if (!svg || !L.sit) return; const fs = frames(); const f = fs[Math.min(L.i, fs.length - 1)] || null; svg.innerHTML = fieldSvg({ ballOn: L.sit.ballOn, ballLat: 0, toGo: L.sit.toGo, colors, frame: f, prevFrame: fs[L.i - 1] || null, presnap: f ? null : { offensePlay: PLAYS[L.sit.offense], defensePlay: PLAYS[L.sit.defense] }, sprites: sprites(), qbRead: false }); };
  const stop = () => { cancelAnimationFrame(L.raf); L.raf = 0; };
  const name = (slot, side) => { const inp = Lab.playInput(L.sit); return `${(side === 'def' ? inp.defense : inp.offense)[slot]?.name || slot} (${slot})`; };

  async function loadRecords() { L.records = await labAll(); L.store = await labStorageMode(); }
  function newSituation(again = false) {
    stop();
    if (!again) L.sit = Lab.makeSituation({ offense: L.offense === 'random' ? null : L.offense, ballOn: L.ballOn, awareness: L.awareness === 'team' ? null : Number(L.awareness) });
    L.hold = Lab.runHold(L.sit); L.human = L.humanSim = L.out = L.rec = null; L.ai = null; L.i = 0;
    if (L.mode === 'paused') { const p = Lab.pausePoint(L.sit); L.ai = p.ai; L.pauseAt = p.at; L.i = frameAt(L.hold.frames, p.at); L.phase = 'frozen'; }
    else { L.pauseAt = null; L.phase = 'ready'; }
    Router.render();
  }
  function playLive() {
    if (L.phase !== 'ready') return; L.phase = 'live'; L.startedAt = performance.now(); const ms = 100 / (app.settings?.speed || 1); const n = L.hold.frames.length;
    const tick = (now) => { if (L.phase !== 'live') return; const i = Math.min(n - 1, Math.floor((now - L.startedAt) / ms)); if (i !== L.i) { L.i = i; draw(); const tEl = document.querySelector('#labclock'); if (tEl) tEl.textContent = `${(L.hold.frames[i].t ?? 0).toFixed(1)} s`; }
      const fr = L.hold.frames[i]; if (i >= n - 1 || (fr.holder && fr.holder !== 'QB') || fr.phase === 'carry') { L.phase = 'missed'; Router.render(); return; } L.raf = requestAnimationFrame(tick); };
    Router.render(); L.raf = requestAnimationFrame(tick);
  }
  async function decide(action, target = null) {
    if (!['live', 'frozen'].includes(L.phase) || L.busy) return;
    const fs = L.hold.frames; const at = L.phase === 'frozen' ? L.pauseAt : (fs[L.i]?.t ?? 0); const ms = L.phase === 'live' ? Math.round(performance.now() - L.startedAt) : null;
    stop(); L.busy = true; L.phase = 'resolving'; L.human = { at, action, target }; Router.render();
    await new Promise((r) => setTimeout(r, 20));
    L.ai ||= Lab.runAI(L.sit); L.humanSim = Lab.runHuman(L.sit, L.human);
    if (!L.humanSim.qb?.decision || L.humanSim.qb.decision.by !== 'human') { L.busy = false; L.phase = 'missed'; toast('Too late: the play was already over for the quarterback.', 'bad'); Router.render(); return; }
    L.out = { human: Lab.rollouts(L.sit, L.human), ai: Lab.rollouts(L.sit, null) };
    L.rec = Lab.decisionRecord({ sit: L.sit, mode: L.mode, human: L.human, humanSim: L.humanSim, aiSim: L.ai, holdSim: L.hold, outcomes: L.out, ms });
    try { await labPut(L.rec); await loadRecords(); } catch { toast('The decision could not be stored on this device.', 'bad'); }
    L.busy = false; L.phase = 'after'; L.i = frameAt(L.humanSim.frames, at); Router.render();
    // Let the play finish from the decision point.
    const start = performance.now(); const i0 = L.i; const ms2 = 100 / (app.settings?.speed || 1); const n = L.humanSim.frames.length;
    const tick = (now) => { if (L.phase !== 'after') return; const i = Math.min(n - 1, i0 + Math.floor((now - start) / ms2)); if (i !== L.i) { L.i = i; draw(); } if (i < n - 1) L.raf = requestAnimationFrame(tick); };
    L.raf = requestAnimationFrame(tick);
  }
  function watchAI() { if (!L.ai) return; stop(); const fs = L.ai.frames; const start = performance.now(); const ms = 100 / (app.settings?.speed || 1); L.phase = 'after'; const saved = L.humanSim; L.humanSim = L.ai; L.i = 0;
    const tick = (now) => { const i = Math.min(fs.length - 1, Math.floor((now - start) / ms)); if (i !== L.i) { L.i = i; draw(); } if (i < fs.length - 1) L.raf = requestAnimationFrame(tick); else L.humanSim = saved; }; L.raf = requestAnimationFrame(tick); }

  const actLabel = (a, slot) => (a === 'throw' ? `Throw to ${name(slot)}` : a === 'scramble' ? 'Scramble' : a === 'throwaway' ? 'Throw it away' : '—');
  const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);
  function compareHtml() {
    const H = L.humanSim.qb.decision, A = L.ai.qb?.decision, rec = L.rec; const w = H.windows || {};
    const rows = Object.entries(w).sort((a, b) => b[1].q - a[1].q).map(([slot, x]) => `<tr><th>${esc(name(slot))}</th><td><span class="lab-bar"><i style="width:${Math.max(0, Math.min(100, Math.round(x.q * 100)))}%"></i></span></td><td class="mono">${x.ready ? `${x.m1 >= 99 ? '—' : x.m1.toFixed(1)} yd` : 'not ready'}</td><td>${[x.m2 < 1.8 && x.m1 < 2.2 ? 'double' : '', x.lane ? 'lane' : '', !x.reachable ? 'out of range' : ''].filter(Boolean).join(', ')}</td></tr>`).join('');
    const ex = L.out; const better = ex.human.yards - ex.ai.yards;
    return `<div class="panel lab-compare">
      <div class="lab-vs"><div><span class="lbl">You</span><b>${esc(actLabel(H.action, H.slot))}</b><span class="dim">at ${H.t.toFixed(2)} s${H.legal === false ? ' · intentional grounding' : ''}</span></div>
      <div><span class="lbl">AI (Awareness ${rec.qb.awareness})</span><b>${A ? esc(actLabel(A.action, A.slot)) : 'no decision'}</b><span class="dim">${A ? `at ${A.t.toFixed(2)} s · ${esc(A.reason)}` : ''}</span></div></div>
      <p class="${rec.agree ? 'good' : 'warn'}" style="margin:6px 0">${rec.agree ? '✓ Same decision as the AI' : '✗ Different decision from the AI'}</p>
      <h3>Receivers at your decision</h3><p class="dim" style="margin-top:0">The engine's measurement when you decided: completion-minus-risk quality, separation when the ball would arrive, and why a window was tight. Not shown before you choose.</p>
      <table class="lab-table">${rows}</table>
      <p class="dim">${rec.pressure.sensedAt != null ? `Pressure arrived at ${rec.pressure.sensedAt.toFixed(2)} s.` : 'No pressure before your decision.'} Coverage: ${esc(rec.situation.coverage)}${rec.situation.blitz ? ' with a blitz' : ''}.</p>
      <h3>What happened</h3><div class="lab-vs"><div><span class="lbl">Your play</span><b>${esc(resultText(L.humanSim))}</b></div><div><span class="lbl">The AI's play</span><b>${esc(resultText(L.ai))}</b></div></div>
      <h3>Expected over ${ex.human.n} replays from the decision</h3><p class="dim" style="margin-top:0">One result proves little: each decision was replayed ${ex.human.n} times from the moment it was made.</p>
      <table class="lab-table"><tr><th></th><th>You</th><th>AI</th></tr><tr><th>Yards</th><td class="mono">${ex.human.yards}</td><td class="mono">${ex.ai.yards}</td></tr><tr><th>Completion</th><td class="mono">${pct(ex.human.complete)}</td><td class="mono">${pct(ex.ai.complete)}</td></tr><tr><th>Interception</th><td class="mono">${pct(ex.human.int)}</td><td class="mono">${pct(ex.ai.int)}</td></tr><tr><th>Sack</th><td class="mono">${pct(ex.human.sack)}</td><td class="mono">${pct(ex.ai.sack)}</td></tr></table>
      <p class="dim">${Math.abs(better) < 0.5 ? 'About even in expected yards.' : better > 0 ? `Your decision averaged ${better.toFixed(1)} more yards.` : `The AI's decision averaged ${(-better).toFixed(1)} more yards.`}</p>
      ${qbReadPanelHtml(L.ai, name, { title: "The AI's reads" })}
      <div class="grid2" style="margin-top:8px"><button class="btn" data-action="lab-again">↻ Same situation</button><button class="btn" data-action="lab-watch">▶ Watch the AI's play</button></div>
      <button class="btn primary block" data-action="lab-new" style="margin-top:6px">Next situation</button></div>`;
  }
  function decideHtml() {
    const s = L.sit; const btns = s ? Lab.receiverButtons(s) : [];
    const canAct = ['live', 'frozen'].includes(L.phase);
    const status = !s ? 'Pick a mode and start a situation.' : L.phase === 'ready' ? 'Tap Snap, watch the routes, then choose when you are ready.' : L.phase === 'live' ? 'Choose now…' : L.phase === 'frozen' ? `Frozen at ${L.pauseAt.toFixed(2)} s: choose an action.` : L.phase === 'resolving' ? 'Comparing with the AI…' : L.phase === 'missed' ? 'The play got away before a decision. Try the same situation again or start a new one.' : '';
    return `<div class="row lab-setup" style="gap:6px;flex-wrap:wrap">
        <div class="seg"><button class="btn small ${L.mode === 'live' ? 'primary' : ''}" data-action="lab-mode" data-v="live">Live</button><button class="btn small ${L.mode === 'paused' ? 'primary' : ''}" data-action="lab-mode" data-v="paused">Paused</button></div>
        <label class="field" style="flex:1;min-width:140px">Offense<select data-change="lab-off"><option value="random" ${L.offense === 'random' ? 'selected' : ''}>Random pass play</option>${Lab.LAB_PASS_PLAYS.map((id) => `<option value="${id}" ${L.offense === id ? 'selected' : ''}>${esc(PLAYS[id].name)}</option>`).join('')}</select></label>
        <label class="field" style="min-width:110px">QB Awareness<select data-change="lab-aw">${['team', '50', '75', '95'].map((v) => `<option value="${v}" ${String(L.awareness) === v ? 'selected' : ''}>${v === 'team' ? 'Lab QB' : v}</option>`).join('')}</select></label>${s && L.phase !== 'idle' ? '<button class="btn small" data-action="lab-new" title="A new situation with these settings">⟳ New</button>' : ''}</div>
      ${s ? `<p class="dim" style="margin:4px 0">${esc(PLAYS[s.offense].name)} vs ${esc(PLAYS[s.defense].name)} <span class="dim">(called by the defensive AI)</span> · 1st & 10 at the ${s.ballOn} · QB Awareness ${Lab.playInput(s).offense.QB?.attrs?.awareness ?? '—'} · seed ${s.seed}</p>` : ''}
      <div class="field-wrap" id="labwrap"><svg id="labfield" viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Lab field"></svg>${L.phase === 'live' ? '<div class="lab-clock" id="labclock">0.0 s</div>' : ''}</div>
      <p class="lab-status ${canAct ? 'go' : ''}" role="status">${esc(status)}</p>
      ${s && L.phase === 'ready' ? '<button class="btn primary big block" data-action="lab-snap">▶ Snap</button>' : ''}
      ${s && ['ready', 'live', 'frozen', 'resolving'].includes(L.phase) ? `<div class="lab-actions">${btns.map((b) => `<button class="btn" data-action="lab-throw" data-slot="${b.slot}" ${canAct ? '' : 'disabled'}><b>${esc(b.slot)}</b><span>${esc(b.name)}</span></button>`).join('')}<button class="btn" data-action="lab-scramble" ${canAct ? '' : 'disabled'}><b>Scramble</b><span>run</span></button><button class="btn" data-action="lab-away" ${canAct ? '' : 'disabled'}><b>Throw away</b><span>out of bounds</span></button></div>` : ''}
      ${L.phase === 'after' && L.humanSim ? compareHtml() : ''}
      ${L.phase === 'missed' ? '<div class="grid2"><button class="btn" data-action="lab-again">↻ Same situation</button><button class="btn primary" data-action="lab-new">New situation</button></div>' : ''}
      ${!s || L.phase === 'idle' ? '<button class="btn primary big block" data-action="lab-new">Start a situation</button>' : ''}`;
  }
  function dataHtml() {
    const recs = L.records || []; const A = Lab.analyse(recs);
    const tbl = (obj) => `<table class="lab-table">${Object.entries(obj).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `<tr><th>${esc(k)}</th><td class="mono">${v.n}</td><td class="mono">${v.agreement ?? '—'}%</td></tr>`).join('')}</table>`;
    return `<p class="muted">Decisions are stored only on this device, separately from your franchises. Nothing is uploaded; export a file to keep or share them.</p>
      ${L.store === 'memory' ? '<p class="warn">Device storage is unavailable here: decisions last until you close the game. Export before leaving.</p>' : ''}
      <div class="lab-stats"><div><b class="mono">${A.total}</b><span>decisions</span></div><div><b class="mono">${A.agreement ?? '—'}${A.agreement != null ? '%' : ''}</b><span>agree with AI</span></div><div><b class="mono">${A.expectedYardsYouMinusAI ?? '—'}</b><span>exp. yards you − AI</span></div></div>
      ${A.total ? `<h3>Findings for review</h3>${A.findings.length ? `<ul class="lab-findings">${A.findings.map((x) => `<li><b>${esc(x.text)}</b><span class="dim">Possible adjustment: ${esc(x.suggest)}</span></li>`).join('')}</ul><p class="dim">Suggestions only: the production AI changes only after review, tests and your approval.</p>` : '<p class="dim">No recurring difference yet (findings need a dozen or more similar decisions).</p>'}
      <h3>Missed open receivers and forced throws</h3><p>AI left an open receiver ${A.missedOpen.aiMissed} times; you threw to him ${A.missedOpen.youTookIt} times. Forced throws (quality under 0.25): AI ${A.forced.ai}, you ${A.forced.you}.</p>
      <h3>Scrambles and throw-aways</h3><p>Scrambles: AI ${A.scrambleThrowAway.aiScrambles}, you ${A.scrambleThrowAway.youScrambled}. Throw-aways: AI ${A.scrambleThrowAway.aiThrowAways}, you ${A.scrambleThrowAway.youThrewAway}.</p>
      <h3>By offensive play</h3>${tbl(A.byOffense)}<h3>By coverage</h3>${tbl(A.byCoverage)}<h3>By QB Awareness</h3>${tbl(A.byAwareness)}` : '<p class="dim">No decisions yet.</p>'}
      <div class="grid2" style="margin-top:10px"><button class="btn" data-action="lab-export" ${recs.length ? '' : 'disabled'}>⬇ Export data</button><label class="btn" style="text-align:center">⬆ Import<input type="file" accept=".json,application/json" data-change="lab-import" style="display:none"></label></div>
      <button class="btn block danger" data-action="lab-clear" style="margin-top:6px" ${recs.length ? '' : 'disabled'}>Clear all Lab data</button>
      <p class="dim" id="labusage"></p>`;
  }

  Router.registerScreen('ai-lab', {
    title: 'AI Testing Lab', tabs: false,
    render() {
      if (!L.records) loadRecords().then(() => Router.render());
      return `<p class="muted">Make the quarterback's decision yourself on the real football engine, then compare it with the AI's from the identical situation. Separate from your franchises: nothing here touches a save.</p>
        <div class="seg roster-bar" role="tablist"><button class="btn small ${L.tab === 'decide' ? 'primary' : ''}" data-action="lab-tab" data-v="decide" role="tab">Decide</button><button class="btn small ${L.tab === 'data' ? 'primary' : ''}" data-action="lab-tab" data-v="data" role="tab">Data (${(L.records || []).length})</button></div>
        ${L.tab === 'decide' ? decideHtml() : dataHtml()}`;
    },
    mount(root) {
      draw();
      if (L.tab === 'data') labUsage(L.records).then((u) => { const el = root.querySelector('#labusage'); if (el) el.textContent = `About ${Math.round(u.bytes / 1024)} KB of Lab data${u.quota ? ` · device storage ${Math.round((u.usage || 0) / 1048576)} of ${Math.round(u.quota / 1048576)} MB used` : ''}.${u.quota && u.usage / u.quota > 0.8 ? ' Storage is nearly full: export and clear old data.' : ''}`; });
      delegate(root, {
        'lab-tab': (el) => { L.tab = el.dataset.v; Router.render(); },
        'lab-mode': (el) => { L.mode = el.dataset.v; if (L.sit) newSituation(true); else Router.render(); },
        'lab-off': (el) => { L.offense = el.value; }, 'lab-aw': (el) => { L.awareness = el.value; },
        'lab-new': () => newSituation(false), 'lab-again': () => newSituation(true), 'lab-snap': () => playLive(), 'lab-watch': () => watchAI(),
        'lab-throw': (el) => decide('throw', el.dataset.slot), 'lab-scramble': () => decide('scramble'), 'lab-away': () => decide('throwaway'),
        'lab-export': async () => { const r = await offerFile({ name: `gridiron-beast-qb-decisions-${new Date().toISOString().slice(0, 10)}.json`, text: JSON.stringify(Lab.exportPayload(L.records || []), null, 1) }); if (r.ok === false) toast('Export was not completed.', 'bad'); },
        'lab-import': async (el) => { const file = el.files?.[0]; if (!file) return; let data = null; try { data = JSON.parse(await file.text()); } catch { toast('That file is not JSON.', 'bad'); return; } const v = Lab.validateRecords(data); if (!v.ok) { toast(`Nothing imported: ${v.rejected[0] || 'no valid records'}.`, 'bad'); return; } await labPut(v.records); await loadRecords(); toast(`Imported ${v.records.length} decisions${v.rejected.length ? `, skipped ${v.rejected.length}` : ''}.`, 'good'); Router.render(); },
        'lab-clear': async () => { if (!(await confirmSheet('Delete every decision stored in the AI Testing Lab on this device? Franchises are not affected. Export first if you want to keep them.', { title: 'Clear Lab data', okLabel: 'Delete', danger: true }))) return; await labClear(); await loadRecords(); toast('Lab data cleared.'); Router.render(); },
      });
    },
    unmount() { stop(); if (L.phase === 'live') L.phase = 'ready'; },
  });
}
