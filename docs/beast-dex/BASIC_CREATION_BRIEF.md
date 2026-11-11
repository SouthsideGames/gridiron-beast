# Claude creation brief: 120 Basic monster families

## Task and authority

Create the Basic expansion as authored species data and reviewable art in SouthsideGames/gridiron-beast. Read repository instructions, this brief, APPROVED_RULES.md, data/rules.json and the original approved family/form data before editing. The initial Beast Dex lives on branch `docs/beast-dex-approved-profiles`, draft PR #96; use its current head rather than assuming main contains it. Preserve unrelated work. This brief authorizes creative decisions within the constraints below. Do not ask the owner to name and stat each of the 120 families individually.

This is a design/data/art expansion followed by an audit. Do not implement the entire Task 8 overhaul, alter the live game, merge or deploy as part of this brief. Keep the existing 72 families and 102 forms intact, including the approved rarity amendments and Cindruff Coverage correction. New content remains reviewable until owner art/content review.

## Exact expansion matrix

Create exactly one new Basic family for every combination of:

- Types: Fire, Water, Nature, Electric, Earth, Ice, Wind, Dark, Light, Metal, Psychic, Dragon.
- Fixed positions: QB, RB, WR, TE, OL, DL, LB, CB, S, K.

That is 12 × 10 = **120 new families and 120 new forms**. Together with the original roster, the target is **192 families and 222 forms**. Each new family is standalone: no evolutions, evolution levels, evolution-only art or future abilities. Those can be separately designed in a later expansion. Basic is a rarity, not a thirteenth elemental type.

## What Basic means

Basic monsters are weak, affordable roster-depth options. Give each family one useful positional strength and clear weaknesses through its ordinary attribute profile. Do not add a unique passive, hidden perk or special action to make it special. Distinct appearance, names, personality and sensible strengths should supply identity.

Primary potential follows the approved Basic Weak–Limited band **1–59**, with a firm maximum of 59. Use the existing primary-attribute mapping for each position; supporting attributes may be lower. Do not use an irrelevant supporting attribute as a loophole to create a disguised elite monster. Choose sensible supporting values consistent with the weak roster-filler brief; the owner has not authorized exceptional supporting specialties.

Provide all 12 attributes: Speed, Agility, Strength, Awareness, Catching, Arm, Accuracy, Blocking, Tackling, Coverage, Durability, Kicking. Each needs an inclusive integer level-1 starting range and individual potential range. Keep starting maximum at or below potential minimum so every independent roll is valid. Use the approved uniform rolls, immutable individuality and absence of a compulsory total-stat budget. Distinguish same-position builds across types; do not merely copy one profile twelve times. Do not apply legacy type/Nature bonuses on top of these authored values.

Basics have **no unique football ability and no unique Beast Clash ability**. Represent absence explicitly, using null/empty values as appropriate to the documented schema. Do not create dummy abilities, cooldowns, charges, mastery awards or fictional ability descriptions.

They receive everything else regular monsters receive under normal eligibility rules: shared type matchups and shared type moves, same-type zone neutrality, Clash archetypes and existing archetype perks, statuses, environmental modifiers, teammates' eligible buffs/targeted effects/zones, training, Temper, individual potential, and normal eligible nonlegendary Apex generation. No new shared mechanic is authorized. Same-type field neutrality still applies; “can benefit from zones” does not override it. Harmful effects and targeting exclusions likewise apply normally.

Keep the selected Apex exception: eligible Basic individuals have the same approved 1% initial roll, 10–15 starts, all-99 potential, neutral Temper and ageless rules. Do not turn their family rarity into Legendary or remove the exception because ordinary Basic ceilings are lower. An instance does not reroll Apex on acquisition, evolution or reload.

Do not implement the owner's future boost concept. It is a future idea: a teammate might temporarily boost a recipient while disabling its unique ability, making ability-free Basics useful. No specific ability, strength, duration or creator has been approved.

## Exact Clash archetype allocation

Count families once, not forms or generated roster individuals.

| Archetype | Existing 72 | Add Basic | Target 192 |
| --- | ---: | ---: | ---: |
| Striker | 14 | 25 | 39 |
| Tank | 13 | 25 | 38 |
| Support | 15 | 23 | 38 |
| Disruptor | 15 | 23 | 38 |
| Balanced | 15 | 24 | 39 |
| Total | 72 | 120 | 192 |

Choose individual assignments within these exact totals. Spread roles across types and positions. Do not always make linemen Tanks, Fire monsters Strikers, or assign football positions deterministically to Clash archetypes. The archetype is a shared role, not a unique ability. Reuse existing attribute consumers and shared perks; do not invent an intrinsic Support heal or Disruptor status when the shared system does not provide one. Report any gap between an archetype's intended function and its existing shared mechanics in the audit.

## Names and art

Finish this creation batch first. The later owner-approved generator upgrade is specified in [SPRITE_GENERATOR_BRIEF.md](SPRITE_GENERATOR_BRIEF.md). Preserve the initial art as a baseline; follow its silhouette and sample checkpoints before revising the 120 appearances.

Create stable unique family/form IDs and names distinct from the original 72 and from one another. Ground designs in their type and football role while varying silhouettes, body plans and personalities. Basic rarity should look simpler than legendary designs without looking unfinished.

Inspect the existing sprite pipeline and use its actual pixel-art conventions, dimensions, animation frames, palette practices, transparency, orientation and asset registration. Do not assume the historical spreadsheet art fields alone specify the current renderer. Produce the real assets/recipes needed by that pipeline, not unrelated concept images. Reuse established art tooling; do not require an unavailable external generation service or invent an integration.

