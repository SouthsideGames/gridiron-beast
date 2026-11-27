#!/usr/bin/env node
// D-1 cap transition study (owner 2026-11-26; investigation tool, never imported by the game).
//
//   phase make:     node tools/balance-audit/cap-transition-study.mjs --phase=make --root=<old tree> --seed=N --difficulty=D --seasons=3 --out=save.json
//                   Plays a franchise on an OLD build (1.8 M cap, no capEra) for `seasons` full seasons plus most of the next (stops at week 10),
//                   then exports the save exactly as an existing player's save would look.
//   phase continue: node tools/balance-audit/cap-transition-study.mjs --phase=continue --in=save.json --seasons=3 --json=out.json
//                   Loads that save on THIS build and plays on through the transition (at the end of the current season) and further seasons,
//                   recording each league year: the owner's and every AI club's payroll against the cap, roster sizes, releases, trades, the
//                   commissioner's reviews, legality problems and whether a legal lineup could be fielded.
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? '1']; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..'));
const imp = (p) => import(path.join(ROOT, p));
const Soak = await imp('tools/franchise-soak.mjs'); const Save = await imp('src/franchise/save.js'); const F = await imp('src/franchise/franchise.js');

if (args.phase === 'make') {
  const seasons = Number(args.seasons) || 3;
  const r = Soak.runFranchise(Number(args.seed) || 1, { difficulty: args.difficulty || 'pro', seasons, check: () => [] });
  let f = r.f; const n = F.startNextSeason(f, { acceptForfeits: true }); if (!n.ok) throw new Error(`next season blocked: ${n.reason}`);
  const r2 = Soak.runFranchise(0, { from: f, seasons: 1, stopWeek: 10, check: () => [] }); f = r2.f;
  fs.writeFileSync(args.out, Save.exportJson(f));
  console.log(JSON.stringify({ made: args.out, year: f.season.year, week: f.season.week, capEra: f.capEra ?? null, payroll: F.salarySummary(f).total }));
  process.exit(0);
}

const L = await imp('src/data/league.js'); const Reg = await imp('src/franchise/league-registry.js');
const raw = Save.importJson(fs.readFileSync(args.in, 'utf8')); let f = raw.franchise || raw.f || raw;
try { Save.migrate?.(f); } catch { /* migrate runs on load in the game; tolerated here */ }
const seasons = Number(args.seasons) || 3; const rows = []; const events = { commissioner: 0, problems: [] };
const snap = (label) => {
  const cap = L.tierCap(f), staffAllow = 405000; const s = F.salarySummary(f);
  const clubs = Reg.hasLeague(f) ? Reg.leagueClubs(f) : [];
  const ai = clubs.filter((c) => c !== f.club).map((c) => { const ros = Reg.clubRoster(f, c); const pay = ros.reduce((a, m) => a + (m.salary || 0), 0); return { c, pay, n: ros.length }; });
  return { label, year: f.season.year, week: f.season.week, finished: !!f.season.finished, capEra: f.capEra ?? null, cap, owner: { payroll: s.total, room: s.remaining, over: s.over, roster: f.roster.length },
    ai: { clubs: ai.length, overUsable: ai.filter((x) => x.pay > cap - staffAllow).length, maxOver: Math.max(0, ...ai.map((x) => x.pay - (cap - staffAllow))), minRoster: Math.min(...ai.map((x) => x.n)) }, transition: f.capTransition || null };
};
rows.push(snap('loaded'));
const check = (x, where) => { const p = Soak.invariants(x, where); if (p.length) events.problems.push(...p.slice(0, 3)); return []; };
const beforeOffseason = (x) => { rows.push(snap('season end')); };
for (let s = 0; s < seasons; s++) {
  const r = Soak.runFranchise(0, { from: f, seasons: 1, check, onSeason: (x) => { f = x; } }); f = r.f || f;
  rows.push(snap('season over'));
  if (s < seasons - 1) { const n = F.startNextSeason(f, { acceptForfeits: true }); rows.push({ ...snap('next season start'), started: !!n.ok, reason: n.ok ? null : n.reason }); if (!n.ok) break; }
}
const news = (f.news || []).map((n) => n.text || '').filter((t) => /salary cap|cap falls|cap is now/i.test(t));
const out = { tool: 'balance-audit/cap-transition-study', in: args.in, rows, problems: events.problems.slice(0, 20), problemCount: events.problems.length, capNews: news.slice(0, 6), commissionerReleases: f.campaign?.commissionerReleases || 0, transition: f.capTransition || null };
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ transition: out.transition, problems: out.problemCount, commissionerReleases: out.commissionerReleases, rows: rows.map((r) => `${r.label} y${r.year} era${r.capEra} cap${r.cap} own${r.owner.payroll}/${r.owner.roster} aiOver${r.ai.overUsable}`) }, null, 0));
