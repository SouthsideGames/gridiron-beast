import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconHtml, iconNames, iconifyMarkup } from '../src/ui/icons.js';
import { coachEditorHtml } from '../src/ui/coach-editor.js';
import { DEFAULT_LOOK } from '../src/ui/coach-portrait.js';

test('bundled artwork replaces all five navigation icons and follows text color', () => {
  const out = iconifyMarkup('<nav>🏠 HQ 🐾 Roster 📋 Plays 🏆 League ☰ More</nav>');
  for (const key of ['home', 'paw', 'clipboard', 'trophy', 'menu']) assert.ok(out.includes(`data-ui-icon="${key}"`));
  assert.doesNotMatch(out, /🏠|🐾|📋|🏆|☰/u);
  for (const name of iconNames()) {
    const html = iconHtml(name); assert.ok(html.includes('aria-hidden="true"') && html.includes('focusable="false"'));
    assert.doesNotMatch(html, /<style|<script|\bid=|\bclass="cls-|\bon\w+=|href=|https?:|#[a-f0-9]{3,8}\b/i);
    assert.match(html, /currentColor/);
  }
});
test('rendering preserves accessible labels, actions, existing SVG, and user escaping', () => {
  const art = '<svg><text>🏆</text></svg>';
  const input = `<button data-action="log" aria-label="📋 Play Log">📋</button>${art}<p>&lt;img onerror=x&gt; 🏆 Winner</p>`;
  const output = iconifyMarkup(input);
  assert.ok(output.includes('data-action="log" aria-label="📋 Play Log"'));
  assert.ok(output.includes(art)); assert.ok(output.includes('&lt;img onerror=x&gt;'));
  assert.equal(iconifyMarkup(output), output, 'repeat renders do not nest SVGs');
  assert.ok(iconifyMarkup('<button data-action="awards">🏆</button>').includes('aria-label="🏆"'));
  assert.equal(iconHtml('__proto__'), ''); assert.equal(iconHtml('<script>'), '');
});
test('unneeded pictorial decorations disappear; ordinary text and arrows remain', () => {
  assert.equal(iconifyMarkup('<p>🙂 Face 💇 Hair 👕 Outfit 🧢 Extras</p>'), '<p> Face  Hair  Outfit  Extras</p>');
  assert.equal(iconifyMarkup('<p>© 2026 • 4 / 10 ◀ ▶ →</p>'), '<p>© 2026 • 4 / 10 ◀ ▶ →</p>');
  assert.ok(iconifyMarkup('<b>⚠️ Injured</b>').includes('data-ui-icon="warning"'));
});
test('shared editor keeps portrait and all category tabs in the sticky section', () => {
  const html = coachEditorHtml(DEFAULT_LOOK, { teamNote: 'Team colors' });
  const sticky = html.indexOf('class="ce-sticky"'), body = html.indexOf('class="ce-body"');
  assert.ok(sticky < html.indexOf('class="ce-preview"') && html.indexOf('class="ce-tabs"') < body);
  assert.equal((html.slice(sticky, body).match(/data-action="ce-tab"/g) || []).length, 5);
  assert.doesNotMatch(html, /🙂|💇|👕|🧢|💪|🎲/u);
  assert.ok(html.indexOf('ce-team-note') < sticky, 'long notes do not use pinned space');
});
