// Phase 4 (GDD §46): league-wide careers, League News about the league's moves, AI–AI trades, the forward-only compaction
// of award winner rows, the League Hub's data, and retirement as the only word for a permanent exit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as R from '../src/franchise/league-registry.js';
import * as N from '../src/franchise/league-news.js';
import * as LT from '../src/franchise/league-trades.js';
import * as LC from '../src/franchise/league-careers.js';
import { slimWinner, expandWinner, slimSeasonAwards, KEEP } from '../src/franchise/history-compact.js';
import { leaveLeague, releaseFromClub } from '../src/franchise/league.js';
import { careerProfile, trophyCase } from '../src/franchise/career-profile.js';
import { careerTimeline } from '../src/franchise/career.js';
import { newFranchise, runFranchise } from '../tools/franchise-soak.mjs';
import { leagueInvariants } from '../tools/league-soak.mjs';
import { createRng } from '../src/core/rng.js';
import { monsterOverall } from '../src/data/monsters.js';
import { ALL_TEAMS, tierById } from '../src/data/league.js';
import { marketValue } from '../src/franchise/trade-value.js';

const clubsOf = (f) => ALL_TEAMS.filter((t) => t !== f.club);
let shared = null; const two = () => (shared ||= runFranchise(51, { seasons: 2, difficulty: 'pro', check: leagueInvariants }));

test('every persistent monster has a career: per-game events (debuts, firsts, milestones, playoff stars), season-end events, evolutions; no duplicates; a full profile and timeline open', () => {
  const { f, problems } = two(); assert.deepEqual(problems, []);
  const ms = Object.values(f.league.monsters); const ev = ms.flatMap((m) => m.career?.ev || []);
  const kinds = new Set(ev.map((e) => e.t));
  for (const k of ['debut', 'first', 'playoff', 'season', 'milestone']) assert.ok(kinds.has(k), `${k} events are written for AI monsters`);
  assert.ok(ev.some((e) => e.t === 'evolve'), 'AI evolutions are noted');
  for (const m of ms) { const ks = (m.career?.ev || []).map((e) => e.k); assert.equal(new Set(ks).size, ks.length, `${m.name}: no duplicate events`); }
  const star = ms.filter((m) => (m.career?.ev || []).length).sort((a, b) => b.career.ev.length - a.career.ev.length)[0];
  const p = careerProfile(f, star.id); assert.equal(p.kind, 'full'); assert.equal(p.where, 'league'); assert.ok(p.timeline.length >= 3); assert.ok(p.stats.games > 0);
  assert.ok(careerTimeline(star).length >= 3); assert.ok(Array.isArray(trophyCase(f, star)));
  // identities survive: ids and clubs in the history
  assert.ok(ms.every((m) => (m.history || []).length >= 1 && m.history.at(-1).to == null));
});

test('League News: only meaningful moves, two a week in season, one offseason digest of eight, one draft digest, one line per monster, awards count repeats, records name a broken own mark', () => {
  const { f } = two(); const moves = f.leagueNews.filter((it) => N.TRANSACTION_KINDS.has(it.kind));
  const perWeek = {}; for (const it of moves) if (it.week > 0 && it.kind !== 'moves' && it.kind !== 'draft') perWeek[`${it.year}|${it.week}`] = (perWeek[`${it.year}|${it.week}`] || 0) + 1;
  assert.ok(Object.values(perWeek).every((n) => n <= N.TRANSACTIONS_PER_WEEK), `at most ${N.TRANSACTIONS_PER_WEEK} move lines a week: ${JSON.stringify(perWeek)}`);
  const digests = moves.filter((it) => it.kind === 'moves'); assert.ok(digests.length >= 1); for (const d of digests) { assert.ok(d.lines.length <= N.OFFSEASON_DIGEST); assert.equal(new Set(d.lines.map((l) => l.mid)).size, d.lines.length, 'one line per monster'); assert.equal(d.week, 0); }
  const drafts = moves.filter((it) => it.kind === 'draft'); assert.ok(drafts.length >= 1 && drafts[0].lines.length >= 1);
  const ctx = { club: f.club, rival: f.rivals[f.tier].team, division: [] };
  assert.equal(N.meaningfulMove({ kind: 'signing', ovr: 55, club: 'X' }, ctx), false, 'a reserve signing is silent');
  assert.equal(N.meaningfulMove({ kind: 'signing', ovr: 66, club: 'X' }, ctx), true); assert.equal(N.meaningfulMove({ kind: 'release', ovr: 50, club: 'X', formerMine: true }, ctx), true); assert.equal(N.meaningfulMove({ kind: 'draft', ovr: 50, round: 2, club: 'X' }, ctx), false); assert.equal(N.meaningfulMove({ kind: 'draft', ovr: 50, round: 1, club: 'X' }, ctx), true); assert.equal(N.meaningfulMove({ kind: 'retire', ovr: 40 }, ctx), true);
  const many = Array.from({ length: 9 }, (_, i) => ({ kind: 'signing', ovr: 70 + i, club: 'A', mid: `m${i}`, mname: `M${i}`, position: 'QB' }));
  assert.equal(N.movesNews({ year: 1, week: 3, events: many, ...ctx }).length, N.TRANSACTIONS_PER_WEEK); assert.equal(N.offseasonDigest({ year: 2, events: many, ...ctx })[0].lines.length, N.OFFSEASON_DIGEST);
  const walkThenClaim = [{ kind: 'release', reason: 'walked', ovr: 70, club: 'A', mid: 'm1', mname: 'M1', position: 'QB' }, { kind: 'signing', via: 'waivers', ovr: 70, club: 'B', from: 'A', mid: 'm1', mname: 'M1', position: 'QB' }];
  const d = N.offseasonDigest({ year: 2, events: walkThenClaim, ...ctx })[0]; assert.equal(d.lines.length, 1); assert.match(d.lines[0].text, /claim .* off waivers, late of A/);
  const aw = N.awardNews({ year: 5, week: 10, winners: { mvp: { id: 'm1', name: 'M1', team: 'A', position: 'QB' } }, priorOf: () => 2 }); assert.match(aw[0].text, /his third/);
  const rec = N.recordNews({ year: 3, week: 4, seasonsInBook: 2, records: { game: { passYds: { value: 410, id: 'm1', name: 'M1', team: 'A', opp: 'B', year: 3, week: 4, prev: { value: 390, id: 'm1', name: 'M1', year: 2 } } } }, scope: 'game' });
  assert.match(rec[0].text, /breaks his own mark/);
});

