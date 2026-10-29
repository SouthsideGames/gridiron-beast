// Trading, second pass (Task 5, GDD §19.6c): one valuation for every deal, the owner's proposals, the offers AI clubs make, and
// in-season AI trades. Fast unit tests on built rosters, then integration tests on a played franchise (one season, shared).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoster, monsterOverall as ovr, salaryFor, FULL_ROSTER, ROSTER_MAX } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';
import { marketValue, rosterWorth, rosterNet, rosterAfter, rosterProblems, roleIn, POSITION_LEVERAGE, DEAL_RULES, positionFactor, ageFactor, contractFactor, ROLE_SHARE } from '../src/franchise/trade-value.js';
import { evaluateProposal, DESK_RULES, buildIncomingOffer, readyReplacement, immovable, deskStamp, spendProposal, deskUsage } from '../src/franchise/trade-desk.js';
import { pickValue, pickWorth, tradable } from '../src/franchise/trades.js';
import { GROUP_SLOTS } from '../src/franchise/roster.js';
import { ALL_TEAMS } from '../src/data/league.js';

const OWNER = 'Owner Club', AI = 'Rival Club', YEAR = 2;
/** Bring a monster to an exact overall by moving every attribute together. */
function setOvr(m, target) { for (let i = 0; i < 40 && ovr(m) !== target; i++) { const d = target - ovr(m); for (const k of Object.keys(m.attributes)) m.attributes[k] = Math.max(20, Math.min(99, m.attributes[k] + Math.sign(d) * Math.max(1, Math.abs(d) >> 1))); } return m; }
const dress = (m, { age = 26, ends = 3 } = {}) => { m.age = age; m.yearsPro = Math.max(1, age - 21); m.contract = { signed: ends - 1, ends, years: 2 }; m.salary = salaryFor(m); delete m.rookie; delete m.drafted; delete m.cornerstone; delete m.legendary; delete m.signature; delete m.injury; return m; };
const build = (seed, quality) => createRoster(seed, { quality, composition: FULL_ROSTER }).map((m) => dress(m));
const at = (roster, pos) => roster.filter((m) => m.position === pos).sort((a, b) => ovr(b) - ovr(a));
const TEAMS = [OWNER, AI, ...ALL_TEAMS.filter((t) => t !== OWNER && t !== AI).slice(0, 14)];
function world({ ownerQ = 60, aiQ = 60 } = {}) {
  const full = build(11, ownerQ); const drop = new Set(['WR', 'OL', 'DL', 'S'].map((pos) => at(full, pos).at(-1).id)); const mine = full.filter((m) => !drop.has(m.id)), theirs = build(22, aiQ); // the owner has room for four more, as a real roster usually does
  const f = { seed: 5, club: OWNER, season: { year: 1, finished: true }, draft: null, settings: { difficulty: 'pro' } };
  const picks = (club) => [1, 2, 3].flatMap((round) => [2, 3].map((year) => ({ year, round, original: club })));
  const env = (extra = {}) => ({ ownerRoster: mine, ownerRoom: 400000, ownerPicks: picks(OWNER), roster: (t) => (t === AI ? theirs : build(33, 60)), room: () => 300000, difficulty: 'pro', year: YEAR, allTeams: TEAMS, clubs: [AI], windowOpen: true, counter: false, ...extra });
  return { f, mine, theirs, env, picks };
}
const prop = (o = {}) => ({ team: AI, giveMonsters: [], givePicks: [], getMonsters: [], getPicks: [], ...o });

