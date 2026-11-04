// Task 7 — the free-agency transaction engine (specification "Player records and market", "Offers and contracts", "Negotiation
// engine"; decisions 1, 4–8, 11, 13, 15–17, 20, 23–25, 29; audit resolutions 1, 4 and 6; owner decisions D1–D6).
//
// One market for every club. The unsigned monsters stay where the game already keeps them (the regional pools, the league's waivers,
// and this offseason's generated veterans in `f.freeAgency.extra`); the market adds only negotiation state, offers and the reserved
// first-year charges. The owner's club and the 15 AI clubs pass through the same validation, the same evaluation and the same signing
// transaction: no club has a hidden exception, and being the player's club changes nothing in the tie order.
//
//   offer states    pending → countered | accepted | rejected | withdrawn | expired | signed   (accepted = official once every
//                   signing requirement holds; a legendary replacement waits there until the club's other legendary has left)
//   reservation     a live offer (pending, countered, accepted) holds salary + the first-year bonus allocation against usable cap;
//                   every exit from those states releases it exactly once, because the ledger is the live offers themselves
//   one contract    a monster signs once: the signing removes him from the market and closes every other offer in the same step
//
// Nothing here draws from the franchise generator: the evaluation is a function of the monster (personality, career stage), the
// club (roster, results, cap) and the terms, so the outcome of a negotiation is reproducible. The tie-break value is a saved hash.
import { monsterOverall, salaryFor, ROSTER_MAX } from '../data/monsters.js';
import { tierById } from '../data/league.js';
import { hashString } from '../core/rng.js';
import { renewalAsk } from './contracts.js';
import { GROUP_SLOTS } from './roster.js';
import { leagueBench, PLAN } from './roster-plan.js';
import { hasLeague, leagueClubs, clubRoster, addToClub, isProtected } from './league-registry.js';
import { takeFromPool, takeFromWaivers } from './league.js';
import { makeContract, capCharge, reservationFor, toStep, clampYears, allocateBonus, OFFER_STEP } from './fa-contracts.js';
import { legendCheck, legendSide } from './fa-legendary.js';
import { personaOf, responseWindow } from './fa-personality.js';
import { leagueYear, hasFreeAgency, noteSigned, returnLock } from './fa-state.js';

export const FA_RULES = Object.freeze({
  periods: 5,               // free-agency periods before the draft (decisions 12, 27)
  revisionsPerPeriod: 2,    // substantive revisions per monster per period by one club (resolution 4)
  lowball: 0.85,            // money below this share of the ask is a low offer (decision 4)
  lowballCost: 18,          // patience a low offer costs
  insulted: 25,             // patience at or below which a club that lowballed twice is refused for the league year
  counterBand: 0.9,         // an offer within this share of what he needs draws a counter rather than a refusal
  tolerance: 0.9,           // he accepts an offer worth this share of what his alternatives would give (no offer is average on every count; calibrated at checkpoint A: about 1 in 4 at-ask renewals refused)
  flex: [0.03, 0.07],       // his ask falls this much per period unsigned: the money-minded the least (decision 16)
  flexFloor: 0.7,           // never below this share of his first ask
  bonusMax: 0.5,            // a bonus may be at most half the contract's total value
});
export const LIVE = new Set(['pending', 'countered', 'accepted']);

// ------------------------------------------------------------ owner hooks (franchise.js registers them; keeps imports one-way)
const HOOKS = { capFor: null, staffTotal: null, joinOwner: null, news: null };
export function registerOwnerHooks(h) { Object.assign(HOOKS, h); }

