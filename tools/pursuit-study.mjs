#!/usr/bin/env node
// Pursuit and ball-carrier speed study (v42.13): controlled plays on the real engine, the same seeds for every level, every
// monster a plain 65 with no ability or type unless a section says otherwise. Run once on the old tree and once on the new.
//   node tools/pursuit-study.mjs [--root=DIR] [--n=200] [--games=120] [--only=kin,open,runs,flat,attrs,games] [--json=FILE]
// Sections
//   kin    measured top speed of a carrier in the open and of a pursuer chasing him, by Speed rating (yd/s), and the theoretical
//          values from maxSpeed and the steering multipliers
//   open   a pure open-field chase: a deep go route caught in stride (ball forced to WR1 at 2.4 s vs Cover 1, every other route
//          blocking), carrier Speed against defender Speed: yards after the catch, touchdowns, 20+ plays, the gap to the nearest
//          pursuer one second after the catch and its change per second, the time the first pursuer needs to close to tackling
//          range, and how each tackle came about (from behind, from an angle, head on)
//   runs   outside and inside zone vs Cover 3: yards per carry, 10+/20+/40+ runs, touchdowns, yards after contact, broken tackles
//   flat   a back in the flat (ball forced at 1.2 s vs Cover 3): yards after the catch, 10+/20+
//   attrs  Agility of the carrier and Awareness of the pursuers at 50 / 95 on the open chase and outside zone
//   games  full games (abilities on): carries and catches binned by the carrier's Speed rating against the defense's average
import fs from 'node:fs';
if (process.env.P) globalThis.__P = JSON.parse(process.env.P); // experiment hook (developer only)
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const T = await import(path.join(ROOT, 'src/lab/attr-trials.js'));
const { PLAYS } = await import(path.join(ROOT, 'src/data/playbook.js'));
const N = Number(args.n) || 200, G = Number(args.games) || 120;
const only = args.only ? String(args.only).split(',') : null; const want = (k) => !only || only.includes(k);
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) : null; };
const pct = (xs) => (xs.length ? +(100 * xs.filter(Boolean).length / xs.length).toFixed(1) : null);
const pos = (f, team, slot) => f[team].find((p) => p[0] === slot);
const out = { root: ROOT, n: N };

/** Every defender gets `def` in each listed attribute, the carrier slot gets `car`. */
function rated({ off, def, carrier, carAttrs = {}, defAttrs = {}, seed, options = {} }) {
  return T.play({ off, def, seed, options: { trace: true, ...options }, extra: (o, d) => {
    Object.assign(o[carrier].attrs, carAttrs);
    for (const s of Object.keys(d)) Object.assign(d[s].attrs, defAttrs);
  } });
}
/** Open-field measurements after the carrier gets the ball (catch or crossing the line). */
function afterBall(sim, carrier) {
  const fs0 = sim.frames; const k0 = fs0.findIndex((f) => f.holder === carrier && (pos(f, 'off', carrier)?.[1] ?? -9) > 0.5); if (k0 < 0) return null;
  const at = fs0[k0].t; const startX = pos(fs0[k0], 'off', carrier)[1];
  const gapAt = (k) => { const f = fs0[k]; const c = pos(f, 'off', carrier); if (!c || f.holder !== carrier) return null; return Math.min(...f.def.filter((d) => !d[3]).map((d) => Math.hypot(d[1] - c[1], d[2] - c[2]))); };
  const k1 = fs0.findIndex((f) => f.t >= at + 1.0);
  const g0 = gapAt(k0), g1 = k1 > 0 ? gapAt(k1) : null;
  let closeT = null; for (let k = k0; k < fs0.length; k++) { const g = gapAt(k); if (g == null) break; if (g < 1.25) { closeT = fs0[k].t - at; break; } }
  // carrier top speed in the open (no defender within 4 yd), pursuer top speed while in the pursue branch
  let carTop = 0, purTop = 0;
  for (let k = k0 + 1; k < fs0.length; k++) {
    const f = fs0[k], p = fs0[k - 1]; if (f.holder !== carrier) break; const dt = f.t - p.t; if (dt <= 0) continue;
    const c = pos(f, 'off', carrier), cp = pos(p, 'off', carrier); const g = gapAt(k);
    if (g != null && g > 4) carTop = Math.max(carTop, Math.hypot(c[1] - cp[1], c[2] - cp[2]) / dt);
    for (const e of f.dbg || []) if (e[1] === 'pursue') { const d = pos(f, 'def', e[0]), dp = pos(p, 'def', e[0]); if (d && dp && !d[3]) purTop = Math.max(purTop, Math.hypot(d[1] - dp[1], d[2] - dp[2]) / dt); }
  }
  // how the play ended: the tackler's approach relative to the carrier's heading at contact
  let how = null; const tk = sim.events.find((e) => e.kind === 'tackle');
  if (tk && sim.stats.tackler) { const f = fs0.at(-1), p = fs0.at(-3) || fs0[0]; const c = pos(f, 'off', carrier), cp = pos(p, 'off', carrier), d = pos(f, 'def', sim.stats.tackler);
    if (c && cp && d) { const hx = c[1] - cp[1], hy = c[2] - cp[2], tx = d[1] - c[1], ty = d[2] - c[2]; const cos = (hx * tx + hy * ty) / ((Math.hypot(hx, hy) || 1) * (Math.hypot(tx, ty) || 1)); how = cos < -0.5 ? 'behind' : cos > 0.5 ? 'head-on' : 'angle'; } }
  return { at, gain: (pos(fs0.at(-1), 'off', carrier)?.[1] ?? startX) - startX, gap0: g0, gap1: g1, closeT, carTop, purTop, how };
}

