// Task 7 — performance-based staff renewals (owner approval 2026-11-05 §8): evaluation against talent, demands in the approved bands,
// negotiation (accept / smaller raise / same / reduction / decline; accept, counter, reject), cap accounting, saves, long-run salaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import * as S from '../src/franchise/staff-negotiation.js';
import { staffSalary } from '../src/franchise/contracts.js';
import { staffById, STAFF } from '../src/data/staff.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

function seasonDone(seed) {
  const f = newFranchise(seed);
  for (let g = 0; g < 40 && !f.season.finished; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  return f;
}
const staffItems = (f) => (f.offseason?.items || []).filter((i) => i.kind === 'staff');
const rec = (o) => ({ year: 1, staff: {}, ...o });

test('evaluation: each role against its talent; a weak roster that over-performs scores well, a strong one that under-performs poorly; recency weights', () => {
  const n = 16;
  assert.ok(S.seasonScore(rec({ pre: { team: 14, off: 14, def: 14, n }, res: { win: 9, pf: 9, pa: 9, n } }), 'defensive_coordinator') > 0.3); // the proposal's example: +0.33
  assert.ok(S.seasonScore(rec({ pre: { team: 2, off: 2, def: 2, n }, res: { win: 8, pf: 8, pa: 8, n } }), 'defensive_coordinator') < -0.35); // −0.40
  assert.ok(S.seasonScore(rec({ pre: { team: 2, n }, res: { win: 2, n, playoffs: true, champion: true } }), 'head_coach') > 0.44, 'a title adds');
  assert.ok(S.seasonScore(rec({ pre: { team: 8, off: 3, def: 8, n }, res: { win: 8, pf: 12, pa: 8, n } }), 'offensive_coordinator') < -0.5);
  assert.equal(S.seasonScore(rec({}), 'head_scout'), null, 'no draft: nothing to judge');
  assert.ok(Math.abs(S.seasonScore(rec({ draft: { n: 3, gap: 8 } }), 'head_scout')) <= 0.6 + 1e-9, 'the scout shares the result with the owner (shrunk)');
  assert.ok(S.seasonScore(rec({ train: { n: 12, got: 60, ref: 45 } }), 'monster_trainer') > 0);
  // recency: the latest season weighs most
  const f = { staff: { defensive_coordinator: 'dc_ice' }, staffContracts: { defensive_coordinator: { signed: 3, ends: 4 } }, staffEval: {
    3: rec({ year: 3, staff: { defensive_coordinator: 'dc_ice' }, pre: { def: 2, n }, res: { pa: 14, n } }), 4: rec({ year: 4, staff: { defensive_coordinator: 'dc_ice' }, pre: { def: 14, n }, res: { pa: 2, n } }) } };
  const e = S.evaluateStaff(f, 'defensive_coordinator'); assert.equal(e.seasons.length, 2); assert.ok(Math.abs(e.P - (0.6 * 0.8 + 0.4 * -0.8)) < 1e-9, `${e.P}`);
  f.staffEval[4].staff.defensive_coordinator = 'dc_fox'; assert.equal(S.evaluateStaff(f, 'defensive_coordinator').seasons.length, 1, 'only seasons this member held the role');
  assert.equal(S.evaluateStaff({ staff: { head_coach: 'hc_vale' }, staffContracts: { head_coach: { signed: 1, ends: 2 } } }, 'head_coach').band.id, 'average', 'no record: Average');
});

test('demands: inside the approved bands, freezes and reductions possible, quality moves the demand inside its band', () => {
  const mk = (P, id = 'dc_fox') => { const role = staffById(id).role; return S.staffDemand({ staff: { [role]: id }, staffContracts: { [role]: { signed: 1, ends: 1 } }, staffEval: { 1: rec({ staff: { [role]: id }, pre: { team: 8, off: 8, def: 8, n: 16 }, res: { win: 8 - Math.round(P * 15), pf: 8 - Math.round(P * 15), pa: 8 - Math.round(P * 15), n: 16 } }) } }, role, 100000); };
  const range = { excellent: [0.06, 0.08], good: [0.03, 0.05], average: [0, 0.02], poor: [-0.04, 0], very_poor: [-0.08, -0.04] };
  for (const P of [0.9, 0.6, 0.3, 0.2, 0, 0.1, -0.2, -0.4, -0.5, -0.9]) { const d = mk(P); const [lo, hi] = range[d.band.id]; assert.ok(d.change >= lo - 1e-9 && d.change <= hi + 1e-9, `${P} → ${d.band.id} ${d.change}`); assert.equal(d.demand, Math.round(100000 * (1 + d.change) / 100) * 100); }
  assert.ok(mk(0).demand <= 102000 && mk(0).demand >= 100000, 'an average member: a freeze to +2%');
  assert.ok(mk(-0.9).demand < 100000, 'a very poor member asks for less');
  assert.ok(mk(0.3, 'dc_ice').demand >= mk(0.3, 'dc_fox').demand, 'a better coordinator has more leverage in the same band');
});

test('negotiation: accept, counter, reject and leave, seeded and reproducible; excellent staff rarely take less, poor staff often but not always take a cut', () => {
  const item = (band, ask = 100000, current = 100000, role = 'defensive_coordinator', id = 'dc_fox', year = 1) => ({ kind: 'staff', role, id: role, current, ask, year, eval: { band } });
  const fx = (seed, id = 'dc_fox') => ({ seed, staff: { defensive_coordinator: id } });
  assert.equal(S.staffAnswer(fx(1), item('good'), 100000, 1).answer, 'accept', 'the demand is accepted');
  // reproducible: the same offer in the same round gives the same answer
  for (let s = 0; s < 30; s++) assert.deepEqual(S.staffAnswer(fx(s), item('average'), 97000, 1), S.staffAnswer(fx(s), item('average'), 97000, 1));
  const tally = (band, offer, current = 100000) => { const c = { accept: 0, counter: 0, reject: 0, leave: 0 }; for (let s = 0; s < 400; s++) c[S.staffAnswer(fx(s), item(band, band === 'excellent' ? 107000 : band === 'poor' ? 98000 : 100000, current), offer, 1).answer]++; return c; };
  const ex = tally('excellent', 105000); assert.ok(ex.accept > 0, 'even excellent staff sometimes take a little less'); assert.ok(ex.accept < 200, `limited: ${JSON.stringify(ex)}`);
  const exSame = tally('excellent', 100000); assert.equal(exSame.accept, 0, 'excellent staff do not take the same salary'); assert.ok(exSame.reject + exSame.counter === 400);
  const cut = tally('poor', 95000); assert.ok(cut.accept > 100 && cut.accept < 400, `poor staff often, not always, accept a 5% cut: ${JSON.stringify(cut)}`);
  const deep = S.staffAnswer(fx(3), item('very_poor', 94000), 75000, 1); assert.equal(deep.answer, 'leave', 'a very poor member refused his floor leaves');
  // round 2: at or above the counter he accepts; below his floor the talks end
  const it = item('good', 104000); it.counter = 102000; assert.equal(S.staffAnswer(fx(9), it, 102000, 2).answer, 'accept'); assert.equal(S.staffAnswer(fx(9), it, 90000, 2).answer, 'leave');
  // the options
  const o = S.staffOptions(100000, 106000); assert.deepEqual(o, { accept: 106000, smaller: 103000, same: 100000, reduce: 95000 });
  const p = S.staffOptions(100000, 97000); assert.equal(p.smaller, null); assert.equal(p.same, null); assert.equal(p.reduce, 92200);
});

test('in the game: demands replace the 10% raise; every option fits the cap first; a counter can be taken; a member who leaves is replaced at base salary', () => {
  const f = seasonDone(81); const items = staffItems(f);
  for (const i of F.offseasonPending(f).filter((x) => x.kind === 'monster')) F.resolveContract(f, i.id, 'walk');
  if (!items.length) { // no staff contract ends this offseason in this seed: end one now (save-compatible lazy evaluation path)
    const role = 'head_scout'; f.staffContracts[role].ends = f.season.year; f.offseason.items.push({ kind: 'staff', id: role, name: staffById(f.staff[role]).name, role, current: staffSalary(f, role), ask: Math.round(staffSalary(f, role) * 1.1 / 100) * 100, status: null }); }
  const i = staffItems(f).find((x) => !x.status); const role = i.role; const cur = staffSalary(f, role);
  // an unaffordable offer is refused before it is made, nothing changes
  const keep = f.pendingDeadCap; f.pendingDeadCap = 10_000_000; const no = F.resolveContract(f, i.id, 'sign'); assert.equal(no.ok, false); assert.equal(no.code, 'cap'); assert.ok(!i.status); f.pendingDeadCap = keep;
  assert.ok(i.eval && S.STAFF_BANDS.some((b) => b.id === i.eval.band), 'evaluated (lazily for an old offseason book)');
  assert.ok(i.ask <= Math.round(cur * 1.08 / 100) * 100 + 100 && i.ask >= Math.round(cur * 0.92 / 100) * 100 - 100, `the demand is within ±8%: ${cur} → ${i.ask}`);
  const r = F.resolveContract(f, i.id, 'sign'); assert.ok(r.ok && r.status === 'signed', JSON.stringify(r)); assert.equal(staffSalary(f, role), i.ask, 'the new salary is the demand'); assert.equal(f.staffContracts[role].signed, f.season.year + 1);
  // a member who leaves: the role opens; any candidate is hired at base salary
  const g = seasonDone(82); for (const x of F.offseasonPending(g).filter((y) => y.kind === 'monster')) F.resolveContract(g, x.id, 'walk');
  const roleG = 'head_coach'; g.staffContracts[roleG].ends = g.season.year; g.offseason.items.push({ kind: 'staff', id: roleG, name: 'Coach', role: roleG, current: staffSalary(g, roleG), ask: 0, status: null });
  const j = staffItems(g).find((x) => x.role === roleG); let res = F.resolveContract(g, j.id, 'reduce'); if (res.status === 'rejected' || res.status === 'countered') res = F.resolveContract(g, j.id, 'reduce');
  if (res.status === 'countered') res = F.resolveContract(g, j.id, 'acceptcounter');
  assert.ok(['signed', 'walked'].includes(res.status), JSON.stringify(res));
  if (res.status === 'walked') { assert.equal(g.staff[roleG], undefined); const c = STAFF.filter((x) => x.role === roleG).sort((a, b) => a.salary - b.salary)[0]; assert.ok(F.replaceStaff(g, c.id).ok); assert.equal(staffSalary(g, roleG), c.salary); }
  // save round trip keeps the book and the evaluation records
  const back = Save.importJson(Save.exportJson(g)); assert.deepEqual(back.staffEval, g.staffEval); assert.deepEqual(staffItems(back), staffItems(g));
});

test('long run: 9 renewals at the demand — excellent ≈ ×1.7–2.0, average ×1.0–1.2, poor ×0.7–1.0; base salaries never inflate, so cheaper candidates stay', () => {
  const path = (P) => { let x = 1; for (let k = 0; k < 9; k++) { const role = 'head_coach'; const d = S.staffDemand({ staff: { [role]: 'hc_vale' }, staffContracts: { [role]: { signed: 1, ends: 1 } }, staffEval: { 1: rec({ staff: { [role]: 'hc_vale' }, pre: { team: 8, n: 16 }, res: { win: 8 - Math.round(P * 15), n: 16 } }) } }, role, 100000 * x); x = d.demand / 100000; } return x; };
  const ex = path(0.9), av = path(0), po = path(-0.3);
  assert.ok(ex >= 1.65 && ex <= 2.0, `excellent ${ex}`); assert.ok(av >= 1.0 && av <= 1.2, `average ${av}`); assert.ok(po >= 0.7 && po <= 1.0, `poor ${po}`);
  for (const role of ['head_coach', 'offensive_coordinator', 'defensive_coordinator', 'head_scout', 'monster_trainer']) assert.ok(STAFF.filter((c) => c.role === role).length >= 3, 'the unchanged candidate pool');
});
