# Approved rules and later amendments

This file records owner approvals after the November 5 consolidated Task 8 document. It overrides conflicting earlier values, including the document's old ordinary ceiling allowance and its specific Ripplet Speed value. This is a design record, not evidence of deployment.

## Attribute ratings and rarity

| Attribute rating | Label |
| --- | --- |
| 1–39 | Weak |
| 40–59 | Limited |
| 60–74 | Capable |
| 75–84 | Strong |
| 85–94 | Elite |
| 95–99 | Exceptional |

| Rarity | Expected primary-attribute potential | Firm primary-attribute maximum |
| --- | --- | --- |
| Basic | 1–59 | 59 |
| Common | 40–74 | 74 |
| Uncommon | 60–84 | 84 |
| Rare | 75–94 | 94 |
| Legendary | 85–99 | 99 |

These bands govern potential, not starting ratings. Explicit approved weaknesses can fall below the minimum. Supporting attributes may be lower, as recorded per position. There is no equal-total-attribute budget. Rarity does not change on evolution. Ordinary nonlegendary/non-Apex ratings cannot exceed 98; their rarity and authored profile maxima are normally lower. Legendary profiles have selected 99 ceilings, not automatic 99 in every attribute. Apex is an individual designation, not a rarity, and has 99 potential in all 12 attributes.

## Approved rarity amendments

| Family | Previous rarity | Approved rarity |
| --- | --- | --- |
| Lumen | Uncommon | Common |
| Duskyre | Uncommon | Rare |
| Ripplet | Uncommon | Rare |
| Tideram | Rare | Uncommon |
| Terrabull | Rare | Uncommon |
| Glaciram | Uncommon | Common |
| Galyx | Uncommon | Rare |

Result: 26 Common, 21 Uncommon, 13 Rare, 12 Legendary; 72 families. Basic has no authored families yet. Existing abilities, positions and Clash archetypes remain unchanged by these amendments.

Ripplet's ordinary Catching maximum remains 78. Its approved ordinary Speed maximum is now 94, superseding 95. Lumen's starting Accuracy is 52–62 and Awareness 50–60; Cerebrix's starting Awareness is 58–68. All other table values are in `data/forms.json`.

## Generation and evolution

Starting ratings and potential use independent inclusive uniform integer rolls in their approved ranges. No forced total-potential budget. A starting rating cannot exceed individual potential. Preserve the individual through saves, reloads, trades, free agency and evolution. Do not substitute legacy position-template/type/Nature bonuses for these approved ranges or add them on top without an explicit rule.

Preserve the original relative potential placement per attribute across evolution; never reroll or recalculate the placement from a rounded intermediate ceiling. Evolved ceilings round to nearest integer with exact halves up. A fixed potential range remains fixed; a future transition from a fixed range to a variable one needs an explicit rule rather than dividing by zero.

**Current-rating evolution formula:**

`newPermanentCurrent = min(newPotential, roundHalfUp(oldPermanentCurrent * newPotential / oldPotential))`

Example: 10/20 becomes 20/40, preserving 50% of the individual ceiling. Do not subtract a starting reference. This supersedes the previously discussed starting-reference-relative rule and the unchanged-current alternative. Exclude temporary statuses, environmental fields, exhaustion and other temporary gameplay modifiers. Preserve identity, level, Temper and mastery. The aging ledger and remaining automatic level growth must be reconciled without healing age-related decline or double-counting growth; those are explicit remaining contracts, not an inferred permission.

Level-1 reference rows for evolved forms describe their generated reference profile. They are not a second evolution bonus and are not rerolled on evolution. Evolution ceiling changes and the current-rating formula govern an existing individual.

## Temper, Apex and Basic

Temper changes training efficiency, not starting attributes, individual ceilings, ability strength or AI personality. The approved favored/neutral/unfavored efficiencies are 2 / 1 / 0.5. Kicking receives no Temper modifier. Ordinary Tempers are randomly selected without type/family weighting. Preserve the approved Temper list and neutral entries from the consolidated specification.

Apex: 1% initial generation chance for eligible nonlegendary individuals; level-1 starts 10–15 in every attribute, all potential 99, neutral Temper, ageless. No instant maxing and no training-efficiency multiplier. Apex is separate from Basic/Common/Uncommon/Rare/Legendary. Discovery, presentation and contracts retain the shared specification requirements and unresolved details.

Basic is a rarity below Common, within the same 12 elemental types. Basic families currently have no football or Clash abilities; selected families may gain abilities in future. Individual variation, fixed positions and Temper remain. Design Basic after the original 72. Whether shared type moves and archetype perks are included in “no abilities” remains unresolved. Do not generate new Basic families or alter their rules to fill roster shortages without the approved later design.

## Ability source precedence

`data/abilities.json` preserves the 144 source ability entries and their detailed source rows from workbook version 18. This imports approved design evidence, not a verified final runtime schema. Historical “core approved” statuses and old audit language remain source metadata. Apply the consolidated specification's later corrections first, including encounter-based Blazing Resolve, engagement/acceleration-based pancake whiffs, bounded HP transfers, movement override priority, clone performance-credit exclusions, and fresh-save break.

Fields are environmental modifiers, not shared statuses. Dragon has no base zone. Actual football/Clash effect lifetime rules, targeting, cooldowns and source-specific exceptions remain governed by the consolidated specification and detailed ability contracts. This data export does not authorize generic substitutes or stronger effects.

Full package readiness still requires the remaining contracts in [UNRESOLVED.md](UNRESOLVED.md). Do not use the source evidence as a reason to restore superseded timing or rounding rules.
