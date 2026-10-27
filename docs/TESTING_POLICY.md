# Gridiron Beast — Testing, Merging and Publishing Policy

This is the standard workflow for every change: test what changed while developing, run the full suite once before approval, and verify (not re-test) after merging and publishing. It cuts repeat full runs without reducing what is tested.

**Never acceptable to save time:**
- weakening an assertion, removing a test or lowering a quality threshold;
- skipping the full suite before approval;
- calling a failure "flaky" without investigating it.

A test that fails intermittently gets made deterministic (see §6), not re-run until it passes.

## 1. The test tiers

All 671 automated tests still run with one command, `npm test`. The tiers are views of that same suite. They are defined in `tools/test-tier.mjs`, which moves no test.

| Tier | Command | What is in it | Size | Time (2-CPU container) |
|---|---|---|---|---|
| **Targeted** | `node --test tests/<file>.test.js …` | The files for the area you changed (§2) | – | seconds to a few minutes |
| **Fast** | `npm run test:fast` | Every test file *not* listed as long-running: unit and small integration tests. New test files land here by default | 53 files, 371 tests | about 4 min |
| **Simulation** | `npm run test:sim` | Whole seasons, careers, leagues, saves over many weeks. Each file takes 10 s or more | 26 files, 300 tests | about 22 min |
| **Full suite** | `npm test` | Fast + Simulation: exactly the whole suite | 79 files, 671 tests | about 26 min |
| **Performance** | `npm run test:perf` | The wall-clock test ("10,000 3v3 battles in under 5 seconds") alone | 1 test | seconds |
| **Browser checks** | `python3 tools/<name>-check.py` | Headless phone-sized Chromium flows and save-compatibility checks (§2) | 31 checks | 1–10 min each |
| **Balance studies** | `node tools/<study>.mjs` | Matched-game comparisons and calibration (not pass/fail tests) | – | 5–20 min each |

`npm run test:tiers` lists each tier's files. If a listed simulation file is renamed or deleted, `tools/test-tier.mjs` refuses to run until the list is updated, so the tiers cannot silently drop a file.

**Concurrency.**
- On this 2-CPU container, Node already runs test files one at a time, so running more in parallel gains nothing.
- On a machine with four or more cores, `node --test --test-concurrency=N` may be used for the **Simulation** tier.
- Never run the **Performance** test, or a full suite you will report, alongside simulation studies, browser checks or other heavy processes. A wall-clock assertion that fails under load is a measurement error, not a result. On 2026-10-27 the performance test failed while three 120-game studies shared the CPU, and passed alone.
- Browser checks each start their own server and browser. Run them one after another.

## 2. Targeted tests by area

Run the tests and checks for every area your change touches. When a change touches the play engine, **always** add `pursuit`, `zone-intel`, `def-fixes`, `qb-read` and `engine`, because those files lock in the play-by-play behaviour.

| Area changed | Unit / integration tests | Browser checks | Studies (gameplay changes only) |
|---|---|---|---|
| Play engine (`src/sim/engine.js`, `qb-read.js`, `rules.js`, `type-matchups.js`) | `engine`, `rules`, `qb-read`, `pursuit`, `zone-intel`, `def-fixes`, `type-matchups`, `abilities`, `legendary-plays`, `attr-trials`, `final-whistle-qb-reads` | `final-whistle-check`, `ai-lab-check` | `passing-calibration` (63–67%), `defense-fix-compare` (120 matched games vs the last release), plus the feature's own study (`pursuit-study`, `zone-study`, `qb-quality-compare`, …) |
| Playbook data | `playbook`, `playbook-reserve`, `legendary-plays` | `def-lab-check` | `passing-calibration` |
| Developer Labs (`src/lab/*`, `attr-lab`, `ai-lab`, `def-overlay`) | `def-scenario`, `attr-trials`, `lab-rotation`, `evo-preview`, `dev-review` | `def-lab-check`, `attr-lab-check`, `ai-lab-check`, `evo-preview-check` | – |
| Franchise flow, seasons, league | `franchise`, `franchise-acceptance`, `league-*`, `lifecycle*`, `board-balance`, `tuesday-companions` | `navigation-check`, `league-hub-check`, `final-whistle-check` | `franchise-soak`, `league-soak`, `lifecycle-soak` |
| Careers, stats, history | `career-*`, `stats`, `stats-filters`, `injury-history`, `league-careers` | `career-ui-check`, `career-profile-check`, `career-presentation-check` | `career-study` |
| Saves, storage, cloud | `save`, `franchise-save-compat`, `storage-*`, `slot*`, `cloud-*`, `uid-isolation` | `storage-check`, `release-check` | `qb-compat-check` / the matching `*-oldbuild-check` against the last release |
| Beast Clash (`src/clash/*`, clash UI) | `tests/clash/*`, `franchise-clash` | `final-whistle-check` (overtime clash) | `clash:balance`, `clash:level1` |
| UI screens and navigation | the screen's own test file, if any | `navigation-check`, `roster-nav-check`, `feature-ui-check`, the screen's own check | – |
| Release stamping (`version.js`, `index.html`) | `release-stamp` | `cache-upgrade-check` | – |

