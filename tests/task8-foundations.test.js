// Task 8 foundation modules (not wired into gameplay): Beast Dex adapter, Temper table, exact fractions, reward ledger,
// ability-review catalogue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as dex from '../src/data/beast-dex.js';
import { TEMPERS, TEMPER_IDS, NEUTRAL_TEMPERS, temperEfficiency, drawTemper } from '../src/data/temper.js';
import * as F from '../src/core/fraction.js';
import { createRewardLedger, applyActivity, byMonster, wasAwarded, isComplete, prune } from '../src/franchise/reward-ledger.js';
import { buildCatalogue, catalogueProblems, MASTERY_TIERS } from '../src/lab/ability-catalogue.js';
import { createRng } from '../src/core/rng.js';

test('generated Beast Dex module matches the GitHub Dex JSON', () => {
  execFileSync(process.execPath, ['tools/build-beast-dex.mjs', '--check'], { stdio: 'pipe' });
});

test('Dex adapter: 192 families, 222 forms, 144 abilities; Basics have one form and no unique abilities', () => {
  const c = dex.dexCounts();
  assert.equal(c.families, 192); assert.equal(c.forms, 222); assert.equal(c.abilities, 144);
  assert.deepEqual(c.byMode, { football: 72, clash: 72 });
  assert.equal(c.byRarity.basic, 120);
  for (const f of dex.FAMILIES) {
    assert.ok(dex.RARITY_ORDER.includes(f.rarity), f.id); assert.ok(dex.POSITIONS.includes(f.position), f.id); assert.ok(dex.ARCHETYPES.includes(f.clashArchetype), f.id);
    const forms = dex.formsOf(f.id); assert.ok(forms.length >= 1, f.id);
    forms.forEach((fm, i) => { assert.equal(fm.stage, i); assert.equal(fm.id, dex.formId(f.id, i)); assert.equal(dex.formById(fm.id), fm); });
    const ab = dex.abilitiesOf(f.id);
    if (f.rarity === 'basic') { assert.equal(forms.length, 1); assert.equal(dex.evolves(f.id), false); assert.equal(ab.football, null); assert.equal(ab.clash, null); assert.ok(dex.archetypeOf(f.id)); }
    else { assert.equal(ab.football.mode, 'football'); assert.equal(ab.clash.mode, 'clash'); assert.equal(ab.football.familyId, f.id); }
  }
  assert.equal(dex.familyById('no-such-family'), null);
  assert.equal(dex.nextForm(dex.FAMILIES.find((f) => f.rarity === 'basic').id, 0), null);
  assert.throws(() => { dex.FAMILIES[0].rarity = 'x'; });
});

test('Temper table: 25 tempers, 22 directional pairs + 3 neutral, kicking never affected', () => {
  assert.equal(TEMPER_IDS.length, 25); assert.deepEqual([...NEUTRAL_TEMPERS], ['calm', 'balanced', 'steady']);
  const pairs = new Set();
  for (const id of TEMPER_IDS) {
    const t = TEMPERS[id];
    if (!t.favored) continue;
    assert.notEqual(t.favored, t.unfavored); assert.notEqual(t.favored, 'kicking'); assert.notEqual(t.unfavored, 'kicking');
    pairs.add(`${t.favored}>${t.unfavored}`);
    assert.equal(temperEfficiency(id, t.favored), 2); assert.equal(temperEfficiency(id, t.unfavored), 0.5); assert.equal(temperEfficiency(id, 'kicking'), 1);
  }
  assert.equal(pairs.size, 22);
  for (const a of dex.ATTRIBUTES.filter((x) => x !== 'kicking')) {
    assert.equal(TEMPER_IDS.filter((id) => TEMPERS[id].favored === a).length, 2, a); assert.equal(TEMPER_IDS.filter((id) => TEMPERS[id].unfavored === a).length, 2, a);
  }
  for (const id of NEUTRAL_TEMPERS) for (const a of dex.ATTRIBUTES) assert.equal(temperEfficiency(id, a), 1);
  assert.throws(() => temperEfficiency('grumpy', 'speed'));
  const rng = createRng(7); for (let i = 0; i < 200; i++) assert.ok(NEUTRAL_TEMPERS.includes(drawTemper(rng, { apex: true })));
  const seen = new Set(); for (let i = 0; i < 2000; i++) seen.add(drawTemper(rng)); assert.equal(seen.size, 25);
});

test('fractions stay exact and normalized; display conversion is separate', () => {
  let x = F.ZERO; for (let i = 0; i < 16; i++) x = F.add(x, F.frac(1, 16)); assert.ok(F.eq(x, F.ONE));
  assert.deepEqual(F.frac(0.0625), { n: 1, d: 16 }); assert.deepEqual(F.frac(6, -4), { n: -3, d: 2 });
  assert.deepEqual(F.div(F.frac(5, 2), F.frac(1, 2)), { n: 5, d: 1 });
  assert.equal(F.floor(F.frac(-1, 2)), -1); assert.deepEqual(F.fracPart(F.frac(7, 4)), { n: 3, d: 4 });
  assert.ok(F.isFraction(JSON.parse(JSON.stringify(F.frac(3, 8)))));
  assert.throws(() => F.frac(0.1)); assert.throws(() => F.frac(1, 0)); assert.throws(() => F.div(1, 0));
  assert.throws(() => F.mul(F.frac(2 ** 40), F.frac(2 ** 40)), RangeError);
});