// ------------------------------------------------------------ clubs, rosters, the cap
export const isOwner = (f, club) => club === f.club;
export const rosterOf = (f, club) => (isOwner(f, club) ? f.roster : clubRoster(f, club));
export const allClubs = (f) => [f.club, ...(hasLeague(f) ? leagueClubs(f).slice().sort() : [])];
export const capOf = (f, club) => (isOwner(f, club) ? (HOOKS.capFor ? HOOKS.capFor(f) : tierById(f.tier).cap) : tierById(f.tier).cap);
/** What a club has committed against league year `ly`: monsters (protected exempt for AI clubs, owner D1), staff, and staff charges. */
export function committed(f, club, ly = leagueYear(f)) {
  const owner = isOwner(f, club); const current = ly === leagueYear(f);
  let s = 0; for (const m of rosterOf(f, club)) s += capCharge(m, ly, { current, exemptProtected: !owner });
  if (owner) {
    s += HOOKS.staffTotal ? HOOKS.staffTotal(f) : 0;
    const y = f.season?.year ?? 1; s += ly === y ? (f.deadCap || 0) : ly === y + 1 && f.season?.finished ? (f.pendingDeadCap || 0) : 0; // staff charges (D2)
  } else s += f.league?.staffAllowance || 0;
  return s;
}
export const offersOf = (f) => Object.values(f.freeAgency?.offers || {});
export const liveOffers = (f, pred = () => true) => offersOf(f).filter((o) => LIVE.has(o.state) && pred(o));
/** The reservation ledger: what a club's live offers hold back. */
export const reservedBy = (f, club) => liveOffers(f, (o) => o.club === club).reduce((s, o) => s + o.reserved, 0);
/** Cap the club can still use this league year (never negative for a new commitment: offers are refused instead). */
export const usableCap = (f, club) => capOf(f, club) - committed(f, club) - reservedBy(f, club);
export function capView(f, club) { const cap = capOf(f, club); const used = committed(f, club); const reserved = reservedBy(f, club); return { cap, committed: used, reserved, usable: cap - used - reserved, leagueYear: leagueYear(f) }; }
/** Roster places a club has free for new signings, after the offers it already has out. */
export const openSpots = (f, club) => ROSTER_MAX - rosterOf(f, club).length - liveOffers(f, (o) => o.club === club).length;

// ------------------------------------------------------------ the market
/** Every unsigned monster: [{ m, where }] with where 'pool' | 'waivers' | 'extra'. */
export function marketList(f) {
  const out = []; const seen = new Set(); const add = (m, where) => { if (m && !seen.has(m.id) && !m.retired) { seen.add(m.id); out.push({ m, where }); } };
  for (const region of Object.keys(f.pool || {}).sort()) for (const m of f.pool[region]) add(m, 'pool');
  for (const m of f.league?.waivers || []) add(m, 'waivers');
  for (const m of f.freeAgency?.extra || []) add(m, 'extra');
  return out;
}
export const unsigned = (f, id) => marketList(f).find((x) => x.m.id === id) || null;
function takeUnsigned(f, id) {
  const x = f.freeAgency?.extra || []; const i = x.findIndex((m) => m.id === id); if (i >= 0) return x.splice(i, 1)[0];
  return takeFromWaivers(f, id) || takeFromPool(f, id) || null;
}
/** The monster's negotiation state, made on first use. */
export function entryOf(f, m) {
  const mk = f.freeAgency.market;
  if (!mk[m.id]) { const p = personaOf(m); mk[m.id] = { patience: p.patience, unsigned: 0, low: {}, refuse: {}, first: null, ly: leagueYear(f) }; }
  return mk[m.id];
}

