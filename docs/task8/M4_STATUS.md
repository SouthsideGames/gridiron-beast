# M4 status: Beast Clash on the Task 8 model

> Current N9d follow-up: [N9D_APPROVED_IMPLEMENTATION.md](N9D_APPROVED_IMPLEMENTATION.md). All nine recommendation groups are approved and implemented. The final code passes 1,980/1,980 tests; all 144 presentations and 816 variants are accounted for with no pending ruling gates. Earlier statuses and results below are historical. Browser verification was waived; main/live/preview remain unchanged.


> Latest Codex follow-up: [CODEX_APPROVED_CLASH_FOLLOWUP.md](CODEX_APPROVED_CLASH_FOLLOWUP.md).
> The current integrated branch implements N9c A/B/C/E/G/H, preserves the unresolved gates, and passes
> 1,963/1,963 repository tests. This file retains the original per-branch milestone history below; its opening
> S0–S4 description is historical, not the current integration state. Browser verification was waived by the owner.

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

## S4: rotation (P8) and forced rotation (commit b5fea8a)

**The rotation phase** (P6 step 4, P8) runs after both turns and before end of exchange (delayed impacts).
- **Requests** for both sides come from the state at the start of the phase. They then resolve side A, then side B.
- **A side may request** only when it has an active monster and a living reserve, `ex − lastVoluntary ≥ 4` (approved cadence;
  `ROTATION_CADENCE_EXCHANGES`), and no `rotationLock` hook holds its active. A lock is logged as `rotation_unavailable` with its unmet
  conditions.
- **Resolution order** (hooks asked of every monster by stable ID):
  1. `rotationDelay` (Cinder Clamp). A delay does not spend the cadence;
  2. `pursuit` (Riptide Pursuit). A departing monster knocked out here gets the ordinary KO replacement instead;
  3. `cashOut` (Shell Harvest);
  4. the departure (the status pauses in reserve);
  5. the entrant's `onEntry` effects, at full strength;
  6. `arrival` (Cold Welcome / Downdraft).
- **The entrant** first acts next exchange.
- **The lineup is never reordered** (`lineup-order-stable`).

**P8 entry penalty.** It uses the approved `rotationEntryPenalty`, set only by a voluntary rotation.
- On the entrant's first normal turn: damage (the `penalty` factor at 8a), heals and shield pools are ×0.5.
- `view.combatant(id).entryPenalty` exposes the factor to hooks, for contracts' status-application chances.
- A Stunned skip spends it, and the next turn is full.
- KO replacements and forced rotations never set it. Reactions and entry effects never read it.

**D1 (approved): player rotations.**
- **Policies** are `none`, `ai` and `manual`. The default is `ai`, so headless and Skip runs use the AI policy. `none` is for tests and
  staged scenarios.
- **Stopping.** A `manual` side with no recorded decision for a legal rotation phase stops the engine. The result has `pending: true`
  and a `boundary` object: `{ kind: 'rotation', ex, side, activeId, options: ['stay', 'auto', …reserve ids], reserves, rngDraws,
  stateHash, lastSeq }`. The last event is `rotation_prompt`.
- **Resuming.** Re-run with `config.decisions[side][ex]` set to a reserve id (combatant or monster id), `'stay'` or `'auto'`. The log
  is identical up to the boundary, then continues.
- **`'auto'`** ("Auto for the rest") switches that side to the AI policy for the rest of the battle, so it is never prompted again.
- **Invalid decisions** are refused.
- **Turn and exchange stepping.** `stopAt: { exchange, turn? }` returns the same kind of boundary (`kind: 'turn' | 'exchange'`). Its log
  is a prefix of the uninterrupted battle. S13 builds save/resume on this.

**D2 (approved): the AI policy.** `src/clash/t8/ai.js` `chooseRotationAI` is the legacy `smart` policy carried over, with:
- the same value formula and thresholds (gain > 1.45 × stay; or ≥ 0.8 × stay when the active is about to fall);
- the legacy daze/shock factors replaced by the t8 statuses' real effect (Weakened / Empowered %, and Stunned ×0.5, which matches D4);
- visible information only (`ai-visible-information`). The legacy rule read the opposing active's ATK. It now uses the largest single
  hit that opponent has actually dealt. A test wraps the foe in a proxy that throws on any ATK read;
- no random draw.

The opponent-chosen replacement of Riptide Charge is supported by the primitive (`incoming: <id>`). Its policy belongs to that contract
(S10).

**Forced rotation (R5).** `forcedRotation(src, side, { incoming })` is reachable from a stub action or a hook item. It keeps the
existing side-wide pacing: no forced rotation within 3 exchanges of the last one on that side, the approved values 1.1.0 `forcedEvery`.
It also keeps the just-entered protection: an active that entered this exchange, for any reason, cannot be forced out. A refusal (no
active, no living reserve, pacing, just entered, lock or immunity, invalid chosen replacement) is logged as `rotation_refused` with its
unmet list. It carries no entry penalty, and the entrant acts next exchange.

