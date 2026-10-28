// One play of 7-on-7 football, simulated in yards with a 0.05 s tick.
// Deterministic for a given seed and inputs. Shared by matches, practice,
// Key Moments and headless league games.
//
// Input (all optional except plays):
//   simulatePlay({
//     offensePlay, defensePlay,               // compiled plays from playbook.js
//     offense: {slot: {attrs, ability}},       // effective attributes per on-field slot
//     defense: {slot: {attrs, ability}},
//     ballOn (1..99), ballLat (-20..20), seed,
//     options: { forcedTarget, maxTime, frameEvery, edge, memory, dryRun, qb, fork }
//       qb: AI Testing Lab only. { mode: 'hold' } the AI never acts (it records what it would have done, sim.qb.aiWould);
//           { mode: 'human', at, action: 'throw'|'scramble', target } the human's decision at time `at`,
//           applied through the normal mechanics. fork: { at, seed } re-seeds the physics at time `at` (outcome rollouts).
//       memory: { drive, half, quarter, used: {key: true} } ability uses across plays (GDD §23.11)
//       dryRun: Playbook Audit only, never in a game. { noDefense } runs the offense with nobody
//         across from it; without noDefense the defense plays while the QB holds the ball.
//         Either way nobody throws, nobody is sacked and the result is 'dry_run'.
//   })
// Output: { result, yards, endYard, endLat, frames, events, elapsed, ... }
// result ∈ tackle | sack | incomplete | touchdown | out_of_bounds | interception
//          | fumble | safety | throwaway (older saves only: no longer produced, v42.6) | touchback_return | guard | dry_run (audit only)

import { createRng } from '../core/rng.js';
import { boundsFor, FIELD, clamp } from '../core/field.js';
import { manKeyTargets, eligibleReceivers } from '../data/playbook.js';
import { ABILITIES, speciesEffect } from '../data/monsters.js';
import { QUICK_ROUTES, SETTLE_ROUTES } from '../data/routes.js';
import { contestMod } from './type-matchups.js';
import { awarenessProfile, acceptBar, throwOdds, rejectReason, QB_MODEL_VERSION } from './qb-read.js';

const DT = 0.05;
const DEFAULT_ATTRS = { speed: 60, agility: 60, strength: 60, awareness: 60, catching: 60, arm: 60, accuracy: 60, blocking: 60, tackling: 60, coverage: 60, durability: 60, kicking: 60 };
const DROP_TIME = { quick: 0.55, three: 1.1, five: 1.7, pa: 1.5 };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const sigmoid = (v) => 1 / (1 + Math.exp(-v));
const norm = (v) => clamp(v, 1, 99) / 99;

const EDGE_ATTRS = ['speed', 'agility', 'strength', 'awareness', 'catching', 'accuracy', 'tackling', 'coverage', 'blocking'];
// ---- Pursuit effort (v42.13, GDD §53.5i): pure helpers, exported for tests and the Lab ----
export const PURSUIT_EFFORT = 1.05, CARRY_PACE = 0.94, EFFORT_FADE = 0.5;
/** How much a pursuer at (rx, ry) from the carrier, who moves at (vx, vy), is chasing him from behind along his run: 0 when he
 * is beside him (120° or less off his heading), meets him head-on, or the carrier is barely moving (under 2.5 yd/s); 1 when he
 * trails him (150° or more) and the carrier is running (5 yd/s or more); graded in between. */
export function chaseWeight(rx, ry, vx, vy) {
  const sp = Math.hypot(vx, vy); const running = Math.min(1, Math.max(0, (sp - 2.5) / 2.5)); if (running <= 0) return 0;
  const r = Math.hypot(rx, ry); if (r < 0.01) return 0;
  const cos = (rx * vx + ry * vy) / (r * sp); // -1: directly behind him along his run
  return running * Math.min(1, Math.max(0, (-cos - 0.5) / (0.866 - 0.5)));
}
/** Pursuit effort: 1.05 × top speed, less (down to 1.0) only in a straight chase from behind of a carrier with the higher top
 * speed, gone at EFFORT_FADE yd/s of difference. An equal or slower carrier, the side and head-on: full effort. */
export function effortFor(chase, carrierMax, pursuerMax) {
  const fade = Math.min(1, Math.max(0, (carrierMax - pursuerMax) / EFFORT_FADE));
  return PURSUIT_EFFORT - (PURSUIT_EFFORT - 1) * fade * chase;
}

