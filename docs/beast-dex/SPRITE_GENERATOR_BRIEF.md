# Claude brief: distinct monster sprite generator

## Timing, scope and source of truth

Owner-approved direction: finish the current 120 Basic design batch first. Preserve that batch as the before baseline. Then upgrade the generator, review silhouettes and a representative sample, and only afterward revise the Basic appearances. Do not discard work or regenerate the batch before those checkpoints.

GitHub is the authoritative Beast Dex. Excel is an optional future export, not an input, deliverable or blocker for this assignment. This supersedes workbook requirements in older briefs.

Use the latest reviewed Beast Dex branch and preserve the ongoing `task8-basic-families` work. Read applicable repository instructions. Continue on a development branch; do not merge, deploy, change the live game or implement the full Task 8 overhaul. The upgrade is authorized here; the subsequent visual checkpoints require owner review.

Audit the actual branch before making changes. An earlier main-branch audit of src/ui/sprite16.js found seven templates, substantial biped/quadruped reuse, mandatory symmetry for several front-facing bodies, and selected features with no visible rendered effect. That is historical evidence, not a claim that Claude's newer batch or branch has been inspected.

## Visual objective

A species should be identifiable by shape, proportions and defining anatomy before color. Unique names, IDs, recipes, or palettes do not prove visual distinction. Design stable authored family appearances; do not reroll anatomy for each individual. Different individual ratings and Tempers do not require different species artwork.

Basic monsters should be simple and readable, not unfinished. Usually choose one or two dominant identifying features; the feature library is a toolbox, not a requirement to attach everything. Preserve original 72-family art by default. Report its similarities instead of silently redesigning it.

## Thirty distinct body structures

Each structure needs its own meaningful silhouette and anatomy, not an alias for another template.

| ID | Structure | Defining anatomy |
| --- | --- | --- |
| 01 | Compact upright | Short limbs, compact torso, relatively large head |
| 02 | Heavy upright | Broad torso, thick limbs, heavy lower-body mass |
| 03 | Long-limbed upright | Narrow torso, elongated arms/legs, taller outline |
| 04 | Hunched knuckle-walker | Forward torso, low head, long weight-bearing forearms |
| 05 | Compact quadruped | Short body with balanced feline/canine-like stance |
| 06 | Long-legged quadruped | Elevated torso, long legs, visible underbody clearance |
| 07 | Low elongated quadruped | Long body, short legs, low reptile/mustelid-like outline |
| 08 | Heavy quadruped | Deep body, thick limbs, substantial shoulders/back |
| 09 | Long-necked quadruped | Extended visible neck and displaced head |
| 10 | Perching avian | Upright compact bird body with folded wings |
| 11 | Ground-running avian | Horizontal bird body, clear legs, forward head |
| 12 | Batlike winged | Wing-dominant or wing-supported anatomy, distinct from birds |
| 13 | Coiled serpent | Coiled lower body, raised head |
| 14 | Elongated serpent | Extended/curved body distinct from the coiled arrangement |
| 15 | Insectoid | Segmented body with readable insectlike appendages |
| 16 | Arachnidlike | Low central body with spread-leg outline |
| 17 | Crustaceanlike | Broad body and prominent pincers, not a turtle with claws |
| 18 | Shelled | Dominant shell profile with exposed head and limbs |
| 19 | Amorphous | Irregular soft outline; more than a single ellipse |
| 20 | Floating | Suspended compact/elongated/clustered body without grounded legs |
| 21 | Amphibian | Broad head, squat torso, folded jumping legs |
| 22 | Hopping | Dominant hind legs, small forelimbs, upright balance |
| 23 | Burrowing | Compact head, low body, dominant digging forelimbs |
| 24 | Armored segmented crawler | Low multi-segment body and repeated supporting appendages |
| 25 | Flat-bodied | Broad thin raylike or flattened outline |
| 26 | Tentacled | Central body with flexible surrounding limbs |
| 27 | Floating jellyfish | Distinct bell body and trailing tendrils |
| 28 | Plant-bodied | Stem, fronds, roots or branches form the actual anatomy |
| 29 | Mineral/construct | Angular connected masses and nonanimal joint structure |
| 30 | Multi-bodied | Coherent connected or orbiting masses |

Maintain the legacy seven-template rendering path for existing recipes. New structures and controls are opt-in. Near-neighbor structures must demonstrate distinct contours and negative spaces; renaming a floating template jellyfish without a bell/tendrils is insufficient.

## Five static poses per structure

Provide five anatomically appropriate variants of every structure: **150 structure/pose combinations**.

