// Task 8 M4 S1: the t8 Clash core model and normal-turn clock. One active fighter per side, inert reserves, the P6/B3 exchange
// skeleton, initiative tiers, per-combatant normal-turn clocks, KO replacement by line order (provisional, D2), the no-contract
// action (ordinary attack plus archetype perks, Dex archetypes) and determinism (log-independent draws).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { simulateClashT8, t8LogHash, parseT8ReplayKey, buildT8Combatant, T8_VALUES, T8_PROVISIONAL, addClock, tickClocks, clearClocks, roundHalfUp } from '../../src/clash/t8/index.js';
import { simulateByRuleset } from '../../src/clash/rulesets.js';
import { buildCombatant, archetypeOf as legacyArchetypeOf } from '../../src/clash/stats.js';
import { battleConfig } from '../../src/clash/values.js';
import { typeFactor } from '../../src/clash/types.js';
import { rampFor } from '../../src/clash/engine.js';
import { archetypeOf as dexArchetypeOf, FAMILIES } from '../../src/data/beast-dex.js';
import { SPECIES_DEX } from '../../src/data/species.js';
import { createRng } from '../../src/core/rng.js';
import { mon, randomLineup, withoutRandomness, deepFrozen } from './helpers.js';

const ALL = SPECIES_DEX.map((s) => s.id);
const BASICS = SPECIES_DEX.filter((s) => s.rarity === 'basic').map((s) => s.id);
const run = (a, b, seed = 1, extra = {}) => simulateClashT8({ a, b, seed, ...extra });
const battles = (n, seed0, sizes = [1, 2, 3, 4, 5], pool = ALL) => { const rng = createRng(seed0); return Array.from({ length: n }, (_, i) => { const k = sizes[i % sizes.length]; return { a: randomLineup(rng, k, pool), b: randomLineup(rng, k, pool), seed: i + 1 }; }); };

// ---------------------------------------------------------------- combatants: archetype from the Dex
test('t8 combatant: archetype is the Dex clashArchetype for all 192 families; HP/ATK/SPD use the approved formula (equal to legacy wherever the archetype agrees)', () => {
  assert.equal(ALL.length, 192); let differ = 0;
  for (const id of ALL) {
    const m = mon(id, 7); const c = buildT8Combatant(m);
    assert.equal(c.archetype, dexArchetypeOf(id), id); assert.equal(c.contract, null, `${id} has no contract in S1`);
    assert.equal(c.basic, SPECIES_DEX.find((s) => s.id === id).rarity === 'basic');
    const L = buildCombatant(m, { config: battleConfig({}) });
    if (L.archetype === c.archetype) { assert.equal(c.hp, L.hp, id); assert.equal(c.atk, L.atk, id); assert.equal(c.spd, L.spd, id); assert.equal(c.guard, L.guard, id); }
    else differ++;
  }
  // The plan's survey: 11 original families disagree with the legacy move table; Basics already used the Dex archetype.
  assert.equal(differ, 11); assert.equal(ALL.filter((id) => legacyArchetypeOf(id) && legacyArchetypeOf(id) !== dexArchetypeOf(id)).length, 11);
  const counts = {}; for (const f of FAMILIES) counts[f.clashArchetype] = (counts[f.clashArchetype] || 0) + 1;
  const orig = {}; for (const f of FAMILIES.filter((x) => x.rarity !== 'basic')) orig[f.clashArchetype] = (orig[f.clashArchetype] || 0) + 1;
  assert.deepEqual(orig, { Striker: 14, Balanced: 15, Disruptor: 15, Tank: 13, Support: 15 }, 'spec §1 archetype totals for the 72');
  assert.equal(Object.values(counts).reduce((s, n) => s + n, 0), 192);
});

