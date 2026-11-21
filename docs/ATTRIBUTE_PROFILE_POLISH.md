# Training planner and beast profile polish

Build: v43.33.0-attribute-profiles. Based on main `245be90` after the owner's merge of PR #146.

## Changes

- Planned attribute rows have a yellow border and the preview value is yellow. This also identifies a selected partial investment that has not yet raised the numeric rating.
- Undo Last, the centered investment count, and Confirm Spending share a sticky three-column footer. Empty plans disable Undo and Confirm. The count uses singular/plural wording.
- Confirm Spending opens a second confirmation explaining that the points are spent permanently and cannot be undone. Cancel preserves the plan and beast. Repeated taps cannot open competing confirmations or commit twice. The existing commit API still validates the displayed preview against current franchise/beast state; closed planners, switched franchises, frozen points and stale previews cannot commit.
- Quick ratings show up to four actual named attributes, ranked by existing POSITION_WEIGHTS. Kickers show only Kicking and Awareness. All twelve attributes remain available in the disclosure. The summary cards form a clean two-column grid without separate injected info buttons.
- Removed the current-rating/training-limit/temporary-change explanatory line. The footer now retains only the ×2/÷2 explanation and instruction to tap an attribute name. The quick-rating introduction is shortened.
- Record labels are Longest FG, Passes Deflected and Receiving Yards. The pass-deflection career summary uses the same central wording. Stat IDs and calculations are unchanged.
- Removed the redundant info button beside Active in career headers by removing the duplicate tooltip source; the club/status detail remains printed below.
- The existing career-entry cry path is retained and made explicitly testable. It plays on navigation into a profile, including an opponent opened from Records, and stays silent on same-profile tab redraws. It respects master mute and the separate Monster cries slider. Audio source tests cover real synthesized cry data and bus routing, but do not establish speaker audibility.

## Validation

Final targeted command:

```
node --test tests/attribute-profile-polish.test.js tests/franchise-polish.test.js tests/audio-integration.test.js tests/monster-cries.test.js tests/central-text.test.js tests/release-stamp.test.js tests/task9-history-screens.test.js tests/task9-career-profiles.test.js tests/text-style.test.js tests/text-never-decides.test.js
```

73/73 passed; 0 failures, cancellations or skips; 28.6 seconds. Includes permanent-spending confirmation/cancel/double-tap/stale-plan checks, all ten positions, records, own/opponent cry identity, actual cry source starts with mute/volume controls, central wording, release stamping, and the English/pseudo-language season and 120-battle comparison. The added AudioNode fixture was corrected to return the destination node from connect(), matching the actual API, before its passing rerun.

Syntax checks, release-stamp check and git diff whitespace check pass. No spending formula, attribute weight, simulation rule or save format changed. No full suite or balance study was run.

Browser/real-device review remains pending. Chromium in this environment is blocked by socket permissions; no browser visual pass or iPhone playback claim is made. Review narrow portrait, short landscape, Larger Text, footer button wrapping, planned yellow values, cancel/confirm and cries on profile entry (including after backgrounding). The repository full-suite approval gate remains pending. Nothing merged, deployed or installed by this work.
