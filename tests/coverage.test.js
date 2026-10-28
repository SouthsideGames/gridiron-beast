// Phase B: bracket coverage and deep defensive intelligence (GDD §53.5k). Behavioural regression tests: each one fails when the
// fix it protects is removed. Plays run on the real engine through the Attribute Lab setup (every monster a plain 65, no ability,
// no type), with fixed seeds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/lab/attr-trials.js';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS } from '../src/data/playbook.js';

const posOf = (f, team, slot) => f[team].find((p) => p[0] === slot);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const forced = (target, at, trace = false) => ({ qb: { mode: 'human', at, action: 'throw', target }, ...(trace ? { trace: true } : {}) });
const play = (off, def, seed, options = {}, extra = null) => T.play({ off, def, attr: 'speed', value: 65, seed, options, extra });
const atThrow = (s) => { const th = s.events.find((e) => e.kind === 'throw'); return th ? s.frames.find((x) => x.t >= th.t - 1e-6) : null; };
const cover = (def) => PLAYS[def].onField.filter((sl) => ['man', 'zone', 'spy'].includes(PLAYS[def].assignments[sl]?.a));

test('fix 1: a back blocking beside a quarterback who has finished his drop is not read as a handoff mesh', () => {
  // Shotgun dropbacks: once a coverage defender has read pass, he does not drift back toward the run before the throw (29% of
  // these plays did in v42.14, when the protecting back read as a mesh about two seconds in).
  let plays = 0, reverted = 0;
  for (const off of ['three_verticals', 'smash', 'levels', 'mesh', 'dagger']) for (const def of ['cover_3', 'cover_1', 'cover_2_zone']) for (let i = 0; i < 12; i++) {
    const s = play(off, def, 81000 + i, { trace: true }); const th = s.events.find((e) => e.kind === 'throw'); const end = th ? th.t : Infinity; const read = new Set(); let back = false;
    for (const f of s.frames) { if (f.t < 0 || f.t > end) continue; for (const e of f.dbg || []) { const r = e[8]; if (!r) continue; if (r.state === 'pass') read.add(e[0]); else if (read.has(e[0]) && f.t > 1.0) back = true; } }
    plays++; if (back) reverted++;
  }
  assert.ok(reverted / plays < 0.05, `${reverted} of ${plays} dropbacks had a defender revert from pass`);
  // The mesh is still a mesh where it really happens: on play-action the linebacker still bites (comes forward before the throw).
  const bites = [];
  for (let i = 0; i < 40; i++) { const s = play('pa_post', 'cover_3', 82000 + i, { trace: true }); let peak = -1; for (const f of s.frames) { if (f.t < 0 || f.t > 1.0) continue; const e = (f.dbg || []).find((x) => x[0] === 'LB1'); if (e?.[8]) peak = Math.max(peak, e[8].b); } bites.push(peak > 0.3 ? 1 : 0); }
  assert.ok(mean(bites) > 0.5, `play-action still pulls the linebacker toward the run (${mean(bites)})`);
});

test('fix 2: a deep defender never steps up toward a receiver running at him, and is over the top of the go at the throw', () => {
  let steps = 0, frames = 0; const over = [];
  for (let i = 0; i < 40; i++) {
    const s = play('three_verticals', 'cover_3', 83000 + i, forced('WR1', 2.4)); const end = s.events.find((e) => e.kind === 'throw')?.t ?? 2.4;
    let prev = null;
    for (const f of s.frames) {
      if (f.t < 0.8 || f.t > end) continue; const cb = posOf(f, 'def', 'CB1'), w = posOf(f, 'off', 'WR1');
      if (prev && w[1] < cb[1] - 1 && w[1] - prev.w > 0.25) { frames++; if (cb[1] < prev.cb - 0.05) steps++; } // he ran upfield this frame, below the defender
      prev = { cb: cb[1], w: w[1] };
    }
    const f = atThrow(s); over.push(posOf(f, 'def', 'CB1')[1] - posOf(f, 'off', 'WR1')[1]);
  }
  assert.ok(steps / frames < 0.02, `stepped toward an approaching vertical on ${steps} of ${frames} frames`);
  assert.ok(mean(over) > 0.5, `deep third over the top of the go at the throw (${mean(over).toFixed(2)} yd)`);
  // Not a guarantee: the same go still completes against him sometimes.
  const comps = Array.from({ length: 60 }, (_, i) => play('three_verticals', 'cover_3', 83100 + i, forced('WR1', 2.4)).stats.receiver ? 1 : 0);
  assert.ok(mean(comps) > 0.15, `the go is still completable (${mean(comps)})`);
});

