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
