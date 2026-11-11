# Phase 1 / B: Football simulation inventory (Task 8)

Repo: `/home/claude/gridiron-beast`, branch `task8-implementation`. HEAD is `816b572`. `git diff --stat cbd0d77 HEAD -- src` is empty, so `src/` is identical to `cbd0d77`. Nothing in the repo was modified.
Paths below are relative to the repo root. Citations use `file:line`. "Spec §n" means `docs/beast-dex/SPECIFICATION_BASELINE.md` section n.

---

## 1. Team size, formation, play loop, determinism, time step

### Current (file:line)
- **7v7 confirmed.** `src/data/personnel.js:1` ("7-on-7 personnel packages").
  - Offense base slots are QB, RB, WR1, WR2, TE, LG, RG (`personnel.js:4`). Package slots WR3 and C (`:5`).
  - Offensive packages pro, spread and tight are always QB + LG + RG + 4 skill players (`:17-21`, `:31-35`).
  - Defense base is DL1, DL2, LB1, LB2, CB1, CB2, FS (`:7`). Package slots DL3 and SS (`:8`). Defensive packages base 2-2-3, nickel 2-1-4, heavy 3-2-2 and pressure 3-1-3 (`:24-29`).
  - Playbook validation enforces exactly 7 on the field and both base linemen (`src/data/playbook.js:456-458`). Formation alignments are at `playbook.js:12-40`.
  - There is only a 2-man OL (3 in tight sets, `playbook.js:11-12`). **No kicker or punter actor exists in the physics sim.** K is a separate slot (`src/franchise/roster.js:15,72`).
- **Game loop.** `src/sim/game-runner.js:39-102` `step()` advances one event: kickoff/free kick (`:47-54`), try (`:55-68`), timeouts (`:73-74`), pre-snap runoff (`:77-79`), kneel/spike (`:82-83`), 4th-down punt/FG (`:86-90`), or a scrimmage snap through `R.runScrimmagePlay` (`:92-101`). `playGame` loops `step` up to 2000 steps (`:106-122`).
- **State machine.** `src/sim/rules.js`: `newGame` (`:17-53`), `runScrimmagePlay` (`:132-155`), `applyScrimmageResult` (`:209-276`), kicks (`:427-499`), periods/halftime (`:525-538`), overtime (`:544-586`). Quarters default to 180 s (`:15`). Pre-snap runoff is 18/8/30 s (`:14`). Play time is `sim.elapsed` (`:216`).
- **Per-play physics.** `src/sim/engine.js` `simulatePlay` (`:61`). Fixed tick `DT = 0.05` s (`:32`). The tick loop is `while (!result && t < maxTime)` with `t = tick*DT` (`:2015-2016`). `maxTime` defaults to 20 s (`:67`). Frames are recorded every `frameEvery=2` ticks (0.1 s) (`:68`, `:2092`).
  - Order within a tick (`:2019-2092`): position history, QB facing, snap positions at tick 1, auras/roar, offense tick, defense read update, defense tick, `integrate` (only actors that are not engaged), `separate` (body push, 0.7 yd), ball flight, contact (sack or tackle), boundaries.
  - Movement integration is in `steer` (`:214-229`) and `integrate` (`:243-252`).
- **Determinism.**
  - `createRng(seed)` is mulberry32 (`src/core/rng.js:5-51`). The engine creates the physics stream at `engine.js:62` and a separate QB-perception stream `qrng` at `:65`.
  - Some perception noise comes from a string hash `hash01` (`engine.js:1266`; used at `:450,454,489,1288`).
  - Each play's seed is drawn from the game RNG, which is stored as `state.rngState` (`rules.js:26,62,134,147`; `game-runner.js:42-43`).
  - The AI Testing Lab `options.fork` re-seeds physics mid-play (`engine.js:2018`). This is dev only.
  - **Math.random in the sim: none.** A grep of `src/sim`, `src/core` (except `uid.js`), `species.js`, `playbook.js`, `monsters.js` and `clash-link.js` found Math.random only in `src/core/uid.js:5-6` (ID generation). There is no `Date.now` or `performance.now` in the sim.
- **Independent of rendering and FPS.** `simulatePlay` runs to completion headless and returns `frames` and `events` (`engine.js:2103-2110`). The renderer consumes the recorded frames. Kicks and special teams are not simulated in time at all (`src/sim/special-teams.js`). UNVERIFIED: I did not read the UI watch/replay code to confirm it never calls the engine per animation frame. `src/ui/screens/ability-audit.js:6-7` runs `simulatePlay` for previews.

### Task 8 change (spec §15, §14, §9)
- Keep the fixed 0.05 s authoritative tick and seed-per-play. §15 requires the same results regardless of Watch/Skip, 30/60 FPS and replay. Today's architecture already satisfies this for scrimmage plays.
- Charge, cooldowns and delayed events must live in authoritative game state, not in actor objects that are rebuilt every play (§9). See §3 and §4.
- Kick placement grading (§7 Kicker) needs "existing catch/landing physics". No kick physics exists today; kicks are formula-only (see §8).
- Many Dex abilities rely on per-play pre-choice reveals ("before both teams' choices"). `game-runner.step` would need a pre-choice hook between `preSnapRunoff` (`:77`) and play selection (`:93-94`).

---

## 2. Attribute consumers (12 attributes)

Inputs arrive as `offense/defense[slot].attrs`. Lineup attrs come from `effectiveAttributes` (`src/franchise/roster.js:68`), defined at `src/data/monsters.js:153-168`:
- base, then Nature ×1.10 / ×0.90 (`:160-161`), then + trainingBonus (`:162`);
- then a fatigue penalty of up to −6% on speed, strength and agility only (`:155,163`);
- then a secondary-position penalty of ×0.9 (`:156,164`);
- then clamped to 1..99 (`:165`).

Engine-time additions:
- flat `effect.attrs` (`engine.js:116`) and `routeAgility` (`:117`);
- comeback/scheme `edge` on 9 attributes (`:40,119-120`; `rules.js:113-122`);
- Overcharge speed (`:123-124`) and Sovereign Q4 arm/accuracy (`:126-127`);
- Bulwark blocking aura (`:153`) and Grove awareness, recomputed every tick (`:2034-2036`);
- partnership boosts through `boostSlots` (`rules.js:146`, `src/sim/partnership-play.js`; not read in detail).

All of these mutate `a.attrs` in place for that play.