test('fix 2: deep coverage depends on Speed and Coverage, graded, never guaranteed', () => {
  // How close the deep third is to the ball when it comes down on a go (he brakes into the catch point instead of running through it).
  const run = (attr, v) => { const sep = [], comp = []; for (let i = 0; i < 150; i++) { const s = T.play({ off: 'three_verticals', def: 'cover_3', defSubjects: ['CB1'], attr, value: v, seed: 84000 + i, options: forced('WR1', 2.4) }); if (s.stats.arriveSep != null) sep.push(s.stats.arriveSep); comp.push(s.stats.receiver ? 1 : 0); } return { sep: mean(sep), comp: mean(comp) }; };
  const s50 = run('speed', 50), s65 = run('speed', 65), s95 = run('speed', 95);
  assert.ok(s50.sep > s65.sep && s65.sep > s95.sep, `Speed closes on the ball: ${s50.sep.toFixed(2)} > ${s65.sep.toFixed(2)} > ${s95.sep.toFixed(2)} yd`);
  // A fast deep defender who gets to the catch point first stays on it (v42.14: he ran through it, 2.1 yards away when the ball came
  // down, and Speed 50 to 95 was worth only half a yard).
  assert.ok(s95.sep < 1.2, `a fast deep defender is at the ball (${s95.sep.toFixed(2)} yd)`);
  assert.ok(s50.sep - s95.sep > 0.8, `Speed is worth real ground at the catch (${(s50.sep - s95.sep).toFixed(2)} yd)`);
  assert.ok(s95.comp > 0.15, `a fast deep defender can still be beaten (${s95.comp.toFixed(2)})`);
  const c50 = run('coverage', 50), c95 = run('coverage', 95);
  assert.ok(c95.sep < c50.sep, `Coverage too (${c50.sep.toFixed(2)} vs ${c95.sep.toFixed(2)})`);
});

test('fix 3: the Cover 1 free safety keeps the post in front of him and helps over a man-covered receiver', () => {
  const over = [], early = []; let teammate = 0, n = 0;
  for (let i = 0; i < 40; i++) {
    const s = play('deep_post', 'cover_1', 85000 + i, forced('WR1', 2.3, true)); const f = atThrow(s);
    over.push(posOf(f, 'def', 'FS')[1] - posOf(f, 'off', 'WR1')[1]);
    for (const g of s.frames) { if (g.t < 1.5 || g.t > f.t) continue; const e = (g.dbg || []).find((x) => x[0] === 'FS'); if (e?.[1] === 'zone') { n++; if (String(e[2]).includes('teammate has him')) teammate++; } }
    // On a straight go to the outside he does not leave the middle early.
    const s2 = play('three_verticals', 'cover_1', 85000 + i, forced('WR1', 2.4)); const g = s2.frames.find((x) => x.t >= 1.2); early.push(Math.abs(posOf(g, 'def', 'FS')[2]));
  }
  assert.ok(mean(over) > 0, `free safety over the top of the post at the throw (${mean(over).toFixed(2)} yd; v42.14: -3.9)`);
  assert.equal(teammate, 0, 'a man defender on the receiver never makes the deep help look elsewhere');
  assert.ok(mean(early) < 8, `stays in the middle against an outside go at 1.2 s (${mean(early).toFixed(2)})`);
});

