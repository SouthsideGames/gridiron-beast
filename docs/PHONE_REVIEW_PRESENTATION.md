# Phone review: pre-game, Beast Clash and draft presentation

Owner-approved batch, November 18, 2026. Football type strengths, type chart, simulation, AI selection, roster and salary rules are unchanged. The two concept layouts are approved; Claude will refine the visuals using existing sprites and the icon pack, then validate on phones/emulated phone sizes. Generated concept creatures are placeholders and are not imported into the game.

## Implemented

- PRV-001: move point-planning controls below the sticky beast navigator so it cannot cover them.
- PRV-002: square 44px info controls; explanation buttons are siblings of small status markers, not oversized children inside them.
- PRV-004: plain-language Clash typing first, exact unchanged numbers under Exact Values.
- PRV-005: grid alignment and separation between staff roster-fit pills.
- PRV-006/007: saved-pick draft viewer, available from Watch Draft. Every successful first-round selection, for every club, has a Commissioner stage/photo presentation with a brief entrance and soft camera effect. Passes show their reasons; later rounds use short announcements. Next Pick, Pause/Resume and Skip to My Turn are available. Owner picks open the presentation starting at the newly committed selection. Reduced Motion/Reduce Flashes are respected.
- PRV-008: replace the inline paragraph/help-button layout with a separate introduction and Help action.
- PRV-009: fixed opaque Game Plan footer directly above the measured tab bar, with bottom scroll clearance.
- PRV-010/011: single full-width pre-game team view, Your Team/Opponent buttons, Offense/Defense/Packages disclosures, square info affordance, row details with boosts, one boost summary and a fixed Beast Clash action. Existing venue, coach dialogue, rivalry and gym information remain available.
- PRV-012: section index in `src/text/en.js`, one contiguous section per feature, all `press.*` dialogue and related Media Day labels grouped under MEDIA. Keys and interpolation variables preserved. Existing wording preserved except the approved Beast Clash/Start Clash labels and the Help reference to Start Clash. New UI strings are central. Existing unrelated hardcoded strings remain in files such as hq.js, clash-battle.js and dom.js; this is not a claim that every historical literal has been migrated.
- PRV-013: larger sprite face-off on Clash setup, aligned entry cards, explicit matchup reference to the opponent's first beast, existing order/change/auto/mode/skip controls retained. No combat or rewards changes.

## Draft safety and persistence

The viewer presents already committed selections. The existing engine still resolves the AI batch between human turns. Presentation cursor metadata lives in `draft.presentation`; moving or skipping it never calls the engine, consumes RNG, assigns a beast or grants rewards. This is a viewing sequence, not a second draft engine. It stops at the next decision requiring the owner. Earlier announcements can be watched again using Watch Draft. Reload preserves the cursor and starts paused. App hiding/native inactive stops autoplay; playback requires a new tap. Stale Next/Skip cursors are rejected. Timers are cancelled on re-render and unmount.

## Deferred

PRV-003, stronger football typing: explicitly on hold while Kareem considers the design. Do not alter football or Clash balance in the visual pass.

## Validation

- Final focused Node run: 72/72 passed, 0 failed/skipped/cancelled, after the button-label and footer-clearance refinements (4.0 seconds).
- Includes central-text keys, placeholders, plurals and usage; wording style; draft ranks; full real drafts with viewer vs no viewer; existing franchise polish, navigation, guided week and unchanged football type tests.
- `node tools/stamp-release.mjs --check`: passed for v43.26.0 (477 modules).
- Browser validation PENDING: Playwright's bundled browser is unavailable; system Chromium crashes before loading the page with `socket() failed: Operation not permitted`. No browser pass is claimed.
- `tools/pregame-draft-check.py` is a new focused browser harness, syntactically checked but not executed successfully here. Claude should run it, fix the harness or implementation if needed, and supplement with guided-week, navigation, coach-editor and franchise-polish checks.
- Full regression suite intentionally not run: owner requested focused validation for this batch.
- Real iPhone/Android review still pending. No native build, merge or deployment done.

## Claude handoff

Refine the visuals against the approved paired concept, using existing art/assets. Preserve actual data and all controls; do not replace real beasts with generated concept art. Validate 320, 390, 440px and short landscape, Larger Text, Reduced Motion and Reduce Flashes. Check both teams, all lineup disclosures, long names, all info buttons, tutorial plus point tools, staff pills, Game Plan footer, encounter/pregame/overtime Clash setup, lineup edits and launch controls. Confirm there are no nested buttons or horizontal overflow.

Play a creation draft and an offseason draft through all rounds with Watch Draft, Pause, Next and Skip; include trades, forfeits/refused AI picks, reload, backgrounding, leaving/returning and quick repeated taps. Verify every successful first-round pick can be viewed, the owner is never auto-picked, ownership/contracts remain correct, and engine results/RNG match the unviewed path. Verify resume begins paused after reload and stale cursor taps do not skip another announcement. Check keyboard/focus/screen-reader labels. Keep all new visible text in the relevant en.js section. Use targeted tests; a full suite is not requested. Fix defects with meaningful regression coverage, update these results, and leave merging/deployment to Kareem.
