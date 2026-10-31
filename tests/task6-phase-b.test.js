// Task 6 Phase B: the AI clubs' roster plan (R1 / D15), contracts (R3), successor protection in cap trims, successor valuation
// (R6 / T3) and need-aware drafting (R7). Owner's Group 3 decisions of 2026-10-30; docs/TASK6_APPROVED_SPECIFICATION.md §1.8.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rosterPlan, leagueBench, horizonOf, qualifiesAsSuccessor, successorShare, draftNeedBonus, groupSuccession, PLAN } from '../src/franchise/roster-plan.js';
import { contractLength, leagueContracts, leagueBenchOf, successorIds, RESERVE_PAST_ONSET } from '../src/franchise/league-season.js';
import { rosterWorth, successorPremium, marketValue } from '../src/franchise/trade-value.js';
import { aiDraftPick } from '../src/franchise/draft.js';
import { publicOnset } from '../src/data/aging.js';
import * as R from '../src/franchise/league-registry.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { createRng } from '../src/core/rng.js';
import { generateMonster, monsterOverall } from '../src/data/monsters.js';
import { ALL_TEAMS, tierById } from '../src/data/league.js';

let n = 0;
/** A monster at `position` of about `quality`, aged `age`, with an id of its own. */
function mon(position, quality, age, extra = {}) { const m = generateMonster(createRng(1000 + n), { position, quality, age }); m.id = `t${n++}`; m.age = age; return Object.assign(m, extra); }

test('R1: horizon from the public onset; successors young and close (or with the potential); ready within 4; protected never successors', () => {
  const st = mon('QB', 72, 31); const h = horizonOf(st); assert.equal(h, publicOnset(st) - 31); assert.ok(h <= PLAN.ageingHorizon);
  assert.equal(horizonOf(mon('QB', 70, 25, { legendary: true })), Infinity, 'ageless starters never age');
  const so = monsterOverall(st);
  const close = mon('QB', so - 3, 24), far = mon('QB', so - 14, 24, { potential: so - 2 }), reach = mon('QB', so - 14, 23, { potential: so + 1 }), old = mon('QB', so - 2, 29), sig = mon('QB', so, 22, { signature: true });
  assert.ok(qualifiesAsSuccessor(close, st)); assert.ok(!qualifiesAsSuccessor(far, st), 'neither close nor able to reach him');
  assert.ok(qualifiesAsSuccessor(reach, st), 'potential at the starter\'s overall'); assert.ok(!qualifiesAsSuccessor(old, st), 'not young, not 4 years younger');
  assert.ok(!qualifiesAsSuccessor(sig, st), 'protected');
  const rows = groupSuccession([st, close, reach], 1); assert.equal(rows[0].successor, close); assert.equal(rows[0].ready, monsterOverall(close) >= so - 4);
});

test('R1 / D15: the gap is position-relative (weak −4, severe −8); succession needs 2 and 1; settled groups', () => {
  const roster = [mon('QB', 60, 31), mon('RB', 70, 23), mon('RB', 66, 22)];
  const bench = { QB: monsterOverall(roster[0]) + 9, RB: monsterOverall(roster[1]) - 2 };
  const p = rosterPlan(roster, bench);
  assert.ok(p.groups.QB.weak && p.groups.QB.severe); assert.equal(p.groups.QB.weakNeed, 1); assert.equal(p.groups.QB.successionNeed, 2, 'an ageing QB with nobody behind him');
  assert.ok(!p.groups.RB.weak); assert.ok(p.groups.RB.settled, 'a young RB above the league with a successor');
  assert.ok(draftNeedBonus(p, 'QB') === 4 + 3, 'succession +4, severe weakness +3'); assert.equal(draftNeedBonus(p, 'RB'), -3);
  const lb = leagueBench([roster, [mon('QB', 80, 26)]]); assert.ok(lb.QB > monsterOverall(roster[0]));
  // succession need 1: a successor not ready while the starter is at his onset
  const st = mon('LB', 74, 0); st.age = publicOnset(st) - 1; const kid = mon('LB', 60, 21, { potential: 90 });
  const p2 = rosterPlan([st, mon('LB', 74, 24), kid], null); assert.equal(p2.groups.LB.successionNeed, 1);
});

