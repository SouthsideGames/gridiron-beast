# Task 7 — Consolidated Benchmark Plan (pre-registered, 2026-11-04)

**Status:**
- Written before any final-benchmark data exists, as the owner required under D7.
- Nothing here changes an approved threshold.
- The Task 6 exceptions accepted for v42.21.0 stay accepted exceptions. They are never reclassified as passing.
- The benchmark runs **once**, on the final Task 7 commit, after checkpoint C.

## 1. Builds and files

| Role | Build | Run files |
|---|---|---|
| **Baseline** | `v42.21.0-ai-franchise`, the published game. Its gameplay tree is the Task 6 release candidate (`341342f` / `1a70e32` = `1dd8fed` = `main` `d2159f8`) | the Task 6 final-validation files, label `rc` (see below) |
| **Candidate** | the final commit of `task7-free-agency` | `<dir>/t7-*` |

- **Baseline files:** the Task 6 final-validation run files are reused as they are: `rc-B`, `rc-H`, `rc-C`, `rc-CH`, `rc-drift-*`, `rc-contract-*` and `rc-con-*`.
- **Same seeds and flags:** the candidate runs the same jobs, seeds and flags with only `--root` changed.
- **Harness:** v4, unchanged. Task 7 adds a recording-only `fa` field per season. Removing it gives the v4 output exactly.

## 2. Seed sets (identical to the Task 6 final validation)

| Set | Seeds × seasons | Difficulty | Use |
|---|---|---|---|
| B | 1–60 × 10 | Pro | Development-set measures |
| H | 61–80 × 10 | Pro | Held-out confirmation for B measures |
| C | 106–115 × 20 | Pro | Long-term measures |
| CH | 116–125 × 20 | Pro | Held-out confirmation for C measures |
| Drift | 1–36 × 8 | Rookie, Pro, All-Star | Owner drift (Task 6 v6 method) |
| Contract | 1–8 × 8, plus 24-seed extensions on Rookie and All-Star | Rookie, Pro, All-Star | GDD §45.6 owner balance |

- **Total:** 255 jobs, two at a time.
- **Time:** about six hours, the same as the Task 6 run.

## 3. Hard gates (approved D7): pass or fail

| Gate | Exact test | Source |
|---|---|---|
| Integrity | 0 problems in every candidate run. This covers the soak invariants, the league invariants, the save round trip at every season boundary and `marketProblems()` on every season's `fa` record. | harness `problems`, `fa.marketProblems` |
| Cap | No club holds offers or signs when its usable cap cannot carry the reservation. The engine refuses such terms. **Measured:** 0 reservation or overcommit problems, and 0 Task 7 signings whose first-year charge exceeded usable cap. A club over the cap at the roster floor is a pre-existing Task 6 report item. It is counted against the baseline but is not this gate. | `fa.marketProblems`, the engine log |
| Rosters | Every club has 26–38 monsters at every season start, with a legal base lineup (`validateClubs` = []). | harness integrity |
| Legendary limits | 0 club-seasons with more than 1 offensive or 1 defensive legendary. | `fa.legends` |
| Determinism | `task6-harness-check` passes (non-interference and determinism) on seeds 1–2 × 2 seasons. One B seed run twice gives identical files apart from timings. | harness check |
| Performance | Stage P season time within **+10%** of v42.21.0, run interleaved. | `tools/task6-stage-p.mjs` |

## 4. Comparative gates: Task 6 regressions

**Tool and method:**
- `node tools/task6-compare.mjs --base=<m7>:rc --cand=<dir>:t7 --thresholds=docs/task6-phase0/thresholds.json`.
- The thresholds file is unchanged.
- The statistics are those of `docs/TASK6_PHASE0_METHODOLOGY.md` §4: matched seeds, a 95% bootstrap percentile interval with 2,000 resamples and a fixed generator, effect size, seeds moved.

**Gate:**
- A Task 6 measure is a **regression** when the tool classes it **worse**. "Worse" means:
  - its development-set interval (B, or C for long-term measures) excludes zero in the worse direction; **and**
  - the held-out set (H, or CH) moves the same way.
- **The gate fails if any measure in this list regresses.**

| Group | Measures (thresholds.json names and the Task 6 final-report rows) | Sets |
|---|---|---|
| Rebuilding (F1–F4) | mean rebuild length; share of rebuilds of 5+ seasons; recovery from ≤ 2 wins within 3 seasons; sales with a replacement within 4; weak position after a sale | C/CH (`task6-rebuild-diag`) |
| Rosters | persistent weak groups (absolute and position-relative); young-reserve growth; succession cover | B/H |
| Draft | misaligned picks; round-1 starts (season 1, within 2) | B/H, C |
| Contracts | 3-year share; largest expiry share | B/H |
| Ageing and retirement | starter age at seasons 10 and 20; retirements per season; veterans starting; physical change past onset | B, C |
| Gyms | gym win rate; gym title share; gym lead from season 8; tier order | C/CH (`task6-gym-dominance`) |
| League | league strength at season 20; mode stability; trade integrity | C, B |

**Accepted Task 6 exceptions:** every Task 6 "unmet target" is reported against its band, as Task 6 did. These are:
- ordinary titles and persistent losers;
- gym lead ≥ 6;
- young-reserve growth ≥ +3;
- persistent weak groups ≤ 8 / ≤ 5;
- young-player payments.

An exception is not reclassified when it is unmet. It **is** flagged if Task 7 makes it significantly worse.

## 5. Owner balance and drift: reported, not gated (D7)

**Measures, with the methods unchanged:**
- **Drift:** Rookie, Pro and All-Star, 36 seeds, seasons 1–8 (`task6-drift36-rc.mjs` method, candidate against `rc-drift-*`).
- **§45.6 contract:** 8 seeds, plus 24 on Rookie and All-Star (`task6-balance-gates.mjs --contract`).

**For each, the report shows:**
- the candidate value with its 95% interval;
- the change against v42.21.0 with its interval;
- the Task 6 ±5 classification, for information.

**Accepted exceptions:** the v42.21.0 exceptions are listed as accepted for v42.21.0:
- Rookie owner balance and drift;
- Pro drift;
- All-Star owner balance and the All-Star drift uncertainty.

**If Task 7 moves any of them significantly** (the interval of the change against v42.21.0 excludes zero), the report says so plainly and the owner decides. No balance value is tuned to move these numbers.

## 6. Free-agency measures: reported, no gate (specification "Simulation")

Each measure is per offseason, pooled over B and C, from the `fa` record:
- **Distribution:** signings by the owner and AI; by club type (gym, ordinary, owner); and by the signing club's strategy mode.
- **Competition:** bidders per signing; the share of signings with a rival offer; revisions per signing.
- **Terms:** salary against ask; years distribution; bonus use.
- **Renewals:** the share refused (a Task 7 calibration: tolerance 0.90).
- **Unsigned:** monsters left unsigned at the market's close.
- **Cap solvency:** committed/cap at the season start; clubs over the cap at the roster floor, against the baseline.
- **Age:** age of signings against the league's age distribution.
- **Legendaries:** distribution by club type.
- **Concentration and the draft:** championship concentration (top club's title share, gym title share); round-1 rookie starts (draft impact).
- **One position (D6):**
  - base-lineup holes and unavailable package slots per club-week (from the checkpoint B soak, eight seeds);
  - the gym element share.

## 7. Report and approval

- **Report:** `docs/TASK7_FINAL_REPORT.md`, with the tables of §§3–6.
- **Hard-gate failure or comparative regression:** stop and bring the evidence. Nothing is tuned to pass.
- **Merge and publish:** only on the owner's explicit approval.
