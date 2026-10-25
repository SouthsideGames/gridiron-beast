#!/usr/bin/env node
// Franchise acceptance soak (GDD §28): run many franchises through several full seasons the way a player who lets the staff run
// the week would (scouting, Tuesday Beast Clash encounters, training, game plans, pregame and overtime Clashes, byes, playoffs,
// postseason events, Legend Tracks, contracts, the draft with real picks, free agency to the roster minimum, the next season), and
// check invariants after every step. Exits 1 on any violation or dead end.
//   node tools/franchise-soak.mjs [--n=12] [--seasons=4] [--seed=1] [--quiet]
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { ROSTER_MAX, ROSTER_MIN, monsterOverall } from '../src/data/monsters.js';
import { ATTRIBUTES } from '../src/data/personnel.js';
import { ALL_TEAMS, STARTER_CLUBS } from '../src/data/league.js';
import { partnershipProblems } from '../src/franchise/partnerships.js';

const argv = typeof process !== 'undefined' ? process.argv.slice(2) : []; // the browser walkthroughs import newFranchise too
const args = Object.fromEntries(argv.map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n || 12), SEASONS = Number(args.seasons || 4), SEED0 = Number(args.seed || 1), quiet = !!args.quiet;
const DIFFS = Object.keys(F.DIFFICULTY);

export function newFranchise(seed, { difficulty = 'pro', club = null, legacy = false } = {}) {
  const clubs = STARTER_CLUBS.map((c) => c.name);
  const f = F.createFranchise({ owner: { first: 'Soak', last: `#${seed}`, gender: 'Female', portrait: seed % 4, hometown: '' }, club: club || clubs[seed % clubs.length], cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed, settings: { difficulty }, persistentLeague: !legacy });
  F.hireDefaultStaff(f);
  // creation draft: take the best visible prospect with each pick
  let g = 0; while (f.draft && !f.draft.done && g++ < 40) { if (F.onTheClock(f) === f.club) { const best = bestProspect(f); if (best) F.myDraftPick(f, best.id); else F.passDraftPick(f); } else break; }
  f.settings.tutorial = false; f.welcomed = true; f.settings.autoPoints = true; // the trainer spends attribute points, as a player would
  return f;
}
function bestProspect(f) { const d = f.draft; const cls = (d?.class || []).filter((m) => (d.available || []).includes(m.id)); return cls.sort((a, b) => monsterOverall(b) - monsterOverall(a))[0] || null; }

/** Invariants that must hold at any point of a franchise. Returns problem strings. */
export function invariants(f, where) {
  const p = []; const say = (s) => p.push(`${where}: ${s}`);
  if (f.roster.length > ROSTER_MAX) say(`roster ${f.roster.length} > ${ROSTER_MAX}`);
  const ids = new Set(), names = new Set();
  for (const m of f.roster) {
    if (ids.has(m.id)) say(`duplicate monster id ${m.id}`); ids.add(m.id);
    if (names.has(m.name)) say(`duplicate name ${m.name}`); names.add(m.name);
    for (const k of ATTRIBUTES) { const v = m.attributes?.[k]; if (!Number.isFinite(v) || v < 1 || v > 99) say(`${m.name} ${k}=${v}`); }
    if (!Number.isFinite(m.level) || m.level < 1) say(`${m.name} level ${m.level}`);
    if (!Number.isFinite(m.xp) || m.xp < 0) say(`${m.name} xp ${m.xp}`);
    if (!Number.isFinite(m.fatigue) || m.fatigue < 0 || m.fatigue > 100) say(`${m.name} fatigue ${m.fatigue}`);
    if (m.injury && !(m.injury.weeks >= 0)) say(`${m.name} injury weeks ${m.injury.weeks}`);
    if (!(m.salary > 0)) say(`${m.name} salary ${m.salary}`);
    if ((m.points || 0) < 0) say(`${m.name} points ${m.points}`);
    { const ks = (m.career?.ev || []).map((e) => e.k); if (new Set(ks).size !== ks.length) say(`${m.name} duplicate career events`); for (const e of m.career?.ev || []) if (e.y != null && (e.y < 1 || e.y > (f.season?.year || 1) + 1)) say(`${m.name} career event ${e.k} in season ${e.y}`); }
  }
  for (const [slot, mid] of Object.entries(f.lineupManual || {})) if (mid && !ids.has(mid)) say(`lineup slot ${slot} points at a monster not on the roster`);
  for (const x of partnershipProblems(f)) say(x); // Captain Partnerships (GDD §27.4B)
  const cap = F.salarySummary(f); for (const k of ['cap', 'total', 'remaining']) if (!Number.isFinite(cap[k])) say(`cap ${k} ${cap[k]}`);
  const recs = f.season.records; let w = 0, l = 0, t = 0;
  for (const team of ALL_TEAMS) { const r = recs[team]; if (!r) { say(`no record for ${team}`); continue; } w += r.w; l += r.l; t += r.t; if (r.pf < 0 || r.pa < 0) say(`${team} negative points`); }
  if (w !== l) say(`league wins ${w} != losses ${l}`);
  if (t) say(`${t} ties in the standings (overtime Clash should settle every game)`);
  for (const r of f.season.results || []) if (r.homeScore === r.awayScore && !(r.winner && r.clash)) say(`tied result ${r.home}-${r.away} without a Clash verdict`);
  return p;
}

