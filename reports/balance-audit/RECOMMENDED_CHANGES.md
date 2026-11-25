# Recommended changes

Every recommendation below rests on a measurement in this audit. **None has been applied to the game**: `src/` is unchanged on this branch (`git diff 58c33ee -- src index.html` is empty). Experiments ran in isolated copies only (§ "Experiments").

Each item gives:
- severity and priority;
- the intended and the measured behaviour;
- the evidence;
- the code;
- the proposal;
- any experiment;
- the risks.

Severity:
- **Critical:** breaks the game or loses data.
- **High:** materially distorts balance or the studies that guard it.
- **Medium:** noticeable, with a clear cause.
- **Low:** polish, or an owner decision.


## R-0. Fix the Board's forecast: compare the owner with the real league (Critical, priority 1)

1. **Issue.** The Board's preseason forecast rates every AI club at what today's generator would field, not at the persistent club's real strength. Once the AI clubs develop past that, the owner's forecast and safe goal are inflated, and three missed seasons dismiss him.
2. **Severity:** Critical for Franchise Mode. It ends careers unfairly, at every difficulty.
3. **Intended.** The forecast "compares the club with the league" (`src/franchise/board.js` header, GDD §29).
4. **Measured.**
   - With the hands-off owner and the real Board, **7 of 9 owners were dismissed within five seasons**: Rookie 1 of 3, Pro 3 of 3, All-Star 3 of 3.
   - Real AI strength is 57–60 overall against an assumed 50–55.
   - Pro seed 1: goals of 6, 8, 9 and 10 wins while the club went 11-3, 7-7, 7-7 and 3-11.
5. **Evidence.** `DIFFICULTY_AND_BOARD_BALANCE.md` §1–2; `raw/board-live-*.json`; `raw/board-trace-pro-seed1-5s.json`.
6. **Code.** `src/franchise/franchise.js` line 989 (preseason `expectations`, `todayOverall`) and `boardForecastFor` (line 1473).
7. **Current.** `talent = team === f.club ? teamOverall(playerTeam(f)) : todayOverall(f, team, year)`.
8. **Proposal.** Use the persistent club's real team overall, `teamOverall(aiTeam(f, team, year))`, when the league registry exists.
9. **Experiment X-2.** On Pro seeds 1–3, with the same game seeds, the first three seasons play out identically and only the goals change. Later seasons diverge slightly, because confidence funds the scouting bonus. **Dismissals fall from 3 of 3 to 1 of 3**. The remaining one followed two 3-11 seasons.
10. **Risks.**
    - Coach of the Year expectations change too, since they read the same field.
    - Goals become easier, so more scouting-bonus seasons.
    - Old saves keep the expectations already recorded for the current season.
11. **Priority:** 1.

## R-1. Make five inert attributes act, or take them out of the overall (High, priority 2)

1. **Issue.** The overall formula counts attribute uses that the engine ignores. Every overall-based decision then mis-ranks those monsters, starting with the depth chart.
2. **Severity:** High.
3. **Intended.** Each attribute in a position's overall should move that position's play: GDD §8.2 and the Attribute Lab's purpose.
4. **Measured.** At 30 → 95 (200 seeds per level), these do nothing:
   - DL Speed on time to pressure: 2.47 → 2.50 s;
   - DL Tackling on sack completion: 69.5% → 70.5%;
   - CB Catching on interceptions: 0.5% → 1.0%;
   - S Coverage in zone: completion allowed 80.0% → 80.0%;
   - RB Awareness on run yards: 4.21 → 4.26 inside zone.
5. **Evidence.**
   - `MONSTER_ATTRIBUTE_BALANCE.md`; `raw/attr-sweep-n200.json`.
   - Team-level confirmation: a point of overall is worth 0.32 (DL) and 0.45 (S) of the average slot (`POSITIONAL_BALANCE.md` P-5).
6. **Code.**
   - `src/data/personnel.js` `POSITION_WEIGHTS`;
   - the engine's pass rush, sack and coverage resolution in `src/sim/engine.js`.
7. **Current formula.** DL `{strength 3, tackling 2, agility 2, speed 1, awareness 1}`; S `{coverage 2, awareness 2, speed 2, tackling 2, catching 1}`; RB `{…, awareness 2, …}`; CB `{…, catching 1}`.
8. **Proposal.** Prefer the engine side, because each of these uses is described in the GDD:
   - Tackling in the sack attempt;
   - zone defender Coverage in the catch contest;
   - defender Catching in the interception roll;
   - DL Speed in the rush.

   If the owner prefers not to touch the engine, re-weight the overall to the measured effects.
9. **Experiments.** None in time. A follow-up should re-run `attr-sweep` and `position-leverage` after each change.
10. **Risks.**
    - Engine changes move every franchise season; the pinned tests and calibration studies need re-running.
    - Re-weighting the overall moves salaries (salary follows overall) and trade values.
