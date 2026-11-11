// Task 7: the roster minimum against the cap (owner rule, 2026-11-04). In the offseason a club may release below 26 to free cap;
// the minimum still gates the next season; no signing may exceed the cap; the owner chooses each release; AI clubs resolve it
// themselves; zero dead cap and the legendary limits are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as E from '../src/franchise/fa-engine.js';
import { overLimit } from '../src/franchise/fa-legendary.js';
import { leagueClubs, clubRoster, removeFromClub, isProtected, clubCapRoom } from '../src/franchise/league-registry.js';
import { tierById } from '../src/data/league.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { t7Settle } from './t7-support.js';

/** End season 1 and run the owner's offseason to just before the season gate (renewals, free agency, draft, staff). */
function toGate(f) {
  f.season.finished = true; f.offseason = null; t7Settle(f); assert.ok(F.openFreeAgency(f).ok); F.finishFreeAgency(f);
  assert.ok(F.beginDraft(f).ok); let g = 0; while (!f.draft.done && g++ < 60) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  for (const role of ['head_coach', 'off_coord', 'def_coord', 'head_scout', 'monster_trainer']) if (!f.staff?.[role]) F.hireDefaultStaff(f);
  return f;
}
const spare = (f) => f.roster.filter((m) => f.roster.filter((x) => x.position === m.position).length > 2).sort((a, b) => (a.id < b.id ? -1 : 1));

test('releases below 26: allowed in the Task 7 offseason only; the minimum still gates the next season', () => {
  const inSeason = newFranchise(301); while (inSeason.roster.length > F.ROSTER_MIN) F.releaseMonster(inSeason, spare(inSeason)[0].id);
  assert.equal(F.releaseMonster(inSeason, spare(inSeason)[0].id).ok, false, 'in season the minimum holds');
  const f = toGate(newFranchise(302)); while (f.roster.length > F.ROSTER_MIN) F.releaseMonster(f, spare(f)[0].id);
  const out = spare(f)[0]; assert.equal(F.releaseMonster(f, out.id).ok, true, 'the offseason allows going below 26');
  assert.equal(f.roster.length, F.ROSTER_MIN - 1);
  const r = F.startNextSeason(f); assert.equal(r.ok, false); assert.equal(r.code, 'roster'); assert.match(r.reason, /at least 26/);
  assert.ok(E.marketList(f).some((x) => x.m === out), 'released to the market, not deleted');
  assert.equal(E.blocker(f, f.club, out, null)?.code, 'lock', 'and he cannot rejoin this league year');
});

test('the dead end resolves: the plan shows the shortfall and the savings, the owner releases and signs within the cap, the season starts', () => {
  const f = toGate(newFranchise(303)); const cap0 = E.capOf(f, f.club); // seed 303 restored: with the lineup-aware planner its suggested releases no longer leave one CB for two CB slots
  while (f.roster.length > F.ROSTER_MIN - 2) F.releaseMonster(f, spare(f)[0].id);
  // squeeze next season's books (staff charges) until the cheapest two replacements no longer fit
  const plan0 = F.rosterFloorPlan(f); f.pendingDeadCap = (f.pendingDeadCap || 0) + Math.max(0, plan0.usable - 1000);
  const plan = F.rosterFloorPlan(f); assert.equal(plan.short, 2); assert.ok(plan.gap > 0, 'short of cap for the replacements');
  assert.ok(plan.releases.length > 5 && plan.releases.every((x) => x.saving > 0), 'every listed release shows its saving');
  assert.ok(plan.recoverable && plan.path.length >= 1, 'a sequence of releases closes the shortfall');
  const blocked = F.startNextSeason(f); assert.equal(blocked.ok, false); assert.match(blocked.reason, /releasing monsters/, blocked.reason);
  const cheapest = F.freeAgentMarket(f).sort((a, b) => a.ask.salary - b.ask.salary)[0];
  assert.equal(F.negotiateFreeAgent(f, cheapest.monster.id, cheapest.ask).code, 'cap', 'no signing over the cap');
  assert.equal(f.roster.length, F.ROSTER_MIN - 2, 'nothing was released for the owner');
  // the owner follows the suggestions, signing the cheapest who accept (taking counters)
  const tried = new Set();
  const fill = () => { for (const x of F.freeAgentMarket(f).sort((a, b) => a.ask.salary - b.ask.salary || (a.monster.id < b.monster.id ? -1 : 1))) { if (f.roster.length >= F.ROSTER_MIN) break; if (tried.has(x.monster.id)) continue; let r = F.negotiateFreeAgent(f, x.monster.id, x.ask); if (r.outcome === 'countered') r = F.negotiateFreeAgent(f, x.monster.id, r.counter); if (r.outcome !== 'signed' && r.code !== 'cap') tried.add(x.monster.id); assert.ok(E.usableCap(f, f.club) >= 0, 'usable cap never negative'); } };
  fill(); for (let k = 0; f.roster.length < F.ROSTER_MIN && k < 15; k++) { const c = F.rosterFloorPlan(f).releases[0]; assert.ok(c, 'a release is always offered'); const before = E.committed(f, f.club); assert.ok(F.releaseMonster(f, c.id).ok); assert.equal(before - E.committed(f, f.club), c.saving, 'zero dead cap: the whole charge leaves'); fill(); }
  assert.equal(f.roster.length, F.ROSTER_MIN); assert.ok(E.usableCap(f, f.club) >= 0); assert.equal(E.capOf(f, f.club), cap0);
  assert.deepEqual(overLimit(f.roster), { offense: 0, defense: 0 }, 'legendary limits hold');
  const go = F.startNextSeason(f); assert.equal(go.ok, true, go.reason);
});