// ------------------------------------------------------------ what he wants
export const preferredYears = (p) => (p.security >= 66 ? 3 : p.security >= 40 ? 2 : 1);
/** His expectation now: salary (in 100s), preferred years. Falls while he stays unsigned, by personality (decision 16). */
export function askOf(f, m) {
  const p = personaOf(m); const base = toStep(renewalAsk(m).ask || salaryFor(m));
  const e = f.freeAgency?.market?.[m.id]; const t = e?.unsigned || 0;
  const rate = FA_RULES.flex[0] + (FA_RULES.flex[1] - FA_RULES.flex[0]) * (1 - p.money / 100);
  const salary = Math.max(OFFER_STEP, toStep(base * Math.max(FA_RULES.flexFloor, 1 - rate * t)));
  return { salary, years: preferredYears(p), base };
}
/** Where he would stand on the club: 'starter' | 'backup' | 'depth' (decision 15: a preference, never a binding promise). */
export function roleAt(f, club, m) {
  const slots = GROUP_SLOTS[m.position]?.length || 1; const ovr = monsterOverall(m);
  const ahead = rosterOf(f, club).filter((x) => x.id !== m.id && x.position === m.position && !x.injury && monsterOverall(x) > ovr).length;
  return ahead < slots ? 'starter' : ahead < slots + 1 ? 'backup' : 'depth';
}
const ROLE_VALUE = { starter: 1, backup: 0.6, depth: 0.3 };
/** The league's starter level by position (Task 6 `leagueBench`), cached for one moment of the calendar. */
const benchCache = new WeakMap();
export function benchOf(f) {
  const stamp = `${leagueYear(f)}|${f.freeAgency?.period ?? '-'}|${f.season?.year}|${f.season?.week}|${f.season?.day}|${f.season?.finished ? 1 : 0}`;
  const c = benchCache.get(f); if (c?.stamp === stamp) return c.bench;
  const bench = leagueBench(allClubs(f).map((club) => rosterOf(f, club))); benchCache.set(f, { stamp, bench }); return bench;
}
/** The role his level would earn him on the open market (the "market context" of the specification): what he can expect elsewhere. */
export function marketRole(f, m) { const b = benchOf(f)[m.position]; if (b == null) return 'backup'; const ovr = monsterOverall(m); return ovr >= b + PLAN.weakGap ? 'starter' : ovr >= b + PLAN.severeGap ? 'backup' : 'depth'; }
/** The club's results as he sees them: this (or the just-finished) season's win share, 0.5 before a game is played. */
export function clubSuccess(f, club) { const r = f.season?.records?.[club]; const g = (r?.w || 0) + (r?.l || 0); return g ? r.w / g : 0.5; }

/**
 * How he rates an offer (decision 25): { score, need, parts, moneyRatio, low }. `score` against `need`, the score an offer at his
 * ask from an ordinary club would earn: at or above it he accepts; within FA_RULES.counterBand he counters.
 */
export function rateOffer(f, m, club, terms, { guaranteed = false } = {}) {
  const p = personaOf(m); const ask = askOf(f, m); const years = clampYears(terms.years);
  const bonus = Math.max(0, terms.bonus || 0);
  const moneyEq = terms.salary + (bonus * (1 + p.money / 200)) / years; // up-front money counts a little more to the money-minded
  const moneyRatio = moneyEq / Math.max(1, ask.salary);
  const parts = {
    money: Math.min(1.4, moneyRatio),
    security: Math.max(0, 1 - 0.2 * Math.abs(years - ask.years)),
    role: ROLE_VALUE[roleAt(f, club, m)],
    winning: clubSuccess(f, club),
  };
  const w = { money: p.money, security: p.security, role: p.role, winning: p.winning }; const tot = Object.values(w).reduce((s, x) => s + x, 0) || 1;
  const score = Object.keys(w).reduce((s, k) => s + (w[k] / tot) * parts[k], 0);
  const need = FA_RULES.tolerance * (w.money + w.security + w.role * ROLE_VALUE[marketRole(f, m)] + w.winning * 0.5) / tot; // what his alternatives would give him, less the tolerance
  return { score, need: guaranteed ? Math.min(need, score) : need, parts, moneyRatio, low: moneyRatio < FA_RULES.lowball, strongest: p.strongest, weights: w };
}
/** The terms that would satisfy him at this club: his preferred years and the salary that closes the gap (in 100s). */
export function counterTerms(f, m, club, terms) {
  const ask = askOf(f, m); const t = { salary: terms.salary, years: ask.years, bonus: terms.bonus || 0 };
  for (let i = 0; i < 60; i++) { const r = rateOffer(f, m, club, t); if (r.score >= r.need) return t; t.salary += OFFER_STEP; }
  return { ...t, salary: Math.max(t.salary, ask.salary) };
}

