// Coaching decisions for the computer (and the Coach's Suggestion / Key
// Moments for the player). Every decision reads down, distance, field
// position, score, quarter, clock, timeouts and team strengths (GDD §7).

import { PLAYS } from '../data/playbook.js';
import { fieldGoalRange } from './special-teams.js';
import { fieldGoalDistance, clamp } from '../core/field.js';
import { opponent, inTwoMinute } from './rules.js';

const norm = (v) => clamp(v ?? 60, 1, 99) / 99;

/** Team strength summary from the lineup. */
export function teamStrengths(team) {
  const o = team.offense || {}, d = team.defense || {};
  const g = (p, k) => p?.attrs?.[k] ?? 60;
  const pass = (g(o.QB, 'accuracy') * 2 + g(o.QB, 'awareness') + g(o.QB, 'arm') + g(o.WR1, 'catching') + g(o.WR2, 'catching') + g(o.WR1, 'speed')) / 7;
  const run = (g(o.RB, 'speed') + g(o.RB, 'strength') + g(o.RB, 'agility') + g(o.LG, 'blocking') + g(o.TE, 'blocking') + g(o.RG, 'blocking')) / 6;
  const passD = (g(d.CB1, 'coverage') + g(d.CB2, 'coverage') + g(d.FS, 'coverage') + g(d.SS, 'coverage') + g(d.LB1, 'coverage')) / 5;
  const runD = (g(d.DL1, 'strength') + g(d.DL2, 'strength') + g(d.LB1, 'tackling') + g(d.LB2, 'tackling')) / 4;
  const kicking = team.kicker?.attrs?.kicking ?? 60;
  return { pass, run, passD, runD, kicking, fgRange: fieldGoalRange(kicking), passBias: clamp(0.5 + (pass - run) / 60, 0.25, 0.8) };
}

/** Situation descriptor used by every decision. */
export function situation(state, side = state.possession) {
  const diff = state.score[side] - state.score[opponent(side)];
  const late = state.quarter >= 4;
  const secondsLeft = state.quarter >= 4 ? state.clock : state.clock + (4 - state.quarter) * state.quarterLength;
  return {
    down: state.down, toGo: state.toGo, ballOn: state.ballOn, diff, quarter: state.quarter, clock: state.clock, secondsLeft,
    late, twoMinute: inTwoMinute(state), goalToGo: state.ballOn + state.toGo >= 100, redZone: state.ballOn >= 80,
    backedUp: state.ballOn <= 10, short: state.toGo <= 2, long: state.toGo >= 7 && state.down >= 2, timeouts: state.timeouts[side], ot: !!state.ot,
  };
}

/** Weight each available offensive play for the situation; returns [[id, weight]]. */
export function weighOffense(state, team, available, tendencies = null) {
  const s = situation(state), str = teamStrengths(team);
  const coach = team.coach || { aggression: 0.5, passBias: null };
  const passBias = coach.passBias ?? str.passBias;
  const out = [];
  for (const id of available) {
    const p = PLAYS[id]; if (!p || p.side !== 'offense') continue;
    const tags = p.tags;
    let w = 1;
    const isPass = p.type === 'pass';
    w *= isPass ? passBias * 2 : (1 - passBias) * 2;
    if (s.short) w *= tags.includes('short') || tags.includes('goalline') ? 2.2 : tags.includes('deep') ? 0.4 : 1;
    if (s.long) w *= tags.includes('long') || tags.includes('medium') || tags.includes('deep') ? 1.7 : p.type === 'run' ? 0.45 : 1;
    if (s.down === 3 && s.toGo >= 5) w *= isPass ? 1.6 : 0.5;
    if (s.goalToGo || s.redZone) w *= tags.includes('redzone') || tags.includes('goalline') || tags.includes('short') ? 1.8 : tags.includes('deep') ? 0.35 : 1;
    if (s.backedUp) w *= tags.includes('deep') || tags.includes('screen') ? 0.4 : tags.includes('inside') ? 1.4 : 1;
    if (s.twoMinute && s.diff <= 0) w *= tags.includes('two_minute') || tags.includes('quick') || tags.includes('medium') ? 1.8 : p.type === 'run' ? 0.3 : 1;
    if (s.late && s.diff > 0 && s.secondsLeft < 300) w *= p.type === 'run' ? 1.8 : tags.includes('deep') ? 0.4 : 0.8;
    if (s.diff < -14 && s.late) w *= tags.includes('deep') || tags.includes('long') ? 1.6 : 1;
    if (tags.includes('desperation')) w *= s.late && s.diff < 0 && s.secondsLeft < 25 && s.ballOn >= 45 ? 40 : 0.02;
    if (tags.includes('play_action')) w *= s.down <= 2 && !s.short ? 1.3 : 0.6;
    if (tags.includes('misdirection')) w *= s.down <= 2 ? 1.2 : 0.6;
    w *= 0.7 + 0.6 * coach.aggression * (tags.includes('deep') ? 1 : 0.5);
    // Avoid repeating the same play call too often.
    const recent = tendencies?.recentOffense || [];
    const repeats = recent.slice(-4).filter((x) => x === id).length;
    w *= Math.pow(0.45, repeats);
    out.push([id, Math.max(0.01, w)]);
  }
  return out;
}

