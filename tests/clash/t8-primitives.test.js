// Task 8 M4 S5: the contract primitives, driven by stub contract modules registered under test-only families (never Dex abilities):
// delayed impacts (schedule, frozen targets, end-of-exchange resolution, pre-KO strength, lapse at the cap), revive (D18), status
// transfer, signature restriction, cooldown extension / reduction, the retaliation guard, team actions, the pre-initiative advance,
// P9 diagnostics, staged ability state, the §9 apportionment and Mind Mend fixtures, and the mastery execution record.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClashT8, T8_PROVISIONAL, P9_CLASH_LIMITS, registerClashAbility, CLASH_HOOKS, T8_FLAGS } from '../../src/clash/t8/index.js';
import { apportionHp, mindMendDonation } from '../../src/clash/t8/apportion.js';
import { clashContractOf } from '../../src/clash/t8/registry.js';
import { mon } from './helpers.js';

const run = (a, b, seed = 1, extra = {}) => simulateClashT8({ a, b, seed, config: { ruleset: 't8', policies: { a: 'none', b: 'none' }, ...(extra.config || {}) }, ...extra });
const ev = (r, kind, f = () => true) => r.log.filter((e) => e.kind === kind && f(e));
const M = (id, seed, ovr = 75, more = {}) => ({ ...mon(id, seed, { overall: ovr }), ...more });

// ---- a stub module registered on a BASIC family (charbun: Striker; Basics have no Dex Clash contract). The engine attaches any
// registered module for the species, so the stub drives every hook point without touching a Dex ability. Each test sets STUB.
const STUB_FAMILY = 'charbun';
let STUB = null;
registerClashAbility({ family: STUB_FAMILY, abilityId: 'TEST-STUB', initBattle: () => ({ n: 0 }), values: () => ({}),
  hooks: Object.fromEntries(CLASH_HOOKS.map((h) => [h, (api, self, info) => STUB?.[h]?.(api, self, info)])), review: { scenarios: [] } });

test('the stub is attached to the Basic species through the registry only', () => { assert.ok(clashContractOf(STUB_FAMILY)); const r = run([M('charbun', 1)], [M('pebble', 2)], 1, { stopAt: { exchange: 1 } }); assert.equal(r.lines.a[0].abilityId, 'TEST-STUB'); assert.equal(r.lines.a[0].combatant.contract, null, 'a Basic has no Dex contract'); });

