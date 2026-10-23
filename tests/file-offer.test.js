// Export on a real iPhone (Stage 2, 2026-10-23): inside claude.ai the page cannot start a download itself ("File downloads
// aren't available for this artifact"), yet the game said "Export file prepared". The file must go through the platform's
// `downloads` capability, which allows `.json` (not `.gbfranchise`), and the player must be told what really happened.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { offerFile } = await import('../src/ui/file-offer.js');
const text = '{"schemaVersion":6,"club":"Test"}';

test('inside claude.ai the file is offered through the downloads capability, as .json, and a save is reported as saved', async () => {
  const calls = []; const use = async (n) => (n === 'downloads' ? { save: async (r) => { calls.push(r); return { status: 'saved' }; } } : null);
  const r = await offerFile({ name: 'gridiron-beast-test-1-w3.gbfranchise', text, use, doc: null });
  assert.equal(calls.length, 1); assert.equal(calls[0].filename, 'gridiron-beast-test-1-w3.gbfranchise.json'); assert.equal(calls[0].data, text);
  assert.deepEqual({ ok: r.ok, status: r.status }, { ok: true, status: 'saved' });
});
test('a declined save is reported as not saved', async () => {
  const use = async () => ({ save: async () => { throw Object.assign(new Error('no'), { code: 'declined' }); } });
  const r = await offerFile({ name: 'x.gbfranchise', text, use, doc: null });
  assert.equal(r.ok, false); assert.equal(r.code, 'declined');
});
test('inside claude.ai without the capability, nothing pretends to download', async () => {
  let clicked = false; const doc = { createElement: () => ({ click: () => { clicked = true; }, remove() {} }), body: { appendChild() {} } };
  const r = await offerFile({ name: 'x.gbfranchise', text, use: async () => null, doc });
  assert.equal(r.ok, false); assert.equal(r.code, 'unavailable'); assert.equal(clicked, false);
});
test('outside claude.ai (GitHub Pages, installed app) the browser download is used as before', async () => {
  const made = []; const doc = { createElement: () => { const a = { click() { made.push(a); }, remove() {} }; return a; }, body: { appendChild() {} } };
  globalThis.URL.createObjectURL ||= () => 'blob:x'; globalThis.URL.revokeObjectURL ||= () => {};
  const r = await offerFile({ name: 'x.gbfranchise', text, use: undefined, doc });
  assert.equal(made.length, 1); assert.equal(made[0].download, 'x.gbfranchise'); assert.equal(r.how, 'browser');
});
test('the Settings export uses it, and never claims a file was saved without the platform saying so', () => {
  const src = fs.readFileSync(new URL('../src/ui/storage-ui.js', import.meta.url), 'utf8');
  assert.ok(/offerFile\(/.test(src), 'export goes through offerFile'); assert.ok(!/a\.download\s*=/.test(src), 'no direct download left in the export');
});