test('fix 4: Bracket Left is coordinated: the corner underneath and inside, the safety over the top, apart from each other', () => {
  for (const [off, at] of [['deep_post', 2.3], ['three_verticals', 2.4], ['deep_corner', 2.3]]) {
    const g = [];
    for (let i = 0; i < 40; i++) {
      const s = play(off, 'bracket_left', 86000 + i, forced('WR1', at)); const f = atThrow(s); const w = posOf(f, 'off', 'WR1'), cb = posOf(f, 'def', 'CB1'), ss = posOf(f, 'def', 'SS');
      g.push({ cb: cb[1] - w[1], ss: ss[1] - w[1], cbIn: Math.sign(-w[2]) * (cb[2] - w[2]), gap: Math.hypot(cb[1] - ss[1], cb[2] - ss[2]) });
    }
    assert.ok(mean(g.map((x) => x.ss)) > 0.5, `${off}: safety over the top (${mean(g.map((x) => x.ss)).toFixed(2)})`);
    assert.ok(mean(g.map((x) => x.cb)) < 0, `${off}: corner underneath (${mean(g.map((x) => x.cb)).toFixed(2)})`);
    assert.ok(mean(g.map((x) => x.cbIn)) > -0.5, `${off}: corner inside or level (${mean(g.map((x) => x.cbIn)).toFixed(2)})`);
    assert.ok(mean(g.map((x) => x.gap)) > 2, `${off}: the two keep apart (${mean(g.map((x) => x.gap)).toFixed(2)} yd; v42.14 about 1)`);
  }
  // A receiver who is no vertical threat (a shallow drag) is the corner's alone; the safety plays his zone for everyone else.
  const far = [];
  for (let i = 0; i < 30; i++) { const s = play('slot_fade', 'bracket_left', 86500 + i, forced('WR1', 1.6, true)); const f = atThrow(s); const e = (f.dbg || []).find((x) => x[0] === 'SS'); assert.ok(!String(e?.[2]).includes('bracket over'), 'drag: not bracketed'); far.push(Math.hypot(posOf(f, 'def', 'SS')[1] - posOf(f, 'off', 'WR1')[1], posOf(f, 'def', 'SS')[2] - posOf(f, 'off', 'WR1')[2])); }
  assert.ok(mean(far) > 8, 'the safety is not chasing the drag');
});

