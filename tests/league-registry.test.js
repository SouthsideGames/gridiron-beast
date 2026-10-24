// The league registry (GDD §42.6, Phase 3): ids unique in the universe, one monster on one club, protected monsters bound to
// their clubs with the permanent deal, the capture migration from today's generated rosters, and schema 8 round trips.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import * as R from '../src/franchise/league-registry.js';
import { releaseFromClub, enterPool, joinAsDraftee, weakestSpare, POOL_WORTH } from '../src/franchise/league.js';
import { newFranchise, runFranchise } from '../tools/franchise-soak.mjs';
import { leagueInvariants } from '../tools/league-soak.mjs';
import { teamOverall } from '../src/franchise/roster.js';
import { ALL_TEAMS, tierById } from '../src/data/league.js';
import { GYM_BY_CLUB } from '../src/data/gyms.js';
import { createRng } from '../src/core/rng.js';
import { ROSTER_MAX, monsterOverall } from '../src/data/monsters.js';

const clubsOf = (f) => ALL_TEAMS.filter((t) => t !== f.club);

test('a new franchise is a persistent universe: 15 clubs of 38, every id issued once, protected monsters listed on permanent deals, schema 8', () => {
  const f = newFranchise(11, { difficulty: 'pro' });
  assert.equal(f.schemaVersion, 8); assert.ok(F.hasLeague(f));
  assert.deepEqual(R.verifyLeague(f), []);
  const clubs = clubsOf(f); assert.equal(R.leagueClubs(f).length, 15);
  for (const c of clubs) assert.equal(R.clubRoster(f, c).length, 38, `${c} carries the full roster`);
  const all = [...new Set([...f.roster, ...(f.draft?.class || []), ...clubs.flatMap((c) => R.clubRoster(f, c))])]; // the class still lists the drafted objects
  assert.equal(new Set(all.map((m) => m.id)).size, all.length, 'no id twice anywhere in the universe');
  for (const m of all) assert.ok(R.idIssued(f, m.id), `${m.id} is registered`);
  // gym legendaries and the rival's signature monster
  for (const c of clubs) {
    const rec = R.clubRecord(f, c); const roster = R.clubRoster(f, c);
    const expected = roster.filter((m) => m.legendary || m.signature).map((m) => m.id).sort();
    assert.deepEqual(rec.protected.slice().sort(), expected, `${c}: protected list matches the flags`);
    if (GYM_BY_CLUB[c]) assert.ok(roster.some((m) => m.legendary && m.species === GYM_BY_CLUB[c].legendary), `${c} holds its legendary`);
    for (const m of roster) { if (R.isProtected(m)) assert.equal(m.contract?.permanent, true); else assert.ok(m.contract?.ends >= 1 && m.salary > 0); }
  }
  const rival = f.rivals[f.tier].team; assert.ok(R.clubRoster(f, rival).some((m) => m.signature), 'the rival has his signature monster');
  // the creation draft's AI picks joined real rosters on rookie deals; nothing was written to draftResults
  const rookies = clubs.flatMap((c) => R.clubRoster(f, c)).filter((m) => m.drafted); assert.ok(rookies.length >= 40);
  assert.ok(rookies.every((m) => m.contract?.rookie && m.yearsPro === 0 && m.drafted.club === R.clubOf(f, m.id)));
  assert.equal(f.draftResults, undefined);
});

test('ids: a clash re-keys the newcomer deterministically; existing ids are remembered, never re-keyed; issueId never repeats', () => {
  const f = newFranchise(12);
  const taken = R.clubRoster(f, clubsOf(f)[0])[0];
  const m = { id: taken.id, name: 'Clash' }; const r = R.claimMonster(f, m, 'test');
  assert.ok(r && r.from === taken.id && r.to !== taken.id && m.id === r.to); assert.ok(R.idIssued(f, m.id));
  const m2 = { id: taken.id, name: 'Clash again' }; const r2 = R.claimMonster(f, m2, 'test'); assert.notEqual(m2.id, m.id, 'the second clash lands on a different id');
  const before = f.league.ids.length; assert.equal(R.noteExistingIds(f, [taken, m]), 0); assert.equal(f.league.ids.length, before);
  const rng = createRng(5); const ids = new Set(); for (let i = 0; i < 500; i++) ids.add(R.issueId(f, rng)); assert.equal(ids.size, 500);
  for (const id of ids) assert.ok(R.idIssued(f, id));
});

