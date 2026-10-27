#!/usr/bin/env node
// Zone coverage study (v42.12): controlled zone scenarios on one engine tree, run once on the old tree and once on the new (same
// seeds, same plain-65 monsters, same calls). For each scenario and each rating level of Awareness or Coverage (50 / 75 / 95 on
// every coverage defender): completion, separation when the ball arrives, interceptions, explosive plays (20+), yards, and, from
// the developer trace, how zone defenders behaved before the throw: discipline (time out of their zone), switching (how often a
// defender changed the receiver he was playing), recognition (time from a receiver entering his zone to the defender playing him),
// overloads (two or more receivers in one zone), and threat selection at the moment of the throw (was the receiver the
// quarterback threw to the one the zone defender responsible for him was playing?).
//   node tools/zone-study.mjs [--root=DIR] [--n=100] [--only=attr|scenario] [--json=FILE]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const HERE = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const ROOT = path.resolve(args.root || HERE);
const T = await import(path.join(ROOT, 'src/lab/attr-trials.js'));
const { PLAYS } = await import(path.join(ROOT, 'src/data/playbook.js'));
const N = Number(args.n) || 100;
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) : null; };
const pct = (xs) => { const v = xs.filter((x) => x != null); return v.length ? +(100 * v.filter(Boolean).length / v.length).toFixed(1) : null; };

// Scenarios: [label, offense, defense, qb]. qb = 'ai' (the real quarterback) or [target, time] (a forced throw on that route).
export const SCENARIOS = [
  ['Flood vs Cover 3 (overload, real QB)', 'flood', 'cover_3', 'ai'],
  ['Flood vs Cover 2 (overload, real QB)', 'flood', 'cover_2_zone', 'ai'],
  ['Smash vs Cover 2 (hitch/corner high-low, real QB)', 'smash', 'cover_2_zone', 'ai'],
  ['Curl/flat vs Cover 3 (real QB)', 'curl_flat', 'cover_3', 'ai'],
  ['Mesh vs Cover 3 (crossers, real QB)', 'mesh', 'cover_3', 'ai'],
  ['Y-cross vs Cover 3 (crossers, real QB)', 'y_cross', 'cover_3', 'ai'],
  ['Dagger vs Cover 4 (deep + under, real QB)', 'dagger', 'cover_4', 'ai'],
  ['Levels vs Tampa 2 (two in one zone at different depths, real QB)', 'levels', 'tampa_2', 'ai'],
  ['Spacing vs Cover 3 (underneath, real QB)', 'spacing', 'cover_3', 'ai'],
  ['Stick vs Cover 6 (quick, real QB)', 'stick', 'cover_6', 'ai'],
  ['Quick slants vs Cover 3 (quick, real QB)', 'quick_slants', 'cover_3', 'ai'],
  ['Deep post vs Cover 3 (post + underneath, real QB)', 'deep_post', 'cover_3', 'ai'],
  ['Four verticals vs Cover 3 (long-developing, real QB)', 'four_verticals', 'cover_3', 'ai'],
  ['PA post vs Cover 3 (play-action, real QB)', 'pa_post', 'cover_3', 'ai'],
  ['Curl vs Cover 3 (ball to WR2 at 1.8 s)', 'curl_flat', 'cover_3', ['WR2', 1.8]],
  ['Flat vs Cover 2 (ball to RB at 1.4 s)', 'curl_flat', 'cover_2_zone', ['RB', 1.4]],
  ['Drag vs Cover 3 (ball to WR2 at 1.6 s)', 'mesh', 'cover_3', ['WR2', 1.6]],
  ['Seam vs Cover 3 (ball to WR3 at 2.2 s)', 'dagger', 'cover_3', ['WR3', 2.2]],
  ['Out vs Cover 3 (flood TE at 1.7 s)', 'flood', 'cover_3', ['TE', 1.7]],
  ['Go vs Cover 3 (ball to WR1 at 2.4 s)', 'three_verticals', 'cover_3', ['WR1', 2.4]],
  ['Go vs Cover 1, man control (ball to WR1 at 2.4 s)', 'three_verticals', 'cover_1', ['WR1', 2.4]],
].filter(([, o, d]) => PLAYS[o] && PLAYS[d]);

