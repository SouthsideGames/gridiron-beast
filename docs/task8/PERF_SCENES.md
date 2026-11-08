# Task 8 performance: matched scenes, profile and optimisations

**Status of the scene set: PROPOSED, pending owner approval.** SPECIFICATION_BASELINE §14 makes the exact scene manifests and the
warm-up handoff dependencies, so nothing below is frozen until the owner approves it. The comparison method for the ability-heavy
scenes (section 3) is a proposal; the owner chooses it.

Requirement (§14, §16, §25): simulation CPU at most **10% slower** than a matched baseline, same hardware, same scenarios. No mechanic is
weakened, no legitimate effect removed, and the requirement is not relaxed to obtain a pass.

Files:
- `tools/perf/scenes.json`: the manifest (protocol, call sets, scenes, explicit rosters).
- `tools/perf/scene-worker.mjs`: runs a scene against one build root (imports that build's engine and rules).
- `tools/perf/run-scenes.mjs --base=DIR --cand=DIR`: the interleaved comparison (ms per scene, ms per play, ratios).
- `tools/perf/profile-scenes.mjs`: drives the scenes under `node --cpu-prof`, and summarises or diffs profiles.
- `tools/perf/identity.mjs`: outcome-identity hashes for optimisation work.
- `tools/perf/make-rosters.mjs`: provenance of the frozen rosters (not run by the runner).

The baseline build is `main` 43976f4 (v42.22.0, pre-Task 8), extracted with `git archive origin/main`.

## 1. What "matched" means here

Both builds receive the same inputs: the same rosters and attributes, the same plays called, the same seeds, the same number of
plays, the same situation (ball spot, down, distance, clock, stadium type). The runner checks this for every scene: it hashes the
inputs each worker built and the engine-relevant part of every called play on each build, and stops if they differ.

The outputs are not the same: Task 8 changed the mechanics (pancake contest, approved shed formula, statuses, stamina), so a play with
the same inputs can run a different number of ticks. The runner therefore also reports ticks per play and a per-tick ratio as a
diagnostic. The gate figure is the ratio of ms per scene, on identical inputs.

### Rosters

Generators differ between builds and the baseline cannot run Dex abilities, so every scene uses fixed, explicit rosters stored in
`scenes.json` (`rosters`). Eight clubs were generated once (`make-rosters.mjs`) and frozen:

| Roster | Provenance | Mean speed / strength / awareness |
| --- | --- | --- |
| T62a, T62b | Task 8 `generatedTeam(11 / 12, quality 62)` at acdc91e | 48/47/52, 39/42/44 |
| T75, T50 | Task 8 `generatedTeam(13 / 14, quality 75 / 50)` | 45/44/41, 32/33/37 |
| M62a, M62b | main `generatedTeam(11 / 12, quality 62)` at 43976f4 | 60/59/57, 58/60/57 |
| M75, M50 | main `generatedTeam(13 / 14, quality 75 / 50)` | 74/71/70, 49/51/44 |

The two generators produce quite different clubs (Task 8 clubs start lower), which is one reason the earlier unmatched measurement
(each build with its own generated teams) is not a like-for-like comparison. Scenes use both sets.

**Field mapping (every field a scene passes):**

| Field | Baseline (main) | Candidate (Task 8) | Mapping |
| --- | --- | --- | --- |
| `id`, `name` | read | read | same value |
| `position` | read by rules.js (bench fill) | same | same value |
| `type` | type matchups | same | same value; an ability overlay sets the family's type on both builds |
| `attrs` (12 ratings) | read | read | same values |
| `permDurability` | ignored | stamina input | set to the generated value (= durability) |
| `species`, `form`, `mastery` | legacy species effect | Dex contract | **never** set in ordinary scenes; set only in the candidate's ability variant |
| `ability` | legacy ability id | retired | never set |

Engine options (engine tier): one options object is passed to both builds. The baseline reads `memory`, `envType` and `forcedTarget`;
the Task 8 fields (`t8: { status: {} }`, `offenseSide`, `toGo`, `sitsOut` and `exhausted` as empty sets, `createdFields: []`) are what
rules.js passes at a fresh game's snap, and the baseline ignores them.

Rules tier: `R.newGame` with an explicit neutral venue (`type` from the scene), coin to home, 900-second quarters. Before every snap
the scene stages the same situation on both builds (phase scrimmage, possession = the scene's unit, ball spot, 1st and 10, clock
900, quarter 1) and re-seeds the game's rules stream from `sequence * 1000 + snap`, so every snap's play seed (the first draw in
`runScrimmagePlay` on both builds) is identical. Game state otherwise carries between snaps of a sequence (ability memory, the
Task 8 block: charges, fields, statuses, stamina, absences).

### Protocol

- One long-lived worker process per build, plus a separate candidate process for the ability variant (so contract-carrying actors
  never shape the JIT state of the process that runs the matched scenes). The runner asks them in turn, never two at once.
- Metric: process CPU time over the timed section (`process.cpuUsage`, user + system; includes V8's GC and compiler helper threads),
  which other processes on the machine inflate far less than wall time. Wall time is recorded too and reported alongside.
- Per scene and variant: **3 warm-up runs, discarded**, then **15 measured repeats** in alternating order (base, cand / cand, base).
- Timed section: the simulation calls only (inputs, clubs and game states are built before the timer; fingerprints after).
- Reported: median ms per scene, median ms per play, spread (min to max, interquartile range in the JSON), ratio of medians,
  median of per-round paired ratios, ticks per play and per-tick ratio.
- Every run's light fingerprint (result, yards, elapsed, frame and event counts per play) must equal the first run's.
- Absolute timings on the development machine (2 CPUs, shared with other agents) are noisy. **Official numbers must be re-run on a
  quiet machine.**

## 2. The scene set (PROPOSED)

Ordinary scenes (no abilities on either build; matched exactly; the primary like-for-like comparison):

| Scene | Tier | Clubs | Calls | Plays | Notes |
| --- | --- | --- | --- | --- | --- |
| O1-pass-T | engine | T62a v T62b | PASS (6 base passing calls) | 16 seeds x 6 = 96 | own 35 |
| O2-run-M | engine | M62a v M62b | RUN (6 base runs) | 96 | own 35 |
| O3-wide-mismatch | engine | M75 v M50 | WIDE (8: a released bunch play, play action, verticals, man, zone, runs) | 12 x 8 = 96 | own 25, Wind stadium |
| O4-redzone-cross | engine | T62a v M62a | REDZONE (goal-line fronts) | 96 | opponent 12 |
| O5-legendary-plays | engine | M62b v T62b | LEGEND (the five Legendary Plays, no Legendary on the field) | 96 | own 40 |
| O6-rules-mix | rules | M62a v T62a | MIX | 8 sequences x 12 snaps | through `runScrimmagePlay` |
| O7-rules-pass-T | rules | T62b v T62a | PASS | 8 x 12 | through `runScrimmagePlay` |

Ability-heavy scenes (Task 8 only, rules tier, 8 sequences x 12 snaps = 96 plays each, M3 football contracts). Each has an **inert
twin**: the same scene with the overlays' types but no species, no primed state and no staged fields, which is an ordinary scene
both builds run.

| Scene | Clubs | What it exercises (abilities placed; all in their own Dex position) |
| --- | --- | --- |
| A1-overlapping-fields | T62a v T62b, MIX | three staged overlapping fields (Dark whole-field, Wind 30-50, Fire 35-48) plus field creators and readers: Runway (gustling WR1), Glimmer (WR2), Charge Strip (voltfin RB), Eruption (pyroclast TE); Static Field (stormlynx SS), Psychic zone (mindwing FS), Impact Pyre (ashkit LB1, bar primed 2 of 3), Permafrost (icehorn DL1), Splashdown (tidepaw CB1), Dark field (shadowkit CB2). Fields accumulate through each sequence. |
| A2-summons-constructs | T62a v T62b, SUMMON | Stormguard's temporary pass blockers (stormcrown QB), Landslide's rock wall (titanolith LG; every snap a new possession), Grove Guardian's extra defender (elderoot LB1), Snowfall Slam's snowballs (frostclaw LB2, bar re-primed full each snap), Aegistron's panels (DL1, re-primed each snap) |
| A3-delayed-effects | T62b v T62a, MIX | effects banked for later snaps and status durations: Dragon pulse (wyrmkit TE), Charge Strip token (voltfin RB), Nocturne's Dark field (QB), Bloom Break patches (thornkit WR1); Mire claw (mireclaw LB1), Stonewall Swat guarantee (rockram LB2), Psychic zone (mindwing FS), Permafrost (icehorn DL1), Frost Nip (hailfang CB1) |
| A4-legendary-sequence | M62a v M62b, LEGEND | the Legendary Plays with their Legendaries: Sovereign Arm (aurodrax QB, streak primed 2 of 3: charge, protected throw, a captured defender's absence served at the next snap), Cyclonic Release (tempestra WR1), Landslide (titanolith LG), Night Veil (nyxshade CB1, primed), Grove Guardian (elderoot LB1) |
| A5-full-contracts | T62a v T62b, WIDE | every on-field slot of both units carries a non-legendary Dex family of its position, as in a Task 8 game where every monster has a contract (assignment in `scenes.json`) |

What fired in one pass of each ability scene (Task 8 events and contract executions, 96 plays each):

| Scene | Fields created | Executions | Main events |
| --- | --- | --- | --- |
| A1 | 78 | 55 (8 subjects) | Impact Pyre 8 + 16 charges, Charge Strip 7, Psychic zone 10, Splashdown 4, Dark field 4, Glimmer 3 |
| A2 | 0 | 224 (5 subjects) | rock wall 96, panels 80 (16 blocked), pass blockers 16, extra defender 16, snowballs 32 |
| A3 | 21 | 68 (9 subjects) | Bloom Break 16, Frost Nip 16, Dragon pulse 16, Mire claw 15 (Weakened 15), Stonewall 8, Permafrost 1, Dark field 1 |
| A4 | 0 | 46 (5 subjects) | Landslide 13, Grove Guardian 16, Night Veil 8, Sovereign Arm charged 6 and protected 6, Cyclonic Release 3 (5 hits, Stumbled 5) |
| A5 | 16 | 240 (11 subjects) | Surefoot Canopy 96, Heat Haze 97, Breakwater 46, Ember Grip 24, Pressure Drain 24, Meteor Impact 24, Divided Guard 26, Deep Roots 16, Cold Snap 8 |

## 3. Comparing the ability-heavy scenes (PROPOSAL; the owner decides)

The baseline has no Dex abilities, so an ability scene has no exact baseline counterpart. Three figures are reported for each:

- **R0 = cand(inert twin) / base(inert twin):** a matched ordinary comparison on the ability scene's own clubs, calls and staging.
- **R1 = cand(ability) / cand(inert twin):** the cost of the abilities on the candidate.
- **R2 = cand(ability) / base(inert twin) = R0 x R1:** the candidate running the full ability scene against the baseline running
  the same scene without abilities.

Options for the owner:

- **Method A (strict):** gate on R2 <= 1.10. Every ability's cost counts against the 10%. It treats the abilities as overhead to be
  absorbed, although the baseline has nothing equivalent to run.
- **Method B (engine overhead):** gate on R0 <= 1.10 (and on the ordinary scenes); report R1 per scene with a separate budget the
  owner sets (for example R1 <= 1.25), so new mechanics are bounded without being compared with nothing.
- **Method C (legacy abilities):** run the same rosters with species on both builds: the baseline runs its legacy species effects,
  the candidate the Dex contracts. Closest to "a game with abilities on both", but the two ability sets differ in kind and frequency,
  so it is not matched input in the sense above. Not implemented; it needs only a runner switch if chosen.

The recommendation, not a decision: Method B, with A reported alongside.

## 4. Profile of the football slowdown (ordinary matched scenes)

Method: `node --cpu-prof` on both builds, `profile-scenes.mjs --loops=8` (the seven ordinary scenes, one warm-up pass, eight timed
passes), then `--summarize --vs` (self time per function and per file; functions keyed by file and name). The profiler slows both
builds and dilutes the gap (in-profile gap +18%, unprofiled about +45%), so the table shows where the time goes, not the size of the
gate gap.

Profiles taken on a quiet machine (load 0.3), before any optimisation: baseline 43976f4 against Task 8 acdc91e. Self time in ms, the
seven ordinary scenes, eight passes (5,376 plays). Total: baseline 26.3 s, Task 8 31.2 s (+4.9 s); `sim/engine.js` 20.7 s against 25.0 s.

| Task 8 change | Where the time goes | Baseline | Task 8 | Diff | Introduced by |
| --- | --- | --- | --- | --- | --- |
| M3 ability hooks in the body-separation pass | `separate()`: every one of the 153 actor pairs per tick now reads `engaged2`, `passAllies`, `phased` (properties most actors never have) before the distance test, and `anchor` / `FX.resist` in the push. Line ticks inside it: `dist` 549, the `phased` test 357, the `passAllies` test 318, the `engaged2` test 169; plus 1,908 ticks of it inlined at its call site in `simulatePlay` | about 720 | about 3,480 | **+2,760** | d9dc7da (Fire/Water: `engaged2`), 23a84a2 (Light/Metal: `passAllies`), 95e80c4 (Nature/Electric: `phased`, `anchor`); the `FX.resist` share from the fields work (field-effects.js) |
| M2 pancake contest and approved shed formula | `resolveOne` (the engagement resolution split out for `engaged2`) 498, `shedScore` 373 (an `Object.entries(...).reduce` allocated on every engaged tick), `pancakeConstants` 81 (rebuilt and bounds-checked on every opportunity), `pancakeOpportunity` 36, `resolvePancakeOpportunity` 32, `positionOf` 42 + its regular expressions 25 (twice per engaged tick) | (inlined in `resolveEngagement`) | about 1,090 | **about +1,000** | 7975741 (pancake.js), 1254a79 (engine: pancake in the engagement, shed formula), d9dc7da (`resolveOne` / `engaged2`) |
| Allocation | garbage collector (mostly the `shedScore` entries arrays and the per-call constants objects) | 2,804 | 3,558 | **+754** | as above |
| Frame recording | `recordFrame` (same code on both builds; the difference follows longer plays in O5 and less inlining) | 467 | 604 | +137 | none (indirect) |
| Movement | `steer` (+86: `FX` coast and shaping tests, `forcedAim`), `integrate` (+68: `FX.displace`, `anchor`) | 1,176 | 1,330 | +154 | 95e80c4, field-effects work |
| Engine per-step work, other | `makeActor` +47, `tryEngage` +35 (new hook and gate tests), `trySack` +33, `tryTackle` +38, `interceptTime` +31 (new), `scaleVs` +61, `updateRead` +69 | | | about +310 | M3 batches |
| Statuses | `t8StatusEffect` 9, status-runtime.js 19 | 0 | 28 | +28 | M2 status runtime |
| Stamina | stamina-runtime.js 20, stamina.js 4, fraction.js 15 (rules tier only) | 0 | 39 | +39 | M2 stamina |
| Fields | field-effects.js 6 (no field in an ordinary scene: `FX` is null) | 0 | 6 | +6 | M3 fields |
| Ability hook dispatch | `hook` 6 (no contract on an ordinary scene's actors) | 0 | 6 | +6 | M3 registry |
| Rules wrapper | rules.js (`runScrimmagePlay`, `sitsOutOf`, `preSnapContracts`, stamina and status clocks) | 23 | 41 | +18 | M2/M3 |

Reading: about 60% of the gap was the separation pass's new per-pair checks; about 35% the pancake/shed code's per-tick allocation
and repeated work. Statuses, stamina, fields, hook dispatch and frame recording are small on ordinary plays. The earlier finding that
"the engine's per-step work grew more than the new modules" is confirmed, and it is concentrated in two places.

## 5. Optimisations (outcome-identical)

Identity proof for every optimisation: `tools/perf/identity.mjs --compare` against hashes taken before any change (acdc91e engine,
fd43138): all 17 scene variants (each play's complete output: result, frames, events, statistics; for the rules tier the game states
afterwards) and 12 full AI games between generated clubs with their Dex abilities on (every step's event and play output, the final
score, log, statistics and Task 8 block): **IDENTICAL** after each step. Targeted tests after the changes: `tests/task8-*.test.js`
(31 files), `tests/legendary-plays.test.js`, `tests/replay.test.js` (270 tests), and `tests/engine.test.js`, `tests/abilities.test.js`,
`tests/pursuit.test.js`, `tests/run-read.test.js`, `tests/qb-read.test.js` (58 tests): all pass. No mechanic, value or event order
changed.

| # | Commit | Change | Why it is identical | Measured effect |
| --- | --- | --- | --- | --- |
| 1 | a1eba73 | `separate()` (engine.js): a pair that is 0.7 yd or more apart on either axis is skipped **before** the M3 hook checks. | `Math.hypot(dx, dy) >= max(abs(dx), abs(dy))`, so such a pair never satisfies `d < 0.7` and is never pushed; the skipped checks are pure reads (`continue` only). Same expressions, same order, same pushes for every remaining pair. | In-profile self time of `separate` 1,826 ms to 599 ms. Ordinary scenes, best-of-11 ratio on a loaded machine: 1.315 to 1.073. |
| 2 | 2fb84be | `shedScore` (t8/pancake.js) reads the weights from `[attribute, weight]` lists built once, with a plain loop; `pancakeConstants()` with no override returns one frozen, precomputed object. | The approved values are frozen (`Object.isFrozen` true for the rule and each weight table). The loop sums in the same order from 0 as the `Object.entries(...).reduce` it replaces (`s + k * d[a]`), so every score is bit-identical. An override still builds and bounds-checks a new object; no caller mutates the default. | `shedScore` 373 ms to 21 ms, `pancakeConstants` 81 ms to 2 ms (in-profile), less allocation (GC 3,558 to 3,240 ms with step 3). |
| 3 | 09c0530 | `positionOf` (data/personnel.js) memoises its result per slot name. | A pure function of a string; non-string input still goes through the original regular expressions. | `positionOf` plus its regular expressions 67 ms to 33 ms (in-profile). |

Profile after all three (same conditions as section 4, quiet machine): total 25.7 s against the baseline's 26.3 s and Task 8's 31.2 s
before (the profiler dilutes the gap; see section 6 for the unprofiled ratios). The remaining in-profile excess on ordinary scenes is
`separate` (+500, the near pairs still read the hook properties), `simulatePlay` self (+495), `resolveOne` (+440), GC (+436) and
`recordFrame` (+75); other engine functions are now at or below the baseline (-96 across the anonymous closures).

Steps 2 and 3 are below the run-to-run noise of the scene ratios on this shared machine (best-of-11 ordinary ratios 1.073 after step 1,
1.108 after step 2, 1.092 after step 3), so their effect is stated from the profile, not from the ratios.

## 6. Results: matched-scene ratios before and after

Final measurement, 2026-11-08 15:44-15:51 (load average 0.4 to 2.0 on 2 CPUs: other agents were working; **not official**), 3
warm-up runs, 15 interleaved repeats, medians. Before = acdc91e engine (fd43138), after = 09c0530 engine. Ratio = candidate / baseline.

**Ordinary scenes (matched exactly):**

| Scene | Before: CPU | Before: wall | After: CPU | After: wall | After: baseline ms/play (wall) | After: Task 8 ms/play (wall) |
| --- | --- | --- | --- | --- | --- | --- |
| O1-pass-T | 1.229 | 1.276 | 1.102 | 1.024 | 3.81 | 3.90 |
| O2-run-M | 1.280 | 1.191 | **1.201** | 1.091 | 1.92 | 2.10 |
| O3-wide-mismatch | 1.354 | 1.431 | 0.983 | 0.986 | 5.86 | 5.77 |
| O4-redzone-cross | 1.990 | 1.495 | **1.275** | **1.120** | 1.65 | 1.85 |
| O5-legendary-plays | 1.372 | 1.414 | 1.089 | **1.148** | 2.56 | 2.94 |
| O6-rules-mix | 1.206 | 1.240 | 1.018 | 0.925 | 3.57 | 3.30 |
| O7-rules-pass-T | 1.234 | 1.223 | 0.943 | 1.034 | 3.54 | 3.66 |
| **All seven (sum of medians)** | **1.336** | **1.327** | **1.050** | **1.027** | | |

Ticks per play are equal on both builds except O5 (61.1 baseline, 69.3 Task 8: the Task 8 mechanics make those plays 13% longer;
per tick O5 is at 0.98 to 1.05 of the baseline). Run-to-run spread is wide on this machine (for example O4's Task 8 wall runs 163 to
462 ms); the JSON keeps every run.

**Ability-heavy scenes (Task 8 only), the three figures of section 3, after:**

| Scene | R0 inert twin v baseline (CPU / wall) | R1 ability v inert (CPU / wall) | R2 ability v baseline twin (CPU / wall) |
| --- | --- | --- | --- |
| A1-overlapping-fields | 1.181 / 1.196 | 1.691 / 1.742 | 1.998 / 2.084 |
| A2-summons-constructs | 1.553 / 1.325 | 0.930 / 0.918 | 1.444 / 1.216 |
| A3-delayed-effects | 1.201 / 1.026 | 1.103 / 1.232 | 1.324 / 1.264 |
| A4-legendary-sequence | 1.032 / 1.047 | 1.213 / 1.115 | 1.252 / 1.168 |
| A5-full-contracts | 0.930 / 0.970 | 1.430 / 1.335 | 1.330 / 1.295 |
| **All five (sums)** | **1.153 / 1.100** (before 1.286 / 1.285) | **1.251 / 1.246** (before 1.273 / 1.251) | **1.443 / 1.371** (before 1.637 / 1.607) |

**Is the 10% requirement met on the ordinary scenes?** On the aggregate of the seven ordinary scenes, on this measurement: yes,
1.050 (CPU) and 1.027 (wall), down from 1.336 and 1.327. **Not on every scene:** O4 (red zone, 1.275 CPU / 1.120 wall) and O2 (runs,
1.201 CPU) are above 1.10, and O5 is above it on wall time (1.148). Whether the gate applies to the aggregate or to every scene is part
of the scene-set approval. Either way the result is provisional: it was measured on a shared 2-CPU machine and must be re-run on a
quiet machine (`node tools/perf/run-scenes.mjs --base=<main extract> --cand=<build>`) before it counts.

Under Method A (section 3) the ability-heavy scenes fail (R2 1.44 / 1.37, A1 about 2.0). Under Method B the engine-overhead figure R0 is
1.153 / 1.100 (A2's inert twin is the outlier at 1.55 / 1.33), and R1 (the abilities' own cost) is 1.25.

## 7. What remains

1. **Official numbers.** Re-run the whole set on a quiet machine (and on the owner's chosen reference hardware), after the owner
   approves the scene set, the warm-up (3 runs), the repeat count (15), the metric (CPU or wall) and whether the gate is per scene
   or aggregate.
2. **Ordinary scenes still over 10% individually: O4 (short red-zone plays) and O2 (short runs).** What the profiles show for them:
   - `separate()` is still about 2.5 times the baseline's on packed fronts: near pairs still read `engaged2`, `passAllies`, `phased`
     and `anchor`, absent on most actors, and these loads are megamorphic (the actors already have 6 to 13 hidden classes per tick
     on both builds; Task 8 adds `pancakeRolled`, `engaged2` and others).
   - `resolveOne` (every engaged tick): `engagementAttrs`, the shed score and two type-scale calls, where the baseline did the same work
     inline.
   - GC: scavenges take longer on Task 8 (about 2.6 ms against 1.5 ms per scavenge, with fewer scavenges), so more young objects
     survive; the retained heap is larger (about 18 MB against 10 MB after a full collection, mostly the Beast Dex data).
   - Per-play setup is about 0.045 ms more per play (the ability context and its closures, field and status setup): 2 to 3% of a
     short play. Not the main cause.
   - Fewer helpers are inlined in the larger `simulatePlay`.
3. **Realistic, outcome-identical options, not yet done:**
   - Initialise the M3 per-actor flags (`engaged2`, `passAllies`, `phased`, `anchor`, `pancakeRolled`, `moveOverride`, `t8Chase`) in
     `makeActor`'s object literal, so actors keep fewer hidden classes and these loads stop missing. Needs a check that nothing
     enumerates actor keys (spreads, `Object.keys`, `in`), because that would change outputs.
   - Keep a per-play count of actors with a body-rule flag set by contracts and use the baseline's separation loop while it is zero.
   - Cache each actor's position group and shed weights at creation (removes the per-tick `positionOf` and weight lookups).
   - Build the ability context lazily (only when an actor has a contract) to cut per-play setup.
   - Split the per-tick hook and field tests behind one per-play "any contract / any field" flag.
   Each needs the same identity proof (`tools/perf/identity.mjs --compare`) and the targeted tests.
4. **Ability-heavy scenes.** The owner chooses the comparison method (section 3). Under Method A they fail today (R2 about 1.4, A1
   about 2.0). A1's abilities (R1 about 1.7) are the field system: overlapping fields evaluated per actor per tick (`FX.tick`,
   `FX.displace`, `FX.resist`); this is the next profiling target if Method A or a tight R1 budget is chosen. A2's inert twin
   (R0 1.33 to 1.55, every snap a new possession) has not been profiled yet.
5. **Not authorised and not done:** no mechanic, value, trigger, event order or legitimate effect was changed to gain speed.

Raw runs (every repeat, both metrics, fingerprints): `docs/task8/data-perf-scenes-before.json` and `data-perf-scenes-after.json`.
