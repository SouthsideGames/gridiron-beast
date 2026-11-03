# Task 6 Phase D — Implementation and Final Validation Report (2026-11-03)

**Build:** branch `task6-phase-d`, stacked on `task6-phase-c`. The simulation code validated here is commit **`c132ce4`**; later commits change only documents, tools and the import map.

**Status:**
- Not merged. The main game (v42.17.0) is untouched. No Phase E.
- No approved rule, constant, threshold or seed selection was changed. That covers ageing, development slots, practice XP, difficulty, gym bonuses, the nudge and trading rules.
- T1, T2 and T4 were not implemented.

**Validation:**
- One consolidated run on the frozen v42.17.0 baseline and Phase C, using the approved seed sets: B 1–60 × 10, C 106–115 × 20, contract 1–8 (with 24-seed extensions), and drift 1–36 × 8 on every difficulty.
- The held-out sets (H 61–80, CH 116–125) were run once on the final simulation commit and never used for a decision.
- Phase C's legacy (today's generator) contract runs were reused: Phase D cannot reach them, and seeds 1–2 were rerun and found identical.

---

## 1. Phase C decisions resolved (owner, 2026-11-02)
- **Rookie ageing:** the Rookie-only one-season delay is **not** adopted. The 36-seed drift gate and its FAIL classification are preserved, and the managing-owner diagnostic is supplementary (§6).
- **Development:** 6 slots, at most 2 per position, practice XP 0.35, all unchanged. Results are reported for both populations (§5.4).
- **Gyms and ordinary clubs:** both requirements are preserved, and the dominance is investigated in §7. No gym bonus or outcome was touched.

## 2. Implementation (approved specification §1.8 R2, R4, and the mode weights in R3, R5 and R7)
| Item | What was built | Files |
|---|---|---|
| **D1 strategy modes (R2)** | See below. | `src/franchise/strategy.js`, hook in `franchise.js` |
| **D2 starter sales (R4)** | See below. | `league-trades.js` |
| **D3 contracts (R3 by mode)** | See below. | `league-season.js` (`leagueContracts`, `modeLength`) |
| **D4 upgrades (R5 by mode)** | Contend **2**, all others **1**. Pools only, after the owner's free agency, with the existing rules. | `league-season.js` (`upgradesAllowed`) |
| **D5 drafting (R7 by mode)** | Potential weight 0.35 for Rebuild, 0.20 for Compete and Retool, 0.10 + readiness bonus (+2) for Contend. Succession and weak-position bonuses, noise, and the kicker and duplicate penalties are unchanged. | `draft.js` |
| **D6 rebuild-nudge options** | Evaluated on scratch builds, not adopted (§4). | — |
| **Harness and analysis** | The v4 recording adds R4 sales, contracts by mode and upgrades by mode. The analyzer adds Phase D measures. Two diagnostics: gym dominance, and a managing-owner mode in `balance-compare --owner=manager`. | `tools/` |
| **Tests** | `tests/task6-phase-d.test.js` (10 tests). The Phase C upgrade test now checks the mode's allowance. | |
| **Documents** | GDD §58, this report, the decision log, and the methodology §8 entry (Phase D measure definitions only). | |

**D1 strategy modes (R2):**
- **Four modes:** Contend, Compete, Retool, Rebuild.
- **When:** once a season, as the offseason opens, after retirements and before contracts and the draft.
- **Inputs:** results (this season blended 0.6/0.4 with last), team overall against the AI mean, the share of starters within 2 seasons of onset, committed payroll against the cap, and picks held.
- **Stability:** a change normally needs two consecutive evaluations; a shift of 2+ steps changes at once; a rebuild lasts at least 2 seasons.
- **Gyms:** never below Compete.
- **Determinism and storage:** no random draws; fields are additive in `clubRecord.strategy`.

**D2 starter sales (R4):**
- At most **one sale per trading window in the whole league**.
- **Seller:** a Rebuild club.
- **Starter sold:** within 2 seasons of onset or past it, older than 26, not protected, tradable.
- **Buyer:** not rebuilding, and the starter beats its weakest starter at the position by the window's bar.
- **Payment:** young players (25 or under) or picks.
- **Rules reused:** the existing judge (fair both ways, cap, roster, gain and seller floor).

