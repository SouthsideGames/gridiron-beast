// Full-screen Monster Career Profiles (GDD §48): one page for every monster the game has a record of, built from the one
// career profile every career view uses. Status and designations, chronological order without duplicates, career totals
// that match the season books, unavailable values shown as unavailable, team history from recorded moves only, older saves
// shown as they are, Hall of Fame and archived-franchise profiles, and — above all — viewing never changes the franchise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runFranchise } from '../tools/franchise-soak.mjs';
import { withBoardReset } from '../tools/league-soak.mjs';
import * as Save from '../src/franchise/save.js';
import * as F from '../src/franchise/franchise.js';
import { careerPage, careerStatus, designationOf, statCell, PAGE_TABS } from '../src/franchise/career-page.js';
import { careerProfile, careerSnapshot, findMonster, seasonBooks } from '../src/franchise/career-profile.js';
import { careerTimeline } from '../src/franchise/career.js';
import { careerPageHtml, resolveCareer } from '../src/ui/screens/career.js';
import { careerTotals } from '../src/franchise/league-careers.js';
import { memoryLocalStorage } from './helpers/cloud-sim.js';

globalThis.localStorage = memoryLocalStorage();
const H = await import('../src/franchise/hall-of-fame.js');

const played = (() => { let f = null; return () => (f ||= runFranchise(6, { seasons: 7, difficulty: 'pro', check: withBoardReset(() => []) }).f); })(); // seed 6: seven seasons with retired legends under the Phase C run game, v42.16 (seed 5 with v42.13–v42.15, the second time with the v42.13 pursuit rule; seed 6 with v42.10–v42.12, seed 5 before, seed 4 before v42.5)
const KEYS = ['games', 'passYds', 'passTd', 'rushYds', 'rec', 'recYds', 'tacklesTotal', 'sacks', 'int', 'fgm'];
const allIds = (f) => { const ids = new Set([...f.roster.map((m) => m.id), ...Object.keys(f.league.monsters), ...Object.keys(f.league.legends || {}), ...(f.league.waivers || []).map((m) => m.id), ...Object.values(f.pool || {}).flat().map((m) => m.id)]); for (const h of f.history) for (const T of Object.values(h.leagueStats || {})) for (const id of Object.keys(T)) ids.add(id); return [...ids]; };

test('every kind of monster gets a page with the right status, designation and rating rules', () => {
  const f = played(); const mons = Object.values(f.league.monsters);
  const own = careerPage(f, f.roster[0].id); assert.equal(own.status.label, 'Active'); assert.equal(own.status.detail, 'Your club'); assert.ok(own.p.ovr > 0);
  const ai = careerPage(f, mons.find((m) => !m.legendary && !m.signature).id); assert.equal(ai.status.key, 'active'); assert.match(ai.status.detail, /^With the /); assert.ok(ai.p.ovr > 0);
  const sig = mons.find((m) => m.signature); const sp = careerPage(f, sig.id); assert.deepEqual(sp.designation, { kind: 'signature', label: 'Rival signature' });
  const gym = mons.find((m) => m.legendary); assert.equal(careerPage(f, gym.id).designation.label, 'Gym legendary');
  const lid = Object.keys(f.league.legends)[0]; assert.ok(lid, 'seven seasons produce a retired legend');
  const lg = careerPage(f, lid); assert.equal(lg.status.label, 'Retired'); assert.equal(lg.p.ovr, null, 'a retired legend shows no current rating'); assert.equal(lg.p.level, null);
  const table = allIds(f).find((id) => !findMonster(f, id)); assert.ok(table); const tp = careerPage(f, table); assert.equal(tp.p.kind, 'league'); assert.equal(tp.status.label, 'Not on a current roster'); assert.equal(tp.p.ovr, null);
  assert.equal(careerStatus(f, null, { kind: 'prospect' }).label, 'Draft prospect');
  assert.equal(designationOf({ species: 'x' }, { species: Object.keys((F.SPECIES_BY_ID || {})).find(() => false) }), null);
});

