# M6 status: what is done, what fails, what is provisional, what waits for the owner (2026-11-11)

**M6 is open. Task 8 is not complete. Nothing is merged into main and no public release was made.**

- Branch `task8-m6-integration`; runtime commit **d544fec** (M6 screens plus the outcome-identical field-cost pass).
- Private testing link: **v43.5.1-t8-m6-preview**, version 10, built from d544fec (preview branch 51113e2).
- Decisions are collected in `DECISION_SHEET.md`.

## 1. Completed checks

| Check | On | Result |
| --- | --- | --- |
| Full regression | d544fec, frozen copy | 2,014 of 2,014; no failures, skips or cancellations |
| Outcome identity of the field pass | d544fec against 9421635 | 19 scene variants and 12 full games identical |
| Franchise hash, seed 1, one season | d544fec | Equal to f716b02 and f9e7581 |
| Published build equals the commit | preview version 10 | Label v43.5.1; the two changed files have d544fec's SHA-256; 412 modules stamped; 0 page errors |
| Engine CPU against the fixed pre-Task 8 baseline (main 43976f4) | three protocol runs | Under 1.10 in all 13 scenes each time (provisional, see section 3) |
| Desktop frame time and live Auto/save | f9e7581, headless desktop | 60 FPS in every scene; one 50 ms hitch in a minute of Auto |
| Legendary limit, kickers counted offensive | 1,220 club-seasons | 0 violations |
| Gym acquisition prefers its element | 8 gyms | 2.7 to 4.0 times the league share |
| Roster position coverage before kickoff | 8,505 club-weeks | 0 flags; the two "missing kicker" rosters were a snapshot-timing artifact |
| Market integrity | 60 free-agency markets | 0 problems |
| M6 screens: tests and headless browser check | f9e7581 | 11 of 11 tests; 34 browser checks; saves from earlier previews load |

## 2. Remaining failures

| Gate | Measured | Next step |
| --- | --- | --- |
| Apex: 90% of sustained starters all-99 by the end of season 15 | Current rules: 0%. Validated candidate (×2 and 42 offseason): 96 of 96 sustained starters; not adopted | Owner approval (decision 1) |
| Mastery in 3–6 seasons of sustained use | 475 of 2,859 sustained starters; 1,754 never | Owner decisions 3, 4, 5 |
| Ordinary pancake targets at defaults | 0.861 a game, 51.4% success (targets 0.2–0.6, 30–50%) | Owner decision 2 (qmax 0.10, b 0.30 meets all three) |
| Ability overhead within 1.25: overlapping fields (A1) | 1.36–1.40 after the pass (was 1.60) | Garbage-collection diagnosis, `GC_DIAGNOSIS.md` |
| Ability overhead within 1.25: worst case (X1) | 1.44–1.50 | Same; expected to stay over even if that work succeeds |
| Apex contract ask (B9) | Approved, not implemented | Owner decision 8 |
| Foresight | 0 executions in 563 starts | Owner decision 4 |

## 3. Provisional measurements

| Measurement | Why provisional | Reading |
| --- | --- | --- |
| Every CPU ratio (engine and ability) | Spread above 10% of the median on the shared host, under the existing noise rule | Engine: comfortably under the limit. Ability: see next rows |
| Ability overhead A2, A3, A4, A5 | Moved by up to 0.27 between runs of the same code | Not resolved: neither passing nor failing |
| The 1.25 ability budget itself | Provisional by ruling | Unchanged |
| Played-starter gate | Met for 26 of 26 mixed-mode starters (small sample); 70.1% for all eight-season starters | Depends on owner decision 9 |
| Mastery under a 2-credit limit | Projection from measured counts, not a simulated rule | Confirm after implementation if chosen |
| Apex candidate, controlled cohort | Harness, every activity played, no injuries | Superseded by the real-career validation |

## 4. Not measured

- **Any physical phone.** The iPhone 17 Pro Max checklist is `PHONE_TEST_CHECKLIST_IPHONE17PM.md`. Other phones stay uncovered.
- A human-played mixed-mode cohort (all long runs are hands-off).
- A CPU-throttled browser run; battery use.
- What exactly survives the engine's minor collections with abilities on.

## 5. Owner reviews

- **Decisions:** 17 on `DECISION_SHEET.md`.
- **Visual and wording review:** `OWNER_REVIEW_CHECKLIST.md` on the private link.
- **Phone test:** the iPhone checklist on the private link.

## 6. Work I can continue without a decision

- Finishing the garbage-collection diagnosis (no production change), if you approve its scope.
- Further Apex candidates in the real-career harness, if you name them.
- Nothing else in M6 is unblocked: every remaining item needs a ruling, a review or the phone.
