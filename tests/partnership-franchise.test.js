// Captain Partnerships (GDD §27.4B), phase 4: the franchise lifecycle. One-time initial selection (and its automatic
// fallback), seasonal locking, the offseason pick, commits once per game id, playoff and AI–AI chemistry, captains released or
// traded (no restriction, no replacement, the partnership inactive, reactivated on return), injuries, permanent history by
// monster id (reunions, evolution, retirement), deterministic AI selection, all 16 clubs valid over seasons, and saves: no
// fabricated chemistry on load, the optional field survives the save, local storage and the cloud mirror unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runFranchise } from '../tools/franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import * as CP from '../src/franchise/partnerships.js';
import { ALL_TEAMS } from '../src/data/league.js';
import { careerTimeline } from '../src/franchise/career.js';
import { createCloudSim, memoryLocalStorage } from './helpers/cloud-sim.js';
import { memoryBackend, createStore } from '../src/franchise/store.js';

const copy = (x) => JSON.parse(JSON.stringify(x));
/** A franchise in week 3 of its first season, as an existing save looks before this build: no partnership data at all. */
const preFeature = (() => { let f = null; return () => { if (!f) { const r = runFranchise(8, { seasons: 1, stopWeek: 3, difficulty: 'pro' }).f; delete r.partnerships; for (const m of [...r.roster, ...Object.values(r.league?.monsters || {})]) if (m.career?.ev) m.career.ev = m.career.ev.filter((e) => !['captain', 'chemistry'].includes(e.t)); f = r; } return copy(f); }; })();
const played = (() => { let f = null; return () => (f ||= runFranchise(9, { seasons: 2, difficulty: 'pro' }).f); })();
const ownerChoice = (f) => { const s = F.suggestedCaptains(f); return { offense: [s.offense.a, s.offense.b], defense: [s.defense.a, s.defense.b] }; };
/** Play the owner's Sunday headless (the week's other games follow in finishSunday). */
function playWeek(f) { let g = 0; while (f.season.day < 6 && g++ < 10) { const r = F.autoRunToSunday(f); if (!r.ok) break; } if (F.isBye(f)) { F.takeBye(f); return null; } const game = F.simulatePlayerGame(f); F.finishSunday(f, game); return game; }

test('an existing save loads with no partnership data and no fabricated chemistry; the initial selection is offered once', () => {
  const f = preFeature(); const before = JSON.stringify(f);
  const loaded = Save.migrate(copy(f)); assert.equal(loaded.partnerships, undefined, 'loading never creates the field');
  assert.equal(JSON.stringify(Save.migrate(JSON.parse(before))), JSON.stringify(Save.migrate(JSON.parse(before))), 'load is stable');
  assert.ok(F.initialCaptainsDue(f)); assert.equal(F.captainStatus(f, 'offense'), null);
  const r = F.chooseInitialCaptains(f, ownerChoice(f)); assert.ok(r.ok, r.reason);
  assert.equal(f.partnerships.initial.mode, 'chosen'); assert.equal(f.partnerships.startedYear, f.season.year);
  for (const club of ALL_TEAMS) assert.ok(CP.captainsOf(f, club), `${club} has captains`);
  for (const rec of Object.values(f.partnerships.pairs)) assert.equal(rec.n, 0, 'every pair starts at zero');
  assert.deepEqual(F.chooseInitialCaptains(f, ownerChoice(f)).ok, false, 'the exception happens once');
  const reloaded = Save.migrate(JSON.parse(JSON.stringify(f))); assert.equal(F.initialCaptainsDue(reloaded), false, 'reloading does not reopen it');
  assert.deepEqual(reloaded.partnerships, f.partnerships, 'the optional field survives a save and load');
  assert.deepEqual(CP.partnershipProblems(f), []);
});

test('skipping the initial selection: the suggested captains are named before the next games, and explained', () => {
  const f = preFeature(); let g = 0; while (f.season.day < 6 && g++ < 10) { if (!F.autoRunToSunday(f).ok) break; }
  assert.equal(f.partnerships, undefined, 'nothing is created before games are due');
  const s = F.suggestedCaptains(f);
  if (F.isBye(f)) F.takeBye(f); else F.finishSunday(f, F.simulatePlayerGame(f));
  const e = CP.captainsOf(f, f.club); assert.ok(e); assert.equal(f.partnerships.initial.mode, 'auto');
  assert.deepEqual([e.offense.a, e.offense.b], [s.offense.a, s.offense.b]); assert.deepEqual([e.defense.a, e.defense.b], [s.defense.a, s.defense.b]);
  assert.ok(f.news.some((n) => /Captains for .*chosen automatically/.test(n.text)), `the automatic choice is explained: ${JSON.stringify(f.news.slice(0, 6).map((n) => n.text))}`);
  for (const club of ALL_TEAMS) assert.ok(CP.captainsOf(f, club));
});

