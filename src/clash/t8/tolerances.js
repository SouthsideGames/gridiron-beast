// Beast Clash t8: the FROZEN B12 probability tolerance table (spec §21 B12; REMAINING_DECISIONS.md §B12).
// "Each probability's tolerance and sample size are frozen before testing, with N = 3.29^2 x p(1 - p) / h^2. Pass if |observed - p| <= h,
// with h = 0.02 to 0.05, or 25% relative at very small p." Guaranteed behaviour is tested exactly, never statistically.
//
// Frozen 2026-11-08 at M4 S2, BEFORE any probability test of the t8 engine was written or run. A row may be ADDED before the first test
// of its probability; an existing row is never loosened after a test has run. Rows for the ability probabilities (Heat Mirage, Shadow
// Pounce, Mind Game, Snowbank Shot, Eclipse Call and their P8-halved variants) are added before their batches (S9, S11).
const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object' && !Object.isFrozen(v)) deepFreeze(v); return Object.freeze(o); };

/** B12 sample size for probability p and tolerance h (rounded up to a whole number of trials). */
export const b12SampleSize = (p, h) => Math.ceil((3.29 * 3.29 * p * (1 - p)) / (h * h));

const row = (id, p, h, source) => ({ id, p, h, n: b12SampleSize(p, h), source, frozen: '2026-11-08 (M4 S2)' });

export const B12_TOLERANCES = deepFreeze([
  // STA-07 / spec §10: "Confused defaults to 25% redirect of an eligible normal attack". h = 0.02 (the tight end of the approved range).
  row('confused-redirect', 0.25, 0.02, 'spec §10; Appendix B STA-07 (25% per eligible normal attack)'),
  // Added 2026-11-09 at M4 S7, before the first Snowbank Shot probability test: ICE-03-C "80% LAUNCH accuracy check first".
  { ...row('snowbank-launch', 0.8, 0.03, 'ICE-03-C (80% launch accuracy)'), frozen: '2026-11-09 (M4 S7)' },
  // Added 2026-11-09 at M4 S9, before any batch D probability test (N7b P10 values and the FIR-05-C diversion chances).
  ...[[30, 0], [35, 1], [40, 2], [45, 3]].map(([pc, t]) => ({ ...row(`heat-mirage-t${t}`, pc / 100, 0.03, `FIR-05-C diversion ${pc}% (mastery tier ${t})`), frozen: '2026-11-09 (M4 S9)' })),
  { ...row('shadow-pounce-umbrikit', 0.15, 0.02, 'DAR-01-C explicit dodge 15% (Umbrikit; N7b P10)'), frozen: '2026-11-09 (M4 S9)' },
  { ...row('shadow-pounce-obscurat', 0.2, 0.02, 'DAR-01-C explicit dodge 20% (Obscurat; N7b P10)'), frozen: '2026-11-09 (M4 S9)' },
  { ...row('mind-game-afterimage', 0.15, 0.02, 'PSY-05-C afterimage miss 15% (N7b P10)'), frozen: '2026-11-09 (M4 S9)' },
  // Added 2026-11-09 at M4 S11, before any Eclipse Call test: DAR-05-C application chance 60 / 70 / 80 / 90% by mastery.
  ...[[60, 0], [70, 1], [80, 2], [90, 3]].map(([pc, t]) => ({ ...row(`eclipse-call-t${t}`, pc / 100, 0.03, `DAR-05-C application chance ${pc}% (mastery tier ${t})`), frozen: '2026-11-09 (M4 S11)' })),
]);

export function toleranceFor(id) { const t = B12_TOLERANCES.find((r) => r.id === id); if (!t) throw new Error(`No frozen B12 tolerance for ${id}`); return t; }
