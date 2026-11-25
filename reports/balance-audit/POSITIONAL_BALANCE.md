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

**Method:** `tools/position-leverage.mjs` (existing), 150 paired games, quality 62.
- **Design:** the starters of one position group are raised +8 in every attribute (about +8 overall), and the same game is played again against the same opponent.
- **Result:** the points of margin gained per +1 overall of one starter, relative to the average slot (`raw/position-leverage-150.json`).
- **Compared with:** the weights the trade valuation uses today, `src/franchise/trade-value.js` `POSITION_LEVERAGE`, which were measured in Task 5 before Task 8.

| Position (starters) | Margin gained by the group's +8 (± SE) | Relative value of one point of OVR at one slot | Trade valuation today |
|---|---|---|---|
| TE (1) | +2.03 ± 0.80 | **2.35** | 1.45 |
| RB (1) | +2.02 ± 0.84 | **2.32** | 1.60 |
| QB (1) | +1.85 ± 0.89 | **2.12** | 1.37 |
| CB (2) | +2.19 ± 0.88 | 1.26 | 1.21 |
| WR (3) | +3.11 ± 0.84 | 1.19 | 1.01 |
| LB (2) | +1.62 ± 0.81 | 0.93 | 1.02 |
| OL (3) | +1.84 ± 0.90 | 0.71 | 0.63 |
| S (2) | +0.78 ± 0.86 | **0.45** | 0.90 |
| DL (3) | +0.82 ± 0.83 | **0.32** | 0.86 |
| K (1) | +0.22 ± 0.71 | 0.26 | 0.79 |

- **P-5 (High): one point of overall is worth seven times more at TE, RB or QB than at DL or K.**
  - **The single offensive "skill" slots (TE, RB, QB) carry the most leverage** per slot.
  - **Safeties and defensive linemen carry very little.** This is consistent with the attribute sweep: the DL's speed and tackling and the safety's zone coverage do not act (`MONSTER_ATTRIBUTE_BALANCE.md` A-2), so a higher DL or S overall buys little on the field.
  - **Caution on the sample:** each group's SE is about ±0.85 points, so the per-slot figures for the one-starter groups are uncertain by roughly ±1.0 relative units. The ranking of the extremes (TE, RB, QB against DL, S, K) is robust; the middle is not.
- **The trade valuation underrates TE, RB and QB and overrates DL, S and K** relative to this build. The weights should be re-derived on the current engine, with more games, before they are trusted again.
- **Does team overall predict performance?** Yes, strongly: a 6–9 point overall edge wins 83% and 10+ wins 96% (`GAMEPLAY_BALANCE.md` §5). Team overall weights every starter equally, though. A club strong at TE, RB and QB beats a club of the same overall strong at DL and S, so team overall partly mis-ranks clubs built differently.

## 3. Depth, fatigue, injuries and substitutions

- **In a single game, depth costs more than it returns** (§1, P-3).
- **Across seasons:**
  - in-game injuries are rare (`ROTATION_RULES.injuryChance` 0.0015 per contact);
  - durability halves the injury risk (`MONSTER_ATTRIBUTE_BALANCE.md`);
  - reserves still develop at 77% of a starter's pace (`PROGRESSION_AND_EVOLUTION.md` §2).
- Depth therefore pays mainly as **injury insurance and development pipeline**, not as on-field rotation value.
- **The cost of having no depth at a position is severe:** an emptied position mid-game is a 0–21 forfeit (`TECHNICAL_ISSUES.md` T-1).

## 4. Are several roster strategies viable?

Yes, within the bands in §1:
- **viable:** balanced, passing, rushing, elite QB and superstars;
- **clearly ahead:** speed;
- **behind at equal cost:** strength, defence and depth.

Combined with §2, the strongest practical build at a fixed payroll is **fast skill players at TE, RB, QB and WR, with the defensive line and safeties as the budget positions**.