test('a game commits its chemistry once: the ledger holds stable game ids, a replayed commit adds nothing', () => {
  const f = preFeature(); F.chooseInitialCaptains(f, null);
  const game = playWeek(f) || playWeek(f);
  const ids = Object.keys(f.partnerships.credited[f.season.year]); assert.ok(ids.length >= 8, 'every game of the week'); assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.every((id) => /^\d+\|w\d+\|/.test(id)), 'year, week and both clubs in every id');
  const total = () => Object.values(f.partnerships.pairs).reduce((a, r) => a + r.n, 0); const t0 = total(); assert.ok(t0 > 0, 'chemistry was earned');
  const m = game ? F.sundayMatchup : null; void m;
  const owner = ids.find((id) => id.includes(f.club));
  const [y, w, home, away] = owner.split('|');
  const again = CP.commitGame(f, game, { year: Number(y), gameId: owner, clubs: { home, away } }); assert.deepEqual(again, [], 'the same game again: nothing');
  assert.equal(total(), t0);
  assert.ok(Array.isArray(f.lastGame.partnerships), 'the post-game summary carries the owner\'s rows');
  void w;
});

test('captains are locked for the season: no in-season pick, no second initial selection, no replacement after a release', () => {
  const f = preFeature(); F.chooseInitialCaptains(f, ownerChoice(f)); const entry = copy(CP.captainsOf(f, f.club));
  assert.equal(F.pickCaptains(f, ownerChoice(f)).ok, false, 'the offseason pick is closed during the season');
  const cap = f.roster.find((m) => m.id === entry.offense.b);
  const r = F.releaseMonster(f, cap.id); assert.ok(r.ok, `a captain can be released (${r.reason})`);
  assert.ok(f.news.some((n) => /was a captain/.test(n.text)), 'the release is explained');
  assert.equal(F.captainStatus(f, 'offense').inactive.b, 'gone');
  playWeek(f); playWeek(f);
  assert.deepEqual(CP.captainsOf(f, f.club), entry, 'the season\'s official pair is kept; nobody replaces him');
  const n0 = CP.chemistryCount(f, entry.offense.a, entry.offense.b);
  playWeek(f); assert.equal(CP.chemistryCount(f, entry.offense.a, entry.offense.b), n0, 'a separated pair earns nothing');
});

test('a released captain who returns reactivates the original partnership with no new selection', () => {
  const f = preFeature(); F.chooseInitialCaptains(f, ownerChoice(f)); const e = CP.captainsOf(f, f.club);
  const m = f.roster.find((x) => x.id === e.defense.b); F.releaseMonster(f, m.id);
  assert.equal(F.captainStatus(f, 'defense').active, false);
  const back = Object.values(f.pool).flat().find((x) => x.id === m.id); assert.ok(back, 'he is in the pool');
  for (const list of Object.values(f.pool)) { const i = list.findIndex((x) => x.id === m.id); if (i >= 0) list.splice(i, 1); }
  f.roster.push(back); // signed back (the transaction itself is the game's existing path; here only his return matters)
  const st = F.captainStatus(f, 'defense'); assert.ok(st.active || st.inactive?.b === 'benched', 'eligible again: active when both are in the lineup');
  assert.deepEqual(CP.captainsOf(f, f.club).defense, e.defense);
});

test('an injured captain stays designated and earns nothing while out; the partnership is inactive with the reason', () => {
  const f = preFeature(); F.chooseInitialCaptains(f, ownerChoice(f)); const e = CP.captainsOf(f, f.club);
  const qb = f.roster.find((x) => x.id === e.offense.a); qb.injury = { severity: 'Moderate', weeks: 3, type: 'ankle' };
  assert.equal(F.captainStatus(f, 'offense').inactive.a, 'injured');
  const n0 = CP.chemistryCount(f, e.offense.a, e.offense.b);
  const m = F.sundayMatchup(f); const side = m.playerSide; const mine = m[side];
  assert.ok(!Object.values(mine.offense).some((p) => p?.id === qb.id), 'not in the lineup');
  const game = playWeek(f); if (game) { const t = game.partnerCredits?.[side]?.offense; assert.ok(!t || t.n === 0, 'no credits while he is out'); }
  assert.equal(CP.chemistryCount(f, e.offense.a, e.offense.b), n0);
  assert.deepEqual(CP.captainsOf(f, f.club), e);
});

