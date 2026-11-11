# Task 8 Reviewer v2: the football ability reviewer at the owner's standard (spec §25)

Branch `task8-reviewer-v2`, from `origin/task8-implementation` at acdc91e. Nothing merged; no gameplay rule or ability value changed.

## What changed

- **Complete-interaction run** (`src/sim/abilities/review-sequence.js`). One call stages the scenario on the real rules.js game and
  engine, plays to the subject's activation, then keeps playing follow-up plays until the cleanup is observed (cooldown back to
  ready, every field it created expired, every status cleared, an absence served and the absentee back). Every play is recorded:
  frames, engine events, the game's log line, fields, statuses, absences and the subject's game-scope state. The first of the fixed
  seeds whose run shows every phase is the one shown; the seeds tried before it are named in the staging notes. Deterministic.
- **Phase checklist from engine records** (`review-phases.js`, texts and evidence hints per family in `review-texts.js`):
  trigger met, ability activated, effect resolved, cleanup. Each phase carries the play and engine time of its evidence. The
  activation is the subject's own recorded execution (`registry.js recordExecution`) and his event on that play. For a formula kick
  or a pre-snap game hook, the evidence is the game's own result line. Nothing is scripted; the result is what the contracts and
  the engine produced.
- **Labelled variants** (`review-blocked.js`, `VARIANTS` in `review-texts.js`):
  - Sovereign Arm: failure (not charged: the interception stands); blocked (Eclipse: the charge is kept).
  - Ball Clamp: interaction (the extra check jars the ball loose); failure (no token); blocked (Eclipse: the token is kept).
  - Meteor Impact: blocked (Eclipse: the cooldown is not spent).
  - Vine Vault: interaction (an opposing Cold Snap suppresses the vault).
- **Failure reporting.** When a phase is missing, the run reports the unmet condition, what it waited for, and the readiness at
  each snap. When an exception occurs, it reports the message and the stack as an implementation error. It never ends as a silent
  ordinary play.
- **UI** (Developer → Ability Reviewer, `src/ui/screens/ability-reviewer.js`):
  - "▶ Scenario" runs the sequence. Before playback the sheet shows:
    - the source, the expected targets (and the actual ones), the expected result and the approved values;
    - how the run is staged, the controlled-prerequisite label and the frequency note.
  - The phase checklist ticks when playback reaches each phase's evidence and names the play it belongs to.
  - The failure panel shows the unmet condition or the error.
  - Controls: pause/play, replay, 0.25× / 0.5× / 1×, previous play, step by event, step by play.
  - A variant selector runs the labelled scenarios.
  - "▶ Natural game" (`reviewAbility`) is unchanged, as the optional mode for ordinary activation frequency.
  - Functional cues only (final visual polish is deferred).
- **Isolation.** The reviewer modules import nothing from saves, storage, progression, rewards or collection. The
  generated-club path through `franchise/roster.js` is the same as before. Tests check the imports, check that no browser storage
  is written while sequences run, and check that no club objects leak out of a run. Mastery executions are counted in the run's
  own local game only.

## Controlled outcomes and why

Both live in `engine.js` under the `REVIEW_ONLY` symbol key. A save, setting, JSON value or UI choice cannot carry a symbol, and only
the scenario table sets it. The reviewer labels both controls, and neither forces an ability's result.

| Control | Used by | Why | What it forces / what stays real |
|---|---|---|---|
| `fumbleOnTackle` (existing) | Hoard Flight (sablewing) | A fumble Sablewing recovers happens on about 0.4% of plays | The tackle's first fumble check fumbles. The recovery is the engine's ordinary nearest-players draw, and the flight is the contract's own |
| `wouldBeInterception` (new) | Sovereign Arm, main and its failure / blocked variants | A would-be interception on the one charged throw is rare | At the catch point, the nearest defender within 2.5 yd plays the ball and his interception roll succeeds. Everything after it is the ordinary code: the contract's `noInterception`, the incompletion, the swallow at the whistle, and the rules.js absence ledger. Uncharged or inside an Eclipse, the same control gives an ordinary interception. It applies only while the subject is charged and unused |