if (want('kin')) {
  const maxSpeed = (s) => 5.4 + 4.1 * Math.min(99, Math.max(1, s)) / 99;
  out.kin = { theoretical: Object.fromEntries([50, 65, 75, 85, 95].map((s) => [s, { maxSpeed: +maxSpeed(s).toFixed(2), carrier: +(maxSpeed(s) * 0.94).toFixed(2), pursuer: +(maxSpeed(s) * 1.05).toFixed(2) }])) };
}

// Open-field scenarios: a slant caught in space, a bubble screen, and a deep go caught in stride with 50 yards to the end zone.
const OPEN = [
  { id: 'slant in space (quick slants vs Cover 3, ball to WR1 at 0.9 s)', off: 'quick_slants', def: 'cover_3', carrier: 'WR1', options: { qb: { mode: 'human', at: 0.9, action: 'throw', target: 'WR1' } } },
  { id: 'bubble screen vs Cover 3 (WR3)', off: 'bubble_screen', def: 'cover_3', carrier: 'WR3', options: {} },
  { id: 'deep go caught in stride (three verticals vs Cover 3, ball to WR1 at 2.4 s)', off: 'three_verticals', def: 'cover_3', carrier: 'WR1', options: { qb: { mode: 'human', at: 2.4, action: 'throw', target: 'WR1' } } },
];
const PAIRS = [[50, 50], [65, 65], [75, 75], [85, 85], [95, 95], [95, 65], [85, 65], [75, 65], [65, 95], [65, 50]];
/** Chases from behind: every frame a pursuer is behind the carrier (more than 120 degrees off his heading) within 8 yards and both
 * are running (over 5 yd/s), how fast the gap closes (positive: the pursuer is gaining). */
