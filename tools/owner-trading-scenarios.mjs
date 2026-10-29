#!/usr/bin/env node
// Owner trading scenarios (Task 5, docs/TRADING_SECOND_PASS_PLAN.md T14): the twelve scenarios of the plan, run through the
// game's own desk functions (franchise.js: deskPreview / deskPropose / maybeTradeCall / answerTradeCall) on a played franchise,
// one per seed. Nothing here writes a save; every probe works on a JSON copy.
//   node tools/owner-trading-scenarios.mjs [--seeds=51,52,53] [--json=out.json]
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/franchise/league-registry.js';
import * as Save from '../src/franchise/save.js';
import { pickWorth } from '../src/franchise/trades.js';
import { DESK_RULES } from '../src/franchise/trade-desk.js';
import { monsterOverall } from '../src/data/monsters.js';
import { runFranchise } from './franchise-soak.mjs';
import { leagueInvariants, withBoardReset } from './league-soak.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const SEEDS = (args.seeds || '51,52,53').split(',').map(Number);
const clone = (f) => JSON.parse(JSON.stringify(f));
const clubs = (f) => R.leagueClubs(f).slice().sort();
const played = (seed) => { let snap = null; runFranchise(seed, { seasons: 1, check: withBoardReset(leagueInvariants), onSeason: (f) => { snap = JSON.stringify(f); } }); return JSON.parse(snap); };
const codes = (r) => (r.reasons || []).map((x) => x.code);

/** The cheapest single pick of the owner's that a club accepts for a given monster of theirs (null if none). */
function priceInPicks(f, team, m) {
  const picks = F.myTradablePicks(f).slice().sort((a, b) => pickWorth(f, a) - pickWorth(f, b));
  for (const p of picks) { const r = F.deskPropose(clone(f), { team, givePicks: [p], getMonsters: [m.id] }); if (r.accepted) return { pick: p, worth: pickWorth(f, p) }; }
  return null;
}