Other staging prepares conditions without controlling outcomes, and the run labels each item:

- primed game-scope state, as before;
- prepared participants: Ball Clamp's weak opposing line, so his own sack earns the token in play; Tsunami Line's inaccurate QB;
- placed fields: Night Watch's Dark field, Prism Break's Wind zone and the Eclipse variants;
- placed opposing or allied monsters: Cold Snap, Vine Vault and Tailwind Huddle's blockers;
- fixed seeds and calls.

Ball Clamp's jarred-loose interaction uses no control. Its seed is the first, in an offline search of seeds 1–3000, where the
extra check's own roll on the abilities' random stream comes up fumble: seed 123 at mastery 0–2, and seed 57 at mastery 3.

## Audit: every ability × form × mastery tier, before and after

Method (scratch script; not committed):

- **Before.** v1 (acdc91e) replayed one play, the activation play of `reviewScenario`. For each of the 408 variants, the v2
  evaluator was applied to that single play, with the v1 scenario entries for the three families whose scenario changed.
- **After.** The full v2 run.

**Before:** 0 of 408 variants complete.

- None had a follow-up play, so none showed cleanup or a return.
- 120 did not show the resolution in the replayed play:
  - delayed fields created on a later snap;
  - Divided Guard's first activation without a double hold;
  - Frost Nip snowballs cancelled before the hit;
  - Foresight misses;
  - Sovereign Arm without the would-be interception;
  - Vine Vault held by the blocker;
  - Stone Charge without its push.
- Prism Break's 4 are an artifact of the method: v1 returned no field list from before the play.

**After:** 408 of 408 complete. All four phases come from engine events on the first run.

