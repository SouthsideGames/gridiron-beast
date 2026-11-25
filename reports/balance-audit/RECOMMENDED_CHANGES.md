# Recommended changes

Every recommendation below rests on a measurement in this audit. **None has been applied to the game**: `src/` is unchanged on this branch (`git diff 58c33ee -- src index.html` is empty). Experiments ran in isolated copies only (§ "Experiments").

Each item gives:
- severity and priority;
- the intended and the measured behaviour;
- the evidence;
- the code;
- the proposal;
- any experiment;
- the risks.

Severity:
- **Critical:** breaks the game or loses data.
- **High:** materially distorts balance or the studies that guard it.
- **Medium:** noticeable, with a clear cause.
- **Low:** polish, or an owner decision.

ITEMS_PLACEHOLDER

## Experiments run (isolated, not applied)

### X-1. Let AI clubs call the whole released defensive book

- **Change.** An isolated copy of `src/` (`scratchpad/exp-defpool`, diff in `raw/experiment-defpool.diff`): `ZONE_D` and `MAN_D` in `src/franchise/roster.js` become every released defensive call tagged zone or man. Desperation, goal-line, prevent, red-zone and two-minute calls are excluded. One variable changed.
- **Matched comparison.** `tools/balance-audit/game-study.mjs --games=500 --seed=1`, the same clubs and seeds as the baseline mixed run. Results in `raw/experiment-defpool-game-study-500-mixed.json`.

| Measure | Baseline | Whole defensive book |
|---|---|---|
| Distinct defensive calls used | 24 | **143** |
| Points per team-game | 12.87 | 12.79 |
| Completion | 52.8% | 52.1% |
| Yards per attempt | 7.54 | 7.78 |
| Yards per carry | 5.31 | 4.92 |
| Sacks per dropback | 2.7% | 3.6% |
| Third-down conversion | 34.6% | 33.3% |
| Upsets (of decided games) | 24.2% | 27.2% |
| Still tied after overtime | 3.6% | 1.6% |

- **Reading.** Opening the book to the AI multiplies the variety of defences a player faces by six, while barely moving scoring (−0.1 points per team-game).
- **Side effects:** a little more pass rush (+0.9 sack points) and a little less run game (−0.4 yards per carry).
- **Unintended consequences to check** before adopting it: the play-by-play counter logic (`counterPlays`) and the coach-identity defensive leans were tuned on the 24-call pool.
