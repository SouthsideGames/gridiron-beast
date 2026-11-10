# Approved Clash follow-up — 2026-11-09

Development branch: `codex/task8-presentation-followup`. Main, the live game and the private preview are unchanged.

## Scope and source

The owner requested continuation of all remaining work while explicitly waiving browser verification. This change
implements approvals already recorded in `APPROVAL_REGISTER.md`, N9c A/B/C/E/G/H. It grants no new gameplay approvals.
The branch includes `task8-fx-finish-2` at `7998b23` and its Sovereign Arm reload fix. The inspected Clash reconciliation
head `30689c7` is already an ancestor; there is no competing branch change to merge.

## Changes

- Replacement attacks (Iron Bite, Daybreak Lance, Circuit Breaker) remain special attacks without ordinary-only perks.
  Boosted normal attacks (Radiant Pursuit, Night Swoop, Predator Rhythm), plus Mind Game's ordinary trick attack,
  retain normal-attack identity and applicable perks. Identity no longer changes merely because a perk is not decisive.
- Dawn Song heals the active caster and schedules its later pulses for that same caster. Existing turn/rotation eligibility
  and cancellation behavior remain in place. Full health preserves readiness.
- Feather Relay counts as voluntary for Cinder Clamp, Riptide Pursuit, Cold Welcome and Shell Harvest; its approved
  exemption from the half-strength entry penalty remains intact.
- Clear Light's cooldown counts owner normal turns. Its conflicting heal values remain gated at Developing, Expert and
  Mastered; Practiced can cleanse and heal normally because both source texts agree at 10%.
- Falling Star and Faultline target the active position when the impact begins. Already-due impacts resolve before the cap
  check, as before. The separate question about not-yet-due impacts at the cap remains open.
- Resolved gates no longer block normal play or display provisional/awaiting labels. Reviewer scenarios now demonstrate
  the approved behavior without provisional mode. Genuine unresolved contracts retain their gates.
- Completion accounting distinguishes approved gates from unresolved ones. Historical headless evidence is preserved;
  it is not represented as fresh browser verification.

## Baseline evidence

The original `tests/clash/fixtures/golden-t8.json` is unchanged. Enabling the approved Dawn Song heal changes exactly
seeds 4 and 14 of its 20 battles. `golden-t8-n9c.json` records both original and replacement hashes, cites N9c B, and is
applied only to those cases. The test verifies that the changed cases actually contain Dawn Song healing. The other
18 cases retain the original exact hash and final-state checks. No seed was changed.

## Validation

- First affected ability-contract batch: 604/604 passed.
- Core, gate, reviewer, franchise and rotation checks: 43/43 passed.
- Broad Clash, Task 8, encounter, save and release checks: 1,181/1,181 passed before the last attack-identity and Clear Light
  scenario cleanup; this is an intermediate result, not final-revision coverage.
- Final targeted follow-up: 120/120 passed, including the new N9c checks and Clear Light scenarios.
- Full repository regression: running; final result to be recorded below before publication.
- `git diff --check`: passed.
- Browser verification: explicitly waived by the owner. No fresh browser, physical-mobile or performance measurement
  is claimed by this follow-up.

## Current completion accounting

- Football presentation: 70 complete, 2 partial (Foresight and Prism Break).
- Clash presentation: 71 complete, 1 partial (Clear Light).
- 144 registered abilities; 816/816 form/mastery variants accounted for.
- 13 Clash abilities still intersect genuinely unresolved behavior. Presentation completeness does not imply that every
  gameplay reading has been approved or that final owner visual acceptance is complete.

## Remaining decisions and verification

Preserve the existing proposals and request explicit rulings on Foresight's pre-choice setup, Prism Break's measuring
reference/event order, Bloom Break's goal-line reapplication, and the opponent inspect information policy. Raw mechanic
text still needs editorial cleanup against approved contracts. Do not invent new player-facing mechanics.

Clash questions still open: Core-versus-Progression values (Daybreak Lance, Clear Light, Forge Swipe, Fortress), Stone
Divide's secondary-hit/retaliation scope, not-yet-due impacts at the cap, Tank bruise and exact battle-length rules. These
are owner decisions, not missing engineering authorization. M5/M6 requirements, finished-build performance measurement,
physical-mobile validation and final owner visual acceptance are not completed by this change.
