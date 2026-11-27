# Final Calibration Decisions and Targeted Implementation — report

Branch `impl/balance-audit-2026-11` (PR #191), 2026-11-26. Owner brief: "Final Calibration Decisions and Targeted Implementation".
Evidence is in `reports/balance-impl/decisions/`. Design text is in GDD §61.15.

## 1. Executive summary

- **D-1, one salary cap: implemented.** Existing franchises move to 1.6 M once, at their next offseason.
  - No beast is released or rewritten.
  - While a club is over the cap, moves that add salary are refused.
  - Notices go through HQ and League News.
  - The 8 owner scenarios pass.
  - On six legacy saves (Rookie, Pro, All-Star) every franchise transitioned once and stayed under the new cap. There were no commissioner releases and no illegal club.
- **D-2, Rookie quality −7: production.** Nothing else in difficulty changed.
- **D-3, sack-rate target: closed.** The GDD says the target is not enforced.
- **D-4/D-6, run defense: investigated; owner decisions implemented.**
  - The Counter test is revised (Option A); the play is unchanged.
  - **Power Left is now the mirror of Power Right (Option B).** Against Scrape Exchange it drops from 24.8 to 5.3 yards a carry, against Pinch Spill from 28.2 to 6.0, and against run fronts from 12.9 to 6.6. League play is unchanged in a 500-game study.
  - Lead Draw is closed with no change.
  - The defensive engine is unchanged.
- **D-5, Foresight: implemented.** It now casts in addition to the attack: +1.61 pp paired against the shipped version, and the ability's contribution is now +0.16 pp instead of −1.45.
- **D-7, stamina: experiment completed; nothing adopted.**
  - **Normal practice:** weekly fatigue is almost always 0 at kickoff, so linking it to starting stamina (B, C) has no measurable effect.
  - **Full pads every week:** fatigue reaches about 21 by the postseason, but even the moderate link does not make depth pay.
  - Thin benches stay the strongest roster build (+2.5 to +3.5 wins).
- **Nothing is merged or released.** PR #191 is open; PR #192 is a draft. The full suites were not run.

## 2. Decision tracker

| ID | Decision | Status | Implementation or finding | Validation | Remaining concern |
|---|---|---|---|---|---|
| D-1 | Existing franchises move to 1.6 M at the next offseason | Implemented | `applyCapTransition` (once, `capEra` 2); `overCapBlock`; HQ and League News notices | `cap-transition.test.js` 9/9; six legacy-save runs: no illegal club, no commissioner release | The study tool missed the news items (covered by the tests); AI compliance checked in detail on one save |
| D-2 | Rookie quality −7 | Implemented | Rookie row `quality: -7`; development rates unchanged | `task8-identities` passes; earlier calibration: 50.0% against 35.7% wins | All difficulties sit below their reference bands for the hands-off owner under 1.6 M (earlier report) |
| D-3 | Sack-rate target | Closed without changes | GDD: the target is not enforced | n/a | None |
| D-4 | Counter, Power Left, run fronts | Implemented | Counter test revised (owner Option A); Power Left mirrored (owner Option B); no engine change | `run-read` 17/17; play tests 107/107; situational and 500-game studies | Power Left and Power Right stay above the ordinary-run baseline (7.4 and 6.3 against about 5.0–5.1 for AI-called defences) |
| D-5 | Foresight in addition to the attack | Implemented | `chooseAction` returns `null` after preparing; Dex text | 112/112 Clash tests; paired +1.61 pp (SE 0.19) | Against a foe with a status source it still costs 5.0 pp |
| D-6 | Lead Draw against run fronts | Closed without changes | The gain is against contain and edge calls, by design | Bear Front 0.26 and Run Wall 0.58 yards a carry | None |
| D-7 | Stamina and depth | Experiment completed | Tools-only hook (`--fatigueStart`, `--practice`, `--rosterSize`); production unchanged | 8 runs × 24 seasons × 9 strategies | Depth is not rewarded; any lever is an owner decision |

## 3. Cap transition (D-1)

**Implemented.** A franchise begun under the 1.8 M cap (no `capEra`) finishes its current season under 1.8 M and moves to 1.6 M permanently when that season ends. The move happens in `endSeason` through `applyCapTransition`, before retirements, renewals, free agency and the draft.
- **It happens once.** The save records `capEra: 2` and `capTransition { year, from, to, committed }`. New franchises already carry `capEra: 2` and are unaffected. A save without `capEra` loads normally.
- **Nothing is done to the roster.** No release, no salary or contract rewrite, no attribute change, no forced retirement. History is untouched.
- **The remedies already in the game are the only ones used:**
  - the offseason tools (declining renewals, releases, trades that shed salary, cheaper signings);
  - next season's commissioner review, which is unchanged.
- **New guard: while a club is over the cap, any move that adds salary is refused** (`overCapBlock`):
  - offseason signings;
  - pick-for-veteran trades;
  - trade-desk deals that add salary to an owner who is over (the same rule AI clubs already follow).

  The Task 7 market already refuses offers above usable cap.
- **No permanent block.** Being over the cap never blocks the season gate.
- **Notices:**
  - an HQ notice while the change is due: both caps, when the change applies, the projected position and the actions that help;
  - one League News item per season while it is due;
  - a League News item when the new cap takes effect, giving the room or the excess.

  There is no new screen. Text keys: `franchise.cap_change_notice[_over]`, `cap_change_coming`, `cap_now_in_force[_over]` and `over_cap_no_additions`.

**The 8 scenarios** (`tests/cap-transition.test.js`, 9 tests, all passing):

| # | Scenario | Result |
|---|---|---|
| 1 | Below 1.6 M | Transition once; cap 1.6 M; roster, contracts, attributes and history unchanged; it never repeats |
| 2 | Slightly above (+20,000 committed) | Contracts stand. Once the new cap applies the club is over (317,600 on current payroll), and a +30,000 move is refused, while a move adding nothing or shedding salary is allowed |
| 3 | Well above (+400,000) | Same (706,720 over) |
| 4 | At the roster minimum (26) and over | The commissioner names monsters and the owner chooses; releases bring the club under; the review ends; there is no deadlock |
| 5 | Several expensive contracts | All keep salary and contract terms |
| 6 | Legendary and Apex | Never released or changed |
| 7 | Approaching the offseason | The HQ notice shows 1.8 M, 1.6 M and the position; a new franchise has none; the notice is gone once the new cap applies |
| 8 | Saved and reopened | Before the transition the reload is still due under 1.8 M; after it, `capEra` and `capTransition` persist and nothing repeats |

**Transition simulations.** Saves were made on the old 1.8 M build (`4b6ea6f`) and played 2–3 seasons and 10 weeks by the soak owner, then continued on this build for up to three more seasons (`tools/balance-audit/cap-transition-study.mjs`; results in `decisions/cap-transition/`):

| Save | Payroll at load (1.8 M era) | Transition | Owner payroll after (1.6 M) | Over the cap at any snapshot | Commissioner releases | Invariant problems |
|---|---|---|---|---|---|---|
| Rookie seed 3 | 1,588,500 | once, end of year 4 | 1,500,100–1,598,600 | no | 0 | 0 |
| Rookie seed 4 | 1,696,700 | once, end of year 4 | 1,418,100–1,583,000 | no | 0 | 0 |
| Pro seed 4 | 1,627,000 | once, end of year 4 | 1,542,300–1,589,900 | no | 0 | 0 |
| Pro seed 5 | 1,541,400 | once, end of year 3 | 1,516,800–1,595,300 | no | 0 | 0 |
| All-Star seed 4 | 1,713,300 | once, end of year 4 | 1,528,600–1,598,300 | no | 0 | 0 |
| All-Star seed 5 | 1,640,900 | once, end of year 3 | 1,466,700–1,581,700 | no | 0 | 0 |

- **Owner compliance:** the owner got under the cap through expiring contracts and ordinary releases. Rosters went from 38 down to 30–37, all at or above the 26 minimum.
- **AI compliance (Rookie seed 4):** checked against the engine's own Task 7 rules (`tools/balance-audit/cap-transition-ai-check.mjs`). Before the change, after the change's offseason and at the next season's start, no AI club had commitments above the cap or a negative usable cap.
  - The study tool's coarser "payroll above cap − staff allowance" flag showed 1–4 AI clubs up to 74,000 over. That flag is a measurement artifact (it charges the full allowance as staff), not a cap violation.
- **Legal rosters:** every club fielded a legal roster. The AI's smallest roster at a season start was 36–38. There were no deadlocks.
- **One save stopped early.** In All-Star seed 4 the board fired the soak owner at the year-5 gate, which has nothing to do with the cap: the payroll was 1,528,600.
- **Two other make-phase saves were dropped.** Pro seed 3 and All-Star seed 3 were fired on the old build before a save was written. They were replaced with seed 5 at 2 seasons.
- **Measurement gap:** the study's news capture did not match the stored news format. The notices are covered by scenario tests 1 and 7 instead.

## 4. Rookie and quarterback (D-2, D-3)

**Rookie quality −7 is production** (`src/franchise/franchise.js`, the Rookie difficulty row: `quality: -7`).
- AI development is unchanged: Rookie 0.6, Pro 1.0, All-Star 1.5.
- The gym correction, ceilings, progression and evolution are unchanged.
- Pro and All-Star are not tuned.
- Existing beasts keep their attributes. The value applies only to clubs and arrivals generated from now on. There is no rubber-banding.
- Quarterback Awareness and read timing are unchanged.

**Evidence: the earlier calibration measurement (no new 15-season study, as the brief asks).**
- The hands-off benchmark owner wins 50.0% at −7 and 35.7% at −4.
- Playoff seasons: 11 at −7, 8 at −4.
- Ordering under the 1.6 M cap: Rookie 50.0 > Pro 36.0 > All-Star 21.9.
- Source: `FINAL_CALIBRATION_REPORT.md` §4.

**Targeted test:** `tests/task8-identities.test.js` expects −7, and existing beasts are not reduced. It passes (section 8).

**Benchmark owner's money handling (optional):** not changed.
- It belongs to the tools only and does not affect the game.
- It is left for a later study, so the −7 figures stay comparable with the earlier ones.

**Sack rate (D-3): closed with no change.**
- The GDD now says the earlier 7.0%-of-dropbacks figure is not a target and is not enforced (§61.15.3, and the note in the Task 10 section).
- The measurement tools stay.

## 5. Run defense investigation (D-4, D-6)

**No defensive engine change.** Read timing, contain fits and the draw show are unchanged. The tools used:
- `tools/balance-audit/run-defense-trace.mjs`: the Lab's plain sides with the defence's Awareness set to 35, 65 or 95, 60 matched seeds, developer trace;
- `playbook-situations.mjs`: 16 generated clubs, 6 situations, defence families and AI-called defences;
- a per-defence script with generated clubs (`decisions/run-defense/patches/perdef.mjs`).

Evidence is in `decisions/run-defense/`.

**Counter (owner approved Option A; the test is revised, the play is unchanged).**
- **Why the test failed.** After the approved B-gap path (F-10), the false step deceives only the calls that over-commit to the flow.
  - At Awareness 50, 65 and 95, Counter averages 9.8, 8.2 and 4.2 against Bear Front, and 13.5 at Awareness 35 against Scrape Exchange (3.5 at 95). Awareness recovers there.
  - Against Run Wall and Cover 3 nobody bites. The paired effect of Awareness 95 against 50 on the same seeds is +0.27 ± 0.80 and −0.10 ± 0.71 yards: there is nothing to recover from.
  - 2 of 60 Run Wall plays end before the handoff (a sack, or a 25-yard scramble at Awareness 95), which adds noise.
  - Recognition comes about 0.25 s after the handoff at every Awareness level.
- **A wider false step was tested and rejected.** A 1.4-yard step passes the old test, but the handoff moves from 0.73 s to 1.10 s (the missed-mesh fallback) and plays without an exchange rise from 2 to 16 in 360. Smaller variants (1.1–1.5 yards) still delay the handoff to 0.80–1.05 s with 5–7 misses.
- **The revised test** (`tests/run-read.test.js`):
  - keeps the Bear Front > Cover 3 check;
  - requires Awareness recovery against Bear Front and Scrape Exchange;
  - against Run Wall and Cover 3, requires that high Awareness is no meaningful disadvantage: a paired mean of at most +1.5 yards, about two standard errors.

  The reason is written in the test. 17 of 17 pass.

**Power Left (owner approved Option B; adopted: the mirror of Power Right).**
- **Cause.** The engine is left–right symmetric: a mirrored Power Right, run left, measures like Power Right. The excess came from Power Left's design.
  - It ran away from the tight end, who sealed the back side.
  - Against the two-lineman contain calls (Scrape Exchange, Pinch Spill), the left guard, the pulling guard and the receiver's stalk blocked every play-side defender.
  - Both contain linebackers rush the outside lanes, so the next defender was the free safety 12 yards deep.

Configurations tested, yards per carry with generated clubs:

| Configuration | Scrape Exch. | Pinch Spill | Edge Contain | Over Front | Bear Front | Run Wall | Cover 3 | Cover 1 | Cover 0 | Zone Blitz |
|---|---|---|---|---|---|---|---|---|---|---|
| Power Left before | 24.80 | 28.16 | 14.95 | 7.77 | 6.34 | 4.05 | 10.03 | 7.75 | 15.93 | 5.60 |
| Redesign: tight end hinge (soft back-side seal) | 24.20 | 28.16 | 17.48 | 7.77 | 6.34 | 4.05 | 10.03 | 7.77 | 15.93 | 5.66 |
| Redesign: tight end wham across the formation | 27.31 | 17.45 | 17.33 | 5.53 | 20.27 | 10.95 | 7.30 | 8.16 | 19.31 | 7.29 |
| Redesign: guard kicks out, left guard climbs | 24.84 | 28.16 | 15.54 | 7.35 | 6.09 | 3.40 | 10.31 | 7.87 | 16.19 | 5.66 |
| Redesign: tighter B-gap path | 17.30 | 14.30 | 13.34 | 6.24 | 6.71 | 4.16 | 9.33 | 5.91 | 10.27 | 5.11 |
| **Mirror of Power Right (adopted)** | **5.30** | **5.97** | **10.01** | **5.95** | **13.59** | **9.32** | **8.24** | **4.98** | **14.44** | **7.29** |
| Power Right (unchanged) | 4.30 | 4.05 | 12.83 | 5.49 | 11.02 | 8.65 | 8.29 | 5.53 | 12.54 | 8.91 |

Situational before and after (`decisions/run-defense/power-left/`): yards / success % / explosive % by family.

| Power Left | Zone | Man | Blitz | Run fronts | AI-called | Goal line |
|---|---|---|---|---|---|---|
| Before | 8.70 / 79 / 54 | 10.27 / 72 / 44 | 7.23 / 50 / 27 | 12.93 / 68 / 31 | 9.88 / 68 / 38 | 7.53 / 50 / 26 |
| Tighter path (identity kept) | 7.20 / 65 / 38 | 7.10 / 57 / 26 | 4.89 / 37 / 16 | 11.13 / 58 / 26 | 8.30 / 56 / 28 | 5.29 / 40 / 17 |
| **Mirror (adopted)** | 8.06 / 75 / 49 | 7.67 / 67 / 24 | 8.33 / 60 / 27 | 6.64 / 44 / 13 | 7.41 / 63 / 28 | 8.48 / 67 / 26 |
| Power Right | 7.79 / 74 / 45 | 7.71 / 66 / 26 | 7.62 / 61 / 25 | 7.06 / 49 / 15 | 6.33 / 59 / 23 | 5.03 / 49 / 15 |
| Ordinary run baseline | 5.50 / 54 / 20 | 7.41 / 56 / 26 | 3.96 / 36 / 13 | 5.92 / 41 / 16 | 5.12 / 44 / 15 | 3.46 / 30 / 13 |

- **Why the mirror.** None of the four redesigns that kept the back-side seal removed the exploit. The best of them, the tighter path, still gains 14–17 yards against the two problem calls and 11.1 against run fronts. The mirror is the most reliable and balanced result.
- **What Power Left still offers.** It differs from Power Right only in side: it is called to the left, against defences that overload the right.
- **What the mirror did not fix.**
  - Power Left (like Power Right) still sits above the ordinary run baseline, at 7.41 against AI-called defences versus 4.97 in the same run (5.12 before).
  - It rose against goal-line calls, from 7.53 to 8.48.
- **The change.** Formation Tight I with the tight end at the left (−3.2) and the receiver at the right (+18). The tight end blocks on the play side at (1.5, −4.5) and the receiver stalks at (4, 16). Everything else is unchanged.
- **Coaching notes.** The "watch" and "loses" notes now use Power Right's: the hole opens where the puller kicks out; Power Left loses to All-Out Pressure and Run Wall. The description reads "Guard pulls to lead through the left B-gap, behind the tight end". Two orphaned text keys were removed.
- **Tests:** 107 of 107 pass in 11 files: `run-read`, `run-vision`, `run-game`, `attr-trials`, `task8-abilities-light-metal`, `central-text`, `text-style`, `playbook`, `playbook-reserve`, `task10-handoff-plays` and `legendary-plays`.
- **Matched-seed game study:** see section 8.

**Lead Draw (owner: closed, no change).**
- **Against the contain and edge calls,** its yards (Scrape Exchange 8.39, Edge Contain 8.26) match those calls' written weakness: Edge Contain "loses: Power, Counter and QB Draw inside". Inside Zone also gains 5.6–6.0 against them.
- **The study's "run front" family is four contain and edge calls** (Edge Contain, Heavy Robber, Heavy Contain, Over Front). That is where the apparent run-front gain came from.
- **Against Bear Front and Run Wall,** Lead Draw averages 0.26 and 0.58, the same as Inside Zone (0.16 and 0.59).
- **Unchanged:** the show-pass mechanic and read timing.

## 6. Foresight (D-5)

**Implemented.** Foresight (Cerebrix, PSY-03-C) prepares its mirror and then makes the ordinary attack in the same turn.
- The active-foe restriction stays: it prepares only while the current active foe applies a harmful status.
- `chooseAction` returns `null` after preparing, so the ordinary attack follows.
- Root Communion, Eye of the Storm and every other ability are unchanged.

**Paired-method result:** 8,000 battles per arm, same seeds; `decisions/clash/cerebrix-A-d5.json`.

| Measure | Before (shipped: replaces the attack) | After (D-5: in addition) |
|---|---|---|
| Contribution, ability on minus ability off | −1.45 pp | **+0.16 pp** (SE 0.05) |
| Paired change against the shipped version | | **+1.61 pp** (SE 0.19); 235 battles change result |
| Preparations | | 1,270 (0.16 per battle) |
| Reflections | 178 | 195 (15% of preparations) |
| Foe with a status source | −11.9 pp | −5.0 pp |
| Foe without one | | −0.9 pp |

**Tests:** 112 of 112 passing in 8 files:
- `t8-abilities-f`, `t8-interactions`, `t8-review` (new scenario `prepares-and-attacks`), `t8-gate`;
- `task8-abilities-psychic-dragon`, `task8-identities`, `t8-n9c-rulings`, `implementation`.

They cover:
- eligibility;
- reserves and substitutions;
- prepare-then-attack;
- a defeated target;
- reflection;
- sequencing, the battle log and replay.

**Docs:** updated for the "in addition" wording:
- the Beast Dex ability text (`docs/beast-dex/data/abilities.json`, `families/cerebrix.md`);
- the generated Dex.

## 7. Roster depth and stamina (D-7)

**Experiment only. Nothing was adopted.** Production is unchanged:
- recovery stays 28;
- fatigue gain, injury odds, Durability weights and starting stamina are untouched;
- there is no depth bonus.

**Architecture review: what is reset at game start, and what affects what**

| Mechanism | Where | What it does | Reaches game stamina? |
|---|---|---|---|
| Weekly fatigue gain after a game | `progression.js` `afterGame`: (16 + (1 − Durability) × 10 + 0–5) × snap share | Raises `m.fatigue` (0–100) | No |
| Weekly fatigue gain from practice | `practiceFatigue`: light +4, normal +8, full pads +14 | Raises `m.fatigue` | No |
| Weekly recovery | `recoverWeek`: −28 (bye −50); offseason resets to 0 | Lowers `m.fatigue` | No |
| Effective attributes | `effectiveAttributes` | Speed, Strength and Agility × (1 − up to 6% at fatigue 100) | Indirectly: attributes only |
| Injury risk | `afterGame` | +up to 3 pp at fatigue 100 | No |
| Game stamina | `t8/stamina.js` `startGame`: capacity = stamina = permanent Durability | Created fresh in every game's state, at first participation | Always starts full |
| In-game drain and rest | −1 per play; halftime restores 50%; exhaustion at 0 halves all 12 attributes | Rotation (`substitutions.js`) rests a monster below its philosophy's threshold | |

- **Nothing resets fatigue at game initialization.** Game stamina is simply a separate record that always starts full, so weekly fatigue never reaches it.
- **Normal practice cancels out.** A full-snap starter gains about 22 from a game and 8 from a normal practice. Recovery takes 28 back. Fatigue therefore sits near 0 at kickoff under normal practice.

**Variants (tools only: `roster-season.mjs --fatigueStart=K`):**
- **A (production):** no change.
- **B (mild, K = 0.15):** a monster starts the game with capacity × (1 − 0.15 × fatigue/100).
- **C (moderate, K = 0.30):** the same with 0.30.

Both bounds keep at least 70% of capacity and never cause exhaustion. Capacity, drain, halftime and the rotation rules are unchanged.

**Study design:**
- A fixed 16-game study: 14 regular games plus 2 postseason games that every strategy plays. A real season has 14 games, and only qualifiers play a postseason.
- 24 seasons per run, matched seeds.
- Every strategy has the same payroll: 862,850 on a 28-monster roster, below the control's. The salary curve is the production one; the generated quality-60 clubs sit well under the 1.6 M cap.
- Ratings are written to `dev.current` (the earlier correction).
- Opponents are generated fresh each week with fatigue 0, so the comparison that matters is each strategy against the control under the same variant.
- These runs started before the Power Left change landed. Every strategy faced the same play book.

**Wins per season against the control.** Standard errors are 0.3–0.8.

| Strategy | A, normal | B, normal | C, normal | A, full pads | C, full pads | A, full + 26 | B, full + 26 | C, full + 26 |
|---|---|---|---|---|---|---|---|---|
| Control (balanced rotation) | 8.21 W | 8.19 W | 8.17 W | 8.29 W | 8.35 W | 8.31 W | 8.83 W | 8.31 W |
| Superstars | −2.06 | −2.08 | −2.06 | −2.71 | −2.63 | −2.13 | −2.94 | −2.50 |
| Elite QB | +0.54 | +0.56 | +0.63 | +0.04 | +0.35 | +0.19 | −0.25 | +0.31 |
| Depth | −1.44 | −1.38 | −1.27 | −2.04 | −2.13 | −1.35 | −1.81 | −1.75 |
| Thin bench | **+3.46** | +3.48 | +3.48 | +2.71 | +2.50 | +3.00 | +2.40 | +2.54 |
| Thin bench, starters rotation | **+3.50** | +3.52 | +3.54 | +2.96 | +2.71 | +2.69 | +2.13 | +2.77 |
| Balanced roster, heavy rotation | −1.00 | −0.98 | −0.96 | −0.96 | −1.33 | −1.04 | −2.13 | −1.06 |
| Balanced roster, starters rotation | +0.44 | +0.46 | +0.52 | −0.25 | −0.17 | +0.35 | −0.35 | 0.00 |
| Depth, heavy rotation | −2.90 | −2.88 | −2.79 | −2.94 | −2.67 | −2.58 | −2.88 | −2.83 |

**Fatigue distributions.** Starter fatigue at kickoff, 0–100; control roster unless named.

| Condition | Median | 90th percentile | Max | Kickoffs at 30 or more | Mean by week 1 / 5 / 10 / 14 / 16 |
|---|---|---|---|---|---|
| Normal practice, 28 (A) | 0 | 1.9 | 12.5 | 0% (max below 30) | not recorded in this run |
| Normal practice, starters rotation | 0 | 2.3 | 13.1 | 0% (max below 30) | not recorded |
| Full pads every week, 28 | 3.8 | 35.3 | 68.3 | 14.0% | 0 / 6.8 / 13.9 / 18.9 / 20.8 |
| Full pads, starters rotation | 4.4 | 39.5 | 70.0 | 15.9% | 0 / 7.7 / 15.3 / 20.5 / 22.6 |
| Full pads, heavy rotation | 0.3 | 19.0 | 53.8 | 5.2% | 0 / 3.4 / 7.0 / 9.4 / 10.6 |
| Full pads, short-handed (26) | 4.5 | 37.3 | 68.8 | 15.7% | 0 / 7.7 / 14.7 / 19.7 / 22.2 |
| Full pads, 26, starters rotation | 5.1 | 41.0 | 70.9 | 17.6% | 0 / 8.2 / 16.6 / 21.6 / 24.1 |

The weekly series was added to the tool after the normal-practice runs, so only the full-pads runs have it (`decisions/stamina/`).

**In-game stamina** (control, starters' mean as a share of capacity):
- **A, normal:** 0.85 when Q2 begins, 0.98 when Q3 begins (after halftime), 0.84 when Q4 begins, 0.67 at the final whistle. 0.24 exhaustions per game; 9.8 substitutions per game. Heavy rotation makes 55 substitutions and Starters 3.5. The bench plays 3.3% of snaps (11.2% under heavy rotation).
- **C, full pads:** Q2 begins at 0.82 (was 0.84). Exhaustions rise from 0.21 to 0.26 per game. The superstar strategy reaches about 1.6 per game on a 26-man roster.
- **Injuries:** 3.3–4.5 per season in every condition. Starter games missed: 2.1–4.4.

**Findings:**
1. **Under normal practice, weekly fatigue is almost always zero.** The median is 0, the 90th percentile about 2 and the maximum about 13. So B and C change nothing measurable: every strategy moves by at most 0.18 wins between A, B and C. This is the finding the owner anticipated. No more punitive formula was tried.
2. **Fatigue becomes meaningful only with full-pads practice every week.** Starters average about 21 by the postseason, 14–18% of starter kickoffs are at 30 or more, and the maximum is about 70. Starters-only rotations and 26-man rosters add 1–3 points on top. Heavy rotation halves it.
3. **Even then, the moderate coupling (C) does not reward depth.** Depth goes from −2.04 to −2.13, and depth with heavy rotation from −2.94 to −2.67. Thin benches keep a large edge: +2.5 to +3.5. Every A/B/C difference is within about one standard error.
4. **Depth is not rewarded in any condition** because:
   - bench monsters are rated lower;
   - the rotation rests a starter only below its threshold;
   - exhaustion is rare (0.1–0.8 per game).

   The stamina connection with weekly fatigue is not the lever for that. Any lever that would change it is an owner decision (see section 9).
5. **Not measured:**
   - the AI franchise clubs' own weekly handling: the opponents here are generated each week;
   - the effectiveness of light practice or bye-week rest beyond the recovery figures above.

## 8. Testing

**The full fast and sim suites were not run**, as the brief and the owner's follow-up ask. Only the targeted runs below were made.

| Area | Files | Result |
|---|---|---|
| D-1 cap transition and franchise (final tree) | `cap-transition`, `task7-floor`, `task8-identities`, `franchise-save-compat`, `save`, `trading-second-pass` | @@INTEG2@@ |
| D-1 and D-2, first pass (before the Power Left change and the Counter revision) | those six plus `central-text`, `text-style`, `run-read` | 96 of 97; the one failure was the Counter test, since revised |
| D-4 Counter (revised) | `run-read` | 17 of 17 |
| D-4 Power Left (mirror) | `run-read`, `run-vision`, `run-game`, `attr-trials`, `task8-abilities-light-metal`, `central-text`, `text-style`, `playbook`, `playbook-reserve` | 96 of 96 |
| | `task10-handoff-plays`, `legendary-plays` | 11 of 11 |
| D-5 Foresight | `t8-abilities-f`, `t8-interactions`, `t8-review`, `t8-gate`, `implementation`, `task8-abilities-psychic-dragon`, `task8-identities`, `t8-n9c-rulings` | 112 of 112 |

**Studies:**
- **Matched-seed game study** (500 games, seed 1, before and after the Power Left change; `decisions/run-defense/game-study/`). League yards per carry 4.70 → 4.58; points per team game 12.5 → 12.4; every other league rate moved by about one point or less. Power Left 7.47 → 7.29 yards per carry, runs of 15 yards or more 12.1% → 8.6%.
- **Situational and per-defence studies:** section 5.
- **Cap transition saves:** section 3.
- **Stamina:** section 7.

**Published game files:** `python3 tools/release-files.py` reports **RELEASE FILE LIST OK: 512 files**. No `src` file was added.

**Clean-up:**
- removed the temporary worktrees of the old 1.8 M build and the pre-change tree;
- kept the evidence under `reports/balance-impl/decisions/` (cap-transition, run-defense, stamina, clash);
- no history was rewritten.

**Achievements (PR #192, for reference):** 137 of 137 in its targeted batch.

## 9. Remaining owner decisions

| Decision | Finding | Options | Recommendation | Reason |
|---|---|---|---|---|
| Depth value (D-7 follow-up) | Thin benches win 2.5–3.5 more games than balanced rosters on the same payroll. Depth and heavy rotation lose 1–3. Fatigue at kickoff is about 0 under normal practice. | (a) Leave it. (b) Have weekly fatigue reach starting stamina only under heavy workloads, e.g. C with full pads (measured: no effect on depth). (c) Look at the rotation thresholds or how bench ratings are valued. (d) Change recovery (not authorized). | (a) for now; study (c) if depth should matter | B and C don't change strategy value even when fatigue is meaningful. The edge comes from where the money buys rating, not from fatigue. |
| Power plays above baseline | After the mirror, Power Left and Power Right gain 7.4 and 6.3 against AI-called defences; the ordinary run averages 5.0–5.1. Power Left gains 8.5 against goal-line calls. | (a) Leave both. (b) A joint Power study (pull timing, the tight end's target). | (a) | Both now behave alike and sit within the range of strong runs. The extreme cases are gone. |
| Merge order | #191 is ready for review; #192 needs #191 merged first, then its threshold calibration. | Merge #191, run the achievement threshold calibration, then review #192. | As listed | Golden Boot and Return King depend on #191. |
| Full regression | Only targeted tests were run. | Run the full fast and sim suites before merging. | Before merging #191 | The changes touch the franchise economy, a play and the Clash ability. |
