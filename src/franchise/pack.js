// Lossless save compaction (GDD §43.3). A franchise is packed only on its way to storage and unpacked on its way back, so
// the game's in-memory state never changes shape and no game code can be affected. The packed form is self-describing:
//   { fmt: 'gbp2', k: [field names], s: [repeated strings], h: [object shapes], d: tree }
// - field names that repeat (stat keys in thousands of league-table rows, monster fields) are replaced by short codes;
// - string values that repeat (club names, positions, species, types, monster names in tables) are replaced by codes;
// - an object whose exact field list (same names, same order) repeats, such as a league-table row, an award ballot entry or a
//   drafted monster, is stored as an array ['~*<shape>', value, value, …] and its field list once in `h`;
// - codes are '~' followed by a base-36 index; a real key or string that starts with '~' is escaped as '~~…', so neither
//   '~<n>' nor '~*<n>' can ever be a real value.
// The round trip is exact: JSON.stringify(unpack(pack(x))) === JSON.stringify(x) for every JSON-safe value (tested on
// 20-season franchises, key order included). Nothing is dropped, rounded or summarised: compaction never removes history.

export const PACK_FORMAT = 'gbp2';
const FORMATS = new Set(['gbp1', 'gbp2']);
const SHAPE_MIN_FIELDS = 3; // smaller objects are cheaper written out
const SHAPE_MIN_USES = 2;
const INT_KEY = /^(0|[1-9]\d*)$/;
const code = (i) => `~${i.toString(36)}`;
const shapeCode = (i) => `~*${i.toString(36)}`;
const esc = (s) => (s.charCodeAt(0) === 126 /* ~ */ ? `~${s}` : s);
const SEP = '\u0000';

/** JSON's own view of a value: undefined, functions and symbols vanish from objects, become null in arrays; NaN/±Infinity become null. */
function jsonValue(v) { if (typeof v === 'number') return Number.isFinite(v) ? v : null; if (v && typeof v.toJSON === 'function') return v.toJSON(); return v; }
const skip = (x) => x === undefined || typeof x === 'function' || typeof x === 'symbol';
const fieldsOf = (o) => Object.keys(o).filter((k) => !skip(o[k]));
const shapeable = (f) => f.length >= SHAPE_MIN_FIELDS && !f.some((k) => k.includes(SEP));
/** Set a key on a fresh object exactly as JSON.parse would (a key named __proto__ stays an own property). */
const put = (o, k, v) => { if (k === '__proto__') Object.defineProperty(o, k, { value: v, enumerable: true, writable: true, configurable: true }); else o[k] = v; };

/** Pass 1: how often each string and each object shape occurs. */
function survey(v, strs, shapes) {
  v = jsonValue(v);
  if (typeof v === 'string') { if (v.length >= 4) strs.set(v, (strs.get(v) || 0) + 1); return; }
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) { for (const x of v) survey(x, strs, shapes); return; }
  const f = fieldsOf(v);
  if (shapeable(f)) { const sig = f.join(SEP); shapes.set(sig, (shapes.get(sig) || 0) + 1); }
  for (const k of f) survey(v[k], strs, shapes);
}
/** Pass 2: how often each field name is written out (a shaped object writes its names once, in its shape). */
function countKeys(v, keys, shaped) {
  v = jsonValue(v);
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) { for (const x of v) countKeys(x, keys, shaped); return; }
  const f = fieldsOf(v);
  const isShaped = shapeable(f) && shaped.has(f.join(SEP));
  for (const k of f) { if (!isShaped && !INT_KEY.test(k)) keys.set(k, (keys.get(k) || 0) + 1); countKeys(v[k], keys, shaped); }
}
/** Build a dictionary: the entries whose replacement saves bytes, most valuable first (deterministic for equal values). */
function dictionary(freq, minCount) {
  const cands = [...freq.entries()].filter(([, n]) => n >= minCount).sort((a, b) => (b[1] * b[0].length) - (a[1] * a[0].length) || (a[0] < b[0] ? -1 : 1));
  const out = []; const map = new Map();
  for (const [s, n] of cands) { const c = code(out.length); const saving = n * (s.length - c.length) - (s.length + 3); if (saving <= 0) continue; map.set(s, c); out.push(s); }
  return { list: out, map };
}

