# Audio and draft presentation — v43.22.0

Review branch: `codex/audio-draft-polish`. Do not merge or deploy until Claude's validation and the owner's review. Existing phone installations do not change until rebuilt.

## Draft

Prospect cards, scouting reports and pick history show two public consensus rankings:

- `Overall Prospect: #4 of 53` ranks that beast against the whole draft class.
- `Position Rank: #1 of 7 OL` ranks that beast against its position group in the same class.

The counts come from the actual full class (normally 53), including selected beasts. Sorting, filtering, scouting and selections never renumber them. The helper reads only saved public board order and position, never hidden ratings or potential. It breaks malformed legacy rank ties deterministically using stored class order for display, without changing the save or AI logic. Generated classes already have unique board ranks.

Selection order is separate: `Round 1 · Pick 2 Overall` and `Your Turn: Pick 5 Overall`. Pick numbers keep increasing across rounds, including snake rounds and traded selections. History also shows the selected prospect's original ranking so a selection at pick 2 can clearly be prospect 8, for example.

Fixed an additional UI bug: `slice(0, 30)` hid remaining prospects in the active draft. All available prospects now have a selectable card. No generation, scouting, AI evaluation, contracts, cap or trade rules changed.

Removed the two redundant setup paragraphs below difficulty and cornerstone choices. Difficulty still locks and the initial coaching staff is still hired.

## Audio

- Main music begins loading/attempting playback before asynchronous save recovery, instead of waiting for the menu route.
- The first successful entrance fades in over 120 ms; normal scene transitions retain 900 ms crossfades.
- Repeated navigation/gestures can resume an interrupted AudioContext without restarting the same song.
- Supported browsers/WebViews request `navigator.audioSession.type = 'ambient'` before creating/resuming audio or playing media, so the game requests mixing instead of exclusive playback. Unsupported APIs fail safely.
- Autoplay restrictions still apply in ordinary browsers: a first tap may be required. Backgrounding still pauses game audio. Volume and mute preferences remain independent of franchise saves.

The native project is on the owner's Mac, not in this repository. For native iPhone mixing, after copying this branch's code into that local checkout, run from its root:

```sh
node tools/configure-ios-audio.mjs
npx cap sync ios
npx cap open ios
```

The helper changes the standard `ios/App/App/AppDelegate.swift` launch method to configure `AVAudioSession` as `.ambient`, which mixes and respects the silent switch. It preserves other delegate code, makes an exclusive `.before-ambient` backup and is idempotent. It refuses an unrecognized launch method or an existing custom audio category; review those manually. Do not ship the backup as source. This does not create a native project or alter signing/bundle IDs. Run/build in Xcode to install the updated app without uninstalling it.

References: [W3C Audio Session](https://www.w3.org/TR/audio-session/), [Apple ambient audio category](https://developer.apple.com/documentation/avfaudio/avaudiosession/category-swift.struct/ambient). Capacitor already configures its WKWebView for playback without a user-action requirement; no redundant bridge subclass was added.

Actual iOS session behavior, external music/PiP, silent switch and Android audio focus require real-device verification. The JavaScript fallback alone cannot guarantee mixing on a browser/WebView that does not expose Audio Session. Native Swift compilation has not been run here.

## Validation handoff

Targeted checks include generated class uniqueness, full position counts, no hidden rating access, immutable rankings after picks/filter/reload, malformed legacy ranks, real snake rounds/pass/repeat-pick rejection, real creation-draft rendering with more than 30 prospects, startup/crossfade timing, autoplay retry, interruption recovery, ambient API fallback, and the native patcher's safety/idempotence.

Run:

```sh
node --test tests/audio-integration.test.js tests/draft-presentation.test.js tests/ios-audio-config.test.js tests/central-text.test.js tests/text-style.test.js tests/guided-week.test.js tests/release-stamp.test.js
node --test --test-name-pattern='the draft:' tests/franchise.test.js
python3 tools/release-files.py .
```

Full regression and browser/device checks remain pending for Claude. Chromium launch in this workspace aborts with `socket() failed: Operation not permitted`; this is not a passed browser check.

Claude should test new-franchise and offseason drafts at 320/390/440 px, all positions, both sort modes, rank stability through picks/trades/pass/reload, lower-ranked selections beyond the former 30-card limit, cap/roster boundaries, cancelled confirmations, all rounds and advancement out of the draft. Check that labels wrap without horizontal scrolling and selected prospects cannot be selected again. Verify existing saves retain their original class/rank/RNG data. Check audio in actual browser autoplay conditions, not only with autoplay restrictions disabled.

Run the full suite on final code with no other heavy jobs running, report exact counts/duration/commit, and investigate every failure. Do not weaken tests. Keep the PR unmerged and do not publish or rebuild the owner's app without a separate request. State clearly which real-device checks could not be performed.

### Results from implementation

- Targeted command above: **49 tests passed, 0 failed/cancelled/skipped**, 4.98 s.
- Existing franchise draft integration selected by `--test-name-pattern='the draft:'`: **1 test passed**, 46.66 s. It covers season-window scouting, worst-first snake order, rookie contracts, persistent AI rosters and the next season.
- Release stamp: 468 reachable JavaScript modules, check passes in the targeted set.
- Release file discovery: **479 files**, all cross-checks pass.
- Browser checks: attempted, blocked by Chromium's workspace socket restriction before opening a page.
- Full regression, native Swift compile and real iOS/Android playback/mixing tests: pending. No merge, deployment or phone rebuild performed.
