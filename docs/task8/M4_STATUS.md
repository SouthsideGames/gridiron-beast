# M4 status: Beast Clash on the Task 8 model

Branch `task8-m4-core`, started from `origin/task8-implementation` at 5c059fc. Steps S0 and S1 of [M4_PLAN.md](M4_PLAN.md) §4.
Nothing in the franchise, the UI, football, saves or `src/clash/index.js` uses the new engine yet. No owner decision from M4_PLAN §5b
has been resolved here.

## S0: freeze the legacy engine (no behaviour change)

**Approach.** The least invasive one: the legacy files stay where they are. The plan's move into `src/clash/legacy/` was not made.
- Header notes mark `engine.js`, `handlers.js`, `conditions.js` and `ai.js` as the **frozen legacy rulesets** (`current` = values
  1.1.0, and `v1.0.0`). These are comment-only changes.
- `src/clash/rulesets.js` is the router. It sends `ruleset: 't8'` to the Task 8 engine and every legacy ruleset (or none) to the
  unchanged legacy engine. It refuses unknown rulesets.
- The router is **not** exported from `src/clash/index.js`. That keeps the t8 modules out of the game's import closure, so
  `index.html` needs no restamp, and `clash-link.js` and the UI are untouched. The plan's §3.1 says `index.js` exports both rulesets;
  that change is left to S12.
- The legacy engine still refuses `ruleset: 't8'` (`battleConfig` throws "Unknown ruleset"), so the two rulesets cannot mix.

**Deferred from the plan's S0 row** (S1 does not need them):
- the ability-kind table `ability-kinds.js` (D16);
- the boundary whitelist for `src/sim/t8/status.js` (needed at S2);
- the frozen B12 probability-tolerance table (needed before the first probability test, at S2 for Confused).

**Test:** `tests/clash/t8-legacy-freeze.test.js`. It replays both legacy golden fixtures (`golden.json`, `golden-v1.0.0.json`;
40 seeds) through the router, and every hash is byte-identical.

## S1: core model and the normal-turn clock (`ruleset: 't8'`)

New files in `src/clash/t8/`:

| File | Contents |
|---|---|
| `values.js` | `T8_VALUES`: every approved number, *read* from the frozen values 1.1.0 (nothing copied or changed). `T8_PROVISIONAL`: every provisional default, each with the decision it waits on |
| `combatant.js` | `buildT8Combatant`: the approved HP/ATK/SPD formula, step for step. The archetype comes from the Dex `clashArchetype`, and `contract: null` (no-contract action) |
| `clock.js` | Per-combatant normal-turn clocks: `addClock`, `tickClocks`, `clearClocks` |
| `engine.js` | `simulateClashT8`, the t8 replay key, `t8LogHash`, the state hash |
| `index.js` | The t8 public surface |

**What the engine does:**
- **One active fighter per side.** Reserves are inert: they never act, never take damage and never count turns. A
  round-start reserve window exists, but no reserve ability is registered, so nothing acts in it.
- **The P6 exchange skeleton, as corrected by B3:**
  1. round start;
  2. initiative: interrupt tier, then priority tier, then speed, then a seeded coin on a tie;
  3. each active monster's turn, in initiative order: turn start, choose the action, the ordinary attack, an immediate KO
     with the replacement right after the hit, then end of turn, where the holder's clocks advance;
  4. the rotation phase (a stub: no rotation until S4);
  5. end of exchange (delayed impacts arrive in S5);
  6. the end check.

  A side left with no living monster loses once the hit's knockouts are settled. A double knockout goes to the seeded coin.
- **Normal-turn clock.** Each combatant counts its own normal turns (`turns`), and a skipped turn counts. A clock is held by
  one combatant and advances only at the end of that combatant's normal turns:
  - `duration` clocks are held by the recipient;
  - `cooldown` clocks are held by the owner;
  - a clock started during its holder's turn skips that turn. This covers spec §10 ("application turn does not consume
    duration") and the contracts' "subsequent owner normal turns; application turn excluded; reserve pauses";
  - reserve time never advances a clock.
- **KO replacement.** The first living reserve in lineup order enters right after the hit (B3 rule 4). The knocked-out monster's
  later turn is cancelled (B3 rule 2), and the replacement first acts next exchange. This is **provisional, pending D2**.
