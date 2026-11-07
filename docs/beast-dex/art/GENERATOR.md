# Sprite generator v2: status, audit and schema

[Back to Beast Dex](../README.md) · [Generator brief](../SPRITE_GENERATOR_BRIEF.md) · [Basic art review guide](REVIEW_GUIDE.md)

## Status

| Checkpoint | State |
| --- | --- |
| Before baseline | The initial 120 Basic batch is preserved at commit `6abcf3b` (branch `task8-basic-families`, local tag `basic-batch-v1`; the egress policy refused a tag push, so the commit is the remote reference). Its recipes, SVGs, PNGs and review sheets are unchanged. |
| 1. Silhouette structure sheet | **Approved by the owner, 2026-11-06**, after five targeted revisions ([before/after](generator/revisions-1.html)), including the insectoid's dorsal view and the arachnid's simplified anatomy. The 150 approved renders are pinned in `tests/fixtures/v2-structures-approved.json`. |
| Controls and feature library | Built after checkpoint 1: proportion controls, the 60-feature library with shape variants, face and marking controls, compatibility diagnostics. Sheets: [features](generator/features.html), [controls](generator/controls.html), [face and markings](generator/face-markings.html); [compatibility matrix](generator/compatibility.json). |
| 2. 20-monster sample | **Ready for owner review**: [before/after sample](sample/checkpoint-2.html) ([png](sample/png/checkpoint-2.png)), [crowded-field preview](sample/crowded-field.html) ([png](sample/png/crowded-field.png)), [audit](sample/sample-audit.json). The full Basic revision waits for approval. |
| 3. Full Basic revision | Not started; waits for checkpoint 2 approval. |

Gameplay is untouched: no stats, abilities, collisions, rarity, positions, IDs or archetypes change. The game renders only legacy recipes, and they are pixel-identical to before.

## Review files (checkpoint 1)

- [generator/structures.html](generator/structures.html) and [png/structures.png](generator/png/structures.png): all 30 structures in the neutral pose, as a solid silhouette and in one neutral palette, with comparable framing.
- [generator/poses.html](generator/poses.html) and [png/poses.png](generator/png/poses.png): the five poses on 12 representative anatomies.
- [generator/all-150.html](generator/all-150.html) and [png/all-150.png](generator/png/all-150.png): every structure in every pose, as tested.
- [generator/structure-checks.json](generator/structure-checks.json): the automated checks and the closest silhouette pairs.

Regenerate them with `node docs/beast-dex/tools/structure_review.mjs`.

## Audit of the renderer before the upgrade (commit `6650839`)

- **Templates:** 7 body templates (biped, quadruped, serpent, avian, blob, insectoid, shelled). Among the original 72 species, 21 are biped and 26 quadruped.
- **Mirroring:** biped, blob, avian and insectoid are always mirrored from their left half, so asymmetric anatomy is impossible on them.
- **Invisible features:** 76 of the 1,512 body × size × look × feature combinations produce no pixel change at all:
  - `ridge`: 36
  - `beak`: 12
  - `claws`: 9
  - `plates`: 9
  - `shell`: 9
  - `ears`: 1

  Examples: `ridge` on the large cool biped; `beak` on the blob; `claws` on the serpent; `plates` and `shell` on the shelled body.
- **Shared silhouettes among the original 72:** Bramblet and Bouldrox; Zippit and Flurrit; Zappard and Duskyre; Gustling, Solchirp and Coglet. These are reported only; the original art is preserved.
- **The initial Basic batch:** distinct pixel grids, but drawn from the same 7 templates.

## Schema (generator v2 recipe)

A recipe opts into v2 by carrying `structure`. Fields accepted by this version:

