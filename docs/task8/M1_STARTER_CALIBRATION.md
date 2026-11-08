# M1 measurement: founding-roster strength under the Dex generator

**Status: measurement for the owner. Nothing has been tuned.** (2026-11-08 section below: D1 option 2.) Tool: `tools/t8-starter-calibration.mjs` (3 seeds × 16 clubs,
founding rosters, depth-chart starters).

| | Before Task 8 (285 starters) | M1 switch (855 starters) |
| --- | --- | --- |
| Mean starter OVR | 57.9 | **49.3** |
| 10th percentile | 52 | **34** |
| Median | – | 49 |
| 90th percentile | 66 | 64 |
| Lowest starter | – | 21 |

By position (mean OVR): QB 58.2, K 58.9, OL 52.0, DL 51.4, TE 49.5, LB 47.8, S 47.8, WR 46.5, CB 44.4, **RB 41.0**.
The owner's founding starters average 47.0 (10th percentile 31). Basics are 5% of starters (the 25% roster share mostly lands in
depth). 17–29% of starters at each position are first-year, level-1 individuals.

**Why.** The approved mapping t = Φ((q − 56)/5.3) picks a percentile of each form's *level-1* distribution. The prior-career
simulation then adds growth by years as a pro. So a starter's strength now depends strongly on age, and a young starter can be far
below the old floor of 52. The football and Clash engines were tuned on the old, narrower distribution.

**Not decided here.** This is the approved initial calibration (N7f). Possible directions, for the owner only:
1. keep it (wider spread; age and development matter more);
2. map the target onto the *post-history* rating distribution for the channel, so veterans and young starters land near the
   intended strength;
