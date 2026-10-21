// Beast Clash Phase 1: every tunable number in one versioned, frozen configuration.
// Each group is tagged so the Clash Lab can show what is approved, what is provisional
// (a Gate A baseline that the owner decides on at Gate B) and what is experimental
// (a switch that is OFF unless the Lab turns it on). Changing a number here changes
// CLASH_VALUES.version, so a replay key always names the numbers it was played under.
// This file imports nothing.

const deepFreeze = (o) => { for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v); return Object.freeze(o); };

export const CLASH_VALUES = deepFreeze({
  version: '1.0.0',
  engineVersion: 'p1.1',

  // ---- approved
  archetypes: { tag: 'approved',
    Tank:      { hp: 1.36, atk: 0.82, spd: -2, guard: 0.88 },
    Striker:   { hp: 0.82, atk: 1.25, spd: 2, guard: 1, shieldBreak: 2 },
    Support:   { hp: 1.00, atk: 0.75, spd: 0, guard: 1 },
    Disruptor: { hp: 0.95, atk: 1.00, spd: 1, guard: 1, pierce: true },
    Balanced:  { hp: 1.05, atk: 1.05, spd: 0, guard: 1 },
  },
  stats: { tag: 'approved', hpBase: 28, hpPerOverall: 0.85, atkBase: 6, atkPerOverall: 0.22, spdBase: 50, spdPerOverall: 0.05, tiltDiv: 250, tiltMin: 0.92, tiltMax: 1.08, spdTiltDiv: 4, spdTiltMax: 3 },
  types: { tag: 'approved', strong: 1.05, weak: 0.952 },
  damage: { tag: 'approved', spreadMin: 0.9, spreadMax: 1.1, dazeMult: 0.75, initiativeTie: 2 },
  conditions: { tag: 'approved',
    duration: 3, severity: { shock: 3, burn: 2, daze: 2, chill: 1 },
    burnPerExchange: 0.06, chillSpeed: 0.7, immunityExchanges: 1, shockImmunityExchanges: 2,
    healAfflicted: 0.7, healBruised: 0.75, bruiseExchanges: 2,
  },
  battle: { tag: 'approved', exchangeCap: 30, maxPerSide: 5, minPerSide: 1 },
  tiebreak: { tag: 'approved', rule: 'hp_share', exactTie: 'seeded_coin' },
  suddenDeath: { tag: 'provisional',
    E: { from: 12, step: 0.15, cap: 2.25, sides: [1, 2, 3] },
    F: { from: 12, step: 0.25, cap: 4.0, sides: [4, 5] },
  },
  swaps: { tag: 'approved', forcedEvery: 3, voluntaryEvery: 4, defensiveHp: 0.30, noForceOnFirstExchange: true },
  // Approved archetype bands: a move cannot leave its archetype quietly (validated in tests).
  bands: { tag: 'approved',
    Striker: { mult: [1.3, 1.5] }, Balanced: { mult: [1.3, 1.3], surge: [1.25, 1.4] }, Tank: { shield: [0.16, 0.26] },
    Support: { heal: [0.06, 0.18] }, Disruptor: { chance: [0.7, 0.9], shockChance: [0.40, 0.45] },
  },
  support: { tag: 'approved', every: 2 },

  // ---- provisional (Gate A baselines; owner decides at Gate B)
  shock: { tag: 'provisional', chance: [0.40, 0.45], every: 2 },
  backRow: { tag: 'provisional', default: 'E',
    tests: {
      A: { label: 'A: current system', maxPerSide: Infinity, chanceSmall: 0.6, chanceBig: 0.6, swapHit: 0.8, every: 1 },
      B: { label: 'B: bench Disruptors act every second exchange', maxPerSide: Infinity, chanceSmall: 0.6, chanceBig: 0.6, swapHit: 0.8, every: 2 },
      C: { label: 'C: one bench Disruptor action per side', maxPerSide: 1, chanceSmall: 0.6, chanceBig: 0.6, swapHit: 0.8, every: 1 },
      D: { label: 'D: bench chance 30%, swap hit 0.4x', maxPerSide: Infinity, chanceSmall: 0.3, chanceBig: 0.3, swapHit: 0.4, every: 1 },
      E: { label: 'E: one bench Disruptor attempt per side per exchange, bench chance scaled to the bench, swap hit 0.5x', maxPerSide: 1, chanceSmall: 0.6, chanceBig: 0.35, swapHit: 0.5, every: 1, count: 'attempts' },
      E2: { label: 'E2: as E, but the limit counts landed actions (the scratch prototype\'s reading: others keep trying until one lands)', maxPerSide: 1, chanceSmall: 0.6, chanceBig: 0.35, swapHit: 0.5, every: 1, count: 'landed' },
    } },
  duration: { tag: 'provisional', default: 'F',
    models: {
      F: { label: 'Model F baseline: no healing reduction' },
      R2: { label: 'R2: healing and shields shrink with the sudden-death multiplier' },
      C6: { label: 'C6 stalemate rule: from exchange 12, no knockout for 5 exchanges halves healing and shields; for 9, quarters them', from: 12, halfAfter: 5, quarterAfter: 9, half: 0.5, quarter: 0.25 },
    } },

  // ---- experimental (OFF by default; the Lab switches them on for comparison only)
  experiments: { tag: 'experimental',
    O1: { label: 'O1: in 4-5 per side, a team\'s second and later heals in one exchange are 60% strength', on: false, minPerSide: 4, laterHeal: 0.6 },
    O2: { label: 'O2: in 4-5 per side, Tanks get +6% battle HP', on: false, minPerSide: 4, tankHp: 1.06 },
  },

  // ---- pure calculators (P1 formula; no franchise hook in Phase 1)
  xp: { tag: 'provisional', model: 'C2', perBattle: 9, floor: 0.4, share: 0.6, weights: { dealt: 0.45, taken: 0.30, support: 0.15, kos: 0.10 },
    win: 1.15, loss: 0.85, gapPerOverall: 0.02, gapMin: 0.85, gapMax: 1.35, diminishing: [1, 0.8, 0.6, 0.45, 0.35, 0.25, 0.2], starterRate: 1 / 3 },
  load: { tag: 'provisional', monday: 8, battle: 5, opening: 5, overtime: 6, practice: 8, game: 21, bye: 50, saturdayBase: 28, saturdayExtra: 0.4,
    sundayInjury: { base: 0.012, perFatigue: 0.03, perDurability: 0.03 }, battleInjury: { base: 0.0025, perFatigue: 0.005 },
    warning: { caution: 30, high: 50 }, maxBattles: 7 },
});