| Attr | Read at | Purpose |
|---|---|---|
| speed | `engine.js:131` | `maxSpeed = 5.4 + 4.1·norm(speed)` yd/s (movement max) |
| | `:973` | QB mobility (with agility) |
| | `:1804,1847` | carrier break-tackle score (0.1 weight) |
| | `:1194` | pursuit trace |
| | `special-teams.js:58,61,94` | kickoff/punt return yards, big-return chance |
| | `type-matchups.js:166` | AI forecast |
| agility | `engine.js:131` | **acceleration** `accel = 9 + 11·norm(agility)` (not speed; there is no separate turning stat) |
| | `:226,345-359` | cut braking and turning use `accel` |
| | `:466` | pre-contact cut cost |
| | `:515` | juke chance vs defender awareness |
| | `:295` | defender shed score 0.3 |
| | `:672` | slipping an open-field block |
| | `:852` | QB scramble gate |
| | `:1804,1847` | carrier break-tackle 0.3 |
| | `:1891` | QB sack escape |
| | `:1924` | receiver catch radius |
| | `qb-read.js:56` | catch radius in throw odds |
| | `special-teams.js:58,94` | return yards |
| strength | `engine.js:294` | blocker block score 0.4 |
| | `:295` | defender shed 0.5 |
| | `:1802-1803,1845-1846` | tackle score 0.3 / carrier strength 0.5 |
| | Not read for fumbles. Fumble uses **catching** (`:1855`). |
| awareness | `engine.js:383-384,428,483,508` | carrier lane look-ahead, noise, re-read rate |
| | `:515` | resisting jukes |
| | `:672` | slipping blocks |
| | `:748,801,812,819,822,830,847,851,931,955,961,1000,1051` | QB reads, timing, judgement noise, `awarenessProfile` (`qb-read.js:26`) |
| | `:1189,1205,1234,1238,1251,1261,1288-1289,1321,1389,1436,1452,1570,1585,1777-1778` | defender pursuit lead, coverage reaction delays, run/pass read speed, zone shading |
| | `:1805` | arm-tackle chance |
| catching | `engine.js:1943-1944,1954` | catch probability, deep tracking, contested catch |
| | `:1962` | defender interception hands |
| | `:1855` | **fumble chance** `0.012·(1.6 − norm(catching))` |
| | `:928` / `qb-read.js:58,61,63` | QB throw odds, pick hands |
| arm | `engine.js:880,892,910,914` | throw velocity 17+13·norm, range 30+30·norm |
| | `:1076` | wind-up time |
| | `:1081-1104` | lead and flight time |
| accuracy | `engine.js:1081,1099` | landing error `(1.3 − norm(acc))` |
| | `:928` / `qb-read.js:55` | odds |
| blocking | `engine.js:285` | soft-block landing chance |
| | `:294` | block score 0.6 |
| | `:673` | open-field block chance |
| tackling | `engine.js:295` | shed 0.2 |
| | `:1802,1845` | tackle score 0.55 |
| | `:1891` | sack chance |
| coverage | `engine.js:928` | QB odds cover |
| | `:1205,1234,1238,1251,1261,1436,1570,1658,1660,1682,1712,1733,1747` | man/zone reaction delay, anticipation, break |
| | `:1953` | contested breakup |
| durability | **Not read in the engine.** `src/franchise/progression.js:36-40`: weekly fatigue gain and injury risk after games. |
| kicking | **Not read in the engine.** `special-teams.js:9-16,26,33,43,74`: FG/PAT chance, kickoff/punt distance, onside |
| | `coach-ai.js:22` | FG range |
| | `roster.js:73-75` | Steady Leg / Precision Gears boost applied before the kick, because the engine does not run kicks |

Type contests (`type-matchups.js:49-52`, used through `engine.js:97-102`) scale individual contest scores by ±4%, +2% Dragon "wild", and +2% stadium env match, capped at +6% (`type-matchups.js:16`).

### Task 8 change (spec §12, Appendix C, §11)
- Speed should govern both max speed **and** acceleration. Today agility drives acceleration (`engine.js:131`). Agility should govern turning (§12).
- Strength should govern fumble resistance (§12). Today catching does (`:1855`). WR strength should improve contested catching; today it is not used (`:1954-1955`).
- Awareness should feed the pancake attempt risk. No pancake exists yet.
- Field modifiers must layer on movement properties (max speed, turning, braking) additively, with caps of 75% reduction and 50% boost (§11). There are no separate turning or braking parameters today: braking is `accel·0.8` (`:345`).
- Exhaustion halving needs a single extra layer on top of `effectiveAttributes` (§12).

---

## 3. Existing ability and trait runtime

### Current (file:line)
- **Data.** `src/data/species.js`:
  - 72 species, each with either an `ability {name, text, effect}` (uncommon and up) or a common `trait` id.
  - Ten shared traits are defined in `TRAITS` (`:17-28`): quick_feet, anchor, hard_hitter, slick, sticky, sharp_eyes, steady_leg, soft_hands, bull_rush, iron_lungs.
  - `species.js:3` refers to an "EFFECT_PRIMITIVES" table in engine.js. **That table does not exist** (grep finds only that comment).
- **Legacy ids.** `ABILITIES` (`src/data/monsters.js:59-66`) holds meteor_pass, lightning_break, stone_charge, crushing_rush, aerial_lock and cold_read, used by cornerstones (`monsters.js:273-280`). An `input.ability` legacy id overrides the species effect (`engine.js:110-115`).
- **Resolution.** `speciesEffect(m)` (`monsters.js:128-133`) returns the species ability first, else the trait. The engine copies this into `a.ability` (effect object), `a.abilityName` and `a.abilityKind` (`engine.js:111-115`).
- **Effects are ad-hoc keys** checked inline throughout `engine.js`. There is no registry, no charge, no cooldown and no mastery.
- **Cross-play memory** is only "once per drive / half / game":
  - `memory.used` keys `${mid}:${name}:${d:|h:|g}` (`engine.js:82-88`);
  - built and stored by `rules.abilityMemory` / `rememberAbilities` into `state.abilityMemory` (`rules.js:127-131`).
  - Users: eruption (drive), blink (game), whiteout (drive), overcharge (drive flag).
- **Telemetry.** An `abilityUsed` event is logged once per monster per play (`engine.js:77`). `abilityOutcome` logs outcome events (`:81`). `rules.js:348-352` counts `abilityPlays`, `abilityImpact` and `traitPlays`.
- **Tooling.** Ability balance table: `src/data/ability-balance.js` (generated). The current football reviewer is `src/ui/screens/ability-audit.js`, which says "staged scene is synthetic frames only" (`:7`).

**Every effect key the engine consumes**, with file:line. Keys marked † are never set by any species, trait or legacy ability, so they are dead primitives.

