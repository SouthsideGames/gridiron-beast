// Render-performance harness: Chrome trace aggregation (docs/task8/RENDER_PERF.md).
// Main-thread self time of the page's renderer, grouped the way Chrome DevTools groups it (Scripting, Rendering = style + layout,
// Painting), inside the measured window marked by the driver (performance.mark 'rp:begin' / 'rp:end'), plus long tasks (main-thread
// tasks over 50 ms) and raster work on the renderer's other threads.

export const TRACE_CATEGORIES = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'toplevel', 'blink.user_timing', 'v8.execute'].join(',');

const GROUP = (() => {
  const g = {};
  const put = (k, names) => { for (const n of names) g[n] = k; };
  put('script', ['FunctionCall', 'EvaluateScript', 'v8.compile', 'v8.compileModule', 'V8.CompileCode', 'v8.produceCache', 'v8.produceModuleCache', 'v8.evaluateModule', 'TimerFire', 'TimerInstall', 'TimerRemove',
    'FireAnimationFrame', 'RequestAnimationFrame', 'CancelAnimationFrame', 'FireIdleCallback', 'EventDispatch', 'RunMicrotasks', 'XHRReadyStateChange', 'XHRLoad', 'v8.run', 'V8.Execute', 'v8.callFunction',
    'ProfileCall', 'v8.newInstance', 'ResourceSendRequest', 'ResourceReceiveResponse', 'ResourceFinish', 'MarkDOMContent', 'MarkLoad', 'PerformanceObserver::Deliver']);
  put('gc', ['MajorGC', 'MinorGC', 'V8.GC_SCAVENGER', 'V8.GC_MARK_COMPACTOR', 'V8.GCIncrementalMarking', 'V8.GCFinalizeMC', 'V8.GCScavenger', 'V8.GCCompactor', 'V8.GC_MC_BACKGROUND_MARKING', 'BlinkGC.AtomicPhase',
    'BlinkGC.AtomicPauseMarkEpilogue', 'BlinkGC.AtomicPauseMarkPrologue', 'BlinkGC.AtomicPauseMarkRoots', 'BlinkGC.AtomicPauseMarkTransitiveClosure', 'BlinkGC.AtomicPauseSweepAndCompact', 'BlinkGC.IncrementalMarkingStep', 'CppGC.AtomicMark', 'CppGC.IncrementalMark', 'ThreadState::performIdleLazySweep', 'BlinkGC.LazySweepInIdle', 'BlinkGC.LazySweepOnAllocation', 'V8.GCHeapExternalWeakGlobalHandles']);
  put('parse', ['ParseHTML', 'ParseAuthorStyleSheet']);
  put('style', ['UpdateLayoutTree', 'RecalculateStyles', 'ScheduleStyleRecalculation', 'InvalidateLayout']);
  put('layout', ['Layout', 'UpdateLayerTree', 'HitTest', 'IntersectionObserverController::computeIntersections', 'ComputeIntersections', 'LayoutShift']);
  put('paint', ['Paint', 'PaintImage', 'PaintSetup', 'PrePaint', 'Layerize', 'CompositeLayers', 'Commit', 'Decode Image', 'Decode LazyPixelRef', 'ImageDecodeTask', 'Rasterize', 'RasterTask', 'UpdateLayer', 'Draw LazyPixelRef', 'Animation', 'Animation Frame Fired']);
  return g;
})();
const groupOf = (name) => GROUP[name] || (name?.startsWith('V8.GC') || name?.startsWith('BlinkGC') || name?.startsWith('CppGC') ? 'gc' : name?.startsWith('v8.') || name?.startsWith('V8.') ? 'script' : 'other');

/** Pair B/E into X; keep X. */
function completeEvents(evs) {
  const out = []; const open = new Map();
  for (const e of evs) {
    if (e.ph === 'X') { if (typeof e.dur === 'number') out.push(e); continue; }
    if (e.ph === 'B') { const k = `${e.tid}`; if (!open.has(k)) open.set(k, []); open.get(k).push(e); continue; }
    if (e.ph === 'E') { const st = open.get(`${e.tid}`); const b = st?.pop(); if (b) out.push({ ...b, ph: 'X', dur: e.ts - b.ts }); }
  }
  return out;
}

