// Pursuit and ball-carrier speed (v42.13, GDD §53.5i): a pursuer's extra effort (1.05 × top speed) still runs down a carrier who is
// no faster than he is, and still applies from the side or in front, but chasing a FASTER carrier from behind it fades with the
// Speed gap, so in a straight race the faster monster pulls away. "Behind" is judged from the carrier's actual movement (graded,
// with eased pace changes). The pass rush is unchanged; the developer trace changes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { play } from '../src/lab/attr-trials.js';
import * as D from '../src/lab/def-scenario.js';
import { chaseWeight, effortFor, PURSUIT_EFFORT } from '../src/sim/engine.js';

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

test('the chase is judged from the carrier\'s movement: behind, side, head-on, lateral, reversed, nearly stationary', () => {
  const fast = 9.3, slow = 8.1; // top speeds: a fast carrier, a slower pursuer
  const eff = (rx, ry, vx, vy, cm = fast, pm = slow) => effortFor(chaseWeight(rx, ry, vx, vy), cm, pm);
  // straight-line pursuit from behind (carrier running upfield at 8 yd/s, pursuer 4 yd behind): the bonus is gone
  assert.equal(chaseWeight(-4, 0, 8, 0), 1); assert.equal(eff(-4, 0, 8, 0), 1.0);
  // side angle (pursuer level with him, 3 yd across) and 100° off his heading: full effort
  assert.equal(chaseWeight(0, 3, 8, 0), 0); assert.equal(eff(0, 3, 8, 0), PURSUIT_EFFORT);
  assert.equal(chaseWeight(-0.5, 3, 8, 0), 0);
  // head-on (pursuer in front): full effort
  assert.equal(chaseWeight(5, 0, 8, 0), 0); assert.equal(eff(5, 0, 8, 0), PURSUIT_EFFORT);
  // lateral run (carrier running across the field, +y): a pursuer behind him in FIELD x but beside his path is not chasing from
  // behind; one trailing him along y is
  assert.equal(chaseWeight(-3, 0, 0, 8), 0, 'behind in field position, beside his actual run');
  assert.equal(chaseWeight(0, -4, 0, 8), 1, 'trailing him across the field');
  // reversal: the same pursuer position reads behind or in front as the carrier turns around
  assert.equal(chaseWeight(-4, 0, 8, 0), 1); assert.equal(chaseWeight(-4, 0, -8, 0), 0);
  // a return the other way (interception, fumble: carrier running toward -x): trailing is +x
  assert.equal(chaseWeight(4, 0, -8, 0), 1); assert.equal(chaseWeight(-4, 0, -8, 0), 0);
  // nearly stationary carrier: no heading, no chase from behind, full effort; graded in between
  assert.equal(chaseWeight(-4, 0, 1.0, 0), 0); assert.equal(chaseWeight(-4, 0, 2.5, 0), 0); assert.equal(chaseWeight(-4, 0, 3.75, 0), 0.5); assert.equal(chaseWeight(-4, 0, 5, 0), 1);
  // the boundary is graded, not a switch: 120° → 0, 135° → about half, 150° → 1
  const at = (deg) => chaseWeight(Math.cos(deg * Math.PI / 180) * 4, Math.sin(deg * Math.PI / 180) * 4, 8, 0);
  assert.ok(at(120) < 0.01 && Math.abs(at(135) - 0.57) < 0.05 && at(150) > 0.99, `${at(120)} ${at(135)} ${at(150)}`);
  for (let a = 110; a < 160; a += 1) assert.ok(Math.abs(at(a + 1) - at(a)) < 0.06, `no jump between ${a}° and ${a + 1}°`);
  // equal-Speed and slower carriers: full effort from anywhere
  assert.equal(eff(-4, 0, 8, 0, 8.1, 8.1), PURSUIT_EFFORT); assert.equal(eff(-4, 0, 8, 0, 7.5, 8.1), PURSUIT_EFFORT);
  // the fade follows the Speed gap: half gone at 0.25 yd/s of top speed, all gone at 0.5
  assert.ok(Math.abs(eff(-4, 0, 8, 0, 8.35, 8.1) - 1.025) < 1e-9 && eff(-4, 0, 8, 0, 8.6, 8.1) === 1.0);
});

