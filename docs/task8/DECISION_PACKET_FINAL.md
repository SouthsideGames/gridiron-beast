# Task 8: final decision packet

This is the compact packet the owner asked for before the specification is called closed. It replaces the matching items in [round 2](DECISIONS_ROUND2.md). Two proposals from round 2 are **withdrawn as instructed**:

- the universal evasion system (R2-17);
- the future multi-play Stunned rule (R2-8).

Ordinary attacks connect. Nothing here changes gameplay until approved. **Bold IDs (P1–P10) are the decisions requested.**

---

## 1. The three incomplete abilities

### Stoke the Flame (FIR-01-C, Flaroo → Blazynx → Infernox; Common RB; Clash archetype Balanced)

> **Category / activation:** Retaliation; three incoming attacks survived.
>
> **Trigger / eligibility:** One charge per enemy direct-damage attack survived, including HP or shield damage. Multi-hit counts once. Delayed direct attacks count; misses, fully prevented zero damage, damage over time, counters and reactions do not.
>
> **Targets / placement:** Triggering attacker; if invalid, current opposing active monster.
>
> **Core resolution:** At three charges, immediate Fire counterburst outside normal turn; reset charge.
>
> **Recharge / frequency:** Three hits, no separate cooldown approved.
>
> **Lifetime / persistence:** Retain partial charge through rotations; reset each Clash.
>
> **Exceptions / counterplay:** At third charge must survive and be able to act immediately, otherwise consume charge with no queued retaliation. If Stunned blocks counter, consume Stoke charge but NOT Stunned duration. Only normal turns advance status. Invalid attacker redirects to opposing active monster. Counterburst is reaction damage; no reaction chain. Shared status system supersedes old Shock-skip consumption exception.
>
> **Visuals:** Three-charge heat indicator and fiery counterburst; detailed choreography pending.
>
> **Progression / notes:** Damage scales by form/mastery. No status or splash.

**Missing:** the counterburst damage for each form and mastery tier.

**P1, recommended:** 60 / 70 / 80% of normal attack damage for Flaroo / Blazynx / Infernox, plus 0 / +5 / +10 / +15 percentage points by mastery (Developing → Mastered). That gives a range of 60–95%.
- **Basis:** the approved counters it most resembles.
  - Shadow Pounce: 70 / 80% by form, plus 0–15 points by mastery.
  - Arc Rebound: 60 / 75% by form.
  - Riptide Pursuit: 75–105% by mastery.
- Stoke the Flame needs three survived attacks before it fires, so it sits at a similar level.

### Blazing Resolve (FIR-01-F, same family; football RB)

> **Category / activation:** Self enhancement; conditional charge.
>
> **Trigger / eligibility:** Completed official rushing attempts only. Three qualifying charges ignite for a future rushing carry. No receiving, returns or two-point charge/activation. Positive whole-yard thresholds are in Progression.
>
> **Targets / placement:** Self as ball carrier on a rushing attempt.
>
> **Core resolution:** *(superseded by spec §9; the encounter rule applies)* First eligible tackle begins one tackle encounter: snapshot all defenders already within tackling reach, break their attempts, spend ignition. Later arrivals tackle normally. No one-second window.
>
> **Recharge / frequency:** No separate cooldown. No second bar or charging while ignited; resume following carry. Two-point attempts neither charge nor trigger ignition. Existing fields still apply during conversions.
>
> **Lifetime / persistence:** Unused ignition and partial charge persist across possessions, halftime and overtime; reset per game; save/reload preserves.
>
> **Exceptions / counterplay:** No receiving/return charge or activation. Stuns, fields, forced movement, out of bounds, strips and fumbles still apply.
>
> **Visuals:** Visible three-part charge bar above monster; full charge engulfs body in flame.
>
> **Progression / notes:** Guaranteed tackle-break window is explicitly approved. Not the legacy Eruption flatten/stun.

