// Storage benchmark (GDD §43.9). For franchise saves at seasons 1, 5, 10, 15 and 20 (export files from
// tools/franchise-soak.mjs runs, or produced here with --run), measures:
//   - the v39.1 payload (localStorage JSON) and its biggest contributors, raw → packed (lossless) → packed+gzip;
//   - the Phase 1 IndexedDB records after migration and a realistic set of saves: the live save, rolling backups, the weekly
//     copy, the protected original, and the v39.1 localStorage save left in place;
//   - the cloud mirror (unchanged format): characters and document count;
//   - projections for 1, 2 and 3 active slots, 1 active + 2 retired, and 3 retired (Phase 2-4 layouts, not built), with the
//     persistent AI rosters of §42 estimated separately.
// Node's CompressionStream is zlib, as in Chromium; IndexedDB adds per-record overhead not counted here.
//   node tools/storage-benchmark.mjs --dir=DIR --prefix=main-s1 [--json=out.json]
//   node tools/storage-benchmark.mjs --run --seed=1 [--json=out.json]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { pack, gzip } from '../src/franchise/pack.js';
import { createStore, memoryBackend } from '../src/franchise/store.js';
import * as Save from '../src/franchise/save.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const MARKS = [1, 5, 10, 15, 20];
const KB = (n) => Math.round(n / 1024);
const json = (x) => JSON.stringify(x ?? null);
async function sizes(x) { const raw = json(x); const p = JSON.stringify(pack(x ?? null)); const gz = await gzip(p); return { raw: raw.length, packed: p.length, gz: gz ? gz.byteLength : null }; }

async function franchises() {
  const out = {};
  if (args.run) {
    const { runFranchise } = await import('./franchise-soak.mjs');
    runFranchise(Number(args.seed || 1), { difficulty: 'rookie', seasons: 20, onSeason: (f, s) => { if (MARKS.includes(s)) out[s] = JSON.parse(JSON.stringify(f)); } });
  } else for (const s of MARKS) { const p = `${args.dir}/${args.prefix}-y${s}.json`; if (existsSync(p)) out[s] = JSON.parse(readFileSync(p, 'utf8')).franchise; }
  return out;
}
const mkLs = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

async function measure(season, f) {
  if (!f.savedAt) f.savedAt = 1_790_000_000_000;
  const legacy = JSON.stringify(f);
  const comp = {
    leagueTables: (f.history || []).map((h) => [h.leagueStats, h.playoffStats]),
    draftResults: f.draftResults,
    awards: (f.history || []).map((h) => h.awards),
    careers: (f.roster || []).map((m) => [m.career, m.stats]),
    rosterOther: (f.roster || []).map(({ career, stats, ...r }) => r),
    season: f.season, news: [f.news, f.leagueNews],
  };
  const known = new Set(['history', 'draftResults', 'roster', 'season', 'news', 'leagueNews']);
  comp.historyOther = (f.history || []).map(({ leagueStats, playoffStats, awards, ...r }) => r);
  comp.other = Object.fromEntries(Object.entries(f).filter(([k]) => !known.has(k)));
  const components = {}; for (const [k, v] of Object.entries(comp)) components[k] = await sizes(v);
  const whole = await sizes(f);
  // Phase 1 store: migrate, then a week of play (a few saves, the core changing), the weekly copy, and a season transition.
  const ls = mkLs(); ls.setItem(Save.SAVE_KEY, legacy);
  const backend = memoryBackend(); let t = 1_800_000_000_000; const store = createStore({ backend, localStorage: ls, now: () => ++t, debounce: 0 });
  const t0 = performance.now(); const { franchise: g } = await store.open(); const migrateMs = performance.now() - t0;
  const times = [];
  for (let i = 0; i < 3; i++) { g.news.push({ text: `bench ${i}` }); const a = performance.now(); await store.save(g); times.push(performance.now() - a); }
  await store.keepCopy(g, 'weekly');
  const a = performance.now(); g.history[g.history.length - 1].benchProbe = 1; await store.save(g); const transitionMs = performance.now() - a; // archive re-packed
  g.news.push({ text: 'after' }); await store.save(g);
  const u = await store.usage();
  const m = await store.readManifest();
  const weekly = backend.data.backups.get('1:weekly'); const weeklyBytes = Object.values(weekly.embedded).reduce((s, p) => s + p.bytes, 0);
  const record = { save: u.save, rollingExtra: u.backups - weeklyBytes, weekly: weeklyBytes, original: u.legacy, legacyLocalStorage: legacy.length, parts: Object.fromEntries(Object.entries(m.parts).map(([k, v]) => [k, { raw: v.rawBytes, packed: v.packedBytes, gz: v.bytes }])) };
  record.indexedDbTotal = record.save + record.rollingExtra + record.weekly + record.original;
  record.gameTotal = record.indexedDbTotal + record.legacyLocalStorage;
  const cloud = { chars: legacy.length, documents: Math.max(1, Math.ceil(legacy.length / 180_000)) + 1 };
  const avgMonster = json(f.roster).length / Math.max(1, f.roster.length);
  return { season, payload: legacy.length, whole, components, record, cloud, ms: { migrate: Math.round(migrateMs), typicalSave: Math.round(times.reduce((s, x) => s + x, 0) / times.length), transitionSave: Math.round(transitionMs) }, roster: f.roster.length, avgMonster: Math.round(avgMonster) };
}

