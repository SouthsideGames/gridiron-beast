# M6-01 Apex progression: measured alternatives (2026-11-10)

**Status: decision needed. Nothing here is implemented.** Simulation f716b02; every alternative was applied inside the harness
only (`node tools/task8-m6-apex-alternatives.mjs --seasons=120`, raw results in `../apex-alternatives.json`).

## The conflict

- **Gate (spec §16):** at least 90% of Apex reach all 99s by season 15 under sustained legal participation and equal investment.
- **What an Apex needs:** 1,038 rating points from his 10–15 starts to all 99s. Natural growth to level 50 supplies 516 on
  average. The other **522 must be trained**, one banked point each (neutral Temper, no age cost).
- **To finish by season 15** he needs about **35 training points a season**.
- **What the rules supply:** 25% of a bar per activity plus 2 offseason points: **5.25 a season** on the mixed schedule
  (9 games, 4 Clashes) and **13.25** at maximum participation (12 games, 33 Clashes).
- **Result at current rules:** 0 of 1,000 by season 15. 90% arrive at **season 101** (mixed) or **season 40** (maximum).

Level XP is not the limit: the cohort reaches level 50 in season 7 (mixed) or 3 (maximum) and then waits on training points.

## Alternatives measured

Cohort: the benchmark's 1,000 forced Apex (100 per position), equal attribute investment, neutral grades, no injuries.
Natural growth, level XP, evolution, the offseason, ceilings, starting ratings, Temper, age and the calendar are production code.

| # | Alternative | Points a season (mixed / maximum) | 90% all-99 by season (mixed / maximum) | By season 15 (mixed / maximum) | Touches ordinary monsters |
| --- | --- | --- | --- | --- | --- |
| 0 | Current rules | 5.25 / 13.25 | 101 / 40 | 0% / 0% | — |
| 1 | Training share 50% for everyone (top of the authorized range) | 8.5 / 24.5 | 62 / 22 | 0% / 0% | **Yes** |
| 2 | Apex-only activity training ×3 | 11.75 / 35.75 | 45 / 15 | 0% / 100% | No |
| 3 | Apex-only activity training ×12 | 41 / 137 | 13 / 4 | 100% / 100% | No |
| 4 | Apex-only offseason award 2 + 30 | 35.25 / 43.25 | 15 / 13 | 98.2% / 100% | No |
| 5 | Apex-only offseason award 2 + 33 | 38.25 / 46.25 | 14 / 12 | 100% / 100% | No |
| 6 | Apex-only activity ×2 and offseason 2 + 28 | 36.5 / 52.5 | 15 / 11 | 100% / 100% | No |
| 7 | Apex-only activity ×3 and offseason 2 + 25 | 36.75 / 60.75 | 15 / 9 | 100% / 100% | No |
| 8 | Apex-only activity ×6 and offseason 2 + 15 | 36.5 / 84.5 | 15 / 7 | 100% / 100% | No |
| 9 | Keep the rules; restate the gate | 5.25 / 13.25 | 101 / 40 | 0% / 0% | No |

The full grid (activity ×1.5 to ×12, offseason +10 to +40, four hybrids) is in the raw file.

## What the numbers say

- **The authorized range cannot do it.** A 50% share for everyone still needs 22 seasons at maximum participation, and it would
  speed up every ordinary monster, which the gate does not ask for.
- **The two schedules are 3.5 times apart** in activities (13 against 45). A multiplier alone that meets the gate on the mixed
  schedule (×12) finishes in 4 seasons at maximum participation; one tuned to maximum (×3) takes 45 seasons on mixed.
- **An offseason award is the only single lever that meets the gate on both schedules.** It does not depend on playing, so an
  Apex who never plays would still finish in about 15 seasons.
- **A hybrid keeps a link to playing.** Row 6 meets the gate on both schedules and leaves an active Apex finishing four seasons
  sooner than a mixed one (11 against 15).

## Recommendation (not approved)

**Row 6: for an Apex only, activity training ×2 and an offseason award of 30 points (2 + 28).**

- It meets the gate on both documented schedules (100% by season 15; 90% by season 15 mixed, 11 maximum).
- It leaves ordinary progression, Temper, starting ratings, ceilings, ageing and the calendar exactly as they are.
- Most of the progress is the offseason award, so the result does not swing with how many Clashes a club happens to play.
- An Apex still starts at 10–15, and even at maximum participation 90% of the cohort are not all-99 until season 11.

**What approving it changes in the specification.** §5 says "Apex does not receive an extra training multiplier." Rows 2 to 8 all
contradict that sentence, so any of them needs that sentence replaced by the approved rule. §6's offseason award (2 points for
every eligible individual) would gain an Apex exception.

**If you prefer not to change the rule (row 9),** the measured statement is: "90% of Apex reach all 99s by season 40 at maximum
participation and by season 101 on the mixed schedule." The season-15 gate would then be retired or restated, and an all-99 Apex
would not occur inside a 20-season franchise.

## Limits of this evidence

- Controlled careers: neutral grades (no performance bonus, which is worth at most 5 points of a bar per activity), full
  participation in the scheduled activities, no injuries.
- In real franchise runs most AI-club monsters are in very few Clashes (see `MASTERY_FINDINGS.md`), so an AI-club Apex sits
  nearer the football-only pace than the mixed schedule. Rows 4 to 8 are robust to that; rows 2 and 3 are not.
- Contract valuation (B9) was not re-run under any alternative; a faster-developing Apex is worth more.