/** Pack a JSON-safe value. Returns the packed object (stringify it to store). */
export function pack(value) {
  const strFreq = new Map(), shapeFreq = new Map(); survey(value, strFreq, shapeFreq);
  const shaped = new Map(); const shapeList = [];
  for (const [sig, n] of [...shapeFreq.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) if (n >= SHAPE_MIN_USES) { shaped.set(sig, shapeList.length); shapeList.push(sig.split(SEP)); }
  const keyFreq = new Map(); countKeys(value, keyFreq, shaped);
  for (const f of shapeList) for (const k of f) if (!INT_KEY.test(k)) keyFreq.set(k, (keyFreq.get(k) || 0) + 1);
  const K = dictionary(keyFreq, 2), S = dictionary(strFreq, 3);
  const ekey = (k) => (INT_KEY.test(k) ? k : (K.map.get(k) || esc(k)));
  const enc = (v) => {
    v = jsonValue(v);
    if (typeof v === 'string') return S.map.get(v) || esc(v);
    if (!v || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map((x) => { const y = enc(x); return y === undefined ? null : y; });
    const f = fieldsOf(v);
    if (shapeable(f)) { const i = shaped.get(f.join(SEP)); if (i !== undefined) { const row = [shapeCode(i)]; for (const k of f) row.push(enc(v[k])); return row; } }
    const o = {}; for (const k of f) put(o, ekey(k), enc(v[k]));
    return o;
  };
  return { fmt: PACK_FORMAT, k: K.list, s: S.list, h: shapeList.map((f) => f.map(ekey)), d: enc(value) };
}

/** Unpack a value packed by pack(). Throws on an unknown format or a code outside its dictionary (a corrupted save). */
export function unpack(p) {
  if (!p || !FORMATS.has(p.fmt) || !Array.isArray(p.k) || !Array.isArray(p.s)) throw new Error('Not a packed Gridiron Beast payload.');
  const K = p.k, S = p.s;
  const look = (list, s) => { const i = parseInt(s.slice(1), 36); if (s.length < 2 || !(i >= 0 && i < list.length)) throw new Error('Corrupted packed payload (unknown code).'); return list[i]; };
  const dstr = (s) => (s.charCodeAt(0) !== 126 ? s : s.charCodeAt(1) === 126 ? s.slice(1) : look(S, s));
  const dkey = (k) => (k.charCodeAt(0) !== 126 ? k : k.charCodeAt(1) === 126 ? k.slice(1) : look(K, k));
  const H = (p.h || []).map((f) => { if (!Array.isArray(f)) throw new Error('Corrupted packed payload (bad shape).'); return f.map(dkey); });
  const dec = (v) => {
    if (typeof v === 'string') return dstr(v);
    if (!v || typeof v !== 'object') return v;
    if (Array.isArray(v)) {
      const h = v[0];
      if (typeof h === 'string' && h.charCodeAt(0) === 126 && h.charCodeAt(1) === 42 /* * */) {
        const f = H[parseInt(h.slice(2), 36)];
        if (!f || v.length !== f.length + 1) throw new Error('Corrupted packed payload (bad shaped object).');
        const o = {}; for (let j = 0; j < f.length; j++) put(o, f[j], dec(v[j + 1])); return o;
      }
      return v.map(dec);
    }
    const o = {}; for (const k of Object.keys(v)) put(o, dkey(k), dec(v[k])); return o;
  };
  return dec(p.d);
}

/** FNV-1a 32-bit over a string's UTF-16 code units, or over bytes. Corruption detection, not security. */
export function checksum(data) {
  let h = 0x811c9dc5;
  if (typeof data === 'string') { for (let i = 0; i < data.length; i++) { h ^= data.charCodeAt(i); h = Math.imul(h, 0x01000193); } }
  else { const b = data instanceof Uint8Array ? data : new Uint8Array(data); for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193); } }
  return `${(h >>> 0).toString(16).padStart(8, '0')}:${typeof data === 'string' ? data.length : (data.byteLength ?? data.length)}`;
}

/** gzip a string to bytes where the platform has CompressionStream (browsers, Node 18+); null when it does not. */
export async function gzip(str) {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
export async function gunzip(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read compressed saves.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}
