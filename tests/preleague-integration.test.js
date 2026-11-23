// The pre-franchise archive inside a real franchise: it is written once, it changes nothing else, nothing in the game reads it
// for a calculation, it survives saving and two full seasons untouched, and its retired legends never become real monsters.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import * as GM from '../src/franchise/gm-career.js';
import { createStore, memoryBackend, exportFranchise } from '../src/franchise/store.js';
import { pack, unpack } from '../src/franchise/pack.js';
import { generateLeagueArchive, validateLeagueArchive, leagueArchive, archiveCareer, careerTotals, archiveRecords, archiveLegends, LEGEND_PREFIX, ARCHIVE_SEASONS } from '../src/franchise/preleague-history.js';
import { historicalRecords, preLeagueRecords, monsterRecordHonours } from '../src/franchise/records-history.js';
import { franchiseSeasonHistory, championshipHistory, historicalAwards, historicalHallOfFame, franchiseTotals, franchiseLegacyIndex } from '../src/franchise/task9-history.js';
import { careerPage } from '../src/franchise/career-page.js';
import { careerProfile, fullProfile, careerSnapshot } from '../src/franchise/career-profile.js';
import { universeCareerLeaders } from '../src/franchise/league-careers.js';
import { addInto } from '../src/franchise/stats.js';
import { runFranchise, newFranchise } from '../tools/franchise-soak.mjs';

const make = (seed = 312, club = 'Ember City Beasts', extra = {}) => F.createFranchise({ owner: { first: 'Test', last: 'GM', background: 'player' }, club, seed, ...extra });
const base = make();
const liveOf = (f) => [...f.roster, ...Object.values(f.league.monsters)];
const sum = (...ls) => { const o = {}; for (const l of ls) addInto(o, l || {}); return o; };

test('creating the archive changes nothing else: the same franchise without it is identical, generator state and draft class included', () => {
  for (const [seed, club] of [[312, 'Ember City Beasts'], [77, 'Stormport Bolts']]) {
    const withArchive = seed === 312 ? base : make(seed, club); const without = make(seed, club, { leagueArchive: false });
    assert.ok(leagueArchive(withArchive)); assert.equal(without.preLeagueHistory, undefined);
    const strip = (f) => { const o = JSON.parse(JSON.stringify(f)); delete o.preLeagueHistory; delete o.uid; delete o.createdAt; for (const id of Object.keys(o.individualNames.byId)) if (id.startsWith(LEGEND_PREFIX)) delete o.individualNames.byId[id]; return o; };
    assert.equal(withArchive.rngState, without.rngState, 'the archive advanced the franchise generator');
    assert.deepEqual(strip(withArchive), strip(without), `seed ${seed}: the archive changed the franchise beside it`);
    assert.deepEqual(Object.keys(withArchive).filter((k) => !(k in without)), ['preLeagueHistory']);
  }
});