**Fixtures.**
- The engine version is now `t8-s4`. The approved AI default changes ordinary battles, so `keyCompatible` was reset.
- `tests/clash/fixtures/golden-t8.json` was re-recorded from the same 20 lineups and seeds (`tools/t8-golden.mjs`). The ruling that
  retires the S1 fixture is D1/D2 (N8d).
- The S1 fixture is kept as `golden-t8-s1.json`. A new t8-core test shows all 20 still end in exactly the S1 state hash with both sides
  on policy `none`, which proves S2–S4 changed nothing else.

### D3: Feather Relay (built per the reconciled ruling, 2026-11-09 01:03 rule 2)

**The ruling.** Feather Relay counts as a rotation without the P8 entry penalty. Rotation locks, legal availability and the 4-exchange
cadence still apply. It acts at the team's normal action opportunity when the active ally is below 50% HP and a legal rotation is
available. It heals the departing ally 8 / 10 / 12% by form, and the incoming ally makes no normal attack that turn.

**The approved contract (WIN-01-C, generated Dex), quoted where it touches rotation:**
> **Trigger / eligibility:** "Gustling family; Support. Once per Clash, while living/able in RESERVE, at own team normal action
> opportunity if current active ally below50% HP and legal rotation available. This SUPPORT ACTION replaces team attack; not another
> simultaneous active fighter."
> **Targets / placement:** "Current injured active ally rotates with FIRST living reserve in stable lineup order. Gustling may become
> incoming if it is that reserve. Respect rotation locks and legal availability."
> **Core resolution:** "Rotate, then heal DEPARTING ally8 /10 /12% of that ally maximum HP by Gustling /Squallow /Stratosoar form.
> Incoming receives NO normal attack that team turn. Healing Reduced/maxHP cap normal; no shield, cleanse or revive."
> **Lifetime / persistence:** "Immediate rotation/heal only, no status or schedule. Team action consumed once, not a bonus reserve
> normal turn; normal supported status carry remains."

**Is there a contract conflict?** No conflict between the ruling and WIN-01-C was found. Each point checked:

| Point | Contract text | Ruling | Result |
|---|---|---|---|
| Counts as a rotation | "rotates", "legal rotation available", "Respect rotation locks and legal availability" | Rotation | Agrees |
| P8 entry penalty | Silent. It never mentions the penalty, half strength or an exemption | No penalty | No conflict. The contract is silent and the ruling supplies the exemption, which P8 requires to be explicit |
| Locks and legal availability | "Respect rotation locks and legal availability" | Kept | Agrees |
| 4-exchange cadence | "legal rotation available" (the cadence is part of what makes a rotation legal) | Kept | Agrees. Built as: requires the cadence and spends it |
| Timing | "at own team normal action opportunity … replaces team attack" | At the normal action | Agrees with the contract |
| Heal | "heal DEPARTING ally 8 /10 /12% … by … form" | 8 / 10 / 12% | Agrees |
| Incoming action | "Incoming receives NO normal attack that team turn" | No normal attack that turn | Agrees |

**"Acts at the normal action" against the P8 rotation phase.** The only text in tension is P8's, not the contract's. P8 places a
voluntary rotation in the rotation phase "after both normal turns". WIN-01-C and the ruling place Feather Relay at the team's normal
action. The ruling decides this for Feather Relay, so it is built as a team action that executes the rotation immediately in the normal
turn (`teamRotation` in the engine). It is not queued to the rotation phase. It still spends the side's cadence, so a P8 rotation by that
side in the same exchange is refused for cadence.

**Voluntary status for the four rotation triggers: unaddressed.** Neither WIN-01-C nor the ruling says whether a relay rotation is
"voluntary". Each trigger names voluntary rotations:
- Cinder Clamp (FIR-02-C): "the target side's NEXT VOLUNTARY rotation request consumes the grip".
- Riptide Pursuit (WAT-06-C): "react to the first OPPOSING VOLUNTARY rotation"; "Forced rotations and KO replacements do not trigger it".
- Cold Welcome (ICE-02-C): "on a SUCCESSFUL ENEMY VOLUNTARY rotation only (forced rotations and KO replacements excluded)".
- Shell Harvest (NAT-05-C): "A SUCCESSFUL VOLUNTARY departure consumes the entire remaining ORIGINAL Shell Harvest shield".

A relay is neither forced nor a KO replacement, but the texts do not classify it either way. Per rule 2 this stays provisional
(`feather-relay-voluntary`). In normal gameplay all four report `unmet: awaiting ruling (feather-relay-voluntary)` on a relay rotation
and do not trigger; the relay itself still happens. With `config.provisional: 'on'` they treat it as voluntary (the plan's D3
recommendation). This is shown only in reviewer scenarios marked provisional and in `tests/clash/t8-provisional-e.test.js`.

