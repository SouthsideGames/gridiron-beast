# M2 completion status (2026-11-07)

| Item | Status | Where |
| --- | --- | --- |
| Independent training-progress bar | **Done.** Stored separately from level XP; one banked point per full bar, excess carried; continues at level 50; never converted from level XP | `t8/progression.js`, `progression.js applyAward` |
| Approved activity rewards | **Done**, through the reward ledger (once per activity and monster), apart from the grade adjustment and performance bonus (transitional until M5 grading) | `progression.js`, `development.js`, `clash-link.js` |
| Offseason award | **Done and separate:** 2 banked points; the bar is untouched | `progression.js offseason` |
| Shared statuses | **Done** (gate, participation clocks, whistle and game-end clearing, Stunned carryover, Clash transfer helpers). Producers are the abilities (M3) | `t8/status-runtime.js` |
| Fields | **Runtime done** (placement, pending creation G3, clocks G1/G2, halftime). Element effects arrive with their producing abilities (Light: done with Beacon Lane) | `t8/field-runtime.js` |
| Pancakes and the shed formula | **Done** (B1/B2/P5). The real-game rebenchmark on Dex ratings is an M6 gate | `engine.js`, `t8/pancake.js` |
| Stamina | **Done** (capacity = permanent Durability; 1 per played play; halftime +50%; exhaustion halves attributes once). Balance input: 2.6% of participants exhausted in a sample of 8 AI games. The low-stamina battery is M6 presentation | `t8/stamina-runtime.js` |
| Live kickoffs and special-teams units | **Done**, with the blocking fix (D10). Hang time and clock runoff provisional | `rules.js`, `engine.js` |
| Telemetry (B8) | **Moved to M5** with grading (its only consumer) | BUILD_PLAN |
| Rubber-banding retired | **Done** (N7f) | `franchise.js` |
