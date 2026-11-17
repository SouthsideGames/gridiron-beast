# Commissioner guided first week

Implementation branch: `codex/guided-first-week`. Preview version: `v43.20.0-guided-first-week-preview`.

## Player experience

Only newly created franchises enroll, explicitly in onboarding. Existing saves never acquire tutorial state on load. The Commissioner's introduction ends with “Let me show you around.” Nervous Board humor appears in the introduction; lesson instructions use normal language.

Eighteen saved checkpoints cover HQ, inspecting a beast, ratings/Temper/abilities and readiness, a real lineup assignment, staff, the creation draft, Board goals, Monday scouting, Tuesday prospect comparison and recruiting/Clash, Wednesday training, Thursday opponent scouting, Friday both game plans, Saturday media, Sunday football, results, independent team preparation, and graduation. Each offers skip and opt out. A Guidebook retains completed and skipped lessons and acknowledged situation lessons.

Routes and HQ day shortcuts enforce the current task while guidance is active. Inspection and comparison require their actual controls; lineup completion compares the real starting chart before and after a successful change. Daily actions use the franchise calendar, not a “Got It” button. Recruiting never requires signing. A missing prospect or unavailable alternate adapts the relevant lesson. Skipping a daily lesson unlocks navigation but never advances the calendar or simulates a battle: the next checkpoint begins when the normal day completes.

The independent check permits free navigation. Players inspect a beast and either change the starting lineup or explicitly keep it. A completed football game is required for the football milestone; merely advancing past a bye does not count. Normal victories/losses, RNG, costs and injuries remain in force.

Football situation sheets cover the objective, offense, defense, fourth down, kicks, results, and abilities/statuses. They appear at idle boundaries, not during animations. Auto waits on sheets and the advisory play clock pauses. Clash setup explains automatic combat, lineup order, type edges and reserve switching; startup waits on any open lesson sheet. Later help covers injuries, evolution, contracts and the offseason when relevant. The first version's lessons are concise explanations: real-device review must assess how much additional guided interaction the match lessons need.

## Saved data

Optional additive `f.guide` version 1: enabled/done, index, completed/skipped IDs, acknowledged moments, starting season/week, lineup snapshot, evidence and optional skipPending. No schema break. Existing JSON export/import carries it. No global completion flag is inferred and no random draws are consumed.

## Other approved changes

Practice removed from the HQ shortcut grid. Board forecasts shown as whole numbers in goals, history and award explanations; internal precision and firing/goal rules remain unchanged. Board text is shorter; the exact confidence rules remain under How It Works.

## Validation (2026-11-17)

Tested from PR head `f6038fe`; fixes in `6c2da9b` and `16fc205`. **All browser results are emulated** (headless Chromium, phone viewports with touch). No physical iPhone or Android device was used.

### Full regression suite

`node --test "tests/**/*.test.js"` (the `npm test` command) on `16fc205`, with nothing else running: **2,253 tests, 2,253 pass, 0 fail, 0 cancelled, 0 skipped, 73.6 min** (06:02–07:16 UTC). `npm test` itself exits 216 in this checkout because the tracked `node_modules` symlink points at itself. Later commits change documentation only: `git diff 16fc205 -- src index.html styles` is empty.

### Complete new-franchise playthrough (by taps, one continuous session)

Run three times on `16fc205`: 320 px (finishing independent preparation by changing a starter), 390 px (keeping the lineup) and 440 px (changing a starter). 48–49 checks each, all passing, no sideways scrolling, no page errors. Each run covered:
- **Start:** Main Menu → New Franchise → the Commissioner setup → HQ. Guidance starts on HQ at lesson 1 of 18; the welcome screen shows no lesson.
- **Required order:** out-of-order day buttons and tabs are refused with "Finish or skip the current lesson first." Back, HQ, Guidebook, menus and settings stay open.
- **Lessons by real action:**
  - Opening a beast card completes Meet Your Team; opening a lineup slot does not.
  - A real starter change completes Choose a Starter, and the player returns to Roster.
  - Finishing the creation draft and choosing a Board goal complete their lessons.
- **Each weekday:**
  - Monday scouting opens Tuesday recruiting (Day 2).
  - The info button completes the prospect comparison, and the panel updates in place.
  - Clash setup explains the Clash; Watch shows the reserve-switch controls the lesson describes.
  - The offer was declined, so nothing was signed.
  - Training, opponent scouting, both game plans and media answers each complete their day.
- **Sunday:**
  - Toss, Clash and kickoff choice, then the football introduction.
  - Lessons appeared as situations arose: Move the Ball, Stop Their Offense, Read the Play Result, Kicks and Extra Points (own kickoff or touchdown), and Fourth Down (own fourth down only).
  - About 40 snaps by hand, then Sim to Final.
