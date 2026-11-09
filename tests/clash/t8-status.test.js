// Task 8 M4 S2: statuses in Beast Clash t8. The ONE shared slot through src/sim/t8/status.js in mode 'clash' (spec §10, Appendix B),
// the Clash effects of each status, the D4 Stunned safeguard and its countdown, D7 (no Afflicted heal penalty), D10 / D11 carry
// payloads, D12 (standalone battles clear at the end), and the Confused redirect against the frozen B12 tolerance.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClashT8, buildT8Combatant, T8_VALUES, T8_PROVISIONAL, roundHalfUp } from '../../src/clash/t8/index.js';
import { applyClash, orderAttempts, endOfTurn, clashEffect, afflictedTick, absorb, cleanse, replaceWith, toFootball, fromFootball, CLASH_STATUS_VALUES, MAX_APPLICATIONS } from '../../src/clash/t8/status.js';
import { B12_TOLERANCES, toleranceFor, b12SampleSize } from '../../src/clash/t8/tolerances.js';
import { tryApply, transfer } from '../../src/sim/t8/status.js';
import { typeFactor } from '../../src/clash/types.js';
import { rampFor } from '../../src/clash/engine.js';
import { createRng } from '../../src/core/rng.js';
import { mon, withoutRandomness } from './helpers.js';

// S5: this file tests the engine's own mechanics with stubs, so the registered contracts are switched off (config.abilities 'off').
const run = (a, b, seed = 1, extra = {}) => simulateClashT8({ a, b, seed, ...extra, config: { abilities: 'off', ...(extra.config || {}) } });
const A = (id, strength, duration, extra = {}) => ({ id, strength, duration, ...extra });
const tough = (id, seed) => mon(id, seed, { overall: 90 });
const ev = (r, kind, f = () => true) => r.log.filter((e) => e.kind === kind && f(e));

// ---------------------------------------------------------------- the gate in mode 'clash'
test('gate (clash): football-only statuses refused; a different status blocked; equal adds duration only; stronger replaces strength and duration; weaker ignored; three applications cap', () => {
  assert.equal(applyClash(null, A('stumbled', 1, 1)).accepted, false);
  assert.equal(applyClash(null, A('knockedDown', 1, 1)).reason, 'unsupported in this mode');
  let s = applyClash(null, A('slowed', 15, 2)).slot;
  assert.deepEqual([s.id, s.strength, s.remaining, s.applications], ['slowed', 15, 2, 1]);
  assert.equal(applyClash(s, A('weakened', 30, 2)).reason, 'slot occupied by another status');
  const eq = applyClash(s, A('slowed', 15, 3)); assert.equal(eq.reason, 'equal: duration added'); s = eq.slot;
  assert.deepEqual([s.strength, s.remaining, s.applications], [15, 5, 2]);
  const weak = applyClash(s, A('slowed', 10, 9)); assert.equal(weak.accepted, false); assert.equal(weak.reason, 'weaker application ignored'); assert.equal(weak.slot.applications, 2);
  const strong = applyClash(s, A('slowed', 20, 1)); assert.equal(strong.reason, 'stronger: replaced'); s = strong.slot;
  assert.deepEqual([s.strength, s.remaining, s.applications], [20, 1, 3]);
  assert.equal(applyClash(s, A('slowed', 40, 4)).reason, 'episode at three applications');
  assert.equal(s.applications, MAX_APPLICATIONS);
  assert.deepEqual(s.history.map((h) => h.result), ['new episode', 'equal: duration added', 'stronger: replaced'], 'application history kept');
  // Ticking does not reopen applications; a new episode after expiry starts at one.
  s = endOfTurn({ ...s, appliedThisUnit: false }).slot; assert.equal(s, null);
  assert.equal(applyClash(s, A('slowed', 15, 2)).slot.applications, 1);
  assert.throws(() => applyClash(null, A('slowed', 15, 0)), /positive whole number/);
});

