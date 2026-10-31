# Task 6 Phase A-2 — Implementation Report (2026-10-31)

**Authorisation and status.**
- Authorised by the owner on 2026-10-31 under feature-complete development, with lightweight checks and no repeated full suite or multi-season benchmark.
- **Not merged, not published.** The development preview is built but waits for the owner's approval.
- Phase B has not begun.
- The A-1 ageing and retirement mechanics are unchanged.
- The Rookie and Pro difficulty drift stays documented, unresolved and binding for the integrated A-2/B milestone.

## 1. What changed
| Item | Change | Files |
|---|---|---|
| **D9: draft-class scaling** | Class quality rises by `round(0.5 × (year − 1))`, capped at +10. Potential (quality + 6…19) rises with it. The gem / solid / project mix and every random draw are unchanged. The owner and the AI draft from the same classes | `src/franchise/draft.js` |
| **D10a: gym growth plateau** | Gym anchors grow +1.5 a season through season 10, then +0.5 (the ordinary rate). Unchanged: tier offsets, legendaries, coaching, studied tape | `src/data/gyms.js` (`gymGrowth`), `src/franchise/franchise.js` (`clubQuality`) |
| **D10b: ordinary bands** | New constants `ORDINARY_SLOW_BAND` and `ORDINARY_RUNAWAY_BAND`, separate from the gyms' `BAND` and the rival's `RIVAL_BAND`. The lift is unchanged. **Both stay at today's +4** (see §3) | `src/franchise/league-season.js` |
| **Nudge recalibration (checkpoint 1)** | Measured; no constant changed (see §4) | — |
| **Tests** | `tests/task6-a2-balance.test.js` (3 tests): scaling, cap, determinism and mix; the plateau; the bands | |
| **Tools** | `tools/task6-a2-variant-compare.mjs` | |

**Commits:**
- Branch `task6-phase-a2`, stacked on `task6-phase-a1`.
- Implementation commit **`4c76751`**.
- Preview branch `task6-phase-a2-preview` at **`dd06ceb`**.

## 2. Targeted test results
| Check | Result |
|---|---|
| `tests/task6-a2-balance.test.js` | 3 of 3 |
| Affected files: `league-flows`, `franchise`, `league-season`, `aging-retirement` | **71 of 71** |
| Smoke soak (seed 3 × 3 seasons) | 0 problems |
| Band comparison runs (4 variants × 5 seeds × 20 seasons) | 0 problems, 0 errors |
| Preview folder | 162 files, byte-identical to the commit; loads in Chromium and imports a save (0 page errors) |

The full suite and the full benchmark were not run, by instruction. They belong to the A-2/B milestone.

## 3. D10b band comparison (matched seeds 106–110 × 20 seasons; 5 seeds, so provisional)
All variants include D9 and D10a. "s8 r4" means slowdown at +8 and runaway at +4.

| Measure | v42.17.0 | A-1 | **+4 / +4** | +6 / +6 | +8 / +8 | s8 r4 | Target |
|---|---|---|---|---|---|---|---|
| Gym win rate against ordinary clubs | 85.0 | 87.8 | 82.5 | 81.8 | 81.5 | 81.8 | ≥ 60 |
| Gym share of AI titles | 99 | 97 | 99 | 99 | 96 | 99 | ≥ 75 |
| Gym lead, minimum from season 8 | 6.3 | 6.8 | **5.9** | 5.3 | 4.8 | 5.7 | ≥ 6 |
| Gym lead, seasons 5–7 (minimum) | 5.0 | 4.4 | 4.1 | 3.6 | 3.3 | 4.2 | ≥ v42.17.0 |
| Gym lead, season 20 | 15.4 | 15.8 | **6.8** | 6.3 | 5.7 | 7.1 | 6–12 |
| Gym tier order (pooled) | held | held | held | held | held | held | held |
| Ordinary persistent losers | 91 | 94 | 89 | 94 | **83** | 94 | ≤ 50 |
| Ordinary share of titles | 1 | 3 | 1 | 1 | **4** | 1 | 5–15 |
| Ordinary share of playoff berths | 15.6 | 13.5 | 19.4 | 20.1 | 21.0 | 21.0 | 20–30 |
| Generated veterans among gym starters, season 20 | 59 | 72 | **43** | 41 | 41 | 39 | report |
| Ordinary club-seasons slowed | 44 | 22 | 41 | 14 | 5 | 5 | report |
| Owner win rate, seasons 1–8 (Pro, hands-off) | 51.4 | 48.6 | **51.4** | 45.6 | 43.9 | 44.2 | drift ±5 |
| Round-1 picks starting for their club by year + 2 | 23 | 37 | **51** | 48 | 49 | 50 | ≥ 44 |
| Late picks (year 12+) starting by year + 2 | 14 | 34 | **53** | 53 | 57 | 55 | ≥ 30 |
| Round-1 picks starting in their first season | 22 | 33 | 45 | 42 | 44 | 44 | report (rookie strength) |
| Veterans still starting | 96 | 90 | 85 | 82 | 86 | 83 | ≥ 50 |
| Starter age, season 20 | 35.1 | 28.6 | 27.3 | 27.3 | 27.4 | 27.2 | 27–30 |

