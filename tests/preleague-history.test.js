// The pre-franchise league archive (src/franchise/preleague-history.js): eight seasons before the owner arrives, generated once
// at creation. These tests use real franchises (createFranchise), because the archive has to agree with the real league: its
// fixtures, tiebreakers, bracket, statistic names, award rules, club records and monsters.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import { CANON, FALLEN_POWERS } from '../src/franchise/preleague-history.js';
import { generateLeagueArchive, validateLeagueArchive, lineProblems, leagueArchive, archiveCareer, careerTotals, archiveLegends, archiveAwardsFor, archiveRecords, isArchiveLegendId, ARCHIVE_VERSION, ARCHIVE_SEASONS, ARCHIVE_LEGENDS, ARCHIVE_AWARDS, REGULAR_GAMES, LEGEND_PREFIX } from '../src/franchise/preleague-history.js';
import { CONFERENCE_NAMES, STARTER_DIVISIONS, REG_GAMES } from '../src/data/league.js';
import { ALL_TEAMS, DIVISIONS, STARTER_CLUBS, conferenceFor, divisionOf, leagueSeasonFixtures, legacyPlayoffRound } from '../src/data/league.js';
import { STAT_LABEL, MAX_KEYS, RECORD_CATEGORIES, POSITION_COLUMNS, OFFENSE_POSITIONS, DEFENSE_POSITIONS, withDerived, addInto } from '../src/franchise/stats.js';
import { computeAwards } from '../src/franchise/awards.js';
import { pack, unpack } from '../src/franchise/pack.js';

const SEEDS = [[312, 'Goldhaven Royals'], [7, 'Skyvale Cyclones'], [99, 'Thornwood Wildroots'], [1234, 'Mossvale Quakes'], [2026, 'Goldhaven Royals']];
const cache = new Map();
const franchise = (seed = 312, club = 'Goldhaven Royals') => { const k = `${seed}|${club}`; if (!cache.has(k)) cache.set(k, F.createFranchise({ owner: { first: 'Test', last: 'GM', background: 'player' }, club, seed })); return cache.get(k); };
const liveOf = (f) => [...f.roster, ...Object.values(f.league.monsters)];
const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];

test('deterministic: the same franchise gives the same archive, and generating reads the franchise without changing it', () => {
  const f = franchise(); const before = JSON.stringify(f);
  const again = generateLeagueArchive(f, { quality: (name) => F.clubQuality(f, name, 1) });
  assert.equal(JSON.stringify(f), before, 'generating changed the franchise (state, generator or names)');
  assert.deepEqual(again, f.preLeagueHistory, 'a second generation differs from the one made at creation');
  const twin = F.createFranchise({ owner: { first: 'Test', last: 'GM', background: 'player' }, club: 'Goldhaven Royals', seed: 312 });
  assert.deepEqual(twin.preLeagueHistory, f.preLeagueHistory, 'two creations with one seed differ');
});

// Owner specification, 2026-11-23: the league's history is canon. It is not re-rolled with each franchise.
const canonOf = (f) => JSON.stringify(f.preLeagueHistory.seasons.map((s) => [s.year, s.champion, s.runnerUp, s.standings, s.divisions, s.seeds, s.playoffs]));
test('league history is canon: every franchise, whatever its seed, club or difficulty, has the same seasons, brackets, champions and legends', () => {
  const first = franchise(); const canon = canonOf(first); const legends = (f) => f.preLeagueHistory.legends.map((id) => { const c = f.preLeagueHistory.careers[id]; return [id, c.species, c.position, c.club, c.debut, c.retiredYear, c.seasons]; });
  for (const [seed, club] of SEEDS.slice(1)) { const f = franchise(seed, club); assert.equal(canonOf(f), canon, `seed ${seed} at ${club} has another past`); assert.deepEqual(legends(f), legends(first), `seed ${seed}: the retired legends differ`); }
  assert.notDeepEqual(Object.keys(franchise(7, 'Skyvale Cyclones').preLeagueHistory.careers).filter((id) => !isArchiveLegendId(id)).sort(), Object.keys(first.preLeagueHistory.careers).filter((id) => !isArchiveLegendId(id)).sort(), 'the careers of a save\'s own monsters still belong to that save');
  assert.equal(typeof CANON, 'string'); assert.notDeepEqual(generateLeagueArchive(first, { canon: 'another-key' }).seasons.map((s) => s.champion), first.preLeagueHistory.seasons.map((s) => s.champion), 'the canon key is what fixes the past');
});

