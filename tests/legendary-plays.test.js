// Legendary Plays pilot (GDD §36): the six plays, discovery, the six-slot plan, availability, execution, the AI, saves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS, LEGENDARY_IDS, LESSONS, validatePlaybook } from '../src/data/playbook.js';
import { SPECIES_BY_ID, generateMonster } from '../src/data/monsters.js';
import { canPlay, positionOf } from '../src/data/personnel.js';
import { createRng } from '../src/core/rng.js';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import * as R from '../src/sim/rules.js';
import { playGame } from '../src/sim/game-runner.js';
import { weighOffense } from '../src/sim/coach-ai.js';
import { legendaryStatus, unannouncedLegendary, equipLegendaryForAI } from '../src/franchise/legendary.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

test('six pilot plays: three offence, three defence, each built on a real Legendary who can play its slot; valid, with lessons, outside the standard pools', () => {
  assert.equal(LEGENDARY_IDS.length, 6);
  assert.equal(LEGENDARY_IDS.filter((id) => PLAYS[id].side === 'offense').length, 3);
  const species = new Set();
  for (const id of LEGENDARY_IDS) {
    const p = PLAYS[id]; const L = p.legendary; const sp = SPECIES_BY_ID[L.species];
    assert.ok(sp && sp.rarity === 'legendary', `${id}: ${L.species} is a defined Legendary`); assert.ok(!species.has(L.species)); species.add(L.species);
    assert.ok(p.onField.includes(L.slot), `${id}: slot on the field`); assert.ok(canPlay(sp.position, L.slot), `${sp.name} (${sp.position}) can play ${L.slot}`);
    assert.ok(p.tags.includes('legendary')); assert.ok(LESSONS[id]?.beats && LESSONS[id]?.loses, `${id}: strengths and weaknesses`);
    assert.ok(!OFFENSE_IDS.includes(id) && !DEFENSE_IDS.includes(id), 'never in a standard pool');
  }
  assert.deepEqual(validatePlaybook().filter((x) => LEGENDARY_IDS.some((id) => x.startsWith(PLAYS[id].name))), []);
});

const legend = (f, sp) => { const m = generateMonster(createRng(99), { position: SPECIES_BY_ID[sp].position, quality: 64, species: sp }); m.salary = 50000; m.contract = { signed: f.season.year, ends: f.season.year + 1 }; f.roster.push(m); return m; };
const toFriday = (f) => { let g = 0; while (f.season.day < 4 && g++ < 12) { const r = F.autoRunToSunday(f); if (f.season.day >= 4) break; if (!r.ok) break; } };

test('discovery: the play is discovered when its Legendary joins, announced once, and never added to the plan by itself', () => {
  const f = newFranchise(41); const plan = JSON.stringify(F.startingPlan(f, 'offense'));
  assert.equal(legendaryStatus(f, 'lp_eye_of_the_storm').discovered, false);
  assert.equal(F.legendaryAvailable(f, 'offense').length, 0);
  const m = legend(f, 'tempestra'); const r = F.syncLegendary(f);
  assert.deepEqual(r.discovered, ['lp_eye_of_the_storm']); assert.equal(f.legendaryPlays.discovered.lp_eye_of_the_storm.monster, m.name);
  assert.ok(f.news.some((n) => /LEGENDARY PLAY DISCOVERED/.test(n.text)));
  assert.deepEqual(unannouncedLegendary(f), ['lp_eye_of_the_storm']);
  assert.deepEqual(F.syncLegendary(f).discovered, [], 'idempotent');
  assert.equal(JSON.stringify(F.startingPlan(f, 'offense')), plan, 'the plan is the owner\'s decision');
  assert.ok(!F.catalog(f, 'offense').includes('lp_eye_of_the_storm') && !F.defaultPlan(f, 'offense').includes('lp_eye_of_the_storm'), 'the coordinator never auto-picks it');
  assert.deepEqual(F.legendaryAvailable(f, 'offense'), ['lp_eye_of_the_storm']);
});

test('plan slots: a Legendary Play takes one of the six, never a seventh; out when the monster leaves or is hurt, back when he returns; discovery stays', () => {
  const f = newFranchise(42); const m = legend(f, 'aurodrax'); F.syncLegendary(f);
  const o = F.startingPlan(f, 'offense'), d = F.startingPlan(f, 'defense');
  assert.equal(F.setGamePlan(f, [...o, 'lp_dragons_gambit'], d).ok, false, 'seven plays is too many');
  assert.ok(F.setGamePlan(f, [...o.slice(0, 5), 'lp_dragons_gambit'], d).ok); assert.equal(f.week.plan.offense.length, F.PLAN_SIZE);
  const team = F.playerTeam(f); assert.ok(team.offensePlays.includes('lp_dragons_gambit'));
  m.injury = { type: 'sprain', severity: 'minor', weeks: 2 };
  assert.equal(legendaryStatus(f, 'lp_dragons_gambit').available, false); assert.match(legendaryStatus(f, 'lp_dragons_gambit').reason, /injured/);
  assert.ok(!F.playerTeam(f).offensePlays.includes('lp_dragons_gambit'), 'a hurt Legendary\'s play never reaches a usable slot');
  assert.equal(F.playerTeam(f).offensePlays.length, F.PLAN_SIZE, 'the coordinator\'s pick fills the slot');
  const sync = F.syncLegendary(f); assert.deepEqual(sync.removed, ['lp_dragons_gambit']); assert.ok(!f.week.plan.offense.includes('lp_dragons_gambit')); assert.equal(f.week.plan.offense.length, F.PLAN_SIZE);
  assert.equal(F.setGamePlan(f, [...o.slice(0, 5), 'lp_dragons_gambit'], d).ok, false, 'cannot be equipped while unavailable');
  m.injury = null; assert.ok(F.setGamePlan(f, [...o.slice(0, 5), 'lp_dragons_gambit'], d).ok, 'healthy again: eligible again');
  f.roster = f.roster.filter((x) => x.id !== m.id); F.syncLegendary(f);
  assert.ok(!f.week.plan.offense.includes('lp_dragons_gambit') && !f.lastPlan.offense.includes('lp_dragons_gambit'));
  assert.equal(legendaryStatus(f, 'lp_dragons_gambit').discovered, true, 'discovery is permanent'); assert.match(legendaryStatus(f, 'lp_dragons_gambit').reason, /no longer on your roster/);
  f.roster.push(m); assert.ok(legendaryStatus(f, 'lp_dragons_gambit').available, 're-acquired: available again');
});

