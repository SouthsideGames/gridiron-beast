// Trades between AI clubs (GDD §46, Phase 4; decision E, owner's rules of 2026-10-24): uncommon, driven by roster needs,
// at fair value, inside the cap and the roster limits, never a protected monster, a cornerstone or a rookie on his first deal.
// Two windows: the offseason (after free agency, before the nudge) and weeks 2–8 of the season. Every decision draws from the
// franchise generator in a fixed order, so one seed gives one league. The owner's own trades are untouched.

import { monsterOverall, ROSTER_MAX, ROSTER_MIN } from '../data/monsters.js';
import { ALL_TEAMS } from '../data/league.js';
import { GROUP_SLOTS } from './roster.js';
import { pickValue, picksOwnedBy, pickUsed, setPickOwner, tradable, currentClassYear } from './trades.js';
import { FIRST_TRADE_WEEK, TRADE_DEADLINE_WEEK, seasonTradeWeek } from './trade-window.js';
import { marketValue, rosterNet, rosterAfter, rosterProblems, isUnavailable, DEAL_RULES, ovr, scoped } from './trade-value.js';
import { hasLeague, leagueClubs, clubRoster, clubCapRoom, addToClub, removeFromClub, leagueEvent, moveIdentity, isProtected } from './league-registry.js';
import { modeOf } from './strategy.js';
import { noteTraded, returnLock } from './fa-state.js';
import { legendSide, legendCheck } from './fa-legendary.js';
import { horizonOf, PLAN } from './roster-plan.js';
import { GYM_BY_CLUB } from '../data/gyms.js';
import { clubIdentity, identityTilt, IDENTITY_TILT } from '../data/identities.js';
import { t as $t } from '../text/index.js';
/**
 * Owner ruling N8a (2026-11-08, D9): a gym prefers monsters of its element among similarly useful candidates. Legendary rules and legal
 * rosters come first (judge() decides those unchanged); this is a tie-break, never a quota. In trades: an element match adds
 * GYM_ELEMENT_TRADE_TIE to a target's ranking and an off-element spare is preferred as payment by the same amount. The value is a
 * quarter of the minimum deal gain (DEAL_RULES.minGain 8 net units, about two overall points at an average slot), i.e. about half an
 * overall point: the same "similarly useful" scale as the draft and free-agency tie-breaks (1.5 OVR-equivalent, R4).
 */
export const GYM_ELEMENT_TRADE_TIE = 2;
const gymElement = (club) => GYM_BY_CLUB[club]?.element || null;
const matches = (m, el) => !!el && (m.type === el);
/** A trade target's ranking for club `club` (gain in net roster units plus the gym element tie-break). */
export function gymTradeRank(club, m, gain) { return gain + (matches(m, gymElement(club)) ? GYM_ELEMENT_TRADE_TIE : 0); }
/**
 * Task 8 D7 (owner N8b): an AI club's identity tilts its trade-target ranking toward identity positions and scheme fits on the same
 * "similarly useful" scale as the element tie-break: the full identity tilt (IDENTITY_TILT, 1.5 OVR-equivalent) is worth
 * IDENTITY_TRADE_TIE net units (PROVISIONAL, equal to GYM_ELEMENT_TRADE_TIE). Ranking only: judge() and the deal rules are unchanged.
 */
export const IDENTITY_TRADE_TIE = GYM_ELEMENT_TRADE_TIE;
export function identityTradeTie(f, club, m) { const id = clubIdentity(f, club); return id ? identityTilt(id, m) / (IDENTITY_TILT.position + IDENTITY_TILT.fit) * IDENTITY_TRADE_TIE : 0; }

