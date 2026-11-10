// Drives a game forward one decision at a time. Used headless for league
// games and tests, and by the UI (which supplies the human's choices).
//
// A "controller" answers the questions the runner asks; the AI controller
// uses coach-ai.js, the UI controller asks the player.

import * as R from './rules.js';
import * as AI from './coach-ai.js';
import { rngFromState } from '../core/rng.js';
import { PLAYS } from '../data/playbook.js';

export function aiController(side) {
  return {
    side,
    offensePlay(state, team, available, tendencies, rng, opp) { return AI.chooseOffensePlay(rng, state, team, available, tendencies, opp); },
    defensePlay(state, team, available, oppTendencies, rng, opp, own) { return AI.chooseDefensePlay(rng, state, team, available, oppTendencies, opp, own); },
    fourthDown(state, team, sig = null) { return AI.fourthDownDecision(state, team, sig); },
    fgSignature(sig, ordinaryChance, state = null) { return AI.fgSignatureDecision(sig, ordinaryChance, state); }, // Task 8 M3: the AI's field-goal signature call (provisional policy)
    tryChoice(state) { return AI.tryDecision(state); },
    kickoff(state) { return AI.kickoffDecision(state); },
    tempo(state) { return AI.tempoDecision(state); },
    timeoutOnDefense(state) { return AI.wantsDefensiveTimeout(state, side); },
    timeoutOnOffense(state) { return AI.wantsOffensiveTimeout(state, side); },
    kneel(state) { return AI.shouldKneel(state); },
    spike(state) { return AI.shouldSpike(state); },
  };
}

export function newTendencies() { return { passRate: 0.55, passes: 0, plays: 0, recentOffense: [], recentDefense: [] }; }
function noteOffense(t, playId, isPass) { t.plays += 1; if (isPass) t.passes += 1; t.passRate = t.plays ? t.passes / t.plays : 0.55; t.recentOffense.push(playId); if (t.recentOffense.length > 12) t.recentOffense.shift(); }
function noteDefense(t, playId) { t.recentDefense.push(playId); if (t.recentDefense.length > 12) t.recentDefense.shift(); }

/**
 * Advance the game by exactly one event (kickoff, try, or scrimmage snap).
 * Returns a description of what happened, or null when the game is over.
 * `choices` lets the UI override the human side's decisions:
 *   { offensePlayId, defensePlayId, fourthDown, fgSignature, tryChoice, kickoff, tempo, timeout }  (fgSignature: activate the kicker's field-goal signature, Task 8 M3)
 */
