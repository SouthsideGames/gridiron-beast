// Central text (stage 1, owner 2026-11-11): the game's wording lives in src/text/en.js under permanent keys and is read with
// t(key, values). These tests keep the file and the code in step: every key the code asks for exists, no line is orphaned,
// every {value} a line needs is supplied, plurals work, and another language falls back to English line by line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { t, setLanguage, language, englishText } from '../src/text/index.js';

const ROOT = new URL('..', import.meta.url).pathname;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []));
const files = walk(path.join(ROOT, 'src')).filter((p) => !p.includes('/src/text/')).map((p) => [path.relative(ROOT, p), fs.readFileSync(p, 'utf8')]);
const en = englishText();
/** Every t('key' ...) call in the code: { key, file, args } where args is the source of the values object, if any. */
function calls() {
  const out = [];
  for (const [rel, src] of files) { if (!/text\/index\.js'|core\/english\.js'/.test(src)) continue; for (const m of src.matchAll(/(?:(?<![\w.])\$?t|\$L|\$E)\('([a-z][\w]*\.[\w.]+)'(\s*,\s*\{)?/g)) { // $L('key', …) is a line that is saved (src/text/index.js)
    let args = null;
    if (m[2]) { let i = m.index + m[0].length, d = 1; const a = i; while (i < src.length && d) { const c = src[i]; if (c === '{') d++; else if (c === '}') d--; i++; } args = src.slice(a, i - 1); }
    out.push({ key: m[1], file: rel, args });
  } }
  return out;
}
/** Top-level property names of an object-literal body ("a: x, b, c: f(y, z)"). */
function props(body) {
  const names = []; let d = 0, cur = '', q = null;
  for (let i = 0; i < body.length; i++) { const c = body[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--;
    if (c === ',' && d === 0) { names.push(cur); cur = ''; } else if (d === 0 || cur.includes(':') === false) cur += c; }
  names.push(cur);
  return names.map((x) => x.split(':')[0].trim()).filter(Boolean);
}
const holes = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
const lines = (v) => (typeof v === 'object' ? Object.values(v) : [v]);

test('every key the code uses is in en.js, and every line in en.js is used', () => {
  const used = calls(); assert.ok(used.length > 500, `${used.length} uses of t()`);
  const missing = [...new Set(used.filter((c) => !(c.key in en)).map((c) => `${c.key} (${c.file})`))];
  assert.deepEqual(missing, [], 'keys used in the code but missing from src/text/en.js');
  const seen = new Set(used.map((c) => c.key)); const orphans = Object.keys(en).filter((k) => !seen.has(k));
  assert.deepEqual(orphans, [], 'lines in src/text/en.js that nothing shows');
});

test('en.js is well formed: unique permanent keys, plain lines or plural forms, no empty lines', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/text/en.js'), 'utf8'); const keys = [...src.matchAll(/^  '([\w.]+)':/gm)].map((m) => m[1]);
  assert.equal(new Set(keys).size, keys.length, 'a key appears twice'); assert.equal(keys.length, Object.keys(en).length);
  for (const [k, v] of Object.entries(en)) {
    assert.match(k, /^[a-z][a-z0-9]*\.[a-z0-9_]+$/, `key ${k}: area.name, lower case`);
    if (typeof v === 'object') { assert.ok(v && typeof v.other === 'string' && typeof v.one === 'string', `${k}: a plural has one and other`); assert.deepEqual(holes(v.one).sort(), holes(v.other).sort(), `${k}: both forms take the same values`); }
    else assert.equal(typeof v, 'string', k);
    for (const line of lines(v)) assert.ok(line.trim().length > 0, `${k} is empty`);
  }
});

test('every {value} a line needs is supplied where the line is used', () => {
  const problems = [];
  for (const c of calls()) {
    const v = en[c.key]; if (v === undefined) continue; const need = new Set(lines(v).flatMap(holes));
    if (typeof v === 'object') need.add('n');
    if (!need.size) continue;
    if (c.file.startsWith('src/data/') && !c.args) continue; // a data line keeps its {tokens}: the game fills them later (Media Day, dialogue, achievements, offseason meetings)
    const given = new Set(c.args ? props(c.args) : []);
    for (const h of need) if (!given.has(h)) problems.push(`${c.key} in ${c.file}: {${h}} is not supplied`);
  }
  assert.deepEqual(problems, []);
});

test('t(): values, plurals, missing keys, and another language falling back to English line by line', () => {
  assert.equal(t('menu.week', { week: 4 }), 'Week 4'); assert.equal(t('menu.week'), 'Week {week}', 'no values: the line as written');
  assert.equal(t('no.such_key'), 'no.such_key');
  const pk = Object.keys(en).find((k) => typeof en[k] === 'object'); assert.ok(pk, 'there is at least one plural');
  const vals = Object.fromEntries(holes(en[pk].other).map((h) => [h, 'X']));
  assert.equal(t(pk, { ...vals, n: 1 }), en[pk].one.replace(/\{(\w+)\}/g, 'X')); assert.equal(t(pk, { ...vals, n: 2 }), en[pk].other.replace(/\{(\w+)\}/g, 'X')); assert.equal(t(pk, { ...vals, n: 0 }), en[pk].other.replace(/\{(\w+)\}/g, 'X'));
  assert.equal(t('menu.week', { week: '<b>' }), 'Week <b>', 'values are inserted as given (callers escape, as before)');
  try {
    setLanguage('es', { 'menu.week': 'Semana {week}', [pk]: { one: 'uno {n}', other: 'otros {n}' } }); assert.equal(language(), 'es');
    assert.equal(t('menu.week', { week: 4 }), 'Semana 4'); assert.equal(t(pk, { n: 1 }), 'uno 1'); assert.equal(t(pk, { n: 5 }), 'otros 5');
    const other = Object.keys(en).find((k) => k !== 'menu.week' && typeof en[k] === 'string'); assert.equal(t(other), en[other], 'a line not translated yet shows in English');
  } finally { setLanguage('en'); }
  assert.equal(t('menu.week', { week: 4 }), 'Week 4');
});

test('buttons and titles that now read from en.js are still Title Case', () => {
  const minor = new Set('a an the and but or nor for as at by in of on to via vs per'.split(' ')); const keys = new Set();
  for (const [rel, s] of files) { if (!rel.startsWith('src/ui/')) continue;
    for (const m of s.matchAll(/<button class="(?:btn|chip)\b[^>]*>\$\{\$?t\('([\w.]+)'[^}]*\}<\/button>/g)) keys.add(m[1]);
    for (const m of s.matchAll(/\b(?:title|okLabel|cancelLabel):\s*\$?t\('([\w.]+)'\)/g)) keys.add(m[1]); }
  assert.ok(keys.size > 30, `${keys.size} button and title keys found`);
  const bad = [];
  for (const k of keys) for (const line of lines(en[k])) { const words = line.replace(/\{\w+\}/g, ' ').split(/\s+/).filter((w) => /[A-Za-z]/.test(w));   // every word keeps its place, so "Back to HQ" ends on HQ
    words.forEach((w, i) => { if (/^[a-z][a-z'’]+$/.test(w) && (i === 0 || i === words.length - 1 || !minor.has(w)) && !['yd', 'yr', 'wk'].includes(w)) bad.push(`${k}: ${line}`); }); }
  assert.deepEqual([...new Set(bad)], []);
});

// The engines take their log wording from en.js through src/core/english.js, which is English always (never the chosen language),
// so a battle or a game reads and resolves the same for every player. The reader of the chosen language stays out of them.
test('text never decides anything: the engines and the save code do not read the central text', () => {
  for (const [rel, s] of files) if (/^src\/(sim|clash|core)\//.test(rel) || /^src\/franchise\/(save|store|slots|cloud-save)\.js$/.test(rel)) assert.ok(!/text\/index\.js/.test(s), `${rel} imports the text module`);
});

test('names stay in English in every language: stadium and reporter names cannot be replaced by a translation', async () => {
  const { KEEP_ENGLISH } = await import('../src/text/names.js'); assert.ok(KEEP_ENGLISH.size >= 22);
  for (const k of KEEP_ENGLISH) assert.equal(typeof en[k], 'string', `${k} is a line in en.js`);
  for (const name of ['Howling Glacier Bowl', 'Palmetto Grove', 'Dirk Stirwell', 'Dr. Prudence Ledger', 'Toby Fumbleton', 'The Daily Snap']) assert.ok([...KEEP_ENGLISH].some((k) => en[k] === name), name);
  const some = [...KEEP_ENGLISH][0];
  try { setLanguage('fr', { [some]: 'Traduit', 'menu.week': 'Semaine {week}', 'not.a_key': 'x' }); assert.equal(t(some), en[some], 'the name is kept'); assert.equal(t('menu.week', { week: 2 }), 'Semaine 2'); assert.equal(t('not.a_key'), 'not.a_key'); }
  finally { setLanguage('en'); }
});
