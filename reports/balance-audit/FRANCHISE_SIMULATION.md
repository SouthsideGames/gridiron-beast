# Long-term franchise simulation

**Build:** `v43.50.0-sideline` at `58c33ee`.

## Method

**The runs.**
- **Engine:** the production lifecycle (`tools/franchise-soak.mjs` `runFranchise`), recorded by `tools/ai-franchise-benchmark.mjs`.
- **Harness flags** (opt-in, default off): `--owner=repair --board=content`.
  - The study owner fills an open starting slot with the cheapest legal free agent, and does nothing else (`tools/study-owner.mjs`).
  - The Board is kept content, so every run plays all its seasons. This is the "Board reset" diagnostic the brief allows, separate from normal play. Real dismissals are in `DIFFICULTY_AND_BOARD_BALANCE.md`.
- **League:** 32 clubs, 14-game seasons.
- **Seed 3 on all three difficulties, 15 seasons each:** 45 franchise seasons, 10,080 league games.
- **Seed 4 (Pro and All-Star)** was run as well. It is reported in §7 if it finished in time.

**Why 15 seasons, not 20.** The lifecycle cap is 15 seasons (`src/franchise/gm-career.js` `CAREER_SEASONS = 15`, merged with PR #125). The production game will not start a 16th season, so "Season 20" cannot be reached without changing the game. Snapshots are at seasons 1, 5, 10 and 15.

**The baseline.** Task 10 recorded the same seed on all three difficulties (`docs/task10/results/baseline/franchises/{rookie,pro,allstar}-3.json`, repair owner, Board kept content, 20 seasons). That baseline is a **16-club league with 9-game seasons and no in-game rotation.** The comparison is matched by seed and owner policy but **crosses three structural changes**. Read it as "what changed", not "the same game measured twice".

**Raw data:**
- `raw/franchise-{rookie,pro,allstar}-seed3.json`;
- per-season summaries: `raw/franchise-summary-seed3.json`;
- progression tables: `raw/progression-pro-allstar.txt`.

## 1. Integrity: clean

| Check | Rookie | Pro | All-Star |
|---|---|---|---|
| Harness problems (invariants every week, save round trip every season) | 0 | 0 | 0 |
| Errors or exceptions | 0 | 0 | 0 |
| AI club-seasons with negative cap room | 0 of 465 | 0 of 465 | 0 of 465 |
| AI roster size range | 28–38 | 30–38 | 26–38 |
| Save round trip changed the league | never | never | never |

**Save size** (Pro; the other two are within 1%):

| Season | Raw JSON | Packed (`gbp2`) | Gzipped (stored) |
|---|---|---|---|
| 1 | 6.80 MB | 2.64 MB | 0.51 MB |
| 5 | 10.30 MB | 4.47 MB | 0.97 MB |
| 10 | 12.61 MB | 5.76 MB | 1.30 MB |
| 15 | 13.24 MB | 6.12 MB | **1.40 MB** |

- **Growth slows to about 0.02 MB stored per season after season 10.**
- **Against the 16-club league:** the test plan recorded 2.12–2.16 MB **packed** at season 20. The 32-club league is 6.1 MB packed at season 15, about three times as much.
- The store packs parts and uses IndexedDB (`src/franchise/store.js` line 441), and the gzipped size stays small. Treat this as **Medium, to monitor**: the packed size is what a localStorage fallback would hold.

## 2. League strength and the owner

**Mean AI team overall** (and the owner's club):

| Season | Rookie | Pro | All-Star |
|---|---|---|---|
| 1 | 52.9 (owner 54) | 53.9 (55) | 57.2 (54) |
| 5 | 63.8 (61) | 64.2 (62) | 64.1 (64) |
| 10 | 64.1 (58) | 64.0 (64) | 63.2 (59) |
| 15 | 63.5 (64) | 64.6 (62) | 63.8 (62) |

**The owner's results** (repair owner, seed 3):

| Measure | Rookie | Pro | All-Star |
|---|---|---|---|
| Win % over 15 seasons | **38.6** | **35.7** | **57.1** |
| Seasons 1–5 / 6–10 / 11–15 | 44.3 / 32.9 / 38.6 | 34.3 / 37.1 / 35.7 | 45.7 / 62.9 / 62.9 |
| Playoff seasons | 2 | 3 | 9 |
| Titles | 0 | 0 | 2 |
| 0–21 results in owner games | 0 | 0 | 1 (possibly a genuine 21–0) |

**F-1 (High): the difficulty levels converge after about four seasons.**
- **All-Star's AI clubs start 4.3 points stronger than Rookie's, and by season 5 the three leagues are equal (63.8–64.2).** They stay equal to season 15.
  - Difficulty sets only the founding quality and the AI's play-calling IQ (`DIFFICULTY_AND_BOARD_BALANCE.md`).
  - Development then fills every league to the same level.
- **On this seed the owner did best on All-Star.**
  - The repair owner manages nothing beyond emergencies, so his club follows the founding roster and its development. That is the same pattern Task 10 found, where the spread between seeds was three times the spread between difficulties.
- **What remains of difficulty after season 5 is the AI's play-calling IQ.** Its effect is not visible in these numbers.
- The hands-off owner on the real Board is measured in `DIFFICULTY_AND_BOARD_BALANCE.md`.

**Comparison with Task 10, seed 3** (16 clubs, 9 games), owner win %:
- Rookie: 53.9 then, 38.6 now;
- Pro: 23.9 then, 35.7 now;
- All-Star: 37.2 then, 57.1 now.
- Ordinary AI overall at season 15 is 60–62 then and 63.5–64.6 now.
- The new league is about 2–3 points stronger. Difficulty no longer orders the owner's results on this seed, and did not on the old league either (Pro was the hardest there).

## 3. Parity and titles

| Measure | Rookie | Pro | All-Star |
|---|---|---|---|
| Distinct champions in 15 seasons | 8 | 7 | 6 |
| Most titles by one club | 5 (Palmetto Wyrms) | 5 (Palmetto Wyrms) | 5 (Ember City Beasts) |
| Titles won by gym clubs | **12 of 15** | **10 of 15** | **8 of 15** |
| SD of AI win %, season 1 / season 15 | 24.6 / 24.1 | 26.4 / 25.6 | 26.4 / 18.7 |
| Blowouts (21+ margin) per season | 16–53 of 224 games | | |

- **F-2 (Medium): gym clubs win most titles:** 30 of 45 (67%) across the three runs, although gyms are 12 of 31 AI clubs.
  - Their average overall is no higher than ordinary clubs' by season 15 (Pro 64.7 against 64.6), so the edge is concentrated stars, chiefly gym legendaries, not depth.
  - **Palmetto Wyrms, a late-tier gym, won 5 titles on Rookie and on Pro** (5 of the first 6 on Rookie) and 4 on All-Star.
  - Task 7's band for the ordinary title share was 5–15% (`docs/task10/MASTER_BALANCE_MATRIX.md` T7-17). Ordinary clubs here win 20% (Rookie), 33% (Pro) and 47% (All-Star), so that band is now **exceeded on the ordinary side**. Concentration is lower than Task 10's 16-club league (where gyms won 61 of 78 at M6).
- **No dynasty beyond five titles in fifteen seasons.** Parity is acceptable.
- **The rival's club is the strongest club late on:** 66 (Rookie), 72 (Pro) and 73 (All-Star) at season 15, against a league mean of 64. The rival is a real threat, as designed.

## 4. Awards

**Award winners by position over 45 seasons:**

| Award | Distribution |
|---|---|
| MVP | QB 31, RB 8, WR 6 |
| OPOY | WR 21, RB 13, TE 11 |
| **DPOY** | **DL 43**, LB 1, CB 1 |
| OROY | RB 15, WR 15, OL 9, TE 5, QB 1 |
| DROY | CB 31, S 8, LB 4, DL 2 |
| SMOY | QB 32, WR 11, RB 2 |

- **F-3 (Medium): the defensive award is a defensive-lineman award.** DL won 43 of 45 DPOYs; no safety won one, and a linebacker or cornerback won once each. The formula weights pass rush and run defence (`src/franchise/awards.js`), and a DL accumulates sacks and tackles for loss far faster than a DB accumulates coverage stats.
- **The MVP is mostly a quarterback award** (31 of 45), after Task 10's MVP cap.
- **No OL, LB, S or K won an MVP, OPOY or DPOY.** That is a Career Mode concern (`CAREER_MODE_READINESS.md`).
- The rookie awards spread more widely (OL won 9 OROYs).

## 5. Football over the long run (the league's own games)

| Season | Completion (Pro) | Yards per attempt | Points per team-game (Rookie / Pro / All-Star) |
|---|---|---|---|
| 1 | 55.8% | 8.34 | 13.5 / 14.1 / 15.0 |
| 5 | 61.9% | 9.74 | 14.2 / 15.5 / 17.1 |
| 10 | 66.6% | 9.76 | 17.2 / 16.6 / 18.2 |
| 15 | 65.4% | 10.30 | 18.5 / 18.4 / **20.7** |

**Whole-run figures:**

| Measure | Rookie | Pro | All-Star |
|---|---|---|---|
| Overtime games | 7.7% | 8.0% | 8.4% |
| Settled by Beast Clash | 3.4% | 3.7% | 3.8% |
| INT per attempt | 1.91% | 1.97% | 1.84% |
| Sacks per dropback | 1.92% | 1.81% | 1.85% |
| Yards per carry | 5.49 | 5.26 | 5.55 |
| Field goals | 74.1% | 73.0% | 74.2% |
| Extra points | 87.5% | 87.4% | 87.5% |

- **F-4 (Medium): scoring inflates 30–38% over a franchise** (13.5→18.5 Rookie, 14.1→18.4 Pro, 15.0→20.7 All-Star).
  - Yards per attempt reaches 10+.
  - Defensive development does not keep up with passing: completion rises from 55% to 65–67%.
- **The completion target is met in developed leagues** (63–67% from about season 6). It is missed on generated clubs (`GAMEPLAY_BALANCE.md` §1). This is Task 10's open definitional point and is still open.
- **Sacks stay at 1.8–1.9% of dropbacks in every season**, a third of the 5–7% target.

## 6. Questions in the brief

| Question | Answer |
|---|---|
| Owner win rates | Rookie 38.6%, Pro 35.7%, All-Star 57.1% (repair owner, seed 3). The live-Board hands-off figures are in `DIFFICULTY_AND_BOARD_BALANCE.md` |
| AI team and rival strength | AI clubs 63–65 from season 5, steady. The rival is 66–73 at season 15 |
| Parity and championships | 6–8 distinct champions in 15 seasons; at most 5 by one club; gyms 67% |
| Playoff qualification | 14 of 32 clubs qualify each season. The owner made 2, 3 and 9 of 15 |
| Promotion and relegation | Not analysed: the harness does not record the owner's league tier |
| Talent distribution, draft quality, shortages | 1,302 draftees per run; 62% of first-rounders start by the end; 0–1 AI lineup problems per run; the owner never short (§1, `FREE_AGENCY_AND_ECONOMY.md`) |
| Progression, evolution, ageing, retirement | `PROGRESSION_AND_EVOLUTION.md` |
| Roster turnover | About 145–150 departures a season across 32 clubs (Rookie: contracts walked 82 a season, retired 43, released 12, traded 8) |
| Statistical inflation | Scoring +30–38% over 15 seasons (§5); overall flat after season 5 |
| League records, Hall of Fame | Not recorded by this harness. The Task 9/10 Hall studies (`docs/task9/HALL_OF_FAME.md`) predate the 32-club league |
| Save growth | 1.40 MB stored, 6.12 MB packed at season 15 (§1) |
| Lifecycle integrity | 0 problems in 45 seasons. The 15-season cap holds |
| Previously documented deviations | The owner's forfeits from an empty market (Task 10 R-1, T7-39) **no longer occur.** The owner-win-rate bands (T7-22 to T7-24) are not met by the repair owner on this seed, and difficulty does not order the results |

## 7. Second seed (seed 4, Pro and All-Star, 15 seasons each)

Raw data: `raw/franchise-{pro,allstar}-seed4.json`; summary: `raw/franchise-summary-seed4.json`.

| Measure | Pro seed 4 | All-Star seed 4 |
|---|---|---|
| Problems / errors | 0 / 0 | 0 / 0 |
| AI team overall, season 1 / 5 / 15 | 52.7 / 63.5 / 63.2 | 55.9 / 64.0 / 63.8 |
| Owner win % (repair owner) | 47.6 | 61.4 |
| Owner playoff seasons / titles | 7 / 2 | 9 / 0 |
| Owner 0–21 results (upper bound on forfeits) | 8, including 1 confirmed empty-market forfeit (RB, season 7) | 6 |
| Distinct champions / most by one club / gym titles | 9 / 3 / 10 | 9 / 3 / 10 |
| DPOY by position | DL 11, CB 4 | DL 14, CB 1 |
| MVP by position | RB 7, WR 5, QB 3 | RB 9, QB 4, WR 2 |
| Points per team-game, season 1 / 15 | 11.6 / 17.4 | 12.3 / 19.6 |
| Lowest AI cap room | 259.8 k | 227.5 k |
| Stored save, season 15 (raw) | 13.09 MB raw | 13.43 MB raw |

**The second seed confirms every structural finding:**
- **Difficulty converges:** AI overall is about 63–64 from season 5 on both difficulties.
- **Gyms win two titles in three:** 20 of 30 on seed 4, and 50 of 75 across all five runs.
- **The DPOY is a lineman's award:** 25 of 30 on seed 4, and 68 of 75 across all five runs.
- **Scoring rises 50–59%** on seed 4 (11.6→17.4 and 12.3→19.6), more than seed 3's 30–38%.
- **The cap never binds.**

**The MVP is seed-dependent:** running backs won 16 of 30 on seed 4 against 8 of 45 on seed 3.

**Totals across the five 15-season franchises:** 75 seasons and about 17,800 league games (224 regular-season games plus about 13 playoff games a season).
