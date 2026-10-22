// Franchise acceptance regressions (GDD §28): bugs found by the multi-season soak (tools/franchise-soak.mjs), each pinned here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import { runFranchise, invariants } from '../tools/franchise-soak.mjs';

function fresh(seed = 7) {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed });
  F.hireDefaultStaff(f); return f;
}

test('a free agent from a region pool who shares a roster name is renamed when he signs (soak: duplicate names)', () => {
  const f = fresh(104); while (F.creationDraftPending(f)) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; }
  F.scoutRegion(f, 'Volcanic Fields'); assert.equal(f.season.day, 1);
  const p = f.week.prospects[0]; const twin = f.roster.find((m) => m.position !== 'K');
  p.monster.name = twin.name; p.fromPool = true; // a walked monster named like a newer roster monster
  f.week.encounter = { prospectIndex: 0, status: 'offer', seed: 1, size: 1, mine: [], wild: [p.monster.id] };
  const rel = F.releaseCandidates(f, p); const r = F.acceptOffer(f, { releaseId: rel.needed ? rel.list[0].id : null }); assert.equal(r.ok, true, r.reason);
  const names = f.roster.map((m) => m.name); assert.equal(new Set(names).size, names.length, `duplicate names: ${names.join(', ')}`);
  assert.notEqual(r.monster.name, twin.name);
});

test('uniqueName never renames a monster because of its own name', () => {
  const f = fresh(5); const m = f.roster[0]; const before = m.name; F.uniqueName(f, m); assert.equal(m.name, before);
});

test('soak: a franchise runs two full seasons (Clash encounters, pregame and overtime Clashes, offseason, draft) with every invariant holding', () => {
  const { problems, log } = runFranchise(104, { difficulty: 'rookie', seasons: 2 });
  assert.deepEqual([...new Set(problems)], []);
  assert.equal(log.seasons.length, 2);
  assert.ok(log.clash.pregame >= 18, 'a pregame Clash before every game');
});

test('invariants catch a duplicate name and a tie in the standings', () => {
  const f = fresh(3); f.roster[1].name = f.roster[0].name; f.season.records[f.club].t = 1;
  const p = invariants(f, 't'); assert.ok(p.some((x) => /duplicate name/.test(x))); assert.ok(p.some((x) => /ties/.test(x)));
});
