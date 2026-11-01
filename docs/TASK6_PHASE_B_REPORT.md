# Task 6 Phase B — Implementation and A-2/B Milestone Report (2026-10-31)

**Authorisation and status.**
- Phase B was authorised on 2026-10-31 under the approved specification (§1.8; §2, Phase B row), as one development assignment followed by the consolidated A-2/B milestone validation.
- **Not merged.** Production and the main game are untouched (main link still artifact version 115, v42.17.0). Phase C has not begun.
- The A-1 ageing and retirement mechanics are unchanged, and so are the A-2 settings (D9, D10a, ordinary bands at +4).
- Branch `task6-phase-b`, stacked on `task6-phase-a2`. Simulation code is commit **`7a14393`**; later commits change only tests, tools and documents.

## 1. What changed
| Item | Rule | Files |
|---|---|---|
| **R1 / D15: roster plan** | Derived per AI club, never stored, observable facts only. Position-relative gap against the league's starters (weak −4, severe −8); horizon = public onset − age (ageing ≤ 2); one successor per starter (26 or under, or 4+ years younger; within 8 or potential at the starter's overall; ready within 4); succession needs 2 and 1; weakness need | `src/franchise/roster-plan.js` (new) |
| **R3: contracts** | A starter past his public onset re-signs only without a ready successor. The designated successor always counts as value. Reserves stop re-signing past public onset + 2 (this replaces the fixed age 32). Length is 3 / 2 / 1 seasons by the onset, or 2 for an exceptional veteran. AI deals may run 3 seasons; the owner's stay at 2. The runaway rule never lets a successor walk | `league-season.js`, `contracts.js` (`leagueContract`) |
| **Cap-trim protection** | `trimToCap`, and the cap-room releases of the nudge and injury cover, release a designated successor only when no other reserve can go | `league-season.js` |
| **R6 / T3: successor valuation** | An AI club values its successor at 0.8 / 0.6 / 0.45 of a starter, by the starter's horizon, in AI–AI deals, the owner's proposals and incoming calls. The ask path uses the same shares (×1.35 / ×1.15). Never untradeable. The owner's roster is valued as before | `trade-value.js`, `trade-desk.js`, `trades.js` |
| **R7: need-aware drafting** | +4 for a succession need (+2 at level 1), up to +3 for a weak group (+1.5 at −4 rising to +3 at −8), −3 for a settled group. The plan is re-derived at every pick. Noise, the kicker penalty and the duplicate penalty are unchanged. Mode weights are Phase D | `draft.js`, `franchise.js` |
| **Tests** | `tests/task6-phase-b.test.js` (7). Three seed-dependent assertions in older tests made robust, with the same intent (§2) | |
| **Documents and tools** | GDD §56; `tools/task6-b-compare.mjs` | |

## 2. Test results
| Check | Result |
|---|---|
| New Phase B tests | 7 of 7 |
| Targeted run (league flows, franchise, ageing/retirement, news, careers, league season, trading second pass, Phase B) | 129 of 129, after three test fixes |
| **Full suite** on the final commit | 792 of 792 (§3) |
| Harness check: non-interference and determinism (seeds 1–2) | pass |
| Repeat run (B 51–60 twice) and smoke against validation (C 106–110) | identical hashes |
| Integrity: 41 benchmark, drift and contract runs | 0 problems, 0 errors |
| Save compatibility: 6 saves (owner-only, league, mid-season, offseason, 15-season), played 2 seasons on, round trip | 6 of 6, 0 problems |
| Stage P (alone, 3 repetitions, median) | 12.68 s against 12.01 s per season: **+5.6%** (gate +10%) |
| Phone-width UI | No screen changed in Phase B; the preview loads a save and renders HQ, roster and offseason at 390 px |

**The three test fixes.** Phase B's need-aware creation draft changes every new league, so three older assertions that depended on one seed's luck failed:
- **Media day:** two questions shared one nature, so the boosts added up. The assertion now expects one boost per answer of that nature, up to the cap.
- **AI–AI trades:** a monster was traded on a year later (there is no repeat-trade rule yet; that is trading track T4). The assertion now names his latest seller, and his history must still hold the deal.
- **Retirement pass:** a 45-year-old starter retires with about 82% chance, so the test now uses a draw seed where all four land.

No assertion was removed or loosened.

## 3. Hard gates at the A-2/B milestone
| Gate | Result |
|---|---|
| Integrity, legal rosters and cap | **pass** (0 problems in every run) |
| Determinism | **pass** (repeat hashes identical; harness check below) |
| Save play-through and round trip | **pass** |
| Full suite | **pass**: 792 tests; 790 on the first run, and the two release-stamp tests after `index.html` was re-stamped (the new `roster-plan.js` needed its import-map entry; the stamp stays 42.17.0) |
| Trading tests (Task 5) | inside the full suite |
| §45.6 contract: owner ±5, AI ±2 | **pass** on all three. Rookie +0.1 (AI +0.3); Pro +0.5 (+2.7 matched; AI +0.6); All-Star +3.3 (+3.4 matched; AI −0.5) |
| Owner drift against v42.17.0, seasons 1–8, ±5 | **Rookie FAIL** −6.3 [−10.8, −1.5]. Pro pass −4.9 [−9.5, 0.0], All-Star pass −2.5 [−7.2, +2.6] (24 seeds); both intervals reach past the band (escalate) |
| Stage P ≤ +10% | **pass** (+5.6%) |
| Phone-width browser check | **pass** (no changed screens) |

