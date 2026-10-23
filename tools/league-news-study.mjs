#!/usr/bin/env node
// League News study (GDD §39): hands-off franchises through several seasons. Every week has a full scoreboard, headlines stay
// within the cap, ids never repeat, records are named with the mark they beat, and the feed's weight in the save. Exits 1 on a problem.
//   node tools/league-news-study.mjs [--n=3] [--seasons=3] [--seed=31] [--show=1]
import { runFranchise } from './franchise-soak.mjs';
import { newsByWeek, HEADLINES_PER_WEEK, LEAGUE_NEWS_KEEP } from '../src/franchise/league-news.js';
import * as Save from '../src/franchise/save.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n || 3), SEASONS = Number(args.seasons || 3), SEED = Number(args.seed || 31);
const kinds = {}; let problems = 0, items = 0, weeks = 0, bytes = 0, saveBytes = 0, headPerWeek = 0, records = 0; let sample = null;
const bad = (m) => { problems++; console.log('PROBLEM', m); };
for (let i = 0; i < N; i++) {
  const { f, problems: p } = runFranchise(SEED + i, { difficulty: ['rookie', 'pro', 'allstar'][i % 3], seasons: SEASONS });
  if (p.length) bad(`soak ${SEED + i}: ${p.slice(0, 3).join('; ')}`);
  const list = f.leagueNews || []; items += list.length; bytes += JSON.stringify(list).length + JSON.stringify(f.leagueNewsMeta || {}).length; saveBytes += Save.exportJson(f).length;
  if (list.length > LEAGUE_NEWS_KEEP) bad('feed over the cap');
  const ids = new Set(); for (const it of list) { if (ids.has(it.id)) bad(`duplicate id ${it.id}`); ids.add(it.id); kinds[it.kind] = (kinds[it.kind] || 0) + 1; if (/undefined|NaN|null/.test(it.text)) bad(`bad text: ${it.text}`); if (it.kind === 'record') { records++; if (!/old mark/.test(it.text)) bad(`record without the old mark: ${it.text}`); } }
  for (const g of newsByWeek(list)) {
    weeks++; const sc = g.items.filter((x) => x.kind === 'scores'); const heads = g.items.filter((x) => !['scores', 'race', 'award', 'playoffs', 'champion', 'record', 'race_lead'].includes(x.kind));
    if (g.week <= 10 && g.year === f.season.year && sc.length !== 1) bad(`${g.year}/${g.week}: ${sc.length} scoreboards`);
    if (g.week <= 10 && sc[0] && sc[0].games.length !== 8) bad(`${g.year}/${g.week}: ${sc[0].games.length} games on the scoreboard`);
    if (g.week <= 10 && sc[0] && sc[0].games.filter((x) => x.mine).length > 1) bad('two games marked as yours');
    if (heads.length > HEADLINES_PER_WEEK) bad(`${g.year}/${g.week}: ${heads.length} headlines`);
    headPerWeek += heads.length;
    if (args.show && i === 0) console.log(`\n== ${g.year} ${g.week} ==\n` + g.items.map((x) => `  [${x.kind}] ${x.kind === 'scores' ? x.games.map((s) => `${s.away} ${s.as}-${s.hs} ${s.home}`).join(' | ') : x.kind === 'race' ? x.leaders.map((l) => `${l.short} ${l.name}`).join(', ') : x.text}`).join('\n'));
  }
  if (!sample) sample = newsByWeek(list).slice(0, 2).map((g) => ({ week: g.week, items: g.items.filter((x) => x.kind !== 'scores').map((x) => x.text) }));
  const back = Save.importJson(Save.exportJson(f)); if (JSON.stringify(back.leagueNews) !== JSON.stringify(list)) bad('save changed the feed');
  if ((f.news || []).some((n) => / reached level \d+/.test(n.text))) bad('a level-up line in the club log');
}
console.log(JSON.stringify({ franchises: N, seasons: SEASONS, itemsKept: items, weeksKept: weeks, headlinesPerWeek: +(headPerWeek / weeks).toFixed(2), recordsReported: records, byKind: kinds, feedBytesPerSave: Math.round(bytes / N), share: `${(bytes / saveBytes * 100).toFixed(1)}% of the save`, sample, problems }, null, 1));
process.exit(problems ? 1 : 0);
