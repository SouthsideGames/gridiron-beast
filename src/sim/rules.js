// Game state machine: downs, distance, scoring, clock, quarters, special
// teams phases and overtime (GDD §3). Pure functions on a plain state object
// so the UI, Key Moments and headless league games share one rulebook.

import { createRng, rngFromState } from '../core/rng.js';
import { FIELD, yardLabel, fieldGoalDistance, clamp } from '../core/field.js';
import { simulatePlay } from './engine.js';
import { getPlay } from '../data/playbook.js';
import * as ST from './special-teams.js';

export const RUNOFF = { normal: 18, hurry: 8, milk: 30 };
export const DEFAULT_QUARTER = 180;

export function newGame({ home, away, seed = 1, quarterLength = DEFAULT_QUARTER, coinWinner = null, choice = null }) {
  const rng = createRng(seed);
  const winner = coinWinner || (rng.chance(0.5) ? 'home' : 'away');
  const loser = winner === 'home' ? 'away' : 'home';
  const pick = choice || 'receive';
  // receive: winner receives now. defer: winner receives second half. kick: loser receives now and winner second half.
  const firstReceiver = pick === 'receive' ? winner : loser;
  const secondReceiver = pick === 'receive' ? loser : winner;
  const state = {
    version: 1, seed, rngState: rng.state,
    home: teamInfo(home), away: teamInfo(away),
    score: { home: 0, away: 0 },
    quarter: 1, quarterLength, clock: quarterLength,
    possession: firstReceiver, secondHalfReceiver: secondReceiver,
    coin: { winner, choice: pick },
    ballOn: FIELD.touchbackKickoff, ballLat: 0, down: 1, toGo: 10,
    phase: 'kickoff', kickingTeam: firstReceiver === 'home' ? 'away' : 'home',
    timeouts: { home: 3, away: 3 },
    clockRunning: false, finished: false, winner: null,
    ot: null, drive: { team: firstReceiver, plays: 0, yards: 0, start: null },
    log: [], playCount: 0,
    stats: { home: blankStats(), away: blankStats() },
    lastPlay: null,
  };
  log(state, `${state[winner].name} wins the toss and elects to ${pick === 'defer' ? 'defer' : pick}.`, 'info');
  return state;
}

function teamInfo(t) { return { id: t.id, name: t.name, abbr: t.abbr || t.name.slice(0, 3).toUpperCase(), color: t.color || '#4f8', homeField: !!t.homeField }; }
export function blankStats() { return { plays: 0, yards: 0, passYards: 0, rushYards: 0, passAtt: 0, passComp: 0, sacks: 0, turnovers: 0, firstDowns: 0, td: 0, fg: 0, punts: 0, timeOfPossession: 0, players: {} }; }

