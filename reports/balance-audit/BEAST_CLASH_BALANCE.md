# Beast Clash balance

**Build:** `v43.50.0-sideline` at `58c33ee`.
**Engine:** the Task 8 engine (`src/clash/t8`), the one Franchise Mode plays.

## Method

**Tool.** `tools/task10-clash-strength.mjs` (existing), run unchanged. Mature monsters: quality 70, age 26, five seasons played, no Apex. Every battle is seeded and repeatable.

| Study | What it does | Battles |
|---|---|---|
| **A, isolation** | Each family against Basic monsters (no Clash ability), with the ability on and off. Run alone against enough Basics to make it even, and 3 v 3 with two Basic team-mates. Two variants: first form with no mastery, and last form with full mastery | 144 variants × 360 battles × 2 sizes × on/off ≈ 207,000 |
| **B, round robin** | Every family against every other, 1 v 1, last form, full mastery, abilities on and off | 72 families × 426 battles = 30,672, each played with abilities on and off (61,344) |
| **C, elements** | Type win rates, from B with abilities off | 30,672 type matchups |
| **D, random 3 v 3 teams** | Three different families per side, abilities on and off, the same seeds | 6,000 battles × 2 (on and off) = 12,000 |

- **Raw data:** `raw/clash-strength.json` (A to C) and `raw/clash-teams-6000.json` (D).
- **Total:** about 281,000 battles.
- **Baseline:** Task 10's Clash audit (`docs/task10/OWNER_DECISIONS_2026-11-13.md` §8), measured with this tool before the approved changes to Falling Star and Second Tide (`docs/task10/TASK10_FINAL_REPORT.md` §2, items 1 and 2).

**The older gates.** `BEAST_CLASH_BALANCE_MANIFEST.md` Gate B to B.5 and "Approved" were measured on the frozen `v1.0.0` ruleset (`gateConfig`). The franchise game now runs the Task 8 engine, so those gates describe a historical ruleset. The tests that pin them (`tests/clash/gateb*.test.js`) are part of the simulation tier and passed where they ran (see `EXECUTIVE_SUMMARY.md`). No gate was re-derived here.

## 1. Overall shape: healthy

| Measure | Now (D, 6,000 random 3 v 3) | Task 10 |
|---|---|---|
| Battles whose winner changes when abilities are switched on | **20.2%** | 20.2% |
| Mean battle length, exchanges (on / off) | 14.3 / 14.2 | 14.2 / 14.3 |
| Pairs of families that gain more together than their own effects predict | none beyond chance: SD of pair z = 0.72, the strongest of 2,556 pairs z = 2.6 | none (largest 3.3 SE) |

- Abilities matter, deciding one battle in five. They do not lengthen battles.
- **No team combination is an exploit.** The two strongest pair surpluses are `firestorm + shadowkit` (16 battles) and `emberfox + rootram` (13 battles). Both have very few battles, at the level that chance alone produces across 2,556 pairs.

## 2. The two approved Task 10 changes worked

| Family and ability | Task 10 audit (before the change) | Now (D, 3 v 3 teams) |
|---|---|---|
| Firestorm, **Falling Star** (uncommon, Fire) | +25.8 points; the only ability hitting every opponent | **+8.6** (a strong ability, no longer an outlier) |
| Tidepaw, **Second Tide** (common, Water) | — | **+6.7** in teams. In isolation (A, 3 v 3, top form) it is **+27.2**: a lone Second Tide carries two Basic team-mates from 69.7% to 96.9%. It is the strongest isolated ability now, but not in mixed teams |

Second Tide's isolation figure is inflated by its support role: it heals Basic team-mates who have no answer of their own. Treat it as a watch item, not a defect.

## 3. Strongest and weakest abilities (D, ability effect in random 3 v 3 teams)

**Strongest:**

| Family | Ability | Rarity | Element | Ability effect (pts) | Team win % |
|---|---|---|---|---|---|
| astralux | Astral Strike | legendary | Psychic | +11.3 | 80.8 |
| wavehorn | Riptide Charge | uncommon | Water | +11.3 | 60.8 |
| glaciron | Glacier Wall | rare | Ice | +10.0 | 75.8 |
| firestorm | Falling Star | uncommon | Fire | +8.6 | 60.4 |
| shadowkit | Shadow Pounce | common | Dark | +8.5 | 43.3 |

**Weakest:**

| Family | Ability | Rarity | Element | Ability effect (pts) | Battles with no execution |
|---|---|---|---|---|---|
| glacivern | Deep Winter | legendary | Ice | −11.6 | 96.7% |
| tempestra | Eye of the Storm | legendary | Wind | −11.6 | 63.6% |
| stoneguard | Bank Shot | uncommon | Earth | −9.7 | 94.5% |
| tidefin | Wash Away | rare | Water | −9.4 | 85.5% |
| nyxshade | Eclipse Theft | legendary | Dark | −8.7 | 77.9% |
| elderoot | Root Communion | legendary | Nature | −7.2 | 24.5% |
| halofang | Radiant Pursuit | rare | Light | −6.9 | 44.7% |
| cerebrix | Foresight | uncommon | Psychic | −6.2 | 2.2% |

**Abilities that make their user worse when they fire** (A, 1 v 1, top form):
- Foresight (cerebrix): −30.0;
- Snowdrift Shelter (icehorn): −28.3;
- Cinder Clamp (ashkit): −12.5;
- Mountain Shelter (titanolith, legendary): −7.5.

The first three were already in Task 10's list. They are implemented as specified; the specified trade loses more than it gains.

## 4. Abilities that almost never execute

12 abilities do nothing in 90% or more of real 3 v 3 battles (D):

