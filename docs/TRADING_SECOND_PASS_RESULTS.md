# Trading Second Pass — results (Task 5)

Measured against the pre-registered thresholds of `TRADING_SECOND_PASS_PLAN.md` (T1–T15, with Addenda 1–3). Baseline is the original
v42.16.0 (`main` at db7c0c6), same seeds, same harness, same valuation function scoring both trees' deals. **Nothing here is
published, merged or released.** Several thresholds are not met; they are listed plainly in "Verdicts" and "Flags for the owner".

## Honest summary
- Position-blind pricing is gone. Kicker purchases fell from 16.8% of AI deals to 2.9% (pooled seeds 1–40) and first-round picks spent on kickers from 107 to 4. Every deal is within the fair-value band (100% vs 31%), and acquiring clubs get a starter in about 92% of deals (83% before).
- Volume is **higher**, not lower: 3.3 deals per season against 2.1. All of the increase is the in-season window the root-cause fix reopened (about 0.95 deals per season, against 0.03). The offseason is 1.13× baseline. T8 (volume ≤ 1.5×) therefore **fails**. No minimum was forced; the fix removed two blockers and the deals that followed passed the same value, need and gain checks.
- Three secondary measures are **not better** and the sampling noise does not clearly absolve them: season-end lineup problems (pooled 67 vs 54), persistent-loser share (+2 to +4 points on some samples), and a marginal kicker count in the 20-season stage.

## Results by sample
Design 1 is the first implementation (before Addendum 2). Final design is the delivered code. Seeds 1–20 are the seeds used during
development; seeds 21–40 were held out and run once (`conf`); `pool` combines them.

### First design, seeds 1–20 (superseded; kept for the record)
| # | Area | base | t5 | Rule | Result |
|---|---|---|---|---|---|
| T1 | Integrity | 0 problems, 0 exceptions | 0 problems, 0 exceptions (stages with any: none) | zero violations and exceptions in every stage | pass |
| T2 | Lineups, cap, rosters | lineup 23, over cap 0, roster 27–38 | lineup 18, over cap 0, roster 28–38 | zero cap violations, rosters 26–38, season-end lineup problems not worse than baseline (season-start lineups are in T1) | pass |
| T3 | Kickers | 14.3% of deals; 51 first-round picks for kickers (17.5% of 292) | 3.4% of deals; 2 first-round picks for kickers (2.1% of 94) | share ≤ 8%; ≤ 3 first-round picks for kickers per 20 seeds; ≤ 10% of first-round picks spent | pass |
| T4 | Fairness (market value) | median 0.95, 34.2% in band (n=406) | median 1.09, 100% in band (n=803) | ≥ 95% within 0.85–1.18; median 0.95–1.15 | pass |
| T5 | Shoppers improve | acquired starter 81.3% | acquired starter 92.3%; floor change median 5 (92.9% ≥ +2); starter mean never falls 97.1% | acquired starter ≥ 85%; floor change median ≥ +2; shopper starter mean never falls in ≥ 95% | pass |
| T6 | Sellers do not lose | not recorded at deal time | seller starter mean never falls in 99.9% (unchanged in 90.2%) | never falls in ≥ 95% (Addendum 2 wording) | pass |
| T7 | In-season (informational, no minimum) | 2 deals | 336 deals | ≥ baseline, or the funnel names an approved rule as the limiter | pass |
| T8 | Volume | 2.04 per season | 4.01 per season | not above 1.5× baseline (a fall is fine if T3–T6 hold) | **FAIL** |
| T9 | Consequences | age median 25; leave within a season 12% | age median 25; leave within a season 10.1% | age median ≤ 27; leaving within a season ≤ 15% | pass |
| T10 | Unaddressed weakness | 11.8% persistent weak group with cap room | 9.2% | not higher than baseline + 2 points | pass |
| T11 | Competition | distinct champions 4, max title share 0.7, team-overall sd 3.74, persistent losers 35.3% | distinct champions 4, max title share 0.7, team-overall sd 3.67, persistent losers 40% | distinct champions ≥ base − 0.5; max title share not above baseline (Addendum 2); sd within ±15%; persistent losers ≤ base + 2 | **FAIL** |
| T13 | Performance (Stage B wall time; the dedicated Stage P timing decides) | 23.5 s/season | 25.5 s/season | within +10% (indicative only: lanes shared the machine) | pass |

