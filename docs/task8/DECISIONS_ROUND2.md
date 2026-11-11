# Task 8 decisions, round 2

This answers every open item from the owner's round-1 response; the [decision register](DECISIONS.md) holds the round-1 rulings. Item numbers match the Phase 1 audit.

- **Evidence:** the code at `cbd0d77` (unchanged since) and the Beast Dex contracts. Engine and economy facts come from two read-only reviews, which cite file and line. Their key numbers are repeated here.
- **Proposals:** each is labelled **G** (gameplay, needs approval) or **T** (technical, veto only).
- **Items needing an answer** are collected at the end in **one numbered list (R2-1 … R2-22)**.

No gameplay, data or art has been changed.

---

## Progression and data

### #3 Veteran generation, and #4 starting history

**What exists today.**
- Every generated veteran starts at level 1, whatever its age:
  - FA arrivals, ages 24–30;
  - offseason market veterans;
  - founding rosters, ages 20–28.
- The AI's evolve-stage jumps and the rival's level 1 + 3 × seasons affect only a legacy strength target, not real monsters.
- A season is 9 games (10 weeks with a bye) plus 0–3 playoff games.

**A missing rule found while answering.** The new model has no level-XP curve. Today's curve (30 + 18 × level) needs 23,520 XP to reach level 50. A full-time starter under the approved awards earns about 450–600 football XP a season (50 per game ± 20%). At that rate, level 50 would take about 40 seasons, against the approved target of a median of 5–8.
- The curve is not one of the permitted tuning parameters, so it needs your approval: **R2-1**.
- **Proposal (G):** a flat 75 XP per level, i.e. 3,675 XP to reach level 50, with the approved multiplier (0.5–2.0) tuned so that the median mixed-participation starter reaches 50 in 5–8 seasons.

