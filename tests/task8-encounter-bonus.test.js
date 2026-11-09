// Task 8 owner ruling N7g (2026-11-07 15:08): the Basic scouting encounter XP bonus. Winning an encounter whose recruitable target
// is a Basic adds 25% level XP for every eligible participant (normal participation rules), whether or not he is recruited. Basic
// companions alone never activate it. No bonus to training progress or mastery. Once per encounter through the reward ledger.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import { battleXp } from '../src/clash/index.js';
import { applyBattleEffects } from '../src/franchise/clash-link.js';
import { generateMonster, monsterOverall } from '../src/data/monsters.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { createRng } from '../src/core/rng.js';
import { exportJson, importJson } from '../src/franchise/save.js';
import { approvedRule } from '../src/data/beast-dex.js';
import * as FR from '../src/core/fraction.js';
import { settleHeadless } from '../src/franchise/clash-link.js';
// Task 8 M4 (D1): a Watch battle stops at the player's rotation prompt. These tests stand in for an owner who answers the first prompt
// with "Auto for the rest of this battle" (an approved option), so the battle runs to its end; the assertions are unchanged.
const AUTO = { headless: true };
const settledBattle = (f) => settleHeadless(f.week.encounter, () => F.encounterBattle(f)); // the game's own Auto settlement (D1)

