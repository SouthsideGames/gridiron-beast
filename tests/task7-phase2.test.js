// Task 7 Phase 2: shared data contracts and migration (owner-approved specification and decisions D1–D7, 2026-11-04).
import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateBonus, makeContract, capCharge, bonusCharge, contractSchedule, scheduleProblems, reservationFor, toStep, clampYears } from '../src/franchise/fa-contracts.js';
import { legendSide, legendCheck, overLimit } from '../src/franchise/fa-legendary.js';
import { personaOf, responseWindow, careerStage } from '../src/franchise/fa-personality.js';
import { initFreeAgency, repairLineups, noteSigned, noteReleased, noteTraded, tradeLock, returnLock } from '../src/franchise/fa-state.js';
import { canPlay, SECONDARY_ELIGIBILITY } from '../src/data/personnel.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { generateMonster, pickSpeciesForPosition, SPECIES_BY_ID, salaryFor } from '../src/data/monsters.js';
import { offseason } from '../src/franchise/progression.js';
import { createRng } from '../src/core/rng.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

test('bonus allocation: integer years, remainder one credit at a time to the earliest years, always summing to the bonus', () => {
  assert.deepEqual(allocateBonus(100, 3), [34, 33, 33]);
  assert.deepEqual(allocateBonus(200, 3), [67, 67, 66]);
  assert.deepEqual(allocateBonus(300, 3), [100, 100, 100]);
  assert.deepEqual(allocateBonus(0, 2), [0, 0]);
  for (let b = 0; b <= 5000; b += 100) for (const y of [1, 2, 3]) { const a = allocateBonus(b, y); assert.equal(a.reduce((s, x) => s + x, 0), b); assert.equal(a.length, y); assert.ok(a.every((x, i) => Number.isInteger(x) && (i === 0 || x <= a[i - 1]))); }
  assert.equal(toStep(12345), 12300); assert.equal(toStep(12350), 12400); assert.equal(clampYears(5), 3); assert.equal(clampYears(0), 1);
});

test('contracts: schedule, cap charge by year, extension follows without overlap, reservation = salary + first-year allocation', () => {
  const m = { id: 'x', salary: 40000, contract: makeContract({ start: 3, years: 3, salary: 40000, bonus: 10000 }) };
  assert.deepEqual(scheduleProblems(m.contract), []);
  assert.deepEqual(contractSchedule(m, 3).map((r) => r.total), [43334, 43333, 43333]);
  assert.equal(capCharge(m, 2), 0); assert.equal(capCharge(m, 3), 43334); assert.equal(capCharge(m, 6), 0); assert.equal(bonusCharge(m, 4), 3333);
  m.contract.next = makeContract({ start: 6, years: 2, salary: 45000, bonus: 0 });
  assert.deepEqual(scheduleProblems(m.contract), []); assert.equal(capCharge(m, 7), 45000);
  m.contract.next.signed = 5; assert.ok(scheduleProblems(m.contract).length, 'an overlapping extension is a problem');
  assert.equal(reservationFor({ salary: 40000, years: 3, bonus: 10000 }), 43334);
  // a pre-Task-7 contract keeps its salary exactly and charges it in the current year
  const old = { salary: 37260, contract: { signed: 1, ends: 2, years: 2 } };
  assert.equal(capCharge(old, 2, { current: true }), 37260); assert.equal(bonusCharge(old, 2), 0);
});

test('negotiated salary survives ageing and development; only unsigned and protected permanent deals carry the market figure', () => {
  const r = createRng(4);
  const signed = generateMonster(r, { position: 'WR', quality: 60, age: 24 }); signed.salary = 12300; signed.contract = makeContract({ start: 1, years: 3, salary: 12300 });
  const unsigned = generateMonster(r, { position: 'WR', quality: 60, age: 24 }); unsigned.contract = null; unsigned.salary = 1;
  offseason([signed, unsigned], createRng(9));
  assert.equal(signed.salary, 12300, 'contracted salary kept');
  assert.equal(unsigned.salary, salaryFor(unsigned), 'unsigned: market figure');
});

test('one position per monster: species have no secondary, eligibility is the position group only, generation is primary-only', () => {
  assert.ok(SPECIES_DEX.every((s) => s.secondary === undefined), 'no species carries a secondary position');
  assert.ok(Object.values(SECONDARY_ELIGIBILITY).every((v) => v.length === 0));
  assert.equal(canPlay('WR', 'WR3'), true); assert.equal(canPlay('WR', 'TE'), false); assert.equal(canPlay('DL', 'LB2'), false); assert.equal(canPlay('S', 'CB1'), false);
  const r = createRng(17);
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']) for (let i = 0; i < 60; i++) {
    const sp = pickSpeciesForPosition(r, pos); assert.equal(sp.position, pos);
    const m = generateMonster(r, { position: pos, quality: 55 }); assert.equal(m.position, SPECIES_BY_ID[m.species].position);
  }
  // a requested position never overrides the species' one position
  const qb = SPECIES_DEX.find((s) => s.position === 'QB' && s.rarity !== 'legendary');
  assert.equal(generateMonster(r, { position: 'WR', quality: 55, species: qb.id }).position, 'QB');
});

test('a new franchise and its league: every monster at his species position', () => {
  const f = newFranchise(5);
  const all = [...f.roster, ...Object.values(f.league.monsters)];
  assert.ok(all.length > 500);
  assert.deepEqual(all.filter((m) => m.position !== SPECIES_BY_ID[m.species]?.position).map((m) => `${m.name} ${m.position}`), []);
  assert.equal(f.schemaVersion, 9); assert.equal(f.freeAgency.activeFrom, 1);
});