**Harness check** (seeds 1–2): the game alone and under the harness end in identical franchises (non-interference), and two harness runs give identical hashes (determinism).

**§45.6 Pro has recovered.** A-2's failure (−7.6) does not reproduce: Pro is now +0.5, or +2.7 on matched seasons. At A-2 the owner's team overall in the two modes differed by only 0.3, so the gap was in results, not strength. Results are within 8-seed noise.

**Rookie drift: diagnosis.**
- Seasons 1–7 are close to v42.17.0 (mean −3).
- Season 8 collapses: 69.4% → 41.7%, and 10 of 12 seeds fall. This is when the hands-off owner's starting roster passes its decline onset; his team overall is 2.3 below v42.17.0's while the AI is held at its target. A-1 showed the same trough (46.3%).
- Phase B changes nothing on the owner's side. It improved Pro from A-1's −7.9 to −4.9 and All-Star from −3.3 to −2.5.
- In seasons 9–20 the owner's win rate is still well below v42.17.0's (Rookie 25 against 45), though better than A-1's 14.
- **This is a conflict between approved requirements.** A-1 ageing applies to the owner. The AI is held to v42.17.0's curve by the contract gate. The hands-off owner is the drift gate's yardstick.
- Nothing inside Phase B's scope can close it without changing an approved parameter or the owner's rules (§7, decision 1).

## 4. Phase B targets (B = 80 ten-season seeds, C = 20 twenty-season seeds; Phase 0 thresholds, v42.17.0 baseline)
| Target | Band | v42.17.0 | **Phase B** | Outcome |
|---|---|---|---|---|
| Succession cover, Task 4 definition (30+ starter, backup 26 or under within 8), B / C | ≥ 40 / ≥ 30 | 17.6 / 11.4 | **28.7 / 23.6** | improved, **not met** |
| Succession cover, approved R1 definition (adds potential), B / C | report | 36.1 / 25.1 | **51.3 / 40.9** | supported improvement |
| Successor ready (within 4) | report | 5.3 | 6.7 | supported improvement |
| Misaligned picks (position-relative) | ≤ 7.4, pick quality kept | 10.6 | **12.1** | **worse** (A-1 14.1); diagnosis below |
| Round-1 overall (pick quality) | not lower | 61.0 | 63.2 | kept |
| Persistent weak group, club-relative / with cap room | ≤ 8 / ≤ 5 (C) | 11.9 / 9.8 | **13.3 / 11.5** | **worse** |
| Persistent weak group, position-relative | −30% | 15.7 | 15.0 (−5%) | improved, **not met** |
| Contract lengths 1 / 2 / 3 seasons | all present | 0 / 100 / 0 | 11.6 / 33.9 / 54.5 | **met** |
| Largest single expiry year (% of deals) | staggered | 54.0 | 51.9 | supported improvement |
| Young players in AI–AI payments | below baseline | 48.2 | 47.6 | no change |
| Round-1 starting for his club by year + 2 | ≥ 44 | 33.0 | 55.4 | **met** |
| Round-1 starting within 2 seasons (drafted in year 12+, C) | ≥ 30 | 14.4 | 63.4 | **met** |

**Misaligned picks: diagnosis** (instrumented re-run of B 1–10, identical to the benchmark).
- Of the 578 misaligned picks, **551 (95%) were made at a position with a succession need**. R7 by design gives a succession need +4, more than the most a weak group gets (+3).
- Succession needs are everywhere: 78% of all picks were made at such a position, and a club has on average 3.2 groups with an ageing starter and no successor.
- The yardstick counts any pick at an above-average group as misaligned while another group is weak. So the approved R7 weights and the approved ≤ 7.4% target pull against each other.
- 31% of succession-driven picks (mostly round 3) cannot become the successor: their potential is below the starter's overall and they are not within 8.
- A refinement inside the approved design is ready: give the +4 only to a prospect who would qualify as the successor. It is not applied, because it changes every draft and would need another full validation; it is best validated once, together with your decision on R7 (§7, decision 3).

**Succession, Task 4 definition.** R1 counts a high-potential youngster as the successor (approved), so a club's need is met by a draftee years before he is within 8. That is why the expanded measure passes and the Task 4 measure does not.

