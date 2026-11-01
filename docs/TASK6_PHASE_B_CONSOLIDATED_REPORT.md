# Task 6 Phase B — Consolidated Validation Report (2026-11-01)

**Build under test:** branch `task6-phase-b`, commit **`4f7919d`**. This is Phase B, plus the revised draft weights (owner decision of 2026-10-31, A + B), plus the both-ways AI–AI trade band fix (owner-approved 2026-11-01).

**Status:**
- Not merged. Production and the main game are untouched.
- Phase C has not begun.
- Every approved rule, threshold and measurement definition is unchanged, apart from the two the owner approved: the draft weights, and thresholds version 5 (succession judged on the R1 definition).

**Baseline:** the frozen v42.17.0 Phase 0 runs, on identical seeds throughout.

**Private preview:** `v42.18.3-dev.b2` (branch `task6-phase-b-preview2`), on the private development test link, artifact version `1793566079-7411`. It loads a save at 390 px with 0 errors.

---

## 1. Gate summary
### 1.1 Passing
| Gate | Result |
|---|---|
| Integrity, legal rosters and cap | 0 problems and 0 errors in all 41 validation runs, plus 22 investigation runs |
| Determinism | B 51–60 run twice gives the same hash. The harness check passes (non-interference and determinism). 8-season runs reproduce seasons 1–8 of 20-season runs exactly |
| Save play-through and round trip | 6 of 6 saves (owner-only, league, mid-season, offseason, 15-season) |
| Full test suite | **795 of 795** |
| Trading tests (Task 5) and the new trade-band tests | inside the suite: pass |
| §45.6 contract, Rookie | owner +4.2 (matched +4.2); AI +0.5 |
| §45.6 contract, Pro | owner −2.9 (matched +0.5); AI +0.3 |
| Owner drift, All-Star (24 seeds) | −0.1 [−4.3, +4.2] |
| Stage P | 12.96 against 12.87 s per season: **+0.7%** (≤ +10%) |
| Phone-width UI | no screen changed; the preview renders HQ, roster and offseason at 390 px with 0 errors |
| Phase B: misaligned picks | **4.3%** (≤ 7.4; v42.17.0 10.6); held-out seeds agree |
| Phase B: pick quality | round-1 overall 63.2 (v42.17.0 61.0; must not be lower) |
| Phase B: succession cover, R1 definition (v5) | **49.4% (B) / 39.4% (C)** (≥ 40 / ≥ 30) |
| Phase B: contract lengths | 1 / 2 / 3 seasons: 11.8 / 33.6 / 54.6% (all present) |
| Phase B: expiries staggered | largest year 52.0% (v42.17.0 54.0) |
| Round-1 starting for his club by year + 2 / late classes (C) | 57.6% (≥ 44) / 63.1% (≥ 30) |
| A-1 targets carried | starters aged 33+ at season 20 9.2% (≤ 18); retirements 21.6 a season (20–50); veterans still starting 84% (≥ 50); no improvement past onset |

### 1.2 Failing
| Gate | Result | Finding |
|---|---|---|
| **Owner drift, Pro** (seasons 1–8, ±5) | **−7.6 [−11.9, −3.7]**, 12 seeds | **Consistent, not variance** (§2). On 36 identical seeds: −6.2 [−9.2, −2.8]. Present in every Phase B build, and at A-1 (−7.9). The draft change did not cause it |
| **§45.6 contract, All-Star** (owner ±5) | **+6.6** (matched +7.9; AI −0.5), on the pre-registered 8 seeds | The owner does *better* in the persistent league than in the old-style league. On 24 identical seeds: **+3.2 [+0.2, +6.2]**, inside ±5 but with the interval past the band. Seeds 1–8 alone give +6.6; seeds 9–16 give 0.0 and 17–24 give +2.6. The previous build on the same 24 seeds gave +0.4. The pre-registered gate fails as written |

### 1.3 Explicitly deferred (owner decisions; documented as unmet, thresholds unchanged)
| Item | Current reading | Requirement | Deferred by |
|---|---|---|---|
| Owner drift, Rookie | −2.7 [−6.1, +1.4]: inside the band on this run (it was −6.0 and −6.3 on earlier builds) | ±5 | Decision of 2026-10-31 (1A); re-measured after Phase C. The swing shows how noisy the 12-seed gate is |
| Gym lead, minimum from season 8 | **5.3** | ≥ 6 | 2026-10-31 (2A): **unmet** |
| Gym lead, seasons 5–7 | **3.9** | ≥ 4.6 (v42.17.0) | 2A: **unmet** |
| Gym lead, season 20 (evaluation) | 6.4 | 6–12 | inside |
| Gym win rate / title share / tier order | 82.0% / 99.5% / held (pooled) | ≥ 60 / ≥ 75 / held | pass |
| Ordinary clubs: persistent losers / titles / playoff berths (evaluation) | 91.4% / 0.5% / 19.2% | ≤ 50 / 5–15 / 20–30 | **unmet** (Phases C–D) |
| Persistent weak groups, club-relative / with cap room | 11.2% / 9.6% | ≤ 8 / ≤ 5 | **unmet** (R5 is Phase C) |
| Persistent weak groups, position-relative | 13.9% (−11.5%) | −30% | **unmet** |
| Young players in AI–AI payments | 49.4% | below baseline (48.2) | **unmet** (no change) |
| Young reserves' 3-season gain | 0.66 | ≥ 3 | Phase C target (development slots) |