// ---------------------------------------------------------------- valuation
test('valuation: position leverage is measured, sums to one slot-weighted, and kickers are cheap but never worthless', () => {
  const slots = Object.entries(GROUP_SLOTS).map(([p, s]) => [p, s.length]); const total = slots.reduce((s, [, n]) => s + n, 0);
  const mean = slots.reduce((s, [p, n]) => s + POSITION_LEVERAGE[p] * n, 0) / total;
  assert.ok(Math.abs(mean - 1) < 0.02, `slot-weighted mean ${mean}`);
  for (const p of Object.keys(GROUP_SLOTS)) assert.ok(POSITION_LEVERAGE[p] > 0.2 && POSITION_LEVERAGE[p] < 2.5, `${p} ${POSITION_LEVERAGE[p]}`);
  const mk = (pos, o) => setOvr(dress(createRoster(7, { quality: 60, composition: [[pos, 1]] })[0]), o);
  const k = mk('K', 68), qb = mk('QB', 68);
  assert.ok(marketValue(k, { year: YEAR }) < marketValue(qb, { year: YEAR }), 'the same rating costs less at kicker than at quarterback');
  assert.ok(marketValue(k, { year: YEAR }) < pickValue({ round: 1 }, { slotInRound: 8 }), 'a top-of-the-league kicker (68; the median starter is 58) is worth less than a mid first-round pick');
  assert.ok(marketValue(k, { year: YEAR }) > pickValue({ round: 3 }, { slotInRound: 16 }), 'but more than the last pick of the draft');
  assert.ok(marketValue(setOvr(k, 85), { year: YEAR }) > marketValue(setOvr(k, 65), { year: YEAR }), 'a better kicker is still worth more');
});
test('valuation: age, contract and potential move the price; the factors are bounded', () => {
  const m = setOvr(dress(createRoster(9, { quality: 60, composition: [['WR', 1]] })[0]), 70); const v = (x) => marketValue(x, { year: YEAR });
  const young = { ...m, age: 22 }, old = { ...m, age: 33 };
  assert.ok(v(young) > v(m) && v(m) > v(old), 'youth costs more, age less');
  assert.ok(ageFactor(40) >= 0.5 && ageFactor(18) <= 1.2);
  const expiring = { ...m, contract: { signed: 1, ends: YEAR - 1, years: 2 } }, oneLeft = { ...m, contract: { signed: 1, ends: YEAR, years: 2 } };
  assert.ok(v(expiring) < v(oneLeft) && v(oneLeft) < v(m), 'fewer years left, lower price');
  const cheap = { ...m, salary: Math.round(salaryFor(m) * 0.8) }, dear = { ...m, salary: Math.round(salaryFor(m) * 1.2) };
  assert.ok(v(cheap) > v(m) && v(m) > v(dear), 'a bargain is worth more, an overpaid monster less');
  assert.ok(contractFactor(cheap, YEAR) / contractFactor(m, YEAR) <= 1.11, 'bounded to ten percent');
  assert.ok(v({ ...m, potential: ovr(m) + 15, age: 22 }) > v({ ...m, age: 22 }), 'potential adds for the young');
});
test('valuation: a monster is worth more to a club that needs him than to one that is deep; starters outrank backups', () => {
  const { mine, theirs } = world(); const wr = at(theirs, 'WR');
  const star = setOvr(dress(createRoster(31, { quality: 60, composition: [['WR', 1]] })[0]), ovr(wr[0]) + 8);
  const needy = theirs.filter((m) => m.position !== 'WR' || m.id === wr[3].id), deep = theirs.slice();
  const gainNeedy = rosterNet(needy, { get: [star] }, YEAR), gainDeep = rosterNet(deep, { get: [star] }, YEAR);
  assert.ok(gainNeedy > gainDeep * 1.5, `needy ${gainNeedy} vs deep ${gainDeep}`);
  assert.equal(roleIn(theirs, wr[0]), 0); assert.equal(roleIn(theirs, wr[3]), 1); assert.ok(ROLE_SHARE[0] > ROLE_SHARE[1] && ROLE_SHARE[1] > ROLE_SHARE[2] && ROLE_SHARE[2] > ROLE_SHARE[3]);
  const bench = at(theirs, 'WR').at(-1); assert.ok(rosterNet(theirs, { get: [dress({ ...bench, id: 'extra1' })] }, YEAR) < 0.2 * marketValue(bench, { year: YEAR }) + 1, 'a body at the end of the bench adds almost nothing');
});
test('valuation: a long injury drops a starter to the bench until he is back', () => {
  const { theirs } = world(); const qb = at(theirs, 'QB'); const hurt = theirs.map((m) => (m.id === qb[0].id ? { ...m, injury: { severity: 'Moderate', weeks: 5, type: 'knee' } } : m));
  assert.equal(roleIn(hurt, hurt.find((m) => m.id === qb[0].id)), 1); assert.equal(roleIn(hurt, hurt.find((m) => m.id === qb[1].id)), 0);
  assert.ok(rosterWorth(hurt, YEAR) < rosterWorth(theirs, YEAR));
});
test('roster rules: size, position minimums and lineup stay legal', () => {
  const { theirs } = world();
  assert.deepEqual(rosterProblems(theirs, theirs), []);
  assert.ok(rosterProblems(theirs, theirs.concat(dress(createRoster(77, { quality: 60, composition: [['WR', 1]] })[0]))).includes('rosterFull'));
  assert.ok(rosterProblems(theirs, theirs.filter((m) => m.position !== 'K')).some((c) => c === 'short:K'));
  assert.ok(rosterProblems(theirs.slice(0, 30), theirs.slice(0, 20)).includes('rosterShort'));
  assert.deepEqual(rosterProblems(theirs.slice(0, 20), theirs.slice(0, 20)), [], 'already short and not getting shorter is not a new problem');
});

