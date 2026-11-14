import test from 'node:test';
import assert from 'node:assert/strict';
import { resetDex, dexKnowledgeGame, dexKnowledge, dexData, mergeDex } from '../src/franchise/dex-store.js';
import { speciesSheet } from '../src/ui/screens/dex.js';
import { SPECIES_DEX } from '../src/data/species.js';
test('species knowledge deduplicates individuals, replays and cloud merges at all thresholds', () => {
  resetDex();
  for (let n = 0; n < 30; n++) {
    dexKnowledgeGame(['flaroo', 'flaroo'], `save-a:game-${n}`);
    dexKnowledgeGame(['flaroo'], `save-a:game-${n}`);
    const snapshot = JSON.parse(JSON.stringify(dexData())); mergeDex(snapshot);
    assert.equal(dexKnowledge('flaroo').games, n + 1);
    assert.deepEqual(dexKnowledge('flaroo').unlocked, [5,15,30].filter(x => x <= n + 1));
  }
  dexKnowledgeGame(['flaroo'], 'save-b:game-0');
  assert.equal(dexKnowledge('flaroo').games, 31);
  mergeDex({ seen: {}, signed: {} });
  assert.equal(dexKnowledge('flaroo').games, 31);
});
test('every family renders four sections with one portrait and no source mutations', () => {
  for (const s of SPECIES_DEX) {
    const before = JSON.stringify(s);
    const html = speciesSheet(s, null, { revealAll: true, previewGames: 30 });
    assert.equal((html.match(/role="tabpanel"/g) || []).length, 4);
    assert.equal((html.match(/data-dex-portrait/g) || []).length, 1);
    assert.equal(JSON.stringify(s), before);
  }
});

import { DEX_REVIEW_CATALOG, registerBeastDexReviewer } from '../src/ui/screens/beast-dex-reviewer.js';
import { dexContent, individualQuirk, portraitReaction } from '../src/dex/content.js';
import { dexReviews, saveDexReview, dexReviewStatus } from '../src/dex/reviews.js';
test('all form previews render, lore stays locked until its threshold, identities are stable', () => {
  for (const { species, form } of DEX_REVIEW_CATALOG) {
    const monster = { id: 'test-individual', species: species.id, name: '<beast>', stage: form.stage, attributes: {} };
    const snapshot = JSON.stringify(monster);
    const html = speciesSheet(species, null, { monster, revealAll: true });
    assert.ok(html.includes('My Beast View'));
    assert.ok(html.includes('&lt;beast&gt;'));
    assert.equal(JSON.stringify(monster), snapshot);
    assert.equal(individualQuirk(monster), individualQuirk({ ...monster, stage: 0 }));
    const content = dexContent(species.id, form.stage);
    assert.ok(content.relationships.length <= 3);
    for (const lore of content.lore) {
      const locked = speciesSheet(species, null, { previewStage: form.stage, previewGames: lore.games - 1, revealAll: true });
      const unlocked = speciesSheet(species, null, { previewStage: form.stage, previewGames: lore.games, revealAll: true });
      assert.ok(!locked.includes(lore.text));
      assert.ok(unlocked.includes(lore.text));
    }
  }
  assert.match(portraitReaction({ name: 'Flaroo', features: ['ears'] }), /ears/);
});
test('review feedback survives unavailable storage, is form-specific, and rejects stale approval', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map(); let blocked = false;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: k => data.get(k) || null, setItem: (k,v) => { if(blocked) throw Error('quota'); data.set(k,v); } } });
  try {
    assert.equal(saveDexReview('emberfox:0', 'lore', 'approved', 'Good'), true);
    assert.equal(dexReviewStatus('emberfox:0', 'lore'), 'approved');
    assert.equal(dexReviewStatus('emberfox:1', 'lore'), 'pending');
    blocked = true;
    assert.equal(saveDexReview('emberfox:0', 'lore', 'revision', 'Keep this note'), false);
    assert.equal(dexReviews()['emberfox:0'].lore.notes, 'Keep this note');
    assert.equal(dexReviewStatus('emberfox:0', 'lore'), 'revision');
    data.set('gridiron-beast-dex-reviews-v1', JSON.stringify({ 'emberfox:2': { lore: { status: 'approved', fingerprint: 'old content', updatedAt: 1 } } }));
    assert.equal(dexReviewStatus('emberfox:2', 'lore'), 'pending');
    assert.equal(saveDexReview('missing:0', 'lore', 'approved'), false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original); else delete globalThis.localStorage;
  }
});
test('reviewer renders a catalog-based default and does not change franchise state', () => {
  let screen;
  registerBeastDexReviewer({ registerScreen: (_id, value) => { screen = value; } });
  const html = screen.render({ f: null });
  assert.match(html, /Beast Dex|Review drafts/);
  assert.match(html, /data-review-id=/);
  assert.equal((html.match(/data-review-component=/g) || []).length, 6);
});

import { auditDexContent } from '../src/dex/content-audit.js';
import { reviewFingerprint, reviewDigest } from '../src/dex/reviews.js';
test('expanded editorial coverage is complete per family and passes world/content audit', () => {
  const audit = auditDexContent();
  assert.deepEqual(audit.errors, []);
  assert.equal(audit.expanded, audit.forms);
  assert.equal(audit.remaining, 0);
  assert.deepEqual(audit.missing, []);
  assert.equal(audit.expanded + audit.remaining, audit.forms);
  const biographies = new Set();
  for (const id of audit.expandedIds) {
    const [family, stage] = id.split(':');
    const c = dexContent(family, Number(stage));
    biographies.add(c.biography.join(' '));
    assert.ok(Object.isFrozen(c));
    assert.ok(Object.isFrozen(c.biography));
    assert.deepEqual(c.lore.map(x => x.games), [5,15,30]);
    for (const kind of ['normal', 'rare']) {
      const reaction = portraitReaction({ name: 'Nickname', reactions: c.reactions, rare: kind === 'rare', choice: 0 });
      assert.ok(reaction.startsWith('Nickname'));
      assert.ok(!reaction.includes('{name}'));
    }
  }
  assert.equal(biographies.size, audit.forms);
});
test('review revisions use compact, component-specific fingerprints', () => {
  assert.equal(reviewDigest('same'), reviewDigest('same'));
  assert.notEqual(reviewDigest('same'), reviewDigest('changed'));
  for (const component of ['visuals','audio','lore','football','clash','progression']) {
    const fingerprint = reviewFingerprint('emberfox:0', component);
    assert.match(fingerprint, /^v2:[0-9a-f]{32}$/);
    assert.notEqual(fingerprint, reviewFingerprint('emberfox:1', component));
  }
  assert.equal(reviewFingerprint('emberfox:0', 'invalid'), null);
});
test('profile exposes view switching only for real owned individuals and hides reviewer duplicate controls', () => {
  const s = SPECIES_DEX.find(s => s.id === 'emberfox');
  const f = { roster: [{ id: 'beast-1', name: '<Nickname>', species: s.id }] };
  const before = JSON.stringify(f);
  const html = speciesSheet(s, f, { revealAll: true });
  assert.match(html, /data-dex-view/);
  assert.match(html, /My Beast: &lt;Nickname&gt;/);
  const preview = speciesSheet(s, f, { revealAll: true, stagePicker: false, viewPicker: false });
  assert.ok(!preview.includes('data-dex-view'));
  assert.ok(!preview.includes('data-dex-stage'));
  assert.equal(JSON.stringify(f), before);
});
