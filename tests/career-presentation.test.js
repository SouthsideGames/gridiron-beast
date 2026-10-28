// Monster Career Presentation (GDD §40): the career summary, the trophy case, interactive timeline entries, career-card
// content, career links by id, the Hall of Fame snapshot, and that none of it changes the franchise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFranchise } from '../tools/franchise-soak.mjs';
import * as P from '../src/franchise/career-profile.js';
import { honourPills, cardStats, cardFileName, TIER_STYLE } from '../src/ui/career-card.js';
import { withVisibility } from '../src/ui/career-ui.js';
import * as Save from '../src/franchise/save.js';
import { updateGameRecords, ensureRecords } from '../src/franchise/stats.js';
import { careerAfterGame } from '../src/franchise/career.js';

let real = null;
const franchise = () => (real ||= runFranchise(12, { difficulty: 'rookie', seasons: 3 }).f); // seed 12 wins the Beast Bowl in season 3 with coverage intelligence and judged braking, v42.15 (seed 10 with v42.8 and v42.12; seed 6 with v42.14, seed 1 with v42.6, seed 3 with v42.5)

const mon = (over = {}) => ({ id: 'm1', name: 'Testro', species: 'emberfox', stage: 0, type: 'Fire', position: 'QB', age: 24, level: 9, yearsPro: 0, attributes: { speed: 60, agility: 60, strength: 60, awareness: 60, catching: 60, arm: 60, accuracy: 60, blocking: 60, tackling: 60, coverage: 60, durability: 60, kicking: 40 }, history: [], career: { v: 1, ev: [], bf: 1 }, ...over });
const book = (year, team, reg, post = {}) => ({ year, team, reg, post });
const fr = (over = {}) => ({ club: 'Ember City Beasts', season: { year: 3, week: 4, finished: false, schedule: [] }, roster: [], history: [], records: { game: {}, season: {}, team: {} }, pool: {}, ...over });

test('summary: career totals add the season books, the focus is the position\'s, the current season is separate', () => {
  const m = mon({ yearsPro: 2, stats: { v: 2, career: { reg: { games: 18, att: 300, comp: 190, passYds: 2400, passTd: 20, intThrown: 7 }, post: { games: 1, att: 20, comp: 12, passYds: 150, passTd: 2 } }, season: { year: 3, reg: { games: 2, att: 40, comp: 25, passYds: 300, passTd: 3, intThrown: 1 }, post: {} }, seasons: [book(1, 'Ember City Beasts', { games: 9, att: 130, comp: 80, passYds: 1000, passTd: 8, intThrown: 3 }), book(2, 'Ember City Beasts', { games: 7, att: 130, comp: 85, passYds: 1100, passTd: 9, intThrown: 3 }, { games: 1, att: 20, comp: 12, passYds: 150, passTd: 2 })], log: [] } });
  const f = fr({ roster: [m] }); const p = P.fullProfile(f, m, 'roster');
  assert.deepEqual(p.stats.focus.map((s) => s.label), ['Pass yards', 'Pass TD', 'INT thrown', 'Comp %']);
  // regular season, the game's career definition (GDD §41.4); the playoff game is on its own line
  assert.equal(p.stats.focus[0].text, '2,400'); assert.equal(p.stats.focus[1].value, 20); assert.equal(p.stats.focus[3].text, '63.3%'); assert.equal(p.stats.post.games, 1);
  assert.equal(p.stats.seasonFocus[0].text, '300', 'this season stands apart from the career');
  assert.equal(p.seasons, 3); assert.equal(p.onRecord, 3); assert.equal(p.club, 'Ember City Beasts');
  const dl = P.focusStats('DL', { tackles: 10, assists: 4, sacks: 3, tfl: 2, pressures: 9 });
  assert.deepEqual(dl.map((s) => [s.label, s.text]), [['Tackles', '14'], ['Sacks', '3'], ['Tackles for loss', '2'], ['Pressures', '9']]);
  assert.equal(P.focusStats('K', { fga: 1, fgm: 1 })[1].text, '—', 'a rate without volume is a dash, never a misleading 100%');
});

