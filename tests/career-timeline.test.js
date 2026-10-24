// Monster Career Timeline (GDD §38): joining, development, football firsts and milestones, awards, titles, club moves,
// the Hall of Fame card, multi-season accumulation, saves, duplicates, identical names, and the screen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { careerEvents, careerAfterGame, careerSeasonEnd, backfillCareer, careerTimeline, noteHallOfFame, setCareerEnabled, describeEvent, TIER, hasEvent } from '../src/franchise/career.js';
import { generateMonster, SPECIES_BY_ID } from '../src/data/monsters.js';
import { executeTrade } from '../src/franchise/trades.js';
import { createRng } from '../src/core/rng.js';
import { newFranchise, runFranchise } from '../tools/franchise-soak.mjs';

const keys = (m) => careerEvents(m).map((e) => e.k);
const of = (m, t) => careerEvents(m).filter((e) => e.t === t);
let freshN = 0;
const fresh = (f, position = 'WR', extra = {}) => { const m = generateMonster(createRng(7000 + freshN++), { position, quality: 60 }); Object.assign(m, { salary: 30000, contract: { signed: 1, ends: 2 }, yearsPro: 0 }, extra); return m; };
// a monster with a season book, as recordGame writes it
const withSeason = (m, year, reg, post = {}, team = 'Ember City Beasts') => { m.stats ||= { v: 2, career: { reg: {}, post: {} }, season: { year: null, reg: {}, post: {} }, log: [], seasons: [] }; m.stats.seasons.push({ year, team, reg, post }); for (const [k, v] of Object.entries(reg)) m.stats.career.reg[k] = (m.stats.career.reg[k] || 0) + v; for (const [k, v] of Object.entries(post)) m.stats.career.post[k] = (m.stats.career.post[k] || 0) + v; return m; };

test('beginnings: the founding roster (cornerstones marked), the draft with round and pick, all with season and club', () => {
  const f = newFranchise(51);
  const founding = f.roster.filter((m) => of(m, 'join')[0]?.x?.via === 'founding');
  assert.ok(founding.length >= 20, 'founding monsters carry their start');
  for (const m of founding) { const j = of(m, 'join')[0]; assert.equal(j.y, 1); assert.equal(j.c, f.club); }
  assert.ok(f.roster.filter((m) => m.cornerstone).every((m) => of(m, 'join')[0]?.x?.cornerstone));
  const drafted = f.roster.find((m) => m.drafted); assert.ok(drafted, 'the creation draft adds a pick');
  const j = of(drafted, 'join')[0]; assert.equal(j.x.via, 'draft'); assert.equal(j.x.round, drafted.drafted.round); assert.equal(j.x.overall, drafted.drafted.overall);
  const t = careerTimeline(drafted, { club: f.club }); assert.ok(t.some((e) => e.title === 'Drafted' && /round \d+ \(pick \d+\)/.test(e.desc)));
});