test('tie order (§9): simultaneous attempts keep event order, then sourceID, then abilityID; the first accepted takes the slot; no draw', () => {
  const attempts = [
    { id: 'weakened', strength: 15, duration: 2, sourceId: 'b0', abilityId: 'WIN-03-C', order: 1 },
    { id: 'slowed', strength: 15, duration: 2, sourceId: 'a1', abilityId: 'ICE-02-C', order: 1 },
    { id: 'confused', strength: 20, duration: 2, sourceId: 'a1', abilityId: 'DAR-05-C', order: 1 },
    { id: 'guarded', strength: 20, duration: 1, sourceId: 'a0', abilityId: 'X', order: 2 },
  ];
  assert.deepEqual(orderAttempts(attempts).map((t) => t.abilityId), ['DAR-05-C', 'ICE-02-C', 'WIN-03-C', 'X']);
  // In the engine: the batch is applied in that order; draws are unaffected.
  const a = [tough('pebble', 1)], b = [tough('tidepaw', 2)]; let out = null;
  const p = { roundStart: (v) => { if (v.ex === 1) out = v.applyStatuses(attempts.map((t) => ({ ...t, targetId: 'b0' }))); } };
  const r = run(a, b, 3, { probes: [p] }); const plain = run(a, b, 3);
  assert.deepEqual(out.map((o) => [o.abilityId, o.accepted]), [['DAR-05-C', true], ['ICE-02-C', false], ['WIN-03-C', false], ['X', false]]);
  assert.ok(ev(r, 'status_blocked').every((e) => e.unmet?.[0]?.detail === 'slot occupied by another status'), 'blocked attempts report the unmet condition');
  assert.ok(ev(r, 'confused_roll').length >= 1 && ev(r, 'confused_roll').every((e) => e.actor === 'b0'), 'b0 is Confused: one roll per attack while it lasts');
  assert.equal(r.rngDraws - ev(r, 'confused_roll').length, ev(r, 'damage').length + ev(r, 'initiative', (e) => e.by === 'coin').length + (r.by === 'coin' ? 1 : 0)); void plain;
});

// ---------------------------------------------------------------- the countdown
test('durations count the recipient\'s normal turns; the application turn is excluded only when the recipient is in its own turn; statuses expire after the last counted turn', () => {
  const a = [tough('pebble', 1)], b = [tough('tidepaw', 2)];
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    // a0 applies Slowed 2 to b0 during a0's turn 1 (outside b0's turn): b0's next two turns consume it.
    // a0 gives itself Empowered 2 during its own turn 1: excluded, so its turns 2 and 3 consume it.
    const p = { turnStart: (v, id) => { if (id === 'a0' && v.combatant(id).turns === 1) { v.applyStatus('b0', A('slowed', 15, 2)); v.applyStatus('a0', A('empowered', 10, 2)); } } };
    const r = run(a, b, seed, { probes: [p] });
    const applied = ev(r, 'status', (e) => e.target === 'b0')[0]; assert.equal(applied.excluded, false);
    const b0turnsAtApply = applied.targetState.turns;
    const endB = ev(r, 'status_end', (e) => e.target === 'b0' && e.reason === 'expired')[0];
    const endA = ev(r, 'status_end', (e) => e.target === 'a0' && e.reason === 'expired')[0];
    assert.ok(ev(r, 'status', (e) => e.target === 'a0')[0].excluded, 'self-applied in its own turn: excluded');
    assert.equal(endB.targetState.turns, b0turnsAtApply + 2, `seed ${seed}: b0 expires after its 2nd counted turn`);
    assert.equal(endA.targetState.turns, 3, `seed ${seed}: a0 turn 1 excluded, turns 2-3 count`);
    assert.ok(endA.phase === 'end_of_turn' && endB.phase === 'end_of_turn');
  }
});

test('reserve pause: a status held in reserve never counts down; it counts only its holder\'s normal turns after entry; a knockout clears status and episode at once', () => {
  const a = [mon('vyrnax', 1, { overall: 95 })], b = [mon('kindlet', 2, { overall: 40 }), mon('charbun', 3, { overall: 40 })];
  const r = run(a, b, 2, { stage: { b1: { status: A('weakened', 20, 2) }, b0: { status: A('slowed', 15, 9) } } });
  assert.ok(r.staged);
  const ko0 = ev(r, 'ko', (e) => e.target === 'b0')[0]; assert.equal(ko0.clearedStatus, 'slowed');
  assert.equal(r.lines.b[0].status, null);
  const enter1 = ev(r, 'enter', (e) => e.actor === 'b1')[0];
  // Before b1 enters nothing about its status changes; after entry it counts its own turns.
  const before = r.log.filter((e) => e.target === 'b1' && e.kind.startsWith('status') && r.log.indexOf(e) < r.log.indexOf(enter1));
  assert.ok(before.every((e) => e.kind === 'status' && e.phase === 'opening'), 'only the staged application before entry');
  const end1 = ev(r, 'status_end', (e) => e.target === 'b1' && e.reason === 'expired')[0];
  assert.ok(enter1, 'b1 enters'); assert.equal(ev(r, 'status', (e) => e.target === 'b1').length, 1);
  if (end1) assert.equal(end1.targetState.turns, 2); else assert.ok(r.lines.b[1].koed && r.lines.b[1].turns < 2);
});

