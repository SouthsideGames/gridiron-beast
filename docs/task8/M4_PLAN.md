# M4 plan: Beast Clash on the Task 8 model, the 72 Clash abilities and the runtime-backed Clash reviewer

Status: plan, 2026-11-08, branch `task8-implementation` at 94bef85 (read-only survey).

**Sources.** Every contract comes from the generated Dex: `src/data/beast-dex.generated.js`, through `src/data/beast-dex.js`, with 72 abilities where `mode === 'clash'`, eight sections each and the approved overrides applied. The shared rules come from:
- SPECIFICATION_BASELINE.md §1, §6, §8–§10, §12, §13, §15, §16 and §20–§24;
- Appendix B (STA-01..12);
- APPROVAL_REGISTER.md;
- the P6 Clash list in DECISION_PACKET_FINAL.md, as corrected by REMAINING_DECISIONS.md §B3 and RULINGS_2026-11-07b.md.

Nothing here adds a rule. Where the sources are silent or contradict each other, the point is listed in §5 as an owner decision with a recommended default.

---

## 1. What the existing engine is

`src/clash/engine.js` (`simulateClash`) is a pure, seeded "exchange" engine. Since the Phase 1 inventory (docs/task8/inventory/C-clash.md) it has changed in only three ways:
- the M1 boot fix: Basics get `BASIC_MOVES` "Strike" in `src/clash/stats.js`;
- Nature is gated to the historical ruleset;
- M2 routes rewards through the ledger (`src/franchise/clash-link.js` `applyBattleEffects`).

The inventory's description is therefore still accurate:
- **Line order.** The front monster is the first living one in `line`. Reserves act through `backRow()` (engine.js:245).
- **Exchange loop.** Each exchange runs: voluntary swaps at the start (engine.js:309–324), then condition ticks on both fronts, then the back row, then initiative, then the two acts, then replacements.
- **Conditions.** Four legacy conditions (`conditions.js`), plus a free-stacking numeric shield pool.
- **Moves.** Hand-coded move branches (`handlers.js`, `act()`), driven by the legacy table `src/data/clash-moves.js`.
- **Archetype.** Read from that legacy move row (`stats.js` `archetypeOf`). 11 families disagree with the Dex.
- **Franchise battles.** These never rotate (`FRANCHISE_POLICIES = {a:'none', b:'none'}`, clash-link.js). Manual-decision plumbing exists: the `manual` policy, `pendingDecision`, `pregameDecide` and `overtimeDecide`.

**M2/M3 pieces M4 should reuse rather than rebuild:**
- `src/sim/t8/status.js`: the pure shared-status gate. It covers `tryApply`, `endOfUnit`, `transfer` and `onKnockout`, has a `clash` flag per status, and imports nothing.
- `src/sim/t8/status-runtime.js` `carryInto` / `carryOut`. These exist but are never called.
- `src/data/approved-values.js`:
  - `stokeTheFlamePct`;
  - `shadowPounceDodgePct`;
  - `mindGameAfterimagePct`;
  - `rotationEntryPenalty`;
  - `ROTATION_CADENCE_EXCHANGES`.
- `src/franchise/t8/mastery.js`: the passive cap scopes `passiveScope`, with standalone Clash separate and opening/OT shared with the game.
- The M3 registry pattern (`src/sim/abilities/registry.js`) and the reviewer pattern (`review.js`, `review-scenarios.js`, `src/ui/screens/ability-reviewer.js`).

**Two defects found in today's football code that M4 must fix:**
1. `src/sim/rules.js:828` `finish()` calls `T8S.atGameEnd(state)` before the tie check at rules.js:855 (`needsTiebreak`). Every status is therefore cleared before the deciding overtime Clash. Spec §10 says statuses are "preserved through ... overtime; actual complete football-game end clears", and the deciding Clash is part of the game.
2. The opening Clash's statuses are never carried into football. `carryInto` is unused.

**One latent M3 issue to check, not to fix silently.** `src/franchise/roster.js:71` passes `m.dev.mastery.football`, which is a credit count (`t8/mastery.js`), as the contract's `mastery`. `byMastery()` clamps it as a tier index, so 5 credits would read as Mastered. It is inert while M5 awards nothing. The Clash snapshot must pass `tierIndex(credits)`. I recommend fixing the football input in the same change, with a test.

---

## 2. M4 requirements: citations and current state

