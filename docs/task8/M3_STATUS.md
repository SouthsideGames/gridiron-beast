# M3 status: football abilities

Status at 466ee7e (2026-11-07, 23:59). Branch `task8-implementation`; nothing merged to main; the live game untouched.

## Done

- **Framework**: contract registry, engine hook points, game-scope ability state, fields with clocks (G1–G3), the status gate.
- **All 72 Dex football abilities are registered contracts**: two pilots, then six element batches built in parallel and merged
  (Wind/Dark 14a2628, Earth/Ice 621418b, Light/Metal efb2ed3, Fire/Water eb2d734, Nature/Electric 425fc72, Psychic/Dragon 1ebc597).
  Every module's header states its contract and the readings chosen where the contract is silent.
- **Legacy retirement** (45634f4): no legacy signature effect reaches the engine, the kicker lineup or fatigue (`speciesEffect` is
  null for every monster). The engine's legacy effect branches are dead code now (actors carry `ability = null`); deleting them is
  left to the M6 clean-up. Legacy-effect tests became retirement checks.
- **Gate test** (`tests/task8-ability-gate.test.js`): 72 registered under their Dex ids; no legacy path; six full games with every
  contract family on the field together. It found two cross-batch bugs, fixed: Cold Snap crashed when another contract asked it
  first; Anchor Plate's state used the engine's `anchor` key (its centre lost his position).
- **Merge fixes found afterwards**: catch contracts ran twice per catch (two `catchMade` calls, cb02299); team play counters were
  counted twice (one kept, 1ebc597).
- **Runtime-backed football reviewer** (Developer → Ability Reviewer): all 72 with stage, mastery tier and Primed; each run plays a
  real game until the contract records an execution, then replays it with its cues; no progression writes (static test).
  Sweep at cb02299: 57 of 72 execute within three games unstaged; 8 more within 4–12 games; 6 need staging, now built (full bar:
  Air Brake, Shadow Exchange; reserve bunch plays: Crossed Wires; the player's call: Dragon Roar; an opposing Dark field: Night
  Watch; a 20-game search: Hoard Flight). Guiding Halo at mastery 0 did not execute in ~790 plays (see below).

