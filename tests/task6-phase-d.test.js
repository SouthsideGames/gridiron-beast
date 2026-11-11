// Task 6 Phase D: strategy modes (R2), rebuilding clubs' starter sales (R4), mode weights in contracts (R3), free-agency upgrades (R5)
// and the draft (R7). Approved specification §1.8; owner's authorisation of 2026-11-02 (docs/TASK6_DECISIONS.md).
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { MODES, STRATEGY, rawMode, nextMode, evaluateStrategies, modeOf, strategyInputs } from '../src/franchise/strategy.js';
import { modeLength, leagueContracts, leagueUpgrades, upgradesAllowed, CONTEND_UPGRADES, UPGRADES_PER_OFFSEASON, UPGRADE_MIN } from '../src/franchise/league-season.js';
import { POTENTIAL_WEIGHT, READY_BONUS, aiDraftPick } from '../src/franchise/draft.js';
import { STARTER_SALE, saleOpen, sellableStarters, aiTrades, hasReplacement, AI_TRADE_RULES, inBand, starters, floorAt, sparesOf, judge, ownedPicks } from '../src/franchise/league-trades.js';
import { horizonOf, PLAN, rosterPlan } from '../src/franchise/roster-plan.js';
import * as R from '../src/franchise/league-registry.js';
import * as F from '../src/franchise/franchise.js';
import { newFranchise, runFranchise } from '../tools/franchise-soak.mjs';
import { createRng } from '../src/core/rng.js';
import { generateMonster, monsterOverall, overall, syncFromDev } from '../src/data/monsters.js';
import { publicOnset } from '../src/data/aging.js';
import { isGymClub } from '../src/data/gyms.js';
import { tierById } from '../src/data/league.js';
import { buildDepthChart, GROUP_SLOTS } from '../src/franchise/roster.js';
import { marketValue, rosterNet, rosterAfter, rosterProblems, isUnavailable, DEAL_RULES, scoped } from '../src/franchise/trade-value.js';
import { tradable, currentClassYear } from '../src/franchise/trades.js';
import { returnLock } from '../src/franchise/fa-state.js';
import { legendSide } from '../src/franchise/fa-legendary.js';
import * as Save from '../src/franchise/save.js';

const facts = (o) => ({ win: 0.5, recent: 0.5, quality: 0, ageingShare: 0.2, committedShare: 0.8, picks: 6, extraPicks: 0, ...o });

test('R2 raw mode: Contend, Compete, Retool and Rebuild from results, quality, age, commitments and draft capital', () => {
  assert.deepEqual(MODES, ['rebuild', 'retool', 'compete', 'contend']);
  assert.equal(rawMode(facts({ recent: 0.7, quality: 1 })).mode, 'contend', 'winning with a league-average roster or better');
  assert.equal(rawMode(facts({ recent: 0.7, quality: -1 })).mode, 'compete', 'winning with a weak roster is not a contender');
  assert.equal(rawMode(facts({ recent: 0.5, quality: STRATEGY.contendQuality })).mode, 'contend', 'a roster well above the league, not losing');
  assert.equal(rawMode(facts({ recent: 0.3, quality: STRATEGY.contendQuality + 2 })).mode, 'retool', 'losing never contends');
  assert.equal(rawMode(facts({ recent: 0.5 })).mode, 'compete');
  assert.equal(rawMode(facts({ recent: 0.3, ageingShare: 0.5 })).mode, 'rebuild', 'losing and old');
  assert.equal(rawMode(facts({ recent: 0.3, committedShare: 0.99 })).mode, 'rebuild', 'losing and capped out');
  assert.equal(rawMode(facts({ recent: 0.3, extraPicks: STRATEGY.extraPicks })).mode, 'rebuild', 'losing with a stock of picks');
  assert.equal(rawMode(facts({ recent: 0.3 })).mode, 'retool', 'losing and young');
});

test('R2 stability: two consecutive evaluations, immediate on a major shift, a rebuild lasts two seasons, gyms never below Compete', () => {
  assert.deepEqual(nextMode(null, 'retool', 1), { mode: 'retool', modeSince: 1, modePending: null, changed: true }, 'the first evaluation sets the mode');
  let s = { mode: 'compete', modeSince: 1, modePending: null };
  let n = nextMode(s, 'contend', 2); assert.equal(n.mode, 'compete'); assert.deepEqual(n.modePending, { mode: 'contend', n: 1 }, 'one evaluation is not enough');
  n = nextMode(n, 'contend', 3); assert.equal(n.mode, 'contend'); assert.equal(n.modeSince, 3, 'the second consecutive one changes it');
  n = nextMode({ mode: 'compete', modeSince: 1, modePending: { mode: 'contend', n: 1 } }, 'retool', 3); assert.equal(n.mode, 'compete'); assert.deepEqual(n.modePending, { mode: 'retool', n: 1 }, 'not consecutive: the count restarts');
  n = nextMode({ mode: 'contend', modeSince: 1 }, 'retool', 2); assert.equal(n.mode, 'retool', 'two steps: a major shift changes at once');
  n = nextMode({ mode: 'contend', modeSince: 1 }, 'rebuild', 2); assert.equal(n.mode, 'rebuild');
  n = nextMode({ mode: 'rebuild', modeSince: 4 }, 'contend', 5); assert.equal(n.mode, 'rebuild', 'one season into a rebuild: it continues');
  n = nextMode({ mode: 'rebuild', modeSince: 4 }, 'contend', 6); assert.equal(n.mode, 'contend', 'after two seasons a major shift changes it');
  n = nextMode({ mode: 'rebuild', modeSince: 4 }, 'retool', 6); assert.equal(n.mode, 'rebuild', 'after two seasons an ordinary change still needs confirming');
  n = nextMode(n, 'retool', 7); assert.equal(n.mode, 'retool');
  assert.equal(nextMode(null, 'rebuild', 1, { gym: true }).mode, 'compete', 'a gym starts at Compete at worst');
  assert.equal(nextMode({ mode: 'compete', modeSince: 1 }, 'rebuild', 2, { gym: true }).mode, 'compete', 'and never falls below it');
  assert.equal(nextMode({ mode: 'compete', modeSince: 1 }, 'contend', 2, { gym: true }).modePending.mode, 'contend', 'but is otherwise a normal club');
});

