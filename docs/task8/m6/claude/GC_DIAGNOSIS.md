# Allocation and garbage-collection diagnosis, before any further optimization (2026-11-11)

**Status: diagnosis and proposal. No production code changed.** Build d544fec, Node 22 (V8), the same scenes as the CPU protocol.
Every experiment ran in a scratch copy and kept play outcomes identical where it touched code.

## Finding in one paragraph

With abilities on, the simulation allocates only 5–12% more memory, but about 50–100% more of it is still alive when the engine's
minor collector runs, and full collections happen about twice as often. That extra survival, not extra allocation, is the
garbage-collection cost. It is 20–45% of the ability overhead depending on the scene. I have narrowed where it comes from but
not yet found the object that holds it. Removing all of it would still leave the worst-case scene over the 1.25 budget.

## Measurements (quiet machine, 25 loops per scene)

| | Overlapping fields (A1) | Full contracts (A5) | Worst case (X1) |
| --- | --- | --- | --- |
| Memory allocated, abilities on against off | +12% | +5% | +27% (more actors) |
| Alive at each minor collection, on / off | 1,240 KB / 598 KB | 834 KB / 566 KB | 831 KB / 565 KB |
| Minor collections, on / off | 274 / 274 | 572 / 500 | 631 / 510 |
| Time in minor collections, on / off | 800–940 ms / 530–590 ms | 1,310–1,400 ms / 680–690 ms | 1,690 ms / 940–980 ms |
| Full collections, on / off | 8 / 3 | 8 / 5–6 | 9 / 4–6 |
| **Extra collection time with abilities on** | **about 300–400 ms** | **about 680–760 ms** | **about 770 ms** |
| **Share of the scene's ability overhead** | **25–30%** | **30–45%** | **about 20%** |

## What it is not (each one tested)

| Hypothesis | Test | Result |
| --- | --- | --- |
| A leak: something keeps old plays | Heap snapshot after 30 plays | No play's monster records are reachable in either mode |
| Closures kept by play results or game state | Walked every result and game state for functions | None |
| Bigger saved output | Size of every play's output | +5% in A5, +30% in A1 (field-entry events): far smaller than the survival gap |
| A bigger working set per play | Counted the objects one play holds at its end | Close: 135–200 KB off, 165–210 KB on |
| The engine's "pre-place long-lived objects" guess alone | Ran with it disabled | It is involved (below) but turning it off makes collections slower, not faster |
| Per-play accessors on the contract context (four) and the field object (one) | Moved them to shared prototypes in a scratch copy (outcomes identical) | Survival unchanged |
| New data left in the game state by each play | Measured per key | About 3 KB a play in both modes |
| Module-level caches | Searched the simulation | None hold per-play data |

## What it is, as far as measured

- **The engine pre-places per-play objects in long-lived memory when abilities are on.** In 60% of ability plays the play's
  actor list, slot table, obstacle list and ball record are created directly in long-lived memory; with abilities off, under 1%.
  About a quarter of all monster records are created there too (0 with abilities off).
- **Objects created that way drag the rest of the play with them.** Until the next full collection, everything they point at
  is treated as alive. Sampling shows each ability play's monster records (about 60 KB) and working objects (about 55 KB) ending
  up in long-lived memory; with abilities off almost none do.
- **Why the engine makes that guess only with abilities on is the open question.** With the guess disabled the survival gap is
  still there (1,012 KB against 667 KB in A5), so the guess is a consequence of something surviving, not the root cause.
- **A collection forced right after each play** finds roughly 180–215 KB alive with abilities on against 90–140 KB off. A full
  collection at the same point finds nothing extra. So the extra objects are not reachable by the game; they are being kept by
  how the engine's minor collector treats long-lived memory. That points at step 1 below: record lifetimes with the engine's
  own tooling instead of inferring them.

## Two things that limit how much this matters

- **The measurement harness keeps every play's output until the scene ends** (96 plays). The game does not: it shows a play and
  moves on. Long-lived output is part of why the engine's guesses go the way they do. The real game's collector behaviour is
  therefore not the harness's.
- **This is the server's JavaScript engine (V8).** Safari on an iPhone uses a different engine and collector. None of the
  figures above predict the phone.

## Other allocation facts (not ability-specific)

- The largest single allocation site in both modes is the boxed result of `Math.hypot`: 15% of all memory allocated. Replacing
  it changes floating-point results, so it is **out of scope**: it would not be outcome-identical.
- The contract hook dispatcher allocates a small argument list on every call, used or not. Cheap to remove, small gain.

## Likely benefit

| If the extra collection time were... | A1 (now 1.36–1.40) | A5 (now 1.24–1.39) | X1 (now 1.44–1.50) |
| --- | --- | --- | --- |
| Removed completely (upper bound) | about 1.26–1.29 | about 1.15–1.25 | about 1.35–1.40 |
| Halved (a realistic result) | about 1.31–1.35 | about 1.20–1.32 | about 1.40–1.45 |

- **A5** is the scene that could come inside 1.25.
- **A1** would be at the edge at best.
- **X1 stays over 1.25 in every case.** Its remaining cost is real work: more bodies on the field, contract hooks, defensive
  reads. A collection pass will not close it.
- All figures inherit the host's noise (about ±0.15 on this ratio), so a gain of this size may not be provable here.

## Proposed scope, for approval

1. **Finish the diagnosis first (about half a day, no production change).** Record object lifetimes with the engine's
   allocation timeline to name the objects that survive. Report before touching code.
2. **Then, only if the cause is in the game's code:** changes limited to how long objects live and how they are created (no
   arithmetic, no events, no random draws, no visuals). One commit, outcome identity on 19 scene variants and 12 games, the
   franchise hash, the full regression, and the CPU protocol rerun under the existing noise rules.
3. **Small and safe alongside it:** fixed-argument hook dispatch.
4. **Stop rule:** if the cause proves to be the engine's own heuristics or the harness keeping output, stop. I would then
   report it and, separately, ask whether you want a second, clearly labelled measurement that releases each play's output as
   the game does. That would be a protocol addition for your approval, not a change to the gate.

**What I am not proposing:** changing the 1.25 budget, changing the noise rules, replacing `Math.hypot`, or any change to what
abilities do.
