# Task 8 performance: matched scenes, profile and optimisations

## 0. Owner decisions (N8e, 2026-11-08 16:15; SPECIFICATION_BASELINE §26)

- **Scene set approved:** the 7 ordinary scenes and the 5 ability-heavy scenes of section 2, each ability scene with an
  abilities-off twin that runs on both builds. 3 warm-up passes, 15 measured passes, the median is the primary comparison,
  variability is tracked and unreliable results are identified. Busy-machine measurements are preliminary; official runs are made
  on a quiet machine under consistent conditions.
- **Method B** (section 3), with two budgets:
  - **Engine: at most 10% slower** than the pre-Task 8 baseline (`git archive origin/main`), applied **individually** to every
    ordinary scene and every abilities-off twin (R0 per scene). A strong combined result never compensates for one scene over it.
  - **Abilities: provisional 25%** (R1 = Task 8 abilities on / the same Task 8 scene abilities off). Not an automatic rejection: a
    scene over it is investigated (which ability systems cost most, what kind of cost, outcome-identical options, what remains).
- Measured: individual abilities, several at once, overlapping fields, summons and constructs, delayed effects, legendary sequences
  and worst-case combinations (additions to the approved set are marked as such: section 2.1).
- Never: removing abilities, weakening effects, shortening durations, or changing mechanics, values, event order or balance. Every
  optimisation is proven outcome-identical (section 5).

Requirement (§14, §16, §25, §26): simulation CPU at most **10% slower** than a matched baseline, same hardware, same scenarios, per
scene. No mechanic is weakened, no legitimate effect removed, and the requirement is not relaxed to obtain a pass.

Files:
- `tools/perf/scenes.json`: the manifest (1.0.0: approved status, budgets, protocol, call sets, scenes, explicit rosters).
- `tools/perf/scene-worker.mjs`: runs a scene against one build root (imports that build's engine and rules).
- `tools/perf/run-scenes.mjs --base=DIR --cand=DIR --json=FILE`: the full official run in one command (section 11): R0 per scene,
  R1, sub-measurements, the per-step / volume split, competing CPU and steal, a quality label per result (corrected 2026-11-08,
  section 1.1).
- `tools/perf/machine.mjs`: the quiet-machine accounting shared by the simulation runner and the render harness (section 1.1).
- `tools/perf/r1-experiment.mjs`: the experiment behind the R1 method (section 3.1).
- `tools/perf/compare-runs.mjs a.json b.json ...`: independent official runs side by side, per scene and figure (section 3.1).
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
  never shape the JIT state of the process that runs the matched scenes). The runner asks them in turn, never two at once. Since
  N8e the ability process also runs the abilities-off twin (same-process R1, section 3) and the sub-measurements with their
  control, in an order that rotates every round (section 2.1).
- Metric: process CPU time over the timed section (`process.cpuUsage`, user + system; includes V8's GC and compiler helper threads),
  which other processes on the machine inflate far less than wall time. Wall time is recorded too and reported alongside.
- Per scene and variant: **3 warm-up runs, discarded**, then **15 measured repeats** in alternating order (base, cand / cand, base).
- Timed section: the simulation calls only (inputs, clubs and game states are built before the timer; fingerprints after).
- Reported: median ms per scene, median ms per play, spread (min to max, interquartile range in the JSON), ratio of medians,
  median of per-round paired ratios, ticks per play and per-tick ratio.
- Every run's light fingerprint (result, yards, elapsed, frame and event counts per play) must equal the first run's.
- Variability (N8e): every job reports the IQR / median and the coefficient of variation; a job over `protocol.noise` (0.10) is
  flagged **noisy**; a verdict whose paired-ratio interquartile range straddles its limit is flagged **borderline**. The machine's
  1-minute load is sampled at the start, before every scene and at the end, and a run whose load ever exceeds 0.5 per CPU is marked
  **PRELIMINARY (busy machine)** in its output. **Superseded on 2026-11-08 by section 1.1** (the load rule, the schedule, the R1
  figure, the noisy test and the quality labels); the bullets above describe the runner up to 3498ffd, which produced every result
  in sections 6 and 7 and the two preserved runs in `docs/task8/perf-runs/`.
- Absolute timings on the development machine (2 CPUs, shared with other agents) are noisy. **Official numbers must be re-run on a
  quiet machine** (section 11).

### 1.1 Methodology correction (2026-11-08, owner instructions of 19:17)

The two official-attempt runs of 2026-11-08 (`docs/task8/perf-runs/2026-11-08-run1-sim.json`, `-run2-sim.json`, frozen 866a49b
against `main` 43976f4) are **kept unchanged** and stay **Provisional**. Under the corrected rule they cannot be re-labelled after
the fact (they hold no /proc accounting); they are evidence of the old method's problems below. The corrections apply to
`tools/perf/run-scenes.mjs`, `tools/perf/scene-worker.mjs` and `tools/perf/render/run.mjs` (shared code: `tools/perf/machine.mjs`).
No game code changed (nothing under `src/`); every scene's fingerprint is unchanged (checked against run 1 for A2: base, twin and
abilities-on fingerprints identical).

**What was wrong.**
1. *The quiet-machine check could never pass.* The runner marked a run PRELIMINARY when the 1-minute load average exceeded 0.5 per
   CPU. The load average counts every runnable thread, the benchmark's own included: its active worker, V8's helper threads (GC,
   compiler) and the runner. Measured on the idle development machine, the benchmark alone uses **1.2 to 1.5 CPUs** while it runs
   (competing CPU 0.000), so on 2 CPUs its own load reaches the 1.0 threshold by itself (the preserved runs: 1-minute load 0.25 to
   1.92 with no competing workload started).
2. *The two R1 figures disagreed* because they compared runs made in different process states (section 3.1).
3. *The noisy test* also flagged a job whose coefficient of variation exceeded 0.10. On this VM one run in five to fifteen takes 3 to
   5 times the median (in every condition, quiet or not: section 3.1); one such run pushes the CV over 0.10 without moving the
   median, which is the statistic used. Like rule 1, that made a GOOD result unreachable on this machine.

**The new quiet rule** (`machine.mjs`, used by both harnesses). Over every scene (simulation) or block (render):
- *competing CPU* = the CPU that processes used according to `/proc/stat` (user + nice + system) minus the CPU of the benchmark's own
  processes (`/proc/<pid>/stat` utime + stime, all threads: the runner and its three workers; for the render harness its process
  tree, i.e. Node, Chromium and the HTTP server). Interrupt time (irq + softirq) is not charged to any process, so it cannot be split
  into own and competing; it is recorded apart (`irqCpus`) and not part of the rule (measured: 0.007 to 0.011 CPU during simulation
  scenes, about 0.07 CPU during a render block, almost all of it the harness's own loopback traffic with the browser);
- *steal* = the `/proc/stat` steal column (CPU time the hypervisor gave to other guests);
- **quiet = competing CPU at most 0.05 CPU (5% of one CPU) and steal at most 0.05 CPU (5% of one CPU)**, both averaged over the
  scene or block. This VM's resting steal is 0.01 to 0.02 CPU (0.66% of all CPU time since boot, 0.011 to 0.020 CPU in every scene
  measured today); the limit is above that floor and flags real host contention. Accuracy of the subtraction: the two counters are
  sampled separately; on an idle machine the raw difference is -0.004 to +0.003 CPU.
