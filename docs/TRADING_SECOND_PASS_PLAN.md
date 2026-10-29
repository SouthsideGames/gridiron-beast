# Trading Second Pass — pre-registered plan and criteria (Task 5)

Written and committed **before** any Task 5 benchmark run. The metric definitions, the sample, and the thresholds that turn a
number into a pass or a finding are fixed here. Results are reported in `TRADING_SECOND_PASS_RESULTS.md`. If a definition has to
change after this point, the report says so and why. Parameters are **frozen** at this commit: if a result sends the design back
for a change, the change is re-confirmed on the reserved fresh seeds (21–40) and reported as a change, never folded in silently.

> **Erratum (before any Task 5 benchmark run):** T4 first read "within 0.85–1.15; median 0.95–1.05". A pilot showed the band is applied as given ÷ received, so received ÷ given runs 0.87–1.18, and that deals sit nearer the shopper's side of the band than the baseline's position-blind figures did (a shopper must gain by its own roster measure). T4 was restated as above. No threshold was changed after seeing a Stage B result.

> **Addendum 2 (after the first Stage B half-run of the frozen design, seeds 1–10; recorded before any further run).** The frozen design
> passed the kicker, fairness and shopper-gain thresholds but made **3.87 deals a season against 2.06** and **1.56 in-season deals a
> season against 0.01**: nearly every weekly attempt (25% chance, weeks 2–8) became a deal, which is not the "occasional deal" of GDD
> §46.5 and breaches T8 (≤ 1.5× baseline). The owner's brief prefers fewer intelligent trades. Change made (one, in-season only): an
> in-season deal must lift the shopper's weakest starter by **4** overall (was 2) and gain **16** roster-worth (was 8), twice the offseason bar.
> The weekly chance, the weeks, the offseason cap, the band, spares-only selling and every legality rule are untouched. A probe on
> seeds 1–4 × 4 seasons gave 0.50 in-season deals a season. Per the rule above, the **final design is confirmed on the reserved seeds 21–40**
> (both trees); seeds 1–20 are rerun for the matched comparison and the frozen design's own seed 1–20 run is reported alongside, as a first
> result. Two threshold *wordings* are also clarified before the final run, with no change of level: T6 asks that the seller's starter mean
> **never falls** (sellers may gain a starter from a swap, which is not a loss; the "unchanged" figure is still reported), and T11's absolute
> clause "no club ≥ 40% of a seed's titles" is already breached by the baseline (a Task 4 finding), so it is judged as "not worse than baseline".
> T2's "zero lineup failures" is read at the **season start** (what `validateClubs` checks); the season-end `lineupProblems` count is
> reported for both trees and is judged as "not worse than baseline".

> **Addendum 3 (after Stage B on the reserved seeds 21–40 with the Addendum 2 design; recorded before any further run).** With the in-season bar
> at 4 / 16 the confirmation seeds gave: kickers 2.6% of deals (baseline 19.2%) and 1 first-round pick for a kicker (baseline 56); every
> fairness, shopper-gain, seller, consequence, weakness and competition threshold passed; **volume 3.33 deals a season against 2.13 (1.56×; limit
> 1.5×)**, 0.95 of them in season (0.03 at baseline). T8 therefore failed narrowly. The in-season deals' own data (median starter-floor gain
> +6; 107 of 190 gained 6 or more) shows a bar of **6 overall / 24 roster-worth, three times the offseason bar,** keeps the in-season repair
> (about 0.5 deals a season) and brings the total near 3 a season. That is the second and last change to the design. It is confirmed on new
> reserved seeds **41–60** (both trees); seeds 1–20 are rerun with the final design for the matched comparison, and the first design's
> (seeds 1–20) and the Addendum 2 design's (seeds 21–40) results are reported as earlier results, not hidden.

