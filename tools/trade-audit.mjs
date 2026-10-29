#!/usr/bin/env node
// Independent trade audit (Task 5 follow-up). The benchmark scores deals with the same market-value function that made them; this tool does not.
// It replays seeds on the production lifecycle (like tools/ai-franchise-benchmark.mjs: observation only) and, for every AI–AI deal, rebuilds both clubs'
// rosters as they stood just before it, applies the swap, and measures with plain ratings and the game's own depth chart:
//   starters  — the sum of the 22 + K starting overalls before and after (buildDepthChart), and the acquiring position's starters
//   depth     — monsters at the position against its slots, and the first backup
//   cap       — payroll and room after, against the cap
//   assets    — picks surrendered by round, the monster's age, contract years left and (afterwards) how long he stayed
// No market value, no leverage. The verdicts are rules written down here before the first run:
//   noStarterGain  the buyer's starters improve by < 2 points in total AND the position's starters by < 2, and it already had a backup there (the deal did not help a lineup or cover a missing backup)
//   pickOverpay    a first-round pick (or two picks of round 2 or better) for a starting gain of < 4 points
//   hollowSeller   the seller's starters fall by >= 4 points, or it is left with fewer players at the position than slots
//   capStrain      the DEAL pushes the buyer under 1.5% cap room (it had more before, less after)
//   agingBurden    the player is 31+ with 2+ contract years left, or 33+
//   kickerFirst    a first-round pick for a kicker
//   churn          the player left the club (traded on, released, walked) within one season
//   thinDepth      (watch, not harm) the buyer is left with no backup at the position or the seller with none at a position it traded from
//   Availability: a monster out 3+ weeks does not start (the game's own isUnavailable), exactly as a coach's chart would be built.
//   usage:  node tools/trade-audit.mjs --seeds=1-10 --seasons=10 [--root=DIR] --out=audit.json
//           node tools/trade-audit.mjs --report=a.json,b.json [--label=NAME]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(args.root || path.join(HERE, '..'));
const imp = (p) => import(path.join(ROOT, p));
export const RULES = Object.freeze({ gainMin: 2, overpayGain: 4, hollow: 4, capFloorShare: 0.015, agingAge: 31, agingYears: 2, oldAge: 33, longInjuryWeeks: 3 });
export const HARM = ['noStarterGain', 'pickOverpay', 'hollowSeller', 'capStrain', 'agingBurden', 'kickerFirst', 'churn'];

function flagsOf(d) {
  const x = [];
  if (d.buyer.startGain < RULES.gainMin && d.buyer.posGain < RULES.gainMin && d.buyer.countBefore > d.buyer.slots) x.push('noStarterGain'); // a buyer with no backup at the position who gets one is covering depth, not wasting a deal
  const r1 = d.paid.picksR1 > 0, twoGood = d.paid.picksTop2 >= 2;
  if ((r1 || twoGood) && d.buyer.startGain < RULES.overpayGain) x.push('pickOverpay');
  if (d.seller.startLoss >= RULES.hollow || d.seller.countAfter < d.seller.slots) x.push('hollowSeller');
  if (d.buyer.roomAfter < RULES.capFloorShare * d.cap && d.buyer.roomBefore >= RULES.capFloorShare * d.cap) x.push('capStrain');
  if ((d.got.age >= RULES.agingAge && d.got.yearsLeft >= RULES.agingYears) || d.got.age >= RULES.oldAge) x.push('agingBurden');
  if (d.got.pos === 'K' && d.paid.picksR1 > 0) x.push('kickerFirst');
  if (d.stayed != null && d.stayed < 1) x.push('churn');
  if (d.buyer.backupAfter === 0 || d.seller.backupAfter === 0 && d.seller.countAfter <= d.seller.slots) x.push('thinDepth');
  return x;
}

