#!/usr/bin/env node
// Incoming-offer funnel (Task 5.5, diagnostic only). Copies src/ and tools/ of a tree to a scratch directory, adds counters to the copy's
// trade-desk.js buildIncomingOffer (the offer builder maybeTradeCall uses), plays a franchise with the game's own functions and, at every
// in-season week where calls are open, asks the copy's builder for an offer (roll forced to come up), then prints per season where the
// candidates fell out: sell (their spare for your picks), buy (your spare for their picks), and the reasons the club's evaluation gave.
// The copy is NOT production behaviour (it only counts); the repository is never changed.
//   node tools/offer-funnel.mjs --root=DIR --out=SCRATCH [--seed=21] [--seasons=4]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..')); const OUT = path.resolve(args.out || '');
if (!args.out) { console.error('usage: --root=DIR --out=SCRATCH [--seed=21] [--seasons=4]'); process.exit(2); }
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
for (const d of ['src', 'tools']) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
const file = path.join(OUT, 'src/franchise/trade-desk.js'); let s = fs.readFileSync(file, 'utf8');
const rep = (a, b) => { if (!s.includes(a)) { console.error(`instrumentation anchor not found: ${a.slice(0, 70)}`); process.exit(3); } s = s.replace(a, b); };
rep("  for (const team of clubs) {\n    const theirs = env.roster(team); const theirSpares = spares(theirs, 'theirs');",
  "  const FN = (globalThis.__fn ||= {}); const inc = (k) => { FN[k] = (FN[k] || 0) + 1; }; inc('builds');\n  for (const team of clubs) {\n    const theirs = env.roster(team); const theirSpares = spares(theirs, 'theirs');");
rep("      const upgrade = ovr(m) - floorAt(mine, m.position); if (upgrade < 3) continue;", "      inc('sell:candidate'); const upgrade = ovr(m) - floorAt(mine, m.position); if (upgrade < 3) continue; inc('sell:startsBy3');");
rep("if (gain < DEAL_RULES.minGain) continue;\n      const price", "if (gain < DEAL_RULES.minGain) continue; inc('sell:ownerGains');\n      const price");
rep("const e = accepted(prop); if (!e.accept) continue; const cost = give.reduce((s, p) => s + pickWorth(f, p), 0); if (cost > price) break;",
  "const e = accepted(prop); if (!e.accept) { inc('sell:clubRefused:' + (e.reasons?.[0]?.code || '?')); continue; } inc('sell:clubAccepts'); const cost = give.reduce((s, p) => s + pickWorth(f, p), 0); if (cost > price) { inc('sell:priceTooHigh'); break; }");
rep("    for (const s of mySpares.filter((x) => ovr(x) >= floorAt(theirs, x.position) + 2).sort((a, b) => ovr(b) - ovr(a)).slice(0, 2)) {\n      const target",
  "    for (const s of mySpares.filter((x) => ovr(x) >= floorAt(theirs, x.position) + 2).sort((a, b) => ovr(b) - ovr(a)).slice(0, 2)) {\n      inc('buy:candidate');\n      const target");
rep("const e = accepted(prop); if (!e.accept) continue; const net = ownerNet([s], [], pay.reduce",
  "const e = accepted(prop); if (!e.accept) { inc('buy:clubRefused:' + (e.reasons?.[0]?.code || '?')); continue; } inc('buy:clubAccepts'); const net = ownerNet([s], [], pay.reduce");
fs.writeFileSync(file, s); fs.writeFileSync(path.join(OUT, 'VARIANT.txt'), 'offer-funnel: counters only in trade-desk.js buildIncomingOffer. NOT production behaviour.\n');
const imp = (p) => import(path.join(OUT, p));
const F = await imp('src/franchise/franchise.js'); const R = await imp('src/franchise/league-registry.js'); const D = await imp('src/franchise/trade-desk.js');
const { contractYear } = await imp('src/franchise/trades.js'); const { tierById, ALL_TEAMS } = await imp('src/data/league.js');
const { runFranchise } = await imp('tools/franchise-soak.mjs'); const { leagueInvariants, withBoardReset } = await imp('tools/league-soak.mjs');
const env = (f) => { const cap = tierById(f.tier).cap; return { ownerRoster: f.roster, ownerRoom: F.salarySummary(f).remaining, ownerPicks: F.myTradablePicks(f), roster: (t) => R.clubRoster(f, t), room: (t) => R.clubCapRoom(f, t, cap), difficulty: f.settings?.difficulty || 'pro', year: contractYear(f), allTeams: ALL_TEAMS, clubs: R.leagueClubs(f), windowOpen: true }; };
const per = {};
const check = (f, where) => {
  if (F.hasLeague(f) && F.tradeWindow(f).calls && !f.offseason) { globalThis.__fn = {}; const o = D.buildIncomingOffer(f, env(f), { key: `funnel|${where}`, chance: 1 }); const y = f.season.year; const p = (per[y] ||= { weeks: 0, offers: 0, ownerRoster: [], aiRostersFull: [] }); p.weeks++; if (o) p.offers++; p.ownerRoster.push(f.roster.length); p.aiRostersFull.push(R.leagueClubs(f).filter((c) => R.clubRoster(f, c).length >= 38).length); for (const [k, v] of Object.entries(globalThis.__fn)) p[k] = (p[k] || 0) + v; }
  return withBoardReset(leagueInvariants)(f, where);
};
runFranchise(Number(args.seed || 21), { seasons: Number(args.seasons || 4), check });
for (const [y, p] of Object.entries(per)) { p.ownerRoster = `${Math.min(...p.ownerRoster)}–${Math.max(...p.ownerRoster)}`; p.aiRostersFull = `${Math.min(...p.aiRostersFull)}–${Math.max(...p.aiRostersFull)} of 15`; }
console.log(JSON.stringify({ root: ROOT, seed: Number(args.seed || 21), perSeason: per }, null, 1));
