import { BUILD } from '../version.js';
import { withTrace } from './trace.js';
import { checkFranchise, checkPlay } from './checks.js';

export const RECORDER_KEY = 'gridiron-beast-test-session-v1';
export const LIMITS = Object.freeze({ events: 240, findings: 80, plays: 6, trace: 180, replayChars: 350000, storedChars: 1400000 });
const clone = (v) => JSON.parse(JSON.stringify(v, (_k, x) => typeof x === 'function' ? undefined : typeof x === 'number' && !Number.isFinite(x) ? String(x) : x));
const bounded = (v, max = 6000) => { try { const text = JSON.stringify(v); return text.length <= max ? JSON.parse(text) : { omitted: true, reason: `Evidence exceeds ${max} characters` }; } catch { return { omitted: true, reason: 'Evidence is not serializable' }; } };
const summary = (s) => s ? { seed: s.seed, rngState: s.rngState, playCount: s.playCount, phase: s.phase, quarter: s.quarter, clock: s.clock, possession: s.possession, down: s.down, toGo: s.toGo, ballOn: s.ballOn, score: s.score, finished: s.finished, guard: s.guard } : null;
const franchiseSummary = (f) => f ? { uid: f.uid, club: f.club, year: f.season?.year, week: f.season?.week, day: f.season?.day, roster: f.roster?.length, game: summary(f.game?.state) } : null;
const nowDefault = () => Date.now();

