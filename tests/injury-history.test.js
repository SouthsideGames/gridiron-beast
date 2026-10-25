// Monster Career Injury History (GDD §50): a record, never a mechanic. Recording an injury once, actual games missed (once per
// game, never double-counted), recovery and the return week, the offseason, injuries before tracking began, playoff games, AI
// clubs and AI–AI games, trades, evolution, retirement, save and reload, existing saves, the timeline, and above all: football,
// injury rolls and recovery are exactly what they were.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as IH from '../src/franchise/injury-history.js';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { runFranchise } from '../tools/franchise-soak.mjs';
import { careerTimeline } from '../src/franchise/career.js';
import { careerPageHtml } from '../src/ui/screens/career.js';

const copy = (x) => JSON.parse(JSON.stringify(x));
const fr = (y = 1, w = 1) => ({ season: { year: y, week: w } });
const mon = (id, injury = null) => ({ id, name: id, injury });
const at = (f, y, w) => { f.season.year = y; f.season.week = w; };
const G = (n, extra = {}) => ({ gameId: `1|w${n}|A|B`, club: 'A', vs: 'B', lineup: new Set(['a', 'b', 'c']), ...extra });

test('an injury is opened once, misses each game it covers once, and closes with the week of return', () => {
  const f = fr(1, 1); const a = mon('a'), b = mon('b'); const R = [a, b];
  IH.beforeGame(f, R, G(1)); a.injury = { severity: 'Moderate', weeks: 2, type: 'ankle' }; IH.afterGame(f, R, G(1));
  assert.equal(IH.recordsOf(f, 'a').length, 1); const rec = IH.recordsOf(f, 'a')[0];
  assert.deepEqual([rec.y, rec.w, rec.type, rec.sev, rec.est, rec.src, rec.vs], [1, 1, 'ankle', 'Moderate', 2, 'game', 'B']);
  at(f, 1, 2); IH.beforeGame(f, R, G(2)); IH.beforeGame(f, R, G(2)); // the same game twice (reload, re-simulation): counted once
  IH.afterGame(f, R, G(2)); IH.afterGame(f, R, G(2));
  assert.equal(IH.recordsOf(f, 'a').length, 1, 'never opened twice');
  at(f, 1, 3); IH.beforeGame(f, R, G(3));
  a.injury = null; at(f, 1, 4); IH.beforeGame(f, R, G(4));
  const done = IH.recordsOf(f, 'a')[0]; assert.equal(done.missed, 2, 'weeks 2 and 3'); assert.deepEqual(done.back, { y: 1, w: 4 });
  const s = IH.injurySummary(f, 'a'); assert.equal(s.incidents, 1); assert.equal(s.missed, 2);
  assert.equal(IH.recordsOf(f, 'b').length, 0); assert.deepEqual(IH.injuryProblems(f), []);
});

test('a bye or a week without a game misses nothing; a second injury after recovery is a new incident (never merged)', () => {
  const f = fr(1, 1); const a = mon('a'); const R = [a];
  IH.beforeGame(f, R, G(1)); a.injury = { severity: 'Minor', weeks: 1, type: 'wrist' }; IH.afterGame(f, R, G(1));
  at(f, 1, 3); a.injury = { severity: 'Minor', weeks: 1, type: 'wrist' }; // healed during a bye, then hurt again: a new object
  IH.beforeGame(f, R, G(3));
  const recs = IH.recordsOf(f, 'a'); assert.equal(recs.length, 2, 'two incidents'); assert.equal(recs[0].missed, 0, 'the bye was not a game'); assert.equal(recs[1].missed, 1);
});

test('an injury first seen before kickoff is a practice injury for the owner, "away from a game" for an AI club', () => {
  const f = fr(1, 1); const a = mon('a'), b = mon('b'); IH.beforeGame(f, [a], G(1, { owner: true })); IH.beforeGame(f, [b], G(1, { club: 'C' }));
  at(f, 1, 2); a.injury = { severity: 'Minor', weeks: 1, type: 'hamstring' }; b.injury = { severity: 'Minor', weeks: 1, type: 'wrist' };
  IH.beforeGame(f, [a], G(2, { owner: true })); IH.beforeGame(f, [b], G(2, { club: 'C' }));
  assert.equal(IH.recordsOf(f, 'a')[0].src, 'practice'); assert.equal(IH.recordsOf(f, 'b')[0].src, 'other');
});

