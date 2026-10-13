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
//     options: { forcedTarget, maxTime, frameEvery }
//   })
// Output: { result, yards, endYard, endLat, frames, events, elapsed, ... }
// result ∈ tackle | sack | incomplete | touchdown | out_of_bounds | interception
//          | fumble | safety | throwaway | touchback_return | guard

import { createRng } from '../core/rng.js';
import { boundsFor, FIELD, clamp } from '../core/field.js';
import { manKeyTargets, eligibleReceivers } from '../data/playbook.js';
import { ABILITIES } from '../data/monsters.js';

const DT = 0.05;
const DEFAULT_ATTRS = { speed: 60, agility: 60, strength: 60, awareness: 60, catching: 60, arm: 60, accuracy: 60, blocking: 60, tackling: 60, coverage: 60, durability: 60, kicking: 60 };
const DROP_TIME = { quick: 0.55, three: 1.1, five: 1.7, pa: 1.5 };

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const sigmoid = (v) => 1 / (1 + Math.exp(-v));
const norm = (v) => clamp(v, 1, 99) / 99;

export function simulatePlay({ offensePlay, defensePlay, offense = {}, defense = {}, ballOn = 25, ballLat = 0, seed = 1, options = {} }) {
  const rng = createRng(seed);
  const B = boundsFor(ballOn, ballLat);
  const maxTime = options.maxTime ?? 20;
  const frameEvery = options.frameEvery ?? 2;
  const events = [];
  const log = (text, data = {}) => events.push({ t: +t.toFixed(2), text, ...data });

  // ------------------------------------------------------------ actors
  const actors = [];
  const bySlot = { off: {}, def: {} };
  const makeActor = (team, slot, play, input) => {
    const attrs = { ...DEFAULT_ATTRS, ...(input?.attrs || {}) };
    const ability = input?.ability ? ABILITIES[input.ability]?.effect || null : null;
    const [x, y] = play.align[slot];
    const a = {
      team, slot, attrs, ability, name: input?.name || slot,
      x, y, vx: 0, vy: 0, maxSpeed: 5.4 + 4.1 * norm(attrs.speed), accel: 9 + 11 * norm(attrs.agility),
      assignment: play.assignments[slot], wp: 0, state: 'init', engaged: null, stun: 0, noEngage: 0,
      target: null, route: null, brokeTackle: 0, recognised: false, reactTimer: 0,
    };
    actors.push(a); bySlot[team][slot] = a; return a;
  };
  for (const slot of offensePlay.onField) makeActor('off', slot, offensePlay, offense[slot]);
  for (const slot of defensePlay.onField) makeActor('def', slot, defensePlay, defense[slot]);
  const offs = actors.filter((a) => a.team === 'off');
  const defs = actors.filter((a) => a.team === 'def');
  const qb = bySlot.off.QB;
  const manKeys = manKeyTargets(offensePlay);
  const receivers = eligibleReceivers(offensePlay);
  const isRun = offensePlay.type === 'run';
  const isPlayAction = ['play_action', 'boot'].includes(qb.assignment.a);

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
  const stats = { passer: null, target: null, receiver: null, carrier: null, tackler: null, airYards: 0, yac: 0, brokenTackles: 0, pressure: false, interceptor: null, forcedBy: null };
  const frames = [];
  if (qb.assignment.a === 'keep') { phase = 'carry'; stats.carrier = 'QB'; handoffDone = true; }

  const carrierTeam = () => ball.holder?.team || null;
  const opponents = (team) => (team === 'off' ? defs : offs);
  const teammates = (team) => (team === 'off' ? offs : defs);

  // ------------------------------------------------------------ movement
  function steer(a, tx, ty, speedScale = 1, arriveRadius = 0.6) {
    if (a.stun > 0) { a.vx *= 0.93; a.vy *= 0.93; return; } // off balance: coasting, cannot steer
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    let desired = a.maxSpeed * speedScale * burst(a);
    if (d < arriveRadius) desired = 0;
    const ux = d > 0 ? dx / d : 0, uy = d > 0 ? dy / d : 0;
    const dvx = ux * desired - a.vx, dvy = uy * desired - a.vy;
    const dv = Math.hypot(dvx, dvy), maxDv = a.accel * DT;
    const k = dv > maxDv ? maxDv / dv : 1;
    a.vx += dvx * k; a.vy += dvy * k;
  }
  function burst(a) { return a.ability?.burst && t < a.ability.burst.until ? 1 + a.ability.burst.speed : 1; }
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
    // Open-field blocks are hit-or-miss: the defender often slips past.
    if (soft && !rng.chance(0.25 + 0.5 * norm(blocker.attrs.blocking))) { blocker.noEngage = 0.3; return false; }
    blocker.engaged = defender; defender.engaged = blocker; defender.engagedAt = t; blocker.softBlock = soft;
    return true;
  }
  function resolveEngagement(blocker) {
    const d = blocker.engaged;
    const bScore = blocker.attrs.blocking * 0.6 + blocker.attrs.strength * 0.4;
    const dScore = d.attrs.strength * 0.5 + d.attrs.agility * 0.3 + d.attrs.tackling * 0.2 + (d.ability?.shedStrength || 0);
    const edge = (dScore - bScore) / 100; // positive when the defender is winning
    // The pair moves slowly along the defender's intent; the blocker stays between.
    const goal = defenderGoal(d);
    const gx = goal.x - d.x, gy = goal.y - d.y, gd = Math.hypot(gx, gy) || 1;
    const runFit = phase === 'carry' || phase === 'run';
    const push = clamp((runFit ? 0.2 : 0.55) + edge * 2.5, -0.5, 2.2); // yards/s the defender gains
    d.x += (gx / gd) * push * DT; d.y += (gy / gd) * push * DT;
    blocker.x = d.x + (gx / gd) * 0.9; blocker.y = d.y + (gy / gd) * 0.9;
    blocker.vx = d.vx = 0; blocker.vy = d.vy = 0;
    const shedPerSec = clamp((blocker.softBlock ? 0.9 : runFit ? 0.26 : 0.38) + edge * 1.6, 0.06, 2.2);
    if (rng.chance(shedPerSec * DT)) {
      blocker.engaged = null; d.engaged = null; blocker.stun = 0.45; d.noEngage = 0.5;
      log(`${d.name} sheds ${blocker.name}`, { kind: 'shed', by: d.slot });
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
    if (['curl', 'hitch', 'comeback', 'stick', 'screen', 'bubble'].includes(r)) return [last[0], last[1]]; // settle
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
        log(`${a.name} jukes ${nearest.name}`, { kind: 'juke', by: a.slot });
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
    if (ball.holder && ball.holder.team === 'off' && ball.holder !== qb && a !== qb) { escortBlock(a); return; }
    if (ball.holder && ball.holder.team === 'def') { pursue(a); return; }
    if (ball.inAir) {
      if (ball.target === a) { steer(a, ball.landing.x, ball.landing.y, 1, 0.2); return; }
      // Other receivers slow and turn; blockers hold.
      if (asg.a === 'route') { steer(a, a.x, a.y, 0.3, 0.2); return; }
    }
    switch (asg.a) {
      case 'route': {
        if (a.wp < asg.points.length) followPath(a, asg.points, 1); else { const [tx, ty] = routeEndTarget(a); steer(a, tx, ty, 0.8, 0.4); }
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
    const nearby = defs.filter((d) => !d.engaged && d.stun <= 0 && d.noEngage <= 0 && dist(d, a) < searchRadius).sort((p, q) => dist(p, a) - dist(q, a))[0];
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
        // Read the unblocked edge defender on the play side.
        const side = Math.sign(a.assignment.points[a.assignment.points.length - 1][1]) || 1;
        const edge = defs.filter((d) => !d.engaged && Math.sign(d.y) === side && d.x < 6).sort((p, q) => Math.abs(q.y) - Math.abs(p.y))[0];
        const keep = !edge || (edge.x - a.x) > 3 || Math.abs(edge.y - a.y) < 2.5 && edge.x < a.x + 1;
        const crashing = edge && dist(edge, rb) < dist(edge, a);
        if (crashing && rb) { ball.holder = a; handoffDone = true; phase = 'carry'; stats.carrier = a.slot; a.wp = 2; log(`${a.name} keeps on the option`, { kind: 'keep' }); }
        else if (rb) giveBall(rb);
        else { ball.holder = a; handoffDone = true; phase = 'carry'; }
        if (!keep && !crashing && rb) {/* gave */}
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
    } else {
      const dropPt = asg.points[1];
      if (a.state === 'init') { steer(a, dropPt[0], dropPt[1], 1, 0.3); if (dist(a, { x: dropPt[0], y: dropPt[1] }) < 0.5 || t > DROP_TIME[offensePlay.drop] + 0.4) a.state = 'set'; }
      else steer(a, a.x, a.y, 0, 0.2);
    }
    const dropTime = DROP_TIME[offensePlay.drop] ?? 1.1;
    const hold = asg.hold || 0;
    const nearestRusher = defs.filter((d) => d.stun <= 0).map((d) => dist(d, a) + (d.engaged ? 1.2 : 0)).sort((p, q) => p - q)[0] ?? 99;
    const pressured = nearestRusher < 2.8;
    if (pressured && pressureAt === Infinity) { pressureAt = t; stats.pressure = true; }
    if (t < Math.max(dropTime + 0.2, hold)) return; // set the feet first / let a screen develop
    // Reading: step through the progression at a pace set by awareness.
    readClock -= DT;
    const scanPace = 0.42 - 0.26 * norm(a.attrs.awareness);
    const progression = options.forcedTarget ? [options.forcedTarget] : (offensePlay.progression.length ? offensePlay.progression : receivers);
    const openness = (r) => projectedSeparation(a, r);
    const threshold = (pressured ? 1.9 : 2.6) - 0.6 * norm(a.attrs.awareness);
    const candidate = bySlot.off[progression[Math.min(readIndex, progression.length - 1)]];
    if (candidate && openness(candidate) >= threshold) { throwTo(a, candidate, pressured); return; }
    if (readClock <= 0) { readClock = scanPace; readIndex += 1; }
    if (readIndex >= progression.length) {
      // Progression exhausted: best available, scramble, or wait briefly.
      const ranked = receivers.map((s) => bySlot.off[s]).filter((r) => r && r.assignment.a === 'route').map((r) => ({ r, o: openness(r) })).sort((p, q) => q.o - p.o);
      const best = ranked[0];
      const judge = best ? best.o + (rng.normal() * (1 - norm(a.attrs.awareness)) * 0.8) : -1;
      if (best && judge >= (pressured ? 1.2 : 1.8)) { throwTo(a, best.r, pressured); return; }
      if (pressured && !scrambled && norm(a.attrs.agility) > 0.45 && rng.chance(0.5)) { scramble(a); return; }
      if (t > dropTime + 2.6 || (pressured && t > dropTime + 1.2)) {
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
    for (const def of defs) {
      if (def.engaged) continue;
      const dx = def.x + def.vx * travel * 0.8, dy = def.y + def.vy * travel * 0.8;
      nearest = Math.min(nearest, Math.hypot(dx - px, dy - py));
    }
    // Deep throws need a bigger window; throws beyond arm range are not open.
    const air = px - passer.x;
    const range = 30 + 30 * norm(passer.attrs.arm);
    if (d > range) return -1;
    if (px > B.endLine - 1 || py < B.left + 0.5 || py > B.right - 0.5) return -1;
    // Deep balls need a real window: a defender in phase a yard behind is still covering.
    return nearest - (air > 15 ? 1.0 : 0) - Math.max(0, air - 25) * 0.05;
  }
  function throwTo(passer, r, pressured) {
    const d = dist(passer, r);
    const velocity = 17 + 13 * norm(passer.attrs.arm);
    const travel = d / velocity + 0.1;
    const lead = predictReceiver(r, travel);
    let acc = passer.attrs.accuracy, arm = passer.attrs.arm;
    if (passer.ability?.deepThrow && lead.x - passer.x >= 15) { acc += passer.ability.deepThrow.accuracy; arm += passer.ability.deepThrow.arm; }
    const err = (1.2 + d * 0.07) * (1.3 - norm(acc)) * (pressured ? 1.5 : 1) * (Math.hypot(passer.vx, passer.vy) > 1 ? 1.2 : 1);
    const landing = { x: lead.x + rng.normal() * err * 0.7, y: lead.y + rng.normal() * err };
    landing.x = clamp(landing.x, B.ownEndLine + 0.5, B.endLine - 0.3);
    landing.y = clamp(landing.y, B.left - 1.5, B.right + 1.5);
    ball.inAir = true; ball.holder = null; ball.from = { x: passer.x, y: passer.y }; ball.to = landing; ball.landing = landing;
    ball.flightTime = Math.hypot(landing.x - passer.x, landing.y - passer.y) / (17 + 13 * norm(arm)); ball.flight = 0; ball.target = r;
    ball.airYards = landing.x;
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
    const delay = 0.4 - 0.3 * norm(d.attrs.coverage) - (d.ability?.reaction || 0);
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
      const breakRadius = asg.a === 'man' ? 9 : asg.role === 'deep' ? 12 : 9;
      if (toBall < breakRadius) { steer(d, ball.landing.x, ball.landing.y, 1, 0.2); return; }
      if (!['rush', 'contain'].includes(asg.a) || d.x < ball.landing.x) { steer(d, ball.landing.x, ball.landing.y, 0.95, 0.2); return; }
    }
    // Run recognition.
    const runLive = (phase === 'carry' || (phase === 'run' && handoffDone)) && c && c.team === 'off';
    if (runLive && !d.recognised) {
      const delay = 0.3 + 0.5 * (1 - norm(d.attrs.awareness)) - (d.ability?.reaction || 0) + (isPlayAction && t < 1.6 ? 0.3 : 0) + (offensePlay.tags.includes('misdirection') ? 0.3 : 0) + (asg.a === 'man' ? 0.15 : 0);
      if (t - runRecognisedAt >= delay) d.recognised = true;
    }
    if (runLive && d.recognised) { pursue(d); return; }
    // Play-action bite: non-rushing defenders step up before they recognise the pass.
    if (isPlayAction && t < 0.9 && !['rush', 'contain'].includes(asg.a) && asg.a !== 'man' && norm(d.attrs.awareness) < 0.8) { steer(d, d.x - 2, d.y, 0.6, 0.3); return; }
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
        if (!target) { steer(d, d.x, d.y, 0, 0.2); return; }
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
        const radius = asg.role === 'deep' ? 9 : asg.role === 'middle' ? 6 : 6.5;
        const threats = receivers.map((s) => bySlot.off[s]).filter((r) => r && dist(r, { x: zx, y: zy }) < radius && r.x > -1);
        if (threats.length && dist(d, { x: zx, y: zy }) < radius + 1) {
          const r = threats.sort((p, q) => (q.x - p.x))[0];
          const p = trailPosition(d, r);
          if (asg.role === 'deep') steer(d, Math.max(p.x + 2.5, zx - 3), p.y, 0.95, 0.3); else steer(d, p.x + 0.5, p.y, 0.9, 0.3);
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
    const closing = Math.hypot(d.vx - c.vx, d.vy - c.vy);
    const gang = opponents(c.team).filter((o) => o !== d && dist(o, c) < 1.8).length;
    const tackleScore = d.attrs.tackling * 0.55 + d.attrs.strength * 0.3 + closing * 1.2 + gang * 12;
    const carryStrength = c.attrs.strength + (c.ability?.carryStrength && Math.abs(c.y) < 6 ? c.ability.carryStrength : 0);
    const carryScore = carryStrength * 0.5 + c.attrs.agility * 0.3 + c.attrs.speed * 0.1 + (c.team === 'def' ? -8 : 0);
    const p = sigmoid((tackleScore - carryScore + 18) / 16);
    if (rng.chance(p)) {
      // Fumble check on contact.
      const fumbleP = 0.012 * (1.6 - norm(c.attrs.catching)) * (gang ? 1.4 : 1) * (c.slot === 'QB' ? 1.3 : 1);
      const forward = Math.min(1.2, Math.hypot(c.vx, c.vy) * 0.14);
      const dir = c.team === 'off' ? 1 : -1;
      c.x += dir * forward;
      if (rng.chance(fumbleP)) {
        const near = actors.filter((a) => dist(a, c) < 2.5);
        const recoverer = near.length ? rng.pick(near) : d;
        stats.forcedBy = d.slot; stats.tackler = d.slot;
        log(`${d.name} forces a fumble by ${c.name}; ${recoverer.name} recovers`, { kind: 'fumble', by: d.slot, recoveredBy: recoverer.slot, team: recoverer.team });
        if (recoverer.team !== c.team) { endPlay('fumble', c.x, c.y, { recoveredBy: recoverer.team }); } else { endPlay('tackle', c.x, c.y, { fumbleRecovered: true }); }
        return true;
      }
      stats.tackler = d.slot;
      if (c.team === 'off' && c.x <= B.ownGoal) { endPlay('safety', c.x, c.y); log(`${d.name} tackles ${c.name} in the end zone — SAFETY`, { kind: 'safety' }); return true; }
      endPlay('tackle', c.x, c.y);
      log(`${d.name} tackles ${c.name}`, { kind: 'tackle', by: d.slot });
      return true;
    }
    d.stun = 0.45; d.noEngage = 0.3; c.brokeTackle = (c.brokeTackle || 0) + 1; stats.brokenTackles += 1;
    c.vx *= 0.55; c.vy *= 0.55; // the arm tackle still slows him down
    log(`${c.name} breaks ${d.name}'s tackle`, { kind: 'broken_tackle', by: c.slot });
    return false;
  }
  function trySack(d) {
    if (d.stun > 0 || d.engaged || dist(d, qb) > 0.95) return false;
    const p = clamp(0.62 + 0.3 * norm(d.attrs.tackling) - 0.35 * norm(qb.attrs.agility), 0.25, 0.92);
    if (rng.chance(p)) { stats.tackler = d.slot; endPlay('sack', qb.x, qb.y); log(`${d.name} sacks ${qb.name}`, { kind: 'sack', by: d.slot }); return true; }
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
    const catchRadius = 1.4 + 0.9 * norm(r.attrs.agility);
    const dr = dist(r, L);
    const defendersNear = defs.filter((d) => !d.engaged).map((d) => ({ d, dd: dist(d, L) })).sort((p, q) => p.dd - q.dd);
    const nearest = defendersNear[0];
    const contested = nearest && nearest.dd < 1.1;
    let catchP = dr > catchRadius ? 0 : (0.7 + 0.29 * norm(r.attrs.catching)) * (1 - Math.max(0, dr - 0.6) / catchRadius * 0.45);
    if (contested) catchP *= 0.7 + 0.22 * norm(r.attrs.catching) - 0.22 * norm(nearest.d.attrs.coverage);
    if (nearest && nearest.dd < 1.0 && nearest.dd < dr) {
      const pickCatching = nearest.d.attrs.catching + (nearest.d.ability?.pickCatching || 0);
      const pickP = (0.05 + 0.22 * norm(pickCatching)) * (dr > catchRadius ? 1.6 : 0.7);
      if (rng.chance(pickP)) {
        ball.inAir = false; ball.holder = nearest.d; stats.interceptor = nearest.d.slot; nearest.d.x = L.x; nearest.d.y = L.y;
        nearest.d.laneTimer = 0; nearest.d.jukeCooldown = 0;
        log(`${nearest.d.name} intercepts the pass!`, { kind: 'interception', by: nearest.d.slot });
        if (L.x >= B.goal) { endPlay('touchback_return', L.x, L.y, { interception: true }); return; }
        phase = 'carry'; for (const o of offs) o.engaged = null; return;
      }
    }
    if (rng.chance(catchP)) {
      ball.inAir = false; ball.holder = r; r.x = L.x; r.y = L.y; r.laneTimer = 0; r.jukeCooldown = 0.4; phase = 'carry';
      r.vx *= 0.45; r.vy *= 0.45; // securing the ball and turning upfield costs a step
      stats.receiver = r.slot; stats.carrier = r.slot; stats.catchX = L.x;
      for (const def of defs) def.recognised = true;
      log(`${r.name} catches it${contested ? ' in traffic' : ''}`, { kind: 'catch', by: r.slot });
      if (L.x >= B.goal) { endPlay('touchdown', L.x, L.y); log('TOUCHDOWN', { kind: 'touchdown' }); }
      if (L.y <= B.left || L.y >= B.right) { endPlay('out_of_bounds', L.x, clamp(L.y, B.left, B.right)); }
      return;
    }
    ball.inAir = false;
    endPlay('incomplete', L.x, L.y);
    log(contested && nearest ? `Pass broken up by ${nearest.d.name}` : dr > catchRadius ? 'Pass falls incomplete, out of reach' : `${r.name} drops it`, { kind: 'incomplete', dropped: dr <= catchRadius });
  }

  // ------------------------------------------------------------ main loop
  function recordFrame() {
    frames.push({
      t: +t.toFixed(2),
      off: offs.map((a) => [a.slot, +a.x.toFixed(2), +a.y.toFixed(2), a.engaged ? 1 : 0]),
      def: defs.map((a) => [a.slot, +a.x.toFixed(2), +a.y.toFixed(2), a.engaged ? 1 : 0]),
      ball: [+ball.x.toFixed(2), +ball.y.toFixed(2), ball.inAir ? 1 : 0],
      holder: ball.holder ? ball.holder.slot : null, holderTeam: ball.holder ? ball.holder.team : null, phase,
    });
  }
  recordFrame();
  let tick = 0;
  while (!result && t < maxTime) {
    tick += 1; t = tick * DT;
    for (const a of actors) { const h = history.get(a); h.push({ x: a.x, y: a.y }); if (h.length > 40) h.shift(); }
    if (isRun && runRecognisedAt === Infinity) runRecognisedAt = 0;
    if (!isRun && handoffDone && runRecognisedAt === Infinity) runRecognisedAt = t;
    if (phase === 'carry' && runRecognisedAt === Infinity) runRecognisedAt = t;

    for (const a of offs) offenseTick(a);
    for (const d of defs) defenseTick(d);
    for (const a of actors) if (!a.engaged) integrate(a);
    separate();

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
      if (c === qb && phase !== 'carry' && !scrambled) { for (const d of defs) { if (trySack(d)) break; } }
      else { for (const d of opponents(c.team)) { if (tryTackle(d, c)) break; } }
    }
    // Boundaries and scores for the carrier.
    if (!result && ball.holder) {
      const h = ball.holder;
      if (h.y <= B.left || h.y >= B.right) { const yy = h.y <= B.left ? B.left : B.right; endPlay('out_of_bounds', h.x, yy); log(`${h.name} steps out of bounds`, { kind: 'oob' }); }
      else if (h.team === 'off' && h.x >= B.goal && (h !== qb || scrambled || phase === 'carry')) { endPlay('touchdown', h.x, h.y); log(`${h.name} reaches the end zone — TOUCHDOWN`, { kind: 'touchdown' }); }
      else if (h.team === 'def' && h.x <= B.ownGoal) { endPlay('touchdown', h.x, h.y, { defensiveScore: true }); log(`${h.name} returns it all the way — TOUCHDOWN`, { kind: 'touchdown' }); }
      else if (h.team === 'off' && h.x <= B.ownEndLine + 0.2) { endPlay('safety', h.x, h.y); log('Carrier runs out of the back of the end zone — SAFETY', { kind: 'safety' }); }
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
    stats, turnover: ['interception', 'fumble', 'touchback_return'].includes(result) || !!stats.defensiveScore,
    touchdown: result === 'touchdown', safety: result === 'safety', bounds: B,
  };
}

export { DT as TICK };
