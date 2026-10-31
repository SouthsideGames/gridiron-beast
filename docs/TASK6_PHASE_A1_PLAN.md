# Task 6 Phase A-1 — Implementation Plan (Stage 1)

**Scope.** Phase A-1 only, as authorised on 2026-10-30: ageing, age-adjusted training, retirement, the old-save transition, and career-stage labels and notices.

**Authority.**
- `docs/TASK6_APPROVED_SPECIFICATION.md` §1.1–§1.5;
- `docs/TASK6_DECISIONS.md` (Group 1);
- the planning module `tools/task6/aging-proposal.mjs`, whose values are carried into game code unchanged.

## Components

| # | Component | Where | Notes |
|---|---|---|---|
| 1 | Ageing rules (pure functions): position curves, hidden longevity from the id, durability shift, public and true onset, decline amounts, training costs, hazard, retirement odds, transition, forecast, career stage | **new** `src/data/aging.js` | The values of the approved spec. No stored longevity |
| 2 | Age-adjusted training | `src/data/monsters.js` `levelUp`, `spendPoint`, `autoSpendPoints`; new `pointCost` | A physical pick in a level-up succeeds with probability 1/cost (a draw only when cost > 1). Manual points cost `cost`. Auto-spend weights by position weight ÷ cost, affordable options only. Ageless monsters are exempt |
| 3 | Ageing and decline in the offseason | `src/franchise/progression.js` `offseason(roster, rng, ctx)`; callers `startNextSeason`, `leagueAgeing` | Replaces "−1/−2 speed, agility, durability from 30". Growth to 23 is unchanged. Physical loss past the true onset; technical loss past the technical onset; −1 physical after a severe injury past onset; transition decline cap; durability at peak recorded once (`m.durPeak`) |
| 4 | Unsigned monsters age too | `startNextSeason` (pools, waivers) | The same `offseason` rules (risk 6 of Group 1) |
| 5 | Retirement pass | **new** `src/franchise/retirement.js`, called in `endSeason` before the owner's offseason opens and before AI contracts | AI clubs, the owner's roster, pools and waivers. Hazard at next season's age; one injury factor; role multipliers (career-high overall `m.peakOvr`); unsigned ×2; transition ramp and the 15% club cap. Fixed order, the franchise generator |
| 6 | Exits | `removeFromClub(..., { reason: 'retired' })` and `leaveLeague` for AI; owner: off the roster, lineup and captaincy cleaned, history reason `retired`; pools and waivers removed | Legend stub when decorated (existing rule), a career-record top 10, or a former owner monster. A `retire` League News event. Owner's retirees always keep a stub |
| 7 | Transition for old saves | `f.aging = { v: 1, native: true }` at creation; an old save gets `{ v: 1, from: <year> }` at its first new-rules offseason | s = year − from + 1; ramp min(1, s/4); decline cap 2s; club cap 15% while s ≤ 3 |
| 8 | Notices and labels | News (each owner retiree; a league summary line); `f.retirementsLast`; monster screen career stage, retirement outlook (observable forecast), per-attribute point cost on the + buttons | Phone width checked |
| 9 | League News volume | `league-news.js meaningfulMove` | A retirement stands on its own only if decorated, a starter, 65+, a former owner monster or a nearby club (the existing rules). Otherwise it is counted in the summary |
| 10 | Validation tooling | `tools/franchise-soak.mjs runFranchise({ from })`; **new** `tools/task6-transition-check.mjs` | Old saves are made by the frozen v42.17.0 tree and played forward under A-1 |
| 11 | Focused tests | **new** `tests/aging-retirement.test.js` | Rules, costs, decline, legendary exemption, retirement exits and integrity, transition, determinism, save round trip |

## Sequence
1. Write the `aging.js` rules, with unit checks against the planning module's values.
2. Wire training costs into `monsters.js`.
3. Change offseason ageing (owner, AI, unsigned) and record durability at peak.
4. Add the retirement pass and its exits, the transition field, and News.
5. Add the UI: labels, outlook, costs, notices.
6. Write the focused tests and a short smoke soak (1 seed × 3 seasons).
7. Write the transition tool.
8. Development preview (Stage 3), then consolidated validation (Stage 4).

## High-risk areas (verified before building on them)
- **Registry integrity after retirements.** No orphaned ids, no protected monster removed, and the roster floor held through the offseason. Check: `verifyLeague`, the soak invariants and `validateClubs`.
- **Owner's roster below the minimum** after retirements. The owner signs free agents before `startNextSeason`, which already blocks with a message; the soak owner fills to the minimum.
- **Determinism.** New draws in `endSeason` and `offseason` shift later streams. Results stay deterministic; stored hashes change (expected).
- **Save compatibility.** Additive fields only (`m.durPeak`, `m.peakOvr`, `f.aging`, `f.retirementsLast`). Old saves load; the first offseason starts the transition.
- **Balance.** Turnover rises to about 30 a season. The nudge and free agency refill. §45.6 and drift are re-measured in Stage 4. A-1 does not change the nudge (that is A-2).

## Decision on timing (within the approved rule)
Retirement is decided **when the offseason opens** (at the season's end, before contracts and the draft), using the age the monster would play next season. Ageing and decline apply at the season start as today.

**Why:** the owner learns of a retirement while the draft and free agency can still respond.

**The approved rules met:** offseason only, before free agency.

**Difference from the planning model:** the model rolled retirement after that offseason's decline. Here the role tests read the overall before decline, so slightly fewer reserves count as "declined". The effect is measured in Stage 4.