test('fix 4: Bracket Left takes away its receiver without making him uncoverable, and pays for it elsewhere', () => {
  const forcedLine = (off, def, tgt, at, base, n = 100) => { const c = [], y = []; for (let i = 0; i < n; i++) { const s = play(off, def, base + i, forced(tgt, at)); c.push(s.stats.receiver ? 1 : 0); y.push(s.yards); } return { comp: mean(c), yds: mean(y) }; };
  // The bracketed receiver, on the routes a bracket is meant for: harder to complete and worth fewer yards than against Cover 1,
  // never impossible. The catch itself is still contested by the nearest defender alone (catch resolution unchanged), so most of
  // the bracket shows in the yards: the second defender is there after the catch. 300 throws a route (at 600 a route, on fresh
  // seeds: completion 42.4 vs 46.7%, yards per attempt 9.6 vs 11.1; v42.14.0 46.9 vs 47.0% and 10.5 vs 10.9).
  const routes = [['deep_post', 2.3], ['three_verticals', 2.4], ['deep_corner', 2.3], ['levels', 1.9], ['curl_flat', 1.8], ['mesh', 2.0]];
  let bC = 0, cC = 0, bY = 0, cY = 0;
  for (const [off, at] of routes) { const b = forcedLine(off, 'bracket_left', 'WR1', at, 87000, 300), c = forcedLine(off, 'cover_1', 'WR1', at, 87000, 300); bC += b.comp; cC += c.comp; bY += b.yds; cY += c.yds; assert.ok(b.comp >= 0.15, `${off}: the bracketed receiver can still be hit (${b.comp.toFixed(2)})`); }
  const k = routes.length;
  assert.ok(bC / k < cC / k, `bracketed receiver completes less often than in Cover 1 (${(bC / k).toFixed(3)} vs ${(cC / k).toFixed(3)})`);
  assert.ok(bY / k < cY / k - 1.0, `and gains clearly less (${(bY / k).toFixed(2)} vs ${(cY / k).toFixed(2)} yards per attempt)`);
  // The quarterback sees it: he looks elsewhere on vertical concepts.
  const share = (def) => { let to = 0, th = 0; for (const off of ['three_verticals', 'deep_corner', 'double_move']) for (let i = 0; i < 60; i++) { const s = play(off, def, 87500 + i); if (s.events.some((e) => e.kind === 'throw')) { th++; if (s.stats.target === 'WR1') to++; } } return to / th; };
  assert.ok(share('bracket_left') < share('cover_1') * 0.7, 'the quarterback throws to the bracketed receiver less');
  // The cost: two defenders on one receiver leave the others more room than Cover 1 does (the right side, the back out of the backfield).
  const elsewhere = (def) => mean([['three_verticals', 'WR2', 2.4], ['smash', 'WR3', 2.0], ['wheel', 'RB', 2.3]].map(([off, tgt, at]) => forcedLine(off, def, tgt, at, 87800, 200).yds));
  assert.ok(elsewhere('bracket_left') > elsewhere('cover_1') + 1, `the other receivers gain more against Bracket Left (${elsewhere('bracket_left').toFixed(2)} vs ${elsewhere('cover_1').toFixed(2)})`);
});

test('fix 5: Cover 2 Man corners play underneath and inside; Cover 1 corners keep their technique on top', () => {
  const at = (def) => { const r = []; for (let i = 0; i < 30; i++) { const s = play('three_verticals', def, 88000 + i, forced('WR1', 2.4, true)); const f = s.frames.find((x) => x.t >= 2.0); const e = (f.dbg || []).find((x) => x[0] === 'CB1'); r.push({ d: posOf(f, 'def', 'CB1')[1] - posOf(f, 'off', 'WR1')[1], why: String(e?.[2] || '') }); } return r; };
  const c2m = at('cover_2_man'), c1 = at('cover_1');
  assert.ok(c2m.filter((x) => x.why.includes('under, inside')).length > 20, 'Cover 2 Man: underneath technique');
  assert.equal(c1.filter((x) => x.why.includes('under')).length, 0, 'Cover 1: never the underneath technique');
  assert.ok(mean(c2m.map((x) => x.d)) < mean(c1.map((x) => x.d)), 'Cover 2 Man corner sits under the receiver, Cover 1 corner on top');
});

test('fix 6: Awareness changes man coverage (perception, and how often a double move fools him), graded and never certain', () => {
  const sep = (v) => { const r = []; for (let i = 0; i < 60; i++) { const s = T.play({ off: 'y_cross', def: 'cover_1', defSubjects: ['CB1'], attr: 'awareness', value: v, seed: 89000 + i, options: forced('WR1', 2.2) }); r.push(s.stats.arriveSep); } return mean(r.filter((x) => x != null)); };
  const s50 = sep(50), s95 = sep(95);
  assert.ok(s95 < s50, `aware man defender tighter on the post (${s95.toFixed(2)} vs ${s50.toFixed(2)})`);
  // The double move: how far behind the receiver the corner is when the ball is thrown (an aware corner sees the turn upfield
  // after the fake sooner and loses less ground).
  const dm = (v) => { const lag = [], comp = []; for (let i = 0; i < 120; i++) { const s = T.play({ off: 'double_move', def: 'cover_1', defSubjects: ['CB1'], attr: 'awareness', value: v, seed: 89500 + i, options: forced('WR1', 2.6) }); comp.push(s.stats.receiver ? 1 : 0); const f = atThrow(s); if (f) lag.push(posOf(f, 'def', 'CB1')[1] - posOf(f, 'off', 'WR1')[1]); } return { lag: mean(lag), comp: mean(comp) }; };
  const d50 = dm(50), d95 = dm(95);
  assert.ok(d95.lag > d50.lag + 0.3, `an aware corner loses less to the double move (${d95.lag.toFixed(2)} vs ${d50.lag.toFixed(2)} yd)`);
  assert.ok(d95.comp > 0.2, 'but it still works sometimes');
});