**Missing:** the "positive whole-yard thresholds". Progression doesn't contain them.

**P2, recommended:** a completed rushing attempt earns one charge if it gains at least **4 / 3 / 2 / 1 whole yards** (Developing / Practiced / Expert / Mastered). The threshold is the same for all three forms.
- The plural "thresholds" suggests a mastery scale.
- Mastery then speeds up charging without touching the approved guaranteed effect.

### Beacon Lane (LIG-01-F, Lumini → Photara; Common WR; Clash archetype Support)

> **Trigger / eligibility:** After own reception that gains a first down while ready, bank next offensive field.
>
> **Targets / placement:** 8-wide by 6-long Light rectangle at upcoming fixed 5-yard LB reference, centered on initial ball lateral position.
>
> **Core resolution:** Non-Light finishing a participating scrimmage play inside Light gets one extra cooldown unit after ordinary decrement on shortest-running positive repeatable signature cooldown. One benefit per monster per play. No charge-bar or once-use restoration. Same-type neutrality and bench pause apply.
>
> **Recharge / frequency:** Creator cooldown 6 / 5 / 4 / 3 offensive plays; starts creation and cannot receive its own field recharge.
>
> **Lifetime / persistence:** Pending carries halves; created common field clears half. Spawn play counts.
>
> **Exceptions / counterplay:** Receiver can help enemy recharge. Light family immune gains no acceleration. Ordinary status timers untouched.
>
> **Visuals:** Golden low rectangle with small clock particles along perimeter.
>
> **Progression / notes:** Approved Light field exposure cadence finalized in closeout10. Keep existing creator lifetime/placement/mastery.

**Missing:** the field's lifetime. "Keep existing" points to a value that doesn't exist.

**P3, recommended:** **1 / 1 / 2 / 2 participating offensive scrimmage plays, including the spawn play**, by mastery, the same for both forms.
- Every comparable Common field uses exactly this: Runway, Shadow Patch and Bulwark Grid.
- The creator's cooldown (at least 3) is always longer than the lifetime.

**P4:** confirm that seven abilities whose values are given only by mastery apply equally to every form: Lightning Rod, Emergency Cover, Beacon Lane, Dawn Song, Anchor Plate, Iron Lungs, Tempered Guard.

---

## 2. Pancake formulas and tuning bounds (P5)

The structure follows the approved rules:
- one attempt per OL per play;
- the attempt opens on an advantage, not a timer;
- on failure, Awareness decides recovery;
- defender Strength and Agility resist.

All ratings are effective ratings, and every contest is type-scaled exactly as today's block contest is.

| Step | Formula | Start value | Tuning bounds |
| --- | --- | --- | --- |
| Block score (existing) | B = 0.6 Blocking + 0.4 Strength | unchanged | fixed |
| Shed score (approved roles) | DL, CB, S: 0.5 Agility + 0.3 Strength + 0.2 Tackling. LB: 0.5 Strength + 0.3 Agility + 0.2 Tackling | weights fixed | fixed |
| OL advantage | A = (B − shed score) / 100 | | |
| Opportunity | Attempt offered the first time A ≥ θ in an engagement. Checked when the engagement starts and when the block changes between pass and run. | θ = 0.10 | 0.05 – 0.20 |
| Pancake power | P = 0.4 Strength + 0.4 Blocking + 0.2 Tackling (OL) | weights fixed | fixed |
| Resistance | R = 0.6 Strength + 0.4 Agility (defender) | weights fixed | fixed |
| Success | p = clamp(b + s × (P − R)/100, lo, hi) | b = 0.30, s = 1.5, lo = 0.05, hi = 0.80 | b 0.20–0.40; s 1.0–2.0; lo 0.02–0.10; hi 0.70–0.90 |
| Success effect | Knocked Down through the shared gate, rest of the play | approved | — |
| Recovery after a failure | r = clamp(c + k × Awareness/99, c, rmax) | c = 0.30, k = 0.60, rmax = 0.90 | c 0.20–0.40; k 0.40–0.70; rmax 0.80–0.95 |
| Failure, recovered | engagement continues unchanged; the attempt is spent | — | — |
| Failure, not recovered | engagement ends; the OL *attempts* Stumbled through the shared gate (40% current-speed loss, ordinary re-acceleration, legal re-engagement only) | approved | — |

