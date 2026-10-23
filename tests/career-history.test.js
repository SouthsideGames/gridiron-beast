// Career history completion (GDD §41): archived game lines, older records linked by evidence, partial Hall of Fame careers,
// Career vs This Season totals, the router's scroll memory, timeline filters, export wording, and save compatibility.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFranchise } from '../tools/franchise-soak.mjs';
import * as P from '../src/franchise/career-profile.js';
import { GAME_KEYS, packGame, unpackGame, seasonGames, rolloverMonster, MAX_KEYS, withDerived } from '../src/franchise/stats.js';
import { TEAM_META } from '../src/data/league.js';
import * as Save from '../src/franchise/save.js';

let real = null;
const franchise = () => (real ||= runFranchise(1, { difficulty: 'rookie', seasons: 3 }).f);
const mon = (over = {}) => ({ id: 'm1', name: 'Testro', species: 'emberfox', stage: 0, type: 'Fire', position: 'QB', age: 24, level: 9, yearsPro: 0, attributes: { speed: 60, agility: 60, strength: 60, awareness: 60, catching: 60, arm: 60, accuracy: 60, blocking: 60, tackling: 60, coverage: 60, durability: 60, kicking: 40 }, history: [], career: { v: 1, ev: [], bf: 1 }, ...over });
const fr = (over = {}) => ({ club: 'Ember City Beasts', season: { year: 4, week: 5, finished: false, schedule: [], leagueStats: {}, playoffStats: {} }, roster: [], history: [], records: { game: {}, season: {}, team: {} }, pool: {}, ...over });

test('archived games: packed compactly at rollover, unpacked exactly, abbreviations unique', () => {
  const abbrs = Object.values(TEAM_META).map((t) => t.abbr); assert.equal(new Set(abbrs).size, abbrs.length);
  const m = mon({ stats: { v: 2, career: { reg: {}, post: {} }, season: { year: 2, reg: { games: 2, att: 30, passYds: 300 }, post: { games: 1, att: 10, passYds: 90 } }, seasons: [],
    log: [{ year: 2, week: 1, opp: 'Thunder Mesa', home: true, won: true, score: '21-7', line: { att: 15, passYds: 150, snapsOff: 40 } }, { year: 2, week: 2, opp: 'Harbor Sentinels', home: false, won: false, score: '10-14', line: { att: 15, passYds: 150 } }, { year: 2, week: 11, opp: 'Canyon Crushers', home: true, won: true, playoff: true, score: '17-3', line: { att: 10, passYds: 90 } }] } });
  rolloverMonster(m, { year: 3, team: 'Ember City Beasts' });
  const b = m.stats.seasons[0]; assert.equal(b.g.length, 3); assert.equal(m.stats.log.length, 0);
  assert.ok(JSON.stringify(b.g).length < 200, `packed season ${JSON.stringify(b.g).length} bytes`);
  const g = seasonGames(m, 2); assert.deepEqual(g.map((x) => [x.week, x.opp, x.home, x.won, x.playoff, x.score]), [[1, 'Thunder Mesa', true, true, false, '21-7'], [2, 'Harbor Sentinels', false, false, false, '10-14'], [11, 'Canyon Crushers', true, true, true, '17-3']]);
  assert.deepEqual(g[0].line, { att: 15, passYds: 150 }, 'snap counts stay in the season totals only');
  assert.deepEqual(unpackGame(packGame({ week: 4, opp: 'Unknown Club', line: { sacks: 2 } })).opp, 'Unknown Club');
});

