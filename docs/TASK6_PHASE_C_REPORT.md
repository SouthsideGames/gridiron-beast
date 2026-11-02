# Task 6 Phase C — Consolidated Milestone Report (2026-11-02)

**Build:** branch `task6-phase-c`, stacked on `task6-phase-b`. Simulation code is commit **`16aaeec`**; later commits change only tests, documents, the GDD and the import map.

**Status:**
- Not merged. The main game is untouched. Phase D has not begun.
- No approved rule, target or measurement definition was changed.
- How the owner's roster is valued, and the owner's deal rules, are unchanged.

**Baseline and methods:**
- The frozen v42.17.0 Phase 0 runs.
- Early owner drift uses the approved method (thresholds v6): 36 matched seeds, seasons 1–8, the same hands-off owner.
- Later seasons and every harness measure use the full horizon.

**Private preview:** **`v42.19.0-dev.c`** (branch `task6-phase-c-preview`), on the private development test link, artifact version `1793612662-9f69`. It loads a save at 390 px with 0 errors.

---

## 1. Implementation summary (approved Phase C scope)
| Item | What was built | Files |
|---|---|---|
| **C1 development slots** | 6 per club, at most 2 per position. Eligible: a reserve aged 25 or under, healthy, potential at least overall + 3. After each completed game: 0.35 × 24 base XP = **+8**. No win or stat bonus, no fatigue or injury roll, the slowdown applies, existing level-ups. Nothing for a monster who started that game. Priority: designated successors first, then the largest potential gap. AI clubs and the owner | `src/franchise/development.js`, `franchise.js` |
| **GM slots** | Filled automatically by the same priority. Roster panel (Lineup and Depth views): **Develop** / **Remove** / reset to the coaches. Manual picks persist; an ineligible pick leaves with a League News reason and the named replacement. Practice XP on the final-whistle sheet. Additive save field `f.devSlots` | `ui/screens/roster.js`, `ui/screens/match.js` |
| **C2 maturation** | Each offseason through age 24: +1 to the position's most-weighted attribute below potential; no random draw; every non-ageless monster, the owner's included | `progression.js` |
| **R5 free-agency upgrades** | After the owner's free agency. A weak group (−4) signs a pool monster at least +3 over the starter; otherwise a succession need signs a qualifying successor. May release the weakest expendable reserve (never protected, a successor, injury cover, or a needed starter). Pools only; **1 per club per offseason** (2 for contenders needs modes, Phase D). Measured: **2.3 upgrades per offseason league-wide** (0.16 per club) | `league-season.js` |
| **Evolution check** | Measured (§2) | — |
| **Recalibration checkpoint 2** | Measured (§4–§5); no constant changed | — |
| **Tests** | `tests/task6-phase-c.test.js` (6); `tests/media-boost.test.js` (Phase B coverage); two Task 5 in-season trade tests now search four leagues (§7) | |
| **Documents** | GDD §57; this report | |

**Practice share 0.50, for reference only** (5 seeds × 20 seasons):

| Measure | 0.35 | 0.50 |
|---|---|---|
| Young reserves' 3-season gain | +2.6 | +3.0 |
| Evolutions per club-season | 0.87 | 0.88 |
| Round-1 starting in season 1 | 54% | 56% |
| Gym lead, minimum from season 8 | 5.1 | 5.0 |

0.35 is kept, per the owner's preference.

## 2. Phase C targets (B = 60 ten-season seeds unless noted; v42.17.0 → Phase B → **Phase C**)
| Target | Band | v42.17.0 | Phase B | **Phase C** | Status |
|---|---|---|---|---|---|
| Young reserves' 3-season gain (slot-eligible) | ≥ +3, with a measured gap to starters | +0.75 | +0.66 | **+2.64** (starters +3.99; gap 1.35) | **not met** (short by 0.36; nearly four times the baseline) |
| Development ordered by potential (high against low headroom) | ordered | 2.24 < 2.69 | 2.82 < 2.99 | **5.42 > 3.83** | **met** (wrongly ordered before Phase C) |
| Evolutions per club-season | report; recommend if excessive | 0.99 | 0.99 | **0.96** | no increase; prospect potential gain unchanged (+0.49 against +0.40). Nothing to recommend |
| Round-1 starting within 2 seasons, all / drafted year 12+ (C) | ≥ 44 / ≥ 30 | 33.0 / 14.4 | 57.6 / 63.1 | **60.8 / 67.5** | **met** |
| Successor ready (within 4) | report | 5.3 | 6.6 | **8.7** | supported improvement |
| Persistent weak group, club-relative / with cap room | ≤ 8 / ≤ 5 | 11.9 / 9.8 | 11.2 / 9.6 | **9.7 / 7.9** | **not met**; both now *below* baseline (supported improvement) |
| Persistent weak group, position-relative | −30% | 15.7 | 13.9 | **13.7 (−13%)** | **not met** |