**Proposed tuning targets (part of P5):**
- 0.2–0.6 pancakes per starting OL per game across the league;
- 30–50% success per attempt;
- at most 15% of attempts ending in a lost engagement.

Only the constants inside the stated bounds may move to meet them.

**Example:**
- OL: Strength 70, Blocking 75, Tackling 40, Awareness 60.
- DL: Strength 60, Agility 65, Tackling 50.
- A = 0.125, so an attempt is offered.
- p = 0.36. On failure, r = 0.66.

---

## 3. Exact event order (P6)

### Football play

**A. Before the snap**
1. Possession and period transitions. At halftime: clear non-legendary fields, restore 50% stamina, keep the approved legendary-field exceptions.
2. Serve pending absences (Sovereign Arm).
3. Place pending fields against the upcoming formation reference.
4. Show placed fields and readiness to both teams.
5. Both teams choose plays; audibles happen here.
6. Manual activation: Dragon Roar at the field-goal decision.
7. Snap. Record the formation and on-field participants.

**B. Each 0.05 s tick.** Today's engine order, with Task 8 steps inserted at fixed points:
1. Position history.
2. QB facing.
3. Snap positions (first tick only).
4. Field exposure: entering and leaving fields, Electric first-entry Stunned rolls, field movement modifiers recalculated.
5. Auras and timed ability effects.
6. Offense: status disables (Stunned, Knocked Down) stop steering. Steering and route cuts, including Water-slip Stumbled checks at sharp cuts and stops. Blocks, with the pancake check inside the engagement.
7. Defensive read update.
8. Defense: the same status and steering rules; sheds.
9. Movement integration (unengaged actors).
10. Body separation and object collisions (walls, guards, gates, snowballs).
11. Ball flight and catch resolution.
12. Contact: sacks and tackles, then the fumble roll (a Shielded save happens here), then strips.
13. Boundaries.
14. Ability triggers from this tick's events, in event order. Ties go to source ID, then ability ID.

**C. Whistle**
1. Fix the play result.
2. Clean up within-play effects: Stumbled, Knocked Down, rest-of-play Stunned, clones, guards, walls, gates, projectiles, afterimages.
3. Close the play's telemetry.

**D. End of play**
1. Stamina drain for participants, then the exhaustion flag.
2. Status durations decrement for participants, excluding the application play.
3. Field lifetimes decrement and expire.
4. Cooldowns decrement, then the Light field's extra unit (after the ordinary decrement, per §11), then charges.
5. Mastery credits.
6. Pending effects are queued for the next snap.
7. Reward and telemetry ledger entry.

### Beast Clash exchange

1. **Round start.** Reserve start-of-round hooks in stable ID order (Eclipse Call, then Second Wind before initiative).
2. **Initiative.** Explicit interrupts, then priority attacks (Night Swoop), then ordinary speed, then a seeded tie.
3. **Each actor's normal turn, in initiative order:**
   1. Turn-start adjustments: Lightning Rod transfer and its one-turn decrement.
   2. Stunned check. A skipped turn still counts as a turn.
   3. Choose the action. A team support action (Feather Relay) replaces the attack.
   4. **Launch:** pay costs, spend once-uses, lock targets, Confused redirect roll, Snowbank Shot's launch accuracy.
   5. Interception: Stone Divide.
   6. **Explicit evasion effects only:** Heat Mirage decoy and ability-specific miss sources (§7). There is no ordinary evasion roll.
   7. Lethality hooks before damage: Emergency Cover redirect, Last Root survival at 1 HP.
   8. Damage: Guarded reduction, then the shield pool, then HP. Shared Burden split.
   9. Attached effects: status attempts through the shared gate (a blocked status never cancels damage), Spore Detonation removal.
   10. Retaliation and reactions to that hit, with no chains.
   11. After the whole hit: Glacier Wall rebuild, Wing Shelter, Mirage Veil, Forge Swipe, Shadow Pounce counter, Rubble Reprisal.
   12. Follow-ups that need retaliation resolved first: Twin Thunder bolts, Bank Shot ricochet.
   13. Knockouts: clear status and episode, the replacement enters, entry effects run, then Victory Surge.
   14. End of turn: Afflicted damage, then that turn's decrements, then Dawn Song pulses and owner and recipient countdowns.
