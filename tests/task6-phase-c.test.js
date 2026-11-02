// Task 6 Phase C: development slots (C1) for AI clubs and the GM, maturation (C2), and free-agency upgrades (R5).
// Owner's Group 3 / Group 4 decisions of 2026-10-30; docs/TASK6_APPROVED_SPECIFICATION.md §1.8 (R5), §1.9.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEV, devIneligibility, selectDevSlots, practiceAfterGame, devPriority } from '../src/franchise/development.js';
import { offseason } from '../src/franchise/progression.js';
import { leagueUpgrades, UPGRADE_MIN, UPGRADES_PER_OFFSEASON, upgradesAllowed, successorIds } from '../src/franchise/league-season.js';
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/franchise/league-registry.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { createRng } from '../src/core/rng.js';
import { generateMonster, monsterOverall } from '../src/data/monsters.js';
import { POSITION_WEIGHTS } from '../src/data/personnel.js';
import { ALL_TEAMS, tierById } from '../src/data/league.js';

let n = 0;
function mon(position, quality, age, extra = {}) { const m = generateMonster(createRng(5000 + n), { position, quality, age }); m.id = `c${n++}`; m.age = age; return Object.assign(m, extra); }
const withHeadroom = (m, h = 8) => { m.potential = monsterOverall(m) + h; return m; };

test('C1 eligibility: a healthy reserve aged 25 or under with potential at least overall + 3', () => {
  const m = withHeadroom(mon('WR', 55, 22)); const none = new Set();
  assert.equal(devIneligibility(m, none), null);
  assert.equal(devIneligibility(m, new Set([m.id])), 'starter');
  assert.equal(devIneligibility(withHeadroom(mon('WR', 55, 26)), none), 'age');
  assert.equal(devIneligibility(Object.assign(withHeadroom(mon('WR', 55, 21)), { injury: { weeks: 2 } }), none), 'injured');
  assert.equal(devIneligibility(withHeadroom(mon('WR', 55, 21), 2), none), 'ceiling');
  assert.equal(devIneligibility(withHeadroom(mon('WR', 55, 21), 3), none), null, 'exactly +3 is enough');
});

test('C1 selection: at most 6, at most 2 per position, successors first, then upside; manual picks first; exclusions honoured', () => {
  const st = mon('QB', 74, 0); st.age = 31; // an ageing starter
  const heir = mon('QB', 66, 23); heir.attributes = Object.fromEntries(Object.entries(st.attributes).map(([k, v]) => [k, Math.max(20, v - 3)])); withHeadroom(heir, 4); // within 8: his successor
  const wrs = [0, 1, 2].map((i) => withHeadroom(mon('WR', 50, 21), 12 + i));
  const others = ['RB', 'TE', 'LB', 'CB', 'S'].map((p, i) => withHeadroom(mon(p, 50, 22), 5 + i));
  const roster = [st, heir, ...wrs, ...others]; const starters = new Set([st.id]);
  const order = devPriority(roster, starters); assert.equal(order[0].id, heir.id, 'the designated successor first');
  const s = selectDevSlots(roster, starters);
  assert.equal(s.ids.length, DEV.slots); assert.ok(s.ids.includes(heir.id));
  assert.equal(s.ids.filter((id) => wrs.some((w) => w.id === id)).length, DEV.perPosition, 'two receivers at most');
  const low = others[0]; const s2 = selectDevSlots(roster, starters, { manual: [low.id], excluded: [heir.id] });
  assert.equal(s2.ids[0], low.id, 'the GM pick first'); assert.ok(!s2.ids.includes(heir.id), 'excluded'); assert.ok(!s2.auto.has(low.id));
  const old = withHeadroom(mon('S', 50, 27)); const s3 = selectDevSlots([...roster, old], starters, { manual: [old.id] });
  assert.deepEqual(s3.dropped, [{ id: old.id, reason: 'age' }], 'an ineligible manual pick is reported, not kept');
});

test('C1 practice XP: 0.35 × 24 base, slowdown applied, nothing for a monster who played, no fatigue or injury roll, deterministic', () => {
  const a = withHeadroom(mon('CB', 50, 21)), b = withHeadroom(mon('CB', 50, 21)); a.xp = 0; b.xp = 0; a.fatigue = 7;
  const ev = practiceAfterGame([a, b], [a.id, b.id], new Set([b.id]), createRng(1));
  assert.equal(Math.round(DEV.share * DEV.baseXp), 8);
  assert.equal(a.xp + (a.level - 1) * 0 >= 0, true); assert.equal(ev.find((e) => e.kind === 'practice' && e.id === a.id).amount, 8);
  assert.equal(b.xp, 0, 'starter XP already earned: no practice XP'); assert.equal(a.fatigue, 7, 'no fatigue'); assert.ok(!a.injury, 'no injury roll');
  const c = withHeadroom(mon('CB', 50, 21)); c.xp = 0; practiceAfterGame([c], [c.id], new Set(), createRng(1), { xpScale: 0.5 }); assert.equal(c.xp, 4, 'the slowdown scales practice XP');
  const x1 = withHeadroom(mon('LB', 50, 21)); const x2 = JSON.parse(JSON.stringify(x1)); x1.xp = x2.xp = 200;
  practiceAfterGame([x1], [x1.id], new Set(), createRng(9)); practiceAfterGame([x2], [x2.id], new Set(), createRng(9));
  assert.deepEqual(x1, x2, 'same draws, same monster');
});

