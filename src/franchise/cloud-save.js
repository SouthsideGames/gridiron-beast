// Durable save mirror. The device's own save (IndexedDB, or localStorage as a fallback) is the primary copy; when the page
// runs inside claude.ai the franchise is also mirrored to the artifact's private per-viewer database, so a new device, or a
// device whose browser storage was cleared, can recover it. Outside claude.ai (GitHub Pages, installed PWA, tests without a
// store) every call is a quiet no-op.
//
// Snapshot layout (v39.2, GDD §43.8). Everything lives in the viewer's private subtree data/users/<viewer-id>/:
//   cloud/snaps/<gen>~w          intent  {gen, uid, createdAt, savedAt, n, at}                   written first
//   cloud/chunks/<gen>_c<i>      chunk   {gen, i, n, uid, createdAt, savedAt, s}                 then every chunk
//   cloud/snaps/<gen>            commit  {gen, uid, createdAt, savedAt, schemaVersion, n, len, sum, storage, at}   last
//   cloud/deleted/<id>           deletion marker {type: 'delete', uid, createdAt, cutoff, at}
// Every upload writes its own documents under a unique generation id and never changes them, so no upload can overwrite
// another, whatever order requests arrive in. The store has no transactions and its only lock expires, so correctness never
// depends on a lock:
//   - a reader takes the newest generation whose commit and every chunk are present and match the checksum;
//   - clean-up removes a generation only when its franchise was deleted (marker), or when two newer COMMITTED generations of
//     the same franchise exist; the two newest commits of a franchise are therefore never removed, and are complete;
//   - a deletion marker makes every copy of that franchise saved up to the moment of deletion invalid, for every reader.
// The v39.0/v39.1 layout (data/users/<id>/save_meta + save_c<n>) is still read on first run; it is never written.

const CHUNK = 120_000; // ASCII characters per chunk: at most ~240 KB once the store escapes it, under the 256 KiB limit
const STORAGE = 8; // snapshot layout version
const DELETIONS_KEY = 'gridiron-beast-v7-cloud-deletions'; // deletions made on this device (kept; markers retried until written)
const NO_ADOPT_KEY = 'gridiron-beast-v7-cloud-noadopt'; // set when this device deleted its franchise; cleared by the next upload
let ctx = null; // { col, snaps, chunks, marks } once connected
let connecting = null;
let timer = null;
let pending = null; // the state waiting for the in-flight write
let queued = null; // the state waiting for the throttle
let status = { state: 'off', at: null, error: null };
let epoch = 0; // bumped when the franchise is deleted in this tab: uploads authorised before that are void
let swept = false; // the leftover-chunk sweep runs at most once per session
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
      const base = `data/users/${id}`;
      ctx = { col: db.collection(base), snaps: db.collection(`${base}/cloud/snaps`), chunks: db.collection(`${base}/cloud/chunks`), marks: db.collection(`${base}/cloud/deleted`) };
      setStatus({ state: 'on' });
      return ctx;
    } catch (e) { setStatus({ state: 'off', error: e?.code || 'unavailable' }); return null; }
  })();
  const c = await connecting; connecting = null; return c;
}

