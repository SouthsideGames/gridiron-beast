# Balance audit implementation log (working notes for the final report)

Branch `impl/balance-audit-2026-11`, from audit `d1f2d79` (game code = `main` `58c33ee`, v43.50.0-sideline).

## Phase 1: tools and baselines (R-3)
- `tools/lib/ability-strip.mjs`: one "abilities off" control for every study tool. It strips the slots, kicker, returner, bench and rotation pool, and asserts that nothing is left.
- Applied to `passing-calibration`, `task10-ability-strength`, `defense-audit` and `defense-fix-compare`. A control game that executes any ability now fails the run.
- Removed the audit-only `tools/balance-audit/passing-calibration-rotation-strip.mjs`, which is superseded.
- Test `tests/ability-strip.test.js` (3 tests).
- Corrected baselines are in `baseline/`. With abilities off there are 0 executions; completion is 59.7% off against 55.0% on.

## Phase 2
### R-0: Board forecast uses the real league
- `startSeason` rates AI clubs at their persistent strength (`aiTeam`) once a league exists, otherwise at today's generator.
- Talent, expected win % and Coach of the Year all read `f.season.expectations`, which now holds the real strength.
- Old saves keep the current season's stored expectations, because they are only written at season start.
- Live-Board traces (hands-off owner, 5 seasons):
  - Pro seeds 1–3: 0 of 3 dismissed (audit: 3 of 3).
  - All-Star seeds 1–3: 1 of 3 dismissed, after 2-12, 5-9 and 3-11 (audit: 3 of 3). The other two owners met their goals in 9 of 10 seasons.
  - Rookie seeds 1–3: 0 of 3 dismissed. Rookie seed 2 ended 4-10 and 3-11 with confidence −1, so the Board still warns on Rookie. These ran with R-0, R-1 and R-6.
  - In all (Pro and All-Star): 1 of 6 dismissed, against the audit's 6 of 6 (experiment X-2: 2 of 6). The one dismissal followed three clearly losing seasons.
  - Missed goals still occur (Pro seed 3 went 5-9 with confidence −1), so the Board still bites.
  - Caveat: Pro seeds 1–3 and All-Star seed 1 ran on R-0 alone. All-Star seeds 2–3 started after the R-1 and R-6 commits, so they ran with those too.

### GM and coaching turnover
- None exists for AI clubs: `headCoachName` is fixed per franchise, gym coaches are fixed, and the staff allowance is fixed ("no carousel, no poaching, no promotions").
- **Deferred, as instructed.** Not built; the rival is unchanged.

### R-1: attribute uses
- DL Speed: added to the pass-rush shed, as 0.2 × (Speed − 40).
- Defender Catching: sets the pick reach (1.0 yd at 35; about 1.24 at 65 and 1.48 at 95).
- Zone Coverage: reaction weight 0.30, contest reach ×(1 + 0.6Δ), contest weight 0.45.
- All three are centred on the typical new-league starter (`R1_TYPICAL`: DL Speed 40, DB Catching 35, zone Coverage 45; measured over 300 generated clubs: 35, 30–31, 36–48).
- DL Tackling: works per sack attempt (finish 52 → 72%). Only the Lab trial was saturated; it is now fixed in the Lab (finish 46.5 → 77%). No engine change.
- RB Awareness: **investigated, no engine change.** It works through the owner-approved vision system (Phase C, `preContactLane` / `laneChoice`).
  - Broad probe (6 runs × 3 fronts), Awareness 30 → 95: yards per carry 4.28 → 5.08, 10+ yard runs 10.8 → 16%. Stuffed runs are flat at 26.8%, because the stuff happens at the line before he reads.
  - At the same weight in the RB overall (2), Strength moves yards 4.07 → 5.37. Speed (weight 3) moves them 3.87 → 9.57.
  - Awareness is real but the weakest weighted RB attribute. Its weight is reviewed with the overall weights in Phase 5 (R-2 / R-17), not by a new engine term.
