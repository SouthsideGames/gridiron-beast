// The AI clubs' shared roster plan (Task 6 Phase B; owner's Group 3 decisions R1 / D15, R6, approved 2026-10-30; GDD §56).
// Pure rules over observable facts: ratings, ages, potential and the PUBLIC decline onset (never the hidden longevity). Nothing is
// stored and nothing draws a random number; the plan is derived wherever an AI roster decision reads it (contracts, cap trims,
// the draft, trade valuation), so it always reflects the moves already made that offseason.
//
//   gap        a starting group's mean overall minus the league mean of starters at that position (D15, position-relative).
//              Weak at −4 or worse, severe at −8 or worse.
//   horizon    a starter's public decline onset minus his age. "Ageing" at 2 or less (or past his onset).
//   successor  for each starter (the most ageing first), the best unassigned backup at the position who is aged 26 or under (or at
//              least 4 years younger than the starter) and within 8 overall of him, or whose potential reaches the starter's overall.
//              Ready when within 4. Protected (legendary, signature) monsters are never successors; ageless starters never age.
//   needs      succession 2: an ageing starter with no successor; succession 1: a successor who is not ready while the starter's
//              horizon is 1 or less; weakness: from the gap (0 above −4, up to 1 at −8).
import { monsterOverall } from '../data/monsters.js';
import { publicOnset } from '../data/aging.js';
import { GROUP_SLOTS } from './roster.js';

export const PLAN = Object.freeze({ weakGap: -4, severeGap: -8, ageingHorizon: 2, successorAge: 26, successorYounger: 4, successorWithin: 8, readyWithin: 4 });
/** R6 (T3): the designated successor's role share in his club's roster worth, by the horizon of the starter he succeeds (was 0.45). */
export const SUCCESSOR_SHARE = Object.freeze({ near: 0.8, mid: 0.6, far: 0.45 });
export const successorShare = (horizon) => (horizon <= PLAN.ageingHorizon ? SUCCESSOR_SHARE.near : horizon <= 4 ? SUCCESSOR_SHARE.mid : SUCCESSOR_SHARE.far);

const isAgelessMonster = (m) => !!(m?.legendary || m?.signature);
const isProtectedMonster = (m) => !!(m?.legendary || m?.signature);
const slotsOf = (pos) => GROUP_SLOTS[pos]?.length || 1;
const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

/** Seasons until the public decline onset (negative past it); ageless monsters never get there. */
export const horizonOf = (m) => (isAgelessMonster(m) || m?.age == null ? Infinity : publicOnset(m) - m.age);
export const isAgeing = (m) => horizonOf(m) <= PLAN.ageingHorizon;

/** Can backup `b` succeed starter `st`? Young enough and close enough (now, or by his potential). */
export function qualifiesAsSuccessor(b, st, ovrOf = monsterOverall) {
  if (!b || !st || b === st || isProtectedMonster(b)) return false;
  const young = (b.age ?? 99) <= PLAN.successorAge || (st.age ?? 0) - (b.age ?? 99) >= PLAN.successorYounger; if (!young) return false;
  const so = ovrOf(st); return ovrOf(b) >= so - PLAN.successorWithin || (b.potential || 0) >= so;
}

/**
 * One position group: its starters (the first `slots` of `list`, already ordered best first) and their successors among the rest.
 * Returns [{ starter, horizon, successor, ready }] in starter order.
 */
export function groupSuccession(list, slots, ovrOf = monsterOverall) {
  const starters = list.slice(0, slots), backups = list.slice(slots); const taken = new Set();
  const rows = starters.map((st) => ({ starter: st, horizon: horizonOf(st), successor: null, ready: false }));
  for (const row of rows.slice().sort((a, b) => a.horizon - b.horizon)) { // the most ageing starter chooses first
    const b = backups.find((x) => !taken.has(x.id) && qualifiesAsSuccessor(x, row.starter, ovrOf)); if (!b) continue;
    taken.add(b.id); row.successor = b; row.ready = ovrOf(b) >= ovrOf(row.starter) - PLAN.readyWithin;
  }
  return rows;
}

