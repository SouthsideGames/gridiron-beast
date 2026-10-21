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
    // Gate B.1 investigation switches (owner-authorised for testing only; every default is the Gate B baseline)
    swapCost: { label: 'Voluntary swap cost', default: 'action', options: { action: 'the swap uses the side\'s action (current rule)', half: 'the incoming monster still acts, at half damage', free: 'the incoming monster acts normally' } },
    sdFromE: { label: 'Model E sudden-death start (1-3 per side)', default: 12, options: [12, 15, 18, 99] },
  },
  // Gate B.1 candidate move patches: named, reversible overrides of one species' move, applied only when a battle's
  // config lists the patch id. Nothing here is live unless the owner adopts it into clash-moves.js.
  movePatches: { tag: 'experimental',
    wispira_veil_every3: { species: 'shadewisp', label: 'Mirage Veil every third exchange (was every second)', changes: { trigger: { kind: 'every', n: 3 } } },
    wispira_veil_self: { species: 'shadewisp', label: 'Mirage Veil shields the front ally only (was the most hurt)', changes: { target: 'front' } },
    duskyre_cut_13: { species: 'duskrunner', label: 'Vanishing Cut 1.3x (was 1.4x), keeps the dodge', changes: { mult: 1.3 } },
    duskyre_no_dodge: { species: 'duskrunner', label: 'Vanishing Cut 1.4x without the dodge', changes: { dodgeNext: false } },
    galyx_updraft_14: { species: 'windlynx', label: 'Updraft heals 14% (was 17.3%)', changes: { heal: 0.14 } },
    florant_shade_14: { species: 'leafhorn', label: 'Canopy Shade heals 14% (was 17.2%), brace unchanged', changes: { heal: 0.14 } },
    nyxshade_daze_70: { species: 'nyxshade', label: 'Night Veil Daze chance 70% (was 87.4%)', changes: { chance: 0.70 } },
    zephiro_tailwind_every2: { species: 'zephyr', label: 'Tailwind every second exchange (was every fourth), +10% for 3', changes: { trigger: { kind: 'every', n: 2 } } },
    zephiro_tailwind_15: { species: 'zephyr', label: 'Tailwind +15% for 3 exchanges (was +10%), every fourth', changes: { rally: { bonus: 0.15, exchanges: 3 } } },
    zephiro_tailwind_heal: { species: 'zephyr', label: 'Tailwind also heals every ally 6% (was 0)', changes: { heal: 0.06 } },
    elderoot_grove_09: { species: 'elderoot', label: 'Ancient Grove heals every ally 9% (was 6%)', changes: { heal: 0.09 } },
    coglet_gearshot_11: { species: 'gearwing', label: 'Gear Shot: steady roll and strikes at 1.1x (was 1.0x)', changes: { kind: 'surge', mult: 1.1, trigger: { kind: 'always' } } },
    tsunarok_undertow_hit: { species: 'tsunarok', label: 'Undertow: the dragged monster takes a 0.5x arrival hit (was none)', changes: { hit: true } },
    tsunarok_undertow_every1: { species: 'tsunarok', label: 'Undertow attempts every exchange (was every second)', changes: { trigger: { kind: 'every', n: 1 } } },
    cerebrix_foresight_hit: { species: 'cerebrix', label: 'Foresight: the pulled-in monster takes a 0.5x arrival hit (was none)', changes: { hit: true } },
    aeralis_downdraft_hit: { species: 'skywarden', label: 'Downdraft: the swapped-in monster takes a 0.5x arrival hit (was none)', changes: { hit: true } },
    // round two (after the first before/after pass)
    wispira_veil_every4: { species: 'shadewisp', label: 'Mirage Veil every fourth exchange', changes: { trigger: { kind: 'every', n: 4 } } },
    duskyre_cut_every3: { species: 'duskrunner', label: 'Vanishing Cut every third strike (was every second), 1.4x with the dodge', changes: { trigger: { kind: 'every', n: 3 } } },
    florant_shade_every3: { species: 'leafhorn', label: 'Canopy Shade every third exchange (was every second)', changes: { trigger: { kind: 'every', n: 3 } } },
    zephiro_tailwind_every2_heal: { species: 'zephyr', label: 'Tailwind every second exchange, +10% for 3, and heals every ally 6%', changes: { trigger: { kind: 'every', n: 2 }, heal: 0.06 } },
    zephiro_tailwind_every2_15: { species: 'zephyr', label: 'Tailwind every second exchange, +15% for 3 (no heal)', changes: { trigger: { kind: 'every', n: 2 }, rally: { bonus: 0.15, exchanges: 3 } } },
    zephiro_tailwind_combo: { species: 'zephyr', label: 'Tailwind every second exchange, +15% for 3, and heals every ally 6%', changes: { trigger: { kind: 'every', n: 2 }, heal: 0.06, rally: { bonus: 0.15, exchanges: 3 } } },
    elderoot_grove_12: { species: 'elderoot', label: 'Ancient Grove heals every ally 12% (was 6%)', changes: { heal: 0.12 } },
    coglet_gearshot_heavy: { species: 'gearwing', label: 'Gear Shot: every second strike hits 1.3x, and its strikes never roll below full', changes: { kind: 'heavy', trigger: { kind: 'every', n: 2 }, mult: 1.3 } },
    cerebrix_foresight_hit_every1: { species: 'cerebrix', label: 'Foresight every exchange (was every second) with a 0.5x arrival hit', changes: { hit: true, trigger: { kind: 'every', n: 1 } } },
    lumini_mend_10: { species: 'glimmer', label: 'Glow Mend heals the two most hurt allies 10% each (was 7%)', changes: { heal: 0.10 } },
    zippit_charge_40: { species: 'flicker', label: 'Spark Charge: +40% on the front ally\'s next strike (was +25%)', changes: { charge: 0.40 } },
    nocturne_eclipse_2: { species: 'nocturne', label: 'Eclipse: the whole line is Dazed for two exchanges (was one)', changes: { duration: 2 } },
    scorchulk_maul_first: { species: 'cinderclaw', label: 'Cinder Maul may strike first again (the never-first clause removed)', changes: { neverFirst: false } },
    // Gate B.2 redesign candidates
    coglet_gearshot_pierce: { species: 'gearwing', label: 'Gear Shot: steady roll, and its strikes ignore Tank guard (pierce)', changes: { pierce: true } },
    coglet_gearshot_break: { species: 'gearwing', label: 'Gear Shot: steady roll, and its strikes strip shields at double rate (armour-breaking)', changes: { breakAlways: 2 } },
    coglet_gearshot_pierce_break: { species: 'gearwing', label: 'Gear Shot: steady roll, pierce and double shield-break', changes: { pierce: true, breakAlways: 2 } },
    coglet_gearshot_heavy_break: { species: 'gearwing', label: 'Gear Shot: every second strike hits 1.3x and strips shields at double rate; strikes never roll below full', changes: { kind: 'heavy', trigger: { kind: 'every', n: 2 }, mult: 1.3, breakAlways: 2 } },
    coglet_gearshot_heavy_pierce: { species: 'gearwing', label: 'Gear Shot: every second strike hits 1.3x and ignores Tank guard; strikes never roll below full', changes: { kind: 'heavy', trigger: { kind: 'every', n: 2 }, mult: 1.3, pierce: true } },
    // Gate B.3 (owner-authorised experiments): Coglet 1.4x exception, Undercurrent arrival-hit values, a distinct Downdraft
    coglet_gearshot_heavy14_break: { species: 'gearwing', label: 'Gear Shot: every second strike hits 1.4x (Balanced band exception) and strips shields at double rate; strikes never roll below full', changes: { kind: 'heavy', trigger: { kind: 'every', n: 2 }, mult: 1.4, breakAlways: 2 } },
    ripplet_undercurrent_065: { species: 'tidefin', label: 'Undercurrent: arrival hit 0.65x (was 0.5x from the back-row rule)', changes: { hit: true, hitMult: 0.65 } },
    ripplet_undercurrent_08: { species: 'tidefin', label: 'Undercurrent: arrival hit 0.8x (was 0.5x from the back-row rule)', changes: { hit: true, hitMult: 0.8 } },
    // Gate B.4 (owner-authorised): identity candidates for the eleven species without a demonstrated niche
    coglet_shieldbane: { species: 'gearwing', label: 'Gear Shot: strikes never roll below full; every strike hits 1.6x against a shielded foe (normal 1.0x otherwise) and strips shields at double rate', changes: { kind: 'surge', trigger: { kind: 'always' }, mult: 1.0, vsShield: 1.6, breakAlways: 2 } },
    coglet_heavy_vsshield: { species: 'gearwing', label: 'Gear Shot: every second strike 1.3x, or 1.8x against a shielded foe; double shield-break; steady roll', changes: { kind: 'heavy', trigger: { kind: 'every', n: 2 }, mult: 1.3, vsShield: 1.8, breakAlways: 2 } },
    coglet_shred: { species: 'gearwing', label: 'Gear Shot: every second strike 1.3x; its strikes strip shields at triple rate; steady roll', changes: { kind: 'heavy', trigger: { kind: 'every', n: 2 }, mult: 1.3, breakAlways: 3 } },
    coglet_pierce_shield: { species: 'gearwing', label: 'Gear Shot: every second strike 1.3x; half of every hit goes through shields; double shield-break; steady roll', changes: { kind: 'heavy', trigger: { kind: 'every', n: 2 }, mult: 1.3, breakAlways: 2, shieldPierce: 0.5 } },
    coglet_break_charge: { species: 'gearwing', label: 'Gear Shot: every second strike 1.3x; double shield-break; breaking a shield charges its next strike +50%; steady roll', changes: { kind: 'heavy', trigger: { kind: 'every', n: 2 }, mult: 1.3, breakAlways: 2, breakCharge: 0.5 } },
    cerebrix_refused_daze_hit: { species: 'cerebrix', label: 'Foresight: a refused pull Dazes the front and strikes it at 0.5x', changes: { refusedEffect: { cond: 'daze', hit: 0.5, both: true } } },
    cerebrix_refused_shock: { species: 'cerebrix', label: 'Foresight: a refused pull Shocks the front (it loses its next action) instead of Dazing it', changes: { refusedEffect: { cond: 'shock' } } },
    cerebrix_strip: { species: 'cerebrix', label: 'Foresight: the monster it pulls back loses its shield; a refused pull still Dazes the front', changes: { refusedEffect: { cond: 'daze' }, stripOnSwap: true } },
    craggo_ram_break: { species: 'rockram', label: 'Ram Butt: every second strike 1.3x, or 1.6x against a shielded foe, and its strikes strip shields at double rate', changes: { breakAlways: 2 } },
    craggo_ram_every: { species: 'rockram', label: 'Ram Butt: every strike hits 1.6x against a shielded foe; unshielded foes take 1.0x (no 1.3x surge)', changes: { trigger: { kind: 'always' }, mult: 1.0, vsShield: 1.6 } },
    craggo_ram_chill: { species: 'rockram', label: 'Ram Butt: every second strike 1.3x (1.6x against a shielded foe) and Chills the target', changes: { afflict: { cond: 'chill', chance: 0.8 } } },
    noctlet_always_first: { species: 'nightowl', label: 'Night Swoop: it always strikes first (was only its first strike)', changes: { trigger: { kind: 'always' }, priority: true, priorityExchanges: 30 } },
    noctlet_swoop_surge: { species: 'nightowl', label: 'Night Swoop: every second strike hits 1.3x; its first strike lands first', changes: { kind: 'surge', trigger: { kind: 'every', n: 2 }, mult: 1.3, priority: true, priorityExchanges: 1 } },
    ferrcub_forge_fast: { species: 'ironcub', label: 'Forge Swipe: +10% attack per triggered strike, up to three times (was +5%)', changes: { forge: { step: 0.10, max: 3 } } },
    ferrcub_forge_long: { species: 'ironcub', label: 'Forge Swipe: +6% attack per triggered strike, up to six times (was +5% up to three)', changes: { forge: { step: 0.06, max: 6 } } },
    sablewing_shadow_hex: { species: 'sablewing', label: 'Wing Shadow: every second exchange Dazes the opposing front, from the front as well as the back', changes: { kind: 'hex' } },
    sablewing_shadow_two: { species: 'sablewing', label: 'Wing Shadow: from the back, every second exchange Dazes the opposing front two (the second while it waits)', changes: { frontTwo: true } },
    aurodrax_sovereign_surge: { species: 'aurodrax', label: 'Sovereign Arm: every second strike hits 1.3x; its strikes cannot be dodged or reduced; +20% in sudden death', changes: { kind: 'surge', trigger: { kind: 'every', n: 2 }, mult: 1.3 } },
    aurodrax_sovereign_sd: { species: 'aurodrax', label: 'Sovereign Arm: cannot be dodged or reduced; +40% in sudden death (was +20%)', changes: { suddenDeathBonus: 0.4 } },
    terrabull_quake_hex: { species: 'terrabull', label: 'Quake Step: every second exchange Chills the opposing front, from the front as well as the back (the next in line too from the back)', changes: { kind: 'hex' } },
    terrabull_quake_sure: { species: 'terrabull', label: 'Quake Step: Chill chance 90% (was 78.3%)', changes: { chance: 0.9 } },
    nocturne_eclipse_entry: { species: 'nocturne', label: 'Eclipse: its first strike after each entry Dazes the whole line for two exchanges (was first strike of the battle only)', changes: { trigger: { kind: 'firstAfterEntry' } } },
    nocturne_eclipse_every3: { species: 'nocturne', label: 'Eclipse: every third strike Dazes the whole opposing line for one exchange (was first strike only, two exchanges)', changes: { trigger: { kind: 'every', n: 3 }, duration: 1 } },
    scalor_hide_quick: { species: 'scaleguard', label: 'Dragonhide: when a hit takes 15% of its HP it heals 10% (was 20% and 8%)', changes: { dragonhide: { threshold: 0.15, heal: 0.10 } } },
    spriglet_seed_even: { species: 'thornkit', label: 'Seed Drop: heals the front ally 10% and the next ally 10% (was 6%)', changes: { second: 0.10 } },
    spriglet_seed_steady: { species: 'thornkit', label: 'Seed Drop: every exchange heals the front ally 5% and the next ally 3% (same total, steadier)', changes: { trigger: { kind: 'every', n: 1 }, heal: 0.05, second: 0.03 } },
    // Gate B.4 round two
    cerebrix_refused_daze_hit025: { species: 'cerebrix', label: 'Foresight: a refused pull Dazes the front and strikes it at 0.25x', changes: { refusedEffect: { cond: 'daze', hit: 0.25, both: true } } },
    cerebrix_refused_shock50: { species: 'cerebrix', label: 'Foresight: a refused pull has a 50% chance to Shock the front (it loses its next action)', changes: { refusedEffect: { cond: 'shock', chance: 0.5 } } },
    cerebrix_refused_shock35: { species: 'cerebrix', label: 'Foresight: a refused pull has a 35% chance to Shock the front (it loses its next action)', changes: { refusedEffect: { cond: 'shock', chance: 0.35 } } },
    ferrcub_forge_every: { species: 'ironcub', label: 'Forge Swipe: every strike raises its own attack 5%, up to six times (no 1.3x surge)', changes: { kind: 'surge', trigger: { kind: 'always' }, mult: 1.0, forge: { step: 0.05, max: 6 } } },
    ferrcub_forge_big: { species: 'ironcub', label: 'Forge Swipe: every second strike 1.3x and +10% attack, up to four times (was +5% up to three)', changes: { forge: { step: 0.10, max: 4 } } },
    nocturne_eclipse_spread: { species: 'nocturne', label: 'Eclipse: each strike has a 35% chance to Daze the whole opposing line for one exchange (was first strike only)', changes: { trigger: { kind: 'always' }, chance: 0.35, duration: 1 } },
    scalor_hide_mid: { species: 'scaleguard', label: 'Dragonhide: when a hit takes 17% of its HP it heals 8% (was 20%)', changes: { dragonhide: { threshold: 0.17, heal: 0.08 } } },
    scalor_hide_15_8: { species: 'scaleguard', label: 'Dragonhide: when a hit takes 15% of its HP it heals 8% (was 20%)', changes: { dragonhide: { threshold: 0.15, heal: 0.08 } } },
    spriglet_seed_brace: { species: 'thornkit', label: 'Seed Drop: heals the front ally 10% and the next 6%, and the front ally takes 15% less from its next hit', changes: { brace: 0.85 } },
    // Gate B.4 round three
    cerebrix_refused_daze_hit015: { species: 'cerebrix', label: 'Foresight: a refused pull Dazes the front and strikes it at 0.15x', changes: { refusedEffect: { cond: 'daze', hit: 0.15, both: true } } },
    ferrcub_forge_quick2: { species: 'ironcub', label: 'Forge Swipe: every second strike 1.3x and +15% attack, up to twice (was +5% up to three times)', changes: { forge: { step: 0.15, max: 2 } } },
    umbrikit_pounce_once: { species: 'shadowkit', label: 'Shadow Pounce: dodges the first strike after its first entry only (was every entry)', changes: { dodgeEntry: 'once' } },
    umbrikit_pounce_not_voluntary: { species: 'shadowkit', label: 'Shadow Pounce: the entry dodge does not re-arm on a voluntary swap-in (steps up and forced entries keep it)', changes: { dodgeEntry: 'notVoluntary' } },
    aeralis_downdraft_daze: { species: 'skywarden', label: 'Downdraft: the swapped-in monster is Dazed (no arrival hit), so it no longer copies Undercurrent', changes: { hit: false, arrivalCond: 'daze' } },
    coglet_gearshot_break_11: { species: 'gearwing', label: 'Gear Shot: steady roll, double shield-break and 1.1x strikes', changes: { breakAlways: 2, kind: 'surge', mult: 1.1, trigger: { kind: 'always' } } },
    cerebrix_foresight_front: { species: 'cerebrix', label: 'Foresight sends the opposing front monster back whoever it is (was only when it is the strongest)', changes: { swapKind: 'strongestFront' } },
    cerebrix_foresight_front_hit: { species: 'cerebrix', label: 'Foresight sends the front back, with a 0.5x arrival hit on the replacement', changes: { swapKind: 'strongestFront', hit: true } },
    cerebrix_foresight_refused_daze: { species: 'cerebrix', label: 'Foresight as written, but a refused pull Dazes the opposing front instead', changes: { refusedEffect: { cond: 'daze' } } },
    cerebrix_foresight_front_refused_daze: { species: 'cerebrix', label: 'Foresight sends the front back; when refused it Dazes the front', changes: { swapKind: 'strongestFront', refusedEffect: { cond: 'daze' } } },
    tsunarok_undertow_chill: { species: 'tsunarok', label: 'Undertow: the dragged monster arrives Chilled (no arrival damage)', changes: { arrivalCond: 'chill' } },
    tsunarok_undertow_hit08: { species: 'tsunarok', label: 'Undertow: the dragged monster takes a 0.8x arrival hit', changes: { hit: true, hitMult: 0.8 } },
    tsunarok_undertow_hit_chill: { species: 'tsunarok', label: 'Undertow: a 0.5x arrival hit and the dragged monster arrives Chilled', changes: { hit: true, arrivalCond: 'chill' } },
    tsunarok_undertow_refused_hit: { species: 'tsunarok', label: 'Undertow: 0.5x arrival hit; a refused drag strikes the front at 0.5x instead', changes: { hit: true, refusedEffect: { hit: 0.5 } } },
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
    swapCost: overrides.swapCost || v.experiments.swapCost.default,
    sdFromE: Number(overrides.sdFromE) || v.experiments.sdFromE.default,
    patches: Object.freeze([...new Set(overrides.patches || [])].sort()),
  };
  if (!v.experiments.swapCost.options[c.swapCost]) throw new Error(`Unknown swap cost ${c.swapCost}`);
  for (const id of c.patches) if (!v.movePatches[id]) throw new Error(`Unknown move patch ${id}`);
  if (!v.backRow.tests[c.backRow]) throw new Error(`Unknown back-row test ${c.backRow}`);
  if (!v.duration.models[c.duration]) throw new Error(`Unknown duration model ${c.duration}`);
  return Object.freeze(c);
}