- Attribute sweep after R-1 (`r1/attr-sweep-n200.json`, n = 200, levels 30–95):
  - `speed_dl` sacks 0.265 → 0.40; the audit had them flat (0.265 → 0.28).
  - `coverage_zone`: completions allowed 0.45 → 0.395, breakups 0.10 → 0.19; the audit had them flat at 0.80.
  - `tackling_dl_sack` finish 0.53 → 0.79.
  - `catching_cb_pick` interceptions 0.005 → 0.02. This trial rarely offers a pick chance; the probe shows 0.3 → 1.0%.
  - Other trials moved in level by a few points but not in shape. The Lab's base of 65 sits above the R1_TYPICAL centres, so every Lab defender rushes and covers a little better than a typical starter. Expected, and the slopes are unchanged.
- Game level, 500 mixed games (seed 1), audit → first version (centred on 65) → final version (centred on typical):

  | Measure | Audit | Centred on 65 | Centred on typical |
  |---|---|---|---|
  | Completion % | 52.8 | 53.3 | 53.1 |
  | Sacks, % of dropbacks | 2.7 | 2.7 | 2.8 |
  | Interceptions, % of attempts | 1.1 | **0.7** | 1.1 |
  | Points per team-game | 12.87 | 13.03 | 12.69 |
  | Yards per carry | 5.31 | 5.46 | 5.33 |

  Centring on 65 cut interceptions by a third, because real defenders' Catching is about 30. Centring on the typical starter fixed it.
- Targeted tests: 76 of 76 passed (attr-trials, coverage, def-fixes, def-scenario, pursuit, run-game, zone-intel, engine), on the version centred on 65.

### R-6: emergency positions
- `EMERGENCY_POSITION` in `personnel.js` (the approved table).
- The cover fills base slots only, last resort, best by the slot position's overall on his own attributes:
  - before the game: `buildDepthChart`, after every base slot's own-position pick; `legalFiller`;
  - in the game: `selectUnit`, a second pass;
  - the engine fallback: `pickSlots`;
  - the play check: `eligiblePlays` → `emergencyFeasible`, exact for the one-cover-per-position table.
- Removed the dormant ×0.9 secondary-position attribute factor in `effectiveAttributes`, so there is no artificial penalty. It was unreachable under one-position eligibility.
- Normal eligibility is unchanged (`canPlay`, one position per family). The owner cannot list a beast at his emergency position. Package slots never take a cover.
- Forfeit, when it is still unavoidable:
  - `lineupForfeit` keeps the played score, quarter and clock (`state.forfeit.played`); the official result stays 0-21;
  - stats played stay recorded (as before);
  - league, player, fixture and playoff results carry `forfeit`, `inGame`, `forfeitBy` and `playedScore` (`inGameForfeit`);
  - League News names it ("forfeit: no legal lineup mid-game; 14-3 when play stopped").
- Lineup interface: an emergency cover is announced in the match strip and in Lineup & Substitutions ("X (K) covers QB in an emergency"). The depth chart already shows the slot chip on the cover.
- Mapping validation:
  - **K → QB is the only QB cover.** A kicker at QB plays on his own attributes. In the repro (seed 11) he went 4 of 15 for 56 yards with one interception, plus a 17-yard run, and still kicked. That is weak but legal.
  - **Nobody covers K**, so an empty K is still a forfeit.
  - Flag, not a problem: a K at QB who is then hurt leaves both slots to the next cover (none for K).
  - The other mappings use the same formation slots and attributes the engine already reads. No technical problem found.
