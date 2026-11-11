# Task 8 Phase 1 — Inventory A: monster data, generation, progression, training, ageing, valuation, saves

Repo: `/home/claude/gridiron-beast`, branch `task8-implementation`, HEAD `816b572`. `git diff --stat cbd0d77 HEAD -- src` is empty, so `src/` is identical to `cbd0d77`. Read-only audit: no repo file was changed.

Design sources used: `docs/beast-dex/SPECIFICATION_BASELINE.md` (§2–6, §15; abbreviated SPEC), `docs/beast-dex/PROGRESSION_DECISIONS.md` (PD), `docs/beast-dex/APPROVED_RULES.md` (AR), `docs/beast-dex/data/rules.json` (RJ), `families.json` / `forms.json` (DEX).

All citations are `file:line`. If something is marked **UNVERIFIED**, I inferred it and did not trace it in code.

---

## 0. Summary for the reader

- None of Temper, Apex, per-attribute potential, a training bar, mastery, a level cap or an activity-reward ledger exists in code. Grepping `mastery|apex|temper` over `src` finds only unrelated hits: `retirement.js:60 unsignedTemper`, `clash/values.js:177 ferrcub_temper`, and a comment in `ambition.js:1`.
- The whole economy runs on one scalar: `m.potential` (one number per monster) and `monsterOverall` (OVR on a roughly 45–75 scale). These numbers feed salary, AI quality targets, draft, FA, trades, development slots, clash HP and scheme fit. The DEX starting ranges are far lower: level-1 attributes are about 1–43 and potentials go up to 59/74/84/94/99 by rarity. Every calibrated constant that assumes "quality ≈ OVR 45–75" is therefore affected (see Risks).
- Nature is wired into more than ratings: the press-conference media boost, contract counter acceptance, the FA persona, the Clash combatant and the UI.
- The data model differs from the DEX in 14 of the 72 species. Seven change rarity and seven change **position**, including the legacy cornerstone Granigor DL→K and the gym legendaries Glacivern S→K and Aegistron CB→DL. The 120 Basic families have rarity `basic`, which `RARITIES` does not know.

---

## 1. Species / monster data (`src/data/species.js`, `src/data/monsters.js`, `src/data/personnel.js`)

### 1.1 Species data

| Item | Current behaviour (file:line) | Task 8 change |
|---|---|---|
| `RARITIES` | 4 rarities (common 60, uncommon 30, rare 9, legendary 0) with weight and note — `species.js:9-14`. No `basic`. | Add Basic below Common (AR "Temper, Apex and Basic"; RJ `basic`). The rates at which Basics appear are an **unresolved owner decision** (PD 2026-11-06). |
| `TRAITS` | 9 shared common traits with engine effects — `species.js:17-28`; commons carry `trait`. | DEX families carry `abilities.Football/Beast Clash` codes such as `FIR-01-F`. Basics have `null` for both (DEX `kindlet`). Whether traits survive is not stated in the docs I read (**UNVERIFIED**; owned by the ability inventory). |
| `ELEMENT_REGIONS` | Element → scouting regions — `species.js:31-35`. | DEX families have no `regions`/`fromWeek` fields (key set checked with python), so `regionSpecies` rare/legendary gating has no data source in the DEX. |
| `SPECIES_DEX` | 72 frozen entries: `id, name, element, rarity, position, trait|ability, body,size,look,features[],colors[],pattern?, personality, cornerstone?, regions?, fromWeek?, evolution:[{name,level}]` — `species.js:44-140`. | DEX: 192 families (`id,name,type,rarity,position,clashArchetype,abilities,appearance{features:"a, b" string, colors string},description,...`) plus 222 forms (`starting`/`potential` ranges per attribute, `evolutionLevel`, `stage`). Field names differ: `element`→`type`, `personality`→`description`, array→comma string. All 72 existing ids exist in the DEX. Evolution names and levels match for all 72 (python comparison). |
| Rarity/position diffs vs DEX | Python comparison of `species.js` and `families.json`: rarity changes tidefin U→R, wavehorn R→U, icehorn U→C, windlynx U→R, terrabull R→U, duskrunner U→R, lumen U→C (= AR amendments table). **Position changes: glacivern S→K, stoneguard DL→K, nocturne WR→QB, metalhorn OL→TE, aegistron CB→DL, echolot LB→K, vyrnax DL→K.** | The DEX governs (SPEC §1 precedence, AR). The position changes are not mentioned in AR. Flag them for the owner as possibly unintended. |
| `LEGEND_RULES`, `COLLECTION_MILESTONES` | `species.js:149`, `species.js:152-158` (milestones at 10/25/40/60/72). | 72 → 192 (see §8). |

### 1.2 `monsters.js` functions