**D3 contracts (R3 by mode):**
- **Contend:** keeps its veteran starters on one-season deals.
- **Rebuild:**
  - lets a starter past onset go once a successor is lined up;
  - gives no new deal to a reserve past onset;
  - values young upside from +3;
  - signs near-onset monsters for 1 season and young upside for 3.
- Succession protection, the cap and runaway rules, and retirement risk are kept.

## 3. Phase D results (B = 60 ten-season seeds; C = 10 twenty-season seeds)
| Measure | Phase D |
|---|---|
| Mode shares, club-seasons (C / B) | Contend 32 / 28%, Compete 37 / 42%, Retool 8 / 13%, Rebuild 23 / 17% |
| Mode changes per club per 10 seasons (C / B) | **1.47 / 1.54** (stable) |
| Gyms below Compete | **0** |
| Rebuild spells, mean length (C / B) | 4.5 / 3.0 seasons |
| Starter sales per season (C / B) | 1.41 / 1.12 (2 windows a season); seller's starter aged 29.7 on average; 671 sales in B, every one fair, legal and to a club with a need |
| Upgrades per season, all clubs (B) | Contend 0.30, Compete 0.99, Retool 0.65, Rebuild 0.47. Contend clubs rarely find a qualifying pool monster, so the second allowance is seldom used |
| Re-signings per season by mode (B) | Compete 71.6, Contend 54.2, Rebuild 24.1, Retool 21.0 |
| Drafting by mode (B, picks from season 2) | See the table below |

**Drafting by mode** (B, picks from season 2):

| Mode | Potential | Upside | Would start | Below best available |
|---|---|---|---|---|
| Rebuild | 71.1 | +12.3 | — | 1.35 |
| Compete | 69.8 | +11.8 | — | 1.14 |
| Contend | 68.4 | +11.3 | 6% | 1.00 |

Rebuilders pick earlier, so these figures are confounded with draft position; §4 isolates the weight.

**Comparison with v42.17.0 and Phase C** (matched seeds; 95% bootstrap intervals; Phase D minus the earlier build). {{HELDNOTE}}

| Measure (set) | Band | v42.17.0 | Phase C | **Phase D** | D − v42.17.0 | D − C |
|---|---|---|---|---|---|---|
| Struggling clubs after 3 seasons: starter age (C) | younger | 29.46 | 25.84 | **25.59** | −3.87 [−4.03, −3.74] | −0.26 [−0.33, −0.19] |
| Struggling clubs after 3 seasons: potential (C) | higher | 70.32 | 71.88 | **71.81** | +1.49 [+1.35, +1.62] | −0.07 [−0.31, +0.20] |
| Recovery from ≤ 2 wins to ≥ 5 within 3 seasons (C) | report | 31.1 | 45.1 | **42.0** | +10.9 [+4.0, +18.4] | −3.2 [−11.4, +6.0] |
| Succession cover (B) | ≥ 40 | 36.1 | 47.3 | **48.2** | +12.1 | +0.9 [−0.3, +2.0] |
| Successor ready (B) | report | 5.3 | 8.7 | **12.4** | +7.1 | +3.7 [+3.1, +4.3] |
| Misaligned picks (B) | ≤ 7.4 | 10.6 | 4.7 | **4.4** | −6.2 | −0.3 |
| Round-1 starting within 2 seasons, all / late (B / C) | ≥ 44 / ≥ 30 | 33.0 / 14.4 | 60.8 / 67.5 | **59.3 / 63.6** | +26.3 / +49.2 | −1.5 [−3.0, −0.0] / −3.9 [−7.6, 0] |
| Young reserves' 3-season gain (B) | ≥ +3 | 0.75 | 2.58 | **2.60** | +1.85 | +0.02 |
| Persistent weak group, club-relative / with room (B) | ≤ 8 / ≤ 5 | 11.9 / 9.8 | 9.7 / 7.9 | **11.3 / 9.1** | −0.6 / −0.7 (n.s.) | **+1.6 [+0.3, +2.9] / +1.2 [+0.1, +2.2]** |
| Persistent weak group, position-relative (B) | −30% | 15.7 | 13.7 | **14.2** (−10%) | −1.6 | +0.5 [+0.2, +0.8] |
| Young players in AI–AI payments (B) | below 48.2 | 48.2 | 46.6 | **56.4** | +8.2 [+5.1, +11.5] | **+9.8 [+6.9, +12.7]** |
| Contract lengths: 3-year share / largest expiry share (B) | all present / staggered | 0 / 54.0 | 55.4 / 51.7 | **56.3 / 52.9** | — | +0.9 / +1.1 |
| Gym win rate against ordinary clubs (C) | ≥ 60 | 84.7 | 79.8 | **80.6** | −4.1 | +0.8 |
| Gym title share (C) | ≥ 75 | 98.9 | 99.5 | **99.0** | 0.0 | −0.5 |
| Gym lead, minimum from season 8 / seasons 5–7 (C) | ≥ 6 / ≥ 4.6 | 6.26 / 4.64 | 4.81 / 3.86 | **5.02 / 3.69** | −1.2 / −1.0 | +0.2 / −0.2 (n.s.) |
| Gym lead, season 20 (C) | 6–12 | 15.2 | 5.85 | **6.0** | −9.2 | +0.2 |
| Ordinary persistent losers (C) | ≤ 50 | 90.0 | 87.1 | **95.7** | +5.7 (n.s.) | **+8.6 [+1.4, +15.7]** |
| Ordinary title share / playoff share (C) | 5–15 / 20–30 | 1.1 / 15.5 | 0.5 / 22.7 | **1.0 / 21.8** | 0 / +6.4 | +0.5 / −0.8 |
| Owner win rate, seasons 9–20 (C, monitor) | — | 28.3 | 24.0 | **23.1** | −5.3 | −0.9 |
| Distinct champions (C, monitor) | — | 5.8 | 5.3 | **5.1** | −0.7 | −0.2 |

