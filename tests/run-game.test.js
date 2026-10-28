// Phase C1 (owner-approved 2026-10-28): the offensive run game. Handoffs happen hand to hand (F1), designed run blocks outlast the
// handoff (F2), Pro and Spread runs keep the blocker their design needs (F3), climb blocks and Trap (F4), pull timing and the back
// reading his lead block (F5), and Bulwark on run blocks (F6). Plain-65 Lab plays with fixed seeds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { play } from '../src/lab/attr-trials.js';
import { simulatePlay } from '../src/sim/engine.js';
import { side } from '../src/lab/attr-trials.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS, validatePlaybook, offFieldAssignments } from '../src/data/playbook.js';

const RUNS = OFFENSE_IDS.filter((k) => PLAYS[k].type === 'run');
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const at = (sim, t) => sim.frames.find((f) => f.t >= t - 1e-6) || sim.frames.at(-1);
const pos = (f, team, slot) => f[team].find((p) => p[0] === slot);
const gap = (f, a, b) => { const p = pos(f, 'off', a), q = pos(f, 'off', b); return Math.hypot(p[1] - q[1], p[2] - q[2]); };
// The first defender a blocker engages: the engaged defender nearest him on the frame he first engages.
function firstEngaged(sim, slot) {
  for (const f of sim.frames) { const me = pos(f, 'off', slot); if (!me || !me[3]) continue;
    const d = f.def.filter((p) => p[3]).sort((p, q) => Math.hypot(p[1] - me[1], p[2] - me[2]) - Math.hypot(q[1] - me[1], q[2] - me[2]))[0];
    return { t: f.t, vs: d?.[0] || null }; }
  return null;
}

// ---- F1: handoff integrity
test('F1: every handoff on a live run is hand to hand (no ball moves to a back out of reach)', () => {
  for (const off of RUNS) {
    if (PLAYS[off].assignments.QB?.a === 'pitch') continue; // a toss is a pitch, not a handoff
    for (const def of DEFENSE_IDS) for (let s = 0; s < 2; s++) {
      const sim = play({ off, def, attr: 'speed', value: 65, seed: 81000 + s });
      for (const e of sim.events.filter((x) => x.kind === 'handoff')) assert.ok(e.reach <= 1.5, `${off} vs ${def} seed ${81000 + s}: handoff from ${e.reach} yd at ${e.t}`);
    }
  }
});

test('F1: Stretch Left meets at the mesh, behind the line, early', () => {
  const ts = [];
  for (const def of DEFENSE_IDS) for (let s = 0; s < 3; s++) {
    const sim = play({ off: 'stretch_left', def, attr: 'speed', value: 65, seed: 81100 + s }); const h = sim.events.find((e) => e.kind === 'handoff');
    assert.ok(h, `${def}: a handoff happens`); ts.push(h.t);
    assert.ok(pos(at(sim, h.t), 'off', 'RB')[1] < -2, `${def}: the back is behind the line at the handoff (${pos(at(sim, h.t), 'off', 'RB')[1]})`);
  }
  assert.ok(Math.max(...ts) <= 0.7, `handoffs by 0.7 s (latest ${Math.max(...ts)}; v42.15 was 1.15 s from 7 yards)`);
});

test('F1: a back who runs away from the mesh is not handed the ball; the quarterback keeps it', () => {
  // v42.15's Stretch Left path: the back leaves the mesh at once and the two never meet.
  const p = JSON.parse(JSON.stringify(PLAYS.stretch_left)); const old = [[-5.2, -2.8], [-3, -5], [0, -8], [5, -10], [22, -12]];
  p.assignments.RB.points = old; p.assignments.RB.path = old;
  for (let s = 0; s < 20; s++) {
    const sim = simulatePlay({ offensePlay: p, defensePlay: PLAYS.cover_3, offense: side('stretch_left'), defense: side('cover_3'), ballOn: 30, ballLat: 0, seed: 81200 + s, options: { frameEvery: 1 } });
    assert.ok(!sim.events.some((e) => e.kind === 'handoff'), `seed ${81200 + s}: no handoff`);
    assert.ok(sim.events.some((e) => e.kind === 'mesh_missed'), `seed ${81200 + s}: the missed mesh is logged`);
    assert.equal(sim.stats.carrier, 'QB', 'the quarterback is the runner');
  }
});

