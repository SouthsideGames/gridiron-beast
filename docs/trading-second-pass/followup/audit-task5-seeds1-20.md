# Independent trade audit — Task 5, seeds 1-20

Seeds 20, deals 654 (in season 183, offseason 471). Rules: {"gainMin":2,"overpayGain":4,"hollow":4,"capFloorShare":0.015,"agingAge":31,"agingYears":2,"oldAge":33,"longInjuryWeeks":3}

| Window | Deals | noStarterGain | pickOverpay | hollowSeller | capStrain | agingBurden | kickerFirst | churn | thinDepth | any harm flag | buyer starters Δ (mean) | position starters Δ | seller starters Δ | buyer room after (mean, cr) | picks paid (R1 / any) | age (mean) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| in-season | 183 | 1.6% (3/183) | 0% (0/183) | 0.5% (1/183) | 2.2% (4/183) | 0.5% (1/183) | 0.5% (1/183) | 0.5% (1/183) | 11.5% (21/183) | 6% (11/183) | 8.2 | 8.2 | 0.5 | 69,069 | 13 / 134 | 26.2 |
| offseason | 471 | 4.2% (20/471) | 3.8% (18/471) | 9.3% (44/471) | 0% (0/471) | 1.5% (7/471) | 0.4% (2/471) | 2.3% (11/471) | 24.4% (115/471) | 21.2% (100/471) | 5.2 | 9.7 | -0.5 | 242,635 | 70 / 237 | 23.9 |
| all | 654 | 3.5% (23/654) | 2.8% (18/654) | 6.9% (45/654) | 0.6% (4/654) | 1.2% (8/654) | 0.5% (3/654) | 1.8% (12/654) | 20.8% (136/654) | 17% (111/654) | 6 | 9.3 | -0.2 | 194,069 | 83 / 371 | 24.6 |

## Kickers (21 deals)

| seed | yr | wk | buyer | kicker | age | paid | buyer K starters Δ | buyer room after | flags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 8 | 3 | Harbor Sentinels | K70 | 24 | 10R1 + DL57 | 9 | 95,720 | kickerFirst, thinDepth |
| 9 | 9 | 0 | Ashford Hawks | K65 | 23 | 10R1 | 65 | 249,620 | kickerFirst, thinDepth |
| 10 | 10 | 0 | Frostpeak Howlers | K77 | 25 | 11R1 + DL60 | 10 | 134,940 | kickerFirst, thinDepth |
| 1 | 10 | 0 | Sunfire Lions | K63 | 21 | 11R2 + OL59 | 0 | 125,940 | thinDepth |
| 2 | 5 | 0 | Sundown Drakes | K63 | 28 | DL58 | 13 | 325,960 | thinDepth |
| 2 | 6 | 4 | Ember City Beasts | K68 | 26 | 7R3 + TE56 | 4 | 62,800 | thinDepth |
| 2 | 7 | 0 | Northstar Wolves | K64 | 31 | RB54 | 13 | 414,620 | – |
| 2 | 9 | 0 | Harbor Sentinels | K71 | 20 | 10R3 + CB59 | 5 | 160,660 | thinDepth |
| 5 | 7 | 3 | Sunfire Lions | K72 | 31 | 9R2 + WR55 | 13 | 89,480 | thinDepth |
| 5 | 10 | 3 | Palmetto Vipers | K75 | 26 | 11R2 + LB56 | 6 | 39,640 | thinDepth |
| 8 | 5 | 0 | Canyon Crushers | K61 | 25 | 6R3 + CB55 | 0 | 170,360 | thinDepth |
| 13 | 6 | 0 | Ember City Beasts | K66 | 27 | 7R3 + LB59 | 5 | 179,860 | churn, thinDepth |
| 16 | 9 | 2 | Sundown Drakes | K73 | 27 | 11R2 + WR60 | 18 | 49,360 | thinDepth |
| 17 | 3 | 0 | Palmetto Vipers | K66 | 22 | 4R2 + RB55 | 0 | 172,700 | thinDepth |
| 17 | 4 | 5 | Glacier Guardians | K65 | 27 | 6R2 + RB48 | 8 | 102,280 | thinDepth |
| 18 | 9 | 0 | Palmetto Vipers | K77 | 30 | 10R3 + S60 | 16 | 79,140 | thinDepth |
| 18 | 9 | 6 | Sundown Drakes | K65 | 26 | 11R3 + RB53 | 7 | 67,280 | – |
| 19 | 9 | 0 | Northstar Wolves | K60 | 23 | RB53 | 60 | 372,000 | thinDepth |
| 19 | 9 | 2 | Sundown Drakes | K61 | 24 | CB62 | 7 | 56,920 | – |
| 20 | 5 | 0 | Thunder Mesa | K63 | 25 | 6R2 + LB52 | 0 | 127,520 | thinDepth |
| 20 | 5 | 0 | Stonehaven Titans | K61 | 26 | S61 | 7 | 155,540 | thinDepth |

## By position acquired