- **After the game:** the result opens Learn From the Result in Week 2.
- **Independent preparation:**
  - Tabs are free.
  - Keep This Lineup asks for an inspection first.
  - After opening a beast, keeping or changing the lineup finishes it.
- **Graduation:**
  - All 18 lessons are completed, none skipped, and no panel remains.
  - Week 2 Monday opens unguided.
  - Help offers the Guidebook, which lists the lessons.
  - Graduation survives a reload.

### Scenario checks (emulated, 390 px)

- **Existing save** (v43.12.4 mid-season save): no `guide` data before or after a reload, no panel, free navigation.
- **Skip:**
  - Read lessons advance.
  - Skipping the draft lesson unlocks navigation and leaves the draft for the player to make.
- **Guidebook:** lists completed and skipped lessons.
- **Reload:** resumes the lesson.
- **Opt out:** removes the panel, frees navigation, brings back Coach Assist tips, and survives a reload.
- **Tuesday:**
  - With no prospects, the comparison lesson is skipped and does not block the player.
  - Skip the Encounter goes straight on to Wednesday.
  - A lost Clash offers optional pitches or Decline.
- **Clash start waits for an open lesson:** resuming a battle with the Clash lesson unread holds the arena until Continue.
- **Football:**
  - Auto takes no snaps while a lesson is open.
  - The live play clock pauses under any sheet.
  - A loss goes to Learn From the Result like a win.
- **Lineup gate and forfeit:**
  - With no healthy QB, the safeguard's Free Agent Market and Lineup repairs open.
  - After a forfeit, Week 2 is reachable and the football lesson waits for the next real game.
- **Byes:** the league bye falls in weeks 4–8 (`src/data/league.js`), so it never meets the Week 1 lessons. The only way to lose a week without playing, the forfeit, is covered above.
- **Win forecasts:**
  - Whole numbers on the goals screen, in Board history and in award explanations.
  - Fixed: the season-end Board news.

### Browser checks (TESTING_POLICY §2)

| Check | PR `16fc205` | `main` `8c93703` |
|---|---|---|
| guided-week-check (320/390/440) | pass | – |
| navigation-check | pass | – |
| final-whistle-check | pass | – |
| roster-nav-check (current save) | fail | fail, identical (browsing changes 3 monsters' stats) |
| feature-ui-check | fail | fail, identical 4 problems |
| league-hub-check (current save) | fail | fail, identical 6 problems |
| storage-check (current save) | fail | fail, identical ("Changed in Another Tab") |
| release-check (v39) | fail | fail, identical (v39 saves rejected by design) |
| cache-upgrade-check | fail | stale: the new build loads in all 3 scenarios, but the pass condition hardcodes `v42.4.1` |
| ui-walkthrough (390, guidance turned off) | stops in the offseason free-agency filter after a full season | stops earlier, in Week 1 ("? Help did not open", Got It loop) |

No check was weakened. The pre-existing failures are outside this PR.

### Fixed during validation

1. **Back refused after a lesson finished on a sub-screen.** After a starter change the player stayed on Assign with "Finish or skip…". Back is no longer gated.
2. **One save finishes only one lesson.** Skipping Tuesday's encounter left Wednesday training blocked. `syncGuide` now advances until the lesson is not yet done.
3. **A forfeited Sunday locked Week 2.**
   - New weekdays are now reachable; the football lesson waits for the next real game.
   - The Sunday lineup safeguard's market, release and lineup repairs are reachable.
4. **Fourth Down and extra-point lessons appeared on the opponent's snaps.** They now follow the player's own options (`footballLessonKey`).
5. **A lesson closed with ✕ reopened on every Clash setup tap.** It now waits until the next session.
6. **Smaller fixes:**
   - The lesson panel refreshes after comparing.
   - Keep This Lineup explains the inspection requirement.
   - "Show Me Where" is hidden when the player is already on the lesson's screen; it did nothing there.
7. **Forecast wording:**
   - The Board forecast sentence had a double period and a stray quote.
   - Season-end Board news showed decimal forecasts.
8. **tools/guided-week-check.py could not pass:**
   - It now dismisses first-discovery panels.
   - It waits for the app after a reload.
   - It asserts the return to Roster.
   - It fails on `f6038fe`.

The new regression tests in `tests/guided-week.test.js` (four) and the board-news assertion in `tests/franchise.test.js` fail on `f6038fe` and pass on the fix.

### Remaining

- **No real-device review yet.** Lesson ordering, guidance depth and match-lesson usability have not been checked on iPhone or Android.
- **Panel size:** at 320 px the lesson panel fills most of the first screen.
- **Skipped lessons:** after a Sunday lesson is skipped, the panel keeps showing it until the milestone happens.
- **Text listing:** `docs/text/GAME_TEXT.csv` is already out of date on `main` and was not regenerated.

No merge, deployment or Capacitor build has been performed.
