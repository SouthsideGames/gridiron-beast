# Test Session problem recorder

The recorder is an opt-in local testing tool for franchise play. It ships in the game source so the browser game and a future Capacitor build can share the same recorder. This change does not configure Capacitor or publish a mobile build.

## Using it

1. Open **Developer Tools → Test Session · Problem Recorder**.
2. Tap **Start New Test Session**, then continue your franchise normally.
3. During a match, tap **⚑** in the top bar to report the last play. Add an optional note about what you expected and what happened. The report stays linked to the play that was current when you opened the sheet, even if auto-play advances.
4. Return to Test Session and tap **Export Problem Report (.json)**. Attach that JSON file for investigation. Optionally include your current full franchise save if the issue concerns progression or a larger franchise state.
5. Stop recording when finished. A stopped report can still be exported. Starting a new session replaces the previous report after confirmation; deleting it does not delete the franchise.

Nothing is uploaded automatically. Reports contain device details, game identifiers, recent simulation state, lineups, events, and notes. Typed form fields and credentials are not collected by the action listener. The complete franchise save is included only when its export checkbox is selected. Recent simulation inputs already include the players and game state needed for that play.

## Captured evidence

- Build version/date/branch and device/browser/viewport details.
- Navigation and declared action identifiers; franchise year/week/day, roster size, and game situation at saves.
- Local save outcomes, unexpected JavaScript errors, and unhandled promise rejections.
- Recent human-controlled and AI-simulated game steps, including seed/RNG state, actual calls/options, team inputs, tendencies, situation before/after, result, and simulation events.
- Ability mastery-execution boundaries, accepted/rejected shared-status applications and their reasons, zone creations and placement bounds, and field speed effects when a monster's resolved field lookup changes.
- Manual reports and compact play evidence that survives the rolling recent-play history.

The raw simulation event log also includes status immunity/suppression and other contract events that do not reach the shared-status gate. An execution record is evidence that the contract recorded an execution; it does not by itself prove that the intended mechanic was correct.

## Automatic checks and limits

| Check | Finding |
|---|---|
| Save result reports a failure | Save failure, with error code/message. Normal superseded/read-only outcomes are excluded. |
| Missing/duplicate roster ids or non-finite stored attributes | Invalid roster data |
| Runner returns no event while unfinished, throws, or exposes its guard | Stalled/failed simulation |
| Missing/non-finite game situation/score or simulation yardage | Invalid game value |
| Accepted status does not match the stored status | Status not applied |
| Newly created field has invalid bounds or lifetime | Invalid zone |
| Resolved field speed modifier differs from the applied modifier/effective maximum speed | Field speed not applied |
| A simulation call exceeds 1.5 seconds | Performance review item, not proof of a bug |

Checks do **not** prove every ability's trigger, probability, placement choice, visual presentation, duration, balance, or overall franchise progression is correct. A miss, immunity, same-type neutrality, or an empty zone is not automatically a bug. Use manual notes for visual or rule-specific issues. Beast Clash actions/errors/saves are logged, but detailed Clash turn recording and automatic Clash mechanic checks are outside this first version.

Retains at most 240 event entries, 80 findings, six recent steps, and 180 trace entries per step. Replay inputs above 350,000 JSON characters are explicitly omitted. Stored reports are kept around 1.4 million JSON characters; old replay inputs and then old finding evidence are removed first with omission reasons. These are character limits, not promises about disk bytes. Trace overflow is counted. Findings retain compact evidence; an old flagged play's full replay may no longer be available.

The session persists under a separate localStorage key. Writes are debounced and flushed on page hide/visibility loss; a force-close before a write can lose the most recent data. Storage failures leave the report exportable in memory and show a warning. Same-build sessions resume after reload. A build change stops recording into the old report so it can be exported before a new session starts.

## Replaying a report

Use the report's matching game build, then run:

```sh
node tools/replay-problem-report.mjs /path/to/report.json
node tools/replay-problem-report.mjs /path/to/report.json PLAY_ID
```

The tool reconstructs the human/AI controller rules and replays retained inputs without importing the report as a franchise. It compares the resulting situation, scores, RNG state, result, and yardage. Exit codes: 0 reproduced; 1 missing/invalid inputs or build mismatch; 2 a reproduced run differs. A failed simulation can throw again, which is evidence to investigate. No report-supplied code is executed.

## Validation

Recorder tests cover off/on outcome and full-state parity, replay, live field/ability frame parity, normal status rejection, synthetic missing effects, persistence, build changes, bounded retention, storage failure, crash input retention, manual flags during auto-play, optional save inclusion, and escaped UI notes.

```sh
node --test tests/problem-recorder.test.js tests/task8-fields.test.js tests/task8-field-effects.test.js tests/task8-status-runtime.test.js tests/release-stamp.test.js tests/save.test.js tests/store-save-queue.test.js tests/franchise-save-compat.test.js tests/task8-status.test.js tests/task8-status-effects.test.js tests/task8-ability-gate.test.js
python3 tools/problem-recorder-check.py
```

