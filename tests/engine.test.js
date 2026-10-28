import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';
import { createRng } from '../src/core/rng.js';
import { boundsFor } from '../src/core/field.js';
import { lineup } from './tools/lineup.js';

const L = lineup(11, 60);
const DEAD = new Set(['tackle', 'sack', 'incomplete', 'touchdown', 'out_of_bounds', 'interception', 'fumble', 'safety', 'throwaway', 'touchback_return']);

function batch(count, seedBase = 1, ballOnFn = (s) => 5 + (s * 13) % 90) {
  const out = [];
  for (let s = seedBase; s < seedBase + count; s++) {
    const o = PLAYS[OFFENSE_IDS[s % OFFENSE_IDS.length]], d = PLAYS[DEFENSE_IDS[(s * 7) % DEFENSE_IDS.length]];
    out.push(simulatePlay({ offensePlay: o, defensePlay: d, ballOn: ballOnFn(s), seed: s, offense: L.offense, defense: L.defense }));
  }
  return out;
}

test('same inputs and seed reproduce identical frames and result', () => {
  const run = () => simulatePlay({ offensePlay: PLAYS.mesh, defensePlay: PLAYS.cover_3, ballOn: 40, seed: 777, offense: L.offense, defense: L.defense });
  const a = run(), b = run();
  assert.equal(a.result, b.result);
  assert.equal(a.yards, b.yards);
  assert.deepEqual(a.frames, b.frames);
  const c = simulatePlay({ offensePlay: PLAYS.mesh, defensePlay: PLAYS.cover_3, ballOn: 40, seed: 778, offense: L.offense, defense: L.defense });
  assert.notDeepEqual(a.frames, c.frames, 'a different seed changes the play');
});

test('every play ends on a dead-ball event, never the safety guard (2,000 seeds)', () => {
  const plays = batch(2000);
  for (const r of plays) assert.ok(DEAD.has(r.result), `${r.offensePlay} vs ${r.defensePlay} seed ${r.seed}: ${r.result}`);
  assert.ok(plays.every((r) => r.elapsed < 20));
});

test('reported yards match the final ball spot and respect the field', () => {
  for (const r of batch(600, 5000)) {
    const B = boundsFor(r.ballOn);
    if (['incomplete', 'throwaway'].includes(r.result)) { assert.equal(r.yards, 0); continue; }
    const last = r.frames[r.frames.length - 1];
    assert.ok(Math.abs(last.ball[0] - r.yards) <= 1.01, `${r.result} ball ${last.ball[0]} vs yards ${r.yards}`);
    assert.ok(r.endYard >= -10 && r.endYard <= 110);
    if (r.result === 'touchdown' && !r.stats.defensiveScore) assert.ok(last.ball[0] >= B.goal - 0.01, 'touchdown is at or past the goal line');
    if (r.result === 'safety') assert.ok(last.ball[0] <= B.ownGoal + 0.3);
  }
});

test('no player leaves the field at any frame', () => {
  for (const r of batch(400, 9000)) {
    const B = boundsFor(r.ballOn);
    for (const f of r.frames) {
      for (const [slot, x, y] of [...f.off, ...f.def]) {
        if (slot === f.holder) continue; // the carrier may cross the line to end the play
        assert.ok(y >= B.left - 0.01 && y <= B.right + 0.01, `${slot} y=${y} at t=${f.t} (${r.offensePlay})`);
        assert.ok(x >= B.ownEndLine - 0.01 && x <= B.endLine + 0.01, `${slot} x=${x}`);
      }
    }
  }
});

test('a carrier crossing the sideline is out of bounds at that spot', () => {
  const plays = batch(1500, 20000);
  const oob = plays.filter((r) => r.result === 'out_of_bounds');
  assert.ok(oob.length > 0, 'some plays end out of bounds');
  for (const r of oob) {
    const B = boundsFor(r.ballOn);
    const last = r.frames[r.frames.length - 1];
    assert.ok(Math.abs(Math.abs(last.ball[1]) - B.right) < 0.5, 'ball spotted at the sideline');
  }
});