// ---------------------------------------------------------------- D4: Stunned
test('D4 Stunned: skip, protected turn (duration held), skip, ...; never two consecutive Stunned skips; each Stunned unit costs exactly one skipped turn', () => {
  const a = [tough('pebble', 1)], b = [tough('tidepaw', 2)];
  for (const n of [1, 2, 3, 4]) for (const seed of [1, 2, 3]) {
    const r = run(a, b, seed, { stage: { b0: { status: A('stunned', 1, n) } } });
    const skips = ev(r, 'skip', (e) => e.actor === 'b0').map((e) => e.turn);
    const safe = ev(r, 'stun_safeguard', (e) => e.actor === 'b0').map((e) => e.turn);
    const end = ev(r, 'status_end', (e) => e.target === 'b0' && e.status === 'stunned')[0];
    const lived = r.lines.b[0].turns;
    // Expected pattern while it lives: skip on odd turns 1,3,...,2n-1; protected on even turns 2,...,2n-2; expires at the end of turn 2n-1.
    const expSkips = []; for (let k = 1; k <= 2 * n - 1 && k <= lived; k += 2) expSkips.push(k);
    const expSafe = []; for (let k = 2; k <= 2 * n - 2 && k <= lived; k += 2) expSafe.push(k);
    assert.deepEqual(skips, expSkips, `n ${n} seed ${seed} skips`); assert.deepEqual(safe, expSafe, `n ${n} seed ${seed} safeguards`);
    for (let i = 1; i < skips.length; i++) assert.ok(skips[i] - skips[i - 1] >= 2, 'never two consecutive skips');
    if (lived >= 2 * n - 1) { assert.equal(end.reason, 'expired'); assert.equal(end.targetState.turns, 2 * n - 1); }
    // On every protected turn the remaining duration is held, never decremented.
    for (const h of ev(r, 'status_hold', (e) => e.actor === 'b0')) { const before = r.log.filter((e) => e.kind === 'stun_safeguard' && e.actor === 'b0' && e.ex === h.ex)[0]; assert.equal(h.remaining, before.remaining); }
    assert.equal(r.lines.b[0].stunnedSkips, skips.length);
  }
});

test('D4 in random battles: a Stunned monster never loses two consecutive normal turns; a skip counts as a normal turn (300 battles with Stunned carried in at random)', () => {
  const rng = createRng(77); let skipsSeen = 0, safeSeen = 0;
  for (let i = 0; i < 300; i++) {
    const a = [tough('pebble', rng.seed()), tough('mudcub', rng.seed())], b = [tough('tidepaw', rng.seed()), tough('lumen', rng.seed())];
    const stage = {}; for (const id of ['a0', 'a1', 'b0', 'b1']) if (rng.chance(0.5)) stage[id] = { status: A('stunned', 1, 1 + rng.int(5)) };
    const r = run(a, b, i + 1, { stage });
    for (const x of [...r.lines.a, ...r.lines.b]) {
      const mine = r.log.filter((e) => e.actor === x.id && (e.kind === 'skip' || e.kind === 'turn_start'));
      let last = null; for (const e of mine) { if (e.kind === 'turn_start') last = e.turn; if (e.kind === 'skip') { const prev = r.log.find((f) => f.kind === 'skip' && f.actor === x.id && f.turn === last - 1); assert.ok(!prev, `${x.id} skipped turns ${last - 1} and ${last}`); skipsSeen++; } }
      assert.equal(x.turns, r.log.filter((e) => e.kind === 'turn_start' && e.actor === x.id).length);
    }
    safeSeen += ev(r, 'stun_safeguard').length;
  }
  assert.ok(skipsSeen > 200 && safeSeen > 100, `skips ${skipsSeen}, safeguards ${safeSeen}`);
});

