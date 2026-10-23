// Durable save mirror. localStorage stays the fast, synchronous primary; when
// the page runs inside claude.ai the franchise is also mirrored to the
// artifact's private per-viewer database, which survives the app being
// evicted from memory or its browser storage being cleared. Outside claude.ai
// (GitHub Pages, installed PWA, tests) every call is a quiet no-op.
//
// Layout: data/users/<viewer-id>/save_meta            {chunks, savedAt, schemaVersion, uid, storage, gen}
//         data/users/<viewer-id>/save_<gen>_c<n>      {s: "<json slice>"}   one generation per upload (v39.2)
//         data/users/<viewer-id>/save_c<n>            {s: "<json slice>"}   the v39.1 layout (meta without gen), still read
//         (the upload lease is held on save_meta itself, so the meta is published only while the lease is held)
// Chunked so long careers stay under the 256 KiB per-document limit. The store has no transactions (last writer wins); its
// single-writer primitive is a cooperative lease, `doc.acquire` (GDD §43.8). Every v39.2 upload holds the lease on
// save_meta while it checks the stored stamp, writes its own generation of chunks and removes older generations, and it
// publishes the meta through the lease grant itself (`acquire` with `data`), which the store applies only if the lease is
// still this upload's. So two tabs or devices can never interleave chunks or publish an older copy over a newer one, even
// when a request stalls past the lease.

