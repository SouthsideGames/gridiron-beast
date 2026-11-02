# Task 6 Phase C — Consolidated Milestone Report (2026-11-02, closeout added §10)

**Build:** branch `task6-phase-c`, stacked on `task6-phase-b`. §1–§9 were validated on simulation commit **`16aaeec`**. The closeout adds two behaviour-preserving performance commits (`b43274b`, `de0e7ae`), proven identical in §10.3; every other later commit changes only tests, documents, tools, the GDD or the import map.

**Status:**
- Not merged. The main game is untouched. Phase D has not begun.
- No approved rule, target or measurement definition was changed.
- How the owner's roster is valued, and the owner's deal rules, are unchanged.

**Baseline and methods:**
- The frozen v42.17.0 Phase 0 runs.
- Early owner drift uses the approved method (thresholds v6): 36 matched seeds, seasons 1–8, the same hands-off owner.
- Later seasons and every harness measure use the full horizon.

**Private preview:** see §10.6 (closeout build). The Phase C preview was **`v42.19.0-dev.c`** (branch `task6-phase-c-preview`), artifact version `1793612662-9f69`.

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
| Stage P | 14.91 against 13.63 s per season: **+9.4%** (gate ≤ +10%). Closeout re-measurement, interleaved with v42.17.0: +8.0% and +4.4% (§10.3) |
| Phone width | The development panel renders at 360 and 390 px with no horizontal overflow; Develop / Remove work (`task6-phase-c/ui-roster-360.png`) |

## 9. Failures and decisions for the owner
1. **Rookie owner drift fails** on the approved 36-seed method (−5.4 [−7.9, −2.8]). Closeout diagnosis and solution trials: §10.1. The curve is not an effective lever; the Rookie-scoped ageing trial (S3) reaches −2.2 [−4.6, +0.4] and awaits the owner's decision.
2. **§45.6 owner balance on Rookie (+5.1) and All-Star (+6.8)** fails on the standard 8 seeds. On 24 seeds both are inside ±5 with their whole intervals inside (−0.3, +0.1). In both, the owner does better in the persistent league. How should these be classified?
3. **Gym floor** is further below target (4.8 from season 8; season 20 at 5.9, just outside its 6–12 corridor), driven by ordinary-club development.
4. **Young-reserve growth** +2.64 against the ≥ +3 target at the approved share of 0.35. 0.50 would reach about +3.0, but the owner prefers 0.35; it is not proposed merely because it grows faster.
5. **Stage P** passes with +9.4%. The approved behaviour-preserving optimisation is in (§10.3); interleaved re-measurement +8.0% / +4.4%.
6. **Still unmet:** persistent weak groups, ordinary title share and persistent losers, and young-player trade participation (below baseline but not significant). These are Phase D levers (modes, starter sales, the 2-upgrade contender limit).

---

## 10. Closeout (owner's instructions of 2026-11-02)
Focused diagnostics only. No approved rule, constant, target, threshold, seed selection or measurement definition was changed. The solution trials in §10.1 ran on scratch copies that were never committed.

### 10.1 Rookie drift: why the owner falls behind in seasons 6–8
**Tools:** `tools/task6-owner-drift-diag.mjs` (Rookie 24 seeds, Pro 12 seeds, seasons 1–8, the approved drift configuration and the same hands-off owner). Output: `task6-phase-c/closeout/owner-drift-*.json`.

**What the hands-off owner does.**
- It re-signs everyone and drafts only while it has room.
- It signs a free agent only to reach the minimum roster of 26.
- From season 3 its roster is full (38), and from season 4 it is over the cap. So it never replaces lost quality.

**What changed against v42.17.0.**
- In v42.17.0 there was no ageing decline and no retirement. The same 17–18 starters played all eight seasons, aged exactly one year a season (23.8 to 30.7), and never declined. Seasons 4–8 had zero roster turnover.
- Task 6 Phase A-1's approved ageing and retirement now act on that closed squad:
  - from season 6, 2 to 3 monsters retire each season, about one of them a starter;
  - draft picks taken into the freed places replace them at about 61 overall;
  - the original starters who stay decline past their onset.

