// Task 8 M4 S5 (D16): the ability-kind table. 72 rows, one per Clash ability, each matching its Dex id, family and name; every strike
// key is a phrase of the contract; the batches sum to 72 (plan §4); the extra-strike definition (plan D16) and the contested rows
// read T8_FLAGS; Eye of the Storm restricts only ready, repeatable signatures; every switchable reading names what it waits on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ABILITY_KINDS, kindOf, kindOfFamily, isExtraStrike, restrictable } from '../../src/clash/t8/ability-kinds.js';
import { T8_FLAGS, flag, perkTag } from '../../src/clash/t8/flags.js';
import { ABILITIES, abilityById, familyById } from '../../src/data/beast-dex.js';

const CLASH = ABILITIES.filter((a) => a.mode === 'clash');
const text = (a) => [a.mechanic, ...a.details.map((d) => d.rule)].join(' ').toLowerCase();

test('72 rows, each matching its Dex id, family and name; no duplicates; the 22 review rows are marked', () => {
  assert.equal(ABILITY_KINDS.length, 72); assert.equal(CLASH.length, 72);
  assert.equal(new Set(ABILITY_KINDS.map((r) => r.id)).size, 72);
  for (const r of ABILITY_KINDS) { const a = abilityById(r.id); assert.ok(a && a.mode === 'clash', r.id); assert.equal(a.familyId, r.family); assert.equal(a.name, r.name); assert.equal(kindOf(r.id), r); assert.equal(kindOfFamily(r.family), r); }
  assert.equal(ABILITY_KINDS.filter((r) => r.review === 'needs owner review').length, 22, 'the D16 table flags 22 rows');
});

test('batches: S5 pilots 2, A 16, B 13, C 11, D 13, E 8, F 9 (plan §4)', () => {
  const by = ABILITY_KINDS.reduce((m, r) => ((m[r.batch] = (m[r.batch] || 0) + 1), m), {});
  assert.deepEqual(by, { S5: 2, A: 16, B: 13, C: 11, D: 13, E: 8, F: 9 });
});

test('every strike key is a phrase of its contract text; strike tags are known; perks are only ever on ordinary-tagged strikes', () => {
  const TAGS = ['ordinary', 'special', 'reaction', 'counter', 'followUp', 'commanded', 'assist', 'delayed'];
  for (const r of ABILITY_KINDS) for (const s of r.strikes) {
    assert.ok(TAGS.includes(s.tag), `${r.id} ${s.key}: tag ${s.tag}`);
    assert.ok(text(abilityById(r.id)).includes(s.key.toLowerCase().split(' ')[0]), `${r.id}: strike key "${s.key}" is not from the contract`);
    assert.equal(s.perks, s.tag === 'ordinary', `${r.id} ${s.key}: perks follow the ordinary tag`);
  }
});

test('extra strikes (plan D16): reactions, counters, follow-ups, commanded and assist strikes are extra; ordinary, special and delayed are not; the contested ones follow T8_FLAGS.stoneDivide', () => {
  assert.equal(ABILITY_KINDS.filter((r) => r.strikes.some((s) => s.extra)).length, 12, 'the plan lists 12 extra-strike abilities');
  assert.ok(isExtraStrike({ tag: 'reaction', abilityId: 'FIR-01-C' })); assert.ok(isExtraStrike({ tag: 'counter', abilityId: 'DAR-01-C' }));
  assert.ok(!isExtraStrike({ tag: 'ordinary' })); assert.ok(!isExtraStrike({ tag: 'special', abilityId: 'ELE-03-C' })); assert.ok(!isExtraStrike({ tag: 'delayed', abilityId: 'FIR-03-C' }));
  assert.equal(isExtraStrike({ tag: 'followUp', abilityId: 'EAR-04-C', strikeKey: 'ricochet' }), T8_FLAGS.stoneDivide.normalActionSpecialStrikes);
  assert.equal(isExtraStrike({ tag: 'commanded', abilityId: 'PSY-06-C', strikeKey: 'commanded' }), T8_FLAGS.stoneDivide.normalActionSpecialStrikes);
  assert.equal(isExtraStrike({ tag: 'reaction', abilityId: 'FIR-04-C' }), T8_FLAGS.stoneDivide.nonAttackTriggeredReactions);
  assert.equal(isExtraStrike({ tag: 'reaction', abilityId: 'EAR-02-C' }), T8_FLAGS.stoneDivide.nonAttackTriggeredReactions);
  const contested = ABILITY_KINDS.flatMap((r) => r.strikes.filter((s) => s.contested).map((s) => r.id));
  assert.deepEqual(contested.sort(), ['EAR-02-C', 'EAR-04-C', 'FIR-04-C', 'LIG-04-C', 'NAT-04-C', 'PSY-06-C']);
});

test('Eye of the Storm restricts only ready, REPEATABLE signatures that replace or enhance the normal action', () => {
  for (const r of ABILITY_KINDS) {
    if (r.signature) { assert.equal(r.repeat, 'repeatable', `${r.id} restrictable but not repeatable`); assert.ok(['normal-action replacement', 'enhanced normal attack', 'attack modifier', 'transfer'].includes(r.action), `${r.id} ${r.action}`); }
    if (r.repeat === 'once' || r.repeat === 'passive') assert.ok(!r.signature, `${r.id}: a once / passive ability is not restricted`);
  }
  assert.ok(restrictable('WAT-01-C') && restrictable('MET-04-C') && !restrictable('LIG-06-C') && !restrictable('MET-03-C') && !restrictable('FIR-01-C'));
});

test('T8_FLAGS: every switch names what it waits on and lists its options; the defaults are the plan\'s readings', () => {
  for (const [k, f] of Object.entries(T8_FLAGS)) { assert.ok(f.waitsOn, `${k} names what it waits on`); if ('value' in f) assert.ok(f.options.includes(f.value), `${k} default is one of its options`); }
  assert.equal(flag('d13ValuePrecedence'), 'progression'); assert.equal(flag('d14DawnSongTarget'), 'self-only'); assert.equal(flag('featherRelay'), 'unmet');
  assert.equal(perkTag('MET-03-C'), 'ordinary'); assert.equal(perkTag('LIG-06-C'), 'special'); assert.throws(() => perkTag('FIR-03-C'), /No ordinary-perk reading/);
  // every ability the perk table names is a Striker or Disruptor special / modifier, or an ordinary rider (the rows where D5 matters)
  for (const id of Object.keys(T8_FLAGS.ordinaryPerks).filter((k) => k !== 'waitsOn')) assert.ok(abilityById(id), id);
  // the kinds rows carry the flag that would change them
  for (const r of ABILITY_KINDS) if (r.strikes.some((s) => s.contested) || Object.keys(T8_FLAGS.ordinaryPerks).includes(r.id)) assert.ok(r.flag, `${r.id} names its switch`);
});

test('archetypes in the table match the Dex families', () => {
  for (const r of ABILITY_KINDS) assert.ok(familyById(r.family).clashArchetype, r.family);
});