test('R2 evaluation on a real league: every club has a mode, gyms are Compete or Contend, deterministic, stored additively', () => {
  const run = () => { const f = newFranchise(71); f.season.records = Object.fromEntries(Object.keys(f.season.records || {}).map((c, i) => [c, { w: i % 10, l: 9 - (i % 10) }]));
    evaluateStrategies(f, { year: 1, cap: tierById(f.tier).cap, teamOf: (c) => F.aiTeam(f, c, 1) }); return f; };
  const f = run(); const g = run();
  for (const c of R.leagueClubs(f)) {
    const st = R.clubRecord(f, c).strategy; assert.ok(MODES.includes(st.mode), c); assert.equal(st.modeSince, 1); assert.ok(typeof st.modeWhy === 'string');
    if (isGymClub(c)) assert.ok(['compete', 'contend'].includes(st.mode), `${c} is a gym`);
    assert.equal(st.mode, R.clubRecord(g, c).strategy.mode, 'same facts, same mode'); assert.ok('slow' in st, 'the existing strategy fields stay');
  }
  const old = newFranchise(72); assert.equal(modeOf(old, R.leagueClubs(old)[0]), 'compete', 'a save without modes reads as Compete');
});

let n = 0;
function mon(position, quality, age, extra = {}) { const m = generateMonster(createRng(7000 + n), { position, quality, age }); m.id = `d${n++}`; m.age = age; return Object.assign(m, extra); }

test('R3 by mode: contenders sign veterans past onset for one season; rebuilders commit long only to youth', () => {
  const vet = mon('WR', 70, 33), mid = mon('WR', 70, 0), kid = mon('WR', 60, 22); mid.age = publicOnset(mid) - 1; kid.potential = monsterOverall(kid) + 6;
  assert.ok(horizonOf(vet) < 0 && horizonOf(mid) >= 0 && horizonOf(mid) < PLAN.ageingHorizon);
  assert.equal(modeLength(2, vet, 'contend'), 1); assert.equal(modeLength(3, kid, 'contend'), 3);
  assert.equal(modeLength(2, mid, 'rebuild'), 1, 'near his onset: one season'); assert.equal(modeLength(2, kid, 'rebuild'), 3, 'young with upside: three');
  for (const len of [1, 2, 3]) for (const m of [vet, mid, kid]) { assert.equal(modeLength(len, m, 'compete'), len); assert.equal(modeLength(len, m, 'retool'), len); }
});

function leagueWith(seed) { const f = newFranchise(seed); f.season.finished = true; return f; }
function setMode(f, club, mode) { Object.assign(R.clubRecord(f, club).strategy, { mode, modeSince: 1 }); }

test('R3 by mode on a league (F2/F3, owner-approved 2026-11-03): veterans past onset go only to a ready successor; a rebuilder also once 2+ past onset', () => {
  const outcome = (mode, { ready, pastBy }) => /* ready: true (within 4, slightly behind), 'equal' (as good), false (5–8 behind) */ { const f = leagueWith(73); const club = R.leagueClubs(f).slice().sort().find((c) => !isGymClub(c) && Object.values(rosterPlan(R.clubRoster(f, c)).groups).flatMap((g) => g.rows).some((r) => r.successor && !R.isProtected(r.starter) && !R.isProtected(r.successor) && GROUP_SLOTS[r.starter.position].length === 1)); assert.ok(club, 'a club with a genuine successor'); setMode(f, club, mode);
    const roster = R.clubRoster(f, club); const starters = new Set(Object.values(buildDepthChart(roster)).filter(Boolean));
    const plan = rosterPlan(roster, null, { starters }); const row = Object.values(plan.groups).flatMap((g) => g.rows).find((r) => r.successor && !R.isProtected(r.starter) && !R.isProtected(r.successor) && GROUP_SLOTS[r.starter.position].length === 1); // a one-slot group: a successor made as good as the starter stays his successor instead of starting beside him
    assert.ok(row, 'a starter with a successor'); const st = row.starter, su = row.successor;
    for (const k of Object.keys(st.attributes)) st.attributes[k] = Math.max(28, st.attributes[k]); // room for "7 behind" above the 20 floor (Dex founding ratings can sit in the 20s)
    su.attributes = Object.fromEntries(Object.entries(st.attributes).map(([k, v]) => [k, ready === 'equal' ? v : ready ? Math.max(20, v - 1) : Math.max(20, v - 7)])); su.potential = 99; su.age = 23; // ready and as good, or 5–8 behind (qualifies by potential, not ready)
    const ids = R.clubRecord(f, club).roster; if (ids.indexOf(st.id) > ids.indexOf(su.id)) { ids.splice(ids.indexOf(st.id), 1); ids.splice(ids.indexOf(su.id), 0, st.id); } // preserve the incumbent on an exact rating tie
    st.age = publicOnset(st) + pastBy; st.contract = { ends: 1 };
    const check = rosterPlan(R.clubRoster(f, club), null, { starters }).successors.get(su.id); assert.ok(check && check.ready === !!ready, `setup: successor ready=${ready}`); assert.ok(new Set(Object.values(buildDepthChart(R.clubRoster(f, club))).filter(Boolean)).has(st.id), 'setup: he still starts');
    leagueContracts(f, { year: 1, cap: 10 ** 9 }); return { kept: R.clubRoster(f, club).some((m) => m.id === st.id), st }; };
  const c1 = outcome('contend', { ready: false, pastBy: 1 }); assert.ok(c1.kept, 'a contender keeps him while his successor is not ready'); assert.equal(c1.st.contract.ends, 2, 'for one season');
  assert.ok(outcome('contend', { ready: false, pastBy: 3 }).kept, 'however far past onset');
  assert.ok(outcome('contend', { ready: true, pastBy: 1 }).kept, 'a ready successor who is not as good does not displace him');
  assert.ok(!outcome('contend', { ready: 'equal', pastBy: 1 }).kept, 'a ready successor at least as good takes over');
  assert.ok(outcome('rebuild', { ready: false, pastBy: 1 }).kept, 'a rebuilder keeps him one season past onset while his successor is not ready');
  assert.ok(!outcome('rebuild', { ready: false, pastBy: 2 }).kept, 'but lets him go at 2+ seasons past onset to any successor');
  assert.ok(!outcome('rebuild', { ready: true, pastBy: 1 }).kept, 'and to a ready successor at once');
});

