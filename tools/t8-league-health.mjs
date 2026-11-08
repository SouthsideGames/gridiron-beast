#!/usr/bin/env node
// Task 8 league-health study (franchise-health reports, N7f): runs hands-off franchises for N seasons and records, per season,
// how the AI clubs' strength, development, ageing and roster management move with no seasonal boosts. Read-only on the game:
// it drives the game's own public functions (tools/franchise-soak.mjs).
//   node tools/t8-league-health.mjs [seasons=10] [seeds=1,2,3] [out.json]
// D7 (identities): per AI club and season also records its identity, the season's pass share of its offensive snaps (pass attempts and
// sacks against carries, from the league tables), its coach's tendencies and 6 + 6 playbook, the share of its starters fitting the
// identity's scheme, and the league's AI trades and starter sales of the season (deduplicated across the capped trade log).
import fs from 'node:fs';
import { runFranchise } from './franchise-soak.mjs';
import { monsterOverall, resolveSpecies } from '../src/data/monsters.js';
import { buildDepthChart } from '../src/franchise/roster.js';
import { GYM_BY_CLUB } from '../src/data/gyms.js';
import * as FR from '../src/core/fraction.js';
import * as F from '../src/franchise/franchise.js';
import { PLAYS } from '../src/data/playbook.js';
import { identityFor, fitsIdentity } from '../src/data/identities.js';
import { OFFENSE_SLOTS, DEFENSE_SLOTS } from '../src/data/personnel.js';

const seasons = Number(process.argv[2] || 10); const seeds = (process.argv[3] || '1,2,3').split(',').map(Number); const out = process.argv[4] || null;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : null; };
const sum = (o) => Object.values(o || {}).reduce((a, b) => a + (b || 0), 0);