test('multi-season box scores: every archived season\'s games add up to its book, and old moments open his own line', () => {
  const f = franchise(); let seasons = 0, games = 0;
  for (const m of f.roster) for (const b of m.stats?.seasons || []) {
    if (!b.g) continue; seasons++; const sum = { reg: {}, post: {} };
    for (const p of b.g) { const x = unpackGame(p); games++; const t = sum[x.playoff ? 'post' : 'reg']; for (const [k, v] of Object.entries(x.line)) t[k] = MAX_KEYS.has(k) ? Math.max(t[k] || 0, v) : (t[k] || 0) + v; }
    for (const bucket of ['reg', 'post']) for (const k of Object.keys(GAME_KEYS)) assert.equal(sum[bucket][k] || 0, b[bucket]?.[k] || 0, `${m.name} ${b.year} ${bucket} ${k}`);
    assert.equal(b.g.filter((p) => !(p[2] & 4)).length, b.reg?.games || 0, `${m.name} ${b.year}: one game line per regular-season game`);
  }
  assert.ok(seasons >= 20 && games >= 150, `archived ${seasons} seasons, ${games} games`);
  let old = 0;
  for (const m of f.roster) for (const e of P.fullProfile(f, m, 'roster').timeline) if (e.ref?.kind === 'game' && e.y < f.season.year) { const d = P.eventDetail(f, m, e.ref); assert.equal(d.source, 'archive'); assert.equal(d.missing, null); old++; }
  assert.ok(old > 0, 'old timeline moments open archived lines');
});

test('season details: totals, playoffs apart, and the game-by-game list from the archive', () => {
  const f = franchise(); const m = f.roster.find((x) => (x.stats?.seasons || []).some((b) => b.g?.length && (b.post?.games || 0) > 0)) || f.roster.find((x) => x.stats?.seasons?.[0]?.g);
  const b = m.stats.seasons.find((x) => x.g); const d = P.eventDetail(f, m, { kind: 'season', year: b.year, club: b.team });
  assert.equal(d.reg.games, b.reg.games || 0); assert.equal(d.games.length, b.g.length); assert.equal(d.missing, null);
});

test('older records without an id: linked only when the evidence leaves one monster', () => {
  const book = (team, reg, g) => ({ year: 2, team, reg, post: {}, ...(g ? { g } : {}) });
  const a = mon({ id: 'a', name: 'Twin', stats: { v: 2, career: { reg: {} }, season: { year: 4, reg: {}, post: {} }, seasons: [book('Ember City Beasts', { games: 9, passYds: 2000 }, [packGame({ week: 3, opp: 'Thunder Mesa', line: { passYds: 412 } })])], log: [] } });
  const b = mon({ id: 'b', name: 'Twin', stats: { v: 2, career: { reg: {} }, season: { year: 4, reg: {}, post: {} }, seasons: [book('Harbor Sentinels', { games: 9, passYds: 2500 })], log: [] } });
  const f = fr({ roster: [a], pool: { Lava: [b] } });
  const rec = { value: 412, name: 'Twin', team: 'Ember City Beasts', opp: 'Thunder Mesa', year: 2, week: 3 };
  assert.deepEqual(P.resolveRecordHolder(f, rec, { scope: 'game', cat: 'passYds' }), { id: 'a', how: 'evidence', candidates: 1 });
  assert.equal(P.resolveRecordHolder(f, { ...rec, week: 4 }, { scope: 'game', cat: 'passYds' }).id, null, 'the archived game says otherwise: unlinked');
  assert.equal(P.resolveRecordHolder(f, { ...rec, id: 'z' }, { cat: 'passYds' }).id, 'z', 'an id is trusted as is');
  const a2 = mon({ id: 'a2', name: 'Twin', stats: { v: 2, career: { reg: {} }, season: { year: 4, reg: {}, post: {} }, seasons: [book('Ember City Beasts', { games: 9, passYds: 2000 })], log: [] } });
  // a's archived week 9 line is not 300, so only a2 (no archive, season total can hold it) fits: evidence, not a guess
  assert.equal(P.resolveRecordHolder(fr({ roster: [a, a2] }), { ...rec, week: 9, value: 300 }, { scope: 'game', cat: 'passYds' }).id, 'a2');
  // two namesakes with nothing to tell them apart: never guessed
  const a3 = JSON.parse(JSON.stringify(a2)); a3.id = 'a3';
  const amb = P.resolveRecordHolder(fr({ roster: [a2, a3] }), { ...rec, week: 9, value: 300 }, { scope: 'game', cat: 'passYds' });
  assert.equal(amb.id, null); assert.equal(amb.candidates, 2, 'namesakes on one club in one season: never guessed');
  const season = P.resolveRecordHolder(f, { value: 2500, name: 'Twin', team: 'Harbor Sentinels', year: 2 }, { scope: 'season', cat: 'passYds' });
  assert.equal(season.id, 'b');
  const table = fr({ season: { year: 2, leagueStats: { 'Thunder Mesa': { x9: { id: 'x9', name: 'Twin', team: 'Thunder Mesa', sacks: 6 } } }, playoffStats: {} } });
  assert.equal(P.resolveRecordHolder(table, { value: 6, name: 'Twin', team: 'Thunder Mesa', year: 2 }, { scope: 'season', cat: 'sacks' }).id, 'x9', 'another club\'s player from the league table');
});

