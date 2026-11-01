// Prospect development (Task 6 Phase C; owner's Group 4 decisions C1 / D12 and GM slots, approved 2026-10-30; GDD §57).
//
//   C1 development slots  Up to DEV.slots reserves per club (at most DEV.perPosition at one position) practise with the first team.
//                         Eligible: a reserve (not on the depth chart), aged 25 or under, healthy, with potential at least overall + 3.
//                         After each completed game every slotted monster gains DEV.share × the base game XP (24): no win or stat
//                         bonus, no fatigue or injury roll, the club's XP slowdown still applies, the existing level-ups. A monster who
//                         earned starter XP in that game gets no practice XP for it. No random draw except the existing level-up.
//   Priority              The roster plan's designated successors first (the most urgent succession first), then the largest gap
//                         between potential and overall. AI clubs fill their slots by it; the owner's are filled by it too, and the
//                         owner may reassign them (manual picks persist until changed or until the monster becomes ineligible).
// Derived each game from the roster; the only stored state is the owner's `f.devSlots` ({ manual: [ids], excluded: [ids] }),
// an additive field (absent: every slot automatic).
import { xpForLevel, levelUp, monsterOverall, tryEvolve } from '../data/monsters.js';
import { rosterPlan } from './roster-plan.js';
import { GROUP_SLOTS } from './roster.js';

export const DEV = Object.freeze({ slots: 6, perPosition: 2, maxAge: 25, minHeadroom: 3, share: 0.35, baseXp: 24 });

/** Why a monster cannot hold a development slot now, or null when he can. `starters`: the ids on the club's depth chart. */
export function devIneligibility(m, starters) {
  if (!m) return 'gone';
  if (starters?.has(m.id)) return 'starter';
  if ((m.age ?? 99) > DEV.maxAge) return 'age';
  if (m.injury) return 'injured';
  if ((m.potential || 0) < monsterOverall(m) + DEV.minHeadroom) return 'ceiling';
  return null;
}
export const DEV_REASON = Object.freeze({ gone: 'is no longer on the roster', starter: 'is now a starter and develops by playing', age: 'is past 25', injured: 'is injured', ceiling: 'is within 3 of his potential' });

/** Eligible monsters in priority order: successors first (most urgent first), then potential minus overall. */
export function devPriority(roster, starters) {
  const plan = rosterPlan(roster, null, { starters });
  const elig = roster.filter((m) => !devIneligibility(m, starters));
  const key = (m) => { const s = plan.successors.get(m.id); return [s ? 0 : 1, s ? s.horizon : 0, -((m.potential || 0) - monsterOverall(m)), m.id]; };
  return elig.map((m) => ({ m, k: key(m) })).sort((a, b) => { for (let i = 0; i < 4; i++) { if (a.k[i] < b.k[i]) return -1; if (a.k[i] > b.k[i]) return 1; } return 0; }).map((x) => x.m);
}

/**
 * The slots for a club. `manual` ids are placed first (if still eligible), then the priority order fills the rest, skipping
 * `excluded`; at most DEV.perPosition per position and DEV.slots in all. Returns { ids, auto: Set, dropped: [{ id, reason }] }:
 * `dropped` are manual picks that are no longer eligible.
 */
export function selectDevSlots(roster, starters, { manual = [], excluded = [] } = {}) {
  const byId = new Map(roster.map((m) => [m.id, m])); const ids = []; const count = {}; const dropped = []; const auto = new Set();
  const take = (m) => { if (ids.length >= DEV.slots || ids.includes(m.id) || (count[m.position] || 0) >= DEV.perPosition) return false; ids.push(m.id); count[m.position] = (count[m.position] || 0) + 1; return true; };
  for (const id of manual) { const m = byId.get(id); const why = devIneligibility(m, starters); if (why) { dropped.push({ id, reason: why }); continue; } take(m); }
  const skip = new Set(excluded);
  for (const m of devPriority(roster, starters)) { if (skip.has(m.id)) continue; if (take(m)) auto.add(m.id); }
  return { ids, auto, dropped };
}

/** Practice XP after a completed game for the monsters in `ids` who did not play (`played`: the ids that earned starter XP). */
export function practiceAfterGame(roster, ids, played, rng, { xpScale = 1, autoSpend = true, autoEvolve = true } = {}) {
  const events = []; const byId = new Map(roster.map((m) => [m.id, m]));
  const amount = Math.round(DEV.share * DEV.baseXp * xpScale);
  if (amount <= 0) return events;
  for (const id of ids) {
    const m = byId.get(id); if (!m || played.has(id) || m.injury) continue;
    m.xp = (m.xp || 0) + amount; const startLevel = m.level;
    while (m.xp >= xpForLevel(m.level)) {
      m.xp -= xpForLevel(m.level); const before = monsterOverall(m);
      levelUp(m, rng, { autoSpend });
      events.push({ kind: 'levelup', id: m.id, name: m.name, level: m.level, from: before, to: monsterOverall(m), practice: true });
      if (autoEvolve) { const evo = tryEvolve(m); if (evo) events.push(evo); }
    }
    events.push({ kind: 'practice', id: m.id, name: m.name, position: m.position, amount, level: m.level, levelsGained: m.level - startLevel, xp: m.xp, next: xpForLevel(m.level) });
  }
  return events;
}

/** The ids a depth chart puts on the field (the monsters who earn starter XP). */
export const playedIds = (chart) => new Set(Object.values(chart || {}).filter(Boolean));

// ---------------------------------------------------------------- C2 maturation
/** Position weights for maturation: the attributes the position uses most (the same table as the rival's signature growth). */
export function maturationTarget(m, weights) {
  const w = Object.entries(weights || {}).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  for (const [k] of w) if ((m.attributes[k] ?? 99) < Math.min(99, m.potential || 99)) return k;
  return null;
}
export const MATURATION_MAX_AGE = 24;
export { GROUP_SLOTS };
