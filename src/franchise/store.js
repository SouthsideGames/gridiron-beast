// Storage foundation (GDD §43, Phase 1). IndexedDB is the primary store for the franchise; the localStorage save of v39.1
// and earlier is migrated once (copy, verify, then switch) and kept untouched as a recovery copy.
//
// Database `gridiron-beast` (version 1), object stores:
//   slots    { slot, uid, state, migration, legacySum, savedAt }        the pointer: which save is live for a slot
//   saves    key 'slot<n>' → manifest                                   the live save of a slot
//   backups  key '<slot>:<kind>' → manifest (rolling) or embedded copy the two previous versions, weekly, safety copies
//   parts    key = checksum → { sum, enc, data, bytes }                 content-addressed save parts (core, history, draft)
//   global   reserved for the Hall of Fame, achievements and dex (they stay in localStorage in Phase 1: §43.2)
//
// A manifest: { slot, uid, storage: 7, fmt, savedAt, seq, writer, order, parts: { core|history|draft: { sum, raw, bytes,
// rawBytes, packedBytes } }, meta, lifecycle }. A franchise is split into three parts so the archive (history, draft results)
// is packed and written only when it changes, and backups that share a part store it once. Every write of a manifest, its
// new parts, the backup rotation and the clean-up of unreferenced parts is ONE transaction: it commits whole or not at all.
//
// The game's own save code (franchise objects, `app.save()`) is unchanged: this module queues saves, serialises a snapshot,
// packs (pack.js, lossless) and compresses changed parts outside the transaction, then commits. A later save never loses to an
// earlier one: saves run one at a time, a newer request replaces a pending one, and a manifest refuses a lower sequence from
// the same writer.

import { pack, unpack, checksum, gzip, gunzip, PACK_FORMAT } from './pack.js';
import * as Save from './save.js';
import { newUid } from '../core/uid.js';

export const STORAGE_VERSION = 7;
export const DB_NAME = 'gridiron-beast';
export const DB_VERSION = 1;
export const STORE_NAMES = Object.freeze(['slots', 'saves', 'backups', 'parts', 'global']);
export const SLOT = 1;
export const JOURNAL_KEY = 'gridiron-beast-v7-journal';
const KEY = (slot = SLOT) => `slot${slot}`;
const PARTS = Object.freeze(['core', 'history', 'draft']);
const ROLLING = Object.freeze(['roll0', 'roll1']); // the two latest previous versions

// ------------------------------------------------------------ backends
/** IndexedDB backend. `run(stores, mode, fn)` runs fn({ get, put, del, keys }) inside one transaction; resolves on commit. */
export async function idbBackend({ name = DB_NAME, indexedDB: idb = globalThis.indexedDB } = {}) {
  if (!idb) throw Object.assign(new Error('IndexedDB is not available in this browser.'), { code: 'unavailable' });
  const openDb = () => new Promise((resolve, reject) => {
    let req; try { req = idb.open(name, DB_VERSION); } catch (e) { reject(Object.assign(e, { code: 'unavailable' })); return; }
    req.onupgradeneeded = () => { const d = req.result; for (const s of STORE_NAMES) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s); };
    req.onsuccess = () => { const d = req.result; d.onversionchange = () => { d.close(); be.closed = true; }; d.onclose = () => { be.closed = true; }; resolve(d); };
    req.onerror = () => reject(Object.assign(req.error || new Error('IndexedDB failed to open.'), { code: 'open' }));
    req.onblocked = () => reject(Object.assign(new Error('Storage upgrade blocked by another tab of the game.'), { code: 'blocked' }));
  });
  const p = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const be = {
    kind: 'indexeddb', db: null, closed: false, reopened: 0,
    /** A transaction; if the browser closed the connection (storage cleared, another tab upgrading), it is reopened once. */
    async run(stores, mode, fn) {
      let tx;
      try { if (be.closed) throw Object.assign(new Error('closed'), { name: 'InvalidStateError' }); tx = be.db.transaction(stores, mode); }
      catch (e) { if (e?.name !== 'InvalidStateError') throw e; be.db = await openDb(); be.closed = false; be.reopened++; tx = be.db.transaction(stores, mode); }
      return new Promise((resolve, reject) => {
        let result; let failed = null;
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(failed || tx.error || Object.assign(new Error('The save transaction was aborted.'), { code: 'abort' }));
        tx.onerror = () => { /* surfaced by onabort */ };
        const api = { get: (s, k) => p(tx.objectStore(s).get(k)), put: (s, k, v) => p(tx.objectStore(s).put(v, k)), del: (s, k) => p(tx.objectStore(s).delete(k)), keys: (s) => p(tx.objectStore(s).getAllKeys()) };
        Promise.resolve().then(() => fn(api)).then((r) => { result = r; }, (e) => { failed = e; try { tx.abort(); } catch { /* already finished */ } });
      });
    },
    close() { try { be.db.close(); } catch { /* ignore */ } be.closed = true; },
  };
  be.db = await openDb();
  return be;
}
/**
 * In-memory backend with the same all-or-nothing transactions, for tests: `fail(point)` aborts the next transaction that
 * reaches that point, `quota` (bytes) makes oversized commits fail like a full browser store.
 */