async function run() {
  const F = await imp('src/franchise/franchise.js'); const { runFranchise } = await imp('tools/franchise-soak.mjs');
  const { leagueInvariants, withBoardReset } = await imp('tools/league-soak.mjs'); const REG = await imp('src/franchise/league-registry.js');
  const { buildDepthChart, GROUP_SLOTS } = await imp('src/franchise/roster.js'); const { monsterOverall } = await imp('src/data/monsters.js'); const { tierById } = await imp('src/data/league.js');
  const [s0, s1] = String(args.seeds || '1-2').split('-').map(Number); const SEEDS = []; for (let s = s0; s <= (s1 || s0); s++) SEEDS.push(s);
  const SEASONS = Number(args.seasons || 2);
  const slotsOf = (pos) => GROUP_SLOTS[pos]?.length || 1;
  // The game's own rule for a deal: out 3+ weeks does not count as a starter; a shorter injury does not change who the club's starters are (the chart builder alone would bench him, so the injury is cleared on a copy).
  const avail = (r) => r.filter((m) => !((m.injury?.weeks || 0) >= RULES.longInjuryWeeks)).map((m) => (m.injury ? { ...m, injury: null } : m));
  const take = (roster) => { roster = avail(roster); const chart = buildDepthChart(roster); const byId = new Map(roster.map((m) => [m.id, m])); const st = Object.values(chart).map((id) => byId.get(id)).filter(Boolean); return { st, sum: st.reduce((s, m) => s + monsterOverall(m), 0), at: (pos) => st.filter((m) => m.position === pos).reduce((s, m) => s + monsterOverall(m), 0) }; };
  const snapRoster = (f, c) => REG.clubRoster(f, c).map((m) => JSON.parse(JSON.stringify(m)));
  const out = { tool: 'trade-audit', rules: RULES, root: ROOT, seeds: SEEDS, seasons: SEASONS, deals: [] };
  for (const seed of SEEDS) {
    let prev = null; const seen = new Set(); const rows = []; const base = withBoardReset(leagueInvariants); let cap = 0; let last = null;
    const check = (f, where) => {
      const p = base(f, where); if (!F.hasLeague(f)) return p; cap = tierById(f.tier).cap; last = f;
      for (const t of f.league.trades || []) {
        const key = `${t.year}|${t.week}|${t.A}|${t.B}|${t.toA}`; if (seen.has(key)) continue; seen.add(key);
        const rA = prev?.[t.A], rB = prev?.[t.B]; if (!rA || !rB) continue;
        const m0 = rB.find((m) => m.id === t.toA); const approx = !m0; const m = m0 || JSON.parse(JSON.stringify(f.league.monsters[t.toA]));
        const ysIds = t.toBAll || (t.toB ? [t.toB] : []); const ys = ysIds.map((id) => rA.find((x) => x.id === id) || JSON.parse(JSON.stringify(f.league.monsters[id]))).filter(Boolean);
        const A1 = [...rA.filter((x) => !ysIds.includes(x.id)), m]; const B1 = [...rB.filter((x) => x.id !== m.id), ...ys];
        const a0 = take(rA), a1 = take(A1), b0 = take(rB), b1 = take(B1); const pos = m.position;
        const pay = (r) => r.reduce((s, x) => s + (REG.isProtected(x) ? 0 : (x.salary || 0)), 0); const allow = f.league.staffAllowance || 0;
        const cnt = (r, ps) => r.filter((x) => x.position === ps).length;
        const picks = t.picks || []; const top2 = picks.filter((q) => q.round <= 2).length;
        const backups = (r, ps, tk) => Math.max(0, cnt(r, ps) - tk.st.filter((x) => x.position === ps).length);
        const years = m.contract?.ends != null ? Math.max(0, m.contract.ends - t.year) : null;
        const yPos = ys[0]?.position;
        rows.push({ seed, year: t.year, week: t.week, inSeason: t.week > 0, kind: t.kind, A: t.A, B: t.B, approx, cap,
          got: { pos, ovr: monsterOverall(m), age: m.age, salary: m.salary, yearsLeft: years, id: m.id },
          paid: { picks: picks.map((q) => `${q.year}R${q.round}`), picksR1: picks.filter((q) => q.round === 1).length, picksTop2: top2, monsters: ys.map((y) => `${y.position}${monsterOverall(y)}`) },
          buyer: { startBefore: a0.sum, startGain: a1.sum - a0.sum, posGain: a1.at(pos) - a0.at(pos), weakestAt: Math.min(...a0.st.filter((x) => x.position === pos).map(monsterOverall), 99), countBefore: cnt(rA, pos), countAfter: cnt(A1, pos), slots: slotsOf(pos), backupAfter: backups(A1, pos, a1), roomBefore: cap - allow - pay(rA), roomAfter: cap - allow - pay(A1), payrollShift: pay(A1) - pay(rA) },
          full: { seller: rB.filter((q) => q.position === pos).map((q) => [monsterOverall(q), q.injury?.weeks || 0, q.age]).sort((u, v) => v[0] - u[0]), sellerGets: ys.map((y) => [y.position, monsterOverall(y), y.injury?.weeks || 0]), sellerPosAfter: B1.filter((q) => q.position === pos).map((q) => [monsterOverall(q), q.injury?.weeks || 0]).sort((u, v) => v[0] - u[0]), gotInjury: m.injury?.weeks || 0 },
          detail: { buyerAt: [a0, a1].map((x) => x.st.filter((q) => q.position === pos).map(monsterOverall).sort((u, v) => v - u)), sellerAt: [b0, b1].map((x) => x.st.filter((q) => q.position === pos).map(monsterOverall).sort((u, v) => v - u)) },
          seller: { startLoss: b0.sum - b1.sum, countAfter: cnt(B1, pos), slots: slotsOf(pos), backupAfter: backups(B1, pos, b1), roomAfter: cap - allow - pay(B1), gotPos: yPos || null },
          teamAfter: { buyer: Math.round((a1.sum / a1.st.length) * 100) / 100, seller: Math.round((b1.sum / b1.st.length) * 100) / 100 } });
      }
      prev = Object.fromEntries(REG.leagueClubs(f).map((c) => [c, snapRoster(f, c)])); return p;
    };
    runFranchise(seed, { seasons: SEASONS, check, onSeason: () => {} });
    for (const r of rows) { const mon = last.league.monsters[r.got.id]; const stint = (mon?.history || []).find((h) => h.club === r.A && h.from >= r.year); r.stayed = stint ? (stint.to == null ? SEASONS - r.year + 1 : stint.to - (r.week === 0 ? r.year + 1 : r.year)) : null; r.flags = flagsOf(r); out.deals.push(r); }
    fs.writeFileSync(args.out || 'audit.json', JSON.stringify(out)); // after every seed: a long run that dies keeps what it has
    console.error(`seed ${seed}: ${rows.length} deals`);
  }
  fs.writeFileSync(args.out || 'audit.json', JSON.stringify(out));
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null); const r1 = (x) => (x == null ? '–' : Math.round(x * 10) / 10);
const pct = (n, d) => (d ? `${Math.round((1000 * n) / d) / 10}% (${n}/${d})` : '–');
function report() {
  const files = String(args.report).split(',').map((p) => JSON.parse(fs.readFileSync(p, 'utf8'))); const deals = files.flatMap((x) => x.deals);
  for (const d of deals) d.flags = flagsOf(d);
  const groups = { 'in-season': deals.filter((d) => d.inSeason), offseason: deals.filter((d) => !d.inSeason), all: deals };
  const lines = [`# Independent trade audit${args.label ? ' — ' + args.label : ''}`, '', `Seeds ${[...new Set(deals.map((d) => d.seed))].length}, deals ${deals.length} (in season ${groups['in-season'].length}, offseason ${groups.offseason.length}). Rules: ${JSON.stringify(RULES)}`, ''];
  const flagNames = ['noStarterGain', 'pickOverpay', 'hollowSeller', 'capStrain', 'agingBurden', 'kickerFirst', 'churn', 'thinDepth'];
  lines.push('| Window | Deals | ' + flagNames.join(' | ') + ' | any harm flag | buyer starters Δ (mean) | position starters Δ | seller starters Δ | buyer room after (mean, cr) | picks paid (R1 / any) | age (mean) |', '|---|---|' + flagNames.map(() => '---').join('|') + '|---|---|---|---|---|---|---|');
  for (const [name, g] of Object.entries(groups)) lines.push(`| ${name} | ${g.length} | ${flagNames.map((fl) => pct(g.filter((d) => d.flags.includes(fl)).length, g.length)).join(' | ')} | ${pct(g.filter((d) => d.flags.some((x) => HARM.includes(x))).length, g.length)} | ${r1(mean(g.map((d) => d.buyer.startGain)))} | ${r1(mean(g.map((d) => d.buyer.posGain)))} | ${r1(mean(g.map((d) => -d.seller.startLoss)))} | ${Math.round(mean(g.map((d) => d.buyer.roomAfter)) || 0).toLocaleString('en-US')} | ${g.filter((d) => d.paid.picksR1).length} / ${g.filter((d) => d.paid.picks.length).length} | ${r1(mean(g.map((d) => d.got.age)))} |`);
  const kick = deals.filter((d) => d.got.pos === 'K');
  lines.push('', `## Kickers (${kick.length} deals)`, '', '| seed | yr | wk | buyer | kicker | age | paid | buyer K starters Δ | buyer room after | flags |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const d of kick.sort((a, b) => (b.paid.picksR1 - a.paid.picksR1) || a.seed - b.seed)) lines.push(`| ${d.seed} | ${d.year} | ${d.week} | ${d.A} | K${d.got.ovr} | ${d.got.age} | ${[...d.paid.picks, ...d.paid.monsters].join(' + ') || '–'} | ${d.buyer.posGain} | ${Math.round(d.buyer.roomAfter).toLocaleString('en-US')} | ${d.flags.join(', ') || '–'} |`);
  const byPos = {}; for (const d of deals) (byPos[d.got.pos] ||= []).push(d);
  lines.push('', '## By position acquired', '', '| pos | deals | R1 spent | mean starter gain | mean position gain | any flag |', '|---|---|---|---|---|---|');
  for (const [p, g] of Object.entries(byPos).sort()) lines.push(`| ${p} | ${g.length} | ${g.filter((d) => d.paid.picksR1).length} | ${r1(mean(g.map((d) => d.buyer.startGain)))} | ${r1(mean(g.map((d) => d.buyer.posGain)))} | ${pct(g.filter((d) => d.flags.some((x) => HARM.includes(x))).length, g.length)} |`);
  const inS = groups['in-season'];
  lines.push('', '## In-season deals', '', '| seed | yr | wk | kind | buyer ← seller | got | paid | starters Δ | pos Δ | seller Δ | room after | flags |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const d of inS.sort((a, b) => a.seed - b.seed || a.year - b.year || a.week - b.week)) lines.push(`| ${d.seed} | ${d.year} | ${d.week} | ${d.kind} | ${d.A} ← ${d.B} | ${d.got.pos}${d.got.ovr} a${d.got.age} y${d.got.yearsLeft ?? '?'} | ${[...d.paid.picks, ...d.paid.monsters].join(' + ') || '–'} | ${d.buyer.startGain} | ${d.buyer.posGain} | ${-d.seller.startLoss} | ${Math.round(d.buyer.roomAfter / 1000)}k | ${d.flags.join(', ') || '–'} |`);
  const text = lines.join('\n'); if (args.md) fs.writeFileSync(args.md, text + '\n'); else console.log(text);
}
if (args.report) report(); else await run();