test('R3: contract length 3 / 2 / 1 by the public onset, 2 for an exceptional veteran', () => {
  const m = mon('WR', 70, 20); const on = publicOnset(m);
  m.age = on - 3; assert.equal(contractLength(m), 3); m.age = on - 2; assert.equal(contractLength(m), 3);
  m.age = on - 1; assert.equal(contractLength(m), 2); m.age = on; assert.equal(contractLength(m), 2);
  m.age = on + 1; assert.equal(contractLength(m), 1);
  assert.equal(contractLength(m, { bench: { WR: monsterOverall(m) - 6 } }), 2, 'exceptional'); m.age = on + 3; assert.equal(contractLength(m, { bench: { WR: monsterOverall(m) - 6 } }), 1);
});

test('R3 in the league: a declining starter with a ready successor walks, one without is kept a season; successors re-sign; old reserves walk; lengths stagger', () => {
  const f = newFranchise(41); const cap = tierById(f.tier).cap; const year = 1;
  const club = ALL_TEAMS.filter((t) => t !== f.club).find((c) => !R.clubRoster(f, c).some(R.isProtected)) || ALL_TEAMS.filter((t) => t !== f.club)[2];
  const roster = R.clubRoster(f, club); const qbs = roster.filter((m) => m.position === 'QB').sort((a, b) => monsterOverall(b) - monsterOverall(a));
  const rbs = roster.filter((m) => m.position === 'RB').sort((a, b) => monsterOverall(b) - monsterOverall(a));
  // QB: starter past his onset with a ready young backup → walks; the backup (successor) re-signs for 3
  const [qb1, qb2] = qbs; qb1.age = publicOnset(qb1) + 2; qb2.age = 23; for (const k of Object.keys(qb2.attributes)) qb2.attributes[k] = qb1.attributes[k]; qb2.potential = Math.max(qb2.potential, monsterOverall(qb2) + 2);
  // RB: starter past his onset with nobody young behind him → kept, one season
  const [rb1, ...rbRest] = rbs; rb1.age = publicOnset(rb1) + 1; for (const b of rbRest) b.age = Math.max(b.age, 29);
  // a reserve well past his onset → walks
  const res = roster.find((m) => !R.isProtected(m) && m.position === 'WR' && roster.filter((x) => x.position === 'WR' && monsterOverall(x) > monsterOverall(m)).length >= 3);
  res.age = publicOnset(res) + RESERVE_PAST_ONSET + 1;
  for (const m of [qb1, qb2, rb1, res]) { m.contract = { signed: 0, ends: year, years: 2 }; }
  const before = successorIds(f, club); assert.ok(before.has(qb2.id), 'the young QB is the designated successor');
  const out = leagueContracts(f, { year, cap });
  const after = new Set(R.clubRoster(f, club).map((m) => m.id));
  assert.ok(!after.has(qb1.id), 'declining starter with a ready successor walks'); assert.ok(after.has(qb2.id)); assert.equal(qb2.contract.ends, year + 3, 'the successor signs for three seasons');
  assert.ok(after.has(rb1.id), 'no successor: kept'); assert.equal(rb1.contract.ends, year + 1, 'one season');
  assert.ok(!after.has(res.id), 'a reserve past onset + 2 walks');
  assert.ok(out.lengths[1] + out.lengths[2] + out.lengths[3] === out.resigned);
  assert.deepEqual(R.verifyLeague(f), []);
});