test('AI–AI trades: uncommon, fair, within the cap and the roster limits, never a protected monster, deterministic by seed', () => {
  const a = runFranchise(52, { seasons: 3, difficulty: 'pro' }).f; const b = runFranchise(52, { seasons: 3, difficulty: 'pro' }).f;
  assert.deepEqual(a.league.trades, b.league.trades, 'one seed, one league');
  const tr = a.league.trades || []; assert.ok(tr.length >= 2 && tr.length <= 12, `${tr.length} trades in three offseasons and seasons`);
  const perYear = {}; for (const t of tr) perYear[t.year] = (perYear[t.year] || 0) + 1; assert.ok(Object.values(perYear).every((n) => n <= LT.AI_TRADE_RULES.offseasonMax + 2), JSON.stringify(perYear));
  for (const t of tr) { const m = a.league.monsters[t.toA]; if (m) { assert.ok(!R.isProtected(m)); assert.equal(m.traded?.from, t.B); assert.ok(m.history.some((h) => h.club === t.B && h.reason === 'traded')); } }
  assert.deepEqual(R.verifyLeague(a), []);
  // a window on a prepared league: value bands and the cap hold for every deal made
  const f = newFranchise(53); const cap = tierById(f.tier).cap; const r = createRng(4); const before = Object.fromEntries(clubsOf(f).map((c) => [c, R.clubRoster(f, c).map((m) => m.id)]));
  f.season.finished = true; const deals = LT.aiTrades(f, r, { year: 2, cap, window: 'offseason' });
  for (const d of deals) {
    assert.ok(R.clubCapRoom(f, d.A, cap) >= 0 && R.clubCapRoom(f, d.B, cap) >= 0, 'both under the cap');
    assert.ok(R.clubRoster(f, d.A).length <= 38 && R.clubRoster(f, d.B).length >= 26);
    const m = f.league.monsters[d.toA]; assert.ok(m && !R.isProtected(m) && R.clubOf(f, m.id) === d.A && !before[d.A].includes(m.id));
    if (d.kind === 'swap') { const x = f.league.monsters[d.toB]; const ratio = marketValue(m, { year: 2 }) / marketValue(x, { year: 2 }); assert.ok(ratio >= LT.AI_TRADE_RULES.band[0] - 1e-9 && ratio <= LT.AI_TRADE_RULES.band[1] + 1e-9, `fair: ${ratio}`); }
  }
  for (const c of clubsOf(f)) for (const id of R.clubRecord(f, c).protected) assert.ok(R.clubRoster(f, c).some((m) => m.id === id), 'protected monsters never move');
  assert.deepEqual(R.verifyLeague(f), []);
});