export function weighDefense(state, team, available, oppTendencies = null) {
  const s = situation(state, opponent(state.possession));
  const coach = team.coach || { aggression: 0.5 };
  const offS = situation(state);
  const passLikely = oppTendencies ? clamp(oppTendencies.passRate ?? 0.55, 0.2, 0.9) : 0.55;
  const expectPass = offS.long || (offS.down === 3 && offS.toGo >= 4) || (offS.twoMinute && offS.diff <= 0) ? 0.8 : offS.short || offS.goalToGo ? 0.35 : passLikely;
  const out = [];
  for (const id of available) {
    const p = PLAYS[id]; if (!p || p.side !== 'defense') continue;
    const tags = p.tags;
    let w = 1;
    if (tags.includes('run')) w *= 0.6 + (1 - expectPass) * 1.6;
    if (tags.includes('pass')) w *= 0.6 + expectPass * 1.4;
    if (tags.includes('goalline')) w *= offS.goalToGo || offS.short ? 3 : 0.3;
    if (tags.includes('blitz')) w *= (0.5 + coach.aggression) * (offS.long ? 1.3 : 1) * (offS.backedUp ? 1.3 : 1);
    if (tags.includes('risky')) w *= s.diff < 0 && s.late ? 1.4 : 0.55;
    if (tags.includes('prevent')) w *= s.diff > 0 && s.late && s.secondsLeft < 120 && offS.ballOn < 60 ? 6 : 0.15;
    if (tags.includes('desperation')) w *= s.late && s.diff < -7 && s.secondsLeft < 90 ? 3 : 0.1;
    if (tags.includes('anti_scramble')) w *= 1.1;
    const recent = oppTendencies?.recentDefense || [];
    const repeats = recent.slice(-4).filter((x) => x === id).length;
    w *= Math.pow(0.5, repeats);
    out.push([id, Math.max(0.01, w)]);
  }
  return out;
}

