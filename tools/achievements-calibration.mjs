#!/usr/bin/env node
// Achievement threshold calibration (owner brief "Final Merge, Achievement Calibration and Mobile Update", 2026-11-26; observation only).
// Plays whole franchise careers through the production lifecycle (tools/franchise-soak.mjs runFranchise: the game's own weekly functions,
// the hands-off owner) and records, for every one of the 200 achievements, whether and when it unlocks: the season and week of the
// first unlock in each run, and the franchise's state at each season end (record, titles, roster) so unlocks can be read against the
// career stage. A dismissed owner keeps his job for the simulation (the fired flag and misses are cleared, the board history is kept,
// so the coaching rows still see the record). Nothing in the game is changed; developer shortcuts are never used (the run stays eligible).
//
//   node tools/achievements-calibration.mjs --difficulty=pro --seeds=1,2 --seasons=15 --json=out.json
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const imp = (p) => import(path.join(ROOT, p));
const F = await imp('src/franchise/franchise.js');
const { runFranchise } = await imp('tools/franchise-soak.mjs');
const { ACHIEVEMENTS } = await imp('src/data/achievements.js');
const AS = await imp('src/franchise/achievement-store.js');
const difficulty = args.difficulty || 'pro', seasons = Number(args.seasons) || 15;
const seeds = String(args.seeds || '1').split(',').map(Number);
const keepJob = (f) => { if (f.board?.fired) { f.board.fired = false; f.board.misses = 0; } return []; };
const GKEYS = ['pts', 'margin', 'passYds', 'passTd', 'rushYds', 'rushTd', 'recYds', 'longPlay', 'yards', 'int', 'sacks', 'tfl', 'tackles', 'playerSacks', 'takeaways', 'fgLong', 'fgm', 'oppYards', 'comeback'];
const runs = [];
for (const seed of seeds) {
  const t0 = Date.now(); const timeline = []; const games = [];
  const alterGame = (x, game, m) => { try { const side = m.playerSide, opp = side === 'home' ? 'away' : 'home'; const won = game.score[side] > game.score[opp];
    const v = F.gameFacts(x, game, side, m, { won }); const row = { y: x.season.year, w: x.season.week, won }; for (const k of GKEYS) if (typeof v?.[k] === 'number') row[k] = v[k];
    row.pts ??= game.score[side]; row.margin ??= game.score[side] - game.score[opp]; games.push(row); } catch (e) { games.push({ err: String(e.message).slice(0, 80) }); } };
  const { f, problems, log } = runFranchise(seed, { difficulty, seasons, check: keepJob, alterGame, onSeason: (x) => {
    const prog = {}; for (const a of ACHIEVEMENTS) { if (!a.metric) continue; try { const p = AS.achievementProgress(x, a, { H: F.achHelpers(x) }); if (p) prog[a.id] = +(p.pct * a.target).toFixed(1); } catch {} }
    const h = x.history?.at(-1); const H = F.achHelpers(x); const season = {}; for (const a of ACHIEVEMENTS) if (/^s_/.test(a.metric || '')) { try { const v = AS.metricValue(x, a, { h, H, live: false }); if (v != null) season[a.id] = v; } catch {} }
    const rec = F.record(x); timeline.push({ prog, season,  year: x.season.year, w: rec.w, l: rec.l, t: rec.t, champion: x.season.champion === x.club || x.season.playoffs?.champion === x.club, playoffs: !!x.history?.at(-1)?.playoffs, roster: x.roster.length, earned: Object.keys(x.achievements || {}).length });
  } });
  const year0 = (f.history?.[0]?.year ?? 1);
  const unlocked = Object.fromEntries(Object.entries(f.achievements || {}).map(([id, r]) => [id, { year: r.year, season: (r.year ?? year0) - year0 + 1, week: r.week ?? null, backfilled: !!r.backfilled }]));
  runs.push({ seed, difficulty, seasons: timeline.length, dev: !!f.achDev, problems: problems.slice(0, 10), timeline, titles: timeline.filter((t) => t.champion).length, unlocked, games, track: { n: f.achTrack?.n || {}, best: f.achTrack?.best || {} }, seconds: Math.round((Date.now() - t0) / 1000) });
  console.error(`${difficulty} seed ${seed}: ${timeline.length} seasons, ${Object.keys(unlocked).length} achievements, ${runs.at(-1).seconds}s`);
}
const out = { tool: 'achievements-calibration', difficulty, seasons, seeds, catalogue: ACHIEVEMENTS.map((a) => ({ id: a.id, category: a.category, rarity: a.rarity, metric: a.metric || null, target: a.target ?? null, prov: !!a.prov })), runs };
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out));
else console.log(JSON.stringify(out).slice(0, 2000));