export const AI_TRADE_RULES = Object.freeze({
  upgrade: 2,          // the incoming monster must beat the club's weakest available starter at the position by this much
  band: DEAL_RULES.band, // market value received / given, both ways (position-sensitive since Task 5: trade-value.js)
  offseasonMax: 3,     // deals in one offseason window
  weekChance: 0.25,    // chance of one deal attempt in each of weeks 2–8 (about 1.75 a season, 2–4 with the offseason)
  weeks: [FIRST_TRADE_WEEK, TRADE_DEADLINE_WEEK], // the trade deadline is the end of week 8 (trade-window.js)
  season: { upgrade: 4, minGain: 16 }, // in season a deal must lift a starting slot by a margin a coach would act on: twice the offseason bar (the first Task 5 design, with the offseason bar in season, made 1.6 in-season deals a season and nearly every attempt a deal: not the "occasional deal" of §46.5)
  picksAhead: 2,       // classes a club will pay picks from
  targets: 6,          // the biggest upgrades a club looks at per window
});

const order = (f) => leagueClubs(f).slice().sort();
const slotsOf = (pos) => GROUP_SLOTS[pos]?.length || 1;
/** Fair in market value BOTH ways (the owner's rule, 2026-10-24): what each club receives over what it gives within the band, so
 *  got / gave and gave / got both lie in [0.85, 1.15]. Until the Task 6 fix (owner-approved 2026-11-01) only got / gave was checked,
 *  which let a deal at 0.85 one way stand at 1.176 the other. */
export const inBand = (got, gave) => gave > 0 && got > 0 && got / gave >= AI_TRADE_RULES.band[0] && got / gave <= AI_TRADE_RULES.band[1] && gave / got >= AI_TRADE_RULES.band[0] && gave / got <= AI_TRADE_RULES.band[1];
// starters, floorAt and sparesOf are exported (pure, unchanged) for the R4 constructed scenario test (owner ruling N8b, D11).
export const starters = (roster, pos) => roster.filter((m) => m.position === pos).sort((a, b) => (isUnavailable(a) - isUnavailable(b)) || (ovr(b) - ovr(a)) || (a.id < b.id ? -1 : 1));
/** The rating the incoming monster has to beat: the club's weakest available starter at the position (0 when a starting slot is empty). */
export const floorAt = (roster, pos) => { const at = starters(roster, pos).filter((m) => !isUnavailable(m)); const n = slotsOf(pos); return at.length < n ? 0 : ovr(at[n - 1]); };
/** A club's spares: the monsters beyond its starters (a long-injured starter counts as a spare until he is back). Only these are for sale between AI clubs. */
export const sparesOf = (roster) => Object.keys(GROUP_SLOTS).flatMap((pos) => starters(roster, pos).slice(slotsOf(pos)));
const salaryOf = (ms) => ms.reduce((s, m) => s + (m.salary || 0), 0);
// ownedPicks and judge are exported (pure, unchanged) for the R4 constructed scenario test (D11): it computes every competing offer with them.
export const ownedPicks = (f, club, y0) => { const out = []; for (let y = y0; y < y0 + AI_TRADE_RULES.picksAhead; y++) for (const p of picksOwnedBy(f, club, y, ALL_TEAMS)) if (!pickUsed(f, p)) out.push({ p, v: pickValue(p, { yearsAhead: y - y0 }) }); return out.sort((a, b) => a.v - b.v || (a.p.round - b.p.round) || (a.p.year - b.p.year) || (a.p.original < b.p.original ? -1 : 1)); };

/** Mean overall of a club's starters (the best available at each position, as many as the position has slots). A record of what a deal did, never read by a decision. */
const startersMean = (roster) => { let sum = 0, n = 0; for (const pos of Object.keys(GROUP_SLOTS)) for (const m of starters(roster, pos).filter((x) => !isUnavailable(x)).slice(0, slotsOf(pos))) { sum += ovr(m); n++; } return n ? Math.round(sum / n * 10) / 10 : 0; };

/**
 * Can this deal stand, and is it good for both clubs? `pay` is what A sends (monsters and picks) for B's monster `m`.
 * A must come out ahead by DEAL_RULES.minGain on its own measure (roster worth plus picks), B by sellerFloor; both rosters
 * stay legal, both clubs stay under the cap. Returns { na, nb } or null.
 */