### Final design, seeds 1–20
| # | Area | base | t5v2 | Rule | Result |
|---|---|---|---|---|---|
| T1 | Integrity | 0 problems, 0 exceptions | 0 problems, 0 exceptions (stages with any: none) | zero violations and exceptions in every stage | pass |
| T2 | Lineups, cap, rosters | lineup 23, over cap 0, roster 27–38 | lineup 38, over cap 0, roster 27–38 | zero cap violations, rosters 26–38, season-end lineup problems not worse than baseline (season-start lineups are in T1) | **FAIL** |
| T3 | Kickers | 14.3% of deals; 51 first-round picks for kickers (17.5% of 292) | 3.2% of deals; 3 first-round picks for kickers (3.6% of 83) | share ≤ 8%; ≤ 3 first-round picks for kickers per 20 seeds; ≤ 10% of first-round picks spent | pass |
| T4 | Fairness (market value) | median 0.95, 34.2% in band (n=406) | median 1.07, 100% in band (n=654) | ≥ 95% within 0.85–1.18; median 0.95–1.15 | pass |
| T5 | Shoppers improve | acquired starter 81.3% | acquired starter 91.6%; floor change median 5 (92.4% ≥ +2); starter mean never falls 96.3% | acquired starter ≥ 85%; floor change median ≥ +2; shopper starter mean never falls in ≥ 95% | pass |
| T6 | Sellers do not lose | not recorded at deal time | seller starter mean never falls in 99.5% (unchanged in 89.1%) | never falls in ≥ 95% (Addendum 2 wording) | pass |
| T7 | In-season (informational, no minimum) | 2 deals | 183 deals | ≥ baseline, or the funnel names an approved rule as the limiter | pass |
| T8 | Volume | 2.04 per season | 3.27 per season | not above 1.5× baseline (a fall is fine if T3–T6 hold) | **FAIL** |
| T9 | Consequences | age median 25; leave within a season 12% | age median 25; leave within a season 9.2% | age median ≤ 27; leaving within a season ≤ 15% | pass |
| T10 | Unaddressed weakness | 11.8% persistent weak group with cap room | 9.7% | not higher than baseline + 2 points | pass |
| T11 | Competition | distinct champions 4, max title share 0.7, team-overall sd 3.74, persistent losers 35.3% | distinct champions 5, max title share 0.8, team-overall sd 3.7, persistent losers 39.3% | distinct champions ≥ base − 0.5; max title share not above baseline (Addendum 2); sd within ±15%; persistent losers ≤ base + 2 | **FAIL** |
| T13 | Performance (Stage B wall time; the dedicated Stage P timing decides) | 23.5 s/season | 19.1 s/season | within +10% (indicative only: lanes shared the machine) | pass |

### Final design, held-out seeds 21–40
| # | Area | base | t5v2 | Rule | Result |
|---|---|---|---|---|---|
| T1 | Integrity | 0 problems, 0 exceptions | 0 problems, 0 exceptions (stages with any: none) | zero violations and exceptions in every stage | pass |
| T2 | Lineups, cap, rosters | lineup 31, over cap 0, roster 27–38 | lineup 29, over cap 0, roster 27–38 | zero cap violations, rosters 26–38, season-end lineup problems not worse than baseline (season-start lineups are in T1) | pass |
| T3 | Kickers | 19.2% of deals; 56 first-round picks for kickers (19.7% of 284) | 2.6% of deals; 1 first-round picks for kickers (1.2% of 84) | share ≤ 8%; ≤ 3 first-round picks for kickers per 20 seeds; ≤ 10% of first-round picks spent | pass |
| T4 | Fairness (market value) | median 0.95, 28.6% in band (n=426) | median 1.08, 100% in band (n=666) | ≥ 95% within 0.85–1.18; median 0.95–1.15 | pass |
| T5 | Shoppers improve | acquired starter 84.3% | acquired starter 91.7%; floor change median 5 (91.1% ≥ +2); starter mean never falls 97.1% | acquired starter ≥ 85%; floor change median ≥ +2; shopper starter mean never falls in ≥ 95% | pass |
| T6 | Sellers do not lose | not recorded at deal time | seller starter mean never falls in 99.7% (unchanged in 89.9%) | never falls in ≥ 95% (Addendum 2 wording) | pass |
| T7 | In-season (informational, no minimum) | 5 deals | 190 deals | ≥ baseline, or the funnel names an approved rule as the limiter | pass |
| T8 | Volume | 2.13 per season | 3.33 per season | not above 1.5× baseline (a fall is fine if T3–T6 hold) | **FAIL** |
| T9 | Consequences | age median 26; leave within a season 15.5% | age median 24; leave within a season 9.2% | age median ≤ 27; leaving within a season ≤ 15% | pass |
| T10 | Unaddressed weakness | 12.3% persistent weak group with cap room | 9.7% | not higher than baseline + 2 points | pass |
| T11 | Competition | distinct champions 4, max title share 0.9, team-overall sd 4, persistent losers 39% | distinct champions 4, max title share 0.8, team-overall sd 3.9, persistent losers 39% | distinct champions ≥ base − 0.5; max title share not above baseline (Addendum 2); sd within ±15%; persistent losers ≤ base + 2 | pass |
| T13 | Performance (Stage B wall time; the dedicated Stage P timing decides) | 21.8 s/season | 21.1 s/season | within +10% (indicative only: lanes shared the machine) | pass |

