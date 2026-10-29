// Trades between AI clubs (GDD §46, Phase 4; decision E, owner's rules of 2026-10-24): uncommon, driven by roster needs,
// at fair value, inside the cap and the roster limits, never a protected monster, a cornerstone or a rookie on his first deal.
// Two windows: the offseason (after free agency, before the nudge) and weeks 2–8 of the season. Every decision draws from the
// franchise generator in a fixed order, so one seed gives one league. The owner's own trades are untouched.

import { monsterOverall, ROSTER_MAX, ROSTER_MIN } from '../data/monsters.js';
import { ALL_TEAMS } from '../data/league.js';
import { GROUP_SLOTS } from './roster.js';
import { pickValue, picksOwnedBy, pickUsed, setPickOwner, tradable, currentClassYear } from './trades.js';
import { marketValue, rosterNet, rosterAfter, rosterProblems, isUnavailable, DEAL_RULES } from './trade-value.js';
import { hasLeague, leagueClubs, clubRoster, clubCapRoom, addToClub, removeFromClub, leagueEvent, moveIdentity, isProtected } from './league-registry.js';

export const AI_TRADE_RULES = Object.freeze({
  upgrade: 2,          // the incoming monster must beat the club's weakest available starter at the position by this much
  band: DEAL_RULES.band, // market value received / given, both ways (position-sensitive since Task 5: trade-value.js)
  offseasonMax: 3,     // deals in one offseason window
  weekChance: 0.25,    // chance of one deal attempt in each of weeks 2–8 (about 1.75 a season, 2–4 with the offseason)
  weeks: [2, 8],
  picksAhead: 2,       // classes a club will pay picks from
  targets: 6,          // the biggest upgrades a club looks at per window
});

const order = (f) => leagueClubs(f).slice().sort();
const slotsOf = (pos) => GROUP_SLOTS[pos]?.length || 1;
const ovr = monsterOverall;
const inBand = (got, gave) => gave > 0 && got / gave >= AI_TRADE_RULES.band[0] && got / gave <= AI_TRADE_RULES.band[1];
const starters = (roster, pos) => roster.filter((m) => m.position === pos).sort((a, b) => (isUnavailable(a) - isUnavailable(b)) || (ovr(b) - ovr(a)) || (a.id < b.id ? -1 : 1));
/** The rating the incoming monster has to beat: the club's weakest available starter at the position (0 when a starting slot is empty). */
const floorAt = (roster, pos) => { const at = starters(roster, pos).filter((m) => !isUnavailable(m)); const n = slotsOf(pos); return at.length < n ? 0 : ovr(at[n - 1]); };
/** A club's spares: the monsters beyond its starters (a long-injured starter counts as a spare until he is back). Only these are for sale between AI clubs. */
const sparesOf = (roster) => Object.keys(GROUP_SLOTS).flatMap((pos) => starters(roster, pos).slice(slotsOf(pos)));
const salaryOf = (ms) => ms.reduce((s, m) => s + (m.salary || 0), 0);
const ownedPicks = (f, club, y0) => { const out = []; for (let y = y0; y < y0 + AI_TRADE_RULES.picksAhead; y++) for (const p of picksOwnedBy(f, club, y, ALL_TEAMS)) if (!pickUsed(f, p)) out.push({ p, v: pickValue(p, { yearsAhead: y - y0 }) }); return out.sort((a, b) => a.v - b.v || (a.p.round - b.p.round) || (a.p.year - b.p.year) || (a.p.original < b.p.original ? -1 : 1)); };

/**
 * Can this deal stand, and is it good for both clubs? `pay` is what A sends (monsters and picks) for B's monster `m`.
 * A must come out ahead by DEAL_RULES.minGain on its own measure (roster worth plus picks), B by sellerFloor; both rosters
 * stay legal, both clubs stay under the cap. Returns { na, nb } or null.
 */
function judge(f, { A, B, rosterA, rosterB, m, ys, picks, year, roomA, roomB }) {
  const afterA = rosterAfter(rosterA, { give: ys, get: [m] }), afterB = rosterAfter(rosterB, { give: [m], get: ys });
  if (rosterProblems(rosterA, afterA).length || rosterProblems(rosterB, afterB).length) return null;
  const toB = salaryOf(ys), toA = m.salary || 0;
  if (roomA + toB - toA < Math.min(0, roomA) || roomB + toA - toB < Math.min(0, roomB)) return null;
  const paid = picks.reduce((s, x) => s + x.v, 0);
  const na = rosterNet(rosterA, { give: ys, get: [m] }, year) - paid, nb = rosterNet(rosterB, { give: [m], get: ys }, year) + paid;
  if (na < DEAL_RULES.minGain || nb < DEAL_RULES.sellerFloor) return null;
  return { na, nb };
}

