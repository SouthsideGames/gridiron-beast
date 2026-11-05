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
import { LIVE, FA_RULES, marketList, askOf, preferredYears, rateOffer, counterTerms, submitOffer, reviseOffer, acceptCounter, liveOffers, rankOffers, usableCap, openSpots, committed, capOf, rosterOf, unsigned, blocker, extensionEligible, extend, negotiation, negotiate, extWindow, sealExtension, NEG } from './fa-engine.js';
import { rosterPlan, horizonOf } from './roster-plan.js';
import { buildDepthChart } from './roster.js';
import { reservationFor, allocateBonus, OFFER_STEP } from './fa-contracts.js';
import { ambitionOf } from './ambition.js';

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
  const weakAt = {}; const vcache = new Map(); // computed once per turn (the sort compares many times)
  const valueOf = (m) => { if (vcache.has(m)) return vcache.get(m); if (!(m.position in weakAt)) weakAt[m.position] = weakestStarter(roster, m.position); const v = strategyValue(m, { mode, ask: askOf(f, m).salary, weakestStarter: weakAt[m.position], element }); vcache.set(m, v); return v; };
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
/**
 * An AI club's side of a contract negotiation (owner 2026-11-05, 13:23): the same negotiation as the owner's (fa-engine negotiate). The
 * club's target is the monster's market ask scaled by its Task 6 mode, at its own term (aiYears); it pays up to a ceiling that is higher for its core and for a
 * contender; every offer must fit its cap (`fits`), with a cap-saving bonus only where it buys the same value (R6). It accepts an opening
 * demand at or near its target, else counters at its target, takes his counter when within its ceiling, else counters once more halfway
 * (within its ceiling). He may still end the talks, and the club may still lose him.
 */
export const AI_NEG = Object.freeze({ target: Object.freeze({ contend: 1.0, compete: 0.96, retool: 0.94, rebuild: 0.92 }), ceiling: Object.freeze({ core: 1.12, other: 1.03 }), contendCeiling: 0.04, near: 0.02 });
export function aiBargain(f, club, m, neg, { core = false, fits, years = null, bonus = true }) {
  if (!neg || neg.state !== 'active') return neg?.state === 'agreed' ? neg.agreed : null;
  const mode = modeOf(f, club); const ask = askOf(f, m).salary;
  const target = step(ask * (AI_NEG.target[mode] ?? 0.96)); const ceiling = step(ask * ((core ? AI_NEG.ceiling.core : AI_NEG.ceiling.other) + (mode === 'contend' ? AI_NEG.contendCeiling : 0)));
  const ok = (t) => { if (fits(t)) return t; if (!bonus) return null; const b = bonusTerms(f, m, t); return b !== t && fits(b) ? b : null; };
  const term = years ?? neg.demand.years; // the club's own term (Task 6 R3 by mode and onset, moved to his preference when one season apart and the mode allows: aiYears): its roster planning
  const D = neg.demand; const near = D.salary <= target * (1 + AI_NEG.near);
  if (near && D.years === term && fits(D)) { const r = negotiate(f, m, neg, null, { accept: true }); return r.terms; }
  let offer = { salary: near ? D.salary : Math.min(target, D.salary), years: term, bonus: 0 }; // his money at its term, or its target at its term
  for (let round = 0; round < NEG.counters && neg.state === 'active'; round++) {
    const t = ok(offer); if (!t) return null; // it cannot afford even its own offer: it lets him go
    const r = negotiate(f, m, neg, t);
    if (r.outcome === 'agreed') return r.terms;
    if (r.outcome !== 'countered') return null;
    const c = r.counter; if (c.salary <= ceiling && fits(c)) return negotiate(f, m, neg, null, { accept: true }).terms; // his counter (at his term) within its ceiling: his preference wins the compromise
    offer = { salary: step(Math.min(ceiling, (t.salary + c.salary) / 2)), years: term, bonus: 0 }; // it keeps its term: his preference still counts in his answer
  }
  return neg.state === 'agreed' ? neg.agreed : null;
}
/** Each AI club negotiates its core extensions in the current window (the same negotiation as the owner's). */
export function aiExtensions(f, { bench = leagueBenchOf(f) } = {}) {
  const out = { offered: 0, signed: 0, countered: 0, rejected: 0, bonus: 0, declined: 0, declinedStarters: 0, byAmbition: {}, accepted: 0, compromised: 0 }; // byAmbition: developer diagnostics only (never shown)
  const window = extWindow(f);
  for (const club of leagueClubs(f).slice().sort()) {
    const starters = new Set(Object.values(buildDepthChart(rosterOf(f, club))).filter(Boolean));
    for (const m of extensionCandidates(f, club, bench)) {
      out.offered++; const a = (out.byAmbition[ambitionOf(m)] ||= { offered: 0, declined: 0, signed: 0 }); a.offered++;
      const neg = negotiation(f, m, club, window);
      if (neg.state === 'no-talks') { out.declined++; a.declined++; if (starters.has(m.id)) out.declinedStarters++; continue; } // his say: not now
      const start = m.contract.ends + 1; const room = capOf(f, club) - committed(f, club, start);
      const t = aiBargain(f, club, m, neg, { core: true, fits: (x) => x.salary + allocateBonus(x.bonus || 0, x.years)[0] <= room, years: aiTerms(f, club, m, bench).years });
      if (t) { sealExtension(f, club, m, t); out.signed++; a.signed++; if (t.bonus) out.bonus++; if (neg.offers.length) out.compromised++; else out.accepted++; }
      else { out.rejected++; if (neg.offers.some((o) => o.counter)) out.countered++; }
    }
  }
  return out;
}