1. Neutral: relaxed, balanced and readable.
2. Alert: attentive raised head/torso or equivalent.
3. Braced: planted defensive stance or equivalent compression.
4. Forward-ready: poised to move, distinct from simply bracing.
5. Expressive: characteristic stance, such as raised claw, spread frill or curled body.

Adapt poses to floating, winged, serpentine and other anatomies. Do not add limbs to satisfy a universal pose. Different eyes, colors, flipping or decorative pixels alone are not pose changes. These are authored static alternatives, not a requirement to create 150 animation sequences. A family selects its default appearance; gameplay animation must not arbitrarily change its anatomy.

## Independent proportion controls

Support bounded presets/parameters for head size/shape/placement, neck length, muzzle/beak length, torso width/length, shoulder and back profile, belly profile, limb length/thickness, stance width, foot shape, tail length/thickness/curvature, wing span/folding and shell shape. Include at least the six head-shape options: rounded, wedge, long-snouted, beaked, broad-jawed, flattened.

Not every control applies to every body. Document valid combinations and reject unsupported ones with useful diagnostics. Controls must measurably affect compatible reference renders. Avoid nominal controls that collapse to identical pixels at all supported settings.

## Expanded feature library: 60 named options

Implement the following feature options. These are **appearance features**, not football or Clash abilities. No damage, statuses, collision changes, buffs or targeting behavior comes from choosing one.

| Group | Six feature options |
| --- | --- |
| Head | Ears; horns; antlers; crest; frill; antennae |
| Face | Muzzle; beak; tusks; fangs; whiskers; brows |
| Back | Mane; ridge; spines; dorsal fin; hump; shell |
| Limbs | Claws; hooves; paws; pincers; flippers; webbed feet |
| Tails | Tufted tail; paddle tail; curled tail; club tail; forked tail; finned tail |
| Wings | Feathered wings; membrane wings; insect wings; finlike wings; leaf wings; reduced wings |
| Surface/material | Plates; scales; fur tufts; crystal growths; stone segments; metal panels |
| Plant/fungal | Leaves; vines; buds; flowers; mushrooms; root feet |
| Elemental anatomy | Flame tufts; water sacs; frost shards; static prongs; light orbs; shadow wisps |
| Special anatomy | Halo; lure; cheek pouches; shoulder shells; vent fins; orbiting masses |

Several structures naturally include anatomy also available as a feature; do not double-draw it. A shelled body plus shell feature should configure its existing shell, not paste a second shell over its face. Apply the same principle to beaks, pincers, tentacular/plant appendages and orbiting bodies.

Preserve existing feature identifiers/recipes through documented compatibility mappings. Do not require old monsters to opt into expanded features. New field names and implementation layout are engineering choices; do not silently accept unknown fields.

### Shape variants and placement

Provide at least **three visibly different shape variants** for ears, horns, antlers, tails, wings, crests/frills, shells/back armor, claws/pincers and antennae. This does not require every one of the 60 options to have three variants in the first upgrade.

Examples: rounded/pointed/drooping ears; short/swept/branching horns; blunt/curved/paddle tails; smooth/ridged/angular shell profiles. Where categories overlap, use coherent presets rather than arbitrary incompatible mixes.

Support appropriate attachment anchors, bounded size, orientation, optional left/right placement and selective asymmetry. Use explicit layer and occlusion rules. A two-pixel feature that disappears under the head must be reported or repositioned, not credited as visible diversity.

### Face and surface controls

Provide optional eye shape/spacing and mouth expression controls, consistent with the pixel budget. Preserve legibility and allow a no-mouth/no-visible-eye design when anatomically intentional. Add compatible marking layouts such as stripes, spots, mask, band, back stripe, patches and gradients represented through discrete pixel palettes. Markings and face details are secondary to silhouette, not substitutes for it.

No forced realistic eye/limb count if it destroys a readable 16×16 representation. Preserve creature coherence rather than randomly combining unrelated parts.

## Layering, symmetry and custom art

Use per-structure anchors and intentional back/body/front ordering. Make mirroring optional for new recipes so a large claw, uneven horns or offset markings survive. Do not break legacy symmetry behavior.

Support selectively authored custom parts or full pixel-grid overrides using the same asset contracts. Use them when the generator cannot express an identity well; do not create 120 disconnected rendering systems.

## Resolution and integration constraints

Retain native **16×16** initially. Enlarging exported pixels does not add detail. Do not migrate the whole game to 32×32 without approval. If a required shape/feature is unreadable at this resolution, document it in sample review instead of hiding the limitation or adding noise.

