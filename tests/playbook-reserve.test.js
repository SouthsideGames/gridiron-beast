// Reserve plays (playbook expansion, 2026-10-20): 150 offensive and 150 defensive plays that are fully
// built and reviewable in the Playbook Audit, but must never reach a coach, an AI club, a game plan or
// the practice field until the owner releases them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS, RESERVE_OFFENSE_IDS, RESERVE_DEFENSE_IDS, LESSONS, validatePlaybook, manKeyTargets, counterPlays, eligibleReceivers, isReserve } from '../src/data/playbook.js';
import { PLAYBOOKS } from '../src/data/staff.js';
import { playbookFor, adaptPlaybook } from '../src/franchise/roster.js';
import { simulatePlay } from '../src/sim/engine.js';
import { REVIEWABLE_PLAYS } from '../src/ui/dev-review.js';

const RESERVE = [...RESERVE_OFFENSE_IDS, ...RESERVE_DEFENSE_IDS];
const ALL = [...OFFENSE_IDS, ...DEFENSE_IDS, ...RESERVE];

test('150 offensive and 150 defensive reserve plays, every one flagged, none in the live lists', () => {
  assert.equal(RESERVE_OFFENSE_IDS.length, 150);
  assert.equal(RESERVE_DEFENSE_IDS.length, 150);
  for (const id of RESERVE) { assert.ok(PLAYS[id]?.reserve, `${id} flagged reserve`); assert.ok(isReserve(id)); }
  for (const id of [...OFFENSE_IDS, ...DEFENSE_IDS]) { assert.equal(PLAYS[id].reserve, undefined, `${id} live plays carry no reserve key (keeps review fingerprints)`); assert.ok(!isReserve(id)); }
  assert.ok(RESERVE_OFFENSE_IDS.every((id) => PLAYS[id].side === 'offense'));
  assert.ok(RESERVE_DEFENSE_IDS.every((id) => PLAYS[id].side === 'defense'));
  assert.equal(new Set(ALL).size, ALL.length, 'ids unique');
});

test('no reserve play reaches coaches, AI game plans or AI scouting swaps', () => {
  for (const [coach, list] of Object.entries(PLAYBOOKS)) for (const id of list) assert.ok(!isReserve(id), `${coach} playbook holds reserve ${id}`);
  const profile = { games: 3, passRate: 0.7, offense: Object.fromEntries(OFFENSE_IDS.slice(0, 8).map((id, i) => [id, 9 - i])), defense: Object.fromEntries(DEFENSE_IDS.slice(0, 8).map((id, i) => [id, 9 - i])) };
  for (let seed = 1; seed <= 300; seed++) {
    const base = playbookFor(seed, { passBias: (seed % 7) / 10 + 0.3, aggression: (seed % 5) / 5 });
    for (const id of [...base.offense, ...base.defense]) assert.ok(!isReserve(id), `playbookFor ${seed} → ${id}`);
    const adapted = adaptPlaybook(seed, base, profile, { swaps: 3 });
    for (const id of [...adapted.offense, ...adapted.defense]) assert.ok(!isReserve(id), `adaptPlaybook ${seed} → ${id}`);
  }
  // Counter hints draw only from the candidates they are given; the game only ever gives live ones.
  assert.ok(counterPlays(OFFENSE_IDS, DEFENSE_IDS).every((c) => !isReserve(c.id)));
});

test('reserve plays validate, have a lesson and description, and nothing repeats', () => {
  assert.deepEqual(validatePlaybook(), []);
  const names = new Set();
  for (const id of ALL) { const n = PLAYS[id].name.toLowerCase(); assert.ok(!names.has(n), `duplicate name ${PLAYS[id].name}`); names.add(n); }
  for (const id of RESERVE) {
    const L = LESSONS[id]; assert.ok(L && L.when && L.watch && L.beats && L.loses, `${id} lesson`);
    assert.ok(PLAYS[id].desc.length > 20, `${id} description`);
  }
  // Same formation and same assignment on every slot = the same play, whatever it is called.
  const code = (a) => a.a + ':' + (a.r || a.key || a.zone || a.gap || JSON.stringify(a.points?.at(-1) ?? ''));
  const sig = (p) => p.formation + '|' + p.onField.map((s) => `${s}=${code(p.assignments[s])}@${p.align[s]}`).join(',');
  const seen = new Map();
  for (const id of ALL) { const s = sig(PLAYS[id]); if (PLAYS[id].reserve || PLAYS[seen.get(s)]?.reserve) assert.ok(!seen.has(s), `${id} repeats ${seen.get(s)}`); seen.set(s, id); }
  // Pass plays: the same formation with the same set of routes is a repeat even with the receivers swapped.
  const routeSet = new Map();
  for (const id of ALL) {
    const p = PLAYS[id]; if (p.side !== 'offense' || p.type !== 'pass') continue;
    const k = p.formation + '|' + p.onField.map((s) => code(p.assignments[s]).replace(/\[.*\]/, '')).sort().join(',');
    if (p.reserve || PLAYS[routeSet.get(k)]?.reserve) assert.ok(!routeSet.has(k), `${id} repeats the routes of ${routeSet.get(k)}`);
    routeSet.set(k, id);
  }
});

