#!/usr/bin/env node
// Writes franchise exports at points of the trade calendar for the browser check (tools/trade-deadline-check.py):
//   early (week 1) · window (week 5, a call waiting) · deadline (week 8, a call waiting) · passed (week 9) · forged (week 9 with an offer forced into the save
//   that carries week 9's own stamp, as an edited or stale save might) · postseason · offseason
//   node tools/trade-deadline-saves.mjs --seed=51 --dir=DIR
import fs from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { runFranchise } from './franchise-soak.mjs';
import { withBoardReset, leagueInvariants } from './league-soak.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const dir = args.dir || '.'; const seed = Number(args.seed || 51); fs.mkdirSync(dir, { recursive: true });
const got = {}; const base = withBoardReset(leagueInvariants);
const callAt = (f) => { const c = JSON.parse(JSON.stringify(f)); for (let s = 1; s <= 200; s++) { const g = JSON.parse(JSON.stringify(c)); g.seed = s; g.callsMade = {}; g.tradeCall = null; if (F.maybeTradeCall(g)) return g; } return null; };
const check = (f, where) => {
  const p = base(f, where); if (!F.hasLeague(f) || f.season.year !== 2) return p;
  const w = f.season.week; const inSeason = !f.season.finished && !f.offseason && !F.inPlayoffs(f);
  const put = (name, x) => { if (!got[name] && x) got[name] = Save.exportJson(x); };
  if (inSeason && w === 1) put('early', f);
  if (inSeason && w === 5) put('window', F.tradeCall(f) ? f : callAt(f));
  if (inSeason && w === 8) put('deadline', F.tradeCall(f) ? f : callAt(f));
  if (inSeason && w === 9) { put('passed', f); const g = callAt({ ...JSON.parse(JSON.stringify(f)), season: { ...JSON.parse(JSON.stringify(f.season)), week: 8 } }); if (g) { g.season.week = 9; g.tradeCall.expires = `wk:${g.season.year}:9`; put('forged', g); } }
  if (!f.season.finished && F.inPlayoffs(f)) put('postseason', f);
  return p;
};
runFranchise(seed, { seasons: 2, check, onSeason: (f) => { if (f.season.year === 2) got.offseason ||= Save.exportJson(f); } });
for (const [k, v] of Object.entries(got)) fs.writeFileSync(`${dir}/${k}.json`, v);
console.log('wrote', Object.keys(got).join(', '));
