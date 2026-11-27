// D-1 (owner 2026-11-26): existing franchises move to the 1.6 M cap at their next offseason. Targeted tests for the eight owner
// scenarios: below the cap, slightly above, well above, at the roster minimum, several expensive contracts, legendary / Apex
// monsters, the approach to the offseason (notices) and a save reopened mid-transition. Nothing is released or rewritten for the owner.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { tierCap, CAP_ERA, LEGACY_TIER_CAPS, tierById } from '../src/data/league.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

const NEW_CAP = tierById('challenger').cap;
/** A franchise as an existing player's save looks: begun before the new cap, so no `capEra`. */
function legacy(seed) { const f = newFranchise(seed); delete f.capEra; return f; }
const snapshot = (f) => f.roster.map((m) => ({ id: m.id, salary: m.salary, contract: JSON.stringify(m.contract || null), attrs: JSON.stringify(m.attributes) }));
/** Raise next season's commitments to `target` by adding to the salaries of the club's most expensive contracts that run on. */
function commitTo(f, target, count = 4) {
  const next = f.season.year + 1;
  const runOn = f.roster.filter((m) => (m.contract?.ends ?? 0) >= next).sort((a, b) => (b.salary || 0) - (a.salary || 0)).slice(0, count);
  assert.ok(runOn.length, 'contracts that run into next season');
  const add = Math.max(0, target - F.capTransitionOutlook(f).committed); for (const m of runOn) m.salary = (m.salary || 0) + Math.ceil(add / runOn.length);
  return runOn;
}

test('a legacy franchise keeps the 1.8 M cap in its current season; a new franchise is on the new cap from the start', () => {
  const old = legacy(401); assert.equal(tierCap(old), LEGACY_TIER_CAPS.challenger); assert.equal(F.capTransitionDue(old), true);
  const fresh = newFranchise(402); assert.equal(fresh.capEra, CAP_ERA); assert.equal(tierCap(fresh), NEW_CAP); assert.equal(F.capTransitionDue(fresh), false);
  assert.equal(F.capTransitionOutlook(fresh), null);
  assert.equal(F.applyCapTransition(fresh, fresh.season.year), false, 'a new franchise is unaffected');
  assert.equal(fresh.capTransition, undefined);
});

test('scenario 1, below 1.6 M: the transition happens once, the cap is 1.6 M, nothing on the roster changes', () => {
  const f = legacy(403); const o = F.capTransitionOutlook(f); assert.ok(o.committed < NEW_CAP, `committed ${o.committed}`); assert.equal(o.over, false);
  const before = snapshot(f); const hist = JSON.stringify(f.history);
  assert.equal(F.applyCapTransition(f, f.season.year), true);
  assert.equal(f.capEra, CAP_ERA); assert.equal(tierCap(f), NEW_CAP); assert.deepEqual(f.capTransition, { year: f.season.year, from: o.from, to: o.to, committed: o.committed });
  assert.deepEqual(snapshot(f), before, 'no release, no salary, contract or attribute change'); assert.equal(JSON.stringify(f.history), hist, 'history untouched');
  assert.ok(f.news.some((n) => /cap is now|1,600,000/.test(n.text || '')), 'the league office announces it');
  assert.equal(F.applyCapTransition(f, f.season.year + 1), false, 'never repeats'); assert.equal(f.capTransition.year, f.season.year);
});

for (const [label, over] of [['scenario 2, slightly above', 20000], ['scenario 3, well above', 400000]]) {
  test(`${label} (${over.toLocaleString('en-US')} cr over): contracts stand, additions are refused while over, releases bring the club under`, () => {
    const f = legacy(404 + over % 7); commitTo(f, NEW_CAP + over);
    const before = snapshot(f); assert.equal(F.applyCapTransition(f, f.season.year), true);
    assert.deepEqual(snapshot(f), before, 'nothing released or rewritten for the owner');
    assert.ok(f.news.some((n) => /over/i.test(n.text || '') && /1,600,000/.test(n.text || '')), 'the announcement says how far over');
    f.season.finished = true; // the offseason the transition opens: the new cap counts from here
    const cap = F.salarySummary(f); assert.equal(cap.cap ?? tierCap(f), cap.cap ?? NEW_CAP);
    if (cap.over) assert.equal(F.overCapBlock(f, 30000)?.code, 'cap', 'a move that adds salary is refused while over');
    else assert.equal(F.overCapBlock(f, 30000), null, 'under the cap a signing is not blocked by this rule');
    assert.equal(F.overCapBlock(f, 0), null, 'a move that adds nothing is not');
    assert.equal(F.overCapBlock(f, -50000), null, 'nor one that sheds salary');
  });
}