test('release suggestions never leave fewer eligible monsters than the required lineup slots; the manual release policy is unchanged', () => {
  const f = toGate(newFranchise(303));
  while (f.roster.length > F.ROSTER_MIN - 2) F.releaseMonster(f, spare(f)[0].id);
  const plan0 = F.rosterFloorPlan(f); f.pendingDeadCap = (f.pendingDeadCap || 0) + Math.max(0, plan0.usable - 1000);
  // keep exactly the two CBs the base formation needs (CB1, CB2), so any CB release would open a lineup hole
  const cbs = f.roster.filter((m) => m.position === 'CB'); for (const m of cbs.slice(2)) F.releaseMonster(f, m.id);
  assert.equal(f.roster.filter((m) => m.position === 'CB').length, 2);
  const plan = F.rosterFloorPlan(f);
  assert.ok(plan.releases.length > 0, 'other releases are still offered');
  const cbIds = new Set(f.roster.filter((m) => m.position === 'CB').map((m) => m.id));
  assert.ok(!plan.releases.some((x) => cbIds.has(x.id)), 'no suggested release leaves one CB for two CB slots');
  assert.ok(!plan.path.some((id) => cbIds.has(id)), 'nor does the recovery path');
  // the explicit manual policy still allows releasing the second-to-last CB (it only refuses the last at a position)
  assert.equal(F.releaseMonster(f, [...cbIds][0]).ok, true);
});

test('AI clubs short of the minimum without cap room release a well-paid expendable and fill within the cap', () => {
  const f = newFranchise(304); const club = leagueClubs(f).slice().sort()[3]; const year = f.season.year;
  toGate(f);
  for (const m of clubRoster(f, club).filter((x) => !isProtected(x)).slice(-14)) removeFromClub(f, club, m.id, { year }); // well below 26
  const cap = tierById(f.tier).cap; const room0 = clubCapRoom(f, club, cap);
  const top = clubRoster(f, club).filter((x) => !isProtected(x)).sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const m of top.slice(0, 6)) m.salary = (m.salary || 0) + Math.ceil(room0 / 6) + 5000; // no room for a replacement
  assert.ok(clubCapRoom(f, club, cap) < 0 || clubCapRoom(f, club, cap) < 33000);
  const r = F.startNextSeason(f); assert.equal(r.ok, true, r.reason);
  assert.ok(clubRoster(f, club).length >= F.ROSTER_MIN, `${club} reached the minimum (${clubRoster(f, club).length})`);
  assert.ok(clubCapRoom(f, club, cap) >= 0, `${club} stays within the cap (${clubCapRoom(f, club, cap)})`);
  assert.ok(f.leagueOffseason?.freeAgency?.floorReleases >= 1, 'it released to make room (its own choice, not the owner\'s)');
  for (const c of leagueClubs(f)) { const o = overLimit(clubRoster(f, c)); assert.equal(o.offense + o.defense, 0, c); }
});