export function judge(f, { A, B, rosterA, rosterB, m, ys, picks, year, roomA, roomB, minGain = DEAL_RULES.minGain }) {
  if (returnLock(f, m, A) || ys.some((y) => returnLock(f, y, B))) return null; // Task 7 resolution 6: no return to the club that traded him this league year
  const afterA = rosterAfter(rosterA, { give: ys, get: [m] }), afterB = rosterAfter(rosterB, { give: [m], get: ys });
  if (legendSide(m) && !legendCheck(afterA.filter((x) => x !== m), m, { final: true }).ok) return null; // the legendary limit (Task 7)
  if (ys.some((y) => legendSide(y) && !legendCheck(afterB.filter((x) => x !== y), y, { final: true }).ok)) return null;
  if (rosterProblems(rosterA, afterA).length || rosterProblems(rosterB, afterB).length) return null;
  const toB = salaryOf(ys), toA = m.salary || 0;
  if (roomA + toB - toA < Math.min(0, roomA) || roomB + toA - toB < Math.min(0, roomB)) return null;
  const paid = picks.reduce((s, x) => s + x.v, 0);
  const na = rosterNet(rosterA, { give: ys, get: [m] }, year) - paid, nb = rosterNet(rosterB, { give: [m], get: ys }, year) + paid;
  if (na < minGain || nb < DEAL_RULES.sellerFloor) return null;
  return { na, nb, fl: [floorAt(rosterA, m.position), floorAt(afterA, m.position)], sm: [startersMean(rosterA), startersMean(afterA), startersMean(rosterB), startersMean(afterB)] };
}

/**
 * One deal attempt for club A: find the monsters in the league that would most improve its lineup (a spare at another club
 * who beats A's weakest available starter by 2), then the way to pay that is fair in market value and leaves both clubs
 * better off: A's spares for his, A's picks, or a spare and a pick when A's roster has no room. Returns the deal executed, or null.
 * `done` is the set of clubs that already dealt this window.
 */