test('recruitment, free agency, a trade, a release and a return: each move is recorded once, and history follows the monster', () => {
  const f = newFranchise(52);
  // a Tuesday encounter signing, as the staff does it during the week
  let g = 0; while (!f.week.recruited && g++ < 30) { if (F.inPlayoffs(f)) break; F.autoRunToSunday(f); if (f.week.recruited) break; if (F.isBye(f)) { F.takeBye(f); continue; } const mm = F.sundayMatchup(f); if (!mm || mm.forfeit) break; F.finishSunday(f, F.simulatePlayerGame(f)); }
  const rec = f.roster.find((m) => m.id === f.week.recruited) || f.roster.find((m) => of(m, 'join')[0]?.x?.via === 'encounter');
  assert.ok(rec, 'the staff recruited a prospect within the first weeks');
  { const j = of(rec, 'join')[0]; assert.equal(j.x.via, 'encounter'); assert.equal(j.c, f.club); assert.match(describeEvent(j, rec).desc, /Tuesday Beast Clash/); }
  // trade: a monster arrives from an AI club with his stint there
  const src = generateMonster(createRng(3), { position: 'RB', quality: 61 }); src.yearsPro = 2;
  const res = executeTrade(f, { team: 'Ashford Hawks', give: [], get: { player: src } }, { club: f.club, year: f.season.year, nextYear: f.season.year + 1 });
  const t = res.player; const tj = of(t, 'join')[0]; assert.equal(tj.x.via, 'trade'); assert.equal(tj.x.from, 'Ashford Hawks');
  assert.ok(careerTimeline(t, { club: f.club }).some((e) => e.t === 'join' && e.title === 'Traded in'));
  // release, then the same monster (same id) comes back: a return, not a new monster
  const m = f.roster.find((x) => !x.cornerstone && of(x, 'join')[0]?.x?.via === 'founding'); const id = m.id;
  F.releaseMonster(f, id); assert.ok(!f.roster.some((x) => x.id === id));
  assert.ok(careerTimeline(m, { club: f.club }).some((e) => e.t === 'left' && /Released/.test(e.title)), 'the release is in his story');
  m.joined = f.season.year + 1; F.syncLegendary(f);
  // sign him back the way free agency does (the pool keeps the monster object)
  const { noteJoin } = await_import();
  noteJoin(f, m, 'free_agent', { region: 'x' }); f.roster.push(m);
  const back = of(m, 'join').find((e) => e.x?.via === 'free_agent'); assert.equal(back.x.back, 1); assert.match(describeEvent(back, m).title, /Returned/);
  assert.equal(of(m, 'join').filter((e) => e.x?.via === 'founding').length, 1, 'the founding entry stays');
});
import * as Career from '../src/franchise/career.js';
function await_import() { return Career; }

test('development: evolutions as they happen, older evolutions rebuilt honestly, level marks only at 10/20/30, a big season of growth', () => {
  const f = newFranchise(53); const sp = Object.values(SPECIES_BY_ID).find((s) => s.evolution?.length && s.rarity === 'common');
  const m = generateMonster(createRng(9), { species: sp.id, quality: 60 }); m.level = sp.evolution[0].level; f.roster.push(m);
  const r = F.evolveMonster(f, m.id); assert.ok(r.ok);
  const evo = of(m, 'evolve')[0]; assert.equal(evo.y, f.season.year); assert.equal(evo.x.to, m.name);
  const old = generateMonster(createRng(10), { species: sp.id, quality: 60 }); old.stage = 1; backfillCareer(f, old);
  const oe = of(old, 'evolve')[0]; assert.equal(oe.y, null, 'season unknown: shown as before the timeline'); assert.equal(oe.x.before, 1);
  const lv = fresh(f); lv.level = 9; careerAfterGame([lv], { year: 1, week: 1, club: f.club }); assert.equal(of(lv, 'level').length, 0);
  lv.level = 10; careerAfterGame([lv], { year: 1, week: 2, club: f.club }); assert.equal(of(lv, 'level')[0].x.level, 10);
  lv.level = 14; careerAfterGame([lv], { year: 1, week: 3, club: f.club }); assert.equal(of(lv, 'level').length, 1, 'no entry for ordinary level-ups');
});

const logGame = (m, { year, week, line, playoff = false, won = true, opp = 'Bayou Stalkers', score = '21-14' }) => {
  m.stats ||= { v: 2, career: { reg: {}, post: {} }, season: { year, reg: {}, post: {} }, log: [], seasons: [] };
  const b = playoff ? 'post' : 'reg'; const gl = { games: 1, ...line };
  for (const [k, v] of Object.entries(gl)) { m.stats.season[b][k] = (m.stats.season[b][k] || 0) + v; m.stats.career[b][k] = (m.stats.career[b][k] || 0) + v; }
  m.stats.season.year = year; m.stats.log.push({ year, week, opp, playoff, won, score, line });
};

