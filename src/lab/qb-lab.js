// AI Testing Lab (GDD §53.8), Developer Tools only. Human quarterback decisions on the REAL engine (simulatePlay), compared with
// the AI's decision from the identical starting state, recorded as versioned training examples. Pure: no DOM, no storage, never
// a franchise (generated practice clubs only), so nothing here can touch a save, a stat, progression or the league.
//
// Identical states: the engine's perception noise has its own random stream, and in the Lab's hold / human modes the AI makes no
// move, so a play with the AI deciding, a play held for the human, and a play where the human decides at time T are frame-for-frame
// the same up to the first decision. Fair outcomes: one result proves little, so each decision is also rolled out N times from the
// decision point (options.fork re-seeds only what happens after it) and compared on expected yards, completions and turnovers.
import { simulatePlay } from '../sim/engine.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../data/playbook.js';
import { pickSlots } from '../sim/rules.js';
import { chooseDefensePlay } from '../sim/coach-ai.js';
import { generatedTeam } from '../franchise/roster.js';
import { createRng, hashString } from '../core/rng.js';
import { QB_MODEL_VERSION } from '../sim/qb-read.js';
import { BUILD } from '../version.js';

export const LAB_SCHEMA = 'gridiron-beast/qb-decisions';
export const LAB_SCHEMA_VERSION = 1;
export const ROLLOUTS = 10;
export const LAB_PASS_PLAYS = OFFENSE_IDS.filter((id) => PLAYS[id].type === 'pass');
const OFF_SEED = 77, DEF_SEED = 78;

/** A situation: everything needed to reproduce the play exactly. `defense` null = called by the game's defensive AI. */
export function makeSituation({ offense = null, defense = null, ballOn = 35, down = 1, toGo = 10, awareness = null, seed = null, rng = createRng(Date.now() % 1e9) } = {}) {
  const s = seed ?? (Math.floor(rng.next() * 4e9) >>> 0 || 1);
  const off = offense && PLAYS[offense] ? offense : LAB_PASS_PLAYS[Math.floor(createRng(s).next() * LAB_PASS_PLAYS.length)];
  return { v: LAB_SCHEMA_VERSION, seed: s, offense: off, defense: defense && PLAYS[defense] ? defense : callDefense({ offense: off, ballOn, down, toGo, seed: s }), ballOn, down, toGo, awareness };
}
/** The defensive call the game's own coach AI makes in this down-and-distance (coach-ai chooseDefensePlay). */
export function callDefense({ ballOn = 35, down = 1, toGo = 10, seed = 1 }) {
  const { def } = labTeams();
  // Only the down-and-distance the play-caller reads (coach-ai situation()); never a game, so nothing here can credit a club or a player.
  const state = { possession: 'home', ballOn, down, toGo, quarter: 2, clock: 300, quarterLength: 300, score: { home: 0, away: 0 }, timeouts: { home: 3, away: 3 }, ot: false, phase: 'scrimmage' };
  return chooseDefensePlay(createRng(hashString(`lab-def|${seed}`)), state, def, DEFENSE_IDS, null) || 'cover_3';
}
let teamsCache = null;
export function labTeams() { return (teamsCache ||= { off: generatedTeam(OFF_SEED, { id: 'lo', name: 'Lab Offense', abbr: 'LAB' }), def: generatedTeam(DEF_SEED, { id: 'ld', name: 'Lab Defense', abbr: 'DEF' }) }); }
/** The simulatePlay input for a situation (the QB's Awareness overridden when the situation sets one). */
export function playInput(sit) {
  const { off, def } = labTeams(); const o = PLAYS[sit.offense], d = PLAYS[sit.defense];
  const offense = pickSlots(off.offense, o.onField, off, o); const defense = pickSlots(def.defense, d.onField, def, d);
  if (sit.awareness != null && offense.QB) offense.QB = { ...offense.QB, attrs: { ...offense.QB.attrs, awareness: sit.awareness } };
  return { offensePlay: o, defensePlay: d, offense, defense, ballOn: sit.ballOn, ballLat: 0, seed: sit.seed };
}
const run = (sit, options = {}) => simulatePlay({ ...playInput(sit), options: { frameEvery: 2, ...options } });
/** The AI's own play. */
export const runAI = (sit) => run(sit);
/** The play held for the human: the AI never acts (sim.qb.aiWould records what it would have done and when). */
export const runHold = (sit) => run(sit, { qb: { mode: 'hold' }, maxTime: 8 });
/** The human's decision at `at` seconds: { action: 'throw'|'scramble'|'throwaway', target }. */
export const runHuman = (sit, decision) => run(sit, { qb: { mode: 'human', at: decision.at, action: decision.action, target: decision.target || null } });
/** The eligible receivers on this play (route runners), in read order, for the action buttons. */
export function receiverButtons(sit) {
  const o = PLAYS[sit.offense]; const routes = Object.entries(o.assignments).filter(([, a]) => a.a === 'route').map(([slot]) => slot);
  const order = [...(o.progression || []).filter((s) => routes.includes(s)), ...routes.filter((s) => !(o.progression || []).includes(s))];
  const { offense } = playInput(sit); return order.map((slot) => ({ slot, name: offense[slot]?.name || slot }));
}
/** The paused mode's decision point: the moment the AI decides (so both decide from the same picture), or 1.8 s. */
export function pausePoint(sit) {
  const a = runAI(sit); if (a.qb?.decision?.t != null) return { at: Math.max(0.6, a.qb.decision.t), ai: a };
  // The AI never decided (sacked first): freeze while the quarterback still has the ball in the held play.
  const h = runHold(sit); const live = h.frames.filter((f) => f.holder === 'QB' && f.phase === 'dropback' && f.t > 0.5); const last = live.at(-1)?.t ?? 1.2;
  return { at: Math.max(0.6, Math.min(1.8, last - 0.25)), ai: a };
}