| Key | Consumed at |
|---|---|
| afterCatch | `engine.js:234` |
| attrs | `:116`, `roster.js:73` |
| routeAgility† | `:117` |
| anchor | `:294,296` |
| blockStrength† | `:294` |
| shedStrength | `:295,326` |
| runStuff | `:295,326` |
| deepRoots | `:302` |
| riptide | `:305-308` |
| landslide | `:311,1863,2047` |
| rebound† | `:321,324` |
| blockerStun† | `:321` |
| dragonhide | `:321-322` |
| pincer | `:323` |
| roar | `:271,2029-2031` |
| ambush | `:273-276` |
| eruption | `:279-282` (blocker), `:1830-1833` (carrier) |
| rushSpeed† | `:235` |
| closeSpeed | `:236` |
| pursuitSpeed† | `:237` |
| radiantPursuit | `:239` |
| burst | `:242` |
| daybreak | `:221,1823,1979` |
| quakeStep | `:520,1129-1134,1852,2049-2053` |
| vanishing | `:521` |
| elusive | `:1850` |
| elusiveFirst† | `:522,1851` |
| cyclone | `:567-571` |
| mindGame | `:573-576` |
| eclipse | `:578-582` |
| foresight | `:799-801,955` |
| pressureSense† | `:801-802` |
| refraction | `:826-828,932-933` |
| whiteout | `:837-838,1043-1044` |
| thunderclap | `:1086,1108-1109,1935` |
| deepThrow | `:1092` |
| openAccuracy | `:1093` |
| throwVelocity† | `:1094` |
| sovereign | `:126-127,1111-1112,1966` |
| tailwind | `:892,914,1114,1924,1944` |
| undertow | `:1116,1964` |
| grove | `:1128,1355,1397,2034-2037` |
| noPlayActionBite† | `:1355,1397` |
| echoRead | `:1357-1359` |
| reaction | `:158,1879` |
| breakRadius | `:158,1233,1560,1573` |
| zoneRange† | `:1147` |
| heatHaze | `:1206-1207,1252-1253` |
| manCoverage | `:1204,1251,1953,1957` |
| aura (Bulwark) | `:146-155` |
| permafrost | `:1826-1827` |
| blink | `:1836-1840` |
| carryStrength | `:1803,1846` |
| forceFumble | `:1856,1871` |
| fumbleResist | `:1857` |
| noFumble† | `:1858` |
| bramble | `:1883` |
| glacierWall | `:1894-1897` |
| overcharge | `:123-124,1909` |
| fortress | `:1946` |
| staticField | `:1947-1948` |
| nightVeil | `:1950-1951` |
| contest† | `:1953,1957` |
| catchContest | `:1954` |
| wingShadow | `:1956` |
| pickCatching | `:1962` |
| fatigue (Iron Lungs) | `progression.js:37`, `franchise.js:1903` (weekly fatigue only) |
| longKick | `special-teams.js:26` via `roster.js:75` |

### 72-row mapping (family to Dex Football ability)

Code species data is at `src/data/species.js:46-139`. The Dex is `docs/beast-dex/data/families.json` and `abilities.json`.

Status meanings:
- **matches**: no family qualifies.
- **partial**: same trigger and target concept, but the wrong mechanics, charge or cooldown.
- **legacy-different**: a family-specific code ability with a different mechanic, often under the same name.
- **missing**: only a generic shared trait exists, and nothing resembling the Dex ability.

Position, rarity and Dex mismatches are noted as "code→Dex".