test('R2 F1 (owner-approved 2026-11-03): a club already rebuilding stays "ageing" only at or above the league median share; entry keeps 0.35', () => {
  const f = newFranchise(75); const clubs = R.leagueClubs(f).slice().sort(); const cap = tierById(f.tier).cap;
  f.season.records = Object.fromEntries(clubs.map((c) => [c, { w: 1, l: 8 }])); // everyone losing
  const shares = clubs.map((c) => [c, strategyInputs(f, c, { year: 1, cap, teamOf: (x) => F.aiTeam(f, x, 1), aiMean: 0 }).ageingShare]); const sorted = shares.map(([, v]) => v).sort((a, b) => a - b); const median = sorted[Math.floor(sorted.length / 2)];
  const target = shares.find(([c, v]) => !isGymClub(c) && v >= STRATEGY.ageingShare && v < median); if (!target) return; // this league has no club between 0.35 and the median
  const [club] = target; const other = shares.find(([c, v]) => c !== club && !isGymClub(c) && v >= STRATEGY.ageingShare && v < median)?.[0];
  for (const c of clubs) Object.assign(R.clubRecord(f, c).strategy, { mode: 'compete', modeSince: 1 });
  Object.assign(R.clubRecord(f, club).strategy, { mode: 'rebuild', modeSince: 1 }); // two seasons in: free to leave
  evaluateStrategies(f, { year: 3, cap, teamOf: (x) => F.aiTeam(f, x, 3) });
  assert.equal(R.clubRecord(f, club).strategy.modeWhy, 'losing with a young roster', 'a rebuilder below the league median reads as young');
  if (other) assert.equal(R.clubRecord(f, other).strategy.modeWhy, 'losing with an ageing roster', 'a club not yet rebuilding still enters at 0.35');
});

test('R5 by mode: Contend may make two upgrades, every other mode one; the pools and the existing rules are unchanged', () => {
  assert.equal(upgradesAllowed('contend'), CONTEND_UPGRADES); assert.equal(CONTEND_UPGRADES, 2);
  for (const m of ['compete', 'retool', 'rebuild', undefined]) assert.equal(upgradesAllowed(m), UPGRADES_PER_OFFSEASON);
  const signedFor = (mode) => { const f = newFranchise(61); const cap = tierById(f.tier).cap;
    const club = R.leagueClubs(f).slice().sort().find((c) => !isGymClub(c) && !R.clubRoster(f, c).some(R.isProtected)) || R.leagueClubs(f).slice().sort()[3];
    for (const c of R.leagueClubs(f)) setMode(f, c, c === club ? mode : 'compete');
    for (const pos of ['TE', 'RB']) for (const t of R.clubRoster(f, club).filter((m) => m.position === pos)) for (const k of Object.keys(t.attributes)) t.attributes[k] = 20; // two weak groups, at the floor (on the Dex scale a -25 left some above the injected arrivals)
    const pool = (f.pool[Object.keys(f.pool)[0]] ||= []);
    for (const pos of ['TE', 'RB']) { const s = mon(pos, 82, 30); s.salary = 20000; s.history = []; R.claimMonster(f, s, `test|${pos}`); pool.push(s); }
    const out = leagueUpgrades(f, { year: 2, cap }); for (const x of out.signed) assert.ok(x.ovr >= x.replaces + UPGRADE_MIN || x.kind === 'succession');
    assert.deepEqual(R.verifyLeague(f), []); return out.signed.filter((x) => x.club === club).length; };
  assert.equal(signedFor('compete'), 1, 'one for a club not contending'); assert.equal(signedFor('contend'), 2, 'two for a contender');
});