Preserve transparency, crisp edges, export/preview agreement, ground/contact anchors, existing flip behavior and gameplay placement. Floating shadows/anchors remain at the actual gameplay location. Larger-looking bodies do not acquire larger collision boxes. Keep stats, abilities, statuses, rarity, position, IDs and archetypes unchanged.

Include new appearance parameters in cache identity. Maintain deterministic outputs and palette handling. Unknown structures/features/presets must produce diagnostics rather than silent fallback to a biped. Allow explicitly documented legacy defaults only on the legacy compatibility path.

## Distribution across the 120 Basics

Use all 30 structures, targeting roughly four Basic families per structure. This is a diversity guide, not an exact quota that forces incoherent designs. Report exceptions and concentrations. Spread structures across types and positions; do not automatically tie linemen to heavy bipeds or Psychic to floating shapes.

Avoid identical full anatomy recipes with only palette changes. A family normally needs one or two dominant identifying features, not a collection of every option. Simpler rarity presentation must not make every Basic a rounded small animal.

## Required review checkpoints

### Checkpoint 1: silhouette structure sheet

After implementing the structure foundation, show all 30 structures in a common neutral palette/solid silhouettes, using comparable framing and a readable pose. Label each. Include a separate overview demonstrating the five poses on a representative selection of anatomies; test all 150 combinations even if they are not all in the owner-facing sheet.

Wait for owner approval before finalizing the full structure library and detailed sample designs. Independent compatibility tests and documentation may continue. Do not run through this checkpoint simply because all rendered masks differ mathematically.

### Checkpoint 2: 20-monster representative sample

Use 20 of the existing 120 Basic identities, not extra families. Collectively cover all 12 types, all 10 positions, a representative structure selection, and small/medium/large-looking forms. The 30-structure sheet covers the structures not selected here.

Show original versus proposed art, enlarged nearest-neighbor pixel views, actual gameplay-size views, silhouettes, and labeled name/type/position/structure/pose. Include a crowded-field preview with real overlays or a clearly labeled preview harness where production integration is pending. Do not misrepresent a mockup as running gameplay.

Wait for owner visual approval before revising all 120. Do not discard approved gameplay data while waiting.

### Checkpoint 3: full Basic revision

After approval, revise all 120 appearances and update their source recipes, assets and generated Beast Dex references. Provide review sheets grouped both by type and by position. Preserve original roster art unless separately authorized. Keep changes reviewable and allow selective revisions instead of regenerating everything.

## Similarity and quality audit

Compare revised Basics with one another and all 102 original forms. Distinguish:

- Exact decoded rendered-pixel duplicates, ignoring encoding/metadata.
- Identical silhouette masks.
- Identical structural color-code layouts with different palettes.
- Close silhouette matches, including relevant horizontal-mirror comparisons.
- Features visible only when enlarged but lost at gameplay size.

Publish ranked pairs/groups and the measurement definitions. Similarity scores assist review; they do not certify artistic quality. Do not add random pixels/accessories or reroll designs merely to defeat a metric. Exact duplicate Basic sprites must be resolved. Identical Basic silhouettes must be reviewed and justified or revised; near matches stay in the report. Existing original-roster similarities are report-only unless redesign is approved.

## Functional checks

Require all of the following:

- 30/30 structures and 150/150 structure/pose combinations render with valid output.
- 60/60 named feature options have at least one compatible demonstration fixture showing their intended effect. Intentional hidden/occluded cases are separate fixtures, not substitutes for a visible example.
- Required three-shape feature variant sets have distinct compatible reference renders and valid anchors.
- Deterministic identical output for identical recipes.
- Preview and export agree on decoded pixels and transparency.
- Legacy recipe renders remain unchanged on the unchanged legacy path.
- No crashes, invalid palette references, accidental out-of-bounds writes or clipping in approved examples.
- Unknown/incompatible fields produce useful diagnostics.
- All new recipe controls affecting output participate in cache identity.
- No changes to collisions, stats, unique abilities or other gameplay rules.
- All 120 revised Basic records have resolvable art references and labeled review entries.

Report before/after renderer/export cost using matched scenarios. Do not claim physical mobile-device validation unless measured. Do not merge numerical profile validation with artistic approval into one misleading PASS label.

## Deliverables

Development branch and exact commits; audit findings; documented generator schema and compatibility path; 30-structure silhouette sheet; 20-monster sample; test fixtures/results; known 16×16 limitations; similarity report. After checkpoint approvals, deliver the full revised 120-family assets/recipes and updated GitHub Beast Dex pages with type and position review sheets.

The generator upgrade is not the full Task 8 implementation. GitHub remains authoritative. No Excel prerequisite, automatic merge or live publishing is authorized.
