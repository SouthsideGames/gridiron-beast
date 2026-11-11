# Apex validation: activity training ×2 and 42 total offseason points, eight seeds (2026-11-11)

**Validated in a measurement copy. Not adopted. Not in the game or the preview.** Goal and eligibility as ruled and written
beforehand in `APEX_GOAL_DEFINITION.md`. Ordinary progression, Temper, starting attributes, ceilings and Apex ageing are
unchanged: the switch touches only an Apex's activity training and his offseason award (`apex-candidate-measurement.patch`),
and the ordinary award, progression and reward tests pass with it on (15 of 15).

## Result

**The setting meets the goal on every schedule: 96 of 96 sustained starters had all twelve attributes at 99 by the end of
their fifteenth season.**

| Schedule | Sustained starters | All 99s by end of season 15 | 95% interval | By end of season 12 | By end of season 10 |
| --- | --- | --- | --- | --- | --- |
| Football only | 30 | **100%** (30) | 88.6–100 | 0% | 0% |
| Mixed | 30 | **100%** (30) | 88.6–100 | 0% | 0% |
| Maximum | 36 | **100%** (36) | 90.4–100 | 11.1% (4) | 0% |
| All three | 96 | **100%** (96) | 96.2–100 | 4.2% (4) | 0% |

- With 30 to 36 careers a schedule, the lower end of each interval is 88.6% to 90.4%. Per schedule the data are consistent
  with the 90% goal but cannot prove it to the decimal; pooled, the lower end is 96.2%.
- **Run:** 8 franchises (seeds 31–38) × 20 seasons, 12,126 football games, 630 Apex seen.

## The same test without the eligibility filter

| Schedule | All entrants | All 99s by end of season 15 | 95% interval | By season 12 | By season 10 |
| --- | --- | --- | --- | --- | --- |
| Football only | 66 | 71.2% (47) | 59.4–80.7 | 0% | 0% |
| Mixed | 57 | 91.2% (52) | 81.1–96.2 | 0% | 0% |
| Maximum | 52 | 86.5% (45) | 74.7–93.3 | 7.7% (4) | 0% |
| All three | 175 | 82.3% (144) | 76.0–87.2 | 2.3% (4) | 0% |

One offseason later (the start of season 16, the reading used in my earlier reports) the all-entrant figures are 93.9% /
98.2% / 88.5%. Most football-only misses are one award short.

## When they finish

Season in which all twelve attributes first read 99 at season's end:

| Schedule | Season 12 | 13 | 14 | 15 | Not by 15 |
| --- | --- | --- | --- | --- | --- |
| Football only, sustained (30) | 0 | 1 | 6 | 23 | 0 |
| Mixed, sustained (30) | 0 | 4 | 21 | 5 | 0 |
| Maximum, sustained (36) | 4 | 26 | 3 | 3 | 0 |
| Football only, all entrants (66) | 0 | 1 | 7 | 39 | 19 |
| Mixed, all entrants (57) | 0 | 4 | 27 | 21 | 5 |
| Maximum, all entrants (52) | 4 | 29 | 8 | 4 | 7 |

Nobody finished before season 12.

## Is maximum participation too quick?

- **On AI clubs, no.** "Maximum" there is 8.4 Clashes a season. The earliest finish is season 12 (4 of 36); the typical one
  is season 13.
- **For a human owner it would be quicker, and this run does not measure it.** A human calendar allows about 12 games and 33
  Clashes a season. At this setting that is about 64 training points a season against the 522 needed, so my estimate is all
  99s around season 9. That is arithmetic from the controlled cohort (×2 with 34 gave season 10 at 56.5 points), not a result.
- **Football-only has little slack:** 23 of 30 sustained starters finish in season 15 itself.

## Exclusions

| Group | Count | Handling |
| --- | --- | --- |
| Apex seen | 630 | |
| First seen above level 1 (generated veterans, arrivals) | 358 | Excluded: career start not observed |
| Entered after season 5 | 97 | Excluded: fewer than 15 seasons observable |
| **Entrants** | **175** | 66 football-only, 57 mixed, 52 maximum |
| Entrants who are not sustained starters | 79 | Shown in the all-entrant table |
| **Sustained starters** | **96** | Primary result |

Why the 79 are not sustained starters (main reason for their non-starter seasons):

| Schedule | Benched or part-time | Out of the league | Mostly injured | Unsigned |
| --- | --- | --- | --- | --- |
| Football only (36) | 34 | 2 | 0 | 0 |
| Mixed (27) | 25 | 2 | 0 | 0 |
| Maximum (16) | 10 | 6 | 0 | 0 |

- **Benching, not injury, is what removes Apex from the cohort.** A new Apex is the weakest player on his club. Most of the 79
  were close: 33 had 11 starter seasons and 23 had 10.