function attempt(f, r, A, { year, cap, done, window }) {
  const bar = window === 'season' ? AI_TRADE_RULES.season : { upgrade: AI_TRADE_RULES.upgrade, minGain: DEAL_RULES.minGain };
  const rosterA = clubRoster(f, A);
  const others = order(f).filter((c) => c !== A && !done.has(c)).sort(() => r.next() - 0.5);
  const roomA = clubCapRoom(f, A, cap); const y0 = currentClassYear(f);
  const targets = [];
  for (const B of others) { const rosterB = clubRoster(f, B); for (const m of sparesOf(rosterB)) {
    if (!tradable(f, m) || isProtected(m) || isUnavailable(m) || ovr(m) < floorAt(rosterA, m.position) + bar.upgrade) continue;
    targets.push({ B, m, rosterB, gain: rosterNet(rosterA, { get: [m] }, year) });
  } }
  const elA = gymElement(A); for (const t of targets) t.rank = gymTradeRank(A, t.m, t.gain) + identityTradeTie(f, A, t.m); // N8a: a gym's element tie-break; D7: the identity's
  targets.sort((a, b) => b.rank - a.rank || (a.m.id < b.m.id ? -1 : 1));
  const mySpares = sparesOf(rosterA).filter((x) => tradable(f, x) && !isProtected(x) && !isUnavailable(x));
  const myPicks = ownedPicks(f, A, y0);
  for (const { B, m, rosterB } of targets.slice(0, AI_TRADE_RULES.targets)) {
    const vm = marketValue(m, { year }); const roomB = clubCapRoom(f, B, cap);
    const options = [];
    for (const y of mySpares) { const vy = marketValue(y, { year }); if (inBand(vy, vm)) options.push({ ys: [y], picks: [] }); }
    const single = myPicks.find((x) => inBand(x.v, vm)); if (single) options.push({ ys: [], picks: [single] });
    if (!single) for (let i = 0; i < myPicks.length; i++) for (let j = i + 1; j < myPicks.length; j++) if (inBand(myPicks[i].v + myPicks[j].v, vm)) { options.push({ ys: [], picks: [myPicks[i], myPicks[j]] }); i = myPicks.length; break; }
    if (rosterA.length >= ROSTER_MAX || !options.length) // no room for a body, or nothing fits alone: a spare and a pick together
      for (const y of mySpares) { const vy = marketValue(y, { year }); if (vy >= vm * AI_TRADE_RULES.band[0]) continue; for (const x of myPicks) if (inBand(vy + x.v, vm)) { options.push({ ys: [y], picks: [x] }); break; } }
    let best = null;
    for (const o of options) {
      const j = judge(f, { A, B, rosterA, rosterB, m, ys: o.ys, picks: o.picks, year, roomA, roomB, minGain: bar.minGain }); if (!j) continue;
      const score = j.na + j.nb - (elA ? o.ys.filter((y) => matches(y, elA)).length * GYM_ELEMENT_TRADE_TIE : 0); if (!best || score > best.score + 1e-9) best = { ...o, ...j, score }; // N8a: a gym pays with off-element spares first
    }
    if (best) return execute(f, { A, B, m, ys: best.ys, picks: best.picks.map((x) => x.p), year, na: best.na, nb: best.nb, fl: best.fl, sm: best.sm, got: vm, paid: best.ys.reduce((s, y) => s + marketValue(y, { year }), 0) + best.picks.reduce((s, x) => s + x.v, 0) });
  }
  return null;
}
/**
 * R4 starter sales (Task 6 Phase D; owner's decision D13, specification §1.8 R4): a club in Rebuild mode may sell ONE starter, and only
 * STARTER_SALE.perWindow sale happens in the whole league in one trading window (the offseason window, or weeks 2–8 of a season).
 *   the starter    not protected, tradable (no rookie on his first deal), available, within PLAN.ageingHorizon (2) seasons of his public
 *                  decline onset or past it, and older than STARTER_SALE.youngStarAge (never a young star)
 *   the buyer      not rebuilding, with a legitimate need: he beats its weakest available starter at the position by the window's bar
 *   the price      young players (aged STARTER_SALE.youngAge or under) from the buyer's spares, or picks, or both, fair in market value
 *                  both ways (inBand); judged by the existing rules (judge): both rosters legal, both under the cap, the buyer ahead by
 *                  the window's minimum gain and the seller not behind (seller floor), on their own roster worth
 * The existing valuation, cap, roster and window rules are reused unchanged; nothing here draws from the generator.
 */
export const STARTER_SALE = Object.freeze({ perWindow: 1, youngAge: 25, youngStarAge: 26, replacementWithin: 4 });
/** No sale yet in this window (offseason window: week 0 of `year`; in season: weeks 2–8 of `year`). */
export function saleOpen(f, year, week) { return !(f.league?.trades || []).some((t) => t.sale && t.year === year && (week > 0 ? t.week > 0 : t.week === 0)); }
/** The starters a rebuilding club may sell, the furthest past onset first. */
export function sellableStarters(f, roster) {
  return Object.keys(GROUP_SLOTS).flatMap((pos) => starters(roster, pos).filter((m) => !isUnavailable(m)).slice(0, slotsOf(pos)))
    .filter((m) => !isProtected(m) && tradable(f, m) && (m.age || 0) > STARTER_SALE.youngStarAge && horizonOf(m) <= PLAN.ageingHorizon)
    .sort((a, b) => horizonOf(a) - horizonOf(b) || ovr(b) - ovr(a) || (a.id < b.id ? -1 : 1));
}
/** F4: the monster who would take the sold starter's slot (the next available at the position) is within STARTER_SALE.replacementWithin of him. */
export function hasReplacement(roster, m) { const next = starters(roster, m.position).filter((x) => x !== m && !isUnavailable(x))[slotsOf(m.position) - 1]; return !!next && ovr(next) >= ovr(m) - STARTER_SALE.replacementWithin; }
/**
 * D11 measurement (owner ruling N8b, 2026-11-08): an opt-in tally of the R4 sale search for the franchise-health reports
 * (tools/t8-league-health.mjs). Off (null) by default. Counting changes no decision, draws nothing from the generator and writes
 * nothing to the save. Fields, summed over every sale search (a window in which no sale has happened yet):
 *   searches, rebuildClubs (club-searches), sellable (sellable starters seen), withReplacement (F4 met), buyers (a non-rebuilding club
 *   with a legitimate need), offers (fair-price payments in young players or picks), passed (offers judge() accepts), deals (sales made).
 * The search stops at the first sale, so a window with a sale is counted up to that sale.
 */