// ---------------------------------------------------------------- one active fighter, inert reserves
test('one active fighter per side; reserves never act, never take damage and never count turns while in reserve (600 battles, 1v1 to 5v5, all 192 families)', () => {
  for (const { a, b, seed } of battles(600, 11)) {
    const r = run(a, b, seed);
    const entered = new Set(); const turns = {};
    for (const e of r.log) {
      if (e.kind === 'enter') entered.add(e.actor);
      if (e.kind === 'turn_start' || e.kind === 'damage' || e.kind === 'skip') {
        const side = e.actor[0]; assert.equal(e.active[side], e.actor, `${e.kind} by ${e.actor} while ${e.active[side]} is active (seed ${seed})`);
        assert.ok(entered.has(e.actor));
      }
      if (e.kind === 'damage') { assert.ok(entered.has(e.target), `${e.target} hit before entering`); assert.equal(e.tag, 'ordinary'); }
      if (e.kind === 'turn_start') turns[e.actor] = (turns[e.actor] || 0) + 1;
      if (e.kind === 'round_start') for (const s of ['a', 'b']) for (const id of e.reserves[s]) assert.notEqual(e.active[s], id);
    }
    for (const x of [...r.lines.a, ...r.lines.b]) {
      assert.equal(x.turns, turns[x.id] || 0, `${x.id} turns`);
      if (!entered.has(x.id)) { assert.equal(x.hp, x.maxHp, `${x.id} never entered and is untouched`); assert.equal(x.turns, 0); assert.equal(x.stats.attacks, 0); }
    }
    for (const s of ['a', 'b']) assert.ok(r.lines[s].filter((x) => x.active).length <= 1);
  }
});

// ---------------------------------------------------------------- the P6/B3 exchange skeleton
test('exchange skeleton: round start, initiative, the turns in initiative order, rotation phase, end of exchange, end check', () => {
  const PHASES = ['round_start', 'initiative', 'turn', 'end_of_turn', 'rotation', 'end_of_exchange'];
  for (const { a, b, seed } of battles(200, 21)) {
    const r = run(a, b, seed); let lastEx = 0;
    for (let ex = 1; ex <= r.exchanges; ex++) {
      const evs = r.log.filter((e) => e.ex === ex && e.phase !== 'end'); // the final cap/end events close the battle, not the exchange
      const phases = evs.map((e) => e.phase).filter((p, i, arr) => p !== arr[i - 1]);
      // phases appear in skeleton order (turn / end_of_turn repeat once per turn)
      let k = 0; for (const p of phases) { const at = PHASES.indexOf(p); assert.ok(at >= 0, p); if (p !== 'turn' && p !== 'end_of_turn') { assert.ok(at >= k, `phase ${p} after ${PHASES[k]} (seed ${seed} ex ${ex})`); k = at; } }
      assert.equal(evs[0].kind === 'sudden_death' ? evs[1].kind : evs[0].kind, 'round_start');
      const init = evs.find((e) => e.kind === 'initiative'); const starts = evs.filter((e) => e.kind === 'turn_start' || e.kind === 'turn_cancelled');
      assert.deepEqual(starts.map((e) => e.actor), init.order.slice(0, starts.length), 'turns follow initiative order');
      if (ex < r.exchanges || r.by !== 'knockout') { assert.ok(evs.some((e) => e.kind === 'rotation_phase')); assert.equal(evs.at(-1).kind, 'exchange_end'); assert.equal(starts.length, 2); }
      lastEx = ex;
    }
    assert.equal(lastEx, r.exchanges);
    // From S4 voluntary rotations happen only in the rotation phase (P8), never at the start of the exchange.
    assert.ok(!r.log.some((e) => e.kind === 'swap'));
    assert.ok(r.log.filter((e) => e.kind === 'rotation').every((e) => e.phase === 'rotation' && e.voluntary));
  }
});