| familyId | Dex football ability | Existing code identifier(s) (species.js line) | Status |
|---|---|---|---|
| emberfox | FIR-01-F Blazing Resolve | trait quick_feet {afterCatch, attrs.agility} (:46) | missing |
| ashkit | FIR-02-F Impact Pyre | trait hard_hitter {attrs.tackling, forceFumble} (:47) | missing |
| firestorm | FIR-03-F Meteor Impact | Meteor Pass {deepThrow}; legacy meteor_pass (:48) | legacy-different (deep-throw buff vs deep-catch radial push) |
| cinderclaw | FIR-04-F Ember Grip — Scorch Mark | Ember Grip {shedStrength:3} (:49) | legacy-different (self shed buff vs pair-specific debuff) |
| pyrelynx | FIR-05-F Heat Haze | Heat Haze {heatHaze:0.15} (:50) | legacy-different (same name; separation delay vs 3 yd Catching-debuff aura) |
| pyroclast | FIR-06-F Eruption — Burning Wake | Eruption {eruption} (:51), stun 1.2 s (engine:280,1831) | legacy-different (spec §9 forbids copying the old Eruption stun) |
| tidepaw | WAT-01-F Splashdown | trait sticky {manCoverage} (:54) | missing |
| mudcub | WAT-02-F Divided Guard | trait anchor {anchor} (:55) | missing |
| reefclaw | WAT-03-F Pressure Drain | Pincer Hold {pincer} (:56) | legacy-different (engagement trigger shared; blocker stun vs stamina drain) |
| tidefin | WAT-04-F Second Touch | Slipstream {afterCatch} (:57); rarity uncommon→rare | legacy-different |
| wavehorn | WAT-05-F Breakwater | Riptide {riptide} (:58); rare→uncommon | legacy-different |
| tsunarok | WAT-06-F Tsunami Line | Undertow {undertow} (:59) | legacy-different (INT-odds buff vs INT-earned Water field) |
| thornkit | NAT-01-F Bloom Break | trait quick_feet (:62) | missing |
| mossclaw | NAT-02-F Vine Vault | trait bull_rush {shedStrength} (:63) | missing |
| rootram | NAT-03-F Deep Roots | Deep Roots {deepRoots:0.5} (:64) | partial (block anchoring; lacks root/no-translation, shed prevention, cooldown) |
| leafhorn | NAT-04-F Surefoot Canopy | Canopy Read {breakRadius, reaction} (:65) | legacy-different |
| thornback | NAT-05-F Bramble Trap | Bramble Shell {fumbleResist, bramble} (:66) | legacy-different (broken-tackle trigger shared; slow vs next-play patch) |
| elderoot | NAT-06-F Grove Guardian | Ancient Grove {grove} (:67) | legacy-different (awareness aura vs extra defender) |
| flicker | ELE-01-F Crossed Wires | trait soft_hands (:70) | missing |
| voltfin | ELE-02-F Charge Strip | trait slick (:71) | missing |
| voltfang | ELE-03-F Phase Release | Lightning Break {burst}; legacy lightning_break (:72) | legacy-different (release-phase speed vs jam bypass) |
| stormlynx | ELE-04-F Static Field | Static Field {staticField:0.1} (:73) | legacy-different (same name; zone catch penalty vs geometric field with 15% Stunned on entry) |
| joltrex | ELE-05-F Chain Break | Overcharge {overcharge} (:74) | legacy-different |
| stormcrown | ELE-06-F Stormguard | Thunderclap {thunderclap} (:75) | legacy-different |
| snowmoth | ICE-01-F Frostmark | trait steady_leg {attrs.kicking:4} (:78) | missing |
| hailfang | ICE-02-F Frost Nip | trait sticky (:79) | missing |
| frostclaw | ICE-03-F Snowfall Slam | Cold Read {reaction:0.2}; legacy cold_read (:80) | legacy-different |
| icehorn | ICE-04-F Permafrost | Permafrost {permafrost:1} (:81); uncommon→common | legacy-different (same name; −1 yd freeze on contact vs banked braking patch) |
| glaciron | ICE-05-F Cold Snap | Glacier Wall {glacierWall} (:82) | legacy-different |
| glacivern | ICE-06-F Second Chance | Whiteout {whiteout} (:83); **S→K** | legacy-different |
| gustling | WIN-01-F Runway | trait quick_feet (:86) | missing |
| breezefang | WIN-02-F Slipstream Step | trait slick (:87) | missing |
| skywarden | WIN-03-F Air Brake | Aerial Lock {pickCatching}; legacy aerial_lock (:88) | legacy-different |
| windlynx | WIN-04-F Crosswind Rescue | Updraft {closeSpeed} (:89); uncommon→rare | legacy-different |
| zephyr | WIN-05-F Tailwind Huddle | Tailwind {tailwind} (:90) | legacy-different |
| tempestra | WIN-06-F Cyclonic Release | Cyclone {cyclone} (:91) | legacy-different (route-break spin stun vs reception-charged Stumbled emitter) |
| pebble | EAR-01-F Clean Sweep | trait anchor (:94) | missing (there is no pancake at all) |
| rockram | EAR-02-F Stonewall Swat | trait hard_hitter (:95) | missing |
| boulderox | EAR-03-F Stone Charge | Stone Charge {carryStrength}; legacy stone_charge (:96) | legacy-different (same name; strength bonus vs committed rush with sideways displacement) |
| stoneguard | EAR-04-F Stone Cradle | Crushing Rush {runStuff}; legacy crushing_rush (:97); **DL→K** | legacy-different |
| terrabull | EAR-05-F Stone Screen | Quake Step {quakeStep} (:98); rare→uncommon | legacy-different |
| titanolith | EAR-06-F Landslide | Landslide {landslide:2} (:99) | legacy-different (same name; +2 yd and unbeatable pass block vs snap wall push) |
| shadowkit | DAR-01-F Shadow Patch | trait sticky (:102) | missing |
| nightowl | DAR-02-F Night Watch | trait sharp_eyes {reaction} (:103) | missing |
| duskrunner | DAR-03-F Vanishing Cut | Vanishing Cut {vanishing:1} (:104); uncommon→rare | partial (successful-juke trigger and juked-defender target match; code freezes 1 s instead of "cannot initiate next tackle"; no yard gate or cooldown) |
| mireclaw | DAR-04-F Ambush Tag | Ambush {ambush:0.3} (:105) | legacy-different |
| nocturne | DAR-05-F Blackout Pocket | Eclipse Route {eclipse} (:106); **WR→QB** | legacy-different |
| nyxshade | DAR-06-F Shadow Exchange | Night Veil {nightVeil} (:107) | legacy-different |
| glimmer | LIG-01-F Beacon Lane | trait soft_hands (:110) | missing |
| sunwhistle | LIG-02-F Dawn Signal | trait steady_leg (:111) | missing |
| lumen | LIG-03-F Guiding Halo | Clear Sight {openAccuracy} (:112); uncommon→common | legacy-different |
| prism | LIG-04-F Prism Break | Refraction {refraction} (:113) | legacy-different |
| halofang | LIG-05-F Radiant Pursuit | Radiant Pursuit {radiantPursuit:0.15} (:114) | legacy-different (same name; +15% speed from behind vs ignore allied obstruction after charge) |
| aurelion | LIG-06-F Daybreak | Daybreak {daybreak} (:115) | legacy-different (same name; uncatchable from behind vs TD-charged flash wander) |
| ironcub | MET-01-F Anchor Plate | trait anchor {anchor:4} (:118) | missing (anchor is a strength bump, not a 1 yd displacement ignore) |
| steelpaw | MET-02-F Iron Lungs | trait iron_lungs {fatigue:0.75} (:119; progression.js:37) | partial (same name and stamina theme; weekly fatigue ×0.75 vs per-play ally drain reduction) |
| gearwing | MET-03-F Gear Grid | Precision Gears {attrs.kicking:12, longKick:6} (:120) | legacy-different |
| ironjaw | MET-04-F Ball Clamp | Iron Bite {forceFumble:2} (:121) | partial (forced-fumble theme; constant ×2 vs sack-earned token for one extra check) |
| metalhorn | MET-05-F Bulwark Grid | Bulwark {aura.blocking:6, anchor:4} (:122); **OL→TE** | legacy-different |
| aegistron | MET-06-F Fortress Gate | Fortress {fortress:0.35} (:123); **CB→DL** | legacy-different |
| mindwing | PSY-01-F Mind Bend | trait sharp_eyes (:126) | missing |
| shadewisp | PSY-02-F Mirror Step | trait sticky (:127) | missing |
| cerebrix | PSY-03-F Foresight | Foresight {foresight:2} (:128) | legacy-different (same name; faster hot read vs blitz-marked 50% Confused) |
| echolot | PSY-04-F Echo Landing | Echo Read {echoRead} (:129); **LB→K** | legacy-different |
| enigmane | PSY-05-F Mind Game | Mind Game {mindGame:0.5} (:130) | partial (man defender on first route cut; 50% roll and 0.4 s stun vs charged guaranteed afterimage chase) |
| astralux | PSY-06-F Blink | Blink {blink:5} (:131), once per game (engine:1836) | partial (once-per-game 5 yd forward teleport on first tackle; lacks 8 net yd gate, mastery distance, legal path/landing, preserve-on-fail) |
| drakeling | DRA-01-F Dragon Pounce | trait hard_hitter (:134) | missing |
| wyrmkit | DRA-02-F Dragon Call | trait iron_lungs (:135) | missing |
| sablewing | DRA-03-F Hoard Flight | Wing Shadow {wingShadow} (:136) | legacy-different |
| scaleguard | DRA-04-F Dragon Stomp | Dragonhide {dragonhide} (:137) | legacy-different (no pancake) |
| vyrnax | DRA-05-F Dragon Roar | Dragon's Roar {roar:0.15} (:138); **DL→K** | legacy-different (same name; DL engage delay vs manual once-per-game FG chart) |
| aurodrax | DRA-06-F Sovereign Arm | Sovereign Arm {sovereign:10} (:139) | partial (interception denial on first read plus Q4 +10 vs streak-charged protected pass, defender absence) |

