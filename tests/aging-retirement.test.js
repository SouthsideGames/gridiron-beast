// Task 6 Phase A-1: ageing, age-adjusted training and retirement (GDD §55). Focused tests: the rules carry the approved values,
// costs and decline behave by position and age, legendary monsters are exempt, retirement leaves through the existing exits with
// the reason "retired", the old-save transition, determinism and the save round trip.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../src/data/aging.js';
import * as P from '../tools/task6/aging-proposal.mjs';
import { generateMonster, pointCost, spendPoint, levelUp, monsterOverall, effectiveCost, bankedPoints, syncFromDev } from '../src/data/monsters.js';
import { addBankedPoints } from '../src/franchise/t8/progression.js';
import * as FR from '../src/core/fraction.js';
import { offseason } from '../src/franchise/progression.js';
import { retirementPass, chanceFor, ensureAging, agingContext } from '../src/franchise/retirement.js';
import * as R from '../src/franchise/league-registry.js';
import * as Save from '../src/franchise/save.js';
import { createRng } from '../src/core/rng.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

const mon = (o = {}) => { const m = generateMonster(createRng(o.seed || 7), { position: o.position || 'RB', quality: 62, age: o.age ?? 25 }); return Object.assign(m, o.extra || {}); };

test('the game rules carry the approved planning values (curves, longevity, hazard, costs, transition)', () => {
  assert.deepEqual(A.CURVE, P.CURVE); assert.deepEqual(A.HAZARD, P.HAZARD); assert.deepEqual({ ...A.TRANSITION }, P.TRANSITION);
  for (const id of ['m_a', 'm_b', 'm_zz9', 'm_1o4bcod']) assert.equal(A.longevityOf(id), P.longevityOf(id));
  for (const y of [-4, -3, 0, 1, 3, 6]) assert.equal(A.retireChance(y, { starterNearPeak: true, injury: 'weeks4' }), P.retireChance(y, { starterNearPeak: true, injury: 'weeks4' }));
  for (const y of [0, 1, 2, 3, 4, 5, 8]) assert.equal(A.physicalCost(y), P.physicalCost(30 + y, 30));
  assert.equal(A.physLoss(3, 1.3), P.physLoss(3, 1.3)); assert.equal(A.techLoss(4), P.techLoss(4));
  const shares = [0, 0, 0, 0, 0, 0, 0]; for (let i = 0; i < 4000; i++) shares[A.longevityOf(`m_${i}`) + 3]++;
  assert.ok(Math.abs(shares[3] / 4000 - 0.30) < 0.03 && Math.abs(shares[0] / 4000 - 0.05) < 0.02, `longevity distribution ${shares}`);
});