// ---------------------------------------------------------------- initiative
test('initiative: interrupt tier, then priority tier, then speed, then one seeded coin only on a tie (approved band of 2)', () => {
  const fast = mon('voltfin', 3, { overall: 85 }), slow = mon('pebble', 4, { overall: 45 });
  const cf = buildT8Combatant(fast), cs = buildT8Combatant(slow); assert.ok(cf.spd - cs.spd >= T8_VALUES.damage.initiativeTie);
  const first = (r, ex = 1) => r.log.find((e) => e.ex === ex && e.kind === 'initiative');
  // speed
  let r = run([slow], [fast], 1); assert.equal(first(r).actor, 'b0'); assert.equal(first(r).by, 'speed');
  // priority beats speed; interrupt beats priority
  const prio = { initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) };
  r = run([slow], [fast], 1, { probes: [prio] }); assert.equal(first(r).actor, 'a0'); assert.equal(first(r).by, 'priority');
  const intr = { initiative: (v, id) => (id === 'b0' ? { interrupt: 1 } : { priority: 5 }) };
  r = run([slow], [fast], 1, { probes: [intr] }); assert.equal(first(r).actor, 'b0'); assert.equal(first(r).by, 'interrupt');
  // tie: the same monster on both sides -> coin every exchange; draws = one coin per exchange + one spread per attack (+ end coin)
  const twin = mon('kindlet', 9);
  let coinA = 0, coinB = 0;
  for (let seed = 1; seed <= 60; seed++) {
    r = run([twin], [structuredClone(twin)], seed);
    const inits = r.log.filter((e) => e.kind === 'initiative'); assert.ok(inits.every((e) => e.by === 'coin'));
    const attacks = r.log.filter((e) => e.kind === 'damage').length;
    assert.equal(r.rngDraws, inits.length + attacks + (r.by === 'coin' ? 1 : 0), `seed ${seed} draw count`);
    if (first(r).actor === 'a0') coinA++; else coinB++;
  }
  assert.ok(coinA > 10 && coinB > 10, `the coin goes both ways (${coinA}/${coinB})`);
  // no tie -> no coin draw: draws are exactly the attacks
  r = run([slow], [fast], 5); assert.equal(r.rngDraws, r.log.filter((e) => e.kind === 'damage').length);
});

// ---------------------------------------------------------------- the normal-turn clock
test('clock unit: durations and cooldowns advance only on the holder\'s normal turns, excluding the turn they start in; bad clocks are refused', () => {
  const x = { c: { id: 'a0' }, turns: 0, inTurn: false, clocks: [] };
  addClock(x, { id: 'outside', kind: 'duration', turns: 2 });         // started outside the holder's turn: its next turn counts
  x.turns = 1; x.inTurn = true; addClock(x, { id: 'inside', kind: 'cooldown', turns: 2 }); // started in turn 1: turn 1 excluded
  assert.deepEqual(tickClocks(x).map((k) => k.id), []);                  // end of turn 1: outside 2->1, inside excluded
  x.turns = 2; assert.deepEqual(tickClocks(x).map((k) => k.id), ['outside']); // end of turn 2: outside 1->0, inside 2->1
  x.turns = 3; assert.deepEqual(tickClocks(x).map((k) => k.id), ['inside']);
  assert.equal(x.clocks.length, 0);
  assert.throws(() => addClock(x, { id: 'z', kind: 'duration', turns: 0 }), /positive whole/);
  assert.throws(() => addClock(x, { id: 'z', kind: 'duration', turns: 1.5 }), /positive whole/);
  assert.throws(() => addClock(x, { id: 'z', kind: 'timer', turns: 1 }), /Unknown clock kind/);
  addClock(x, { id: 'd', kind: 'duration', turns: 3 }); addClock(x, { id: 'c', kind: 'cooldown', turns: 3 });
  assert.throws(() => addClock(x, { id: 'd', kind: 'duration', turns: 1 }), /already holds/);
  assert.deepEqual(clearClocks(x, 'duration').map((k) => k.id), ['d']); assert.deepEqual(x.clocks.map((k) => k.id), ['c']);
});

