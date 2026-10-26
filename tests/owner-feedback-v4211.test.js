// Owner feedback fixes (v42.11): free agents fully known with a roster-fit border, the draft's team needs, announced awards on
// career cards before the season closes, and only the Beast Bowl is called the Beast Bowl.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import { monsterOverall } from '../src/data/monsters.js';
import { careerProfile } from '../src/franchise/career-profile.js';
import { careerPage } from '../src/franchise/career-page.js';
import { isBeastBowlTag, playoffRound } from '../src/data/league.js';
import { createRng } from '../src/core/rng.js';

const fresh = (seed = 7) => F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: 'X' }, club: 'Ember City Beasts', cornerstoneOffense: 'Pyronix', cornerstoneDefense: 'Granigor', seed });

test('positionFit: an open starting spot, a starter upgrade, the only backup, or covered; side by position', () => {
  const f = fresh(); const cbs = f.roster.filter((m) => m.position === 'CB'); assert.ok(cbs.length >= 2);
  const probe = (pos, ovrShift) => { const base = f.roster.find((m) => m.position === pos); return { ...structuredClone(base), id: 'probe', attributes: Object.fromEntries(Object.entries(base.attributes).map(([k, v]) => [k, Math.max(1, Math.min(99, v + ovrShift))])) }; };
  // covered position, weaker monster → not a fit; much stronger → would start
  f.roster.push(structuredClone({ ...cbs[0], id: 'extra_cb' }));
  assert.equal(F.positionFit(f, probe('CB', -30)).kind, null);
  const up = F.positionFit(f, probe('CB', +30)); assert.equal(up.kind, 'starter'); assert.equal(up.side, 'defense');
  // remove backups: exactly the starters left → depth for a weaker one
  f.roster = f.roster.filter((m) => m.position !== 'CB' || m.id === cbs[0].id || m.id === cbs[1].id);
  assert.equal(F.positionFit(f, probe('CB', -30)).kind, 'depth');
  // one starter short → need, even with the overall unknown (a prospect)
  f.roster = f.roster.filter((m) => m.id !== cbs[1].id);
  const need = F.positionFit(f, probe('CB', -30), { ovr: null }); assert.equal(need.kind, 'need'); assert.match(need.text, /1 of 2/);
  assert.equal(F.positionFit(f, probe('QB', 0)).side, 'offense');
  // injured monsters are not counted as available starters
  const qbs = f.roster.filter((m) => m.position === 'QB'); for (const q of qbs) q.injury = { weeks: 3 };
  assert.equal(F.positionFit(f, probe('QB', -40)).kind, 'need');
});

test('ownerNeeds lists short and backup-less positions, worst first, with their side', () => {
  const f = fresh(); f.roster = f.roster.filter((m) => m.position !== 'S');
  const n = F.ownerNeeds(f); assert.equal(n[0].position, 'S'); assert.equal(n[0].status, 'short'); assert.equal(n[0].side, 'defense');
  assert.ok(n.every((x) => x.status !== 'ok'));
});

test('free agency and the draft render the needs banner and fit borders; free-agent rows show ratings, never ??', () => {
  const src = fs.readFileSync('src/ui/screens/hq.js', 'utf8');
  assert.ok((src.match(/needsBanner\(f\)/g) || []).length >= 3, 'market, live draft and draft class');
  assert.match(src, /F\.positionFit\(f, m, \{ ovr: v\.ovr \?\? null \}\)/, 'prospects use only what the scout knows');
  assert.ok(!/Scout report \$\{v\.level\}\/6 · tap for details/.test(src), 'no scout-level line on free-agent rows');
});

test('awards announced at the end of the regular season count on career cards before the season closes', () => {
  const f = fresh(); const m = f.roster.find((x) => x.position === 'QB');
  assert.equal(careerProfile(f, m.id).honours.awards, 0);
  f.season.awardsFinal = { year: f.season.year, races: {}, winners: { mvp: { id: m.id, team: f.club, name: m.name } } };
  const p = careerProfile(f, m.id); assert.equal(p.honours.awards, 1, 'MVP counts as soon as it is announced');
  assert.equal(careerPage(f, m.id).awards.find((a) => a.kind === 'mvp')?.count, 1);
  // once the season is archived and the timeline has the same award, it still counts once
  f.history.push({ year: f.season.year, club: f.club, awards: { league: { mvp: { id: m.id, team: f.club } } } });
  assert.equal(careerProfile(f, m.id).honours.awards, 1, 'no double count');
});

test('only the Beast Bowl is the Beast Bowl: semifinals and conference championships are not', () => {
  const seeds = { Aurora: ['A1', 'A2', 'A3', 'A4'], Titan: ['T1', 'T2', 'T3', 'T4'] };
  const r1 = playoffRound(1, [], seeds); assert.ok(r1.every((g) => !isBeastBowlTag(g.tag)), r1.map((g) => g.tag).join());
  const res1 = r1.map((g, i) => ({ round: 1, conf: g.conf, winner: g.home }));
  const r2 = playoffRound(2, res1, seeds); assert.ok(r2.every((g) => !isBeastBowlTag(g.tag)), r2.map((g) => g.tag).join());
  const r3 = playoffRound(3, [...res1, ...r2.map((g) => ({ round: 2, conf: g.conf, winner: g.home }))], seeds); assert.ok(isBeastBowlTag(r3[0].tag));
  assert.match(fs.readFileSync('src/ui/screens/match.js', 'utf8'), /const champ = G\.event === 'playoff' && isBeastBowlTag\(tag\)/);
});
