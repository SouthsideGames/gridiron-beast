// The game logs' wording, for the engines (central text, stage 6: owner 2026-11-11, decision 3).
// The football and Beast Clash engines write a log as they play. Their sentences now come from the central text file, but an
// engine must give the same result whatever language the player reads, so it never asks for the chosen language:
//   E(key, values)   the ENGLISH line, always. A log's `text` is therefore the same English as before, in every language,
//                    and every reference battle and replay reads exactly as it did.
//   lineOf(text)     where a finished log sentence came from: { tk, tv } or { tp: [...] } (src/text/lines.js), from the lines
//                    read since the last log entry. The log keeps it beside `text`, and a screen shows the entry in the
//                    player's language with lineText(entry), from the text reader. Nothing in an engine reads it back.
// This file reads en.js only, never the text reader (the chosen language): tests/central-text.test.js holds that.
import en from '../text/en.js';
import { sentenceOf } from '../text/lines.js';

const plural = new Intl.PluralRules('en');
let read = [];   // the lines read since the last log entry
export function E(key, vars = null) {
  let s = en[key]; if (s === undefined) return key;
  if (typeof s === 'object') { const n = vars?.n; s = s[n === undefined ? 'other' : plural.select(Number(n))] ?? s.other ?? ''; }
  const out = vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
  if (out && read.length < 96) read.push({ key, vars, out });
  return out;
}
/** The lines `text` was built from, and a fresh start for the next entry. {} when it holds none (a plain value, an old phrase). */
export function lineOf(text) {
  const calls = read; read = [];
  if (typeof text !== 'string' || !calls.length) return {};
  const mine = calls.filter((c) => text.includes(c.out)); if (!mine.length) return {};
  const l = sentenceOf(text, mine);
  return l.tk ? { tk: l.tk, ...(l.tv ? { tv: l.tv } : {}) } : l.tp ? { tp: l.tp } : {};
}
/** Forget what was read (the start of a battle or a play), so an entry never picks up a line from an earlier one. */
export const resetLines = () => { read = []; };