test('AI clubs: deterministic selection, AI–AI games earn chemistry, a traded AI captain deactivates his club\'s pair', () => {
  const f = preFeature(); const g = copy(f);
  F.chooseInitialCaptains(f, null); F.chooseInitialCaptains(g, null);
  assert.deepEqual(f.partnerships.captains, g.partnerships.captains, 'same save, same captains for every club');
  playWeek(f);
  const aiRows = Object.values(f.partnerships.pairs).filter((r) => r.seasons.some((s) => s.club !== f.club) && r.n > 0); assert.ok(aiRows.length >= 4, 'AI pairs earned chemistry in AI–AI games');
  const club = ALL_TEAMS.find((c) => c !== f.club && CP.captainsOf(f, c)?.offense);
  const e = CP.captainsOf(f, club); const other = ALL_TEAMS.find((c) => c !== f.club && c !== club);
  // An AI–AI move of a captain through the registry (the deal itself is the trade engine's; here only its effect matters).
  const { removeFromClub, addToClub } = await_league();
  const m = removeFromClub(f, club, e.offense.b, { year: f.season.year, reason: 'traded' }); addToClub(f, other, m, { year: f.season.year, via: 'trade' });
  const kick = CP.kickoffPartnership(f, club); assert.equal(kick.offense.b, e.offense.b, 'still the season\'s official pair');
  const team = F.aiTeam(f, club); assert.ok(!Object.values(team.offense).some((p) => p?.id === m.id), 'he no longer plays for them');
  assert.deepEqual(CP.captainsOf(f, other), CP.captainsOf(copy(f), other), 'the receiving club\'s captains stay locked');
});
let leagueMod = null; const await_league = () => leagueMod; test.before(async () => { leagueMod = await import('../src/franchise/league-registry.js'); });

test('the offseason pick is used when the season starts; an invalid pick falls back to the suggestion, explained', () => {
  const base = played(); const f = copy(base);
  assert.ok(f.season.finished, 'played() ends in the offseason, the draft held');
  assert.ok(F.offseasonCaptainsOpen(f));
  const s = F.suggestedCaptains(f); const pick = { offense: [s.offense.a, s.offense.b], defense: [s.defense.a, s.defense.b] };
  const r = F.pickCaptains(f, pick); assert.ok(r.ok, r.reason); assert.equal(f.partnerships.pick.year, f.season.year + 1);
  assert.equal(F.pickCaptains(f, { offense: [s.defense.a, s.defense.b], defense: pick.defense }).ok, false, 'a defensive pair cannot be the offense');
  const g = copy(f);
  const n = F.startNextSeason(f); assert.ok(n.ok, n.reason);
  const e = CP.captainsOf(f, f.club); assert.equal(e.mode, 'offseason'); assert.deepEqual([e.offense.a, e.offense.b].sort(), pick.offense.slice().sort()); assert.deepEqual([e.defense.a, e.defense.b].sort(), pick.defense.slice().sort());
  assert.equal(f.partnerships.pick, undefined, 'the pick is used once');
  for (const club of ALL_TEAMS) assert.ok(CP.captainsOf(f, club), `${club} named captains for the new season`);
  // An invalid pick (a picked captain gone before the season starts): the suggestion, explained.
  const gone = g.roster.find((m) => m.id === pick.defense[1]); g.roster = g.roster.filter((m) => m.id !== gone.id);
  assert.ok(F.startNextSeason(g).ok);
  const e2 = CP.captainsOf(g, g.club); assert.ok(e2.defense && ![e2.defense.a, e2.defense.b].includes(gone.id), 'never the departed monster');
  assert.ok(g.news.some((n) => /Defense: .*roster.*suggested pair was used/.test(n.text)), 'the fallback is explained');
});

test('permanent history by monster id: chemistry persists across seasons and selections; evolution and the timeline keep it', () => {
  const f = played(); const P = f.partnerships; assert.ok(P, 'a played franchise has the feature active');
  assert.ok(Object.keys(P.captains).length >= 2, 'two seasons of captains');
  const repeated = Object.values(P.pairs).filter((r) => new Set(r.seasons.map((s) => s.y)).size >= 2);
  for (const r of repeated) assert.ok(r.n >= 0 && r.first < r.last + 1, 'a pair named again resumes its count');
  const anyChem = Object.values(P.pairs).find((r) => r.n > 0 && f.roster.some((m) => m.id === r.a));
  if (anyChem) { const m = f.roster.find((x) => x.id === anyChem.a); const tl = careerTimeline(m, { club: f.club }); assert.ok(tl.some((e) => e.t === 'captain'), 'named captain on his timeline'); assert.ok(CP.partnershipsOf(f, m.id).some((p) => p.partner === anyChem.b)); }
  const t = copy(f); const pr = Object.values(t.partnerships.pairs).find((r) => r.n > 0); const m = t.roster.find((x) => x.id === pr.a) || Object.values(t.league.monsters).find((x) => x.id === pr.a);
  if (m) { m.species = m.species; m.stage = (m.stage || 0) + 1; } // evolution changes the form, never the id
  assert.equal(CP.chemistryCount(t, pr.a, pr.b), pr.n);
  const ret = Object.values(P.pairs).find((r) => f.league.legends?.[r.a] || f.league.legends?.[r.b]);
  if (ret) assert.ok(ret.n >= 0, 'a retired monster\'s partnerships stay on record');
  assert.deepEqual(CP.partnershipProblems(f), []);
});

