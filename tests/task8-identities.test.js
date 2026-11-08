// Task 8 D7 (owner rulings N8a item 4 and N8b K / D7, 2026-11-08; docs/task8/AI_IDENTITIES.md approved as proposed): persistent AI
// club identities. A fixed offensive and defensive identity per AI club for the whole franchise; coaches may change; gyms keep the
// Compete floor and their element preference; the owner's club has none. An identity acts only through legal choices (play calling and
// playbook, lineup among legal options, acquisition tie-breaks, training order within the approved allocation), never a boost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { IDENTITIES, identityFor, clubIdentity, identityTilt, fitsIdentity, trainingPriority, lineupPreference, identityCoach, IDENTITY_TILT, LINEUP_FIT, COACH_CENTRE, COACH_SPREAD } from '../src/data/identities.js';
import { GYMS, GYM_BY_CLUB } from '../src/data/gyms.js';
import { ALL_TEAMS } from '../src/data/league.js';
import { PLAYS } from '../src/data/playbook.js';
import { canPlay, positionOf, OFFENSE_SLOTS, DEFENSE_SLOTS, POSITION_WEIGHTS } from '../src/data/personnel.js';
import { createRoster, generateMonster, monsterOverall, effectiveAttributes, FULL_ROSTER, schemeAttributes } from '../src/data/monsters.js';
import { playbookFor, buildDepthChart, buildTeam, AI_PLAN_SIZE } from '../src/franchise/roster.js';
import { aiDraftPick } from '../src/franchise/draft.js';
import { strategyValue } from '../src/franchise/fa-strategy.js';
import { identityTradeTie, IDENTITY_TRADE_TIE, GYM_ELEMENT_TRADE_TIE } from '../src/franchise/league-trades.js';
import { DEAL_RULES } from '../src/franchise/trade-value.js';
import { nextMode, MODES } from '../src/franchise/strategy.js';
import { allocateTraining, allocationWeight } from '../src/franchise/t8/career.js';
import { addBankedPoints } from '../src/franchise/t8/progression.js';
import { createRng } from '../src/core/rng.js';
import * as FR from '../src/core/fraction.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

// The approved tables (AI_IDENTITIES.md §3 strategy column read as schemes; §4 exactly).
const ORDINARY = { 'Ember City Beasts': ['pass', 'pressure'], 'Stonehaven Titans': ['run', 'coverage'], 'Glacier Guardians': ['balanced', 'coverage'], 'Stormport Bolts': ['pass', 'man'], 'Northstar Wolves': ['run', 'pressure'], 'Sundown Drakes': ['pass', 'coverage'], 'Ashford Hawks': ['balanced', 'man'], 'Bayou Stalkers': ['run', 'man'] };
const GYM_SCHEMES = { 'Harbor Sentinels': [null, 'coverage'], 'Sunfire Lions': ['pass', null], 'Thunder Mesa': ['pass', 'pressure'], 'Canyon Crushers': ['run', 'pressure'], 'Eastport Phantoms': [null, 'man'], 'Frostpeak Howlers': [null, 'coverage'], 'Ironpeak Rams': ['run', 'pressure'], 'Palmetto Vipers': ['pass', 'man'] };

test('the identity table: every club, the ordinary table exactly, the gyms\' strategies; derived from the name, no state', () => {
  assert.deepEqual(Object.keys(IDENTITIES).sort(), [...ALL_TEAMS].sort());
  for (const [club, [o, d]] of Object.entries(ORDINARY)) { const id = identityFor(club); assert.equal(id.offense, o, club); assert.equal(id.defense, d, club); assert.equal(id.gym, false); }
  for (const g of GYMS) {
    const id = identityFor(g.club); const [o, d] = GYM_SCHEMES[g.club]; assert.equal(id.gym, true);
    if (o) assert.equal(id.offense, o, `${g.club} offence from the approved strategy`); else assert.equal(id.offense, g.coach.offense, `${g.club}: no offence named, the gym coach's scheme`);
    if (d) assert.equal(id.defense, d, `${g.club} defence from the approved strategy`); else assert.equal(id.defense, g.coach.defense);
    assert.ok(id.positions.length > 0, `${g.club} names the positions its strategy needs`);
  }
  assert.deepEqual(identityFor('Harbor Sentinels').positions, ['CB', 'S'], 'Harbor: Water CBs and safeties (the table\'s example)');
  assert.ok(['RB', 'OL'].every((p) => identityFor('Canyon Crushers').positions.includes(p)), 'Canyon: OL and RBs (the table\'s example)');
  assert.deepEqual(identityFor('Stormport Bolts'), identityFor('Stormport Bolts'), 'pure: the same identity every call');
});