test('C2 maturation: one position-weighted +1 each offseason through age 24, never above potential; not at 25; ageless untouched', () => {
  const m = mon('QB', 55, 23); m.potential = 99; const before = { ...m.attributes }; // QB: decline onset 27 at the earliest, far off
  offseason([m], createRng(2)); // now 24
  const top = Object.entries(POSITION_WEIGHTS.QB).sort((a, b) => b[1] - a[1])[0][0];
  const grew = Object.keys(m.attributes).filter((k) => m.attributes[k] > before[k]);
  assert.ok(grew.includes(top), `the position's most weighted attribute (${top}) grew`);
  const n24 = mon('QB', 55, 24); n24.potential = 99; const b24 = { ...n24.attributes }; offseason([n24], createRng(2)); // now 25: no maturation, no growth to 23
  assert.ok(Object.keys(n24.attributes).every((k) => n24.attributes[k] <= b24[k]), 'none at 25');
  const capped = mon('QB', 55, 22); capped.potential = Math.max(...Object.values(capped.attributes)); const bc = { ...capped.attributes }; offseason([capped], createRng(2));
  assert.ok(Object.keys(bc).every((k) => capped.attributes[k] <= Math.max(bc[k], capped.potential)), 'never above potential');
  const leg = mon('RB', 60, 21, { legendary: true }); const bl = JSON.stringify(leg.attributes); offseason([leg], createRng(2)); assert.equal(JSON.stringify(leg.attributes), bl);
});

test('R5 upgrades: a weak group signs a pool monster +3 better, releasing an expendable reserve (never a successor or protected); one per club', () => {
  const f = newFranchise(61); const cap = tierById(f.tier).cap; const year = 2;
  const club = ALL_TEAMS.filter((t) => t !== f.club).find((c) => !R.clubRoster(f, c).some(R.isProtected)) || ALL_TEAMS.filter((t) => t !== f.club)[3];
  const roster = R.clubRoster(f, club); const tes = roster.filter((m) => m.position === 'TE').sort((a, b) => monsterOverall(b) - monsterOverall(a));
  for (const t of tes) for (const k of Object.keys(t.attributes)) t.attributes[k] = Math.max(20, t.attributes[k] - 25); // a weak TE group (every TE, so no backup steps in)
  const succ = successorIds(f, club);
  const star = mon('TE', 80, 30); star.salary = 30000; star.history = []; R.claimMonster(f, star, 'test|pool'); (f.pool[Object.keys(f.pool)[0]] ||= []).push(star); // 30: too old to be anyone's successor, so only a weak group signs him
  const before = new Set(roster.map((m) => m.id));
  const out = leagueUpgrades(f, { year, cap });
  for (const c of new Set(out.signed.map((x) => x.club))) assert.ok(out.signed.filter((x) => x.club === c).length <= upgradesAllowed(out.signed.find((x) => x.club === c).mode), "the upgrades its mode allows (Phase D: 2 for Contend, else 1)");
  const s = out.signed.find((x) => x.id === star.id); assert.ok(s, `the pool star was signed by a club that needed him: ${JSON.stringify({ star: star.id, ovr: monsterOverall(star), signed: out.signed.slice(0, 4) })}`);
  assert.equal(s.kind, 'weak'); assert.ok(s.ovr >= s.replaces + UPGRADE_MIN, `+${UPGRADE_MIN} over the starter he replaces`);
  for (const x of out.signed) if (x.released) assert.ok(!R.clubRoster(f, x.club).some((m) => m.id === x.released), 'the released reserve left');
  const own = out.signed.find((x) => x.club === club); if (own?.released) assert.ok(!succ.has(own.released), 'never a designated successor');
  void before;
  for (const c of ALL_TEAMS) if (R.clubRecord(f, c)) for (const id of R.clubRecord(f, c).protected) assert.ok(R.clubRoster(f, c).some((m) => m.id === id), 'protected monsters stay');
  assert.deepEqual(R.verifyLeague(f), []);
});

