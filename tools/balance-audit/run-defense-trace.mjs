#!/usr/bin/env node
// D-4 / D-6 run-defense trace study (owner 2026-11-26; observation only, never imported by the game).
// Single plays on the production engine with the Attribute Lab's plain sides (every attribute at the Lab's base value), so personnel is
// controlled; the defence's chosen attribute (default Awareness) is set for all eleven defenders. With the engine's developer trace
// (options.trace: records decisions, never changes a play) it measures, per play x defence x attribute level over matched seeds:
//   yards (mean, median), success (>= 4 on 1st & 10), negative %, explosive (>= 10) %, touchdown %
//   handoff time; the carrier's crossing point (y where he passes the line) and time
//   recognition: when each front defender (DL, LB) first reads run (`recognised`), mean and the share recognised by the handoff
//   overcommit: front defenders who, at the handoff, stand more than 2.5 yd lateral of the eventual crossing point on the side the
//               back first moved toward (they followed the false flow)
//   gap integrity: unblocked defenders within 2 yd (lateral) of the crossing point when the carrier crosses
//   pull interaction: pulling blockers engaged when the carrier crosses; front defenders engaged (blocked) at the crossing
//   contact: yards gained before the first unblocked defender is within 1 yd of the carrier, and after
//   node tools/balance-audit/run-defense-trace.mjs --plays=counter,power_left --defs=bear_front,run_wall,cover_3 [--levels=35,65,95] [--attr=awareness] [--n=60] [--json=FILE] [--patch=FILE.mjs]
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
if (args.patch) await import(path.resolve(String(args.patch)));
const { play } = await import(path.join(root, 'src/lab/attr-trials.js'));
const { PLAYS } = await import(path.join(root, 'src/data/playbook.js'));
const N = Number(args.n) || 60, ATTR = args.attr || 'awareness', LEVELS = String(args.levels || '35,65,95').split(',').map(Number);
const plays = String(args.plays || 'counter').split(','), defs = String(args.defs || 'bear_front').split(',');
const FRONT = /^(DL|DE|DT|NT|LB|OLB|ILB|MLB)/;
const q = (a, p) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const r2 = (x) => (x == null ? null : +x.toFixed(2));
function measureOne(off, def, value, seed) {
  const sim = play({ off, def, defSubjects: [...PLAYS[def].onField], attr: ATTR, value, seed, options: { trace: true } });
  const F = sim.frames.filter((f) => f.t >= 0); const yards = sim.yards || 0;
  const ho = sim.events.find((e) => e.kind === 'handoff'); const tH = ho ? ho.t : null;
  // carrier: holder after the handoff (or the QB on a keep)
  const carrierAt = (f) => (f.holderTeam === 'off' ? f.off.find((p) => p[0] === f.holder) : null);
  const cross = F.find((f) => f.phase === 'carry' && carrierAt(f) && carrierAt(f)[1] >= 0);
  const yC = cross ? carrierAt(cross)[2] : null, tC = cross ? cross.t : null;
  // recognition
  const front = (PLAYS[def].onField || []).filter((s) => FRONT.test(s));
  const recT = {}; for (const f of F) for (const d of f.dbg || []) if (d[5] && recT[d[0]] == null) recT[d[0]] = f.t;
  const recTimes = front.map((s) => recT[s]).filter((x) => x != null);
  const recByHand = tH != null ? front.filter((s) => recT[s] != null && recT[s] <= tH + 1e-6).length / Math.max(1, front.length) : null;
  // overcommit: the back's first lateral move after the snap (the false step), and where front defenders stand at the handoff
  let over = null;
  if (tH != null && yC != null) {
    const back = ho.to || ho.carrier || 'RB'; const b0 = F[0].off.find((p) => p[0] === back), bE = F.find((f) => f.t >= Math.min(0.35, tH)); const b1 = bE?.off.find((p) => p[0] === back);
    const fake = b0 && b1 ? Math.sign(b1[2] - b0[2]) : 0; const fH = F.find((f) => f.t >= tH) || F.at(-1);
    over = front.filter((s) => { const d = fH.def.find((p) => p[0] === s); return d && Math.abs(d[2] - yC) > 2.5 && Math.sign(d[2] - yC) === fake && fake !== 0; }).length;
  }
  // gap integrity and blocks at the crossing
  let gap = null, frontBlocked = null, pullsEngaged = null;
  if (cross) {
    gap = cross.def.filter((d) => !d[3] && Math.abs(d[2] - yC) <= 2 && d[1] >= -1 && d[1] <= 3).length;
    frontBlocked = cross.def.filter((d) => FRONT.test(d[0]) && d[3]).length;
    const pulls = Object.entries(PLAYS[off].assignments || {}).filter(([, a]) => a?.a === 'pull').map(([s]) => s);
    pullsEngaged = pulls.length ? cross.off.filter((p) => pulls.includes(p[0]) && p[3]).length / pulls.length : null;
  }
  // first contact (an unblocked defender within 1 yd of the carrier after the handoff)
  let contactX = null; for (const f of F) { const c = carrierAt(f); if (!c || f.phase !== 'carry') continue; if (f.def.some((d) => !d[3] && Math.hypot(d[1] - c[1], d[2] - c[2]) < 1)) { contactX = c[1]; break; } }
  return { yards, td: !!sim.touchdown, tH, tC, yC, recTimes, recByHand, over, gap, frontBlocked, pullsEngaged, contactX };
}
const out = { tool: 'balance-audit/run-defense-trace', attr: ATTR, levels: LEVELS, n: N, patch: args.patch || null, rows: [] };
for (const off of plays) for (const def of defs) for (const v of LEVELS) {
  const R = []; for (let s = 0; s < N; s++) R.push(measureOne(off, def, v, 15000 + s));
  const ys = R.map((r) => r.yards);
  const row = { off, def, [ATTR]: v, n: N, ypc: r2(mean(ys)), median: q(ys, 0.5), successPct: r2(100 * R.filter((r) => r.yards >= 4 || r.td).length / N), negPct: r2(100 * R.filter((r) => r.yards < 0).length / N),
    zeroOrLessPct: r2(100 * R.filter((r) => r.yards <= 0 && !r.td).length / N), explosivePct: r2(100 * R.filter((r) => r.yards >= 10).length / N), tdPct: r2(100 * R.filter((r) => r.td).length / N),
    handoffT: r2(mean(R.map((r) => r.tH).filter((x) => x != null))), crossT: r2(mean(R.map((r) => r.tC).filter((x) => x != null))), crossYabs: r2(mean(R.map((r) => Math.abs(r.yC ?? 0)))),
    recognitionT: r2(mean(R.flatMap((r) => r.recTimes))), recognisedByHandoffPct: r2(100 * mean(R.map((r) => r.recByHand).filter((x) => x != null))),
    overcommitted: r2(mean(R.map((r) => r.over).filter((x) => x != null))), gapDefenders: r2(mean(R.map((r) => r.gap).filter((x) => x != null))), frontBlockedAtCross: r2(mean(R.map((r) => r.frontBlocked).filter((x) => x != null))),
    pullsEngagedPct: (() => { const a = R.map((r) => r.pullsEngaged).filter((x) => x != null); return a.length ? r2(100 * mean(a)) : null; })(),
    yardsBeforeContact: r2(mean(R.map((r) => r.contactX).filter((x) => x != null))), yardsAfterContact: r2(mean(R.filter((r) => r.contactX != null).map((r) => r.yards - r.contactX))) };
  out.rows.push(row); console.log(JSON.stringify(row));
}
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
