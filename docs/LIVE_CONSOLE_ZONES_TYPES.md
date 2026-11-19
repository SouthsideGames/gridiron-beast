# Live play console, moving zones and meaningful football types

Implementation is on a draft branch. Browser validation, Node regression, balance simulations and native builds are PENDING. No deployment or phone installation was performed. Previous PR test results do not validate this revision.

## Approved behavior

- Player football ability demonstrations omit the Phases checklist. Developer review keeps its checklist/evidence.
- Live football, watched/replayed Beast Clash and football demonstrations use the available viewport for the field/arena and essential controls. Play choices, zone choices and reference details open in sheets/disclosures. Setup/result pages scroll normally. Expanded details and secondary controls may scroll within their own panel.
- Match Help/Guide is reachable in every phase from the top bar. An interruption's Resume stays visible. Selecting a play does not snap it.
- Sheet copies carry no game-action datasets; they forward to the original control once. Existing tutorial, pause/resume and clock safeguards remain authoritative.

## Persistent terrain

All persistent zones preserve their placement relative to the line and ball spot BETWEEN scrimmage plays, on both teams and in both field directions. They never follow the live carrier. Canonical saved offsets prevent gradual drift when boundary fitting is needed. Size, lane, duration, ownership, strength and removed footprints are retained. At a boundary, terrain shifts inward to stay on the field and returns to its canonical offset when there is room.

Whistle-created terrain anchors at the new spot so it is not advanced twice. The pre-snap picture and authoritative next snap use the same projection.

A possession change clears both teams' terrain already on the field before the next scrimmage snap. Banked creations (an ability's zone waiting for its own snap) are kept and placed fresh at the new line (owner decision during validation, 2026-11-18). Touchdowns, made field goals, safeties and each overtime possession also end the possession for terrain, so a club that keeps the ball after a score (an onside recovery) or across overtime starts clean. Returns and replay evidence retain the original play's zones. Interceptions/fumbles/defensive scores are covered, as are possession changes following downs, kicks or scoring. No spent charge, cooldown or readiness is refunded. Fresh abilities can create fresh terrain after the new possession begins.

Legacy zones without saved offsets adopt their current position once; their unsaved original placement cannot be reconstructed. No save migration or random draw is needed.

## Stronger football types

Candidate values: strong +12%, weak -12%, Dragon neutral +2%, environment +2%, combined positive cap14%. The previous football edge was +/-4%. This scales EACH participant's own contest score; it is not a 12% game-win probability or a permanent stat bonus. Opposite modifiers on both sides create a larger relative gap than 12%.

The engine, existing type-aware AI play selection and displayed matchup descriptions read the same shared values. Effects apply to the ACTUAL opposing monsters in blocks/sheds, tackles, sack attempts, route coverage and contested catches. No whole-team aura or guaranteed win is introduced. Beast Clash's chart and damage remain unchanged.

Pregame names expected good/tough matchups. The pre-snap console names matchups with details. A play result can note a recorded type edge; a neutral stadium-only bonus is not labeled a type edge. Forecasts may change with the actual play/coverage and do not reveal hidden enemy assignments. New copy is grouped under playview in src/text/en.js.

The 12% candidate is NOT balance-certified. Measure it before merging.

## Checks completed

The coding executor and browser were unavailable. Nine isolated geometry checks passed using the actual field helper source in the hosted JavaScript runtime, with an injected JSON clone helper. They cover direction, gains/losses, lanes, removed footprints, boundary size/offset recovery, idempotence, reload, turnover clearing, whistle anchors and legacy adoption. This is not a Node/engine suite result.

Changed JavaScript/test/tool sources compiled in a syntax smoke check with module declarations removed. That does not execute modules or resolve imports. The release import map retains 477 existing game modules and all mapped URLs use43.27.0; actual release-stamp/graph checks remain pending.

tests/live-console-fields.test.js adds the nine geometry cases plus two rules/presentation integration cases. Type tests now assert the approved candidate and combined cap, retaining unchanged-Clash checks. These repository tests have NOT run.

## Claude validation handoff

Keep this PR draft and unmerged. Record the exact tested commit and add regression coverage for defects.