test('countdown unit: application turn, D4 hold, Deep Winter freeze (counts every recipient turn, ends on an accepted same-status application)', () => {
  let s = applyClash(null, A('stunned', 1, 2), { recipientInTurn: true }).slot;
  assert.equal(s.appliedThisUnit, true);
  let r = endOfTurn(s); assert.equal(r.decremented, false); s = r.slot; assert.equal(s.remaining, 2);
  r = endOfTurn(s, { hold: true }); assert.equal(r.held, true); assert.equal(r.slot.remaining, 2);
  r = endOfTurn(s); assert.equal(r.slot.remaining, 1);
  // freeze
  s = { ...applyClash(null, A('weakened', 15, 2)).slot, freeze: 2 };
  r = endOfTurn(s); assert.equal(r.froze, true); assert.equal(r.slot.remaining, 2); assert.equal(r.slot.freeze, 1);
  r = endOfTurn(r.slot, { hold: true }); assert.equal(r.froze, true); assert.equal(r.slot.freeze, 0); // hold applies to Stunned only
  r = endOfTurn(r.slot); assert.equal(r.slot.remaining, 1, 'thaw: ordinary countdown resumes on the following turn');
  // Beneficial statuses are not frozen; an accepted same-status application ends the freeze, a weaker one does not.
  assert.equal(endOfTurn({ ...applyClash(null, A('guarded', 20, 2)).slot, freeze: 2 }).froze, false);
  const fz = { ...applyClash(null, A('weakened', 15, 2)).slot, appliedThisUnit: false, freeze: 2 };
  assert.equal(applyClash(fz, A('weakened', 10, 2)).accepted, false);
  assert.equal(applyClash(fz, A('weakened', 15, 1)).slot.freeze, 0);
});

// ---------------------------------------------------------------- effects
test('D10 Slowed / Quickened multiply initiative speed by (1 -/+ pct); the same percentage as football', () => {
  const fast = mon('voltfin', 3, { overall: 85 }), slow = mon('pebble', 4, { overall: 45 });
  const cf = buildT8Combatant(fast), cs = buildT8Combatant(slow);
  const first = (r) => r.log.find((e) => e.kind === 'initiative');
  assert.equal(first(run([slow], [fast], 1)).actor, 'b0');
  const pct = Math.ceil(((cf.spd - cs.spd + T8_VALUES.damage.initiativeTie) / cf.spd) * 100); // enough to flip the order
  assert.equal(first(run([slow], [fast], 1, { stage: { b0: { status: A('slowed', pct, 3) } } })).actor, 'a0');
  const q = Math.ceil(((cf.spd - cs.spd + T8_VALUES.damage.initiativeTie) / cs.spd) * 100);
  assert.equal(first(run([slow], [fast], 1, { stage: { a0: { status: A('quickened', q, 3) } } })).actor, 'a0');
  assert.equal(clashEffect(applyClash(null, A('slowed', 15, 1)).slot).initiative, 0.85);
  assert.equal(clashEffect(applyClash(null, A('quickened', 20, 1)).slot).initiative, 1.2);
  assert.equal(clashEffect(applyClash(null, A('stunned', 1, 1)).slot).initiative, 1, 'Stunned does not change speed');
});

