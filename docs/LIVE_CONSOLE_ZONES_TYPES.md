# Live play console, moving zones and meaningful football types

Implementation is on a draft branch. Browser validation, Node regression, balance simulations and native builds are PENDING. No deployment or phone installation was performed. Previous PR test results do not validate this revision.

## Approved behavior

- Player football ability demonstrations omit the Phases checklist. Developer review keeps its checklist/evidence.
- Live football, watched/replayed Beast Clash and football demonstrations use the available viewport for the field/arena and essential controls. Play choices, zone choices and reference details open in sheets/disclosures. Setup/result pages scroll normally. Expanded details and secondary controls may scroll within their own panel.
- Match Help/Guide is reachable in every phase from the top bar. An interruption's Resume stays visible. Selecting a play does not snap it.
- Sheet copies carry no game-action datasets; they forward to the original control once. Existing tutorial, pause/resume and clock safeguards remain authoritative.

## Persistent terrain

All persistent zones preserve their placement relative to the line and ball spot BETWEEN scrimmage plays, on both teams and in both field directions. They never follow the live carrier. Canonical saved offsets prevent gradual drift when boundary fitting is needed. Size, lane, duration, ownership, strength and removed footprints are retained. At a boundary, terrain shifts inward to stay on the field and returns to its canonical offset when there is room.

Whistle-created terrain anchors at the new spot so it is not advanced twice. The pre-snap picture and authoritative next snap use the same projection.

A possession change clears both teams' existing terrain and queued old terrain before the next scrimmage snap. Returns and replay evidence retain the original play's zones. Interceptions/fumbles/defensive scores are covered, as are possession changes following downs, kicks or scoring. No spent charge, cooldown or readiness is refunded. Fresh abilities can create fresh terrain after the new possession begins.

Legacy zones without saved offsets adopt their current position once; their unsaved original placement cannot be reconstructed. No save migration or random draw is needed.

## Stronger football types

Candidate values: strong +12%, weak -12%, Dragon neutral +2%, environment +2%, combined positive cap14%. The previous football edge was +/-4%. This scales EACH participant's own contest score; it is not a 12% game-win probability or a permanent stat bonus. Opposite modifiers on both sides create a larger relative gap than 12%.

The engine, existing type-aware AI play selection and displayed matchup descriptions read the same shared values. Effects apply to the ACTUAL opposing monsters in blocks/sheds, tackles, sack attempts, route coverage and contested catches. No whole-team aura or guaranteed win is introduced. Beast Clash's chart and damage remain unchanged.

Pregame names expected good/tough matchups. The pre-snap console names matchups with details. A play result can note a recorded type edge; a neutral stadium-only bonus is not labeled a type edge. Forecasts may change with the actual play/coverage and do not reveal hidden enemy assignments. New copy is grouped under playview in src/text/en.js.

The 12% candidate is NOT balance-certified. Measure it before merging.

## Checks completed

The coding executor and browser were unavailable. Nine isolated geometry checks passed using the actual field helper source in the hosted JavaScript runtime, with an injected JSON clone helper. They cover direction, gains/losses, lanes, removed footprints, boundary size/offset recovery, idempotence, reload, turnover clearing, whistle anchors and legacy adoption. This is not a Node/engine suite result.

Changed JavaScript/test/tool sources compiled in a syntax smoke check with module declarations removed. That does not execute modules or resolve imports. The release import map retains 477 existing game modules and all mapped URLs use43.27.0; actual release-stamp/graph checks remain pending.

tests/live-console-fields.test.js adds the nine geometry cases plus two rules/presentation integration cases. Type tests now assert the approved candidate and combined cap, retaining unchanged-Clash checks. These repository tests have NOT run.

## Claude validation handoff

Keep this PR draft and unmerged. Record the exact tested commit and add regression coverage for defects.

1. Run tests/live-console-fields.test.js, tests/football-zone-revisions.test.js, tests/task8-field-effects.test.js, tests/type-matchups.test.js, existing environment/AI/engine/save checks, centralized-text tests and tests/release-stamp.test.js. Complete required broader regression: this batch changes simulation and balance, unlike the earlier UI-only batch.
2. Test all zone abilities, multi-zone/hybrid overlap, Prism removal, normal gains/losses, hashes, both directions, end-zone/sideline fitting, interceptions/fumbles/defensive scores, downs, kicks, halftime, overtime, two-point plays, old saves, reloads, AI fast simulation and reviewer scenarios. Confirm exact durations, cooldowns, charge use, old return/replay pictures and fresh next-possession zones.
3. At320/390/440px, short landscape, Larger Text and device safe areas, tap through football offense/defense/fourth down/kickoffs/tries/Auto/replays and Clash Watch/replays/rotation. The field/arena and essential controls must stay visible together. Check inspections, play selection, multi-zone choices, substitutions, Help/Guide, Skip and interruption Resume. Closing/canceling sheets must not advance a play or duplicate a tutorial action.
4. Check player demos omit Phases; developer diagnostics still update/save reviews. Check long text, each playback speed, effect quality and reduced motion/flash. Improve visuals using existing art/icons within the approved compact layout.
5. Run node tools/type-balance.mjs --games=200 --plays=600 --seed=1. It now compares types-off/no-lean, types-off/lean, previous4% and candidate values with identical league teams/seeds. Also run its environment/Dragon studies. Record equal-rating favorable/neutral/unfavorable outcomes and rating-gap outcomes; exercise gym counter lineups, all-Fire vs Water and mixed rosters. Counters should matter without guaranteeing that a much weaker monster wins. If measurements warrant tuning, update shared values, tests and report together.
6. Compare recorder on/off with identical seeds; verify old-save/RNG behavior and interruption resumes. Native Swift/Gradle builds and real iPhone/Android checks remain pending until devices/tooling are available.
7. Do not change Beast Clash damage/chart, roster rules, zone lifetimes or unrelated abilities to hide failures. Do not merge, deploy or rebuild the phone app during validation.
