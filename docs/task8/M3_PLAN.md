# M3 plan: the 72 football abilities and the runtime-backed football reviewer

Status: plan (2026-11-07). Source of every contract is the generated Dex (`src/data/beast-dex.generated.js`, football abilities,
eight contract sections each, approved overrides applied) and SPECIFICATION_BASELINE.md §9–§13, §20–§23. Nothing here adds a rule.

## Shape

| Category | Count | What the engine needs |
| --- | ---: | --- |
| Special action | 24 | A trigger at a hook (pre-resolution where the contract says so) that changes an outcome or performs a move |
| Zone | 19 | A field object: geometry, owner, clock (FIELD_CLOCKS.md, G1–G3), queried by movement, speed, awareness and contests |
| Targeted effect | 12 | A status through the shared gate (`src/sim/t8/status-runtime.js`) on a chosen target |
| Self enhancement | 9 | Charges, timed or encounter-scoped self modifiers, persistence across plays and possessions |
| Aura | 8 | A passive radius effect, one mastery credit per game when its core effect applies |

## Architecture (built first, then the abilities)

1. **Contract registry** (`src/sim/abilities/registry.js`): one module per family (`src/sim/abilities/<family>.js`) registering
   handlers for named hook points, its per-form and per-mastery values (from the Dex values, `approved-values.js`), its charge or
   cooldown state, and its mastery execution boundary (one credit per valid execution; aura/passive one per game).
2. **Engine hook points** in `src/sim/engine.js`, added once and shared, so ability modules never edit the engine:
   snap, tick (per actor), engage, shed, block result, tackle attempt (pre-resolution, P6), throw and catch point
   (pre-resolution interception/breakup, P6), fumble (Shielded first, B3), whistle, possession change, kickoff and return,
   plus field queries (speed, awareness, contest modifiers) and the status gate.
3. **Game-scope ability state** in the game state (charges, cooldowns, fields with clocks, per-game mastery caps), saved with an
   active game where saving is supported.
4. **Per-family replacement.** Each family's legacy effect key is removed in the same change that registers its contract
   (BUILD_PLAN: no stacking). A static test fails if any legacy effect key or trait key is reachable from the engine, or a family has
   both.
5. **Visual cues** (functional only): charge bars, field rectangles with outlines, status badges and the approved event cues in the
   existing renderer. Art polish stays deferred.
6. **Football reviewer** (Developer → Ability reviewer): every one of the 72 abilities listed with each form and mastery tier; each
   scenario runs on the real engine (staged inputs, real hooks), replays with its cues, and writes nothing to any franchise
   (no XP, mastery, collection or save writes). It replaces the legacy Ability Audit for football.
7. **Mastery hooks**: execution events carry the credit; awarding mastery itself is M5 (grading and mastery), so M3 records the
   events and tests their boundaries.

## Order

1. Framework (registry, hooks, game-scope state, the static gate test) with two pilot families of different categories
   (Blazing Resolve: self charge; Beacon Lane: zone with a paused clock).
2. The remaining 70 in element batches (six per element), each batch with per-contract tests (B12: frozen tolerance and sample size
   for any probability), run in parallel on separate branches because each family is its own module.
3. The reviewer, then the M3 gate: per-ability contract cases; reviewer browser check (all 72 listed, every scenario runs on the
   engine, no progression writes); full suite.