test('identities are fixed across seasons; ordinary coaches may change within the identity; gyms keep their named coach; the owner has none', () => {
  const f = newFranchise(71);
  assert.equal(clubIdentity(f, f.club), null, 'the owner\'s club has no identity'); assert.equal(F.aiCoach(f, f.club, 1).identity, undefined);
  assert.ok(STARTER(f.club), 'the owner runs an ordinary club');
  let varied = 0;
  for (const club of ALL_TEAMS.filter((c) => c !== f.club)) {
    const coaches = [1, 2, 3, 4, 5].map((y) => F.aiCoach(f, club, y)); const id = clubIdentity(f, club);
    for (const c of coaches) { assert.equal(c.identity.offense, id.offense, club); assert.equal(c.identity.defense, id.defense, club); }
    if (GYM_BY_CLUB[club]) { for (const c of coaches) { assert.equal(c.passBias, GYM_BY_CLUB[club].coach.passBias); assert.equal(c.aggression, GYM_BY_CLUB[club].coach.aggression); } continue; }
    for (const c of coaches) {
      assert.ok(Math.abs(c.passBias - COACH_CENTRE.passBias[id.offense]) <= COACH_SPREAD + 1e-9, `${club} pass bias centred on ${id.offense}`);
      assert.ok(Math.abs(c.aggression - COACH_CENTRE.aggression[id.defense]) <= COACH_SPREAD + 1e-9, `${club} aggression centred on ${id.defense}`);
    }
    if (new Set(coaches.map((c) => `${c.passBias}|${c.aggression}`)).size > 1) varied++;
  }
  assert.ok(varied >= 5, `ordinary coaches still change from season to season (${varied} of 7 varied)`);
  // the centres order the tendencies: every Air Raid coach throws more than every Ground Attack coach; every Blitz Heavy coach is more aggressive than every Zone Control one
  assert.ok(COACH_CENTRE.passBias.pass - COACH_SPREAD > COACH_CENTRE.passBias.run + COACH_SPREAD);
  assert.ok(COACH_CENTRE.aggression.pressure - COACH_SPREAD > COACH_CENTRE.aggression.coverage + COACH_SPREAD);
  for (let h = 0; h < 2000; h += 37) { const c = identityCoach(identityFor('Ember City Beasts'), h * 2654435761 >>> 0); assert.ok(c.passBias >= 0.25 && c.passBias <= 0.8 && c.aggression >= 0 && c.aggression <= 1); }
});
const STARTER = (club) => !GYM_BY_CLUB[club];