test('the two fallen powers: Skyvale and Thornwood won titles under the Gym Leaders who left them, and are at the bottom when the owner arrives', () => {
  const a = franchise().preLeagueHistory; const rec = (year, club) => a.seasons.find((s) => s.year === year).standings.find((r) => r.club === club);
  assert.deepEqual(Object.keys(FALLEN_POWERS), ['Skyvale Cyclones', 'Thornwood Wildroots']);
  assert.equal(FALLEN_POWERS['Skyvale Cyclones'].coach, 'Aria Gale'); assert.equal(FALLEN_POWERS['Skyvale Cyclones'].now, 'Cliffhaven Chargers'); assert.equal(FALLEN_POWERS['Thornwood Wildroots'].coach, 'Rowan Thorne'); assert.equal(FALLEN_POWERS['Thornwood Wildroots'].now, 'Westhaven Pirates');
  for (const [club, arc] of Object.entries(FALLEN_POWERS)) {
    const titles = a.seasons.filter((s) => s.champion === club); assert.ok(titles.length >= 1, `${club} won the Beast Bowl`); assert.ok(titles.every((s) => s.year <= arc.left), `${club}'s titles came under ${arc.coach}`);
    const early = a.seasons.filter((s) => s.year <= arc.left - 1).map((s) => rec(s.year, club)); assert.ok(early.every((r) => r.w > r.l), `${club} had winning seasons under ${arc.coach}`);
    assert.ok(a.seasons.filter((s) => s.year <= arc.left - 1).filter((s) => Object.values(s.seeds).flat().includes(club)).length >= 3, `${club} was a regular in the playoffs`);
    const last = rec(0, club); assert.ok(last.w < last.l, `${club} is a losing club now`); assert.ok(!Object.values(a.seasons.at(-1).seeds).flat().includes(club));
    assert.ok(STARTER_DIVISIONS.includes(divisionOf(club)), `${club} is a starter club`);
  }
  assert.deepEqual(a.seasons.filter((s) => s.champion === 'Skyvale Cyclones').map((s) => s.year), [-7, -5]); assert.deepEqual(a.seasons.filter((s) => s.champion === 'Thornwood Wildroots').map((s) => s.year), [-6], 'the club picker tells the owner this');
});

test('several seeds and every starter club: each archive is sound against its own league', () => {
  for (const [seed, club] of SEEDS) {
    const f = franchise(seed, club); const a = f.preLeagueHistory;
    assert.equal(a.version, ARCHIVE_VERSION); assert.equal(a.seed, f.seed >>> 0);
    assert.deepEqual(validateLeagueArchive(a, { live: liveOf(f) }), [], `seed ${seed}`);
    assert.equal(a.seasons.length, ARCHIVE_SEASONS); assert.deepEqual(a.seasons.map((s) => s.year), [-7, -6, -5, -4, -3, -2, -1, 0]);
    assert.equal(a.from, -7); assert.equal(a.to, 0);
  }
});