test('R7 by mode: potential weighted 0.35 by rebuilders, 0.20 by Compete and Retool, 0.10 plus readiness by contenders', () => {
  assert.deepEqual({ ...POTENTIAL_WEIGHT }, { contend: 0.1, compete: 0.2, retool: 0.2, rebuild: 0.35 }); assert.equal(READY_BONUS, 2);
  const now = mon('LB', 72, 22), upside = mon('LB', 60, 21);
  // Task 8 M1 (fixture drift): quality is a percentile target inside a random Dex form, not an overall; the two prospects are set
  // to the overalls the scenario names (72 and 60), explicitly
  for (const [m, v] of [[now, 72], [upside, 60]]) { for (let i = 0; i < 40 && monsterOverall(m) !== v; i++) { const d = v - monsterOverall(m); for (const k of Object.keys(m.attributes)) m.attributes[k] = Math.max(20, Math.min(99, m.attributes[k] + Math.sign(d) * Math.max(1, Math.abs(d) >> 1))); } m.dev.current = { ...m.attributes }; }
  const D = monsterOverall(now) - monsterOverall(upside); assert.ok(D >= 3);
  now.potential = Math.max(70, monsterOverall(now)); upside.potential = now.potential + Math.round(D / 0.27); // 0.35 × gap > D > 0.20 × gap
  const pickFor = (mode, rows = []) => { const f = { draft: { class: [now, upside], available: [now.id, upside.id], picks: [], aiScouting: { X: { skill: 50, weeks: 0, revealed: { [now.id]: 6, [upside.id]: 6 } } } } };
    return aiDraftPick(f, 'X', { next: () => 0.5 }, { plan: { mode, groups: { LB: { rows, weakNeed: 0 } } } }).id; };
  assert.equal(pickFor('rebuild'), upside.id, 'the rebuilder takes the upside');
  assert.equal(pickFor('compete'), now.id, 'Compete keeps the standing weight (0.20)'); assert.equal(pickFor('retool'), now.id);
  assert.equal(pickFor('contend', [{ starter: mon('LB', 60, 28) }]), now.id, 'the contender takes the one who starts now');
  const close = mon('LB', 61, 22); close.potential = 70; const far = mon('LB', 62, 22); far.potential = 70; // the contender's readiness bonus decides between two near-equals
  const f2 = { draft: { class: [close, far], available: [close.id, far.id], picks: [], aiScouting: { X: { skill: 50, weeks: 0, revealed: { [close.id]: 6, [far.id]: 6 } } } } }; const weakest = mon('LB', 0, 28); weakest.attributes = { ...close.attributes };
  if (monsterOverall(close) < monsterOverall(far) && monsterOverall(far) - monsterOverall(close) < READY_BONUS) assert.equal(aiDraftPick(f2, 'X', { next: () => 0.5 }, { plan: { mode: 'contend', groups: { LB: { rows: [{ starter: weakest }], weakNeed: 0 } } } }).id, monsterOverall(far) >= monsterOverall(weakest) ? far.id : close.id);
});

test('R4 sellable starters: ageing or past onset, older than 26, never protected, never a rookie on his first deal', () => {
  const f = { season: { year: 5 }, league: {} };
  const roster = ['QB', 'RB', 'WR', 'WR', 'TE', 'OL', 'OL', 'OL', 'DL', 'DL', 'LB', 'LB', 'CB', 'CB', 'S', 'S', 'K'].map((p) => mon(p, 65, 24, { yearsPro: 3 }));
  const old = roster[2]; old.age = publicOnset(old) + 1; const near = roster[11]; near.age = publicOnset(near) - 1;
  const young = roster[1]; young.age = 26; young.attributes.speed = 99; // within 2 of his onset (RB onset 27) but a young star
  const legend = roster[0]; legend.age = 33; legend.legendary = true; const rook = roster[14]; rook.age = 31; rook.contract = { rookie: true, ends: 6 };
  const ids = sellableStarters(f, roster).map((m) => m.id);
  assert.deepEqual(ids, [old.id, near.id].filter((id) => ids.includes(id)).length === 2 ? [old.id, near.id] : ids, 'furthest past onset first');
  assert.ok(ids.includes(old.id) && ids.includes(near.id)); for (const m of [young, legend, rook]) assert.ok(!ids.includes(m.id), m.position);
  assert.equal(STARTER_SALE.perWindow, 1);
});

test('R4 F4 (owner-approved 2026-11-03): a starter is sold only with a replacement within 4 behind him', () => {
  const a = mon('LB', 70, 30), b = mon('LB', 70, 27), c = mon('LB', 70, 25); const o = (m) => monsterOverall(m); const set = (m, v) => { const d = v - o(m); for (const k of Object.keys(m.attributes)) m.attributes[k] = Math.max(20, Math.min(99, m.attributes[k] + d)); };
  set(a, 72); set(b, 70); set(c, 60); // LB has 2 starting slots: a and b start; selling a puts c in
  const roster = [a, b, c]; const gap = o(a) - o(c); assert.ok(gap > STARTER_SALE.replacementWithin, `setup gap ${gap}`); assert.equal(hasReplacement(roster, a), false, 'no replacement within 4');
  set(c, o(a) - 3); assert.equal(hasReplacement(roster, a), true, 'within 4: allowed'); assert.equal(hasReplacement([a, b], a), false, 'nobody to step in');
  assert.equal(STARTER_SALE.replacementWithin, 4);
});

test('R4 one sale per window: the offseason window and the season window are counted apart', () => {
  const f = { league: { trades: [{ year: 4, week: 0, sale: true }, { year: 4, week: 3 }] } };
  assert.equal(saleOpen(f, 4, 0), false, 'this offseason window has had its sale'); assert.equal(saleOpen(f, 4, 5), true, 'the season window has not');
  f.league.trades.push({ year: 4, week: 6, sale: true }); assert.equal(saleOpen(f, 4, 7), false); assert.equal(saleOpen(f, 5, 0), true, 'the next offseason is a new window');
});

// R4 in play, split by owner ruling N8b (docs/task8/RULINGS_2026-11-08.md, J/D11; DECISION_PACKET_M3.md §6 D11). The test that ran
// runFranchise(11, { seasons: 4 }) and required "sales happen" is replaced by the constructed rule scenario below. Whether sales happen in
// played leagues, and how often, is now a measurement with no pass/fail threshold: the R4 funnel in tools/t8-league-health.mjs
// (docs/task8/LEAGUE_HEALTH_M2.md, "D11 sale-rate benchmark"). The sale rules are unchanged.

