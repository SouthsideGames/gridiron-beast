# Performance run record (preserved as produced)

| Run | Build | Conditions | Runner verdict | Status |
| --- | --- | --- | --- | --- |
| 2026-11-08 run 1 (`run1-sim`) | frozen 866a49b vs main 43976f4 | no competing workloads started; waited for load < 0.3 before starting | flagged itself PRELIMINARY (1-min load up to 1.89), every scene NOISY | **Provisional** |
| 2026-11-08 run 2 (`run2-sim`) | same | same | PRELIMINARY (load up to 1.92), every scene NOISY | **Provisional** |

**Methodology issue (owner 19:17).**
- The runner's quiet-machine check reads the 1-minute load average. That figure includes the benchmark's own worker processes, so a run can never pass it on 2 CPUs.
- Both runs are kept unchanged. The check is being corrected to separate the benchmark's own CPU use from competing load, and the correction is documented in PERF_SCENES.md.
- Ability overhead (R1) is being remeasured with repeated paired comparisons, balanced on/off order and equivalent warm-up.