test('plays execute their design: carrier, screen target and keeper', () => {
  const draw = simulatePlay({ offensePlay: PLAYS.qb_draw, defensePlay: PLAYS.cover_3, ballOn: 30, seed: 3, offense: L.offense, defense: L.defense });
  assert.equal(draw.stats.carrier, 'QB');
  let screenToRb = 0;
  for (let s = 1; s <= 30; s++) {
    const r = simulatePlay({ offensePlay: PLAYS.rb_screen, defensePlay: PLAYS.cover_2_man, ballOn: 30, seed: s, offense: L.offense, defense: L.defense });
    if (r.stats.target === 'RB') screenToRb++;
  }
  assert.ok(screenToRb >= 20, `screen goes to the back (${screenToRb}/30)`);
  for (let s = 1; s <= 20; s++) {
    const r = simulatePlay({ offensePlay: PLAYS.inside_zone, defensePlay: PLAYS.cover_3, ballOn: 30, seed: s, offense: L.offense, defense: L.defense });
    assert.equal(r.stats.carrier, 'RB');
    assert.ok(r.events.some((e) => e.kind === 'handoff'));
  }
});

test('linemen engage rushers and sacks fall as blocking rises', () => {
  const sacks = (blocking) => {
    const off = structuredClone(L.offense);
    for (const s of ['LG', 'C', 'RG']) off[s].attrs.blocking = blocking;
    let n = 0, engaged = 0;
    for (let s = 1; s <= 250; s++) {
      const r = simulatePlay({ offensePlay: PLAYS.double_move, defensePlay: PLAYS.cover_0, ballOn: 30, seed: s, offense: off, defense: L.defense });
      if (r.result === 'sack' || r.stats.pressure) n++; // a weak line gets the quarterback hit or hurried
      if (r.frames.some((f) => f.off.some((p) => ['LG', 'C', 'RG'].includes(p[0]) && p[3] === 1))) engaged++;
    }
    return { n, engaged };
  };
  const weak = sacks(30), strong = sacks(95);
  assert.ok(weak.engaged > 200 && strong.engaged > 200, 'linemen engage on nearly every dropback');
  assert.ok(weak.n > strong.n, `weak line allows more pressure (${weak.n} vs ${strong.n})`);
});

test('receivers run their routes and man defenders stay with their targets', () => {
  const r = simulatePlay({ offensePlay: PLAYS.three_verticals, defensePlay: PLAYS.cover_2_man, ballOn: 20, seed: 42, offense: L.offense, defense: L.defense, options: { forcedTarget: 'WR2' } });
  const pre = r.frames.filter((f) => f.phase === 'dropback');
  const lastPre = pre[pre.length - 1];
  const wr1 = lastPre.off.find((p) => p[0] === 'WR1');
  assert.ok(wr1[1] > 5, 'WR1 is well downfield on a go route by the throw');
  // Man defender (CB1 on wideL = WR1) within 4 yards of WR1 during the dropback.
  for (const f of pre.filter((fr) => fr.t >= 1.0)) {
    const w = f.off.find((p) => p[0] === 'WR1'), c = f.def.find((p) => p[0] === 'CB1');
    assert.ok(Math.hypot(w[1] - c[1], w[2] - c[2]) < 5, `CB1 within 5 yd of WR1 at t=${f.t}`);
  }
});

test('zone defenders drop to their landmarks', () => {
  const r = simulatePlay({ offensePlay: PLAYS.quick_slants, defensePlay: PLAYS.cover_4, ballOn: 20, seed: 8, offense: L.offense, defense: L.defense, options: { forcedTarget: 'RB' } });
  const f = r.frames.find((fr) => fr.t >= 1.2) || r.frames[r.frames.length - 1];
  for (const slot of ['CB1', 'CB2', 'FS', 'SS']) {
    const d = f.def.find((p) => p[0] === slot);
    assert.ok(d[1] >= 8, `${slot} dropped deep (x=${d[1]})`);
  }
});