test('in play: full effort wherever the chase is not from behind, and never an abrupt change of pace', () => {
  const SC = [['bubble_screen', 'cover_3', null, 'WR3'], ['toss_sweep', 'cover_3', null, 'RB'], ['jet_sweep', 'cover_3', null, 'WR3'], ['three_verticals', 'cover_3', ['WR1', 2.4], 'WR1'], ['qb_draw', 'cover_3', null, 'QB'], ['outside_zone', 'cover_3', null, 'RB']];
  let checked = 0, reduced = 0;
  for (const [off, def, forced, car] of SC) for (let i = 0; i < 30; i++) {
    const sim = play({ off, def, seed: 41000 + i, options: { trace: true, ...(forced ? { qb: { mode: 'human', at: forced[1], action: 'throw', target: forced[0] } } : {}) }, extra: (o, d) => { o[car].attrs.speed = 92; for (const s of Object.keys(d)) d[s].attrs.speed = 65; } });
    const hist = {};
    for (const f of sim.frames) for (const e of f.dbg) {
      const pu = e[7]; if (!pu) continue; const h = (hist[e[0]] ||= []); const prev = h.at(-1);
      if (prev && f.t - prev.t < 0.051) assert.ok(Math.abs(pu.effort - prev.effort) <= 0.0101, `${off}: ${e[0]} effort jumped ${prev.effort} → ${pu.effort}`);
      h.push({ t: f.t, effort: pu.effort, behind: pu.behind });
      // after 0.3 s with no chase from behind at all, he runs at full effort
      if (h.length >= 7 && h.slice(-7).every((x) => x.behind === 0) && f.t - h.at(-7).t < 0.31) { checked++; assert.equal(pu.effort, PURSUIT_EFFORT, `${off} t=${f.t}: ${e[0]} beside or in front at ${pu.effort}`); }
      if (pu.effort < PURSUIT_EFFORT) reduced++;
    }
  }
  assert.ok(checked > 500 && reduced > 200, `checked ${checked} side/front samples, ${reduced} reduced from behind`);
});

test('equal-Speed and slower carriers are chased at full effort in play; the pass rush always is', () => {
  for (const car of [65, 50]) for (let i = 0; i < 20; i++) {
    const sim = play({ off: 'bubble_screen', def: 'cover_3', seed: 42000 + i, options: { trace: true }, extra: (o, d) => { o.WR3.attrs.speed = car; for (const s of Object.keys(d)) d[s].attrs.speed = 65; } });
    for (const f of sim.frames) for (const e of f.dbg) if (e[7]) assert.equal(e[7].effort, PURSUIT_EFFORT, `carrier ${car}: ${e[0]} at ${e[7].effort}`);
  }
  for (let i = 0; i < 20; i++) { const sim = play({ off: 'four_verticals', def: 'db_blitz', seed: 43000 + i, options: { trace: true, qb: { mode: 'hold' }, maxTime: 4 }, extra: (o) => { o.QB.attrs.speed = 95; } });
    for (const f of sim.frames) if (f.holder === 'QB') for (const e of f.dbg) if (e[7] && e[7].car === 'QB' && f.t < (sim.events.find((x) => x.kind === 'scramble')?.t ?? 99)) assert.equal(e[7].effort, PURSUIT_EFFORT, 'a quarterback in his pocket is rushed at full effort'); }
  const src = fs.readFileSync(new URL('../src/sim/engine.js', import.meta.url), 'utf8');
  assert.match(src, /if \(c === qb && phase !== 'carry'\) return PURSUIT_EFFORT;/, 'pocket rush unchanged; a scrambling QB (carry) is a ball carrier like any other');
  assert.match(src, /steer\(a, goalX, a\.laneY, CARRY_PACE, 0\.3\);/, 'the carrying pace is unchanged');
});