- Repro (`repro-ingame-forfeit`, seeds 11–13, every home QB hurt in Q3): no forfeit. The games finished 17-3, 0-7 and 7-24.
- Test: `tests/emergency-positions.test.js` (7 tests).
- R-6 refinement: an emergency cover only completes base personnel. A play that uses a package slot of the short position (WR3, C, DL3 or SS) still needs that position's own beasts, so an emergency never opens a package call.
- Lineup warnings gain `kind: 'emergency'` ("X (S) covers CB2 in an emergency") with an "emergency cover" chip on the Roster screen. Legal Lineup stays green, because a cover is legal.
- Texts that said "only a CB may play there / nobody plays out of position" now say "may be listed there … no emergency cover is healthy".
- Tests updated to the approved design (each change is documented in the test itself):
  - `task7-lineup-gate`: the open-CB fixture also hurts the spare safeties, and the ineligible signing is now a WR;
  - `task7-remediation` R5: one CB left gives an emergency warning (S cover); one CB and one S gives the forfeit warning;
  - `coaching-gm-careers`: the old "no fallback" assertion becomes the emergency cover.

### Position leverage after R-1 and R-6 (150 games, bump 8; standard error about 0.9 per group, so ±0.11 per overall point)

| Position | Audit (relative) | Now (relative) |
|---|---|---|
| QB | 2.12 | 2.53 |
| RB | 2.32 | 3.03 |
| WR | 1.19 | 0.83 |
| TE | 2.35 | 2.84 |
| OL | 0.71 | 0.44 |
| DL | 0.32 | 0.31 |
| LB | 0.93 | 0.77 |
| CB | 1.26 | 0.80 |
| S | 0.45 | **1.09** |
| K | 0.26 | 0.53 |

- Safety value more than doubled, from zone Coverage.
- DL is unchanged at about 0.3. The bump raises every DL attribute, and DL value is structurally low with 2–3 rushers in a 7-a-side game. The R-1 rush term works per play, but it is a small share of team margin.
- Carried to R-16 (trade values) and R-5 (awards).

## Phase 3 (started)
### R-10: abilities
- **Foresight (PSY-03-F).**
  - Root cause: the mark depth was 3 yards, but the book sets LBs at 3.5–4.5. Only 12 of 258 LB alignments qualified.
  - Fix: depth 5, the box (257 of 258).
  - `foresight-probe`, 20 games, home QB as cerebrix: before, 0 marks and 0 executions; after, 302 marks and 46 executions (2.3 a game against 147 blitz calls), each a 50% roll for Confused.
