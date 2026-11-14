// The repair owner for long studies (Task 10; first used in the Task 7 All-Star investigation, tools/task7-allstar-record.mjs).
// A hands-off owner manages nothing, so over many seasons his roster runs out of a position and every game is forfeited 0-21.
// That is not how the game is played (the lineup safeguard stops a real player before kickoff), and it hands every other club
// free wins. The repair owner is the hands-off owner plus the one thing the lineup warning asks of a player: before a game, for
// each open starting slot, sign the cheapest legal healthy free agent at that position, releasing a spare reserve when the
// roster is full or the cap has no room. He uses only the game's own public functions and nothing a player could not do.
// He does not train, trade, draft differently or set a lineup. GDD §59.10: his results are a separate diagnostic line, never a
// replacement for the hands-off benchmark owner.
//   import { repairOwner } from './study-owner.mjs';  const stats = {}; runFranchise(seed, { beforeGame: (f) => repairOwner(f, stats) })
import * as F from '../src/franchise/franchise.js';
import * as E from '../src/franchise/fa-engine.js';
import * as RO from '../src/franchise/roster.js';
import { positionOf } from '../src/data/personnel.js';
import { monsterOverall, ROSTER_MAX } from '../src/data/monsters.js';

const ROSTER_FLOOR = 26;
/** Open starting slots of the owner's club right now (the game's own lineup check). */
export const openSlots = (f) => RO.lineupProblems(f.roster, RO.buildDepthChart(f.roster, f.lineupManual, f.depth));
/** Repair the owner's lineup before a game. `stats` collects { signed, released, failed, why[] }. Returns true when no slot is open. */
export function repairOwner(f, stats = {}) {
  stats.signed ||= 0; stats.released ||= 0; stats.failed ||= 0;
  for (let k = 0; k < 6; k++) {
    const probs = openSlots(f); if (!probs.length) return true; const pos = positionOf(probs[0]);
    const starters = () => new Set(Object.values(RO.buildDepthChart(f.roster, f.lineupManual, f.depth)).filter(Boolean));
    const counts = () => { const c = {}; for (const m of f.roster) c[m.position] = (c[m.position] || 0) + 1; return c; };
    if (f.roster.length >= ROSTER_MAX) { const st = starters(); const cnt = counts();
      const spare = f.roster.filter((m) => !st.has(m.id) && m.position !== pos && cnt[m.position] > (RO.GROUP_SLOTS[m.position]?.length || 1) + 1).sort((a, b) => monsterOverall(a) - monsterOverall(b))[0];
      if (!spare || !F.releaseMonster(f, spare.id).ok) { stats.failed++; return false; } stats.released++; }
    const room = E.capView(f, f.club).usable; let done = false;
    for (const x of F.freeAgentMarket(f).filter((x) => x.monster.position === pos && !x.monster.injury).sort((a, b) => a.ask.salary - b.ask.salary)) {
      if (x.ask.salary > room) continue;
      let r = F.negotiateFreeAgent(f, x.monster.id, x.ask); if (r.ok && r.outcome === 'countered') r = F.negotiateFreeAgent(f, x.monster.id, r.counter);
      if (r.ok && r.outcome === 'signed') { stats.signed++; done = true; break; } }
    if (done) continue;
    // a player would free cap by releasing his best-paid spare reserve (no dead cap) and try again
    const market = F.freeAgentMarket(f).filter((x) => x.monster.position === pos && !x.monster.injury);
    if ((stats.why ||= []).length < 12) stats.why.push({ year: f.season?.year, week: f.season?.week, pos, room, market: market.length, cheapest: market.map((x) => x.ask.salary).sort((a, b) => a - b)[0] ?? null, roster: f.roster.length });
    const st = starters(); const cnt = counts();
    const rich = f.roster.filter((m) => !st.has(m.id) && m.position !== pos && cnt[m.position] > (RO.GROUP_SLOTS[m.position]?.length || 1)).sort((a, b) => (b.salary || 0) - (a.salary || 0))[0];
    if (!market.length || !rich || f.roster.length <= ROSTER_FLOOR || !F.releaseMonster(f, rich.id).ok) { stats.failed++; return false; } stats.released++;
  }
  return !openSlots(f).length;
}
/**
 * The same care in the offseason, when the market is at its largest: every position holds at least as many monsters as it has
 * starting slots. In season the free-agent pool is small and often has nobody at a position (seed 3, season 9: no linebacker
 * among ten free agents), so a need left open in the offseason cannot be repaired later. Call from runFranchise's onOffseason.
 */
export function repairOffseason(f, stats = {}) {
  stats.offSigned ||= 0; stats.offFailed ||= 0;
  for (const [pos, slots] of Object.entries(RO.GROUP_SLOTS)) {
    for (let k = 0; k < 4; k++) {
      const have = f.roster.filter((m) => m.position === pos).length; if (have >= slots.length) break;
      if (f.roster.length >= ROSTER_MAX) { const cnt = {}; for (const m of f.roster) cnt[m.position] = (cnt[m.position] || 0) + 1;
        const spare = f.roster.filter((m) => m.position !== pos && cnt[m.position] > (RO.GROUP_SLOTS[m.position]?.length || 1) + 1).sort((a, b) => monsterOverall(a) - monsterOverall(b))[0];
        if (!spare || !F.releaseMonster(f, spare.id).ok) { stats.offFailed++; break; } stats.released = (stats.released || 0) + 1; }
      const room = E.capView(f, f.club).usable; let done = false;
      for (const x of F.freeAgentMarket(f).filter((x) => x.monster.position === pos && !x.monster.injury).sort((a, b) => a.ask.salary - b.ask.salary)) {
        if (x.ask.salary > room) continue;
        let r = F.negotiateFreeAgent(f, x.monster.id, x.ask); if (r.ok && r.outcome === 'countered') r = F.negotiateFreeAgent(f, x.monster.id, r.counter);
        if (r.ok && r.outcome === 'signed') { stats.offSigned++; done = true; break; } }
      if (!done) { stats.offFailed++; if ((stats.offWhy ||= []).length < 12) stats.offWhy.push({ year: f.season?.year, pos, have, need: slots.length, room, market: F.freeAgentMarket(f).filter((x) => x.monster.position === pos).length }); break; }
    }
  }
}
/** Forfeits in a finished season of the owner's schedule (from the saved history). */
export const forfeitsIn = (h) => (h?.schedule || []).filter((g) => g.result?.forfeit).length;