test('clubs: a monster is never on two clubs; a protected one cannot be removed, released, pooled or traded', async () => {
  const f = newFranchise(13); const [a, b] = clubsOf(f); const year = 1;
  const m = R.clubRoster(f, a).find((x) => !R.isProtected(x));
  assert.throws(() => R.addToClub(f, b, m, { year }), /already/);
  const prot = clubsOf(f).flatMap((c) => R.clubRoster(f, c).map((x) => [c, x])).find(([, x]) => R.isProtected(x)); assert.ok(prot);
  const [pc, pm] = prot; const snapshot = JSON.stringify(R.clubRecord(f, pc));
  assert.throws(() => R.removeFromClub(f, pc, pm.id, { year }), (e) => e.code === 'protected');
  const rel = releaseFromClub(f, pc, pm.id, { year }); assert.equal(rel.ok, false); assert.equal(rel.code, 'protected');
  assert.equal(weakestSpare(f, pc)?.id === pm.id, false, 'the weakest spare is never the protected one');
  // a full club making room for a draftee at the protected monster's position never releases him
  const rookie = { ...R.clubRoster(f, pc).find((x) => x.position === pm.position && !R.isProtected(x)), id: 'm_rookie1', name: 'Rookie', stats: { v: 2, career: { reg: {}, post: {} }, season: { year: null, reg: {}, post: {} }, log: [], seasons: [] } };
  assert.equal(R.clubRoster(f, pc).length, ROSTER_MAX); const j = joinAsDraftee(f, pc, rookie, { year }); assert.ok(j.ok && j.released && j.released.monster.id !== pm.id);
  assert.ok(R.clubRoster(f, pc).some((x) => x.id === pm.id), 'still on his club');
  assert.equal(JSON.parse(snapshot).protected[0], R.clubRecord(f, pc).protected[0]);
  // trades: never a candidate, and the deal itself refuses
  const T = await import('../src/franchise/trades.js');
  assert.throws(() => T.executeTrade(f, { team: pc, give: [], get: { player: pm } }, { club: f.club, year, nextYear: year }), (e) => e.code === 'protected');
  assert.ok(!T.tradable(f, pm));
  assert.deepEqual(R.verifyLeague(f), []);
});

test('the cap for AI clubs: protected salaries are exempt, the staff allowance is fixed, room is the remainder', () => {
  const f = newFranchise(14); const cap = tierById(f.tier).cap;
  const club = clubsOf(f).find((c) => R.clubRecord(f, c).protected.length); const roster = R.clubRoster(f, club);
  const counted = roster.filter((m) => !R.isProtected(m)).reduce((s, m) => s + m.salary, 0);
  assert.equal(R.clubPayroll(f, club), counted);
  assert.equal(R.clubCapRoom(f, club, cap), cap - f.league.staffAllowance - counted);
  assert.equal(f.league.staffAllowance, F.STAFF_ALLOWANCE); assert.ok(F.STAFF_ALLOWANCE > 0);
  const prot = roster.find(R.isProtected); prot.salary = 10_000_000; assert.equal(R.clubPayroll(f, club), counted, 'a protected salary never counts');
});