// ------------------------------------------------------------ validation shared by every path
/**
 * Can `club` commit to `m` on `terms` now? Returns null, or { code, reason } with an actionable reason. `final`: the signing itself
 * (legendary replacement must be complete). `reserve`: the charge this commitment needs (an offer's own reservation is credited).
 */
export function blocker(f, club, m, terms, { final = false, own = null, newSpot = true } = {}) {
  const roster = rosterOf(f, club);
  if (roster.some((x) => x.id === m.id)) return { code: 'already', reason: `${m.name} is already on the roster.` };
  if (newSpot) { const spots = ROSTER_MAX - roster.length - liveOffers(f, (o) => o.club === club && o !== own).length; if (spots <= 0) return { code: 'roster', reason: `No open roster place (${ROSTER_MAX} maximum, counting offers already out). Release a monster or withdraw an offer first.` }; }
  const lc = legendCheck(roster, m, { final }); if (!lc.ok) return { code: 'legendary', reason: lc.reason, replace: lc.replace };
  const lock = returnLock(f, m, club); if (lock) return { code: 'lock', reason: lock };
  const e = f.freeAgency?.market?.[m.id]; if (e?.refuse?.[club] === leagueYear(f)) return { code: 'refused', reason: `${m.name} will not negotiate with ${club} again this league year after repeated low offers.` };
  if (terms) {
    if (terms.salary % OFFER_STEP || (terms.bonus || 0) % OFFER_STEP) return { code: 'step', reason: `Salary and bonus move in ${OFFER_STEP}-credit steps.` };
    if ((terms.bonus || 0) > FA_RULES.bonusMax * (terms.salary * clampYears(terms.years) + (terms.bonus || 0))) return { code: 'bonus', reason: 'A signing bonus may be at most half of the contract.' };
    const need = reservationFor({ ...terms, years: clampYears(terms.years) }); const credit = own && LIVE.has(own.state) ? own.reserved : 0;
    const usable = usableCap(f, club) + credit;
    if (need > usable) return { code: 'cap', reason: `Needs ${need.toLocaleString('en-US')} cr. of usable cap; ${club === f.club ? 'you have' : `${club} has`} ${Math.max(0, usable).toLocaleString('en-US')} cr.` };
  }
  return null;
}

// ------------------------------------------------------------ offers (offseason periods)
const fa = (f) => f.freeAgency;
const nextId = (f) => `o${++fa(f).seq}`;
const tieOf = (f, club, mid) => hashString(`${f.seed ?? 0}|${leagueYear(f)}|${mid}|${club}`) / 4294967296;
export const periodNow = (f) => fa(f)?.period ?? null;
/** The period an offer made now would expire at: 1–3 advances by his patience, never past Period 5 (resolution 4). */
export const deadlineFor = (f, m) => Math.min(FA_RULES.periods, (periodNow(f) || 1) + responseWindow(m));

function logTx(f, e) { const L = (fa(f).log ||= []); L.push({ ly: leagueYear(f), p: periodNow(f), ...e }); if (L.length > 300) L.splice(0, L.length - 300); }
function close(f, o, state, why = null) { if (!LIVE.has(o.state)) return false; o.state = state; o.closed = { p: periodNow(f), why }; o.reserved = 0; return true; } // the reservation is released here, once