1. Run tests/live-console-fields.test.js, tests/football-zone-revisions.test.js, tests/task8-field-effects.test.js, tests/type-matchups.test.js, existing environment/AI/engine/save checks, centralized-text tests and tests/release-stamp.test.js. Complete required broader regression: this batch changes simulation and balance, unlike the earlier UI-only batch.
2. Test all zone abilities, multi-zone/hybrid overlap, Prism removal, normal gains/losses, hashes, both directions, end-zone/sideline fitting, interceptions/fumbles/defensive scores, downs, kicks, halftime, overtime, two-point plays, old saves, reloads, AI fast simulation and reviewer scenarios. Confirm exact durations, cooldowns, charge use, old return/replay pictures and fresh next-possession zones.
3. At320/390/440px, short landscape, Larger Text and device safe areas, tap through football offense/defense/fourth down/kickoffs/tries/Auto/replays and Clash Watch/replays/rotation. The field/arena and essential controls must stay visible together. Check inspections, play selection, multi-zone choices, substitutions, Help/Guide, Skip and interruption Resume. Closing/canceling sheets must not advance a play or duplicate a tutorial action.
4. Check player demos omit Phases; developer diagnostics still update/save reviews. Check long text, each playback speed, effect quality and reduced motion/flash. Improve visuals using existing art/icons within the approved compact layout.
5. Run node tools/type-balance.mjs --games=200 --plays=600 --seed=1. It now compares types-off/no-lean, types-off/lean, previous4% and candidate values with identical league teams/seeds. Also run its environment/Dragon studies. Record equal-rating favorable/neutral/unfavorable outcomes and rating-gap outcomes; exercise gym counter lineups, all-Fire vs Water and mixed rosters. Counters should matter without guaranteeing that a much weaker monster wins. If measurements warrant tuning, update shared values, tests and report together.
6. Compare recorder on/off with identical seeds; verify old-save/RNG behavior and interruption resumes. Native Swift/Gradle builds and real iPhone/Android checks remain pending until devices/tooling are available.
7. Do not change Beast Clash damage/chart, roster rules, zone lifetimes or unrelated abilities to hide failures. Do not merge, deploy or rebuild the phone app during validation.


## Tutorial follow-up (owner request)

Guidance now ends at the first football game start, before any football situation lesson. A compact one-time Commissioner note replaces the in-game tutorial. Actual game navigation controls, including the Roster tab, get a gold outline and a gentle pulse; Reduced Motion keeps only the outline. Existing midgame/old postgame tutorial saves retire safely. Legacy Coach Assist automatic tips do not restart after this handoff, while manual Help remains.

The executor became available for this follow-up. Targeted checks now pass: guided-week19, central-text8, release-stamp2, Coach Assist11, live-console-fields11 and type-matchups10 (61 checks across targeted runs). The type test corrections preserve the new intended counter effect and use numeric tolerance for the floating-point cap sum. These results replace the earlier “repository tests have not run” statement only for the listed files. Full regression, browser visuals, native builds and seeded balance simulations are still pending. The updated guided-week browser harness could not launch system Chromium (socket() Operation not permitted).

## Claude validation — 2026-11-18

**Code tested: `468203e`.** That is the PR head `742d936` plus four validation commits:
- `48f0b2d`: the game-code fixes.
- `b648ccc`: one test aligned with the candidate values.
- `b6f43d8`: three browser checks taught where the controls moved.
- `468203e`: two Ability Reviewer demonstrations fixed after the full suite (fixes 11 and 12).

The full suite ran once, on `b6f43d8`. `git diff b6f43d8 468203e -- src styles index.html` touches only the reviewer's scenario files (`src/sim/abilities/review-texts.js` and `review-scenarios.js`), which no game, save or AI path reads. Their affected tests and the reviewer browser checks were rerun on `468203e`, as `docs/TESTING_POLICY.md` directs for a fixed failure (rerun the affected files, not the whole suite). Main is `69964f1` (#135). Nothing was merged, deployed, published to the game link or installed on a phone.

**All browser results are emulated.** They come from headless Chromium with touch, at:
- 320×568, 390×844 and 440×956;
- short landscape at 568×320 and 844×390;
- Larger Text, and safe-area insets (47/34 px in portrait, 21 px bottom in landscape).

No iPhone or Android device was used.

### Owner decision during validation

The PR cleared zones that were *waiting to be placed* (banked creations) on every change of possession. That broke five approved abilities: Frostmark, Gear Grid, Tsunami Line, Splashdown and Permafrost. Their targeted tests fail on `742d936` and pass on main. Permafrost was worse: its beast stayed marked "waiting", so the ability never fired again that game.

