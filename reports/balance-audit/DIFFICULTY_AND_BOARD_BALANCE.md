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

RESULTS_PLACEHOLDER