test('play calling: each identity\'s 6 + 6 leans to it, with released plays only', () => {
  const runs = { pass: 2, balanced: 3, run: 4 };
  for (const club of ALL_TEAMS) {
    const id = identityFor(club);
    for (let seed = 1; seed <= 25; seed++) {
      const coach = { passBias: 0.55, aggression: 0.5, identity: { offense: id.offense, defense: id.defense, passStyle: id.passStyle, runStyle: id.runStyle, runFront: id.runFront } };
      const pb = playbookFor(seed * 7919, coach);
      assert.equal(pb.offense.length, AI_PLAN_SIZE); assert.equal(pb.defense.length, AI_PLAN_SIZE); assert.equal(new Set(pb.offense).size, AI_PLAN_SIZE); assert.equal(new Set(pb.defense).size, AI_PLAN_SIZE);
      for (const p of [...pb.offense, ...pb.defense]) assert.ok(PLAYS[p], `${p} is a released play`);
      assert.ok(pb.offense.every((p) => PLAYS[p].side === 'offense') && pb.defense.every((p) => PLAYS[p].side === 'defense'));
      assert.equal(pb.offense.filter((p) => PLAYS[p].type === 'run').length, runs[id.offense], `${club}: ${id.offense} run count`);
      const tag = { pressure: 'blitz', man: 'man', coverage: 'zone' }[id.defense];
      assert.ok(pb.defense.filter((p) => PLAYS[p].tags.includes(tag)).length >= 3, `${club}: three or more ${tag} calls`);
      const SITUATIONAL = ['run_wall', 'edge_contain', 'bear_front', 'goal_line', 'goal_line_man', 'qb_spy']; // the old book's situational call
      assert.ok(pb.defense.filter((p) => SITUATIONAL.includes(p)).length >= (id.runFront ? 2 : 1), `${club}: the situational call kept (two for a run front)`);
    }
  }
  // the player's coach (no identity) keeps the old book unchanged
  const plain = { passBias: 0.6, aggression: 0.6 }; assert.deepEqual(playbookFor(1234, plain), playbookFor(1234, { ...plain }));
});

test('the lineup prefers a scheme fit only among position-legal monsters, within LINEUP_FIT; never benches a protected monster', () => {
  const id = identityFor('Stormport Bolts'); const prefer = lineupPreference(id);
  for (let seed = 1; seed <= 12; seed++) {
    const roster = createRoster(seed * 31, { quality: 56, composition: FULL_ROSTER });
    const plain = buildDepthChart(roster); const chart = buildDepthChart(roster, {}, null, { prefer });
    const byId = Object.fromEntries(roster.map((m) => [m.id, m]));
    const on = new Set(Object.values(chart).filter(Boolean));
    for (const [slot, mid] of Object.entries(chart)) {
      if (!mid) { assert.equal(plain[slot], null, `${slot}: empty only when it was empty before`); continue; }
      const m = byId[mid]; assert.ok(canPlay(m.position, slot), `${slot}: ${m.position} is legal there`);
      if (m.position !== positionOf(slot)) continue;
      for (const x of roster.filter((r) => r.position === m.position && !on.has(r.id) && !r.injury)) { // a bench monster at the position
        if (monsterOverall(x) <= monsterOverall(m)) continue;
        assert.ok(fitsIdentity(m, id) && !fitsIdentity(x, id), `${slot}: a better bench monster sits only behind a fit, and only when he is not one`);
        assert.ok(monsterOverall(x) - monsterOverall(m) <= LINEUP_FIT, `${slot}: and only within ${LINEUP_FIT} overall`);
      }
    }
    assert.equal(on.size, new Set(Object.values(plain).filter(Boolean)).size, 'the same number of slots filled');
    assert.equal(new Set(Object.values(chart).filter(Boolean)).size, Object.values(chart).filter(Boolean).length, 'nobody twice');
  }
  assert.equal(lineupPreference(null), null, 'no identity: no preference');
  assert.equal(prefer({ legendary: true, position: 'WR', attributes: {} }), LINEUP_FIT, 'a protected monster always counts as a fit');
});

