# Task 8 presentation follow-up — 2026-11-09

> Current N9d follow-up: [N9D_APPROVED_IMPLEMENTATION.md](N9D_APPROVED_IMPLEMENTATION.md). All nine recommendation groups are approved and implemented. The final code passes 1,980/1,980 tests; all 144 presentations and 816 variants are accounted for with no pending ruling gates. Earlier statuses and results below are historical. Browser verification was waived; main/live/preview remain unchanged.


Working branch: `codex/task8-presentation-followup`.

> Follow-up: approved N9c Clash gates are now implemented on this same branch. See
> [CODEX_APPROVED_CLASH_FOLLOWUP.md](CODEX_APPROVED_CLASH_FOLLOWUP.md) for the later changes and validation.
> The browser walkthrough was subsequently waived by the owner. Earlier results below remain historical.

## Source and integration status

The GitHub development head inspected was `bd182de9a9dad7bdf782b9ed987f4f5391a01249`. The completed football
presentation branch `task8-fx-finish-2` at `7998b23a341a4bf9c54fb4fbc75efc282d4f31fd` contains that head;
combining them on this isolated follow-up branch was a clean fast-forward. Main, the existing development branch,
the Clash reconciliation branch and the private preview were not changed.

## Fix: Sovereign Arm return survives a reload

The football branch kept its absence/return tracker only in the match screen's JavaScript memory. After reload,
the screen could no longer identify the just-returning defender once the simulation removed the served absence.

The match now saves a versioned presentation snapshot in `franchise.game.fxAbsence`, outside `game.state`.
It stores monster identifiers, team, ability, served side and the play number on which a return was shown.
It does not store roster copies, frame timestamps, simulation events, RNG or rewards.

On first observation after a reload, the tracker resolves identifiers against the current teams. A still-pending
return is shown on the next eligible formation. A return already started is not replayed after reload, but its
informational chip remains for that play. Other-game, missing-monster, finished-game and unsupported-version
records do not resurrect stale effects. Old preview saves without this optional field remain readable; missing
presentation history cannot reconstruct a return already lost before this fix.

No ability mechanics, absence duration, field rules, balance values or save schema version changed.

## Validation

- Original presentation branch, before this fix: 30/30 targeted tests passed.
- Follow-up: 36/36 targeted tests passed, comprising:
  - `tests/task8-absence-reload.test.js` (six new reload/serialization scenarios);
  - `tests/task8-fx-football-b.test.js`;
  - `tests/task8-fx-render.test.js`.
- `git diff --check`: passed.
- Save compatibility, save round-trip and release-stamp checks: 8/8 passed (`tests/save.test.js`,
  `tests/franchise-save-compat.test.js`, `tests/release-stamp.test.js`).
- Browser check attempted through `tools/fx-finish2-check.mjs`: **not verified** in this environment.
  The bundled Playwright browser was unavailable. Using installed Chromium failed at browser startup because
  the runtime disallowed the process-singleton socket. No successful browser walkthrough is claimed.
- The checker now accepts optional `CHROMIUM_PATH`; its default browser selection is unchanged.
- No full regression, mobile measurement or performance pass is claimed for this follow-up.

## Work deliberately left open

- Do not approve the three latest owner questions by implication: Bloom Break boundary behavior, opponent inspect
  information policy and player-facing mechanic text. Preserve current behavior until a ruling is recorded.
- Foresight and Prism Break remain partial pending the proposals/rulings described in `PROPOSALS_N9C_FOOTBALL.md`.
- Do not regenerate outcome references to hide Bloom Break's ruled change. Preserve the old reference and record
  the specific approved difference before creating a replacement baseline.
- The separately reported 1,977/1,977 milestone result belongs to `4e41043`, not this branch.
- At the original presentation checkpoint the later Clash reconciliation had not been checked. The subsequent follow-up verified that `task8-m4-reconcile` at `30689c7` is already an ancestor of this branch; no independent work was overwritten.

## Next integration check

Browser-check reload while a defender is absent, reload while his return waits through a possession change,
and reload after his return starts. Then combine the football and latest Clash work on a development branch,
run the affected tests and the planned final milestone checks. Do not publish this branch automatically.