/** Coach IQ sharpens (iq > 1) or flattens (iq < 1) the play-call weights: a smart coach picks the right call more often. */
const sharpen = (weights, team) => { const k = team.coach?.iq ?? 1; return k === 1 ? weights : weights.map(([id, w]) => [id, Math.pow(w, k)]); };
export function chooseOffensePlay(rng, state, team, available, tendencies) {
  const weights = sharpen(weighOffense(state, team, available, tendencies), team);
  return weights.length ? rng.weighted(weights) : null;
}
export function chooseDefensePlay(rng, state, team, available, oppTendencies) {
  const weights = sharpen(weighDefense(state, team, available, oppTendencies), team);
  return weights.length ? rng.weighted(weights) : null;
}
/** The single best suggestion (no randomness) for the Coach's Suggestion UI. */
export function suggestPlay(state, team, available, side, tendencies) {
  const weights = side === 'offense' ? weighOffense(state, team, available, tendencies) : weighDefense(state, team, available, tendencies);
  return weights.sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

/** 'go' | 'punt' | 'fg', fourth-down decision. */
export function fourthDownDecision(state, team) {
  const s = situation(state);
  const str = teamStrengths(team);
  const coach = team.coach || { aggression: 0.5 };
  const distance = fieldGoalDistance(s.ballOn);
  const inRange = distance <= str.fgRange;
  const desperate = s.late && s.diff < 0 && (s.secondsLeft < 180 || (s.diff < -8 && s.secondsLeft < 420));
  if (s.ot) {
    if (s.diff < -3) return 'go'; // need a touchdown
    if (s.diff === -3) return inRange ? 'fg' : 'go'; // match the field goal to keep playing
    return inRange ? 'fg' : 'go'; // tied: take the lead
  }
  if (desperate) {
    if (s.diff >= -3 && inRange && s.secondsLeft < 60) return 'fg';
    if (s.diff >= -3 && inRange && s.toGo > 3) return 'fg';
    return s.ballOn >= 35 || s.secondsLeft < 120 ? 'go' : 'punt';
  }
  // Protecting a lead late: take points / punt.
  if (s.late && s.diff > 0 && s.secondsLeft < 300) return inRange ? 'fg' : 'punt';
  if (inRange && !(s.toGo <= 1 && s.ballOn >= 90 && coach.aggression > 0.6)) {
    if (s.toGo <= 1 && s.ballOn < 80 && coach.aggression > 0.55) return 'go';
    return 'fg';
  }
  if (s.ballOn < 45) return s.toGo <= 1 && s.ballOn >= 40 && coach.aggression > 0.75 ? 'go' : 'punt';
  if (s.toGo <= 1) return 'go';
  if (s.toGo <= 3 && s.ballOn >= 55) return coach.aggression > 0.35 ? 'go' : 'punt';
  if (s.toGo <= 5 && s.ballOn >= 62) return coach.aggression > 0.5 ? 'go' : 'punt';
  return 'punt';
}

/** 'kick' | 'two' after a touchdown (standard chart). */
export function tryDecision(state, side = state.tryTeam) {
  const diff = state.score[side] - state.score[opponent(side)]; // after the six
  if (state.ot && state.ot.period >= 3) return 'two';
  const late = state.quarter >= 4 || (state.quarter === 3 && state.clock < 60);
  if (!late) return 'kick';
  if ([-2, 5, -10, 1, -5, -13].includes(diff)) return 'two'; // standard situations where two matters
  if (diff === -9 && state.clock < 240) return 'two';
  return 'kick';
}

export function kickoffDecision(state, side = state.kickingTeam) {
  const diff = state.score[side] - state.score[opponent(side)];
  return state.quarter >= 4 && diff < 0 && diff >= -16 && state.clock < 150 ? 'onside' : 'normal';
}

export function tempoDecision(state, side = state.possession) {
  const s = situation(state, side);
  if (s.late && s.diff < 0 && s.secondsLeft < 300) return 'hurry';
  if (s.quarter === 2 && s.clock < 90 && s.diff <= 0) return 'hurry';
  if (s.late && s.diff > 0 && s.secondsLeft < 360) return 'milk';
  return 'normal';
}

/** Defense wants a timeout to preserve clock when trailing late. */
export function wantsDefensiveTimeout(state, side) {
  if (state.possession === side || state.timeouts[side] <= 0) return false;
  const diff = state.score[side] - state.score[opponent(side)];
  return state.quarter >= 4 && diff < 0 && diff >= -16 && state.clock <= 150 && state.clockRunning;
}
export function wantsOffensiveTimeout(state, side) {
  if (state.possession !== side || state.timeouts[side] <= 0) return false;
  const diff = state.score[side] - state.score[opponent(side)];
  return (state.quarter === 2 || state.quarter >= 4) && diff <= 0 && state.clock <= 45 && state.clockRunning && state.ballOn >= 50;
}
export function shouldKneel(state) {
  const s = situation(state);
  if (!s.late || s.diff <= 0 || s.ot) return false;
  const downsLeft = 4 - s.down; // kneels we can still take without giving the ball back
  const oppTimeouts = state.timeouts[opponent(state.possession)];
  // Each kneel burns ~3 s of play plus the runoff unless the defense calls timeout.
  const burnable = downsLeft * 3 + Math.max(0, downsLeft - oppTimeouts) * RUNOFF_MILK;
  return s.secondsLeft <= burnable;
}
const RUNOFF_MILK = 30;
export function shouldSpike(state) {
  const s = situation(state);
  return !s.ot && s.late && s.diff < 0 && state.clockRunning && state.clock <= 12 && state.timeouts[state.possession] === 0 && s.down < 4;
}