/** Submit an offer during a free-agency period. Returns { ok, offer } or { ok: false, code, reason }. */
export function submitOffer(f, club, mid, terms) {
  if (!hasFreeAgency(f) || !periodNow(f)) return { ok: false, code: 'closed', reason: 'Offers are made during the free-agency periods.' };
  const u = unsigned(f, mid); if (!u) return { ok: false, code: 'gone', reason: 'He is no longer on the market.' };
  const m = u.m; terms = { salary: toStep(terms.salary), years: clampYears(terms.years), bonus: toStep(terms.bonus || 0) };
  if (liveOffers(f, (o) => o.club === club && o.mid === mid).length) return { ok: false, code: 'dup', reason: 'You already have an offer out to him: revise it instead.' };
  const b = blocker(f, club, m, terms); if (b) return { ok: false, ...b };
  const e = entryOf(f, m); const r = rateOffer(f, m, club, terms); if (r.low) lowball(f, m, e, club);
  const o = { id: nextId(f), v: 1, club, mid, ...terms, reserved: reservationFor(terms), state: 'pending', period: periodNow(f), expires: deadlineFor(f, m), round: 1, tie: tieOf(f, club, mid), revisions: {}, counter: null, history: [{ p: periodNow(f), ...terms, act: 'submit' }], ly: leagueYear(f) };
  if (legendSide(m)) { const lc = legendCheck(rosterOf(f, club), m); if (lc.conditional) o.replace = lc.replace; }
  fa(f).offers[o.id] = o; e.first ??= periodNow(f); logTx(f, { kind: 'offer', club, mid, id: o.id });
  return { ok: true, offer: o };
}
function lowball(f, m, e, club) {
  const p = personaOf(m); e.patience = Math.max(0, e.patience - Math.round(FA_RULES.lowballCost * (1.2 - p.patience / 100)));
  e.low[club] = (e.low[club] || 0) + 1; if (e.low[club] >= 2 && e.patience <= FA_RULES.insulted) e.refuse[club] = leagueYear(f);
}
/** Revise a live offer: a new version, the same deadline, at most two a period (resolution 4); patience is never restored. */
export function reviseOffer(f, id, terms) {
  const o = fa(f)?.offers?.[id]; if (!o || !['pending', 'countered'].includes(o.state)) return { ok: false, code: 'state', reason: 'That offer is no longer open.' };
  const p = periodNow(f); if (!p) return { ok: false, code: 'closed', reason: 'The market is closed.' };
  if ((o.revisions[p] || 0) >= FA_RULES.revisionsPerPeriod) return { ok: false, code: 'revisions', reason: `${FA_RULES.revisionsPerPeriod} revisions a period at most.` };
  const u = unsigned(f, o.mid); if (!u) return { ok: false, code: 'gone', reason: 'He is no longer on the market.' };
  terms = { salary: toStep(terms.salary), years: clampYears(terms.years), bonus: toStep(terms.bonus || 0) };
  const b = blocker(f, o.club, u.m, terms, { own: o }); if (b) return { ok: false, ...b };
  const e = entryOf(f, u.m); if (rateOffer(f, u.m, o.club, terms).low) lowball(f, u.m, e, o.club);
  Object.assign(o, terms); o.reserved = reservationFor(terms); o.v++; o.state = 'pending'; o.counter = null; o.revisions[p] = (o.revisions[p] || 0) + 1;
  o.history.push({ p, ...terms, act: 'revise' }); logTx(f, { kind: 'revise', club: o.club, mid: o.mid, id });
  return { ok: true, offer: o };
}
/** Accept his counter: the offer takes the countered terms (a revision, at the same deadline). */
export const acceptCounter = (f, id) => { const o = fa(f)?.offers?.[id]; if (!o?.counter || o.state !== 'countered') return { ok: false, code: 'state', reason: 'There is no counter to accept.' }; return reviseOffer(f, id, o.counter); };
export function withdrawOffer(f, id) { const o = fa(f)?.offers?.[id]; if (!o || !close(f, o, 'withdrawn', 'withdrawn')) return { ok: false, reason: 'That offer is no longer open.' }; o.history.push({ p: periodNow(f), act: 'withdraw' }); logTx(f, { kind: 'withdraw', club: o.club, mid: o.mid, id }); return { ok: true }; }
/** The offers on a monster other clubs can see (decision 11): club, terms, state; grounded in real offers only. */
export const competingOffers = (f, mid) => liveOffers(f, (o) => o.mid === mid).map((o) => ({ club: o.club, salary: o.salary, years: o.years, bonus: o.bonus, state: o.state, expires: o.expires }));

