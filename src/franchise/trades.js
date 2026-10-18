// Draft-pick trading (GDD §19.6). Two clubs only. The owner gives picks — this
// draft's or any of the next three classes — and asks for either a veteran at a
// position or picks in a future class. Every AI club scores the ask from its
// own needs (depth at the position, prospects it likes where the pick lands,
// how far away the future pick is); the ones that would say yes make offers,
// and the owner sees up to three. A club that will not meet the ask counters
// with the nearest package it would accept. Difficulty sets how generous the
// league is. Answers are deterministic for a given ask, so re-asking does not
// help, and every pick can be shopped twice.

import { monsterOverall, salaryFor, ROSTER_MAX } from '../data/monsters.js';
import { createRng, hashString } from '../core/rng.js';
import { GROUP_SLOTS } from './roster.js';
import { newContract } from './contracts.js';
import { DRAFT_ROUNDS } from './draft.js';

export const TRADE_YEARS_AHEAD = 3;
export const ASKS_PER_PICK = 2;
export const MAX_OFFERS = 3;
/** How generous the other fifteen clubs are, by difficulty: the ratio of value they will give for what they get. */
export const GENEROSITY = Object.freeze({ rookie: 1.35, pro: 1.0, allstar: 0.78 });
/** The share of clubs that will even pick up the phone for a given ask: a club that is not in the market says no before the numbers. */
export const IN_THE_MARKET = Object.freeze({ rookie: 0.36, pro: 0.15, allstar: 0.13 });
const FUTURE_DISCOUNT = 0.62; // per class year away: a pick this year is worth about a round better next year
const TEAMS_IN_LEAGUE = 16;

// ---------------------------------------------------------------- pick identity and ownership
export const pickKey = (p) => `${p.year}:${p.round}:${p.original}`;
export const samePick = (a, b) => a.year === b.year && a.round === b.round && a.original === b.original;
export function pickOwner(f, p) { return f.pickOwners?.[p.year]?.[p.round]?.[p.original] || p.original; }
export function setPickOwner(f, p, owner) { ((((f.pickOwners ||= {})[p.year] ||= {})[p.round] ||= {})[p.original]) = owner; }
/** The class year of the draft on now (or next): the creation draft is the class of season 1; the offseason draft after season Y is the class of Y+1. */
export function currentClassYear(f) { return f.draft?.creation ? 1 : (f.season?.year || 0) + 1; }
/** Every pick a club owns in a class year, from its own slots and anything it has acquired. */
export function picksOwnedBy(f, club, year, allTeams) {
  const out = [];
  for (let round = 1; round <= DRAFT_ROUNDS; round++) for (const original of allTeams) { const p = { year, round, original }; if (pickOwner(f, p) === club) out.push(p); }
  return out;
}
/** Has this pick already been used (the draft for its class has made it)? */
export function pickUsed(f, p) {
  const d = f.draft; if (!d?.started || currentClassYear(f) !== p.year) return false;
  const i = d.order.findIndex((o) => o.round === p.round && (o.original || o.team) === p.original);
  return i >= 0 && i < d.index;
}
export function tradableYears(f) { const y0 = currentClassYear(f); const out = []; for (let y = y0; y <= y0 + TRADE_YEARS_AHEAD; y++) if (y > y0 || !f.draft?.done) out.push(y); return out; }

// ---------------------------------------------------------------- values
/** A pick's worth on a 0–100 scale: the slot inside the round when known, the round's middle when not; future classes discounted. */
export function pickValue(p, { slotInRound = null, yearsAhead = 0 } = {}) {
  const top = { 1: 100, 2: 52, 3: 26 }[p.round] || 20, bottom = { 1: 58, 2: 30, 3: 12 }[p.round] || 10;
  const t = slotInRound == null ? 0.5 : Math.max(0, Math.min(1, (slotInRound - 1) / (TEAMS_IN_LEAGUE - 1)));
  return (top - (top - bottom) * t) * Math.pow(FUTURE_DISCOUNT, Math.max(0, yearsAhead));
}
/** A veteran's worth on the same scale: overall first, youth and potential a little, with a floor so backups still cost something. */
export function playerValue(m) {
  const ovr = monsterOverall(m);
  const base = Math.max(6, (ovr - 50) * 4.2);
  const youth = m.age <= 24 ? 1.12 : m.age >= 30 ? 0.85 : 1;
  const upside = Math.max(0, (m.potential || ovr) - ovr) * 0.6;
  return base * youth + upside;
}

