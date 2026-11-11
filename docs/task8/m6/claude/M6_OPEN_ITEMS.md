# M6 open items and next preview build (2026-11-11)

**M6 is open. Task 8 is not complete. Nothing is merged.** Branch `task8-m6-integration`; runtime commit d544fec.

## Acceptance gates

| Gate | State | What closes it |
| --- | --- | --- |
| Engine CPU, at most 10% slower than main in every scene | Passes in all 13 scenes in three runs; every row provisional under the noise rule | Owner accepts the conditions, or a steadier machine |
| Ability overhead, provisional budget 1.25 | **A1 and X1 over.** A2–A5 not resolved on this host. No scene confirmed inside | Garbage-collection investigation; steadier measurements; then a ruling on the budget |
| Desktop frame time, live Auto and saves | Measured: 60 FPS, one 50 ms hitch in a minute of Auto | Nothing more on desktop |
| Phone performance (60 FPS target, 30 FPS mode) | **Not measured** | Owner's iPhone 17 Pro Max checklist; other phones remain uncovered |
| Apex: 90% all-99 by season 15 | **Cannot be met under current rules** | Owner decision on the proposal in `APEX_OPTIONS.md`, then implementation and a rerun |
| Mastery in 3–6 seasons of sustained use | **Not met**; authorized thresholds cannot meet it | Owner decisions 1–4 in `MASTERY_FINDINGS.md` |
| Ordinary pancake targets | Not met at defaults; qmax 0.10 with b 0.30 meets all three | Owner approval, then its own simulation commit |
| Played starters: 75% reach level 50 in 8 seasons | Met for mixed-mode starters (26 of 26); 70.1% for all eight-season starters | Owner's reading of the gate |
| Legendary limit, gym preference, roster coverage | Met | — |
| Economy recalibration (item 30) | Reported; no change recommended | Owner picks option A or B in `ECONOMY_FINDINGS.md` |
| Apex contract ask (B9) | Approved but not implemented: it would reveal a hidden Apex | Owner ruling on concealment |
| Owner visual review; wording | Not done | `OWNER_REVIEW_CHECKLIST.md` |

## Owner decisions waiting (none implemented, none assumed)

1. **Apex training:** activity ×2 and offseason 2 + 32 for Apex only (or the single-number alternative, offseason 2 + 35).
2. **Pancakes:** qmax 0.10, b 0.30.
3. **Mastery:** football pacing (keep, or at most 2 credits a game); Foresight's condition; AI Clash lineup rotation; rare triggers.
4. **Economy:** cap room A or B; Apex ask against concealment.
5. **Played-starter gate:** whether "mixed-mode starters" is the population that counts.
6. **Apex generation rate:** whether one Apex per club after 20 seasons is excessive (the rate comparison runs only if so).
7. **Presentation:** interrupted Apex panel; all attributes trainable; free-agent cards discover an Apex; achievement wording;
   Clash summary wording; "Full rules" visibility. Graphics presets stay deferred.
8. **CPU conditions:** whether the quiet-host runs are accepted as the official measurement.

## Not verified

- Any physical phone.
- A human-played mixed-mode cohort (all long runs are hands-off).
- Apex season counts on an implemented rule (the proposal is measured in a harness).
- The cause of the longer garbage collections with abilities on.

## The build to publish next to the private testing link

**`task8-m6-integration` at d544fec, labelled v43.5.1-t8-m6-preview**, packaged the same way as version 9.

- It is the published build (v43.5.0-t8-m6-preview, runtime f9e7581) plus the field-cost pass. Play outcomes are identical;
  saves from version 9 load unchanged (schema 10).
- **Why publish it although nothing looks different:** the iPhone test should run the code that would ship. Scene 3 of the
  checklist (overlapping fields) exercises exactly what this pass changed.
- **Condition:** the full regression on d544fec passes. **It does: 2,014 of 2,014, no failures, skips or cancellations**.
- **Not included:** any tuning or rule change. Pancakes, Apex training, mastery and the Apex ask all wait for decisions; each
  would be a later simulation commit and a later build.
- It is published only on the owner's instruction. The live game link and the other private link are not touched.