// ------------------------------------------------------------ identity, order, encoding
const str = (v) => (typeof v === 'string' && v.length ? v : null);
/** Same franchise: equal non-empty uid, or equal non-empty createdAt. A copy with neither matches nothing. */
export function sameFranchise(a, b) {
  const au = str(a?.uid), bu = str(b?.uid); if (au && bu && au === bu) return true;
  const ac = str(a?.createdAt), bc = str(b?.createdAt); return !!(ac && bc && ac === bc);
}
const at = (x) => (typeof x?.savedAt === 'number' ? x.savedAt : 0);
/** Generation order: by savedAt, then by generation id (unique), so every two generations compare. */
const isNewer = (a, b) => (at(a) !== at(b) ? at(a) > at(b) : String(a.gen) > String(b.gen));
const rand = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');
const makeGen = (savedAt) => `${Math.max(0, Math.floor(savedAt || 0)).toString(36).padStart(10, '0')}-${rand()}`;
/** JSON with every non-ASCII character escaped (still the same JSON value), so a chunk's size in bytes is its length. */
const ascii = (s) => s.replace(/[\u007f-￿]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
const safeId = (s) => String(s || 'none').replace(/[^A-Za-z0-9_\-.~:@+]/g, '_').slice(0, 120);

// ------------------------------------------------------------ this device's deletions (localStorage)
const ls = () => { try { return globalThis.localStorage || null; } catch { return null; } };
let memDeletions = []; // this tab's records, kept so a deletion is never lost when browser storage is blocked
/** Merge record lists by id (a record written by any tab stays written). */
function mergeDeletions(...lists) { const by = new Map(); for (const l of lists) for (const d of l || []) { if (!d?.id) continue; const o = by.get(d.id); by.set(d.id, o ? { ...o, written: o.written || d.written, cutoff: Math.max(o.cutoff || 0, d.cutoff || 0) } : { ...d }); } return [...by.values()].sort((x, y) => (x.at || 0) - (y.at || 0)); }
function storedDeletions() { try { const v = JSON.parse(ls()?.getItem(DELETIONS_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } }
/** This browser's deletions: localStorage is shared by every tab, so it is always read; this tab's memory fills in when blocked. */
function localDeletions() { return mergeDeletions(storedDeletions(), memDeletions); }
function saveLocalDeletions(list) { const all = mergeDeletions(storedDeletions(), memDeletions, list).slice(-50); memDeletions = all.map((d) => ({ ...d })); try { ls()?.setItem(DELETIONS_KEY, JSON.stringify(all)); } catch { /* blocked: this tab still retries it */ } }
let memNoAdopt = false; // used only when localStorage is unavailable
const noAdopt = () => { try { const s = ls(); if (s) return s.getItem(NO_ADOPT_KEY) === '1'; } catch { /* blocked */ } return memNoAdopt; };
function setNoAdopt(on) { memNoAdopt = !!on; try { if (on) ls()?.setItem(NO_ADOPT_KEY, '1'); else ls()?.removeItem(NO_ADOPT_KEY); } catch { /* ignore */ } }

// ------------------------------------------------------------ listings
/** Deletion markers in the cloud plus this device's own deletions (even those whose marker is not written yet). */
async function listMarks(c) {
  const out = localDeletions().map((d) => ({ uid: d.uid, createdAt: d.createdAt, cutoff: d.cutoff }));
  const snap = await c.marks.get();
  for (const d of snap.docs || []) { const m = d.data(); if (m?.type === 'delete' && typeof m.cutoff === 'number') out.push(m); }
  return out;
}
/** A copy saved at or before a deletion of its franchise is void, for every reader, whatever order requests arrived in. */
const voided = (g, marks) => marks.some((m) => sameFranchise(m, g) && at(g) <= m.cutoff);
/** Generations in the cloud: { gen, uid, createdAt, savedAt, n, commit, intent }. */
async function listSnaps(c) {
  const snap = await c.snaps.get(); const byGen = new Map();
  for (const d of snap.docs || []) {
    const v = d.data(); if (!v?.gen) continue; const g = byGen.get(v.gen) || { gen: v.gen, commit: null, intent: null };
    if (d.id.endsWith('~w')) g.intent = v; else g.commit = v;
    const src = g.commit || g.intent; Object.assign(g, { uid: src.uid ?? null, createdAt: src.createdAt ?? null, savedAt: src.savedAt ?? null, n: src.n || 0 });
    byGen.set(v.gen, g);
  }
  return [...byGen.values()];
}

// ------------------------------------------------------------ reading
async function readGen(c, g) {
  const parts = [];
  for (let i = 0; i < g.commit.n; i++) {
    const d = await c.chunks.doc(`${g.gen}_c${i}`).get(); // a transient read error throws: the caller reports it, never falls back
    if (!d.exists) return { missing: true };
    parts.push(d.data().s);
  }
  const text = parts.join('');
  if (text.length !== g.commit.len || fnv(text) !== g.commit.sum) return { missing: true };
  let f; try { f = JSON.parse(text); } catch { return { missing: true }; }
  return f && f.savedAt === g.commit.savedAt ? { ok: true, f } : { missing: true };
}
const legacyChunkId = (gen, i) => (gen ? `save_${gen}_c${i}` : `save_c${i}`);
/** The v39.0/v39.1 copy (or the unreleased dev layout with `gen`). */
async function readLegacy(c) {
  const meta = await c.col.doc('save_meta').get();
  if (!meta.exists) return null;
  const m = meta.data(); if (!m || !(m.chunks > 0)) return null;
  const parts = [];
  for (let i = 0; i < m.chunks; i++) { const d = await c.col.doc(legacyChunkId(m.gen, i)).get(); if (!d.exists) return null; parts.push(d.data().s); }
  let f; try { f = JSON.parse(parts.join('')); } catch { return null; }
  return f && f.savedAt === m.savedAt ? f : null;
}

/**
 * Read the cloud copy for this device: resolves the parsed franchise or null.
 * `device` identifies the franchise on this device ({uid, createdAt}); only copies of that franchise are considered, so the
 * game never switches a device to another franchise. With no franchise on the device, the newest valid copy of any franchise
 * is returned, unless this device has just deleted its franchise.
 */
export async function cloudLoad(device = null) {
  const c = await connect(); if (!c) return null;
  try {
    await flushDeletions(c);
    const dev = device && (str(device.uid) || str(device.createdAt)) ? device : null;
    if (!dev && noAdopt()) return null;
    let marks = [], groups = [];
    for (let pass = 0; pass < 3; pass++) {
      groups = await listSnaps(c); marks = await listMarks(c);
      const commits = groups.filter((g) => g.commit && !voided(g, marks) && (!dev || sameFranchise(g, dev))).sort((a, b) => (isNewer(a, b) ? -1 : 1));
      let torn = false;
      for (const g of commits) {
        const r = await readGen(c, g);
        if (r.ok) { if (voided(g, await listMarks(c))) break; return r.f; } // a deletion landed while it was read: invalid
        torn = true;
      }
      if (!torn) break; // nothing was cleaned up under us: listing again cannot help
      await new Promise((r) => setTimeout(r, 120 * (pass + 1))); // a newer generation was published and this one removed meanwhile
    }
    // First run after the update: the v39.0/v39.1 copy, only if no v39.2 copy of the franchise exists at all, and never for a
    // franchise that was deleted (old-build timestamps are not trusted, so any marker for it voids it).
    if (groups.some((g) => g.commit && (!dev || sameFranchise(g, dev)))) return null;
    const f = await readLegacy(c);
    if (!f || marks.some((m) => sameFranchise(m, f)) || (await listMarks(c)).some((m) => sameFranchise(m, f))) return null;
    if (dev && !sameFranchise(f, dev) && (str(f.uid) || str(f.createdAt))) return null; // one with no identity at all is offered
    return f;
  } catch (e) { setStatus({ error: e?.code || 'unavailable' }); return null; }
}

// ------------------------------------------------------------ writing
let inflight = null; // one write at a time per tab: a later write starts only after the earlier one has finished (GDD §43.6)
let lastWritten = { id: null, savedAt: 0 }; // the newest copy this session wrote, and its franchise
export const cloudUsage = { chunks: 0, chars: 0, documents: 0, writes: 0, lastWriteMs: null };
/**
 * The payload of one authorised write, fixed at the moment it was authorised: the JSON text, its stamp and its franchise's
 * identity. A store save result passes its committed snapshot (`snapshot.json()`); a plain franchise object is serialised on
 * the spot. Either way, later changes to the live object can never reach the cloud through this write.
 */
function freezePayload(x, o = {}) {
  const json = x && typeof x.json === 'function' ? x.json() : JSON.stringify(x);
  return { json, savedAt: x?.savedAt ?? null, schemaVersion: x?.schemaVersion ?? null, uid: str(x?.uid), createdAt: str(o.createdAt) || str(x?.createdAt), epoch };
}
/** Remove a generation: its commit first (readers stop choosing it), then its chunks, then its intent (keeps it findable). */
async function dropGen(c, g) {
  if (g.commit) await c.snaps.doc(g.gen).delete().catch(() => {});
  for (let i = 0; i < (g.n || 0); i++) await c.chunks.doc(`${g.gen}_c${i}`).delete().catch(() => {});
  if (g.intent) await c.snaps.doc(`${g.gen}~w`).delete().catch(() => {});
}
/**
 * Clean-up. A generation is removed only (a) when its franchise was deleted (marker), or (b) when two newer COMMITTED
 * generations of the same franchise exist. Both facts stay true once seen, so a delayed or repeated removal stays correct, and
 * the two newest commits of a franchise are never removed. Under quota pressure (b) keeps one commit per franchise (the
 * newest is still never removed), so the newest progress fits before a spare copy is kept.
 */
async function cleanUp(c, { quota = false } = {}) {
  const groups = await listSnaps(c); const marks = await listMarks(c); // snaps first, then markers
  const commits = groups.filter((g) => g.commit);
  const newerCommits = (g) => commits.filter((h) => h.gen !== g.gen && sameFranchise(h, g) && isNewer(h, g)).length;
  for (const g of groups) if (voided(g, marks) || newerCommits(g) >= (quota ? 1 : 2)) await dropGen(c, g);
  if (swept) return; swept = true; // leftover chunks (their writer stopped after its intent was removed): once per session
  try {
    const gens = groups.map((g) => g.gen); if (gens.length > 30) return;
    const q = gens.length ? c.chunks.where('gen', 'not-in', gens).limit(10) : c.chunks.limit(10);
    for (const d of (await q.get()).docs || []) { const x = d.data(); const g = { gen: x.gen, uid: x.uid, createdAt: x.createdAt, savedAt: x.savedAt }; if (voided(g, marks) || newerCommits(g) >= 2) await c.chunks.doc(d.id).delete().catch(() => {}); }
  } catch { /* the sweep is optional */ }
}
async function writeNow(p) {
  const c = await connect(); if (!c) return false;
  if (p.epoch !== epoch) return true; // authorised before the franchise was deleted in this tab
  if (!str(p.uid) && !str(p.createdAt)) { setStatus({ state: 'on', error: 'unidentified' }); return true; } // could never be cleaned up or deleted
  if (p.savedAt != null && sameFranchise(lastWritten.id, p) && p.savedAt < lastWritten.savedAt) return true; // never an older state of the franchise this session last wrote
  const t0 = Date.now(); let gen = null;
  try {
    await flushDeletions(c);
    if (voided(p, await listMarks(c))) { setStatus({ state: 'on', error: 'deleted' }); return true; } // deleted (here or elsewhere)
    const groups = await listSnaps(c);
    if (groups.some((g) => g.commit && sameFranchise(g, p) && at(g) >= at(p))) { setStatus({ state: 'on', error: null, skipped: (status.skipped || 0) + 1 }); return true; }
    gen = makeGen(p.savedAt); const text = ascii(p.json); const n = Math.max(1, Math.ceil(text.length / CHUNK));
    const head = { gen, uid: p.uid, createdAt: p.createdAt, savedAt: p.savedAt, n };
    await c.snaps.doc(`${gen}~w`).set({ ...head, at: Date.now() });
    for (let i = 0; i < n; i++) await c.chunks.doc(`${gen}_c${i}`).set({ gen, i, n, uid: p.uid, createdAt: p.createdAt, savedAt: p.savedAt, s: text.slice(i * CHUNK, (i + 1) * CHUNK) });
    await c.snaps.doc(gen).set({ ...head, schemaVersion: p.schemaVersion, len: text.length, sum: fnv(text), storage: STORAGE, at: Date.now() });
    lastWritten = { id: { uid: p.uid, createdAt: p.createdAt }, savedAt: sameFranchise(lastWritten.id, p) ? Math.max(lastWritten.savedAt, p.savedAt || 0) : (p.savedAt || 0) };
    if (p.epoch === epoch) setNoAdopt(false); // a franchise is active on this device again (not an upload from before a deletion)
    try { await cleanUp(c); } catch { /* best effort: the next upload cleans up */ }
    Object.assign(cloudUsage, { chunks: n, chars: text.length, documents: n + 2, writes: cloudUsage.writes + 1, lastWriteMs: Date.now() - t0 });
    setStatus({ state: 'on', at: p.savedAt, error: null });
    return true;
  } catch (e) {
    if (e?.code === 'quota_exceeded' && !p.quotaRetry) { // free this failed attempt (uncommitted, nobody depends on it), trim, retry once
      if (gen) { try { await dropGen(c, { gen, commit: null, intent: true, n: Math.max(1, Math.ceil(ascii(p.json).length / CHUNK)) }); } catch { /* ignore */ } }
      try { await cleanUp(c, { quota: true }); } catch { /* ignore */ }
      return writeNow({ ...p, quotaRetry: true });
    }
    if (e?.code === 'quota_exceeded' && gen) { try { await dropGen(c, { gen, commit: null, intent: true, n: Math.max(1, Math.ceil(ascii(p.json).length / CHUNK)) }); } catch { /* ignore */ } } // never leave it behind
    setStatus({ error: e?.code || 'unavailable' }); return false;
  }
}
/** Queue a write behind any write in flight; only the newest pending state is written next. */
function enqueue(f) {
  pending = f;
  if (inflight) return inflight;
  inflight = (async () => { while (pending) { const p = pending; pending = null; await writeNow(p); } inflight = null; })();
  return inflight;
}

/**
 * Mirror with a throttle: a write happens within 4 s of the first pending change even while saves keep arriving (a match
 * saves every play), and at once for important changes (a game finished, a week advanced). `createdAt` identifies the
 * franchise together with the snapshot's uid.
 */
export function cloudSave(x, { immediate = false, createdAt = null } = {}) {
  if (!x) return;
  queued = freezePayload(x, { createdAt }); // fixed now: the payload is the state authorised by this call
  const run = () => { clearTimeout(timer); timer = null; const p = queued; queued = null; if (p) enqueue(p); };
  if (immediate) run(); else if (!timer) timer = setTimeout(run, 4000);
}
/** Flush a pending write right away (page hidden / unloading). */
export function cloudFlush() { if (queued) { clearTimeout(timer); timer = null; const p = queued; queued = null; return enqueue(p); } return inflight; }
/** Forget the session's newest-write guard (after the player deletes or replaces the franchise on purpose). */
export function cloudResetGuard() { lastWritten = { id: null, savedAt: 0 }; }

// ------------------------------------------------------------ deletion
/** Write the markers of this device's deletions that are not in the cloud yet, then remove what they void. */
async function flushDeletions(c) {
  const list = localDeletions(); const todo = list.filter((d) => !d.written); if (!todo.length) return;
  for (const d of todo) { await c.marks.doc(d.id).set({ type: 'delete', uid: d.uid, createdAt: d.createdAt, cutoff: d.cutoff, at: d.at }); d.written = true; }
  saveLocalDeletions(list);
  try { await cleanUp(c); } catch { /* the next upload cleans up */ }
}
/**
 * Delete franchise `f` ({uid, createdAt, savedAt}) from the cloud. Every copy of it saved up to this moment becomes invalid
 * for every reader, whatever order requests arrive in: the cut-off is fixed now (the newest of this device's save, the newest
 * copy visible in the cloud, and the time of deletion), so a marker that only reaches the cloud later can never invalidate
 * progress made afterwards on another device. The deletion is recorded on this device first and retried until written.
 */
export async function cloudClear(f = null) {
  // Recorded on the device first, before waiting for anything, so closing the page now cannot lose the deletion.
  epoch++; clearTimeout(timer); timer = null; queued = null; pending = null; // nothing authorised before this is uploaded
  lastWritten = { id: null, savedAt: 0 }; setNoAdopt(true);
  const id = { uid: str(f?.uid), createdAt: str(f?.createdAt) };
  const t = Date.now(); let rec = null;
  if (id.uid || id.createdAt) {
    rec = { id: `d~${safeId(id.uid || id.createdAt)}~${t.toString(36)}-${rand()}`, ...id, cutoff: Math.max(t, typeof f?.savedAt === 'number' ? f.savedAt : 0), at: t, written: false };
    saveLocalDeletions([...localDeletions(), rec]);
  }
  if (inflight) { try { await inflight; } catch { /* ignore */ } }
  const c = await connect();
  if (!rec) { if (c) { try { await c.col.doc('save_meta').delete(); } catch { /* ignore */ } } return; } // nothing identifies it
  if (!c) return;
  // the newest copy of it the cloud holds right now is covered too (a copy saved by a device whose clock runs ahead)
  try { let cut = rec.cutoff; for (const g of await listSnaps(c)) if (sameFranchise(g, id)) cut = Math.max(cut, at(g)); if (cut > rec.cutoff) saveLocalDeletions(localDeletions().map((d) => (d.id === rec.id && !d.written ? { ...d, cutoff: cut } : d))); } catch { /* offline: this device's view */ }
  try { await flushDeletions(c); } catch (e) { setStatus({ error: e?.code || 'unavailable' }); return; } // retried at the next start
  try { const old = await readLegacy(c); if (!old || sameFranchise(old, id)) await c.col.doc('save_meta').delete(); } catch { /* ignore */ } // a cached v39.0/v39.1 tab cannot adopt it
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