test('reward ledger: once per activity and monster, aggregated by monster, resumable after interruption', () => {
  const L = createRewardLedger(); const got = [];
  const rows = byMonster([{ monsterId: 'm2', snaps: 3 }, { monsterId: 'm1', snaps: 2 }, { monsterId: 'm2', snaps: 4 }], (a, b) => ({ monsterId: a.monsterId, snaps: a.snaps + b.snaps }));
  assert.deepEqual(rows.find((r) => r.monsterId === 'm2'), { monsterId: 'm2', snaps: 7 });
  let boom = true;
  assert.throws(() => applyActivity(L, 'fb:2027:w1:g1', rows, (e) => { if (e.monsterId === 'm2' && boom) throw new Error('crash'); got.push(e.monsterId); }));
  assert.ok(wasAwarded(L, 'fb:2027:w1:g1', 'm1')); assert.ok(!wasAwarded(L, 'fb:2027:w1:g1', 'm2')); assert.ok(!isComplete(L, 'fb:2027:w1:g1'));
  boom = false;
  const r = JSON.parse(JSON.stringify(L)); // survives a save/load in between
  const res = applyActivity(r, 'fb:2027:w1:g1', rows, (e) => got.push(e.monsterId));
  assert.deepEqual(res.applied, ['m2']); assert.deepEqual(res.skipped, ['m1']); assert.deepEqual(got, ['m1', 'm2']);
  assert.deepEqual(applyActivity(r, 'fb:2027:w1:g1', rows, () => assert.fail('re-applied')).applied, []);
  assert.throws(() => applyActivity(r, 'x', [{ monsterId: 'a' }, { monsterId: 'a' }], () => {}));
  assert.throws(() => applyActivity(r, 'has space', [], () => {}));
  prune(r, (id) => id.startsWith('fb:2028')); assert.deepEqual(r.activities, {});
});

test('ability catalogue lists all 144 abilities, every form × mastery variant, and all 120 Basics without unique abilities', () => {
  const cat = buildCatalogue();
  assert.deepEqual(catalogueProblems(cat), []);
  assert.equal(cat.entries.length, 144);
  assert.equal(cat.familiesWithoutUniqueAbilities.length, 120);
  const formsWithAbilities = dex.FORMS.filter((f) => !dex.isBasic(f.familyId)).length; // 102
  assert.equal(formsWithAbilities, 102);
  assert.equal(cat.entries.reduce((s, e) => s + e.variants.length, 0), 2 * formsWithAbilities * MASTERY_TIERS.length);
});

test('approved rulings: overrides applied, source text kept, values exposed (N7b P1-P3, P7, P8, P10)', async () => {
  const v = await import('../src/data/approved-values.js');
  assert.equal(v.stokeTheFlamePct('emberfox:0', 'Developing'), 60); assert.equal(v.stokeTheFlamePct('emberfox:2', 'Mastered'), 95); assert.equal(v.stokeTheFlamePct('emberfox:1', 'Expert'), 80);
  assert.equal(v.blazingResolveQualifies('emberfox:0', 7), false); assert.equal(v.blazingResolveQualifies('emberfox:0', 8), true);
  assert.equal(v.blazingResolveQualifies('emberfox:1', 4), false); assert.equal(v.blazingResolveQualifies('emberfox:1', 5), true);
  assert.equal(v.blazingResolveQualifies('emberfox:2', 0), false); assert.equal(v.blazingResolveQualifies('emberfox:2', 1), true);
  assert.deepEqual(['Developing', 'Practiced', 'Expert', 'Mastered'].map((t) => v.beaconLaneLifetime('glimmer:1', t)), [1, 1, 2, 2]);
  assert.equal(v.shadowPounceDodgePct('shadowkit:0', false), 15); assert.equal(v.shadowPounceDodgePct('shadowkit:1', false), 20); assert.equal(v.shadowPounceDodgePct('shadowkit:1', true), 0);
  assert.equal(v.mindGameAfterimagePct(false), 15); assert.equal(v.mindGameAfterimagePct(true), 0);
  assert.deepEqual(v.rotationEntryPenalty({ firstAfterVoluntaryRotation: true }), { factor: 0.5, spent: true });
  assert.deepEqual(v.rotationEntryPenalty({ firstAfterVoluntaryRotation: true, stunnedSkip: true }), { factor: 1, spent: true });
  assert.deepEqual(v.rotationEntryPenalty({ firstAfterVoluntaryRotation: false }), { factor: 1, spent: false });
  assert.throws(() => v.stokeTheFlamePct('glimmer:0', 'Developing')); assert.throws(() => v.beaconLaneLifetime('glimmer:0', 'Legend'));
  const br = dex.abilityById('FIR-01-F').details.find((d) => d.section === 'Core resolution');
  assert.match(br.rule, /No one-second window/); assert.match(br.supersededRule, /one live second/); assert.equal(br.ruling.startsWith('N7b P2'), true);
  for (const id of ['clash-rotation', 'ordinary-attacks-connect', 'live-kickoffs', 'football-stunned-scope', 'collection-achievements']) assert.ok(dex.approvedRule(id).rule);
  assert.throws(() => dex.approvedRule('universal-evasion'));
});
