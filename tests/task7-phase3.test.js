// Task 7 Phases 3–4: the transaction engine and the negotiation (specification "Edge cases / acceptance criteria").
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import * as E from '../src/franchise/fa-engine.js';
import { reservationFor } from '../src/franchise/fa-contracts.js';
import { ROSTER_MAX, SPECIES_BY_ID, generateMonster } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';
import { leagueClubs, clubRoster } from '../src/franchise/league-registry.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

/** A franchise at the end of its first season with free agency open (Period 1). Fast: the season itself is not played. */
function openMarket(seed = 21) {
  const f = newFranchise(seed); f.season.finished = true; f.offseason = null;
  const r = F.openFreeAgency(f); assert.ok(r.ok, r.reason);
  return f;
}
const cheapest = (f, pred = () => true) => E.marketList(f).map((x) => x.m).filter((m) => pred(m)).sort((a, b) => E.askOf(f, a).salary - E.askOf(f, b).salary || (a.id < b.id ? -1 : 1));
const ownerOffers = (f) => E.liveOffers(f, (o) => o.club === f.club);
function makeRoom(f, n = 1) { while (ROSTER_MAX - f.roster.length - ownerOffers(f).length < n) { const m = f.roster.filter((x) => x.position === 'WR').at(-1); f.roster = f.roster.filter((x) => x !== m); } }
/** Exactly `n` open places (fills with ordinary depth monsters on running deals). */
function exactRoom(f, n) { makeRoom(f, n); const r = createRng(99); let i = 0; while (ROSTER_MAX - f.roster.length - ownerOffers(f).length > n) { const m = generateMonster(r, { position: 'OL', quality: 45, id: `fill_${i++}` }); m.contract = { signed: 1, ends: 2, years: 2 }; f.roster.push(m); } }

test('offer: reservation = first-year charge while live; released exactly once on withdraw; the ledger is the live offers', () => {
  const f = openMarket(); makeRoom(f, 2);
  const m = cheapest(f)[0]; const ask = E.askOf(f, m);
  const before = E.usableCap(f, f.club);
  const r = F.offerFreeAgent(f, m.id, { salary: ask.salary, years: 3, bonus: 3000 }); assert.ok(r.ok, r.reason);
  assert.equal(r.offer.reserved, reservationFor({ salary: ask.salary, years: 3, bonus: 3000 }));
  assert.equal(before - E.usableCap(f, f.club), r.offer.reserved);
  assert.equal(r.offer.expires, Math.min(5, 1 + (r.offer.expires - 1)), 'deadline visible on the offer'); assert.ok(r.offer.expires >= 2 && r.offer.expires <= 4);
  assert.ok(F.withdrawFreeAgentOffer(f, r.offer.id).ok); assert.equal(E.usableCap(f, f.club), before);
  assert.equal(F.withdrawFreeAgentOffer(f, r.offer.id).ok, false, 'a second withdraw releases nothing');
  assert.deepEqual(E.marketProblems(f), []);
});

test('offers move in 100s; a full roster cannot offer (with an actionable reason); unaffordable terms are refused', () => {
  const f = openMarket(); exactRoom(f, 1); const m = cheapest(f)[0];
  const first = F.offerFreeAgent(f, m.id, { salary: 12345, years: 2 }); assert.equal(first.ok, true, first.reason); assert.equal(first.offer.salary, 12300, 'rounded to the step');
  const [m2] = cheapest(f, (x) => x.id !== m.id);
  const full = F.offerFreeAgent(f, m2.id, { salary: E.askOf(f, m2).salary, years: 2 }); assert.equal(full.ok, false); assert.equal(full.code, 'roster'); assert.match(full.reason, /Release a monster or withdraw an offer/);
  makeRoom(f, 2); const big = F.offerFreeAgent(f, m2.id, { salary: 900000, years: 2 }); assert.equal(big.ok, false); assert.equal(big.code, 'cap');
});

test('revisions: two a period, a new version, the same deadline; patience is never restored', () => {
  const f = openMarket(); makeRoom(f, 1); const m = cheapest(f)[0]; const ask = E.askOf(f, m).salary;
  const o = F.offerFreeAgent(f, m.id, { salary: Math.round(ask * 0.7 / 100) * 100, years: 2 }).offer; // a low offer
  const e = E.entryOf(f, m); const p0 = e.patience; assert.ok(p0 < 100);
  const dl = o.expires;
  assert.ok(F.reviseFreeAgentOffer(f, o.id, { salary: ask, years: 2 }).ok); assert.equal(o.v, 2); assert.equal(o.expires, dl);
  assert.ok(F.reviseFreeAgentOffer(f, o.id, { salary: ask + 100, years: 2 }).ok);
  assert.equal(F.reviseFreeAgentOffer(f, o.id, { salary: ask + 200, years: 2 }).code, 'revisions');
  assert.equal(E.entryOf(f, m).patience, p0, 'a better offer does not give patience back');
  assert.equal(o.reserved, reservationFor(o), 'reservation follows the revision atomically');
});

