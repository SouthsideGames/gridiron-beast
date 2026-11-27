# Monster progression and evolution

**Build:** `v43.50.0-sideline` at `58c33ee`.

**Sources:**
- the 15-season franchise runs (seed 3, Pro and All-Star; `FREE_AGENCY_AND_ECONOMY.md` describes the method);
- every monster of all 32 clubs at every season end: about 1,160–1,200 a season, roughly 17,500 monster-seasons per run (`v4.seasons[].monsters`).

**Derived tables:**
- `raw/progression-pro-allstar.txt`;
- `raw/franchise-summary-pro-allstar.json`.

The training-attribute effects are in `MONSTER_ATTRIBUTE_BALANCE.md`.

## 1. Pace

| Season | League mean level (Pro / All-Star) | Monsters at level 50 | Mean AI starter OVR (Pro) | Monsters evolved that season (Pro / All-Star) |
|---|---|---|---|---|
| 1 | 15.1 / 19.8 | 73 / 136 | 54.7 | 93 / 50 |
| 2 | 18.9 / 22.4 | 129 / 219 | — | 65 / 43 |
| 5 | 26.1 / 26.5 | 385 / 421 | 64.7 | 19 / 17 |
| 10 | 24.5 / 24.3 | 385 / 359 | 64.9 | 24 / 23 |
| 15 | 24.7 / 24.8 | 340 / 339 | 65.2 | 21 / 25 |

**The league develops fast for four or five seasons, then reaches a steady state.**
- Starters gain about 10 overall points in the first five seasons, then stay flat to season 15.
- About 30% of all monsters are at level 50 from season 5 onwards.
- **There is no long-term talent inflation.** Mean starter overall in seasons 5, 10 and 15 is 64.7, 64.9 and 65.2 on Pro, and AI team overall is 64.2, 64.0 and 64.6.
- **The early surge is a founding effect.** The founding league is young and low-level (no starter aged 32 or over in season 1), and development fills it in.

**Evolution is concentrated early.** About 93 monsters evolve in season 1 and about 20 a season from season 5. The number of monsters at stage 1 or above falls from 244 (season 2) to 146 (season 15), as the evolved founders retire faster than new evolutions replace them.

## 2. Who develops

**Mean overall gain per season, by age at the start of the season** (Pro; All-Star is within about 0.3 points of Pro at every age):

| Age | 19 | 20 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Gain | +1.7 | +2.0 | +2.1 | **+2.2** | +2.2 | +2.1 | +1.8 | +1.7 | +1.2 | +0.6 | −0.2 | −0.7 | −1.1 | −1.4 | −1.3 |

- **Development peaks at 22 to 25, turns negative at 30, and declines about 1.1–1.4 points a year from 32.**
- This matches the ageing curves (`src/data/aging.js` `CURVE`: onset 27 for RB, 30 for QB and OL, 32 for K).
- **Positions:** the mean gain per season is +1.0 to +1.7 at every position.
  - Highest: OL +1.7 (Pro) and K +1.5.
  - Lowest: QB +1.1 and TE +1.1.
  - **No position has a clearly better development path.**
- **Starters against reserves:** starters gain +1.55 a season, reserves +1.20 (Pro; 7,594 and 6,882 monster-seasons).
  - Playing time is rewarded, but reserves still develop through practice and the development slots.
  - The 0.35-point gap compounds to about 2 overall over six seasons.

## 3. Can young monsters start, and do veterans keep value?

| Season | Starters aged ≤24 (Pro / All-Star) | Starters aged ≥32 |
|---|---|---|
| 1 | 39.6% / 35.4% | 0% / 0% |
| 5 | 15.5% / 15.7% | 14.6% / 15.3% |
| 10 | 18.6% / 20.6% | 24.6% / 24.5% |
| 15 | 26.0% / 31.0% | 17.1% / 16.3% |

**Mean overall by age, season 15 (Pro):**

| Age | 20–21 | 22–23 | 24–25 | 26–27 | 28–29 | 30–31 | 32–33 | 34–35 | 36+ |
|---|---|---|---|---|---|---|---|---|---|
| OVR | 44.7 | 43.4 | 45.6 | 54.4 | 62.9 | 63.6 | 67.8 | 70.1 | 69.4 |

- **Young monsters do start:** one starter in four to one in three is 24 or younger by season 15.
- **The best monsters are veterans.** Mean overall rises to the age group 34–35 (70.1). This is partly survivorship (the weak ones retire), and partly the ageless monsters, who never decline.
- **Veterans keep their value well into their thirties.** The age curve is gentle, and a 34-year-old starter is on average the strongest in the league. That makes veterans the safest acquisitions, which reduces the tension between youth and experience.

## 4. Retirement

| Measure | Pro | All-Star |
|---|---|---|
| Retirements over 15 seasons | 636 | 656 |
| Mean age at retirement | 32.2 | 32.4 |
| Mean overall at retirement | 59.0 | 59.7 |
| Were starters | 494 (78%) | 518 (79%) |

**Mean retirement age by position (Pro):**

| Position | RB | WR | CB | TE | S | LB | DL | OL | QB | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Age | 28.9 | 31.0 | 31.4 | 31.5 | 32.5 | 32.5 | 33.0 | 33.6 | 34.4 | 35.6 |

- **The retirement order follows the ageing curves as intended:** RBs leave youngest, kickers and QBs oldest.
- **Monsters retire while still useful:** 78% retire as starters, at a mean overall of 59.
- Nobody plays forever except the ageless monsters (§5).

## 5. Ageless and Apex monsters

- **Ageless monsters: 13 in the league at every season of both runs.** These are the gym legendaries and the rival's signature (`league-registry.js` `isAgeless`). They never retire.
- **Apex-like monsters** (every attribute except kicking at 95 or more, the shape an Apex reaches) grow steadily:

| Season | Pro | All-Star |
|---|---|---|
| 1 | 0 | 0 |
| 5 | 1 | 2 |
| 10 | 8 | 9 |
| 15 | **14** | **13** |

- **Task 10 found that ageless all-99 monsters drive repeat MVPs and title concentration** (`docs/task10/OWNER_DECISIONS_2026-11-13.md` §1 and §7). The count here grows by about one a season with no ceiling. That is the long-term risk the 15-season cap now limits.
- **On award concentration:** the **DPOY went to a defensive lineman in 29 of 30 seasons** (Pro 15 of 15, All-Star 14 of 15). See `FRANCHISE_SIMULATION.md` §4.

## 6. Answers to the brief

| Question | Answer |
|---|---|
| Too fast or too slow? | Fast in seasons 1 to 4 (+10 starter overall), then stable. Reasonable for a 15-season career; no runaway |
| Positions with better progression? | No: +1.0 to +1.7 a season everywhere |
| High rarity too dominant? | In Clash, rarity buys ratings as intended (`BEAST_CLASH_BALANCE.md` §5). Football data per rarity was not recorded in these runs (the monster rows carry no species) |
| Lower rarity still relevant? | Yes in Clash (four commons in the top ten abilities). Not measured in football |
| Are training decisions meaningful? | Yes, strongly. Speed and blocking training swing results much more than awareness, catching (defenders) or zone coverage. Durability training is invisible in the overall (`MONSTER_ATTRIBUTE_BALANCE.md`) |
| Long-term inflation? | None in overall. Scoring rises (14 to 18–21 points per team-game, `FRANCHISE_SIMULATION.md`) because the league is more developed |
| Can young monsters compete? | Yes: 26–31% of starters are 24 or younger by season 15 |
| Do veterans keep value? | Yes, perhaps too much: the strongest age group is 34–35 |
