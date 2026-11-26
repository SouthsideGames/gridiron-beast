#!/usr/bin/env node
// Playbook situational study (follow-up brief I-4, observation only). Single plays on the production engine (simulatePlay) between
// generated clubs, in six game situations, against defence families taken from the playbook's own tags, plus "AI call": the
// defence the coach AI's own weighDefense would call in that situation (sampled from its weights over the defending club's
// book). Every play sees the same clubs, defences and seeds. Nothing in the game is changed.
//
//   node tools/balance-audit/playbook-situations.mjs --plays=counter,jet_sweep,... [--baseline=run] [--clubs=16] [--n=3] [--json=FILE]
//
// --baseline=run|pass|both adds the mean of every ordinary run (or pass) play of the book as the reference row, measured the same
// way. Success: gain ≥ 40% of the distance on 1st down, ≥ 60% on 2nd, the whole distance on 3rd (the usual football measure).
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const { simulatePlay } = await import(path.join(root, 'src/sim/engine.js'));
const { PLAYS } = await import(path.join(root, 'src/data/playbook.js'));
const { generatedTeam } = await import(path.join(root, 'src/franchise/roster.js'));
const AI = await import(path.join(root, 'src/sim/coach-ai.js'));
const { createRng } = await import(path.join(root, 'src/core/rng.js')).catch(() => import(path.join(root, 'src/sim/rng.js')));
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const C = Number(args.clubs) || 16, N = Number(args.n) || 3;
const SIT = [
  { id: '1st&10 own 30', down: 1, toGo: 10, ballOn: 30 },
  { id: '2nd&6 midfield', down: 2, toGo: 6, ballOn: 50 },
  { id: '3rd&2', down: 3, toGo: 2, ballOn: 45 },
  { id: '3rd&8', down: 3, toGo: 8, ballOn: 45 },
  { id: 'red zone 1st&10', down: 1, toGo: 10, ballOn: 85 },
  { id: 'goal line 1st&goal 3', down: 1, toGo: 3, ballOn: 97 },
];
const defs = Object.values(PLAYS).filter((p) => p.side === 'defense' && !(p.tags || []).some((t) => ['legendary', 'desperation', 'prevent', 'prevent_light'].includes(t)));
const pick = (f, k = 4) => { const a = defs.filter(f); const st = Math.max(1, Math.floor(a.length / k)); return a.filter((_, i) => i % st === 0).slice(0, k).map((p) => p.id); };
const has = (p, t) => (p.tags || []).includes(t);
const FAM = {
  zone: pick((p) => has(p, 'zone') && !has(p, 'blitz') && !has(p, 'run') && !has(p, 'goalline')),
  man: pick((p) => has(p, 'man') && !has(p, 'blitz') && !has(p, 'run') && !has(p, 'goalline')),
  blitz: pick((p) => has(p, 'blitz') && !has(p, 'goalline')),
  runFront: pick((p) => has(p, 'run') && !has(p, 'goalline')),
  goalline: pick((p) => has(p, 'goalline')),
};
const clubs = Array.from({ length: C }, (_, i) => [generatedTeam(51000 + i, { id: 'o', name: 'O', quality: 50 + (i * 7) % 15 }), generatedTeam(52000 + i, { id: 'd', name: 'D', quality: 50 + (i * 11) % 15 })]);
const stateFor = (s) => ({ possession: 'home', score: { home: 0, away: 0 }, quarter: 1, clock: 150, quarterLength: 180, down: s.down, toGo: s.toGo, ballOn: s.ballOn, timeouts: { home: 3, away: 3 }, ot: false });
function aiCalls(sit, d, ci) {
  const st = stateFor(sit); const avail = (d.defensePlays || []).filter((id) => PLAYS[id]);
  const w = AI.weighDefense(st, d, avail, null, null, null); const rng = createRng(9000 + ci * 37 + sit.ballOn + sit.down * 11);
  return Array.from({ length: 4 }, () => rng.weighted(w));
}
const success = (sit, g) => (sit.down === 1 ? g >= 0.4 * sit.toGo : sit.down === 2 ? g >= 0.6 * sit.toGo : g >= sit.toGo);
function measure(playIds) {
  const res = {};
  for (const sit of SIT) {
    const fams = { ...FAM, aiCall: null }; const row = (res[sit.id] = {});
    for (const [fam, list] of Object.entries(fams)) {
      if (fam === 'goalline' && sit.ballOn < 80 && sit.toGo > 2) continue; // goal-line fronts only where a coach would show one
      const A = { n: 0, y: 0, succ: 0, stuff: 0, expl: 0, td: 0, to: 0 };
      for (const [ci, [o, d]] of clubs.entries()) {
        const dl = fam === 'aiCall' ? aiCalls(sit, d, ci) : list;
        for (const pid of playIds) for (const dp of dl) for (let s = 0; s < N; s++) {
          const sim = simulatePlay({ offensePlay: PLAYS[pid], defensePlay: PLAYS[dp], offense: o.offense, defense: d.defense, ballOn: sit.ballOn, ballLat: 0, seed: 3 + ci * 1013 + s * 37 + dp.length * 7 + sit.ballOn, options: { toGo: sit.toGo, frames: 'last' } });
          const g = sim.yards || 0; A.n++; A.y += g; if (success(sit, g) || sim.touchdown) A.succ++; if (g <= 0 && !sim.touchdown) A.stuff++; if (g >= (PLAYS[pid].type === 'run' ? 10 : 20)) A.expl++; if (sim.touchdown) A.td++; if (sim.turnover) A.to++;
        }
      }
      row[fam] = { n: A.n, yds: +(A.y / A.n).toFixed(2), successPct: +((100 * A.succ) / A.n).toFixed(1), stuffPct: +((100 * A.stuff) / A.n).toFixed(1), explosivePct: +((100 * A.expl) / A.n).toFixed(1), tdPct: +((100 * A.td) / A.n).toFixed(1), turnoverPct: +((100 * A.to) / A.n).toFixed(1) };
    }
  }
  return res;
}
const plays = String(args.plays || '').split(',').filter(Boolean);
const out = { tool: 'balance-audit/playbook-situations', clubs: C, n: N, families: FAM, situations: SIT, plays: {} };
for (const id of plays) { if (!PLAYS[id]) { console.error('no such play', id); continue; } out.plays[id] = measure([id]); console.log(id, JSON.stringify(Object.fromEntries(Object.entries(out.plays[id]).map(([s, r]) => [s, Object.fromEntries(Object.entries(r).map(([f, x]) => [f, x.yds + '/' + x.successPct + '%']))])))); }
for (const b of (args.baseline === 'both' ? ['run', 'pass'] : args.baseline ? [args.baseline] : [])) {
  const ids = Object.values(PLAYS).filter((p) => p.side === 'offense' && p.type === b && !(p.tags || []).some((t) => ['legendary', 'desperation', 'two_minute'].includes(t))).map((p) => p.id);
  const sample = ids.filter((_, i) => i % Math.max(1, Math.floor(ids.length / 16)) === 0).slice(0, 16);
  out.plays[`baseline_${b}`] = measure(sample); out.baselineSample = { ...(out.baselineSample || {}), [b]: sample };
  console.log(`baseline_${b}`, JSON.stringify(Object.fromEntries(Object.entries(out.plays[`baseline_${b}`]).map(([s, r]) => [s, Object.fromEntries(Object.entries(r).map(([f, x]) => [f, x.yds + '/' + x.successPct + '%']))]))));
}
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
