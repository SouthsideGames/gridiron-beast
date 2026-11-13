import test from 'node:test';
import assert from 'node:assert/strict';
import { monsterHofBallot, electMonsterHallOfFame, monsterHofInductees, recordRetiredMonsterCandidates, candidateScore, candidateCase, productionStanding, productionRank, careerProduction, caseFacts, HALL_CASE, MAX_NOMINEES, WAIT_SEASONS } from '../src/franchise/monster-hof-voting.js';

const star = { id: 'retired-1', name: 'Star', position: 'QB', retiredYear: 5, seasons: 12, games: 110, honours: { titles: 3, awards: 4, records: 2 } };
const peer = { id: 'retired-2', name: 'Peer', position: 'LB', retiredYear: 5, seasons: 11, games: 90, honours: { titles: 2, awards: 3, records: 1 } };

test('requires three fully completed seasons since retirement', () => {
  assert.equal(WAIT_SEASONS, 3);
  assert.equal(monsterHofBallot([star], 7).length, 0);
  assert.equal(monsterHofBallot([star], 8).length, 1);
});
test('ballots are deterministic, independent of input order, and do not mutate candidates', () => {
  const before = JSON.stringify([star, peer]);
  const a = monsterHofBallot([star, peer], 9);
  assert.deepEqual(a, monsterHofBallot([peer, star], 9));
  assert.equal(JSON.stringify([star, peer]), before);
  assert.equal(a[0].voters, 15);
});
test('elections are idempotent and past inductees cannot be inducted twice', () => {
  const first = electMonsterHallOfFame([star, peer], 9);
  assert.equal(first.created, true);
  assert.equal(electMonsterHallOfFame([star, peer], 9, first.history).created, false);
  const second = electMonsterHallOfFame([star, peer], 10, first.history);
  const ids = monsterHofInductees(second.history).map((c) => c.id);
  assert.equal(ids.length, new Set(ids).size);
});
test('never invents candidates or inducts active monsters', () => {
  assert.equal(monsterHofBallot([], 20).length, 0);
  assert.equal(monsterHofBallot([{ ...star, retiredYear: undefined }], 20).length, 0);
});

test('records only retired monsters with preserved evidence, never a generic leaver', () => {
  const f = { league: { legends: {
    'retired-1': { name: 'Star', position: 'QB', left: 5, seasons: [{ year: 5, reg: { games: 8 } }], ev: [{ t: 'award' }] },
    'released': { name: 'Released', position: 'WR', left: 5, seasons: [] },
  } } };
  recordRetiredMonsterCandidates(f, { owner: [{ id: 'retired-1' }], league: [] }, 5);
  recordRetiredMonsterCandidates(f, { owner: [{ id: 'retired-1' }], league: [] }, 5);
  assert.equal(f.monsterHallOfFame.candidates.length, 1);
  assert.equal(f.monsterHallOfFame.candidates[0].retiredYear, 5);
  assert.equal(f.monsterHallOfFame.candidates[0].honours.awards, 1);
  assert.equal(f.monsterHallOfFame.candidates[0].games, 8);
  assert.equal(monsterHofBallot(f.monsterHallOfFame.candidates, 8).length, 1);
});

test('historical elections survive JSON save and reload unchanged', () => {
  const f = { monsterHallOfFame: { v: 1, candidates: [star, peer], elections: [] } };
  const first = electMonsterHallOfFame(f.monsterHallOfFame.candidates, 8);
  f.monsterHallOfFame.elections = first.history;
  const loaded = JSON.parse(JSON.stringify(f));
  assert.deepEqual(loaded.monsterHallOfFame, f.monsterHallOfFame);
  const repeated = electMonsterHallOfFame(loaded.monsterHallOfFame.candidates, 8, loaded.monsterHallOfFame.elections);
  assert.equal(repeated.created, false);
  assert.deepEqual(repeated.history, first.history);
});
test('missing or malformed candidate arrays are repaired without inventing candidates', () => {
  const f = { league: { legends: {} }, monsterHallOfFame: { candidates: null, elections: null } };
  recordRetiredMonsterCandidates(f, { owner: [], league: [] }, 8);
  assert.deepEqual(f.monsterHallOfFame.candidates, []);
  assert.deepEqual(f.monsterHallOfFame.elections, []);
});

