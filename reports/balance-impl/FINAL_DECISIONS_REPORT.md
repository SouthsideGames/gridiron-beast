# Final Calibration Decisions and Targeted Implementation — report

Branch `impl/balance-audit-2026-11` (PR #191), 2026-11-26. Owner brief: "Final Calibration Decisions and Targeted Implementation".
Evidence is in `reports/balance-impl/decisions/`. Design text is in GDD §61.15.

## 1. Executive summary

@@SUMMARY@@

## 2. Decision tracker

| ID | Decision | Status | Implementation or finding | Validation | Remaining concern |
|---|---|---|---|---|---|
@@TRACKER@@

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
  - Power Left (like Power Right) still sits above the ordinary run baseline, at 7.41 against AI-called defences versus 5.12.
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

@@STAMINA@@

## 8. Testing

@@TESTING@@

## 9. Remaining owner decisions

@@DECISIONS@@