test('Hall of Fame cards written before careers were kept: a clearly partial history, nothing invented', () => {
  const card = { id: 'hof_x', owner: 'Ana Ruiz', club: 'Ember City Beasts', seasons: 6, record: { w: 40, l: 14 }, titles: 2, awards: 3, seasonsList: [{ year: 1, champion: false }, { year: 2, champion: true }, { year: 3, champion: false }, { year: 4, champion: true }], bestMonsters: [{ name: 'Blazynx II', species: 'emberfox', position: 'RB', ovr: 81, level: 27 }] };
  const p = P.legacyHofProfile(card, 0);
  assert.equal(p.legacy, true); assert.equal(p.kind, 'snapshot'); assert.deepEqual(p.trophies.map((t) => t.kind), ['hof'], 'only the card itself: no awards or titles credited to him');
  assert.deepEqual(p.honours, { titles: 0, awards: 0, records: 0, hof: true }); assert.equal(p.stats.games, 0); assert.equal(p.timeline.length, 0);
  assert.match(p.notes[0], /Partial history/); assert.match(p.notes[1], /The club won the Beast Bowl in 1202, 1204; the card does not record which games he played/);
  assert.equal(p.stage, 1, 'the evolved form read from the species chain'); assert.equal(p.level, 27); assert.equal(p.ovr, 81);
  assert.equal(P.legacyHofProfile(card, 5), null);
});

