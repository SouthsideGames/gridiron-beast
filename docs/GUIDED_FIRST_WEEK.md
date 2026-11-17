# Commissioner guided first week

Implementation branch: `codex/guided-first-week`. Preview version: `v43.20.0-guided-first-week-preview`.

## Player experience

Only newly created franchises enroll, explicitly in onboarding. Existing saves never acquire tutorial state on load. The Commissioner's introduction ends with “Let me show you around.” Nervous Board humor appears in the introduction; lesson instructions use normal language.

Eighteen saved checkpoints cover HQ, inspecting a beast, ratings/Temper/abilities and readiness, a real lineup assignment, staff, the creation draft, Board goals, Monday scouting, Tuesday prospect comparison and recruiting/Clash, Wednesday training, Thursday opponent scouting, Friday both game plans, Saturday media, Sunday football, results, independent team preparation, and graduation. Each offers skip and opt out. A Guidebook retains completed and skipped lessons and acknowledged situation lessons.

Routes and HQ day shortcuts enforce the current task while guidance is active. Inspection and comparison require their actual controls; lineup completion compares the real starting chart before and after a successful change. Daily actions use the franchise calendar, not a “Got It” button. Recruiting never requires signing. A missing prospect or unavailable alternate adapts the relevant lesson. Skipping a daily lesson unlocks navigation but never advances the calendar or simulates a battle: the next checkpoint begins when the normal day completes.

The independent check permits free navigation. Players inspect a beast and either change the starting lineup or explicitly keep it. A completed football game is required for the football milestone; merely advancing past a bye does not count. Normal victories/losses, RNG, costs and injuries remain in force.

Football situation sheets cover the objective, offense, defense, fourth down, kicks, results, and abilities/statuses. They appear at idle boundaries, not during animations. Auto waits on sheets and the advisory play clock pauses. Clash setup explains automatic combat, lineup order, type edges and reserve switching; startup waits on any open lesson sheet. Later help covers injuries, evolution, contracts and the offseason when relevant. The first version's lessons are concise explanations: real-device review must assess how much additional guided interaction the match lessons need.

## Saved data

Optional additive `f.guide` version 1: enabled/done, index, completed/skipped IDs, acknowledged moments, starting season/week, lineup snapshot, evidence and optional skipPending. No schema break. Existing JSON export/import carries it. No global completion flag is inferred and no random draws are consumed.

## Other approved changes

Practice removed from the HQ shortcut grid. Board forecasts shown as whole numbers in goals, history and award explanations; internal precision and firing/goal rules remain unchanged. Board text is shorter; the exact confidence rules remain under How It Works.

## Validation

- 40 targeted tests passed across guide state, Coach Assist, Board balance, central text, style, translation isolation and release stamps before the final adaptive/compact UI refinements.
- After refinements, 20 tests passed: 10 guided-week tests, eight central-text checks, two release-stamp checks. Targeted validation is rerun before committing; consult the PR for the final result.
- New `tools/guided-week-check.py` exercises 320/390/440px layouts, the required route gate, a real lineup assignment, Guidebook, persistence and opt out. `CHROMIUM_PATH` optionally selects a system Chromium.
- Browser execution is blocked in this workspace: Playwright's browser download was invalid; installed Chromium also fails to launch because socket creation is denied. No browser pass or device pass is claimed.
- Full regression has not been run for this draft. Required before approval under `docs/TESTING_POLICY.md`.
- Pending: new browser check, navigation/roster/feature/final-whistle/release/cache checks, full regression, and an actual complete first-week playthrough on iPhone and Android. Existing PR #127 mobile onboarding polish is separate and is not included in this branch.

No merge, deployment or Capacitor build has been performed.
