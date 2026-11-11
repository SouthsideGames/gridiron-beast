# Task 8 main integration verification — 2026-11-11

Build: **v43.6.0-task8-review**, owner-review build, BUILD.test=false / BUILD.release=false. Both ability reviewers remain available. The owner authorized merge before phone/visual review. That authorization does not turn unverified measurements into passes.

## Implementation

[Owner adoption record](OWNER_ADOPTION_2026-11-11.md) specifies the approved rules. Runtime was committed locally at 2af2d96. Subsequent changes are tests, fixtures, tools and documentation only; `git diff 2af2d96 -- src index.html styles` is empty.

## Checks

| Check | Result | Limit |
| --- | --- | --- |
| Full regression on final runtime | 2,019 tests: 2,017 passed, 2 failed, zero skipped/cancelled; 533.3 seconds | Both failures were fixed-seed trade scenario construction, investigated below |
| Complete affected trade file after fixture repair | 13/13 pass, zero failures/skips/cancellations | No gameplay assertion or trade threshold weakened |
| Final release/new-rule smoke | 15/15 pass | Awards, concealment, reload-safe mastery cap, Foresight and pancake formulas |
| Deterministic football replay | 100/100 full comparisons match | Final adopted runtime; identical inputs, not comparison against old balance rules |
| Deterministic Clash replay | 100/100 full comparisons match | Not a browser reload or physical phone test |
| Dex regeneration and release stamp | Pass | Generated data authoritative; 409 mapped modules |
| Release inventory | 416 required files; no removals from prior release | Prior live manifest is deliberately unchanged until actual publication |
| Release scanner self-check | 21/21 pass | Includes wildcard-comment and nested-comment-marker regressions |
| Browser deploy check | Blocked before browser launch: pinned Chromium executable absent | No browser/frame or phone pass claimed |

The two trade fixtures pass on the exact pre-adoption c7fc56b branch, but the adopted development/balance rules change the played seeded league so its search cannot construct every prerequisite. The fixture now freezes that original valid league (runFranchise seed 52, one season, c7fc56b; gzip/base64 JSON). Tests still recompute and assert every prerequisite, fair payment, one-sale window, negative replacement case and final registry using the current production trade functions. No trade code changed. The full 13-test file then passed. Per testing policy, only the affected file was rerun after a fixture-only change.

## Controlled Apex check on the adopted production functions

1,000 paired individuals per schedule; all ten positions; neutral grades, guaranteed activity participation, no injuries and equal investment. End-of-playing-season readings occur **before** that season's offseason. The production reward functions apply ×2 and 42; the harness adds no extra awards or measurement switch.

| Schedule | All-99 by season 15 | Median finish | Range |
| --- | --- | --- | --- |
| Football only, 9 games/year | 1,000/1,000 | 13 | 12–13 |
| Mixed, 9 games + 4 Clashes/year | 1,000/1,000 | 12 | 12 |
| Human maximum, 12 games + 33 Clashes/year | 1,000/1,000 | 9 | 9 |

This confirms the previously estimated faster human path **in controlled conditions**, not human play with missed activities/injuries. The historical 96/96 AI sustained-starter result is retained separately; its early 10% Apex sampling and imposed Clash lineups are limitations of that study. Stronger-Apex league accumulation at the production 1% rate remains a follow-up balance question; the rate has not been reduced.

## Matched gameplay study

120 seeded matchups per variant on pre-adoption c7fc56b and final runtime (240 games/build across abilities on/off). With abilities on: completion 56.7% → 56.8%, sacks/dropbacks 2.0% → 2.0%, yards/carry 6.65 → 6.41, points/team-game 13.8 → 13.7. This is descriptive comparison, not outcome identity: pancake/Foresight tuning intentionally changes some plays. The separate 24-game calibration reports 54.7% completion with abilities on. The historic 63–67% completion target is **not met** on this Dex cohort, and was already below that band in the pre-adoption comparison; no unrelated passing retuning was introduced to force it to pass.

## Remaining owner review / acceptance

- Actual iPhone 17 Pro Max frame pacing, heat, controls, layout and live Auto/save.
- Ability appearance and wording: owner marks Good / Needs work and notes in football and Clash Ability Reviewers, then sends feedback.
- Provisional CPU measurements and unresolved ability overhead (especially A1/X1); no gate or noise rule weakened.
- Slow/rare mastery outliers, broader mixed-mode starter sample, stronger-Apex accumulation and final balance follow-up.
- Claude artifact publication to the exact existing main link. This environment has no authenticated publisher for that artifact. A GitHub merge is not a deployment. Never substitute a new game URL or mark old artifact bytes current.

Raw evidence: `final-checks/`, `final-controlled-careers.json`, `final-gameplay-replay.json`, `final-gameplay-comparison.json`, `pre-adoption-gameplay-comparison.json`, `final-passing-calibration.json`. The historical report-only alternatives harnesses should be run from their pinned pre-adoption commits; the new final-careers harness runs adopted production awards without double application.