/** Outcome of a finished play in comparable terms. */
export function outcomeOf(sim) {
  const caught = sim.stats?.receiver != null && sim.result !== 'interception';
  return { result: sim.result, yards: sim.yards ?? 0, complete: caught, int: sim.result === 'interception', sack: sim.result === 'sack', td: !!sim.touchdown, turnover: !!sim.turnover };
}
/** N rollouts of a decision from its decision point (the AI's: decision = null). Returns expected yards and rates. */
export function rollouts(sit, decision = null, n = ROLLOUTS) {
  const at = decision ? decision.at : null; const res = [];
  const base = decision ? null : runAI(sit); const forkAt = (decision ? at : base.qb?.decision?.t ?? 1.5) + 0.05;
  for (let i = 0; i < n; i++) {
    const fork = { at: forkAt, seed: hashString(`lab-roll|${sit.seed}|${i}`) };
    const sim = decision ? run(sit, { qb: { mode: 'human', at, action: decision.action, target: decision.target || null }, fork, frameEvery: 1000 }) : run(sit, { fork, frameEvery: 1000 });
    res.push(outcomeOf(sim));
  }
  const avg = (k) => res.reduce((a, r) => a + (typeof r[k] === 'boolean' ? (r[k] ? 1 : 0) : r[k]), 0) / n;
  return { n, yards: +avg('yards').toFixed(2), complete: +avg('complete').toFixed(3), int: +avg('int').toFixed(3), sack: +avg('sack').toFixed(3), td: +avg('td').toFixed(3) };
}