| Function / constant | Current behaviour (file:line) | Task 8 change |
|---|---|---|
| `TYPES[*].bias` | Per-element additive attribute bias at generation — `monsters.js:11-24`, applied at `:190,197`. | AR "Generation and evolution": "Do not substitute legacy position-template/type/Nature bonuses for these approved ranges or add them on top." **Delete from generation.** |
| `NATURES` / `NATURE_IDS` | 25 natures (22 up/down ×1.10/×0.90, 3 neutral: balanced, calm, hardy) with a `behavior` text — `monsters.js:29-56`. | SPEC §3: replace with 25 Tempers (22 specialised, 3 neutral: Calm, Balanced, **Steady**; Hardy becomes a specialised Durability/Tackling Temper). Many favored/unfavored pairs differ (e.g. Explosive becomes Agility/Speed; Ferocious, Sturdy, Focused, Cerebral, Technical, Slippery are removed; Forceful, Measured, Bold, Watchful, Driven, Steady are new). Effect is training efficiency only: 2 / 1 / 0.5. |
| `ABILITIES` | 6 legacy cornerstone ability ids — `monsters.js:59-66`. Used through `m.ability`: `roster.js:68`, `roster.js:155`, engine `sim/engine.js:110`. | Owned by the ability work (not this inventory). |
| `BASE` position templates | 10 position base profiles (values about 20–74) — `monsters.js:69-80`. | Replaced by per-family `starting`/`potential` ranges (AR, RJ `generation`). |
| `resolveSpecies` | id → name → `LEGACY_SPECIES_ALIASES` → **hash fallback `SPECIES_DEX[hash % length]`**, never null — `monsters.js:100-104`. Aliases are built from the 70 `OLD_SPECIES` names — `:90-98`. | A fresh save is authorised (SPEC §15), so the legacy aliases can go. The hash fallback silently remaps unknown ids. With 192 entries the result for a given key changes, so this is a hidden-coupling risk. |
| `evolvedSpec` | Synthetic evolved form: id `${id}_e${stage}`, size/look bumped, +claws/+spikes — `monsters.js:107-111`. | DEX `forms.json` has real per-form records (`emberfox:1`, etc.). The form id scheme differs (`:stage` vs `_e`). |
| `formOf` | `monsters.js:113`. | Should read the DEX form. |
| `tryEvolve` | Checks level ≥ `evolution[stage].level`; sets `stage`, renames; **+3 to position-weighted attrs, +1 to the rest; `potential += 4`** — `monsters.js:117-126`. | SPEC §6 "Natural growth" last paragraph and PD bullet 1 / AR formula: `newCurrent = min(newPot, roundHalfUp(oldCurrent × newPot / oldPot))` per attribute. Ceilings come from the new form, preserving relative placement. Training and growth contributions, the aging ledger and the unfinished training bar are preserved. "Claude must not retain old +3/+1 and +4-potential code." |
| `speciesEffect` | ability or trait effect — `monsters.js:128-133`. Returns null for a species with neither (Basics). | Ability work. |
| `pickSpeciesForPosition` | Candidates: `s.position === position` and `RARITY_WEIGHT > 0`, so legendaries are excluded (weight 0). Optional home element at `elementChance` 0.75. Weighted by rarity weight — `monsters.js:136-144`. | Basic weight is undefined → `RARITY_WEIGHT` returns 0 (`:134`), so Basics would be **excluded** except through the fallback (`:138`). Basic appearance rates are an unresolved owner decision (PD). |
| `regionSpecies` | Region elements, no legendaries, rares only in their home region and from `fromWeek` — `monsters.js:146-148`. | Basics pass the filter as non-rare. DEX lacks `regions`/`fromWeek`. |
| `clampAttr` | 1..99 — `monsters.js:150`. | Ordinary non-legendary/non-Apex max is 98 (RJ `rarityRules.nonLegendaryNonApexMaximum`); the individual ceiling is per attribute. |
| `effectiveAttributes` | `attributes × nature(1.1/0.9) + trainingBonus; ×fatigue (speed/strength/agility up to −6%); ×0.9 secondary slot` — `monsters.js:153-168`. | SPEC §3: "Delete the old Nature 1.10/0.90 effective-attribute multipliers from active gameplay paths." `trainingBonus` here is the **weekly staff training-focus boost** (`staff.js trainingBonus`, `roster.js:63-68`, `franchise.js:664,1916`). It is temporary and is not Task 8 training. Keep it separate from the new training bar to avoid a name collision. |
| `overall` / `monsterOverall` (OVR) | Weighted mean over `POSITION_WEIGHTS[pos]` — `monsters.js:170-177`. Weights at `personnel.js:65-76`, e.g. QB `{accuracy:3, awareness:3, arm:2, agility:1, speed:1}`, K `{kicking:6, awareness:1}`. | SPEC §2: attributes irrelevant to a position stay excluded from OVR. RJ `primaryAttributesByPosition` lists **different** sets (QB includes strength and durability; OL includes tackling; etc.). Whether OVR weights change is **not stated**. The OVR scale changes drastically with the DEX ranges (Risk R1). |
| `generateMonster` | See 1.3. `monsters.js:183-220`. | Rewrite from DEX ranges. |
| `salaryFor` | `18000 + 280 × monsterOverall(m)` — `monsters.js:222`. | SPEC §5: Apex valuation reflects exceptional potential and agelessness. Exact valuation is a release dependency coordinated with Task 7. |
| `xpForLevel` | `30 + level × 18`, no cap — `monsters.js:225`. | SPEC §6: maximum level 50; at 50 show MAX and stop level XP. |
| `POINTS_PER_LEVEL` | 2 points per level — `monsters.js:228`, granted in `levelUp` `:243`. | SPEC §6: "Level-ups no longer award spendable training points." |
| `agelessMon` / `pointCost` | legendary or signature or legendary species → cost 1; else `attributeCost` — `monsters.js:230-232`. | Becomes the neutral C (SPEC §4); effective cost is C/E with Temper E. Add Apex to ageless (SPEC §5). |
| `levelUp` | +1 level; 3 position-weighted draws, each +1 (30% chance +2), skipped if `attr ≥ potential`; aged physical picks land with probability 1/cost; then `+2 points`; optional `autoSpend` — `monsters.js:233-246`. | Replace with a fixed per-attribute schedule through level 50 using cumulative fractional entitlement. Allowance per attribute = `floor((P − S)/2)` from the level-1 reference S, independent of training and bounded by the ceiling. Temper and age do not change the schedule (SPEC §6 *Natural growth*, superseded wording replaced by PD 2026-11-06 / PD bullets 4–5). |
| `spendPoint` | Requires `points>0`; **refuses attributes that do not help the position** (`attributeHelps`, `stat-guide.js:46`); caps at scalar `potential`; integer cost; deducts whole points — `monsters.js:248-258`. | SPEC §2 "All monsters can train all 12". The workbook's "inactive-attribute training prohibition" is superseded (SPEC §1). SPEC §4: fractional E/C accounting, partial investment per attribute, refund at ceiling, a one-point option and an exact-cost option. |
| `autoSpendPoints` | Weighted by position weight ÷ cost — `monsters.js:260-268`. | SPEC §4: AI allocation considers positional benefit, current ratings, ceilings, age **and known Temper**, and must not ignore an important unfavoured attribute just because it is expensive. |
| `CORNERSTONES` | 6 legacy cornerstones with fixed `nature`, `ability` and `quality` — `monsters.js:271-282`. **Granigor/stoneguard is DL here; the DEX has it as K.** | Nature field removed. Position mismatch (Risk R4). |
| `cornerstoneOffers` | Pool: uncommon or rare, not K; 3 different positions and elements; random nature with `up` ≠ kicking; `quality 68–70` — `monsters.js:289-303`. | Remove nature. The pool changes with the DEX rarities. |
| `createRoster` | See §4 / §7. `monsters.js:321-379`. | |
| `headlineAttributes`, `schemeFit`, `schemePreferences`, `fitThresholds` | The fit threshold is the 60th percentile of 160 `generateMonster(quality 52–65)` per scheme/position, cached — `monsters.js:394-456`. | The thresholds recalibrate automatically from the new generator. The quality argument is meaningless after the change (Risk R1). |
| `evolutionReady`, `nextEvolution` | level ≥ next form level — `monsters.js:448-449`. | Same trigger (DEX `evolutionLevel`). Evolution is "by percentage of ceiling", which applies to ratings, not to the trigger. |

### 1.3 Fields on a generated monster object

