#!/usr/bin/env node
// Incoming-offer supply probe (Task 5.5, diagnostic only). In a played franchise, at every point of the calendar where a club may call
// the owner (weeks 2–8 and the offseason opening), asks the game's own offer builder (trade-desk.js buildIncomingOffer, the function
// maybeTradeCall uses) what it WOULD offer if the weekly roll came up, for the owner's actual roster and for the same roster with its
// four weakest bench monsters set aside (room under the 38-man limit). Separates "no call because of the roll" from "no call because no
// legal, acceptable offer exists" and from "no call because the owner's roster is full". Read only: the franchise is checked unchanged
// after each probe.
//   node tools/incoming-offer-probe.mjs [--seeds=51-55] [--seasons=3] [--root=DIR] [--json=out.json]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const imp = (p) => import(path.join(ROOT, p));
const F = await imp('src/franchise/franchise.js'); const R = await imp('src/franchise/league-registry.js'); const D = await imp('src/franchise/trade-desk.js');
const { contractYear } = await imp('src/franchise/trades.js'); const { tierById, ALL_TEAMS } = await imp('src/data/league.js'); const { monsterOverall } = await imp('src/data/monsters.js');
const { runFranchise } = await imp('tools/franchise-soak.mjs'); const { leagueInvariants, withBoardReset } = await imp('tools/league-soak.mjs');
const [s0, s1] = String(args.seeds || '51-55').split('-').map(Number); const seasons = Number(args.seasons || 3);
const hash = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
const env = (f, roster) => { const cap = tierById(f.tier).cap; return { ownerRoster: roster, ownerRoom: F.salarySummary(f).remaining, ownerPicks: F.myTradablePicks(f), roster: (t) => R.clubRoster(f, t), room: (t) => R.clubCapRoom(f, t, cap), difficulty: f.settings?.difficulty || 'pro', year: contractYear(f), allTeams: ALL_TEAMS, clubs: R.leagueClubs(f), windowOpen: true }; };
const out = { root: ROOT, seeds: [], probes: [], mutated: 0 };
for (let seed = s0; seed <= (s1 || s0); seed++) {
  const probe = (f, where) => {
    if (!F.hasLeague(f) || !F.tradeWindow(f).calls) return;
    const stamp = f.offseason ? `off:${f.season.year}` : `wk:${f.season.year}:${f.season.week}`; const before = hash([f.league, f.roster, f.pickOwners]);
    const bench = f.roster.slice().sort((a, b) => monsterOverall(a) - monsterOverall(b)); const counts = {}; for (const m of f.roster) counts[m.position] = (counts[m.position] || 0) + 1;
    const setAside = new Set(); for (const m of bench) { if (setAside.size >= 4) break; if (counts[m.position] > 3) { setAside.add(m.id); counts[m.position]--; } } // keep every position's starters
    for (const [variant, roster] of [['actual', f.roster], ['room4', f.roster.filter((m) => !setAside.has(m.id))]]) {
      const o = D.buildIncomingOffer(f, env(f, roster), { key: `probe|${stamp}|${variant}`, chance: 1 });
      const p = o?.proposal; const sends = p ? p.getMonsters.map((id) => R.clubRoster(f, o.team).find((m) => m.id === id)) : [];
      out.probes.push({ seed, where, stamp, offseason: !!f.offseason, variant, ownerRoster: roster.length, offer: !!o, kind: o?.kind || null, pos: sends[0]?.position || null, sendsOvr: sends.map((m) => monsterOverall(m)), picksAsked: p ? p.givePicks.map((x) => `R${x.round}`) : [], askMonsters: p ? p.giveMonsters.length : 0 });
    }
    if (hash([f.league, f.roster, f.pickOwners]) !== before) out.mutated++;
  };
  const check = (f, where) => { probe(f, where); return withBoardReset(leagueInvariants)(f, where); };
  runFranchise(seed, { seasons, check, onSeason: (f) => probe(f, 'season-end') });
  out.seeds.push(seed);
}
const sum = (variant, pred = () => true) => { const ps = out.probes.filter((p) => p.variant === variant && pred(p)); const k = ps.reduce((o, p) => { if (p.kind) o[p.kind] = (o[p.kind] || 0) + 1; return o; }, {}); return { probes: ps.length, offers: ps.filter((p) => p.offer).length, offerPct: ps.length ? Math.round(1000 * ps.filter((p) => p.offer).length / ps.length) / 10 : null, byKind: k, ownerRosterMedian: ps.map((p) => p.ownerRoster).sort((a, b) => a - b)[Math.floor(ps.length / 2)] }; };
out.summary = { actual: sum('actual'), room4: sum('room4'), actualAt38: sum('actual', (p) => p.ownerRoster >= 38), actualBelow38: sum('actual', (p) => p.ownerRoster < 38), offseasonActual: sum('actual', (p) => p.offseason), offseasonRoom4: sum('room4', (p) => p.offseason) };
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ seeds: out.seeds, mutated: out.mutated, ...out.summary }, null, 1));