// ---------------------------------------------------------------- what an AI club wants
/** Needs by position for a roster: 0 = deep and strong, 1 = starters missing. */
export function positionNeeds(roster) {
  const needs = {};
  const avg = roster.length ? roster.reduce((s, m) => s + monsterOverall(m), 0) / roster.length : 60;
  for (const [pos, slots] of Object.entries(GROUP_SLOTS)) {
    const at = roster.filter((m) => m.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a));
    const starters = at.slice(0, slots.length);
    const missing = Math.max(0, slots.length - starters.length);
    const quality = starters.length ? starters.reduce((s, m) => s + monsterOverall(m), 0) / starters.length : avg - 10;
    const depth = at.length - slots.length; // backups beyond the starters
    needs[pos] = Math.max(0, Math.min(1, missing * 0.5 + Math.max(0, (avg - quality) / 20) + (depth <= 0 ? 0.25 : depth === 1 ? 0.1 : 0)));
  }
  return needs;
}
/** The slot (1–16) a pick lands in for a class whose order is known, else null. */
function slotOf(f, p) { const d = f.draft; if (!d?.started || currentClassYear(f) !== p.year) return null; const i = d.order.findIndex((o) => o.round === p.round && (o.original || o.team) === p.original); return i < 0 ? null : (i % TEAMS_IN_LEAGUE) + 1; }
/** How much a pick is worth to one club: base value, a lift when a prospect it needs is likely still there, and its appetite for picks in general. */
function pickValueFor(f, team, p, needs, ctx) {
  const yearsAhead = p.year - currentClassYear(f);
  const slot = slotOf(f, p);
  let v = pickValue(p, { slotInRound: slot, yearsAhead });
  if (slot != null && ctx.available) { // a prospect they would want, likely to reach this pick
    const overall = (p.round - 1) * TEAMS_IN_LEAGUE + slot; const reach = ctx.available.filter((m) => m.boardRank <= overall + 4);
    const wanted = reach.filter((m) => (needs[m.position] || 0) >= 0.35);
    if (wanted.length) v *= 1.2;
  }
  return v;
}
function teamRng(f, team, p, kind) { return createRng(hashString(`trade|${f.seed}|${team}|${pickKey(p)}|${kind}|${f.season?.year}`)); }

// ---------------------------------------------------------------- asks
/**
 * Ask the league for a veteran at `position` in exchange for `give` (picks the owner holds).
 * Returns { offers: [{ team, give, get: { player }, value }], asked } — up to three, best player first.
 */
export function askForPlayer(f, { give, position, teams, rosterOf, difficulty = 'pro' }) {
  const gen = GENEROSITY[difficulty] ?? 1;
  const available = f.draft?.started && !f.draft.done ? f.draft.class.filter((m) => f.draft.available.includes(m.id)) : null;
  const offers = [];
  for (const team of teams) {
    const roster = rosterOf(team); const needs = positionNeeds(roster);
    const slots = GROUP_SLOTS[position]?.length || 1;
    const at = roster.filter((m) => m.position === position).sort((a, b) => monsterOverall(b) - monsterOverall(a));
    if (at.length <= slots) continue; // they would be short at the position
    const r = teamRng(f, team, give[0], `player:${position}`);
    if (r.next() > (IN_THE_MARKET[difficulty] ?? 0.32) + (needs[position] <= 0.1 ? 0.05 : 0)) continue; // not in the market this week (a club deep at the position listens more)
    const offered = give.reduce((s, p) => s + pickValueFor(f, team, p, needs, { available }), 0);
    const mood = 0.9 + r.next() * 0.2; // a little club-to-club temperament
    const budget = offered * gen * mood * (1 - needs[position] * 0.5); // a club short at the position parts with less
    const candidates = at.filter((m) => !m.legendary && !m.signature && !m.cornerstone && m.yearsPro > 0 && !m.drafted && !m.rookie);
    const keepStarters = new Set(at.slice(0, slots).map((m) => m.id));
    let best = null;
    const floor = offered * 0.6; // a club does not answer a first-round ask with a reserve: the return has to be worth the pick
    for (const m of candidates) {
      const starter = keepStarters.has(m.id);
      if (starter) { const next = at.filter((x) => x.id !== m.id)[slots - 1]; if (!next || monsterOverall(next) < monsterOverall(m) - 6) continue; } // no replacement ready: the starter is not for sale
      const cost = playerValue(m) * (starter ? 1.3 : 1); // starters cost more to pry loose
      if (cost <= budget && playerValue(m) >= floor && (!best || monsterOverall(m) > monsterOverall(best))) best = m;
    }
    if (best) offers.push({ team, give, get: { player: best }, value: playerValue(best), starter: keepStarters.has(best.id) });
  }
  offers.sort((a, b) => b.value - a.value);
  return { offers: offers.slice(0, MAX_OFFERS), teams: offers.length };
}
/**
 * Ask the league for `count` picks of `round` in class `year` in exchange for `give`. Clubs that will not meet the ask
 * counter with the nearest package they would accept (a later round, one pick instead of two, a class further out).
 * Returns { offers: [{ team, give, get: { picks }, exact, value }] } — exact matches first, then the richest counters.
 */
