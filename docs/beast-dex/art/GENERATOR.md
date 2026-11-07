# Sprite generator v2: status, audit and schema

[Back to Beast Dex](../README.md) · [Generator brief](../SPRITE_GENERATOR_BRIEF.md) · [Basic art review guide](REVIEW_GUIDE.md)

## Status

| Checkpoint | State |
| --- | --- |
| Before baseline | The initial 120 Basic batch is preserved at commit `6abcf3b` (branch `task8-basic-families`, local tag `basic-batch-v1`; the egress policy refused a tag push, so the commit is the remote reference). Its recipes, SVGs, PNGs and review sheets are unchanged. |
| 1. Silhouette structure sheet | Reviewed 2026-11-06; five targeted revisions requested. **Revisions ready for owner review** ([before/after](generator/revisions-1.html), [png](generator/png/revisions-1.png)). Waiting for approval before the structure library is finalized. |
| 2. 20-monster sample | Not started; waits for checkpoint 1 approval. |
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

## Next steps (after checkpoint 1 approval)

1. Proportion controls: head size and shape (rounded, wedge, long-snouted, beaked, broad-jawed, flattened), neck, muzzle, torso, back, belly, limbs, stance, feet, tail, wings and shell. Each will be validated per structure with diagnostics.
2. The 60-feature library, attached to these anchors, with three shape variants for ears, horns, antlers, tails, wings, crests and frills, shells, claws and pincers, and antennae. Each gets fixtures and checks that it survives occlusion.
3. Face and marking controls.
4. The 20-monster representative sample (checkpoint 2).