// The archive's seasons were played in the old eight-club bracket and stay in it (owner, 2026-11-23: the 14-club playoffs start with
// the owner's first season, and the archive's champions are kept).
test('seasons follow the league\'s real format: fourteen games on real fixtures, the division champions seeded, the old eight-club bracket', () => {
  const real = leagueSeasonFixtures(1); const gamesPerClub = real.flatMap((w) => w.games).filter((g) => g.home === ALL_TEAMS[0] || g.away === ALL_TEAMS[0]).length;
  assert.equal(gamesPerClub, REGULAR_GAMES, 'the archive must play as many games as the league does'); assert.equal(REGULAR_GAMES, 14);
  for (const [seed, club] of SEEDS.slice(0, 3)) for (const s of franchise(seed, club).preLeagueHistory.seasons) {
    assert.equal(s.standings.length, 32); assert.deepEqual(s.standings.map((r) => r.club).sort(), [...ALL_TEAMS].sort());
    for (const r of s.standings) { assert.equal(r.w + r.l, REGULAR_GAMES, `${r.club} ${s.year}`); assert.ok(Number.isInteger(r.pf) && Number.isInteger(r.pa) && r.pf >= 0 && r.pa >= 0); }
    assert.equal(s.standings.reduce((n, r) => n + r.w, 0), 224, 'a 32-club, 14-game season has 224 games'); assert.equal(s.standings.reduce((n, r) => n + r.l, 0), 224);
    assert.equal(s.standings.reduce((n, r) => n + r.pf, 0), s.standings.reduce((n, r) => n + r.pa, 0), 'every point scored was conceded');
    assert.ok(s.standings.every((r, i) => !i || r.w <= s.standings[i - 1].w), 'the table is ordered by record');
    assert.deepEqual(Object.keys(s.divisions).sort(), Object.keys(DIVISIONS).sort());
    for (const conf of CONFERENCE_NAMES) {
      const seeds = s.seeds[conf]; assert.equal(seeds.length, 4);
      assert.ok(seeds.every((c) => conferenceFor(divisionOf(c)) === conf));
      const divs = Object.keys(DIVISIONS).filter((d) => conferenceFor(d) === conf);
      assert.equal(divs.length, 4); assert.deepEqual(seeds.slice().sort(), divs.map((d) => s.divisions[d][0]).sort(), 'the four seeds are the four division champions: there are no wild cards');
    }
    assert.equal(s.playoffs.length, 7, 'four semifinals, two conference finals, the Beast Bowl');
    assert.deepEqual(s.playoffs.filter((g) => g.round === 1).map((g) => [g.home, g.away, g.tag]), legacyPlayoffRound(1, [], s.seeds).map((g) => [g.home, g.away, g.tag]), 'semifinals are 1 v 4 and 2 v 3 in each conference');
    assert.deepEqual(s.playoffs.filter((g) => g.round === 2).map((g) => g.tag), ['Veyra Championship', 'Koruun Championship']);
    const fin = s.playoffs[6]; assert.equal(fin.tag, 'Beast Bowl'); assert.equal(fin.winner, s.champion); assert.equal(fin.winner === fin.home ? fin.away : fin.home, s.runnerUp);
    assert.notEqual(conferenceFor(divisionOf(fin.home)), conferenceFor(divisionOf(fin.away)), 'the Beast Bowl is between the conference champions');
    for (const g of s.playoffs) { assert.notEqual(g.homeScore, g.awayScore); assert.equal(g.winner, g.homeScore > g.awayScore ? g.home : g.away); }
  }
});

test('last season\'s records are the ones the club picker shows, whichever club the owner took', () => {
  const shown = Object.fromEntries(STARTER_CLUBS.map((c) => [c.name, c.record]));
  for (const c of STARTER_CLUBS) { const [w, l] = c.record.split('-').map(Number); assert.equal(w + l, REGULAR_GAMES, `${c.name}: the picker shows ${c.record}, which is not a 14-game record`); }
  const starters = STARTER_CLUBS.map((c) => c.name);
  for (const [seed, club] of SEEDS.map(([seed], i) => [seed, starters[(i * 3) % starters.length]])) {
    const last = franchise(seed, club).preLeagueHistory.seasons.at(-1); assert.equal(last.year, 0);
    for (const [name, record] of Object.entries(shown)) { const r = last.standings.find((x) => x.club === name); assert.equal(`${r.w}-${r.l}`, record, `seed ${seed}: ${name}`); }
    assert.ok(!Object.values(last.seeds).flat().includes(club), 'a rebuilding club was not in last season\'s playoffs');
  }
});

test('veterans have a career as long as their experience; rookies and unknown monsters have none; identities match the live monster', () => {
  for (const [seed, club] of SEEDS.slice(0, 3)) {
    const f = franchise(seed, club); const a = f.preLeagueHistory; let vets = 0, rookies = 0;
    for (const m of liveOf(f)) {
      const c = a.careers[m.id];
      if (!(m.yearsPro > 0)) { rookies++; assert.equal(c, undefined, `${m.id} is a rookie with a past`); assert.equal(archiveCareer(f, m.id), null); continue; }
      vets++; assert.ok(c, `${m.id} has ${m.yearsPro} seasons behind him and no career`);
      assert.equal(c.seasons.length, Math.min(ARCHIVE_SEASONS, m.yearsPro)); assert.equal(c.debut, 1 - c.seasons.length); assert.equal(c.seasons.at(-1).year, 0);
      assert.deepEqual([c.name, c.position, c.species, c.type], [m.name, m.position, m.species, m.type]);
      const ages = c.seasons.map((b) => b.age);
      if (m.dev?.apex || m.legendary || m.signature) assert.ok(ages.every((x) => x === m.age), 'an ageless monster does not get younger in the past');
      else assert.deepEqual(ages, c.seasons.map((b) => m.age - (1 - b.year)), 'he was a year younger each season back');
      assert.equal(c.retired, undefined);
    }
    assert.ok(vets > 300 && rookies > 100, 'a real league has both');
    const ids = Object.keys(a.careers); assert.equal(new Set(ids).size, ids.length);
    const liveIds = new Set(liveOf(f).map((m) => String(m.id))); assert.equal(liveIds.size, liveOf(f).length, 'the league itself has a duplicate id');
    // Draft-day cuts happen after the archive is written: a veteran released then played last season and is rightly remembered.
    const released = new Set(Object.keys(f.freeAgency?.locks?.released || {}));
    const gone = ids.filter((id) => !liveIds.has(id) && !isArchiveLegendId(id)); assert.ok(gone.every((id) => released.has(id)), `archived monsters that are neither in the league nor released at creation: ${gone.filter((id) => !released.has(id))}`);
    assert.deepEqual(ids.filter(isArchiveLegendId).sort(), [...a.legends, ...a.stars].sort()); assert.ok(gone.length < 12);
    assert.equal(new Set(Object.values(a.careers).map((c) => c.name.toLowerCase())).size, ids.length, 'two archived monsters share a name');
  }
});