## 3. Outstanding Phase B gates (binding, re-measured after Phase C)
| Gate | Requirement | Phase B | **Phase C** | Status |
|---|---|---|---|---|
| **Owner drift, Rookie** (36 seeds, seasons 1–8) | ±5 | −6.0 / −6.3 (12-seed method) | **−5.4 [−7.9, −2.8]** | **FAIL** (by mean; 12-seed full-horizon reading −2.9) |
| **Owner drift, Pro** (36 seeds) | ±5 | −6.2 [−9.2, −2.8] | **−3.3 [−7.1, +0.5]** | within ±5, **interval crosses the limit: not proof of passing**. Against Phase B: +2.9 [−0.2, +5.8] |
| **Owner drift, All-Star** (36 seeds) | ±5 | −0.1 (24 seeds) | **−1.5 [−5.5, +2.2]** | within ±5, interval crosses the limit |
| **All-Star owner balance (§45.6)** (inconclusive) | owner ±5, AI ±2 | +6.6 (8) / +3.2 (24) | **+6.8 on the standard 8 seeds (AI 0.0); 24 seeds: +0.1 [−3.0, +3.3]** | standard gate **FAIL**; expanded sample inside ±5 with its whole interval inside. **Still inconclusive** |
| **Rookie owner balance (§45.6)** | owner ±5 | +4.2 (pass) | **+5.1 on the standard 8 seeds (AI +0.4); 24 seeds: −0.3 [−3.1, +2.8]** | **new standard-gate FAIL**: the owner does better in the persistent league; the expanded sample sits well inside |
| Pro owner balance (§45.6) | owner ±5 | −2.9 | **+2.3** (AI −0.3) | pass |
| Gym lead, minimum from season 8 | ≥ 6 | 5.3 | **4.8** | **unmet** (worse) |
| Gym lead, seasons 5–7 | ≥ 4.6 | 3.9 | **3.9** | **unmet** |
| Gym lead, season 20 (evaluation) | 6–12 | 6.4 | **5.9** | **just outside** |
| Gym win rate / title share / tier order | ≥ 60 / ≥ 75 / held | 82.0 / 99.5 / held | **79.8 / 99.5 / held** | pass |
| Ordinary persistent losers | ≤ 50% | 91.4% | **87.1%** | **unmet** (improved) |
| Ordinary title share | 5–15% | 0.5% | **0.5%** | **unmet** |
| Ordinary playoff appearances | 20–30% | 19.2% | **22.7%** | **now inside the band** (evaluation) |
| Persistent weak groups | as §2 | | | **unmet** (improved) |
| Young players in AI–AI payments | below 48.2 | 49.4 | **46.6** | below baseline, but **not significant** (interval crosses zero) |

**Why the standard 8-seed contract fails where the 24-seed sample passes.**
- Phase C changes the owner's own team in both modes (maturation and slots), so the old-style ("legacy") reference runs were rerun on Phase C as well.
- The whole excess comes from seeds 1–8:

| Seeds | Rookie | All-Star |
|---|---|---|
| 1–8 | +5.0 | +6.8 |
| 9–16 | −2.5 | −1.2 |
| 17–24 | −3.3 | −4.1 |

- The AI side is inside ±2 throughout.

**Rookie drift: where the gap is** (36 seeds, win % and owner / AI team overall):

| Season | 1–4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|
| v42.17.0 | 79.6 / 75.0 / 85.5 / 75.3 | 79.6 (69.2/67.1) | 70.1 | 78.7 (69.8/69.2) | 63.0 (69.8/70.0) |
| Phase C | 81.5 / 75.0 / 85.5 / 75.3 | 76.5 (69.0/67.2) | 63.6 | 58.6 (68.7/69.4) | 47.8 (68.2/70.4) |

Seasons 1–4 match v42.17.0. The shortfall is again seasons 6–8: the ageing of the owner's starting roster, as diagnosed in Phase B. Phase C's owner-side growth (maturation, slots) narrowed Pro by about 3 points but not Rookie.

## 4. Matched-seed owner balance and drift: full tables
In `task6-phase-c/drift36.json` (all three difficulties, season by season) and `task6-phase-c/gates.json` (contract, and the 12/24-seed full-horizon drift).

| Difficulty | Full-horizon drift, seasons 1–8 (12 or 24 seeds) | Seasons 9–20 |
|---|---|---|
| Rookie | −2.9 | 25.8 against 45.0 |
| Pro | −2.6 | 22.6 against 35.6 |
| All-Star | −1.0 | 20.7 against 24.3 |

Seasons 9–20 are reported only. They improved on Pro and All-Star relative to Phase B (Pro 22.5, All-Star 16.1). The hands-off owner's later-season win rate on the C harness is 24.0% against v42.17.0's 28.3% (Phase B 20.6%).