test('summary: rookies, older saves with seasons before the record, and several clubs', () => {
  const rookie = mon({ id: 'r1', yearsPro: 0, stats: { v: 2, career: { reg: {}, post: {} }, season: { year: 3, reg: {}, post: {} }, seasons: [], log: [] } });
  const f = fr({ roster: [rookie] }); const r = P.fullProfile(f, rookie, 'roster');
  assert.equal(r.stats.games, 0); assert.equal(r.seasons, 1); assert.equal(r.tier, 'rookie'); assert.equal(r.trophies.length, 0); assert.equal(r.notes.length, 0);
  const vet = mon({ id: 'v1', yearsPro: 6, stats: { v: 2, career: { reg: { games: 9, rush: 100, rushYds: 500 } }, season: { year: 3, reg: {}, post: {} }, seasons: [book(2, 'Ember City Beasts', { games: 9, rush: 100, rushYds: 500 })], log: [] }, position: 'RB' });
  const v = P.fullProfile(fr({ roster: [vet] }), vet, 'roster');
  assert.equal(v.complete, false); assert.match(v.notes[0], /count the 1 season on record/);
  const moved = mon({ id: 'mv', history: [{ club: 'Thunder Mesa', from: 1, to: 2, reason: 'released' }, { club: 'Ember City Beasts', from: 2, to: 3, reason: 'walked' }] });
  const pm = P.fullProfile(fr({ pool: { Lava: [moved] } }), moved, 'pool');
  assert.deepEqual(pm.clubs.map((c) => c.club), ['Thunder Mesa', 'Ember City Beasts']); assert.equal(pm.club, 'Ember City Beasts'); assert.match(pm.notes.join(' '), /free agent/i);
});

test('trophy case: only what was earned, repeats counted, awards from events and history deduplicated, Hall of Fame', () => {
  const ev = [
    { k: 'champ:2', t: 'champion', y: 2, c: 'Ember City Beasts', x: { opp: 'Thunder Mesa', score: '21-14', played: 1 } },
    { k: 'champ:3', t: 'champion', y: 3, c: 'Ember City Beasts', x: { run: 1 } },
    { k: 'award:mvp:2', t: 'award', y: 2, c: 'Ember City Beasts', x: { key: 'mvp' } },
    { k: 'award:mvp:3', t: 'award', y: 3, c: 'Ember City Beasts', x: { key: 'mvp' } },
    { k: 'rec:game:passYds:2:4', t: 'record', y: 2, w: 4, c: 'Ember City Beasts', x: { scope: 'game', cat: 'passYds', value: 412 } },
    { k: 'hof:4:Ember City Beasts', t: 'hof', y: 4, c: 'Ember City Beasts', x: { owner: 'A B' } },
    { k: 'first:td', t: 'first', y: 1, w: 2, c: 'Ember City Beasts' },
  ];
  const m = mon({ career: { v: 1, ev, bf: 1 } });
  const f = fr({ roster: [m], history: [{ year: 2, club: 'Ember City Beasts', awards: { league: { mvp: { id: 'm1', team: 'Ember City Beasts' }, opoy: { id: 'm1', team: 'Ember City Beasts' }, dpoy: { id: 'other', team: 'X' } } } }] });
  const t = P.trophyCase(f, m);
  assert.deepEqual(t.map((x) => `${x.kind}×${x.count}`), ['hof×1', 'champion×2', 'mvp×2', 'opoy×1', 'record×1']);
  assert.deepEqual(t.find((x) => x.kind === 'champion').entries.map((e) => e.year), [2, 3]);
  const p = P.fullProfile(f, m, 'roster');
  assert.deepEqual(p.honours, { titles: 2, awards: 3, records: 1, hof: true }); assert.equal(p.tier, 'hof');
  assert.equal(P.careerTier({ titles: 2 }), 'dynasty'); assert.equal(P.careerTier({ titles: 1 }), 'champion'); assert.equal(P.careerTier({ awards: 1, seasons: 2 }), 'decorated'); assert.equal(P.careerTier({ seasons: 5 }), 'veteran');
});

