// Retirement (Task 6 Phase A-1; GDD §55.3–§55.5; owner's Group 1 decisions of 2026-10-30). Offseason only: decided when the
// offseason opens (at the season's end, before contracts, the draft and free agency), so the owner learns of a retirement while
// he can still answer it. Permanent. The same rules for the owner's monsters, the AI clubs' monsters and unsigned monsters
// (unsigned retire at twice the odds). Legendary monsters and the rival's signature monster never retire.
//
// Exits use the existing paths: an AI monster leaves his club with the reason "retired" (league-registry removeFromClub), then
// the league (league.js leaveLeague: a decorated one keeps a legend stub); a career-record leader and every former monster of the
// owner's also keep a stub, so the record books, careers and News still resolve. Draws: the franchise generator, in a fixed order
// (clubs in league order, monsters by id), one draw per monster with a non-zero chance.
import { monsterOverall } from '../data/monsters.js';
import { trueOnset, publicOnset, retireChance, injuryClass, transitionSeason, transitionRamp, transitionClubCap, CAREER_AFTER_ONSET, NEAR_PEAK, DECLINED, forecast, careerStage } from '../data/aging.js';
import { hasLeague, leagueClubs, clubRoster, removeFromClub, isAgeless, isProtected, legendStub, leagueEvent, moveIdentity } from './league-registry.js';
import { isDecorated, honoursLine } from './league.js';
import { buildDepthChart } from './roster.js';
import * as IH from './injury-history.js';
import { universeCareerLeaders } from './league-careers.js';
import { addEvent } from './career.js';

export const AGING_VERSION = 1;
/** A franchise born under these rules: no transition. */
export const nativeAging = () => ({ v: AGING_VERSION, native: true });
/** A save made before these rules meets them at its first offseason under this build: the transition starts that year. */
export function ensureAging(f, year) { if (!f.aging) f.aging = { v: AGING_VERSION, from: year }; return f.aging; }

/** Last season's injuries for one monster, from the Injury History record (GDD §50): the single class the retirement roll uses. */
export function injuryOf(f, m, year) {
  if (!IH.isTracking(f)) return { severe: false, weeksLost: 0, chronic: false };
  const recs = IH.recordsOf(f, m.id).filter((r) => r.y === year && r.src !== 'before');
  const severe = recs.some((r) => r.sev === 'Severe' || (r.missed || 0) >= 4);
  const weeksLost = recs.reduce((s, r) => s + (r.missed || 0), 0);
  const chronic = IH.injurySummary(f, m.id)?.indicator === 'high';
  return { severe, weeksLost, chronic };
}
/** What `offseason()` needs for this franchise and season: the transition season and last season's severe injuries. */
export function agingContext(f, year) {
  // an old save loaded after its season ended meets the decline first: treat it as the transition's first season without
  // starting the clock, which starts at its first retirement pass (so the hazard ramp begins at a quarter, as designed)
  return { s: f.aging ? transitionSeason(f, year) : 1, severeOf: (m) => injuryOf(f, m, year).severe };
}

/** Career-high overall, kept current at every season end (the retirement roll compares today's overall with it). */
export function notePeaks(f) {
  const all = [...(f.roster || [])];
  if (hasLeague(f)) for (const c of leagueClubs(f)) all.push(...clubRoster(f, c));
  for (const m of all) { const o = monsterOverall(m); if (!(m.peakOvr >= o)) m.peakOvr = o; }
}

/** One monster's chance this offseason, at the age he would play next season. */
export function chanceFor(f, m, { year, starter, unsigned = false, s = null }) {
  const ovr = monsterOverall(m); const peak = Math.max(m.peakOvr || 0, ovr);
  const y = (m.age + 1) - (trueOnset(m) + CAREER_AFTER_ONSET);
  return retireChance(y, { starterNearPeak: !!starter && ovr >= peak - NEAR_PEAK, declinedReserve: !starter && !unsigned && ovr <= peak - DECLINED, unsigned, injury: injuryClass(injuryOf(f, m, year)), ramp: transitionRamp(s) });
}

