# Gridiron Beast — Beast Dex

**72 families · 102 forms · 144 mode abilities**

Owner-approved attribute profiles and rarity amendments. This is a design dataset and browsable GitHub reference; it does not modify the running game.

## Approved sprite generator upgrade

[Claude generator brief: 30 structures, five poses, 60 feature options](SPRITE_GENERATOR_BRIEF.md). Finish the initial Basic batch before upgrading; review silhouettes and a representative sample before the full art revision.

## Approved Basic expansion

[Claude creation brief: 120 Basic families](BASIC_CREATION_BRIEF.md) · [Later progression decisions](PROGRESSION_DECISIONS.md)

Current authored roster: 72 families and 102 forms. Approved expansion target: **192 families and 222 forms**. The 120 new Basic designs and art have not been created yet.

## Browse by position

| Position | Families | Forms |
| --- | ---: | ---: |
| [QB](positions/QB.md) | 7 | 7 |
| [RB](positions/RB.md) | 7 | 13 |
| [WR](positions/WR.md) | 8 | 14 |
| [TE](positions/TE.md) | 7 | 8 |
| [OL](positions/OL.md) | 7 | 11 |
| [DL](positions/DL.md) | 7 | 8 |
| [LB](positions/LB.md) | 7 | 10 |
| [CB](positions/CB.md) | 8 | 13 |
| [S](positions/S.md) | 7 | 9 |
| [K](positions/K.md) | 7 | 9 |

## Rules and readiness

[Approved rules](APPROVED_RULES.md) · [Validation report](VALIDATION.md) · [Remaining specifications](UNRESOLVED.md) · [Data format](DATA_FORMAT.md)

Potential ranges describe individual ceilings, not starting strength. All ranges are inclusive. Rarity governs primary potential bands with explicit below-band weaknesses; supporting attributes can be lower.

The structured files in `data/` are the profile source for the generated family pages. Use the consolidated Task 8 specification for shared runtime rules. Ability contracts imported from workbook v18 retain their provenance and require the later overrides documented here.

This is not yet the no-questions Claude handoff. Do not silently resolve conflicts or treat this dataset as deployed gameplay.

To regenerate pages and repeat the checks, run `python3 docs/beast-dex/tools/render_and_validate.py` from the repository root. No third-party packages are needed.
