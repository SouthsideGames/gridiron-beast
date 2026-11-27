# Final regression report

Owner brief: "Final Merge, Achievement Calibration and Mobile Update". Date: 2026-11-27.

**Build under test:** v43.51.1-playtest. It is on the main game link as artifact version 153.

**Exact commits tested:**
- Full fast suite: main `e20d277`. This is v43.51.0 plus its manifest record, after #191 and #192.
- Full simulation suite: `325ba16`, the first regression-fix commit.
- Affected-suite reruns: `7c2934c`, the final fix head. Its content is identical to main `325ca61`.
- Release, deploy and phone checks: main `6445c82`, the v43.51.1 version stamp.

## 1. Executive summary

**Merges.**
- The balance audit is closed. #191 and #192 are on main.

**Achievements.**
- The 200-achievement catalogue is calibrated on the merged balance: 22 targets set from measured distributions, and one rule fixed.

**Builds.**
- v43.51.0-playtest was published first (artifact version 152).
- The full regression run then found five failures: four in the fast suite and one in the simulation suite.
  - Two are genuine defects introduced by #191:
    - a pre-snap look drawn on the wrong side;
    - older saves losing AI-club beasts when their universe was captured.
  - Three are outdated test expectations from the approved balance and achievement rules.
- All five are fixed in PR #195 (merged with the owner's approval) and shipped as **v43.51.1-playtest** (artifact version 153).

**Checks on v43.51.1.**
- Deploy check passed.
- The emulated phone smoke check passed.
- Every affected suite passes on the fix head.

**Still open.**
- There are no owner playtest reports yet.
- Roster depth is a deferred enhancement (backlog item 20), not a blocker.

**Recommendation: Ready with known non-blocking limitations** (section 9).

## 2. Merge summary

| Step | PR | Merge commit | Merged (UTC) |
|---|---|---|---|
| Balance audit implementation, closed with owner decisions | #191 | `eff67df` | 2026-11-27 04:46 |
| Achievement overhaul, calibrated on the merged balance | #192 | `bf6c5e6` | 06:12 |
| Release v43.51.0-playtest version stamp (the combined main commit published first) | #193 | `81ada10` | 06:13 |
| Record v43.51.0 manifest (artifact version 152) | #194 | `e20d277` | 06:16 |
| **Regression fixes** from the comprehensive run (owner: "Please merge") | #195 | `325ca61` | 11:15 |
| Release v43.51.1-playtest version stamp | #196 | `6445c82` | 11:16 |
| Record v43.51.1 manifest (artifact version 153) | #197 | `afae4e2` | after publish |

**#192 was updated against main before it merged.**
- Main was merged into the branch.
- The one GDD conflict was resolved by keeping §61 (balance) and then §62 (achievements).
- The calibration then ran on that merged code.

**Regression-fix commits in #195:**
- `325ba16`: formation fix; D-5 golden change layer; kicker and evolution fixtures.
- `72f0080`: F-01 founding-only cap trim; new founding test.
- `7c2934c`: realistic pre-cap migration fixture; F-01 test on the engine's own cap rule; soak invariant uses the franchise's cap.

## 3. Achievement calibration summary

Full report: `reports/achievement-audit/FINAL_ACHIEVEMENT_CALIBRATION.md`. It contains the 200-row table, the data and the screenshots.

**Catalogue design preserved.**
- 200 achievements.
- Rarity totals of 50 / 45 / 45 / 35 / 20 / 5 are unchanged.
- The 24 original ids, earned records and cutscenes are unchanged.
- No achievement changed category or rarity.
- Earned achievements are never removed: new targets apply to unlocks still to come.

**How the calibration was measured.**
- Six 15-season careers through the production lifecycle (Rookie, Pro and All-Star, two seeds each), giving 653 box scores and 45 seasons.
- Plus a positive and a negative scenario for each of the 137 metrics.

**What changed.**
- 22 thresholds were adjusted. Examples:
  - Aerial Assault: 450 → 500 passing yards.
  - Siege: 7 → 4 team sacks; 7 never happened in 653 games.
  - Clash Legend: 250 → 150 wins; 250 could not be reached in a career.
  - Recruiter and Talent Magnet: 10 → 5.
  - Nemesis: 10 → 20.
  - One-Club Beast: 10 → 12 seasons.
- Record Breaker now needs a record broken after year one.
- Drafted a Winner needs three awards won by your draftees.
- Two renames: "Four on the Board" and "Sack Specialist".
- All provisional flags were removed.
- Achievement text now uses beast terminology ("Most Valuable Beast award", "Beast Hall of Fame").

**Validation.**
- Targeted validation: 20 files, 146 / 146 passing.
- Emulated phone check of the catalogue, toasts and reveals passed.
- Achievement tests also run in the full fast suite (section 5).

## 4. Mobile build