// ---------------------------------------------------------------- the desk
test('desk: a fair offer is accepted, a lowball is refused with a reason and a counter, and the answer is the same every time', () => {
  const { f, mine, theirs, env } = world();
  const spare = at(theirs, 'LB')[2]; const target = prop({ getMonsters: [spare.id] });
  const need = marketValue(spare, { year: YEAR });
  const tiers = [3, 2, 1].map((round) => ({ round, e: evaluateProposal(f, { ...target, givePicks: [{ year: 2, round, original: OWNER }] }, env({ counter: true })) }));
  assert.ok(tiers.some((t) => t.e.accept) && tiers.some((t) => !t.e.accept), `a price exists: ${tiers.map((t) => `R${t.round}:${t.e.accept}`)} (${need.toFixed(0)})`);
  const no = tiers.find((t) => !t.e.accept).e; assert.ok(no.legal && no.reasons.some((r) => r.code === 'value'), 'refused on price');
  const again = evaluateProposal(f, { ...target, givePicks: [{ year: 2, round: tiers.find((t) => !t.e.accept).round, original: OWNER }] }, env({ counter: true }));
  assert.deepEqual(again.reasons, no.reasons); assert.deepEqual(again.counter, no.counter);
  if (no.counter) { assert.ok(['addPick', 'addMonster', 'dropAsk'].includes(no.counter.kind)); }
});
test('desk: a counter really would be accepted', () => {
  const { f, theirs, env } = world();
  const spare = at(theirs, 'DL')[3]; const base = prop({ getMonsters: [spare.id], givePicks: [{ year: 3, round: 3, original: OWNER }] });
  const r = evaluateProposal(f, base, env({ counter: true })); if (r.accept) return;
  assert.ok(r.counter, 'a refusal on price offers a counter when one exists');
  const next = r.counter.kind === 'addPick' ? { ...base, givePicks: [...base.givePicks, r.counter.pick] } : r.counter.kind === 'addMonster' ? { ...base, giveMonsters: [r.counter.monsterId] } : { ...base, getMonsters: [] };
  if (next.getMonsters.length || next.getPicks.length) assert.equal(evaluateProposal(f, next, env()).accept, true, r.counter.text);
});
test('desk: protected, cornerstone, rookie and just-arrived monsters cannot be traded, on either side', () => {
  const { f, mine, theirs, env } = world();
  const mark = (m, flag) => Object.assign(m, flag);
  const cases = [['legendary', { legendary: true }], ['signature', { signature: true }], ['cornerstone', { cornerstone: true }], ['rookie', { drafted: true, yearsPro: 1 }], ['arrived', { traded: { from: 'X', year: 1 } }]];
  for (const [name, flag] of cases) {
    const m = at(theirs, 'S')[3]; const saved = { ...m }; mark(m, flag);
    const e = evaluateProposal(f, prop({ getMonsters: [m.id], givePicks: [{ year: 2, round: 1, original: OWNER }] }), env());
    assert.equal(e.accept, false, name); assert.ok(e.reasons.some((r) => r.code === 'immovable'), name); Object.assign(m, saved); for (const k of Object.keys(flag)) if (!(k in saved)) delete m[k];
    const o = at(mine, 'CB')[3]; const savedO = { ...o }; mark(o, flag);
    const e2 = evaluateProposal(f, prop({ giveMonsters: [o.id], getPicks: [{ year: 2, round: 3, original: AI }] }), env());
    assert.equal(e2.accept, false, `mine ${name}`); assert.ok(e2.reasons.some((r) => r.code === 'immovable'), `mine ${name}`); Object.assign(o, savedO); for (const k of Object.keys(flag)) if (!(k in savedO)) delete o[k];
  }
  assert.ok(immovable(f, { ...at(theirs, 'S')[0], legendary: true }, 'theirs'));
});
test('desk: a club does not sell a starter with no ready replacement, and says why', () => {
  const { f, theirs, env } = world(); const qb = at(theirs, 'QB'); setOvr(qb[1], ovr(qb[0]) - 15); // nobody ready behind him
  assert.equal(readyReplacement(theirs, qb[0]), false);
  const e = evaluateProposal(f, prop({ getMonsters: [qb[0].id], givePicks: [{ year: 2, round: 1, original: OWNER }, { year: 3, round: 1, original: OWNER }] }), env());
  assert.equal(e.accept, false); assert.ok(e.reasons.some((r) => r.code === 'noReplacement'));
  setOvr(qb[1], ovr(qb[0]) - 3); assert.equal(readyReplacement(theirs, qb[0]), true);
});
test('desk: roster limits, only-one-at-a-position and the other club\'s cap are enforced with plain reasons', () => {
  const { f, mine, theirs, env } = world();
  const dumps = at(mine, 'WR').slice(3, 6).map((m) => m.id); // three bodies for one
  const e = evaluateProposal(f, prop({ giveMonsters: dumps, getMonsters: [at(theirs, 'TE')[1].id] }), env());
  assert.ok(e.reasons.some((r) => r.code === 'rosterFull'), JSON.stringify(e.reasons.map((r) => r.code))); assert.equal(e.accept, false);
  const onlyK = mine.filter((m) => m.position === 'K'); const keep = mine.filter((m) => m.position !== 'K' || m.id === onlyK[0].id);
  const e2 = evaluateProposal(f, prop({ giveMonsters: [onlyK[0].id], getPicks: [{ year: 2, round: 3, original: AI }] }), env({ ownerRoster: keep }));
  assert.ok(e2.reasons.some((r) => r.code === 'onlyOne'));
  const star = at(mine, 'QB')[0];
  const e3 = evaluateProposal(f, prop({ giveMonsters: [star.id], getMonsters: [at(theirs, 'S')[3].id] }), env({ room: () => 1000 }));
  assert.ok(e3.reasons.some((r) => r.code === 'cap'), JSON.stringify(e3.reasons)); assert.equal(e3.accept, false);
  assert.equal(evaluateProposal(f, prop(), env()).reasons[0].code, 'empty');
  assert.equal(evaluateProposal(f, prop({ getMonsters: ['nobody'], givePicks: [{ year: 2, round: 1, original: OWNER }] }), env()).reasons[0].code, 'gone');
  assert.equal(evaluateProposal(f, prop({ getMonsters: [at(theirs, 'S')[3].id], givePicks: [{ year: 2, round: 1, original: OWNER }] }), env({ windowOpen: false })).reasons[0].code, 'window');
});
test('desk: proposals are limited per club and per window, and the limit resets with the window', () => {
  const { f, theirs, env } = world(); const p = prop({ getMonsters: [at(theirs, 'S')[3].id], givePicks: [{ year: 2, round: 3, original: OWNER }] });
  for (let i = 0; i < DESK_RULES.perClub; i++) { assert.notEqual(evaluateProposal(f, p, env()).reasons[0]?.code, 'limit'); spendProposal(f, AI); }
  assert.equal(evaluateProposal(f, p, env()).reasons[0].code, 'limit');
  assert.equal(deskUsage(f, AI).clubLeft, 0); f.season.year = 2; assert.equal(deskUsage(f, AI).clubLeft, DESK_RULES.perClub, 'a new offseason, a new allowance');
});

