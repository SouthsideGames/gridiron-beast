# Task 6 — Final Release Validation and M3 Decision (2026-11-03)

> **FINAL STATUS (2026-11-03): Task 6 COMPLETE / RELEASED.** The owner approved Option 1 on 2026-11-03.
> - **Merged:** PRs #83–#91; `main` is at `d2159f8`.
> - **Published:** `v42.21.0-ai-franchise` on the existing main game link, artifact version 116 (`1793751077-3e7b`), 165 files.
> - **Exceptions:** the exceptions in §1 D and §3 are accepted for this release only. They are **not** reclassified as passing and do not weaken future acceptance criteria.
> - **Records:** release record in GRIDIRON_BEAST_GDD.md §58.8 and `docs/TASK6_DECISIONS.md`.
> - **History:** the report below is kept unchanged as the pre-approval validation record.

**Outcome at validation (before the owner's approval): release conditions NOT met.** Nothing was merged or deployed at that point; the production game was then v42.17.0 (artifact version 115).

**Release candidate:**
- Branch `task6-final-rc`.
- Simulation commit `341342f`; version commit `1a70e32`: `v42.21.0-ai-franchise`, `test: false`.
- Contents: Phase D plus the owner-approved F1–F4 rebuilding package, enabled permanently with no switches. Rebuild draft potential weight stays 0.35. No R-1, R-2 or nudge change.

**Comparison builds, kept available:**
- validated Phase D (`task6-phase-d`, `bcd7b7f`);
- frozen v42.17.0 baseline.

**Method:** the approved seed sets were run once on the candidate.

| Set | Seeds |
|---|---|
| B | 1–60 × 10 |
| H (held-out) | 61–80 × 10 |
| C | 106–115 × 20 |
| CH (held-out) | 116–125 × 20 |
| Drift | 1–36 × 8 on every difficulty |
| Contract | 1–8 × 8 on every difficulty, plus the 24-seed Rookie and All-Star extensions |

- **C seeds:** the candidate's C runs are the tested arm-B runs. The final commit reproduces them exactly: seeds 106 and 107 give identical results, decisions, season snapshots and final franchise state.
- **Legacy contract runs:** reused, as in Phase D. Phase D cannot reach them, and seeds 1–2 were rerun and found identical.
- **Held-out sets:** not used for any decision.

## 1. Release conditions
### A. Technical integrity
| Check | Result | Status |
|---|---|---|
| Full suite | **816 of 816**; 0 skipped, 0 cancelled, on `1a70e32` | **pass** |
| Simulation integrity | 0 problems and 0 errors in 264 candidate runs; 10 board firings, all in contract runs, which have no board reset | **pass** |
| Determinism and non-interference | `task6-harness-check` on the candidate: pass | **pass** |
| Save compatibility | 6 of 6 legacy and league saves play forward and round-trip | **pass** |
| Stage P | interleaved with v42.17.0: 13.04 → 13.58 s (+4.1%) and 13.78 → 13.23 s (−4.0%) | **pass** |
| Mobile width and gameplay | Preview `v42.21.0-rc.1` at 360 and 390 px: 0 errors, no horizontal overflow; a season plays in the browser with 0 problems; modes assigned; 6 development slots. The release deploy check (`tools/deploy-check.py`) was not run, because the release was blocked before publishing | **pass** |
| Critical gameplay, progression or data-loss defects | none found | **pass** |

### B. Rebuilding improvements (C dev and CH held-out, matched against Phase D)
| Measure | Phase D | Candidate | Difference | Status |
|---|---|---|---|---|
| F1–F4 active | — | permanent code; unit tests for each rule; the final commit reproduces the tested arm exactly | — | **pass** |
| Mean rebuild length, C / CH | 4.46 / 4.29 | **2.78 / 2.88** | −1.68 [−2.10, −1.26] / −1.41 [−1.84, −1.00] | **supported improvement** (held-out agrees) |
| Rebuilds of 5+ seasons, C / CH | 37% / 31% | **6% / 6%** | — | **substantially less frequent** |
| Sales with a replacement within 4 | 62% / 58% | **95% / 93%** | — | **pass** (note 1) |
| Weak position after a sale, CH | 11.3% | **6.8%** | — | improved |
| Recovery from ≤ 2 wins within 3 seasons, C / CH | 42.0 / 42.8 | **46.4 / 47.8** | +4.5 / +5.0, n.s. | no regression |
| Persistent weak groups (B, held-out H) | 11.31 | **10.63** | −0.68 [−1.68, +0.35]; held-out agrees | no regression |
| Persistent weak, position-relative (B) | 14.17 | **13.92** | −0.26 [−0.51, −0.01] | supported improvement |
| Contracts: 3-year share / largest expiry share | 56.3 / 52.9 | 55.8 / 53.0 | −0.5 / +0.1 | no material change |
| Trade integrity | — | every deal fair both ways and legal; 0 integrity problems | — | **pass** |

1. The sale-readiness check is measured on the season-end snapshot before the window. The rule itself is applied at the moment of the sale, so the 5–7% that read "not ready" reflect rating and injury changes in between, not rule breaches. The F4 unit test covers the rule.

**Every rebuilding condition is met.**

### C. Franchise balance (matched seeds, against Phase D)
| Area | Result | Status |
|---|---|---|
| Gym mechanics | unchanged (no anchor, bonus, band or difficulty change) | **pass** |
| Gym competitiveness | gym win rate 80.6 → 80.1 (−0.6, n.s.); title share 99.0 → 98.5; lead from season 8 5.02 → 4.93 (−0.10 [−0.47, +0.26]); tier order held | **no meaningful deterioration** |
| Development, draft, succession | young reserves 2.60 → 2.58; misaligned picks 4.42 → 4.40; succession cover 48.2 → 48.6; round-1 starts unchanged | **no meaningful deterioration** |
| Long-term integrity | league strength season 20 77.16 → 77.15; ageing and retirement unchanged | **no deterioration** |
| Mode stability (report) | 1.47 → 1.83 changes per club per 10 seasons (rebuilds now end sooner) | reported; still stable |
| **Owner balance and drift** | **see below** | **FAIL: blocks release** |

**Owner balance and drift** (approved methods and thresholds unchanged):

| Gate | Phase D | **Candidate** | Candidate − Phase D | Approved classification |
|---|---|---|---|---|
| Drift, Rookie (36 seeds, s1–8) | −4.1 [−6.7, −1.4] | **−4.3 [−6.8, −1.8]** | −0.2 [−1.9, +1.5] | FAIL preserved (known exception; not worse) |
| Drift, Pro (36) | −4.3 [−7.3, −1.1] (inconclusive) | **−5.7 [−8.4, −2.7]** | −1.3 [−3.6, +0.9] | **FAIL**: point estimate outside ±5. **New** |
| Drift, All-Star (36) | −1.5 [−4.6, +1.5] (pass) | **−2.7 [−6.0, +0.7]** | −1.2 [−3.2, +0.7] | **inconclusive**: interval crosses −5. Was a pass |
| §45.6, Rookie (8 seeds) | +7.2 | **+5.7** (AI +0.2); 24 seeds +0.6 [−2.3, +3.8] | — | FAIL preserved (known exception; not worse) |
| §45.6, Pro (8) | −0.4 | **−1.3** (AI +0.3) | — | pass |
| §45.6, All-Star (8) | +2.0 (pass) | **+5.4** (AI −0.3); 24 seeds −0.7 [−4.1, +2.9] | — | **FAIL** on the standard check. **New** (Phase C also failed it, +6.8) |

### D. Known exceptions
| Exception | Candidate | Within the authorised exception? |
|---|---|---|
| Rookie owner balance (§45.6) | +5.7 (Phase D +7.2) | yes, not worse |
| Rookie drift | −4.3 (Phase D −4.1) | yes, no material change |
| Pro drift uncertainty | −5.7: classification changed from inconclusive to **FAIL** | **no.** The exception covered Pro only "if it remains inconclusive" |
| Ordinary titles / persistent losers | 1.5% / 88.6% (C), 95.7% (CH) | yes (provisional targets; unmet) |
| Gym lead | 4.93 from season 8 (≥ 6) | yes (unmet) |
| Young-reserve growth | +2.58 (≥ +3) | yes (unmet) |
| Persistent weak groups | 10.63 / 8.69 (≤ 8 / ≤ 5) | yes (unmet; improved) |
| Young-player payments | 53.5 all deals / 50.0 excluding R4 sales (48.2 baseline) | yes (unmet; improved against Phase D: −2.9 [−5.1, −0.9]) |
| All-Star §45.6 failure, All-Star drift no longer a pass | — | **not covered: new** |

## 2. Young-player payments, combined and separated (owner decision)
| Set | v42.17.0 | Phase D, all deals / excluding R4 | **Candidate, all deals / excluding R4** |
|---|---|---|---|
| B | 48.2 | 56.4 / 48.7 | **53.5 / 50.0** |
| H (held-out) | 49.3 | 55.8 / 48.1 | **51.6 / 48.0** |
| C (dev) | — | 55.4 / 45.0 | **48.1 / 42.9** |
| CH (held-out) | — | 57.4 / 49.1 | **50.7 / 46.9** |

## 3. Why the release is blocked
- **The failing conditions:** C (no meaningful deterioration in owner balance or drift) and D (no new hard-gate failures). Specifically:
  - **Pro drift** crosses the approved ±5 hard gate by its point estimate (−5.7).
  - **All-Star §45.6** fails its standard 8-seed check (+5.4).
  - **All-Star drift** falls from pass to inconclusive.
- **New or known:** new classifications. Pro drift was a documented uncertainty, All-Star was passing.
- **Type: statistical uncertainty, not a gameplay defect.**
  - Against Phase D the candidate's changes are not significant on any of these: Pro −1.3 [−3.6, +0.9]; All-Star drift −1.2 [−3.2, +0.7].
  - The All-Star 24-seed contract stays well inside: −0.7 [−4.1, +2.9].
  - The point estimates were already close to the limits, and F1–F4 change AI rosters enough to move them across.
  - **Mechanism:** shorter rebuilds return ordinary clubs to competitiveness sooner. That slightly toughens later seasons for the hands-off owner (Pro season 8: 34.0 → 29.3).
- **Why it still blocks:** the approved gates are classified by point estimate, and the owner's authorisation forbids expanding the exceptions to new failures. By the approved rules the release cannot proceed automatically.
- **Infrastructure:** none of these results comes from infrastructure. The sandbox restarted several times during the cycle; every affected job was re-run, and none is missing.

## 4. Recommended next action (owner decision; no further investigation started)
1. **Option 1: release with the two new items added as documented exceptions.** The evidence says they are sampling-level shifts, not regressions with a cause:
   - Pro drift −5.7 (change against Phase D −1.3, n.s.);
   - All-Star §45.6 8-seed +5.4 (24 seeds inside);
   - All-Star drift −2.7 (inconclusive).
   - Rebuilding is materially better and nothing else deteriorated.
2. **Option 2: release Phase D without F1–F4.** Its classifications match the authorisation (Pro inconclusive, All-Star passing). It needs the same release steps, and its full validation already exists. It gives up the confirmed rebuilding improvement.
3. **Option 3: hold M3.**

**My recommendation is Option 1.** The candidate is stable: no defects, all technical checks pass, and rebuilds are shorter and confirmed on held-out seeds. The new gate readings sit within noise of builds that passed. It needs the owner's explicit acceptance; I have not assumed it.

**What an actual player notices:**
- **The Rookie gates (known):** a passive Rookie owner wins about 4 points fewer games over the first 8 seasons than in v42.17.0, concentrated in seasons 6–8 as his starters age. An owner who drafts and trades can offset this; free agency rarely can. Rookie stays the easiest mode (about 72% wins in seasons 1–8).
- **Pro:** later seasons are a few points harder for a passive owner.
- **All-Star:** the persistent league plays slightly easier than the standard generator on the first 8 contract seeds, and not on the 24-seed sample.

## 5. Branches and pull requests (not merged)
- **Base of the stack:** #83 `post-trading-benchmark` → main (Task 5.5, tools and documents only).
- **Task 6 stack:** #84 plan → #85 Phase 0 → #86 A-1 → #87 A-2 → #88 B → #89 C → #90 D → `task6-m3-remediation` → `task6-final-rc` (PR #91).
- **Merge order if approved:** bottom-up, each with the merge API at its approved head and the tree checks of `docs/TESTING_POLICY.md` §5. Then publish to the existing main game link per §6, after the deploy check with `test: false`.
- **Status:** none of this was started.

## 6. Preview
**`v42.21.0-rc.1`** (branch `task6-final-rc-preview`, commit `32ba537`, test build) is on the private test link at artifact version `1793746294-6a5d`. The production game link was not touched.


## 7. Release (2026-11-03, after the owner's approval)
- **Merged:** the stack, top-down and all clean; the merge commits are listed in `docs/TASK6_DECISIONS.md`. `main` = `d2159f8`, whose tree equals the candidate's.
- **Published:** `v42.21.0-ai-franchise` to https://claude.ai/artifact/GJG2k6eqG3qfeteJEbXvFq, artifact version 116, 165 files, byte-identical to `git archive d2159f8`. The test link was not touched.
- **Post-release verification:**
  - deploy check passed;
  - 320–430 px: 0 errors and no overflow;
  - full suite on `main`: 816 of 816;
  - harness check passed, with hashes identical to the candidate's;
  - saves 6/6;
  - season runs on 3 seeds with 0 problems.
- **Remaining limitations:** the accepted exceptions of §1 D and §3, which apply to this release only. The rookie's first-offseason age skip is unchanged from v42.17.0, by design.
