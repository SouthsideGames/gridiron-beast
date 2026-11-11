# M6 career diagnostics — 2026-11-10

Source simulation: `f716b02c41c81211d80e7389dc0cefd4c16ae155`. No simulation settings changed.

## Controlled careers

Reproduce: `node tools/task8-m6-careers.mjs`.

The manifest is written before evaluating outcomes (`career-manifest.json`). All seeds 1–100 and ten positions are retained. Each ordinary individual is matched across three schedules and three training policies (9,000 career runs); a separate 1,000 Apex per schedule is run for mixed and maximum participation (2,000 additional runs). Creation age is 21, level 1. Training, XP, natural growth, evolution, age decline and retirement use production functions. Retirees stay in denominators; median nonattainment is infinity rather than dropped observations.

These are **controlled reward/aging diagnostics**, with neutral grades, guaranteed activity selection, no injury absences, no Basic-encounter XP bonus, no economic constraints and no fabricated mastery. They are not the full played-career acceptance study.

| Cohort / schedule | Median season reaching 50 | Reached 50 by season 8 | All 12 ceilings by season 8 |
| --- | --- | --- | --- |
| Ordinary football only: 9 games/year, each policy | 9 | 0% | 0% |
| Ordinary mixed: 9 games + 4 Clashes/year, each policy | 7 | 99.8% | 0% |
| Ordinary maximum opportunity: 12 games + 33 Clashes/year, each policy | 3 | 100% | 0% |
| Apex mixed, equal investment | 7 | 100% | 0% |
| Apex maximum opportunity, equal investment | 3 | 100% | 0% |

- In the mixed schedule every position has the same median (7). This supports equal **base-reward** progression, not equality of engine-generated performance bonuses or injury exposure.
- No development-record invariant violations were detected across 11,000 runs.
- Ordinary mixed runs retain meaningful headroom: no individual reaches all twelve ceilings by season 8. Over the entire 20-year window, 0.4% do so under evenly distributed investment; none do under positional or AI allocation.
- Under maximum opportunity, 36% eventually hit all ceilings with even investment, versus none with positional/AI investment. This is a sensitivity finding; the approved ordinary ceiling gate concerns mixed participation.
- 996/1,000 ordinary mixed individuals retire during the 20-season observation for each allocation policy. Two fail to reach level 50 before retirement; they remain in the 99.8% denominator. Apex: zero retirements, no age advancement.
- **Apex failure confirmed:** 0/1,000 reach all 99s by season 15 in either schedule. None reach all 99s even by season 20 at current rewards. This agrees with the optimistic resource bound in `README.md`; no authorized training-share candidate closes that upper-bound gap.

Every generated career, initial-record fingerprint, retirement, training, natural growth, decline and final ratings/ceilings is retained in `career-individuals.json` (column schema included). Position and Temper breakdowns are in `career-summary.json`. No favorable training policy was selected to represent all policies.

## Actual mastery observation

A read-only extension of the production franchise benchmark (`tools/task8-m6-franchise-observer.mjs`) records mastery, Apex and Temper without awarding anything. Its first one-season run has **the identical complete final franchise-state hash and identical club-season rows** as the existing M5 seed-1 baseline (`observer-noninterference.json`). Thus the recorder did not change that run's simulation.

In the first real season, 29 nonlegendary monsters reached football Mastered (60 real execution credits), including an individual observed by week 4. One legendary also reached it. These observations warrant review against the 3–6-season ordinary mastery target; they do not assume that every roster member used an ability. There were no Clash Mastered observations that year.

Report-only threshold sensitivity from the same season-end counters: 29 nonlegendary monsters had at least 60 football credits, 6 had at least 90, and 3 had at least 120. These are the final thresholds of the three authorized threshold sets. Raising the threshold alone would still leave some first-season Mastered outliers. **No threshold or execution-credit rule was changed.** The full twenty-season observed run and exposure/rarity breakdown will be reported separately.

## Presentation carryover

The imported `f9e758119d9bd1bce9ef859b2cdb0d2fe6341fed` snapshot has exact tree `e06cdd2c8923fdd6713dbdfbdf67e4cc8c7ef5a3`. Its focused discovery/screen tests pass (10/10 in that commit). Re-running outcome identity here yields **identical 19 scene variants and 12 full games** versus M5 (`m5-identity.json`, `m6-identity.json`). Source comparison finds no football or Clash simulation changes; the franchise function change adds a read-only collection count for achievements. This supports carrying these simulation results over to that screens snapshot. It is not a new full regression, owner visual approval, or phone performance test.

## Completed production observations

The observer's complete twenty-season franchise state and all club-season rows also exactly match the uninstrumented twenty-season run (`observer-20-season-noninterference.json`). The recorder changed no observed game outcome, franchise decision or reward.

- Three independent seeds now completed twenty seasons each: **60 seasons**, zero thrown errors or reported invariant problems, **182 trades**. This does not mean every diagnostic field passed.
- Seed 2 has two **post-offseason** snapshots with no kicker: Eastport Phantoms after year 8 (38 monsters, $354,700 cap room) and Sundown Drakes after year 20 (38 monsters, $348,400 cap room). See `lineup-shortages.json`. Eastport has a kicker in the year-9 end snapshot and plays ordinary non-forfeit-looking scores throughout year 9. Source has a weekly legal-lineup repair path (`leagueInjuryCover`), so these are roster-completion review flags, **not proof of in-season forfeits**. The snapshot invariant counter does not flag this field automatically.
- Across 45 AI-club observations at each checkpoint, average spare cap room rises from $353,407 in year 5 to $401,934 in year 20. Roster sizes and team strengths remain varied. Extra money alone does not establish a broken cap: in-season bidding, extensions and rebuilding need their own pressure review.
- In the observed seed, rostered Apex count is 6, 8, 9, 15, 17 at years 1, 5, 10, 15, 20. No observed Apex is all-99. At year 20, two clubs each hold four. Unregistered regional pools are outside this count; it is neither the full universe population nor a recommended cap on Apex.
- Actual mastery varies sharply by family/category. Among **attainers only**, uncommon football self-enhancement has a two-season median; common football Zone and Aura categories have eight-season medians. These are descriptive exposure-unequal figures, **not** a retirement-inclusive pacing pass. The report includes all individuals and nonattainers by category.
- All 239 observed individuals in the common Clash `Signature action` category have zero recorded Clash use in the retained observations. They cannot be graded as slow learners from this: selection and actual eligible exposure need investigation first. No participation-only credit was added.
- Of 807 observed ordinary level-1/zero-years-pro entrants early enough to allow an eight-season window, 65 were observed at level 50 within eight seasons. This includes reserves, unsigned monsters and missing follow-up, **not a starters cohort**, so it is not the approved 75%-of-starters gate. It highlights why controlled participation alone is insufficient to certify real careers.

Raw observed counters and censored/nonattainer records: `observed-20-season-seed-1.json`, `observed-summary.json`. Broader economy snapshots: `ai-20-season-seeds-2-3.json`, `franchise-expanded-summary.json`.