**The owner approved this rule:**
- A change of possession clears every zone already on the field, for both clubs.
- Banked creations survive and are placed fresh at the new line.

### Defects found and fixed

Each fix has regression coverage that fails on `742d936`.

| # | Defect | Fix | Coverage |
|---|---|---|---|
| 1 | Banked zones were thrown away on a change of possession (above), and Permafrost's beast was locked out of its ability. | Only zones on the field clear; banked creations wait for their own snap. | The five ability tests in `task8-abilities-*` pass again. `live-console-fields` asserts the banked creation survives. |
| 2 | **Old zones carried into a new possession when the same club kept the ball.** This happened when the scoring club recovered its own onside kick, and in overtime for the club that ended regulation with the ball. | Touchdowns, made field goals, safeties and every overtime possession now end the possession for terrain. | Three new tests in `live-console-fields.test.js`. |
| 3 | `football-zone-revisions` and two ability tests still assumed zones stay fixed to the field. They also read a zone object that the projection replaces. | Rewritten to the approved behaviour: the zone moves with the line, keeps its size and lane, and ages only on relevant plays. | The same tests, at equal strength. |
| 4 | `stadiums.test.js` still asserted ±4% and the 6% cap, so it failed on `742d936`. | Asserts +12/−12, the 14% cap and the unchanged +2% field bonus. | Same test. |
| 5 | **The player's own try at 320×568:** Choose Play fell below the screen, under the substitution strip and replay. | Kick and Go for Two come first. Substitutions and the replay move to More. | `tools/live-console-check.py` |
| 6 | **Short landscape (568×320):** the field collapsed to about 45 px. The two-column layout only started at 600 px wide. | The two-column console starts at 480 px. The fourth-down buttons fit the narrow column. | `tools/live-console-check.py` |
| 7 | **Beast Clash replay:** Back to the Result was moved into the hidden Guide & Notices list, so a replay could not be left from the screen. | It stays in the console. Clash buttons wrap instead of clipping. The reserve strip is shorter on short screens. | `tools/live-console-check.py` |
| 8 | **The match's first-ability tip** (a blocking Coach Assist sheet, "X just used Y") still appeared after the kickoff handoff. A real playthrough showed three in the first game. | Uses a shared `automaticTipsOff` switch: off in Expert mode or after the handoff. Unguided and older clubs are unchanged. | `guided-week.test.js` |
| 9 | **The highlighted HQ tab on Saturday's media screen was refused** with "Finish or skip the current lesson first." The HQ tab remembered Training, which the Sunday lesson closes. This also happens on main, but the PR now highlights that tab. | A tab whose remembered sub-screen is closed opens at its own root. | `tools/guided-week-check.py` (new "gated tab history" step) |
| 10 | **Ability demonstrations in landscape:** opening About squeezed the field to 85 px. | Short landscape uses two columns: the field on the left, playback and information on the right. | `q_demo` tap-through (emulated) |
| 11 | **Vanishing Cut's reviewer demonstration** (found by the full suite; also fails on `742d936`, passes on main): with the 12% values the first seed showed the juke, but the juked defender never tried again. The reviewer claimed "the defender loses him" from the activation line, and the presentation had no impact moment. | The resolution now requires the defender's failed attempt ("cannot find"), and the seed search widens to 40 seeds (seeds 12, 12, 24 and 26 by tier). | New test in `task8-review-sequences-named`; `task8-fx-football-b` Dark passes. |
| 12 | **Ball Clamp's "jarred loose" demonstration** (found by the full suite; same on `742d936`): its fixed seeds came from an offline search under the old values, and the new values move the random stream. | Re-searched with the same method (first seed in 1–3000 whose extra check fumbles): 968, 130, 130 and 57 by tier. The same search on main reproduces the documented 123 and 57. | `task8-review-sequences-named` (2 tests) |

Three browser checks clicked controls that now live in the More and Choose Play sheets: `final-whistle`, `type-ui` and `feature-ui`. They now open the sheet first. No assertion changed.

### 1. Phone layouts (emulated, by taps)

**Live football** was played by taps in one game per configuration (about 55–60 decisions each). Configurations:
- 320×568, 390×844 and 440×956;
- 568×320 and 844×390;
- Larger Text at 320, 390, 440, 568 and 844;
- safe-area insets at 390 and 844.