test('scenario 4, at the roster minimum and over: the season gate does not deadlock; the commissioner review offers releases; progress continues', () => {
  const f = legacy(410); while (f.roster.length > F.ROSTER_MIN) { const spare = f.roster.filter((m) => f.roster.filter((x) => x.position === m.position).length > 2).sort((a, b) => (a.id < b.id ? -1 : 1))[0]; F.releaseMonster(f, spare.id); }
  assert.equal(f.roster.length, F.ROSTER_MIN); assert.equal(F.applyCapTransition(f, f.season.year), true);
  // in-season under the new cap (the year after the transition) and over it: the commissioner names monsters; releasing one is allowed below the minimum
  for (const m of f.roster.slice(0, 3)) m.salary = (m.salary || 0) + 200000;
  assert.ok(F.salarySummary(f).over, 'over the new cap');
  const c = F.commissionerReview(f); assert.ok(c && c.names.length >= 1, 'the commissioner names the monsters to choose between');
  let g = 0; while (f.week.commissioner && g++ < 6) { const r = F.commissionerRelease(f, f.week.commissioner.names[0]); assert.equal(r.ok, true, r.reason); }
  assert.equal(f.week.commissioner, null, 'the review ends once under the cap'); assert.equal(F.salarySummary(f).over, false);
  assert.ok(f.roster.length >= F.ROSTER_MIN - 6, 'the owner chose the releases; nothing else was removed');
});

test('scenario 5, several expensive contracts: all stay on their terms across the transition', () => {
  const f = legacy(411); const big = commitTo(f, NEW_CAP + 150000, 6);
  const terms = big.map((m) => [m.id, m.salary, JSON.stringify(m.contract)]);
  F.applyCapTransition(f, f.season.year);
  for (const [id, salary, contract] of terms) { const m = f.roster.find((x) => x.id === id); assert.ok(m, 'still on the roster'); assert.equal(m.salary, salary); assert.equal(JSON.stringify(m.contract), contract); }
});

test('scenario 6, legendary and Apex monsters: never released or reduced by the transition', () => {
  const f = legacy(412); const star = f.roster.slice().sort((a, b) => (b.salary || 0) - (a.salary || 0))[0];
  star.legendary = star.legendary || { id: 'test-legend' }; star.apex = true; const before = JSON.stringify(star);
  commitTo(f, NEW_CAP + 250000); const after0 = JSON.stringify(star);
  F.applyCapTransition(f, f.season.year);
  assert.ok(f.roster.includes(star)); assert.equal(JSON.stringify(star), after0, 'unchanged by the transition'); assert.ok(before.length > 0);
});

test('scenario 7, approaching the offseason: the HQ notice and the League News notice say both caps, when it applies and the position', () => {
  const f = legacy(413); commitTo(f, NEW_CAP + 60000);
  const n = F.notices(f).find((x) => x.kind === 'cap'); assert.ok(n, 'an HQ notice while the change is due');
  assert.match(n.text, /1,800,000/); assert.match(n.text, /1,600,000/); assert.match(n.text, /over|release|lower/i);
  const fresh = newFranchise(414); assert.ok(!F.notices(fresh).some((x) => x.kind === 'cap'), 'no notice for a new franchise');
  F.applyCapTransition(f, f.season.year); assert.ok(!F.notices(f).some((x) => x.kind === 'cap' && /1,800,000/.test(x.text)), 'the change notice is gone once in force (an ordinary over-the-cap notice may remain)');
});

test('scenario 8, saved and reopened: before the change it is still due; after it, it persists and does not repeat', () => {
  const f = legacy(415); const due = Save.importJson(Save.exportJson(f)); const g = due.franchise || due.f || due;
  assert.equal(F.capTransitionDue(g), true, 'a save without capEra loads and is still due'); assert.equal(tierCap(g), LEGACY_TIER_CAPS.challenger);
  F.applyCapTransition(f, f.season.year); const mark = JSON.stringify(f.capTransition);
  const back = Save.importJson(Save.exportJson(f)); const h = back.franchise || back.f || back;
  assert.equal(h.capEra, CAP_ERA); assert.equal(tierCap(h), NEW_CAP); assert.equal(JSON.stringify(h.capTransition), mark);
  assert.equal(F.applyCapTransition(h, h.season.year + 1), false, 'never twice'); assert.equal(F.capTransitionDue(h), false);
});
