// Saved lines (central text, stage 3: owner 2026-11-11 "saved text should follow a language change").
// A notice that is kept in the save holds its key and values beside the sentence, so it can be shown again in another language.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { t, setLanguage, line, lineParts, lineText, lineEnglish, lineFields, englishText } from '../src/text/index.js';
import * as F from '../src/franchise/franchise.js';
import { importJson } from '../src/franchise/save.js';
import { moveLine, moveText } from '../src/franchise/league-news.js';

const en = englishText();
const other = (keys) => Object.fromEntries(keys.map((k) => [k, typeof en[k] === 'string' ? `«${en[k]}»` : Object.fromEntries(Object.entries(en[k]).map(([f, v]) => [f, `«${v}»`]))]));

test('a line keeps its key and values; lineText shows it in the language chosen now', () => {
  const l = line('menu.week', { week: 3 });
  assert.deepEqual(l, { text: 'Week 3', tk: 'menu.week', tv: { week: 3 } });
  assert.deepEqual(JSON.parse(JSON.stringify(l)), l, 'it survives the save as plain data');
  try { setLanguage('zz', { 'menu.week': 'Semana {week}' }); assert.equal(lineText(l), 'Semana 3'); assert.equal(lineEnglish(l), 'Week 3'); assert.equal(l.text, 'Week 3', 'the saved copy is untouched'); }
  finally { setLanguage('en'); }
  assert.equal(lineText(l), 'Week 3');
});

test('several lines and plain values in a row; a value inside a line may itself be a line', () => {
  const p = lineParts(line('menu.week', { week: 2 }), ' · ', 'Ember City Beasts', '', null, 7);
  assert.equal(p.text, 'Week 2 · Ember City Beasts7'); assert.deepEqual(p.tp, [{ tk: 'menu.week', tv: { week: 2 } }, ' · ', 'Ember City Beasts', '7']);
  const nested = line('menu.stopped', { reason: line('menu.week', { week: 9 }) });
  assert.equal(nested.text, t('menu.stopped', { reason: 'Week 9' })); assert.deepEqual(nested.tv, { reason: { tk: 'menu.week', tv: { week: 9 } } });
  try { setLanguage('zz', { 'menu.week': 'Semana {week}' }); assert.equal(lineText(p), 'Semana 2 · Ember City Beasts7'); assert.equal(lineText(nested), t('menu.stopped', { reason: 'Semana 9' })); assert.equal(lineEnglish(nested), nested.text); }
  finally { setLanguage('en'); }
});

test('a plain sentence, and a record saved before lines existed, show as written', () => {
  assert.equal(lineText('Old news.'), 'Old news.'); assert.equal(lineText({ text: 'Old news.', kind: 'info' }), 'Old news.'); assert.equal(lineText(null), ''); assert.deepEqual(lineFields('x'), {});
  const old = importJson(readFileSync(new URL('./fixtures/save-v10-season2.json', import.meta.url), 'utf8')); const f = old.franchise || old.f || old;
  assert.ok(f.news.length > 0);
  try { setLanguage('zz', other(Object.keys(en))); for (const n of f.news) assert.equal(lineText(n), n.text, 'an old item keeps its sentence'); }
  finally { setLanguage('en'); }
});

test('the club log saves lines: an item written in English is shown in another language later, and its English copy stays', () => {
  const f = { news: [], season: { week: 4, year: 2 } };
  F.news(f, line('menu.week', { week: 4 }), 'roster', { mid: 'm_1', mname: 'Flaroo' });
  F.news(f, 'A plain sentence.', 'info');
  assert.deepEqual(f.news[1], { text: 'Week 4', tk: 'menu.week', tv: { week: 4 }, kind: 'roster', week: 4, year: 2, mid: 'm_1', mname: 'Flaroo' });
  assert.deepEqual(f.news[0], { text: 'A plain sentence.', kind: 'info', week: 4, year: 2 }, 'a plain sentence is saved exactly as before');
  try { setLanguage('zz', { 'menu.week': 'Semana {week}' }); assert.equal(lineText(f.news[1]), 'Semana 4'); assert.equal(lineText(f.news[0]), 'A plain sentence.'); }
  finally { setLanguage('en'); }
});

test('League News moves are saved lines, and the sentence is the same English as before', () => {
  const e = { kind: 'draft', club: 'Ember City Beasts', mname: 'Flaroo', position: 'RB', ovr: 61, age: 21, overall: 5, round: 1 };
  const l = moveLine(e); assert.ok(l.tk, 'a key is saved'); assert.equal(l.text, moveText(e)); assert.match(l.text, /Ember City Beasts/); assert.match(l.text, /Flaroo \(RB/);
  const r = moveLine({ kind: 'retire', mname: 'Flaroo', age: 33, club: 'Ember City Beasts' }); assert.match(r.text, /retires/); assert.ok(!/\s$/.test(r.text));
  const keys = [l.tk, ...JSON.stringify(r).match(/franchise\.[\w]+/g)];
  try { setLanguage('zz', other(keys)); assert.match(lineText(l), /«/); assert.match(lineText(JSON.parse(JSON.stringify(r))), /«/); assert.equal(lineEnglish(l), l.text); }
  finally { setLanguage('en'); }
});