4. **Rotation phase** (§5).
5. **End of exchange:** delayed impacts (Falling Star, Faultline). Targets are frozen when the impact starts.
6. **End check:** a double knockout goes to the existing seeded coin.

Simultaneous events within one step follow spec §9: event order, then source ID, then ability ID.

---

## 4. Special-teams participation: does it need new return gameplay?

**No for participation itself. Yes only for Dawn Signal's effect.**

- **Today:** kicks resolve by formula, reading only the kicker and one returner. No blocker or tackler exists, and no tackle is credited.
- **Participation accounting:** a declared special-teams unit of 7 per side, taken from a depth list, counts for status durations, stamina drain and rewards. This changes no play outcome.
- **The Dex abilities that use kicks:**
  - Stone Cradle (ends a caught punt), Echo Landing and Gear Grid (earned by kick results), Frostmark, Second Chance and Dragon Roar all **work within the existing formulas.**
  - **Dawn Signal** makes a kickoff-coverage teammate faster "for that kickoff play". Under the formula, coverage speed affects nothing.

**P7, choose one:**
- **(a)** Add one bounded input to the kickoff return formula: return yards × (1 − 0.5 × the Quickened bonus). A +15% / +20% bonus means −7.5% / −10% return yards.
- **(b)** Keep returns unchanged. Dawn Signal stays inert until a special-teams simulation exists, and is reported as an outlier.

Recommendation: **(a)**. Under either option, no return tackles are credited until coverage is simulated, so tackle grading is unaffected.

---

## 5. Rotation timing and the reduced-entry rule (P8)

**Timing.**
- The voluntary rotation phase moves to **after both normal turns** of each exchange, before delayed impacts. This is the only placement that satisfies both "impact at end of following exchange after rotations" and Cinder Clamp's "next legal rotation opportunity".
- Each side may rotate voluntarily at most once every 4 exchanges (existing cadence).
- Requests are decided from the state at the start of the phase. They resolve with side A, then side B, each in this order:
  1. Cinder Clamp delay check;
  2. Riptide Pursuit's hit before departure;
  3. Shell Harvest cash-out;
  4. departure;
  5. the entering monster's entry effects;
  6. Cold Welcome and Downdraft on the entrant.
- The entering monster first acts in the **next** exchange.

**Reduced-entry rule.** Moving rotation after both actions removes the reason for the old penalty: the swap no longer gives the new monster an action in the same exchange, exactly like a knockout replacement. **Recommendation: no reduced action ("free").**

If you prefer to keep a cost, the precise rule would be **"half"**:
- **Applies to:** the incoming monster's first normal turn after a *voluntary* rotation.
- **Halved** (before rounding):
  - every damage multiplier, including ability-enhanced attacks;
  - heals and shields it grants;
  - its chances to apply statuses.
- **Unchanged:**
  - entry effects;
  - reactions, retaliation and defensive effects;
  - charges, counters and trigger progress (they still advance);
  - once-uses (still spent);
  - knockout replacements and forced rotations.
- Nothing is withheld outright.
- **Consequence:** an ability built around entry, such as Ambush (130–175% on first active entry), would be halved after a voluntary rotation.