test('Weakened / Empowered (outgoing) and Guarded (incoming) change ordinary-attack damage, reproduced draw by draw; one rounding', () => {
  const ma = mon('emberfox', 5, { overall: 70 }), mb = mon('pebble', 6, { overall: 70 });
  for (const [who, st] of [['a0', A('empowered', 20, 9)], ['a0', A('weakened', 30, 9)], ['b0', A('guarded', 25, 9)]]) for (const seed of [1, 2, 3]) {
    const r = run([ma], [mb], seed, { stage: { [who]: { status: st } } });
    const ca = buildT8Combatant(ma, { side: 'a' }), cb = buildT8Combatant(mb, { side: 'b' }); const C = { a0: ca, b0: cb };
    const rr = createRng(seed); const live = { a0: who === 'a0' ? st : null, b0: who === 'b0' ? st : null };
    for (const e of r.log) {
      if (e.kind === 'initiative' && e.by === 'coin') rr.next();
      if (e.kind === 'status_end' && e.target) live[e.target] = null;
      if (e.kind !== 'damage') continue;
      const att = C[e.actor], def = C[e.target];
      const spread = T8_VALUES.damage.spreadMin + rr.next() * (T8_VALUES.damage.spreadMax - T8_VALUES.damage.spreadMin);
      const s = live[e.actor]; const out = s?.id === 'empowered' ? 1 + s.strength / 100 : s?.id === 'weakened' ? 1 - s.strength / 100 : 1;
      const d = live[e.target]; const inc = d?.id === 'guarded' ? 1 - d.strength / 100 : 1;
      const guard = def.archetype === 'Tank' && att.archetype !== 'Disruptor' ? def.guard : 1;
      assert.equal(e.damage, roundHalfUp(att.atk * rampFor(r.model, e.ex) * spread * out * typeFactor(att.type, def.type) * guard * inc), `${st.id} seed ${seed} ex ${e.ex}`);
    }
    assert.ok(ev(r, 'damage').some((e) => e.outgoing || e.guarded), `${st.id} acted`);
  }
});

test('Shielded (STA-09, D11): the pool absorbs before HP; Striker breaks it twice as fast on ordinary attacks; equal extension never refills; compared by ORIGINAL strength; an empty pool ends it', () => {
  let s = applyClash(null, A('shielded', 30, 3)).slot;
  assert.deepEqual(s.payload, { pool: 30, remaining: 30, fraction: 1, saveSpent: false });
  let r = absorb(s, 10.4, 1); assert.deepEqual([r.poolLoss, r.toHp, r.broken], [10, 0, false]); s = r.slot; assert.equal(s.payload.remaining, 20); assert.equal(s.payload.fraction, 20 / 30);
  r = absorb(s, 6, 2); assert.deepEqual([r.poolLoss, r.toHp], [12, 0]); s = r.slot; assert.equal(s.payload.remaining, 8);
  r = absorb(s, 10, 2); assert.equal(r.broken, true); assert.equal(r.slot, null); assert.equal(r.poolLoss, 8); assert.equal(r.toHp, 6);
  // equal extension: duration only, no refill; weaker than the ORIGINAL (even if stronger than what is left) is ignored; stronger replaces
  s = applyClash(null, A('shielded', 30, 3)).slot; s = absorb(s, 25, 1).slot; s = { ...s, appliedThisUnit: false };
  const eq = applyClash(s, A('shielded', 30, 2)).slot; assert.equal(eq.payload.remaining, 5); assert.equal(eq.remaining, 5);
  assert.equal(applyClash(s, A('shielded', 20, 2)).reason, 'weaker application ignored', '20 > 5 left, but < 30 original');
  const st = applyClash(s, A('shielded', 40, 2)).slot; assert.deepEqual([st.payload.pool, st.payload.remaining, st.remaining, st.applications], [40, 40, 2, 2]);
  assert.throws(() => applyClash(null, A('shielded', 12.5, 2)), /whole HP/);
  // In the engine: a staged shield absorbs ordinary attacks; damage events record the pool loss; it ends when broken.
  const striker = mon('voltfang', 3, { overall: 80 }); const cS = buildT8Combatant(striker); assert.equal(cS.archetype, 'Striker');
  const tgt = mon('pebble', 4, { overall: 80 });
  const e = run([striker], [tgt], 2, { stage: { b0: { status: A('shielded', 40, 9) } } });
  const hits = ev(e, 'damage', (x) => x.target === 'b0' && x.shield);
  assert.ok(hits.length >= 1 && hits.every((h) => h.shield.breakMult === 2));
  assert.ok(ev(e, 'status_end', (x) => x.target === 'b0' && x.reason === 'broken').length === 1);
});

