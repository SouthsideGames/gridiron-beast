#!/usr/bin/env node
// Task 10 league recorder (observation only). Plays real franchises with the repair owner (tools/study-owner.mjs) and records,
// without changing anything the game decides:
//   every game week  the free-agent market by position (healthy monsters a club could sign that day), the owner's open starting
//                    slots before and after the repair, every AI club's open starting slots;
//   every season     the full MVP race recomputed from the regular-season table (every eligible monster, not the top five), the
//                    size of each position group, standings with each club's overall, Apex count and roster size, forfeits,
//                    the champion, and the offseason market by position;
//   the franchise    the league's signing log by source (pool, waivers, generated arrival) and position.
//   node tools/task10-league-recorder.mjs --seed=3 [--n=1] [--seasons=20] [--difficulty=rookie] [--json=out-%.json]
import { writeFileSync } from 'node:fs';
import * as F from '../src/franchise/franchise.js';
import * as RO from '../src/franchise/roster.js';
import { runFranchise } from './franchise-soak.mjs';
import { repairOwner, repairOffseason, openSlots } from './study-owner.mjs';
import { computeAwards, eligibleRows } from '../src/franchise/awards.js';
import { monsterOverall } from '../src/data/monsters.js';
import { positionOf } from '../src/data/personnel.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n || 1), SEASONS = Number(args.seasons || 20), SEED = Number(args.seed || 1), DIFF = args.difficulty || 'rookie';
const POS = Object.keys(RO.GROUP_SLOTS);
const byPos = (list) => { const o = Object.fromEntries(POS.map((p) => [p, 0])); for (const m of list) o[m.position] = (o[m.position] || 0) + 1; return o; };
const market = (f) => byPos(F.freeAgentMarket(f).map((x) => x.monster).filter((m) => !m.injury));
const clubRoster = (f, c) => (f.league.clubs[c]?.roster || []).map((id) => f.league.monsters[id]).filter(Boolean);
const monsterOf = (f, id) => f.roster.find((m) => m.id === id) || f.league.monsters?.[id] || null;
const isApex = (m) => !!(m?.dev?.apex || m?.apex);

for (let i = 0; i < N; i++) {
  const seed = SEED + i; const repair = {}; const weeks = []; const seasons = []; let before = null; const t0 = Date.now();
  const r = runFranchise(seed, { difficulty: DIFF, seasons: SEASONS,
    check: () => [],
    beforeGame: (f) => {
      const open0 = openSlots(f).map(positionOf); const mk = market(f); const ok = repairOwner(f, repair);
      const ai = {}; for (const c of Object.keys(f.league.clubs)) { const ro = clubRoster(f, c); const p = RO.lineupProblems(ro, RO.buildDepthChart(ro)); if (p.length) ai[c] = p.map(positionOf); }
      weeks.push({ year: f.season.year, week: f.season.week, market: mk, total: Object.values(mk).reduce((a, b) => a + b, 0), ownerOpen: open0, ownerOpenAfter: ok ? [] : openSlots(f).map(positionOf), aiOpen: ai, roster: f.roster.length });
    },
    onOffseason: (f) => { if (f.board) { f.board.confidence = 2; f.board.misses = 0; } before = { market: market(f), ownerShort: POS.filter((p) => f.roster.filter((m) => m.position === p).length < RO.GROUP_SLOTS[p].length) }; repairOffseason(f, repair); },
    onSeason: (f) => {
      const S = f.season; const { rows } = eligibleRows(S.leagueStats); const groups = byPos(rows);
      const races = computeAwards({ table: S.leagueStats, records: S.records, expectations: S.expectations || {}, n: 500 });
      const mvp = races.mvp.map((x, k) => { const m = monsterOf(f, x.id); return { rank: k + 1, id: x.id, name: x.name, pos: x.position, team: x.team, score: x.score, c: x.components, apex: isApex(m), age: x.age, yearsPro: x.yearsPro, ovr: m ? monsterOverall(m) : null, record: x.record }; });
      const clubs = Object.fromEntries(Object.entries(S.records).map(([c, rec]) => { const ro = c === f.club ? f.roster : clubRoster(f, c); return [c, { w: rec.w, l: rec.l, pf: rec.pf, pa: rec.pa, ovr: RO.teamOverall({ roster: ro, chart: RO.buildDepthChart(ro) }), apex: ro.filter(isApex).length, roster: ro.length, owner: c === f.club, tier: f.league.clubs[c]?.strategy?.tier ?? null, mode: f.league.clubs[c]?.strategy?.mode ?? null }]; }));
      const forfeits = (S.results || []).filter((g) => g.forfeit).length;
      const frozen = S.awardsFinal?.winners?.mvp || null;
      seasons.push({ year: S.year, champion: S.champion, owner: f.club, groups, mvpTop: mvp.slice(0, 12), mvpBestByPos: Object.fromEntries(POS.map((p) => [p, mvp.find((x) => x.pos === p) || null])), frozenMvp: frozen ? { id: frozen.id, name: frozen.name, pos: frozen.position, score: frozen.score } : null,
        apexEligible: mvp.filter((x) => x.apex).length, eligible: mvp.length, clubs, forfeits, offseason: before, repair: { signed: repair.signed || 0, failed: repair.failed || 0, offSigned: repair.offSigned || 0, offFailed: repair.offFailed || 0 } });
      console.log(JSON.stringify({ seed, diff: DIFF, year: S.year, champion: S.champion, forfeits, mvp: mvp[0] && `${mvp[0].name}/${mvp[0].pos}${mvp[0].apex ? '*' : ''}`, min: ((Date.now() - t0) / 60000).toFixed(1) }));
    } });
  const signings = (r.f.league.events || []).filter((e) => e.kind === 'signing').map((e) => ({ year: e.year, week: e.week ?? null, club: e.club, via: e.via, generated: !!e.generated, pos: e.position ?? null }));
  const out = { seed, difficulty: DIFF, problems: r.problems, repair, weeks, seasons, signings, history: r.f.history.map((h) => ({ year: h.year, w: h.record.w, l: h.record.l, champion: h.champion, place: h.place, forfeits: (h.schedule || []).filter((g) => g.result?.forfeit).length })) };
  if (args.json) writeFileSync(String(args.json).replace('%', seed), JSON.stringify(out));
}