test('interactive timeline: game links only where a record exists; details read the records and say what is missing', () => {
  const m = mon({ career: { v: 1, bf: 1, ev: [
    { k: 'first:td', t: 'first', y: 3, w: 2, c: 'Ember City Beasts', x: { id: 'td', opp: 'Thunder Mesa' } },
    { k: 'debut', t: 'debut', y: 1, w: 1, c: 'Ember City Beasts' },
    { k: 'mile:passYds:5000', t: 'milestone', y: 1, w: 9, c: 'Gone Club' },
    { k: 'evo:1', t: 'evolve', y: null, x: { from: 'Flaroo', to: 'Flarex', stage: 1, before: 1 } },
    { k: 'season:passYds:2', t: 'season', y: 2, c: 'Ember City Beasts', x: { key: 'passYds', value: 1600, at: 1500 } },
  ] }, stats: { v: 2, career: { reg: {} }, season: { year: 3, reg: {}, post: {} }, seasons: [], log: [{ year: 3, week: 2, opp: 'Thunder Mesa', home: true, won: true, score: '24-10', line: { att: 30, comp: 20, passYds: 280, passTd: 3 } }] } });
  const f = fr({ roster: [m], history: [{ year: 1, club: 'Ember City Beasts', schedule: [{ week: 1, opponent: 'Harbor Sentinels', home: false, result: { playerScore: 14, oppScore: 17, won: false } }] }] });
  const items = P.fullProfile(f, m, 'roster').timeline; const by = (k) => items.find((e) => e.k === k);
  assert.deepEqual(by('first:td').ref, { kind: 'game', year: 3, week: 2, club: 'Ember City Beasts' });
  assert.equal(by('debut').ref.kind, 'game', 'an old season\'s game links to its schedule result');
  assert.equal(by('mile:passYds:5000').ref, null, 'no record behind it: not a link');
  assert.equal(by('season:passYds:2').ref, null);
  assert.equal(by('evo:1').ref.kind, 'evolve');
  const g = P.eventDetail(f, m, by('first:td').ref); assert.equal(g.source, 'log'); assert.equal(g.score, '24-10'); assert.match(g.lineText, /280 yds/); assert.equal(g.missing, null);
  const old = P.eventDetail(f, m, by('debut').ref); assert.equal(old.source, 'schedule'); assert.equal(old.won, false); assert.match(old.missing, /was not kept/);
  const evo = P.eventDetail(f, m, by('evo:1').ref); assert.deepEqual([evo.fromStage, evo.stage, evo.before], [0, 1, true]);
  assert.equal(new Set(items.map((e) => e.k)).size, items.length, 'no duplicate events');
});

test('record details: still standing, or broken since (by whom), matched by id when two monsters share a name', () => {
  const f = fr(); ensureRecords(f);
  const teams = (id) => ({ home: { name: 'Ember City Beasts', offense: { QB: { id, name: 'Twin', position: 'QB' } }, defense: {} }, away: { name: 'Thunder Mesa', offense: {}, defense: {} } });
  const st = (y) => ({ score: { home: 21, away: 7 }, stats: { home: { players: { QB: { passYds: y } }, yards: y }, away: { players: {}, yards: 0 } } });
  updateGameRecords(f, st(300), teams('a'), { year: 2, week: 3 });
  assert.equal(f.records.game.passYds.id, 'a', 'the records book keeps the holder\'s id');
  const a = mon({ id: 'a', name: 'Twin' }), b = mon({ id: 'b', name: 'Twin' });
  for (const m of [a, b]) m.stats = { v: 2, career: { reg: {} }, season: { year: 2, reg: {}, post: {} }, seasons: [], log: [{ year: 2, week: 3, opp: 'Thunder Mesa', won: true, score: '21-7', line: { passYds: 300 } }] };
  careerAfterGame([a, b], { year: 2, week: 3, club: 'Ember City Beasts', records: f.records });
  assert.ok(a.career.ev.some((e) => e.t === 'record')); assert.ok(!b.career.ev.some((e) => e.t === 'record'), 'the namesake does not get his record');
  const ref = { kind: 'record', scope: 'game', cat: 'passYds', value: 300, year: 2, week: 3, club: 'Ember City Beasts' };
  assert.equal(P.eventDetail(f, a, ref).standing, true);
  updateGameRecords(f, st(350), teams('z'), { year: 3, week: 1 });
  const d = P.eventDetail(f, a, ref); assert.equal(d.standing, false); assert.equal(d.brokenBy.value, 350);
});

