# Football gameplay balance

**Build:** `v43.50.0-sideline` at `58c33ee`. All figures come from the production 7-on-7 engine (`src/sim/game-runner.js` `playGame`), with nothing in `src/` changed.

## Method

**`tools/balance-audit/game-study.mjs` (new; observation only).** Whole games between generated clubs, using Franchise Mode's game settings: 180-second quarters and one overtime period.
- Each club gets a seeded quality and a seeded coach identity, built the way `franchise.js` `aiCoach` builds an ordinary identity club at Pro (IQ 1):
  - offence: pass, balanced or run;
  - defence: pressure, coverage or man;
  - one of the five coach styles;
  - pass and run style.
- The club's 6 + 6 plan therefore comes from the released book through `identityPlaybook`, as the AI clubs' plans do.
- **Two runs:**
  - **Mixed:** 500 games, seed 1, both clubs' quality drawn from 46 to 66 (`raw/game-study-500-mixed.json`, with every snap in `raw/game-study-500-mixed-plays.csv`).
  - **Equal:** 500 games, seed 2, both clubs at the same quality, to compare strategies (`raw/game-study-500-equal.json`).
- **About 55,700 snaps in total.**

**`tools/passing-calibration.mjs` (existing).** 120 matched games in three variants (`raw/passing-calibration-120.json`). The tool's "abilities off" control is broken on this build (`TECHNICAL_ISSUES.md` T-2), so a corrected copy was run as well (`raw/passing-calibration-120-rotation-strip.json`).

**The targets used.** The game's own documented targets, where they exist:

| Measure | Target | Source |
|---|---|---|
| Completion | 63–67% ("about 65% in representative games, abilities on") | `GRIDIRON_BEAST_TEST_PLAN.md`, GDD §53.5c |
| Sacks per dropback | 5–7%, the only written target; never confirmed by the owner (`docs/task10/OWNER_DECISIONS_2026-11-13.md` §6) | `GRIDIRON_BEAST_REBUILD_PLAN.md` |

Every other football measure has **no documented target**. Those are compared with the v42.8 reference and the Task 10 baseline (`docs/task10/results/baseline/passing-120.json`), never with NFL norms.

**Note on generated clubs.** The generated clubs are the "practice club" measure. Developed franchise leagues score more and complete more passes (Task 10 F-20). The franchise-league figures are in `FRANCHISE_SIMULATION.md`.

## 1. The headline numbers

| Measure | Mixed (500) | Equal (500) | Task 10 baseline (`passing-120`) | v42.8 reference | Target |
|---|---|---|---|---|---|
| Points per team-game | 12.9 (SD 10.2) | 11.8 (SD 9.1) | 13.7 | 13.7 | none |
| Shutouts (team-games scoring 0) | **14.8%** (148 of 1,000) | 12.2% | — | — | none |
| Plays per team-game | 27.8 | 27.9 | — | — | none |
| Drives per team-game | 5.8 | 5.6 | — | — | none |
| Yards per play | 6.58 | 6.29 | — | — | none |
| Pass share of snaps | 68.2% | 68.0% | — | — | follows identity |
| Completion | **52.8%** | **52.9%** | 57.1% | 64.5% | **63–67%: FAIL** |
| Yards per attempt | 7.54 | 7.16 | 7.64 | 7.9 | none |
| Pass TD per attempt | 6.1% | 5.4% | — | — | none |
| Interceptions per attempt | 1.1% | 1.2% | 0.9% | 1.4% | none |
| Sacks per dropback | 2.7% | 2.6% | 1.9% | 2.5% | 5–7% unconfirmed: below |
| Yards per carry | 5.31 | 5.23 | 6.27* | 6.2 | none |
| Fumbles lost per team-game | 0.18 | 0.17 | — | — | none |
| Explosive passes (20+ yards per attempt) | 10.7% | 9.6% | — | — | none |
| Explosive runs (15+ yards per carry) | 8.2% | 7.3% | — | — | none |
| Third-down conversion | 34.6% | 34.5% | — | — | none |
| Fourth-down conversion (go-for-it) | 38.3% | 39.8% | — | — | none |
| Three-and-outs per drive | 34.0% | 33.3% | — | — | none |
| Red-zone trips per team-game | 1.32 | 1.34 | — | — | none |
| Red-zone TD % / any score % | 61.9 / 85.2 | 62.2 / 85.0 | — | — | none |
| Field goals made | 75.4% (714 attempts) | 71.6% (757) | — | — | none |
| Field goals by distance (<30 / 30s / 40s / 50+) | 93.5 / 81.5 / 61.7 / 63.2 | 95.6 / 76.6 / 59.7 / 53.3 | — | — | none |
| Extra points | **83.6%** | 84.8% | — | — | none |
| Two-point tries | 47.1% (51) | 49.3% (69) | — | — | none |
| Overtime games | 9.0% | 8.8% | — | — | none |
| Still tied after the overtime period (decided by Beast Clash in Franchise Mode) | 3.6% | 3.8% | — | — | none |
| Margin of 21 or more (blowouts) | 18.0% | 6.4% | — | — | none |
| Margin of 8 or less (one score) | 53.2% | 63.8% | — | — | none |