Counts: matches 0, partial 7, legacy-different 42, missing 23. The 23 missing are commons that only carry shared traits. The 24th common, steelpaw, is partial: its trait shares the Iron Lungs name.

**Position and rarity drift between code and Dex.** Seven families change position: glacivern S→K, stoneguard DL→K, nocturne WR→QB, metalhorn OL→TE, aegistron CB→DL, vyrnax DL→K, echolot LB→K. Rarity changes: tidefin, wavehorn, icehorn, windlynx, terrabull, duskrunner, lumen. Code K families today: snowmoth, sunwhistle, gearwing. The Dex adds glacivern, stoneguard, echolot and vyrnax.

### Task 8 change (spec §9, §13)
- Replace the inline key checks with a contract-driven runtime. Each contract needs eligibility, trigger, charge/cost, spent versus preserved, lifetime, cooldown unit, carryover, cleanup, events and fixtures (§9).
- Charge, cooldown and once-use ledgers belong in authoritative state that persists across plays, possessions, halftime, OT and the Clash link (§9, §10, §15). The only existing analogue is `state.abilityMemory` (`rules.js:127-131`).
- Automatic activation is the default. Vyrnax Dragon Roar is a manual exception and needs a UI/controller hook in `game-runner.step` around the FG decision (`:86-90`).
- Mastery tiers and evolution-stage scaling do not exist today.
- Remove or retire the dead primitives (†) and the legacy `ABILITIES` override path (`engine.js:111`) so that the 72 Dex abilities are the only source.
- The reviewer `src/ui/screens/ability-audit.js` must stop using synthetic staged frames (§13: "cannot ... simulate fake visuals unrelated to gameplay").

---

## 4. Statuses and conditions in football

### Current (file:line)
There is **no shared status system**. Conditions are per-actor transient fields in seconds, all created inside `makeActor` (`engine.js:128-134`). Because actors are rebuilt on every `simulatePlay` call, everything clears implicitly at the whistle. The exceptions are the drive-scoped Overcharge flag and the memory scopes.

| Mechanic | Representation | Duration / tick | Stacking |
|---|---|---|---|
| Stun (cannot steer, coasts at ×0.93/tick) | `a.stun` seconds (`:132`), applied in `steer` (`:216`), decremented in `integrate` (`:245`); blocks engagement (`:264`), tackles (`:1819`), sacks (`:1890`) | Seconds: juke 0.3 (`:518`), beaten blocker 0.45 (`:321`), missed tackle 0.45 (`:1882`), escape 0.7 (`:1912`), Pincer 1.0 (`:323`), Eruption 1.2 (`:280,1831`), Cyclone 0.5 (`:569`), Mind Game 0.4 (`:575`), Eclipse 0.2 (`:580`), Vanishing 1.0 (`:521`), Permafrost 0.35 (`:1827`), Whiteout 0.8 (`:838,1044`), Blink 0.5 (`:1838`), Glacier Wall 0.7 (`:1896`), screen turn 0.45 (`:1079`) | `Math.max` of existing and new, so no additive stacking |
| No-engage lockout | `a.noEngage` seconds (`:132,246,264`) | Seconds | Overwrite |
| Slow | `a.slowUntil` (×0.7 desired speed, `:219`), from Bramble only (`:1883`) | Seconds | Overwrite |
| Quake stumble | `d.quakeUntil` (`:1132`), −20% tackle chance (`:1852`) | 0.6 s | Overwrite |
| Roar engage delay | `blocker.roarUntil` (`:271,2031`) | 0.15 s absolute time | Overwrite |
| Cut plant | `a.cutUntil` (`:226,359`) | 0.3 s | Overwrite |
| Daybreak / afterimage | `c.daybreak` boolean caps pursuers from behind (`:221,1823,1979`) | Rest of play | n/a |
| Overcharge | memory key per drive (`:123,1909`) | Drive | n/a |
| Presentation status | `setStatus(a, code, dur)` writes a single `a.status = {code, until}` (`:91`); codes are fooled, flat, pinched, lost, spin, confused, frozen, turned, stumble, cower | Seconds | **One slot, last writer wins, no gating** |
| Frame status | `statusOf` (`:103`) priority: status, stun > 0.15, slow, charged; written to frame column 4 (`:1997-1998`) | | |

There is no knocked down, no pancake (grep for "pancake" or "knock" in `src/sim` finds nothing), and no burn, afflicted, shielded, guarded, confused (as a mechanic) or weakened. There is no episode or application count and no counting by plays.

### Task 8 change (spec §10, §9)
- Build one shared status slot per monster, kept in **game-level authoritative state** keyed by monsterId, not slot.
- Rules to implement: equal-strength extensions add duration; a stronger application replaces strength and duration; three applications per episode; weaker attempts are ignored and use no slot.
- Duration counts **completed participating plays**, including special teams and conversions. Bench time and other-unit plays pause the countdown. The application play does not count (§10).
- Transfer 1:1 with Clash, persisting through possessions, halftime and OT, and clearing at game end.
- Pancake applies Knocked Down through the gate for the rest of the play, clearing at whistle (§10).
- Stumbled is a 40% current-speed loss with no timed lock (§9).
- Shielded prevents one fumble (§10). The fumble roll at `engine.js:1867` is where that hook goes. The dead `noFumble` primitive (`:1858`) is a possible placeholder.
- Existing in-play stuns measured in seconds (juke, missed tackle, beaten blocker) are physical recovery, not shared statuses. Decide which become Stunned and which stay physics. §9 forbids timed locks on a failed pancake.
- Special teams participation does not exist as player plays (see §8). Status play-counting for "special teams plays" therefore has no participant list to read today.

---

## 5. Fields and zones