function snapshot(f, s) {
  const clubs = Object.keys(f.league.clubs); const rows = [];
  for (const c of clubs) {
    const roster = f.league.clubs[c].roster.map((id) => f.league.monsters[id]).filter(Boolean);
    const st = new Set(Object.values(buildDepthChart(roster, {}, {}))); const starters = roster.filter((m) => st.has(m.id));
    rows.push({ club: c, gym: !!GYM_BY_CLUB[c], mode: f.league.clubs[c].strategy?.mode || null, size: roster.length,
      starterOvr: mean(starters.map((m) => monsterOverall(m))), age: mean(roster.map((m) => m.age)), level: mean(roster.map((m) => m.dev?.level || m.level)),
      trained: mean(roster.map((m) => sum(m.dev?.trained))), decline: mean(roster.map((m) => sum(m.dev?.loss))), bank: mean(roster.map((m) => (m.dev ? FR.toNumber(m.dev.bank) : 0))),
      lvl50: roster.filter((m) => (m.dev?.level || 0) >= 50).length, basics: roster.filter((m) => resolveSpecies(m).rarity === 'basic').length, apex: roster.filter((m) => m.dev?.apex).length });
  }
  const own = (() => { const st = new Set(Object.values(buildDepthChart(f.roster, {}, {}))); return mean(f.roster.filter((m) => st.has(m.id)).map((m) => monsterOverall(m))); })();
  const g = rows.filter((r) => r.gym), o = rows.filter((r) => !r.gym && r.club !== f.club);
  const lo = f.leagueOffseason || {};
  return { season: s, gymOvr: mean(g.map((r) => r.starterOvr)), ordinaryOvr: mean(o.map((r) => r.starterOvr)), spread: [q(rows.map((r) => r.starterOvr), 0.1), q(rows.map((r) => r.starterOvr), 0.9)],
    ownerOvr: own, sizeMin: Math.min(...rows.map((r) => r.size)), sizeMax: Math.max(...rows.map((r) => r.size)), age: mean(rows.map((r) => r.age)), level: mean(rows.map((r) => r.level)),
    trained: mean(rows.map((r) => r.trained)), decline: mean(rows.map((r) => r.decline)), bank: mean(rows.map((r) => r.bank)), lvl50: sum(Object.fromEntries(rows.map((r) => [r.club, r.lvl50]))),
    basics: sum(Object.fromEntries(rows.map((r) => [r.club, r.basics]))), apex: sum(Object.fromEntries(rows.map((r) => [r.club, r.apex]))), legends: Object.keys(f.league.legends || {}).length,
    modes: rows.reduce((m, r) => { m[r.mode] = (m[r.mode] || 0) + 1; return m; }, {}), nudge: lo.nudge ? { boosted: lo.nudge.boosted?.length ?? lo.nudge.boosted, slowed: lo.nudge.slowed?.length ?? lo.nudge.slowed } : null,
    trades: lo.trades ?? null, upgrades: lo.upgrades ?? null };
}
const seenTrades = new Set();
function identityRows(f, s) {
  const out = []; const stats = f.season.leagueStats || {};
  for (const c of Object.keys(f.league.clubs)) {
    const id = identityFor(c); if (!id) continue;
    const T = stats[c] || {}; let pass = 0, run = 0; for (const r of Object.values(T)) { pass += (r.att || 0) + (r.sacked || 0); run += r.rush || 0; }
    const team = F.aiTeam(f, c); const byId = Object.fromEntries(team.roster.map((m) => [m.id, m]));
    const side = (slots) => { const st = slots.map((sl) => byId[team.chart[sl]]).filter(Boolean); return st.length ? st.filter((m) => fitsIdentity(m, id)).length / st.length : null; };
    const roster = team.roster; const idPos = roster.filter((m) => id.positions.includes(m.position)); const fitRoster = roster.filter((m) => m.position !== 'K').filter((m) => fitsIdentity(m, id)).length / Math.max(1, roster.filter((m) => m.position !== 'K').length);
    const offPass = team.offensePlays.filter((p) => PLAYS[p]?.type === 'pass').length; const dt = (tag) => team.defensePlays.filter((p) => PLAYS[p]?.tags.includes(tag)).length;
    out.push({ club: c, gym: id.gym, offense: id.offense, defense: id.defense, passRate: pass + run ? pass / (pass + run) : null, passBias: team.coach.passBias, aggression: team.coach.aggression,
      offPass, blitz: dt('blitz'), man: dt('man'), zone: dt('zone'), fitOff: side(OFFENSE_SLOTS), fitDef: side(DEFENSE_SLOTS), fitRoster, idPosOvr: mean(idPos.map(monsterOverall)), otherOvr: mean(roster.filter((m) => !id.positions.includes(m.position)).map(monsterOverall)) });
  }
  const trades = []; for (const t of f.league.trades || []) { const k = `${t.year}|${t.week}|${t.A}|${t.B}|${t.toA}`; if (seenTrades.has(k)) continue; seenTrades.add(k); trades.push(t); }
  return { identity: out, trades: trades.length, sales: trades.filter((t) => t.sale).length };
}
function summarise(runs) {
  const rows = runs.flatMap((r) => r.series.flatMap((x) => x.identity || []));
  const by = (key) => { const g = {}; for (const r of rows) (g[r[key]] ||= []).push(r); return g; };
  const m = (xs, k) => { const v = xs.map((x) => x[k]).filter((x) => x != null); return v.length ? Math.round(mean(v) * 1000) / 1000 : null; };
  const off = Object.fromEntries(Object.entries(by('offense')).map(([k, xs]) => [k, { n: xs.length, passRate: m(xs, 'passRate'), passBias: m(xs, 'passBias'), offPass: m(xs, 'offPass'), fitOff: m(xs, 'fitOff') }]));
  const def = Object.fromEntries(Object.entries(by('defense')).map(([k, xs]) => [k, { n: xs.length, aggression: m(xs, 'aggression'), blitz: m(xs, 'blitz'), man: m(xs, 'man'), zone: m(xs, 'zone'), fitDef: m(xs, 'fitDef') }]));
  const all = runs.flatMap((r) => r.series);
  const gap = all.map((x) => x.gymOvr - x.ordinaryOvr);
  return { offense: off, defense: def, fitRoster: m(rows, 'fitRoster'), idPosMinusOther: Math.round(mean(rows.map((r) => r.idPosOvr - r.otherOvr)) * 100) / 100,
    gymMinusOrdinaryBySeason: [...new Set(all.map((x) => x.season))].map((s) => ({ season: s, gap: Math.round(mean(all.filter((x) => x.season === s).map((x) => x.gymOvr - x.ordinaryOvr)) * 100) / 100 })), gapMean: Math.round(mean(gap) * 100) / 100,
    trades: all.reduce((a, x) => a + (x.trades || 0), 0), sales: all.reduce((a, x) => a + (x.sales || 0), 0) };
}
const all = [];
for (const seed of seeds) { seenTrades.clear();
  const t0 = Date.now(); const series = [];
  // the study owner is never dismissed (board misses reset before each game): the run measures the league over all the seasons
  const keep = (f) => { const b = f.board; if (b) { b.misses = 0; b.confidence = Math.max(b.confidence || 0, 3); } };
  const { problems } = runFranchise(seed, { seasons, beforeGame: keep, onSeason: (f, s) => { series.push({ ...snapshot(f, s), ...identityRows(f, s) }); process.stderr.write(`seed ${seed} season ${s} ${((Date.now() - t0) / 1000).toFixed(0)}s\n`); } });
  all.push({ seed, problems: problems.slice(0, 10), problemCount: problems.length, series });
}
const text = JSON.stringify({ seasons, seeds, at: new Date().toISOString(), summary: summarise(all), runs: all }, null, 1);
process.stderr.write(JSON.stringify(summarise(all), null, 1) + '\n');
if (out) fs.writeFileSync(out, text); else console.log(text);
