// Task 7 — AI clubs in the free-agency market (decisions 10, 28; specification "AI teams"), built on the Task 6 planner rather than
// beside it: Task 6 `clubNeeds` (what a roster lacks), `bestUpgrade` (the R5 weak-group and succession upgrade), `upgradesAllowed`
// (Contend 2, other modes 1 per offseason), `contractLength` + `modeLength` (R3 term by onset and mode) and `modeOf`.
//
// Remediation R1 (owner approval 2026-11-05):
//   a. Draft-aware timing: in the periods (before the draft) a club bids only for its urgent lineup holes and its R5 upgrade; depth is
//      filled after the draft, at the season start (league-season.js leagueFreeAgency), so draftees are not blocked.
//   b. Strategy-based evaluation: candidates are ranked by fa-strategy.js strategyValue (mode, potential, ageing horizon, cost,
//      readiness; R4 element tie-break for gyms), not by overall alone.
//   c. An R5 upgrade may release the club's expendable reserve (Task 6's choice), released only when the signing completes (fa-engine).
//   d. Competitive terms for a priority target (an urgent hole or the upgrade): the monster's preferred term when the mode allows it,
//      and, when he would turn the ask down, the terms that would satisfy him (the engine's counter rule, money capped as for every
//      club) if the club can carry them now and next year and its mode says he is worth it. A signing bonus (R6) is used only where it
//      buys the same value to him for less cap, for a money-minded monster on a multi-year deal. He still accepts, refuses or counters,
//      and other clubs may still win him.
//
// Each period every AI club, in name order, looks at the market once:
//   1. answers the counters to its own offers (accepts when it can still afford the counter and still wants him);
//   2. in a bidding war (a rival offer on its target ranks above its own) raises once, by 5%, to at most 115% of his ask;
//   3. makes new offers, at most AI_MARKET.offers a period (+1 in Contend): urgent lineup holes, then its R5 upgrade.
// The same validation and the same evaluation as the owner's offers apply (fa-engine.js). Nothing draws from the generator.
import { monsterOverall } from '../data/monsters.js';
import { ALL_TEAMS } from '../data/league.js';
import { tierById } from '../data/league.js';
import { GYM_BY_CLUB } from '../data/gyms.js';
import { leagueClubs, isProtected } from './league-registry.js';
import { clubNeeds, bestUpgrade, upgradesAllowed, contractLength, modeLength, leagueBenchOf } from './league-season.js';
import { modeOf } from './strategy.js';
import { picksOwnedBy, pickUsed, currentClassYear } from './trades.js';
import { legendSide, legendCheck } from './fa-legendary.js';
import { leagueYear } from './fa-state.js';
import { personaOf } from './fa-personality.js';
import { GROUP_SLOTS } from './roster.js';
import { strategyValue, worthPursuing } from './fa-strategy.js';
import { LIVE, FA_RULES, marketList, askOf, preferredYears, rateOffer, counterTerms, submitOffer, reviseOffer, acceptCounter, liveOffers, rankOffers, usableCap, openSpots, committed, capOf, rosterOf, unsigned, blocker, extensionEligible, extend } from './fa-engine.js';
import { rosterPlan, horizonOf } from './roster-plan.js';
import { buildDepthChart } from './roster.js';
import { reservationFor, allocateBonus, OFFER_STEP } from './fa-contracts.js';

export const AI_MARKET = Object.freeze({ offers: 2, contendExtra: 1, raise: 0.05, raiseCap: 1.15, futureCap: 1.0, bonusShare: 0.25, bonusMinded: 60 });

const picksHeld = (f, club) => { const y = currentClassYear(f); return picksOwnedBy(f, club, y, ALL_TEAMS).filter((p) => !pickUsed(f, p)).length; };
const step = (x) => Math.max(0, Math.round(x / OFFER_STEP) * OFFER_STEP);
/** The weakest starter's overall at a position on a roster (readiness), or null when the starting group is not full. */
export function weakestStarter(roster, pos) { const n = GROUP_SLOTS[pos]?.length || 1; const at = roster.filter((x) => x.position === pos && !x.injury).map(monsterOverall).sort((a, b) => b - a); return at.length >= n ? at[n - 1] : null; }
/** The club's Task 6 term for him, moved to his preferred term when they are one season apart and the mode's rule allows it (R1 d). */
export function aiYears(f, club, m, bench) {
  const mode = modeOf(f, club); const len = modeLength(contractLength(m, { bench }), m, mode); const pref = preferredYears(personaOf(m));
  if (Math.abs(pref - len) !== 1) return len;
  return modeLength(pref, m, mode) === pref ? pref : len; // the mode's own rule (Contend: one season past onset; Rebuild: one season near onset) still decides
}
/** Terms an AI club offers first: his ask, the club's term for him, no bonus. */
export function aiTerms(f, club, m, bench) { const ask = askOf(f, m); return { salary: ask.salary, years: aiYears(f, club, m, bench), bonus: 0 }; }
/** Can the club carry these terms next league year too (long-run budget, decision 28)? */
export function futureOk(f, club, terms) { if (terms.years < 2) return true; const ly = leagueYear(f) + 1; return committed(f, club, ly) + terms.salary + allocateBonus(terms.bonus || 0, terms.years)[1] <= capOf(f, club) * AI_MARKET.futureCap; }
/**
 * R6: the same value to him for less cap. A money-minded monster counts up-front money a little more (rateOffer: bonus × (1 + money/200)
 * spread over the years), so part of the salary moved into a bonus keeps his valuation and lowers each season's charge. Only for a
 * multi-year deal, within the bonus limit; returns the terms unchanged when it would not help.
 */