test('career links: monsters found by stable id anywhere; another club\'s player only from the tables; same names never mixed', () => {
  const f = franchise();
  const [x, y] = f.roster; const name = x.name;
  const twin = { ...JSON.parse(JSON.stringify(y)), name };
  assert.equal(P.findMonster(f, x.id).m, x); assert.equal(P.careerProfile({ ...f, roster: [x, twin] }, twin.id).id, twin.id);
  const pool = Object.values(f.pool || {}).flat()[0]; if (pool) assert.equal(P.findMonster(f, pool.id).where, 'pool');
  const row = Object.values(f.season.leagueStats).flatMap((T) => Object.values(T)).find((r) => r.team !== f.club && r.games > 3);
  // Persistent AI rosters (GDD §42.6): another club's player is a real monster in the league registry, with a full profile and his own books.
  const lp = P.careerProfile(f, row.id); assert.equal(lp.kind, 'full'); assert.equal(lp.where, 'league'); assert.equal(lp.club, row.team); assert.equal(lp.stats.games >= row.games, true);
  // A player the registry no longer holds (table rows only) still opens a table-only profile.
  const gone = { ...f, league: { ...f.league, monsters: { ...f.league.monsters }, clubs: JSON.parse(JSON.stringify(f.league.clubs)) } }; delete gone.league.monsters[row.id]; for (const c of Object.values(gone.league.clubs)) c.roster = c.roster.filter((id) => id !== row.id);
  const tp = P.careerProfile(gone, row.id); assert.equal(tp.kind, 'league'); assert.equal(tp.timeline.length, 0); assert.equal(tp.stats.games >= row.games, true); assert.match(tp.notes[0], /season lines/);
  assert.equal(P.careerProfile(f, 'no-such-id'), null);
  const cls = f.draft?.class?.find((m) => !f.draft.picks.some((p) => p.id === m.id));
  if (cls) { const pp = P.careerProfile(f, cls.id); assert.equal(pp.kind, 'prospect'); assert.equal(pp.trophies.length, 0); assert.equal(pp.stats.games, 0); }
  const drafted = f.draft?.picks?.find((p) => p.id && !p.passed && p.team !== f.club);
  if (drafted) { const dp = P.careerProfile(f, drafted.id); assert.equal(dp.where, 'drafted'); assert.equal(dp.club, drafted.team); }
});

test('scouting still hides what it hides: a free agent\'s overall follows his scout report in career views', () => {
  const f = franchise();
  const market = [...Object.values(f.pool || {}).flat(), ...(f.offseason?.market || [])];
  let hidden = 0;
  for (const m of market) { const p = withVisibility(f, P.careerProfile(f, m.id)); assert.ok(p, m.id); if (p.ovr == null) hidden++; assert.ok(p.ovr == null || typeof p.ovr === 'number'); }
  // the raw profile does know the overall; only the view hides it
  if (market[0]) assert.equal(typeof P.careerProfile(f, market[0].id).ovr, 'number');
});

