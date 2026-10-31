# Task 6 Phase A-1 — Report (Ageing and Retirement)

**Authorisation.** Owner, 2026-10-30. Built under the Feature-Complete Development with Consolidated Testing workflow.

**Status.** Implemented and validated once against the frozen Phase 0 baseline. Nothing is merged or published. The main game is untouched.

**Result.**
- **The ageing and retirement targets are met.**
- **One hard gate fails:** the owner difficulty drift for seasons 1–8, on Rookie and Pro.
- **This is a genuine conflict between an approved change and the drift requirement.** Following the owner's instruction, nothing was tuned to hide it. The evidence and options are in §8, and this needs an owner decision.

**Record.**
- `docs/task6-phase-a1/` holds the comparison tables, gates, transition, Stage P, harness check, save compatibility and run hashes.
- `docs/TASK6_PHASE_A1_PLAN.md` is the Stage 1 plan.
- GDD §55 holds the rules.

## 1. PR and commits
- **Branch:** `task6-phase-a1`, stacked on `task6-phase0` (PR #85) → #84 → #83. All open and unmerged.
- **Implementation commit validated:** `a57c255`, frozen in its own worktree for every run.
- **Later commits:** tools and documents only.
- **Development preview:** branch `task6-phase-a1-preview`, commit `caee962`, `v42.18.0-dev.a1`.
  - It is `a57c255` plus only the version label and the test-build switch.
  - Its publish folder is ready: 162 files, byte-identical, file-list check OK.
  - **The private test link has not been updated:** that awaits the owner's authorisation.

## 2. Features implemented
- **Position-specific ageing.**
  - Physical decline from a hidden, id-derived onset (RB 27 … K 32, longevity −3…+3, durability ±1), increasing each season past it.
  - Technical decline 2–3 years later and slower.
  - −1 physical after a severe injury past the onset.
  - Growth to 23 unchanged.
  - Unsigned monsters age by the same rules.
- **Age-adjusted training.**
  - A physical +1 costs 1/2/3/4 points by seasons past the public onset.
  - Technical +1 costs 1, then 2.
  - Level-up physical picks land with chance 1 / cost.
  - Auto-spend weights by weight ÷ cost.
  - The owner can still buy any point, at the cost shown on the + button.
- **Retirement.**
  - Offseason only, decided as the offseason opens (before contracts, the draft and free agency).
  - Permanent; no hard age.
  - Approved hazard with role multipliers, unsigned ×2, and **one** injury factor.
  - Legendary monsters and the rival's signature monster are exempt.
- **Exits and records.**
  - AI monsters leave with the reason `retired` through the existing registry path.
  - Legend stubs for the decorated, career top-10 and every former owner monster, so careers, records and News resolve.
  - League News reports the retirements that matter, plus a one-line summary.
- **Old-save transition (variant B).**
  - Decline cap 2s, hazard ramp s/4, a 15% club cap while s ≤ 3.
  - A franchise created under the rules is `native`.
- **Owner-facing.**
  - Career stage (Rising, Prime, Veteran, Late career) and a retirement outlook (an observable estimate) on the monster page.
  - Point costs on the + buttons.
  - Retirement News, and a Retirements panel on the Offseason screen.

## 3. Changed files and affected systems
- **Game:**
  - `src/data/aging.js` (new): the rules;
  - `src/franchise/retirement.js` (new): the pass, exits, transition and outlook;
  - `src/data/monsters.js`: costs in level-ups and spending;
  - `src/franchise/progression.js`: offseason decline;
  - `src/franchise/franchise.js`: hooks in `endSeason` and `startNextSeason`, `aging` at creation, `monsterOutlook`;
  - `src/franchise/league-season.js`: the ageing context;
  - `src/franchise/career.js`: the `retired` event;
  - `src/ui/screens/roster.js`, `src/ui/screens/hq.js`, `styles/app.css`;
  - `index.html`: the import-map stamp for the two new modules.
- **Tools:**
  - `tools/task6-transition-check.mjs` and `tools/task6/make-old-save.mjs` (new);
  - `tools/aging-ui-check.py` (new);
  - `tools/franchise-soak.mjs` (`from`: continue an imported save);
  - `tools/task6-analyze.mjs` (the base-4 early/exceptional view).
- **Tests:** `tests/aging-retirement.test.js` (new, 5 tests).
- **Documents:** GDD §55, plan, this report.
- **Save fields added** (all optional, additive): `f.aging`, `f.retirementsLast`, `m.durPeak`, `m.peakOvr`, `m.physDrop`, `m.retired`.
- **Unchanged:**
  - the football engine;
  - contracts and the age-32 reserve rule (Phase B);
  - the nudge and anchors (A-2);
  - drafting, trading and free agency.

## 4. Phase 0 against Phase A-1 (matched seeds; candidate `a57c255`)

Full table: `docs/task6-phase-a1/compare.md`. Sets: B (seeds 1–60) and held-out H (61–80) × 10 seasons; C (106–115) and held-out CH (116–125) × 20 seasons. All held-out results agree in direction unless stated.

### Passed hard gates
| Gate | Result |
|---|---|
| Integrity, all 130 candidate seed-runs (B, H, C, CH, scenarios) | **0 problems, 0 errors** |
| Non-interference and determinism (`task6-harness-check`, seeds 1–3 × 3) | identical |
| Full suite (`npm test`, run alone) | **782 of 782 pass** (777 + 5 new) |
| Trading tests | pass (in the suite) |
| Save compatibility (6 saves: v39/v40-era unpersisted, v42 mid-season and offseason, an old v42.17.0 mid-season save, an old 15-season save) | all load and play two seasons, 0 problems |
| §45.6 contract | holds on all three difficulties: owner +0.2 / −4.7 / +2.5, AI mid-season 0.0 / −0.2 / −0.4. Pro is close to the edge |
| Stage P (3 repetitions, median, same machine, alone) | 11.67 → **11.88 s per season (+1.8%)**; gate ≤ +10% |
| Phone-width UI (`tools/aging-ui-check.py`, 320/375/390/430) | pass |

### Failed hard gate
| Gate | Rookie (12 seeds) | Pro (12 seeds) | All-Star (24 seeds) |
|---|---|---|---|
| Owner drift, seasons 1–8 (±5) | **−5.6** [−10.2, −0.8]: **fail** | **−7.9** [−11.9, −3.4]: **fail** | −3.3 [−7.4, +0.9]: passes, but the interval reaches past the band (escalated) |
| Seasons 9–20 (report only) | −31.3 | −20.8 | −13.2 |

### Met targets (Phase A-1)
| Measure | v42.17.0 | A-1 (development / held-out) | Target |
|---|---|---|---|
| Starter mean age, season 10 (B) | 29.9 | **28.1** | 27–30 |
| Starter mean age, season 20 (C) | 35.1 | **28.6** / 28.6 | 27–30 |
| Starters 33+, season 20 (C) | 64.8% | **14.3%** | ≤ 18% |
| Retirements a season, seasons 11–20 (C) | 0 | **35.9** | 20–50 |
| Mean retirement age (C): RB / WR / CB | — | 31.0 / 31.9 / 31.9 | 29–32 / 31–34 / 31–34 |
| LB / DL / S / TE | — | 33.1 / 33.1 / 33.3 / 33.2 | 32–35 |
| QB / OL / K | — | 33.9 / 34.3 / 36.0 | 33–36 / 33–36 / 34–39 |
| Career length p10 / p50 / p90 (C and CH) | — | 8 / **11** / 14 | p50 9–13; p90 ≤ 18 |
| Retirement age by hidden longevity (−3 … +3, against the base) | — | −2.6, −1.7, −0.7, +0.2, +1.3, +2.5, +3.3 | monotonic; spread ≥ 4 (here 5.9) |
| Physical change by seasons past the public onset (C, pooled) | +0.29, −0.08 (1), −0.40 (3), −0.47 (5) | +0.17 (0), **−0.72 (1), −1.37, −2.19 (3), −2.79, −3.32 (5)**, −3.75, −4.14, −4.47 | never positive from 1; ≥ 1.5 at 3; ≥ 2.5 at 5; progressive (steps ≤ 0.8) |
| Veterans (≥ public onset + 2) still starting (C) | 96.1% | **89.9%** | ≥ 50% |
| Old-save transition: peak against steady (3 old saves) | — | peak 71–74 against a native steady 36: **2.0×**. Without the transition the first offseason is 128–154 (3.6–4.3×) | ≤ 2.5×; no lasting difference |
| Transition, lasting difference after 5 seasons | — | starter age 27.5–28.3 against 28.5–28.6 (no transition); starter overall 78.7–78.9 against 78.6–79.4 | converged |

### Unmet targets
1. **33+ monsters still improving:** 24.9% → **9.0%** (target ≤ 2%). The improvement is statistically supported, but the target is not met.
   - **Kickers:** 26.5% improve at 33+. Their technical onset is 35, and kicking is a technical attribute, so they improve until then by the approved curve.
   - **Evolutions:** 43% of the remaining improvements come in a season with an evolution (+4 potential).
   - Without kickers the rate is about 3.5%.
   - Recommendation in §8.
2. **Early retirements:** the definition decides the result.
   - Phase 0 wrote the position base as onset + 5. On that base, early retirements are 34–43% (target ≤ 30%).
   - **The approved bands came from the Group 1 projection, which used onset + 4.** On that base, early retirements are **19–27%** (≤ 30% ✓) and exceptional ones **8–16%** (3–20% ✓) at every position, in both C and CH.
   - This was a definitional error of mine in Phase 0. It is reported rather than corrected silently: owner decision in §8.

### Inconclusive or not measurable in A-1
- **Durability's effect on retirement age.** The harness snapshot records current durability, which falls with age, so the comparison is confounded. Recommend adding `durPeak` to the harness snapshot (an additive v4.1 column) in the next phase.
- **The 33+ improvement target** is measured on B. Its definition counts kickers and evolution, so the cause analysis above is diagnostic, not a pre-registered measure.

### Side effects outside A-1's targets (reported, not tuned)
- **Better:**
  - round-1 picks starting for their club by year + 2: 33.0% → 40.6%; late picks 14.4% → **34.2%** (meets ≥ 30%);
  - succession cover (Task 4 definition): 17.6% → 22.5%;
  - ordinary clubs under the XP slowdown: 41% → 19%;
  - largest single-year expiry: 54% → 51%;
  - no roster shortages: AI roster 35.6 against 36.0, minimum 27 against 27, fewer season-end lineup problems (49 against 52), fewer clubs over the cap (3 against 25).
- **Worse:**
  - persistent weak groups: 11.9% → 16.3%; with cap room 9.8% → 14.2%;
  - misaligned picks: 10.6% → 14.2%;
  - generated veterans among gym starters at season 20: 58% → 71%;
  - young trade payments: +2.8 points;
  - gym lead in seasons 5–7: 4.6 → **4.2** (an A-2 gate: "no worse than v42.17.0");
  - ordinary playoff share: −1.7 points;
  - league starter strength at season 20: −2.2.
  - **Cause:** retirements open holes that today's AI only refills by count and anchor. Phases B and C (succession, free-agency upgrades) and A-2 (nudge, draft scaling) are designed for these.
- **Monitors:**
  - distinct champions 5.8 → 6.2;
  - the hands-off owner's win rate in seasons 9–20: 28% → 13%.

## 5. Test results and coverage
- **During implementation:**
  - focused tests (5): rule values identical to the approved planning module; costs by age and position; the ageless exemption; decline by position (physical before technical); determinism; the transition cap; retirement exits on a real league (reason `retired`, registry verified, protected monsters never, the owner's lineup cleaned, legend stubs, News); save round trip;
  - the affected test files (94 tests; one League News expectation was kept by filtering at emission, so no test was changed);
  - save compatibility;
  - a 4-season and a 20-season soak (0 problems).
- **Consolidated (once):**
  - all four seed sets, the six scenarios, the contract, drift (Rookie and Pro 12 seeds, All-Star 24);
  - Stage P, the harness check, save compatibility, the UI check, the full suite.
  - The v42.17.0 All-Star drift seeds 13–24 were generated once from the frozen Phase 0 tree (they had never existed; this is not a regeneration).
- **Not re-run:** nothing expensive was repeated. The transition check ran once. It projected 5 seasons instead of 8, because the 15-season old saves hit the 20-season career cap. The tool's default is now 12 + 8. The 5 seasons cover the whole 4-season ramp.

## 6. Save compatibility and retirement transition
- **All six saves load and play forward with 0 problems**, including two pre-league saves and old v42.17.0 saves (mid-season and after 15 seasons).
- **Old saves start the transition** at their first retirement pass.
  - With the transition, the first offseasons retire 25–29, 48–54, 71–74 and 62–67, then about 31–40.
  - Without it, 128–154 retire at once, about a fifth of the league.
  - By the fifth season, starter age and strength have converged with the no-transition run.

## 7. Performance
Stage P: +1.8% (11.67 → 11.88 s per season). Retirement is offseason-only, with one draw per eligible monster.

## 8. Known issues and recommended corrections (owner decisions)

**1. Owner drift for seasons 1–8 fails on Rookie and Pro (hard gate).**
- **Evidence** (Pro): the owner's team overall tracks v42.17.0 to season 4 (68.1 against 68.5), then stagnates and falls: season 8 is 66.4 against 69.3. AI clubs keep pace, because the nudge refills them at their anchor.
- **Cause:**
  - the owner's founding roster reaches its decline onsets in seasons 5–8 under the same rules as everyone;
  - the hands-off owner proxy re-signs every veteran and signs only the cheapest free agents up to the minimum, so it never replaces them;
  - AI clubs get generated replacements from the balance system.
- **How much is the game, and how much the passive proxy, is not separable from this data.**
- **Options:**
  - **(a)** Treat the A-1 drift as an expected interim effect and keep the gate binding at milestone M1 (A + B), the release unit. A-2 (nudge recalibration, draft scaling) and B are where AI and owner refills are balanced.
  - **(b)** Authorise a diagnostic drift run with an "active-replacement" owner proxy, which signs the best affordable free agent when a starter retires. This needs no game change: Rookie and Pro, seeds 1–12 × 8 seasons, about 1 hour. It separates the proxy from the game.
  - **(c)** Change the game, for example a softer owner curve. **Not recommended:** the approved rules apply to GM and AI alike.
- **Recommendation:** (b), then (a) if the active owner stays within ±5.

**2. Early-retirement definition.**
- **Recommendation:** adopt onset + 4, the projection's base that the bands were written for, and record the correction in the methodology change log. On it, every position meets the band.

**3. 33+ improvement target.**
- **Recommendation:** either exclude kickers (their technical curve is intentionally late) and report evolution-season improvements separately, or keep the target and treat kickers as a known exception.

**4. Side effects** (weak groups, misaligned picks, generated gym starters, the gym lead in seasons 5–7) go to the planned A-2, B and C work. None needs an A-1 change.

## 9. Development preview readiness
**Ready.**
- **Build:** `v42.18.0-dev.a1` at `caee962`, equal to `a57c255` plus the label.
- **Folder:** 162-file publish folder verified, byte-identical; it loads and imports a save.
- **Waiting for:** the owner's authorisation to update the private test link (requested 2026-10-30).

## 10. Ready for final approval?
**Not yet fully validated.** Every A-1 target is met, or is met under the corrected definition (see §8.2). The kicker-driven 33+ item is the exception. All hard gates pass **except the owner drift for seasons 1–8 on Rookie and Pro.** Per the instruction, that conflict is presented rather than tuned. A-1 can be approved once the owner decides §8.1 (and §8.2–§8.3), plus the owner's own manual testing on the preview.

## Addendum (2026-10-31): owner review follow-ups
See `docs/TASK6_PHASE_A1_DECISION_REPORT.md`.
- **Preview:** published to the private test link (artifact version `1793451979-9db2`) and verified.
- **Drift diagnostic** (active-replacement owner):
  - Rookie −5.7, Pro −8.9: **did not pass**;
  - in 30 of 31 cases the proxy had no cap room to replace a retired starter;
  - the gate stays failing and unresolved.
- **Early-retirement base:** corrected to onset + 4; the original is documented and still reported.
- **33+ improvement** (9.09% on B):
  - kicker curve 3.83%, evolution seasons 4.43%, ordinary 0.82%;
  - **0% contradicting the rules**;
  - the ≤ 2% target stays visible and unmet, pending the owner's decision on clarifying it.