## Code under test
- **Baseline:** `main` at `db7c0c6` (PR #81 merged). Its game code is the published v42.16.0-run-game; the merge added documentation and tooling only.
- **Task 5:** branch `trading-second-pass`, forked from that commit. Football-engine files are unchanged (checked by diff in the results).
- Node v22, Linux container, 2 cores. Difficulty Pro, one tier, 16 clubs (15 persistent AI clubs + the owner). Same owner policy as Task 4 (hands-off owner, no trades, no calls answered), so the AI–AI league is what is measured.
- The harness is `tools/ai-franchise-benchmark.mjs` (extended in this task only to record more about each trade). The **same harness file** runs both trees (`--root`), and `--valuation=` scores both trees' deals with the one new position-aware function, so the two are compared on identical yardsticks.

## What changed (frozen parameters)
| Area | Value |
|---|---|
| Market value | `(max(6,(ovr−50)×4.2) × age + potential upside) × position leverage × contract factor` |
| Position leverage | QB 1.37 · RB 1.60 · WR 1.01 · TE 1.45 · OL 0.63 · DL 0.86 · LB 1.02 · CB 1.21 · S 0.90 · K 0.79 |
| Role share (roster worth) | starter 1 · first backup 0.45 · second 0.15 · rest 0.05 |
| Fairness band (AI–AI) | market value received ÷ given within 0.85–1.15 (the owner's rule of 2026-10-24, unchanged) |
| Gain required | shopper ≥ 8 points of roster worth, seller ≥ 2 |
| AI–AI sellers | sell only spares (unchanged rule); in-season: swaps, picks, or swap + picks |
| Owner proposals | margin above fair value by difficulty: Rookie 3% · Pro 6% · All-Star 12%; mood ±2% hashed from the proposal; 3 proposals per club and 8 per window; a just-traded monster cannot be moved again that season; a starter is for sale only if the next man is within 6 overall |

**Derivation of the leverage table.** `tools/position-leverage.mjs`: 2,000 paired games (same two generated teams, same seed, with and
without +10 overall for the starters of one group). Raw margin per overall point per slot, relative to the slot-weighted mean: QB 1.72,
RB 3.38, WR 0.89, TE 1.91, OL 0.34, DL 0.65, LB 0.91, CB 1.30, S 0.71, K 0.51 (standard errors 0.09–0.28). Shrunk toward 1 by noise
(almost no shrinkage: the effects are real), then taken at **half strength** (square root), clamped to 0.6–1.6 and rescaled to a
slot-weighted mean of 1. Half strength is a judgement call, not a measurement: raw ratios of 9 : 1 between positions would be a rigid
multiplier an owner could trade against. **Flagged for the owner's review.** Study data: `docs/trading-second-pass/position-leverage-study.json`.

## Stages and seeds
| Stage | Seeds | Seasons | Runs |
|---|---|---|---|
| B broad | 1–20 | 10 | baseline and Task 5, matched seed for seed |
| C long | 101–105 | 20 | baseline and Task 5 |
| D stress | 1–5 | 6 | the six Task 4 scenarios (aging, expiring, thin, injuries, rebuild, picks), both trees |
| P performance and determinism | 1–2 | 3 | each run twice per tree; wall time; heap |
| O owner scenarios | fixed fixtures | — | `tools/owner-trading-scenarios.mjs`, plus the focused and adversarial tests |
| Reserved | 21–40 | 10 | untouched; used only to confirm a change made after seeing Stage B |

Matched seeds give the same creation league; the leagues diverge once the first trade differs, so metrics are compared as distributions
over club-seasons, never by pairing an individual club-season.

## Metric definitions
Those of `AI_FRANCHISE_BENCHMARK_PLAN.md` apply unchanged (starters, backups, weak group, persistent weak group, resources available,
cap usage, competition, integrity). Added for trading:
- **Trade value, position-aware (`mvRatio`)** — `marketValue` of what the shopping club received ÷ what it gave, read at the first check after the deal, for both trees. The old position-blind `playerValue` ratio is also recorded and reported, but not thresholded (it is the yardstick the baseline was built on).
- **Shopper gain / seller loss** — change in starter mean and in the starter floor at the acquired position, from the club's snapshots before and after.
- **Acquired starter** — the acquired monster is a starter for the acquiring club at the first check after the deal.
- **Kicker share** — deals in which the acquired monster is a kicker ÷ all deals. **First-round pick for a kicker** — a deal where a round-1 pick is given for a kicker.
- **In-season trade** — a deal made in weeks 1–18 of a season (`week > 0`).
- **Consequence** — acquired monster's age; share who leave the acquiring club within one season; positions of acquirers' persistent weak groups before and after.

## Thresholds (fixed in advance)
| # | Area | Pass when (Stage B unless stated; Stage C must not contradict) |
|---|---|---|
| T1 | Integrity | zero invariant violations, exceptions, save round-trip changes — in every stage and scenario. Any is reported as a defect, not a metric |
| T2 | Lineups, cap, rosters | zero lineup failures, zero cap violations at a season start, every roster 26–38 after every deal |
| T3 | Kickers | kicker share of AI–AI trades ≤ 8% (baseline 14.3%); at most 3 first-round picks given for a kicker across Stage B, and kickers no more than 10% of all first-round picks spent (baseline: 51 of 58 kicker deals paid a first-round pick — the most of any position — 51 of 292 first-round picks spent, 17%) |
| T4 | Fairness | ≥ 95% of deals within 0.85–1.18 on `mvRatio` (received ÷ given by the shopper; the engine applies the owner's band as given ÷ received within 0.85–1.15, which is 0.87–1.18 this way round, the same range as the baseline's 0.87–1.176); median 0.95–1.15. `mvRatio` uses the values the clubs saw when they dealt (stored on the deal), because ratings move a little after an in-season deal |
| T5 | Do shoppers improve | acquired starter ≥ 85% of deals (baseline 81.3%); median starter-floor change at the acquired position ≥ +2; shopper starter mean never falls in ≥ 95% of deals |
| T6 | Do sellers lose | seller starter mean unchanged in ≥ 95% of deals (they sell spares) |
| T7 | In-season | informational, **no minimum**. The root cause is reported with the funnel (needs → targets → priced → accepted). Pass if the in-season count is ≥ the baseline (2) *or* the funnel shows the limiter is a rule the owner approved (reported, not relaxed) |
| T8 | Volume | no floor and no ceiling beyond "not above 1.5× baseline trades per season". A fall is acceptable if T3–T6 hold ("a smaller number of intelligent trades is preferable") |
| T9 | Consequences | acquired age median ≤ 27 (baseline 25 is fine); departing within one season ≤ 15% (baseline 12%) |
| T10 | Unaddressed weakness | share of club-seasons with a persistent weak group while resources were available not higher than baseline + 2 points |
| T11 | Competition | distinct champions per seed ≥ baseline − 0.5; no club ≥ 40% of a seed's titles; sd of team overall within ±15% of baseline; persistent losers ≤ baseline + 2 points |
| T12 | Determinism | the same seed twice gives the same hash in both stages; hashes may differ from the baseline (that is the change) |
| T13 | Performance | Stage P wall time per season within +10% of baseline; an owner preview ≤ 50 ms and an incoming-offer build ≤ 150 ms at the 95th percentile on a full league |
| T14 | Owner scenarios | every adversarial scenario below is refused or neutralised; every reasonable scenario behaves as stated |
| T15 | Gameplay untouched | no diff in the football engine, XP, evolution, draft-class, competitive-balance or contract-rate code |

A threshold crossed on one stage only is provisional. A fail is reported as a fail, with the evidence, and nothing is tuned to the
benchmark seeds without the reserved-seed confirmation described above.

## Owner scenario suite (T14)
Run by `tools/owner-trading-scenarios.mjs` on a played franchise (offseason, trades open), and by `tests/trading-second-pass.test.js`.
1. A fair offer for a spare is accepted; the same player for a pick worth 15% less is refused with a value reason.
2. Equal market value never guarantees yes: a swap that leaves the club thinner at a starting slot is refused (position / need reason).
3. A club will not give up a starter with no ready replacement (`noReplacement`); it will when the next man is within 6.
4. Dumping: offering several bench bodies for a good player is refused (they are worth ≈0 to the club; roster cap reason too).
5. One-sided pick offers: ten late picks for one star are refused; picks of different years are discounted as the game values them.
6. Repeat offers: the 4th proposal to a club in a window, and the 9th in a window, are refused for the limit, not re-evaluated.
7. Flip: a monster bought from a club cannot be sent to another club in the same season; a monster received in a trade cannot go back.
8. Illegal: protected monsters, rookies on their first deal, over-the-cap, a full roster, a position left without its starters — each refused with its own reason.
9. Windows: refused when the draft clock is not running and the offseason is closed.
10. A preview shows legality, roster, cap and depth change, **not** whether the club will accept.
11. Incoming offers: come from the calling club's real need and surplus; the owner can decline; a stale offer is re-validated on acceptance and refused if the situation changed; a counteroffer is validated.
12. Reload: save → export → import mid-window keeps the counters, the flip locks and a waiting call, and the same proposal gets the same answer.

## Task 5.5 — post-trading benchmark (prepared, not run)
`docs/POST_TRADING_BENCHMARK_PLAN.md` and `tools/post-trading-benchmark.sh` rerun the Task 4 stages on the final tree, then
`tools/ai-benchmark-compare.mjs` lays the Task 4 weaknesses side by side (before/after, with the threshold each was recorded against)
and lists what remains. It uses the reserved seeds 21–40 for the main comparison so nothing measured here was tuned on them.
No Task 6 fix is made in this task.
