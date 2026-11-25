# Technical issues found during the balance audit

**Build audited:** `v43.50.0-sideline`, `main` at `58c33ee9a9b53f10d1d0ea2683bf5c11a91beccb` (PR #189 merge, 2026-11-25).

Every issue below has been reproduced, with a seed and a command. Nothing in `src/` was changed. Two kinds of issue are listed:

- **Game issues:** something a player can meet.
- **Measurement issues:** a study tool that no longer measures what it says it does.

## T-1. A mid-game injury that empties a position turns the game into a 0–21 forfeit, whatever the score (Medium, game)

- **What happens.** Since the coaching-substitution change (PR #125), monsters can be injured during a game (`src/sim/substitutions.js`, `ROTATION_RULES.injuryChance` 0.0015 per contact). The game runner checks before every snap whether any play in the club's 6-play plan can be staffed (`eligiblePlays`, `src/sim/game-runner.js` `step`). If none can, `lineupForfeit` (`src/sim/rules.js:428`) ends the game and **sets the score to 0–21, throwing away the points already scored.**
- **Reproduction (forced injury):** `node tools/balance-audit/repro-ingame-forfeit.mjs --seed=11`. In this test, both home quarterbacks are hurt at the start of the third quarter, with home leading 7–3. The final score is home 0, away 21, `forfeit: {side: 'home', reason: 'no-legal-lineup'}`.
- **Natural frequency:** 1 forfeit in 500 games between generated clubs (`raw/game-study-500-mixed.json`, `summary.forfeits`). A 32-club league plays 224 regular-season games a season, so on that rate a 20-season franchise has roughly ten such games. Franchise rosters are deeper than the generated 7-on-7 game rosters, so the true franchise rate is probably lower. It was not separated out of the franchise runs.
- **Why it matters:**
  - A club can lose a game it was winning without anyone choosing to.
  - The score it was building is erased from the record books and the stat tables.
  - In Franchise Mode the forfeit also decides playoff places and the Board's verdict.
- **The decision needed (owner):** whether a club that runs out of a position mid-game should:
  - forfeit (today's rule, intended or not);
  - borrow a monster from another position, as `pickSlots` already does inside a play (`src/sim/rules.js:522`); or
  - finish the game with the score kept.

## T-2. The "abilities off" control in the passing calibration no longer removes abilities (High, measurement)

- **What happens.**
  - `tools/passing-calibration.mjs` strips the species and ability from the monsters in each club's **starting slots** only (`strip()`).
  - Since PR #125 every built team also carries a rotation pool, `team.rotationInputs` and `team.bench` (`src/franchise/roster.js:129`). The substitution logic (`src/sim/substitutions.js` `teamInputs`) fields players from that pool.
  - As a result, the "stripped" monsters come back onto the field with their abilities.
- **Evidence.** Ability events per game were 99.1 with abilities on, 99.8 "off" and 98.6 "off, no types" (`raw/passing-calibration-120.json`). The control is not a control.
- **Corrected comparison.** `tools/balance-audit/passing-calibration-rotation-strip.mjs` is a copy whose strip also clears the rotation pool. Its results are in `raw/passing-calibration-120-rotation-strip.json`; see `GAMEPLAY_BALANCE.md` §2.
- **Other tools:**
  - `tools/task10-ability-strength.mjs` strips the slots the same way (`strip`, line 21), so its "without" baseline is likely affected too.
  - `tools/type-balance.mjs` switches types off with a global value override, so it is not affected.
  - Any football "with and without" study run after 2026-11-16 should be rechecked.
- **Fix (tools only, no game change):** strip `rotationInputs` and `bench` as well, or build the team from a stripped roster before `buildTeam`.

## T-3. The roadmap's status table is out of date on Task 8 (Low, documentation)

- **The discrepancy.** `GRIDIRON_BEAST_GDD.md` line 961 still lists "Task 8 — Monster catalogue expansion and Nature/Temper" as **NEXT**. But:
  - the code holds the 72-family catalogue (192 species including forms; 120 basics and 72 evolving families);
  - it holds 25 natures and the Temper system;
  - Task 8 was merged to `main` on 2026-11-11.
- **`docs/task8/M6_STATUS.md`** says Task 8 "stays open" because its M6 benchmarks were never finished.
- **The roadmap does not record:**
  - the 32-club league (PR #165, 2026-11-23);
  - the 14-game season;
  - the coaching-substitution and GM-mobility candidates, which have since been merged.
- **Effect on this audit:** comparisons against the Task 8 M6 and Task 10 baselines cross three structural changes:
  - 16 to 32 clubs;
  - 9 to 14 regular-season games;
  - in-game rotation and injuries.

  They are therefore marked as cross-structure, not matched.

## Checks that passed

- **Determinism.** The same franchise season was run twice: seed 99, Pro, repair owner, Board kept content, `tools/ai-franchise-benchmark.mjs --seeds=99 --seasons=1`. Both runs give the identical franchise hash `hashV3 a304b5d9…cae8`.
  - The full `hash` differs only because the second run also recorded packed save sizes in the observation-only `v4` block. That block is excluded from `hashV3`.
- **No exceptions and no runner guard trips** in 1,000 generated games, 720 calibration games, the attribute sweeps and about 281,000 Clash battles.

## T-4. More issues

Further issues from the long runs are added below as they are confirmed.
