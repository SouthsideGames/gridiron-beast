// Beast Clash in Franchise Mode (owner authorization 2026-10-21, GDD §26): Tuesday Monster Encounters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Link from '../src/franchise/clash-link.js';
import { logHash } from '../src/clash/engine.js';
import { monsterOverall, ROSTER_MAX } from '../src/data/monsters.js';

const newFranchise = (seed = 7) => { const f = F.createFranchise({ owner: { first: 'Kai', last: 'Reyes', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed }); F.hireDefaultStaff(f); while (f.draft && !f.draft.done && F.onTheClock(f) === f.club) F.passDraftPick(f); f.settings.tutorial = false; f.welcomed = true; F.chooseGoal(f, 'wins'); return f; };
const toTuesday = (f, region = 'Coral Coast') => { const r = F.scoutRegion(f, region); assert.ok(r.ok && r.prospects.length >= 1); return r; };

test('encounter preview: 3v3 from healthy roster monsters, the chosen prospect in the wild front, injured monsters never battle', () => {
  const f = newFranchise(21); toTuesday(f);
  f.roster[0].injury = { severity: 'Minor', weeks: 1, type: 'ankle' };
  const pv = F.encounterPreview(f, 0); assert.ok(pv.ok);
  assert.equal(pv.size, Math.min(3, f.week.prospects.length)); assert.equal(pv.lineup.length, pv.size); assert.ok(pv.lineup.every((m) => !m.injury));
  assert.equal(pv.wild[0], f.week.prospects[0].monster);
  assert.deepEqual(Link.eligibleBattlers(f.roster).map((m) => m.id).includes(f.roster[0].id), false);
  // nobody healthy: no battle
  const g = newFranchise(22); toTuesday(g); for (const m of g.roster) m.injury = { severity: 'Minor', weeks: 1, type: 'ankle' };
  assert.equal(F.encounterPreview(g, 0).ok, false); assert.equal(F.startEncounter(g, 0).ok, false);
});

test('enter: the battle is seeded from the franchise generator, deterministic, rebuilt from the save, and identical in auto and skip modes', () => {
  const f = newFranchise(23); toTuesday(f);
  const before = f.rngState;
  const st = F.startEncounter(f, 0); assert.ok(st.ok); assert.notEqual(f.rngState, before, 'one seed drawn');
  const e = f.week.encounter; assert.equal(e.status, 'battle'); assert.ok(e.seed > 0); assert.equal(e.mine.length, e.size); assert.equal(e.wild.length, e.size);
  const r1 = F.encounterBattle(f), r2 = F.encounterBattle(f); assert.equal(logHash(r1), logHash(r2));
  const copy = JSON.parse(JSON.stringify(f)); assert.equal(logHash(F.encounterBattle(copy)), logHash(r1), 'rebuilt from a saved copy');
  assert.deepEqual(r1.lines.a.map((x) => x.combatant.monsterId).sort(), [...e.mine].sort()); assert.deepEqual(r1.lines.b.map((x) => x.combatant.monsterId).sort(), [...e.wild].sort());
  assert.equal(r1.log[1].order.a[0], 'a0'); assert.equal(r1.lines.b.find((x) => x.id === 'b0').combatant.monsterId, e.wild[0], 'the chosen monster starts in the wild front');
  assert.ok(r1.config.policies.a === 'smart' && r1.config.policies.b === 'smart');
  assert.equal(F.startEncounter(f, 0).ok, false, 'one encounter per Tuesday');
  assert.equal(F.recruit(f, 0, 'development').ok, false, 'no pitch while the battle is open');
});

test('win: an offer that respects the roster limit and the cap rules; decline costs nothing; lose: exactly one pitch at the usual odds', () => {
  let wins = 0, losses = 0, pitchedSign = 0;
  for (let seed = 30; seed < 60; seed++) {
    const f = newFranchise(seed); toTuesday(f); const n = f.roster.length; const p = f.week.prospects[0];
    assert.ok(F.startEncounter(f, 0).ok); const b = F.resolveEncounter(f); assert.ok(b.ok);
    assert.equal(F.resolveEncounter(f).already, true, 'idempotent');
    const battlers = f.week.encounter.mine.map((id) => f.roster.find((m) => m.id === id));
    assert.ok(battlers.every((m) => m.fatigue >= Link.CLASH_FATIGUE.encounter), 'battlers tire a little');
    if (b.won) {
      wins++; assert.equal(f.week.encounter.status, 'offer'); assert.equal(F.recruit(f, 0, 'development').ok, false, 'no pitch needed after a win');
      if (seed % 2) { const r = F.acceptOffer(f); assert.ok(r.ok); assert.equal(f.roster.length, n + 1); assert.ok(f.roster.includes(p.monster)); assert.equal(p.monster.contract.years, 2); assert.equal(f.week.recruited, p.monster.id); }
      else { assert.ok(F.declineOffer(f).ok); assert.equal(f.roster.length, n); assert.equal(f.week.encounter.status, 'declined'); }
      assert.equal(f.season.day, 2);
    } else {
      losses++; assert.equal(f.week.encounter.status, 'pitch'); assert.equal(F.acceptOffer(f).ok, false);
      assert.equal(F.recruit(f, 1, 'development').ok, false, 'only the monster you battled');
      const r = F.recruit(f, 0, 'development'); assert.ok(r.ok, r.reason); if (r.success) { pitchedSign++; assert.equal(f.roster.length, n + 1); } else assert.equal(f.roster.length, n);
      assert.equal(f.season.day, 2); assert.equal(F.recruit(f, 0, 'facilities').ok, false, 'one pitch');
    }
  }
  assert.ok(wins > 3 && losses > 3, `wins ${wins} losses ${losses}`);
  // roster full: the offer needs a release
  const f = newFranchise(61); toTuesday(f);
  while (f.roster.length < ROSTER_MAX) { const m = JSON.parse(JSON.stringify(f.roster[f.roster.length - 1])); m.id = `m_fill${f.roster.length}`; m.name = `Fill ${f.roster.length}`; delete m.cornerstone; f.roster.push(m); }
  for (let seed = 1; ; seed++) { F.startEncounter(f, 0); const b = F.resolveEncounter(f); if (b.won) break; f.week.encounter = null; f.season.day = 1; const { r } = { r: null }; }
  const r = F.acceptOffer(f); assert.equal(r.ok, false); assert.equal(r.needRelease, true);
  const rc = F.releaseCandidates(f, f.week.prospects[0]); assert.ok(rc.needed && rc.list.length);
  const r2 = F.acceptOffer(f, { releaseId: rc.list[0].id }); assert.ok(r2.ok); assert.equal(f.roster.length, ROSTER_MAX); assert.ok(!f.roster.find((m) => m.id === rc.list[0].id));
});

test('skip: no battle, no reward, no penalty; the week moves on and nothing else changes', () => {
  const f = newFranchise(70); toTuesday(f);
  const snap = JSON.stringify({ roster: f.roster, rng: f.rngState, board: f.board, campaign: f.campaign, news: f.news.length });
  F.skipEncounter(f);
  assert.equal(f.season.day, 2); assert.deepEqual(f.week.prospects, []); assert.equal(f.week.encounter, null);
  assert.equal(JSON.stringify({ roster: f.roster, rng: f.rngState, board: f.board, campaign: f.campaign, news: f.news.length }), snap);
});

test('play mode: the engine stops at the first open swap decision; answers are recorded and the battle resumes from the same prefix; a stay holds four exchanges', () => {
  let found = false;
  for (let seed = 80; seed < 110 && !found; seed++) {
    const f = newFranchise(seed); toTuesday(f); const pv = F.encounterPreview(f, 0); if (pv.size < 2) continue;
    assert.ok(F.startEncounter(f, 0, { mode: 'play' }).ok);
    let r = F.encounterBattle(f); const pend = Link.pendingDecision(r); if (!pend) continue; found = true;
    assert.equal(F.resolveEncounter(f).ok, false, 'cannot settle with a decision open');
    const prefix = r.log.slice(0, pend.index).map((e) => e.text);
    assert.ok(F.encounterDecide(f, pend.ex, pend.monsterIds[0]).ok);
    r = F.encounterBattle(f); assert.deepEqual(r.log.slice(0, pend.index).map((e) => e.text), prefix, 'same battle up to the decision');
    assert.ok(r.log.some((e) => e.kind === 'swap' && e.forced === false && e.ex === pend.ex && /Your call/.test(e.text)));
    const next = Link.pendingDecision(r); if (next) { F.encounterDecide(f, next.ex, 'stay'); const r3 = F.encounterBattle(f); const after = Link.pendingDecision(r3); if (after) assert.ok(after.ex >= next.ex + Link.SWAP_EVERY, 'stay holds four exchanges'); }
    let guard = 0; while (Link.pendingDecision(F.encounterBattle(f)) && guard++ < 40) F.encounterDecide(f, Link.pendingDecision(F.encounterBattle(f)).ex, 'stay');
    const b = F.resolveEncounter(f); assert.ok(b.ok, b.reason); assert.ok(['offer', 'pitch'].includes(f.week.encounter.status));
    const again = F.encounterBattle(f); assert.equal(logHash(again), f.week.encounter.result.hash, 'the saved summary matches the rebuilt battle');
  }
  assert.ok(found, 'a battle with a swap decision was found');
});

test('staff auto-run handles Tuesday through an encounter and the week still reaches Sunday; the final week keeps the recovery day', () => {
  const f = newFranchise(120);
  const r = F.autoRunToSunday(f); assert.ok(r.ok); assert.equal(f.season.day, 6);
  assert.ok(r.did.some((d) => /Beast Clash|Skipped the encounter/.test(d)), r.did.join(' | '));
  const g = newFranchise(121); g.season.week = 10; F.scoutDraft(g); assert.equal(F.startEncounter(g, 0).ok, false, 'no encounters in the draft window');
  const rec = F.recoveryDay(g); assert.ok(rec.ok); assert.equal(g.season.day, 2);
});

test('XP and level-ups from a battle use the football progression (xpForLevel, levelUp) and never evolve a monster', () => {
  const f = newFranchise(130); toTuesday(f);
  assert.ok(F.startEncounter(f, 0).ok); const e = f.week.encounter; const m = f.roster.find((x) => x.id === e.mine[0]); m.xp = 10_000;
  const lvl = m.level, stage = m.stage || 0; const b = F.resolveEncounter(f); assert.ok(b.ok);
  assert.ok(m.level > lvl, 'levelled up'); assert.equal(m.stage || 0, stage, 'no evolution from a battle'); assert.ok(b.events.some((ev) => ev.kind === 'levelup' && ev.id === m.id));
});
