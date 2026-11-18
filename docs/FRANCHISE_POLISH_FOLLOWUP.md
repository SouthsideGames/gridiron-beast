# Franchise polish follow-up

## Scope and integration

Build v43.24.0-franchise-followup. Main at 13caa61 contains #130. #131 was merged into codex/audio-draft-polish (465f0bf), rather than main. This follow-up includes the exact validated #131 content (9a00118 / tested code c5372e6) and targets main, so no previous polish fix is lost. Nothing is deployed or rebuilt on a phone.

## Draft ownership fix

An AI pick previously committed its history entry and removed the prospect from availability before joinAsDraftee returned. A full protected roster can return ok:false, which the caller ignored. The draft now transfers ownership before committing the pick. A rejected transfer records an explained pass, restores any previous drafted metadata, leaves the prospect available, and advances the clock. Successful transfers retain rookie terms and normal release rules. There is no additional random draw. Both creation and offseason drafts use this path.

The fix preserves the existing protected-monster and 38-player rules. It does not try to reconstruct old missing draftees: historical releases and failed transfers cannot safely be distinguished just from a pick's absence on its original club.

## Watch while interrupted

The arena shows Resume Play to Watch during a lifecycle interruption. In franchise battles, tapping it explicitly clears the persisted pause and resumes playback; the regular Resume Play banner uses the same helper. Hidden-page resume is refused. Standalone arenas without a franchise resume callback show an unavailable button with the same explanation. No battle result, RNG or clock simulation is changed by the resume helper.

## Additional polish

1. HQ offers Review Lineup / Dismiss after an observed roster addition. No starter changes automatically.
2. The same reminder names a beast observed recovering from injury. Pending reminders survive reloads; dismissing them does not change the lineup. Initial loads and club switches establish a baseline without flagging an entire roster.
3. Coach creation and My Office support up to 30 appearance undo steps and Restore Original. History is local to the editor session; saving still changes only the portrait. The compact sticky preview remains.
4. Audio Settings has Play Music, Play Cry and short Test Volume samples through the real SFX/crowd buses. Muted/zero-volume states explain silence. SFX/crowd samples are neutral test tones, not new game effects. Previews stop on leaving Settings or backgrounding.
5. Unavailable controls have stronger visual treatment. Attribute buttons at the training ceiling say Limit; an empty Undo explains that no changes exist; interrupted Watch explains its required action. Existing market blocking reasons remain beside offer actions.
6. Best Lineup confirmation lists the old and proposed starter in every changed slot. The preview does not alter the save, and Cancel remains a no-op.
7. Offers show total pay across the term, including the signing bonus, separately from annual salary and cap schedule. Attribute displays explain current rating / training limit and label temporary deltas as Now. Existing season/career statistic scopes remain explicit.
8. Coach selections include checks; selected choices/segments get outlines, unavailable buttons dashed borders, and injured depth rows a dashed edge. Existing written injury/status labels remain.
9. Training reports lead with the actual temporary attribute boost, fatigue and injury outcome; longer text is under Practice Details. No invented before/after permanent rating is shown for a temporary team-wide boost.
10. Empty browsing results explain that no beasts match and point to the adjacent Clear Filters action.

## Validation

- Final targeted checks: 67/67 passed, 0 failed/canceled/skipped, in 9.05 seconds. Includes new ownership, reload, roster-reminder, read-only preview, coach undo and audio cancellation coverage, existing draft/polish/coach/audio/text checks and release stamp.
- League registry, league flows and league season tests passed in the broader run. That run originally had two wording failures (unused original Best Lineup text key and British spelling in a preview message); both were fixed and the affected text tests rerun successfully.
- New ownership tests include a real full protected club refusing a rookie, a prospect being available for the next club after that refusal, successful transfers before recording, and three completed real creation drafts audited after JSON reloads.
- Browser harness tools/franchise-polish-check.py adds actual taps for coach undo/restore, newcomer Review Lineup, empty filters and audio-control presence at 320/390/440 px. Python compilation passes. Execution is blocked before page creation: system Chromium aborts with socket() failed: Operation not permitted. No browser pass is claimed.
- Full regression has not been rerun for this follow-up. Claude's 2,291-test pass applies to c5372e6, not these changes.
- Native iPhone/Android audio, share/cancel, Back, interruptions/app-kill and Swift/Gradle builds remain pending. No phone installation was changed.

## Claude review handoff