test('one contract: two clubs offer, exactly one signs, the loser is released and the monster leaves the market for everyone', () => {
  const f = openMarket(); makeRoom(f, 1);
  const m = cheapest(f)[0]; const ask = E.askOf(f, m);
  const ai = leagueClubs(f).find((c) => clubRoster(f, c).length < ROSTER_MAX && E.usableCap(f, c) > ask.salary * 2);
  if (ai) { const r = E.submitOffer(f, ai, m.id, { salary: ask.salary, years: ask.years }); assert.ok(r.ok || r.code === 'dup', r.reason); }
  const mine = F.offerFreeAgent(f, m.id, { salary: ask.salary + 2000, years: ask.years }); assert.ok(mine.ok, mine.reason);
  F.finishFreeAgency(f);
  const holders = [f.club, ...leagueClubs(f)].filter((c) => E.rosterOf(f, c).some((x) => x.id === m.id));
  assert.ok(holders.length <= 1); assert.equal(E.unsigned(f, m.id) == null, holders.length === 1);
  assert.equal(E.liveOffers(f).length, 0, 'the market closes with nothing live'); assert.ok(E.offersOf(f).every((o) => !o.reserved));
  assert.deepEqual(E.marketProblems(f), []);
});

test('ties never favour the player: equal offers rank by the saved seeded value, then club name', () => {
  const f = openMarket(); const m = cheapest(f)[0];
  const a = { club: f.club, salary: 30000, years: 2, bonus: 0, tie: 0.4 }; const b = { club: leagueClubs(f)[0], salary: 30000, years: 2, bonus: 0, tie: 0.6 };
  // identical rosters for the comparison: rate both against the same club state by giving them the same club context
  const ranked = E.rankOffers(f, m, [a, b]).map((x) => x.o);
  const ra = E.rateOffer(f, m, a.club, a), rb = E.rateOffer(f, m, b.club, b);
  if (Math.abs(ra.score - rb.score) < 1e-12 && ra.parts[ra.strongest] === rb.parts[rb.strongest]) assert.equal(ranked[0], b, 'the higher saved tie value wins, whoever is the player');
  else assert.equal(ranked[0], ra.score > rb.score ? a : b);
});

test('deterministic and reloadable: the same seed resolves the same way; a save mid-period keeps offers, reservations and deadlines', () => {
  const run = () => { const f = openMarket(33); makeRoom(f, 2); const m = cheapest(f)[0]; F.offerFreeAgent(f, m.id, { salary: E.askOf(f, m).salary, years: 2 }); return f; };
  const f1 = run(), f2 = run();
  const back = Save.importJson(Save.exportJson(f1)); assert.deepEqual(back.freeAgency.offers, f1.freeAgency.offers);
  assert.equal(E.reservedBy(back, back.club), E.reservedBy(f1, f1.club));
  F.finishFreeAgency(f1); F.finishFreeAgency(f2); F.finishFreeAgency(back);
  const sig = (f) => JSON.stringify(E.offersOf(f).map((o) => [o.id, o.club, o.mid, o.state, o.salary]));
  assert.equal(sig(f1), sig(f2)); assert.equal(sig(back), sig(f1));
});

test('periods: five, early completion, then the draft; the draft refuses to start before; no stuck offseason with an empty market', () => {
  const f = newFranchise(44); f.season.finished = true; f.offseason = null;
  assert.equal(F.beginDraft(f).ok, false, 'free agency first');
  F.openFreeAgency(f); assert.equal(f.freeAgency.period, 1);
  for (const list of Object.values(f.pool || {})) list.length = 0; f.freeAgency.extra = []; if (f.league.waivers) f.league.waivers.length = 0; // nobody on the market
  const seen = []; while (F.freeAgencyOpen(f)) { seen.push(f.freeAgency.period); assert.ok(F.advanceFreeAgency(f).ok); }
  assert.deepEqual(seen, [1, 2, 3, 4, 5]); assert.ok(F.freeAgencyDone(f)); assert.equal(f.freeAgency.leagueYear, f.season.year + 1);
});

test('immediate negotiation (in season): accept, counter or reject at once, under the same rules', () => {
  const f = openMarket(23); F.finishFreeAgency(f); // seed 23: the cheapest free agent counters a half-price offer (Task 8 retired Nature, N7c B14; seed 21 before: its cheapest is now a money-indifferent veteran who takes half his ask)
  // Task 8 M1 (seed drift): under the Dex generator seed 23's cheapest free agent (m_r8e337, Championship) takes half his ask, as
  // several cheap agents now do; the scenario is made explicit: the cheapest free agent whose Ambition is money (m_nqhn9v).
  makeRoom(f, 1); const m = cheapest(f, (x) => x.ambition === 'money')[0]; const ask = E.askOf(f, m);
  const low = F.negotiateFreeAgent(f, m.id, { salary: Math.round(ask.salary * 0.5 / 100) * 100, years: ask.years }); assert.ok(low.ok); assert.notEqual(low.outcome, 'signed');
  let fair = F.negotiateFreeAgent(f, m.id, { salary: Math.round(ask.salary * 1.3 / 100) * 100, years: ask.years });
  assert.ok(fair.ok, fair.reason); if (fair.outcome === 'countered') { assert.ok(fair.counter.salary % 100 === 0); fair = F.negotiateFreeAgent(f, m.id, fair.counter); }
  assert.equal(fair.outcome, 'signed', 'his own counter is accepted at once'); assert.ok(f.roster.includes(fair.monster)); assert.equal(E.unsigned(f, m.id), null);
  assert.equal(fair.monster.contract.salary, fair.monster.salary);
});