Created by `generateMonster` (`monsters.js:199-219`):

| Field | Source | Task 8 |
|---|---|---|
| `id` | `m_${rng.seed().toString(36)}` `:200`; re-keyed by `claimMonster` (`league-registry.js:62`) | keep. Hidden longevity (`aging.js:25`) and Ambition (`ambition.js:54`) derive from the id. |
| `name` | species name `:201`; numerals added by `createRoster:336-337`, `uniqueName` (`franchise.js:1700`), `clubUniqueName` (`league-season.js:313`) | keep |
| `species` | dex id `:202` | keep (family id); add a form id? (**UNVERIFIED** design choice) |
| `position` | `sp.position` `:187,203` | from the DEX |
| `type` | `sp.element` `:188,204` | DEX `type` |
| `nature` | random from `NATURE_IDS` or argument `:205` | replace with `temper` (uniform over 25; Apex neutral) |
| `age` | `20 + rng.int(9)` default `:206` | keep acquisition age rules (PD bullet 7) |
| `level` 1, `xp` 0 | `:207-208` | level XP track; cap 50 |
| `potential` | **scalar** `clampAttr(quality + 6 + rng.int(14))` `:209` | per-attribute potential map, independent uniform rolls (AR, RJ `generation`) |
| `attributes` | 12 keys: `base + shift×(1 or 0.45) + type bias + normal×4` `:191-198` | per-attribute uniform start within the form range, ≤ potential |
| `fatigue` 0, `injury` null | `:211-212` | keep |
| `ability` null | `:213` (cornerstone legacy id) | ability work |
| `stats` `{v:2, career, season, log, seasons}` | `:214` | keep |
| `yearsPro` | derived from age and id parity `:216` | keep |
| `salary` | `salaryFor` `:217` | revalue |
| `ambition` | `assignAmbition` `:218` (Task 7, keep; SPEC §1 "Temper does not replace Ambition") | keep |

Added later by other code (assignment sites found by grep):

| Field | Set at | Notes |
|---|---|---|
| `stage` | `tryEvolve` `monsters.js:121` | evolution stage |
| `points` | `levelUp` `monsters.js:243`; spent `:256` | **banked training points**, integer |
| `durPeak` | `progression.js:89` | peak durability (ageing) |
| `physDrop` | `progression.js:105` | last offseason's visible physical decline |
| `peakOvr` | `retirement.js:46` | career-high OVR |
| `legendary`, `signature`, `cornerstone`, `archetype`, `star` | `monsters.js:344,351,362,375,368`; `star` deleted `league-registry.js:152`; `cornerstone` deleted `roster.js:185`; `legendary`/`signature` deleted on trade `trades.js:205` | |
| `contract` | `contracts.js:18`, `fa-contracts.js:27-32` (`t7` shape), `PERMANENT_CONTRACT` `league-registry.js:27` | |
| `origin`, `rookie`, `draftRank`, `boardRank` | `draft.js:38,45`; `franchise.js:1014,2510`; `league-season.js:308` | |
| `drafted`, `joined`, `traded`, `history`, `career`, `retired`, `promise`, `poolVia`, `companion`, `devGranted`, `positionMigrated` | `draft.js:124,138`; `franchise.js:577,1049,1269,1762`; `league-trades.js:154`; `career.js:53`; `retirement.js:92,117`; `franchise.js:218`; `league.js:75`; `franchise.js:1817,1418`; `position-migration.js:34` | |

Not present and required by SPEC §15 / §6 / §5: per-attribute potential, temper, apex flag plus knowledge/reveal ledger, natural-growth entitlement and allowance records, a per-attribute training investment balance, a training bar, football and Clash mastery records, an aging-loss ledger, a level-1 reference profile S, and an offseason eligibility stamp.

---

## 2. Ageing (`src/data/aging.js`, applied in `src/franchise/progression.js`, `retirement.js`)