3. give founding starters a veteran age profile.
The franchise-health reports (seasons 5, 10, 15, 20) and the economy recalibration (#30) will show the gameplay effect.

## 2026-11-08: post-history founding selection (owner ruling N8b D1, option 2)

**Change.** Founding rosters (each position's starter and depth, owner and AI) now keep the candidate whose *post-history* current
OVR sits nearest the target percentile of his form at the same career band (CLUB_STRENGTH_SELECTION.md item 5). Nine legal
candidates, one Apex roll, ratings untouched, as approved. Two points the ruling did not settle are recorded there: the career is
evaluated under a neutral Temper (selecting on the real post-history rating favoured position-suited Tempers, chi-square 370), and
the prior-career participation profile follows the target percentile.

**League measurement** (`tools/t8-starter-calibration.mjs`, 3 seeds × 16 clubs, depth-chart starters):

| | Before Task 8 | M1 switch (before D1) | D1 option 2 |
| --- | --- | --- | --- |
| Mean starter OVR | 57.9 | 49.3 | **48.5** |
| 10th percentile | 52 | 34 | **33** |
| Median | – | 49 | 49 |
| 90th percentile | 66 | 64 | 64 |
| Lowest starter | – | 21 | **20** |
| Owner's starters, mean (p10) | – | 47.0 (31) | 47.6 (33) |

| Position | Mean before → after | p10 before → after | Min before → after |
| --- | --- | --- | --- |
| QB | 58.2 → 61.0 | 49 → 50 | 27 → 35 |
| RB | 41.0 → 37.5 | 28 → 28 | 25 → 20 |
| WR | 46.5 → 45.8 | 33 → 33 | 25 → 27 |
| TE | 49.5 → 47.5 | 40 → 37 | 21 → 28 |
| OL | 52.0 → 50.0 | 36 → 34 | 28 → 27 |
| DL | 51.4 → 50.7 | 41 → 39 | 22 → 28 |
| LB | 47.8 → 45.9 | 33 → 32 | 29 → 21 |
| CB | 44.4 → 44.2 | 33 → 33 | 27 → 21 |
| S | 47.8 → 46.4 | 34 → 31 | 23 → 22 |
| K | 58.9 → 63.6 | 45 → 42 | 35 → 29 |

The league numbers move by sampling as much as by the rule: the generation order changed, so different species, ages and
first-year shares land in each lineup (TE first-year share 22% → 42%, QB 27% → 11%), and a position has only 45–135 starters.

**Paired measurement** (same species, quality, id and age; level-1 selection then career against post-history selection; 1,500
events over the ten positions, qualities 54 and 60, ages 20–28):

| Prior seasons | Mean before → after | p10 before → after | Min before → after |
| --- | --- | --- | --- |
| 0 | 39.3 → 39.3 | 30 → 30 | 26 → 26 |
| 1–2 | 42.9 / 46.4 → 43.0 / 47.0 | 32 / 34 → 33 / 36 | 28 / 28 → 30 / 33 |
| 3–4 | 51.0 / 53.5 → 51.4 / 55.1 | 42 / 41 → 43 / 45 | 34 / 27 → 40 / 40 |
| 5–6 | 55.8 / 57.3 → 57.7 / 58.9 | 45 / 45 → 47 / 48 | 23 / 31 → 37 / 37 |
| all | 48.1 → 48.9 | 33 → 33 | 23 → 26 |

**Reading.** Option 2 does what it says: a veteran is now typical for his career, so veterans gain 0–2 OVR on average, their spread narrows,
and their floor rises by 2–14 points. It does **not** restore the old strength. Most of the gap is in young and first-year players, who have no prior
career for the mapping to act on (39 either way), and in the Dex level-1 distribution itself. Closing the gap would need another
owner decision (D1 option 3, or the calibration of the target mapping); nothing else was tuned.

**Cost.** Each veteran now lives ten prior careers (nine evaluations and his own), and the percentile is read from a post-history
reference per form, start age and profile. Computing those references at run time would take minutes per new franchise (about
0.3 s per band, 300+ bands per league), so they are precomputed (`tools/t8-history-reference.mjs`, 1,080 bands, 336 s on this
machine, `src/data/t8-history-reference.generated.js`, 276 KB). `createFranchise` on this 2-CPU machine, same session, alternating
runs: first franchise in a fresh process 3.9–4.6 s → 5.4–6.7 s; each later franchise 0.6–0.9 s → 2.0–3.8 s (about +1.5 to +2.5 s,
roughly three times). Tests that create many franchises slow down accordingly.

## Franchise-creation cost after D1, profiled and reduced (owner 2026-11-08 10:33)

**Matched scenario:** `createFranchise` for seeds 1–8, Pro difficulty, persistent league, the same club and cornerstones, one
process per build. A warm-up franchise is created first, so module loading and one-time tables are excluded. Wall time was
measured on the shared container while a full test run was going on, so compare the builds against each other rather than in
absolute terms.

| Build | Warm creation, mean (seeds 1–8) | Cold first franchise | 10 full games |
| --- | --- | --- | --- |
| 145897e (before D1) | 718 ms | 4.6–4.8 s | 7.2–7.3 s |
| 0d60997 (D1, before the optimization) | 2,569 ms (3.6× before D1) | 6.8–7.3 s | 7.1–7.6 s |
| D1 with the optimization | 1,094 ms (1.5× before D1) | 2.9–3.0 s | 7.8–7.9 s |

**Startup and game simulation are separate.** Game simulation does not change across the three builds; the differences are
within this container's noise. D1 adds cost only at creation, where each founding starter's nine candidates each live their
prior career before one is kept.

**Where the time went** (CPU profile, D1 before the optimization, three franchises plus the warm-up, 15.4 s in all):
- `selectIndividual`: 12.3 s. Of this, the candidates' prior careers (`runHistory` → `simulateHistory`) took 7.3 s and drawing
  the candidates took 3.6 s.
- Inside the careers:
  - fraction arithmetic (`frac`): 3.8 s self;
  - the per-attribute map builder: 2.8 s;
  - the training allocator: 3.7 s inclusive, which rebuilt a monster copy and an exact fraction for every attribute of every
    point;
  - the JSON-cloned neutral copy: 0.6 s.
- One-time, per process: the D7 scheme-fit thresholds (`fitThresholds`, 3.5 s under the profiler).

**What changed (performance only; nothing generated changes):**
- Allocation scores use the cost quotient C / E directly. It is exact, because C is 1–4 and E is 2, 1 or 0.5.
- The allocator builds one cost probe per point and reads the fixed weights once per call.
- The whole natural entitlement is an integer quotient, the same value as the floor of the exact fraction.
- Each form's next form is cached.
- The attribute-map builder is a plain loop with the same keys and order.
- The neutral evaluation copy is a field copy instead of a JSON round trip. Fractions are frozen and only ever replaced.

**Verification:**
- Eight franchises, seeds 1–8, serialize byte-identical before and after the optimization (ignoring the save's uid and creation
  timestamp).
- The precomputed history-reference bands still recompute exactly (task8-selection).
- The targeted progression, selection, ageing, identity, evolution and stat-guide tests pass: 42 of 42.
- The selection rules, Apex odds, generation shares, Temper neutrality and development history are untouched.

**Remaining:**
- Creation is still about 1.5× its pre-D1 cost, the inherent cost of ten prior careers per founding starter.
- The one-time fit-threshold table is the largest part of the cold first franchise.