The browser check exercises a real seeded franchise at a phone viewport: Developer navigation, starting, kickoff capture, flagging, reload, runtime/save findings, JSON downloads with/without the full save, and stopping. `CHROMIUM_EXECUTABLE` optionally selects an installed browser.

### Results (2026-11-16)

**All browser results below are emulated**: headless Chromium (Playwright) with phone-sized viewports (390×844 and 320×568, touch, mobile). No physical iPhone or Android device was used. Real-device performance, file sharing and Capacitor packaging remain unverified.

**Full suite** (`node --test "tests/**/*.test.js"`, the `npm test` command; `npm test` itself exits 216 in this checkout because the tracked `node_modules` symlink points at itself):

| Commit | Tests | Pass | Fail | Cancelled | Skipped | Duration |
|---|---|---|---|---|---|---|
| `035ec3f` | 2,239 | 2,238 | 1 | 0 | 0 | 78.5 min |

The one failure on `035ec3f` was real: `tests/text-style.test.js` ("Title Case on buttons and screen titles") flagged four Test Session titles and dialog buttons. Fixed in `9f66bb2` (Title Case on all Test Session titles and buttons). After the fix, `tests/text-style.test.js` and `tests/problem-recorder.test.js` pass (22/22), and `tools/problem-recorder-check.py` and `tools/navigation-check.py` pass. **The full suite was not repeated on `9f66bb2`**: the owner waived the repeat because the fix only changes label text. This is a deliberate exception to `docs/TESTING_POLICY.md` §4 step 4. `git diff 035ec3f 9f66bb2 -- src index.html` touches only `src/ui/screens/test-session.js` and the ⚑ button's `aria-label` in `src/ui/screens/match.js`.

**`tools/problem-recorder-check.py`**: passes (after a harness fix: it navigated before the app finished starting after the reload). Findings in the export: `player-report`, `runtime-error`, `save-failed`.

**Deeper browser validation** (real seeded franchise, real Sunday match, taps):
- Developer Tools → Test Session starts recording; 22 human snaps all kept replay inputs; retained steps stay bounded at 6.
- Evidence over a game: ability executions, field creation, field speed effects and statuses appear in the trace; no automatic findings during normal play; longest recorded step 29 ms.
- ⚑ with plays advancing under the open sheet (121 → 132): the finding is stored against play 121, the play the sheet named, with its evidence. Auto-play pauses while any sheet is open, so the advance was driven by direct taps.
- A thrown error and an unhandled rejection are recorded; a real IndexedDB quota failure produces a `save-failed` finding and the following save succeeds.
- Recording, recent plays and findings survive a reload, and the franchise resumes.
- Sim to Final captures AI steps; the oldest replays are trimmed with a stated reason (each replay is about 330K characters; total cap 1.4M keeps about 4 of 6).
- `tools/replay-problem-report.mjs` reproduces retained AI plays and retained human plays (exit 0) and exits 1 with the trim reason for trimmed plays.
- Export: `franchiseSave` appears only when the box is ticked, and its uid matches the live franchise; build and device details are included. About 1.42M characters without the save, 3.38M with it.
- Stop adds no further events, plays or findings. Delete removes the report and its storage key; the franchise loads unchanged after a reload.
- Parity in the browser: the same seeded game with the recorder off (twice) and on gives the same RNG state, score, play count, stats, log, field state and roster hashes.
- Layout at 320 and 390 wide: no sideways scroll, the report sheet's Save button is visible while typing. Fixed: the include-save checkbox took the 44 px input height and sat apart from its label (the browser check now asserts the alignment).

**Policy browser checks** (`docs/TESTING_POLICY.md` §2):

| Check | This PR | `main` | Notes |
|---|---|---|---|
| navigation-check | pass | – | |
| final-whistle-check | pass | – | |
| coaching-gm-ui-check | pass | – | |
| deploy-check (release build of the PR) | pass | – | 475 files; three saves load after reload; build label v43.18.0 |
| feature-ui-check | fail | fail, same | pre-existing: Discovery card behind the halftime sheet, legendary cards, playbook section |
| storage-check | fail | fail, same | pre-existing: default v31 fixture is rejected; with a current save both stop on "Changed in Another Tab" |
| release-check | fail | fail, same | pre-existing: the v39 build it upgrades from produces saves the current game rejects by design |
| ai-lab-check | fail | fail, same | pre-existing: "Defenses tested" progress expectations |
| cache-upgrade-check | fail | – | the new build loads in all three scenarios; the pass condition hardcodes `v42.4.1`, so the check is stale. Not changed here |
| roster-nav-check (current save) | intermittent | intermittent | pre-existing on `main` too: browsing changes some monsters' displayed stats |

These failing checks fail identically on `main` and are outside this PR; none was weakened.

**Known limitations**
- A single replay is about 330K characters, close to the 350K per-play limit; a larger play would be kept without replay inputs (with a reason).
- About 4 of the 6 retained plays keep replays under the 1.4M storage cap.
- At 320 px wide the ⚑ button shortens the match title ("NOR 0-0 S…"); the scoreboard still shows the score.