- The load averages are still recorded (start and end of every scene and block, and the run's range), for transparency only.
- Check: with a deliberate one-CPU busy loop beside a short run (`docs/task8/perf-method/2026-11-08-sanity-competing-load-O2.json`)
  the scene read **competing 0.716 CPU** and the run was marked PRELIMINARY; without it every scene read 0.000.
- A run is labelled `quiet machine` only when every scene was quiet; otherwise `PRELIMINARY: not quiet ... in <scenes>`.

**The schedule** (sim runner): the warm-up rounds are the measured rounds' schedule, discarded, so both arms of every comparison get
the same warm-up; **every measured run is preceded by one discarded settle run of the same variant in the same worker** (`--settle`,
default 1), so no measured run is the first after an idle wait or the first after a different variant; the order is counterbalanced
ABBA (rounds 0 and 3 of every four: A first; rounds 1 and 2: B first) for base / candidate and for abilities off / on; the
sub-measurements rotate as before. Settle runs are not repeats: the approved 3 warm-ups and 15 measured passes are unchanged.

**Noisy (corrected):** a job is noisy when its IQR / median exceeds 0.10 (`protocol.noise`); a comparison is noisy when either job is
noisy or its paired ratios' IQR / median exceeds 0.10. The CV and the number of 3-5 x runs (`spikes`) are recorded for every job.

**Quality label per result** (printed beside every R0, R1 and sub-measurement, and stored): **GOOD** only when the scene was quiet,
no job and no paired ratio was noisy, and the result is not **borderline**: its bootstrap 95% interval does not straddle the limit,
and its paired median and ratio of medians fall on the same side of it. Otherwise **PROVISIONAL**, with every reason (competing
load, steal, noisy, borderline). Limits are unchanged: R0 at most 1.10 per scene and twin, R1 provisional 1.25; nothing is averaged
across scenes.

**Render harness** (`tools/perf/render/run.mjs`): the same accounting per block (`load.competingCpus`, `stealCpus`, `irqCpus`,
`ownCpus`, `quiet`, `notQuiet`), a quality label per block and per summary row (PROVISIONAL when any of its blocks was not quiet,
when it has fewer than 3 repeats, or when the mean or p95 frame time varies over the repeats by more than 10% of its median), and
`meta.status` computed from them (the old status text is kept in `meta.statusNote`). Every earlier field is unchanged
(`busyShare`, `harnessShare`, `foreignShare`, the load averages), so earlier JSONs still go through `report.mjs`, which now also
prints a status line and a "competing / steal CPU, quality" column ("–" for older files).

## 2. The scene set (approved, N8e)

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
| X1 (addition) | 43 | 351 (12 subjects) | by ability id: MET-06-F (Aegistron) 96, NAT-04-F 96, WAT-05-F 59, ICE-03-F 32 (64 snowballs), WAT-03-F 24, EAR-06-F (Landslide) 20, ELE-06-F (Stormguard) 16, NAT-06-F (Grove Guardian) 16, NAT-03-F 16 (3 sheds prevented), ICE-05-F 8, WAT-01-F 3; Night Veil did not fire on WIDE calls |

### 2.1 Additions to the approved set (N8e: "add scenes or sub-measurements where needed")

These are additions, documented here and marked `addition` in `scenes.json`; they do not replace or change any approved scene.

- **X1-worst-case** (T62a v T62b, WIDE, 8 x 12 snaps, own 30): the worst-case combination: A5's every-slot contracts with A2's summons
  and constructs (Stormguard QB, Landslide LG, Grove Guardian LB1, Snowfall Slam LB2 and Aegistron DL1 re-primed every snap), A4's
  Night Veil (nyxshade CB1, primed) and A1's three staged overlapping fields, all at once. Every family in its own Dex position.
  It has its abilities-off twin like the others (R0 is reported for it too).
- **Sub-measurements `only:KEY`** of every ability scene (and X1): the abilities-off twin with **one** overlay's species and primed
  state (individual abilities), or `only:fields`, the staged fields alone (field processing without any creator), against the control
  `only:none` (nothing active, the same setup path). They run in the ability worker in a rotating order and are reported as x of the
  control. Several abilities at once, overlapping fields, summons and constructs, delayed effects, legendary sequences and the worst
  case are the five approved scenes and X1.

## 3. Comparing the ability-heavy scenes: Method B (approved, N8e)

The baseline has no Dex abilities, so an ability scene has no exact baseline counterpart. Figures per ability scene:

- **R0 = cand(abilities-off twin) / base(abilities-off twin):** a matched ordinary comparison on the ability scene's own clubs, calls
  and staging. **Gate: at most 1.10, for every twin individually**, exactly as for the ordinary scenes.
- **R1 = cand(abilities on) / cand(abilities-off twin):** the abilities' cost on Task 8. **Provisional budget 1.25**; a scene over it is
  investigated and reported (section 9), not rejected. **Since 2026-11-08 (section 3.1) R1 is measured in one process, paired per
  round, and its figure is the median of the paired ratios**, with IQR and bootstrap 95% interval.
- *Until 2026-11-08:* the protocol R1 was abilities on (ability worker) / twin (matched worker), and the same-process R1 (runner
  506e5db) the ratio of the two medians in the ability worker. Both are still reported (`R1cross`, and `R1.ratioOfMedians` =
  `R1same`), not used for the verdict.
- **R2 = cand(abilities on) / base(twin) = R0 x R1:** reported, not gated (Method A, not chosen).

Method A (gate on R2) and Method C (legacy abilities on the baseline) were not chosen.

### 3.1 R1: the method, and why the old two figures disagreed (2026-11-08)

**The method (owner 19:17 item 2).** Abilities off (the twin) and abilities on run in the same worker process, in every round, as a
pair: ABBA order (rounds 0 and 3 of every four off first, rounds 1 and 2 on first), each measured run preceded by a discarded settle
run of the same variant, and the warm-up rounds identical to the measured rounds (so both arms get the same warm-up). Each round
gives a paired ratio on / off. Reported for every scene: the **median of the paired ratios (the figure)**, its IQR, a percentile
bootstrap 95% interval of the median (2,000 resamples, seeded per scene, reproducible from the stored runs), the paired geometric
mean, the paired median split by order (on first / off first), the ratio of the two medians, and the same paired medians in wall
time and in main-thread CPU (`process.threadCpuUsage`, i.e. without V8's helper threads). The old figures are reported too:
`R1cross` (the old protocol R1, abilities on / the twin in the matched worker), `processState` (the twin in the ability worker / the
twin in the matched worker) and R2. The sub-measurements `only:KEY` use the same paired median against `only:none`.

**Why this is the sound measure (and the old ones are not).** R1 asks what the abilities cost on the same build, same scene, same
inputs. A comparison is only as good as the equality of everything else between its two arms. Measured on this VM:

1. *Two processes of the same build differ.* Two fresh workers running the same twin, same build, same inputs, differ in median CPU
   per run by 15 to 30% in either direction, and not reproducibly: `r1-experiment.mjs` part 2 gave A / M (ability-history worker over
   ordinary-history worker) of **0.625, 0.960, 0.990, 0.824, 0.747, 1.014, 1.021, 0.764** under the old schedule and **0.981, 0.852,
   0.946, 1.139, 1.018, 1.298, 1.236, 0.992** with settle runs (three experiment runs: run 0 A3, A5; runs a and b A3, A2, A5). This is a per-process
   effect: repeating rounds inside one run does not average it out, and the per-round intervals of a cross-process ratio do not
   contain it. The old protocol R1 (`R1cross`) divides by a different process, so it carries this error in full.
2. *Most of the old between-process difference was helper-thread CPU.* Under the old schedule the matched-like worker spent more CPU
   on V8's helper threads per measured run than the ability-like one in 7 of 8 comparisons (for example A3 94.6 against 15.9 ms,
   A5 107.5 against 29.9 ms, A2 49.6 against 12.2 ms), while main-thread CPU agreed far better (A / M main thread 0.95, 1.01, 1.03,
   0.99, 0.89, 1.09, 1.11, 0.82). In the old schedule the matched worker ran one job per round and then waited while the ability
   worker ran 7 to 14 jobs; the ability worker's jobs followed other variants. The preserved runs show the same: the twin took 0.67
   to 1.04 x as long in the ability worker as in the matched worker (run 1: A1 0.871, A2 0.810, A3 0.771, A4 0.988, A5 0.867, X1
   0.924; run 2: 0.870, 0.885, 0.669, 0.830, 1.042, 0.968), which is why the old protocol R1 was mostly below the old same-process
   R1. Today, on the quiet machine, the old runner reproduced it (A3: twin 216 ms in the matched worker against 140 ms in the ability
   worker; protocol R1 1.093 against same-process 1.687; A5: 510 against 291 ms, 0.877 against 1.541;
   `docs/task8/perf-method/2026-11-08-old-runner-A3-A5.json`).
3. *Within one process, a run depends on what ran just before it.* `r1-experiment.mjs` part 1 (the twin after its own run, after an
   abilities-on run, or after 3 s idle) and part 3 (off and on in the sequence off off on on, so every transition occurs equally
   often): the on / off ratio when each follows itself against when each follows the other was 1.324 / 1.157, 1.240 / 1.247,
   1.174 / 1.257 (run a: A3, A2, A5) and 1.303 / 1.533, 1.036 / 1.243, 1.509 / 1.359 (run b). The carry-over is real (up to 0.3 on the ratio) and its sign is not stable, so a balanced order alone does not remove it
   (an unequal carry-over biases a crossover even when the order is balanced). The settle run of the same variant before every
   measured run is a wash-out: every measured run follows a run of its own variant. An intermediate version of the corrected runner
   (one settle run per worker turn, then the pair back to back) still showed it: A3 paired ratios bimodal (IQR 0.96 to 1.64), on
   first 0.957 against off first 1.617.
4. *Rounds drift together.* In one process the off and on runs of the same round move together (A3, corrected runner, 7 rounds:
   off 163 to 295 ms, on 170 to 310 ms, the pairs within 1 to 11% of each other except one round at 1.35), so a ratio of medians taken from
   different rounds is unstable (A3: ratio of medians 1.346, paired median **1.063**, IQR 1.032 to 1.089, 95% interval 1.013 to 1.110;
   `docs/task8/perf-method/2026-11-08-new-runner-A3-A5.json`). The paired median removes the common drift.
5. *3 to 5 x runs* (spikes, mostly helper-thread CPU) occur in every condition, quiet machine included (0 to 4 in 8 runs per cell of
   the experiment). They are kept, never removed; the median and the IQR-based tests are robust to them.
6. *Process history (JIT state) has a smaller effect, mostly in one direction.* With settle runs, the twin's main-thread CPU in the
   ability-history worker was 0.98 to 1.28 x that in the ordinary-history worker (1.021, 0.983, 1.029, 1.042, 1.035, 1.279, 1.101,
   1.149: higher in 7 of 8), i.e. having run ability code may make the shared engine code somewhat slower for ordinary plays too
   (polymorphic call sites). Under the old schedule this was hidden by the larger helper-thread difference. The same-process R1
   does not count that effect as ability cost (both arms share the state), and R0's candidate worker never runs ability code; the
   corrected runner reports it per scene as `processState` (process CPU, main thread and wall). It is within the process-instance
   noise of item 1 and is not established; it is reported, not corrected for.

So: **the sound R1 is the same-process, paired, washed-out, counterbalanced comparison**; its figure is the paired median with its
interval. The old protocol R1 confounds the abilities with a process-instance effect of about the same size as the budget; the old
same-process R1 (a ratio of medians, arms adjacent) confounds them with carry-over and drift. The corrected runner on the quiet
machine, 7 repeats (indications, not official): A3 R1 **1.063** (95% interval 1.013 to 1.110; wall 1.049, main thread 1.048; the old
protocol figure in the same run 1.307), A5 **1.218** (1.058 to 1.345; wall 1.186, main thread 1.164; old 1.338); `processState`
0.971 and 1.074 in that run.

**What remains uncertain.** R0 is necessarily a cross-process comparison (two builds), so it carries the process-instance effect of
item 1 too, outside its per-round interval. R0's margins are wide (0.51 to 0.97 against 1.10 in both preserved runs), but a verdict
near a limit needs agreement between independent runs: `tools/perf/compare-runs.mjs` puts several official runs side by side, per
scene and figure (never averaged), and labels a figure CONSISTENT only when every run labels it GOOD and every run puts it on the
same side of its limit. Recommended: three independent official runs (section 11).

**Process CPU against main-thread CPU and wall time.** The approved metric (process CPU, every thread) counts V8's helper-thread
work (concurrent GC marking and sweeping, background compilation). In the short corrected runs the abilities-on runs of A2 and A4
carried much more of it than their twins: A2 R1 1.907 in process CPU against 1.360 main thread and 1.356 wall; A4 1.923 against
1.404 and 1.399 (3 repeats each, PROVISIONAL; `2026-11-08-sanity-O5-A2.json`, `2026-11-08-sanity-A4.json`); A3 and A5 at 7 repeats
showed little difference (1.063 / 1.048 / 1.049 and 1.218 / 1.164 / 1.186). With wash-out runs each measured run pays, in steady
state, for the helper work its own variant causes, so the process-CPU figure is a legitimate cost (mostly the abilities'
allocation); whether that work, which ran on the otherwise idle second CPU, counts toward the budget is the approved metric's
answer (it does). The runner reports all three; the verdict uses process CPU, as approved, and nothing was chosen per scene.

Evidence files (short runs and the experiment, quiet machine, 2026-11-08 19:40 to 20:30 EST):
`docs/task8/perf-method/2026-11-08-r1-experiment-0.json`, `-a.json` and `-b.json` (`r1-experiment.mjs`, 8 repeats; run 0 was made
before part 3 and the machine record were added to the tool; -b records the machine: competing 0.000 CPU, steal 0.013 to 0.014
CPU), `2026-11-08-old-runner-A3-A5.json` (the runner as of 3498ffd, 7 repeats),
`2026-11-08-new-runner-A3-A5.json` (the corrected runner, 7 repeats; made before the noisy test was corrected, so its stored labels
use the old CV test).

### 3.2 Two kinds of overhead: per step and volume (owner 19:17 item 3)

A ratio R of times (R0 or R1) is split exactly into a per-step part and a work-volume part, using the counts of the two arms (they
are deterministic: the same in every run of a variant):

- ticks T: simulated ticks over the scene (sum over plays of elapsed / 0.05 s);
- actor-ticks A: the sum over plays of ticks x the mean number of actors on the field in that play's frames (temporaries such as
  Stormguard's blockers and the Grove Guardian are actors; obstacles such as Landslide's wall and Aegistron's panels are not);
- **volume V = A(num) / A(den) = [T(num) / T(den)] x [actors per tick (num) / actors per tick (den)]**: the extra total work from
  legitimately longer (or shorter) plays and from added actors;
- **per-step P = R / V**: the extra processing per actor-tick (per simulated step and actor);
- R = P x V exactly; the per-step interval is R's interval divided by V. Also stored: R / (T ratio) (per tick only), the same split
  over actor pairs (`pairVolume`, `perPairStep`: the separation pass grows with actors squared), and ln V / ln R.

The runner prints the arithmetic for every R0 and R1. Examples:
- **O5 (R0, longer Task 8 plays):** preserved run 1, R0 0.679 = per-step 0.598 x volume 1.135 (ticks 6654 / 5865 = 1.135, 69.3
  against 61.1 per play; actors per tick 14.00 / 14.00). Short corrected run: 0.819 = 0.722 x 1.135. The 13.5% longer plays are
  work volume from approved mechanics; per step Task 8 is well under the baseline.
- **A2 (R1, summons):** short corrected run, R1 1.907 = per-step 1.937 x volume 0.985 (ticks 5690 / 5950 = 0.956 x actors per tick
  14.42 / 14.00 = 1.030): the temporaries add 3% actors but the plays are 4.4% shorter, so the volume is slightly below 1 and the
  overhead is per step. (3 repeats, PROVISIONAL; main thread 1.360, wall 1.356: most of the process-CPU excess in that run was
  helper-thread CPU of the abilities-on runs.)
- Tick ratios on / off of the ability scenes (from the preserved runs; actor counts were not recorded then): A1 0.986, A2 0.956, A3
  0.956, A4 1.014, A5 1.041, X1 0.999. Only A5 and A4 have longer plays with abilities on; A2, A4 and X1 add temporaries.

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
| 4 | 42357c6 | The contract context (`buildAbilityCtx`: the ability stream and the ctx closures) is built at the first contract hook call, not at every play's start. | The stream is a pure function of the seed that only the context draws from, and the context is built before any hook that could use it runs; a play with no contract hook never draws from it. | Per-play setup objects no longer survive into the old generation: scavenge time on O4 + O2 426 to 223 ms. |
| 5 | cf3e3c3 | `separate()`: with no field (`FX` null) and no actor carrying a body rule (`engaged2`, `passAllies`, `phased`, `anchor`), the baseline's plain loop (with the far-pair skip of #1). | Under those conditions every M3 test in the full loop is false and every push is the plain one: same pushes, same order. | Removes the hook reads from every near pair on ordinary plays (not measured on its own; folded into the #6 measurement). |
| 6 | a6eb877 | **One actor shape.** The ~76 properties the engine sets or reads later in a play (`read`, `engaged2`, `pancakeRolled`, `contract`, `anchor`, `phased`, ...) are declared as `undefined` in the actor literal. | Undefined reads exactly as an absent property; no actor's keys are ever enumerated, spread, serialised or tested with `in` / `hasOwnProperty` (checked across `src/sim`, including every contract). The actors had 6 to 13 hidden classes per tick on both builds; now one, so the engine's property loads are monomorphic. | Against cf3e3c3 (CPU medians, 21 repeats): **O1 0.66, O2 0.59, O4 0.64, O5 0.62**. This is the step that brings O2, O4 and O5 well under 1.10. |
| 7 | 915d6dd | **Field effects resolved once per (monster type, containing fields) per play** (`field-effects.js` `effectsHere`): containment is tested, and `effectsAt` plus the per-type lookup are computed only for a new combination; Eclipse's `canStart` uses it. | A play's field list and rectangles never change during the play (abilities place and remove fields in the stored list between plays; Prism Break's holes are made before the snap), so `effectsAt` depends on the point only through which fields contain it. The shared result is read-only (nothing writes into `a.fx.base` or an `effectsAt` result). | A1 abilities on 0.74 of a6eb877 (11 repeats). Miss rate after it: A1 2,077 resolutions for 72,440 lookups per pass (2.9%), X1 1,722 for 145,369 (1.2%). |
| 8 | 8c9a3c9 | The contracts' per-play actor keys (`pyre`, `haze`, `gate`, ...: 51 keys) are created on every actor right after the literal, by **named stores in one fixed order**. | As #6. Every actor takes the same transitions, so a contract carrier keeps the lineup's shape. (A literal over 128 properties is created in dictionary mode: tried, measured slower, dropped.) | Against 915d6dd: A5 abilities on 0.73, A1 abilities on 0.70, O4 1.01 (unchanged). |
| 9 | 7f60f41 | **Temporaries and field state share one shape each.** The actor record moves into `actorRecord()`, used by `makeActor` and by `spawnActor` (Stormguard, Grove Guardian) with the same values as before; a monster's field state (`a.fx`) is created with all twelve keys it can take, from the field tick and from the Mindstorm lure alike. | As #6 (same values, same precedence of a temporary's spec over the defaults; extra spec keys follow). | Against b827e72: abilities on **A2 0.90, A3 0.79, A4 0.72, X1 0.75**; ordinary scenes unchanged (O1 0.99, O4 1.04). |

Identity for #4 to #9: `node tools/perf/identity.mjs --root=<worktree> --compare=<hashes>`, the hashes made from an extract of acdc91e
with this branch's `tools/perf` copied in (`identity.mjs --out`): **IDENTICAL** after every step (17 scene variants and 12 full games
up to 8c9a3c9; from b827e72 on, 19 scene variants with X1 and 12 full games, the reference regenerated from acdc91e under the new
tools). Targeted tests after every engine step: `tests/task8-*.test.js` (34 files), `engine`, `abilities`, `legendary-plays`,
`replay`, `pursuit`, `run-read`, `qb-read`: **349/349** pass (never the full suite). Gains #6 to #9 were measured on a busy machine
(load 2 to 6 on 2 CPUs) with the dev A/B script (same scene on two Task 8 builds, alternating); they are indications, the official
run measures the result.