let saleTally = null;
export function measureSales(tally = null) { saleTally = tally; return tally; }
const tally = (k, n = 1) => { if (saleTally) saleTally[k] = (saleTally[k] || 0) + n; };
function starterSale(f, r, { year, cap, done, window }) {
  const bar = window === 'season' ? AI_TRADE_RULES.season : { upgrade: AI_TRADE_RULES.upgrade, minGain: DEAL_RULES.minGain };
  const y0 = currentClassYear(f); tally('searches');
  for (const S of order(f).filter((c) => !done.has(c) && modeOf(f, c) === 'rebuild')) {
    const rosterS = clubRoster(f, S); const roomS = clubCapRoom(f, S, cap); tally('rebuildClubs');
    for (const m of sellableStarters(f, rosterS)) {
      tally('sellable');
      if (!hasReplacement(rosterS, m)) continue; // F4 (owner-approved 2026-11-03): only with a replacement within 4 behind him
      tally('withReplacement');
      const vm = marketValue(m, { year }); let best = null;
      for (const B of order(f).filter((c) => c !== S && !done.has(c) && modeOf(f, c) !== 'rebuild')) {
        const rosterB = clubRoster(f, B); if (ovr(m) < floorAt(rosterB, m.position) + bar.upgrade) continue; // a legitimate need
        tally('buyers');
        const young = sparesOf(rosterB).filter((y) => tradable(f, y) && !isProtected(y) && !isUnavailable(y) && (y.age || 99) <= STARTER_SALE.youngAge);
        const picks = ownedPicks(f, B, y0); const options = [];
        for (const y of young) if (inBand(marketValue(y, { year }), vm)) options.push({ ys: [y], picks: [] });
        const single = picks.find((x) => inBand(x.v, vm)); if (single) options.push({ ys: [], picks: [single] });
        if (!single) for (let i = 0; i < picks.length; i++) for (let j = i + 1; j < picks.length; j++) if (inBand(picks[i].v + picks[j].v, vm)) { options.push({ ys: [], picks: [picks[i], picks[j]] }); i = picks.length; break; }
        for (const y of young) { const vy = marketValue(y, { year }); if (vy >= vm * AI_TRADE_RULES.band[0]) continue; for (const x of picks) if (inBand(vy + x.v, vm)) { options.push({ ys: [y], picks: [x] }); break; } }
        const roomB = clubCapRoom(f, B, cap); tally('offers', options.length);
        for (const o of options) {
          const j = judge(f, { A: B, B: S, rosterA: rosterB, rosterB: rosterS, m, ys: o.ys, picks: o.picks, year, roomA: roomB, roomB: roomS, minGain: bar.minGain }); if (!j) continue;
          tally('passed'); const score = j.na + j.nb; if (!best || score > best.score + 1e-9) best = { B, ...o, ...j, score };
        }
      }
      if (best) { tally('deals'); const d = execute(f, { A: best.B, B: S, m, ys: best.ys, picks: best.picks.map((x) => x.p), year, na: best.na, nb: best.nb, fl: best.fl, sm: best.sm, got: vm, paid: best.ys.reduce((s2, y) => s2 + marketValue(y, { year }), 0) + best.picks.reduce((s2, x) => s2 + x.v, 0) }); return { ...d, sale: true, seller: S, age: m.age, horizon: horizonOf(m), buyerMode: modeOf(f, best.B), paidAges: best.ys.map((y) => y.age), inOvr: ovr(m), upgradeBar: bar.upgrade }; } // inOvr/upgradeBar: the need rule's inputs, recorded for audit
    }
  }
  return null;
}
function moveMonster(f, from, to, m, year) {
  const contract = m.contract && !m.contract.permanent ? { ...m.contract } : null; noteTraded(f, m, from); // Task 7: no return this league year
  removeFromClub(f, from, m.id, { year, reason: 'traded', quiet: true });
  addToClub(f, to, m, { year, via: 'traded', contract, salary: m.salary });
  m.traded = { from, year };
}
/** Carry out a deal: monsters both ways, picks to B, one League News event naming what A paid. */
function execute(f, { A, B, m, ys, picks, year, na, nb, fl, sm, got, paid }) {
  moveMonster(f, B, A, m, year); for (const y of ys) moveMonster(f, A, B, y, year); for (const p of picks) setPickOwner(f, p, B);
  const label = [...ys.map((y) => `${y.name} (${y.position}, ${ovr(y)} OVR)`), ...picks.map((p) => `${$t('franchise.a_round_pick', { round: p.round, year: p.year })}`)].join(' and ');
  leagueEvent(f, { kind: 'trade', from: B, to: A, consideration: label, ...moveIdentity(f, m) });
  const kind = ys.length && picks.length ? 'swap+picks' : ys.length ? 'swap' : 'picks';
  return { kind, A, B, toA: m.id, ...(ys.length ? { toB: ys[0].id, toBAll: ys.map((y) => y.id) } : {}), ...(picks.length ? { picks } : {}), pos: m.position, na: Math.round(na), nb: Math.round(nb), mv: [Math.round(got * 10) / 10, Math.round(paid * 10) / 10], fl, sm }; // mv: market value received and given, as the clubs saw it when they dealt (ratings move a little afterwards)
}

