#!/usr/bin/env node
// Round-trip study (Task 5 follow-up): can the owner turn picks into a veteran through the pick-shopping ask (GENEROSITY: rookie 1.35 / pro 1.0 /
// all-star 0.78, unchanged since v42) and sell him back to a club's desk for MORE pick value once the flip lock has lapsed (next offseason)?
// For each difficulty: shop every one of the owner's picks for each position, take the best offer, lift the lock, then find the richest pick package
// any club will give for him at the desk. Report recovered / paid in the game's own pick units (pickWorth).
//   node tools/trade-roundtrip.mjs [--seed=51] [--json=out.json]
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/franchise/league-registry.js';
import { pickWorth, contractYear } from '../src/franchise/trades.js';
import { evaluateProposal } from '../src/franchise/trade-desk.js';
import { ALL_TEAMS, tierById } from '../src/data/league.js';
import { monsterOverall } from '../src/data/monsters.js';
import { runFranchise } from './franchise-soak.mjs';
import { leagueInvariants, withBoardReset } from './league-soak.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const seed = +(args.seed || 51); const clone = (f) => JSON.parse(JSON.stringify(f));
let snap; runFranchise(seed, { seasons: 1, check: withBoardReset(leagueInvariants), onSeason: (f) => { snap = JSON.stringify(f); } });
const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
const sumW = (f, ps) => ps.reduce((s, p) => s + pickWorth(f, p), 0);

/** What the desk would say to a proposal, read-only (no clone: evaluateProposal changes nothing when count is off). */
function accepts(f, prop) {
  const cap = tierById(f.tier).cap;
  const env = { ownerRoster: f.roster, ownerRoom: F.salarySummary(f).remaining, ownerPicks: F.myTradablePicks(f), roster: (t) => R.clubRoster(f, t), room: (t) => R.clubCapRoom(f, t, cap), difficulty: f.settings?.difficulty || 'pro', year: contractYear(f), allTeams: ALL_TEAMS, clubs: R.leagueClubs(f), windowOpen: true, noLimit: true, counter: false, count: false };
  return evaluateProposal(f, { giveMonsters: [], givePicks: [], getMonsters: [], getPicks: [], ...prop }, env).accept;
}
/** The richest pick package any club will give for monster `id` at the desk (one or two of that club's best picks, any class). */
function bestSale(f, id) {
  let best = { worth: 0 };
  for (const team of R.leagueClubs(f)) {
    const picks = F.deskAssetsFor(f, team).theirPicks.slice().sort((x, y) => pickWorth(f, y) - pickWorth(f, x)).slice(0, 10);
    const combos = [...picks.map((p) => [p]), ...picks.flatMap((p, i) => picks.slice(i + 1).map((q) => [p, q]))].sort((a, b) => sumW(f, b) - sumW(f, a));
    for (const get of combos) { const w = sumW(f, get); if (w <= best.worth) break; if (accepts(f, { team, giveMonsters: [id], getPicks: get })) { best = { worth: w, team, get: get.map((p) => `${p.year}R${p.round}`) }; break; } }
  }
  return best;
}
const out = {};
for (const difficulty of ['rookie', 'pro', 'allstar']) {
  const rows = [];
  const base = clone(JSON.parse(snap)); base.settings = { ...(base.settings || {}), difficulty };
  const picks = F.myTradablePicks(base).filter((p) => p.round <= 3);
  for (const pick of picks) for (const position of POS) {
    const f = clone(base); const ask = F.tradeAskPlayer(f, { give: [pick], position }); if (!ask.ok || !ask.offers.length) continue;
    const offer = ask.offers.slice().sort((a, b) => b.value - a.value)[0]; const paid = pickWorth(f, pick);
    const done = F.acceptTrade(f, offer); if (!done.ok) continue; const m = done.got.player;
    // next offseason: the lock lapses (a season passes); ratings are held where they are so the row measures the price spread alone
    m.traded = { ...(m.traded || {}), year: -1 }; for (const k of Object.keys(f.tradeDesk || {})) delete f.tradeDesk[k]; f.tradeDesk = null;
    const sale = bestSale(f, m.id);
    rows.push({ difficulty, pick: `${pick.year}R${pick.round}`, position, got: `${m.position}${monsterOverall(m)} a${m.age}`, paid: Math.round(paid * 10) / 10, recovered: Math.round(sale.worth * 10) / 10, ratio: paid ? Math.round((sale.worth / paid) * 100) / 100 : null, club: sale.team || null, soldFor: sale.get || [] });
  }
  const ratios = rows.map((r) => r.ratio).filter((x) => x != null).sort((a, b) => a - b);
  const q = (p) => ratios[Math.min(ratios.length - 1, Math.floor(p * ratios.length))];
  out[difficulty] = { n: rows.length, median: q(0.5), p90: q(0.9), max: ratios.at(-1), over1: rows.filter((r) => r.ratio > 1).length, over1_1: rows.filter((r) => r.ratio > 1.1).length, sold: rows.filter((r) => r.recovered > 0).length, rows };
  console.log(`${difficulty}: ${rows.length} round trips · sold ${out[difficulty].sold} · recovered/paid median ${q(0.5)} · p90 ${q(0.9)} · max ${ratios.at(-1)} · above 1.0: ${out[difficulty].over1} · above 1.1: ${out[difficulty].over1_1}`);
}
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