| Ability (family) | Element | Variants | Gaps before (v1 replayed one play) | Fix | After |
|---|---|---|---|---|---|
| Blazing Resolve (emberfox) | Fire | 12 | no cleanup or follow-up play (12/12) | Follow-up plays until the cleanup; phase evidence from engine events | 12/12 complete |
| Impact Pyre (ashkit) | Fire | 8 | no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Meteor Impact (firestorm) | Fire | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Ember Grip — Scorch Mark (cinderclaw) | Fire | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Heat Haze (pyrelynx) | Fire | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Eruption — Burning Wake (pyroclast) | Fire | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Splashdown (tidepaw) | Water | 12 | no cleanup or follow-up play (12/12) | Follow-up plays until the cleanup; phase evidence from engine events | 12/12 complete |
| Divided Guard (mudcub) | Water | 8 | resolution not in the replayed play (8/8); no cleanup or follow-up play (8/8) | Scenario: blitz fronts (zone_blitz, double_a_mug), 24 seeds, so the first activation holds two rushers; resolution = the double hold | 8/8 complete |
| Pressure Drain (reefclaw) | Water | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Second Touch (tidefin) | Water | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Breakwater (wavehorn) | Water | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Tsunami Line (tsunarok) | Water | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Follow-ups: three offensive snaps (the line is created before his club's next offensive snap), then defensive snaps until the cooldown is ready; seed0 15 | 4/4 complete |
| Bloom Break (thornkit) | Nature | 12 | resolution not in the replayed play (12/12); no cleanup or follow-up play (12/12) | Follow-up plays until the cleanup; phase evidence from engine events | 12/12 complete |
| Vine Vault (mossclaw) | Nature | 8 | resolution not in the replayed play (8/8); no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Deep Roots (rootram) | Nature | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Surefoot Canopy (leafhorn) | Nature | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Bramble Trap (thornback) | Nature | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Grove Guardian (elderoot) | Nature | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Crossed Wires (flicker) | Electric | 8 | no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Charge Strip (voltfin) | Electric | 8 | resolution not in the replayed play (8/8); no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Phase Release (voltfang) | Electric | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Static Field (stormlynx) | Electric | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Chain Break (joltrex) | Electric | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Stormguard (stormcrown) | Electric | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Frostmark (snowmoth) | Ice | 8 | resolution not in the replayed play (8/8); no cleanup or follow-up play (8/8) | Follow-ups on his club's defense (the patch is created at its next defensive snap) | 8/8 complete |
| Frost Nip (hailfang) | Ice | 8 | resolution not in the replayed play (8/8); no cleanup or follow-up play (8/8) | Resolution requires the Slowed application (seeds whose snowball is cancelled are passed over) | 8/8 complete |
| Snowfall Slam (frostclaw) | Ice | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Permafrost (icehorn) | Ice | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Cold Snap (glaciron) | Ice | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Second Chance (glacivern) | Ice | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Runway (gustling) | Wind | 12 | no cleanup or follow-up play (12/12) | Follow-up plays until the cleanup; phase evidence from engine events | 12/12 complete |
| Slipstream Step (breezefang) | Wind | 8 | no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Air Brake (skywarden) | Wind | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Crosswind Rescue (windlynx) | Wind | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Tailwind Huddle (zephyr) | Wind | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Cyclonic Release (tempestra) | Wind | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Clean Sweep (pebble) | Earth | 12 | no cleanup or follow-up play (12/12) | Follow-up plays until the cleanup; phase evidence from engine events | 12/12 complete |
| Stonewall Swat (rockram) | Earth | 8 | no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Stone Charge (boulderox) | Earth | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Stone Cradle (stoneguard) | Earth | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Stone Screen (terrabull) | Earth | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Landslide (titanolith) | Earth | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Shadow Patch (shadowkit) | Dark | 8 | resolution not in the replayed play (8/8); no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Night Watch (nightowl) | Dark | 8 | no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Vanishing Cut (duskrunner) | Dark | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Ambush Tag (mireclaw) | Dark | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Blackout Pocket (nocturne) | Dark | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Shadow Exchange (nyxshade) | Dark | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Beacon Lane (glimmer) | Light | 8 | resolution not in the replayed play (8/8); no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Dawn Signal (sunwhistle) | Light | 8 | no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Guiding Halo (lumen) | Light | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Prism Break (prism) | Light | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Radiant Pursuit (halofang) | Light | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Daybreak (aurelion) | Light | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Anchor Plate (ironcub) | Metal | 8 | no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Iron Lungs (steelpaw) | Metal | 8 | no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Gear Grid (gearwing) | Metal | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Follow-ups on his club's defense (the grid lives on the opposing offense's snaps) | 4/4 complete |
| Ball Clamp (ironjaw) | Metal | 4 | no cleanup or follow-up play (4/4) | Scenario: the token is earned by his own sack (weak opposing line prepared), then run plays; resolution = the extra check with its probability and result; cleanup = token spent and his next tackle has no extra check | 4/4 complete |
| Bulwark Grid (metalhorn) | Metal | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Fortress Gate (aegistron) | Metal | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Mind Bend (mindwing) | Psychic | 8 | resolution not in the replayed play (8/8); no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Mirror Step (shadewisp) | Psychic | 8 | no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Foresight (cerebrix) | Psychic | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Resolution requires the Confused application (a miss is passed over) | 4/4 complete |
| Echo Landing (echolot) | Psychic | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Follow-ups on his club's defense | 4/4 complete |
| Mind Game (enigmane) | Psychic | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Blink (astralux) | Psychic | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Dragon Pounce (drakeling) | Dragon | 12 | no cleanup or follow-up play (12/12) | Follow-up plays until the cleanup; phase evidence from engine events | 12/12 complete |
| Dragon Call (wyrmkit) | Dragon | 8 | no cleanup or follow-up play (8/8) | Follow-up plays until the cleanup; phase evidence from engine events | 8/8 complete |
| Hoard Flight (sablewing) | Dragon | 4 | no cleanup or follow-up play (4/4) | Follow-up continues naturally (no restaging): his offense snaps at the flight spot | 4/4 complete |
| Dragon Stomp (scaleguard) | Dragon | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Dragon Roar (vyrnax) | Dragon | 4 | no cleanup or follow-up play (4/4) | Follow-up plays until the cleanup; phase evidence from engine events | 4/4 complete |
| Sovereign Arm (aurodrax) | Dragon | 4 | resolution not in the replayed play (4/4); no cleanup or follow-up play (4/4) | Scenario: charge primed; controlled would-be interception on the charged throw only; resolution = denial, incomplete pass, swallow; cleanup = absence served on the next offensive play and return on the play after | 4/4 complete |