**Tried and dropped** (not committed):
- All 127 extra keys in the one literal (over 128 properties): the literal is created in dictionary mode; O4 1.34 to 1.90 and the
  ability scenes 1.24 slower (min ratios). Replaced by #8.
- Skipping the field-entry checks when an actor's resolved effects are the same object as on his previous tick: identical, but no
  measurable gain (A1 1.00, A3 0.97, X1 1.05 by min ratios); not kept.
- `contains()` without the empty `holes` array: identical, but V8 already removes that allocation (microbenchmark, and the scavenge
  count of an X1 run, 174 against 174, unchanged); not kept.
- A forced full collection before every timed run (runner): every run became 3 to 4 times slower (compiled code and feedback are
  discarded), so it distorts what it measures; not kept.

Profile after all three (same conditions as section 4, quiet machine): total 25.7 s against the baseline's 26.3 s and Task 8's 31.2 s
before (the profiler dilutes the gap; see section 6 for the unprofiled ratios). The remaining in-profile excess on ordinary scenes is
`separate` (+500, the near pairs still read the hook properties), `simulatePlay` self (+495), `resolveOne` (+440), GC (+436) and
`recordFrame` (+75); other engine functions are now at or below the baseline (-96 across the anonymous closures).

Steps 2 and 3 are below the run-to-run noise of the scene ratios on this shared machine (best-of-11 ordinary ratios 1.073 after step 1,
1.108 after step 2, 1.092 after step 3), so their effect is stated from the profile, not from the ratios.

