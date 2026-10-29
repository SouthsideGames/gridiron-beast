#!/usr/bin/env node
// Trade funnel diagnostic (Task 5): where do AI trade attempts die? Read-only. At every league week of the season windows
// (weeks 2-8) and at each offseason window it replays the attempt logic of league-trades.js against the live state and counts
// how many club-windows pass each gate. It changes nothing. Usage: node tools/trade-funnel.mjs --seeds=1-6 --seasons=6 [--root=DIR] [--json=FILE]
import fs from 'node:fs'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const root = path.resolve(args.root || new URL('..', import.meta.url).pathname);
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const seedList = (s) => String(s || '1-4').split(',').flatMap((x) => { const [a, b] = x.split('-').map(Number); return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a]; });
const { runFranchise } = await imp('tools/franchise-soak.mjs'); const { leagueInvariants, withBoardReset } = await imp('tools/league-soak.mjs');
const { positionNeeds, playerValue, pickValue, tradable, picksOwnedBy, pickUsed, currentClassYear } = await imp('src/franchise/trades.js');
const { AI_TRADE_RULES } = await imp('src/franchise/league-trades.js');
const { GROUP_SLOTS } = await imp('src/franchise/roster.js'); const { monsterOverall, ROSTER_MAX, ROSTER_MIN } = await imp('src/data/monsters.js');
const { clubRoster, clubCapRoom, leagueClubs, isProtected } = await imp('src/franchise/league-registry.js'); const { ALL_TEAMS } = await imp('src/data/league.js');
const { tierById } = await imp('src/data/league.js');
const F = await imp('src/franchise/franchise.js');
const slotsOf = (p) => GROUP_SLOTS[p]?.length || 1; const ovr = monsterOverall;
const funnel = { inSeason: {}, offseason: {} }; const bump = (w, k, n = 1) => { funnel[w][k] = (funnel[w][k] || 0) + n; };
function probe(f, window, cap) {
  const clubs = leagueClubs(f).slice().sort(); const rosters = Object.fromEntries(clubs.map((c) => [c, clubRoster(f, c)]));
  const spareFor = (B, pos, floor) => rosters[B].filter((m) => m.position === pos).sort((a, b) => ovr(b) - ovr(a)).slice(slotsOf(pos)).filter((m) => tradable(f, m) && !isProtected(m) && ovr(m) >= floor + AI_TRADE_RULES.upgrade);
  bump(window, 'windows');
  for (const A of clubs) {
    bump(window, 'clubWindows'); const needs = positionNeeds(rosters[A]); const wants = Object.entries(needs).filter(([, n]) => n >= (AI_TRADE_RULES.need ?? 0.25)).map(([p]) => p);
    if (!wants.length) { bump(window, 'noNeed'); continue; } bump(window, 'hasNeed');
    const why = (pos) => { const at = rosters[A].filter((m) => m.position === pos); const n = slotsOf(pos); if (at.length < n) return 'missingStarter'; const st = at.sort((a, b) => ovr(b) - ovr(a)).slice(0, n); const avg = rosters[A].reduce((s, m) => s + ovr(m), 0) / rosters[A].length; const q = st.reduce((s, m) => s + ovr(m), 0) / n; if ((avg - q) / 20 >= 0.25) return 'weakStarters'; return 'noBackup'; };
    let anySpare = false, anyBand = false, gated = null, anyPick = false;
    for (const pos of wants) {
      bump(window, `need:${why(pos)}`);
      const at = rosters[A].filter((m) => m.position === pos).sort((a, b) => ovr(b) - ovr(a)); const floor = at.length < slotsOf(pos) ? 0 : ovr(at[slotsOf(pos) - 1]);
      for (const B of clubs) { if (B === A) continue; const sp = spareFor(B, pos, floor); if (!sp.length) continue; anySpare = true; const m = sp[0]; const vm = playerValue(m);
        if (rosters[A].length >= ROSTER_MAX) gated = 'rosterFull'; else if (rosters[B].length <= ROSTER_MIN) gated = gated || 'sellerAtMin'; else if (clubCapRoom(f, A, cap) < (m.salary || 0)) gated = gated || 'noCapRoom'; else anyPick = true; }
    }
    if (anySpare) bump(window, 'someSpare'); else bump(window, 'noSpareAnywhere');
    if (gated) bump(window, `gate:${gated}`); if (anyPick) bump(window, 'pickPathOpen');
  }
}
const seeds = seedList(args.seeds); const seasons = Number(args.seasons || 4); const out = [];
for (const seed of seeds) {
  const base = withBoardReset(leagueInvariants); let last = null;
  const check = (f, where) => { if (F.hasLeague(f) && /week/.test(where) && f.season && !f.season.finished) { const w = f.season.week; const key = `${f.season.year}:${w}`; if (key !== last && w >= 2 && w <= 9) { last = key; probe(f, 'inSeason', tierById(f.tier).cap); } } return base(f, where); };
  runFranchise(seed, { seasons, check, onSeason: null }); out.push(seed);
}
console.log(JSON.stringify({ seeds: out, seasons, funnel }, null, 1)); if (args.json) fs.writeFileSync(args.json, JSON.stringify(funnel, null, 1));
