#!/usr/bin/env node
// Markdown tables from a frame-time harness JSON (docs/task8/RENDER_PERF.md):  node tools/perf/render/report.mjs <run.json>
import fs from 'node:fs';

const file = process.argv[2]; if (!file) { console.error('usage: report.mjs <run.json>'); process.exit(1); }
const J = JSON.parse(fs.readFileSync(file, 'utf8'));
const S = J.summary; const m = J.meta;
const v = (x, d = 1) => (x == null ? '–' : typeof x === 'number' ? (Number.isInteger(x) ? String(x) : x.toFixed(d)) : String(x));
const sl = (s) => v((s.mainMsPerSec.style ?? 0) + (s.mainMsPerSec.layout ?? 0), 0);
const row = (cells) => `| ${cells.join(' | ')} |`;
const head = (cells) => `${row(cells)}\n${row(cells.map(() => '---'))}`;
const out = [];
const load = (s) => `${v(s.busyLoad, 2)} / ${v(s.foreignLoad, 2)}`;
// methodology correction 2026-11-08 (PERF_SCENES.md section 1.1): competing / steal CPU and the quality label; '–' for older JSONs
const qual = (s) => (s.quality ? `${v(s.competingCpus, 3)} / ${v(s.stealCpus, 3)} ${s.quality.label}${s.quality.reasons.length ? ` (${s.quality.reasons.join('; ')})` : ''}` : '–');

out.push(`Run: ${m.label || '(no label)'}; commit ${m.commit}${m.dirty ? ' (dirty)' : ''}; ${m.startedAt} to ${m.finishedAt}; ${m.host.cpus} CPUs (${m.host.model}); ${m.browser?.version} (${m.browser?.mode}); viewport ${m.screen?.w}x${m.screen?.h} DPR ${m.screen?.dpr}; repeats ${m.options.repeats}, warm-up ${m.options.warmup}, plays ${m.options.plays}, live ${m.options.liveSteps} steps after ${m.options.liveWarmup}.`);
out.push(`Machine before start: busy ${m.idleLoad?.busyShare}, other processes ${m.idleLoad?.foreignShare} of all CPU time, load average ${m.idleLoad?.loadavgEnd?.join(' ')}. Mobile: ${m.mobile?.status}${m.mobile?.reason ? ` (${m.mobile.reason})` : ''}.`);
out.push(`Status: ${m.status}`);
out.push(`Identity checks: ${J.checks.length} blocks, ${J.checks.filter((c) => !c.ok).length} mismatches. Page errors: ${m.pageErrors?.length || 0}.`);
out.push('');

// 1. Simulation
out.push('#### Simulation (game logic per play)');
out.push(head(['Scene', 'Node, ms/play (median)', 'Page, combined/live 1x: median / max ms', 'Page, combined/live 4x: median / max ms']));
const sceneIds = [...new Set(S.map((s) => s.scene))];
for (const id of sceneIds) {
  const sc = J.scenes.find((x) => x.id === id);
  const node = sc?.kind === 'clash' ? `${v(sc.sim.msPerBattle, 2)} per battle` : sc?.sim ? v(sc.sim.chosenMedianMsPerPlay, 2) : 'not separable (live game)';
  const pg = (rate) => { const s = S.find((x) => x.scene === id && (x.mode === 'combined' || x.mode === 'live') && x.throttle === rate && x.config === 'full'); return s ? `${v(s.simPageMedianMs)} / ${v(s.simPageMaxMs)}` : '–'; };
  out.push(row([id, node, pg(1), pg(4)]));
}
out.push('');

