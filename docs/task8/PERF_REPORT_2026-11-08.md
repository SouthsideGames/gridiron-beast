# Task 8 performance report, 2026-11-08 (frozen build 866a49b vs pre-Task 8 main 43976f4)

Measurement tools: e888278 (corrected quiet-machine rule, paired R1, per-step × volume split). Game code under test: 866a49b, which
is byte-identical in `src/` to the build whose targeted regression passed 455/455 and whose outputs are identical to acdc91e.

**Quality labels.** *Measured* = taken on this build. *Verified desktop* = quiet machine under the corrected rule (competing CPU
0.000, steal 0.014–0.020 CPU). *Provisional* = measured, but noise over 10% between passes, or a 95% interval straddling a limit,
or an incomplete run. *Not verified* = not measured. No figure below is an estimate unless it says so.

**Owner change of priority (23:13):** the 4×-throttled desktop rendering run was stopped after 22 of its blocks. Its partial log is
kept as `render-perf/2026-11-08-throttled-INCOMPLETE.log` and is **not verified**. Desktop throttling was never mobile verification.

## 1. Before and after, ordinary scenes (engine, abilities off; ratio of Task 8 to main, CPU time)

| Scene | Before any optimisation (busy machine, preliminary) | After, run 1 / run 2 / run 3 (quiet, provisional on noise) |
| --- | --- | --- |
| O1 passing | 1.23 | 0.69 / 0.68 / 0.59 |
| O2 short runs | 1.28 | 0.78 / 0.50 / 0.57 |
| O3 wide mismatch | 1.35 | 0.64 / 0.63 / 0.53 |
| O4 red zone | 1.99 | 0.71 / 0.69 / 0.65 |
| O5 legendary-play designs | 1.37 | 0.59 / 0.86 / 0.58 |
| O6 mixed calls | 1.21 | 0.56 / 0.56 / 0.58 |
| O7 rules, passing | 1.23 | 0.57 / 0.56 / 0.69 |

## 2. Engine regression per scene and twin, limit 1.10, every scene individually

All 13 pass in all three runs. Worst upper 95% bound of any scene: 1.006 (O5, run 2). Abilities-off twins: A1 0.65–0.69, A2
0.59–0.82, A3 0.73–0.77, A4 0.65–0.68, A5 0.59–0.66, X1 0.58–0.65. **PASS, provisional** (noise > 10% in every scene; the
run-to-run range is wide, e.g. O2 0.50–0.78, because R0 compares two processes, which differ by up to ±25%).

## 3. Ability overhead per scene (paired median, abilities on / off in one process, with 95% interval), provisional budget 1.25

| Scene | Run 1 | Run 2 | Run 3 | Verdict |
| --- | --- | --- | --- | --- |
| A1 overlapping fields | 1.42 (1.21–1.66) | 1.49 (1.16–1.73) | 1.64 (1.26–2.01) | **over in all three** |
| A2 summons and constructs | 1.35 (1.21–1.51) | 1.27 (1.18–1.41) | 1.40 (1.24–1.46) | **over in all three** |
| A3 delayed effects | 1.29 (1.15–1.45) | 1.21 (1.06–1.64) | 1.09 (0.96–1.39) | runs disagree |
| A4 legendary sequence | 1.17 (0.97–1.41) | 1.22 (0.96–1.31) | 1.31 (1.13–1.53) | runs disagree |
| A5 every slot has an ability | 1.43 (1.28–1.54) | 1.37 (1.15–1.43) | 1.26 (1.04–1.41) | **over in all three** |
| X1 worst case | 1.52 (1.48–1.68) | 1.45 (1.19–1.59) | 1.53 (1.22–1.85) | **over in all three** |

All provisional (noisy). The budget is unchanged. The old cross-process figures are also in the run logs; they are confounded by
the process difference and are not used for the verdict.

**Per-step versus extra work.** Volume = actor-ticks on / off. Run 1: A1 1.42 = per-step 1.48 × volume 0.96 (fields add no actors;
plays are slightly shorter); A2 1.35 = 1.31 × 1.03; A3 1.29 = 1.35 × 0.96; A4 1.17 = 1.14 × 1.03; A5 1.43 = 1.37 × 1.04;
X1 1.52 = 1.49 × 1.02. **Almost all of the overhead is extra processing per actor per step, not longer plays or added bodies.**