Validate the follow-up against the merged #130/#131 content. Play creation and offseason drafts, including forced full protected AI rosters, cap pressure, picks/passes, all rounds and reloads. Audit every recorded non-pass prospect's ownership or explicit legitimate release, not just the draft-history count. Confirm prospects cannot silently disappear or be drafted twice and rookie terms remain correct.

Use real taps for Watch after an interruption and the separate Resume banner, both live Clash and replay. Check no hidden-page auto-resume, extra battle step or lost result. Test new/recovered beast reminders, dismiss/reload, club switches and old saves. Check Best Lineup preview/Cancel/Confirm agrees with resulting starters. Test appearance random/step/chip undo and restore, including onboarding, Office save/cancel, 320 px and short landscape. Check annual versus total pay and temporary versus permanent ratings, actual training results and empty-filter recovery. Verify mute/zero volume and repeated previews, leaving Settings during preview, and real device mixing when available.

Run the full suite on final source with no heavy concurrent job; record commit, counts, duration and every pending device check. Compare failures with the base, add regression coverage for fixes, and keep the PR unmerged and undeployed for owner review.

## Claude validation — 2026-11-18

**Code tested: `555d51f`.** That is the PR head `299fb63` plus Claude's fix commit. Main is still `13caa61` (#130), and #131 is not on main. This PR contains all of #131 (`9a00118`), and every #131 validation fix is still in place: the #131 tap-through checks pass on this code. Nothing was merged, deployed or installed on a phone.

All browser testing used emulated phones in headless Chromium, at 320×568, 390×844, 440×900 and 844×390 landscape, with and without Larger Text. The attribute grid was also checked at 360, 375 and 414 px. Nothing was tested on a real device.

### Defects found and fixed (`555d51f`)

Each fix has regression coverage in `tests/franchise-followup.test.js` or `tools/franchise-polish-check.py`. Each new check fails on `299fb63`.

| # | Defect | Fix |
|---|---|---|
| 1 | **The pick lists showed a refused AI pick only as "(passed)".** The reason was recorded but never shown, and the creation draft posts no news item for it. | Recent Picks and All Picks show the reason, for example "Sundown Drakes cannot make room." |
| 2 | **Between 360 and 414 px the beast page's attribute grid broke** (also on main and #131). The page scrolled sideways at 360 and 375 px. The rating bars had no width. The left-hand + buttons sat over the right column's labels. | One attribute column on phones under 520 px. The value column grows to fit a "−2 Now" note. |
| 3 | **An attribute at its training limit still showed "+".** The follow-up described a Limit label, but it had not been added. | The disabled button says **Limit**. |
| 4 | **"No beasts match these filters. Try Clear Filters." appeared on an empty list with no filter on**, for example before a draft class exists. Clear Filters could not help. | The message appears only when filters hide beasts. Otherwise the count line stays ("Showing 0 of 0"). |
| 5 | **Coach Undo recorded empty steps.** Re-choosing the selected option, or tapping Restore Original on an unchanged look, enabled Undo with nothing to undo. | Only real changes become undo steps. The 30-step limit is covered by a test. |

### 1. Draft ownership

- **Engine audit:** creation drafts for five seeds, with every AI club, every third club or every second club full (38) and fully protected. The game was reloaded through JSON after every owner turn.
  - **On main**, the same setup loses **41–43 draftees per draft**: each one is recorded as picked but belongs to no club.
  - **On this branch, 0 were lost.**
- **Tap-throughs:** three creation drafts and three offseason drafts, run to the end of every round.
  - The offseason drafts used the season-end save, a save from main and a v43.16.8 save.
  - A third of the clubs were made full and protected. In the offseason, one club was also pushed over the cap.
  - The owner rotated Pick, Pass and trading the pick on the clock to an AI club. The page was reloaded after every turn.
- **Results:**
  - Every refused pick is recorded as a pass with its reason: "<club> cannot make room." or "no prospect fits its salary cap". The prospect stays available, and a later club can draft him.
  - Nothing was drafted twice and no prospect disappeared.
  - Every successful pick is on its drafting club, with the right `drafted` record and a two-season rookie contract at 70% of salary.
  - Full protected clubs kept their rosters exactly, and the registry check passes.
- **Legitimate releases:** every club's roster was instrumented during the drafts.
  - A draftee who later leaves his club (for example, cut for room by a later pick in the same draft) appears as a recorded removal.
  - A failed transfer would appear as a pick that never reached his club. None were found.
- **Rules unchanged:** the 38-beast limit, the protected-beast rules and the cap rules are unchanged.

### 2. Watch after an interruption

