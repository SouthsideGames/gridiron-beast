// Trades between AI clubs (GDD §46, Phase 4; decision E, owner's rules of 2026-10-24): uncommon, driven by roster needs,
// at fair value, inside the cap and the roster limits, never a protected monster, a cornerstone or a rookie on his first deal.
// Two windows: the offseason (after free agency, before the nudge) and weeks 2–8 of the season. Every decision draws from the
// franchise generator in a fixed order, so one seed gives one league. The owner's own trades are untouched.

import { monsterOverall, ROSTER_MAX, ROSTER_MIN } from '../data/monsters.js';
import { ALL_TEAMS } from '../data/league.js';
import { GROUP_SLOTS } from './roster.js';
import { playerValue, pickValue, positionNeeds, picksOwnedBy, pickUsed, setPickOwner, tradable, currentClassYear } from './trades.js';
import { hasLeague, leagueClubs, clubRoster, clubCapRoom, addToClub, removeFromClub, leagueEvent, moveIdentity, isProtected } from './league-registry.js';

export const AI_TRADE_RULES = Object.freeze({
  need: 0.25,          // a club shops when a position's need reaches this (positionNeeds, 0–1)
  upgrade: 2,          // the incoming monster must beat the club's weakest starter at the position by this much
  band: [0.85, 1.15],  // value received / value given, both ways
  offseasonMax: 3,     // deals in one offseason window
  weekChance: 0.25,    // chance of one deal attempt in each of weeks 2–8 (about 1.75 a season, 2–4 with the offseason)
  weeks: [2, 8],
  picksAhead: 2,       // classes a club will pay picks from
});

const order = (f) => leagueClubs(f).slice().sort();
/** The rating the incoming monster has to beat: the club's weakest starter at the position (0 when a starting slot is empty). */
const floorAt = (roster, pos) => { const at = roster.filter((m) => m.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a)); const n = GROUP_SLOTS[pos]?.length || 1; return at.length < n ? 0 : monsterOverall(at[n - 1]); };
const slotsOf = (pos) => GROUP_SLOTS[pos]?.length || 1;
/** B's spare at `pos` that A would want: beyond B's starters, tradable, an upgrade for A. */
function spareFor(f, B, pos, floor) {
  const at = clubRoster(f, B).filter((m) => m.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a));
  return at.slice(slotsOf(pos)).filter((m) => tradable(f, m) && !isProtected(m) && monsterOverall(m) >= floor + AI_TRADE_RULES.upgrade).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0] || null;
}
const inBand = (got, gave) => gave > 0 && got / gave >= AI_TRADE_RULES.band[0] && got / gave <= AI_TRADE_RULES.band[1];

/**
 * One deal attempt for club A (the one in need): need-for-need with B when both gain, else A's picks for B's spare.
 * Returns the deal executed, or null. `done` is the set of clubs that already dealt this window.
 */
function attempt(f, r, A, { year, cap, done }) {
  const rosterA = clubRoster(f, A); const needsA = positionNeeds(rosterA);
  const wants = Object.entries(needsA).filter(([, n]) => n >= AI_TRADE_RULES.need).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  if (!wants.length) return null;
  const others = order(f).filter((c) => c !== A && !done.has(c)).sort(() => r.next() - 0.5);
  for (const pos of wants) {
    const floor = floorAt(rosterA, pos);
    for (const B of others) {
      const m = spareFor(f, B, pos, floor); if (!m) continue;
      const vm = playerValue(m); const roomA = clubCapRoom(f, A, cap), roomB = clubCapRoom(f, B, cap);
      // need-for-need: A's surplus at a position B needs, within the band, both under the cap afterwards
      const needsB = positionNeeds(clubRoster(f, B));
      const give = Object.entries(needsB).filter(([q, n]) => n >= 0.3 && q !== pos).map(([q]) => q).flatMap((q) => {
        const atA = rosterA.filter((x) => x.position === q).sort((a, b) => monsterOverall(b) - monsterOverall(a));
        return atA.slice(slotsOf(q)).filter((x) => tradable(f, x) && !isProtected(x) && inBand(vm, playerValue(x)) && roomA + (x.salary || 0) - (m.salary || 0) >= 0 && roomB + (m.salary || 0) - (x.salary || 0) >= 0);
      }).sort((a, b) => Math.abs(playerValue(b) - vm) - Math.abs(playerValue(a) - vm))[0];
      if (give) return swap(f, { A, B, toA: m, toB: give, year });
      // player for picks: A's picks in the next classes covering B's monster, if A has room under the cap and on the roster
      if (rosterA.length >= ROSTER_MAX || clubRoster(f, B).length <= ROSTER_MIN || roomA < (m.salary || 0)) continue;
      const y0 = currentClassYear(f); const picks = [];
      for (let y = y0; y < y0 + AI_TRADE_RULES.picksAhead; y++) for (const p of picksOwnedBy(f, A, y, ALL_TEAMS)) if (!pickUsed(f, p)) picks.push({ p, v: pickValue(p, { yearsAhead: y - y0 }) });
      picks.sort((a, b) => a.v - b.v);
      let pay = null;
      for (const x of picks) if (inBand(x.v, vm)) { pay = [x]; break; }
      if (!pay) for (let i = 0; i < picks.length && !pay; i++) for (let j = i + 1; j < picks.length; j++) if (inBand(picks[i].v + picks[j].v, vm)) { pay = [picks[i], picks[j]]; break; }
      if (!pay) continue;
      return forPicks(f, { A, B, m, picks: pay.map((x) => x.p), year });
    }
  }
  return null;
}
function moveMonster(f, from, to, m, year) {
  const contract = m.contract && !m.contract.permanent ? { ...m.contract } : null;
  removeFromClub(f, from, m.id, { year, reason: 'traded', quiet: true });
  addToClub(f, to, m, { year, via: 'traded', contract, salary: m.salary });
  m.traded = { from, year };
}
function swap(f, { A, B, toA, toB, year }) {
  moveMonster(f, B, A, toA, year); moveMonster(f, A, B, toB, year);
  leagueEvent(f, { kind: 'trade', from: B, to: A, consideration: `${toB.name} (${toB.position}, ${monsterOverall(toB)} OVR)`, ...moveIdentity(f, toA) });
  return { kind: 'swap', A, B, toA: toA.id, toB: toB.id };
}
function forPicks(f, { A, B, m, picks, year }) {
  moveMonster(f, B, A, m, year); for (const p of picks) setPickOwner(f, p, B);
  const label = picks.map((p) => `a round-${p.round} pick (${p.year})`).join(' and ');
  leagueEvent(f, { kind: 'trade', from: B, to: A, consideration: label, ...moveIdentity(f, m) });
  return { kind: 'picks', A, B, toA: m.id, picks };
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
