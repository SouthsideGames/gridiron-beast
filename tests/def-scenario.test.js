// Defensive AI audit tooling (v42.9): the engine's developer trace changes nothing in a play and never appears outside the lab;
// the Attribute Testing Lab's Defensive scenario mode runs the real engine with the chosen defenders rated; the overlay draws
// assignments, intended and actual paths and decisions only from traced frames, and no gameplay screen can reach it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS } from '../src/data/playbook.js';
import { playGame } from '../src/sim/game-runner.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { side } from '../src/lab/attr-trials.js';
import * as D from '../src/lab/def-scenario.js';
import { defOverlaySvg, decisionText } from '../src/ui/def-overlay.js';

const strip = (sim) => JSON.stringify({ ...sim, frames: sim.frames.map(({ dbg, ...f }) => f) });

test('the developer trace leaves every play identical (positions, events, result, stats)', () => {
  const offs = ['three_verticals', 'mesh', 'curl_flat', 'inside_zone', 'outside_zone', 'pa_post', 'flood', 'quick_slants'].filter((k) => PLAYS[k]);
  const defs = ['cover_1', 'cover_3', 'cover_2_zone', 'db_blitz', 'tampa_2', 'man_press', 'zone_blitz', 'goal_line'].filter((k) => PLAYS[k]);
  let n = 0;
  for (const off of offs) for (const def of defs) for (const seed of [11, 12]) {
    const base = { offensePlay: PLAYS[off], defensePlay: PLAYS[def], offense: side(off), defense: side(def), ballOn: 30, ballLat: 0, seed };
    const a = simulatePlay({ ...base, options: { frameEvery: 1 } }); const b = simulatePlay({ ...base, options: { frameEvery: 1, trace: true } });
    assert.ok(a.frames.every((f) => !('dbg' in f)), 'no trace without the option');
    assert.ok(b.frames.some((f) => Array.isArray(f.dbg)), 'traced plays carry the decisions');
    assert.equal(strip(b), strip(a), `${off} vs ${def} seed ${seed}`); n++;
  }
  assert.ok(n >= 100);
});

test('normal games never carry the trace', () => {
  for (let i = 1; i <= 2; i++) {
    let plays = 0;
    playGame({ home: generatedTeam(40 + i, { id: 'h', name: 'H' }), away: generatedTeam(60 + i, { id: 'a', name: 'A' }), seed: 70 + i, onStep: (ev) => { if (ev?.sim) { plays++; assert.ok(ev.sim.frames.every((f) => !('dbg' in f))); } } });
    assert.ok(plays > 20);
  }
});

test('only the lab turns the trace on, and no gameplay screen reads it or imports the overlay', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.js') ? [`${d}/${e.name}`] : []);
  for (const f of walk('src')) {
    const src = fs.readFileSync(f, 'utf8');
    if (/trace:\s*true/.test(src)) assert.ok(['src/lab/def-scenario.js', 'src/ui/screens/attr-lab.js'].includes(f), `${f} turns the trace on`);
    if (/def-overlay\.js/.test(src)) assert.equal(f, 'src/ui/screens/attr-lab.js', `${f} imports the developer overlay`);
    if (/\.dbg\b/.test(src)) assert.ok(['src/ui/def-overlay.js', 'src/ui/screens/attr-lab.js', 'src/sim/engine.js'].includes(f), `${f} reads the trace`);
  }
});

test('scenarios: presets are valid, subjects follow the call, the tested defenders get the rating', () => {
  assert.ok(D.PRESETS.length >= 10);
  for (const p of D.PRESETS) { assert.ok(D.offensePlays().includes(p.off), p.id); assert.ok(D.defensePlays().includes(p.def), p.id); if (p.qb === 'throw') assert.ok(D.receiversOf(p.off).includes(p.target), p.id); }
  assert.deepEqual(D.subjectsOf('cover_3', 'rush'), ['DL1', 'DL2']);
  assert.deepEqual(D.subjectsOf('cover_3', 'CB1'), ['CB1']);
  assert.ok(D.subjectsOf('db_blitz', 'rush').includes('CB1'), 'a blitzing corner is a rusher');
  assert.deepEqual(D.subjectsOf('cover_3', 'coverage').sort(), ['CB1', 'CB2', 'FS', 'LB1', 'SS']);
  const kinds = new Set(D.defensePlays().map(D.defenseKind)); for (const k of ['Man', 'Zone', 'Blitz', 'Run front']) assert.ok(kinds.has(k), k);
  const sc = D.PRESETS.find((p) => p.id === 'man_go');
  const lo = D.runScenario(sc, 40, 1001), lo2 = D.runScenario(sc, 40, 1001), hi = D.runScenario(sc, 99, 1001);
  assert.equal(JSON.stringify(lo.frames), JSON.stringify(lo2.frames), 'same seed, same play');
  assert.notEqual(JSON.stringify(lo.frames), JSON.stringify(hi.frames), 'the rating changes the play');
  let seed = 1001; while (!D.runScenario(sc, 40, seed).events.some((e) => e.kind === 'throw')) seed++;
  const m = D.measureScenario(D.runScenario(sc, 40, seed)); assert.ok(m.completeAllowed !== null && m.arriveSep !== null && m.runYards === null);
  const run = D.measureScenario(D.runScenario(D.PRESETS.find((p) => p.id === 'run_inside'), 65, 1001)); assert.equal(run.completeAllowed, null);
  const agg = D.aggregate([{ ...m, sack: true }, { ...m, sack: false }]); assert.equal(agg.sack, 0.5);
  const asg = D.assignmentsOf(sc); assert.equal(asg.CB1.kind, 'man'); assert.ok(asg.CB1.man); assert.equal(asg.FS.kind, 'zone');
});

test('the overlay draws assignments, intended and actual paths and decisions from traced frames only', () => {
  const sc = D.PRESETS.find((p) => p.id === 'zone_curl'); const sim = D.runScenario(sc, 65, 1001, { trace: true });
  const i = Math.floor(sim.frames.length / 2);
  const svg = defOverlaySvg({ frames: sim.frames, i, ballOn: sim.ballOn, camTop: sim.ballOn + 36, assignments: D.assignmentsOf(sc) });
  assert.match(svg, /<circle[^>]+stroke="#ffd166"/, 'zones'); assert.match(svg, /stroke="#7cf3ff"/, 'intended movement'); assert.match(svg, /<polyline/, 'actual path'); assert.match(svg, /<text/, 'decisions');
  const man = D.PRESETS.find((p) => p.id === 'man_go'); const ms = D.runScenario(man, 65, 1001, { trace: true });
  assert.match(defOverlaySvg({ frames: ms.frames, i: 20, ballOn: ms.ballOn, camTop: ms.ballOn + 36, assignments: D.assignmentsOf(man) }), /stroke="#ff9f43"/, 'man lines');
  const plain = D.runScenario(sc, 65, 1001);
  assert.equal(defOverlaySvg({ frames: plain.frames, i, ballOn: plain.ballOn, camTop: plain.ballOn + 36 }), '', 'nothing without the trace');
  const focus = defOverlaySvg({ frames: sim.frames, i, ballOn: sim.ballOn, camTop: sim.ballOn + 36, assignments: D.assignmentsOf(sc), focus: 'CB1' });
  assert.equal((focus.match(/<text/g) || []).length, 1, 'one defender in focus');
  assert.equal(decisionText(['CB1', 'man', 'WR1: on top', 0, 0, 0]), 'man · WR1: on top');
  assert.equal(decisionText(['LB1', 'run-fit', null, 0, 0, 1]), 'run fit · run read');
});