test('delayed impacts: scheduled at ex n, resolved at the end of ex n+1 after rotations with frozen targets; the owner KO keeps its pre-KO strength; pending ones lapse at the cap (D8 provisional)', () => {
  const seen = [];
  STUB = { chooseAction: (api, self) => { if (api.ex() === 1) { api.delay(self, { targetSide: 'b', targetId: api.foe(self).id, after: 1 }); return { kind: 'done' }; } return null; },
    delayedImpact: (api, self, item) => { seen.push({ ex: api.ex(), item }); for (const id of [item.frozen.occupantId, ...item.frozen.others]) if (id) api.strike(self, id, { tag: 'delayed', mult: 1, exception: api.me(self).koed ? 'FIR-03-C' : undefined, normalAction: false }); } };
  const r = run([M('charbun', 1)], [M('pebble', 2), M('tidepaw', 3)], 1, { stopAt: { exchange: 2 } });
  assert.equal(ev(r, 'delayed_launch').length, 1); assert.equal(seen.length, 1); assert.equal(seen[0].ex, 2); assert.equal(seen[0].item.impactEx, 2); assert.equal(seen[0].item.slot, 'active');
  assert.deepEqual([seen[0].item.frozen.occupantId, ...seen[0].item.frozen.others], ['b0', 'b1']);
  const imp = ev(r, 'delayed_impact')[0]; assert.equal(imp.phase, 'end_of_exchange'); assert.ok(ev(r, 'damage', (e) => e.tag === 'delayed').length === 2);
  assert.ok(ev(r, 'rotation_phase', (e) => e.ex === 2)[0].seq < imp.seq, 'after the rotation phase');
  // pre-KO strength: the owner is Empowered, gets knocked out before the impact; the impact still uses the Empowered factor
  STUB.chooseAction = (api, self) => { if (api.ex() === 1) { api.delay(self, { targetSide: 'b', targetId: api.foe(self).id, after: 1 }); return { kind: 'done' }; } return null; };
  const r2 = run([M('charbun', 1), M('lumen', 9)], [M('voltfang', 2, 99)], 2, { stage: { a0: { hp: 1, status: { id: 'empowered', strength: 20, duration: 9 } } }, stopAt: { exchange: 2 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] });
  const ko = ev(r2, 'ko', (e) => e.target === 'a0')[0]; const imp2 = ev(r2, 'delayed_impact')[0]; assert.ok(ko && imp2 && ko.seq < imp2.seq && imp2.postKO);
  const d = ev(r2, 'damage', (e) => e.tag === 'delayed')[0]; assert.equal(d.outgoing, 1.2, 'pre-KO Empowered strength');
  // lapse at the cap: a launch at exchange 30 has no exchange 31
  STUB.chooseAction = (api, self) => { if (api.ex() === 30 && api.foe(self)) { api.delay(self, { targetSide: 'b', targetId: api.foe(self).id, after: 1 }); return { kind: 'done' }; } return { kind: 'skip' }; };
  const p = { chooseAction: (v, id) => (id[0] === 'b' ? { kind: 'skip' } : null) };
  const r3 = run([M('charbun', 1)], [M('pebble', 2)], 3, { probes: [p] });
  assert.ok(r3.capped); assert.equal(ev(r3, 'delayed_launch').length, 1); assert.equal(ev(r3, 'delayed_impact').length, 0); assert.ok(ev(r3, 'cancelled', (e) => /exchange-cap/.test(e.rule)).length === 1);
  assert.equal(r3.delayed.length, 0); assert.equal(T8_FLAGS.d8CapDelayed.value, 'discard');
  STUB = null;
});

test('P9 diagnostics: a third pending delayed impact on one side logs a diagnostic and still resolves (never a restriction)', () => {
  STUB = { chooseAction: (api, self) => { if (api.ex() <= 3) { api.delay(self, { targetSide: 'b', targetId: api.foe(self).id, after: 5 }); return { kind: 'done' }; } return { kind: 'skip' }; }, delayedImpact: () => {} };
  const r = run([M('charbun', 1)], [M('pebble', 2, 99)], 1, { stopAt: { exchange: 4 }, probes: [{ chooseAction: (v, id) => (id[0] === 'b' ? { kind: 'skip' } : null) }] });
  assert.equal(ev(r, 'delayed_launch').length, 3); assert.equal(r.diagnostics.overflow.length, 1); assert.equal(r.diagnostics.overflow[0].kind, 'delayed impacts per side');
  assert.equal(P9_CLASH_LIMITS.delayedPerSide, 2); assert.equal(P9_CLASH_LIMITS.constructsPerBattle, 2); assert.equal(P9_CLASH_LIMITS.dawnSongSchedulesPerSide(3), 3);
  STUB = null;
});

test('revive (D18): the revived monster returns at the back of the lineup with the given HP, its once-flags and cooldowns kept; statuses were cleared at KO', () => {
  STUB = { chooseAction: (api, self) => { const ko = api.lineup(self.side).filter((v) => v.koed); if (ko.length && !self.state.n) { self.state.n = 1; api.revive(self, ko[0].id, 10); api.executed(self); return { kind: 'done' }; } return null; } };
  // a0 dies first (1 HP), a1 (Pyronix) replaces it and revives a0 on its turn
  const r = run([M('tidepaw', 1, 50), M('charbun', 2, 90), M('lumen', 3)], [M('voltfang', 4, 90)], 1, { stage: { a0: { hp: 1, status: { id: 'weakened', strength: 10, duration: 9 } } }, stopAt: { exchange: 3 } });
  const rv = ev(r, 'revive')[0]; assert.ok(rv); assert.equal(rv.target, 'a0'); assert.deepEqual(rv.lineup, ['a1', 'a2', 'a0']);
  assert.deepEqual(r.lines.a.map((x) => x.id), ['a1', 'a2', 'a0']); const a0 = r.lines.a.find((x) => x.id === 'a0'); assert.ok(!a0.koed && a0.hp >= 10 - 0 && a0.status === null && a0.koOrder === null);
  assert.equal(r.mastery[a0 && r.lines.a[0].monsterId].executions, 1);
  STUB = null;
});