/** The R4 assertions the original in-play test made on every recorded sale (unchanged). */
function assertR4Sales(f) {
  const sales = (f.league.trades || []).filter((t) => t.sale);
  const windows = new Map(); for (const t of sales) { const k = `${t.year}|${t.week > 0 ? 'season' : 'offseason'}`; windows.set(k, (windows.get(k) || 0) + 1); }
  for (const [k, c] of windows) assert.ok(c <= STARTER_SALE.perWindow, `one sale in window ${k}`);
  for (const s of sales) {
    assert.equal(s.B, s.seller); assert.ok(s.horizon <= PLAN.ageingHorizon, 'approaching or past decline'); assert.ok(s.age > STARTER_SALE.youngStarAge, 'never a young star');
    assert.notEqual(s.buyerMode, 'rebuild'); assert.ok(s.inOvr >= s.fl[0] + s.upgradeBar && s.upgradeBar >= 2, 'a legitimate need: the incoming monster beats the buyer\'s weakest starter at the position by the rule\'s margin (league-trades.js AI_TRADE_RULES.upgrade)');
    assert.ok((s.picks || []).length + (s.paidAges || []).length > 0 && (s.paidAges || []).every((a) => a <= STARTER_SALE.youngAge), 'paid in young players or picks');
    const [a, b] = s.mv; assert.ok(a / b >= 0.848 && a / b <= 1.152 && b / a >= 0.848 && b / a <= 1.152, 'fair both ways');
    assert.ok(s.na >= 8 && s.nb >= 2 - 0.5, 'the existing gain and seller-floor rules');
  }
  return sales;
}

// Fixed fixture: league 52 after one played season on c7fc56b (pre-adoption Task 8).
// Freeze the scenario, not the game rules: unrelated reward/balance changes must not erase
// the existence of the seller/buyer this trade-rule test constructs. All prerequisite,
// positive-sale, negative-sale, fairness and registry assertions below remain unchanged.
// Regenerated with runFranchise(52, { seasons: 1 }), Save.exportJson, gzip level 9, base64.
// Its year-2 offseason trade window ran when free agency opened, with no sale, so the window is still open for one (saleOpen). Each
// scenario works on its own copy (a save round trip).
let played52 = null;
const league52 = () => {
  if (!played52) played52 = gunzipSync(Buffer.from(readFileSync(new URL('./fixtures/task6-r4-sale-c7fc56b.json.gz.b64', import.meta.url), 'utf8').trim(), 'base64')).toString();
  return Save.importJson(played52);
};
const ATTRIBUTE_FLOOR = 20; // the lowest value a rating edit moves an attribute to (the same floor as the other rating edits in these tests)
/** A rating edit through the development record: every attribute moves the same share of the way from its current value toward its
 *  own ceiling (dev.potential) to raise the overall, or toward ATTRIBUTE_FLOOR to lower it, until the overall is `target`; syncFromDev
 *  mirrors it onto the monster, as development does. The edit is computed from the target, not from fixed attribute steps, so it holds
 *  whichever attributes training raised (D7 identities train different attributes). */
function rateTo(m, target) {
  const d = m.dev, from = { ...d.current }, up = target >= overall(from, m.position);
  for (let i = 0; i <= 400; i++) {
    const t = i / 400; for (const k of Object.keys(from)) { const to = up ? (d.potential[k] ?? from[k]) : Math.min(from[k], ATTRIBUTE_FLOOR); d.current[k] = Math.round(from[k] + t * (to - from[k])); }
    const o = overall(d.current, m.position); if (up ? o >= target : o <= target) break;
  }
  syncFromDev(m); assert.equal(monsterOverall(m), target, `${m.name} rated ${target} within his ceilings`);
}
/** A ceiling edit: every attribute ceiling moves the same share of the way toward 99 until the potential (the OVR of the ceilings) is `target`. */
function ceilingTo(m, target) {
  const d = m.dev, from = { ...d.potential };
  for (let i = 0; i <= 400; i++) { const t = i / 400; for (const k of Object.keys(from)) d.potential[k] = Math.round(from[k] + t * (99 - from[k])); if (overall(d.potential, m.position) >= target) break; }
  syncFromDev(m); assert.equal(m.potential, target, `${m.name}'s ceiling ${target}`);
}

/**
 * Every offer the buyer can make for the starter, enumerated as the sale search does (league-trades.js starterSale: a young spare alone,
 * a pick or two picks, a young spare and a pick, each fair both ways) and judged by the existing deal rules (judge). Returns the offers
 * judge accepts with their score (buyer gain + seller gain), the measure the search keeps the best of.
 */
function saleOffers(f, { S, B, m, year, cap, minGain }) {
  const rosterS = R.clubRoster(f, S), rosterB = R.clubRoster(f, B), vm = marketValue(m, { year });
  const young = sparesOf(rosterB).filter((y) => tradable(f, y) && !R.isProtected(y) && !isUnavailable(y) && (y.age || 99) <= STARTER_SALE.youngAge);
  const picks = ownedPicks(f, B, currentClassYear(f)); const options = [];
  for (const y of young) if (inBand(marketValue(y, { year }), vm)) options.push({ ys: [y], picks: [] });
  const single = picks.find((x) => inBand(x.v, vm)); if (single) options.push({ ys: [], picks: [single] });
  if (!single) for (let i = 0; i < picks.length; i++) for (let j = i + 1; j < picks.length; j++) if (inBand(picks[i].v + picks[j].v, vm)) { options.push({ ys: [], picks: [picks[i], picks[j]] }); i = picks.length; break; }
  for (const y of young) { const vy = marketValue(y, { year }); if (vy >= vm * AI_TRADE_RULES.band[0]) continue; for (const x of picks) if (inBand(vy + x.v, vm)) { options.push({ ys: [y], picks: [x] }); break; } }
  const roomA = R.clubCapRoom(f, B, cap), roomB = R.clubCapRoom(f, S, cap);
  return options.map((o) => ({ ...o, j: scoped(() => judge(f, { A: B, B: S, rosterA: rosterB, rosterB: rosterS, m, ys: o.ys, picks: o.picks, year, roomA, roomB, minGain })) }))
    .filter((o) => o.j).map((o) => ({ ...o, score: o.j.na + o.j.nb }));
}

