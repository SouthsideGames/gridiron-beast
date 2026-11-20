# Football Auto camera, facing and UI audio

Build: v43.31.0-auto-camera-audio. Based on merged PR #144 (`6030334`).

## Player-visible changes

- Monsters retain their facing while stopped or making tiny lateral corrections. They turn after 0.6 yards of travel in the opposite direction. This is presentation only; recorded positions, pursuit, outcomes and random draws are unchanged.
- Football Auto eases from the normal 46-yard window to the complete field, including both end zones, over 1.8 seconds. The full-field view persists between plays, kickoffs and tries.
- During Auto, **Close View** restores the normal camera and becomes **Full Field** so the player can switch back. Stop Auto restores the normal camera. Starting Auto again defaults to the full field. The camera choice stays with the current match. Replays use their existing close camera, and Reduced Motion changes views immediately.
- Stop, speed and camera controls share a compact row. The existing manual play-selection camera is retained.
- The field's turf, sidelines, markings, zones, ability effects and clipping all use the current camera span. Caller-projected planner overlays are translated into the same camera space.
- UI cues wait for asynchronous audio wake-up rather than being discarded in the next microtask. One action still uses its highest-priority cue. Feedback older than 250 ms is discarded; hiding the app, mute, zero SFX volume and cancellation also suppress pending cues.
- Touch/keyboard gestures wake SFX independently of music. Failed asset decoding can retry later. The approved WAV masters and shared SFX/master gain controls are retained.
- Settings → Sound Effects → Test plays the approved Confirm cue, rather than an oscillator tone. Preview cancellation also stops UI preview audio.
- Informational toasts use Notification, errors use Unavailable, successful confirmations use Confirm, and the existing explicit Reward/Achievement hooks remain in place. Call sites can explicitly suppress a cue.

## Validation

- Final targeted render/audio/UI run: **88/88 passed**, no failures, cancellations or skips. Includes live-console fields, the previous phone match fixes, every ability's renderer smoke check, central text and release stamping.
- Additional affected audio/preview/central-text rerun after moving the new preview error into central text: **46/46 passed**. The final 88-test run also includes independent clips for an Auto field and an overlapping reviewer field.
- New checks cover retained facing during stops/jitter and genuine turns; renderer use of facing; eased camera transitions, reversal, Reduced Motion, a new game's reset, full-field markings/clip and portal effects; asynchronous UI sound wake-up; stale/canceled feedback; all seven approved cues; installed click handlers and live SFX/master settings; approved Settings sample and canceled preview.
- Isolated baseline reproduction: the stopped-monster facing regression and asynchronous audio-wake regression fail against `6030334`; the expanded field and approved-preview checks also fail before this change.
- Broad fast-tier run: **2,064/2,067 passed**, 3 failures, no cancellations/skips, 343.9 seconds. It began before the release stamp and preview fixture were finalized: one test still expected an oscillator SFX preview, and two detected the then-outdated import map. The fixture now checks the approved buffer/SFX gain and both cancellation paths; the release was stamped. All three pass in the affected reruns. This is not represented as a fresh broad pass.
- `node tools/stamp-release.mjs --check` and `git diff --check` pass.
- No simulation rules or save migrations changed, so balance studies were not run.

## Pending before approval

The draft is not an approval to merge. The repository's full-suite gate remains pending.

Browser checks could not launch Chromium in this workspace: the bundled executable was absent, and `/usr/bin/chromium` aborted because `socket()` was denied by the sandbox. No phone-size browser pass or visual inspection is claimed.

The new `tools/auto-camera-audio-check.py` is ready to run on a browser-capable machine at 320×568, 390×844, 440×956 and 568×320. It checks Auto's viewBox transitions and toggle/Stop controls, all-field markings, page width, approved UI BufferSource starts, mute and runtime errors. A source start is not proof of speaker audibility. Also run `tools/live-console-check.py` and the affected navigation checks, including Larger Text and safe areas.

On a real iPhone, review the field's size/readability and transition feel; Auto → Close View → Full Field → Stop; portrait/landscape and Larger Text; the first tap after launch/interruption; Settings SFX Test; ordinary tap/back/confirm, unavailable, notifications and rewards; SFX volume and master mute. Native audio and speaker behavior have not been verified here.

Nothing was merged, deployed or installed by this work.
