# Final Calibration Decisions and Targeted Implementation — report

Branch `impl/balance-audit-2026-11` (PR #191), 2026-11-26. Owner brief: "Final Calibration Decisions and Targeted Implementation".
Evidence is in `reports/balance-impl/decisions/`. Design text is in GDD §61.15.

## 1. Executive summary

@@SUMMARY@@

## 2. Decision tracker

| ID | Decision | Status | Implementation or finding | Validation | Remaining concern |
|---|---|---|---|---|---|
@@TRACKER@@

## 3. Cap transition (D-1)

@@CAP@@

## 4. Rookie and quarterback (D-2, D-3)

**Rookie quality −7 is production** (`src/franchise/franchise.js`, the Rookie difficulty row: `quality: -7`).
- AI development is unchanged: Rookie 0.6, Pro 1.0, All-Star 1.5.
- The gym correction, ceilings, progression and evolution are unchanged.
- Pro and All-Star are not tuned.
- Existing beasts keep their attributes. The value applies only to clubs and arrivals generated from now on. There is no rubber-banding.
- Quarterback Awareness and read timing are unchanged.

**Evidence: the earlier calibration measurement (no new 15-season study, as the brief asks).**
- The hands-off benchmark owner wins 50.0% at −7 and 35.7% at −4.
- Playoff seasons: 11 at −7, 8 at −4.
- Ordering under the 1.6 M cap: Rookie 50.0 > Pro 36.0 > All-Star 21.9.
- Source: `FINAL_CALIBRATION_REPORT.md` §4.

**Targeted test:** `tests/task8-identities.test.js` expects −7, and existing beasts are not reduced. It passes (section 8).

**Benchmark owner's money handling (optional):** not changed.
- It belongs to the tools only and does not affect the game.
- It is left for a later study, so the −7 figures stay comparable with the earlier ones.

**Sack rate (D-3): closed with no change.**
- The GDD now says the earlier 7.0%-of-dropbacks figure is not a target and is not enforced (§61.15.3, and the note in the Task 10 section).
- The measurement tools stay.

## 5. Run defense investigation (D-4, D-6)

@@RUN@@

## 6. Foresight (D-5)

**Implemented.** Foresight (Cerebrix, PSY-03-C) prepares its mirror and then makes the ordinary attack in the same turn.
- The active-foe restriction stays: it prepares only while the current active foe applies a harmful status.
- `chooseAction` returns `null` after preparing, so the ordinary attack follows.
- Root Communion, Eye of the Storm and every other ability are unchanged.

**Paired-method result:** 8,000 battles per arm, same seeds; `decisions/clash/cerebrix-A-d5.json`.

| Measure | Before (shipped: replaces the attack) | After (D-5: in addition) |
|---|---|---|
| Contribution, ability on minus ability off | −1.45 pp | **+0.16 pp** (SE 0.05) |
| Paired change against the shipped version | | **+1.61 pp** (SE 0.19); 235 battles change result |
| Preparations | | 1,270 (0.16 per battle) |
| Reflections | 178 | 195 (15% of preparations) |
| Foe with a status source | −11.9 pp | −5.0 pp |
| Foe without one | | −0.9 pp |

**Tests:** 112 of 112 passing in 8 files:
- `t8-abilities-f`, `t8-interactions`, `t8-review` (new scenario `prepares-and-attacks`), `t8-gate`;
- `task8-abilities-psychic-dragon`, `task8-identities`, `t8-n9c-rulings`, `implementation`.

They cover:
- eligibility;
- reserves and substitutions;
- prepare-then-attack;
- a defeated target;
- reflection;
- sequencing, the battle log and replay.

**Docs:** updated for the "in addition" wording:
- the Beast Dex ability text (`docs/beast-dex/data/abilities.json`, `families/cerebrix.md`);
- the generated Dex.

## 7. Roster depth and stamina (D-7)

@@STAMINA@@

## 8. Testing

@@TESTING@@

## 9. Remaining owner decisions

@@DECISIONS@@