export function memoryBackend({ quota = Infinity } = {}) {
  const data = Object.fromEntries(STORE_NAMES.map((s) => [s, new Map()]));
  const size = (v) => (v == null ? 0 : typeof v === 'string' ? v.length : v instanceof Uint8Array ? v.byteLength : typeof v === 'object' ? Object.values(v).reduce((a, x) => a + size(x), 16) : 8);
  const be = {
    kind: 'memory', data, quota, failpoints: new Set(), commits: 0, puts: { parts: 0, saves: 0, backups: 0 },
    fail(point) { be.failpoints.add(point); },
    hit(point) { if (be.failpoints.has(point)) { be.failpoints.delete(point); throw Object.assign(new Error(`Injected failure at ${point}`), { code: 'abort', injected: point }); } },
    bytes() { let n = 0; for (const s of STORE_NAMES) for (const v of data[s].values()) n += size(v); return n; },
    async run(stores, mode, fn) {
      const work = Object.fromEntries(STORE_NAMES.map((s) => [s, new Map(data[s])]));
      const counted = { parts: 0, saves: 0, backups: 0 };
      const api = { get: async (s, k) => clone(work[s].get(k)), put: async (s, k, v) => { if (mode !== 'readwrite') throw new Error('read-only transaction'); if (s in counted) counted[s]++; work[s].set(k, clone(v)); }, del: async (s, k) => { work[s].delete(k); }, keys: async (s) => [...work[s].keys()] };
      const r = await fn(api);
      be.hit('commit');
      if (mode === 'readwrite') {
        let n = 0; for (const s of STORE_NAMES) for (const v of work[s].values()) n += size(v);
        if (n > be.quota) throw Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError', code: 'quota' });
        for (const s of STORE_NAMES) data[s] = work[s]; be.commits++; for (const k of Object.keys(counted)) be.puts[k] += counted[k];
      }
      return r;
    },
    close() {},
  };
  return be;
}
const clone = (v) => (v == null ? v : v instanceof Uint8Array ? v.slice() : typeof v === 'object' ? (globalThis.structuredClone ? structuredClone(v) : JSON.parse(JSON.stringify(v))) : v);

// ------------------------------------------------------------ encoding a franchise
// savedAt lives in the manifest, not in a part: a save that changed nothing else then writes no part and rotates no backup.
const partsOf = (f) => { const { history, draftResults, savedAt, ...core } = f; return { core, history: history ?? null, draft: draftResults ?? null }; };
export { newUid };
/** Summary shown in recovery lists and the storage meter, read without unpacking. */
export function saveMeta(f) { const s = f.season || {}; return { club: f.club || null, owner: f.owner ? `${f.owner.first || ''} ${f.owner.last || ''}`.trim() : null, year: s.year ?? null, week: s.week ?? null, day: s.day ?? null, finished: !!s.finished, roster: f.roster?.length ?? 0, franchiseSchema: f.schemaVersion ?? null }; }
/** The future lifecycle field (GDD §42.4), recorded from the save's state; Phase 1 never acts on it. */
export function lifecycleOf(f) { return { status: f.board?.fired ? 'fired' : 'active', seasonsCompleted: (f.history || []).length }; }

/** Encode one part: pack (lossless), then gzip where available. Returns { part, entry } with checksums of both forms. */
export async function encodePart(value, raw = null) {
  const rawStr = raw ?? JSON.stringify(value);
  let packedStr = JSON.stringify(pack(value));
  // Every part is unpacked again before it is stored: if packing ever failed to reproduce the data exactly, the plain JSON is
  // stored instead (format 'json'), so a packer bug can cost space but never data.
  let verified = false; try { verified = JSON.stringify(unpack(JSON.parse(packedStr))) === rawStr; } catch { verified = false; }
  if (!verified) packedStr = JSON.stringify({ fmt: 'json', d: rawStr });
  const gz = await gzip(packedStr);
  const data = gz || packedStr; const enc = gz ? 'gzip' : 'none';
  const sum = checksum(data);
  return { part: { sum, enc, data, bytes: gz ? gz.byteLength : packedStr.length }, entry: { sum, raw: checksum(rawStr), bytes: gz ? gz.byteLength : packedStr.length, rawBytes: rawStr.length, packedBytes: packedStr.length } };
}
export async function decodePart(part, expectedSum) {
  if (!part) throw Object.assign(new Error('A part of the save is missing.'), { code: 'missing' });
  if (checksum(part.data) !== part.sum || (expectedSum && part.sum !== expectedSum)) throw Object.assign(new Error('A part of the save failed its integrity check.'), { code: 'checksum' });
  const str = part.enc === 'gzip' ? await gunzip(part.data) : part.data;
  const o = JSON.parse(str); if (o?.fmt === 'json') return JSON.parse(o.d);
  return unpack(o);
}
function assemble(order, core, history, draft, savedAt) {
  const f = {}; const src = { ...core }; if (history !== null) src.history = history; if (draft !== null) src.draftResults = draft;
  if (savedAt !== undefined && savedAt !== null && (!order || order.includes('savedAt'))) src.savedAt = savedAt;
  for (const k of order || Object.keys(src)) if (k in src) f[k] = src[k];
  for (const k of Object.keys(src)) if (!(k in f)) f[k] = src[k];
  return f;
}

// ------------------------------------------------------------ the store
/**
 * Create a store over a backend. Options: { backend, localStorage, now, writer, debounce }.
 * Status events: { state: 'idle'|'pending'|'saving'|'saved'|'error', savedAt, error, bytes }.
 */