/** The league benchmark: the mean overall of the starters at each position across `rosters` (each club's best `slots` there). */
export function leagueBench(rosters, ovrOf = monsterOverall) {
  const acc = {}; for (const pos of Object.keys(GROUP_SLOTS)) acc[pos] = [];
  for (const roster of rosters) {
    const by = {}; for (const m of roster || []) (by[m.position] ||= []).push(m);
    for (const [pos, list] of Object.entries(by)) if (acc[pos]) acc[pos].push(...list.map(ovrOf).sort((a, b) => b - a).slice(0, slotsOf(pos)));
  }
  return Object.fromEntries(Object.entries(acc).map(([pos, v]) => [pos, mean(v)]));
}

/**
 * The roster plan of one club. `bench`: leagueBench(...). `starters` (optional): the ids on the club's depth chart; without it the
 * best `slots` at each position start. Returns { groups: { pos: { gap, weak, severe, rows, successionNeed, weakNeed } },
 * successors: Map backupId → { starterId, horizon, ready }, readyFor: Set of starter ids with a ready successor }.
 */
export function rosterPlan(roster, bench = null, { starters = null, ovrOf = monsterOverall } = {}) {
  const by = {}; for (const m of roster) (by[m.position] ||= []).push(m);
  const groups = {}; const successors = new Map(); const readyFor = new Set();
  for (const pos of Object.keys(GROUP_SLOTS)) {
    const n = slotsOf(pos);
    const list = (by[pos] || []).slice().sort((a, b) => (starters ? (starters.has(b.id) - starters.has(a.id)) : 0) || (ovrOf(b) - ovrOf(a)) || (a.id < b.id ? -1 : 1));
    const rows = groupSuccession(list, n, ovrOf);
    const q = mean(rows.map((r) => ovrOf(r.starter)));
    const gap = q == null || bench?.[pos] == null ? (q == null ? -99 : 0) : q - bench[pos];
    let successionNeed = 0;
    for (const r of rows) {
      if (r.successor) { successors.set(r.successor.id, { starterId: r.starter.id, horizon: r.horizon, ready: r.ready }); if (r.ready) readyFor.add(r.starter.id); }
      if (r.horizon <= PLAN.ageingHorizon && !r.successor) successionNeed = 2;
      else if (r.successor && !r.ready && r.horizon <= 1) successionNeed = Math.max(successionNeed, 1);
    }
    const missing = Math.max(0, n - rows.length);
    const weakNeed = missing ? 1 : gap <= PLAN.weakGap ? Math.min(1, 0.5 + 0.5 * (PLAN.weakGap - gap) / (PLAN.weakGap - PLAN.severeGap)) : 0;
    groups[pos] = { gap, weak: gap <= PLAN.weakGap, severe: gap <= PLAN.severeGap, rows, successionNeed, weakNeed,
      settled: gap >= 0 && rows.length >= n && rows.every((r) => r.horizon > PLAN.ageingHorizon) && rows.some((r) => r.successor) };
  }
  return { groups, successors, readyFor };
}

/** R7: the draft-score adjustment the plan gives a prospect at `pos`: +4 succession need (+2 at level 1), up to +3 weak, −3 settled. */
export const DRAFT_NEED = Object.freeze({ succession: 4, successionSoon: 2, weakMax: 3, settled: -3 });
export function draftNeedBonus(plan, pos) {
  const g = plan?.groups?.[pos]; if (!g) return 0;
  const succ = g.successionNeed >= 2 ? DRAFT_NEED.succession : g.successionNeed === 1 ? DRAFT_NEED.successionSoon : 0;
  const weak = DRAFT_NEED.weakMax * g.weakNeed;
  return succ + weak + (g.settled && !succ && !weak ? DRAFT_NEED.settled : 0);
}