test('clock in the engine: a duration on the recipient counts the recipient\'s normal turns; a cooldown counts the owner\'s; the start turn is excluded; skipped turns count; reserve time pauses', () => {
  const a = [mon('pebble', 1, { overall: 90 }), mon('mudcub', 2, { overall: 90 })], b = [mon('tidepaw', 3, { overall: 90 }), mon('lumen', 4, { overall: 90 })];
  const p = {
    roundStart: (v) => { if (v.ex === 1) v.addClock('b1', { id: 'reserve-dur', kind: 'duration', turns: 1 }); }, // b1 is in reserve
    turnStart: (v, id) => {
      const me = v.combatant(id);
      if (id === 'a0' && me.turns === 1) { v.addClock('b0', { id: 'dur', kind: 'duration', turns: 2 }); v.addClock('a0', { id: 'cd', kind: 'cooldown', turns: 2 }); }
    },
    chooseAction: (v, id) => (id === 'b0' && v.combatant(id).turns === 2 ? { kind: 'skip' } : null), // b0 skips its second turn
  };
  for (const seed of [4, 5, 6, 7, 8, 9]) {
  const r = run(a, b, seed, { probes: [p] });
  const ends = r.log.filter((e) => e.kind === 'clock_end');
  const end = (id) => ends.find((e) => e.clock === id);
  // 'dur' starts on a0's turn 1, i.e. outside b0's turn: b0's next two normal turns consume it, and its skipped turn 2 counts.
  const start = r.log.find((e) => e.kind === 'clock_start' && e.clock === 'dur'); const s0 = start.targetState.turns;
  assert.equal(start.excluded, false); assert.ok(s0 === 0 || s0 === 1);
  assert.equal(end('dur').actor, 'b0'); assert.equal(end('dur').turn, s0 + 2, `seed ${seed}`);
  assert.ok(r.log.some((e) => e.kind === 'skip' && e.actor === 'b0' && e.turn === 2));
  assert.equal(r.lines.b[0].skips, 1);
  // 'cd' started inside a0's turn 1: excluded; a0's turns 2 and 3 consume it.
  assert.equal(end('cd').actor, 'a0'); assert.equal(end('cd').turn, 3);
  // The reserve's clock waits in reserve and only counts b1's own normal turns after it enters.
  const b1Enter = r.log.find((e) => e.kind === 'enter' && e.actor === 'b1');
  if (end('reserve-dur')) { assert.ok(b1Enter && end('reserve-dur').turn === 1 && end('reserve-dur').ex > b1Enter.ex); }
  else assert.ok(!b1Enter || r.lines.b[1].turns === 0);
  assert.ok(r.probed);
  }
});

test('a knockout clears the monster\'s duration clocks and keeps its cooldown clocks (provisional scope, see T8_PROVISIONAL)', () => {
  const a = [mon('vyrnax', 1, { overall: 95 })], b = [mon('kindlet', 2, { overall: 40 }), mon('charbun', 3, { overall: 40 })];
  const p = { roundStart: (v) => { if (v.ex === 1) { v.addClock('b0', { id: 'dur', kind: 'duration', turns: 9 }); v.addClock('b0', { id: 'cd', kind: 'cooldown', turns: 9 }); } } };
  const r = run(a, b, 2, { probes: [p] });
  const ko = r.log.find((e) => e.kind === 'ko' && e.target === 'b0'); assert.ok(ko); assert.deepEqual(ko.clearedClocks, ['dur']);
  assert.deepEqual(r.lines.b[0].clocks.map((k) => k.id), ['cd']);
});

// ---------------------------------------------------------------- KO replacement
test('KO replacement (provisional, D2): the first living reserve in line order enters right after the hit; the knocked-out monster\'s later turn is cancelled and the replacement first acts next exchange', () => {
  let seen = 0, cancelled = 0;
  for (const { a, b, seed } of battles(300, 31, [2, 3, 4, 5])) {
    const r = run(a, b, seed);
    r.log.forEach((e, i) => {
      if (e.kind !== 'ko') return; seen++;
      const side = e.target[0]; const line = r.lines[side];
      const living = line.filter((x) => !(x.koOrder != null && x.koOrder <= e.koOrder)); // alive at the moment of this KO
      const next = r.log[i + 1];
      if (living.length) {
        assert.equal(next.kind, 'enter', 'the replacement is the next event after the KO'); assert.equal(next.reason, 'ko');
        assert.equal(next.actor, living[0].id, 'first living in line order');
        assert.ok(!r.log.some((f) => f.ex === e.ex && f.kind === 'turn_start' && f.actor === next.actor), 'replacement waits for the next exchange');
      } else assert.ok(r.log.slice(i + 1).every((f) => f.kind === 'end' || f.kind === 'cap'), 'side out: the battle ends after the hit');
      const later = r.log.slice(i + 1).find((f) => f.ex === e.ex && f.actor === e.target && f.kind === 'turn_cancelled');
      if (later) cancelled++;
    });
  }
  assert.ok(seen > 500 && cancelled > 50, `knockouts ${seen}, cancelled turns ${cancelled}`);
  assert.ok(T8_PROVISIONAL.some((p) => p.id === 'ko-replacement-line-order' && p.waitsOn));
});