test('transfers: recorded where the club changes, never for a protected monster, and the last club is today\'s club', () => {
  let moved = 0, total = 0, twice = 0;
  for (const [seed, club] of SEEDS.slice(0, 3)) {
    const f = franchise(seed, club); const a = f.preLeagueHistory; const clubOf = new Map(); for (const [name, data] of Object.entries(f.league.clubs)) for (const id of data.roster) clubOf.set(String(id), name); for (const m of f.roster) clubOf.set(String(m.id), f.club);
    for (const m of liveOf(f)) {
      const c = a.careers[m.id]; if (!c) continue; total++;
      assert.equal(c.club, clubOf.get(String(m.id)), 'his archived club is the one he plays for'); assert.equal(c.seasons.at(-1).team, c.club);
      const teams = c.seasons.map((b) => b.team); const changes = teams.filter((t, i) => i && t !== teams[i - 1]).length;
      assert.equal((c.transfers || []).length, changes);
      for (const t of c.transfers || []) { const i = c.seasons.findIndex((b) => b.year === t.year); assert.ok(i > 0, 'a move is before a season he played, never his first'); assert.equal(c.seasons[i - 1].team, t.from); assert.equal(c.seasons[i].team, t.to); assert.notEqual(t.from, t.to); }
      if (changes) { moved++; if (changes > 1) twice++; assert.ok(!m.legendary && !m.signature && !m.cornerstone, 'a gym legendary, a rival signature or a cornerstone changed clubs'); assert.ok(c.seasons.length >= 3, 'a second-year monster already on his second club'); }
    }
  }
  assert.ok(moved / total > 0.1 && moved / total < 0.4, `${moved} of ${total} changed clubs`); assert.ok(twice > 0 && twice < moved / 3);
});

test('every position has its own statistics, in the ledger\'s own keys, and every line adds up', () => {
  const f = franchise(); const a = f.preLeagueHistory; const seen = Object.fromEntries(POSITIONS.map((p) => [p, new Set()]));
  const own = { QB: ['att', 'comp', 'passYds', 'passTd'], RB: ['rush', 'rushYds'], WR: ['targets', 'rec', 'recYds'], TE: ['targets', 'rec', 'recYds', 'rbSnaps'], OL: ['pbSnaps', 'rbSnaps', 'blocksLost'], DL: ['tackles', 'pressures'], LB: ['tackles', 'covTargets'], CB: ['tackles', 'covTargets', 'recAllowed'], S: ['tackles'], K: ['fga', 'fgm', 'xpa', 'xpm', 'fgLong'] };
  for (const c of Object.values(a.careers)) for (const b of c.seasons) for (const line of [b.reg, b.post]) {
    assert.deepEqual(lineProblems(line, c.position), [], `${c.id} ${b.year}`);
    for (const [k, v] of Object.entries(line)) { assert.ok(k in STAT_LABEL, `${k} is not a statistic the game records`); assert.ok(Number.isInteger(v) && v > 0, `${c.id} ${b.year} ${k}=${v}: a line stores only what happened`); seen[c.position].add(k); }
    if (line.att != null || line.comp != null) assert.ok((line.comp || 0) <= (line.att || 0));
    if (line.rec != null) assert.ok(line.rec <= line.targets);
    if (line.fgm != null) assert.ok(line.fgm <= line.fga);
    if (line.xpm != null) assert.ok(line.xpm <= line.xpa);
    const d = withDerived(line); assert.equal(d.tacklesTotal, (line.tackles || 0) + (line.assists || 0)); assert.equal(d.kickPts, (line.fgm || 0) * 3 + (line.xpm || 0));
    for (const derived of ['tacklesTotal', 'kickPts', 'compPct', 'rating', 'scrimmage']) assert.ok(!(derived in line), `${derived} is derived, never stored`);
  }
  for (const p of POSITIONS) { for (const k of own[p]) assert.ok(seen[p].has(k), `${p} never records ${k}`); assert.ok(seen[p].has('games'), p); }
  assert.ok(!seen.K.has('tackles') && !seen.K.has('att') && !seen.QB.has('sacks') && !seen.CB.has('targets') && !seen.OL.has('rec'), 'a position has another position\'s statistics');
  for (const p of POSITIONS) for (const [key] of POSITION_COLUMNS[p].slice(0, 5)) { const sample = Object.values(a.careers).filter((c) => c.position === p).flatMap((c) => c.seasons).find((b) => (b.reg.starts || 0) >= 6); assert.ok(sample, `no ${p} starter`); assert.notEqual(withDerived(sample.reg)[key], undefined, `${p}: the career table's ${key} column has nothing to show`); }
});