*The calibration tool counts carries differently: it skips every non-pass play that has a QB record. Yards per carry here comes from `game-study.mjs`, which counts every designed run and scramble with a ball-carrier.

**Reading the table:**
- **Completion is the one measure with an approved target, and it is missed by 10 to 14 points on generated clubs.** It has fallen again since the Task 10 baseline (57.1% to 55.0% on the same calibration tool). This continues the decline Task 10 traced to three Task 8 steps; the coaching-substitution change (rotation and stamina) is the most likely new cause, but this audit did not test that.
- **Scoring is low and lumpy.** Each club has under six drives a game, and one team-game in seven ends without a point. Variance is high: the SD of points (10.2) is almost as large as the mean (12.9).
- **Extra points miss one time in six.** The kick is from the 15, a 32-yard attempt (`src/sim/special-teams.js` `fieldGoalChance`): `0.985 − (distance − 22) × (0.03 − 0.019 × k)` gives about 84% for an average kicker. No target is documented. It is listed for an owner decision, not as a defect.
- **50+ yard kicks succeed as often as 40-yard kicks** (63.2% against 61.7% in the mixed run). This is selection: the AI tries 50+ only with a strong kicker (`coach-ai.js` `fourthDownDecision`), and the Dragon Roar field-goal signature exists. It is not a formula fault.

## 2. Abilities and types on and off (corrected control)

The original calibration and the corrected copy are below. The corrected copy also strips the rotation pool, which the original misses (`TECHNICAL_ISSUES.md` T-2).