// `stopWeek` (UI checks): stop in the first season once that week begins, mid-season.
// `onSeason(f, s)` (studies): called after each season's offseason is settled, before the next season starts.
export function runFranchise(seed, { difficulty = 'pro', seasons = SEASONS, check = invariants, stopWeek = null, onSeason = null, legacy = false } = {}) {
  const f = newFranchise(seed, { difficulty, legacy });
  const problems = [...check(f, 'created')]; const log = { seasons: [], clash: { encounters: 0, encounterWins: 0, signed: 0, pregame: 0, pregameWins: 0, ot: 0, otWins: 0 }, fired: false };
  for (let s = 1; s <= seasons && !log.fired; s++) {
    if (F.needsGoal(f)) { const g = F.commissionerGoals(f); F.chooseGoal(f, g[0]?.id); }
    let guard = 0;
    while (!f.season.finished && guard++ < 60) {
      if (stopWeek && f.season.week >= stopWeek) return { f, problems, log };
      if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); continue; }
      if (f.week.commissioner) { const c = f.week.commissioner; const id = c.names?.[0]; const r = id ? F.commissionerRelease(f, id) : { ok: false }; if (!r.ok) { problems.push(`season ${s}: commissioner dead end (${r.reason})`); break; } continue; }
      const day0 = f.season.day;
      const ar = F.autoRunToSunday(f); if (!ar.ok && f.season.day < 6) { problems.push(`season ${s} week ${f.season.week}: auto-run stuck on day ${f.season.day} (${ar.reason})`); break; }
      const e = f.week.encounter; if (e?.result) { log.clash.encounters++; if (e.result.winner === 'a') log.clash.encounterWins++; if (e.status === 'signed') log.clash.signed++; }
      if (F.isBye(f)) { F.takeBye(f); continue; }
      const m = F.sundayMatchup(f); if (!m) { problems.push(`season ${s} week ${f.season.week}: no matchup on day ${f.season.day}`); break; }
      if (m.forfeit) { F.forfeitSunday(f); continue; }
      const game = F.simulatePlayerGame(f); if (!game?.finished) { problems.push(`season ${s} week ${f.season.week}: game did not finish`); break; }
      if (f.week.pregame?.result) { log.clash.pregame++; if (f.week.pregame.result.winner === 'a') log.clash.pregameWins++; }
      if (game.tiebreak) { log.clash.ot++; if (game.tiebreak.playerWon) log.clash.otWins++; }
      if (game.needsTiebreak && !game.winner) problems.push(`season ${s} week ${f.season.week}: tied game without a winner`);
      F.finishSunday(f, game);
      problems.push(...check(f, `season ${s} week ${f.season.week}`));
      if (day0 === f.season.day && guard > 50) { problems.push(`season ${s}: no progress`); break; }
    }
    if (!f.season.finished) { problems.push(`season ${s}: did not finish (week ${f.season.week}, day ${f.season.day})`); break; }
    problems.push(...check(f, `season ${s} end`)); // the season may have ended inside a skipped playoff round, after the last weekly check
    const rec = F.record(f); log.seasons.push({ year: f.season.year, w: rec.w, l: rec.l, champion: f.season.champion, club: f.club, roster: f.roster.length });
    if (F.isFired(f)) { log.fired = true; break; }
    // offseason
    if (f.postseason && !f.postseason.resolved) { const ev = F.postseasonEvent(f); const r = F.resolvePostseason(f, ev.options[0].id); if (!r.ok) problems.push(`season ${s}: postseason ${r.reason}`); }
    if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
    for (const i of F.offseasonPending(f)) { const r = F.resolveContract(f, i.id, 'sign'); if (!r.ok) { const w = F.resolveContract(f, i.id, 'walk'); if (!w.ok) problems.push(`season ${s}: contract for ${i.id} could not be settled (${r.reason}; ${w.reason})`); } }
    const b = F.beginDraft(f); if (!b.ok) { problems.push(`season ${s}: draft would not start (${b.reason})`); break; }
    let dg = 0; while (!f.draft.done && dg++ < 80) { if (F.onTheClock(f) === f.club) { const best = bestProspect(f); const r = best && f.roster.length < ROSTER_MAX ? F.myDraftPick(f, best.id) : F.passDraftPick(f); if (!r.ok) F.passDraftPick(f); } else break; }
    if (!f.draft.done) problems.push(`season ${s}: draft stuck`);
    let fa = 0; while (f.roster.length < ROSTER_MIN && fa++ < 20) { const mk = F.offseasonMarket(f); const pick = mk.map((x) => x.monster).sort((a, b) => a.salary - b.salary)[0]; if (!pick) break; const r = F.signFreeAgent(f, pick.id); if (!r.ok) { problems.push(`season ${s}: free agency ${r.reason}`); break; } }
    for (const role of ['head_coach', 'off_coord', 'def_coord', 'head_scout', 'monster_trainer']) if (!f.staff?.[role]) F.hireDefaultStaff(f);
    // save round-trip at the season boundary
    const back = Save.importJson(Save.exportJson(f)); if (!back) problems.push(`season ${s}: save round-trip failed`); else if (JSON.stringify(back.roster) !== JSON.stringify(f.roster)) problems.push(`season ${s}: save round-trip changed the roster`);
    onSeason?.(f, s);
    if (s < seasons) { const n = F.startNextSeason(f); if (!n.ok) { problems.push(`season ${s}: next season blocked (${n.reason})`); break; } problems.push(...check(f, `season ${s + 1} start`)); }
  }
  return { f, problems, log };
}