/**
 * The tie order (resolution 4): his personality-weighted score, then his strongest single priority, then the saved seeded value,
 * then the club name. Whose club is the player's plays no part.
 */
export function rankOffers(f, m, offers) {
  return offers.map((o) => ({ o, r: rateOffer(f, m, o.club, o) })).sort((a, b) => (b.r.score - a.r.score) || (b.r.parts[b.r.strongest] - a.r.parts[a.r.strongest]) || (b.o.tie - a.o.tie) || (a.o.club < b.o.club ? -1 : a.o.club > b.o.club ? 1 : 0));
}
/** When he is ready to decide: an eager monster at once, a deliberate one waits a period or two (decision 13); a deadline forces it. */
export const decidesAt = (m) => 1 + Math.floor(personaOf(m).timing / 34);

// ------------------------------------------------------------ the signing transaction
/**
 * Sign `m` to `club` on `terms`, atomically: validate (final), take him off the market, add him to the club with the contract,
 * close every other offer on him, note the free-agent lock. Returns { ok, monster } or { ok: false, code, reason }. `offer`: the
 * offer this signing settles (its reservation turns into the cap charge).
 */
export function sign(f, club, mid, terms, { offer = null, via = 'free_agent', start = leagueYear(f), kind = 'fa' } = {}) {
  const u = unsigned(f, mid); if (!u) return { ok: false, code: 'gone', reason: 'He is no longer on the market.' };
  const m = u.m; const b = blocker(f, club, m, terms, { final: true, own: offer }); if (b) return { ok: false, ...b };
  const contract = makeContract({ start, years: terms.years, salary: terms.salary, bonus: terms.bonus || 0, id: offer?.id || `x${++fa(f).seq}`, kind });
  contract.bonusPaid = { by: club, ly: start }; // paid once; no refund on any departure (resolution 6)
  takeUnsigned(f, mid);
  if (offer) { offer.state = 'signed'; offer.reserved = 0; offer.closed = { p: periodNow(f), why: 'signed' }; }
  for (const o of liveOffers(f, (x) => x.mid === mid)) close(f, o, 'rejected', `signed with ${club}`);
  m.salary = contract.salary;
  if (isOwner(f, club)) { m.contract = contract; HOOKS.joinOwner?.(f, m, via, start); }
  else addToClub(f, club, m, { year: start, via: 'signed', contract, salary: contract.salary, source: u.where === 'extra' ? 'pool' : u.where });
  noteSigned(f, m); delete f.freeAgency.market[mid];
  logTx(f, { kind: 'sign', club, mid, salary: contract.salary, years: contract.years, bonus: contract.bonus });
  return { ok: true, monster: m, contract };
}

/**
 * Resolve the market at a period advance (decisions 13, 25, 29; resolution 4). Monsters in id order; each decides when he is ready
 * or a deadline is due; acceptances are made official in that order, each re-checked against the club's state at that moment, so
 * two acceptances on one tick can never oversubscribe a roster or a cap. Returns { signed, countered, rejected, expired }.
 */