test('attributes change outcomes: speed, accuracy, tackling, awareness', () => {
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const withAttr = (side, slot, key, value) => { const c = structuredClone(L); c[side][slot].attrs[key] = value; return c; };
  const yards = (lu, play, def) => { const ys = []; for (let s = 1; s <= 300; s++) ys.push(simulatePlay({ offensePlay: PLAYS[play], defensePlay: PLAYS[def], ballOn: 30, seed: s, offense: lu.offense, defense: lu.defense }).yards); return avg(ys); };
  const slowRb = yards(withAttr('offense', 'RB', 'speed', 30), 'outside_zone', 'cover_3');
  const fastRb = yards(withAttr('offense', 'RB', 'speed', 95), 'outside_zone', 'cover_3');
  assert.ok(fastRb > slowRb, `speed matters (${fastRb.toFixed(1)} vs ${slowRb.toFixed(1)})`);
  // Ball-carrier Awareness over three run concepts (v42.14; was Inside Zone alone). Since Phase A the Cover 3 linebacker fits the back's
  // flow, and on Inside Zone a sharp back's cutback now finds him there: over four 300-seed ranges Awareness 95 vs 20 on that one
  // cell averages +0.03 yd (v42.13.0: +0.26), while Power Right and Dive stay clearly positive. The same strict comparison, summed.
  const vision = (aw) => ['inside_zone', 'power_right', 'dive'].reduce((sum, play) => sum + yards(withAttr('offense', 'RB', 'awareness', aw), play, 'cover_3'), 0) / 3;
  const dumbRb = vision(20), smartRb = vision(95);
  assert.ok(smartRb > dumbRb, `awareness matters (${smartRb.toFixed(2)} vs ${dumbRb.toFixed(2)} yd over Inside Zone, Power Right and Dive)`);
  const comp = (lu) => { let c = 0, n = 0; for (let s = 1; s <= 300; s++) { const r = simulatePlay({ offensePlay: PLAYS.curl_flat, defensePlay: PLAYS.cover_3, ballOn: 30, seed: s, offense: lu.offense, defense: lu.defense }); if (r.stats.passer && r.result !== 'sack') { n++; if (r.stats.receiver) c++; } } return c / n; };
  const wild = comp(withAttr('offense', 'QB', 'accuracy', 20)), sharp = comp(withAttr('offense', 'QB', 'accuracy', 95));
  assert.ok(sharp > wild, `accuracy matters (${sharp.toFixed(2)} vs ${wild.toFixed(2)})`);
  const softD = structuredClone(L); for (const s of Object.keys(softD.defense)) softD.defense[s].attrs.tackling = 25;
  const hardD = structuredClone(L); for (const s of Object.keys(hardD.defense)) hardD.defense[s].attrs.tackling = 95;
  assert.ok(yards(softD, 'power_right', 'cover_1') > yards(hardD, 'power_right', 'cover_1'), 'tackling matters');
});

test('balance bands over 3,000 mixed plays', () => {
  const plays = batch(3000, 40000);
  const runs = plays.filter((r) => PLAYS[r.offensePlay].type === 'run');
  const passes = plays.filter((r) => PLAYS[r.offensePlay].type === 'pass');
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const runAvg = avg(runs.map((r) => r.yards));
  const dropbacks = passes.filter((r) => r.stats.passer || r.result === 'sack');
  const attempts = dropbacks.filter((r) => r.result !== 'sack');
  const completion = attempts.filter((r) => r.stats.receiver).length / attempts.length;
  const sackRate = dropbacks.filter((r) => r.result === 'sack').length / dropbacks.length;
  const intRate = attempts.filter((r) => r.stats.interceptor).length / attempts.length;
  const tdShare = plays.filter((r) => r.touchdown).length / plays.length;
  assert.ok(runAvg >= 2.5 && runAvg <= 7, `run avg ${runAvg.toFixed(2)}`);
  assert.ok(completion >= 0.5 && completion <= 0.78, `completion ${completion.toFixed(2)}`);
  assert.ok(sackRate >= 0.03 && sackRate <= 0.13, `sack rate ${sackRate.toFixed(3)}`);
  // Floor 0.8% since v42.10 (defenders no longer know the landing spot at release, so fewer off-target balls are picked).
  // Chosen from 12 independent 3,000-play seed ranges: the v42.10 engine ranged 0.85–1.52% (mean 1.16%; v42.9 1.00–1.90%), while
  // an engine with the pick chance halved ranged 0.34–0.78% and one with picks disabled 0%, so 0.8% passes every healthy range
  // and fails every halved one (this range: 1.00% vs 0.56%).
  assert.ok(intRate >= 0.008 && intRate <= 0.05, `int rate ${intRate.toFixed(3)}`);
  assert.ok(tdShare > 0.005 && tdShare < 0.12, `td share ${tdShare.toFixed(3)}`);
});