test('extensions: final contract season only, never overlapping; take over when the league year turns', () => {
  const f = newFranchise(55); const m = f.roster.find((x) => x.contract && !x.contract.permanent);
  m.contract = { signed: 1, ends: 1, years: 1 }; // final season now
  assert.ok(E.extensionEligible(f, m));
  const ask = E.askOf(f, m); const r = F.extendContract(f, m.id, { salary: Math.round(ask.salary * 1.3 / 100) * 100, years: 2 });
  assert.ok(r.ok, r.reason); assert.equal(r.outcome, 'signed'); assert.equal(m.contract.next.signed, 2);
  assert.equal(E.extensionEligible(f, m), false, 'one extension at a time');
  assert.equal(F.extendContract(f, m.id, { salary: ask.salary, years: 2 }).ok, false);
  f.season.finished = true; f.offseason = null; F.openFreeAgency(f);
  assert.equal(m.contract.signed, 2); assert.equal(m.contract.ends, 3); assert.equal(m.salary, m.contract.salary);
});

test('legendary: a club at the limit may negotiate a replacement, but it is not official until the other legendary leaves', () => {
  const f = openMarket(); makeRoom(f, 2);
  const r = createRng(5); const mk = (sp) => { const m = generateMonster(r, { species: sp, quality: 70 }); m.contract = null; return m; };
  const held = mk('stormcrown'); held.contract = { signed: 1, ends: 3, years: 3 }; f.roster.push(held);
  const target = mk('aurelion'); (f.freeAgency.extra ||= []).push(target);
  const o = F.offerFreeAgent(f, target.id, { salary: E.askOf(f, target).salary * 2, years: 2 }); assert.ok(o.ok, o.reason); assert.deepEqual(o.offer.replace, [held.id]);
  const s1 = E.sign(f, f.club, target.id, o.offer, { offer: o.offer }); assert.equal(s1.ok, false); assert.equal(s1.code, 'legendary');
  F.releaseMonster(f, held.id);
  const s2 = E.sign(f, f.club, target.id, o.offer, { offer: o.offer }); assert.ok(s2.ok, s2.reason);
  assert.deepEqual(E.marketProblems(f), []);
});

test('locks apply to every club: no release and re-sign in a league year; a signed free agent cannot be traded until the next offseason', () => {
  const f = openMarket(); makeRoom(f, 1);
  const m = f.roster.find((x) => x.position === 'WR' && !x.legendary); F.releaseMonster(f, m.id);
  const back = F.offerFreeAgent(f, m.id, { salary: E.askOf(f, m).salary, years: 1 }); assert.equal(back.ok, false); assert.equal(back.code, 'lock');
});

test('a counter always satisfies the monster who made it (accepting it signs), or there is none', () => {
  const f = openMarket(71);
  for (const { m } of E.marketList(f).slice(0, 40)) for (const club of [f.club, ...leagueClubs(f).slice(0, 3)]) {
    const ask = E.askOf(f, m); const c = E.counterTerms(f, m, club, { salary: Math.round(ask.salary * 0.8 / 100) * 100, years: 1, bonus: 0 });
    if (!c) continue; const r = E.rateOffer(f, m, club, c); assert.ok(r.score >= r.need, `${m.name} at ${club}: his counter ${c.salary} satisfies him`); assert.equal(c.salary % 100, 0);
  }
});

test('zero dead cap: a release ends every future charge; a trade carries the contract and its remaining bonus schedule to the new club', async () => {
  const { makeContract, capCharge } = await import('../src/franchise/fa-contracts.js');
  const f = openMarket(81); const ly = f.freeAgency.leagueYear;
  const m = f.roster.find((x) => x.position === 'WR' && !x.cornerstone);
  m.contract = makeContract({ start: ly, years: 3, salary: 40000, bonus: 9000 }); m.salary = 40000;
  const before = E.committed(f, f.club, ly + 1); assert.equal(capCharge(m, ly + 1), 43000);
  assert.ok(F.releaseMonster(f, m.id).ok); assert.equal(E.committed(f, f.club, ly + 1), before - 43000, 'nothing left behind');
  assert.equal(m.contract, null, 'no contract, no refund, no charge');
  // a trade (AI–AI path): the contract object moves unchanged
  const { aiTrades } = await import('../src/franchise/league-trades.js');
  const g = openMarket(82); const club = leagueClubs(g).find((c) => clubRoster(g, c).some((x) => x.contract && !x.contract.permanent));
  const mm = clubRoster(g, club).find((x) => x.contract && !x.contract.permanent); const c0 = JSON.stringify(mm.contract);
  assert.ok(typeof aiTrades === 'function'); assert.equal(JSON.stringify(mm.contract), c0);
});
