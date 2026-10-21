// Beast Clash stats: evolution, fatigue, nature and archetype each enter exactly once; displayed equals engine; no mutation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCombatant } from '../../src/clash/stats.js';
import { battleConfig, CLASH_VALUES } from '../../src/clash/values.js';
import { effectiveAttributes, overall, tryEvolve, NATURES } from '../../src/data/monsters.js';
import { mon, deepFrozen } from './helpers.js';

const V = CLASH_VALUES;
const build = (m, o = {}) => buildCombatant(m, { perSide: 3, config: battleConfig({}), ...o });

test('the combatant is built from one effectiveAttributes() call and overall() on that same result', () => {
  const m = mon('emberfox', 3, { fatigue: 40 }); m.nature = 'powerful';
  const c = build(m);
  const e = effectiveAttributes(m, {}); assert.deepEqual(c.breakdown.attributes, e);
  assert.equal(c.overall, overall(e, m.position));
  // Rebuilding from a monster whose stored attributes already equal the effective ones, with fatigue 0 and a
  // neutral nature, gives the same battle stats: nothing is applied a second time downstream.
  const flat = { ...m, attributes: { ...e }, fatigue: 0, nature: 'balanced' };
  assert.ok(!NATURES.balanced.up, 'balanced nature is neutral');
  const c2 = build(flat); assert.equal(c2.hp, c.hp); assert.equal(c2.atk, c.atk); assert.equal(c2.spd, c.spd);
});

test('fatigue enters once, through the attributes, and lowers attack and HP by a few percent at most', () => {
  for (const id of ['emberfox', 'pebble', 'stormlynx']) {
    const fresh = build(mon(id, 5)), tired = build(mon(id, 5, { fatigue: 100 }));
    assert.ok(tired.atk <= fresh.atk && tired.atk >= fresh.atk * 0.93, `${id} attack ${fresh.atk} -> ${tired.atk}`);
    assert.ok(tired.hp <= fresh.hp && tired.hp >= fresh.hp * 0.96, `${id} hp ${fresh.hp} -> ${tired.hp}`);
    assert.equal(tired.fatigue, 100);
  }
});

test('evolution enters once: an evolved form is stronger only through its stored attributes (no extra multiplier)', () => {
  const m = mon('emberfox', 7); const before = build(m);
  const copy = structuredClone(m); copy.level = 10; const ev = tryEvolve(copy); assert.ok(ev && copy.stage === 1);
  const after = build(copy);
  assert.ok(after.hp > before.hp && after.atk > before.atk, 'evolution lifted the battle stats');
  // The same stat step appears if we only copy the evolved attributes onto the unevolved record: the stage itself adds nothing.
  const attrsOnly = { ...m, attributes: { ...copy.attributes }, potential: copy.potential };
  const viaAttrs = build(attrsOnly); assert.equal(viaAttrs.hp, after.hp); assert.equal(viaAttrs.atk, after.atk);
  assert.deepEqual(m, mon('emberfox', 7), 'the original monster is unchanged');
});

test('nature once: swapping the nature changes exactly the boosted and lowered attribute by x1.1 / x0.9', () => {
  const m = mon('ashkit', 9); m.nature = 'balanced'; const base = effectiveAttributes(m, {});
  const n = Object.entries(NATURES).find(([, v]) => v.up && v.down); const [name, nat] = n; const m2 = { ...m, nature: name }; const e2 = effectiveAttributes(m2, {});
  for (const k of Object.keys(base)) { const want = k === nat.up ? Math.round(base[k] * 1.1) : k === nat.down ? Math.round(base[k] * 0.9) : base[k]; assert.ok(Math.abs(e2[k] - want) <= 1, `${k}: ${e2[k]} vs ${want}`); }
  assert.equal(build(m2).breakdown.attributes[nat.up], e2[nat.up]);
});

test('archetype once: removing the archetype multiplier divides the final stat by exactly that multiplier', () => {
  for (const id of ['pebble', 'emberfox', 'tidepaw', 'stormlynx', 'ashkit']) {
    const c = build(mon(id, 11)); const a = V.archetypes[c.archetype]; const b = c.breakdown;
    assert.equal(c.hp, Math.round(b.hpBase * a.hp * b.durabilityTilt * b.o2), `${id} hp`);
    assert.equal(c.atk, Math.round(b.atkBase * a.atk * b.strengthTilt * 100) / 100, `${id} atk`);
  }
});

test('displayed equals engine: the breakdown carries the exact HP, attack and speed the engine fights with', () => {
  for (const id of ['glimmer', 'titanolith', 'aurodrax']) { const c = build(mon(id, 13)); assert.equal(c.breakdown.hp, c.hp); assert.equal(c.breakdown.atk, c.atk); assert.equal(c.breakdown.spd, c.spd); assert.ok(deepFrozen(c)); }
});

test('O2 is off by default and, when on, lifts only Tanks and only in 4-5 per side battles, without touching the monster', () => {
  const tank = mon('pebble', 2), striker = mon('emberfox', 2);
  const off5 = buildCombatant(tank, { perSide: 5, config: battleConfig({}) }), on5 = buildCombatant(tank, { perSide: 5, config: battleConfig({ O2: true }) }), on3 = buildCombatant(tank, { perSide: 3, config: battleConfig({ O2: true }) });
  assert.equal(on5.hp, Math.round(off5.breakdown.hpBase * V.archetypes.Tank.hp * off5.breakdown.durabilityTilt * 1.06)); assert.equal(on3.hp, off5.hp);
  assert.equal(buildCombatant(striker, { perSide: 5, config: battleConfig({ O2: true }) }).hp, buildCombatant(striker, { perSide: 5, config: battleConfig({}) }).hp);
  assert.deepEqual(tank, mon('pebble', 2)); assert.equal(tank.attributes.durability, mon('pebble', 2).attributes.durability);
});