const table = (mode, title, extra = []) => {
  const rows = S.filter((s) => s.mode === mode); if (!rows.length) return;
  out.push(`#### ${title}`);
  out.push(head(['Scene', 'Config', 'Platform', 'avg ms', 'median', 'p95', 'fps', '≤20 ms', '>33', '>50', 'long tasks (max ms)', 'script / style+layout / paint ms per s', ...extra.map((e) => e[0]), 'load busy / other', 'competing / steal CPU, quality']));
  for (const s of rows) out.push(row([s.scene, s.config, s.throttle === 1 ? 'desktop' : `desktop CPU ${s.throttle}x (approx.)`, v(s.meanMs), v(s.medianMs), v(s.p95Ms), v(s.avgFps, 0), v(s.share20, 2), v(s.over33), v(s.over50), `${v(s.longTasks)} (${v(s.longTaskMaxMs, 0)})`, `${v(s.mainMsPerSec.script, 0)} / ${sl(s)} / ${v(s.mainMsPerSec.paint, 0)}`, ...extra.map((e) => e[1](s)), load(s), qual(s)]));
  out.push('');
};
table('render', 'Rendering (precomputed plays; the page simulates nothing)', [['play start ms (median / max)', (s) => `${v(s.playStartMedianMs)} / ${v(s.playStartMaxMs)}`]]);
table('combined', 'Combined (each snap simulated in the page when it is played)', [['sim + play start ms (median / max)', (s) => `${v(s.playStartMedianMs)} / ${v(s.playStartMaxMs)}`]]);
table('live', 'Live (real franchise match in Auto; frames from each snap to the end of its playback)', [['session avg / p95 / >33 / >50', (s) => `${v(s.session?.meanMs)} / ${v(s.session?.p95Ms)} / ${v(s.session?.over33)} / ${v(s.session?.over50)}`]]);

// Three-way at the player's default configuration.
out.push('#### Three-way, default configuration (full)');
out.push(head(['Scene', 'Platform', 'Simulation ms/play (Node / page)', 'Rendering avg / p95 / >33 / >50', 'Combined avg / p95 / >33 / >50', 'Live avg / p95 / >33 / >50']));
for (const id of sceneIds) for (const rate of m.options.throttle) {
  const f = (mode) => S.find((x) => x.scene === id && x.mode === mode && x.throttle === rate && x.config === 'full');
  const fmt = (s) => (s ? `${v(s.meanMs)} / ${v(s.p95Ms)} / ${v(s.over33)} / ${v(s.over50)}` : '–');
  const sc = J.scenes.find((x) => x.id === id); const c = f('combined') || f('live');
  const sim = `${sc?.kind === 'clash' ? v(sc.sim.msPerBattle, 2) : sc?.sim ? v(sc.sim.chosenMedianMsPerPlay, 2) : '–'} / ${c ? v(c.simPageMedianMs) : '–'}`;
  out.push(row([id, rate === 1 ? 'verified desktop' : `desktop CPU-throttled ${rate}x (approximate indicator only)`, sim, fmt(f('render')), fmt(f('combined')), fmt(f('live'))]));
}
out.push('');

if (J.profiles?.length) {
  out.push('#### Draw profile (per field draw, unthrottled, outside the timed blocks)');
  out.push(head(['Scene', 'Config', 'build ms (no fx)', 'DOM parse ms', 'style+layout ms', 'chars (no fx)', 'elements mean / max']));
  for (const p of J.profiles) out.push(row([p.scene, p.config, `${v(p.buildMs.mean, 2)} (${v(p.buildNoFxMs.mean, 2)})`, v(p.parseMs.mean, 2), v(p.styleLayoutMs.mean, 2), `${Math.round(p.chars.mean)} (${Math.round(p.charsNoFx.mean)})`, `${Math.round(p.elements.mean)} / ${p.elements.max}`]));
  out.push('');
}
if (J.attribution?.length) {
  out.push('#### Script attribution (sampling CPU profile, ms of main-thread time per second, unthrottled, outside the timed blocks)');
  const keys = [...new Set(J.attribution.flatMap((a) => Object.keys(a.msPerSec)))].filter((k) => k !== 'idle');
  out.push(head(['Block', 'seconds', ...keys]));
  for (const a of J.attribution) out.push(row([a.label, v(a.seconds), ...keys.map((k) => v(a.msPerSec[k], 0))]));
  out.push('');
}
// Long-task entry points (what the long tasks were).
const lt = {}; for (const b of J.blocks) for (const d of b.trace.longTasks?.detail || []) { const k = `${b.mode}: ${d.entry?.name || '?'}`; (lt[k] ||= []).push(d.ms); }
out.push('#### Long tasks by mode and entry point');
out.push(head(['Mode: entry', 'count', 'median ms', 'max ms']));
for (const [k, a] of Object.entries(lt)) { const s = a.sort((x, y) => x - y); out.push(row([k, s.length, v(s[Math.floor(s.length / 2)], 0), v(s[s.length - 1], 0)])); }
console.log(out.join('\n'));
