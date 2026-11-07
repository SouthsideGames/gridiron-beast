# Task 8 implementation log

Branch `task8-implementation`. Nothing here is merged or published. The specification is closed (2026-11-07 rulings); the build
follows `BUILD_PLAN.md`. The opening paragraphs below are kept as history.

## Foundation modules (no gameplay wiring)

| Module | Work package | What it does | Rule source |
| --- | --- | --- | --- |
| `tools/build-beast-dex.mjs` → `src/data/beast-dex.generated.js` | WP1 | Builds a browser module from the four GitHub Dex JSON files, with sha256 source hashes; `--check` fails when the module is stale | GitHub Beast Dex is authoritative |
| `src/data/beast-dex.js` | WP1 | Frozen read-only lookups: families, forms (`family:stage`), abilities by mode, archetype, rarity order (Basic below Common), evolution; no hash fallback to another family | Dex data; APPROVED_RULES |
| `src/data/temper.js` | WP2 | The 25 Tempers, efficiency 2 / 1 / 0.5, uniform draw, Apex draws only the three neutral Tempers | Spec §3; round 1 item 14 |
| `src/core/fraction.js` | WP4 | Exact rationals with safe-integer guards; JSON-serializable | Spec §4, §15 |
| `src/franchise/reward-ledger.js` | WP4 | Awards once per activityID + monsterID, aggregates by monster rather than slot, resumes after interruption | Spec §15 |
| `src/lab/ability-catalogue.js` | WP10 | Lists all 144 abilities × forms × 4 mastery tiers (816 variants) and the 120 Basics without unique abilities, with a completeness check for both reviewers | Spec §13, §6 |

Tests: `tests/task8-foundations.test.js` (fast tier), including the generated-module drift check.

## Not built, pending the owner (historical: superseded by the 2026-11-07 rulings below)

Everything that depends on P1–P10 or on items still marked revise / clarify / pending in `DECISIONS.md`: ability effects,
pancakes, event ordering, return gameplay, Clash rotation, simultaneous-effect caps, evasion-dependent contracts, reward
amounts, the level-XP curve, and the reviewer scenario and rendering layers.

## 2026-11-07: specification closed; build started

- N7b, N7c and N7d rulings consolidated (SPECIFICATION_BASELINE.md §20–§22; task8-overrides.json; APPROVAL_REGISTER.md: every item approved).
- **M1 progress.**
  - `src/data/dex-species.js`: the game-shape species table from the Dex, with a legacy parity test.
  - `src/franchise/t8/progression.js`: generation, natural growth, training investment and evolution.
  - `src/franchise/t8/generation.js`: B17 Basic shares.
  - All are pure and tested; none is wired yet.
- **Next in M1.**
  1. Veteran-history simulation (B7).
  2. The AI training allocation used by it.
  3. Then the integration switch: fresh-save schema; the monster record carries `dev`; species and generation from the Dex; traits, Nature and the legacy cornerstone list retired. Run the full regression at the switch.
- **Interim note.** Until M3 replaces them, the 72 original families keep their legacy football ability effects in the engine, so the game stays playable between milestones. Traits are retired at the M1 switch (B13).

## Testing record (per owner ruling N7f)

- **Full run** (started before commits edf5b82 and dd2245d): **924/925**.
- **The one failure,** the Clash reflected-damage comparison, was fixed in dd2245d; `tests/clash/reflect-ko.test.js` then passed 8/8.
- **Later changes passed targeted checks only:**
  - `tests/task7-floor.test.js` 4/4;
  - the task6-phase-d R4 test;
  - `tests/task7-remediation.test.js` 9/9.
- **The latest combined revision is not fully regression-tested.** The next broad regression runs at the M1 integration milestone.

## M1 unblocked (N7f)

- `src/franchise/t8/selection.js`: nine-candidate percentile selection, with criteria in `CLUB_STRENGTH_SELECTION.md`.
- AI identities: proposal in `AI_IDENTITIES.md` (under review).

## M1 integration switch (commit b4d47a0)

| Area | Change | Rule |
| --- | --- | --- |
| Species | Live table from the Dex: 192 families, Basic rarity; originals keep their legacy sprites | WP1, B13 |
| Individuals | Every monster carries `m.dev` (approved generator, Temper, Apex 1%, ceilings); ratings mirror it | WP2, §3 |
| Selection | Nine-candidate percentile selection in every channel: roster, draft (potential), regional scouting (potential), need scouting, encounter companions, market veterans, free-agency arrivals | N7f |
| Basic shares | B17 shares in roster, draft, scouting, encounter and arrival channels | B17 |
| Apex | One roll per event; an unaffordable Apex arrival goes to the regional pool, never re-rolled | N7f |
| Progression | 75 XP per level to 50; natural growth only on level-up; offseason banks 2 training points; decline on `dev.current` with the loss ledger | B6, B7 |
| Seasonal boosts | Club-quality growth, the title floor and the rival signature's level formula retired | N7f |
| Saves | Schema 10. Saves 6, 8 and 9 are refused with code `incompatible`, a clear message and Start New Franchise; nothing is changed or deleted | §15 |
| UI | Temper replaces Nature (roster, monster page, prospects, free agents, onboarding, Clash lab) | B14 |
| Cornerstones | Fixed legacy list retired; any eligible Dex family, never K (Granigor is a K under R1 item 32, so it is no longer a cornerstone) | B15 |