test('a former owner monster keeps his history with the owner\'s club and shows where he is now', () => {
  const { f } = runFranchise(7, { seasons: 3, difficulty: 'pro' }); // seed 7: the lowest-level non-cornerstone has played for the owner (seed 6 until the v42.8 attribute fixes)
  const m = f.roster.filter((x) => !x.cornerstone && (x.stats?.seasons?.length || 0) >= 1).sort((a, b) => a.level - b.level)[0];
  const r = F.releaseMonster(f, m.id); assert.notEqual(r?.ok, false);
  const pg = careerPage(f, m.id); assert.equal(pg.status.label, 'Free agent');
  const team = pg.teams.find((t) => t.club === f.club); assert.ok(team, 'the owner\'s club is in his team history');
  assert.ok(team.seasons.length >= 1 && team.games > 0, 'his seasons with the owner are on record');
  assert.ok(team.moves.some((mv) => mv.t === 'left'), 'the release is a recorded move');
  for (const t of pg.teams) for (const y of t.seasons) assert.ok(t.from <= y && (t.to == null || y <= t.to), `${t.club}: span ${t.from}-${t.to} covers season ${y}`);
});

test('timeline: chronological both ways, no duplicated events, milestones oldest first', () => {
  const f = played();
  for (const id of allIds(f)) {
    const pg = careerPage(f, id); const tl = pg.p.timeline || [];
    assert.equal(new Set(tl.map((e) => e.k)).size, tl.length, `${pg.p.name}: duplicated timeline events`);
    const ys = tl.map((e) => e.y ?? -1); for (let i = 1; i < ys.length; i++) assert.ok(ys[i] <= ys[i - 1], `${pg.p.name}: newest first`);
    const ms = pg.milestones.map((e) => e.y ?? -1); for (let i = 1; i < ms.length; i++) assert.ok(ms[i] >= ms[i - 1], `${pg.p.name}: milestones oldest first`);
  }
  const own = f.roster.find((m) => (m.career?.ev?.length || 0) > 3);
  const html = careerPageHtml({ f, settings: {} }, { id: own.id, tab: 'timeline', order: 'oldest' });
  const years = [...html.matchAll(/<span>Season (\d{4})<\/span>/g)].map((x) => Number(x[1])); assert.ok(years.length >= 1); for (let i = 1; i < years.length; i++) assert.ok(years[i] > years[i - 1], 'oldest first on the page');
});

test('statistics: season rows add up to the career totals the game keeps; unavailable numbers are dashes, not zeros', () => {
  const f = played(); let checked = 0;
  for (const id of allIds(f)) {
    const pg = careerPage(f, id); const L = pg.lines; if (!L.seasons.length || !pg.p.complete && pg.p.kind === 'full') continue;
    for (const bucket of ['reg', 'post']) for (const k of KEYS) { const sum = L.seasons.reduce((a, s) => a + (s[bucket]?.[k] || 0), 0); assert.equal(sum, L.career[bucket]?.[k] || 0, `${pg.p.name} ${bucket} ${k}: seasons ${sum} vs career ${L.career[bucket]?.[k] || 0}`); }
    checked++;
  }
  assert.ok(checked > 100, `checked ${checked} careers`);
  assert.equal(statCell({ games: 3 }, 'passYds'), '—', 'a number the line does not hold');
  assert.equal(statCell({ games: 1, att: 2, comp: 1 }, 'compPct'), '—', 'a rate without the volume to mean anything');
  assert.equal(statCell({ games: 9, att: 100, comp: 60 }, 'compPct'), '60');
});

test('retired legends: the regular season and the playoffs are kept apart (profile, page and League Hub leaders)', () => {
  const f = played();
  for (const [id, stub] of Object.entries(f.league.legends)) {
    if (!stub.seasons?.length) continue;
    const reg = stub.seasons.reduce((a, b) => a + (b.reg?.games || 0), 0); const post = stub.seasons.reduce((a, b) => a + (b.post?.games || 0), 0);
    const p = careerProfile(f, id); assert.equal(p.stats.games, reg, `${stub.name}: regular-season games`); assert.equal(p.stats.postGames, post, `${stub.name}: playoff games`);
    const pg = careerPage(f, id); assert.equal(pg.facts.games, reg + post); assert.equal(pg.facts.regGames, reg);
    assert.equal(careerTotals(stub).games || 0, reg, `${stub.name}: the leaders count the regular season only`);
  }
});

