# Phase 1 / C: Beast Clash inventory (Task 8)

Repository: /home/claude/gridiron-beast, branch `task8-implementation`. HEAD is 816b572 (docs-only pre-flight commit). `git diff --stat cbd0d77 HEAD -- src` is empty, so `src/` matches cbd0d77. Audit was read-only and no repo file was modified.

Citations use `path:line`. Paths are relative to the repo root. "Spec" means docs/beast-dex/SPECIFICATION_BASELINE.md. **Verified** means I ran a small node probe from the scratchpad, without changing the repo. Anything I did not confirm is marked **UNVERIFIED**.

---

## 0. Architecture at a glance

- `src/clash/` is a pure, seeded engine. `simulateClash()` is at src/clash/engine.js:31.
  - Public surface: src/clash/index.js:1-14.
  - Its header claims nothing in src/franchise imports src/clash (index.js:2-3). That is stale: src/franchise/clash-link.js:6 imports `../clash/index.js` (it is the authorized adapter, see the comment at clash-link.js:1).
- Every number lives in one frozen config, `CLASH_VALUES` (values 1.1.0, engine p1.1): src/clash/values.js:10-212.
- Move data:
  - src/data/clash-moves.js:10-83: 72 rows keyed by species id, the permanent table.
  - src/data/clash-moves-v1.0.0.js:10-78: the frozen historical table, used by `ruleset: 'v1.0.0'` (src/clash/stats.js:21).
- Move behaviour is hand-written engine code that branches on a closed set of data keys. Moves are data, but it is not a generic effect interpreter:
  - `KINDS`, `TRIGGERS` and `EFFECTS` are registries: src/clash/handlers.js:9-40.
  - The actual effects are branches in `act()`, `backRow()`, `enter()`, `onShieldBroken` and `afterHit` in engine.js (lines 66-293).
- Lab-only experimental move patches: `movePatches` (values.js:83-204), applied by `patchedMove` (values.js:243-248).
- Franchise flow is in src/franchise/clash-link.js. It is called from src/franchise/franchise.js:
  - encounter: 1798-1866
  - overtime: 2660-2722
  - pregame/opening: 2737-2802
- Screen: src/ui/screens/clash-battle.js renders a finished, deterministic battle and makes no decisions (comment at lines 1-4). Its flow is: pick lineup and order (132-149), then watch or skip, then the result screen with XP rows (179-183).

---

## 1. Battle model

### Current (file:line)

**Lineups**
- 1-5 monsters per side: engine.js:40, values.js:30 (`maxPerSide: 5, minPerSide: 1`).
- Franchise sizes are encounter 3, pregame 3, overtime 3 and playoff overtime 5 (clash-link.js:11).
- The screen allows entering with fewer monsters, and the battle shrinks to NvN (clash-battle.js:147).

**Active vs reserve**
- Each side is an ordered `line`. The "front" is the first living monster: `front = alive(side)[0]` (engine.js:64).
- Only the two fronts take strike actions (engine.js:352-358).
- **Non-front monsters do act**, in the back-row pass (`backRow()`, engine.js:245-294):
  - Support (`kind:'mend'`) heals and shields from **any slot** on its rhythm (engine.js:251-271).
  - A benched Disruptor (`hex`/`bench`) applies conditions or forces swaps "from the bench" under back-row test E: one attempt per side per exchange, chance scaled by lineup size (engine.js:273-291, values.js:46-54).
  - Bench moves flagged `anywhere` also fire from the front (engine.js:196).
  - In effect, all lineup members are partly active at the same time.
- A Support or Tank in front does a plain 1.0x strike each turn. `guard`, `mend` and `bench` kinds never "fire" in `act()` (engine.js:191). A front Support's heal still runs in `backRow()`.

**Turn structure: "exchange"**
- One exchange is one round. Each front acts at most once.
- The cap is 30 exchanges (values.js:30), checked in the loop at engine.js:302.
- Sudden-death damage ramp starts at exchange 12:
  - Model E (1-3 a side): +0.15 per exchange, cap 2.25.
  - Model F (4-5 a side): +0.25 per exchange, cap 4.0.
  - Sources: values.js:32-35, engine.js:21-22, 303.
- Stalemate rule C6: from exchange 12, five exchanges without a KO halves heals and shields, and nine quarters them (values.js:56-61, engine.js:170-174).

**Initiative** (engine.js:342-350)
- Priority tiers come first:
  - roared: -2
  - `neverFirst`: -1
  - haste: +2
  - move priority on its first strike or within `priorityExchanges`: +1
- Then effective speed, where Chill multiplies speed by 0.7 (values.js:27).
- If the speeds differ by less than 2 (`initiativeTie`, values.js:24), a seeded coin flip decides (engine.js:348).

**Rotations and switching**
- Voluntary swaps go through policies `none | defensive | type | balanced | smart | manual` (ai.js:9-47; engine.js:309-324).
  - A side may swap voluntarily only every 4 exchanges (values.js:36).
  - Cost is `swapCost: 'half'`: the incoming monster acts this exchange at half strength (values.js:69, engine.js:167, 183, 209). This is approved permanent.
- **Franchise battles use `FRANCHISE_POLICIES = {a:'none', b:'none'}`** (clash-link.js:28, used at 58-61). The player never rotates: "the front monster fights until it is knocked out" (clash-link.js:24-27; HELP_HTML at clash-battle.js:24-25).
  - Legacy records may still replay with `manual` or `smart` (clash-link.js:53-56).
  - `manual` reads recorded decisions from `config.decisions` (engine.js:312-321).
- Forced swaps (`forcedSwap`, engine.js:134-160):
  - kinds: frontTwo, backToFront, sweep, strongestBack, strongestFront, mostHurt
  - cadence: one forced swap per side every 3 exchanges (values.js:36, engine.js:139)
  - refusal reasons: just arrived (engine.js:140), `immovable` or Shell Clamp (`canLeave`, engine.js:128-132)
- Lift is an own-side rotation by a Support (engine.js:261).

**Entry** (`enter()`, engine.js:114-126)
- Entry effects (first-entry shield, Roar) fire once per monster per battle.
- A paused condition resumes on entry.
- Dodge-on-entry can re-arm.

**KO handling** (`knockout()`, engine.js:104-112)
- Sets `koed` and records a KO credit for the attacker.
- KO-triggered effects: `overcharge`, and `koHeal` when the KO came from the named move.
- Replacement (`replace()`, engine.js:363-365) steps up the next living monster in line order. It runs:
  - after the condition ticks (332)
  - after the back row (339)
  - after the first actor, only when reflected damage knocked that actor out (357)
  - at the end of the exchange (360)
- A KO'd monster's condition is **not** cleared: `lineOut` still reports `cs.cond || cs.paused` (engine.js:382).

**End of battle** (`ended()`, engine.js:366-372)
- The last side standing wins. A double wipe goes to a seeded coin.
- At the cap, the side with the higher total HP share wins, and an exact tie goes to a seeded coin (engine.js:374-379, values.js:31).

**Opening, overtime and standalone**
- Encounter (Tuesday, standalone): the player's 3 against wild prospects (franchise.js:1798-1866).
- Pregame "opening" Clash (3v3) decides the opening possession choice (franchise.js:2737-2774, `aiPossessionChoice` at clash-link.js:98).
- Overtime Clash (3v3, or 5v5 in playoffs) decides a tied game (franchise.js:2660-2696).
- AI-vs-AI pregame and overtime run headless with `log:'none'` (franchise.js:2722, 2802).
- Every battle builds fresh combatants at full HP (stats.js:39, 45). Nothing carries from the opening Clash to football or to overtime.

**Determinism**
- One mulberry32 stream per battle: `createRng(seed)` (engine.js:43; src/core/rng.js:5-40).
- Draws, in order, include:
  - each hit's spread (handlers.js:69, skipped on a dodge or miss and for `steadyRoll`)
  - condition chances
  - retaliation chances
  - initiative coins
  - policy tie coins (ai.js:30)
  - the end-of-battle coin