test('migration: a v40-style save mid-season gets a registry built from the very rosters it was facing; nothing else changes; the season plays on', () => {
  const { f } = runFranchise(21, { seasons: 1, difficulty: 'pro', stopWeek: 5, legacy: true });
  assert.ok(!F.hasLeague(f)); assert.equal(f.schemaVersion, 6); assert.ok(f.draftResults, 'the creation draft went to draftResults as in v40');
  const year = f.season.year; const clubs = clubsOf(f);
  const before = Object.fromEntries(clubs.map((c) => [c, F.aiTeam(f, c, year)]));
  const opp = F.opponentName(f); const oppBefore = before[opp];
  // a clash: the owner's roster holds an id that an AI club is about to bring in
  const victim = before[clubs[3]].roster[5]; f.roster[0].id = victim.id; f.season.leagueStats[clubs[3]] ||= {}; f.season.leagueStats[clubs[3]][victim.id] = { id: victim.id, name: victim.name, team: clubs[3], games: 2, tackles: 7 };
  const untouched = JSON.stringify({ roster: f.roster, pool: f.pool, history: f.history, season: { ...f.season, leagueStats: null }, draftResults: f.draftResults }); // the tables take re-keyed rows
  const r = F.ensureLeague(f);
  assert.ok(r.ok && r.created, r.problems.join('; ')); assert.equal(f.schemaVersion, 8);
  assert.deepEqual(f.league.persistentFrom, { year, week: f.season.week });
  assert.equal(JSON.stringify({ roster: f.roster, pool: f.pool, history: f.history, season: { ...f.season, leagueStats: null }, draftResults: f.draftResults }), untouched, 'the owner\'s side is untouched');
  for (const c of clubs) {
    const now = F.aiTeam(f, c, year);
    assert.equal(teamOverall(now), teamOverall(before[c]), `${c}: the same strength`);
    const ids = (t) => t.roster.map((m) => m.id).sort(); const names = (t) => t.roster.map((m) => `${m.name}|${m.level}|${m.stage || 0}`).sort();
    assert.deepEqual(names(now), names(before[c]), `${c}: the same monsters`);
    const moved = new Set(r.rekeyed.filter((x) => x.club === c).map((x) => x.from));
    assert.deepEqual(ids(now).filter((id) => !r.rekeyed.some((x) => x.to === id)), ids(before[c]).filter((id) => !moved.has(id)), `${c}: the same ids apart from genuine clashes`);
  }
  // every re-key was a genuine clash: the old id is held by another monster somewhere in the universe (today's generator can repeat an id across clubs, GDD §42.2)
  const everyone = [...f.roster, ...clubs.flatMap((c) => R.clubRoster(f, c)), ...(f.draft?.class || [])];
  for (const x of r.rekeyed) assert.ok(everyone.some((m) => m.id === x.from), `${x.from} was taken`);
  const vr = r.rekeyed.find((x) => x.from === victim.id); assert.ok(vr && vr.club === clubs[3], 'the injected clash was re-keyed');
  assert.ok(!f.season.leagueStats[clubs[3]][victim.id] && f.season.leagueStats[clubs[3]][vr.to]?.tackles === 7, 'the table row followed the new id');
  assert.ok(R.clubRoster(f, clubs[3]).some((m) => m.id === vr.to));
  assert.deepEqual(R.verifyLeague(f), []);
  // the next opponent is the one the owner was about to face, and books opened from this season's table rows
  const oppNow = F.aiTeam(f, opp); assert.deepEqual(Object.values(oppNow.chart).sort(), Object.values(oppBefore.chart).sort(), 'the same lineup next Sunday');
  const withRow = clubs.flatMap((c) => R.clubRoster(f, c)).find((m) => (m.stats.season.reg.games || 0) > 0); assert.ok(withRow, 'a monster whose book opened from the table'); assert.equal(withRow.stats.season.year, year);
  // half the deals end this season, half next
  const ends = clubs.flatMap((c) => R.clubRoster(f, c)).filter((m) => !R.isProtected(m)).map((m) => m.contract.ends);
  assert.ok(ends.filter((e) => e === year).length > 200 && ends.filter((e) => e === year + 1).length > 200);
  // the rest of the season plays with the Phase 3 invariants, then the offseason opens with the AI's contracts settled
  let guard = 0; while (!f.season.finished && guard++ < 40) { if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); continue; } F.autoRunToSunday(f); if (F.isBye(f)) { F.takeBye(f); continue; } const g = F.simulatePlayerGame(f); if (!g) break; F.finishSunday(f, g); assert.deepEqual(leagueInvariants(f, `week ${f.season.week}`), []); }
  assert.ok(f.season.finished); assert.ok(f.leagueOffseason?.contracts, 'AI contracts were settled at season end'); assert.ok(f.leagueOffseason.contracts.resigned > 0);
  assert.ok(Object.values(f.pool || {}).flat().some((m) => (m.history || []).some((h) => h.reason === 'walked' && h.club !== f.club)), 'walked AI monsters are in the pools');
});