test('F1: the read option still reads: it keeps against a defender who drops, gives in reach against one who attacks', () => {
  let keeps = 0, gives = 0;
  for (const def of DEFENSE_IDS) for (let s = 0; s < 3; s++) {
    const sim = play({ off: 'read_option', def, attr: 'speed', value: 65, seed: 81300 + s });
    if (sim.events.some((e) => e.kind === 'keep')) keeps++;
    const h = sim.events.find((e) => e.kind === 'handoff'); if (h) { gives++; assert.ok(h.reach <= 1.5, `${def}: the give is in reach (${h.reach})`); }
  }
  assert.ok(keeps > 10 && gives > 10, `both outcomes happen (keeps ${keeps}, gives ${gives})`);
});

// ---- F2: designed run blocks outlast the handoff
test('F2: receivers block on runs; a stalk block is never a sure thing', () => {
  for (const off of ['inside_zone', 'dive', 'trap']) {
    let n = 0, eng = 0;
    for (const def of ['cover_3', 'cover_2_zone', 'cover_1', 'cover_4', 'tampa_2', 'cover_6']) for (let s = 0; s < 15; s++) { const sim = play({ off, def, attr: 'speed', value: 65, seed: 81400 + s }); for (const wr of ['WR1', 'WR2']) { n++; if (firstEngaged(sim, wr)) eng++; } }
    const share = eng / n;
    assert.ok(share > 0.15 && share < 0.95, `${off}: receivers engage on ${(100 * share).toFixed(0)}% of plays (v42.15: 0-5%)`);
  }
});

test('F2: a blocker leaves his job for the escort once the carrier is past him', () => {
  // Power Right's back-side receiver: well wide of the play, so he keeps his stalk until the carrier passes, then escorts.
  let late = 0;
  for (let s = 0; s < 30; s++) { const sim = play({ off: 'power_right', def: 'cover_3', attr: 'speed', value: 65, seed: 81500 + s }); const e = firstEngaged(sim, 'WR1'); const h = sim.events.find((x) => x.kind === 'handoff'); if (e && h && e.t > h.t) late++; }
  assert.ok(late > 0, 'blocks are still made after the handoff');
});

// ---- F3: no assignment for a player who is not on the field
test('F3: the playbook has no assignment for a slot its package leaves off the field, and the check catches one', () => {
  assert.deepEqual(validatePlaybook(), []);
  assert.deepEqual(offFieldAssignments({ name: 'Test', side: 'offense', pkg: 'pro', assignments: { LG: { a: 'block' }, C: { a: 'run_block', to: [2, 0] } } }), ['Test: assignment for C, who is not on the field in the pro package']);
  for (const off of ['inside_zone', 'dive', 'outside_zone', 'toss_sweep', 'trap', 'qb_draw', 'read_option']) assert.ok(['run_block'].includes(PLAYS[off].assignments.TE.a), `${off}: the tight end has the role the centre was drawn for`);
  assert.equal(PLAYS.jet_sweep.assignments.RB.a, 'run_block', 'Jet Sweep: the back leads');
});

// ---- F4: climb blocks and Trap
test('F4: Trap traps: the left guard releases the tackle and climbs, the pulling guard kicks a lineman out', () => {
  let n = 0, kick = 0, lgFirst = 0, lgEng = 0;
  for (const def of DEFENSE_IDS) for (let s = 0; s < 4; s++) {
    const sim = play({ off: 'trap', def, attr: 'speed', value: 65, seed: 81600 + s }); n++;
    const rg = firstEngaged(sim, 'RG'); if (rg && /^DL/.test(rg.vs)) kick++;
    const lg = firstEngaged(sim, 'LG'); if (lg) { lgEng++; if (!/^DL/.test(lg.vs)) lgFirst++; }
  }
  assert.ok(kick / n > 0.6, `the pulling guard kicks out a lineman on ${(100 * kick / n).toFixed(0)}% (v42.15: 28%)`);
  assert.ok(lgFirst / lgEng > 0.8, `the left guard's first block is at the second level (${lgFirst}/${lgEng}; v42.15 blocked the lineman every time)`);
});

test('F4: a block in space can be slipped, by the defender\'s Agility and Awareness', () => {
  const whiffs = (v) => { let w = 0; for (const def of ['cover_3', 'cover_1', 'tampa_2']) for (let s = 0; s < 40; s++) w += play({ off: 'trap', def, defSubjects: PLAYS[def].onField.filter((x) => /^(LB|FS|SS|CB)/.test(x)), attr: 'awareness', value: v, seed: 81700 + s }).events.filter((e) => e.kind === 'whiff').length; return w; };
  const lo = whiffs(50), hi = whiffs(95);
  assert.ok(lo > 0, 'blocks in space are missed sometimes');
  assert.ok(hi > lo, `aware defenders slip more of them (${lo} -> ${hi})`);
});