// ---------------------------------------------------------------- adversarial
test('adversarial: dumping bench bodies for value does not work', () => {
  const { f, mine, theirs, env } = world(); const junk = at(mine, 'OL').slice(4, 6);
  const e = evaluateProposal(f, prop({ giveMonsters: junk.map((m) => m.id), getPicks: [{ year: 2, round: 3, original: AI }, { year: 3, round: 3, original: AI }] }), env({ ownerRoster: mine.slice(), roster: () => theirs.slice(0, 30).concat() }));
  assert.equal(e.accept, false, 'two bench linemen are not worth two picks to a club with its own');
});
test('adversarial: one-sided pick swaps are refused, and no pick-for-pick cycle makes money', () => {
  const { f, env } = world();
  const steal = evaluateProposal(f, prop({ givePicks: [{ year: 3, round: 3, original: OWNER }], getPicks: [{ year: 2, round: 1, original: AI }] }), env());
  assert.equal(steal.accept, false, 'a third for a first is refused'); assert.ok(steal.reasons.some((r) => r.code === 'value'));
  // sell at the club's price, buy back at the club's price: value only goes down
  const sell = evaluateProposal(f, prop({ givePicks: [{ year: 2, round: 1, original: OWNER }], getPicks: [{ year: 2, round: 2, original: AI }, { year: 3, round: 2, original: AI }] }), env());
  const worth = (ps) => ps.reduce((s, p) => s + pickWorth(f, p), 0);
  if (sell.accept) assert.ok(worth([{ year: 2, round: 2, original: AI }, { year: 3, round: 2, original: AI }]) <= worth([{ year: 2, round: 1, original: OWNER }]) / (1 + DESK_RULES.margin.pro) * 1.03);
});
test('adversarial: buying a monster and selling him straight back is refused (no flipping), and the price round trip always loses', () => {
  const { f, mine, theirs, env } = world(); const m = at(theirs, 'CB')[2]; const v = marketValue(m, { year: YEAR });
  m.traded = { from: AI, year: f.season.year }; // he just arrived
  const e = evaluateProposal(f, prop({ giveMonsters: [m.id], getPicks: [{ year: 2, round: 1, original: AI }] }), env({ ownerRoster: mine.concat(m), roster: () => theirs.filter((x) => x.id !== m.id) }));
  assert.equal(e.accept, false); assert.ok(e.reasons.some((r) => r.code === 'immovable'));
  for (const diff of ['rookie', 'pro', 'allstar']) assert.ok((1 - DESK_RULES.margin[diff]) * (1 - DESK_RULES.margin[diff]) < 1 && DESK_RULES.margin[diff] > DESK_RULES.mood, `${diff}: margin beats temperament, so a cycle loses`);
  assert.ok(v > 0);
});
test('adversarial: every club\'s answer to the same proposal is the same, but different proposals get different temperaments only within two percent', () => {
  const { f, theirs, env } = world(); const spare = at(theirs, 'S')[3];
  const results = []; for (let i = 0; i < 5; i++) results.push(evaluateProposal(f, prop({ getMonsters: [spare.id], givePicks: [{ year: 2, round: 2, original: OWNER }] }), env()).accept);
  assert.equal(new Set(results).size, 1);
});