| Field | Values | Notes |
| --- | --- | --- |
| `structure` | one of the 30 IDs below | required for v2 |
| `pose` | `neutral` · `alert` · `braced` · `forward` · `expressive` | default `neutral` |
| `size` | `small` · `medium` · `large` | scales toward the ground anchor; default `large` |
| `colors` | `[main, accent]`, each `#rrggbb` | the same palette and shading as legacy |
| `mirror` | `true` / `false` | optional symmetry (default `false`, so raised claws and uneven horns survive) |
| `eyes` | `default` · `none` | `none` for anatomically eyeless designs |
| `proportions` | `{ control: value }` | see the proportion controls below; omitted controls use their default |
| `features` | `[{ id, variant? }]` or ids | up to one tail and one wing feature; see the feature library |
| `face` | `{ eyeShape, eyeSpacing, mouth }` | eyeSpacing is for front views |
| `markings` | `{ pattern, color }` | color `accent` (default) or `dark` |
| `id`, `name`, `gen` | identity and version | cache identity only |

**Diagnostics:** an unknown structure, pose, size, eye mode or field is reported with the accepted values (`recipeProblems`), and drawing throws instead of falling back to a biped. A recipe **without** `structure` takes the unchanged legacy path, including its documented legacy defaults.

**Compatibility path:**

- `src/ui/sprite16.js` `spriteGrid` hands v2 recipes to `src/ui/sprite-gen.js` and everything else to the legacy templates.
- v2 fields join the SVG cache key only for v2 recipes, so legacy cache keys are unchanged.
- `tests/fixtures/legacy-sprites-before-v2.json` pins all 222 legacy sprites (102 original forms and the 120 Basic recipes) and the test suite compares against it.

**Fit:** each v2 drawing uses the largest base scale (at most 1, in 0.04 steps) that leaves a free column on both sides and a free top row, so the outline is never clipped. `size` then scales from that. In the 150 combinations, 122 fit at 1.0, 21 at 0.96, 6 at 0.92 and 1 at 0.88.

**Anchors** returned by every structure: head, eyes, mouth, back, tail, ground, plus flags such as `side`, `floating`, `shell`, `beak`, `pincers` and `plant`. Built-in anatomy is flagged so that a feature duplicating it configures the existing part instead of pasting a second one. Features attach to these anchors.

## The 30 structures

| # | ID | Structure | View |
| ---: | --- | --- | --- |
| 01 | `compact_upright` | Compact upright | front |
| 02 | `heavy_upright` | Heavy upright | front |
| 03 | `long_limbed_upright` | Long-limbed upright | front |
| 04 | `knuckle_walker` | Hunched knuckle-walker | side |
| 05 | `compact_quadruped` | Compact quadruped | side |
| 06 | `long_legged_quadruped` | Long-legged quadruped | side |
| 07 | `low_elongated_quadruped` | Low elongated quadruped | side |
| 08 | `heavy_quadruped` | Heavy quadruped | side |
| 09 | `long_necked_quadruped` | Long-necked quadruped | side |
| 10 | `perching_avian` | Perching avian | front |
| 11 | `running_avian` | Ground-running avian | side |
| 12 | `batlike` | Batlike winged | front |
| 13 | `coiled_serpent` | Coiled serpent | side |
| 14 | `elongated_serpent` | Elongated serpent | side |
| 15 | `insectoid` | Insectoid | dorsal (top-down) |
| 16 | `arachnid` | Arachnidlike | front |
| 17 | `crustacean` | Crustaceanlike | front |
| 18 | `shelled` | Shelled | side |
| 19 | `amorphous` | Amorphous | front |
| 20 | `floating` | Floating | front |
| 21 | `amphibian` | Amphibian | side |
| 22 | `hopping` | Hopping | side |
| 23 | `burrowing` | Burrowing | side |
| 24 | `segmented_crawler` | Armored segmented crawler | side |
| 25 | `flat_bodied` | Flat-bodied | front |
| 26 | `tentacled` | Tentacled | front |
| 27 | `jellyfish` | Floating jellyfish | front |
| 28 | `plant_bodied` | Plant-bodied | front |
| 29 | `construct` | Mineral/construct | front |
| 30 | `multi_bodied` | Multi-bodied | front |

