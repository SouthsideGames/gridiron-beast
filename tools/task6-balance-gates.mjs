#!/usr/bin/env node
// Task 6 Phase 0: the two owner-balance hard gates (docs/TASK6_PHASE0_METHODOLOGY.md §5). Planning tool; reads JSON only.
//
//   Contract (GDD §45.6): on every difficulty, the hands-off owner's win rate with the persistent league within ±5 points of the same
//   seeds with today's generator, and the AI clubs' mean team overall at mid-season within ±2. Input: tools/balance-compare.mjs files
//   <dir>/<label>-contract-<difficulty>-<persistent|legacy>.json (seeds 1–8 × 8 seasons).
//
//   Drift (owner decision 2026-10-30): on every difficulty, the owner's win rate under a candidate build against published v42.17.0,
//   matched seeds 1–12 × 20 seasons (balance-compare persistent, board reset). Seasons 1–8: within ±5 points, a hard gate. Seasons 9–20:
//   reported only. Input: <dir>/<label>-drift-<difficulty>-<seeds>.json for the baseline and the candidate.
//
//   node tools/task6-balance-gates.mjs --contract=DIR:LABEL [--drift-base=DIR:LABEL --drift-cand=DIR:LABEL] [--json=out.json]
import fs from 'node:fs';
import path from 'node:path';
import { pairedDiff } from './task6/stats.mjs';

const DIFFS = ['rookie', 'pro', 'allstar'];
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const parse = (s) => { const i = s.lastIndexOf(':'); return { dir: s.slice(0, i), label: s.slice(i + 1) }; };
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

/** §45.6 for one difficulty from the persistent and legacy balance-compare files. */
export function contractCheck(persistent, legacy, { ownerBand = 5, aiBand = 2 } = {}) {
  const dWin = persistent.summary.winPct - legacy.summary.winPct; const dAi = persistent.summary.aiMid - legacy.summary.aiMid;
  return { ownerWinToday: legacy.summary.winPct, ownerWinRegistry: persistent.summary.winPct, ownerWinDiff: r1(dWin), aiMidToday: legacy.summary.aiMid, aiMidRegistry: persistent.summary.aiMid, aiMidDiff: r1(dAi),
    seasons: [legacy.summary.seasons, persistent.summary.seasons], firings: [legacy.summary.fired, persistent.summary.fired], pass: Math.abs(dWin) <= ownerBand && Math.abs(dAi) <= aiBand };
}
/** Owner win % per seed over a window of seasons, from balance-compare runs. */
export function ownerWinBySeed(runs, lo, hi) {
  const o = {}; for (const r of runs) { const rs = r.rows.filter((x) => x.year >= lo && x.year <= hi); const w = rs.reduce((s, x) => s + x.w, 0), l = rs.reduce((s, x) => s + x.l, 0); if (w + l) o[r.seed] = 100 * w / (w + l); }
  return o;
}
/** Drift for one difficulty: seasons 1–8 gated at ±band (point estimate; an interval past the band is "inconclusive"), 9–20 reported. */
export function driftCheck(baseRuns, candRuns, { band = 5 } = {}) {
  const early = pairedDiff(ownerWinBySeed(baseRuns, 1, 8), ownerWinBySeed(candRuns, 1, 8));
  const late = pairedDiff(ownerWinBySeed(baseRuns, 9, 20), ownerWinBySeed(candRuns, 9, 20));
  const within = early.n ? Math.abs(early.diff) <= band : null; const sure = early.n ? early.lo >= -band && early.hi <= band : null;
  return { s1to8: { ...early, gate: within == null ? 'no data' : !within ? 'fail' : sure ? 'pass' : 'pass (interval reaches past the band: escalate)' }, s9to20: { ...late, gate: 'report only' } };
}
const driftRuns = ({ dir, label }, d) => fs.readdirSync(dir).filter((f) => f.startsWith(`${label}-drift-${d}-`) && f.endsWith('.json')).sort().flatMap((f) => read(path.join(dir, f)).runs);

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || '1']; }));
  const out = { contract: null, drift: null };
  if (args.contract) { const { dir, label } = parse(args.contract); out.contract = {};
    for (const d of DIFFS) { const p = path.join(dir, `${label}-contract-${d}-persistent.json`), l = path.join(dir, `${label}-contract-${d}-legacy.json`); out.contract[d] = fs.existsSync(p) && fs.existsSync(l) ? contractCheck(read(p), read(l)) : { missing: true }; } }
  if (args['drift-base'] && args['drift-cand']) { const B = parse(args['drift-base']), C = parse(args['drift-cand']); out.drift = {};
    for (const d of DIFFS) { const b = driftRuns(B, d), c = driftRuns(C, d); out.drift[d] = b.length && c.length ? { seeds: b.length, baseOwnerWinS1to8: r1(Object.values(ownerWinBySeed(b, 1, 8)).reduce((s, x, _, a) => s + x / a.length, 0)), baseOwnerWinS9to20: r1(Object.values(ownerWinBySeed(b, 9, 20)).reduce((s, x, _, a) => s + x / a.length, 0)), ...driftCheck(b, c) } : { missing: true }; } }
  if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out, null, 1));
}