| Item | Result |
|---|---|
| Version | **v43.51.1-playtest · 2026-11-27**. It replaced v43.51.0-playtest (version 152), published earlier the same day. |
| Source commit | `6445c82` on main (release stamp after the #195 fixes) |
| Workflow | The existing release workflow (docs/TESTING_POLICY.md §6), in order:<br>• archive the merge commit<br>• build the release file list<br>• check bytes against the commit<br>• run the deploy check<br>• confirm the live files match the recorded manifest<br>• publish only the changed files<br>• verify the live files<br>• record the manifest through a PR |
| Status | **Published** to the main game link, artifact version 153. This is a playtest build for the owner's hands-on testing, not a public release. |
| File count | **512** published files: release list OK, and the live listing shows 512.<br>Changed against v43.51.0: `index.html`, `src/data/playbook.js`, `src/franchise/franchise.js`, `src/version.js`.<br>Live bytes of the changed files and `src/main.js` were compared after publishing and match the build. |
| Install status | Published and verified live. The owner's physical phone is **not confirmed** updated. To update, the owner fully closes and reopens the game, and the menu label should then read v43.51.1-playtest. |
| Save compatibility (deploy check) | • 32-club week-6 save loads after reload.<br>• 32-club playoffs save loads.<br>• A 1.8 M-cap-era legacy save (Pro career, season 4) loads.<br>• The old 16-club save is refused and left unchanged on the device.<br>• Settings survive a reload.<br>• A live game with a replay runs.<br>Result: **DEPLOY CHECK PASSED**, 27 checks, no problems or errors (`deploy-check-v43.51.1.log`). |
| Smoke results (emulated iPhone 14) | v43.51.0: 11 / 11 (`smoke/`).<br>v43.51.1: **11 / 11** (`smoke-v43.51.1/`).<br>Steps:<br>• launch<br>• build label<br>• 200-achievement catalogue<br>• load an existing franchise after reload<br>• HQ<br>• roster<br>• beast page<br>• save and reopen<br>• new franchise by onboarding taps<br>• new franchise on the new cap<br>• no page errors |
| Known mobile limitations | • Every phone check here is **emulated** (Playwright iPhone 14 profile), not a physical device.<br>• Three older browser walkthrough scripts are out of date with the current onboarding flow and the Apex scene (section 6, E-1); `phone-smoke-check.py` replaces them for this release.<br>• Audio and haptics were not judged by ear or hand. |

## 5. Regression results

| Suite | Tests executed | Passed | Failed | Status |
|---|---|---|---|---|
| Fast suite (`npm run test:fast`), main `e20d277` | 2,309 | 2,305 | 4 | Fixed: D-1, O-1, O-2, O-3 |
| Simulation suite (`npm run test:sim`, 31 files in 3 chunks), `325ba16` | 310 | 309 | 1 | Fixed: D-2 |
| Clash performance, `engine.test.js` performance tests | 1 | 1 | 0 | Pass |
| Targeted fix validation (17 files: formations, Clash golden, AI signatures, field effects, evolution), `325ba16` | 165 | 165 | 0 | Pass |
| League registry after D-2 fix, `7c2934c` | 9 | 9 | 0 | Pass |
| Affected-suite rerun (12 files: league registry, careers, league flows and season, trading, save compatibility ×2, floor and lineup gate, cap transition, Hall of Fame day), `7c2934c` | FIX3_TOTAL | FIX3_PASS | FIX3_FAIL | FIX3_STATUS |
| Achievements, targeted (20 files), PR #192 head | 146 | 146 | 0 | Pass |
| Save compatibility (deploy check: 3 saves load, 1 old save refused), `6445c82` | 27 checks | 27 | 0 | Pass |
| Published-file validation (release list, byte check against the commit, live listing, live hashes), `6445c82` | 512 files | 512 | 0 | Pass |
| Build and release (version stamp `--check`, deploy check, manifest record #197) | 3 | 3 | 0 | Pass |
| Emulated phone smoke, v43.51.1 | 11 | 11 | 0 | Pass |

**Coverage by area named in the brief:**
- **Clash:** the golden t8 seeds, abilities, Clash–franchise link and performance are in the fast and simulation tiers.
- **Football:** playbook, formations, AI signatures, special teams and field effects are in the fast tier and the targeted rerun.
- **Economy and cap:** F-01 founding, cap transition, contracts, trading, the league soak invariant, and the floor and lineup gate are in the simulation tier and the rerun.

**Full-suite runs.**
- The full fast suite was not rerun after the fixes; it takes about 98 minutes here.
- Instead, every file a fix touched, and every file that exercises the changed functions, was rerun on the final fix head (the rows above).
- The fixes change two code paths:
  - two formation entries in the playbook;
  - one founding-only branch in `ensureLeague`.
- The rest of the fixes are tests and tools.

## 6. Defects and corrections

Each failure was triaged on three worktrees: main before #191, after #191, and after #192. None failed before the merges.

| ID | Failure | Affected system | Classification | Cause | Correction | Verified |
|---|---|---|---|---|---|---|
| D-1 | `fx-render` I2: the pre-snap look showed the tight end and jet slot on the wrong side for Power Left and Jet Sweep | Football presentation (play art, Cerebrix and Prism pre-choice look) | **Genuine defect** (#191) | Both plays overrode their formation's alignment, so the formation and the drawn look disagreed | Power Left uses `tight_i_lt`; Jet Sweep uses a new reserve formation `gun_trips_jet` matching its approved alignment. Positions and assignments are unchanged, and Power Left and Right are not retuned. | Targeted 165 / 165; shipped in v43.51.1 |
| D-2 | Simulation: the v40 migration test expected 38 beasts and got 35 | Saves and league universe | **Genuine defect** (#191) | F-01 cap-aware founding also trimmed AI rosters when an older save's universe was captured mid-season | The cap trim now applies only when a universe is founded. The test fixture became a realistic pre-cap save, and it accepts a rename forced by the save's own name book. A new test checks that founding stays within the engine's cap rule. | League registry 9 / 9; affected rerun; deploy check with the legacy save |
| O-1 | Clash golden t8 seed 17 no longer replays | Clash determinism | **Outdated expectation** | That battle is a Cerebrix battle, which the approved D-5 Foresight rule changes | Explicit change layer `golden-t8-d5.json`. It checks the prepare-and-attack in the same exchange; the other 19 seeds are unchanged. | Targeted 165 / 165 |
| O-2 | `task8-ai-signatures`: desperation field goal | Football AI | **Outdated expectation** | The fixture had no real kicker, but the approved A-3 rule needs an available kicker | The fixture has a kicker; a new no-kicker → "go" case was added | Targeted |
| O-3 | `evolution-overhaul`: "the rest of the franchise is untouched" | Evolution and achievements | **Outdated expectation** (#192) | The achievement tracker now records evolutions, as designed | The test allows exactly that record: evolution count +1 and only `ev_*` achievements | Targeted |
| E-1 | `tests/ui/responsive.py`, `tools/ui-walkthrough.py`, `tools/roster-nav-check.py` stop early | Test tooling | **Environment / outdated script** | The scripts predate the current onboarding (coach editor step) and the Apex scene; `ui-walkthrough` fails the same way on v43.48.0 | Replaced for this release by `tools/phone-smoke-check.py`. Updating the old scripts is left as tooling work. | Smoke 11 / 11 on v43.51.0 |

**Scope of the corrections.**
- They are isolated to two commits of code plus test fixtures, all in PR #195.
- No test was weakened or removed.
- Each changed expectation names the approved rule it follows.
- No balance decision was reopened.

## 7. Owner playtesting

**Builds available.**
- v43.51.0-playtest (version 152) was available from 06:16 UTC.
- It was replaced by v43.51.1-playtest (version 153) after the fixes.

**Issue log.**
- `reports/release-validation/PLAYTEST_ISSUE_LOG.md` records each report with: ID, description, reproduction steps, affected system, severity, build, status and resolution.
- **No owner reports have been received yet.**
- D-1 was found by the regression run, not by playtesting. Anyone who saw the wrong-side pre-snap look on Power Left or Jet Sweep in v43.51.0 should not see it in v43.51.1.

**Triage policy.**
- Confirmed defects come before subjective balance preferences.
- A single unusual simulation result does not change the game by itself.
- Polish requests go on a separate branch and are logged.

## 8. Future development backlog

**Roster Depth and Rotation Effectiveness** (`BACKLOG.md` item 20) is a deferred enhancement and **not a release blocker**. The production rules are unchanged:
- weekly recovery 28;
- full starting stamina;
- injury odds;
- Durability weights;
- rotation thresholds;
- fatigue gain;
- bench ratings.

**Findings to carry forward:**
- On the same payroll, a thin-bench roster beats a balanced one by about 2.5–3.5 wins a season.
- Reserves play about 3.3% of snaps under balanced rotation.
- Heavy rotation raises reserve snaps to about 11% but costs 1–3 wins.
- Neither lowering recovery nor linking weekly fatigue to starting stamina made depth meaningfully more valuable.

**Next to investigate:**
- substitution thresholds;
- in-game stamina use;
- how well rotation works;
- how roster building values reserves.

The tools are in `tools/balance-audit/`.

## 9. Final release recommendation

**Ready with known non-blocking limitations.**

**What supports it:**
- Every failure from the comprehensive run is explained, fixed or classified, and re-verified.
- The two genuine defects are fixed in the published playtest build.
- Saves from the current and previous cap eras load.
- The published build is exactly the 512 files of main `6445c82`.

**Known non-blocking limitations:**
1. The full fast suite was not rerun end to end after the fixes. All affected files were rerun on the fix head.
2. Phone checks are emulated. The owner's physical phone update is not confirmed.
3. There is no owner playtest feedback yet.
4. Three old browser walkthrough scripts are out of date (E-1).
5. Achievement pacing is validated by a hands-off simulated owner and scenarios, not by a human career.
6. Roster depth is deferred (section 8).

Final public release approval remains with the owner. This build is a playtest publish only.