// ---- F5: pulls lead the back
test('F5: on Power and Counter the pulling guard gets to the hole first and blocks someone', () => {
  for (const [off, puller] of [['power_right', 'LG'], ['power_left', 'RG'], ['counter', 'RG']]) {
    const lead = [], engaged = []; let reads = 0;
    for (const def of DEFENSE_IDS) for (let s = 0; s < 6; s++) {
      const sim = play({ off, def, attr: 'speed', value: 65, seed: 81800 + s }); const f = at(sim, 1.1);
      if (sim.stats.carrier === 'RB') lead.push(pos(f, 'off', puller)[1] - pos(f, 'off', 'RB')[1]);
      engaged.push(firstEngaged(sim, puller) ? 1 : 0); if (sim.events.some((e) => e.kind === 'lead_read')) reads++;
    }
    assert.ok(mean(lead) > 0.2, `${off}: the puller is ahead of the back at 1.1 s (${mean(lead).toFixed(2)} yd; v42.15 -0.7 to -1.7)`);
    assert.ok(mean(engaged) > 0.33, `${off}: the puller blocks someone on ${(100 * mean(engaged)).toFixed(0)}% (v42.15 12-27%)`);
    assert.ok(reads > 0, `${off}: the back reads his lead block`);
  }
});

test('F5: the back is not held back to wait for his blocker', () => {
  const reach = (off) => { const ts = []; for (let s = 0; s < 40; s++) { const sim = play({ off, def: 'cover_3', attr: 'speed', value: 65, seed: 81900 + s }); const f = sim.frames.find((x) => x.holder === 'RB' && pos(x, 'off', 'RB')[1] >= 0); if (f) ts.push(f.t); } return mean(ts); };
  for (const off of ['power_right', 'power_left', 'counter']) assert.ok(reach(off) < 1.45, `${off}: the back reaches the line by ${reach(off).toFixed(2)} s`);
});

// ---- F6: Bulwark
test('F6: Bulwark lifts the blockers beside him on runs, once, and only those within 2.2 yards', () => {
  const blk = (off, extra) => play({ off, def: 'cover_3', attr: 'speed', value: 65, seed: 82000, options: { trace: true }, extra }).blockingAtSnap;
  const one = blk('power_right', (o) => { o.C.species = 'metalhorn'; });
  assert.equal(one.LG, 71, 'the pulling guard beside him');
  assert.equal(one.RG, 71, 'the run-blocking guard beside him');
  assert.equal(one.TE, 65, 'the tight end 3.2 yards away');
  assert.equal(one.C, 65, 'not himself');
  const two = blk('power_right', (o) => { o.LG.species = 'metalhorn'; o.RG.species = 'metalhorn'; });
  assert.equal(two.C, 71, 'two Bulwarks beside the centre still give +6 once');
  const pro = blk('inside_zone', (o) => { o.LG.species = 'metalhorn'; });
  assert.equal(pro.RG, 65, 'in a Pro set the other guard is 3.4 yards away: no bonus (the existing 2.2-yard limit)');
});

test('F6: Bulwark helps measurably on runs, but never makes a block certain', () => {
  let sheds0 = 0, sheds1 = 0; const y0 = [], y1 = [];
  for (const off of ['power_right', 'power_left', 'counter']) for (const def of DEFENSE_IDS) for (let s = 0; s < 4; s++) {
    const a = play({ off, def, attr: 'speed', value: 65, seed: 82100 + s }), b = play({ off, def, attr: 'speed', value: 65, seed: 82100 + s, extra: (o) => { o.C.species = 'metalhorn'; } });
    sheds0 += a.events.filter((e) => e.kind === 'shed' && ['LG', 'RG'].includes(e.blocker)).length; sheds1 += b.events.filter((e) => e.kind === 'shed' && ['LG', 'RG'].includes(e.blocker)).length; y0.push(a.yards); y1.push(b.yards);
  }
  assert.ok(sheds1 < sheds0, `guards beside him are beaten less often (${sheds0} -> ${sheds1})`);
  assert.ok(sheds1 > 0, 'but they are still beaten sometimes');
  assert.ok(mean(y1) >= mean(y0), `run yards do not fall (${mean(y0).toFixed(2)} -> ${mean(y1).toFixed(2)})`);
});
