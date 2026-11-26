#!/usr/bin/env node
// Balance audit R-18 (2026-11-25): franchise save size and speed at seasons 1, 5, 10 and 15 of a production franchise (the soak's
// hands-off owner, Board kept content). At each snapshot: raw JSON bytes, packed (gbp2) bytes, gzipped (stored) bytes, the time to pack
// and compress and to decompress and unpack (median of 5), an exact round trip, and the largest parts of the save by raw bytes, so
// what makes a save big is visible. Measurement only: the franchise is the game's own; nothing is written to storage.
//   node tools/balance-audit/save-audit.mjs [--seed=3] [--difficulty=pro] [--seasons=15] [--json=FILE]
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { runFranchise } from '../franchise-soak.mjs';
import { pack, unpack, gzip, gunzip } from '../../src/franchise/pack.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SEED = Number(args.seed || 3), SEASONS = Number(args.seasons || 15), D = String(args.difficulty || 'pro');
const AT = new Set([1, 5, 10, 15, 20]); const out = { tool: 'balance-audit/save-audit', seed: SEED, difficulty: D, snapshots: [] };
const median = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const bytes = (v) => Buffer.byteLength(typeof v === 'string' ? v : JSON.stringify(v ?? null));
function parts(f) {
  const rows = Object.entries(f).map(([k, v]) => [k, bytes(v)]);
  const deep = []; for (const k of ['league', 'season', 'history', 'roster', 'freeAgency', 'records']) if (f[k] && typeof f[k] === 'object') for (const [k2, v] of Object.entries(f[k])) deep.push([`${k}.${k2}`, bytes(v)]);
  const top = (list) => list.sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, b]) => ({ part: k, kb: +(b / 1024).toFixed(1) }));
  return { top: top(rows), deep: top(deep) };
}
async function measure(f, year) {
  const raw = JSON.stringify(f); const t = { pack: [], unpack: [] }; let packed, gz, back;
  for (let i = 0; i < 5; i++) {
    let a = performance.now(); packed = JSON.stringify(pack(JSON.parse(raw))); gz = await gzip(packed); t.pack.push(performance.now() - a);
    a = performance.now(); back = JSON.stringify(unpack(JSON.parse(await gunzip(gz)))); t.unpack.push(performance.now() - a);
  }
  const gzBytes = gz.byteLength ?? gz.length ?? Buffer.byteLength(gz);
  return { year, rawKB: +(bytes(raw) / 1024).toFixed(0), packedKB: +(bytes(packed) / 1024).toFixed(0), storedKB: +(gzBytes / 1024).toFixed(0), saveMs: +median(t.pack).toFixed(0), loadMs: +median(t.unpack).toFixed(0), roundTrip: back === raw, ...parts(f) };
}
const pending = [];
runFranchise(SEED, { difficulty: D, seasons: SEASONS, check: () => [],
  onOffseason: (f) => { if (f.board) { f.board.confidence = 3; f.board.misses = 0; f.board.fired = false; } },
  onSeason: (f) => { if (AT.has(f.season.year)) pending.push([f.season.year, JSON.stringify(f)]); } });
for (const [year, s] of pending) { const m = await measure(JSON.parse(s), year); out.snapshots.push(m); console.log(JSON.stringify({ ...m, top: m.top.slice(0, 5), deep: m.deep.slice(0, 6) })); }
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
