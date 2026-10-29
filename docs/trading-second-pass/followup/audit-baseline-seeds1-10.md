# Independent trade audit — v42.16.0 baseline, seeds 1-10

Seeds 10, deals 206 (in season 1, offseason 205). Rules: {"gainMin":2,"overpayGain":4,"hollow":4,"capFloorShare":0.015,"agingAge":31,"agingYears":2,"oldAge":33,"longInjuryWeeks":3}

| Window | Deals | noStarterGain | pickOverpay | hollowSeller | capStrain | agingBurden | kickerFirst | churn | thinDepth | any harm flag | buyer starters Δ (mean) | position starters Δ | seller starters Δ | buyer room after (mean, cr) | picks paid (R1 / any) | age (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| in-season | 1 | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 0% (0/1) | 3 | 3 | 14 | 62,240 | 0 / 0 | 25 |
| offseason | 205 | 0% (0/205) | 23.4% (48/205) | 1.5% (3/205) | 0% (0/205) | 2% (4/205) | 13.2% (27/205) | 3.4% (7/205) | 50.2% (103/205) | 35.6% (73/205) | 6.4 | 14 | -0.1 | 267,718 | 150 / 197 | 24.8 |
| all | 206 | 0% (0/206) | 23.3% (48/206) | 1.5% (3/206) | 0% (0/206) | 1.9% (4/206) | 13.1% (27/206) | 3.4% (7/206) | 50% (103/206) | 35.4% (73/206) | 6.4 | 13.9 | 0 | 266,721 | 150 / 197 | 24.8 |

## Kickers (31 deals)

| seed | yr | wk | buyer | kicker | age | paid | buyer K starters Δ | buyer room after | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | 0 | Sundown Drakes | K60 | 24 | 3R1 | 2 | 335,180 | pickOverpay, kickerFirst, thinDepth |
| 1 | 7 | 0 | Ember City Beasts | K67 | 24 | 8R2 + 8R1 | 4 | 164,120 | kickerFirst, thinDepth |
| 1 | 9 | 0 | Northstar Wolves | K63 | 28 | 10R1 | 9 | 265,300 | kickerFirst, thinDepth |
| 1 | 10 | 0 | Ashford Hawks | K65 | 30 | 11R1 | 2 | 323,220 | pickOverpay, kickerFirst, thinDepth |
| 2 | 5 | 0 | Stonehaven Titans | K63 | 28 | 6R1 | 8 | 306,240 | kickerFirst, thinDepth |
| 2 | 6 | 0 | Stormport Bolts | K68 | 31 | 7R3 + 7R1 | 6 | 305,380 | kickerFirst, thinDepth |
| 2 | 9 | 0 | Ashford Hawks | K62 | 28 | 10R3 + 10R1 | 4 | 232,420 | kickerFirst, thinDepth |
| 3 | 4 | 0 | Sundown Drakes | K65 | 22 | 5R2 + 5R1 | 3 | 295,420 | pickOverpay, kickerFirst, thinDepth |
| 3 | 10 | 0 | Northstar Wolves | K69 | 29 | 11R3 + 11R1 | 8 | 224,280 | kickerFirst, thinDepth |
| 4 | 2 | 0 | Bayou Stalkers | K63 | 23 | 3R2 + 3R1 | 3 | 377,060 | pickOverpay, kickerFirst, thinDepth |
| 4 | 7 | 0 | Glacier Guardians | K61 | 24 | 8R1 | 2 | 292,280 | pickOverpay, kickerFirst, thinDepth |
| 5 | 8 | 0 | Sunfire Lions | K64 | 23 | 9R2 + 9R1 | 4 | 224,740 | kickerFirst |
| 5 | 10 | 0 | Ember City Beasts | K69 | 24 | 11R2 + 11R1 | 4 | 171,360 | kickerFirst, thinDepth |
| 6 | 3 | 0 | Sunfire Lions | K61 | 29 | 4R1 | 3 | 229,620 | pickOverpay, kickerFirst, thinDepth |
| 6 | 10 | 0 | Eastport Phantoms | K65 | 26 | 11R3 + 11R1 | 2 | 201,820 | pickOverpay, kickerFirst, thinDepth |
| 7 | 2 | 0 | Ember City Beasts | K61 | 27 | 3R1 | 16 | 308,860 | kickerFirst, thinDepth |
| 7 | 7 | 0 | Ember City Beasts | K59 | 27 | 8R1 | 59 | 267,480 | kickerFirst, thinDepth |
| 7 | 7 | 0 | Stonehaven Titans | K59 | 26 | 8R1 | 8 | 272,300 | kickerFirst |
| 7 | 8 | 0 | Sunfire Lions | K71 | 31 | 9R2 + 9R1 | 7 | 251,880 | kickerFirst, thinDepth |
| 8 | 2 | 0 | Northstar Wolves | K61 | 22 | 3R3 + 3R1 | 3 | 266,180 | pickOverpay, kickerFirst, thinDepth |
| 8 | 8 | 0 | Eastport Phantoms | K69 | 24 | 9R2 + 9R1 | 2 | 153,740 | pickOverpay, kickerFirst, thinDepth |
| 9 | 2 | 0 | Stormport Bolts | K60 | 20 | 3R1 | 4 | 326,920 | kickerFirst, thinDepth |
| 9 | 10 | 0 | Stormport Bolts | K69 | 31 | 11R3 + 11R1 | 9 | 226,200 | kickerFirst, thinDepth |
| 10 | 5 | 0 | Stonehaven Titans | K66 | 28 | 6R2 + 6R1 | 4 | 96,640 | kickerFirst, churn, thinDepth |
| 10 | 6 | 0 | Frostpeak Howlers | K66 | 23 | 7R2 + 7R1 | 2 | 195,540 | pickOverpay, kickerFirst, thinDepth |
| 10 | 6 | 0 | Stonehaven Titans | K65 | 29 | 7R1 | 65 | 301,920 | kickerFirst, thinDepth |
| 10 | 8 | 0 | Northstar Wolves | K71 | 29 | 9R2 + 9R1 | 4 | 223,940 | kickerFirst, thinDepth |
| 1 | 7 | 0 | Ashford Hawks | K57 | 26 | 8R3 + 8R2 | 57 | 282,920 | thinDepth |
| 3 | 3 | 0 | Sundown Drakes | K58 | 27 | 4R3 + 4R2 | 2 | 221,060 | thinDepth |
| 4 | 9 | 0 | Bayou Stalkers | K55 | 25 | 10R2 | 55 | 400,880 | thinDepth |
| 10 | 2 | 0 | Stonehaven Titans | K56 | 23 | 3R3 + 3R2 | 4 | 264,220 | thinDepth |

## By position acquired

| pos | deals | R1 spent | mean starter gain | mean position gain | any flag |
|---|---|---|---|---|---|
| CB | 22 | 14 | 4.9 | 21.8 | 22.7% (5/22) |
| DL | 12 | 6 | 4.8 | 22.7 | 8.3% (1/12) |
| K | 31 | 27 | 11.8 | 11.8 | 87.1% (27/31) |
| LB | 27 | 20 | 4.9 | 13.2 | 44.4% (12/27) |
| OL | 28 | 17 | 6.3 | 12.2 | 21.4% (6/28) |
| QB | 15 | 13 | 6.9 | 6.9 | 13.3% (2/15) |
| RB | 12 | 9 | 4.3 | 9.5 | 16.7% (2/12) |
| S | 20 | 16 | 6.6 | 12 | 35% (7/20) |
| TE | 23 | 16 | 5.5 | 15.2 | 26.1% (6/23) |
| WR | 16 | 12 | 4.7 | 15.8 | 31.3% (5/16) |

## In-season deals

| seed | yr | wk | kind | buyer ← seller | got | paid | starters Δ | pos Δ | seller Δ | room after | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 7 | 7 | 2 | swap | Glacier Guardians ← Ember City Beasts | TE60 a25 y0 | DL61 | 3 | 3 | 14 | 62k | – |
