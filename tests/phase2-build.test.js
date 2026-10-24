// The developer-only season shortcut exists only in private test builds (GDD §44.8): the repository's build never enables it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILD } from '../src/version.js';
import { shortcutsEnabled, fastForwardSeason } from '../src/franchise/dev-shortcut.js';

test('the test flag is off in the repository, so the shortcut is disabled and refuses to run', () => {
  assert.equal(BUILD.test, false); assert.equal(shortcutsEnabled(), false);
  const r = fastForwardSeason({ season: { finished: false }, history: [] }); assert.equal(r.ok, false); assert.match(r.reason, /off in this build/);
});