test('career totals are the sums of the seasons, and the longest-play keys are maxima, for the regular season and the playoffs apart', () => {
  const a = franchise().preLeagueHistory; let maxima = 0, posts = 0;
  for (const c of Object.values(a.careers)) {
    const t = careerTotals(c);
    for (const bucket of ['reg', 'post']) {
      const keys = new Set(c.seasons.flatMap((b) => Object.keys(b[bucket] || {})));
      for (const k of keys) { const vals = c.seasons.map((b) => b[bucket]?.[k] || 0); const want = MAX_KEYS.has(k) ? Math.max(...vals) : vals.reduce((x, y) => x + y, 0); assert.equal(t[bucket][k] || 0, want, `${c.id} ${bucket} ${k}`); if (MAX_KEYS.has(k) && c.seasons.length > 1 && vals.filter(Boolean).length > 1) { maxima++; assert.ok(want < vals.reduce((x, y) => x + y, 0)); } }
      assert.deepEqual(Object.keys(t[bucket]).filter((k) => !keys.has(k)), []);
    }
    const viaLedger = {}; for (const b of c.seasons) addInto(viaLedger, b.reg); assert.deepEqual(t.reg, viaLedger, 'the archive sums a career the way the ledger does');
    if (t.post.games) posts++;
    for (const b of c.seasons) { const played = a.seasons.find((s) => s.year === b.year).playoffs.filter((g) => g.home === b.team || g.away === b.team).length; assert.ok((b.post.games || 0) <= played, `${c.id} ${b.year}: playoff games his club never played`); if (!played) assert.deepEqual(b.post, {}); }
  }
  assert.ok(maxima > 100, 'longest-play keys were checked'); assert.ok(posts > 100, 'playoff lines exist');
});

test('award winners: one MVP, OPOY and DPOY a season, chosen by the game\'s own award rules from the canon players\' lines of that season; no Signature Monster of the Year', () => {
  for (const [seed, club] of SEEDS.slice(0, 2)) {
    const f = franchise(seed, club); const a = f.preLeagueHistory;
    for (const s of a.seasons) {
      assert.deepEqual(Object.keys(s.awards.league).sort(), [...ARCHIVE_AWARDS].sort(), `${s.year}`); assert.equal(s.awards.league.smoy, undefined);
      const cast = new Set([...a.legends, ...a.stars]); const table = {}; for (const c of Object.values(a.careers)) { if (!cast.has(c.id)) continue; const b = c.seasons.find((x) => x.year === s.year); if (b) (table[b.team] ||= {})[c.id] = { id: c.id, name: c.name, type: c.type, species: c.species, position: c.position, age: b.age ?? null, yearsPro: s.year - c.debut, team: b.team, ...b.reg }; }
      const races = computeAwards({ table, records: Object.fromEntries(s.standings.map((r) => [r.club, { w: r.w, l: r.l, t: 0, pf: r.pf, pa: r.pa }])), n: 1 });
      for (const kind of ARCHIVE_AWARDS) {
        const w = s.awards.league[kind]; const c = a.careers[w.id]; const book = c.seasons.find((b) => b.year === s.year);
        assert.equal(w.id, races[kind][0].id, `${s.year} ${kind}: not the winner the game's rules name`);
        assert.deepEqual([w.name, w.position, w.species, w.team], [c.name, c.position, c.species, book.team]);
        assert.ok(book.reg.games >= Math.ceil(REG_GAMES * 0.6), 'a winner played most of the season'); assert.ok(cast.has(w.id), 'a canon player'); assert.equal(typeof w.why, 'string'); assert.match(w.record, /^\d+-\d+$/);
        const rec = s.standings.find((r) => r.club === w.team); assert.equal(w.record, `${rec.w}-${rec.l}`);
      }
      assert.ok(OFFENSE_POSITIONS.has(s.awards.league.opoy.position)); assert.ok(DEFENSE_POSITIONS.has(s.awards.league.dpoy.position));
    }
    const wins = archiveAwardsFor(f, a.seasons[7].awards.league.mvp.id); assert.ok(wins.some((x) => x.year === 0 && x.award === 'mvp'));
    assert.deepEqual(archiveAwardsFor(f, 'nobody'), []);
  }
});