## 5. Integrated evaluation (with A-1 and A-2)
**Gym protection** (C, 10 twenty-season seeds):
| Measure | Floor | v42.17.0 | A-1 | **A-2 + B** |
|---|---|---|---|---|
| Gym win rate against ordinary clubs | ≥ 60 | 84.7 | 87.8 | 81.9 |
| Gym share of AI titles | ≥ 75 | 98.9 | 97.5 | 97.5 |
| Gym lead, minimum from season 8 | ≥ 6 | 6.3 | 6.8 | **5.6** |
| Gym lead, seasons 5–7 (minimum) | ≥ v42.17.0 | 4.6 | 4.2 | **3.9** |
| Gym lead, season 20 | 6–12 | 15.2 | 15.5 | 6.6 |
| Tier order (pooled) | held | held | held | held |

- Two floor measures fail.
- The minimum falls at **season 8**: mean lead 5.7, against 6.3 in v42.17.0 and 6.8 in A-1. That is before the D10a plateau begins (after season 10), so the plateau is not the cause. The early ordinary-club lift from D9 draft scaling and faster turnover is.
- On the same 5 seeds Phase B raised the season-8+ minimum from A-2's 5.9 to 6.1.
- Not forced (§7, decision 2).

**Ordinary-club competitiveness** (C; evaluation targets):

| Measure | Target | v42.17.0 | **A-2 + B** |
|---|---|---|---|
| Persistent losers | ≤ 50% | 90% | 86% |
| Share of titles | 5–15% | 1.1% | 2.5% |
| Share of playoff berths | 20–30% | 15.5% | 19.8% |
| Gym lead, season 20 | 6–12 | — | 6.6 (in corridor) |

- All move the right way, but most are still short. Free-agency upgrades (Phase C) and modes (Phase D) are the remaining levers.

**Rookies against veterans** (B):

| Measure | v42.17.0 | A-1 | A-2 (5 seeds) | **A-2 + B** |
|---|---|---|---|---|
| Round-1 picks starting in their first season | 29.8% | 34.7% | 45% | **50.7%** |
| Gap from round-1 pick to the starter floor | 5.8 | — | — | 2.0 |

- Veterans still start (84.6%; floor 50%).
- Phase B adds to D9: picks go where starters are weak or ageing, and a declining starter with a ready successor walks. Rookies therefore mostly replace weak or declining starters rather than established ones. The volume is high, and it is for you to judge (§7, decision 4).

**Weak position groups:**
- Position-relative persistent weakness: 15.0%, a modest improvement.
- Club-relative: 13.3%, slightly worse than v42.17.0.
- Phase B's levers here are only the draft and contracts. The R5 free-agency upgrades (Phase C) are designed for this.

**A-1 measures carried:**
- starters aged 33+ at season 20: 8.4%;
- starter age: 27.2 at season 10, 26.8 at season 20 (band 27–30; 0.2 under at season 20);
- retirements: 21.4 a season;
- ordinary improvement at 33+: 1.0% (≤ 2%).

## 6. Development preview
- **Build:** `v42.18.2-dev.b` (branch `task6-phase-b-preview`): the Phase B code plus only the version label, the test-build switch and the new `?v=42.18.2` stamp.
- **Published** to the private development test link (version `1793500213-2aca`), as the owner asked for "a private playable preview for my review". The main game is untouched.
- **What to test:**
  - AI clubs re-signing young successors on 3-year deals, and letting declining starters with a ready successor walk;
  - successors priced higher on the trade desk;
  - AI picks at positions of need (League News and the draft board);
  - ageing and the A-2 changes unchanged.

## 7. Decisions needed
1. **Rookie owner drift (binding, failing).**
   - (a) Keep it binding and re-measure at M2: Phase C's maturation (C2) and GM development slots are the first owner-side growth tools.
   - (b) Recalibrate the difficulty curve from about season 6, for Rookie or for all levels. This is a design change, and the AI contract yardstick moves with it.
   - (c) Measure drift with an active-owner proxy. This is a methodology change.
   - **Recommendation:** (a), with (b) prepared if M2 still fails.
2. **Gym floor (5.6 from season 8; 3.9 in seasons 5–7).** The shortfall comes before the plateau.
   - (a) Accept, and re-measure after Phase C.
   - (b) A small early gym-anchor adjustment for seasons 5–9. This changes approved D10a.
   - **Recommendation:** (a).
3. **R7 against the misaligned target (12.1% against ≤ 7.4%).**
   - (a) Apply the qualifying-successor refinement (inside the design; expected to remove some, not all, of the excess).
   - (b) Reweight R7 so that weakness is not outranked by succession.
   - (c) Narrow "ageing" to a horizon of 1.
   - (d) Count succession-need picks as aligned in the yardstick.
   - **Recommendation:** (a) plus a decision between (b) and (d), validated together in one run.
4. **Rookie strength:** 51% of round-1 picks start in their first season. Accept, or ask for a dampener (for example, a lower D9 growth rate).
5. **Succession on the Task 4 definition** (28.7% / 23.6%): accept that R1's approved potential clause is the intended successor test, or tighten R1.
