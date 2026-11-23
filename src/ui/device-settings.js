// Display and accessibility choices belong to the person holding the device, not to one franchise (2026-11-21).
// Before this, Reduce Motion, Reduce Flashes, Larger Supporting Text, Screen Shake and Frame Rate lived only in each
// franchise's settings: a new franchise started from the defaults, and a choice made on the menu with no franchise loaded
// went into an in-memory copy that was gone on the next launch.
//
// The device copy (localStorage, like the audio settings) is written into whichever settings object is in use: the loaded
// franchise's (so every screen that reads f.settings directly sees it, and the save still carries it) and the menu's
// defaults. The first franchise loaded on a device with no record seeds it, so an existing player keeps their choices.
export const DEVICE_SETTING_KEYS = Object.freeze(['comfortableText', 'reducedMotion', 'reducedFlash', 'screenShake', 'frameRate', 'stadiumEffects']);
const STORAGE_KEY = 'gb.deviceSettings.v1';

export function createDeviceSettings(storage = globalThis.localStorage) {
  let cache; // undefined: not read yet; null: no record on this device
  const read = () => {
    if (cache !== undefined) return cache;
    try { const raw = storage?.getItem(STORAGE_KEY); const v = raw ? JSON.parse(raw) : null; cache = v && typeof v === 'object' ? v : null; } catch { cache = null; }
    return cache;
  };
  const persist = (next) => { cache = next; try { storage?.setItem(STORAGE_KEY, JSON.stringify(next)); return true; } catch { return false; } };
  return {
    /** The device's choices, or null when this device has none yet. */
    read: () => { const v = read(); return v ? { ...v } : null; },
    /** Record one or more choices for this device. Keys outside DEVICE_SETTING_KEYS are ignored. Returns false if storage refused. */
    write(patch) {
      const next = { ...(read() || {}) };
      for (const k of DEVICE_SETTING_KEYS) if (k in patch) next[k] = patch[k];
      return persist(next);
    },
    /** Bring a settings object in line with the device (seeding the device from it the first time). Mutates and returns it. */
    syncInto(settings) {
      if (!settings) return settings;
      const v = read();
      if (!v) { const seed = {}; for (const k of DEVICE_SETTING_KEYS) if (settings[k] !== undefined) seed[k] = settings[k]; persist(seed); return settings; }
      for (const k of DEVICE_SETTING_KEYS) if (k in v) settings[k] = v[k];
      return settings;
    },
  };
}
export const deviceSettings = createDeviceSettings();
export const isDeviceSetting = (key) => DEVICE_SETTING_KEYS.includes(key);
