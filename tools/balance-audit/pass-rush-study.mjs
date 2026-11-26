#!/usr/bin/env node
// Pass-rush study (follow-up brief I-2, observation only). Single dropback passes on the production engine (simulatePlay) between
// generated clubs, against a panel of base and blitz defences, under personnel scenarios that swap one position group for the same
// seed's elite version. Nothing in the game is changed; everything is read from the play's own output (events, stats, qb read log,
// frames).
//
//   node tools/balance-audit/pass-rush-study.mjs [--scenarios=avg,eliteOL,eliteDL,eliteQB,eliteRush,eliteAll] [--quality=58]
//        [--boost=20] [--clubs=16] [--n=4] [--plays=K] [--defs=a,b] [--json=FILE]
//
// Scenarios (offence O vs defence D, both generatedTeam(seed, quality); "elite X" = the same monsters of that group with every attribute +--boost, capped at 99):
//   avg        average v average            eliteOL    elite OL (LG, C, RG) v average DL
//   eliteDL    average OL v elite DL         eliteQB    elite QB v average rush
//   eliteRush  average QB v elite rush (DL + LB)            eliteAll   elite v elite (OL+QB v DL+LB)
// Per snap: result, sack, pressure (stats.pressure, the engine's own B8 definition: a rusher changed a throw or made a sack),
// sensed pressure (qb.sensedAt), time of the throw, sheds (event 'shed' against pass blockers: count and first time), blockers beaten
// (stats.blockers[*].lost > 0), protection time, escapes and sack conversion (sack / (sack + escape)), scrambles, completion,
// separation at the throw (decision.m1), and from frames the nearest defender's distance (engaged or not) to the QB at 1.0 / 1.5 / 2.0 / 2.5 s
// and its minimum before the ball leaves.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
// F-03 (2026-11-26, experiment only): --qbk=K steepens Awareness-based read times through tools/balance-audit/qb-read-hooks.mjs in this
// process; --qbAware=N sets every quarterback's Awareness to N (other attributes untouched) for controlled comparisons.
{ const a = Object.fromEntries(process.argv.slice(2).map((x) => { const [k, v] = x.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
  if (a.qbk && Number(a.qbk) !== 1) { process.env.QB_LOOK_K = a.qbk; if (a.qbPivot) process.env.QB_LOOK_PIVOT = a.qbPivot; const { register } = await import('node:module'); register('./qb-read-hooks.mjs', import.meta.url); } }
const { simulatePlay } = await import(path.join(root, 'src/sim/engine.js'));
const { PLAYS } = await import(path.join(root, 'src/data/playbook.js'));
const { generatedTeam } = await import(path.join(root, 'src/franchise/roster.js'));
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const Q = Number(args.quality) || 58, C = Number(args.clubs) || 16, N = Number(args.n) || 4;
const SCEN = String(args.scenarios || 'avg,eliteOL,eliteDL,eliteQB,eliteRush,eliteAll').split(',');
const DEFS = args.defs ? String(args.defs).split(',') : ['cover_3', 'cover_2_zone', 'cover_4', 'cover_1', 'cover_2_man', 'tampa_2', 'zone_blitz', 'cover_0'];
const allPass = Object.values(PLAYS).filter((p) => p.side === 'offense' && p.type === 'pass' && !(p.tags || []).some((t) => ['screen', 'legendary', 'desperation', 'two_minute'].includes(t)));
const K = Number(args.plays) || 24; const step = Math.max(1, Math.floor(allPass.length / K));
const PASSES = args.passes ? String(args.passes).split(',').map((id) => PLAYS[id]) : allPass.filter((_, i) => i % step === 0).slice(0, K);
const OL = ['LG', 'C', 'RG'], QBS = ['QB'], DL = ['DL1', 'DL2', 'DL3'], LB = ['LB1', 'LB2'];
// generatedTeam clamps quality (the roster generator's post-history percentiles), so a quality-85 club is not elite. An "elite" group is
// therefore the SAME monsters with every attribute raised by --boost (default 20) points, capped at 99: identical identity, type and
// ability, only better ratings (an average developed DL at about 60 becomes about 80).
const BOOST = Number(args.boost) || 20;
const boosted = (m) => ({ ...m, attrs: Object.fromEntries(Object.entries(m.attrs).map(([k, v]) => [k, Math.min(99, v + BOOST)])) });
const swap = (base, _unused, slots) => { const x = { ...base }; for (const s of slots) if (x[s]) x[s] = boosted(x[s]); return x; };
function lineup(scen, i) {
  const o = generatedTeam(41000 + i, { id: 'o', name: 'O', quality: Q }), d = generatedTeam(42000 + i, { id: 'd', name: 'D', quality: Q });
  const oe = null, de = null;
  let off = o.offense, def = d.defense;
  if (args.qbAware) off = { ...off, QB: { ...off.QB, attrs: { ...off.QB.attrs, awareness: Number(args.qbAware) } } };
  if (scen === 'eliteOL') off = swap(off, oe, OL);
  if (scen === 'eliteDL') def = swap(def, de, DL);
  if (scen === 'eliteQB') off = swap(off, oe, QBS);
  if (scen === 'eliteRush') def = swap(def, de, [...DL, ...LB]);
  if (scen === 'eliteAll') { off = swap(off, oe, [...OL, ...QBS]); def = swap(def, de, [...DL, ...LB]); }
  return { off, def };
}
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const pc = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);
const isBlitz = (def) => (PLAYS[def].tags || []).includes('blitz');
function nearestDef(frame) {
  const qb = frame.off.find((x) => x[0] === 'QB'); if (!qb) return null;
  let best = Infinity; for (const d of frame.def) { const dd = Math.hypot(d[1] - qb[1], d[2] - qb[2]); if (dd < best) best = dd; } return best;
}
function run(scen) {
  const A = { snaps: 0, sacks: 0, pressure: 0, sensed: 0, sensedAt: [], throwT: [], throws: 0, comp: 0, ints: 0, passYds: 0, sheds: 0, firstShed: [], shedSnaps: 0,
    blockers: 0, beaten: 0, protTime: [], escapes: 0, scrambles: 0, sep: [], dist: { 1: [], 1.5: [], 2: [], 2.5: [] }, minDist: [], reasons: {}, sacksBlitz: 0, snapsBlitz: 0, pressBlitz: 0,
    sackTime: [], shedToThrow: [], unblockedSacks: 0, rushersEngagedFree: [] };
  for (let i = 0; i < C; i++) {
    const { off, def } = lineup(scen, i);
    for (const dp of DEFS) for (const op of PASSES) for (let s = 0; s < N; s++) {
      const sim = simulatePlay({ offensePlay: op, defensePlay: PLAYS[dp], offense: off, defense: def, ballOn: 30, ballLat: 0, seed: 7 + i * 7919 + s * 131 + dp.length * 17 + op.id.length * 3, options: {} });
      A.snaps++; const bl = isBlitz(dp); if (bl) A.snapsBlitz++;
      const ev = sim.events || []; const st = sim.stats || {};
      const sack = sim.result === 'sack' || ev.some((e) => e.kind === 'sack'); if (sack) { A.sacks++; if (bl) A.sacksBlitz++; const e = ev.find((x) => x.kind === 'sack'); if (e) A.sackTime.push(e.t); if (st.sackUnblocked) A.unblockedSacks++; }
      if (st.pressure) { A.pressure++; if (bl) A.pressBlitz++; }
      if (sim.qb?.sensedAt != null) { A.sensed++; A.sensedAt.push(sim.qb.sensedAt); }
      const th = ev.find((e) => e.kind === 'throw'); const dec = sim.qb?.decision;
      if (th) { A.throws++; A.throwT.push(th.t); if (dec?.m1 != null) A.sep.push(dec.m1); if (sim.result === 'interception') A.ints++; else if (sim.result !== 'incomplete' && sim.result !== 'throwaway') { A.comp++; A.passYds += sim.yards; if (sim.yards >= 20) A.expl = (A.expl || 0) + 1; if (sim.touchdown) A.td = (A.td || 0) + 1; } }
      if (dec?.reason) A.reasons[dec.reason] = (A.reasons[dec.reason] || 0) + 1;
      const passBlockers = Object.entries(st.blockers || {}).filter(([, b]) => b.pass); const pbSlots = new Set(passBlockers.map(([k]) => k));
      const sheds = ev.filter((e) => e.kind === 'shed' && pbSlots.has(e.blocker) && (!th || e.t <= th.t)); A.sheds += sheds.length; if (sheds.length) { A.shedSnaps++; A.firstShed.push(sheds[0].t); if (th) A.shedToThrow.push(th.t - sheds[0].t); }
      for (const [, b] of passBlockers) { A.blockers++; if (b.lost > 0) A.beaten++; if (b.protectionTime != null) A.protTime.push(b.protectionTime); }
      A.escapes += ev.filter((e) => e.kind === 'escape').length; if (ev.some((e) => e.kind === 'scramble')) A.scrambles++;
      const end = th ? th.t : (ev.find((e) => e.kind === 'sack')?.t ?? sim.elapsed);
      let mn = Infinity; for (const f of sim.frames || []) { if (f.t > end) break; const dd = nearestDef(f); if (dd != null) { mn = Math.min(mn, dd); for (const k of [1, 1.5, 2, 2.5]) if (Math.abs(f.t - k) < 0.051) A.dist[k].push(dd); } }
      if (mn < Infinity) A.minDist.push(mn);
    }
  }
  return {
    scenario: scen, snaps: A.snaps, sackPct: pc(A.sacks, A.snaps), pressurePct: pc(A.pressure, A.snaps), sensedPct: pc(A.sensed, A.snaps), timeToSense: r2(mean(A.sensedAt)), timeToThrow: r2(mean(A.throwT)),
    sackTime: r2(mean(A.sackTime)), shedsPerSnap: r2(A.sheds / A.snaps), shedSnapPct: pc(A.shedSnaps, A.snaps), firstShedT: r2(mean(A.firstShed)), shedToThrow: r2(mean(A.shedToThrow)),
    blockerBeatenPct: pc(A.beaten, A.blockers), protectionTime: r2(mean(A.protTime)), sackConversionPct: pc(A.sacks, A.sacks + A.escapes), pressureToSackPct: pc(A.sacks, A.pressure), escapesPerSnap: r2(A.escapes / A.snaps),
    unblockedSackPct: pc(A.unblockedSacks, A.sacks), scramblePct: pc(A.scrambles, A.snaps), compPct: pc(A.comp, A.throws), intPct: pc(A.ints, A.throws), explosivePct: pc(A.expl || 0, A.throws), yardsPerDropback: r2(((A.passYds) - 0) / A.snaps), ypa: r2(A.passYds / Math.max(1, A.throws)), separation: r2(mean(A.sep)),
    nearestDefToQB: Object.fromEntries(Object.entries(A.dist).map(([k, v]) => [k, r2(mean(v))])), minNearestBeforeRelease: r2(mean(A.minDist)), minUnder3Pct: pc(A.minDist.filter((x) => x < 3.2).length, A.minDist.length),
    blitz: { sackPct: pc(A.sacksBlitz, A.snapsBlitz), pressurePct: pc(A.pressBlitz, A.snapsBlitz) }, base: { sackPct: pc(A.sacks - A.sacksBlitz, A.snaps - A.snapsBlitz), pressurePct: pc(A.pressure - A.pressBlitz, A.snaps - A.snapsBlitz) },
    reasons: Object.fromEntries(Object.entries(A.reasons).map(([k, v]) => [k, pc(v, A.throws)])),
  };
}
const out = { tool: 'balance-audit/pass-rush-study', qbk: args.qbk || 1, qbAware: args.qbAware || null, quality: Q, boost: BOOST, clubs: C, n: N, defs: DEFS, passes: PASSES.map((p) => p.id), results: [] };
for (const s of SCEN) { const r = run(s); out.results.push(r); console.log(JSON.stringify(r)); }
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
