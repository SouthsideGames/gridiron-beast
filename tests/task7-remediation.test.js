// Task 7 remediation (owner approval 2026-11-05): R1 AI free-agency strategy, R4 gym element preference, R6 bonuses and extensions.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as E from '../src/franchise/fa-engine.js';
import * as AI from '../src/franchise/fa-ai.js';
import { strategyValue, worthPursuing, ageingSeasons } from '../src/franchise/fa-strategy.js';
import { generateMonster, ROSTER_MAX, monsterOverall } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';
import { leagueClubs, clubRoster, addToClub, isProtected } from '../src/franchise/league-registry.js';
import { clubNeeds, generateArrival } from '../src/franchise/league-season.js';
import { GYM_BY_CLUB } from '../src/data/gyms.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { reservationFor } from '../src/franchise/fa-contracts.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

function openMarket(seed = 31) { const f = newFranchise(seed); f.season.finished = true; f.offseason = null; const r = F.openFreeAgency(f); assert.ok(r.ok, r.reason); return f; }
const mon = (o) => { const m = generateMonster(createRng(o.seed || 5), { position: o.pos || 'WR', quality: o.q || 60, age: o.age || 25, id: o.id || 'x' }); if (o.pot != null) m.potential = o.pot; return m; };

test('R1 b: strategy value — Rebuild favours youth and potential, Contend readiness, Compete affordability; never overall alone', () => {
  const young = mon({ id: 'y', age: 22, q: 60, seed: 3 }); young.potential = monsterOverall(young) + 15;
  const vet = mon({ id: 'v', age: 33, q: 60, seed: 3 }); vet.potential = monsterOverall(vet);
  assert.ok(ageingSeasons(vet) > 0 && ageingSeasons(young) === 0);
  assert.ok(strategyValue(young, { mode: 'rebuild' }) > strategyValue(vet, { mode: 'rebuild' }), 'Rebuild: the young prospect');
  const a = mon({ id: 'a', age: 27, q: 62, seed: 9 }); const b = mon({ id: 'b', age: 27, q: 62, seed: 9 });
  assert.ok(strategyValue(a, { mode: 'compete', ask: 20000 }) > strategyValue(b, { mode: 'compete', ask: 50000 }), 'Compete: the cheaper of two equals');
  assert.equal(strategyValue(a, { mode: 'contend', ask: 20000 }), strategyValue(b, { mode: 'contend', ask: 50000 }), 'Contend: cost does not decide');
  assert.ok(strategyValue(a, { mode: 'contend', weakestStarter: monsterOverall(a) - 1 }) > strategyValue(a, { mode: 'contend', weakestStarter: monsterOverall(a) + 1 }), 'Contend: readiness');
  assert.equal(worthPursuing(vet, { mode: 'rebuild' }), false); assert.equal(worthPursuing(young, { mode: 'rebuild' }), true);
});

test('R1 a: before the draft an AI club bids only for urgent lineup holes and its R5 upgrade (no depth offers)', () => {
  for (const seed of [31, 32, 33]) {
    const f = openMarket(seed);
    for (const o of E.liveOffers(f, (x) => x.club !== f.club)) {
      if (o.upgrade) continue; const m = E.unsigned(f, o.mid)?.m; assert.ok(m);
      const urgent = clubNeeds(f, o.club).filter(([, , u]) => u).map(([p]) => p);
      assert.ok(urgent.includes(m.position), `${o.club} bid for ${m.position} with no urgent hole there (${urgent})`);
    }
    for (let p = 0; p < 5 && F.freeAgencyOpen(f); p++) { F.advanceFreeAgency(f); assert.deepEqual(E.marketProblems(f), [], 'parity: every AI offer passes the shared validation'); }
  }
});

