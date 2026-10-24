// Developer-only shortcut for private test builds (GDD §42.10): play whole seasons headlessly so a Season-20 retirement can
// be reached on a phone in minutes. Available only when BUILD.test is true, which no released build sets. It uses the game's
// own public functions (the same ones the headless soak uses), so a season played this way is a real season.

import * as F from './franchise.js';
import { ROSTER_MAX, ROSTER_MIN, monsterOverall } from '../data/monsters.js';
import { BUILD } from '../version.js';
import { isArchived, mayStartSeason } from './lifecycle.js';

export const shortcutsEnabled = () => BUILD.test === true;
const bestProspect = (f) => { const d = f.draft; const cls = (d?.class || []).filter((m) => (d.available || []).includes(m.id)); return cls.sort((a, b) => monsterOverall(b) - monsterOverall(a))[0] || null; };

/** Play the current season to its end and settle the offseason (contracts, draft, free agents, staff), without starting the next. */
export function fastForwardSeason(f) {
  if (!shortcutsEnabled()) return { ok: false, reason: 'Developer shortcuts are off in this build.' };
  if (isArchived(f)) return { ok: false, reason: 'This franchise is an archive.' };
  if (F.needsGoal(f)) { const g = F.commissionerGoals(f); F.chooseGoal(f, g[0]?.id); }
  let guard = 0;
  while (!f.season.finished && guard++ < 80) {
    if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); continue; }
    if (f.week.commissioner) { const c = f.week.commissioner; const id = c.names?.[0]; const r = id ? F.commissionerRelease(f, id) : { ok: false }; if (!r.ok) return { ok: false, reason: `Commissioner review: ${r.reason}` }; continue; }
    const ar = F.autoRunToSunday(f); if (!ar.ok && f.season.day < 6) return { ok: false, reason: `The week could not be run: ${ar.reason}` };
    if (F.isBye(f)) { F.takeBye(f); continue; }
    const m = F.sundayMatchup(f); if (!m) return { ok: false, reason: 'No matchup.' };
    if (m.forfeit) { F.forfeitSunday(f); continue; }
    const game = F.simulatePlayerGame(f); if (!game?.finished) return { ok: false, reason: 'The game did not finish.' };
    F.finishSunday(f, game);
  }
  if (!f.season.finished) return { ok: false, reason: 'The season did not finish.' };
  while (f.scenes?.length) F.dismissScene(f);
  if (F.isFired(f)) return { ok: true, fired: true };
  if (f.postseason && !f.postseason.resolved) { const ev = F.postseasonEvent(f); if (ev) F.resolvePostseason(f, ev.options[0].id); }
  if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  for (const i of F.offseasonPending(f)) { const r = F.resolveContract(f, i.id, 'sign'); if (!r.ok) F.resolveContract(f, i.id, 'walk'); }
  if (mayStartSeason(f).ok) { // the offseason steps a next season would need; at the cap the career is complete and they are left alone
    const b = F.beginDraft(f); if (b.ok) { let dg = 0; while (!f.draft.done && dg++ < 80) { if (F.onTheClock(f) === f.club) { const best = bestProspect(f); const r = best && f.roster.length < ROSTER_MAX ? F.myDraftPick(f, best.id) : F.passDraftPick(f); if (!r.ok) F.passDraftPick(f); } else break; } }
    let fa = 0; while (f.roster.length < ROSTER_MIN && fa++ < 20) { const mk = F.offseasonMarket(f); const pick = mk.map((x) => x.monster).sort((a, b) => a.salary - b.salary)[0]; if (!pick) break; if (!F.signFreeAgent(f, pick.id).ok) break; }
    for (const role of ['head_coach', 'off_coord', 'def_coord', 'head_scout', 'monster_trainer']) if (!f.staff?.[role]) F.hireDefaultStaff(f);
  }
  while (f.scenes?.length) F.dismissScene(f);
  return { ok: true, fired: false };
}
/** Settle this season and play `n` more, stopping at the cap or when fired. Returns { ok, played, stoppedBecause }. */
export function fastForwardSeasons(f, n) {
  if (!shortcutsEnabled()) return { ok: false, reason: 'Developer shortcuts are off in this build.' };
  let played = 0;
  for (let i = 0; i < n; i++) {
    if (!f.season.finished) { const r = fastForwardSeason(f); if (!r.ok) return { ok: false, played, reason: r.reason }; played++; if (r.fired) return { ok: true, played, stoppedBecause: 'fired' }; }
    const next = F.startNextSeason(f); if (!next.ok) return { ok: true, played, stoppedBecause: next.cap ? 'cap' : next.reason };
    const r = fastForwardSeason(f); if (!r.ok) return { ok: false, played, reason: r.reason }; played++; if (r.fired) return { ok: true, played, stoppedBecause: 'fired' };
  }
  return { ok: true, played, stoppedBecause: null };
}
