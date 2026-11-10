# M6 baseline testing — pinned M5

Source: `f716b02c41c81211d80e7389dc0cefd4c16ae155`; exact root tree `d4e36b76eae24ca7c4aac9fbdc8f13e588f8afd2`. Tests run in a separate worktree. No production settings or gameplay files changed. Claude's presentation work is outside this snapshot.

## Completed generation checks

`node tools/task8-m6-generation.mjs`

- 100,000 level-1 individuals across all ten positions: zero detected range, ceiling, Temper, Apex or development-record violations.
- Separate 10,000 eligible generation rolls: 99 Apex (0.99%; Wilson 95% interval 0.814%–1.204%). Production probability remains 1%.
- 100 pairs of deterministic individual-generation batches: identical. This checks generation replay, **not** the full-game replay acceptance gate.
- Uniform selection across stage-0 forms is a diagnostic input, not the franchise's channel-weighted acquisition distribution.

Raw evidence: `generation.json`.

## Finding M6-01: Apex training budget cannot meet season-15 goal

`node tools/task8-m6-apex-bound.mjs`

This is an optimistic resource bound, not a substitute for the prescribed played-career cohort. It deliberately grants more opportunity than a real career: level 50 natural growth immediately, thirteen football games a season (including the bye), opening AND overtime Clash every game, nine Tuesday encounters, perfect grades, no injuries, perfect allocation, and even spendable fractional bar progress. Apex evolution does not increase its already-99 ceilings, so it adds no rating scaling.

Across 100 forced Apex per position (1,000 total, seeds 1–100), natural growth still leaves **515–529 training points** needed for all twelve attributes to reach 99. At current settings this generous 15-season budget supplies only **246** points. Even the highest authorized training share (50%, with the same maximum five-percentage-point grade bonus) supplies only **426**. No sampled Apex can reach all 99s under that upper bound. A distribution-independent lower bound is 504 points: even twelve starting ratings of 15 need 42 trained increases each after natural growth.

**Implication:** the 90%-by-season-15 Apex gate is incompatible with these earning rules and the approved tuning range, assuming the current calendar and reward sources. Increasing XP cannot close the gap because this diagnostic already grants level 50 immediately. Do not change growth, ceilings, Temper, the calendar, or awards to manufacture a passing result. Record the conflict and seek a design ruling after reviewing the full career evidence. No tuning applied.

Raw evidence: `apex-resource-bound.json` (every sampled individual and every authorized training-share candidate).

## Production franchise baseline

The existing production lifecycle benchmark completed seed 1 through twenty seasons. It includes staff automation, real football and Clash settlement, contracts, free agency, draft, trades, aging, retirement and save round trips. Its hands-off-owner policy and diagnostic board reinstatement are documented in `tools/ai-franchise-benchmark.mjs` and `docs/AI_FRANCHISE_BENCHMARK.md`. It is an initial single-seed health diagnostic, not statistical balance approval.

Command:

```sh
node tools/ai-franchise-benchmark.mjs --seeds=1 --seasons=20 --label=task8-m6-pinned-m5-baseline --json=docs/task8/m6/ai-20-season-seed-1.json
```

Result: **20/20 seasons, zero reported errors or invariant violations**, 300 AI club-season rows, 62 trades. All AI lineups were legal at every recorded season end; no negative cap room was recorded. Runtime was 226 seconds with a sampled peak heap of 561 MB (diagnostic only).

| Season | AI roster sizes | Mean team OVR | Mean cap room | Mean unused cap |
| --- | --- | --- | --- | --- |
| 5 | 36–38 | 59.47 | $349,639 | 19.42% |
| 10 | 34–38 | 59.73 | $370,548 | 20.59% |
| 15 | 34–38 | 59.40 | $385,471 | 21.42% |
| 20 | 35–38 | 59.67 | $398,435 | 22.14% |

**Economy review flag:** every AI club retained at least $283,800 of cap room at all twenty season-end observations. Spare room grows at the checkpoints. This warrants broader-seed and in-season offer-pressure analysis before approving salary/cap balance; no arbitrary new pass threshold or tuning was applied.

Raw evidence: `ai-20-season-seed-1.json`; reproducible checkpoint calculations: `node tools/task8-m6-summarize.mjs`; compact result: `franchise-summary.json`. The existing snapshot schema does not explicitly record Apex status, Temper, per-attribute ceilings or mastery credits, so this report cannot use it to certify those career gates.

## Remaining acceptance work

- Freeze the exact three career schedules, creation ages, allocation policies, retirement-inclusive median convention and ceiling observation window; run all matched 100-per-position cohorts without survivor selection.
- Measure mastery from actual eligible engine executions, separating football/Clash and rare triggers; do not infer use from lineup membership or invent credits.
- Extend production recording for Apex acquisition/retention, per-position/Temper growth and mastery without changing simulation behavior.
- Broaden franchise seeds and review salaries/cap pressure, rebuilding, trades, gym strength/synergy, legendary limits and pancake targets against their approved definitions.
- Run final regression and CPU/render measurements after Claude's work is integrated. Baseline timings during concurrent checks are not CPU acceptance evidence.
- Owner visual approval and actual physical-device frame pacing remain separate and unverified.