test('fix 7: Heat Haze, Sticky and Canopy Read do what their cards say, and nothing else', () => {
  const withSpecies = (slot, species) => (o, d) => { d[slot].species = species; };
  // Sticky: a defender who never comes within a step of any receiver plays exactly as one without the trait (the deep middle
  // safety on a short concept); a press corner, who does, plays differently.
  let same = 0, n = 0, differ = 0;
  for (let i = 0; i < 30; i++) {
    const a = play('curl_flat', 'cover_1', 90000 + i, forced('WR2', 1.8)), b = play('curl_flat', 'cover_1', 90000 + i, forced('WR2', 1.8), withSpecies('FS', 'tidepaw'));
    const th = atThrow(a); if (!th) continue;
    const near = a.frames.some((f) => f.t <= th.t && f.off.some((o) => Math.hypot(posOf(f, 'def', 'FS')[1] - o[1], posOf(f, 'def', 'FS')[2] - o[2]) <= 1.6));
    if (near) continue; n++; if (JSON.stringify(a.frames.filter((f) => f.t <= th.t).map((f) => f.def)) === JSON.stringify(b.frames.filter((f) => f.t <= th.t).map((f) => f.def))) same++;
    const c = play('quick_slants', 'man_press', 90000 + i, forced('WR1', 1.0)), e = play('quick_slants', 'man_press', 90000 + i, forced('WR1', 1.0), withSpecies('CB1', 'tidepaw'));
    if (JSON.stringify(c.frames.map((f) => f.def)) !== JSON.stringify(e.frames.map((f) => f.def))) differ++;
  }
  assert.ok(n >= 10 && same === n, `Sticky never acts beyond a step (${same}/${n})`);
  assert.ok(differ > 0, 'Sticky acts on a press corner within a step');
  // Canopy Read: outside a deep zone (a man assignment) it changes nothing; in a deep zone it does.
  const ident = (def, slot, seedBase) => { let s = 0; for (let i = 0; i < 20; i++) { const a = play('deep_post', def, seedBase + i), b = play('deep_post', def, seedBase + i, {}, withSpecies(slot, 'leafhorn')); if (JSON.stringify(a.frames.map((f) => f.def)) === JSON.stringify(b.frames.map((f) => f.def))) s++; } return s; };
  assert.equal(ident('cover_1', 'CB1', 90500), 20, 'Canopy Read in man coverage: no effect');
  assert.ok(ident('cover_3', 'FS', 90500) < 20, 'Canopy Read in a deep zone: it acts');
  // Heat Haze: only on a route he can see go deep; a short route never triggers it.
  const fires = (off, at, tgt) => Array.from({ length: 20 }, (_, i) => play(off, 'cover_1', 91000 + i, forced(tgt, at), withSpecies('CB1', 'pyrelynx')).events.some((e) => e.kind === 'ability' && e.key === 'heatHaze')).filter(Boolean).length;
  assert.ok(fires('three_verticals', 2.4, 'WR1') > 10, 'Heat Haze on a go');
  assert.equal(fires('quick_slants', 1.0, 'WR1'), 0, 'never announced on a slant');
  // A slant's two-yard stem looks vertical for an instant: worth almost nothing; on the go the haze is real.
  const yds = (off, at, tgt, withIt) => mean(Array.from({ length: 80 }, (_, i) => play(off, 'cover_1', 91500 + i, forced(tgt, at), withIt ? withSpecies('CB1', 'pyrelynx') : null).yards));
  assert.ok(Math.abs(yds('quick_slants', 1.0, 'WR1', true) - yds('quick_slants', 1.0, 'WR1', false)) < 0.5, 'a slant barely notices it');
  const sepGo = (withIt) => mean(Array.from({ length: 80 }, (_, i) => play('three_verticals', 'cover_1', 91500 + i, forced('WR1', 2.4), withIt ? withSpecies('CB1', 'pyrelynx') : null).stats.arriveSep ?? 0));
  assert.ok(sepGo(true) < sepGo(false) - 0.3, `on a go he is closer to the ball with it (${sepGo(true).toFixed(2)} vs ${sepGo(false).toFixed(2)})`);
});