test('Confused redirect at launch: the full attack goes to the attacker itself; one draw per eligible attack only while Confused; frozen B12 tolerance (25%, h 0.02, N 5074)', () => {
  const t = toleranceFor('confused-redirect');
  assert.deepEqual([t.p, t.h, t.n], [0.25, 0.02, b12SampleSize(0.25, 0.02)]); assert.equal(t.n, 5074);
  assert.ok(B12_TOLERANCES.every((x) => x.frozen && x.n === b12SampleSize(x.p, x.h)));
  let rolls = 0, redirected = 0, seed = 0;
  withoutRandomness(() => {
    while (rolls < t.n) {
      seed += 1;
      const a = [tough('pebble', seed)], b = [tough('mudcub', seed + 1000)];
      const r = run(a, b, seed, { stage: { a0: { status: A('confused', 20, 30) } } });
      for (const e of ev(r, 'confused_roll')) {
        if (rolls >= t.n) break; rolls += 1; if (e.redirected) redirected += 1;
        const dmg = r.log[r.log.indexOf(e) + 1]; assert.equal(dmg.kind, 'damage'); assert.equal(dmg.target, e.redirected ? 'a0' : 'b0'); if (e.redirected) assert.equal(dmg.redirected, true);
      }
      // draw count: one Confused roll per a0 attack while Confused, plus one spread per attack, plus coins
      const coins = ev(r, 'initiative', (e) => e.by === 'coin').length + (r.by === 'coin' ? 1 : 0);
      assert.equal(r.rngDraws, ev(r, 'damage').length + ev(r, 'confused_roll').length + coins);
    }
  });
  const obs = redirected / rolls; assert.ok(Math.abs(obs - t.p) <= t.h, `observed ${obs.toFixed(4)} over ${rolls}`);
  assert.equal(CLASH_STATUS_VALUES.confusedRedirectPct, 25);
});

test('Afflicted (STA-05): payload-defined tick at the end of the recipient\'s own normal turn, before the countdown; not on the application turn; a tick KO is immediate; D7 no heal penalty', () => {
  assert.equal(afflictedTick(applyClash(null, A('afflicted', 1, 2)).slot, 200), 0, 'no payload: no invented size');
  assert.equal(afflictedTick(applyClash(null, A('afflicted', 1, 2, { payload: { tickHp: 7 } })).slot, 200), 7);
  assert.equal(afflictedTick(applyClash(null, A('afflicted', 1, 2, { payload: { tickPctMaxHp: 5 } })).slot, 210), 11);
  assert.equal(clashEffect(applyClash(null, A('afflicted', 1, 2, { payload: { tickHp: 7 } })).slot).heal, 1, 'D7: Afflicted does not reduce healing');
  assert.equal(clashEffect(applyClash(null, A('healingReduced', 40, 2)).slot).heal, 0.6);
  assert.equal(clashEffect(applyClash(null, A('healingReduced', 100, 2)).slot).heal, 0);
  const a = [tough('pebble', 1)], b = [tough('tidepaw', 2), tough('lumen', 3)];
  // applied by a probe in b0's own turn 1: no tick that turn; ticks at the end of turns 2 and 3, each before the decrement
  const p = { turnStart: (v, id) => { if (id === 'b0' && v.combatant(id).turns === 1) v.applyStatus('b0', A('afflicted', 1, 2, { payload: { tickHp: 5 } })); } };
  for (const seed of [1, 2, 3]) {
    const r = run(a, b, seed, { probes: [p] });
    const ticks = ev(r, 'afflicted', (e) => e.target === 'b0');
    assert.deepEqual(ticks.map((e) => e.targetState.turns), [2, 3], `seed ${seed}`);
    for (const t of ticks) { const i = r.log.indexOf(t); const end = r.log.slice(i).find((e) => e.kind === 'status_end' && e.target === 'b0'); if (t.targetState.turns === 3) assert.equal(end.targetState.turns, 3); assert.equal(t.damage, 5); }
  }
  // a lethal tick: KO at once, replacement right after, no countdown for the knocked-out monster
  const r = run(a, b, 4, { stage: { b0: { hp: 3, status: A('afflicted', 1, 3, { payload: { tickHp: 50 } }) } } });
  const tk = ev(r, 'afflicted', (e) => e.target === 'b0')[0];
  assert.ok(tk && tk.hpAfter === 0, 'the staged lethal tick happens');
  { const i = r.log.indexOf(tk); assert.equal(r.log[i + 1].kind, 'ko'); assert.equal(r.log[i + 2].kind, 'enter'); assert.equal(r.log[i + 2].actor, 'b1'); assert.ok(!r.log.slice(i).some((e) => e.kind === 'status_end' && e.target === 'b0' && e.reason === 'expired')); }
});