test('R1 c: an upgrade that needs a release is atomic — released only when the signing completes, zero dead cap, no return', () => {
  const f = openMarket(34); const club = leagueClubs(f).slice().sort()[2];
  const roster = clubRoster(f, club); let i = 0; while (clubRoster(f, club).length < ROSTER_MAX) addToClub(f, club, Object.assign(mon({ id: `pad${i}`, pos: 'OL', q: 45, seed: 40 + i++ }), { contract: { signed: 1, ends: 3, years: 2 }, salary: 20000 }), { year: 1 });
  const spare = clubRoster(f, club).find((m) => m.id.startsWith('pad')) || clubRoster(f, club).filter((m) => !isProtected(m) && !m.legendary && clubRoster(f, club).filter((x) => x.position === m.position).length > 3).sort((a, b) => monsterOverall(a) - monsterOverall(b))[0]; assert.ok(spare);
  const target = E.marketList(f).map((x) => x.m).find((m) => !E.liveOffers(f, (o) => o.club === club && o.mid === m.id).length && !m.legendary && !m.injury); assert.ok(target, 'a free agent');
  assert.equal(E.submitOffer(f, club, target.id, { salary: E.askOf(f, target).salary, years: 1 }).code, 'roster', 'no place without a release');
  const terms = { salary: Math.ceil(E.askOf(f, target).salary * 1.4 / 100) * 100, years: E.askOf(f, target).years };
  const r = E.submitOffer(f, club, target.id, terms, { release: spare.id }); assert.ok(r.ok, r.reason); assert.equal(r.offer.release, spare.id);
  assert.ok(clubRoster(f, club).includes(spare), 'nobody released while the offer is pending');
  const before = E.committed(f, club);
  F.finishFreeAgency(f);
  const signed = clubRoster(f, club).some((m) => m.id === target.id);
  if (signed) {
    assert.ok(!clubRoster(f, club).includes(spare), 'released with the signing'); assert.equal(clubRoster(f, club).length, ROSTER_MAX);
    assert.ok(E.marketList(f).some((x) => x.m === spare), 'the released monster is on the market');
    assert.equal(E.blocker(f, club, spare, null, { newSpot: false })?.code, 'lock', 'and cannot rejoin this league year');
    assert.ok(E.committed(f, club) <= before + reservationFor(terms), 'no charge left behind');
  } else assert.ok(clubRoster(f, club).includes(spare), 'no signing, no release');
  assert.deepEqual(E.marketProblems(f), []);
});

test('R1 d / R6: priority terms satisfy him or are null; a bonus keeps his valuation for less cap, within the limit', () => {
  const f = openMarket(35); const club = leagueClubs(f).slice().sort()[0];
  let checked = 0, bonuses = 0;
  for (const { m } of E.marketList(f).slice(0, 40)) {
    const base = AI.aiTerms(f, club, m, null); const t = AI.priorityTerms(f, club, m, base);
    if (t) { const r = E.rateOffer(f, m, club, t); assert.ok(r.score >= r.need - 1e-9, 'priority terms satisfy him'); checked++; }
    const b = AI.bonusTerms(f, m, { salary: base.salary, years: 3, bonus: 0 });
    if (b.bonus) { bonuses++; assert.ok(reservationFor(b) < reservationFor({ salary: base.salary, years: 3, bonus: 0 }), 'less cap');
      assert.ok(E.rateOffer(f, m, club, b).score >= E.rateOffer(f, m, club, { salary: base.salary, years: 3, bonus: 0 }).score - 0.002, 'the same value to him');
      assert.ok(b.bonus <= E.FA_RULES.bonusMax * (b.salary * 3 + b.bonus)); }
  }
  assert.ok(checked > 5 && bonuses > 0, `${checked} ${bonuses}`);
});

test('R4: a gym\'s generated arrival is of its element when the element has a species at the position; positions never change', () => {
  const f = newFranchise(36); const r = createRng(7);
  for (const g of Object.values(GYM_BY_CLUB)) for (const pos of ['QB', 'OL', 'K', 'DL']) {
    const own = SPECIES_DEX.filter((s) => s.element === g.element && s.position === pos && s.rarity !== 'legendary');
    const m = generateArrival(f, r, { club: g.club, position: pos, quality: 60, room: 1e9 }); if (!m) continue;
    assert.equal(m.position, pos);
    if (own.length) assert.equal(m.type, g.element, `${g.club} ${pos}`);
    assert.equal(SPECIES_DEX.find((s) => s.id === m.species).position, pos, 'the family position');
  }
});
