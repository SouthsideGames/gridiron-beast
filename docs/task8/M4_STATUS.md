# M4 status: Beast Clash on the Task 8 model

Branch `task8-m4-core`, started from `origin/task8-implementation` at 5c059fc. Steps S0–S4 of [M4_PLAN.md](M4_PLAN.md) §4.
Nothing in the franchise, the UI, football, saves or `src/clash/index.js` uses the new engine yet.

**Owner rulings.** The N8d rulings (SPECIFICATION_BASELINE.md §25; APPROVAL_REGISTER.md "M4 decisions") are on this branch as aad7ca3,
a cherry-pick of acdc91e from `task8-implementation`. Approved and used here: D1, D2, D3 (conditional; see S4), D4, D5, D7, D9, D10, D11,
D12. Approved but for later steps: D15, D17, D18, D19. **Still open and not decided here:** D6 (Tank bruise: not implemented), D8
(battle-length rules: the S1 provisional defaults stay, labelled), D13, D14, D16 (the ability-kind table; no ability batch, S6 or later,
has been started).

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

## S2: statuses in Clash (commits aa4024e, 525e078)

**The B12 tolerance table was frozen first** (aa4024e, `src/clash/t8/tolerances.js`), before any t8 probability test was written:

| Id | p | h | N = ⌈3.29²·p(1−p)/h²⌉ | Source |
|---|---|---|---|---|
| `confused-redirect` | 0.25 | 0.02 | 5,074 | spec §10; STA-07 |

Rows for the ability probabilities are added before their batches; a frozen row is never loosened.

**Boundary.** `tests/clash/boundary.test.js` whitelists `src/sim/t8/status.js` as the one `src/sim` file `src/clash` may import. The
test also asserts that the gate imports nothing, and its purity scan now covers that file. The gate was not moved, so football is
untouched.

**New `src/clash/t8/status.js`: the Clash side of the one shared slot.** It calls `tryApply`, `endOfUnit` and `transfer` from the shared
gate in mode `clash`. What it adds:
- **The gate in Clash.** Football-only statuses (Stumbled, Knocked Down) are refused, and they clear on entry from a carry. The other
  gate rules apply as they are: a different status is blocked; equal applications add duration only; stronger ones replace strength and
  duration, count an application and keep the episode; weaker ones are ignored and use no application; three applications block even
  stronger attempts.
- **Episodes and history.** Every accepted application is appended to the slot's `history`.
- **Tie order** (§9). `orderAttempts` sorts by event order, then sourceID, then abilityID. The engine's batch applies them in that order,
  so the first accepted one takes the slot. There is no random roll.
- **The application turn.** `appliedThisUnit` is set only when the recipient is in its own normal turn at the moment of application. A
  status applied during the opponent's turn is consumed by the recipient's next normal turn. This is the S1 clock's reading
  (`application-turn-in-clash`).
- **Durations** count down at the end of the recipient's normal turns. Stunned skips count. Reserves never take turns, so a status in
  reserve is paused.
- **A knockout clears the slot and episode** at once (and the D4 protection).
- **Clash effects** (Appendix B; D10 "same percentage across modes"). The magnitude is read as in football: `payload.pct`, else
  `strength`, in percent.
  - Slowed and Quickened multiply initiative speed by (1 ∓ pct), and the tie band is applied to the effective speeds.
  - Weakened and Empowered multiply outgoing damage at 8a.
  - Guarded multiplies incoming damage at 8d.
  - Healing Reduced multiplies healing (100% blocks it); it is used by the S3 heal path.
  - Shielded is a pool that absorbs before HP.
  - Confused gives a 25% redirect at launch.
  - Afflicted gives a payload-defined tick.
- **D7.** Afflicted has no healing factor; only Healing Reduced cuts healing.
- **The explicit removal and replacement API.**
  - An ordinary cleanse removes harmful statuses only, and refuses an `uncleansable` payload (Faultline).
  - `replaceWith` starts a fresh episode, but only for a caller with explicit permission, and over an uncleansable status only with
    `overridesUncleansable` (Mountain Shelter).