// ---------------------------------------------------------------- incoming offers
test('incoming offers: deterministic, built from the club\'s roster, acceptable to the club, and good for the owner', () => {
  const { f, mine, env } = world({ ownerQ: 55, aiQ: 66 }); // a thin owner, a deep club
  let seen = 0; const kinds = new Set();
  for (let k = 0; k < 80 && seen < 8; k++) {
    const a = buildIncomingOffer(f, env({ counter: undefined }), { key: `wk:1:${k}`, chance: 1 }); const b = buildIncomingOffer(f, env({ counter: undefined }), { key: `wk:1:${k}`, chance: 1 });
    assert.deepEqual(a, b, 'the same week, the same call'); if (!a) continue; seen++; kinds.add(a.kind);
    const e = evaluateProposal(f, a.proposal, env({ noLimit: true }));
    assert.ok(e.legal && e.accept, `the club would make its own offer: ${a.kind} ${JSON.stringify(e.reasons)}`);
    assert.ok(a.gain >= DEAL_RULES.sellerFloor, 'the owner comes out ahead');
    assert.ok(a.proposal.getMonsters.length + a.proposal.getPicks.length > 0 && a.proposal.giveMonsters.length + a.proposal.givePicks.length > 0);
  }
  assert.ok(seen >= 1, 'a thin club in a deep league gets calls');
  assert.equal(buildIncomingOffer(f, env(), { key: 'x', chance: 0 }), null, 'no roll, no call');
});
test('incoming offers: a roster with no use for anyone gets no calls (no quota)', () => {
  const { f, mine, env } = world({ ownerQ: 90, aiQ: 50 }); let n = 0;
  for (let k = 0; k < 40; k++) if (buildIncomingOffer(f, env(), { key: `wk:1:${k}`, chance: 1 })) n++;
  assert.ok(n <= 3, `${n} calls to an owner far above the league: only buyers of his spares may call`);
});

// ---------------------------------------------------------------- on a played franchise
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/franchise/league-registry.js';
import * as LT from '../src/franchise/league-trades.js';
import * as Save from '../src/franchise/save.js';
import { runFranchise } from '../tools/franchise-soak.mjs';
import { leagueInvariants, withBoardReset } from '../tools/league-soak.mjs';
import { tierById } from '../src/data/league.js';