| # | Requirement | Authority | Existing engine |
|---|---|---|---|
| R1 | **One active fighter per side; reserves never act except through explicit reserve abilities** (Feather Relay, Second Wind, Eclipse Call, Emergency Cover, Shared Burden owner, Last Root, commanded reserves) | §1 (one active fighter; "do not interpret 3v3 as three active"); R1 item 26; §20 `clash-rotation` ("ordinary bench attacks are removed") | **Partly.** One striking front exists, but `backRow()` (engine.js:245) lets Supports heal, Disruptors hex/force swaps and `anywhere` moves fire from any slot. Must be removed |
| R2 | **Normal-turn clock.** Durations count recipient normal turns (Stunned skips included). Cooldowns count owner normal turns. Reserve time, reactions and counters do not tick. The application turn is excluded. Afflicted ticks at the end of the recipient's turn, before the decrement | §9 (per-ability scopes), §10, Appendix B STA-05 | **Not at all.** Ticks happen at exchange start, on fronts only (engine.js:325–331, `conditions.js tickCondition`). `status.js endOfUnit` exists for this but is unwired |
| R3 | **Shared status slot in Clash.** Twelve identities (ten valid in Clash), episodes, the 3-application cap, KO clear, cleanse only harmful, uncleansable Faultline, Mountain Shelter override, Shielded pool payload (original pool, remaining fraction, save flag), tie order sourceID then abilityID | §9 (tie order), §10, Appendix B | **Not at all.** There are four legacy conditions with severity/immunity rules (`conditions.js`, `values.conditions`) and an additive shield (`handlers.js grantShield`). A KO does not clear the condition (engine.js:382 `lineOut`). The gate exists in `src/sim/t8/status.js` |
| R4 | **Voluntary rotation (P8).** It happens after both normal turns and before delayed impacts, at most once per side per 4 exchanges, and the entrant acts next exchange. On its first normal turn after a voluntary rotation, its damage multipliers, heals, shields and status chances are ×0.5. A Stunned skip spends the penalty. KO replacements and forced rotations have no penalty. Nonnumeric effects stay usable. The resolution order is: Cinder Clamp delay, Riptide Pursuit, Shell Harvest cash-out, departure, entry effects, then Cold Welcome/Downdraft | §20; P8 (N7b, confirmed N7c); P6 step 4; `clash-rotation` rule | **Partly.** Swaps happen at the start of the exchange with a same-exchange `swapCost:'half'` (engine.js:161–167). The 4-exchange cadence exists (`ex − lastVoluntary ≥ 4`). Franchise play uses `none`. `rotationEntryPenalty` exists, unwired |
| R5 | **Forced rotation** (Riptide Charge, Downdraft). The existing side-wide pacing and just-entered protection are kept | WAT-05-C and WIN-03-C contracts ("preserve unless owner changes") | **Partly.** `forcedSwap` (engine.js:134) has `forcedEvery: 3` and the just-arrived refusal. Its kinds are legacy |
| R6 | **Explicit miss effects only (P10, N7a).** There is no base evasion. The sources are Heat Mirage decoy, Snowbank Shot's 80% launch accuracy, Shadow Pounce's 15/20% dodge while the counter is unused, and Mind Game's 15% afterimage while no trick is stored. Each is one roll per whole attack, and undodgeable attacks bypass them without a roll | §20; `ordinary-attacks-connect`; P10; N7c confirmation | **Partly.** No evasion stat exists, which is correct. Misses come only from legacy `dodge`/`veil`/`illusion` flags (`handlers.js hit`), which must go |
| R7 | **Event order (P6, corrected by B3).** Round start (reserve windows), initiative (interrupts, then priority, then speed, then seeded tie), each turn (turn start, Stunned check, choose, launch, Stone Divide, explicit misses, damage 8a–8f, attached, reactions, after-hit, follow-ups, KOs, end of turn), rotation phase, end-of-exchange delayed impacts, end check | DECISION_PACKET_FINAL §P6 "Beast Clash exchange"; REMAINING_DECISIONS §B3 (step 8, immediate-KO rules 1–6) | **Not at all.** The current order is swaps, ticks, back row, initiative, acts (engine.js header and loop) |
| R8 | **Immediate KO (B3).** At 0 HP on any path the monster is out at once and its status clears. Its pending reactions, constructs, remaining hits and later turn are cancelled. Only the verified post-KO exceptions survive: Falling Star, Faultline, the Molten Brand lethal eruption, the current Shared Burden split, Mountain Shelter, Astral Strike continuation, the Cinder Clamp release, and Second Spring. The replacement enters right after the current hit resolves. A side with nobody left loses after simultaneous KOs settle; a double KO goes to the seeded coin | §21 B3; rule `clash-immediate-ko`; RULINGS_2026-11-07b "post-KO exceptions" tables | **Partly.** `knockout()` (engine.js:104) fires inside `afterHit`. Replacement waits for fixed `replace()` points (engine.js:363), except for the reflected-KO fix. The status is not cleared. The double-KO coin exists (`ended()`) |
| R9 | **Damage pipeline.** Raw damage once (attacker power and outgoing modifiers), Emergency Cover lethality prediction, Shared Burden raw split (source share floored), each recipient's own type, Guarded and shield, Last Root pre-KO hook on every path, then HP. A blocked status never cancels the damage | §9 (Shared Burden), §10, B3 step 8 | **Not at all** in this shape (`handlers.js hit` order: dodge, spread, modifiers, round, shield, HP) |
| R10 | **Primitives.** Delayed slot-marked impacts with frozen targets and the pre-KO strength snapshot; constructs (Twin Thunder); revive (Second Spring); HP transfer (Mind Mend floor rules, Root Communion conserving apportionment); damage split (Shared Burden); status transfer and steal (Lightning Rod, Eclipse Theft); commanded reserve attacks (Canopy Assist, Astral Strike); reserve windows; heal schedules (Dawn Song); cooldown, charge and once-ledgers; cooldown manipulation (Circuit Breaker, Fresh Start); signature restriction (Eye of the Storm); countdown freeze (Deep Winter) | §9 ("store charge, once-use ledgers, delayed events, readiness and cooldowns in authoritative state; rendering/replay cannot tick them"); the individual contracts | **Not at all** (inventory C §3, "Primitives that do not exist") |
| R11 | **The 72 Clash abilities**, with form and mastery values, contract execution boundaries and mastery execution events (one per valid execution; passive/aura once per cap scope). Legacy Clash moves are replaced, never stacked | §1, §6 Mastery, §9; BUILD_PLAN ("Legacy Clash moves are replaced the same way at M4"); P4 | **Not at all.** 0 match, 24 partial, 48 different mechanics, six of them with the same name. Archetype comes from the legacy row (`stats.js archetypeOf`); 11 differ from the Dex. `validate.js` ARCH_COUNTS and bands reject the Dex design |
| R12 | **Archetype perks.** Kept for every monster, including Basics. Tank guard is active-only (no reserve guard on transferred or redirected damage). Contracts exclude "ordinary-only" offensive perks from specials | R1 items 28 and 37; APPROVED_RULES.md (Basics keep perks); §9 (Shared Burden "active-only Tank guard"); contracts (e.g. ELE-03-C, EAR-04-C) | **Partly.** The perks exist in `values.archetypes` (Tank guard 0.88 front-only and bruise; Striker shieldBreak 2; Disruptor pierce). No "ordinary vs special" distinction exists. See decision D5 |
| R13 | **Basic Clash action.** Ordinary attacks plus archetype perks; shared type moves are future work | R1 items 37–38; §20 `ai-basic-lineup` | **Mostly.** `BASIC_MOVES` in `stats.js` uses the Dex `clashArchetype`. It must be carried into the new engine with a "no contract" path |
| R14 | **Opening/overtime carryover.** Supported statuses carry 1:1 both ways, keeping remaining duration and episode history; unsupported ones clear. This includes Stunned 1:1 (B18), Shielded pool fraction and fumble save, and Deep Winter freeze counters as frozen plays. Exhaustion halving applies in the deciding Clash. Standalone boundaries must not clear same-game carry. Opening and OT share one passive mastery cap with their game | §10; §12 ("including overtime/deciding Clash"); §21 B18; §6 Mastery; ICE-06-C, MET-05-C, LIG-03-F | **Not at all.** Every battle builds fresh (`stats.js buildCombatant`). `carryInto`/`carryOut` are unused. The rules.js:828 defect clears statuses before the OT Clash. Exhaustion is not read by Clash |
| R15 | **Exchange-boundary saves (B11).** Preserve committed decisions, RNG state and reward idempotency; resume identically | §15; §21 B11; rule `clash-save`; R2 #23 ("engine stops at the first undecided rotation") | **Partly.** Battles are rebuilt from seed, lineup snapshots and decisions (`runBattle`, `week.pregame`/`overtime`/`encounter` records). The ledger is idempotent (`applyActivity`). There is no stop-at-boundary resume and no RNG checkpoint |
| R16 | **Determinism.** Same seed and inputs give identical outcomes regardless of Watch/Skip, log mode, 30/60 FPS, quality or replay. Seed replay passes 100/100 | §14, §15, §16 | **Strong already:** one mulberry32 stream, a log-independent draw order, `logHash` and golden fixtures. Every golden changes |
| R17 | **P9 diagnostics.** Clash delayed impacts 2 per side, Twin Thunder constructs 2 per battle, Dawn Song schedules up to lineup size per side. Diagnostics only: they never refuse, delay or delete an effect, they log, and they fail the suite | §21 B4; rule `cap-diagnostics`; P9_VERIFIED_LIMITS.md §6 | **Not at all** |
| R18 | **Rewards.** 25 XP and 25% training to every selected member; each opening, standalone and OT Clash separately; Watch = Skip; labs, reviewers, previews and replays award nothing | §6 | **Done in M2** (clash-link.js `applyBattleEffects` via `clashAward`). Grade adjustment stays 0 until M5 |
| R19 | **Rounding.** Round-half-up with no minimum damage; the §9 floor rules (Shared Burden source share, Mind Mend donation and gain, Root Communion apportionment); Dragon Pounce cost rounded up | R1 items 17–18 (approved) with Phase 1 audit #18 | **Partly.** Everything is `Math.round` today; the floors are absent |
| R20 | **Clash reviewer.** All 72 abilities, every form and mastery tier, on the actual engine and rendering. Active/reserve arrangements, HP, shields, statuses, delayed effects, support/commanded interactions. Valid, invalid/blocked, multi-target, depletion, cleanup, source-KO and rotation scenarios. Replay/reset. No progression writes | §13; §16 "Reviewer completeness"; rule `art-and-reviewers`; N7f "ability deliverables" | **Not at all.** Only the Clash Lab replay exists (`src/ui/screens/clash-lab.js`) |
| R21 | **Contract tests.** Contract-derived cases in eight categories; duplicates rejected; shortfalls reported, not padded; each probability's tolerance and N frozen first (N = 3.29²·p(1−p)/h²); guaranteed behaviour exact | §16; §21 B12; R2 #25 | None for the new abilities |
| R22 | **Continuity gate.** 100/100 scenarios across statuses, durations, halftime, OT and game end | §16 | None |
| R23 | **Performance.** The existing test (10,000 3v3 battles with no log in under 5 s; 2.3–2.6 s at M3) must keep passing. The §14 "≤10% CPU" gate is M6 | TESTING_POLICY.md; tests/clash/engine.test.js "performance:" | Passing on the legacy engine |