export function simulatePlay({ offensePlay, defensePlay, offense = {}, defense = {}, ballOn = 25, ballLat = 0, seed = 1, options = {} }) {
  let rng = createRng(seed); // `let`: options.fork re-seeds the physics after a decision point (AI Testing Lab rollouts)
  // The quarterback's perception has its own stream, so how he reads the field never shifts the physics of the play, and the AI
  // Testing Lab can replay an identical play with a different decision (GDD §53).
  const qrng = createRng(((Number(seed) >>> 0) ^ 0x5bd1e995) >>> 0 || 7);
  const B = boundsFor(ballOn, ballLat);
  const maxTime = options.maxTime ?? 20;
  const frameEvery = options.frameEvery ?? 2;
  const dry = options.dryRun || null; // Playbook Audit walk-through (see header)
  const TRACE = !!options.trace; // Developer trace (Attribute Testing Lab overlay): records each defender's decision and aim per frame; never changes a play
  const dryMax = dry ? (dry.maxTime ?? 7) : 0;
  let dryDoneAt = null;
  const events = [];
  const log = (text, data = {}) => events.push({ t: +t.toFixed(2), text, ...data });
  /** Signature ability fired (logged once per monster per play, for the box score). */
  /** `key` names the effect that fired (burst, shedStrength, ...): presentation only, picks the effect family (ability-fx.js). */
  const abilityUsed = (a, key = null) => { if (!a?.abilityName || a.abilityLogged) return; a.abilityLogged = true; log(`${a.name}'s ${a.abilityName} kicks in`, { kind: 'ability', by: a.slot, side: a.team, trait: a.abilityKind === 'trait', key, x: +a.x.toFixed(2), y: +a.y.toFixed(2) }); };
  /** Presentation flag for outcome events: did the actor's ability fire this play (cosmetic, never changes the sim). */
  const fired = (a, ...keys) => !!a?.abilityLogged && a.abilityKind !== 'trait' && keys.some((k) => a.ability?.[k]);
  /** An outcome a signature ability caused on its own (Blink, Whiteout, Sack denied...): always an ability outcome. */
  const abilityOutcome = (kind, a, text, extra = {}) => log(text, { kind, by: a.slot, side: a.team, ability: true, ...extra });
  // Ability memory across plays (GDD §23.11): once per drive / half / game, and boosts that last a drive.
  // The caller passes what has been spent; this play's spending comes back in `memoryUsed`.
  const memory = options.memory || null; const memoryUsed = [];
  const scopeKey = (scope) => (scope === 'drive' ? `d:${memory?.drive ?? 'play'}` : scope === 'half' ? `h:${memory?.half ?? 'play'}` : 'g');
  const memKey = (a, name, scope) => `${a.mid}:${name}:${scopeKey(scope)}`;
  const available = (a, name, scope) => !memory?.used?.[memKey(a, name, scope)] && !memoryUsed.includes(memKey(a, name, scope));
  const spend = (a, name, scope) => { memoryUsed.push(memKey(a, name, scope)); };
  const quarter = memory?.quarter ?? 1;
  /** A visible state on a monster for the renderer (frozen, flattened, confused...): presentation only, except where an ability says so. */
  const setStatus = (a, code, dur) => { a.status = { code, until: t + dur }; };
  // Type effectiveness (GDD §32): each side of a contest scales its own score by its edge against the opponent it is
  // actually meeting in that contest, read at the moment of contact. `edgeNote` records the pair for the play log and tests.
  const typeContests = []; const typeSeen = new Set();
  // The stadium (GDD §33.2) adds its bonus for a monster of the field's type to the same contests, capped with the type edge.
  const envType = options.envType || null;
  const modOf = (a, b) => contestMod(a.type, b.type, envType);
  const scaleVs = (a, b, contest) => {
    const m = modOf(a, b), o = modOf(b, a);
    if (m || o) { const k = `${contest}|${a.team}${a.slot}|${b.slot}`; if (!typeSeen.has(k)) { typeSeen.add(k); const e = { contest, t: +t.toFixed(2), a: a.slot, team: a.team, b: b.slot, mod: m, opp: o }; if (envType && (a.type === envType || b.type === envType)) e.env = envType; typeContests.push(e); } }
    return 1 + m;
  };
  const statusOf = (a) => (a.status && a.status.until > t ? a.status.code : a.stun > 0.15 ? 'stun' : a.slowUntil > t ? 'slow' : a.overcharged ? 'charged' : 0);

  // ------------------------------------------------------------ actors
  const actors = [];
  const bySlot = { off: {}, def: {} };
  const makeActor = (team, slot, play, input) => {
    const attrs = { ...DEFAULT_ATTRS, ...(input?.attrs || {}) };
    // Signature ability: a legacy id in ABILITIES, else the species' own ability or trait.
    const legacy = input?.ability ? ABILITIES[input.ability] : null;
    const sp = !legacy && input?.species ? speciesEffect(input.species) : null;
    const ability = legacy?.effect || sp?.effect || null;
    const abilityName = legacy?.name || sp?.name || null;
    const abilityKind = legacy ? 'ability' : sp?.kind || null;
    if (ability?.attrs) for (const [k, v] of Object.entries(ability.attrs)) attrs[k] = Math.max(1, Math.min(99, (attrs[k] ?? 60) + v));
    if (ability?.routeAgility && play.assignments[slot]?.a === 'route') attrs.agility = Math.min(99, attrs.agility + ability.routeAgility);
    // Situational edge for a whole side (comeback mode, scheme lock): a few points on every core rating (GDD §17).
    const edge = options.edge?.[team] || 0;
    if (edge) for (const k of EDGE_ATTRS) attrs[k] = Math.max(1, Math.min(99, (attrs[k] ?? 60) + edge));
    const mid = input?.id || `${team}:${slot}`;
    // Overcharge: a sack earlier in this drive keeps him charged (+Speed) until the drive ends.
    const overcharged = !!(ability?.overcharge && memory?.used?.[`${mid}:overcharge:d:${memory.drive}`]);
    if (overcharged) attrs.speed = Math.min(99, attrs.speed + ability.overcharge);
    // Sovereign Arm: +Arm and +Accuracy in the fourth quarter.
    const sovereignQ4 = !!(ability?.sovereign && quarter === 4);
    if (sovereignQ4) { attrs.arm = Math.min(99, attrs.arm + ability.sovereign); attrs.accuracy = Math.min(99, attrs.accuracy + ability.sovereign); }
    const [x, y] = play.align[slot];
    const a = {
      team, slot, mid, type: input?.type || null, overcharged, sovereignQ4, baseAwareness: attrs.awareness, attrs, ability, abilityName, abilityKind, name: input?.name || slot, reactionBonus: 0, auraAttrs: null,
      x, y, vx: 0, vy: 0, maxSpeed: 5.4 + 4.1 * norm(attrs.speed), accel: 9 + 11 * norm(attrs.agility),
      assignment: play.assignments[slot], wp: 0, state: 'init', engaged: null, stun: 0, noEngage: 0,
      target: null, route: null, brokeTackle: 0, recognised: false, reactTimer: 0,
    };
    actors.push(a); bySlot[team][slot] = a; return a;
  };
  for (const slot of offensePlay.onField) makeActor('off', slot, offensePlay, offense[slot]);
  if (!dry?.noDefense) for (const slot of defensePlay.onField) makeActor('def', slot, defensePlay, defense[slot]);
  // Pre-snap motion: the motion man is snapped on the move, at his motion spot, already running (owner, 2026-10-20).
  const motion = offensePlay.motion ? { ...offensePlay.motion, man: bySlot.off[offensePlay.motion.slot], from: offensePlay.align[offensePlay.motion.slot] } : null;
  if (motion?.man) {
    const m = motion.man, [fx, fy] = motion.from, [tx, ty] = motion.to, d = Math.hypot(tx - fx, ty - fy) || 1, v = m.maxSpeed * 0.85;
    m.x = tx; m.y = ty; m.vx = ((tx - fx) / d) * v; m.vy = ((ty - fy) / d) * v; motion.duration = d / v;
  }
  // Auras: a monster's effect on its teammates (Elderoot's reads, Ferrhorn's line).
  for (const a of actors) {
    const aura = a.ability?.aura; if (!aura) continue;
    for (const b of actors) {
      if (b === a || b.team !== a.team) continue;
      if (aura.reaction) b.reactionBonus += aura.reaction;
      if (aura.blocking && b.assignment?.a === 'block' && Math.abs(b.y - a.y) <= 2.2) b.attrs.blocking = Math.min(99, b.attrs.blocking + aura.blocking);
    }
  }
  const reactionOf = (d) => (d.ability?.reaction || 0) + (d.reactionBonus || 0);
  for (const a of actors) { // nobody lines up beyond the end line or the sideline
    a.x = clamp(a.x, B.ownEndLine + 0.5, Math.min(B.endLine - 0.5, a.team === 'def' ? B.goal + 8 : B.endLine - 0.5));
    a.y = clamp(a.y, B.left + 0.6, B.right - 0.6);
  }
  const offs = actors.filter((a) => a.team === 'off');
  const screenPlay = offensePlay.onField.some((sl) => offensePlay.assignments[sl]?.a === 'release');
  const defs = actors.filter((a) => a.team === 'def');
  const qb = bySlot.off.QB;
  const manKeys = manKeyTargets(offensePlay);
  const receivers = eligibleReceivers(offensePlay);
  const isRun = offensePlay.type === 'run';

  // Pre-snap: man defenders align across from their receiver (inside leverage); nobody lines up offside.
  for (const d of defs) {
    const a = d.assignment;
    if (a.a !== 'man') continue;
    const target = bySlot.off[manKeys[a.key]];
    if (!target) continue;
    const leverage = target.y > 0 ? -1 : 1;
    d.y = clamp(target.y + leverage * 1.2, B.left + 1, B.right - 1);
    if (Math.abs(target.y) < 6) d.x = Math.max(d.x, 4.5); // inside receivers get an off-man cushion from a linebacker/safety depth
  }
  // Trail buffer for man coverage reaction delay.
  const history = new Map(actors.map((a) => [a, []])); const facingHist = [];

  // ------------------------------------------------------------ ball
  const ball = { x: qb.x, y: qb.y, holder: qb, inAir: false, from: null, to: null, flight: 0, flightTime: 0, target: null, landing: null, airYards: 0 };
  let t = 0;
  let result = null;
  let phase = isRun ? 'run' : 'dropback'; // dropback | run | air | carry | dead
  let handoffAt = Infinity; // when the ball changed hands (giveBall); a defender sees it only after his delay and the mesh
  let keepAt = Infinity; // when an option quarterback pulled the ball and kept it (seen the same way as a handoff)
  const snapPos = new Map(actors.map((a) => [a, { x: a.x, y: a.y }])); // where everyone lined up (refreshed at the snap)
  let handoffDone = false;
  let pressureAt = Infinity;
  let readIndex = 0;
  let readClock = 0;
  // QB read progression state (GDD §53): the order of reads, the current look, what he has seen, and the recorded read log.
  const qr = { order: null, i: 0, cur: null, lookEnd: 0, seen: {}, log: [], cycles: 0, locks: 0, decision: null, aiWould: null, pocketAt: null, sensedAt: null, lastEmergency: -9, humanDone: false, startY: null };
  let scrambled = false;
  let qbFakeUntil = 0;
  const stats = { passer: null, target: null, receiver: null, carrier: null, tackler: null, airYards: 0, yac: 0, brokenTackles: 0, pressure: false, interceptor: null, forcedBy: null,
    // Attribution for the stat sheet (GDD §16): who pressured, which blocker was beaten for it, who was in coverage and how, who assisted, who recovered.
    pressureBy: null, pressureAllowedBy: null, sackAllowedBy: null, sackUnblocked: false, coverBy: null, coverKind: null, pbuBy: null, dropped: false, assistBy: null, fumbledBy: null, recoveredSlot: null, recoveredTeam: null,
    blockers: {}, // slot -> { pass: 0|1, run: 0|1, lost: n } one entry per blocker who had a block assignment
  };
  const frames = [];
  if (qb.assignment.a === 'keep') { phase = 'carry'; stats.carrier = 'QB'; handoffDone = true; }

  const carrierTeam = () => ball.holder?.team || null;
  const opponents = (team) => (team === 'off' ? defs : offs);
  const teammates = (team) => (team === 'off' ? offs : defs);

  // ------------------------------------------------------------ movement
  function steer(a, tx, ty, speedScale = 1, arriveRadius = 0.6, cap = Infinity) {
    if (TRACE) { a.aim = [tx, ty]; } // developer trace only (options.trace): where he is trying to go
    if (a.stun > 0) { a.vx *= 0.93; a.vy *= 0.93; return; } // off balance: coasting, cannot steer
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    let desired = a.maxSpeed * speedScale * burst(a) * speedMods(a);
    if (a.slowUntil > t) desired *= 0.7; // Bramble Shell: a tackler who missed him is slowed for a moment
    // Daybreak: anyone chasing from behind is held below his pace, so he cannot be run down.
    const h = ball.holder; if (h?.daybreak && a.team !== h.team && (a.x - h.x) * (h.team === 'off' ? 1 : -1) < 0) desired = Math.min(desired, h.maxSpeed * 0.9);
    if (d < arriveRadius) desired = 0;
    if (desired > cap) desired = cap; // braking into a cut (followPath)
    const ux = d > 0 ? dx / d : 0, uy = d > 0 ? dy / d : 0;
    const dvx = ux * desired - a.vx, dvy = uy * desired - a.vy;
    const dv = Math.hypot(dvx, dvy), maxDv = a.accel * DT * (a.cutUntil > t ? 1.9 : 1); // planting out of a hard cut
    const k = dv > maxDv ? maxDv / dv : 1;
    a.vx += dvx * k; a.vy += dvy * k;
  }
  /** Situational speed from the species effect: after the catch, rushing the passer, closing on a throw, chasing a carrier. */
  function speedMods(a) {
    const e = a.ability; if (!e) return 1;
    let k = 1;
    if (e.afterCatch && ball.holder === a && a.caughtAt != null && t - a.caughtAt < e.afterCatch.until) { k *= 1 + e.afterCatch.speed; abilityUsed(a, 'afterCatch'); }
    if (e.rushSpeed && a.team === 'def' && ['rush', 'contain'].includes(a.assignment?.a) && ball.holder === qb && phase !== 'carry') { k *= 1 + e.rushSpeed; if (t > 0.6) abilityUsed(a, 'rushSpeed'); }
    if (e.closeSpeed && a.team === 'def' && ball.inAir) { k *= 1 + e.closeSpeed; abilityUsed(a, 'closeSpeed'); }
    if (e.pursuitSpeed && a.team === 'def' && ball.holder && ball.holder.team === 'off' && phase === 'carry') { k *= 1 + e.pursuitSpeed; abilityUsed(a, 'pursuitSpeed'); }
    // Radiant Pursuit: faster only when chasing the carrier from behind.
    if (e.radiantPursuit && ball.holder && ball.holder.team !== a.team && phase === 'carry' && (a.x - ball.holder.x) * (ball.holder.team === 'off' ? 1 : -1) < 0) { k *= 1 + e.radiantPursuit; abilityUsed(a, 'radiantPursuit'); }
    return k;
  }
  function burst(a) { if (a.ability?.burst && t < a.ability.burst.until) { if (ball.holder === a || a.assignment?.a === 'route' || a.assignment?.a === 'carry') abilityUsed(a, 'burst'); return 1 + a.ability.burst.speed; } return 1; }
  function integrate(a) {
    a.x += a.vx * DT; a.y += a.vy * DT;
    if (a.stun > 0) a.stun -= DT;
    if (a.noEngage > 0) a.noEngage -= DT;
    // Players other than the carrier stay on the field (they run along the boundary).
    if (ball.holder !== a) {
      a.y = clamp(a.y, B.left + 0.3, B.right - 0.3);
      a.x = clamp(a.x, B.ownEndLine + 0.3, B.endLine - 0.3);
    }
  }
  function separate() {
    for (let i = 0; i < actors.length; i++) for (let j = i + 1; j < actors.length; j++) {
      const a = actors[i], b = actors[j];
      if (a.engaged === b) continue;
      const d = dist(a, b);
      if (d < 0.7 && d > 0.001) { const push = (0.7 - d) / 2; const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d; a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; }
    }
  }

  // ------------------------------------------------------------ blocking
  function tryEngage(blocker, defender, soft = false) {
    if (blocker.engaged || defender.engaged || blocker.stun > 0 || defender.noEngage > 0) return false;
    if (dist(blocker, defender) > (soft ? 1.2 : 1.6)) return false;
    // Dragon's Roar: the lineman across from him is slow to engage off the snap.
    if (blocker.roarUntil && t < blocker.roarUntil) return false;
    // Ambush: on a blitz each blocker gets one try at picking him up, and misses 30% more often than he would.
    if (defender.ability?.ambush && defender.slot.startsWith('LB') && ['rush', 'contain'].includes(defender.assignment?.a)) {
      const tried = (defender.ambushTried ||= {});
      if (!(blocker.slot in tried)) { tried[blocker.slot] = rng.chance(defender.ability.ambush); if (tried[blocker.slot]) { setStatus(blocker, 'fooled', 0.7); abilityUsed(defender, 'ambush'); abilityOutcome('slipped', defender, `${defender.name} slips past ${blocker.name}`, { victim: blocker.slot }); } }
      if (tried[blocker.slot]) return false;
    }
    // Eruption: once per drive, the first defender he blocks is flattened instead of engaged.
    if (blocker.ability?.eruption && available(blocker, 'eruption', 'drive')) {
      spend(blocker, 'eruption', 'drive'); defender.stun = 1.2; defender.noEngage = 1.2; defender.vx = 0; defender.vy = 0; setStatus(defender, 'flat', 1.2);
      abilityUsed(blocker, 'eruption'); abilityOutcome('flattened', blocker, `${blocker.name} flattens ${defender.name}`, { victim: defender.slot });
      return false;
    }
    // Open-field blocks are hit-or-miss: the defender often slips past.
    if (soft && !rng.chance(0.25 + 0.5 * norm(blocker.attrs.blocking * (scaleVs(blocker, defender, 'block') - modOf(defender, blocker))))) { blocker.noEngage = 0.3; return false; }
    blocker.engaged = defender; defender.engaged = blocker; defender.engagedAt = t; blocker.softBlock = soft; defender.wasBlocked = true;
    const bk = (stats.blockers[blocker.slot] ||= { pass: 0, run: 0, lost: 0 }); if (isRun) bk.run = 1; else bk.pass = 1;
    return true;
  }
  function resolveEngagement(blocker) {
    const d = blocker.engaged;
    const runFit = phase === 'carry' || phase === 'run';
    const be = blocker.ability || {};
    const bScore = blocker.attrs.blocking * 0.6 + blocker.attrs.strength * 0.4 + (be.blockStrength || 0) + (!runFit ? (be.anchor || 0) : 0);
    const dScore = d.attrs.strength * 0.5 + d.attrs.agility * 0.3 + d.attrs.tackling * 0.2 + (d.ability?.shedStrength || 0) + (runFit ? (d.ability?.runStuff || 0) : 0);
    if ((be.blockStrength || (!runFit && be.anchor)) && t > 0.5) abilityUsed(blocker, be.blockStrength ? 'blockStrength' : 'anchor');
    const edge = (dScore * scaleVs(d, blocker, 'shed') - bScore * scaleVs(blocker, d, 'block')) / 100; // positive when the defender is winning (type edges: the pair actually engaged)
    // The pair moves slowly along the defender's intent; the blocker stays between.
    const goal = defenderGoal(d);
    const gx = goal.x - d.x, gy = goal.y - d.y, gd = Math.hypot(gx, gy) || 1;
    let push = clamp((runFit ? 0.2 : 0.75) + edge * 2.5, -0.5, 2.4); // yards/s the defender gains
    if (!runFit && be.deepRoots && push > 0) { push *= be.deepRoots; if (t > 0.5) abilityUsed(blocker, 'deepRoots'); } // Deep Roots: pass rushers drive him back at half speed
    d.x += (gx / gd) * push * DT; d.y += (gy / gd) * push * DT;
    // Riptide: run blocks drag his defender toward the nearer sideline, up to the card's yard.
    if (runFit && be.riptide && (d.riptideDragged || 0) < be.riptide) {
      const toward = (d.y - B.left) < (B.right - d.y) ? -1 : 1; const step = Math.min(1.1 * DT, be.riptide - (d.riptideDragged || 0));
      d.y += toward * step; d.riptideDragged = (d.riptideDragged || 0) + step; abilityUsed(blocker, 'riptide');
      if (d.riptideDragged >= be.riptide - 1e-6) abilityOutcome('dragged', blocker, `${blocker.name} drags ${d.name} toward the sideline`, { victim: d.slot });
    }
    // Landslide: he never loses a pass-block engagement.
    const holdsForever = !runFit && be.landslide;
    if (holdsForever && t > 0.5) abilityUsed(blocker, 'landslide');
    blocker.x = d.x + (gx / gd) * 0.9; blocker.y = d.y + (gy / gd) * 0.9;
    blocker.vx = d.vx = 0; blocker.vy = d.vy = 0;
    const shedPerSec = clamp((blocker.softBlock ? 0.9 : runFit ? 0.26 : 0.58) + edge * 1.6, 0.06, 2.2);
    if (!holdsForever && rng.chance(shedPerSec * DT)) {
      blocker.engaged = null; d.engaged = null; blocker.stun = be.rebound ? 0.1 : (0.45 + (d.ability?.blockerStun || 0)) * (be.dragonhide || 1); d.noEngage = runFit ? 0.5 : 0.85; // a beaten pass blocker cannot recover at once
      if (be.dragonhide) abilityUsed(blocker, 'dragonhide'); // Dragonhide: recovers twice as fast
      if (d.ability?.pincer) { blocker.stun = Math.max(blocker.stun, d.ability.pincer); setStatus(blocker, 'pinched', d.ability.pincer); abilityUsed(d, 'pincer'); abilityOutcome('pinched', d, `${d.name}'s Pincer Hold keeps ${blocker.name} from getting free`, { victim: blocker.slot }); } // Pincer Hold: a full second late to the next block
      if (be.rebound) abilityUsed(blocker, 'rebound');
      d.lastBeat = { blocker: blocker.slot, t }; (stats.blockers[blocker.slot] ||= { pass: 0, run: 0, lost: 0 }).lost += 1;
      if (d.ability?.shedStrength || d.ability?.runStuff) abilityUsed(d, d.ability.shedStrength ? 'shedStrength' : 'runStuff'); log(`${d.name} sheds ${blocker.name}`, { kind: 'shed', by: d.slot, side: d.team, blocker: blocker.slot, ability: fired(d, 'shedStrength', 'runStuff') });
    }
  }
  function defenderGoal(d) {
    const carrier = ball.holder;
    if (carrier && carrier.team === 'off' && d.recognised) return { x: carrier.x, y: carrier.y }; // only a run HE has read (v42.14; was `|| isRun`)
    if (carrier && carrier.team === 'def') return { x: carrier.x, y: carrier.y };
    const a = d.assignment;
    if ((a.a === 'rush' || a.a === 'contain') && qb) return d.state === 'gap' ? { x: a.points[1][0], y: a.points[1][1] } : { x: qb.x, y: qb.y };
    return { x: d.x + 1, y: d.y };
  }

  // ------------------------------------------------------------ offense behaviour
  // Running a drawn line (owner review, 2026-10-20): a player slows into a sharp cut and plants, instead of
  // sailing past the break at full speed and looping back. The sharper the cut the slower he takes it;
  // agility (acceleration) sets how late he can brake. A settle route stops at its last point.
  function followPath(a, points, speedScale = 1, settleAtEnd = false) {
    if (a.wp >= points.length) return true;
    const [tx, ty] = points[a.wp];
    const d = Math.hypot(tx - a.x, ty - a.y), brake = a.accel * 0.8;
    let cap = Infinity, sharp = 0;
    const nxt = points[a.wp + 1];
    if (nxt) {
      const ix = tx - a.x, iy = ty - a.y, ox = nxt[0] - tx, oy = nxt[1] - ty, li = Math.hypot(ix, iy), lo = Math.hypot(ox, oy);
      if (li > 0.05 && lo > 0.05) {
        const turn = Math.acos(clamp((ix * ox + iy * oy) / (li * lo), -1, 1));
        if (turn > 0.6) { const vTurn = a.maxSpeed * clamp(1 - turn / 1.9, 0.14, 1); cap = Math.sqrt(vTurn * vTurn + 2 * brake * d); sharp = turn; }
      }
    } else if (settleAtEnd) cap = Math.sqrt(2 * brake * Math.max(0, d - 0.3));
    steer(a, tx, ty, speedScale, 0.7, cap);
    // A hard cut is taken at the break, not rounded off before it: he plants on the spot and drives out of it.
    const dd = dist(a, { x: tx, y: ty });
    const past = nxt && dd < 1.2 && (a.x - tx) * (nxt[0] - tx) + (a.y - ty) * (nxt[1] - ty) > 0; // already beyond the break: take the cut now
    if (dd < (sharp > 1.1 ? 0.45 : 0.8) || past) { a.wp += 1; if (sharp > 0.9) a.cutUntil = t + 0.3; }
    return a.wp >= points.length;
  }
  function routeEndTarget(a) {
    const pts = a.assignment.points, last = pts[pts.length - 1], prev = pts[pts.length - 2] || last;
    const dx = last[0] - prev[0], dy = last[1] - prev[1], d = Math.hypot(dx, dy) || 1;
    const r = a.assignment.r;
    if (SETTLE_ROUTES.has(r)) return [last[0], last[1]]; // settle
    if (r === 'snag') return [last[0], clamp(last[1] + (last[1] > 0 ? -4 : 4), B.left + 1.5, B.right - 1.5)]; // works across the defender's face toward the middle
    const on = r === 'go' || r === 'fade' || r === 'seam' || r === 'wheel' || r === 'post' || r === 'corner' ? 14 : 6; // a vertical route keeps running (v42.8): a receiver who stopped 6 yards past his drawn line could not chase an overthrow
    return [Math.min(last[0] + (dx / d) * on, B.endLine - 1), clamp(last[1] + (dy / d) * on, B.left + 1.5, B.right - 1.5)]; // keep working
  }
  function escortBlock(a) {
    const carrier = ball.holder;
    const threats = opponents(a.team).filter((d) => !d.engaged && d.stun <= 0).map((d) => ({ d, score: dist(d, carrier) + Math.abs(d.y - carrier.y) * 0.5 }))
      .sort((p, q) => p.score - q.score);
    const threat = threats.find((p) => p.score < 9)?.d;
    if (threat) { steer(a, threat.x, threat.y, 1, 0.5); tryEngage(a, threat, true); return; }
    const dir = carrier.team === 'off' ? 1 : -1;
    steer(a, carrier.x + dir * 5, carrier.y + (a.y < carrier.y ? -3 : 3), 0.95);
  }
  function laneChoice(a) {
    // Evaluate lateral lanes ahead; awareness sets look-ahead and judgement noise.
    const dir = a.team === 'off' ? 1 : -1;
    const look = 4 + 6 * norm(a.attrs.awareness);
    const noise = 2.5 * (1 - norm(a.attrs.awareness));
    let best = null;
    for (let off = -8; off <= 8; off += 2) {
      const ly = a.y + off;
      if (ly < B.left + 1.5 || ly > B.right - 1.5) continue;
      let score = -Math.abs(off) * 0.25 + rng.normal() * noise;
      for (const d of opponents(a.team)) {
        if (d.engaged) continue;
        const ahead = (d.x - a.x) * dir;
        if (ahead < -1 || ahead > look) continue;
        const lat = Math.abs(d.y - ly);
        score -= Math.max(0, 4 - lat) * Math.max(0, 1.2 - ahead / (look * 0.9)); // v42.8: a defender near the far edge of his read barely counts; the ones about to hit him decide the lane
      }
      for (const m of teammates(a.team)) {
        if (m === a) continue;
        const ahead = (m.x - a.x) * dir;
        if (ahead < 0 || ahead > look) continue;
        if (Math.abs(m.y - ly) < 2.5) score += 0.6;
      }
      if (!best || score > best.score) best = { y: ly, score };
    }
    return best ? best.y : a.y;
  }
  /**
   * Vision before contact (v42.8, attribute audit fix 3). From the handoff the carrier keeps attacking the designed lane, and
   * every quarter second he reads what is in front of it: unengaged defenders he can see (Awareness sets how far ahead he
   * looks: 7 yards at 50, 10 at 95) against the blockers in each lane. If the designed gap is closing and a neighbouring lane
   * clearly reads better, he bends the rest of his path to it, once, and plants for the cut (Agility makes the cut; Speed runs
   * it). A poor reader sees less, judges with more noise, and so commits to the closing gap or reacts late. Nothing here looks
   * at a defender's assignment or where he will be: only where everyone is now.
   */
  function preContactLane(a, path) {
    if (a.laneDecided || a.wp >= path.length) return;
    a.visionTimer = (a.visionTimer ?? 0) - DT; if (a.visionTimer > 0) return; a.visionTimer = 0.25;
    const dir = a.team === 'off' ? 1 : -1; const aw = norm(a.attrs.awareness);
    const look = 4 + 6 * aw, miss = 0.45 * Math.pow(1 - aw, 1.2), jitter = 1.6 * (1 - aw); // how far he reads, how often he misses a defender, how far off he places one
    const ahead = path.slice(a.wp); const gate = ahead.find((p) => p[0] * dir >= 0) || path[path.length - 1]; const laneY = gate[1];
    const gateAhead = (gate[0] - a.x) * dir; if (gateAhead > 2.5 + 2.5 * aw) return; // he presses the designed hole first and reads it on the way in: a sharp back reads from five yards out, a poor one from under four, often too late
    // What he sees: unengaged defenders between him and just past the hole (a safety ten yards deep is not closing it), each possibly missed or misplaced.
    const seen = []; const reach = Math.min(look, gateAhead + 3.5);
    const flow = 0.3 * aw; // where each defender is going, from his movement now (an aware back reads the flow; a poor one sees him where he stands)
    for (const d of opponents(a.team)) { if (d.engaged || d.stun > 0) continue; const ax = (d.x + d.vx * flow - a.x) * dir; if (ax < -0.5 || ax > reach) continue; if (rng.chance(miss)) continue; seen.push({ y: d.y + d.vy * flow + rng.normal() * jitter, ax }); }
    const blockers = teammates(a.team).filter((m) => m !== a && m !== qb && !m.engaged && (m.x - a.x) * dir > 0 && (m.x - a.x) * dir <= reach);
    // How a lane reads: each defender he sees in it counts against it (more the nearer he is, less if a free blocker is on his way to him), each free blocker in it counts for it.
    const read = (ly) => {
      let sc = 0;
      for (const d of seen) { const w = Math.max(0, 2.6 - Math.abs(d.y - ly)) * (1.3 - d.ax / (reach + 1)); const picked = blockers.some((m) => Math.abs(m.y - ly) < 2.0 && (m.x - a.x) * dir < d.ax); sc -= picked ? w * 0.4 : w; }
      for (const m of blockers) if (Math.abs(m.y - ly) < 2.2) sc += 0.5;
      return sc;
    };
    const base = read(laneY); let best = { off: 0, sc: base };
    for (const off of [-2, 2, -4, 4]) { const ly = laneY + off; if (ly < B.left + 1.5 || ly > B.right - 1.5) continue; const sc = read(ly) - Math.abs(off) * 0.15; if (sc > best.sc) best = { off, sc }; }
    if (best.off === 0 || best.sc < base + 1.6) return; // the call reads fine, or nothing next to it reads clearly better: he takes the call
    a.laneDecided = true; a.cutUntil = t + 0.3; const off = best.off; // he plants to bend the run
    const pts = path.map((p, i) => (i < a.wp ? p : [p[0], clamp(p[1] + off * (i === a.wp ? 0.6 : 1), B.left + 1.5, B.right - 1.5)]));
    a.assignment = { ...a.assignment, points: pts }; // his own copy: the playbook's drawn path is never changed
    log(`${a.name} cuts it back`, { kind: 'cutback', by: a.slot, side: a.team, off, at: +((gate[0] - a.x) * dir).toFixed(1) });
  }
  function carrierMove(a) {
    const dir = a.team === 'off' ? 1 : -1;
    const path = a.assignment?.points;
    const onDesignedPath = a.team === 'off' && path && ['carry', 'keep', 'option'].includes(a.assignment.a) && a.wp < path.length && a.x * dir < 1.5;
    if (onDesignedPath) { if (ball.holder === a) preContactLane(a, path); followPath(a, a.assignment.points, 1); return; }
    // Walk-through: the carrier runs his whole drawn path and stops at its end.
    if (dry && a.team === 'off' && path && ['carry', 'keep', 'option'].includes(a.assignment.a)) { if (a.wp === path.length - 1 && dist(a, { x: path[a.wp][0], y: path[a.wp][1] }) < 2) a.wp = path.length; if (a.wp < path.length) followPath(a, path, 1); else steer(a, a.x, a.y, 0, 0.3); return; }
    if (a.laneTimer === undefined || a.laneTimer <= 0) { a.laneY = laneChoice(a); a.laneTimer = 0.42 - 0.22 * norm(a.attrs.awareness); } // v42.8: a sharp runner re-reads the field every 0.2 s, a poor one every 0.3 s and reacts late
    a.laneTimer -= DT;
    // Juke: one attempt each time a tackler closes within 2 yards (agility vs awareness).
    const nearest = opponents(a.team).filter((d) => !d.engaged && d.stun <= 0).sort((p, q) => dist(p, a) - dist(q, a))[0];
    a.jukeCooldown = (a.jukeCooldown || 0) - DT;
    if (nearest && dist(nearest, a) < 2.0 && a.jukeCooldown <= 0) {
      a.jukeCooldown = 1.5;
      const p = clamp(0.12 + 0.3 * (norm(a.attrs.agility) - norm(nearest.attrs.awareness)) + 0.1 * norm(a.attrs.agility), 0.04, 0.4);
      if (rng.chance(p)) {
        a.laneY = clamp(a.y + (nearest.y > a.y ? -3.5 : 3.5), B.left + 1.5, B.right - 1.5);
        nearest.stun = Math.max(nearest.stun, 0.3);
        a.vx *= 0.65; a.vy *= 0.65; // a cut costs the runner speed too
        if (a.ability?.quakeStep) quake(a);
        if (a.ability?.vanishing && !a.vanished) { a.vanished = true; nearest.stun = Math.max(nearest.stun, a.ability.vanishing); setStatus(nearest, 'lost', a.ability.vanishing); abilityUsed(a, 'vanishing'); abilityOutcome('vanished', a, `${a.name} vanishes; ${nearest.name} is left frozen`, { victim: nearest.slot }); }
        if (a.ability?.elusiveFirst) abilityUsed(a, 'elusiveFirst'); log(`${a.name} jukes ${nearest.name}`, { kind: 'juke', by: a.slot, side: a.team, victim: nearest.slot, ability: fired(a, 'elusive', 'elusiveFirst') });
      }
    }
    // He runs to his lane a few yards ahead, not to the end line at that lateral (v42.8, attribute audit fix 3): aimed at the
    // end line, a lane six yards over was a six-degree lean and the lane he chose was never actually taken.
    const goalX = clamp(a.x + dir * 8, B.ownEndLine + 0.5, B.endLine - 0.5);
    // Carrying the ball costs a little top speed; pursuers run with full effort.
    steer(a, goalX, a.laneY, CARRY_PACE, 0.3);
  }

  function offenseTick(a) {
    const asg = a.assignment;
    if (ball.holder === a && (phase === 'carry' || a !== qb)) { carrierMove(a); return; }
    if (asg.a === 'release' && !a.released && t >= screenReleaseAt()) screenRelease(a); // lets go of his man on time, even mid-block
    if (a.engaged) { resolveEngagement(a); return; }
    const someoneCarrying = phase === 'carry' || (phase === 'run' && handoffDone) || (ball.holder && ball.holder !== qb);
    if (a === qb && (ball.inAir || (ball.holder && ball.holder !== qb) || result)) { steer(a, a.x, a.y, 0, 0.2); return; }
    if (a.released) { screenBlock(a); return; } // screen linemen stay on their wall
    if (ball.holder && ball.holder.team === 'off' && ball.holder !== qb && a !== qb && !dry?.noDefense) { escortBlock(a); return; } // walk-through: blockers stay on their drawn assignments
    if (ball.holder && ball.holder.team === 'def') { pursue(a); return; }
    if (ball.inAir) {
      // The target adjusts to the ball (v42.8, attribute audit fix 1): he runs to the landing spot at the pace that gets him
      // there as the ball does, and brakes into it (the old code ran there flat out and stopped only inside 0.2 yards, so a
      // fast receiver overran the spot by his braking distance). Behind the ball he still sprints; a ball thrown past him is
      // still past him.
      if (ball.target === a) {
        const L = ball.landing; const dL = dist(a, L); const tLeft = Math.max(0.05, ball.flightTime - ball.flight);
        const pace = dL / tLeft; // the speed that arrives with the ball
        const vCatch = a.maxSpeed * 0.75; // he can take the ball at a run; he only must not sail past it
        const brake = Math.sqrt(vCatch * vCatch + 2 * a.accel * 0.8 * Math.max(0, dL - 0.3)); // the most he can carry and still settle at the spot
        const cap = Math.min(brake, Math.max(pace, dL > 2 ? a.maxSpeed * 0.35 : 0)); // never below a jog while the ball is far
        steer(a, L.x, L.y, 1, 0.3, cap); return;
      }
      // Other receivers slow and turn; blockers hold.
      if (asg.a === 'route') { steer(a, a.x, a.y, 0.3, 0.2); return; }
    }
    switch (asg.a) {
      case 'route': {
        if (a.wp < asg.points.length) followPath(a, asg.points, 1, SETTLE_ROUTES.has(asg.r)); else { const [tx, ty] = routeEndTarget(a); steer(a, tx, ty, asg.r === 'snag' ? 0.45 : 0.8, 0.4); }
        // Cyclone: on her first break, whoever is covering her is spun around and loses a step.
        if (a.ability?.cyclone && !a.cycloneDone && a.wp >= 2) {
          a.cycloneDone = true; const spun = coveringDefs(a);
          for (const d of spun) { d.stun = Math.max(d.stun, a.ability.cyclone); setStatus(d, 'spin', a.ability.cyclone); }
          if (spun.length) { abilityUsed(a, 'cyclone'); abilityOutcome('spun', a, `${a.name}'s Cyclone spins ${spun[0].name} around`, { victim: spun[0].slot }); }
        }
        // Mind Game: on his first fake, his man defender bites half the time and loses a step.
        if (a.ability?.mindGame && !a.mindDone && a.wp >= 2) {
          a.mindDone = true; const man = coveringDefs(a).find((d) => d.assignment?.a === 'man');
          if (man && rng.chance(a.ability.mindGame)) { man.stun = Math.max(man.stun, 0.4); setStatus(man, 'confused', 0.8); abilityUsed(a, 'mindGame'); abilityOutcome('bit_fake', a, `${man.name} bites on ${a.name}'s fake`, { victim: man.slot }); }
        }
        // Eclipse Route: on a deep route his defender loses track of him for half a second.
        if (a.ability?.eclipse && !a.eclipseDone && deepRoute(a) && a.x >= 10) {
          a.eclipseDone = true; const lost = coveringDefs(a);
          for (const d of lost) { d.stun = Math.max(d.stun, a.ability.eclipse); setStatus(d, 'lost', a.ability.eclipse); }
          if (lost.length) { abilityUsed(a, 'eclipse'); abilityOutcome('lost_track', a, `${lost[0].name} loses ${a.name} in the Eclipse`, { victim: lost[0].slot }); }
        }
        return;
      }
      case 'block': {
        if (isRun) { runBlock(a, asg.points[1]); return; }
        passBlock(a); return;
      }
      case 'run_block': runBlock(a, asg.to); return;
      case 'stalk': runBlock(a, asg.to, 7, true); return;
      case 'pull': { if (a.wp < 1) { steer(a, asg.via[0], asg.via[1], 1, 0.6); if (dist(a, { x: asg.via[0], y: asg.via[1] }) < 0.8) a.wp = 1; return; } runBlock(a, asg.to); return; }
      case 'release': {
        if (!a.released) screenRelease(a);
        screenBlock(a); return;
      }
      case 'fake': { if (a.wp < 1) { steer(a, asg.points[1][0], asg.points[1][1], 1, 0.6); if (dist(a, { x: asg.points[1][0], y: asg.points[1][1] }) < 0.8) a.wp = 1; return; } passBlock(a); return; }
      case 'handoff': { if (a === qb) qbHandoff(a); return; }
      case 'pitch': { if (a === qb) qbPitch(a); return; }
      case 'option': { qbOption(a); return; }
      case 'keep': case 'carry': { followPath(a, asg.points, 0.9); return; }
      case 'pass': case 'play_action': case 'boot': { qbTick(a); return; }
      default: steer(a, a.x, a.y, 0, 0.2);
    }
  }

  // Screens (owner review, 2026-10-20): the linemen sell pass protection for a beat, then let their rushers
  // go by and get out in front of the screen to block the second level (linebackers, corners, safeties),
  // so the catch is made behind a wall. They never go back to the rushers they let through.
  const screenReleaseAt = () => 0; // owner review 2026-10-20: screen linemen leave at the snap and go straight to their blocks
  function screenRelease(a) {
    a.released = true;
    if (a.engaged) { const d = a.engaged; d.engaged = null; a.engaged = null; d.vx = 0; d.vy = 0; a.letGo = d; }
    log(`${a.name} releases to block downfield`, { kind: 'screen_release', by: a.slot });
  }
  function screenBlock(a) {
    if (a.engaged) { resolveEngagement(a); return; }
    const carrier = ball.holder && ball.holder.team === 'off' && ball.holder !== qb ? ball.holder : null;
    const rec = carrier || offs.find((o) => o.slot === offensePlay.primary) || qb;
    const [lx, ly] = a.assignment.to || a.assignment.points[1];
    const focus = carrier ? { x: carrier.x + 2, y: carrier.y } : { x: Math.max(lx, rec.x) + 1, y: (ly + rec.y) / 2 };
    // Second-level defenders only: anyone already past him toward the quarterback is left alone.
    const rusher = (d) => d === a.letGo || ['rush', 'contain'].includes(d.assignment?.a);
    const cands = defs.filter((d) => !d.engaged && d.stun <= 0 && d.noEngage <= 0 && d.x > a.x - 0.5 && (carrier ? d.x > carrier.x - 1 && (!rusher(d) || d.x > carrier.x + 1) : !rusher(d)))
      .map((d) => ({ d, s: dist(d, focus) + 0.4 * dist(d, a) })).sort((p, q) => p.s - q.s);
    const target = cands.find((c) => dist(c.d, focus) < 11)?.d;
    if (target && (carrier || dist(a, { x: lx, y: ly }) < 2.5 || dist(target, a) < 3)) {
      steer(a, target.x - 0.6, target.y, 1, 0.4);
      tryEngage(a, target, true); return; // an open-field block: the defender can still slip it
    }
    if (carrier) { steer(a, carrier.x + 3, carrier.y + (a.y < carrier.y ? -1.5 : 1.5), 1, 0.4); return; }
    steer(a, lx, ly, 1, 0.5);
  }
  function passBlock(a) {
    const zoneY = a.assignment.points?.[0]?.[1] ?? a.y;
    const threats = defs.filter((d) => !d.engaged && d.stun <= 0 && ['rush', 'contain'].includes(d.assignment.a) || (!d.engaged && d.x < 2 && d.recognisedPass))
      .map((d) => ({ d, score: dist(d, qb) + Math.abs(d.y - zoneY) * 0.9 })).sort((p, q) => p.score - q.score);
    const threat = threats[0]?.d;
    // Any rusher who runs into the blocker gets engaged, not only the one he is tracking.
    const contact = defs.filter((d) => !d.engaged && d.stun <= 0 && d.noEngage <= 0 && dist(d, a) < 1.3).sort((p, q) => dist(p, qb) - dist(q, qb))[0];
    if (contact && tryEngage(a, contact)) return;
    if (threat && dist(threat, qb) < 8) {
      // Stay between the rusher and the QB.
      const bx = (threat.x + qb.x) / 2, by = (threat.y + qb.y) / 2;
      steer(a, bx, by, 0.9, 0.3);
      tryEngage(a, threat); return;
    }
    steer(a, a.assignment.points[1][0], zoneY, 0.6, 0.3);
  }
  function runBlock(a, landmark, searchRadius = 2.2, soft = false) {
    const [lx, ly] = landmark;
    // Block the most immediate threat: a defender attacking the gap takes priority over the landmark.
    const threat = (d) => !d.engaged && d.stun <= 0 && d.noEngage <= 0;
    const attacking = defs.filter((d) => threat(d) && Math.abs(d.y - a.y) < 2.6 && d.x > a.x - 1 && d.x < a.x + 4.5 && (d.vx < -1 || dist(d, a) < 1.8));
    const nearby = (attacking.length ? attacking : defs.filter((d) => threat(d) && dist(d, a) < searchRadius)).sort((p, q) => dist(p, a) - dist(q, a))[0];
    if (nearby) { steer(a, nearby.x, nearby.y, 1, 0.3); tryEngage(a, nearby, soft); return; }
    if (dist(a, { x: lx, y: ly }) > 0.8) { steer(a, lx, ly, 1, 0.5); return; }
    // At the landmark: climb to the next unblocked defender ahead.
    const next = defs.filter((d) => !d.engaged && d.x > a.x - 1 && dist(d, a) < 7).sort((p, q) => dist(p, a) - dist(q, a))[0];
    if (next) { steer(a, next.x, next.y, 0.9, 0.3); tryEngage(a, next, true); return; }
    steer(a, lx + 1, ly, 0.5, 0.3);
  }

  // ------------------------------------------------------------ quarterback
  function giveBall(to) {
    ball.holder = to; handoffDone = true; phase = 'carry'; stats.carrier = to.slot; handoffAt = t;
    to.laneTimer = 0; to.jukeCooldown = 0;
    log(`Handoff to ${to.name}`, { kind: 'handoff', to: to.slot });
  }
  // The handoff: the quarterback steps to a meeting point just off the runner's drawn path (owner review,
  // 2026-10-20) instead of chasing him, so the two never collide and the runner keeps his line.
  function meshPoint(qbp, rb) {
    const pts = rb.assignment.points; let best = null;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
      const k = clamp(((qbp.x - ax) * dx + (qbp.y - ay) * dy) / L, 0, 1), px = ax + k * dx, py = ay + k * dy, dd = Math.hypot(qbp.x - px, qbp.y - py);
      if (!best || dd < best.dd) best = { x: px, y: py, dd };
    }
    if (!best) return { x: qbp.x, y: qbp.y };
    const off = Math.min(0.9, best.dd); const ux = best.dd > 0.01 ? (qbp.x - best.x) / best.dd : -1, uy = best.dd > 0.01 ? (qbp.y - best.y) / best.dd : 0;
    return { x: best.x + ux * off, y: best.y + uy * off };
  }
  function qbHandoff(a) {
    const rb = offs.find((o) => ['carry'].includes(o.assignment.a));
    if (!handoffDone) {
      if (rb) { a.mesh ||= meshPoint({ x: a.assignment.points[0][0], y: a.assignment.points[0][1] }, rb); steer(a, a.mesh.x, a.mesh.y, 0.8, 0.3); } else steer(a, a.x, a.y, 0, 0.2);
      if (rb && dist(a, rb) < 1.5 && t > 0.2) giveBall(rb);
      else if (rb && t > 1.1) giveBall(rb);
      return;
    }
    steer(a, a.x - 2, a.y + 2, 0.5, 0.5); // carry out the fake
  }
  function qbPitch(a) {
    const rb = offs.find((o) => o.assignment.a === 'carry');
    if (!handoffDone && rb) {
      steer(a, a.assignment.points[1][0], a.assignment.points[1][1], 1, 0.3);
      if (t > 0.3) { giveBall(rb); log('Pitch', { kind: 'pitch' }); }
      return;
    }
    steer(a, a.x - 1, a.y, 0.3, 0.5);
  }
  function qbOption(a) {
    const rb = offs.find((o) => o.assignment.a === 'carry');
    if (!handoffDone) {
      followPath(a, a.assignment.points.slice(0, 2), 0.9);
      if (t >= 0.5) {
        if (!rb) { ball.holder = a; handoffDone = true; phase = 'carry'; stats.carrier = a.slot; a.wp = 2; keepAt = t; return; }
        // The option read (owner's rule, 2026-10-20). In 7-on-7 a receiver can always block the corner, so the
        // quarterback reads the extra defensive lineman when the defence has one on the field, otherwise the
        // linebacker (the play-side one when there are two). If that defender comes at the quarterback (rush,
        // blitz, spy, contain) the quarterback holds until he is close, then pitches or gives. If he is on the
        // back (man on the back) or drops away, the quarterback keeps. Nobody to read: the ball goes to the back.
        if (!a.optionRead) {
          const playSide = Math.sign(rb.assignment.points[rb.assignment.points.length - 1][1]) || 1;
          const lbs = defs.filter((d) => /^LB/.test(d.slot)).sort((p, q) => (Math.sign(q.y) === playSide) - (Math.sign(p.y) === playSide) || dist(p, a) - dist(q, a));
          const key = [bySlot.def.DL3, ...lbs].find((d) => d && !d.engaged) || null;
          const asg = key?.assignment;
          let attacking = !key || ['rush', 'contain', 'spy'].includes(asg.a);
          if (key && rng.chance(0.3 * (1 - norm(a.attrs.awareness)))) attacking = !attacking; // a less aware quarterback misreads now and then
          a.optionRead = { key, give: attacking };
          const pitchWord = Math.abs(rb.assignment.points[rb.assignment.points.length - 1][1]) > Math.abs(a.assignment.points[a.assignment.points.length - 1][1]) ? 'pitch' : 'give';
          a.optionRead.word = pitchWord;
          if (!attacking) { ball.holder = a; handoffDone = true; phase = 'carry'; stats.carrier = a.slot; a.wp = 2; keepAt = t; log(`${a.name} reads ${key ? key.name : 'nobody'} and keeps`, { kind: 'keep', read: key?.slot || null }); return; }
          log(key ? `${a.name} reads ${key.name} coming and holds to ${pitchWord}` : `${a.name} reads nobody and will ${pitchWord}`, { kind: 'option_read', read: key?.slot || null });
        }
        const { key } = a.optionRead;
        // Hold the ball until the read defender commits (or the timing runs out), then get rid of it.
        if (key && !key.engaged && dist(key, a) > 2.5 && t < 1.2) return;
        if (a.optionRead.word === 'pitch') log(`${a.name} pitches`, { kind: 'pitch', read: key?.slot || null });
        giveBall(rb);
      }
      return;
    }
    steer(a, a.x - 1, a.y, 0.3, 0.5);
  }
  function qbTick(a) {
    const asg = a.assignment;
    // Play-action fake and boot movement first.
    if (asg.a === 'play_action' || asg.a === 'boot') {
      const fakeDone = a.wp >= 2;
      if (!fakeDone) { followPath(a, asg.points.slice(0, 2), 1); qbFakeUntil = t; return; }
      qr.fakeAt ??= +t.toFixed(2); // the play-action fake is complete: the read progression starts from here
      if (asg.a === 'boot' && a.wp < asg.points.length) followPath(a, asg.points, 0.85);
      else steer(a, a.x, a.y, 0, 0.2); // set up to throw
    } else {
      const dropPt = asg.points[1];
      if (a.state === 'init') { steer(a, dropPt[0], dropPt[1], 1, 0.3); if (dist(a, { x: dropPt[0], y: dropPt[1] }) < 0.5 || t > DROP_TIME[offensePlay.drop] + 0.4) a.state = 'set'; }
      else steer(a, a.x, a.y, 0, 0.2);
    }
    if (dry) return; // walk-through: the quarterback keeps the ball so every route can be watched to its end
    const dropTime = DROP_TIME[offensePlay.drop] ?? 1.1;
    const hold = asg.hold || 0;
    if (a.windup) { if (t >= a.windup.at) throwTo(a, a.windup.r, a.windup.pressured); return; }
    const rushers = defs.filter((d) => d.stun <= 0 && !d.engaged).map((d) => ({ d, dd: dist(d, a) })).sort((p, q) => p.dd - q.dd);
    const nearestRusher = rushers[0]?.dd ?? 99;
    const pressured = nearestRusher < 3.2;
    if (pressured && pressureAt === Infinity) {
      pressureAt = t; stats.pressure = true; const pr = rushers[0].d; stats.pressureBy = pr.slot;
      // The blocker who was beaten in the last second is responsible; a rusher nobody touched is "unblocked" and charged to no one.
      if (pr.lastBeat && t - pr.lastBeat.t < 1.2) stats.pressureAllowedBy = pr.lastBeat.blocker;
    }
    const foresight = a.ability?.foresight && defensePlay.tags.includes('blitz') ? a.ability.foresight : 1; // Foresight: against a blitz, to the hot read twice as fast
    if (foresight > 1 && t > 0.3) abilityUsed(a, 'foresight');
    const readyAt = (pressured ? dropTime * (1.0 - 0.35 * norm(a.attrs.awareness) - (a.ability?.pressureSense || 0)) : dropTime + 0.2) / (pressured ? foresight : 1); // an aware passer throws hot sooner
    if (pressured && a.ability?.pressureSense) abilityUsed(a, 'pressureSense');
    // A screen is thrown on time (owner review, 2026-10-20): once the linemen have let the rush through, the
    // quarterback dumps it to the screen man as the rushers arrive, unless a defender is already on him.
    if (screenPlay && !options.forcedTarget && !options.qb && (t >= hold || (pressured && t >= 0.45))) { // (in the AI Testing Lab the screen goes through the read progression, so a hold really holds) // the rush is coming free: dump it as soon as it arrives
      const sc = bySlot.off[offensePlay.primary];
      if (sc && sc.assignment.a === 'route' && projectedSeparation(a, sc) > 0.6) { a.throwRead = 0; throwTo(a, sc, pressured); return; }
    }
    const setAt = Math.max(readyAt, hold);
    if (options.forcedTarget) { if (t < setAt) return; legacyForcedRead(a, pressured, foresight, dropTime); return; } // a chosen target (tools, future player control): the old single-read path
    if (options.qb?.mode === 'human' && !qr.humanDone && t >= options.qb.at) { qbDecide(a, { pressured, foresight, dropTime, rushers, setAt }); return; } // AI Testing Lab: the human's tap acts at once (production AI timing below is unchanged)
    if (t < setAt - awarenessProfile(a.attrs.awareness).look) return; // eyes up: the first look is taken as he finishes the drop (no throw before his feet are set)
    qbDecide(a, { pressured, foresight, dropTime, rushers, setAt });
  }
  /** The pre-v42.5 read loop, kept only for options.forcedTarget (a caller that names the receiver). */
  function legacyForcedRead(a, pressured, foresight, dropTime) {
    // Reading: step through the progression at a pace set by awareness.
    readClock -= DT;
    const scanPace = (0.42 - 0.26 * norm(a.attrs.awareness)) / (pressured ? foresight : 1);
    const progression = options.forcedTarget ? [options.forcedTarget] : (offensePlay.progression.length ? offensePlay.progression : receivers);
    // Judgement: lesser quarterbacks misjudge windows (both ways) more often.
    const judgeNoise = 1.3 * (1 - norm(a.attrs.awareness)) + 0.15;
    const openness = (r) => {
      const o = projectedSeparation(a, r); if (o < 0) return o;
      // Refraction: windows near him are misjudged 20% more.
      const prism = defs.find((d) => d.ability?.refraction && dist(d, r) < 4);
      if (prism) abilityUsed(prism, 'refraction');
      return o + rng.normal() * judgeNoise * (prism ? 1 + prism.ability.refraction : 1);
    };
    const threshold = (pressured ? 2.1 : 2.9) - 0.6 * norm(a.attrs.awareness);
    // A route has to develop before it is thrown (except quick game and hot throws).
    const QUICK = QUICK_ROUTES;
    const ready = (r) => pressured || r.assignment.a !== 'route' || QUICK.has(r.assignment.r) || r.wp >= Math.min(2, r.assignment.points.length - 1) || (r.x > 9 && r.wp >= 1);
    const candidate = bySlot.off[progression[Math.min(readIndex, progression.length - 1)]];
    if (candidate && ready(candidate) && openness(candidate) >= threshold) {
      // Whiteout: once per half, the quarterback's first read freezes and he has to move on to the second.
      const frost = readIndex === 0 && progression.length > 1 && !options.forcedTarget ? defs.find((d) => d.ability?.whiteout && available(d, 'whiteout', 'drive')) : null;
      if (frost) { spend(frost, 'whiteout', 'drive'); readIndex = 1; readClock = scanPace; candidate.vx = 0; candidate.vy = 0; candidate.stun = Math.max(candidate.stun, 0.8); setStatus(candidate, 'frozen', 0.8); abilityUsed(frost, 'whiteout'); abilityOutcome('read_frozen', frost, `${frost.name}'s Whiteout freezes ${a.name}'s first read`, { victim: a.slot }); return; }
      a.throwRead = readIndex; throwTo(a, candidate, pressured); return;
    }
    if (readClock <= 0) { readClock = scanPace; readIndex += 1; }
    if (readIndex >= progression.length) {
      a.throwRead = 99; // past the progression: no first-read throw from here (Sovereign Arm)
      // Progression exhausted: best available, scramble, or wait briefly.
      const ranked = receivers.map((s) => bySlot.off[s]).filter((r) => r && r.assignment.a === 'route' && ready(r)).map((r) => ({ r, o: openness(r) })).sort((p, q) => q.o - p.o);
      const best = ranked[0];
      const judge = best ? best.o + (rng.normal() * (1 - norm(a.attrs.awareness)) * 0.8) : -1;
      if (best && judge >= (pressured ? 1.0 : 1.8)) { throwTo(a, best.r, pressured); return; }
      if (pressured) {
        // Get rid of it if someone is reasonably open; otherwise scramble or eat the sack (no intentional throw-aways, v42.6).
        if (best && best.o >= 1.2 && rng.chance(0.5 + 0.35 * norm(a.attrs.awareness))) { throwTo(a, best.r, true); return; }
        if (!scrambled && norm(a.attrs.agility) > 0.45 && rng.chance(0.3)) { scramble(a); return; }
      }
      if (t > dropTime + 2.6) {
        if (best && best.o >= 0.8 && rng.chance(0.6)) { throwTo(a, best.r, pressured); return; }
      }
      readIndex = Math.max(0, progression.length - 1); readClock = scanPace * 0.6; // keep cycling through the late reads
    }
  }
  // Where a receiver will be after `travel` seconds if he keeps running his route.
  function predictReceiver(r, travel) {
    const pts = r.assignment.a === 'route' ? r.assignment.points : null;
    const speed = Math.max(Math.hypot(r.vx, r.vy), r.maxSpeed * 0.85);
    let x = r.x, y = r.y, remaining = speed * travel;
    if (pts) {
      let i = r.wp;
      const [ex, ey] = routeEndTarget(r);
      const targets = [...pts.slice(i), [ex, ey]];
      for (const [tx, ty] of targets) {
        const seg = Math.hypot(tx - x, ty - y);
        if (seg >= remaining) { const k = seg > 0 ? remaining / seg : 0; return { x: x + (tx - x) * k, y: y + (ty - y) * k }; }
        remaining -= seg; x = tx; y = ty;
      }
      return { x, y };
    }
    return { x: r.x + r.vx * travel, y: r.y + r.vy * travel };
  }
  function projectedSeparation(passer, r) {
    const d = dist(passer, r);
    const velocity = 17 + 13 * norm(passer.attrs.arm);
    const travel = d / velocity + 0.35; // release + flight
    const { x: px, y: py } = predictReceiver(r, travel);
    let nearest = 99;
    const air = px - passer.x;
    const proj = air > 20 ? 0.95 : 0.8; // a defender sprinting with a deep route keeps closing while the ball is up
    for (const def of defs) {
      if (def.engaged || def.ability?.nightVeil) continue; // Night Veil: quarterbacks never see him as covering
      const dx = def.x + def.vx * travel * proj, dy = def.y + def.vy * travel * proj;
      nearest = Math.min(nearest, Math.hypot(dx - px, dy - py));
    }
    // Deep throws need a bigger window; throws beyond arm range are not open.
    const range = (30 + 30 * norm(passer.attrs.arm)) * (passer.ability?.tailwind && air > 15 ? 1 + passer.ability.tailwind : 1); // Tailwind: deep passes travel 20% farther
    if (d > range) return -1;
    if (px > B.endLine - 1 || py < B.left + 0.5 || py > B.right - 0.5) return -1;
    // Deep balls need a real window: a defender in phase a yard behind is still covering.
    return nearest - (air > 20 ? 1.8 : air > 15 ? 1.0 : 0) - Math.max(0, air - 25) * 0.05;
  }
  // ------------------------------------------------------------ QB read progression (GDD §53)
  const WINDOW_LAG = 0.2; // seconds a defender needs to react to the release and get to full speed toward the ball
  /** A route has to develop before it is thrown (except quick game and hot throws). */
  const routeReady = (r, hot) => hot || r.assignment.a !== 'route' || QUICK_ROUTES.has(r.assignment.r) || r.wp >= Math.min(2, r.assignment.points.length - 1) || (r.x > 9 && r.wp >= 1);
  const routeRunners = () => receivers.map((sl) => bySlot.off[sl]).filter((r) => r && r.assignment?.a === 'route');
  /**
   * The arrival window for a ball thrown to `r` now: the catch point (the receiver led along his route for the wind-up and flight),
   * and how close each defender can get to it by the time the ball lands: he keeps playing his assignment through the wind-up, then
   * reacts and runs at full speed. m1 / m2 = the nearest / second-nearest defender's margin in yards; lane = the nearest one is
   * undercutting the throw (between the passer and the catch point). The quarterback never sees a Night Veil defender.
   */
  function arrivalWindow(passer, r) {
    const v = 17 + 13 * norm(passer.attrs.arm); const windup = 0.14 + 0.1 * (1 - norm(passer.attrs.arm));
    let P = predictReceiver(r, windup + dist(passer, r) / v);
    for (let k = 0; k < 2; k++) P = predictReceiver(r, windup + Math.hypot(P.x - passer.x, P.y - passer.y) / v);
    const d = Math.hypot(P.x - passer.x, P.y - passer.y); const flight = d / v; const air = P.x - passer.x;
    const range = (30 + 30 * norm(passer.attrs.arm)) * (passer.ability?.tailwind && air > 15 ? 1 + passer.ability.tailwind : 1);
    const reachable = d <= range && P.x <= B.endLine - 1 && P.y >= B.left + 0.5 && P.y <= B.right - 0.5;
    const ms = [];
    for (const def of defs) {
      if (def.engaged || def.ability?.nightVeil) continue;
      const sx = def.x + def.vx * windup, sy = def.y + def.vy * windup;
      const close = def.maxSpeed * Math.max(0, flight - WINDOW_LAG - Math.max(0, def.stun || 0));
      const along = d > 0 ? ((sx - passer.x) * (P.x - passer.x) + (sy - passer.y) * (P.y - passer.y)) / (d * d) : 0;
      const off = d > 0 ? Math.abs((sx - passer.x) * (P.y - passer.y) - (sy - passer.y) * (P.x - passer.x)) / d : 99;
      ms.push({ def, m: Math.max(0, Math.hypot(sx - P.x, sy - P.y) - close), under: along > 0.4 && along < 0.92 && off < 2.2 });
    }
    ms.sort((p, q) => p.m - q.m);
    return { P, air, dist: d, flight, reachable, m1: ms[0]?.m ?? 99, m2: ms[1]?.m ?? 99, near: ms[0]?.def || null, lane: !!ms[0]?.under && (ms[0]?.m ?? 99) < 2.5 };
  }
  const oddsFor = (passer, r, w, m1, m2, pressured) => throwOdds({ m1, m2, air: w.air, dist: w.dist, accuracy: passer.attrs.accuracy, catching: r.attrs.catching, agility: r.attrs.agility, cover: w.near?.attrs.coverage ?? 60, pickHands: w.near?.attrs.catching ?? 50, pressured, moving: Math.hypot(passer.vx, passer.vy) > 1, flight: w.flight, rspeed: r.maxSpeed });
  /** One look at a receiver: the true window, and what this quarterback perceives of it (one judgement per look). */
  function qbLook(a, r, sensed, extraNoise = 1) {
    const P = awarenessProfile(a.attrs.awareness); const w = arrivalWindow(a, r); const ready = routeReady(r, sensed);
    const prism = defs.find((d) => d.ability?.refraction && dist(d, r) < 4); if (prism) abilityUsed(prism, 'refraction'); // Refraction: windows near him are misjudged 20% more
    const noise = P.noise * extraNoise * (prism ? 1 + prism.ability.refraction : 1);
    const fix = qr.order && r.slot === qr.order[0] ? P.fixation : 0; // a lesser passer overrates his first read
    const pm1 = Math.max(0, w.m1 + qrng.normal() * noise + fix);
    const pm2 = qrng.chance(P.missSecond) ? 99 : Math.max(0, w.m2 + qrng.normal() * noise + fix);
    const physPressure = (defs.filter((d) => d.stun <= 0 && !d.engaged).reduce((m, d) => Math.min(m, dist(d, a)), 99)) < 3.2;
    const seen = oddsFor(a, r, w, pm1, pm2, physPressure); const truth = oddsFor(a, r, w, w.m1, w.m2, physPressure);
    return { r, slot: r.slot, w, ready, pm1, pm2, seen, truth, at: t };
  }
  const QR_WORD = { open: 'open', double: 'double coverage', lane: 'throwing lane blocked', covered: 'covered', tight: 'window too tight', not_ready: 'route not developed', out_of_range: 'out of range', noticed: 'spotted open' };
  function qrLog(kind, data) {
    const e = { t: +t.toFixed(2), kind, ...data }; qr.log.push(e);
    const nm = (sl, team = 'off') => (team === 'off' ? bySlot.off[sl] : bySlot.def[sl])?.name || sl;
    const text = kind === 'read' ? `${qb?.name || 'QB'} reads ${nm(e.slot)}: ${QR_WORD[e.reason] || e.reason}` : kind === 'pressure' ? `${nm(e.by, 'def')} is closing on ${qb?.name || 'the QB'}`
      : kind === 'decision' ? `${qb?.name || 'QB'} decides: ${e.action === 'throw' ? `throw to ${nm(e.slot)}` : e.action === 'scramble' ? 'scramble' : 'throw it away'}` : '';
    events.push({ t: e.t, text, ...e, kind: `qb_${kind}` }); return e;
  }
  function buildOrder() {
    const base = (offensePlay.progression.length ? offensePlay.progression : receivers).filter((sl) => bySlot.off[sl]?.assignment?.a === 'route');
    const rest = routeRunners().map((r) => r.slot).filter((sl) => !base.includes(sl));
    return [...base, ...rest];
  }
  function startLook(a, i, why = 'progression', quick = false) {
    const P = awarenessProfile(a.attrs.awareness); const foresightK = a.ability?.foresight && defensePlay.tags.includes('blitz') && qr.sensedAt != null ? a.ability.foresight : 1;
    const hurry = qr.sensedAt != null ? 0.7 : 1; // pressure shortens each look (and lowers the bar: acceptBar)
    qr.i = i; qr.cur = { slot: qr.order[i], why }; qr.lookEnd = t + P.look * (quick ? 0.55 : 1) * hurry / foresightK;
  }
  /** The running lane he sees: the best of five directions, 5 yards out (gain estimate in yards, margin in seconds). */
  function runningLane(a) {
    const P = awarenessProfile(a.attrs.awareness); let best = null;
    for (const ang of [0, 0.6, -0.6, 1.1, -1.1]) {
      const px = a.x + Math.cos(ang) * 5, py = a.y + Math.sin(ang) * 5; if (py < B.left + 1 || py > B.right - 1) continue;
      const tq = 5 / a.maxSpeed + 0.25; let mt = 9;
      for (const d of defs) { if (d.engaged || d.stun > 0) continue; const mx = d.x + d.vx * 0.35, my = d.y + d.vy * 0.35; mt = Math.min(mt, 0.2 + Math.max(0, Math.hypot(mx - px, my - py) - 1.0) / d.maxSpeed - tq); } // a defender carries his momentum before he can turn
      const seenM = mt + qrng.normal() * P.laneNoise;
      const gain = Math.cos(ang) * clamp(1 + seenM * 7, -3, 12);
      if (!best || gain > best.gain) best = { ang, margin: +mt.toFixed(2), seen: +seenM.toFixed(2), gain: +gain.toFixed(1) };
    }
    if (best) best.exp = +expectedRun(a, best.seen).toFixed(1);
    return best;
  }
  const mobility = (a) => (norm(a.attrs.speed) + norm(a.attrs.agility)) / 2;
  /** Expected scramble yards from the lane margin he sees (seconds) and his mobility; fitted on forced scrambles in this engine. */
  function expectedRun(a, margin) { return -1.5 + 10 * margin + 5 * (mobility(a) - 0.6); }
  function freshBest(maxAge = 0.9) { let best = null; for (const s of Object.values(qr.seen)) if (t - s.at <= maxAge && s.ready && s.w.reachable && (!best || s.seen.quality > best.seen.quality)) best = s; return best; }
  /** True odds of every developed, reachable receiver right now (for the decision record: forced throws and missed opportunities). */
  function trueBoard(a) { const out = {}; for (const r of routeRunners()) { const w = arrivalWindow(a, r); if (!w.reachable || !routeReady(r, false)) continue; out[r.slot] = +oddsFor(a, r, w, w.m1, w.m2, false).quality.toFixed(3); } return out; }
  /** Every receiver's measured window now (training data): separation, second defender, lane, developed, reachable, quality. */
  function windowsNow(a) { const out = {}; for (const r of routeRunners()) { const w = arrivalWindow(a, r); out[r.slot] = { m1: +Math.min(99, w.m1).toFixed(2), m2: +Math.min(99, w.m2).toFixed(2), lane: w.lane, ready: routeReady(r, false), reachable: w.reachable, air: +w.air.toFixed(1), q: +oddsFor(a, r, w, w.m1, w.m2, false).quality.toFixed(3) }; } return out; }
  /** Act on a decision (or, in the AI Testing Lab's hold mode, only record what the AI would have done). */
  function commit(a, act) {
    const board = trueBoard(a); const vals = Object.entries(board); let bestTrue = vals.reduce((m, [, v]) => Math.max(m, v), -9);
    const trueQ = act.action === 'throw' ? (board[act.slot] ?? +(act.look?.truth.quality ?? 0).toFixed(3)) : null;
    if (trueQ != null) bestTrue = Math.max(bestTrue, trueQ); if (bestTrue < -1) bestTrue = 0; // nothing developed: the best available is nothing
    const missedSlot = act.action === 'throw' ? vals.filter(([k, v]) => k !== act.slot && v >= Math.max(0.5, (trueQ ?? 0) + 0.2)).sort((x, y) => y[1] - x[1])[0]?.[0] || null
      : vals.filter(([, v]) => v >= 0.5).sort((x, y) => y[1] - x[1])[0]?.[0] || null;
    const rec = { action: act.action, slot: act.slot || null, reason: act.reason, read: act.read ?? null, m1: act.look ? +act.look.w.m1.toFixed(2) : null, odds: act.look ? { comp: +act.look.truth.pComp.toFixed(3), int: +act.look.truth.pInt.toFixed(3), air: +act.look.w.air.toFixed(1), dist: +act.look.w.dist.toFixed(1) } : null, m2: act.look ? +Math.min(99, act.look.w.m2).toFixed(2) : null, q: act.look ? +act.look.seen.quality.toFixed(3) : null, trueQ, bestTrueQ: +bestTrue.toFixed(3), board,
      forced: act.action === 'throw' && trueQ != null && trueQ < 0.25, missed: missedSlot, sensed: qr.sensedAt != null, pressured: !!act.pressured, cycles: qr.cycles, lane: act.lane || null, legal: act.legal ?? null, threat: act.threat || null, by: act.by || 'ai' };
    const ctl = options.qb;
    if (rec.by === 'ai' && ctl && (ctl.mode === 'hold' || (ctl.mode === 'human' && t < ctl.at))) { if (!qr.aiWould) qr.aiWould = { t: +t.toFixed(2), ...rec }; return false; }
    qr.decision = { t: +t.toFixed(2), ...rec, windows: windowsNow(a) }; qrLog('decision', { ...rec, board: undefined });
    if (act.action === 'throw') { a.throwRead = act.read ?? 99; throwTo(a, act.r, act.pressured); }
    else if (act.action === 'scramble') scramble(a);
    return true;
  }
  /** False while the AI Testing Lab holds the play for the human (the AI only records what it would do). */
  const aiMayAct = () => !(options.qb && (options.qb.mode === 'hold' || (options.qb.mode === 'human' && t < options.qb.at)));
  function qbDecide(a, { pressured, foresight, rushers, setAt = 0 }) {
    const P = awarenessProfile(a.attrs.awareness);
    if (!qr.order) { qr.order = buildOrder(); qr.pocketAt = t; qr.startY = qr.startY ?? a.y; if (!qr.order.length) return; startLook(a, 0); }
    if (!qr.order.length) return; // no eligible receiver: he holds it (a scramble or a sack ends the play)
    const since = t - qr.pocketAt;
    // The AI Testing Lab's human decision, applied through the normal mechanics.
    const ctl = options.qb;
    if (ctl && ctl.mode === 'human' && !qr.humanDone && t >= ctl.at) {
      qr.humanDone = true; const r = ctl.action === 'throw' ? bySlot.off[ctl.target] : null;
      if (ctl.action === 'throw' && r) { const look = qbLook(a, r, false, 0.0001); commit(a, { action: 'throw', r, slot: r.slot, reason: 'human', look, read: qr.order.indexOf(r.slot), pressured, by: 'human' }); return; }
      if (ctl.action === 'scramble' && !scrambled) { commit(a, { action: 'scramble', reason: 'human', lane: runningLane(a), by: 'human' }); return; }
    }
    // Pressure recognition: an aware passer feels the unblocked rusher sooner.
    // A threat is a free defender closing on him (not a linebacker dropping into coverage); time to hit from his closing speed.
    let threat = null;
    for (const { d, dd } of rushers) { if (!(d.x < -0.3 || ['rush', 'contain'].includes(d.assignment?.a))) continue; const closing = dd > 0 ? (d.vx * (a.x - d.x) + d.vy * (a.y - d.y)) / dd : 0; if (closing < 1.5 && dd > 1.6) continue; const tth = Math.max(0, dd - 0.9) / Math.max(closing, 1.5); if (!threat || tth < threat.tth) threat = { d, dd, tth }; }
    const senseR = P.sense + (a.ability?.pressureSense ? 1.5 : 0);
    const sensed = !!threat && threat.dd < senseR;
    if (sensed && qr.sensedAt == null) { qr.sensedAt = t; const ln = runningLane(a); qrLog('pressure', { by: threat.d.slot, dd: +threat.dd.toFixed(2), lane: ln ? { gain: ln.gain, margin: ln.margin } : null }); }
    const timeToHit = threat ? threat.tth : 9;
    // The rusher is about to arrive: get rid of it, escape, or take the hit.
    if (sensed && timeToHit < 0.3 && threat.dd < 3.4 && t - qr.lastEmergency >= 0.2) {
      qr.lastEmergency = t; if (!qrng.chance(P.react)) return; // frozen: he does not react this time (a lesser passer holds it and takes the hit)
      let best = freshBest(); const bar = acceptBar({ index: 1, cycles: qr.cycles, sincePocket: since, pressure: true }) - 0.08;
      // No fresh look: a hot glance across his receivers (hot routes count as ready); an aware passer picks better.
      if (!best || best.seen.quality < bar) for (const o of routeRunners()) { const lk = qbLook(a, o, true, 1.3); if (lk.w.reachable && (!best || lk.seen.quality > best.seen.quality)) best = lk; }
      const lane = scrambled ? null : runningLane(a); const run = lane ? lane.exp : -9;
      // An open lane beats a weak hot throw; a strong window is still thrown.
      if (run >= 3.2 && (!best || best.seen.quality < bar + 0.15)) { if (commit(a, { action: 'scramble', reason: 'escape', lane })) return; } // the rusher is on him: only a clearly open lane
      if (best && best.seen.quality >= bar && aiMayAct()) qrLog('read', { n: qr.log.filter((e) => e.kind === 'read').length + 1, slot: best.slot, why: 'hot', reason: 'open', q: +best.seen.quality.toFixed(3), trueQ: +best.truth.quality.toFixed(3), bar: +bar.toFixed(3) });
      if (best && best.seen.quality >= bar) { if (commit(a, { action: 'throw', r: best.r, slot: best.slot, reason: 'hot', look: best, read: qr.order.indexOf(best.slot), pressured })) return; }
      // No intentional throw-away (v42.6): with nothing to throw and no lane he holds the ball, and the rusher may get home.
    }
    if (t < qr.lookEnd || t < setAt) return; // still on this read (or still setting his feet)
    // The look ends: judge the read.
    const r = bySlot.off[qr.cur.slot];
    if (r) {
      const look = qbLook(a, r, sensed); qr.seen[r.slot] = look;
      const bar = acceptBar({ index: qr.i, cycles: qr.cycles, sincePocket: since, pressure: sensed });
      const ok = look.ready && look.w.reachable && look.seen.quality >= bar;
      const reason = ok ? 'open' : rejectReason({ ready: look.ready, reachable: look.w.reachable, m1: look.pm1, m2: look.pm2, lane: look.w.lane, quality: look.seen.quality, bar });
      qrLog('read', { n: qr.log.filter((e) => e.kind === 'read').length + 1, slot: r.slot, why: qr.cur.why, reason, q: +look.seen.quality.toFixed(3), trueQ: +look.truth.quality.toFixed(3), bar: +bar.toFixed(3) });
      if (ok) {
        // Whiteout: once per half, the quarterback's first read freezes and he has to move on to the second.
        const frost = qr.i === 0 && qr.order.length > 1 ? defs.find((d) => d.ability?.whiteout && available(d, 'whiteout', 'drive')) : null;
        if (frost && !(options.qb && options.qb.mode !== 'ai')) { spend(frost, 'whiteout', 'drive'); r.vx = 0; r.vy = 0; r.stun = Math.max(r.stun, 0.8); setStatus(r, 'frozen', 0.8); abilityUsed(frost, 'whiteout'); abilityOutcome('read_frozen', frost, `${frost.name}'s Whiteout freezes ${a.name}'s first read`, { victim: a.slot }); startLook(a, 1); return; }
        if (commit(a, { action: 'throw', r, slot: r.slot, reason: qr.i === 0 && qr.cur.why === 'progression' ? 'first_read' : qr.cur.why === 'noticed' ? 'noticed' : qr.cur.why === 'revisit' ? 'revisit' : 'progression', look, read: qr.i, pressured })) return;
      }
      // Locked on: a lesser passer keeps staring at his first read.
      if (qr.i === 0 && qr.locks < 2 && look.ready && qrng.chance(P.lock)) { qr.locks++; qr.cur = { slot: r.slot, why: 'fixed' }; qr.lookEnd = t + P.look; return; }
    }
    // Late in the down: the best he has or a scramble, rather than reading forever (never a throw-away: v42.6).
    if (since > 2.6 + 0.4 * norm(a.attrs.awareness)) {
      const best = freshBest(1.2);
      if (best && best.seen.quality >= 0.22) { if (commit(a, { action: 'throw', r: best.r, slot: best.slot, reason: 'late_best', look: best, read: qr.order.indexOf(best.slot), pressured })) return; }
      const lane = scrambled ? null : runningLane(a);
      if (lane && lane.exp >= 0.5) { if (commit(a, { action: 'scramble', reason: 'nothing_open', lane })) return; }
    }
    // A full pass through the reads with nothing: a mobile passer takes an open lane (never just because the first read is covered).
    if (qr.cycles >= 1 && !scrambled && since > 1.5) {
      const lane = runningLane(a);
      if (lane && lane.exp >= 0.9 && (freshBest()?.seen.quality ?? 0) < 0.5) { if (commit(a, { action: 'scramble', reason: 'lane', lane })) return; }
    }
    // Peripheral vision: an aware passer notices a clearly open receiver who is not his current read.
    if (qrng.chance(P.periph)) {
      let pick = null; for (const o of routeRunners()) { if (o.slot === qr.cur?.slot) continue; const lk = qbLook(a, o, sensed, 1.4); if (lk.ready && lk.w.reachable && (!pick || lk.seen.quality > pick.seen.quality)) pick = lk; }
      const bar = acceptBar({ index: 1, cycles: qr.cycles, sincePocket: since, pressure: sensed });
      if (pick && pick.seen.quality >= bar + 0.12) { qrLog('read', { n: qr.log.filter((e) => e.kind === 'read').length + 1, slot: pick.slot, why: 'periph', reason: 'noticed', q: +pick.seen.quality.toFixed(3), trueQ: +pick.truth.quality.toFixed(3), bar: +bar.toFixed(3) }); qr.order.indexOf(pick.slot) >= 0 && startLook(a, qr.order.indexOf(pick.slot), 'noticed', true); return; }
    }
    // Next read; after the last, start again from the best he has seen (revisiting an earlier read).
    if (qr.i + 1 < qr.order.length && qr.cur?.why !== 'revisit') { startLook(a, qr.i + 1, 'progression', bySlot.off[qr.order[qr.i + 1]] && !routeReady(bySlot.off[qr.order[qr.i + 1]], sensed)); return; }
    qr.cycles++;
    const best = freshBest(1.5); const back = best ? qr.order.indexOf(best.slot) : 0;
    startLook(a, back >= 0 ? back : 0, 'revisit');
  }
  function throwTo(passer, r, pressured) {
    // Wind-up: the ball leaves the hand a beat later; a rusher can still get home.
    if (!passer.windup) { passer.windup = { r, pressured, at: t + 0.14 + 0.1 * (1 - norm(passer.attrs.arm)) }; return; }
    passer.windup = null;
    // On a screen the rushers who were let through have run themselves past the play: they need a moment to turn around.
    if (screenPlay) for (const d of defs) if (!d.engaged && d.stun <= 0 && d.x < -1 && ['rush', 'contain'].includes(d.assignment?.a)) { d.stun = 0.45; setStatus(d, 'turned', 0.45); }
    const d = dist(passer, r);
    let acc = passer.attrs.accuracy, arm = passer.attrs.arm;
    // The lead (v42.8, attribute audit fix 1): where the receiver will be when the ball ARRIVES, so the flight time and the
    // landing spot agree. The old lead used the distance to where he stood (plus a tenth), shorter than the ball's real flight,
    // so a fast receiver ran past the ball. Iterated: flight to the current guess → his spot at that time → flight to that spot.
    const leadFor = (armNow) => {
      const v = (17 + 13 * norm(armNow)) * (passer.ability?.thunderclap ? 1 + passer.ability.thunderclap.faster : 1);
      let lead = { x: r.x, y: r.y };
      for (let k = 0; k < 3; k++) lead = predictReceiver(r, Math.hypot(lead.x - passer.x, lead.y - passer.y) / v);
      return lead;
    };
    let lead = leadFor(arm);
    if (passer.ability?.deepThrow && lead.x - passer.x >= 15) { acc += passer.ability.deepThrow.accuracy; arm += passer.ability.deepThrow.arm; abilityUsed(passer, 'deepThrow'); lead = leadFor(arm); }
    if (passer.ability?.openAccuracy && !defs.some((d) => dist(d, lead) < 2)) { acc += passer.ability.openAccuracy; abilityUsed(passer, 'openAccuracy'); }
    if (passer.ability?.throwVelocity) { arm = Math.min(99, arm * (1 + passer.ability.throwVelocity)); abilityUsed(passer, 'throwVelocity'); lead = leadFor(arm); }
    const airD = lead.x - passer.x;
    const deepK = airD > 20 ? 1 + (airD - 20) * 0.03 : 1; // the deep ball is the hardest throw in football
    // Landing error, recalibrated with the corrected lead (v42.8): the old under-led ball hid about a third of the miss, so the
    // base error is ×1.45 to keep representative ability-enabled games near 65% completion. Accuracy's share of it is unchanged.
    const err = 1.45 * (1.2 + d * 0.07) * deepK * (1.3 - norm(acc)) * (pressured ? 1.5 : 1) * (Math.hypot(passer.vx, passer.vy) > 1 ? 1.2 : 1);
    const landing = { x: lead.x + rng.normal() * err * 0.7, y: lead.y + rng.normal() * err };
    landing.x = clamp(landing.x, B.ownEndLine + 0.5, B.endLine - 0.3);
    landing.y = clamp(landing.y, B.left - 1.5, B.right + 1.5);
    ball.inAir = true; ball.holder = null; ball.from = { x: passer.x, y: passer.y }; ball.to = landing; ball.landing = landing;
    ball.flightTime = Math.hypot(landing.x - passer.x, landing.y - passer.y) / (17 + 13 * norm(arm)); ball.flight = 0; ball.target = r;
    ball.aim = { x: lead.x, y: lead.y }; ball.thrownAt = t; // where the throw is meant to go (the receiver's path), for the defenders' read (v42.10)
    ball.airYards = landing.x;
    // Thunderclap: the ball arrives 15% faster, and quick passes cannot be broken up by a trailing defender.
    ball.thunder = !!passer.ability?.thunderclap; ball.quick = (r.assignment?.a === 'route' && QUICK_ROUTES.has(r.assignment.r)) || airD < 10;
    if (ball.thunder) { ball.flightTime /= 1 + passer.ability.thunderclap.faster; abilityUsed(passer, 'thunderclap'); }
    // Sovereign Arm: a throw on the first read cannot be intercepted; +10 Arm and Accuracy in the fourth quarter.
    ball.sovereign = !!passer.ability?.sovereign && (passer.throwRead ?? 0) === 0;
    if (passer.sovereignQ4) abilityUsed(passer, 'sovereign');
    // Tailwind: deep passes land softer.
    ball.tailwind = !!passer.ability?.tailwind && airD >= 15; if (ball.tailwind) abilityUsed(passer, 'tailwind');
    // Undertow: deep throws into his half of the field.
    ball.undertow = airD >= 15 ? defs.find((d) => d.ability?.undertow && (Math.abs(d.y) < 1 || Math.sign(d.y) === Math.sign(landing.y))) || null : null;
    phase = 'air'; stats.passer = passer.slot; stats.target = r.slot; stats.airYards = Math.round(landing.x);
    for (const def of defs) def.recognisedPass = true;
    log(`${passer.name} throws to ${r.name}${pressured ? ' under pressure' : ''}`, { kind: 'throw', target: r.slot, pressured });
  }
  function scramble(a) {
    scrambled = true; phase = 'carry'; ball.holder = a; stats.carrier = a.slot; a.laneTimer = 0; a.jukeCooldown = 0;
    for (const def of defs) { def.recognised = true; }
    log(`${a.name} scrambles`, { kind: 'scramble' });
  }

  /** Ancient Grove: the grove monster within his radius of `d` (himself included), or null. Defenders he guards never bite on play action or misdirection. */
  function groveGuards(d) { for (const g of actors) if (g.team === d.team && g.ability?.grove && dist(g, d) <= g.ability.grove.radius) return g; return null; }
  /** Quake Step: a cut makes every defender within 2 yards stumble (-20% to tackle him) for 0.6 s. */
  function quake(c) {
    if (t - (c.lastQuake ?? -9) < 0.6) return; c.lastQuake = t; let hit = false;
    for (const d of opponents(c.team)) if (dist(d, c) <= 2) { d.quakeUntil = t + 0.6; setStatus(d, 'stumble', 0.6); hit = true; }
    if (hit) abilityUsed(c, 'quakeStep');
  }
  const deepRoute = (r) => r?.assignment?.a === 'route' && (r.assignment.points?.[r.assignment.points.length - 1]?.[0] ?? 0) >= 15;
  const zoneRadius = (asg, d = null) => (asg.role === 'deep' ? 12 : asg.role === 'middle' ? 7.5 : 7) + (d?.ability?.zoneRange || 0);
  const inZoneArea = (asg, p) => { const [zx, zy] = asg.at || [0, 0]; return asg.role === 'deep' ? Math.abs(p.y - zy) < zoneRadius(asg) && p.x > 5 : Math.hypot(p.x - zx, p.y - zy) < zoneRadius(asg); };
  /** Defenders covering a receiver right now: his man defender, plus zone defenders on his hip. */
  const coveringDefs = (r) => defs.filter((d) => !d.engaged && ((d.assignment?.a === 'man' && bySlot.off[manKeys[d.assignment.key]] === r) || (d.assignment?.a === 'zone' && dist(d, r) < 3)));

  // ------------------------------------------------------------ defense behaviour
  /**
   * Pursuit effort (v42.13). A pursuer runs at 1.05 × his top speed, and a ball carrier at 0.94 × his (carrying the ball costs a
   * little speed): the engine's original balance, on which completion, yards after the catch and scoring are calibrated, and it
   * still holds wherever a pursuer meets the carrier from the side or in front, or chases one who is no faster than he is. What
   * changed: in a straight-line race (the pursuer trailing the carrier along the carrier's own direction of travel, the carrier
   * running), the extra effort fades as the carrier's top speed exceeds his own and is gone at half a yard per second (about 12
   * Speed points), so the faster monster's Speed decides and he pulls away. "Trailing" is judged from the carrier's actual
   * movement, not field position, so it holds on lateral runs, reversals, scrambles and returns the other way. Both judgements are
   * graded, not switched, so effort changes smoothly when the carrier cuts or a pursuer swings from behind to his side:
   *   behind = 0 at 120° or less off the carrier's heading, 1 at 150° or more (directly behind is 180°);
   *   running = 0 below 2.5 yd/s (a carrier barely moving has no heading to race along), 1 from 5 yd/s.
   * The quarterback in his pocket is chased exactly as before.
   */
  const chaseFromBehind = (d, c) => chaseWeight(d.x - c.x, d.y - c.y, c.vx, c.vy);
  function pursuitEffort(d, c) {
    if (c === qb && phase !== 'carry') return PURSUIT_EFFORT; // the pass rush: unchanged
    return effortFor(chaseFromBehind(d, c), c.maxSpeed, d.maxSpeed);
  }
  function pursue(d) {
    const c = ball.holder;
    if (!c) return;
    // True intercept point for the carrier's current velocity; awareness blends it with plain chasing.
    // Effort eases toward its target by at most 0.01 a tick (the whole 0.05 swing takes a quarter second), so a cut by the carrier
    // or a pursuer swinging from his side to behind him never changes a defender's pace abruptly.
    let effort = pursuitEffort(d, c);
    if (d.effortT != null && t - d.effortT < DT * 1.5) effort = d.effort + clamp(effort - d.effort, -0.01, 0.01);
    d.effort = effort; d.effortT = t; const vp = d.maxSpeed * effort;
    const rx = c.x - d.x, ry = c.y - d.y;
    const a2 = c.vx * c.vx + c.vy * c.vy - vp * vp, b2 = 2 * (rx * c.vx + ry * c.vy), c2 = rx * rx + ry * ry;
    let tInt = null;
    if (Math.abs(a2) < 1e-6) { if (Math.abs(b2) > 1e-6) tInt = -c2 / b2; }
    else { const disc = b2 * b2 - 4 * a2 * c2; if (disc >= 0) { const r1 = (-b2 - Math.sqrt(disc)) / (2 * a2), r2 = (-b2 + Math.sqrt(disc)) / (2 * a2); tInt = [r1, r2].filter((v) => v > 0).sort((p, q) => p - q)[0] ?? null; } }
    const dir = c.team === 'off' ? 1 : -1;
    let tx, ty;
    if (tInt !== null && tInt < 8) { tx = c.x + c.vx * tInt; ty = c.y + c.vy * tInt; }
    else { tx = c.x + dir * 12; ty = c.y; } // cannot catch him: cut toward his path ahead
    const aw = 0.45 + 0.55 * norm(d.attrs.awareness);
    const chaseLead = clamp(dist(d, c) / vp, 0, 1) ;
    const ax = aw * tx + (1 - aw) * (c.x + c.vx * chaseLead), ay = aw * ty + (1 - aw) * (c.y + c.vy * chaseLead);
    if (TRACE) { // developer trace only (Defensive scenario Lab): what this pursuit is made of
      const toC = Math.atan2(c.y - d.y, c.x - d.x), toAim = Math.atan2(ay - d.y, ax - d.x);
      d.pursuitInfo = { car: c.slot, carSpeed: c.attrs.speed, defSpeed: d.attrs.speed, effort: +effort.toFixed(3), carry: CARRY_PACE, gap: +dist(d, c).toFixed(2),
        angle: Math.round(Math.abs(Math.atan2(Math.sin(toAim - toC), Math.cos(toAim - toC))) * 180 / Math.PI), intercept: tInt !== null && tInt < 8, lead: +aw.toFixed(2), agility: c.attrs.agility,
        behind: +chaseFromBehind(d, c).toFixed(2) }; d.pursuitAt = t;
    }
    steer(d, ax, ay, effort, 0.2);
  }
  function trailPosition(d, target) {
    let delay = 0.4 - 0.3 * norm(d.attrs.coverage + (d.ability?.manCoverage || 0)) - reactionOf(d); if (d.ability?.manCoverage) abilityUsed(d, 'manCoverage');
    if (d.ability?.heatHaze && deepRoute(target)) { delay -= d.ability.heatHaze; abilityUsed(d, 'heatHaze'); } // Heat Haze: deep routes lose 0.15 s of separation on him
    const h = history.get(target);
    const idx = Math.max(0, h.length - 1 - Math.round(delay / DT));
    const p = h[idx] || target;
    return p;
  }
  /** The receiver's velocity as the defender sees it (v42.8, attribute audit fix 2): from the same delayed trail, over the
   * last 0.15 s before that moment. Observable movement only, never his route or his true velocity this tick. */
  function observedVelocity(d, target) {
    let delay = 0.4 - 0.3 * norm(d.attrs.coverage + (d.ability?.manCoverage || 0)) - reactionOf(d); if (d.ability?.heatHaze && deepRoute(target)) delay -= d.ability.heatHaze;
    const h = history.get(target); const i1 = Math.max(0, h.length - 1 - Math.round(delay / DT)), i0 = Math.max(0, i1 - 2);
    if (i1 <= i0 || !h[i1] || !h[i0]) return { vx: 0, vy: 0 };
    return { vx: (h[i1].x - h[i0].x) / ((i1 - i0) * DT), vy: (h[i1].y - h[i0].y) / ((i1 - i0) * DT) };
  }
  // Reading the throw (v42.10, defensive audit fix 2). A defender no longer knows where the ball will come down the moment it
  // leaves the hand. He first has to see the release: Awareness (reading the quarterback) and Coverage (playing the ball) shorten
  // that, and a man defender whose man is not the target, with his eyes on his man, sees it a beat later. Then he reads the
  // flight: early on the ball looks headed where it was meant to go (the receiver's path); as it travels its real landing spot
  // becomes clear, sooner for an aware, ball-skilled defender. A ball thrown off target therefore fools defenders as it fools the
  // receiver, and a perfect throw is read correctly once it is seen. Deterministic: no dice are drawn.
  function ballReaction(d) {
    const asg = d.assignment; const eyesOnMan = asg.a === 'man' && bySlot.off[manKeys[asg.key]] !== ball.target;
    return Math.max(0.05, 0.32 - 0.12 * norm(d.attrs.awareness) - 0.12 * norm(d.attrs.coverage) + (eyesOnMan ? 0.08 : 0) - reactionOf(d));
  }
  function perceivedLanding(d) {
    const A = ball.aim || ball.landing, L = ball.landing;
    const span = 0.85 - 0.3 * norm(d.attrs.awareness) - 0.2 * norm(d.attrs.coverage); // share of the flight before the spot is clear
    const w = clamp((ball.flight / Math.max(0.05, ball.flightTime)) / Math.max(0.2, span), 0, 1);
    return { x: A.x + (L.x - A.x) * w, y: A.y + (L.y - A.y) * w };
  }
  // ---- Zone reading (v42.12, zone intelligence) ----
  /** A zone defender's perception delay: Coverage (tracking receivers is technique, as in man coverage) and Awareness (reading).
   * 0.21 s at 50/65, 0.15 s at 65/65, 0.06 s at 95/65 (0.25 / 0.20 / 0.11 s through trailPosition before v42.12, which also gave him
   * the receiver's TRUE velocity; that was most of what a high-Coverage zone defender had over a low one, so the delay now carries
   * more of the Coverage difference: v42.12 audit fix 8). The man coverage ability and Heat Haze keep the effect they had through
   * trailPosition, which zone defenders used before v42.12; the activation is recorded only when he actually plays the receiver
   * (mark), as before, not for every receiver he glances at. */
  function zoneDelay(d, r, mark = false) {
    let delay = 0.45 - 0.33 * norm(d.attrs.coverage + (d.ability?.manCoverage || 0)) - 0.12 * norm(d.attrs.awareness) - reactionOf(d); if (mark && d.ability?.manCoverage) abilityUsed(d, 'manCoverage');
    if (d.ability?.heatHaze && deepRoute(r)) { delay -= d.ability.heatHaze; if (mark) abilityUsed(d, 'heatHaze'); }
    return Math.max(0, delay);
  }
  /** What a zone defender sees of a receiver: his position and velocity a perception delay ago (never this tick's truth). */
  function zoneObserve(d, r) {
    const h = history.get(r); const delay = zoneDelay(d, r);
    // He judges direction from the last stretch of what he has seen: a short, fresh window when he reads routes well (Coverage
    // technique and Awareness), a longer one, slower to show a break, when he does not (0.05 s at 95/95, about 0.2 s at 50/50).
    const win = Math.max(1, Math.round((0.05 + 0.3 * (1 - 0.5 * norm(d.attrs.coverage) - 0.5 * norm(d.attrs.awareness))) / DT));
    const i1 = Math.max(0, h.length - 1 - Math.round(delay / DT)), i0 = Math.max(0, i1 - win); const p1 = h[i1] || r, p0 = h[i0] || p1;
    const dt = (i1 - i0) * DT; const pf = h[Math.max(0, i1 - 1)] || p1; // and the latest step he has seen: a receiver throttling down shows at once
    return { x: p1.x, y: p1.y, vx: dt > 0 ? (p1.x - p0.x) / dt : 0, vy: dt > 0 ? (p1.y - p0.y) / dt : 0, vxLast: i1 > 0 ? (p1.x - pf.x) / DT : 0 };
  }
  const hash01 = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10007) / 10007; };
  // ---- The run read (v42.14, Phase A: run-defense intelligence) ----
  // Every defender keeps a belief, from -1 (pass) to +1 (run), built ONLY from what he can see: the linemen firing forward or
  // setting back, the quarterback dropping or staying at the mesh, a back meeting the quarterback, the ball seen in a back's
  // hands, a back leaving the mesh without it, the quarterback running forward. He sees positions a perception delay ago
  // (shorter with Awareness and the reaction abilities), re-reads at an interval set by Awareness and moves his belief toward
  // what the cues say at a rate set by Awareness. The offense's play call, its type, a play-action designation, a misdirection tag
  // and any player's assignment are never read here (tests/run-read.test.js). Per-defender offsets come from a hash of the seed
  // and his slot, so nothing is drawn from the random stream: the same seed replays the same play, with or without the trace.
  // He commits to the run at READ.run (a man defender or a deep defender at READ.runStrict) and lets go of it READ.release lower,
  // so a play-action fake can pull him up and the quarterback's drop can send him back.
  const READ = Object.freeze({ run: 0.45, runStrict: 0.6, pass: -0.35, release: 0.1, conceal: 0.08 });
  const OL_SLOTS = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
  let lineGroup = null, backGroup = null;
  /** The blockers he reads: the offensive line and an inline tight end, by where they lined up (visible before the snap). */
  const lineOf = () => (lineGroup ||= offs.filter((a) => { const s = snapPos.get(a); return a !== qb && s && (OL_SLOTS.has(a.slot) || (a.slot.startsWith('TE') && s.x > -1.6 && Math.abs(s.y) < 5.5)); }));
  /** The backs: anyone but the quarterback who lined up in the backfield. */
  const backsOf = () => (backGroup ||= offs.filter((a) => { const s = snapPos.get(a); return a !== qb && s && s.x < -2.5; }));
  /** Where he SAW a player `delay` seconds ago (from the movement history; at the snap, where the player lined up). */
  function seenOf(a, delay) { const h = history.get(a); const i = h.length - 1 - Math.round(delay / DT); return i >= 0 ? h[i] : (snapPos.get(a) || a); }
  function seenVel(a, delay) { const h = history.get(a); const i1 = h.length - 1 - Math.round(delay / DT); if (i1 < 1) return { vx: 0, vy: 0 }; const i0 = Math.max(0, i1 - 2); const dt = (i1 - i0) * DT; return { vx: (h[i1].x - h[i0].x) / dt, vy: (h[i1].y - h[i0].y) / dt }; }
  /** His perception delay: Awareness and the reaction abilities shorten it; a fixed per-defender offset (hash of seed and slot). */
  const readDelay = (d) => Math.max(0.02, 0.22 - 0.14 * norm(d.attrs.awareness) - reactionOf(d) + (hash01(`${seed}|${d.slot}|delay`) - 0.5) * 0.08);
  const readEvery = (d) => 0.30 - 0.18 * norm(d.attrs.awareness);
  /** Defensive backs, man defenders and deep defenders need stronger evidence before they give up pass responsibilities. */
  const isDB = (d) => /^(CB|FS|SS)/.test(d.slot);
  const strictRead = (d) => d.assignment.a === 'man' || (d.assignment.a === 'zone' && d.assignment.role === 'deep') || isDB(d);
  // What the defensive call has him expect at the snap (Phase A stage 2): the coordinator's expectation, never what the offense
  // called. Goal line +0.5, run fronts +0.35, prevent and long-yardage calls -0.3, balanced, man and blitz calls 0, other zone
  // calls -0.15; deep defenders start a further 0.25 toward pass.
  const RUN_CALL = defensePlay.tags.includes('run') || defensePlay.tags.includes('goalline');
  const GOAL_LINE = defensePlay.tags.includes('goalline'); // goal-line fronts penetrate once they read run (get-off), run fronts hold
  const CALL_PRIOR = defensePlay.tags.includes('goalline') ? 0.5 : defensePlay.tags.includes('run') ? 0.35
    : (defensePlay.tags.includes('prevent') || defensePlay.tags.includes('long')) ? -0.3
    : ['blitz', 'man', 'balanced'].some((k) => defensePlay.tags.includes(k)) ? 0 : defensePlay.tags.includes('zone') ? -0.15 : 0;
  function readPrior(d) { return CALL_PRIOR + (d.assignment.a === 'zone' && d.assignment.role === 'deep' ? -0.25 : 0); }
  /** How far his read leans run: 0 at the pass threshold or below, 1 when committed. Where a reading linebacker stands. */
  const readLean = (d) => (d.read ? clamp((d.read.b - READ.pass) / (READ.run - READ.pass), 0, 1) : 0);
  /** A linebacker's run fit before the handoff (Phase A stage 2). Depth: read depth, closer on a run call. Width: he keys the
   * near back he SEES (the back closest to the quarterback, or the carrier) and moves with that back's flow (how far the back
   * has moved from where he lined up, and where he is heading), from his own alignment pulled 40% toward the middle (a reading
   * linebacker plays inside his gap). A back or a quarterback flowing out toward his side does not pull him more than a yard
   * inside his alignment (he keeps outside leverage). Never toward a gap he has not seen chosen. */
  const FIT = Object.freeze({ squeeze: 0.4, lead: 0.7, leverage: 1 });
  function readFit(d) {
    const delay = readDelay(d), sp = snapPos.get(d), h = ball.holder, q = seenOf(qb, delay);
    const key = h && h.team === 'off' && h !== qb ? h : backsOf().map((b) => ({ b, p: seenOf(b, delay) })).sort((u, v) => Math.hypot(u.p.x - q.x, u.p.y - q.y) - Math.hypot(v.p.x - q.x, v.p.y - q.y))[0]?.b || qb;
    const p = seenOf(key, delay), v = seenVel(key, delay), ks = snapPos.get(key) || p;
    let y = sp.y * (1 - FIT.squeeze) + clamp(p.y - ks.y + v.vy * FIT.lead, -4, 4);
    const qv = seenVel(qb, delay); const toward = (a, av) => Math.abs(av.vy) > 0.5 && av.vy * (sp.y - a.y) > 0;
    if (toward(p, v) || toward(q, qv)) y = sp.y > 0 ? Math.max(y, sp.y - FIT.leverage) : Math.min(y, sp.y + FIT.leverage);
    return { x: Math.max(RUN_CALL ? 1.5 : 2.0, sp.x - (RUN_CALL ? 2.0 : 1.0)), y };
  }
  /** The cues he sees now, and the evidence they add up to (-1 pass .. +1 run). */
  function readCues(d, R) {
    const delay = readDelay(d), aw = norm(d.attrs.awareness);
    const sq = snapPos.get(qb), q = seenOf(qb, delay), qv = seenVel(qb, delay);
    // The line: firing forward (run blocking) or setting back (pass protection), and the way it flows.
    const L = lineOf(); let fwd = 0, lat = 0; for (const a of L) { const s = snapPos.get(a), p = seenOf(a, delay); fwd += clamp((p.x - s.x) / 0.3, -1, 1); lat += p.y - s.y; }
    const line = L.length ? fwd / L.length : 0, lineFlow = L.length ? lat / L.length : 0;
    const wLine = t < 0.6 ? 0.45 : Math.max(0.2, 0.45 - (t - 0.6) * 0.5);
    // The quarterback: a drop past a yard says pass; staying near the line leans run; running forward says run. A quarterback
    // stepping back to meet a back coming at him (a handoff, or a fake) is not a drop: while a back is converging on him the depth
    // says nothing, and on play-action the drop speaks once the back has left the mesh.
    const drop = sq.x - q.x; let qbCue = clamp((0.5 - drop) / 1.0, -1, 0.4); const wQb = 0.35 + 0.25 * Math.min(1, t / 0.6);
    const converging = backsOf().some((b) => { const p = seenOf(b, delay), v = seenVel(b, delay), dq = Math.hypot(p.x - q.x, p.y - q.y); return dq < 2.5 && ((q.x - p.x) * v.vx + (q.y - p.y) * v.vy) / (dq || 1) > 0.8; });
    if (converging) qbCue = Math.max(qbCue, 0);
    const qbRun = (q.x > sq.x + 0.6 && qv.vx > 1.5) || (phase === 'carry' && ball.holder === qb && qv.vx > 1.0);
    // The backs: the mesh, the ball seen in a back's hands (the mesh hides it a moment longer), a back leaving without it.
    const h = ball.holder;
    const handSeen = handoffAt <= t - delay - READ.conceal || keepAt <= t - delay - READ.conceal
      || (phase === 'carry' && h && h.team === 'off' && seenOf(h, delay).x > 0.5); // a carrier seen past the line
    let mesh = false, release = false, backFlow = 0, nearest = Infinity;
    for (const b of backsOf()) {
      const p = seenOf(b, delay), v = seenVel(b, delay), s = snapPos.get(b), dq = Math.hypot(p.x - q.x, p.y - q.y);
      if (dq < nearest) { nearest = dq; backFlow = p.y - s.y; }
      const closing = ((q.x - p.x) * v.vx + (q.y - p.y) * v.vy) / (dq || 1); // how fast he comes at the quarterback
      if ((dq < 1.5 && Math.hypot(v.vx, v.vy) > 1 && v.vx > -0.5) || (dq < 2.5 && closing > 0.8)) { mesh = true; if (dq < 1.5) R.sawMesh = true; }
      if (!handSeen && (p.x > 0.5 || (R.sawMesh && dq > 2.2) || (t > 0.5 && Math.abs(p.y - q.y) > 4 && v.vx > -0.5))) release = true;
    }
    // A fake he is protected from (Ancient Grove, the no-bite effect): he reads the mesh like anyone, but the moment the fake shows
    // (updateRead) the mesh stops holding him, so a play-action fake never keeps him; and the misdirection lean never moves him. Echo Read: the mesh counts half as much in his read and the back leaving without the
    // ball counts twice: he commits to a run fake far less often (13% vs 66% of fakes, same seeds); how far he comes up on the fake
    // and how fast he lets go once he sees the back leave are unchanged.
    const rooted = groveGuards(d); const guarded = !!(rooted || d.ability?.noPlayActionBite);
    let wMesh = mesh && !handSeen ? 0.6 : 0, wRelease = release ? 0.5 : 0;
    if ((wMesh || wRelease) && !guarded && d.ability?.echoRead) {
      wMesh *= d.ability.echoRead; wRelease /= d.ability.echoRead;
      if (R.sawMesh && release) abilityUsed(d, 'echoRead'); // logged when he reads a fake (the back leaving the mesh without the ball), not on every mesh
    }
    // A man defender reads his own man: a tight end or back who fires out into a block (engaged and driving forward) is a run
    // key; one who sets back to protect is not (blocking engagement is visible, nothing about the play call is read).
    let manKey = false;
    if (d.assignment.a === 'man') { const m = bySlot.off[manKeys[d.assignment.key]]; if (m && m.engaged) { const ms = snapPos.get(m), mp = seenOf(m, delay); manKey = !!ms && mp.x > ms.x + 0.4; } }
    // A run front's expectation stays in the evidence as a standing term, so early, weak cues do not wash it out; it fades as the
    // play shows itself (gone at 0.8 s), so a pass is still read as a pass.
    const prior = readPrior(d), W0 = prior > 0 ? Math.max(0, 1 - t / 0.8) : 0;
    let num = W0 * prior + wLine * line + wQb * qbCue + wMesh + (manKey ? 1 : 0) - wRelease + (qbRun ? 2 : 0) + (handSeen ? 3 : 0);
    const den = W0 + wLine + wQb + wMesh + (manKey ? 1 : 0) + wRelease + (qbRun ? 2 : 0) + (handSeen ? 3 : 0);
    // Misdirection: the line flowing one way while the back goes the other is harder to read (unless he is guarded from fakes).
    const conflict = !guarded && Math.abs(lineFlow) > 0.25 && Math.abs(backFlow) > 0.4 && Math.sign(lineFlow) !== Math.sign(backFlow);
    // Without the mesh: what the line, the quarterback and the rest say (a guarded defender commits only on this).
    const E0 = den - wMesh > 0 ? clamp((num - wMesh) / (den - wMesh), -1, 1) : 0;
    return { E: clamp(num / den, -1, 1), E0, guarded, rooted, drop, line: +line.toFixed(2), qb: +qbCue.toFixed(2), mesh, manKey, release, handSeen, qbRun, lineFlow, backFlow, conflict, delay: +delay.toFixed(2), aw };
  }
  /** A catch or a scramble: visible the moment it happens, and (as before v42.14) every defender turns to the ball carrier at once
   * (catch and scramble also mark recognised directly). Only designed runs are read through the cues. */
  function visibleCarry() {
    const h = ball.holder;
    return phase === 'carry' && !!h && h.team === 'off' && (h.caughtAt != null || (h === qb && scrambled));
  }
  /** One tick of his read: re-read on his own clock, move the belief, commit to or let go of the run. */
  function updateRead(d) {
    const R = (d.read ||= { b: readPrior(d), next: hash01(`${seed}|${d.slot}|phase`) * readEvery(d), committed: false, sawMesh: false, cues: null });
    if (visibleCarry()) { R.b = 1; R.committed = true; d.recognised = true; return R; }
    if (t + 1e-9 >= R.next) {
      const c = readCues(d, R); const every = readEvery(d); R.cues = c;
      while (R.next <= t + 1e-9) R.next += every; // on his own clock: the schedule carries the remainder, so the average interval is exactly `every` (no 0.05 s tick steps)
      const kappa = (3 + 3 * norm(d.attrs.awareness)) * (c.conflict ? 0.6 : 1);
      R.b = clamp(R.b + Math.min(1, kappa * every) * (c.E - R.b), -1, 1);
    }
    const th = strictRead(d) ? READ.runStrict : READ.run;
    R.committed = R.committed ? R.b >= th - READ.release : R.b >= th;
    // Ancient Grove / no-bite: once the fake shows (the quarterback seen dropping with the ball, or the back leaving without it),
    // the mesh no longer holds him: unless the rest of the evidence carries him by itself, he lets go at once.
    const c = R.cues; if (R.committed && c?.guarded && !c.handSeen && !c.qbRun && (c.drop > 0.8 || c.release) && c.E0 < th) {
      R.committed = false; if (c.rooted) abilityUsed(c.rooted, 'grove'); if (d.ability?.noPlayActionBite) abilityUsed(d, 'noPlayActionBite');
    }
    d.recognised = R.committed;
    return R;
  }
  /** The play has shown pass to HIM: the ball is in the air, or the quarterback still has it and his read says pass. */
  const passShown = (d) => ball.inAir || (ball.holder === qb && phase !== 'carry' && (d.read ? d.read.b : readPrior(d)) <= READ.pass);
  const deepHelp = defs.some((x) => x.assignment?.a === 'zone' && x.assignment.role === 'deep');
  const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  /** What a defender sees of the quarterback's facing: its direction a perception delay ago (0.11 s at Awareness 50, 0.07 s at 95),
   * whether it is a throwing motion, and how long it has held that direction (a stare, or a glance). */
  function seenFacing(aw) {
    const i = facingHist.length - 1 - Math.round((0.15 - 0.08 * aw) / DT); const e = facingHist[i]; if (!e) return null;
    let k = i; while (k > 0 && facingHist[k - 1] && Math.abs(wrapA(facingHist[k - 1].ang - e.ang)) < 0.12) k--;
    return { ang: e.ang, windup: e.windup, held: (i - k) * DT, qx: e.qx, qy: e.qy, back: facingHist.length - 1 - i };
  }
  /** How squarely the quarterback faced a receiver: 1 straight at him, 0 beyond about 13 degrees; two receivers on one line share it.
   * Everything is taken from the SAME moment, the one the defender is seeing: the facing, where the quarterback stood, and where
   * the receiver was then (his position trail), never the quarterback's position now against a facing from an instant ago. */
  const facingCue = (f, r) => { if (!f) return 0; const h = history.get(r); const p = h[h.length - 1 - f.back] || r; return clamp(1 - Math.abs(wrapA(Math.atan2(p.y - f.qy, p.x - f.qx) - f.ang)) / 0.22, 0, 1); };
  /**
   * Which receiver a zone defender plays. Candidates are the receivers he SEES inside his zone, or about to enter it. Each is
   * weighed by: where he is relative to the zone and its depth (a deep defender plays the deepest threat and does not come up for
   * an underneath receiver while a deep one is there; an underneath defender plays his depth band and hands a receiver who runs
   * past it to the deep help), whether he is entering, settling or leaving, how close he is, how open he is (the danger of the
   * window), whether a teammate already has him (aware defenders see it), the quarterback's eyes and throwing motion (read with
   * Awareness), and the defender's current man (he does not switch for a marginal gain). Low Awareness judges these less
   * accurately (a steady misjudgement, not dice) and re-reads less often, so he recognises combinations late and sometimes plays
   * the wrong man; high Awareness reads quickly and well but still only from what is visible. Two near-equal threats inside an
   * underneath zone are an overload: he plays between them, leaning to the bigger one, and can still be beaten by either.
   */
  function zoneRead(d, asg, radius) {
    const aw = norm(d.attrs.awareness); const [zx, zy] = asg.at; const role = asg.role; const center = { x: zx, y: zy };
    const inside = (o) => (role === 'deep' ? Math.abs(o.y - zy) < radius && o.x > 5 : dist(o, center) < radius);
    const edgeGap = (o) => (role === 'deep' ? Math.abs(o.y - zy) - radius : dist(o, center) - radius);
    // Pass key: he anticipates receivers coming into his zone only once the play shows pass TO HIM (his run read, v42.14: the line
    // setting back and the quarterback dropping with the ball). On a run, or while a play-action fake still has him, he plays
    // only who is already in his zone.
    const passKey = passShown(d);
    const cands = [];
    for (const s of receivers) {
      const r = bySlot.off[s]; if (!r) continue; if (r.engaged) continue; // a back or tight end blocking is not a receiver
      // A back still behind the line is a receiver once he is SEEN releasing: moving quickly, away from the quarterback (v42.14:
      // was his route assignment, which the defense cannot see).
      if (r.x <= -1) { const rv = observedVelocity(d, r); if (!(Math.hypot(rv.vx, rv.vy) > 2.5 && Math.hypot(r.x - qb.x, r.y - qb.y) > 2)) continue; }
      const o = zoneObserve(d, r); if (o.x <= -1) continue;
      const toC = { x: zx - o.x, y: zy - o.y }; const tl = Math.hypot(toC.x, toC.y) || 1; const vin = (o.vx * toC.x + o.vy * toC.y) / tl; // speed toward the zone centre
      const isIn = inside(o); const entering = passKey && !isIn && edgeGap(o) < 1.5 + 4 * aw && vin > 1.5; if (!isIn && !entering) continue; // an aware defender sees a receiver coming from further out, once the quarterback shows pass
      const leaving = isIn && vin < -2 && edgeGap(o) > -2.5;
      cands.push({ r, slot: s, obs: o, isIn, entering, leaving });
    }
    const inZone = cands.filter((c) => c.isIn).map((c) => c.slot);
    if (!cands.length) { d.zoneTgt = null; return { pick: null, inZone }; }
    // He re-reads on his cadence; the quarterback's throwing motion to another receiver in his area, once he reads it, or losing
    // his receiver forces a read.
    // The quarterback is read only from what shows: where he faces (seenFacing) and his throwing motion, after the defender's
    // perception delay, and only as a direction (receivers on the same line share the cue). His read and his choice stay hidden.
    const seen = ball.holder === qb ? seenFacing(aw) : null; const windupSeen = !!seen?.windup;
    for (const c of cands) c.cue = facingCue(seen, c.r);
    const windupOther = windupSeen && cands.some((c) => c.cue > 0.6 && c.slot !== d.zoneTgt && c.cue > (cands.find((x) => x.slot === d.zoneTgt)?.cue ?? 0));
    const due = !(d.zoneNextEval > t) || windupOther || !cands.some((c) => c.slot === d.zoneTgt);
    const bucket = Math.floor(t / 0.5);
    const deepThreat = role === 'deep' && cands.some((c) => c.obs.x >= zx - 8 || c.obs.vx > 3);
    // Shared or his alone: a receiver another deep defender's zone also covers has help; one only he covers does not. Knowing the
    // call well enough to take the receiver nobody else can (a Cover 3 corner carries the outside go, the middle safety the seams)
    // is Awareness, never extra speed or coverage.
    if (role === 'deep') {
      const mates = defs.filter((x) => x !== d && !x.engaged && x.assignment?.a === 'zone' && x.assignment.role === 'deep');
      const inArea = (x, o) => Math.abs(o.y - x.assignment.at[1]) < 12 + (x.ability?.zoneRange || 0) && o.x > 5;
      for (const c of cands) c.alone = !mates.some((x) => inArea(x, c.obs));
    }
    const someAlone = role === 'deep' && cands.some((c) => c.alone && (c.obs.x >= zx - 8 || c.obs.vx > 3));
    for (const c of cands) {
      const o = c.obs; let sc = c.isIn ? 1 : 0.55; const why = [];
      if (c.entering) why.push('entering'); if (c.leaving) { sc -= 0.35; why.push('leaving'); }
      if (role === 'deep') {
        const depth = clamp((o.x - (zx - 8)) / 10, 0, 1.2) + (o.vx > 3 ? 0.4 : 0); sc += 1.2 * depth;
        if (deepThreat && o.x < zx - 8 && o.vx <= 3) { sc -= 1.5; why.push('underneath, not his'); }
        if (someAlone && c.alone) { sc += 0.15 + 0.55 * aw; why.push('his alone'); }
        // Already carried: another deep defender, closer to him, is playing this receiver. Doubling him leaves this defender's own
        // deep area empty (the post or seam behind him), so he weighs it heavily against it, the more so the more aware he is.
        if (defs.some((x) => x !== d && !x.engaged && x.assignment?.a === 'zone' && x.assignment.role === 'deep' && x.zoneTgt === c.slot && dist(x, o) < dist(d, o))) { sc -= 0.4 + 0.8 * aw; c.carried = true; why.push('carried by a teammate'); }
      } else {
        sc += 0.6 * (1 - Math.min(1, Math.abs(o.x - (zx + 2)) / 8));
        if (deepHelp && o.x > zx + 5 + 3 * (1 - aw) && Math.min(o.vx, o.vxLast) > 2) { sc -= 0.6 + 0.5 * aw; why.push('past him, deep help'); } // an aware defender passes a clear-out (still running upfield) to the deep help sooner instead of carrying the decoy; a curl or hitch that has settled is still his
      }
      sc -= 0.04 * Math.hypot(o.x - d.x, o.y - d.y);
      let other = 99, mate = false; const mine = Math.hypot(o.x - d.x, o.y - d.y);
      // "a teammate has him" only when that teammate is playing him AND is closer to him than I am (so two defenders never both
      // defer to each other and swap back and forth), and not when the receiver is visibly leaving that teammate's zone
      for (const x of defs) { if (x === d || x.engaged) continue; const dd = Math.hypot(x.x - o.x, x.y - o.y); if (dd < other) other = dd; if (dd < 3 && dd < mine && ((x.zoneTgt === c.slot && !x.zoneTgtLeaving) || (x.assignment?.a === 'man' && bySlot.off[manKeys[x.assignment.key]] === c.r))) mate = true; }
      sc += 0.5 * clamp((other - 1.5) / 6, 0, 1);
      if (mate) { sc -= 0.3 + 0.5 * aw; why.push('teammate has him'); }
      // His eyes: an unaware defender bites on every look; an aware one trusts only a look the quarterback holds (half a second
      // for full weight), so a glance on the way through his progression does not move him, and a deep defender weighs eyes
      // less against the depth he is there to protect. The throwing motion is real information, read better with Awareness.
      if (c.cue > 0 && !windupSeen) { const trust = clamp(1 - aw + aw * seen.held / 0.5, 0, 1); const w = (role === 'deep' ? 0.4 * (1 - 0.5 * aw) : 0.4) * trust * c.cue; if (w > 0.02) { sc += w; why.push('QB eyes'); } }
      if (windupSeen && c.cue > 0) { sc += (0.3 + 0.5 * aw) * c.cue; why.push('QB winding up'); }
      if (d.zoneTgt === c.slot) sc += 0.12 + 0.18 * aw; // discipline: no switch for a marginal gain
      sc += (hash01(`${d.slot}|${c.slot}|${bucket}`) - 0.5) * 1.4 * Math.pow(1 - aw, 1.2); // misjudgement, larger for a low-Awareness defender
      c.score = sc; c.why = why;
    }
    cands.sort((a, b) => b.score - a.score);
    // A deep defender whose only candidates are receivers a deep teammate already carries holds his landmark and reads the
    // quarterback instead, unless the throwing motion goes there.
    if (role === 'deep' && cands.every((c) => c.carried && !(windupSeen && c.cue > 0.5))) { d.zoneTgt = null; return { pick: null, inZone }; }
    let pick = cands[0];
    if (!due) pick = cands.find((c) => c.slot === d.zoneTgt) || pick; // between reads he keeps playing his man
    else d.zoneNextEval = t + 0.1 + 0.5 * (1 - aw); // the next read: about every 0.35 s at Awareness 50, 0.12 s at 95
    const switched = !!d.zoneTgt && pick.slot !== d.zoneTgt; d.zoneTgt = pick.slot; d.zoneTgtLeaving = !!pick.leaving;
    const ins = cands.filter((c) => c.isIn); const overload = ins.length >= 2;
    const second = cands.find((c) => c !== pick && c.isIn);
    // Two deep threats in a deep zone (four verticals, a seam and a post): an aware deep defender stays between them until the
    // throwing motion shows which (more often the more aware he is); an unaware one commits to one and can be beaten by the other.
    const deepT = (c) => c.obs.x >= zx - 8 || c.obs.vx > 3; const deep2 = role === 'deep' && !windupSeen ? cands.find((c) => c !== pick && c.isIn && deepT(c)) : null;
    const split = role !== 'deep' ? overload && pick.isIn && second && pick.score - second.score < 0.2 : !!(deep2 && pick.isIn && deepT(pick) && pick.score - deep2.score < 0.1 + 0.4 * aw);
    const sec = role === 'deep' ? deep2 : second;
    const why = split ? (role === 'deep' ? 'two deep, splitting' : 'overload, splitting') : role === 'deep' && !pick.why.length ? 'deepest threat' : pick.why.length ? pick.why[pick.why.length - 1] : overload ? 'bigger threat' : 'in his zone';
    const verticalNear = role === 'deep' && cands.some((c) => Math.min(c.obs.vx, c.obs.vxLast) > 2.5);
    return { pick, second: sec, split, verticalNear, splitWeight: split ? clamp(0.5 + (pick.score - sec.score) * 1.5, 0.5, 0.8) : 1, inZone, overload, switched, why };
  }
  function defenseTick(d) {
    const asg = d.assignment;
    const mark = TRACE ? (m, x) => { d.why = m; d.why2 = x ?? null; } : () => {}; // developer trace: the branch he acted on
    if (d.engaged) { mark('engaged'); return; } // movement handled by the blocker's engagement
    const c = ball.holder;
    if (c && c.team === 'def') { // we have the ball: escort or carry
      if (c === d) { mark('carry'); carrierMove(d); return; }
      mark('escort'); escortBlock(d); return;
    }
    if (ball.inAir && t - ball.thrownAt >= ballReaction(d)) { // until he has seen the release he keeps playing his assignment (below)
      const L = perceivedLanding(d); const toBall = dist(d, L);
      // Everybody drives to the ball once it is thrown; the closest defenders sprint, the rest rally.
      const baseBreak = asg.a === 'man' ? 9 : asg.role === 'deep' ? 12 : 11; // zone defenders read the quarterback and break on the throw
      const breakRadius = baseBreak + (d.ability?.breakRadius || 0);
      // The man defender on the target, beaten by a break and thrown behind: he plants to come back, the same burst as a recognised route break, once (v42.8).
      if (asg.a === 'man' && bySlot.off[manKeys[asg.key]] === ball.target && (d.vx * (L.x - d.x) + d.vy * (L.y - d.y)) < 0 && Math.hypot(d.vx, d.vy) > 3 && !(d.breakPlant > t - 1.0)) { d.breakPlant = t; d.cutUntil = t + 0.35; }
      if (toBall < breakRadius) { mark('ball', 'break'); if (toBall >= baseBreak) abilityUsed(d, 'breakRadius'); steer(d, L.x, L.y, 1, 0.2); return; }
      if (!['rush', 'contain'].includes(asg.a) || d.x < L.x) { mark('ball', 'rally'); steer(d, L.x, L.y, 0.95, 0.2); return; }
    }
    // The run (v42.14, Phase A): the ball is in a carrier's hands (a handoff, a keep, a scramble: what the ball is doing, never
    // what was called) and HIS read has committed to it (updateRead). Fits use where he SEES the carrier, a perception delay ago.
    const runLive = phase === 'carry' && c && c.team === 'off';
    const R = d.read;
    if (runLive && d.recognised) {
      // Run fit: until the carrier crosses the line, second-level defenders fill their lane rather than chasing the ball.
      const isFront = ['rush', 'contain'].includes(asg.a);
      const delay = readDelay(d); const sc = seenOf(c, delay), sv = seenVel(c, delay);
      if (!isFront && sc.x < 1.5) {
        const deep = asg.a === 'zone' && asg.role === 'deep'; const aw = norm(d.attrs.awareness);
        const fitX = deep ? 6.5 : (defensePlay.tags.includes('run') || defensePlay.tags.includes('goalline')) ? 0.5 : 1.5; // run calls meet the back at the line (his own call)
        // Second-level defenders flow to the ball: a linebacker fills the gap the back is SEEN choosing, not just his own.
        const flow = deep ? 2.5 : 5;
        let ty = sc.y + sv.vy * 0.3;
        // Misdirection: for a moment after the handoff, a defender fooled by the flow of the line leans the wrong way (less so
        // when he is aware); the conflicting cues also slowed his read (readCues).
        if (R?.cues?.conflict && t - Math.min(handoffAt, keepAt) < 0.6) ty += Math.sign(R.cues.lineFlow) * flow * 0.5 * (1 - aw);
        const shade = clamp(ty - d.y, -flow, flow) * (0.55 + 0.45 * aw);
        mark('run-fit'); steer(d, fitX, d.y + shade, 1, 0.3); return;
      }
      mark('pursue', 'run'); pursue(d); return;
    }
    // Reading before the handoff (v42.14). A linebacker committed to the run fits his lane at read depth, toward the back he sees at
    // the mesh (Phase A stage 2); one still reading stands between his drop and that fit in proportion to his read (the zone case),
    // which is also the play-action bite: the fake pulls him up, the quarterback's drop sends him back, late. Defensive backs keep
    // their drop until they see a carrier; a deep defender holds his depth only on a strong read.
    if (!runLive && ball.holder === qb && phase !== 'carry' && !['rush', 'contain', 'man'].includes(asg.a) && R) {
      const deepDefender = asg.a === 'zone' && asg.role === 'deep';
      if (deepDefender) { if (R.b > 0.45) { const sp = snapPos.get(d); mark('read', 'hold'); steer(d, clamp(d.x, sp.x - 0.5, sp.x), d.y, 0.6, 0.3); return; } }
      else if (!isDB(d) && d.recognised) { const f = readFit(d); mark('run-fit', 'before the handoff'); steer(d, f.x, f.y, 1, 0.3); return; }
    }
    switch (asg.a) {
      case 'rush': {
        const gap = asg.points[1];
        if (d.state === 'init') d.state = 'gap';
        if (d.state === 'gap') {
          // Run fronts (Phase A stage 2): hold the gap until HE reads pass (gap integrity); a goal-line front holds it until he
          // reads run, then gets into the backfield (penetration at the mesh). Other calls rush as before (to the gap, then the
          // quarterback once there or at 0.8 s).
          if (RUN_CALL && !passShown(d) && !(GOAL_LINE && d.recognised)) { mark('rush', 'hold gap'); steer(d, gap[0], gap[1], 1, 0.4); return; }
          mark('rush', 'gap'); steer(d, gap[0], gap[1], 1, 0.4); if ((RUN_CALL && !GOAL_LINE) || dist(d, { x: gap[0], y: gap[1] }) < 1 || t > 0.8) d.state = 'free'; return;
        }
        if (qb && ball.holder === qb) { mark('rush', 'qb'); pursue(d); return; }
        if (c) { mark('pursue', 'carrier'); pursue(d); return; }
        mark('rush', 'qb'); steer(d, qb.x, qb.y, 1, 0.3); return;
      }
      case 'contain': {
        const pt = asg.points[1];
        const carrier = c || qb;
        const outside = carrier && Math.abs(carrier.y) > Math.abs(pt[1]) - 2 && Math.sign(carrier.y) === Math.sign(pt[1]);
        const crossed = carrier && carrier.x > 0.5;
        if (outside || crossed || (scrambled)) { mark('contain', 'pursue'); pursue(d); return; }
        mark('contain', 'edge'); steer(d, pt[0], pt[1], 0.9, 0.4); return;
      }
      case 'man': {
        const target = bySlot.off[manKeys[asg.key]];
        // Nobody to cover on a run front or goal-line call (v42.14, Goal Line Man against one-back sets): he is a run-support
        // linebacker. Before the handoff he stands between his own alignment and his run fit in proportion to his read (the graded
        // positioning of a reading linebacker), and he keeps doing so after a handoff he has not yet seen; once he recognises the
        // run, the run fit above takes over. When the play shows him pass, he sits in the short middle as before. He reads only what
        // he sees.
        if (!target && RUN_CALL && R && !ball.inAir && ball.holder?.team === 'off' && !(ball.holder === qb && passShown(d))) {
          const sp = snapPos.get(d), lean = readLean(d), f = readFit(d);
          mark('man', `none · run support ${Math.round(lean * 100)}%`); steer(d, sp.x + (f.x - sp.x) * lean, sp.y + (f.y - sp.y) * lean, 0.9, 0.3); return;
        }
        if (!target) { mark('man', 'none'); steer(d, 6, d.y * 0.6, 0.8, 0.3); return; } // nobody to cover (three-receiver set): sit in the short middle
        // A back who stays in to block frees his man: "green dog", add to the rush.
        if (asg.key === 'back' && t > 0.6 && qb && ball.holder === qb) { // he SEES the back stay in (behind the line, by the quarterback, not running a route); v42.14: was the back's assignment
          const dl = readDelay(d), sb = seenOf(target, dl), vb = seenVel(target, dl);
          if (sb.x < -0.5 && Math.hypot(vb.vx, vb.vy) < 2.5 && Math.abs(sb.y - qb.y) < 3) { mark('man', 'green-dog'); pursue(d); return; }
        }
        const p = trailPosition(d, target); const ov = observedVelocity(d, target);
        // Run with the receiver (v42.8, attribute audit fix 2): everything he reacts to is what he can see, the receiver's
        // position and velocity a reaction delay ago (Coverage shortens the delay). He anticipates along that observed line,
        // less so once the line turns, and he never projects it more than a couple of yards, so a break does not carry him deep.
        if (ov.vx > 2.0) d.sawRelease = true; // he has seen the receiver release upfield; before that, nothing is a break
        const turnedBack = !!d.sawRelease && ov.vx < -1.0; // coming back toward the line (comeback, curl, dig working back)
        const ovs = Math.hypot(ov.vx, ov.vy); d.peakSeen = Math.max(d.peakSeen || 0, ovs);
        const settled = !!d.sawRelease && ovs < 1.5; // sitting down (curl, hitch)
        const slowing = !!d.sawRelease && !settled && ovs < (0.55 + 0.35 * norm(d.attrs.coverage)) * d.peakSeen; // gathering himself for a break: a good cover man notices a slight gear-down, a poor one only a hard brake
        const antic = turnedBack || settled || slowing ? 0.05 : 0.12 + 0.3 * norm(d.attrs.coverage);
        // Recognising the break he plants too, the same 1.9× burst the receiver got for his planned cut (Agility sets both); once per break.
        if ((turnedBack || settled || slowing) && !(d.breakPlant > t - 1.0)) { d.breakPlant = t; d.cutUntil = t + 0.35; }
        const lead = Math.min(3.5, Math.hypot(ov.vx, ov.vy) * antic); const ux = ov.vx / (Math.hypot(ov.vx, ov.vy) || 1), uy = ov.vy / (Math.hypot(ov.vx, ov.vy) || 1);
        const inside = target.y > 0 ? -0.6 : 0.6;
        // Keep leverage on top of a receiver who is still working upfield; never give up the cushion by running at him.
        const onTop = p.x + ux * lead + (slowing ? 0.2 : 0.8); // gearing down with him: give up the cushion, not the leverage
        const ty = p.y + uy * lead + inside;
        // Lateral routes (v42.10, defensive audit fix 1): a receiver running across the field in front of him (a drag, a back to
        // the flat, a swing) used to be "shuffled" at a third of his speed and never closed on. Once he SEES the receiver moving
        // across (the same delayed, observed velocity; Coverage shortens the delay and sets how far he anticipates), he plants
        // and mirrors him at full speed from a yard over the top, never stepping into the backfield. Speed and Agility decide
        // whether he keeps up; he gets no information the receiver's movement has not already shown.
        const lateral = ovs > 2.5 && Math.abs(ov.vy) > 1.5 * Math.abs(ov.vx);
        if (lateral && !turnedBack && onTop < d.x) {
          if (!d.lateralRead) { d.lateralRead = true; if (!(d.breakPlant > t - 1.0)) { d.breakPlant = t; d.cutUntil = t + 0.35; } }
          // He has read the direction, so he anticipates along it by Coverage even while the receiver is still gathering out of
          // his cut (the general lead shrinks to almost nothing then, which left him standing on a dig's break).
          const leadL = Math.min(3.5, ovs * (0.12 + 0.3 * norm(d.attrs.coverage)));
          mark('man', `${target.slot}: mirror across`); steer(d, Math.max(p.x + ux * leadL + 1.0, 1.0), p.y + uy * leadL, 1, 0.3); return;
        }
        if (!turnedBack && !settled) {
          if (onTop >= d.x) { mark('man', slowing ? `${target.slot}: gearing down` : `${target.slot}: on top`); steer(d, onTop, ty, slowing ? Math.max(0.3, ovs / Math.max(1, d.peakSeen)) : 1, 0.3); return; }
          if (slowing) { mark('man', `${target.slot}: turn with him`); steer(d, d.x, ty, 0.3, 0.3); return; } // past him as he gathers: stop and turn with him
          // Receiver still in front of him (the release, or running at him): shuffle, backpedal only as he closes.
          const closing = d.x - p.x < 3.5; mark('man', `${target.slot}: ${closing ? 'backpedal' : 'shuffle'}`); steer(d, closing ? d.x - 0.6 : d.x, ty, closing ? 0.55 : 0.35, 0.3); return;
        }
        // He broke back or sat down: drive downhill to where he is seen, inside shoulder (Speed closes, Agility turns him).
        mark('man', `${target.slot}: drive on the break`); steer(d, p.x + ux * lead, p.y + uy * lead + inside * 0.5, 1, 0.3); return;
      }
      case 'zone': {
        // Zone coverage (v42.12, zone intelligence): the defender reads the receivers around his zone from what he can SEE
        // (their position and movement a perception delay ago, shorter with Awareness and Coverage) and decides, at a pace set
        // by Awareness, which one to play: see zoneRead. Coverage sets how well he then plays him (anticipation, and how far he
        // gets into the throwing window underneath); Speed and Agility set whether he gets there.
        const [zx, zy] = asg.at; const role = asg.role;
        const radius = (role === 'deep' ? 12 : role === 'middle' ? 7.5 : 7) + (d.ability?.zoneRange || 0);
        // Before the play shows pass (a run, or a play-action fake still selling) there is no pass to read: he drops into his zone
        // and carries the deepest receiver in it, as before v42.12, but on the movement he SEES (observed velocity, never the
        // true one). Run recognition and run fits take over from here exactly as before.
        if (!passShown(d)) {
          // Graded (Phase A stage 2): a linebacker stands between his drop and his run fit in proportion to his read.
          const lean = role === 'deep' || isDB(d) ? 0 : readLean(d); const fit = lean > 0 ? readFit(d) : null;
          const gsteer = (tx, ty, sp, ar) => (fit ? steer(d, tx + (fit.x - tx) * lean, ty + (fit.y - ty) * lean, sp, ar) : steer(d, tx, ty, sp, ar));
          const inArea = (r) => (role === 'deep' ? Math.abs(r.y - zy) < radius && r.x > 5 : dist(r, { x: zx, y: zy }) < radius);
          const threats = receivers.map((s) => bySlot.off[s]).filter((r) => r && inArea(r) && r.x > -1);
          d.zoneTgt = null; if (TRACE) d.zoneInfo = null;
          if (threats.length && dist(d, { x: zx, y: zy }) < radius + 1) {
            const r = threats.sort((p, q) => q.x - p.x)[0]; const p = trailPosition(d, r); const ov = observedVelocity(d, r); const antic = 0.15 + 0.25 * norm(d.attrs.coverage);
            mark('zone', `${r.slot} · no pass shown, deepest (${threats.length} in zone)`);
            if (role === 'deep') { const inward = Math.sign(zy - r.y) || (zy >= 0 ? 1 : -1); const ty = clamp(p.y + ov.vy * antic + inward * 1.2, zy - 10, zy + 10); steer(d, Math.max(p.x + ov.vx * antic + 2.0, zx - 3), ty, 0.98, 0.3); }
            // Reading, he does not come up to a receiver near the line: he keeps his depth, a step and a half closer when he leans run.
            else { const hold = snapPos.get(d).x - 1.5 * lean; gsteer(Math.max(hold, p.x + ov.vx * antic * 0.6 + 0.3), p.y + ov.vy * antic * 0.6, 0.95, 0.3); }
            return;
          }
          mark('zone', lean > 0.05 ? `spot · reading run ${Math.round(lean * 100)}%` : 'spot'); gsteer(zx, zy, 0.95, 0.5); return;
        }
        const center = { x: zx, y: zy };
        if (dist(d, center) < radius + 1) {
          const read = zoneRead(d, asg, radius);
          if (read.pick) {
            const r = read.pick; zoneDelay(d, r.r, true); /* records Sticky / Heat Haze as active, as trailPosition did */ const p = r.obs; const antic = 0.12 + 0.2 * norm(d.attrs.coverage) + 0.1 * norm(d.attrs.awareness); // how far ahead he plays him: technique (Coverage) and reading the break (Awareness); about as before at equal ratings
            if (TRACE) d.zoneInfo = { in: read.inZone, tgt: r.slot, why: read.why, overload: read.overload, switched: read.switched, split: read.split ? read.second.slot : null };
            mark('zone', `${r.slot} · ${read.why} (${read.inZone.length} in zone)`);
            if (role === 'deep') {
              // Stay on top and keep inside leverage toward the zone centre; never abandon the zone.
              const inward = Math.sign(zy - p.y) || (zy >= 0 ? 1 : -1);
              const ty = clamp(p.y + p.vy * antic + inward * 1.2, zy - 10, zy + 10);
              // Depth: stay 2 yards on top of where he sees the receiver, leading him by 0.25 s of his seen speed (by the latest step
              // when he is throttling down, so a comeback or curl stops the bail as soon as it shows), and never come up more than a
              // yard from his landmark before the ball is thrown: he keeps his depth (3 yards before v42.12, when the lead used the
              // receiver's TRUE velocity and kept him deeper anyway).
              // His landmark: within a yard of it while anything in his area is running vertically; once nothing is (an out, a curl,
              // a comeback settling in front of him), he may come down to 4 yards under it to play the ball in front of him.
              const floor = read.verticalNear ? zx - 1 : zx - 4;
              if (read.split) { // between the two deep threats, on top of the deeper
                const q = read.second.obs, w = read.splitWeight; const tyS = clamp((p.y + p.vy * antic) * w + (q.y + q.vy * antic) * (1 - w), zy - 10, zy + 10);
                steer(d, Math.max(Math.max(p.x + Math.min(p.vx, p.vxLast) * 0.25, q.x + Math.min(q.vx, q.vxLast) * 0.25) + 2.0, floor), tyS, 0.98, 0.3);
              } else steer(d, Math.max(p.x + Math.min(p.vx, p.vxLast) * 0.25 + 2.0, floor), ty, 0.98, 0.3);
            } else {
              const win = (o) => ({ x: o.x + Math.min(o.vx, o.vxLast) * antic * 0.6 + 0.3, y: o.y + o.vy * antic * 0.6 }); // underneath zones squeeze the receiver (as before), on his seen movement; a receiver sitting down or coming back shows on the latest step
              let tgt = win(p);
              if (read.split) { const q = win(read.second.obs); const w = read.splitWeight; tgt = { x: tgt.x * w + q.x * (1 - w), y: tgt.y * w + q.y * (1 - w) }; } // overloaded: play between the two, leaning to the bigger threat
              const off = dist(tgt, center), cap = radius + 2; if (off > cap) tgt = { x: zx + (tgt.x - zx) * cap / off, y: zy + (tgt.y - zy) * cap / off }; // never chase out of his zone
              steer(d, tgt.x, tgt.y, 0.95, 0.3);
            }
            return;
          }
        }
        // Nobody to play: hold the landmark, shading toward where the quarterback is looking (an aware defender reads his eyes).
        d.zoneTgt = null; d.zoneTgtLeaving = false; if (TRACE) d.zoneInfo = null;
        const sf = ball.holder === qb ? seenFacing(norm(d.attrs.awareness)) : null; const eyeY = sf ? sf.qy + Math.tan(clamp(sf.ang, -1.3, 1.3)) * Math.max(1, zx - sf.qx) : null;
        const shade = sf ? clamp((eyeY - zy) * 0.25, role === 'deep' ? -1.5 : -2, role === 'deep' ? 1.5 : 2) * norm(d.attrs.awareness) : 0;
        mark('zone', shade ? 'spot · reading the QB' : 'spot'); steer(d, zx, zy + shade, 0.95, 0.5); return;
      }
      case 'spy': {
        if (c === qb && qb.x > 0) { mark('spy', 'pursue'); pursue(d); return; }
        mark('spy', 'mirror'); steer(d, 3, qb.y, 0.9, 0.5); return;
      }
      default: steer(d, d.x, d.y, 0, 0.2);
    }
  }

  // ------------------------------------------------------------ contact and dead balls
  function tryTackle(d, c) {
    if (d.stun > 0 || d.engaged || dist(d, c) > 1.25) return false;
    const fwd = c.team === 'off' ? 1 : -1;
    // Daybreak: nobody can bring him down from behind.
    if (c.daybreak && (d.x - c.x) * fwd < -0.2) return false;
    // Permafrost: a run that meets him at his gap loses a yard on contact.
    if (d.ability?.permafrost && !c.permafrosted && handoffDone && !stats.receiver) { // v42.14: a handed-off (or kept) ball, not the play type
      c.permafrosted = true; c.x -= fwd * d.ability.permafrost; c.vx = 0; c.vy = 0; c.stun = Math.max(c.stun, 0.35); setStatus(c, 'frozen', 0.5); abilityUsed(d, 'permafrost'); abilityOutcome('stuffed', d, `${d.name} freezes ${c.name} in place`, { victim: c.slot });
    }
    // Eruption: once per drive, the first defender to hit him is flattened (a guaranteed broken tackle).
    if (c.ability?.eruption && available(c, 'eruption', 'drive')) {
      spend(c, 'eruption', 'drive'); d.stun = 1.2; d.noEngage = 1.2; d.vx = 0; d.vy = 0; setStatus(d, 'flat', 1.2); c.brokeTackle = (c.brokeTackle || 0) + 1; stats.brokenTackles += 1;
      abilityUsed(c, 'eruption'); abilityOutcome('flattened', c, `${c.name} flattens ${d.name}`, { victim: d.slot });
      return false;
    }
    // Blink: once per game, he teleports 5 yards past the first tackler.
    if (c.ability?.blink && available(c, 'blink', 'game')) {
      spend(c, 'blink', 'game'); const from = { x: c.x, y: c.y };
      c.x = clamp(c.x + fwd * c.ability.blink, B.ownEndLine + 0.5, B.endLine - 0.5); d.stun = Math.max(d.stun, 0.5);
      abilityUsed(c, 'blink'); abilityOutcome('blink', c, `${c.name} blinks past ${d.name}`, { victim: d.slot, fromX: +from.x.toFixed(2), fromY: +from.y.toFixed(2) });
      return false;
    }
    const closing = Math.hypot(d.vx - c.vx, d.vy - c.vy);
    const gang = opponents(c.team).filter((o) => o !== d && dist(o, c) < 1.8).length;
    // Type edge: only the tackler making the attempt and the carrier he is hitting; helpers add their gang bonus, never their type.
    const tackleScore = (d.attrs.tackling * 0.55 + d.attrs.strength * 0.3) * scaleVs(d, c, 'tackle') + closing * 1.2 + gang * 12;
    const carryStrength = c.attrs.strength + (c.ability?.carryStrength && Math.abs(c.y) < 6 ? c.ability.carryStrength : 0);
    const carryScore = (carryStrength * 0.5 + c.attrs.agility * 0.3 + c.attrs.speed * 0.1) * scaleVs(c, d, 'breakTackle') + (c.team === 'def' ? -8 : 0);
    let p = sigmoid((tackleScore - carryScore + 18) / 16);
    const ce = c.ability || {};
    if (ce.elusive) p *= 1 - ce.elusive;
    if (ce.elusiveFirst && !c.brokeTackle) p *= 1 - ce.elusiveFirst;
    if (ce.quakeStep && d.quakeUntil > t) { p *= 1 - ce.quakeStep; abilityUsed(c, 'quakeStep'); } // Quake Step: a defender near his cut stumbles
    if (rng.chance(p)) {
      // Fumble check on contact.
      let fumbleP = 0.012 * (1.6 - norm(c.attrs.catching)) * (gang ? 1.4 : 1) * (c.slot === 'QB' ? 1.3 : 1);
      if (d.ability?.forceFumble) fumbleP *= d.ability.forceFumble;
      if (ce.fumbleResist) fumbleP *= ce.fumbleResist;
      if (ce.noFumble) fumbleP = 0;
      const forward = Math.min(1.2, Math.hypot(c.vx, c.vy) * 0.14);
      const dir = c.team === 'off' ? 1 : -1;
      c.x += dir * forward;
      // Landslide: a run that went through his gap falls forward two more yards.
      if (c.landslide && !c.landslideApplied) { c.landslideApplied = true; c.x += dir * c.landslide.ability.landslide; abilityUsed(c.landslide, 'landslide'); abilityOutcome('falls_forward', c.landslide, `${c.name} rides the Landslide two more yards`, { victim: d.slot }); }
      // Forward progress across the goal line is a score, not a tackle at the 1.
      if (c.team === 'off' && c.x >= B.goal) { stats.tackler = d.slot; endPlay('touchdown', Math.max(c.x, B.goal), c.y); log(`${c.name} is dragged down past the goal line. TOUCHDOWN`, { kind: 'touchdown' }); return true; }
      if (c.team === 'def' && c.x <= B.ownGoal) { stats.tackler = d.slot; endPlay('touchdown', Math.min(c.x, B.ownGoal), c.y, { defensiveScore: true }); log(`${c.name} falls into the end zone. TOUCHDOWN`, { kind: 'touchdown' }); return true; }
      if (rng.chance(fumbleP)) {
        const near = actors.filter((a) => dist(a, c) < 2.5);
        const recoverer = near.length ? rng.pick(near) : d;
        stats.forcedBy = d.slot; stats.tackler = d.slot; stats.fumbledBy = c.slot; stats.recoveredSlot = recoverer.slot; stats.recoveredTeam = recoverer.team;
        if (d.ability?.forceFumble) abilityUsed(d, 'forceFumble'); log(`${d.name} forces a fumble by ${c.name}; ${recoverer.name} recovers`, { kind: 'fumble', by: d.slot, side: d.team, victim: c.slot, recoveredBy: recoverer.slot, team: recoverer.team, ability: fired(d, 'forceFumble') });
        if (recoverer.team !== c.team) { endPlay('fumble', c.x, c.y, { recoveredBy: recoverer.team }); } else { endPlay('tackle', c.x, c.y, { fumbleRecovered: true }); }
        return true;
      }
      stats.tackler = d.slot;
      { const helper = opponents(c.team).filter((o) => o !== d && o.stun <= 0 && dist(o, c) < 1.3).sort((p, q) => dist(p, c) - dist(q, c))[0]; if (helper) stats.assistBy = helper.slot; }
      if (c.team === 'off' && c.x <= B.ownGoal) { endPlay('safety', c.x, c.y); log(`${d.name} tackles ${c.name} in the end zone. SAFETY`, { kind: 'safety' }); return true; }
      endPlay('tackle', c.x, c.y);
      if (d.ability?.reaction) abilityUsed(d, 'reaction'); log(`${d.name} tackles ${c.name}`, { kind: 'tackle', by: d.slot, side: d.team, victim: c.slot, ability: fired(d, 'reaction', 'pursuitSpeed', 'runStuff') });
      return true;
    }
    d.stun = 0.45; d.noEngage = 0.3; c.brokeTackle = (c.brokeTackle || 0) + 1; stats.brokenTackles += 1;
    if (ce.bramble) { d.slowUntil = t + ce.bramble; abilityUsed(c, 'bramble'); abilityOutcome('thorned', c, `${d.name} is caught in ${c.name}'s Bramble Shell`, { victim: d.slot }); }
    if (c.ability?.carryStrength || ce.elusive || ce.elusiveFirst || ce.noFumble) abilityUsed(c, ce.carryStrength ? 'carryStrength' : ce.noFumble ? 'noFumble' : ce.elusive ? 'elusive' : 'elusiveFirst'); log(`${c.name} breaks ${d.name}'s tackle`, { kind: 'broken', by: c.slot, side: c.team, victim: d.slot, ability: fired(c, 'carryStrength', 'elusive', 'elusiveFirst', 'noFumble') });
    c.vx *= 0.55; c.vy *= 0.55; // the arm tackle still slows him down
    log(`${c.name} breaks ${d.name}'s tackle`, { kind: 'broken_tackle', by: c.slot, side: c.team, victim: d.slot, ability: fired(c, 'carryStrength', 'elusive', 'elusiveFirst', 'noFumble') });
    return false;
  }
  function trySack(d) {
    if (d.stun > 0 || d.engaged || dist(d, qb) > 0.95) return false;
    const p = clamp(0.62 + 0.3 * norm(d.attrs.tackling * scaleVs(d, qb, 'sack')) - 0.35 * norm(qb.attrs.agility * scaleVs(qb, d, 'escape')), 0.25, 0.92);
    if (rng.chance(p)) {
      // Glacier Wall: sacks coming from his side of the line fail 30% of the time.
      const wall = offs.find((o) => o.ability?.glacierWall);
      if (wall && (Math.abs(wall.y) < 1 ? Math.abs(d.y) < 3 : Math.sign(d.y) === Math.sign(wall.y)) && rng.chance(wall.ability.glacierWall)) {
        d.stun = 0.7; d.noEngage = 0.3; abilityUsed(wall, 'glacierWall'); abilityOutcome('sack_denied', wall, `${wall.name}'s Glacier Wall stops ${d.name} short`, { victim: d.slot });
        return false;
      }
      stats.tackler = d.slot;
      if (qb.windup && rng.chance(0.25)) { // strip sack on the wind-up
        const near = actors.filter((x) => dist(x, qb) < 2.5); const rec = near.length ? rng.pick(near) : d;
        qb.windup = null; stats.forcedBy = d.slot; stats.fumbledBy = qb.slot; stats.recoveredSlot = rec.slot; stats.recoveredTeam = rec.team;
        log(`${d.name} strips ${qb.name} as he throws; ${rec.name} recovers`, { kind: 'fumble', by: d.slot, recoveredBy: rec.slot, team: rec.team });
        if (rec.team === 'def') endPlay('fumble', qb.x, qb.y, { recoveredBy: 'def' }); else endPlay('sack', qb.x, qb.y, { fumbleRecovered: true });
        return true;
      }
      qb.windup = null;
      if (d.lastBeat && t - d.lastBeat.t < 1.5) stats.sackAllowedBy = d.lastBeat.blocker; else if (!d.wasBlocked) stats.sackUnblocked = true;
      if (d.ability?.overcharge) { spend(d, 'overcharge', 'drive'); abilityUsed(d, 'overcharge'); } // Overcharge: charged for the rest of this drive
      endPlay('sack', qb.x, qb.y); log(`${d.name} sacks ${qb.name}`, { kind: 'sack', by: d.slot, side: d.team, victim: qb.slot, ability: fired(d, 'rushSpeed', 'shedStrength', 'pursuitSpeed', 'overcharge') }); return true;
    }
    d.stun = 0.7; d.noEngage = 0.3;
    if (!scrambled && rng.chance(0.6)) scramble(qb);
    log(`${qb.name} escapes ${d.name}`, { kind: 'escape' });
    return false;
  }
  function endPlay(kind, x, y, extra = {}) {
    if (result) return;
    result = kind; ball.holder = ball.holder || null; ball.x = x; ball.y = y; Object.assign(stats, extra);
  }
  function resolveArrival() {
    const r = ball.target;
    const L = ball.landing;
    const catchRadius = 1.4 + 0.9 * norm(r.attrs.agility) + (ball.tailwind ? 0.6 : 0);
    const dr = dist(r, L);
    const defendersNear = defs.filter((d) => !d.engaged).map((d) => ({ d, dd: dist(d, L) })).sort((p, q) => p.dd - q.dd);
    const nearest = defendersNear[0];
    const deep = (ball.airYards || 0) > 20;
    // Route separation (type edge, GDD §32.2): the receiver's edge against the defender actually nearest the ball shrinks the
    // distance from which that defender can still contest; the defender's edge grows it. Read here, at the catch point.
    const sepScale = nearest ? scaleVs(nearest.d, r, 'coverage') * (2 - scaleVs(r, nearest.d, 'separation')) : 1;
    let contested = nearest && nearest.dd < (deep ? 1.6 : 1.1) * sepScale; // at full sprint a trailing defender a step away still plays the ball
    // Thunderclap: a defender trailing the receiver (behind him on his path) cannot break up a quick pass.
    const trailing = nearest && ((nearest.d.x - r.x) * r.vx + (nearest.d.y - r.y) * r.vy) < 0;
    const thunderShield = ball.thunder && ball.quick && trailing && nearest.dd < (deep ? 1.6 : 1.1) * sepScale;
    if (thunderShield) { contested = false; abilityOutcome('no_breakup', qb, `${qb.name}'s Thunderclap beats ${nearest.d.name} to the spot`, { victim: nearest.d.slot }); }
    // Coverage responsibility: the man defender assigned to this receiver; in zone, only a defender close enough to have had him (within 2.5 yards); otherwise nobody, the zone was open.
    { const manD = defs.find((d) => d.assignment?.a === 'man' && bySlot.off[manKeys[d.assignment.key]] === r);
      if (manD) { stats.coverBy = manD.slot; stats.coverKind = 'man'; }
      else if (nearest && nearest.dd <= 2.5 && nearest.d.assignment?.a === 'zone') { stats.coverBy = nearest.d.slot; stats.coverKind = 'zone'; }
      else { stats.coverBy = null; stats.coverKind = 'open'; } }
    stats.arriveSep = nearest ? +nearest.dd.toFixed(2) : null; // read-only: the real separation when the ball arrives (QB study, AI Testing Lab)
    let catchP = dr > catchRadius ? 0 : (0.7 + 0.29 * norm(r.attrs.catching)) * (1 - Math.max(0, dr - 0.6) / catchRadius * 0.45);
    if (deep) catchP *= ball.tailwind ? 0.89 + 0.05 * norm(r.attrs.catching) : 0.78 + 0.1 * norm(r.attrs.catching); // tracking the ball over the shoulder (Tailwind: it lands softer)
    { const manD = defs.find((d) => d.assignment?.a === 'man' && bySlot.off[manKeys[d.assignment.key]] === r);
      if (manD?.ability?.fortress) { catchP *= 1 - manD.ability.fortress; abilityUsed(manD, 'fortress'); } } // Fortress: receivers he covers in man catch 35% less often
    { const sf = defs.find((d) => d.ability?.staticField && d.assignment?.a === 'zone' && inZoneArea(d.assignment, L));
      if (sf) { catchP *= 1 - sf.ability.staticField; abilityUsed(sf, 'staticField'); } } // Static Field: catches in his zone are 10% harder
    // Night Veil: a ball that arrives with him within a yard of it is never caught (it can still be picked).
    const veil = defs.find((d) => d.ability?.nightVeil && !d.engaged && !(d.stun > 0) && dist(d, L) <= 1.0);
    if (veil && catchP > 0 && !thunderShield) { catchP = 0; abilityUsed(veil, 'nightVeil'); abilityOutcome('veiled', veil, `${veil.name}'s Night Veil: ${r.name} never sees the ball`, { victim: r.slot }); }
    if (contested) {
      const dCover = nearest.d.attrs.coverage + (nearest.d.ability?.contest || 0) + (nearest.d.assignment?.a === 'man' ? (nearest.d.ability?.manCoverage || 0) : 0);
      const rCatch = r.attrs.catching + (r.ability?.catchContest || 0);
      catchP *= 0.7 + 0.22 * norm(rCatch * scaleVs(r, nearest.d, 'catch')) - 0.22 * norm(dCover * scaleVs(nearest.d, r, 'breakup')); // the defender actually at the ball, not the one who lined up on him
      if (nearest.d.ability?.wingShadow) { catchP *= 1 - nearest.d.ability.wingShadow; abilityUsed(nearest.d, 'wingShadow'); } // Wing Shadow: contested catches against him are 15% harder
      if (nearest.d.ability?.contest || nearest.d.ability?.manCoverage) abilityUsed(nearest.d, nearest.d.ability.contest ? 'contest' : 'manCoverage'); if (r.ability?.catchContest) abilityUsed(r, 'catchContest');
    }
    // A defender on the ball plays it (v42.8): within a yard, and not clearly beaten to it by the receiver (before the lead fix,
    // under-led balls fell to trailing defenders; with the ball on the receiver this keeps interceptions real without inventing them).
    if (nearest && nearest.dd < 1.0 && nearest.dd < dr + 0.35 && !thunderShield) {
      const pickCatching = nearest.d.attrs.catching + (nearest.d.ability?.pickCatching || 0);
      let pickP = (0.05 + 0.22 * norm(pickCatching)) * (dr > catchRadius ? 1.15 : 0.78); // v42.8: with the ball led onto the receiver, a defender who got there too has a real play on it (0.5 before, when under-led balls fell to him anyway)
      if (ball.undertow) { pickP *= ball.undertow.ability.undertow; abilityUsed(ball.undertow, 'undertow'); } // Undertow: 25% more likely
      const picked = rng.chance(pickP);
      if (picked && ball.sovereign) { abilityUsed(qb, 'sovereign'); abilityOutcome('pick_denied', qb, `${qb.name}'s Sovereign Arm: ${nearest.d.name} cannot hold it`, { victim: nearest.d.slot }); }
      else if (picked) {
        ball.inAir = false; ball.holder = nearest.d; stats.interceptor = nearest.d.slot; nearest.d.x = L.x; nearest.d.y = L.y;
        nearest.d.laneTimer = 0; nearest.d.jukeCooldown = 0;
        if (nearest.d.ability?.pickCatching) abilityUsed(nearest.d, 'pickCatching'); log(`${nearest.d.name} intercepts the pass!`, { kind: 'interception', by: nearest.d.slot, side: 'def', ability: fired(nearest.d, 'pickCatching', 'breakRadius', 'closeSpeed', 'zoneRange', 'manCoverage', 'contest') });
        if (L.x >= B.goal) { endPlay('touchback_return', L.x, L.y, { interception: true }); return; }
        phase = 'carry'; for (const o of offs) o.engaged = null; return;
      }
    }
    if (rng.chance(catchP)) {
      ball.inAir = false; ball.holder = r; r.x = L.x; r.y = L.y; r.laneTimer = 0; r.jukeCooldown = 0.4; r.caughtAt = t; phase = 'carry';
      r.vx *= 0.45; r.vy *= 0.45; // securing the ball and turning upfield costs a step
      // Daybreak: after any catch, nobody can run him down from behind (defenders in front still can).
      if (r.ability?.daybreak) { r.daybreak = true; abilityUsed(r, 'daybreak'); }
      stats.receiver = r.slot; stats.carrier = r.slot; stats.catchX = L.x;
      for (const def of defs) def.recognised = true;
      if (r.ability?.routeAgility) abilityUsed(r, 'routeAgility'); log(`${r.name} catches it${contested ? ' in traffic' : ''}`, { kind: 'catch', by: r.slot, side: 'off', contested: !!contested, ability: fired(r, 'catchContest', 'routeAgility', 'afterCatch') });
      if (L.x >= B.goal) { endPlay('touchdown', L.x, L.y); log('TOUCHDOWN', { kind: 'touchdown' }); }
      if (L.y <= B.left || L.y >= B.right) { endPlay('out_of_bounds', L.x, clamp(L.y, B.left, B.right)); }
      return;
    }
    ball.inAir = false;
    endPlay('incomplete', L.x, L.y);
    if (contested && nearest) stats.pbuBy = nearest.d.slot; else if (dr <= catchRadius) stats.dropped = true;
    log(contested && nearest ? `Pass broken up by ${nearest.d.name}` : dr > catchRadius ? 'Pass falls incomplete, out of reach' : `${r.name} drops it`, { kind: 'incomplete', dropped: dr <= catchRadius, pbu: !!(contested && nearest), by: contested && nearest ? nearest.d.slot : null, side: contested && nearest ? 'def' : null, ability: contested && nearest ? fired(nearest.d, 'contest', 'manCoverage', 'breakRadius', 'closeSpeed') : false });
  }

  // ------------------------------------------------------------ main loop
  function recordFrame() {
    frames.push({
      t: +t.toFixed(2),
      off: offs.map((a) => [a.slot, +a.x.toFixed(2), +a.y.toFixed(2), a.engaged ? 1 : 0, statusOf(a)]),
      def: defs.map((a) => [a.slot, +a.x.toFixed(2), +a.y.toFixed(2), a.engaged ? 1 : 0, statusOf(a)]),
      ball: [+ball.x.toFixed(2), +ball.y.toFixed(2), ball.inAir ? 1 : 0],
      holder: ball.holder ? ball.holder.slot : null, holderTeam: ball.holder ? ball.holder.team : null, phase,
      ...(phase === 'dropback' && ball.holder === qb && !scrambled && (qb.windup || (qr.cur && !qr.decision)) ? { read: qb.windup ? qb.windup.r.slot : qr.cur.slot } : {}),
      ...(TRACE ? { dbg: defs.map((d) => [d.slot, d.why || null, d.why2 || null, d.aim ? +d.aim[0].toFixed(2) : null, d.aim ? +d.aim[1].toFixed(2) : null, d.recognised ? 1 : 0, d.why === 'zone' && d.zoneInfo || null, d.pursuitAt === t && d.pursuitInfo || null, d.read ? { b: +d.read.b.toFixed(2), line: d.read.cues?.line ?? null, qb: d.read.cues?.qb ?? null, mesh: d.read.cues?.mesh ? 1 : 0, ball: d.read.cues?.handSeen ? 1 : 0, release: d.read.cues?.release ? 1 : 0, manKey: d.read.cues?.manKey ? 1 : 0, conflict: d.read.cues?.conflict ? 1 : 0, delay: d.read.cues?.delay ?? null, state: d.read.committed ? 'run' : passShown(d) ? 'pass' : 'reading' } : null]) } : {}), // developer trace: decision, detail, aim, run recognised // the QB's current read, then his target through the wind-up (live indicator, GDD §53)
    });
  }
  // The motion before the snap, drawn as frames with negative time: only the motion man moves.
  if (motion?.man) {
    recordFrame(); const snap = frames.pop(); const steps = Math.max(1, Math.round(motion.duration / (DT * frameEvery)));
    for (let i = 0; i < steps; i++) {
      const k = i / steps, mx = motion.from[0] + (motion.to[0] - motion.from[0]) * k, my = motion.from[1] + (motion.to[1] - motion.from[1]) * k;
      frames.push({ ...snap, t: +(-motion.duration * (1 - k)).toFixed(2), off: snap.off.map((p) => (p[0] === motion.slot ? [p[0], +mx.toFixed(2), +my.toFixed(2), 0, 0] : p)), motion: true });
    }
  }
  recordFrame();
  let tick = 0; let forked = false;
  while (!result && t < maxTime) {
    tick += 1; t = tick * DT;
    // AI Testing Lab rollouts: the play is identical up to the decision point, then the physics draws from a fresh stream.
    if (options.fork && !forked && t >= options.fork.at) { rng = createRng(options.fork.seed); forked = true; }
    for (const a of actors) { const h = history.get(a); h.push({ x: a.x, y: a.y }); if (h.length > 40) h.shift(); }
    { // The quarterback's facing (v42.12): the direction his head (or, in his throwing motion, his shoulders) points. This is what a
      // defender can see; which receiver he is reading, or has decided to throw to, is never exposed to the defense.
      const fr = ball.holder === qb && phase === 'dropback' && !scrambled ? (qb.windup ? qb.windup.r : qr.cur ? bySlot.off[qr.cur.slot] : null) : null;
      facingHist.push(fr ? { ang: Math.atan2(fr.y - qb.y, fr.x - qb.x), windup: !!qb.windup, qx: qb.x, qy: qb.y } : null); if (facingHist.length > 40) facingHist.shift();
    }
    if (tick === 1) for (const a of actors) snapPos.set(a, { x: a.x, y: a.y });

    if (tick === 4) for (const a of actors) { if (a.ability?.aura) abilityUsed(a, 'aura'); if (a.overcharged) abilityUsed(a, 'overcharge'); if (a.sovereignQ4 && !isRun) abilityUsed(a, 'sovereign'); }
    // Dragon's Roar: at the snap, the lineman across from him is slow to engage.
    if (tick === 1) for (const d of defs) if (d.ability?.roar) {
      const across = offs.filter((o) => ['block', 'release', 'fake', 'run_block', 'pull'].includes(o.assignment?.a)).sort((p, q) => Math.abs(p.y - d.y) - Math.abs(q.y - d.y))[0];
      if (across) { across.roarUntil = d.ability.roar; setStatus(across, 'cower', d.ability.roar); abilityUsed(d, 'roar'); abilityOutcome('roared', d, `${d.name} roars; ${across.name} flinches`, { victim: across.slot }); }
    }
    // Ancient Grove: defenders within 5 yards of him get +5 Awareness, recomputed as they move (and never bite: groveGuards).
    for (const g of actors) if (g.ability?.grove) {
      let lifted = false;
      for (const b of teammates(g.team)) { if (b === g) continue; const near = dist(b, g) <= g.ability.grove.radius; b.attrs.awareness = Math.min(99, b.baseAwareness + (near ? g.ability.grove.awareness : 0)); lifted ||= near; }
      if (lifted && tick > 2) abilityUsed(g, 'grove');
    }
    for (const a of offs) offenseTick(a);
    for (const d of defs) updateRead(d);
    for (const d of defs) defenseTick(d);
    for (const a of actors) if (!a.engaged) integrate(a);
    separate();
    {
      const c = ball.holder;
      // Landslide: a run that crosses the line within 2.5 yards of him gets his two extra yards when tackled.
      if (c && c.team === 'off' && phase === 'carry' && !stats.receiver && !c.landslideChecked && c.x >= 0) { c.landslideChecked = true; c.landslide = offs.find((o) => o !== c && o.ability?.landslide && Math.abs(o.y - c.y) <= 2.5) || null; }
      // Quake Step: a hard cut makes every defender within 2 yards stumble for a moment.
      if (c?.ability?.quakeStep && phase === 'carry') {
        const sp = Math.hypot(c.vx, c.vy); const pv = c.prevV;
        if (pv && sp > 2.5 && pv.s > 2.5) { const cos = (c.vx * pv.x + c.vy * pv.y) / (sp * pv.s); if (cos < 0.92) quake(c); }
        if (tick % 4 === 0) c.prevV = { x: c.vx, y: c.vy, s: sp };
      }
    }

    // Ball
    if (ball.inAir) {
      ball.flight += DT;
      const k = clamp(ball.flight / Math.max(0.05, ball.flightTime), 0, 1);
      ball.x = ball.from.x + (ball.landing.x - ball.from.x) * k; ball.y = ball.from.y + (ball.landing.y - ball.from.y) * k;
      if (k >= 1) resolveArrival();
    } else if (ball.holder) { ball.x = ball.holder.x; ball.y = ball.holder.y; }

    // Contact
    const c = ball.holder;
    if (!result && c) {
      if (c === qb && phase !== 'carry' && !scrambled) { if (!dry) for (const d of defs) { if (trySack(d)) break; } }
      else { for (const d of opponents(c.team)) { if (tryTackle(d, c)) break; } }
    }
    // Boundaries and scores for the carrier.
    if (!result && ball.holder) {
      const h = ball.holder;
      if (h.y <= B.left || h.y >= B.right) { const yy = h.y <= B.left ? B.left : B.right; endPlay('out_of_bounds', h.x, yy); log(`${h.name} steps out of bounds`, { kind: 'oob' }); }
      else if (h.team === 'off' && h.x >= B.goal && (h !== qb || scrambled || phase === 'carry')) { endPlay('touchdown', h.x, h.y); log(`${h.name} reaches the end zone. TOUCHDOWN`, { kind: 'touchdown' }); }
      else if (h.team === 'def' && h.x <= B.ownGoal) { endPlay('touchdown', h.x, h.y, { defensiveScore: true }); log(`${h.name} returns it all the way. TOUCHDOWN`, { kind: 'touchdown' }); }
      else if (h.team === 'off' && h.x <= B.ownEndLine + 0.2) { endPlay('safety', h.x, h.y); log('Carrier runs out of the back of the end zone. SAFETY', { kind: 'safety' }); }
    }
    if (options.debugSlot) { const d = actors.find((a) => a.slot === options.debugSlot); if (d) log(`dbg ${d.slot} x=${d.x.toFixed(2)} y=${d.y.toFixed(2)} v=${Math.hypot(d.vx, d.vy).toFixed(2)} stun=${d.stun.toFixed(2)} eng=${d.engaged ? d.engaged.slot : '-'} st=${d.state} ne=${d.noEngage.toFixed(2)}`, { kind: 'debug' }); }
    if (dry && !result) {
      // Done when every route runner has reached the end of his route and any carrier the end of his path.
      const unfinished = (a) => {
        const pts = a.assignment.points; if (!pts || a.wp >= pts.length) return false;
        if (a.wp < pts.length - 1) return true;
        const last = pts[pts.length - 1], prev = pts[pts.length - 2] || last; // on the last leg: done once at or past its end
        return dist(a, { x: last[0], y: last[1] }) >= 2 && ((a.x - last[0]) * (last[0] - prev[0]) + (a.y - last[1]) * (last[1] - prev[1])) < 0;
      };
      const runner = (a) => ['carry', 'keep', 'option'].includes(a.assignment.a);
      const moving = offs.some((a) => unfinished(a) && (a.assignment.a === 'route' || (ball.holder === a && runner(a)) || (!handoffDone && a.assignment.a === 'carry')));
      if (!moving && t >= 1.5) dryDoneAt ??= t;
      if ((dryDoneAt != null && t - dryDoneAt >= 0.6) || t >= dryMax) { result = 'dry_run'; log('Walk-through complete', { kind: 'dry_run' }); }
    }
    if (tick % frameEvery === 0 || result) recordFrame();
  }
  if (!result) { result = 'guard'; log('Simulation guard reached', { kind: 'guard' }); }
  if (stats.interceptor && ['tackle', 'out_of_bounds'].includes(result)) result = 'interception';

  // ------------------------------------------------------------ outcome
  const endX = result === 'incomplete' || result === 'throwaway' ? 0 : clamp(ball.x, B.ownEndLine, B.endLine);
  const endLat = clamp(ball.y, B.left, B.right);
  const gain = ['incomplete', 'throwaway'].includes(result) ? 0 : Math.round(endX * 10) / 10;
  const endYard = clamp(ballOn + gain, -10, 110);
  stats.yac = stats.catchX != null && !['incomplete'].includes(result) ? Math.max(0, Math.round(endX - stats.catchX)) : 0;
  return {
    result, yards: Math.round(gain), endYard: Math.round(endYard * 10) / 10, endLat: Math.round((ballLat + endLat) * 10) / 10,
    frames, events, elapsed: +t.toFixed(2), seed, offensePlay: offensePlay.id, defensePlay: defensePlay.id, ballOn, ballLat,
    names: { off: Object.fromEntries(offs.map((a) => [a.slot, a.name])), def: Object.fromEntries(defs.map((a) => [a.slot, a.name])) },
    stats, memoryUsed, typeContests, turnover: ['interception', 'fumble', 'touchback_return'].includes(result) || !!stats.defensiveScore,
    touchdown: result === 'touchdown', safety: result === 'safety', bounds: B,
    qb: qr.order ? { v: QB_MODEL_VERSION, order: qr.order, reads: qr.log, decision: qr.decision, aiWould: qr.aiWould, sensedAt: qr.sensedAt, fakeAt: qr.fakeAt ?? null } : null, // the recorded read log (replays, AI Testing Lab)
  };
}

export { DT as TICK };