export function bonusTerms(f, m, terms) {
  const p = personaOf(m); if (terms.years < 2 || p.money < AI_MARKET.bonusMinded) return terms;
  const delta = step(terms.salary * AI_MARKET.bonusShare); if (!delta) return terms;
  const bonus = step(delta * terms.years / (1 + p.money / 200)) + (terms.bonus || 0);
  const t = { salary: terms.salary - delta, years: terms.years, bonus };
  if (bonus > FA_RULES.bonusMax * (t.salary * t.years + bonus)) return terms;
  return reservationFor(t) < reservationFor(terms) ? t : terms;
}
/** Terms that win him at this club if anything within the rules can (R1 d), or null. */
export function priorityTerms(f, club, m, base) {
  const r = rateOffer(f, m, club, base); if (r.score >= r.need) return base;
  return counterTerms(f, m, club, base); // his preferred term and the salary that closes the gap; null when money cannot (the engine's money cap)
}
const wants = (f, club, m) => { if (isProtected(m) || m.injury) return false; if (legendSide(m)) { const lc = legendCheck(rosterOf(f, club), m); return lc.ok && !lc.conditional; } return true; };

/** One AI club's turn in the current period. Returns the number of offers made or revised. */
export function aiClubTurn(f, club, { bench }) {
  let acted = 0; const mode = modeOf(f, club); const element = GYM_BY_CLUB[club]?.element || null;
  // 1-2: its open offers
  for (const o of liveOffers(f, (x) => x.club === club)) {
    const u = unsigned(f, o.mid); if (!u) continue;
    if (o.state === 'countered' && o.counter) { const relief = o.release ? rosterOf(f, club).find((x) => x.id === o.release) : null; if (!blocker(f, club, u.m, o.counter, { own: o, newSpot: false, relief }) && futureOk(f, club, o.counter) && acceptCounter(f, o.id).ok) acted++; continue; }
    if (o.state !== 'pending') continue;
    const rivals = liveOffers(f, (x) => x.mid === o.mid);
    if (rivals.length > 1 && rankOffers(f, u.m, rivals)[0].o !== o) {
      const ask = askOf(f, u.m).salary; const next = Math.ceil(o.salary * (1 + AI_MARKET.raise) / 100) * 100;
      if (next <= ask * AI_MARKET.raiseCap) { let t = { salary: next, years: o.years, bonus: o.bonus }; if (!futureOk(f, club, t)) t = bonusTerms(f, u.m, t); if (futureOk(f, club, t) && reviseOffer(f, o.id, t).ok) acted++; }
    }
  }
  // 3: new offers
  let budget = AI_MARKET.offers + (mode === 'contend' ? AI_MARKET.contendExtra : 0);
  const spots = () => openSpots(f, club) - picksHeld(f, club);
  const roster = rosterOf(f, club);
  const market = marketList(f).map((x) => x.m).filter((m) => wants(f, club, m) && !liveOffers(f, (o) => o.club === club && o.mid === m.id).length);
  const valueOf = (m) => strategyValue(m, { mode, ask: askOf(f, m).salary, weakestStarter: weakestStarter(roster, m.position), element });
  /** Offer on `m`: the club's terms, improved for a priority target when the mode says he is worth it, a bonus only where it saves cap. */
  const tryOffer = (m, { tag = null, priority = false, release = null } = {}) => {
    let t = aiTerms(f, club, m, bench);
    if (priority && worthPursuing(m, { mode, weakestStarter: weakestStarter(roster, m.position) })) t = priorityTerms(f, club, m, t) || t;
    const relief = release ? roster.find((x) => x.id === release.id) : null;
    const fits = (x) => !blocker(f, club, m, x, { relief }) && futureOk(f, club, x);
    if (!fits(t)) { const b = bonusTerms(f, m, t); if (b !== t && fits(b)) t = b; else return false; }
    const r = submitOffer(f, club, m.id, t, { release: release?.id || null }); if (r.ok) { budget--; acted++; if (tag) r.offer[tag] = true; } return r.ok;
  };
  // a. before the draft: urgent lineup holes only (depth waits for the draft and the season start)
  for (const [pos, , urgent] of clubNeeds(f, club)) {
    if (!urgent) continue;
    if (budget <= 0 || spots() <= 0) break;
    const best = market.filter((m) => m.position === pos && !liveOffers(f, (o) => o.club === club && o.mid === m.id).length).sort((a, b) => valueOf(b) - valueOf(a) || (a.id < b.id ? -1 : 1));
    for (const m of best) if (tryOffer(m, { priority: true })) break; // an urgent hole tries the next-best affordable monster
  }
  // R5: upgrades signed or still being negotiated this league year count against the mode's allowance; c. a release completes it
  const ly = leagueYear(f); const used = Object.values(f.freeAgency.offers).filter((o) => o.club === club && o.upgrade && o.ly === ly && (o.state === 'signed' || LIVE.has(o.state))).length;
  if (budget > 0 && used < upgradesAllowed(mode)) {
    const pick = bestUpgrade(f, club, bench, tierById(f.tier).cap);
    if (pick && (spots() > 0 || pick.release) && wants(f, club, pick.m) && unsigned(f, pick.m.id) && !liveOffers(f, (o) => o.club === club && o.mid === pick.m.id).length) tryOffer(pick.m, { tag: 'upgrade', priority: true, release: pick.release || null });
  }
  return acted;
}
/** Every AI club's turn in this period (name order). Returns { offers }. */
export function aiMarketTurn(f) {
  const bench = leagueBenchOf(f);
  let n = 0; for (const club of leagueClubs(f).slice().sort()) n += aiClubTurn(f, club, { bench });
  return { offers: n };
}