/** The clubs with a legitimate need for `m` (not rebuilding, `m` beats the weakest available starter at his position by the bar). */
const buyersFor = (f, { S, m }) => R.leagueClubs(f).filter((c) => c !== S && modeOf(f, c) !== 'rebuild' && monsterOverall(m) >= floorAt(R.clubRoster(f, c), m.position) + AI_TRADE_RULES.upgrade);
/** Every offer any of them can make for `m` that passes the existing deal rules, with the club. */
const offersFor = (f, { S, m, year, cap }) => buyersFor(f, { S, m }).flatMap((c) => saleOffers(f, { S, B: c, m, year, cap, minGain: DEAL_RULES.minGain }).map((o) => ({ ...o, club: c })));
/**
 * Build the scenario on league 52, every step an ordinary data edit (the modes, two ratings and, only when no offer is fair without it,
 * one set of ceilings), and compute every R4 prerequisite with the code's own helpers before the real code runs. `pick` names the
 * seller, the starter, the veteran next in line and the target values (found by findSale); `repBehind`: how far the replacement is
 * behind the sold starter. Every step asserts its prerequisite, so a candidate that cannot satisfy one fails with the step's message.
 */
function buildSale(f, pick, { repBehind }) {
  const year = f.season.year + 1, cap = tierById(f.tier).cap; // the offseason window's arguments, as franchise.js passes them
  const { S, pos } = pick, slots = GROUP_SLOTS[pos].length;
  // Step 1, modes: the seller is in Rebuild (set explicitly) and is the only rebuilding club (any other rebuilder is set to Retool), so
  // every other club may buy. The seller is an ordinary club: a gym never falls below Compete.
  R.clubRecord(f, S).strategy.mode = 'rebuild';
  for (const c of R.leagueClubs(f)) if (c !== S && modeOf(f, c) === 'rebuild') R.clubRecord(f, c).strategy.mode = 'retool';
  assert.equal(modeOf(f, S), 'rebuild'); assert.ok(!isGymClub(S)); assert.deepEqual(R.leagueClubs(f).filter((c) => modeOf(f, c) === 'rebuild'), [S]);
  const rosterS = R.clubRoster(f, S);
  // Step 2, the starter: one of the seller's sellable starters (older than 26, within 2 seasons of his public onset), rated to
  // `pick.mOvr` (no edit when that is his own rating). He starts.
  const m = rosterS.find((x) => x.id === pick.mId); assert.ok(m && m.position === pos, 'the starter is on the seller');
  if (monsterOverall(m) !== pick.mOvr) rateTo(m, pick.mOvr);
  assert.ok(starters(rosterS, pos).slice(0, slots).includes(m), 'he starts');
  assert.ok(tradable(f, m) && !R.isProtected(m) && !isUnavailable(m), 'tradable, not protected, available');
  assert.ok(m.age > STARTER_SALE.youngStarAge, `older than ${STARTER_SALE.youngStarAge}: ${m.age}`); assert.ok(horizonOf(m) <= PLAN.ageingHorizon, `within ${PLAN.ageingHorizon} seasons of his onset: ${horizonOf(m)}`);
  assert.ok(sellableStarters(f, rosterS).includes(m));
  // Step 3, the replacement (F4): the monster who would take his slot (the next available at the position), a veteran, rated `repBehind`
  // below him. After the edit the starter still starts and the monster next in line is `repBehind` behind him (the edited veteran, or
  // a starter he ties with: either way the slot is filled `repBehind` behind).
  const next = () => starters(rosterS, pos).filter((x) => x !== m && !isUnavailable(x))[slots - 1];
  const vet = next(); assert.ok(vet && vet.id === pick.repId, 'the next in line'); assert.ok(vet.age > PLAN.successorAge, `a veteran next in line: ${vet.age}`);
  rateTo(vet, monsterOverall(m) - repBehind);
  const rep = next(); assert.ok(starters(rosterS, pos).slice(0, slots).includes(m), 'he still starts'); assert.equal(monsterOverall(rep), monsterOverall(m) - repBehind, `the next in line is ${repBehind} behind`);
  const replaced = monsterOverall(rep) >= monsterOverall(m) - STARTER_SALE.replacementWithin;
  assert.equal(hasReplacement(rosterS, m), replaced, 'F4 as the code reads it');
  // the real search reaches him: every other sellable starter with a replacement that the search would try before him (with F4 failed:
  // every one) has no offer that passes the existing rules (offersFor), so no other starter is sold before him or in his place
  const order = sellableStarters(f, rosterS).filter((x) => hasReplacement(rosterS, x)); assert.equal(order.includes(m), replaced);
  for (const x of replaced ? order.slice(0, order.indexOf(m)) : order) assert.deepEqual(offersFor(f, { S, m: x, year, cap }), [], `no offer for ${x.name}, who comes ${replaced ? 'before him' : 'in his place'}`);
  // Step 4, the payment's price (only when `pick.edit` is set, because no offer is fair without it): a young spare of a possible buyer has
  // his ceilings raised to `pick.edit.yPot`. A young monster's market value is mostly his upside (0.6 per point of headroom at 26 or
  // under), so the ceiling sets his price.
  const repriced = pick.edit && R.leagueClubs(f).filter((c) => c !== S).flatMap((c) => R.clubRoster(f, c)).find((x) => x.id === pick.edit.yId);
  if (pick.edit) { assert.ok(repriced, 'the payment is at another club'); assert.ok(repriced.age <= STARTER_SALE.youngAge, `young: ${repriced.age}`); ceilingTo(repriced, pick.edit.yPot); }
  // Step 5, the buyer and the payment: of every club with a legitimate need (not rebuilding; the starter beats its weakest available
  // starter at the position by AI_TRADE_RULES.upgrade), every offer it can make (saleOffers: young spares and picks, fair both ways,
  // judged by the existing deal rules) is scored as the search scores it; the constructed buyer and payment are the one best offer
  assert.ok(buyersFor(f, { S, m }).length, 'a club with a need');
  const offers = offersFor(f, { S, m, year, cap }); assert.ok(offers.length, 'an offer that passes the existing deal rules');
  const best = offers.reduce((a, b) => (b.score > a.score ? b : a));
  for (const o of offers) if (o !== best) assert.ok(o.score < best.score - 1e-9, `one best offer (${best.score.toFixed(1)}; ${o.club} ${o.score.toFixed(1)})`);
  if (repriced) assert.ok(best.ys.includes(repriced), 'the repriced spare is in the payment');
  const B = best.club, rosterB = R.clubRoster(f, B), ys = best.ys, picks = best.picks.map((x) => x.p), pickPaid = best.picks.reduce((s, x) => s + x.v, 0);
  // the chosen offer, checked step by step with the same functions: the buyer's need, the payment from its young spares or its own
  // picks, a fair price both ways
  assert.notEqual(modeOf(f, B), 'rebuild', 'the buyer is not rebuilding');
  assert.ok(monsterOverall(m) >= floorAt(rosterB, pos) + AI_TRADE_RULES.upgrade, `need: ${monsterOverall(m)} against ${floorAt(rosterB, pos)} + ${AI_TRADE_RULES.upgrade}`);
  for (const y of ys) { assert.ok(sparesOf(rosterB).includes(y), 'a spare'); assert.ok(tradable(f, y) && !R.isProtected(y) && !isUnavailable(y)); assert.ok(y.age <= STARTER_SALE.youngAge, `young: ${y.age}`); }
  const own = ownedPicks(f, B, currentClassYear(f)).map((x) => JSON.stringify(x.p)); for (const p of picks) assert.ok(own.includes(JSON.stringify(p)), 'a pick the buyer owns');
  const vm = marketValue(m, { year }), paid = ys.reduce((s, y) => s + marketValue(y, { year }), 0) + pickPaid;
  assert.ok(inBand(paid, vm), `a fair price both ways: ${paid.toFixed(1)} for ${vm.toFixed(1)}`);
  // Step 6, judge() (the existing deal rules), computed with the same functions: no return lock, no legendary, both rosters legal, both
  // under the cap; the gains (buyer >= DEAL_RULES.minGain, seller >= DEAL_RULES.sellerFloor) are returned for the scenario to assert.
  assert.equal(returnLock(f, m, B), null); assert.equal(legendSide(m), null); for (const y of ys) { assert.equal(returnLock(f, y, S), null); assert.equal(legendSide(y), null); }
  const afterB = rosterAfter(rosterB, { give: ys, get: [m] }), afterS = rosterAfter(rosterS, { give: [m], get: ys });
  assert.deepEqual([...rosterProblems(rosterB, afterB), ...rosterProblems(rosterS, afterS)], [], 'both rosters legal');
  const roomB = R.clubCapRoom(f, B, cap), roomS = R.clubCapRoom(f, S, cap), toS = ys.reduce((s, y) => s + y.salary, 0);
  assert.ok(roomB + toS - m.salary >= Math.min(0, roomB) && roomS + m.salary - toS >= Math.min(0, roomS), 'both under the cap');
  const na = scoped(() => rosterNet(rosterB, { give: ys, get: [m] }, year)) - pickPaid, nb = scoped(() => rosterNet(rosterS, { give: [m], get: ys }, year)) + pickPaid;
  assert.ok(Math.abs(best.j.na - na) < 1e-9 && Math.abs(best.j.nb - nb) < 1e-9, 'judge computes the same gains');
  // Step 7, the window: the year-2 offseason window has had no sale.
  assert.ok(f.season.finished); assert.ok(saleOpen(f, year, 0), 'the sale window is open');
  return { year, cap, S, B, pos, m, ys, picks, rep, na, nb, salesBefore: (f.league.trades || []).filter((t) => t.sale).length };
}

