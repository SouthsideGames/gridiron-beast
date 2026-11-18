# Phone navigation polish

Owner-approved scope: items 2, 3, 4, 6, 9, 10 and 11 from the second polish review. Based on main 0c0a894, which includes the validated #132 fixes. Build v43.25.0-phone-navigation.

## Implemented

- Android Back: the existing optional Capacitor App bridge still dispatches to the router's Back, closing the top sheet before popping a screen. The fallback now ignores native events if the bundled bridge has subsequently been installed, preventing two listeners from navigating twice. Failed listener registration can be retried. At a tab root Back keeps the game open. Hardware Back/gesture validation is pending; the website's browser history/back gesture is separate and is not intercepted by this change.
- HQ: the existing main action button is moved into a fixed bottom bar, above the tab bar. It remains one actual button with its existing handler, including guided-week and offseason actions. ResizeObserver measures the real tab and action heights so Larger Text and safe areas do not depend on a fixed guessed size. Lower HQ content has matching reserved space. The GM Career panel already became secondary in #131, and remains available.
- Toasts: FIFO queue, full reading time for every message, manual dismiss, escaped text via textContent, and optional one-shot Undo. Undo is offered for roster depth moves and Best Lineup, not signings/releases. It restores only depth/manual choices and refuses if the roster, game, week, club, other game state, or lineup has changed. Queue and undo callbacks are session-only, not serialized. A stale Undo explains that the team changed.
- Offseason: every step is listed together with Done / To Do: contracts, free agency, draft, staff, Hall of Fame day, roster minimum, legendary limit, legal lineup, season decisions, and career status. Buttons scroll to actual contract/market/draft sections or open the existing management screen. Existing engine gates still decide when an action or next season is legal. Completed steps remain reviewable.
- Tabs: each tab remembers its screen stack, parameters, and scroll during the session. Returning from League to Roster can reopen the same beast. Tapping the active tab returns to its root. Native Back closes dialogs first, then follows that stack. Histories clear when the franchise object or club changes and remain subject to the first-week guide guard. They do not survive a reload and contain no saved gameplay changes.
- Auto speed: saved franchise setting and Settings selector for 1x / 2x / 4x. Legacy game-local speed is the fallback until a preference is chosen. Both the inter-play presentation delay and animation playback use it. Changing speed during an animation preserves its elapsed frames. Skipping an animation finalizes the already-recorded play and avoids immediately scheduling its automatic replay; it never simulates a new play. Play clocks, decisions, results and RNG are not accelerated by this UI setting.
- Monster card: Career stays in the frequent-action row. Release is under a collapsed Manage section, retaining its existing confirmation and rules.

## Validation

Final targeted run: 71/71 passed, 0 failed/canceled/skipped, in 24.52 seconds. See the PR description for the published source commit. tests/phone-navigation.test.js covers per-tab scroll/detail restoration, clearing on club/franchise changes, real-router Back/modal behavior, saved speed and legacy fallback, stale/one-shot lineup Undo, FIFO toast timing, a read-only complete checklist, and actual rendered Manage/HQ markup.

Related existing guide, lineup-gate, final-whistle, text, polish, draft ownership and release-stamp tests are included in the targeted run. All changed JavaScript is syntax checked; Python browser harness compilation and whitespace checks are run.

Actual-tap harness: tools/phone-navigation-check.py, at 320/390/440 px and short landscape. It exercises the pinned action geometry, depth Undo, tab details/scroll, Manage visibility, simulated native Back with an open sheet, speed settings and queued toasts. Browser execution is blocked before page creation by system Chromium socket() failed: Operation not permitted; no browser pass is claimed.

The full regression suite has not been run for this change. Claude's 2,302-test pass belongs to #132's code. Native Android builds, actual Back gestures, iPhone safe areas/keyboard layouts and game playback at 4x remain pending on devices. Nothing has been merged, deployed or installed on the owner's phone.

## Claude testing handoff

Read this document and the PR. Preserve all validated #132 fixes. Play actual new and existing franchises; do not rely only on helper tests.

1. Run tools/phone-navigation-check.py plus the existing navigation, guided-week, trade-desk, final-whistle and franchise-polish checks. Test 320/390/440 px, short landscape, Larger Text and safe-area layouts. Confirm the HQ action remains reachable, never covers tabs/content, and still performs the right tutorial/day action.
2. Test nested-sheet Back and repeated native Back events. Where native tooling is available, build Android with the optional bridge and verify hardware Back/back gestures. Do not claim this from a CustomEvent simulation. Browser history gestures remain outside this implementation.
3. Move among all five tabs, details and nested screens. Restore scroll and parameters; active-tab retap goes home. Check different saves, club changes, missing beasts, archives, guide restrictions and a live game.
4. Queue multiple outcomes and errors, dismiss them, and use Undo once. Repeat a lineup change, advance a day, change a roster, switch saves and try a stale queued Undo. It must never roll back simulation, money, contracts, guide progress or unrelated changes.
5. Complete an actual offseason. See every outstanding step together, use each link and verify the normal engine restrictions still apply. Include expired staff, unfinished free agency, a partial draft, Hall day, short roster, legendary excess, illegal lineup, postseason decisions and career-end/job windows. Verify the checklist itself never changes state or RNG.
6. Test 1x/2x/4x via both match controls and Settings, across a new game and save/reload. Compare identical seeded outcomes/stats/RNG across presentation speeds. Change speed mid-animation, skip live/replay animation, pause/background/resume, and ensure no extra play, dropped decision or clock change. Test Auto Stop at 4x.
7. Open Manage and release/cancel through the normal confirmation. Career must remain outside Manage. Verify no clipping or unintended nested interactive controls.

Fix bugs with meaningful regression coverage, compare unrelated failures with main, and document exact tested commit/counts/duration. Run the full suite once on final code after browser/targeted checks pass, unless the owner waives it. Keep the PR unmerged and undeployed; native checks that cannot run stay explicitly pending.