Every scenario passes: offense, defense, fourth down (go and punt), both teams' kickoffs, your own kick and two-point try, the opponent's try, Auto, Replay, Substitutions, and the Help, More, Zones and Guide & Notices sheets. At every decision:
- the field and essential controls are on screen together;
- the page never scrolls, sideways or down;
- no label is clipped.

**Sheets and taps:**
- Choosing a play never snaps it, even with a double tap on the card.
- A double-tapped Snap runs exactly one play. A double-tapped Timeout uses one timeout.
- Changing tempo in the More sheet applies once.
- Opening and closing each sheet leaves the game, its random-number state and the selection unchanged.
- Sheet copies carry no game datasets.

**Interruption:**
- With Auto on, hiding the page stops play, and no play runs while hidden.
- Returning does not resume on its own. Resume Play appears in the console and continues Auto.
- Rapid taps on a zone choice: one run in five left a sheet open after a double tap. It did not change the game and did not reproduce in four reruns.

**Zone placement:**
- A banked zone shows a Zones button. The choice applies without snapping.
- The snap creates the zone in the chosen lane, and the next snap's picture matches the engine.
- After a reload the zone's position is unchanged.

**Watched Beast Clash and replay:**
- Passes at every size: arena and controls together, Help and Guide & Notices sheets, Back to the Result.
- After an interruption, nothing advanced while hidden or after returning, and Resume continued the battle.
- Two short-screen limits remain (see Remaining).

**Ability demonstrations:**
- The player's "See it" demo has no Phases, no play log and no review tools.
- The field and playback controls are on screen together at every size.
- The developer Ability Reviewer still ticks its Phases during playback (4 of 4 on the first scenario, the same as main) and saves a review.

### 2. Guided first week (emulated, three full playthroughs by taps)

The playthroughs ran at 390×844 (changing a starter), 320×568 (keeping the lineup) and 440×956 with Reduced Motion. Each passed **60 of 60 checks**:
- **Navigation:** all 15 checkpoints were reached through the highlighted real controls, including the bottom Roster tab, the HQ tab and the HQ day buttons.
- **Highlights:** every highlight has a 3 px outline and pulses (`guide-control-pulse`). With Reduced Motion it keeps the outline without animation.
- **Tour rules:** order is enforced, a lineup slot does not count as inspecting a beast, a real starter change is required, and nothing was skipped.
- **Handoff:** the tour ends as the first game opens, at kickoff with 0 plays. One non-blocking note appears with the exact text, "You’re on your own now. Do your best, and remember your goal—the board will!" It is 63 px tall.
  - Game controls stay usable with the note showing.
  - Re-rendering does not duplicate it. ✕ dismisses it, and it stays dismissed after a re-render and a reload.
- **The first game:** played by hand to Sim to Final, including fourth downs, kickoffs and tries. No lesson, status or result sheet appeared, and no Coach Assist tip (after fix 8).
- **Week 2:** no review or preparation lesson, and every tab is free. Help still offers the Guidebook. The finished tour survives a reload.

**Existing saves** were loaded: v43.12.4 after season 1 and mid-season, v43.16.8 and main creation saves, two offseason saves, the season-end fixture and the trade-desk fixture.
- None enrolled, and none showed a highlight, panel or send-off.
- Saves with a Sunday game started it in the live console with no send-off.
- Coach Assist tips stay on for unguided non-Expert clubs.

**Older guided saves:**
- A save paused in its first guided match retires the tour on load, with no lesson sheet.
- A save on the retired review lesson retires quietly, with no late send-off and free tabs.

### 3. Persistent zones

**Engine audit:** 40 AI games (2,079 plays, 831 with zones, 16 zone abilities) were checked against these rules at every snap:
- Each zone in play equals the next-snap projection from the line, with a mismatch of 0.
- No zone moved during or after a play, so zones never follow the carrier.
- No zone's remaining plays rose, and none dropped by more than one per play.
- No zone survived a change of possession (732 possession changes, including kickoffs, scores and turnovers).
- 493 fresh creations were placed after new possessions.

**Reload:** 30 games played straight through and with the whole game round-tripped through JSON before every step ended identically.

**Interception against a Fire zone (real engine):**
- The throwing club owned an active Fire zone, and the defense owned a Water zone plus a banked Water creation.
- The interception play kept all three zones, so the return and replay pictures are intact.
- The intercepting club's first snap had none.
- On main the same three zones carried into the new possession.