### Final design, pooled seeds 1–40
| # | Area | base | t5v2 | Rule | Result |
|---|---|---|---|---|---|
| T1 | Integrity | 0 problems, 0 exceptions | 0 problems, 0 exceptions (stages with any: none) | zero violations and exceptions in every stage | pass |
| T2 | Lineups, cap, rosters | lineup 54, over cap 0, roster 27–38 | lineup 67, over cap 0, roster 27–38 | zero cap violations, rosters 26–38, season-end lineup problems not worse than baseline (season-start lineups are in T1) | **FAIL** |
| T3 | Kickers | 16.8% of deals; 107 first-round picks for kickers (18.6% of 576) | 2.9% of deals; 4 first-round picks for kickers (2.4% of 167) | share ≤ 8%; ≤ 3 first-round picks for kickers per 20 seeds; ≤ 10% of first-round picks spent | pass |
| T4 | Fairness (market value) | median 0.95, 31.4% in band (n=832) | median 1.08, 100% in band (n=1320) | ≥ 95% within 0.85–1.18; median 0.95–1.15 | pass |
| T5 | Shoppers improve | acquired starter 82.8% | acquired starter 91.7%; floor change median 5 (91.7% ≥ +2); starter mean never falls 96.7% | acquired starter ≥ 85%; floor change median ≥ +2; shopper starter mean never falls in ≥ 95% | pass |
| T6 | Sellers do not lose | not recorded at deal time | seller starter mean never falls in 99.6% (unchanged in 89.5%) | never falls in ≥ 95% (Addendum 2 wording) | pass |
| T7 | In-season (informational, no minimum) | 7 deals | 373 deals | ≥ baseline, or the funnel names an approved rule as the limiter | pass |
| T8 | Volume | 2.08 per season | 3.3 per season | not above 1.5× baseline (a fall is fine if T3–T6 hold) | **FAIL** |
| T9 | Consequences | age median 25; leave within a season 13.8% | age median 24; leave within a season 9.2% | age median ≤ 27; leaving within a season ≤ 15% | pass |
| T10 | Unaddressed weakness | 12.1% persistent weak group with cap room | 9.7% | not higher than baseline + 2 points | pass |
| T11 | Competition | distinct champions 4, max title share 0.9, team-overall sd 3.87, persistent losers 37.2% | distinct champions 5, max title share 0.8, team-overall sd 3.8, persistent losers 39.2% | distinct champions ≥ base − 0.5; max title share not above baseline (Addendum 2); sd within ±15%; persistent losers ≤ base + 2 | pass |
| T13 | Performance (Stage B wall time; the dedicated Stage P timing decides) | 22.7 s/season | 20.1 s/season | within +10% (indicative only: lanes shared the machine) | pass |

