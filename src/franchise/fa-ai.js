// Task 7 — AI clubs in the free-agency market (decisions 10, 28; specification "AI teams"), built on the Task 6 planner rather than
// beside it: Task 6 `clubNeeds` (what a roster lacks), `bestUpgrade` (the R5 weak-group and succession upgrade), `upgradesAllowed`
// (Contend 2, other modes 1 per offseason), `contractLength` + `modeLength` (R3 term by onset and mode) and `modeOf`.
//
// Each period every AI club, in name order, looks at the market once:
//   1. answers the counters to its own offers (accepts when it can still afford the counter and still needs him);
//   2. in a bidding war (a rival offer on its target ranks above its own) raises once, by 5%, to at most 115% of his ask;
//   3. makes new offers, at most AI_MARKET.offers a period (+1 in Contend): first its urgent lineup holes and missing depth (the
//      pool part of the Task 6 needs fill), then its R5 upgrade, each within the club's open roster places (keeping one place per
//      pick it holds in the coming draft) and within its usable cap, with next season's commitments kept under the cap.
// The same validation and the same evaluation as the owner's offers apply (fa-engine.js). Nothing draws from the generator. The
// generated arrivals that carry the difficulty curve (Task 6 decision C) are left to roster preparation after the draft, unchanged.
import { monsterOverall } from '../data/monsters.js';
import { ALL_TEAMS } from '../data/league.js';
import { tierById } from '../data/league.js';
import { leagueClubs, isProtected } from './league-registry.js';
import { clubNeeds, bestUpgrade, upgradesAllowed, contractLength, modeLength, leagueBenchOf } from './league-season.js';
import { modeOf } from './strategy.js';
import { picksOwnedBy, pickUsed, currentClassYear } from './trades.js';
import { legendSide, legendCheck } from './fa-legendary.js';
import { leagueYear } from './fa-state.js';
import { LIVE, marketList, askOf, submitOffer, reviseOffer, acceptCounter, liveOffers, rankOffers, usableCap, openSpots, committed, capOf, rosterOf, unsigned, blocker } from './fa-engine.js';
import { reservationFor } from './fa-contracts.js';

export const AI_MARKET = Object.freeze({ offers: 2, contendExtra: 1, raise: 0.05, raiseCap: 1.15, futureCap: 1.0 });

const picksHeld = (f, club) => { const y = currentClassYear(f); return picksOwnedBy(f, club, y, ALL_TEAMS).filter((p) => !pickUsed(f, p)).length; };
/** Terms an AI club offers: his ask, the Task 6 term for him in the club's mode, no bonus. */
export function aiTerms(f, club, m, bench) { const ask = askOf(f, m); return { salary: ask.salary, years: modeLength(contractLength(m, { bench }), m, modeOf(f, club)), bonus: 0 }; }
/** Can the club carry these terms next league year too (long-run budget, decision 28)? */
function futureOk(f, club, terms) { if (terms.years < 2) return true; const ly = leagueYear(f) + 1; return committed(f, club, ly) + terms.salary <= capOf(f, club) * AI_MARKET.futureCap; }
const wants = (f, club, m) => { if (isProtected(m) || m.injury) return false; if (legendSide(m)) { const lc = legendCheck(rosterOf(f, club), m); return lc.ok && !lc.conditional; } return true; };

/** One AI club's turn in the current period. Returns the number of offers made or revised. */
export function aiClubTurn(f, club, { bench }) {
  let acted = 0; const mode = modeOf(f, club);
  // 1-2: its open offers
  for (const o of liveOffers(f, (x) => x.club === club)) {
    const u = unsigned(f, o.mid); if (!u) continue;
    if (o.state === 'countered' && o.counter) { if (!blocker(f, club, u.m, o.counter, { own: o, newSpot: false }) && futureOk(f, club, o.counter) && acceptCounter(f, o.id).ok) acted++; continue; }
    if (o.state !== 'pending') continue;
    const rivals = liveOffers(f, (x) => x.mid === o.mid);
    if (rivals.length > 1 && rankOffers(f, u.m, rivals)[0].o !== o) {
      const ask = askOf(f, u.m).salary; const next = Math.ceil(o.salary * (1 + AI_MARKET.raise) / 100) * 100;
      if (next <= ask * AI_MARKET.raiseCap) { const t = { salary: next, years: o.years, bonus: o.bonus }; if (futureOk(f, club, t) && reviseOffer(f, o.id, t).ok) acted++; }
    }
  }
  // 3: new offers
  let budget = AI_MARKET.offers + (mode === 'contend' ? AI_MARKET.contendExtra : 0);
  const spots = () => openSpots(f, club) - picksHeld(f, club);
  const market = marketList(f).map((x) => x.m).filter((m) => wants(f, club, m) && !liveOffers(f, (o) => o.club === club && o.mid === m.id).length);
  const tryOffer = (m, tag = null) => { const t = aiTerms(f, club, m, bench); if (reservationFor(t) > usableCap(f, club) || !futureOk(f, club, t)) return false; const r = submitOffer(f, club, m.id, t); if (r.ok) { budget--; acted++; if (tag) r.offer[tag] = true; } return r.ok; };
  for (const [pos, , urgent] of clubNeeds(f, club)) {
    if (budget <= 0 || spots() <= 0) break;
    const best = market.filter((m) => m.position === pos && !liveOffers(f, (o) => o.club === club && o.mid === m.id).length).sort((a, b) => monsterOverall(b) - monsterOverall(a) || (a.id < b.id ? -1 : 1));
    for (const m of best) { if (tryOffer(m)) break; if (!urgent) break; } // an urgent hole tries the next-best affordable monster
  }
  // R5: upgrades signed or still being negotiated this league year count against the mode's allowance
  const ly = leagueYear(f); const used = Object.values(f.freeAgency.offers).filter((o) => o.club === club && o.upgrade && o.ly === ly && (o.state === 'signed' || LIVE.has(o.state))).length;
  if (budget > 0 && spots() > 0 && used < upgradesAllowed(mode)) {
    const pick = bestUpgrade(f, club, bench, tierById(f.tier).cap);
    if (pick && !pick.release && wants(f, club, pick.m) && unsigned(f, pick.m.id) && !liveOffers(f, (o) => o.club === club && o.mid === pick.m.id).length) tryOffer(pick.m, 'upgrade');
  }
  return acted;
}
/** Every AI club's turn in this period (name order). Returns { offers }. */
export function aiMarketTurn(f) {
  const bench = leagueBenchOf(f);
  let n = 0; for (const club of leagueClubs(f).slice().sort()) n += aiClubTurn(f, club, { bench });
  return { offers: n };
}
