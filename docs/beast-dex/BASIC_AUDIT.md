# Basic families: creation report and technical audit

[Back to Beast Dex](README.md) · [Basic family index](BASIC_INDEX.md) · [Art review guide](art/REVIEW_GUIDE.md) · [Validation report](VALIDATION.md) · [Creation brief](BASIC_CREATION_BRIEF.md)

This is the consolidated audit the creation brief asks for after the Basic batch. It does not claim that Task 8 is complete. Nothing in the game changed: the 120 families are design data and art only, gameplay integration is left for the Task 8 implementation, and nothing was merged or deployed.

## Revisions

| What | Commit |
| --- | --- |
| Game code audited (identical on this branch: `git diff 43976f4 -- src` is empty) | `43976f45fafbd3bb8322458b6b8eb317708818a0` (`main`, v42.22.0-free-agency plus its release record) |
| Beast Dex base (draft PR #96 head) | `6e82f13b56e4a0c5efb131964a0f339dfa3cbb12` |
| Development branch | `task8-basic-families` (this report's commit is the branch head) |

## 1. What was created

- **120 standalone Basic families and 120 forms**, exactly one per type (12) and position (10). Each has a stable ID equal to its lowercase name, a positional strength, explicit weaknesses, a one-line personality and appearance, a Clash archetype and a sprite recipe ([index](BASIC_INDEX.md), [manifest](basic-manifest.json)).
- **Totals:** 192 families and 222 forms in 12 types: 120 Basic families and the original 72, including 12 legendary families. These are authored design counts, not counts of generated individuals.
- **Archetypes:**

  | Archetype | Original | Basic | Total |
  | --- | ---: | ---: | ---: |
  | Striker | 14 | 25 | 39 |
  | Tank | 13 | 25 | 38 |
  | Support | 15 | 23 | 38 |
  | Disruptor | 15 | 23 | 38 |
  | Balanced | 15 | 24 | 39 |

  These are exactly the approved figures. Every position has two or three of each archetype (no position maps to one archetype), and every type has two of each except Ice (3 Strikers, 1 Support) and Wind (3 Tanks, 1 Disruptor), which absorb the uneven totals.
- **Profiles:**
  - All 12 starting and potential ranges are complete: 1,440 pairs.
  - Every starting maximum is at or below its potential minimum, so independent rolls are always valid.
  - The positional strength reaches 55–59. Every other Basic potential, supporting attributes included, stays at or below 59, so no supporting attribute hides an elite specialty.
  - Same-position profiles differ: no two are identical, and the closest pair in each position differs by 15–39 summed potential-midpoint points.
  - The tier table and how a design is expanded are in `tools/build_basic.py`; the creative choices are in `data/basic-authoring.json`.
- **Abilities:** none. Basic families record `{"Football": null, "Beast Clash": null}`. The original 144 mode abilities are unchanged, no ability record points at a Basic family, and no placeholders were created.
- **Art:**
  - Each recipe is drawn by the game's own 16×16 builder (`src/ui/sprite16.js`). It produces a static sprite with a transparent background. That pipeline has no animation frames and needs no asset registration beyond the recipe.
  - Assets: `art/basic/<id>.svg` (the builder's own output) and `art/basic/png/<id>.png` (16×16 RGBA, from the existing `tools/export-sprites.mjs` in its new `--basic` mode, with an atlas).
  - Every Basic pixel grid differs from all 102 existing forms and from every other Basic.
  - Basics are small or medium with 1–3 features. Each position mixes at least four body plans, and no plan appears more than five times in a position.
- **Review:**
  - Contact sheets by position (`art/review/<POS>.html` and `png/basic-<POS>.png`).
  - An in-context preview in the game's own Beast Dex markup and stylesheet (`art/review/in-context.html`).
  - The existing interactive Dex reviewer, rebuilt for the batch (`node tools/dex-review/build.mjs out.html --basic`). It lets the owner approve, request changes to or cut any single design without regenerating the others.

## 2. Validation results

`python3 docs/beast-dex/tools/render_and_validate.py`: **PASS**, 29,000+ assertions, 0 failed. Details are in [VALIDATION.md](VALIDATION.md).

| Gate from the brief | Result |
| --- | --- |
| Type × position combinations | 120/120, one family each, no omissions or duplicates |
| Standalone families, no added evolutions or unique mode abilities | 120/120 |
| Start/potential pairs | 1,440/1,440 complete; 0 invalid endpoints, starts above potential minima or Basic maxima above 59 |
| Archetype counts (Basic and final) | exact |
| Duplicate new IDs or names; collisions with existing identities or legacy save names | 0 |
| Original 72 families / 102 forms / 144 abilities | 0 differences from the per-record baseline frozen at `6e82f13` (rarity amendments and the Cindruff correction included) |
| Art references | 120/120 resolve; the recipe matches the asset hash; 16×16 grid; transparent background; unique silhouettes |
| Generated links | all local links resolve; rendering twice from the same data is byte-identical |

The validator was revised as the brief asks:

- Basic families pass because absence of abilities is checked as an explicit null, not because any count constant was relaxed.
- Original and Basic counts are reported separately.
- Profile and art checks are kept apart from production ability tests, which are not claimed.

`tools/validator_selftest.py` damages a copy of the data in 12 ways and confirms each is caught; the unchanged copy passes (13/13 cases). The earlier PASS on the original roster (14,095 assertions at `23f3793`) is kept as labelled history.

Not tested here: the production generator, ability behaviour, balance, saves, UI and mobile frame rates. Owner art approval is a human review.

## 3. Duplicate and long-career audit

The game on this branch still uses the **legacy generator**: position template + quality + type bias + random Nature, a single scalar potential, no Temper, no Apex. Basic families are not in the game, so the legacy run measures the 72 original species only. The **approved-model reference experiment** is a separate model built from `data/rules.json` and `data/forms.json`. Neither result validates the other.

LEGACY_RESULTS_PLACEHOLDER

### Approved-model reference experiment (`tools/reference_experiment.py`, deterministic)

**Apex:**

- 10,000 eligible rolls drawn across 180 eligible families (60 original nonlegendary + 120 Basic). Legendary families are excluded.
- 97 Apex: a 0.97% rate, 95% Wilson interval 0.80–1.18%. The expected count is about 100 with a binomial SD of about 9.9.
- 81 families received at least one Apex and 15 received more than one. Multiple Apex individuals per family are allowed; there is no quota.
- 0 legendary Apex.
- The same seed reproduces the same Apex designations exactly.
- Distribution by rarity: 72 Basic, 12 Common, 10 Uncommon, 3 Rare. This follows from 120 of the 180 eligible families being Basic under uniform family selection.

**Draft and scouting exposure:** 20 careers × 20 seasons, seeds 1000–1019. Frozen sizes: a 53-prospect class in the legacy class shape and 25 scouting prospects per season (the legacy Pro careers saw 24–28). Each family is drawn uniformly among eligible families of the slot's position. That draw is an **audit assumption**, because Basic acquisition weights are not approved. Roster attrition is not modelled.

| Pool | Channel | Individuals per career | Distinct families | Most appearances of one family | Exact repeats | Near-identical pairs |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 180 families (Basic included) | Draft | 1,060 | 178 | 14.6 | 0 | 8.1 |
| 180 families (Basic included) | Scouting | 500 | 169.8 | 8.2 | 0 | 12.6 |
| 60 original only (contrast) | Draft | 1,060 | 60 | 34.9 | 0 | 32.8 |
| 60 original only (contrast) | Scouting | 500 | 60 | 16.1 | 0 | 52.7 |

All figures are means over the 20 careers. Each career also offered about 11 Apex prospects in drafts and about 5 in scouting.

- Exact creation-profile repeats did not occur in any sample, including 10,000 generated individuals.
- Near-identical builds scale with sample size: 16 pairs in 570 individuals (about one league's AI rosters), 45 in 1,000, 6,028 in 10,000.
- Near-identical pairs are almost entirely kickers: 7.95 of the 8.1 draft pairs per career and all 12.6 scouting pairs, against at most 0.05 at any other position. The near-identity rule compares only primary attributes, and a kicker has one (Kicking). The Basics cut the near-identical rate seen by the player to about a quarter, because they spread draws over three times as many families.

**Definitions:**

- An exact repeat means the same family/form, all 12 starts, all 12 potentials, Temper and Apex designation. Name, ID, timestamp and seed are excluded.
- Near-identical (audit assumption, not a gameplay rule): the same family, and every primary attribute of the position within ±2 in both starting rating and potential.

Exact duplicates would be reportable findings, not proof of a bug. No reroll or quota is proposed.

## 4. Technical audit

### 4.1 Confirmed existing code and data behaviour (commit `43976f4`)

1. **Species list.** `src/data/species.js` holds 72 species (`SPECIES_DEX`, line 44) with rarities common/uncommon/rare/legendary. There is no `basic` rarity (`RARITIES`, line 9). Commons carry a shared football trait and uncommons and up a signature ability. Collection milestones end at 72 ("completion badge", line 157).
2. **Generator** (`src/data/monsters.js` `generateMonster`, line 183):
   - legacy model: a position `BASE` template shifted toward a requested quality, plus type `bias`, plus normal noise;
   - one scalar `potential = quality + 6…19` (line 209);
   - a random legacy Nature (line 205) that later multiplies attributes ×1.10/×0.90 in `effectiveAttributes` (line 153);
   - no Temper and no Apex anywhere in `src/` (the only "Temper" mention is a comment in `ambition.js`).
3. **Level-up and evolution.**
   - `levelUp` (line 233) adds +1/+2 to three weighted attributes and banks 2 points.
   - `tryEvolve` (line 117) adds +3/+1 to attributes and +4 to potential.
   - Both conflict with the approved percentage-of-ceiling evolution and the automatic-growth rules. That conflict already sits in the Task 8 scope (R01), not with Basics.
4. **Species resolution.** `resolveSpecies` (line 100) falls back to `SPECIES_DEX[hash % SPECIES_DEX.length]` for unknown names. **Appending 120 entries to that array would silently remap unknown names in old saves.** Integration must keep the fallback over the original 72, or retire it with the fresh-save break.
5. **Acquisition channels.**
   - `pickSpeciesForPosition` (line 136) picks by `RARITIES[...].weight`; a rarity without a weight is excluded.
   - `regionSpecies` (line 146) includes every non-legendary species of the region's elements, so it would immediately put Basics into scouting reports and **draft classes**, because `generateDraftClass` uses it.
   - Other places draw from `SPECIES_DEX`: the gym-club signing pool (`league-season.js:302`), the rival signature pool (`franchise.js:847`) and the Clash batch tool.
6. **Football effects.** `speciesEffect` returns `null` for a species with neither ability nor trait, and the engine already tolerates `null` (`engine.js:112`). Football type matchups (`src/sim/type-matchups.js`) read only the monster's type, so Basics would get the shared football type rules without new code.
7. **Beast Clash.**
   - The archetype lives on each species' signature move (`archetypeOf` in `src/clash/stats.js`, line 23).
   - `buildCombatant` throws "No battle move" for a species without one, and `src/clash/validate.js` requires a move for every species.
   - Archetype perks are stat multipliers in `src/clash/values.js`: Tank guard and bruise, Striker shield-break, Disruptor pierce, Support low attack only.
   - There is **no shared type-move system** in the code.
8. **Art.** `src/ui/sprite16.js` draws 16×16 static sprites from recipes; evolved forms derive from `evolvedSpec`. There are no frames, sheets or registration files.
9. **Dex screen** (`src/ui/screens/dex.js`). It counts `SPECIES_DEX.length` as the total and groups species by element.
10. **Saves.** Saves store the species ID on each monster. The Task 8 specification already plans a fresh-save break.

### 4.2 Approved requirements ready to implement in Task 8

These need no further decisions, only implementation:

- Basic profile data: the 120 families' ranges as authored here.
- Basic rarity below Common: primary ceiling 59, no unique football or Clash ability, standalone (no evolution).
- Independent uniform starting and potential rolls per attribute, with no budget.
- Same-type field neutrality for Basics as for any monster.
- 1% Apex for eligible nonlegendary individuals, Basics included, with starts 10–15, all-99 potential, neutral Temper and agelessness. No reroll on acquisition, evolution or reload.
- Temper as approved: uniform over 25, training efficiency only.
- Basics keep the shared type matchups, the shared archetype perks, statuses, fields, teammate effects, training and Temper.
- Dex presentation of Basics as a rarity within the existing 12 elements.

### 4.3 Engineering choices that change no gameplay

- Keep the authored source plus build-tool layout (`basic-authoring.json` → `families.json`/`forms.json`) and generate the game's species data from the Beast Dex at build time, rather than hand-copying 120 entries into `species.js`.
- When species are added, keep `resolveSpecies`'s hash fallback over the original 72 (or remove it with the fresh-save break) so unknown legacy names map as today.
- Move the Clash archetype from the move row to the species record (or fall back to it), so a species without a move still has an archetype. Clash validation should then accept an explicit "no unique move" for Basic.
- Use the art recipes as data; no asset pipeline change is needed.

### 4.4 Decisions needed (the single consolidated list)

Each item is a gameplay decision this batch did not settle. Recommendations are labelled as such.

1. **How often Basics appear, by channel.** Nothing approved says how likely a Basic is in scouting reports, draft classes, AI rosters, gym-club signings, encounters or free-agent pools. Today `regionSpecies` would put them everywhere at once.
   - Example: under uniform selection a draft class of 53 would be about two-thirds Basic.
   - *Recommendation:* add a Basic rarity weight per channel (for example below Common's 60 in scouting) and decide whether draft classes include Basics. Settle it before Basics enter any pool.
2. **What an ability-free Basic does in Beast Clash.** The Clash engine needs a move per combatant, and the approved "shared type moves" do not exist in the code yet.
   - Example: a Basic Support has no heal of its own; its archetype only lowers its attack to 0.75×.
   - *Recommendation:* specify the shared type move set (one per type) before Basics can battle. Until then, keep Basics out of Clash lineups.
   - **Archetype gaps:** Support has no shared heal and Disruptor no shared status; only pierce, guard and shield-break are shared. Assigning those archetypes to ability-free Basics gives them a name without the intended function until shared moves exist.
3. **The Dex collection book and milestones.** These are built for 72 species ("completion badge" at 72), and Basic doubles the book.
   - *Recommendation:* decide whether Basics count toward completion and whether milestones are rescaled or Basics get a separate tally.
4. **Mixed generation models during the transition.** The legacy generator (scalar potential, Nature) and the approved model (per-attribute potential, Temper) cannot run side by side without two progression systems.
   - *Recommendation:* add Basics only together with the Task 8 generator and the fresh-save break, not onto the legacy generator.
5. **Initial development of inherited and opposing rosters** (PROGRESSION_DECISIONS.md). The amount and allocation of prior training and the initial banked points remain open. For Basics this decides how far below the league they start.
6. **Level, age and evolved-form acquisition rules (R01).** Approved: no generating an evolved form below its level. Still open for Basics: the generation level and age ranges, and how higher-level Basic newcomers are aged.
7. **Apex details (R06).** Open: exact sampling among the three neutral Tempers and of the 10–15 starts (the reference experiment assumed uniform), contract valuation, and discovery persistence. Basics add 120 eligible families, so about two-thirds of Apex individuals would be Basic under uniform family selection. *Decide whether that is intended*, or whether Apex likelihood follows channel weights.
8. **Contracts and salaries for Basics.** Today's salary is a function of overall rating, so a Basic would simply be cheap. There is no decision on rookie scale, minimum salary or roster-filler contract terms.
9. **AI roster policy.** Open: whether AI clubs may carry Basics as depth, and how many. This interacts with the forfeit and open-slot finding from Task 7, since Basics are an obvious source of legal depth at thin positions.
10. **Similarity thresholds for the duplicate audit.** The ±2 near-identity rule and the per-position primary-attribute choice are audit assumptions. Approve or replace them before they are used as targets.
    - Example: with Kicking as a kicker's only primary attribute, nearly every near-identical pair in the reference experiment is a kicker.
    - *Recommendation:* compare kickers on Kicking plus Awareness and Durability, or report them separately.

### 4.5 Balance and performance questions needing tests against agreed targets

- **Usefulness:** whether Basics are useful roster depth or dead weight at their 55–59 strength ceilings. This needs the Task 8 progression model and agreed targets (for example a Basic starter's expected rating after N seasons).
- **Clash outcomes** of ability-free Basics against original monsters per archetype, once shared moves exist.
- **Performance** of a 192-family species list in the Dex screen and generation paths on low-end phones. It is likely negligible, but it is untested.
- **Forfeit rates:** whether Basic depth changes them in the All-Star / one-position-per-family scenario from Task 7. Test with the agreed benchmark after Task 8.

## 5. How to reproduce

```
python3 docs/beast-dex/tools/build_basic.py            # authored designs → families/forms
node docs/beast-dex/tools/art_review.mjs               # sprites, checks, contact sheets
node tools/export-sprites.mjs docs/beast-dex/art/basic/png 1 --basic
python3 docs/beast-dex/tools/render_and_validate.py    # pages, manifest, validation
python3 docs/beast-dex/tools/validator_selftest.py
python3 docs/beast-dex/tools/reference_experiment.py --out=docs/beast-dex/audit/reference-experiment.json
node tools/basic-audit-legacy.mjs --seed=11 --seasons=20 --out=legacy-11.json   # also 12 and 13
python3 docs/beast-dex/tools/legacy_audit_report.py docs/beast-dex/audit/legacy-exposure.json legacy-11.json legacy-12.json legacy-13.json
```