### Final design, 20-season stage (seeds 106–110)
| # | Area | base | t5v2 | Rule | Result |
|---|---|---|---|---|---|
| T1 | Integrity | 0 problems, 0 exceptions | 0 problems, 0 exceptions (stages with any: none) | zero violations and exceptions in every stage | pass |
| T2 | Lineups, cap, rosters | lineup 19, over cap 9, roster 27–38 | lineup 21, over cap 12, roster 28–38 | zero cap violations, rosters 26–38, season-end lineup problems not worse than baseline (season-start lineups are in T1) | **FAIL** |
| T3 | Kickers | 16.6% of deals; 33 first-round picks for kickers (19.4% of 170) | 3.7% of deals; 4 first-round picks for kickers (6.6% of 61) | share ≤ 8%; ≤ 3 first-round picks for kickers per 20 seeds; ≤ 10% of first-round picks spent | **FAIL** |
| T4 | Fairness (market value) | median 0.92, 30.6% in band (n=229) | median 1.08, 100% in band (n=377) | ≥ 95% within 0.85–1.18; median 0.95–1.15 | pass |
| T5 | Shoppers improve | acquired starter 72.1% | acquired starter 90.5%; floor change median 5 (92.6% ≥ +2); starter mean never falls 96.3% | acquired starter ≥ 85%; floor change median ≥ +2; shopper starter mean never falls in ≥ 95% | pass |
| T6 | Sellers do not lose | not recorded at deal time | seller starter mean never falls in 100% (unchanged in 87.3%) | never falls in ≥ 95% (Addendum 2 wording) | pass |
| T7 | In-season (informational, no minimum) | 3 deals | 132 deals | ≥ baseline, or the funnel names an approved rule as the limiter | pass |
| T8 | Volume | 2.29 per season | 3.77 per season | not above 1.5× baseline (a fall is fine if T3–T6 hold) | **FAIL** |
| T9 | Consequences | age median 26; leave within a season 20.5% | age median 26; leave within a season 9.5% | age median ≤ 27; leaving within a season ≤ 15% | pass |
| T10 | Unaddressed weakness | 13.2% persistent weak group with cap room | 10.8% | not higher than baseline + 2 points | pass |
| T11 | Competition | distinct champions 5, max title share 0.75, team-overall sd 5.68, persistent losers 57.3% | distinct champions 6, max title share 0.7, team-overall sd 5.7, persistent losers 56% | distinct champions ≥ base − 0.5; max title share not above baseline (Addendum 2); sd within ±15%; persistent losers ≤ base + 2 | pass |
| T13 | Performance (Stage B wall time; the dedicated Stage P timing decides) | 21 s/season | 20.3 s/season | within +10% (indicative only: lanes shared the machine) | pass |

### Stress scenarios (6 scenarios × seeds 1–5, 6 seasons)
| Scenario | Integrity problems (base / new) | Exceptions | Season-end lineup problems | Season-end over cap | Roster range, new | AI–AI deals (base / new) | Persistent weak with cap room % |
|---|---|---|---|---|---|---|---|
| aging | 0 / 0 | 0 / 0 | 1 / 3 | 0 / 0 | 31–38 | 53 / 83 | 10.4 / 6.4 |
| expiring | 0 / 0 | 0 / 0 | 3 / 4 | 0 / 0 | 25–38 | 53 / 77 | 7.5 / 5.3 |
| thin | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 27–38 | 69 / 80 | 8.5 / 4.3 |
| injuries | 0 / 0 | 0 / 0 | 2 / 3 | 0 / 0 | 31–38 | 53 / 78 | 9.3 / 7.5 |
| rebuild | 0 / 0 | 0 / 0 | 2 / 4 | 0 / 0 | 31–38 | 64 / 97 | 8.5 / 8.3 |
| picks | 0 / 0 | 0 / 0 | 4 / 2 | 0 / 0 | 30–38 | 48 / 78 | 9.6 / 8.3 |


The `expiring` scenario shows a minimum roster of 25 (baseline 27), below the 26 floor of T2. It is a one-club-week minimum, not an end-of-season figure, and no integrity problem or exception was raised; it is reported rather than explained away, and is a Task 5.5 item.

### By position (pooled seeds 1–40, Stage B)
| | QB | RB | WR | TE | OL | DL | LB | CB | S |
|---|---|---|---|---|---|---|---|---|---|
| Starter mean overall, baseline | 74.1 | 72.4 | 68.5 | 70.5 | 66.9 | 68.2 | 69.1 | 69.2 | 69.1 |
| Starter mean overall, Task 5 | 74.4 | 72.5 | 68.7 | 70.7 | 67.1 | 68.3 | 69.2 | 69.4 | 69.3 |
| Persistent weak-group club-seasons, baseline | 66 | 76 | 26 | 137 | 233 | 92 | 54 | 85 | 77 |
| Persistent weak-group club-seasons, Task 5 | 48 | 48 | 23 | 85 | 222 | 78 | 56 | 67 | 49 |
| Deals acquiring the position, baseline | 87 | 73 | 55 | 109 | 79 | 67 | 76 | 72 | 75 |
| Deals acquiring the position, Task 5 | 73 | 90 | 241 | 97 | 150 | 186 | 145 | 177 | 123 |
| First-round picks spent on the position, baseline | 62 | 60 | 38 | 70 | 49 | 41 | 47 | 47 | 55 |
| First-round picks spent on the position, Task 5 | 29 | 44 | 2 | 53 | 0 | 1 | 7 | 25 | 2 |

