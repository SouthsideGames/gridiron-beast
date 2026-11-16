# Candidate validation

Source commit: `088584eaeee730a27e5b02d2daec9b7bfd42e516` on `codex/coaching-gm-careers`.
Base: `5bebfff`.
The uploaded candidate tree was verified byte-for-byte against the locally tested tree (`f6449d98d5bcffee2c3d313f809b5582d75c5486`). Subsequent validation-reference changes affect documentation only.
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

## Independent review (Claude, 2026-11-16)

Reviewed from `685513c`. Defects found by testing and fixed, each with a regression test that fails on `685513c`:

1. **Job window closed by a monster's own refusal.** A renewal the monster refuses to discuss when the offseason opens (`status: 'declined'`, `talks: 'closed'`) counted as an owner decision, so the window closed in many seasons. A dismissed GM in that state had no job, could not stay, and could not act on the offseason (seen at Season 11 of a real career run). Automatic refusals no longer close the window.
2. **Moves after management transactions.** Releasing, signing a free agent, trading, accepting a trade call, extending, or replacing staff after the season left the window open, and a dismissed GM could make all of them before leaving. These now commit the GM to the club (`closeJobWindow`, which now also works for saves without `gmCareer`), and a dismissed GM is refused them. Depth-chart edits do not close the window.
3. **Rotation undid the engine's slot choice.** `selectUnit` started from the stored chart, not from the unit `pickSlots` built, so a Legendary Play could lose its Legendary to fatigue rotation and Ability Review staging lost its subject (`ai-zone-placement` regression). Rotation now starts from the engine's choice and never rests the Legendary of a Legendary Play.
4. **Stale dead money on a return.** Returning to a former club restored its old `deadCap`, `pendingDeadCap` and staff raises, so they would be charged again (and showed in the market preview). They now reset on return.
5. **Raw season numbers on the job market.** Contract ends, draft picks and career club history showed `1`, `2` instead of `1201`, `1202`; a new stint showed `2–1`.

6. **Ability Review clubs rotated and took injuries.** Every built team carries a rotation, including the reviewer's staged clubs, so fatigue rotation rested the staged subject or targets and the reserve pool still held abilities the scenarios strip (~17 reviewer/FX tests: element budgets, scenarios not executing, readiness). Staged review clubs now play their staged units (`rotation: null`).
7. **AI coach philosophy needed season state.** `aiCoach` built a full inherited-staff record (contracts from `f.season.year`, a clone of a former club's saved state) to read one head coach; it crashed on franchises without a season. It now reads `GM.clubStaff`, a read-only staff lookup.

Full-suite on `178b02f` found the last two (2,186/2,216; 30 failures). Comparing the 13 affected files on clean base `5bebfff`, `685513c` and the fix: base 7 failures, `685513c` 56, fix 7 — identical to base.

Tests updated to the approved rule (not weakened): kickoff tests read stat lines through `statKey` (lines are keyed by the monster who played; after a whole game the kickoff count is summed over every line); AI coaches carry a `substitution` philosophy, asserted to be one of the three; the compaction test's lookup also searches the free-agent pools, where an AI club's released winner (Infernox, released to make room for a draftee) keeps his intact season book. `dex-2-integration` treated every non-chart monster as benched. With rotation, a reserve who takes snaps plays and earns its family's knowledge credit; the test now asserts that such reserves have real snaps and earn exactly one credit, and that monsters who never entered still earn none.

Studies on the fixed tree:

| Study | Result |
|---|---|
| 15-season career (seed 37, pro): 9 moves, 6 returns to former clubs, 3 natural firings + 1 forced, rejected and incoming offers | Window opened every season; no duplicate identities, `verifyLeague` clean, uid/history/pick ownership unchanged by moves, save round trip after each move, market closed at 15, Season 16 refused |
| Rotation/injury/forfeit, 120 owner games (one season each) | Reserve snap share: Heavy 10.3%, Balanced 1.9%, Starter-Focused 0.9%. Contact injuries 0.17–0.43 per game (both sides). **0 forfeits**, 0 empty slots |
| Old saves (after Season 1, mid-season, Dex save) | Load, round trip and play on cleanly; mid-season save padded to 17 seasons finishes its season, then cap retirement, no market |
| `tools/coaching-gm-ui-check.py` (new): staff labels, Settings, in-game substitution panel with reload, job market apply/cancel/accept/reload | Pass at 320×568, 390×844, 440×956, 956×440 landscape, reduced motion. Emulated Chromium only |

Notes, not changed: when the GM leaves, the former club's expiring contracts are settled immediately by the AI's simple keep rule (without the AI renewal negotiation other clubs had at season end), so some former-club monsters walk at the move. On a return, the old staff contracts have expired, so all five staff come up for renewal. Balanced and Starter-Focused rotation are close (1.9% vs 0.9% reserve share); tuning is a gameplay call.

## Not yet verified

- No physical iPhone/Android walkthrough is claimed; phone checks above are emulated Chromium.
- The full-suite result for the reviewed candidate is reported with the review, against its exact commit.
- No merge, deployment or main-game-link update occurred. This is a draft implementation for review.