test('age-adjusted training: physical points cost more past the public onset; ageless monsters never pay', () => {
  const young = mon({ age: 24 }); for (const k of A.PHYSICAL) assert.equal(pointCost(young, k), 1);
  const old = mon({ age: 33 }); old.durPeak = 60; // RB public onset 27: six seasons past it
  assert.equal(pointCost(old, 'speed'), 4); assert.equal(pointCost(old, 'awareness'), 2, 'technique too, past the technical onset (29)');
  // Task 8 training (spec §20-22): banked points are invested from m.dev.bank at C / E per +1 (E = 1 for a neutral Temper), with
  // partial progress carried; the old all-or-nothing "costs 4 points" refusal is superseded. An old RB still pays 4 per speed point.
  old.dev.temper = 'calm'; old.dev.current.speed = 40; old.dev.potential.speed = 90; old.dev.invest.speed = FR.ZERO; syncFromDev(old); // clear the veteran's prior progress (B7 history) assert.ok(FR.eq(effectiveCost(old, 'speed'), 4));
  addBankedPoints(old.dev, 3); let r = spendPoint(old, 'speed', { points: 3 }); assert.equal(r.ok, true); assert.equal(r.increases, 0, '3 points do not buy a +1 that costs 4');
  assert.equal(old.attributes.speed, 40); assert.ok(FR.eq(bankedPoints(old), 0));
  addBankedPoints(old.dev, 1); r = spendPoint(old, 'speed'); assert.equal(r.increases, 1, 'the 4th point completes it'); assert.equal(old.attributes.speed, 41); assert.ok(FR.eq(bankedPoints(old), 0));
  assert.match(spendPoint(old, 'speed').reason, /No training points/, 'nothing left to spend');
  old.dev.temper = 'swift'; assert.ok(FR.eq(effectiveCost(old, 'speed'), 2), 'a favoring Temper halves it (E = 2)');
  const legend = mon({ age: 40, extra: { legendary: true } }); assert.equal(pointCost(legend, 'speed'), 1);
  // level-ups (B6): natural growth only, no points, on a schedule age does not change (spec §161; decline is separate): the same
  // individual at 34 and at 24 grows identically, and a 34-year-old pays nothing extra at a level-up
  let gain = 0;
  for (let i = 0; i < 50; i++) { const y = generateMonster(createRng(100 + i), { position: 'RB', quality: 62, age: 20, yearsPro: 0 }); y.age = 24; const o = JSON.parse(JSON.stringify(y)); o.age = 34; o.durPeak = 60; /* a level-1 individual, aged by hand */ const b = { ...o.attributes }; const bank = bankedPoints(o);
    for (let l = 0; l < 10; l++) { levelUp(o, createRng(i)); levelUp(y, createRng(i)); } assert.deepEqual(o.attributes, y.attributes, 'age does not change level growth'); assert.ok(FR.eq(bankedPoints(o), bank), 'no points on level-up (B6)');
    gain += A.PHYSICAL.reduce((s, k) => s + o.attributes[k] - b[k], 0); }
  assert.ok(gain > 0, 'level-ups do grow physical ratings');
});

test('offseason decline: by position, physical before technical, increasing; no maturation growth; legendary monsters do not age', () => {
  // autoAllocate: false isolates decline from the 2 banked offseason points (the owner's club decides how to spend them)
  const run = (pos, age, id) => { const m = mon({ position: pos, age }); m.id = id; m.durPeak = 60; const before = { ...m.attributes }; offseason([m], createRng(3), { autoAllocate: false }); return { m, phys: A.PHYSICAL.reduce((s, k) => s + m.attributes[k] - before[k], 0), tech: ['awareness', 'catching'].reduce((s, k) => s + m.attributes[k] - before[k], 0) }; };
  const id = 'm_norm'; const lon = A.longevityOf(id);
  const rbEarly = run('RB', 27 + lon, id), rbLate = run('RB', 27 + lon + 4, id), qb = run('QB', 27 + lon, id);
  assert.ok(rbLate.phys < rbEarly.phys && rbLate.phys < -8, `RB decline grows past onset: ${rbEarly.phys} → ${rbLate.phys}`);
  assert.equal(qb.phys, 0, 'a QB of the same age is before his onset (30)');
  assert.equal(rbEarly.tech, 0, 'technique holds in the first season past the physical onset');
  // B7: the old growth-to-23 maturation is removed; a young monster banks the 2 offseason training points instead
  const kid = mon({ age: 21 }); const k0 = { ...kid.attributes }; const kb = bankedPoints(kid); offseason([kid], createRng(1), { autoAllocate: false });
  assert.deepEqual(kid.attributes, k0, 'no maturation increase'); assert.ok(FR.eq(bankedPoints(kid), FR.add(kb, 2)), '2 points banked');
  const legend = mon({ age: 38, extra: { legendary: true } }); const a0 = { ...legend.attributes }; const l0 = { ...legend.dev.loss }; offseason([legend], createRng(1), { autoAllocate: false }); assert.equal(legend.age, 38); assert.deepEqual(legend.attributes, a0); assert.deepEqual(legend.dev.loss, l0, 'nothing added to the decline ledger');
  // determinism and the transition's decline cap (s = 1: at most 2 seasons' worth)
  const a = run('WR', 36, 'm_det'), b = run('WR', 36, 'm_det'); assert.deepEqual(a.m.attributes, b.m.attributes);
  const capped = mon({ position: 'WR', age: 36 }); capped.id = 'm_det'; capped.durPeak = 60; const c0 = A.PHYSICAL.reduce((s, k) => s + capped.attributes[k], 0); offseason([capped], createRng(3), { s: 1, autoAllocate: false });
  assert.ok(c0 - A.PHYSICAL.reduce((s, k) => s + capped.attributes[k], 0) < -a.phys, 'transition caps the first offseason\'s decline');
});

