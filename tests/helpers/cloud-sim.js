// A simulated claude.ai document store for the cloud-save tests: documents at full slash paths, last-writer-wins, no
// transactions, collection listing in document-id order, `where` / `limit` queries, the documented cooperative lease, and
// the 256 KiB document limit. Gates hold chosen writes, deletes or reads until released, so interleavings are deterministic.
export function createCloudSim() {
  const docs = new Map(); // full path -> JSON text
  const leases = new Map();
  const gates = [];
  const hooks = { beforeGet: null, failSet: null, failGet: null, latency: null, offline: false };
  const stats = { sets: 0, deletes: 0, gets: 0, lists: 0, maxDocBytes: 0, inFlight: 0, maxInFlight: 0 };
  const wait = async () => { const ms = hooks.latency ? hooks.latency() : 0; if (ms) await new Promise((r) => setTimeout(r, ms)); };
  const net = () => { if (hooks.offline) throw err('unavailable', 'offline'); };
  const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
  /** Hold the next operation `op` ('set'|'delete'|'get') whose path and body match `pred`. */
  function gate(op, pred) { const g = { op, pred, used: false, reached: deferred(), open: deferred() }; gates.push(g); return { reached: g.reached.promise, release: () => g.open.resolve() }; }
  async function pass(op, path, body = '') { const g = gates.find((x) => !x.used && x.op === op && x.pred(path, body)); if (g) { g.used = true; g.reached.resolve(); await g.open.promise; } }
  const err = (code, message) => Object.assign(new Error(message), { code });
  const depth = (p) => p.split('/').length;
  function docRef(path) {
    const id = path.slice(path.lastIndexOf('/') + 1);
    return {
      id, path,
      async get() { stats.gets++; await null; await wait(); net(); if (hooks.beforeGet) await hooks.beforeGet(path); if (hooks.failGet) { const e = hooks.failGet(path); if (e) throw e; } await pass('get', path); return { id, exists: docs.has(path), data: () => (docs.has(path) ? JSON.parse(docs.get(path)) : undefined) }; },
      async set(v) {
        const body = JSON.stringify(v); stats.sets++; stats.maxDocBytes = Math.max(stats.maxDocBytes, Buffer.byteLength(body));
        if (Buffer.byteLength(body) > 256 * 1024) throw err('invalid_argument', 'document over 256 KiB');
        stats.inFlight++; stats.maxInFlight = Math.max(stats.maxInFlight, stats.inFlight);
        try { await wait(); net(); if (hooks.failSet) { const e = hooks.failSet(path, body); if (e) throw e; } await pass('set', path, body); docs.set(path, body); } finally { stats.inFlight--; }
      },
      async update(v) { if (!docs.has(path)) throw err('invalid_argument', 'missing'); docs.set(path, JSON.stringify({ ...JSON.parse(docs.get(path)), ...v })); },
      async delete() { stats.deletes++; await null; await wait(); net(); await pass('delete', path); docs.delete(path); },
      async acquire({ holder, ttlMs = 30000, data }) { await null; if (data) await pass('set', path, JSON.stringify(data)); const l = leases.get(path); const t = Date.now(); if (l && l.holder !== holder && l.until > t) return { acquired: false }; leases.set(path, { holder, until: t + Math.max(1000, ttlMs) }); if (data) docs.set(path, JSON.stringify({ ...(docs.has(path) ? JSON.parse(docs.get(path)) : {}), ...data })); return { acquired: true, holder }; },
      collection(sub) { return collRef(`${path}/${sub}`); },
    };
  }
  function query(path, filters = [], lim = null) {
    return {
      where(f, op, v) { return query(path, [...filters, [f, op, v]], lim); },
      limit(n) { return query(path, filters, n); },
      async get() {
        stats.lists++; await null; await wait(); net();
        const prefix = `${path}/`; let out = [...docs.keys()].filter((k) => k.startsWith(prefix) && depth(k) === depth(path) + 1).sort();
        out = out.filter((k) => filters.every(([f, op, v]) => { const x = JSON.parse(docs.get(k))[f]; return op === '==' ? x === v : op === 'not-in' ? !v.includes(x) : op === 'in' ? v.includes(x) : true; }));
        if (lim) out = out.slice(0, lim);
        const list = out.map((k) => { const body = docs.get(k); return { id: k.slice(prefix.length), exists: true, data: () => JSON.parse(body) }; });
        return { docs: list, size: list.length, empty: !list.length };
      },
    };
  }
  function collRef(path) { return { ...query(path), path, doc: (id) => docRef(`${path}/${id}`) }; }
  const db = { collection: (p) => collRef(p), doc: (p) => docRef(p) };
  /** Install as the page's `claude.use` for viewer `viewer`. */
  function install(viewer = 'viewer-1') { globalThis.claude = { use: async (n) => (n === 'db' ? db : n === 'user' ? { id: async () => viewer } : null) }; }
  function reset() { docs.clear(); leases.clear(); gates.length = 0; Object.assign(hooks, { beforeGet: null, failSet: null, failGet: null, latency: null, offline: false }); Object.assign(stats, { sets: 0, deletes: 0, gets: 0, lists: 0, maxDocBytes: 0, inFlight: 0, maxInFlight: 0 }); }
  const keys = (frag = '') => [...docs.keys()].filter((k) => k.includes(frag)).sort();
  return { docs, leases, gate, hooks, stats, install, reset, keys, db };
}
/** A tiny in-memory localStorage. */
export function memoryLocalStorage() { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, clear: () => m.clear(), m }; }
