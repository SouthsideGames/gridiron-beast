# M6 pancake diagnostic

Production source: `f716b02`. Real AI games, Dex-generated teams, 180-second quarters, seeds 1–100, qualities cycling 52/62/72. No production settings changed.

**Recording correction:** the first exploratory counter combined Dragon Stomp ability knockdowns with ordinary pancakes. Both its successes **and attempts** must be excluded. The final recorder separates Dragon Stomp, guaranteed Pebble outcomes, ordinary pancakes and ordinary sheds. It reconciles successes and attempts with the engine's independent blocker-stat totals, per game; all recording checks pass. Earlier exploratory 1.32/64% and 0.69/34% figures are superseded by the table below.

| Metric | Production defaults | Report-only qmax 0.12 | Approved target |
| --- | --- | --- | --- |
| Ordinary pancakes / base starting OL / game | 0.690 | 0.550 | 0.2–0.6 |
| Ordinary success / ordinary attempt | 49.24% | 48.84% | 30–50% |
| Lost block / ordinary attempt | 11.60% | 9.73% | ≤15% |
| Games finished | 100/100 | 100/100 | — |
| Reconciled event/stat counts | Yes | Yes | — |

Ordinary default totals: 595 attempts, 293 successes, 69 lost blocks. Separately: 36 guaranteed pancakes, 254 Dragon Stomp knockdowns, 9,087 ordinary shed events. LG/RG are the two base starting OL; package C outcomes are reported separately. Kickoffs are excluded. The candidate has 473 ordinary attempts, 231 successes and 46 lost blocks; ability outcomes remain in the games but do not contaminate these ordinary ratios.

The candidate changes **only qmax 0.15 → 0.12**, within the approved 0.10–0.20 range. All contest/success/recovery mechanics and other constants are held fixed. It was run in an isolated copy with a diagnostic override of the pancake default object. **This is a proposal, not an integrated tuning change.** Integration should update the authoritative `pancake-structure` values in `docs/beast-dex/data/task8-overrides.json` and regenerate the Dex, rather than installing the diagnostic helper override.

Bootstrap uncertainty (2,000 game-cluster resamples, seed 88041) is retained in both raw files. Default frequency 95% interval: 0.5975–0.7875; candidate: 0.465–0.640. Default success interval: 45.73%–52.79%; candidate: 44.91%–52.81%. These overlap target boundaries. The point estimates support investigating a modest opportunity-rate reduction, **not** claiming a statistically settled league-wide tuning pass from 100 generated matchups. Broader league-weighted games and a candidate regression are needed before integrating.

Raw: `pancake-games.json`, `pancake-candidate-qmax-0.12.json`.

Reproduce defaults:

```sh
node tools/task8-m6-pancakes.mjs
```

Reproduce candidate: create an isolated M5 worktree, change the benchmark copy's `DEFAULT_C` construction in `src/sim/t8/pancake.js` from `pancakeConstants({})` to `pancakeConstants({ qmax: 0.12 })`, then:

```sh
node tools/task8-m6-pancakes.mjs --root=PATH_TO_ISOLATED_COPY --label=report-only-qmax-0.12 --out=docs/task8/m6/pancake-candidate-qmax-0.12.json
```