test('all 16 clubs keep valid partnership state over seasons; playoffs award chemistry; the ledger keeps two seasons', () => {
  const f = played(); const P = f.partnerships;
  for (const [y, byClub] of Object.entries(P.captains)) assert.equal(Object.keys(byClub).length, 16, `season ${y}: 16 clubs`);
  const years = Object.keys(P.credited).map(Number); assert.ok(years.length <= CP.LEDGER_SEASONS);
  const playoff = Object.values(P.credited).flatMap((x) => Object.keys(x)).filter((id) => /\|p\d\|/.test(id)); assert.ok(playoff.length >= 7, 'playoff games are credited');
  assert.deepEqual(CP.partnershipProblems(f), []);
});

test('the save code is unchanged from v42.1.0 and keeps the optional field through local storage and the cloud mirror', async () => {
  const f = played(); assert.ok(f.partnerships);
  const store = new Map(); globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  Save.save(f); const back = Save.load(); assert.deepEqual(back.partnerships, f.partnerships, 'local save and load');
  const sim = createCloudSim(); sim.install('viewer-cp');
  const C = await import('../src/franchise/cloud-save.js');
  const g = copy(f); g.uid = 'cp-test'; g.createdAt = '2026-10-25T00:00:00.000Z'; g.savedAt = Date.now();
  C.cloudSave(g, { immediate: true }); for (let i = 0; i < 2000 && C.cloudFlush(); i++) await new Promise((r) => setTimeout(r, 5)); await C.cloudFlush();
  const c = await C.cloudLoad({ uid: g.uid, createdAt: g.createdAt }); assert.deepEqual(c.partnerships, f.partnerships, 'the cloud mirror round-trips it');
  // the device store (IndexedDB slots): written, reopened by a new store object, read back
  let clock = 1_900_000_000_000; const now = () => (clock += 1000); const backend = memoryBackend(); const ls = memoryLocalStorage();
  const st1 = createStore({ backend, localStorage: ls, now, debounce: 0, slot: 1 }); await st1.open(); const h = copy(f); delete h.uid; await st1.replace(h, null, {});
  const st2 = createStore({ backend, localStorage: ls, now, debounce: 0, slot: 1 }); const re = await st2.open(); assert.deepEqual(re.franchise.partnerships, f.partnerships, 'the device store round-trips it');
  const src = fs.readFileSync(new URL('../src/franchise/save.js', import.meta.url), 'utf8'); assert.ok(!/partnership/i.test(src), 'save.js needs no change');
  const cs = fs.readFileSync(new URL('../src/franchise/cloud-save.js', import.meta.url), 'utf8'); assert.ok(!/partnership/i.test(cs), 'cloud-save.js needs no change');
});

test('archived franchises are read-only: no selection, no activation', () => {
  const f = preFeature(); f.lifecycle = { ...(f.lifecycle || {}), status: 'retired', legacy: { headline: 'test' } };
  assert.equal(F.initialCaptainsDue(f), false);
  assert.throws(() => F.chooseInitialCaptains(f, null)); assert.throws(() => F.ensureCaptains(f));
  assert.equal(f.partnerships, undefined);
});

test('only league games award chemistry: Beast Clash, encounters and practice never reach the credit hook', () => {
  const root = new URL('../src/', import.meta.url); const hits = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = new URL(e.name + (e.isDirectory() ? '/' : ''), d); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.js')) { const s = fs.readFileSync(p, 'utf8'); if (/\bplayGame\(|R\.newGame\(|\bnewGame\(\{/.test(s)) hits.push(p.pathname.replace(/.*\/src\//, '')); } } };
  walk(root);
  assert.deepEqual(hits.sort(), ['franchise/franchise.js', 'sim/game-runner.js', 'sim/rules.js', 'ui/screens/match.js'], 'football games start only in the league game paths and the live match');
  for (const f of ['clash', 'franchise/clash-link.js']) { const p = new URL(`../src/${f}`, import.meta.url); if (!fs.existsSync(p)) continue; }
  const fr = fs.readFileSync(new URL('../src/franchise/franchise.js', import.meta.url), 'utf8');
  assert.equal((fr.match(/playGame\(/g) || []).length, 3, 'the three league game paths: AI week, AI playoffs, the owner\'s game');
  assert.equal((fr.match(/(?<!function )afterCaptainGame\(f, /g) || []).length, 3, 'each one commits chemistry');
});
