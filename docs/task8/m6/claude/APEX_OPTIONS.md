# M6-01 Apex progression: proposed Apex-only training adjustment (2026-11-11)

> **Update, later the same day:** the owner chose activity ×2 with 34 offseason points as the candidate to validate. In real club
> careers it does **not** meet the goal (1.4% / 40.0% / 79.6% by season 15). See `APEX_VALIDATION.md`. The tables below are the
> controlled cohort and overstate what real clubs achieve.

**Status: proposal for owner review. Nothing here is implemented.** The goal is kept as it stands: at least 90% of Apex reach all
99s by season 15. Every alternative was applied inside the harness only
(`node tools/task8-m6-apex-alternatives.mjs --seasons=120`, raw results in `../apex-alternatives.json`). Simulation f716b02.

## Proposal

**For an Apex only: activity training ×2, and an offseason award of 34 points (the ordinary 2 plus 32).**

| Schedule | Points a season | 90% all-99 by season | All-99 by season 15 |
| --- | --- | --- | --- |
| Football only (9 games, no Clashes) | 38.5 | 14 | 100% |
| Mixed (9 games, 4 Clashes) | 40.5 | 13 | 100% |
| Maximum (12 games, 33 Clashes) | 56.5 | 10 | 100% |

- **It meets the goal on all three schedules with one season to spare.** The smallest setting that passes is ×2 with 2 + 30
  (seasons 15 / 14 / 10), which leaves no margin for a missed season.
- **Ordinary monsters are untouched.** Level XP, natural growth, Temper, starting ratings, ceilings, ageing and the calendar stay
  exactly as they are.
- **An Apex still starts at 10–15** and is not all-99 before season 10 on any schedule.
- **Football-only matters** because AI-club Apex rarely fight Clashes (`BALANCE_ACCEPTANCE.md`). The earlier candidate
  (×2 with 2 + 28) passed mixed and maximum but only 9% of the football-only cohort made season 15.

## Why an adjustment is needed

- **What an Apex needs:** 1,038 rating points from his 10–15 starts to all 99s. Natural growth to level 50 supplies 516 on
  average. The other **522 must be trained**, one banked point each.
- **To finish by season 15** he needs about **35 training points a season**.
- **What the rules supply:** 4.25 a season football-only, 5.25 mixed, 13.25 at maximum participation.
- **Result at current rules:** 0 of 1,000 by season 15 on any schedule. 90% arrive at season 101 (mixed) or 40 (maximum);
  football-only does not arrive within 120 seasons.

Level XP is not the limit: the cohort reaches level 50 in season 9, 7 or 3 and then waits on training points.

## Alternatives measured

Cohort: 1,000 forced Apex (100 per position), equal attribute investment, neutral grades, no injuries. Seasons are the one by
which 90% are all-99, in the order football-only / mixed / maximum.

| # | Alternative (Apex only unless stated) | Points a season | 90% by season | All three by 15? |
| --- | --- | --- | --- | --- |
| 0 | Current rules | 4.25 / 5.25 / 13.25 | never / 101 / 40 | No |
| 1 | Training share 50% for **every** monster (top of the authorized range) | 6.5 / 8.5 / 24.5 | 81 / 62 / 22 | No |
| 2 | Activity ×3 | 8.75 / 11.75 / 35.75 | 61 / 45 / 15 | No |
| 3 | Activity ×12 | 29 / 41 / 137 | 19 / 13 / 4 | No |
| 4 | Offseason 2 + 30 | 34.25 / 35.25 / 43.25 | 16 / 15 / 13 | No |
| 5 | Offseason 2 + 33 | 37.25 / 38.25 / 46.25 | 15 / 14 / 12 | **Yes** |
| 6 | Activity ×2 and offseason 2 + 28 | 34.5 / 36.5 / 52.5 | 16 / 15 / 11 | No |
| 7 | Activity ×2 and offseason 2 + 30 | 36.5 / 38.5 / 54.5 | 15 / 14 / 10 | **Yes** |
| **8** | **Activity ×2 and offseason 2 + 32 (proposed)** | **38.5 / 40.5 / 56.5** | **14 / 13 / 10** | **Yes** |
| 9 | Activity ×3 and offseason 2 + 28 | 36.75 / 39.75 / 63.75 | 15 / 14 / 9 | **Yes** |
| 10 | Activity ×6 and offseason 2 + 15 | 30.5 / 36.5 / 84.5 | 18 / 15 / 7 | No |

The full grid (activity ×1.5 to ×12, offseason +10 to +40, seven hybrids) is in the raw file.

## What the numbers say

- **The authorized range cannot do it.** A 50% share for everyone still needs 22 seasons at maximum participation and would
  speed up every ordinary monster.
- **A multiplier alone cannot do it.** The schedules are far apart in activities (9, 13 and 45 a season). The multiplier that
  suits football-only would finish a maximum-participation Apex in three or four seasons.
- **The offseason award does most of the work in every passing row.** It does not depend on playing. An Apex who never plays
  still collects it, but he gains no levels and so none of the 516 points of natural growth: at 34 points a season he would need
  about 30 seasons.
- **The ×2 keeps a link to playing:** four seasons between a football-only Apex and a fully active one.

## The simpler alternative: row 5

Offseason 2 + 33 with no multiplier also passes (15 / 14 / 12). It is one number instead of two and leaves the sentence in §5
("Apex does not receive an extra training multiplier") true as written. Against it: no margin on the football-only schedule, and
playing changes the finish by only three seasons. If keeping §5 unchanged matters more than the margin, choose row 5 with 2 + 35
(14 / 14 / 11).

## What approval would change

- **Specification:** §6's offseason award (2 points for every eligible individual) gains an Apex exception. For the proposal
  (row 8) the §5 sentence quoted above is replaced by the approved rule; for row 5 it stays.
- **Code:** one Apex branch in the award functions (`src/franchise/t8/awards.js`) and the offseason; its own simulation commit,
  full regression, identity baseline and replay check; the Apex career benchmark rerun on that commit.
- **Economy:** a faster Apex makes the unimplemented Apex contract ask (B9, `ECONOMY_FINDINGS.md`) matter more. I would decide
  the two together.

## Limits

- Controlled cohort: every Apex plays every scheduled activity from season 1 with neutral grades and no injuries. In real
  franchise runs only 33 of 58 Apex ever started a game, so real clubs would be slower than this table.
- The awards are applied in the harness, not in the game; the season counts should be confirmed on the implemented rule.
