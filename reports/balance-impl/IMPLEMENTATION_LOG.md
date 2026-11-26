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
- R-6 addendum: `OUT_OF_POSITION_RISK` (a 1.75× injury risk for a monster away from his position, dormant since the one-position rule) would have hit every emergency cover. It is a familiarity penalty, so it is set to 1 per the brief (only with testing evidence). The value is kept named.

## Phase 5
### R-2: speed, the overall weights
- `attr-leverage.mjs --attr=speed --bump=12 --games=120` (`phase5/attr-leverage-speed.json`). Margin per group per game for +12 Speed on the starters of one group:

  | QB | RB | WR | TE | OL | DL | LB | CB | S |
  |---|---|---|---|---|---|---|---|---|
  | −0.03 | −0.91 | +0.85 | +1.26 | +0.04 | +0.73 | −0.32 | +0.81 | −1.73 |

  - Standard error is about 0.9 everywhere, so no single position is decisive.
  - Overall bought by that Speed: QB 1.2, RB 3.0, WR 3.5, TE 1.3, OL 0, DL 1.3, LB 2.7, CB 3.5, S 2.6.
  - Speed is cheapest where it buys the most: TE and DL, now that DL Speed drives the rush. The roster-strategy gain (+3.3) comes from Speed being almost free there and at OL, where it does nothing.
- **Change:** DL and TE Speed weight 1 → 2. OL is left at 0, since Speed does nothing there; the strategy's OL Speed is wasted, not exploited. The engine's Speed curve is unchanged, as the brief prefers weighting first.
### R-17: Durability in the overall
- Durability weights: 1 at RB, OL, DL and LB; 0.5 at QB, WR, TE, CB and S; 0.25 at K.
- Overalls change for every monster (computed live; nothing is stored, so saves are unaffected). AI training now also spends on Durability in proportion.
- **Beast Clash kept apart (R-17 and R-2 validation).**
  - Clash HP, attack and speed come from the overall, so the new weights broke 16 of 840 Clash tests, including the byte-for-byte replays of recorded battles and replay keys.
  - Clash now reads `CLASH_POSITION_WEIGHTS` (the weights it was balanced on): `overall(e, pos, weights)` in `t8/combatant.js`, `clash/stats.js` and the Clash auto-lineup.
  - Every recorded battle and replay key plays as before.
  - Durability still counts in Clash through its own HP tilt.
- **R-2 trial 1** (DL and TE Speed weight 2): the speed strategy fell only to +2.81 (standard error 0.90); strength −2.23. Trial 2 adds WR and CB Speed weight 4.
- **R-2 trial 2** (plus WR and CB Speed weight 4): speed +3.17 (standard error 1.0), strength −2.29.
  - No better than trial 1: pricing Speed in the overall does not remove the edge, because Speed simply buys more than its weight even at 4.
  - WR and CB go back to 3. DL and TE stay at 2, which the R-1 rush justifies.
- **R-2 trial 3: the engine curve**, which the brief allows once weighting has been tried.
  - Top speed slope 4.1 → 3.5 yd/s across the Speed range (`SPEED_SLOPE`, `speedCurve`), pivoting on Speed 50 (7.47 yd/s, unchanged).
  - Speed 30 goes from 6.65 to 6.76 yd/s; Speed 95 from 9.33 to 9.06.
  - Under test: the roster strategy, then a game study and the Speed sweep, to check that Speed stays viable.
- **Generation kept stable.** Monster generation selected and developed candidates on the overall (`t8/selection.js` METRICS and the prior-career allocation in `t8/career.js`), so the new weights changed which monsters every seed generates. That made 4 Clash tests fail, on seeded fixtures, and would have invalidated the generation calibrations (CALIBRATION, HISTORY_REFERENCE).
  - Generation now uses `BASE_POSITION_WEIGHTS` (the pre-audit weights; `CLASH_POSITION_WEIGHTS` is the same table).
  - Live play (the displayed overall, salary, AI training) uses the new weights.
  - 3 of the 4 failures cleared. The fourth was R-10 Foresight: Eclipse Call acts from reserve, so the gate now looks at every living enemy (active or reserve). Effect −3.1 (4,000 battles).
