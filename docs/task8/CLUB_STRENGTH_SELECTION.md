# Club strength under the Dex generator: candidate selection (N7f)

Approved direction: owner ruling N7f, 2026-11-07 12:44 ([RULINGS_2026-11-07d.md](RULINGS_2026-11-07d.md)). This document records the
mechanism and the selection criteria for each channel. Code: `src/franchise/t8/selection.js`.

## Mechanism (one generation event)

1. **Family.** Chosen first under the approved channel shares (B17, `generation.js`). Selection happens only *within* that family's form, so the shares are exact.
2. **Apex.** One independent roll at 1% for an eligible (non-legendary) form.
   - If it hits, exactly one Apex individual is generated and returned. Nothing selects among Apex candidates.
   - No quality or affordability step can discard it. If the intended club cannot afford it, it goes to the market or pool rather than being regenerated.
3. **Ordinary candidates.** Otherwise, **9** ordinary candidates are rolled with the approved generator, each uniform and independent inside the form's ranges. The candidate kept is the one whose **selection metric** percentile is closest to the **target percentile**. Ties go to the earlier-drawn candidate. Ratings and ceilings are never altered.
4. **Prior career.** For veterans, the prior-career simulation (B7) runs only *after* selection.

## Temper neutrality

Both metrics are computed from level-1 ratings or ceilings, which Temper never affects (Temper changes only training efficiency).
Selection therefore cannot favour any Temper, and the kept individuals' Tempers stay uniform. This is tested.

## Metrics

| Metric | Value | Used for |
| --- | --- | --- |
| **Current** | Positional OVR of the level-1 ratings | Starters, depth, veterans and battle companions: "how good he is now" |
| **Potential** | Positional OVR of the individual ceiling map | Prospect classifications: "how good he can become" |

**Reference distributions.** For each form and metric, a percentile is read from a cached reference sample of 400 ordinary
individuals of that form. The sample is seeded per form, so it is deterministic and independent of game state.

## Target percentile

t = Φ((quality − 56) / 5.3), clamped to 5–95%.

- **Quality** is today's quality value at the call site; the mapping is the initial calibration.
- **56** is the base club quality.
- **5.3** is today's measured standard deviation of starters' OVR (285 starters: mean 57.9, 10th percentile 52, 90th percentile 66).

## Channel criteria

| Channel | Metric | Target |
| --- | --- | --- |
| Founding rosters: owner and AI clubs, each position's starter and depth | Current | Club's initial quality: base by difficulty, gym tier, the club's fixed natural level. First player at a position +4, others −2 |
| AI club stars, cornerstone offers | Current | Quality 66–70, so 95th percentile |
| Gym legendaries, the rival's signature monster | Current | The club's initial star target (95th percentile). One copy only |
| Free-agency veteran arrivals | Current | The club's **fixed natural level** (no seasonal growth). The affordable candidate nearest the target is kept; if none is affordable, the cheapest candidate |
| Offseason market veterans | Current | Today's quality 50–59, so 23–72nd percentile |
| Need scouting (a position the club needs now) | Current | Today's quality 50–59 |
| Draft classes: gems, solid, projects | **Potential** | Gems 62–67 (87–95th), solid 55–60 (43–77th), projects 47–54 (5–35th), plus the class offset |
| Regional scouting recruits (young prospects) | **Potential** | Today's quality 52–63 plus skill and rarity bonuses (23–91st) |
| Tuesday encounter prospect | **Potential** | Its scouting quality |
| Tuesday encounter companions | Current | Matched to the club's battle strength as today |
| Legend Track recruitment | Current | Quality 64, so 93rd percentile |

## What is retired with this (N7f: no automatic seasonal boosts)

- **Seasonal growth in club quality:** gym growth per season, ordinary growth of 0.5 per season, and the title floor that lifted the whole league. These no longer feed generation. Arrivals use a club's fixed natural level.
- **Regenerating or boosting clubs every season.** Club strength changes only through its own roster: development, ageing, drafting, trades, free agency and training, guided by its identity and competitive cycle.
- **Difficulty** sets initial strength only (Rookie −4 → ordinary clubs start lower; gyms remain the stronger strategic tests).
