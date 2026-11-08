# M3 status: football abilities

Status at da639eb (2026-11-07). Branch `task8-implementation`; nothing merged to main; the live game untouched.

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
