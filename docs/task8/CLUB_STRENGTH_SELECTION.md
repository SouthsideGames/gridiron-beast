# Club strength under the Dex generator: candidate selection (N7f)

Approved direction: owner ruling N7f, 2026-11-07 12:44 ([RULINGS_2026-11-07d.md](RULINGS_2026-11-07d.md)). This document records the
mechanism and the selection criteria for each channel. Code: `src/franchise/t8/selection.js`.

## Mechanism (one generation event)

1. **Family.** Chosen first under the approved channel shares (B17, `generation.js`). Selection happens only *within* that family's form, so the shares are exact.
2. **Apex.** One independent roll at 1% for an eligible (non-legendary) form.
   - If it hits, exactly one Apex individual is generated and returned. Nothing selects among Apex candidates.
   - No quality or affordability step can discard it. If the intended club cannot afford it, it goes to the market or pool rather than being regenerated.
3. **Ordinary candidates.** Otherwise, **9** ordinary candidates are rolled with the approved generator, each uniform and independent inside the form's ranges. The candidate kept is the one whose **selection metric** percentile is closest to the **target percentile**. Ties go to the earlier-drawn candidate. Ratings and ceilings are never altered.
4. **Prior career.** For veterans, the prior-career simulation (B7) runs only *after* selection, except in the founding-roster
   channel (next item).
5. **Founding rosters: post-history selection** (owner ruling N8b D1, option 2, 2026-11-08). The monster's id, age and prior
   seasons are fixed first. The nine ordinary candidates are drawn as in item 3; then each candidate lives that prior career, and
   the kept candidate is the one whose **post-history current OVR** percentile is closest to the target, read from a reference of
   the same form at the same career band (age he turned pro, prior seasons, participation profile). So a 50th-percentile
   founding starter is a typical starter at his age. A first-year (no prior seasons) founding player is selected as in item 3.
   The Apex roll (item 2) comes first and is unchanged. Ratings and ceilings are never altered; the kept candidate's career is
   simulated, not adjusted. The participation profile of the prior career follows the **target** percentile (starter from 60%,
   rotation from 30%, else depth), because the post-history standing is not known before the career (in this channel an Apex
   result's career uses it too); elsewhere it follows the selected level-1 percentile as before (0.5 for an Apex). Scope: the per-position starters and depth of every founding roster (owner and AI);
   the founding stars, cornerstones, gym legendaries and the rival's signature monster keep their own channels (item 4).

## Temper neutrality

Both metrics are computed from level-1 ratings or ceilings, which Temper never affects (Temper changes only training efficiency).
Selection therefore cannot favour any Temper, and the kept individuals' Tempers stay uniform. This is tested.

**Post-history selection (item 5).** A real post-history rating *does* depend on Temper, because Temper changes how much training
buys. Selecting on it favoured Tempers that suit the position (measured on Emberfox, RB, 1,200 events per target: kept-Temper
chi-square 370 at a 90% target and 125 at 10%, against a 99.9% critical value of 51). To keep the approved Temper neutrality, each
candidate's selection value is his post-history OVR **evaluated under a neutral Temper**: his own level-1 ratings and ceilings,
his own seeded career draws, every training cost at efficiency 1. The reference sample is evaluated the same way. The kept
candidate then lives that same seeded career with his own Temper, which is his career. Measured after the change: chi-square
20, 22 and 25 at 10%, 50% and 90% targets (df 24). Tested.

## Metrics

| Metric | Value | Used for |
| --- | --- | --- |
| **Current** | Positional OVR of the level-1 ratings | Starters, depth, veterans and battle companions: "how good he is now" |
| **Potential** | Positional OVR of the individual ceiling map | Prospect classifications: "how good he can become" |

**Reference distributions.** For each form and metric, a percentile is read from a cached reference sample of 400 ordinary
individuals of that form. The sample is seeded per form, so it is deterministic and independent of game state.

**Post-history reference (founding rosters).** Per form, career start age (21 or 22) and participation profile, 400 ordinary
individuals live seven prior seasons one at a time (neutral-Temper evaluation); the sorted sample after season *s* is the reference
for *s* prior seasons. Seeded per band. Computing these at run time takes minutes, so the bands for every stage-0 non-legendary
form are precomputed by `tools/t8-history-reference.mjs` into `src/data/t8-history-reference.generated.js` (a pure cache: a test
recomputes sample bands and compares them exactly; a band whose form data changed is ignored and recomputed in the game).

## Target percentile

t = Φ((quality − 56) / 5.3), clamped to 5–95%.

- **Quality** is today's quality value at the call site; the mapping is the initial calibration.
- **56** is the base club quality.
- **5.3** is today's measured standard deviation of starters' OVR (285 starters: mean 57.9, 10th percentile 52, 90th percentile 66).

## Channel criteria

| Channel | Metric | Target |
| --- | --- | --- |
| Founding rosters: owner and AI clubs, each position's starter and depth | Current, **after the prior career** (N8b D1; item 5) | Club's initial quality: base by difficulty, gym tier, the club's fixed natural level. First player at a position +4, others −2 |
| AI club stars, cornerstone offers | Current | Quality 66–70, so 95th percentile |
| Gym legendaries, the rival's signature monster | Current | The club's initial star target (95th percentile). One copy only |
| Free-agency veteran arrivals | Current | The club's **fixed natural level** (no seasonal growth). The affordable candidate nearest the target is kept; if none is affordable, the cheapest candidate |
| Offseason market veterans | Current | Today's quality 50–59, so 23–72nd percentile |
| Need scouting (a position the club needs now) | Current | Today's quality 50–59 |
| Draft classes: gems, solid, projects | **Potential** | Gems 62–67 (87–95th), solid 55–60 (43–77th), projects 47–54 (5–35th), plus the Task 6 class offset (+0.5 per season, cap +10; **open question**, see IMPLEMENTATION_LOG) |
| Regional scouting recruits (young prospects) | **Potential** | Today's quality 52–63 plus skill and rarity bonuses (23–91st) |
| Tuesday encounter prospect | **Potential** | Its scouting quality |
| Tuesday encounter companions | Current | Matched to the club's battle strength as today |
| Legend Track recruitment | Current | Quality 64, so 93rd percentile |

## What is retired with this (N7f: no automatic seasonal boosts)

- **Seasonal growth in club quality:** gym growth per season, ordinary growth of 0.5 per season, and the title floor that lifted the whole league. These no longer feed generation. Arrivals use a club's fixed natural level.
- **Regenerating or boosting clubs every season.** Club strength changes only through its own roster: development, ageing, drafting, trades, free agency and training, guided by its identity and competitive cycle.
- **Difficulty** sets initial strength only (Rookie −4 → ordinary clubs start lower; gyms remain the stronger strategic tests).
