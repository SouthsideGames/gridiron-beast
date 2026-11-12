// The game's wording, in one place (central text, stage 1: owner 2026-11-11).
//   en.js      every line of English the game shows, each under a stable key. To change a line, edit it there.
//   t(key)     the line for a key. t(key, { name, n }) fills {name} and {n}. A value written as { one, other } is a plural:
//              the form is chosen from `n` by the language's own plural rule.
// English is always the fallback: a key missing from another language shows the English line, and a key missing altogether
// shows the key itself (and is caught by tests/central-text.test.js, which checks every key the code uses).
// A language is chosen once, before the game starts drawing (setLanguage), because data modules read their text when they load.
// Text never decides anything: no rule, id or saved value is taken from here.
import en from './en.js';
import { KEEP_ENGLISH } from './names.js';

let table = en; let code = 'en'; let plural = null;
let LABEL_KEYS = null;   // wording -> key, for labels read from tables that were filled when the game loaded (captured, below)
const rule = () => (plural ||= (() => { try { return new Intl.PluralRules(code); } catch { return new Intl.PluralRules('en'); } })());

/** Use another language's table (same keys as en.js; missing keys fall back to English). */
export function setLanguage(lang, strings) {
  code = lang || 'en'; plural = null; LABEL_KEYS = null;
  table = strings ? { ...en, ...Object.fromEntries(Object.entries(strings).filter(([k]) => (k in en || k.startsWith('dex.')) && !KEEP_ENGLISH.has(k))) } : en; // names stay English; unknown keys are ignored (dex.* keys belong to the Beast Dex: ./dex.js)
}
export const language = () => code;