- **R-2 trial 3 result (speed slope 3.5):** the speed strategy fell from +3.17 to **+0.06** (standard error 0.90; 45.3% wins); strength −0.39 (was −2.29). Speed is no longer an exploit at constant payroll. Game-level and sweep checks next.
- **15-season runs, seed 3** (the audit's seed; `ai-franchise-benchmark --owner=repair --board=content`). Rates 0.6 / 1.5. These runs predate the Phase 5 weights and speed slope; final runs follow.

  | AI overall, season | 1 | 5 | 10 | 15 |
  |---|---|---|---|---|
  | Rookie now | 52.0 | 61.7 | 63.4 | 62.5 |
  | Rookie, audit | 52.9 | 63.8 | 64.1 | 63.5 |
  | All-Star now | 58.5 | 65.6 | 65.5 | 65.2 |
  | All-Star, audit | 57.2 | 64.1 | 63.2 | 63.8 |

  - The leagues now stay **3 points apart through season 15**, where the audit had them within 0.5 by season 5.
  - All-Star does not run away late: 65.2 at season 15, against 63.8 in the audit.
  - The repair owner (he fills holes only) won 27.6% on Rookie and 16.7% on All-Star on this seed. The audit's same owner won 38.6% and 57.1%, and the audit noted the spread between seeds is three times the spread between difficulties.
  - Integrity: 0 problems, 0 errors, 0 negative cap rooms; rosters 31–38.
- **R-12 (from the same runs): scoring still grows** from season 1 to season 15: Rookie 13.2 → 19.3 points per team-game (+46%), All-Star 14.7 → 19.8 (+35%). The target is about 10–15%. Investigation next.
- **R-12 investigation (seed 3, 15 seasons):**
  - Starter overall by position, season 1 → 15 (Rookie): QB +2, RB +17, WR +13, TE +9, OL +12; DL +9, LB +12, CB +11, S +8. All-Star is similar. Offence and defence develop at about the same rate; ratings do not favour offence.
  - Scoring follows league maturation: generated clubs start near 52 overall and settle near 63–65 by season 5. Points per team-game go 13.2 → 18.3 by season 5, then hold at 17–19 through season 15.
  - The passing game responds most to talent: yards per attempt 8.6 → 10.5–11.6 and completion 54 → 64% (developed-league target 63–67% met), while sacks fall to 1.8–3.6% (target 5–7%).
  - Next: the engine's scoring at two fixed talent levels (game study, quality 52 against 64), to separate the engine's response from development.
- **Phase 5 game study** (500 games, seed 1; R-2 slope, DL/TE Speed weight 2, Durability weights; `phase5/game-study-500-phase5.json`), against the Phase 3 R-7 study:

  | Measure | Before | After |
  |---|---|---|
  | Points per team-game | 12.90 | 12.51 |
  | Completion % | 52.2 | 52.2 |
  | Yards per attempt | 7.72 | 7.57 |
  | Yards per carry | 5.00 | 4.86 |
  | Explosive passes, % | 11.4 | 10.8 |
  | Explosive runs, % | 8.2 | 8.3 |
  | Sacks, % of dropbacks | 3.2 | 3.2 |
  | Interceptions, % of attempts | 1.1 | 1.2 |
  | Upsets, % of decided games | 22.7 | 26.7 |
  | Blowouts, 21+ % | 17.6 | 15.4 |

  - The league plays the same game, a little closer. The Speed sweep checks that Speed stays worth having.
### R-9: salary curve (PROVISIONAL)
- `salaryForOvr(ovr)` = 18,000 + 280·OVR + 90·max(0, OVR − 70)², from `ELITE_SALARY`. Below 70 nothing changes:
  - 50: 32,000; 70: 37,600 (unchanged);
  - 80: 49,400 (was 40,400, +22%);
  - 90: 79,200 (was 43,200, ×1.83);
  - 99: 121,410 (was 45,720, ×2.65).
- The hard-coded copies were replaced: the Apex renewal ask's OVR-99 salary, and the draft board's rookie salary on HQ.
- The tier caps are unchanged, per the brief.
- Existing contracts keep their stored salary; new and renewed deals use the curve.
- **AI signing bonuses:** the mechanism exists (`fa-ai.js` `bonusTerms`, for money-minded monsters on multi-year deals when the cap is tight; used in bidding wars and urgent signings). The audit saw none because the cap never bound. With the curve the cap binds at the top, and the 15-season validation counts the bonuses. If there are still none, the AI's use is widened.
### R-16: trade values
- Position leverage rerun on the final engine (300 games, bump 8) to re-derive `POSITION_LEVERAGE` with the documented recipe (shrink, half strength, clamp 0.6–1.6, rescale).
- **300-game rerun** (`phase5/position-leverage-300.json`, bump 8, the final engine). Through the documented recipe it gives QB 1.34 · RB 1.54 · WR 1.14 · TE 1.21 · OL 0.65 · DL 1.05 · LB 0.91 · CB 1.09 · S 0.67 · K 1.07 (now: 1.37 · 1.6 · 1.01 · 1.45 · 0.63 · 0.86 · 1.02 · 1.21 · 0.9 · 0.79).
  - DL rises (the R-1 pass rush now uses DL Speed), as expected.
  - TE, S and K move by more than their noise allows a decision on: relative standard errors 0.86, 0.44 and 0.79 (the 2023 study's were 0.09–0.28 on 2,000 games). Not adopted yet; 700 more games (start 301) are running, to merge into 1,000.
- **1,000 games** (`phase5/position-leverage-1000.json`: the 300 plus 700 from start 301, merged). Raw relative leverage QB 2.30 · RB 2.69 · WR 1.02 · TE 1.74 · OL 0.39 · DL 0.70 · LB 0.94 · CB 1.02 · S 0.56 · K 0.89; standard errors 0.15–0.47.
  - **K:** kicking is untouched by the audit, so the 2,000-game study and the 1,000 new games are pooled by precision: 0.52 ± 0.17 (alone 0.89 ± 0.39, one standard deviation from the old 0.51).
  - **Adopted** (`POSITION_LEVERAGE`, same recipe):

    | | QB | RB | WR | TE | OL | DL | LB | CB | S | K |
    |---|---|---|---|---|---|---|---|---|---|---|
    | Before | 1.37 | 1.6 | 1.01 | 1.45 | 0.63 | 0.86 | 1.02 | 1.21 | 0.9 | 0.79 |
    | After | 1.48 | 1.58 | 1.08 | 1.32 | 0.69 | 0.9 | 1.03 | 1.07 | 0.82 | 0.78 |

  - Moves are small (at most 0.14), so a trade is repriced by a few percent at most. The trading tests pass (38).
  - **Test change** (trading-second-pass, incoming offers): the fixture gap goes from 8 to 10. Bisected to the R-2/R-17 weights commit (27b46c9): the fixture rosters re-rate, the same mechanism as the earlier 6 → 8 drift.
    - It is not a behaviour change: the owner's incoming calls in the 15-season seed-3 runs were 13 / 16 / 7 (Rookie / Pro / All-Star), against 19 / 9 / 6 in the audit.
- **Fast-tier fixes after the UI phase:**
  - The info-control test asserts the ⓘ's new place.
  - Illegal-roster preset: with R-6, K covers QB, so the case now removes QB and K.
  - Headline ratings skip Durability, so a kicker's stay Kicking and Awareness.
- **R-17, kicker weight → 0 (modification).**
  - The stat-guide test documents that kickers are never injured and fatigue does not touch kicking, so Durability does nothing for a kicker in football.
  - The provisional 0.25 (the brief's "low") is now 0, and the guide keeps saying Durability does nothing for K.
  - Beast Clash HP is unaffected (Clash uses its own frozen weights).
- **Two more tests follow approved changes:**
  - Offseason checklist (R-6): the lineup blocker now needs QB and K out.
  - Goal Line Man (run-read): the sample per comparison goes from 40 to 120 plays. After R-1/R-2 the quick-game gap is about 0.5 yd and one fixed 40-play sample flipped it. At 120 all three claims hold (screens 4.5 against 11.6, quick 5.7 against 6.2, play-action 7.8 against 5.8). The test is stricter, not looser.
- **Speed sweep after the slope** (`phase5/attr-sweep-n200.json`, Speed 30 / 65 / 95). Speed stays viable everywhere:
  - WR peak speed 7.0 / 8.0 / 9.2 yd/s (was 6.8 / 8.2 / 9.4); deep-ball yards 9.1 / 11.0 / 23.9;
  - CB completion allowed 40.5 / 29.5 / 26.5%;
  - DL sacks 27.5 / 33 / 36%; safety pursuit yards allowed 10.4 / 6.5 / 4.2.
  - RB yards 4.1 / 6.5 / 19.7: the Lab's elite back now breaks away 33% of the time against its all-65 defenders, against 12.5% before. That is a threshold effect of the one Lab trial (n = 200); in full games explosive runs held at 8.3%.
- **R-12 engine response** (`phase4/game-study-300-q52.json` against `-q64.json`; both clubs at the same quality, 300 games, seed 7, current engine). From league quality 52 to 64 (+12, about the maturation of a new league):

  | Measure | Change |
  |---|---|
  | Points per team-game | 10.93 → 13.01 (+19%) |
  | Completion | 51.0 → 54.8% |
  | Yards per attempt | 7.16 → 8.05 (+12%) |
  | Yards per carry | 4.24 → 5.01 (+18%) |
  | Sacks, % of dropbacks | 3.7 → 2.7 (−27%) |
  | Interceptions, % of attempts | 1.1 → 1.2 |
  | Explosive passes | +22% |
  | Explosive runs | +28% |

  - Equal talent growth on both sides is worth about +19% scoring on this engine.
  - The franchises' +35–46% is that plus what development concentrates beyond the average: stars, Apex individuals and evolutions (80+ monsters 19 → 72 by season 15; 90+ 4 → 32) and mastered abilities.
- **R-12 conclusion: investigated, no progression change.**
  - The brief's premise (offence developing faster than defence) is not borne out: starters at every position grow by similar amounts.
  - Growth follows league maturation and then holds (seasons 5–15: 17–19 points).
  - Tuning it down would mean either a hidden season-based modifier (ruled out by the brief) or changing how strong a new league is founded (generation calibration), which is an owner decision.
  - The pass rush's relative decline with talent (sacks −27%) is the one engine-side lever, and the developed-league sack target (5–7%) is not met. Both are reported for an owner decision.

## Phase 7 (started)
### R-18: save audit
- `tools/balance-audit/save-audit.mjs` measures, at seasons 1, 5, 10 and 15: raw, packed (gbp2) and stored (gzip) size; save time (pack + gzip) and load time (gunzip + unpack), the median of 5; an exact round trip; and the largest parts of the save.
- Season 1 smoke run (seed 3, Pro): raw 6,678 KB; packed 2,593 KB; stored 504 KB; save 773 ms, load 257 ms (Node, this container); round trip exact.
  - Largest parts: `league.monsters` 3,542 KB, `preLeagueHistory` 845 KB, `history[0]` 425 KB, `freeAgency.talks` 314 KB.
- **15-season run** (seed 3, Pro; `r18-save-audit-seed3.json`; Node in this container, median of 5):

  | Season | Raw | Packed | Stored (gzip) | Save | Load | Round trip |
  |---|---|---|---|---|---|---|
  | 1 | 6,678 KB | 2,593 KB | 504 KB | 744 ms | 324 ms | exact |
  | 5 | 10,233 KB | 4,448 KB | 967 KB | 1,313 ms | 463 ms | exact |
  | 10 | 12,520 KB | 5,727 KB | 1,298 KB | 1,580 ms | 688 ms | exact |
  | 15 | 13,333 KB | 6,173 KB | 1,405 KB | 1,893 ms | 781 ms | exact |

  - Growth slows after season 5: about 65 KB stored a season from season 10 to 15.
  - What the save holds at season 15 (raw):
    - `league.monsters` 5,652 KB, flat since season 5 (about 1,170 monsters). Most of it is each monster's development state (`dev`: about 1.9 KB a monster in per-attribute maps that the training and ageing code reads every week), then season and career stat books.
    - Season history: about 410 KB a season (per-club league and playoff stat lines and awards). Award-winner rows are already compacted against the monsters' season books (history-compact.js).
    - `league.legends` 774 KB: retired monsters' career stubs (Hall of Fame and records history).
    - `freeAgency.talks` 314 KB at season 1, no longer among the largest parts later (closed talks are pruned).
  - Found no duplicate, debug, temporary or play-by-play data: game logs keep box lines only, and the one known duplicate (award rows) was removed in an earlier phase.
  - The storage layer already limits routine cost:
    - IndexedDB with content-addressed parts. History, draft results and the pre-league archive are written only when they change.
    - Encoding runs in a worker. A routine save writes the core part (about half the raw save at season 15).
    - Backups share unchanged parts. Every save round-trips exactly.
  - **R-18 conclusion: investigated, no change necessary.**
    - The data is either live game state or history the brief protects.
    - Stored size at season 15 (1.4 MB a slot) is far inside browser IndexedDB quotas, so there is no technical need for a save redesign.
    - An emulated phone check (throttled CPU) of saving and loading a season-15 save is part of the final validation.
### R-19: gym clubs (investigation, from the seed-3 15-season runs)
- **Representation:** 12 gym clubs of 31 AI clubs (39%).
- **Titles:** Rookie 15 of 15 to gyms; All-Star 11 of 15. The audit had 12, 10 and 8 of 15.
- **Starter strength at season 15:**
  - Rookie: gyms 65.1 against ordinary 60.9 (+4.2).
  - All-Star: gyms 65.1 against ordinary 65.3 (equal), yet gyms took 11 titles.
- **Mechanical advantages found in the code:**
  1. **On Rookie, gyms are founded and resupplied at Pro quality** (`difficultyQuality`: gyms use Pro's −1, ordinary clubs −4). Free-agency and injury-cover arrivals use the same club target every season, so the gap is carried all franchise. With R-4's slower Rookie development, that 3-point arrival edge now matters more (+4.2 at season 15). This is a designed boss rule, but its interaction with R-4 is unintended.
  2. **Gym tier growth** (+1 / +4 / +7, with Aetheria −5) in the club target, used by arrivals every season. Designed.
  3. **Ageless legendaries:** each late gym's signature legendary never declines. With equal average strength on All-Star, titles follow those stars (the audit found the same).
  4. **Coach IQ +0.2** for gym coaches. Designed.
- **Pro, seed 3, 15 seasons** (current code; repair owner): owner 51.4% (seasons 1–5 57.1, 6–10 42.9, 11–15 54.3), 7 playoff seasons, 1 title; 0 problems.
  - Titles: 10 distinct champions, gyms 8 of 15 (audit 10).
  - AI overall at seasons 1 / 5 / 10 / 15: Pro 53.3 / 62.5 / 62.9 / 62.4; Rookie 52.0 / 61.7 / 63.4 / 62.5; All-Star 58.5 / 65.6 / 65.5 / 65.2.
  - **Finding:** Rookie and Pro converge by season 5 (within 1 point), while All-Star stays about 3 points above. The slower Rookie rate only delays reaching the same ceilings, as the first calibration found. The final runs (seeds 3 and 4) decide whether Rookie needs a ceiling-side change; any such change is an owner decision.
- To be retested on the final runs; any correction comes after.
### Fast tier on the final balance code (2026-11-26; 2,263 tests, 8 failures, all resolved)
Each failure was reproduced on its own and bisected over the branch's commits (the audit's final commit d1f2d79 passes all of them).
- **Code fixes (2):**
  - `rosterFloorPlan` (release advice at the roster minimum) counted a slot held by an emergency cover as staffed, so after R-6 it suggested releasing one of two CBs (a safety would cover). It now counts emergency-held slots as holes (`staffingHoles`), as the AI's signing logic already does: the advisor never plans a release into an emergency. Bisected to baff24c (R-6). `task7-floor` passes unchanged.
  - The play-end summary that abilities read rounded the gain once (`Math.round(x)`), while the play's recorded yards round the tenth-rounded gain (`Math.round(Math.round(x*10)/10)`), so a 11.46-yard catch was 11 yards to the hooks and 12 in the box score. Sovereign Arm's "12 net yards" check read 11 for a play recorded as 12. One rounding rule now (engine.js). Pre-existing; R-2's engine change exposed it on seed 9. `task8-abilities-psychic-dragon` passes unchanged.
- **Test fixtures that followed approved changes (5, each documented in the test):**
  - `task8-identities` (training priority): the "non-OVR attribute is never ranked first" probe used Durability, which R-17 put into every non-kicker overall; the probe is now Kicking.
  - `task8-progression` (allocation tiers): RB Durability trains at its R-17 overall weight 1 (was 0.5 as a non-OVR role).
  - `task7-remediation` (R1 c): the constructed spare TE (seed 968) is rated 51 by the R-2/R-17 overall, below the pool rule's 52; seed 966 gives 52, so the scenario is the same.
  - `task8-abilities-fire-water` (Impact Pyre): after R-2, seed 5's natural drive hit 4th down on the creation play, and the turnover on downs cleared the zone (an approved rule). Snaps where he defends now start at 1st and 10 at the 35, as the test's lifetime plays already did.
  - Ball Clamp "jarred loose" review seeds (`review-texts.js`, docs/task8/REVIEWER_V2.md): fixed seeds found by an offline search for the first natural fumble roll; R-2/R-17 (27b46c9) moved the stream at mastery 1 and 2. Re-searched with the same method (seeds 1–3000): 432 and 153 (were 130); 968 and 57 unchanged.
- Rerun after these changes (2026-11-26, alone, 5,473 s): 2,263 tests, 2,263 pass, 0 fail.