export function askForPicks(f, { give, year, round, count = 1, teams, rosterOf, difficulty = 'pro', allTeams }) {
  const gen = GENEROSITY[difficulty] ?? 1;
  const y0 = currentClassYear(f);
  const available = f.draft?.started && !f.draft.done ? f.draft.class.filter((m) => f.draft.available.includes(m.id)) : null;
  const offers = [];
  for (const team of teams) {
    const roster = rosterOf(team); const needs = positionNeeds(roster);
    const offered = give.reduce((s, p) => s + pickValueFor(f, team, p, needs, { available }), 0);
    const r = teamRng(f, team, give[0], `picks:${year}:${round}:${count}`);
    if (r.next() > (IN_THE_MARKET[difficulty] ?? 0.32) + 0.1) continue; // picks-for-picks is an easier phone call than a player
    const budget = offered * gen * (0.9 + r.next() * 0.2);
    const owned = (y) => picksOwnedBy(f, team, y, allTeams).filter((p) => !pickUsed(f, p) && !give.some((g) => samePick(g, p)));
    const costOf = (picks) => picks.reduce((s, p) => s + pickValue(p, { slotInRound: slotOf(f, p), yearsAhead: p.year - y0 }) * (p.year === y0 ? 1.15 : 1), 0); // this year's picks are dearer to the club holding them
    const pack = (y, rd, n) => { const list = owned(y).filter((p) => p.round === rd).slice(0, n); return list.length === n ? list : null; };
    const exact = pack(year, round, count);
    if (exact && costOf(exact) <= budget) { offers.push({ team, give, get: { picks: exact }, exact: true, value: costOf(exact) }); continue; }
    // Counter: every package in reach, richest first.
    let bestCounter = null;
    const giveRounds = new Set(give.map((g) => `${g.year}:${g.round}`));
    for (let y = y0; y <= y0 + TRADE_YEARS_AHEAD; y++) for (let rd = 1; rd <= DRAFT_ROUNDS; rd++) for (let n = Math.min(2, count); n >= 1; n--) {
      if (giveRounds.has(`${y}:${rd}`) && n === 1) continue; // swapping like for like is not a counter
      const picks = pack(y, rd, n); if (!picks) continue;
      const c = costOf(picks); if (c > budget) continue;
      const playerSide = picks.reduce((s, p) => s + pickValue(p, { yearsAhead: p.year - y0 }), 0);
      const distance = Math.abs(y - year) + Math.abs(rd - round) + (n < count ? 1 : 0); // the nearest package to what was asked, then the richest
      if (!bestCounter || distance < bestCounter.distance || (distance === bestCounter.distance && playerSide > bestCounter.value)) bestCounter = { team, give, get: { picks }, exact: false, value: playerSide, distance };
    }
    if (bestCounter) offers.push(bestCounter);
  }
  offers.sort((a, b) => (b.exact - a.exact) || (b.value - a.value));
  return { offers: offers.slice(0, MAX_OFFERS), teams: offers.length };
}

// ---------------------------------------------------------------- doing the deal
/** Move the given picks to the other club and bring back the player or the picks. Returns what changed. */
export function executeTrade(f, offer, { club, year, nextYear }) {
  for (const p of offer.give) {
    setPickOwner(f, p, offer.team);
    const d = f.draft; if (d?.started && currentClassYear(f) === p.year) for (let i = d.index; i < d.order.length; i++) { const o = d.order[i]; if (o.round === p.round && (o.original || o.team) === p.original) { o.original = p.original; o.team = offer.team; } }
  }
  const got = { player: null, picks: [] };
  if (offer.get.player) {
    const src = offer.get.player; const m = JSON.parse(JSON.stringify(src));
    m.salary = m.salary || salaryFor(m); m.contract = newContract(nextYear, 2); m.joined = nextYear; m.traded = { from: offer.team, year };
    (m.history ||= []).push({ club: offer.team, from: Math.max(1, year - Math.min(m.yearsPro || 0, 3)), to: year, reason: 'traded' });
    delete m.signature; delete m.legendary;
    f.roster.push(m);
    (((f.aiTransfers ||= {})[year] ||= {})[offer.team] ||= []).push(src.id);
    got.player = m;
  }
  if (offer.get.picks) for (const p of offer.get.picks) { setPickOwner(f, p, club); const d = f.draft; if (d?.started && currentClassYear(f) === p.year) for (let i = d.index; i < d.order.length; i++) { const o = d.order[i]; if (o.round === p.round && (o.original || o.team) === p.original) { o.original = p.original; o.team = club; } } got.picks.push(p); }
  (f.trades ||= []).push({ year, team: offer.team, give: offer.give, got: offer.get.player ? { player: { id: got.player.id, name: got.player.name, position: got.player.position, ovr: monsterOverall(got.player) } } : { picks: got.picks } });
  return got;
}
/** Can the owner accept a player offer right now? Roster room is the only hard gate; the cap is reviewed by the commissioner like any signing. */
export function canTakePlayer(f) { return f.roster.length < ROSTER_MAX; }
export const describePick = (p, yearOf) => `${yearOf(p.year)} R${p.round}${p.original ? ` (${p.original.split(' ').pop()})` : ''}`;
