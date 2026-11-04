#!/usr/bin/env node
// Task 6 M3 remediation (owner 2026-11-03): why rebuilding clubs stay down (planning tool; reads harness v4 files, changes nothing).
//   node tools/task6-rebuild-diag.mjs --files=a.json,b.json [--json=out.json]
// Mode in force in season y = the mode set at the end of season y−1 (strategy snapshot of y−1).
import fs from 'node:fs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const runs = String(args.files || '').split(',').filter(Boolean).flatMap((f) => JSON.parse(fs.readFileSync(f, 'utf8')).runs).filter((r) => r.v4 && !r.error);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null); const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100); const pct = (a, b) => (b ? r2(100 * a / b) : null);
const out = { seeds: runs.length };
const spells = []; const why = {}; const salesInfo = []; const walks = { rebuild: { starter: 0, starterPastOnsetWithSucc: 0, n: 0 }, other: { starter: 0, n: 0 } };
const weakByMode = {}; const loserMode = {}; const picksInRebuild = [];
const ONSET = { RB: 27, WR: 28, CB: 28, LB: 29, S: 29, DL: 29, TE: 29, OL: 30, QB: 30, K: 32 };
for (const run of runs) {
  const U = run.v4; const cols = U.monsterColumns; const ix = Object.fromEntries(cols.map((c, i) => [c, i])); const S = U.seasons; const gym = (c) => !!U.clubs[c]?.gym;
  const modeIn = (y, c) => S.find((s) => s.year === y - 1)?.strategy?.[c]?.mode || 'compete';
  const rows = run.rows.filter((x) => !x.owner); const byC = {}; for (const x of rows) (byC[x.club] ||= {})[x.year] = x;
  // ---- rebuild spells: length, why the mode stayed, record and team overall through the spell, exit
  for (const club of Object.keys(S[0]?.strategy || {})) { let cur = null;
    for (const s of S) { const st = s.strategy[club]; if (!st) continue;
      if (st.mode === 'rebuild') { if (!cur) cur = { seed: run.seed, club, gym: gym(club), from: s.year, years: [], whys: [], extraPicks: [] }; cur.years.push(s.year); cur.whys.push(st.modeWhy); (why[st.modeWhy] ||= 0); why[st.modeWhy]++; const row = byC[club]?.[s.year + 1]; if (row) picksInRebuild.push((row.picksNext || 0) + (row.picksNext2 || 0)); }
      else if (cur) { cur.exit = st.mode; spells.push(cur); cur = null; } }
    if (cur) { cur.exit = 'end'; spells.push(cur); } }
  // ---- sales: what the seller had behind the starter, and what happened at that position
  for (const sale of U.sales || []) {
    const prev = S.find((s) => s.year === sale.year - 1); if (!prev) continue; // the seller's roster at the end of the season before the window
    const sold = prev.monsters.find((m) => m[ix.id] === sale.toA); const pos = sold?.[ix.pos]; if (!pos) continue;
    const at = prev.monsters.filter((m) => m[ix.club] === sale.B && m[ix.pos] === pos && m[ix.id] !== sale.toA).sort((a, b) => b[ix.ovr] - a[ix.ovr]);
    const backup = at[0]; const gap = backup ? sold[ix.ovr] - backup[ix.ovr] : null;
    const y = sale.week > 0 ? sale.year : sale.year; const endRow = byC[sale.B]?.[y]; const weakAfter = endRow ? endRow.weakGroups.includes(pos) : null; const weakBefore = byC[sale.B]?.[sale.year - 1]?.weakGroups.includes(pos) ?? null;
    salesInfo.push({ inSeason: sale.week > 0, soldOvr: sold[ix.ovr], soldAge: sold[ix.age], backupOvr: backup?.[ix.ovr] ?? null, gap, backupReady: gap != null && gap <= 4, weakBefore, weakAfter, sellerWinsBefore: byC[sale.B]?.[sale.year - 1]?.w ?? null, sellerWinsThis: endRow?.w ?? null }); }
  // ---- contract walks (season-end departures) by the mode in force next season (set at that season end)
  for (const d of run.decisions.departures || []) { if (d.reason !== 'walked' || d.phase !== 'season-end') continue; const m = S.find((s) => s.year === d.year)?.strategy?.[d.club]?.mode || 'compete'; const k = m === 'rebuild' ? 'rebuild' : 'other'; walks[k].n++; if (d.wasStarter) walks[k].starter++; }
  // ---- weak groups by mode in force; new weak groups
  for (const x of rows) { const m = modeIn(x.year, x.club); const w = (weakByMode[m] ||= { clubSeasons: 0, weak: 0, persistent: 0, eligible: 0 }); w.clubSeasons++; w.weak += x.weakGroups.length; const p = byC[x.club]?.[x.year - 1]; if (p) { w.eligible++; if (x.weakGroups.some((g) => g !== 'K' && p.weakGroups.includes(g))) w.persistent++; } }
  // ---- persistent losers (3 straight seasons of ≤ 3 wins): the mode in force during the streak
  for (const club of Object.keys(byC)) { if (gym(club)) continue; const ys = Object.keys(byC[club]).map(Number).sort((a, b) => a - b);
    for (let i = 0; i + 2 < ys.length; i++) if ([0, 1, 2].every((k) => byC[club][ys[i + k]].w <= 3)) for (const k of [0, 1, 2]) { const m = modeIn(ys[i + k], club); loserMode[m] = (loserMode[m] || 0) + 1; } }
}
const L = spells.map((s) => s.years.length);
out.rebuildSpells = { n: spells.length, meanSeasons: r2(mean(L)), share3plus: pct(L.filter((x) => x >= 3).length, L.length), share5plus: pct(L.filter((x) => x >= 5).length, L.length), exits: spells.reduce((o, s) => { o[s.exit] = (o[s.exit] || 0) + 1; return o; }, {}) };
out.whyStillRebuild = why; out.picksHeldNext2InRebuild = r2(mean(picksInRebuild));
const SI = salesInfo; out.sales = { n: SI.length, inSeasonPct: pct(SI.filter((x) => x.inSeason).length, SI.length), soldOvr: r2(mean(SI.map((x) => x.soldOvr))), soldAge: r2(mean(SI.map((x) => x.soldAge))), backupGap: r2(mean(SI.filter((x) => x.gap != null).map((x) => x.gap))),
  backupReadyPct: pct(SI.filter((x) => x.backupReady).length, SI.length), noBackupPct: pct(SI.filter((x) => x.backupOvr == null).length, SI.length), weakBeforePct: pct(SI.filter((x) => x.weakBefore).length, SI.length), weakAfterPct: pct(SI.filter((x) => x.weakAfter).length, SI.length),
  weakAfterWhenReadyPct: pct(SI.filter((x) => x.backupReady && x.weakAfter).length, SI.filter((x) => x.backupReady).length), weakAfterWhenNotReadyPct: pct(SI.filter((x) => !x.backupReady && x.weakAfter).length, SI.filter((x) => !x.backupReady).length) };
out.walks = { rebuildStarterWalksPerRebuildClubSeason: null, rebuild: walks.rebuild, other: walks.other };
out.weakByMode = Object.fromEntries(Object.entries(weakByMode).map(([k, w]) => [k, { clubSeasons: w.clubSeasons, weakGroupsPerClubSeason: r2(w.weak / w.clubSeasons), persistentWeakPct: pct(w.persistent, w.eligible) }]));
out.persistentLoserSeasonsByMode = loserMode;
console.log(JSON.stringify(out, null, 1)); if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
