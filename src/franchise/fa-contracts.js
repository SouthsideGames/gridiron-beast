// Task 7 — shared contract accounting (specification "Offers and contracts"; audit resolutions 1 and 6, owner 2026-10-31).
//
// Money is whole credits. Offer controls move in OFFER_STEP (100) credits. A contract covers one, two or three league years at a fixed
// salary; a signing bonus is divided into integer yearly allocations, the remainder one credit at a time to the earliest years, so
// the allocations always sum to the bonus. A monster's cap charge in a league year is his salary plus that year's allocation, carried
// by whichever club holds him: a trade keeps the contract and its remaining schedule (the departing club's future charges simply stop),
// a release or retirement ends every future charge (no dead cap, no refund). Pre-Task-7 contracts ({signed, ends, years}, salary on the
// monster) read as bonus-free contracts and keep their salary exactly. Protected permanent deals (gym legendaries, the rival's
// signature) keep their existing treatment (owner decision D1): exempt from an AI club's cap.
const isProtected = (m) => !!(m && (m.legendary || m.signature)); // league-registry.js isProtected (kept local: the registry imports this file)

export const OFFER_STEP = 100;
export const MAX_YEARS = 3;
export const MIN_YEARS = 1;
/** Round a money figure to the offer step (whole credits, 100s). */
export const toStep = (v) => Math.max(0, Math.round((Number(v) || 0) / OFFER_STEP) * OFFER_STEP);
export const clampYears = (y) => Math.max(MIN_YEARS, Math.min(MAX_YEARS, Math.round(Number(y) || 1)));

/** Integer yearly allocations of a bonus: floor share each year, the remainder +1 to the earliest years (resolution 1). */
export function allocateBonus(bonus, years) {
  const b = Math.max(0, Math.round(Number(bonus) || 0)); const n = clampYears(years);
  const base = Math.floor(b / n); const rem = b - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

/** A Task 7 contract record. `start`: the first league year it covers. */
export function makeContract({ start, years, salary, bonus = 0, id = null, kind = 'fa', rookie = false }) {
  const n = clampYears(years);
  const c = { signed: start, ends: start + n - 1, years: n, salary: Math.round(salary), bonus: Math.round(bonus || 0), alloc: allocateBonus(bonus || 0, n), kind, t7: 1 };
  if (id) c.id = id; if (rookie) c.rookie = true;
  return c;
}
/** The salary a contract pays per league year (old contracts carry it on the monster). */
export const contractSalary = (m, c = m?.contract) => (c && c.salary != null ? c.salary : (m?.salary || 0));

/** Which deal covers league year `year`: the running contract, or an extension signed to follow it. */
export function contractFor(m, year) {
  const c = m?.contract; if (!c || c.permanent) return c || null;
  if (year >= (c.signed ?? -Infinity) && year <= (c.ends ?? Infinity)) return c;
  const x = c.next; if (x && year >= x.signed && year <= x.ends) return x;
  return null;
}
/** Bonus allocation charged in `year` by contract `c`. */
export const allocIn = (c, year) => (c?.alloc && c.signed != null ? (c.alloc[year - c.signed] || 0) : 0);

/**
 * A monster's cap charge in league year `year` for the club that holds him. `current`: the year being played or about to be played,
 * where a monster without a running deal (a founding or legacy record) still counts his salary, as every build before Task 7 did.
 */
export function capCharge(m, year, { current = false, exemptProtected = false } = {}) {
  if (!m) return 0;
  if (m.contract?.permanent) return exemptProtected && isProtected(m) ? 0 : (current ? (m.salary || 0) : 0);
  const c = contractFor(m, year);
  if (!c) return current ? (m.salary || 0) : 0;
  return contractSalary(m, c) + allocIn(c, year);
}
/** The bonus part of `capCharge` (what pre-Task-7 payroll sums leave out). */
export function bonusCharge(m, year) { const c = contractFor(m, year); return c && !c.permanent ? allocIn(c, year) : 0; }

/** Every future league year a contract still pays: [{ year, salary, bonus, total }]. */
export function contractSchedule(m, fromYear) {
  const out = []; const c = m?.contract; if (!c || c.permanent) return out;
  for (const k of [c, c.next].filter(Boolean)) for (let y = Math.max(fromYear, k.signed); y <= k.ends; y++) { const s = contractSalary(m, k); const b = allocIn(k, y); out.push({ year: y, salary: s, bonus: b, total: s + b }); }
  return out;
}
/** The schedule must balance: allocations sum to the bonus and match the years. */
export function scheduleProblems(c) {
  if (!c || c.permanent || !c.t7) return [];
  const p = [];
  if (c.alloc.length !== c.years) p.push('allocation count differs from years');
  if (c.alloc.reduce((s, x) => s + x, 0) !== c.bonus) p.push('allocations do not sum to the bonus');
  if (c.ends - c.signed + 1 !== c.years) p.push('years do not match the term');
  if (c.alloc.some((x) => !Number.isInteger(x) || x < 0)) p.push('non-integer allocation');
  for (let i = 1; i < c.alloc.length; i++) if (c.alloc[i] > c.alloc[i - 1]) p.push('remainder not on the earliest years');
  if (c.next) { if (c.next.signed !== c.ends + 1) p.push('extension overlaps or leaves a gap'); p.push(...scheduleProblems(c.next)); }
  return p;
}
/** First-year cap charge of an offer, reserved while it is pending (resolution: salary + first-year allocation). */
export const reservationFor = (offer) => Math.round(offer.salary) + allocateBonus(offer.bonus || 0, offer.years)[0];