export function t(key, vars = null) {
  let s = table[key]; if (s === undefined) s = en[key];
  if (s === undefined) return key;
  if (typeof s === 'object') { const n = vars?.n; s = s[n === undefined ? 'other' : rule().select(Number(n))] ?? s.other ?? ''; }
  const out = vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
  if (REC) REC.push({ key, vars, out });
  if (out && String(en[key] ?? '').length !== 0 && (typeof en[key] !== 'string' || en[key].length >= 4)) { RECENT[at] = { key, vars, out }; at = (at + 1) % 256; }   // the size test is on the English line, so every language remembers the same lines
  return out;
}
let REC = null;   // the lines read while a saved sentence is being built (captured, below)
const RECENT = []; let at = 0;   // the last lines read: a sentence handed over as plain text is matched against them (recalled, below)
// ---- lines that are SAVED (news, notices, headlines): owner 2026-11-11, "saved text should follow a language change".
// A saved line keeps its key and values beside the sentence, so it can be shown again in whatever language is chosen:
//   line(key, vars)        -> { text, tk, tv }        one line
//   lineParts(a, b, …)     -> { text, tp: [...] }     several lines and plain values in a row (a name, a score)
//   lineText(saved)        -> the sentence to show now. A plain string, or a record saved before this existed, shows as written.
// `text` is always the English-at-the-time sentence: older builds and anything that only reads `text` still work.
const slim = (p) => { if (p && typeof p === 'object') return p.tp ? { tp: p.tp } : { tk: p.tk, ...(p.tv ? { tv: p.tv } : {}) }; if (typeof p !== 'string') return String(p); const r = recalled(p); return typeof r === 'string' ? r : r.tp ? { tp: r.tp } : { tk: r.tk, ...(r.tv ? { tv: r.tv } : {}) }; };   // a part built from lines just read (or a label) is saved as those lines
const shown = (vars, how) => (vars ? Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v && typeof v === 'object' ? how(v) : v])) : vars);   // a value may itself be a saved line
const kept = (vars) => (vars ? Object.fromEntries(Object.entries(vars).map(([k, v]) => { if (v && typeof v === 'object') return [k, slim(v)]; const lk = typeof v === 'string' ? labelKey(v) : null; return [k, lk ? { tk: lk } : v]; })) : vars);   // a value that is itself a label (an award's name, a coach's style) is saved as that line
export const line = (key, vars = null) => ({ text: t(key, shown(vars, lineText)), tk: key, ...(vars ? { tv: kept(vars) } : {}) });
export function lineParts(...parts) { const tp = parts.filter((p) => p !== '' && p !== null && p !== undefined && p !== false).map(slim); return { text: tp.map(lineText).join(''), tp }; }
export function lineText(x) { return typeof x === 'string' ? x : !x ? '' : x.tk ? t(x.tk, shown(x.tv, lineText)) : x.tp ? x.tp.map(lineText).join('') : (x.text ?? ''); }
// ---- capturing a sentence that is built from several lines by ordinary code (award citations, a free agent's clue, …).
// captured(() => build()) runs the builder, notes every line it reads, then finds those lines inside the finished sentence:
// the result is a saved line ({ text, tp }) whose parts are the lines (with their values) and the plain text between them.
// A line used as a value of another line is kept inside it. Anything that cannot be matched stays plain text, so the sentence
// is always exactly what the builder produced; captured() never changes wording, it only remembers where it came from.
const labelKey = (v) => { if (!LABEL_KEYS) { LABEL_KEYS = new Map(); for (const k of Object.keys(en)) { const e = table[k]; if (typeof e === 'string' && typeof en[k] === 'string' && en[k].length >= 3 && !/[{<]/.test(en[k]) && !KEEP_ENGLISH.has(k) && !LABEL_KEYS.has(e)) LABEL_KEYS.set(e, k); } } return LABEL_KEYS.get(v) ?? null; };   // in the language shown now (the tables were filled in it)
function split(s, calls, upTo) {
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
const sentence = (s, calls, outer) => {
  if (s && typeof s === 'object') return s;   // already a saved line
  s = String(s ?? '');
  calls.forEach((c, i) => { if (!c.vars) return; c.tv = {};
    for (const [k, v] of Object.entries(c.vars)) { if (typeof v !== 'string' || !v) { c.tv[k] = v && typeof v === 'object' ? slim(v) : v; continue; }
      const ps = split(v, calls, i); const lk = ps.length === 1 && typeof ps[0] === 'string' ? labelKey(v) : null;
      c.tv[k] = lk ? { tk: lk } : ps.length === 1 ? ps[0] : ps.some((x) => typeof x === 'object') ? { tp: ps } : v; } });
  const tp = split(s, calls, calls.length);
  if (outer) outer.push({ key: null, vars: null, out: '' });   // an outer capture sees this sentence as plain text
  if (tp.length === 1 && typeof tp[0] === 'object') return { text: s, ...tp[0] };   // the sentence is one line
  if (!tp.some((x) => typeof x === 'object')) { const lk = labelKey(s); return lk ? { text: s, tk: lk } : { text: s }; }   // a line read from a table filled at load
  return { text: s, tp };
};
export function captured(build) {
  const outer = REC; const calls = REC = []; let s;
  try { s = build(); } finally { REC = outer; }
  return sentence(s, calls, outer);
}
/** A finished sentence, matched against the lines read just before it was handed over. Plain text when nothing matches. */
export function recalled(s) {
  if (typeof s !== 'string' || !s.trim()) return s;
  const order = [...RECENT.slice(at), ...RECENT.slice(0, at)].filter((c) => c && s.includes(c.out)).map((c) => ({ key: c.key, vars: c.vars, out: c.out }));
  if (!order.length) { const lk = labelKey(s); return lk ? { text: s, tk: lk } : s; }
  const l = sentence(s, order, null); return l.tk || l.tp ? l : s;
}
/** The same for code that cannot be wrapped in one function: `const done = recording(); …build the sentence…; const saved = done(sentence)`. Always call done(). */
export function recording() { const outer = REC; const calls = REC = []; return (s) => { REC = outer; return sentence(s, calls, outer); }; }
/** A label read from a table that was filled when the game loaded (an award's name, a coach's style), as a line: it is found by its wording. */
export const labelLine = (v) => { const k = typeof v === 'string' ? labelKey(v) : null; return k ? { text: v, tk: k } : v; };
/** A record's field as a sentence plus its saved line: { why: 'sentence', whyL: line }. A sentence with no line in it is saved alone. */
export const lineField = (field, l) => (l && typeof l === 'object' ? { [field]: lineText(l), ...(l.tk || l.tp ? { [`${field}L`]: slim(l) } : {}) } : { [field]: l });
/** A record's field as a line to pass on (into another record, or as a value of another line): its saved line, or the plain sentence. */
export const fieldLine = (rec, field) => (rec && rec[`${field}L`] ? { text: rec[field], ...rec[`${field}L`] } : rec?.[field]);
/** What to show for a record's field: its saved line in the language chosen now, or the sentence as it was written. */
export const fieldText = (rec, field) => (rec && rec[`${field}L`] ? lineText(rec[`${field}L`]) : rec?.[field] ?? '');

/** A saved line as English, whatever language is shown: for the few rules that sort old notices by their wording (never show this). */
export function lineEnglish(x) { const tE = (key, vars) => { let v = en[key]; if (v === undefined) return key; if (typeof v === 'object') v = v[vars?.n === undefined ? 'other' : new Intl.PluralRules('en').select(Number(vars.n))] ?? v.other ?? ''; return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : v; };
  return typeof x === 'string' ? x : !x ? '' : x.tk ? tE(x.tk, shown(x.tv, lineEnglish)) : x.tp ? x.tp.map(lineEnglish).join('') : (x.text ?? ''); }
/** The saved fields of a line, to spread into a record that already has its own `text`: { tk, tv } or { tp }, or nothing for a plain string. */
export const lineFields = (x) => (x && typeof x === 'object' ? (x.tp ? { tp: x.tp } : x.tk ? { tk: x.tk, ...(x.tv ? { tv: x.tv } : {}) } : {}) : {});

/** A line whose English lives elsewhere (the Beast Dex): the chosen language's line for `key`, or `english` as given. */
export const tOr = (key, english) => { const s = table[key]; return typeof s === 'string' ? s : english; };
/** Every key and its English line (tools and tests). */
export const englishText = () => en;