export const TAG_LABEL = Object.freeze({ approved: 'Approved', provisional: 'Provisional (Gate B decides)', experimental: 'Experimental (off by default)' });

/** The configuration a battle runs under: the defaults above plus the Lab's chosen switches. Frozen. */
export function battleConfig(overrides = {}) {
  const v = CLASH_VALUES;
  const c = {
    backRow: overrides.backRow || v.backRow.default,
    duration: overrides.duration || v.duration.default,
    O1: !!overrides.O1, O2: !!overrides.O2,
    policies: Object.freeze({ a: overrides.policies?.a || 'none', b: overrides.policies?.b || 'none' }),
  };
  if (!v.backRow.tests[c.backRow]) throw new Error(`Unknown back-row test ${c.backRow}`);
  if (!v.duration.models[c.duration]) throw new Error(`Unknown duration model ${c.duration}`);
  return Object.freeze(c);
}

/** Which switches differ from the Gate A defaults, in words, for the Lab and the log. */
export function activeExperiments(config) {
  const out = [];
  if (config.backRow !== CLASH_VALUES.backRow.default) out.push(`Back row ${config.backRow}`);
  if (config.duration !== CLASH_VALUES.duration.default) out.push(`Duration ${config.duration}`);
  if (config.O1 && config.O2) out.push('O3 (O1 + O2)'); else if (config.O1) out.push('O1'); else if (config.O2) out.push('O2');
  return out;
}