| Rule | Current (file:line) | Task 8 |
|---|---|---|
| Physical set | speed, agility, strength, durability — `aging.js:13-14` | preserve (SPEC §4 "Existing ageing rules to preserve") |
| Position curve | RB 27, WR/CB 28, LB/S/DL/TE 29, OL/QB 30, K 32. Technical offset 2 (3 for OL/QB/K). Physical rate 0.6–1.3 — `aging.js:17-21` | preserve (SPEC §4 table matches) |
| Hidden longevity | −3..+3 from the hash of `longevity|id` (5/10/20/30/20/10/5%) — `aging.js:25-28` | preserve; tied to identity (SPEC §2) |
| Durability shift | ≥75 → +1 year, ≤45 → −1 year — `aging.js:30` | preserve, but see Risk R6 (new durability scale) |
| Peak durability | `durPeak` recorded once at `onset − 3` — `aging.js:32-34`, written at `progression.js:89` | preserve |
| True / public onset | `aging.js:35-36` | preserve |
| Training cost by age | physical 1 / 2 / 3 / 4 by years past public onset (≤0, ≤2, ≤4, 5+). Technical 1, then 2 past public + technical offset. 1 for ageless — `aging.js:42-49` | becomes C. Effective C/E with Temper (SPEC §4). |
| Decline | `physLoss(y, rate) = rate × (1.5 + 0.75(y−1))`, `techLoss = 0.75 + 0.5(y−1)`, `drawLoss` integer with a fractional chance, severe injury +1 physical once, **floor `ATTRIBUTE_FLOOR = 20`** — `aging.js:52-58`; applied `progression.js:90-101` | preserve the rules. Must write an **aging-loss ledger** that evolution scales proportionally (PD bullet 3). Risk R5: the floor of 20 raises low ratings. |
| Retirement | hazard by `y = age − (trueOnset + 4)`; odds multipliers; cap 0.97 — `aging.js:61-74`; run in `retirement.js` (`isAgeless` skips at `:64,88,110,127,128`) | preserve; add the Apex exemption (SPEC §4, §5) |
| Old-save transition | `TRANSITION` ramp/cap — `aging.js:77-82`; `f.aging` via `nativeAging()` `franchise.js:90` | removable with the fresh-save break (SPEC §15) |
| Forecast / career stage | `aging.js:90-103` (used by `fa-personality.js` `careerStage`) | preserve |
| Ageless predicates | (a) `league-registry.js:33-35` `isAgeless` = legendary flag, legendary species, or signature. (b) `monsters.js:230` `agelessMon` (same logic). (c) `roster-plan.js:23` `isAgelessMonster` = **only `m.legendary || m.signature`** (not legendary species, so an owner's or traded legendary counts as ageing for the plan horizon, `roster-plan.js:29`). | Add Apex to all three. Consider unifying them. |
| Offseason pass | `offseason()`: age+1 unless ageless; yearsPro+1; fatigue/injury cleared; durPeak; decline; **growth "to 23": +1 awareness and +1 strength if below potential** (`progression.js:102`); **C2 maturation: +1 to the highest-weight attribute below potential through age 24** (`:104`, `development.js:77-82`, `MATURATION_MAX_AGE = 24` `:83`); salary refresh if market-priced (`:106`, `marketPriced` `:70`) — `progression.js:81-109` | SPEC §6 award table: "Eligible offseason: 2 banked training points per individual; replaces separate direct maturation increases". Delete the +1 awareness/strength (≤23) and C2 maturation. Award once at rollover, using an eligibility stamp (SPEC §6). |
| Where the offseason runs | Task 7 path: season close, `franchise.js:2486-2491` (owner roster, pools, waivers, `leagueAgeing`), guarded by `steps.aged`. Legacy path: `startNextSeason`, `franchise.js:2607-2614`. League: `league-season.js:170-178`; the rival signature additionally gets `growSignature` +2 points by position weight within potential (`league-season.js:35,180-184`). | The 2-point offseason award must also go through this guard. `growSignature` is a parallel growth path that Task 8 does not mention (**decision needed**). |

---

## 3. Progression / training / XP

### 3.1 Football XP and level-ups

| Item | Current (file:line) | Task 8 |
|---|---|---|
| Football XP per starter slot | `24 + 10 if won + rushYds/4 + recYds/4 + passYds/10 + 14·td + 5·tackles + 12·sacks + 14·int + 2·rec`, × `xpScale` (AI slowdown) — `progression.js:21-25`. **Per depth-chart slot**: loops `OFFENSE_SLOTS, DEFENSE_SLOTS, 'K'` and reads `playerStats[slot]` (`:18-20`). Parameter `snaps` is unused (`:15`). | SPEC §6: 50 level XP before positional adjustment plus a 25% training bar. Partial participation scales by `min(1, liveSnaps/10)`. Kicker participation needs one actual kick. Performance bonus is capped at +5 points of bar. SPEC §15: aggregate **by monster, not occupied slot**. |
| Level-up loop | `while xp ≥ xpForLevel: levelUp; tryEvolve if autoEvolve` — `progression.js:26-32`. Events `levelup`, `evolve`, `xp` `:30-34`. | No level-up points, natural growth schedule, cap 50. |
| Owner game | `franchise.js:2203` `afterGame(... autoSpend: settings.autoPoints, autoEvolve: false)`, then dev slots `:2204`, AI opponent `:2205`, `save()` `:2206`. Re-entry guard: game state flow only (`finishSunday` `:2191`). **No activityID ledger.** | SPEC §15: rewards once per persistent activityID+monsterID, atomic and resumable. |
| AI game | `aiAfterGame` `franchise.js:814-822` (autoSpend true, autoEvolve true, xpScale `slowScale` `:842-843`) | same model; the AI evolves automatically |
| Fatigue / injury | `progression.js:36-48`; `recoverWeek` `:53-63`; `OUT_OF_POSITION_RISK` `:9` (dead since single position) | out of scope; keep |

### 3.2 Clash XP

| Item | Current (file:line) | Task 8 |
|---|---|---|
| Calculator | `battleXp`: share weights dealt/taken/support/kos, opponent-overall gap clamp, win/loss, `perBattle` — `clash/xp.js:13-25`. `diminishing` `:28`. `starterRate` (one-third if the monster started last Sunday) `:35-38`. `sessionXp` `:41-46`. Values from `CLASH_VALUES.xp` (`clash/values.js`, **UNVERIFIED** exact numbers). | SPEC §6: 25 level XP per **selected lineup member, including unused reserves**, before archetype adjustment, plus a 25% training bar. Never-involved members get no performance adjustment. Every opening/standalone/overtime Clash awards separately. Watch = Skip. Labs and replays award nothing. |
| Applied | `applyBattleEffects` loops `result.lines[side]` (combatants that fought), `Math.round(xp)`, the same `levelUp` loop, **no `tryEvolve`**, fatigue — `clash-link.js:79-95`. Call sites: encounter `franchise.js:1866` (guarded by `e.status !== 'battle'` `:1862`), overtime `:2696`, pregame `:2774`. `diminishing`/`starterRate`/`sessionXp` are not called from franchise code (grep finds only `battleXp` imported at `clash-link.js:6`). | Use the lineup membership list, not only the fighters. Reward ledger. |
| Snapshot | `snapMonster` stores `nature, level, stage, potential, attributes` — `clash-link.js:37`; also `clash/engine.js:393`; combatant `nature` `clash/stats.js:44`. | Replace `nature` with `temper` (cosmetic in Clash); `potential` becomes a map. |
| Clash combatant uses Nature | `buildCombatant` → `effectiveAttributes(m, {})` (nature ×1.1/×0.9 plus fatigue) → OVR → HP/atk/spd — `clash/stats.js:33-41` (comment `:4`). | SPEC §3 deletion applies, so Clash HP and attack shift. |

### 3.3 Training points (bank / spend UI)

| Item | Current (file:line) |
|---|---|
| Grant | `levelUp` +2 `monsters.js:243` |
| Spend one | `spendAttributePoint` (frozen while contract decisions are open) `franchise.js:1383`, which calls `spendPoint` `monsters.js:248` |
| Spend all (trainer) | `autoSpendAllPoints` `franchise.js:1372-1378` |
| Lock | `pointsLocked` `franchise.js:1382` (season finished with offseason items pending) |
| Auto setting | `f.settings.autoPoints` read at `franchise.js:317,1866,2203,2204,2696,2774`; `assist-advice.js:24` |
| Notices | `franchise.js:317`, `unspentPoints` `:1387`, `assist-advice.js:24` |
| UI | `roster.js:10` (imports `POINTS_PER_LEVEL`), `:171-172` (banked/frozen panel, attribute grid), `:173` help text "points cannot go there" |
| Contract pricing | `withBankedPoints` prices asks as if every point were spent on the top-weight attribute below potential — `contracts.js:30-35`, used by `renewalAsk` `:37` |

Task 8 (SPEC §4, §6): one point per full training bar, earned from participation, performance, reserve and offseason (2 points). Per-attribute fractional investment at C/E. A one-point option and an exact-cost option. Refund at the ceiling, no withdrawal. Preserved through trades and evolution. Spent at the current-age price. The display shows whole points plus the bar percentage. `withBankedPoints` must be redefined for per-attribute ceilings and Temper (**decision**: does the ask include unspent points at C/E?).

### 3.4 Reserve development slots (`src/franchise/development.js`)

| Item | Current (file:line) | Task 8 |
|---|---|---|
| Limits | `DEV = { slots: 6, perPosition: 2, maxAge: 25, minHeadroom: 3, share: 0.35, baseXp: 24 }` — `development.js:17` | SPEC §6: keep 6 / 2 per position and non-Apex eligibility. Apex is exempt from the age and headroom checks (SPEC §5). Reserve training is 25% of the standard award (6.25% of a bar). Level-XP award **not fixed** ("do not silently choose between the old 24-based reserve formula and the new football base"). |
| Eligibility | not a starter, age ≤ 25, healthy, `potential ≥ OVR + 3` — `development.js:20-27`; reasons `:28` | headroom must be redefined against per-attribute ceilings (**decision**) |
| Priority | successors first (`roster-plan.js successorsAt`), then `potential − OVR` — `development.js:31-38` | same redefinition |
| Selection | manual first, then priority, skipping excluded — `development.js:45-52`; owner state `f.devSlots {manual, excluded}` `franchise.js:2152-2188` | keep |
| Practice XP | `round(0.35 × 24 × xpScale) = 8` per game; skip players and injured; same level-up loop and optional evolve — `development.js:55-71` | new award; "no double starter/reserve reward" (SPEC §6, §15). Currently enforced by `played.has(id)` `:60`, with `played = playedIds(chart)` `:74` (depth-chart ids, not actual snaps). |
| Callers | owner `franchise.js:2204`; AI `franchise.js:819` | |

### 3.5 Scouting / reveal of potential

| Where | Current (file:line) | Task 8 |
|---|---|---|
| Draft class | `f.draft.revealed[id]` levels 0–6. OVR at ≥4, `potential` and `natureKnown` at 6 — `draft.js:150`. Scouting `draft.js:56-67`. Creation notes: top 12 = 6, next 10 = 3 — `franchise.js:123`. | SPEC §3: Temper revealed at the first completed scouting report. SPEC §5: Apex at the potential-revealing report. The player's discovery persists across encounters (a knowledge ledger). AI follows equivalent rules. |
| Regional recruits | `revealed` from scout skill; `natureKnown: skill ≥ 70`, `potentialKnown: skill ≥ 55` — `franchise.js:1667-1668,1678`; legend and pool prospects are fully known `:1686,1688`. Stored in `f.week.prospects` (`blankWeek` `franchise.js:444`), so **knowledge is not persisted per monster**. | needs a persistent per-player knowledge ledger (SPEC §15 "Apex/knowledge/reveal ledger") |
| Free agents | always level 6 (whole card known) — `franchise.js:1023-1031` | decide how this interacts with the Apex concealment rule |
| UI | `hq.js:243` (prospect line: potential, nature), `hq.js:245-259` (full report: nature chip +10%/−10%), `hq.js:267-281` (FA report), `roster.js:47-56,165` | |
| AI knowledge | The AI reads true `m.potential` everywhere (draft `draft.js:44,101`; FA `fa-strategy.js:39`; trades `trades.js:66`, `trade-value.js:76`; plans `league-season.js:52,114`, `fa-ai.js:141`, `roster-plan.js:36`) | SPEC §3/§5: "AI cannot use unrevealed Temper"; "AI follows equivalent knowledge rules" for Apex. **Today AI is omniscient.** |
| Collection milestone "Scouting reports reveal one extra rating" | text only, `species.js:153`; grep finds no consumer apart from `dex.js:27` (see §8) | |

### 3.6 Mastery

None exists (grep `mastery` over `src`: no hits). SPEC §6 *Mastery*: thresholds 0/10/30/60, per-mode records, one credit per valid execution, passive capped once per game, preserved through evolution. Ability execution hooks: the engine logs a "signature ability fired" event (`sim/engine.js:75,80`; `sim/rules.js:348` per play per monster). That is a possible counting source (**UNVERIFIED** fit to the "valid execution" definition).

---

## 4. Contract valuation and AI roster generation (reads of potential/OVR/age/nature)

| Site | Reads | file:line |
|---|---|---|
| `salaryFor` | OVR (via nature-affected effective attributes) | `monsters.js:222` |
| `renewalAsk` | `salaryFor(withBankedPoints)`, season-line premium | `contracts.js:30-44` |
| `acceptsCounter` | **nature** calm list +0.15, fiery list −0.15 (includes ids `sturdy, focused, cerebral, ferocious` that do not exist as Tempers) | `contracts.js:47-52` |
| `personaOf` (FA persona) | **nature** `CALM`/`FIERY` sets: patience ±12, timing −5, money +8; `careerStage` | `fa-personality.js:36-38` (sets defined above `:25`, **UNVERIFIED** contents) |
| FA ask | `personaOf`, `renewalAsk`, `salaryFor` | `fa-engine.js:100` |
| FA role / bench | OVR | `fa-engine.js:108-109,121,146` |
| FA strategy value | `ovr + pw × (potential − 70) − age × ageingSeasons − cost + element` | `fa-strategy.js:37-46`; `ageingSeasons` uses `horizonOf` (`roster-plan.js:29`) |
| FA AI keep decisions | `potential ≥ ovr + upside`, age ≤ 25 | `fa-ai.js:141` |
| Trade market value | `(ovr−50)×VALUE_PER_POINT × ageFactor + (potential−ovr)×(0.6 if age≤26 else 0.2)` | `trade-value.js:59-78` |
| Legacy trade value | `(ovr−50)×4.2 × youth + (potential−ovr)×0.6` | `trades.js:62-68` |
| Draft board / AI pick | board `ovr + noise + (potential−70)×0.15` `draft.js:44`; pick score `ovr + (potential−70)×pw + ...` `draft.js:101`; rookie charge `salaryFor × 0.70` `draft.js:14,19` | |
| Class quality | `47–69 + classQualityOffset(year)` (capped +10) | `draft.js:22-24,36` |
| League plan / rebuild | `potential ≥ ovr + REBUILD_UPSIDE`, age ≤ 25 | `league-season.js:52,114` |
| Successor rule | `potential ≥ starter OVR` | `roster-plan.js:36` |
| Renewal outlook UI | age ≤ 25, potential ≥ ovr + 5 | `ui/fa-ui.js:82` |
| Assist advice | `ovr + need + potential/20` | `assist-advice.js:52` |
| Staff draft record | stores pick potentials | `franchise.js:2633` |
| Evolution report | potential before/after | `evolution-report.js:14,29`; UI `evolution-scene.js:52` |
| Club quality targets | base 56/64/72 by tier ± hash ± rival/difficulty/growth | `franchise.js:720-730`; `CREATION_LIFT = 3` `league-season.js:66`; `MIN_QUALITY = 45` `league-season.js:56` |
| Initial owner roster | `createRoster(seed, {cornerstone…, quality: 56})` (STARTING_ROSTER 28) | `franchise.js:86`; `monsters.js:313-315` |
| Initial AI rosters | `ensureLeague` → `legacyAiTeam(f, c, year, {qualityDelta: −3})` → `generatedTeam` → `createRoster(quality, element, legendary, signature, evolveStage, FULL_ROSTER 38)`; then `captureLeague` copies them into `f.league`; the team-overall equality check before/after | `franchise.js:772-802,746-756`; `roster.js:182-191`; `league-registry.js:143-161` |
| AI evolved commons by year | `evolveStage`: gyms year ≥2 → 1, ≥4 → 2; others year ≥3 → 1, ≥5 → 2; sets level to the evolution level then `tryEvolve` | `franchise.js:753`; `monsters.js:339` |
| Gym legendary star | `generateMonster(quality + 9)`, `legendary = true`, salary +6000 | `monsters.js:341-346` |
| Rival signature | `bonus = 6 + 2×seasons`, `level = 1 + 3×seasons`, evolves fully | `franchise.js:845-851`; `monsters.js:348-354` |
| AI "stars" | QB and one DL/LB/CB regenerated at `quality + 10` | `monsters.js:366-369` |
| Arrivals | `generateMonster(quality, age 24–30)`, quality lowered 3 at a time until affordable | `league-season.js:297-311` |

Task 8: Apex valuation (SPEC §5, release dependency). PD bullet 8: initial league rosters reflect prior career training on creation only; amount, allocation and banked points unresolved. PD bullet 7: generate higher-level newcomers from their level-1 roll plus the growth/evolution model, never an evolved form below its level. That applies to `evolveStage` and to the rival signature's `level = 1 + 3×seasons`. Basic contracts and roster generation are unresolved (PD 2026-11-06).

---

## 5. Saves

| Item | Current (file:line) | Task 8 (SPEC §15) |
|---|---|---|
| Franchise schema | `SCHEMA_VERSION = 9`, `LEAGUE_SCHEMA_VERSION = 8`, `LEGACY_SCHEMA_VERSION = 6` — `franchise.js:72-74`. A new franchise is created as 6 (`:88`), set to 8 by `ensureLeague` (`:801`), then 9 by `ensureFreeAgency` (`fa-state.js:47,50`). | Bump the version. Old saves should be identified clearly with a Start New Franchise path rather than silently parsed. |
| Version gate | `migrate()` accepts only 6/8/9; 8/9 require a registry; others return null — `save.js:40-41`. This is the **single gate** for every load path: `store.js:518,538,557,576,592,607,688`, `main.js:338`, `ui/screens/franchises.js:77`, `save.js:22,32,86`. | Accept only the new version. Today a null return gives "could not be migrated" (`store.js:593`) or the import error (`save.js:87`). An explicit incompatible-save UX is needed. |
| Migrations in `migrate` | `migrateSpecies` (legacy names → dex) `save.js:70-81`; `dedupeRosterNames` `:58-68`; `migrateTips`; `backfillCareer`; `backfillLeagueNews`; `ensureFreeAgency` (8→9); `migrateAmbitions` (`position-migration.js:47-53`); `migratePositions` (`position-migration.js:31-40`, at an offseason) — `save.js:43-54`. Also `ensureLeague` at boot (`main.js:279-281`). | No Nature/profile/mastery migration needed (SPEC §15 "not required"). Most of these become dead for new saves. |
| Monster serialization | Plain JSON of the whole franchise object. No per-monster schema. Monsters live in `f.roster`, `f.league.monsters`, `f.league.waivers`, `f.pool[region]`, `f.offseason.market`, `f.freeAgency.extra`, `f.draft.class`, `f.draftResults` (`position-migration.js:18-26`, `league-registry.js:5-13`). | New fields serialize automatically. **Fractions must survive JSON**: fine for numbers, but `pack.js` must keep them exact. It claims an exact round trip (`pack.js` header comment). Store verifies with `encodePart` (`store.js:122-128`). |
| Storage layer | IndexedDB `gridiron-beast` v1; `STORAGE_VERSION = 7`; `PACK_FORMAT 'gbp2'`; parts core/history/draft (`store.js:25,32,102`; `pack.js` header); 3 slots (`slots.js:8-12`); legacy localStorage `gridiron-beast-v6` (`save.js:15`) migrated once (`store.js:498-540`). | unchanged |
| RNG state | `f.rngState` with `frng(f)` (`franchise.js:445`); 31 uses in franchise.js | the determinism requirement already holds by this pattern |
| Reward idempotency | No activityID/monsterID ledger (grep `activityId|activityID|rewarded` finds none). Idempotency comes from state flags: `resolveEncounter` `e.status` (`franchise.js:1860-1862`), season-close `steps.aged` (`franchise.js:2486`), `finishSunday` flow. | SPEC §15: award once per (activityID, monsterID), atomic and resumable. |

---

## 6. Consumers that must change

### 6.1 Nature (`m.nature`, `NATURES`, `NATURE_IDS`, `natureKnown`, nature-keyed systems)

| file:line | Use |
|---|---|
| `monsters.js:29-56` | definitions |
| `monsters.js:154,160-161` | `effectiveAttributes` ×1.1/×0.9 (feeds OVR, sim, Clash, salary, everything) |
| `monsters.js:183,205` | generation |
| `monsters.js:273-280,299-300,361` | cornerstones and offers |
| `contracts.js:47-52` | counter acceptance by nature |
| `fa-personality.js:36-38` | FA persona patience/money |
| `franchise.js:690-700` | **media day**: `md.boosts[m.nature]`, `natureGroup` reply, `+amt` to `NATURES[m.nature].up` and +1 awareness on game day |
| `franchise.js:1987-2000,2017,2026,2035,2038` | `natureGroup`, `natureWeights`, `natureReach`, press question selection weighted by roster natures |
| `data/media.js:14,331-332` | press `QUESTIONS` tagged by nature; answers `t` = nature id; test invariant "every nature at least ten questions" |
| `data/dialogue.js:98-99` | pregame reply text by nature group |
| `franchise.js:1030,1668,1678,1686,1688`; `draft.js:150` | `natureKnown` reveal flags |
| `clash-link.js:37`; `clash/engine.js:393`; `clash/stats.js:4,33,44` | snapshot and combatant (effective attributes include nature) |
| UI: `onboarding.js:7,81`; `hq.js:19,243,245,248,258,267,271,280,631-635`; `roster.js:10,42-56,155,165,173`; `clash-lab.js:80`; `tutorial.js:90` ("natures") | display and press-conference UI |

SPEC §3 says Temper never modifies "current effective ratings ... or AI behavior". The media boost (temporary +rating by nature) and the contract/persona effects therefore have **no direct Temper equivalent**. They need an owner decision: drop them, or re-key them to Ambition or something else.

### 6.2 Scalar `potential`

All sites in §4 plus: `monsters.js:124,209,238,253,262`; `contracts.js:33`; `development.js:25,36,80`; `progression.js:102`; `league-season.js:182`; `clash-link.js:37`; `clash/engine.js:393`; `career-profile.js:60`; `franchise.js:1030,2159,2167,2633`; `evolution-report.js:14,29`; `lab/evo-preview.js:39`; UI `hq.js:243,257,279,541`, `roster.js:114,157`, `fa-ui.js:82`, `evolution-scene.js:52`.

### 6.3 `levelUp` / XP loop

`progression.js:29` (football), `development.js:64` (practice), `clash-link.js:87` (Clash). `xpForLevel` also in UI `roster.js:158` (XP bar). Event shape `{kind:'xp'|'levelup'|'practice'}` is consumed by `franchise.js:2239` (news filter) and the result screens (**UNVERIFIED** full list of UI consumers).

### 6.4 `tryEvolve` / evolution

`progression.js:31`; `development.js:66`; `franchise.js:302` (`evolveMonster`, owner manual; notices `:316`); `monsters.js:339,353` (AI evolveStage, rival); `lab/evo-preview.js:43`; `evolutionReady`/`nextEvolution` `franchise.js:301,316`, `evolution-report.js:24`, `roster.js:299`.

### 6.5 Training points (`points`, bank)

`monsters.js:228,243-268`; `contracts.js:26-35`; `franchise.js:317,1371-1387`; `assist-advice.js:24`; `roster.js:10,171-173`. Auto-spend flags at `progression.js:15`, `development.js:55`, `clash-link.js:79`, call sites `franchise.js:818-819,1866,2203-2204,2696,2774`. (The other `.points` grep hits are play-route geometry in `sim/engine.js`/`playbook.js` and unrelated.)

### 6.6 Direct growth paths to delete or reconcile

`progression.js:102` (+1 awareness/strength ≤23); `progression.js:104` + `development.js:77-83` (C2 maturation); `league-season.js:180-184` (`growSignature` +2 per offseason); `monsters.js:123-124` (evolution +3/+1, +4 potential).

---

## 7. Acquisition pools: species selection and weights

| Pool | file:line | Selection |
|---|---|---|
| Owner starting roster and AI rosters | `createRoster` `monsters.js:321-337` → `pickSpeciesForPosition` `monsters.js:136-144` | rarity weight 60/30/9 (legendary 0, excluded); `exclude` used species so no species repeats; gym clubs pick their home element with probability 0.75 when it has a species at the position (`elementChance`); gym clubs may repeat home-element species (`:332`) |
| Gym legendary | `monsters.js:341-346`, gym list `gyms.js:9-18` | fixed species per gym |
| Free legendaries / Legend Tracks | `FREE_LEGENDARIES` `gyms.js:24`; `legendChoices` `franchise.js:244-248`; `chooseLegendTrack` `:249-260`; scoutable after 3 tracks `franchise.js:1656-1657,1681-1687` (quality `52–63 + 8`) | |
| Rival signature | `rivalSignature` `franchise.js:845-851`: pool = species with `evolution.length` at QB/RB/WR/LB/CB/S; index `hash(rival|team|seed) % pool.length` | uniform by hash. Pool size changes alter the pick. |
| Regional scouting (Monday) | `scoutRegion` `franchise.js:1646-1693`: pool `regionSpecies(region, types, week)` + unlocked legendaries; weights `common 60, uncommon 30×bonus, legendary 14×bonus, else 9×bonus` (bonus 1 / 1.25 / 1.6 by scout skill) `:1659`; quality `52–63 + skill/rarity bumps` `:1663`; need-position extra uniform `:1675` | **any rarity not listed (e.g. `basic`) falls into the rare weight 9×bonus** |
| Wild encounter companions | `encounterCompanions` `franchise.js:1801-1820`: uniform over `regionSpecies(...)` minus legendaries; quality re-rolled up to 4 times to hit a target OVR (`COMPANION_RULE` `:1796`) | relies on the `quality`↔OVR relation |
| Draft class | `generateDraftClass` `draft.js:27-47`: `CLASS_SHAPE` 53 by position `:24`; first shuffled region with a species for the position; species **uniform** `rng.pick(pool)` (no rarity weight); week 10, so rares are included in their home region | |
| Offseason market (legacy) | `offseasonMarket` `franchise.js:1012-1017` and `generateVeterans` `franchise.js:2508-2512`: 13 positions; random region; uniform species at the position; quality 50–59 | |
| AI arrivals (gym signing pool, R4) | `generateArrival` `league-season.js:297-311`: first region with a non-legendary species at the position; with Task 7 FA a gym uses **all** `SPECIES_DEX` of its element at the position (`:302-303`); uniform `r.pick` | |
| Gym FA preference | `strategyValue` element +1.5 `fa-strategy.js:25,43`; `league-season.js:223-227,330-332`; `fa-ai.js:79,97`; draft `GYM_ELEMENT_BONUS 1.5` `draft.js:16,101` | |
| Cornerstone offers | `cornerstoneOffers` `monsters.js:289-303` (uncommon/rare, not K, uniform) | |
| Dev grant (developer only) | `franchise.js:1413-1417` | |
| Free-agent pools | `toPool` `franchise.js:627`; `league.js` pools (`AI_POOL_SHARE` `league.js:75`) | existing individuals, no species pick |
| Clash lab / batch | `clash/batch.js:12-32` | tooling |

Task 8: SPEC §5 Apex 1% for eligible newly generated non-legendary individuals, fixed at generation, so every `generateMonster` call site above. The Apex distribution for Basics is unresolved (PD). The Basic appearance rate is unresolved (PD).

---

## 8. Dex screen and collection milestones

| Item | Current (file:line) | Task 8 |
|---|---|---|
| Dex screen | `ui/screens/dex.js:21-38`: total `SPECIES_DEX.length` `:26`; groups by `TYPES` element `:28-33`; `COLLECTION_MILESTONES.find(m.at > seen)` `:27`; unknown-species sheet uses `RARITIES[s.rarity].label` `:45` (**throws for `basic`**); `speciesSheet` uses `TRAITS[s.trait]` and `s.evolution`, `s.personality`, `s.regions` `:53-67` | 192 families / 222 forms. Basics have no trait and no ability. |
| Counts | `dexCounts` iterates `SPECIES_DEX` ids `franchise.js:439-443`; `dexStatus` `:431-436`; `dexRecord` stores `f.dex.seen/signed/forms` by family id and the global dex `:422-429`; `dexCountsGlobal` `dex-store.js:49` | |
| Hard-coded 72 | `ui/screens/menu.js:58` and `:226` (`${dexCounts(f).seen}/72`); `species.js:157` milestone `at: 72`; `clash-lab.js:176` "All 72 moves"; header comments `clash/validate.js:1`, `clash-moves.js:1` | update to the DEX count |
| Milestone rewards | Rewards (extra rating reveal, +1 recruit attempt, rare +50%, free Legend Track, badge) exist only as text in `species.js:152-158`. The grep for `COLLECTION_MILESTONES` finds just `dex.js:7,27`, and I found no reward logic. | Thresholds need rescaling. The rewards are effectively unimplemented. |
| HoF card | `dexSeen` `franchise.js:412` | |
| Other SPECIES_DEX iterators | `ui/dev-review.js:21`; `ui/ability-fx.js:23`; `ui/screens/ability-audit.js:138,153-154,243`; `lab/evo-preview.js:15`; `clash/stats.js:16,56`; `clash/batch.js:12-32`; `clash/validate.js:17-19` ("no battle move" for every species without one) | |

---

## Risks / surprises

1. **R1 — The OVR/quality scale collapses.** DEX level-1 starting ranges run 1–43 (minimum 1 for common/basic, max potential 59/74/84/94/99 by rarity, python scan of `forms.json`). Today's generator targets OVR ≈ `quality` 45–75. The following all assume that scale: `salaryFor` (`18000 + 280×OVR`); club quality 56/64/72 (`franchise.js:722`); `MIN_QUALITY 45`; `COMPANION_RULE floor 50`; trade `(ovr−50)×k`; `(potential−70)` terms in draft/FA; `DEV.minHeadroom`; scheme-fit calibration; the class quality bands; `classQualityOffset`; Clash HP and attack from OVR (`clash/stats.js:37`); the engine's `norm(attr)/99` for speed, acceleration and awareness (`sim/engine.js:131,383-384`). The whole `quality` parameter of `generateMonster` loses its meaning: 30+ call sites pass quality.
2. **R2 — Basics break lookups.** `RARITIES.basic` is undefined: `dex.js:45` throws on `.label`. `RARITY_WEIGHT` is 0, so `pickSpeciesForPosition` excludes Basics. `scoutRegion` gives them rare weight 9. `buildCombatant` throws "No battle move" (`clash/stats.js:31`) because `CLASH_MOVES` has 72 entries, and `clash/validate.js:19` flags them. `autoLineup` `archetypeOf` returns null.
3. **R3 — DEX lacks fields the code depends on**: `regions`, `fromWeek`, `trait`, `personality`, `cornerstone`, array `features`/`colors`. `element` is named `type`.
4. **R4 — Position changes in the DEX** (7 families). Legacy `CORNERSTONES` Granigor (stoneguard) is DL in code and K in the DEX. `createRoster`'s cornerstone path finds a DL target and replaces it with a K, losing a DL (`monsters.js:371-376`). `importLegacy` defaults to Granigor (`save.js:108`). Gym legendaries Glacivern→K and Aegistron→DL change the gyms' star positions. These changes are not listed in AR's amendments table, so confirm them with the owner.
5. **R5 — `ATTRIBUTE_FLOOR = 20` raises low ratings.** `progression.js:100` `Math.max(20, before − loss)` turns a declining attribute of 8 into 20. Many DEX attributes start below 20.
6. **R6 — Durability onset shift.** At ≤45 the onset comes a year earlier (`aging.js:30`). With DEX durability ranges (common potential up to about 64, Basic below 59), most ordinary monsters would get the early onset. That silently changes the ageing curve SPEC §4 says to preserve.
7. **R7 — Three inconsistent ageless predicates** (`league-registry.js:35`, `monsters.js:230`, `roster-plan.js:23`). The last one ignores legendary species. Apex must be added consistently.
8. **R8 — Nature has non-rating side systems.** The media/press conference (`media.js` questions keyed by nature, test invariant), contract counter, FA persona, and pregame reply. SPEC §3 forbids Temper-driven AI behaviour or rating effects, so these need an owner ruling, not a rename.
9. **R9 — No reward ledger; XP per slot.** Football XP is computed per depth-chart slot (`progression.js:18-20`), not per monster. Clash XP covers only combatants that fought, not every selected member. Practice exclusion uses depth-chart ids, not actual snaps.
10. **R10 — AI is omniscient** about potential (and would be about Temper and Apex). SPEC requires knowledge rules for the AI.
11. **R11 — RNG stream coupling.** `generateMonster` draws (normal×12, nature pick, age, potential) define every downstream seeded roster. `ensureLeague` asserts that team OVR is identical before and after capture (`franchise.js:795`), and `assignAmbition`/`yearsPro` deliberately avoid draws. Expect every deterministic baseline and test to shift.
12. **R12 — `resolveSpecies` hash fallback** (`monsters.js:103`) silently maps unknown ids to a random species. With 192 entries the mapping changes. Prefer a hard failure in the new schema.
13. **R13 — Parallel growth paths** not covered by the spec: the rival `growSignature` (+2 per offseason), the AI `evolveStage` level jumps, the rival `level = 1 + 3×seasons`, the AI "star" regeneration at +10. PD bullet 7 requires newcomers to be generated consistently from level-1 rolls through the growth model.
14. **R14 — `spendPoint` forbids non-position attributes** (`monsters.js:252`). Task 8 allows all 12. The UI text (`roster.js:173`) says the opposite.
15. **R15 — Two separate "training" concepts.** The staff weekly training focus (`trainingBonus` in `effectiveAttributes`, `franchise.js:1916-1940`) is a temporary modifier, distinct from the Task 8 training bar. Naming will collide.
16. **R16 — Hard-coded `/72`** in `menu.js:58,226` and the milestone `at: 72`. The milestone rewards are text only.
17. **R17 — Clash `diminishing`/`starterRate`/`sessionXp`** exist in `clash/xp.js` but franchise code does not call them (UNVERIFIED that no other path does; grep found only `battleXp` imported by `clash-link.js`).
18. **R18 — Level cap.** No maximum level exists today (`xpForLevel` is unbounded). Evolution levels 10–20 are unchanged in the DEX (python check), and SPEC sets the maximum at 50.
