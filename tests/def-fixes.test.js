// Defensive audit fixes (v42.10): man coverage closes on lateral routes, and defenders read the throw instead of knowing where it
// lands. Real engine, plain-65 monsters, fixed seeds; the developer trace shows the decisions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { play } from '../src/lab/attr-trials.js';

const forced = (target, at, extra = {}) => ({ qb: { mode: 'human', at, action: 'throw', target }, ...extra });
const thrown = (sim) => sim.events.find((e) => e.kind === 'throw');
const meanSep = (off, def, tgt, at, subjects, attr, value, n = 60) => {
  const xs = []; for (let i = 0; i < n; i++) { const s = play({ off, def, defSubjects: subjects, attr, value, seed: 500 + i, options: forced(tgt, at) }); if (thrown(s) && s.stats.arriveSep != null) xs.push(s.stats.arriveSep); }
  return xs.reduce((a, b) => a + b, 0) / xs.length;
};

test('fix 1: the man defender mirrors a drag across the field and closes, and Coverage still matters', () => {
  const lo = meanSep('mesh', 'cover_1', 'WR2', 1.6, ['CB2'], 'coverage', 50), hi = meanSep('mesh', 'cover_1', 'WR2', 1.6, ['CB2'], 'coverage', 95);
  assert.ok(lo < 4.5, `drag separation at Coverage 50 was 5.6 yd before the fix, now ${lo.toFixed(2)}`);
  assert.ok(hi < lo, `Coverage 95 stays closer (${hi.toFixed(2)} vs ${lo.toFixed(2)})`);
  const s = play({ off: 'mesh', def: 'cover_1', seed: 501, options: { qb: { mode: 'hold' }, maxTime: 2.2, trace: true } });
  assert.ok(s.frames.some((f) => f.dbg?.find((x) => x[0] === 'CB2')?.[2] === 'WR2: mirror across'), 'CB2 recognises the drag and mirrors it');
});

test('fix 1: a back to the flat is covered from over the top, never by a defender running into the backfield', () => {
  const lo = meanSep('curl_flat', 'cover_1', 'RB', 1.3, ['LB2'], 'coverage', 50), hi = meanSep('curl_flat', 'cover_1', 'RB', 1.3, ['LB2'], 'coverage', 95);
  assert.ok(lo < 8, `flat separation was 10.4 yd before the fix, now ${lo.toFixed(2)}`); assert.ok(hi <= lo + 0.2, 'Coverage does not make it worse');
  for (let i = 0; i < 20; i++) {
    const s = play({ off: 'curl_flat', def: 'cover_1', seed: 700 + i, options: { qb: { mode: 'hold' }, maxTime: 2.5, trace: true } });
    for (const f of s.frames) { const w = f.dbg?.find((x) => x[0] === 'LB2'); if (w?.[2]?.endsWith('mirror across')) assert.ok(w[3] >= 1.0 - 1e-9, `aims at or past the line (${w[3]})`); }
  }
});

test('fix 1: speed still decides a footrace on a crossing route', () => {
  const slow = meanSep('mesh', 'cover_1', 'WR2', 1.8, ['CB2'], 'speed', 50), fast = meanSep('mesh', 'cover_1', 'WR2', 1.8, ['CB2'], 'speed', 95);
  assert.ok(fast < slow - 0.3, `a fast corner stays with the drag (${fast.toFixed(2)} vs ${slow.toFixed(2)})`);
});

test('fix 2: nobody reacts to the ball at the release; reaction time shortens with Awareness and with Coverage', () => {
  const reaction = (attr, value) => {
    const xs = [];
    for (let i = 0; i < 40; i++) {
      const s = play({ off: 'deep_post', def: 'cover_3', defSubjects: ['CB1', 'CB2', 'FS', 'SS', 'LB1'], attr, value, seed: 900 + i, options: forced('WR1', 2.2, { trace: true }) });
      const th = thrown(s); if (!th) continue;
      const first = s.frames.find((f) => f.t > th.t && f.dbg?.some((x) => x[1] === 'ball'));
      if (first) xs.push(first.t - th.t);
      assert.ok(!s.frames.some((f) => f.t > th.t && f.t < th.t + 0.05 - 1e-9 && f.dbg?.some((x) => x[1] === 'ball')), 'no instant reaction');
    }
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  };
  const a50 = reaction('awareness', 50), a95 = reaction('awareness', 95), c50 = reaction('coverage', 50), c95 = reaction('coverage', 95);
  assert.ok(a50 >= 0.12 && a95 < a50 - 0.02, `Awareness: ${a50.toFixed(2)} → ${a95.toFixed(2)} s`);
  assert.ok(c95 < c50 - 0.02, `Coverage: ${c50.toFixed(2)} → ${c95.toFixed(2)} s`);
});

test('fix 2: early in the flight defenders steer where the throw looks headed, not to its true landing spot', () => {
  let checked = 0, closerToAim = 0;
  for (let i = 0; i < 120 && checked < 25; i++) {
    const s = play({ off: 'deep_post', def: 'cover_3', seed: 1200 + i, options: forced('WR1', 2.2, { trace: true }) });
    const th = thrown(s); const arr = s.events.find((e) => ['catch', 'incomplete', 'interception'].includes(e.kind) && e.t > (th?.t ?? 9)); if (!th || !arr) continue;
    const L = s.frames.find((f) => f.t >= arr.t - 1e-6)?.ball; const flight = arr.t - th.t;
    const early = s.frames.find((f) => f.t >= th.t + Math.min(0.35, 0.3 * flight) && f.dbg?.some((x) => x[1] === 'ball')); if (!early || !L) continue;
    const r0 = s.frames.find((f) => f.t >= th.t)?.off.find((p) => p[0] === 'WR1');
    if (!r0 || Math.hypot(r0[1] - L[0], r0[2] - L[1]) < 6) continue; // only throws that end far from where he was running
    checked++;
    const aims = early.dbg.filter((x) => x[1] === 'ball' && x[3] != null).map((x) => Math.hypot(x[3] - L[0], x[4] - L[1]));
    if (aims.length && Math.min(...aims) > 0.5) closerToAim++;
  }
  assert.ok(checked >= 5, `enough off-target throws (${checked})`);
  assert.ok(closerToAim / checked > 0.8, `early aims are not the exact landing spot (${closerToAim}/${checked})`);
});

test('fixes are deterministic: the same seed plays the same play', () => {
  for (const [off, def, tgt, at] of [['mesh', 'cover_1', 'WR2', 1.6], ['deep_post', 'cover_3', 'WR1', 2.2], ['curl_flat', 'cover_1', 'RB', 1.3]]) {
    const a = play({ off, def, seed: 42, options: forced(tgt, at) }), b = play({ off, def, seed: 42, options: forced(tgt, at) });
    assert.equal(JSON.stringify(a.frames), JSON.stringify(b.frames));
  }
});