**Accepted by the owner (decision 4):** rookie strength. 53.8% of round-1 picks start in their first season.

**Secondary diagnostic (decision 5):** succession cover on the Task 4 definition is 27.4% (B), against v42.17.0's 17.6%.

---

## 2. Pro owner drift: controlled investigation
**Design.**
- Pro, hands-off owner, persistent league with the board reset. Seasons 1–8, the gate window.
- Identical seeds for v42.17.0 and for each Phase B build:
  - `pb`: first Phase B build;
  - `pb2`: revised draft weights;
  - `pb3`: plus the trade fix, the current build.
- The sample was tripled from 12 seeds to 36: seeds 13–36 were added.
- Win rate is compared seed by seed, with a 95% bootstrap interval (2,000 resamples).
- Check that the shorter runs are valid: an 8-season run reproduces the first 8 seasons of a 20-season run exactly (48 of 48 seasons identical).

**Against v42.17.0** (seasons 1–8, owner win-rate difference in points):

| Build | Seeds 1–12 | Seeds 13–24 | Seeds 25–36 | **All 36** |
|---|---|---|---|---|
| `pb` (first build) | −4.9 [−9.5, 0.0] | −5.9 [−10.3, −1.6] | −3.8 [−9.4, +2.1] | **−4.9 [−7.7, −2.0]** |
| `pb2` (revised draft) | −7.2 [−10.3, −4.0] | −6.2 [−11.1, −1.0] | −6.2 [−12.8, 0.0] | **−6.6 [−9.3, −3.5]** |
| `pb3` (current) | −7.6 [−11.9, −3.7] | −7.6 [−13.0, −2.0] | −3.2 [−9.3, +3.4] | **−6.2 [−9.2, −2.8]** |

**Build against build, on the same 36 seeds:**

| Comparison | Difference |
|---|---|
| `pb2` vs `pb` | −1.7 [−4.4, +0.7] |
| `pb3` vs `pb2` | +0.4 [−1.7, +2.6] |
| `pb3` vs `pb` | −1.3 [−3.6, +1.2] |

**Season by season** (36 seeds; win % with owner / AI team overall):

| Season | v42.17.0 | `pb` | `pb2` | `pb3` |
|---|---|---|---|---|
| 1 | 64.5% (64.3/63.0) | 66.0% (64.6/63.0) | 63.0% (64.7/63.0) | 62.7% (64.7/63.0) |
| 2 | 54.3% (66.4/65.2) | 60.2% (66.9/65.1) | 57.1% (66.7/65.1) | 58.0% (66.7/65.1) |
| 3 | 70.7% (67.9/66.9) | 71.3% (67.9/66.8) | 69.4% (68.0/66.8) | 67.3% (67.8/66.8) |
| 4 | 59.9% (68.4/67.9) | 56.8% (68.3/67.8) | 57.7% (68.4/67.9) | 57.7% (68.1/67.8) |
| 5 | 65.1% (69.0/69.2) | 64.8% (68.3/68.7) | 64.8% (68.5/68.7) | 59.3% (68.2/68.8) |
| 6 | 55.2% (69.0/69.9) | 48.8% (68.5/69.7) | 43.2% (68.1/69.7) | 47.5% (68.1/69.7) |
| 7 | 67.9% (69.7/71.0) | 42.6% (68.0/70.5) | 47.8% (68.3/70.4) | 44.8% (67.9/70.4) |
| 8 | 45.4% (69.3/71.7) | 33.6% (67.8/71.3) | 27.5% (68.0/71.4) | 36.4% (67.8/71.4) |

**Conclusions.**
1. **The Pro failure is consistent, not variance.**
   - Every Phase B build is 5–7 points below v42.17.0 on 36 seeds, and every interval lies wholly below zero.
   - The first build's 12-seed "pass" (−4.9) was the luckiest of three 12-seed slices; its 13–24 slice fails on its own.