**Which systems (from CPU profiles and one-ability-at-a-time sub-measurements, documented in PERF_SCENES.md):** fields, once any
exists, run per actor per tick (A1 about 45% of the extra, X1 about 30%); summons and constructs go through every per-actor loop
and the pairwise collision check; the engine's own code on ability-altered plays; GC on events and statuses. The contracts' own
code is under 15% everywhere.

## 4. Simulation time against wall time

CPU and wall ratios agree within noise on the quiet machine (e.g. O1 0.69 CPU vs 0.63 wall; O5 0.59 vs 0.66). O5's plays are 13%
longer under Task 8 (61.1 → 69.3 ticks) because one call pair, Fault Line against Rootbound, resolves differently under the
approved pancake and shed rules; per tick O5 is 0.56–0.60. CPU time includes V8 helper threads (GC, compiler), so it can exceed
wall time; main-thread CPU and wall figures are in the run JSON beside the process-CPU verdict.

## 5. Rendering, frame time and combined gameplay (verified desktop, unthrottled, quiet machine; full visuals; 390×844 DPR 3)

| Scene | Simulation ms/play (Node / in page) | Rendering avg / p95 ms, frames >33 / >50 | Combined (simulate while playing) avg / p95, >33 / >50 |
| --- | --- | --- | --- |
| F1 ordinary | 1.45 / 6 | 17.5 / 16.8, 10 / 1 | 17.9 / 33.3, 18 / 2 |
| F2 several abilities at once | 5.50 / 9 | 17.5 / 16.8, 27 / 3 | 16.9 / 16.8, 9 / 2 |
| F3 overlapping fields | 1.64 / 2.7 | 17.9 / 33.3, 18 / 0 | 17.9 / 33.3, 9 / 0 |
| F4 legendary scene | 3.65 / 5.7 | 18.1 / 33.3, 28 / 2 | 18.3 / 33.3, 30 / 2 |
| F5 Sovereign Arm sequence | 29.2 (whole reviewer sequence) / 10.6 | 17.8 / 33.3, 9 / 1 | 17.8 / 33.3, 8 / 0 |
| C1 Clash 3v3 | 1.32 / 1.3 | 16.7 / 16.7, 0 / 0 | 16.7 / 16.8, 0 / 0 |
| C2 Clash 5v5 | 2.08 / 1.9 | 16.7 / 16.8, 1 / 0 | 16.7 / 16.7, 0 / 0 |
| **L1 live franchise game (Auto)** | – / 9.1 | – | **18.2 / 33.3, 41 / 4 (55 fps); simple shapes 16.8 / 16.8, 2 / 0 (60 fps)** |

- 28 of 30 summary rows GOOD; 2 PROVISIONAL (F1 full and F2 full rendering: spread over repeats above 10%). 27 identity checks, 0
  mismatches; 0 page errors.
- Against the §14 60 FPS gate (average ≥ 58 FPS and 95% of frames ≤ 20 ms), on this desktop: Clash passes; football with full
  visuals averages 55–57 FPS with 89–96% of frames ≤ 20 ms, so it **does not meet the gate**; football with the existing simple
  shapes meets it (60 FPS, 99–100%).
- The busy-machine preliminary (38 FPS live) was inflated by competing load; the quiet figure is 55 FPS.
- Stutter: long tasks of 58 ms median (max 288 ms) in animation frames, 62 in rendering blocks, 16 in combined, 10 in live.
- Script attribution (ms of main-thread time per second, live game): browser style/layout/paint 193, field draw 92, GC 16, UI 6,
  simulation 2. The save did not register in the official live sampling windows (0); the preliminary run saw 47 ms/s with 150–270 ms
  tasks landing in the next play. The hitch is reproduced in the diagnostic runs and remains on the fix list.
- **Draw profile:** a field draw with sprites is 96–104k characters and 1,290–1,430 SVG elements; parse 4.5–5.9 ms plus style and
  layout 3.7–4.6 ms per draw. With simple markers: 28–30k characters, 236–265 elements, about 1.0–1.3 ms each. Ability effects
  and particles add under 1% of the markup.