## 5. Gym and ordinary-club competitiveness (C, 10 twenty-season seeds)
| Measure | v42.17.0 | Phase B | **Phase C** |
|---|---|---|---|
| Gym win rate against ordinary clubs | 84.7 | 82.0 | 79.8 |
| Gym share of titles | 98.9 | 99.5 | 99.5 |
| Gym lead, seasons 5–7 / from season 8 / season 20 | 4.6 / 6.3 / 15.2 | 3.9 / 5.3 / 6.4 | 3.9 / **4.8** / **5.9** |
| Ordinary persistent losers / titles / playoff berths | 90.0 / 1.1 / 15.5 | 91.4 / 0.5 / 19.2 | 87.1 / 0.5 / 22.7 |
| Ordinary clubs slowed (club-seasons) | 41.4 | 41.3 | 44.9 (worse, significant) |
| Tier order (pooled) | held | held | held |

Development lifts ordinary rosters more than gym rosters: gyms lean on generated veterans, who are never slot-eligible, as the Group 4 interaction note predicted. That narrows the gym lead further below the floor. Reported, not forced.

## 6. AI roster quality, succession, draft, free agency, trading
| Measure | v42.17.0 | Phase B | **Phase C** |
|---|---|---|---|
| Succession cover, R1 definition, B / C (≥ 40 / ≥ 30) | 36.1 / 25.1 | 49.4 / 39.4 | **47.3 / 38.7** (met) |
| Succession, Task 4 definition (diagnostic) | 17.6 | 27.4 | 34.4 |
| Misaligned picks (≤ 7.4) | 10.6 | 4.3 | **4.7** (met) |
| Round-1 overall | 61.0 | 63.2 | 63.1 (kept) |
| Round-1 starting in first season (accepted level 53.8) | 29.8 | 53.8 | 53.5 |
| Veterans still starting (≥ 50) | 96.1 | 84.0 | 80.0 |
| Starter age, season 10 (27–30) | 29.9 | 27.2 | **27.0** (just under the A-1 band; reported) |
| Contract lengths 1 / 2 / 3 (all present) | 0 / 100 / 0 | 11.8 / 33.6 / 54.6 | met (3-year 55.4) |
| League starter overall, season 20 | 81.0 | 77.1 | 77.3 |
| R5 upgrades per offseason (league) | — | — | 2.3 |
| AI–AI deals per season / in-season share | — | 3.66 / 30.5% | 3.92 / 32.9% |
| Deals outside the band either way | — | 4 (rounding) | 4 (rounding) |

## 7. Regression suite
- **Full suite: 802 of 802.**
- Two Task 5 in-season trade tests failed when Phase C changed the one league they used (seed 51). In that league no club could afford a deal; in two of four leagues deals happen. Real in-season trading is unchanged: 1.35 deals a season on the trial seeds, against 1.24 in Phase B and 1.34 in v42.17.0.
- Both tests now search four leagues. Every per-deal assertion is unchanged.
- **Mutation-checked:** "in-season trading switched off" and "the deadline ignored" are both still caught.

## 8. Integrity, determinism, save compatibility, performance
| Check | Result |
|---|---|
| Integrity | 0 problems and 0 errors in all 41 validation runs and 24 drift and contract extension runs |
| Determinism | B 51–60 repeat gives an identical hash; the harness check passes (non-interference and determinism) |
| Save compatibility | 6 of 6 saves (owner-only, league, mid-season, offseason, 15-season) play on and round-trip; saves without `devSlots` load with automatic slots |
| Stage P | 14.91 against 13.63 s per season: **+9.4%** (gate ≤ +10%; passes with little margin: the per-game slot selection reads the roster plan for every AI club) |
| Phone width | The development panel renders at 360 and 390 px with no horizontal overflow; Develop / Remove work (`task6-phase-c/ui-roster-360.png`) |

## 9. Failures and decisions for the owner
1. **Rookie owner drift fails** on the approved 36-seed method (−5.4 [−7.9, −2.8]). The cause is unchanged (owner ageing in seasons 6–8). The approved path: revisit the difficulty curve. Not done without approval.
2. **§45.6 owner balance on Rookie (+5.1) and All-Star (+6.8)** fails on the standard 8 seeds. On 24 seeds both are inside ±5 with their whole intervals inside (−0.3, +0.1). In both, the owner does better in the persistent league. How should these be classified?
3. **Gym floor** is further below target (4.8 from season 8; season 20 at 5.9, just outside its 6–12 corridor), driven by ordinary-club development.
4. **Young-reserve growth** +2.64 against the ≥ +3 target at the approved share of 0.35. 0.50 would reach about +3.0, but the owner prefers 0.35; it is not proposed merely because it grows faster.
5. **Stage P** passes with +9.4%. Phase D adds offseason work; an optimisation (caching each club's plan per week) could recover margin without changing behaviour, if the owner wants it.
6. **Still unmet:** persistent weak groups, ordinary title share and persistent losers, and young-player trade participation (below baseline but not significant). These are Phase D levers (modes, starter sales, the 2-upgrade contender limit).