**Reading.**
- **No width is best on every count.**
  - **+8 / +8** helps ordinary clubs most: fewer persistent losers, 4% of titles.
  - But it lowers the gym lead below its floor from season 8 (4.8), and lowers the hands-off owner's early win rate by about 7.5 points against +4, which works against the binding drift gate.
- Under the owner's rule (adopt +8 only if it gives the best balance), **both bands stay at today's +4**, aligned, until the owner chooses.
- The comparison is ready to repeat on 10+ seeds at the milestone.

## 4. Nudge recalibration (checkpoint 1) and the §45.6 contract
Contract run on `4c76751` (persistent against legacy, seeds 1–8 × 8 seasons):

| Difficulty | Owner win rate: legacy → persistent | Matched seasons only | AI mid-season | Pass |
|---|---|---|---|---|
| Rookie | 68.7 → 66.1 (−2.6) | −2.6 | +0.3 | yes |
| **Pro** | 55.1 → 47.5 (**−7.6**) | **−5.7** | +0.5 | **no** |
| All-Star | 36.7 → 37.0 (+0.3) | +0.2 | −0.3 | yes |

- **Pro fails the owner band.**
  - At A-1 it was −4.7 (−3.4 on matched seasons).
  - On Pro the legacy side lost 3 owners to firings (49 seasons against 62), which inflates its win rate. On seasons both sides played, the gap is −5.7.
  - The AI mid-season strength is within band (+0.5), so the gap sits on the owner's side.
  - The owner's team runs about 2 points behind its legacy twin from season 4.
  - The per-seed spread is large (for example seed 1: 44% against 65%).
- **No nudge constant was changed.** With 8 seeds the gap cannot be told from noise. Phase B will change the AI's drafting, contracts and succession, so any tuning now would have to be redone.
- **Recommendation:** run the formal recalibration (`LIFT_SHARE`, the lift and slow bands, the runaway width) at the A-2/B milestone on the full sample, together with the drift gate.
- The §45.6 Pro result is recorded as an **open hard-gate failure**.

## 5. Known issues and integration risks
1. **§45.6 contract, Pro:** −7.6 (−5.7 matched). Open; formal recalibration at the milestone.
2. **Owner difficulty drift (Rookie and Pro):** binding and unresolved, carried from A-1. A wider ordinary band makes it worse.
3. **Gym protection floor:**
   - with D9 + D10a, the gym lead from season 8 is 5.9 (floor 6), and in seasons 5–7 it is 4.1 against v42.17.0's 5.0 (must be no worse);
   - the season-20 lead (6.8) is now inside the 6–12 corridor;
   - this is the Group 2 risk "floor against corridor". Reported, not forced.
4. **Ordinary-club corridor:** still unmet (persistent losers 83–94%, titles 1–4%). Phases B–D are the roster-decision levers.
5. **Rookie strength (D9):**
   - 45% of round-1 picks start in their first season (A-1 33%, v42.17.0 22%), and picks sit 3.3 below the starter floor (against 8.3);
   - veterans keep their place (85% still start);
   - owner judgement: the owner asked that scaling not create excessive rookie strength.
6. **Persistent weak groups** stay high (about 26–31% on these seeds). For Phases B and C.
7. **Sample size:** all A-2 balance figures are 5 seeds. Long-run conclusions wait for 10+ twenty-season seeds at the milestone.

## 6. Development preview: ready, not published
- **Build:** `v42.18.1-dev.a2`, commit `dd06ceb`.
  - It is `4c76751` plus only the version label and the test-build switch.
  - The `?v=42.18.1` stamp is new, so phones that cached the A-1 preview fetch the changed files.
- **Publish folder:** 162 files, byte-identical. The release file check passed (changed since A-1: `gyms.js`, `draft.js`, `franchise.js`, `league-season.js`, `version.js`, `index.html`).
- **What to test by hand:**
  - draft classes get stronger as seasons pass (visible from season 2 on);
  - gyms stop pulling away after season 10;
  - A-1's ageing and retirement unchanged.
- **Waiting for:** the owner's approval to publish to the private test link.