function projections(r) {
  // An active slot: live save + rolling extra + weekly copy. A retired slot (Phase 2): one verified read-only archive copy.
  const active = r.record.save + r.record.rollingExtra + r.record.weekly; const retired = r.record.save;
  const shared = r.record.original + r.record.legacyLocalStorage; // once per device, from the v39.1 migration
  // Persistent AI rosters (§42, Phase 3+), an estimate only: 15 AI clubs × the player's roster size × the average monster
  // record, compressed at the measured ratio of the core part. Careers of AI monsters would grow this further.
  const ratio = r.record.parts.core.gz / r.record.parts.core.raw;
  const ai = Math.round(15 * r.roster * r.avgMonster * ratio);
  const layouts = { '1 active': [1, 0], '2 active': [2, 0], '3 active': [3, 0], '1 active + 2 retired': [1, 2], '3 retired': [0, 3] };
  return Object.fromEntries(Object.entries(layouts).map(([k, [a, b]]) => [k, { withoutAi: a * active + b * retired + shared, aiEstimate: a * ai + b * ai }]));
}

const all = await franchises(); const results = [];
for (const s of MARKS) if (all[s]) results.push(await measure(s, all[s]));
const rows = results.map((r) => ({ season: r.season, 'payload KB': KB(r.payload), 'packed KB': KB(r.whole.packed), 'IDB save KB': KB(r.record.save), 'rolling KB': KB(r.record.rollingExtra), 'weekly KB': KB(r.record.weekly), 'original KB': KB(r.record.original), 'IDB total KB': KB(r.record.indexedDbTotal), 'game total KB': KB(r.record.gameTotal), 'tables raw→packed→gz': `${KB(r.components.leagueTables.raw)}→${KB(r.components.leagueTables.packed)}→${KB(r.components.leagueTables.gz)}`, 'draft': `${KB(r.components.draftResults.raw)}→${KB(r.components.draftResults.packed)}→${KB(r.components.draftResults.gz)}`, 'awards': `${KB(r.components.awards.raw)}→${KB(r.components.awards.packed)}→${KB(r.components.awards.gz)}`, 'careers': `${KB(r.components.careers.raw)}→${KB(r.components.careers.packed)}→${KB(r.components.careers.gz)}`, 'cloud docs': r.cloud.documents, 'migrate ms': r.ms.migrate, 'save ms': r.ms.typicalSave, 'transition ms': r.ms.transitionSave }));
console.table(rows);
const last = results[results.length - 1];
if (last) { console.log(`Projections at season ${last.season} (KB; AI rosters estimated separately):`); console.table(Object.fromEntries(Object.entries(projections(last)).map(([k, v]) => [k, { 'without AI': KB(v.withoutAi), 'AI estimate': KB(v.aiEstimate), total: KB(v.withoutAi + v.aiEstimate) }]))); }
if (args.json) writeFileSync(args.json, JSON.stringify({ results, projections: last ? projections(last) : null }, null, 1));
