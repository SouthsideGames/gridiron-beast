# Task 10: review of the experimental balance branch

- **Reviewed:** `chatgpt/task10-balance-fixes` at `5761f44` (8 commits on top of `task10-franchise-final-balance` `ff05696`).
- **Baseline:** `task10-franchise-final-balance` at `ff05696` (gameplay identical to the released v43.12.0).
- **Date:** 2026-11-13. Nothing was merged, and no code on either branch was changed by this review.
- **Verdict: the candidate does not pass regression (2,095 of 2,103; 8 failures) and is not ready to merge.** Two changes work as intended with a scope problem, two do not do what they claim, one works but conflicts with its Dex contract, one is ineffective against its target. Task 10 is not finished.

Result files are kept in `docs/task10/results/` (`baseline/` and `candidate-5761f44/`) so before and after can be compared later.

## 1. Regression

Full suite on the candidate, `npm test`: **2,103 tests, 2,095 pass, 8 fail.** The baseline passes 2,103 of 2,103. (The suite ran while other studies were computing; none of the eight is a timing test, and those rechecked alone fail the same way.)

| # | Failing test | Cause | Class |
|---|---|---|---|
| 1, 2 | `FIR-03-C Falling Star: ... contract-sourced values` (two files) | The code's splash (15/20/25/30%) no longer matches the approved Dex contract (50/55/60/65%), which was not changed | Caused by change 4 |
| 3 | `awards: an exceptional pass rusher ... path to DPOY` | The 3 SD cap was put in the shared scoring function, so it also caps OPOY, DPOY and both rookie awards | Caused by change 1 |
| 4 | `no intentional throw-away anywhere` (qb-read) | "193 dropbacks, 0 sacks: sacks still happen naturally". The engine change moved a seeded six-game sample to zero sacks | Caused by change 6 |
| 5 | `Goal Line Man: ... still stops screens and the quick game` (run-read) | The engine change moved a defensive call's result outside its tested band | Caused by change 6 |
| 6 | `the timeline never changes the game` | With the changed results, a retired monster holds a season record; a Hall candidate's record credit is read from the career timeline, so it differs when the timeline writers are off. Game results are identical | A Task 9 weakness the baseline seed did not reach; exposed, not created |
| 7 | `contracts: ... staff renewals within ±8%` | With the changed results a staff renewal settles outside the ±8% band | An existing weakness exposed; needs its own look |
| 8 | `a made-up translation of every line changes nothing` | Three places where a finished sentence is saved (`news[].tv.text.tv.c`, `news[].tv.fillScene`, `league.events[].honours`), reached only by the candidate's different season | Existing central-text gaps exposed |

Failures 6 to 8 would appear with any gameplay change that alters this fixture's season. They are real defects in the baseline and are added to the outstanding list.

## 2. Change by change

| # | Change | Verdict | Evidence |
|---|---|---|---|
| 1 | Award components capped at +3 SD | **Needs revision** | MVP effect is as intended; the scope is too wide |
| 2 | Previous rookie winners excluded | **Fail** | Does not fix the defect |
| 3 | Soft MVP voter fatigue | **Works as coded; owner confirmation needed** | Small effect; conflicts with an earlier ruling |
| 4 | Falling Star splash reduced | **Needs revision** | Still the strongest ability; contract not updated |
| 5 | Second Tide safeguard | **Fail** | No measurable effect; departs from the contract |
| 6 | Pocket compression | **Fail against 7%** | Sack rate unchanged; two engine tests broken |
| 7 | 7% sack target documented | **Pass (documentation)** | Recorded; one wording point |

### 1. Award cap at three standard deviations

- **MVP result is what the investigation proposed.** Replaying the 120 recorded baseline seasons with the cap: QB 37, RB 34, WR 29, DL 12, TE 8 (baseline: DL 44, WR 33, RB 21, QB 16, TE 6). Apex winners fall from 72 to 52.
- **In real candidate franchises** (three 20-season runs, same seeds as the baseline): the most MVPs by one monster is 3, 4 and 9, against 15, 7 and 8 on the baseline; defensive linemen win 2, 1 and 0 instead of 15, 8 and 2. Repeats are reduced, not removed: on All-Star seed 4 a legendary wide receiver (not an Apex) won 9 of 20 with the cap and fatigue both active.
- **Problem: the cap is in `zWithin`, which every award uses.** It now also limits OPOY, DPOY, OROY and DROY. The existing test that a dominant pass rusher can win DPOY fails. Nobody proposed or approved capping the other awards.
- **Revision:** apply the cap in the MVP score only, or get the owner's approval to cap every award and then change the DPOY test deliberately.
- Still true after the cap: OL, LB, S and K do not win.
- The award rule text players read does not mention the cap.