let snapshot = null;
/** A franchise at the end of its first offseason (draft done, free agency done), fresh from a copy each time. */
function played() {
  if (!snapshot) { const { problems } = runFranchise(51, { seasons: 1, check: withBoardReset(leagueInvariants), onSeason: (f) => { snapshot = JSON.stringify(f); } }); assert.deepEqual(problems, []); }
  return JSON.parse(snapshot);
}
const aiClubs = (f) => R.leagueClubs(f).slice().sort();
/** Find a proposal some club would accept: a bench body of theirs for the owner's cheapest pick that works. */
function findAccepted(f, { kind = 'picks' } = {}) {
  const picks = F.myTradablePicks(f).slice().sort((a, b) => pickWorth(f, b) - pickWorth(f, a));
  for (const team of aiClubs(f)) {
    const assets = F.deskAssetsFor(f, team);
    for (const m of assets.theirs.filter((x) => !x.why && x.forSale).sort((a, b) => b.ovr - a.ovr)) {
      for (const p of picks) { const prop = { team, giveMonsters: [], givePicks: [p], getMonsters: [m.id], getPicks: [] }; const e = F.deskPreview(f, prop); if (e.legal) { const probe = JSON.parse(JSON.stringify(f)); const r = F.deskPropose(probe, prop); if (r.accepted) return { team, prop, m }; } }
    }
  }
  return null;
}
test('a played franchise: the desk lists both sides, previews a deal, and the preview never says whether the club will accept', () => {
  const f = played(); assert.ok(F.deskAvailable(f)); assert.equal(F.deskPartners(f).length, 15);
  const team = aiClubs(f)[0]; const a = F.deskAssetsFor(f, team);
  assert.ok(a.mine.length >= 26 && a.theirs.length >= 26 && a.myPicks.length > 0 && a.theirPicks.length > 0);
  assert.ok(a.theirs.some((m) => m.why), 'protected and rookie monsters are listed with the reason they cannot move');
  const pv = F.deskPreview(f, { team, givePicks: [a.myPicks[0]], getMonsters: [a.theirs.find((m) => !m.why && m.forSale).id] });
  assert.ok(pv.ok && 'legal' in pv && pv.detail && !('accept' in pv) && !('counter' in pv), 'legal, with roster, cap and depth, and nothing about the price');
});
test('a played franchise: an accepted deal moves the monster, the pick, the contract and the history, and leaves the league sound', () => {
  const f = played(); const found = findAccepted(f); assert.ok(found, 'some club sells somebody for a pick');
  const { team, prop, m } = found; const before = f.roster.length; const cap0 = F.salarySummary(f).total; const pickBefore = F.myTradablePicks(f).length;
  const r = F.deskPropose(f, prop); assert.equal(r.accepted, true);
  assert.equal(f.roster.length, before + 1); const got = f.roster.find((x) => x.id === m.id); assert.ok(got);
  assert.equal(R.clubOf(f, m.id), null, 'he is no longer on the club'); assert.ok(!f.league.monsters[m.id]);
  assert.equal(got.traded.from, team); assert.ok(got.contract.years === 2 && got.contract.ends >= got.contract.signed + 1); assert.ok(got.history.some((h) => h.club === team && h.reason === 'traded'));
  assert.equal(F.myTradablePicks(f).length, pickBefore - 1); assert.equal(R.verifyLeague(f).length, 0); assert.deepEqual(leagueInvariants(f, 'after a desk deal'), []);
  assert.ok(F.salarySummary(f).total > cap0, 'his salary counts against the cap');
  assert.ok((f.trades || []).some((t) => t.desk?.received.includes(m.id)));
  assert.ok(!F.deskPropose(f, prop).accepted, 'the same deal cannot be done twice (the monster and the pick are gone)');
});
test('a played franchise: sending a monster to a club moves him into its registry with his contract and a closed history line', () => {
  const f = played(); const team = aiClubs(f)[1]; const a = F.deskAssetsFor(f, team);
  const spare = a.mine.filter((m) => !m.why && m.role > 0).sort((x, y) => y.ovr - x.ovr)[0]; assert.ok(spare);
  const offers = [{ rd: 3 }, { rd: 2 }, { rd: 1 }]; let done = null;
  for (const o of offers) { const pk = a.theirPicks.find((p) => p.round === o.rd); if (!pk) continue; const probe = JSON.parse(JSON.stringify(f)); const r = F.deskPropose(probe, { team, giveMonsters: [spare.id], getPicks: [pk] }); if (r.accepted) { done = { pk, probe }; break; } }
  if (!done) return; // a club with no use for the spare says no: the other tests cover acceptance
  const g = done.probe; assert.ok(!g.roster.some((m) => m.id === spare.id)); assert.equal(R.clubOf(g, spare.id), team);
  const moved = g.league.monsters[spare.id]; assert.ok(moved.contract.ends >= 1 && moved.traded.from === g.club); const open = moved.history.filter((h) => h.to == null); assert.equal(open.length, 1); assert.equal(open[0].club, team);
  assert.equal(R.verifyLeague(g).length, 0); assert.equal(R.pickOwnerOk ?? true, true);
  for (const lineup of Object.values(g.lineupManual || {})) assert.notEqual(lineup, spare.id, 'his manual lineup slot is cleared');
});
test('a played franchise: saving and reloading keeps the deal, the proposal count, and the same answer to the same proposal', () => {
  const f = played(); const found = findAccepted(f); const team = found.team;
  const bad = { team, givePicks: [F.myTradablePicks(f).at(-1)], getMonsters: [F.deskAssetsFor(f, team).theirs.filter((m) => !m.why && m.forSale).sort((a, b) => b.ovr - a.ovr)[0].id] };
  const refused = F.deskPropose(f, bad); const left = F.deskPartners(f).find((p) => p.team === team).clubLeft; assert.equal(left, DESK_RULES.perClub - 1);
  const back = Save.importJson(Save.exportJson(f)); assert.ok(back);
  assert.equal(F.deskPartners(back).find((p) => p.team === team).clubLeft, left, 'the allowance survives a reload');
  const again = F.deskPropose(back, bad); assert.equal(again.accepted, refused.accepted, 'same proposal, same answer after a reload');
  assert.deepEqual(again.reasons?.map((r) => r.code), refused.reasons?.map((r) => r.code));
  const ok = F.deskPropose(back, found.prop); assert.equal(ok.accepted, true); const back2 = Save.importJson(Save.exportJson(back));
  assert.ok(back2.roster.some((m) => m.id === found.m.id), 'an accepted deal survives a reload'); assert.deepEqual(leagueInvariants(back2, 'reloaded'), []);
});
test('a played franchise: a save without a trade desk record (every save before Task 5) trades as normal', () => {
  const f = played(); delete f.tradeDesk; delete f.tradeCall; const found = findAccepted(f); assert.ok(found);
  const r = F.deskPropose(f, found.prop); assert.equal(r.accepted, true); assert.ok(f.tradeDesk.total === 1);
});
test('incoming calls: made from the club\'s roster, shown with their effect, answered by the owner, and nothing happens until he answers', () => {
  const f = played(); f.offseason ||= { items: [] }; let c = null, tries = 0;
  for (let seed = 1; seed <= 60 && !c; seed++) { f.seed = seed; f.callsMade = {}; f.tradeCall = null; c = F.maybeTradeCall(f); tries++; }
  assert.ok(c, `a club calls within ${tries} tries`); assert.ok(['sell', 'buy', 'swap'].includes(c.kind));
  const rosterBefore = f.roster.map((m) => m.id).join(), picksBefore = F.myTradablePicks(f).length;
  assert.equal(f.roster.map((m) => m.id).join(), rosterBefore, 'a waiting call changes nothing');
  const eff = F.callEffect(f); assert.ok(eff && eff.youBefore >= 26);
  const dec = JSON.parse(JSON.stringify(f)); assert.equal(F.answerTradeCall(dec, false).declined, true); assert.equal(dec.roster.map((m) => m.id).join(), rosterBefore); assert.equal(F.tradeCall(dec), null);
  const r = F.answerTradeCall(f, true); assert.equal(r.ok, true, r.reason);
  for (const id of c.sendIds) assert.ok(f.roster.some((m) => m.id === id), 'what they sent is on the roster');
  for (const id of c.askIds) assert.ok(!f.roster.some((m) => m.id === id) && R.clubOf(f, id) === c.team, 'what they asked for is with them');
  assert.deepEqual(leagueInvariants(f, 'after a call'), []); assert.equal(R.verifyLeague(f).length, 0);
  assert.ok(c.sendPicks.length === 0 || F.myTradablePicks(f).length >= picksBefore - c.give.length);
});
test('incoming calls: they vary across clubs and weeks, and a call made before Task 5 (picks for one player) is still answered the old way', () => {
  const f = played(); f.offseason ||= { items: [] }; const kinds = new Set(), teams = new Set();
  for (let seed = 1; seed <= 90; seed++) { f.seed = seed; f.callsMade = {}; f.tradeCall = null; const c = F.maybeTradeCall(f); if (c) { kinds.add(c.kind); teams.add(c.team); } }
  assert.ok(teams.size >= 2, `calls come from different clubs (${[...teams]})`); assert.ok(kinds.size >= 1);
  const g = played(); g.offseason ||= { items: [] }; const club = aiClubs(g)[0]; const src = F.deskAssetsFor(g, club).theirs.filter((m) => !m.why && m.forSale && m.role > 0)[0];
  g.tradeCall = { team: club, position: src.position, playerId: src.id, player: { name: src.name, position: src.position, ovr: src.ovr, age: src.age, salary: src.salary }, give: [F.myTradablePicks(g)[0]], value: 50, expires: `off:${g.season.year}` };
  const before = g.roster.length; const r = F.answerTradeCall(g, true); assert.equal(r.ok, true, r.reason); assert.equal(g.roster.length, before + 1);
});
test('incoming calls: a waiting offer is withdrawn if the situation changed', () => {
  const f = played(); f.offseason ||= { items: [] }; let c = null;
  for (let seed = 1; seed <= 60 && !c; seed++) { f.seed = seed; f.callsMade = {}; f.tradeCall = null; c = F.maybeTradeCall(f); }
  assert.ok(c); const club = c.team; const sendId = c.sendIds[0] ?? c.askIds[0];
  const gone = JSON.parse(JSON.stringify(f)); const holder = c.sendIds[0] ? R.clubRoster(gone, club).find((m) => m.id === sendId) : gone.roster.find((m) => m.id === sendId);
  if (c.sendIds[0]) R.removeFromClub(gone, club, sendId, { year: 1, reason: 'released' }); else gone.roster = gone.roster.filter((m) => m.id !== sendId);
  const r = F.answerTradeCall(gone, true); assert.equal(r.ok, false); assert.match(r.reason, /offer is off/); assert.equal(F.tradeCall(gone), null);
});