test('draft: the identity tilt breaks a tie toward a scheme fit at an identity position; the owner\'s club gets none; a clearly better prospect still wins', () => {
  const rng = createRng(5); const wrs = []; for (let i = 0; i < 160; i++) { const m = generateMonster(rng, { position: 'WR', quality: i % 4 ? 56 : 66 }); m.potential = 75; wrs.push(m); }
  const id = identityFor('Stormport Bolts'); let pair = null;
  for (const a of wrs) { if (fitsIdentity(a, id)) continue; const b = wrs.find((x) => fitsIdentity(x, id) && monsterOverall(x) === monsterOverall(a)); if (b) { pair = [a, b]; break; } }
  assert.ok(pair, 'an equal-overall fit / non-fit pair exists');
  const [non, fit] = pair; const flat = { next: () => 0.5 }; // no draft noise
  const fOf = (club) => ({ club, draft: { class: [non, fit], available: [non.id, fit.id], picks: [] } });
  assert.equal(aiDraftPick(fOf('Ember City Beasts'), 'Stormport Bolts', flat).id, fit.id, 'the AI club takes the fit');
  assert.equal(aiDraftPick(fOf('Stormport Bolts'), 'Stormport Bolts', flat).id, non.id, 'the same club run by the owner: no tilt (class order decides the tie)');
  const better = wrs.find((x) => !fitsIdentity(x, id) && monsterOverall(x) >= monsterOverall(fit) + 2); assert.ok(better);
  const f3 = { club: 'Ember City Beasts', draft: { class: [better, fit], available: [better.id, fit.id], picks: [] } };
  assert.equal(aiDraftPick(f3, 'Stormport Bolts', flat).id, better.id, 'a prospect 2 overall points better is still taken');
  assert.equal(IDENTITY_TILT.position + IDENTITY_TILT.fit, 1.5, 'at most the R4 tie-break scale');
});

test('free agency and trades: the identity tilt is a tie-break on the existing weights; none for the owner\'s club', () => {
  const rng = createRng(9); const id = identityFor('Canyon Crushers');
  for (let i = 0; i < 60; i++) {
    const m = generateMonster(rng, { position: ['RB', 'OL', 'WR', 'CB'][i % 4], quality: 56 });
    for (const mode of MODES) {
      const base = strategyValue(m, { mode, ask: 50000 }); const tilted = strategyValue(m, { mode, ask: 50000, identity: id });
      assert.ok(Math.abs(tilted - base - identityTilt(id, m)) < 1e-9); assert.ok(tilted - base >= 0 && tilted - base <= 1.5);
    }
    assert.ok(identityTilt(id, m) === 0 || id.positions.includes(m.position) || fitsIdentity(m, id));
    const tie = identityTradeTie({ club: 'Ember City Beasts' }, 'Canyon Crushers', m); assert.ok(tie >= 0 && tie <= IDENTITY_TRADE_TIE);
  }
  assert.equal(identityTradeTie({ club: 'Ember City Beasts' }, 'Ember City Beasts', { position: 'WR' }), 0, 'the owner\'s club: none');
  assert.equal(IDENTITY_TRADE_TIE, GYM_ELEMENT_TRADE_TIE); assert.ok(IDENTITY_TRADE_TIE < DEAL_RULES.minGain / 2, 'well under the minimum deal gain');
});

test('training: the identity\'s attributes come first among the position\'s OVR attributes; never a non-approved attribute; the same points spent', () => {
  const rng = createRng(13);
  for (const club of ['Canyon Crushers', 'Stormport Bolts', 'Harbor Sentinels', 'Ember City Beasts']) {
    const pri = trainingPriority(identityFor(club));
    for (const pos of ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S']) {
      for (const a of pri[pos]) assert.ok(POSITION_WEIGHTS[pos][a] > 0, `${club} ${pos}: ${a} counts toward OVR`);
      for (let k = 0; k < 4; k++) {
        const m = generateMonster(rng, { position: pos, quality: 52 + k * 3 }); const d0 = JSON.parse(JSON.stringify(m.dev));
        const run = (first) => { const d = JSON.parse(JSON.stringify(d0)); d.bank = FR.ZERO; addBankedPoints(d, 3); const spent = allocateTraining(d, { ...m, dev: d }, { first }); return { d, spent }; };
        const plain = run(null), id = run(pri[pos]);
        const total = (s) => s.reduce((t, x) => FR.add(t, x.points), FR.ZERO);
        assert.equal(FR.toNumber(total(id.spent)), FR.toNumber(total(plain.spent)), 'the same banked points spent');
        for (const { attr } of id.spent) assert.ok(allocationWeight(id.d, pos, attr) > 0, `${attr} is an approved attribute at ${pos}`);
        // while an identity attribute has headroom, the next point goes to one
        const open = (d, a) => d.current[a] < d.potential[a];
        const firstSpent = id.spent[0]?.attr; if (firstSpent && pri[pos].some((a) => open(d0, a))) assert.ok(pri[pos].includes(firstSpent), `${club} ${pos}: first point on ${firstSpent}`);
        // a non-OVR attribute passed as "first" is ignored (never ranked first)
        const odd = run(['durability']); assert.deepEqual(odd.spent.map((x) => x.attr), plain.spent.map((x) => x.attr));
      }
    }
  }
  assert.deepEqual(schemeAttributes('pass', 'K'), [], 'a kicker has no scheme attributes');
});