### 2. Rookie award exclusion

- **The defect is not that a monster wins twice; it is that founding rookies are first-year monsters twice.** On seed 9, 18 of the 32 monsters listed with no seasons played in season 2 were already listed that way in season 1, and their age does not advance either. Cause: the offseason rollover resets seasons played for `m.rookie === year` (`league-season.js` `leagueAgeing`, and the same line for the owner's roster in `franchise.js`), meant for the class just drafted, and founding rookies carry the same stamp.
- **The candidate only blocks a past winner.** On the candidate, seed 9: season 1 goes to another monster, and Murklaw, in his second season, still wins Defensive Rookie of the Year in season 2. The wrong award still happens.
- The exclusion also depends on saved history only; it is harmless but unnecessary once the rollover is right.
- **Revision:** fix the rollover so a founding rookie's first season counts, then decide whether the history check is still wanted as a guard.

### 3. MVP voter fatigue

- **Logic check.** 0.12 award points per consecutive previous MVP, capped at 0.6 after five; the streak resets when someone else wins; the past is read from saved history, in year order. Correct as written. One edge: a season with no MVP on record does not clear the stored streak (cannot happen in normal play).
- **Size.** Replayed on the 120 baseline seasons, fatigue alone changes about 10 winners, and the replaced winner was ahead by 0.11 points on average (0.29 at most). With the cap in place it changes about 11. In the three candidate franchises it changed 1, 0 and 2 of 20 seasons. It is soft, as described; the cap does nearly all the work.
- **Conflict to settle.** The owner's ruling of 2026-11-13 07:21 was "no artificial limit and no voter fatigue". The candidate's GDD text says the owner approves a soft model. I have treated the newer statement as the instruction, but the owner should confirm the reversal before this is accepted.
- **Transparency.** The GDD (§16.4) calls the awards transparent scoring models. Fatigue is stored as a component (`voterFatigue`) but the rule text shown to players does not mention it.
- **Position fairness and full careers:** covered only by the three candidate franchises so far; more seeds are needed before acceptance.

### 4. Falling Star

150,000 three-against-three battles on each build, same seeds:

| | Baseline | Candidate |
|---|---|---|
| Teams with Falling Star, abilities on | 72.9% | 65.0% |
| Its effect on team win rate | +25.8 points | **+17.9 points** |
| Next strongest ability | +10.0 | +10.2 |
| Executions per battle | 0.99 | 0.99 |
| Fire as an element | +5.9 | +4.8 |

- It works mechanically (same launch, same targets, only the splash value changed) and nothing else in the catalogue moved by more than half a point.
- **It is still the strongest Clash ability by a wide margin**, 1.75 times the next. If the aim is to bring it into the group, the splash cut alone does not get there.
- **Contract inconsistency.** The approved Dex record (`beast-dex.generated.js`, FIR-03-C) still says 50/55/60/65%, which is also what the player reads in the Dex. Two contract tests fail on it. A value change needs the Dex source, the generated file, the reviewer text and the approval register changed together, with the owner's approval.

### 5. Second Tide

- **No measurable effect.** Team effect −5.0 points on the baseline, −5.1 on the candidate. In isolation the results are identical to the decimal at both mastery levels, including executions per battle (3.76 and 4.06 alone; 3.56 and 4.56 in a team).
- **Why.** The guard only skips the heal when every ally is at full HP and already Shielded. That almost never happens. The waste measured in the audit is the heal turn spent when allies are healthy but not all shielded, or barely hurt, and that is unchanged.
- **Contract.** The Dex rule is "if all healthy, active ally" (the surplus becomes a shield). The guard departs from that in the one case it covers, and the Dex was not updated.
- **Revision:** needs a real design decision (for example, heal only when someone is missing a meaningful share of HP, otherwise attack), approved and written into the Dex.

### 6. Pocket compression and the 7% sack target

Sacks per dropback, where a dropback is a pass attempt or a sack (the tools do not yet count scrambles; see change 7):

| Measure | Baseline | Candidate |
|---|---|---|
| 120 matched practice games, abilities on | 1.9% | **1.8%** |
| Same, abilities off | 1.8% | 2.0% |
| Same, abilities and types off | 1.8% | 2.0% |
| 20-season franchise, Pro, seed 4 | 1.92% | 1.85% |
| 20-season franchise, All-Star, seed 4 | 2.01% | 1.80% |
| 20-season franchise, Rookie, seed 3 | not recorded | 2.16% |
| By season in the candidate franchises | | 0.9% to 3.8% |

**The candidate does not move the sack rate. The target is 7%.**

Side effects in the 120 matched games (abilities on, baseline → candidate): completion 57.1 → 56.8%, interceptions 0.9 → 0.9%, yards per attempt 7.64 → 7.63, deep completion 37.6 → 42.6%, yards per carry 6.27 → 6.26, points per team 13.7 → 14.0, ability events per game 95.1 → 95.2. Nothing moved beyond noise except deep completion, which rose.

**This lever cannot reach the target.** With the candidate's change pushed much further (48 matched games each):

| Pass-rush push (yards a second), ceiling | Sacks | Completion | Points per team |
|---|---|---|---|
| 0.75, 2.4 (baseline) | 1.7% | 55.3% | 12.5 |
| 1.0, 2.4 (candidate) | about 1.8% | about 56% | about 12.5 |
| 1.6, 2.4 | 2.0% | 54.5% | 12.3 |
| 2.4, 3.4 | 2.3% | 55.4% | 12.7 |
| 3.5, 4.5 | 2.6% | 54.1% | 12.2 |

Nearly five times the push gives 2.6%. The pocket collapsing faster is not what limits sacks; the quarterback gets the ball out (mean release about two seconds) or the pressure does not convert. Reaching 7% will need work on how long the quarterback holds the ball, how pressure turns into a sack, or both, and that will move completion, interceptions and scoring, which must be re-measured with it.

**Regression:** two engine tests fail on this change (a seeded sample with no sacks at all in 193 dropbacks, and Goal Line Man against the quick game).

Not yet measured for this change, because the candidate failed regression first: blocking grades and pancakes, quarterback decision quality, injuries, and the split by difficulty and by early, middle and late franchise that the GDD text now requires.

### 7. The 7% target in the GDD and the matrix

- Recorded in both, clearly marked as a target that the build does not yet meet. Good.
- **Wording point.** The text defines the denominator as attempts, sacks and qualifying scrambles. Every existing tool and every historical figure (2.5%, 2.2%, 1.7 to 2.0%) uses attempts plus sacks. With scrambles at about 1% of dropbacks the difference is small, but the tools need a scramble count before any figure can be called a measurement against this target.
- The same text block was appended to the matrix as free text; the matrix row F-2 itself was not updated. I have not edited the candidate branch.

## 3. Unintended effects seen in the candidate franchises

Three 20-season franchises on the candidate, same seeds and owner as the baseline. A different engine constant changes every game, so single franchises diverge completely and are not paired comparisons (the same owner's club won 13 titles on the baseline and none on the candidate, All-Star seed 4; and 5 against 8 on Pro). What can be read from them:

| | Baseline | Candidate |
|---|---|---|
| Completion over 20 seasons | 65.2%, 65.7% | 66.7%, 65.3%, 64.3% |
| Yards per carry | 6.0, 6.5 | **9.7**, 7.1, 7.2 |
| Points per team per game | 15.3, 17.8 | 22.3, 17.2, 16.2 |
| Owner forfeits | 3, 3, 2 | 8, 3, 4 |

- **Rushing looks higher on the candidate (7.1 to 9.7 yards a carry against 6.0 to 6.5).** Three franchises are not enough to say it is the change rather than which monsters developed, but it is the one figure outside the baseline range and it needs a proper look before any engine change is accepted.
- Forfeits are unchanged in kind: the free-agent problem is untouched by this branch, as expected.

## 4. Balance testing on the candidate

| Test | State |
|---|---|
| Clash, all 72 abilities, three against three (150,000 battles) | **Done on the candidate.** Only Falling Star moved |
| Clash isolation for the two changed abilities | Done |
| Passing, rushing and scoring, 120 matched games, three variants | Done |
| Sack lever sensitivity | Done |
| MVP races replayed under the cap and fatigue | Done |
| Three 20-season franchises (Rookie, Pro, All-Star) | Done, as a diagnostic |
| Football, all 72 abilities in paired games | **Not rerun.** The instruction was to run the full balance pass once the candidate passes regression; it does not. The engine change touches every football game, so this must be rerun (about three hours) on the revised candidate |
| Reduced Task 7 benchmark on the candidate | Not run, same reason |

## 5. Baseline results preserved

`docs/task10/results/baseline/`:
- `abilities/`: football paired games (`football-40.json`, `football-160.json`, `pairs.json`), the census, the type test, Clash isolation and round robin (`clash.json`), Clash three against three (`clash-teams.json`).
- `franchises/`: six recorded 20-season franchises (Rookie, Pro, All-Star on seeds 3 and 4) with weekly free-agent markets, full MVP races and club tables.
- `passing-48.json`, `passing-120.json`, and `passing-history-*.json` (the same study on eight earlier releases).
- `reduced-benchmark-summary.txt`: the reduced Task 7 benchmark, now complete on the baseline (28 Pro franchises). The raw run files are 60 MB and are not in the repository; they can be regenerated with the same seeds.

**Reduced Task 7 benchmark, baseline, complete (preliminary by the owner's decision):**

| Set | Runs | Integrity problems | AI club-seasons with a lineup problem | Hands-off owner win rate (target 45 to 53%) | His games forfeited |
|---|---|---|---|---|---|
| B 1–10, 10 seasons | 10 | 0 | 3 of 1,600 | 42.9% | 12% |
| H 61–70, 10 seasons | 10 | 0 | 2 of 1,600 | 50.1% | 15% |
| C 106–108, 20 seasons | 3 | 0 | 4 of 960 | 25.3% | 44% |
| CH 116–120, 20 seasons | 5 | 0 | 3 of 1,600 | 36.4% | 29% |

No AI club went below zero cap room. The 12 AI club-seasons with a lineup problem still need examining.

`docs/task10/results/candidate-5761f44/`: the candidate's passing study, Clash team study, three franchises and the list of failing tests.

## 6. Outstanding development (not done; Task 10 is not finished)

1. **Player and AI free-agent emergency roster parity.** Not started. The owner still forfeits when the market is empty at a position (3.0% of the repair owner's games; 12 to 44% of the hands-off owner's), while AI clubs are covered by generated arrivals.
2. **Remaining Clash ability and mastery fixes.** Not started, apart from the two trial changes reviewed here: Falling Star (still +17.9), Second Tide (unchanged), Foresight, Snowdrift Shelter and Cinder Clamp (both worse with mastery), Mountain Shelter, Eye of the Storm, Root Communion, Radiant Pursuit, the twelve abilities that almost never execute (Unbroken Charge never), and legendary abilities being the weakest rarity.
3. **Sack tuning to 7%.** Not achieved and not achievable with the pocket-compression lever. Needs a different mechanism, then the full set of side-effect measurements.
4. **Football ability balancing from the audit.** Not started: Stonewall Swat (+2.6 points a game), ten abilities that almost never execute in AI-played games, nine that execute without effect, and the abilities' combined 4.4-point cost to completion.
5. **Rookie rollover defect** (founding rookies are first-year monsters twice and do not age). Not fixed by the candidate.
6. **Award cap scope**, and the award rule text (it also says quarterbacks carry 1.25×; the code uses 1.35×, on the baseline too).
7. **Three weaknesses exposed by the regression run:** Hall candidate record credits depend on the career timeline; a staff renewal can settle outside ±8%; three saved-sentence places missed by central text.
8. **Owner decisions still open:** the completion target's definition, the Apex rule (repeat MVPs and title concentration), difficulty win rates.
9. **The complete Task 7 benchmark** (255 jobs on the candidate and the same on the v42.21 baseline, whose run files no longer exist). Only the reduced set is done.
10. **Football 160-game pass over all 72 abilities** on whichever build is accepted.

## 7. Recommended next step

Revise the candidate before any further balance testing: move the cap to the MVP score, replace the rookie exclusion with the rollover fix, drop or redesign the Second Tide guard, decide Falling Star's value and update the Dex with it, and take the pocket-compression change out (it does not help and breaks two tests) until a mechanism that can reach 7% is designed. Then rerun the full suite, and only then the complete balance pass.