// ---------------------------------------------------------------- the no-contract action
test('no-contract action: every monster (Basics and the 72) makes the ordinary attack; damage = round half up(ATK x ramp x spread x type x Tank guard), reproduced draw by draw', () => {
  const pairs = [['kindlet', 'coalump'], ['emberfox', 'pebble'], ['sparkwick', 'coalump'], ['charbun', 'kilnback'], ['ashkit', 'pyrelynx'], ['nightowl', 'steelpaw']];
  let guarded = 0, pierced = 0;
  for (const [i, [x, y]] of pairs.entries()) for (let seed = 1; seed <= 8; seed++) {
    const ma = mon(x, seed, { overall: 55 + i }), mb = mon(y, seed + 50, { overall: 70 - i });
    const r = run([ma], [mb], seed); const ca = buildT8Combatant(ma, { side: 'a' }), cb = buildT8Combatant(mb, { side: 'b', slot: 0 });
    const C = { a0: ca, b0: cb }; const rng = createRng(seed);
    for (const e of r.log) {
      if (e.kind === 'initiative' && e.by === 'coin') rng.next();
      if (e.kind !== 'damage') continue;
      const att = C[e.actor], def = C[e.target];
      const spread = T8_VALUES.damage.spreadMin + rng.next() * (T8_VALUES.damage.spreadMax - T8_VALUES.damage.spreadMin);
      const guard = def.archetype === 'Tank' && att.archetype !== 'Disruptor' ? 0.88 : 1;
      if (guard < 1) guarded++; if (def.archetype === 'Tank' && att.archetype === 'Disruptor') { pierced++; assert.equal(e.pierce, true); }
      const expect = roundHalfUp(att.atk * rampFor(r.model, e.ex) * spread * typeFactor(att.type, def.type) * guard);
      assert.equal(e.damage, expect, `${x} v ${y} seed ${seed} ex ${e.ex}`); assert.equal(e.guard, guard < 1); assert.equal(e.tag, 'ordinary');
    }
  }
  assert.ok(guarded > 20 && pierced > 5, `Tank guard ${guarded}, Disruptor pierce ${pierced}`);
  assert.equal(roundHalfUp(2.5), 3); assert.equal(roundHalfUp(2.4999), 2); assert.equal(roundHalfUp(0.4), 0); // no minimum damage
});

test('Basics-only battles play end to end on the no-contract action (200 battles)', () => {
  for (const { a, b, seed } of battles(200, 41, [1, 3, 5], BASICS)) {
    const r = run(a, b, seed); assert.ok(['knockout', 'hp', 'coin'].includes(r.by));
    assert.ok([...r.lines.a, ...r.lines.b].every((x) => x.basic && x.combatant.contract === null));
    assert.ok(r.log.filter((e) => e.kind === 'damage').every((e) => e.tag === 'ordinary'));
  }
});

// ---------------------------------------------------------------- determinism
test('determinism: same seed and inputs give an identical log hash and state hash with Math.random/Date.now unavailable; log none gives the same outcome, draws and state (300 battles)', () => {
  withoutRandomness(() => {
    for (const { a, b, seed } of battles(300, 51)) {
      const snapA = structuredClone(a), snapB = structuredClone(b);
      const r1 = run(a, b, seed), r2 = run(a, b, seed), none = run(a, b, seed, { log: 'none' });
      assert.equal(t8LogHash(r1), t8LogHash(r2)); assert.equal(r1.stateHash, r2.stateHash);
      assert.equal(none.log.length, 0);
      for (const k of ['winner', 'by', 'exchanges', 'capped', 'rngDraws', 'stateHash']) assert.equal(none[k], r1[k], `${k} seed ${seed}`);
      assert.deepEqual(none.hpShare, r1.hpShare);
      assert.deepEqual(a, snapA); assert.deepEqual(b, snapB); assert.ok(deepFrozen(r1));
      for (const x of [...r1.lines.a, ...r1.lines.b]) assert.ok(Number.isInteger(x.hp) && x.hp >= 0 && x.hp <= x.maxHp);
    }
  });
});