## Tests (targeted only)

Run at 87f44bf (code at 011ad9e, e5dc1df and bcce18c). One command over the files below: **51 tests, 51 pass, 0 fail, 2 min 47 s**
on 2 CPUs.

- `tests/task8-review-sequences-a.test.js` (Fire to Wind) and `-b.test.js` (Earth to Dragon). Every ability × form × mastery
  tier (408 variants) passes `tests/helpers/review-v2.js assertComplete`:
  - all four phases, in order, each with a play index and evidence;
  - an execution recorded on the activation play, and none before it;
  - the activation evidence is an engine event (or the game's result line) of that play;
  - the resolution falls on or after the activation, and the cleanup after the resolution;
  - at least one follow-up play after the resolution;
  - source, targets and expected result present.
  - Determinism: the first form at mastery 0 of every family runs twice, with identical events, state, fields, statuses,
    absences and frames.

  Both files are in the `sim` tier (`tools/test-tier.mjs`).
- `tests/task8-review-sequences-named.test.js` (7 tests):
  - **Ball Clamp** (every tier):
    - the token is earned by his own sack on an earlier play (sack result, his sack event, token false → true);
    - the qualifying normal tackle comes at the same moment as the clamp event, not an arm tackle off a block;
    - the token goes true → false;
    - the extra check's probability equals the normal probability × 0.25 / 0.40 / 0.55 / 0.70;
    - the result (held or jarred loose) is named, and a held check has no fumble;
    - his next tackle has no extra check, and there is no second activation;
    - no controlled outcome.
  - **Ball Clamp jarred-loose** (every tier): the extra check fumbles, and the fumble event comes at the check. Not controlled.
  - **Sovereign Arm** (every tier):
    - the charge is prepared, and the control is applied on the charged throw only and labelled;
    - events come in order: guard, then denial ("cannot hold it"), then the incomplete pass, then the swallow, with the same
      defender throughout;
    - there is no interception, and the result is incomplete;
    - the absence is queued for his offense, served on the next home offensive scrimmage play with the defender's slot vacant
      in the frames, and the defender is back on the play after;
    - once per game.
  - **Variants** (every variant at every tier): each shows its own four-item outcome. The gate (Eclipse or Cold Snap) or the
    unmet condition (not charged, no token) is named, and no execution is recorded.
  - **Failure panel data:**
    - an unmet trigger names the trigger and the readiness per snap;
    - a thrown error is reported as an implementation error with its stack;
    - a cut-short Sovereign Arm run names the missing absence or return.
  - **Determinism:** 7 named or variant scenarios run twice with identical results.
  - **Isolation:**
    - static imports of the six reviewer modules and the UI;
    - a runtime storage stub records zero writes across four sequences;
    - no club objects in the result.
- Updated:
  - `tests/task8-review-scenarios.test.js`: the `REVIEW_ONLY` user list adds `review-texts.js` (the variants' controls).
  - `tests/task8-activation-gates.test.js`: the shared-module list adds the four new reviewer modules.
  - Both pass unchanged otherwise. v1 `reviewScenario` still executes every scenario at every form at mastery 0 and 3, and is
    deterministic.
- `tests/task8-ability-review.test.js` and `tests/release-stamp.test.js` pass (`node tools/stamp-release.mjs` re-run: 281
  modules).

## Browser check

Setup:

- the container's Chromium through Playwright (`createRequire`), with the repo served by `python3 -m http.server`;
- a 390 × 844 viewport;
- Developer → Ability Reviewer, choosing stage, mastery and variant and pressing ▶ Scenario.

Screenshots are in the scratchpad `reviewer-v2/` folder: three per case (explanation, stepping, completed checklist), plus
`results.json`.

Each case checked:

- 0.25× and 0.5× speed: about 0.2–0.3 s and 0.5–0.6 s of engine time per wall second;
- pause holds the time;
- step by event advances through event times;
- step by play reaches every play;
- the checklist reaches "Validated: every phase observed";
- no horizontal scroll inside the sheet.

| Case | Kind | Plays | Checklist on the first run | Page errors |
|---|---|---|---|---|
| Ball Clamp m0 | named, cross-play (sack, then tackle, then next tackle) | 18 | ✓✓✓✓ | 0 |
| Ball Clamp m3, played at 1× in real time | named | 18 | ✓✓✓✓ | 0 |
| Ball Clamp jarred loose m2 | interaction, rare (natural roll) | 8 | ✓✓✓✓ | 0 |
| Sovereign Arm m3, played at 1× in real time | named, controlled, cross-play (absence and return) | 3 | ✓✓✓✓ | 0 |
| Sovereign Arm, not charged | failure | 1 | ✓✓✓✓ (failure outcome) | 0 |
| Tsunami Line m1 | delayed field, cross-play, cooldown return | 25 | ✓✓✓✓ | 0 |
| Cyclonic Release m2 | multi-target | 8 | ✓✓✓✓ | 0 |
| Daybreak m0 | multi-target (13 affected) | 2 | ✓✓✓✓ | 0 |
| Frostmark m3 | formula kick, then a field on later plays | 5 | ✓✓✓✓ | 0 |
| Hoard Flight m0 | rare, controlled fumble, natural continuation | 4 | ✓✓✓✓ | 0 |
| Meteor Impact, Eclipse | blocked | 2 | ✓✓✓✓ (blocked outcome) | 0 |

Total page errors: **0**.

The first pass of the script returned four cases unticked. The script's own "play" toggle after the last play restarted
playback; the reviewer was not at fault. A second pass without that toggle ticked all four phases in every case.

## Gameplay findings (reported, not fixed)

No contract was found unimplemented, and no ability needed a rule change to be demonstrated. Two observations for the owner:

1. **Iron Lungs (MET-02-F) relieves Steelpaw himself.** The engine logs "Steelpaw's Iron Lungs steady Steelpaw". The contract text
   says "allied defenders within 3–6 yards". Please confirm whether the source counts as one of his own allies.
2. **Ball Clamp in released play is very rare.** The extra check runs at 0.3–1.5% (normal fumble probability × factor) after a
   sack-earned token. The approved values stand; it is noted only because the jarred-loose result needed a seed search to show.
   The main demonstration shows the check whatever it rolls.

## Files

- `src/sim/engine.js`: the `wouldBeInterception` review-only control and its documentation.
- `src/sim/abilities/review.js`: `stageScenario` (shared staging; follow-up units; natural continuation). `reviewScenario`
  behaves as before.
- New: `src/sim/abilities/review-sequence.js`, `review-phases.js`, `review-texts.js`, `review-blocked.js`.
- `src/sim/abilities/review-scenarios.js`:
  - Ball Clamp: token earned by a sack, with participants prepared;
  - Sovereign Arm: charge primed, with the controlled would-be interception;
  - Divided Guard: blitz fronts;
  - Tsunami Line: seed0 15;
  - follow-up units for Frostmark, Gear Grid, Echo Landing, Tsunami Line and Hoard Flight;
  - header documentation of the new keys.
- `src/ui/screens/ability-reviewer.js` and `index.html` (release stamp).
- Tests as above, and `tools/test-tier.mjs`.
