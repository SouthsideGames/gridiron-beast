# Gridiron Beast — Beast Dex

**192 families · 222 forms · 12 types · 144 mode abilities**

Original roster: 72 families and 102 forms (26 Common, 21 Uncommon, 13 Rare, 12 Legendary), owner-approved attribute profiles and rarity amendments, 144 mode abilities. Basic creation batch: 120 standalone families and 120 forms, one per type and position, with no unique abilities; pending owner art and content review. These are authored design counts, not counts of generated individual monsters. This is a design dataset and browsable GitHub reference; it does not modify the running game.

## Approved sprite generator upgrade

[Claude generator brief: 30 structures, five poses, 60 feature options](SPRITE_GENERATOR_BRIEF.md) · [Generator status and checkpoints](art/GENERATOR.md). The initial Basic art is kept as the before baseline (commit `6abcf3b`); silhouettes and a representative sample are reviewed before the 120 appearances are revised.

## Basic families

[Basic family index](BASIC_INDEX.md) · [Art review guide](art/REVIEW_GUIDE.md) · [Creation brief](BASIC_CREATION_BRIEF.md) · [Technical audit](BASIC_AUDIT.md) · [Later progression decisions](PROGRESSION_DECISIONS.md)

## Browse by position

| Position | Families | of which Basic | Forms |
| --- | ---: | ---: | ---: |
| [QB](positions/QB.md) | 19 | 12 | 19 |
| [RB](positions/RB.md) | 19 | 12 | 25 |
| [WR](positions/WR.md) | 20 | 12 | 26 |
| [TE](positions/TE.md) | 19 | 12 | 20 |
| [OL](positions/OL.md) | 19 | 12 | 23 |
| [DL](positions/DL.md) | 19 | 12 | 20 |
| [LB](positions/LB.md) | 19 | 12 | 22 |
| [CB](positions/CB.md) | 20 | 12 | 25 |
| [S](positions/S.md) | 19 | 12 | 21 |
| [K](positions/K.md) | 19 | 12 | 21 |

## Rules and readiness

[Approved rules](APPROVED_RULES.md) · [Validation report](VALIDATION.md) · [Remaining specifications](UNRESOLVED.md) · [Data format](DATA_FORMAT.md)

Potential ranges describe individual ceilings, not starting strength. All ranges are inclusive. Rarity governs primary potential bands with explicit below-band weaknesses; supporting attributes can be lower.

The structured files in `data/` are the profile source for the generated family pages. Use the consolidated Task 8 specification for shared runtime rules. Ability contracts imported from workbook v18 retain their provenance and require the later overrides documented here.

This is not yet the no-questions Claude handoff. Do not silently resolve conflicts or treat this dataset as deployed gameplay.

To regenerate pages and repeat the checks, run `python3 docs/beast-dex/tools/render_and_validate.py` from the repository root (this README is generated too). No third-party packages are needed. The Basic records are built from `data/basic-authoring.json`; see [Data format](DATA_FORMAT.md).