**What Phase D changed against Phase C:**
- **Improved:** rebuilding clubs are younger, successors are readier, and pick alignment is unchanged.
- **Worse:**
  1. **Young players in AI–AI payments rose from 46.6 to 56.4.** Every one of the 671 sales was paid with a young player; the existing judge always ranks that above picks alone. Without the sales the measure is **48.6**, the baseline level. This is a design conflict: R4 pays rebuilders in youth, which the measure counts as a fault (§8 decision 3).
  2. **Persistent weak groups rose by 1.6 / 1.2.** Rebuilders sell a starter, and let veterans past onset go, before their successors are ready.
  3. **Ordinary persistent losers rose from 87 to 96% (C).** Rebuilds are long (4.5 seasons on C), and a rebuilding ordinary club loses more while it rebuilds. Recovery within 3 seasons is unchanged against Phase C (−3.2, n.s.) and better than v42.17.0 (+10.9).

## 4. Experiments (scratch builds from `c132ce4`; C seeds 106–110 × 20; never committed)
**D6 rebuild-nudge options:**

| Option | Result |
|---|---|
| 1 Keep the current nudge (the build) | — |
| 2 Younger generated replacements (22–26) for rebuilding clubs | **No effect at all**: every measure identical to option 1 |
| 3 Draft capital in the assistance calculation | **No effect at all** |

**Why the options do nothing:**
- In all 200 C seasons the nudge boosted a club 653 times, and **every boost went to a gym** (464 Contend, 189 Compete). No ordinary club, and so no rebuilding club, ever fell 4 below its target.
- The slowdown band and the anchors hold ordinary clubs at or above their target. So a rebuild-specific nudge has nothing to act on.