**Other readings, flagged:** `relay-turn-counts` (the active ally's turn in which the relay takes the team action counts as that ally's
normal turn). A failed rotation keeps the use, for example when the departing ally is knocked out by a pursuit before it leaves.

## S5–S11 and S15 (engine side): the 72 Clash abilities

| Step | Commit | Content | Clash tests at the commit |
|---|---|---|---|
| merge | f62d59c | origin/task8-implementation 5b2ae99 merged in (N8e, N8f rulings; spec §26) | n/a |
| S5 | 8f30a85 | Contract registry (`registry.js`), ability-kind table (D16, 72 rows), switchable readings (`flags.js`), the primitives (delayed impacts, revive, transfers, constructs, links, heal schedules, ledgers, deferred queue) and the two pilots: Falling Star and Shared Burden | 247 pass |
| rule 1 | 77da2a1 | Provisional readings isolated from normal gameplay; Feather Relay team rotation; `M4_DECISIONS_PENDING.md` | n/a |
| S6 | e751bd1 | Batch A: 16 attack modifiers and enhanced attacks | 344 pass, 1 todo (the 72-gate) |
| S7 | 926998a | Batch B: 13 protection and self / team status abilities; two Core-vs-Progression conflicts gated | 437 pass, 1 todo |
| S8 | 4941afa | Batch C: 11 healing and support abilities | 464 pass, 1 todo |
| S9 | d618b85 | Batch D: 13 reactions, counters, explicit misses and survival, with the B12 probability runs | 679 pass, 1 todo |
| S10 | 814ebc1 | Batch E: 8 rotation and lineup abilities, Feather Relay included | 756 pass, 1 todo |
| S11 + S15 | 3d822f2 | Batch F: 9 disruption and control abilities; the cross-batch interaction suite (10 cases); the S15 reviewer test | **836 / 836 pass, 0 todo** |

**How the tests are split.**
- Acceptance: `t8-abilities-{a..f}`, `t8-pilots`, `t8-interactions`, `t8-review` and the S1–S4 mechanics files. These run with
  `config.provisional` off.
- Provisional (not acceptance, owner rule 1): `t8-provisional-{pilots,a..e,f}.test.js`, 86 tests. Every one is titled
  `[PROVISIONAL]` and runs with `config.provisional: 'on'`.

**Per ability** (`contractSuite`): a registration test checks the kinds row, the required scenario kinds and that every value appears in
the contract text. One test per Dex form × mastery tier runs every applicable scenario on the real engine. A determinism test checks
that the same seed gives the same log hash and state hash, and that turning the log off gives the same outcome and draws. The
72-row coverage is in `M4_ABILITY_MATRIX.md`: 408 form × tier rows and 1,280 acceptance contract cases.

**B12 runs against tolerances frozen before the tests** (`tolerances.js`):
- Confused redirect
- Snowbank launch
- Heat Mirage t0–t3
- Shadow Pounce (Umbrikit / Obscurat)
- Mind Game afterimage
- Eclipse Call t0–t3

**Reviewer (S15, engine side, no UI).** `src/clash/t8/review.js` provides:
- `reviewMatrix()`: every ability × form × tier, with no silent missing entries;
- `listScenarios`;
- `runScenario`: staged HP, status and ability state; labelled controlled prerequisites (sparring partners, seed selection, probes);
  the ability's own event stream; and a meta block with the PROVISIONAL label;
- `determinismCheck`.

`tests/clash/t8-review.test.js` asserts four things:
- all 72 abilities are in the matrix;
- every row has at least one acceptance scenario of a known kind;
- one scenario per ability runs, and provisional scenarios carry their label;
- a sample of scenarios is deterministic.

**Cross-batch interactions** (`t8-interactions.test.js`):
- Phase Strike vs Last Root
- Stone Divide vs Twin Thunder
- Victory Surge / Arc Rebound vs Stone Divide
- Eclipse Theft vs Glacier Wall rebuild
- Foresight vs Eclipse Call
- Mountain Shelter vs Faultline's uncleansable Healing Reduced
- Emergency Cover vs Shared Burden
- Shell Harvest vs Riptide Pursuit
- Daybreak Lance vs Stoke the Flame
- Circuit Breaker cooldown extension

**Performance.** The legacy 10,000 3v3 perf case passed inside the full Clash run at 3d822f2. Earlier in the work it failed only while
the 2-CPU container was loaded by parallel runs, and it passed when run alone. No legacy engine file changed.

**Kept out of scope.** The t8 engine is still not wired to franchise or UI (S12). The bruise is not implemented (D6). The S1 defaults
stay (item 8). The Daybreak Lance / Clear Light ladder is provisional, with Core one switch away (item 13). Dawn Song is literal: the
caster (item 14). The Stunned countdown is as in S2. The KO replacement is in line order.

## S12: the franchise on the t8 engine (branch `task8-m4-integrate`, from 87eefa3)

