import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/franchise/t8/grading.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
test('missing opportunities are neutral for every position and Clash role', () => {
  for (const name of ['offensiveLineGrade', 'quarterbackGrade', 'runningBackGrade', 'wideReceiverGrade', 'tightEndGrade', 'defensiveLineGrade', 'linebackerGrade', 'defensiveBackGrade', 'kickerGrade', 'clashGrade']) close(G[name](), 0);
});
test('OL failure priority prevents stacked sack penalties; ordinary blocks earn credit', () => {
  assert.equal(G.blockScore({ sackAllowed: true, pressureAllowed: true, disruptiveShedAllowed: true, pancake: true }), -3);
  close(G.offensiveLineGrade(Array(10).fill({ success: true })), .2);
  close(G.offensiveLineGrade([{ success: true }]), .02);
  close(G.offensiveLineGrade([{ sackAllowed: true, uncertain: true }]), 0);
});
test('QB rate has no sample reduction; excluded handoffs do not dilute play grade', () => {
  close(G.quarterbackGrade({ attempts: 1, completions: 1 }), .1);
  close(G.quarterbackGrade({ plays: [{ completion: true }, ...Array(9).fill({ handoff: true })] }), .02);
  close(G.quarterbackGrade({ plays: [{ touchdown: true, fumble: true }] }), -.02);
  close(G.quarterbackGrade({ attempts: 10, completions: 10, plays: Array(10).fill({ touchdown: true }) }), .2);
});
test('RB fumbles override positives and efficiency scales with carries', () => {
  assert.equal(G.runningBackScore({ fumble: true, touchdown: true }), -3);
  assert.equal(G.runningBackScore({ carry: true, yards: -1 }), -1);
  close(G.runningBackGrade({ carries: 1, rushingYards: 6 }), .01);
});
test('WR rates scale with targets while earned counting stats do not', () => {
  close(G.wideReceiverGrade({ targets: 1, receptions: 1, yards: 20, explosives: 1 }), .04);
  close(G.wideReceiverGrade({ targets: 5, drops: 3 }), -.16);
  close(G.wideReceiverGrade({ targets: 0 }), 0);
  close(G.wideReceiverGrade({ targets: 5, receptions: 5, yards: 100, touchdowns: 4, explosives: 5 }), .2);
});
test('fixed defensive weights leave unavailable categories neutral', () => {
  close(G.defensiveLineGrade({ passRush: Array(10).fill(2) }), .06);
  close(G.linebackerGrade({ coverage: Array(5).fill(2) }), .05);
  close(G.defensiveBackGrade({ execution: Array(10).fill(1) }), .05);
  close(G.defensiveBackGrade({ execution: Array(10).fill(1) }, { safety: true }), .04);
});
test('kicking uses documented pre-attempt odds and attainable placement errors', () => {
  close(G.kickScore({ made: true, probability: .9 }), .2);
  close(G.kickScore({ made: false, probability: .9 }), -1.8);
  close(G.kickScore({ made: true, probability: .3 }), 1.4);
  close(G.kickerGrade({ fieldGoals: [{ made: true, probability: 1 }] }), 0);
  assert.equal(G.placementScore({ error: 3 }), 1);
  assert.equal(G.placementScore({ error: 3.1 }), .5);
  assert.equal(G.placementScore({ error: 0, failed: true }), -1);
  assert.throws(() => G.kickScore({ made: true }), RangeError);
});
test('Clash rewards useful support by role and retains failed-action opportunities', () => {
  close(G.clashGrade({ archetype: 'Support', support: [1, 1, 1] }), .12);
  close(G.clashGrade({ archetype: 'Striker', support: [1, 1, 1] }), .01);
  close(G.clashGrade({ archetype: 'Support', support: [0, 0, 0] }), -.12);
  close(G.clashGrade({ archetype: 'Support', support: [.5, .5, .5] }), 0);
  close(G.clashGrade({ archetype: 'Striker', offense: [0] }), -.04);
  close(G.clashGrade({ involved: false, offense: [1, 1, 1] }), 0);
});
