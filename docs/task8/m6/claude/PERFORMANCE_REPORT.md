# M6 performance: field-cost pass and measurements (2026-11-11)

Three separate things are reported here and they must not be read as one result:

1. **CPU cost of the simulation** on a cloud server (the approved scene protocol).
2. **Desktop frame time and live Auto/save** in a headless desktop browser.
3. **Physical-phone performance: not measured.** See `PHONE_TEST_CHECKLIST_IPHONE17PM.md`.

## 1. CPU: field-cost optimization pass

**Commit d544fec** (`task8-m6-integration`), on its own, touching only `src/sim/t8/field-effects.js` and `src/sim/t8/fields.js`.

### What changed

All of it is "work the same thing out once instead of every tick". No rule, value, event, random draw or visual changed.

| Change | Where it helps |
| --- | --- |
| The hybrid name, Water entry, Fire/Wind speed sum and Dark share are stored on the per-play lookup | Every monster, every tick, in any field |
| The speed entry is written only when the sum changes | Monsters standing in Fire or Wind |
| An attribute is stored only when its number changes | Dark fields: removes one boxed number per monster per tick |
| Steam layers and the Mindstorm echo are skipped when they cannot act | Every play without those hybrids |
| The Magnetic Storm pairing builds no list until that hybrid exists | Every play without it |
| The field lookup is split: the type-independent half runs once per overlap region, not once per monster type | Overlapping fields |

### Outcome identity

| Check | Result |
| --- | --- |
| `tools/perf/identity.mjs`, 19 scene variants and 12 full games, against 9421635 | Identical |
| AI franchise benchmark, seed 1, one season | Same hashes as f716b02 and f9e7581 (77ce08b7…, e04831ba…) |
| Full regression on a frozen copy of d544fec | 2,014 of 2,014; no failures, skips or cancellations (59 minutes) |

### Profile (deterministic workload, 25 loops, self time in field code)

| Scene | Before | After | Change |
| --- | --- | --- | --- |
| A1 overlapping fields | 680 ms | 468 ms | −31% |
| X1 worst case | 915 ms | 589 ms | −36% |
| A5 full contracts | 153 ms | 84 ms | −45% |

Field code includes the tick, the lookup, the layers, the Magnetic pairing and the part of the tick the engine inlines.

**Field code was never most of the overhead.** With abilities on, A1 costs about 2,180 ms more than with them off (25 loops).
Field code was 680 ms of that, before this pass:

| Source of the extra cost (abilities on against off) | A1 | X1 | A5 |
| --- | --- | --- | --- |
| Total extra cost | 2,183 ms | 4,150 ms | 2,475 ms |
| Field code (before this pass) | 680 ms | 915 ms | 153 ms |
| Garbage collection | 608 ms | 771 ms | 855 ms |
| The play loop itself (hook dispatch, obstacles, more actors) | 156 ms | 568 ms | 185 ms |
| Everything else (contract hooks, defensive reads, per-play rules, logging) | about 740 ms | about 1,900 ms | about 1,280 ms |

- **Garbage collection is now the largest single item** in all three scenes (it did not fall with this pass). The number of
  collections is about the same with abilities on or off; each one takes longer (2.8 ms against 1.8 ms in A1) and about 65%
  more memory survives each one (A5: 817 KB against 496 KB).
- **What I checked about it, without a fix yet:**
  - Not a leak: after a play, none of its monsters' working records are still held (heap snapshot after 30 plays, both modes).
  - Not the saved play output: it is only 5% larger with abilities on in A5 (30% in A1, from field-entry events).
  - Not the engine's memory pre-placement guess: turning it off changed nothing.
  - What differs: with abilities on, each play's monster records and working objects live long enough to be moved to
    long-lived memory (about 75 MB over 13 runs against under 1 MB with abilities off). I have not found why.
- **This part is specific to the server's JavaScript engine (V8).** Safari on an iPhone uses a different engine with a
  different collector, so this cost may be smaller or larger there. It is one more reason the phone has to be measured.
- **A5 (full contracts, no staged fields):** garbage collection is 35% of its overhead; the next largest items are the play
  loop, the per-play rules step, the contract hook dispatch and one contract's tick (Pyrelynx).
- **X1** adds summoned actors: more bodies per tick is real work, not waste.

### Approved CPU protocol, rerun twice after the pass

d544fec against main 43976f4. 3 warm-ups, 15 repeats, alternating order, bootstrap intervals. Both runs met the quiet-machine
rule (competing CPU 0.000, steal at most 0.018). **Every row is PROVISIONAL under the existing noise rule** (spread over 10% of
the median), exactly as before. The rules were not changed.