export function log(state, text, kind = 'play', extra = {}) {
  state.log.push({ q: state.quarter, clock: state.clock, team: state.possession, text, kind, ...extra });
  if (state.log.length > 600) state.log.shift();
}
const rng = (state) => { const r = rngFromState(state.rngState); return { r, save: () => { state.rngState = r.state; } }; };
export const opponent = (side) => (side === 'home' ? 'away' : 'home');
export const clockText = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, '0')}`;
export const quarterText = (state) => (state.quarter <= 4 ? `Q${state.quarter}` : `OT${state.quarter - 4}`);
export function situationText(state) {
  if (state.phase === 'kickoff') return 'Kickoff';
  if (state.phase === 'try') return 'Conversion attempt';
  if (state.phase === 'free_kick') return 'Free kick after safety';
  if (state.finished) return 'Final';
  const downs = ['1st', '2nd', '3rd', '4th'];
  const goal = state.ballOn + state.toGo >= 100;
  return `${downs[state.down - 1]} & ${goal ? 'Goal' : state.toGo} · ${yardLabel(state.ballOn)}`;
}
export const inTwoMinute = (state) => (state.quarter === 2 || state.quarter >= 4) && state.clock <= 120;

/** Which actual team object is on offense/defense. */
export const offenseTeam = (state, teams) => teams[state.possession];
export const defenseTeam = (state, teams) => teams[opponent(state.possession)];

// --------------------------------------------------------------------------- clock
function runClock(state, seconds) {
  if (state.clock <= 0) return;
  const used = Math.min(state.clock, Math.max(0, seconds));
  state.clock = +(state.clock - used).toFixed(1);
  state.stats[state.possession].timeOfPossession += used;
}

/** Called before a snap: burns runoff time if the clock is running. Returns false if the quarter must end first. */
export function preSnapRunoff(state, tempo = 'normal') {
  if (state.finished || state.phase !== 'scrimmage' || state.ot) return true;
  if (state.clockRunning && state.clock > 0) runClock(state, RUNOFF[tempo] ?? RUNOFF.normal);
  if (state.clock <= 0) { endOfPeriod(state); return false; }
  return true;
}

export function timeout(state, side) {
  if (state.timeouts[side] <= 0 || state.finished) return false;
  state.timeouts[side] -= 1; state.clockRunning = false;
  log(state, `Timeout, ${state[side].name} (${state.timeouts[side]} left).`, 'info');
  return true;
}

// --------------------------------------------------------------------------- scrimmage
/** Build the engine inputs for the current situation and chosen plays, then apply the result. */
export function runScrimmagePlay(state, teams, offensePlayId, defensePlayId, options = {}) {
  if (state.phase !== 'scrimmage' || state.finished) throw new Error(`Cannot snap in phase ${state.phase}`);
  const { r, save } = rng(state);
  const offense = teams[state.possession], defense = teams[opponent(state.possession)];
  const offensePlay = getPlay(offensePlayId), defensePlay = getPlay(defensePlayId);
  (state.calls ||= []).push({ side: state.possession, off: offensePlayId, def: defensePlayId });
  const sim = simulatePlay({
    offensePlay, defensePlay,
    offense: pickSlots(offense.offense, offensePlay.onField), defense: pickSlots(defense.defense, defensePlay.onField),
    ballOn: state.ballOn, ballLat: state.ballLat, seed: r.seed(), options,
  });
  save();
  const outcome = applyScrimmageResult(state, sim, offensePlayId, defensePlayId);
  return { sim, outcome };
}
export function pickSlots(lineup, slots) { const out = {}; for (const s of slots) out[s] = lineup[s] || { attrs: {} }; return out; }

/** Apply an engine result to the game state. Pure state update; `sim` comes from the engine. */
export function applyScrimmageResult(state, sim, offensePlayId = null, defensePlayId = null) {
  const off = state.possession, def = opponent(off);
  const S = state.stats[off];
  const lines = [];
  const wasGoalToGo = state.ballOn + state.toGo >= 100;
  state.playCount += 1; S.plays += 1; state.drive.plays += 1;
  runClock(state, sim.elapsed);
  const name = (team, slot) => state[team === 'off' ? off : def].name;
  let stops = false;
  let scored = null;
  const gain = sim.yards;
  const isPass = !!sim.stats.passer;
  if (isPass && sim.result !== 'sack') S.passAtt += 1;
  const lastEvent = sim.events[sim.events.length - 1]?.text || sim.result;

  switch (sim.result) {
    case 'incomplete': case 'throwaway':
      lines.push(sim.result === 'throwaway' ? 'Throwaway.' : `Incomplete${sim.stats.target ? ' to ' + playerName(sim, 'off', sim.stats.target) : ''}.`);
      stops = true; nextDown(state, 0, lines); break;
    case 'sack':
      S.sacks += 1; state.stats[def].sacks += 0;
      lines.push(`Sacked by ${playerName(sim, 'def', sim.stats.tackler)} for ${gain} yards.`);
      if (sim.endYard <= 0) { scored = safety(state, lines); break; }
      nextDown(state, gain, lines); break;
    case 'tackle': case 'out_of_bounds': {
      const who = sim.stats.receiver ? `${playerName(sim, 'off', sim.stats.receiver)} catches it for ${gain}` : `${playerName(sim, 'off', sim.stats.carrier)} runs for ${gain}`;
      lines.push(`${who}${sim.result === 'out_of_bounds' ? ', out of bounds' : sim.stats.tackler ? ', tackled by ' + playerName(sim, 'def', sim.stats.tackler) : ''}.`);
      if (sim.stats.receiver) { S.passComp += 1; S.passYards += gain; } else S.rushYards += gain;
      S.yards += gain; state.drive.yards += gain;
      if (sim.result === 'out_of_bounds' && inTwoMinute(state)) stops = true;
      nextDown(state, gain, lines); break;
    }
    case 'touchdown': {
      if (sim.stats.defensiveScore) {
        lines.push(`${playerName(sim, 'def', sim.stats.interceptor || sim.stats.carrier)} returns it for a TOUCHDOWN!`);
        S.turnovers += 1; stops = true;
        scored = touchdown(state, def, lines);
      } else {
        lines.push(`${playerName(sim, 'off', sim.stats.carrier)} ${sim.stats.receiver ? 'catches' : 'runs'} it in — TOUCHDOWN!`);
        if (sim.stats.receiver) { S.passComp += 1; S.passYards += gain; } else S.rushYards += gain;
        S.yards += gain; state.drive.yards += gain; stops = true;
        scored = touchdown(state, off, lines);
      }
      break;
    }
    case 'interception': case 'fumble': case 'touchback_return': {
      S.turnovers += 1; stops = true;
      if (sim.result === 'interception' || sim.result === 'touchback_return') lines.push(`INTERCEPTED by ${playerName(sim, 'def', sim.stats.interceptor)}!`);
      else lines.push(`FUMBLE forced by ${playerName(sim, 'def', sim.stats.forcedBy)} — recovered by the defense!`);
      if (sim.result === 'touchback_return' || sim.endYard >= 100) { changePossession(state, FIELD.touchbackOther, lines, 'Touchback.'); }
      else changePossession(state, clamp(100 - sim.endYard, 1, 99), lines);
      break;
    }
    case 'safety': { lines.push(`${playerName(sim, 'off', sim.stats.carrier)} is tackled in the end zone.`); scored = safety(state, lines); stops = true; break; }
    default: lines.push(lastEvent); nextDown(state, gain, lines);
  }
  if (!scored && state.phase === 'scrimmage' && !state.finished) state.clockRunning = !stops;
  if (scored) state.clockRunning = false;
  if (!scored && state.clock <= 0) endOfPeriod(state);
  const text = lines.join(' ');
  state.lastPlay = { text, result: sim.result, yards: gain, offensePlayId, defensePlayId, seed: sim.seed, ballOn: sim.ballOn, stats: sim.stats };
  log(state, text, 'play', { team: off, result: sim.result, yards: gain, important: !!scored || ['interception', 'fumble', 'touchback_return'].includes(sim.result), repro: `${offensePlayId || '?'}|${defensePlayId || '?'}|${sim.ballOn}|${sim.seed}` });
  recordPlayerStats(state, sim, off, def);
  if (state.ot) otCheckAfterPlay(state);
  return { text, scored, result: sim.result, yards: gain };
}

function playerName(sim, team, slot) { return slot ? (sim.names?.[team]?.[slot] || slot) : team === 'off' ? 'the offense' : 'the defense'; }

function recordPlayerStats(state, sim, off, def) {
  const bump = (team, slot, key, n = 1) => { if (!slot) return; const p = (state.stats[team].players[slot] ||= {}); p[key] = (p[key] || 0) + n; };
  if (sim.stats.passer) { bump(off, 'QB', 'att'); if (sim.stats.receiver) { bump(off, 'QB', 'comp'); bump(off, 'QB', 'passYds', sim.yards); bump(off, sim.stats.receiver, 'rec'); bump(off, sim.stats.receiver, 'recYds', sim.yards); } }
  if (sim.stats.carrier && !sim.stats.receiver && sim.stats.carrier !== 'QB' && !sim.stats.passer) { bump(off, sim.stats.carrier, 'rush'); bump(off, sim.stats.carrier, 'rushYds', sim.yards); }
  if (sim.touchdown && !sim.stats.defensiveScore) bump(off, sim.stats.carrier, 'td');
  if (sim.stats.tackler) bump(def, sim.stats.tackler, sim.result === 'sack' ? 'sacks' : 'tackles');
  if (sim.stats.interceptor) bump(def, sim.stats.interceptor, 'int');
  if (sim.stats.forcedBy) bump(def, sim.stats.forcedBy, 'ff');
  // Monster-football extras from the engine's event stream.
  const keyOf = { juke: 'jukes', broken: 'broken', shed: 'sheds', ability: 'abilities' };
  for (const e of sim.events || []) { const k = keyOf[e.kind]; if (!k || !e.by) continue; bump(e.side === 'def' ? def : off, e.by, k); }
}

function nextDown(state, gain, lines) {
  state.ballOn = clamp(state.ballOn + gain, 1, 99);
  state.ballLat = 0;
  if (gain >= state.toGo) { firstDown(state); lines.push('First down.'); state.stats[state.possession].firstDowns += 1; return; }
  state.toGo = Math.max(1, Math.round(state.toGo - gain));
  state.down += 1;
  if (state.down > 4) { lines.push('Turnover on downs!'); changePossession(state, 100 - state.ballOn, lines); }
}
function firstDown(state) { state.down = 1; state.toGo = Math.min(10, 100 - state.ballOn); }
function changePossession(state, newBallOn, lines, note = null) {
  const prev = state.possession;
  state.possession = opponent(prev);
  state.ballOn = clamp(Math.round(newBallOn), 1, 99); state.ballLat = 0;
  firstDown(state);
  state.clockRunning = false;
  state.drive = { team: state.possession, plays: 0, yards: 0, start: state.ballOn };
  if (note) lines.push(note);
  lines.push(`${state[state.possession].name} ball at the ${yardLabel(state.ballOn).toLowerCase()}.`);
}
function touchdown(state, side, lines) {
  state.score[side] += 6; state.stats[side].td += 1;
  state.phase = 'try'; state.tryTeam = side; state.ballOn = 100 - FIELD.twoPointSpot; state.down = 1; state.toGo = FIELD.twoPointSpot;
  state.possession = side;
  lines.push(`${state[side].name} ${state.score.home}-${state.score.away}.`);
  return { team: side, points: 6, kind: 'touchdown' };
}
function safety(state, lines) {
  const scoringSide = opponent(state.possession);
  state.score[scoringSide] += 2;
  lines.push(`SAFETY! ${state[scoringSide].name} ${state.score.home}-${state.score.away}.`);
  // The team that conceded free-kicks from its own 20; the scoring team receives.
  state.phase = 'free_kick'; state.kickingTeam = state.possession; state.clockRunning = false;
  return { team: scoringSide, points: 2, kind: 'safety' };
}

// --------------------------------------------------------------------------- tries
export function attemptTryKick(state, teams) {
  if (state.phase !== 'try') throw new Error('not a try');
  const { r, save } = rng(state);
  const res = ST.attemptExtraPoint(r, teams[state.tryTeam].kicker);
  save();
  if (res.good) state.score[state.tryTeam] += 1;
  finishTry(state, res.text);
  return res;
}
export function attemptTwoPoint(state, teams, offensePlayId, defensePlayId) {
  if (state.phase !== 'try') throw new Error('not a try');
  const { r, save } = rng(state);
  const offense = teams[state.tryTeam], defense = teams[opponent(state.tryTeam)];
  const offensePlay = getPlay(offensePlayId), defensePlay = getPlay(defensePlayId);
  const sim = simulatePlay({ offensePlay, defensePlay, offense: pickSlots(offense.offense, offensePlay.onField), defense: pickSlots(defense.defense, defensePlay.onField), ballOn: 100 - FIELD.twoPointSpot, seed: r.seed() });
  save();
  const good = sim.touchdown && !sim.stats.defensiveScore;
  if (good) state.score[state.tryTeam] += 2;
  const text = good ? 'Two-point conversion is GOOD!' : sim.stats.defensiveScore ? 'Conversion returned the other way — two points for the defense!' : 'Two-point conversion fails.';
  if (sim.stats.defensiveScore) state.score[opponent(state.tryTeam)] += 2;
  finishTry(state, text);
  return { sim, good, text };
}
function finishTry(state, text) {
  log(state, `${text} ${state.home.abbr} ${state.score.home} — ${state.away.abbr} ${state.score.away}`, 'score', { important: true });
  state.lastPlay = { text, result: 'try' };
  if (state.ot) { otAfterPossession(state); return; }
  state.phase = 'kickoff'; state.kickingTeam = state.tryTeam; state.possession = opponent(state.tryTeam);
  if (state.clock <= 0) endOfPeriod(state);
}

// --------------------------------------------------------------------------- kicks
export function doKickoff(state, teams, { onside = false } = {}) {
  if (state.phase !== 'kickoff' && state.phase !== 'free_kick') throw new Error('not a kickoff');
  const { r, save } = rng(state);
  const kicking = state.kickingTeam, receiving = opponent(kicking);
  let res;
  if (state.phase === 'free_kick') {
    res = ST.punt(r, { ballOn: 20, kicker: teams[kicking].kicker, returner: teams[receiving].returner, rushPressure: 0 });
    res.text = 'Free kick: ' + res.text;
  } else res = ST.kickoff(r, { kicker: teams[kicking].kicker, returner: teams[receiving].returner, onside });
  save();
  const lines = [res.text];
  state.phase = 'scrimmage'; state.clockRunning = false; state.ballLat = 0;
  if (res.onside && res.recovered) { state.possession = kicking; state.ballOn = res.ballOn; firstDown(state); }
  else if (res.touchdown) { state.possession = receiving; touchdown(state, receiving, lines); }
  else { state.possession = receiving; state.ballOn = res.ballOn; firstDown(state); }
  state.drive = { team: state.possession, plays: 0, yards: 0, start: state.ballOn };
  runClock(state, 5);
  if (state.phase === 'scrimmage') lines.push(`${state[state.possession].name} ball at the ${yardLabel(state.ballOn).toLowerCase()}.`);
  const text = lines.join(' ');
  state.lastPlay = { text, result: 'kickoff' };
  log(state, text, 'kick', { team: kicking, important: !!res.touchdown });
  if (state.clock <= 0 && state.phase === 'scrimmage') endOfPeriod(state);
  return { res, text };
}

export function doPunt(state, teams) {
  if (state.phase !== 'scrimmage') throw new Error('not scrimmage');
  const { r, save } = rng(state);
  const kicking = state.possession, receiving = opponent(kicking);
  const res = ST.punt(r, { ballOn: state.ballOn, kicker: teams[kicking].kicker, returner: teams[receiving].returner });
  save();
  state.stats[kicking].punts += 1;
  const lines = [res.text];
  runClock(state, 6);
  if (res.blocked) { changePossession(state, res.ballOn, lines); }
  else if (res.touchdown) { state.possession = receiving; touchdown(state, receiving, lines); }
  else changePossession(state, res.ballOn, lines);
  const text = lines.join(' ');
  state.lastPlay = { text, result: 'punt' };
  log(state, text, 'kick', { team: kicking });
  if (state.ot) { otAfterPossession(state); return { res, text }; }
  if (state.clock <= 0 && state.phase === 'scrimmage') endOfPeriod(state);
  return { res, text };
}

export function doFieldGoal(state, teams) {
  if (state.phase !== 'scrimmage') throw new Error('not scrimmage');
  const { r, save } = rng(state);
  const kicking = state.possession;
  const res = ST.attemptFieldGoal(r, state.ballOn, teams[kicking].kicker);
  save();
  runClock(state, 5);
  const lines = [res.text];
  let scored = null;
  if (res.good) {
    state.score[kicking] += 3; state.stats[kicking].fg += 1; scored = { team: kicking, points: 3, kind: 'field_goal' };
    lines.push(`${state.home.abbr} ${state.score.home} — ${state.away.abbr} ${state.score.away}.`);
    if (state.ot) { state.lastPlay = { text: lines.join(' '), result: 'field_goal' }; log(state, lines.join(' '), 'score', { important: true }); otAfterPossession(state); return { res, text: lines.join(' '), scored }; }
    state.phase = 'kickoff'; state.kickingTeam = kicking; state.possession = opponent(kicking); state.clockRunning = false;
  } else {
    // Miss: opponent takes over at the spot of the kick (7 yards behind the line) or its 20.
    const spot = Math.max(FIELD.touchbackOther, 100 - (state.ballOn - 7));
    changePossession(state, spot, lines);
    if (state.ot) { state.lastPlay = { text: lines.join(' '), result: 'field_goal_miss' }; log(state, lines.join(' '), 'kick'); otAfterPossession(state); return { res, text: lines.join(' '), scored }; }
  }
  const text = lines.join(' ');
  state.lastPlay = { text, result: res.good ? 'field_goal' : 'field_goal_miss' };
  log(state, text, 'kick', { team: kicking, important: res.good });
  if (state.clock <= 0 && !state.finished && state.phase === 'scrimmage') endOfPeriod(state);
  return { res, text, scored };
}

export function kneel(state) {
  if (state.phase !== 'scrimmage') return;
  runClock(state, 3);
  state.ballOn = Math.max(1, state.ballOn - 1); state.down += 1; state.toGo += 1;
  state.clockRunning = true;
  const lines = ['Quarterback kneels.'];
  if (state.down > 4) changePossession(state, 100 - state.ballOn, lines);
  log(state, lines.join(' '), 'play');
  state.lastPlay = { text: lines.join(' '), result: 'kneel' };
  if (state.clock <= 0) endOfPeriod(state);
}
export function spike(state) {
  if (state.phase !== 'scrimmage') return;
  runClock(state, 2);
  state.down += 1; state.clockRunning = false;
  const lines = ['Spike to stop the clock.'];
  if (state.down > 4) changePossession(state, 100 - state.ballOn, lines);
  log(state, lines.join(' '), 'play');
  state.lastPlay = { text: lines.join(' '), result: 'spike' };
}

// --------------------------------------------------------------------------- periods
export function endOfPeriod(state) {
  if (state.finished) return;
  if (state.ot) return; // OT is possession-based, not timed
  if (state.quarter === 4) {
    if (state.score.home !== state.score.away) { finish(state); return; }
    startOvertime(state); return;
  }
  state.quarter += 1; state.clock = state.quarterLength; state.clockRunning = false;
  if (state.quarter === 3) {
    state.timeouts = { home: 3, away: 3 };
    state.phase = 'kickoff'; state.possession = state.secondHalfReceiver; state.kickingTeam = opponent(state.secondHalfReceiver);
    log(state, `HALFTIME. ${state.home.abbr} ${state.score.home} — ${state.away.abbr} ${state.score.away}. ${state[state.secondHalfReceiver].name} receive the second-half kickoff.`, 'period', { important: true });
  } else log(state, `End of the ${state.quarter === 2 ? 'first' : 'third'} quarter.`, 'period');
}
function finish(state) {
  state.finished = true; state.phase = 'final'; state.clockRunning = false;
  state.winner = state.score.home > state.score.away ? 'home' : state.score.away > state.score.home ? 'away' : null;
  log(state, `FINAL: ${state.home.name} ${state.score.home}, ${state.away.name} ${state.score.away}.`, 'period', { important: true });
}
function startOvertime(state) {
  const { r, save } = rng(state);
  const first = r.chance(0.5) ? 'home' : 'away';
  save();
  state.ot = { period: 1, first, possessionsLeft: 2, scoreAtStart: { ...state.score } };
  state.quarter = 5; state.clock = 0; state.timeouts = { home: 1, away: 1 };
  log(state, `OVERTIME. Each team gets a possession from the opponent 25. ${state[first].name} go first.`, 'period', { important: true });
  otPossession(state, first);
}
function otPossession(state, side) {
  state.possession = side; state.phase = 'scrimmage'; state.ballOn = 75; state.ballLat = 0; firstDown(state); state.clockRunning = false;
  state.drive = { team: side, plays: 0, yards: 0, start: 75 };
  if (state.ot.period >= 3) { state.phase = 'try'; state.tryTeam = side; state.ballOn = 100 - FIELD.twoPointSpot; state.toGo = FIELD.twoPointSpot; }
}
export function otAfterPossession(state) {
  const ot = state.ot; ot.possessionsLeft -= 1;
  if (ot.possessionsLeft === 1) {
    const second = opponent(ot.first);
    // If the first team failed to score and the second scores anything, or the second team already leads, the game ends when decided.
    otPossession(state, second);
    return;
  }
  if (state.score.home !== state.score.away) { finish(state); return; }
  ot.period += 1; ot.possessionsLeft = 2; ot.first = opponent(ot.first);
  log(state, `Still tied — overtime period ${ot.period}.${ot.period >= 3 ? ' Two-point attempts only.' : ''}`, 'period');
  state.quarter = 4 + ot.period;
  otPossession(state, ot.first);
}
/** In OT a possession also ends on turnovers/downs; called by applyScrimmageResult via changePossession when ot is active. */
export function otCheckAfterPlay(state) {
  if (!state.ot || state.finished) return;
  if (state.phase === 'try') return; // handled in finishTry
  if (state.phase === 'free_kick') { if (state.score.home !== state.score.away) finish(state); else otAfterPossession(state); return; }
  // Possession ended if the ball changed hands (drive.team !== the expected team) or a score moved to 'kickoff'.
  const expected = state.ot.possessionsLeft === 2 ? state.ot.first : opponent(state.ot.first);
  if (state.possession !== expected || state.phase === 'kickoff') {
    // Defensive score in OT ends the game immediately.
    if (state.score.home !== state.score.away && state.ot.possessionsLeft === 1) { finish(state); return; }
    if (state.phase === 'kickoff') { state.phase = 'scrimmage'; }
    otAfterPossession(state);
  }
}

// --------------------------------------------------------------------------- helpers for UI/AI
export function fieldGoalInfo(state, teams) {
  const distance = fieldGoalDistance(state.ballOn);
  return { distance, chance: ST.fieldGoalChance(distance, teams[state.possession].kicker?.attrs?.kicking) };
}
export function summary(state) {
  return { score: { ...state.score }, quarter: quarterText(state), clock: clockText(state.clock), situation: situationText(state), possession: state.possession, finished: state.finished, winner: state.winner };
}