test('six retired legends: archive-only identities with real species and unique names, one club, an elite career that ended before year 1', () => {
  for (const [seed, club] of SEEDS.slice(0, 3)) {
    const f = franchise(seed, club); const a = f.preLeagueHistory; const legends = archiveLegends(f);
    assert.equal(legends.length, ARCHIVE_LEGENDS); assert.deepEqual(legends.map((l) => l.position), ['QB', 'RB', 'WR', 'DL', 'LB', 'CB']);
    const liveNames = new Set(liveOf(f).map((m) => m.name.toLowerCase())); const classNames = new Set((f.draft?.class || []).map((m) => m.name.toLowerCase()));
    for (const l of legends) {
      assert.ok(isArchiveLegendId(l.id) && l.id.startsWith(LEGEND_PREFIX)); const c = a.careers[l.id];
      assert.equal(c.retired, true); assert.ok(Number.isInteger(c.retiredYear) && c.retiredYear <= 0 && c.retiredYear >= -2); assert.ok(!Object.is(c.retiredYear, -0), 'a retirement year of -0 does not survive a save');
      assert.equal(c.seasons.at(-1).year, c.retiredYear); assert.equal(c.debut, -7); assert.equal(new Set(c.seasons.map((b) => b.team)).size, 1);
      assert.ok(c.species && c.type && /^[A-Z][a-z]{3,7}$/.test(c.name), `${c.name}: a legend is named like every monster`); assert.ok(!liveNames.has(c.name.toLowerCase()) && !classNames.has(c.name.toLowerCase()), `${c.name} is also a live monster's name`);
      assert.equal(f.individualNames.byId[l.id], c.name, 'his name is reserved for the life of the franchise');
      assert.ok(c.seasons.every((b) => b.reg.starts === b.reg.games), 'a legend started'); assert.ok(c.seasons.at(-1).age >= 28 && c.seasons[0].age >= 23);
      const peers = Object.values(a.careers).filter((x) => x.position === c.position && !x.retired).flatMap((x) => x.seasons).filter((b) => (b.reg.starts || 0) >= 6);
      const key = { QB: 'passYds', RB: 'rushYds', WR: 'recYds', DL: 'pressures', LB: 'tackles', CB: 'covTargets' }[c.position];
      const median = peers.map((b) => b.reg[key] || 0).sort((x, y) => x - y)[Math.floor(peers.length / 2)]; const perSeason = (l.totals.reg[key] || 0) / c.seasons.length;
      if (c.position !== 'CB') assert.ok(perSeason > median, `${c.name} (${c.position}) averaged ${perSeason} ${key} a season against a starter's ${median}`);
      assert.deepEqual(l.totals, careerTotals(c)); assert.deepEqual(l.titles, a.seasons.filter((s) => s.champion === c.club && c.seasons.some((b) => b.year === s.year)).map((s) => s.year));
    }
    assert.equal(new Set(legends.map((l) => l.name)).size, ARCHIVE_LEGENDS);
    for (const id of [...a.legends, ...a.stars]) { assert.ok(!f.roster.some((m) => m.id === id)); assert.ok(!f.league.monsters[id] && !f.league.legends[id]); assert.ok(!(f.draft.class || []).some((m) => m.id === id)); assert.ok(!Object.values(f.pool || {}).flat().some((m) => m.id === id)); }
  }
});