/** The observable outlook the owner sees on a monster (no hidden longevity): career stage, retirement window, next-season risk. */
export function retirementOutlook(f, m, { starter = false } = {}) {
  if (isAgeless(m)) return null;
  const drop = m.physDrop || 0;
  const fc = forecast(m, { sawDecline: drop > 0, bigDrop: drop >= 4 && m.age <= publicOnset(m), chronic: IH.injurySummary(f, m.id)?.indicator === 'high', starterNearPeak: starter && monsterOverall(m) >= (m.peakOvr || 0) - NEAR_PEAK });
  return careerStage(m, fc);
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const startersOf = (roster, manual, depth) => new Set(Object.values(buildDepthChart(roster, manual, depth)).filter(Boolean));

/**
 * The retirement pass for the offseason that opens after season `year`. Returns { owner: [...], league: [...], unsigned: n }.
 * Writes `f.retirementsLast` (what the offseason screens and News show) and the owner's News lines.
 */
export function retirementPass(f, r, { year, news = null }) {
  ensureAging(f, year); notePeaks(f);
  const s = transitionSeason(f, year); const capShare = transitionClubCap(s);
  const out = { year, owner: [], league: [], unsigned: 0, transition: s };
  let leaders = null; const leaderIds = () => { if (leaders) return leaders; leaders = new Set(); for (const rows of Object.values(universeCareerLeaders(f, { n: 10 }))) for (const x of rows) leaders.add(x.id); return leaders; };
  const roll = (m, ctx) => { const p = chanceFor(f, m, { year, s, ...ctx }); return p > 0 && r.next() < p; };

  // the AI clubs
  if (hasLeague(f)) for (const club of leagueClubs(f).slice().sort()) {
    const roster = clubRoster(f, club).slice().sort(byId); const st = startersOf(roster); const cap = Math.ceil(capShare * roster.length); let n = 0;
    for (const m of roster) {
      if (isAgeless(m) || isProtected(m) || n >= cap) continue;
      if (!roll(m, { starter: st.has(m.id) })) continue;
      n++; const age = m.age; const ovr = monsterOverall(m); const starter = st.has(m.id);
      const gone = removeFromClub(f, club, m.id, { year, reason: 'retired', quiet: true }); if (!gone) continue;
      gone.retired = year; addEvent(gone, { k: `retired:${year}`, t: 'retired', y: year, c: club, x: { age } });
      const formerMine = (gone.history || []).some((h) => h.club === f.club);
      if (isDecorated(f, gone) || leaderIds().has(gone.id) || formerMine) f.league.legends[gone.id] = legendStub(gone, { year, club });
      // League News: a retirement always stands as a line, so only the ones that matter are reported (about 30 retire a season,
      // GDD §55.5): a decorated career, a starter, a 65+ monster or a former monster of the owner's; the rest are in the summary
      const honours = honoursLine(f, gone);
      if (honours || starter || ovr >= 65 || formerMine) leagueEvent(f, { kind: 'retire', club, honours, starter, ...moveIdentity(f, gone), age, ovr });
      out.league.push({ id: gone.id, name: gone.name, position: gone.position, age, ovr, club, starter });
    }
  }

  // the owner's roster
  {
    const roster = f.roster.slice().sort(byId); const st = startersOf(f.roster, f.lineupManual, f.depth); const cap = Math.ceil(capShare * roster.length); let n = 0;
    for (const m of roster) {
      if (isAgeless(m) || n >= cap) continue;
      if (!roll(m, { starter: st.has(m.id) })) continue;
      n++; const age = m.age; const ovr = monsterOverall(m); const seasons = m.yearsPro ?? null;
      f.roster = f.roster.filter((x) => x.id !== m.id);
      for (const [slot, mid] of Object.entries(f.lineupManual || {})) if (mid === m.id) delete f.lineupManual[slot];
      for (const [pos, ids] of Object.entries(f.depth || {})) if (Array.isArray(ids) && ids.includes(m.id)) f.depth[pos] = ids.filter((x) => x !== m.id);
      (m.history ||= []).push({ club: f.club, from: m.contract?.signed || m.joined?.year || year, to: year, reason: 'retired' });
      m.contract = null; m.retired = year;
      addEvent(m, { k: `retired:${year}`, t: 'retired', y: year, c: f.club, x: { age, owner: 1 } });
      if (hasLeague(f)) { f.league.legends[m.id] = legendStub(m, { year, club: f.club, honours: [] }); leagueEvent(f, { kind: 'retire', club: f.club, honours: honoursLine(f, m), starter: st.has(m.id), ...moveIdentity(f, m), age, ovr, formerMine: true }); }
      out.owner.push({ id: m.id, name: m.name, position: m.position, age, ovr, seasons, starter: st.has(m.id) });
      news?.(`${m.name} (${m.position}, ${ovr} OVR) retires at ${age}${seasons ? ` after ${seasons} season${seasons === 1 ? '' : 's'}` : ''}. Retirement is final: plan the draft and free agency around it.`, 'roster');
    }
  }

  // unsigned monsters: the regional pools and the league's waivers (twice the odds)
  const leave = (m) => { m.retired = year; const last = m.history?.[m.history.length - 1]?.club || null; if (hasLeague(f) && (isDecorated(f, m) || leaderIds().has(m.id) || (m.history || []).some((h) => h.club === f.club))) f.league.legends[m.id] = legendStub(m, { year, club: last }); out.unsigned++; };
  for (const region of Object.keys(f.pool || {}).sort()) { const list = f.pool[region]; for (const m of list.slice().sort(byId)) { if (isAgeless(m) || !roll(m, { starter: false, unsigned: true })) continue; list.splice(list.indexOf(m), 1); leave(m); } }
  if (hasLeague(f)) { const w = f.league.waivers || []; for (const m of w.slice().sort(byId)) { if (isAgeless(m) || !roll(m, { starter: false, unsigned: true })) continue; w.splice(w.indexOf(m), 1); leave(m); } }

  const notable = out.league.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 3);
  f.retirementsLast = { year, owner: out.owner, league: out.league.length, unsigned: out.unsigned, notable, transition: s };
  const total = out.league.length + out.owner.length + out.unsigned;
  if (total) news?.(`Retirements: ${total} monster${total === 1 ? '' : 's'} retired this offseason${notable.length ? `, among them ${notable.map((x) => `${x.name} (${x.club}, ${x.age})`).join(', ')}` : ''}.`, 'info');
  return out;
}