- **Scenarios:** live Clash and replay. Each was interrupted by hiding the page, by hiding and reloading, and by tapping Watch while the page was still hidden.
- **Back on screen:**
  - Watch reads **Resume Play to Watch**, and the Resume Play banner is shown.
  - Nothing plays on its own.
  - The game state is unchanged, so there was no extra simulation step.
- **Resuming:**
  - Tapping Watch, or the separate Resume Play banner, continues playback and clears the saved pause and the banner.
  - Watch tapped while the page was hidden is refused.
- **Outcome:** in all five scenarios at all four sizes, the battle finished with exactly the same result as an uninterrupted control run.
- **Football Auto:** a hidden page still pauses Auto, which stays paused after a reload and continues only on Resume Play. The first 14 recorded plays are identical to the control, at 320 and 440 px.

### 3. Additional polish, by taps

- **Lineup reminders:**
  - A first HQ visit flags nothing, on new franchises and on saves from v43.12.3, v43.16.8 and main.
  - A recovered beast and a new arrival are both named, and the reminder survives a reload.
  - Dismiss clears it permanently and changes no lineup. Review Lineup opens the roster.
  - Switching to another franchise shows nothing, and switching back keeps the pending reminder.
- **Best Lineup:**
  - The preview lists exactly the slots that change (for example "WR1: Squallow → Zaptera"), and the result matches it.
  - Cancel changes nothing. With nothing to change, the preview says the starters stay the same.
- **Coach Undo and Restore Original** were tested in creation and in My Office:
  - Chips, steppers on two tabs and Surprise Me all undo in order back to the original.
  - Restore Original can itself be undone. Exactly 30 steps are kept.
  - Cancel keeps the saved portrait, and a reopened editor starts clean.
  - Save, then a reload, keeps the new look.
  - Every option can be tapped in 844×390 landscape.
- **Audio previews** (emulated Web Audio, so nothing is verified through a speaker):
  - Each channel's button starts one sound, and six quick taps never stack.
  - Mute and zero volume each explain why nothing plays.
  - Leaving Settings or hiding the page stops a cry or a test tone.
  - Play Music selects the menu music. Settings keeps whatever track was playing, so Play Music is silent if the menu music is already on.
- **Pay:** Total Pay equals salary × seasons + bonus, and it updates with the seasons, the bonus and a typed salary. It equals the sum of the cap schedule.
- **Ratings:** "Now" marks only temporary changes, such as fatigue on Speed, and the explanation line is shown. The training result leads with the real boost ("+5 Accuracy, Catching, Awareness This Week"), fatigue and any injury. Practice Details starts closed and expands.
- **Filters:** the roster and market show the no-match message when filters hide every beast, and Clear Filters restores the full list.
- **Non-colour cues:**
  - Injured depth rows have a dashed edge and "OUT 2w".
  - Disabled buttons are dashed, selected segments are outlined, and selected coach choices have a ✓.
- **Layout:** none of these screens scroll sideways, have clipped controls or log page errors at any tested size, with or without Larger Text.

### Checks on `555d51f`

- **Tap-through scenarios:** all 56 pass. They cover the items above plus the #131 scenarios (draft, roster, plan, Clash, warnings, free agency, layout and existing saves).
- **Repository browser checks:**
  - **Pass:** franchise-polish (now also covering the grid at 360/375/414 px, no-op undo and pass reasons), navigation, guided-week, trade-desk, coach-editor-mobile, card-export and final-whistle.
  - **Fail with output identical to main `13caa61`:** roster-nav, feature-ui, league-hub, storage, release, fa-ui and problem-recorder.
  - **cache-upgrade** fails on the same stale `v42.4.1` condition as before.
- **Targeted unit run:** 134/134.
- **Full suite:** `node --test "tests/**/*.test.js"` on `555d51f`: **2302 tests, 2302 pass, 0 fail, 0 skipped**, in 69 min 21 s (04:40–05:50 UTC), with no other jobs running.

### Still pending (no devices or build tools)

These cannot be confirmed by emulation:

- Native audio mixing with other apps, the silent switch and audio focus
- Phone share and cancel on iPhone and Android
- Android Back
- Real background, lock and app-kill recovery during Auto, Clash and replays
- Swift and Gradle builds with `prepare-mobile.mjs`

### Known and unchanged

- **Old saves:** draftees already missing from old saves are not reconstructed.
- **Hard-coded English text:** several new follow-up strings are written directly in the code rather than in `src/text/en.js`. Examples are "Total Pay", "Review Your Lineup", "Undo" and "Resume Play to Watch". The text tests do not flag them.
