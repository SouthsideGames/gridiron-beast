# Task 8 preview, version 2: what differs from the tested commit

- **Tested commit:** 05fcb52 on `task8-implementation`. Full suite 1,147 of 1,147.
- **Preview commit:** 96de08d on `task8-m1-preview`. It merges `task8-implementation` at b3b79fc. b3b79fc changes documents
  only, so its code is exactly 05fcb52.
- **Published build:** "Gridiron Beast Task 8 Preview", version 2, labelled v43.1.0-t8-m3-preview. It was staged from
  96de08d with three packaging edits.

## 1. Runtime changes in the preview commit (not in 05fcb52)

These lines exist only on the preview branch. They were checked with targeted tests and browser checks, not the full suite.

| Change | Files | Effect at runtime |
| --- | --- | --- |
| **Task 8 test tools** (from M1, 59e5f6c): generation sampler, test monsters, level-up, evolution level, banked points, one offseason, Basic prospect, save round-trip, development-record inspector | `src/franchise/t8-dev.js` (new), `src/ui/screens/t8-lab.js` (new), 2 lines in `src/main.js`, 1 button in `src/ui/screens/menu.js` | Registered at startup. The Developer button and the screen appear only when `BUILD.test` is true. Using a tool marks the franchise as developer-assisted. |
| **Developer legendary grant message** (ea66f1d) | `src/ui/screens/menu.js` | The toast says "Legendary Play discovered" only when one was. Text only. |
| **"Transitional" label on legacy signature abilities** (59e5f6c) | `src/ui/screens/dex.js`, `hq.js`, `roster.js` | Shown only while `LEGACY_ABILITY_EFFECTS_TRANSITIONAL` is true. At 05fcb52 it is `false` (M3 retired the legacy effects), so nothing renders. The code is present but inactive. |

No file under `src/sim/`, `src/data/`, `src/clash/` or `src/franchise/` differs from 05fcb52, apart from the new
`src/franchise/t8-dev.js`. The engine, the abilities, generation, the league, free agency, saves and storage are the tested code.

**Verification of these changes:**
- `tests/task8-test-tools.test.js` (preview branch), task8-ability-review and task8-review-scenarios: 23 of 23 on 96de08d.
- Browser checks on the staged build: boot; the Developer menu shows the test tools and the Ability Reviewer; a franchise made
  on the v1 preview continued, played a season and saved. 0 page errors.

## 2. Packaging changes (staging only, not committed)

| Edit | Where | Kind |
| --- | --- | --- |
| `BUILD` set to `{ version: 'v43.1.0-t8-m3-preview', date: '2026-11-08', branch: 'task8-m1-preview', test: true }` | `src/version.js` | The label is packaging. **`test: true` is a runtime switch.** It turns on the existing test-build shortcuts ("Finish this season", "Play 5 seasons") and the Task 8 test tools. Otherwise it changes no rule. |
| Page title "Gridiron Beast Task 8 Preview" | `index.html` | Packaging |
| Restamp for 43.1.0: the `?v=` cache keys and the import map | `index.html` | Packaging. The 96de08d stamp already listed the two test-tool modules. |
| Only `index.html`, `manifest.webmanifest`, `src/**` and `styles/**` are published (289 files). 131 of them changed against version 1. | the artifact | Packaging |

## 3. Saves

- Schema 10 and the storage keys (`gridiron-beast-v6`, the IndexedDB store, `gridiron-beast-dex`) are the same as version 1.
- The artifact origin is the same, so preview franchises carry over.

## 4. Changes after the tested commit (2026-11-08)

- **Beast Dex collection display (owner, 13:29).**
  - The counts are by family: original 72, Basic 120, all 192. An evolved form counts once, as its family.
  - Verified by targeted tests and a browser check only. No full regression was run (owner: not required for this fix).

## 5. Preview versions 3–5 (2026-11-08)

- **Version 3: the Beast Dex family counts.**
  - Branch task8-m1-preview at 327ee1b. It merges 9a2d078 and is labelled v43.1.1-t8-m3-preview.
  - Only the changed files were sent: `src/franchise/franchise.js`, `src/ui/screens/dex.js`, `src/ui/screens/menu.js`,
    `src/version.js` and `index.html`. Every other file stays byte-identical to version 2.
- **Versions 4–5: packaging only.**
  - The artifact service publishes the page wrapped in a default document skeleton. The wrapper adds a white background,
    `color-scheme: light` and safe-area padding on `:root`.
  - The game's own stylesheet overrides the background and colour scheme. It does not override the root padding, which could
    double the top inset on phones with a notch. This was not verified on a device.
  - Version 5 adds one rule to the page head: `:root { padding-top: 0 !important; padding-bottom: 0 !important; }`. The game
    already handles safe areas itself (`--sat`/`--sab` in `styles/app.css`).
  - Checked by serving the published page locally beside the original:
    - same computed background, colour scheme and root padding;
    - screenshots differ only in the animated title area, which differs between two runs of the original too;
    - 0 page errors.
  - This rule exists only in the published page, not in the repository.
- **Browser check of the Dex fix** on the staged build, at phone width:
  - **A carried-over preview franchise.** The menu tile shows 139/192. The Dex screen shows "Original 62/72 · Basic 77/120 ·
    All 139/192", which matches the 139 revealed cells, and the next milestone follows the original tally.
  - **A fresh profile** shows 0/72, 0/120 and 0/192.
  - **The developer "all revealed" view** shows 72/72, 120/120 and 192/192.
  - 0 page errors.

## 6. Preview version 6 (2026-11-08): football reviewer v2

- **Build:** branch task8-m1-preview at dbbeee7, which merges a20aa9a (task8-reviewer-v2), labelled v43.2.0-t8-m3-preview.
- **Files sent:** 10 changed files: the reviewer modules, `src/sim/engine.js` (the review-only `wouldBeInterception` option),
  `src/version.js` and the page. Every other file is unchanged from version 5.
- **Engine change:**
  - The new option is reachable only through the reviewer's private symbol. Normal play is unaffected.
  - Checked by result signatures: 30 games on a20aa9a give the same outcomes as acdc91e.
- **Tests:** the reviewer's targeted tests pass, 51 of 51.
- **Browser check** on the staged build:
  - Sovereign Arm and Blazing Resolve tick all four phases on the first run, and the verdict reads "Validated".
  - The carried-over preview franchise continues.
  - 0 page errors.
- **Saves:** no reset is needed. The save format and storage keys are unchanged.
