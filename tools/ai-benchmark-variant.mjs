#!/usr/bin/env node
// Diagnostic variants for the AI Franchise Benchmark (Task 4). Copies src/ and tools/ to a scratch directory and switches off
// one competitive-balance mechanism there, so the benchmark (`--root=DIR`) can show what that mechanism is doing. The repository
// is never changed; the variant trees are NOT production behaviour and are never published.
//   node tools/ai-benchmark-variant.mjs --variant=no-nudge|flat-market --out=DIR
//
//   no-nudge     The balance nudge (league-season.js leagueNudge, decision C) is off: no generated signings for clubs below
//                their target, no slower development for clubs above it, and no runaway-veteran attrition at contract time
//                (BAND and RIVAL_BAND set out of reach).
//   flat-market  no-nudge, and the market's generated arrivals (free agency and injury cover) are made at the league-wide mean
//                of the clubs' quality targets instead of each club's own target, so no club's synthetic signings carry its
//                difficulty curve. What remains is the clubs' own decisions plus the shared market.
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const variant = args.variant; const out = path.resolve(args.out || '');
if (!['no-nudge', 'flat-market'].includes(variant) || !args.out) { console.error('usage: --variant=no-nudge|flat-market --out=DIR'); process.exit(2); }
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
for (const d of ['src', 'tools']) fs.cpSync(path.join(REPO, d), path.join(out, d), { recursive: true });
fs.copyFileSync(path.join(REPO, 'package.json'), path.join(out, 'package.json'));

const file = path.join(out, 'src/franchise/league-season.js'); let s = fs.readFileSync(file, 'utf8');
const patch = (from, to) => { if (!s.includes(from)) throw new Error(`variant patch did not apply: ${from.slice(0, 60)}`); s = s.replace(from, to); };
patch('export const BAND = 4;', 'export const BAND = 1e9; // DIAGNOSTIC VARIANT: nudge off');
patch('export const RIVAL_BAND = 2;', 'export const RIVAL_BAND = 1e9; // DIAGNOSTIC VARIANT: nudge off');
if (variant === 'flat-market') {
  patch('export function leagueFreeAgency(f, r, { year, cap, targetOf }) {\n  if (!hasLeague(f)) return null;', 'export function leagueFreeAgency(f, r, { year, cap, targetOf: own }) {\n  if (!hasLeague(f)) return null;\n  const flat = order(f).reduce((s, c) => s + own(c), 0) / order(f).length; const targetOf = () => flat; // DIAGNOSTIC VARIANT: one market quality for every club\n ');
  patch('export function leagueInjuryCover(f, r, { year, cap, targetOf }) {\n  if (!hasLeague(f)) return 0;', 'export function leagueInjuryCover(f, r, { year, cap, targetOf: own }) {\n  if (!hasLeague(f)) return 0;\n  const flat = order(f).reduce((s, c) => s + own(c), 0) / order(f).length; const targetOf = () => flat; // DIAGNOSTIC VARIANT\n ');
}
fs.writeFileSync(file, s);
fs.writeFileSync(path.join(out, 'VARIANT.txt'), `${variant}: diagnostic benchmark tree, not production behaviour. Built from ${REPO} at ${new Date().toISOString()}.\n`);
console.log(JSON.stringify({ variant, out }));
