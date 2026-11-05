// Task 7 — contract negotiations (owner 2026-11-05, 13:23): an opening demand, at most two counteroffers from the club per window, the
// monster's counters and final decision; extension refusals separate from the renewal; the same rules for the owner and the AI clubs.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as E from '../src/franchise/fa-engine.js';
import * as Save from '../src/franchise/save.js';
import { aiBargain, aiExtensions } from '../src/franchise/fa-ai.js';
import { AMBITIONS } from '../src/franchise/ambition.js';
import { leagueClubs, clubRoster } from '../src/franchise/league-registry.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

function seasonDone(seed) {
  const f = newFranchise(seed);
  for (let g = 0; g < 40 && !f.season.finished; g++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  return f;
}
const pool = (f) => leagueClubs(f).flatMap((c) => clubRoster(f, c).map((m) => ({ m, club: c }))).filter(({ m }) => !m.legendary && !m.signature && !m.contract?.permanent);
const as = (m, a) => Object.assign(Object.create(Object.getPrototypeOf(m)), m, { ambition: a });
const step = (x) => Math.round(x / 100) * 100;

test('the renewal: an opening demand, two counteroffers with counters, a final decision; accepting the demand is binding and free; nothing past the limit', () => {
  const f = seasonDone(101); const items = F.offseasonPending(f).filter((i) => i.kind === 'monster');
  assert.ok(items.length >= 5);
  let full = 0;
  for (const i of items) {
    const n0 = F.renewalTalks(f, i.id); if (!n0 || n0.state !== 'active') continue;
    assert.equal(i.ask, n0.opening.salary, 'the book shows his opening demand'); assert.equal(n0.left, 2);
    const r1 = F.resolveContract(f, i.id, 'offer', { salary: step(n0.demand.salary * 0.88) }); assert.ok(r1.ok, r1.reason);
    const n1 = F.renewalTalks(f, i.id);
    if (r1.status === 'countered') {
      assert.equal(n1.left, 1); assert.ok(r1.counter.salary < n0.demand.salary && r1.counter.salary >= step(n0.demand.salary * 0.88), 'a meaningful counter, between the offer and his demand');
      const m = f.roster.find((x) => x.id === i.id); const R = E.reservationAt(f, m, f.club, r1.counter.years, r1.counter.bonus); if (R != null) assert.ok(r1.counter.salary >= R, 'never below his reservation');
      const r2 = F.resolveContract(f, i.id, 'offer', { salary: step((r1.counter.salary + step(n0.demand.salary * 0.88)) / 2) }); assert.ok(['signed', 'declined'].includes(r2.status), `the second counteroffer gets a final decision (${r2.status})`);
      assert.equal(F.renewalTalks(f, i.id).left, 0); assert.equal(F.resolveContract(f, i.id, 'offer', { salary: 1 }).ok, false, 'nothing after the decision'); full++;
    } else assert.ok(['signed', 'declined'].includes(r1.status));
    if (full >= 3) break;
  }
  assert.ok(full >= 1, 'at least one full two-counteroffer negotiation');
  const left = F.offseasonPending(f).filter((i) => i.kind === 'monster' && F.renewalTalks(f, i.id)?.state === 'active')[0];
  if (left) { const a = F.resolveContract(f, left.id, 'sign'); assert.equal(a.status, 'signed', 'his demand, accepted, is binding'); const m = f.roster.find((x) => x.id === left.id); assert.equal(m.salary, left.ask); }
});

test('rules of the answer: closer offers are accepted more often; insults sometimes end the talks; every outcome stays possible; a counter is never his demand repeated', () => {
  const f = seasonDone(102); const P = pool(f).slice(0, 400); const c = { near: { accept: 0, counter: 0, end: 0 }, far: { accept: 0, counter: 0, end: 0 }, insult: { accept: 0, counter: 0, end: 0 } }; let same = 0;
  for (const [k, share] of [['near', 0.97], ['far', 0.88], ['insult', 0.6]]) for (const { m, club } of P) {
    const neg = E.negotiation(f, m, club, `probe-${k}`); if (neg.state !== 'active') continue;
    const r = E.negotiate(f, m, neg, { salary: step(neg.demand.salary * share), years: neg.demand.years, bonus: 0 });
    const a = r.outcome === 'agreed' ? 'accept' : r.outcome === 'countered' ? 'counter' : 'end'; c[k][a]++;
    if (r.outcome === 'countered' && r.counter.salary >= neg.opening.salary) same++;
  }
  const rate = (x) => x.accept / (x.accept + x.counter + x.end);
  assert.ok(rate(c.near) > rate(c.far), JSON.stringify(c)); assert.ok(c.insult.end > 0 && c.insult.counter > 0, 'an insult may end the talks, not always');
  assert.ok(c.far.end < c.insult.end, 'a reasonable offer rarely ends the talks');
  assert.ok(same / Math.max(1, c.near.counter + c.far.counter + c.insult.counter) < 0.2, 'counters move toward the offer');
});

test('persistence and no rerolls: attempts survive a save and reload; equal histories give equal answers; a closed negotiation cannot restart in its window', () => {
  const f = seasonDone(103); const i = F.offseasonPending(f).find((x) => x.kind === 'monster' && F.renewalTalks(f, x.id)?.state === 'active'); assert.ok(i);
  const n0 = F.renewalTalks(f, i.id); const r1 = F.resolveContract(f, i.id, 'offer', { salary: step(n0.demand.salary * 0.85) });
  const a = Save.importJson(Save.exportJson(f)); const b = Save.importJson(Save.exportJson(f));
  assert.equal(F.renewalTalks(a, i.id)?.left ?? 0, F.renewalTalks(f, i.id)?.left ?? 0, 'the attempt count is saved');
  if (r1.status === 'countered') { const x = F.resolveContract(a, i.id, 'offer', { salary: step(n0.demand.salary * 0.9) }); const y = F.resolveContract(b, i.id, 'offer', { salary: step(n0.demand.salary * 0.9) }); assert.equal(x.status, y.status, 'the same history, the same answer'); }
  // extension windows: a closed negotiation stays closed; asking again does not reopen it
  const g = seasonDone(104);
  for (const it of F.offseasonPending(g)) F.resolveContract(g, it.id, it.kind === 'staff' ? 'sign' : 'sign');
  for (const it of F.offseasonPending(g)) F.resolveContract(g, it.id, 'walk');
  assert.ok(F.openFreeAgency(g).ok);
  const m = g.roster.find((x) => E.extensionEligible(g, x) && F.extensionTalks(g, x.id)?.state === 'active');
  if (m) { let r; for (let k = 0; k < 4; k++) r = F.extendContract(g, m.id, { salary: step(F.extensionTalks(g, m.id).demand.salary * 0.6), years: 1, bonus: 0 }); const t = F.extensionTalks(g, m.id); assert.ok(t.offers.filter((o) => !o.free).length <= 2, 'never more than two counteroffers'); if (t.state !== 'agreed') assert.ok(r.ok === false || r.outcome !== 'signed'); }
});

test('extension refusal and renewal are separate decisions: a monster who would not talk early can still negotiate his renewal', () => {
  const f = seasonDone(105); let extNo = 0, both = 0;
  for (const { m, club } of pool(f)) { const e = E.negotiation(f, m, club, 'ext-pre', { peek: true }); if (e.state !== 'no-talks') continue; extNo++; if (E.negotiation(f, m, club, 'renew', { peek: true }).state === 'active') both++; }
  assert.ok(extNo > 10); assert.ok(both / extNo > 0.3, `${both} of ${extNo} who decline early talks negotiate the renewal`);
  let renewNo = 0, n = 0; for (const { m, club } of pool(f)) { n++; if (E.negotiation(f, m, club, 'renew', { peek: true }).state === 'no-talks') renewNo++; }
  assert.ok(renewNo > 0 && renewNo < extNo, 'some still decline to negotiate the renewal (testing free agency), fewer than decline early talks');
});

test('cap and validity: an offer the cap cannot carry is refused before it counts', () => {
  const f = seasonDone(106); const i = F.offseasonPending(f).find((x) => x.kind === 'monster' && F.renewalTalks(f, x.id)?.state === 'active'); assert.ok(i);
  const keep = f.pendingDeadCap; f.pendingDeadCap = 50_000_000; const r = F.resolveContract(f, i.id, 'offer', { salary: i.ask }); assert.equal(r.ok, false); assert.equal(r.code, 'cap'); assert.equal(F.renewalTalks(f, i.id).left, 2, 'not counted'); f.pendingDeadCap = keep;
});

test('Ambition shapes the whole negotiation (demands, counters, decisions), never with certainty', () => {
  const f = seasonDone(107); const P = pool(f).slice(0, 300); const clubs = E.allClubs(f); const out = clubs.map((c) => [c, E.clubOutlook(f, c)]).sort((a, b) => a[1] - b[1]); const weak = out[0][0], strong = out.at(-1)[0];
  const demand = (m, club, a, w = 'probe-d') => E.negotiation(f, as(m, a), club, `${w}-${a}`, { peek: true }).opening.salary / E.askOf(f, m).salary;
  const meanD = (a, clubOf) => { const v = P.map(({ m, club }) => demand(m, clubOf ? clubOf : club, a)); return v.reduce((s, x) => s + x, 0) / v.length; };
  assert.ok(meanD('money') > Math.max(meanD('loyalty'), meanD('opportunity')), 'Money demands more on average');
  assert.ok(meanD('championship', strong) < meanD('championship', weak), 'Championship asks less from a contender');
  assert.ok(meanD('championship', weak) - meanD('championship', strong) > meanD('money', weak) - meanD('money', strong), 'and more than others do');
  const home = f.roster.filter((m) => E.homeFor(f, m, f.club)).slice(0, 30);
  if (home.length >= 5) { const d = (a) => home.reduce((s, m) => s + E.negotiation(f, as(m, a), f.club, `probe-h-${a}`, { peek: true }).opening.salary, 0); assert.ok(d('loyalty') < d('opportunity') && d('loyalty') < d('money'), 'Loyalty asks less at home'); }
  // every Ambition both accepts and rejects some offers at 92% of the opening
  for (const a of AMBITIONS) { const r = { agreed: 0, other: 0 }; for (const { m, club } of P) { const mm = as(m, a); const neg = E.negotiation(f, mm, club, `probe-x-${a}`); if (neg.state !== 'active') continue; const x = E.negotiate(f, mm, neg, { salary: step(neg.demand.salary * 0.92), years: neg.demand.years, bonus: 0 }); r[x.outcome === 'agreed' ? 'agreed' : 'other']++; } assert.ok(r.agreed > 0 && r.other > 0, `${a}: ${JSON.stringify(r)}`); }
});

test('owner and AI parity: AI clubs negotiate with the same engine — compromises, failures and openings accepted all occur; never more than two counteroffers', () => {
  const f = seasonDone(108);
  for (const i of F.offseasonPending(f)) F.resolveContract(f, i.id, 'sign'); for (const i of F.offseasonPending(f)) F.resolveContract(f, i.id, 'walk');
  assert.ok(F.openFreeAgency(f).ok);
  const ext = f.freeAgency.steps[f.season.year].ext; assert.ok(ext.offered > 20, JSON.stringify(ext));
  assert.ok(ext.accepted > 0 && ext.compromised > 0 && ext.rejected + ext.declined > 0, `AI outcomes vary: ${JSON.stringify({ a: ext.accepted, c: ext.compromised, r: ext.rejected, d: ext.declined })}`);
  for (const n of Object.values(f.freeAgency.talks)) assert.ok(n.offers.filter((o) => !o.free).length <= 2, `${n.key}: at most two counteroffers`);
  const renewals = f.leagueOffseason.contracts; assert.ok(renewals.resigned > 0 && renewals.declined > 0, 'AI renewals are negotiated and sometimes fail');
  assert.equal(typeof aiBargain, 'function'); assert.equal(typeof aiExtensions, 'function');
});