const round = (v, k = 2) => (v == null ? null : +Number(v).toFixed(k));
/** The field at the decision point from the recorded frames (positions and velocity), plus who covers whom. */
function fieldAt(sim, at) {
  const fs = sim.frames || []; let i = fs.findIndex((f) => f.t >= at - 1e-6); if (i < 0) i = fs.length - 1; const f = fs[i], g = fs[Math.max(0, i - 1)];
  const vel = (list, prev, slot) => { const a = list.find((p) => p[0] === slot), b = prev?.find((p) => p[0] === slot); const dt = (f.t - (g?.t ?? f.t)) || 0.1; return a && b ? [round((a[1] - b[1]) / dt), round((a[2] - b[2]) / dt)] : [0, 0]; };
  return { t: f?.t ?? at, off: (f?.off || []).map((p) => ({ slot: p[0], x: round(p[1]), y: round(p[2]), v: vel(f.off, g?.off, p[0]), engaged: !!p[3] })), def: (f?.def || []).map((p) => ({ slot: p[0], x: round(p[1]), y: round(p[2]), v: vel(f.def, g?.def, p[0]), engaged: !!p[3] })), ball: f?.ball || null };
}
const ratingsOf = (m, keys) => Object.fromEntries(keys.map((k) => [k, round(m?.attrs?.[k], 0)]));
/**
 * A structured training example (schema LAB_SCHEMA v1). `human` = { at, action, target }, `humanSim` its play, `aiSim` the AI's
 * play, `holdSim` the held play the human watched, outcomes = { human: rollouts, ai: rollouts }.
 */
export function decisionRecord({ sit, mode, human, humanSim, aiSim, holdSim, outcomes, ms = null }) {
  const inp = playInput(sit); const o = inp.offensePlay, d = inp.defensePlay; const H = humanSim.qb?.decision || null; const A = aiSim.qb?.decision || null;
  const recvKeys = ['speed', 'agility', 'catching', 'awareness'], defKeys = ['speed', 'agility', 'coverage', 'awareness', 'catching', 'tackling', 'strength'];
  return {
    schema: LAB_SCHEMA, v: LAB_SCHEMA_VERSION, id: `${sit.seed}-${sit.offense}-${sit.defense}-${Math.round(human.at * 100)}-${human.action}-${human.target || ''}`, at: new Date().toISOString(),
    sim: { build: BUILD.version, qbModel: QB_MODEL_VERSION, seed: sit.seed }, mode,
    situation: { offensePlay: o.id, defensePlay: d.id, ballOn: sit.ballOn, down: sit.down, toGo: sit.toGo, coverage: d.tags.includes('man') ? 'man' : d.tags.includes('zone') ? 'zone' : 'mixed', blitz: d.tags.includes('blitz'), defenseTags: d.tags, offenseTags: o.tags },
    qb: { awareness: round(inp.offense.QB?.attrs?.awareness, 0), ...ratingsOf(inp.offense.QB, ['accuracy', 'arm', 'speed', 'agility']) },
    receivers: Object.entries(o.assignments).filter(([, a]) => a.a === 'route').map(([slot, a]) => ({ slot, route: a.r || null, progression: (o.progression || []).indexOf(slot), ...ratingsOf(inp.offense[slot], recvKeys) })),
    defenders: Object.entries(d.assignments).map(([slot, a]) => ({ slot, assignment: a.a, zone: a.role || null, key: a.key || null, ...ratingsOf(inp.defense[slot], defKeys) })),
    progression: o.progression || [], readOrder: holdSim.qb?.order || aiSim.qb?.order || [],
    field: fieldAt(holdSim, human.at),
    windows: H?.windows || null, // each receiver's measured window at the human's decision: separation, second defender, lane, developed
    board: H?.board || null, // true quality of every developed receiver at the human's decision (the engine's measurement)
    pressure: { sensedAt: holdSim.qb?.sensedAt ?? null, underPressure: !!H?.pressured },
    runningLane: H?.lane || null,
    decisionTime: round(human.at),
    human: { action: human.action, target: human.target || null, trueQ: H?.trueQ ?? null, bestTrueQ: H?.bestTrueQ ?? null, legal: H?.legal ?? null, responseMs: ms },
    ai: { action: A?.action || null, target: A?.slot || null, at: A?.t ?? null, reason: A?.reason || null, trueQ: A?.trueQ ?? null, bestTrueQ: A?.bestTrueQ ?? null, forced: !!A?.forced, missed: A?.missed || null, reads: (aiSim.qb?.reads || []).filter((e) => e.kind === 'read').map((e) => ({ t: e.t, slot: e.slot, reason: e.reason })) },
    aiWouldAtHold: holdSim.qb?.aiWould ? { at: holdSim.qb.aiWould.t, action: holdSim.qb.aiWould.action, target: holdSim.qb.aiWould.slot } : null,
    result: { human: outcomeOf(humanSim), ai: outcomeOf(aiSim) },
    expected: outcomes || null,
    agree: !!A && A.action === human.action && (A.action !== 'throw' || A.slot === human.target),
  };
}

