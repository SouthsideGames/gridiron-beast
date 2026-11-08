// Task 6 Phase D: strategy modes (R2), rebuilding clubs' starter sales (R4), mode weights in contracts (R3), free-agency upgrades (R5)
// and the draft (R7). Approved specification §1.8; owner's authorisation of 2026-11-02 (docs/TASK6_DECISIONS.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODES, STRATEGY, rawMode, nextMode, evaluateStrategies, modeOf, strategyInputs } from '../src/franchise/strategy.js';
import { modeLength, leagueContracts, leagueUpgrades, upgradesAllowed, CONTEND_UPGRADES, UPGRADES_PER_OFFSEASON, UPGRADE_MIN } from '../src/franchise/league-season.js';
import { POTENTIAL_WEIGHT, READY_BONUS, aiDraftPick } from '../src/franchise/draft.js';
import { STARTER_SALE, saleOpen, sellableStarters, aiTrades, hasReplacement, AI_TRADE_RULES, inBand, starters, floorAt, sparesOf } from '../src/franchise/league-trades.js';
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
import { tradable } from '../src/franchise/trades.js';
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
  const outcome = (mode, { ready, pastBy }) => /* ready: true (within 4, slightly behind), 'equal' (as good), false (5–8 behind) */ { const f = leagueWith(73); const club = R.leagueClubs(f).slice().sort().find((c) => !isGymClub(c)); setMode(f, club, mode);
    const roster = R.clubRoster(f, club); const starters = new Set(Object.values(buildDepthChart(roster)).filter(Boolean));
    const plan = rosterPlan(roster, null, { starters }); const row = Object.values(plan.groups).flatMap((g) => g.rows).find((r) => r.successor && !R.isProtected(r.starter) && !R.isProtected(r.successor));
    assert.ok(row, 'a starter with a successor'); const st = row.starter, su = row.successor;
    su.attributes = Object.fromEntries(Object.entries(st.attributes).map(([k, v]) => [k, ready === 'equal' ? v : ready ? Math.max(20, v - 1) : Math.max(20, v - 7)])); su.potential = 99; su.age = 23; // ready and as good, or 5–8 behind (qualifies by potential, not ready)
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
    for (const pos of ['TE', 'RB']) for (const t of R.clubRoster(f, club).filter((m) => m.position === pos)) for (const k of Object.keys(t.attributes)) t.attributes[k] = Math.max(20, t.attributes[k] - 25); // two weak groups
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
  const pickFor = (mode, rows = []) => { const f = { draft: { class: [now, upside], available: [now.id, upside.id], picks: [] } };
    return aiDraftPick(f, 'X', { next: () => 0.5 }, { plan: { mode, groups: { LB: { rows, weakNeed: 0 } } } }).id; };
  assert.equal(pickFor('rebuild'), upside.id, 'the rebuilder takes the upside');
  assert.equal(pickFor('compete'), now.id, 'Compete keeps the standing weight (0.20)'); assert.equal(pickFor('retool'), now.id);
  assert.equal(pickFor('contend', [{ starter: mon('LB', 60, 28) }]), now.id, 'the contender takes the one who starts now');
  const close = mon('LB', 61, 22); close.potential = 70; const far = mon('LB', 62, 22); far.potential = 70; // the contender's readiness bonus decides between two near-equals
  const f2 = { draft: { class: [close, far], available: [close.id, far.id], picks: [] } }; const weakest = mon('LB', 0, 28); weakest.attributes = { ...close.attributes };
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

// The fixture: league 52 after one played season (runFranchise(52, { seasons: 1 }): season 1, its offseason, free agency and the draft).
// Its year-2 offseason trade window ran when free agency opened, with no sale, so the window is still open for one (saleOpen). Each
// scenario works on its own copy (a save round trip).
let played52 = null;
const league52 = () => {
  if (!played52) { const { f, problems } = runFranchise(52, { seasons: 1 }); assert.deepEqual(problems, []); played52 = Save.exportJson(f); }
  return Save.importJson(played52);
};
/** A rating edit through the development record: every attribute moves the same share of the way from its current value toward its
 *  own ceiling (dev.potential) until the overall reaches `target`; syncFromDev mirrors it onto the monster, as development does. */
function rateTo(m, target) {
  const d = m.dev, from = { ...d.current };
  for (let i = 0; i <= 400; i++) { const t = i / 400; for (const k of Object.keys(from)) d.current[k] = Math.round(from[k] + t * ((d.potential[k] ?? from[k]) - from[k])); if (overall(d.current, m.position) >= target) break; }
  syncFromDev(m); assert.equal(monsterOverall(m), target, `${m.name} rated ${target} within his ceilings`);
}
/** A ceiling edit: every attribute ceiling moves the same share of the way toward 99 until the potential (the OVR of the ceilings) is `target`. */
function ceilingTo(m, target) {
  const d = m.dev, from = { ...d.potential };
  for (let i = 0; i <= 400; i++) { const t = i / 400; for (const k of Object.keys(from)) d.potential[k] = Math.round(from[k] + t * (99 - from[k])); if (overall(d.potential, m.position) >= target) break; }
  syncFromDev(m); assert.equal(m.potential, target, `${m.name}'s ceiling ${target}`);
}

/**
 * Build the scenario on league 52, every step an ordinary data edit (a mode, two ratings, one set of ceilings), and compute every R4
 * prerequisite with the code's own helpers before the real code runs. `repBehind`: how far the replacement is behind the sold starter.
 */
function constructSale(f, { repBehind }) {
  const year = f.season.year + 1, cap = tierById(f.tier).cap; // the offseason window's arguments, as franchise.js passes them
  const S = 'Bayou Stalkers', B = 'Stonehaven Titans', POS = 'S', slots = GROUP_SLOTS[POS].length;
  // Step 1, modes: the seller is in Rebuild (it is after season 1; set explicitly) and is the only rebuilding club; the buyer is not
  // rebuilding (Retool after season 1). The seller is an ordinary club: a gym never falls below Compete.
  R.clubRecord(f, S).strategy.mode = 'rebuild';
  for (const c of R.leagueClubs(f)) if (c !== S && modeOf(f, c) === 'rebuild') R.clubRecord(f, c).strategy.mode = 'retool';
  assert.equal(modeOf(f, S), 'rebuild'); assert.ok(!isGymClub(S)); assert.deepEqual(R.leagueClubs(f).filter((c) => modeOf(f, c) === 'rebuild'), [S]);
  assert.notEqual(modeOf(f, B), 'rebuild', 'the buyer is not rebuilding');
  const rosterS = R.clubRoster(f, S), rosterB = R.clubRoster(f, B);
  // Step 2, the starter: the seller's sellable safety (28, within 2 seasons of his public onset), rated up to 57 OVR within his ceilings.
  // He stays a starter (the club's other starting safety is 58).
  const m = sellableStarters(f, rosterS).find((x) => x.position === POS); assert.ok(m, 'a sellable safety');
  rateTo(m, 57);
  assert.ok(starters(rosterS, POS).slice(0, slots).includes(m), 'he starts');
  assert.ok(tradable(f, m) && !R.isProtected(m) && !isUnavailable(m), 'tradable, not protected, available');
  assert.ok(m.age > STARTER_SALE.youngStarAge, `older than ${STARTER_SALE.youngStarAge}: ${m.age}`); assert.ok(horizonOf(m) <= PLAN.ageingHorizon, `within ${PLAN.ageingHorizon} seasons of his onset: ${horizonOf(m)}`);
  assert.ok(sellableStarters(f, rosterS).includes(m));
  // Step 3, the replacement (F4): the safety who would take his slot (the next available at the position), a veteran, rated `repBehind`
  // below him.
  const rep = starters(rosterS, POS).filter((x) => x !== m && !isUnavailable(x))[slots - 1]; assert.ok(rep && rep.age > PLAN.successorAge, 'a veteran next in line');
  rateTo(rep, monsterOverall(m) - repBehind);
  const replaced = monsterOverall(rep) >= monsterOverall(m) - STARTER_SALE.replacementWithin;
  assert.equal(hasReplacement(rosterS, m), replaced, 'F4 as the code reads it');
  // the real search reaches him first: no sellable starter ahead of him in its order has a replacement
  if (replaced) assert.equal(sellableStarters(f, rosterS).filter((x) => hasReplacement(rosterS, x))[0], m, 'first in the search order');
  // Step 4, the buyer's legitimate need (no edit): his weakest available starting safety (45) is beaten by the bar (AI_TRADE_RULES.upgrade).
  assert.ok(monsterOverall(m) >= floorAt(rosterB, POS) + AI_TRADE_RULES.upgrade, `need: ${monsterOverall(m)} against ${floorAt(rosterB, POS)} + ${AI_TRADE_RULES.upgrade}`);
  // Step 5, the payment: the buyer's deepest safety, a 22-year-old spare, with his ceilings raised to a 58 potential. A young monster's
  // market value is mostly his upside (0.6 per point of headroom at 26 or under), so he is priced like the 57-OVR veteran.
  const y = starters(rosterB, POS).at(-1); ceilingTo(y, 58);
  assert.ok(sparesOf(rosterB).includes(y), 'a spare'); assert.ok(tradable(f, y) && !R.isProtected(y) && !isUnavailable(y)); assert.ok(y.age <= STARTER_SALE.youngAge, `young: ${y.age}`);
  const vm = marketValue(m, { year }), vy = marketValue(y, { year });
  assert.ok(inBand(vy, vm), `a fair price both ways: ${vy.toFixed(1)} for ${vm.toFixed(1)}`);
  // Step 6, judge() (the existing deal rules), computed with the same functions: no return lock, no legendary, both rosters legal, both
  // under the cap; the gains (buyer >= DEAL_RULES.minGain, seller >= DEAL_RULES.sellerFloor) are returned for the scenario to assert.
  assert.equal(returnLock(f, m, B), null); assert.equal(returnLock(f, y, S), null); assert.equal(legendSide(m), null); assert.equal(legendSide(y), null);
  const afterB = rosterAfter(rosterB, { give: [y], get: [m] }), afterS = rosterAfter(rosterS, { give: [m], get: [y] });
  assert.deepEqual([...rosterProblems(rosterB, afterB), ...rosterProblems(rosterS, afterS)], [], 'both rosters legal');
  const roomB = R.clubCapRoom(f, B, cap), roomS = R.clubCapRoom(f, S, cap);
  assert.ok(roomB + y.salary - m.salary >= Math.min(0, roomB) && roomS + m.salary - y.salary >= Math.min(0, roomS), 'both under the cap');
  const na = scoped(() => rosterNet(rosterB, { give: [y], get: [m] }, year)), nb = scoped(() => rosterNet(rosterS, { give: [m], get: [y] }, year));
  // Step 7, the window: the year-2 offseason window has had no sale.
  assert.ok(f.season.finished); assert.ok(saleOpen(f, year, 0), 'the sale window is open');
  return { year, cap, S, B, m, y, rep, na, nb, salesBefore: (f.league.trades || []).filter((t) => t.sale).length };
}

test('R4 constructed scenario: every prerequisite holds, so the real offseason window sells the ageing starter by the approved rules', () => {
  const f = league52(); const c = constructSale(f, { repBehind: 1 });
  assert.ok(c.na >= DEAL_RULES.minGain, `buyer gain ${c.na.toFixed(1)} >= ${DEAL_RULES.minGain}`); assert.ok(c.nb >= DEAL_RULES.sellerFloor, `seller ${c.nb.toFixed(1)} >= ${DEAL_RULES.sellerFloor}`);
  assert.equal(c.salesBefore, 0);
  const before = Object.fromEntries(R.leagueClubs(f).map((k) => [k, R.clubRoster(f, k).slice()]));
  const deals = aiTrades(f, createRng(52), { year: c.year, cap: c.cap, window: 'offseason' }); // the real code path (franchise.js, at free agency's opening)
  const sale = deals.filter((d) => d.sale); assert.equal(sale.length, 1, 'one sale'); const s = sale[0];
  assert.equal(s.seller, c.S); assert.equal(s.B, c.S); assert.equal(s.toA, c.m.id, 'the constructed starter is the one sold'); assert.equal(s.pos, 'S');
  // the buyer the code chose meets the rules on its roster as it stood before the deal
  const rb = before[s.A]; assert.notEqual(modeOf(f, s.A), 'rebuild'); assert.equal(s.fl[0], floorAt(rb, 'S')); assert.ok(monsterOverall(c.m) >= floorAt(rb, 'S') + AI_TRADE_RULES.upgrade);
  for (const id of s.toBAll || []) { const p = rb.find((x) => x.id === id); assert.ok(sparesOf(rb).includes(p), 'paid from spares'); assert.ok(p.age <= STARTER_SALE.youngAge); }
  assert.equal(s.A, c.B, 'the constructed buyer'); assert.deepEqual(s.toBAll, [c.y.id], 'the constructed payment'); assert.equal(s.na, Math.round(c.na)); assert.equal(s.nb, Math.round(c.nb));
  assert.ok(R.clubRoster(f, s.A).includes(c.m) && R.clubRoster(f, c.S).includes(c.y), 'the monsters moved');
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