## 6. Before N8e (history): ratios after optimisations #1 to #3

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


## 7. Preliminary results under N8e (Method B, per scene)

*Note (2026-11-08, section 1.1): measured with the runner as of 32f57b9 / 3498ffd, i.e. the old load rule, the old schedule and the
old R1 figures (protocol R1 across two processes, same-process R1 as a ratio of medians). Kept as they were; section 3.1 explains
why those R1 figures are not reliable. The R0 figures carry the process-instance uncertainty of section 3.1 item 1.*

**PRELIMINARY, not official.** One full run of the official command (section 11), 2026-11-08 18:39-18:49 EST, Task 8 engine
7f60f41 (runner 32f57b9) against the pre-Task 8 baseline (`main` 43976f4, v42.22.0). Machine: the shared 2-CPU development machine
(Intel Xeon 2.10 GHz, Node 22.22.0) with other agents working (a headless browser for the rendering measurements among them):
**1-minute load 1.63 to 3.82, median 3.31**, so the runner marked the run PRELIMINARY and flagged every job noisy (IQR / median or
coefficient of variation over 0.10). 3 warm-ups, 15 measured passes, medians of process CPU time; wall time beside it. Raw data, every
run: `docs/task8/data-perf-n8e-preliminary.json`.

### 7.1 R0: the engine limit, every ordinary scene and every abilities-off twin (limit 1.10, individually)

