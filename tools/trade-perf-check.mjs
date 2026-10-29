#!/usr/bin/env node
// Trading performance (Task 5, plan T13): how long the owner's desk and an incoming-offer search take on a full, played league.
//   node tools/trade-perf-check.mjs [--seed=51] [--n=200] [--json=out.json]
// Run on a quiet machine (no benchmark lanes). Preview = F.deskPreview (what the desk calls on every tap). Offer = maybeTradeCall's search.
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/franchise/league-registry.js';
import { pickWorth } from '../src/franchise/trades.js';
import { runFranchise } from './franchise-soak.mjs';
import { leagueInvariants, withBoardReset } from './league-soak.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const N = Number(args.n || 200); let snap = null; runFranchise(Number(args.seed || 51), { seasons: 1, check: withBoardReset(leagueInvariants), onSeason: (f) => { snap = JSON.stringify(f); } });
const f = JSON.parse(snap); const clubs = R.leagueClubs(f).slice().sort(); const picks = F.myTradablePicks(f);
const q = (a, p) => { const b = a.slice().sort((x, y) => x - y); return +b[Math.min(b.length - 1, Math.floor(p * b.length))].toFixed(2); };
const time = (fn) => { const t = process.hrtime.bigint(); fn(); return Number(process.hrtime.bigint() - t) / 1e6; };
const pre = [], asset = [], offer = [], send = [];
for (let i = 0; i < N; i++) {
  const team = clubs[i % clubs.length]; let a; asset.push(time(() => { a = F.deskAssetsFor(f, team); }));
  const their = a.theirs.filter((m) => !m.why)[i % Math.max(1, a.theirs.filter((m) => !m.why).length)]; const mine = a.mine.filter((m) => !m.why)[i % Math.max(1, a.mine.filter((m) => !m.why).length)];
  const prop = { team, giveMonsters: i % 2 ? [mine.id] : [], givePicks: [picks[i % picks.length]], getMonsters: [their.id], getPicks: [] };
  pre.push(time(() => F.deskPreview(f, prop)));
  send.push(time(() => { const g = JSON.parse(JSON.stringify({ tradeDesk: f.tradeDesk })); void g; F.deskPreview(f, prop); }));
}
for (let s = 1; s <= Math.min(60, N); s++) { const g = JSON.parse(snap); g.seed = s; g.callsMade = {}; g.tradeCall = null; offer.push(time(() => F.maybeTradeCall(g))); }
const out = { seed: Number(args.seed || 51), n: N, previewMs: { p50: q(pre, 0.5), p95: q(pre, 0.95), max: q(pre, 1) }, deskAssetsMs: { p50: q(asset, 0.5), p95: q(asset, 0.95), max: q(asset, 1) }, incomingOfferMs: { p50: q(offer, 0.5), p95: q(offer, 0.95), max: q(offer, 1), n: offer.length }, thresholds: { previewP95: 50, offerP95: 150 } };
out.pass = out.previewMs.p95 <= 50 && out.incomingOfferMs.p95 <= 150; console.log(JSON.stringify(out, null, 1)); if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1)); process.exit(out.pass ? 0 : 1);