---

## 6. Maximum simultaneous effects and cap behaviour (P9)

The limits below are computed from the contract text. Each ability gets a per-source maximum:

**ceil(lifetime ÷ minimum re-creation interval) × rectangles per creation.**

Each team then takes the worst case over its 19 depth-chart slots, putting the strongest field creator for each position in every slot. Duplicate copies of a family are allowed.

**Football field rectangles.**

| Per-source maximum | Abilities |
| --- | --- |
| 4 (Frostmark: lifetime up to 4 opposing plays, a new field after each made FG) | K |
| 3 (Echo Landing: lifetime up to 3, earned per returned kickoff) | K |
| 2 (Bloom Break: 2 rectangles. Crosswind Rescue: 1 pair. Bulwark Grid: earnable on its own creation play) | WR, S, TE |
| 1 (all others: cooldown or charge interval ≥ lifetime, or "max one own field") | QB, RB, DL, LB, CB, S, K and the rest |

Worst case per team, by slot:

| Slots | Count × rectangles |
| --- | --- |
| QB | 1 |
| RB | 1 |
| WR ×3 | 6 |
| TE | 2 |
| OL ×3 | 0 |
| DL ×3 | 3 |
| LB ×2 | 2 |
| CB ×2 | 2 |
| S ×2 | 4 |
| K | 4 |
| **Total** | **25** |

Both teams: **50 rectangles**.

**Football physical objects per play.** Only 7 per side are on the field.

| Side | Worst case | Total |
| --- | --- | ---: |
| Offense | QB 2 guards (Stormguard); 3 WR × (1 tornado + 3 blasts) = 12; TE 1 wall or afterimage; 2 OL × 1 Landslide wall = 2 | 17 |
| Defense | 3 DL × 2 gate panels = 6; 2 LB × 2 snowballs = 4; 2 CB × 1 Frost Nip snowball = 2 | 12 |
| **Both** | | **29** |

**Living Terrain:** 4 vine clumps per Nature–Earth overlap. No current ability creates an Earth field, so today it is 0.

**Beast Clash, per side** (lineup at most 5):
- delayed effects: one Falling Star or Faultline per member → **5**;
- constructs: Twin Thunder 2 per Voltarch → 2 per Voltarch copy (2 if legendaries are unique; 10 in theory);
- heal schedules (Dawn Song): one per caster per target → at most 5 × 5.

**Cap behaviour (P9).**
- Caps equal these computed maxima: 50 fields, 29 objects per play, 4 clumps per overlap, 5 delayed effects per Clash side, 2 constructs per Voltarch.
- A static test recomputes them from the Dex contracts. Adding content that raises a maximum fails the build until the cap is raised.
- **At runtime a legitimate spawn is never refused, delayed or deleted.** If a count ever exceeded its cap, the spawn would still happen, a diagnostic would be logged and the test suite would fail, because that can only be a defect.
- Under heavy load only optional particles and secondary visuals are reduced (§13/§14). Gameplay objects, their collision and their outlines always render.
- **Placement when the nominal spot is illegal:** deterministic outward search on a ½-yard grid. Ties go to the smaller lateral offset, then the smaller depth offset, then the stable ID. If nothing is legal, the ability's own rule applies (for example, Stormguard summons only if both guards fit); otherwise readiness is kept.

---

## 7. Evasion-dependent contracts: ability-specific fixes (P10)

The approved rule is that **ordinary attacks connect.** Misses happen only through explicit ability effects:
- Heat Mirage's decoy diverts one whole attack, with a 30 / 35 / 40 / 45% chance.
- Snowbank Shot has its own 80% launch accuracy.