| Ability (family) | Battles with no execution |
|---|---|
| **Unbroken Charge** (boulderox) | **100%** |
| Lightning Rod (flicker) | 99.0% |
| Clear Light (lumen) | 98.2% |
| Arc Rebound (voltfin) | 97.7% |
| Spore Detonation (mossclaw) | 97.1% |
| Deep Winter (glacivern, legendary) | 96.7% |
| Iron Bite (ironjaw) | 94.6% |
| Phase Strike (voltfang) | 94.6% |
| Bank Shot (stoneguard) | 94.5% |
| Rubble Reprisal (rockram) | 94.4% |
| Shell Renewal (reefclaw) | 92.4% |
| Stone Divide (terrabull) | 91.3% |

- In the isolation study (A, 3 v 3 against Basics), 14 abilities never executed at all.
- **This is unchanged since Task 10** (the same twelve, Unbroken Charge still at 100%).
- These are conditional triggers whose condition the 3 v 3 format rarely creates: a status to redirect, a shield to break, a knockout to avenge.
- One monster in six carries an ability the player will essentially never see work.

## 5. Rarity, evolution and level

| Rarity | Families | Team win % with abilities (D) | Without abilities | Ability effect | 1 v 1 round-robin win % (B) |
|---|---|---|---|---|---|
| Common | 26 | 37.3 | 36.6 | +0.7 | 25.4 |
| Uncommon | 21 | 51.7 | 51.7 | −0.1 | 56.3 |
| Rare | 13 | 57.0 | 56.5 | +0.5 | 62.1 |
| Legendary | 12 | **66.0** | 68.1 | **−2.2** | **79.2** |

- **Rarity orders strength correctly through ratings:** a legendary's team wins 66%, a common's 37%.
- **Legendary abilities are, as a group, the weakest.** Six of the seven weakest abilities in teams are legendary or rare. This "rarity upside down" finding from Task 10 is unchanged.
- **Lower rarities remain useful:**
  - the best common abilities (Shadow Pounce +8.5, Second Spring +7.5, Second Tide +6.7, Stoke the Flame +6.3) are among the ten strongest;
  - a common team still wins 37% against random opposition.
- **Evolution and mastery.** The two variants of study A have the same ratings, so the difference between them is the ability's form and mastery alone.
  - Going from first form without mastery to last form with full mastery adds **+3.0 win points on average in 1 v 1** (range −11.1 to +21.7 across the 72 families).
  - It adds **+0.5 in 3 v 3** (range −7.8 to +6.1).
  - The ability's own development is therefore visible but small. Rating growth (level and training) is what makes a monster stronger in Clash, as in football.

## 6. Elements

**The type chart works as designed** (C, abilities off): favoured type 58.4%, unfavoured 41.6%, even 50.0%. Task 10 measured 58.2 / 41.8 / 50.0.

| Element | Team win % (D) | Ability effect |
|---|---|---|
| Fire | **54.9** | +3.7 |
| Dragon | 54.2 | +1.3 |
| Dark | 52.9 | +0.5 |
| Earth, Water | 51.3 | −1.6 / +0.1 |
| Ice | 50.5 | −1.4 |
| Psychic | 50.2 | +2.6 |
| Metal | 48.6 | −1.2 |
| Nature, Light | 46.5 | +2.3 / −1.2 |
| Electric | 46.2 | −2.3 |
| Wind | **44.9** | −3.2 |

- **The spread is 10 points (Fire 54.9, Wind 44.9).** Fire's lead is now mostly its abilities (Falling Star, Stoke the Flame), not the type chart.
- **Wind and Electric are the weakest**, because they hold several idle or self-harming abilities: Eye of the Storm, Phase Strike, Lightning Rod, Arc Rebound, Circuit Breaker.
- **Position groups** (ability effect in teams): TE +4.8, RB +3.4, OL +2.9, CB +1.2, QB +0.7, S −1.5, DL −2.0, LB −2.8, WR −2.9, K −3.9.

## 7. AI, strategy and overtime

- **AI effectiveness.** Clash AI decisions (rotation and targeting, `src/clash/t8/ai.js`) were not separately measured in this audit; the studies above run AI against AI.
- **Dominant strategies.** Because no pair interacts beyond chance, the only strategy that dominates is "field higher-rated monsters". That is the intended rarity and rating ladder.
- **Overtime integration.**
  - 3.6–3.8% of football games are still tied after the one overtime period (`GAMEPLAY_BALANCE.md` §1). In Franchise Mode those are settled by a Beast Clash.
  - Over a 14-game season, a club plays about one Clash-decided game every two seasons. Clash therefore decides very few football results; its main franchise role stays the Tuesday encounters and pregame contests.
  - Franchise-run counts are in `FRANCHISE_SIMULATION.md`.

## 8. Football and Clash: conflicting incentives?

From the Clash stat formula (`src/clash/t8/combatant.js` `buildT8Combatant`):

- **HP** = base + per-overall × the football overall of the monster's own position, × the archetype, × a **durability** tilt. The tilt compares durability with the mean of speed, agility, strength, awareness and durability.
- **Attack** follows the same overall and a **strength** tilt.
- **Speed** follows a **speed** tilt and the overall.

**What this means for development:**
- Training a position's overall attributes raises football value and Clash HP and attack together. That is aligned.
- **Durability** is in no football overall (`MONSTER_ATTRIBUTE_BALANCE.md` A-3) but raises Clash HP and lowers football injury risk. Training it is rewarded in both modes, but **invisibly on the football side**.
- **Strength** raises Clash attack for every position, while it is in the football overall only for RB, WR, TE, OL, DL and LB. A QB, CB or S gains Clash attack from strength that does nothing for his football rating. This is a mild incentive split, not a conflict.

**No attribute is good in one mode and bad in the other**, so there is no direct conflict.
