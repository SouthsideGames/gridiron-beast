#!/usr/bin/env node
// Task 9 history study: real hands-off franchises played to the 20-season limit. After every season it checks the history,
// awards, records and Monster Hall of Fame data against the franchise itself, measures what Task 9 adds to the save, and prints
// a digest of the rest of the save so the same seed can be compared with a build without Task 9 (the history must not change
// a single gameplay result). Exits 1 on a problem.
//   node tools/task9-history-study.mjs [--seed=1] [--n=1] [--seasons=20] [--real-board] [--root=/path/to/another/checkout] [--dump=file.json]
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = resolve(args.root || new URL('..', import.meta.url).pathname);
const at = (p) => import(pathToFileURL(resolve(ROOT, p)).href);
const { runFranchise } = await at('tools/franchise-soak.mjs');
const Save = await at('src/franchise/save.js');
const T9 = await at('src/franchise/task9-history.js').catch(() => null);          // absent on a build without Task 9
const HOF = await at('src/franchise/monster-hof-voting.js').catch(() => null);
const N = Number(args.n || 1), SEASONS = Number(args.seasons || 20), SEED = Number(args.seed || 1);
const sha = (v) => createHash('sha256').update(JSON.stringify(v ?? null)).digest('hex').slice(0, 16);
let problems = 0; const bad = (m) => { problems++; if (problems < 40) console.log('PROBLEM', m); };
const out = [];