**Rookie, 24 seeds, end of season** (owner overall / AI overall / owner's original starters / drafted starters):

| Season | v42.17.0 | Phase C | Owner change | AI change | Gap change |
|---|---|---|---|---|---|
| 5 | 69.4 / 67.1 / 17.3 / 1.6 | 69.1 / 67.2 / 15.6 / 3.2 | −0.3 | +0.1 | −0.4 |
| 6 | 69.4 / 67.9 / 17.4 / 1.5 | 69.0 / 68.5 / 14.8 / 3.9 | −0.4 | +0.6 | −1.0 |
| 7 | 70.0 / 69.2 / 17.5 / 1.5 | 68.9 / 69.5 / 13.3 / 5.5 | −1.1 | +0.3 | −1.4 |
| 8 | 69.9 / 70.0 / 17.3 / 1.6 | 68.7 / 70.5 / 11.9 / 6.8 | −1.2 | +0.5 | −1.6 |

On Pro (12 seeds) the owner loses the same amount (−0.5, −0.1, −1.2, −1.0 in seasons 5–8). The AI side, however, is level or lower (−0.3, 0.0, −0.3, −0.2). So the Pro gap falls only −0.1, −0.8 and −0.9 in seasons 6–8.

**The specific reason** has three parts:
1. **Owner side, all difficulties.** The approved ageing and retirement act on a passive, closed roster. The v42.17.0 reference has neither. This costs about 1.1 overall by seasons 7–8 on both Rookie and Pro.
2. **Rookie only, AI side.** Rookie AI clubs end 0.3–0.6 above v42.17.0, while Pro and All-Star clubs end level or lower. This is about a third of Rookie's gap loss in seasons 6–8. It is the net of every AI-side Task 6 change (ageing and retirement against the draft, slots and upgrades); these diagnostics do not separate the parts.
3. **Rookie only, where the loss lands.** On Rookie the owner's lead runs out exactly in seasons 6–8 (v42.17.0: +1.3, +0.6, −0.2). Near an even match, each point of overall swings the most games. Pro sits at −0.9 to −2.4 and All-Star at −4 to −5.


**Targeted solutions compared** (Rookie, the approved 36 seeds, seasons 1–8; scratch builds, not committed; `task6-phase-c/closeout/rookie-drift-trials.json`):

| Trial | What | Rookie drift against v42.17.0 | Against Phase C | AI overall, season 8 |
|---|---|---|---|---|
| Phase C (reference) | — | −5.4 [−7.9, −2.8] | — | 70.4 |
| S1 the curve | Ordinary clubs' Rookie quality −1 from season 6 (gyms untouched) | −5.4 [−7.9, −2.9] | 0.0 [−1.6, +1.6] | 70.3 |
| S2 the brake | Rookie ordinary-club slowdown band 4 → 2 from season 6 | −4.7 [−6.9, −2.5] | +0.6 [−0.8, +2.2] | 70.3 |
| S2b stronger brake | the same band → 0 | −5.2 [−7.9, −2.5] | +0.2 [−1.7, +1.9] | 70.3 |
| S3 ageing | Rookie: decline onset one season later for every club (owner and AI alike) | **−2.2 [−4.6, +0.4]** | **+3.1 [+0.2, +6.3]** | 70.6 (owner 69.0 against 68.2) |

Seasons 1–5 are identical to Phase C in 36 of 36 seeds for S1, S2 and S2b.

**What the trials show:**
- **The difficulty curve has no authority in seasons 6–8.** Lowering the Rookie target by a full point moved AI clubs by 0.1. Doubling the slowdown band moved them by none, and the brake shows no dose response (band 2 and band 0 are both noise).
- **Why:** in the persistent league a club's strength is its own roster developing by playing. The target only steers new arrivals and the mild XP brake, and no rating is ever edited. So a curve change cannot reach the clubs in time.
- **Only ageing moves the result.**
  - S3 lifts the owner by 0.8 overall at season 8, against +0.2 for the AI.
  - It improves drift by +3.1 against Phase C: **−2.2 [−4.6, +0.4], inside ±5 with its whole interval** under the approved method. Seasons 6–8 go from −13.9 to −10.2.
  - It also changes seasons 1–5 (+1 to +5 win points), because the generated starting veterans carry the ageing curve.

**Recommendation:** **S3, scoped to Rookie, as the candidate for the owner's approval: on Rookie every club's decline onset comes one season later.** It is an ageing-rule change, so it is not implemented. It is the only trial that moves the drift, and it acts symmetrically on the owner and the AI clubs.

Tradeoffs:
- **Rookie careers run one season longer league-wide.** Retirement comes later, starters are older, and turnover is slower. Rookie-mode succession, draft-start and contract measures will shift and must be re-measured.
- **It helps the owner on Rookie, where §45.6 already fails in the owner's favour** (+5.1 on 8 seeds). It must be checked against that gate on 8 and 24 seeds.
- Rookie seasons 9–20 were not measured, because the closeout avoided full-horizon runs.
- **Implementation:** the difficulty has to reach the ageing functions through the ageing context, which is used in the offseason and when starting veterans are generated.

If the owner prefers not to touch ageing, **no curve change is recommended**: S1, S2 and S2b do not work. Rookie drift then stays FAIL, documented as the cost of approved ageing on a passive owner.

**Effect on each difficulty:** - **Rookie:** −5.4 → −2.2 [−4.6, +0.4] (36 seeds; to be confirmed on the implemented build).
- **Pro and All-Star:** no change by construction, since the rule is scoped to Rookie. On implementation this is proven by identical hashes. Pro stays at −3.3 [−7.1, +0.5] and All-Star at −1.5 [−5.5, +2.2], both with intervals that cross the limit.
- **Required checks if approved:**
  - the Rookie 36-seed drift on the implemented build;
  - Rookie §45.6 on 8 and 24 seeds;
  - Pro and All-Star hash identity;
  - Rookie full-horizon measures in the held-out validation.

### 10.2 Rookie and All-Star owner balance (§45.6): kept FAILED, inconclusive
These are recorded as the owner directed:
- **Standard 8-seed checks: FAILED** (Rookie +5.1, All-Star +6.8).
- **Supporting evidence, 24 seeds:** Rookie −0.3 [−3.1, +2.8], All-Star +0.1 [−3.0, +3.3].
- **Overall interpretation: inconclusive.** Not passed and not waived.

The thresholds, the original results and the seed selections are unchanged, and both checks carry into the final integrated validation. The performance commits change no outcome (§10.3), so these results stand for the current build.

### 10.3 Performance: behaviour-preserving optimisation
**What was optimised:**
- **Roster-worth group cache** (`trade-value.js`). It works only inside a read-only valuation scope (a deal search) and is emptied when the scope ends.
  - The key is the season, the valuation kind and the group's monster ids.
  - So a group that gains or loses a monster (a deal, a signing, a release) is a new key.
  - Nothing that changes ratings, injuries, contracts, ages or the season can run inside a scope.
  - The additions are the same, in the same order.
- **Development-slot priority** (`development.js`, `roster-plan.js`). It works out the plan's successor designation only at the eligible monsters' positions (`successorsAt`), with a per-call overall memo.
  - This is not a cache: it holds nothing between games, so no invalidation is needed.

**Proof of identical behaviour:**

| Check | Result |
|---|---|
| Final franchise hash, seeds 1–4 × 8 seasons (Pro) | identical, validated build and optimised build: `c2a39ef036eb…` |
| Rookie, 24 seeds × 8 seasons | every season's record identical to the validation runs |
| Harness check (non-interference, determinism; whole-franchise sha-256, random state included) | pass; hashes identical to the validated build's |
| Save compatibility, 6 saves played forward (deals, calendar, invariants) | output identical to the validated build's, byte for byte |
| `successorsAt` against `rosterPlan` | identical successors for all 15 clubs (test) |
| Cache invalidation (new test) | deals, signings, a season change, the valuation kind, and rating, injury, contract and age changes between scopes all give the uncached value. Mutation-checked: a key without the ids, a key without the season, and a cache kept across scopes all fail the test |
| Phase C tests | 8 of 8 |
| Full suite | **804 of 804** on `f2e1682` |

**Stage P** (seeds 1–3 × 6 seasons, 3 repetitions, median; interleaved with v42.17.0 on the same machine):

| Pass | v42.17.0 | Phase C optimised | Change |
|---|---|---|---|
| 1 | 13.78 s / season | 14.88 | +8.0% |
| 2 | 13.50 | 14.10 | +4.4% |

The unoptimised Phase C build measured +8.0% and +5.7% the same way.

**Honest reading of the headroom:**
- The optimised code is about twice as fast: slot selection takes 0.18 ms per call, against 0.39.
- But Task 6's own logic was only about 1.3% of run time; the football engine is about 85%.
- So the measured overhead (+4% to +8%) is mostly run-to-run variation (±3–5%), not Task 6 code. Plays per season (4,103 against 4,091) and state size are unchanged.
- **Headroom for Phase D is about 2–5 points under the +10% gate.** The gain from the optimisation is real but small. Phase D's offseason work (mode decisions, a few deal searches) is light by the same profile.

### 10.4 Development growth: why +2.64 and not +3
**Tool:** `tools/task6-c-devdiag.mjs`. It ran on a scratch copy with one read-only counting hook: 6 seeds × 10 seasons, 8,895 club-games. Output: `task6-phase-c/closeout/devdiag.json`. Practice stays at 0.35.

| Candidate mechanism | Measured | Verdict |
|---|---|---|
| **Opportunities (slot capacity)** | 11.1 eligible reserves per club-game for 6 slots: **5.2 eligible reserves practise nothing each game** | **main cause** |
| Eligibility | 11.1 eligible per club, almost double the slots | not a constraint |
| XP slowdown | slowed in 20.9% of club-games; practice averages 7.51 XP against 8 (−6%) | minor |
| Progression cost | each practice level adds +1.25 overall; but the cost of a level rises with level (30 + 18 × level), so 8 XP a game buys fewer levels as a reserve develops | secondary |
| Calendar | only the ~9–10 games of a season give practice XP | secondary |

**By how much of the time a young reserve held a slot** (3-season gain):

| Slot share | Monsters | Overall gain | Levels |
|---|---|---|---|
| never | 991 | +1.25 | 0.4 |
| under 60% | 1,517 | +2.32 | 1.0 |
| 60% or more | 3,295 | +3.93 | 2.8 |

This population is wider than the gated measure (it includes monsters who later started), so it is used for the mechanism only.

**Conclusion:**
- Practice works where it reaches: a reserve who holds a slot most of the time clears +3 comfortably.
- The average falls short because practice XP is a fixed pool: 6 slots × 8 XP × ~10 games, shared by about 11 eligible reserves.
- So any route to +3 means roughly +40% more practice XP league-wide. The 0.50 reference (+43%) gave +3.0, and 8 slots (+33%) would give about +2.9 to +3.0.
- Rotating or concentrating the slots cannot raise the average, because the pool stays the same size.

**Recommendation (not implemented): keep 0.35 and 6 slots, and keep the target recorded as unmet with this mechanism.**
- More reserve development lifts ordinary clubs. That works directly against the gym floor (already unmet, and development is its main cause, §5) and the Rookie drift (the AI side, §10.1).
- If the owner nevertheless wants ≥ +3: more slots (8, still at most 2 per position) targets the real constraint better than a larger share. Measure it together with the gym lead and Rookie drift before adopting it.

### 10.5 Unresolved items and what Phase D can realistically address
Nothing below was weakened, manufactured or re-thresholded.

| Item | Status | What Phase D can do | What needs an owner decision |
|---|---|---|---|
| **Gym floor** (≥ 6 from season 8; 4.8) and seasons 5–7 (≥ 4.6; 3.9) | unmet | **Little.** Rebuilding mode briefly lowers some ordinary clubs (a small help). Contender mode (2 upgrades) and starter sales lift ordinary contenders (a small harm). Expect roughly neutral. | The floor is pushed down by approved development of ordinary clubs. Whether gym growth or the floor is revisited is the owner's call. Phase D cannot close it without touching gyms. |
| **Ordinary persistent losers** (≤ 50%; 87.1%) | unmet (improved) | **Partly.** Strategy modes are built to break persistence: a club that sells in a rebuild and buys as a contender rises and falls. Mode cycling is the most direct lever Task 6 has for this measure. A realistic expectation is a clear improvement, not 50%. | — |
| **Ordinary title share** (5–15%; 0.5%) | unmet | **Very little.** Gyms win 99.5% of titles. Ordinary titles need gyms to lose finals, which conflicts with the gym floor. | Whether the title-share band and the gym floor are both attainable together. |
| **Persistent weak groups** (≤ 8 / ≤ 5; 9.7 / 7.9; position-relative −13% against −30%) | unmet (improved) | **Partly.** Contenders' second upgrade, mode-specific free-agency decisions, and rebuilders filling weak groups with youth. The club-relative ≤ 8 is within reach; with cap room ≤ 5 and −30% are unlikely. | — |
| **Young players in AI–AI payments** (below 48.2; 46.6, not significant) | unmet (not significant) | **Uncertain direction.** Rebuilders buy youth, and contenders paying with prospects would raise the measure. Mode-specific payment choices (rebuilders never pay with young players; contenders pay with picks and surplus first) can push it down. This is within the approved Phase D scope. | — |
| **Rookie drift** (§10.1) | FAIL | **Nothing direct.** Phase D changes AI clubs, not the hands-off owner. Rebuilding clubs could lower the AI side slightly. | §10.1 recommendation. |
| **§45.6 Rookie / All-Star** | FAILED (8 seeds), inconclusive | — | Classification at the final integrated validation. |
| **Development +2.64** | unmet | — | §10.4. |
| **Pro and All-Star drift** | within ±5, intervals cross the limit | Like Rookie, unaffected by Phase D on the owner side. | — |

### 10.6 Closeout build and preview
- **Closeout build:** `task6-phase-c` at the closeout commits.
- **Preview: `v42.19.1-dev.c`** (branch `task6-phase-c-preview`, commit `b0c8453`; new `?v=42.19.1` stamp; test build), on the private development test link at artifact version `1793653702-27a2`.
  - Release file list check: 164 files.
  - The live files were verified after publishing.
  - Smoke test at 390 px: 0 errors, no horizontal overflow; a one-season franchise plays in the browser with 0 problems and 6 development slots.
- **No gameplay difference from the Phase C preview:** the closeout's code changes are the behaviour-preserving performance commits only.
- The main game (v42.17.0) is untouched. Nothing is merged.