export function createStore({ backend, localStorage: ls = (() => { try { return globalThis.localStorage || null; } catch { return null; } })(), now = () => Date.now(), writer = newUid().slice(0, 8), debounce = 350 } = {}) {
  const listeners = new Set();
  let status = { state: 'idle', savedAt: null, error: null, bytes: null, lastOkAt: null };
  const emit = (s) => { status = { ...status, ...s }; for (const fn of listeners) { try { fn(status); } catch { /* ignore */ } } };
  let seq = 0; let cache = {}; // part name → { raw, entry } of the last committed save
  const crossTab = () => Object.assign(new Error('This franchise was changed or deleted in another tab or window of the game. Reload the game to continue from what is stored now.'), { code: 'newer-elsewhere' });
  let base = null; // { writer, seq } of the manifest this tab loaded or last committed: anything else found there was written by another tab
  let pendingF = null; let pendingWaiters = []; let timer = null; let writing = null;

  // ---- reading
  async function readManifest(key = KEY()) { return backend.run(['saves'], 'readonly', (t) => t.get('saves', key)); }
  async function loadManifest(m) {
    const got = await backend.run(['parts'], 'readonly', async (t) => { const o = {}; for (const n of PARTS) o[n] = await t.get('parts', m.parts[n].sum); return o; });
    const vals = {}; for (const n of PARTS) vals[n] = await decodePart(got[n], m.parts[n].sum);
    const f = assemble(m.order, vals.core, vals.history, vals.draft, m.savedAt);
    return f;
  }
  async function loadEmbedded(b) { const vals = {}; for (const n of PARTS) vals[n] = await decodePart(b.embedded[n], b.embedded[n].sum); return assemble(b.order, vals.core, vals.history, vals.draft, b.savedAt); }
  async function loadBackupRecord(b) {
    if (b.kind === 'legacy-original' || b.kind === 'legacy-newer') { // the protected v39.1 save, stored exactly as it was
      const text = b.enc === 'gzip' ? await gunzip(b.data) : b.data;
      if (checksum(text) !== b.sum) throw Object.assign(new Error('The original save copy failed its integrity check.'), { code: 'checksum' });
      return JSON.parse(text);
    }
    return b.embedded ? loadEmbedded(b) : loadManifest(b);
  }
  /** A committed manifest's cache, so the next save only re-packs parts that changed. */
  function primeCache(f, m) { const p = partsOf(f); cache = {}; for (const n of PARTS) { const raw = JSON.stringify(p[n]); if (checksum(raw) === m.parts[n].raw) cache[n] = { raw: m.parts[n].raw, entry: m.parts[n] }; } seq = Math.max(seq, m.writer === writer ? m.seq : 0); base = { writer: m.writer, seq: m.seq }; }

  // ---- writing
  /**
   * Freeze the franchise synchronously: every part is serialised in one go, so a save never mixes moments (the game may change
   * the live object while the async packing and the transaction run).
   */
  function freeze(f) {
    const p = partsOf(f); const raws = {}; for (const n of PARTS) raws[n] = JSON.stringify(p[n]);
    return { raws, savedAt: f.savedAt, uid: f.uid, schemaVersion: f.schemaVersion, order: Object.keys(f), meta: saveMeta(f), lifecycle: f.lifecycle ? { ...f.lifecycle } : lifecycleOf(f) };
  }
  async function encodeFrozen(fz, useCache = true) {
    const entries = {}; const newParts = [];
    for (const n of PARTS) {
      const rawSum = checksum(fz.raws[n]);
      if (useCache && cache[n] && cache[n].raw === rawSum) { entries[n] = cache[n].entry; continue; }
      const { part, entry } = await encodePart(JSON.parse(fz.raws[n]), fz.raws[n]); entries[n] = entry; newParts.push(part);
    }
    return { entries, newParts };
  }
  const partOk = (part, sum) => !!part && part.sum === sum && checksum(part.data) === sum;
  /** Commit a manifest with its new parts, rotating the previous one into the rolling backups and cleaning up parts. */
  async function commit(manifest, newParts, { rotate = true, slotState = 'active', migration = undefined } = {}) {
    return backend.run(['saves', 'backups', 'parts', 'slots'], 'readwrite', async (t) => {
      const cur = await t.get('saves', KEY(manifest.slot));
      if (cur && cur.writer === manifest.writer && cur.seq > manifest.seq) throw Object.assign(new Error('A newer save is already stored.'), { code: 'stale' });
      // Another tab or window changed this franchise since this tab loaded or last wrote it: a different manifest is live, or
      // none is (the franchise was deleted there). This tab's older state must not replace it or bring it back.
      if (rotate && base && (!cur || (cur.writer !== manifest.writer && !(cur.writer === base.writer && cur.seq === base.seq)))) throw crossTab();
      for (const part of newParts) if (!(await t.get('parts', part.sum))) await t.put('parts', part.sum, part);
      // Every part the manifest references must be present and intact in this same transaction (a part reused from the cache
      // may have been removed by another tab's clean-up): a manifest is never committed pointing at missing data.
      const fresh = new Set(newParts.map((x) => x.sum));
      for (const n of PARTS) { const sum = manifest.parts[n].sum; if (!fresh.has(sum) && !partOk(await t.get('parts', sum), sum)) throw Object.assign(new Error('A stored part this save relies on is missing.'), { code: 'missing-part' }); }
      backend.hit?.('parts-written');
      // Rolling backups hold the two latest previous versions that pass their integrity check: a damaged version is never
      // rotated in over a good one.
      // Every generation is verified before it moves: the outgoing live save before it becomes roll0, and roll0 before it
      // replaces roll1. A damaged roll0 is dropped rather than promoted, so a valid roll1 is never overwritten by it.
      const verified = async (m) => { if (!m?.parts) return false; for (const n of PARTS) if (!partOk(await t.get('parts', m.parts[n]?.sum), m.parts[n]?.sum)) return false; return true; };
      const changed = cur && PARTS.some((n) => cur.parts?.[n]?.sum !== manifest.parts[n].sum);
      if (rotate && changed && await verified(cur)) {
        const r0 = await t.get('backups', `${manifest.slot}:roll0`);
        if (r0 && await verified(r0)) await t.put('backups', `${manifest.slot}:roll1`, { ...r0, kind: 'roll1' });
        await t.put('backups', `${manifest.slot}:roll0`, { ...cur, kind: 'roll0' });
      }
      await t.put('saves', KEY(manifest.slot), manifest);
      const slot = (await t.get('slots', manifest.slot)) || { slot: manifest.slot };
      await t.put('slots', manifest.slot, { ...slot, slot: manifest.slot, uid: manifest.uid, state: slotState, savedAt: manifest.savedAt, ...(migration !== undefined ? { migration } : {}) });
      backend.hit?.('manifest-written');
      await collect(t);
      return manifest;
    });
  }
  /** Clean-up inside a transaction: parts referenced by no manifest go (rolling backups share parts; embedded copies own theirs). */
  async function collect(t) {
    const live = new Set(); for (const k of await t.keys('saves')) { const m = await t.get('saves', k); for (const n of PARTS) if (m?.parts?.[n]) live.add(m.parts[n].sum); }
    for (const k of await t.keys('backups')) { const b = await t.get('backups', k); if (b && !b.embedded) for (const n of PARTS) if (b.parts?.[n]) live.add(b.parts[n].sum); }
    for (const k of await t.keys('parts')) if (!live.has(k)) await t.del('parts', k);
  }
  function manifestFor(fz, entries, { slot = SLOT } = {}) {
    return { slot, uid: fz.uid, storage: STORAGE_VERSION, fmt: PACK_FORMAT, savedAt: fz.savedAt, seq: ++seq, writer, order: fz.order, parts: entries, meta: fz.meta, lifecycle: fz.lifecycle };
  }
  async function writeFrozen(fz, opts) {
    let { entries, newParts } = await encodeFrozen(fz);
    let m = manifestFor(fz, entries); if (opts?.extra) Object.assign(m, opts.extra);
    try { await commit(m, newParts, opts); }
    catch (e) {
      if (e?.code !== 'missing-part') throw e;
      cache = {}; ({ entries, newParts } = await encodeFrozen(fz, false)); // write every part afresh, once
      m = manifestFor(fz, entries); if (opts?.extra) Object.assign(m, opts.extra);
      await commit(m, newParts, opts);
    }
    base = { writer: m.writer, seq: m.seq };
    cache = {}; for (const n of PARTS) cache[n] = { raw: entries[n].raw, entry: entries[n] };
    const bytes = PARTS.reduce((a, n) => a + entries[n].bytes, 0);
    if ((pendingF?.savedAt ?? -1) <= fz.savedAt) clearJournal(); // nothing newer is waiting
    emit({ state: pendingF ? 'pending' : 'saved', savedAt: fz.savedAt, lastOkAt: fz.savedAt, error: null, bytes });
    return { ok: true, savedAt: fz.savedAt, bytes, manifest: m, snapshot: snapshotOf(fz) };
  }
  /**
   * The committed state as JSON, for the cloud mirror: built from the very strings that were committed, so it can never carry
   * a later change to the live object. Key order may differ from the franchise's (the reader does not depend on it).
   */
  function snapshotOf(fz) {
    return { savedAt: fz.savedAt, uid: fz.uid, schemaVersion: fz.schemaVersion, json() {
      let out = fz.raws.core.slice(0, -1); const add = (k, v) => { out += `${out.length > 1 ? ',' : ''}${JSON.stringify(k)}:${v}`; };
      if (fz.order.includes('history')) add('history', fz.raws.history);
      if (fz.order.includes('draftResults')) add('draftResults', fz.raws.draft);
      if (fz.order.includes('savedAt') && fz.savedAt != null) add('savedAt', JSON.stringify(fz.savedAt));
      return `${out}}`;
    } };
  }
  const stamp = (f) => { f.savedAt = Math.max(now(), (f.savedAt || 0) + 1, (status.lastOkAt || 0) + 1); };
  async function writeNow(f) { if (!f.uid) f.uid = newUid(); if (!f.lifecycle) f.lifecycle = lifecycleOf(f); return writeFrozen(freeze(f)); }
  /** Write one queued request and answer its callers. A request for a franchise replaced meanwhile is answered 'stale'. */
  async function writeQueued(f, waiters) {
    let res;
    if (retired.has(f)) res = { ok: false, error: { code: 'stale', message: 'That franchise was replaced.' } };
    else { emit({ state: 'saving' }); try { res = await writeNow(f); } catch (e) { res = { ok: false, error: classify(e) }; emit({ state: 'error', error: res.error }); } }
    for (const w of waiters) w(res);
  }
  async function drain() {
    while (pendingF && !reserved) { const f = pendingF; const waiters = pendingWaiters; pendingF = null; pendingWaiters = []; await writeQueued(f, waiters); }
    writing = null;
  }
  /**
   * Ask for a save of the franchise `f` (the live object). The save is stamped now (savedAt, as v39.1 did); the write happens
   * after a short debounce (at once with `immediate`). Resolves once that state, or a newer one, is committed, or has failed:
   * { ok, savedAt, bytes } or { ok: false, error }.
   */
  function save(f, { immediate = false } = {}) {
    if (!f) return Promise.resolve({ ok: false, error: { code: 'none', message: 'No franchise.' } });
    if (retired.has(f)) return Promise.resolve({ ok: false, error: { code: 'stale', message: 'That franchise was replaced.' } });
    if (!f.uid) f.uid = newUid();
    f.lifecycle = { ...f.lifecycle, ...lifecycleOf(f) }; // recorded for Phase 2 (GDD §42.4); nothing acts on it yet
    stamp(f);
    return new Promise((resolve) => {
      pendingF = f; pendingWaiters.push(resolve); if (status.state !== 'saving') emit({ state: 'pending' });
      const go = () => { timer = null; if (!writing && !reserved) writing = drain(); };
      if (reserved) return; // an exclusive operation holds the queue: this request runs right after it (or is answered 'stale')
      if (immediate || debounce === 0) { clearTimeout(timer); timer = null; go(); } else if (!timer) timer = setTimeout(go, debounce);
    });
  }
  /** Run any pending save at once and wait for the queue to be empty. */
  async function flush() { if (timer) { clearTimeout(timer); timer = null; if (!writing && !reserved && pendingF) writing = drain(); } if (writing) await writing; if (reserved) await exclusiveTail; }
  /**
   * Run `fn` with the save queue held: everything queued before is committed first, saves requested meanwhile wait, and they
   * run afterwards (unless `fn` replaced their franchise). Restores and replacements use it, so an ordinary save can never
   * interleave with them.
   */
  let reserved = 0; let exclusiveTail = Promise.resolve();
  /**
   * Run `fn` as an exclusive storage operation (restore, replacement, deletion). The reservation is taken synchronously, when
   * the operation is requested, before any await:
   *   - a save already being written finishes; a save requested before this call (still waiting for its debounce) is
   *     written first, in order;
   *   - saves requested after this call wait until the operation has finished, then run (or are answered 'stale' if their
   *     franchise was replaced);
   *   - competing exclusive operations queue in call order (not rejected), and each rechecks its own preconditions when
   *     its turn comes;
   *   - the reservation is released in `finally`, after success or failure, and the queue is restarted, so nothing is stranded.
   */
  function exclusive(fn) {
    reserved++;
    clearTimeout(timer); timer = null;
    const before = pendingF ? { f: pendingF, waiters: pendingWaiters } : null; pendingF = null; pendingWaiters = [];
    const run = exclusiveTail.then(async () => {
      try {
        while (writing) await writing;
        if (before) await writeQueued(before.f, before.waiters);
        return await fn();
      } finally { reserved--; if (!reserved && pendingF && !writing) writing = drain(); }
    });
    exclusiveTail = run.then(() => {}, () => {});
    return run;
  }
  /** Drop a queued save of a franchise that has just been replaced: its callers learn it was not written. */
  function dropQueued(f) { if (pendingF && pendingF === f) { const ws = pendingWaiters; pendingF = null; pendingWaiters = []; for (const w of ws) w({ ok: false, error: { code: 'stale', message: 'That franchise was replaced.' } }); } }
  const busy = () => !!(pendingF || writing || timer || reserved);

  // ---- the unload journal: when the page is hidden with a save still queued, the parts that differ from the last committed
  // save (normally only the core: the archive changes once a season) go to localStorage synchronously. The next start adopts
  // the journal only if it belongs to the same franchise, is newer, and the committed parts it builds on are still there.
  function journal(f) {
    if (!ls || !f || !busy()) return false;
    try {
      const fz = freeze(f); const parts = {}; const bases = {};
      for (const n of PARTS) { const rs = checksum(fz.raws[n]); if (cache[n] && cache[n].raw === rs) bases[n] = cache[n].entry.sum; else parts[n] = fz.raws[n]; }
      if (!Object.keys(parts).length) return false; // nothing but the time changed: the committed save already holds it
      const body = JSON.stringify({ v: 2, uid: fz.uid, savedAt: fz.savedAt, order: fz.order, base: bases, on: base, parts });
      ls.setItem(JOURNAL_KEY, JSON.stringify({ sum: checksum(body), body }));
      return true;
    } catch { return false; /* full or blocked: the queued IndexedDB write may still finish */ }
  }
  function readJournal() {
    if (!ls) return null;
    try { const w = JSON.parse(ls.getItem(JOURNAL_KEY) || 'null'); if (!w || checksum(w.body) !== w.sum) return null; const j = JSON.parse(w.body); return j?.v === 2 ? j : null; } catch { return null; }
  }
  async function assembleJournal(j) {
    const vals = {};
    for (const n of PARTS) {
      if (j.parts[n] != null) { vals[n] = JSON.parse(j.parts[n]); continue; }
      const part = await backend.run(['parts'], 'readonly', (t) => t.get('parts', j.base[n]));
      vals[n] = await decodePart(part, j.base[n]); // throws if the base is gone: the journal is then not used
    }
    return assemble(j.order, vals.core, vals.history, vals.draft, j.savedAt);
  }
  function clearJournal() { try { ls?.removeItem(JOURNAL_KEY); } catch { /* ignore */ } }

  // ---- backups
  async function embeddedCopy(f, kind, extra = {}) {
    const fz = freeze(f); const embedded = {}; for (const n of PARTS) embedded[n] = (await encodePart(JSON.parse(fz.raws[n]), fz.raws[n])).part;
    return { kind, slot: SLOT, uid: fz.uid ?? null, storage: STORAGE_VERSION, fmt: PACK_FORMAT, savedAt: fz.savedAt ?? now(), takenAt: now(), order: fz.order, meta: fz.meta, embedded, ...extra };
  }
  /** Keep an independent copy (weekly, before a restore, before a cloud copy replaces this one, before deletion…). */
  const SINGLE = new Set(['weekly']); const KEEP_PER_KIND = 3; let copies = 0;
  /**
   * Keep an independent copy (weekly, before a restore, before a cloud copy replaces this one, a replaced or deleted
   * franchise…). The weekly copy is one record; every other kind keeps its three most recent copies, so a second replacement
   * never overwrites the first one's only copy.
   */
  async function keepCopy(f, kind, extra) {
    const b = await embeddedCopy(f, kind, extra);
    await backend.run(['backups'], 'readwrite', async (t) => {
      if (SINGLE.has(kind)) { await t.put('backups', `${SLOT}:${kind}`, b); return; }
      await t.put('backups', `${SLOT}:${kind}:${b.takenAt}.${++copies}`, b);
      const mine = (await t.keys('backups')).filter((k) => typeof k === 'string' && k.startsWith(`${SLOT}:${kind}:`)).sort((x, y) => parseFloat(y.split(':')[2]) - parseFloat(x.split(':')[2]));
      for (const k of mine.slice(KEEP_PER_KIND)) await t.del('backups', k);
    });
    return b;
  }
  const retired = new WeakSet(); // franchise objects replaced by a restore, a deletion or a new franchise: later saves of them are ignored
  function retire(f) { if (f && typeof f === 'object') retired.add(f); }
  async function listBackups() {
    const all = await backend.run(['backups'], 'readonly', async (t) => { const o = []; for (const k of await t.keys('backups')) o.push([k, await t.get('backups', k)]); return o; });
    const out = [];
    for (const [id, b] of all) { if (!b) continue; let ok = true, why = null, f = null; try { f = await loadBackupRecord(b); } catch (e) { ok = false; why = e.message; } out.push({ id, kind: b.kind, savedAt: b.savedAt ?? f?.savedAt ?? null, takenAt: b.takenAt || null, meta: b.meta || (f ? saveMeta(f) : null), ok, why, bytes: b.embedded ? PARTS.reduce((a, n) => a + (b.embedded[n]?.bytes || 0), 0) : b.bytes ?? null }); }
    return out.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }
  async function readBackup(id) { const b = await backend.run(['backups'], 'readonly', (t) => t.get('backups', id)); if (!b) throw new Error('That backup no longer exists.'); return Save.migrate(await loadBackupRecord(b)); }
  /**
   * Make `f` the live franchise in place of `current`, in this order, with the save queue held:
   *   1. a safety copy of `current` (kind `copyKind`) is committed; if it fails, nothing else happens;
   *   2. `f` is committed as the live save (verified, rotated, the other-tab guard applied); if it fails, nothing changed;
   *   3. only then is `current` retired (its late saves are ignored) and the result returned for the caller to adopt.
   * Never throws for a storage failure: returns { ok: false, error } with the current franchise still live and saveable.
   */
  function replace(f, current, opts = {}) { return exclusive(() => replaceLocked(f, current, opts)); }
  async function replaceLocked(f, current, { copyKind = 'replaced', guard = null } = {}) {
    if (current && retired.has(current)) return { ok: false, stage: 'stale', error: { code: 'stale', message: 'That franchise was already replaced; nothing was changed.' } };
    try {
      if (current) await keepCopy(current, copyKind);
      else { const m = await readManifest().catch(() => null); if (m) { try { await keepCopy(await loadManifest(m), copyKind); } catch { await quarantine(m); } } }
    } catch (e) { return { ok: false, stage: 'copy', error: classify(e) }; }
    const superseded = { ok: false, stage: 'superseded', error: { code: 'superseded', message: 'The game moved on while this was being prepared, so the newer progress was kept and nothing was replaced.' } };
    // `guard` (e.g. "the player has not played on") is checked here, after every wait and right before the commit...
    if (guard && !guard()) return superseded;
    if (current?.uid && !f.uid && current.createdAt === f.createdAt) f.uid = current.uid;
    if (!f.uid) f.uid = newUid();
    f.lifecycle = { ...f.lifecycle, ...lifecycleOf(f) };
    const before = f.savedAt; stamp(f); // the new live state is the newest: an older cloud or legacy copy must not win over it
    let r;
    try { r = await writeNow(f); } catch (e) { f.savedAt = before; return { ok: false, stage: 'commit', error: classify(e) }; }
    // ...and again once the commit has landed (the caller adopts in the same microtask chain, before any input can run). If
    // the player played on during the commit, their state is committed back as the live save; the replacement stays in the
    // rolling backups.
    if (guard && !guard() && current) {
      try { await writeNow(current); } catch (e) { return { ok: false, stage: 'superseded', error: { code: 'superseded', message: `The game moved on during the replacement, but putting the newer progress back failed (${classify(e).message}). Keep playing: the next save stores it.` } }; }
      return superseded;
    }
    retire(current); dropQueued(current);
    return { ...r, franchise: f };
  }

  /** Restore a backup: it is read and verified first (a corrupt backup changes nothing), then committed through replace(). */
  function restore(id, current = null) {
    return exclusive(async () => { // the queue is joined at once, so restores run in the order they were asked for
      let f;
      try { f = await readBackup(id); } catch (e) { return { ok: false, stage: 'read', error: classify(e) }; }
      if (!f) return { ok: false, stage: 'read', error: { code: 'invalid', message: 'That backup is not a readable franchise.' } };
      return replaceLocked(f, current, { copyKind: 'pre-restore' });
    });
  }
  /** A live save that fails its checks is kept as it is (its parts stay referenced) for diagnosis; it is never deleted. */
  async function quarantine(m) { await backend.run(['backups'], 'readwrite', async (t) => { await t.put('backups', `${SLOT}:quarantine`, { ...m, kind: 'quarantine', takenAt: now(), embedded: null }); }); }
  /** Delete the live franchise, keeping it recoverable as the 'deleted' backup. */
  async function remove(current) {
    return exclusive(async () => {
      if (current && retired.has(current)) throw Object.assign(new Error('That franchise was already replaced; nothing was deleted.'), { code: 'stale' });
      const cur = await readManifest().catch(() => null);
      if (cur && base && cur.writer !== writer && !(cur.writer === base.writer && cur.seq === base.seq)) throw Object.assign(new Error('This franchise was saved more recently in another tab or window of the game. Reload the game before deleting it.'), { code: 'newer-elsewhere' });
      if (current) await keepCopy(current, 'deleted');
      await backend.run(['saves', 'slots', 'parts', 'backups'], 'readwrite', async (t) => { await t.del('saves', KEY()); const s = (await t.get('slots', SLOT)) || { slot: SLOT }; await t.put('slots', SLOT, { ...s, state: 'empty', uid: null, savedAt: null }); for (const r of ROLLING) await t.del('backups', `${SLOT}:${r}`); await collect(t); });
      retire(current); dropQueued(current); // only now, after the copy and the deletion committed
      cache = {}; base = null; clearJournal(); emit({ state: 'idle', savedAt: null, bytes: null });
    });
  }


  // ---- migration of the localStorage save (v39.1 and earlier)
  /**
   * Copy → migrate on the copy → write → read back and compare → switch. Each step is recorded in the slot record, so an
   * interrupted migration restarts from the legacy copy (which is never modified) with the same uid: no duplicate franchise.
   */
  async function migrateLegacy({ legacyText, from = 'v6' }) {
    const legacySum = checksum(legacyText);
    const slot0 = await backend.run(['slots'], 'readonly', (t) => t.get('slots', SLOT));
    const uid = slot0?.migration?.legacySum === legacySum && slot0?.migration?.uid ? slot0.migration.uid : newUid();
    // 1. the protected copy, and the record of the attempt
    const kind = from === 'v6' ? 'legacy-original' : 'legacy-newer';
    const original = { kind, slot: SLOT, from, takenAt: now(), sum: legacySum, enc: 'none', data: legacyText, bytes: legacyText.length };
    const gz = await gzip(legacyText); if (gz) { original.enc = 'gzip'; original.data = gz; original.bytes = gz.byteLength; }
    const migration = { step: 'copied', legacySum, uid, startedAt: slot0?.migration?.legacySum === legacySum ? slot0.migration.startedAt : now(), attempts: (slot0?.migration?.legacySum === legacySum ? slot0.migration.attempts || 0 : 0) + 1 };
    await backend.run(['backups', 'slots'], 'readwrite', async (t) => {
      const have = await t.get('backups', `${SLOT}:${kind}`); if (!have || have.sum !== legacySum) { if (!have || kind === 'legacy-newer') await t.put('backups', `${SLOT}:${kind}`, original); }
      const s = (await t.get('slots', SLOT)) || { slot: SLOT };
      await t.put('slots', SLOT, { ...s, slot: SLOT, state: 'migrating', migration });
      backend.hit?.('migrate-copied');
    });
    // 2. migrate a separate copy
    const parsed = JSON.parse(legacyText); const f = Save.migrate(parsed);
    if (!f) throw Object.assign(new Error('The existing save could not be read.'), { code: 'legacy-invalid' });
    f.uid = uid; f.lifecycle = lifecycleOf(f);
    if (!f.savedAt) f.savedAt = now();
    // 3. write it (no rotation: there is nothing older in this database)
    const fz = freeze(f); const { entries, newParts } = await encodeFrozen(fz, false);
    const m = manifestFor(fz, entries); m.migratedFrom = { from, legacySum };
    await commit(m, newParts, { rotate: false, slotState: 'migrating', migration: { ...migration, step: 'written' } });
    backend.hit?.('migrate-written');
    // 4. read back and compare with the migrated copy
    const back = await loadManifest(await readManifest());
    if (JSON.stringify(back) !== JSON.stringify(f)) throw Object.assign(new Error('The migrated save did not read back identically.'), { code: 'verify' });
    // 5. switch: the slot is live, the legacy save is recorded as migrated (and left in place)
    backend.hit?.('migrate-switch');
    await backend.run(['slots'], 'readwrite', async (t) => { const s = (await t.get('slots', SLOT)) || {}; await t.put('slots', SLOT, { ...s, slot: SLOT, state: 'active', uid, savedAt: f.savedAt, legacySum, migration: { ...migration, step: 'done', at: now() } }); });
    primeCache(f, m);
    // The v39.1 weekly backup (localStorage) is carried over as the weekly copy, so "restore last week" keeps working.
    try {
      const wk = ls?.getItem(Save.BACKUP_KEY);
      const have = await backend.run(['backups'], 'readonly', (t) => t.get('backups', `${SLOT}:weekly`));
      if (wk && !have) { const b = Save.migrate(JSON.parse(wk)); if (b) { if (b.createdAt === f.createdAt) b.uid = uid; await keepCopy(b, 'weekly', { from: 'v6-weekly' }); } }
    } catch { /* the weekly copy stays in localStorage untouched */ }
    return f;
  }

  /**
   * Open the game's save. Returns { mode: 'ready'|'recovery'|'empty', franchise, source, notes, backups? }.
   * Never deletes or overwrites anything: a save that fails its checks sends the player to recovery.
   */
  async function open() {
    const notes = [];
    const slot = await backend.run(['slots'], 'readonly', (t) => t.get('slots', SLOT));
    const legacyText = (() => { try { return ls?.getItem(Save.SAVE_KEY) || null; } catch { return null; } })();
    const legacySum = legacyText ? checksum(legacyText) : null;
    const done = slot?.state === 'active' || slot?.state === 'empty';
    // First launch of v39.2 (or an interrupted migration): migrate the legacy save.
    if (!done && legacyText) {
      try { const f = await migrateLegacy({ legacyText }); notes.push('migrated'); return { mode: 'ready', franchise: f, source: 'migrated', notes }; }
      catch (e) { notes.push(`migration failed: ${e.message}`); const f = Save.migrate(JSON.parse(legacyText)); return f ? { mode: 'legacy', franchise: f, source: 'legacy', notes, error: classify(e) } : { mode: 'recovery', franchise: null, notes, backups: await listBackups().catch(() => []) }; }
    }
    // An old copy of the game wrote the legacy save after migration: that is newer progress, never ignored.
    const m = slot?.state === 'active' ? await readManifest().catch(() => null) : null;
    if (legacyText && slot?.legacySum && legacySum !== slot.legacySum) {
      let lf = null; try { lf = Save.migrate(JSON.parse(legacyText)); } catch { lf = null; }
      if (lf && (lf.savedAt || 0) > (m?.savedAt || 0)) {
        notes.push('newer legacy save adopted');
        if (m) { try { await keepCopy(await loadManifest(m), 'pre-legacy'); } catch { /* the live save is unreadable: recovery below still has backups */ } }
        await backend.run(['slots'], 'readwrite', async (t) => { const s = await t.get('slots', SLOT); await t.put('slots', SLOT, { ...s, state: 'migrating', migration: { step: 'readopt', legacySum, uid: m?.uid || s?.uid || null } }); });
        try { const f = await migrateLegacy({ legacyText, from: 'v6-newer' }); return { mode: 'ready', franchise: f, source: 'legacy-newer', notes }; }
        catch (e) { notes.push(`re-adoption failed: ${e.message}`); return { mode: 'legacy', franchise: lf, source: 'legacy', notes, error: classify(e) }; }
      }
    }
    // The unload journal is newer than the last committed save: adopt it.
    const j = readJournal();
    // Adopted only if the live save is still exactly the one the journal was built on: a stale tab's journal never replaces
    // what another tab saved since.
    const onLive = (x) => x && m && x.writer === m.writer && x.seq === m.seq;
    if (j && m && j.uid === m.uid && (j.savedAt || 0) > (m.savedAt || 0) && onLive(j.on)) {
      try {
        const f = Save.migrate(await assembleJournal(j));
        if (f) { notes.push('journal adopted'); primeCache(f, m); const r = await writeNow(f).catch((e) => ({ ok: false, error: classify(e) })); if (r.ok) clearJournal(); return { mode: 'ready', franchise: f, source: 'journal', notes }; }
      } catch (e) { notes.push(`journal ignored: ${e.message}`); }
    } else if (j) clearJournal();
    if (!m) return { mode: slot?.state === 'empty' || !slot ? 'empty' : 'recovery', franchise: null, notes, backups: slot && slot.state !== 'empty' ? await listBackups().catch(() => []) : [] };
    try {
      const raw = await loadManifest(m); const f = Save.migrate(raw);
      if (!f) throw Object.assign(new Error('The save could not be migrated.'), { code: 'migrate' });
      primeCache(raw, m); emit({ state: 'saved', savedAt: m.savedAt, lastOkAt: m.savedAt, bytes: PARTS.reduce((a, n) => a + m.parts[n].bytes, 0) });
      return { mode: 'ready', franchise: f, source: 'indexeddb', notes, manifest: m };
    } catch (e) {
      notes.push(`load failed: ${e.message}`);
      try { await quarantine(m); } catch { /* the manifest stays where it is; nothing is deleted either way */ }
      return { mode: 'recovery', franchise: null, notes, error: classify(e), backups: await listBackups().catch(() => []) };
    }
  }

  // ---- storage numbers for the meter
  async function usage() {
    const r = await backend.run(['saves', 'backups', 'parts'], 'readonly', async (t) => {
      const m = await t.get('saves', KEY()); const own = new Set(m ? PARTS.map((n) => m.parts[n].sum) : []);
      let save = 0, shared = 0, backups = 0, legacy = 0; const counted = new Set();
      for (const k of await t.keys('parts')) { const p = await t.get('parts', k); if (own.has(k)) save += p.bytes; else { backups += p.bytes; } counted.add(k); }
      for (const k of await t.keys('backups')) { const b = await t.get('backups', k); if (b?.embedded) for (const n of PARTS) backups += b.embedded[n]?.bytes || 0; if (b?.kind === 'legacy-original') legacy += b.bytes || (b.data?.length ?? 0); }
      return { save, backups, legacy, shared, payload: m ? PARTS.reduce((a, n) => a + m.parts[n].packedBytes, 0) : 0, raw: m ? PARTS.reduce((a, n) => a + m.parts[n].rawBytes, 0) : 0, savedAt: m?.savedAt || null };
    });
    let est = null; try { if (globalThis.navigator?.storage?.estimate) est = await navigator.storage.estimate(); } catch { est = null; }
    let persisted = null; try { if (globalThis.navigator?.storage?.persisted) persisted = await navigator.storage.persisted(); } catch { persisted = null; }
    let legacyLs = 0; try { legacyLs = (ls?.getItem(Save.SAVE_KEY)?.length || 0) + (ls?.getItem(Save.BACKUP_KEY)?.length || 0); } catch { legacyLs = 0; }
    return { ...r, legacyLocalStorage: legacyLs, estimate: est ? { usage: est.usage ?? null, quota: est.quota ?? null } : null, persisted };
  }

  return { backend, open, save, flush, busy, retire, replace, journal, readJournal, clearJournal, listBackups, readBackup, restore, keepCopy, remove, usage, migrateLegacy, onStatus: (fn) => { listeners.add(fn); fn(status); return () => listeners.delete(fn); }, status: () => status, readManifest, loadManifest };
}