---

## 3. Architecture (built first, then the abilities)

1. **Freeze the legacy engine.**
   - Move today's `engine.js`, `handlers.js`, `conditions.js`, `ai.js`, the move tables and the patch machinery under `src/clash/legacy/`, unchanged.
   - It keeps the `v1.0.0` and `1.1.0` rulesets, so historical goldens, Gate tools and (per D19) pre-M4 records replay exactly.
   - The new engine is `src/clash/t8/` and becomes `ruleset: 't8'`.
   - `src/clash/index.js` exports both; `clash-link.js` stays the only franchise importer.
2. **Boundary update** (technical).
   - `tests/clash/boundary.test.js` allows `src/clash` to import only `src/core/rng.js`, `src/data/`, and itself.
   - The new engine needs the pure gate `src/sim/t8/status.js`, which imports nothing.
   - Whitelist that single file (or move it to a shared folder and re-export it from `src/sim/t8`).
   - The purity test is untouched: no Math.random, Date, DOM or storage.
3. **Combatant build.**
   - `buildCombatant` keeps the approved HP/ATK/SPD formula. Economy recalibration #30 is M6.
   - The archetype now comes from the Dex family (`beast-dex.js archetypeOf`).
   - Inputs gain:
     - `form`;
     - Clash mastery tier (`tierIndex`);
     - `exhausted`, which halves all 12 effective attributes once (§12);
     - the incoming status slot;
     - incoming ability carry (Deep Winter freeze counters).
