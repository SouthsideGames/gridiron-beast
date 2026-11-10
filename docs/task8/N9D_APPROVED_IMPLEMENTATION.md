# Nine approved follow-up groups — N9d

The owner approved all nine recommendations on 2026-11-09. Source and exact rules are recorded in `APPROVAL_REGISTER.md` under N9d. Work remains on `codex/task8-presentation-followup`; main, live and preview are unchanged. Browser verification remains waived.

## Implemented

- **Foresight:** a real saved pre-choice boundary shared by the UI, headless runner and reviewer. Candidate selection reads only the visible base formation, never the chosen assignment/alignment. It uses a separate seeded stream. The snap validates the saved monster's actual participation and blitz assignment; missing target, no blitz or unable source preserves readiness. The current AI policy remains unchanged: no new reaction weights were proposed. The warning persists on the play-call screen, with the eye/marker rendered from the saved record.
- **Prism Break:** removal at that same boundary, from the fixed 12-yard reference. It only considers existing zones and locks once per snap. The real recorded removal drives the rainbow beam/fracture; pending fields survive. Its former inside-snap removal hook is removed.
- **Mastery ladders, Stone Divide and pending cap impacts:** approved gates lifted in ordinary play. Molten Brand and Rubble Reprisal have separate classifications. Reviewer cases are normal acceptance cases, not provisional demonstrations.
- **Tank bruise:** a recipient duration clock, not a status. Two normal turns, pause in reserve, refresh rather than stack, cleared by knockout. Healing factors still multiply and round once; shields and explicit HP transfers retain their rules. The information layer labels the healing reduction and its clock separately from the status badge.
- **Long-battle rules:** the approved current defaults are retained. From exchange 12 damage rises 15 percentage points per exchange to 2.25x for 1–3 per side, or 25 points to 4x for 4–5. From exchange 12, five exchanges without a knockout halves healing/new shields; nine quarters them. An uninterrupted battle can therefore already be at the quarter factor when exchange 12 begins. Cap is 30 exchanges, due impacts first, then HP-share tiebreak/seeded exact-tie coin.
- **Bloom Break and opponent inspect:** existing implementation matches the approved recommendations; no extra mechanic change needed. Saved draw choices fit the shorter goal-line band without rerolling. Opponent details remain observable-only.

## Test and reference integrity

The original `golden-t8.json`, `golden-t8-s1.json`, and `golden-t8-n9c.json` remain unchanged. `golden-t8-n9d.json` explicitly overlays 13 current-rule cases and four S1-state cases, recording previous and new hashes. Inputs and seeds are unchanged. The differences are approved mastery/Stone Divide behavior and the new Tank bruise duration clock; no historical legacy ruleset is modified.

The knockout-order assertion now permits only the new informational `clock_end` for `tank-bruise` after a terminal hit, alongside the pre-existing end/cap messages. It still forbids further gameplay events. Existing turn countdown behavior is preserved.

New tests cover saved-look selection, redraw/audible/reload stability, no game-RNG spending, hidden-call alignment exclusion, fixed Prism targeting, pending/same-snap exclusions, approved Stone Divide classifications, and bruise healing/duration/status coexistence. Existing contract and presentation suites exercise every form/mastery.

The first frozen run passed 1,978/1,978 on `66d8608`, before the additional clock-boundary parity fix. A standalone check then demonstrated a real Watch/Skip difference when runoff ended the half (Prism charges 0 vs 3). The runner now prepares the boundary before runoff/timeout/fourth-down decisions, matching Watch, and an exact whole-state parity test covers it. The second full run passed 1,979/1,979 on `d71cbd1`. A separate readiness check then found that Prism’s no-recharge flag could survive a benched activation play followed by a possession change. Cleanup now occurs before the no-specialist fast path; a focused regression covers it. Final validation follows below. Generated completion accounting is 72/72 football and 72/72 Clash presentations, with all 816 reviewer variants completing. This is code/runtime evidence, not fresh browser verification, physical-mobile performance or final owner visual acceptance. M5/M6 requirements remain separate.


## Final verification

Code tested and saved on GitHub: `c510e25bc0a47167f1634088afa861629110d380` (tree `5fff9662acbe8d114338abbb3c372d4a2bd7841f`). Later handoff changes are documentation only.

- Full repository regression: **1,980/1,980 passed**, no failures, cancellations, skipped tests or TODOs; 424,853.200 ms (about 7.1 minutes). Command: `node --test "tests/**/*.test.js"`.
- Final readiness/ability targeted set: **30/30 passed**. The two added boundary tests are included in the full result.
- Both generated-module and ability-matrix freshness checks pass.
- Beast Dex validator: **28,484 assertions, zero errors**; 192 families, 222 forms, 144 mode abilities.
- Completion: **144/144 implemented and presentation-complete**, no partials or pending ruling paths; **816/816** reviewer variants complete. Owner visual acceptance remains separate.
- Three non-browser speed-smoke runs of 10,000 3v3 Clashes: **3.791 / 3.843 / 3.506 seconds wall**, **4.696 / 4.518 / 3.619 seconds total CPU**. Each has the identical 130,119-exchange checksum. Fifty fixed lineup pairs, 1,000 warm-ups, registered abilities and normal approved rules, AI rotation, logging off. This does not replace the official football scene/FPS/mobile benchmarks.
- Full evidence summary and historical-fixture hashes: [CODEX_N9D_RESULTS.json](verification/CODEX_N9D_RESULTS.json).

No owner decision remains from this nine-item packet. Browser checks were waived. Physical-mobile performance, official finished-visual measurements, final owner visual acceptance and remaining M5–M6 work are not certified by these tests. Main, the live game and the private preview have not been modified.