11. **Priority:** 2.

## R-2. Rein in speed, or price it (High, priority 3)

1. **Issue.** At a constant payroll, moving attribute points into speed wins clearly.
2. **Severity:** High.
3. **Intended.** Salary (overall) should price what wins.
4. **Measured.**
   - Speed strategy: **+3.54 ± 0.99 points a game, win % 48.3 → 59.0** against the same club unchanged.
   - Strength strategy: −2.29.
   - Speed moves WR deep yards 9.3 → 23.8 and RB yards 3.9 → 9.6 (30 → 95).
5. **Evidence.** `POSITIONAL_BALANCE.md` §1 (`raw/roster-strategy-150.json`); `MONSTER_ATTRIBUTE_BALANCE.md`.
6. **Code.**
   - `src/data/monsters.js` `salaryFor` (18,000 + 280 × OVR);
   - `POSITION_WEIGHTS`;
   - the engine's `maxSpeed` = 5.4 + 4.1 × norm(speed) (`src/sim/engine.js` actor record).
7. **Current.** Salary reads overall only. Speed's weight is 3 for WR, RB and CB, 2 for LB and S, and 1 for QB and DL.
8. **Proposal.** Either flatten the speed curve in the engine (for example a softer top end on `maxSpeed`), or weight speed more in the overall for WR, RB, CB and S, so that speed is priced.
9. **Experiments.** None in time. The roster-strategy study is the before/after test.
10. **Risks.** Lower speed lowers explosive plays and scoring, which are already low on generated clubs (12.9 points per team-game).
11. **Priority:** 3.

## R-3. Fix the study tools' "abilities off" control (High, priority 4)

