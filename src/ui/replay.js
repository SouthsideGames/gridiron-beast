// Instant replays (GDD §34): which plays earn one, which part of the play to show, and the replay's clock. Pure functions
// with no DOM, so they are tested headless. A replay only ever re-draws the frames the engine recorded for the play that
// was just played (sim.frames): it never runs the simulation, the rules or the game runner, so it cannot change a score,
// a stat, the clock, XP, fatigue, an injury or possession.

const FRAME_DT = 0.1; // the engine records 10 frames a second (frameEvery 2 at a 0.05 s tick)
export const REPLAY = Object.freeze({ lead: 2.6, tail: 0.9, maxSpan: 7.5, slowBefore: 0.6, slowAfter: 0.5, slow: 0.4, msPerFrame: 100, transitionMs: 450, zoom: 1.35 });

const OUTCOME = new Set(['touchdown', 'interception', 'fumble', 'safety', 'catch', 'sack', 'tackle', 'broken_tackle', 'incomplete']);
const abilityOutcomes = (sim) => (sim?.events || []).filter((e) => e.ability === true && e.kind !== 'ability');

/**
 * Why this play earns a replay, or null for a routine play. `ev` is the game runner's event (with offenseSide, toGo and
 * down as they were before the snap), `state` the game state after it, `me` the player's side.
 * Returns { kind, label, priority }.
 */
export function replayReason(ev, state, me) {
  const sim = ev?.sim; if (!sim?.frames || sim.frames.length < 4) return null;
  if (ev.kind === 'field_goal') {
    if (!ev.scored || !state) return null;
    const k = ev.kicking; const diff = state.score[k] - state.score[k === 'home' ? 'away' : 'home'];
    const late = state.finished || (state.quarter >= 4 && state.clock <= 30) || !!state.ot;
    return late && diff > 0 && diff <= 3 ? { kind: 'winning_fg', label: state.finished ? 'GAME-WINNING FIELD GOAL' : 'GO-AHEAD FIELD GOAL', priority: 3 } : null;
  }
  if (ev.kind !== 'play' && ev.kind !== 'try') return null;
  const r = sim.result;
  if (r === 'touchdown') return { kind: 'touchdown', label: sim.stats?.defensiveScore ? 'DEFENSIVE TOUCHDOWN' : 'TOUCHDOWN', priority: 3 };
  if (r === 'interception' || sim.stats?.interceptor) return { kind: 'interception', label: 'INTERCEPTION', priority: 3 };
  if (r === 'fumble' || r === 'touchback_return' || (sim.turnover && r !== 'touchdown')) return { kind: 'turnover', label: r === 'fumble' ? 'FUMBLE RECOVERED' : 'TURNOVER', priority: 3 };
  if (r === 'safety') return { kind: 'safety', label: 'SAFETY', priority: 3 };
  if (ev.kind === 'try') return null;
  const gained = sim.yards ?? 0; const firstDown = ev.toGo != null && gained >= ev.toGo;
  if (ev.down === 4 && firstDown && (ev.toGo >= 3 || (state?.quarter ?? 1) >= 4)) return { kind: 'fourth_down', label: 'FOURTH-DOWN CONVERSION', priority: 2 };
  const clutch = state && (state.quarter >= 4 || state.ot) && state.clock <= 120 && Math.abs(state.score.home - state.score.away) <= 8;
  if (clutch && (gained >= 15 || r === 'sack')) return { kind: 'clutch', label: r === 'sack' ? 'CLUTCH SACK' : 'CLUTCH PLAY', priority: 2 };
  const ab = abilityOutcomes(sim);
  if (ab.length && (gained >= 12 || r === 'sack' || ab.some((e) => ['pick_denied', 'veiled', 'blink', 'flattened', 'spun'].includes(e.kind)))) return { kind: 'ability', label: 'ABILITY PLAY', priority: 1 };
  return null;
}

/** The decisive moment: the event the replay slows down for (seconds into the play). */
export function decisiveTime(sim, reason) {
  const ev = sim.events || []; const find = (...kinds) => ev.find((e) => kinds.includes(e.kind))?.t;
  const last = sim.frames[sim.frames.length - 1]?.t ?? 0;
  if (sim.kick) return Math.max(0, last - 0.6);
  switch (reason?.kind) {
    case 'touchdown': return find('catch', 'interception') ?? find('touchdown') ?? last;
    case 'interception': return find('interception') ?? last;
    case 'turnover': return find('fumble', 'interception') ?? last;
    case 'safety': return find('safety', 'sack', 'tackle') ?? last;
    case 'ability': return abilityOutcomes(sim)[0]?.t ?? last;
    default: return find('catch', 'sack', 'interception') ?? find('broken_tackle', 'tackle') ?? last;
  }
}

/**
 * Which frames to show and how fast: up to REPLAY.maxSpan seconds of the play ending REPLAY.tail after the decisive moment
 * (or at the whistle), slowed to 40% around the decisive moment. Returns { i0, i1, tD, steps: [{ i, ms }], totalMs }.
 */
export function replayPlan(sim, reason) {
  const frames = sim.frames; const n = frames.length; const tOf = (i) => frames[i].t ?? i * FRAME_DT;
  const tD = decisiveTime(sim, reason); const tEnd = tOf(n - 1);
  const stop = Math.min(tEnd, Math.max(tD + REPLAY.tail, tEnd - 0.05)); // show the whistle unless the play ran on
  const startT = Math.max(0, Math.min(tD - REPLAY.lead, stop - REPLAY.maxSpan));
  let i0 = 0; while (i0 < n - 1 && tOf(i0) < startT) i0++;
  let i1 = n - 1; while (i1 > i0 && tOf(i1) > stop + 1e-6) i1--;
  const steps = []; let total = 0;
  for (let i = i0; i <= i1; i++) {
    const t = tOf(i); const slow = t >= tD - REPLAY.slowBefore && t <= tD + REPLAY.slowAfter;
    const ms = REPLAY.msPerFrame / (slow ? REPLAY.slow : 1); steps.push({ i, ms, slow }); total += ms;
  }
  return { i0, i1, tD, steps, totalMs: total };
}
/** Where the replay is after `elapsed` ms: { i (frame index), k (0..1 to the next frame), slow, done }. */
export function replayPosition(plan, elapsed) {
  if (elapsed <= 0) return { i: plan.i0, k: 0, slow: false, done: false };
  let acc = 0;
  for (let j = 0; j < plan.steps.length; j++) {
    const s = plan.steps[j];
    if (elapsed < acc + s.ms) return { i: s.i, k: (elapsed - acc) / s.ms, slow: s.slow, done: false };
    acc += s.ms;
  }
  return { i: plan.i1, k: 0, slow: false, done: true };
}
