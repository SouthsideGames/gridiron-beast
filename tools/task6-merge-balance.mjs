// Merge per-seed balance-compare files into one file with the tool's own summary formulas (winPct, aiMid, fired, seasons).
// node merge.mjs OUT.json IN1.json IN2.json ...
import fs from 'node:fs';
const [out, ...ins] = process.argv.slice(2); const files = ins.filter((f) => fs.existsSync(f)).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const runs = files.flatMap((x) => x.runs).sort((a, b) => a.seed - b.seed); const all = runs.flatMap((r) => r.rows);
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null); const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const head = files[0] || {};
const o = { mode: head.mode, difficulty: head.difficulty, seasons: head.seasons, seeds: runs.map((r) => r.seed), boardReset: head.boardReset, runs,
  summary: { seasons: all.length, winPct: r1(100 * mean(all.map((r) => r.w / (r.w + r.l)))), playoffPct: r1(100 * mean(all.map((r) => (r.playoffs ? 1 : 0)))), fired: runs.filter((r) => r.fired).length, aiMid: r1(mean(all.map((r) => r.aiMid).filter((x) => x != null))), aiEnd: r1(mean(all.map((r) => r.aiEnd))) } };
fs.writeFileSync(out, JSON.stringify(o)); console.log(out, runs.length, 'seeds', o.summary.winPct, o.summary.aiMid);
