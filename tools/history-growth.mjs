#!/usr/bin/env node
// Career history study (GDD §41.1): hands-off franchises through long careers. After seasons 5, 10 and 20: the save's size,
// the bytes the archived game lines take, and checks that every archived season's games add up to its book, career totals
// equal the season books, every linked timeline event opens, and no accomplishment repeats. Exits 1 on a problem.
//   node tools/history-growth.mjs [--n=2] [--seasons=20] [--seed=1] [--marks=5,10,20]
import { runFranchise } from './franchise-soak.mjs';
import * as Save from '../src/franchise/save.js';
import * as P from '../src/franchise/career-profile.js';
import { GAME_KEYS, unpackGame, MAX_KEYS } from '../src/franchise/stats.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n || 2), SEASONS = Number(args.seasons || 20), SEED = Number(args.seed || 1); const MARKS = String(args.marks || '5,10,20').split(',').map(Number);
let problems = 0; const bad = (m) => { problems++; if (problems < 25) console.log('PROBLEM', m); };
const rows = [];
for (let i = 0; i < N; i++) {
  const seed = SEED + i; const t0 = Date.now();
  runFranchise(seed, { difficulty: ['rookie', 'pro'][i % 2], seasons: SEASONS, onSeason: (f, s) => {
    if (!MARKS.includes(s)) return;
    const save = Save.exportJson(f).length; let gBytes = 0, gGames = 0, gSeasons = 0;
    const everyone = [...f.roster, ...Object.values(f.pool || {}).flat()];
    for (const m of everyone) for (const b of m.stats?.seasons || []) if (b.g) { gBytes += JSON.stringify(b.g).length + 6; gGames += b.g.length; gSeasons++;
      const sum = { reg: {}, post: {} }; for (const p of b.g) { const x = unpackGame(p); const t = sum[x.playoff ? 'post' : 'reg']; for (const [k, v] of Object.entries(x.line)) t[k] = MAX_KEYS.has(k) ? Math.max(t[k] || 0, v) : (t[k] || 0) + v; }
      for (const bk of ['reg', 'post']) for (const k of Object.keys(GAME_KEYS)) if ((sum[bk][k] || 0) !== (b[bk]?.[k] || 0)) bad(`seed ${seed} s${s} ${m.name} ${b.year} ${bk}.${k}: games ${sum[bk][k] || 0} vs book ${b[bk]?.[k] || 0}`); }
    let linked = 0;
    for (const m of f.roster) {
      const s2 = m.stats; if (!s2) continue;
      const books = [...(s2.seasons || []), s2.season].reduce((a, b) => a + (b?.reg?.games || 0), 0);
      if (books !== (s2.career?.reg?.games || 0) && (m.yearsPro || 0) >= 0) { /* career books vs totals: a monster's career only counts this franchise's books */ if (Math.abs(books - (s2.career?.reg?.games || 0)) > 0) bad(`seed ${seed} s${s} ${m.name}: career games ${s2.career?.reg?.games} vs books ${books}`); }
      const p = P.fullProfile(f, m, 'roster'); if (new Set(p.timeline.map((e) => e.k)).size !== p.timeline.length) bad(`${m.name}: repeated event`);
      const keys = p.trophies.flatMap((t) => t.entries.map((e) => `${t.kind}:${e.year}:${e.key}`)); if (new Set(keys).size !== keys.length) bad(`${m.name}: repeated honour`);
      for (const e of p.timeline.filter((x) => x.ref)) { linked++; if (!P.eventDetail(f, m, e.ref)) bad(`${m.name}: ${e.k} opens nothing`); }
    }
    const top = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Math.round(JSON.stringify(v ?? null).length / 1024)]).filter(([, kb]) => kb >= 20).sort((a, b) => b[1] - a[1]));
    const hist = { leagueTables: Math.round(JSON.stringify((f.history || []).map((h) => [h.leagueStats, h.playoffStats])).length / 1024), awards: Math.round(JSON.stringify((f.history || []).map((h) => h.awards)).length / 1024), schedules: Math.round(JSON.stringify((f.history || []).map((h) => h.schedule)).length / 1024) };
    const roster = { stats: Math.round(JSON.stringify(f.roster.map((m) => m.stats)).length / 1024), career: Math.round(JSON.stringify(f.roster.map((m) => m.career)).length / 1024) };
    rows.push({ seed, season: s, breakdownKB: { top, history: hist, roster }, saveKB: Math.round(save / 1024), gameLinesKB: Math.round(gBytes / 1024), share: `${(gBytes / save * 100).toFixed(1)}%`, archivedSeasons: gSeasons, games: gGames, bytesPerGame: gGames ? Math.round(gBytes / gGames) : 0, linkedEvents: linked, minutes: +((Date.now() - t0) / 60000).toFixed(1) });
    console.log(JSON.stringify(rows[rows.length - 1]));
  } });
}
console.log(JSON.stringify({ rows, problems }, null, 1));
process.exit(problems ? 1 : 0);
