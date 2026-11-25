# Difficulty and Board balance

**Build:** `v43.50.0-sideline` at `58c33ee`.

## The rules, as implemented

**Difficulty** (`src/franchise/franchise.js` `DIFFICULTY`):

| Difficulty | AI club quality | AI play-calling IQ | Hall of Fame goals (badges / titles / wins / awards) |
|---|---|---|---|
| Rookie | −4 (ordinary clubs only; gyms keep the Pro level) | 0.6 | 8 / 1 / 30 / 2 |
| Pro | −1 | 1.0 | 8 / 2 / 50 / 3 |
| All-Star | +3 | 1.5 | 12 / 4 / 80 / 5 |

- **Difficulty sets only the AI clubs' starting quality and play-calling.** Club strength after that comes from each club's own roster: its development, ageing, the draft, trades and free agency. There is no seasonal growth and no catch-up (`clubQuality`, Task 8 N7f).

**The Board** (`src/franchise/board.js`, `BOARD_RULES`) **is the same on every difficulty.**
- **The forecast:** the club's win share is 0.5 + 0.035 per point of team overall above the league average, kept between 15% and 85%.
- **The goals.** The owner picks one each season:
  - **Safe:** the rounded forecast wins, at least 3 and at most 11 of 14.
  - **Medium:** the playoffs or a badge.
  - **Stretch:** the title.
- **Confidence:**
  - a goal met adds +1 (+2 for the title), and any deficit is cleared first;
  - a goal missed costs −1;
  - −1 is the hot seat and −2 a dismissal;
  - a narrow miss on the hot seat is a final warning, not a dismissal;
  - three missed seasons in a row end the franchise whatever the margins;
  - the champion is never fired.
- Because the forecast compares the club with the league, **the Board scales with difficulty on its own.** A weaker club on All-Star is asked for fewer wins.

**The career length is 15 seasons, not 20.**
- `src/franchise/gm-career.js` `CAREER_SEASONS = 15` is the lifecycle cap (`lifecycle.js` `SEASON_CAP`). It was approved on 2026-11-15 (GDD §27.5E) and merged with the coaching and GM-mobility work.
- GDD §42 still describes the 20-season maximum, and the audit brief asks for 20-season runs.
- **The production lifecycle refuses a 16th season,** so every franchise run here stops at season 15. That is the existing lifecycle, which the brief says to respect. Its "Season 20" snapshots are therefore Season 15.

## Method

**1. Normal play: the real Board, the hands-off owner.**
- **Tool:** `tools/balance-compare.mjs --mode=persistent` (existing), using the same owner policy as the Task 6/7 difficulty bands.
- **Runs:** seeds 1–3 on each difficulty, up to 5 seasons. A fired owner ends the run.
- **Raw data:** `raw/board-live-{rookie,pro,allstar}-s1-3-5s.json`.
- **The Board's own record**, season by season, comes from `tools/balance-audit/board-trace.mjs` (new): `raw/board-trace-pro-seed1-5s.json`.

**2. Diagnostic: the Board kept content.** The 15-season franchises in `FRANCHISE_SIMULATION.md` (repair owner). These are kept separate from normal play, as the brief asks.

**A counting caveat in the existing tool.** `balance-compare.mjs` records a season in `onSeason`, which runs after the offseason. In the season an owner is fired, the loop stops before that. **The firing season is therefore never in its rows**, so its win % and playoff % leave out every season that ended in a dismissal. "FIRED" after three recorded seasons means dismissed at the end of season 4. This is fixed by reading the Board trace (Low, measurement).

## 1. Owner results with the real Board

| Difficulty | Recorded seasons | Hands-off win % (recorded) | Task 7 band | Playoff % | Owners dismissed | Dismissed at the end of season |
|---|---|---|---|---|---|---|
| Rookie | 13 | 64.8 | 54–70 (in) | 69.2 | **1 of 3** | 4 |
| Pro | 9 | **42.1** | 45–53 (below) | 22.2 | **3 of 3** | 4, 4, 4 |
| All-Star | 10 | 39.3 | 32–40 (in) | 20.0 | **3 of 3** | 5, 3, 5 |

**Seven of nine hands-off owners were dismissed within five seasons.** Every Pro and every All-Star owner was gone by season 5.

- **The win rates themselves sit in or near the Task 7 bands.** Pro is 3 points under. The bands are met only on the recorded seasons, and the dismissal seasons, which are worse, are left out.
- **The difficulty is right in the short run.** Rookie wins 65%, Pro 42% and All-Star 39%, in order.
- **What goes wrong is the Board, not the football.**

