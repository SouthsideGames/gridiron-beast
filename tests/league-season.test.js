// The league's season transition (GDD §42.6, Phase 3): protected monsters never age, move or cost cap; the rival's signature
// grows within his caps; contracts re-sign or walk; the cap trims only the unprotected; free agency fills every club legally
// after the owner; the nudge brakes runaway clubs and lifts weak ones without editing a rating; three seasons keep every
// protected monster where he started.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/franchise/league-registry.js';
import * as S from '../src/franchise/league-season.js';
import { offseason } from '../src/franchise/progression.js';
import { newFranchise, runFranchise } from '../tools/franchise-soak.mjs';
import { leagueInvariants } from '../tools/league-soak.mjs';
import { createRng } from '../src/core/rng.js';
import { monsterOverall, generateMonster, ROSTER_MAX, ROSTER_MIN } from '../src/data/monsters.js';
import { ALL_TEAMS, tierById } from '../src/data/league.js';
import { teamOverall } from '../src/franchise/roster.js';

const clubsOf = (f) => ALL_TEAMS.filter((t) => t !== f.club);
const snap = (m) => JSON.stringify({ age: m.age, attributes: m.attributes, potential: m.potential });

test('ageing: legendaries (the owner\'s too) and the rival\'s signature monster never age or decline; everyone else does; experience still counts', () => {
  const f = newFranchise(31); const rng = createRng(3);
  const rival = f.rivals[f.tier].team; const sig = R.clubRoster(f, rival).find((m) => m.signature);
  const gymClub = clubsOf(f).find((c) => R.clubRoster(f, c).some((m) => m.legendary)); const leg = R.clubRoster(f, gymClub).find((m) => m.legendary);
  const mine = generateMonster(rng, { species: 'pyroclast', position: 'QB', quality: 64 }); mine.age = 31; f.roster.push(mine); // an owner-held legendary species
  assert.ok(R.isLegendaryMonster(mine) && R.isAgeless(mine) && !R.isProtected(mine), 'ageless, but the owner manages him like any monster');
  const old = f.roster.find((m) => m !== mine && m.age >= 30) || Object.assign(f.roster.find((m) => m !== mine), { age: 31 });
  const before = { sig: snap(sig), leg: snap(leg), mine: snap(mine), oldSpeed: old.attributes.speed, sigYears: sig.yearsPro, sigAge: sig.age };
  sig.age = 34; leg.age = 35; // age itself is irrelevant to them
  offseason([sig, leg, mine, old], rng);
  assert.equal(sig.age, 34); assert.equal(leg.age, 35); assert.equal(mine.age, 31);
  assert.equal(JSON.stringify(sig.attributes), JSON.parse(before.sig).attributes && JSON.stringify(JSON.parse(before.sig).attributes));
  assert.equal(JSON.stringify(leg.attributes), JSON.stringify(JSON.parse(before.leg).attributes));
  assert.equal(JSON.stringify(mine.attributes), JSON.stringify(JSON.parse(before.mine).attributes));
  assert.equal(sig.yearsPro, before.sigYears + 1, 'a season of experience still counts');
  assert.ok(old.attributes.speed < before.oldSpeed || old.age === 31, 'an ordinary veteran aged and declined'); assert.equal(old.age, 32);
});

test('signature growth: +2 a season on what his position uses, never past his potential, never beyond 99', () => {
  const f = newFranchise(32); const rival = f.rivals[f.tier].team; const sig = R.clubRoster(f, rival).find((m) => m.signature);
  const o0 = monsterOverall(sig); const got = S.growSignature(sig); assert.equal(got, 2); assert.ok(monsterOverall(sig) >= o0);
  for (const k of Object.keys(sig.attributes)) assert.ok(sig.attributes[k] <= 99);
  for (const k of Object.keys(sig.attributes)) sig.attributes[k] = sig.potential; // at his ceiling
  assert.equal(S.growSignature(sig), 0, 'nothing past the potential');
  for (const k of Object.keys(sig.attributes)) assert.equal(sig.attributes[k], sig.potential);
});

test('contracts: expiring starters and value re-sign at the ask, reserves walk to the pools, nobody protected is touched, the cap trims unprotected reserves only', () => {
  const f = newFranchise(33); const cap = tierById(f.tier).cap; const year = 1;
  const clubs = clubsOf(f); const prot = clubs.flatMap((c) => R.clubRoster(f, c).filter(R.isProtected).map((m) => [c, m.id, snap(m)]));
  const club = clubs[1]; const roster = R.clubRoster(f, club);
  for (const m of roster) if (!R.isProtected(m)) { m.contract = { signed: 0, ends: year, years: 2 }; m.salary = m.salary * 1.6; } // everyone expiring, and the club well over the cap
  const prot1 = roster.find(R.isProtected); if (prot1) prot1.salary = 2_000_000;
  const out = S.leagueContracts(f, { year, cap }); assert.ok(out.resigned > 0 && out.walked > 0);
  const after = R.clubRoster(f, club); assert.ok(after.length >= ROSTER_MIN && after.length < roster.length);
  assert.ok(R.clubCapRoom(f, club, cap) >= 0 || after.length === ROSTER_MIN, 'under the cap, or at the roster floor');
  for (const m of after) if (!R.isProtected(m)) assert.ok(m.contract.ends > year, 're-signed for two more seasons');
  for (const [c, id, s0] of prot) { const m = R.clubRoster(f, c).find((x) => x.id === id); assert.ok(m, `${id} still on ${c}`); assert.equal(snap(m), s0); assert.equal(m.contract.permanent, true); }
  assert.ok(Object.values(f.pool).flat().some((m) => (m.history || []).some((h) => h.club === club && h.reason === 'walked')));
  assert.deepEqual(R.verifyLeague(f), []);
});

