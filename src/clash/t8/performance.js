// Actual-benefit ledger. This never reads RNG or changes battle state.
const cap = (v) => Math.max(0, Math.min(1, v));
export function createPerformanceLedger() {
  const rows = new Map();
  const row = (id) => { if (!rows.has(id)) rows.set(id, { offense: [], defense: new Map(), support: new Map(), disruption: [] }); return rows.get(id); };
  return {
    offense(id, { hpDamage = 0, shieldDamage = 0, enemyMaxHp = 0, ko = false }) {
      if (enemyMaxHp > 0) row(id).offense.push(cap((hpDamage + .5 * shieldDamage) / (.2 * enemyMaxHp) + (ko ? .25 : 0)));
    },
    defense(id, action, target, prevented, maxHp) {
      if (!id || maxHp <= 0) return;
      const actions = row(id).defense; if (!actions.has(action)) actions.set(action, new Map());
      const recipients = actions.get(action), p = recipients.get(target) || { amount: 0, maxHp };
      p.amount += Math.max(0, prevented); recipients.set(target, p);
    },
    support(id, action, target, { healed = 0, maxHp, cleansed = false }) {
      if (!id || maxHp <= 0) return;
      const actions = row(id).support; if (!actions.has(action)) actions.set(action, new Map());
      const recipients = actions.get(action), p = recipients.get(target) || { healed: 0, maxHp, cleansed: false };
      p.healed += Math.max(0, healed); p.cleansed ||= cleansed; recipients.set(target, p);
    },
    control(id) { const xs = row(id).disruption; const index = xs.push(0) - 1; return () => { xs[index] = 1; }; },
    result() {
      return Object.fromEntries([...rows].map(([id, r]) => [id, {
        offense: [...r.offense],
        defense: [...r.defense.values()].map((rs) => { const ps = [...rs.values()]; return cap(ps.reduce((s, p) => s + p.amount, 0) / (.25 * ps.reduce((s, p) => s + p.maxHp, 0))); }),
        // Equal recipient weights, with heal and cleanse sharing the recipient's cap.
        support: [...r.support.values()].map((rs) => { const ps = [...rs.values()]; return ps.reduce((s, p) => s + (p.cleansed ? 1 : cap(p.healed / (.15 * p.maxHp))), 0) / ps.length; }),
        disruption: [...r.disruption],
      }]));
    },
  };
}