function chases(sim, carrier) {
  const out = []; const fs0 = sim.frames;
  for (let k = 2; k < fs0.length; k++) {
    const f = fs0[k], p = fs0[k - 2]; if (f.holder !== carrier || p.holder !== carrier) continue; const dt = f.t - p.t; if (dt <= 0) continue;
    const c = pos(f, 'off', carrier), cp = pos(p, 'off', carrier); if (c[1] < 1) continue; const hx = (c[1] - cp[1]) / dt, hy = (c[2] - cp[2]) / dt; const cs = Math.hypot(hx, hy); if (cs < 5) continue;
    for (const e of f.dbg || []) { if (e[1] !== 'pursue') continue; const d = pos(f, 'def', e[0]), dp = pos(p, 'def', e[0]); if (!d || !dp || d[3]) continue;
      const rx = d[1] - c[1], ry = d[2] - c[2], g = Math.hypot(rx, ry); if (g > 8 || g < 1.3) continue; if ((rx * hx + ry * hy) / (g * cs) > -0.5) continue;
      const ds = Math.hypot(d[1] - dp[1], d[2] - dp[2]) / dt; if (ds < 5) continue; const gp = Math.hypot(dp[1] - cp[1], dp[2] - cp[2]); out.push({ close: (gp - g) / dt, cs, ds }); }
  }
  return out;
}
function openChase(sc, car, def, extraCar = {}, extraDef = {}) {
  const rows = []; const ch = [];
  for (let i = 0; i < N; i++) {
    const sim = rated({ ...sc, carAttrs: { speed: car, ...extraCar }, defAttrs: { speed: def, ...extraDef }, seed: 31000 + i });
    const who = sim.stats.receiver || sim.stats.carrier; if (who !== sc.carrier) continue; const a = afterBall(sim, sc.carrier); if (!a) continue;
    ch.push(...chases(sim, sc.carrier));
    rows.push({ ...a, yac: sim.stats.receiver ? sim.stats.yac : a.gain, td: !!sim.touchdown, x20: sim.yards >= 20, x40: sim.yards >= 40 });
  }
  const hows = rows.map((r) => r.how).filter(Boolean);
  return { touches: rows.length, yardsAfterBall: mean(rows.map((r) => r.yac)), plus20Pct: pct(rows.map((r) => r.x20)), plus40Pct: pct(rows.map((r) => r.x40)), tdPct: pct(rows.map((r) => r.td)),
    gapAtBall: mean(rows.map((r) => r.gap0)), gapAfter1s: mean(rows.map((r) => r.gap1)), closeToTackleS: mean(rows.map((r) => r.closeT)), neverClosedPct: pct(rows.map((r) => r.closeT == null)),
    carrierTopSpeed: mean(rows.map((r) => r.carTop || null)), pursuerTopSpeed: mean(rows.map((r) => r.purTop || null)),
    chaseFromBehind: { samples: ch.length, closingYdPerS: mean(ch.map((x) => x.close)), carrierSpeed: mean(ch.map((x) => x.cs)), pursuerSpeed: mean(ch.map((x) => x.ds)) },
    tackledFromBehindPct: hows.length ? +(100 * hows.filter((h) => h === 'behind').length / hows.length).toFixed(1) : null,
    tackledFromAnglePct: hows.length ? +(100 * hows.filter((h) => h === 'angle').length / hows.length).toFixed(1) : null,
    tackledHeadOnPct: hows.length ? +(100 * hows.filter((h) => h === 'head-on').length / hows.length).toFixed(1) : null };
}
if (want('open')) { out.open = {}; for (const sc of OPEN) { out.open[sc.id] = {}; for (const [c, d] of PAIRS) out.open[sc.id][`${c} vs ${d}`] = openChase(sc, c, d); } }

function runs(off, car, def, extraCar = {}, extraDef = {}) {
  const rows = [];
  for (let i = 0; i < N; i++) {
    const sim = rated({ off, def: 'cover_3', carrier: 'RB', carAttrs: { speed: car, ...extraCar }, defAttrs: { speed: def, ...extraDef }, seed: 32000 + i });
    if (sim.qb || sim.stats.carrier !== 'RB') continue;
    // yards after first contact: from the first frame an unengaged defender is within tackling range (1.25 yd) of the carrier
    let yaco = null; const endX = pos(sim.frames.at(-1), 'off', 'RB')?.[1];
    for (const f of sim.frames) { if (f.holder !== 'RB') continue; const c = pos(f, 'off', 'RB'); if (f.def.some((d) => !d[3] && Math.hypot(d[1] - c[1], d[2] - c[2]) < 1.25)) { yaco = endX - c[1]; break; } }
    rows.push({ y: sim.yards, td: !!sim.touchdown, yaco, broken: sim.events.filter((e) => e.kind === 'broken_tackle').length });
  }
  return { carries: rows.length, ypc: mean(rows.map((r) => r.y)), plus10: pct(rows.map((r) => r.y >= 10)), plus20: pct(rows.map((r) => r.y >= 20)), plus40: pct(rows.map((r) => r.y >= 40)), tdPct: pct(rows.map((r) => r.td)), yardsAfterContact: mean(rows.map((r) => r.yaco)), brokenPerCarry: mean(rows.map((r) => r.broken)) };
}
if (want('runs')) { out.runs = {}; for (const off of ['outside_zone', 'inside_zone']) { out.runs[off] = {}; for (const [c, d] of PAIRS) out.runs[off][`${c} vs ${d}`] = runs(off, c, d); } }