**Poses** are authored per structure and adapted to its anatomy, not added limbs. Floating and winged bodies change height, tilt, wing span or tendril sway. The expressive pose is characteristic: a raised fist (knuckle-walker), a raised claw (crustacean), a sitting stance (compact quadruped), a pseudopod (amorphous), a raised tentacle, a stamping foot (heavy quadruped) or a folded wing (batlike).

## Checkpoint 1 revisions (owner review, 2026-11-06)

All other structures are unchanged.

| Structure | Change | Closest other structure, before → after |
| --- | --- | --- |
| Long-limbed upright | A stick-limbed build: a thin torso on a neck, legs in a wide inverted V, and elbowed arms held away from the body, so open space shows between the legs and beside the torso. A bird has an egg-shaped body and no arms. | perching avian 0.83 → plant-bodied 0.73 (perching avian now 0.72) |
| Insectoid | Changed to a **dorsal (top-down) view**: three body parts in a column with waists, six legs splayed sideways, and forward antennae. The open-wing-case pose keeps the legs visible. | knuckle-walker 0.68 → heavy upright 0.68 |
| Arachnid | A small low body slung between one long arching leg a side, with an open triangle under each arch. The inner legs are dark detail under the body. | heavy upright 0.69 → shelled 0.56 |
| Mineral/construct | Straight-edged blocks only: a hexagonal core, a chamfered head block on a peg, shoulder blocks hung from one-pixel pins, and leg blocks under a pelvis plate. The pins leave notches, so the masses read as assembled. | heavy upright 0.80 → heavy upright 0.76 |
| Multi-bodied | A lead mass with eyes and two to four satellites spaced far enough apart that background shows between every pair after outlining, linked by thin tethers. Poses rearrange the orbit. | floating 0.58 → batlike 0.55 |

**Why the insect changed view.** Three side-view attempts all read as a four-legged mammal. In a 16×16 side view the outline fills the waist pinches and only three legs can show, so any outlined body on legs becomes a quadruped silhouette. The dorsal view is the usual pixel-art solution for insects. It keeps the same ground anchor and frame, and the field renderer only places and flips sprites. **Approval of this view change is requested.**

**Why the arachnid has one silhouette leg a side.** Two separated legs a side need gaps of at least 3 px on each side of a body, which 16 px cannot hold. That arrangement merged into the crown shape seen before. One clear arch a side plus dark inner legs was the intentional simplification.

## Functional checks (checkpoint 1)

These are automated rendering checks, separate from the owner's artistic approval.

- 30/30 structures and 150/150 structure/pose combinations render a valid 16×16 grid with known palette codes, at least 40 pixels, and no clipped body pixels.
- All 150 silhouette masks are distinct, and each structure has 5 distinct pose silhouettes.
- Identical recipes give identical output. `size` and `mirror` measurably change pixels.
- Preview SVG and the exported grid agree pixel for pixel.
- All 222 legacy sprites are unchanged in grid and SVG.
- Unknown fields and values produce diagnostics.
- `tests/sprite-gen.test.js`: 6/6 pass, and `tests/species.test.js` (including the PNG exporter) 11/11, re-run after the revisions.
- Closest neutral-pose silhouette pairs after the revisions (Jaccard on outlined masks, mirror included): heavy quadruped and shelled 0.80; burrowing and segmented crawler 0.77; heavy quadruped and amorphous 0.77; perching avian and plant-bodied 0.77; heavy upright and heavy quadruped 0.77. Before the revisions the closest pair was long-limbed upright and perching avian at 0.835. Similarity scores assist review; they do not certify quality.

**Renderer cost.** Matched scenario on this container, not a phone:

| Scenario | Before | After |
| --- | --- | --- |
| Legacy, all 72 species | 2.62 ms (≈ 36 µs each) | 2.47 ms (≈ 34 µs each) |
| v2, all 150 combinations uncached, fit included | — | 13.4 ms (≈ 90 µs each) |