- **The Deep Winter freeze field.** While a harmful status has `freeze > 0`, each recipient normal turn spends one freeze counter
  instead of the expiration countdown. Harmful effects (the Afflicted tick, the Stunned skip) still run. An accepted same-status
  application ends the freeze; a weaker one does not. No ability sets the field yet (S11).

**Engine (`src/clash/t8/engine.js`).**
- **The Stunned check** at P6 step 3.2, with D4 (below).
- **Initiative** uses the Slowed / Quickened speeds.
- **The ordinary attack:**
  - the Confused redirect roll at launch (one draw, only while Confused; the full attack goes to the attacker itself);
  - then Empowered / Weakened;
  - then type and Tank guard, then Guarded;
  - then the Shielded pool, with the Striker shield-break ×2 (D5: ordinary attacks only, which in S2 is every attack);
  - then one rounding.
- **End of turn** (P6 3.14): the Afflicted tick first (not on the application turn), then the status countdown, then the clocks. A lethal
  tick knocks out at once, the replacement enters, and the knocked-out monster's countdowns are skipped (B3 rule 5).
- **D12.** At the actual end of a standalone battle every status clears (logged). `config.context: 'opening' | 'overtime'` keeps the
  slots and returns them as `carryOut`, converted to the football payload. `carryIn` (football slots) is accepted only in those two
  contexts, and a standalone battle refuses it. S12 connects both to the game state.
- **Reviewer hooks.**
  - `stage` (HP and a status per combatant, applied through the real gate before the opening; the result is marked `staged`).
  - Probe surface: `applyStatus`, `applyStatuses` (tie-ordered), `cleanse`, `replaceStatus`.
  - New hook points: `statusIncoming` (Foresight-type veto before the slot check) and `statusApplied` (Shell Renewal-type reactions).
  - Every blocked attempt logs `status_blocked` (or `cleanse_refused`) with an `unmet` list naming the failed condition and the gate's
    reason.
- **Plain battles are unchanged.** The 20 golden seeds are byte-identical (log hash and state hash). The engine version is `t8-s2`, and
  replay keys from `t8-s1` stay accepted (`keyCompatible`). The state hash appends a status only when one is present.

### D4: how the Stunned countdown handles the protected turn

D4 (approved): "A monster cannot skip two consecutive normal turns. After one Stunned skip, its next normal action is protected from
another Stunned skip. The remaining status duration is preserved."
- **The skipped turn** is a recipient normal turn. It counts Stunned down by one (STA-01: "a skipped normal turn consumes duration").
- **The protected turn** is the next normal turn. The monster acts, and Stunned's remaining duration is **held**: that turn does not
  decrement it. The engine logs `stun_safeguard` at the start of the turn and `status_hold` at its end, both with the remaining count.
- **The protection** is spent by that next normal turn, whatever happens on it, and a knockout clears it. If Stunned has expired by then,
  the flag is still spent by that turn.
- **The result.** A Stunned of n units applied outside the recipient's turn gives: skip, act, skip, act, … skip. That is n skips over
  2n − 1 turns, and it expires at the end of turn 2n − 1. Each Stunned unit costs exactly one skipped normal turn, the same unit B18 uses
  in football ("each remaining unit disables one participating football play").
- **Flagged choice.** Spec §10 otherwise counts every recipient normal turn. The other reading, in which the protected turn also
  decrements, would let a protected turn spend Stunned without skipping, so it would *not* preserve the remaining duration. The
  instruction was to implement the preserving reading and flag it (`d4-protected-turn-hold`).
- **Deep Winter.** Its freeze counter still counts the protected turn, because that turn is a recipient normal turn
  (`deep-winter-freeze-counts-protected-turn`, S11).
- **Code.** The comment block at the Stunned check in `takeTurn` (engine.js), and `endOfTurn({hold})` in status.js.

### D10 / D11 carry payloads (Clash side only; football integration is S12)