const ready = (seed) => { const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', seed }); F.hireDefaultStaff(f); while (F.creationDraftPending(f) && F.onTheClock(f) === f.club) F.passDraftPick(f); f.settings.tutorial = false; f.welcomed = true; F.chooseGoal(f, 'wins'); F.scoutRegion(f, 'Coral Coast'); return f; };
const basicAt = (pos) => SPECIES_DEX.find((s) => s.rarity === 'basic' && s.position === pos);
/** The first prospect replaced by a weak level-1 Basic (or an ordinary family), so the club wins. */
function withTarget(seed, { basic = true } = {}) {
  const f = ready(seed); const p = f.week.prospects[0];
  const sp = basic ? basicAt(p.monster.position) : SPECIES_DEX.find((s) => s.rarity === 'common' && s.position === p.monster.position);
  const m = generateMonster(createRng(seed), { species: sp.id, quality: 40, age: 20, yearsPro: 0, id: p.monster.id }); p.monster = m;
  return f;
}
function wonEncounter(opts) {
  for (let seed = 1; seed < 40; seed++) {
    const f = withTarget(seed, opts); if (!F.startEncounter(f, 0).ok) continue;
    const result = settledBattle(f); if (result.winner !== 'a') continue;
    return { f, result, seed };
  }
  throw new Error('no won encounter found');
}

test('the bonus is an approved shared encounter rule: 25%, active only for a Basic recruitable target, never a companion', () => {
  assert.equal(approvedRule('basic-encounter-xp-bonus').values.levelXpBonusPct, 25);
  const b = basicAt('RB'); const c = SPECIES_DEX.find((s) => s.rarity === 'common' && s.position === 'RB');
  assert.equal(F.basicEncounterBonus({ species: b.id }).active, true);
  assert.equal(F.basicEncounterBonus({ species: c.id }).active, false);
  assert.equal(F.basicEncounterBonus({ species: b.id, companion: true }).active, false, 'a Basic companion alone never activates it');
  const f = withTarget(3); const pv = F.encounterPreview(f, 0); assert.ok(pv.ok); assert.equal(pv.basicBonus.active, true); assert.match(pv.basicBonus.label, /\+25% level XP/);
  const g = withTarget(3, { basic: false }); const pg = F.encounterPreview(g, 0);
  assert.equal(pg.basicBonus.active, false, 'an ordinary target: no bonus, whatever the companions are');
});

test('a won Basic encounter adds 25% level XP to every participant, recruited or not; training banks and mastery get nothing', () => {
  const { f, result } = wonEncounter();
  const xp = battleXp(result, 'a'); const tot = (m) => FR.toNumber(m.dev.bank) + FR.toNumber(m.dev.bar); const banks = Object.fromEntries(f.roster.map((m) => [m.id, tot(m)])); const inLine = new Set(result.lines.a.map((x) => x.combatant.monsterId));
  const r = F.resolveEncounter(f, AUTO); assert.ok(r.ok && r.won);
  const rows = r.events.filter((e) => e.kind === 'xp'); assert.ok(rows.length >= 1);
  for (const x of result.lines.a) {
    const row = rows.find((e) => e.id === x.combatant.monsterId); assert.ok(row, 'every participant is awarded');
    // M2: the approved Clash award is 25 level XP and 25% of a training bar for every selected lineup member (spec §6); the bonus is +25% of the level XP only
    assert.equal(row.training, 0.25, 'training progress is the standard award, never boosted');
    if (row.max) { assert.equal(row.amount, 0); continue; }
    assert.equal(row.base, 25); assert.equal(row.bonus, 6.25); assert.equal(row.amount, 31.25); assert.ok(xp[x.id] != null);
    assert.match(row.bonusLabel, /Basic encounter bonus/);
  }
  assert.deepEqual(f.week.encounter.bonus, { pct: 25, label: F.basicEncounterBonus({ species: basicAt('RB').id }).label });
  for (const m of f.roster) assert.equal(tot(m), banks[m.id] + (inLine.has(m.id) ? 0.25 : 0), `${m.name}: training progress is the standard 25%, not boosted`);
  assert.ok(F.declineOffer(f).ok, 'letting him go keeps the bonus already awarded');
});

test('no bonus for an ordinary target, and none on a loss', () => {
  const { f } = wonEncounter({ basic: false }); const r = F.resolveEncounter(f, AUTO);
  assert.ok(r.events.filter((e) => e.kind === 'xp').every((e) => e.bonus === 0 && (e.max || e.amount === 25))); assert.equal(f.week.encounter.bonus, null);
  for (let seed = 1; seed < 40; seed++) {
    const g = withTarget(seed); for (const m of g.roster) for (const k of Object.keys(m.attributes)) m.attributes[k] = 1; // a club that cannot win
    if (!F.startEncounter(g, 0).ok || settledBattle(g).winner === 'a') continue;
    const lost = F.resolveEncounter(g, AUTO); assert.equal(lost.won, false); assert.equal(g.week.encounter.bonus, null);
    assert.ok(lost.events.filter((e) => e.kind === 'xp').every((e) => e.bonus === 0), 'a lost Basic encounter earns no bonus'); return;
  }
  assert.fail('no lost encounter found to check');
});

test('once per encounter through the reward ledger: a second resolve, a reload or a re-application awards nothing more', () => {
  const { f, result } = wonEncounter();
  const r = F.resolveEncounter(f, AUTO); const id = `encounter:${f.season.year}:w${f.season.week}:p0`;
  assert.equal(f.rewardLedger.activities[id]?.complete, true);
  const snapshot = JSON.stringify(f.roster.map((m) => [m.id, m.xp, m.level]));
  assert.equal(F.resolveEncounter(f, AUTO).already, true);
  const again = applyBattleEffects(f.roster, result, 'a', 'encounter', createRng(1), { bonusPct: 25, ledger: f.rewardLedger, activityId: id });
  assert.deepEqual(again, [], 'the ledger refuses a replayed award'); assert.equal(JSON.stringify(f.roster.map((m) => [m.id, m.xp, m.level])), snapshot);
  const back = importJson(exportJson(f)); assert.equal(back.rewardLedger.activities[id]?.complete, true, 'the ledger survives a reload');
  assert.equal(F.resolveEncounter(back, AUTO).already, true); assert.equal(JSON.stringify(back.roster.map((m) => [m.id, m.xp, m.level])), snapshot);
  assert.ok(r.events.some((e) => e.bonus > 0) || r.events.every((e) => e.base === 0));
  assert.ok(monsterOverall(f.roster[0]) > 0);
});