- **Air Brake (WIN-03-F) and Crosswind Rescue (WIN-04-F).**
  - Root cause: both charged on the subject's own pass breakups. In 20–30 real games a CB1 had 0.1–0.2 breakups a game and a free safety 0.1–0.2, so 3 (or 2) never came within one game (0 of 50 games).
  - Fix: charge on **passes defended**: a personal breakup, or an incompletion on a throw at the receiver he covers (the engine's `coverBy`, man or zone), never an interception (`passDefended` in `abilities/common.js`).
  - Covered incompletions: about 1.0–1.2 a game for a CB1 and 0.3–0.55 for a free safety.
  - The Dex contract (`abilities.json`, family pages), the review texts and the plain text were updated; the Dex module was rebuilt (`--check` OK).
  - Measured after the fix (60 games, subject at CB1 / FS):
    - CB1: 3 or more passes defended in 5 of 60 games; Air Brake executed 5 times (about 8% of games).
    - FS: 2 or more in 9 of 60 games; Crosswind Rescue created lanes 3 times in 30 games (about 10%).
    - Both stay rare signature plays. The Dex already calls Crosswind "a genuinely rare trigger".
  - Tests updated to the decision: `task8-abilities-wind-dark` (Air Brake charge), `task8-abilities-psychic-dragon` and `task8-n9d-prechoice` (Foresight depth). Each keeps its original intent: interceptions and two-point tries never charge; the mark comes from the visible look, not the hidden call.
- **R-6 follow-up found by `task7-remediation` R1c.**
  - With covers, AI clubs no longer saw an emptied position as an urgent need, so they would have played an OL at TE indefinitely.
  - `staffingHoles` (true holes plus covered slots) now drives `clubNeeds` and `leagueInjuryCover`. AI clubs sign for a covered slot as before.
  - The integrity check still uses `lineupProblems` (legality).
- `task7-remediation`: 10 of 10 pass after the `staffingHoles` fix. Ability tests: 43 of 43.

### R-8: AI defensive pools
- `ZONE_D` and `MAN_D` are built from the released book by tag, excluding desperation, goal line, prevent, red zone and two-minute calls. That gives 80 zone and 58 man calls, against 8 and 9 before.
- `RUN_D` adds the 19 released run fronts to the original 6.
- Identity leans are unchanged in method (blitz / zone / man primary, the other family secondary, run-front clubs two run calls).
- Offence checked: AI clubs already used 174 of 184 offensive calls (500-game study), so no change was needed.

### R-14: fourth down
- `weighOffense`: on 4th and 5+, passes ×1.8, draws ×0.35, other runs ×0.1. The audit measured runs converting 4.3% against 27.8% for passes there.
- `fourthDownDecision` uses `read` = the coach's IQ scaled 0–1 (Rookie 0, Pro 0.44, All-Star 1, gym coaches +0.2):
  - two scores down (−9 or worse) in the 4th quarter with under 10 minutes left, at the 40 or beyond and 4th and 5 or less: go (when read > 0);
  - the short-yardage thresholds loosen with read: 4th and ≤3 beyond midfield goes at aggression > 0.35 − 0.1·read; 4th and ≤5 at the opponent's 40 or closer goes at aggression > 0.5 − 0.15·read (it was the 38).
  - Kicker effectiveness enters through the existing field-goal range. Opposing personnel is not available to the decision; this is documented, not added.
- Decision grid (ball on the 30–65, 4th and 1–10, four game states), go rate:

  | IQ | Aggression 0.35 | 0.5 | 0.7 |
  |---|---|---|---|
  | 0.6 (Rookie, the old rules) | 8.2% | 16.3% | 22.4% |
  | 1.0 (Pro) | 25.0% | 28.1% | 31.6% |
  | 1.5 (All-Star) | 25.0% | 28.1% | 31.6% |

  Coaching personalities stay distinguishable within each difficulty.
- Game study, 500 games (seed 1), R-1 + R-6 + R-8 + R-10 + R-14 (`phase3/game-study-500-r8r10r14.json`), against the audit:

  | Measure | Audit | Now |
  |---|---|---|
  | Points per team-game | 12.87 | 12.94 |
  | Completion % | 52.8 | 51.9 |
  | Yards per carry | 5.31 | 5.09 |
  | Sacks, % of dropbacks | 2.7 | 3.2 |
  | Interceptions, % of attempts | 1.1 | 1.1 |
  | Fourth-down conversion % | 38.3 | 34.7 |
  | Upsets, % of decided games | 24.2 | 21.1 |
  | Forfeits | 1 | 0 |
  | Distinct defensive calls | 24 | 159 |

  - 4th and 7+: runs fell from 47 of 310 plays (15%) to 6 of 395 (1.5%), and pass conversions rose from 73 to 90.
  - 4th-down snaps rose from 712 to 783, because more teams go for it.

### R-2: speed, re-evaluated after R-1 (`phase3/roster-strategy-150.json`, 150 games; this run already included R-8, R-10 and R-14)
- Speed at constant payroll: **+3.29 points a game** (standard error 1.10; 58.0% wins). The audit had +3.54. The exploit remains.
- Other strategies, against the audit: elite QB +2.33 (+1.64), passing +2.35 (+1.47), defence −1.16 (−1.92), strength −1.31 (−2.29), superstars +2.39 (+0.97), depth −3.75 (−3.57).
- Per the brief (weighting before any change to the engine's curve), speed's price is set in Phase 5 with the overall weights.

### R-7: plays (`tools/balance-audit/play-probe.mjs`; generated clubs, 12 defences, 960 snaps a play)
- Retuned by geometry only (carrier path depth, one block); identities are kept:

  | Play | Before | After |
  |---|---|---|
  | option_pitch | 13.2 | 9.4 |
  | inverted_veer | 9.8 | 8.5 |
  | wide_zone_rt | 8.6 | 6.1 |
  | student_body | 7.6 | 6.8 |
  | dart | 2.3 | 2.9 |
  | rocket_toss | 0.9 | 2.1 |

  - Option pitch: the pistol QB kept 85% of the time and gained 13.3. He now opens with a drop step and the centre cuts off the backside.
- **Not retuned (engine limits, reported):**
  - **Draws** (spread_draw 1.6, lead_draw 2.2; empty_qb_draw 3.4) are weakest against blitzes (−0.4). The engine has no "show pass" phase: defenders key the carrier at the handoff (about 0.6 s), so a draw cannot beat an aggressive rush. Paths and blocks were tried (OL at the line, a quicker back): ±0.3 at most. A draw-timing mechanic would be a new engine behaviour and is not done.
  - **jet_sweep** (1.9): the fly-sweep path and blocks were tried (no change), because it runs into the trips strength.
  - **counter** (8.0 in the probe, 8.1 in games): high for an inside run; the variants tried moved it by at most 0.4. Left for owner review.
- Each changed play's review fingerprint moves on, so the Playbook Audit dev tool sends it back to the owner for review, as designed.
- R-7 at game level (`phase3/game-study-500-r7.json`), yards a carry on downs 1–3:

  | Play | Before (Phase 3 study) | After |
  |---|---|---|
  | wide_zone_rt | 12.4 | 8.2 |
  | student_body | 10.3 | 7.0 |
  | option_pitch | 9.4 | 8.4 |
  | dart | 2.5 | 4.9 |
  | rocket_toss | 1.2 | 1.9 |

  - League: 12.90 points per team-game, completion 52.2%, 5.00 yards a carry, explosive runs 8.2% (audit 8.2%).
  - **fly_sweep (10.1 in games, 4.1 in the probe)** and **pistol_stretch (9.1)** now lead the run game in games. The gap between games and the probe means the AI's situational defence choice against them, not the play's geometry. Flagged for owner review, not changed.

### R-10: Beast Clash abilities (`tools/balance-audit/clash-focus.mjs`)
- The tool is study D (random 3 v 3 teams, last form, full mastery, on and off on the same seeds) with the focus family in every battle: 2,000 battles a family (standard error 1.6), or 4,000 (standard error 1.1).
- Baseline, all 72 families (`r10/clash-focus-before.json`): mean ability effect +0.07, spread (SD) 4.8.
- Changes (each family alone, `r10/clash-focus-after-fixed.json`, 4,000 battles):

  | Ability | Before: effect / battles with no execution | After | Root cause and change |
  |---|---|---|---|
  | **Unbroken Charge** (boulderox) | −1.9 / 100% | −0.8 / 81% | Armed only by losing an action to Stunned, but in 1,500 random battles no harmful status ever reached it; all came from six families. It now also arms on a single hit of 30%+ of max HP that it survives. Once per Clash, same charge. |
  | **Foresight** (cerebrix, Clash) | −9.8 / 0% | −3.0 / 84% | It always spent its action on a mirror that almost never had a status to turn back. It now prepares only against an active foe whose ability applies a harmful status (`STATUS_SOURCES`: Downdraft, Eclipse Call, Dragon Roar, Faultline, Mind Game, Cold Welcome); otherwise it attacks and keeps the use. |
  | **Snowdrift Shelter** (icehorn) | −6.2 / 9% | +0.3 / 8% | It traded an attack for one halved enemy hit. The shelter now lasts three own turns (was one). Strength (50%), threshold and cooldown are unchanged. |
  | Cinder Clamp (ashkit) | −0.5 | −1.6 (4,000) | **No change.** Neutral in teams within about 1.5 standard errors; the audit's −12.5 was the 1 v 1 isolation study. |
  | Mountain Shelter (titanolith, legendary) | −1.7 | −1.6 | **No change**, neutral in teams. |

- Dex contracts (`abilities.json`, family pages), log texts and review scenarios were updated. The Snowdrift review scenario now uses three turns and a foe that lets it run out; the Foresight scenarios use a status-source foe that spars. The Dex module was rebuilt. Clash ability tests: 257 of 259, then 0 failures after the scenario update (per-tier check: all 12 Snowdrift scenarios pass).
- **Weak legendaries (not changed: an owner decision).** Each replaces Tempestra's, Glacivern's, Nyxshade's or Elderoot's attack with a once-per-Clash effect worth less than that attack:

  | Ability | Effect | No execution |
  |---|---|---|
  | Eye of the Storm (tempestra) | −11.4 | 61.6% |
  | Deep Winter (glacivern) | −9.6 | 97.2% (needs an enemy already under a harmful status) |
  | Eclipse Theft (nyxshade) | −9.0 | 80.7% (needs a foe holding a benefit) |
  | Root Communion (elderoot) | −8.9 | 26.4% (redistributes HP and gains none, at the cost of the attack) |

  Fixing them means changing what four legendary signatures are (for example, cast in addition to the attack, or a stronger effect), so this is raised with the owner rather than done.
- **Other idle abilities (90%+ of battles with no execution, unchanged):** stoneguard, ironjaw, voltfang, terrabull, rockram, voltfin, mossclaw, reefclaw, snowmoth, flicker, lumen. All are conditional triggers that the 3 v 3 format rarely creates (a status to redirect, a shield to break, a knockout to avenge); in teams their effect is within ±4. Deferred: each needs its own trigger redesign.

### R-11 and R-13 (interim, new leagues; developed leagues come from the Phase 4 franchise runs)
- New-league game study after R-1, R-3, R-6, R-7, R-8 and R-14: completion 52.2%, sacks 3.2% of dropbacks, interceptions 1.1%. The provisional targets are 58–62% and 4–6%.
- The R-3 calibration shows abilities taking 4.7 points of completion (59.7% off against 55.0% on).
- Sacks rose from 2.7% to 3.2%, from the R-1 rush and the R-8 blitz variety. No probability was changed to meet the targets (the brief: no arbitrary forcing). The decision waits for the developed-league numbers.
- R-13: field goals 77.0% (audit 75.4%) and extra points 84.1% (83.6%). Kicking is unchanged; monitored only.

## Phase 4
### R-4: AI development by difficulty (`DIFFICULTY.aiDev`)
- The existing system was investigated first. AI XP comes from `afterGame` and `practiceAfterGame`, both called with `xpScale = 1`. The old decision-C slowdown was retired in N7f.
- Founding quality (−4 / −1 / +3) and IQ (0.6 / 1 / 1.5) were the only differences, and development levelled every league by season 5 (audit F-1).
- `aiAfterGame` now passes the difficulty's `aiDev`. It is the same for every AI club: no standing-based rubber-banding, no cap room, no in-game bonus.
- First values (PROVISIONAL): Rookie 0.85, Pro 1, All-Star 1.15. Being calibrated on the standard benchmark (`tools/balance-compare.mjs --mode=persistent`: hands-off owner, board reset; seeds 1–4 × 8 seasons).

## Phase 6 (started early, while the Phase 4 runs use the CPUs)
### R-5: awards
- **Renamed:** Most Valuable Beast (MVB), Offensive Beast of the Year (OBOY), Defensive Beast of the Year (DBOY).
  - The Signature award became Signature Beast of the Year (SBOY), so the names stay consistent.
  - The save keys (`mvp`, `opoy`, `dpoy`, `smoy`) are unchanged, so every saved season keeps its awards.
- **DBOY** now caps each component at +3 SD within the position, as the MVB does. The evaluation over many seasons is pending, from the Phase 4/5 franchise runs.
- **New awards** (`AWARDS`), each on the existing models and none repeating another's question:
  - **Special Teams Beast of the Year (STBOY):** the best kicker (points per game 45%, accuracy 40%, longest kick 15%) or kick returner (yards per return 50%, return touchdowns 25%, return yards per game 25%), each against his own group.
  - **Most Improved Beast (MIB):** the most overall gained during the season (from the career book's season-start rating) by a non-rookie regular, at least +2, with production as the tie-break.
  - **Comeback Beast of the Year (CBOY):** a veteran who played under half of last season after a full one before it, and is back above his position's average.
  - **Iron Beast (IRON):** every game and the most snaps (offence, defence and special teams).
- **All-League First and Second Team** by position: QB 1, RB 1, WR 2, TE 1, OL 3, DL 2, LB 2, CB 2, S 2, K 1. Scored on the capped position scores (kickers on the STBOY kicking score); each monster appears once, at his own position.
- **Left out on purpose:**
  - **Breakout:** redundant with MIB and the rookie awards.
  - **GM of the Year:** not supported, because AI clubs have no GM (no turnover exists), so it could only describe the owner.
- **Integration:**
  - `finalizeAwards` stores `allLeague`; the season archive (`seasonAwards`) keeps it.
  - Career Timeline events (`award:allLeague1`, `award:allLeague2` and the new keys) and trophy shelves on profiles.
  - League News: the new awards are "notable"; one "major" item names the First Team.
  - Hall of Fame voting weights: STBOY 8, CBOY 6, MIB 4, IRON 4, against 22–30 for the majors.
  - The owner's Hall of Fame checklist counts only the original seven awards (`MAJOR_AWARDS`), so the new honours do not make it easier.
  - The All-League panel is on the League hub's award tab once the awards are frozen, and on the season review.
  - No new file: the helper lives in `src/ui/career-ui.js`, respecting the release file count (512 published files).
- Two-season check (seed 5, Pro): every award has a winner in both seasons except CBOY (none possible before season 3); the All-League teams are full.
- **First calibration (aiDev Rookie 0.85 / All-Star 1.15; seeds 1–4, 8 seasons, hands-off owner):**

  | Difficulty | Owner win % | Fired | AI overall at seasons 1 / 5 / 8 |
  |---|---|---|---|
  | Rookie | 49.5 (seasons 1–5: 56.1; 6–8: 33.0) | 2 of 4 | 52.0 / 63.1 / 63.8 |
  | All-Star | 42.0 (seasons 1–5: 39.5; 6–8: 46.8) | 1 of 4 | 56.7 / 64.5 / 64.5 |

  - **Finding:** the XP rate barely separates the leagues after season 4 (about 1 overall point at season 5). AI development is bounded by each monster's attribute ceilings (`dev.potential`), so a faster rate only reaches the same ceilings sooner; arrivals' ceilings decide the equilibrium.
  - The hands-off owner's own roster ages out (his club is 50–55 overall all along), so his late seasons collapse on every difficulty.
  - Testing wider rates (0.6 / 1.5) before deciding.
- **Second calibration (aiDev Rookie 0.6 / All-Star 1.5; seeds 1–2, 6 seasons):**
  - Rookie: owner 67.3% (band 54–70), 0 fired; AI overall at seasons 1 / 3 / 6: 51.4 / 57.6 / 62.3.
  - All-Star: owner 32.5% (band 32–40), 1 fired; AI overall: 57.2 / 63.4 / 65.5.
  - Pro (aiDev 1; seeds 1–4, 8 seasons): 47.3% (band 45–53); 2 of 4 fired; seasons 1–5: 52.4%, 6–8: 35.7%. AI overall 53.2 / 60.3 / 64.4 at seasons 1 / 3 / 8.
  - Late decline: the hands-off owner never replaces ageing starters, so his win rate falls after season 5 on every difficulty. That is the benchmark owner's policy, not difficulty.
  - The leagues stay about 3 points apart at season 6, against about 1 at 0.85 / 1.15.
  - Adopted provisionally; the 15-season runs (`ai-franchise-benchmark --owner=repair --board=content`, seeds 3 and 4, the audit's seeds) check seasons 1, 5, 10 and 15 and late-franchise growth.