1. **Issue.** `tools/passing-calibration.mjs` strips the starting slots only; the rotation pool (PR #125) brings abilities back.
2. **Severity:** High for measurement: every football "with and without" study since 2026-11-16 is suspect.
3. **Intended.** The "off" variant has no abilities.
4. **Measured.** 99.8 ability events a game in the "off" variant against 99.1 "on". With the corrected copy: 0.
5. **Evidence.** `TECHNICAL_ISSUES.md` T-2; `raw/passing-calibration-120*.json`.
6. **Code.**
   - the tools `passing-calibration.mjs` and `task10-ability-strength.mjs` (`strip`);
   - `src/franchise/roster.js` `buildTeam` (`rotationInputs`).
7. **Current.** `strip()` maps `offense`, `defense` and `kicker` only.
8. **Proposal.** Strip `rotationInputs` and `bench` too, as `tools/balance-audit/passing-calibration-rotation-strip.mjs` does. Then re-run the ability-strength study.
9. **Experiment.** Done. The corrected control shows abilities cost 4.7 completion points.
10. **Risks:** none (tools only).
11. **Priority:** 4 (quick and cheap).

## R-4. Keep difficulty meaningful after the first seasons (High, priority 5)

1. **Issue.** All three difficulties reach the same AI strength by season 5.
2. **Severity:** High.
3. **Intended.** Rookie, Pro and All-Star should feel different for the whole career (GDD difficulty table; Task 7 bands of 54–70 / 45–53 / 32–40% owner wins).
4. **Measured.**
   - AI team overall in season 1 is 52.9 (Rookie), 53.9 (Pro) and 57.2 (All-Star).
   - By season 5 it is 63.8, 64.2 and 64.1, and it stays level to season 15.
   - The repair owner's win %: 38.6, 35.7 and 57.1 (one seed). Difficulty does not order results.
5. **Evidence.** `FRANCHISE_SIMULATION.md` §2; `DIFFICULTY_AND_BOARD_BALANCE.md`.
6. **Code.** `src/franchise/franchise.js` `DIFFICULTY`, `clubQuality`, `difficultyQuality`. These apply only at club creation (Task 8 N7f).
7. **Current.** quality −4 / −1 / +3 at founding; IQ 0.6 / 1.0 / 1.5.
8. **Proposal.** Give difficulty a lasting lever. For example:
   - an AI development rate by difficulty (the existing XP slowdown, `slowed`/`boosted` in the strategy record);
   - or AI cap headroom by difficulty.
9. **Experiments.** None. The test is the same seeds on all three difficulties, AI overall at seasons 5, 10 and 15.
10. **Risks.** Over-tuning can recreate the "AI too strong late" drift Task 6 fixed.
11. **Priority:** 5.

## R-5. Spread the defensive award and give every position an honour (Medium, priority 6)

1. **Issue.** DPOY went to a DL in 43 of 45 seasons; no OL, LB, S or K won a major award.
2. **Severity:** Medium (and a blocker for Career Mode at those positions).
3. **Intended.** Awards recognise the best performers across positions (GDD §16.4; Task 10 H-9).
4. **Measured.** DPOY: DL 43, LB 1, CB 1. MVP: QB 31, RB 8, WR 6.
5. **Evidence.** `FRANCHISE_SIMULATION.md` §4.
6. **Code.** `src/franchise/awards.js` `AWARD_RULES`, `MVP_RESPONSIBILITY`.
7. **Current.** Defensive scoring: pass rush, takeaways, coverage and run defence, normalised per position group.
8. **Proposal.**
   - Apply the 3-SD component ceiling (already used for MVP) to DPOY.
   - Add an All-League team by position.
9. **Experiments.** None. Task 10 showed the MVP ceiling changed 41 of 120 MVP winners.
10. **Risks.** Hall of Fame cases shift (honour ledger).
11. **Priority:** 6.

## R-6. Decide what an emptied position does mid-game (Medium, priority 7)

1. **Issue.** An in-game injury that empties a position forfeits the game 0–21 and erases the score.
2. **Severity:** Medium.
3. **Intended.** Not specified for in-game injuries (added in PR #125).
4. **Measured.** A forced reproduction: leading 7–3 becomes a 0–21 loss. Natural rate: 1 in 500 generated games.
5. **Evidence.** `TECHNICAL_ISSUES.md` T-1; `tools/balance-audit/repro-ingame-forfeit.mjs`.
6. **Code.** `src/sim/game-runner.js` `step` (the `eligiblePlays` check); `src/sim/rules.js` `lineupForfeit`.
7. **Current.** No legal play leads to a forfeit and a 0–21 score.
8. **Proposal.** Borrow a monster from another position (as `pickSlots` does within a play), or keep the score. Also record `forfeit` on league results.
9. **Experiments:** none.
10. **Risks.** A borrowed QB may produce absurd stat lines; a stat-line rule is needed.
11. **Priority:** 7.

## R-7. Retune the outlier plays (Medium, priority 8)

1. **Issue.** Two runs average twice the run average; several runs average under 3 yards.
2. **Severity:** Medium.
3. **Intended.** Every released play is viable and none is dominant (Playbook Audit).
4. **Measured** (500 games, n ≥ 150):
   - `option_pitch`: 10.34 yards per play, 66.4% success, 14.2% TD;
   - `student_body`: 10.60 yards per play, 66.7% success;
   - against `rocket_toss` 2.39, `jet_sweep` 2.58, `empty_qb_draw` 2.90;
   - the average run is 5.49.
5. **Evidence.** `GAMEPLAY_BALANCE.md` §3; `raw/game-study-500-mixed.json`.
6. **Code.** `src/data/playbook.js` and `src/data/playbook-reserve.js`, the play art.
7. **Proposal.** Review each outlier in the Playbook Audit, then re-run `game-study`.
8. **Risks:** small.
9. **Priority:** 8.

## R-8. Let AI clubs use the released defensive book (Medium, priority 9)

1. **Issue.** AI base plans use 24 of 178 defensive calls.
2. **Severity:** Medium.
3. **Intended.** Task 10 released 150 defensive plays as "every released call".
4. **Measured.** 24 distinct defensive calls across 55,700 snaps.
5. **Evidence.** `GAMEPLAY_BALANCE.md` §3; experiment X-1 below.
6. **Code.** `src/franchise/roster.js` `ZONE_D`, `MAN_D` (lines 140–141).
7. **Current.** Fixed lists of 8 and 9.
8. **Proposal.** Build the pools from the released book by tag (X-1).
9. **Experiment:** X-1. 143 calls used; points per team-game 12.87 → 12.79; sacks 2.7% → 3.6%.
10. **Risks.** Counter logic was tuned on the old pool.
11. **Priority:** 9.

## R-9. Make the cap and the market matter (Medium, priority 10)

1. **Issue.** No AI club comes within 12% of the cap. Salary spans only 30.9 k to 45.7 k from replacement level to 99. AI clubs never offer bonuses.
2. **Severity:** Medium.
3. **Intended.** The cap forces choices (Task 7 specification).
4. **Measured.**
   - Lowest AI cap room in 930 club-seasons: 226 k (12.5% of the cap).
   - Mean room 17–21% of the cap.
   - 0 bonuses in 444 AI signings.
5. **Evidence.** `FREE_AGENCY_AND_ECONOMY.md`.
6. **Code.**
   - `src/data/monsters.js` `salaryFor`;
   - `src/data/league.js` tier caps;
   - `src/franchise/fa-ai.js`.
7. **Current.** Salary 18,000 + 280 × OVR; Challenger cap 1.8 M.
8. **Proposal.** Steepen the salary curve at the top (for example a quadratic term above OVR 70), or lower the cap. Decide T7-44 (AI bonuses).
9. **Experiments:** none.
10. **Risks.** A steeper curve can push clubs over the cap; the AI's roster-minimum logic must be checked.
11. **Priority:** 10.

## R-10. Clear the idle and self-harming abilities (Medium, priority 11)

1. **Issue.** Some abilities essentially never act, and some hurt their user.
   - **Football:** Foresight (0 of 98 appearances, despite the M6 fix), Air Brake (0 of 88), Crosswind Rescue (0 of 37).
   - **Clash:**
     - 12 abilities idle in 90% or more of 3 v 3 battles, Unbroken Charge in 100%;
     - Foresight, Snowdrift Shelter and Cinder Clamp make their user worse;
     - legendary abilities average −2.2.
2. **Severity:** Medium.
3. **Intended.** Each ability is visible and useful in its mode (Dex contract).
4. **Measured.** `MONSTER_CATALOGUE_BALANCE.md` §4; `BEAST_CLASH_BALANCE.md` §3–5.
5. **Code.** `src/sim/abilities/<family>.js`; `src/clash/t8` contracts.
6. **Proposal.** A trigger review per ability: loosen each trigger condition so it occurs in a typical game or battle, and re-check with `task10-ability-census` and `task10-clash-strength`.
7. **Risks.** Each change moves balance; one at a time.
8. **Priority:** 11.

## Further items (lower priority)

| ID | Item | Severity | Evidence |
|---|---|---|---|
| R-11 | **The completion target:** decide whether 63–67% applies to generated clubs (53–55% now) or developed leagues (63–67% from season 6). State the sack target (1.8–2.7% measured against the 5–7% written) | Medium (owner decision) | `GAMEPLAY_BALANCE.md` §1; `FRANCHISE_SIMULATION.md` §5 |
| R-12 | **Scoring inflation of 30–38% over 15 seasons:** defensive development does not keep pace with passing | Medium | `FRANCHISE_SIMULATION.md` §5 |
| R-13 | **Extra points miss 13–16%** (a 32-yard kick) | Low (owner decision) | `GAMEPLAY_BALANCE.md` §1 |
| R-14 | **AI runs on 4th and long:** 15% of those plays, converting 4.3% | Low | `GAMEPLAY_BALANCE.md` §6 |
| R-15 | **Update the GDD status table** (Task 8, the 32-club league, the 15-season cap; §42's 20-season text) | Low | `TECHNICAL_ISSUES.md` T-3 |
| R-16 | **Re-derive trade-value position weights** on this engine (TE, RB, QB under; DL, S, K over) | Medium | `POSITIONAL_BALANCE.md` §2 |
| R-17 | **Durability is in no overall**, though it halves injury risk and sets Clash HP | Medium | `MONSTER_ATTRIBUTE_BALANCE.md` |
| R-18 | **Watch save size:** 6.1 MB packed / 1.4 MB stored at season 15 | Medium (monitor) | `FRANCHISE_SIMULATION.md` §1 |
| R-19 | **Gym clubs win 67% of titles** | Medium | `FRANCHISE_SIMULATION.md` §3 |


## Experiments run (isolated, not applied)

### X-1. Let AI clubs call the whole released defensive book

- **Change.** An isolated copy of `src/` (`scratchpad/exp-defpool`, diff in `raw/experiment-defpool.diff`): `ZONE_D` and `MAN_D` in `src/franchise/roster.js` become every released defensive call tagged zone or man. Desperation, goal-line, prevent, red-zone and two-minute calls are excluded. One variable changed.
- **Matched comparison.** `tools/balance-audit/game-study.mjs --games=500 --seed=1`, the same clubs and seeds as the baseline mixed run. Results in `raw/experiment-defpool-game-study-500-mixed.json`.

| Measure | Baseline | Whole defensive book |
|---|---|---|
| Distinct defensive calls used | 24 | **143** |
| Points per team-game | 12.87 | 12.79 |
| Completion | 52.8% | 52.1% |
| Yards per attempt | 7.54 | 7.78 |
| Yards per carry | 5.31 | 4.92 |
| Sacks per dropback | 2.7% | 3.6% |
| Third-down conversion | 34.6% | 33.3% |
| Upsets (of decided games) | 24.2% | 27.2% |
| Still tied after overtime | 3.6% | 1.6% |

- **Reading.** Opening the book to the AI multiplies the variety of defences a player faces by six, while barely moving scoring (−0.1 points per team-game).
- **Side effects:** a little more pass rush (+0.9 sack points) and a little less run game (−0.4 yards per carry).
- **Unintended consequences to check** before adopting it: the play-by-play counter logic (`counterPlays`) and the coach-identity defensive leans were tuned on the 24-call pool.