### Current (file:line)
There are **no environmental field or zone objects** and no geometry, overlap or hybrid logic. Existing "zone"-like things:
- **Coverage zones** (defensive assignments) come from `src/data/routes.js` `ZONES` (imported at `playbook.js:8`). Radii are deep 12, middle 7.5, other 7 yd (`engine.js:1147`), with an area test at `:1148`. These are AI responsibilities, not environmental.
- **Stadium type** (`venue.type`, `rules.js:29`) is passed as `envType` (`rules.js:147,407`). It gives +2% contest score to monsters of that type on both teams (`type-matchups.js:44,49-52`; `engine.js:96-97`). This is the nearest thing to a field: a whole-pitch, type-matching bonus. The spec's rule (§11) is the opposite: matching type is neutral and others are affected.
- **Weather** is drawn by hash (`rules.js:27-29`; `src/data/stadiums.js:7-30`). Grep finds **no weather use in `src/sim`**, so it does not affect the play.
- "Static Field" (`engine.js:1947`) is implemented as a coverage-zone catch penalty, not a field.
- Field bounds and geometry helpers are in `src/core/field.js`:
  - `FIELD` constants (`:13-26`): width 53.33, end zone 10, kickoff spot 35, PAT spot 15, FG +17;
  - `boundsFor` (`:31-40`), `clampPoint` (`:43-48`), `fieldGoalDistance` (`:68-70`).
  - Play-relative coordinates are x upfield from the LOS and y lateral (`field.js:8-11`).

### Task 8 change (spec §11, §12)
Build a new field primitive in authoritative game state:
- rectangle and square shapes in absolute coordinates, with world positions that do not follow the LOS;
- inward lateral shift to keep width, and length clipped at bounds (§11);
- a type-exempt rule (base type neutral);
- per-property modifiers on max speed, turning, braking, awareness, catching/blocking (Steam) and pull;
- additive same-property arithmetic with the 75%/50% caps;
- the six hybrid recipes with stable ordering;
- lifetimes in plays, including pending/next-snap placement from the upcoming formation reference;
- halftime clearing exceptions (Burning Wake and Tsunami Line persist).

The engine needs per-tick "inside field" checks on actors. Today `engine.js` has no hook for this other than inside `steer`/`speedMods` (`:214-241`). Retire or redefine stadium envType so it does not conflict with §11's base-type-neutral rule. UNVERIFIED: whether the owner wants the stadium bonus kept.

Constructs (walls, clones, obstacles, extra defenders, absences) are in §12. The engine has no notion of non-player actors. `actors` is the only collision set (`engine.js:106,253-260`), and `separate()` treats every actor as a body.

---

## 6. Fatigue and stamina

### Current (file:line)
- **The only fatigue is a persistent weekly field, `m.fatigue`, 0..100, where high means tired.**
  - It rises after each game: `(16 + (1 − dur)·10 + rng.int(6)) × IronLungs` (`src/franchise/progression.js:36-38`).
  - It also rises from practice (`src/franchise/franchise.js:1896-1903`) and Clash (`clash-link.js:13,90`).
  - It recovers 28 per week or 50 on a bye (`progression.js:56`), 15 in the draft window (`franchise.js:1079`), and resets at season rollover (`franchise.js:859-860`).
  - It raises injury risk (`progression.js:40`).
- **In-game effect.** At most −6% to speed, strength and agility through `effectiveAttributes` (`monsters.js:155,163`). This is computed once when the lineup is built (`roster.js:68`, called at `roster.js:118`), so it is **constant for the whole game**.
- **No in-game drain, no halftime restore, no exhaustion.** Grep for "stamina", "tired", "halftime" and "exhaust" in `src/sim` finds only an unrelated comment (`engine.js:844`). Halftime only resets timeouts and sets up the kickoff (`rules.js:533-536`). Durability is not read inside the sim.

### Task 8 change (spec §12)
- Add a new **remaining-stamina** resource per monster for the current game. The maximum and initial value equal permanent Durability, 1:1.
- Drain 1 point per completed played football play, counting participation from `sim.names` / on-field slots.
- Bench and other-unit time does not drain. Halftime alone restores 50% of maximum (hook at `rules.js:533`).
- At zero, set a game-long exhausted flag that halves all 12 effective attributes once, including OT and the deciding Clash.
- Show a low-stamina battery at 25% or below.
- Keep this separate from the weekly `fatigue` field (§12: "do not mix the old fatigue-is-high-when-tired field"). Decide whether the weekly fatigue and the −6% penalty survive. UNVERIFIED: owner intent. Spec §15 allows a fresh-save break.
- Ability hooks need a stamina API:
  - Pressure Drain drains points;
  - Iron Lungs reduces drain;
  - Afflicted reconciliation (§12) is still pending.

---

## 7. Telemetry and box score

### Current (file:line)
**Per-play engine stats object** (`engine.js:201-205`): passer, target, receiver, carrier, tackler, airYards, yac, brokenTackles, pressure, interceptor, forcedBy, pressureBy, pressureAllowedBy, sackAllowedBy, sackUnblocked, coverBy, coverKind, pbuBy, dropped, assistBy, fumbledBy, recoveredSlot, recoveredTeam, and `blockers{slot:{pass,run,lost}}`. Additional fields: `arriveSep` (`:1942`), `catchX` (`:1980`), `defensiveScore` (via `endPlay` extra).

How each is populated:
- **Pressure** is the first time any unengaged, unstunned defender is within **3.2 yd** of the QB (`:791-795`). Allowed-by is the blocker beaten within 1.2 s (`:797`).
- **Sack allowed** is the blocker beaten within 1.5 s, else unblocked (`:1908`).
- **Coverage responsibility**: the man defender, else a zone defender within 2.5 yd of the landing spot, else "open" (`:1938-1941`).
- **Drop** = incomplete, not contested, receiver within catch radius (`:1989`).
- **PBU** = contested incomplete, credited to the nearest defender (`:1989`).
- **Assist** = nearest other defender within 1.3 yd (`:1876`).
- **Blockers**: on engagement, `pass` or `run` is set to 1 (`:287`); `lost` is incremented on a shed (`:325`).
- **Events.** Every event carries `t`; the full list of kinds was enumerated by grep. Notable: shed (`:326`), whiff (`:674`), juke (`:522`), broken and broken_tackle (both logged for one break, `:1884,1886`), tackle (`:1879`, with `offBlock` at `:1811`), sack (`:1910`), escape (`:1914`), catch with contested (`:1982`), incomplete with dropped/pbu (`:1990`), interception (`:1970`), fumble (`:1871,1903`), ability (`:77`). **There is no engagement-start event.**
- **Output** also includes `typeContests` (`:94-101`), the QB read log `qb` (`:2109`), `names` and `frames`.

**Per-player box score** (`rules.js:286-353`, keyed by **slot** in `state.stats[side].players[slot]`):