**Flagged, not decided (owner question).** Draft classes still rise +0.5 quality per season, capped at +10 (Task 6 D9,
`classQualityOffset`). D9 was approved to keep classes in step with the league's seasonal growth, which N7f has now retired. It is
an automatic seasonal rise in incoming talent. Kept unchanged until the owner rules: retire it with the other seasonal boosts, or
keep it.

## M1 regression fixes (after the first full run, 783/927)

**Real bugs found and fixed in src:**
- Evolution readiness read the mirrored level while evolution used the development record. Readiness now reads the record, and `raiseToLevel` raises a level through natural growth.
- The evolution preview now builds a level-1 individual.
- `index.html` re-stamped for the new modules.
- An ageless monster's banked offseason points now mirror to `m.points` when the trainer is off.
- A schema-10 save without its league registry is refused again (guard restored).
- Free-agency arrivals:
  - a gym's arrival keeps its element when the element's only family at the position is a Basic (R4 with B17);
  - an affordability retry no longer rolls Apex again, so there is one Apex roll per event (N7f).
- Tuesday companions: a companion reaches its target through the approved prior-career history (B7) instead of a level-1 percentile that could not reach it.

**Tests:** updated under approved rules only, by five parallel passes:
- historical engine and Clash inputs frozen as data from dd2245d/75f2a27 (no hash re-pinned);
- older-save tests turned into refusal tests;
- the storage tests moved onto a schema-10 fixture (`tests/fixtures/save-v10-season2.json`);
- retired rules rewritten with citations;
- seed drift re-seeded or made explicit.

**Open questions for the owner (flagged, not decided):**
1. **Resolved by N7g:** **Glacivern pilot play.** `lp_avalanche` (playbook) puts the Ice legendary at FS, but the approved Dex makes Glacivern a K (B19). Rebuild the play for a kicker, or replace it? The two legendary-plays tests are left failing until the owner rules.
2. **Resolved by N7g:** **Encounter Basic share vs matched companions.**
   - B17 gives encounters a 30% Basic share. A Basic's ceilings cannot reach a club's battle strength, while the approved companion rule is "matched to the club's battle strength".
   - Interim: the share is not applied to the unsignable companions.
   - Also, a Dex family stops at its ceilings, so against a much stronger club a companion can top out short of the target.
3. **Draft class growth** (above).
4. **Starter calibration** (`M1_STARTER_CALIBRATION.md`).
5. **Rating-scale thresholds.** The salary cap and pool thresholds were set for the old rating scale: AI payrolls no longer press the cap, and fewer castoffs reach the market. This is part of economy recalibration #30.
6. **Stat guide.** It disagrees with the Appendix C role register on 21 position/attribute pairs (presentation, M6).

## N7g implemented (2026-11-07 15:08 rulings)

- **Basic scouting encounter XP bonus:**
  - `basicEncounterBonus` (franchise.js) reads `approvedRule('basic-encounter-xp-bonus')` (25%).
  - `applyBattleEffects` (clash-link.js) takes a level-XP `bonusPct` and awards through the reward ledger (`f.rewardLedger`, activity `encounter:<year>:w<week>:p<prospect>`).
  - The encounter preview and the XP breakdown (base + bonus) show it.
  - Tests: `tests/task8-encounter-bonus.test.js`.
  - First live use of the reward ledger.
- **Companions:** the 30% Basic share is restored. Matching is best-effort, through the approved prior-career history up to `COMPANION_MAX_SEASONS` (12) or level 50.
- **Glacivern:**
  - `lp_avalanche` and its lesson are removed (playbook.js); the pilot now has five plays.
  - The GDD §36 amendment note is added.
  - Glacivern keeps K, Second Chance and Deep Winter.

## M1 integration milestone and preview (2026-11-07)

- **Full regression** (0f953e3): 930/933.
  - Fixed after the run:
    - league-careers: a registry-less tool universe no longer round-trips through the save;
    - release-stamp ×2.
  - Those files then passed 8/8.
- **Browser boot check** found a crash present since the Dex species switch (75f2a27).
  - The Clash Lab species list assumed every species has a Clash move; Basics have only the ordinary Strike.
  - Fixed in `src/clash/stats.js`. No node test loads the UI, so a browser boot check is now part of every preview.
- **Preview:** see PREVIEW_M1.md.