| Scene | Compared | Baseline ms/play | Task 8 ms/play | Ticks/play base / T8 | R0 (CPU) | R0 per tick | R0 wall | At 1.10 | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| O1-pass-T | ordinary | 3.797 | 2.259 | 75.0 / 75.4 | **0.595** | 0.592 | 0.556 | pass | noisy |
| O2-run-M | ordinary | 2.013 | 1.192 | 37.3 / 37.3 | **0.592** | 0.592 | 0.591 | pass | noisy |
| O3-wide-mismatch | ordinary | 8.073 | 3.876 | 125.3 / 127.5 | **0.480** | 0.472 | 0.494 | pass | noisy |
| O4-redzone-cross | ordinary | 1.931 | 1.289 | 36.0 / 37.4 | **0.668** | 0.643 | 0.664 | pass | noisy |
| O5-legendary-plays | ordinary | 3.230 | 2.283 | 61.1 / 69.3 | **0.707** | 0.623 | 0.713 | pass | noisy |
| O6-rules-mix | ordinary | 3.770 | 2.465 | 70.3 / 67.6 | **0.654** | 0.681 | 0.658 | pass | noisy |
| O7-rules-pass-T | ordinary | 4.088 | 2.579 | 75.9 / 75.2 | **0.631** | 0.637 | 0.598 | pass | noisy |
| A1-overlapping-fields | abilities-off twin | 3.359 | 2.213 | 53.2 / 54.7 | **0.659** | 0.641 | 0.624 | pass | noisy |
| A2-summons-constructs | abilities-off twin | 3.704 | 2.484 | 58.9 / 62.0 | **0.671** | 0.637 | 0.661 | pass | noisy |
| A3-delayed-effects | abilities-off twin | 2.992 | 2.371 | 47.2 / 47.5 | **0.792** | 0.787 | 0.679 | pass | noisy, borderline |
| A4-legendary-sequence | abilities-off twin | 3.573 | 1.980 | 56.9 / 58.6 | **0.554** | 0.539 | 0.553 | pass | noisy |
| A5-full-contracts | abilities-off twin | 6.380 | 3.889 | 108.4 / 109.9 | **0.610** | 0.601 | 0.557 | pass | noisy |
| X1-worst-case (addition) | abilities-off twin | 5.834 | 3.739 | 104.7 / 107.4 | **0.641** | 0.624 | 0.649 | pass | noisy |

**Every ordinary scene and every abilities-off twin passes, individually, by a wide margin** (worst: A3's twin 0.79, O7 0.75; the
borderline flag on A3's twin means its paired-ratio IQR reached 1.10 on this busy machine). Before this round of work (cf3e3c3, the
start of the session, 11 to 41 repeats, busy machine) O4 was 1.11 to 1.12, O5 1.18 and O2 0.93 to 1.06: step #6 (one actor shape)
removed the gap and more, since the baseline's actors are polymorphic too. The per-tick column removes the change in play length.

### 7.2 R1: the abilities' provisional budget (1.25)

| Scene | Abilities off ms (T8, matched worker) | Abilities on ms (T8) | R1 (CPU) | Same-process R1 | R2 (on v baseline off) | Against 1.25 | Flags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1-overlapping-fields | 212.5 | 294.0 | **1.383** | 1.376 | 0.912 | **over** (investigate) | noisy, borderline; same-process noisy, borderline |
| A2-summons-constructs | 238.4 | 264.0 | **1.107** | 1.317 | 0.742 | within | noisy, borderline; same-process noisy, borderline |
| A3-delayed-effects | 227.6 | 234.8 | **1.031** | 1.545 | 0.817 | within | noisy, borderline; same-process noisy, borderline |
| A4-legendary-sequence | 190.0 | 252.3 | **1.327** | 1.160 | 0.735 | **over** (investigate) | noisy, borderline; same-process noisy, borderline |
| A5-full-contracts | 373.4 | 500.1 | **1.340** | 1.354 | 0.817 | **over** (investigate) | noisy, borderline; same-process noisy, borderline |
| X1-worst-case (addition) | 358.9 | 604.0 | **1.683** | 1.893 | 1.078 | **over** (investigate) | noisy; same-process noisy |

Protocol R1 (abilities-on in the ability worker over the twin in the matched worker), same-process R1 (both in the ability worker), and
R2 (abilities on against the baseline running the twin). **Over 1.25 on this run: A1 (1.38), A4 (1.33), A5 (1.34) and the X1 addition
(1.68)**; A2 (1.11) and A3 (1.03) within, but their same-process R1 (1.32, 1.55) is over, and the two figures differ by more than the
budget on this machine, so the within/over verdict of A2, A3, A4 and A5 is not reliable here (every R1 is noisy and most are
borderline). A1 and X1 are over on every measure and every run. A quieter re-run at 18:50-18:55 (load 0.9 to 1.8; abilities on
against the control `only:none` in one process, 11 to 21 rotating rounds) gave **A1 1.40, A2 1.26, A3 1.33, A4 1.27, A5 1.30,
X1 1.60**: by that same-process measure every ability scene is over 1.25, A2 and A4 only just. R2 is at or below 1.08 for every scene: **Task 8 with every ability on
now runs about as fast as, or faster than, the pre-Task 8 engine running the same scene with no abilities** (A1 0.91, X1 1.08).