| Category | Keys |
|---|---|
| Snaps | snapsOff, snapsDef (`:294-295`) |
| Passing | att, comp, passYds, longPass, passFd, passTd, intThrown, pressured, sacked, sackYds (`:298-312`) |
| Receiving | targets, rec, recYds, yac, longRec, recFd, recTd, td, drops (`:302-309`) |
| Rushing | rush, rushYds, longRush, rushFd, rushTd (`:315-319`) |
| Ball security | fum, fumLost (`:321`) |
| Blocking | pbSnaps, rbSnaps, blocksLost, sacksAllowed, pressuresAllowed (`:323-325`) |
| Defense | tackles, assists, tfl, sacks, sackYds, pressures, int, pd, ff, fr, defTd (`:327-339`) |
| Coverage | covTargets, recAllowed, ydsAllowed, tdAllowed (`:341-344`) |
| Extras | jukes, broken, sheds, abilities, traitPlays, abilityPlays, abilityImpact (`:346-352`) |
| Kicker | fga, fgm, binned fg0/30/40/50 a/m, fgLong, xpa, xpm (`:355,398,478-479`) |
| Two-point | twoPtAtt, twoPt for passer/carrier only (`:412`) |

- Team totals are in `blankStats` (`:56`); team punt count at `:458`.
- Season and career aggregation maps slot back to monster through the lineup at game end (`src/franchise/stats.js:236-237,328`). `GAME_KEYS` lists what is kept per game (`stats.js:134`).

### Not recorded but needed by spec §7
- **OL**:
  - per-play scored opportunity with an assignment;
  - successful protection interval or run-lane contribution (`blockers` only records that an engagement occurred and how many sheds);
  - pancakes (no mechanic);
  - "disruptive" shed versus harmless shed;
  - distinction between an unblocked blitzer, another blocker's error and the QB holding the ball (partly: `sackUnblocked`, `lastBeat` window).
- **QB**:
  - designed versus improvised QB runs (scramble is only an event, `:1124`; designed keep/option sets carrier at `:207`);
  - 4+ yard QB run classification (derivable);
  - attributable QB fumble (fumbledBy, derivable).
- **RB**:
  - catchable drop flag (`dropped` approximates it);
  - negative carries (derivable from rushYds per play, but only totals are kept: not per-play).
- **WR / TE**:
  - per-reception list (needed for explosive 20+ yd counts, YAC average, first downs on 3rd/4th down, red-zone first downs);
  - down and field position per target. `recordPlayerStats` gets `toGo` only (`rules.js:273,286`), not down or ballOn;
  - uncatchable versus catchable target classification;
  - accepted penalties: no penalty system exists.