test('Career vs This Season: regular-season totals in both views (the game\'s definition), games match the scope, rates from totals', () => {
  const line = (games, att, comp, passYds, extra = {}) => ({ games, att, comp, passYds, ...extra });
  // 2: a veteran with three completed seasons and 6 games this season; 8: playoff games kept apart
  const s1 = line(9, 20, 10, 200), s2 = line(9, 100, 90, 1100), s3 = line(9, 60, 30, 500);
  const cur = line(6, 50, 35, 420);
  const career = { games: 33, att: 230, comp: 165, passYds: 2220 };
  const vet = mon({ id: 'v', yearsPro: 3, stats: { v: 2, career: { reg: career, post: { games: 2, att: 30, comp: 20, passYds: 260 } }, season: { year: 4, reg: cur, post: {} }, seasons: [{ year: 1, team: 'Ember City Beasts', reg: s1, post: {} }, { year: 2, team: 'Ember City Beasts', reg: s2, post: { games: 2, att: 30, comp: 20, passYds: 260 } }, { year: 3, team: 'Ember City Beasts', reg: s3, post: {} }], log: [] } });
  const p = P.fullProfile(fr({ roster: [vet] }), vet, 'roster');
  assert.equal(p.stats.games, 33); assert.equal(p.stats.seasonGames, 6);
  assert.equal(p.stats.focus[0].text, '2,220'); assert.equal(p.stats.seasonFocus[0].text, '420');
  assert.equal(p.stats.focus[3].text, '71.7%', 'career completion % = 165/230, not the average of the seasons (60.6%)');
  assert.equal(p.stats.seasonFocus[3].text, '70%');
  assert.equal(p.stats.post.games, 2); assert.equal(p.stats.seasonPostLine, null, 'no playoff games this season');
  // 1: a rookie in the middle of his first season (career = season)
  const rk = mon({ id: 'r', stats: { v: 2, career: { reg: line(4, 40, 22, 300) }, season: { year: 4, reg: line(4, 40, 22, 300), post: {} }, seasons: [], log: [] } });
  const pr = P.fullProfile(fr({ roster: [rk] }), rk, 'roster'); assert.equal(pr.stats.games, 4); assert.equal(pr.stats.seasonGames, 4); assert.deepEqual(pr.stats.focus.map((x) => x.text), pr.stats.seasonFocus.map((x) => x.text));
  // 3: traded in (seasons with another club before this franchise kept his stats): incomplete, said so
  const tr = mon({ id: 't', yearsPro: 4, history: [{ club: 'Thunder Mesa', from: 1, to: 3, reason: 'traded' }], career: { v: 1, bf: 1, ev: [{ k: 'join:4:Ember City Beasts:1', t: 'join', y: 4, c: 'Ember City Beasts', x: { via: 'trade', from: 'Thunder Mesa' } }] }, stats: { v: 2, career: { reg: cur }, season: { year: 4, reg: cur, post: {} }, seasons: [], log: [] } });
  const pt = P.fullProfile(fr({ roster: [tr] }), tr, 'roster'); assert.equal(pt.stats.games, 6); assert.equal(pt.complete, false); assert.match(pt.notes[0], /1 season on record/); assert.deepEqual(pt.clubs.map((c) => c.club), ['Thunder Mesa', 'Ember City Beasts']);
  // 4: a free agent (pool): his record runs to the day he left; no "this season" without games
  const fa = mon({ id: 'fa', yearsPro: 2, history: [{ club: 'Ember City Beasts', from: 2, to: 3, reason: 'walked' }], stats: { v: 2, career: { reg: s2 }, season: { year: 3, reg: s2, post: {} }, seasons: [], log: [] } });
  const pf = P.fullProfile(fr({ pool: { Lava: [fa] } }), fa, 'pool'); assert.equal(pf.stats.seasonFocus, null); assert.equal(pf.stats.games, 9);
  // 6: no games at all
  const ng = P.fullProfile(fr(), mon({ id: 'n', stats: { v: 2, career: { reg: {} }, season: { year: 4, reg: {}, post: {} }, seasons: [], log: [] } }), 'roster');
  assert.equal(ng.stats.games, 0); assert.equal(ng.stats.seasonFocus, null); assert.ok(ng.stats.focus.every((x) => x.text === '—' || x.text === '0'));
  // 7: percentage positions: a corner's completion % allowed and a kicker's FG % from totals, with a volume floor
  assert.equal(P.focusStats('CB', { covTargets: 20, recAllowed: 9 })[3].text, '45%');
  assert.equal(P.focusStats('K', { fga: 9, fgm: 7 })[1].text, '77.8%'); assert.equal(P.focusStats('RB', { rush: 3, rushYds: 30 })[2].text, '—');
});

test('Career vs This Season on the real franchise: games and totals per scope agree with the stat books', () => {
  const f = franchise();
  for (const m of f.roster) {
    const p = P.fullProfile(f, m, 'roster'); const s = m.stats;
    assert.equal(p.stats.games, s.career.reg.games || 0, `${m.name}: career games`);
    const cur = s.season.year === f.season.year ? s.season.reg.games || 0 : 0; assert.equal(p.stats.seasonGames, cur, `${m.name}: season games`);
    const d = withDerived(s.career.reg); const want = (key) => d[key];
    for (const x of p.stats.focus) if (x.value != null) assert.equal(x.value, want(x.key), `${m.name}: ${x.key}`);
    assert.equal(p.stats.postGames, s.career.post.games || 0);
  }
});