test('reserve offense: one primary read, man keys resolve, routes stay on the field', () => {
  for (const id of RESERVE_OFFENSE_IDS) {
    const p = PLAYS[id];
    const keys = manKeyTargets(p); assert.equal(new Set([keys.wideL, keys.wideR, keys.inside]).size, 3, `${id} man keys`);
    if (p.type === 'pass') {
      const routes = eligibleReceivers(p).filter((s) => p.assignments[s].a === 'route');
      assert.ok(routes.includes(p.primary), `${id} primary runs a route`);
      assert.equal(p.progression[0], p.primary, `${id} reads the primary first`);
      assert.ok(p.progression.every((s) => routes.includes(s)), `${id} progression is route runners`);
    }
  }
});

test('every reserve play runs in the engine: a clean walk-through and live snaps with no stalls', () => {
  for (const id of RESERVE_OFFENSE_IDS) {
    const w = simulatePlay({ offensePlay: PLAYS[id], defensePlay: PLAYS.cover_3, seed: 3, options: { dryRun: { noDefense: true } } });
    assert.equal(w.result, 'dry_run', `${id} walk-through`); assert.ok(w.elapsed < 7, `${id} walk-through finishes (${w.elapsed}s)`);
    for (const d of ['cover_3', 'cover_1', 'fire_zone']) { const r = simulatePlay({ offensePlay: PLAYS[id], defensePlay: PLAYS[d], seed: 11 }); assert.notEqual(r.result, 'guard', `${id} vs ${d}`); }
  }
  for (const id of RESERVE_DEFENSE_IDS) {
    const w = simulatePlay({ offensePlay: PLAYS.smash, defensePlay: PLAYS[id], seed: 3, options: { dryRun: {} } });
    assert.equal(w.result, 'dry_run', `${id} drop walk-through`);
    for (const o of ['inside_zone', 'quick_slants', 'three_verticals']) { const r = simulatePlay({ offensePlay: PLAYS[o], defensePlay: PLAYS[id], seed: 11 }); assert.notEqual(r.result, 'guard', `${o} vs ${id}`); }
  }
});

test('walk-throughs are audit-only: no defenders, nobody throws, and they never change a real snap', () => {
  const w = simulatePlay({ offensePlay: PLAYS.smash, defensePlay: PLAYS.cover_3, seed: 5, options: { dryRun: { noDefense: true } } });
  assert.equal(w.frames[0].def.length, 0);
  assert.ok(!w.events.some((e) => e.kind === 'throw'));
  const a = simulatePlay({ offensePlay: PLAYS.smash, defensePlay: PLAYS.cover_3, seed: 5 });
  const b = simulatePlay({ offensePlay: PLAYS.smash, defensePlay: PLAYS.cover_3, seed: 5 });
  assert.deepEqual(a.frames.at(-1), b.frames.at(-1));
  assert.notEqual(a.result, 'dry_run');
});

test('the review queue includes every reserve play so the owner can review them', () => {
  for (const id of RESERVE) assert.ok(REVIEWABLE_PLAYS.includes(id), id);
});

test('pre-snap motion: the man moves before the snap, is running at the snap, and the art shows the zigzag', async () => {
  const { playCardSvg } = await import('../src/ui/play-art.js');
  const withMotion = Object.values(PLAYS).filter((p) => p.motion);
  assert.ok(withMotion.length >= 5, 'the jet, fly, rocket and speed sweeps use motion');
  assert.ok(PLAYS.jet_sweep.motion && !PLAYS.jet_sweep.reserve, 'the live Jet Sweep has motion too (owner: reserve fixes apply to live plays)');
  for (const p of withMotion) {
    const r = simulatePlay({ offensePlay: p, defensePlay: PLAYS.cover_3, seed: 2 });
    const pre = r.frames.filter((f) => f.t < 0); assert.ok(pre.length >= 3, `${p.id} shows the motion before the snap`);
    const at = (f) => f.off.find((a) => a[0] === p.motion.slot);
    assert.deepEqual(at(pre[0]).slice(1, 3), p.align[p.motion.slot], `${p.id} motion starts at the alignment`);
    const snap = r.frames.find((f) => f.t === 0); assert.deepEqual(at(snap).slice(1, 3), p.motion.to, `${p.id} at the motion spot at the snap`);
    assert.ok(playCardSvg(p.id).split('<polyline').length > playCardSvg('inside_zone').split('<polyline').length - 2, `${p.id} art`);
  }
  // Plays without motion have no pre-snap frames.
  assert.ok(simulatePlay({ offensePlay: PLAYS.inside_zone, defensePlay: PLAYS.cover_3, seed: 2 }).frames[0].t === 0);
});

