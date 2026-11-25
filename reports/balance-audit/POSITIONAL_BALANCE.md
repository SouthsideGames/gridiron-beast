# Positional and roster-construction balance

**Build:** `v43.50.0-sideline` at `58c33ee`. Production engine, generated clubs, Franchise Mode game settings.

## 1. Roster-construction strategies at a constant payroll

**Method:** `tools/balance-audit/roster-strategy.mjs` (new; observation only).
- **Salary is linear in overall** (`src/data/monsters.js` `salaryFor` = 18,000 + 280 × OVR), so **a constant payroll is a constant sum of roster overall.**
- **How each strategy is built:**
  - raise its target monsters' attributes;
  - lower its donors' attributes one point at a time until the summed roster overall is back at the control's;
  - the measured budget difference is 0.00 OVR in every strategy.
- **How each game is played:** the same generated club (quality 60) plays the same opponent with the same game seed, once per strategy. The difference against the unchanged club is the strategy's effect.
- **Sample:** 150 paired games per strategy (`raw/roster-strategy-150.json`).

| Strategy | What changes | Margin vs control (± SE) | Win % (control 48.3) |
|---|---|---|---|
| **Speed** | +12 speed on every starter, paid for by their other attributes | **+3.54 ± 0.99** | **59.0** |
| Elite QB | QB +15 all attributes, paid for by the other starters | +1.64 ± 0.95 | 55.7 |
| Passing | QB, WR, TE +8, paid for by the other starters | +1.47 ± 0.96 | 55.7 |
| Offence | all offensive starters +8, paid for by the defence | +1.08 ± 0.91 | 52.7 |
| Superstars | the three best starters +15, paid for by the rest | +0.97 ± 1.02 | 55.0 |
| Rushing | RB, OL, TE +8, paid for by the other starters | +0.71 ± 0.93 | 49.7 |
| Defence | all defensive starters +8, paid for by the offence | −1.92 ± 0.86 | 45.3 |
| **Strength** | +12 strength on every starter, paid for by their other attributes | **−2.29 ± 0.88** | **39.7** |
| **Depth** | every reserve +10, paid for by the starters | **−3.57 ± 0.93** | **35.7** |

**Findings:**
- **P-1 (High): speed is an exploit at constant cost.**
  - Moving attribute points into speed gains +3.5 points a game (3.6 standard errors) and 10.7 win points.
  - Moving the same points into strength loses 2.3.
  - The overall formula weights speed no higher than other key attributes, so a speed-heavy monster costs the same as a balanced one of the same overall and plays clearly better.
  - This matches the attribute sweep (`MONSTER_ATTRIBUTE_BALANCE.md` A-1).
- **P-2 (Medium): offence is worth more than defence at the same cost.** Offence +1.1 against defence −1.9, a gap of about 3 points per game. Quarterback and passing investment lean positive but are within two standard errors.
- **P-3 (Medium): depth has no value in a single game.**
  - Strong reserves with weaker starters lose 3.6 points a game. That is expected inside one game, because rotation only relieves fatigue at the margin.
  - The question is whether depth pays back across a season, through in-game and weekly injuries, fatigue, and the development slots. That is answered with the franchise runs (`FRANCHISE_SIMULATION.md`).
  - If it does not, roster depth has no competitive value except as injury insurance.
- **P-4: several strategies are viable.** Passing, rushing, elite-QB and superstar builds all land within about ±1.6 points of balanced. Only speed (too strong) and strength, depth and defence (too weak) are clearly off.

## 2. Marginal value by position

LEVERAGE_PLACEHOLDER