/** A species' move under a config: the reviewed card, with any listed Gate B.1 patch applied on top (frozen). */
export function patchedMove(speciesId, move, config) {
  const ids = (config?.patches || []).filter((id) => CLASH_VALUES.movePatches[id]?.species === speciesId);
  if (!ids.length) return move;
  let m = { ...move }; for (const id of ids) m = { ...m, ...CLASH_VALUES.movePatches[id].changes };
  return Object.freeze(m);
}

/** Which switches differ from the Gate A defaults, in words, for the Lab and the log. */
export function activeExperiments(config) {
  const out = [];
  if (config.backRow !== CLASH_VALUES.backRow.default) out.push(`Back row ${config.backRow}`);
  if (config.duration !== CLASH_VALUES.duration.default) out.push(`Duration ${config.duration}`);
  if (config.O1 && config.O2) out.push('O3 (O1 + O2)'); else if (config.O1) out.push('O1'); else if (config.O2) out.push('O2');
  if (config.swapCost && config.swapCost !== CLASH_VALUES.experiments.swapCost.default) out.push(`Swap cost ${config.swapCost}`);
  if (config.sdFromE && config.sdFromE !== CLASH_VALUES.experiments.sdFromE.default) out.push(`Sudden death E from ${config.sdFromE}`);
  if (config.patches?.length) out.push(`Patches ${config.patches.join(', ')}`);
  return out;
}
