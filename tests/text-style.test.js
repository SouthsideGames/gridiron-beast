// Wording style (owner 2026-11-11): American spelling in the game's text, Title Case on buttons and screen titles, and review
// verdicts that survive a wording-only change. The full listing of the game's text is docs/text/GAME_TEXT.csv
// (python3 tools/text-export.py); this file guards the rules so new text does not drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const ROOT = new URL('..', import.meta.url).pathname;
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []));
const files = walk(path.join(ROOT, 'src')).map((p) => [path.relative(ROOT, p), fs.readFileSync(p, 'utf8')]);
/** Source with comments removed (good enough for a wording scan: strings holding // are URLs, which this game has none of). */
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

// Not checked: the retired 250-question media library and the historical Clash move set are kept as records and never shown.
const HELD_BACK = [/^src\/data\/media\.js$/, /^src\/data\/clash-moves-v1\.0\.0\.js$/];
const BRITISH = ['colou?red|colours?', 'favou?rs?|favou?rites?|favou?red|favou?rable', 'honou?rs?|honou?red', 'rumou?rs?', 'behaviou?rs?', 'neighbou?rs?', 'armou?r(ed)?', 'defences?', 'offences?', 'centres?|centred', 'programmes?', 'judgements?', 'ageing', 'grey(ed)?', 'catalogues?', 'practis(e|ed|ing)', 'cancelled|cancelling', 'labelled|labelling', 'totalled', 'travelled|travelling', 'recogni[s](e|ed|es|ing)', 'apologi[s](e|ed|es|ing)', 'prioriti[s](e|ed|es|ing)', 'organi[s](e|ed|es|ing|ation)', 'reali[s](e|ed|es|ing)', 'cheques?', 'whilst', 'amongst']
  .map((w) => w.replace(/ou\?r/g, 'our'));
test('American spelling: no British spellings in the game\'s wording', () => {
  // wording = the inside of a quoted string or template that reads as running text (it has spaces); ids, keys, CSS classes and
  // code identifiers are not wording and are left alone
  const word = new RegExp(`\\b(?:${BRITISH.join('|')})\\b`, 'gi'); const found = [];
  for (const [rel, src] of files) {
    if (HELD_BACK.some((r) => r.test(rel))) continue;
    for (const line of code(src).split('\n')) for (const m of line.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
      const text = m[2].replace(/\$\{[^}]*\}/g, ' ').replace(/<[^>]*>/g, ' ').replace(/^[^<]*>/, ' ').replace(/<[^>]*$/, ' ');
      if (!/[A-Za-z] [A-Za-z]/.test(text) || /^[a-z0-9\- ]+$/.test(text.trim())) continue; // a single token (an id or a key) or a list of CSS classes
      for (const hit of text.matchAll(word)) if (!/[.$_]/.test(text[hit.index - 1] || ' ')) found.push(`${rel}: ${hit[0]} in …${text.slice(Math.max(0, hit.index - 30), hit.index + 30).trim()}…`);
    }
  }
  assert.deepEqual(found, [], 'British spelling in player-facing text');
});

test('Title Case on buttons and screen titles: the labels the owner flagged, and the week\'s main button', () => {
  const src = Object.fromEntries(files);
  const hq = src['src/ui/screens/hq.js'];
  assert.match(hq, />Choose Captains/); assert.ok(!/>Choose captains/.test(hq));
  for (const label of ['Monday · Scout a Region', 'Tuesday · Monster Encounter', 'Wednesday · Training Focus', 'Thursday · Scout Opponent', 'Friday · Set Game Plan', 'Saturday · Media Day', 'Play Sunday Game', 'Take the Bye Week']) assert.ok(hq.includes(`'${label}'`), label);
  assert.match(hq, /Let the Staff Run the Week → Sunday/); assert.match(hq, /Finish and Read the Headline/);
  assert.match(src['src/ui/screens/menu.js'], /Edit Appearance/); assert.match(src['src/ui/screens/match.js'], /Receive the Kick/);
  // screen titles and dialog buttons: `title: '...'` and `okLabel: '...'` in the interface code are Title Case
  const minor = new Set('a an the and but or nor for as at by in of on to via vs per'.split(' '));
  const offenders = [];
  for (const [rel, s] of files) {
    if (!rel.startsWith('src/ui/') && rel !== 'src/main.js') continue;
    for (const m of code(s).matchAll(/\b(title|okLabel|cancelLabel):\s*'((?:[^'\\\n]|\\.)*)'/g)) {
      const words = m[2].split(/\s+/).filter((w) => /^[A-Za-z][a-z'’]+$/.test(w));
      words.forEach((w, i) => { const first = i === 0, last = i === words.length - 1; if (/^[a-z]/.test(w) && (first || last || !minor.has(w))) offenders.push(`${rel}: ${m[1]}: '${m[2]}'`); });
    }
  }
  assert.deepEqual([...new Set(offenders)], [], 'a title or dialog button that is not in Title Case');
  // plain buttons written as string literals or simple template text
  const lower = [];
  for (const [rel, s] of files) {
    if (!rel.startsWith('src/ui/') || /clash-lab|ai-lab|attr-lab/.test(rel)) continue; // developer labs show raw option ids
    for (const m of code(s).matchAll(/<button class="(?:btn|chip)\b[^>$]*>([A-Za-z][A-Za-z ]{2,40})<\/button>/g)) {
      const words = m[1].trim().split(/\s+/);
      words.forEach((w, i) => { if (/^[a-z]/.test(w) && (i === 0 || i === words.length - 1 || !minor.has(w)) && !['yd', 'yr', 'wk'].includes(w)) lower.push(`${rel}: ${m[1]}`); });
    }
  }
  assert.deepEqual([...new Set(lower)], [], 'a button label that is not in Title Case');
});

test('a wording-only change keeps earlier review verdicts; a later real change still asks for review', async () => {
  const D = await import('../src/ui/dev-review.js'); const S = await import('../src/franchise/review-store.js');
  const { REVIEW_FP_ALIASES } = await import('../src/data/review-fp-aliases.js');
  const ids = Object.keys(REVIEW_FP_ALIASES.play); assert.ok(ids.length > 0, 'the plays whose wording changed are listed');
  for (const id of ids) {
    const [before, after] = REVIEW_FP_ALIASES.play[id]; assert.notEqual(before, after);
    assert.equal(D.playFingerprint(id), after, `${id}: the alias points at the play as it is now`);
    await S.setReview('play', id, { status: 'approved' }, before); assert.equal(D.reviewState('play', id), 'approved', `${id}: an approval from before the wording pass still stands`);
    await S.setReview('play', id, { status: 'needs_work' }, before); assert.equal(D.reviewState('play', id), 'needs_work', 'a Needs work verdict stands too');
    await S.setReview('play', id, { status: 'approved' }, 'some-other-version'); assert.equal(D.reviewState('play', id), 'changed', 'any other old version still asks for review');
    await S.setReview('play', id, { status: null });
  }
  const untouched = D.REVIEWABLE_PLAYS.find((id) => !REVIEW_FP_ALIASES.play[id]);
  await S.setReview('play', untouched, { status: 'approved' }, 'an-older-version'); assert.equal(D.reviewState('play', untouched), 'changed', 'plays outside the list are unaffected');
  await S.setReview('play', untouched, { status: null });
  for (const ns of Object.keys(REVIEW_FP_ALIASES)) assert.ok(['play', 'fbability', 'clashability'].includes(ns));
});