test('football: firsts only for what he did, career milestones when crossed, the title only for monsters who played, rivalry and playoff games', () => {
  const f = newFranchise(54); const club = f.club;
  const wr = fresh(f, 'WR'); const qb = fresh(f, 'QB'); const bench = fresh(f, 'CB');
  logGame(wr, { year: 1, week: 1, line: { rec: 4, recYds: 60 } }); logGame(qb, { year: 1, week: 1, line: { att: 20, comp: 12, passYds: 180, passTd: 1 } });
  careerAfterGame([wr, qb, bench], { year: 1, week: 1, club });
  assert.ok(hasEvent(wr, 'debut') && hasEvent(qb, 'debut') && !hasEvent(bench, 'debut'), 'a debut needs a game');
  assert.ok(!hasEvent(wr, 'first:td')); assert.ok(hasEvent(qb, 'first:passTd'));
  logGame(wr, { year: 1, week: 2, line: { rec: 5, recYds: 90, recTd: 2 } }); careerAfterGame([wr], { year: 1, week: 2, club });
  const td = of(wr, 'first')[0]; assert.equal(td.x.id, 'td'); assert.equal(td.w, 2); assert.equal(describeEvent(td, wr).title, 'First career touchdown');
  logGame(wr, { year: 1, week: 3, line: { recTd: 1 } }); careerAfterGame([wr], { year: 1, week: 3, club }); assert.equal(of(wr, 'first').length, 1, 'firsts happen once');
  // career milestone: 10 touchdowns crossed in week 4
  logGame(wr, { year: 1, week: 4, line: { recTd: 7 } }); careerAfterGame([wr], { year: 1, week: 4, club });
  assert.equal(of(wr, 'milestone').find((e) => e.x.key === 'tdTotal').x.at, 10);
  // rivalry win with a big line, a playoff game, the Beast Bowl: winner, loser, and a teammate who did not play
  logGame(wr, { year: 1, week: 5, line: { rec: 6, recYds: 120 } }); careerAfterGame([wr], { year: 1, week: 5, club, rival: true });
  assert.ok(hasEvent(wr, 'rival:1:5'));
  logGame(wr, { year: 1, week: 13, playoff: true, line: { rec: 3, recYds: 40, recTd: 2 } }); logGame(qb, { year: 1, week: 13, playoff: true, won: true, line: { passYds: 120 } });
  careerAfterGame([wr, qb, bench], { year: 1, week: 13, club, playoffRound: 3 });
  assert.ok(hasEvent(wr, 'champ:1') && hasEvent(qb, 'champ:1') && !hasEvent(bench, 'champ:1'), 'only those who played in the final');
  assert.ok(hasEvent(wr, 'po:first') && hasEvent(wr, 'star:1:13'));
  const loser = fresh(f, 'RB'); logGame(loser, { year: 2, week: 13, playoff: true, won: false, line: { rush: 10, rushYds: 30 } }); careerAfterGame([loser], { year: 2, week: 13, club, playoffRound: 3 });
  assert.ok(hasEvent(loser, 'bowl:2') && !hasEvent(loser, 'champ:2'));
  // season end: the title run for someone who played earlier rounds, awards (not the coach's), season marks
  const run = fresh(f, 'LB'); run.stats = { v: 2, career: { reg: { games: 9 }, post: { games: 1 } }, season: { year: 3, reg: { games: 9, tackles: 41 }, post: { games: 1 } }, log: [], seasons: [] };
  careerSeasonEnd([run, bench], { year: 3, club, champion: club, awards: { league: { dpoy: { id: run.id, name: run.name, team: club }, coy: { id: run.id, team: club } } }, records: {} });
  assert.ok(hasEvent(run, 'champ:3') && !hasEvent(bench, 'champ:3'), 'a title run needs a playoff game');
  assert.ok(hasEvent(run, 'award:dpoy:3') && !hasEvent(run, 'award:coy:3'));
  assert.ok(hasEvent(run, 'season:tacklesTotal:3'));
  assert.equal(TIER.award, 'major'); assert.equal(TIER.champion, 'major');
});

