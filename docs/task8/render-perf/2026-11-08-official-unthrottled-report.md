Run: OFFICIAL render part 1 (unthrottled), frozen 866a49b (tools e888278), 2-CPU cloud container; commit null; 2026-11-09T02:30:11.557Z to 2026-11-09T03:55:17.620Z; 2 CPUs (Intel(R) Xeon(R) Processor @ 2.10GHz); 141.0.7390.37 (chromium new headless); viewport 390x844 DPR 3; repeats 3, warm-up 1, plays 8, live 14 steps after 2.
Machine before start: busy 0.008, other processes 0.003 of all CPU time, load average 1.3 1.4 1.43. Mobile: mobile NOT VERIFIED (no Capacitor project in the repository (no capacitor.config.*, no android/ or ios/, no @capacitor/* package) and no mobile device attached (no adb devices, no iOS tooling)).
Status: quiet machine (competing CPU <= 0.05 and steal <= 0.05 CPU in every block); 2 of 30 summary rows PROVISIONAL. Headless desktop Chromium; not a phone; 4x CPU throttle is desktop emulation (an approximate indicator only), not mobile verification.
Identity checks: 27 blocks, 0 mismatches. Page errors: 0.

#### Simulation (game logic per play)
| Scene | Node, ms/play (median) | Page, combined/live 1x: median / max ms | Page, combined/live 4x: median / max ms |
| --- | --- | --- | --- |
| F1-ordinary | 1.45 | 6 / 13.8 | – |
| F2-multi-ability | 5.50 | 9 / 28 | – |
| F3-overlapping-fields | 1.64 | 2.7 / 12.2 | – |
| F4-legendary-scene | 3.65 | 5.7 / 12.4 | – |
| F5-sovereign-sequence | 29.21 | 10.6 / 12.1 | – |
| C1-clash-3v3 | 1.32 per battle | 1.3 / 1.3 | – |
| C2-clash-5v5 | 2.08 per battle | 1.9 / 1.9 | – |
| L1-franchise-auto | not separable (live game) | 9.1 / 22.2 | – |

#### Rendering (precomputed plays; the page simulates nothing)
| Scene | Config | Platform | avg ms | median | p95 | fps | ≤20 ms | >33 | >50 | long tasks (max ms) | script / style+layout / paint ms per s | play start ms (median / max) | load busy / other | competing / steal CPU, quality |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F1-ordinary | full | desktop | 17.5 | 16.7 | 16.8 | 57 | 0.95 | 10 | 1 | 2 (146) | 49 / 91 / 66 | 11.4 / 19 | 0.59 / 0 | 0 / 0.020 PROVISIONAL (noisy (meanMs spread over repeats 0.11 of the median); noisy (p95Ms spread over repeats 0.98 of the median)) |
| F1-ordinary | min-probe | desktop | 17.1 | 16.7 | 16.8 | 58 | 0.98 | 7 | 1 | 2 (68) | 47 / 134 / 48 | 14.4 / 19.2 | 0.49 / 0 | 0 / 0.020 GOOD |
| F1-ordinary | simple | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 27 / 34 / 32 | 6 / 8.7 | 0.41 / 0 | 0 / 0.010 GOOD |
| F2-multi-ability | full | desktop | 17.5 | 16.7 | 16.8 | 57 | 0.96 | 27 | 3 | 1 (58) | 37 / 81 / 61 | 11.7 / 20 | 0.61 / 0 | 0 / 0.010 PROVISIONAL (noisy (p95Ms spread over repeats 0.98 of the median)) |
| F2-multi-ability | min-probe | desktop | 17.1 | 16.7 | 16.8 | 59 | 0.98 | 9 | 0 | 2 (64) | 40 / 139 / 47 | 12.2 / 18 | 0.53 / 0 | 0 / 0.010 GOOD |
| F2-multi-ability | simple | desktop | 16.8 | 16.7 | 16.8 | 60 | 0.99 | 2 | 0 | 0 (0) | 26 / 34 / 33 | 6.8 / 9.6 | 0.45 / 0 | 0 / 0.010 GOOD |
| F3-overlapping-fields | full | desktop | 17.9 | 16.7 | 33.3 | 56 | 0.93 | 18 | 0 | 2 (58) | 44 / 101 / 72 | 11.7 / 18.6 | 0.63 / 0 | 0 / 0.020 GOOD |
| F3-overlapping-fields | min-probe | desktop | 17.3 | 16.7 | 16.8 | 58 | 0.97 | 5 | 1 | 3 (66) | 46 / 149 / 51 | 12.2 / 18.4 | 0.51 / 0 | 0 / 0.010 GOOD |
| F3-overlapping-fields | simple | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 30 / 38 / 34 | 7.5 / 9 | 0.44 / 0 | 0 / 0.010 GOOD |
| F4-legendary-scene | full | desktop | 18.1 | 16.7 | 33.3 | 55 | 0.92 | 28 | 2 | 3 (59) | 45 / 103 / 73 | 14 / 20.2 | 0.67 / 0 | 0 / 0.020 GOOD |
| F4-legendary-scene | min-probe | desktop | 17.1 | 16.7 | 16.8 | 58 | 0.97 | 9 | 1 | 2 (54) | 42 / 144 / 49 | 13.4 / 19.9 | 0.50 / 0 | 0 / 0.010 GOOD |
| F4-legendary-scene | simple | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 0 | 0 | 0 (0) | 28 / 35 / 32 | 6.3 / 9.3 | 0.43 / 0 | 0 / 0.010 GOOD |
| F5-sovereign-sequence | full | desktop | 17.8 | 16.7 | 33.3 | 56 | 0.94 | 9 | 1 | 0 (0) | 43 / 97 / 69 | 17.5 / 18.6 | 0.63 / 0 | 0 / 0.020 GOOD |
| F5-sovereign-sequence | min-probe | desktop | 17.1 | 16.7 | 16.8 | 58 | 0.97 | 3 | 0 | 1 (58) | 42 / 141 / 50 | 13.5 / 14.7 | 0.52 / 0 | 0 / 0.020 GOOD |
| F5-sovereign-sequence | simple | desktop | 16.8 | 16.7 | 16.8 | 60 | 0.99 | 0 | 0 | 0 (0) | 30 / 38 / 37 | 8 / 10.6 | 0.44 / 0 | 0 / 0.010 GOOD |
| C1-clash-3v3 | full | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 49 / 42 / 106 | – / – | 0.39 / 0 | 0 / 0.020 GOOD |
| C1-clash-3v3 | min-probe | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 161 / 204 / 141 | – / – | 0.45 / 0 | 0 / 0.020 GOOD |
| C1-clash-3v3 | simple | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 0 | 0 | 0 (0) | 45 / 40 / 69 | – / – | 0.37 / 0 | 0 / 0.020 GOOD |
| C2-clash-5v5 | full | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 1 | 0 | 0 (0) | 18 / 43 / 116 | – / – | 0.40 / 0 | 0 / 0.020 GOOD |
| C2-clash-5v5 | min-probe | desktop | 17.0 | 16.7 | 16.8 | 59 | 0.98 | 0 | 0 | 0 (0) | 163 / 243 / 213 | – / – | 0.59 / 0 | 0 / 0.010 GOOD |
| C2-clash-5v5 | simple | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 16 / 40 / 82 | – / – | 0.39 / 0 | 0 / 0.010 GOOD |

#### Combined (each snap simulated in the page when it is played)
| Scene | Config | Platform | avg ms | median | p95 | fps | ≤20 ms | >33 | >50 | long tasks (max ms) | script / style+layout / paint ms per s | sim + play start ms (median / max) | load busy / other | competing / steal CPU, quality |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F1-ordinary | full | desktop | 17.9 | 16.7 | 33.3 | 56 | 0.93 | 18 | 2 | 0 (0) | 47 / 97 / 69 | 19.8 / 28.4 | 0.63 / 0 | 0 / 0.020 GOOD |
| F2-multi-ability | full | desktop | 16.9 | 16.7 | 16.8 | 59 | 0.99 | 9 | 2 | 1 (86) | 41 / 93 / 69 | 19 / 55.1 | 0.53 / 0 | 0 / 0.020 GOOD |
| F3-overlapping-fields | full | desktop | 17.9 | 16.7 | 33.3 | 56 | 0.93 | 9 | 0 | 1 (52) | 47 / 99 / 69 | 15 / 26.8 | 0.64 / 0 | 0 / 0.020 GOOD |
| F4-legendary-scene | full | desktop | 18.3 | 16.7 | 33.3 | 55 | 0.91 | 30 | 2 | 0 (0) | 46 / 101 / 72 | 19.3 / 32.3 | 0.68 / 0 | 0 / 0.020 GOOD |
| F5-sovereign-sequence | full | desktop | 17.8 | 16.7 | 33.3 | 56 | 0.93 | 8 | 0 | 1 (59) | 45 / 98 / 73 | 21.2 / 29.5 | 0.65 / 0 | 0 / 0.020 GOOD |
| C1-clash-3v3 | full | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 0 | 0 | 0 (0) | 27 / 39 / 99 | 15.4 / 15.4 | 0.38 / 0 | 0 / 0.010 GOOD |
| C2-clash-5v5 | full | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 17 / 40 / 106 | 16.7 / 16.7 | 0.38 / 0 | 0 / 0.010 GOOD |

#### Live (real franchise match in Auto; frames from each snap to the end of its playback)
| Scene | Config | Platform | avg ms | median | p95 | fps | ≤20 ms | >33 | >50 | long tasks (max ms) | script / style+layout / paint ms per s | session avg / p95 / >33 / >50 | load busy / other | competing / steal CPU, quality |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1-franchise-auto | full | desktop | 18.2 | 16.7 | 33.3 | 55 | 0.92 | 41 | 4 | 2 (66) | 48 / 84 / 70 | 17.9 / 33.3 / 45 / 6 | 0.64 / 0 | 0 / 0.020 GOOD |
| L1-franchise-auto | simple | desktop | 16.8 | 16.7 | 16.8 | 60 | 0.99 | 2 | 0 | 0 (0) | 31 / 31 / 37 | 16.8 / 16.8 / 4 / 0 | 0.46 / 0 | 0 / 0.010 GOOD |

#### Three-way, default configuration (full)
| Scene | Platform | Simulation ms/play (Node / page) | Rendering avg / p95 / >33 / >50 | Combined avg / p95 / >33 / >50 | Live avg / p95 / >33 / >50 |
| --- | --- | --- | --- | --- | --- |
| F1-ordinary | verified desktop | 1.45 / 6 | 17.5 / 16.8 / 10 / 1 | 17.9 / 33.3 / 18 / 2 | – |
| F2-multi-ability | verified desktop | 5.50 / 9 | 17.5 / 16.8 / 27 / 3 | 16.9 / 16.8 / 9 / 2 | – |
| F3-overlapping-fields | verified desktop | 1.64 / 2.7 | 17.9 / 33.3 / 18 / 0 | 17.9 / 33.3 / 9 / 0 | – |
| F4-legendary-scene | verified desktop | 3.65 / 5.7 | 18.1 / 33.3 / 28 / 2 | 18.3 / 33.3 / 30 / 2 | – |
| F5-sovereign-sequence | verified desktop | 29.21 / 10.6 | 17.8 / 33.3 / 9 / 1 | 17.8 / 33.3 / 8 / 0 | – |
| C1-clash-3v3 | verified desktop | 1.32 / 1.3 | 16.7 / 16.7 / 0 / 0 | 16.7 / 16.8 / 0 / 0 | – |
| C2-clash-5v5 | verified desktop | 2.08 / 1.9 | 16.7 / 16.8 / 1 / 0 | 16.7 / 16.7 / 0 / 0 | – |
| L1-franchise-auto | verified desktop | – / 9.1 | – | – | 18.2 / 33.3 / 41 / 4 |

#### Draw profile (per field draw, unthrottled, outside the timed blocks)
| Scene | Config | build ms (no fx) | DOM parse ms | style+layout ms | chars (no fx) | elements mean / max |
| --- | --- | --- | --- | --- | --- | --- |
| F1-ordinary | full | 0.47 (0.41) | 5.85 | 4.56 | 97549 (97546) | 1321 / 1338 |
| F1-ordinary | min-probe | 0.44 (0.25) | 4.97 | 5.35 | 97502 (97499) | 1320 / 1336 |
| F1-ordinary | simple | 0.11 (0.15) | 1.02 | 0.96 | 28487 (28484) | 236 / 242 |
| F2-multi-ability | full | 0.40 (0.29) | 4.88 | 4.06 | 98513 (98051) | 1328 / 1352 |
| F2-multi-ability | min-probe | 0.39 (0.27) | 5.01 | 5.77 | 97930 (97804) | 1323 / 1332 |
| F2-multi-ability | simple | 0.14 (0.11) | 1.13 | 1.20 | 29633 (29218) | 247 / 263 |
| F3-overlapping-fields | full | 0.23 (0.22) | 4.55 | 3.69 | 98560 (98458) | 1326 / 1337 |
| F3-overlapping-fields | min-probe | 0.27 (0.19) | 4.74 | 5.42 | 98325 (98293) | 1325 / 1328 |
| F3-overlapping-fields | simple | 0.16 (0.12) | 1.14 | 1.12 | 29578 (29492) | 243 / 254 |
| F4-legendary-scene | full | 0.30 (0.26) | 4.95 | 4.13 | 103989 (103052) | 1413 / 1432 |
| F4-legendary-scene | min-probe | 0.29 (0.23) | 4.93 | 5.28 | 102980 (102880) | 1405 / 1412 |
| F4-legendary-scene | simple | 0.14 (0.09) | 1.13 | 1.17 | 29867 (28953) | 248 / 265 |
| F5-sovereign-sequence | full | 0.21 (0.31) | 4.50 | 3.76 | 95711 (95684) | 1291 / 1343 |
| F5-sovereign-sequence | min-probe | 0.22 (0.26) | 4.72 | 5.06 | 95573 (95566) | 1291 / 1325 |
| F5-sovereign-sequence | simple | 0.13 (0.11) | 1.32 | 1.34 | 28430 (28408) | 236 / 255 |

#### Script attribution (sampling CPU profile, ms of main-thread time per second, unthrottled, outside the timed blocks)
| Block | seconds | browser (program: style, layout, paint, parse not attributed to script) | garbage collector | field draw (playback tick, field-view, effects, sprites) | harness | screen render and other UI | franchise and data (lineups, sprites lookups) | other | save | simulation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| render F2-multi-ability full | 64.8 | 239 | 155 | 106 | 4 | 3 | 2 | 0 | 0 | 0 |
| combined F2-multi-ability full | 65.7 | 213 | 20 | 107 | 2 | 4 | 2 | 0 | – | 26 |
| live L1-franchise-auto full | 65.6 | 193 | 16 | 92 | 5 | 6 | 5 | 0 | 0 | 2 |

#### Long tasks by mode and entry point
| Mode: entry | count | median ms | max ms |
| --- | --- | --- | --- |
| render: TimerFire | 2 | 298 | 298 |
| render: FireAnimationFrame | 62 | 58 | 288 |
| combined: FireAnimationFrame | 16 | 59 | 183 |
| live: FireAnimationFrame | 10 | 64 | 79 |