**Unit and integration tests cover:**
- both directions, gains and losses, lateral ball spots, multiple zones and removed footprints;
- field boundaries and their recovery, whistle-created zones and legacy zones;
- possession changes after downs, kicks, scores, safeties, onside recoveries and overtime.

The engine always spots the ball in the middle, so non-zero lateral spots are exercised only by the unit tests.

**Not changed:**
- No cooldown, charge or ready state is refunded.
- Clearing touches only the zones on the field, never the creators' ability state. The banked-creation rule removes the stuck state.
- At halftime, legendary zones (which survive halftime by design) still carry into the second half only when the same club has the ball. **Owner decision pending** on whether a second-half kickoff should also clear them.

### 4. Football type balance

All values come from the same teams and seeds under each setting. "Off" means types off. The full output is kept with the validation scratch files.

**`tools/type-balance.mjs --games=200 --plays=600 --seed=1`:**

| AI-vs-AI games (mixed clubs) | Points per game | Favourite wins |
|---|---|---|
| Types off, no lean | 13.58 | 75.6% |
| Types off, lean | 12.94 | 72.5% |
| Previous 4% | 13.29 | 76.3% |
| Candidate 12% | 13.61 | 74.4% |

- **Single plays, every monster one type, equal ratings** (yards per run play):
  - offense favoured 17.2;
  - neutral 14.2;
  - defense favoured 12.3.
- **One-on-one, WR against CB in man** (completion):
  - equal ratings: 32.2% neutral, 32.7% WR strong, 31.3% WR weak;
  - WR +10 but weak: 37.5%;
  - CB +10 against a strong WR: 30.2%.

  The rating gap still wins.
- **Tool limitation:** the tool's rating rows (62 against 68/74) give identical numbers. Its frozen test lineups ignore the requested rating, so the whole-game rating study below was added.
- **Stadium study** (`--only=env --games=300`): the field bonus changes favourite wins from 74.7% to 75.1%. A home club of the field's type wins 48.7% with the bonus and 46.0% without.
- **Dragon study** (`--only=dragon --games=200`): all-Dragon clubs won 50.5% at +2%, 57% at +1% and 52.5% at +0%, against 50.5%, 52% and 52.5% for the same clubs with natural types. No consistent lift.

**Whole-game matchups** (150 games each, identical seeds; win % of the first club):

| Matchup | Overall | Off | 4% | 12% |
|---|---|---|---|---|
| All Water vs all Fire (favourable) | 50 v 49 | 56.0 | 62.7 | **72.0** |
| All Water vs all Psychic (neutral) | 50 v 49 | 52.7 | 52.7 | 52.7 |
| All Fire vs all Water (unfavourable) | 50 v 49 | 54.7 | 52.0 | **36.0** |
| Natural mixed vs natural mixed | 50 v 49 | 56.7 | 50.7 | 57.3 |
| Water counter, about 0 overall weaker, vs Fire | 49 v 49 | 41.3 | 42.7 | **60.7** |
| Water counter, 3 weaker | 46 v 49 | 25.3 | 29.3 | **53.3** |
| Water counter, 4 weaker | 45 v 49 | 17.3 | 22.7 | **32.0** |
| Water counter, 6 weaker | 43 v 49 | 13.3 / 9.3 | 16.7 / 13.3 | **21.3 / 22.0** |
| Neutral Psychic control, 3 / 4 / 6 weaker | | 23.3 / 16.0 / 13.3 | same | same |
| Mixed club vs all-Earth gym (+1 overall) | 50 v 51 | 50.0 | 48.0 | 46.0 |
| Same club, half counters (Water/Wind) | | 49.3 | 50.0 | **57.3** |
| Same club, all counters | | 48.0 | 51.3 | **62.0** |
| Same club, all weak to Earth (Electric/Fire) | | 54.0 | 42.0 | **20.7** |

The 6-weaker row has two numbers per cell: requested qualities 44 and 38 both produce overall 43.