test('migration never touches an archive, and a failed capture leaves the save exactly as it was', () => {
  const { f } = runFranchise(22, { seasons: 1, stopWeek: 3, legacy: true });
  f.lifecycle = { status: 'retired', legacy: { v: 1 } };
  assert.throws(() => F.ensureLeague(f), (e) => e.code === 'read-only'); assert.ok(!F.hasLeague(f));
  delete f.lifecycle;
  const snap = JSON.stringify(f); const rivals = f.rivals; f.rivals = null; // the capture needs the rival record: it fails
  const r = F.ensureLeague(f); assert.equal(r.ok, false); assert.ok(r.problems.length);
  f.rivals = rivals; assert.equal(JSON.stringify(f), snap, 'nothing kept from the failed attempt');
});

test('schema 8 round trips through export and import; a damaged registry or an 8 without one is refused', () => {
  const f = newFranchise(15);
  const back = Save.importJson(Save.exportJson(f)); assert.equal(back.schemaVersion, 8); assert.deepEqual(R.verifyLeague(back), []);
  assert.equal(JSON.stringify(back.league), JSON.stringify(f.league));
  const twice = JSON.parse(JSON.stringify(f)); const [a, b] = clubsOf(f); twice.league.clubs[b].roster.push(twice.league.clubs[a].roster[0]);
  assert.throws(() => Save.migrate(twice), (e) => e.code === 'league');
  const bare = JSON.parse(JSON.stringify(f)); delete bare.league; assert.equal(Save.migrate(bare), null, 'an 8 without its registry is not a save this game wrote');
  const six = JSON.parse(JSON.stringify(f)); delete six.league; six.schemaVersion = 6; assert.ok(Save.migrate(six), 'a 6 is still read (and gets its registry when opened by the game)');
});

test('the pools: an AI castoff nobody would want leaves the league at once; a decorated leaver keeps a legend stub; the pool cap holds', () => {
  const f = newFranchise(16); const year = 1; const club = clubsOf(f)[0];
  const dud = R.clubRoster(f, club).filter((m) => !R.isProtected(m)).sort((a, b) => a.potential - b.potential)[0]; dud.age = 31; for (const k of Object.keys(dud.attributes)) dud.attributes[k] = Math.min(dud.attributes[k], 40);
  const r1 = releaseFromClub(f, club, dud.id, { year }); assert.equal(r1.where, 'gone'); assert.ok(!Object.values(f.pool).flat().includes(dud));
  const star = R.clubRoster(f, club).filter((m) => !R.isProtected(m)).sort((a, b) => b.potential - a.potential)[0]; f.history.push({ year: 0, club: f.club, awards: { league: { mvp: { id: star.id, team: club, name: star.name } } } }); star.age = 31; for (const k of Object.keys(star.attributes)) star.attributes[k] = Math.min(star.attributes[k], 40); // decorated by the save's own award history, never by the Career Timeline
  const r2 = releaseFromClub(f, club, star.id, { year }); assert.equal(r2.where, 'legend'); assert.equal(f.league.legends[star.id].name, star.name); assert.equal(F.findInLeague(f, star.id).where, 'legend');
  const best = R.clubRoster(f, club).filter((m) => !R.isProtected(m)).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0]; assert.ok(monsterOverall(best) > POOL_WORTH.market);
  const r3 = releaseFromClub(f, club, best.id, { year }); assert.equal(r3.where, 'waivers', 'better than the owner\'s market grade: the league claims him'); assert.ok(f.league.waivers.includes(best)); assert.ok(!Object.values(f.pool).flat().includes(best));
  const good = R.clubRoster(f, club).filter((m) => !R.isProtected(m) && monsterOverall(m) >= POOL_WORTH.ovr && monsterOverall(m) <= POOL_WORTH.market)[0]; assert.ok(good);
  const r4 = releaseFromClub(f, club, good.id, { year }); assert.equal(r4.where, 'pool'); assert.ok(Object.values(f.pool).flat().includes(good)); assert.equal(good.contract, null);
  for (let i = 0; i < 20; i++) enterPool(f, { id: `m_x${i}`, name: `X${i}`, position: 'WR', type: good.type, origin: good.origin, age: 22, attributes: {}, stats: {} }, { year, from: 'owner' });
  assert.ok(Object.values(f.pool).every((l) => l.length <= 12));
});
