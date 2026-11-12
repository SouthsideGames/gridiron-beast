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
const rule = () => (plural ||= (() => { try { return new Intl.PluralRules(code); } catch { return new Intl.PluralRules('en'); } })());

/** Use another language's table (same keys as en.js; missing keys fall back to English). */
export function setLanguage(lang, strings) {
  code = lang || 'en'; plural = null;
  table = strings ? { ...en, ...Object.fromEntries(Object.entries(strings).filter(([k]) => (k in en || k.startsWith('dex.')) && !KEEP_ENGLISH.has(k))) } : en; // names stay English; unknown keys are ignored (dex.* keys belong to the Beast Dex: ./dex.js)
}
export const language = () => code;

export function t(key, vars = null) {
  let s = table[key]; if (s === undefined) s = en[key];
  if (s === undefined) return key;
  if (typeof s === 'object') { const n = vars?.n; s = s[n === undefined ? 'other' : rule().select(Number(n))] ?? s.other ?? ''; }
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}
// ---- lines that are SAVED (news, notices, headlines): owner 2026-11-11, "saved text should follow a language change".
// A saved line keeps its key and values beside the sentence, so it can be shown again in whatever language is chosen:
//   line(key, vars)        -> { text, tk, tv }        one line
//   lineParts(a, b, …)     -> { text, tp: [...] }     several lines and plain values in a row (a name, a score)
//   lineText(saved)        -> the sentence to show now. A plain string, or a record saved before this existed, shows as written.
// `text` is always the English-at-the-time sentence: older builds and anything that only reads `text` still work.
const slim = (p) => (p && typeof p === 'object' ? (p.tp ? { tp: p.tp } : { tk: p.tk, ...(p.tv ? { tv: p.tv } : {}) }) : String(p));
const shown = (vars, how) => (vars ? Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, v && typeof v === 'object' ? how(v) : v])) : vars);   // a value may itself be a saved line
export const line = (key, vars = null) => ({ text: t(key, shown(vars, lineText)), tk: key, ...(vars ? { tv: shown(vars, slim) } : {}) });
export function lineParts(...parts) { const tp = parts.filter((p) => p !== '' && p !== null && p !== undefined && p !== false).map(slim); return { text: tp.map(lineText).join(''), tp }; }
export function lineText(x) { return typeof x === 'string' ? x : !x ? '' : x.tk ? t(x.tk, shown(x.tv, lineText)) : x.tp ? x.tp.map(lineText).join('') : (x.text ?? ''); }
/** A saved line as English, whatever language is shown: for the few rules that sort old notices by their wording (never show this). */
export function lineEnglish(x) { const tE = (key, vars) => { let v = en[key]; if (v === undefined) return key; if (typeof v === 'object') v = v[vars?.n === undefined ? 'other' : new Intl.PluralRules('en').select(Number(vars.n))] ?? v.other ?? ''; return vars ? v.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : v; };
  return typeof x === 'string' ? x : !x ? '' : x.tk ? tE(x.tk, shown(x.tv, lineEnglish)) : x.tp ? x.tp.map(lineEnglish).join('') : (x.text ?? ''); }
/** The saved fields of a line, to spread into a record that already has its own `text`: { tk, tv } or { tp }, or nothing for a plain string. */
export const lineFields = (x) => (x && typeof x === 'object' ? (x.tp ? { tp: x.tp } : x.tk ? { tk: x.tk, ...(x.tv ? { tv: x.tv } : {}) } : {}) : {});

/** A line whose English lives elsewhere (the Beast Dex): the chosen language's line for `key`, or `english` as given. */
export const tOr = (key, english) => { const s = table[key]; return typeof s === 'string' ? s : english; };
/** Every key and its English line (tools and tests). */
export const englishText = () => en;