/** Aggregate one trace (array of events). Returns { found, windowMs, mainMs: {group: ms}, top: [[name, ms]], longTasks: {...}, rasterOffMainMs }. */
export function aggregateTrace(events) {
  const begin = events.find((e) => e.name === 'rp:begin'); const end = [...events].reverse().find((e) => e.name === 'rp:end');
  if (!begin || !end) return { found: false };
  const pid = begin.pid;
  const names = new Map(); for (const e of events) if (e.ph === 'M' && e.name === 'thread_name' && e.pid === pid) names.set(e.tid, e.args?.name);
  let mainTid = [...names.entries()].find(([, n]) => n === 'CrRendererMain')?.[0]; if (mainTid == null) mainTid = begin.tid;
  const t0 = begin.ts, t1 = end.ts;
  const inWin = (e) => e.ts >= t0 && e.ts <= t1;
  const main = completeEvents(events.filter((e) => e.pid === pid && e.tid === mainTid && (e.ph === 'X' || e.ph === 'B' || e.ph === 'E'))).filter(inWin).sort((a, b) => a.ts - b.ts || b.dur - a.dur);
  // Self time: each event's duration minus its children's (a stack of open events per thread).
  const self = {}; const byName = {}; const stack = [];
  const close = (until) => { while (stack.length && stack[stack.length - 1].end <= until) stack.pop(); };
  for (const e of main) {
    close(e.ts);
    const node = { e, end: e.ts + e.dur, child: 0 }; const parent = stack[stack.length - 1];
    if (parent) parent.child += Math.min(e.dur, parent.end - e.ts);
    stack.push(node);
    e._node = node;
  }
  for (const e of main) { const s = Math.max(0, e.dur - e._node.child) / 1000; e._self = s; const g = groupOf(e.name); self[g] = (self[g] || 0) + s; byName[e.name] = (byName[e.name] || 0) + s; }
  // Top-level tasks only (RunTask and ThreadControllerImpl::RunTask nest inside each other: count the outermost once).
  const tasks = []; let openEnd = -1;
  for (const e of main) { if (e.name !== 'RunTask' && e.name !== 'ThreadControllerImpl::RunTask') continue; if (e.ts < openEnd) continue; tasks.push(e); openEnd = e.ts + e.dur; }
  const long = tasks.filter((e) => e.dur > 50000);
  // What each long task spent its time on (self time by event name inside it), and when it ran (ms after rp:begin).
  const longDetail = long.slice(0, 40).map((L) => { const by = {}; for (const e of main) if (e.ts >= L.ts && e.ts + e.dur <= L.ts + L.dur && e !== L) by[e.name] = (by[e.name] || 0) + e._self;
    return { atMs: Math.round((L.ts - t0) / 1000), ms: Math.round(L.dur / 100) / 10, top: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, v]) => [n, Math.round(v * 10) / 10]) }; });
  const busy = tasks.reduce((a, e) => a + e.dur, 0) / 1000;
  const raster = events.filter((e) => e.pid === pid && e.tid !== mainTid && e.ph === 'X' && inWin(e) && (e.name === 'RasterTask' || e.name === 'ImageDecodeTask' || e.name === 'Rasterize')).reduce((a, e) => a + e.dur, 0) / 1000;
  const r2 = (x) => Math.round(x * 10) / 10;
  const windowMs = (t1 - t0) / 1000;
  return {
    found: true, windowMs: r2(windowMs), mainBusyMs: r2(busy), mainBusyShare: +(busy / windowMs).toFixed(3),
    mainMs: Object.fromEntries(Object.entries(self).map(([k, v]) => [k, r2(v)])),
    top: Object.entries(byName).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([n, v]) => [n, r2(v)]),
    longTasks: { count: long.length, totalMs: r2(long.reduce((a, e) => a + e.dur, 0) / 1000), maxMs: r2(Math.max(0, ...long.map((e) => e.dur)) / 1000), detail: longDetail },
    rasterOffMainMs: r2(raster),
  };
}
