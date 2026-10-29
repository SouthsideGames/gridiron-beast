#!/usr/bin/env node
// Save compatibility on the released trading build (Task 5.5, diagnostic only). Imports existing franchise exports (older builds included),
// checks the league invariants, then plays them forward with the game's own functions, the way tools/franchise-soak.mjs does: through the
// Week 8 trade deadline, the end of the season, the offseason (contracts, draft, free agency, AI–AI trades) and into the next season.
// After every week: invariants, no AI–AI deal dated after week 8, no offer to the owner alive after week 8, and the trade calendar.
// Works on in-memory copies; the export files are only read.
//   node tools/save-compat-check.mjs SAVE.json [SAVE2.json ...] [--root=DIR] [--json=out.json]
import fs from 'node:fs';
import path from 'node:path';
const argv = process.argv.slice(2); const files = argv.filter((a) => !a.startsWith('--')); const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v = '1'] = a.slice(2).split('='); return [k, v]; }));
const ROOT = path.resolve(opt.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const F = await import(path.join(ROOT, 'src/franchise/franchise.js')); const Save = await import(path.join(ROOT, 'src/franchise/save.js'));
const { leagueInvariants, withBoardReset } = await import(path.join(ROOT, 'tools/league-soak.mjs'));
const { ROSTER_MAX, ROSTER_MIN, monsterOverall } = await import(path.join(ROOT, 'src/data/monsters.js'));
const check = withBoardReset((f, where) => (F.hasLeague(f) ? leagueInvariants(f, where) : []));

function playWeek(f, problems, label) {
  if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); return; }
  if (f.week.commissioner) { const id = f.week.commissioner.names?.[0]; const r = id ? F.commissionerRelease(f, id) : { ok: false }; if (!r.ok) problems.push(`${label}: commissioner dead end`); return; }
  const ar = F.autoRunToSunday(f); if (!ar.ok && f.season.day < 6) { problems.push(`${label}: auto-run stuck (${ar.reason})`); return; }
  if (F.isBye(f)) { F.takeBye(f); return; }
  const m = F.sundayMatchup(f); if (!m) { problems.push(`${label}: no matchup`); return; }
  if (m.forfeit) { F.forfeitSunday(f); return; }
  const g = F.simulatePlayerGame(f); if (!g?.finished) { problems.push(`${label}: game did not finish`); return; }
  F.finishSunday(f, g);
}
function offseasonAndNext(f, problems) {
  if (f.postseason && !f.postseason.resolved) { const ev = F.postseasonEvent(f); F.resolvePostseason(f, ev.options[0].id); }
  if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  for (const i of F.offseasonPending(f)) { const r = F.resolveContract(f, i.id, 'sign'); if (!r.ok) F.resolveContract(f, i.id, 'walk'); }
  const b = F.beginDraft(f); if (!b.ok) { problems.push(`draft would not start (${b.reason})`); return false; }
  let g = 0; while (!f.draft.done && g++ < 80) { if (F.onTheClock(f) === f.club) { const d = f.draft; const best = (d.class || []).filter((m) => d.available.includes(m.id)).sort((a, c) => monsterOverall(c) - monsterOverall(a))[0]; const r = best && f.roster.length < ROSTER_MAX ? F.myDraftPick(f, best.id) : F.passDraftPick(f); if (!r.ok) F.passDraftPick(f); } else break; }
  let fa = 0; while (f.roster.length < ROSTER_MIN && fa++ < 20) { const mk = F.offseasonMarket(f); const pick = mk.map((x) => x.monster).sort((a, c) => a.salary - c.salary)[0]; if (!pick) break; if (!F.signFreeAgent(f, pick.id).ok) break; }
  for (const role of ['head_coach', 'off_coord', 'def_coord', 'head_scout', 'monster_trainer']) if (!f.staff?.[role]) F.hireDefaultStaff(f);
  const n = F.startNextSeason(f); if (!n.ok) { problems.push(`next season blocked (${n.reason})`); return false; }
  return true;
}

const results = [];
for (const file of files) {
  const res = { file: path.basename(file), problems: [], deadline: { aiDealsAfterWeek8: 0, offersAliveAfterWeek8: 0 }, calendar: [] };
  try {
    const raw = fs.readFileSync(file, 'utf8'); const f = Save.importJson(raw); if (!f) throw new Error('import returned nothing');
    res.loaded = { year: f.season.year, week: f.season.week, finished: !!f.season.finished, league: F.hasLeague(f) };
    res.problems.push(...check(f, 'loaded'));
    if (F.tradeWindow) res.calendar.push({ at: `loaded y${f.season.year} w${f.season.week}`, ...(({ phase, desk, calls, aiAi }) => ({ phase, desk, calls, aiAi }))(F.tradeWindow(f)) });
    const dealsBefore = (f.league?.trades || []).length; let seasonsCrossed = 0;
    for (let step = 0; step < 40 && seasonsCrossed < 2; step++) {
      if (f.season.finished) { if (!offseasonAndNext(f, res.problems)) break; seasonsCrossed++; res.problems.push(...check(f, `season ${f.season.year} start`)); if (F.tradeWindow) res.calendar.push({ at: `start y${f.season.year}`, ...(({ phase, desk, calls, aiAi }) => ({ phase, desk, calls, aiAi }))(F.tradeWindow(f)) }); if (seasonsCrossed >= 2) break; continue; }
      if (F.needsGoal(f)) { const g = F.commissionerGoals(f); F.chooseGoal(f, g[0]?.id); }
      playWeek(f, res.problems, `y${f.season.year} w${f.season.week}`);
      res.problems.push(...check(f, `y${f.season.year} w${f.season.week}`));
      const w = f.season.week; if (!f.season.finished && w > 8 && F.tradeCall?.(f)) res.deadline.offersAliveAfterWeek8++;
      if (F.tradeWindow && !f.season.finished && (w === 8 || w === 9)) res.calendar.push({ at: `y${f.season.year} w${w}`, ...(({ phase, desk, calls, aiAi }) => ({ phase, desk, calls, aiAi }))(F.tradeWindow(f)) });
    }
    const deals = (f.league?.trades || []).slice(dealsBefore); res.deadline.aiDealsAfterWeek8 = deals.filter((t) => t.week > 8).length; res.deals = { total: deals.length, inSeason: deals.filter((t) => t.week > 0).length, weeks: deals.map((t) => t.week) };
    const back = Save.importJson(Save.exportJson(f)); res.roundTrip = !!back && JSON.stringify(back.league || null) === JSON.stringify(f.league || null) && JSON.stringify(back.roster) === JSON.stringify(f.roster);
    res.ended = { year: f.season.year, week: f.season.week };
  } catch (e) { res.error = String(e?.stack || e).split('\n').slice(0, 3).join(' | '); }
  res.ok = !res.error && !res.problems.length && !res.deadline.aiDealsAfterWeek8 && !res.deadline.offersAliveAfterWeek8 && res.roundTrip !== false;
  results.push(res); console.log(`${res.ok ? 'ok  ' : 'FAIL'} ${res.file}: loaded ${JSON.stringify(res.loaded)} -> ${JSON.stringify(res.ended)}, deals ${res.deals?.total ?? '?'} (in season ${res.deals?.inSeason ?? '?'}), problems ${res.problems.length}${res.error ? ' ERROR ' + res.error : ''}`);
}
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(results, null, 1));
process.exit(results.every((r) => r.ok) ? 0 : 1);
