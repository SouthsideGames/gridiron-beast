# Validation report

**PASS**

Authored roster: 192 families and 222 forms in 12 types: the original 72 families / 102 forms (including 12 legendary families) and 120 Basic families / 120 Basic forms. 144 mode abilities, all on original families; Basic families have none.

2664 complete start/potential pairs (1440 Basic); 5400 evolution arithmetic checks; 1317 local links.

28445 assertions evaluated; 0 failed.

## What is checked

- Original roster: every family, form and ability record matches the per-record baseline frozen from commit 6e82f13 (the approved 72/102/144 data, including the rarity amendments and the Cindruff Coverage correction).
- Basic batch: exactly one family per type and position (120/120); 120 standalone single-form families; no unique football or Clash ability (explicit nulls) and no ability record linked to a Basic family; all 12 starting and potential ranges per form with valid endpoints, starts at or below potential minima and every Basic potential at or below 59; the approved archetype totals for the batch and for all 192 families; unique IDs and names with no collision with the original roster or legacy save names; one art asset per family that matches its recipe.
- Every local link in the generated pages resolves, and rendering twice from the same data gives identical output.

## Unresolved data conflicts

None.

## Scope

This validates design data, identity links, ranges, art references and reference evolution arithmetic. It does not implement or test the production generator, abilities, balance, save handling, UI or mobile frame rates. Owner art approval is a human review, not an automated claim.

Earlier context: before the Basic batch, this validator reported PASS for the original 72 families / 102 forms / 144 abilities (14,095 assertions at commit 23f3793). That result covered the original roster only.

All approved values are retained. No invalid pair is silently clamped, rerolled or changed.