test('written once: nothing regenerates or edits it (migration, a second migration, name maintenance, an import)', () => {
  const f = JSON.parse(JSON.stringify(base)); const before = JSON.stringify(f.preLeagueHistory);
  const m1 = Save.migrate(f); assert.ok(m1); assert.equal(JSON.stringify(m1.preLeagueHistory), before, 'loading the save changed the archive');
  const m2 = Save.migrate(JSON.parse(JSON.stringify(m1))); assert.equal(JSON.stringify(m2.preLeagueHistory), before, 'a second load changed it');
  Save.dedupeRosterNames(m2); assert.equal(JSON.stringify(m2.preLeagueHistory), before, 'name maintenance rewrote an archived name');
  const imported = Save.importJson(Save.exportJson(base)); assert.equal(JSON.stringify(imported.preLeagueHistory), before, 'export and import changed it');
  assert.deepEqual(validateLeagueArchive(imported.preLeagueHistory, { live: liveOf(imported) }), []);
  const src = [...Object.keys(F)].filter((k) => typeof F[k] === 'function').map((k) => F[k].toString()).join('\n');
  assert.equal((src.match(/generateLeagueArchive\(/g) || []).length, 1, 'the archive is generated in exactly one place: franchise creation');
});

test('saving and loading through the real store keeps every byte of the archive', async () => {
  const backend = memoryBackend(); const store = createStore({ backend, localStorage: null, debounce: 0 }); await store.open();
  const text = JSON.stringify(base.preLeagueHistory);
  const saved = await store.save(base, { immediate: true }); assert.equal(saved.ok, true);
  const reopened = await createStore({ backend, localStorage: null, debounce: 0 }).open(); const f = reopened.franchise;
  assert.ok(f?.preLeagueHistory, 'the archive did not come back from storage'); assert.equal(JSON.stringify(f.preLeagueHistory), text);
  assert.deepEqual(validateLeagueArchive(f.preLeagueHistory, { live: liveOf(f) }), []);
  // the compressed save grows by the archive and no more than that (measured 2026-11-21: about 128 KB with, about 100 KB without)
  const bare = createStore({ backend: memoryBackend(), localStorage: null, debounce: 0 }); await bare.open(); const without = await bare.save(make(312, 'Ember City Beasts', { leagueArchive: false }), { immediate: true });
  assert.ok(saved.bytes - without.bytes < 120_000, // 32 clubs: twice the veterans, so about twice the 16-club archive (which was held under 60 KB)
    `the archive adds ${saved.bytes - without.bytes} bytes to the stored save`);
  assert.equal(JSON.stringify(unpack(pack(base))), JSON.stringify(base), 'the packer is not lossless with an archive in the save');
  const file = exportFranchise(base); const body = typeof file === 'string' ? file : JSON.stringify(file); assert.ok(body.includes(LEGEND_PREFIX) || body.length > 1000, 'the export holds the franchise');
});

test('a save from before the archive stays as it was: nothing is backfilled and every history view still works', () => {
  const old = JSON.parse(JSON.stringify(base)); delete old.preLeagueHistory; for (const id of Object.keys(old.individualNames.byId)) if (id.startsWith(LEGEND_PREFIX)) delete old.individualNames.byId[id];
  const f = Save.migrate(old); assert.ok(f); assert.equal(f.preLeagueHistory, undefined, 'an existing save was given an invented past');
  assert.equal(leagueArchive(f), null); assert.deepEqual(preLeagueRecords(f), []); assert.deepEqual(archiveLegends(f), []); assert.equal(archiveRecords(f), null); assert.equal(archiveCareer(f, f.roster[0].id), null);
  const vet = f.roster.find((m) => m.yearsPro > 2); const pg = careerPage(f, vet.id);
  assert.equal(pg.preLeague, null); assert.deepEqual(pg.lines.seasons.filter((s) => s.pre), []); assert.ok(pg.p.notes.some((n) => /earlier seasons were played before/.test(n)), 'the old "not on record" note still explains his missing seasons');
  assert.deepEqual(historicalRecords(f).map((s) => s.scope), ['game', 'season', 'team']);
  // a draft-format archive (the first, unmerged version of this feature) is not read as an archive
  const draft = JSON.parse(JSON.stringify(old)); draft.preLeagueHistory = { version: 1, seed: 1, seasons: [{ year: 0, champion: 'X', standings: [] }], careers: {}, legends: [] };
  assert.equal(leagueArchive(draft), null); assert.deepEqual(preLeagueRecords(draft), []); assert.equal(careerPage(draft, vet.id).preLeague, null);
});

test('nothing before year 1 is credited to the incoming GM or counted by the game', () => {
  const f = base; const a = f.preLeagueHistory;
  assert.deepEqual(f.history, []); assert.deepEqual(franchiseSeasonHistory(f), []); assert.deepEqual(championshipHistory(f), []); assert.deepEqual(historicalAwards(f), []);
  const tot = franchiseTotals(f); assert.deepEqual([tot.seasons, tot.w, tot.l, tot.playoffs, tot.titleYears.length, tot.clubAwards.length, tot.recordsHeld.length], [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(GM.careerSeasons(f), 0); const gm = GM.careerTotals(f); assert.ok(!gm.titles && !gm.wins && !gm.w, `GM career totals are not empty: ${JSON.stringify(gm)}`);
  assert.equal(f.records ?? null, null, 'the record book has entries before a game was played'); assert.ok(historicalRecords(f).every((s) => s.rows.every((r) => r.record === null)));
  assert.equal(franchiseLegacyIndex(f).preLeague, undefined, 'the franchise legacy index carries the archive');
  assert.deepEqual([f.campaign.wins, f.campaign.titles, f.campaign.awards], [0, 0, 0]);
  const hall = historicalHallOfFame(f); assert.deepEqual([hall.inductees.length, hall.candidates.length, hall.elections.length], [0, 0, 0]);
  // an owner's-club champion or award winner of the past is history, not his
  const ownTitles = a.seasons.filter((s) => s.champion === f.club).length; const ownAwards = a.seasons.flatMap((s) => Object.values(s.awards.league)).filter((w) => w.team === f.club).length;
  assert.equal(tot.titleYears.length + tot.clubAwards.length, 0, `${ownTitles} past titles and ${ownAwards} past awards of the club are not the GM's`);
  for (const m of liveOf(f)) { assert.deepEqual(m.stats.career, { reg: {}, post: {} }, `${m.id}: the archive wrote into a statistics ledger`); assert.deepEqual(m.stats.seasons, []); assert.ok((m.career?.ev || []).every((e) => e.y == null || e.y >= 1), 'a career event before year 1'); }
  const L = universeCareerLeaders(f, { n: 1 }); assert.ok(Object.values(L).every((rows) => !rows.length || rows.every((r) => !String(r.id).startsWith(LEGEND_PREFIX))), 'a retired legend leads the live career tables');
  assert.ok(Object.values(L).every((rows) => rows.every((r) => !(r.value > 0))), 'career leaders already have totals before a game was played');
});

test('a veteran\'s career page shows the archived seasons apart from the ledger; the shared profile and the Hall snapshot stay on what the franchise has played', () => {
  const f = base; const vet = f.roster.filter((m) => m.yearsPro >= 3).sort((x, y) => y.yearsPro - x.yearsPro)[0]; const c = archiveCareer(f, vet.id);
  const profile = fullProfile(f, vet, 'roster'); assert.equal(profile.stats.games, 0); assert.equal(profile.onRecord, 0); assert.deepEqual(profile.stats.career, {});
  assert.ok(profile.notes.some((n) => /league archive/.test(n)) && !profile.notes.some((n) => /earlier seasons were played before this franchise kept/.test(n)), 'the card says where his earlier seasons are');
  const snap = careerSnapshot(f, vet); assert.equal(snap.games, 0); assert.ok(!JSON.stringify(snap).includes('league archive'), 'a Hall of Fame snapshot carries archive text');
  const pg = careerPage(f, vet.id); const pre = pg.lines.seasons.filter((s) => s.pre);
  assert.equal(pre.length, c.seasons.length); assert.deepEqual(pg.lines.seasons.map((s) => s.year), [...c.seasons.map((b) => b.year), ...pg.lines.seasons.filter((s) => !s.pre).map((s) => s.year)], 'oldest first, each year once');
  assert.equal(new Set(pg.lines.seasons.map((s) => s.year)).size, pg.lines.seasons.length);
  assert.deepEqual(pg.lines.career.reg, careerTotals(c).reg); assert.deepEqual(pg.lines.career.post, careerTotals(c).post);
  assert.equal(pg.facts.games, (careerTotals(c).reg.games || 0) + (careerTotals(c).post.games || 0)); assert.equal(pg.p.stats.games, careerTotals(c).reg.games);
  assert.equal(pg.preLeague.seasons, c.seasons.length); assert.equal(pg.span.from, c.debut); assert.equal(pg.span.to, null);
  assert.ok(!pg.p.notes.some((n) => /league archive|not on record|earlier seasons/.test(n)), 'the page already shows those seasons');
  assert.equal(profile.stats.games, 0, 'building the page changed the shared profile'); assert.deepEqual(vet.stats.career, { reg: {}, post: {} });
  assert.deepEqual(pg.teams.map((t) => t.club), [...new Set(c.seasons.map((b) => b.team))], 'clubs in the order he played for them');
  // a rookie and a draft prospect have no "before"
  const rookie = f.roster.find((m) => !m.yearsPro); if (rookie) { const rp = careerPage(f, rookie.id); assert.equal(rp.preLeague, null); assert.deepEqual(rp.lines.seasons.filter((s) => s.pre), []); }
  // a monster who holds a pre-franchise mark sees it named as one, never as a single-game record of the record book
  const holder = Object.values(archiveRecords(f).season).find((r) => careerProfile(f, r.id)); const honours = monsterRecordHonours(f, holder.id);
  assert.ok(honours.length && honours.every((h) => ['preSeason', 'preCareer'].includes(h.scope)), JSON.stringify(honours.map((h) => h.scope)));
});

test('two full seasons later: the archive is untouched, legends are in no roster, pool, draft or ballot, and playable seasons join the archived ones without overlap', () => {
  const seed = 5; const fresh = newFranchise(seed); const text = JSON.stringify(fresh.preLeagueHistory);
  const { f, problems } = runFranchise(seed, { seasons: 2 }); assert.deepEqual(problems, []);
  assert.ok(f.history.length >= 2, 'two seasons were completed');
  assert.equal(JSON.stringify(f.preLeagueHistory), text, 'two seasons of play, an offseason, a draft and free agency changed the archive');
  const a = f.preLeagueHistory; const rest = JSON.parse(JSON.stringify(f)); delete rest.preLeagueHistory; for (const id of a.legends) delete rest.individualNames.byId[id];
  assert.ok(!JSON.stringify(rest).includes(LEGEND_PREFIX), 'a retired legend\'s id appears outside the archive (roster, registry, pool, draft, market, ballot, news or records)');
  for (const l of archiveLegends(f)) assert.ok(!liveOf(f).some((m) => m.name === l.name) && !(f.draft?.class || []).some((m) => m.name === l.name), `${l.name}: a live monster took a legend's name`);
  assert.ok((f.monsterHallOfFame?.candidates || []).every((c) => !String(c.id).startsWith(LEGEND_PREFIX)));
  // the record book and the awards of the played seasons know nothing older than year 1
  for (const scope of ['game', 'season', 'team']) for (const r of Object.values(f.records?.[scope] || {})) assert.ok(r.year >= 1, `${scope} record from year ${r.year}`);
  assert.ok(f.history.every((h) => h.year >= 1)); assert.ok(historicalAwards(f).every((x) => x.year >= 1));
  const tot = franchiseTotals(f); assert.equal(tot.seasons, f.history.length); assert.ok(tot.recordsHeld.every((r) => r.year >= 1));
  // a veteran who has now played: archived seasons, then the played ones; totals are the two added, each counted once
  const vet = liveOf(f).filter((m) => archiveCareer(f, m.id) && (m.stats?.career?.reg?.games || 0) > 0).sort((x, y) => (y.stats.career.reg.games) - (x.stats.career.reg.games))[0];
  const c = archiveCareer(f, vet.id); const pg = careerPage(f, vet.id); const years = pg.lines.seasons.map((s) => s.year);
  assert.deepEqual(years, [...years].sort((x, y) => x - y)); assert.equal(new Set(years).size, years.length, 'a season appears twice');
  assert.deepEqual(pg.lines.seasons.filter((s) => s.pre).map((s) => s.year), c.seasons.map((b) => b.year)); assert.ok(pg.lines.seasons.some((s) => !s.pre && s.year >= 1));
  assert.deepEqual(pg.lines.career.reg, sum(careerTotals(c).reg, vet.stats.career.reg)); assert.deepEqual(pg.lines.career.post, sum(careerTotals(c).post, vet.stats.career.post));
  assert.equal(fullProfile(f, vet, f.roster.includes(vet) ? 'roster' : 'league').stats.games, vet.stats.career.reg.games, 'the ledger-based profile counts only played seasons');
  // rookies of the first two drafts still have no past; no live monster gained an archive career after creation
  for (const m of liveOf(f)) { const career = a.careers[m.id]; if (career) assert.equal(career.seasons.length, Math.min(ARCHIVE_SEASONS, (m.yearsPro || 0) - f.history.length), `${m.id}: his archived seasons no longer match his experience`); }
  assert.ok(liveOf(f).filter((m) => (m.yearsPro || 0) <= f.history.length && !a.careers[m.id]).length > 50, 'the drafted classes have no archive career');
  // regenerating from today's league would differ (rosters moved on): the stored archive is the record, never a recomputation
  assert.notEqual(JSON.stringify(generateLeagueArchive(f, { quality: (n) => F.clubQuality(f, n, 1) }).careers), JSON.stringify(a.careers));
  assert.deepEqual(validateLeagueArchive(a), []);
});