export function createRecorder({ storage = () => globalThis.localStorage, now = nowDefault, build = BUILD } = {}) {
  let session = null, timer = null, storageError = null, context = {}, nextId = 0;
  const cap = (a, n) => { if (a.length > n) a.splice(0, a.length - n); };
  const active = () => session?.active === true;
  const entry = (kind, data) => ({ id: ++nextId, at: now(), kind, ...data });
  function trim() {
    cap(session.events, LIMITS.events); cap(session.findings, LIMITS.findings); cap(session.plays, LIMITS.plays);
    // Replays are the first thing dropped. Always say why a replay is unavailable.
    let size = JSON.stringify(session).length;
    for (const p of session.plays) {
      if (size <= LIMITS.storedChars) break;
      if (p.replay) { delete p.replay; p.replayOmitted = 'Older replay removed to keep the report small.'; size = JSON.stringify(session).length; }
    }
    for (const f of session.findings) {
      if (size <= LIMITS.storedChars) break;
      if (f.playEvidence) { f.playEvidence = { omitted: true, reason: 'Older play evidence removed to keep the report small.' }; size = JSON.stringify(session).length; }
    }
    while (size > LIMITS.storedChars && session.plays.length > 1) { session.plays.shift(); size = JSON.stringify(session).length; }
    while (size > LIMITS.storedChars && session.events.length > 1) { session.events.shift(); size = JSON.stringify(session).length; }
    while (size > LIMITS.storedChars && session.findings.length > 1) { session.findings.shift(); size = JSON.stringify(session).length; }
  }
  function flush() {
    clearTimeout(timer); timer = null; if (!session) return true;
    try { trim(); storage()?.setItem(RECORDER_KEY, JSON.stringify(session)); if (!storage()) throw new Error('Storage unavailable'); storageError = null; return true; }
    catch { storageError = 'The report could not be saved on this device. Export it before closing the game.'; return false; }
  }
  function schedule() { if (!timer) { timer = setTimeout(flush, 1200); timer?.unref?.(); } }
  function record(kind, data = {}) { if (!active()) return; session.events.push(entry(kind, { context: bounded(context), data: bounded(data) })); cap(session.events, LIMITS.events); schedule(); }
  function finding(code, message, evidence = {}, severity = 'error', playId = null, capturedPlay = null) {
    if (!active()) return;
    const key = `${code}|${JSON.stringify(bounded(evidence, 1200))}`;
    const old = session.findings.find((x) => x.key === key);
    if (old && severity !== 'manual') { old.count++; old.lastAt = now(); }
    else {
      const play = session.plays.find((p) => p.id === playId) || capturedPlay;
      const playEvidence = play ? bounded({ before: play.before, after: play.after, choices: play.choices, result: play.result, trace: play.trace.slice(0, 40), traceDropped: play.traceDropped }, 45000) : null;
      session.findings.push(entry('finding', { code, message, severity, evidence: bounded(evidence), context: bounded(context), playId, playEvidence, count: 1, key }));
    }
    cap(session.findings, LIMITS.findings); schedule();
  }
  function restore() {
    try {
      const raw = storage()?.getItem(RECORDER_KEY); if (!raw || raw.length > LIMITS.storedChars + 10000) return;
      const value = JSON.parse(raw);
      if (value.schemaVersion !== 1 || !Array.isArray(value.events) || !Array.isArray(value.findings) || !Array.isArray(value.plays)) return;
      session = value; nextId = Math.max(0, ...[...session.events, ...session.findings, ...session.plays].map((x) => Number(x.id) || 0)); trim();
      // Mixing builds in one report obscures reproduction. Retain the old report, but stop recording it.
      if (session.build?.version !== build.version || session.build?.branch !== build.branch) { session.active = false; session.stoppedReason = 'Game build changed. Export this report, then start a new session.'; }
    } catch { storageError = 'The previous test report could not be read.'; }
  }
  function start(environment = {}) {
    clearTimeout(timer); timer = null; nextId = 0;
    session = { app: 'gridiron-beast-problem-report', schemaVersion: 1, startedAt: now(), active: true, build: clone(build), environment: bounded(environment), events: [], findings: [], plays: [] };
    record('session-start'); flush();
  }
  function stop() { if (active()) { record('session-stop'); session.active = false; session.stoppedAt = now(); flush(); } }
  function observeFranchise(f, source = 'save') {
    if (!active()) return;
    context = { ...context, franchise: franchiseSummary(f) };
    record('franchise', { source, ...franchiseSummary(f) });
    for (const x of checkFranchise(f)) finding(x.code, x.message, x.evidence);
  }
  function observeSave(result) {
    if (!active()) return;
    record('save', { ok: result?.ok, code: result?.error?.code });
    if (!result?.ok && !['superseded', 'read-only', 'none'].includes(result?.error?.code)) finding('save-failed', 'The franchise could not be saved.', { code: result?.error?.code, message: result?.error?.message });
  }
  function runStep(state, teams, tendencies, choices, run, controllerMode = 'human') {
    if (!active()) return run();
    let before, replay, trace = [], dropped = 0, begun;
    try {
      before = clone(summary(state)); begun = globalThis.performance?.now?.() ?? now();
      // The log and last replay are presentation history; they are not inputs to simulation decisions.
      const input = { state: { ...state, log: [], lastPlay: null }, teams, tendencies, choices, controllerMode };
      replay = bounded(input, LIMITS.replayChars);
    } catch { replay = { omitted: true, reason: 'Could not capture the simulation inputs.' }; }
    let event;
    begun = globalThis.performance?.now?.() ?? now();
    const t8 = state.t8; // the trace scope also follows a t8 block lazily created by the real simulation
    try {
      event = withTrace(t8, (kind, data) => { if (trace.length < LIMITS.trace) trace.push({ kind, ...bounded(data) }); else dropped++; }, run);
    } catch (error) {
      const id = ++nextId;
      try {
        const failed = { id, at: now(), context: bounded(context), before, after: clone(summary(state)), choices: bounded(choices), controllerMode, trace, traceDropped: dropped, result: { kind: 'exception' } };
        if (replay?.omitted) failed.replayOmitted = replay.reason; else failed.replay = replay;
        session.plays.push(failed); cap(session.plays, LIMITS.plays);
        finding('simulation-exception', 'The simulation threw an error.', { message: String(error?.message || error), stack: String(error?.stack || '').slice(0, 4000), before, choices }, 'error', id); flush();
      } catch { /* retain the original gameplay exception */ }
      throw error;
    }
    try {
      const id = ++nextId;
      const p = { id, at: now(), context: bounded(context), before, after: clone(summary(state)), choices: bounded(choices), controllerMode, elapsedMs: Math.round((globalThis.performance?.now?.() ?? now()) - begun), result: bounded({ kind: event?.kind, text: event?.text, offensePlayId: event?.offensePlayId, defensePlayId: event?.defensePlayId, result: event?.sim?.result, yards: event?.sim?.yards, seed: event?.sim?.seed, stats: event?.sim?.stats, events: event?.sim?.events }, 35000), trace, traceDropped: dropped };
      if (replay?.omitted) p.replayOmitted = replay.reason; else p.replay = replay;
      session.plays.push(p); cap(session.plays, LIMITS.plays);
      for (const x of checkPlay(before || {}, state, event, trace)) finding(x.code, x.message, x.evidence, 'error', id);
      if (p.elapsedMs > 1500) finding('slow-step', 'A simulation step took more than 1.5 seconds. Review performance on this device.', { elapsedMs: p.elapsedMs }, 'review', id);
      schedule();
    } catch { /* reporting never breaks gameplay */ }
    return event;
  }
  function flag(note = '', playId = session?.plays.at(-1)?.id ?? null, capturedPlay = null) {
    finding('player-report', 'Player flagged an issue.', { note: String(note).slice(0, 2000) }, 'manual', playId, capturedPlay); flush();
  }
  function report({ franchise = null, includeSave = false } = {}) {
    if (!session) return null;
    trim();
    const out = clone({ ...session, exportedAt: now(), storageWarning: storageError, coverage: { automated: ['runtime errors', 'save failures', 'invalid roster ids / numeric attributes', 'stalled game steps', 'invalid game values', 'accepted status storage', 'created zone bounds and lifetime', 'zone speed modifier application'], limits: 'Does not prove every ability trigger, visual, probability, or balance rule is correct. Recent play inputs are bounded; older plays and traces are discarded. Reports contain game data and device details; nothing uploads automatically.' } });
    if (includeSave && franchise) out.franchiseSave = clone(franchise);
    return out;
  }
  restore();
  return { active, start, stop, flush, record, finding, observeFranchise, observeSave, runStep, flag, report,
    lastPlay() { const p = session?.plays.at(-1); return p ? clone({ id: p.id, before: p.before, after: p.after, choices: p.choices, result: p.result, trace: p.trace.slice(0, 40), traceDropped: p.traceDropped }) : null; },
    setContext(next) { if (active()) context = { ...context, ...bounded(next) }; },
    status() { return { active: active(), exists: !!session, startedAt: session?.startedAt, events: session?.events.length || 0, plays: session?.plays.length || 0, findings: session?.findings.length || 0, storageError, stoppedReason: session?.stoppedReason }; },
    clear() { clearTimeout(timer); timer = null; session = null; try { storage()?.removeItem(RECORDER_KEY); storageError = null; } catch { storageError = 'The stored report could not be deleted.'; } },
  };
}
export const recorder = createRecorder();
