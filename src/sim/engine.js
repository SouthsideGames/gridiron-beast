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
//     options: { forcedTarget, maxTime, frameEvery, edge, memory, dryRun }
//       memory: { drive, half, quarter, used: {key: true} } ability uses across plays (GDD §23.11)
//       dryRun: Playbook Audit only, never in a game. { noDefense } runs the offense with nobody
//         across from it; without noDefense the defense plays while the QB holds the ball.
//         Either way nobody throws, nobody is sacked and the result is 'dry_run'.
//   })
// Output: { result, yards, endYard, endLat, frames, events, elapsed, ... }
// result ∈ tackle | sack | incomplete | touchdown | out_of_bounds | interception
//          | fumble | safety | throwaway | touchback_return | guard | dry_run (audit only)

import { createRng } from '../core/rng.js';
import { boundsFor, FIELD, clamp } from '../core/field.js';
import { manKeyTargets, eligibleReceivers } from '../data/playbook.js';
import { ABILITIES, speciesEffect } from '../data/monsters.js';
import { QUICK_ROUTES, SETTLE_ROUTES } from '../data/routes.js';

const DT = 0.05;
const DEFAULT_ATTRS = { speed: 60, agility: 60, strength: 60, awareness: 60, catching: 60, arm: 60, accuracy: 60, blocking: 60, tackling: 60, coverage: 60, durability: 60, kicking: 60 };
const DROP_TIME = { quick: 0.55, three: 1.1, five: 1.7, pa: 1.5 };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const sigmoid = (v) => 1 / (1 + Math.exp(-v));
const norm = (v) => clamp(v, 1, 99) / 99;

