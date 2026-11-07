# Later approved progression decisions

These owner decisions were made after the initial GitHub profile consolidation. They are design requirements for the audit and supersede conflicting historical statements. Exact engine bookkeeping still needs reconciliation rather than an invented implementation.

- Evolution preserves current permanent rating as a percentage of individual potential: oldCurrent / oldPotential × newPotential; nearest whole number, halves up, capped at new potential. Temporary modifiers are excluded and reapplied normally. This is not starting-reference-relative scaling.
- Preserve the separate contributions of automatic growth and training through evolution proportionally; do not create training points, replay old level rewards or turn training into automatic growth.
- Preserve and proportionally scale the aging-loss ledger rather than clearing decline. Example: developed 30/40 with a 4-point age loss becomes developed 45/60 with a 6-point loss, leaving 39/60. Reconcile rounding of developed/loss records with the authoritative resulting permanent-rating calculation.
- Automatic growth contributes half the gap from the individual's level-1 starting reference to potential, rounded down. It is a contribution allowance, not a cap on combined current rating. Early training does not reduce the remaining allowance; automatic gains can still apply up to the individual ceiling. Increases that cannot fit at the ceiling are skipped, not converted to points or another attribute.
- Spread automatic growth across levels 2–50 using cumulative entitlement. Evolution preserves the fraction of the automatic allowance already earned and the existing level schedule. Do not replay previous rewards or restart the schedule. Freeze the exact remaining-entitlement math during audit, including ceiling-truncated awards and rounding.
- An unfinished training bar keeps its funded percentage on evolution, with no charge or refund. This supersedes earlier ambiguous evolution-refund wording. Do not assume this changes the separately approved handling of age-related cost changes.
- Generate higher-level newcomers consistently from their level-1 individual rolls and the same growth/evolution model. No reroll at evolution. Do not generate an evolved form below its required level. Preserve existing acquisition age/level rules unless an actual conflict is documented.
- Initial league rosters, including inherited player and opposing teams, should reflect some prior career training. This applies on initial creation, not on signing/trading/loading/training an existing individual. The amount, allocation formula and initial banked/partial points remain to settle. Draft/scouting prospect policy must be considered separately; do not generalize initial-veteran approval into unlimited past training for every prospect.

The owner approved remaining-growth bookkeeping principles; the final audit must demonstrate that they coexist without double rewards, erased training, erased aging, repeated evolution gains or unintended rounding benefits.

## Owner decisions, 2026-11-06 (Task 8 pre-flight)

- **Natural growth: the Nov 6 allowance rule governs.**
  - Compute automatic growth from the approved starting rating and the individual ceiling, independently of training investment. Early training does not reduce the allowance.
  - All gains remain bounded by the individual ceiling. Reaching the ceiling never creates overflow or bonus training points.
  - The Nov 5 rating-cap wording in the consolidated specification (§6 *Natural growth*) is superseded. It is marked so in `SPECIFICATION_BASELINE.md`.
- **Task 8 scope includes all 120 Basics:** 192 families and 222 forms in total.
  - Basics have no evolutions and no unique football or Beast Clash abilities.
  - They keep the normal shared type rules, their Clash archetypes, the development systems and eligibility for teammate effects.
  - Their unresolved integration decisions remain for owner approval: appearance rates, shared Clash actions, Apex distribution, contracts and roster generation. Inclusion in scope does not authorize inventing those rules.
