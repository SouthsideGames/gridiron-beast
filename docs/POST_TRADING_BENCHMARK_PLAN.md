# Post-trading benchmark — plan for the Task 5.5 checkpoint

Prepared in Task 5, **not run as a checkpoint**. It reruns the Task 4 AI Franchise Benchmark on the tree that contains the
trading second pass, compares it with the Task 4 baseline, and lists what remains. No Task 6 fix (retirement, draft-class scaling,
competitive balance) is made or assumed. The pre-registered thresholds of `TRADING_SECOND_PASS_PLAN.md` carry over unchanged unless
the owner approves a new plan before the run.

## Why a separate checkpoint
Task 5's own benchmark (`TRADING_SECOND_PASS_RESULTS.md`) tests the trading change on the same seeds as Task 4, so it answers "did
trading improve, and did anything else break". Task 5.5 answers a different question: **with trading fixed, which Task 4
weaknesses are still there, and are they what Task 6 should address?** It therefore uses seeds nobody tuned against.

## Samples
| Stage | Seeds | Seasons | Why |
|---|---|---|---|
| B-fresh | 21–40 | 10 | reserved in Task 5; never run before this checkpoint. The main comparison |
| B-matched | 1–20 | 10 | continuity with Task 4 and the Task 5 results (same leagues at creation) |
| C-fresh | 106–110 | 20 | long-run sustainability on new leagues |
| D | 1–5 | 6 | the six stress scenarios, as before |
| P | 1–2 | 3 | determinism (each run twice) and timing, on a quiet machine, run alone |

20 seeds × 10 seasons × 15 clubs is 3,000 AI club-seasons per stage; a proportion near 20% is known to about ±1.5 points (95%).
Trade-level proportions rest on roughly 300–400 deals; a difference of 8 points between two trees is about two standard errors.
Anything near a threshold is reported as such, with n.

## Run
```
git worktree add --detach /tmp/t55 <the Task 5.5 commit>        # a frozen copy: edits during the run cannot leak in
tools/post-trading-benchmark.sh --out=/tmp/t55-run \
    --tree=t5=<the merged Task 5 tree>,t55=/tmp/t55 --valuation=/tmp/t55/src/franchise/trade-value.js \
    --B=21-30,31-40 --C=106-108,109-110 --D=1-5 --lanes=2
node tools/trade-benchmark-compare.mjs --dir=/tmp/t55-run --base=t5 --new=t55 --json=cmp.json --md=cmp.md
node tools/ai-benchmark-analyze.mjs --B=... --C=... --D=... --out=summary.json --csv=club-seasons.csv     # the full Task 4 analysis of the new tree
node tools/trade-perf-check.mjs --json=perf.json                    # on a quiet machine
node tools/owner-trading-scenarios.mjs --seeds=51,52,53,54,55       # twelve owner scenarios
```
For a comparison against the **Task 4 baseline** instead of the Task 5 tree, use `--tree=base=<main at db7c0c6>,t55=...` and the
same seeds for both. The valuation file is passed so both trees' deals are scored by the same function.

## What to put side by side (Task 4 weakness → how it is measured → where Task 5 left it)
Filled from `TRADING_SECOND_PASS_RESULTS.md` and re-measured at the checkpoint.
| Task 4 finding | Measure | Task 4 | Task 5 | Task 5.5 |
|---|---|---|---|---|
| Kickers over-bought, first-round picks for kickers | kicker share of deals; first-round picks per position | 14.3%; 51 | see results | |
| Trades almost only pick-for-player in the offseason | by kind, by window | 390 picks / 17 swaps; 2 in season | see results | |
| Position-blind prices | `mvRatio` vs old ratio per position | — | see results | |
| Persistent weak groups left alone with cap room | persistent weak % with cap room, by position | see Task 4 report | see results | |
| Draft and free-agency weaknesses, aging, development, competition | the Task 4 table (`AI_FRANCHISE_BENCHMARK.md`) | — | unchanged by design | re-measure; any movement is a side effect |
| Dependence on the balance nudges (Stage E) | optional: `tools/ai-benchmark-variant.mjs` on seeds 1–8 | — | not rerun | decide at the checkpoint |

## What to look for that Task 5 could not measure
- **Long-run side effects of trading** on the 20-season stage: concentration of talent, picks drifting to a few clubs (picks owned by club over time), cap stress, aging of acquired monsters.
- **Whether the league needs more trading or less.** Task 5 makes no quota; if weak groups persist with cap room after trading, say which rule (approved restriction) blocks the fix, so the owner can decide. Do not relax a rule silently.
- **Owner-side effects** are not in the simulation (the benchmark owner never trades). They are covered by the scenario suite and by the first real saves: report anything a player could farm that the scenarios did not try, in particular the Rookie-difficulty ask-path round trip described in `TRADING_SECOND_PASS_RESULTS.md`.

## Open questions for the owner before the checkpoint
1. Position leverage is applied at half the engine-measured strength. Keep, strengthen or flatten?
2. Is the 6-overall replacement gap for selling a starter right, or should clubs sell starters more readily?
3. Do you want AI–AI clubs to sell starters (a change to an approved rule), and if so under what condition?
4. Should the in-season owner window stay closed (as approved) or open for the proposed weeks 2–8?