/**
 * The window's deals: in the offseason up to `offseasonMax`; in season one attempt with `weekChance`. Clubs shop in a
 * generator-shuffled order, one deal per club per window. Returns the deals made.
 */
export function aiTrades(f, r, opts) { return scoped(() => aiTradesNow(f, r, opts)); }
function aiTradesNow(f, r, { year, cap, window }) {
  if (!hasLeague(f)) return [];
  const deals = []; const done = new Set();
  if (window === 'season') { if (f.season?.finished || !seasonTradeWeek(f.season?.week || 0) || !r.chance(AI_TRADE_RULES.weekChance)) return deals; } // after the deadline no draw is made at all, so the stream of random numbers for later weeks is the same as before
  const max = window === 'season' ? 1 : AI_TRADE_RULES.offseasonMax;
  const week = f.season?.finished ? 0 : f.season?.week ?? 0;
  if (saleOpen(f, year, week)) { const d = starterSale(f, r, { year, cap, done, window }); if (d) { done.add(d.A); done.add(d.B); deals.push(d); (f.league.trades ||= []).push({ year, week, ...d }); if (f.league.trades.length > 60) f.league.trades.shift(); } }
  const shoppers = order(f).sort(() => r.next() - 0.5);
  for (const A of shoppers) {
    if (deals.length >= max) break;
    if (done.has(A)) continue;
    const d = attempt(f, r, A, { year, cap, done, window }); if (!d) continue;
    done.add(d.A); done.add(d.B); deals.push(d);
    (f.league.trades ||= []).push({ year, week: f.season?.finished ? 0 : f.season?.week ?? 0, ...d });
    if (f.league.trades.length > 60) f.league.trades.shift();
  }
  return deals;
}
