# Candidate validation

Source commit: `260932b` on `codex/coaching-gm-careers`.
Base: `5bebfff`.
Build: `v43.17.0-coaching-gm-preview`.

## Automated checks

| Check | Result |
|---|---|
| Broad targeted set below | 123 tests: 121 passed, 2 failed; both investigated and corrected |
| Final affected-area rerun (`rules`, `coaching-gm-careers`, `franchise-clash`) | **49 passed, 0 failed**, none skipped/cancelled; 121.744 s |
| Earlier lifecycle/save/compatibility/stats group | 41 tests; the old firing expectation was updated to the approved job-market behavior and subsequently passed in the broader run |
| `central-text` on clean base `5bebfff` | 6 passed, 1 failed (nine existing orphan ability/FX keys) |
| `central-text` on candidate | Same 6 passed, same 1 baseline failure; no new missing/orphan keys |
| Release module stamp | Pass: 459 imported modules mapped to 43.17.0 |
| Release file closure (`python3 tools/release-files.py .`) | Pass: 470 files; no missing game dependency |
| Changed JavaScript syntax/import checks; `git diff --check` | Pass |

The broad targeted command:

```sh
node --test tests/coaching-gm-careers.test.js tests/lifecycle.test.js tests/lifecycle-flows.test.js tests/rules.test.js tests/stats.test.js tests/box-score.test.js tests/franchise-save-compat.test.js tests/save.test.js tests/franchise-acceptance.test.js tests/franchise-clash.test.js tests/partnership-franchise.test.js tests/injury-history.test.js tests/saved-lines.test.js tests/release-stamp.test.js
```

Final affected-area rerun:

```sh
node --test tests/rules.test.js tests/coaching-gm-careers.test.js tests/franchise-clash.test.js
```

The two broad-run defects were:

1. A rotated-out kickoff returner retained a synthetic `KR` slot, so strict canonical-position substitution incorrectly found no replacement and forfeited a healthy club. The returner now comes from the actual healthy rotated chart. The 200-headless-game completion test passes, including assertions that a genuine injury is required for an in-game personnel forfeit.
2. Filtering human choices against the equipped AI plan rejected a legal explicit play in the shared test/Lab runner. Explicit choices now retain their previous behavior when position-legal; injury-invalid choices are replaced with a legal available call. The existing human-choice test and the new injured-package regression both pass.

The final feature file has **15 tests**, including: fixed philosophies; different rotation behavior; next-play override/reload/expiry; injury/exhaustion restrictions; position uniqueness; individual reserve stats; firing and the cap; transactional roster/pick/history ownership; closed windows and archives; career versus club totals; a real two-season move with save/import and former-club continuity; deterministic contact injuries; non-mutating job-market HTML rendering; a real slot-store round trip; and injury-sensitive package availability.

Other regressions found during development and corrected: duplicate inherited display names, missing incoming career backfill (both caused save/import roster drift), missing actual participant metadata on bench inputs, conversion/special-team stat identity paths, stale optional-package selection after an injury, and the obsolete 20-season/automatic-firing-archive test expectations. The old tests were updated to the approved rules, not simply weakened: a forfeit must have a real injury, correct loser/winner and exact 0–21 score; firing must not auto-archive a career with seasons left; explicit historical archives must still be read-only.

## Known baseline failure

`central-text.test.js` fails identically on clean base `5bebfff` and the candidate because these nine old keys have no remaining use:

- `sim.mirrors_s_cut`
- `sim.s_iron_lungs_steady`
- `fx.mirror_step`
- `fx.steadies_nearby_teammates_every_second_qualifyin`
- `fx.protects_nearby_teammates_from_dark_field`
- `fx.night_watch_yd_watching_over`
- `fx.they_ignore_a_dark_fields_awareness`
- `fx.night_watch_yd_no_ally_inside`
- `fx.dark_awareness_protection_inside_s_night`

This failure is recorded, not waived or classified as flaky. It is unrelated to the new feature keys. Old retired penalty log keys were removed with runtime enforcement; saved log lines retain their stored-English fallback.

## Not yet verified

- No full `npm test` run is claimed. Claude must run the policy-required full suite on the final reviewed candidate before approval.
- No interactive browser or physical iPhone/Android walkthrough is claimed. The available remote browser could not reach the local HTTP server; browser access failed before the game loaded. Only module parsing and pure HTML-rendering checks were completed here.
- No 15-season multi-job/firing/return study or rotation/injury balance study is claimed. Those are part of the independent handoff.
- No merge, deployment or main-game-link update occurred. This is a draft implementation for review.
