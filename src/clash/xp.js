// Beast Clash Arena XP, Model C2: a pure calculator. Nothing here awards XP; Phase 2b will.
// Labels: P1 formula. Imports only values.
import { CLASH_VALUES } from './values.js';

const X = CLASH_VALUES.xp;

/**
 * XP earned by each monster on `side` ('a'|'b') from one battle result.
 * share c: how much of the side's damage dealt, damage taken, support and knockouts this monster produced,
 * weighted 0.45 / 0.30 / 0.15 / 0.10 and scaled so an even share is 1. gap: +2% per point the opponents'
 * average overall exceeds the monster's, clamped 0.85-1.35.
 */
export function battleXp(result, side) {
  const L = result.lines[side], O = result.lines[side === 'a' ? 'b' : 'a']; const n = L.length;
  const tot = (k) => L.reduce((s, x) => s + x.stats[k], 0) || 1; const kos = L.reduce((s, x) => s + x.stats.kos, 0);
  const won = result.winner === side; const oppAvg = O.reduce((s, x) => s + x.combatant.overall, 0) / O.length;
  const out = {};
  for (const x of L) {
    const w = X.weights;
    const c = n * (w.dealt * x.stats.dealt / tot('dealt') + w.taken * x.stats.taken / tot('taken') + w.support * x.stats.support / tot('support') + w.kos * (kos ? x.stats.kos / kos : 1 / n));
    const gap = Math.max(X.gapMin, Math.min(X.gapMax, 1 + X.gapPerOverall * (oppAvg - x.combatant.overall)));
    out[x.id] = Math.round(X.perBattle * (X.floor + X.share * c) * (won ? X.win : X.loss) * gap * 100) / 100;
  }
  return out;
}

/** Diminishing returns across a session: battle k (1-based) earns this share. */
export function diminishing(k) { return X.diminishing[Math.min(X.diminishing.length, Math.max(1, k)) - 1]; }

/**
 * The previous-game starter rule. A monster earns one-third Arena XP only if the club's last Sunday was
 * played and the monster's last-start stamp names that club and that Sunday. Anything else: full rate.
 * lastSunday: { seq, kind: 'played'|'forfeit'|'bye' } ; lastStart: { club, seq } | null
 */
export function starterRate({ club, lastSunday, lastStart }) {
  if (!lastSunday || lastSunday.kind !== 'played' || !lastStart) return 1;
  return lastStart.club === club && lastStart.seq === lastSunday.seq ? X.starterRate : 1;
}

/** Credit for a whole session: battle results in order, each monster's raw XP x diminishing x starter rate. */
export function sessionXp(results, side, { club = null, lastSunday = null, lastStart = {} } = {}) {
  const total = {};
  results.forEach((r, i) => { const xp = battleXp(r, side); for (const [id, v] of Object.entries(xp)) { const mid = r.lines[side].find((x) => x.id === id).combatant.monsterId; total[mid] = (total[mid] || 0) + v * diminishing(i + 1) * starterRate({ club, lastSunday, lastStart: lastStart[mid] || null }); } });
  for (const k of Object.keys(total)) total[k] = Math.round(total[k] * 100) / 100;
  return total;
}