const zoneOf = (def, slot) => PLAYS[def].assignments[slot]?.a === 'zone' ? PLAYS[def].assignments[slot] : null;
const radiusOf = (a) => (a.role === 'deep' ? 12 : a.role === 'middle' ? 7.5 : 7);
const inZone = (a, x, y) => (a.role === 'deep' ? Math.abs(y - a.at[1]) < radiusOf(a) && x > 5 : Math.hypot(x - a.at[0], y - a.at[1]) < radiusOf(a));
const chosenSlot = (w) => (w && w[1] === 'zone' && w[2] && w[2] !== 'spot' && !/^spot/.test(w[2]) ? String(w[2]).split(/[\s·(]/)[0] : null);
const RECEIVER = (slot) => !/^(LT|LG|C|RG|RT|QB)$/.test(slot);

function measure(sim, def) {
  const th = sim.events.find((e) => e.kind === 'throw'); const endT = th ? th.t : Math.min(3, sim.elapsed || 3);
  const zoneDefs = PLAYS[def].onField.filter((s) => zoneOf(def, s));
  let frames = 0, outOfZone = 0, switches = 0, overloadFrames = 0, zoneFrames = 0; const recog = []; const last = {}; const enteredAt = {};
  for (const f of sim.frames) {
    if (f.t < 0.3 || f.t > endT || !f.dbg) continue;
    for (const s of zoneDefs) {
      const a = zoneOf(def, s); const d = f.def.find((p) => p[0] === s); const w = f.dbg.find((x) => x[0] === s); if (!d || !w) continue;
      frames++; const r = radiusOf(a); const off = a.role === 'deep' ? Math.abs(d[2] - a.at[1]) - r : Math.hypot(d[1] - a.at[0], d[2] - a.at[1]) - r; if (off > 2) outOfZone++;
      if (w[1] !== 'zone') continue; zoneFrames++;
      const inside = f.off.filter((p) => RECEIVER(p[0]) && inZone(a, p[1], p[2]) && p[1] > -1).map((p) => p[0]); if (inside.length >= 2) overloadFrames++;
      const c = chosenSlot(w);
      if (last[s] !== undefined && c && last[s] && c !== last[s]) switches++;
      if (c) last[s] = c;
      for (const r2 of inside) { const k = `${s}|${r2}`; if (enteredAt[k] == null) enteredAt[k] = f.t; if (c === r2 && enteredAt[k] !== -1) { recog.push(f.t - enteredAt[k]); enteredAt[k] = -1; } }
    }
  }
  // threat selection at the throw: the zone defenders whose zone held the target
  let resp = null, chose = null;
  if (th && sim.stats.target) {
    const f = sim.frames.find((x) => x.t >= th.t - 1e-6) || sim.frames.at(-1); const tp = f.off.find((p) => p[0] === sim.stats.target);
    if (tp && f.dbg) { const owners = zoneDefs.filter((s) => inZone(zoneOf(def, s), tp[1], tp[2])); if (owners.length) { resp = true; chose = owners.some((s) => chosenSlot(f.dbg.find((x) => x[0] === s)) === sim.stats.target); } }
  }
  return { thrown: !!th, complete: th ? !!sim.stats.receiver : null, int: th ? !!sim.stats.interceptor : null, sep: th ? sim.stats.arriveSep ?? null : null, yards: sim.yards, explosive: sim.yards >= 20,
    sack: sim.result === 'sack', outOfZonePct: frames ? outOfZone / frames : null, switchesPerDefender: zoneDefs.length ? switches / zoneDefs.length : null, overloadShare: zoneFrames ? overloadFrames / zoneFrames : null,
    recognition: recog.length ? recog.reduce((a, b) => a + b, 0) / recog.length : null, targetResponsible: resp, targetPrioritised: chose };
}
function runScenario([label, off, def, qb], attr, value) {
  const subjects = PLAYS[def].onField.filter((s) => ['man', 'zone', 'spy'].includes(PLAYS[def].assignments[s]?.a));
  const rows = [];
  for (let i = 0; i < N; i++) {
    const options = { trace: true, ...(qb === 'ai' ? {} : { qb: { mode: 'human', at: qb[1], action: 'throw', target: qb[0] } }) };
    rows.push(measure(T.play({ off, def, defSubjects: attr ? subjects : [], attr, value, seed: 20000 + i, options }), def));
  }
  return { completionPct: pct(rows.map((r) => r.complete)), sepAtArrival: mean(rows.map((r) => r.sep)), intPct: pct(rows.map((r) => r.int)), yards: mean(rows.map((r) => r.yards)), explosivePct: pct(rows.map((r) => r.explosive)), sackPct: pct(rows.map((r) => r.sack)),
    outOfZonePct: rows.length ? +(100 * mean(rows.map((r) => r.outOfZonePct))).toFixed(1) : null, switchesPerDefender: mean(rows.map((r) => r.switchesPerDefender)), overloadPct: rows.length ? +(100 * mean(rows.map((r) => r.overloadShare))).toFixed(1) : null,
    recognitionS: mean(rows.map((r) => r.recognition)), targetPrioritisedPct: pct(rows.filter((r) => r.targetResponsible).map((r) => r.targetPrioritised)), thrown: rows.filter((r) => r.thrown).length };
}
const out = { root: ROOT, n: N, base: {}, awareness: {}, coverage: {} };
for (const sc of SCENARIOS) {
  out.base[sc[0]] = runScenario(sc, null, 65);
  if (args.only === 'scenario') continue;
  out.awareness[sc[0]] = Object.fromEntries([50, 75, 95].map((v) => [v, runScenario(sc, 'awareness', v)]));
  out.coverage[sc[0]] = Object.fromEntries([50, 75, 95].map((v) => [v, runScenario(sc, 'coverage', v)]));
}
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.base, null, 1));