for (let i = 0; i < N; i++) {
  const seed = SEED + i; const seen = { elections: 0, inducted: new Set(), retiredAt: new Map() }; let last = null;
  // a hands-off owner is usually dismissed within a few seasons; the study keeps the board content (the same on every build that
  // is compared) so the franchise reaches the 20-season limit. --real-board leaves the board alone.
  const r = runFranchise(seed, { difficulty: 'rookie', seasons: SEASONS, onOffseason: args['real-board'] ? null : (f) => { if (f.board) { f.board.confidence = 2; f.board.misses = 0; } }, onSeason: (f, s) => {
    const { monsterHallOfFame, createdAt, uid, ...rest } = f;
    const row = { seed, season: s, year: f.history[f.history.length - 1]?.year, digest: sha(rest), saveKB: Math.round(Save.exportJson(f).length / 1024) };
    if (T9 && HOF) {
      const hof = f.monsterHallOfFame || { candidates: [], elections: [] };
      row.hofKB = +(JSON.stringify(hof).length / 1024).toFixed(1);
      row.candidates = hof.candidates.length; row.elections = hof.elections.length;
      const t0 = Date.now(); const view = T9.franchiseHistoryView(f); row.viewMs = Date.now() - t0;
      row.inductees = view.hallOfFame.inductees.length;
      // one election per completed season, never repeated
      const years = hof.elections.map((e) => e.year); if (new Set(years).size !== years.length) bad(`s${s}: an election year repeats`);
      if (hof.elections.length !== f.history.filter((h) => !h.legacy).length) bad(`s${s}: ${hof.elections.length} elections for ${f.history.length} seasons`);
      // nobody twice, nobody active, nobody early
      const ids = hof.elections.flatMap((e) => e.inductees.map((x) => x.id)); if (new Set(ids).size !== ids.length) bad(`s${s}: a monster was inducted twice`);
      const active = new Set([...f.roster.map((m) => String(m.id)), ...Object.keys(f.league?.monsters || {}), ...Object.values(f.pool || {}).flat().map((m) => String(m.id)), ...(f.league?.waivers || []).map((m) => String(m.id))]);
      for (const e of hof.elections) for (const x of e.inductees) { if (active.has(String(x.id))) bad(`s${s}: ${x.name} is in the Hall while active`); if (!(e.year - x.retiredYear >= HOF.WAIT_SEASONS)) bad(`s${s}: ${x.name} inducted ${e.year - x.retiredYear} seasons after retiring`); if (x.votes / x.voters < HOF.VOTE_THRESHOLD) bad(`s${s}: ${x.name} inducted below the threshold`); }
      for (const e of hof.elections) { if (e.inductees.length > HOF.MAX_INDUCTEES) bad(`s${s}: ${e.inductees.length} inductees in ${e.year}`); for (const b of e.ballot) if (!(e.year - b.retiredYear >= HOF.WAIT_SEASONS)) bad(`s${s}: ${b.name} on the ${e.year} ballot too early`); }
      // candidates are retirees with a preserved record; their retirement year never moves
      for (const c of hof.candidates) { if (active.has(String(c.id))) bad(`s${s}: candidate ${c.name} is active`); if (!f.league?.legends?.[c.id]) bad(`s${s}: candidate ${c.name} has no preserved record`); const was = seen.retiredAt.get(c.id); if (was != null && was !== c.retiredYear) bad(`s${s}: ${c.name}'s retirement year moved`); seen.retiredAt.set(c.id, c.retiredYear); if (f.league?.legends?.[c.id] && f.league.legends[c.id].left !== c.retiredYear) bad(`s${s}: ${c.name} retired ${c.retiredYear} but his record says he left in ${f.league.legends[c.id].left}`); }
      // the election of a season is the same when it is held again from the same facts
      const lastE = hof.elections[hof.elections.length - 1]; if (lastE) { const again = HOF.electMonsterHallOfFame(hof.candidates, lastE.year, hof.elections.slice(0, -1)).election; if (JSON.stringify(again) !== JSON.stringify(lastE)) bad(`s${s}: the ${lastE.year} election is not repeatable`); }
      // earlier elections and inductees never change
      if (last) { for (let k = 0; k < last.elections.length; k++) if (JSON.stringify(last.elections[k]) !== JSON.stringify(hof.elections[k])) bad(`s${s}: the ${last.elections[k].year} election changed afterwards`); }
      last = JSON.parse(JSON.stringify(hof));
      // the index agrees with the franchise
      if (view.seasons.length !== f.history.length) bad(`s${s}: ${view.seasons.length} season summaries for ${f.history.length} seasons`);
      for (const h of f.history) { const sm = view.seasons.find((x) => x.year === h.year); if (!sm || sm.champion !== (h.champion ?? null) || sm.record?.w !== h.record?.w || sm.record?.l !== h.record?.l) bad(`s${s}: season ${h.year} summary differs from the franchise`);
        for (const [k, w] of Object.entries(h.awards?.league || {})) { if (!w) continue; const hit = view.awards.find((a) => a.year === h.year && a.award === k); if (!hit) bad(`s${s}: ${h.year} ${k} is missing from the award history`); else if (k !== 'coy' && (hit.id !== w.id || hit.name !== w.name)) bad(`s${s}: ${h.year} ${k} names ${hit.name}, the season says ${w.name}`); } }
      const dup = view.awards.map((a) => `${a.year}:${a.award}`); if (new Set(dup).size !== dup.length) bad(`s${s}: an award is listed twice`);
      // records: the model shows exactly what the record book holds
      for (const sec of view.records) for (const row2 of sec.rows) { const src = f.records?.[sec.scope]?.[row2.category]; if (!!src !== !!row2.record) bad(`s${s}: record ${sec.scope}.${row2.category} presence differs`); else if (src && (src.value !== row2.record.value || src.name !== row2.record.name || src.year !== row2.record.year || src.team !== row2.record.team)) bad(`s${s}: record ${sec.scope}.${row2.category} differs`); if (src && !!src.prev !== !!row2.record.previous) bad(`s${s}: record ${sec.scope}.${row2.category} previous holder differs`); }
      // every inductee, candidate and award winner opens a career profile, and the profile agrees
      for (const x of view.hallOfFame.inductees) { const pg = T9.careerPage(f, x.id); if (!pg) bad(`s${s}: inductee ${x.name} has no career page`); else { if (!pg.facts.hof) bad(`s${s}: ${x.name}'s page does not show the induction`); if (pg.historicalRecognition.induction?.inductedYear !== x.inductedYear) bad(`s${s}: ${x.name}'s induction year differs`); } }
      for (const c of hof.candidates) if (!T9.careerProfile(f, c.id)) bad(`s${s}: candidate ${c.name} has no profile`);
      // a save round trip keeps everything and adds nothing
      const json = JSON.stringify(f); const re = JSON.parse(json); if (JSON.stringify(T9.franchiseHistoryView(re)) !== JSON.stringify(view)) bad(`s${s}: the history differs after a JSON round trip`);
    }
    out.push(row); console.log(JSON.stringify(row));
  } });
  if (r.problems.length) for (const p of r.problems.slice(0, 10)) bad(`soak: ${p}`);
  if (args.dump) writeFileSync(String(args.dump).replace('%', seed), JSON.stringify(r.f));
}
console.log(JSON.stringify({ problems, seasons: out.length }));
process.exit(problems ? 1 : 0);