- **4× CPU throttle:** stopped at 22 blocks; **not verified**. The preliminary throttled figures (not verified) were 35–64 ms average.
- **Mobile: NOT VERIFIED.** No Capacitor project, no device, no mobile tooling. No mobile FPS is estimated.

## 6. Largest remaining bottlenecks

1. Rendering: whole-field SVG rebuilt per frame including static turf; monster sprites as ~1,000 rects each; parse+style+layout
   8–10 ms per draw. This alone is half a 60 FPS frame budget on desktop.
2. Whole-screen re-renders at play start and end, and the end-of-play franchise save landing in the next play's animation.
3. Simulation, abilities: field code per actor per tick once any field exists; summons/constructs in every per-actor loop and the
   pairwise collision check; GC on event and status objects.

## 7. Optimisations implemented (all outcome-identical: identity.mjs IDENTICAL vs acdc91e; targeted tests pass)

| Commit | Change | Measured gain |
| --- | --- | --- |
| a1eba73 | separate(): skip far pairs before the ability checks | separate self time 1,826 → 599 ms |
| 2fb84be | shed weights frozen once; pancake constants precomputed | 373 → 21 ms, 81 → 2 ms |
| 09c0530 | positionOf cache | 67 → 33 ms |
| 42357c6 | lazy contract context | scavenge time 426 → 223 ms (O4+O2) |
| cf3e3c3 | plain separation loop when no field and no body rule is active | part of the O4/O2 gain |
| a6eb877 | one hidden-class shape for every actor | O1 0.66, O2 0.59, O4 0.64, O5 0.62 of prior |
| 915d6dd | field effects per (type, field set) per play | A1 abilities-on 0.74 of prior |
| 8c9a3c9 | contract keys pre-created in fixed order | A5 0.73, A1 0.70 of prior |
| 7f60f41 | temporaries and per-play field state share shapes | A2 0.90, A3 0.79, A4 0.72, X1 0.75 of prior |

Net: ordinary scenes 1.21–1.99 → 0.50–0.86 of main.

## 8. Gameplay equivalence and regression

- identity.mjs: IDENTICAL after every step and at 866a49b (19 scene variants, 12 full AI games with abilities on, every play's
  output and end state).
- Independent 12-game hash: identical to acdc91e.
- Targeted tests at 866a49b: 455/455 (all task8-*, engine, abilities, legendary plays, replay, pursuit, run-read, qb-read, owner
  feedback, release stamp, all Clash).
- The full suite was not re-run after the optimisations (last full run 1,147/1,147 at 05fcb52). A full run is scheduled at the
  next integration milestone.

## 9. Scenes over budget

- Engine 10%: none.
- Abilities 25% (provisional): A1, A2, A5 and X1 over in all three runs; A3 and A4 split. All provisional on noise.
- Rendering 60 FPS full visuals: football scenes F1–F5 and the live game, on this desktop. Clash passes.

## 10. Recommendations

1. Renderer first (owner priority): sprite caching (symbol/use or bitmaps), static/dynamic field layers, node updates instead of
   innerHTML replacement, keep the save out of the next play's animation, avoid whole-screen re-renders at play boundaries. Visuals
   must stay the same; gameplay untouched.
2. Simulation, abilities: skip field code for actors outside every field; bounding check before each obstacle test; per-play list of
   tick-hook contracts; (larger) a spatial grid for collisions kept identical. The Dark-field Awareness cache changes floating-point
   results and is **not** recommended without approval.
3. Graphics quality settings: not warranted as the primary fix; the main costs are structural, not decorative. Revisit after the
   renderer work, on physical phones.
4. Mobile: needs a Capacitor build and physical iPhone 12 / Pixel 6 runs before any claim.

**Summary.** Engine: meets the 10% requirement in every scene, provisional on noise. Abilities: four of six scenes exceed the
provisional 25% budget. Rendering: Clash meets the desktop 60 FPS gate; football with full visuals does not (55–57 FPS), and the
end-of-play save hitch remains. Mobile: not verified.
