// Tuesday wild companions (GDD §26.1, owner authorization 2026-10-22): the chosen prospect fights beside two unsignable wild
// companions whose strength follows the club. The prospect, the rewards and every Beast Clash value are unchanged.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Link from '../src/franchise/clash-link.js';
import { logHash } from '../src/clash/engine.js';
import { monsterOverall } from '../src/data/monsters.js';
import { exportJson, importJson } from '../src/franchise/save.js';

const ready = (seed) => { const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed }); F.hireDefaultStaff(f); while (F.creationDraftPending(f) && F.onTheClock(f) === f.club) F.passDraftPick(f); f.settings.tutorial = false; f.welcomed = true; F.chooseGoal(f, 'wins'); F.scoutRegion(f, 'Coral Coast'); return f; };

test('the wild side is the scouted prospect, untouched, plus two companions that bring the group to the club\'s strength minus the gap', () => {
  const f = ready(11); const p = f.week.prospects[0]; const before = JSON.stringify(p.monster);
  const pv = F.encounterPreview(f, 0); assert.equal(pv.size, 3); assert.equal(pv.wild[0], p.monster, 'the prospect itself leads');
  const S = F.clubBattleStrength(f); const R = F.COMPANION_RULE;
  for (const c of pv.wild.slice(1)) { assert.equal(c.companion, true); assert.match(c.id, /^wild_/); assert.ok(monsterOverall(c) <= Math.round(S) + 1, 'never above the club'); }
  const group = pv.wild.reduce((a, m) => a + monsterOverall(m), 0) / 3; const expected = Math.min(S - R.gap, (monsterOverall(p.monster) + 2 * Math.round(S)) / 3);
  assert.ok(Math.abs(group - expected) <= R.spread + 1.5, `wild group ${group.toFixed(1)} vs ${expected.toFixed(1)}`);
  assert.equal(JSON.stringify(p.monster), before, 'the scouted prospect keeps every rating');
  assert.ok(!f.week.prospects.some((x) => x.monster.companion), 'companions are not prospects');
});

test('companions are deterministic, do not touch the franchise generator, and match the battle that is fought', () => {
  const f = ready(12); const rng = f.rngState;
  const a = F.encounterPreview(f, 1).wild.map((m) => JSON.stringify(m)), b = F.encounterPreview(f, 1).wild.map((m) => JSON.stringify(m));
  assert.deepEqual(a, b); assert.equal(f.rngState, rng, 'previewing draws nothing from the franchise generator');
  assert.notDeepEqual(F.encounterPreview(f, 0).wild.slice(1).map((m) => m.id), F.encounterPreview(f, 1).wild.slice(1).map((m) => m.id), 'each prospect has its own companions');
  assert.ok(F.startEncounter(f, 1).ok); const e = f.week.encounter;
  assert.deepEqual(e.b.map((m) => m.id), F.encounterPreview(f, 1).wild.map((m) => m.id));
  assert.deepEqual(e.b.map((m) => m.attributes), F.encounterPreview(f, 1).wild.map((m) => m.attributes));
});

test('the chosen lineup never changes the companions: fielding the weakest monsters does not make the battle easier', () => {
  const f = ready(13); const pv = F.encounterPreview(f, 0);
  const weakest = Link.eligibleBattlers(f.roster).slice().sort((x, y) => monsterOverall(x) - monsterOverall(y)).slice(0, 3).map((m) => m.id);
  assert.ok(F.startEncounter(f, 0, { lineup: weakest }).ok);
  assert.deepEqual(f.week.encounter.b.map((m) => m.attributes), pv.wild.map((m) => m.attributes));
});

test('companions grow with the club and make up for the prospect: a stronger roster meets stronger companions; the prospect stays as scouted', () => {
  const f = ready(14); const g = JSON.parse(JSON.stringify(f));
  for (const m of g.roster) for (const k of Object.keys(m.attributes)) m.attributes[k] = Math.min(99, m.attributes[k] + 10);
  const cf = F.encounterPreview(f, 0).wild, cg = F.encounterPreview(g, 0).wild;
  assert.ok(F.clubBattleStrength(g) > F.clubBattleStrength(f) + 5);
  const avg = (xs) => xs.reduce((s, m) => s + monsterOverall(m), 0) / xs.length;
  assert.ok(avg(cg.slice(1)) > avg(cf.slice(1)) + 5); assert.equal(monsterOverall(cg[0]), monsterOverall(cf[0]));
});

test('companions cannot be signed: a win offers the prospect only, and no wild monster ever joins the roster', () => {
  let offers = 0;
  for (let seed = 20; seed < 40 && offers < 3; seed++) {
    const f = ready(seed); F.startEncounter(f, 0); const r = F.resolveEncounter(f); if (!r.ok || f.week.encounter.status !== 'offer') continue; offers++;
    const pid = f.week.prospects[0].monster.id; const rel = F.releaseCandidates(f, f.week.prospects[0]);
    const s = F.acceptOffer(f, { releaseId: rel.needed ? rel.list[0].id : null }); assert.ok(s.ok, s.reason); assert.equal(s.monster.id, pid);
    assert.ok(!f.roster.some((m) => m.companion || /^wild_/.test(m.id)));
  }
  assert.ok(offers >= 1);
});

test('a battle started before a roster change, or saved under the old companion rule, rebuilds from its stored lineups', () => {
  const f = ready(15); assert.ok(F.startEncounter(f, 0).ok); const h = logHash(F.encounterBattle(f));
  for (const m of f.roster) m.attributes.speed = Math.min(99, m.attributes.speed + 15); // companions for a new preview would change
  assert.equal(logHash(F.encounterBattle(f)), h);
  const old = JSON.parse(exportJson(f)); old.franchise.week.encounter.b = [old.franchise.week.encounter.b[0], ...old.franchise.week.prospects.slice(1, 3).map((p) => Link.snapMonster(p.monster))]; // a record made under the previous rule
  const g = importJson(JSON.stringify(old)); const r1 = F.encounterBattle(g), r2 = F.encounterBattle(importJson(JSON.stringify(old)));
  assert.equal(logHash(r1), logHash(r2)); assert.deepEqual(r1.lines.b.map((x) => x.combatant.monsterId), g.week.encounter.b.map((m) => m.id));
});

test('Play, Auto and Skip to Results still fight the same companions; Skip Encounter still costs nothing', () => {
  const f = ready(16); const g = JSON.parse(JSON.stringify(f)); const h = JSON.parse(JSON.stringify(f));
  F.startEncounter(f, 0, { mode: 'auto' }); F.startEncounter(g, 0, { mode: 'skip' }); F.startEncounter(h, 0, { mode: 'play' });
  assert.equal(logHash(F.encounterBattle(f)), logHash(F.encounterBattle(g)));
  assert.deepEqual(F.encounterBattle(h).lines.b.map((x) => x.combatant.monsterId), F.encounterBattle(f).lines.b.map((x) => x.combatant.monsterId));
  const k = ready(17); const before = JSON.stringify({ roster: k.roster, board: k.board, rng: k.rngState }); F.skipEncounter(k);
  assert.equal(k.season.day, 2); assert.equal(JSON.stringify({ roster: k.roster, board: k.board, rng: k.rngState }), before);
});