test('free agency after the owner fills every club legally under the cap: pools first, then regional veterans near the target; the nudge lifts the weak and brakes the strong', () => {
  const f = newFranchise(34); const cap = tierById(f.tier).cap; const year = 2; const r = createRng(9);
  const clubs = clubsOf(f); const weak = clubs[0], strong = clubs[1];
  for (const m of R.clubRoster(f, weak).filter((x) => !R.isProtected(x)).slice(0, 14)) R.removeFromClub(f, weak, m.id, { year, reason: 'walked' }); // 24 left: short of a legal roster
  const pooled = Object.values(f.pool).flat().length; const generatedBefore = f.league.ids.split(' ').length;
  const fa = S.leagueFreeAgency(f, r, { year, cap, targetOf: (c) => F.clubQuality(f, c, year) });
  assert.ok(fa.fromPools + fa.generated > 0);
  assert.deepEqual(S.validateClubs(f, { cap }), []);
  assert.equal(R.clubRoster(f, weak).length, ROSTER_MAX, 'back to the full 38');
  assert.ok(f.league.ids.split(' ').length > generatedBefore, 'generated arrivals were issued ids'); assert.ok(Object.values(f.pool).flat().length <= pooled);
  // the nudge: measured against a target; no existing rating changes
  const ratings = Object.fromEntries(clubs.flatMap((c) => R.clubRoster(f, c).map((m) => [m.id, JSON.stringify(m.attributes)])));
  const target = (c) => (c === weak ? 99 : c === strong ? 1 : teamOverall(F.aiTeam(f, c, year)));
  const nudge = S.leagueNudge(f, r, { year, cap, targetOf: (c) => F.clubQuality(f, c, year) + 10, teamOf: (c) => F.aiTeam(f, c, year) });
  // (targets for the band come from the caller; here: weak far below, strong far above)
  const n2 = S.leagueNudge(f, r, { year, cap, targetOf: target, teamOf: (c) => F.aiTeam(f, c, year) });
  assert.ok(n2.boosted.includes(weak)); assert.ok(n2.slowed.includes(strong)); assert.ok(R.clubRecord(f, strong).strategy.slow > 0); assert.equal(R.clubRecord(f, weak).strategy.boost, S.NUDGE_SIGNINGS);
  for (const c of clubs) for (const m of R.clubRoster(f, c)) if (ratings[m.id]) assert.equal(JSON.stringify(m.attributes), ratings[m.id], `${m.name}: no rating edited`);
  assert.deepEqual(S.validateClubs(f, { cap }), []); assert.deepEqual(R.verifyLeague(f), []);
  assert.equal(F.slowScale(0), 1); assert.ok(F.slowScale(1) < 1 && F.slowScale(5) < F.slowScale(1));
  void nudge;
});

test('three seasons: every protected monster stays on his club with his id and age; the rival\'s signature gains each offseason; rosters, cap and ids hold every week', () => {
  const f0 = newFranchise(35, { difficulty: 'rookie' }); const clubs = clubsOf(f0);
  const start = Object.fromEntries(clubs.flatMap((c) => R.clubRoster(f0, c).filter(R.isProtected).map((m) => [m.id, { club: c, age: m.age, name: m.name }])));
  const rival = f0.rivals[f0.tier].team; const sig0 = R.clubRoster(f0, rival).find((m) => m.signature); const o0 = monsterOverall(sig0);
  const { f, problems } = runFranchise(35, { seasons: 3, difficulty: 'rookie', check: leagueInvariants });
  assert.deepEqual(problems, []);
  for (const [id, s] of Object.entries(start)) { const m = R.clubRoster(f, s.club).find((x) => x.id === id); assert.ok(m, `${s.name} still on ${s.club}`); assert.equal(m.age, s.age, `${s.name} did not age`); assert.equal(m.contract.permanent, true); }
  const sig = R.clubRoster(f, rival).find((m) => m.signature); assert.equal(sig.id, sig0.id); assert.ok(monsterOverall(sig) > o0, 'the signature monster is stronger than at the start');
  assert.ok(sig.stats.seasons.length >= 2 && sig.stats.career.reg.games > 0, 'his books carried across seasons');
  assert.ok(Object.values(f.league.monsters).every((m) => m.yearsPro >= 0 && (R.isAgeless(m) || m.age >= 19)));
  assert.ok(f.leagueOffseason?.contracts, 'the season end settled the AI contracts (the next start would add free agency and the nudge)');
});
