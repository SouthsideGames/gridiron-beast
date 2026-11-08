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
  const vet = mon({ id: 'v', age: 33, q: 60, seed: 3 });
  // Task 8 M1 (fixture drift): the 33-year-old's simulated prior career (B7) now lifts him to 57 against the level-1 youngster's 34;
  // the scenario compares equals, so the veteran gets the youngster's ratings explicitly (same overall; only age and potential differ).
  vet.attributes = { ...young.attributes }; vet.dev.current = { ...young.attributes }; vet.potential = monsterOverall(vet);
  assert.ok(ageingSeasons(vet) > 0 && ageingSeasons(young) === 0);
  assert.ok(strategyValue(young, { mode: 'rebuild' }) > strategyValue(vet, { mode: 'rebuild' }), 'Rebuild: the young prospect');
  const a = mon({ id: 'a', age: 27, q: 62, seed: 9 }); const b = mon({ id: 'b', age: 27, q: 62, seed: 9 });
  b.attributes = { ...a.attributes }; b.dev.current = { ...a.attributes }; b.potential = a.potential; // two equals, explicitly (their ids now give different simulated prior careers, B7: 39 vs 40)
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

function atomicUpgradeCase(seed, { releasedSignedElsewhere = false } = {}) {
  const f = openMarket(seed); const club = leagueClubs(f).slice().sort()[2];
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
    const elsewhere = leagueClubs(f).find((c) => c !== club && clubRoster(f, c).some((m) => m.id === spare.id));
    if (releasedSignedElsewhere) assert.ok(elsewhere, 'the released monster was signed by another club in a later period');
    else assert.ok(E.marketList(f).some((x) => x.m === spare), 'the released monster is on the market');
    assert.ok(elsewhere || E.marketList(f).some((x) => x.m === spare), 'the release went to the market, never vanished');
    assert.equal(E.blocker(f, club, spare, null, { newSpot: false })?.code, 'lock', 'and cannot rejoin this league year');
    assert.ok(E.committed(f, club) <= before + reservationFor(terms), 'no charge left behind');
  } else assert.ok(clubRoster(f, club).includes(spare), 'no signing, no release');
  assert.deepEqual(E.marketProblems(f), []);
  return { signed };
}

test('R1 c: an upgrade that needs a release is atomic — released only when the signing completes, zero dead cap, no return', () => {
  // seed 37: the released monster is still unsigned when free agency ends (Task 8 retired Nature, N7c B14; seed 34 before)
  assert.equal(atomicUpgradeCase(37).signed, true, 'the upgrade completes in this scenario');
});

test('R1 c: an intervening signing elsewhere never makes the release-and-sign partial (the released monster legally signs with another club)', () => {
  // seed 41: another club signs the released monster in a later period (post-history founding selection, N8b D1, 2026-11-08; seed 39
  // before, and 34 before the Task 8 M1 Dex generator; seeds 34–60 searched, 41 and 53 give the intervening signing)
  assert.equal(atomicUpgradeCase(41, { releasedSignedElsewhere: true }).signed, true, 'the upgrade completes in this scenario');
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

test('R6: AI extensions — core monsters only, mid-season (week 6) and at the league year\'s turn; an extended contract does not expire; promoted once', () => {
  const f = newFranchise(37);
  for (let g = 0; g < 30 && f.season.week < 7; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else F.finishSunday(f, F.simulatePlayerGame(f)); }
  const mid = f.freeAgency.steps[f.season.year]?.midExt; assert.ok(mid, 'the mid-season window ran'); assert.ok(mid.offered > 0);
  const extended = leagueClubs(f).flatMap((c) => clubRoster(f, c).filter((m) => m.contract?.next).map((m) => ({ c, m })));
  assert.equal(extended.length, mid.signed);
  for (const { m } of extended) { assert.equal(m.contract.next.signed, m.contract.ends + 1); assert.ok(!isProtected(m)); }
  for (let g = 0; g < 40 && !f.season.finished; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  for (const { c, m } of extended) if (!m.retired) assert.ok(clubRoster(f, c).includes(m) || !m.contract || m.traded, `${m.name} did not walk at expiry`);
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  for (const i of F.offseasonPending(f)) { const r = F.resolveContract(f, i.id, i.kind === 'staff' ? 'sign' : 'sign'); if (r.status === 'countered') F.resolveContract(f, i.id, 'acceptcounter'); }
  for (const i of F.offseasonPending(f)) F.resolveContract(f, i.id, 'walk');
  assert.ok(F.openFreeAgency(f).ok);
  for (const { c, m } of extended) if (clubRoster(f, c).includes(m)) { assert.equal(m.contract.kind, 'extension', 'promoted at the turn'); assert.ok(!m.contract.next || m.contract.ends === f.freeAgency.leagueYear, 'a further extension only in its final season'); }
  assert.ok(f.freeAgency.steps[f.season.year].ext, 'the offseason window ran');
  assert.deepEqual(E.marketProblems(f), []);
});

test('R3: the renewal outlook is the extension evaluation itself (Interested / Listening / Not interested), only in a final season; the GM Assistant only recommends', async () => {
  const UI = await import('../src/ui/fa-ui.js');
  const f = newFranchise(38); f.settings.gmAssistant = true; let n = 0;
  for (const m of f.roster) {
    const o = UI.renewalOutlook(f, m);
    if (!E.extensionEligible(f, m)) { assert.equal(o, null); continue; }
    const neg = F.extensionTalks(f, m.id); // the negotiation he would open now (owner 2026-11-05, 13:23): his talk decision and opening demand
    assert.equal(o.label, neg.state !== 'active' ? 'Not interested' : E.askOf(f, m).salary / neg.demand.salary >= 1 / 1.05 ? 'Interested' : 'Listening'); n++;
    assert.deepEqual(o.terms, neg.demand);
  }
  assert.ok(n > 3, `${n} final-season contracts`);
  const before = JSON.stringify(f.roster.map((m) => m.contract));
  const html = UI.extensionAdviceHtml(f); assert.match(html, /recommendations only/); assert.equal(JSON.stringify(f.roster.map((m) => m.contract)), before, 'advice changes nothing');
  f.settings.gmAssistant = false; assert.equal(UI.extensionAdviceHtml(f), '', 'optional');
});

test('R5: lineup warnings name the slot, the position, the formation, why, and the fix; nobody is substituted out of position', () => {
  const f = newFranchise(39); assert.deepEqual(F.lineupWarnings(f), [], 'a full roster has no warning');
  const cbs = f.roster.filter((m) => m.position === 'CB'); f.roster = f.roster.filter((m) => m.position !== 'CB' || m === cbs[0]); // one cornerback left
  const w = F.lineupWarnings(f); const base = w.find((x) => x.kind === 'base' && x.position === 'CB');
  assert.ok(base, JSON.stringify(w)); assert.equal(base.severity, 'forfeit'); assert.match(base.why, /1 healthy CB/); assert.match(base.fix, /CB/);
  const g = newFranchise(40); const s = g.roster.filter((m) => m.position === 'S'); g.roster = g.roster.filter((m) => m.position !== 'S' || m === s[0]); // one safety: FS is filled, the Nickel slot (SS) is not
  const pk = F.lineupWarnings(g).find((x) => x.kind === 'package'); assert.ok(pk, JSON.stringify(F.lineupWarnings(g))); assert.match(pk.formation, /Nickel/); assert.equal(pk.position, 'S');
});