test('pre-franchise records: the best season and the best career in every category, with derived keys, ties to the earlier mark', () => {
  const f = franchise(); const a = f.preLeagueHistory; const book = archiveRecords(f);
  assert.equal(archiveRecords(f), book, 'computed once for an archive, not on every screen draw');
  for (const cat of RECORD_CATEGORIES) {
    let bestSeason = null, bestCareer = null;
    for (const c of Object.values(a.careers)) {
      for (const b of c.seasons) { const v = withDerived(b.reg)[cat.key]; if (v > 0 && (!bestSeason || v > bestSeason.value)) bestSeason = { value: v }; }
      const v = withDerived(careerTotals(c).reg)[cat.key]; if (v > 0 && (!bestCareer || v > bestCareer.value)) bestCareer = { value: v };
    }
    assert.equal(book.season[cat.id]?.value, bestSeason?.value, `season ${cat.id}`); assert.equal(book.career[cat.id]?.value, bestCareer?.value, `career ${cat.id}`);
    const r = book.season[cat.id]; const holder = a.careers[r.id]; const line = holder.seasons.find((b) => b.year === r.year);
    assert.equal(withDerived(line.reg)[cat.key], r.value); assert.equal(line.team, r.team); assert.equal(r.name, holder.name); assert.equal(r.preLeague, true);
    const earlier = Object.values(a.careers).flatMap((c) => c.seasons.filter((b) => withDerived(b.reg)[cat.key] === r.value).map((b) => b.year)); assert.equal(r.year, Math.min(...earlier), `${cat.id}: a tie goes to the earlier season`);
    const cr = book.career[cat.id]; assert.equal(withDerived(careerTotals(a.careers[cr.id]).reg)[cat.key], cr.value);
    if (MAX_KEYS.has(cat.key)) assert.equal(cr.value, book.season[cat.id].value, 'a longest-play career mark is the best single one, not a sum');
  }
  assert.ok(book.season.tacklesTotal.value > 0, 'tackles (solo + assisted) is derived and still has a record');
  assert.ok(book.career.passYds.value > book.season.passYds.value);
});

test('the validator catches a damaged archive', () => {
  const fresh = () => JSON.parse(JSON.stringify(franchise().preLeagueHistory)); const has = (a, text) => assert.ok(validateLeagueArchive(a).some((e) => e.includes(text)), `expected "${text}" in ${JSON.stringify(validateLeagueArchive(a).slice(0, 3))}`);
  { const a = fresh(); a.seasons[0].standings[0].w++; has(a, 'Invalid season length'); has(a, 'Unbalanced standings'); }
  { const a = fresh(); a.seasons[3].standings[0].pf += 7; has(a, 'Unbalanced points'); }
  { const a = fresh(); a.seasons[0].playoffs[6].winner = a.seasons[0].runnerUp; has(a, 'Playoff winner mismatch'); }
  { const a = fresh(); const s = a.seasons[2]; [s.seeds.Veyra[0], s.seeds.Veyra[3]] = [s.seeds.Veyra[3], s.seeds.Veyra[0]]; has(a, 'Semifinal pairings'); }
  { const a = fresh(); a.seasons[1].champion = 'Nobody'; has(a, 'Champion absent'); }
  { const a = fresh(); a.seasons.pop(); has(a, 'Invalid season chronology'); }
  { const a = fresh(); const c = Object.values(a.careers).find((x) => x.position === 'QB' && x.seasons.length > 2); c.seasons[1].reg.comp = c.seasons[1].reg.att + 1; has(a, 'comp'); }
  { const a = fresh(); const c = Object.values(a.careers).find((x) => x.seasons.length > 2 && !x.transfers); c.seasons[0].team = ALL_TEAMS.find((t) => t !== c.club); has(a, 'Unrecorded transfer'); }
  { const a = fresh(); const c = Object.values(a.careers).find((x) => x.seasons.length > 3); c.seasons.splice(1, 1); has(a, 'Career gap'); }
  { const a = fresh(); const w = a.seasons[7].awards.league.dpoy; a.seasons[7].awards.league.opoy = w; has(a, 'OPOY is not an offensive monster'); }
  { const a = fresh(); a.seasons[7].awards.league.smoy = a.seasons[7].awards.league.mvp; has(a, 'cannot be proved'); }
  { const a = fresh(); delete a.seasons[5].awards.league.mvp; has(a, 'Missing mvp'); }
  { const a = fresh(); a.legends.pop(); has(a, 'Wrong number of retired legends'); }
  { const a = fresh(); a.stars.pop(); has(a, 'Wrong number of retired stars'); }
  { const a = fresh(); const live = Object.keys(a.careers).find((id) => !isArchiveLegendId(id) && a.careers[id].seasons.some((b) => b.year === 0)); const c = a.careers[live]; a.seasons[7].awards.league.mvp = { ...a.seasons[7].awards.league.mvp, id: live, name: c.name, position: c.position, team: c.seasons.at(-1).team }; has(a, 'not a canon player'); }
  { const a = fresh(); const c = Object.values(a.careers).find((x) => x.position === 'LB'); c.seasons[0].reg.tacklesTotal = 5; has(a, 'derived or unknown key'); }
  assert.deepEqual(validateLeagueArchive({ version: 1, seasons: [], careers: {} }), ['Not a version-3 archive']);
  { const f = franchise(); const live = liveOf(f).map((m) => ({ ...m })); const rookie = live.find((m) => !m.yearsPro); const a = fresh(); a.careers[rookie.id] = { ...Object.values(a.careers)[0], id: rookie.id }; assert.ok(validateLeagueArchive(a, { live }).some((e) => e.includes('Rookie with a fabricated career'))); }
});