export function step(state, teams, controllers, tendencies, choices = {}) {
  if (state.finished) return null;
  const side = state.possession;
  const rng = rngFromState(state.rngState);
  const done = () => { state.rngState = rng.state; };
  const ctrl = (s) => controllers[s];
  const offTeam = teams[side], defTeam = teams[R.opponent(side)];

  if (state.phase === 'kickoff' || state.phase === 'free_kick') {
    const kicking = state.kickingTeam;
    const mode = choices.kickoff || ctrl(kicking).kickoff(state);
    done();
    const free = state.phase === 'free_kick';
    const { text, res, sim } = R.doKickoff(state, teams, { onside: mode === 'onside' && state.phase === 'kickoff' });
    // A live kickoff (Task 8 M2) carries its engine play: frames in the scrimmage format, the return unit as the offense.
    return { kind: 'kickoff', text, res, kicking, free, scored: res?.touchdown ? { team: R.opponent(kicking) } : res?.kickingTouchdown ? { team: kicking } : null, ...(sim ? { sim } : {}) };
  }
  if (state.phase === 'try') {
    const tryTeam = state.tryTeam;
    const choice = choices.tryChoice || ctrl(tryTeam).tryChoice(state);
    if (choice === 'two') {
      const offAvail = goalLinePlays(teams[tryTeam].offensePlays);
      const defAvail = teams[R.opponent(tryTeam)].defensePlays;
      const offId = choices.offensePlayId || ctrl(tryTeam).offensePlay(state, teams[tryTeam], offAvail, tendencies[tryTeam], rng, teams[R.opponent(tryTeam)]);
      const defId = choices.defensePlayId || ctrl(R.opponent(tryTeam)).defensePlay(state, teams[R.opponent(tryTeam)], defAvail, tendencies[tryTeam], rng, teams[tryTeam], tendencies[R.opponent(tryTeam)]);
      done();
      const res = R.attemptTwoPoint(state, teams, offId, defId);
      return { kind: 'try', text: res.text, sim: res.sim, offensePlayId: offId, defensePlayId: defId };
    }
    done();
    const res = R.attemptTryKick(state, teams);
    return { kind: 'try', text: res.text };
  }
  if (state.phase !== 'scrimmage') { done(); return null; }

  // Defensive timeout to stop the clock?
  const defSide = R.opponent(side);
  if ((choices.timeout === defSide) || (!choices.timeout && ctrl(defSide).timeoutOnDefense(state))) { R.timeout(state, defSide); }
  if ((choices.timeout === side) || (!choices.timeout && ctrl(side).timeoutOnOffense(state))) { R.timeout(state, side); }

  // Clock runoff before the snap; may end the quarter.
  const tempo = choices.tempo || ctrl(side).tempo(state);
  if (!R.preSnapRunoff(state, tempo)) { done(); return { kind: 'period', text: state.log[state.log.length - 1].text }; }
  if (state.phase !== 'scrimmage') { done(); return { kind: 'period', text: state.log[state.log.length - 1].text }; }

  // Kneel / spike.
  if (!choices.offensePlayId && ctrl(side).kneel(state)) { done(); R.kneel(state); return { kind: 'kneel', text: state.lastPlay.text }; }
  if (!choices.offensePlayId && ctrl(side).spike(state)) { done(); R.spike(state); return { kind: 'spike', text: state.lastPlay.text }; }

  // Fourth down, or an early field goal on any down (end of a half with no time to run a play).
  if (state.down === 4 || choices.fourthDown === 'fg') {
    const sig = R.fieldGoalSignature(state, teams); // Task 8 M3: a field-goal signature the kicker may activate (Dragon Roar), or null
    const decision = choices.fourthDown || ctrl(side).fourthDown(state, offTeam, sig?.available ? sig : null);
    if (decision === 'punt') { done(); const from = state.ballOn; const { text, res } = R.doPunt(state, teams); return { kind: 'punt', text, res, kicking: side, from }; }
    // The player's call comes in `choices`; an AI side decides with the same availability and chart (a player-selectable action is not player-exclusive)
    const aiSig = !choices.fourthDown && !!ctrl(side).fgSignature?.(sig, R.fieldGoalInfo(state, teams).chance, state);
    if (decision === 'fg') { done(); const from = state.ballOn; const { text, scored, res } = R.doFieldGoal(state, teams, { signature: !!choices.fgSignature || aiSig }); return { kind: 'field_goal', text, scored, res, kicking: side, from }; }
  }

  // N9d: save the shared warning/removal before either controller selects a play.
  R.preparePreChoice(state, teams);
  // Scrimmage play.
  const offId = choices.offensePlayId || ctrl(side).offensePlay(state, offTeam, offTeam.offensePlays, tendencies[side], rng, defTeam);
  const defId = choices.defensePlayId || ctrl(defSide).defensePlay(state, defTeam, defTeam.defensePlays, tendencies[side], rng, offTeam, tendencies[defSide]);
  done();
  noteOffense(tendencies[side], offId, PLAYS[offId]?.type === 'pass');
  noteDefense(tendencies[defSide], defId);
  const { sim, outcome } = R.runScrimmagePlay(state, teams, offId, defId, choices.options || {});
  return { kind: 'play', text: outcome.text, sim, outcome, offensePlayId: offId, defensePlayId: defId };
}
function goalLinePlays(ids) { const short = ids.filter((id) => PLAYS[id]?.tags.includes('short') || PLAYS[id]?.tags.includes('goalline') || PLAYS[id]?.tags.includes('redzone')); return short.length ? short : ids; }

/** Play a complete game headless. Returns the final state. */
export function playGame({ home, away, seed = 1, quarterLength = R.DEFAULT_QUARTER, maxSteps = 2000, onStep = null, comeback = null, coinWinner = null, choice = null, otPeriods = null, venue = null, statusCarry = null }) {
  const teams = { home, away };
  const state = R.newGame({ home, away, seed, quarterLength, comeback, coinWinner, choice, otPeriods, venue, statusCarry }); // statusCarry: the opening contest's statuses, applied at kickoff (spec §10)
  const controllers = { home: aiController('home'), away: aiController('away') };
  const tendencies = { home: newTendencies(), away: newTendencies() };
  let steps = 0;
  while (!state.finished && steps < maxSteps) {
    const ev = step(state, teams, controllers, tendencies);
    steps += 1;
    if (onStep) onStep(ev, state);
    if (!ev && !state.finished) { // stuck phase guard
      R.log(state, 'Runner guard: unexpected phase ' + state.phase, 'info');
      break;
    }
  }
  if (!state.finished) { state.finished = true; state.phase = 'final'; state.winner = state.score.home > state.score.away ? 'home' : state.score.away > state.score.home ? 'away' : null; state.guard = true; }
  return state;
}
