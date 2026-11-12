// Beast Dex wording for display (src/text/dex.js, central text stage 5). The Dex data keeps its English and every id; a screen
// shows a Dex line through dexLine(key, english). These tests hold the two halves together: every line a screen can ask for is in
// the translator's list (tools/dex-text.mjs), and a language's line is what the screen then shows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dexEnglish } from '../tools/dex-text.mjs';
import { dexKey, dexLine, SECTION_SLUG } from '../src/text/dex.js';
import { setLanguage, tOr, englishText } from '../src/text/index.js';
import { FAMILIES, ABILITIES } from '../src/data/beast-dex.js';
import { abilityInfo } from '../src/ui/ability-info.js';

const LIST = dexEnglish();

test('the translator list holds every family description, every ability name and rule the screens show', () => {
  for (const f of FAMILIES) assert.equal(LIST[dexKey.familyDescription(f.id)], f.description, f.id);
  for (const a of ABILITIES) {
    assert.equal(LIST[dexKey.abilityName(a.id)], a.name, a.id);
    for (const d of a.details || []) if (SECTION_SLUG[d.section]) assert.equal(LIST[dexKey.abilityRule(a.id, d.section)], d.rule, `${a.id} ${d.section}`);
  }
  assert.ok(Object.keys(LIST).length > 1500);
  for (const k of Object.keys(LIST)) { assert.match(k, /^dex\.(family|ability|summary)\.[\w:-]+(\.\w+)?$/, k); assert.ok(!(k in englishText()), `${k} is not also a key of en.js`); }
});

test('in English a screen shows the Dex line itself; every line it shows is one the list offers', () => {
  const offered = new Set(Object.values(LIST));
  for (const f of FAMILIES) for (const mode of ['football', 'clash']) {
    const info = abilityInfo(f.id, mode); if (!info) continue;
    for (const line of [info.name, info.summary, info.story, ...info.sections.map((s) => s.text)].filter(Boolean)) assert.ok(offered.has(line), `${f.id} ${mode}: "${line.slice(0, 50)}" is in the translator list`);
  }
});

test('another language: its line is shown for a Dex key, English where it has none, and a Dex key cannot be used to change an id', () => {
  const fam = FAMILIES.find((f) => f.abilities.football); const ab = ABILITIES.find((a) => a.id === fam.abilities.football);
  try {
    setLanguage('zz', { [dexKey.abilityName(ab.id)]: 'NOMBRE', 'not.a.key': 'x' });
    assert.equal(abilityInfo(fam.id, 'football').name, 'NOMBRE');
    assert.equal(abilityInfo(fam.id, 'football').id, ab.id, 'the id is the Dex id');
    assert.equal(ab.name, LIST[dexKey.abilityName(ab.id)], 'the Dex record itself still holds its English name');
    assert.equal(dexLine(dexKey.familyDescription(fam.id), fam.description), fam.description, 'no line for this key: English');
    assert.equal(tOr('not.a.key', 'fallback'), 'fallback', 'unknown keys are ignored');
  } finally { setLanguage('en', null); }
  assert.equal(abilityInfo(fam.id, 'football').name, ab.name);
});
