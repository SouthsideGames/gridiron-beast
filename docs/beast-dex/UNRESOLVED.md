# Remaining specifications before the final Claude handoff

## Resolved profile correction

The owner approved Cindruff’s starting Coverage **8–18**, replacing **23–33**. Potential remains **23–33**. Every starting roll is now valid with every independent potential roll. This correction is applied to the structured data and generated family page. No other profile numbers changed.

## Evolution and progression closure

The owner selected percentage-of-ceiling current-rating evolution (10/20 → 20/40). The starting-reference-relative and unchanged-current alternatives are superseded. Still specify:

- How natural level-growth entitlement is recalculated after evolution without duplicating current-rating gains.
- How permanent development and age-decline ledgers map during evolution without erasing aging losses.
- Integer rounding behavior across different voluntary evolution timings, verified with boundary cases rather than promising perfect invariance.
- Level/age generation and evolved-form acquisition policy; level-1 rows are reference data, not a policy to generate low-level evolved forms.

## Existing consolidated Task 8 release dependencies

The 72-family/102-form starting and potential ranges are now approved including the approved Cindruff correction. Their existence does not close all of the consolidated document's R01–R15 items.

- R01: final generation age/level rules, natural growth schedule and integration of evolution math.
- R02: review and synchronize the workbook/specification with this dataset, pin final GitHub revision and hash. This branch is an initial consolidation, not final certification.
- R03: audit the actual Task 7 integration branch, exact attribute contests/pancake formulas and performance telemetry.
- R04: reserve XP and post-level-50 eligibility, offseason qualification, partial participation and denominators.
- R05: fixed career test schedules/seeds/creation ages/AI allocation and tuning selection rules.
- R06: Apex contract value, exact neutral/start sampling and discovery persistence.
- R07: status payloads and remaining within-play disable/recovery contracts.
- R08: damage/heal/shield rounding and bounded transfers.
- R09: event phases across delayed effects, protection, cleanse, retaliation, KO and whistle.
- R10: Clash support/prevention attribution without duplicate credit.
- R11: kick placement targets/distance, retry grouping and boundaries.
- R12: stamina/Afflicted/legacy fatigue/Clash resource integration.
- R13: save/resume boundaries, partial training refunds and fractional display/reward recovery.
- R14: field/object caps, safe spawn ties and performance scenarios.
- R15: complete per-ability functional case matrix and numeric tolerances; visual/reviewer coverage.

Basic creation is now authorized by BASIC_CREATION_BRIEF.md: 120 standalone families, with shared type moves and existing archetype perks retained, but no unique mode abilities. The 120 families are now authored as design data and art (pending owner review; see BASIC_INDEX.md and BASIC_AUDIT.md). They are not implemented in the game. Later progression approvals are recorded in PROGRESSION_DECISIONS.md and require technical reconciliation.

All production tests, balancing, mobile measurements, ability reviewer updates and owner visual checks remain implementation work. No runtime test is claimed by static profile validation.

## Phase 1 audit (2026-11-06)

[`docs/TASK8_PHASE1_AUDIT.md`](../TASK8_PHASE1_AUDIT.md) checks each R01–R15 item against the later GitHub rules, with citations. It lists the genuine remaining gaps and consolidates them, together with the Basic integration items and the gaps found in the code audit, into one numbered batch of 40 decisions with recommendations.

The spec appendices A–C were missing from the repository. They have now been imported as [SPECIFICATION_APPENDICES.md](SPECIFICATION_APPENDICES.md).