/** A save error as the UI words it. */
export function classify(e) {
  const name = e?.name || ''; const code = e?.code || '';
  if (name === 'QuotaExceededError' || code === 'quota' || /quota/i.test(e?.message || '')) return { code: 'quota', message: 'This device is out of storage space for the game.' };
  if (code === 'stale') return { code: 'stale', message: 'A newer save was already stored.' };
  if (code === 'newer-elsewhere') return { code, message: e.message };
  if (code === 'checksum' || code === 'missing') return { code, message: 'Part of the save failed its integrity check.' };
  if (code === 'unavailable' || code === 'open' || code === 'blocked') return { code, message: e.message };
  return { code: code || 'abort', message: e?.message || 'The save did not complete.' };
}

// ------------------------------------------------------------ export and import (.gbfranchise)
export const EXPORT_FORMAT = 'gridiron-beast-franchise';
/** A complete, verifiable export: the franchise as JSON with its checksum and a summary. Plain JSON, so .json readers work. */
export function exportFranchise(f, { now = () => new Date() } = {}) {
  const body = JSON.stringify(f);
  return `{"app":"gridiron-beast","format":"${EXPORT_FORMAT}","version":1,"storage":${STORAGE_VERSION},"schemaVersion":${JSON.stringify(f.schemaVersion ?? null)},"uid":${JSON.stringify(f.uid ?? null)},"exportedAt":${JSON.stringify(now().toISOString())},"checksum":${JSON.stringify(checksum(body))},"meta":${JSON.stringify(saveMeta(f))},"franchise":${body}}`;
}
export const exportFileName = (f) => `gridiron-beast-${String(f.club || 'franchise').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${f.season?.year ?? 0}-w${f.season?.week ?? 0}.gbfranchise`;
/**
 * Validate an export (or an older .json export, or a bare franchise) on a copy before anything is written.
 * Returns { ok, franchise, meta, problems, warnings, format }.
 */