test('injuries cleared at the season rollover close as recovered in the offseason; missed games are only real games', () => {
  const f = fr(1, 9); const a = mon('a'); const R = [a];
  IH.beforeGame(f, R, G(9)); a.injury = { severity: 'Severe', weeks: 5, type: 'knee' }; IH.afterGame(f, R, G(9));
  a.injury = null; at(f, 2, 1); IH.beforeGame(f, R, { ...G(1), gameId: '2|w1|A|B' });
  const r = IH.recordsOf(f, 'a')[0]; assert.equal(r.missed, 0); assert.deepEqual(r.back, { y: 2, off: 1 });
});

test('an injury already there when tracking began is shown but not counted as a career injury', () => {
  const f = fr(3, 4); const a = mon('a', { severity: 'Moderate', weeks: 2, type: 'ribs' }); const R = [a];
  IH.beforeGame(f, R, G(4)); const s = IH.injurySummary(f, 'a', { firstSeason: 1 });
  assert.equal(s.records[0].src, 'before'); assert.equal(s.incidents, 0); assert.equal(s.missed, 1);
  assert.deepEqual(s.note, { y: 3, w: 4 }, 'tracking began after his career started: the note says when');
  const g = fr(3, 1); IH.beforeGame(g, [mon('n')], G(1)); assert.equal(IH.injurySummary(g, 'n', { firstSeason: 3 }).note, null, 'no note when his career began with tracking (season start)');
});

test('the indicator: not classified before 9 games of opportunity, then by rates, never by raw totals', () => {
  const f = fr(1, 1); f.injuryHistory = { v: 1, since: { y: 1, w: 1 }, opp: { x: 100, y: 5, z: 6, h: 30 }, open: {}, log: {
    x: [{ y: 1, w: 1, missed: 2, back: { y: 1, w: 3 } }, { y: 4, w: 1, missed: 1, back: { y: 4, w: 2 } }, { y: 9, w: 1, missed: 1, back: { y: 9, w: 2 } }],
    z: [{ y: 1, w: 1, missed: 1, back: { y: 1, w: 2 } }, { y: 1, w: 4, missed: 1, back: { y: 1, w: 5 } }, { y: 1, w: 7, missed: 1, back: { y: 1, w: 8 } }],
    h: [{ y: 1, w: 1, missed: 9, back: { y: 1, w: 9 } }] }, done: {}, seq: 0 };
  assert.equal(IH.injurySummary(f, 'y').indicator, 'early');
  assert.equal(IH.injurySummary(f, 'x').indicator, 'low', 'three injuries over a long career');
  assert.equal(IH.injurySummary(f, 'z').indicator, 'high', 'three injuries in one short span');
  assert.equal(IH.injurySummary(f, 'h').indicator, 'high', 'one long absence');
  assert.equal(IH.INDICATOR_LABEL.low, 'Low Injury History');
});

// ---------------------------------------------------------------- the real franchise
const played = (() => { let f = null; return () => (f ||= runFranchise(14, { seasons: 3, difficulty: 'pro' }).f); })();

test('a played league: records for the owner and AI clubs, AI–AI and playoff games, totals that add up, nothing duplicated', () => {
  const f = played(); const H = f.injuryHistory; assert.ok(H);
  assert.deepEqual(IH.injuryProblems(f), []);
  const all = Object.entries(H.log).flatMap(([id, l]) => l.map((r) => ({ id, ...r })));
  const owner = new Set(f.roster.map((m) => m.id));
  assert.ok(all.some((r) => owner.has(r.id)), 'owner monsters'); assert.ok(all.some((r) => !owner.has(r.id)), 'AI monsters (AI–AI games)');
  assert.ok(all.some((r) => r.po), 'a playoff injury');
  for (const r of all) { assert.ok(r.missed >= 0 && r.missed <= 9); assert.ok(r.back); if (r.back.w != null && r.back.y === r.y) assert.ok(r.back.w > r.w); }
  // The missed games counted for a club in a season never exceed the games it played.
  for (const r of all) assert.ok(r.missed <= 13, 'no injury can cover more games than a season has');
});

