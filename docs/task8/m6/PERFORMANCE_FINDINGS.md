# M6 performance verification

Candidate runtime: `f9e758119d9bd1bce9ef859b2cdb0d2fe6341fed`, exact tree `e06cdd2c8923fdd6713dbdfbdf67e4cc8c7ef5a3`. The local materialized tree was verified against the GitHub commit before running.

Baseline: pre-Task 8 `43976f45fafbd3bb8322458b6b8eb317708818a0`, the approved performance baseline in `PERF_SCENES.md`.

Outcome carryover: nineteen scene variants and twelve full AI games match M5 exactly. This is outcome verification, not a timing result.

## CPU protocol

The existing approved runner executes every ordinary scene and every abilities-off twin separately, plus abilities-on comparisons and per-source submeasurements. Defaults retained: 3 warm-up rounds, 15 measured rounds, one settling run before each measurement, counterbalanced ABBA order, paired ratio uncertainty, 2,000 bootstrap resamples, per-scene reporting, existing 1.10 engine limit and provisional 1.25 ability-overhead budget. No competing benchmark process was run beside it.

Command:

```sh
node tools/perf/run-scenes.mjs --base=/workspace/scratch/9ad0f6fef45f/pre-task8-performance --cand=/workspace/scratch/9ad0f6fef45f/m6-presentation-runtime --json=docs/task8/m6/cpu-scenes-m6.json --label=task8-m6-f9e7581-vs-43976f4
```

The host is recording steal time above the approved quiet-machine threshold and broad timing spread. Those results must remain **provisional**, even when a point estimate is below the budget. The noise thresholds and pass limits have not been weakened.

## Scope limits

CPU timing is not rendering frame time. Browser frame-time checks, real franchise Auto/save pauses, and physical phone measurements are separate. No phone is available here; no mobile FPS result is claimed. Graphics-quality presets and camera-intensity changes remain outside the authorized implementation scope. Existing settings may be measured without inventing new ones.

Final frame pacing and regression must be rerun if any subsequent simulation tuning is integrated.

## CPU results

Completed all 13 scenes, including the documented worst-case addition, with 15 repeats and all source submeasurements. All 13 engine point estimates are below 1.10; **all remain provisional** because every scene exceeded the quiet-machine steal threshold and timing spread was large. The A3 engine uncertainty interval also crosses its limit. This is not a clean CPU acceptance pass.

| Ability scene | On/off CPU ratio | 95% interval | Provisional 1.25 budget |
| --- | --- | --- | --- |
| A1-overlapping-fields | 1.555 | 1.001–1.803 | Over point estimate |
| A2-summons-constructs | 1.397 | 0.703–1.514 | Over point estimate |
| A3-delayed-effects | 1.325 | 0.979–1.503 | Over point estimate |
| A4-legendary-sequence | 1.265 | 0.801–1.689 | Over point estimate |
| A5-full-contracts | 1.278 | 1.080–1.365 | Over point estimate |
| X1-worst-case | 1.218 | 1.197–1.686 | Within point estimate |

Five ability-scene point estimates exceed 1.25; all six uncertainty intervals cross that budget. Overlapping fields have the highest point estimate (1.555). Per-source field measurements also suggest a cost worth investigating, but no timing noise was hidden and no gameplay effect was removed to improve a number. A quiet-host rerun is required before acceptance or optimization claims. Raw evidence: `cpu-scenes-m6.json`; compact source-tagged evidence: `cpu-summary.json`.

## Frame-time attempt — blocked

A three-repeat desktop combined/live subset was attempted for multi-ability football, overlapping fields and franchise Auto/save steps, with eight staged plays per scene and existing full graphics. Simulation precompute completed (F2: eight plays/602 frames; F3: eight plays/168 frames). The Playwright-managed browser executable is absent. A second attempt using the installed system Chromium aborts because the environment disallows its process-singleton socket. **No measured browser frames were obtained.** The launch override was harness-only, then removed; the pinned app files remain unchanged. `render-attempt.json` records the attempts and limits.

Rendering, animation stutters and live save pauses remain unverified on this host. This environmental block is separate from the browser-review waiver, which does not create performance evidence. A browser-capable environment and physical devices are still needed.
