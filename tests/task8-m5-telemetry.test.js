import test from 'node:test';
import assert from 'node:assert/strict';
import { recordPerformance } from '../src/sim/t8/performance.js';
import { createPerformanceLedger } from '../src/clash/t8/performance.js';
import { footballGrade } from '../src/franchise/t8/grading.js';
import { simulateClashT8 } from '../src/clash/t8/engine.js';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS } from '../src/data/playbook.js';
import { mon } from './clash/helpers.js';
import { lineup } from './tools/lineup.js';

const state = () => ({ stats: { home: { players: {} }, away: { players: {} } } });
const sim = (more = {}) => ({ result: 'tackle', yards: 20, ballOn: 85, names: { off: { QB: 'QB', WR1: 'WR', OL1: 'OL' }, def: { DL1: 'DL', CB1: 'CB' } }, assignments: { def: { DL1: { a: 'rush' }, CB1: { a: 'man' } } }, stats: { passer: 'QB', target: 'WR1', receiver: 'WR1', yac: 6 }, ...more });
test('receiving telemetry distinguishes non-TD late-down and red-zone first downs', () => {
  const s = state(); recordPerformance(s, sim(), 'home', 'away', { down: 3, toGo: 10 });
  const p = s.stats.home.players.WR1.performance;
  assert.equal(p.firstDowns, 1); assert.equal(p.lateDownFirstDowns, 1); assert.equal(p.redZoneFirstDowns, 1); assert.equal(p.explosives, 1);
  assert.ok(footballGrade('WR', p) > 0);
  const t = state(); recordPerformance(t, sim({ result: 'touchdown' }), 'home', 'away', { down: 3 });
  assert.equal(t.stats.home.players.WR1.performance.firstDowns, 0);
});
test('clone receiver production never enters the owner performance reward', () => {
  const s = state(); recordPerformance(s, sim({ stats: { passer: 'QB', target: 'WR1', receiver: 'WR1', cloneProvenance: { target: 'clone', receiver: 'clone' } } }), 'home', 'away');
  assert.equal(s.stats.home.players.WR1, undefined);
  assert.equal(s.stats.home.players.QB.performance.completions, 1, 'the real passer still made his own pass');
});
test('a dropped or uncatchable target grants no personal coverage success', () => {
  for (const extra of [{ dropped: true }, { catchableTarget: false }]) {
    const s = state(); recordPerformance(s, sim({ result: 'incomplete', yards: 0, stats: { passer: 'QB', target: 'WR1', coverBy: 'CB1', coverageExecution: { CB1: 1 }, ...extra } }), 'home', 'away');
    assert.equal(s.stats.away.players.CB1.performance.execution, undefined);
    assert.equal(footballGrade('CB', s.stats.away.players.CB1.performance), 0);
  }
});
test('a completed pass still creates a pass-rush opportunity; coverage snaps do not', () => {
  const s = state(); recordPerformance(s, sim(), 'home', 'away');
  assert.deepEqual(s.stats.away.players.DL1.performance.passRush, [0]);
  assert.equal(s.stats.away.players.CB1.performance.passRush, undefined);
});
test('full support health gives zero credit; mixed-size recipients have equal weights and cleanse shares the cap', () => {
  const l = createPerformanceLedger();
  l.support('h', 'a', 'small', { healed: 15, maxHp: 100 });
  l.support('h', 'a', 'large', { healed: 0, maxHp: 1000 });
  assert.deepEqual(l.result().h.support, [.5]);
  l.support('h', 'a', 'large', { maxHp: 1000, cleansed: true });
  l.support('h', 'a', 'small', { maxHp: 100, cleansed: true });
  assert.deepEqual(l.result().h.support, [1]);
});
test('benefit ledger bounds repeated protection and credits an effective control application once', () => {
  const l = createPerformanceLedger(); l.defense('tank', 1, 'ally', 20, 100); l.defense('tank', 1, 'ally', 20, 100);
  const used = l.control('d'); used(); used();
  assert.deepEqual(l.result().tank.defense, [1]); assert.deepEqual(l.result().d.disruption, [1]);
  l.offense('s', { hpDamage: 0, enemyMaxHp: 100 });
  assert.deepEqual(l.result().s.offense, [0], 'valid miss is still a failed damaging opportunity');
});
test('Clash grading telemetry is identical with logs on/off, separate from the battle state', () => {
  const args = { a: [mon('charbun', 1)], b: [mon('pebble', 2)], seed: 31, config: { abilities: 'off' } };
  const a = simulateClashT8(args), b = simulateClashT8({ ...args, log: 'none' });
  assert.deepEqual(a.performance, b.performance); assert.equal(a.stateHash, b.stateHash);
  assert.ok(a.performance[args.a[0].id].offense.length);
});
test('proximity during a walkthrough earns no pressure; real pressure requires a committed action', () => {
  const L = lineup(11, 60);
  const args = { offensePlay: PLAYS.mesh, defensePlay: PLAYS.cover_0, ballOn: 40, seed: 4, offense: L.offense, defense: L.defense };
  const dry = simulatePlay({ ...args, options: { dryRun: {} } });
  assert.equal(dry.stats.pressure, false);
  const live = simulatePlay(args);
  if (live.stats.pressure) assert.ok(live.events.some((e) => ['throw', 'pass', 'scramble', 'sack', 'fumble'].includes(e.kind)));
});