test('scrambles and interception returns use the same rule, and abilities still stack on top', () => {
  // a scramble: QB rated 95, rushers 65; pursuers trailing the running QB have reduced effort, those in front do not
  let scr = 0, scrReduced = 0;
  // (the first 12 QB runs: since v42.14 the first three are short runs stopped in front of the line, with nobody trailing him)
  for (let i = 0; i < 80 && scr < 12; i++) {
    const sim = play({ off: 'qb_draw', def: 'cover_3', seed: 44000 + i, options: { trace: true }, extra: (o, d) => { o.QB.attrs.speed = 95; for (const s of Object.keys(d)) d[s].attrs.speed = 65; } });
    if (sim.stats.carrier !== 'QB') continue; scr++;
    for (const f of sim.frames) for (const e of f.dbg) if (e[7]?.car === 'QB' && e[7].effort < PURSUIT_EFFORT) { scrReduced++; assert.ok(e[7].behind > 0 || e[7].effort > 1.0, 'reduced only while chasing from behind (or easing back up)'); }
  }
  assert.ok(scr >= 12 && scrReduced > 0, `QB runs ${scr}, reduced-effort samples ${scrReduced}`);
  // interception returns: the returner's Speed decides the race back the other way
  const ret = (speed) => { let n = 0, y = 0; for (let i = 0; i < 400 && n < 12; i++) { const sim = play({ off: 'quick_slants', def: 'cover_1', seed: 45000 + i, options: { qb: { mode: 'human', at: 0.7, action: 'throw', target: 'WR1' } }, extra: (o, d) => { for (const s of Object.keys(d)) d[s].attrs.speed = speed; for (const s of Object.keys(o)) o[s].attrs.speed = 60; d.CB1.attrs.catching = 99; } }); if (!sim.stats.interceptor) continue; n++; y += Math.abs(sim.endYard - (sim.ballOn + (sim.stats.airYards || 0))); } return { n, avg: y / Math.max(1, n) }; };
  const fastRet = ret(95), slowRet = ret(60);
  assert.ok(fastRet.n >= 5 && slowRet.n >= 5, `interceptions found ${fastRet.n} / ${slowRet.n}`);
  assert.ok(fastRet.avg > slowRet.avg, `a Speed 95 defense returns interceptions farther than a Speed 60 one against Speed 60 chasers: ${fastRet.avg.toFixed(1)} vs ${slowRet.avg.toFixed(1)} yd`);
  // Radiant Pursuit (+15% chasing from behind) still multiplies on top of the effort rule
  const closing = (ability) => { let g = 0, n = 0; for (let i = 0; i < 40; i++) { const sim = play({ off: 'bubble_screen', def: 'cover_3', seed: 46000 + i, options: { trace: true }, extra: (o, d) => { o.WR3.attrs.speed = 92; for (const s of Object.keys(d)) { d[s].attrs.speed = 65; if (ability) d[s].species = 'halofang'; } } }); if (sim.stats.receiver !== 'WR3' && sim.stats.carrier !== 'WR3') continue; g += sim.yards; n++; } return g / n; };
  assert.ok(closing(true) < closing(false), 'Radiant Pursuit pursuers allow fewer yards: the ability still applies');
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
  assert.ok(pu.length > 10 && pu.every((x) => x.effort >= 1 && x.effort <= 1.05 && x.carry === 0.94 && typeof x.angle === 'number' && x.behind >= 0 && x.behind <= 1), 'pursuit entries carry effort, pace, gap and angle');
  const sc = D.PRESETS.find((p) => p.id === 'pursuit_bubble'); assert.ok(sc && D.carrierOf(sc.subject) === 'WR3');
  const lo = D.runScenario(sc, 50, 1001), hi = D.runScenario(sc, 95, 1001);
  assert.ok(lo.frames.length && hi.frames.length && D.subjectsOf(sc.def, sc.subject).length === 0, 'the carrier is the only tested monster');
});