test('lineup repair: entries that put a monster in another position are removed, nobody is released or changed', () => {
  const f = { roster: [{ id: 'a', name: 'A', position: 'WR' }, { id: 'b', name: 'B', position: 'TE' }, { id: 'c', name: 'C', position: 'DL' }], lineupManual: { TE: 'a', WR1: 'a', LB2: 'c' }, depth: { WR: ['a', 'b'], DL: ['c'] } };
  const before = JSON.stringify(f.roster);
  const r = repairLineups(f);
  assert.deepEqual(f.lineupManual, { WR1: 'a' }); assert.deepEqual(f.depth, { WR: ['a'], DL: ['c'] });
  assert.equal(r.manual, 2); assert.equal(r.depth, 1); assert.equal(JSON.stringify(f.roster), before);
  assert.deepEqual(repairLineups(f), { manual: 0, depth: 0, removed: [] }, 'idempotent');
});

test('legendary limit: side from the species position, one offensive and one defensive, conditional replacement, protected blocks', () => {
  const leg = (id, species, extra = {}) => ({ id, name: id, species, position: SPECIES_BY_ID[species].position, ...extra });
  assert.equal(legendSide(leg('a', 'stormcrown')), 'offense'); assert.equal(legendSide(leg('b', 'tsunarok')), 'defense');
  assert.equal(legendSide({ ...leg('c', 'tempestra'), position: 'CB' }), 'offense', 'side fixed by species, not the live position');
  assert.equal(legendSide({ id: 'n', species: SPECIES_DEX.find((s) => s.rarity === 'common').id }), null);
  assert.ok(!SPECIES_DEX.some((s) => s.rarity === 'legendary' && s.position === 'K'), 'no legendary kicker');
  const roster = [leg('a', 'stormcrown')];
  assert.equal(legendCheck(roster, leg('d', 'tsunarok')).ok, true, 'a defensive one fits');
  const second = legendCheck(roster, leg('e', 'aurelion')); assert.equal(second.ok, true); assert.equal(second.conditional, true); assert.deepEqual(second.replace, ['a'], 'replacement may be negotiated');
  assert.equal(legendCheck(roster, leg('e', 'aurelion'), { final: true }).ok, false, 'but not finalised while the other is there');
  assert.equal(legendCheck([leg('g', 'aurelion', { legendary: true })], leg('e', 'stormcrown')).ok, false, 'a protected gym legendary blocks the side');
  assert.deepEqual(overLimit([leg('a', 'stormcrown'), leg('e', 'aurelion'), leg('d', 'tsunarok')]), { offense: 1, defense: 0 });
});

test('personality: deterministic, 0–100, evolving with career stage; response window 1–3', () => {
  const m = { id: 'm_abc', nature: 'calm', position: 'WR', age: 22 };
  assert.deepEqual(personaOf(m), personaOf({ ...m }));
  assert.equal(careerStage(m), 'rising'); assert.equal(careerStage({ ...m, age: 33 }), 'veteran');
  const young = personaOf(m), old = personaOf({ ...m, age: 33 });
  assert.ok(old.winning > young.winning && old.security > young.security && young.role > old.role);
  for (let i = 0; i < 200; i++) { const p = personaOf({ id: `m_${i}`, nature: 'aggressive', position: 'QB', age: 20 + (i % 14) }); for (const k of ['money', 'security', 'role', 'winning', 'patience', 'timing']) assert.ok(p[k] >= 0 && p[k] <= 100); assert.ok([1, 2, 3].includes(responseWindow({ id: `m_${i}`, nature: 'calm', position: 'QB', age: 25 }))); }
});

test('activation (D3): new franchise at once; a save opened in season at this offseason; one opened in an offseason at the next', () => {
  assert.equal(initFreeAgency({ season: { year: 1, finished: false } }, { fresh: true }).activeFrom, 1);
  const inSeason = initFreeAgency({ season: { year: 4, week: 6, finished: false }, roster: [] }); assert.equal(inSeason.activeFrom, 4); assert.equal(inSeason.complianceFrom, 5);
  const offs = initFreeAgency({ season: { year: 4, week: 14, finished: true }, roster: [] }); assert.equal(offs.activeFrom, 5); assert.equal(offs.complianceFrom, 6);
});

test('transaction locks (resolution 6): signed free agents until the next offseason; no release and re-sign or return in the league year', () => {
  const f = { season: { year: 2, finished: false }, freeAgency: initFreeAgency({ season: { year: 2 } }, { fresh: true }) };
  const m = { id: 'q', name: 'Q' };
  noteSigned(f, m); assert.ok(tradeLock(f, m));
  f.season.finished = true; assert.equal(tradeLock(f, m), null, 'the next offseason unlocks him');
  noteReleased(f, m, 'Club A'); assert.ok(returnLock(f, m, 'Club A')); assert.equal(returnLock(f, m, 'Club B'), null);
  noteTraded(f, { id: 'z', name: 'Z' }, 'Club C'); assert.ok(returnLock(f, { id: 'z', name: 'Z' }, 'Club C'));
  f.freeAgency.leagueYear = 3; assert.equal(returnLock(f, m, 'Club A'), null, 'a new league year lifts it');
});