- **Activation gates** (merged from `task8-m3-activation-gates`): live in-play signature starts check `ctx.canStartSignature`
  (Eclipse, Cold Snap) and in-play charge gains check `ctx.canGainCharge` (Cold Snap's charge side) in all 72 modules: 44 gate a
  start, 31 gate charge gains, 13 gate neither (formula kicks, pre-snap producers, passive auras with nothing to spend); each module
  header records its reading; `tests/task8-activation-gates.test.js`.

## Verification that every ability works under its intended conditions (owner 22:23)

- **Rare activations investigated** (`M3_RARE_ACTIVATIONS.md`): 15 rarely activating abilities measured as trigger → opportunities
  → activations → reasons. **No ability defect**: every opportunity meeting the approved conditions activated or was refused by a
  stated rule.
- **Geometry findings for ruling** (`DECISION_PACKET_M3.md` §3):
  - Guiding Halo at mastery 0/1: every catch is at least about 9 yd from the QB.
  - Crossed Wires: only the unreleased reserve bunch plays align two route runners within 5 yd.
  - Shadow Exchange: the partner is tested at the release, before defenders converge.
  - Foresight, and Prism Break's overlap selection.
- **AI use of player-selectable signatures:** the AI now calls Dragon Roar under the player's rules. This is a PROVISIONAL policy.
- **Reviewer:**
  - **Fixes:** it stops only on the subject's own recorded execution (it could stop on a cue or on an opponent of the same family),
    and its review namespace now exists (its cloud sync threw on mount).
  - **Strict sweep at 68add50:** 67 of 72 execute within six unstaged-or-staged games. Tsunami Line, Frostmark, Second Chance
    and Crosswind Rescue execute within 12 (their search budget is now 12). Guiding Halo at mastery 0 cannot execute, which is
    the geometry finding above.
  - **Browser check at 466ee7e:**
    - the app boots;
    - the reviewer lists 72 abilities, with 72 run buttons;
    - Blazing Resolve, Dragon Roar, Crossed Wires and Night Watch run on the engine and replay;
    - a verdict saves;
    - no page errors.

## Milestone regression

- **Tested commit:** 466ee7e. Full suite, 1,104 tests on a frozen copy, 83 minutes.
- **Result:** 1,103 pass, 1 fails: `tests/task6-phase-d.test.js` "R4 in play". It is left failing on purpose, pending owner decision
  D11 (rebuilding clubs' starter sales; DECISION_PACKET_M3.md §6).
- **Merged after 466ee7e:** the deterministic reviewer scenarios (b9317fc), the restamp (72eb868) and packet documents. Their
  targeted tests pass: task8-review-scenarios, task8-activation-gates and task8-ability-review, 28 of 28. The browser check of the
  scenario mode at 72eb868 ran Guiding Halo, Crossed Wires, Shadow Exchange, Hoard Flight and Fortress Gate with no page errors. These
  are not yet covered by a full run.
- **M3 remains open** pending the rulings in DECISION_PACKET_M3.md: Prism Break; the values; the four usability changes (Guiding
  Halo, Crossed Wires, Shadow Exchange, Fortress Gate); the AI Dragon Roar policy; the two-point and kickoff readings.

- **Interim full run at 75545f0** (after the N8a/N8b rulings, identities, gym preference, trade fixtures; frozen copy, 87 minutes):
  1,143 tests, 1,141 pass, 2 fail. This is not the final M3 run.
  - `trading-second-pass` 28 "no first-round pick for a kicker": pending the owner's ruling (strict rule vs the approved rate rule).
  - `career-presentation` "the real franchise": none of the eight fixture seeds wins a title in three rookie seasons any more.
    Its prerequisite no longer holds. Survey of the same eight seeds, three rookie seasons each (24 seasons per build):
    466ee7e: 1 title, win rate 0.486; 75545f0: 0 titles, win rate 0.481. Team strength is unchanged within noise; the fixture
    relied on a single title in 24 seasons (seed 2, season 2), which the later approved changes reshuffled away. Classified as a
    fragile fixture, not a defect. Proposed fix (needs approval): build the title franchise explicitly through the real season
    code, as done for R4, instead of searching seeds. Separate finding for D1/economy: rookie franchises win about 1 title in 24
    seasons on both builds.

- **Drift run at 4383965** (the D1 merge, before the later fixes; frozen copy, 110 minutes): 1,146 tests, 1,142 pass, 4 fail.
  All four are test setups that D1's rosters invalidated. None is a gameplay defect, and each was fixed and verified on later
  commits:
  - Tuesday encounter preview (fixed in 0d60997, owner-approved assertion);
  - ageing veteran (e9f5116);
  - lineup-gate forfeit (05fcb52: the staff's legal Tuesday signing closed the hole);
  - R1 c intervening signing (5aa6cb2, the constructed scenario).
  Verified afterwards: the career fixture (d1b9867) and test 28 (1fbde94), each with targeted runs.

## The simulated owner and what the title survey can and cannot show (owner N8c)

**History-test correctness and difficulty calibration are separate questions.**
- The career-presentation test needs one franchise with a title to check that the history, trophies and links agree. It now
  constructs that franchise (d1b9867).
- The 24-season survey (one title at 466ee7e, none at 75545f0; win rates 0.486 against 0.481) is not a calibration measurement.
  The difference is within noise, and the owner it simulates manages almost nothing.

**The soak owner's policy** (`tools/franchise-soak.mjs`, `newFranchise` and `runFranchise`):
- **Creation:** the default staff; the best visible prospect with each creation-draft pick; automatic attribute points.
- **Season:**
  - automatic weeks to Sunday;
  - the default depth chart;
  - the first commissioner goal;
  - the first named release when the commissioner demands one;
  - byes and forfeits accepted;
  - eliminated playoff rounds skipped.
- **It never makes these choices:**
  - trades;
  - lineup or scheme choices;
  - training priorities;
  - press choices beyond the default;
  - Clash choices beyond the default.
- **Offseason:**
  - the first postseason and legend options;
  - every expiring contract re-signed when possible (counters accepted, otherwise he walks);
  - in free agency, asks offered only to the cheapest monsters, just enough to reach the roster minimum;
  - the best visible prospect in the draft;
  - cheapest signings to the minimum, releasing the floor plan's first suggestion when short of cap;
  - default staff rehired.

A hands-off owner like this tests that the game stays legal over many seasons. It does not measure how often a managing
player wins on Rookie, and per the ruling Rookie balance is not changed on this evidence.

## In progress

- **Regression**: the M2 full run at 7093bfb is finishing; a full run on the M3 head follows the gate merge.

## Findings to review

1. **Kickoffs after the legacy retirement**: the legacy kicking boosts are gone, so kicks are shorter: in an 80-kick sample 40 were
   returned (28 before) and the returns are narrower (18–28 yards in that sample; 17–36 over 200 kicks). Hang time and runoff stay
   provisional (your 18:20 ruling); nothing was tuned.
2. **Guiding Halo** (LIG-03-F) almost never applies at mastery 0: a 6-yard radius from the QB at the catch is rare; at mastery 3
   (12 yards) it applies normally.
3. **Foresight** (PSY-03-F) almost never fires: 12 of 258 playbook LB alignments are within 3 yards of the line (8 are blitzes).
4. **Crossed Wires** (ELE-01-F) can only fire on reserve bunch plays (no base pass play puts two route runners within 5 yards).
5. **Fortress Gate** (MET-06-F) is almost always blocked in tight three-lineman fronts (a neighbouring lineman stands where a panel
   goes); legal in most two-lineman fronts.
6. **Prism Break** (LIG-04-F): as worded, an overlap zone is never nearer than its parent fields, so it could never be selected; the
   reading taken measures zones as their effective footprints. Needs your ruling.
7. **Hoard Flight** (DRA-03-F): there is no live fumble return; the recovery places the next offense at the opponent 35 or better.
8. **Dragon Roar** (DRA-05-F) is player-activated only (a new button in the match screen); AI kickers never use it.
9. **Pre-choice reveals**: fields and marks that the contracts place "before play selection" (Frostmark, Permafrost, Charge Strip,
   Static Field, Bramble Trap, Foresight's mark) are computed at the snap from the called plays' formation; showing them to both
   sides before the choice needs presentation work.

## Unapproved values the batches had to pick (need values or confirmation)

| Ability | Value chosen |
| --- | --- |
| Cyclonic Release (WIN-06-F) | blast speed 20 yd/s |
| Landslide (EAR-06-F) | push speed 8 yd/s |
| Frost Nip (ICE-02-F) | snowball speed 15 yd/s |
| Snowfall Slam (ICE-03-F) | landing time 0.6 s |
| Stone Charge (EAR-03-F) | push contest logistic, Strength difference / 16 |
| Vine Vault (NAT-02-F) | success logistic, (Agility − Blocking) / 16 |
| Mind Game (PSY-05-F) | afterimage is a point moving at the TE's top speed (the contract asks for an implementation audit) |

## Readings applied across batches (confirm or correct)

- Activation gates: Cold Snap itself is not gated (an Eclipse does not switch it off); auras that spend a cooldown or bar at a
  moment (Guiding Halo, Tailwind Huddle, Dragon Call) are gated like signature starts; banking a token for a later field counts
  as a charge gain, so an Eclipse does not stop it (§11: charges and cooldowns continue). After a denied start: Blazing Resolve may
  still ignite on a later attempt that play; Dragon Pounce keeps its preparation; Vanishing Cut and Pressure Drain do not retry that
  play; Anchor Plate absorbs nothing for the rest of that play. Cold Snap fires only from an engaged offensive blocker, so in play
  it can only reach defenders.

- Two-point tries and kickoffs neither charge, trigger nor count clocks, except where a contract says so (Echo Landing, Dawn
  Signal) and the auras Heat Haze and Breakwater, which apply on every live play.
- Cooldowns count the owner's own participating plays (as Beacon Lane), except contracts that recharge while benched
  (Splashdown, Echo Landing, Crosswind Rescue's lifetime).
- Aura and passive abilities earn at most one mastery credit per game (Cold Snap included).
- Slipstream Step charges on kick-return broken tackles; Stonewall Swat is credited as Rockram's pass breakup; Ball Clamp is earned
  only on a sack credited to Ironjaw; Bulwark Grid's pancake trigger fires only when the TE lines up in an OL slot (the engine
  credits pancakes to OL slots); Surefoot Canopy excludes every Florant; Static Field is created even when its owner sits out;
  Mind Bend's pending field waits while its creator sits out.

## Final M3 run (2026-11-08)

- **Tested commit:** 05fcb52, which includes the creation speed-up (61fef6b) and every approved fix. Full suite on a frozen copy:
  **1,147 of 1,147 pass**, 0 fail, 86 minutes. Commit b3b79fc, which followed, changed documents only.
- **Performance, measured on a quiet machine** (no other test process running). The three builds are 145897e (before D1),
  0d60997 (D1, before the speed-up) and 05fcb52 (final).
  - Franchise creation, warm, mean of six seeds: 607 / 2,278 / 1,084 ms.
  - First franchise after a cold start: about 4.2 s / 5.4–6.4 s / 2.7 s.
  - Football game simulation, 30 games on the same generated teams:
    - 145897e: 353–382 ms per game, 4.2–4.5 ms per play;
    - 0d60997: 367–410 ms per game, 4.1–4.6 ms per play;
    - 05fcb52: 365–406 ms per game, 4.1–4.5 ms per play.
    - The cost per play is unchanged. D1's rosters produce slightly more plays per game.
    - 05fcb52 gives the same scores as 0d60997: the speed-up does not change any result.
  - Approved limit (TESTING_POLICY.md: 10,000 3v3 Clash battles in under 5 s): 2.32 s, 2.55 s and 2.58 s in three runs. It passes.
  - No approved limit exists for football game simulation.
- **Browser check** on the same frozen build, Playwright, 390 px:
  - boot;
  - Developer → Ability Reviewer:
    - all 72 abilities are listed and none is shown as not built;
    - 288 deterministic scenarios ran, covering the first and last form × the lowest and highest mastery of each. Every one executed on the engine.
    - Natural-game runs work.
    - A verdict saves and survives a reload.
  - Clash Lab: auto lineup and a 3v3 battle;
  - the new-franchise flow;
  - **0 page errors.**
- **Save compatibility:** both builds use schema 10 and the same storage keys.
  - A franchise created through the UI on the current preview build (v43.0.0) opened on the new build. It played a full season
    through the test-build shortcut and saved, with 0 page errors.
  - Separately, a v43.0.0 save played two seasons on 05fcb52 through the soak, with 0 invariant problems.
- **Found, not fixed:** the main menu's Beast Dex tile counts seen *forms* against 72 *families*. It can show more than 72, for
  example "139/72" after a season. The same happens on the v43.0.0 preview. The cause is `dexCounts(f)`, which iterates
  SPECIES_DEX (192 forms). It is a display defect only. It needs a one-line fix and a targeted test, and is held for approval
  because it falls outside the frozen build.
- **Preview updated:** "Gridiron Beast Task 8 Preview" (https://claude.ai/artifact/3qW6dbFAZ4yCc8i1SnAVq6) is now version 2.
  - The build is v43.1.0-t8-m3-preview, branch task8-m1-preview at 96de08d. That merges task8-implementation and keeps the
    test-build-only Task 8 test tools.
  - 131 files changed out of 289. The other 158 match the previous version by hash, and no file was removed.
  - Saves stay on the same artifact origin with the same keys.
