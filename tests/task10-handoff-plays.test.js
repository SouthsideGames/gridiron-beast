// Task 10 (owner 2026-11-13): the four reserve run plays. Pin and Pull is a designed give; Midline Read and Pistol Zone Read are
// genuine reads (a QB keep is a decision, not a broken play; a give must reach the back); End Around stays held back for a design
// decision but its exchange may not fall back early. Measured on the real engine against controlled defensive looks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { play } from '../src/lab/attr-trials.js';
import { PLAYS, OFFENSE_IDS, HELD_BACK_OFFENSE } from '../src/data/playbook.js';

const DEFS = ['cover_1', 'cover_2_zone', 'cover_3', 'cover_4', 'zone_blitz', 'fire_zone', 'all_out', 'qb_spy', 'edge_contain'];
const at = (f, slot) => f.off.find((p) => p[0] === slot);
const frameAt = (sim, t) => sim.frames.filter((x) => x.t <= t + 1e-9).at(-1);

test('the four corrected plays are released; nothing is held back', () => {
  for (const id of ['pin_pull', 'midline_read', 'pistol_zone_read', 'end_around']) assert.ok(OFFENSE_IDS.includes(id), `${id} released`);
  assert.deepEqual([...HELD_BACK_OFFENSE], []);
});

test('Pin and Pull: always the back, from a reachable handoff; no keep; he runs his route at once, never back toward where he lined up', () => {
  let n = 0;
  for (const def of DEFS) for (let s = 1; s <= 8; s++) {
    const sim = play({ off: 'pin_pull', def, attr: 'speed', value: 65, seed: 96000 + s * 13 + def.length }); n++;
    const h = sim.events.find((e) => e.kind === 'handoff');
    assert.ok(h && h.to === 'RB' && h.reach < 1.5, `${def}/${s}: a reachable handoff to the back`);
    assert.ok(!sim.events.some((e) => e.kind === 'keep' || e.kind === 'mesh_missed'), 'the quarterback never keeps it');
    if (['tackle', 'fumble'].includes(sim.result) && sim.events.find((e) => e.kind === 'tackle')?.t < h.t + 0.8) continue;
    const y0 = at(frameAt(sim, h.t), 'RB')[2], y1 = at(frameAt(sim, h.t + 0.6), 'RB')[2];
    assert.ok(y1 < y0 - 1.0, `${def}/${s}: the back heads for the left edge after the handoff (lateral ${y0.toFixed(1)} → ${y1.toFixed(1)})`);
  }
  assert.ok(n >= 70);
});

for (const off of ['midline_read', 'pistol_zone_read']) {
  test(`${off}: keeps and gives both happen, every give reaches the back, and a more aware quarterback reads better`, () => {
    const rate = {};
    for (const aw of [40, 90]) {
      let reads = 0, right = 0, keeps = 0, gives = 0;
      for (const def of DEFS) for (let s = 1; s <= 12; s++) {
        const sim = play({ off, def, offSubjects: ['QB'], attr: 'awareness', value: aw, seed: 97000 + s * 43 + def.length });
        const ev = sim.events;
        assert.ok(!ev.some((e) => e.kind === 'mesh_missed'), `${def}/${s}: a give always reaches the back (no missed mesh)`);
        const r = ev.find((e) => e.kind === 'keep' || e.kind === 'option_read'); if (!r) continue; reads++;
        const gave = ev.some((e) => e.kind === 'handoff'); if (gave) { gives++; assert.equal(sim.stats.carrier, 'RB'); } else { keeps++; assert.equal(sim.stats.carrier, 'QB', 'a keep is the quarterback\'s run'); }
        const a = r.read ? PLAYS[def].assignments[r.read]?.a : null; const attacking = !r.read || ['rush', 'contain', 'spy'].includes(a);
        if (attacking === gave) right++;
      }
      assert.ok(keeps > 10 && gives > 10, `aw ${aw}: both decisions happen (keeps ${keeps}, gives ${gives})`);
      rate[aw] = right / reads;
    }
    assert.ok(rate[90] > rate[40] + 0.05, `Awareness improves the read (40: ${(rate[40] * 100).toFixed(0)}%, 90: ${(rate[90] * 100).toFixed(0)}%)`);
    assert.ok(rate[90] > 0.9, 'a very aware quarterback reads it right nine times in ten');
  });
}

test('End Around (owner 2026-11-14): lines up 18 wide, motions in before the snap, and takes a reachable handoff in time against every look', () => {
  const p = PLAYS.end_around;
  assert.deepEqual(p.align.WR2, [-1.2, 18], 'he still lines up at the original wide split');
  assert.deepEqual(p.motion, { slot: 'WR2', to: [-3.5, 9] }, 'pre-snap motion inward');
  assert.deepEqual(p.assignments.WR2.points[0], p.motion.to, 'his route continues from where the motion ends (no run back out wide)');
  const looks = ['cover_1', 'cover_2_zone', 'cover_3', 'cover_4', 'zone_blitz', 'fire_zone', 'all_out', 'safety_blitz', 'qb_spy', 'edge_contain'];
  let n = 0, hands = 0, sacks = 0, blitzN = 0, blitzHands = 0;
  for (const def of looks) for (let s = 1; s <= 8; s++) {
    const sim = play({ off: 'end_around', def, attr: 'speed', value: 65, seed: 98000 + s * 7 + def.length }); n++;
    assert.ok(!sim.events.some((e) => e.kind === 'mesh_missed' && e.t < 4.4), `${def}/${s}: no early fallback`);
    const h = sim.events.find((e) => e.kind === 'handoff'); if (sim.result === 'sack') sacks++;
    if (/blitz|all_out|fire/.test(def)) { blitzN++; if (h) blitzHands++; }
    if (h) {
      hands++; assert.equal(h.to, 'WR2'); assert.ok(h.reach < 1.5); assert.equal(sim.stats.carrier, 'WR2');
      const fAt = (t) => sim.frames.filter((x) => x.t <= t + 1e-9).at(-1); const w0 = at(fAt(h.t), 'WR2'), w1 = at(fAt(h.t + 0.5), 'WR2');
      if (!(sim.events.find((e) => e.kind === 'tackle')?.t < h.t + 0.5)) assert.ok(w1[2] < w0[2] - 1, `${def}/${s}: he carries on toward the left edge after the handoff`);
    }
  }
  assert.ok(hands / n >= 0.9, `handoff on ${hands}/${n} (was 46% before the motion)`);
  assert.ok(sacks / n <= 0.1, `sacks ${sacks}/${n} (was 37% before the motion)`);
  assert.ok(blitzHands / blitzN >= 0.8, `even against pressure (${blitzHands}/${blitzN}; was 8 of 150)`);
});