test('team history comes from recorded moves only, and every recorded move appears once', () => {
  const f = played();
  for (const id of allIds(f).slice(0, 400)) {
    const pg = careerPage(f, id); if (pg.p.kind !== 'full') continue;
    const recorded = (pg.p.timeline || []).filter((e) => ['join', 'drafted', 'signed', 'left'].includes(e.t) && e.c && pg.teams.some((t) => t.club === e.c));
    const shown = pg.teams.flatMap((t) => t.moves);
    assert.equal(shown.length, recorded.length, `${pg.p.name}: moves shown ${shown.length}, recorded ${recorded.length}`);
    assert.equal(new Set(shown.map((x) => x.k)).size, shown.length);
  }
});

test('an older save shows what it has: nothing is backfilled or invented by viewing', () => {
  const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/save-v31-season2.json', import.meta.url), 'utf8')).franchise;
  const f = Save.migrate(fx); const before = JSON.stringify(f);
  for (const m of f.roster) {
    const pg = careerPage(f, m.id); const tl = careerTimeline(m, { club: f.club });
    assert.equal(pg.p.timeline.length, tl.length, `${m.name}: the page shows the timeline the save holds`);
    for (const [tab] of PAGE_TABS) careerPageHtml({ f, settings: {} }, { id: m.id, tab });
    if (!pg.p.complete && pg.p.seasons > pg.p.onRecord) assert.match(careerPageHtml({ f, settings: {} }, { id: m.id, tab: 'stats' }), /not counted|before this franchise kept his stats/, `${m.name}: the missing seasons are explained, not filled in`);
  }
  assert.equal(JSON.stringify(f), before, 'viewing an older save writes nothing (no backfill, no stats initialisation)');
});

test('Hall of Fame cards, older cards and an archived franchise\'s best monsters open read-only pages', () => {
  const f = played(); H.resetHof();
  const snap = careerSnapshot(f, f.roster[0]);
  H.addHofCard({ id: 'hof_t', club: f.club, owner: 'T', retiredAt: 1, seasons: 7, record: { w: 40, l: 23 }, bestMonsters: [{ name: snap.name, species: snap.species, position: snap.position, ovr: 70, level: 20 }, { name: 'Cobblon', species: f.roster[1].species, position: 'OL', ovr: 66, level: 18 }], careers: [snap] });
  const app = { f, settings: {} };
  const a = resolveCareer(app, { hof: 'hof_t', i: 0 }); assert.equal(a.p.kind, 'snapshot'); assert.ok(a.readOnly);
  const b = resolveCareer(app, { hof: 'hof_t', i: 1 }); assert.ok(b.p.legacy, 'a monster without a snapshot gets the partial, labelled profile');
  const html = careerPageHtml(app, { hof: 'hof_t', i: 1, tab: 'stats' }); assert.match(html, /not kept on Hall of Fame cards/);
  assert.match(careerPageHtml(app, { hof: 'hof_t', i: 0 }), /cp-status/);
  const archived = { ...f, lifecycle: { ...(f.lifecycle || {}), status: 'retired', legacy: { bestMonsters: [{ name: snap.name, career: snap }] } } };
  assert.equal(careerPage(archived, f.roster[0].id).status.label, 'Final roster');
  assert.equal(resolveCareer({ f: archived, settings: {} }, { best: 0 }).p.kind, 'snapshot');
  H.resetHof();
});

test('viewing every page in every section changes nothing in the franchise', () => {
  const f = played(); const before = JSON.stringify(f); const app = { f, settings: {} }; let n = 0;
  for (const id of allIds(f)) for (const [tab] of PAGE_TABS) { const h = careerPageHtml(app, { id, tab }); n++; assert.ok(!/undefined|NaN|\[object/.test(h.replace(/data-[a-z-]+="[^"]*"/g, '')), `${id} ${tab}`); }
  assert.ok(n > 2000);
  assert.equal(JSON.stringify(f), before);
  assert.match(careerPageHtml(app, { id: 'no-such-monster' }), /No career on record/);
});
