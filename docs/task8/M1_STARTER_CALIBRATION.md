# M1 measurement: founding-roster strength under the Dex generator

**Status: measurement for the owner. Nothing has been tuned.** Tool: `tools/t8-starter-calibration.mjs` (3 seeds × 16 clubs,
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