| Variant (120 matched games) | Completion | Yards per attempt | INT % | Sack % | Deep completion | Yards per carry (tool's count) | Points per team-game | Ability events per game |
|---|---|---|---|---|---|---|---|---|
| Abilities and types on (as played) | 55.0% | 7.36 | 0.7 | 1.6 | 36.2% | 6.92 | 12.7 | 99.1 |
| Original tool, "abilities off" | 54.8% | 7.39 | 0.9 | 1.5 | 35.3% | 7.04 | 12.7 | **99.8** (not off) |
| Original tool, "abilities and types off" | 55.6% | 7.54 | 1.0 | 2.0 | 37.1% | 6.59 | 13.0 | **98.6** (not off) |
| **Corrected: abilities off** | **59.7%** | 7.79 | 0.9 | 1.8 | **42.8%** | 6.21 | 13.5 | 0 |
| **Corrected: abilities and types off** | 57.9% | 7.75 | 1.0 | 1.9 | 34.6% | 6.13 | 12.8 | 0 |
| Task 10 baseline, abilities on / off | 57.1% / 59.9% | 7.64 / 8.15 | 0.9 / 1.2 | 1.9 / 1.8 | 37.6% / 44.7% | 6.27 / 6.13 | 13.7 / 13.8 | — |

- **Abilities, taken together, cost the passing game.** With the control corrected:
  - completion is 4.7 points lower with abilities on;
  - deep completion is 6.6 points lower;
  - points per team-game are 0.8 lower.
- This is the same direction and size as at Task 10 (−2.8 completion, −7.1 deep), so the effect is not new.
- **On their own, abilities do not explain the completion target miss.** Even with every ability off, completion is 59.7%, still below 63–67%.
- **Types on their own** (corrected "abilities off" against "abilities and types off") move completion by 1.8 points and deep completion by 8.2. The 8.2 points is a large swing on 120 games (about 400 deep attempts) and should be confirmed with more games before anyone acts on it.

## 3. Plays: what is over- and under-powered

Base: 102 offensive plays with at least 150 snaps in the mixed run. A success is ≥40% of the distance on 1st down, ≥60% on 2nd, and all of it on 3rd and 4th.

- **Average pass:** 7.06 yards per snap (sacks and incompletions included), 42.5% success.
- **Average run:** 5.49 yards per snap, 41.0% success.

**Strongest offensive plays (n ≥ 150):**

| Play | Type | Snaps | Yards per play | Success | TD | Explosive | Note |
|---|---|---|---|---|---|---|---|
| `pa_post` | pass | 162 | **12.73** | 47.5% | 8.6% | 23.5% | also 4.3% turnovers |
| `deep_post` | pass | 164 | 10.70 | 44.5% | 10.4% | 25.0% | |
| `student_body` | run | 153 | **10.60** | 66.7% | 7.8% | 17.0% | about twice the average run |
| `slant_wheel` | pass | 185 | 10.50 | 51.4% | 8.1% | 17.3% | |
| `bang_post` | pass | 213 | 10.43 | 43.2% | 8.0% | 13.1% | 0 turnovers |
| `option_pitch` | run | 211 | **10.34** | **66.4%** | **14.2%** | 18.5% | the best play in the book on success and TD rate |

**Weakest offensive plays (n ≥ 150):**

| Play | Type | Snaps | Yards per play | Success | Loss of yards |
|---|---|---|---|---|---|
| `rocket_toss` | run | 175 | **2.39** | 38.9% | 32.6% |
| `jet_sweep` | run | 152 | 2.58 | 28.3% | 20.4% |
| `empty_qb_draw` | run | 215 | 2.90 | 25.1% | 13.0% |
| `tunnel_screen` | pass | 226 | 3.03 | 25.2% | 2.2% |
| `qb_power` | run | 175 | 3.03 | 22.9% | 5.7% |
| `spread_draw` | run | 226 | 3.06 | 20.8% | 16.8% |

**Reading the play tables:**
- **`option_pitch` and `student_body` give a 10-yard average on a run.** That is about twice the run average, with a two-thirds success rate. These are the clearest overpowered calls in the book.
- **The weak runs lose yards on a fifth to a third of their snaps.** Still, the worst play averages 2.4 yards, so no call is unusable.
- **The 10 weakest and 10 strongest play ids** are candidates for a play-by-play review in the Playbook Audit. The full table, with 174 offensive ids, is in `raw/game-study-500-mixed.json` `offensePlays`.

**Defensive plays.** Only **24 of the 178 defensive calls in the book are ever called** by an AI club's base plan:
- `identityPlaybook` draws its defence from fixed pools: `ZONE_D` 8, `MAN_D` 9, `RUN_D` 6, plus `fire_zone` (`src/franchise/roster.js` lines 140–141 and 165–185).
- The 150 defensive reserve plays released in Task 10 can reach an AI plan only as a scouting swap (`adaptPlaybook`, at most two per side).
- Task 10 reported the defensive book as "every released call (176)". For AI play-calling on this build, that is not true for base plans.

**Among the 24 defensive calls (all n ≥ 478):**

| Defence | Yards allowed per play | Success allowed |
|---|---|---|
| `goal_line_man` | **4.91** | 33.1% |
| `goal_line` | 5.23 | 35.0% |
| `double_a_mug` | 5.62 | 30.8% (sack 8.1%) |
| `fire_zone` | 5.69 | 44.1% |
| `cover_3` | 5.81 | 43.8% |
| … | | |
| `db_blitz` | 7.98 | 39.4% |
| `run_wall` | **9.04** | 38.7% (18.6% explosive allowed) |

- The goal-line calls look best only because they are called when the offence has little room.
- **`run_wall` is the weakest call**: 9.04 yards a play allowed and 18.6% explosive plays allowed. Run defences as a family give up 8.6 yards and a 10.1% touchdown rate against passes (the "Pass vs run defence" row below).

**Pass and run against defence families (mixed run):**

| Offence vs defence | Snaps | Yards per play | Success | Sack | Explosive |
|---|---|---|---|---|---|
| Pass vs man | 7,622 | 6.82 | 39.5% | 1.9% | 10.8% |
| Pass vs zone | 6,579 | 6.72 | 45.9% | 1.8% | 7.5% |
| Pass vs blitz | 2,982 | 7.34 | 42.9% | 4.8% | 11.8% |
| Pass vs run defence | 2,071 | **8.61** | 42.3% | 3.5% | 16.1% |
| Run vs man | 3,284 | 5.00 | 38.0% | — | 7.6% |
| Run vs zone | 2,882 | **6.45** | **51.6%** | — | 8.6% |
| Run vs blitz | 1,263 | 4.98 | 34.0% | — | 8.6% (16.2% for a loss) |
| Run vs run defence | 1,092 | 5.00 | **30.4%** | — | 10.4% (29.6% for a loss) |

**The counters work in the expected direction:**
- run defence stops runs (30% success) and is punished by passes (8.6 yards a play);
- zone gives up the run (6.45 yards, 52% success);
- blitzes raise sacks 2.5 times and losses.

There is no defence family that is best against everything.

## 4. Strategies: are several viable?

From the equal-quality run (`strategies`). Each club-game is one entry; the standard error is about ±3.5 points at 200 games and ±2.5 at 500.

| Strategy | Club-games | Win % |
|---|---|---|
| **Coach style:** Balanced | 192 | 55.7 |
| **Coach style:** Air Raid | 203 | 52.7 |
| **Coach style:** Trickster | 191 | 51.3 |
| **Coach style:** Ground & Pound | 206 | 46.4 |
| **Coach style:** Tempo | 208 | 44.5 |
| **Offence:** balanced | 383 | 53.5 |
| **Offence:** pass | 411 | 48.5 |
| **Offence:** run | 206 | 46.4 |
| **Defence:** coverage | 326 | 51.7 |
| **Defence:** pressure | 335 | 49.3 |
| **Defence:** man | 339 | 49.1 |
| **Pass style:** vertical | 480 | 53.4 |
| **Pass style:** quick | 520 | 46.8 |
| **Run style:** inside | 529 | 52.1 |
| **Run style:** option | 471 | 47.7 |

**Every strategy wins between 44.5% and 55.7% with strength held level.** No identity is dominant or unplayable.
- The two extremes, Balanced at 55.7% and Tempo at 44.5%, sit about 1.5 standard errors from 50%. That is a lean, not a proven imbalance.
- The 6.6-point gap between vertical and quick passing is the clearest one, at about 2.6 standard errors. Quick passing is the weaker style.

## 5. Strength against randomness

**How often the club with the higher team overall wins** (mixed run):

| Overall gap | Games | Favourite wins |
|---|---|---|
| 1–2 | 115 | 53.0% |
| 3–5 | 126 | 58.7% |
| 6–9 | 137 | 83.2% |
| 10+ | 97 | **95.9%** |

- **Overall:** upsets are 24.2% of the decided games in the mixed run and 30.8% in the equal run.
- **What this means:**
  - Below a 6-point gap the game is open.
  - From 6 points the favourite wins five games in six.
  - From 10 points the underdog almost never wins.
- Team overall predicts results well. It may predict too well for a sport whose appeal includes upsets; the step between 3–5 (59%) and 6–9 (83%) is steep.
- There is no documented target for this. It is reported for the owner's judgement.

**Randomness within a play.**
- On 1st and 10, the yards on one pass have an SD of 12.9 against a mean of 7.6.
- On a run, the SD is 10.9 against a mean of 5.9.
- Individual plays are highly variable, which is expected. The drive structure (5–6 drives per team) concentrates that variance into the result, hence the 15% shutouts.

## 6. AI decisions worth a look

From every snap of the mixed run (`raw/game-study-500-mixed-plays.csv`).

- **Runs on 4th and long.** 47 of the 310 fourth-and-7+ plays were designed runs. They gained 2.3 yards on average and converted 4.3%; passes in the same spot converted 27.8%. `weighOffense` (`src/sim/coach-ai.js`) lowers runs on long yardage (×0.45) but has no fourth-down rule. Severity: Low to Medium.
- **Pass and run by down and distance** behave sensibly:
  - passes are better on long yardage (1st and 10: 7.6 against 5.9 yards; 30.8% against 16.7% for a first down);
  - runs are better on short yardage (3rd and ≤3: 62.0% against 50.9%).
  - The AI calls more passes on third and long (3,205 passes against 355 runs).
- **Defence** plays its counters as intended (§3).
