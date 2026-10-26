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
  const isPlayAction = ['play_action', 'boot'].includes(qb.assignment.a);

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
  const history = new Map(actors.map((a) => [a, []]));

  // ------------------------------------------------------------ ball
  const ball = { x: qb.x, y: qb.y, holder: qb, inAir: false, from: null, to: null, flight: 0, flightTime: 0, target: null, landing: null, airYards: 0 };
  let t = 0;
  let result = null;
  let phase = isRun ? 'run' : 'dropback'; // dropback | run | air | carry | dead
  let runRecognisedAt = Infinity;
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
    if (carrier && carrier.team === 'off' && (phase === 'carry' || phase === 'run') && (d.recognised || isRun)) return { x: carrier.x, y: carrier.y };
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
    steer(a, goalX, a.laneY, 0.94, 0.3);
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
    ball.holder = to; handoffDone = true; phase = 'carry'; stats.carrier = to.slot;
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
        if (!rb) { ball.holder = a; handoffDone = true; phase = 'carry'; stats.carrier = a.slot; a.wp = 2; return; }
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
          if (!attacking) { ball.holder = a; handoffDone = true; phase = 'carry'; stats.carrier = a.slot; a.wp = 2; log(`${a.name} reads ${key ? key.name : 'nobody'} and keeps`, { kind: 'keep', read: key?.slot || null }); return; }
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
  function pursue(d) {
    const c = ball.holder;
    if (!c) return;
    // True intercept point for the carrier's current velocity; awareness blends it with plain chasing.
    const vp = d.maxSpeed * 1.05;
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
    steer(d, aw * tx + (1 - aw) * (c.x + c.vx * chaseLead), aw * ty + (1 - aw) * (c.y + c.vy * chaseLead), 1.05, 0.2);
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
  function defenseTick(d) {
    const asg = d.assignment;
    const mark = TRACE ? (m, x) => { d.why = m; d.why2 = x ?? null; } : () => {}; // developer trace: the branch he acted on
    if (d.engaged) { mark('engaged'); return; } // movement handled by the blocker's engagement
    const c = ball.holder;
    if (c && c.team === 'def') { // we have the ball: escort or carry
      if (c === d) { mark('carry'); carrierMove(d); return; }
      mark('escort'); escortBlock(d); return;
    }
    if (ball.inAir) {
      const toBall = dist(d, ball.landing);
      // Everybody drives to the ball once it is thrown; the closest defenders sprint, the rest rally.
      const baseBreak = asg.a === 'man' ? 9 : asg.role === 'deep' ? 12 : 11; // zone defenders read the quarterback and break on the throw
      const breakRadius = baseBreak + (d.ability?.breakRadius || 0);
      // The man defender on the target, beaten by a break and thrown behind: he plants to come back, the same burst as a recognised route break, once (v42.8).
      if (asg.a === 'man' && bySlot.off[manKeys[asg.key]] === ball.target && (d.vx * (ball.landing.x - d.x) + d.vy * (ball.landing.y - d.y)) < 0 && Math.hypot(d.vx, d.vy) > 3 && !(d.breakPlant > t - 1.0)) { d.breakPlant = t; d.cutUntil = t + 0.35; }
      if (toBall < breakRadius) { mark('ball', 'break'); if (toBall >= baseBreak) abilityUsed(d, 'breakRadius'); steer(d, ball.landing.x, ball.landing.y, 1, 0.2); return; }
      if (!['rush', 'contain'].includes(asg.a) || d.x < ball.landing.x) { mark('ball', 'rally'); steer(d, ball.landing.x, ball.landing.y, 0.95, 0.2); return; }
    }
    // Run recognition.
    const runLive = (phase === 'carry' || (phase === 'run' && handoffDone)) && c && c.team === 'off';
    if (runLive && !d.recognised) {
      const expectRun = defensePlay.tags.includes('run') || defensePlay.tags.includes('goalline');
      const rooted = groveGuards(d); if (rooted && (isPlayAction || offensePlay.tags.includes('misdirection'))) abilityUsed(rooted, 'grove');
      const delay = 0.3 + 0.5 * (1 - norm(d.attrs.awareness)) - reactionOf(d) + (isPlayAction && t < 1.6 && !d.ability?.noPlayActionBite && !rooted ? 0.3 * (d.ability?.echoRead ?? 1) : 0) + (offensePlay.tags.includes('misdirection') && !rooted ? 0.3 : 0) + (asg.a === 'man' ? 0.35 : 0) - (expectRun ? 0.3 : 0); // a run call keys the run
      if (isPlayAction && t < 1.6 && d.ability?.noPlayActionBite && !d.recognised) abilityUsed(d, 'noPlayActionBite');
      if (t - runRecognisedAt >= delay) d.recognised = true;
    }
    if (runLive && d.recognised) {
      // Run fit: until the carrier crosses the line, second-level defenders fill their lane rather than chasing the ball.
      const isFront = ['rush', 'contain'].includes(asg.a);
      if (!isFront && c.x < 1.5) {
        const deep = asg.a === 'zone' && asg.role === 'deep';
        const fitX = deep ? 6.5 : (defensePlay.tags.includes('run') || defensePlay.tags.includes('goalline')) ? 0.5 : 1.5; // run calls meet the back at the line
        // Second-level defenders flow to the ball: a linebacker fills the gap the back chooses, not just his own.
        const flow = deep ? 2.5 : 5;
        const shade = clamp(c.y + c.vy * 0.3 - d.y, -flow, flow) * (0.55 + 0.45 * norm(d.attrs.awareness));
        mark('run-fit'); steer(d, fitX, d.y + shade, 1, 0.3); return;
      }
      mark('pursue', 'run'); pursue(d); return;
    }
    // Play-action bite: non-rushing defenders step up before they recognise the pass.
    if (isPlayAction && !['rush', 'contain', 'man'].includes(asg.a) && !groveGuards(d)) { // Ancient Grove: nobody near him bites
      const deepDefender = asg.a === 'zone' && asg.role === 'deep';
      const biteFor = (deepDefender ? 0.3 : 0.9) * (1.3 - norm(d.attrs.awareness)) * (d.ability?.echoRead ?? 1); // Echo Read: bites half as long
      if (d.ability?.echoRead) abilityUsed(d, 'echoRead');
      if (t < biteFor) { mark('pa-bite'); steer(d, d.x - 2, d.y, deepDefender ? 0.3 : 0.6, 0.3); return; }
    }
    switch (asg.a) {
      case 'rush': {
        const gap = asg.points[1];
        if (d.state === 'init') d.state = 'gap';
        if (d.state === 'gap') { mark('rush', 'gap'); steer(d, gap[0], gap[1], 1, 0.4); if (dist(d, { x: gap[0], y: gap[1] }) < 1 || t > 0.8) d.state = 'free'; return; }
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
        if (!target) { mark('man', 'none'); steer(d, 6, d.y * 0.6, 0.8, 0.3); return; } // nobody to cover (three-receiver set): sit in the short middle
        // A back who stays in to block frees his man: "green dog", add to the rush.
        if (asg.key === 'back' && target.assignment?.a === 'block' && t > 0.5) { if (qb && ball.holder === qb) { mark('man', 'green-dog'); pursue(d); return; } }
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
        const [zx, zy] = asg.at;
        const radius = (asg.role === 'deep' ? 12 : asg.role === 'middle' ? 7.5 : 7) + (d.ability?.zoneRange || 0);
        const inZone = (r) => asg.role === 'deep' ? (Math.abs(r.y - zy) < radius && r.x > 5) : dist(r, { x: zx, y: zy }) < radius;
        const threats = receivers.map((s) => bySlot.off[s]).filter((r) => r && inZone(r) && r.x > -1);
        if (threats.length && dist(d, { x: zx, y: zy }) < radius + 1) {
          const r = threats.sort((p, q) => (q.x - p.x))[0]; mark('zone', `${r.slot} (${threats.length} in zone)`);
          const p = trailPosition(d, r);
          const antic = 0.15 + 0.25 * norm(d.attrs.coverage);
          if (asg.role === 'deep') {
            // Stay on top and keep inside leverage toward the zone centre; never abandon the zone.
            const inward = Math.sign(zy - r.y) || (zy >= 0 ? 1 : -1);
            const ty = clamp(p.y + r.vy * antic + inward * 1.2, zy - 10, zy + 10);
            steer(d, Math.max(p.x + r.vx * antic + 2.0, zx - 3), ty, 0.98, 0.3);
          } else steer(d, p.x + r.vx * antic * 0.6 + 0.3, p.y + r.vy * antic * 0.6, 0.95, 0.3); // underneath zones squeeze the receiver harder
          return;
        }
        mark('zone', 'spot'); steer(d, zx, zy, 0.95, 0.5); return;
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
    if (d.ability?.permafrost && !c.permafrosted && (isRun || handoffDone) && !stats.receiver) {
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
      ...(TRACE ? { dbg: defs.map((d) => [d.slot, d.why || null, d.why2 || null, d.aim ? +d.aim[0].toFixed(2) : null, d.aim ? +d.aim[1].toFixed(2) : null, d.recognised ? 1 : 0]) } : {}), // developer trace: decision, detail, aim, run recognised // the QB's current read, then his target through the wind-up (live indicator, GDD §53)
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
    if (isRun && runRecognisedAt === Infinity) runRecognisedAt = 0;
    if (!isRun && handoffDone && runRecognisedAt === Infinity) runRecognisedAt = t;
    if (phase === 'carry' && runRecognisedAt === Infinity) runRecognisedAt = t;

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