test('compaction is forward-only and lossless: a slimmed winner row expands to the original from the book; kept fields never move; older saves are untouched', () => {
  const { f } = two(); const h = f.history[0]; const year = h.year; const monsterOf = (id) => f.roster.find((m) => m.id === id) || f.league.monsters[id] || (f.league.waivers || []).find((m) => m.id === id) || null; // a winner may be on waivers by now: his book travels with him
  const winners = Object.entries(h.awards.league).filter(([k, w]) => w && k !== 'coy'); assert.ok(winners.length >= 3);
  for (const [, w] of winners) {
    const row = h.leagueStats[w.team][w.id]; assert.ok(row, 'the table row of the season');
    assert.equal(w.slim, 1, 'slimmed at season end'); const back = expandWinner(w, year, monsterOf);
    for (const [k, v] of Object.entries(row)) if (typeof v === 'number') assert.equal(back[k], v, `${w.name}.${k}`);
    for (const k of ['id', 'name', 'team', 'position', 'score', 'why']) assert.ok(k in w, `${k} kept`);
    assert.ok(w.line, 'the stat line as text');
  }
  // unit: a row whose book holds nothing is left whole; a second pass changes nothing
  const w = { id: 'x', name: 'X', team: 'T', position: 'QB', passYds: 100, score: 1, why: 'w' }; assert.deepEqual(slimWinner({ ...w }, 1, () => null), []);
  const L = { league: { mvp: { ...w } } }; assert.equal(slimSeasonAwards(L, 1, () => ({ stats: { v: 2, season: { year: 1, reg: { passYds: 100 }, post: {} }, seasons: [] } })), 1); assert.equal(slimSeasonAwards(L, 1, () => null), 0);
  assert.ok(!('passYds' in L.league.mvp) && L.league.mvp.slim === 1 && KEEP.has('why'));
  // a save without a registry (v40 and before) never slims
  const g = runFranchise(54, { seasons: 1, legacy: true }).f; for (const x of Object.values(g.history[0].awards.league)) if (x && typeof x === 'object') assert.ok(!x.slim);
});

test('the League Hub data: 16 clubs, rosters with tenure and deals, career leaders over the universe including retired legends, protected monsters, head-to-head', () => {
  const { f } = two();
  const dir = LC.clubDirectory(f, { overallOf: () => 60 }); assert.equal(dir.length, 16); assert.equal(dir.filter((c) => c.mine).length, 1); assert.ok(dir.some((c) => c.protected.length));
  const club = clubsOf(f)[0]; const rows = LC.clubRosterView(f, club); assert.ok(rows.length >= 26); assert.ok(rows.every((m) => m.id && m.ovr > 0 && (m.permanent || m.ends != null)));
  const L = LC.universeCareerLeaders(f, { n: 5 }); assert.ok(Object.keys(L).length >= 6); assert.ok(L.tacklesTotal[0].value >= L.tacklesTotal[4].value);
  const mine = LC.universeCareerLeaders(f, { n: 3, mine: true }); for (const rows2 of Object.values(mine)) assert.ok(rows2.every((r) => r.where === 'roster'));
  const prot = LC.protectedMonsters(f); assert.ok(prot.some((p) => p.kind === 'signature') && prot.some((p) => p.kind === 'legendary')); assert.ok(prot.every((p) => p.games >= 0));
  const h2h = LC.headToHead(f, f.rivals[f.tier].team); assert.equal(h2h.games.length, h2h.w + h2h.l); assert.ok(h2h.games.length >= 1, 'the schedule does not meet every club every season');
  // a legend appears among the leaders when he out-totals the living
  const stub = { id: 'm_legend', name: 'Old Hand', species: f.roster[0].species, position: 'LB', type: f.roster[0].type, career: { games: 300, tackles: 2000, assists: 500 }, seasons: [], ev: [] };
  f.league.legends[stub.id] = stub; const L2 = LC.universeCareerLeaders(f, { n: 1 }); assert.equal(L2.tacklesTotal[0].id, 'm_legend'); assert.equal(L2.tacklesTotal[0].where, 'legend'); delete f.league.legends[stub.id];
});

test('retirement is a permanent exit: a decorated veteran leaving the league retires (one News line, a stub with his season books); a walk, a release or a waiver claim never says so', () => {
  const f = newFranchise(55); const club = clubsOf(f)[0]; const year = 1; f.season.week = 3;
  const vet = R.clubRoster(f, club).filter((m) => !R.isProtected(m))[0]; vet.stats.seasons.push({ year: 0, team: club, reg: { games: 9, tackles: 50 }, post: {} });
  f.history.push({ year: 0, club: f.club, awards: { league: { dpoy: { id: vet.id, team: club, name: vet.name } } } });
  const q0 = (f.league.events || []).length;
  R.removeFromClub(f, club, vet.id, { year, reason: 'walked' }); const where = leaveLeague(f, vet, { year, club });
  assert.equal(where, 'legend'); const ev = f.league.events.slice(q0); assert.ok(ev.some((e) => e.kind === 'retire' && e.mid === vet.id && /Defensive Monster of the Year/.test(e.honours)));
  assert.ok(f.league.legends[vet.id].seasons.length >= 1, 'his season books stay with the stub');
  const prof = careerProfile(f, vet.id); assert.equal(prof.kind, 'full'); assert.equal(prof.where, 'legend');
  assert.match(N.moveText(ev.find((e) => e.kind === 'retire')), /retires/);
  const other = R.clubRoster(f, club).filter((m) => !R.isProtected(m) && monsterOverall(m) > 60)[0]; const q1 = f.league.events.length;
  const rel = releaseFromClub(f, club, other.id, { year, reason: 'released' }); assert.notEqual(rel.where, 'legend');
  assert.ok(f.league.events.slice(q1).every((e) => e.kind !== 'retire'), 'a release is not a retirement');
  for (const e of f.league.events) if (e.kind === 'release' || e.kind === 'signing') assert.ok(!/retire/.test(N.moveText(e)));
});