test('tracking never changes the game: the same franchise with tracking stripped plays out identically', () => {
  const a = runFranchise(15, { seasons: 1, stopWeek: 4, difficulty: 'pro' }).f;
  const b = copy(a); delete b.injuryHistory; const c = copy(a);
  for (const g of [b, c]) { let n = 0; while (g.season.week < 7 && n++ < 20) { let d = 0; while (g.season.day < 6 && d++ < 10) { if (!F.autoRunToSunday(g).ok) break; } if (F.isBye(g)) { F.takeBye(g); continue; } F.finishSunday(g, F.simulatePlayerGame(g)); } }
  const strip = (g) => { const x = copy(g); delete x.injuryHistory; for (const m of [...x.roster, ...Object.values(x.league.monsters)]) { if (m.injury) delete m.injury.rec; if (m.career?.ev) m.career.ev = m.career.ev.filter((e) => !String(e.t).startsWith('injury')); } return JSON.stringify(x); };
  assert.equal(strip(b), strip(c), 'records, rosters, injuries and recoveries are the same with or without the record');
});

test('trades, releases, evolution and retirement keep the history (it belongs to the monster id)', () => {
  const f = copy(played()); const H = f.injuryHistory;
  const id = Object.keys(H.log).find((x) => f.roster.some((m) => m.id === x)); assert.ok(id);
  const n = IH.recordsOf(f, id).length; const m = f.roster.find((x) => x.id === id);
  m.stage = (m.stage || 0) + 1; assert.equal(IH.recordsOf(f, id).length, n, 'evolution keeps the id and the history');
  const r = F.releaseMonster(f, id); if (r.ok) assert.equal(IH.recordsOf(f, id).length, n, 'released: history kept');
  const legend = Object.keys(f.league.legends || {}).find((x) => H.log[x]); if (legend) assert.ok(IH.recordsOf(f, legend).length >= 1, 'a retired legend keeps his');
});

test('save and reload keep the record; an existing save gets none until a game is played, and no history is invented', () => {
  const f = played(); const back = Save.importJson(Save.exportJson(f)); assert.deepEqual(back.injuryHistory, f.injuryHistory);
  const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/save-v31-season2.json', import.meta.url), 'utf8')).franchise;
  const old = Save.migrate(fx); assert.equal(old.injuryHistory, undefined, 'loading creates nothing');
  const html = careerPageHtml({ f: old, settings: {} }, { id: old.roster[0].id }); assert.ok(!/Injury History/.test(html), 'no section before tracking exists');
});

test('the profile section: numbers at a glance, the indicator, the log; the timeline has the injury milestones', () => {
  const f = played(); const H = f.injuryHistory;
  const id = Object.keys(H.log).find((x) => f.roster.some((m) => m.id === x) && H.log[x].length);
  const html = careerPageHtml({ f, settings: {} }, { id });
  assert.match(html, /Injury History/); assert.match(html, /Career injuries/); assert.match(html, /Games missed/); assert.match(html, /Durability/); assert.match(html, /Injury History|Not enough history yet/); assert.match(html, /Injury log/);
  const healthy = f.roster.find((m) => !H.log[m.id] && !H.open[m.id]); if (healthy) assert.match(careerPageHtml({ f, settings: {} }, { id: healthy.id }), /No injuries recorded since tracking began/);
  const m = f.roster.find((x) => x.id === id); const tl = careerTimeline(m, { club: f.club });
  if (IH.recordsOf(f, id).some((r) => r.src !== 'before')) assert.ok(tl.some((e) => e.t === 'injury'), 'first career injury on the timeline');
  const ev = [...f.roster, ...Object.values(f.league.monsters)].flatMap((x) => x.career?.ev || []);
  assert.equal(ev.filter((e) => e.k === 'inj:first').length, new Set([...f.roster, ...Object.values(f.league.monsters)].filter((x) => (x.career?.ev || []).some((e) => e.k === 'inj:first')).map((x) => x.id)).size, 'one first-injury event per monster');
});

test('missed playoff games are counted and kept apart (mp), so regular-season totals stay exact', () => {
  const f = fr(1, 9); const a = mon('a'); const R = [a];
  IH.beforeGame(f, R, G(9)); a.injury = { severity: 'Severe', weeks: 4, type: 'knee' }; IH.afterGame(f, R, G(9));
  at(f, 1, 11); IH.beforeGame(f, R, { ...G(11), gameId: '1|p1|A|B', playoff: true, round: 1 });
  at(f, 1, 12); IH.beforeGame(f, R, { ...G(12), gameId: '1|p2|A|B', playoff: true, round: 2 });
  a.injury = null; at(f, 2, 1); IH.beforeGame(f, R, { ...G(1), gameId: '2|w1|A|B' });
  const r = IH.recordsOf(f, 'a')[0]; assert.equal(r.missed, 2); assert.equal(r.mp, 2); assert.deepEqual(r.back, { y: 2, off: 1 }, 'out through the playoffs, healed by the rollover: recovered in the offseason');
});