export function validateImport(text) {
  const problems = [], warnings = [];
  let obj; try { obj = JSON.parse(text); } catch { return { ok: false, problems: ['The file is not valid JSON.'], warnings }; }
  const isEnvelope = obj && obj.format === EXPORT_FORMAT;
  const raw = obj?.franchise || obj;
  if (isEnvelope) {
    if (obj.version !== 1) problems.push(`Unknown export version ${obj.version}.`);
    if (obj.checksum) { const start = text.indexOf('"franchise":'); const body = start >= 0 ? text.slice(start + 12, text.trimEnd().length - 1) : null; if (!body || checksum(body) !== obj.checksum) problems.push('The file failed its integrity check (it may be incomplete or edited).'); }
    else warnings.push('The file has no checksum.');
  } else warnings.push('An older export without a checksum: checked by content only.');
  let f = null; try { f = Save.migrate(JSON.parse(JSON.stringify(raw))); } catch (e) { problems.push(`The franchise could not be read: ${e.message}`); }
  if (!f) { if (!problems.length) problems.push('Not a Gridiron Beast franchise (schema 6).'); return { ok: false, problems, warnings, format: isEnvelope ? 'gbfranchise' : 'json' }; }
  if (!f.owner || !f.club || !f.season || !Array.isArray(f.roster)) problems.push('Required franchise fields are missing.');
  const ids = (f.roster || []).map((m) => m.id); if (new Set(ids).size !== ids.length) problems.push('Two roster monsters share an id.');
  if ((f.roster || []).some((m) => !m.id || !m.species)) problems.push('A roster monster has no id or species.');
  if (isEnvelope && obj.uid && f.uid && obj.uid !== f.uid) problems.push('The franchise id does not match its envelope.');
  return { ok: problems.length === 0, franchise: problems.length ? null : f, meta: saveMeta(f), problems, warnings, format: isEnvelope ? 'gbfranchise' : 'json', uid: f.uid || null };
}
