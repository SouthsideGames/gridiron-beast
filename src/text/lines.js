// Finding the lines a sentence was built from (central text). Pure: no language, no table, nothing imported.
// Used by src/text/index.js (captured, recalled) for sentences the game saves, and by src/core/english.js for the game logs.
//   calls      what was read while the sentence was built, in order: [{ key, vars, out }]
//   returns    { text } | { text, tk, tv } | { text, tp: [part…] }   a part is plain text or a line { tk, tv }
// The sentence is never changed: the parts always join back to exactly `text`.
export function split(s, calls, upTo) {
  const parts = []; let at = 0; const open = []; for (let i = 0; i < upTo; i++) { const c = calls[i]; if (!c.used && c.out && c.out.trim()) open.push(c); }
  for (;;) {   // the next line to appear in the sentence, wherever in the builder it was read (the longest, when two start together)
    let best = null, where = -1;
    for (const c of open) { if (c.used) continue; const j = s.indexOf(c.out, at); if (j >= 0 && (best === null || j < where || (j === where && c.out.length > best.out.length))) { best = c; where = j; } }
    if (!best) break;
    if (where > at) parts.push(s.slice(at, where)); parts.push(best.saved ||= { tk: best.key, ...(best.tv ? { tv: best.tv } : {}) }); best.used = true; at = where + best.out.length;
  }
  if (at < s.length) parts.push(s.slice(at));
  return parts;
}
/** `labelKey(text)`: the key of a label that reads exactly `text`, or null. `slim(line)`: a line value reduced to what is saved. */
export function sentenceOf(s, calls, { labelKey = () => null, slim = (x) => x } = {}) {
  if (s && typeof s === 'object') return s;   // already a saved line
  s = String(s ?? '');
  calls.forEach((c, i) => { if (!c.vars) return; c.tv = {};
    for (const [k, v] of Object.entries(c.vars)) { if (typeof v !== 'string' || !v) { c.tv[k] = v && typeof v === 'object' ? slim(v) : v; continue; }
      const ps = split(v, calls, i); const lk = ps.length === 1 && typeof ps[0] === 'string' ? labelKey(v) : null;
      c.tv[k] = lk ? { tk: lk } : ps.length === 1 ? ps[0] : ps.some((x) => typeof x === 'object') ? { tp: ps } : v; } });
  const tp = split(s, calls, calls.length);
  if (tp.length === 1 && typeof tp[0] === 'object') return { text: s, ...tp[0] };   // the sentence is one line
  if (!tp.some((x) => typeof x === 'object')) { const lk = labelKey(s); return lk ? { text: s, tk: lk } : { text: s }; }   // a line read from a table filled at load
  return { text: s, tp };
}
