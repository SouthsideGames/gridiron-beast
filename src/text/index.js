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
/** A line whose English lives elsewhere (the Beast Dex): the chosen language's line for `key`, or `english` as given. */
export const tOr = (key, english) => { const s = table[key]; return typeof s === 'string' ? s : english; };
/** Every key and its English line (tools and tests). */
export const englishText = () => en;