function flat(car, def) {
  const rows = [];
  for (let i = 0; i < N; i++) {
    const sim = rated({ off: 'curl_flat', def: 'cover_3', carrier: 'RB', carAttrs: { speed: car }, defAttrs: { speed: def }, seed: 33000 + i, options: { qb: { mode: 'human', at: 1.2, action: 'throw', target: 'RB' } } });
    if (sim.stats.receiver !== 'RB') continue; rows.push({ yac: sim.stats.yac ?? null, y: sim.yards });
  }
  return { catches: rows.length, yac: mean(rows.map((r) => r.yac)), plus10: pct(rows.map((r) => r.y >= 10)), plus20: pct(rows.map((r) => r.y >= 20)) };
}
if (want('flat')) { out.flat = {}; for (const [c, d] of PAIRS) out.flat[`${c} vs ${d}`] = flat(c, d); }

if (want('attrs')) {
  out.attrs = {};
  for (const v of [50, 95]) {
    out.attrs[`carrier Agility ${v}`] = { slant: openChase(OPEN[0], 75, 75, { agility: v }), deep: openChase(OPEN[2], 75, 75, { agility: v }), outside_zone: runs('outside_zone', 75, 75, { agility: v }) };
    out.attrs[`pursuer Awareness ${v}`] = { slant: openChase(OPEN[0], 75, 75, {}, { awareness: v }), deep: openChase(OPEN[2], 75, 75, {}, { awareness: v }), outside_zone: runs('outside_zone', 75, 75, {}, { awareness: v }) };
  }
}

if (want('games')) {
  const { playGame } = await import(path.join(ROOT, 'src/sim/game-runner.js'));
  const { generatedTeam } = await import(path.join(ROOT, 'src/franchise/roster.js'));
  const bins = {}; const bin = (s) => (s < 60 ? '<60' : s < 70 ? '60-69' : s < 80 ? '70-79' : '80+');
  const tot = { runs: 0, ry: 0, r10: 0, r20: 0, r40: 0, catches: 0, yac: 0, tds: 0, plays: 0, longTd: 0 };
  for (let i = 1; i <= G; i++) {
    const home = generatedTeam(500 + i, { id: 'h', name: 'H' }), away = generatedTeam(700 + i, { id: 'a', name: 'A' });
    const speedOf = (name) => { for (const t of [home, away]) for (const m of Object.values(t.offense)) if (m && m.name === name) return m.attrs?.speed ?? null; return null; };
    playGame({ home, away, seed: 900 + i, onStep: (ev) => {
      const sim = ev?.sim; if (ev?.kind !== 'play' || !sim) return; tot.plays++;
      const slot = sim.stats.receiver || (!sim.qb ? sim.stats.carrier : null); if (!slot) return;
      const s = speedOf(sim.names?.off?.[slot]); if (s == null) return; const b = (bins[bin(s)] ||= { runs: 0, ry: 0, r10: 0, r20: 0, catches: 0, yac: 0, td: 0, long: 0 });
      if (sim.touchdown && sim.yards >= 20) { tot.longTd++; b.long++; } if (sim.touchdown) { b.td++; tot.tds++; }
      if (sim.stats.receiver) { b.catches++; b.yac += sim.stats.yac || 0; tot.catches++; tot.yac += sim.stats.yac || 0; }
      else { b.runs++; b.ry += sim.yards; if (sim.yards >= 10) b.r10++; if (sim.yards >= 20) b.r20++; tot.runs++; tot.ry += sim.yards; if (sim.yards >= 10) tot.r10++; if (sim.yards >= 20) tot.r20++; if (sim.yards >= 40) tot.r40++; }
    } });
  }
  out.games = { games: G, ypc: +(tot.ry / tot.runs).toFixed(2), run10: +(100 * tot.r10 / tot.runs).toFixed(1), run20: +(100 * tot.r20 / tot.runs).toFixed(1), run40: +(100 * tot.r40 / tot.runs).toFixed(2), yacPerCatch: +(tot.yac / tot.catches).toFixed(2), touchdownsPerGame: +(tot.tds / G).toFixed(2), longTdPerGame: +(tot.longTd / G).toFixed(2),
    bySpeed: Object.fromEntries(Object.entries(bins).sort().map(([k, b]) => [k, { runs: b.runs, ypc: b.runs ? +(b.ry / b.runs).toFixed(2) : null, run10: b.runs ? +(100 * b.r10 / b.runs).toFixed(1) : null, run20: b.runs ? +(100 * b.r20 / b.runs).toFixed(1) : null, catches: b.catches, yac: b.catches ? +(b.yac / b.catches).toFixed(2) : null, longTd: b.long }])) };
}
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