**Findings:**
- Type-aware lineups now matter. Against a mono-type gym, swapping half the lineup to counters moves a coin-flip to about 57%, and a full counter lineup to about 62%. Fielding monsters weak to the gym drops to about 21%. At 4% these were within noise.
- A counter overturns about three overall points. It does not make a much weaker club an automatic winner: 4 points weaker wins 32% and 6 points weaker about 22%, against 16% and 13% for a neutral club.
- Mixed natural clubs barely change (favourite wins 74–76%, points about 13.5), because their edges mostly cancel.
- Football's +12% applies only to a beast against the actual monster he meets. Opposite edges on both sides of a contest give a relative gap of about 27%, so mono-type extremes show the largest effect.

**Policy studies (60/120 matched games):**
- `passing-calibration`: completion 55.6% on the PR against 54.6% on main, and sacks 1.6% against 2.2% of dropbacks. Both are below the 63–67% target, which main also misses.
- `defense-fix-compare` (120 games): completion 56.5% against 55.5%, 7.76 against 7.50 yards per attempt, 6.96 against 6.94 yards per carry, and 13.7 against 13.8 points.
- No engine regression is attributable to the change.

**Recommendation:** keep the 12% candidate. No tuning was made. Beast Clash's chart and damage are unchanged (its tests pass), and human and AI use the same values.

### Checks

- **Targeted tests:**
  - On `742d936`: 304 tests, 6 failures, all passing on main (fix 1).
  - After the fixes, the expanded set of 356 tests across 39 files had 1 failure (`stadiums`, fixed in `b648ccc`; 6/6 now).
  - The set covers engine, rules, QB reads, pursuit, zone intel, defensive fixes, abilities, all `task8` ability and field files, zone revisions, `live-console-fields`, type matchups, stadiums, AI zone placement and signatures, guided week, Coach Assist, phone navigation, text, release stamp, problem recorder and save compatibility.
- **Browser checks, PR against main `69964f1`:**
  - **Pass on the PR:** live-console (new), guided-week, final-whistle, def-lab, pregame-draft, franchise-polish and clash-continuous.
  - **Fail the same way on main:**
    - navigation: a stale roster position;
    - phone-navigation: the Undo toast click is blocked;
    - feature-ui: the same four problems;
    - type-ui: the same stop at the Type Chart from the monster card;
    - problem-recorder: an old version string;
    - ai-lab: the same four "Defenses tested" problems;
    - roster-nav: browsing changes three beasts' stats, intermittently on both;
    - cache-upgrade: the stale `v42.4.1` pass condition.
  - **Intermittent (ai-lab):** one ai-lab run on the PR showed three more problems. The 390-px situation there is seeded from the clock, and the rush arrived before the tap. Three PR reruns and two main reruns did not repeat it.
- **Full suite** (`node --test "tests/**/*.test.js"`, once, on `b6f43d8`, with nothing else running, 03:13–04:26 UTC, 72.6 min): **2,332 tests, 2,329 pass, 3 fail.**
  - The three failures were reviewer demonstrations (fixes 11 and 12): Dark presentation phases (`task8-fx-football-b`), Ball Clamp jarred-loose, and the labelled-variants test (`task8-review-sequences-named`).
  - All three pass on main and on the final code with the old 4% values. They also fail on the original PR head `742d936`, which fails a fourth (Metal presentation), already repaired by fix 1.
  - After fix 11/12 on `468203e`: the 12 reviewer, presentation and zone-review files (95 tests, plus the new Vanishing Cut test) and the 6 files that read the reviewer texts (24 tests) all pass. The Ability Reviewer tap-through (6 scenarios, 4/4 phases, review saved), the player demo and `tools/live-console-check.py` pass.

### Remaining limitations

- **Real devices: pending.** This includes:
  - safe areas and the notch in landscape;
  - touch timing on double taps;
  - native background and lock;
  - app-kill recovery during Auto, Clash and replays;
  - audio focus;
  - Swift and Gradle builds.
- **Clash at 568×320 landscape while paused or replaying:** the speed buttons are partly covered by the reserve strip until you resume. The Resume Play banner and Skip remain reachable.
- **Clash at 320×568 while the pause banner shows:** the arena shrinks to about 100 px.
- **Player demo, Larger Text at 320×568:** opening About shrinks the demo field to 140 px. Closing it restores the field.
- **Halftime:** legendary-zone carry-over is an open owner question (see section 3).
- **Lateral ball spots:** non-zero spots are unit-tested only, because live play always spots the ball in the middle.
- **Coach suggestion text:** the try's "coach suggests two" is hard-coded English (pre-existing).
- **ai-lab:** the 390-px situation is clock-seeded and should be pinned (pre-existing).
