# Monster catalogue, types, Tempers and abilities

**Build:** `v43.50.0-sideline` at `58c33ee`.

## 1. What the catalogue is, verified in code

**Families and species.**
- **72 ability-carrying families**, 7 to 8 per position. Each has a football ability and a Clash ability (`dexAbilities`).
- **120 Basic species** with no ability, 12 per position.
- 192 species records in all (`src/data/monsters.js` `SPECIES_BY_ID`).

**Rarities of the 72 families:**

| Rarity | Families |
|---|---|
| Common | 26 |
| Uncommon | 21 |
| Rare | 13 |
| Legendary | 12 |

Every position has at least one legendary; QB and WR have two each.

**Elements:** 12, with exactly 16 species each. The catalogue is evenly spread.

**Natures no longer exist in play.**
- The 25-entry `NATURES` table is still exported from `src/data/monsters.js`, but **no generated monster carries a nature** (checked on a generated 28-monster roster).
- Task 8 replaced Natures with **Tempers** (`src/data/temper.js`): 25 Tempers, each training one attribute at double efficiency and one at half, with three neutral.
- A Temper never changes ratings, ceilings or behaviour. Because of that, the brief's "certain natures substantially more valuable" question becomes a question about Tempers.

**Task 8 status.**
- The catalogue expansion is **implemented** and has been the live game since 2026-11-11.
- Its M6 benchmarks were never formally closed (`docs/task8/M6_STATUS.md`).
- The GDD status table still says "NEXT" (`TECHNICAL_ISSUES.md` T-3).
- The catalogue is complete enough for franchise balance testing. Nothing in this audit is provisional for catalogue reasons.

## 2. Tempers

**How a Temper fits a position** (`raw/temper-position-fit.json`): of the 25 Tempers, how many favour one of the position's overall attributes, and how many penalise one.

| Position | Favour an OVR attribute | Penalise an OVR attribute |
|---|---|---|
| QB, WR, DL, LB, CB, S | 10 | 10 |
| RB, TE | 12 | 12 |
| OL | 8 | 8 |
| K | 2 | 2 |

- **The Tempers are symmetric.** Every position has as many helpful Tempers as harmful ones, so no position is advantaged by the draw.
- **Kickers are effectively Temper-less.** Kicking is never favoured, so a kicker's Temper only touches awareness.
- **What makes a Temper valuable is the attribute it favours**, so from the attribute sweep:
  - **Swift** (speed) and **Driven** (speed) are the most valuable Tempers for WR, RB, CB and S, because speed is the strongest attribute (`MONSTER_ATTRIBUTE_BALANCE.md`).
  - **Explosive** trains agility but *halves speed training*, and **Powerful** trains strength but halves speed training. These two are the costliest Tempers for skill positions.
- The draw is uniform (`drawTemper`), not position-aware. This audit does not judge whether that is the intended design.

## 3. Elemental types

- **Clash** (`BEAST_CLASH_BALANCE.md` §6):
  - the type chart gives the favoured type 58.4% and the unfavoured 41.6%, exactly as designed;
  - element win rates in mixed teams run from Fire 54.9% to Wind 44.9%, mostly because of which abilities each element holds.
- **Football:** types move completion by 1.8 points and deep completion by 8.2 points (corrected calibration, `GAMEPLAY_BALANCE.md` §2). A full per-type football matrix (`tools/type-balance.mjs`) was not run in the time available.

## 4. Football abilities

**Census:** `tools/task10-ability-census.mjs`, 200 whole games between generated clubs with every monster carrying his own ability (`raw/ability-census-200.json`).

**Coverage.**
- 60 of the 72 families appeared in the games.
- **The 12 that never appeared are all legendaries**, because generated clubs do not field them.
- Legendary football abilities are therefore measured only inside franchise leagues, and per-ability strength was not re-measured this time. `tools/task10-ability-strength.mjs` has the slot-only strip defect (`TECHNICAL_ISSUES.md` T-2) and needs the fix first.

**Abilities that never execute** (at least 10 appearances):

| Ability (family) | Appearances | Executions |
|---|---|---|
| **Foresight** (cerebrix) | 98 | **0** |
| **Air Brake** (skywarden) | 88 | **0** |
| **Crosswind Rescue** (windlynx) | 37 | **0** |

- Foresight was already at 0 of 563 at Task 8 M6. The owner adopted a fix for it (`docs/task10/MASTER_BALANCE_MATRIX.md` A-14), and it **still never executes** on this build.
- Crosswind Rescue was already at or near 0 in both Task 10 censuses.
- **Air Brake is new to this list.**

**Nearly idle (≥95% of appearances with no execution):**

| Ability (family) | Appearances | No execution |
|---|---|---|
| Hoard Flight (sablewing) | 70 | 98.6% |
| Night Watch (nightowl) | 156 | 96.8% |
| Ball Clamp (ironjaw) | 181 | 95.0% |

**Most active:** Surefoot Canopy (leafhorn) at 23.6 executions a game is the outlier. The next are Ember Grip (cinderclaw) 6.4, Pressure Drain (reefclaw) 5.9 and Divided Guard (mudcub) 5.5.

**Abilities as a group lower passing efficiency** (completion −4.7 points, deep completion −6.6) but leave points per game nearly unchanged (−0.8).

## 5. Clash abilities

Full detail: `BEAST_CLASH_BALANCE.md`.
- No exploit pair.
- Second Tide is the strongest isolated ability; Falling Star is fixed.
- 12 abilities are idle in 90% or more of battles.
- Foresight, Snowdrift Shelter and Cinder Clamp make their user worse.
- Legendary abilities are the weakest rarity group.

## 6. Legendary monsters and captain partnerships

**Legendaries.**
- In Clash, legendary families win 66% of random 3 v 3 team battles and 79% of the 1 v 1 round robin, through their ratings. Their abilities subtract about 2 points on average.
- They are strong without eliminating competition: a common team still wins 37%.
- In football, legendaries do not appear in generated clubs. Their franchise effect shows through the ageless monsters in `FRANCHISE_SIMULATION.md`.
- **Legendary Plays** (`tools/legendary-balance.mjs`) were not re-run in the time available.

**Captain partnerships** (`src/franchise/partnerships.js`).
- The bonus is +1% to +4% on qualifying plays, reached over a season or more of joint successful plays. The thresholds were rescaled ×14/9 for the 14-game season on 2026-11-23.
- At most +4%, the design cannot create an excessive advantage on its own. It was not measured in play here.

## 7. Rankings within comparable groups

Football per-ability strength could not be re-ranked this time (see §4). The Clash rankings by rarity and position, from the 6,000-battle team study (`raw/clash-teams-6000.json` `D.families`), are:

| Group | Strongest ability effect | Weakest ability effect |
|---|---|---|
| Legendary | Astral Strike +11.3 | Deep Winter −11.6, Eye of the Storm −11.6 |
| Rare | Glacier Wall +10.0 | Wash Away −9.4 |
| Uncommon | Riptide Charge +11.3 | Bank Shot −9.7 |
| Common | Shadow Pounce +8.5 | Snowdrift Shelter −4.5 |
| TE (best position group) | +4.8 mean | — |
| K (worst position group) | −3.9 mean | — |

**Lower-rarity monsters remain useful:** four commons are in the top ten Clash abilities, and rarity mainly buys ratings, as intended.
