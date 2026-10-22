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

test('loading a save with two roster monsters of one name gives the later one a numeral', async () => {
  const { exportJson, importJson } = await import('../src/franchise/save.js');
  const f = fresh(9); f.roster[1].name = f.roster[0].name; f.roster[2].name = `${f.roster[0].name} II`;
  const back = importJson(exportJson(f)); const names = back.roster.map((m) => m.name);
  assert.equal(new Set(names).size, names.length, names.join(', ')); assert.equal(back.roster[0].name, f.roster[0].name); assert.equal(back.roster[2].name, `${f.roster[0].name} II`);
});

// ---- Clash integration acceptance (M1-B): save/load in the middle of a Play battle, fatigue, and Skip Encounter costing nothing
import * as Link from '../src/franchise/clash-link.js';
import { exportJson, importJson } from '../src/franchise/save.js';
const ready = (seed) => { const f = fresh(seed); while (F.creationDraftPending(f) && F.onTheClock(f) === f.club) F.passDraftPick(f); f.settings.tutorial = false; f.welcomed = true; F.chooseGoal(f, 'wins'); return f; };
const finishPlay = (f) => { let g = 0; while (Link.pendingDecision(F.encounterBattle(f)) && g++ < 60) F.encounterDecide(f, Link.pendingDecision(F.encounterBattle(f)).ex, 'stay'); return F.resolveEncounter(f); };

test('a Play encounter saved and reloaded in the middle of a swap decision finishes as the identical battle', () => {
  let checked = 0;
  for (let seed = 300; seed < 340 && checked < 3; seed++) {
    const f = ready(seed); F.scoutRegion(f, 'Coral Coast'); if (F.encounterPreview(f, 0).size < 2) continue;
    F.startEncounter(f, 0, { mode: 'play' }); if (!Link.pendingDecision(F.encounterBattle(f))) continue;
    const pend = Link.pendingDecision(F.encounterBattle(f)); F.encounterDecide(f, pend.ex, pend.monsterIds[0]);
    const g = importJson(exportJson(f)); // app closed mid-battle
    assert.ok(finishPlay(f).ok); assert.ok(finishPlay(g).ok);
    assert.equal(g.week.encounter.result.hash, f.week.encounter.result.hash); assert.equal(g.week.encounter.status, f.week.encounter.status);
    assert.deepEqual(g.roster.map((m) => [m.id, m.xp, m.level, m.fatigue]), f.roster.map((m) => [m.id, m.xp, m.level, m.fatigue]));
    checked++;
  }
  assert.ok(checked >= 1, 'found Play battles with a decision');
});

test('every encounter battler takes the encounter fatigue (5) and nobody else does; injured monsters never battle', () => {
  const f = ready(350); F.scoutRegion(f, 'Coral Coast'); f.roster[0].injury = { severity: 'Minor', weeks: 1, type: 'ankle' };
  for (const m of f.roster) m.fatigue = 10;
  assert.ok(F.startEncounter(f, 0).ok); const ids = new Set(f.week.encounter.mine); assert.ok(!ids.has(f.roster[0].id));
  assert.ok(F.resolveEncounter(f).ok);
  for (const m of f.roster) assert.equal(m.fatigue, ids.has(m.id) ? 10 + Link.CLASH_FATIGUE.encounter : 10, m.name);
});

test('Skip Encounter changes nothing but the day: board, morale-like fields, roster, cap and the generator are untouched', () => {
  const f = ready(360); F.scoutRegion(f, 'Coral Coast');
  const snap = (x) => JSON.stringify({ board: x.board, roster: x.roster, rng: x.rngState, money: F.salarySummary(x), rattled: x.rattled, news: x.news.length });
  const before = snap(f); F.skipEncounter(f);
  assert.equal(f.season.day, 2); assert.equal(snap(f), before);
});

test('Friday starts from a valid plan when last week\'s plan holds plays no longer in the playbook (new coordinator); the staff auto-run still reaches Sunday', async () => {
  const { PLAYS } = await import('../src/data/playbook.js');
  const f = ready(370); const cat = F.catalog(f, 'offense'); const stale = Object.keys(PLAYS).filter((id) => !cat.includes(id) && PLAYS[id].side === 'offense').slice(0, 2);
  const outsider = stale.length ? stale : ['retired_play_a', 'retired_play_b'];
  f.week.plan = { offense: [...outsider, ...F.defaultPlan(f, 'offense').slice(0, 4)], defense: F.defaultPlan(f, 'defense') }; f.lastPlan = JSON.parse(JSON.stringify(f.week.plan));
  const o = F.startingPlan(f, 'offense'); assert.equal(o.length, 6); assert.ok(o.every((id) => cat.includes(id)));
  F.autoRunToSunday(f); assert.equal(f.season.day, 6, 'the auto-run sets a legal plan and reaches Sunday');
  assert.ok(f.week.plan.offense.every((id) => cat.includes(id)));
});
