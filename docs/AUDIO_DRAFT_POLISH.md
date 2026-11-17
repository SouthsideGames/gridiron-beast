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
- Repeated navigation/gestures can resume an interrupted AudioContext without restarting the same song; a song the OS paused during an interruption resumes in place on the next tap.
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

## Validation (Claude, 2026-11-17)

Tested commit: `9fadf11`, which is `b43fd43` plus the fixes below. All browser checks ran in headless Chromium with phone emulation. Nothing was tested on a real device.

### Fixes made during validation

Each fix has a regression test that fails on `b43fd43` and passes on `9fadf11`.

1. **Draft pick list ran together.**
   - The new labels contain "·", so the "Your picks" class line on the draft header and the offseason panel read "Round 2 · Pick 29 Overall Round 3 · Pick 36 Overall · 1202 Round 1 Round 2 Round 3".
   - Each class now has its own line, with commas between picks. "Sent away" uses "Round N".
   - Test: `tests/draft-presentation.test.js`, "the pick list separates each selection and each class".
2. **Music stayed silent after an interruption.**
   - An OS interruption while the page stays visible (a call, Siri) pauses the element and suspends the context. The next tap resumed the context, but the paused element stayed silent. The same thing happens on `main`.
   - The tap now resumes that same element, in the gesture, from where it stopped. An ended song is still left to the loop handler.
   - Test: `tests/audio-integration.test.js`, "a tap after an interruption that paused the current song…". It is also confirmed in the browser check below.
3. **iOS helper could stop older iPhones launching.**
   - The helper added `import AVFAudio`. AVFAudio.framework exists only from iOS 14.5, so the app would fail to launch on older supported iPhones (Capacitor 6 supports iOS 13).
   - It now adds `import AVFoundation`, which provides AVAudioSession on every version.
   - Test: `tests/ios-audio-config.test.js` now requires AVFoundation and forbids AVFAudio.

### Draft playthroughs (by taps)

Each run used one browser session per width. Creation drafts started from onboarding. Offseason drafts loaded a save whose season had just ended, then went by taps through Hall of Fame Day, contracts, all five free-agency periods, the draft and the start of the next season.

| Run | Width | Save | Result |
|---|---|---|---|
| New franchise, forfeit | 320 | new | pass |
| New franchise, trade | 390 | new | pass except the pre-existing AI draftee loss (below) |
| New franchise, trade | 440 | new | pass except the pre-existing AI draftee loss |
| Offseason, forfeit | 390 | PR build | pass except the pre-existing AI draftee loss |
| Offseason, trade | 440 | `main` save | pass |
| Offseason, trade | 320 | v43.16.8 save | pass |
| Creation draft in progress | 440 | v43.12.3 save | pass except the pre-existing AI draftee loss |
| Creation draft in progress | 320 | `main` save | pass |
| Cap and roster limits | 320 / 390 / 440 | PR / v43.16.8 / `main` saves | pass |

Every run checked:

- **Ranks:**
  - The full class has 53 unique overall ranks.
  - Position ranks run 1..k per position, and the counts match the class (QB 4, RB 5, WR 8, TE 4, OL 7, DL 7, LB 5, CB 6, S 5, K 2).
  - Every card, scouting report and history row shows exactly its class ranking.
  - Ranks are identical after picks, all 10 position filters, both sort modes, a trade, a reload and the end of the draft.
- **Hidden information:** unscouted cards show no OVR, and partially scouted cards show no potential.
- **Pick order:**
  - The header reads "Round r · Pick n Overall of 48" and "Your Turn: Pick n Overall".
  - History rows read "Round r · Pick n Overall · Club" with the prospect's ranks below.
  - A drafted prospect's report shows a "Round · Pick Overall · Club" chip.
  - In each full draft, 43 to 48 of the 48 selections had a pick number different from the prospect's rank.
- **Past the old 30-card limit:** every available prospect had a card (42 to 53). The first selection each time was the last card, at list position 42 to 53, with overall rank 53.
- **Cancelled and repeated actions:**
  - Cancel, ✕ and a backdrop tap each left the draft and RNG byte-identical.
  - Two quick taps on Pick never stacked sheets, and a double tap on Draft made exactly one selection.
  - The taken prospect lost its Pick button. An engine re-pick returned "Already taken." and changed nothing.