- **DL / LB / CB / S**:
  - hits and hurries (pressure is proximity only, and spec §7 says "mere proximity is not pressure");
  - run stops of 2 yd or less (derivable per play, not stored);
  - gap control and redirection, contain, lost contain causing scramble of 10+ yd;
  - double-team occupation;
  - **missed tackles credited to the defender** (`broken_tackle` events carry `victim` (`:1884-1886`), but `rules.js:346-347` only credits the carrier's `broken`);
  - tackles with YAC at contact;
  - valid tackle attempts versus pursuit chases;
  - first downs allowed per coverage target (only tdAllowed and recAllowed);
  - execution windows ("viable window" while a throw is possible);
  - deep-window prevention;
  - 4th-down personal stops (no down in stats);
  - attribution-certainty flag;
  - unavoidable ability-override exclusion flag (for example, Night Veil currently forces catchP = 0 and the play then records a **drop** when the ball was within the radius: `engine.js:1950-1951,1989`).
- **Kicker**:
  - pre-attempt p is computed but **not stored** (see §8);
  - punt and kickoff target and distance error;
  - illegal out-of-bounds or unintended touchback classification;
  - punts and kickoffs per kicker (team count only).
- **Cross-cutting**:
  - stats are keyed by slot, not monster. A borrowed bench player (`rules.js:194-195`, `borrowed:true`) has stats mapped to the lineup occupant at game end (`stats.js:237`), a misattribution against spec §15 ("aggregate by monster, not occupied slot");
  - two-point plays do not record ordinary stats;
  - there is no per-play opportunity log, which every §7 formula needs for "one score per play".

### Task 8 change (spec §7, §15)
- Add an authoritative per-play, per-monster telemetry ledger keyed by monsterId: assignment, engagements (start, end, winner, pancake), pressure/hit/hurry with attribution, tackle attempts (valid/miss/YAC), target classification, down, distance and field zone, plus provenance (ability override, clone).
- Grading reads the ledger. Keep the ordinary box score intact (§7).

---

## 8. Special teams

### Current (file:line)
All kicks are **formula-resolved outside the physics engine** (`src/sim/special-teams.js`). No kicker actor or coverage units exist, and the only players involved are K and a returner. The returner is the first filled slot of WR2, RB, WR1, CB2 (`roster.js:76-77`).

- **FG.**
  - `fieldGoalChance(distance, kicking)` (`special-teams.js:9-16`): `maxRange = 42 + 20k`; returns 0.02 beyond maxRange+4; otherwise base `0.985 − max(0, d−22)·(0.03 − 0.019k)` minus a short penalty, clamped to 0.03..0.99.
  - `attemptFieldGoal` (`:24-29`) computes `p` with Precision Gears `longKick` at 40+ yd, rolls `rng.chance(p)`, and **returns `chance: p`** (`:28`).
  - **A pre-attempt p is available**, but `rules.doFieldGoal` (`rules.js:472-499`) does not store it in stats (`:478-479`). The UI helper `fieldGoalInfo` exposes it pre-kick (`rules.js:589-592`). The AI uses `fieldGoalRange` (≥45%) (`special-teams.js:19-22`; `coach-ai.js:22,157`).
  - Distance = `100 − ballOn + 17` (`field.js:68-70`). On a miss, possession goes to the spot +7 or the 20 (`rules.js:490`).
- **PAT.** `attemptExtraPoint` (`special-teams.js:31-36`): 32-33 yd, `p = fieldGoalChance + 0.03`, clamped to 0.5..0.99, and returns `chance`. Recorded as xpa/xpm only (`rules.js:398`).
- **Kickoff** (`special-teams.js:42-67`):
  - onside recovery `0.18 + 0.12k` (`:44-50`);
  - distance `52 + 18k + N(0,5)` from the 35 (`:51`);
  - touchback if 4+ yd deep, or 75% chance inside the end zone (`:54`);
  - return yards formula from returner speed and agility (`:58`), big-return and TD chances (`:61-64`);
  - **no target, no out-of-bounds kickoff, no lateral placement.**
- **Punt** (`special-teams.js:73-99`):
  - block `rushPressure·0.4` with default 0.05, so 2% (`:75`);
  - distance `34 + 16k + N(0,6)`, with a 6% shank ×0.55 (`:78-80`);
  - coffin-corner pin inside the 10 (`:84-87`), touchback (`:88`);
  - fair catch 45% or inside the 8 (`:92-93`), return formula (`:94`);
  - **no target, no out-of-bounds placement.**
  - The free kick after a safety reuses `punt` from the 20 (`rules.js:433`).
- **Two-point tries** use the full engine (`rules.js:402-417`). OT period 3+ is two-point only (`rules.js:556`).

### Task 8 change (spec §7 Kicker, §9, §12)
- Store `p` per FG and PAT attempt, including ability effects. The structure exists (`special-teams.js:28,35`). Score each attempt as `2·(result − p)`.
- Vyrnax Dragon Roar replaces p with an interpolated chart (90 yd 30% ... 65 yd or less 100%), with range extended to 90 yd. `fieldGoalChance` returns 0.02 beyond maxRange+4 (`:12`).
- Glacivern Second Chance needs a reroll before the result is final.
- Punt and kickoff placement grading needs a "legitimate pre-launch target" and "existing catch/landing physics". Neither exists. A landing point is computable (`special-teams.js:52,81`) but there is no lateral component or target.
- Several Dex abilities need real special-teams events:
  - Stone Cradle: caught punt;
  - Gear Grid: 35+ net punt yards;
  - Frostmark: made FG;
  - Dawn Signal: kickoff play speed;
  - Echo Landing: field.
- Special-teams participation, for status and stamina counting, needs a participant list. Today only K and the returner are "involved", and no stats exist for them except K kicks.
- §7 requires "Use existing catch/landing physics, not new roll/bounce mechanics". Physics exists only for passes. Flag this to the owner (see risks).

---

## 9. Overtime and opening Clash link

### Current (file:line)
- **Opening (pregame) Clash** decides possession only.
  - `franchise.js:2645` `pregamePossession(f)` feeds `coinWinner` and `choice` into `playGame` / `newGame` (`franchise.js:1600,2335,2647`; `rules.js:17-24`).
  - Clash setup is at `franchise.js:2728-2760`. When the AI wins, it picks with `aiPossessionChoice` (`clash-link.js:98`). Lineups are snapshotted through `snapMonster` (`clash-link.js:37`), which copies **only** id, species, type, nature, level, stage, potential, fatigue and attributes.
- **Overtime.**
  - Football plays possession-based OT from the opponent 25 (`rules.js:544-557,558-586`). Franchise sets `OT_PERIODS = 1` (`franchise.js:2656`).
  - If still tied, `state.needsTiebreak = true` and the game is finished (`rules.js:567`). An overtime Clash then sets `state.winner` and `state.tiebreak` without touching the score:
    - 3v3, or 5v5 in the playoffs (`clash-link.js:11`);
    - `franchise.js:2653-2725`;
    - `applyTiebreak` (`:2702-2707`), `settleTiebreak` (`:2709-2713`), and AI-vs-AI `leagueTiebreak` (`:2716-2725`).
- **Carryover between football and Clash.** The only carryover is fatigue added by the Clash (`clash-link.js:80,90`) and XP. **No statuses, charges, cooldowns, stamina or field state transfer.** `abilityMemory` is football-only (`rules.js:127-131`).

### Task 8 change (spec §10, §12, §15)
- Supported statuses transfer 1:1 with remaining duration and episode history at both handoffs: pregame Clash to football, and football OT to the deciding Clash. Unsupported ones clear.
- Clash KO clears the monster's status and episode.
- Exhaustion carries into the deciding Clash (§12).
- Same-game carryover must not be cleared by "standalone battle boundaries" (§10).
- `snapMonster` (`clash-link.js:37`) and the `f.week.pregame` / `f.week.overtime` records (`franchise.js:2676,2753`) need a status, charge and stamina payload, plus a write-back path into football game state, and the reverse for OT.
- Sovereign Arm absence and charge, Blink use, and Dragon Roar use must survive possessions, halftime and OT (Dex).

---

## Risks / surprises

1. **The two-lineman 7v7 front** (LG/RG, plus C only in tight) limits OL-centric Dex abilities. Wall widths, Landslide "full qualified front", Stormguard "outside both offensive line ends" and Divided Guard all need checking against a 2-3 man line.
2. **Seven Dex families change position** (glacivern, stoneguard, echolot and vyrnax become K; nocturne becomes QB; metalhorn becomes TE; aegistron becomes DL) and rarity changes for 7. This touches species data, rosters, cornerstones (`monsters.js:271-280` references stoneguard as DL) and AI pick logic (`monsters.js:136-143`). The Dex K count grows from 3 to 7 families, but kicks have no physics.
3. **There is no kick physics.** Spec §7 Kicker placement grading assumes "existing catch/landing physics" that does not exist, and several Dex K abilities need special-teams events. This needs owner clarification: a formula target, or a new kick sim.
4. **`species.js:3` cites a non-existent EFFECT_PRIMITIVES table.** Eleven effect keys (†) are consumed but never produced. These are stale code paths.
5. **Pressure is pure proximity (3.2 yd).** §7 explicitly says proximity is not pressure, so current `pressures` and `pressuresAllowed` would misgrade OL and DL.
6. **Night Veil records a "drop"** when the ball lands within the catch radius (`engine.js:1950-1951,1989`). This is an ability-forced incompletion attributed as receiver error.
7. **Stats are keyed by slot**, and borrowed bench players are misattributed (`rules.js:194-195`; `stats.js:237`). §15 requires per-monster aggregation.
8. **Fumble resistance uses Catching, not Strength** (`engine.js:1855`). Acceleration uses Agility, not Speed (`:131`). Both contradict §12.
9. **Every in-play condition is in seconds and is rebuilt per play.** No cross-play state exists except `state.abilityMemory`. The shared-status, charge, field and stamina runtime is entirely new authoritative state, and it must be added to save/replay (§15).
10. **The duplicate broken-tackle events** (`engine.js:1884` 'broken' and `:1886` 'broken_tackle') must be deduplicated in a new ledger.
11. **The stadium envType bonus favours the matching type** (`type-matchups.js:44`). This conflicts with §11 (matching type is neutral on fields). Decide whether to keep the stadium bonus or redefine it.
12. **The existing Ability Audit uses synthetic staged frames** (`ability-audit.js:6-7`), which §13 prohibits.
13. **Trait text versus behaviour mismatch.** Steady Leg says "under pressure (late, close games)" but applies a flat +4 always (`species.js:24`; `roster.js:73`). Quick Feet says "+4 Agility" but applies +2 agility plus an after-catch speed bonus (`species.js:18`).
14. UNVERIFIED: whether the UI watch mode calls `simulatePlay` only once per play. Only the engine contract was read, not `src/ui` replay code.