**What is wired.** Every NEW franchise battle (Tuesday encounter, pregame Clash, overtime Clash, headless league pregames and
tiebreaks, staff auto-run) plays on ruleset `t8`. `src/clash/index.js` now exports the router (`simulateByRuleset`, `logHashFor`) and
the t8 surface, so the game's import closure includes the 72 contracts (index.html restamped). `src/franchise/clash-link.js` stays the
one franchise importer.

**Records are versioned (D19).** A battle record names the engine that plays it:
- version 1 (implicit: no `version`, no `ruleset`): a pre-M4 record. It replays on the frozen legacy engine with the policies it was
  played with. Finished records are never rewritten.
- version 2: `ruleset: 't8'`, `engine` (`t8-s5`), `context` (`standalone` | `opening` | `overtime`), `policies` (`manual` for the
  player's side in Watch, else `ai`), `decisions.a` by exchange, `carryIn` (overtime), `carryOut` (set at settlement), `mastery`
  (execution counts and the cap scope; no award), and the summary gains `ruleset`, `engine`, `stateHash`.
- an UNRESOLVED pre-M4 record (status `battle`, rewards not applied) is re-run on t8 from its seed and lineups once and tagged
  `migrated: { from: 'legacy', ... }` (the plan's D19 default; the ledger prevents a second award). **Decision to confirm:** N8d D19
  rules on completed records only; the alternative (finish it on the legacy engine) is a one-line change in `upgradeUnresolvedRecord`.

**Snapshots** (`snapMonster`) carry `clashMasteryTier = tierIndex(dev.mastery.clash)` (the tier, never the raw count) and, for the
overtime Clash, `exhausted` from the game's stamina book; `buildT8Combatant` halves all 12 effective attributes once for an exhausted
monster (§12), with the football engine's rounding. The t8 replay key includes both.

**D1 / D2.** Watch: the player's side is `manual`; the engine stops at each legal rotation phase and the battle screen shows the
prompt (Stay in, each reserve with HP / type edge / status, "Auto for the rest of this battle"); the answer is recorded on the record
and the arena plays on from the prompt. Skip, headless settlement (`settleHeadless` answers `auto` at the open prompt, so the log is
identical up to it), staff auto-run (`mode: 'skip'`) and league games use the AI policy. A Watch battle with Auto at its first prompt
is byte-identical to Skip (tested). Riptide Charge's opponent-chosen replacement stays on the S10 default (first living reserve).

**Continuity (§10, §12; D10–D12).**
- Opening Clash: the record's `carryOut` (the engine's football-shaped payloads) is handed to kickoff by `pregamePossession`
  (`statusCarry`) and `leaguePregame`; `newGame`/`playGame` accept `statusCarry` and call the shared `carryInto` before the first
  play (logged). Guarded and Healing Reduced do not enter football (unsupported); Shielded enters as the §10 fumble save payload.
- Overtime Clash: `startOvertimeClash(f, { state })` reads the football state's status book for the battlers (`carryIn`) and
  `exhaustedSet`; the engine converts (`fromFootball`: Stunned 1:1 per B18, Shielded per D11). `applyTiebreak` and `leagueTiebreak`
  clear every status when the verdict is written (the game is actually over).
- `src/sim/rules.js finish()`: the plan's defect is fixed. A game still tied after the overtime period calls `finish(state,
  { tiebreak: true })`, which sets `needsTiebreak` and KEEPS the status book for the deciding Clash; only an untied final clears.
- The shared gate's football `endOfUnit` spends a Deep Winter freeze counter on a harmful status before its remaining duration
  (the Clash side already did; §10 "preserve remaining freeze counters across mode transfer").
- Standalone battles clear at their actual end (engine, D12): `carryOut` is null on every encounter record.
- Finding: the football engine never calls `shieldedFumbleSave` (M3 left the Shielded fumble save unwired); the carry payload is right,
  the football consumer is not this step's.

**Rewards, mastery, Dex.** Unchanged ledger paths (`applyBattleEffects` through `applyActivity`); tested once-only across resolve,
replay, reload and a direct re-call. Mastery execution counts are stored on the record (`e.mastery = { scope, counts }`; scope
`clash:<activity>` for standalone, `game:<year>:w<week>:<club>` for opening and OT) and NO `dev.mastery` credit is written (M5).

**Saves.** Schema stays 10; every new field is additive. Tested: round-trip at a prompt boundary and after settlement; the schema-10
fixture `tests/fixtures/save-v10-season2.json` loads, plays its Tuesday encounter on t8 and a Sunday with a t8 pregame, and round-trips
again. The B11 exchange-boundary save (S13) is not built here: a save at the rotation prompt is the boundary the engine already stops
at (the record holds the decisions; the result is rebuilt from the seed).

**Provisional readings** stay off: `runBattle` builds the t8 config without a `provisional` option (a static test checks the adapter
and franchise.js never mention it), and a franchise-path battle through a gated ability (Dawn Song, D14) logs `unmet: awaiting ruling`
and keeps its use. Tank bruise stays unimplemented (D6).

**Presentation (S12 scope, not S14).** `src/ui/clash/t8-record.js` translates a t8 result into the arena's record one event per
engine event at the same index (`toArenaRecord`); the arena converts automatically, adds the t8 status glyphs, a `silent` tier for
bookkeeping events, `revive`, `playTo`, `controls: false` and the **looks hook**: `createArena(root, result, { looks })` calls
`looks(cue, api)` before every cue with `cue.event.t8` (the untranslated engine event) and a drawing api; a returned Promise takes the
cue over. The `task8-fx-clash` branch plugs its module in as `app.clashLooks` (read by the battle screen and the reviewer).
(Superseded by "Presentation reconciled" below: t8 results now play natively with the fx looks; translation is an opt-in path.) Help text
updated (one active fighter, rotations, statuses). The Clash Lab stays on the legacy ruleset (S14).

## S15 UI: Developer → Clash Ability Reviewer

`src/ui/screens/clash-ability-reviewer.js` (screen `clash-ability-reviewer`, Developer menu) over the engine-side bridge
`src/clash/t8/review-phases.js`:
- every ability × form × tier from `reviewMatrix()` (72 abilities, 408 rows); form, tier and variant selectors; "▶ Scenario" runs
  `runScenario` on the real engine and renders the result through the arena (no scripted animation);
- the explanation panel before playback: source (combatant, side, form, tier), targets seen in this run, expected result, contract
  text, kind row, how it is staged (labelled inputs), controlled prerequisites (seed selection, sparring partners, probes) and the
  PROVISIONAL label where the scenario uses one;
- the four-phase checklist, evidenced by engine events (`seq`) and ticked as the arena cursor reaches them; blocked scenarios (and any
  scenario in which the ability by design never acts) use their own four labels (trigger evaluated → blocked / not activated → ordinary
  play continues → use or state preserved);
- the failure panel: a failed scenario check, a phase without evidence (with the engine's `unmet` reports) or an implementation error;
- controls: pause / play, replay, 0.25× / 0.5× / 1×, step by event, by turn (`turn_start`) and by exchange, to the end; the event log
  window with stage chips; the subject's ability-state line;
- "▶ Natural battle": ordinary AI battles (policies ai / ai, nothing staged), seeds tried until the ability executes;
- verdicts in the shared dev-review store, namespace `clashability` (`gridiron-beast-clash-ability-reviews` / `clash_ability_reviews`),
  fingerprinted on the contract text; nothing written to saves or progression (a source scan in the test enforces it).

`tests/clash/t8-review-ui.test.js`: all 1,375 scenario runs (1,280 acceptance + 95 provisional) demonstrate all four phases on the
first run with ordered evidence and passing checks; failures are reported, never silent; determinism; the arena record and the step
indices; no writes. `tools/m4-integrate-check.mjs` is the browser check (Tuesday encounter and Sunday gym Clash in Watch with a rotation
prompt, the reviewer for representative rare / delayed / multi-target / multi-turn / blocked abilities, Natural battle, 0 page errors).

## Presentation reconciled (branch `task8-m4-reconcile`: `task8-implementation` 762ce62 + `task8-fx-clash` 5cb27ff)

The two presentation branches are merged into ONE arena (`src/ui/clash/arena.js`). Presentation only: nothing under `src/clash`
(engine, abilities, review bridge), `src/sim` or `src/franchise` changed in the merge (`clash-link.js` and `franchise.js` untouched).

**Dispatch** (`arenaMode(result, opts)`, exported and tested):
- `native`: every t8 result (`ruleset: 't8'`). The fx branch's presentation is the primary one: `t8CuesFor` / `t8StateAt` /
  `t8NextExchangeIndex` (`src/ui/clash/t8/timeline.js`), `buildClashT8` / `drawClashT8` / `t8Live` (`src/ui/clash/t8/fx-t8.js`), the two
  overlay layers `.cl-t8-under` / `.cl-t8-over` (looks, status badge, ability icons, turn markers), the playback clock `t8clock` that
  drives the looks at playback speed, the 72 per-ability looks (`src/ui/clash/t8/looks/*.js`), `STATUS_GLYPH` on the strips.
- `translated`: a t8 result with `opts.t8 === 'translated'`: the M4 path (`toArenaRecord` + the legacy cue system with functional
  cues). Kept for legacy-shaped consumers and as a fallback; no screen uses it now.
- `legacy`: every pre-M4 record: the legacy choreographer path, unchanged (D19). The new test plays the frozen goldens' cues and the
  browser check plays a golden record through the DOM arena (animated, skipped to the end, no t8 layers, record object unchanged).

**The M4 player API is kept in every mode:** `playTo(i)`, `record` (the result the consumer passed; the translated record only in
`translated` mode; `source` is always the passed result), `length`, `mode`, `controls: false`, `setSpeed` (syncs the speed buttons),
`speed`, `revive` (native: the fx `revive` beat; translated: the M4 `enter` beat). Plus the fx API: `seek(t)`, `setQuality('full' |
'low' | 'min')`, `quality`, `t8` (the presentation state), `t8Elements`.
- **`silent` tier:** the native timeline now gives pure bookkeeping (`BOOKKEEPING`: turn / round starts, rotation phases, exchange ends,
  clocks starting / ending, rolls) the M4 `silent` tier (`DURATION.silent`, 60 ms at 1x) instead of a 260 ms tick, so a Watch battle
  does not drag; the arena's silent branch only applies the state. Events the looks anchor on (trigger, unmet, cleanup, ability
  progress, clock adjustments) keep their tick. All 408 fx variants and the headless check pass with the shorter bookkeeping.
- **Status glyphs:** strips and float text use `STATUS_GLYPH` (fx) with the M4 `T8_STATUS_ICON` as the fallback; the translated and
  legacy paths keep the merged `COND_ICON` / `COND_COLOR`. In native mode the badge of the information layer is the primary status cue.
- **`looks` option:** kept as an OVERRIDE POINT, documented on `createArena`: `looks(cue, api)` runs before every cue in every mode;
  a truthy return (a Promise) takes that cue over and the arena then only applies the state. In native mode the built-in looks already
  draw every ability, so no consumer needs it (`app.clashLooks` is still passed through by the battle screen and the reviewer and is
  unset in the game); the playback clock is moved to the cue BEFORE the hook runs, so the ability layers keep drawing under an
  override. `cue.event` is the raw t8 event in native mode (`cue.event.t8` in translated mode); the api adds `mode`, `t8`, `time()`,
  `redraw()`.
- **Watch rotation prompt (D1):** unchanged in `clash-battle.js`: the arena is created on the pending result (its last event is the
  `rotation_prompt`, a silent bookkeeping tick in native mode), `onEnd` opens the prompt, the decision is recorded and the remount resumes
  from the saved cursor. The browser check verifies the native layers on the pending record for both battles.

**The two reviewer screens: folded into one.** The fx branch's `clash-reviewer` screen (Developer → "Clash Ability Reviewer (Task 8,
t8 engine + arena looks)") is removed; its catalogue and seven-phase presentation evidence moved to `src/ui/clash/t8/evidence.js`
(`clashReviewCatalog`, `phaseEvidence`, re-exported by the ability reviewer). The §25 Clash Ability Reviewer (`clash-ability-reviewer`,
one Developer entry) now:
- plays every scenario natively with the real look (`subject: abilityId`), at the reviewer-local FX quality (full / low / min) and
  reduced-motion toggles (never saved);
- shows the look's seven presentation phases (anticipation → cleanup, with n/a where the Dex visual has none, and PROVISIONAL) beside
  the engine's four-phase checklist, which still ticks from engine events as the cursor reaches them;
- keeps pause / play, replay, 0.25× / 0.5× / 1×, step by event / turn / exchange and to the end (`playTo`, `setCursor`);
- exposes `#clreview.__rv2` (event-index seek, for `tools/m4-integrate-check.mjs`) and `#clreview.__crv` (`{ arena, prep: { r, cues,
  state, ev }, seek(t), close }`, for `tools/fx-clash-check.mjs`); either seek cancels the pending autoplay; variant options carry
  `data-kind` / `data-prov`.
`tools/fx-clash-check.mjs` targets the unified screen (form / tier / variant selects; the scenario pick follows the engine's
`listScenarios` order, the same rule as the tests and the matrix). `docs/task8/FX_CLASH_MATRIX.md` is generated by
`tools/fx-clash-matrix.mjs --report=<check JSON>`.

**Verification** (targeted): `node --test tests/clash/*.test.js tests/task8-fx-clash-*.test.js tests/franchise-clash.test.js
tests/franchise-save-compat.test.js tests/release-stamp.test.js` all pass (new: `tests/clash/arena-reconcile.test.js`, legacy replay
dispatch / native silent tier and revive / both APIs in the arena source); `node tools/m4-integrate-check.mjs`: all checks passed, 0
page errors (now also: native layers in both Watch battles, each reviewer scenario draws its look at the activation, a legacy golden
record plays in the DOM arena); `node tools/fx-clash-check.mjs`: "OK: no problems" over all 72 abilities at every form (mastery 0).
index.html restamped (`node tools/stamp-release.mjs`).

**Not reconciled / open:** the translated path no longer has a consumer (kept, tested at the cue level only); the `looks` hook has no
implementation in the game (it is an override point by design now); the fx check runs mastery 0 at every form by default
(`--tiers=all` for masteries 1–3 at the first form), the tests cover all 408 form × mastery variants.

## Provisional defaults and the decision each waits on

The same list is in code as `T8_PROVISIONAL` (`src/clash/t8/values.js`), and a test checks that every entry names what it waits on.

| Id | Default | Waits on |
|---|---|---|
| `ko-replacement-line-order` | First living reserve in stable lineup order, for the AI and the player; it enters right after the hit and does not take the cancelled turn | Owner: D1/D2 rule on rotation and the AI, and neither names the KO replacement choice |
| `sudden-death-scope` | The values 1.1.0 ramp multiplies the 8a raw damage of every direct strike; not the Afflicted tick, heals or shields | **D8** (open) |
| `stalemate-c6-scope` | C6 as in values 1.1.0; from S3 it multiplies every heal and every shield pool granted, not damage | **D8** (open) |
| `exchange-cap` | The approved cap, HP share and coin, as in values 1.1.0. What happens to pending delayed impacts at the cap is open (none exist yet) | **D8** (open) |
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
| `lineup-order-stable` (S4) | Rotations never reorder the lineup; "first living reserve" is always the first living non-active monster in the original order (the legacy engine swapped positions) | Reading of the contracts' "stable lineup order", flagged |
| `p8-pending-cleared-on-departure` (S4) | An unspent entry penalty ends with that entry (if the entrant is forced out before its first turn) | Reading of P8, flagged |
| `rotation-hook-order` (S4) | Within one side's rotation, hooks run for every monster by stable ID: delay, pursuit, cash-out, departure, the entrant's entry effects, arrival. A delayed rotation does not spend the cadence | S10 (the rotation contracts) |
| `ai-visible-information` (S4) | The AI reads only visible information; "about to fall" uses the largest hit the foe has actually dealt, not its hidden ATK | Approved D2; reading flagged |
| `feather-relay-voluntary` (S10) | Feather Relay is built per rule 2. Its "voluntary" status for Cinder Clamp, Riptide Pursuit, Cold Welcome and Shell Harvest is gated: awaiting ruling in normal gameplay, voluntary in provisional mode | **Owner** (D3 follow-up, see the D3 section) |
| `delayed-slot-active-position` (S5) | A delayed impact marks the target side's active position (gated as `delayed-slot`) | Reading of FIR-03-C / FIR-06-C |
| `retaliation-suppression-scope` (S6) | A suppressed or reaction strike refuses other monsters' reaction strikes; non-attack responses still resolve | Reading of LIG-06-C and the no-chain tags |
| `performed-attack-at-launch` (S6) | A normal-action attack counts as performed when it launches (before misses) | Reading of "performed normal attack" |
| `healed-hook-kinds` (S8) | Heals and Mind Mend donations trigger Rubble Reprisal; redistribution, revival and HP cost do not | **Owner** (EAR-02-C) |
| `p8-status-chances-none` (S9) | P8 halves no Clash chance (none is a normal-turn application chance) | Finding |
| `post-ko-exceptions-n7c` (S9) | The B3 post-KO list is the N7c eight; Riptide Pursuit removed | RULINGS_2026-11-07b |
| `riptide-replacement-choice` (S10) | "Opposing team chooses" uses the first living reserve | D1/D2 follow-up (S13/S14 player prompt) |
| `heat-mirage-roll-tags` (S9) | The decoy rolls against normal-action and delayed attacks only | Literal reading of FIR-05-C |
| `second-wind-vs-interrupt` (S8) | Second Wind advances past a priority tier, not past an interrupt | Reading of WIN-04-C |
| `hit-cap-floor` (S7) | Tempered Guard's cap is floor(30% max HP) | MET-02-C bound |
| `transfers-no-p8-c6` (S8) | Mind Mend / Root Communion transfers take no P8 or C6 factor | Spec §9 |
| `molten-brand-vs-suppression` (S9) | A Molten Brand eruption on a Daybreak Lance strike is suppressed as attack retaliation | **Owner** (LIG-06-C vs FIR-04-C) |
| `relay-turn-counts` (S10) | The relay turn counts as the active ally's normal turn | Reading of WIN-01-C |

The gated points (normal gameplay: awaiting ruling) are listed in `M4_DECISIONS_PENDING.md` part A and in `flags.js`
`PROVISIONAL_POINTS`: `d13-values`, `forge-swipe-duration`, `fortress-storage-cap`, `d14-dawn-song-target`,
`clear-light-cooldown-unit`, `d5-perk`, `stone-divide-scope`, `delayed-slot`, `d8-cap-delayed`, `feather-relay-voluntary`.

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
| b5fea8a (S4) | `node --test tests/clash/*.test.js` | **155 tests, 155 pass, 0 fail** (102.7 s, on a machine at load average 5–6 from other sessions) |
| b5fea8a (S4) | `node tools/test-tier.mjs perf` | 1 / 1 pass on the rerun. The first run failed at 6,360 ms while other sessions held a load average of about 6 on this 2-CPU container. No legacy file has changed since S0 (`git diff 081c590 -- src/clash/{engine,handlers,conditions,ai,stats,values}.js` is empty) |
| 3d822f2 (S11) | `node --test tests/clash/*.test.js` | **836 tests, 836 pass, 0 fail, 0 todo** (69.3 s); of these, 86 are the provisional files |

**Per file at a4c5e09:**
- the 15 pre-existing files are all unchanged and green, 99 / 99: boundary 3, calculators 4, conditions 9, data 4, engine 9,
  experiments 7, gateb2 5, gateb3 5, gateb4 6, gateb5 5, implementation 9, presentation 13, readiness 5, reflect-ko 8, stats 7;
- `t8-core` 14 / 14;
- `t8-legacy-freeze` 2 / 2.

**Per file at 525e078 (S2):** the 15 pre-existing files 99 / 99 (boundary 3, with its whitelist); `t8-core` 14 / 14 (golden seeds
unchanged); `t8-legacy-freeze` 2 / 2; `t8-status` **16 / 16**.

**Per file at ed33b7e (S3):** pre-existing 99 / 99; `t8-core` 14 / 14; `t8-legacy-freeze` 2 / 2; `t8-status` 16 / 16;
`t8-damage` **13 / 13**.

**Per file at b5fea8a (S4), each file run on its own:**
- the 15 pre-existing files, 99 / 99: boundary 3, calculators 4, conditions 9, data 4, engine 9, experiments 7, gateb2 5, gateb3 5,
  gateb4 6, gateb5 5, implementation 9, presentation 13, readiness 5, reflect-ko 8, stats 7. The engine file's perf case failed once
  under the load spike and passed on the rerun;
- `t8-core` **15 / 15** (the golden test replays the re-recorded fixture, plus the new S1-fixture regression);
- `t8-legacy-freeze` 2 / 2;
- `t8-status` 16 / 16;
- `t8-damage` 13 / 13;
- `t8-rotation` **10 / 10**.

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

## What S2 needed (written at S1; done in S2)

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

## Findings and contradictions from S2–S4

1. **D4 against spec §10.** §10 counts every recipient normal turn. D4 says the remaining duration is preserved across the protected
   turn. The preserving reading (the protected turn holds Stunned) was implemented and flagged (see the D4 section). With it, each
   Stunned unit costs exactly one skipped turn, the same unit B18 uses in football.
2. **D3 against WIN-01-C (S4 finding, resolved by rule 2 on 2026-11-09).** The contract was silent on the P8 penalty and acts at the
   team's normal action. The reconciled ruling settles both, and Feather Relay is built (see the D3 section). Only its "voluntary"
   status stays open.
3. **Shielded units across modes.** The football Guiding Halo strength is 15 (a percentage of max Clash HP, LIG-03-F). A Clash shield's
   strength is its pool in HP (D11: "compared by original strength"). The carry converts between the two (`shield-strength-units`).
   Neither source says this explicitly.
4. **Silent points, labelled provisional:**
   - whether an empty pool ends Shielded (STA-09);
   - whether type, guards or the shield apply to the Afflicted tick (STA-05);
   - the Afflicted tick size: no Clash producer exists, and D10 is silent.
5. **P8 "status-application chances".** No Clash application chance exists yet (every chance belongs to a contract). The factor is
   exposed to hooks, and each contract must apply it (S6–S11).
6. **The legacy AI read hidden information** (the opposing active's ATK). D2 requires the approved information restrictions, so the
   adapted policy uses the observed hit instead (`ai-visible-information`).
7. **The plan's S0 row listed the ability-kind table.** It is still not built: D16 is open and requires owner review before the first
   ability batch. No S6+ work was started.
8. **Performance.** The legacy 10,000-battle perf case failed once (6,360 ms) while other sessions held the 2-CPU container at a load
   average of about 6. It passed on the rerun, and no legacy file changed. On the same loaded machine, t8 3v3 timing with no log and the
   AI default was 1,642 / 991 ms (first / second pass); with policies `none` it was 2,138 / 1,264 ms. The load makes these noisy;
   S3 measured 1,133 / 641 ms when the machine was quieter.

## What S5 needed (written at S4; done in S5–S11)

- **The registry** (`src/clash/t8/registry.js`). It must map each family's hooks onto the hook points that now exist:
  - turn and selection: `initiative`, `chooseAction`, `turnStart`, `endOfTurn`;
  - the strike: `launch`, `intercept`, `missCheck`, `rawModifiers`, `lethalRedirect`, `rawSplit`, `mitigate`, `preKO`;
  - after the strike: `attached`, `reaction`, `afterWholeHit`, `followUp`;
  - statuses: `statusIncoming`, `statusApplied`;
  - rotation and entry: `rotationLock`, `rotationDelay`, `pursuit`, `cashOut`, `onEntry`, `arrival`;
  - exchange boundaries: `roundStart`, `rotationPhase`, `endOfExchange`.

  Contracts need RNG access, which probes deliberately lack. The registry should get a counted draw API that logs each roll.
- **Hook descriptors exist** for `strike`, `status`, `heal`, `shield` and `forcedRotation`, and any hook can report `unmet`. S5 adds
  delayed impacts, constructs, links, heal schedules, revive, HP transfer and the ledgers.
- **Before S6:** the ability-kind table for owner review (D16), and the owner's answers on D3, D6, D8, D13 and D14.