test('determinism: 20 golden t8 seeds replay from their replay keys (tests/clash/fixtures/golden-t8.json); the router plays t8', () => {
  // Re-recorded at S4 (tools/t8-golden.mjs): the approved D1/D2 AI rotation policy is the default and changes ordinary battles.
  const stored = JSON.parse(fs.readFileSync(new URL('./fixtures/golden-t8.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(stored).length, 20);
  withoutRandomness(() => {
    for (const seed of Object.keys(stored)) {
      const k = parseT8ReplayKey(stored[seed].key);
      const r = simulateClashT8({ a: k.a, b: k.b, seed: k.seed, config: k.config });
      assert.equal(t8LogHash(r), stored[seed].hash, `golden t8 seed ${seed}`); assert.equal(r.stateHash, stored[seed].state);
      assert.equal(t8LogHash(simulateByRuleset({ a: k.a, b: k.b, seed: k.seed, config: { ruleset: 't8' } })), stored[seed].hash);
    }
  });
});

test('regression: the 20 S1 golden battles (golden-t8-s1.json) end in exactly the S1 state with both sides on policy none (S2-S4 change nothing else)', () => {
  const s1 = JSON.parse(fs.readFileSync(new URL('./fixtures/golden-t8-s1.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(s1).length, 20);
  assert.throws(() => parseT8ReplayKey(s1['1'].key), /this build plays/, 'S1 keys are no longer key-compatible');
  withoutRandomness(() => {
    for (const seed of Object.keys(s1)) {
      const k = JSON.parse(s1[seed].key);
      const r = simulateClashT8({ a: k.a, b: k.b, seed: k.seed, config: { ruleset: 't8', policies: { a: 'none', b: 'none' } } });
      assert.equal(r.stateHash, s1[seed].state, `S1 golden seed ${seed}`);
    }
  });
});

test('t8 is separate from legacy: its config takes only the ruleset; probes are closed hooks; replay keys name t8; invariants over 1,000 battles', () => {
  const a = [mon('pebble', 1)], b = [mon('ashkit', 2)];
  assert.throws(() => run(a, b, 1, { config: { ruleset: 'current' } }), /plays ruleset t8/);
  assert.throws(() => run(a, b, 1, { config: { backRow: 'on' } }), /Unknown t8 battle option/);
  assert.throws(() => run(a, b, 1, { config: { policies: { a: 'smart' } } }), /Unknown t8 rotation policy/);
  assert.throws(() => run(a, b, 1, { config: { ruleset: () => 't8' } }), /cannot be functions/);
  assert.throws(() => run(a, b, 1, { probes: [{ act: () => 1 }] }), /Unknown probe hook/);
  assert.throws(() => run([], b, 1), /1-5 monsters/);
  const r = run(a, b, 1); assert.equal(r.ruleset, 't8'); assert.equal(JSON.parse(r.replayKey).ruleset, 't8'); assert.equal(r.probed, false);
  assert.throws(() => parseT8ReplayKey(JSON.stringify({ ruleset: 'current', engine: 'p1.1' })), /this build plays t8/);
  let capped = 0;
  for (const { a: A, b: B, seed } of battles(1000, 61)) {
    const x = run(A, B, seed, { log: 'none' });
    assert.ok(x.exchanges >= 1 && x.exchanges <= T8_VALUES.battle.exchangeCap);
    if (x.by === 'knockout') { assert.ok(x.lines[x.winner].some((m) => !m.koed)); assert.ok(x.lines[x.winner === 'a' ? 'b' : 'a'].every((m) => m.koed)); }
    else if (x.capped) capped++;
    else { assert.equal(x.by, 'coin'); assert.ok([...x.lines.a, ...x.lines.b].every((m) => m.koed)); }
  }
  assert.ok(capped < 50, `capped ${capped}`);
});

test('every provisional default is listed with the decision or step it waits on', () => {
  assert.ok(T8_PROVISIONAL.length >= 1);
  for (const p of T8_PROVISIONAL) { assert.ok(p.id && p.rule && p.waitsOn, JSON.stringify(p)); }
  assert.equal(new Set(T8_PROVISIONAL.map((p) => p.id)).size, T8_PROVISIONAL.length);
});