test('decorated unsigned retirees are captured only when retirement pass verifies their IDs', () => {
  const f = { league: { legends: {
    'unsigned-1': { name: 'Veteran', position: 'WR', seasons: [{ reg: { games: 12 } }],
      ev: [{ t: 'award' }] },
    'released-1': { name: 'Released', position: 'WR', seasons: [], ev: [] },
  } } };
  recordRetiredMonsterCandidates(f, {
    owner: [], league: [], unsigned: 1, unsignedIds: [{ id: 'unsigned-1' }],
  }, 10);
  assert.deepEqual(f.monsterHallOfFame.candidates.map((c) => c.id), ['unsigned-1']);
  assert.equal(f.monsterHallOfFame.candidates[0].games, 12);
  assert.equal(f.monsterHallOfFame.candidates[0].honours.awards, 1);
});

test('anonymous Board nominates only fifteen highest-scoring eligible retirees', () => {
  const pool = Array.from({ length: 118 }, (_, i) => ({ ...star, id: `nominee-${i}`, honours: { titles: 0, awards: i, records: 0 } }));
  const ballot = monsterHofBallot(pool, 9);
  assert.equal(MAX_NOMINEES, 15);
  assert.equal(ballot.length, 15);
  assert.equal(ballot[0].id, 'nominee-117');
  assert.equal(ballot.some((x) => x.id === 'nominee-0'), false);
  const election = electMonsterHallOfFame(pool, 9).election;
  assert.equal(election.authority, 'anonymous-hall-board');
  assert.equal(election.sealed, true);
  assert.ok(election.inductees.length <= 3);
  // a candidate left off the ballot is considered again once those ahead of him are inducted
  let history = []; const seen = new Set(); for (let y = 9; y < 20; y++) { const r = electMonsterHallOfFame(pool, y, history); history = r.history; for (const b of r.election.ballot) seen.add(b.id); }
  assert.ok(seen.size > 15, `${seen.size} different nominees over eleven elections`);
  assert.equal(new Set(monsterHofInductees(history).map((x) => x.id)).size, monsterHofInductees(history).length);
});
test('individual awards outweigh championships in nomination score', () => {
  assert.ok(candidateScore({ ...star, honours: { titles: 0, awards: 2, records: 0 } }) > candidateScore({ ...star, honours: { titles: 6, awards: 0, records: 0 } }));
});

