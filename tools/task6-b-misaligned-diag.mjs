import fs from 'node:fs';
import { loadRuns, unpack } from './task6-analyze.mjs';
const [,, harnessFile, logFile] = process.argv;
const runs = loadRuns([harnessFile]); const log = JSON.parse(fs.readFileSync(logFile, 'utf8'));
const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const cls = { total: 0, mis: 0, succ: 0, stale: 0, other: 0, otherWeakBonusLost: 0 }; const ex = [];
for (const run of runs) {
  const U = unpack(run); const S = U.seasons; const at = (y) => S.find((s) => s.year === y);
  const ai = (s) => s.monsters.filter((m) => m.club !== s.ownerClub);
  for (const d of run.decisions.draft || []) {
    const s = at(d.year); if (!s) continue; cls.total++;
    const lm = {}; for (const p of POS) lm[p] = mean(ai(s).filter((m) => m.pos === p && m.starter).map((m) => m.ovr));
    const gm = (p) => mean(s.monsters.filter((m) => m.club === d.club && m.pos === p && m.starter).map((m) => m.ovr));
    const gap = (p) => (gm(p) ?? 0) - (lm[p] ?? 0);
    const weakElsewhere = POS.some((p) => p !== d.pos && p !== 'K' && gap(p) <= -4);
    if (!(gap(d.pos) >= 0 && weakElsewhere && d.bestAtNeedOvr != null && d.bestAtNeedOvr >= d.ovr - 3)) continue;
    cls.mis++;
    const L = log.find((x) => x.seed === run.seed && x.year === d.year && x.team === d.club && x.pos === d.pos && x.ovr === d.ovr);
    if (!L) { cls.nolog = (cls.nolog || 0) + 1; continue; }
    const n = L.need; const pickN = n[d.pos];
    if (pickN.succ > 0) { cls.succ++; continue; }
    const dtWeak = POS.filter((p) => p !== d.pos && p !== 'K' && n[p] && n[p].gap <= -4 && L.best[p] != null && L.best[p] >= d.ovr - 3);
    if (pickN.gap < 0 || !dtWeak.length) { cls.stale++; continue; }
    cls.other++; if (ex.length < 12) ex.push({ seed: run.seed, y: d.year, club: d.club, pos: d.pos, ovr: d.ovr, pickGap: pickN.gap, pickBonus: pickN.bonus, dup: L.dup, weak: dtWeak.map((p) => `${p} gap ${n[p].gap} bonus ${n[p].bonus} best ${L.best[p]}`) });
  }
}
console.log(JSON.stringify(cls)); for (const e of ex) console.log(JSON.stringify(e));