test('execution: the Legendary takes the play\'s slot for the snap (from another slot or the bench) and the play runs', () => {
  const f = newFranchise(43); const m = legend(f, 'tempestra'); F.syncLegendary(f);
  const o = F.startingPlan(f, 'offense'), d = F.startingPlan(f, 'defense'); F.setGamePlan(f, [...o.slice(0, 5), 'lp_eye_of_the_storm'], d);
  const me = F.playerTeam(f); const them = F.aiTeam(f, F.opponentName(f) || 'Ashford Hawks');
  const s = R.newGame({ home: me, away: them, seed: 3 }); s.phase = 'scrimmage'; s.possession = 'home';
  for (let k = 0; k < 8; k++) {
    if (s.phase !== 'scrimmage' || s.finished) break; if (s.possession !== 'home') s.possession = 'home';
    const { sim } = R.runScrimmagePlay(s, { home: me, away: them }, 'lp_eye_of_the_storm', DEFENSE_IDS[k]);
    assert.equal(sim.names.off.WR1, m.name, 'Tempestra plays WR1 on her play');
  }
  const out = R.pickSlots(me.offense, PLAYS.lp_eye_of_the_storm.onField, me, PLAYS.lp_eye_of_the_storm);
  assert.equal(out.WR1.id, m.id); assert.equal(new Set(Object.values(out).map((p) => p.id)).size, PLAYS.lp_eye_of_the_storm.onField.length, 'nobody twice');
  const swapped = { ...me.offense, WR1: me.offense.WR2, WR2: me.offense.WR1 }; const out2 = R.pickSlots(swapped, PLAYS.lp_eye_of_the_storm.onField, me, PLAYS.lp_eye_of_the_storm);
  assert.equal(out2.WR1.id, m.id, 'moved from WR2 to WR1'); assert.equal(new Set(Object.values(out2).map((p) => p.id)).size, out2 && Object.keys(out2).length);
});

test('AI: a club holding a Legendary equips its play in one of its six and calls it in fitting situations', () => {
  const f = newFranchise(44); let found = 0;
  for (const club of ['Palmetto Vipers', 'Canyon Crushers', 'Eastport Phantoms', 'Frostpeak Howlers']) {
    const t = F.aiTeam(f, club); const lp = LEGENDARY_IDS.find((id) => t.roster.some((m) => m.species === PLAYS[id].legendary.species && !m.injury));
    if (!lp) continue; found++;
    const key = PLAYS[lp].side === 'offense' ? 'offensePlays' : 'defensePlays'; assert.ok(t[key].includes(lp), `${club} equips ${lp}`); assert.equal(t[key].length, 6);
  }
  assert.ok(found >= 2, `${found} gym clubs with a pilot Legendary`);
  const t = F.aiTeam(f, 'Palmetto Vipers'); const opp = F.aiTeam(f, 'Ashford Hawks');
  if (t.offensePlays.includes('lp_dragons_gambit')) {
    let calls = 0; playGame({ home: t, away: opp, seed: 9, onStep: (ev) => { if (ev?.offensePlayId === 'lp_dragons_gambit') calls++; } });
    assert.ok(calls > 0, 'the AI calls it during a game');
    const st = { down: 1, toGo: 10, ballOn: 40, score: { home: 0, away: 0 }, possession: 'home', quarter: 1, clock: 180, quarterLength: 180, timeouts: { home: 3, away: 3 } };
    assert.ok(Object.fromEntries(weighOffense(st, t, t.offensePlays, null))['lp_dragons_gambit'] > 0);
  }
  // equipLegendaryForAI leaves clubs without a Legendary untouched and never equips a hurt one
  const plain = { roster: [], offensePlays: ['a'], defensePlays: ['b'] }; assert.deepEqual(equipLegendaryForAI(plain).offensePlays, ['a']);
});

test('saves keep discovery, announcements and an equipped Legendary Play; older saves without the field load', () => {
  const f = newFranchise(45); legend(f, 'nyxshade'); F.syncLegendary(f);
  const o = F.startingPlan(f, 'offense'), d = F.startingPlan(f, 'defense'); assert.ok(F.setGamePlan(f, o, [...d.slice(0, 5), 'lp_phantom_coverage']).ok);
  const back = Save.importJson(Save.exportJson(f)); assert.ok(back.legendaryPlays.discovered.lp_phantom_coverage); assert.ok(back.week.plan.defense.includes('lp_phantom_coverage'));
  assert.ok(F.playerTeam(back).defensePlays.includes('lp_phantom_coverage'));
  const old = newFranchise(46); delete old.legendaryPlays; const b2 = Save.importJson(Save.exportJson(old)); assert.ok(b2); assert.doesNotThrow(() => F.syncLegendary(b2));
});