test('status transfer and removal: the episode moves 1:1 (strength, remaining, applications, pool); removeStatus takes the whole slot', () => {
  STUB = { chooseAction: (api, self) => { if (api.ex() === 1) { const foe = api.foe(self); const ok = api.transferStatus(self, foe.id, self.id); self.state.n = ok ? 1 : 0; return { kind: 'done' }; } if (api.ex() === 2) { api.removeStatus(self, self.id, 'stripped'); return { kind: 'done' }; } return null; } };
  const r = run([M('charbun', 1)], [M('pebble', 2, 99)], 1, { stage: { b0: { status: { id: 'shielded', strength: 40, duration: 5 } } }, stopAt: { exchange: 2 }, probes: [{ chooseAction: (v, id) => (id === 'b0' ? { kind: 'skip' } : null) }] });
  const t = ev(r, 'status', (e) => e.from === 'b0')[0]; assert.ok(t); assert.equal(t.target, 'a0'); assert.equal(t.slot.pool, 40); assert.equal(t.slot.applications, 1); assert.equal(t.slot.remaining, 5);
  assert.ok(ev(r, 'status_end', (e) => e.target === 'b0' && e.reason === 'transferred').length === 1);
  assert.ok(ev(r, 'status_end', (e) => e.target === 'a0' && e.reason === 'stripped').length === 1);
  STUB = null;
});

test('signature restriction: the restricted active uses the ordinary attack; the count follows its own turns (two recipient normal turns after application)', () => {
  STUB = { chooseAction: (api, self) => { if (api.ex() === 1) { api.restrictSignature(self, api.foe(self).id, 2); return { kind: 'done' }; } return null; } };
  const r = run([M('charbun', 1)], [M('pebble', 2, 99)], 1, { stopAt: { exchange: 4 } });
  assert.equal(ev(r, 'signature_restricted', (e) => e.target === 'b0').length, 1);
  const applied = ev(r, 'signature_restricted')[0]; const b0TurnBefore = ev(r, 'turn_start', (e) => e.actor === 'b0' && e.ex === 1 && e.seq < applied.seq).length === 1;
  assert.equal(ev(r, 'signature_restriction_end').length, 1); assert.equal(ev(r, 'signature_restriction_end')[0].ex, b0TurnBefore ? 3 : 2, 'two recipient normal turns after the application');
  assert.equal(ev(r, 'signature_restricted', (e) => e.actor === 'b0' && e.restricted).length, 0, 'a Tank with no repeatable signature has nothing to restrict (the Dex family of pebble has a once-per-Clash reaction)');
  assert.equal(r.lines.b[0].sigRestrict, null);
  STUB = null;
});

test('cooldown clocks: start, query, extend (Circuit Breaker-type) and reduce to zero (Fresh Start-type restores readiness only)', () => {
  STUB = { chooseAction: (api, self) => { const e = api.ex(); if (e === 1) { api.cooldown(self, 5); return { kind: 'done' }; } if (e === 2) { assert.equal(api.cooldownLeft(self), 5, 'the start turn is excluded'); api.adjustCooldown(self, self.id, 'TEST-STUB', +2); self.state.n = api.cooldownLeft(self); return { kind: 'done' }; } if (e === 3) { api.adjustCooldown(self, self.id, 'TEST-STUB', -10); assert.ok(api.ready(self)); return { kind: 'done' }; } return null; } };
  const r = run([M('charbun', 1)], [M('pebble', 2, 99)], 1, { stopAt: { exchange: 3 } });
  assert.equal(r.lines.a[0].ability.n, 7); assert.equal(ev(r, 'clock_adjust').length, 2); assert.ok(ev(r, 'clock_end', (e) => /readiness restored/.test(e.text)).length === 1);
  STUB = null;
});

