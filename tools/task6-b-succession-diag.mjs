import fs from 'node:fs';
import { loadRuns, unpack } from './task6-analyze.mjs';
const [,, harnessFile, logFile] = process.argv;
const runs = loadRuns([harnessFile]); const log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
// prevalence of succession needs at draft time
const n = log.length; const withSucc = log.filter((x) => x.need[x.pos].succ > 0).length;
const clubsSuccCount = mean(log.map((x) => POS.filter((p) => p !== 'K' && x.need[p].succ >= 2).length));
const clubsWeakCount = mean(log.map((x) => POS.filter((p) => p !== 'K' && x.need[p].gap <= -4).length));
console.log({ picks: n, pickAtSuccNeedPct: (100 * withSucc / n).toFixed(1), meanPositionsWithSucc2: clubsSuccCount.toFixed(2), meanWeakPositions: clubsWeakCount.toFixed(2) });
// for succession-driven picks: does the prospect qualify as the successor of the group's ageing starter? (starter ovr ≈ min starter at pos)
let q = 0, nq = 0; const byRound = {};
for (const run of runs) { const U = unpack(run); const S = U.seasons; const at = (y) => S.find((s) => s.year === y);
  for (const x of log.filter((l) => l.seed === run.seed && l.need[l.pos].succ > 0)) { const s = at(x.year); if (!s) continue;
    const st = s.monsters.filter((m) => m.club === x.team && m.pos === x.pos && m.starter); if (!st.length) continue;
    const ok = st.some((m) => x.pot >= m.ovr || x.ovr >= m.ovr - 8); if (ok) q++; else nq++; (byRound[x.round] ||= [0, 0])[ok ? 0 : 1]++; } }
console.log({ succPicksQualify: q, succPicksDoNot: nq, byRound });