When fixing a specific bug, first add (or tighten) a regression test that fails without the fix, then run that test and the area's targeted set.

## 3. During development

- Run the **targeted** tests for the files and features you are changing (§2). Use `npm run test:fast` as a broad check when a change spans several areas.
- Do **not** re-run the full suite after minor corrections.
- Fix a specific issue with a targeted regression test, and run that test plus the area's set.
- For gameplay changes, the balance studies (§2) are the evidence for review. Run each comparison once on the final engine, and keep its JSON output for the PR.

## 4. Before PR approval

1. Run the **full suite once** (`npm test`) on the final implementation, with nothing else heavy running. Record the exact result: tests, pass, fail, cancelled, skipped, duration.
2. **If a test fails:** investigate it and fix the cause. Then re-run the **affected** test files, not the whole suite.
3. **If later changes touch only test harnesses, browser checks, tools or documentation:** re-run the affected tests and checks, not the whole suite. Confirm `git diff <full-run commit> -- src index.html` is empty and say so in the PR.
4. **If later changes touch gameplay** (anything under `src/`, `index.html` or styles): repeat the full suite before approval.
5. Run the browser checks for the areas touched, and save compatibility against the last release when saves or the engine changed.
6. **The PR description reports:**
   - the full-suite result and the commit it ran on;
   - the targeted re-runs after it;
   - the browser checks;
   - calibration and study tables (gameplay changes);
   - save compatibility.

## 5. After approval: merging

1. Merge the exact approved head (the GitHub merge API with `sha=<approved head>`, so a moved branch cannot slip in).
2. **Verify instead of re-testing:**
   - `git rev-parse <merge>^{tree} <approved head>^{tree}` must print the same tree twice;
   - equivalently, `git diff --stat <approved head> <merge>` must be empty;
   - if they match, the full suite already ran on this code. **Do not run it again.**
3. **Smoke set for the release:**
   - `node --test tests/release-stamp.test.js` plus the feature's own test file(s);
   - `tools/deploy-check.py` on the release folder with two existing franchise saves (§6).
4. **Expand testing** if any of these happen:
   - a merge conflict, or `main` moved after approval (the trees differ): run the targeted sets for every file that differs; run the full suite if the difference touches `src/`;
   - a dependency or tooling change (Node, Playwright, `package.json`): run the full suite;
   - any unexpected difference: stop and investigate before publishing.

## 6. Publishing

Publish with the existing release process to the **existing main game link**. Never create a replacement link, and never touch the separate test link.

1. **Build:**
   - `git archive <merge> | tar -x -C REL`;
   - `python3 tools/release-files.py REL` lists the files the game needs (index.html, statics, and the import closure of every module script index.html loads);
   - copy exactly those into a publish folder.
   - Files left out of a publish stay on the server, so earlier tool-only files such as `src/clash/level1.js` remain as they were.
2. **Before publishing:**
   - every file in the publish folder must be byte-identical to `git show <merge>:<file>`;
   - `src/version.js` must carry the new version with `test: false`;
   - run the deploy check: copy the publish folder with `tools/` added, then `python3 tools/deploy-check.py DIR SAVE` for each of two existing franchise saves. It checks the build label, that an existing save loads after a reload, Main Menu → Developer Tools → AI Testing Lab navigation, a setting surviving a reload, and a live franchise play.
3. **Publish:**
   - read the live files the publish replaces;
   - confirm they are still the previous release (hashes match its release folder);
   - publish with the files map.
4. **After publishing:**
   - the live file list has the expected count;
   - read back the changed files and a sample of unchanged ones, and compare them byte for byte with the publish folder;
   - `src/version.js` shows the new version;
   - the live `index.html` contains the built page unchanged inside the host's standard wrapper.
5. Check save compatibility when the release touches saves or the engine (step 2 already imports two saves).
6. **Do not** re-run the full suite or any simulation study because files were published. Publishing copies verified bytes; the checks above confirm the copy.

## 7. Making intermittent checks deterministic

A check that depends on an uncontrolled random seed (for example `Date.now()`) must pin a reproducible scenario that still exercises the real behaviour.

Example: the AI Lab's held-ball sack check. It loads quick slants against the all-out blitz, with situation seed 3, and replays it with the Lab's own "Same situation" button. It requires exactly one held play that ends in a real sack: 1.45 s, −6 yd, the same on v42.12.0 and v42.13.0.

## 8. Proposed next steps (not yet adopted)

- **Changed-file test selection:** a small script mapping `git diff --name-only main` to the §2 table, printing the targeted command.
- **Splitting the heaviest simulation files:** `franchise`, `career-page`, `league-careers`, `career-timeline`, `league-flows`, `lifecycle` and `lifecycle-flows` take 776 s together.
  - Many of their tests build a multi-season franchise from scratch.
  - A shared, seeded fixture cache (built once per run, deep-copied per test) could cut this substantially without changing any assertion.
  - It needs care, because several tests depend on exact seeds, and it should be its own PR with before/after test counts.
- **Continuous integration** (if added later): run Fast on every push, and Simulation plus the browser checks on PRs. Keep Performance in its own job.
