#!/usr/bin/env node
// Persistent-roster soak and balance study (GDD §42.10, Phase 3). Hands-off franchises over N seasons on a difficulty:
//   - weekly invariants for all 16 clubs (rosters 26–38, legal lineups, the cap, protected monsters in place, ids unique,
//     every registry monster on exactly one club), checked after every week;
//   - per-season metrics: the AI clubs' mean team overall against today's generator (`legacyAiTeam`), the owner's record,
//     the champion, roster sizes, payroll against the cap, the rival's signature monster, save size (raw / packed / stored);
//   - the Season-20 end: a valid registry inside the archive.
//   node tools/league-soak.mjs [--seed=1] [--seasons=20] [--difficulty=pro] [--json=out.json] [--quiet]
import { writeFileSync } from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import { runFranchise, invariants } from './franchise-soak.mjs';
import { verifyLeague, clubRoster, leagueClubs, isProtected, clubPayroll } from '../src/franchise/league-registry.js';
import { validateClubs } from '../src/franchise/league-season.js';
import { teamOverall } from '../src/franchise/roster.js';
import { monsterOverall } from '../src/data/monsters.js';
import { ALL_TEAMS, tierById } from '../src/data/league.js';
import { pack, gzip } from '../src/franchise/pack.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const seed = Number(args.seed || 1), seasons = Number(args.seasons || 20), difficulty = args.difficulty || 'pro', quiet = !!args.quiet;

/** The Phase 3 invariants on top of the franchise ones: the league registry and every club's legal state. */
export function leagueInvariants(f, where) {
  const p = invariants(f, where);
  if (!F.hasLeague(f)) return [...p, `${where}: no league registry`];
  for (const x of verifyLeague(f)) p.push(`${where}: ${x}`);
  for (const x of validateClubs(f, { cap: tierById(f.tier).cap })) p.push(`${where}: ${x}`);
  const ids = new Set(f.roster.map((m) => m.id));
  for (const club of leagueClubs(f)) for (const m of clubRoster(f, club)) { if (ids.has(m.id)) p.push(`${where}: ${m.id} is on ${club} and the owner's roster`); ids.add(m.id); }
  for (const m of Object.values(f.pool || {}).flat()) { if (ids.has(m.id)) p.push(`${where}: pooled ${m.id} is also on a roster`); ids.add(m.id); }
  return p;
}

const sizes = async (x) => { const raw = JSON.stringify(x); const p = JSON.stringify(pack(x)); const g = await gzip(p); return { raw: raw.length, packed: p.length, stored: g ? g.byteLength : null }; };

export async function study({ seed, seasons, difficulty, onSeason = null }) {
  const rows = []; const prot0 = {};
  const { f, problems, log } = runFranchise(seed, { seasons, difficulty, check: leagueInvariants, onSeason: (f) => {
    const year = f.season.year; const clubs = ALL_TEAMS.filter((t) => t !== f.club);
    const live = clubs.map((c) => teamOverall(F.aiTeam(f, c, year))); const today = clubs.map((c) => teamOverall(F.legacyAiTeam(f, c, year)));
    const mean = (a) => Math.round(a.reduce((s, v) => s + v, 0) / a.length * 10) / 10;
    const rec = f.season.records[f.club]; const cap = tierById(f.tier).cap;
    const payroll = clubs.map((c) => clubPayroll(f, c) + f.league.staffAllowance);
    const rival = f.rivals[f.tier]?.team; const sig = rival ? clubRoster(f, rival).find((m) => m.signature) : null;
    const protectedNow = {}; for (const c of clubs) for (const m of clubRoster(f, c)) if (isProtected(m)) protectedNow[m.id] = c;
    if (year === 1) Object.assign(prot0, protectedNow);
    const protectedMoved = Object.entries(prot0).filter(([id, c]) => protectedNow[id] !== c).map(([id]) => id);
    const row = { year, record: `${rec.w}-${rec.l}`, place: F.leagueStandings(f).overall.indexOf(f.club) + 1, champion: f.season.champion === f.club ? 'OWNER' : f.season.champion, mine: teamOverall(F.playerTeam(f)), aiMean: mean(live), todayMean: mean(today), gap: Math.round((mean(live) - mean(today)) * 10) / 10, aiMin: Math.min(...live), aiMax: Math.max(...live), rivalLive: live[clubs.indexOf(rival)], rivalToday: today[clubs.indexOf(rival)], sigOvr: sig ? monsterOverall(sig) : null, sigAge: sig?.age ?? null, rosters: `${Math.min(...clubs.map((c) => clubRoster(f, c).length))}-${Math.max(...clubs.map((c) => clubRoster(f, c).length))}`, payrollMax: Math.max(...payroll), cap, overCap: payroll.filter((p) => p > cap).length, pool: Object.values(f.pool || {}).flat().length, legends: Object.keys(f.league.legends).length, slowed: f.leagueOffseason?.nudge?.slowed?.length ?? null, boosted: f.leagueOffseason?.nudge?.boosted?.length ?? null, walked: f.leagueOffseason?.contracts?.walked ?? null, released: f.leagueOffseason?.contracts?.released ?? null, protectedMoved: protectedMoved.length, ids: f.league.ids.split(' ').length, transitionMs: F.leagueTransitionMs(), waivers: f.league.waivers?.length ?? 0 };
    rows.push(row); onSeason?.(f, row);
  } });
  const last = rows[rows.length - 1];
  const size = await sizes(f); const leagueSize = await sizes(f.league);
  return { seed, difficulty, seasons: rows.length, fired: log.fired, rows, problems, size, leagueSize, f };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now();
  const res = await study({ seed, seasons, difficulty, onSeason: quiet ? null : (f, row) => console.log(JSON.stringify(row)) });
  const { f, ...out } = res; out.seconds = Math.round((Date.now() - t0) / 1000);
  console.log(JSON.stringify({ ...out, rows: undefined, problems: out.problems.slice(0, 10) }, null, 1));
  if (args.json) writeFileSync(args.json, JSON.stringify(out, null, 1));
  process.exit(out.problems.length ? 1 : 0);
}
