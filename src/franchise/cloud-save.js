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
let pending = null; // the state waiting for the in-flight write
let queued = null; // the state waiting for the throttle
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

let inflight = null; // one write at a time: a later write starts only after the earlier one has finished (GDD §43.6)
let lastWritten = 0; // savedAt of the newest copy this session wrote
export const cloudUsage = { chunks: 0, chars: 0, documents: 0, writes: 0, lastWriteMs: null };
async function writeNow(f) {
  const c = await connect(); if (!c) return false;
  // Serialise once, and take the stamp from the same moment, so the meta always vouches for exactly these chunks.
  const json = JSON.stringify(f); const savedAt = f.savedAt; const schemaVersion = f.schemaVersion;
  if (savedAt != null && savedAt < lastWritten) return true; // an older state never replaces a newer one in the cloud
  const t0 = Date.now();
  try {
    const chunks = Math.max(1, Math.ceil(json.length / CHUNK));
    // Chunks first, meta last: a reader only trusts chunks the meta vouches for.
    for (let i = 0; i < chunks; i++) await c.col.doc(`save_c${i}`).set({ s: json.slice(i * CHUNK, (i + 1) * CHUNK) });
    await c.col.doc('save_meta').set({ chunks, savedAt, schemaVersion, uid: f.uid ?? null, storage: 7 });
    lastWritten = Math.max(lastWritten, savedAt || 0);
    Object.assign(cloudUsage, { chunks, chars: json.length, documents: chunks + 1, writes: cloudUsage.writes + 1, lastWriteMs: Date.now() - t0 });
    setStatus({ state: 'on', at: savedAt, error: null });
    return true;
  } catch (e) { setStatus({ error: e?.code || 'unavailable' }); return false; }
}
/** Queue a write behind any write in flight; only the newest pending state is written next. */
function enqueue(f) {
  pending = f;
  if (inflight) return inflight;
  inflight = (async () => { while (pending) { const p = pending; pending = null; await writeNow(p); } inflight = null; })();
  return inflight;
}

/**
 * Mirror with a throttle: a write happens within 4 s of the first pending change
 * even while saves keep arriving (a match saves every play), and at once for
 * important changes (a game finished, a week advanced).
 */
export function cloudSave(f, { immediate = false } = {}) {
  queued = f;
  const run = () => { clearTimeout(timer); timer = null; const p = queued; queued = null; if (p) enqueue(p); };
  if (immediate) run(); else if (!timer) timer = setTimeout(run, 4000);
}
/** Flush a pending write right away (page hidden / unloading). */
export function cloudFlush() { if (queued) { clearTimeout(timer); timer = null; const p = queued; queued = null; return enqueue(p); } return inflight; }
/** Forget the session's newest-write guard (after the player deletes or replaces the franchise on purpose). */
export function cloudResetGuard() { lastWritten = 0; }
export async function cloudClear() {
  // Drop anything still waiting, so a throttled write cannot bring the deleted franchise back.
  clearTimeout(timer); timer = null; queued = null; pending = null;
  if (inflight) { try { await inflight; } catch { /* ignore */ } }
  lastWritten = 0;
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

// ------------------------------------------------------------ achievements (GDD §21.4)
let achTimer = null;
export async function cloudLoadAchievements() {
  const c = await connect(); if (!c) return null;
  try { const d = await c.col.doc('achievements').get(); return d.exists ? d.data() : null; } catch { return null; }
}
export function cloudSaveAchievements(data) {
  clearTimeout(achTimer);
  achTimer = setTimeout(async () => { const c = await connect(); if (!c) return; try { await c.col.doc('achievements').set(JSON.parse(JSON.stringify(data))); } catch { /* ignore */ } }, 3000);
}

// Developer reviews (polish 2.0): one shared document per item in
// `ability_reviews/<speciesId>` or `play_reviews/<playId>` {status, note,
// gameplay, fp, updatedAt}, so the developer (Claude) can read the owner's
// verdicts with the artifact database tools.
const reviewCols = {};
async function reviewCol(name) {
  if (reviewCols[name]) return reviewCols[name];
  const use = globalThis.claude?.use; if (typeof use !== 'function') return null;
  try { const db = await use('db'); if (!db) return null; reviewCols[name] = db.collection(name); return reviewCols[name]; } catch { return null; }
}
export async function cloudLoadReviews(name) {
  const col = await reviewCol(name); if (!col) return null;
  try { const snap = await col.get(); const out = {}; for (const d of snap.docs || []) out[d.id] = d.data(); return out; } catch { return null; }
}
/** Write one review; resolves true when the cloud took it. */
export async function cloudSaveReview(name, id, review) {
  const col = await reviewCol(name); if (!col) return false;
  try { if (!review) await col.doc(id).delete(); else await col.doc(id).set(JSON.parse(JSON.stringify(review))); return true; } catch { return false; }
}