test('router: Back restores the previous screen\'s scroll once; tabs and reset flows start at the top', async () => {
  const win = { scrollY: 0, scrollTo(x, y) { this.scrollY = y; } };
  globalThis.window = win;
  const stub = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  globalThis.document = { querySelector: () => stub, querySelectorAll: () => [], createElement: () => ({ ...stub }), body: { appendChild() {} } };
  const R = await import('../src/ui/router.js');
  for (const n of ['a', 'b', 'c', 'tab']) R.registerScreen(n, { title: n, render: () => '' });
  R.init({ root: stub, context: () => ({}), tabs: () => null });
  R.go('a', {}, { reset: true }); win.scrollY = 700;
  R.go('b'); assert.equal(win.scrollY, 0, 'a new screen opens at the top');
  win.scrollY = 120; R.go('c'); R.back(); assert.equal(win.scrollY, 120, 'back to b where it was');
  R.back(); assert.equal(win.scrollY, 700, 'back to a where it was');
  R.render(); assert.equal(win.scrollY, 700, 'a re-render keeps the position (and does not re-apply an old restore)');
  win.scrollY = 300; R.go('tab', {}, { reset: true }); assert.equal(win.scrollY, 0, 'a tab (reset) starts at the top');
  R.go('a', {}, { reset: true }); assert.equal(win.scrollY, 0, 'a new flow never restores an old position');
  R.back(); assert.equal(win.scrollY, 0, 'Back at the root stays put');
  delete globalThis.window; delete globalThis.document;
});

test('timeline filters and folds are per section state that survives a redraw; details never change it', async () => {
  const { timelineSectionHtml, timelineView, TIMELINE_FOLD } = await import('../src/ui/career-timeline.js');
  const items = Array.from({ length: 10 }, (_, i) => ({ k: `e${i}`, t: i % 2 ? 'first' : 'join', y: 2, w: i, tier: i % 2 ? 'notable' : 'career', title: `E${i}`, desc: '', icon: '•', ref: i % 2 ? { kind: 'game' } : null }));
  timelineView.filter = 'all'; timelineView.open = {};
  assert.equal((timelineSectionHtml(items, { id: 'x', animate: false }).match(/<li /g) || []).length, TIMELINE_FOLD);
  timelineView.filter = 'highlights'; let html = timelineSectionHtml(items, { id: 'x', animate: false });
  assert.equal((html.match(/<li /g) || []).length, 5); assert.equal((html.match(/data-action="tl-open"/g) || []).length, 5, 'only events with a record are buttons');
  timelineView.open.x = true; timelineView.filter = 'all'; html = timelineSectionHtml(items, { id: 'x', animate: false });
  assert.equal((html.match(/<li /g) || []).length, 10); assert.match(html, /Show less/);
  timelineView.filter = 'all'; timelineView.open = {};
});

test('career-card export wording never claims a save the page cannot confirm', async () => {
  const { EXPORT_TEXT } = await import('../src/ui/career-card.js');
  const all = [EXPORT_TEXT.requested('x.png'), EXPORT_TEXT.requestedEmbedded, EXPORT_TEXT.noDownload, EXPORT_TEXT.shareFailed, EXPORT_TEXT.copyFailed];
  for (const t of all) assert.doesNotMatch(t, /\bsaved\b/i, t);
  assert.match(EXPORT_TEXT.requested('x.png'), /Download requested/); assert.match(EXPORT_TEXT.requestedEmbedded, /may block downloads/); assert.match(EXPORT_TEXT.requestedEmbedded, /press and hold/);
});

test('saves: archived games survive export/import; a save from before v39.1 (no game lines, no record ids) still opens every career', () => {
  const f = franchise(); const back = Save.importJson(Save.exportJson(f));
  const m = f.roster.find((x) => x.stats?.seasons?.some((b) => b.g)); const bm = back.roster.find((x) => x.id === m.id);
  assert.deepEqual(bm.stats.seasons.map((b) => b.g), m.stats.seasons.map((b) => b.g));
  const old = JSON.parse(Save.exportJson(f)); const of = old.franchise || old;
  for (const x of of.roster) for (const b of x.stats?.seasons || []) delete b.g;
  for (const scope of ['game', 'season']) for (const r of Object.values(of.records?.[scope] || {})) delete r.id;
  const g = Save.importJson(JSON.stringify(old)); assert.ok(g);
  let links = 0;
  for (const x of g.roster) { const p = P.fullProfile(g, x, 'roster'); for (const e of p.timeline.filter((y) => y.ref)) { links++; const d = P.eventDetail(g, x, e.ref); assert.ok(d, `${x.name}: ${e.k}`); if (d.kind === 'game' && e.y < g.season.year) assert.notEqual(d.source, 'archive'); } }
  assert.ok(links > 0);
});
