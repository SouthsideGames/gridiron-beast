# Task 7 — Free Agency Overhaul: Consolidated Benchmark Report (2026-11-04)

**Status:**
- Branch `task7-free-agency`, development only. Nothing is merged and nothing is published.
- **Benchmark build:** `9df9d50`. The final commit `3cc0459` adds only documentation and one interface wording change.
- **Method:** pre-registered in `docs/TASK7_BENCHMARK_PLAN.md`, including the §0 amendment for D8.
- **Verdict:** the hard gates pass. The **comparative gate fails**: nine Task 6 measures are classed *worse*. Under the plan (§7), nothing has been tuned. The evidence and the decisions are brought to the owner (§8).

## 1. Runs

- **Candidate:** 271 jobs on `9df9d50`, totalling 320 franchise runs (B 1–60, H 61–80, C 106–115, CH 116–125, drift 36 seeds × 3 difficulties, contract runs). Seeds and flags are the same as the Task 6 final validation.
- **Baseline:** the v42.21.0 (Task 6 RC) files, label `rc`, unchanged.
- **First run, build `875c976`:**
  - Stopped after 42 jobs, when the roster-minimum dead end appeared.
  - Kept as evidence in `bench-875c976`.
  - The runs it shares with the second run that never hit the dead end are identical in both, season by season.
- **Attribution run (diagnostic, not a gate):**
  - Build: the Phase 2 commit `df419d5`, which has one position per monster (D6), schema 9, contract accounting and salary persistence, but none of the market phases.
  - Seeds: B 1–40 and C 106–115.

## 2. Hard gates (D7)

| Gate | Result | Evidence |
|---|---|---|
| Integrity | **pass** | 0 problems and 0 errors in all 320 runs; 0 `marketProblems` over 1,200 offseason records |
| Cap | **pass** | 0 reservation or overcommit problems. No signing on any path exceeds usable cap (engine refusal, and tests). See §7.3 for the owner over the cap through staff raises. |
| Rosters | **pass** | every club 26–38 at every season start. The 6 dead ends of the first run are resolved (§6). |
| Legendary limits | **pass** | 0 club-seasons over 1 offensive or 1 defensive legendary |
| Determinism | **pass** | `task6-harness-check` (seeds 1–2) passes. Identical runs reproduce across builds. |
| Performance | **pass** | Stage P: 15.35 s/season against 14.65 (v42.21.0), interleaved base, cand, cand, base. That is +4.8%; the limit is +10%. |

**Board firings:** 29, all in contract runs, which have no board reset; v42.21.0 had 10. All-Star persistent accounts for 15 (8 at v42.21.0).

## 3. Comparative gate (Task 6 regressions): **FAIL**

**Method:** `task6-compare`, thresholds unchanged, 95% bootstrap with 2,000 resamples. A measure is "worse" when its development-set interval excludes zero in the worse direction **and** the held-out set agrees.

| Measure | v42.21.0 | Task 7 | Difference [95%] | Phase 2 only (attribution) |
|---|---|---|---|---|
| Rebuild recovery within 3 seasons (%) | 46.4 | 37.1 | **−9.3 [−13.5, −4.9]** | −2.4 [−7.3, 1.9] |
| Struggler starter age after 3 seasons | 25.7 | 26.4 | **+0.68 [0.53, 0.83]** | −0.02 |
| Persistent weak groups (%) | 10.6 | 12.3 | **+1.7 [0.4, 3.1]** | +0.2 [−1.3, 1.7] |
| Persistent weak groups with cap room (%) | 8.7 | 11.2 | **+2.5 [1.2, 3.9]** | **+1.5 [0.1, 2.9]** |
| Persistent weak groups, position-relative (%) | 13.9 | 14.8 | **+0.9 [0.5, 1.3]** | −0.3 |
| Young-reserve growth (3 seasons) | 2.58 | 2.44 | **−0.14 [−0.17, −0.11]** | +0.01 |
| High-potential growth (3 seasons) | 5.46 | 5.35 | **−0.11 [−0.18, −0.04]** | **−0.09 [−0.15, −0.03]** |
| Round-1 starter by year 2, late seasons (%) | 65.1 | 60.8 | **−4.3 [−7.5, −1.1]** | −0.4 |
| Generated gym starters, final (%) | 33.4 | 37.9 | **+4.6 [2.1, 7.0]** | **+5.5 [3.0, 8.1]** |

**Other movements (no gate class):**
- retirements per season −3.5;
- veterans starting +12.2 points;
- starter age at season 10: +0.9 years;
- 3-year contract share −4.9 points;
- hands-off owner win %, seasons 9–20: −7.5 [−13.5, −1.8] (Phase 2 alone: −14.8);
- gym lead at season 20: +2.3.

**Improved ("supported"):** succession cover and readiness, slowed ordinary clubs, maximum expiry share, improving 33-year-olds, physical change past onset.

**Reading the attribution:**
- **From the one-position foundation (D6):** three regressions appear already in Phase 2: generated gym starters, high-potential growth, and weak groups with room.
  - Each element now has species at only 4–5 positions, so gyms fill more starting slots with generated monsters (the element share fell to 21–55%).
- **From the market phases:** the other six regressions, and the ageing signs, appear only with the market. The mechanism the numbers point to:
  - AI clubs re-sign and buy veterans in free agency: signings average age 28.7, against a league average of 25.6, and 54% of signings are 29 or older;
  - fewer monsters retire, because unsigned retirement is now by personality (decision 26);
  - so veterans keep starting, starters are older, and rebuilding clubs recover more slowly.

## 4. Accepted Task 6 exceptions (not reclassified)