const EDGE_ATTRS = ['speed', 'agility', 'strength', 'awareness', 'catching', 'accuracy', 'tackling', 'coverage', 'blocking'];
export function simulatePlay({ offensePlay, defensePlay, offense = {}, defense = {}, ballOn = 25, ballLat = 0, seed = 1, options = {} }) {
  const rng = createRng(seed);
  const B = boundsFor(ballOn, ballLat);
  const maxTime = options.maxTime ?? 20;
  const frameEvery = options.frameEvery ?? 2;
  const dry = options.dryRun || null; // Playbook Audit walk-through (see header)
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
      team, slot, mid, overcharged, sovereignQ4, baseAwareness: attrs.awareness, attrs, ability, abilityName, abilityKind, name: input?.name || slot, reactionBonus: 0, auraAttrs: null,
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
  function steer(a, tx, ty, speedScale = 1, arriveRadius = 0.6) {
    if (a.stun > 0) { a.vx *= 0.93; a.vy *= 0.93; return; } // off balance: coasting, cannot steer
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    let desired = a.maxSpeed * speedScale * burst(a) * speedMods(a);
    if (a.slowUntil > t) desired *= 0.7; // Bramble Shell: a tackler who missed him is slowed for a moment
    // Daybreak: anyone chasing from behind is held below his pace, so he cannot be run down.
    const h = ball.holder; if (h?.daybreak && a.team !== h.team && (a.x - h.x) * (h.team === 'off' ? 1 : -1) < 0) desired = Math.min(desired, h.maxSpeed * 0.9);
    if (d < arriveRadius) desired = 0;
    const ux = d > 0 ? dx / d : 0, uy = d > 0 ? dy / d : 0;
    const dvx = ux * desired - a.vx, dvy = uy * desired - a.vy;
    const dv = Math.hypot(dvx, dvy), maxDv = a.accel * DT;
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
    if (soft && !rng.chance(0.25 + 0.5 * norm(blocker.attrs.blocking))) { blocker.noEngage = 0.3; return false; }
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
    const edge = (dScore - bScore) / 100; // positive when the defender is winning
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
  function followPath(a, points, speedScale = 1) {
    if (a.wp >= points.length) return true;
    const [tx, ty] = points[a.wp];
    steer(a, tx, ty, speedScale, 0.7);
    if (dist(a, { x: tx, y: ty }) < 0.8) a.wp += 1;
    return a.wp >= points.length;
  }
  function routeEndTarget(a) {
    const pts = a.assignment.points, last = pts[pts.length - 1], prev = pts[pts.length - 2] || last;
    const dx = last[0] - prev[0], dy = last[1] - prev[1], d = Math.hypot(dx, dy) || 1;
    const r = a.assignment.r;
    if (SETTLE_ROUTES.has(r)) return [last[0], last[1]]; // settle
    return [last[0] + (dx / d) * 6, clamp(last[1] + (dy / d) * 6, B.left + 1.5, B.right - 1.5)]; // keep working
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
        score -= Math.max(0, 4 - lat) * (1.2 - ahead / (look * 1.3));
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
  function carrierMove(a) {
    const dir = a.team === 'off' ? 1 : -1;
    const path = a.assignment?.points;
    const onDesignedPath = a.team === 'off' && path && ['carry', 'keep', 'option'].includes(a.assignment.a) && a.wp < path.length && a.x * dir < 1.5;
    if (onDesignedPath) { followPath(a, path, 1); return; }
    // Walk-through: the carrier runs his whole drawn path and stops at its end.
    if (dry && a.team === 'off' && path && ['carry', 'keep', 'option'].includes(a.assignment.a)) { if (a.wp === path.length - 1 && dist(a, { x: path[a.wp][0], y: path[a.wp][1] }) < 2) a.wp = path.length; if (a.wp < path.length) followPath(a, path, 1); else steer(a, a.x, a.y, 0, 0.3); return; }
    if (a.laneTimer === undefined || a.laneTimer <= 0) { a.laneY = laneChoice(a); a.laneTimer = 0.25; }
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
    const goalX = a.team === 'off' ? B.endLine : B.ownEndLine;
    // Carrying the ball costs a little top speed; pursuers run with full effort.
    steer(a, goalX, a.laneY, 0.94, 0.3);
  }

  function offenseTick(a) {
    const asg = a.assignment;
    if (ball.holder === a && (phase === 'carry' || a !== qb)) { carrierMove(a); return; }
    if (a.engaged) { resolveEngagement(a); return; }
    const someoneCarrying = phase === 'carry' || (phase === 'run' && handoffDone) || (ball.holder && ball.holder !== qb);
    if (a === qb && (ball.inAir || (ball.holder && ball.holder !== qb) || result)) { steer(a, a.x, a.y, 0, 0.2); return; }
    if (ball.holder && ball.holder.team === 'off' && ball.holder !== qb && a !== qb && !dry?.noDefense) { escortBlock(a); return; } // walk-through: blockers stay on their drawn assignments
    if (ball.holder && ball.holder.team === 'def') { pursue(a); return; }
    if (ball.inAir) {
      if (ball.target === a) { steer(a, ball.landing.x, ball.landing.y, 1, 0.2); return; }
      // Other receivers slow and turn; blockers hold.
      if (asg.a === 'route') { steer(a, a.x, a.y, 0.3, 0.2); return; }
    }
    switch (asg.a) {
      case 'route': {
        if (a.wp < asg.points.length) followPath(a, asg.points, 1); else { const [tx, ty] = routeEndTarget(a); steer(a, tx, ty, 0.8, 0.4); }
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
        const hold = (qb.assignment.hold || 1.4) * 0.55;
        if (t < hold) { passBlock(a); return; }
        runBlock(a, asg.to, 6); return;
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
  function qbHandoff(a) {
    const rb = offs.find((o) => ['carry'].includes(o.assignment.a));
    if (!handoffDone) {
      if (rb) steer(a, rb.x, rb.y, 1, 0.3); else steer(a, a.x, a.y, 0, 0.2);
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
    if (t < Math.max(readyAt, hold)) return; // set the feet first / let a screen develop
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
        // Get rid of it if someone is reasonably open; otherwise scramble, throw it away, or eat the sack.
        if (best && best.o >= 1.2 && rng.chance(0.5 + 0.35 * norm(a.attrs.awareness))) { throwTo(a, best.r, true); return; }
        if (!scrambled && norm(a.attrs.agility) > 0.45 && rng.chance(0.3)) { scramble(a); return; }
        if (rng.chance(0.12)) { throwAway(a); return; }
      }
      if (t > dropTime + 2.6) {
        if (best && best.o >= 0.8 && rng.chance(0.6)) { throwTo(a, best.r, pressured); return; }
        throwAway(a); return;
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
  function throwTo(passer, r, pressured) {
    // Wind-up: the ball leaves the hand a beat later; a rusher can still get home.
    if (!passer.windup) { passer.windup = { r, pressured, at: t + 0.14 + 0.1 * (1 - norm(passer.attrs.arm)) }; return; }
    passer.windup = null;
    const d = dist(passer, r);
    const velocity = 17 + 13 * norm(passer.attrs.arm);
    const travel = d / velocity + 0.1;
    const lead = predictReceiver(r, travel);
    let acc = passer.attrs.accuracy, arm = passer.attrs.arm;
    if (passer.ability?.deepThrow && lead.x - passer.x >= 15) { acc += passer.ability.deepThrow.accuracy; arm += passer.ability.deepThrow.arm; abilityUsed(passer, 'deepThrow'); }
    if (passer.ability?.openAccuracy && !defs.some((d) => dist(d, lead) < 2)) { acc += passer.ability.openAccuracy; abilityUsed(passer, 'openAccuracy'); }
    if (passer.ability?.throwVelocity) { arm = Math.min(99, arm * (1 + passer.ability.throwVelocity)); abilityUsed(passer, 'throwVelocity'); }
    const airD = lead.x - passer.x;
    const deepK = airD > 20 ? 1 + (airD - 20) * 0.03 : 1; // the deep ball is the hardest throw in football
    const err = (1.2 + d * 0.07) * deepK * (1.3 - norm(acc)) * (pressured ? 1.5 : 1) * (Math.hypot(passer.vx, passer.vy) > 1 ? 1.2 : 1);
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
  function throwAway(passer) {
    result = 'throwaway'; stats.passer = passer.slot; ball.holder = null; ball.inAir = false;
    log(`${passer.name} throws it away`, { kind: 'throwaway' });
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
  function defenseTick(d) {
    const asg = d.assignment;
    if (d.engaged) return; // movement handled by the blocker's engagement
    const c = ball.holder;
    if (c && c.team === 'def') { // we have the ball: escort or carry
      if (c === d) { carrierMove(d); return; }
      escortBlock(d); return;
    }
    if (ball.inAir) {
      const toBall = dist(d, ball.landing);
      // Everybody drives to the ball once it is thrown; the closest defenders sprint, the rest rally.
      const baseBreak = asg.a === 'man' ? 9 : asg.role === 'deep' ? 12 : 11; // zone defenders read the quarterback and break on the throw
      const breakRadius = baseBreak + (d.ability?.breakRadius || 0);
      if (toBall < breakRadius) { if (toBall >= baseBreak) abilityUsed(d, 'breakRadius'); steer(d, ball.landing.x, ball.landing.y, 1, 0.2); return; }
      if (!['rush', 'contain'].includes(asg.a) || d.x < ball.landing.x) { steer(d, ball.landing.x, ball.landing.y, 0.95, 0.2); return; }
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
        steer(d, fitX, d.y + shade, 1, 0.3); return;
      }
      pursue(d); return;
    }
    // Play-action bite: non-rushing defenders step up before they recognise the pass.
    if (isPlayAction && !['rush', 'contain', 'man'].includes(asg.a) && !groveGuards(d)) { // Ancient Grove: nobody near him bites
      const deepDefender = asg.a === 'zone' && asg.role === 'deep';
      const biteFor = (deepDefender ? 0.3 : 0.9) * (1.3 - norm(d.attrs.awareness)) * (d.ability?.echoRead ?? 1); // Echo Read: bites half as long
      if (d.ability?.echoRead) abilityUsed(d, 'echoRead');
      if (t < biteFor) { steer(d, d.x - 2, d.y, deepDefender ? 0.3 : 0.6, 0.3); return; }
    }
    switch (asg.a) {
      case 'rush': {
        const gap = asg.points[1];
        if (d.state === 'init') d.state = 'gap';
        if (d.state === 'gap') { steer(d, gap[0], gap[1], 1, 0.4); if (dist(d, { x: gap[0], y: gap[1] }) < 1 || t > 0.8) d.state = 'free'; return; }
        if (qb && ball.holder === qb) { pursue(d); return; }
        if (c) { pursue(d); return; }
        steer(d, qb.x, qb.y, 1, 0.3); return;
      }
      case 'contain': {
        const pt = asg.points[1];
        const carrier = c || qb;
        const outside = carrier && Math.abs(carrier.y) > Math.abs(pt[1]) - 2 && Math.sign(carrier.y) === Math.sign(pt[1]);
        const crossed = carrier && carrier.x > 0.5;
        if (outside || crossed || (scrambled)) { pursue(d); return; }
        steer(d, pt[0], pt[1], 0.9, 0.4); return;
      }
      case 'man': {
        const target = bySlot.off[manKeys[asg.key]];
        if (!target) { steer(d, 6, d.y * 0.6, 0.8, 0.3); return; } // nobody to cover (three-receiver set): sit in the short middle
        // A back who stays in to block frees his man: "green dog", add to the rush.
        if (asg.key === 'back' && target.assignment?.a === 'block' && t > 0.5) { if (qb && ball.holder === qb) { pursue(d); return; } }
        const p = trailPosition(d, target);
        // Run with the receiver: react to his breaks late (coverage), but anticipate his current line.
        const antic = 0.12 + 0.3 * norm(d.attrs.coverage);
        const inside = target.y > 0 ? -0.6 : 0.6;
        // Keep leverage on top of the receiver; never give up the cushion by running at him.
        const onTop = p.x + target.vx * antic + 0.8;
        const ty = p.y + target.vy * antic + inside;
        if (onTop >= d.x) { steer(d, onTop, ty, 1, 0.3); return; }
        // Receiver still in front: shuffle laterally, backpedal only as he closes.
        const closing = d.x - p.x < 3.5;
        steer(d, closing ? d.x - 0.6 : d.x, ty, closing ? 0.55 : 0.35, 0.3); return;
      }
      case 'zone': {
        const [zx, zy] = asg.at;
        const radius = (asg.role === 'deep' ? 12 : asg.role === 'middle' ? 7.5 : 7) + (d.ability?.zoneRange || 0);
        const inZone = (r) => asg.role === 'deep' ? (Math.abs(r.y - zy) < radius && r.x > 5) : dist(r, { x: zx, y: zy }) < radius;
        const threats = receivers.map((s) => bySlot.off[s]).filter((r) => r && inZone(r) && r.x > -1);
        if (threats.length && dist(d, { x: zx, y: zy }) < radius + 1) {
          const r = threats.sort((p, q) => (q.x - p.x))[0];
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
        steer(d, zx, zy, 0.95, 0.5); return;
      }
      case 'spy': {
        if (c === qb && qb.x > 0) { pursue(d); return; }
        steer(d, 3, qb.y, 0.9, 0.5); return;
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
    const tackleScore = d.attrs.tackling * 0.55 + d.attrs.strength * 0.3 + closing * 1.2 + gang * 12;
    const carryStrength = c.attrs.strength + (c.ability?.carryStrength && Math.abs(c.y) < 6 ? c.ability.carryStrength : 0);
    const carryScore = carryStrength * 0.5 + c.attrs.agility * 0.3 + c.attrs.speed * 0.1 + (c.team === 'def' ? -8 : 0);
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
    const p = clamp(0.62 + 0.3 * norm(d.attrs.tackling) - 0.35 * norm(qb.attrs.agility), 0.25, 0.92);
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
    let contested = nearest && nearest.dd < (deep ? 1.6 : 1.1); // at full sprint a trailing defender a step away still plays the ball
    // Thunderclap: a defender trailing the receiver (behind him on his path) cannot break up a quick pass.
    const trailing = nearest && ((nearest.d.x - r.x) * r.vx + (nearest.d.y - r.y) * r.vy) < 0;
    const thunderShield = ball.thunder && ball.quick && trailing && nearest.dd < (deep ? 1.6 : 1.1);
    if (thunderShield) { contested = false; abilityOutcome('no_breakup', qb, `${qb.name}'s Thunderclap beats ${nearest.d.name} to the spot`, { victim: nearest.d.slot }); }
    // Coverage responsibility: the man defender assigned to this receiver; in zone, only a defender close enough to have had him (within 2.5 yards); otherwise nobody, the zone was open.
    { const manD = defs.find((d) => d.assignment?.a === 'man' && bySlot.off[manKeys[d.assignment.key]] === r);
      if (manD) { stats.coverBy = manD.slot; stats.coverKind = 'man'; }
      else if (nearest && nearest.dd <= 2.5 && nearest.d.assignment?.a === 'zone') { stats.coverBy = nearest.d.slot; stats.coverKind = 'zone'; }
      else { stats.coverBy = null; stats.coverKind = 'open'; } }
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
      catchP *= 0.7 + 0.22 * norm(rCatch) - 0.22 * norm(dCover);
      if (nearest.d.ability?.wingShadow) { catchP *= 1 - nearest.d.ability.wingShadow; abilityUsed(nearest.d, 'wingShadow'); } // Wing Shadow: contested catches against him are 15% harder
      if (nearest.d.ability?.contest || nearest.d.ability?.manCoverage) abilityUsed(nearest.d, nearest.d.ability.contest ? 'contest' : 'manCoverage'); if (r.ability?.catchContest) abilityUsed(r, 'catchContest');
    }
    if (nearest && nearest.dd < 1.0 && nearest.dd < dr && !thunderShield) {
      const pickCatching = nearest.d.attrs.catching + (nearest.d.ability?.pickCatching || 0);
      let pickP = (0.05 + 0.22 * norm(pickCatching)) * (dr > catchRadius ? 1.15 : 0.5);
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
  let tick = 0;
  while (!result && t < maxTime) {
    tick += 1; t = tick * DT;
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
    stats, memoryUsed, turnover: ['interception', 'fumble', 'touchback_return'].includes(result) || !!stats.defensiveScore,
    touchdown: result === 'touchdown', safety: result === 'safety', bounds: B,
  };
}

export { DT as TICK };
