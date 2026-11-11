# M6 mastery: exposure, causes and pacing (2026-11-10)

**Status: findings and options. No rule, threshold or credit was changed.** Simulation f716b02, read-only probes in a
measurement copy (`tools/task8-m6-mastery-probe.mjs`, `tools/task8-m6-career-probe.mjs`).

## What was measured

| Run | Size | Evidence |
| --- | --- | --- |
| Exposure per ability | 3 franchise seeds × 6 seasons: 1,395 football games, 2,915 Clash reward settlements | `mastery-exposure.json`, `mastery-football-by-family.json`, `mastery-clash-by-ability.json` |
| Individual careers | 4 seeds × 20 seasons: 5,985 games, 12,558 Clash settlements, 6,936 individuals | `career-analysis.json` |

## The four possible causes, separated

| Cause | Football | Beast Clash |
| --- | --- | --- |
| **Recording** | Sound where checked: on the individuals spot-checked, the credits on the monster equal the engine's execution count | Same counter and settlement path; no mismatch found |
| **Selection** | Not an issue: every starter is on the field | **The main cause of zero use.** 27 of the 72 Clash abilities were never in a lineup |
| **Triggering** | Six ordinary abilities fire about once in fifty games or never | Five abilities were in lineups and never fired |
| **Pacing** | **The main issue.** Execution rates span 0 to 18 a game, so one shared threshold cannot fit | About one execution a battle for most abilities |

## Football

**Why some reach Mastered in the first season.** One credit per valid execution, with no limit on how many executions a game can
hold. Abilities that act before every snap or on most plays earn several credits a game:

| Ability (family) | Credits per start | Games to Mastered (60) |
| --- | --- | --- |
| Surefoot Canopy (leafhorn) | 17.9 | 4 |
| Deep Roots (rootram) | 6.9 | 9 |
| Static Field (stormlynx) | 6.1 | 10 |
| Frost Nip, Stone Charge, Phase Release, Scorch Mark, Anchor Plate | 5.1 to 5.6 | 11 to 12 |
| Divided Guard, Pressure Drain | 4.2 to 4.4 | 14 |

This matches the handoff's 29 first-season Mastered monsters. It is the approved rule working as written, not a counting error:
Surefoot Canopy protects one teammate before each defensive snap and records one execution each time.

**Why some never get there.** Among the 60 ordinary families with at least 30 starts:

| Seasons to Mastered for an every-week starter (10 games) | Families |
| --- | --- |
| Under 1 | 2 |
| 1 to 3 | 13 |
| **3 to 6 (the target)** | **12** |
| 6 to 12 | 14 |
| Over 12 | 18 |
| Never used | 1 (Foresight) |

- **Rare triggers:** Ball Clamp, Hoard Flight, Crosswind Rescue, Air Brake and Night Watch each fire about once in fifty games.
- **Passive abilities** (Heat Haze, Breakwater, Iron Lungs, Dragon Call, Tailwind Huddle) earn exactly one credit a game under
  the approved cap: 60 games, about six seasons.

**Foresight never fires (0 executions in 563 starts).** Under N9d its candidate is a linebacker "within 3 yards of the line" in the
defence's pre-choice look. Linebackers stand 3.5 to 5 yards deep in every standard formation; only mug and goal-line looks
(`pressure_mug`, `goal_line`) qualify, and the pre-choice look is the first play of the defence's plan. The rule is implemented as
approved; the condition is almost never true. **Decision needed** (options below).

### Sustained-use cohorts (the 3–6-season target)

Cohort: ordinary individuals from their first season with at least 7 starts and no earlier credits, followed while they keep
starting. A run that ends first (benched, released, retired, or the window closes) is a nonattainer and stays in the denominator.

| Threshold set | Individuals | Mastered before season 3 | **In seasons 3–6** | After season 6 | Nonattainers | First season |
| --- | --- | --- | --- | --- | --- | --- |
| 0/10/30/60 (current) | 2,859 | 409 | **475** | 221 | 1,754 | 112 |
| 0/15/45/90 | 2,859 | 244 | **443** | 190 | 1,982 | 33 |
| 0/20/60/120 | 2,859 | 134 | **437** | 142 | 2,146 | 30 |

By family (60 families with at least five such individuals), the median season of Mastered:

| Threshold set | Before 3 | **3 to 6** | After 6 | Median never reached |
| --- | --- | --- | --- | --- |
| 0/10/30/60 | 8 | **10** | 6 | 36 |
| 0/15/45/90 | 3 | **10** | 5 | 42 |
| 0/20/60/120 | 1 | **10** | 1 | 48 |

**The 3–6-season target is not met, and the authorized threshold sets cannot meet it.** Raising the threshold removes fast
outliers (8 families to 1) but pushes more families out of reach (36 to 48). Ten families sit in the band under every set.

### Why no shared number works

Projected from the per-game execution counts (60 ordinary families, 9.4 starts a season):

| Threshold | Credit limit per game | Under 3 seasons | **3 to 6** | 6 to 12 | Over 12 or never |
| --- | --- | --- | --- | --- | --- |
| 60 | none (current) | 15 | **12** | 14 | 19 |
| 60 | 3 | 12 | **13** | 16 | 19 |
| 60 | 2 | 0 | **20** | 20 | 20 |
| 60 | 1 | 0 | **0** | 35 | 25 |
| 90 | 3 | 0 | **18** | 16 | 26 |
| 120 | 3 | 0 | **12** | 13 | 35 |

The best shared setting found (threshold 60, at most 2 credits a game) puts 20 of 60 families in the band and removes every
first-season case, but a per-game limit on active executions is a new rule.

## Beast Clash

**Zero recorded use is selection.** An AI club's opening-Clash lineup is its automatic best three (highest overall, a Tank first),
chosen again every week, so the same few monsters fight all season.

- Of 4,714 ordinary ability holders in the four 20-season runs, **778 (17%) were ever in a Clash lineup.**
- Of 2,136 Basics, 2 were.
- 27 Clash abilities never appeared in 2,915 settlements: 18 common-family, 4 uncommon, 1 rare and 4 legendary. The common
  families' owners are rarely a club's three strongest; four legendaries were not on an AI roster in those runs.

**Triggering, by design.** Five abilities were in lineups and never fired: Fresh Start (needs a teammate's cooldown running),
Deep Winter (needs an enemy with a harmful status), Unbroken Charge (needs to lose a turn to Stunned), Clear Light (needs an
ally with a removable status), Mind Game (needs a complete miss). AI-against-AI battles rarely create those conditions.

**Pacing for regular fighters.** Individuals with at least six lineups a season (477 of them) average 9.8 lineups a season and
0.96 executions a lineup, about nine credits a season:

| Threshold set | Mastered before season 3 | In seasons 3–6 | After season 6 | Nonattainers |
| --- | --- | --- | --- | --- |
| 0/10/30/60 | 0 | 74 | 49 | 354 |
| 0/15/45/90 | 0 | 43 | 37 | 397 |
| 0/20/60/120 | 0 | 12 | 43 | 422 |

At the current thresholds a regular Clash fighter needs six to seven seasons; the higher sets make Clash mastery slower still.

## Is existing authorized tuning sufficient?

**No.** The only authorized lever is the shared threshold set. For football it trades fast outliers for more nonattainers; for
Clash every alternative is slower than the current set. I recommend **keeping 0/10/30/60** and deciding the points below.

## Decisions for the owner (none implemented)

1. **Football pacing.** Options: (a) accept the spread and report fast and slow abilities as outliers; (b) a shared limit of 2
   active credits a game (20 of 60 families in the band, no first-season Mastered); (c) per-ability thresholds, which the
   specification currently forbids. My recommendation is (b) if you want the target to mean something for most abilities,
   otherwise (a) with the target restated as "typical", because (c) is 72 numbers to maintain.
2. **Foresight.** Options: (a) keep the rule and accept that it almost never fires; (b) measure "within 3 yards" from the
   look the defence is most likely to show (its most-called formation) instead of the first play of its plan; (c) widen the
   range to 5 yards, which every standard formation satisfies. (b) and (c) change an approved N9d condition.
3. **Clash selection.** Options: (a) accept that only a club's best three build Clash mastery; (b) have AI clubs rotate their
   opening lineup. (b) changes AI behaviour and battle outcomes. For the player this matters less: Tuesday encounters use the
   lineup the player picks.
4. **Rare triggers** (five football, five Clash). Report as outliers, as the gate allows, or review each trigger.

## Limits

- AI-club play only; a human player's choices (Tuesday lineups, play calling) are not represented.
- "Start" means being in a finished game's lineup, including package slots.
- The limit-per-game table is a projection from measured per-game counts, not a simulation of a changed rule.
