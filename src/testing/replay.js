import { step, aiController } from '../sim/game-runner.js';
/** Re-run only captured simulation inputs. Never execute code or restore a save from a report. */
export function replayRecordedPlay(play) {
  if (!play?.replay || play.replay.omitted) throw new Error(play?.replayOmitted || 'This play has no retained replay inputs.');
  const input = JSON.parse(JSON.stringify(play.replay));
  const { state, teams, tendencies, choices, controllerMode } = input;
  if (!state || !teams?.home || !teams?.away || !tendencies) throw new Error('Replay inputs are incomplete.');
  const controllers = { home: aiController('home'), away: aiController('away') };
  if (controllerMode?.mode === 'human') {
    const side = controllerMode.playerSide;
    if (!['home', 'away'].includes(side)) throw new Error('The player side is missing.');
    controllers[side] = { ...controllers[side], timeoutOnDefense: () => false, timeoutOnOffense: () => false, kneel: () => false, spike: () => false, tempo: () => controllerMode.tempo || 'normal' };
  } else if (controllerMode !== 'ai') throw new Error('Unsupported replay controller mode.');
  const event = step(state, teams, controllers, tendencies, choices);
  const expected = play.after;
  const keys = ['rngState', 'playCount', 'phase', 'quarter', 'clock', 'possession', 'down', 'toGo', 'ballOn', 'finished'];
  const differences = keys.filter((k) => JSON.stringify(state[k]) !== JSON.stringify(expected[k])).map((k) => ({ key: k, expected: expected[k], actual: state[k] }));
  if (JSON.stringify(state.score) !== JSON.stringify(expected.score)) differences.push({ key: 'score', expected: expected.score, actual: state.score });
  if (event?.sim?.result !== play.result?.result) differences.push({ key: 'result', expected: play.result?.result, actual: event?.sim?.result });
  if (event?.sim?.yards !== play.result?.yards) differences.push({ key: 'yards', expected: play.result?.yards, actual: event?.sim?.yards });
  return { reproduced: differences.length === 0, differences, event, state };
}