test('retirement chance: the hazard at next season\'s age, one injury factor, unsigned double, the transition ramp', () => {
  const f = { roster: [] }; const m = mon({ position: 'RB', age: 30 }); m.id = 'm_norm'; m.durPeak = 60; m.peakOvr = monsterOverall(m);
  const y = 31 - (A.trueOnset(m) + 4);
  assert.equal(chanceFor(f, m, { year: 5, starter: true }), A.retireChance(y, { starterNearPeak: true }));
  assert.ok(chanceFor(f, m, { year: 5, unsigned: true }) > chanceFor(f, m, { year: 5, starter: false }));
  assert.ok(Math.abs(chanceFor(f, m, { year: 5, starter: false, s: 1 }) - A.retireChance(y, { ramp: 0.25 })) < 1e-12);
  const legacy = {}; ensureAging(legacy, 16); assert.deepEqual(legacy.aging, { v: 1, from: 16 }); assert.equal(A.transitionSeason(legacy, 18), 3);
  assert.equal(agingContext({}, 15).s, 1, 'an old save meets the decline first as transition season 1, without starting the clock');
});

test('retirement pass on a real league: exits with reason "retired", registry intact, legends kept, the owner told, protected never', () => {
  const f = newFranchise(11); f.season.finished = false;
  const clubs = R.leagueClubs(f); const club = clubs[0]; const roster = R.clubRoster(f, club);
  const old = roster.filter((m) => !R.isProtected(m)).slice(0, 3); for (const m of old) m.age = 45;
  const prot = roster.find((m) => R.isProtected(m)); if (prot) prot.age = 60;
  const mine = f.roster.find((m) => !R.isAgeless(m)); mine.age = 45; f.lineupManual = { QB: mine.id };
  const lines = []; const out = retirementPass(f, { next: () => 0.5 }, { year: 1, news: (t) => lines.push(typeof t === 'string' ? t : t.text) }); /* the notice is a saved line now (src/text/index.js): its sentence is `text` */ // a fixed draw of 0.5: a 45-year-old starter near his peak retires with about 82%, so all four go, while nobody with a retirement chance under 50% does; independent of the league's rosters (seed-picked draws broke whenever the creation draft changed)
  for (const m of old) { assert.ok(!R.clubRoster(f, club).some((x) => x.id === m.id), `${m.name} retired`); assert.ok(!f.league.monsters[m.id]); }
  assert.ok(out.league.length >= 3); if (prot) assert.ok(R.clubRoster(f, club).some((x) => x.id === prot.id), 'a protected monster never retires');
  assert.ok(!f.roster.some((x) => x.id === mine.id) && !f.lineupManual.QB, 'the owner\'s retiree leaves the roster and the lineup');
  assert.ok(f.league.legends[mine.id], 'a former owner monster keeps a legend stub'); assert.equal(mine.history.at(-1).reason, 'retired');
  assert.ok(lines.some((t) => t.includes(mine.name) && t.includes('retires')), 'the owner is told');
  assert.deepEqual(R.verifyLeague(f), [], 'registry intact');
  assert.equal(f.retirementsLast.owner.length, 1);
  const back = Save.importJson(Save.exportJson(f)); assert.deepEqual(back.aging, f.aging); assert.deepEqual(back.retirementsLast, f.retirementsLast);
});

test('ageless monsters bank offseason points visibly: the m.points mirror follows dev.bank when the trainer is off (M1 regression)', () => {
  const rng = createRng(41);
  const m = generateMonster(rng, { position: 'RB', quality: 60, species: 'boulderox', age: 26, yearsPro: 0 }); m.legendary = true;
  const before = FR.floor(bankedPoints(m));
  offseason([m], createRng(42), { autoAllocate: false });
  assert.equal(FR.floor(bankedPoints(m)), before + 2, 'two offseason points banked');
  assert.equal(m.points, FR.floor(bankedPoints(m)), 'the m.points mirror (notices, unspentPoints) matches the bank');
});
