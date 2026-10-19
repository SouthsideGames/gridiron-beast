// Contracts, the offseason and the free-agent pool (GDD §18.1).
//
// Every monster and every coach is on a two-year deal from the season it was
// signed. Salary is fixed for the deal: level-ups and attribute points raise
// what the monster will ask for next time, not what it costs today. All
// renewals happen in the offseason, before the next season can start.

import { salaryFor, monsterOverall, ROSTER_MIN, ROSTER_MAX } from '../data/monsters.js';
import { POSITION_WEIGHTS } from '../data/personnel.js';
import { staffById } from '../data/staff.js';
import { monsterLine } from './stats.js';

export const CONTRACT_YEARS = 2;
export const COUNTER_PCT = 0.85;
export const STAFF_RAISE = 1.10;

/** A fresh deal covering this season and the next. */
export function newContract(year, years = CONTRACT_YEARS) { years = Math.max(1, Math.min(CONTRACT_YEARS, years | 0)); return { signed: year, ends: year + years - 1, years }; }
export function contractEnds(m, year) { return !!m.contract && m.contract.ends <= year; }

/** What the monster asks for at renewal: today's market rate for their ratings plus a premium for a big season or a league award. */
/**
 * The monster as he would be with every banked attribute point spent (GDD §21.6): points go, one at a time, to the
 * attribute his position weighs most that is still below potential. Asks are priced on this, so holding points back
 * through a contract year and spending them after re-signing saves nothing.
 */
export function withBankedPoints(m) {
  const pts = m.points || 0; if (!pts) return m;
  const attrs = { ...m.attributes }; const w = Object.entries(POSITION_WEIGHTS[m.position] || POSITION_WEIGHTS.WR).sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < pts; i++) { const k = w.find(([a]) => attrs[a] < (m.potential || 99))?.[0]; if (!k) break; attrs[k] += 1; }
  return { ...m, attributes: attrs, points: 0 };
}
export function renewalAsk(m, { award = false, year = null } = {}) {
  const base = salaryFor(withBankedPoints(m));
  const L = monsterLine(m, 'season', 'reg');
  const big = (L.passYds || 0) >= 1500 || ((L.rushYds || 0) + (L.recYds || 0)) >= 900 || ((L.tackles || 0) + (L.assists || 0)) >= 50 || (L.sacks || 0) >= 8 || (L.int || 0) >= 4 || (L.fgm || 0) >= 12;
  let premium = 1;
  if (big) premium += 0.10;
  if (award) premium += 0.15;
  return { ask: Math.round(base * premium / 100) * 100, base, premium, big, award, current: m.salary || base };
}

/** Will the monster take a counter at 85%? Nature and the club's season decide; deterministic from the rng given. */
export function acceptsCounter(m, { winningRecord = false, rng }) {
  const calm = ['calm', 'patient', 'disciplined', 'sturdy', 'balanced', 'secure', 'protective', 'resistant', 'focused', 'cerebral'];
  const fiery = ['powerful', 'ferocious', 'aggressive', 'explosive', 'gifted'];
  let p = 0.5 + (winningRecord ? 0.2 : -0.1) + (calm.includes(m.nature) ? 0.15 : 0) - (fiery.includes(m.nature) ? 0.15 : 0);
  return rng.chance(Math.max(0.1, Math.min(0.9, p)));
}

/** Staff salary with the raises their renewals have earned. */
export function staffSalary(f, role) { const id = f.staff?.[role]; const base = staffById(id)?.salary || 0; return Math.round(base * (f.staffRaise?.[role] || 1)); }

/** Build the offseason book: expiring monster deals (with asks) and expiring coaches. */
export function openOffseason(f, { year, awardWinnerIds = new Set(), winningRecord = false }) {
  const items = [];
  for (const m of f.roster) if (contractEnds(m, year)) { const a = renewalAsk(m, { award: awardWinnerIds.has(m.id) }); items.push({ kind: 'monster', id: m.id, name: m.name, position: m.position, ovr: monsterOverall(m), current: m.salary, ask: a.ask, premium: a.premium, big: a.big, award: a.award, status: null }); }
  for (const [role, c] of Object.entries(f.staffContracts || {})) if (c && c.ends <= year && f.staff[role]) { const cur = staffSalary(f, role); items.push({ kind: 'staff', id: role, name: staffById(f.staff[role])?.name || role, role, current: cur, ask: Math.round(cur * STAFF_RAISE / 100) * 100, status: null }); }
  f.offseason = { year, items, winningRecord, done: false };
  return f.offseason;
}
export function offseasonPending(f) { return (f.offseason?.items || []).filter((i) => !i.status); }
export function offseasonReady(f) { return !f.offseason || offseasonPending(f).length === 0; }