The game caches rendered SVGs, so each sprite is drawn once per size and tint. Not measured on a physical mobile device.

## Known 16×16 limitations

- **Gaps narrower than three pixels disappear.** The outline pass rings every body pixel, so two limbs 1–2 px apart merge. Visible negative space needs a gap of at least 3 px. That is why side views show only the near pair of legs clearly, and why insect, crawler and spider legs are spaced wide or drawn as dark detail rather than silhouette.
- Far-side legs are shaded darker and merge with the near legs in silhouette. They read as legs only in colour.
- Eyes are one or two pixels. Spider eye clusters and eye stalks are at the limit of legibility.
- Thin appendages (tendrils, antennae, insect legs) are 1 px wide with outline. They survive at 48 px and above, but are faint at 24 px; the sample checkpoint will show both sizes.
- Wide bodies (bat wings, rays, spiders) fill the frame, so the fit rule scales a few poses down by up to 12%.

## Proportion controls

The first value is the default. A control is applied as a per-part transform (each structure tags its head, neck, torso, legs, arms, tail and wings), so it reshapes only the anatomy it names and moves the anchors with it.

| Control | Values | Needs |
| --- | --- | --- |
| `headSize` | medium, small, large | head |
| `headShape` | rounded, wedge, long_snouted, beaked, broad_jawed, flattened | head |
| `headPlacement` | normal, high, low | head |
| `muzzleLength` | none, short, long | head |
| `neckLength` | normal, short, long | neck |
| `torsoLength`, `torsoWidth` | normal, short/narrow, long/wide | torso (length is horizontal on side views, vertical on front views) |
| `backProfile` | plain, humped, arched | back |
| `bellyProfile` | plain, round | torso |
| `limbLength`, `limbThickness` | normal, short/thin, long/thick | legs or arms |
| `stanceWidth` | normal, narrow, wide | legs |
| `footShape` | plain, paw, hoof, flat | feet |
| `tailLength`, `tailThickness` | normal, short/thin, long/thick | tail |
| `tailCurve` | straight, curled, raised | a tail feature |
| `wingSpan` | normal, narrow, wide | wings |
| `wingFold` | open, folded | a wing feature |
| `shellShape` | smooth, ridged, angular | shell |

## Feature library (60)

| Group | Features (shape variants in brackets) |
| --- | --- |
| Head | ears [pointed, rounded, drooping], horns [short, swept, curled], antlers [forked, branching, palmate], crest [spike, fan, plume], frill [fan, spiked, round], antennae [straight, curled, clubbed] |
| Face | muzzle, beak [short, long, hooked], tusks, fangs, whiskers, brows |
| Back | mane, ridge, spines, dorsal fin, hump, shell [smooth, ridged, angular] |
| Limbs | claws [straight, hooked, large], hooves, paws, pincers [open, closed, large], flippers, webbed feet |
| Tails | tufted, paddle, club, forked, finned [each straight, raised, curled]; curled tail [loose, tight, raised] |
| Wings | feathered, membrane, insect, finlike, leaf, reduced [each folded, spread, raised] |
| Surface | plates, scales, fur tufts, crystal growths, stone segments, metal panels |
| Plant | leaves, vines, buds, flowers, mushrooms, root feet |
| Elemental | flame tufts, water sacs, frost shards, static prongs, light orbs, shadow wisps |
| Special | halo, lure, cheek pouches, shoulder shells, vent fins, orbiting masses |

**Layering.** Each feature is either *behind* (it fills only empty cells, so it never covers the body: manes, frills, open wings, tails, halos) or *front* (drawn over the body). Folded wings lie over the body; spread and raised wings sit behind it. Order: markings, behind features, front features, face.

**Built-in anatomy is configured, not duplicated.** A shell on the shelled structure sets its shell shape; a beak on the perching or running avian sets its beak; pincers on the crustacean set its claws; antennae on the insectoid shape its own antennae tips. A tail or wing feature replaces the structure's built-in tail or wings (the batlike structure keeps its membrane).