**Recommendation:** keep option 1. Option 2 (the owner's preference) is harmless but unobservable under the approved anchors. Revisit it only if the ordinary anchors or bands change.

**D5 rebuild potential weight, 0.35 (the build) against 0.20:**

| Measure | 0.35 | 0.20 | 0.20 − 0.35 |
|---|---|---|---|
| Struggling clubs after 3 seasons: potential | 71.81 | 71.76 | −0.11 [−0.37, +0.12] |
| Struggling clubs after 3 seasons: starter age | 25.59 | 25.60 | +0.10 [+0.04, +0.16] |
| Gym lead from season 8 | 5.02 | 5.73 | **+0.83 [+0.15, +1.42]** |
| Gym lead, season 20 | 6.0 | 6.84 | **+1.13 [+0.30, +1.88]** |
| Ordinary persistent losers | 95.7 | 88.6 | −5.7 [−11.4, 0] |
| Recovery within 3 seasons | 42.0 | 44.9 | +6.4 [−2.0, +14.3] |

- 0.35 buys no measurable potential for rebuilders; it makes them only 0.1 years younger.
- 0.20 leaves the gym lead nearer its floor, and fewer persistent losers.
- These are 5 seeds without held-out confirmation, so the comparison is indicative.
- **Recommendation for the owner's decision:** revert the Rebuild weight to 0.20 (no rebuild-specific potential weight). The build keeps the approved test value 0.35 until then.

## 5. Acceptance requirements
### 5.1 Hard gates
| Gate | Requirement | Result | Status |
|---|---|---|---|
| Integrity | 0 | 0 problems and 0 errors in 239 Phase D validation runs, plus the experiment, managing-owner and held-out runs (§9) | **pass** |
| Determinism and non-interference | identical hashes | §9 | {{DET}} |
| Save compatibility | v42.16/17 saves play through and round-trip | §9 | {{SAVE}} |
| Full suite | all tests, none weakened | §9 | {{SUITE}} |
| Trading tests | pass | `trading-second-pass`, `ai-trade-band`: pass | **pass** |
| §45.6 owner contract, Rookie (8 seeds) | ±5 | **+7.2** (AI +0.2); 24 seeds: +0.7 [−2.3, +4.2] (seeds 1–8 +6.8, 9–16 −2.8, 17–24 −1.9) | **FAIL** on the standard check; 24 seeds inside: **inconclusive**, carried forward |
| §45.6, Pro (8) | ±5 | −0.4 (AI +0.1) | **pass** |
| §45.6, All-Star (8) | ±5 | **+2.0** (AI −0.2); 24 seeds: −1.2 [−5.1, +2.8] | **pass** on the standard check (Phase C failed it at +6.8); the 24-seed interval just reaches past −5 |
| Owner drift, Rookie (36 seeds, seasons 1–8) | ±5 | **−4.1 [−6.7, −1.4]**; against Phase C +1.3 [−0.8, +3.2] | **FAIL classification preserved.** The point estimate is inside ±5 but the interval crosses the limit, which is not proof of passing |
| Owner drift, Pro (36) | ±5 | **−4.3 [−7.3, −1.1]**; against Phase C −1.0 [−3.7, +1.6] | within ±5, **interval crosses: inconclusive** |
| Owner drift, All-Star (36) | ±5 | **−1.5 [−4.6, +1.5]** | **pass** (whole interval inside) |
| Stage P | ≤ +10% | §9 | {{PERF}} |
| Phone width | affected screens | No screen changed in Phase D; the preview's checks are in §9 | {{PHONE}} |

### 5.2 Targets (every Task 6 target; status on the final build)
| Target | Band | Phase D | Status |
|---|---|---|---|
| Mode stability | report | 1.47 / 1.54 changes per club per 10 seasons | reported |
| Rebuilding clubs after 3 seasons | younger, higher potential than baseline | −3.87 years, +1.49 potential | **met** (supported against v42.17.0) {{HELDAGREE}} |
| Recovery from ≤ 2 wins | report; improved if anchors permit | 42.0% against 31.1% (v42.17.0) | improved against baseline; not against Phase C |
| Succession cover, B / C | ≥ 40 / ≥ 30 | 48.2 / see C | **met** |
| Misaligned picks | ≤ 7.4 | 4.4 | **met** |
| Round-1 starting within 2, all / late | ≥ 44 / ≥ 30 | 59.3 / 63.6 | **met** |
| Contract lengths | all present, staggered | 3-year 56%; largest expiry 52.9% | **met** |
| Young reserves' 3-season gain | ≥ +3 | 2.60 (slotted most of the time: +3.93, Phase C closeout) | **unmet** (kept; no slot or XP change) |
| Persistent weak groups | ≤ 8 / ≤ 5 / −30% | 11.3 / 9.1 / −10% | **unmet** (worse than Phase C) |
| Young-player trade participation | below 48.2 | 56.4 (48.6 without R4 sales) | **unmet**: design conflict with R4 (§8) |
| Gym win rate / title share / tier order | ≥ 60 / ≥ 75 / held | 80.6 / 99.0 / held 70% per seed | **met** |
| Gym lead ≥ 6, seasons 5–20 | ≥ 6 | from season 8: 5.02; seasons 5–7: 3.69 | **unmet** |
| Ordinary persistent losers / titles / playoff berths / season-20 lead | ≤ 50 / 5–15 / 20–30 / 6–12 | 95.7 / 1.0 / 21.8 / 6.0 | losers and titles **unmet**; berths and lead inside |
| Group 1 (ageing, careers) and Group 2 | as A-1/A-2 | unchanged from Phase C (no difference significant except physical change −0.04) | as Phase C |

### 5.3 Stage-by-stage note
Phase D changes AI behaviour only. The owner's team, valuation and deal rules are unchanged. The managing owner of §6 exists only in the diagnostic tool.

### 5.4 Development, reported for both populations
- **Broader eligible-reserve population (gated measure):** +2.60 (Phase C 2.58).
- **Consistently slotted** (a slot in ≥ 60% of eligible games; Phase C closeout diagnostic): +3.93.
- **Some slotting:** +2.32. **Never slotted:** +1.25.
- The gap is slot capacity (11.1 eligible reserves per club-game for 6 slots); slots and XP are unchanged.

## 6. Rookie drift and the owner-management diagnostic (supplementary; never replaces the gate)
**What the managing owner does** (`tools/balance-compare.mjs --owner=manager`):
- At renewal, lets reserves past their onset, or below the roster median, walk.
- After the draft, releases reserves past onset while the roster is above 30.
- Signs up to 4 free agents a season, each at least +2 over the weakest starter at the position, releasing his lowest value-per-salary reserves for room and never going over the cap.
- **Runs:** v42.17.0 and Phase D, Rookie 24 seeds and Pro 12 seeds × 8 seasons, board reset.

| Owner win rate, seasons 1–8 | v42.17.0 | Phase D | Drift |
|---|---|---|---|
| Rookie, hands-off | 76.0 | 72.6 | −3.4 [−6.9, 0.0] |
| Rookie, managing | 76.4 | 71.1 | −5.3 [−8.0, −2.5] |
| Pro, hands-off | 61.0 | 57.8 | −3.2 [−8.3, +2.0] |
| Pro, managing | 55.9 | 56.1 | +0.2 [−6.8, +6.8] |

- **Management does not close the drift.** On Phase D it changes the owner's win rate by −1.5 [−3.9, +0.8] (Rookie) and −1.6 [−4.7, +1.4] (Pro).
- **Why:** the managing owner finds a free agent at least +2 over his weakest starter only **0.15 times a season** on Rookie (29 signings in 192 seasons). The market rarely offers a replacement for a declining starter, so letting declining players go mostly shortens the roster.
- **Rookie seasons 6–8 are where the loss stays:** managing 70.8 / 56.9 / 38.4 against hands-off 65.3 / 67.6 / 41.7.
- **Conclusion:** the Rookie shortfall is not an artefact of a passive test owner that ordinary roster upkeep removes. With approved ageing, an owner can only offset decline through the draft and trades, not the free-agent market.
- **For the owner's design consideration:** a decision about owner-facing replacement supply (market quality) is outside Task 6's approved scope. The drift gate stays as approved.

## 7. Why gyms win about 99% of AI titles (C, 10 × 20 seasons; `tools/task6-gym-dominance.mjs`)
| Stage | v42.17.0 | Phase C | Phase D |
|---|---|---|---|
| Mean gym lead in team overall | 9.1 | 5.7 | 5.9 |
| Strongest AI club is a gym | 100% | 100% | 100% |
| Rank of the best ordinary club (of 15) | 8.0 | 7.5 | 7.6 |
| Regular season: gym against ordinary wins / predicted from overall alone / gym edge at equal overall | 85.8 / 82.5 / +3.3 | 81.0 / 78.0 / +3.0 | 81.8 / 78.6 / **+3.2** |
| Playoff berths held by gyms | 84.5% | 77.3% | 78.1% |
| Playoff rate at 5–6 wins, gym / ordinary | 93.6 / 70.4 | 91.4 / 76.8 | 92.3 / 79.1 |
| Ordinary clubs in the top 2 / top 4 by overall of the playoff field | 0 of 400 / 8 of 800 | 0 / 12 | 0 / 14 |
| Finalists: gym / ordinary rate among playoff clubs | 29.6 / 2.9 | 31.6 / 5.1 | 31.2 / 5.3 |
| Title rate when in the final, gym / ordinary | 50.4 / 28.6 | 52.1 / 5.6 | 51.8 / 11.1 |
| Gym title share: actual / predicted by strength alone | 99.0 / 97.2 | 99.5 / 96.5 | 99.0 / 96.4 |

**Findings:**
1. **Roster strength explains almost all of it.** A strength-only yardstick (the regular-season win curve applied to each playoff field) already gives gyms **96–97%** of titles in every build.
   - The mean lead fell from 9 to 6, but it is the top of the table that decides titles, and the top is all gym: the strongest club is always a gym, the best ordinary club ranks 7th–8th of 15, and no ordinary club ever held a top-2 overall spot in a playoff field (0 of 400 seasons).
   - The eight gym anchors (tier offsets, growth to season 10, legendaries) sit above every ordinary anchor, and the slowdown band holds ordinary clubs near theirs.
2. **Gym-specific advantages are small.** At equal overall a gym wins about **3 percentage points** more regular-season games against ordinary clubs (coach IQ +0.2, the legendary's plays, scheme). That is worth a fraction of an overall point.
3. **Qualification** follows wins. At 5–6 wins gyms qualify somewhat more often (tiebreaks and division structure). Matchups are proportional: 45% of games are gym against ordinary in every build.
4. **Postseason results add the last 2–3 points.** The rare ordinary finalist usually meets a stronger gym and wins only 6–11% of finals in Phase C/D.
5. **The two targets conflict.** By the same yardstick, ordinary playoff clubs would need about **+2 overall** to reach 5% of titles (+4 for about 13%). Raising ordinary clubs that much would cut the gym lead, which is already below its ≥ 6 floor (5.0).
   - The floor and the 5–15% ordinary title share can only both hold if the best ordinary clubs rise while the average ordinary club does not.
   - That is a change to anchors or bands, which needs the owner's decision (§8). Nothing was changed.

## 8. Unresolved conflicts and decisions for the owner
1. **Rookie drift:** FAIL preserved (point estimate −4.1 inside ±5, interval crosses). Phase D neither caused nor closed it, and management by the owner does not close it (§6). Options for the owner:
   - accept it, with the ageing rationale;
   - consider owner-side replacement supply (market quality; outside Task 6's scope);
   - keep it binding for M3.
2. **§45.6 Rookie (+7.2, 8 seeds)** fails on the standard check and passes on 24 seeds (+0.7). **All-Star now passes (+2.0).** Classification stays inconclusive for Rookie.
3. **R4 against the young-payment target:** the approved sale pays rebuilders in young players, which pushes the Task 5 measure to 56.4 (48.6 without sales). Options:
   - (a) keep R4 as approved and judge the measure without R4 sales;
   - (b) require picks first in sales (an implementation choice inside R4; fewer young players for rebuilders);
   - (c) accept the measure as unmet.
   - Recommendation: (a).
4. **Rebuild costs:** persistent weak groups and ordinary persistent losers worsened against Phase C. Starter sales are capped at one per window, and their limit is not raised. If the owner wants less cost, the levers inside the approved scope are fewer sales (the window cap stays), or the shorter rebuilds that a 0.20 potential weight appears to give.
5. **D5:** recommend reverting the Rebuild potential weight to **0.20** (§4); needs approval.
6. **D6:** keep the current nudge (option 1). Options 2 and 3 are inert under the approved anchors.
7. **Gym floor against ordinary titles:** the targets conflict as measured (§7). Pick one to prioritise, or authorise an anchor or band study. No change made.
8. **Development +2.60:** unmet, kept as decided.

## 9. Integrity, determinism, saves, performance, regression, preview
{{SEC9}}

## 10. Recommendation on M3
{{M3}}