test('retaliation guard: a non-attacker\'s strike from a reaction context is refused while the triggering strike suppresses retaliation or is itself a reaction; the attacker\'s own follow-up is allowed', () => {
  let tries = 0;
  STUB = { afterWholeAttack: (api, self, info) => { if (info.attackerId !== self.id && api.get(info.attackerId).side !== self.side) { tries++; const r = api.strike(self, info.attackerId, { tag: 'reaction', mult: 0.5 }); self.state.n += r.suppressed ? 10 : 1; } } };
  const supp = { chooseAction: (v, id) => (id === 'b0' ? { kind: 'attack', abilityId: 'TEST-LANCE', mult: 1, suppressRetaliation: true } : null) };
  const r = run([M('charbun', 1, 90)], [M('pebble', 2, 99)], 1, { stopAt: { exchange: 2 }, probes: [supp] });
  assert.ok(tries >= 2); assert.ok(r.lines.a[0].ability.n >= 20 && r.lines.a[0].ability.n % 10 === 0, 'every counter was suppressed');
  assert.ok(ev(r, 'unmet', (e) => e.unmet.some((u) => u.condition === 'retaliation allowed')).length >= 2);
  const r2 = run([M('charbun', 1, 90)], [M('pebble', 2, 99)], 1, { stopAt: { exchange: 2 } });
  assert.ok(r2.lines.a[0].ability.n >= 1 && r2.lines.a[0].ability.n < 10, 'ordinary attacks allow the reaction');
  assert.ok(ev(r2, 'damage', (e) => e.tag === 'reaction').length >= 1);
  STUB = null;
});

test('team action and pre-initiative windows are asked of living reserves; onEntry / anyKO / anyEndOfTurn fire; staged ability state is a labelled prerequisite', () => {
  const calls = { teamAction: 0, preInitiative: 0, anyEndOfTurn: 0, onEntry: 0, anyKO: 0 };
  STUB = { teamAction: () => { calls.teamAction++; return null; }, preInitiative: (api, self, info) => { calls.preInitiative++; return api.ex() === 2 ? { advance: info.activeId } : null; }, anyEndOfTurn: () => { calls.anyEndOfTurn++; }, onEntry: () => { calls.onEntry++; }, anyKO: () => { calls.anyKO++; } };
  const r = run([M('tidepaw', 1, 95), M('charbun', 2)], [M('voltfang', 3, 95), M('pebble', 4, 40, {})], 1, { stage: { a1: { ability: { n: 7 } } }, stopAt: { exchange: 3 } });
  assert.ok(calls.teamAction >= 3 && calls.preInitiative >= 1 && calls.anyEndOfTurn >= 4);
  assert.ok(ev(r, 'initiative', (e) => /advanced by/.test(e.by)).length === 1, 'Second Wind-type advance');
  assert.ok(ev(r, 'stage', (e) => e.controlled && e.abilityId === 'TEST-STUB').length === 1); assert.equal(r.lines.a[1].ability.n, 7); assert.ok(r.staged);
  assert.throws(() => run([M('charbun', 1)], [M('pebble', 2)], 1, { stage: { a0: { ability: { bogus: 1 } } } }), /not a field/);
  assert.throws(() => run([M('charbun', 1)], [M('pebble', 2)], 1, { stage: { b0: { ability: { n: 1 } } } }), /no Clash contract/);
  STUB = null;
});

test('abilities: "off" plays the no-contract action for every monster (S1-S4 semantics); the config records it', () => {
  STUB = { chooseAction: () => { throw new Error('contract consulted with abilities off'); } };
  const r = run([M('charbun', 1)], [M('pebble', 2)], 1, { config: { abilities: 'off' } });
  assert.equal(r.config.abilities, 'off'); assert.equal(r.lines.a[0].abilityId, null); assert.ok(ev(r, 'damage', (e) => e.actor === 'a0' && e.tag === 'ordinary').length > 0);
  assert.throws(() => run([M('charbun', 1)], [M('pebble', 2)], 1, { config: { abilities: 'maybe' } }), /abilities must be/);
  STUB = null;
});

