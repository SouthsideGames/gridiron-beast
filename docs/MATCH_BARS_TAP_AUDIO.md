# Between-play bars, replay cleanup and button audio

Build v43.36.0-match-audio. Based on main bbd2cca (merged PR #149).

## Behavior

- Replaced football readiness rings with the original segmented charge/cooldown bars. They read the current game-scope ability state for both teams and render above on-field monsters only during play selection. Live frames, pre-roll, end holds and instant replay do not draw readiness UI. Status badges and low-stamina warnings remain independent. This changes presentation only, with no ability state writes, initialization or RNG use.
- The Clash exchange info button is a compact 32px transparent icon, vertically centered inside the exchange rectangle. Its Guide action and accessible label are retained.
- Football instant replays no longer include the QB read list or replay read ring. Developer/reviewer tools remain separate.
- Team Stats now says Sacks and credits each defense with the opposing offense's recorded sacks taken. The engine's offensive sacks ledger and individual defenders' records are unchanged.
- Every enabled button activation now triggers the approved tap WAV through a dedicated, bounded tap voice. Close/confirm buttons also tap; action-specific reward/notification feedback can play without replacing or cutting off that tap. Consecutive button presses are not suppressed by the semantic sound throttle. Native summary and checkbox/radio controls are included. Master mute, zero SFX and hidden state still silence taps.
- Tap playback resumes suspended/interrupted contexts in the gesture, waits briefly for cold asset loading, and cancels stale superseded input. Leaving Settings or replacing a preview no longer cancels its button tap.

## iPhone audio update

The previous native patch explicitly selected ambient audio, which follows the silent switch. The patch now selects AVAudioSession playback with mixWithOthers. The JavaScript ambient request is skipped in native iOS so it does not override that host configuration. Browser ambient mixing remains unchanged. See Apple's playback documentation: https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/playback

The existing configure-ios-audio.mjs command upgrades its recognized previous ambient block once, is idempotent, preserves unrelated native code and refuses unrecognized custom categories. It keeps an exclusive AppDelegate.swift.before-audio-v2 backup. Run the normal Mac update commands including `node tools/configure-ios-audio.mjs`, then sync and rebuild/run in Xcode. A web deployment or Capacitor asset sync alone cannot install the Swift change. Do not uninstall the phone app; preserve saves and bundle identity.

## Validation

- 63/63 targeted audio, native-patcher, text, release, summary, lifecycle and readiness tests passed in 8.3 seconds; no failures, cancellations or skips.
- 36/36 targeted field FX/readiness/phone-match tests passed in 40.2 seconds; no failures, cancellations or skips.
- Final audio-only run, including approved PCM loading delayed beyond the old 250ms cutoff, passed 17/17 in 0.3 seconds.
- Coverage includes actual field-rendered selection bars versus live/replay frames, hidden off-field slots, no game-state mutation, status/stamina retention, asymmetric defensive sack totals, tap plus reward overlap, rapid taps, async unlock, cold PCM loading, preview/navigation cancellation, mute/volume and old-to-new native configuration upgrades.
- Syntax and whitespace checks pass. No simulation balance or save format changes. Full regression approval gate remains pending; draft PR only.

This Linux environment cannot compile Swift/install to an iPhone, and Chromium visual checks are blocked by socket creation. Actual audible iPhone playback, silent-switch behavior, external music/PiP mixing and visual layout require device review. No device-audio success is claimed. Verify sound in the rebuilt native app with SFX above zero and master mute off, including initial tap, sheet Close/Confirm, tabs, Settings exit, and background/foreground return. Check bars before a snap and their absence during the play/replay, and the compact Clash info icon.