- **Injuries barely register:** an entrant spends 0.02 seasons of 15 mostly injured, and no career fell out for that reason.
- **Nine were out of the league** at the end of season 15 (released and not re-signed). None had qualified first, so none sits
  in the sustained-starter denominator.
- **The 22 failures among entrants still in the league** were 1 to 81 points short of 1,188; the median is 27.

### Sensitivity to the "12 of 15" line

| Starter seasons required | Football only | Mixed | Maximum |
| --- | --- | --- | --- |
| At least 10 | 83.6% (46 of 55) | 96.2% (50 of 52) | 100% (45 of 45) |
| **At least 12 (the rule)** | **100% (30 of 30)** | **100% (30 of 30)** | **100% (36 of 36)** |
| At least 14 | 100% (2 of 2) | 100% (4 of 4) | 100% (2 of 2) |

Hardly anyone starts 14 or 15 seasons, because nearly every Apex is benched at first. A football-only Apex with only 10 or 11
starter seasons often misses.

## Participation

| | Football only | Mixed | Maximum |
| --- | --- | --- | --- |
| Sustained starters: football starts a season | 8.2 | 8.3 | 8.2 |
| Sustained starters: Clashes a season | 0 | 3.7 | 8.4 |
| Sustained starters: starter seasons of 15 | 12.4 | 12.6 | 12.4 |
| Sustained starters: median season at level 50 | 10 | 8 | 7 |
| All entrants: starter seasons of 15 | 10.8 | 11.3 | 10.6 |
| All entrants: clubs played for | 1.36 | 1.39 | 1.25 |

## Matched comparison with 34 offseason points

Same eight seeds, same harness. The 34-point run has no end-of-season records, so pairs are compared on the looser
start-of-season-16 reading.

- **68 of the 175 entrants are the same individuals in both runs.** All 68 entered in the same season in both.
- **Why only 68:** the two settings share a seed, so the leagues are identical until the first training award differs in
  season 1. From then on results, standings, draft order and every later random draw differ, and later rookie classes are
  different individuals. The matched 68 are the first rookie class.
- **Even matched individuals live different careers:** only 34 of the 68 joined the same club in both runs.

| Schedule | Matched | All 99s under both | Only under 42 | Only under 34 | Under neither |
| --- | --- | --- | --- | --- | --- |
| Football only | 31 | 0 | 29 | 0 | 2 |
| Mixed | 16 | 5 | 11 | 0 | 0 |
| Maximum | 21 | 17 | 2 | 1 | 1 |

- **Participation rises with the setting.** The same football-only individuals averaged 11.0 starter seasons under 42 and 9.0
  under 34; mixed 11.6 against 9.9; maximum 10.7 against 10.9. A faster-developing Apex earns his place sooner.
- **So eligibility is not independent of the setting.** 16 of the 31 matched football-only individuals are sustained starters
  under 42 and 11 under 34. The primary figure measures the rule as it would play, including that effect.
- **Determinism:** seed 31 at 42 points gives the same benchmark hash here as in the earlier four-seed run.

## Recommendation

**Adopt activity training ×2 with 42 total offseason points for Apex, subject to two things you may want first.**

1. **It meets the goal as you defined it,** on all three schedules, with nobody finishing before season 12 on AI clubs.
2. **Unmeasured: a human owner at maximum participation,** estimated at about season 9. If that is too fast, the options are a
   lower multiplier with a larger offseason award (the offseason award is schedule-independent; the multiplier is what
   separates the schedules), or accepting it as the reward for playing an Apex in everything. I can measure the human calendar
   in the controlled cohort for 42 and for a ×1.5 alternative before you decide.
3. **Decide the Apex contract ask with it (decision 8).** Under this setting most Apex become all-99; one who is cheap to hold
   matters more.
4. **Apex accumulation (decision 10) should be reviewed after adoption,** as noted on the decision sheet.

If adopted it lands as its own simulation commit: an Apex branch in the award and offseason code, the §5 and §6 wording, new
tests, the full regression, identity and replay checks, and this validation rerun on that commit at the normal 1% Apex rate
where sample size allows.

## Limits

- The Apex chance was 10% instead of 1% in seasons 1–5 to produce enough careers; those leagues are stronger than normal.
- Clash schedules were imposed on lineups; forcing an undeveloped Apex into Clashes weakens his club's Clash results.
- All clubs are run by the AI. No human owner is represented.
- 30 to 36 sustained starters per schedule.

Evidence: `apex-validation-x2-off42-8seeds.json`. Tools: `tools/task8-m6-apex-validation-probe.mjs`,
`tools/task8-m6-apex-validation-analyze2.mjs`.
