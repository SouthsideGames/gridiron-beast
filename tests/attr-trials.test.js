// Attribute trials (GDD §8.2 audit): the Attribute Testing Lab's comparisons run on the real engine with everything but the
// subject's attribute held equal, and report measured numbers. These assert the audit's confirmed effects and the baseline for
// its confirmed problems, so a later fix shows up here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/lab/attr-trials.js';
import { ATTR_ORDER } from '../src/data/stat-guide.js';

const byId = (id) => T.TRIALS.find((t) => t.id === id);
test('every attribute has at least one trial; every trial measures something and names a known metric', () => {
  for (const a of ATTR_ORDER) assert.ok(T.TRIALS.some((t) => t.attr === a) || ['durability', 'kicking'].includes(a), a);
  for (const t of T.TRIALS) { const m = t.measure(t.run(65, 1000)); assert.ok(Object.keys(m).length >= 1, t.id); for (const k of Object.keys(m)) assert.ok(T.METRIC[k], `${t.id}: ${k} is labelled`); }
});
test('controlled setup: everyone a plain 65 with no ability or type, only the subject changed; the same seed gives the same play', () => {
  const o = T.side('three_verticals', ['WR1'], 'speed', 95);
  for (const [slot, m] of Object.entries(o)) { assert.equal(m.ability, null); assert.equal(m.type, null); for (const k of ATTR_ORDER) assert.equal(m.attrs[k], slot === 'WR1' && k === 'speed' ? 95 : 65, `${slot}.${k}`); }
  const t = byId('speed_rb'); assert.deepEqual(t.measure(t.run(75, 1234)), t.measure(t.run(75, 1234)));
});
test('Speed: a 95 receiver reaches 20 yards sooner and peaks faster than a 50 (movement), and a 95 back gains more', () => {
  const r = T.runTrial(byId('speed_wr_go'), 10, [50, 95]); assert.ok(r.levels[95].t20 < r.levels[50].t20 - 0.3); assert.ok(r.levels[95].peak > r.levels[50].peak + 1.5);
  const rb = T.runTrial(byId('speed_rb'), 60, [50, 95]); assert.ok(rb.levels[95].yards > rb.levels[50].yards + 1.5, JSON.stringify(rb.levels));
});
test('Blocking, Tackling and Catching move their outcomes the right way (60 plays, same seeds)', () => {
  const b = T.runTrial(byId('blocking_pass'), 60, [50, 95]); assert.ok(b.levels[95].pressureAt > b.levels[50].pressureAt + 0.15, 'blocking delays pressure');
  const k = T.runTrial(byId('tackling_cb_open'), 60, [50, 95]); assert.ok(k.levels[95].brokenAllowed < k.levels[50].brokenAllowed, 'tackling breaks fewer');
  const c = T.runTrial(byId('catching_wr_open'), 60, [50, 95]); assert.ok(c.levels[95].complete > c.levels[50].complete + 0.05, 'catching completes more');
});
test('Accuracy: across seven forced throws a 95 quarterback completes at least 5 points more than a 50 and reaches his receiver more often (v42.12, owner-approved)', (t) => {
  // Replaces the single forced curl vs Cover 4 (a defender who drives to the aim point meets an accurate ball there, so that one
  // scenario measured his arrival more than Accuracy). Each route's numbers are kept as diagnostics so a curl regression stays visible.
  const a = T.accuracyRoutesStudy(120, [50, 95]); const pct = (x) => (100 * x).toFixed(1);
  for (const [label, r] of Object.entries(a.routes)) t.diagnostic(`${label}: complete ${pct(r[50].complete)}% -> ${pct(r[95].complete)}%, int ${pct(r[50].int)}% -> ${pct(r[95].int)}%, ball reached ${pct(r[50].reached)}% -> ${pct(r[95].reached)}%`);
  t.diagnostic(`all seven: complete ${pct(a.levels[50].complete)}% -> ${pct(a.levels[95].complete)}%`);
  assert.equal(Object.keys(a.routes).length, 7);
  assert.ok(a.levels[95].complete - a.levels[50].complete >= 0.05, `accuracy completes at least 5 points more: ${pct(a.levels[50].complete)}% -> ${pct(a.levels[95].complete)}%`);
  assert.ok(a.levels[95].reached > a.levels[50].reached, 'accurate balls reach the receiver more often');
});
// Carrier vision (v42.8 fix 3; scenario replaced in v42.14). The v42.8 check used one cell, Power Right vs Cover 3 over seeds
// 1000-1149, and asked Awareness 95 to gain 0.3 yd more than 50. That cell is a seed lottery: over six independent 150-seed
// ranges v42.13.0 measured +0.03, -0.03, +1.37, +0.12, +0.25, +0.02 (it passed only on its own range, +0.46), and v42.14 measures
// +0.48, +0.43, +0.22, +0.54, +0.59, +0.13 (-0.02 on the old range). This test asks the same question across six run concepts
// against seven calls, on the same seeds for both ratings: the aware back gains more overall and in most concepts, sees more lanes
// worth taking (cuts at least twice as often), and his cuts pay (on the plays he cuts, he beats the same play at 50). With vision
// switched off in the engine (Awareness held at 50 inside laneChoice and preContactLane) all four fail (+0.02 yd, 3 of 6
// concepts, cut rate 1.0x, -0.07 yd on cuts); v42.13.0 passes (+0.26, 5 of 6, 2.3x, +0.02) and v42.14 passes (+0.31, 6 of 6, 2.8x, +0.75).
test('carrier vision: an aware back finds and uses better lanes across run concepts, not one cell', (t) => {
  const offs = ['inside_zone', 'power_right', 'power_left', 'dive', 'outside_zone', 'counter'], defs = ['cover_3', 'cover_2_zone', 'cover_4', 'tampa_2', 'cover_1', 'run_wall', 'bear_front'];
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length; const per = {}, all = { 50: [], 95: [] }, cutGain = []; let cut50 = 0, cut95 = 0, n = 0;
  for (const off of offs) { per[off] = { 50: [], 95: [] }; for (const def of defs) for (let i = 0; i < 60; i++) {
    const run = (v) => T.play({ off, def, offSubjects: ['RB'], attr: 'awareness', value: v, seed: 7000 + i }); const a = run(50), b = run(95); n++;
    per[off][50].push(a.yards); per[off][95].push(b.yards); all[50].push(a.yards); all[95].push(b.yards);
    if (a.events.some((e) => e.kind === 'cutback')) cut50++; if (b.events.some((e) => e.kind === 'cutback')) { cut95++; cutGain.push(b.yards - a.yards); } } }
  const deltas = Object.fromEntries(offs.map((o) => [o, +(mean(per[o][95]) - mean(per[o][50])).toFixed(2)])); const d = mean(all[95]) - mean(all[50]);
  t.diagnostic(`vision: +${d.toFixed(2)} yd overall; by concept ${JSON.stringify(deltas)}; cutbacks ${(100 * cut50 / n).toFixed(1)}% -> ${(100 * cut95 / n).toFixed(1)}%; cut plays vs the same seed at 50: ${mean(cutGain).toFixed(2)} yd`);
  assert.ok(d >= 0.2, `an aware back gains more over 42 matchups: +${d.toFixed(2)} yd`);
  assert.ok(Object.values(deltas).filter((x) => x > 0).length >= 4, `vision helps in most run concepts: ${JSON.stringify(deltas)}`);
  assert.ok(cut95 >= 2 * cut50 && cut95 > 0, `he sees more lanes worth taking: ${cut50} -> ${cut95} cutbacks in ${n}`);
  assert.ok(mean(cutGain) > 0, `the lanes he takes pay: ${mean(cutGain).toFixed(2)} yd against the same play at 50`);
});
test('attribute fixes (v42.8): a fast receiver is no longer punished on the deep ball, and the better corner is better on a comeback', () => {
  const d = T.runTrial(byId('speed_wr_lead'), 60, [50, 95]); assert.ok(d.levels[95].caught >= d.levels[50].caught, `open deep catches rise with Speed: ${JSON.stringify(d.levels)}`); assert.ok(d.levels[95].overrun <= d.levels[50].overrun + 0.3, 'a fast receiver no longer runs past the ball more than a slow one');
  const c = T.runTrial(byId('coverage_cb_cut'), 60, [50, 95]); assert.ok(c.levels[95].sepAfterBreak < c.levels[50].sepAfterBreak + 1.0 && c.levels[95].arriveSep <= c.levels[50].arriveSep + 0.3, `coverage is not inverted on a comeback: ${JSON.stringify(c.levels)}`);
  const g = T.runTrial(byId('coverage_cb_man'), 60, [50, 95]); assert.ok(g.levels[95].arriveSep < g.levels[50].arriveSep, 'a better corner is tighter on a go route');
  const y = T.runTrial(byId('awareness_rb_yac'), 150, [50, 95]); assert.ok(y.levels[95].yac > y.levels[50].yac + 0.3, `open-field vision: ${JSON.stringify(y.levels)}`);
  // Vision is not a cheat code (v42.8), and the call still matters. The v42.8 form asked for under 30% cutbacks on inside zone vs
  // Cover 3. Since v42.14 the linebacker fits the back's flow, so the called hole is filled far more often and cutting back is the
  // read the play is built on ("the back reads the first lineman and cuts"): 82% at Awareness 95. The guard now asks what that
  // number stood for: the yards stay close (not a cheat code), and he leaves the call because of the defense, not regardless of it.
  // An engine that makes the aware back cut on every read fails both cut checks (96% on a clear lane, 77% on a filled one).
  const iz = T.runTrial(byId('awareness_rb'), 100, [50, 95]); assert.ok(Math.abs(iz.levels[95].yards - iz.levels[50].yards) < 1.5, `vision is not a cheat code on inside zone: ${JSON.stringify(iz.levels)}`);
  const lane = { clear: [0, 0], filled: [0, 0] };
  for (const def of ['cover_3', 'cover_2_zone', 'cover_4', 'tampa_2', 'cover_1', 'max_drop', 'prevent', 'run_wall', 'bear_front']) for (let i = 0; i < 60; i++) {
    const sim = T.play({ off: 'inside_zone', def, offSubjects: ['RB'], attr: 'awareness', value: 95, seed: 84000 + i, options: { trace: true } });
    const cut = sim.events.find((e) => e.kind === 'cutback'); const look = 2.5 + 2.5 * (95 / 99); // the decision point: the cut, or where he would read the called gate [2, -1]
    const f = cut ? sim.frames.find((x) => x.t >= cut.t - 1e-6) : sim.frames.find((x) => (x.off.find((q) => q[0] === 'RB')?.[1] ?? -9) >= 2 - look); if (!f?.dbg) continue;
    const rb = f.off.find((q) => q[0] === 'RB'); const filled = f.def.some((d, k) => f.dbg[k][1] !== 'engaged' && Math.abs(d[2] + 1) < 1.6 && d[1] - rb[1] > 0.5 && d[1] - rb[1] < 7);
    const k = filled ? 'filled' : 'clear'; lane[k][0]++; if (cut) lane[k][1]++;
  }
  const clear = lane.clear[1] / lane.clear[0], filled = lane.filled[1] / lane.filled[0];
  assert.ok(lane.clear[0] >= 100 && lane.filled[0] >= 100, `both cases sampled ${JSON.stringify(lane)}`);
  assert.ok(filled >= clear + 0.15, `he leaves the called lane because it is filled: ${(100 * filled).toFixed(0)}% when filled vs ${(100 * clear).toFixed(0)}% when clear`);
  assert.ok(clear < 0.6, `with the called lane clear he mostly runs the call: ${(100 * clear).toFixed(0)}% cutbacks`);
});

test('durability and kicking studies report measured numbers that move the right way', () => {
  const d = T.durabilityStudy(200, [50, 95]); assert.ok(d.levels[95].fatigueGain < d.levels[50].fatigueGain);
  const k = T.kickingStudy(50, [50, 95]); assert.ok(k.levels[95].fg45 > k.levels[50].fg45 && k.levels[95].puntAvg > k.levels[50].puntAvg && k.levels[95].range > k.levels[50].range);
});