Kickers (not in the table above, which follows the Task 4 starter groups): deals acquiring a kicker 140 → 38; first-round picks spent on kickers 107 → 4.

## Verdicts against the pre-registered thresholds
| Threshold | Verdict | Note |
|---|---|---|
| T1 integrity | pass everywhere | zero problems and exceptions in every stage |
| T2 lineups / cap / rosters | **fail** on seeds 1–20 (38 vs 23), pooled (67 vs 54) and C (over cap 12 vs 9); pass on 21–40 (29 vs 31) | Differences are within sampling noise but in the wrong direction. Season-**start** lineups are clean in both trees; the season-end figure is empty starting slots (about 3% in both trees). Over-cap at season end is a pre-existing phenomenon. |
| T3 kickers | pass on every B sample; **fail marginally in C** (4 first-round picks, 6.6% of 61) | elite kickers or empty-slot fills; still 33 → 4 |
| T4 fairness | pass | |
| T5 shoppers improve | pass | |
| T6 sellers do not lose | pass | |
| T7 in-season | pass | informational; funnel in the plan |
| T8 volume | **fail** | 1.56–1.65× baseline, entirely the repaired in-season window |
| T9 consequences | pass | |
| T10 weak groups with cap room | pass | 12.1% → 9.7% |
| T11 competition | **fail** on seeds 1–20 (persistent losers +4.0), pass pooled (+2.0, within noise) | |
| T13 performance | pass | dedicated timing: see "Performance" |

## Position leverage
Derived with paired engine games (`tools/position-leverage.mjs`, `docs/trading-second-pass/position-leverage-study.json`), shrunk, applied at half strength, clamped to 0.6–1.6 and normalised slot-weighted. Kickers come out at 0.79: neither worthless nor banned, and a kicker above 68 is priced as a real asset. Half strength is a judgement call; see the flags.

## Owner scenarios, tests, saves, browser, performance
- Twelve owner scenarios (`tools/owner-trading-scenarios.mjs`) run through the game's own desk functions on played franchises, including a reload that keeps the proposal count and the same answer.
- `tests/trading-second-pass.test.js`: 28 tests (valuation, legality, cap, protected monsters, windows, flip lock, dump and many-small-picks refusals, counters, incoming offers, determinism, save compatibility).
- Save compatibility: old saves load; new fields are additive.
- Browser/mobile: `tools/trade-desk-check.py` drove the desk at desktop and phone widths; screenshots checked for overflow and tap size.
- Performance: a per-call read-only cache took AI trading from about 670 ms to 47–72 ms per call (`tools/trade-perf-check.mjs`); determinism verified with identical hashes on repeated runs.
- Full automated suite (`npm test`, run alone) on final implementation commit 30632f6: 755 tests, 755 pass, 0 fail. Later commits change documentation only.

## Harness defect disclosure
The first benchmark runs mis-valued some deals: in-season deals were scored on ratings that drift after the deal, and the harness read the draft class year at observation time instead of at the deal. Harness v2 stores the at-deal values; v1 outputs are repaired exactly in the compare tool, which reproduces the corrected baseline ratio (1.04). All tables above use the repaired values. The bar of 6/24 was tried once, broke an in-season test, and was reverted (Addendum 3); that commit carried a failing test for a short time.

## Flags for the owner (decisions, not changes)
1. **Volume (T8).** The in-season bar is `AI_TRADE_RULES.season` (upgrade 4, minGain 16), one line. Raise it for fewer in-season deals; the cost is that the original root-cause blockers return. No quota exists either way.
2. **Position leverage strength** is half the measured value. Stronger would sharpen position prices and reduce quantity further.
3. **Replacement gap of 6 overall** to sell a starter now also applies to owner proposals and incoming offers.
4. **AI–AI clubs still sell only spares**, an approved restriction left unchanged.
5. **Owner in-season window stays closed**, as approved.
6. **Rookie-difficulty ask-path round trip:** a pick buys at 1/1.35 and can be combined with a sale in a later year. Not exploited by any scenario; worth watching in real saves.

## For Task 5.5
No empty-starting-slot penalty exists in roster worth (candidate change, not made). OL persistent weakness 233 → 222 club-seasons. See `POST_TRADING_BENCHMARK_PLAN.md` and `tools/post-trading-benchmark.sh`. Task 6 is not begun.