// ---- the Hall case (owner 2026-11-12): individual play, awards, records and longevity carry it; titles add a little; every position has a way in
const career = (over) => ({ id: 'c', name: 'C', position: 'WR', retiredYear: 5, seasons: 12, games: 120, honours: { titles: 0, awards: 0, records: 0 }, awardsBy: {}, recordsBy: {}, prod: 100, ...over });
test('a case is the sum of its parts, and titles are the smallest of them', () => {
  const k = candidateCase(career({ honours: { titles: 9, awards: 2, records: 4 }, awardsBy: { mvp: 1, oroy: 1 }, recordsBy: { season: 2, game: 2 } }), 0.9, 1);
  assert.deepEqual(k, { awards: 38, records: 30, production: 48.4, longevity: 31.5, titles: 6, total: 153.9 });
  assert.equal(HALL_CASE.title * HALL_CASE.titleCap, 6, 'nine titles count as three');
  assert.ok(candidateScore(career({ honours: { titles: 20 } }), 0.5) < HALL_CASE.standardFrom, 'titles alone never reach even the most lenient Board member');
  assert.ok(HALL_CASE.award.mvp > HALL_CASE.award.opoy && HALL_CASE.award.opoy > HALL_CASE.award.smoy && HALL_CASE.award.smoy > HALL_CASE.award.oroy, 'an MVP counts most, a rookie award least');
  assert.equal(candidateCase(career({ recordsBy: { season: 9 } })).records, HALL_CASE.recordCap, 'records have a ceiling');
  assert.equal(candidateCase(career({ seasons: 30, games: 900 })).longevity, 34, 'longevity has a ceiling');
});
test('production is judged within a position: a kicker or a lineman has the same way in as a quarterback', () => {
  const group = (position, n, scale) => Array.from({ length: n }, (_, i) => career({ id: `${position}-${i}`, position, prod: (i + 1) * scale, seasons: 14, games: 150 }));
  const pool = [...group('QB', 30, 3000), ...group('K', 30, 40), ...group('OL', 30, 300)];
  const st = productionStanding(pool); const rank = productionRank(pool);
  for (const p of ['QB', 'K', 'OL']) { assert.equal(rank.get(`${p}-29`), 1); assert.equal(rank.get(`${p}-28`), 2); assert.equal(rank.get(`${p}-27`), undefined); }
  assert.equal(st.get('K-29'), st.get('QB-29'), 'the best kicker stands where the best quarterback stands'); assert.equal(st.get('OL-0'), st.get('QB-0'));
  const ballot = monsterHofBallot(pool, 9); const top = (p) => ballot.find((b) => b.id === `${p}-29`);
  assert.equal(top('K').score, top('QB').score); assert.equal(top('OL').score, top('QB').score);
  assert.equal(ballot.find((b) => b.id === 'QB-12'), undefined, 'a middling quarterback is not even nominated');
  // with no award and no record at all, the best long career at each position reaches the Hall, and a middling one never does
  let history = []; for (let y = 9; y <= 20; y++) history = electMonsterHallOfFame(pool, y, history).history;
  const inducted = new Set(monsterHofInductees(history).map((x) => x.id));
  for (const p of ['QB', 'K', 'OL']) assert.ok(inducted.has(`${p}-29`), `the best ${p} is inducted`);
  assert.ok([...inducted].every((id) => Number(id.split('-')[1]) >= 24), `only the top of a position: ${[...inducted]}`);
  const perPos = (p) => [...inducted].filter((id) => id.startsWith(p)).length; assert.ok(Math.abs(perPos('QB') - perPos('K')) <= 2 && Math.abs(perPos('QB') - perPos('OL')) <= 2, 'no position is favoured');
  // a small group crowns nobody
  assert.equal(productionRank(group('K', 9, 40)).size, 0);
  assert.equal(productionStanding([career({ id: 'only', prod: 5 })]).get('only'), 0.5, 'a lone retiree stands in the middle');
});
test('career production reads each position by its own work', () => {
  assert.equal(careerProduction('QB', { passYds: 1000, passTd: 10, intThrown: 2, rushYds: 100 }), 1000 + 200 - 90 + 50);
  assert.equal(careerProduction('K', { fgm: 20, xpm: 30 }), 90);
  assert.equal(careerProduction('OL', { pbSnaps: 1000, rbSnaps: 500, blocksLost: 400, sacksAllowed: 5 }), 1050);
  assert.equal(careerProduction('CB', { tackles: 100, pd: 10, int: 5, ff: 1 }), 50 + 30 + 40 + 3);
  assert.equal(careerProduction('ZZ', { games: 44 }), 44); assert.equal(careerProduction('QB', {}), 0);
});
test('a preserved record gives the detailed case, and an older candidate gains it without anything being estimated', () => {
  const stub = { name: 'Vet', position: 'QB', seasons: [{ reg: { games: 9 } }], career: { passYds: 2000, passTd: 20, intThrown: 4 },
    ev: [{ t: 'award', k: 'award:mvp:3' }, { t: 'award', k: 'award:oroy:1' }, { t: 'record', k: 'rec:season:passYds:3', x: { scope: 'season' } }, { t: 'record', k: 'rec:game:passTd:3:2', x: { scope: 'game' } }, { t: 'champion', k: 'champ:3' }, { t: 'milestone' }] };
  assert.deepEqual(caseFacts(stub), { awardsBy: { mvp: 1, oroy: 1 }, recordsBy: { season: 1, game: 1 }, prod: 2000 + 400 - 180 });
  const f = { league: { legends: { old: stub, fresh: { ...stub, name: 'Fresh' } } }, monsterHallOfFame: { v: 1, candidates: [{ id: 'old', name: 'Vet', position: 'QB', retiredYear: 2, seasons: 1, games: 9, honours: { titles: 1, awards: 2, records: 2 } }], elections: [] } };
  recordRetiredMonsterCandidates(f, { owner: [{ id: 'fresh' }], league: [] }, 6);
  const [old, fresh] = f.monsterHallOfFame.candidates;
  assert.equal(old.retiredYear, 2, 'his retirement year is untouched'); assert.deepEqual(old.awardsBy, { mvp: 1, oroy: 1 }); assert.equal(old.prod, 2220);
  assert.equal(fresh.retiredYear, 6); assert.equal(fresh.prod, 2220); assert.deepEqual(fresh.recordsBy, { season: 1, game: 1 });
  // a candidate whose record is gone keeps what he has, and is judged at the middle of his position
  const g = { league: { legends: {} }, monsterHallOfFame: { v: 1, candidates: [{ id: 'gone', name: 'Gone', position: 'QB', retiredYear: 2, seasons: 10, games: 90, honours: { titles: 0, awards: 3, records: 1 } }], elections: [] } };
  recordRetiredMonsterCandidates(g, { owner: [], league: [] }, 6);
  assert.equal('prod' in g.monsterHallOfFame.candidates[0], false);
  assert.equal(candidateScore(g.monsterHallOfFame.candidates[0]), Math.round((3 * HALL_CASE.awardOther + HALL_CASE.recordOther + 10 + 20 + 90 / 16) * 10) / 10);
});
test('the Board: fifteen seats, a fixed standard per seat and year, and the same result every time', () => {
  const pool = Array.from({ length: 40 }, (_, i) => career({ id: `m${i}`, position: ['QB', 'K', 'OL', 'S'][i % 4], prod: 50 + i * 7, seasons: 6 + (i % 10), games: 60 + i * 3, awardsBy: i % 9 === 0 ? { mvp: 1 } : {} }));
  const a = electMonsterHallOfFame(pool, 9).election; const b = electMonsterHallOfFame(pool.slice().reverse(), 9).election;
  assert.deepEqual(a, b, 'the order the candidates are stored in changes nothing');
  assert.ok(a.ballot.every((x) => x.voters === 15 && x.votes >= 0 && x.votes <= 15 && x.qualified === (x.votes / 15 >= 0.7)));
  assert.ok(a.ballot.every((x, i) => i === 0 || a.ballot[i - 1].votes >= x.votes), 'the ballot is in vote order');
  const other = electMonsterHallOfFame(pool, 10).election; assert.notDeepEqual(other.ballot.map((x) => x.votes), a.ballot.map((x) => x.votes), 'another year, another sitting of the Board');
  // a seat's standard is spread over the whole range, not bunched (seats differ by one character)
  const votes = []; for (let y = 1; y <= 60; y++) votes.push(electMonsterHallOfFame([career({ id: 'edge', retiredYear: 0, prod: 100, seasons: 12, games: 160, awardsBy: { opoy: 1, smoy: 1 } })], y + 3).election.ballot[0].votes);
  assert.ok(new Set(votes).size >= 6, `a borderline case draws many different counts: ${[...new Set(votes)].sort((x, y) => x - y)}`);
});
