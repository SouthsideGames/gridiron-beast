// Exact rational arithmetic for Task 8 balances (spec §4, §6, §15: "use exact fractional accounting internally"; "preserve exact
// fractions internally; display rounding does not change balances"). Training costs C (1–4), Temper efficiencies (2, 1, 0.5) and
// award fractions (25%, 6.25%, 2.5 points…) all have small denominators, so plain safe integers suffice. Every operation checks
// that results stay exact; an unsafe value throws rather than silently losing precision.
// A fraction is a frozen plain object { n, d } with d > 0 and gcd(n, d) = 1, so it serializes to JSON and back exactly.

const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const safe = (x, what) => { if (!Number.isSafeInteger(x)) throw new RangeError(`fraction ${what} is not a safe integer (${x})`); return x; };

/** frac(3) → 3/1, frac(1, 4) → 1/4. Decimals are converted exactly only when they are finite binary fractions (e.g. 0.5, 0.0625). */
export function frac(n, d = 1) {
  if (typeof n === 'object' && n !== null && 'n' in n) return n;
  if (!Number.isInteger(n) || !Number.isInteger(d)) {
    if (d !== 1) throw new TypeError('frac(n, d) needs integers');
    let den = 1, num = n; while (!Number.isInteger(num)) { num *= 2; den *= 2; if (den > 2 ** 30) throw new RangeError(`${n} is not an exact binary fraction; pass numerator and denominator`); }
    n = num; d = den;
  }
  if (d === 0) throw new RangeError('fraction denominator 0');
  if (d < 0) { n = -n; d = -d; }
  const g = gcd(n, d); return Object.freeze({ n: safe(n / g, 'numerator'), d: safe(d / g, 'denominator') });
}
export const ZERO = frac(0); export const ONE = frac(1);
export const add = (a, b) => { a = frac(a); b = frac(b); return frac(safe(a.n * b.d + b.n * a.d, 'sum'), safe(a.d * b.d, 'denominator')); };
export const sub = (a, b) => { b = frac(b); return add(a, frac(-b.n, b.d)); };
export const mul = (a, b) => { a = frac(a); b = frac(b); return frac(safe(a.n * b.n, 'product'), safe(a.d * b.d, 'denominator')); };
export const div = (a, b) => { b = frac(b); if (b.n === 0) throw new RangeError('division by zero'); return mul(a, frac(b.d, b.n)); };
export const cmp = (a, b) => { a = frac(a); b = frac(b); const x = a.n * b.d, y = b.n * a.d; return x < y ? -1 : x > y ? 1 : 0; };
export const eq = (a, b) => cmp(a, b) === 0;
export const min = (a, b) => (cmp(a, b) <= 0 ? frac(a) : frac(b));
export const max = (a, b) => (cmp(a, b) >= 0 ? frac(a) : frac(b));
/** Whole part (toward −∞) and the remaining fraction in [0, 1). */
export const floor = (a) => { a = frac(a); return Math.floor(a.n / a.d); };
export const fracPart = (a) => sub(a, floor(a));
/** For display only. Never feed the result back into a balance. */
export const toNumber = (a) => { a = frac(a); return a.n / a.d; };
export const isFraction = (x) => !!x && typeof x === 'object' && Number.isSafeInteger(x.n) && Number.isSafeInteger(x.d) && x.d > 0 && gcd(x.n, x.d) === 1;