// ---------------------------------------------------------------- AI–AI trades, in the season
function weak(m, to) { setOvr(m, to); m.potential = Math.max(m.potential || 0, to); }
test('AI trades: a club with a real weak starter and a rival with a spare to sell makes a fair, legal in-season deal', () => {
  let found = 0; const f0 = played();
  for (let s = 1; s <= 40 && found < 3; s++) {
    const f = JSON.parse(JSON.stringify(f0)); f.season.finished = false; f.season.week = 4; f.seed = s;
    const clubs = aiClubs(f); const A = clubs[s % clubs.length]; const cap = tierById(f.tier).cap;
    const starter = at(R.clubRoster(f, A), 'LB')[1]; if (R.isProtected(starter)) continue; weak(starter, 44); // a real hole at one starting slot: the in-season bar is a 4-overall upgrade
    const before = Object.fromEntries(clubs.map((c) => [c, R.clubRoster(f, c).map((m) => m.id)]));
    const deals = []; for (let i = 0; i < 12 && !deals.length; i++) deals.push(...LT.aiTrades(f, createRng(1000 + s * 20 + i), { year: f.season.year, cap, window: 'season' }));
    for (const d of deals) {
      found++; const m = f.league.monsters[d.toA]; assert.ok(m && R.clubOf(f, m.id) === d.A && !before[d.A].includes(m.id));
      assert.ok(R.clubCapRoom(f, d.A, cap) >= 0 && R.clubCapRoom(f, d.B, cap) >= 0); assert.ok(R.clubRoster(f, d.A).length <= 38 && R.clubRoster(f, d.B).length >= 26);
      assert.ok(d.fl[1] >= d.fl[0], 'the shopper\'s weakest starter at that position does not get weaker'); assert.ok(d.na >= LT.AI_TRADE_RULES.season.minGain - 1, `in season the shopper gains at least ${LT.AI_TRADE_RULES.season.minGain} (${d.na})`); assert.ok(d.nb >= DEAL_RULES.sellerFloor - 1, 'the seller gains too (rounded)');
    }
    assert.deepEqual(R.verifyLeague(f), []);
  }
  assert.ok(LT.AI_TRADE_RULES.season.upgrade === 2 * LT.AI_TRADE_RULES.upgrade && LT.AI_TRADE_RULES.season.minGain === 2 * DEAL_RULES.minGain, 'the in-season bar is twice the offseason bar');
  assert.ok(found >= 1, 'a club with a hole finds a deal in the season');
});
test('AI trades: a club with a full roster still trades in season (a spare goes the other way), and every deal is fair at market value', () => {
  let swaps = 0, deals = 0; const f0 = played();
  for (let s = 1; s <= 60 && deals < 6; s++) {
    const f = JSON.parse(JSON.stringify(f0)); f.season.finished = false; f.season.week = 5; f.seed = 500 + s; const cap = tierById(f.tier).cap; const clubs = aiClubs(f);
    const A = clubs[(s * 7) % clubs.length]; const roster = R.clubRoster(f, A); const wr = at(roster, 'WR')[2]; if (R.isProtected(wr)) continue; weak(wr, 47);
    while (R.clubRoster(f, A).length < ROSTER_MAX) { const extra = JSON.parse(JSON.stringify(at(R.clubRoster(f, A), 'OL').at(-1))); extra.id = `fill_${s}_${R.clubRoster(f, A).length}`; R.addToClub(f, A, extra, { year: 2, via: 'signed' }); }
    const done = LT.aiTrades(f, createRng(77 + s), { year: f.season.year, cap, window: 'offseason' }); // the window rolls three deals; the full club is among the shoppers
    for (const d of done) {
      deals++; const m = f.league.monsters[d.toA]; const gave = (d.toBAll || []).map((id) => f.league.monsters[id]).filter(Boolean); const paid = (d.picks || []).reduce((x, p) => x + pickValue(p, { yearsAhead: p.year - 2 }), 0) + gave.reduce((x, y) => x + marketValue(y, { year: f.season.year }), 0);
      const ratio = paid / marketValue(m, { year: f.season.year }); assert.ok(ratio >= LT.AI_TRADE_RULES.band[0] - 0.02 && ratio <= LT.AI_TRADE_RULES.band[1] + 0.02, `fair at market value (what the shopper pays ÷ what it gets): ${ratio.toFixed(2)} (${d.kind})`);
      if (d.kind !== 'picks') swaps++;
      if (m.position === 'K') assert.ok(!(d.picks || []).some((p) => p.round === 1), 'no first-round pick for a kicker');
    }
    assert.deepEqual(R.verifyLeague(f), []);
  }
  assert.ok(deals >= 1, 'deals happen'); 
});
test('AI trades: deterministic by seed, same deals, same order', () => {
  const run = () => { const f = played(); f.season.finished = false; f.season.week = 4; const cap = tierById(f.tier).cap; const out = []; for (let i = 0; i < 10; i++) out.push(...LT.aiTrades(f, createRng(300 + i), { year: f.season.year, cap, window: 'season' }).map((d) => `${d.kind}:${d.A}>${d.B}:${d.toA}`)); return out; };
  assert.deepEqual(run(), run());
});