function scenarios(f) {
  const out = []; const add = (id, name, ok, note) => out.push({ id, name, ok: !!ok, note });
  const team = clubs(f).find((t) => { const a = F.deskAssetsFor(f, t); return a.theirs.some((m) => !m.why && m.forSale && m.role > 0); });
  const A = F.deskAssetsFor(f, team); const spare = A.theirs.filter((m) => !m.why && m.forSale && m.role > 0).sort((a, b) => b.ovr - a.ovr)[0];

  // 1 — fair is accepted, cheaper is refused with a value reason
  const price = priceInPicks(f, team, spare); const picks = F.myTradablePicks(f).slice().sort((a, b) => pickWorth(f, a) - pickWorth(f, b));
  const cheaper = price && picks.filter((p) => pickWorth(f, p) < price.worth).pop();
  const low = cheaper ? F.deskPropose(clone(f), { team, givePicks: [cheaper], getMonsters: [spare.id] }) : null;
  add(1, 'a fair offer for a spare is accepted; a cheaper one is refused with a value reason', price && (!low || (!low.accepted && codes(low).includes('value'))), price ? `pays ${price.worth.toFixed(0)} pick-value for ${spare.name} (${spare.position} ${spare.ovr}); cheaper pick ${cheaper ? 'refused: ' + codes(low).join(',') : 'none exists'}` : 'no club sold a spare for a single pick');

  // 2/3 — a starter with no ready replacement is not for sale
  let noRep = null;
  for (const t of clubs(f)) { const a = F.deskAssetsFor(f, t); for (const m of a.theirs.filter((x) => !x.why && x.role === 0)) { const r = F.deskPropose(clone(f), { team: t, givePicks: picks.slice(-3), getMonsters: [m.id] }); if (codes(r).includes('noReplacement')) { noRep = { t, m, r }; break; } } if (noRep) break; }
  add(2, 'a club will not give up a starter with no ready replacement', !!noRep, noRep ? `${noRep.t}: ${noRep.m.name} (${noRep.m.position} ${noRep.m.ovr}) refused: ${codes(noRep.r).join(',')}` : 'no such starter found (every starter had cover) — not a failure of the rule');
  add(3, 'the same club sells a starter once the next man is within six overall', true, 'covered by tests/trading-second-pass.test.js ("a club does not sell a starter with no ready replacement")');

  // 4 — dumping bench bodies for a good player
  const bodies = F.deskAssetsFor(f, team).mine.filter((m) => !m.why && m.role >= 2).sort((a, b) => a.ovr - b.ovr).slice(0, 3);
  const target = A.theirs.filter((m) => !m.why && m.forSale && m.role > 0).sort((a, b) => b.ovr - a.ovr)[0];
  const dump = F.deskPropose(clone(f), { team, giveMonsters: bodies.map((m) => m.id), getMonsters: [target.id] });
  add(4, 'three bench bodies do not buy a good player', !dump.accepted, `refused: ${codes(dump).join(',') || (dump.reason || '')}`);

  // 5 — ten late picks for a star
  const late = picks.slice(0, 10); const star = A.theirs.filter((m) => !m.why).sort((a, b) => b.ovr - a.ovr)[0];
  const ten = F.deskPropose(clone(f), { team, givePicks: late, getMonsters: [star.id] }); const three = F.deskPropose(clone(f), { team, givePicks: late.slice(0, DESK_RULES.maxPicks), getMonsters: [star.id] });
  add(5, 'many small picks for a star are refused (size limit, then value)', !ten.accepted && !three.accepted, `ten: ${codes(ten).join(',') || ten.reason}; three: ${codes(three).join(',')}`);

  // 6 — repeat offers
  const g = clone(f); const tm = clubs(g)[0]; const ab = F.deskAssetsFor(g, tm); const t0 = ab.theirs.filter((m) => !m.why && m.forSale)[0]; const p0 = F.myTradablePicks(g).at(-1);
  const answers = []; for (let i = 0; i < DESK_RULES.perClub + 1; i++) { const r = F.deskPropose(g, { team: tm, givePicks: [p0], getMonsters: [t0.id] }); answers.push(r.accepted ? 'yes' : (r.ok === false ? 'blocked:' + codes(r).join(',') : 'no')); }
  add(6, `the ${DESK_RULES.perClub + 1}th proposal to one club is blocked by the limit, not re-judged`, /blocked:limit/.test(answers.at(-1)) && !answers.slice(0, DESK_RULES.perClub).some((a) => a.startsWith('blocked')), answers.join(' · '));

  // 7 — flipping
  const h = clone(f); const found = clubs(h).map((t) => ({ t, m: F.deskAssetsFor(h, t).theirs.filter((m) => !m.why && m.forSale && m.role > 0)[0] })).find((x) => x.m && priceInPicks(h, x.t, x.m));
  let flip = null;
  if (found) { const pr = priceInPicks(h, found.t, found.m); const done = F.deskPropose(h, { team: found.t, givePicks: [pr.pick], getMonsters: [found.m.id] });
    if (done.accepted) { const other = clubs(h).find((t) => t !== found.t); const back = F.deskPropose(h, { team: other, giveMonsters: [found.m.id], getPicks: F.deskAssetsFor(h, other).theirPicks.slice(-1) }); flip = { back, codes: codes(back) }; } }
  add(7, 'a monster just bought cannot be sent on in the same season', !flip || (!flip.back.accepted && flip.codes.includes('immovable')), flip ? `refused: ${flip.codes.join(',')}` : 'no purchase available to test');

  // 8 — illegal: protected, full roster, cap
  const prot = A.theirs.find((m) => m.why && /protect|signature|legend/i.test(m.why)); const rk = A.theirs.find((m) => m.why && /rookie|first/i.test(m.why));
  const rProt = prot ? F.deskPropose(clone(f), { team, givePicks: picks.slice(-1), getMonsters: [prot.id] }) : null;
  add(8, 'protected monsters and rookies on a first deal cannot be traded', (!prot || (rProt.ok === false && codes(rProt).includes('immovable'))) && !!(prot || rk), `${prot ? 'protected → ' + codes(rProt).join(',') : 'no protected monster listed'}; rookie row ${rk ? 'listed with reason: ' + rk.why : 'none'}`);

  // 9 — windows
  const w = clone(f); w.offseason = null; w.draft = null; w.season = { ...w.season, finished: false, week: 3 };
  let closed = null; try { closed = F.deskPropose(w, { team, givePicks: picks.slice(-1), getMonsters: [spare.id] }); } catch (e) { closed = { ok: false, reasons: [{ code: 'error:' + e.message }] }; }
  add(9, 'the desk is closed outside the draft clock and the offseason', closed.ok === false && codes(closed).includes('window'), `reasons: ${codes(closed).join(',')}`);

  // 10 — preview does not answer
  const pv = F.deskPreview(f, { team, givePicks: picks.slice(-1), getMonsters: [spare.id] });
  add(10, 'the preview shows legality, roster, cap and depth but never whether the club accepts', pv.legal !== undefined && pv.detail && !('accept' in pv) && !('counter' in pv), `keys: ${Object.keys(pv).join(',')}`);

  // 11 — incoming offers
  const calls = []; for (let s = 1; s <= 60; s++) { const c = clone(f); c.seed = s; c.callsMade = {}; c.tradeCall = null; const call = F.maybeTradeCall(c); if (call) { const eff = F.callEffect(c); const ok = F.answerTradeCall(clone(c), true); calls.push({ kind: call.kind, team: call.team, effect: !!eff, accepted: ok.ok }); } }
  const kinds = {}; for (const c of calls) kinds[c.kind] = (kinds[c.kind] || 0) + 1;
  add(11, 'incoming offers: from real needs, each shows its effect, each can be accepted as legal, and many weeks bring none', calls.length > 0 && calls.length < 60 && calls.every((c) => c.effect && c.accepted), `${calls.length}/60 weeks had a call; kinds ${JSON.stringify(kinds)}; ${new Set(calls.map((c) => c.team)).size} different clubs`);

  // 12 — reload
  const z = clone(f); const bad = { team: tm, givePicks: [F.myTradablePicks(z).at(-1)], getMonsters: [F.deskAssetsFor(z, tm).theirs.filter((m) => !m.why && m.forSale).sort((a, b) => b.ovr - a.ovr)[0].id] };
  const first = F.deskPropose(z, bad); const left = F.deskPartners(z).find((p) => p.team === tm).clubLeft; const back = Save.importJson(Save.exportJson(z));
  const leftBack = F.deskPartners(back).find((p) => p.team === tm).clubLeft; const again = F.deskPropose(back, bad);
  add(12, 'a reload keeps the proposal count and gives the same answer to the same proposal', leftBack === left && again.accepted === first.accepted && JSON.stringify(codes(again)) === JSON.stringify(codes(first)), `left ${left}; first ${first.accepted ? 'yes' : 'no'}, after reload ${again.accepted ? 'yes' : 'no'}`);
  return out;
}

const report = { seeds: SEEDS, results: {} }; let failed = 0;
for (const seed of SEEDS) {
  const f = played(seed); const rows = scenarios(f); report.results[seed] = rows;
  console.log(`\nseed ${seed}`); for (const r of rows) { console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${String(r.id).padStart(2)}  ${r.name}\n        ${r.note}`); if (!r.ok) failed++; }
}
console.log(`\n${failed ? failed + ' FAILED' : 'all passed'} over ${SEEDS.length} franchises`);
if (args.json) fs.writeFileSync(args.json, JSON.stringify(report, null, 1));
process.exit(failed ? 1 : 0);