/** The starter's own rating first, then the ratings around it, nearest first (higher before lower at the same distance). */
const ratingsNear = (o, span = 10) => [o, ...Array.from({ length: span }, (_, i) => [o + i + 1, o - i - 1]).flat()].filter((v) => v >= 20 && v <= 99);
/**
 * The search for the scenario (no fixed club, monster or rating): in a fixed order (clubs and monsters sorted, the sellable starters in
 * the sale search's own order, the starter's own rating before any other) the first seller, starter, replacement and rating for which
 * buildSale's every step holds both with the replacement 1 behind (where the buyer's gain and the seller's floor must pass too) and 5
 * behind (the negative case): first every candidate with no ceiling edit, then every candidate with the lowest ceiling that prices one
 * young spare of a club with a need fairly (he must then be in the payment). A rejected candidate's edits are undone before the next. Returns the candidate (pick).
 */
function findSale(f) {
  const year = f.season.year + 1, clubs = R.leagueClubs(f).slice().sort(), modes = clubs.map((c) => [c, R.clubRecord(f, c).strategy.mode]);
  const restore = (saved) => { for (const [m, dev] of saved) { m.dev = structuredClone(dev); syncFromDev(m); } for (const [c, mode] of modes) R.clubRecord(f, c).strategy.mode = mode; };
  const holds = (pick, saved) => {
    try {
      const c = buildSale(f, pick, { repBehind: 1 }); const ok = c.na >= DEAL_RULES.minGain && c.nb >= DEAL_RULES.sellerFloor; restore(saved);
      if (ok) buildSale(f, pick, { repBehind: 5 }); restore(saved); return ok;
    } catch (e) { restore(saved); if (!(e instanceof assert.AssertionError)) throw e; return false; }
  };
  const candidates = []; // seller, starter, veteran next in line and rating, in the fixed order
  for (const S of clubs.filter((c) => !isGymClub(c))) {
    const rosterS = R.clubRoster(f, S);
    for (const m of sellableStarters(f, rosterS)) {
      const pos = m.position, slots = GROUP_SLOTS[pos].length; const rep = starters(rosterS, pos).filter((x) => x !== m && !isUnavailable(x))[slots - 1]; if (!rep || rep.age <= PLAN.successorAge) continue;
      for (const mOvr of ratingsNear(monsterOverall(m))) candidates.push({ m, rep, base: { S, pos, mId: m.id, repId: rep.id, mOvr, edit: null } });
    }
  }
  for (const { m, rep, base } of candidates) if (holds(base, [m, rep].map((x) => [x, structuredClone(x.dev)]))) return base; // no ceiling edit
  for (const { m, rep, base } of candidates) { // the payment's price: one young spare of a club with a need, at the lowest ceiling that makes him a fair price
    const saved = [m, rep].map((x) => [x, structuredClone(x.dev)]);
    let vm = null; try { if (monsterOverall(m) !== base.mOvr) rateTo(m, base.mOvr); vm = marketValue(m, { year }); } catch (e) { if (!(e instanceof assert.AssertionError)) throw e; } restore(saved); if (vm == null) continue;
    const ys = clubs.filter((c) => c !== base.S && base.mOvr >= floorAt(R.clubRoster(f, c), base.pos) + AI_TRADE_RULES.upgrade).flatMap((c) => sparesOf(R.clubRoster(f, c))).filter((x) => (x.age || 99) <= STARTER_SALE.youngAge).sort((a, b) => (a.id < b.id ? -1 : 1));
    for (const y of ys) {
      let yPot = null; for (let p = Math.max(y.potential, monsterOverall(y)); p <= 99 && yPot == null; p++) if (inBand(marketValue({ ...y, potential: p }, { year }), vm)) yPot = p;
      if (yPot == null || yPot === y.potential) continue;
      const pick = { ...base, edit: { yId: y.id, yPot } }; if (holds(pick, [...saved, [y, structuredClone(y.dev)]])) return pick;
    }
  }
  assert.fail('no seller, starter, replacement, buyer and payment in league 52 can satisfy every R4 prerequisite');
}
const constructSale = (f, { repBehind }) => buildSale(f, findSale(f), { repBehind });

