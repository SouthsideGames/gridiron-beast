// AI Testing Lab defensive rotation and v42.6 records (GDD §53.8): every live defense once per cycle in a shuffled order, per
// offensive play, kept across a save/load (the screen stores the plain object); the real playbooks; holding the ball recorded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Lab from '../src/lab/qb-lab.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { createRng } from '../src/core/rng.js';

test('the Lab uses the live playbooks: every pass play (play-action included) and every defense', () => {
  assert.deepEqual(Lab.LAB_PASS_PLAYS, OFFENSE_IDS.filter((id) => PLAYS[id].type === 'pass'));
  assert.ok(Lab.LAB_PASS_PLAYS.some((id) => PLAYS[id].tags.includes('play_action')));
  assert.deepEqual(Lab.LAB_DEFENSES, DEFENSE_IDS);
  const sit = Lab.makeSituation({ offense: 'smash', defense: 'cover_3', seed: 9 }); const inp = Lab.playInput(sit);
  assert.equal(inp.offensePlay, PLAYS.smash); assert.equal(inp.defensePlay, PLAYS.cover_3); // the production definitions themselves
});

test('rotation: no defense repeats within a cycle; three full cycles each cover all defenses; a new cycle never opens with the last one', () => {
  const rng = createRng(11); let e = null; const seq = [];
  for (let k = 0; k < DEFENSE_IDS.length * 3; k++) { e = Lab.rotationEnsure(e, rng); const d = Lab.rotationCurrent(e); seq.push(d); Lab.rotationComplete(e, d); }
  const n = DEFENSE_IDS.length;
  for (let c = 0; c < 3; c++) assert.deepEqual([...seq.slice(c * n, (c + 1) * n)].sort(), [...DEFENSE_IDS].sort(), `cycle ${c + 1}`);
  assert.notEqual(seq[n - 1], seq[n]); assert.notEqual(seq[2 * n - 1], seq[2 * n]);
  assert.notDeepEqual(seq.slice(0, n), seq.slice(n, 2 * n), 'each cycle is reshuffled');
  e = Lab.rotationEnsure(e, rng); assert.deepEqual(Lab.rotationProgress(e), { tested: 0, total: n, cycle: 4 });
  assert.ok(Object.values(e.counts).every((v) => v === 3), 'every matchup counted three times');
});

test('rotation: per offensive play, survives a save/load, an unfinished situation does not count, replays only add to the count', () => {
  const rng = createRng(5); const rot = {};
  rot.smash = Lab.rotationEnsure(rot.smash, rng); const a = Lab.rotationCurrent(rot.smash); Lab.rotationComplete(rot.smash, a);
  rot.mesh = Lab.rotationEnsure(rot.mesh, rng); const pendingMesh = Lab.rotationCurrent(rot.mesh); // started, never finished
  const back = JSON.parse(JSON.stringify(rot)); // what the Lab's storage keeps
  const s2 = Lab.rotationEnsure(back.smash, rng); assert.deepEqual(Lab.rotationProgress(s2), { tested: 1, total: DEFENSE_IDS.length, cycle: 1 }); assert.notEqual(Lab.rotationCurrent(s2), a);
  const m2 = Lab.rotationEnsure(back.mesh, rng); assert.equal(Lab.rotationCurrent(m2), pendingMesh); assert.equal(Lab.rotationProgress(m2).tested, 0);
  const next = Lab.rotationCurrent(s2); Lab.rotationComplete(s2, a); assert.equal(s2.counts[a], 2); assert.equal(Lab.rotationCurrent(s2), next, '"Same situation" does not skip the next defense');
  const stale = Lab.rotationEnsure({ queue: ['retired_play', ...s2.queue], done: [...s2.done, 'retired_play'], cycle: 1, counts: {} }, rng);
  assert.ok(!stale.queue.includes('retired_play') && !stale.done.includes('retired_play'), 'plays no longer in the playbook are dropped');
});

test('records: a tapped receiver keeps his monster id; holding the ball until the play ends is recorded as hold; old throw-away records still import', () => {
  const sit = Lab.makeSituation({ offense: 'curl_flat', defense: 'cover_2_zone', seed: 321 }); const hold = Lab.runHold(sit); const ai = Lab.runAI(sit);
  const h = Lab.runHuman(sit, { at: 1.3, action: 'throw', target: 'RB' });
  const r = Lab.decisionRecord({ sit, mode: 'live', human: { at: 1.3, action: 'throw', target: 'RB' }, humanSim: h, aiSim: ai, holdSim: hold, outcomes: null });
  assert.equal(r.human.targetId, Lab.playInput(sit).offense.RB.id); assert.equal(h.qb.decision.slot, 'RB'); assert.equal(h.qb.decision.t, 1.3, 'the tap acts at its own moment');
  const held = Lab.decisionRecord({ sit, mode: 'live', human: { at: hold.elapsed, action: 'hold', target: null }, humanSim: hold, aiSim: ai, holdSim: hold, outcomes: { human: null, ai: Lab.rollouts(sit, null, 2) } });
  assert.equal(held.human.action, 'hold'); assert.equal(held.situation.defensePlay, 'cover_2_zone'); assert.notEqual(hold.result, 'throwaway');
  const legacy = { ...r, id: 'old', human: { ...r.human, action: 'throwaway', target: null } };
  const v = Lab.validateRecords({ records: [r, held, legacy] }); assert.equal(v.records.length, 3);
  const A = Lab.analyse(v.records); assert.equal(A.scrambleThrowAway.youThrewAway, 1); assert.equal(A.total, 3);
});