/**
 * One deal attempt for club A: find the monsters in the league that would most improve its lineup (a spare at another club
 * who beats A's weakest available starter by 2), then the way to pay that is fair in market value and leaves both clubs
 * better off: A's spares for his, A's picks, or a spare and a pick when A's roster has no room. Returns the deal executed, or null.
 * `done` is the set of clubs that already dealt this window.
 */
function attempt(f, r, A, { year, cap, done }) {
  const rosterA = clubRoster(f, A);
  const others = order(f).filter((c) => c !== A && !done.has(c)).sort(() => r.next() - 0.5);
  const roomA = clubCapRoom(f, A, cap); const y0 = currentClassYear(f);
  const targets = [];
  for (const B of others) { const rosterB = clubRoster(f, B); for (const m of sparesOf(rosterB)) {
    if (!tradable(f, m) || isProtected(m) || isUnavailable(m) || ovr(m) < floorAt(rosterA, m.position) + AI_TRADE_RULES.upgrade) continue;
    targets.push({ B, m, rosterB, gain: rosterNet(rosterA, { get: [m] }, year) });
  } }
  targets.sort((a, b) => b.gain - a.gain || (a.m.id < b.m.id ? -1 : 1));
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
      const j = judge(f, { A, B, rosterA, rosterB, m, ys: o.ys, picks: o.picks, year, roomA, roomB }); if (!j) continue;
      const score = j.na + j.nb; if (!best || score > best.score + 1e-9) best = { ...o, ...j, score };
    }
    if (best) return execute(f, { A, B, m, ys: best.ys, picks: best.picks.map((x) => x.p), year, na: best.na, nb: best.nb });
  }
  return null;
}
function moveMonster(f, from, to, m, year) {
  const contract = m.contract && !m.contract.permanent ? { ...m.contract } : null;
  removeFromClub(f, from, m.id, { year, reason: 'traded', quiet: true });
  addToClub(f, to, m, { year, via: 'traded', contract, salary: m.salary });
  m.traded = { from, year };
}
/** Carry out a deal: monsters both ways, picks to B, one League News event naming what A paid. */
function execute(f, { A, B, m, ys, picks, year, na, nb }) {
  moveMonster(f, B, A, m, year); for (const y of ys) moveMonster(f, A, B, y, year); for (const p of picks) setPickOwner(f, p, B);
  const label = [...ys.map((y) => `${y.name} (${y.position}, ${ovr(y)} OVR)`), ...picks.map((p) => `a round-${p.round} pick (${p.year})`)].join(' and ');
  leagueEvent(f, { kind: 'trade', from: B, to: A, consideration: label, ...moveIdentity(f, m) });
  const kind = ys.length && picks.length ? 'swap+picks' : ys.length ? 'swap' : 'picks';
  return { kind, A, B, toA: m.id, ...(ys.length ? { toB: ys[0].id, toBAll: ys.map((y) => y.id) } : {}), ...(picks.length ? { picks } : {}), pos: m.position, na: Math.round(na), nb: Math.round(nb) };
}

/**
 * The window's deals: in the offseason up to `offseasonMax`; in season one attempt with `weekChance`. Clubs shop in a
 * generator-shuffled order, one deal per club per window. Returns the deals made.
 */
export function aiTrades(f, r, { year, cap, window }) {
  if (!hasLeague(f)) return [];
  const deals = []; const done = new Set();
  if (window === 'season') { const w = f.season?.week || 0; if (w < AI_TRADE_RULES.weeks[0] || w > AI_TRADE_RULES.weeks[1] || !r.chance(AI_TRADE_RULES.weekChance)) return deals; }
  const max = window === 'season' ? 1 : AI_TRADE_RULES.offseasonMax;
  const shoppers = order(f).sort(() => r.next() - 0.5);
  for (const A of shoppers) {
    if (deals.length >= max) break;
    if (done.has(A)) continue;
    const d = attempt(f, r, A, { year, cap, done }); if (!d) continue;
    done.add(d.A); done.add(d.B); deals.push(d);
    (f.league.trades ||= []).push({ year, week: f.season?.finished ? 0 : f.season?.week ?? 0, ...d });
    if (f.league.trades.length > 60) f.league.trades.shift();
  }
  return deals;
}
