import test from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, FAMILIES } from '../src/data/beast-dex.js';
import { plainAbilityRule } from '../src/text/ability-rules-plain.js';
import { abilityInfo } from '../src/ui/ability-info.js';
const sections = ['Trigger / eligibility','Targets / placement','Core resolution','Recharge / frequency','Lifetime / persistence','Exceptions / counterplay','Progression / notes'];
const numbers = text => [...text.matchAll(/\d+(?:\.\d+)?/g)].map(m => m[0]);
test('all 144 abilities have readable sections with every numeric value preserved', () => {
  const before = JSON.stringify(ABILITIES);
  let checked = 0;
  for (const a of ABILITIES) for (const d of a.details.filter(d => sections.includes(d.section))) {
    const plain = plainAbilityRule(d.rule);
    assert.ok(plain.trim(), `${a.id} ${d.section}`);
    assert.deepEqual(numbers(plain), numbers(d.rule), `${a.id} ${d.section}: exact numbers`);
    checked++;
  }
  assert.equal(checked, ABILITIES.length * 7);
  for (const f of FAMILIES) for (const mode of ['football','clash']) {
    const info = abilityInfo(f.id, mode); if (!info) continue;
    assert.equal(info.sections.length, 7);
  }
  assert.equal(JSON.stringify(ABILITIES), before, 'simulation contracts untouched');
});
test('turn timing and choice-based switching remain explicit', () => {
  const text = plainAbilityRule('THREE subsequent OWNER NORMAL TURNS; application turn excluded, Stunned skips count, reserve time/reactions do not.');
  assert.match(text, /THREE more turns taken by this beast/);
  assert.match(text, /do not count the turn/i);
  assert.match(text, /missed because of Stunned still count/);
  assert.match(plainAbilityRule('Next voluntary rotation request'), /request to switch out by choice/);
});
test('word replacements do not damage longer words or names', () => {
  const text = plainAbilityRule('Persistence; immediate; immediately; invalid; valid; ineligible; Shadow Pounce.');
  assert.match(text, /Persistence/);
  assert.match(text, /Right away/);
  assert.match(text, /Ineligible/);
  assert.match(text, /Shadow Pounce/);
  assert.ok(!text.includes('lastence'));
});

test('engine words used as another part of speech still read as sentences (no mangled replacements)', () => {
  const BAD = [/(?:cannot|can|to|not|never) time before the ability is ready again/i, /use of the ability (?:play|reception|snap)\b/i, /[a-z,] (?:While this beast|Only this beast)/,
    /right away start/i, /ready again\/|\/wait before|wait before using this ability again \d/i, /\b(?:attack|DL|tackle|switch) keeps\.$/m, /place-aligned/];
  for (const a of ABILITIES) for (const d of a.details.filter(d => sections.includes(d.section))) {
    const plain = plainAbilityRule(d.rule);
    for (const re of BAD) assert.ok(!re.test(plain), `${a.id} ${d.section}: ${re} in "${plain}"`);
  }
  assert.equal(plainAbilityRule('Activation play cannot recharge.'), 'The play that uses the ability cannot add charge.');
  assert.equal(plainAbilityRule('Cooldown 5 / 4 / 3 / 2 subsequent offensive plays.'), 'Wait of 5 / 4 / 3 / 2 later offensive plays.');
  assert.match(plainAbilityRule('Front ally, self only if actually front.'), /, only this beast/);
});
