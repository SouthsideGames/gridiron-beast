# Task 8 build plan (dependency order)

**Status.** The specification is consolidated: SPECIFICATION_BASELINE.md §20–§21, task8-overrides.json and APPROVAL_REGISTER.md.
Every decision is approved; N7d closed the field-wording gaps G1–G3 ([FIELD_CLOCKS.md](FIELD_CLOCKS.md)).

**Rules for the build.**
- Work stays on development branches off `task8-implementation`. Nothing merges or publishes without owner instruction.
- Each milestone is one integration step, with a broad regression run (full suite plus the milestone's own gates).
- Within a milestone, targeted tests only.
- Fixtures tied to retired mechanics change by design. Each change is listed in the milestone report with the ruling that retires it.
- Art polish stays deferred. Ability visuals are functional: readable shapes, outlines, badges and the approved event cues, built with the existing renderer.

## Milestones

| Milestone | Work packages | Contents | Gate at the end |
| --- | --- | --- | --- |
| **M0** (done) | WP1 groundwork, WP4 plumbing, WP10 catalogue shell | Generated Dex module with approved overrides; Dex adapter; Temper table; exact fractions; reward ledger; ability catalogue; Dex species table (`dex-species.js`); approved-value accessors | Fast tier 601/601 at dc45591; targeted tests since |
| **M1** Fresh save and individuals | WP1, WP2, WP3 | New save schema with the fresh-save break; species from the Dex (192 families, Basic rarity); generator (per-attribute ranges, Temper, Apex 1%, Basic shares B17, veteran history B7); level schedule (75 XP per level, B6); training economy (C/E exact fractions); evolution; ageing; retire traits, Nature effects and the legacy cornerstone list (B13–B15) | Full suite; generation-invariant, training-math and growth fixtures; save round-trip and fresh-save refusal of old saves |
| **M2** Shared football systems | WP4, WP5 | Reward ledger wired (activity + monster); telemetry (B8); shared statuses and clocks, including Stunned carryover (B18); stamina and Afflicted (B10); fields and overlaps; attribute consumers and shed formula (B2); pancake (B1); special objects; live kickoffs and special-teams units (P7, B5); event order (B3) | Full suite; status, field, pancake-rate and determinism gates. Ordinary-shed and pancake effects reported separately (B2) |
| **M3** Football abilities and reviewer | WP6, WP10 (football) | Contract registry; the 72 football abilities with form and mastery values (G1–G3 clauses held); runtime-backed football reviewer on the real engine | Per-ability contract cases; reviewer browser check: all 72 listed, every scenario runs on the engine, no progression writes |
| **M4** Beast Clash | WP7, WP10 (Clash) | One active fighter, reserves, normal-turn clock; rotation and entry penalty (P8); explicit miss effects (P10); immediate KO (B3); delayed effects, constructs, revive, transfer, split; the 72 Clash abilities; opening/OT carryover; exchange-boundary saves (B11); Basic Clash action; runtime-backed Clash reviewer | Per-ability contract cases; Clash determinism; reviewer browser check |
| **M5** Grading, mastery and AI | WP8, WP9 | Football §7 and Clash §8 grading; mastery 0/10/30/60; AI knowledge and scouting (B16); legendary limit with legendary kickers counted as offensive (B19); AI may start Basics; training allocation | Grading fixtures; AI benchmark parity |
| **M6** Presentation and gates | WP11, WP12 | Shared status badge, charge bar, battery, Apex markers, Temper, three bars, the 192-family Dex and collection achievements (72 / 120 / 192); settings (60/30 FPS, quality, reduced flash); rebenchmarks: pancakes on Dex ratings (B1), XP multiplier (B6), Apex ask (B9), economy (#30); CPU gate; frozen probability tests (B12) | Full suite; career and pacing reports; CPU gate. Physical-device frame gates reported as unverified unless devices are available |

## Transitional legacy ability effects (until M3)

- **Scope.** From the M1 switch until M3, the 72 original families keep their legacy football ability effect keys (the engine's inline effect primitives) so the game stays playable. They are transitional, not Task 8 behaviour.
- **Marking.** They are marked transitional in code (`LEGACY_ABILITY_EFFECTS_TRANSITIONAL`) and in the species table, and listed in the M1 report.
- **M3 replaces them completely.** Each family's legacy effect is removed in the same change that registers its Dex contract, so old and new effects never stack.
- **M3 gate.** A static test fails if any legacy effect key or trait key remains reachable from the engine, or if a family has both a legacy effect and a registered contract.
- **Clash.** Legacy Clash moves are replaced the same way at M4.

## Field clocks

G1–G3 are resolved (N7d). Field clocks and creation hooks are built straight from FIELD_CLOCKS.md.

## Rebenchmark commitments from the rulings

| Ruling | Commitment |
| --- | --- |
| B1 | Re-measure pancakes with Dex-generated ratings at M2/M6, moving constants only within bounds. |
| B2 | Report ordinary shed effects (sacks, pressures, run stops) separately from pancake results. |
| B6, B7 | Development benchmarks (median level 50 in 5–8 seasons; veteran distribution match). |
| B9 | Revalidate the Apex ask after the economy recalibration. |
| B12 | Freeze tolerance and sample size per probability before running. |

## M1 switch: footprint and approach (measured 2026-11-07)

The switch connects the M1 core (`src/franchise/t8/*`, `src/data/dex-species.js`) to the game in one integration step.

| Area | Files touched today | Approach at the switch |
| --- | ---: | --- |
| Monster generation and rosters (`generateMonster`, `createRoster`, cornerstones) | 9 | `generateMonster` builds `m.dev` with `generateIndividual`. The family comes from `pickFamily` with the channel's B17 share, and veterans come from `simulateHistory`. `m.attributes` mirrors `m.dev.current`. The fixed legacy cornerstone list is retired (B15); offers keep the no-K rule. |
| Scalar `m.potential` consumers (AI valuation, trades, FA, draft, UI) | 21 | Kept as a derived compatibility value: OVR of the individual potential map at the monster's position. AI access to it is restricted at M5 (B16 knowledge rules). |
| Level and points (`levelUp`, `spendPoint`, `POINTS_PER_LEVEL`, `xpForLevel`) | 6 | Replaced by `addLevelXp` (75 XP per level, natural growth) and the training bank. Level-ups no longer grant points. |
| Nature (`.nature`, `NATURES`) | 12 | Effective-rating multipliers and side effects removed (B14). Temper replaces it for training only. Legitimate Ambition behaviour is untouched. |
| Traits (`.trait`, `TRAITS`) | 10 | Removed from data, engine and UI (B13). |
| Saves | `save.js` | New schema; older saves are refused with the clear Start New Franchise message (fresh-save break, §15). Fractions serialise exactly (N7e). |

**Transitional (until M3):** the 72 original families' legacy football effect keys stay attached through a table marked
`LEGACY_ABILITY_EFFECTS_TRANSITIONAL`. Basics carry none.

**Regression at the switch:** the full suite. Fixtures tied to Nature, traits, points per level, the old XP curve, scalar
potential growth and the legacy cornerstone list change by design. Each change is listed with the ruling that retires it.