test('gyms never fall below Compete; ordinary clubs cycle fully', () => {
  for (const raw of ['rebuild', 'retool']) {
    assert.equal(nextMode({ mode: 'compete', modeSince: 1 }, raw, 3, { gym: true }).mode, 'compete');
    assert.equal(nextMode(null, raw, 1, { gym: true }).mode, 'compete');
  }
  assert.equal(nextMode(null, 'rebuild', 1, { gym: false }).mode, 'rebuild');
});

test('Rookie lowers ordinary clubs only; gyms keep the standard level; Pro and All-Star unchanged', () => {
  assert.equal(F.difficultyQuality(F.DIFFICULTY.rookie, false), -4); assert.equal(F.difficultyQuality(F.DIFFICULTY.rookie, true), F.DIFFICULTY.pro.quality);
  for (const k of ['pro', 'allstar']) for (const gym of [true, false]) assert.equal(F.difficultyQuality(F.DIFFICULTY[k], gym), F.DIFFICULTY[k].quality);
  const f = newFranchise(72); const pro = (club) => F.clubQuality(f, club, 1);
  const before = Object.fromEntries(ALL_TEAMS.map((c) => [c, pro(c)])); f.settings.difficulty = 'rookie';
  for (const c of ALL_TEAMS) assert.equal(F.clubQuality(f, c, 1), before[c] + (GYM_BY_CLUB[c] ? 0 : -3), `${c} on Rookie`);
});

test('no boosts: an identity team plays its monsters\' own ratings, and building it changes nobody', () => {
  const f = newFranchise(73);
  for (const club of ALL_TEAMS.filter((c) => c !== f.club)) {
    const snap = () => JSON.stringify(f.league.clubs[club].roster.map((id) => f.league.monsters[id])); const before = snap();
    const team = F.aiTeam(f, club); const byId = Object.fromEntries(team.roster.map((m) => [m.id, m]));
    for (const slot of [...OFFENSE_SLOTS, ...DEFENSE_SLOTS]) { const m = byId[team.chart[slot]]; if (!m) continue; assert.deepEqual(team[OFFENSE_SLOTS.includes(slot) ? 'offense' : 'defense'][slot].attrs, effectiveAttributes(m, { slotPosition: positionOf(slot), trainingBonus: null }), `${club} ${slot}: the monster's own ratings`); }
    assert.equal(snap(), before, `${club}: building the team changed no monster`);
    assert.ok(team.coach.identity, `${club}: the coach carries the identity`);
    assert.deepEqual(Object.keys(team.coach).sort(), ['aggression', 'identity', 'iq', 'passBias'], 'tendencies only: no rating on the coach');
  }
});

test('a schema-10 preview save loads unchanged and its AI clubs take their identities with no migration', () => {
  const raw = fs.readFileSync(new URL('./fixtures/save-v10-season2.json', import.meta.url), 'utf8');
  const f = Save.importJson(raw); assert.equal(f.schemaVersion, 10);
  const snap = JSON.stringify(f);
  for (const club of ALL_TEAMS.filter((c) => c !== f.club)) { const t = F.aiTeam(f, club); assert.equal(t.coach.identity.offense, identityFor(club).offense); assert.equal(t.coach.identity.defense, identityFor(club).defense); }
  assert.equal(JSON.stringify(f), snap, 'nothing stored: identities derive from the club name');
  const again = Save.importJson(Save.exportJson(f)); assert.ok(again, 'round-trips');
});