// ---- §9 fixtures: Root Communion apportionment and Mind Mend floors
test('Root Communion apportionment (§9): conserves the total exactly, each member in [1, max], fractional ties by stable id, Healing Reduced floors the gains only', () => {
  const r = apportionHp([{ id: 'a0', hp: 10, maxHp: 100 }, { id: 'a1', hp: 90, maxHp: 100 }, { id: 'a2', hp: 50, maxHp: 50 }]);
  assert.equal(r.reduce((s, x) => s + x.target, 0), 150, 'conserved'); assert.deepEqual(r.map((x) => x.target), [60, 60, 30]);
  const r2 = apportionHp([{ id: 'a0', hp: 1, maxHp: 101 }, { id: 'a1', hp: 100, maxHp: 101 }, { id: 'a2', hp: 50, maxHp: 101 }]);
  assert.equal(r2.reduce((s, x) => s + x.target, 0), 151); assert.ok(r2.every((x) => x.target >= 1 && x.target <= 101));
  assert.deepEqual(r2.map((x) => x.target), [51, 50, 50], 'the remainder goes to the first by stable id on equal fractions');
  const r3 = apportionHp([{ id: 'a0', hp: 1, maxHp: 100, healFactor: 0.5 }, { id: 'a1', hp: 99, maxHp: 100 }]);
  assert.deepEqual(r3.map((x) => [x.target, x.after, x.lost]), [[50, 25, 25], [50, 50, 0]], 'the reduced gain is floored; lost healing is not redistributed');
  assert.equal(r3.reduce((s, x) => s + x.after, 0), 75, 'the total after Healing Reduced is lower: lost gains are gone');
  const r4 = apportionHp([{ id: 'a0', hp: 1, maxHp: 1000 }, { id: 'a1', hp: 2, maxHp: 10 }]); assert.ok(r4.every((x) => x.target >= 1)); assert.equal(r4[0].target + r4[1].target, 3);
});
test('Mind Mend floors (§9): donation = floor(pct of source max), bounded by target missing HP and source HP - 1; the actual gain is floored after Healing Reduced; no affordable donation -> null', () => {
  assert.deepEqual(mindMendDonation({ sourceHp: 100, sourceMaxHp: 105, pct: 10, targetHp: 50, targetMaxHp: 100 }), { donation: 10, credit: 10, gain: 10, lost: 0 });
  assert.deepEqual(mindMendDonation({ sourceHp: 100, sourceMaxHp: 105, pct: 10, targetHp: 97, targetMaxHp: 100 }), { donation: 3, credit: 3, gain: 3, lost: 0 });
  assert.deepEqual(mindMendDonation({ sourceHp: 5, sourceMaxHp: 105, pct: 10, targetHp: 50, targetMaxHp: 100 }), { donation: 4, credit: 4, gain: 4, lost: 0 });
  assert.deepEqual(mindMendDonation({ sourceHp: 100, sourceMaxHp: 105, pct: 10, targetHp: 50, targetMaxHp: 100, healFactor: 0.55 }), { donation: 10, credit: 10, gain: 5, lost: 5 });
  assert.equal(mindMendDonation({ sourceHp: 1, sourceMaxHp: 105, pct: 10, targetHp: 50, targetMaxHp: 100 }), null);
  assert.equal(mindMendDonation({ sourceHp: 100, sourceMaxHp: 105, pct: 10, targetHp: 100, targetMaxHp: 100 }), null);
});

test('the S5 provisional defaults are listed with what they wait on', () => {
  for (const id of ['delayed-slot-active-position', 'retaliation-suppression-scope', 'performed-attack-at-launch', 'healed-hook-kinds', 'p8-status-chances-none']) assert.ok(T8_PROVISIONAL.find((p) => p.id === id)?.waitsOn, id);
});