Provide a compact plain-language personality/appearance description per family, one useful positional strength, and explicit weaknesses. Produce review contact sheets grouped by position with labeled name/type/archetype, plus in-context sprite previews where the existing reviewer supports them. These art previews are expressly part of the owner's approved batch-creation review workflow. Avoid providing only tiny unlabeled sprites. Preserve existing monsters' art and IDs.

## Data and documentation deliverables

1. The 120 authored Basic family/form records with complete 12-attribute ranges and approved archetype totals.
2. Actual sprite assets or generation recipes compatible with the current art pipeline and any required metadata. Limit production adapters to what is necessary to review assets; do not enable Basic gameplay before the audit.
3. Generated family pages and positional comparison tables from the same structured data, not independently maintained duplicate ratings.
4. A manifest of all new stable IDs, names, type/position/archetype, asset references, and review status.
5. Art contact sheets and a concise review guide. The owner can reject selected designs without regenerating every family.
6. Updated data validation and documentation reflecting Basic's legitimate lack of unique abilities. Preserve the original 144 mode abilities; Basic does not automatically add another 240 entries.
7. Updated count reporting: 192 families, 222 forms, 12 types, 120 Basic families, 12 original legendary families. Keep authored counts distinct from generated individual counts.

Preserve schema/source provenance. Record imported ability details as subject to later shared overrides, not proof that every old source row is still current. Keep the previous 72-family validation context labeled rather than falsely claiming the expansion has already passed it.

## Exact functional acceptance gates

- 120/120 required type-position combinations, exactly one new Basic family in each; zero omissions or duplicate combinations.
- 120/120 standalone families; zero added evolutions or unique mode abilities.
- 120/120 include all 12 starting and potential range pairs: 1,440 complete pairs; zero invalid endpoints, missing values, starts above potential minima or Basic primary maxima above 59.
- Exact Basic and final archetype counts from the table; zero duplicate new IDs/names or collisions with existing identities.
- Existing 72-family/102-form attribute values, rarity amendments, positions and abilities unchanged except an explicitly approved later correction; report zero unintended differences.
- 120/120 designs have resolvable art references and review contact-sheet entries. Verify actual required dimensions/frames/transparency against the inspected pipeline. Owner art approval remains a human review, not an automated claim.
- All generated local documentation/data links resolve. Re-running generators is deterministic for the same authored inputs and build seed.

Revise the current validator to support Basic families without unique abilities and to report existing and expanded counts separately. Do not merely change constants to make missing data pass. Distinguish profile/art validation from production ability tests.

## Duplicate and long-career audit

After authoring, audit generation and player-facing repetition with the actual generator available on the target branch. If it still uses legacy generation rather than approved Task 8 profiles, label that result explicitly and provide a separate approved-model reference experiment; do not claim one validates the other.

Track separately:

- Family repeats: expected and allowed. Count appearances by position and acquisition channel.
- Exact creation-profile repeats: same family/form, all starting ratings, individual potential, Temper and Apex designation. Exclude name, ID, timestamp and seed from the comparison so trivial metadata cannot hide a duplicate. Also report a family-level canonical fingerprint if evolved form differs.
- Near-identical builds: publish the similarity definition and per-position attribute choice before interpreting results. Present thresholds as audit assumptions requiring review, not an approved new gameplay mechanic.
- Apex generation: eligibility, total roll opportunities, count, observed rate, type/position/family distribution and repeatability. Multiple Apex individuals of a family are allowed; 60 original eligible families is not a lifetime instance cap. Basic adds 120 eligible families, for 180 eligible families in the expanded authored roster. Legendary families remain excluded.
- Player exposure: actual draft selections offered and scouting prospects seen over 20-season careers, separately from all AI-roster generation and unseen pools. Freeze and report draft sizes, scouting frequency, seeds, roster attrition and sample size so the results are reproducible. Do not invent acquisition rules to obtain favorable diversity.

Keep the approved initial 10,000 eligible Apex-roll report at 1%; expected count is about 100, not exactly 100. Exact duplicates are reportable findings, not proof of a bug by themselves. Do not promise uniqueness or add automatic rerolls/quotas to suppress repeats. Additional generation samples and career scenarios can be proposed as audit methodology; label them rather than claiming the owner already selected all sample sizes/tolerances.

## Authoritative Beast Dex and workbook override

GitHub is the single source of truth. An Excel workbook is not required; disregard older workbook-update requirements. An Excel export may be added later, but is not a prerequisite or deliverable of this assignment.

## Technical audit after Basic creation

Read the current code, SPECIFICATION_BASELINE.md, later owner-approved rules, and remaining specifications. Do not stop the creation batch to ask about unrelated final implementation details that can be recorded for the audit.

Return one consolidated audit separating:

1. Confirmed existing code/data behavior and its exact commit.
2. Approved gameplay requirements ready to implement.
3. Pure engineering choices Claude can make without changing gameplay.
4. Real contradictions or missing gameplay decisions, with recommendations and concrete examples.
5. Balance/performance questions that need tests against agreed targets rather than invented certainty.

Initial inherited and opposing rosters should reflect prior development at creation. The amount of simulated prior training and initial unspent points remain unresolved; do not award free points on signing/trading/reloading or silently settle that policy. Include the later progression decisions recorded in PROGRESSION_DECISIONS.md.

Deliver a reviewable development branch and exact commits, new-family index, asset review sheets, static validation results, duplicate/Apex reports with methodology, and a single necessary-decision list. Do not claim full Task 8 completion. Do not merge or publish the live game without a separate instruction.
