// Durable save mirror. localStorage stays the fast, synchronous primary; when
// the page runs inside claude.ai the franchise is also mirrored to the
// artifact's private per-viewer database, which survives the app being
// evicted from memory or its browser storage being cleared. Outside claude.ai
// (GitHub Pages, installed PWA, tests) every call is a quiet no-op.
//
// Layout: data/users/<viewer-id>/save_meta  {chunks, savedAt, schemaVersion}
//         data/users/<viewer-id>/save_c<n>  {s: "<json slice>"}
// Chunked so long careers stay under the 256 KiB per-document limit.

const CHUNK = 180_000; // characters per chunk document
let ctx = null; // { col } once connected
let connecting = null;
let timer = null;
let pending = null;
let status = { state: 'off', at: null, error: null };
const listeners = new Set();

function setStatus(s) { status = { ...status, ...s }; for (const fn of listeners) { try { fn(status); } catch { /* ignore */ } } }
export function cloudStatus() { return status; }
export function onCloudStatus(fn) { listeners.add(fn); return () => listeners.delete(fn); }

async function connect() {
  if (ctx) return ctx;
  if (connecting) return connecting;
  connecting = (async () => {
    const use = globalThis.claude?.use;
    if (typeof use !== 'function') { setStatus({ state: 'off' }); return null; }
    try {
      const [db, user] = await Promise.all([use('db'), use('user')]);
      if (!db || !user) { setStatus({ state: 'off' }); return null; }
      const id = await user.id();
      if (!id) { setStatus({ state: 'off' }); return null; }
      ctx = { col: db.collection(`data/users/${id}`) };
      setStatus({ state: 'on' });
      return ctx;
    } catch (e) { setStatus({ state: 'off', error: e?.code || 'unavailable' }); return null; }
  })();
  const c = await connecting; connecting = null; return c;
}

/** Read the cloud copy: resolves the parsed franchise object or null. */
export async function cloudLoad() {
  const c = await connect(); if (!c) return null;
  try {
    const meta = await c.col.doc('save_meta').get();
    if (!meta.exists) return null;
    const m = meta.data();
    const parts = [];
    for (let i = 0; i < m.chunks; i++) {
      const d = await c.col.doc(`save_c${i}`).get();
      if (!d.exists) return null; // torn write: ignore the cloud copy
      parts.push(d.data().s);
    }
    const f = JSON.parse(parts.join(''));
    return f && f.savedAt === m.savedAt ? f : null;
  } catch (e) { setStatus({ error: e?.code || 'unavailable' }); return null; }
}

async function writeNow(f) {
  const c = await connect(); if (!c) return false;
  try {
    const json = JSON.stringify(f);
    const chunks = Math.max(1, Math.ceil(json.length / CHUNK));
    // Chunks first, meta last: a reader only trusts chunks the meta vouches for.
    for (let i = 0; i < chunks; i++) await c.col.doc(`save_c${i}`).set({ s: json.slice(i * CHUNK, (i + 1) * CHUNK) });
    await c.col.doc('save_meta').set({ chunks, savedAt: f.savedAt, schemaVersion: f.schemaVersion });
    setStatus({ state: 'on', at: f.savedAt, error: null });
    return true;
  } catch (e) { setStatus({ error: e?.code || 'unavailable' }); return false; }
}

/**
 * Mirror with a throttle: a write happens within 4 s of the first pending change
 * even while saves keep arriving (a match saves every play), and at once for
 * important changes (a game finished, a week advanced).
 */
export function cloudSave(f, { immediate = false } = {}) {
  pending = f;
  const run = () => { clearTimeout(timer); timer = null; const p = pending; pending = null; if (p) writeNow(p); };
  if (immediate) run(); else if (!timer) timer = setTimeout(run, 4000);
}
/** Flush a pending write right away (page hidden / unloading). */
export function cloudFlush() { if (pending) { clearTimeout(timer); timer = null; const p = pending; pending = null; writeNow(p); } }
export async function cloudClear() {
  const c = await connect(); if (!c) return;
  try { await c.col.doc('save_meta').delete(); } catch { /* ignore */ }
}

// ------------------------------------------------------------ the player's dex
let dexTimer = null;
/** Read the cloud copy of the player's Beast Dex (or null). */
export async function cloudLoadDex() {
  const c = await connect(); if (!c) return null;
  try { const d = await c.col.doc('dex').get(); return d.exists ? d.data() : null; } catch { return null; }
}
/** Debounced mirror of the dex document. */
export function cloudSaveDex(dex) {
  clearTimeout(dexTimer);
  dexTimer = setTimeout(async () => { const c = await connect(); if (!c) return; try { await c.col.doc('dex').set(JSON.parse(JSON.stringify(dex))); } catch { /* ignore */ } }, 3000);
}

// ------------------------------------------------------------ the Hall of Fame
let hofTimer = null;
export async function cloudLoadHof() { const c = await connect(); if (!c) return null; try { const d = await c.col.doc('hof').get(); return d.exists ? d.data().cards || null : null; } catch { return null; } }
export function cloudSaveHof(cards) { clearTimeout(hofTimer); hofTimer = setTimeout(async () => { const c = await connect(); if (!c) return; try { await c.col.doc('hof').set({ cards: JSON.parse(JSON.stringify(cards)), updatedAt: Date.now() }); } catch { /* ignore */ } }, 3000); }
