# Task 8 pre-flight: baseline, sources and blockers

Prepared 2026-11-06, before any Task 8 implementation. No gameplay code has changed.

## Handoff baseline

| Item | Value |
| --- | --- |
| Branch | `task8-basic-families` |
| Baseline commit | `d65c1a50315e27e0519fbfd88e24d52def9a8935` (`d65c1a5`) |
| Docs-only commit after the baseline | `cbd0d77` records the paused art work; it changes no code or data |
| Contains `main` | yes, `43976f4`: the Task 7 release v42.22.0-free-agency, merged PR #95 |
| Contains the Beast Dex branch | yes, `docs/beast-dex-approved-profiles` at `c5d9d14` |
| Game version | 42.22.0, unchanged |
| Full test suite at baseline | 895 tests; 893 passed. The 2 release-stamp failures were fixed in `d65c1a5`, then rechecked 2/2. |
| Task 8 development branch | `task8-implementation`, created from `cbd0d77` |

## Beast Dex contents (verified)

| Check | Result |
| --- | --- |
| Families | 192: 72 original (26 Common, 21 Uncommon, 13 Rare, 12 Legendary) and 120 Basic |
| Forms | 222: 102 original and 120 Basic |
| Basics | 120 families, one form each at stage 0, no evolution level, `abilities` Football/Beast Clash both `null` |
| Mode abilities | 144: 72 Football and 72 Beast Clash, two for every original family. Each has 8 detail sections (trigger, targets, resolution, recharge, lifetime, exceptions, visuals, progression). |
| Original records | Unchanged against `data/original-baseline.json` hashes |
| Validator | `render_and_validate.py` PASS (28,471 assertions, 0 failed); self-test 13/13 |

## Authoritative sources identified

1. **Consolidated Task 8 specification, Revision 1** ("owner decisions through November 5 2026"). It is the attached `Gridiron_Beast_Task_8_Consolidated.docx`. The repository copy is `docs/beast-dex/SPECIFICATION_BASELINE.md`.
   - The two match in content. The only differences are in table layout: where the sample-factor column sits.
   - The repository copy is labelled historical for profile, rarity and evolution statements. It remains authoritative for the shared engine requirements.
2. **Beast Dex data** in `docs/beast-dex/data/`: `families.json`, `forms.json`, `abilities.json`, `rules.json`, `basic-authoring.json`.
3. **Later owner decisions** in the Dex package: `APPROVED_RULES.md`, `PROGRESSION_DECISIONS.md`, `BASIC_CREATION_BRIEF.md`, plus the Cindruff correction in `rules.json`.
4. **Open-item registers:** `UNRESOLVED.md` (R01–R15) and `BASIC_AUDIT.md` §4.4 (11 Basic integration decisions under owner review).
5. **Existing reviewer:** the football Ability Reviewer is the Ability Audit screen (`src/ui/screens/ability-audit.js`, with `src/ui/dev-review.js` and `src/franchise/review-store.js`). There is no Beast Clash reviewer yet.

**GitHub is authoritative.** The workbook (v18) is not required.

## Readiness: the specification declares itself not ready

- **The specification:** "The implementation package is not yet ready for an unattended start: the release dependencies and remaining specifications in Section 18 must be closed first. These are explicit blockers, not permission for Claude to invent gameplay."
- **The Dex README:** "This is not yet the no-questions Claude handoff."
- **`UNRESOLVED.md`:** still lists R01–R15.

## Missing documents or specifications