- **The no-contract action** for every monster (Basics and the 72) until S6–S11: the ordinary attack plus archetype perks.
  - Damage is round-half-up(ATK × ramp × spread × type × Tank guard), with no minimum.
  - Tank guard 0.88 applies only while the Tank is active.
  - Disruptor pierce ignores the Tank guard.
  - The Striker shield-break perk is carried but has no shield to act on yet.
- **Determinism.** There is one counted seeded stream (`rngDraws` is in the result). Draws happen in a fixed order, and only for:
  - the initiative tie coin;
  - one damage spread per ordinary attack;
  - the double-KO coin;
  - the exact-tie coin at the cap.

  `log: 'none'` changes no draw. The `stateHash` covers the authoritative end state only, so log on and log off compare equal.
- **Probes.** Hooks for tests and the reviewer only: `initiative`, `chooseAction` (skip only), `roundStart`, `turnStart`,
  `endOfTurn`, `rotationPhase` and `endOfExchange`. A probe gets a read-only view and can start clocks. It cannot draw from the
  random stream, and a probed result is marked `probed: true`. The S5 registry will use these hook points.

**Approved values used unchanged** (values 1.1.0):
- the archetype multipliers and perks;
- the stat formula;
- the type factors 1.05 / 0.952;
- the damage spread 0.9–1.1;
- the initiative tie band of 2;
- the exchange cap of 30;
- the HP-share tiebreak with the exact-tie coin;
- the sudden-death models E and F from exchange 12;
- C6.

## Provisional defaults and the decision each waits on

The same list is in code as `T8_PROVISIONAL` (`src/clash/t8/values.js`), and a test checks that every entry names what it waits on.

| Id | Default | Waits on |
|---|---|---|
| `ko-replacement-line-order` | First living reserve in lineup order; it enters right after the hit and does not take the cancelled turn | **D2** |
| `sudden-death-scope` | The values 1.1.0 ramp multiplies the raw damage of every ordinary attack (the only damage path in S1) | **D8** |
| `stalemate-c6-scope` | C6 is computed each exchange as in values 1.1.0; nothing reads it, because no heal or shield exists in S1 | **D8** |
| `exchange-cap` | The approved cap, HP share and coin, as in values 1.1.0. What happens to pending delayed impacts at the cap is open (none exist yet) | **D8** |
| `single-rounding` | One round-half-up at the final HP-loss conversion | **D9**; S3 for the Shared Burden raw budget |
| `initiative-tie-band` | P6's "seeded tie-break" uses the approved band: speeds closer than 2 are a tie, decided by one coin draw | Reading of an approved value; see the findings below |
| `ko-clears-durations-keeps-cooldowns` | A KO clears the monster's duration clocks (spec §10; B3 rule 2) and keeps its cooldowns (Second Spring: "no cooldown reset") | S2 (statuses), S5 (ledgers) |
| `striker-shield-break-inert` | The perk is carried but has nothing to act on | **D5**; S2 (Shielded) |
| `tank-bruise-not-implemented` | The legacy bruise (heals ×0.75) is not in t8, and no heal exists in S1 | **D6** |

## Test results

All runs are targeted only (`tests/clash/*.test.js`). The full suite was not run.

| Commit | Run | Result |
|---|---|---|
| 5c059fc (base) | `node --test tests/clash/*.test.js` | 99 tests, 99 pass, 0 fail (34.3 s) |
| 70373c7 (S0) | `t8-legacy-freeze` + `boundary` | 5 / 5 pass |
| a4c5e09 (S1) | `node --test tests/clash/*.test.js` | **115 tests, 115 pass, 0 fail**, 0 cancelled, 0 skipped (40.1 s; 41.9 s on the rerun) |
| a4c5e09 (S1) | `node tools/test-tier.mjs perf` (legacy 10,000 3v3, no log, under 5 s) | 1 / 1 pass (file 3.28 s) |

**Per file at a4c5e09:**
- the 15 pre-existing files are all unchanged and green, 99 / 99: boundary 3, calculators 4, conditions 9, data 4, engine 9,
  experiments 7, gateb2 5, gateb3 5, gateb4 6, gateb5 5, implementation 9, presentation 13, readiness 5, reflect-ko 8, stats 7;
- `t8-core` 14 / 14;
- `t8-legacy-freeze` 2 / 2.

