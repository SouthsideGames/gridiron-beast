#!/usr/bin/env node
// Runs a season of franchise play and a set of Beast Clash battles and prints a digest of everything that is NOT wording:
// results, rosters, ratings, money, ids. With --pseudo, every line of the central text is first replaced by a made-up
// "translation" (letters changed, {values} and markup kept). The two digests must match: wording never decides anything
// (tests/text-never-decides.test.js). A difference means some rule, id or saved value is being read from the text.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const pseudo = process.argv.includes('--pseudo'); const seasons = Number(process.argv.find((a) => a.startsWith('--seasons='))?.split('=')[1] || 1);
const twist = (v) => v.split(/(\{\w+\}|<[^>]+>)/).map((p, i) => (i % 2 ? p : p.replace(/[A-Za-z]/g, (c) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase())) + (p.trim() ? '~' : ''))).join('');
const { setLanguage, englishText } = await import('../src/text/index.js');
// a saved value that is itself a line of wording (a coach's style kept in a meeting record) is wording, not state: left out of both digests
const wording = new Set(Object.values(englishText()).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))).flatMap((v) => [v, twist(v)]));
if (pseudo) {
  const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1].split(',');   // --only=area,area: narrow a failure down
  const table = Object.fromEntries(Object.entries(englishText()).filter(([k]) => !only || only.includes(k.split('.')[0])).map(([k, v]) => [k, typeof v === 'string' ? twist(v) : Object.fromEntries(Object.entries(v).map(([f, x]) => [f, twist(x)]))]));
  const dex = JSON.parse(execFileSync(process.execPath, [fileURLToPath(new URL('./dex-text.mjs', import.meta.url))], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  if (!only || only.includes('dex')) for (const [k, v] of Object.entries(dex)) table[k] = twist(v);
  setLanguage('zz', table);   // before anything else loads: data modules read their text when they load
}
// only what is not wording: numbers, flags, and strings that are ids (no spaces). Club and monster names are ids too and stay English.
const plain = (v, key = '') => {
  if (typeof v === 'number' || typeof v === 'boolean' || v === null) return v;
  if (typeof v === 'string') return /^[\w:#|.+\-/]*$/.test(v) && !wording.has(v) ? v : undefined;
  if (Array.isArray(v)) return v.map((x) => plain(x) ?? null);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) { if (k === 'createdAt' || k === 'uid' || k === 'tk' || k === 'tv' || k === 'tp' || (k.endsWith('L') && k.slice(0, -1) in v)) continue; const x = plain(v[k], k); if (x !== undefined) o[k] = x; } return o; }   // a saved line's key and values are where its wording came from, not state
  return undefined;
};
const sha = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const out = {};
const T = await import('./franchise-soak.mjs');
const stopWeek = Number(process.argv.find((a) => a.startsWith('--stop='))?.split('=')[1] || 0) || null;   // --stop=N: stop at week N (to find where a difference starts)
const r = T.runFranchise(11, { seasons, difficulty: 'rookie', stopWeek });
out.problems = r.problems.length;
if (process.argv.includes('--full')) { const { createdAt, uid, ...rest } = r.f; for (const k of Object.keys(rest)) out[`full.${k}`] = sha(rest[k]); const dump = process.argv.find((a) => a.startsWith('--dump='))?.split('=')[1]; if (dump) (await import('node:fs')).writeFileSync(dump, JSON.stringify(rest)); }   // --full: wording included (English before and after a change must match exactly)
const f = plain(r.f);
for (const k of Object.keys(f)) out[`franchise.${k}`] = sha(f[k]);
// where wording is SAVED in the franchise (a sentence kept in the save keeps the language it was written in, unless it is a saved
// line: src/text/index.js). One entry per place, ids and positions folded: "news[].text". The test compares the two runs to list
// the places whose saved wording follows the language at the time, and holds that list to a recorded inventory.
const places = {};
const fold = (k) => (/^(mvp|opoy|dpoy|oroy|droy|coy|smoy)$/.test(k) ? '<award>' : /\s|^m_|^o\d+$|^\d+$|^[a-z]+_[0-9a-z]{5,}$/.test(k) || k.length > 27 ? '*' : k);
const note = (v, path) => {
  if (typeof v === 'string') { if (!(/^[\w:#|.+\-/]*$/.test(v) && !wording.has(v))) (places[path] ||= createHash('sha256')).update(v + '\u0001'); return; }
  if (Array.isArray(v)) { for (const x of v) note(x, `${path}[]`); return; }
  if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (k === 'createdAt' || k === 'uid' || (k === 'text' && (v.tk || v.tp)) || v[`${k}L`]) continue; note(v[k], path ? `${path}.${fold(k)}` : fold(k)); }   // a saved line's sentence is only its copy (text beside tk / tp, or `why` beside `whyL`)
};
note(r.f, '');
out.saved = Object.fromEntries(Object.entries(places).map(([k, h]) => [k, h.digest('hex').slice(0, 16)]));
if (stopWeek) { process.stdout.write(JSON.stringify(out, null, 1) + '\n'); process.exit(0); }
const { simulateClashT8 } = await import('../src/clash/t8/index.js'); const { createRng } = await import('../src/core/rng.js'); const H = await import('../tests/clash/helpers.js');
const rng = createRng(77); const clash = [];
for (let i = 0; i < 120; i++) { const k = 1 + (i % 5); const a = H.randomLineup(rng, k), b = H.randomLineup(rng, k); const res = simulateClashT8({ a, b, seed: i + 1 }); clash.push([res.winner, res.by, res.exchanges, res.rngDraws, res.stateHash]); }
out.clash = sha(clash);
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
