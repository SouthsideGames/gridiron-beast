Run: task8-m6-f9e7581-runtime-claude-host-desktop; commit null; 2026-11-11T03:45:40.888Z to 2026-11-11T04:53:42.689Z; 2 CPUs (Intel(R) Xeon(R) Processor @ 2.10GHz); 141.0.7390.37 (chromium new headless); viewport 390x844 DPR 3; repeats 3, warm-up 1, plays 8, live 14 steps after 2.
Machine before start: busy 0.015, other processes 0.008 of all CPU time, load average 0.81 1.4 2.07. Mobile: mobile NOT VERIFIED (no Capacitor project in the repository (no capacitor.config.*, no android/ or ios/, no @capacitor/* package) and no mobile device attached (no adb devices, no iOS tooling)).
Status: quiet machine (competing CPU <= 0.05 and steal <= 0.05 CPU in every block); 0 of 23 summary rows PROVISIONAL. Headless desktop Chromium; not a phone; 4x CPU throttle is desktop emulation (an approximate indicator only), not mobile verification.
Identity checks: 27 blocks, 0 mismatches. Page errors: 0.

#### Simulation (game logic per play)
| Scene | Node, ms/play (median) | Page, combined/live 1x: median / max ms | Page, combined/live 4x: median / max ms |
| --- | --- | --- | --- |
| F1-ordinary | 2.69 | 4.8 / 9.8 | – |
| F2-multi-ability | 3.75 | 6.4 / 13.6 | – |
| F3-overlapping-fields | 1.40 | 2.1 / 6.4 | – |
| F4-legendary-scene | 2.82 | 5.1 / 10.1 | – |
| F5-sovereign-sequence | 19.39 | 5.6 / 9.4 | – |
| C1-clash-3v3 | 1.28 per battle | 2.3 / 2.3 | – |
| C2-clash-5v5 | 1.10 per battle | 3.2 / 3.2 | – |
| L1-franchise-auto | not separable (live game) | 8 / 29.5 | – |

#### Rendering (precomputed plays; the page simulates nothing)
| Scene | Config | Platform | avg ms | median | p95 | fps | ≤20 ms | >33 | >50 | long tasks (max ms) | script / style+layout / paint ms per s | play start ms (median / max) | load busy / other | competing / steal CPU, quality |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F1-ordinary | full | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 33 / 24 / 44 | 7.7 / 10.2 | 0.39 / 0 | 0 / 0.010 GOOD |
| F1-ordinary | simple | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 0 | 0 | 0 (0) | 26 / 15 / 25 | 3.8 / 5.3 | 0.36 / 0 | 0 / 0.010 GOOD |
| F2-multi-ability | full | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 32 / 25 / 47 | 7.2 / 10.2 | 0.38 / 0 | 0 / 0.010 GOOD |
| F2-multi-ability | simple | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 1 | 0 | 0 (0) | 26 / 17 / 26 | 4.2 / 7 | 0.37 / 0 | 0 / 0.010 GOOD |
| F3-overlapping-fields | full | desktop | 16.8 | 16.7 | 16.7 | 60 | 0.99 | 0 | 0 | 0 (0) | 39 / 36 / 53 | 7.8 / 11.2 | 0.44 / 0 | 0 / 0.020 GOOD |
| F3-overlapping-fields | simple | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 33 / 24 / 31 | 3.7 / 5.2 | 0.41 / 0 | 0 / 0.020 GOOD |
| F4-legendary-scene | full | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 1 | 0 | 0 (0) | 33 / 26 / 50 | 7.9 / 9.8 | 0.40 / 0 | 0 / 0.020 GOOD |
| F4-legendary-scene | simple | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 0 | 0 | 0 (0) | 26 / 16 / 27 | 4.4 / 5.7 | 0.38 / 0 | 0 / 0.020 GOOD |
| F5-sovereign-sequence | full | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 30 / 22 / 45 | 8.8 / 9.1 | 0.38 / 0 | 0 / 0.020 GOOD |
| F5-sovereign-sequence | simple | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 24 / 14 / 26 | 3.5 / 4.6 | 0.35 / 0 | 0 / 0.020 GOOD |
| C1-clash-3v3 | full | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 0 | 0 | 0 (0) | 25 / 30 / 83 | – / – | 0.32 / 0 | 0 / 0.010 GOOD |
| C1-clash-3v3 | simple | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 21 / 29 / 52 | – / – | 0.31 / 0 | 0 / 0.010 GOOD |
| C2-clash-5v5 | full | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 0 | 0 | 0 (0) | 22 / 33 / 90 | – / – | 0.33 / 0 | 0 / 0.020 GOOD |
| C2-clash-5v5 | simple | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 14 / 32 / 59 | – / – | 0.31 / 0 | 0 / 0.010 GOOD |

#### Combined (each snap simulated in the page when it is played)
| Scene | Config | Platform | avg ms | median | p95 | fps | ≤20 ms | >33 | >50 | long tasks (max ms) | script / style+layout / paint ms per s | sim + play start ms (median / max) | load busy / other | competing / steal CPU, quality |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F1-ordinary | full | desktop | 16.8 | 16.7 | 16.8 | 60 | 0.99 | 1 | 0 | 0 (0) | 35 / 25 / 45 | 11.3 / 16.6 | 0.39 / 0 | 0 / 0.010 GOOD |
| F2-multi-ability | full | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 2 | 1 | 0 (0) | 33 / 27 / 51 | 13.2 / 22.3 | 0.38 / 0 | 0 / 0.010 GOOD |
| F3-overlapping-fields | full | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 0 | 0 | 0 (0) | 38 / 33 / 51 | 10.8 / 14.6 | 0.40 / 0 | 0 / 0.020 GOOD |
| F4-legendary-scene | full | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 1 | 0 | 0 (0) | 31 / 23 / 47 | 12.6 / 23.4 | 0.37 / 0 | 0 / 0.010 GOOD |
| F5-sovereign-sequence | full | desktop | 16.8 | 16.7 | 16.8 | 60 | 0.99 | 0 | 0 | 0 (0) | 30 / 20 / 42 | 13.8 / 14.8 | 0.37 / 0 | 0 / 0.010 GOOD |
| C1-clash-3v3 | full | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 0 | 0 | 0 (0) | 30 / 32 / 87 | 13.7 / 13.7 | 0.32 / 0 | 0 / 0.010 GOOD |
| C2-clash-5v5 | full | desktop | 16.7 | 16.7 | 16.8 | 60 | 1 | 0 | 0 | 0 (0) | 24 / 35 / 86 | 16 / 16 | 0.33 / 0 | 0 / 0.010 GOOD |

#### Live (real franchise match in Auto; frames from each snap to the end of its playback)
| Scene | Config | Platform | avg ms | median | p95 | fps | ≤20 ms | >33 | >50 | long tasks (max ms) | script / style+layout / paint ms per s | session avg / p95 / >33 / >50 | load busy / other | competing / steal CPU, quality |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1-franchise-auto | full | desktop | 16.8 | 16.7 | 16.7 | 60 | 0.99 | 3 | 1 | 1 (54) | 41 / 24 / 50 | 16.8 / 16.8 / 3 / 1 | 0.40 / 0 | 0 / 0.010 GOOD |
| L1-franchise-auto | simple | desktop | 16.7 | 16.7 | 16.7 | 60 | 1 | 0 | 0 | 0 (0) | 31 / 17 / 29 | 16.7 / 16.7 / 0 / 0 | 0.37 / 0 | 0 / 0.010 GOOD |

#### Three-way, default configuration (full)
| Scene | Platform | Simulation ms/play (Node / page) | Rendering avg / p95 / >33 / >50 | Combined avg / p95 / >33 / >50 | Live avg / p95 / >33 / >50 |
| --- | --- | --- | --- | --- | --- |
| F1-ordinary | verified desktop | 2.69 / 4.8 | 16.7 / 16.7 / 0 / 0 | 16.8 / 16.8 / 1 / 0 | – |
| F2-multi-ability | verified desktop | 3.75 / 6.4 | 16.7 / 16.7 / 0 / 0 | 16.7 / 16.7 / 2 / 1 | – |
| F3-overlapping-fields | verified desktop | 1.40 / 2.1 | 16.8 / 16.7 / 0 / 0 | 16.7 / 16.8 / 0 / 0 | – |
| F4-legendary-scene | verified desktop | 2.82 / 5.1 | 16.7 / 16.8 / 1 / 0 | 16.7 / 16.8 / 1 / 0 | – |
| F5-sovereign-sequence | verified desktop | 19.39 / 5.6 | 16.7 / 16.7 / 0 / 0 | 16.8 / 16.8 / 0 / 0 | – |
| C1-clash-3v3 | verified desktop | 1.28 / 2.3 | 16.7 / 16.8 / 0 / 0 | 16.7 / 16.8 / 0 / 0 | – |
| C2-clash-5v5 | verified desktop | 1.10 / 3.2 | 16.7 / 16.8 / 0 / 0 | 16.7 / 16.8 / 0 / 0 | – |
| L1-franchise-auto | verified desktop | – / 8 | – | – | 16.8 / 16.7 / 3 / 1 |

#### Draw profile (per field draw, unthrottled, outside the timed blocks)
| Scene | Config | build ms (no fx) | DOM parse ms | style+layout ms | chars (no fx) | elements mean / max |
| --- | --- | --- | --- | --- | --- | --- |
| F1-ordinary | full | 0.33 (0.24) | 4.61 | 7.99 | 97524 (97521) | 1341 / 1356 |
| F1-ordinary | simple | 0.26 (0.14) | 0.91 | 0.99 | 28727 (28724) | 256 / 262 |
| F2-multi-ability | full | 0.45 (0.16) | 4.65 | 8.10 | 104105 (97964) | 1393 / 1407 |
| F2-multi-ability | simple | 0.34 (0.09) | 1.28 | 1.32 | 34724 (29458) | 307 / 316 |
| F3-overlapping-fields | full | 0.74 (0.16) | 4.78 | 8.59 | 104309 (98279) | 1398 / 1411 |
| F3-overlapping-fields | simple | 0.22 (0.14) | 1.14 | 1.25 | 34571 (29732) | 306 / 318 |
| F4-legendary-scene | full | 0.47 (0.15) | 4.73 | 8.50 | 101799 (98068) | 1378 / 1438 |
| F4-legendary-scene | simple | 0.23 (0.11) | 1.14 | 1.05 | 32062 (29200) | 285 / 301 |
| F5-sovereign-sequence | full | 0.27 (0.15) | 4.08 | 7.33 | 95807 (95530) | 1312 / 1366 |
| F5-sovereign-sequence | simple | 0.28 (0.08) | 1.00 | 0.96 | 28920 (28644) | 258 / 282 |

#### Long tasks by mode and entry point
| Mode: entry | count | median ms | max ms |
| --- | --- | --- | --- |
| live: TimerFire | 2 | 55 | 55 |