- `log:'none'` changes no draws, because the log is gated only in `push` and `E.log` (engine.js:46-49).
- Supporting pieces:
  - `replayKey` (engine.js:392-395)
  - `parseReplayKey` with the 1.0.0 to v1.0.0 mapping (397-403)
  - `logHash` (FNV, 405-409)
  - golden fixtures: tests/clash/fixtures/golden.json, tests/clash/engine.test.js:13-20
- The franchise stores only seed, lineup snapshots and decisions, and rebuilds the battle on demand (clash-link.js:36-37, 63-66; franchise.js:1844-1851).
- Watch and Skip are the same battle (clash-link.js:14-19).

### Task 8 change (spec §)

- **§1**: "Preserve one active Clash fighter per side with reserves. Do not interpret opening 3v3 lineups as three simultaneous active fighters."
  - The current back-row model breaks this: Supports heal from any slot, bench Disruptors act, `anywhere` bench moves fire. It must be removed or reduced to the explicit reserve abilities the Dex names: Feather Relay, Second Wind, Canopy Assist, Emergency Cover, Shared Burden owner, Eclipse Call, Astral commanded reserves.
- **§1**: "Approved reserve and rotation mechanics require explicit integration with the current franchise battle policy."
  - Today franchise policy is no voluntary rotation at all (clash-link.js:28).
  - Several Dex abilities key off *voluntary rotation*: Cinder Clamp, Riptide Pursuit, Cold Welcome, Shell Harvest. They would never trigger under `none`. Decision needed: **BLOCKER**.
- The turn model must become per-monster "normal turns" and "owner turns", because spec §9-10 count duration in recipient or owner turns.
  - The per-exchange tick (see §4) has to move to the recipient's normal turn. Stunned skips count; reserve turns, reactions and counters do not.
- **§10**: a KO must clear status and episode immediately. Today it does not (engine.js:382).
- **§10**: cross-mode transfer from opening and overtime Clash to football must be added. Nothing carries today.
- **§15**: determinism is already strong. New ability state (charges, once-ledgers, delayed events, cooldowns) has to live in the engine's authoritative live records, and the golden hashes will all change (tests/clash/fixtures/golden.json).

---

## 2. Combatant stats

### Current (file:line)

`buildCombatant` (stats.js:29-53) works in this order:
1. Effective attributes are computed once: nature x1.1/0.9 plus fatigue (stats.js:33; comment at 2-9).
2. `overall(e, position)` (stats.js:34).
3. `mean` = average of speed, agility, strength, awareness and durability (stats.js:35).
4. `tilt(x) = clamp(1 + (x - mean)/250, 0.92, 1.08)` (stats.js:36; values.js:22).

The stats are:
- **HP** = `Math.round((28 + 0.85*ovr) * arch.hp * tilt(durability) * o2)` (stats.js:37-39). O2 is experimental and off.
- **ATK** = `round2((6 + 0.22*ovr) * arch.atk * tilt(strength))` (stats.js:40). It is fractional, kept to two decimals.
- **SPD** = `round2(50 + arch.spd + clamp((speed - mean)/4, -3, 3) + 0.05*ovr)` (stats.js:41).
- There is no defense stat. Damage reduction comes only from the Tank guard, brace and shields (handlers.js:72-74).
- The combatant also records type (`sp.element`), stage, level, overall and fatigue (stats.js:43-45).
- Level affects the battle only through attributes and overall. There is no level-scaled stat.

`archetypeOf(speciesId)` reads `CLASH_MOVES[speciesId]?.archetype || null` (stats.js:23). **The archetype is stored on the move row, not on the species.**

Archetype multipliers and perks (values.js:15-21):

| Archetype | HP | ATK | SPD | Perk |
|---|---|---|---|---|
| Tank | 1.36 | 0.82 | -2 | guard 0.88 (only while front, handlers.js:73); hits it lands make the target "bruised" for 2 exchanges, so heals on that target x0.75 (handlers.js:100, 112; values.js:28) |
| Striker | 0.82 | 1.25 | +2 | `shieldBreak: 2`: removes shield at twice the rate (handlers.js:89) |
| Support | 1.00 | 0.75 | 0 | none (heal power is on the move) |
| Disruptor | 0.95 | 1.00 | +1 | `pierce`: ignores the Tank guard (handlers.js:73) |
| Balanced | 1.05 | 1.05 | 0 | none |

Archetype "bands" check move numbers (values.js:38-41, validate.js:30-39).

Approved archetype counts are enforced: Striker 15, Disruptor 16, Balanced 16, Support 15, Tank 10 (validate.js:8, 43).

Type chart (src/data/type-chart.js:5-9, shared with football):
- Each type beats two types and loses to two.
- Strong is x1.05 and weak is x0.952 (values.js:23, types.js:9-15).
- `CONDITION_BY_TYPE` (types.js:20-23) maps element to condition label. It is informational. The engine reads the condition from the move row.

### Task 8 change (spec §)

- **§1**: the reviewed archetype totals are Striker 14, Balanced 15, Disruptor 15, Tank 13, Support 15.
  - Verified against docs/beast-dex/data/families.json, the 72 originals: Balanced 15, Disruptor 15, Striker 14, Tank 13, Support 15.
  - **11 families change archetype** vs code (verified): emberfox Str->Bal, ashkit Bal->Dis, cinderclaw Str->Bal, pyrelynx Dis->Tank, pyroclast Tank->Dis, mudcub Dis->Tank, nightowl Bal->Str, steelpaw Bal->Tank, shadewisp Sup->Tank, wyrmkit Bal->Sup, sablewing Dis->Bal.
  - `ARCH_COUNTS` (validate.js:8) and the bands (Tank must be `guard`, Support must be `mend`, Disruptor must be `hex`/`bench`; validate.js:33-36) would reject the Dex design.
- **BASIC_AUDIT §4.3**: move the archetype from the move row to the species record (stats.js:23), so a species without a move still has one.
- The Dex abilities mention "normal damage", "ordinary-only archetype attack bonuses", Guarded "reduction", "evasion" and "critical system if any" (gearwing).
  - The current engine has **no accuracy/evasion roll** (misses come only from dodge, veil and illusion flags, handlers.js:64-68), no defense stat and no crit.
  - Whether Task 8 needs a general evasion stat is unspecified. **UNVERIFIED** whether the Dex's "standard evasion" refers to an existing system elsewhere (none in src/clash).
- Type chart values: no spec change found in the sections read. **UNVERIFIED** against other sections (16, 18).

---

## 3. Moves

### Current (file:line)

**Data shape**
- One row per species: `{name, archetype, text, kind, trigger, ...effect keys}` (clash-moves.js:11-82).
- Kinds: `strike`, `heavy`, `surge`, `guard`, `mend`, `hex`, `bench` (handlers.js:9).
- Triggers: `always`, `first`, `every{n, until}`, `once`, `onEntry`, `firstAfterEntry` (handlers.js:10, evaluated at 45-55).
  - Triggers count the actor's own strikes (`live.strikes`).
  - Support and bench rhythms count exchange numbers instead: `ex % n` at engine.js:196, 251, 275.
- Effect keys are registered with a meaning in `EFFECTS` (handlers.js:12-40) and implemented by branches in engine.js and handlers.js.
- **Data-driven at the parameter level, handler-coded at the mechanic level.** Adding a Dex ability means writing new engine branches. Some branches are hard-wired to one species' log text, for example "Magma Crust" (engine.js:70), "Glacier Wall" (76), "Iron Bite" (110), "Dragon's Roar" (124), "Daybreak" (205), "Mind Game" (206), "Forge Swipe" (240).

**Primitives that exist**

