# Task 6 Phase 0 — Report

**What this is.** Phase 0 (benchmark foundation), authorised by the owner on 2026-10-30. It is observational only:
- no game code changed;
- nothing merged;
- nothing published.

**Read with:**
- `docs/TASK6_PHASE0_METHODOLOGY.md` (how);
- `docs/task6-phase0/` (the baseline record);
- `docs/TASK6_APPROVED_SPECIFICATION.md` (what is measured and why).

## 1. PR and commits
- **PR:** [#85](https://github.com/SouthsideGames/gridiron-beast/pull/85), open, do not merge.
- **Branch:** `task6-phase0`, stacked on `task6-plan` (PR #84), which is stacked on `post-trading-benchmark` (PR #83). All open and unmerged.
- **Commits:** the harness tree used for every baseline run is **`d6ecec1`**, frozen in its own worktree during the runs. The PR head carries this report and the record.

## 2. Files added or modified

| File | Change |
|---|---|
| `tools/ai-franchise-benchmark.mjs` | Harness v3 → **v4**. Every v3 field is produced unchanged. Each run gains `v4`: a season-end snapshot of every league and owner monster (22 columns, including attributes, contract, injury record and years in the league), the season's results, each club's gym tier and strategy record, and the final-state hash. The file carries `hash` and `hashV3` |
| `tools/task6-harness-check.mjs` | New: non-interference, determinism, v3 reproduction |
| `tools/task6-baseline.sh` | New: runs the baseline jobs (resumable, parallel lanes) |
| `tools/task6-analyze.mjs` | New: every Task 6 measure per seed, plus pooled distributions |
| `tools/task6-compare.mjs` | New: phase report, baseline against candidate, per pre-registered measure, with outcome classes |
| `tools/task6-balance-gates.mjs` | New: §45.6 contract and owner drift gates |
| `tools/task6/stats.mjs` | New: paired bootstrap, effect size, classification |
| `tools/task6-stage-p.mjs` | New: Stage P performance timing |
| `tools/task6-phase0-report.mjs` | New: writes `docs/task6-phase0/` |
| `tests/task6-phase0.test.js` | New fast tests: 6 tests, synthetic data |
| `docs/TASK6_PHASE0_METHODOLOGY.md` | New: methodology |
| `docs/task6-phase0/*` | New: thresholds, baseline tables and JSON, per-seed CSV, scenarios, gates, run hashes, harness check, Stage P |
| `docs/TASK6_PHASE0_REPORT.md` | This report |

Planning-branch documents (decision record and approved specification) arrive through the merge of `task6-plan`.

## 3. Production game behaviour is unchanged
- **No game files touched.** `git diff fc19d34 HEAD -- src index.html` is empty: no file under `src/`, and no game entry point, differs from published v42.17.0. Phase 0 changes only `tools/`, `tests/` and `docs/`.
- **No interference** (`docs/task6-phase0/harness-check.json`). Seeds 1–3 × 3 seasons, played by the game alone and under harness v4, end in the **identical franchise** (sha-256 of the whole franchise object, less `uid` and `createdAt`, which differ on every run of the game itself).
- **Full test suite:** 777 of 777 pass (§11).
- **The published game** (artifact version 115) was not touched.

## 4. Harness v3 against v4: reproducibility

| Check | Result |
|---|---|
| v4's `hashV3` against the published Task 5.5 v3 hashes (`docs/post-trading-benchmark/run-hashes.json`), same seed groups: B 1–10 … 51–60, C 106–108, 109–110 | **8 of 8 identical** |
| Determinism: harness v4 run twice, seeds 1–3 × 3 seasons (`hash` and `hashV3`) | **Identical** |
| Determinism at scale: B 51–60 × 10 seasons re-run into a separate file | **Identical** (`a89ccdb3…`) |
| Integrity across all 20 harness files (140 seed-runs) | **0 problems, 0 errors** |

Every file's hash is in `docs/task6-phase0/run-hashes.json`.

## 5. Baseline results (v42.17.0, harness v4)

The full tables are in `docs/task6-phase0/baseline.md`. Per seed: `per-seed.csv`. Selected results (development set / held-out set):

| Area | Measure | Baseline | Held-out | Target |
|---|---|---|---|---|
| Ageing | Starter mean age, season 10 (B) | 29.9 | 29.8 | 27–30 |
| | Starter mean age, season 20 (C) | 35.1 | 35.6 | 27–30 |
| | Starters aged 33+, season 20 (C) | 64.8% | 67.1% | ≤ 18% |
| | Monster-seasons aged 33+ still improving (B) | 24.9% | 25.0% | ≤ 2% |
| | Physical change by seasons past public onset (C, pooled) | +0.29 (0), −0.08 (1), −0.40 (3), −0.47 (5) | similar | proposed: ≤ −1.5 at 3, ≤ −2.5 at 5 |
| | Retirements | none (no retirement in v42.17.0) | — | 20–50 a season |
| Draft | Round-1 starter for the drafting club, draft year + 2 (B) | 33.0% | 32.9% | proposed ≥ 44% |
| | The same, drafted year 12+ (C) | 14.4% | 14.5% | ≥ 30% |
| | Round-1 starting in the first season (B; rookie strength) | 29.8% | 29.9% | report |
| Succession | 30+ starters with a successor, Task 4 definition (B / C) | 17.6% / 11.4% | 17.2% | ≥ 40% / ≥ 30% |
| | The same, approved R1 definition including potential (B) | 36.1% | 35.9% | report |
| | Successor ready, within 4 (B) | 5.3% | 5.8% | report |
| | Young (≤ 24) trade payments (B) | 48.2% | 49.3% | report |
| Weakness | Persistent weak group, club-relative (B) | 11.9% | 12.6% | ≤ 8% |
| | Persistent weak with cap room (B) | 9.8% | 10.4% | ≤ 5% |
| | Persistent weak, position-relative (B) | 15.7% | 15.8% | −30% |
| | Misaligned picks, position-relative (B) | 10.6% | 9.1% | proposed ≤ 7.4% |
| Contracts | Share on 3-year deals; largest single-year expiry share (B) | 0%; 54.0% | 0%; 53.4% | present; report |
| Development | Young reserves' 3-season gain (B) | +0.75 | +0.77 | ≥ +3 |
| | High-potential against low-potential 3-season gain (B) | +2.24 against +2.69. High-ceiling prospects gain less today; likely cause: they are more often reserves, who barely develop | — | high > low |
| | Young starters' 3-season gain (B) | +3.73 | — | report (the gap reserves must close) |
| | Evolutions per club-season (B) | 0.99 | 0.98 | report |
| Balance | Gym win rate against ordinary AI clubs, head to head (C) | **84.7%** | 84.3% | ≥ 60% |
| | Gym share of AI titles (C) | 98.9% | 96.0% | ≥ 75% |
| | Gym team-overall lead: minimum from season 5 / from season 8 (C) | **4.6** / 6.3 | 4.1 / 6.5 | ≥ 6 (see §8) |
| | Gym tier order held per seed (C) | 90% of seeds | 70% | all (see §8) |
| | Ordinary persistent losers (C) | 90.0% | 97.1% | ≤ 50% (evaluation) |
| | Ordinary title / playoff share (C) | 1.1% / 15.5% | 4.1% / 17.1% | 5–15% / 20–30% (evaluation) |
| | Gym lead, season 20 (C) | 15.2 | 14.7 | 6–12 (evaluation) |
| | Generated veterans among gym starters, season 20 (C) | 58.0% | 58.6% | report |
| | Ordinary club-seasons under the XP slowdown (C) | 41.4% | 33.5% | report |
| Monitor | Distinct champions per 20 seasons (C) | 5.8 | 6.2 | — |
| | Hands-off owner win rate, seasons 9–20 (C) | 28.3% | 39.6% | — |

**Stress scenarios** (seeds 1–5 × 6 seasons; `scenarios.json`): all six (aging, expiring, thin, injuries, rebuild, picks) ran clean, with 0 problems.

**These baselines reproduce Task 5.5 where the definitions match:**
- starter age 35.1;
- 33+ starters about 62–65%;
- succession 17.6%;
- persistent weak 11.9% and 9.8%;
- young-reserve gain +0.7;
- gym share 95–99%.

## 6. Owner difficulty drift and the §45.6 contract (`docs/task6-phase0/gates.json`)

**Contract (§45.6)**, v42.17.0, seeds 1–8 × 8 seasons. It **holds on every difficulty:**

| Difficulty | Owner win rate: today → persistent | AI mid-season mean: today → persistent | Pass |
|---|---|---|---|
| Rookie | 75.5% → 76.4% (+0.9) | 65.0 → 65.1 (+0.1) | yes |
| Pro | 59.9% → 59.5% (−0.4) | 67.4 → 67.3 (−0.1) | yes |
| All-Star | 39.1% → 37.0% (−2.1) | 70.4 → 70.8 (+0.4) | yes |

**Drift baseline** (balance-compare persistent, board reset, seeds 1–12 × 20 seasons). This is the reference every phase is compared with:

| Difficulty | Owner win rate, seasons 1–8 (spread across seeds) | Seasons 9–20 |
|---|---|---|
| Rookie | 76.9% (4.3) | 45.0% (7.1) |
| Pro | 61.0% (8.4) | 35.6% (7.4) |
| All-Star | 39.5% (11.9) | 25.8% (7.9) |

**What the drift data shows.**
- The drift tool was run baseline against itself as a sanity check: zero drift on every difficulty.
- **The hands-off owner's win rate falls steeply after season 8 on every difficulty**, already on v42.17.0. The league's anchors grow while the passive owner's roster ages without response. This is the proxy limitation the owner asked to have documented (methodology §5). It is why seasons 9–20 are report-only.
- **Sensitivity.** With 12 seeds and per-seed spreads of 4–12 points, the seasons-1–8 interval will be about ±3 points on Rookie and up to about ±6 on All-Star, depending on how strongly paired the seeds remain.
- **Consequence:** on All-Star the ±5 gate will often be "pass, interval reaches past the band: escalate". See the recommendation in §8.

## 7. Final proposed gates, targets and monitors
Machine-readable: `docs/task6-phase0/thresholds.json`, version 1.

**Hard gates:**
- integrity 0;
- determinism and non-interference (`task6-harness-check`; the repeat file);
- full suite, none weakened;
- trading tests;
- save compatibility;
- §45.6 on every difficulty (±5 / ±2);
- owner drift for seasons 1–8 within ±5 on every difficulty;
- Stage P ≤ +10%. The baseline is **13.2–13.7 s per season** (seeds 1–3 × 6 seasons, 2 repetitions, run alone; `stage-p.json`);
- phone-width browser checks.

**Targets.** As approved in Groups 1–4, with the post-baseline re-basing below (marked `proposed`).

**Evaluation measures** (ordinary-club health). Not pass/fail until shown achievable.

**Monitors:**
- distinct champions;
- the hands-off owner's win rate in seasons 9–20;
- league starter strength;
- team-overall spread;
- playoff representation;
- unusual patterns.

**Proposed for the owner's review** — re-basing, not changes to approved values (methodology §8):
1. **Round-1 conversion.** The spec's targets were written for the Task 4 measure.
   - Starter for the drafting club at draft year + 2: baseline 33.0%, proposed target **≥ 44%** (the spec's +10.7-point intent).
   - Late picks: ≥ 30% (baseline 14.4%, as specified).
2. **Succession.** The spec's ≥ 40% / ≥ 30% targets apply to the Task 4 definition (baseline 17.6% / 11.4%), as written. The approved R1 definition, which also counts potential (36.1%), is reported.
3. **Misaligned picks.** The position-relative yardstick's baseline (10.6%) is already inside the spec's 15% (written for the club-relative 24.5%). Proposed: **≤ 7.4%** (−30%), with no fall in pick overall.
4. **Physical decline.** The aggregate measure already meets "≤ 0". Proposed pooled rule: never positive from 1 season past the public onset; **≤ −1.5 at 3 seasons, ≤ −2.5 at 5**.

## 8. Limitations and unexpected findings

1. **Conflict in the approved gym floor: lead ≥ 6 from season 5.**
   - v42.17.0 is at 4.7, 5.6 and 5.2 in seasons 5–7 (C) and 4.3, 5.1 and 4.8 (CH), and above 6 from season 8.
   - The approved plateau changes nothing before season 10, so this item cannot be met as worded without a change nobody has proposed.
   - **Recommendation:** apply the ≥ 6 floor from season 8, and require "no lower than v42.17.0" in seasons 5–7. Not changed: owner decision.
2. **Gym tier order per seed.**
   - The order holds in 90% (C) and 70% (CH) of baseline seeds; the inversions are within 0.5 points between neighbouring tiers.
   - Pooled across seeds the order holds: early 77.9 < mid 80.7 < late 81.8.
   - **Recommendation:** judge tier order on pooled means, and report the per-seed share against baseline.
3. **Drift resolution on All-Star.** Per-seed spread is 11.9 points.
   - **Recommendation:** run the All-Star drift set on 24 seeds instead of 12 (about +1 hour per phase), so the ±5 gate can resolve.
4. **Hands-off owner proxy.** The late-run collapse (61% → 36% on Pro) is a property of the passive policy as much as of the game. Drift for seasons 9–20 is a monitor, not a difficulty measurement.
5. **Seed-set variance.** The held-out sets differ noticeably from the development sets on some balance measures:
   - ordinary persistent losers 90% against 97%;
   - owner win rate, seasons 9–20: 28% against 40%.
   - This is why long-term claims need C and CH to agree and are never made from 5 seeds.
6. **Definitions.** Starters are counted by overall, not depth chart. The public onset reads current durability. Career length is the game's `yearsPro`. Retirement measures are empty at baseline.
7. **Yardstick independence.** Task 6 measures are computed from the harness snapshot. The carried Task 4/5 measures (and the draft fields `needAtPos`/`misalignedPct`) use the game's `positionNeeds`, which Phase B will change, so those move with the game.
8. **What needs adding in A-1.**
   - **Old-save transition:** the transition target (peak / steady retirements ≤ 2.5×) needs a dedicated old-save run; harness v4 starts new franchises. A-1 must add a tool that plays a v42.17.0-era save forward under the new rules.
   - **Retirement departures:** A-1 must record them with reason `"retired"` (the spec's exit path), which is what the harness counts.
9. **Stage P repeatability.** The two repetitions differ by 4%, so a +10% gate is tight. **Recommendation:** use 3 repetitions and the median.

## 9. Estimated cost of future phase testing
Measured on this 2-CPU container, two lanes:

| Run | Lane time | Wall time (2 lanes) |
|---|---|---|
| B 1–60 × 10 | 2.6 h | 1.3 h |
| H 61–80 × 10 | 0.9 h | 0.45 h |
| C 106–115 × 20 | 1.0 h | 0.5 h |
| CH 116–125 × 20 | 0.9 h | 0.45 h |
| Stress scenarios | 0.7 h | 0.35 h |
| Contract (3 difficulties × 2 modes × 8 seeds × 8 seasons) | 1.5 h | 0.75 h |
| Drift (3 difficulties × 12 seeds × 20 seasons) | 3.0 h | 1.5 h |
| Harness check, Stage P (alone), full suite (alone) | — | about 45 min |

**Per phase:**
- **Full phase report:** about **5.5–6 hours** wall time, or about 6.5 hours with the 24-seed All-Star drift.
- **A-2 calibration rounds:** each brake/runaway width variant on C plus a contract check takes about 1.25 hours. Aligned thresholds (3 variants) take about 4 hours per round; a full 3 × 3 grid takes about 11 hours. Budget at least two rounds.
- **Slower simulation:** game changes that add work (retirement, planning) slow every run proportionally. Stage P measures this.

## 10. Is Phase A-1 ready to begin?

**Yes, technically, subject to the owner's decisions.** The harness, baselines, tools and gates are in place:
- v4 reproduces v3 exactly;
- the harness is shown not to interfere;
- the baseline is clean and deterministic;
- the contract holds on v42.17.0.

**Decisions to take with the A-1 authorisation:**
1. Approve the thresholds (version 1), including the four proposed re-basings (§7).
2. Decide the gym-floor conflict: the lead from season 8, and tier order on pooled means (§8.1–8.2). This affects A-2, not A-1.
3. Decide whether the All-Star drift set grows to 24 seeds (§8.3).
4. Note that A-1 includes the old-save transition tool and the `"retired"` departure reason (§8.8).

Phase A-1 has not been started.

## 11. Full test suite
- `npm test` was run alone, after the baselines, on the Phase 0 code: **777 tests, 777 pass, 0 fail**, in 27.9 minutes.
- The count is higher than the 671 in `docs/TESTING_POLICY.md` because Tasks 5 and 5.5 and this phase have since added tests.
- The new fast tests (`tests/task6-phase0.test.js`, 6 tests) pass.