**Engine, limit 1.10 (each scene on its own): all 13 pass in both runs.**

| | Before the pass | Run 1 | Run 2 |
| --- | --- | --- | --- |
| Range across the 13 scenes | 0.602–0.754 | 0.641–1.055 | 0.628–0.800 |
| Scenes whose interval reaches 1.10 | 0 | 3 (O4, A2, A3) | 0 |

Run 1 was visibly noisier than the other two although it passed the quiet rule. The engine path was not changed by this pass.

**Ability overhead, provisional budget 1.25 (each scene on its own):**

| Scene | Before the pass | Run 1 | Run 2 | Reading |
| --- | --- | --- | --- | --- |
| A1 overlapping fields | 1.602 (1.430–1.708) | 1.395 (1.173–1.445) | 1.356 (1.214–1.521) | **Lower in both runs; still over** |
| A2 summons and constructs | 1.250 (1.075–1.379) | 1.294 (1.141–1.453) | 1.506 (1.066–1.565) | Not resolved by this host |
| A3 delayed effects | 1.217 (1.092–1.583) | 1.347 (1.077–1.492) | 1.076 (0.976–1.128) | Not resolved by this host |
| A4 legendary sequence | 1.184 (0.962–1.226) | 1.265 (1.033–1.310) | 1.060 (1.028–1.169) | Not resolved by this host |
| A5 full contracts | 1.282 (1.177–1.297) | 1.240 (1.138–1.387) | 1.394 (1.194–1.547) | Not resolved by this host |
| X1 worst case | 1.544 (1.483–1.723) | 1.437 (1.268–1.625) | 1.495 (1.344–1.719) | **Still over; improvement inside the noise** |

- **A1 improved** from about 1.60 to about 1.36–1.40 and remains over 1.25.
- **X1 remains over 1.25** in all three runs.
- **A2 to A5 moved by up to 0.27 between two runs of the same code.** This pass did not touch their main paths. On this host the
  protocol cannot place them within 0.15 of the budget, so I report them as unresolved, not as passing or failing.
- **No scene is confirmed inside the 1.25 budget.** The budget is unchanged and still provisional.

Evidence: `cpu-scenes-quiet-host.*` (before), `cpu-scenes-after-field-pass-run1.*`, `cpu-scenes-after-field-pass-run2.*`.

### What would close the CPU gate

- A steadier machine for the ability-overhead ratio (a dedicated core, or more repeats). This host's two shared CPUs are the
  limit on precision now.
- A garbage-collection pass: find what stays alive longer with abilities on.
- Or an owner ruling on the budget once steadier numbers exist. I am not asking for one now.

## 2. Desktop frame time and live Auto/save

Headless desktop Chromium, phone-sized viewport (390×844 at 3×), no CPU throttle, 3 repeats, quiet machine, 0 of 23 rows
provisional. Runtime f9e7581 (before the field pass; the pass does not change what is drawn). Evidence: `render-desktop.json`,
`render-desktop.md`.

| Measurement | Result |
| --- | --- |
| Rendering only, 7 scenes × full and simple effects | 60 FPS in every row; average 16.7–16.8 ms; 95th percentile 16.7–16.8 ms |
| Combined (each snap simulated in the page as it is played) | 60 FPS in every row; at most 2 frames over 33 ms per scene |
| Simulation inside the page | 2.1–6.4 ms a play (median); worst single play 13.6 ms |
| Identity checks | 27 blocks, 0 mismatches; 0 page errors |

**Live franchise match in Auto, including saves (61.9 seconds):**

| | Full effects | Simple effects |
| --- | --- | --- |
| Average frame | 16.8 ms | 16.7 ms |
| Frames over 33 ms | 3 | 0 |
| Frames over 50 ms | 1 | 0 |
| Longest frame | 50.1 ms | 33.4 ms |
| Long tasks | 1 (54 ms) | 0 |
| Simulation in the page, median / 95th / worst | 8 / 21.4 / 29.5 ms | |

- **One visible hitch in a minute of Auto** at full effects (50 ms, three frames). No freeze approached a tenth of a second.
- **This is a desktop processor.** It shows the game is not wasteful; it does not show what a phone does.

## 3. Physical-phone performance

**Not measured. Not verified.** No phone has run any Task 8 build under measurement. The owner's phone is an iPhone 17 Pro Max;
the checklist is `PHONE_TEST_CHECKLIST_IPHONE17PM.md`. A pass on that phone would cover that phone only.

## Still unmeasured

- Any physical phone.
- A CPU-throttled browser run (a desktop approximation; not run in this pass).
- Battery use at 60 against 30 FPS.
- The cause of the longer garbage collections with abilities on.