| Primitive | Where |
|---|---|
| Damage hit with multiplier, multi-hit, splash, blink to the second foe, finisher, vsShield, firstStrike, perStage, echo/echoFlat, sudden-death bonus | handlers.js:61-104, engine.js:200-213 |
| Heal (front, mostHurt, twoMostHurt, all, second), selfHeal, regrowOnHit, dragonhide, koHeal | handlers.js:107-122, engine.js:80-81, 110, 238, 255-259 |
| Shield pool: entry, granted, regrow, erupt/thorns on break, clamp, shieldBreak and breakAlways, shieldPierce (patch-only) | handlers.js:88-96, 125-130; engine.js:67-77, 123 |
| Status apply / chance / afflict / retaliate / wholeLine / arrivalCond / frontTwo (bench, paused) / cleanse | conditions.js; engine.js:84-87, 91-96, 215-233, 258, 289 |
| Forced swap / sweep / lift; immovable; refusal fallback | engine.js:134-160, 226, 235, 261 |
| Priority, haste, neverFirst, roar (act last), unanswered and fakeFirst (skip the foe's action) | engine.js:205-206, 344 |
| Self/ally buffs: charge, rally (team, N exchanges), forge (permanent attack stacks), overcharge, brace, dodge, veil, illusion, hitCap, steadyRoll, sovereign | handlers.js:63-86; engine.js:239-240, 264-267 |
| Opening effect at exchange 1 (patch-only) | engine.js:335-336 |

**Primitives that do not exist**
- Delayed or scheduled events (meteor, fissure, Dawn Song heal-over-turns).
- Cooldowns (Circuit Breaker, Fresh Start).
- Charges or counters per ability (Stoke the Flame, Mind Game trick).
- Counter-attacks: damage reactions, as opposed to condition retaliation.
- Commanded reserve action (Canopy Assist, Astral Strike).
- Revive (Second Spring).
- HP transfer (Mind Mend, Root Communion).
- Damage split (Shared Burden).
- Constructs (Twin Thunder).
- Beneficial-status steal or strip.
- Status countdown freeze.
- Lethal-damage prevention (Last Root, Emergency Cover).
- Accuracy/evasion.
- **Fields: no field primitive in Clash** (grep for "field" in src/clash finds only the move name "Static Field").
- Mastery-scaled values. Every Dex row has per-mastery numbers, and there is no mastery input at all.

**Move table vs Dex.** The 72 rows below are generated from docs/beast-dex/data/families.json, docs/beast-dex/data/abilities.json (`mode: 'Beast Clash'`) and src/data/clash-moves.js. Line numbers are identical in clash-moves-v1.0.0.js.

Status meanings:
- **matches**: same mechanic.
- **partial**: core concept or primitive overlaps but numbers, trigger, turn model or gating differ.
- **legacy-different**: different mechanic, whether or not the name is the same.
- **missing**: no move. None are missing, because every original family has a code move.

Bold "Dex arch" marks an archetype change. The Dex texts were truncated when I read them; the full contracts are in docs/beast-dex/families/<id>.md.
| # | familyId | Dex arch | code arch | Dex Clash ability | Dex category / activation | existing move (clash-moves.js line) | status | notes |
|---|---|---|---|---|---|---|---|---|
| 1 | emberfox | **Balanced** | Striker | Stoke the Flame | Retaliation / Three incoming attacks survived | Flare Dash (L11; v1.0.0 L11) | legacy-different | Dex: retaliation after 3 survived attacks; code: first-strike priority 1.3x + Burn chance |
| 2 | ashkit | **Disruptor** | Balanced | Cinder Clamp | Rotation control / Successful direct attack while ready | Cinder Tumble (L12; v1.0.0 L12) | legacy-different | Dex: grip mark delays voluntary rotation; code: every-2nd 1.3x + Burn |
| 3 | firestorm | Striker | Striker | Falling Star | Delayed attack / Normal action replaced by launch | Meteor Pass (L13; v1.0.0 L13) | legacy-different | Dex: once-per-Clash delayed meteor, team-wide hits; code: every-2nd 1.4x + Burn chance. No delayed-event primitive |
| 4 | cinderclaw | **Balanced** | Striker | Molten Brand | Retaliation mark / First successful direct attack while ready | Cinder Maul (L14; v1.0.0 L14) | legacy-different | Dex: two-use attached retaliation mark; code: every-2nd 1.5x + Burn |
| 5 | pyrelynx | **Tank** | Disruptor | Heat Mirage | Entry defense / Starting active or entering active position while ready | Heat Mirage (L15; v1.0.0 L15) | legacy-different | Same name. Dex: entry decoy, probabilistic whole-attack evasion; code: Daze strikes + Burn retaliation on Dazed attacker |
| 6 | pyroclast | **Disruptor** | Tank | Faultline | Delayed slot disruption / Normal action replaced by fissure creation | Magma Crust (L16; v1.0.0 L16) | legacy-different | Dex: delayed fissure + 100% Healing Reduced (uncleansable); code: entry shield that erupts 1x atk on break |
| 7 | tidepaw | Support | Support | Second Tide | Support / Every second eligible normal action | Tide Pool (L17; v1.0.0 L17) | partial | Heal-most-injured % exists (every 2nd exchange, from any slot); missing: owner-action rhythm, replaces attack, surplus -> Shielded |
| 8 | mudcub | **Tank** | Disruptor | Shared Burden | Tank / Spend first eligible normal turn creating link | Mud Splash (L18; v1.0.0 L18) | legacy-different | Dex: Shared Burden reserve link (spec §9); code: Chill strikes |
| 9 | reefclaw | Tank | Tank | Shell Renewal | Tank / Automatic harmful status received or active entry | Shell Clamp (L19; v1.0.0 L19) | legacy-different | Dex: once-per-Clash harmful-status shedding; code: entry shield + clamp (blocks enemy voluntary swap) |
| 10 | tidefin | Disruptor | Disruptor | Wash Away | Disruptor / Normal-turn beneficial-status removal attempt | Undercurrent (L20; v1.0.0 L20) | legacy-different | Dex: strip opposing beneficial status; code: bench forced swap front-two + 0.8x hit |
| 11 | wavehorn | Balanced | Balanced | Riptide Charge | Balanced / Every second performed normal attack | Riptide Charge (L21; v1.0.0 L21) | partial | Every-2nd charged hit + sweep to back exists; missing: opponent chooses replacement, "reserve" semantics, % values from Dex |
| 12 | tsunarok | Disruptor | Disruptor | Riptide Pursuit | Disruptor / One ready pursuit each active entry | Undertow (L22; v1.0.0 L22) | legacy-different | Dex: reaction punishing voluntary enemy departure (undodgeable); code: drag back monster to front, 0.5x hit + Chill |
| 13 | thornkit | Support | Support | Second Spring | Support / Next eligible normal turn revives first knocked-out ally | Seed Drop (L23; v1.0.0 L23) | legacy-different | Dex: once-per-Clash revive to back reserve; code: heal front 10% + next 6%. No revive primitive |
| 14 | mossclaw | Balanced | Balanced | Spore Detonation | Balanced / Ready normal attack against removable harmful status | Spore Swipe (L24; v1.0.0 L24) | legacy-different | Dex: consume enemy status duration for bonus damage; code: every-2nd 1.3x + regrow 4% on hit |
| 15 | rootram | Tank | Tank | Last Root | Tank / Automatic otherwise lethal damage | Rooted Stand (L25; v1.0.0 L25) | legacy-different | Dex: one lethal hit prevented at 1 HP; code: entry shield (wallText is text only, no effect) |
| 16 | leafhorn | Support | Support | Canopy Assist | Support / Once normal turn calls reserve basic attack | Canopy Shade (L26; v1.0.0 L26) | legacy-different | Dex: Canopy Assist commanded reserve basic attack; code: heal most hurt + brace |
| 17 | thornback | Tank | Tank | Shell Harvest | Tank / First active entry shield; voluntary departure cashes remainder | Bramble Shell (L27; v1.0.0 L27) | partial | Entry shield exists; missing: voluntary-exit converts remaining shield to self-heal; code adds thorns not in Dex |
| 18 | elderoot | Support | Support | Root Communion | Support / Eligible normal turn redistributes living team current HP | Ancient Grove (L28; v1.0.0 L28) | legacy-different | Dex: Root Communion HP equalization (spec §9); code: heal all 12% |
| 19 | flicker | Support | Support | Lightning Rod | Status transfer / Before own attack while empty status slot | Spark Charge (L29; v1.0.0 L29) | legacy-different | Dex: pull reserve ally harmful status onto self; code: charge front ally next strike +25% |
| 20 | voltfin | Balanced | Balanced | Arc Rebound | Miss redirection / Ordinary normal attack evaded while ready | Coil Jolt (L30; v1.0.0 L30) | legacy-different | Dex: evaded attack redirects to reserve enemy; code: every-2nd 1.3x + 20% Shock. No accuracy/evasion system |
| 21 | voltfang | Striker | Striker | Phase Strike | Shield bypass / Active enemy Shielded on eligible own action | Lightning Break (L31; v1.0.0 L31) | legacy-different | Dex: once shield-bypass attack; code: priority + 1.3x first two strikes. shieldPierce exists only as patch-only key |
| 22 | stormlynx | Disruptor | Disruptor | Circuit Breaker | Cooldown disruption / Active enemy ability currently recharging | Static Field (L32; v1.0.0 L32) | legacy-different | Dex: extend enemy cooldown 2 owner turns; code: every-2nd Shock chance. No cooldown system exists |
| 23 | joltrex | Striker | Striker | Victory Surge | Knockout follow-up / Ordinary normal attack knocks out active enemy | Overcharge (L33; v1.0.0 L33) | legacy-different | KO hook exists (knockout()) but Dex wants immediate extra strike at replacement; code: +20% atk after KO |
| 24 | stormcrown | Striker | Striker | Twin Thunder | Setup constructs / First eligible own action summons instead of attacking | Thunderclap (L34; v1.0.0 L34) | legacy-different | Dex: two setup constructs; code: every-2nd 1.3x + 0.5 splash. No construct primitive |
| 25 | snowmoth | Support | Support | Fresh Start | Ally cooldown support / Eligible other living ally cooldown while source ready | Frost Dust (L35; v1.0.0 L35) | legacy-different | Dex: reduce ally cooldown; code: shield front ally 10% |
| 26 | hailfang | Disruptor | Disruptor | Cold Welcome | Voluntary-entry disruption / Successful enemy voluntary rotation while source active and ready | Frost Nip (L36; v1.0.0 L36) | legacy-different | Dex: Slowed on enemy voluntary entry; code: Chill strikes (Chill ~ Slowed) |
| 27 | frostclaw | Balanced | Balanced | Snowbank Shot | Attack with defensive miss fallback / Ready own normal action | Cold Pounce (L37; v1.0.0 L37) | legacy-different | Dex: oversized snowball w/ accuracy check, Shielded fallback; code: every-2nd 1.3x, first Chills |
| 28 | icehorn | Tank | Tank | Snowdrift Shelter | Self Guarded preparation / Ready source at <=50 percent HP and empty shared status slot | Permafrost Wall (L38; v1.0.0 L38) | legacy-different | Dex: self Guarded at <=50% HP; code: entry shield + Chill retaliation |
| 29 | glaciron | Tank | Tank | Glacier Wall | Original shield rebuild / First active entry plus first eligible depletion of own original shiel | Glacier Wall (L39; v1.0.0 L39) | partial | Entry shield + one regrow exists; Dex: smaller rebuild resolving only after whole hit/effects (spec §10); code regrows full size inside onShieldBroken mid-hit |
| 30 | glacivern | Disruptor | Disruptor | Deep Winter | Harmful-status countdown freeze / Own action when living enemy has existing harmful status | Whiteout (L40; v1.0.0 L40) | legacy-different | Dex: freeze enemy status countdown (Deep Winter); code: once Shock skipping two actions |
| 31 | gustling | Support | Support | Feather Relay | Reserve rotation support / Gustling family; Support. Once per Clash, while living/able in RESERVE | Lift (L41; v1.0.0 L41) | partial | Heal + own-side rotation (lift) exists; Dex: once, from reserve, replaces team attack, rotates the departing active |
| 32 | breezefang | Balanced | Balanced | Gust Hop | Signature action / Zephyroo; common; RB; Clash archetype Balanced → Balanced. Every third | Gust Hop (L42; v1.0.0 L42) | partial | Two-hit primitive exists; Dex every third attack, independently evadable hits; code every second at 0.65x |
| 33 | skywarden | Disruptor | Disruptor | Downdraft | Enemy lineup disruption / Aeralis; Disruptor. Ready own normal action replaces attack when enemy | Downdraft (L43; v1.0.0 L43) | partial | Forced swap front<->first reserve + arrival condition exists; Dex: own normal action replacing attack, Weakened; code acts from bench, Daze |
| 34 | windlynx | Support | Support | Second Wind | Reserve priority support / Galyx; Support. Once per Clash FROM RESERVE before normal round initia | Updraft (L44; v1.0.0 L44) | partial | Haste primitive exists; Dex: once from reserve before initiative, no heal; code heal 17.3% + haste every 2nd |
| 35 | zephyr | Support | Support | Tailwind Pact | Signature action / Zephiro; rare; QB; Clash archetype Support → Support. Once per Clash o | Tailwind (L45; v1.0.0 L45) | partial | Team damage buff (rally) exists; Dex: once, gated team Empowered status, no heal; code every 2nd +15% + 6% heal |
| 36 | tempestra | Disruptor | Disruptor | Eye of the Storm | Signature action / Tempestra; legendary; WR; Clash archetype Disruptor → Disruptor. Once  | Cyclone (L46; v1.0.0 L46) | legacy-different | Dex: restrict enemy to ordinary attacks; code: every-3rd sweep + Daze arrival |
| 37 | pebble | Tank | Tank | Emergency Cover | Lethal-hit interception / Reserve ally would lose active teammate to eligible direct hit | Stone Skin (L47; v1.0.0 L47) | legacy-different | Dex: reserve intercepts lethal hit; code: entry shield +5%/stage |
| 38 | rockram | Balanced | Balanced | Rubble Reprisal | Healing-triggered reaction / Active enemy receives actual HP healing while source ready | Ram Butt (L48; v1.0.0 L48) | legacy-different | Dex: reaction to enemy healing; code: every-2nd 1.3x / 1.6x vs shield |
| 39 | boulderox | Tank | Tank | Unbroken Charge | Stun-response special / Actually skip normal action due to Stunned | Stone Charge (L49; v1.0.0 L49) | legacy-different | Dex: Stunned skip arms undodgeable charge; code: entry shield + first strike 1.3x |
| 40 | stoneguard | Striker | Striker | Bank Shot | Shield ricochet / Shielded active enemy plus living reserve | Crushing Rush (L50; v1.0.0 L50) | legacy-different | Dex: shield ricochet to last reserve; code: every-2nd 1.45x, double shield break |
| 41 | terrabull | Disruptor | Disruptor | Stone Divide | Extra-attack denial / Active non-Stunned source observes enemy extra strike | Quake Step (L51; v1.0.0 L51) | legacy-different | Dex: cancel enemy extra strike/retaliation; code: bench Chill on front two |
| 42 | titanolith | Tank | Tank | Mountain Shelter | Team Guarded replacement / Own action when any living teammate at <=50 percent HP | Landslide (L52; v1.0.0 L52) | legacy-different | Dex: team Guarded override (Mountain Shelter, spec §10); code: largest entry shield + immovable |
| 43 | shadowkit | Balanced | Balanced | Shadow Pounce | Clash ability / First enemy normal-action attack, including an enhanced normal attack, | Shadow Pounce (L53; v1.0.0 L53) | legacy-different | Same name. Dex: counter after a whole enemy attack misses (70/80%); code: every-2nd 1.3x + entry dodge |
| 44 | nightowl | **Striker** | Balanced | Night Swoop | Clash ability / Noctlet; common; S; Clash archetype Balanced → Striker. First performe | Night Swoop (L54; v1.0.0 L54) | partial | First-attack priority exists; missing 110/120% damage; Dex archetype Striker (code Balanced) |
| 45 | duskrunner | Striker | Striker | Predator Rhythm | Clash ability / Duskyre; uncommon; RB; Clash archetype Striker → Striker. After two co | Vanishing Cut (L55; v1.0.0 L55) | legacy-different | Dex: third consecutive same-target hit empowered, no dodge; code: every-3rd 1.4x + dodge |
| 46 | mireclaw | Striker | Striker | Ambush | Clash ability / Murklaw; uncommon; LB; Clash archetype Striker → Striker. First ACTIVE | Ambush (L56; v1.0.0 L56) | partial | First-after-entry bonus exists; Dex: first active entry per Clash only, 130-175% by mastery, HP>=75% gate, armed state persists |
| 47 | nocturne | Disruptor | Disruptor | Eclipse Call | Clash ability / From reserve, an able Nocturne automatically attempts Eclipse Call at  | Eclipse (L57; v1.0.0 L57) | legacy-different | Dex: from reserve start-of-round Confused attempt 60-90%; code: first strike whole-line Daze 2 exchanges |
| 48 | nyxshade | Disruptor | Disruptor | Eclipse Theft | Clash ability / Nyxshade spends its own normal action, once per Clash, to steal an eli | Night Veil (L58; v1.0.0 L58) | legacy-different | Dex: steal opposing beneficial status; code: first-hit veil + Daze strikes |
| 49 | glimmer | Support | Support | Glow Mend | Signature action / Lumini; common; WR; Clash archetype Support → Support. Ready own norma | Glow Mend (L59; v1.0.0 L59) | partial | Two-target heal exists; Dex: replaces attack when >=2 injured, 7/10% by form; code every 2nd exchange, from any slot |
| 50 | sunwhistle | Support | Support | Dawn Song | Signature action / Solchirp; common; K; Clash archetype Support → Support. Ready own norm | Dawn Song (L60; v1.0.0 L60) | partial | Front-ally heal exists; Dex: 5-8% now + same at end of next 2 owner turns (schedule); code 16.8% every 2nd |
| 51 | lumen | Support | Support | Clear Light | Signature action / Lumen; uncommon; QB; Clash archetype Support → Support. Ready own norm | Clear Light (L61; v1.0.0 L61) | partial | Heal + cleanse exists; Dex: cleanse required first then 10%, no cast if nothing to remove; code heals 15.7% regardless |
| 52 | prism | Disruptor | Disruptor | Refraction | Signature action / Prismara; uncommon; S; Clash archetype Disruptor → Disruptor. Every th | Refraction (L62; v1.0.0 L62) | partial | Splash primitive exists; Dex every 3rd attack, secondary 30-60% vs first living reserve, independent evasion, no Daze |
| 53 | halofang | Striker | Striker | Radiant Pursuit | Signature action / Haloryx; rare; LB; Clash archetype Striker → Striker. Own normal attac | Radiant Pursuit (L63; v1.0.0 L63) | partial | Finisher bonus exists; Dex <35% HP, 115-145% by mastery; code every-2nd 1.3x + 25% below 50% |
| 54 | aurelion | Striker | Striker | Daybreak Lance | Signature action / Aurelion; legendary; WR; Clash archetype Striker → Striker. Once per C | Daybreak (L64; v1.0.0 L64) | partial | Once-per-Clash strike exists; Dex 160%, suppress attack retaliation, explicitly NO skipped enemy turn (code unanswered skip contradicts) |
| 55 | ironcub | Balanced | Balanced | Forge Swipe | Signature action / Ferrcub; common; OL; Clash archetype Balanced → Balanced. Every third  | Forge Swipe (L65; v1.0.0 L65) | partial | Self attack buff exists (forge); Dex every 3rd, Empowered status +10/15% for 2 owner turns; code permanent +5% x3 |
| 56 | steelpaw | **Tank** | Balanced | Tempered Guard | Signature action / Steelpaw; common; LB; Clash archetype Balanced → Tank. On own ready no | Steel Pounce (L66; v1.0.0 L66) | partial | Per-hit damage cap exists (hitCap 25%); Dex: Guarded episode + 30% cap, replaces attack; archetype Tank (code Balanced) |
| 57 | gearwing | Balanced | Balanced | Gear Shot | Signature action / Coglet; uncommon; K; Clash archetype Balanced → Balanced. Every perfor | Gear Shot (L67; v1.0.0 L67) | partial | Variance clamp exists (steadyRoll spread=1); Dex: floor 0.95-1.10 by mastery, upper variance kept |
| 58 | ironjaw | Striker | Striker | Iron Bite | Signature action / Ferronox; uncommon; DL; Clash archetype Striker → Striker. Ready own n | Iron Bite (L68; v1.0.0 L68) | legacy-different | Same name. Dex: vs Shielded 120% with shield multiplier; code: every-2nd 1.5x + KO heal 10% |
| 59 | metalhorn | Support | Support | Shield Wall | Signature action / Ferrhorn; rare; TE; Clash archetype Support → Support. Ready own norma | Shield Wall (L69; v1.0.0 L69) | partial | Shield grant exists; Dex Shielded status to reserve ally w/ empty slot, 12-21%, 3 recipient turns |
| 60 | aegistron | Tank | Tank | Fortress | Signature action / Aegistron; legendary; DL; Clash archetype Tank → Tank. Once per Clash  | Fortress (L70; v1.0.0 L70) | legacy-different | Dex: once Guarded 50% at <60% HP, store prevented dmg, heal at expiry; code: entry shield 25% |
| 61 | mindwing | Support | Support | Mind Mend | Signature action / On own normal action while active, able and ready, replace attack to d | Mind Mend (L71; v1.0.0 L71) | legacy-different | Dex: HP donation (spec §9 Mind Mend); code: heal most hurt 16.6% + cleanse Daze |
| 62 | shadewisp | **Tank** | Support | Mirage Veil | Signature action / Two completed enemy direct normal attacks from same attacker damage so | Mirage Veil (L72; v1.0.0 L72) | legacy-different | Dex: self Guarded after two hits from same attacker; code: every-4th illusion on most hurt; archetype Tank (code Support) |
| 63 | cerebrix | Disruptor | Disruptor | Foresight | Signature action / Once per Clash, spend own normal action while active and able to prepa | Foresight (L73; v1.0.0 L73) | legacy-different | Same name. Dex: status mirror; code: pull strongest to back / Daze on refusal |
| 64 | echolot | Balanced | Balanced | Echo Strike | Signature action / Ready own normal action uses stored latest positive direct enemy HP hi | Echo Strike (L74; v1.0.0 L74) | partial | Stored-damage bonus exists (echoFlat); Dex: stored latest enemy hit 35-80%, cap 15% target maxHP, 100% base |
| 65 | enigmane | Disruptor | Disruptor | Mind Game | Signature action / Direct enemy normal attack missing source completely earns one trick.  | Mind Game (L75; v1.0.0 L75) | legacy-different | Same name. Dex: trick from enemy miss -> Confused; code: first-strike fake skip + Daze |
| 66 | astralux | Striker | Striker | Astral Strike | Signature action / Once per Clash while active and able, use own normal action to command | Blink (L76; v1.0.0 L76) | legacy-different | Dex: command enemy reserves to attack own active (spec §10 Astral); code: once blink 1.5x at second foe |
| 67 | drakeling | Striker | Striker | Dragon Pounce | Signature action / Ready own normal action may perform HP-cost enhanced attack if source  | Dragon Pounce (L77; v1.0.0 L77) | partial | Form scaling exists (perStage); Dex: HP-cost enhanced attack 140-185% by form+mastery |
| 68 | wyrmkit | **Support** | Balanced | Coil Renewal | Signature action / Every third performed normal-action attack with positive direct enemy  | Coil Renewal (L78; v1.0.0 L78) | partial | Heal on attack exists (selfHeal); Dex: every 3rd, ally heal = 25/35% of damage, capped; archetype Support (code Balanced) |
| 69 | sablewing | **Balanced** | Disruptor | Wing Shelter | Signature action / While active, after surviving complete direct enemy attack removing at | Wing Shadow (L79; v1.0.0 L79) | legacy-different | Dex Wing Shelter = heal after >=20% hit (resembles code Dragonhide); code: bench Daze |
| 70 | scaleguard | Balanced | Balanced | Dragonhide | Signature action / First active entry once per Clash attempts own Guarded 20/25/30/35% fo | Dragonhide (L80; v1.0.0 L80) | legacy-different | Same name. Dex: entry Guarded converted to damage bonus; code: heal 8% after 20% hit |
| 71 | vyrnax | Striker | Striker | Dragon Roar | Signature action / First performed normal attack each Clash, even later active entry, bec | Dragon's Roar (L81; v1.0.0 L81) | legacy-different | Dex: first attack 120-150% + Weakened 15%; code: entry Roar (acts last 2 ex) + every-2nd 1.4x |
| 72 | aurodrax | Balanced | Balanced | Sovereign Balance | Signature action / Own ready normal action selects branch from source HP at action commit | Sovereign Arm (L82; v1.0.0 L82) | legacy-different | Dex: HP-branch attack / Guarded; code: every-2nd 1.3x, undodgeable, +20% sudden death |

Tally: {"legacy-different":48,"partial":24}

**Summary of the table**
- 0 matches, 24 partial, 48 legacy-different, 0 missing.
- Same-name but different mechanic: pyrelynx Heat Mirage, shadowkit Shadow Pounce, ironjaw Iron Bite, cerebrix Foresight, enigmane Mind Game, scaleguard Dragonhide.
  - The **code's Dragonhide (scaleguard) mechanic is essentially Dex Wing Shelter (sablewing)**.
  - The code Steel Pounce `hitCap` resembles the payload of Dex Tempered Guard.

### Task 8 change (spec §)

- **§9**: implement all 72 Dex Clash abilities with their full contracts (trigger, cost, lifetime, cooldown unit, cleanup, counters, events, fixtures).
  - The Dex abilities are mostly "replace own normal action / once per Clash / reaction" designs keyed to normal turns, not exchange rhythms.
  - The engine needs new primitives: delayed events, cooldowns, charges, counters and reactions, commanded reserve actions, revive, HP transfer, damage split, shared-status-slot statuses, and accuracy/evasion if required.
  - Mastery-indexed values are needed too (spec §6 Mastery).
- **§9 Shared Burden** (mudcub):
  - raw power computed once, then split
  - source share floored, remainder to the original target
  - strongest link wins; ties go to earliest creation, then stable monsterID
  - active-only Tank guard
  - no link chains
- **§9 Mind Mend** (mindwing): floor donation, bounded by missing HP and by source HP - 1; atomic debit/credit; not damage.
- **§9 Root Communion** (elderoot): conserving whole-HP apportionment with stable-ID ties.
- **§9 status tie order**: same-boundary attempts keep event order, then sourceID, then abilityID. No random tie roll.
- The current `movePatches`, `balance-manifest.js` and the frozen v1.0.0 table become historical for the old move set. Decision needed: retire them or keep them for replay. Spec §15 authorizes a fresh-save break, so the old replay keys need not survive. **UNVERIFIED** whether the owner wants the v1.0.0 ruleset kept.
- **BASIC_AUDIT §4.4 item 2**: 120 Basics need "shared type moves". They are approved in principle (docs/beast-dex/data/rules.json `basic.sharedTypeMoves: true`) but unspecified. **BLOCKER.** The recommendation is to keep Basics out of Clash lineups until the moves are specified.

---

## 4. Statuses / conditions in Clash

### Current (file:line)

**Four conditions** (conditions.js:62): `burn`, `chill`, `daze`, `shock`.
- Burn: 6% maxHP per exchange, rounded (conditions.js:40; values.js:27).
- Chill: speed x0.7 for initiative (engine.js:343).
- Daze: outgoing damage x0.75 (handlers.js:70; values.js:24).
- Shock: lose the next action. It is consumed on use, and `skips` can be 2 for Whiteout (conditions.js:47-52, engine.js:185-188). A monster never loses two actions in a row (engine.js:186, 189).

**Representation**
- Per-combatant `cs = {cond, lastEnded, paused}` on the live record (conditions.js:11).
- `cond = {kind, left, skips, skipped}` (conditions.js:26).
- A single slot holds one condition (header, conditions.js:1-2).

**Stacking and replacement** (`applyCondition`, conditions.js:17-34)
- Same kind is resisted with no refresh (27).
- A different kind replaces the current one when its severity is higher: shock 3 > burn 2 = daze 2 > chill 1 (values.js:26).
- A condition with 1 or fewer exchanges left counts as severity 0, so anything replaces it (28-31). Otherwise the new one is resisted as weaker.
- Immunity: the same kind cannot land again within 1 exchange of ending, or 2 for Shock (conditions.js:22-25; values.js:27).
  - Verified: burn applied at exchange 5 expires at 8, and re-applying it at exchange 9 is `resisted_immune`.

**Duration**
- Unit: **exchanges in front**. Default 3 (values.js:26). Eclipse uses `duration: 2` (clash-moves.js:57).
- The tick is at **exchange start, step 2, before any action**, on both fronts only (engine.js:325-331, conditions.js:37-44).
- The application exchange is not ticked.
- Verified probe: burn applied at exchange 5 ticks for 6 at exchanges 6, 7 and 8 and expires at the exchange-8 tick. So it affects actions in exchanges 6 and 7 (and the rest of exchange 5), not 8.
- A Shock skip does not decrement `left`. Only the exchange tick does.

**Bench**
- A condition is paused when its holder leaves the front (`pauseCondition`, conditions.js:59; engine.js:127).
- It resumes with its remaining count on entry (engine.js:116).
- A bench application lands paused (conditions.js:19-20; engine.js:289).
- Paused conditions do not tick.

**Cleanse**: `cleanse(state, ex, only)` with `'any'` or `'daze'` (conditions.js:54-57). Used by Clear Light and Mind Mend (engine.js:258). It sets `lastEnded`, so immunity applies afterwards.

**Heal interaction**
- Afflicted (any condition) x0.7 and bruised x0.75 (handlers.js:111-112).
- healCut, patch-only (handlers.js:114).

**Shield pool**
- Not a status. It is a separate numeric `shield` on the live record (engine.js:57).
- It **stacks additively** from all sources (`target.shield += amt`, handlers.js:127) and has no duration.
- It absorbs damage before HP. The break rate is the max of move `shieldBreak`, Striker 2 and `breakAlways` (handlers.js:89-95).
- A break triggers erupt, thorns, breakCharge and regrow (engine.js:67-77).

**Other non-status flags**: dodge, veil, illusion, brace, charge, haste, forge, overcharge, rally, roarUntil, unansweredUntil, bruisedUntil (engine.js:56-57). None of them use the slot.

### Task 8 change (spec §10)

- **Twelve shared statuses with neutral names.** The spec's Appendix B list is **not in the repo** (grep for "Appendix B" finds only spec line 379): **UNVERIFIED**.
  - Names used across docs/beast-dex: Afflicted, Stunned, Slowed, Weakened, Confused, Guarded, Shielded, Empowered, Healing Reduced, Knocked Down (football), plus Stumbled (football-only, not a shared status per §10). Twelve are not identified.
  - Rough mapping from today: burn -> Afflicted, shock -> Stunned, chill -> Slowed, daze -> Weakened (or Confused; Daze is a damage cut, Dex Weakened is -15% outgoing).
  - The 4-condition set, the severity table and the immunity rules are all replaced.
- **One slot for beneficial and harmful statuses together.** Today buffs are not statuses, and **Shielded becomes a status** that occupies the slot (the shield pool moves into the status payload with original strength, remaining fraction and history).
- **Episode rules**:
  - An equal same-status application adds duration only.
  - A stronger one replaces strength and remaining duration.
  - A weaker one is ignored and uses no slot.
  - At most 3 applications per episode, and ticking does not reopen slots.
  - A different status cannot replace the current one without an explicit ability.
  - All of this is new: today same kind is "no refresh" and higher severity replaces.
- **Clash turn counting**:
  - Count recipient normal turns, including Stunned skips.
  - Reserve turns, reactions and counters do not tick.
  - The application turn does not count.
  - Afflicted ticks at the end of the recipient's normal turn, before the decrement.
  - Today the tick is at the start of the exchange for the front monster, whether or not it acted.
- KO clears status and episode immediately.
- Ordinary cleanse removes harmful statuses only.
- Cross-mode transfer is 1:1 between opening/overtime Clash and football, keeping duration and episode history.
- Healing Reduced from Faultline is uncleansable.

---

## 5. XP / rewards

### Current (file:line)

`battleXp` (xp.js:13-25), Model C2:
- `9 * (0.4 + 0.6*c) * (1.15 win | 0.85 loss) * gap`, rounded to 0.01 (xp.js:22; values.js:207-208).
- `c` is a share index: n * (0.45 dealt + 0.30 taken + 0.15 support + 0.10 KOs), each as a share of the side's totals (xp.js:20).
- `gap` = clamp(1 + 0.02*(opponent average overall - own overall), 0.85, 1.35) (xp.js:21).
- "support" accumulates:
  - heal and shield amounts (handlers.js:119, 127)
  - `round(atk*1.5)` per condition landed (engine.js:94)
  - self-heals (engine.js:80-81, 110)

Helpers in xp.js:
- `diminishing`: 1, .8, .6, .45, .35, .25, .2 (xp.js:28).
- `starterRate`: 1/3 (xp.js:35-38).
- `sessionXp` (xp.js:41-46).
- **`diminishing`, `starterRate` and `sessionXp` are not used by clash-link.** UNVERIFIED for other callers; grep found only exports.

Franchise reward (`applyBattleEffects`, clash-link.js:79-95):
- For each monster on the player's side, `Math.round(xp)` is added to `m.xp`.
- Levels go through the football loop: `xpForLevel = 30 + 18*level` (src/data/monsters.js:225).
- `levelUp` adds random attributes and banks 2 points (monsters.js:233-245).
- Fatigue is added: encounter 5, pregame 5, overtime 6 (clash-link.js:13; values.js:209).
- XP and level-up events go to the result screen (clash-battle.js:179-183).
- Rewards are paid once per resolve, idempotent through `status !== 'battle'` (franchise.js:1861-1863, 2689-2690, 2768-2769).
- AI-vs-AI battles award nothing.

**Mastery**: nothing exists. A grep for "mastery" in src/ returns nothing.

**Training bar**: none. Points come from `levelUp` (POINTS_PER_LEVEL 2, monsters.js:228).

### Task 8 change (spec §6, §8)

- **§6**: every *selected lineup member*, including unused reserves, gets **25 level XP** before archetype adjustment, and **25% of a training bar**.
  - Today it is a contribution-share formula of about 9 XP.
  - Each completed opening, standalone and overtime Clash awards participation separately.
  - Watch and Skip award identically.
  - Labs, reviewers, previews and replays award nothing.
- **§8 performance grade by archetype**: Offense, Defense, Support and Disruption contribution ratios with fixed archetype weights (Striker 60/20/5/15 ... Balanced 35/30/20/15).
  - `grade = clamp(2*avg-1, ±1) * sample(opportunities, 3) * weight * 0.20`, giving ±20%, so 20-30 XP.
  - The Offense, Defense, Support and Disruption ledgers need per-action attribution. Today's stats are only four totals (`stats: {dealt, taken, support, kos, acts}`, engine.js:57).
  - Disruption needs "stored attribution until use/expiry/end, including source in reserve or KO".
  - The R10 attribution ledger is unresolved (docs/beast-dex/UNRESOLVED.md:29).
- **§6**: positive performance adds a training bonus of `max(0, perf/0.20)*5` points, capped at 5.
- **§6 Mastery**: Clash mastery credit per valid execution, with thresholds 0/10/30/60. Passive and aura abilities get at most one credit per game. Opening and overtime share one cap; each standalone battle has its own. Stored independently from football mastery. All of it is new.
- **§6**: level-ups no longer award spendable points. This conflicts with `levelUp` (monsters.js:243), which is shared with football and is out of Clash scope.
- **§15**: rewards are awarded once per persistent activityID and monsterID, atomically. Today the guard is the record's status field, not an activity ledger.
- Exact fractions are kept internally. Today XP is rounded twice: xp.js:22, then Math.round at clash-link.js:83.

---

## 6. Validation, batch and balance tools, and Basics

### Current (file:line)

**`validateMoves`** (validate.js:16-46) checks:
- Every move id is a species and **every species has a move** (validate.js:18-19).
- Unique names.
- Known archetype, kind, trigger and effect keys (24-27).
- Archetype bands (30-39).
- No always-first priority (40).
- Exact `ARCH_COUNTS` (defined at validate.js:8, checked at 43).
- `cardCheck`: numbers and conditions named in the card text must exist in the params (49-57).

**Lab and test tools**
- `level1.js`: reference-team integrity checks and fire counts (`integrityProblems`, level1.js:15-30; `level1Check`, 37-66).
- `reference-teams.js`: fixed species teams (5-24).
- `batch.js`: synthetic monsters from SPECIES_DEX (15-20), win-rate families, Gate A/B plans (52-262).
  - `poolFor('random') = SPECIES_DEX` (batch.js:27).
  - Archetype pools come from `archetypeOf` (batch.js:12).
- `balance-manifest.js`: the gate and patch decision record, `finalMoveTable` (values 1.0.0 + approved patches = permanent table, balance-manifest.js:177-182).
- `stats.js` / `buildCombatant`: see §2.

**What breaks for a species without a move** (Basics)
- Today Basics are **not in `SPECIES_DEX`** at all: 72 entries, verified. `buildCombatant` throws `Unknown species <id>` (stats.js:30). Verified with `kindlet`.
- If Basics are appended to SPECIES_DEX without moves:
  - `buildCombatant` throws `No battle move for <id>` (stats.js:31).
  - `validateMoves` reports `<id>: no battle move` for each of the 120 (validate.js:19).
  - `archetypeOf` returns null (stats.js:23). Then:
    - `V.archetypes[null]` is undefined. The engine reads `V.archetypes[att.c.archetype].pierce` and `.shieldBreak` (handlers.js:73, 89), which would throw a TypeError. This path is only reachable if buildCombatant were relaxed.
    - `chooseLineup` ranks with `rank[x.archetype]`, which is undefined, so the sort key is NaN and the order is unspecified (ai.js:62-63, via `autoLineup`, clash-link.js:46-49). This is a determinism risk across engines. UNVERIFIED in practice.
  - `batch.js` 'random' pools would draw Basics and throw.
  - `speciesList()` would throw on `CLASH_MOVES[s.id].name` (stats.js:56).
  - Archetype pools (`BY_ARCH`) would silently exclude Basics.

### Task 8 change (spec §)

- **§16** validation must be rewritten for:
  - Dex archetype counts 14/15/15/13/15
  - the per-ability contracts
  - shared statuses
  - Basics with an explicit "no unique move" (BASIC_AUDIT §4.3)
- The bands (Tank=guard, Support=mend, Disruptor=hex/bench, Balanced mult exactly 1.3) are legacy design constraints that the Dex abilities violate.
- `cardCheck` assumes the old card grammar.
- The batch, Gate and manifest tooling targets the old move set. Retire or rebase it. **UNVERIFIED** which §16 "authorized tuning" ranges must be reproducible by tools (§16 not read in full).

---

## 7. Rounding

### Current (file:line)

| Quantity | Rule | Where |
|---|---|---|
| Damage per hit | `Math.round(atk*mult*ramp*type*spread*daze*guard*bonus)` | handlers.js:83 |
| echoFlat add-on | `Math.round(lastTaken*echoFlat*guard)` | handlers.js:85 |
| hitCap | `Math.round(maxHp*hitCap)` | handlers.js:86 |
| Shield absorbed | `removed = min(shield, dd*breakRate)`; `absorbed = Math.round(removed/breakRate)`; shieldPierce `Math.round(d*pierce)` | handlers.js:93-94 |
| Heal | `min(missing, Math.round(maxHp*share*k))` | handlers.js:117 |
| Shield grant | `Math.round(maxHp*share*healMult*half)` | handlers.js:126 |
| Regrow / glacier regrow, dragonhide, koHeal, regrowOnHit | `Math.round` of a maxHp share | engine.js:76, 80-81, 110 |
| Erupt / thorns, splash | `Math.round(atk*k*ramp)`, `Math.round(dealt*splash)` | engine.js:70-71, 213 |
| Burn tick | `Math.round(maxHp*0.06)` | conditions.js:40 |
| HP | `Math.round`; ATK and SPD `round2` | stats.js:39-41 |
| Half-action mult | `Math.round(mult*50)/100` | engine.js:209 |
| XP | round2 per battle, then `Math.round` when applied | xp.js:22; clash-link.js:83 |

Everything is round-half-up, `Math.round`. There is no floor anywhere in combat.

ATK is fractional (two decimals), so damage is computed in floating point and then rounded. This is deterministic in JavaScript IEEE double. The engine header restricts operations to `+ - * /` and round/floor/min/max (engine.js:3).

### Task 8 change (spec §9, §15)

- **Shared Burden**: floor the source share, give the remainder to the original target, conserve the raw budget (101 at 30% -> 30 and 71).
- **Mind Mend**: floor the donation, then floor the actual gain after healing reduction.
- **Root Communion**: whole-HP apportionment with stable-ID tie-break, not independent per-recipient rounding.
- **§15**: keep exact fractions internally for balances. Display rounding never changes balances.
- **Gap**: there is no global damage, heal or shield rounding convention in the spec sections read. Whether ordinary hits stay `Math.round` or move to floor is **UNVERIFIED**. Check spec §16/§18 and docs/beast-dex/UNRESOLVED.md. It looks like a pinned-convention item.

---

## 8. Event and phase order inside an exchange

### Current (file:line)

Engine header (engine.js:5-8), as implemented in the loop at engine.js:302-361:

0. `ex += 1`; compute the sudden-death ramp and the C6 heal multiplier (303-307). Reset `healsThisExchange`, `swappedThisExchange` and `halfAction` (308).
1. **Voluntary swaps**, side A then side B. Policy or manual decision. Swapping benches the old front and pauses its condition, then enters the new one (309-324, 161-169).
2. **Condition ticks** on both fronts: Burn damage and its KO, then expiry (325-331). Then replace, then the end check (332-333).
3. Opening effects, at exchange 1 only, patch-only (335-336).
4. **Back row** (`backRow`), side A fully, then side B, in line order:
   - Support mend/shield/cleanse/brace/haste/lift/charge/illusion/rally.
   - Disruptor bench condition or forced swap (245-294).
   - Then replace and the end check (339-340).
5. **Initiative** (342-350). Haste is cleared (350).
6. **First actor `act()`** (352-356):
   - Shock or unanswered skip (185-189).
   - Trigger evaluation (191-194).
   - `anywhere` bench swap as the action (196).
   - Mult setup, blink, unanswered/fakeFirst debuffs (200-209).
   - Hits (211).
   - Splash (213).
   - Strike conditions (hex, afflict) and sweeps (215-236).
   - Self-heal, dodgeNext, forge (237-241).
7. KO check (`ended()`). With reflected-KO fix, replace immediately (356-357).
8. **Second actor `act()`**. It is skipped if KO'd or no longer front (353-354).
9. **Replacements**, then the end check (360-361).

Inside one `hit()` (handlers.js:61-104):
1. Dodge, veil or illusion consumes the flag and misses. No RNG draw.
2. RNG spread roll.
3. Modifiers: daze, type, guard, brace, charge, rally, overcharge, forge, finisher, sudden-death bonus, echo.
4. Round.
5. echoFlat.
6. hitCap.
7. Shield absorb. A break fires `onShieldBroken`: erupt, thorns, breakCharge, regrow. These happen **before** HP damage is applied.
8. HP loss.
9. Bruise (Tank attacker).
10. Log.
11. `afterHit`: regrowOnHit, dragonhide, forgeOnHit, retaliation condition roll, KO of the defender, then the reflected KO of the attacker (engine.js:78-90).

**Delayed effects**: none, except multi-exchange flags checked by exchange number (rally, roar, unanswered, healCut).

**Protection**: guard and brace are multiplicative in the hit. Shields absorb. Dodge, veil and illusion are binary misses.

**Retaliation**:
- condition-on-hit (`retaliate`)
- damage-on-shield-break (erupt, thorns)

There are no damage counters.

**KO resolution** happens inside `afterHit` the moment HP reaches 0. Replacement waits for the next `replace()` call, except for the reflected-KO case (engine.js:34-38, 357).

### Task 8 change (spec §)

- **§9**: delayed events, charges, once-ledgers, cooldowns and readiness live in authoritative state.
  - Some Dex abilities need explicit order points. For example, Falling Star: "impact at end of following exchange after rotations", targets frozen at impact start, each target's reactions resolved before the next target.
  - Rendering and replay must not tick them.
- **§9 Glacier Wall**: the rebuild resolves only after the whole triggering hit and its attached effects. Today the regrow happens inside `onShieldBroken`, mid-hit, before HP loss (engine.js:76).
- **§9**: status-application ties at the same boundary keep event order, then stable sourceID, then abilityID.
  - Today side A always resolves before side B in swaps, ticks and the back row (`for (const side of [S.a, S.b])`). That is a fixed order, but it is not keyed on ID.
- **§10**: ticks move to the end of the recipient's normal turn (for Afflicted, before the decrement), not the start of the exchange.
- **§1 / §9**: the back-row phase (step 4) disappears or becomes explicit reserve-ability windows, such as Second Wind "before normal round initiative resolves" and Eclipse Call "first eligible start-of-round".
- **§10**: "Blocked status application does not cancel independent damage." Today a resisted condition already leaves damage intact, so this matches.

---

## Risks / surprises

1. **Archetype drift.**
   - 11 of 72 families change archetype (Dex vs code).
   - Archetype counts change: code Str 15 / Dis 16 / Bal 16 / Sup 15 / Tank 10, Dex 14 / 15 / 15 / 15 / 13.
   - Archetype is stored on the move row (stats.js:23).
   - This changes HP/ATK/SPD multipliers and perks for those 11 even before any ability work, and validate.js hard-fails it.
2. **Essentially a full rewrite of the move layer.**
   - No Dex Clash ability is implemented as specified: 0 match, 24 partial, 48 different.
   - Six reuse the old name with a different mechanic, which risks reviewers assuming they are done.
   - The Dragonhide mechanic in code belongs to Dex Wing Shelter (sablewing), not to scaleguard.
3. **Back-row model contradicts spec §1.** Supports heal and Disruptors act from reserve every exchange. Removing this is a large balance change, and all Gate A/B evidence (balance-manifest.js) is invalidated.
4. **Franchise policy is "no voluntary rotation"** (clash-link.js:28). Several Dex abilities only trigger on voluntary rotation, so the rotation UX and policy must be decided. **BLOCKER** per spec §1.
5. **No turn-based clock.** Duration, cooldowns and charges in the Dex use "owner normal turns" or "recipient normal turns". The engine counts exchanges and ticks only the front. Verified probe: a 3-duration Burn deals 3 ticks but affects only 2 actions.
6. **Shield is a free-stacking numeric pool, not a status.** Under §10 it becomes Shielded, occupying the single slot with episode rules. This interacts with every Tank entry shield, and with Glacier Wall and Bramble Shell.
7. **Mastery does not exist anywhere** in src. Every Dex Clash ability has mastery-indexed values, so mastery is needed before abilities can be parameterized.
8. **XP model mismatch.** About 9 XP from a contribution share vs spec 25 ±20% performance graded by archetype. Training bars do not exist. `levelUp` still banks points, which spec §6 retires; that is a shared football concern.
9. **Basics cannot battle.**
   - Not in SPECIES_DEX; buildCombatant throws.
   - Shared type moves are unspecified (BASIC_AUDIT §4.4.2). **BLOCKER** for any Basic in a Clash lineup.
   - The NaN-rank sort in `chooseLineup` is a latent nondeterminism if archetype is null.
10. **Twelve-status list (Appendix B) not present in the repo.** Only about 10 names can be inferred. **UNVERIFIED.**
11. **No rounding convention for ordinary hits** in the read sections. Only the three HP-transfer abilities specify floor.
12. **Stale isolation comment** at index.js:2-3 ("nothing in src/franchise imports from src/clash"). clash-link.js imports it by design. tests/clash/boundary.test.js:12-13 documents the exception.
13. **All golden hashes will change** (tests/clash/fixtures/golden*.json). The `v1.0.0` ruleset and replay-key compatibility (engine.js:397-403) may be dropped under the §15 fresh-save break. Owner confirmation **UNVERIFIED**.
14. **The spec header** (SPECIFICATION_BASELINE.md:1) says it is a historical snapshot superseded by APPROVED_RULES.md and forms.json for profile, rarity and evolution. The Clash sections read here (§1, 6, 8-10, 15) are cited as the shared engine requirements. **UNVERIFIED**: I did not cross-check APPROVED_RULES.md for Clash overrides.