## 2. Why the owners are dismissed: the forecast is inflated

The Board's own record for the hands-off owner, Pro seed 1 (`raw/board-trace-pro-seed1-5s.json`):

| Season | Record | Safe goal | Forecast wins | Result | Confidence | Misses in a row |
|---|---|---|---|---|---|---|
| 1 | 11-3 | win 6 | 6.1 | met | +1 | 0 |
| 2 | 7-7 | win 8 | 8.3 | narrow miss | 0 | 1 |
| 3 | 7-7 | win 9 | 8.9 | narrow miss | −1 (hot seat) | 2 |
| 4 | 3-11 | win 10 | 9.6 | clear miss | **dismissed** ("3 missed seasons in a row") | 3 |

**The forecast rises every season while the club gets worse.** The reason is in `src/franchise/franchise.js` line 989:
- the owner's talent is his club's real team overall;
- **every AI club's talent is what today's generator would field (`todayOverall`), not the persistent club's real strength.**
- The comment says a persistent club "opens below that and grows to it as it plays", but it does not stop there.

**The gap between real and assumed AI strength** (same runs, mean AI team overall at season end):

| Difficulty | Real ("aiEnd") | The forecast's assumption ("today") |
|---|---|---|
| Rookie | 58.6 | 50.3 |
| Pro | 57.3 | 51.7 |
| All-Star | 59.9 | 55.0 |

These are means over each run's recorded seasons, and the gap widens as seasons pass. By season 3 the real AI clubs are about 60 against an assumed 51–52.

- **The effect on the goals:** the forecast credits the owner with being about 5–8 overall points better than the league than he really is. At the Board's slope of 0.035 a point, that is about 2.5–4 wins of 14.
- **The safe goal follows the forecast**, so it climbs out of reach.
- **The three-strike rule then dismisses the owner** however narrow the misses.

**B-1 (Critical for Franchise Mode): the Board forecast compares the owner with a phantom league.**
- **What happens:** a player who keeps a steady club is asked for more wins every season and dismissed within 4–5 seasons, at every difficulty.
- **Evidence:** 7 of 9 runs; the mechanism is in the trace above.
- **Cause:** one line, `franchise.js:989`. Coach of the Year expectations read the same field (`f.season.expectations`), so its preseason expectations are skewed the same way.

EXPERIMENT_X2

## 3. Difficulty over a whole career (Board kept content)

From the 15-season franchises (`FRANCHISE_SIMULATION.md` §2, seed 3; seed 4 on Pro):

| Season | AI overall, Rookie | AI overall, Pro | AI overall, All-Star |
|---|---|---|---|
| 1 | 52.9 | 53.9 | 57.2 |
| 5 | 63.8 | 64.2 | 64.1 |
| 15 | 63.5 | 64.6 | 63.8 |

Pro seed 4 has the same shape: 52.7, then 63.5, then 63.2.

**D-1 (High): difficulty fades.** After season 5 the AI clubs are equally strong on all three difficulties. Only the AI's play-calling IQ still differs.
- The repair owner's 15-season win % (seed 3) was Rookie 38.6, Pro 35.7 and All-Star 57.1, so it does not follow difficulty.
- On seed 4 (Pro) it was 47.6.
- **The founding roster matters more than the difficulty**, as Task 10 found.

## 4. Answers to the brief

| Question | Answer |
|---|---|
| Are the difficulties differentiated? | **In seasons 1–4, yes:** AI starting strength rises 4 points from Rookie to All-Star, and the hands-off owner wins 65 / 42 / 39%. **After season 5, barely:** AI strength converges (D-1) |
| Board expectations appropriate? | **No.** The forecast overrates the owner by 5–8 points of team overall once AI clubs develop (B-1) |
| Do dismissals come too often or too early? | **Yes:** 7 of 9 hands-off owners within 5 seasons; all Pro and All-Star owners by season 5 |
| Average franchise longevity (hands-off, real Board) | Rookie: 2 of 3 complete the 5 studied seasons. Pro: 4.0 seasons. All-Star: 4.3 seasons (dismissal seasons included) |
| Can owners recover from losing seasons? | The hot-seat "narrow miss" warning works (season 3 above). But three missed seasons in a row end the franchise however narrow, and an inflated goal makes three in a row likely |
| Legitimate difficulty or unfair outcome? | **Unfair:** a Pro owner who went 11-3 and 7-7 twice was dismissed because his goals assumed a league of 52-overall clubs that had grown to 60 |

