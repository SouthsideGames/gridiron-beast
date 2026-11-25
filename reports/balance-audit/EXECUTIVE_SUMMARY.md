# Gridiron Beast balance and simulation audit: executive summary

**Date:** 2026-11-25, 13:04–17:00 (Eastern).
**Auditor:** Claude, working autonomously.
**Scope:** the audit brief of 2026-11-25. Nothing was merged, published or deployed, and no save or cloud data was touched.

## Baseline

| | |
|---|---|
| Game version | `v43.50.0-sideline` (2026-11-25) |
| Starting commit | `58c33ee9a9b53f10d1d0ea2683bf5c11a91beccb` (`main`, PR #189 merge) |
| Audit branch | `audit/balance-2026-11-25`. `git diff 58c33ee -- src index.html` is **empty**: no gameplay code was changed |
| League | 32 clubs, 14-game season (PR #165), in-game rotation and injuries (PR #125) |
| Franchise length | **15 seasons** (`CAREER_SEASONS = 15`). The brief's 20 cannot be reached: the production lifecycle refuses a 16th season |
| Task 8 (catalogue) | **Implemented:** 72 ability families, 120 Basics, 12 elements with 16 species each, Tempers in place of Natures. Formally still open in the docs (`TECHNICAL_ISSUES.md` T-3). No finding is provisional for catalogue reasons |

## Volume of evidence

| Measure | Count |
|---|---|
| **Automated tests run** | **2,544, all passed, 0 failed.** Fast tier: 2,253 of 2,253 (1 h 42 min). Simulation tier: 278 of 278 before it was stopped at the 2-hour background limit, then 13 of 13 in a second attempt stopped to free CPU. **The simulation tier was not completed:** not every one of its 30 files ran |
| **Stand-alone football games** | about 5,900. Game studies 1,000; defensive-pool experiment 500; passing calibration 720; roster strategies 1,500; position leverage 1,650; ability census 200; score check 300 |
| **Franchise seasons** | **about 139.** Five 15-season franchises (75); live-Board runs (39); Board traces (8); forecast experiment (15); one-season checks (2). Runs lost to the time limit are not counted |
| **League games inside those franchises** | about 33,000 (about 237 a season) |
| **Beast Clash battles** | about 281,000 |
| **Single-play attribute trials** | 46 trials × 5 levels × 200 seeds = 46,000, plus 20,000 for durability and kicking |

## Critical issue

**B-1. The Board forecast compares the owner with a league that no longer exists.**
- **The mechanism.** The preseason forecast rates every AI club at what today's generator would field (`src/franchise/franchise.js:989`), not at the persistent club's real strength.
  - From season 3 the AI clubs are about 60 overall, while the forecast assumes 51–52.
  - The owner's safe goal climbs while his club falls behind, and three missed seasons end the franchise.
- **Measured.**
  - With the hands-off owner and the real Board, **7 of 9 owners were dismissed within five seasons**. All 3 Pro and all 3 All-Star owners were gone by season 5.
  - One Pro owner went 11-3, 7-7, 7-7, then 3-11 against goals of 6, 8, 9 and 10 wins.
- **Experiment X-2** (isolated): with the real AI strength in the forecast, **dismissals fall from 6 of 6 to 2 of 6** on the same Pro and All-Star seeds. Both remaining dismissals followed three clearly losing seasons.
- Details: `DIFFICULTY_AND_BOARD_BALANCE.md` §2; proposal R-0 in `RECOMMENDED_CHANGES.md`.

## High-priority issues

1. **Five attribute uses in the overall do nothing on the field:** DL Speed (pass rush), DL Tackling (sack finish), defender Catching (interceptions), safety zone Coverage, and RB Awareness (runs).
   - Durability matters (it halves injury risk) but is in no overall.
   - At team level, a point of overall is worth 0.32 at DL and 0.45 at S, against 2.1 to 2.4 at TE, RB and QB.
   - Sources: `MONSTER_ATTRIBUTE_BALANCE.md` and `POSITIONAL_BALANCE.md`.
2. **Speed is an exploit at constant payroll.** Moving attribute points into speed wins +3.5 points a game (win % 48 → 59). Salary reads overall only, so speed is underpriced (`POSITIONAL_BALANCE.md` P-1).
3. **Difficulty fades.** AI clubs start 4 points apart from Rookie to All-Star and are equal (about 64) by season 5 on every difficulty, on both seeds. After that, only the AI's play-calling IQ differs (`FRANCHISE_SIMULATION.md` §2).
4. **The study tools' "abilities off" control is broken** since PR #125: the rotation pool brings abilities back. With it corrected, abilities cost 4.7 completion points (`TECHNICAL_ISSUES.md` T-2).

## Medium issues (selected)

- **DPOY is a defensive-lineman award:** 68 of 75 seasons. No OL, S or K won any major award.
- **An emptied position mid-game is a 0–21 forfeit** that erases the score (`TECHNICAL_ISSUES.md` T-1, reproduced).
- **The cap never binds:** at least 12% of the cap is always unused. Salary spans 1.5 times from replacement level to 99, and AI clubs never offer a bonus.
- **Gym clubs win two titles in three** (50 of 75).
- **Scoring inflates 30–59%** over a franchise.
- **The completion target of 63–67%** is met only in developed leagues (53–55% on generated clubs). The sack rate is 1.8–2.7% against a written 5–7%.
- **AI clubs call 24 of 178 defensive plays.** Opening the book (experiment X-1) changes scoring by −0.1 points a game.
- **Outlier plays:** `option_pitch` and `student_body` average more than 10 yards a run.
- **Idle and self-harming abilities:**
  - in football, Foresight, Air Brake and Crosswind Rescue never execute;
  - in Clash, 12 abilities idle in 90% or more of battles;
  - legendary Clash abilities are the weakest rarity group.
- **Save size:** 6.1 MB packed and 1.4 MB stored by season 15, about three times the 16-club league.

## Systems performing well

- **Integrity.**
  - 0 harness problems or errors in 75 recorded franchise seasons.
  - 0 negative cap rooms in 2,325 AI club-seasons; rosters always 26–38.
  - The save round trip is clean every season.
  - Determinism is confirmed (identical hash on rerun).
- **Several strategies are viable.** Every coach identity wins 44.5–55.7% at equal strength; passing, rushing, elite-QB and superstar rosters all land within ±1.6 points.
- **Play counters work.** Run defence stops runs (30% success), zone gives up runs, and blitzes add sacks.
- **Beast Clash.**
  - The Falling Star fix worked (+25.8 → +8.6).
  - The type chart works as designed (58.4 / 41.6).
  - There is no exploit pair in 2,556 combinations.
  - Abilities decide one battle in five.
- **Progression and ageing curves are sensible.** Growth peaks at 22–25 and declines from 30; retirement order follows position (RB 29 to K 35.6); there is no long-term rating inflation.
- **The owner's empty-market forfeits from Task 10 are essentially gone** in the 32-club league: one confirmed in 1,050 owner games.
- **Free agency is contested** (about half of signings have 2+ bidders), and every market passes its integrity checks.

## Systems requiring adjustment

In priority order:
1. the Board forecast;
2. the overall formula against the engine;
3. speed's value;
4. difficulty persistence;
5. award coverage;
6. the in-game forfeit rule;
7. outlier plays;
8. the AI defensive pool;
9. the cap and salary curve;
10. idle abilities.

## Top 10 recommended changes

Full detail, with the 11 points each, is in `RECOMMENDED_CHANGES.md`.

| Rank | Change | Severity |
|---|---|---|
| 1 | **R-0:** compare the owner with the real league in the Board forecast (one line; experiment X-2: dismissals 6 of 6 → 2 of 6) | Critical |
| 2 | **R-1:** make DL Speed, DL Tackling, defender Catching, zone Coverage and RB Awareness act in the engine, or re-weight the overall | High |
| 3 | **R-2:** rein in speed's top end, or price it in the overall and salary | High |
| 4 | **R-3:** fix the "abilities off" control in the study tools, then re-run the ability-strength study | High (tools) |
| 5 | **R-4:** give difficulty a lasting lever (AI development or cap by difficulty) | High |
| 6 | **R-5:** a DPOY component ceiling and an All-League team by position | Medium |
| 7 | **R-6:** decide what an emptied position does mid-game; record forfeits on league results | Medium |
| 8 | **R-7:** retune `option_pitch`, `student_body` and the sub-3-yard runs | Medium |
| 9 | **R-8:** let AI clubs use the released defensive book (experiment X-1 done) | Medium |
| 10 | **R-9:** make the cap bind (steeper salary at the top or a lower cap; decide AI signing bonuses) | Medium |

## Testing limitations

- **The full test suite was not completed.** The fast tier passed in full. The simulation tier passed every test it reached but was stopped at the 2-hour background limit, and its second attempt was stopped to free CPU for the studies.
  - The first run also shared the two CPUs with studies, which the testing policy advises against. No test in that tier is wall-clock bound; only the separate performance test is, and it was not run.
- **Franchise evidence is two seeds** (3 on all difficulties, 4 on Pro and All-Star), plus three seeds for live-Board play. These are detailed observations, not statistical samples across seeds.
- **Seasons 16 to 20 cannot be simulated** through the production lifecycle (15-season cap).
- **Lost runs.** My first launch of the long runs used the default 30-minute background limit. The Rookie 20-season run and early versions of several studies were lost and rerun at reduced size:
  - live Board: 3 seeds × 5 seasons, instead of 4 × 6;
  - position leverage and roster strategies: 150 games, instead of 200.
- **Not measured in this audit:**
  - per-ability football strength (the tool needs fix R-3 first);
  - Legendary Plays;
  - a per-type football matrix;
  - captain partnerships in play;
  - Clash AI decisions;
  - league records and Hall of Fame outcomes in the 32-club league;
  - football rarity effects (the monster rows carry no species).
- **Baselines are cross-structure.** Task 8 M6 and Task 10 measured a 16-club, 9-game league without rotation. Comparisons are matched by seed and owner policy, but not like for like.

## Outstanding investigations

1. Re-run the live-Board study with R-0 applied, on more seeds and all difficulties.
2. Run `task10-ability-strength` with the corrected strip (R-3).
3. ~~Why Foresight never executes~~: **found** (`TECHNICAL_ISSUES.md` T-6). Its 3-yard LB depth rule matches 4 of 255 LB alignments. Air Brake and Crosswind Rescue remain to trace. Their charge, 3 breakups by one defender, happens in about 21% of team-games, so the block is in the activation condition (T-7).
4. Separate in-game forfeits from genuine 21–0 results in franchise leagues (needs a recorded flag).
5. Decide the completion and sack targets (owner decision).

## The audit folder

**Reports:**
- `EXECUTIVE_SUMMARY.md` (this file)
- `GAMEPLAY_BALANCE.md`
- `MONSTER_ATTRIBUTE_BALANCE.md`
- `MONSTER_CATALOGUE_BALANCE.md`
- `POSITIONAL_BALANCE.md`
- `FREE_AGENCY_AND_ECONOMY.md`
- `FRANCHISE_SIMULATION.md`
- `DIFFICULTY_AND_BOARD_BALANCE.md`
- `PROGRESSION_AND_EVOLUTION.md`
- `BEAST_CLASH_BALANCE.md`
- `CAREER_MODE_READINESS.md`
- `TECHNICAL_ISSUES.md`
- `RECOMMENDED_CHANGES.md`

**Raw results:** `raw/`, in JSON, CSV and text, including every play of the mixed game study and both experiment diffs.

**Reusable tools** (`tools/balance-audit/`):
- `game-study.mjs`
- `attr-sweep.mjs`
- `roster-strategy.mjs`
- `franchise-analyze.mjs`
- `board-trace.mjs`
- `repro-ingame-forfeit.mjs`
- `passing-calibration-rotation-strip.mjs`

**One existing tool extended:** `tools/ai-franchise-benchmark.mjs` gained the opt-in flags `--owner=repair` and `--board=content`, plus season football totals, award positions and packed save sizes. These are recording only; the defaults are unchanged.
