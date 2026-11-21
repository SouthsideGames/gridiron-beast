import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceSettings, DEVICE_SETTING_KEYS } from '../src/ui/device-settings.js';

const memory = (initial = {}) => { const m = new Map(Object.entries(initial)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m }; };

test('the first franchise on a device seeds it, and later franchises take the device choices', () => {
  const storage = memory(); const d = createDeviceSettings(storage);
  assert.equal(d.read(), null);
  const first = { reducedMotion: true, reducedFlash: false, comfortableText: true, quarterLength: 300 };
  d.syncInto(first);
  assert.deepEqual(d.read(), { reducedMotion: true, reducedFlash: false, comfortableText: true }, 'only display keys are recorded');
  const fresh = { reducedMotion: false, reducedFlash: false, comfortableText: false, quarterLength: 180, mode: 'key' };
  d.syncInto(fresh);
  assert.equal(fresh.reducedMotion, true); assert.equal(fresh.comfortableText, true);
  assert.equal(fresh.quarterLength, 180, 'game settings stay per franchise'); assert.equal(fresh.mode, 'key');
});

test('a choice made with no franchise loaded is kept for the next launch and every franchise', () => {
  const storage = memory();
  createDeviceSettings(storage).write({ reducedFlash: true, frameRate: 30, quarterLength: 420 });
  const relaunch = createDeviceSettings(storage); // a new page load reads the same storage
  assert.deepEqual(relaunch.read(), { reducedFlash: true, frameRate: 30 }, 'unknown keys are ignored');
  const s = relaunch.syncInto({ reducedFlash: false, frameRate: 60, screenShake: true });
  assert.deepEqual(s, { reducedFlash: true, frameRate: 30, screenShake: true });
});

test('storage that refuses or holds junk never breaks the game', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const d = createDeviceSettings(broken);
  assert.equal(d.read(), null); assert.equal(d.write({ reducedMotion: true }), false);
  const junk = createDeviceSettings(memory({ 'gb.deviceSettings.v1': '{not json' }));
  assert.equal(junk.read(), null);
  assert.deepEqual(junk.syncInto({ reducedMotion: true }), { reducedMotion: true });
  assert.ok(DEVICE_SETTING_KEYS.includes('reducedMotion') && !DEVICE_SETTING_KEYS.includes('quarterLength'));
});
