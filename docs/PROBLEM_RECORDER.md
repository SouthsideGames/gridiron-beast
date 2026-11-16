# Test Session problem recorder

The recorder is an opt-in local testing tool for franchise play. It ships in the game source so the browser game and a future Capacitor build can share the same recorder. This change does not configure Capacitor or publish a mobile build.

## Using it

1. Open **Developer Tools → Test Session · Problem Recorder**.
2. Tap **Start new test session**, then continue your franchise normally.
3. During a match, tap **⚑** in the top bar to report the last play. Add an optional note about what you expected and what happened. The report stays linked to the play that was current when you opened the sheet, even if auto-play advances.
4. Return to Test Session and tap **Export problem report (.json)**. Attach that JSON file for investigation. Optionally include your current full franchise save if the issue concerns progression or a larger franchise state.
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

Browser execution was blocked in the implementation environment: the bundled Playwright browser was absent, and system Chromium could not launch because UNIX sockets were denied. Do not treat the included browser check as passed. Real Android/iPhone performance and file sharing remain to be verified when Capacitor is configured. The full suite is still required before PR approval under `docs/TESTING_POLICY.md`; this change is submitted as a draft until those checks are complete.