test('every route runner and ball carrier follows his drawn line (walk-through within 1.5 yd), live and reserve', () => {
  const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy; let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
  const off = [];
  for (const id of [...OFFENSE_IDS, ...RESERVE_OFFENSE_IDS]) {
    const play = PLAYS[id]; const r = simulatePlay({ offensePlay: play, defensePlay: PLAYS.cover_3, seed: 1, options: { dryRun: { noDefense: true } } });
    for (const slot of play.onField) {
      const a = play.assignments[slot]; if (!['route', 'carry', 'keep'].includes(a.a) || (a.a !== 'route' && r.stats.carrier !== slot)) continue;
      const pts = a.points, end = pts[pts.length - 1];
      for (const f of r.frames.filter((x) => x.t >= 0)) {
        const o = f.off.find((x) => x[0] === slot), p = [o[1], o[2]];
        const d = Math.min(...pts.slice(1).map((b, i) => segDist(p, pts[i], b)));
        if (d > 1.5) { off.push(`${id} ${slot} ${d.toFixed(1)}yd`); break; }
        if (Math.hypot(p[0] - end[0], p[1] - end[1]) < 1) break;
      }
    }
  }
  assert.deepEqual(off, []);
});

test('screens: the linemen let the rush through, get out in front and block the second level (owner review)', () => {
  const screens = Object.values(PLAYS).filter((p) => p.side === 'offense' && p.onField.some((s) => p.assignments[s].a === 'release'));
  assert.ok(screens.length >= 8, 'live and reserve screens');
  for (const p of screens) {
    let released = 0, rushersBlocked = 0;
    for (const d of ['cover_3', 'fire_zone', 'cover_1']) for (let seed = 1; seed <= 6; seed++) {
      const r = simulatePlay({ offensePlay: p, defensePlay: PLAYS[d], seed });
      released += r.events.filter((e) => e.kind === 'screen_release').length;
      const throwT = r.events.find((e) => e.kind === 'throw')?.t ?? 9;
      // After the throw no releasing lineman is still blocking a pass rusher.
      const rel = p.onField.filter((s) => p.assignments[s].a === 'release');
      rushersBlocked += r.events.filter((e) => e.kind === 'shed' && rel.includes(e.blocker) && e.t > throwT && ['DL1', 'DL2', 'DL3'].includes(e.by)).length;
    }
    assert.ok(released > 0, `${p.id} linemen release`);
    assert.equal(rushersBlocked, 0, `${p.id} released linemen never block a rusher after the throw`);
  }
});

test('stick and snag keep working after the break; hard cuts are planted at the break (owner review)', () => {
  const run = (id) => simulatePlay({ offensePlay: PLAYS[id], defensePlay: PLAYS.cover_3, seed: 1, options: { dryRun: { noDefense: true } } });
  for (const [id, slot] of [['angle_stick', 'TE'], ['bunch_snag', 'TE'], ['snag', 'WR2']]) {
    const p = PLAYS[id], pts = p.assignments[slot].points, end = pts[pts.length - 1];
    const r = run(id); const last = r.frames.at(-1).off.find((x) => x[0] === slot);
    assert.ok(Math.hypot(last[1] - end[0], last[2] - end[1]) > 1, `${id} ${slot} keeps moving past the end of his line`);
  }
  // A speed out is taken square: 1.5 yards down the out leg he is within half a yard of the drawn line.
  const p = PLAYS.twins_speed_out, pts = p.assignments.WR2.points, [bx, by] = pts[1], [cx, cy] = pts[2];
  const L = Math.hypot(cx - bx, cy - by), q = [bx + (cx - bx) / L * 1.5, by + (cy - by) / L * 1.5];
  const tr = run('twins_speed_out').frames.map((f) => f.off.find((x) => x[0] === 'WR2'));
  assert.ok(Math.min(...tr.map((o) => Math.hypot(o[1] - q[0], o[2] - q[1]))) < 0.5, 'the out is cut square');
});