Earlier the same day (b827e72 engine, before #9, load 2.6 to 5.8): R1 A1 1.35, A2 1.37, A3 1.63, A4 1.92, A5 2.12, X1 1.80. The R1
figures rose at #6 because #6 sped up the abilities-off twins (the denominator) more than the abilities-on runs; #7 to #9 brought the
abilities-on runs down again.

## 8. O5: simulation time against wall time, and the longer Task 8 plays

O5 runs the five Legendary Plays' designs with no Legendary on the field (engine tier: no stamina, no contracts, no fields). Two
different "times" enter its ratio:

- **Simulated time (play duration)** is longer under Task 8: **61.1 ticks per play on the baseline, 69.3 on Task 8** (3.055 s against
  3.466 s of game time, +13.4%), on identical inputs. Almost all of it is one call pair: Fault Line against Rootbound averages 1.79 s
  on the baseline and **4.99 s** on Task 8 (four touchdowns in 16 plays instead of one; 1.44 sheds and 0.31 pancakes per play instead
  of 0.38 and 0), i.e. the approved Task 8 block mechanics (pancake contest, shed formula) let that run break long. Eye of the Storm
  against Rootbound goes the other way (4.84 s to 3.96 s); the other four pairs are within 0.12 s. This is a change of outcome by
  approved mechanics, not an inefficiency, and it is not optimised away (that would change mechanics).
- **Compute time per play** therefore contains 13.4% more ticks. The fair engine comparison is **per tick** (per simulated second);
  the gate figure (ms per scene, as approved) carries the longer plays in full.
- **CPU time against wall time:** the runner's primary metric is the worker's CPU time (user + system of the whole process, including
  V8's helper threads for parallel scavenges, concurrent marking and background compilation); wall time is the elapsed time of the same
  section. On a busy 2-CPU machine wall time also contains the time the worker waits for a CPU (inflating whichever runs land in busy
  moments, so the wall ratio swings with the other agents' load), while CPU time can exceed wall time when helper threads run in
  parallel (longer Task 8 plays record more frames and allocate more, so they do more helper work). Before N8e this gave O5 1.089 on
  CPU and 1.148 on wall time; today's run 0.707 and 0.713.

| O5 figures | Baseline | Task 8 (7f60f41) | Ratio |
| --- | --- | --- | --- |
| Ticks per play (simulated duration) | 61.1 (3.055 s) | 69.3 (3.466 s) | 1.134 |
| CPU ms per play (gate basis) | 3.230 | 2.283 | **0.707** |
| CPU ms per tick | 0.0529 | 0.0329 | **0.623** |
| Wall ratio (ms per scene) | | | 0.713 |
| Before this session (cf3e3c3, 11 repeats): CPU per play / per tick / wall | | | 1.177 / 1.037 / 1.254 |

So before the shape work, O5 was over 1.10 per play only because of the 13% longer plays (per tick it was 1.04); now it is under the
limit on every measure, with the longer plays included.

## 9. The field system and the ability-system attribution

### 9.1 Field system (A1, and A2's abilities-off twin)

Repeated calculations found in the per-tick field path (`src/sim/t8/field-effects.js` `tick`, every actor, every tick, whenever any
field exists):

1. **`effectsAt` per actor per tick** (fields.js: filter, two Maps, sort, recipe search, a new result object) although the play's field
   list never changes during the play: **fixed by #7** (once per (type, containing fields) per play; 1 to 3% of lookups miss).
2. **The per-actor base-effect lookup** (`st.base = {}` plus one object per active effect) rebuilt every tick: **fixed by #7** (shared).
3. **The field state's object shape** varied by creation site and by which keys a play added: **fixed by #9**.
4. The Dark field's Awareness layer (`layer`) is recomputed every tick for everyone in it (A1's Dark field covers the whole field).
   Caching it is **not outcome-identical**: the layer re-derives the unmodified value as `attrs - previous delta` each tick, which in
   floating point does not always return the same bits, so a cached value can differ in the last bits from today's. Left as is; any
   change here needs owner approval (it could move a borderline comparison).
5. `contains()` allocating an empty `holes` array: V8 already removes it (tried, no change; not kept).
6. The entry checks (`seen`) on unchanged effects: identical but no measurable gain (tried; not kept).

What a field costs now, measured in the ability worker against the control `only:none` (quieter moment, load 0.9 to 1.8, 21 rounds,
rotating order; medians, with the minima in brackets):

| A1 variant | x control | Note |
| --- | --- | --- |
| abilities off (twin) | 0.94 (0.94) | |
| only:fields (the three staged fields, no creator) | **1.41 (1.39)** | the field system alone |
| only gustling WR1 (Runway; creates Wind fields, 16 executions) | **1.38 (1.32)** | a field creator: its fields switch the field path on |
| only icehorn DL1 (Permafrost; did not execute) | 0.99 (1.05) | a contract that does nothing costs nothing measurable |
| everything on | **1.40 (1.41)** | |

The cost is not proportional to the number of fields or abilities: **once any field exists on a play, every actor runs the field path
every tick** (`FX.tick` with the containment test and the layers, `FX.displace` in `integrate`, `shapeDv` and `coast` in steering, and
the full M3 separation loop with `FX.resist` instead of the plain loop of #5). With the whole-field Dark field of A1 that is everyone,
all the time. In the profile of A1 (abilities on against off, same build) the field system is 45% of the extra time, the engine's
own football code 23% (the field effects change movement and Awareness, so the plays differ), the garbage collector 18%, rules.js 8%
(field lifecycle between plays: `afterPlayFields`), and the contracts themselves under 3%.

**A2's abilities-off twin** (R0 1.33 to 1.55 before N8e, "every snap a new possession", not profiled then): now **0.67** (0.63 to 0.76
across today's runs). Nothing specific to A2 was needed: its twin is ordinary football on the A2 rosters, and the excess was the
polymorphic actor shapes (#6).

### 9.2 Which ability systems cost most (every scene over, or near, 25%)

Two independent views, both preliminary: (a) CPU profiles of each scene abilities on against abilities off on the same build (one
process each, 8 passes; self time grouped by system; 7f60f41); (b) the sub-measurements (one overlay alone against the control,
same process, rotating order; the quieter re-run at 18:50-18:55, load 0.9 to 1.8, 11 to 21 rounds).

| Scene | Extra time by system, profile (a) | Largest single overlays, (b) x control (all on) | Kind of cost |
| --- | --- | --- | --- |
| A1 | field system 45%, engine football 23%, GC 18%, rules.js 8%, contract plumbing 3%, contracts about 1% | staged fields 1.41, gustling (creates Wind fields) 1.38; all on 1.40 | effect processing: the per-tick, per-actor field path (9.1) |
| A2 | engine football 52%, GC 18%, contracts 15% (Aegistron panels, Landslide wall, `nearestClear`), contract plumbing 14% (`keepOut`, `spawnActor`, `hook`) | Grove Guardian 1.14, Aegistron 1.12, Snowfall Slam 1.11, Landslide 1.08, Stormguard 1.06; all on 1.26 | collision checks and more bodies: temporaries (2 Stormguards, a Grove Guardian) add actors to every per-actor loop and to the pairwise separation (153 pairs at 18 actors, 210 at 21); every obstacle is checked against every actor every tick (`keepOut`) |
| A3 | engine football 40%, GC 25%, fields 10%, rules.js 10%, contract plumbing 7%, contracts 6% (Bloom Break patches, Frost Nip) | voltfin (Charge Strip) 1.12, nocturne (Dark field) 1.10, rockram 1.10, wyrmkit 1.09, the others 1.00 to 1.05; all on 1.33 (not additive) | effect processing (statuses that change behaviour, Nocturne's Dark field, Bloom Break patches) and their allocations |
| A4 | engine football 42%, GC 32%, rules.js 10%, contract plumbing 10%, contracts 7% | Night Veil 1.21, Grove Guardian 1.20, Cyclonic Release 1.19, Landslide 1.16, Sovereign Arm 1.11; all on 1.27 | the Grove Guardian temporary (extra body), statuses (Stumbled) and absences; allocation |
| A5 | engine football 52%, GC 13%, rules.js 12%, contracts 9% (pyrelynx, fire/water utilities, mudcub), contract plumbing 5%, fields 5% | stormlynx (Static Field) 1.33, pyrelynx 1.19, mudcub 1.17, reefclaw 1.17; all on 1.30 | eighteen contracts' hooks plus the fields two of them create; behaviour changes (moveOverride, statuses) |
| X1 | field system 30%, engine football 29%, GC 16%, other 14% (staging), contract plumbing 5%, contracts 4% | staged fields 1.28 (min 1.57), Landslide 1.16; all on 1.60 | everything at once: the field path for everyone, plus summons, obstacles and every-slot contracts |

What the categories mean: "engine football" is the ordinary engine code running on plays the abilities change (different movement,
statuses, extra bodies), and also running slower because of JIT state (abilities make call sites polymorphic: contract hooks, field
state, temporaries; #6 to #9 removed the actor-shape part); "GC" is allocation by events, statuses, ability state and per-play
contract contexts; "contract plumbing" is the engine's hook dispatch, the contract context and obstacles; "contracts" is the ability
files' own code. The contracts' own code is small everywhere (under 15%): **the overhead is in what the abilities make the engine do**
(field evaluation, extra bodies and obstacle checks), not in inefficient contract code or lookups.

**Remaining overhead and possible solutions (outcome-identical unless stated; none done yet):**

1. **Field path (A1, X1, any play with a field):** only actors whose containment set or inputs changed need their layers recomputed,
   but see 9.1 item 4: the Awareness layer cannot be cached bit-identically. An identical option is to restrict the field path to
   the fields' bounding box: an actor outside every field's rectangle has no base or hybrid effect, so for him `displace`, `shapeDv`,
   `coast` and `resist` are no-ops and `tick` only clears his layers (which are zero already after his first tick outside). Expected
   to help plays with small fields; not A1's whole-field Dark field. Needs the identity proof.
2. **Separation with more bodies (A2, A4, X1):** a spatial grid would cut the pair checks, but pushes are applied in pair order and
   move bodies during the pass, so a grid built before the pass can miss a pair that an earlier push brought together; an identical
   version must re-check moved actors (or bound the push distance), which makes it complicated. Not recommended before the official run.
3. **Obstacles (`keepOut`, A2/X1):** each live obstacle is tested against every actor every tick; a per-obstacle bounding test before
   `blocks()` is identical (both are pure) and cheap.
4. **Per-tick contract dispatch (A5):** the `hook('tick')` loop over every actor could use a per-play list of actors whose contract has
   a tick hook (contracts never change during a play). Small (the profile shows `hook` at 1 to 2%).
5. **GC (every ability scene, 13 to 32%):** the allocations are mostly outputs (events, statuses) and must stay; the per-play contract
   context could be pooled. Small.
6. **Not outcome-identical (owner approval needed, not proposed):** caching the Dark Awareness layer (9.1 item 4); evaluating field
   effects every second tick; capping the number of simultaneous temporaries or obstacles.

## 10. Methods and tools in use (summary)

- `tools/perf/run-scenes.mjs`: the official run (section 11), JSON with every run, R0 per scene, R1 (same-process paired median)
  with the old figures beside it, R2, the sub-measurements, the per-step / volume split, competing CPU and steal per scene, and a
  quality label per result (section 1.1).
- `tools/perf/scene-worker.mjs`: plain, inert (abilities-off), ability and `only:KEY` variants; `runSceneDetail` lists what fired.
  Each run also returns main-thread CPU, actor-ticks and pair-ticks, and the /proc/stat busy and steal ticks over its timed section;
  `--gc-stats` adds V8's GC count and time (diagnostic, off by default).
- `tools/perf/machine.mjs`: competing CPU, steal and the quiet rule (section 1.1), shared with `tools/perf/render/run.mjs`.
- `tools/perf/r1-experiment.mjs`: the R1 experiment (section 3.1). `tools/perf/compare-runs.mjs`: independent runs side by side.
- `tools/perf/identity.mjs`: the outcome-identity proof (section 5).
- `tools/perf/profile-scenes.mjs`: `node --cpu-prof` driver and profile summaries / diffs (`--variant=ability|inert` for the
  attribution profiles).

## 11. The official run (one command)

On a quiet machine (nothing else running; the runner measures competing CPU and steal per scene and marks the run PRELIMINARY when
any scene is not quiet: section 1.1), from a checkout of `task8-perf-method` (tools and docs only; its `src/` is the frozen build),
with fresh extracts of the two builds (fresh directories: a directory reused from another extract can hold stray files):

```
rm -rf /tmp/perf-base /tmp/perf-cand && mkdir -p /tmp/perf-base /tmp/perf-cand
git archive 43976f4 | tar -x -C /tmp/perf-base
git archive 866a49b | tar -x -C /tmp/perf-cand
node tools/perf/run-scenes.mjs --base=/tmp/perf-base --cand=/tmp/perf-cand --json=docs/task8/perf-runs/<date>-corrected-run1-sim.json --label="OFFICIAL corrected run 1, frozen 866a49b vs main 43976f4, <machine>"
```

It runs, in one command: the 7 ordinary scenes (base and Task 8), the 5 ability scenes and the X1 addition (abilities-off twin on both
builds, abilities on and the twin in the ability worker, and every `only:KEY` sub-measurement with its control), with the approved
protocol (3 warm-ups, 15 measured passes, medians) and the corrected schedule (one settle run before every measured run, ABBA).
Output: per scene the machine (competing CPU, steal, load), R0 at 1.10 and R1 at 1.25 each with its interval, quality label and
per-step / volume arithmetic, the old R1 figures, and the sub-measurements; then the per-scene R0 and R1 lists and the run status.
About 20 minutes on the development machine (the settle runs double the number of runs). Options: `--no-sub`, `--sub-repeats=N`,
`--scenes=a,b`, `--metric=cpu|ms|main` (cpu, the approved metric, is the default), `--noise=0.10`, `--settle=1`, `--bootstrap=2000`.

Recommended (section 3.1, the process-instance effect): three independent runs (`run1`, `run2`, `run3`, the same command with
another `--json` and label), then `node tools/perf/compare-runs.mjs <run1> <run2> <run3>`: every scene and figure, one column per
run, CONSISTENT only when all three are GOOD and on the same side of the limit.

The render measurement has its own command (`docs/task8/RENDER_PERF.md` section 2), from the same checkout:

```
node tools/perf/render/run.mjs --label="OFFICIAL render, frozen 866a49b, <machine>" --out=docs/task8/render-perf/<date>-official.json
node tools/perf/render/report.mjs docs/task8/render-perf/<date>-official.json
```

Before them, the identity proof of the build: `node tools/perf/identity.mjs --root=. --compare=<acdc91e hashes>` (section 5).

## 12. What remains

1. **The official run** on a quiet machine (section 11), with the corrected method (section 1.1). Every figure so far is
   preliminary or provisional, including the two preserved runs of 2026-11-08 (`docs/task8/perf-runs/`).
2. **R1 over the provisional 25%** (old figures; to be re-measured with the method of section 3.1): A1 and X1 on every measure; A4 and A5 on the preliminary run (A2 and A3 within on the protocol R1,
   over on the same-process R1); on the quieter same-process re-run all six are over (A2 1.26 and A4 1.27 only just). The investigation (section 9) finds the cost in effect processing (the per-tick field path for every actor once
   any field exists), extra bodies and obstacle checks (summons and constructs), and allocation; not in inefficient contract code or
   lookups. The outcome-identical options left (9.2 items 1 to 5) are moderate; the remaining field cost is structural (every actor
   experiences every field every tick, as specified in §11). The owner decides whether the provisional budget stands; no mechanic was
   simplified.
3. **Sub-measurement resolution:** on this machine one overlay's cost (5 to 20%) is close to the noise; the official run's quiet
   conditions should resolve them. Their costs are not additive (a scene's all-on cost is less than the sum of its overlays').
4. **Frame time and rendering** (spec §26) are measured separately (`task8-render-perf`), not here.
5. **Not authorised and not done:** no mechanic, value, trigger, duration, event order or legitimate effect was changed to gain speed.

Raw runs: `docs/task8/data-perf-n8e-preliminary.json` (this section's run); before N8e: `docs/task8/data-perf-scenes-before.json`
and `data-perf-scenes-after.json`.

## 13. Third pass: ability overhead (2026-11-08/09, owner direction 23:13; branch `task8-sim-opt`)

Targets named by the owner: repeated field exposure and overlap calculations; unnecessary summon, construct and collision
processing. Short targeted checks only, no long benchmark cycles. **Every figure in this section is PROVISIONAL** (short runs, 5
repeats, busy machine).

**Identity after every step:** `node tools/perf/identity.mjs --root=. --compare=<hashes>`, hashes made from `git archive acdc91e` with
this branch's `tools/perf` copied in (`--out`): **IDENTICAL, 19 scene variants (13 scenes), 12 full games**, at 5b2ae99 (start) and
after each commit below. Targeted tests after each commit: `tests/task8-*.test.js` (34 files), `engine`, `abilities`,
`legendary-plays`, `replay`, `pursuit`, `run-read`, `qb-read`: **349/349** (never the full suite).

| Commit | Change (file) | Why it is identical |
| --- | --- | --- |
| b0257cc | **Field containment** (field-effects.js `effectsHere`): each field's four bounds are read from flat arrays filled once per play, and an actor outside the union of all field rectangles skips the per-field loop (empty containment key). A field with removed footprints (`holes`) keeps the full `contains()`. | The play-frame fields are plain copies that nothing changes during the play (Prism Break edits the stored list between plays). The per-field test is `inRect` unchanged (same `>=` / `<=` on the same numbers). Outside the union's bounds no `inRect` can be true. The key, the memo and `effectsAt` are unchanged. |
| b0257cc | **One shape** for the per-type base-effect lookup (all twelve element keys declared, undefined) and for the attribute-layer record `fx.attr` (`awareness`, `catching`, `blocking`). | Undefined reads exactly as absent at every read site (`?.strength ?? 0`, truthiness, `|| 0`). Nothing enumerates either object (checked: the only reader outside field-effects.js is nightowl's `b.fx?.base?.Dark` truthiness test). |
| b0257cc | **Separation:** a play whose fields include no Earth field takes the plain loop of #5 when no actor carries a body rule (`FX.hasEarth`). | Without an Earth field no lookup has an Earth entry, so `FX.resist` is exactly `1 - min(0.99, 0) = 1` and `push * 1 === push`. Every other M3 test in the full loop is false in that case (same as #5): same pushes, same order. |
| b0257cc | **Obstacles:** `keepOut`'s own outside-the-footprint test runs before the contract's `blocks()` predicate (rect: the same padded `<=` / `>=` test; circle: \|dx\| or \|dy\| ≥ r + body). | All `blocks` predicates are pure (the default `() => true`, Stone Screen's `a !== self`); keepOut returns at once for every skipped actor (for a circle, `hypot >= max |component| >= R`). Same actors pushed, same order, same values. |
| b0257cc | **Tick dispatch:** a per-play list of the actors whose contract has a `tick` hook, in actor order. `spawnActor` resets it. Each listed actor gets exactly `hook()`'s steps (context built at the first call, then `mayAct`). | A contract is set on the actor at creation and never changes, and contract objects are frozen. An actor without a tick hook made `hook()` return undefined with no side effect, whether or not a context existed (the lazy context is built only when a hook exists). |
| 17ae6f3 | **Field entry checks** run only when an actor's resolved lookup object differs from his previous tick's. His type's memo map is kept on his field state. | After one pass over a lookup, every one of its field ids and its hybrid name is in `seen`, so with the same lookup the loop's tests are all false: no event, no Electric roll (the draw only happens inside a first entry). An actor's type never changes (no assignment anywhere in `src/sim`). |
| c54a612 | **`ctx.opponents(team)`** returns the engine's own `defs` / `offs` list instead of a new filtered array. `shapeDv` returns one reused pair. | `defs` / `offs` are order-preserving filters of `actors`, extended by spawnActor in the same order, so the elements and order are equal to the filter. Every contract only reads the list (13 call sites: for-of, some, find, filter, map), and none spawns while iterating it. steer reads both numbers of `shapeDv` at once and keeps nothing. |
| cdbc5a8 | Runner (tools only): `--no-sub` no longer crashes on the missing `only:none` control. | No game code. |

**Tried and not kept:** none. The tick-hook dispatch and obstacle pre-test are small on these scenes (`hook` and `keepOut` self time
are 1 to 2% of a profile). They are kept because they are exact and remove per-tick work that grows with actors and obstacles.

**Short-run gains (PROVISIONAL).**
- *In-process, same build, A1 abilities on / off* (scratch harness: 7 rounds, settle runs, alternating order; machine under other
  load): abilities-on median CPU **297 → 254 ms after b0257cc → 238 ms after 17ae6f3**. The twin was unchanged at 176 ms in both
  quiet-enough rounds.
- *CPU profile, A1 abilities on, 10 passes, 100 µs sampling:* field-effects.js self time **9.2% → 6.4% of the profile** (652 of 7,065 ms
  before, 295 of 4,597 ms after). Relative to engine.js self time, **0.155 → 0.103**. fields.js 1.9% → 1.9%; GC 12.9% → 11.6%.
  (Shares only. The two profiles ran under different machine load, so their absolute times are not comparable.)
- *Old build against new build, abilities on, two worker processes, 9 rounds ABBA* (fingerprints equal): A1 0.96, A2 1.04, A5 0.95,
  X1 1.05 (IQRs about ±0.1). This is a cross-process comparison, so it carries the ±15 to 30% process-instance effect of §3.1
  item 1. It shows no regression but does not resolve a gain.
- *The runner's R1* (`run-scenes.mjs --scenes=A1,A2,A5,X1 --repeats=5 --no-sub`): two before/after pairs, all **PRELIMINARY (not quiet)**.
  Competing CPU was **1.04 / 0.61 CPU (pair a)** and **1.18 / 1.24 CPU (pair b)** for the whole run (0.28 to 1.41 per scene; the quiet
  limit is 0.05). The machine was shared with other agents throughout. At that load the R1 intervals span about 0.4 to 2.9 and
  move by up to 0.6 between identical builds, so they cannot show a 10 to 15% change. They are kept as
  `docs/task8/perf-runs/2026-11-09-third-pass-short-{before,after}-{a,b}.json` and are not used for any verdict:

| Scene | R1 before, pair a / pair b (95% interval) | R1 after, pair a / pair b (95% interval) | per-step × volume (after, b) |
| --- | --- | --- | --- |
| A1 overlapping fields | 1.233 (0.86–1.75) / 1.713 (1.04–1.99) | 1.369 (0.70–1.86) / 1.545 (0.84–1.57) | 1.568 × 0.986 |
| A2 summons, constructs | 1.242 (0.74–1.50) / 1.539 (1.14–2.94) | 1.410 (0.93–1.78) / 1.339 (0.86–2.44) | 1.360 × 0.985 |
| A5 every slot | 0.983 (0.97–1.69) / 1.606 (0.96–1.93) | 1.369 (1.14–1.60) / 1.002 (0.36–1.25) | 0.962 × 1.041 |
| X1 worst case | 1.350 (0.78–1.56) / 1.542 (1.23–1.96) | 1.587 (1.11–2.07) / 1.542 (1.22–1.61) | 1.510 × 1.021 |

The volume factors are deterministic and unchanged (no change of outcome). The overhead is still per step. **Verdict against the
provisional 1.25 budget: not determinable from these runs.** It needs the quiet-machine run of §11 (or at least the four scenes on
a quiet machine, 15 repeats).

**What remains (outcome-identical options not done):**
1. *Separation with temporaries and fields* (A2, X1, any play with an Earth field): a spatial pre-filter must keep pair order and
   in-pass pushes. A grid built before the pass can miss a pair brought together by an earlier push. Not proven identical, so not done.
   The per-pair far skip of #1 already removes most of the work.
2. *Whole-field fields* (A1's Dark field, X1): every actor is inside, so the union test cannot skip anyone. The remaining per-actor
   cost is the layers and the maximum-speed refresh, which must run every tick as specified.
3. *Allocation* (GC 11 to 13% of an A1 profile): most of it is the engine's own per-tick arrays (zone reads, read cues, blocking
   sorts, `recordFrame`), which ordinary plays pay too. The field path's remaining allocation is `effectsAt` on a lookup miss (1 to 3%).
   Changing the engine's sorts or frame records is possible but touches ordinary-play code. It was not attempted under "short checks".

**Would need owner approval (not proposed, not done):** caching the Dark-field Awareness layer (§9.1 item 4: not bit-identical);
evaluating field effects less often than every tick; capping simultaneous temporaries or obstacles.