| Exception | v42.21.0 | Task 7 | Status |
|---|---|---|---|
| Ordinary persistent losers (≤ 50%) | 88.6 | 95.7 | unmet; +7.1 [0, 17.1], not significant |
| Ordinary title share (5–15%) | 1.5 | 1.5 | unmet; unchanged |
| Gym lead from season 8 (≥ 6) | 4.93 | 5.35 | unmet; better, +0.42 [0.04, 0.84] |
| Young-reserve growth (≥ +3) | 2.58 | 2.44 | unmet; **significantly worse** (flagged) |
| Persistent weak groups (≤ 8 / ≤ 5) | 10.6 / 8.7 | 12.3 / 11.2 | unmet; **significantly worse** (flagged) |
| Young-player payments | 53.5 | 52.8 | unchanged |

## 5. Owner balance and drift (reported, not gated)

**Drift, seasons 1–8, 36 seeds, owner win % against v42.21.0:**
- Rookie: −3.0 [−6.8, 0.7]
- Pro: −0.3 [−3.8, 3.5]
- **All-Star: −3.5 [−6.2, −0.3], significant.** The hands-off owner wins less on All-Star.

**§45.6, persistent against legacy (paired owner win %, seasons 1–8):**

| Difficulty | Task 7 | v42.21.0 (recomputed) |
|---|---|---|
| Rookie, 8 seeds | −4.6 [−13.5, 2.8] | +5.0 [0.5, 9.7] |
| Rookie, 24 seeds | −0.5 [−4.4, 3.1] | — |
| Pro, 8 seeds | −3.6 [−10.2, 2.2] | +2.4 [−6.0, 10.5] |
| All-Star, 8 seeds | −0.5 [−10.0, 7.7] | −0.3 [−8.4, 6.0] |
| All-Star, 24 seeds | −2.9 [−8.6, 2.2] | +0.4 [−2.9, 3.8] |

- All point estimates are within ±5.
- The Rookie excess that was accepted for v42.21.0 (+5) is gone.

## 6. D8: the roster-minimum dead end (owner decision, 2026-11-04)

**First run:** 6 of 20 twenty-season runs (seeds 106, 109, 112, 114, 116, 123) could not start season 19 or 20. The owner had 23–25 monsters with no cap room, and releases below 26 were refused.

**Second run, with D8:**
- All 6 complete 20 seasons.
- The hands-off owner made 35 releases in total, at most 7 in one run.
- AI clubs never needed a floor release.
- No other run changed.
- 0 new roster or cap violations.

**Interface:**
- The *Roster minimum* panel and the confirm-before-release action were checked at 320, 390 and 430 px on the real seed-112 dead-end save. No overflow, no page errors.
- On that save, the club gets back to 26 within the cap and the season starts.

## 7. Free-agency measures (B + C, 1,200 offseasons)

### 7.1 Signings and terms

- **Volume:** 29.5 signings and 81 offers per offseason.
- **By club type:** ordinary clubs 53.0%, gyms 46.2%, the hands-off owner 0.7% (it signs only to reach the minimum).
- **Per club-season:** ordinary 2.24, gym 1.70.
- **By strategy mode:** Compete 39.9%, Contend 27.3%, Retool 15.9%, Rebuild 16.1%.
- **Competition:** 2.5 bidders per signing. 69% of signings had a rival offer, with 0.82 revisions per signing.
- **Years:** 1 year 38%, 2 years 22%, 3 years 39%.
- **Signing bonuses:** 0%; the AI never offers one.
- **Mean salary:** 33,066.

### 7.2 Renewals and the market

- **Renewals refused:** 4.6%.
- **Unsigned at close:** 35 monsters on average.
- **Extensions:** none recorded in the offseason. AI clubs do not extend.

### 7.3 Cap

- Mean committed is 91% of the cap.
- Only the owner is ever over the cap at an offseason's end, through staff raises, which D2/D4 left outside the affordability rule with the commissioner as safety net.
- **Same measure on both builds (seeds 1–8):** v42.21.0 72% of offseasons (median 78,010 over); Task 7 59% (median 47,570).
- AI clubs: 0.

### 7.4 Legendaries and age

- **Legendaries:** only the gyms' protected ones. No owner or ordinary club acquired one in the benchmark.
- **Age:** described in §3.

### 7.5 One position (D6, checkpoint soak, 8 seasons, seeds 1, 2, 7, 8)

- **Base-lineup holes:** 10 owner club-weeks (CB2, LB2, WR2) and 1 AI club-week.
- **Unavailable package slots:** 18 owner and 10 AI club-weeks.
- **Gym element share:** 21–55%.

## 8. Decisions for the owner

1. **Comparative regressions.**
   - **(a)** Accept them as Task 7 effects with an updated baseline; or
   - **(b)** authorise a targeted follow-up on the mechanism (AI veteran preference in free agency and unsigned retirement), to be measured against the same gates before release; or
   - **(c)** revisit D6 for the three regressions that come from it.

   No value has been changed to move these numbers.
2. **All-Star drift (−3.5, significant):** accept, or include it in 1(b).
3. **The draft and staff raises are not cap-checked.** D4 named trades and Clash recruits.
   - Keep this, with the commissioner as safety net; or
   - extend the affordability rule to draft picks and staff renewals.
4. **AI signing bonuses and extensions are never used.** Keep this, or have the AI use them.

## 9. Files

- **Benchmark:** `/home/claude/t7/bench` (candidate) and `/home/claude/t7/bench-875c976` (first run).
- **Attribution:** `/home/claude/t7/attr`.
- **Evaluation:** `/home/claude/t7/eval`:
  - `compare.md` and `compare-attr.md`;
  - `rebuild-*.json` and `gym-*.json`;
  - `drift-t7.json`;
  - `contract/contract2.json`;
  - `fa-metrics.json`.
- **Tests:** full suite 847/847 on `3cc0459`.