**Dorsal (insect) view.** Head features attach to the top of the head segment, back features run along the thorax and abdomen midline, wings attach at the thorax and spread sideways, tails extend behind the abdomen, and leg features attach at the six leg tips. Muzzle-type features and eye spacing that need a side or front face are reported as unsupported.

**Gameplay anchors.** The ground line, frame, collision behaviour and field placement are unchanged: features never move the ground anchor, and the fit rule shrinks a design rather than clipping it.

## Diagnostics

- `recipeProblems` (static): unknown fields, controls, values, features and variants; duplicates; anatomy needs (feet, hands, tail, wings, head); conflicts (a muzzle on a built-in beak, membrane wings on the batlike, orbiting masses on the multi-bodied, root feet or wings on the plant-bodied, more than one tail or wing feature). Drawing such a recipe throws.
- `recipeDiagnostics` (render): every non-default control, every feature and the face and markings are removed one at a time, and the finished pixels (after the game's shading and outline) are compared. A choice that changes no pixel is reported as invisible, never credited as diversity. A design that fits only below 88% scale is reported.
- Matrix over 30 structures × 5 poses ([compatibility.json](generator/compatibility.json)):

| | ok | invisible | too big | unsupported |
| --- | ---: | ---: | ---: | ---: |
| Features (first variant), 9,000 | 8,070 | 172 | 253 | 505 |
| Non-default control values, 6,000 | 2,516 | 425 | 129 | 2,930 |

Invisible examples: horns or antlers with no room above a tall head; thin limbs on structures whose limbs are already 1 px; a hump inside a heavy body. Too big: tails on structures whose bodies already reach the frame edge (low elongated quadruped, elongated serpent, shelled). Every feature and every control value has at least one compatible, visible structure (`library-checks.json`), and each feature's variants are pixel-distinct there.

Regenerate with `node docs/beast-dex/tools/library_review.mjs`.

## Tests (controls and features)

`tests/sprite-gen.test.js`, 12/12: the approved 150 renders are unchanged; every control value changes its fixture; all 60 features and their variants are visible and distinct on their fixtures; face and markings change the render; unsupported combinations are rejected and the render diagnostics agree with the pixels across all 1,800 structure × feature cases; determinism, cache identity and preview/export agreement with controls and features. `tests/species.test.js` 11/11, the legacy 222-sprite snapshot unchanged, and the Beast Dex validator passes.

## Checkpoint 2: the 20-monster sample

Proposed v2 recipes for 20 existing Basic families are in [sample/checkpoint-2-recipes.json](sample/checkpoint-2-recipes.json). Names, types, positions, colours, sizes, personalities and gameplay profiles are unchanged, and nothing is wired into the game data. Regenerate the sheets with `node docs/beast-dex/tools/sample_review.mjs`.

- **Coverage:** all 12 types, all 10 positions, 20 different structures, 13 small and 7 medium forms. The Basic batch has no large forms.
- **Diagnostics:** all 20 recipes are clean. While authoring, the diagnostics rejected 10 choices: invisible claws, ears, tusks, webbed feet and markings, and two designs that would have shrunk below 88%. They were replaced, not hidden.
- **Similarity,** measured against the other 19 proposals, the 102 original forms and the other 119 current Basics:
  - no exact duplicates, no identical silhouettes and no match at 0.85 or above;
  - mean nearest-silhouette score 0.992 before, 0.751 after. The current Basics almost all share a silhouette with an existing design.
- **Small features:** nine features change only 1–3 pixels and may be lost at 16–24 px: vent fins, straight antennae, pointed ears on the hopper, hooked beak, hooked claws, crystal growths, fangs (twice) and a spike crest. They read at 32–48 px.
- **Field read:** in the crowded-field preview, the low, wide designs (badger, otter, mole, walrus) occupy less height than their former upright templates at the same 3.4-yard sprite size.
