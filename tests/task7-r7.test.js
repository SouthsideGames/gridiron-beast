// Task 7 R7 (owner approval 2026-11-05): draft and staff affordability. No silent loss of picks, monsters or staff; no dead end;
// the only exception (minimum staff) is explicit, limited and logged.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as E from '../src/franchise/fa-engine.js';
import { rookieCharge } from '../src/franchise/draft.js';
import { leagueClubs, clubRoster, clubCapRoom, isProtected } from '../src/franchise/league-registry.js';
import { tierById } from '../src/data/league.js';
import { STAFF, staffById } from '../src/data/staff.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { t7Settle } from './t7-support.js';

/** A franchise whose first season is played, its renewals settled and free agency finished: the draft is next. */
function toDraft(seed) {
  const f = newFranchise(seed);
  for (let g = 0; g < 40 && !f.season.finished; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  t7Settle(f); assert.ok(F.openFreeAgency(f).ok); F.finishFreeAgency(f); return f;
}

test('R7 draft: the reserve is shown before the draft; an unaffordable pick is refused with its shortfall and options; a cheaper pick or a pass still works', () => {
  const f = toDraft(51);
  const res = F.draftReserve(f); assert.ok(res.picks >= 1 && res.total > 0 && res.estimate, JSON.stringify(res));
  assert.ok(F.beginDraft(f).ok);
  assert.equal(F.onTheClock(f), f.club, 'the draft runs to the first pick the owner holds');
  const avail = f.draft.class.filter((x) => f.draft.available.includes(x.id)).sort((a, b) => rookieCharge(b) - rookieCharge(a));
  const dear = avail[0], cheap = avail.at(-1);
  f.pendingDeadCap = (f.pendingDeadCap || 0) + Math.max(0, E.capView(f, f.club).usable - Math.floor((rookieCharge(dear) + rookieCharge(cheap)) / 2)); // only the cheap one fits
  const a = F.draftAffordability(f, dear.id); assert.ok(a && a.code === 'cap' && a.short > 0 && a.cheaper.includes(cheap.id), JSON.stringify(a));
  const before = f.roster.length; const r = F.myDraftPick(f, dear.id); assert.equal(r.ok, false); assert.equal(r.code, 'cap'); assert.match(r.reason, /pass/);
  assert.equal(f.roster.length, before); assert.ok(f.draft.available.includes(dear.id), 'nothing discarded'); assert.equal(F.onTheClock(f), f.club, 'still his pick');
  const ok = F.myDraftPick(f, cheap.id); assert.ok(ok.ok, ok.reason); assert.ok(E.capView(f, f.club).usable >= 0);
});

test('R7 draft: AI clubs draft only what they can pay; with no room they make room by a release, else pass — recorded and explained', () => {
  const f = toDraft(52); const cap = tierById(f.tier).cap;
  const broke = leagueClubs(f).slice().sort()[1];
  { const paid = clubRoster(f, broke).filter((m) => !isProtected(m)); const add = Math.ceil(Math.max(0, clubCapRoom(f, broke, cap)) / paid.length) + 2000; for (const m of paid) m.salary = (m.salary || 0) + add; } // no room at all
  assert.ok(clubCapRoom(f, broke, cap) < 0);
  assert.ok(F.beginDraft(f).ok); let g = 0; while (!f.draft.done && g++ < 80) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  assert.ok(f.draft.done);
  const mine = f.draft.picks.filter((p) => p.team === broke);
  for (const p of mine) if (p.passed) { assert.ok(p.why, 'a pass is explained'); assert.ok((f.draft.aiPasses || []).some((x) => x.team === broke)); }
  const rookies = clubRoster(f, broke).filter((m) => m.contract?.rookie && m.joined === f.season.year + 1);
  assert.equal(rookies.length + mine.filter((p) => p.passed).length, mine.length, 'every pick is a rookie or an explained pass');
  for (const c of leagueClubs(f)) if (c !== broke) assert.ok(clubCapRoom(f, c, cap) >= -1, `${c} within the cap after the draft`);
});

test('R7 staff: a renewal must fit next season\'s cap (the owner sees the cost first); otherwise a fitting hire, else a logged once-per-role exception; the season can start', () => {
  const f = toDraft(53);
  const role = 'head_coach';
  f.pendingDeadCap = (f.pendingDeadCap || 0) + Math.max(0, F.staffRoom(f, role) - 1000); // nothing fits for this role
  const c = F.staffRenewalCheck(f, role); assert.equal(c.ok, false); assert.equal(c.code, 'cap'); assert.ok(c.demand > c.room); assert.match(c.reason, /exception|candidate/);
  f.offseason.items.push({ kind: 'staff', id: 'st_' + role, role, name: staffById(f.staff[role]).name, current: F.staffSalary ? 0 : 0, ask: c.demand, status: null });
  const r = F.resolveContract(f, 'st_' + role, 'sign'); assert.equal(r.ok, false, 'unaffordable renewal refused'); assert.equal(f.staff[role] != null, true, 'nobody lost by the refusal');
  assert.ok(F.resolveContract(f, 'st_' + role, 'walk').ok); assert.equal(f.staff[role], undefined);
  F.hireDefaultStaff(f); const h = f.lastStaffHires.find((x) => x.role === role); assert.ok(h);
  assert.ok(h.exception, 'no candidate fits: the default under the exception');
  assert.equal(f.capExceptions.filter((e) => e.role === role && e.kind === 'minimum-staff').length, 1, 'logged once');
  assert.ok(f.news.some((n) => /Commissioner exception/.test(n.text || n.msg || JSON.stringify(n))), 'announced');
  // a role that a cheaper candidate can fill takes him, with no exception
  f.pendingDeadCap = 0; const role2 = 'defensive_coordinator'; delete f.staff[role2]; delete f.staffContracts[role2];
  const cheapest = STAFF.filter((x) => x.role === role2).sort((a, b) => a.salary - b.salary)[0];
  f.pendingDeadCap = Math.max(0, F.staffRoom(f, role2) - cheapest.salary - 100); // the default (93,000) no longer fits, the cheapest (72,000) does
  F.hireDefaultStaff(f); const o2 = f.lastStaffHires.find((x) => x.role === role2); assert.equal(o2.exception, false); assert.equal(o2.id, cheapest.id);
  assert.equal(f.capExceptions.length, 1);
});
