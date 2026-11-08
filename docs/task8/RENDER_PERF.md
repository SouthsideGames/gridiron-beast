# Task 8 frame time and rendering performance

**Status: harness complete; results PRELIMINARY.** The figures below come from one repeat on a shared, busy 2-CPU cloud VM, in
headless desktop Chromium. They are not the official benchmark and they say nothing about phones. **Mobile: NOT VERIFIED** (section 6).

Owner rulings this follows: SPECIFICATION_BASELINE §26 (N8e, frame time and rendering; graphics settings future only) and §14
(mobile gates: 60 FPS mode ≥58 FPS average and 95% of frames ≤20 ms; physical reference devices; desktop emulation is not device
verification).

## 1. What is measured, and the three reports

| Report | What it is | How |
| --- | --- | --- |
| **Simulation** | the game logic per play | Node, before any timing (`precompute.mjs`: one warm-up pass, then 3 timed passes, median per play). Also measured in the page, on the main thread, inside the combined and live runs (the same code under the browser's V8 and under the CPU throttle). |
| **Rendering** | playing precomputed plays: field redraws, sprites, ability and field effects, particles, weather layer, screen shake, Clash arena and its canvas effects | mode `render`: every play and battle is simulated before the browser starts; the real match screen plays them through its own playback code (`startAnim`, via the inert hook), the real Clash arena plays the battles. The page simulates nothing. |
| **Combined live gameplay** | simulation and rendering together, as in a match | two forms, both measured. **`combined`**: the same scenes as render mode, but every snap (or battle) is simulated in the page at the moment it is played and then handed to the same playback; the recorded window of each play starts before its simulation. Checked to be the same plays render mode plays. **`live`**: the real franchise Sunday game on the real match screen, driven by the player's own **Auto** button: the screen's `act()` → `game-runner step()` → `afterStep` → `startAnim`, the Auto timer, the end-of-play save and the screen re-renders, nothing staged or precomputed. |

Combined measurement **was achieved**. Live is the closest to real play (it is the real game loop); combined gives the like-for-like
partner of each rendering scene. Rendering results are never presented as gameplay results: every table says which mode it is.

### Metrics (all three modes)

- Frame time = the delta between consecutive `requestAnimationFrame` timestamps whose later frame falls inside a recorded window
  (a play: from just before its start, or its simulation, to the end of its playback). Average, median, 95th and 99th percentile,
  maximum, average FPS, share of frames ≤20 ms and ≤40 ms (the §14 criteria), spikes over 33 ms and over 50 ms (also those in the
  first 250 ms of a play and at its end).
- Long tasks: main-thread tasks over 50 ms from the Chrome trace (count, total, max, and the entry point and timing of each), and the
  page's own `PerformanceObserver('longtask')`.
- Script / style-and-layout / paint breakdown: a Chrome trace (CDP `Tracing`, devtools timeline categories) aggregated over exactly
  the recorded windows (`rp:on`/`rp:off` marks), main-thread self time grouped as DevTools groups it (script, GC, parse HTML, style,
  layout, paint/composite), reported as ms per second of playback. CDP `Performance.getMetrics` deltas are also stored.
- Script attribution: a sampling CPU profile (CDP `Profiler`) of one block per mode, bucketed by subsystem (simulation, save, field
  draw, screen render, Clash arena, franchise lookups, browser native work). Outside the timed blocks (the profiler costs time).
- Draw profile: for every engine frame of every football scene, the field SVG string build time (with and without effects), DOM parse
  time (`innerHTML`), forced style + layout time, string size and element count. Outside the timed blocks.
- Machine load: for every block, the share of all CPU time used by the harness and by other processes (`/proc`), and the load
  average; also 3 s of idle load before the run starts.

### Identity checks

- `combined` football: the light fingerprint (result, yards, elapsed, frame and event counts) of every snap simulated in the page must
  equal scene-worker's own pass of the approved scene (the same check `precompute.mjs` makes in Node). The Sovereign sequence must
  match the reviewer runner's sequence play by play; a Clash battle's log hash must match.
- `live`: every live block must play the same game (per-step fingerprint equal to the first live block's). This holds across the
  `full` and `simple` configurations and across CPU throttling, so these presentation settings did not change the simulated game.

## 2. The command

```
node tools/perf/render/run.mjs [--label="OFFICIAL quiet machine ..."]      # the fixed protocol, JSON to tools/out/render-perf/
node tools/perf/render/report.mjs <that json>                              # the markdown tables used below
```

Fixed protocol (the defaults; change nothing for the official run): modes `render,combined,live`; **3 repeats**; **1 warm-up play
(or battle) per block** (combined: also one untimed simulation pass of the whole scene); **8 plays** per staged football scene;
live: **2 warm-up steps, then 14 measured steps**; CPU throttle **1x and 4x**; configurations: render `full,min-probe,simple`,
combined `full`, live `full,simple`; simulation timing 1 warm-up + 3 passes. Every block runs in real time (Auto 1x, football speed
1, Clash speed 2 as the franchise battle screen mounts it). Browser: Playwright Chromium (new headless) at 390x844, DPR 3, touch.
Duration about 65 minutes per repeat on the VM used here (so about 3.5 hours for the official three repeats). The preliminary run below used `--repeats=1` (attribution was a separate
`--repeats=0` invocation of the same command, so that the profiler did not disturb the timed blocks).

Files: `tools/perf/render/run.mjs` (runner), `driver.js` (in-page driver), `precompute.mjs` (Node simulation), `staging.js` (the
scene-worker staging shared by Node and the page), `trace.mjs` (trace aggregation), `report.mjs` (tables). Game code touched: one
inert hook in `src/ui/screens/match.js` (it exists only when the harness defines `globalThis.__gbRenderPerf` before the app loads:
`playMatch`, `matchBusy`, and an `onStep` timing call in `act()`). No gameplay, simulation or rendering behaviour changed.

### Configurations (attribution probes, not graphics settings)

| Name | Football | Clash | Player-visible? |
| --- | --- | --- | --- |
| `full` | default settings: monster sprites, effects fxQuality `full` | as the franchise battle screen mounts it | yes (default) |
| `min-probe` | plays animated with fxQuality `min`: badges and labels only, no particles, signature looks, status marks, weather layer or shake | Reduce motion on | **no**: a measurement probe. A player with Reduce motion on sees no play animation at all |
| `simple` | the existing setting "Players on the field: simple circles and squares" (no sprites; fxQuality `low`: half the particles) | effects quality `low` (a Clash Lab option) | yes (existing setting) |

No graphics quality setting was implemented; these existing switches are used only to see what effects cost.

## 3. Scenes

| Id | Requirement | Source | What is played |
| --- | --- | --- | --- |
| F1-ordinary | ordinary football | approved scene O6-rules-mix (plain) | the first 8 plays: runs and passes, no abilities |
| F2-multi-ability | several abilities at once | A5-full-contracts (ability) | every on-field slot carries a Dex contract; the 8 plays with the most overlapping activations (5 at once) |
| F3-overlapping-fields | overlapping field effects | A1-overlapping-fields (ability) | three staged overlapping fields plus field creators; the 8 plays with the most fields drawn (5) |
| F4-legendary-scene | legendary sequence (scene set) | A4-legendary-sequence (ability) | Sovereign Arm, Cyclonic Release, Landslide, Night Veil, Grove Guardian; the 8 plays with the most activations |
| F5-sovereign-sequence | legendary sequence: Sovereign Arm charging and protecting | `src/sim/abilities/review-sequence.js` (aurodrax, main demonstration) through the real engine | every snap of the reviewer's staged run that has frames (3 plays: the charge, the protected throw, the follow-up) |
| C1-clash-3v3 / C2-clash-5v5 | Beast Clash replay | `src/franchise/clash-link.js runBattle` (franchise policies) | a 3v3 (Tuesday / pregame size) and a 5v5 (playoff overtime size) battle in the arena |
| L1-franchise-auto | combined live gameplay | the real franchise game (seed 3, week 3 Sunday game) | 14 consecutive Auto steps of the real match from the opening kickoff, after 2 warm-up steps |

## 4. Preliminary results (PRELIMINARY: one repeat, busy shared machine)

**Read these as indications only.** The VM has 2 CPUs and other agents were working on it: before the run 61% of all CPU time was
used by other processes, and during many blocks other processes still used 40-50% (column "load busy / other"; 0.44 means almost a
whole core). One repeat gives no variance estimate, and a block that ran beside foreign load can look worse than its neighbours
(for example F5 rendering at 0.04 foreign load against F5 combined at 0.41). Differences under a few ms of average frame time, or a
factor of two in spike counts, are inside this noise. The official run must be three repeats on a quiet machine.

Platform labels: **desktop** = verified desktop (headless desktop Chromium on this VM, unthrottled); **desktop CPU 4x** =
desktop CPU-throttled with `Emulation.setCPUThrottlingRate` 4x, an approximate indicator only. No row is a mobile measurement.

The raw data: `docs/task8/render-perf/preliminary-2026-11-08.json` (timed blocks, draw profile) and
`docs/task8/render-perf/preliminary-2026-11-08-attribution.json` (CPU-profile attribution). Tables generated with `report.mjs`.

Run: PRELIMINARY 2026-11-08, busy shared 2-CPU machine, 1 repeat; commit b7eb077; 2026-11-08T22:26:33.865Z to 2026-11-08T23:31:58.929Z; 2 CPUs (Intel(R) Xeon(R) Processor @ 2.10GHz); 141.0.7390.37 (chromium new headless); viewport 390x844 DPR 3; repeats 1, warm-up 1, plays 8, live 14 steps after 2.
Machine before start: busy 0.619, other processes 0.609 of all CPU time, load average 3.05 3.1 2.4. Mobile: mobile NOT VERIFIED (no Capacitor project in the repository (no capacitor.config.*, no android/ or ios/, no @capacitor/* package) and no mobile device attached (no adb devices, no iOS tooling)).
Identity checks: 18 blocks, 0 mismatches. Page errors: 0.

### 4.1 Simulation (game logic per play)
| Scene | Node, ms/play (median) | Page, combined/live 1x: median / max ms | Page, combined/live 4x: median / max ms |
| --- | --- | --- | --- |
| F1-ordinary | 2.70 | 10.2 / 18.1 | 46.2 / 98.1 |
| F2-multi-ability | 9.98 | 13.9 / 31.1 | 37.8 / 74.6 |
| F3-overlapping-fields | 2.97 | 4.8 / 25.4 | 16.9 / 91.1 |
| F4-legendary-scene | 4.11 | 14.1 / 21.2 | 28.8 / 80.3 |
| F5-sovereign-sequence | 28.55 | 12.7 / 16.3 | 24.2 / 48.7 |
| C1-clash-3v3 | 1.66 per battle | 1.7 / 1.7 | 10.2 / 10.2 |
| C2-clash-5v5 | 2.57 per battle | 2.7 / 2.7 | 15.2 / 15.2 |
| L1-franchise-auto | not separable (live game) | 11.9 / 29.1 | 33.9 / 110.1 |

### 4.2 Rendering (precomputed plays; the page simulates nothing)
| Scene | Config | Platform | avg ms | median | p95 | fps | ≤20 ms | >33 | >50 | long tasks (max ms) | script / style+layout / paint ms per s | play start ms (median / max) | load busy / other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F1-ordinary | full | desktop | 19.0 | 16.7 | 33.4 | 53 | 0.90 | 34 | 11 | 1 (212) | 64 / 91 / 89 | 18.2 / 24 | 0.92 / 0.01 |
| F1-ordinary | min-probe | desktop | 17.8 | 16.7 | 33.3 | 56 | 0.94 | 22 | 1 | 1 (51) | 43 / 133 / 51 | 14.7 / 21.7 | 0.59 / 0.01 |
| F1-ordinary | simple | desktop | 17.0 | 16.7 | 16.8 | 59 | 0.98 | 4 | 2 | 0 (0) | 25 / 31 / 38 | 6.8 / 12.5 | 0.76 / 0.38 |
| F1-ordinary | full | desktop CPU 4x (approx.) | 51.8 | 50 | 100 | 19 | 0.21 | 226 | 155 | 125 (143) | 100 / 191 / 151 | 49.6 / 58.7 | 1 / 0.45 |
| F1-ordinary | min-probe | desktop CPU 4x (approx.) | 36.1 | 16.7 | 100 | 28 | 0.59 | 167 | 108 | 148 (191) | 108 / 279 / 110 | 65.5 / 96.4 | 0.99 / 0.44 |
| F1-ordinary | simple | desktop CPU 4x (approx.) | 27.1 | 16.7 | 50.1 | 37 | 0.57 | 102 | 41 | 12 (92) | 79 / 93 / 103 | 24.9 / 40.2 | 1 / 0.44 |
| F2-multi-ability | full | desktop | 21.6 | 16.7 | 50 | 46 | 0.85 | 196 | 99 | 18 (139) | 38 / 91 / 68 | 18.7 / 38.9 | 0.87 / 0.01 |
| F2-multi-ability | min-probe | desktop | 17.7 | 16.7 | 16.8 | 56 | 0.95 | 62 | 15 | 3 (66) | 40 / 136 / 52 | 12.5 / 24.5 | 0.75 / 0.01 |
| F2-multi-ability | simple | desktop | 17.2 | 16.7 | 16.8 | 58 | 0.98 | 33 | 12 | 0 (0) | 26 / 37 / 43 | 6.7 / 12 | 0.75 / 0.05 |
| F2-multi-ability | full | desktop CPU 4x (approx.) | 50.1 | 49.9 | 100.1 | 20 | 0.26 | 711 | 458 | 403 (245) | 93 / 191 / 152 | 55.9 / 98 | 1 / 0.02 |
| F2-multi-ability | min-probe | desktop CPU 4x (approx.) | 34.6 | 16.7 | 99.9 | 29 | 0.62 | 543 | 327 | 468 (436) | 92 / 289 / 117 | 51.9 / 82.7 | 0.99 / 0.11 |
| F2-multi-ability | simple | desktop CPU 4x (approx.) | 22.6 | 16.7 | 50 | 44 | 0.73 | 318 | 66 | 17 (77) | 56 / 72 / 105 | 23.8 / 37.8 | 1 / 0.09 |
| F3-overlapping-fields | full | desktop | 26.1 | 16.7 | 66.6 | 38 | 0.64 | 136 | 42 | 1 (51) | 49 / 104 / 82 | 15.9 / 22.6 | 0.96 / 0.07 |
| F3-overlapping-fields | min-probe | desktop | 21.0 | 16.7 | 49.9 | 48 | 0.80 | 76 | 11 | 1 (64) | 54 / 155 / 72 | 16.5 / 18 | 0.92 / 0.01 |
| F3-overlapping-fields | simple | desktop | 18.0 | 16.7 | 16.8 | 56 | 0.95 | 17 | 1 | 0 (0) | 26 / 36 / 50 | 6.4 / 12.9 | 0.89 / 0.01 |
| F3-overlapping-fields | full | desktop CPU 4x (approx.) | 39.6 | 33.3 | 83.4 | 25 | 0.40 | 184 | 108 | 100 (141) | 94 / 197 / 157 | 49.6 / 84.8 | 0.93 / 0.01 |
| F3-overlapping-fields | min-probe | desktop CPU 4x (approx.) | 34.1 | 16.7 | 83.4 | 29 | 0.60 | 162 | 97 | 149 (154) | 105 / 279 / 116 | 53.7 / 77.7 | 0.89 / 0.34 |
| F3-overlapping-fields | simple | desktop CPU 4x (approx.) | 23.2 | 16.7 | 50 | 43 | 0.69 | 76 | 18 | 3 (74) | 54 / 84 / 90 | 21.8 / 30.5 | 1 / 0.30 |
| F4-legendary-scene | full | desktop | 19.3 | 16.7 | 33.4 | 52 | 0.89 | 54 | 18 | 3 (91) | 39 / 88 / 64 | 11.6 / 15.3 | 0.82 / 0.01 |
| F4-legendary-scene | min-probe | desktop | 19.4 | 16.7 | 33.4 | 52 | 0.90 | 60 | 26 | 7 (77) | 41 / 131 / 53 | 18.4 / 26.8 | 0.76 / 0.01 |
| F4-legendary-scene | simple | desktop | 17.0 | 16.7 | 16.8 | 59 | 0.98 | 8 | 2 | 0 (0) | 22 / 31 / 34 | 5.6 / 9.1 | 0.73 / 0.32 |
| F4-legendary-scene | full | desktop CPU 4x (approx.) | 41.4 | 33.4 | 83.4 | 24 | 0.36 | 305 | 177 | 170 (176) | 87 / 182 / 146 | 45.4 / 66.7 | 1 / 0.42 |
| F4-legendary-scene | min-probe | desktop CPU 4x (approx.) | 35.9 | 16.7 | 100 | 28 | 0.59 | 250 | 165 | 218 (165) | 94 / 270 / 121 | 49.2 / 58.7 | 0.99 / 0.44 |
| F4-legendary-scene | simple | desktop CPU 4x (approx.) | 24.3 | 16.7 | 50 | 41 | 0.67 | 138 | 41 | 9 (62) | 63 / 76 / 104 | 24 / 33.5 | 1 / 0.43 |
| F5-sovereign-sequence | full | desktop | 17.0 | 16.7 | 16.8 | 59 | 0.98 | 2 | 0 | 0 (0) | 37 / 80 / 60 | 10.8 / 12.3 | 0.69 / 0.04 |
| F5-sovereign-sequence | min-probe | desktop | 19.6 | 16.7 | 33.4 | 51 | 0.88 | 18 | 3 | 1 (61) | 48 / 126 / 58 | 12.4 / 14.4 | 0.95 / 0.01 |
| F5-sovereign-sequence | simple | desktop | 17.5 | 16.7 | 16.8 | 57 | 0.96 | 7 | 2 | 0 (0) | 28 / 37 / 54 | 6.7 / 7.9 | 0.88 / 0.49 |
| F5-sovereign-sequence | full | desktop CPU 4x (approx.) | 27.4 | 16.7 | 66.6 | 37 | 0.60 | 69 | 29 | 38 (121) | 89 / 203 / 153 | 51.4 / 71.7 | 0.75 / 0 |
| F5-sovereign-sequence | min-probe | desktop CPU 4x (approx.) | 30.8 | 16.7 | 83.3 | 32 | 0.66 | 92 | 55 | 81 (138) | 94 / 306 / 103 | 60.4 / 62.8 | 0.66 / 0 |
| F5-sovereign-sequence | simple | desktop CPU 4x (approx.) | 17.7 | 16.7 | 33.3 | 56 | 0.94 | 11 | 0 | 1 (58) | 85 / 134 / 123 | 23.7 / 25.9 | 0.72 / 0.01 |
| C1-clash-3v3 | full | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 1 | 0 | 0 (0) | 21 / 33 / 87 | – / – | 0.34 / 0.01 |
| C1-clash-3v3 | min-probe | desktop | 20.3 | 16.7 | 33.4 | 49 | 0.83 | 1 | 0 | 0 (0) | 179 / 181 / 182 | – / – | 0.87 / 0.50 |
| C1-clash-3v3 | simple | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 1 | 0 | 0 (0) | 17 / 31 / 56 | – / – | 0.66 / 0.17 |
| C1-clash-3v3 | full | desktop CPU 4x (approx.) | 18.3 | 16.7 | 33.3 | 55 | 0.92 | 32 | 6 | 0 (0) | 51 / 86 / 299 | – / – | 0.98 / 0.42 |
| C1-clash-3v3 | min-probe | desktop CPU 4x (approx.) | 30.1 | 16.7 | 50.1 | 33 | 0.55 | 12 | 3 | 1 (57) | 184 / 231 / 313 | – / – | 0.99 / 0.41 |
| C1-clash-3v3 | simple | desktop CPU 4x (approx.) | 18.5 | 16.7 | 33.3 | 54 | 0.93 | 32 | 12 | 11 (120) | 54 / 108 / 234 | – / – | 0.95 / 0.26 |
| C2-clash-5v5 | full | desktop | 17.0 | 16.7 | 16.8 | 59 | 0.99 | 10 | 3 | 1 (52) | 20 / 34 / 110 | – / – | 0.95 / 0.01 |
| C2-clash-5v5 | min-probe | desktop | 26.4 | 16.7 | 50 | 38 | 0.73 | 6 | 2 | 0 (0) | 167 / 184 / 168 | – / – | 0.91 / 0.44 |
| C2-clash-5v5 | simple | desktop | 16.8 | 16.7 | 16.7 | 60 | 0.99 | 2 | 1 | 0 (0) | 17 / 38 / 98 | – / – | 0.90 / 0.03 |
| C2-clash-5v5 | full | desktop CPU 4x (approx.) | 19.2 | 16.7 | 33.4 | 52 | 0.88 | 68 | 11 | 6 (105) | 50 / 86 / 332 | – / – | 0.99 / 0.05 |
| C2-clash-5v5 | min-probe | desktop CPU 4x (approx.) | 43.0 | 33.4 | 83.3 | 23 | 0.23 | 44 | 28 | 8 (99) | 218 / 214 / 321 | – / – | 1 / 0.43 |
| C2-clash-5v5 | simple | desktop CPU 4x (approx.) | 18.5 | 16.7 | 33.3 | 54 | 0.93 | 43 | 18 | 9 (191) | 55 / 118 / 250 | – / – | 0.91 / 0.01 |

### 4.3 Combined (each snap simulated in the page when it is played)
| Scene | Config | Platform | avg ms | median | p95 | fps | ≤20 ms | >33 | >50 | long tasks (max ms) | script / style+layout / paint ms per s | sim + play start ms (median / max) | load busy / other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F1-ordinary | full | desktop | 18.2 | 16.7 | 33.3 | 55 | 0.91 | 13 | 1 | 0 (0) | 49 / 100 / 71 | 23.4 / 33.1 | 0.67 / 0.01 |
| F1-ordinary | full | desktop CPU 4x (approx.) | 46.0 | 33.3 | 116.7 | 22 | 0.41 | 182 | 150 | 152 (265) | 136 / 236 / 165 | 132.9 / 204.4 | 0.86 / 0.25 |
| F2-multi-ability | full | desktop | 25.9 | 16.7 | 66.6 | 39 | 0.67 | 334 | 161 | 7 (105) | 46 / 108 / 75 | 31.6 / 50.8 | 0.90 / 0.03 |
| F2-multi-ability | full | desktop CPU 4x (approx.) | 35.4 | 33.3 | 83.3 | 28 | 0.42 | 533 | 272 | 275 (191) | 90 / 166 / 150 | 86.4 / 128 | 1 / 0.44 |
| F3-overlapping-fields | full | desktop | 28.8 | 16.7 | 66.7 | 35 | 0.59 | 118 | 59 | 3 (79) | 55 / 113 / 78 | 17.5 / 46.7 | 0.97 / 0.42 |
| F3-overlapping-fields | full | desktop CPU 4x (approx.) | 60.0 | 50.1 | 133.3 | 17 | 0.20 | 200 | 156 | 126 (224) | 129 / 210 / 152 | 77 / 169 | 1 / 0.44 |
| F4-legendary-scene | full | desktop | 27.3 | 16.7 | 66.6 | 37 | 0.61 | 151 | 79 | 3 (76) | 50 / 99 / 75 | 33.6 / 46.3 | 0.94 / 0.05 |
| F4-legendary-scene | full | desktop CPU 4x (approx.) | 63.9 | 66.6 | 150 | 16 | 0.25 | 279 | 245 | 233 (266) | 118 / 247 / 166 | 126.7 / 182.2 | 0.93 / 0.29 |
| F5-sovereign-sequence | full | desktop | 27.8 | 16.7 | 66.6 | 36 | 0.55 | 60 | 23 | 0 (0) | 53 / 109 / 77 | 28.4 / 28.4 | 0.97 / 0.41 |
| F5-sovereign-sequence | full | desktop CPU 4x (approx.) | 39.1 | 33.3 | 100 | 26 | 0.44 | 91 | 64 | 58 (184) | 105 / 189 / 157 | 96.6 / 121 | 1 / 0.40 |
| C1-clash-3v3 | full | desktop | 16.8 | 16.7 | 16.7 | 60 | 0.99 | 0 | 0 | 0 (0) | 21 / 40 / 138 | 19.1 / 19.1 | 0.87 / 0.52 |
| C1-clash-3v3 | full | desktop CPU 4x (approx.) | 19.6 | 16.7 | 33.4 | 51 | 0.88 | 29 | 9 | 2 (172) | 60 / 98 / 334 | 95.7 / 95.7 | 0.99 / 0.44 |
| C2-clash-5v5 | full | desktop | 16.9 | 16.7 | 16.8 | 59 | 0.99 | 6 | 2 | 0 (0) | 21 / 43 / 143 | 22.5 / 22.5 | 0.85 / 0.49 |
| C2-clash-5v5 | full | desktop CPU 4x (approx.) | 19.9 | 16.7 | 33.4 | 50 | 0.85 | 84 | 23 | 14 (168) | 63 / 106 / 361 | 109.5 / 109.5 | 0.99 / 0.42 |

### 4.4 Live (real franchise match in Auto; frames from each snap to the end of its playback)
| Scene | Config | Platform | avg ms | median | p95 | fps | ≤20 ms | >33 | >50 | long tasks (max ms) | script / style+layout / paint ms per s | session avg / p95 / >33 / >50 | load busy / other |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1-franchise-auto | full | desktop | 26 | 16.7 | 66.6 | 38 | 0.67 | 228 | 92 | 12 (75) | 47 / 84 / 77 | 23.8 / 50 / 247 / 101 | 0.96 / 0.42 |
| L1-franchise-auto | simple | desktop | 17.7 | 16.7 | 16.8 | 57 | 0.96 | 32 | 8 | 0 (0) | 29 / 33 / 48 | 17.5 / 16.8 / 37 / 10 | 0.85 / 0.46 |
| L1-franchise-auto | full | desktop CPU 4x (approx.) | 45.2 | 33.4 | 100 | 22 | 0.33 | 404 | 243 | 242 (358) | 97 / 152 / 147 | 38.1 / 99.9 / 457 / 266 | 1 / 0.44 |
| L1-franchise-auto | simple | desktop CPU 4x (approx.) | 21.6 | 16.7 | 49.9 | 46 | 0.81 | 127 | 52 | 29 (232) | 75 / 89 / 123 | 21.2 / 33.4 / 150 / 61 | 0.93 / 0.23 |

### 4.5 Three-way, default configuration (full)
| Scene | Platform | Simulation ms/play (Node / page) | Rendering avg / p95 / >33 / >50 | Combined avg / p95 / >33 / >50 | Live avg / p95 / >33 / >50 |
| --- | --- | --- | --- | --- | --- |
| F1-ordinary | verified desktop | 2.70 / 10.2 | 19.0 / 33.4 / 34 / 11 | 18.2 / 33.3 / 13 / 1 | – |
| F1-ordinary | desktop CPU-throttled 4x (approximate indicator only) | 2.70 / 46.2 | 51.8 / 100 / 226 / 155 | 46.0 / 116.7 / 182 / 150 | – |
| F2-multi-ability | verified desktop | 9.98 / 13.9 | 21.6 / 50 / 196 / 99 | 25.9 / 66.6 / 334 / 161 | – |
| F2-multi-ability | desktop CPU-throttled 4x (approximate indicator only) | 9.98 / 37.8 | 50.1 / 100.1 / 711 / 458 | 35.4 / 83.3 / 533 / 272 | – |
| F3-overlapping-fields | verified desktop | 2.97 / 4.8 | 26.1 / 66.6 / 136 / 42 | 28.8 / 66.7 / 118 / 59 | – |
| F3-overlapping-fields | desktop CPU-throttled 4x (approximate indicator only) | 2.97 / 16.9 | 39.6 / 83.4 / 184 / 108 | 60.0 / 133.3 / 200 / 156 | – |
| F4-legendary-scene | verified desktop | 4.11 / 14.1 | 19.3 / 33.4 / 54 / 18 | 27.3 / 66.6 / 151 / 79 | – |
| F4-legendary-scene | desktop CPU-throttled 4x (approximate indicator only) | 4.11 / 28.8 | 41.4 / 83.4 / 305 / 177 | 63.9 / 150 / 279 / 245 | – |
| F5-sovereign-sequence | verified desktop | 28.55 / 12.7 | 17.0 / 16.8 / 2 / 0 | 27.8 / 66.6 / 60 / 23 | – |
| F5-sovereign-sequence | desktop CPU-throttled 4x (approximate indicator only) | 28.55 / 24.2 | 27.4 / 66.6 / 69 / 29 | 39.1 / 100 / 91 / 64 | – |
| C1-clash-3v3 | verified desktop | 1.66 / 1.7 | 16.7 / 16.7 / 1 / 0 | 16.8 / 16.7 / 0 / 0 | – |
| C1-clash-3v3 | desktop CPU-throttled 4x (approximate indicator only) | 1.66 / 10.2 | 18.3 / 33.3 / 32 / 6 | 19.6 / 33.4 / 29 / 9 | – |
| C2-clash-5v5 | verified desktop | 2.57 / 2.7 | 17.0 / 16.8 / 10 / 3 | 16.9 / 16.8 / 6 / 2 | – |
| C2-clash-5v5 | desktop CPU-throttled 4x (approximate indicator only) | 2.57 / 15.2 | 19.2 / 33.4 / 68 / 11 | 19.9 / 33.4 / 84 / 23 | – |
| L1-franchise-auto | verified desktop | – / 11.9 | – | – | 26 / 66.6 / 228 / 92 |
| L1-franchise-auto | desktop CPU-throttled 4x (approximate indicator only) | – / 33.9 | – | – | 45.2 / 100 / 404 / 243 |

### 4.6 Draw profile (per field draw, unthrottled, outside the timed blocks)
| Scene | Config | build ms (no fx) | DOM parse ms | style+layout ms | chars (no fx) | elements mean / max |
| --- | --- | --- | --- | --- | --- | --- |
| F1-ordinary | full | 0.64 (0.51) | 6.20 | 4.62 | 97549 (97546) | 1321 / 1338 |
| F1-ordinary | min-probe | 0.53 (0.39) | 6.59 | 6.65 | 97502 (97499) | 1320 / 1336 |
| F1-ordinary | simple | 0.19 (0.22) | 1.12 | 1.26 | 28487 (28484) | 236 / 242 |
| F2-multi-ability | full | 0.54 (0.41) | 6.62 | 5.43 | 98513 (98051) | 1328 / 1352 |
| F2-multi-ability | min-probe | 0.40 (0.40) | 5.79 | 6.39 | 97930 (97804) | 1323 / 1332 |
| F2-multi-ability | simple | 0.23 (0.11) | 1.18 | 1.26 | 29633 (29218) | 247 / 263 |
| F3-overlapping-fields | full | 0.20 (0.14) | 4.86 | 4.04 | 98560 (98458) | 1326 / 1337 |
| F3-overlapping-fields | min-probe | 0.27 (0.17) | 4.28 | 5.04 | 98325 (98293) | 1325 / 1328 |
| F3-overlapping-fields | simple | 0.14 (0.08) | 1.23 | 1.21 | 29578 (29492) | 243 / 254 |
| F4-legendary-scene | full | 0.29 (0.15) | 5.35 | 4.30 | 103989 (103052) | 1413 / 1432 |
| F4-legendary-scene | min-probe | 0.28 (0.16) | 5.37 | 5.99 | 102980 (102880) | 1405 / 1412 |
| F4-legendary-scene | simple | 0.14 (0.11) | 1.13 | 1.00 | 29867 (28953) | 248 / 265 |
| F5-sovereign-sequence | full | 0.25 (0.27) | 4.29 | 3.21 | 95711 (95684) | 1291 / 1343 |
| F5-sovereign-sequence | min-probe | 0.25 (0.13) | 3.97 | 4.78 | 95573 (95566) | 1291 / 1325 |
| F5-sovereign-sequence | simple | 0.08 (0.06) | 0.83 | 0.86 | 28430 (28408) | 236 / 255 |

### 4.7 Script attribution (CPU profile, unthrottled)

ms of main-thread time per second of playback, by subsystem (a sample belongs to the first source match walking up from the leaf;
native work called from script, such as `innerHTML` parsing, is counted under its caller; "browser" is the profiler's `(program)`:
style, layout, paint and parse work not attributed to a script frame). The combined block also simulates the snaps it does not play
(between the recorded windows), so its simulation figure is higher than the played plays alone.

| Block | browser native (style, layout, paint, parse) | field draw (tick, field-view, effects, sprites) | GC | save | franchise lookups | screen render, other UI | simulation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| render F2-multi-ability full | 220 | 79 | 20 | 7 | 3 | 3 | 0 |
| combined F2-multi-ability full | 216 | 83 | 22 | 12 | 3 | 2 | 32 |
| live L1-franchise-auto full | 199 | 85 | 18 | **47** | 7 | 6 | **3** |

### 4.8 Long tasks by mode and entry point
| Mode: entry | count | median ms | max ms |
| --- | --- | --- | --- |
| render: TimerFire | 6 | 99 | 212 |
| render: FireAnimationFrame | 489 | 64 | 191 |
| render: ? | 16 | 58 | 139 |
| render: FunctionCall | 1 | 51 | 51 |
| combined: FireAnimationFrame | 225 | 74 | 243 |
| combined: ? | 3 | 80 | 105 |
| combined: FunctionCall | 1 | 51 | 51 |
| live: TimerFire | 16 | 79 | 232 |
| live: FireAnimationFrame | 65 | 66 | 180 |

### 4.9 What the preliminary run shows (observations, not verdicts)

- **Simulation is small next to rendering.** In Node a played snap costs 2.7-10 ms (median; F5's 28.6 ms is the reviewer runner's
  whole sequence including staging and phase evaluation, divided by its plays). In the page, on the main thread, a snap costs 5-14 ms
  median (max 31 ms) unthrottled and 17-46 ms median (max 110 ms) at 4x. Clash battles cost 1.7-2.7 ms (10-15 ms at 4x) once, before
  the replay. In the live game the CPU profile puts simulation at about 3 ms per second of play, against about 85 ms/s of field-draw
  script and about 200 ms/s of browser style, layout, paint and parse work.
- **Where simulation does show: the frame at the snap.** In combined and live mode the simulation runs in the same task as the play
  start (`act()` → `step()` → `startAnim()` → screen re-render). That task takes 17-34 ms median unthrottled (render mode: 6-19 ms)
  and 77-133 ms median, up to 204 ms, at 4x: one long frame at every snap. Combined F2/F4 show more >33 ms spikes than render mode,
  but part of that difference is machine noise in this run.
- **Live gameplay has a cost that render-only playback understates: the franchise save.** Each play's end requests a save
  (`finishAnim` → `app.save()`, 350 ms debounce, then the franchise is frozen, packed and checksummed). In the live game that is
  about 47 ms of main-thread time per second of play, roughly 15x the simulation; its chunks run as timer tasks that can land inside
  the next play's animation (Auto snaps 700 ms after the previous play ends; a player can snap sooner). In diagnostic runs made
  before the preliminary run, single save tasks of 150-270 ms appeared about 0.35-0.55 s into the next play.
- **Desktop, unthrottled, default settings:** football plays run with a 16.7 ms median frame but averages of 17-26 ms
  (38-59 FPS), p95 33-67 ms and dozens to a few hundred frames over 33 ms per scene; the live game averaged 26 ms (38 FPS),
  p95 66.6 ms, 67% of frames ≤20 ms. Measured against the §14 60 FPS criteria (≥58 FPS average, 95% of frames ≤20 ms), among the
  football scenes only F5 rendering reached them in this run; with "Simple circles and squares" most football scenes reached 56-59 FPS and 95-98% ≤20 ms,
  and the live game 57 FPS and 96%. Beast Clash ran at 59-60 FPS with p95 16.7-16.8 ms. **This is a busy desktop VM and one repeat;
  it is not a device result and not a gate verdict.**
- **CPU-throttled 4x (approximate indicator only):** football with default settings fell to about 20 FPS average in render mode
  (p95 100 ms, 21-40% of frames ≤20 ms, long tasks in nearly every second), combined and live to 16-28 FPS. "Simple" roughly halved
  the frame time (live: 45 → 22 ms average). Clash stayed at 50-55 FPS (p95 33 ms). Whether a phone behaves like this is unknown.
- **Ability visuals are not where most of the time goes.** The effect layer adds under 1% of the field SVG (at most about 1,000 of
  95,000-104,000 characters per draw) and 0.1-0.15 ms of string building. The `min-probe` (no particles, signature looks, status
  marks, weather or shake) improved the multi-ability scene (render F2: 21.6 → 17.7 ms average unthrottled, 50 → 35 ms at 4x) but
  barely changed F1, F4 and F5, and raised style time in several blocks. The sprites are the dominant cost (next section).
- **Identity:** all 18 combined and live blocks matched (combined plays = the precomputed plays; every live block, `full` or `simple`,
  1x or 4x, played the same game).

## 5. The largest rendering costs

1. **Monster sprites drawn as SVG rectangles, re-parsed on every draw.** A field draw with sprites is about 97,000-104,000
   characters and 1,290-1,430 elements; with simple markers it is 28,000-30,000 characters and 236-265 elements. So the 14 sprites are
   about 70,000 characters and about 1,080 elements per draw (run-length `<rect>` rows of 16x16 pixel art; `sprite16.js` caches the
   string, not the DOM). DOM parse plus forced style and layout costs 7.5-12 ms per draw with sprites against 1.7-2.5 ms without.
2. **The redraw pattern: the whole field SVG is replaced by `innerHTML` up to 20 times a second.** Every draw rebuilds and re-parses
   the turf, yard lines, numbers, hashes, sidelines, end zones and goal posts, which do not change within a non-following play,
   together with the players and effects. Draws happen at the 10 Hz engine frames plus a half-step midpoint (20 Hz) unless one draw
   took over 18 ms (`anim.slow`), and at 30 Hz during the end-of-play hold. At 20 draws per second the parse/style/layout alone is
   about 150-240 ms of every second with sprites (the trace shows 80-110 ms/s style+layout and 60-90 ms/s paint unthrottled,
   150-250 and 150-170 at 4x).
3. **Whole-screen re-renders at play start and end.** `startAnim` and `finishAnim` call `Router.render()`, which rebuilds the
   scoreboard, edge strip, controls and play cards as well as the field: 6-19 ms per play start unthrottled, 45-65 ms at 4x
   (render mode), plus the simulation in combined and live mode.
4. **The end-of-play save** (live gameplay; section 4.9): about 47 ms/s of main thread, as timer tasks that can overlap the next play.
5. **Effects (particles, signature looks, status marks, field rectangles):** small in SVG size; measurable in the multi-ability scene
   through the probe (about 4 ms of average frame time unthrottled), small elsewhere. Overlapping fields (F3) are five translucent
   rectangles, not a size cost; F3's worse figures in this run come from its short plays (proportionally more play starts and ends)
   and noise, not from the fields' SVG.
6. **Weather layer and shake** (removed by the probe): a CSS `background-position` animation over the whole field and a CSS
   transform shake; their share could not be separated from the other probe changes in this run.
7. **Beast Clash:** one canvas for effects plus DOM sprites; paint-dominated (87-143 ms/s unthrottled, 300-360 ms/s at 4x) but within
   the frame budget on desktop and close to it at 4x.

## 6. Mobile status

| Label | Status |
| --- | --- |
| verified desktop | measured (preliminary): headless desktop Chromium, 2-CPU VM, 390x844 DPR 3 touch emulation |
| desktop CPU-throttled (4x) | measured (preliminary), an approximate indicator only |
| actual mobile device | **none available** |
| **mobile** | **NOT VERIFIED** |

The harness checks at every run: there is no Capacitor project in the repository (no `capacitor.config.*`, no `android/` or `ios/`,
no `@capacitor/*` package; the game is a web app with `manifest.webmanifest`), `adb` is not installed and no device is attached, and
there is no iOS tooling. The §14 requirement (packaged builds on iPhone 12 and Pixel 6 or agreed equivalents, 10 minutes after
warm-up, three runs per device per mode) therefore cannot be tested here and is reported as **unverified, not passed**. No mobile
FPS is estimated from these figures. The 4x throttle slows the CPU only; it does not model a phone's GPU, compositor, thermal limits,
WebView or memory.

## 7. Rendering optimisation proposals (outcome-neutral; listed, not implemented)

None of these touches the simulation or what a play contains; each draws the same recorded frames. Each would need the identity
checks (same sims, same saves) and a before/after run of this harness.

1. **Draw each monster sprite once and reuse it**: an SVG `<symbol>` per sprite and `<use>` per player, or a pre-rendered bitmap
   (`<image>` from a cached data URL / canvas), positioned by `transform`. Removes about 1,000 elements and 70 KB of markup per draw.
2. **Split the field into layers**: a static layer (turf, lines, numbers, end zones, goal posts) drawn once per play or camera move,
   and a dynamic layer (players, ball, effects) redrawn. For camera-following kick plays, translate the static layer.
3. **Update, don't replace**: keep the player nodes across draws and change their `transform` and classes (keyed by slot), instead
   of `innerHTML` of the whole SVG.
4. **Consider a canvas renderer for the moving layer** (as Beast Clash already does for its effects), keeping SVG for the static field.
5. **Keep the save out of the next play**: run the end-of-play save while the screen is idle (for example `requestIdleCallback`
   after the play, flushed before the next snap) or move the encode/checksum off the main thread (worker), preserving the store's
   ordering and commit guarantees. Same saved bytes.
6. **Smooth the snap frame**: start the playback a frame after the simulation step (show the press feedback first), and re-render
   only the controls and field instead of the whole screen at play start and end.
7. **Compositor-friendly weather**: animate the weather overlay with `transform` on its own layer instead of `background-position`.
8. **Adaptive half-steps**: the existing `anim.slow` switch decides from a single draw over 18 ms; a rolling measure of frame time
   would hold 10 Hz draws on slow devices more reliably. Presentation only.

## 8. Limitations (explicit)

- **Preliminary**: one repeat; a shared 2-CPU VM with 40-60% foreign CPU load during many blocks; no variance estimate. Not the
  official run.
- **Headless desktop Chromium** (new headless, software GPU path): raster and compositing are not those of a phone or of a desktop
  GPU; paint figures in particular are environment-specific. Frame timing is vsync-quantised at 60 Hz (16.7 ms steps).
- **4x CPU throttling is not a phone** (CPU only; no GPU, thermal, memory, WebView or Capacitor behaviour).
- **Mobile NOT VERIFIED** (section 6).
- **Combined mode** simulates the staged scenes' snaps through the same rules calls as the approved scene set, not through
  `game-runner step()`, and the Clash battle through `runBattle`, not the franchise Clash screen. **Live mode** is the real game loop
  but covers one franchise game (seed 3, week 3, from the opening kickoff, 14 steps) with whatever abilities that club and its
  opponent have (18 ability events in the 14 measured steps), not the staged worst cases.
- The F5 Node simulation time includes the reviewer runner's staging and phase evaluation; its in-page figure is the snaps alone.
- In combined mode the snaps a scene does not play are simulated between the recorded windows; they are excluded from the frame and
  trace statistics, but included in that block's CPU-profile attribution.
- Render mode includes what the match screen does around a play, including the save request at the end of each play (its write
  usually falls in the 400 ms gap between plays, which is not recorded).
- Trace self times are main-thread only; raster on other threads is stored separately (`rasterOffMainMs`) and not in the tables.
- The CPU-profile attribution is sampled (250 µs) and bucketed by source file; native work is assigned to its calling script.
- The `min-probe` changes several things at once (particles, looks, status marks, weather, shake); it cannot separate them.

## 9. Observation on graphics quality settings (observation only; nothing implemented)

The data so far suggests that the costs a graphics setting would naturally scale (particle density, effect detail, environmental
animation) are not the main cost: removing all of them (`min-probe`) helped only the multi-ability scene noticeably, while the
existing "Simple circles and squares" marker setting, which drops the sprites, halved the frame time at 4x. The largest costs are in
how the field is redrawn (sprites as about a thousand re-parsed rectangles, the whole SVG replaced 20 times a second) and in work
around the play (whole-screen re-renders, the save). These are addressed by the outcome-neutral optimisations in section 7, which
§26 puts before any graphics setting. A Balanced or Performance preset may still prove useful on real devices after those
optimisations, particularly for sprite detail and the half-step rate, but that can only be judged from the official desktop run and,
above all, from physical-device measurements, which are not available.