- **Forfeits:** a cancelled forfeit changed nothing, and a confirmed one was recorded as passed.
- **Trades:** shopping the on-clock pick brought 2 or 3 offers. Accepting one moved the slot, the new holder used it at once, and the ranks were unchanged.
- **Cap limit:** with the cap squeezed through the game's own dead-cap field (as `task7-r7` does), the dear prospect's card showed "Over your cap…". Picking him was refused with the full explanation and nothing changed. A cheaper prospect then drafted.
- **Roster limit:** at 38/38, filled through `signFreeAgent`, the "Roster full" alert showed. A pick was refused, and forfeiting worked.
- **Finishing:**
  - Every round completed.
  - The creation draft returned to HQ, and the guide moved to the goal lesson.
  - The offseason draft returned to the offseason, and Start Season moved to year 2, week 1.
  - Rookies had two-season rookie contracts from the right year, the 70% rookie salary, and `drafted` round and pick recorded.
  - AI selections were on their clubs, before and after a reload.
- **Layout:** no element extended past the screen edge and there was no horizontal scroll, on the board, the filters, the reports, the confirmation, trade and All Picks sheets, and every turn.

### Existing saves

- Saves made by v43.12.3, v43.16.8 and `main` (`e7750be`) were loaded on this build. For each one:
  - the draft class, board ranks, scouting levels, order and RNG state were byte-identical before and after loading;
  - finishing the draft with a fixed owner policy produced identical picks, RNG, roster and club digests on `main` and on this build.
- The saves covered three creation drafts in progress and two season-end saves.

### Audio

Browser check at 390 px. State was read from a console monitor, because Playwright's `evaluate` counts as a user gesture.

| Check | Result |
|---|---|
| Default Chromium policy (gesture required) | The main song is requested at startup and is not audible before a tap. The first tap starts it with an 80 to 121 ms entrance (two runs, sampled every 40 ms). |
| Audio Session | `ambient` is requested before the AudioContext is created. A WebView that throws on it still plays, with no errors. |
| Repeated taps and same-scene navigation | Never restart the song. |
| Scene transition | ~900 ms crossfade into pregame. Back to main, the song continues from its position. |
| Mute and music volume (Settings, by taps) | Toggle and apply to the music bus. Volume persists across reload, separate from the franchise. |
| Backgrounding | Paused and suspended while hidden. Resumes at the same place. |
| Interruption while visible | A tap resumes the same song where it stopped. This failed before fix 2, on this branch and on `main`. |
| No gesture required (stands in for the Capacitor WebView) | Main reached half volume at 1,080 to 1,281 ms after navigation on the final run (960 to 1,320 ms on earlier runs), against 1,282 to 1,680 ms on `main`. Most of the gain comes from the shorter entrance fade. |

**iOS helper review:**
- It is idempotent, makes an exclusive backup and refuses to overwrite an existing backup. It touches only the launch method, and only once.
- It refuses SwiftUI-only apps and any file that already mentions `setCategory(`, even in a comment.
- It works when the launch method follows other `application(...)` methods, and with the older `UIApplicationLaunchOptionsKey` signature.
- The CLI was checked against a scratch `ios/App/App` folder. Swift was not compiled, because no Swift toolchain is available here.

**Pending on real devices:**
- whether external music and PiP keep playing alongside the game;
- the silent switch;
- Android audio focus;
- actual WKWebView behaviour of `navigator.audioSession`;
- a native build with the helper applied.

None of these were tested.

### Policy checks and full suite

- Targeted tests after the fixes: 92/92 pass. The run covered `audio-integration`, `draft-presentation`, `ios-audio-config`, `central-text`, `text-style`, `guided-week`, `release-stamp`, `task7-r7` and `trading-second-pass`.
- `stamp-release --check` passes, and the release file list is 479 files.
- Browser checks passing: navigation, guided-week (320/390/440), coach-editor-mobile.
- Pre-existing failures, identical on `main`:
  - roster-nav: stats differ while browsing;
  - feature-ui: discovery card and legendary-section expectations;
  - league-hub: import notes and the news digest;
  - cache-upgrade: a stale `v42.4.1` pass condition. The new build loads in all three scenarios.
- Full suite on `9fadf11`: **2,272/2,272 pass, 0 fail, 0 cancelled, 0 skipped, 58.7 min** (`node --test "tests/**/*.test.js"`, 20:04–21:03 UTC, nothing else running). Every change after it is documentation only: `git diff 9fadf11 -- src index.html styles` is empty.

### Remaining

- **Pre-existing AI draftee loss, not changed here.**
  - When an AI club with a full 38-monster roster drafts and `joinAsDraftee` cannot make room, the pick is recorded but the prospect joins no club and leaves the league.
  - This affected 17 of 1,800 AI picks across 40 seeded creation drafts, with identical counts on `main`. It appeared in 4 of the browser runs (one pick each).
  - Fixing it changes roster rules and RNG paths, so it should be its own change.
- Real-device audio checks, listed above.
- No merge, deployment or phone rebuild was performed.
