# Apex candidate validation in real club careers (2026-11-11)

**Candidate: for an Apex only, activity training ×2 and 34 offseason training points. Tested, not adopted, not in the game.**
It lives in a measurement copy behind a switch (`apex-candidate-measurement.patch`). Ordinary progression, Temper, level XP,
ceilings and the calendar are unchanged; the existing award, progression and reward tests pass with the switch on (15 of 15).

## Result

**The candidate does not meet "90% all-99 by season 15" in real club careers on any schedule.**

| Schedule | Apex entrants | All 99s by season 15 | Sustained starters only | All 99s by season 15 |
| --- | --- | --- | --- | --- |
| Football only | 71 | **1.4%** | 24 | **4.2%** |
| Mixed (4 Clashes a season) | 50 | **40.0%** | 24 | **70.8%** |
| Maximum (every Clash his club fights) | 49 | **79.6%** | 23 | **95.7%** |
| All | 170 | 35.3% | | |

- **Entrants:** every Apex first seen at level 1 at a season start in seasons 1–5, followed for 15 seasons.
- **Sustained starters:** at least 7 football starts in at least 12 of the 15 seasons.
- The controlled cohort had promised 100% by season 14 / 13 / 10.

## How it was run

- **8 full franchises** (seeds 31–38), 20 seasons each: 12,030 football games, 25,126 Clash settlements, 643 Apex seen.
- **Everything is the game's own behaviour:** the club decides whether he starts, injuries happen, the AI spends his training
  points with its normal policy, clubs trade, bench and release him.
- **Two things were imposed, and only these:**
  1. **More Apex.** The Apex chance was 10% instead of 1% for seasons 1–5 so there are enough careers to count. The normal
     rate would give about three per franchise.
  2. **The Clash schedule.** Each Apex was assigned at random to never fight, to fight his club's first four Clashes of a
     season, or to fight every Clash his club has. Without this, almost every AI-club Apex would be football-only.
- **Not represented:** a human owner who chooses to play his Apex. All clubs are run by the AI.

## Why real careers are slower than the controlled cohort

| | Controlled cohort | Real careers (football-only / mixed / maximum) |
| --- | --- | --- |
| Football starts a season | 9 or 12, every season | 6.1 / 7.2 / 6.8 |
| Seasons as a starter, of 15 | 15 | 9.3 / 11.0 / 10.4 |
| Seasons with no participation at all, of 15 | 0 | 5.3 / 1.0 / 1.4 |
| Clashes a season | 0 / 4 / 33 | 0 / 3.3 / 7.4 |
| Median season at level 50 | 9 / 7 / 3 | 11 / 9 / 8 |
| No longer in the league at season 15 | 0 | 10 of 71 / 1 of 50 / 3 of 49 |

- **A new Apex is the worst player on his club.** He starts at 10–15 in every rating, so the AI benches him. A football-only
  Apex sits out about five of his first fifteen seasons, earning only the offseason award.
- **Sitting out costs levels, and levels are half his growth.** 516 of the 1,038 points he needs come from levelling up.
  Football-only Apex reach level 50 in season 11, not 9.
- **Some are released.** 14 of 170 were on no club at season 15. Nothing in training can help those.
- **"Maximum" on an AI club is about 7 Clashes a season, not 33.** The 33 comes from a human owner's calendar.

## How far short

Rating points still missing at season 15 (of 1,188):

| Schedule | Median, all entrants | Median, sustained starters | Worst tenth, sustained starters |
| --- | --- | --- | --- |
| Football only | 58 | 31 | 46 |
| Mixed | 11 | 0 | 18 |
| Maximum | 0 | 0 | 0 |

For sustained starters the gap is about 1 to 3 more points a season. For all entrants there is no training rate that reaches
90%, because some never play and some are released.

## What this means for the decision

1. **The goal needs a population.** The specification's wording is "sustained legal participation and equal investment". If
   that means sustained starters, the candidate is close on mixed and maximum and well short on football-only. If it means
   every Apex generated, no training adjustment can meet it.
2. **For sustained starters, the offseason award is the lever.** Roughly 38 to 42 offseason points with the ×2 looks like
   the range. I have started both in the same harness on four seeds as an indicative follow-up (not requested; about half the
   sample). I will report them when they finish.
3. **Or address the cause:** AI clubs benching and releasing a known Apex. That is AI behaviour and is tied to the Apex
   knowledge and contract rules (decision 8), so it would be its own proposal.

## Checks

- A looser entrant definition (level 5 or lower at first sight, 271 Apex) gives 18.4% / 57.9% / 86.4%: the same conclusion.
- Evidence: `apex-validation-real-careers.json`, `apex-validation-real-careers-level5.json`. Tools:
  `tools/task8-m6-apex-validation-probe.mjs`, `tools/task8-m6-apex-validation-analyze.mjs`.

## Limits

- 23 to 71 careers per cell. The football-only and mixed misses are far outside sampling error; the 95.7% for sustained
  maximum starters is 22 of 23.
- Ten times the normal number of Apex were in each league in the early seasons, which makes those leagues stronger than normal.
- Forcing an Apex into Clash lineups weakens his club's Clash results while he is undeveloped.
