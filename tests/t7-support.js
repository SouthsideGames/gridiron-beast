// Task 7 test support: older flows reach the draft through free agency (Periods 1–5 come before it, specification §5).
import * as F from '../src/franchise/franchise.js';
/** Run this offseason's free agency to its end (hands-off: no owner offers) when the franchise is in a Task 7 offseason. */
export function t7FA(f) { if (F.task7Offseason(f) && f.season?.finished && !F.freeAgencyDone(f)) { const o = F.openFreeAgency(f); if (o.ok) F.finishFreeAgency(f); } return f; }
/** Hands-off owner: sign from the market (immediate negotiation, cheapest first, his counter accepted) up to the roster minimum. */
export function t7FillToMin(f) {
  if (!F.task7Offseason(f) || !F.freeAgencyDone(f)) return f; const tried = new Set();
  for (let g = 0; f.roster.length < F.ROSTER_MIN && g < 80; g++) { const e = F.freeAgentMarket(f).filter((x) => !tried.has(x.monster.id)).sort((a, b) => a.ask.salary - b.ask.salary || (a.monster.id < b.monster.id ? -1 : 1))[0]; if (!e) break; tried.add(e.monster.id); let r = F.negotiateFreeAgent(f, e.monster.id, e.ask); if (r.ok && r.outcome === 'countered') r = F.negotiateFreeAgent(f, e.monster.id, r.counter); }
  return f;
}