**(a) No change needed: 39 contracts.** Each says something like "normal evasion applies", "each hit independently respects evasion" or "spent even if evaded". Under the approved rule these clauses apply only when an explicit effect is present (a decoy, or a miss source from (b)), so the contracts work as written:
- Falling Star, Molten Brand, Faultline, Shared Burden, Wash Away, Riptide Charge, Riptide Pursuit (undodgeable: it bypasses decoys), Spore Detonation, Canopy Assist, Phase Strike, Circuit Breaker, Victory Surge, Twin Thunder, Emergency Cover;
- Rubble Reprisal, Bank Shot, Stone Divide, Cold Welcome, Snowbank Shot, Gust Hop, Night Swoop, Predator Rhythm, Ambush, Refraction, Radiant Pursuit, Daybreak Lance, Gear Shot (no critical-hit system exists; none to preserve);
- Iron Bite, Mirage Veil, Foresight, Echo Strike, Astral Strike, Dragon Pounce, Coil Renewal, Dragonhide, Dragon Roar, Sovereign Balance, Stoke the Flame, Cinder Clamp.

**(b) Abilities that trigger on a miss.** Three would almost never trigger under "attacks connect", so each needs a fix.

| Ability | Problem | Fix (P10) |
| --- | --- | --- |
| **Shadow Pounce** (Umbrikit / Obscurat, Common CB, Balanced) | Triggers only when an enemy attack entirely misses Umbrikit, but nothing can make it miss. The contract says it grants "no passive *guaranteed* dodge". | Give the ability its own **shadow-step miss source**. While its counter is unused, each enemy normal attack against the active Umbrikit rolls **15% (Umbrikit) / 20% (Obscurat)** to miss entirely, which then triggers the approved counter (once per Clash). It is not guaranteed, it ends once the counter is used, and decoy and undodgeable rules apply as for Heat Mirage. Expected to fire in about 70% of Clashes where the owner takes 8 attacks. |
| **Mind Game** (Enigmane, Rare TE, Disruptor; Clash) | Earns its trick only when an enemy attack misses Enigmane. | Its approved visual is already "purple afterimage flashes where missed attack landed". Make that the miss source: while no trick is stored, each enemy normal attack against the active Enigmane rolls **15%** to strike an **afterimage** (a full miss), earning the trick. Everything else is unchanged. |
| **Arc Rebound** (Volcoil / Eelectra, Common RB, Balanced) | Triggers when *Volcoil's own* attack is evaded, which happens only against an enemy decoy or the miss sources above. | **Keep as written**, as a counter-pick against evasion monsters. Report it as a rare-trigger outlier in mastery pacing (spec §16 allows this). A redesign, for example triggering on an attack fully absorbed by a shield, would contradict its approved text ("a shield absorbing a connected attack is not a miss"), so it is not proposed. |

Football has no evasion concept, so no football contract is affected.

---

## Decisions requested

| ID | Decision | Recommendation |
| --- | --- | --- |
| P1 | Stoke the Flame counterburst damage | 60 / 70 / 80% by form, +0 / 5 / 10 / 15 points by mastery |
| P2 | Blazing Resolve qualifying carry | at least 4 / 3 / 2 / 1 yards by mastery, all forms |
| P3 | Beacon Lane lifetime | 1 / 1 / 2 / 2 participating offensive plays including spawn |
| P4 | Mastery-only values apply to every form (7 abilities) | Confirm |
| P5 | Pancake formulas, bounds and tuning targets | Approve the table in §2 |
| P6 | Event order | Approve the football and Clash lists in §3 |
| P7 | Dawn Signal effect | (a) bounded return-yards input |
| P8 | Rotation after both actions; entry cost | After actions; no reduced action ("free") |
| P9 | Caps and cap behaviour | Approve the computed caps and the never-refuse rule |
| P10 | Miss-dependent fixes | Shadow Pounce 15 / 20% shadow-step; Mind Game 15% afterimage; Arc Rebound unchanged |

The other items from round 2 (R2-1–7, R2-9–16, R2-18–22) carry their round-2 recommendations unless you say otherwise. R2-8 and R2-17 are withdrawn.
