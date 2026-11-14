import test from 'node:test';
import assert from 'node:assert/strict';
import { ABILITIES, FAMILIES } from '../src/data/beast-dex.js';
import { CLASH_SIMPLE } from '../src/text/clash-simple.js';
import { abilityInfo, abilityBlockHtml } from '../src/ui/ability-info.js';
test('every Clash ability has a brief player explanation without changing its exact rules', () => {
  const before = JSON.stringify(ABILITIES);
  const ids = ABILITIES.filter(a => a.mode === 'clash').map(a => a.id).sort();
  assert.deepEqual(Object.keys(CLASH_SIMPLE).sort(), ids);
  for (const f of FAMILIES) {
    const a = abilityInfo(f.id, 'clash'); if (!a) continue;
    assert.equal(a.summary, CLASH_SIMPLE[a.id]);
    assert.ok(a.summary.split(/\s+/).length <= 50, a.id);
    assert.ok(a.sections.length > 0);
    const html = abilityBlockHtml(f.id, 'clash');
    assert.ok(html.includes('<details'));
  }
  assert.equal(JSON.stringify(ABILITIES), before);
});
