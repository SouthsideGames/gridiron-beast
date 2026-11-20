# Phone match polish — 43.30.0

## Changes

- Pregame lineup inspection and live football inspection show the current species/form separately from the individual name, followed by position and type.
- Beast Clash setup shows one lineup at a time behind Your Team/Opponent tabs, with a smaller faceoff, compact lineup rows and shorter action buttons. Editing still exposes the available substitutes.
- Live Clash removes the duplicate 3v3 heading, Help and Guide & Notices row. A circular information button in the exchange rectangle opens help and the existing notices with working forwarded controls. The global header Help remains.
- Exchange and lineup panels use rectangles and wrap content instead of inner scroll regions. Five-beast lineups can use additional rows. Arena monster inspection opens a details sheet rather than expanding the live action caption.
- Match More controls use a spaced two-column grid (one column on narrow phones) and a taller sheet body. Existing action forwarding is unchanged.
- Field art and moving actors are clipped to the same camera viewport in initial markup and incremental draws, preventing content outside the SVG view box appearing in portrait letterboxing. Camera movement itself is unchanged.
- Extra-point events retain the kicking side, spot and resolved outcome. The UI plays the existing holder/kicker/ball-flight animation using that outcome; no new gameplay rolls. Two-point attempts and Reduced Motion retain their existing handling.
- Knocked Down / unavailable defenders are excluded from interception and breakup contests, tackling, sacks and fumble recovery. Existing recovery/status duration rules remain unchanged.

## Validation

- 49/49 targeted tests pass: new regressions, pancake/status behavior, live fields and football FX rendering.
- 71/71 engine/rules/pursuit/coverage/QB tests pass.
- Final 20/20 identity/UI reconciliation/central-text/release tests pass (includes the three new regressions).
- All three new regressions fail on the old engine/UI: a downed defender can intercept; extra-point event lacks drawable outcome; field layers have no camera clip. All pass on the branch. The knockdown case compares 35 seeded situations and confirms upright defenders still have real interception opportunities.
- Passing calibration, 24 games per variant, matches the baseline metrics exactly.
- Defense comparison, 120 games per variant: scoring, completion, interceptions, sacks, rushing and target-distribution metrics match baseline. Separation at arrival changes from 4.920 to 4.944 yards with abilities and 4.923 to 4.947 without; downed defenders no longer count in the coverage contest.
- Release stamp and diff checks pass.

No full-suite run is claimed. Because this includes an engine correction, full regression validation is still needed before merge.

## Visual and native review pending

`CHROMIUM_PATH=/usr/bin/chromium python3 tools/live-console-check.py` cannot launch Chromium here: socket() Operation not permitted. No browser or real-device pass is claimed. Review 320/390/440 px, short landscape, Larger Text, Reduced Motion and safe areas; especially setup tabs, 3/5-beast lineup wrapping, info-sheet controls, More sheet spacing, off-camera clipping and made/missed extra-point playback. Extremely short screens and accessibility text may still need layout tuning; do not treat this as a certified no-scroll layout until the phone review passes.

Nothing merged, deployed or installed.

## Merge resolution — November 20

Merged main at `1c1d4c5` (approved UI sounds, PR #143) into this PR branch. The only conflict was generated `index.html`; regenerated it with `tools/stamp-release.mjs` for 43.30.0 and all 480 modules, including `src/audio/ui-sounds.js`. The Clash reward-sound hooks merged automatically and remain alongside the phone UI work. All other sound code and audio assets are retained unchanged from main.

Combined-code targeted validation: 29/29 pass (UI sounds, audio integration, new phone regressions, arena reconciliation, release stamping). No unresolved index entries or whitespace errors. Full regression and real-phone visual checks remain pending as described above. No merge to main or deployment.