// ---------------------------------------------------------------- cleanse, replacement
test('cleanse removes harmful statuses only and never an uncleansable one; explicit replacement starts a fresh episode only with permission', () => {
  assert.deepEqual(cleanse(applyClash(null, A('weakened', 15, 2)).slot), { slot: null, removed: true, reason: 'cleansed' });
  assert.equal(cleanse(applyClash(null, A('guarded', 15, 2)).slot).removed, false);
  const fl = applyClash(null, A('healingReduced', 100, 2, { payload: { uncleansable: true } })).slot;
  assert.equal(cleanse(fl).reason, 'uncleansable');
  assert.equal(replaceWith(fl, A('guarded', 30, 1)).accepted, false);
  const ms = replaceWith(fl, A('guarded', 30, 1), { overridesUncleansable: true }); assert.equal(ms.accepted, true); assert.equal(ms.slot.applications, 1);
  const st = applyClash(null, A('slowed', 15, 2)).slot; const rp = replaceWith({ ...st, applications: 3 }, A('guarded', 20, 2)); assert.equal(rp.slot.id, 'guarded'); assert.equal(rp.slot.applications, 1);
  // in the engine, through the probe surface
  const a = [tough('pebble', 1)], b = [tough('tidepaw', 2)]; let res = null;
  const p = { roundStart: (v) => { if (v.ex === 1) res = [v.cleanse('a0'), v.cleanse('b0')]; } };
  const r = run(a, b, 1, { probes: [p], stage: { a0: { status: A('weakened', 15, 5) }, b0: { status: A('guarded', 15, 5) } } });
  assert.deepEqual(res, [true, false]); assert.ok(ev(r, 'cleanse_refused')[0].unmet.length === 1);
});

// ---------------------------------------------------------------- D12 and the carry payloads
test('D12: a standalone battle clears every status at its actual end; opening / overtime keep them as carryOut; a standalone battle refuses incoming carry', () => {
  const a = [tough('pebble', 1), tough('mudcub', 2)], b = [tough('tidepaw', 3), tough('lumen', 4)];
  const stage = { a1: { status: A('slowed', 15, 9) }, b1: { status: A('shielded', 30, 9) } };
  const s = run(a, b, 5, { stage });
  assert.equal(s.context, 'standalone'); assert.equal(s.carryOut, null);
  assert.ok([...s.lines.a, ...s.lines.b].every((x) => x.status === null));
  const cleared = ev(s, 'status_end', (e) => e.reason === 'end of a standalone battle'); assert.ok(cleared.length >= 1);
  for (const ctx of ['opening', 'overtime']) {
    const o = run(a, b, 5, { stage, config: { ruleset: 't8', context: ctx } });
    assert.equal(o.context, ctx); assert.ok(!ev(o, 'status_end', (e) => e.reason === 'end of a standalone battle').length);
    for (const x of [...o.lines.a, ...o.lines.b]) if (x.status) { const out = o.carryOut[x.monsterId]; if (['slowed', 'shielded'].includes(x.status.id)) assert.ok(out, `${x.id} carries ${x.status.id}`); }
  }
  assert.throws(() => run(a, b, 5, { carryIn: { [a[0].id]: null } }), /standalone Clash has no incoming/);
  assert.throws(() => run(a, b, 5, { config: { ruleset: 't8', context: 'friendly' } }), /Unknown t8 battle context/);
});