/** Validation for imports: returns { ok, records, rejected: [reasons] }. */
export function validateRecords(data) {
  const list = Array.isArray(data) ? data : Array.isArray(data?.records) ? data.records : null;
  if (!list) return { ok: false, records: [], rejected: ['not a list of decision records'] };
  const records = []; const rejected = [];
  for (const [i, r] of list.entries()) {
    const why = r?.schema !== LAB_SCHEMA ? 'wrong schema' : r.v !== LAB_SCHEMA_VERSION ? `unsupported version ${r.v}` : !r.id || !r.situation?.offensePlay || !r.human?.action ? 'missing fields' : !PLAYS[r.situation.offensePlay] ? 'unknown play' : null;
    if (why) rejected.push(`#${i + 1}: ${why}`); else records.push(r);
  }
  return { ok: records.length > 0, records, rejected };
}
export function exportPayload(records) { return { schema: LAB_SCHEMA, v: LAB_SCHEMA_VERSION, exported: new Date().toISOString(), build: BUILD.version, qbModel: QB_MODEL_VERSION, count: records.length, records }; }

const band = (aw) => (aw == null ? 'team' : aw < 55 ? '40-54' : aw < 70 ? '55-69' : aw < 83 ? '70-82' : aw < 93 ? '83-92' : '93-99');
/** Session analysis and calibration findings (GDD §53.9). Findings are suggestions for review, never applied automatically. */
export function analyse(records) {
  const n = records.length; const pct = (a, b) => (b ? Math.round(1000 * a / b) / 10 : null);
  const group = (key) => { const out = {}; for (const r of records) { const k = key(r); (out[k] ||= { n: 0, agree: 0 }); out[k].n++; if (r.agree) out[k].agree++; } return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { n: v.n, agreement: pct(v.agree, v.n) }])); };
  const thr = records.filter((r) => r.ai.action === 'throw');
  const missed = records.filter((r) => r.ai.missed); const humanTookMissed = missed.filter((r) => r.human.action === 'throw' && r.human.target === r.ai.missed);
  const forced = records.filter((r) => r.ai.forced); const humanForced = records.filter((r) => r.human.action === 'throw' && r.human.trueQ != null && r.human.trueQ < 0.25);
  const dbl = thr.filter((r) => r.ai.reads.some((x) => x.slot === r.ai.target && x.reason === 'double') || (r.board && r.ai.trueQ != null && r.ai.trueQ < 0.35));
  const checkdown = records.filter((r) => r.human.action === 'throw' && r.human.target === 'RB' && !(r.ai.action === 'throw' && r.ai.target === 'RB'));
  const aiScr = records.filter((r) => r.ai.action === 'scramble'); const aiScrSafe = aiScr.filter((r) => (r.board ? Math.max(0, ...Object.values(r.board)) : 0) >= 0.55);
  const lateUnderPressure = records.filter((r) => r.pressure.sensedAt != null && r.ai.at != null && r.ai.at - r.decisionTime > 0.3);
  const byAw = {}; for (const r of records) { const b = band(r.qb.awareness); (byAw[b] ||= { n: 0, q: 0, best: 0 }); byAw[b].n++; byAw[b].q += r.ai.trueQ ?? 0; byAw[b].best += r.ai.bestTrueQ ?? 0; }
  const awQuality = Object.fromEntries(Object.entries(byAw).map(([k, v]) => [k, { n: v.n, aiQuality: +(v.q / v.n).toFixed(3), share: +((v.q / v.n) / Math.max(0.01, v.best / v.n)).toFixed(3) }]));
  const ev = records.filter((r) => r.expected?.human && r.expected?.ai); const evDiff = ev.length ? +(ev.reduce((a, r) => a + (r.expected.human.yards - r.expected.ai.yards), 0) / ev.length).toFixed(2) : null;
  const findings = [];
  const need = 12;
  if (thr.length >= need && dbl.length / thr.length > 0.12) findings.push({ key: 'double_coverage', text: `The AI threw into double coverage or a tight window on ${pct(dbl.length, thr.length)}% of its throws.`, suggest: 'Raise the weight of the second defender (m2) in throwOdds or the miss-second-defender rate at mid Awareness.' });
  if (checkdown.length >= 5 && checkdown.length / n > 0.1) findings.push({ key: 'checkdown', text: `You took the back's checkdown when the AI did not on ${pct(checkdown.length, n)}% of decisions.`, suggest: 'Lower the acceptance bar for the last read in the progression, or raise peripheral recognition of the checkdown.' });
  if (aiScr.length >= 5 && aiScrSafe.length / aiScr.length > 0.3) findings.push({ key: 'scramble', text: `${pct(aiScrSafe.length, aiScr.length)}% of the AI's scrambles came with a safe throw available.`, suggest: 'Require a lower best-throw quality before a lane scramble.' });
  if (lateUnderPressure.length >= 5 && lateUnderPressure.length / Math.max(1, records.filter((r) => r.pressure.sensedAt != null).length) > 0.35) findings.push({ key: 'late_under_pressure', text: 'Under pressure the AI decided later than you on most plays.', suggest: 'Shorten looks under pressure (hurry) or widen the sense range at mid Awareness.' });
  const aws = Object.entries(awQuality).filter(([k]) => k !== 'team');
  if (aws.length >= 2) { const lo = aws.reduce((a, b) => (a[1].share < b[1].share ? a : b)), hi = aws.reduce((a, b) => (a[1].share > b[1].share ? a : b)); if (lo[1].n >= 8 && hi[1].n >= 8 && hi[1].share - lo[1].share < 0.03) findings.push({ key: 'awareness_flat', text: `High- and low-Awareness AI quarterbacks decided almost equally well (${lo[0]}: ${lo[1].share}, ${hi[0]}: ${hi[1].share}).`, suggest: 'Widen the Awareness spread of noise and fixation in awarenessProfile.' }); }
  if (missed.length >= need && humanTookMissed.length / missed.length > 0.5) findings.push({ key: 'missed_open', text: `When the AI left an open receiver, you threw to him ${pct(humanTookMissed.length, missed.length)}% of the time.`, suggest: 'Raise peripheral recognition (periph) for this Awareness band.' });
  return {
    total: n, agreement: pct(records.filter((r) => r.agree).length, n), sessions: new Set(records.map((r) => r.at?.slice(0, 10))).size,
    byOffense: group((r) => r.situation.offensePlay), byCoverage: group((r) => `${r.situation.coverage}${r.situation.blitz ? ' + blitz' : ''}`), byAwareness: group((r) => band(r.qb.awareness)),
    missedOpen: { aiMissed: missed.length, youTookIt: humanTookMissed.length }, forced: { ai: forced.length, you: humanForced.length },
    scrambleThrowAway: { aiScrambles: aiScr.length, youScrambled: records.filter((r) => r.human.action === 'scramble').length, aiThrowAways: records.filter((r) => r.ai.action === 'throwaway').length, youThrewAway: records.filter((r) => r.human.action === 'throwaway').length },
    awarenessQuality: awQuality, expectedYardsYouMinusAI: evDiff, findings,
  };
}