4. **Battle state** (authoritative and serialisable).
   - Per side: line order, active index, lastVoluntary, lastForced, rotation request and lock.
   - Per combatant:
     - hp, maxHp, status slot (the shared gate's episode object);
     - `turns` (own normal turns performed or skipped);
     - entry reason, first-active-entry flag;
     - P8 penalty pending;
     - `consecutiveSkips`;
     - KO order index;
     - ability state `{charges, cooldown, once, armed, memory, …}`;
     - provenance ledgers for M5 attribution.
   - Battle-level:
     - delayed impacts;
     - constructs;
     - links (Shared Burden);
     - heal schedules;
     - signature restrictions;
     - the diagnostic counters;
     - `rngDraws` (the draw count, for the B11 checkpoint).
5. **Clash contract registry** (`src/clash/t8/registry.js`).
   - One module per family in `src/clash/abilities/<family>.js`, mirroring M3. It holds `{family, abilityId, kind-metadata, initBattle(form, tier), hooks, review}`.
   - The engine calls hooks by name and never names an ability.
   - Hook names:
     - `roundStart` (reserve), `preInitiative` (reserve), `initiativeTier`;
     - `turnStart`, `chooseAction` (normal-action replacement or team support action);
     - `launch`, `intercept` (Stone Divide), `missCheck` (defender explicit-miss sources), `lethalRedirect` (Emergency Cover);
     - `rawSplit` (Shared Burden), `mitigate` (Guarded payloads, the Tempered Guard cap, Fortress storage), `preKO` (Last Root);
     - `attached`, `reaction`, `afterWholeHit`, `followUp`, `allMissed`;
     - `statusIncoming` (Foresight, before the slot check), `statusApplied` (Shell Renewal), `healed` (Rubble Reprisal), `stunnedSkip` (Unbroken Charge);
     - `onKO`, `onEntry(reason)`, `onDeparture(reason)`, `rotationRequest`;
     - `endOfTurn`, `endOfExchange`.
   - Each module also declares its mastery execution boundary; passive ones get one credit per cap scope.
   - Executions are recorded. Awards are M5.
6. **Ability-kind metadata table** (`src/clash/t8/ability-kinds.js`).
   - One row per Clash ability:
     - action kind (normal-action replacement, conditional enhanced normal attack, passive, reaction, entry, reserve window, team action);
     - repeatable vs once-per-Clash;
     - cooldown unit;
     - which strikes it produces, tagged ordinary, special, reaction, counter, commanded, follow-up, delayed, DOT or transfer;
     - undodgeable.
   - It is generated from the contract text by hand once, tested against the Dex, and reviewed by the owner (D16).
   - Stone Divide, Eye of the Storm, Circuit Breaker, Fresh Start, the recursion guard and the "ordinary-only perk" exclusions all read it. Nothing guesses from animation (EAR-05-C).
7. **Event log.**
   - Typed events carry who, ability, attack-kind tag, provenance (source and abilityID) and before/after HP, shield and slot.
   - They feed the arena, the reviewer, logHash, and M5 grading attribution (§8 "store attribution until use, expiry or battle end").
   - `log:'none'` must not change draws.
8. **Decisions interface.**
   - Rotation requests and the opponent-chosen replacement (Riptide Charge) come from a recorded `decisions[side][ex]`, or from a named deterministic policy.
   - With `interactive: true` the engine stops at the first undecided point and returns a pending marker (R2 #23). Otherwise it uses the policy (D1, D2).
9. **Checkpoint/resume (B11).**
   - `simulateClash({…, stopAt: {exchange}})` and `resumeClash(record)`.
   - The record is seed, snapshots, decisions and the completed exchange index plus `rngDraws` and state hash.
   - Resume replays from the seed and verifies that hash. RNG state is reproduced, not stored as an opaque blob, so saves stay small and the check catches drift.
   - Rewards stay one ledger step at the end.

---

## 4. Build sequence

Each step below is on its own branch off `task8-implementation`, runs targeted tests only, and leaves the franchise on the legacy engine until step S12. Sizes are rough: S under 300 LOC (about half a day); M 300–800 (1–2 days); L 800–1,500 (2–4 days); XL over 1,500.

| Step | Contents | Targeted tests | Size |
|---|---|---|---|
| **S0** Prep | Freeze the legacy engine into `src/clash/legacy/` (pure move, no behaviour change); boundary whitelist; `ability-kinds.js` table; frozen probability tolerance table (B12) for every Clash probability (Heat Mirage 30–45%, Shadow Pounce 15/20%, Mind Game 15%, Snowbank 80%, Eclipse Call 60–90% and its P8-halved variants, Confused 25%, ×0.5 entry penalty on chances) | `tests/clash/*` unchanged and green (legacy goldens byte-identical); boundary; `task8-clash-kinds.test.js` (72 rows, each matching its Dex id and clauses) | M |
| **S1** Core model and normal-turn clock | New `simulateClash` for `ruleset:'t8'`: one active per side; reserves inert; P6 exchange skeleton (round start, initiative tiers, turns in initiative order, rotation phase stub, end-of-exchange, end check); per-combatant normal-turn counters; KO replacement by line order; Basic/no-contract action = ordinary attack plus archetype perks; Dex archetypes; exchange cap 30, HP-share tiebreak, sudden-death ramp and C6 kept with their approved values (scope per D8); round-half-up | `task8-clash-core.test.js`: reserves never act; turn counting; Basic action; archetype from the Dex for all 192; no draw change with `log:'none'`; new `golden-t8.json` (20 seeds); perf test pointed at t8 | L |
| **S2** Statuses in Clash | Wire `status.js` in mode `clash`: gate, episodes, cap, tie order, application-turn exclusion, `endOfUnit` on recipient normal turns (Stunned skips count), reserve pause, KO clear. Clash effects:<br>• Stunned skip with the consecutive-turn safeguard (D4);<br>• Slowed/Quickened as initiative speed % (D10);<br>• Weakened/Empowered outgoing %;<br>• Guarded incoming %;<br>• Shielded pool payload (original, remaining, fraction, saveSpent) absorbing before HP;<br>• Healing Reduced %;<br>• Confused 25% redirect at launch (self primary; delayed attacks roll at launch);<br>• Afflicted end-of-turn tick before the decrement (payload-defined amount; no Clash producer exists).<br>Harmful-only cleanse with an uncleansable flag; explicit replacement API (Mountain Shelter); freeze counter field (Deep Winter). Retire legacy conditions, severity, immunity windows, `healAfflicted`, Chill ×0.7, Daze ×0.75 and the free shield pool | `task8-clash-status.test.js`: each STA rule in Clash; equal/stronger/weaker/cap; KO clear; reserve pause; Afflicted timing; Confused redirect frozen tolerance; Stunned skip, safeguard and duration | M |
| **S3** Damage pipeline and immediate KO | B3 8a–8f with hook points: raw once; outgoing modifiers; attack-kind tags; launch (costs, once-uses, target lock, Confused, launch accuracy); intercept; explicit-miss step; lethality redirect; raw split; per-recipient mitigation (type, active-only Tank guard, Guarded, shield with ordinary-only Striker break per D5); pre-KO; HP. Immediate KO with cancellation of pending reactions, hits, turns and constructs; the post-KO exception whitelist; replacement after the current hit; simultaneous-KO settlement and double-KO coin; reaction recursion guard (no chains) | `task8-clash-damage.test.js`: order fixtures for every step; each KO-cancellation clause; each post-KO exception (with stub contracts); rounding fixtures (101 at 30% gives 30 and 71) | L |
| **S4** Rotation (P8) and forced rotation | Rotation phase after both turns; cadence 4 (legacy `ex − lastVoluntary ≥ 4` semantics); request from decisions or policy; per-side resolution order (Cinder Clamp delay, Riptide Pursuit, Shell Harvest, departure, entry effects, Cold Welcome/Downdraft); entry reasons (opening, voluntary, forced, KO, revive return); P8 ×0.5 on the first normal turn (halve multipliers, heals, shields and status chances; a Stunned skip consumes it; none for KO or forced); forced pacing 3 and just-entered protection; `interactive` pending stop; AI rotation policy (D2) | `task8-clash-rotation.test.js`: timing; entrant acts next exchange; penalty scope and Stunned consumption; cadence; KO/forced no penalty; pending stop; determinism with decisions | M |
| **S5** Primitives and pilots | Delayed impacts, constructs, links, heal schedules, revive, HP transfer and apportionment, status transfer/steal, commanded reserve attacks, reserve windows, team support action, cooldown/charge/once ledgers with the query/mutate API, signature restriction, P9 diagnostics. Built together with **two pilot contracts**: Falling Star (delayed, slot-marked, frozen targets, pre-KO strength) and Shared Burden (reserve link, raw split, owner KO). Static gate: the t8 engine never reads `CLASH_MOVES`; each family registers once | `task8-clash-primitives.test.js` (Root Communion apportionment fixtures pinned per §9; Mind Mend floors); `task8-clash-pilots.test.js` (contract cases for both); `task8-clash-gate.test.js` | L |
| **S6** Batch A: attack modifiers and enhanced attacks (16) | Night Swoop, Predator Rhythm, Ambush, Radiant Pursuit, Daybreak Lance, Dragon Pounce, Dragon Roar, Sovereign Balance, Gear Shot, Iron Bite, Phase Strike, Gust Hop, Refraction, Echo Strike, Bank Shot, Spore Detonation | `task8-clash-abilities-a.test.js`: eight categories per ability, every form × tier value once, shortfalls listed | L |
| **S7** Batch B: protection and self/team statuses (13) | Shell Renewal, Shell Harvest, Mountain Shelter, Snowbank Shot, Snowdrift Shelter, Glacier Wall, Tailwind Pact, Forge Swipe, Tempered Guard, Shield Wall, Fortress, Mirage Veil, Dragonhide | `…-b.test.js` (episode and replacement rules; Glacier Wall rebuild after the whole hit; the Fortress natural-expiry reason) | L |
| **S8** Batch C: healing and support (11) | Second Tide, Second Spring, Root Communion, Lightning Rod, Fresh Start, Glow Mend, Dawn Song, Clear Light, Mind Mend, Coil Renewal, Wing Shelter | `…-c.test.js` | M–L |
| **S9** Batch D: reactions, counters, misses, survival (13) | Stoke the Flame, Molten Brand, Heat Mirage, Shadow Pounce, Mind Game, Arc Rebound, Rubble Reprisal, Victory Surge, Twin Thunder, Stone Divide, Unbroken Charge, Last Root, Emergency Cover | `…-d.test.js` (frozen-tolerance probability runs for the P10 dodges and Heat Mirage; no-chain guard) | L |
| **S10** Batch E: rotation and lineup (8, Shared Burden done at S5) | Cinder Clamp, Riptide Charge, Riptide Pursuit, Cold Welcome, Downdraft, Feather Relay, Second Wind, Canopy Assist | `…-e.test.js` | M–L |
| **S11** Batch F and G: disruption, control and the second delayed attack (9) | Wash Away, Circuit Breaker, Deep Winter, Eye of the Storm, Eclipse Call, Eclipse Theft, Foresight, Astral Strike, Faultline. Then the **cross-batch interaction suite**: every interaction a contract names (for example Phase Strike vs Last Root, Stone Divide vs Twin Thunder, Victory Surge and Arc Rebound, Eclipse Theft riders, Foresight vs Eclipse Call, Mountain Shelter vs Faultline, Emergency Cover vs Shared Burden, Shell Harvest vs Riptide Pursuit) | `…-f.test.js`, `task8-clash-interactions.test.js` | L |
| **S12** Franchise switch and carryover | `clash-link.js` builds t8 battles.<br>**Snapshot:** gains form, Clash tier, exhaustion, the incoming slot and freeze.<br>**Opening Clash:** at battle end `carryOut` the slots, then `carryInto` the game state at kickoff.<br>**Overtime (rules.js):** fix `finish()` so a `needsTiebreak` game keeps its status and stamina book for the OT Clash; statuses clear after the tiebreak is applied.<br>**Football side:** the Deep Winter freeze in the football `endOfUnit`; Shielded fraction ↔ fumble save; Stunned 1:1 (B18).<br>**League games:** headless AI-vs-AI pregame/OT do the same.<br>**Mastery executions:** recorded per scope (opening and OT with the game, standalone alone).<br>**Records:** `ruleset:'t8'` on new records; legacy records per D19 | `franchise-clash.test.js` updated; `task8-clash-continuity.test.js` (100 scenarios: each supported status both ways, durations, halftime, OT, game end, KO, standalone isolation); `final-whistle-check` | L |
| **S13** Exchange-boundary saves (B11) | Interactive stop at the rotation phase and at Riptide Charge choices; `week.*.decisions` and `boundary`; resume verification (draw count and state hash); save/reload at every boundary gives the identical continuation; reward ledger once | `task8-clash-save.test.js`: save/resume at each boundary of 100 seeded battles; the legacy-record path | M |
| **S14** Battle screen and Lab (functional) | Battle screen:<br>• a rotation prompt in Watch at legal rotation phases (D1);<br>• the replacement choice;<br>• updated Help text (the current text says Supports act from the back);<br>• functional cues for the new events (badges, cooldown/charge indicator, slot marker, guards, link, decoy).<br>Choreographer and arena are extended for the new kinds. The Clash Lab Lineup/Replay views are rebased on t8; Batch and Gate views stay on the legacy ruleset | `tests/clash/presentation.test.js` extended; boot browser check | M |
| **S15** Clash reviewer | Engine side `src/clash/t8/review.js` plus a scenario table `review-scenarios.js`, one entry per family. Staged inputs are validated and reviewer-only: lineups, active/reserve arrangement, HP, slots, ability state, a decision script and a seed. Scenarios: valid, invalid/blocked, multi-target, depletion, cleanup, source KO and rotation, each on the real engine. UI: Developer → Clash Ability Reviewer, listing all 72 × forms × 4 tiers, ▶ scenario, replay/reset, inspect (state before and after, event list), saved owner verdicts as in M3. No XP, mastery, collection or save writes | `task8-clash-review.test.js` (every family has scenarios; each runs and executes on the engine; the franchise snapshot is unchanged before and after) | L |
| **S16** M4 gate | Per-ability contract suites; 100 identical-seed comparisons (Watch = Skip, log on/off, save/resume); continuity 100/100; P9 diagnostics zero overflow; perf (10,000 3v3 in under 5 s on a quiet machine); reviewer browser check (all 72 listed, every scenario runs, 0 page errors, no progression writes); full suite once; M4 report listing every retired fixture and the ruling that retires it (legacy goldens move to `legacy/`; Gate B tests stay on the legacy ruleset) | — | M (report and runs) |

**Order notes.**
- S1–S4 are sequential.
- S5 needs S3 and S4.
- S6–S11 can run in parallel branches once S5 has landed, because each family is its own module. S11's Eye of the Storm, Circuit Breaker, Fresh Start and Stone Divide tests need representative abilities from earlier batches present.
- S12 and S13 need all 72 registered.
- S14 and S15 can start after S5 and finish after S11.

---

## 5. Gaps, ambiguities and contradictions

### 5a. Already ruled (no owner action; recorded so nobody reopens them)
- **Event order** (P6 with the B3 correction).
- **Immediate KO and post-KO exceptions** (B3 table).
- **Rotation timing, cadence and penalty scope, including the Stunned skip** (P8, N7c).
- **No universal evasion; explicit miss sources only; one roll per whole attack** (N7a, P10, N7c).
- **Rounding** (R1 18): round-half-up default, §9 floors, Dragon Pounce cost rounded up.
- **Clash attribution arithmetic** (R1 20) is M5. M4 only records provenance.
- **Mid-Clash save at exchange boundaries** (B11), with the engine stopping at the first undecided rotation (R2 #23).
- **Basics** use the ordinary attack plus archetype perks (R1 37).
- **Archetypes** are the Dex's (14/15/15/13/15); the legacy ARCH_COUNTS and bands retire.
- **Utilities and evasion.** Wash Away, Eclipse Theft, Downdraft and Feather Relay are not "attacks", so no explicit-miss source applies to them. Each miss source's own wording limits it to direct, normal or delayed attacks (N7a).
- **Cleanse and status rules.** Legacy condition severity and immunity windows are replaced by the §10 episode rules. Legacy Chill/Daze/Burn magnitudes are replaced by producer payloads (Appendix B, §10).
- **Clash drains no stamina.** §12 defines drain per football play only. Exhaustion does halve attributes in the deciding Clash (§12).
- **Emergency Cover vs Last Root** on the same hit: Cover is checked at 8b, before survival abilities are spent; Last Root at 8e (B3).
- **Faultline Healing Reduced** clears on entering football (STA-08 unsupported in football).
- **Legendary uniqueness** (B4 verification): it holds in franchise play; the Lab allows duplicates.

### 5b. True gaps needing the owner (each with a recommended default)

**D1. Player control of rotation in franchise battles.**
- *The conflict:*
  - GDD §26.0 (owner brief 2026-10-22): "one selection, one battle, no swap menus".
  - R1 item 26 ("rotation is necessary"), P8 and B11/R2 #23 ("each decision is recorded; the engine stops at the first undecided rotation") are later.
  - Riptide Charge (WAT-05-C) also needs "opposing team chooses living replacement ... recorded for player and deterministic AI".
- *Recommendation:*
  - In **Watch**, prompt the player at each legal rotation phase and at each Riptide Charge replacement. Offer "Stay", the reserves, and "Auto for the rest of this battle".
  - In **Skip**, staff auto-run and headless settlement, the player's side uses the same named AI policy as the opponent (D2).
  - Every choice is recorded as a decision, so replays and reloads are identical.
  - The same applies to encounters, pregame and overtime Clash.

**D2. AI rotation and replacement policy in M4.**
- *Recommendation:* adapt the existing `smart` policy (ai.js) to the new state: type edge, HP and harmful-status value. For an opponent-chosen replacement, pick the first living reserve in lineup order.
- Ability-aware tactics stay in M5 (spec §17 Phase 5). This keeps M4 deterministic without inventing tactics.

**D3. Feather Relay (WIN-01-C) classification.**
- *The gap:* it is a reserve-origin team action that rotates the active ally. The spec does not say whether it counts as a *voluntary* rotation for:
  - the 4-exchange cadence and rotation locks;
  - Cinder Clamp, Riptide Pursuit, Cold Welcome and Shell Harvest;
  - the P8 penalty.
- *Recommendation:*
  - It counts as voluntary for cadence, locks and all enemy/owner rotation triggers. Its text says "respect rotation locks and legal availability".
  - The entrant gets **no** P8 penalty: the team already gave up that turn's attack ("incoming receives no normal attack"), which is the action-cost form of entry.

**D4. Stunned "consecutive-normal-action safeguard"** (STA-01, ICE-06-C).
- *The gap:* the safeguard is referenced as "approved" but defined nowhere in Task 8. The only definition is legacy: "cannot lose two actions in a row" (engine.js:186).
- *Recommendation:*
  - Keep the legacy rule: a monster never skips two consecutive normal turns.
  - The safeguarded turn is still a recipient normal turn and counts down Stunned.
  - Only an actually skipped turn counts as "losing a normal action", which matters for Unbroken Charge and for the P8 penalty consumption.
- *Note:* no Clash ability applies Stunned. It can only arrive by football carryover (B18), so the rule matters mainly for robustness and the reviewer.

**D5. Ordinary-only archetype perks** (contract placeholder "G06" / "final shared reconciliation"; ELE-03-C, EAR-04-C, LIG-05-C, PSY-04-C, PSY-05-C).
- *The gap:* nothing says which perks are "ordinary-only offensive" or which actions count as "ordinary".
- *Recommendation:*
  - Striker shield-break ×2 and Disruptor pierce apply only to an **ordinary normal attack**: the plain attack, a Basic's attack, and contracts whose text keeps "normal attack identity" with no enhancement (Gear Shot, Mind Game's trick attack).
  - Every enhanced/special attack, reaction, counter, follow-up, commanded, delayed and assist strike is excluded.
  - Tank guard is defensive: it always applies while active, never in reserve. This is already ruled for Shared Burden and Emergency Cover.

**D6. Tank "bruise" perk vs Healing Reduced.**
- *The gap:* Appendix B STA-08 says Healing Reduced "consolidates Bruised". The Tank perk (hits make the target heal ×0.75 for 2 exchanges) is an archetype trait, and STA-12 says "permanent archetype traits remain traits, not extra statuses".
- *Options:*
  - (a) keep bruise as a non-status trait effect, on a recipient-normal-turn clock (2 turns);
  - (b) make it a Healing Reduced 25% application through the gate (it would occupy the slot on almost every Tank hit);
  - (c) retire it.
- *Recommendation:* (a). It preserves "archetype perks remain" (R1 28/37) without flooding the single slot.

**D7. The legacy Afflicted heal penalty** (`healAfflicted` ×0.7 on any conditioned target).
- *The gap:* STA-05 in Clash is HP damage only, and no rule keeps a heal penalty.
- *Recommendation:* retire it. (Listed separately from D6 because it is a different legacy effect.)

**D8. Sudden-death ramp, C6 stalemate rule and exchange cap under Task 8.**
- *Background:* these are approved values 1.1.0 that Task 8 never mentions. The ramp is tagged "provisional" in `values.js`.
- *The gap:* which paths they affect.
- *Recommendation:*
  - Keep all three.
  - The ramp multiplies every direct-damage computation at its 8a step: normal and special attacks, reactions, counters, follow-ups, commanded attacks, and delayed impacts at the impact exchange. It does not affect Afflicted ticks, HP costs or HP transfers.
  - C6 scales every heal and shield grant. It does not affect HP transfers (Mind Mend, Root Communion) or revival (Second Spring is "not ordinary healing").
  - At the cap the battle ends and pending delayed impacts are discarded; no extra exchange.

**D9. Stacking of the P8 ×0.5, C6 and ramp.**
- *Recommendation:* multiply them all and round once at the final integer conversion (R1 18).

**D10. Cross-mode magnitudes the contracts omit.**
- *Background:* the 1:1 transfer keeps duration and episode, but the effect size is not always stated.
- *Defaults:*
  - **Slowed** (Cold Welcome 15/20% initiative): in football, the same % maximum-speed reduction. In Clash, Slowed and Quickened multiply initiative speed by (1 ∓ pct).
  - **Confused** from Eclipse Call or Mind Game into football: a 20% effective-Awareness reduction. This is the only approved football Confused magnitude (Crossed Wires, Foresight F), and Eclipse Call says "the existing Confused football Awareness penalty".
  - **Confused** from football into Clash: the fixed 25% redirect.
  - **Afflicted** Clash tick: payload-defined only. No producer exists in either mode, so no default number is invented. Report it as inert.

**D11. Shielded strength comparison in Clash** ("compare original shield strength").
- *Recommendation:*
  - Strength is the original pool in whole HP. For Second Tide's surplus shield, that is the surplus HP.
  - A football-created Shielded (Guiding Halo) entering Clash becomes 15% of the recipient's max HP × its saved fraction (LIG-03-F).
  - A Clash pool entering football is one fumble save. On return the pool is not refilled (G09 in MET-05-C).

**D12. Statuses at the end of a standalone (Tuesday) Clash.**
- *The gap:* there is no destination, and §10 defines clearing only at KO and football-game end.
- *Recommendation:* clear everything at the end of a standalone battle. Nothing carries into Sunday.

**D13. Contradictions inside two contracts.**
- **Daybreak Lance** (LIG-06-C): Core says 160%; Progression says 145/160/175/190 by mastery.
- **Clear Light** (LIG-03-C): Core says heal 10%; Progression says 8/10/12/14.
- *Recommendation:* the Progression ladders govern. The Core value is the Practiced tier.

**D14. Dawn Song target under one active fighter** (P9 note A8).
- *The gap:* "active front ally ... self only if actually front". The caster is always the active fighter, so the only legal target is Solchirp itself.
- *Recommendation:* the target is the active Solchirp. Pulses run at the end of its next 2 owner normal turns and pause while it is in reserve. Confirm, because this makes Dawn Song a self-heal.

**D15. Emergency Cover with several eligible rescuers** (EAR-01-C: "require deterministic audit resolution"; duplicate commons are legal).
- *Recommendation:* the first eligible Pebblit in stable lineup order; one cover per hit.

**D16. The ability-kind metadata table.**
- *Why:* it is needed by Stone Divide ("extra strike"), Eye of the Storm ("ready, repeatable signature"), Circuit Breaker and Fresh Start ("running cooldown"), and the no-chain and ordinary-perk rules.
- *Recommendation:*
  - The owner approves the generated 72-row table (S0) before S6.
  - **Extra strike** = any damaging strike that is not the attacker's own normal-action attack (ordinary or special), and not delayed, DOT or transferred damage. That includes Twin Thunder bolts, Victory Surge, Arc Rebound, Riptide Pursuit, Stoke the Flame, Molten Brand eruptions, the Shadow Pounce counter, Rubble Reprisal, the Bank Shot ricochet, the Refraction secondary hit, the Canopy Assist strike and Astral commanded attacks.

**D17. Canopy Assist "highest CURRENT attack damage".**
- *Recommendation:* the reserve's expected raw normal-attack damage against the current opposing active: ATK × outgoing status modifier × type factor, no spread. Ties go to lineup order.

**D18. Second Spring "earliest knocked-out ally"** with simultaneous KOs (Falling Star splash).
- *Recommendation:* earliest by KO event sequence; within one hit's settlement, stable lineup order. The revived monster goes to the back of the reserve order.

**D19. Pre-M4 Clash records in schema-10 saves.**
- *Recommendation:*
  - Keep the frozen legacy engine. Finished records keep their stored summary and replay on the legacy ruleset named in the record.
  - An unresolved legacy record (`status:'battle'`, rewards not yet applied) is re-run on t8 from the same seed and lineups and tagged. The ledger prevents duplicate rewards.
  - The alternative is to finish unresolved legacy records on the legacy engine, at the cost of keeping it callable from franchise code.

### 5c. Minor readings (stated in the plan; owner may object)
- **Cadence semantics:** keep the legacy `ex − lastVoluntary ≥ 4`, counted from the executed rotation. A Cinder Clamp-delayed rotation counts when it executes.
- **KO replacement:** the next living monster in line order (GDD §26 order of entry).
- **Shield break:** Striker ×2 breaking and Iron Bite's multiplier follow their contracts. Iron Bite is a special, so it gets no Striker ×2.

---

## 6. Save compatibility and determinism

**Saves**
- **Schema stays 10. All new fields are additive with defaults**, so the preview's schema-10 saves keep opening. Same storage keys; cloud code untouched; the boundary test's "save schema unchanged" assertion keeps holding.
- **Clash records** (`week.encounter`, `week.pregame`, `week.overtime`) gain:
  - `ruleset:'t8'`;
  - extended snapshots (form, Clash tier, exhaustion, incoming slot and freeze);
  - `decisions` (the field exists);
  - `boundary` (last completed exchange), `drawCount`, `stateHash`;
  - `carryOut` (end slots).
- **Legacy records** follow D19.
- **The football game state** (`state.t8`) is unchanged in shape. It gains:
  - the slot `freeze` counter;
  - opening-Clash slots carried in at kickoff;
  - a deferred clear on `needsTiebreak` games.
  A game saved mid-play under M3 loads with an empty carry. A game saved at the tied final whistle under M3 has already lost its statuses (the rules.js:828 defect); it plays its OT Clash with empty slots and no error.
- **Rewards and mastery:**
  - rewards remain once per activityID and monsterID (ledger);
  - mastery executions recorded in M4 are counts only, with no award, so nothing needs migrating at M5;
  - labs, the reviewer and replays write nothing.
- **Career and timeline records** that store legacy `battleSummary` hashes are kept as text and never recomputed.

**Determinism**
- **One seeded stream per battle.** Draw order is fixed by event phase. Ties use event order, then sourceID, then abilityID, and a draw only where a rule names one (initiative coin, double-KO coin, explicit probabilities).
- **Presentation independence.** `log:'none'`, Watch/Skip, speed, 30/60 FPS and quality never change a draw. Ability state lives only in the engine state; rendering, replay and the reviewer never tick it (§9).
- **Gate:**
  - 100 identical-seed and identical-input comparisons;
  - Watch ≡ Skip;
  - save/resume at every boundary of 100 battles ≡ an uninterrupted run (state hash);
  - new `golden-t8.json` (20 seeds);
  - the legacy goldens still pass under `src/clash/legacy`.
- **Probabilities** use fixed seed lists with the B12 tolerances frozen in S0, before any run.
- **Reviewer scenarios** are fully staged and seeded, so each returns the same result on every run.

---

## 7. Out of scope for M4

- Art polish. Visuals stay functional: badges, indicators, markers and the approved cues on the existing arena.
- Settings that M6 owns: 60/30 FPS, effect quality, reduced flash, Apex accent. The reviewer uses the existing reduced-motion flag, as the M3 reviewer did.
- **M5:**
  - Clash §8 grading, including the R10 attribution ledger (M4 only emits provenance events);
  - awarding mastery (M4 records executions);
  - ability-aware Clash AI and lineup intelligence, and B16 knowledge rules;
  - the Clash grade adjustment (stays 0).
- **M6:**
  - the shared status badge, charge bar and battery presentation pass;
  - economy recalibration #30, including Clash HP/ATK normalisation (the formula stays as it is);
  - the CPU gate against a matched baseline;
  - physical-device frame gates.
- Basic shared type moves (approved in principle, unspecified, future work).
- The weekly fatigue and legacy fatigue penalty inside `effectiveAttributes` (R12 / B10 domain; not changed here).
- New Clash formats, team sizes or balance changes beyond the contracts.

---

## 8. Rough size summary

| Item | Size |
|---|---|
| Engine core (S0–S5) | about 3,500–4,500 LOC including tests |
| Abilities (S6–S11) | about 72 modules × 60–150 LOC, plus tests (about 8,000–11,000 LOC total) |
| Franchise, saves and UI (S12–S14) | about 1,500 LOC |
| Reviewer (S15) | about 1,200 LOC |
| Gate (S16) | runs plus report |

Elapsed time is dominated by the batches, which can run in parallel after S5.

### Critical files for implementation
- /home/claude/gridiron-beast/src/clash/engine.js (to be frozen as legacy; new engine in /home/claude/gridiron-beast/src/clash/t8/)
- /home/claude/gridiron-beast/src/sim/t8/status.js (the shared gate reused in mode `clash`, plus the freeze counter)
- /home/claude/gridiron-beast/src/franchise/clash-link.js (snapshots, policies/decisions, carryover, records)
- /home/claude/gridiron-beast/src/sim/rules.js (`finish()` at :828 / :855: keep statuses for the OT Clash; opening-Clash carry at kickoff)
- /home/claude/gridiron-beast/src/data/beast-dex.js and /home/claude/gridiron-beast/src/data/approved-values.js (contracts, archetypes, P8/P10 values)
- Patterns to mirror: /home/claude/gridiron-beast/src/sim/abilities/registry.js, /home/claude/gridiron-beast/src/sim/abilities/review.js, /home/claude/gridiron-beast/src/sim/abilities/review-scenarios.js, /home/claude/gridiron-beast/src/ui/screens/ability-reviewer.js, /home/claude/gridiron-beast/tests/clash/boundary.test.js

---

## Owner decisions (short list)

1. **D1 Player rotation:** prompts in Watch (rotation phase and Riptide Charge replacement) with an "Auto for the rest" option; Skip, headless and staff use the AI policy; every choice recorded.
2. **D2 AI policy in M4:** the adapted existing `smart` policy; ability-aware AI in M5; opponent-chosen replacement is the first living reserve.
3. **D3 Feather Relay:** counts as voluntary rotation (cadence, locks, enemy and owner triggers) but carries no P8 penalty.
4. **D4 Stunned safeguard:** never two consecutive skips; the safeguarded turn still counts down.
5. **D5 Ordinary-only perks:** Striker shield-break and Disruptor pierce on ordinary normal attacks only; Tank guard always while active, never in reserve.
6. **D6 Tank bruise:** keep it as a non-status trait on a 2-recipient-turn clock.
7. **D7 Legacy Afflicted heal penalty:** retire it.
8. **D8 Ramp, C6 and cap:** keep all three; the ramp on all direct damage, C6 on heals and shields (not transfers or revive); pending impacts are lost at the cap.
9. **D9 Stacking:** P8, C6 and ramp multiply and are rounded once.
10. **D10 Cross-mode magnitudes:** same % for Slowed and Empowered/Weakened; Clash Confused into football is 20% Awareness; Afflicted Clash tick is payload-only (no producer exists).
11. **D11 Shielded comparison:** original pool HP; football Shielded into Clash is 15% of max HP × fraction.
12. **D12 Standalone Clash:** statuses clear at battle end.
13. **D13 Daybreak Lance and Clear Light:** the Progression ladders govern.
14. **D14 Dawn Song:** targets the active Solchirp itself; confirm.
15. **D15 Emergency Cover:** first eligible rescuer in lineup order.
16. **D16 Ability-kind table:** owner reviews the 72-row table before S6, including the extra-strike definition.
17. **D17 Canopy Assist metric:** expected raw normal-attack damage against the current foe; ties by lineup order.
18. **D18 Second Spring:** earliest by KO sequence, then lineup order; the revived monster goes to the back.
19. **D19 Pre-M4 Clash records:** keep the frozen legacy engine for finished records; re-run unresolved ones on t8 (ledger-protected).