export function resolvePeriod(f, { closing = false } = {}) {
  const p = periodNow(f); const out = { signed: [], countered: 0, rejected: 0, expired: 0 };
  const byMonster = new Map(); for (const o of liveOffers(f)) (byMonster.get(o.mid) || byMonster.set(o.mid, []).get(o.mid)).push(o);
  for (const mid of [...byMonster.keys()].sort()) {
    const u = unsigned(f, mid); const offers = byMonster.get(mid);
    if (!u) { for (const o of offers) if (close(f, o, 'rejected', 'gone')) out.rejected++; continue; }
    const m = u.m; const due = closing || offers.some((o) => o.expires <= p); const ready = due || p >= decidesAt(m);
    const ranked = rankOffers(f, m, offers.filter((o) => o.state !== 'countered' || o.v > (o.counterV || 0)));
    let done = false;
    if (ready) for (const { o, r } of ranked) {
      if (r.score < r.need) continue;
      const res = sign(f, o.club, mid, o, { offer: o });
      if (res.ok) { out.signed.push({ club: o.club, mid, name: m.name }); done = true; break; }
      if (res.code === 'legendary' && !(closing || o.expires <= p)) { o.state = 'accepted'; continue; } // waits for the replacement
      if (close(f, o, 'rejected', res.code)) out.rejected++;
    }
    if (done) continue;
    for (const o of offers) {
      if (!LIVE.has(o.state)) continue;
      const atDeadline = closing || o.expires <= p;
      if (atDeadline) { if (close(f, o, 'expired', 'deadline')) out.expired++; continue; }
      if (!ready || o.state !== 'pending') continue;
      const r = rateOffer(f, m, o.club, o);
      if (r.score >= r.need * FA_RULES.counterBand && r.score < r.need) { o.state = 'countered'; o.counter = counterTerms(f, m, o.club, o); o.counterV = o.v; o.history.push({ p, ...o.counter, act: 'counter' }); out.countered++; }
      else if (r.score < r.need * FA_RULES.counterBand && ready && o.round++ >= 2) { if (close(f, o, 'rejected', 'too low')) out.rejected++; }
    }
  }
  return out;
}
/** At each period advance every unsigned monster's wait grows (his ask relaxes by personality, decision 16). */
export function ageMarket(f, by = 1) { for (const { m } of marketList(f)) entryOf(f, m).unsigned += by; }

// ------------------------------------------------------------ immediate negotiation (in season; decision 17)
/**
 * One round, answered at once: { ok, outcome: 'signed' | 'countered' | 'rejected', counter?, reason }. The same validation, the
 * same evaluation and the same signing as the periods. `guaranteed`: a Beast Clash recruit (D5) accepts an offer at his ask.
 */
export function negotiateNow(f, club, mid, terms, { guaranteed = false, via = 'free_agent' } = {}) {
  const u = unsigned(f, mid); if (!u) return { ok: false, code: 'gone', reason: 'He is no longer available.' };
  const m = u.m; terms = { salary: toStep(terms.salary), years: clampYears(terms.years), bonus: toStep(terms.bonus || 0) };
  const b = blocker(f, club, m, terms, { final: true }); if (b) return { ok: false, ...b };
  const e = entryOf(f, m); const r = rateOffer(f, m, club, terms, { guaranteed: guaranteed && terms.salary >= askOf(f, m).salary });
  if (r.low && !guaranteed) lowball(f, m, e, club);
  if (r.score >= r.need) { const s = sign(f, club, mid, terms, { via }); return s.ok ? { ok: true, outcome: 'signed', monster: s.monster, contract: s.contract } : s; }
  if (r.score >= r.need * FA_RULES.counterBand) return { ok: true, outcome: 'countered', counter: counterTerms(f, m, club, terms) };
  return { ok: true, outcome: 'rejected', reason: `${m.name} is looking for more${r.low ? ', and low offers try his patience' : ''}.` };
}

// ------------------------------------------------------------ extensions (decision 23)
/** A contract in its final league year, with nothing signed to follow it. */
export function extensionEligible(f, m) { const c = m?.contract; return !!c && !c.permanent && !c.next && c.ends === leagueYear(f) && !isProtected(m); }
/**
 * Extend `m` (on `club`) from the year after his deal ends. The club's cap in that first new year must hold it. Returns
 * { ok, outcome: 'signed' | 'countered' | 'rejected', counter? } — an extension never touches the running contract.
 */