test('rng helpers are deterministic and well-formed', () => {
  const a = createRng(5), b = createRng(5);
  for (let i = 0; i < 50; i++) assert.equal(a.next(), b.next());
  const w = createRng(9).weighted([['x', 0], ['y', 5]]);
  assert.equal(w, 'y');
});

test('kick animations: every kickoff, punt and field goal from real games yields finite frames', async () => {
  const { kickFrames } = await import('../src/ui/kick-anim.js');
  const { generatedTeam } = await import('../src/franchise/roster.js');
  const { playGame } = await import('../src/sim/game-runner.js');
  const kinds = new Set(); let n = 0;
  for (let i = 1; i <= 12; i++) {
    playGame({ home: generatedTeam(300 + i, { id: 'h', name: 'H' }), away: generatedTeam(400 + i, { id: 'a', name: 'A' }), seed: i, onStep: (ev) => {
      if (!ev || !['kickoff', 'punt', 'field_goal'].includes(ev.kind)) return;
      const fr = kickFrames(ev); assert.ok(fr && fr.length > 5, ev.kind); kinds.add(ev.kind); n++;
      for (const f of fr) { assert.ok([...f.off, ...f.def].every(([, x, y]) => Number.isFinite(x) && Number.isFinite(y))); assert.ok(f.ball.every(Number.isFinite)); }
    } });
  }
  assert.ok(n > 40 && kinds.size === 3, `kinds ${[...kinds]}`);
});

test('option read (owner rule): read the extra lineman, else the linebacker; he attacks the QB → pitch, he takes the back → keep', async () => {
  const { PLAYS } = await import('../src/data/playbook.js');
  // Nobody across: nobody to read, so the ball goes to the back.
  const veer = simulatePlay({ offensePlay: PLAYS.inverted_veer, defensePlay: PLAYS.cover_3, seed: 1, options: { dryRun: { noDefense: true } } });
  assert.equal(veer.stats.carrier, 'RB');
  // Heavy and pressure fronts: the extra lineman is the read; he rushes, so the quarterback mostly pitches.
  // Nickel Cover 1: the linebacker is in man on the inside receiver, not coming, so the quarterback mostly keeps.
  const rate = (d) => { let k = 0; for (let s = 1; s <= 60; s++) { const r = simulatePlay({ offensePlay: PLAYS.inverted_veer, defensePlay: PLAYS[d], seed: s }); if (r.stats.carrier === 'QB') k++; assert.ok(r.events.some((e) => /reads .* (and keeps|holds to|will )/.test(e.text)), d); } return k / 60; };
  assert.ok(rate('all_out') < 0.3, 'reads the rushing DL3 and pitches');
  assert.ok(rate('cover_1') > 0.7, 'reads a linebacker who is not coming and keeps');
  const r = simulatePlay({ offensePlay: PLAYS.inverted_veer, defensePlay: PLAYS.all_out, seed: 3 });
  assert.ok(r.events.some((e) => /reads .*DL3|reads/.test(e.text)));
  assert.ok(!r.events.some((e) => /reads [^ ]*CB/.test(e.text)), 'never reads a cornerback');
});
