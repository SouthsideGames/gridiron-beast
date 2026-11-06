# Data format

- `data/families.json`: 72 stable source family IDs, approved names, type, fixed position, current rarity, source rarity, Clash archetype, ability links, descriptive/appearance source data.
- `data/forms.json`: 102 form IDs (`family:stage`), form names, source evolution levels, and complete 12-attribute starting/potential ranges. `referenceLevel: 1` is a reference profile, not a statement that an evolved monster must evolve at level 1. All arrays are inclusive `[minimum, maximum]` integers. `belowBandWeaknesses` records primary attributes allowed below rarity minimum. Potential origin records the approved earlier-form endpoint reductions and explicit table overrides.
- `data/abilities.json`: 144 mode abilities with original registry IDs, triggers, mechanics, and detailed workbook rows. These source contracts are subject to later shared-rule overrides; no claim of production implementation.
- `data/rules.json`: approved profile/generation/evolution/rarity rules, positional primary attributes, Apex/Basic exceptions and explicit unresolved matters.
- `manifest.json`: SHA-256 hashes of the four data files. A final handoff must also pin the reviewed Git commit; this package is not yet that final handoff.
- `tools/render_and_validate.py`: Python standard-library renderer/validator. Family pages and positional indexes derive from these JSON files. Do not edit generated Markdown rating tables independently.

Names and stable IDs differ deliberately in places; for example `emberfox` is Flaroo's family ID, not permission to restore its legacy name. Form IDs are unique even when a standalone family and form have the same display name. Preserve case-sensitive position abbreviations. Missing values must never be interpreted as zero.

This package is not wired into gameplay. Adapters for the actual target engine are Task 8 implementation work. Do not overwrite current monster generation, the live game, saves, contracts or release artifacts merely because these design files exist.