test('future route information: changing a receiver\'s route after a point changes no defender before the routes visibly diverge', () => {
  // Two copies of a play, identical until the receiver's last leg: one runs the drawn route, the other bends the other way. With
  // the same seed and a throw at a fixed time after the divergence, every defender must be in exactly the same place until the
  // receiver himself is somewhere different. Any read of the route (its end point, its name, its depth) would show up earlier.
  const variant = (id, slot, fn) => { const p = PLAYS[id]; const a = p.assignments[slot]; return { ...p, assignments: { ...p.assignments, [slot]: { ...a, points: fn(a.points.map((q) => [...q])) } } }; };
  const cases = [
    ['deep_post', 'WR1', (pts) => { const l = pts.at(-1); pts[pts.length - 1] = [l[0], -l[1] - 30]; return pts; }],
    ['three_verticals', 'WR1', (pts) => { const l = pts.at(-1); pts[pts.length - 1] = [l[0] - 12, l[1] + 10]; return pts; }],
    ['curl_flat', 'WR1', (pts) => { const l = pts.at(-1); pts[pts.length - 1] = [l[0] + 14, l[1]]; return pts; }],
  ];
  let checked = 0;
  for (const [id, slot, fn] of cases) for (const def of ['cover_1', 'cover_3', 'bracket_left', 'cover_2_man', 'cover_4', 'tampa_2', 'robber']) for (let i = 0; i < 6; i++) {
    const seed = 92000 + i; const base = T.side(id), dside = T.side(def);
    dside.CB1.species = 'pyrelynx'; // Heat Haze must not read the route either
    const run = (offensePlay) => simulatePlay({ offensePlay, defensePlay: PLAYS[def], offense: JSON.parse(JSON.stringify(base)), defense: JSON.parse(JSON.stringify(dside)), ballOn: 30, ballLat: 0, seed, options: { frameEvery: 1, ...forced(slot, 3.2) } });
    const a = run(PLAYS[id]), b = run(variant(id, slot, fn));
    const k = a.frames.findIndex((f, j) => { const p = posOf(f, 'off', slot), q = posOf(b.frames[j], 'off', slot); return Math.hypot(p[1] - q[1], p[2] - q[2]) > 1e-9; });
    assert.ok(k > 0, `${id}: the routes diverge`);
    for (let j = 0; j <= k; j++) assert.deepEqual(b.frames[j].def, a.frames[j].def, `${id} vs ${def} seed ${seed}: a defender moved differently at t=${a.frames[j].t} before ${slot} visibly changed course (t=${a.frames[k].t})`);
    checked++;
  }
  assert.ok(checked >= 100);
});

// ---- Catch-point braking (owner-approved judged braking, after the three-way review of PR #79) ----
/** One forced deep throw, seen from one defender: did he get within a yard of the landing spot before the ball, did he then run
 * 0.75+ yards past it, how far is he when it comes down, and the outcome. */