| ID | Missing | Blocks |
| --- | --- | --- |
| R02 | A pinned final Dex revision and hash, and synchronized ability text. For example, Blazing Resolve in `abilities.json` still says "one live second"; spec §9 overrides it. | Formally starting the handoff |
| R01 | Generation age and level rules; the natural-growth schedule (per level, per attribute); evolution entitlement math | Generator, level-ups, evolution |
| R03 | Attribute contest weights, pancake contest rules, telemetry definitions (viable window, protection success, gap responsibility) | Football grading, OL/DL/LB/CB/S grades, pancake |
| R04 | Reserve level XP, offseason eligibility stamp, partial-participation training bonus, score denominators | Reward transactions |
| R05 | Career-test schedules, seeds, ages, allocation policies, tie rules | Pacing gates and tuning |
| R06 | Apex contract value, sampling among the neutral Tempers and of the 10–15 starts, discovery persistence | Apex |
| R07 | Destination payload of each status creator; within-play disable and recovery (for example Stunned recovery) | Shared statuses, about 100 abilities |
| R08 | Integer rounding for damage, heal, shield and transfers | Clash abilities |
| R09 | Event-phase order for delayed effects, protection, cleanse, retaliation, KO, whistle | Ability runtime |
| R10 | Clash support and prevention attribution arithmetic | Clash grading |
| R11 | Kick target selection, distance metric, retry grouping | Kicker grading |
| R12 | Stamina, Afflicted and legacy fatigue integration; exhaustion timing | Stamina system |
| R13 | Save and resume boundaries; partial training refunds on age change; fractional display; reward recovery | Saves and training UI |
| R14 | Field and object caps, spawn tie rules, the performance scene set | Fields, objects, performance gates |
| R15 | Per-ability 100-case matrix and numeric tolerances | Functional coverage gate |
| Basic §4.4 | 11 decisions. The most important: Basic frequency per acquisition channel; the shared type-move set (a Basic cannot battle without a move, and no shared moves are specified); Dex milestones; Apex share for Basics; AI roster use; contracts | Putting Basics into any pool or into Clash |

## Conflicting rules found

1. **Scope.**
   - Spec §1 scopes Task 8 to 72 families, 102 forms and 144 abilities. The Dex now has 192/222, with the 120 Basics.
   - `rules.json` marks Basics "not implemented in the game", and their integration decisions are under owner review.
   - **To confirm:** are the 120 Basics in Task 8 scope, and with which channel and Clash rules?
2. **Natural growth.**
   - Spec §6: automatic growth is capped at a rating limit `S + floor((P−S)/2)`; after training passes that limit, skipped natural gains are not awarded.
   - `PROGRESSION_DECISIONS.md` (Nov 6, later): automatic growth is "a contribution allowance, not a cap on combined current rating … automatic gains can still apply up to the individual ceiling".
   - Both documents say later decisions override, so the Nov 6 rule appears to govern. The spec's limit and its example (S=40, P=78 → 59) still describe a cap.
   - **To confirm:** which governs.
3. **Source precedence.**
   - The spec ranks itself first, then the Dex. `rules.json` `authority` ranks the Dex package's later decisions first.
   - Both agree that later approvals win. Recorded, not a blocker.
4. **Evolution.**
   - Spec §6 defers evolution growth.
   - Nov 6 decisions approve percentage-of-ceiling scaling (`round half up(old × newP / oldP)`), with three closure items still open in `rules.json`.
   - Not a conflict: the later rule applies. The closure items are R01.
5. **Superseded text inside `abilities.json`.** Blazing Resolve ("one live second"), and legacy status names (Burning) in Stoke the Flame and Falling Star. Spec §9 and §10 govern. To be cleaned at R02; no decision needed.
6. **Apex and Basics.** Spec §5 grants the 1% Apex chance to "eligible newly generated nonlegendary individuals". With the 120 Basics, about two-thirds of Apex individuals would be Basic (`BASIC_AUDIT` §4.4 item 7). **To confirm:** is this intended?

## Deferred art (owner decision, 2026-11-06)

See `docs/beast-dex/art/GENERATOR.md` § Deferred art work. The existing Basic sprites are the temporary Task 8 art.

## Proposed next step (needs owner choice)

Implementation does not start until the owner chooses. No missing rule is invented. The options:

1. **Close the blockers first,** as the spec requires.
2. **Run spec Phase 1 now.** It changes no gameplay: pin the baseline, run baseline tests, inventory the ability, status, progression, Clash, rendering, reviewer and save paths, and write the field-by-field implementation map and test manifest.
3. **Implement the fully specified subsystems** (Temper, the training-cost model, mastery thresholds and credits, the shared-status core, the reviewer frameworks), with each blocked item stubbed and listed.