test('cap trims: a designated successor goes only when no other reserve is left', () => {
  const f = newFranchise(43); const cap = tierById(f.tier).cap; const year = 1;
  const club = ALL_TEAMS.filter((t) => t !== f.club)[4]; const bench = leagueBenchOf(f);
  const succ = successorIds(f, club, bench); assert.ok(succ.size > 0, 'the club has successors');
  for (const m of R.clubRoster(f, club)) if (succ.has(m.id)) m.salary = 1_500_000; // the worst value per salary on the club
  for (const m of R.clubRoster(f, club)) if (!R.isProtected(m)) m.contract = { signed: 0, ends: year + 2, years: 3 };
  const extra = R.clubRoster(f, club).filter((m) => !R.isProtected(m) && !succ.has(m.id)).slice(0, 3); for (const m of extra) m.salary += 400_000;
  leagueContracts(f, { year, cap });
  const ids = new Set(R.clubRoster(f, club).map((m) => m.id)); const kept = [...succ].filter((id) => ids.has(id));
  assert.ok(kept.length === succ.size || R.clubRoster(f, club).length <= 30, 'successors survive while other reserves are left');
});

test('R6: the successor premium (0.8 / 0.6 / 0.45 by the starter\'s horizon) on AI rosters only; never untradeable', () => {
  assert.equal(successorShare(-1), 0.8); assert.equal(successorShare(2), 0.8); assert.equal(successorShare(3), 0.6); assert.equal(successorShare(4), 0.6); assert.equal(successorShare(5), 0.45);
  const st = mon('CB', 74, 30), st2 = mon('CB', 73, 26), kid = mon('CB', 69, 23, { potential: 80 }), body = mon('CB', 50, 31);
  const roster = [st, st2, kid, body, mon('QB', 60, 25)];
  const withP = rosterWorth(roster, 1), without = rosterWorth(roster, 1, { succession: false });
  const h = Math.min(horizonOf(st), horizonOf(st2)); const share = successorShare(h);
  assert.ok(Math.abs(withP - without - marketValue(kid) * (share - 0.45)) < 1e-6, 'the successor\'s share rises from 0.45 to ' + share);
  assert.ok(successorPremium(roster, kid) > 1 && successorPremium(roster, body) === 1 && successorPremium(roster, st) === 1);
});

test('R7: the draft adds the plan\'s need (+4 succession, up to +3 weak, −3 settled); kicker and duplicate penalties stay', () => {
  const base = (m) => monsterOverall(m) + (m.potential - 70) * 0.2;
  const qb = mon('QB', 62, 21), rb = mon('RB', 66, 21), k = mon('K', 70, 21);
  for (let i = 0; i < 40 && base(rb) - base(qb) < 3.6; i++) { qb.potential -= 1; }
  for (let i = 0; i < 40 && base(rb) - base(qb) > 6; i++) { qb.potential += 1; }
  k.potential = 70; for (const key of Object.keys(k.attributes)) k.attributes[key] = Math.min(k.attributes[key], 60);
  const cls = [qb, rb, k];
  const f = { draft: { class: cls, available: cls.map((m) => m.id), picks: [] } };
  const plan = { groups: { QB: { successionNeed: 2, weakNeed: 1 }, RB: { successionNeed: 0, weakNeed: 0, settled: true }, K: { successionNeed: 0, weakNeed: 0 } } };
  const noPlan = aiDraftPick(f, 'X', createRng(5)); const withPlan = aiDraftPick(f, 'X', createRng(5), { plan });
  assert.equal(noPlan.position, 'RB', 'without the plan, the better prospect'); assert.equal(withPlan.position, 'QB', 'a succession need wins a close call');
  f.draft.picks.push({ team: 'X', position: 'QB' }); const second = aiDraftPick(f, 'X', createRng(5), { plan: { groups: { QB: { successionNeed: 0, weakNeed: 0 }, RB: { successionNeed: 0, weakNeed: 0 } } } });
  assert.equal(second.position, 'RB', 'the duplicate penalty still applies');
});
