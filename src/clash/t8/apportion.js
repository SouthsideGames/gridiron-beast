// Beast Clash t8 (M4 S5): the §9 whole-HP transfer rules, pinned as pure functions with fixtures (tests/clash/t8-primitives.test.js).
//
// Root Communion (NAT-06-C; spec §9): "simultaneous bounded whole-HP apportionment, conserve total living HP before healing
// reductions, each living recipient >= 1 and <= maxHP, fractional ties stableID. Healing reductions apply only to gains; lost gains are
// not redistributed. Pin the exact apportionment algorithm with fixtures rather than independent per-recipient rounding."
// Algorithm (the pinned one): p = sum(current) / sum(max); target_i = p * max_i; take floor(target_i) each, clamped to [1, max_i];
// hand out the remaining whole HP (total - sum of floors) one at a time to the members with the largest fractional remainder, ties by
// stable id, never above max; if the floors already exceed the total (the >= 1 bound forced it), take HP back from the largest
// allocations, ties by stable id, never below 1. The result conserves the total exactly. Gains are then reduced per recipient by its
// Healing Reduced factor and floored (lost healing is gone; donors are not refunded).
//
// Mind Mend (PSY-01-C; spec §9): "floor percentage donation, bound by target missingHP and source currentHP-1, debit and intended
// credit equal whole amount. Then apply recipient healing reduction and floor actual gain; prevented healing is lost, no refund."

/** @param members [{ id, hp, maxHp, healFactor = 1 }] (living only, stable order) -> [{ id, before, target, after, gain, lost }] */
export function apportionHp(members) {
  const total = members.reduce((s, m) => s + m.hp, 0); const maxTotal = members.reduce((s, m) => s + m.maxHp, 0);
  if (!members.length || maxTotal <= 0) return [];
  const p = total / maxTotal;
  const rows = members.map((m) => { const exact = p * m.maxHp; const base = Math.min(m.maxHp, Math.max(1, Math.floor(exact))); return { id: m.id, before: m.hp, maxHp: m.maxHp, exact, alloc: base, frac: exact - Math.floor(exact), healFactor: m.healFactor ?? 1 }; });
  let diff = total - rows.reduce((s, r) => s + r.alloc, 0);
  const byFrac = [...rows].sort((a, b) => b.frac - a.frac || a.id.localeCompare(b.id));
  while (diff > 0) { let moved = false; for (const r of byFrac) { if (diff <= 0) break; if (r.alloc < r.maxHp) { r.alloc += 1; diff -= 1; moved = true; } } if (!moved) break; }
  const byAlloc = () => [...rows].sort((a, b) => b.alloc - a.alloc || a.id.localeCompare(b.id));
  while (diff < 0) { let moved = false; for (const r of byAlloc()) { if (diff >= 0) break; if (r.alloc > 1) { r.alloc -= 1; diff += 1; moved = true; } } if (!moved) break; }
  return rows.map((r) => {
    const target = r.alloc; const rawGain = target - r.before;
    if (rawGain <= 0) return { id: r.id, before: r.before, target, after: target, gain: rawGain, lost: 0 };
    const gain = Math.floor(rawGain * r.healFactor); return { id: r.id, before: r.before, target, after: r.before + gain, gain, lost: rawGain - gain };
  });
}

/** Mind Mend donation: { donation, credit, gain, lost } or null when no positive donation is affordable. */
export function mindMendDonation({ sourceHp, sourceMaxHp, pct, targetHp, targetMaxHp, healFactor = 1 }) {
  const donation = Math.min(Math.floor((sourceMaxHp * pct) / 100), targetMaxHp - targetHp, Math.max(0, sourceHp - 1));
  if (donation <= 0) return null;
  const gain = Math.floor(donation * healFactor);
  return { donation, credit: donation, gain, lost: donation - gain };
}