test('records and identical names: a record goes to the monster who set it (id), never to a namesake; nothing in the first season', () => {
  const f = newFranchise(55); const club = f.club;
  const a = fresh(f, 'RB', { name: 'Zappard' }), b = fresh(f, 'RB', { name: 'Zappard' }); assert.notEqual(a.id, b.id);
  logGame(a, { year: 2, week: 3, line: { rush: 20, rushYds: 150 } }); logGame(b, { year: 2, week: 3, line: { rush: 5, rushYds: 20 } });
  const records = { game: { rushYds: { value: 150, name: 'Zappard', team: club, year: 2, week: 3 } } };
  careerAfterGame([a, b], { year: 2, week: 3, club, records });
  assert.equal(of(a, 'record').length, 1); assert.equal(of(b, 'record').length, 0, 'same name, different line: not his');
  const c = fresh(f, 'RB'); logGame(c, { year: 1, week: 1, line: { rushYds: 50 } }); careerAfterGame([c], { year: 1, week: 1, club, records: { game: { rushYds: { value: 50, name: c.name, team: club, year: 1, week: 1 } } } });
  assert.equal(of(c, 'record').length, 0, 'league records count from season 2');
  assert.ok(!keys(b).some((k) => keys(a).includes(k) && k.startsWith('rec:')));
});

test('Hall of Fame: the owner\'s card names monsters on their timelines', () => {
  const f = newFranchise(56); const ids = f.roster.slice(0, 2).map((m) => m.id);
  noteHallOfFame(f.roster, ids, { year: 4, club: f.club, owner: 'Ada Lovelace' });
  assert.ok(f.roster.slice(0, 2).every((m) => of(m, 'hof').length === 1)); assert.equal(of(f.roster[3], 'hof').length, 0);
  assert.match(describeEvent(of(f.roster[0], 'hof')[0], f.roster[0]).desc, /Ada Lovelace/);
});

test('multi-season: timelines accumulate without duplicates, stay inside real seasons, and survive save and load', () => {
  const { f, problems } = runFranchise(8, { difficulty: 'rookie', seasons: 3 });
  assert.deepEqual(problems, []);
  let total = 0;
  for (const m of f.roster) {
    const ks = keys(m); assert.equal(new Set(ks).size, ks.length, `${m.name}: no duplicate events`); total += ks.length;
    for (const e of careerEvents(m)) if (e.y != null) assert.ok(e.y >= 1 && e.y <= f.season.year, `${m.name} ${e.k} year ${e.y}`);
  }
  assert.ok(total > f.roster.length * 2, `${total} events across the roster`);
  assert.ok(f.roster.some((m) => of(m, 'first').length), 'firsts happen'); assert.ok(f.roster.some((m) => of(m, 'debut').length));
  const json = Save.exportJson(f); const back = Save.importJson(json); const again = Save.importJson(Save.exportJson(back));
  for (const m of f.roster) { const b = again.roster.find((x) => x.id === m.id); assert.deepEqual(keys(b), keys(m), 'save, load and load again: identical, no duplicates'); }
  const bytes = f.roster.reduce((s, m) => s + JSON.stringify(m.career || {}).length, 0); assert.ok(bytes < 40000, `career data ${bytes} bytes for the roster`);
});

test('the timeline never changes the game: the same franchise with the writers switched off plays out identically', () => {
  const strip = (f) => JSON.stringify(f, (k, v) => (k === 'career' || k === 'createdAt' || k === 'uid' ? undefined : v)); // uid: random per franchise, like createdAt
  const a = runFranchise(9, { difficulty: 'pro', seasons: 2 }).f;
  setCareerEnabled(false); let b; try { b = runFranchise(9, { difficulty: 'pro', seasons: 2 }).f; } finally { setCareerEnabled(true); }
  assert.ok(b.roster.every((m) => !m.career), 'nothing written with the writers off');
  assert.equal(strip(a), strip(b), 'results, ratings, XP, contracts, awards and the Board are identical');
});

