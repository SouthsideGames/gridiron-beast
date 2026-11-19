# Commissioner guided first week

Implementation branch: `codex/guided-first-week`. Preview version: `v43.20.0-guided-first-week-preview`.

## Current player experience (PR #136 follow-up)

Only newly created franchises enroll, explicitly in onboarding. Existing saves never enroll on load. The required tour now has **15 checkpoints**, ending when the first football game starts. It still teaches the roster, a real starter change, coaches, the creation draft, Board goals and each weekday, including recruiting and the pregame Clash.

At kickoff a compact, dismissible Commissioner note says: “You’re on your own now. Do your best, and remember your goal—the board will!” It is not a blocking sheet and does not pause or simulate a play. It appears once and stays dismissed through re-renders/reloads. Automatic offense, defense, fourth-down, kicking, result and status lessons stop. The previous result-review/Week 2 preparation/graduation sequence is retired. The older Coach Assist auto-tip system does not restart afterwards; Help and the Guidebook remain on demand.

Each navigation lesson highlights its actual game control, including the bottom Roster tab and direct screen buttons. A clear inset gold outline stays visible while a gentle inset pulse calls attention to the control without changing its size or position. Reduced Motion removes the animation and retains the outline. Local inspection, lineup-slot and comparison lessons highlight an applicable local control. Targets refresh with the lesson and clear when guidance ends.

Required ordering, skip/opt out, missing-prospect handling, actual assignment/comparison evidence and day progression remain intact before kickoff. No win protection, costs, injuries, gameplay RNG or match outcomes change. A bye/forfeit alone does not count as starting football. Saves already in a guided match retire the tour on load/save; saves on the old review/Week 2 lessons retire quietly without showing a late send-off.

## Saved data

The optional version-1 guide remains compatible. New additive fields: endedAtFootball, sendoffPending and sendoffShown; evidence.gameStarted records the handoff. Old lesson IDs remain available for save/Guidebook compatibility; they are not forced onto new players. The original enabled flag and Coach Assist preference are not overwritten.

## Current validation

- Guided-week tests: **19/19 pass**, including kickoff completion, midgame/old-review saves, no enrollment/opt-out, unchanged RNG, real navigation targets, clearing targets, suppression of legacy automatic tips, manual Help availability and one-time non-blocking send-off behavior.
- Central text and release stamp: **10/10 pass**.
- Coach Assist: **11/11 pass**.
- PR #136 terrain integration: **11/11 pass**.
- Football type tests: **10/10 pass** after correcting two assertions from the initial implementation: the stronger candidate can outweigh a modest rating gap (a large gap still wins in the AI forecast), and floating-point bonus sums require a tolerance while still asserting the cap.
- The browser harness now checks the real pulsing Roster tab, kickoff handoff, no recurring football tips, dismissal and reload at 320/390/440px. It could not run: the packaged browser was absent and system Chromium failed before navigation with socket() Operation not permitted. **No visual/browser pass is claimed.**
- Full regression, seeded balance measurement and native/device validation remain pending. No merge, deployment or phone installation was performed.

The results below are historical validation of the old 18-lesson flow, not this follow-up.

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

## Merge with main after PR #127 (2026-11-17)

`main` at `15c1b08` (PR #127 mobile onboarding fixes) was merged into this branch in `2a45945`. This was a merge commit, not a rebase.

- **`src/text/en.js`:** the only text conflict. It is resolved with main's `shared.unknown_value` line first, followed by the guide lines.
  - A three-way comparison of all 6,987 keys found no lost or changed wording and no duplicate keys.
  - #127's GM, Temper and HQ wording is kept, and so are this branch's guide and forecast wording.
- **Unused lines removed** (`8814d31`): `hq.not_scouted_yet` and `data.unknown`. #127 stopped showing them, so the central-text check fails on `main` itself.
- **`src/version.js`:** keeps the newer `v43.20.0-guided-first-week-preview`. Main was on v43.19.0.
- **`index.html`:** regenerated with `node tools/stamp-release.mjs` (467 modules), not combined by hand. `--check` passes.
- **Auto-merged from #127:** `src/data/temper.js`, `src/ui/screens/hq.js`, `styles/app.css`, `tests/text-style.test.js`, `tools/coach-editor-mobile-check.py`.

Checks on `8814d31` (browser checks emulated):

| Check | Result |
|---|---|
| Targeted tests (guided-week, text-style, central-text, release-stamp, board-balance) | 35/35 pass |
| coach-editor-mobile-check | Pass |
| guided-week-check at 320, 390 and 440 px | Pass |
| navigation, final-whistle | Pass |
| New-franchise playthrough at 320 px, lineup changed | 48/48 |
| New-franchise playthrough at 440 px, lineup kept | 50/50 |
| cache-upgrade-check | Pre-existing stale assertion: it hardcodes `v42.4.1`. The new build loads in all 3 scenarios. |
| Full suite (`node --test "tests/**/*.test.js"`) | 2,254/2,254 pass, 0 fail, 0 cancelled, 0 skipped, 72.8 min |

No merge, deployment or Capacitor build has been performed.