| Status | Clash → football (`toFootball`) | Football → Clash (`fromFootball`) |
|---|---|---|
| Slowed, Quickened, Weakened, Empowered | Same percentage, remaining duration, applications and history | Same, 1:1 |
| Confused | `payload.pct = 20`, so football `effectiveAttr` reads −20% Awareness (D10) | The fixed 25% redirect (spec §10) |
| Stunned | 1:1 (B18) | 1:1 |
| Afflicted | 1:1; payload unchanged | 1:1 |
| Shielded | Strength = original pool as a percentage of max Clash HP (the Halo's unit). Payload keeps pool, remaining HP, remaining fraction, `saveSpent`, `fumbleSaves` (1, or 0 once spent) and history | Original strength and pool = round(max Clash HP × pct), where pct is the payload's `clashPoolPct`, else the approved 15% (D11). Remaining = round(pool × fraction). Never refilled |
| Guarded, Healing Reduced | Cleared (Clash only) | — |
| Stumbled, Knocked Down | — | Cleared (football only) |

## S3: damage pipeline and immediate KO (commit ed33b7e)

**One strike** (`strike` / `oneHit` in engine.js) follows P6 steps 3.4–3.12 with B3 step 8. Every step is a named hook point the S5
registry will use; the engine never names an ability. Tests drive the hooks with stubs, and no contract is implemented.

| Step | What happens | Hook |
|---|---|---|
| 3.4 launch | Costs, once-uses and target lock (hook). Then the Confused redirect, for eligible normal attacks only (`ordinary`, `special`); reactions and counters never roll. Then launch accuracy (hook) | `launch` |
| 3.5 interception | Stone Divide | `intercept` |
| 3.6 explicit misses | Defender miss sources only; no base evasion. `undodgeable` skips the step, with no roll | `missCheck` |
| 8a raw once | ATK × mult × ramp × spread × Weakened/Empowered × entry penalty (S4) × ability raw modifiers. Kept exact | `rawModifiers` |
| 8b cover | Lethality is predicted after the original target's defences, using a mitigation preview that changes nothing. A redirect sends the whole raw to the rescuer | `lethalRedirect` |
| 8c split | The raw budget is made whole once (half up), the source share is floored, and the target gets the rest (§9: 101 at 30% gives 30 and 71). Recipients: the original target first, then stable ID | `rawSplit` |
| 8d mitigation | Each recipient's own type, then the Tank guard (active only), then Guarded, then ability mitigation, then the shield | `mitigate` |
| 8e pre-KO | When the loss would knock the recipient out: Last Root-type survival at 1 HP. This also applies to the Afflicted tick (`dotDamage`) | `preKO` |
| 8f HP | The single rounding (D9), the HP loss, and the immediate KO (status cleared) | — |
| 3.9 attached | Status attempts through the shared gate; a blocked attempt never cancels the damage | `attached` |
| 3.10 reactions | One call per monster: the recipients first, then the rest by stable ID. A reaction strike never triggers reactions (no chains) | `reaction` |
| 3.11 after the whole hit | Glacier Wall, Wing Shelter, Mirage Veil, Forge Swipe, Shadow Pounce counter, Rubble Reprisal | `afterWholeHit` |
| B3 rule 4 | **The replacement enters here**: after every living monster's reactions, before the next hit or follow-up | — |
| 3.12 follow-ups | Twin Thunder bolts, Bank Shot ricochet | `followUp` |

**D5 (approved).**
- The Striker shield-break ×2 and Disruptor pierce apply only when the tag is `ordinary`.
- The Tank guard applies whenever the recipient is the active monster, so never on damage redirected (8b) or split (8c) onto a reserve.
- Explicit ability exceptions are preserved through `spec.exceptions` (`shieldBreak`, `pierce`, `tankGuard`), which only a contract sets.
- Tested: an ordinary attack breaks at ×2, a special at ×1, an exception at its own value. Pierce works likewise.

**D9 (approved).** `arith.js resolveAmount(base, factors, {rounding, min, max})` multiplies every named factor and rounds **once**,
half up. `floor` and `ceil` are used only where an approved rule names them (the §9 floors; the Dragon Pounce cost). The damage HP loss,
heals and shield pools all use it:
- **Heals:** entry penalty × C6 × Healing Reduced, then one rounding, capped at missing HP. D7: Afflicted has no factor.
- **Shield pools:** entry penalty × C6, then one rounding, through the gate.

The C6 scope is still D8 (provisional).

**Immediate KO (B3).**
- Rule 1: at 0 HP the monster is out at once, and its status and episode clear.
- Rule 2: every hook item (`runDescriptors`) belongs to an owner. An item whose owner has been knocked out is **cancelled** (logged,
  `stage: 'cleanup'`). Remaining multi-hits of a knocked-out attacker are cancelled. The knocked-out monster's later turn is cancelled
  (S1).
- Rule 3: an item may name one of the nine approved post-KO exceptions (`POST_KO_EXCEPTIONS`: Falling Star, Faultline, Molten Brand,
  Shared Burden, Mountain Shelter, Riptide Pursuit, Astral Strike, Cinder Clamp, Second Spring) and then resolves. Naming any other
  ability is refused with an error.
- Rule 4: the replacement enters after the hit, as above.
- Rule 5: a lethal Afflicted tick knocks out at once, the replacement enters, and the knocked-out monster's countdowns are skipped.
- Rule 6: the end check runs after the hit's knockouts settle, and a double KO goes to the seeded coin (tested with a post-KO eruption).

**Reviewer stream** (§25 standard; no UI built).
- Every event carries `seq` (its index), `turnIndex` (the battle's normal-turn count) and `hit` (the strike id). The reviewer can
  therefore step by event, by turn or by hit.
- Hook-driven events carry `stage`: `trigger` (an `unmet` report), `activation` (`ability`, `redirect`, `survive`), `resolution`
  (`raw_split`, `intercepted`, `miss`, `heal`) and `cleanup` (`cancelled`).
- Any hook can return `{ unmet: [{condition, detail}] }`. It is logged as an `unmet` event, so a failed activation is never a silent
  ordinary attack.
- Provenance: every status, heal and strike records its source and abilityID.

**Plain battles are unchanged.** The 20 golden seeds stay byte-identical. Draws are still spreads plus coins (plus Confused rolls when
present). 10,000 t8 3v3 battles with no log take 1,133 ms on the first pass and 641 ms on the second (S1: 881 / 523 ms).

## Provisional defaults and the decision each waits on

The same list is in code as `T8_PROVISIONAL` (`src/clash/t8/values.js`), and a test checks that every entry names what it waits on.

| Id | Default | Waits on |
|---|---|---|
| `ko-replacement-line-order` | First living reserve in lineup order; it enters right after the hit and does not take the cancelled turn | **D2** |
| `sudden-death-scope` | The values 1.1.0 ramp multiplies the 8a raw damage of every direct strike; not the Afflicted tick, heals or shields | **D8** (open) |
| `stalemate-c6-scope` | C6 as in values 1.1.0; from S3 it multiplies every heal and every shield pool granted, not damage | **D8** (open) |
| `exchange-cap` | The approved cap, HP share and coin, as in values 1.1.0. What happens to pending delayed impacts at the cap is open (none exist yet) | **D8** |
| `initiative-tie-band` | P6's "seeded tie-break" uses the approved band: speeds closer than 2 are a tie, decided by one coin draw | Reading of an approved value; see the findings below |
| `ko-clears-durations-keeps-cooldowns` | A KO clears the slot and episode (approved, §10) and the duration clocks, and keeps cooldowns (Second Spring: "no cooldown reset"); the cooldown half is provisional | S5 (ledgers) |
| `tank-bruise-not-implemented` | The legacy bruise (heals ×0.75) is not in t8, as a status or as a heal factor | **D6** (open) |
| `application-turn-in-clash` (S2) | Applied in the recipient's own turn: that turn is excluded; applied outside it: the recipient's next turn counts | Reading of §10, flagged |
| `d4-protected-turn-hold` (S2) | The protected turn holds Stunned's remaining duration (see the D4 section) | Approved D4; countdown reading flagged |
| `deep-winter-freeze-counts-protected-turn` (S2) | The freeze counter counts every recipient normal turn, the protected one included | S11 (Deep Winter); reading flagged |
| `afflicted-tick-payload` (S2) | The tick is exactly its payload (`tickHp` or `tickPctMaxHp`); 0 without one | A Clash Afflicted producer (none of the 72 has one); D10 is silent on its size |
| `afflicted-tick-mitigation` (S2) | The tick is direct HP loss (no type, guards or shield); the pre-KO hook applies from S3 | Owner (§10 / STA-05 silent) |
| `shield-depleted-ends-status` (S2) | A pool at 0 HP ends Shielded and its episode; a converted football shield that rounds to 0 does not enter | Owner (§10 / STA-09 silent) |
| `shield-strength-units` (S2) | Clash strength = original pool HP; in football, that pool as % of max Clash HP | Approved D11; unit reading flagged |
| `shield-break-rounding` (S2) | Pool loss and HP loss each rounded once, half up | D9 single rounding; reading flagged |
| `multi-hit-target-ko` (S3) | When a multi-hit strike's target is knocked out, the remaining hits are cancelled (no retarget) | The multi-hit contracts (S6–S11) |
| `reaction-order` (S3) | Reactions, after-whole-hit effects and follow-ups run by owner: recipients first, then stable ID | Reading of §9, flagged |
| `reaction-chains` (S3) | A reaction or counter strike runs its attached effects only; it triggers no reactions, after-whole-hit effects or follow-ups | B3/P6 "no chains"; reading flagged |
| `shared-burden-budget-rounding` (S3) | With a split, the raw budget is made whole once at 8c, then each share is rounded once at its HP loss | Reading of §9 + D9, flagged (Shared Burden is S5) |

## Test results

All runs are targeted only (`tests/clash/*.test.js`). The full suite was not run.

| Commit | Run | Result |
|---|---|---|
| 5c059fc (base) | `node --test tests/clash/*.test.js` | 99 tests, 99 pass, 0 fail (34.3 s) |
| 70373c7 (S0) | `t8-legacy-freeze` + `boundary` | 5 / 5 pass |
| a4c5e09 (S1) | `node --test tests/clash/*.test.js` | **115 tests, 115 pass, 0 fail**, 0 cancelled, 0 skipped (40.1 s; 41.9 s on the rerun) |
| a4c5e09 (S1) | `node tools/test-tier.mjs perf` (legacy 10,000 3v3, no log, under 5 s) | 1 / 1 pass (file 3.28 s) |
| 525e078 (S2) | `node --test tests/clash/*.test.js` | **131 tests, 131 pass, 0 fail** (54.7 s; the B12 Confused run is about 10 s of it) |
| 525e078 (S2) | `node tools/test-tier.mjs perf` | 1 / 1 pass (4.2 s file run) |
| ed33b7e (S3) | `node --test tests/clash/*.test.js` | **144 tests, 144 pass, 0 fail** (60.3 s) |
| ed33b7e (S3) | `node tools/test-tier.mjs perf` | 1 / 1 pass (2.9 s) |

**Per file at a4c5e09:**
- the 15 pre-existing files are all unchanged and green, 99 / 99: boundary 3, calculators 4, conditions 9, data 4, engine 9,
  experiments 7, gateb2 5, gateb3 5, gateb4 6, gateb5 5, implementation 9, presentation 13, readiness 5, reflect-ko 8, stats 7;
- `t8-core` 14 / 14;
- `t8-legacy-freeze` 2 / 2.

**Per file at 525e078 (S2):** the 15 pre-existing files 99 / 99 (boundary 3, with its whitelist); `t8-core` 14 / 14 (golden seeds
unchanged); `t8-legacy-freeze` 2 / 2; `t8-status` **16 / 16**.

**Per file at ed33b7e (S3):** pre-existing 99 / 99; `t8-core` 14 / 14; `t8-legacy-freeze` 2 / 2; `t8-status` 16 / 16;
`t8-damage` **13 / 13**.

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