**Proposal for veterans (#3) and starting history (#4) (G):** no closed formula. A veteran is generated at level 1 from its approved rolls, then **its prior seasons are simulated** with the approved model, using a participation profile drawn from what real monsters of the same role get:
- football games and snaps;
- Clash battles;
- reserve-development slots.

The simulation includes:
- level XP and the natural-growth schedule;
- training bars from participation and performance;
- the 2-point offseason award;
- AI training allocation;
- evolution when eligible;
- ageing decline.

So veterans "resemble monsters developed through actual gameplay" by construction, and the starting-history allowance (#4) falls out of the same simulation instead of a fixed number of points.
- **Why 2 points a season was too low:** an ordinary starter earns about 2.25–3 training bars a season from football (25% a game), plus Clash bars and the 2 offseason points, so roughly 4.5–7 points. That confirms your concern.
- **Acceptance test (T):** over 1,000 generated veterans per position and age, compare level, rating-to-ceiling ratio and evolution stage against monsters that actually played the same number of seasons in benchmark leagues. Generated and played distributions must match within agreed tolerances. **R2-2** asks you to approve the method and tolerances (proposed: median within 1 level and 2 rating points; quartiles within 2 levels).
- **Prospects stay at level 1** (approved).

### #5 Missing ability values (choose together)

The Dex was scanned for missing numbers and placeholders. The figure of five missing values was an overstatement: Victory Surge does give 60/70/80/90% by mastery, and Clean Sweep says "Same mechanic across all evolutions and mastery". What is genuinely missing:

| Ability | Approved text today | Missing number |
| --- | --- | --- |
| **Stoke the Flame** (Flaroo Clash) | Core: "At three charges, immediate Fire counterburst outside normal turn; reset charge." Progression: "Damage scales by form/mastery. No status or splash." | Counterburst damage, as % of normal attack, for each of Flaroo / Blazynx / Infernox × 4 mastery tiers |
| **Blazing Resolve** (Flaroo football) | Trigger: "Completed official rushing attempts only. Three qualifying charges ignite… Positive whole-yard thresholds are in Progression." Progression: "Guaranteed tackle-break window is explicitly approved. Not the legacy Eruption flatten/stun." | Minimum rushing yards for a carry to earn a charge, and whether it differs by form or mastery. (The one-second window is replaced by the encounter rule in spec §9.) |
| **Beacon Lane** (Lumini football) | Lifetime: "created common field clears half. Spawn play counts." Progression: "Keep existing creator lifetime/placement/mastery." | The field's lifetime in plays (and any mastery scaling). No value exists to "keep". |
| **Pressure Drain** (Crustank football) | "Normal play cost remains provisional pending testing." | Not missing: a value to be tuned in testing. Listed for completeness. |

Separately, **seven abilities** in families with more than one form give values by mastery tier without saying whether forms differ: Lightning Rod, Emergency Cover, Beacon Lane, Dawn Song, Anchor Plate, Iron Lungs and Tempered Guard. Most other multi-form contracts say "same across forms" explicitly. **R2-3** asks you to confirm these apply equally to every form; **R2-4** asks you to set the missing values.

### #6 Attribute roles

- **TE Strength and contested catches is not approved.** Appendix C gives TE contested catching to **Agility**, and TE Strength covers push and press resistance, tackle breaking and fumble resistance. Only **WR Strength** is approved for contested catches. I have dropped the TE Strength addition. Nothing to approve unless you want it as a new rule.
- **Where the engine changes under the approved roles.** This is how I will re-route the engine. Weights keep today's magnitudes unless noted, and new consumers get the defaults shown (T, reported for review):

| Approved role (Appendix C / §12) | Engine today | Change |
| --- | --- | --- |
| Speed: maximum speed **and acceleration** | Acceleration uses Agility | Acceleration from Speed |
| Agility: turning and cuts | Braking and turning use the Agility-based acceleration | Turning rate from Agility |
| Strength: fumble resistance (QB, RB, WR, TE, LB, CB, S, K carrying). RB Catching also resists fumbles. WR/TE Catching does not. | Catching decides every fumble | Strength (plus Catching for RB only), same magnitude |
| WR Strength: contested catches | not used | Added at the 0.3 weight Agility has |
| Shedding a block: **Agility primary** for DL, CB, S; **Strength primary** for LB | One formula for everyone: 0.5 Strength, 0.3 Agility, 0.2 Tackling | DL/CB/S 0.5 Agility, 0.3 Strength, 0.2 Tackling; LB unchanged |
| Awareness directly improves tackle success for DL and LB only; **not** for CB and S | The arm-tackle chance uses Awareness for every defender | Restricted to DL and LB |
| DL Catching improves strips; LB/CB/S Tackling drives strip attempts; K gets no strip bonus | Strips come only from ability keys | New strip term, default ±20% around today's rate |
| QB Awareness improves accuracy while moving | Not separately modelled | Moving-throw error reduced by Awareness (default up to 25%) |
| OL Tackling finishes a winning block into a pancake; OL Awareness judges risk and recovery | No pancake exists | See #7 |

### #7 Pancake contest (revised: no timer, Awareness-based recovery)

The engine already computes one signed **advantage** for every engagement, every tick, with no timer: `edge = (defender score − blocker score) / 100`, type-scaled. Blocker score = 0.6 Blocking + 0.4 Strength. Defender score = the position's shed formula (#6).

**Proposed contest (G):**

1. **Opportunity (advantage, not time).** An OL has one attempt per play (approved). It is offered the first time the OL-side advantage `A = −edge` reaches **0.10** during an engagement (the OL's weighted block score leads by 10 points). The check runs when the engagement starts and whenever the block changes between pass and run. A pancake guarantee (Clean Sweep, Dragon Stomp) uses its own rule.
2. **Success:**

   ```
   p = clamp(0.30 + 1.5 × (P − R)/100, 0.05, 0.80)
   ```

   - P = 0.4 Strength + 0.4 Blocking + 0.2 Tackling (OL)
   - R = 0.6 Strength + 0.4 Agility (defender)
   - both type-scaled

   Success applies Knocked Down through the shared status gate for the rest of the play (approved).
3. **Failure: Awareness decides recovery, never an automatic Stumbled.**
   - recover = clamp(0.30 + 0.60 × Awareness/99, 0.30, 0.90).
   - On recovery the engagement continues unchanged; only the attempt is spent.
   - Otherwise the engagement ends and the OL *attempts* Stumbled through the shared gate: 40% current-speed loss, ordinary re-acceleration, legal re-engagement only (spec §9).

**Worked example:**
- OL: Strength 70, Blocking 75, Tackling 40, Awareness 60, so block score 73 and P = 66.
- DL: Strength 60, Agility 65, Tackling 50, so shed score 60.5 and R = 62.
- Advantage A = 0.125, so an attempt is offered. p = 0.30 + 1.5 × 0.04 = 0.36.
- On failure, recovery = 0.66.
- An evenly matched pair never reaches the threshold, so pancakes come from genuine mismatches.

All constants are starting values for testing. **R2-5** approves the structure.

### #8 Grading telemetry (revised)

These are **measurements only**; they change no gameplay (T, shown for approval as **R2-6**).

- **Pressure = verified disruption.**
  - Credit a defender only when he causes the QB to act differently: an early or altered throw, a throw made under the engine's pressured-throw error, a scramble start, a sack or a hit. Merely being near the QB does not count.
  - The defender credited is the one whose presence produced the engine's pressured state at that moment.
  - "Allowed by" is the blocker this defender shed on this play, if any. Otherwise it is unblocked, or a QB holding the ball past his read (no OL penalty).
  - A **hit** is contact on the QB at or after release.
- **Viable window, relative to responsibility.** The engine already computes, every tick, how much ground a defender can make up while the ball is in the air. It uses his actual top speed and the receiver's actual route position, so **different receiver and defender speeds are built in**. The proposal measures that margin for the *responsible* defender only:
  - **Man:** the defender keyed to that receiver.
  - **Zone:** the defender whose zone area contains the receiver, or who has picked him up. Deep zones are side-to-side bands; flat and middle zones are circles around a landmark.
  - **No defender responsible** (a hole between zones, or a busted coverage nobody owns): no execution credit or penalty.
- **When a window counts as viable.** A window is viable when, on some tick while the throw is possible (QB holding, not sacked, route ready to be thrown), the responsible defender could not reach the catch point in time by at least **1.0 yd**.
  - **Short routes under deep coverage:** a deep defender conceding an underneath route is not "responsible" for it, because the route is outside his zone.
  - **Grading:**
    - −1 if the window opened against the defender's own responsibility;
    - +1 if he kept it closed on a play where his receiver was a live option;
    - 0 otherwise.
- **Gap and contain:** read from the play call's assignments. A gap failure is credited only when the run goes through that defender's assigned gap while he is out of it.

### #9–12 Player-facing rules text (approved; text for review)

> **End-of-season training points.** Every monster in the league at the start of the final regular-season week earns 2 training points when the season rolls over: on your roster, another club's roster, the reserve pool or free agency. That includes rookies, veterans, legendaries, Apex monsters and monsters at level 50. Monsters that arrive after that week (for example, through the draft) start earning next season. Retired monsters do not earn them.

Apex keeps its approved reserve-development exceptions: no age or headroom restriction.

### #13 Benchmark freeze (approved with condition)

- The schedules cover three participation levels: ordinary starters, mixed football and Clash use, and maximum legal participation.
- Seeds 1–100 per position are used in full, with no selection.
- Every generated career is reported, including retirees and poor developers.

### #14 Apex contract

**Today's numbers.**
- Salary = 18,000 + 280 × OVR: OVR 40 → 29,200; 55 → 33,400; 70 → 37,600; 85 → 41,800; 99 → 45,720.
- The Challenger cap is 1.8M. AI clubs have room of cap − 405,000 staff − payroll, typically 86k–235k.
- An undeveloped Apex (attributes 10–15, OVR about 12) would cost **about 21,400, the cheapest monster in the league**, which spec §5 forbids.

**Two concrete options (G, R2-7):**
- **A, halfway to ceiling (recommended).** Ask = salary(current OVR) + 0.5 × (salary(OVR 99) − salary(current OVR)).
  - Undeveloped Apex: 21,360 + 0.5 × 24,360 = **33,540**, about an ordinary OVR-56 starter.
  - It rises with development and reaches the top at full development.
  - No projection model is needed.
- **B, three-season projection.** Ask = the larger of salary(current OVR) and salary(projected OVR in three seasons).
  - Projected OVR for an undeveloped Apex is about 30–35 under the proposed XP curve: about 22 levels of natural growth from an allowance of 43, plus training. That gives about **27,000–28,000**.
  - It depends on the XP curve (R2-1), so it is less predictable.

**Cap benchmark (T):** over 20 simulated seasons, report:
- an Apex's ask as a % of cap, against an ordinary starter at the same OVR;
- the share of AI clubs able to afford an available Apex;
- the number of Apex in the league each season (they are ageless and accumulate);
- Apex payroll share per club.

All of this also depends on the economy recalibration (#30), because the current salary curve is very flat: a star costs only 1.4× a depth player.

### #16 Football Stunned versus multi-play durations

- The three approved football abilities that apply Stunned are Charge Strip, Static Field and Snowfall Slam. All three say it lasts the rest of the current play and clears at the whistle.
- No Clash ability applies Stunned; the Clash contracts only count Stunned skipped turns.
- So **no approved content produces a multi-play football Stunned today.**
- **Future rule (G, R2-8):** if a Stunned with remaining plays ever exists, from a future ability or a cross-mode transfer, each counted play it covers is fully disabled from the snap. The play on which it is applied is not counted (spec §10). Duration still counts only plays the monster participates in.

### #19 Event order (the full list for approval: R2-9)

**Beast Clash, one exchange:**

1. **Round start:**
   - reserve start-of-round hooks in stable ID order (Eclipse Call, then Second Wind before initiative);
   - Cold Welcome's Slowed on a fresh entrant is already in place from its entry.
2. **Initiative:** explicit interrupts, then priority attacks (Night Swoop), then ordinary speed, then a seeded tie.
3. **Each actor's normal turn, in initiative order:**
   1. Turn-start adjustments (Lightning Rod's transfer and its immediate one-turn decrement).
   2. Stunned check. A skipped turn still counts as a turn.
   3. Choose the action. A team support action (Feather Relay) replaces the attack.
   4. **Launch:** pay costs (Dragon Pounce HP), spend once-uses, lock targets, the Confused redirect roll, launch accuracy (Snowbank Shot).
   5. **Interception before evasion:** Stone Divide cancels one strike.
   6. **Evasion:** dodge, decoy or miss (#27).
   7. **Lethality hooks before damage:** Emergency Cover redirect, Last Root survival at 1 HP.
   8. **Damage:** Guarded reduction, then the shield pool, then HP; Shared Burden split.
   9. **Attached effects** of the hit: status application through the shared gate (blocked status never cancels damage), Spore Detonation removal.
   10. **Retaliation and reactions** to the hit (Molten Brand, Stoke the Flame, Riptide Pursuit). No reaction chains.
   11. **After the whole hit:** Glacier Wall rebuild, Wing Shelter heal, Mirage Veil, Forge Swipe, Shadow Pounce counter, Rubble Reprisal.
   12. **Follow-ups that need retaliation resolved first:** Twin Thunder bolts, the Bank Shot ricochet.
   13. **Knockouts:** clear status and episode, replacement steps in, entry effects run, then Victory Surge's follow-up.
   14. **End of turn:** Afflicted damage, then that turn's duration decrements, then Dawn Song pulses and owner and recipient countdowns.
4. **Rotation phase:**
   - voluntary requests, with Cinder Clamp's delay;
   - Riptide Pursuit hits before the departure;
   - Shell Harvest cashes the remaining shield;
   - entry effects, then Cold Welcome and Downdraft on the new entrant.
5. **End of exchange:** delayed impacts land (Falling Star, Faultline), with targets frozen when the impact starts.
6. **End check:** a double knockout goes to the existing seeded coin.

Within any one step, simultaneous events follow §9: event order, then source ID, then ability ID.

**One open placement.** Today voluntary rotation happens at the *start* of each exchange. The list above puts it *after* both actions. That is the only order that satisfies "impact at end of following exchange after rotations" and Cinder Clamp's "next legal rotation opportunity" at the same time. **R2-10** confirms the move.

**Football, one play:**
1. **Pre-snap:**
   - pending fields are placed against the upcoming formation and shown before both teams choose;
   - absences are served (Sovereign Arm);
   - manual activation (Vyrnax);
   - the formation is locked.
2. **Each tick:**
   - status disables (Stunned, Knocked Down);
   - field effects on movement;
   - steering;
   - engagements and the pancake check;
   - movement;
   - contacts, tackles and fumbles (Shielded saves a fumble here);
   - ball flight and catches;
   - ability triggers in event order.
3. **Whistle:**
   - result;
   - cleanup of within-play effects (Stumbled, Knocked Down, rest-of-play Stunned, objects, clones);
   - telemetry closed.
4. **End of play:**
   - stamina drain;
   - status durations decrement for participants (the application play excluded);
   - field lifetimes;
   - charges and cooldowns advance;
   - mastery credits;
   - pending effects queued for the next snap.

### #21 Special-teams participation (revised)

**Actual actors today.**
- Kicks are formulas. Only two monsters are read: the **K** for every kick (no separate punter), and **one returner**, the first filled of WR2, RB, WR1, CB2.
- No blocker or tackler exists on a return. No tackles or return yards are credited.
- Onside recovery reads only the kicker.
- Two-point tries use the full engine and the scrimmage units.

**Dex abilities that need more than this:**
- **Dawn Signal** targets a kickoff-coverage teammate.
- **Stone Cradle** ends a caught punt.
- **Echo Landing** and **Gear Grid** are earned by kick results.

**Options (G, R2-11):**
- **A.** Participants = K + returner, as today. Dawn Signal cannot work.
- **B, recommended.** Each kick play gets a declared **unit of 7 per side** from a special-teams depth list: kicking unit = K + 6, receiving unit = returner + 6. The kick still resolves by formula.
  - All 14 "participate" for status counts, stamina drain and rewards.
  - The return formula reads the coverage unit's speed, which gives Dawn Signal's Quickened a real effect.
  - The return names a tackler, so tackles are credited.
- **C.** Build full special-teams physics. Large, and not requested.

### #22 Stamina and Afflicted (revised)

- **Afflicted keeps its fatigue-resistance effect (G, R2-12).**
  - While Afflicted, each counted play drains **1 × (permanent Durability ÷ effective Durability)** stamina, kept as an exact fraction. Example: −20% effective Durability means 1.25 per play.
  - Capacity (permanent Durability) never changes.
  - Afflicted also uses the lower effective Durability in injury checks.
  - The legacy weekly fatigue penalty is retired (approved in spirit), so there is no double punishment.
- **Exhaustion timing (T).**
  - Stamina is deducted at the end of each completed play. Reaching 0 sets the exhausted flag **at that moment**.
  - If the last overtime play empties a monster, it enters the deciding Clash exhausted, with every attribute halved once, as spec §12 requires.
  - Halftime restoration does not clear the flag.

### #23 Saving mid-Clash

- **Today:** the whole battle is computed at the start from its seed, so the result is fixed immediately. Rewards are applied only when it finishes. Closing the app mid-battle loses nothing except the viewing position: the battle replays from the start, with the same result.
- **With player rotations (approved),** each decision is recorded. **Proposal (T, R2-13):** save the recorded decisions and the last completed exchange.
  - On reopening, the battle is rebuilt from the seed plus decisions and resumes at that exchange. **Progress between completed exchanges is preserved.**
  - The engine stops at the first undecided rotation instead of assuming "stay".
  - Rewards stay a single once-only step at the end.

### #24 Caps (actual limits)

From the contracts, the most any single source can have is 2 active field rectangles (Bloom Break, Crosswind Rescue) plus one pending field. Physical objects per play peak at 2 guards, 2 gate panels, 2 snowball obstacles, 1 clone, 1 wall, 1 tornado and its blasts, and Living Terrain's 4 clumps per overlap.

**Proposed limits (T, R2-14):**
- 32 active field rectangles on the pitch;
- 24 physical objects per play;
- 4 vine clumps per connected overlap (approved);
- in each Clash side: 4 delayed effects and 2 constructs.

These are **at or above the most the approved abilities can create at once**, so a legitimate spawn never reaches them. A test enforces that bound.

If a spawn would ever exceed a limit, that is a defect:
- the spawn still happens, and nothing is deleted;
- a diagnostic is logged and the test suite fails;
- only optional particles may be reduced.

**Placement when a spot is occupied:** a deterministic search outward on a ½-yard grid. Ties go to the smaller lateral offset, then the smaller depth offset, then the stable ID. When nothing legal exists, the ability's own no-placement rule applies (for example, Stormguard summons only if both guards fit), otherwise readiness is kept.

### #25 Functional test matrix and probability acceptance (revised)

**Cases are built from the contract, not repeated.** Each ability's 100 cases are distinct setups, and each cites the contract clause it tests:

| Category | Typical share | Examples |
| --- | ---: | --- |
| Triggers | 20 | each trigger clause, boundary values, near-miss non-triggers |
| Eligibility and targets | 15 | single, multiple, none, invalid, tie-breaks, same-type neutrality |
| Charge, cost, cooldown | 15 | build, spend, preserve-on-fail, pause conditions, cooldown units |
| Effect | 10 | core result; each form and mastery value once; magnitude boundaries |
| Status gate | 10 | blocked, equal, stronger, weaker, 3-application cap, cleanse |
| Lifetime and carryover | 10 | possession change, halftime, OT, mode transfer, save and reload, game end |
| Cleanup and source loss | 10 | whistle, KO, rotation, bench or absence |
| Interactions | 10 | fields and overlaps, the counters and exceptions the contract names |

- Duplicate setups are rejected automatically.
- If an ability genuinely has fewer than 100 meaningful cases, the shortfall is reported to you, not padded.

**Probability acceptance.**
- Each probabilistic rule is tested on a fixed seed list, so results are reproducible and never flaky. N is chosen so that a correct implementation lands inside a ±h band with 99.9% confidence: N = 3.29² × p(1 − p) / h².
- Pass if |observed − p| ≤ h. h = 0.02 for small and medium p, 0.05 at p = 0.5, and 25% relative at very small p.

| Rule p | h | N |
| ---: | ---: | ---: |
| 0.01 (Apex) | 0.0025 | 17,150 (a report, per spec) |
| 0.15 (Static Field) | 0.02 | 3,450 |
| 0.20 (Charge Strip) | 0.02 | 4,330 |
| 0.30 (Splashdown) | 0.03 | 2,526 |
| 0.50 | 0.05 | 1,083 |

**R2-15** approves this method.

### #26 Half-strength entry (explained)

- **Rotation cadence today:** at most one voluntary swap per side every 4 exchanges.
- **What "half strength" does now:** the incoming monster **still acts that exchange**, with these changes:
  - its damage multiplier, heals, shields and status-application chances are **halved**;
  - effects without a size are **withheld** (sweeps, dodge set-ups, stacking boosts, lifts);
  - its entry effects (an entry shield, for example) stay full;
  - its defensive reactions when hit are unaffected.
- **One quirk:** the legacy Blink move skips the halving.
- **The alternatives the engine already supports:**
  - **free:** the incoming monster acts normally;
  - **action:** the swap uses up the side's action.

**R2-16:**
- choose half (recommended, the previously approved rule), free or action;
- confirm that for the Dex abilities "half" means damage, heals, shields and status-application chances are halved, and that triggers and charges still progress.

### #27 "Normal evasion"

**How the contracts depend on it.** 44 of the 72 Clash contracts refer to evasion, misses or accuracy.

- **No base evasion exists anywhere.** The only evasion *sources* in the Dex are Heat Mirage's entry decoy and Snowbank Shot's own 80% launch accuracy. Shadow Pounce, Predator Rhythm and Mirage Veil explicitly grant no dodge.
- **Three abilities trigger *on* a miss:** Shadow Pounce, Mind Game and Arc Rebound. Without base evasion they would almost never fire. Shadow Pounce and Mind Game need the *enemy's* attack to miss the source, and the source has no way to create that.
- **Riptide Pursuit was made "undodgeable"** explicitly "over initial normal-evasion recommendation", which shows the designers assumed ordinary evasion exists.
- **About 30 abilities** say "normal / ordinary / standard evasion applies" or "spent even if evaded" (Falling Star, Shared Burden, Wash Away, Riptide Charge, Spore Detonation, Canopy Assist, Phase Strike, Circuit Breaker, Victory Surge, Twin Thunder, Emergency Cover, Rubble Reprisal, Bank Shot, Gust Hop, Night Swoop, Ambush, Refraction, Radiant Pursuit, Daybreak Lance, Gear Shot, Iron Bite, Echo Strike, Astral Strike, Dragon Pounce, Dragonhide, Dragon Roar, Sovereign Balance, Faultline, Cold Welcome, Foresight).
- **Critical hits:** only Gear Shot mentions them ("critical system if any"). There is no approved critical-hit mechanic to preserve.

**One consistent resolution (G, R2-17), recommended:** add an **ordinary evasion check** to every evadable direct attack, from the existing attributes:

```
evade = clamp(0.06 + (defender Agility − attacker Awareness)/500, 0.02, 0.12)
```

- That is about 6% between equals, 2% at worst and 12% at best. It is rolled once per hit, at the evasion step in #19.
- Decoys (Heat Mirage) and accuracy checks (Snowbank Shot) stay on top of it.
- "Cannot be evaded" abilities (Riptide Pursuit) skip it.
- With this, the three miss-triggered abilities fire at a reasonable rate. Shadow Pounce, for example, would fire in roughly 40% of the battles where its owner takes 8 attacks.
- **Alternative:** no base evasion, i.e. only decoys and launch accuracy. Shadow Pounce, Mind Game and most of Arc Rebound become near-dead, and "undodgeable" means nothing.

### #28 The ten shared traits

These are legacy common traits; neither the shared type rules nor the archetype perks are among them. Every family carrying one has its own Dex football signature, and Basics never carried them.

| Trait | Effect today | Carried by (family) |
| --- | --- | --- |
| Quick Feet | +2 Agility; brief speed after a catch or handoff | Flaroo (RB), Spriglet (WR), Gustling (WR) |
| Anchor | +4 Strength in pass-block engagements | Muddlet (OL), Pebblit (OL), Ferrcub (OL) |
| Hard Hitter | +4 Tackling; forced fumbles ×1.3 | Cindruff (LB), Craggo (LB), Drakling (RB) |
| Slick | Fumbles ×0.5; slips arm tackles +6% | Volcoil (RB), Zephyroo (RB) |
| Sticky | +4 Coverage in man coverage within a step | Aquip, Frostpup, Umbrikit, Wispira (all CB) |
| Sharp Eyes | Reacts 0.1 s sooner to throws | Noctlet (S), Psyflutter (S) |
| Steady Leg | +4 Kicking, always (its text says "under pressure") | Flurrit (K), Solchirp (K) |
| Soft Hands | +4 Catching on contested balls | Zippit (WR), Lumini (WR) |
| Bull Rush | +4 when shedding a block | Mossmaw (DL) |
| Iron Lungs | Weekly fatigue gain ×0.75 | Steelpaw (LB), Wyrmlet (TE) |

They are used only through the species effect in the football engine, plus a small on-field icon. The football type matchups and the Clash archetype perks are separate systems and stay unchanged.

**R2-18:** retire all ten. Steelpaw's own Dex signature is a new, different Iron Lungs.

### #29 Nature's side effects

**What Nature does besides the ×1.1/×0.9 rating multiplier (all being removed):**
1. **Media day:** each press answer is tagged with a nature. On Sunday, the owner's starters of that nature get **+3 (cap 4)** to the nature's favoured attribute, plus +1 Awareness. The separate hype (+2 before a rival game) and star (+2 to the best monster) boosts are not nature-based.
2. **Press question choice:** questions are weighted by the natures on your roster.
3. **Pregame reply to the rival coach:** "confident" gives +1 to physical-nature starters; "respectful" gives +1 to mental-nature starters.
4. **Contract counter** (legacy offseason only, not Task 7): calm natures accept a counter +15%, fiery −15%.
5. **Free-agency persona** (Task 7, every club):
   - calm natures: patience +12, timing −5;
   - fiery natures: patience −12, money +8;
   - patience sets how long a free agent waits, and money its pay emphasis.

**Ambition today (Task 7)** changes how money, security, role and winning are weighted in offers, plus negotiation style. It **never touches patience or timing**. Re-keying Nature to Ambition would double-count money and leave patience and timing without an input, so I don't recommend it.

**Proposal (G, R2-19):** retire every Nature effect rather than moving it.
- Media day keeps the hype and star boosts. The nature-targeted +3 is removed, and press answers become flavour plus the existing non-nature effects.
- Press questions are chosen without nature weighting.
- The pregame reply keeps its rattle/hype outcomes but drops the nature-group +1.
- The legacy contract counter is retired with the fresh-save break.
- The FA persona keeps its hash-based priorities and career stage, minus the calm/fiery terms.
- Temper affects training only.

### #32 Cornerstone offers

- **What an offer requires today:**
  - Uncommon or Rare;
  - **not a K**;
  - the three offers must have different positions and different elements;
  - quality 68–70.
- **What happens on selection:** the chosen monster replaces the first monster at its position. It gets +3,000 salary, can never be traded or proposed for release, and is preferred as captain.
- **Granigor is in two places:**
  - the offer pool (offered in 7.7% of new games). As a K it leaves the pool **automatically** under the existing "not K" rule.
  - a fixed legacy list, used only when importing a pre-Task-7 save. There it would turn your best DL into a kicker. The fresh-save break retires that import path.
- **Options (G, R2-20):**
  - **A (recommended):** keep "no K cornerstones". Granigor stays K and is simply no longer offered, and the fixed legacy list is retired with old-save import.
  - **B:** allow K offers, which brings in every eligible Uncommon/Rare K.

### #35 Scouting and AI information

**Today:**
- **Draft:** reveal levels 0–6 per prospect (6 shows potential, nature and the full report). Your scout fully reveals 1–3 prospects a week from week 10, plus 3 glances.
- **Regional recruits:** what you see depends on your scout's skill in that biome (potential at skill ≥55, nature at ≥70). Recruit knowledge resets weekly and is not stored per monster.
- **Free agents:** always fully known.
- **The AI has no scouting at all.** It reads true potential and OVR in about ten places: draft picks, FA value, keep/release, trade value, development slots, successors.
- **Two leaks also favour the player:**
  - a recruit card shows the exact salary, which reveals the hidden OVR;
  - the GM Assistant's draft advice uses unrevealed potential.

**Proposal (G, R2-21):** the AI follows the same information rules as you.
- Each AI club gets a scouting level and reveals prospects with the same rules.
- Before something is revealed, the AI uses the same public information you see (board rank, position, age, visible ratings).
- Monsters on its own roster are fully known to it, as yours are to you.
- Free agents stay fully known to everyone (approved v42.11 rule), *except* Temper and Apex, which follow spec §3 and §5.
- I will also fix the two player-side leaks (T): show a salary estimate, and drop hidden potential from the assistant's advice.

### #36 Basic appearance rates by channel

A single per-family weight cannot control the Basic share, because each position has **12 Basic families** against only 4–8 originals:
- A weight of 40 gives Basics about **68%** of picks.
- In the channels that pick families uniformly today (draft, encounters, offseason market, arrivals), Basics would be **67%** with no weight at all.

| Channel (today's rule) | Today, originals only (C / U / R) | If Basics were added with no rule change |
| --- | --- | --- |
| Founding and AI rosters, roster fill (weights C60 U30 R9) | 68 / 27 / 5 | 0% Basic (weight missing; they'd never appear) |
| Regional scouting (C60 U30×b R9×b, legendary 14×b when unlocked) | about 63 / 32 / 6 at average scout skill (57–68 / 27–37 / 5–7 across skills) | about 32% Basic (Basic falls into the rare weight) |
| Draft, encounters, offseason market, arrivals (uniform by family) | 43 / 35 / 22 | 67% Basic |

**Proposal (G, R2-22): pick the rarity first, then a family.** Each channel gets a fixed **Basic share s**. The remaining 1 − s keeps today's mix among the original rarities exactly. Then a family is picked uniformly within that rarity at the needed position.

Recommended shares, with the resulting overall mix:

| Channel | Basic share s | Resulting Basic / Common / Uncommon / Rare |
| --- | ---: | --- |
| Founding and AI rosters, roster fill | 25% | 25 / 51 / 20 / 4 |
| Regional scouting | 25% | 25 / 47 / 24 / 4 |
| Encounters | 30% | 30 / 30 / 25 / 15 |
| Draft | 35% | 35 / 28 / 23 / 14 |
| FA arrivals and offseason market | 40% | 40 / 26 / 21 / 13 |

- Legendaries keep their own special routes.
- Apex is an independent 1% after the family is chosen (approved).
- Alternatives: a single share for every channel (for example 30%), or lower shares if Basics should feel rarer.

---

## Items for your answer (round 2)

| # | Decision | Recommendation |
| --- | --- | --- |
| R2-1 | **New:** level-XP curve to level 50 | Flat 75 XP per level (3,675 total), tuned with the approved multiplier to the 5–8 season median |
| R2-2 | Veteran and starting-history generation | Simulate prior seasons with the approved model. Accept if generated and played distributions match (median ±1 level, ±2 rating points; quartiles ±2 levels). |
| R2-3 | Values given only by mastery apply to every form (7 abilities) | Confirm |
| R2-4 | Missing values: Stoke the Flame damage (3 forms × 4 tiers); Blazing Resolve qualifying-yard threshold; Beacon Lane field lifetime | Owner to set |
| R2-5 | Pancake contest structure (#7) | Approve: advantage 0.10 opens the attempt; success formula; Awareness recovery |
| R2-6 | Grading telemetry definitions (#8) | Approve |
| R2-7 | Apex contract ask | A: halfway between current-OVR and OVR-99 salary |
| R2-8 | Multi-play Stunned rule (future-proofing) | Each counted play fully disabled |
| R2-9 | Event order (#19) | Approve both lists |
| R2-10 | Move voluntary Clash rotation after both actions | Approve |
| R2-11 | Special-teams units | B: declared 7-per-side units for participation, formula kicks unchanged |
| R2-12 | Afflicted drain formula | Approve (drain × permanent ÷ effective Durability) |
| R2-13 | Mid-Clash save | Approve (decisions plus the last completed exchange) |
| R2-14 | Caps | Approve the limits and the never-delete rule |
| R2-15 | Test matrix and probability acceptance | Approve |
| R2-16 | Rotation entry cost | Half (approved rule), with halving defined as above |
| R2-17 | Ordinary evasion | Base evasion 2–12% from Agility vs Awareness |
| R2-18 | Retire the ten common traits | Approve |
| R2-19 | Retire Nature side effects (no Ambition mapping) | Approve |
| R2-20 | Cornerstone rule | A: keep "no K cornerstones"; retire the fixed legacy list |
| R2-21 | AI information rules | AI scouts with the same rules; fix the two player leaks |
| R2-22 | Basic appearance | Rarity first; shares 25 / 25 / 30 / 35 / 40% by channel |