test('R4 constructed scenario: every prerequisite holds, so the real offseason window sells the ageing starter by the approved rules', () => {
  const f = league52(); const c = constructSale(f, { repBehind: 1 });
  assert.ok(c.na >= DEAL_RULES.minGain, `buyer gain ${c.na.toFixed(1)} >= ${DEAL_RULES.minGain}`); assert.ok(c.nb >= DEAL_RULES.sellerFloor, `seller ${c.nb.toFixed(1)} >= ${DEAL_RULES.sellerFloor}`);
  assert.equal(c.salesBefore, 0);
  const before = Object.fromEntries(R.leagueClubs(f).map((k) => [k, R.clubRoster(f, k).slice()]));
  const deals = aiTrades(f, createRng(52), { year: c.year, cap: c.cap, window: 'offseason' }); // the real code path (franchise.js, at free agency's opening)
  const sale = deals.filter((d) => d.sale); assert.equal(sale.length, 1, 'one sale'); const s = sale[0];
  assert.equal(s.seller, c.S); assert.equal(s.B, c.S); assert.equal(s.toA, c.m.id, 'the constructed starter is the one sold'); assert.equal(s.pos, c.pos);
  // the buyer the code chose meets the rules on its roster as it stood before the deal
  const rb = before[s.A]; assert.notEqual(modeOf(f, s.A), 'rebuild'); assert.equal(s.fl[0], floorAt(rb, c.pos)); assert.ok(monsterOverall(c.m) >= floorAt(rb, c.pos) + AI_TRADE_RULES.upgrade);
  for (const id of s.toBAll || []) { const p = rb.find((x) => x.id === id); assert.ok(sparesOf(rb).includes(p), 'paid from spares'); assert.ok(p.age <= STARTER_SALE.youngAge); }
  assert.equal(s.A, c.B, 'the constructed buyer'); assert.deepEqual(s.toBAll, c.ys.length ? c.ys.map((y) => y.id) : undefined, 'the constructed payment'); assert.deepEqual(s.picks || [], c.picks, 'and its picks'); assert.equal(s.na, Math.round(c.na)); assert.equal(s.nb, Math.round(c.nb));
  assert.ok(R.clubRoster(f, s.A).includes(c.m) && c.ys.every((y) => R.clubRoster(f, c.S).includes(y)), 'the monsters moved');
  const all = assertR4Sales(f); assert.equal(all.filter((t) => t.year === c.year && t.week === 0).length, 1, 'one sale in the window');
  assert.ok(!saleOpen(f, c.year, 0), 'the window is closed for sales');
  assert.deepEqual(R.verifyLeague(f), []);
});

test('R4 constructed scenario, one prerequisite removed: the replacement 5 behind (F4 fails), no sale', () => {
  const f = league52(); const c = constructSale(f, { repBehind: 5 });
  assert.equal(monsterOverall(c.m) - monsterOverall(c.rep), 5); assert.equal(hasReplacement(R.clubRoster(f, c.S), c.m), false, 'no replacement within 4');
  const deals = aiTrades(f, createRng(52), { year: c.year, cap: c.cap, window: 'offseason' });
  assert.deepEqual(deals.filter((d) => d.sale), [], 'no sale'); assert.equal((f.league.trades || []).filter((t) => t.sale).length, 0);
  assert.ok(R.clubRoster(f, c.S).includes(c.m), 'he stays'); assert.ok(saleOpen(f, c.year, 0));
  assert.deepEqual(R.verifyLeague(f), []);
});