2. **It is not a regression from the draft revision or the trade fix.** The build-to-build differences (−1.7, +0.4) are small and their intervals contain zero.
3. **The shortfall is entirely in seasons 5–8.**
   - Seasons 1–4 match v42.17.0.
   - From season 5 the hands-off owner's team falls 0.8–1.8 overall behind v42.17.0's while the AI holds its target. This is A-1's ageing of the owner's starting roster, the same mechanism as Rookie.
   - A-1 measured Pro at −7.9; the A-1 decision record already names "Rookie and Pro difficulty drift" as the binding issue.
4. **Nothing was changed.** The difficulty rules and the ±5 requirement are untouched.
   - The options are the ones already set out for Rookie: re-measure after Phase C (the owner-side development tools arrive there), or a difficulty-curve recalibration.
   - **Owner decision needed:** whether Pro joins Rookie as binding and deferred until after Phase C.

**Sample size.** The 12-seed gate moves by ±3 points between builds that do not differ (Rookie went −6.3, −6.0, then −2.7). For the post-Phase C re-measurement, 36 seeds (seasons 1–8) give an interval about half as wide at a third of the cost of 20-season runs. A methodology change like this needs the owner's approval.

## 3. AI–AI trade band fix (owner-approved)
**Change** (`league-trades.js`, `inBand`): the value a club receives over what it gives must lie in 0.85–1.15 **both ways**. Before, only one direction was checked, so a deal at 0.85 one way stood at 1.176 the other.

**Regression tests** (`tests/ai-trade-band.test.js`):
- the boundaries: 1.15 and its inverse inside; 1.151, 0.869 and the old 0.85 case outside; nothing-for-something refused;
- every deal in four prepared offseason windows is fair both ways;
- the original league test (`league-careers`) now passes.

**Trading behaviour, same 70 seeds and 800 seasons, previous build against fixed build:**

| Measure | Before | After |
|---|---|---|
| AI–AI deals | 3,049 | 2,930 |
| Deals per season | 3.81 | 3.66 (**−3.9%**) |
| Share in season | 32.1% | 30.5% |
| Kinds: swap / swap + picks / picks | 1,239 / 1,793 / 17 | 1,165 / 1,758 / 7 |
| Value ratio range | 0.871–1.178 | 0.869–1.153 |
| **Deals outside the band either way** | **464 (15%)** | **4**, and these are only the 0.1 rounding of the logged values |
| Young players (24 or under) in payments | 48.3% | 49.0% |
| Deals that give the buyer a starter | 88.8% | 90.5% |

The fix removes exactly the one-sided deals and nothing else; the mix of deals is unchanged. The balance gates moved after it (Rookie drift −6.0 → −2.7, All-Star contract −1.3 → +6.6), but on Pro, where it was examined season by season, owner and AI team overall stayed within 0.3 of the previous build. That fits the noise of the small-sample gates, as §2 shows for Pro.

## 4. Draft weights (owner decision A + B)
| | v42.17.0 | First build | **Current** |
|---|---|---|---|
| Misaligned picks | 10.6 | 12.1 | **4.3** |
| Round-1 overall | 61.0 | 63.3 | 63.2 |
| Succession cover, R1 definition, B / C | 36.1 / 25.1 | 51.3 / 40.9 | 49.4 / 39.4 |
| Persistent weak groups, position-relative | 15.7 | 15.0 | 13.9 |

## 5. Modified tests still catch their regressions (mutation check)
Each test was run against one deliberately broken game at a time (`final/mutations.json`):

| Mutation | Test | Caught |
|---|---|---|
| One-way value band (the v42.17.0 defect) | trade band boundaries | yes |
| Nobody retires | retirement pass | yes |
| The owner is not told of his retiree | retirement pass | yes |
| Protected monsters not skipped by retirement | retirement pass | yes |
| A traded monster not marked with his seller | AI–AI trades | yes |
| A trade not written to the monster's history | AI–AI trades | yes |
| Media boost not applied | media day | yes |
| Media cap ignored | media day | yes |
| Boosts of one nature not added up | media day | **no**: this seed asks no two questions of one nature, and the original assertion could not catch it either |

The deterministic retirement test (a fixed draw of 0.5) keeps the original intent: old monsters retire, the owner is told, protected monsters never retire, and legend stubs and the registry hold. It no longer depends on which seed happens to land.

## 6. Decisions requested
1. **Pro owner drift:** consistent shortfall of about 6 points, caused by owner ageing (A-1). Should it be binding and deferred until after Phase C, like Rookie?
2. **All-Star §45.6 contract:** fails on the pre-registered 8 seeds (+6.6), passes on 24 seeds (+3.2 [+0.2, +6.2]). It is the owner doing better than the old-style league, not worse. How do you want it classified?
3. **Optional:** a 36-seed, seasons 1–8 drift sample for the post-Phase C re-measurement (a methodology change).