| pos | deals | R1 spent | mean starter gain | mean position gain | any flag |
|---|---|---|---|---|---|
| CB | 90 | 18 | 5 | 9.3 | 23.3% (21/90) |
| DL | 95 | 0 | 5.3 | 8.9 | 18.9% (18/95) |
| K | 21 | 3 | 12.3 | 12.7 | 19% (4/21) |
| LB | 71 | 3 | 4.7 | 8.4 | 14.1% (10/71) |
| OL | 76 | 0 | 6.3 | 6.6 | 18.4% (14/76) |
| QB | 38 | 13 | 11.4 | 15.8 | 10.5% (4/38) |
| RB | 47 | 22 | 4.7 | 7.8 | 19.1% (9/47) |
| S | 55 | 0 | 6.8 | 9.9 | 3.6% (2/55) |
| TE | 47 | 23 | 6.3 | 13.7 | 23.4% (11/47) |
| WR | 114 | 1 | 5.4 | 7.9 | 15.8% (18/114) |

## In-season deals

| seed | yr | wk | kind | buyer ← seller | got | paid | starters Δ | pos Δ | seller Δ | room after | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 4 | 6 | swap+picks | Stormport Bolts ← Northstar Wolves | TE60 a21 y1 | 6R3 + QB61 | 5 | 5 | 0 | 103k | – |
| 1 | 5 | 2 | swap | Bayou Stalkers ← Frostpeak Howlers | LB58 a24 y1 | DL59 | 4 | 4 | 0 | 72k | – |
| 1 | 6 | 4 | swap+picks | Northstar Wolves ← Thunder Mesa | CB61 a28 y1 | 8R3 + QB60 | 4 | 4 | 0 | 78k | – |
| 1 | 7 | 2 | swap | Northstar Wolves ← Sunfire Lions | DL59 a24 y1 | CB61 | 6 | 6 | 0 | 76k | – |
| 1 | 7 | 6 | swap+picks | Thunder Mesa ← Canyon Crushers | RB72 a29 y1 | 8R3 + RB67 | 4 | 4 | 0 | 82k | – |
| 1 | 8 | 3 | swap+picks | Harbor Sentinels ← Palmetto Vipers | K70 a24 y1 | 10R1 + DL57 | 9 | 9 | 0 | 96k | kickerFirst, thinDepth |
| 1 | 9 | 4 | swap+picks | Stormport Bolts ← Frostpeak Howlers | S70 a28 y1 | 10R2 + QB53 | 12 | 12 | 0 | 52k | thinDepth |
| 1 | 9 | 5 | swap+picks | Bayou Stalkers ← Thunder Mesa | LB64 a24 y1 | 11R3 + K71 | 8 | 8 | 0 | 41k | – |
| 2 | 1 | 2 | swap+picks | Bayou Stalkers ← Palmetto Vipers | S64 a25 y1 | 2R2 + CB55 | 13 | 13 | 0 | 165k | – |
| 2 | 2 | 3 | swap+picks | Bayou Stalkers ← Palmetto Vipers | OL60 a23 y1 | 3R3 + CB52 | 4 | 4 | 0 | 91k | – |
| 2 | 2 | 8 | swap | Stonehaven Titans ← Eastport Phantoms | DL60 a22 y1 | LB57 | 7 | 7 | 0 | 133k | – |
| 2 | 5 | 6 | swap+picks | Ashford Hawks ← Canyon Crushers | S60 a25 y1 | 7R3 + TE53 | 10 | 10 | 0 | 73k | – |
| 2 | 6 | 3 | swap+picks | Northstar Wolves ← Ironpeak Rams | TE74 a30 y0 | 8R2 + TE62 | 11 | 11 | 0 | 73k | – |
| 2 | 6 | 4 | swap+picks | Ember City Beasts ← Palmetto Vipers | K68 a26 y1 | 7R3 + TE56 | 4 | 4 | 0 | 63k | thinDepth |
| 2 | 7 | 4 | swap+picks | Ember City Beasts ← Sundown Drakes | DL68 a28 y1 | 9R3 + WR61 | 15 | 15 | 3 | 50k | – |
| 2 | 7 | 6 | swap | Sunfire Lions ← Bayou Stalkers | S69 a31 y1 | RB61 | 5 | 5 | 0 | 93k | – |
| 2 | 8 | 5 | swap+picks | Stonehaven Titans ← Canyon Crushers | CB71 a29 y1 | 10R3 + LB68 | 9 | 9 | 0 | 54k | – |
| 2 | 9 | 2 | swap | Sundown Drakes ← Sunfire Lions | S64 a28 y1 | DL62 | 13 | 13 | 2 | 74k | – |
| 2 | 9 | 3 | swap+picks | Bayou Stalkers ← Harbor Sentinels | CB62 a25 y0 | 11R3 + TE55 | 0 | 0 | 0 | 37k | noStarterGain |
| 2 | 10 | 6 | swap+picks | Ashford Hawks ← Harbor Sentinels | QB77 a28 y1 | 11R1 + CB58 | 13 | 13 | 0 | 5k | thinDepth |
| 3 | 2 | 2 | swap+picks | Bayou Stalkers ← Frostpeak Howlers | WR60 a23 y1 | 4R3 + TE53 | 7 | 7 | 0 | 108k | – |
| 3 | 3 | 5 | swap+picks | Stonehaven Titans ← Frostpeak Howlers | DL62 a23 y0 | 4R3 + LB56 | 10 | 10 | 0 | 105k | – |
| 3 | 4 | 2 | swap | Sundown Drakes ← Palmetto Vipers | DL61 a25 y1 | CB59 | 6 | 6 | 0 | 92k | – |
| 3 | 5 | 3 | swap | Northstar Wolves ← Canyon Crushers | LB63 a29 y1 | QB55 | 7 | 7 | 0 | 91k | – |
| 3 | 5 | 4 | swap+picks | Bayou Stalkers ← Palmetto Vipers | DL59 a24 y1 | 7R3 + TE54 | 10 | 10 | 0 | 68k | – |
| 3 | 7 | 2 | swap+picks | Stonehaven Titans ← Ironpeak Rams | CB73 a28 y0 | 8R2 + WR61 | 17 | 17 | 0 | 59k | – |
| 3 | 7 | 5 | swap+picks | Ember City Beasts ← Ironpeak Rams | S71 a28 y1 | 8R3 + CB62 | 6 | 6 | 0 | 41k | – |
| 3 | 8 | 8 | swap+picks | Glacier Guardians ← Palmetto Vipers | S72 a29 y1 | 10R2 + RB57 | 5 | 5 | 0 | 28k | thinDepth |
| 3 | 9 | 6 | swap+picks | Bayou Stalkers ← Ember City Beasts | QB74 a30 y1 | 10R2 + WR67 | 12 | 12 | 0 | 12k | thinDepth |
| 3 | 9 | 7 | swap+picks | Northstar Wolves ← Harbor Sentinels | LB65 a29 y1 | 11R3 + OL66 | 12 | 12 | 0 | 51k | – |
| 4 | 4 | 2 | swap+picks | Bayou Stalkers ← Ashford Hawks | RB61 a22 y1 | 6R3 + QB61 | 5 | 5 | 0 | 96k | – |
| 4 | 5 | 2 | swap+picks | Sundown Drakes ← Glacier Guardians | S64 a27 y0 | 7R3 + K61 | 13 | 13 | 0 | 89k | – |
| 4 | 5 | 4 | swap | Harbor Sentinels ← Bayou Stalkers | LB64 a29 y1 | WR63 | 4 | 4 | 1 | 94k | – |
| 4 | 8 | 3 | swap+picks | Glacier Guardians ← Thunder Mesa | WR65 a22 y1 | 9R3 + CB66 | 4 | 4 | 0 | 59k | – |
| 4 | 8 | 4 | swap+picks | Thunder Mesa ← Ironpeak Rams | S74 a28 y0 | 10R2 + RB55 | 8 | 8 | 0 | 61k | – |
| 4 | 8 | 5 | swap+picks | Stormport Bolts ← Northstar Wolves | WR66 a21 y1 | 10R3 + TE59 | 5 | 5 | 0 | 40k | – |
| 4 | 9 | 3 | swap | Bayou Stalkers ← Ashford Hawks | DL68 a28 y0 | S68 | 15 | 15 | 14 | 31k | – |
| 4 | 9 | 7 | swap+picks | Northstar Wolves ← Palmetto Vipers | WR69 a29 y1 | 11R2 + CB65 | 10 | 10 | 0 | 41k | – |
| 4 | 9 | 8 | swap+picks | Thunder Mesa ← Bayou Stalkers | CB76 a24 y1 | 11R1 + CB69 | 6 | 6 | -7 | 52k | hollowSeller |
| 4 | 10 | 4 | swap | Bayou Stalkers ← Thunder Mesa | WR70 a28 y1 | CB69 | 7 | 7 | 0 | 34k | – |
| 4 | 10 | 5 | swap+picks | Bayou Stalkers ← Glacier Guardians | DL65 a23 y1 | 12R2 + WR58 | 10 | 10 | 0 | 32k | – |
| 5 | 4 | 7 | swap+picks | Glacier Guardians ← Canyon Crushers | WR61 a22 y1 | 5R2 + LB48 | 10 | 10 | 0 | 90k | – |
| 5 | 5 | 2 | swap | Glacier Guardians ← Ironpeak Rams | LB62 a24 y1 | S66 | 6 | 6 | 3 | 74k | – |
| 5 | 7 | 3 | swap+picks | Sunfire Lions ← Eastport Phantoms | K72 a31 y1 | 9R2 + WR55 | 13 | 13 | 0 | 89k | thinDepth |
| 5 | 7 | 5 | swap+picks | Thunder Mesa ← Eastport Phantoms | TE61 a24 y1 | 8R2 + WR58 | 9 | 9 | 0 | 68k | – |
| 5 | 9 | 5 | swap | Ironpeak Rams ← Thunder Mesa | LB71 a28 y0 | QB62 | 4 | 4 | 0 | 44k | – |
| 5 | 10 | 3 | swap+picks | Palmetto Vipers ← Thunder Mesa | K75 a26 y1 | 11R2 + LB56 | 6 | 6 | 0 | 40k | thinDepth |
| 5 | 10 | 5 | swap+picks | Sunfire Lions ← Eastport Phantoms | CB71 a29 y1 | 12R2 + CB59 | 10 | 10 | 0 | 58k | – |
| 5 | 10 | 8 | swap+picks | Ember City Beasts ← Canyon Crushers | WR68 a27 y1 | 11R3 + RB57 | 4 | 4 | 0 | 17k | – |
| 6 | 4 | 2 | swap+picks | Stonehaven Titans ← Harbor Sentinels | WR61 a22 y1 | 5R3 + CB55 | 7 | 7 | 0 | 59k | – |
| 6 | 5 | 2 | swap+picks | Bayou Stalkers ← Stormport Bolts | TE65 a25 y1 | 6R2 + CB57 | 8 | 8 | 0 | 87k | – |
| 6 | 6 | 4 | swap | Bayou Stalkers ← Stonehaven Titans | WR62 a24 y1 | LB65 | 8 | 8 | 1 | 70k | – |
| 6 | 7 | 6 | swap+picks | Sundown Drakes ← Canyon Crushers | TE68 a23 y0 | 9R1 + CB60 | 15 | 15 | 0 | 54k | – |
| 6 | 8 | 4 | swap+picks | Ironpeak Rams ← Frostpeak Howlers | DL68 a26 y1 | 10R3 + DL60 | 5 | 5 | 0 | 73k | – |
| 6 | 9 | 7 | swap+picks | Bayou Stalkers ← Ashford Hawks | CB66 a27 y1 | 11R3 + OL71 | 11 | 11 | 4 | 21k | – |
| 6 | 10 | 2 | swap+picks | Sundown Drakes ← Harbor Sentinels | CB70 a29 y0 | 11R3 + CB63 | 5 | 5 | 0 | 49k | – |
| 6 | 10 | 4 | swap+picks | Stonehaven Titans ← Bayou Stalkers | DL69 a24 y1 | 12R2 + WR59 | 7 | 7 | 0 | 31k | – |
| 6 | 10 | 5 | swap | Sundown Drakes ← Eastport Phantoms | DL65 a30 y1 | RB55 | 4 | 4 | 0 | 46k | – |
| 7 | 2 | 3 | swap+picks | Ember City Beasts ← Canyon Crushers | S61 a21 y0 | 3R3 + TE47 | 10 | 10 | 0 | 160k | – |
| 7 | 4 | 2 | swap+picks | Ember City Beasts ← Canyon Crushers | DL68 a28 y1 | 6R2 + WR56 | 16 | 16 | 0 | 104k | – |
| 7 | 5 | 4 | swap+picks | Ember City Beasts ← Ashford Hawks | DL65 a28 y1 | 7R3 + WR58 | 12 | 12 | 0 | 98k | – |
| 7 | 6 | 3 | swap+picks | Harbor Sentinels ← Glacier Guardians | QB66 a23 y1 | 8R2 + TE60 | 5 | 5 | 0 | 76k | – |
| 7 | 6 | 6 | swap+picks | Sundown Drakes ← Ashford Hawks | DL68 a27 y1 | 8R3 + LB58 | 8 | 8 | 0 | 53k | – |
| 7 | 8 | 4 | swap+picks | Glacier Guardians ← Thunder Mesa | DL67 a27 y0 | 10R3 + QB55 | 15 | 15 | 0 | 41k | – |
| 7 | 9 | 6 | swap+picks | Sunfire Lions ← Ember City Beasts | WR66 a25 y1 | 10R3 + S58 | 1 | 1 | 0 | 78k | noStarterGain |
| 7 | 10 | 7 | swap+picks | Sundown Drakes ← Ashford Hawks | RB78 a29 y1 | 11R1 + RB65 | 12 | 12 | 0 | 24k | capStrain |
| 8 | 3 | 2 | swap | Harbor Sentinels ← Palmetto Vipers | CB62 a22 y0 | TE61 | 6 | 6 | 0 | 134k | – |
| 8 | 4 | 2 | swap+picks | Ashford Hawks ← Eastport Phantoms | DL60 a23 y1 | 6R3 + WR57 | 9 | 9 | 0 | 91k | – |
| 8 | 5 | 3 | swap+picks | Sunfire Lions ← Stormport Bolts | TE63 a24 y1 | 7R1 + S56 | 12 | 12 | 0 | 89k | – |
| 8 | 6 | 3 | swap+picks | Glacier Guardians ← Northstar Wolves | WR69 a27 y1 | 7R3 + CB60 | 8 | 8 | 0 | 48k | – |
| 8 | 8 | 2 | swap+picks | Ashford Hawks ← Harbor Sentinels | RB77 a24 y1 | 9R2 + RB67 | 6 | 6 | 0 | 35k | – |
| 8 | 9 | 7 | swap | Northstar Wolves ← Sundown Drakes | WR64 a23 y1 | LB63 | 8 | 8 | 0 | 50k | – |
| 9 | 4 | 6 | swap | Ashford Hawks ← Ember City Beasts | WR61 a28 y1 | S64 | 9 | 9 | 6 | 86k | – |
| 9 | 5 | 6 | swap | Ember City Beasts ← Northstar Wolves | WR60 a28 y1 | DL63 | 6 | 6 | 6 | 69k | – |
| 9 | 8 | 2 | swap+picks | Northstar Wolves ← Thunder Mesa | LB66 a26 y1 | 10R3 + RB56 | 7 | 7 | 0 | 57k | – |
| 9 | 9 | 2 | swap+picks | Northstar Wolves ← Ashford Hawks | LB74 a23 y0 | 11R2 + QB63 | 15 | 15 | 0 | 45k | – |
| 9 | 10 | 2 | swap+picks | Canyon Crushers ← Northstar Wolves | S74 a30 y0 | 12R3 + LB65 | 7 | 7 | 0 | 29k | – |
| 10 | 1 | 8 | swap | Ember City Beasts ← Palmetto Vipers | CB62 a24 y1 | QB62 | 7 | 7 | 0 | 203k | – |
| 10 | 3 | 4 | swap | Stonehaven Titans ← Palmetto Vipers | DL61 a27 y0 | CB57 | 7 | 7 | 0 | 101k | churn |
| 10 | 5 | 4 | swap+picks | Ember City Beasts ← Sunfire Lions | RB64 a26 y1 | 6R2 + WR60 | 10 | 10 | 4 | 77k | – |
| 10 | 6 | 3 | swap+picks | Stormport Bolts ← Canyon Crushers | DL68 a28 y0 | 8R3 + RB55 | 4 | 4 | 0 | 50k | – |
| 10 | 7 | 3 | swap+picks | Ashford Hawks ← Ironpeak Rams | WR67 a26 y1 | 9R2 + QB56 | 3 | 3 | 0 | 35k | – |
| 10 | 8 | 5 | swap+picks | Ember City Beasts ← Ironpeak Rams | OL68 a26 y1 | 10R3 + LB57 | 13 | 13 | 0 | 49k | – |
| 10 | 9 | 2 | swap+picks | Ashford Hawks ← Harbor Sentinels | S76 a25 y0 | 11R3 + WR67 | 12 | 12 | 3 | 18k | – |
| 10 | 10 | 3 | swap+picks | Northstar Wolves ← Palmetto Vipers | S69 a29 y1 | 12R2 + WR58 | 5 | 5 | 0 | 83k | thinDepth |
| 10 | 10 | 7 | swap | Ember City Beasts ← Ironpeak Rams | WR61 a22 y0 | RB56 | 7 | 7 | 0 | 33k | – |
| 11 | 2 | 6 | swap+picks | Northstar Wolves ← Palmetto Vipers | DL59 a22 y1 | 4R2 + LB47 | 5 | 5 | 0 | 127k | – |
| 11 | 3 | 2 | swap+picks | Sunfire Lions ← Palmetto Vipers | OL64 a23 y1 | 4R3 + LB54 | 11 | 11 | 0 | 144k | – |
| 11 | 5 | 3 | swap+picks | Ashford Hawks ← Northstar Wolves | WR62 a24 y1 | 7R2 + CB55 | 14 | 14 | 0 | 94k | – |
| 11 | 7 | 5 | swap+picks | Stonehaven Titans ← Ember City Beasts | LB73 a27 y1 | 9R1 + WR58 | 13 | 13 | 0 | 52k | thinDepth |
| 11 | 8 | 5 | swap+picks | Sunfire Lions ← Canyon Crushers | OL72 a29 y1 | 10R3 + WR56 | 10 | 10 | 0 | 75k | – |
| 11 | 8 | 6 | swap+picks | Glacier Guardians ← Ashford Hawks | S70 a27 y1 | 10R2 + LB61 | 12 | 12 | 0 | 31k | – |
| 11 | 9 | 7 | swap+picks | Bayou Stalkers ← Thunder Mesa | CB76 a30 y0 | 10R2 + QB58 | 9 | 9 | 0 | 35k | – |
| 11 | 10 | 2 | swap+picks | Ashford Hawks ← Frostpeak Howlers | DL62 a23 y1 | 12R3 + TE54 | 6 | 6 | 0 | 31k | – |
| 12 | 7 | 8 | swap+picks | Thunder Mesa ← Palmetto Vipers | CB67 a30 y1 | 9R1 + RB51 | 8 | 8 | 0 | 79k | – |
| 12 | 8 | 2 | swap+picks | Bayou Stalkers ← Thunder Mesa | TE71 a29 y1 | 9R2 + QB61 | 7 | 7 | 0 | 91k | thinDepth |
| 12 | 8 | 6 | swap+picks | Ashford Hawks ← Stormport Bolts | LB68 a31 y1 | 10R3 + WR58 | 10 | 10 | 0 | 43k | – |
| 12 | 9 | 2 | swap+picks | Eastport Phantoms ← Ironpeak Rams | WR71 a29 y0 | 11R2 + LB68 | 4 | 4 | 0 | 38k | – |
| 12 | 9 | 7 | swap | Harbor Sentinels ← Glacier Guardians | WR66 a25 y1 | LB66 | 4 | 4 | 0 | 69k | – |
| 12 | 9 | 8 | swap+picks | Sundown Drakes ← Palmetto Vipers | OL70 a29 y0 | 11R3 + WR55 | 5 | 5 | 0 | 40k | – |
| 12 | 10 | 8 | swap | Ashford Hawks ← Glacier Guardians | LB66 a24 y0 | DL68 | 4 | 4 | 2 | 21k | – |
| 13 | 2 | 8 | swap | Ashford Hawks ← Sunfire Lions | CB63 a25 y1 | RB63 | 7 | 7 | 0 | 131k | – |
| 13 | 3 | 6 | swap | Ashford Hawks ← Sunfire Lions | LB62 a24 y1 | S66 | 4 | 4 | 2 | 123k | – |
| 13 | 4 | 6 | swap | Sundown Drakes ← Bayou Stalkers | CB64 a27 y1 | RB63 | 5 | 5 | 0 | 87k | – |
| 13 | 6 | 2 | swap | Northstar Wolves ← Stormport Bolts | WR63 a29 y1 | RB55 | 10 | 10 | 0 | 66k | – |
| 13 | 7 | 3 | swap+picks | Stormport Bolts ← Harbor Sentinels | RB63 a24 y1 | 9R2 + WR66 | 7 | 7 | 0 | 51k | – |
| 13 | 7 | 6 | swap+picks | Sundown Drakes ← Glacier Guardians | OL64 a30 y1 | 9R3 + LB53 | 9 | 9 | 0 | 70k | – |
| 13 | 9 | 7 | swap+picks | Northstar Wolves ← Ashford Hawks | DL69 a29 y0 | 11R3 + WR61 | 8 | 8 | 0 | 39k | – |
| 13 | 9 | 8 | swap+picks | Ashford Hawks ← Sundown Drakes | CB64 a26 y1 | 11R3 + LB66 | 7 | 7 | 4 | 22k | – |
| 13 | 10 | 8 | swap | Ashford Hawks ← Harbor Sentinels | WR64 a23 y1 | S71 | 4 | 4 | 0 | 20k | – |
| 14 | 1 | 8 | swap+picks | Stormport Bolts ← Northstar Wolves | LB58 a23 y0 | 2R2 + CB47 | 5 | 5 | 0 | 212k | – |
| 14 | 5 | 5 | swap+picks | Harbor Sentinels ← Northstar Wolves | CB59 a22 y1 | 7R3 + WR57 | 5 | 5 | 0 | 88k | – |
| 14 | 8 | 6 | swap+picks | Ashford Hawks ← Canyon Crushers | WR62 a22 y1 | 10R3 + RB55 | 4 | 4 | 0 | 54k | – |
| 14 | 9 | 5 | swap | Sundown Drakes ← Palmetto Vipers | OL62 a24 y1 | LB58 | 10 | 10 | 0 | 35k | – |
| 14 | 10 | 3 | swap+picks | Ashford Hawks ← Ember City Beasts | S68 a27 y1 | 12R3 + DL66 | 15 | 15 | 7 | 20k | – |
| 15 | 5 | 6 | swap | Harbor Sentinels ← Ember City Beasts | S65 a28 y1 | TE59 | 6 | 6 | 0 | 120k | – |
| 15 | 6 | 5 | swap+picks | Eastport Phantoms ← Bayou Stalkers | RB68 a28 y0 | 8R3 + RB60 | 4 | 4 | 0 | 109k | – |
| 15 | 6 | 8 | swap+picks | Ember City Beasts ← Canyon Crushers | LB62 a25 y0 | 8R3 + RB53 | 5 | 5 | 0 | 66k | – |
| 15 | 7 | 2 | swap+picks | Glacier Guardians ← Sundown Drakes | QB62 a23 y1 | 9R3 + CB64 | 7 | 7 | 0 | 62k | – |
| 15 | 8 | 2 | swap+picks | Harbor Sentinels ← Palmetto Vipers | WR67 a27 y0 | 10R3 + CB59 | 7 | 7 | 0 | 78k | – |
| 15 | 9 | 5 | swap | Ember City Beasts ← Bayou Stalkers | WR69 a28 y1 | CB62 | 15 | 15 | 0 | 38k | – |
| 15 | 10 | 4 | swap+picks | Glacier Guardians ← Canyon Crushers | CB70 a29 y1 | 11R2 + WR63 | 4 | 4 | 0 | 45k | – |
| 15 | 10 | 5 | swap | Frostpeak Howlers ← Ashford Hawks | DL71 a31 y0 | QB59 | 5 | 5 | 0 | 24k | capStrain |
| 15 | 10 | 7 | swap+picks | Ember City Beasts ← Ashford Hawks | CB68 a28 y1 | 11R3 + CB62 | 4 | 4 | 0 | 37k | – |
| 16 | 6 | 2 | swap+picks | Stormport Bolts ← Ironpeak Rams | WR58 a26 y1 | 8R3 + CB54 | 4 | 4 | 0 | 76k | – |
| 16 | 6 | 7 | swap | Ironpeak Rams ← Thunder Mesa | DL61 a22 y1 | LB66 | 0 | 0 | 0 | 60k | noStarterGain |
| 16 | 6 | 8 | swap+picks | Bayou Stalkers ← Thunder Mesa | LB66 a30 y0 | 8R3 + WR60 | 9 | 9 | 0 | 70k | – |
| 16 | 7 | 3 | swap+picks | Ashford Hawks ← Sundown Drakes | WR64 a30 y1 | 8R3 + QB56 | 11 | 11 | 0 | 52k | – |
| 16 | 7 | 6 | swap+picks | Stormport Bolts ← Ashford Hawks | RB71 a27 y1 | 8R1 + CB59 | 8 | 8 | 0 | 71k | thinDepth |
| 16 | 7 | 7 | swap+picks | Bayou Stalkers ← Northstar Wolves | QB63 a23 y1 | 9R2 + CB61 | 7 | 7 | 0 | 57k | – |
| 16 | 7 | 8 | swap+picks | Stonehaven Titans ← Canyon Crushers | S65 a26 y0 | 8R3 + RB52 | 12 | 12 | 0 | 73k | – |
| 16 | 8 | 3 | swap | Ashford Hawks ← Ironpeak Rams | WR74 a32 y0 | CB62 | 19 | 19 | 0 | 39k | – |
| 16 | 8 | 7 | swap+picks | Stonehaven Titans ← Harbor Sentinels | S67 a22 y1 | 9R3 + WR65 | 9 | 9 | 0 | 46k | – |
| 16 | 9 | 2 | swap+picks | Sundown Drakes ← Ashford Hawks | K73 a27 y1 | 11R2 + WR60 | 18 | 18 | 0 | 49k | thinDepth |
| 16 | 9 | 3 | swap+picks | Bayou Stalkers ← Sundown Drakes | CB70 a27 y1 | 11R1 + DL65 | 14 | 14 | 0 | 32k | – |
| 16 | 9 | 5 | swap+picks | Sunfire Lions ← Ironpeak Rams | TE76 a29 y1 | 10R2 + TE62 | 4 | 4 | 0 | 76k | – |
| 16 | 10 | 2 | swap+picks | Ashford Hawks ← Canyon Crushers | CB78 a28 y1 | 11R2 + RB66 | 14 | 14 | 0 | 27k | capStrain, thinDepth |
| 16 | 10 | 5 | swap | Stormport Bolts ← Palmetto Vipers | OL67 a25 y0 | S64 | 12 | 12 | 0 | 40k | – |
| 17 | 3 | 5 | swap+picks | Glacier Guardians ← Ironpeak Rams | WR63 a23 y0 | 4R3 + TE54 | 7 | 7 | 0 | 127k | – |
| 17 | 4 | 5 | swap+picks | Glacier Guardians ← Ember City Beasts | K65 a27 y0 | 6R2 + RB48 | 8 | 8 | 0 | 102k | thinDepth |
| 17 | 5 | 2 | swap+picks | Bayou Stalkers ← Stormport Bolts | QB63 a22 y1 | 7R2 + WR63 | 13 | 13 | 4 | 94k | thinDepth |
| 17 | 5 | 5 | swap+picks | Stormport Bolts ← Ironpeak Rams | DL59 a24 y1 | 7R3 + CB54 | 4 | 4 | 0 | 89k | – |
| 17 | 5 | 7 | swap+picks | Glacier Guardians ← Harbor Sentinels | DL63 a25 y0 | 7R2 + LB46 | 12 | 12 | 0 | 92k | – |
| 17 | 6 | 4 | swap | Stormport Bolts ← Bayou Stalkers | LB62 a26 y1 | RB57 | 4 | 4 | 0 | 73k | – |
| 17 | 8 | 2 | swap+picks | Ember City Beasts ← Ironpeak Rams | S69 a30 y1 | 9R3 + TE55 | 4 | 4 | 0 | 35k | – |
| 17 | 8 | 3 | swap+picks | Northstar Wolves ← Bayou Stalkers | WR70 a28 y0 | 9R2 + S62 | 15 | 15 | 3 | 74k | – |
| 17 | 8 | 6 | swap+picks | Ember City Beasts ← Sunfire Lions | WR68 a27 y1 | 10R3 + CB59 | 4 | 4 | 0 | 33k | – |
| 18 | 3 | 3 | swap+picks | Ember City Beasts ← Palmetto Vipers | DL59 a22 y1 | 5R3 + CB55 | 8 | 8 | 0 | 120k | – |
| 18 | 4 | 2 | swap+picks | Ember City Beasts ← Canyon Crushers | QB62 a25 y1 | 6R3 + TE63 | 6 | 6 | 0 | 106k | thinDepth |
| 18 | 6 | 3 | swap | Bayou Stalkers ← Eastport Phantoms | S59 a23 y1 | QB56 | 4 | 4 | 0 | 59k | – |
| 18 | 6 | 7 | swap+picks | Sundown Drakes ← Frostpeak Howlers | LB64 a24 y0 | 8R3 + WR60 | 12 | 12 | 3 | 82k | – |
| 18 | 7 | 4 | swap+picks | Frostpeak Howlers ← Stormport Bolts | DL68 a30 y1 | 9R3 + WR60 | 9 | 9 | 0 | 92k | – |
| 18 | 7 | 5 | swap | Ashford Hawks ← Northstar Wolves | OL62 a28 y1 | DL56 | 8 | 8 | 1 | 43k | – |
| 18 | 8 | 8 | swap+picks | Sunfire Lions ← Bayou Stalkers | WR66 a28 y1 | 9R3 + LB61 | 4 | 4 | 5 | 86k | – |
| 18 | 9 | 4 | swap+picks | Stormport Bolts ← Bayou Stalkers | RB71 a30 y1 | 10R1 + WR60 | 16 | 16 | 0 | 38k | thinDepth |
| 18 | 9 | 6 | swap+picks | Sundown Drakes ← Thunder Mesa | K65 a26 y0 | 11R3 + RB53 | 7 | 7 | 0 | 67k | – |
| 19 | 1 | 4 | swap | Stonehaven Titans ← Ironpeak Rams | WR61 a28 y1 | TE58 | 11 | 11 | 0 | 197k | – |
| 19 | 4 | 2 | swap+picks | Frostpeak Howlers ← Glacier Guardians | CB65 a24 y1 | 5R3 + WR60 | 6 | 6 | 4 | 107k | – |
| 19 | 4 | 5 | swap+picks | Stonehaven Titans ← Canyon Crushers | DL67 a27 y1 | 6R3 + RB54 | 8 | 8 | 0 | 89k | – |
| 19 | 4 | 7 | swap | Ember City Beasts ← Palmetto Vipers | WR58 a21 y1 | CB61 | 4 | 4 | 0 | 91k | – |
| 19 | 5 | 2 | swap | Sundown Drakes ← Ironpeak Rams | QB63 a25 y0 | TE62 | 9 | 9 | 0 | 96k | – |
| 19 | 5 | 3 | swap+picks | Ember City Beasts ← Canyon Crushers | WR58 a23 y1 | 7R3 + OL59 | 4 | 4 | 0 | 87k | – |
| 19 | 6 | 2 | swap+picks | Stonehaven Titans ← Canyon Crushers | CB68 a31 y1 | 7R2 + WR54 | 22 | 22 | 0 | 64k | – |
| 19 | 7 | 2 | swap+picks | Sundown Drakes ← Stonehaven Titans | TE69 a32 y1 | 8R3 + CB61 | 14 | 14 | 1 | 79k | thinDepth |
| 19 | 8 | 2 | swap | Stonehaven Titans ← Palmetto Vipers | LB73 a29 y0 | RB61 | 16 | 16 | 0 | 57k | – |
| 19 | 8 | 6 | swap | Sundown Drakes ← Ember City Beasts | S68 a28 y0 | CB59 | 5 | 5 | 0 | 54k | – |
| 19 | 9 | 2 | swap | Sundown Drakes ← Palmetto Vipers | K61 a24 y0 | CB62 | 7 | 7 | 0 | 57k | – |
| 19 | 9 | 4 | swap | Sunfire Lions ← Bayou Stalkers | DL64 a31 y1 | RB55 | 5 | 5 | 0 | 83k | – |
| 19 | 10 | 4 | swap | Bayou Stalkers ← Ember City Beasts | S70 a34 y0 | RB55 | 8 | 8 | 0 | 14k | agingBurden |
| 20 | 1 | 2 | swap+picks | Sundown Drakes ← Palmetto Vipers | OL63 a24 y1 | 2R3 + WR54 | 12 | 12 | 0 | 178k | – |
| 20 | 2 | 3 | swap+picks | Sundown Drakes ← Palmetto Vipers | RB65 a21 y1 | 4R1 + CB62 | 6 | 6 | 0 | 117k | – |
| 20 | 2 | 4 | swap | Sunfire Lions ← Palmetto Vipers | DL60 a22 y1 | RB57 | 4 | 4 | 0 | 139k | – |
| 20 | 3 | 3 | swap+picks | Stonehaven Titans ← Stormport Bolts | CB64 a22 y1 | 5R2 + RB58 | 11 | 11 | 0 | 112k | – |
| 20 | 5 | 8 | swap | Glacier Guardians ← Thunder Mesa | CB67 a21 y1 | RB68 | 8 | 8 | 0 | 71k | – |
| 20 | 6 | 4 | swap+picks | Stonehaven Titans ← Glacier Guardians | TE67 a25 y0 | 7R3 + WR66 | 8 | 8 | 9 | 72k | thinDepth |
| 20 | 8 | 4 | swap+picks | Glacier Guardians ← Bayou Stalkers | LB72 a28 y0 | 9R3 + WR65 | 7 | 7 | 0 | 37k | – |
| 20 | 8 | 5 | swap+picks | Stormport Bolts ← Thunder Mesa | WR64 a22 y1 | 9R3 + TE58 | 4 | 4 | 0 | 54k | – |
| 20 | 8 | 6 | swap+picks | Stonehaven Titans ← Northstar Wolves | QB71 a27 y1 | 9R2 + WR63 | 10 | 10 | 0 | 41k | thinDepth |
| 20 | 8 | 7 | swap+picks | Bayou Stalkers ← Ashford Hawks | CB67 a30 y1 | 10R3 + WR65 | 11 | 11 | 1 | 47k | – |
| 20 | 9 | 7 | swap+picks | Sundown Drakes ← Ashford Hawks | LB67 a28 y0 | 11R3 + DL62 | 10 | 10 | 0 | 51k | – |
| 20 | 10 | 2 | swap+picks | Sundown Drakes ← Thunder Mesa | S66 a28 y1 | 12R3 + S61 | 4 | 4 | 0 | 40k | – |
| 20 | 10 | 3 | swap | Sunfire Lions ← Ashford Hawks | OL71 a32 y0 | QB54 | 6 | 6 | 0 | 47k | – |
| 20 | 10 | 5 | swap+picks | Glacier Guardians ← Canyon Crushers | WR72 a31 y1 | 12R1 + RB51 | 14 | 14 | 0 | 27k | capStrain |