function catchPoint(off, def, slot, tgt, at, seed, extra) {
  const s = play(off, def, seed, forced(tgt, at), extra); const th = s.events.find((e) => e.kind === 'throw'); if (!th) return null;
  const arr = s.events.find((e) => ['catch', 'incomplete', 'interception'].includes(e.kind) && e.t > th.t); if (!arr) return null;
  const fA = s.frames.find((x) => x.t >= arr.t - 1e-6) || s.frames.at(-1); const L = { x: fA.ball[0], y: fA.ball[1] };
  let minD = 99, reached = false;
  for (const f of s.frames) { if (f.t < th.t || f.t > arr.t + 1e-6) continue; const d = posOf(f, 'def', slot); const dd = Math.hypot(d[1] - L.x, d[2] - L.y); minD = Math.min(minD, dd); if (dd <= 1) reached = true; }
  const d = posOf(fA, 'def', slot); const dArr = Math.hypot(d[1] - L.x, d[2] - L.y);
  return { reached, overran: reached && dArr > minD + 0.75, dArr, comp: !!s.stats.receiver };
}
const goVsCover3 = (set, n = 200, base = 99000) => Array.from({ length: n }, (_, i) => catchPoint('three_verticals', 'cover_3', 'CB1', 'WR1', 2.4, base + i, (o, d) => set(d.CB1.attrs))).filter(Boolean);
const rate = (rows, k) => rows.filter((r) => r[k]).length / rows.length;

test('braking: a defender who gets to the catch point first mostly stays there, and a faster one is not worse for it', () => {
  const slow = goVsCover3((a) => { a.speed = 50; }), fast = goVsCover3((a) => { a.speed = 95; });
  const overFast = rate(fast.filter((r) => r.reached), 'overran');
  assert.ok(overFast < 0.2, `a fast deep third rarely runs through the spot (${overFast.toFixed(3)}; 0.74 without braking)`);
  assert.ok(rate(fast, 'comp') <= rate(slow, 'comp') + 0.03, `Speed does not hand the receiver catches (95: ${rate(fast, 'comp').toFixed(2)}, 50: ${rate(slow, 'comp').toFixed(2)}; 0.44 vs 0.34 without braking)`);
  assert.ok(mean(fast.map((r) => r.dArr)) < mean(slow.map((r) => r.dArr)) - 0.5, 'and he is closer to the ball when it comes down');
});

test('braking is judged, not perfect: defenders still overshoot and miss, more often with poorer ball skills and more speed', () => {
  const fast = goVsCover3((a) => { a.speed = 95; });
  const reached = fast.filter((r) => r.reached);
  assert.ok(rate(reached, 'overran') > 0, `a fast defender still runs past the spot sometimes (${rate(reached, 'overran').toFixed(3)})`);
  assert.ok(rate(fast, 'comp') > 0.15, 'the go is still completed against him');
  const onSpot = fast.filter((r) => r.dArr < 0.3).length / fast.length;
  assert.ok(onSpot < 0.4, `he is not on the exact spot most of the time (${onSpot.toFixed(2)})`);
  assert.ok(fast.some((r) => !r.reached), 'and he sometimes does not get there at all');
  // Ball skills judge the stop: a 50/50 defender misjudges it more than a 95/95 one (same Speed and acceleration).
  const poor = goVsCover3((a) => { a.speed = 95; a.awareness = 50; a.coverage = 50; }, 300), good = goVsCover3((a) => { a.speed = 95; a.awareness = 95; a.coverage = 95; }, 300);
  const over = (rows) => rate(rows.filter((r) => r.reached), 'overran');
  assert.ok(over(poor) > over(good), `poorer ball skills overshoot more (${over(poor).toFixed(3)} vs ${over(good).toFixed(3)})`);
  // Deterministic: the same seed is the same play.
  const a = play('three_verticals', 'cover_3', 99500, forced('WR1', 2.4)), b = play('three_verticals', 'cover_3', 99500, forced('WR1', 2.4));
  assert.equal(JSON.stringify(a.frames), JSON.stringify(b.frames));
});