if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  const t0 = Date.now(); let bad = 0; const agg = { franchises: 0, seasons: 0, fired: 0, titles: 0, encounters: 0, encounterWins: 0, signed: 0, pregame: 0, pregameWins: 0, ot: 0, otWins: 0, problems: 0 };
  for (let i = 0; i < N; i++) {
    const seed = SEED0 + i; const difficulty = DIFFS[i % DIFFS.length];
    const { problems, log } = runFranchise(seed, { difficulty });
    agg.franchises++; agg.seasons += log.seasons.length; agg.fired += log.fired ? 1 : 0; agg.titles += log.seasons.filter((x) => x.champion === x.club).length;
    for (const k of Object.keys(log.clash)) agg[k] += log.clash[k];
    agg.problems += problems.length; if (problems.length) bad++;
    if (!quiet || problems.length) console.log(`seed ${seed} ${difficulty}: ${log.seasons.map((x) => `${x.w}-${x.l}`).join(' ')}${log.fired ? ' (fired)' : ''}${problems.length ? `\n  PROBLEMS (${problems.length}):\n  ${[...new Set(problems)].slice(0, 12).join('\n  ')}` : ''}`);
  }
  console.log(JSON.stringify({ ...agg, encounterWinPct: agg.encounters ? Math.round(agg.encounterWins / agg.encounters * 100) : null, ms: Date.now() - t0 }));
  process.exit(bad ? 1 : 0);
}
