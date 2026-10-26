// AI Testing Lab storage (GDD §53.8): the human decision records, kept on this device in their own IndexedDB database
// ('gb-ai-lab'), separate from the franchise saves, the cloud save and the Beast Dex. Nothing here is uploaded anywhere; the
// owner exports a JSON file when he wants the data elsewhere. If IndexedDB is unavailable the records live in memory for the
// session (and the Lab says so).
const DB = 'gb-ai-lab', STORE = 'decisions', META = 'meta', VERSION = 2; // v2 (v42.6) adds 'meta': the defensive rotation per offensive play
let memory = null; // fallback when IndexedDB cannot be opened
let memoryMeta = {};
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      const idb = globalThis.indexedDB; if (!idb) { resolve(null); return; }
      const req = idb.open(DB, VERSION);
      req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'key' }); }; // upgrading keeps every stored decision
      req.onsuccess = () => resolve(req.result); req.onerror = () => resolve(null); req.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
  return dbp;
}
const tx = async (mode, fn) => { const db = await open(); if (!db) return null; return new Promise((resolve, reject) => { const t = db.transaction(STORE, mode); const s = t.objectStore(STORE); const out = fn(s); t.oncomplete = () => resolve(out?.result ?? out); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error); }); };

/** 'indexeddb' | 'memory' */
export async function labStorageMode() { return (await open()) ? 'indexeddb' : 'memory'; }
export async function labAll() { const db = await open(); if (!db) return (memory ||= []).slice(); return new Promise((resolve, reject) => { const r = db.transaction(STORE, 'readonly').objectStore(STORE).getAll(); r.onsuccess = () => resolve((r.result || []).sort((a, b) => String(a.at).localeCompare(String(b.at)))); r.onerror = () => reject(r.error); }); }
/** Add or replace records (by id: an identical decision in an identical situation is stored once). Returns the count written. */
export async function labPut(records) {
  const list = Array.isArray(records) ? records : [records];
  const db = await open(); if (!db) { memory ||= []; for (const r of list) { const i = memory.findIndex((x) => x.id === r.id); if (i >= 0) memory[i] = r; else memory.push(r); } return list.length; }
  await tx('readwrite', (s) => { for (const r of list) s.put(r); }); return list.length;
}
export async function labClear() { memory = []; await tx('readwrite', (s) => s.clear()); }
/** Approximate bytes used by the records, and the browser's storage estimate when it gives one. */
export async function labUsage(records) {
  const bytes = new Blob([JSON.stringify(records || [])]).size;
  let quota = null, usage = null; try { const e = await navigator.storage?.estimate?.(); quota = e?.quota ?? null; usage = e?.usage ?? null; } catch { /* not offered */ }
  return { bytes, quota, usage };
}
/** Test hook: forget the open database handle (so a test can swap in a fake indexedDB). */
export function _resetLabStore() { dbp = null; memory = null; memoryMeta = {}; }
/** Small Lab settings kept with the decisions (the defensive rotation). Never part of a franchise. */
export async function labMetaGet(key) {
  const db = await open(); if (!db) return memoryMeta[key] ?? null;
  return new Promise((resolve) => { try { const r = db.transaction(META, 'readonly').objectStore(META).get(key); r.onsuccess = () => resolve(r.result?.value ?? null); r.onerror = () => resolve(null); } catch { resolve(memoryMeta[key] ?? null); } });
}
export async function labMetaPut(key, value) {
  memoryMeta[key] = value; const db = await open(); if (!db) return;
  await new Promise((resolve) => { try { const t = db.transaction(META, 'readwrite'); t.objectStore(META).put({ key, value }); t.oncomplete = resolve; t.onerror = resolve; t.onabort = resolve; } catch { resolve(); } });
}