test('the archive is plain JSON: it survives a save round trip and the storage packer byte for byte', () => {
  const f = franchise(); const a = f.preLeagueHistory; const text = JSON.stringify(a);
  assert.deepEqual(JSON.parse(text), a, 'something in the archive does not survive JSON (undefined, NaN or -0)');
  assert.ok(!/null/.test(JSON.stringify(Object.values(a.careers).map((c) => c.seasons))), 'a season line holds a null');
  assert.equal(JSON.stringify(unpack(pack(f)).preLeagueHistory), text, 'the packed save loses or reorders the archive');
  assert.deepEqual(validateLeagueArchive(JSON.parse(text), { live: liveOf(f) }), []);
  // 32 clubs hold twice the veterans of 16, so the archive is about twice the 16-club one (which was held under 700 KB).
  assert.ok(text.length < 1_400_000, `the archive is ${Math.round(text.length / 1024)} KB of plain data`);
});

test('canon award winners (owner 2026-11-23): every new franchise has the same MVP, OPOY and DPOY in all eight past seasons, and the same champions', () => {
  const sig = (f) => { const a = f.preLeagueHistory; return JSON.stringify(a.seasons.map((s) => ({ year: s.year, champion: s.champion, runnerUp: s.runnerUp, awards: Object.fromEntries(ARCHIVE_AWARDS.map((k) => { const w = s.awards.league[k]; return [k, [w.id, w.name, w.position, w.team, w.species]]; })) }))); };
  const first = sig(franchise(SEEDS[0][0], SEEDS[0][1]));
  for (const [seed, club] of SEEDS.slice(1)) assert.equal(sig(franchise(seed, club)), first, `seed ${seed}: the same past`);
  const f = franchise(SEEDS[0][0], SEEDS[0][1]); const a = f.preLeagueHistory;
  assert.deepEqual(a.seasons.map((s) => s.champion), ['Skyvale Cyclones', 'Thornwood Wildroots', 'Skyvale Cyclones', 'Stormport Bolts', 'Stormport Bolts', 'Aetheria Seers', 'Harbor Anchors', 'Frostpeak Howlers'], 'the champions are unchanged');
  assert.equal(a.stars.length, 12); for (const id of [...a.legends, ...a.stars]) { const c = a.careers[id]; assert.equal(c.retired, true); assert.ok(isArchiveLegendId(id)); assert.ok(c.retiredYear <= 0); assert.equal(f.individualNames.byId[id], c.name, 'a canon name is reserved in the save'); }
  const live = new Set([...Object.values(f.league.monsters), ...f.roster].map((m) => m.name.toLowerCase())); for (const id of [...a.legends, ...a.stars]) assert.equal(live.has(a.careers[id].name.toLowerCase()), false, 'no monster of the save shares a canon name');
  for (const s of a.seasons) { const act = (pos) => [...a.legends, ...a.stars].filter((id) => a.careers[id].seasons.some((b) => b.year === s.year) && pos.has(a.careers[id].position)).length; assert.ok(act(OFFENSE_POSITIONS) >= 3 && act(DEFENSE_POSITIONS) >= 3, `${s.year}: a real race on both sides`); }
});