test('older saves: rebuilt once from what they prove (awards, titles, seasons, evolutions), nothing invented, idempotent', () => {
  const f = newFranchise(57); const m = f.roster.find((x) => !x.cornerstone); delete m.career; m.yearsPro = 1;
  withSeason(m, 1, { games: 9, rushTd: 4, rushYds: 820 }, { games: 2, rushTd: 1 }, f.club); withSeason(m, 2, { games: 9, rushTd: 6, rushYds: 500 }, {}, f.club); m.stats.season = { year: 3, reg: {}, post: {} };
  f.season.year = 3; f.history.push({ year: 1, club: f.club, champion: f.club, awards: { league: { oroy: { id: m.id, team: f.club, name: m.name } } }, record: { w: 7, l: 2 } });
  const raw = JSON.parse(Save.exportJson(f)); for (const x of raw.franchise.roster) delete x.career; // a save from before the timeline
  const loaded = Save.importJson(JSON.stringify(raw)); const lm = loaded.roster.find((x) => x.id === m.id);
  assert.ok(hasEvent(lm, 'award:oroy:1') && hasEvent(lm, 'champ:1') && hasEvent(lm, 'season:rushYds:1') && hasEvent(lm, 'first:td') && hasEvent(lm, 'mile:tdTotal:10'));
  assert.equal(of(lm, 'first')[0].y, 1); assert.equal(of(lm, 'milestone').find((e) => e.x.key === 'tdTotal').y, 2, 'crossed in season 2');
  assert.ok(!of(lm, 'join').length, 'how he joined is not on record: no entry invented');
  const n = keys(lm).length; const twice = Save.importJson(Save.exportJson(loaded)); assert.equal(keys(twice.roster.find((x) => x.id === m.id)).length, n, 'loading again adds nothing');
  const plain = newFranchise(58); const p = plain.roster[5]; delete p.career; const L = Save.importJson(Save.exportJson(plain)); assert.ok(L, 'a save with no history loads');
});

test('screen: seasons newest first with separators, majors stand out, the fold, the Highlights filter and the empty state', async () => {
  const { timelineHtml, TIMELINE_FOLD } = await import('../src/ui/career-timeline.js');
  const f = newFranchise(59); const m = fresh(f, 'WR'); f.roster.push(m);
  const empty = timelineHtml(f, m); assert.match(empty, /story starts here/);
  for (let w = 1; w <= 9; w++) { logGame(m, { year: 1, week: w, line: { rec: 3, recYds: 40, recTd: w === 2 ? 1 : 0 } }); careerAfterGame([m], { year: 1, week: w, club: f.club }); }
  careerSeasonEnd([m], { year: 1, club: f.club, awards: { league: { oroy: { id: m.id, team: f.club, name: m.name } } }, records: {} });
  for (let i = 0; i < 6; i++) Career.addEvent(m, { k: `x${i}`, t: 'level', y: 2, w: i + 1, c: f.club, x: { level: 10 + i } });
  const html = timelineHtml(f, m, { animate: false });
  assert.ok((html.match(/class="tl-season/g) || []).length >= 1); assert.ok(html.indexOf('Season 1202') < html.indexOf('Season 1201') || !html.includes('Season 1201'), 'newest season first');
  assert.match(html, /data-action="tl-more"/); assert.equal((html.match(/<li /g) || []).length, TIMELINE_FOLD);
  const all = careerTimeline(m, { club: f.club }); assert.ok(all[0].y === 2, 'newest first');
  assert.ok(all.some((e) => e.tier === 'major' && e.t === 'award'));
});
