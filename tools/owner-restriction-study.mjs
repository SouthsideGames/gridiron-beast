#!/usr/bin/env node
// Owner-restriction study (Task 5 follow-up): does the 6-overall replacement gap keep out reasonable owner proposals?
// On a played franchise it asks, for every tradable monster of every AI club, whether the desk would take the owner's three best picks for him,
// and WHY NOT when it would not: a price reason (the pick money is not enough), or the replacement gap. Then, for the starters the gap holds back,
// it tries the proposals a rebuilding owner actually makes: a like-for-like swap (his best at the position for theirs), an upgrade swap, and a
// prospect swap (a young bench monster for a starter). Prices are never relaxed: a swap still has to pay.
//   node tools/owner-restriction-study.mjs [--seed=51] [--json=out.json]
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/franchise/league-registry.js';
import { pickWorth, contractYear } from '../src/franchise/trades.js';
import { evaluateProposal, readyReplacement, DESK_RULES } from '../src/franchise/trade-desk.js';
import { monsterOverall as ovr } from '../src/data/monsters.js';
import { ALL_TEAMS, tierById } from '../src/data/league.js';
import { runFranchise } from './franchise-soak.mjs';
import { leagueInvariants, withBoardReset } from './league-soak.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const seeds = String(args.seeds || args.seed || '51').split(',').map(Number);
const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];
const rows = []; const swaps = [];
for (const seed of seeds) {
  let snap; runFranchise(seed, { seasons: 1, check: withBoardReset(leagueInvariants), onSeason: (f) => { snap = JSON.stringify(f); } });
  const f = JSON.parse(snap); const cap = tierById(f.tier).cap;
  const env = () => ({ ownerRoster: f.roster, ownerRoom: F.salarySummary(f).remaining, ownerPicks: F.myTradablePicks(f), roster: (t) => R.clubRoster(f, t), room: (t) => R.clubCapRoom(f, t, cap), difficulty: f.settings?.difficulty || 'pro', year: contractYear(f), allTeams: ALL_TEAMS, clubs: R.leagueClubs(f), windowOpen: true, noLimit: true, counter: false, count: false });
  const ev = (team, prop) => evaluateProposal(f, { team, giveMonsters: [], givePicks: [], getMonsters: [], getPicks: [], ...prop }, env());
  const best3 = F.myTradablePicks(f).slice().sort((a, b) => pickWorth(f, b) - pickWorth(f, a)).slice(0, 3);
  for (const team of R.leagueClubs(f).sort()) {
    const A = F.deskAssetsFor(f, team);
    for (const m of A.theirs.filter((x) => !x.why)) {
      const e = ev(team, { givePicks: best3, getMonsters: [m.id] }); const codes = e.reasons.map((r) => r.code);
      const starter = m.role === 0; const gap = codes.includes('noReplacement');
      const at = A.theirs.filter((x) => x.position === m.position).sort((a, b) => b.ovr - a.ovr); const nSlots = F.GROUP_SLOTS[m.position]?.length || 1; const next = starter ? at.filter((x) => x.id !== m.id)[nSlots - 1] : null; const margin = starter ? (next ? m.ovr - next.ovr : null) : null; // how far the man behind him is
      rows.push({ seed, team, margin, pos: m.position, ovr: m.ovr, age: m.age, role: m.role, starter, gapBlocked: gap, accepted: e.accept, priceOnly: !gap && !e.accept && codes.includes('value'), otherBlock: e.reasons.filter((r) => r.blocking && r.code !== 'noReplacement').map((r) => r.code) });
      if (!starter || !gap) continue;
      // the proposals a rebuilding owner makes for this starter
      const mine = F.deskAssetsFor(f, team).mine.filter((x) => !x.why).filter((x) => x.position === m.position);
      const like = mine.filter((x) => x.ovr >= m.ovr - DESK_RULES.replacementGap).sort((a, b) => a.ovr - b.ovr)[0];            // a ready replacement from the owner
      const prospects = F.deskAssetsFor(f, team).mine.filter((x) => !x.why && x.position === m.position && x.age <= 23 && x.role > 0).sort((a, b) => b.ovr - a.ovr)[0];
      const trial = (kind, give) => { if (!give) return; const e2 = ev(team, { giveMonsters: [give.id], givePicks: best3, getMonsters: [m.id] }); swaps.push({ seed, kind, pos: m.position, target: m.ovr, sent: give.ovr, gapCleared: !e2.reasons.some((r) => r.code === 'noReplacement'), accepted: e2.accept, other: e2.reasons.filter((r) => r.blocking).map((r) => r.code) }); };
      trial('likeForLike', like); trial('prospectFor', prospects);
    }
  }
}
const pct = (n, d) => (d ? `${Math.round((1000 * n) / d) / 10}% (${n}/${d})` : '–');
const st = rows.filter((r) => r.starter), bn = rows.filter((r) => !r.starter);
console.log(`seeds ${seeds.join(',')}: ${rows.length} tradable AI monsters (${st.length} starters, ${bn.length} backups/bench)`);
console.log(`starters held back by the 6-overall gap (as they stand): ${pct(st.filter((r) => r.gapBlocked).length, st.length)}; backups/bench held back: ${pct(bn.filter((r) => r.gapBlocked).length, bn.length)}`);
console.log('by position, starters held back:', POS.map((p) => `${p} ${pct(st.filter((r) => r.pos === p && r.gapBlocked).length, st.filter((r) => r.pos === p).length)}`).join(' · '));
console.log(`young (<=23) starters held back: ${pct(st.filter((r) => r.age <= 23 && r.gapBlocked).length, st.filter((r) => r.age <= 23).length)}; top-quartile starters (ovr >= ${Math.round(st.map((r) => r.ovr).sort((a, b) => a - b)[Math.floor(st.length * 0.75)])}) held back: ${pct(st.filter((r) => r.ovr >= st.map((x) => x.ovr).sort((a, b) => a - b)[Math.floor(st.length * 0.75)] && r.gapBlocked).length, st.filter((r) => r.ovr >= st.map((x) => x.ovr).sort((a, b) => a - b)[Math.floor(st.length * 0.75)]).length)}`);
console.log('starters not for sale as they stand, by the gap (margin = his overall minus the man behind him; no cover counts as held back):', [6, 8, 10, 12, 15].map((g) => `gap ${g}: ${pct(st.filter((r) => r.margin == null || r.margin > g).length, st.length)}`).join(' · '));
for (const kind of ['likeForLike', 'prospectFor']) { const s = swaps.filter((x) => x.kind === kind); console.log(`${kind}: ${s.length} tried · gap cleared ${pct(s.filter((x) => x.gapCleared).length, s.length)} · and accepted at the price ${pct(s.filter((x) => x.accepted).length, s.length)}`); }
if (args.json) fs.writeFileSync(args.json, JSON.stringify({ seeds, rows, swaps }));