const CHUNK = 180_000; // characters per chunk document
let ctx = null; // { col } once connected
let connecting = null;
let timer = null;
let pending = null; // the state waiting for the in-flight write
let queued = null; // the state waiting for the throttle
let status = { state: 'off', at: null, error: null };
let epoch = 0; // bumped when the franchise is deleted: uploads authorised before that are void
let retryTimer = null;
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
    if (!m || !(m.chunks > 0)) return null; // no published copy (a lease alone leaves no meta fields)
    const parts = [];
    for (let i = 0; i < m.chunks; i++) {
      const d = await c.col.doc(chunkId(m.gen, i)).get(); // this generation's chunks (v39.1 copies: the plain keys)
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
/**
 * The payload of one authorised write, fixed at the moment it was authorised: the JSON text, its stamp and its identity. A
 * store save result passes its committed snapshot (`snapshot.json()`); a plain franchise object is serialised on the spot.
 * Either way, later changes to the live object can never reach the cloud through this write.
 */
function freezePayload(x) {
  if (x && typeof x.json === 'function') return { json: x.json(), savedAt: x.savedAt ?? null, schemaVersion: x.schemaVersion ?? null, uid: x.uid ?? null, epoch };
  return { json: JSON.stringify(x), savedAt: x?.savedAt ?? null, schemaVersion: x?.schemaVersion ?? null, uid: x?.uid ?? null, epoch };
}
const LEASE_DOC = 'save_meta'; // the lease lives on the meta, so publishing can be made conditional on holding it
const LEASE_MS = 30_000; // renewed before each chunk; released (shortened to the 1 s minimum) when done
const holder = `t${Math.random().toString(36).slice(2, 10)}`; // this tab
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chunkId = (gen, i) => (gen ? `save_${gen}_c${i}` : `save_c${i}`);
/** Take the upload lease, waiting a little if another tab or device holds it. False if it stays busy. */
async function takeLease(c) {
  const ref = c.col.doc(LEASE_DOC);
  if (typeof ref.acquire !== 'function') return true; // an older runtime without leases: generations still prevent mixed chunks
  for (let i = 0; i < 10; i++) { const r = await ref.acquire({ holder, ttlMs: LEASE_MS }); if (r?.acquired) return true; await sleep(Math.min(2000, 150 * 2 ** i)); }
  return false;
}
async function renewLease(c) { const ref = c.col.doc(LEASE_DOC); if (typeof ref.acquire !== 'function') return true; return !!(await ref.acquire({ holder, ttlMs: LEASE_MS }))?.acquired; }
async function releaseLease(c) { try { const ref = c.col.doc(LEASE_DOC); if (typeof ref.acquire === 'function') await ref.acquire({ holder, ttlMs: 1000 }); } catch { /* it expires on its own */ } }
/**
 * Remove chunk documents of generations other than `keep` (an earlier upload, or one interrupted before it published). The
 * lease is renewed before every deletion and the clean-up stops the moment it is lost: once another tab holds the lease, its
 * own new chunks would be in the listing.
 */
async function collectChunks(c, keep, prev) {
  const doomed = new Set();
  if (prev?.gen && prev.gen !== keep) for (let i = 0; i < (prev.chunks || 0); i++) doomed.add(chunkId(prev.gen, i));
  try { if (typeof c.col.get === 'function') { const snap = await c.col.get(); for (const d of snap?.docs || []) { const m = /^save_([a-z0-9]+)_c\d+$/.exec(d.id); if (m && m[1] !== keep) doomed.add(d.id); } } } catch { /* listing is best effort */ }
  for (const id of doomed) { if (!(await renewLease(c).catch(() => false))) return; try { await c.col.doc(id).delete(); } catch { /* left for the next upload */ } }
}
async function writeNow(p) {
  const c = await connect(); if (!c) return false;
  const { json, savedAt, schemaVersion, uid } = p;
  if (p.epoch !== epoch) return true; // authorised before the franchise was deleted
  if (savedAt != null && savedAt < lastWritten) return true; // an older state never replaces a newer one this session wrote
  const t0 = Date.now();
  if (!(await takeLease(c).catch(() => false))) { setStatus({ error: 'busy' }); retryLater(p); return false; }
  try {
    // Under the lease: nothing another tab or device has put there that is newer is ever replaced.
    const meta = await c.col.doc('save_meta').get(); const prev = meta.exists ? meta.data() : null;
    if (prev && savedAt != null && (prev.savedAt || 0) > savedAt) { setStatus({ state: 'on', error: null, skipped: (status.skipped || 0) + 1 }); return true; }
    const gen = `${(savedAt || Date.now()).toString(36)}${holder}`;
    const chunks = Math.max(1, Math.ceil(json.length / CHUNK));
    // This upload's own generation of chunks first, the meta last: a reader only trusts chunks the meta vouches for.
    for (let i = 0; i < chunks; i++) { if (i && !(await renewLease(c))) throw Object.assign(new Error('The upload lease was lost.'), { code: 'busy' }); await c.col.doc(chunkId(gen, i)).set({ s: json.slice(i * CHUNK, (i + 1) * CHUNK) }); }
    if (!(await renewLease(c))) throw Object.assign(new Error('The upload lease was lost.'), { code: 'busy' }); // still the only uploader?
    const again = await c.col.doc('save_meta').get(); // a last check right before publishing (covers a writer without the lease)
    if (again.exists && savedAt != null && (again.data()?.savedAt || 0) > savedAt) { await collectChunks(c, again.data()?.gen, null); return true; }
    // Publish through the lease grant: the store merges the meta only if the lease is still ours when the request arrives, so
    // an upload that stalled past its lease can never overwrite a newer copy published meanwhile (Codex r4362010448).
    const metaRef = c.col.doc('save_meta'); const body = { chunks, savedAt, schemaVersion, uid, storage: 7, gen };
    if (typeof metaRef.acquire === 'function') { if (!(await metaRef.acquire({ holder, ttlMs: LEASE_MS, data: body }))?.acquired) throw Object.assign(new Error('The upload lease was lost.'), { code: 'busy' }); }
    else await metaRef.set(body); // an older runtime without leases
    lastWritten = Math.max(lastWritten, savedAt || 0);
    await collectChunks(c, gen, prev);
    Object.assign(cloudUsage, { chunks, chars: json.length, documents: chunks + 1, writes: cloudUsage.writes + 1, lastWriteMs: Date.now() - t0 });
    setStatus({ state: 'on', at: savedAt, error: null });
    return true;
  } catch (e) { setStatus({ error: e?.code || 'unavailable' }); if (e?.code === 'busy') retryLater(p); return false; }
  finally { await releaseLease(c); }
}
/** Try an upload again later, unless a newer state has been queued meanwhile. */
function retryLater(p) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { retryTimer = null; if (p.epoch === epoch && !queued && !pending) enqueue(p); }, 5000); // void once the franchise is deleted (Codex r4362010441)
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
export function cloudSave(x, { immediate = false } = {}) {
  if (!x) return;
  queued = freezePayload(x); // fixed now: the payload is the state authorised by this call
  const run = () => { clearTimeout(timer); timer = null; const p = queued; queued = null; if (p) enqueue(p); };
  if (immediate) run(); else if (!timer) timer = setTimeout(run, 4000);
}
/** Flush a pending write right away (page hidden / unloading). */
export function cloudFlush() { if (queued) { clearTimeout(timer); timer = null; const p = queued; queued = null; return enqueue(p); } return inflight; }
/** Forget the session's newest-write guard (after the player deletes or replaces the franchise on purpose). */
export function cloudResetGuard() { lastWritten = 0; }
export async function cloudClear() {
  // Drop anything still waiting, so a throttled write cannot bring the deleted franchise back.
  epoch++; clearTimeout(retryTimer); retryTimer = null; // and an upload waiting to retry after a busy lease
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