// ------------------------------------------------------------ R6: AI extensions (owner approval 2026-11-05)
/** The two extension windows: mid-season (week 6, when Task 6 strategies already look at the season) and the offseason at the league
 *  year's turn (contracts entering their final season). */
export const EXTENSION_WEEK = 6;
/** The Task 6 core a club extends before expiry: a starter not past his public onset, a designated successor, or a young monster (25 or
 *  under) with upside by the club's mode (potential at least overall + 5; Rebuild + 3). Never one Task 6 would let walk. */
export function extensionCandidates(f, club, bench) {
  const roster = rosterOf(f, club); const mode = modeOf(f, club);
  const starters = new Set(Object.values(buildDepthChart(roster)).filter(Boolean)); const plan = rosterPlan(roster, bench, { starters });
  const upside = mode === 'rebuild' ? 3 : 5;
  return roster.filter((m) => extensionEligible(f, m) && !isProtected(m) && !m.legendary).filter((m) => {
    const ovr = monsterOverall(m); const pastOnset = horizonOf(m) < 0;
    return (starters.has(m.id) && !pastOnset) || plan.successors.has(m.id) || ((m.age || 30) <= 25 && (m.potential || 0) >= ovr + upside);
  }).sort((a, b) => (starters.has(b.id) - starters.has(a.id)) || monsterOverall(b) - monsterOverall(a) || (a.id < b.id ? -1 : 1));
}
/** Each AI club offers its core extensions at the club's term and his ask; accepts his counter when the club can carry it in the
 *  extension's first season; a bonus only where it saves cap (R6). He answers by the shared evaluation. */
export function aiExtensions(f, { bench = leagueBenchOf(f) } = {}) {
  const out = { offered: 0, signed: 0, countered: 0, rejected: 0, bonus: 0 };
  for (const club of leagueClubs(f).slice().sort()) {
    for (const m of extensionCandidates(f, club, bench)) {
      let t = aiTerms(f, club, m, bench); out.offered++;
      let r = extend(f, club, m, t);
      if (!r.ok && r.code === 'cap') { const b = bonusTerms(f, m, t); if (b !== t) { t = b; r = extend(f, club, m, t); } }
      if (r.ok && r.outcome === 'countered' && r.counter) { let c = r.counter; const room = capOf(f, club) - committed(f, club, (m.contract?.ends ?? leagueYear(f)) + 1);
        if (reservationFor(c) > room) c = bonusTerms(f, m, c);
        if (reservationFor(c) <= room) { r = extend(f, club, m, c); t = c; } else out.countered++; }
      if (r.ok && r.outcome === 'signed') { out.signed++; if (t.bonus) out.bonus++; } else if (r.ok && r.outcome === 'rejected') out.rejected++;
    }
  }
  return out;
}