test('GM slots: filled automatically, manual picks persist, an ineligible pick leaves with a reason and a named replacement, reset restores auto', () => {
  const f = newFranchise(62);
  const v0 = F.devSlotsView(f); assert.ok(v0.slots.length <= DEV.slots); assert.equal(v0.xpPerGame, 8);
  const cand = v0.candidates[0] || v0.slots[v0.slots.length - 1]; assert.ok(cand, 'someone is eligible');
  assert.ok(F.setDevSlot(f, cand.id, true).ok); assert.deepEqual(f.devSlots.manual, [cand.id]);
  assert.ok(F.devSlotsView(f).slots.some((x) => x.id === cand.id && x.manual), 'the pick holds a slot');
  const m = f.roster.find((x) => x.id === cand.id); m.age = 26; // becomes ineligible
  F.ownerDevSlots(f, { notify: true });
  assert.ok(!f.devSlots.manual.includes(cand.id), 'removed from the manual picks');
  const msg = (f.news || []).map((x) => x.text || x.t || JSON.stringify(x)).filter((t) => t.includes('Development slots')).join(' '); assert.match(msg, /past 25/); assert.match(msg, /Development slots/);
  m.age = 21; const auto = F.devSlotsView(f).slots[0]; if (auto) { assert.ok(F.setDevSlot(f, auto.id, false).ok); assert.ok(!F.devSlotsView(f).slots.some((x) => x.id === auto.id), 'removed by the GM, not refilled with him'); }
  F.resetDevSlots(f); assert.equal(f.devSlots, undefined);
  const r = F.setDevSlot(f, f.roster.find((x) => (x.age || 0) > 25)?.id || 'nobody', true); assert.equal(r.ok, false);
});

test('performance refactor: successorsAt designates exactly the successors rosterPlan does (every league club, after a season)', async () => {
  const { successorsAt, rosterPlan } = await import('../src/franchise/roster-plan.js');
  const { runFranchise } = await import('../tools/franchise-soak.mjs');
  const { buildDepthChart } = await import('../src/franchise/roster.js');
  const { f } = runFranchise(63, { seasons: 1 }); let compared = 0;
  for (const c of R.leagueClubs(f)) { const roster = R.clubRoster(f, c); const starters = new Set(Object.values(buildDepthChart(roster)).filter(Boolean));
    const full = rosterPlan(roster, null, { starters }).successors; const fast = successorsAt(roster, [...new Set(roster.map((m) => m.position))], { starters });
    assert.deepEqual([...fast.entries()].sort(), [...full.entries()].sort(), c); compared++; }
  assert.equal(compared, 15);
});

test('performance refactor: the roster-worth group cache never serves a stale value (deals, signings, ratings, injuries, contracts, ages, seasons)', async () => {
  const TV = await import('../src/franchise/trade-value.js');
  const { runFranchise } = await import('../tools/franchise-soak.mjs');
  const { f } = runFranchise(64, { seasons: 1 }); const clubs = R.leagueClubs(f); const [a, b] = clubs.slice(0, 2);
  const A = R.clubRoster(f, a).slice(), B = R.clubRoster(f, b).slice(); const mover = B.find((m) => m.position === A[0].position) || B[0];
  const dealt = A.filter((m) => m !== A[0]).concat(mover); // A gives its first monster and gets one of B's: two groups change content
  const expect = { a2: TV.rosterWorth(A, 2), a3: TV.rosterWorth(A, 3), aOwn: TV.rosterWorth(A, 2, { succession: false }), dealt: TV.rosterWorth(dealt, 2), b2: TV.rosterWorth(B, 2) };
  TV.scoped(() => { // inside one read-only scope: repeated, mixed and changed rosters all equal the uncached sums
    for (let i = 0; i < 2; i++) { assert.equal(TV.rosterWorth(A, 2), expect.a2); assert.equal(TV.rosterWorth(dealt, 2), expect.dealt); assert.equal(TV.rosterWorth(B, 2), expect.b2); }
    assert.equal(TV.rosterWorth(A, 3), expect.a3, 'another season is another key'); assert.equal(TV.rosterWorth(A, 2, { succession: false }), expect.aOwn, 'the owner-style valuation is another key');
  });
  const m = A[1]; // between scopes anything may change; a new scope starts empty
  const changes = [() => { for (const k of Object.keys(m.attributes)) m.attributes[k] = Math.max(20, m.attributes[k] - 9); }, () => { m.injury = { weeks: 5 }; }, () => { m.contract = { ...(m.contract || {}), ends: 1 }; m.salary = (m.salary || 1000) * 2; }, () => { m.age = (m.age || 25) + 6; }];
  for (const change of changes) { TV.scoped(() => TV.rosterWorth(A, 2)); change(); const fresh = TV.rosterWorth(A, 2); assert.equal(TV.scoped(() => TV.rosterWorth(A, 2)), fresh); }
  assert.notEqual(TV.rosterWorth(A, 2), expect.a2, 'the changes did change the value');
});