test('D10 / D11 carry payloads: same % for Slowed, Empowered, Weakened, Quickened; Confused into football is -20% Awareness; Shielded keeps pool, fraction, history and the save flag, converts at 15% of max Clash HP x fraction, and never refills', () => {
  for (const id of ['slowed', 'empowered', 'weakened', 'quickened']) {
    const s = applyClash(null, A(id, 15, 3)).slot; const f = toFootball(s, 200);
    assert.equal(f.strength, 15); assert.equal(f.remaining, 3); assert.equal(f.applications, 1); assert.deepEqual(f.history, s.history);
    assert.deepEqual(fromFootball(f, 200), { ...s, appliedThisUnit: false, restOfPlay: false });
  }
  const c = toFootball(applyClash(null, A('confused', 20, 2)).slot, 200); assert.equal(c.payload.pct, CLASH_STATUS_VALUES.confusedFootballAwarenessPct); assert.equal(c.payload.pct, 20);
  assert.equal(clashEffect(fromFootball(c, 200)).confusedChance, 0.25, 'football Confused into Clash: the fixed 25% redirect');
  assert.equal(toFootball(applyClash(null, A('guarded', 20, 2)).slot, 200), null, 'Guarded is Clash only');
  assert.equal(toFootball(applyClash(null, A('healingReduced', 50, 2)).slot, 200), null, 'Healing Reduced is Clash only');
  assert.equal(fromFootball(tryApply(null, { id: 'stumbled', strength: 1, duration: 1, mode: 'football' }).slot, 200), null);
  // Stunned 1:1 (B18)
  assert.equal(fromFootball(toFootball(applyClash(null, A('stunned', 1, 3)).slot, 200), 200).remaining, 3);
  // Football-origin shield (Guiding Halo payload): 15% of max Clash HP x remaining fraction
  const halo = tryApply(null, { id: 'shielded', strength: 15, duration: 3, mode: 'football', payload: { fumbleSaves: 1, clashPoolPct: 15 } }).slot;
  let cs = fromFootball(halo, 210); assert.deepEqual([cs.strength, cs.payload.pool, cs.payload.remaining, cs.payload.fraction], [32, 32, 32, 1]);
  cs = fromFootball({ ...halo, payload: { ...halo.payload, fraction: 0.5 } }, 210); assert.deepEqual([cs.payload.pool, cs.payload.remaining], [32, 16]);
  assert.equal(fromFootball({ ...halo, payload: { ...halo.payload, fraction: 0 } }, 210), null);
  assert.equal(fromFootball({ ...halo, payload: {} }, 200).payload.pool, 30, 'no pool percentage named: the approved 15%');
  // Clash pool -> football -> Clash: compared by original strength, depleted stays depleted, history and save flag kept
  let p = applyClash(null, A('shielded', 40, 3)).slot; p = absorb(p, 30, 1).slot; // 10 of 40 left
  const fb = toFootball(p, 200); assert.equal(fb.strength, 20); assert.equal(fb.payload.fraction, 0.25); assert.equal(fb.payload.fumbleSaves, 1); assert.equal(fb.payload.saveSpent, false);
  const back = fromFootball(fb, 200); assert.deepEqual([back.strength, back.payload.pool, back.payload.remaining], [40, 40, 10]); assert.deepEqual(back.history, p.history);
  assert.equal(toFootball({ ...p, payload: { ...p.payload, saveSpent: true } }, 200).payload.fumbleSaves, 0);
  assert.equal(transfer(fb, 'football').payload.remaining, 10);
  // In the engine: an overtime Clash takes carry in and hands carry out.
  const a = [tough('pebble', 1)], b = [tough('tidepaw', 2)];
  const o = run(a, b, 3, { config: { ruleset: 't8', context: 'overtime' }, carryIn: { [a[0].id]: halo, [b[0].id]: tryApply(null, { id: 'knockedDown', strength: 1, duration: 1, mode: 'football' }).slot } });
  assert.ok(ev(o, 'status_carry', (e) => e.target === 'a0' && e.slot.pool === roundHalfUp(buildT8Combatant(a[0]).maxHp * 0.15)).length === 1);
  assert.ok(ev(o, 'status_end', (e) => e.target === 'b0' && e.reason === 'unsupported in Clash').length === 1);
  assert.ok(JSON.parse(o.replayKey).carryIn);
});

// ---------------------------------------------------------------- invariants
test('statuses never change a battle that has none: plain battles draw and log exactly as S1 (see the golden test); provisional defaults name what they wait on', () => {
  for (const id of ['application-turn-in-clash', 'd4-protected-turn-hold', 'afflicted-tick-payload', 'shield-depleted-ends-status', 'shield-strength-units']) assert.ok(T8_PROVISIONAL.some((p) => p.id === id && p.waitsOn), id);
  assert.ok(!T8_PROVISIONAL.some((p) => p.id === 'striker-shield-break-inert'), 'D5 approved: the perk is live');
  const a = [tough('pebble', 1)], b = [tough('tidepaw', 2)];
  const r = run(a, b, 9);
  assert.ok(!r.log.some((e) => e.kind.startsWith('status') || e.kind === 'confused_roll' || e.kind === 'stun_safeguard'));
  assert.equal(r.staged, false);
});