test('the real franchise: summaries, trophies and links agree with its history; reading never changes the save', () => {
  const f = franchise(); const before = JSON.stringify(f);
  const titleYears = f.history.filter((h) => h.champion === h.club).map((h) => h.year);
  let linked = 0, opened = 0;
  for (const m of f.roster) {
    const p = P.fullProfile(f, m, 'roster');
    const champs = p.trophies.find((t) => t.kind === 'champion');
    if (champs) for (const e of champs.entries) assert.ok(titleYears.includes(e.year), `${m.name}: a title in ${e.year} the history does not show`);
    for (const t of p.trophies.filter((x) => P.TROPHY_META[x.kind]?.short)) for (const e of t.entries) { const h = f.history.find((x) => x.year === e.year); assert.equal(h.awards.league[t.kind]?.id, m.id, `${m.name}: ${t.kind} ${e.year} not in the award history`); }
    for (const e of p.timeline.filter((x) => x.ref)) { linked++; const d = P.eventDetail(f, m, e.ref); if (d) opened++; }
  }
  assert.ok(linked > 0); assert.equal(opened, linked, 'every linked event opens a detail');
  assert.ok(titleYears.length >= 1, 'seed 12 wins a title (the fixture this test relies on)');
  assert.equal(JSON.stringify(f), before, 'profiles and details only read');
  const back = Save.importJson(Save.exportJson(f)); assert.ok(back);
  for (const m of f.roster.slice(0, 5)) assert.deepEqual(P.fullProfile(back, back.roster.find((x) => x.id === m.id), 'roster').trophies, P.fullProfile(f, m, 'roster').trophies);
});

test('career card content: honours as pills (counted), three position stats or where he stands, tiers, file names', () => {
  const p = { name: 'Thunderhorn Maximus VI', tier: 'dynasty', level: 30, ovr: 88, seasons: 7, stats: { games: 60, focus: [{ label: 'Pass yards', text: '12,400' }, { label: 'Pass TD', text: '110' }, { label: 'INT thrown', text: '30' }, { label: 'Comp %', text: '64%' }] },
    trophies: [{ kind: 'hof', count: 1 }, { kind: 'champion', count: 3 }, { kind: 'mvp', count: 2 }, { kind: 'record', count: 1 }] };
  assert.deepEqual(honourPills(p).map((x) => x.text), ['HALL OF FAME', '3× CHAMPION', '2× MVP', '1 LEAGUE RECORD']);
  assert.deepEqual(cardStats(p).map((s) => s.value), ['12,400', '110', '30']);
  assert.deepEqual(cardStats({ level: 1, ovr: 55, seasons: 1, stats: { games: 0 } }).map((s) => s.label), ['Level', 'Overall', 'Season']);
  for (const t of ['rookie', 'established', 'veteran', 'decorated', 'champion', 'dynasty', 'hof', 'prospect']) assert.ok(TIER_STYLE[t], t);
  assert.equal(cardFileName(p, 'square'), 'thunderhorn-maximus-vi-career-square.png');
});

test('Hall of Fame snapshot: small, self-contained, read-only (no links), and faithful to the profile', () => {
  const f = franchise(); const m = f.roster.slice().sort((a, b) => P.honoursCount(b) - P.honoursCount(a))[0];
  const s = P.careerSnapshot(f, m); const size = JSON.stringify(s).length;
  assert.ok(size < 4000, `snapshot is ${size} bytes`);
  const sp = P.snapshotProfile(JSON.parse(JSON.stringify(s)));
  assert.equal(sp.kind, 'snapshot'); assert.ok(sp.timeline.every((e) => e.ref === null));
  assert.deepEqual(sp.trophies.map((t) => [t.kind, t.count]), P.fullProfile(f, m, 'roster').trophies.map((t) => [t.kind, t.count]));
  assert.deepEqual(sp.stats.focus.map((x) => x.text), P.fullProfile(f, m, 'roster').stats.focus.map((x) => x.text));
});
