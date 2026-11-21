# Phone readability and UI sound follow-up

Build: v43.32.0-phone-readability. Based on merged main `9a4189b` (PR #145).

## Changes

1. UI sound loading reads the approved PCM16 WAV samples directly into an AudioBuffer. It no longer relies on the platform's WAV decoder. Shared master/SFX gains, mute, cue priorities and gesture wake-up stay in place. Settings Test explicitly bypasses tap rate limiting and reports success only when a source starts. Concurrent gesture/preview wake-ups share one resume promise. Resume and source creation/connection/start failures return false and can retry. The obsolete “the game has no other sound” Settings wording is removed.
2. HQ's Your Team and Career and League News disclosures start open. Both can still be closed normally.
3. Rain and storms use sparse short streaks rather than a continuous diagonal pattern. The storm tint is lighter. Gameplay weather rules are unchanged.
4. Ability charge/cooldown uses a small progress ring beside each beast's base. A filled dot marks readiness. Numeric overhead bars and large charge icons are removed from the live overlay; status badges and detailed inspection remain. Engine readiness and cooldown values are unchanged.
5. The scoreboard uses bounded columns. Clock status gets a separate full-width wrapping row, so “can't be stopped” cannot expand the middle column across scores and abbreviations.
6. Guide & Notices is now Guide. Football instructions appear directly in the sheet, with no initial How a Match Works disclosure to open.
7. Postgame experience and development rows give full names their own wrapping row, followed by wrapping reward details and a progress bar. All starter rewards are listed rather than hiding participants after the first twelve.
8. Missing box-score leaders say “None recorded” instead of a lone dot.

## Validation

Initial targeted run: 77/77 passed. Final affected rerun: 29/29 passed, with no failures, cancellations or skips (19.8 seconds). Release stamping, syntax checks and git diff whitespace checks pass. The broader fast tier is still running at this checkpoint; the full suite has not run. No simulation engine or reward calculation changed.

The WAV tests load all seven repository files, compare every PCM sample with the original, preview all seven through the SFX bus and test source failure/retry. They do not prove speaker audibility. Additional checks cover default-open HQ sections, retained opposing leader identity when a club has no sacks, base-level charge/cooldown/readiness SVGs and unchanged render input state. The new box-score fixture initially omitted required team metadata; that fixture was corrected before its passing rerun. The preview cancellation fixture now explicitly suspends its fake context before testing delayed resume, matching the new behavior that avoids redundant resumes of running contexts.

## Pending review

The precise native failure behind the owner's generic red audio-preview toast was not reproduced here. Removing the decoder dependency and handling source errors addresses weaknesses in that path, but real-device playback remains unverified.

Chromium could not launch: `socket() failed: Operation not permitted`. No browser layout pass or real-phone validation is claimed. Review at 320px, 390px and 440px portrait, short landscape, Larger Text, safe areas and Reduced Motion. Check the longest clock line, rain readability, charge markers, direct Guide opening and full experience names. On iPhone, test Settings SFX Test, ordinary taps, back/confirm, notifications/rewards, volume/mute and returning from background/screen lock.

This remains a draft pending the repository's full-suite approval gate and visual/device review. Nothing was merged, deployed or installed by this work.
