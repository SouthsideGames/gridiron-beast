// Pursuit and ball-carrier speed (v42.13, GDD §53.5i): a pursuer's extra effort (1.05 × top speed) still runs down a carrier who is
// no faster than he is, and still applies from the side or in front, but chasing a FASTER carrier from behind it fades with the
// Speed gap, so in a straight race the faster monster pulls away. The pass rush is unchanged; the developer trace changes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { play } from '../src/lab/attr-trials.js';
import * as D from '../src/lab/def-scenario.js';

const pos = (f, team, slot) => f[team].find((p) => p[0] === slot);
const DEEP = { off: 'three_verticals', def: 'cover_3', carrier: 'WR1', options: { qb: { mode: 'human', at: 2.4, action: 'throw', target: 'WR1' } } };
function rated(car, def, seed, sc = DEEP) {
  return play({ off: sc.off, def: sc.def, seed, options: { trace: true, ...sc.options }, extra: (o, d) => { o[sc.carrier].attrs.speed = car; for (const s of Object.keys(d)) d[s].attrs.speed = def; } });
}
/** Mean closing speed (yd/s, positive = the pursuer gains) of pursuers chasing the carrier from behind within 8 yards, both running. */
function closingFromBehind(car, def, n = 60, sc = DEEP) {
  const xs = [];
  for (let i = 0; i < n; i++) {
    const sim = rated(car, def, 31000 + i, sc); if (sim.stats.receiver !== sc.carrier) continue; const fr = sim.frames;
    for (let k = 2; k < fr.length; k++) {
      const f = fr[k], p = fr[k - 2]; if (f.holder !== sc.carrier || p.holder !== sc.carrier) continue; const dt = f.t - p.t;
      const c = pos(f, 'off', sc.carrier), cp = pos(p, 'off', sc.carrier); const hx = (c[1] - cp[1]) / dt, hy = (c[2] - cp[2]) / dt, cs = Math.hypot(hx, hy); if (cs < 5 || c[1] < 1) continue;
      for (const e of f.dbg) { if (e[1] !== 'pursue') continue; const d = pos(f, 'def', e[0]), dp = pos(p, 'def', e[0]); const rx = d[1] - c[1], ry = d[2] - c[2], g = Math.hypot(rx, ry); if (g > 8 || g < 1.3 || (rx * hx + ry * hy) / (g * cs) > -0.5) continue; if (Math.hypot(d[1] - dp[1], d[2] - dp[2]) / dt < 5) continue; xs.push((Math.hypot(dp[1] - cp[1], dp[2] - cp[2]) - g) / dt); }
    }
  }
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

test('chasing from behind: an equal-Speed pursuer still gains, a faster carrier pulls away, and the more Speed the carrier has the faster he does', () => {
  const eq = closingFromBehind(65, 65), c85 = closingFromBehind(85, 65), c95 = closingFromBehind(95, 65);
  assert.ok(eq > 0.2, `equal Speed: the pursuer still closes (${eq.toFixed(2)} yd/s)`);
  assert.ok(c95 < 0, `Speed 95 carrier vs Speed 65 pursuer: he pulls away (${c95.toFixed(2)} yd/s)`);
  assert.ok(eq > c85 && c85 > c95, `closing falls with the carrier's Speed: ${eq.toFixed(2)} > ${c85.toFixed(2)} > ${c95.toFixed(2)}`);
});

test('the pursuit effort rule: unchanged for the pass rush and for angles, fades only from behind against a faster carrier', () => {
  const src = fs.readFileSync(new URL('../src/sim/engine.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('function pursuitEffort'), src.indexOf('function pursue(d)'));
  assert.match(src, /const PURSUIT_EFFORT = 1\.05, CARRY_PACE = 0\.94, EFFORT_FADE = 0\.5;/);
  assert.match(fn, /if \(c === qb && phase !== 'carry'\) return PURSUIT_EFFORT;/, 'the quarterback in his pocket is chased as before');
  assert.match(fn, /if \(!behind\) return PURSUIT_EFFORT;/, 'from the side or in front: full effort');
  assert.match(fn, /c\.maxSpeed - d\.maxSpeed/, 'the fade depends only on the two top speeds (Speed ratings)');
  assert.match(src, /steer\(a, goalX, a\.laneY, CARRY_PACE, 0\.3\);/, 'the carrier keeps the same carrying pace');
});

test('a 95 carrier escapes a 65 defense more often than a 65 carrier does on the same plays (bubble screen and deep go)', () => {
  const td = (car, sc, n = 60) => { let t = 0, k = 0; for (let i = 0; i < n; i++) { const sim = play({ off: sc.off, def: sc.def, seed: 31000 + i, options: sc.options, extra: (o, d) => { o[sc.carrier].attrs.speed = car; for (const s of Object.keys(d)) d[s].attrs.speed = 65; } }); if ((sim.stats.receiver || sim.stats.carrier) !== sc.carrier) continue; k++; if (sim.yards >= 40) t++; } return t / k; };
  const bubble = { off: 'bubble_screen', def: 'cover_3', carrier: 'WR3', options: {} };
  assert.ok(td(95, bubble) > td(65, bubble) + 0.05, 'bubble screen: 40+ yard plays rise with the carrier\'s Speed');
  assert.ok(td(95, DEEP) > td(65, DEEP) + 0.2, 'deep go: 40+ yard plays rise with the carrier\'s Speed');
});

test('pursuit trace: developer-only, the same play with it on or off, and the Lab can test the ball carrier\'s Speed', () => {
  for (const [off, def] of [['bubble_screen', 'cover_3'], ['outside_zone', 'cover_3'], ['three_verticals', 'cover_1']]) {
    const a = play({ off, def, seed: 9, options: { trace: true } }), b = play({ off, def, seed: 9, options: {} }), c = play({ off, def, seed: 9, options: { trace: true } });
    assert.equal(JSON.stringify(a.frames.map(({ dbg, ...r }) => r)), JSON.stringify(b.frames), `${off}: trace changes nothing`);
    assert.equal(JSON.stringify(a.frames), JSON.stringify(c.frames), `${off}: deterministic`);
    assert.ok(!b.frames.some((f) => f.dbg), 'no trace without the developer option');
  }
  const pu = play({ off: 'bubble_screen', def: 'cover_3', seed: 31003, options: { trace: true } }).frames.flatMap((f) => f.dbg.map((e) => e[7]).filter(Boolean));
  assert.ok(pu.length > 10 && pu.every((x) => x.effort >= 1 && x.effort <= 1.05 && x.carry === 0.94 && typeof x.angle === 'number'), 'pursuit entries carry effort, pace, gap and angle');
  const sc = D.PRESETS.find((p) => p.id === 'pursuit_bubble'); assert.ok(sc && D.carrierOf(sc.subject) === 'WR3');
  const lo = D.runScenario(sc, 50, 1001), hi = D.runScenario(sc, 95, 1001);
  assert.ok(lo.frames.length && hi.frames.length && D.subjectsOf(sc.def, sc.subject).length === 0, 'the carrier is the only tested monster');
});