export function extend(f, club, m, terms) {
  if (!rosterOf(f, club).some((x) => x.id === m.id)) return { ok: false, code: 'roster', reason: 'He is not on the roster.' };
  if (!extensionEligible(f, m)) return { ok: false, code: 'eligible', reason: 'Extensions are offered in a contract’s final season.' };
  terms = { salary: toStep(terms.salary), years: clampYears(terms.years), bonus: toStep(terms.bonus || 0) };
  const start = m.contract.ends + 1; const charge = terms.salary + allocateBonus(terms.bonus, terms.years)[0];
  const room = capOf(f, club) - committed(f, club, start);
  if (charge > room) return { ok: false, code: 'cap', reason: `The extension's first season needs ${charge.toLocaleString('en-US')} cr.; ${start} has ${Math.max(0, room).toLocaleString('en-US')} cr. free.` };
  hasFreeAgency(f) && entryOf(f, m); const r = rateOffer(f, m, club, terms); if (r.low) lowball(f, m, entryOf(f, m), club);
  if (r.score >= r.need) { m.contract.next = makeContract({ start, years: terms.years, salary: terms.salary, bonus: terms.bonus, kind: 'extension' }); m.contract.next.bonusPaid = { by: club, ly: start }; delete f.freeAgency.market[m.id]; logTx(f, { kind: 'extend', club, mid: m.id, salary: terms.salary, years: terms.years }); return { ok: true, outcome: 'signed', contract: m.contract.next }; }
  if (r.score >= r.need * FA_RULES.counterBand) return { ok: true, outcome: 'countered', counter: counterTerms(f, m, club, terms) };
  return { ok: true, outcome: 'rejected' };
}
/** At the turn of the league year, extensions signed to follow a contract take over (salary included). */
export function promoteExtensions(f, ly) {
  let n = 0; const all = [...f.roster, ...(hasLeague(f) ? Object.values(f.league.monsters) : [])];
  for (const m of all) { const x = m.contract?.next; if (x && x.signed === ly) { m.contract = x; m.salary = x.salary; n++; } }
  return n;
}

// ------------------------------------------------------------ integrity (property tests and the soak)
/** Problems with the market's books: reservations, double contracts, duplicate assignment, negative usable cap for new terms. */
export function marketProblems(f) {
  const p = []; if (!hasFreeAgency(f)) return p;
  const held = new Map(); const note = (id, where) => { if (held.has(id)) p.push(`${id} on ${held.get(id)} and ${where}`); else held.set(id, where); };
  for (const m of f.roster) note(m.id, f.club);
  if (hasLeague(f)) for (const c of leagueClubs(f)) for (const m of clubRoster(f, c)) note(m.id, c);
  for (const { m, where } of marketList(f)) { if (held.has(m.id)) p.push(`${m.name} is unsigned (${where}) and on ${held.get(m.id)}`); }
  for (const o of offersOf(f)) {
    if (LIVE.has(o.state) && o.reserved !== reservationFor(o)) p.push(`offer ${o.id}: reservation ${o.reserved} ≠ ${reservationFor(o)}`);
    if (!LIVE.has(o.state) && o.reserved) p.push(`offer ${o.id} (${o.state}) still holds ${o.reserved}`);
    if (LIVE.has(o.state) && !unsigned(f, o.mid)) p.push(`offer ${o.id} is live but ${o.mid} is not on the market`);
  }
  for (const club of allClubs(f)) if (liveOffers(f, (o) => o.club === club).length && usableCap(f, club) < 0 && committed(f, club) <= capOf(f, club)) p.push(`${club}: offers overcommit the cap`);
  return p;
}