**Timing, 10,000 3v3 battles with no log** (the perf test's 50 lineups, one script, two passes on this 2-CPU container):

| Engine | First pass | Second pass |
|---|---|---|
| legacy | 2,636 ms | 1,791 ms |
| t8 S1 | 881 ms | 523 ms |

t8 is cheaper because it has no back row, conditions or move branches yet. No wall-clock assertion was added for t8; the plan's
perf gate stays on the legacy test until S16.

**What `tests/clash/t8-core.test.js` covers:**
- Dex archetypes for all 192 families. HP/ATK/SPD equal legacy wherever the archetypes agree, which is all but the 11 families the
  plan lists. The spec §1 totals 14/15/15/13/15 hold.
- One active fighter and inert reserves (600 battles, 1v1 to 5v5).
- The skeleton phase order, with turns following initiative (200 battles).
- Initiative tiers, and draw counts with and without a tie.
- The clock, as a unit and in the engine: recipient durations, owner cooldowns, the start turn excluded, skips counting and the
  reserve pause.
- A KO clears durations and keeps cooldowns.
- KO replacement (300 battles: more than 500 KOs, and more than 50 cancelled turns).
- The no-contract damage formula, reproduced draw by draw, including the Tank guard and Disruptor pierce.
- Basics-only battles.
- Determinism: 300 battles with log on and off compared on outcome, draws and state hash. 20 golden seeds in
  `fixtures/golden-t8.json`, replayed from stored keys.
- Config separation and invariants over 1,000 battles.
- The provisional list.

## Findings against the plan and the spec

1. **The plan's §3.1 file move and `index.js` export were not done.** This follows the instruction to take the least invasive
   route: the legacy files stay in place, and the router is reachable only from tests, until S12.
2. **The plan's S0 row also lists the ability-kind table, the boundary whitelist and the B12 tolerance table.** None is needed in
   S1, so all three are deferred (above).
3. **Initiative tie.**
   - P6 says "ordinary speed, then a seeded tie-break" without defining a tie.
   - The approved values 1.1.0 band (`damage.initiativeTie: 2`) is kept.
   - If the owner reads P6 as exact-speed ties only, this is a one-line change.
4. **KO replacement's turn.**
   - B3 rule 2 cancels the knocked-out monster's later turn. Nothing says whether the replacement takes it.
   - S1 says no, which matches the legacy engine.
   - This sits with D2.
5. **Sudden death is tagged `provisional` in `values.js`.** The plan calls the ramp, C6 and the cap approved values 1.1.0, but only
   C6 and the cap are tagged approved in code. D8 covers the ramp's scope either way.
6. **The plan's S1 row says "perf test pointed at t8".** The task instruction keeps the legacy Phase 1 perf test as the gate.
   The legacy test is unchanged, and the t8 timing is reported here instead.
7. **No contradiction was found between spec §10 and the Clash contracts on clock semantics.**
   - Spore Detonation, Rubble Reprisal and Arc Rebound all say "subsequent owner normal turns; application turn excluded; reserve
     pauses".
   - Arc Rebound's "starts at launch" is consistent: it starts inside the owner's turn, so that turn is excluded.

## What S2 needs next

- **Boundary.** Whitelist `src/sim/t8/status.js` (or move it to a shared folder), since `tests/clash/boundary.test.js` allows
  only `core/rng.js`, `src/data/` and `src/clash/`.
- **The B12 tolerance table, frozen first.** At least Confused 25% must be frozen before any probability test runs.
- **The status slot on the t8 combatant**, through the gate in mode `clash`. Its duration rides the S1 clock: a `duration` held
  by the recipient, with the application turn excluded.
- **Hook points S1 already provides:**
  - the Stunned check sits at the start of `takeTurn`, after `turnStart`. A skip already counts as a normal turn, and
    `consecutiveSkips` is tracked for the D4 safeguard;
  - Slowed / Quickened go at the initiative speed line (D10);
  - Afflicted goes at the end of turn, before `tickClocks` (P6 step 3.14);
  - the KO status clear goes in `knockout()`, where durations are already cleared.
- **Shielded and Guarded** need the 8d mitigation step in `ordinaryAttack`, after the type factor and the Tank guard, plus D11 for
  the Shielded strength comparison.
- **Owner decisions** that S2 touches: D4 (the Stunned safeguard), D10 (cross-mode magnitudes) and D11 (Shielded). Until they are
  answered, S2 will label its defaults provisional in the same way.
