#!/usr/bin/env node
// Reference saves for the release check (tools/deploy-check.py --save …): franchises of the 32-club league played by the soak's
// hands-off owner, exported exactly as the game exports them. Regenerate after a change to the save format or the league:
//
//   node tools/make-reference-saves.mjs [OUTDIR=tools/release-saves]
//
//   league32-week6.json            Skyvale Cyclones, season 1 week 6: a regular-season week with a Gym Leader game behind it
//   league32-playoffs.json         a season in the four-round playoffs (Divisional round), the owner's club among the seeds
//   league32-season3-moved.json    three seasons in, the coach moved clubs after season 2 and took his badges and tracks along
//
// The 16-club saves kept beside them (16club-*.json) are franchises written by the released 16-club game; the check expects the
// game to refuse them with its own message and to leave them unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { runFranchise, newFranchise } from './franchise-soak.mjs';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';

const OUT = process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), 'release-saves');
fs.mkdirSync(OUT, { recursive: true });
const keepJob = (f) => { if (f.board) { f.board.confidence = Math.max(f.board.confidence, 0); f.board.misses = 0; f.board.fired = false; } };
const write = (name, f, note) => { const text = Save.exportJson(f); Save.importJson(text); fs.writeFileSync(path.join(OUT, name), text); console.log(name, `${(text.length / 1024).toFixed(0)} KB`, note); };

// 1. a regular-season week
{ const seed = 4101; const r = runFranchise(seed, { from: newFranchise(seed, { club: 'Skyvale Cyclones', difficulty: 'pro' }), seasons: 1, stopWeek: 6 });
  write('league32-week6.json', r.f, `${r.f.club} y${r.f.season.year} w${r.f.season.week} badges ${Object.keys(r.f.campaign.badges).length}`); }

// 2. the playoffs: first seed (from 4201) whose owner qualifies; stop in the Divisional round
for (let seed = 4201; seed < 4260; seed++) {
  let stop = null;
  const r = runFranchise(seed, { from: newFranchise(seed, { club: 'Riverbend Rapids', difficulty: 'rookie' }), seasons: 1, onOffseason: keepJob,
    beforeGame: (f) => { if (!stop && f.season.playoffs?.round === 2 && F.playoffAlive(f)) stop = JSON.parse(Save.exportJson(f)); } });
  if (stop) { const f = Save.importJson(JSON.stringify(stop)); write('league32-playoffs.json', f, `seed ${seed} ${f.club} round ${f.season.playoffs.round}`); break; }
  void r;
}

// 3. three seasons, a move after season 2 with badges and tracks carried
for (let seed = 4301; seed < 4340; seed++) {
  let moved = null; const from = newFranchise(seed, { club: 'Goldhaven Royals', difficulty: 'rookie' });
  const two = runFranchise(seed, { from, seasons: 2, onOffseason: keepJob,
    beforeOffseason: (f, s) => { if (s !== 2 || moved) return; const offer = F.gmJobMarket(f).find((o) => o.rebuilding || o.offered); if (!offer) return; const a = F.applyForGmJob(f, offer.club); if (!a.offered) return; const was = f.club; if (F.acceptGmJob(f, offer.club).ok) moved = { from: was, to: f.club, badges: Object.keys(f.campaign.badges).length }; } });
  if (!moved || !moved.badges) continue;
  const r = runFranchise(seed, { from: two.f, seasons: 1, stopWeek: 4, onOffseason: keepJob });
  if (r.f.season.year === 3) { write('league32-season3-moved.json', r.f, `seed ${seed} ${moved.from} -> ${moved.to}, ${moved.badges} badges carried, now y${r.f.season.year} w${r.f.season.week}`); break; }
}
