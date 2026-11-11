# Task 8: final decision packet (P1–P10), revision 2

**Status: the specification is open.** Nothing in this packet changes gameplay until you approve it. Once you rule on P1–P10, the
rulings are consolidated into the GitHub specification, and the contradictory active instructions listed in §11 are removed
*before* any new system is connected to gameplay.

**What changed from revision 1 (commit ade3c07).** A line-by-line check against the Dex and the specification found three places
where revision 1 departed from approved text without saying so. The recommendations change:

| Item | Revision 1 | Problem found | Revision 2 |
| --- | --- | --- | --- |
| P5 | Called the defender shed weights "approved, fixed" | Only the *roles* are approved (Appendix C). Spec §12 says exact contest weights "are not authorized for Claude to invent". | Every weight is now shown as a proposal for you to approve. |
| P7 | Recommended a return-yards multiplier for Dawn Signal | Dawn Signal's approved notes say it "needs real coverage simulation, not decorative stat bonus". A yards multiplier is exactly that. | Recommend a live kickoff-return simulation; the multiplier is listed only as a flagged departure. |
| P8 | Recommended that rotation be "free" | The approved Clash balance setting is `swapCost: 'half'` (Gate B.2). "Free" would make rotation cheaper than the approved balance, and revision 1 didn't flag that. | Recommend keeping the half-strength cost, applied to the entering monster's first turn. |

Throughout:
- **"Departure"** means a recommendation that changes or adds to an approved rule.
- **"Fills a gap"** means the approved text leaves the value open and nothing approved is changed.

Two round-2 proposals stay **withdrawn**:
- the universal evasion system (R2-17);
- the future multi-play Stunned rule (R2-8).

The approved rule that **ordinary attacks connect** is preserved everywhere.

Quoted ability text is copied word for word from `docs/beast-dex/data/abilities.json` (Beast Dex v18).

---

## P1 — Stoke the Flame: counterburst damage

**In plain language:** After Flaroo survives three hits in a Clash, it immediately fires back. The approved design says the damage "scales by form/mastery" but never gives the numbers. This decision supplies them.

**Approved text** (FIR-01-C, Flaroo → Blazynx → Infernox; Common RB; Clash archetype Balanced):

| Section | Approved rule |
| --- | --- |
| Category / activation | Retaliation; Three incoming attacks survived |
| Trigger / eligibility | One charge per enemy direct-damage attack survived, including HP or shield damage. Multi-hit counts once. Delayed direct attacks count; misses, fully prevented zero damage, damage over time, counters and reactions do not. |
| Targets / placement | Triggering attacker; if invalid, current opposing active monster |
| Core resolution | At three charges, immediate Fire counterburst outside normal turn; reset charge. |
| Recharge / frequency | Three hits, no separate cooldown approved. |
| Lifetime / persistence | Retain partial charge through rotations; reset each Clash. |
| Exceptions / counterplay | At third charge must survive and be able to act immediately, otherwise consume charge with no queued retaliation. If Stunned blocks counter, consume Stoke charge but NOT Stunned duration. Only normal turns advance status. Invalid attacker redirects to opposing active monster. Counterburst is reaction damage; no reaction chain. Shared status system supersedes old Shock-skip consumption exception. |
| Visuals | Three-charge heat indicator and fiery counterburst; detailed choreography pending. |
| Progression / notes | Damage scales by form/mastery. No status or splash. |

**Missing:** the damage for each form and mastery tier.

**Recommendation:**
- **Base damage by form:** 60% of normal attack damage (Flaroo), 70% (Blazynx), 80% (Infernox).
- **Mastery bonus:** +0, +5, +10 or +15 percentage points (Developing, Practiced, Expert, Mastered).
- **Range:** 60–95%.
- Type, shield and damage-reduction rules apply as for any hit.

**Why:** the most similar approved counters use the same scale:
- Shadow Pounce: 70 / 80% by form, plus 0–15 points by mastery.
- Arc Rebound: 60 / 75% by form.

Stoke the Flame needs three survived hits before it fires, so it starts slightly lower than those.

**Departures:** none. This fills a gap.

---

## P2 — Blazing Resolve: what counts as a qualifying carry

**In plain language:** Flaroo's football ability charges from good runs. After three, its next carry breaks the first set of tackles. The approved text says that runs must gain a "positive whole-yard threshold" to count, and that the threshold is listed under Progression. It isn't there.

**Approved text** (FIR-01-F; Common RB):

| Section | Approved rule |
| --- | --- |
| Category / activation | Self enhancement; Conditional charge |
| Trigger / eligibility | Completed official rushing attempts only. Three qualifying charges ignite for a future rushing carry. No receiving, returns or two-point charge/activation. Positive whole-yard thresholds are in Progression. |
| Targets / placement | Self as ball carrier on a rushing attempt |
| Core resolution (Dex text, **superseded**) | First eligible tackle starts one live second of automatic tackle breaks, including multiple defenders reaching runner within that window. Charge consumed; consuming carry earns no new charge. Normal strip/fumble rules remain. |
| Core resolution (**governing**, spec §9) | First eligible tackle begins one tackle encounter. Snapshot all defenders already within tackling reach, break their attempts, spend ignition; later arrivals can tackle normally. No one-second window. Keep other approved charge, rushing eligibility, fumble and persistence rules. Do not copy old Eruption's defender stun. Exact encounter snapshot and duplicate-contact handling must be defined in event tests. |
| Recharge / frequency | No separate cooldown. No second bar or charging while ignited; resume following carry. Two-point attempts neither charge nor trigger ignition. Existing fields still apply during conversions. |
| Lifetime / persistence | Unused ignition and partial charge persist across possessions, halftime and overtime; reset per game; save/reload preserves. |
| Exceptions / counterplay | No receiving/return charge or activation. Stuns, fields, forced movement, out of bounds, strips and fumbles still apply. |
| Visuals | Visible three-part charge bar above monster; full charge engulfs body in flame. |
| Progression / notes | Guaranteed tackle-break window is explicitly approved. Not the legacy Eruption flatten/stun. |

**Missing:** the yard thresholds.

**Recommendation:**
- A completed rushing attempt earns one charge if it gains at least **4 yards** (Developing), **3** (Practiced), **2** (Expert) or **1** (Mastered).
- The same thresholds apply to all three forms.
- Losses and no-gain runs never charge.

**Why:**
- The text says "thresholds", plural, in Progression, which points to a mastery scale.
- Mastery then makes the charge come faster without changing the approved guaranteed tackle break.

**Departures:** none. This fills a gap.

The Dex's one-second wording is already retired by spec §19. It is listed for removal in §11.

---

## P3 — Beacon Lane: how long the field lasts

**In plain language:** When Lumini catches a pass for a first down, it places a golden field for the next offensive play. Teammates who finish a play inside it get their cooldowns sped up by one step. The approved text says to "keep the existing lifetime", but no lifetime was ever written down.

**Approved text** (LIG-01-F, Lumini → Photara; Common WR):

| Section | Approved rule |
| --- | --- |
| Trigger / eligibility | Lumini; common; WR; After own reception that gains a first down while ready, bank next offensive field. |
| Targets / placement | 8-wide by 6-long Light rectangle at upcoming fixed 5-yard LB reference, centered on initial ball lateral position. |
| Core resolution | Non-Light finishing a participating scrimmage play inside Light gets one extra cooldown unit after ordinary decrement on shortest-running positive repeatable signature cooldown. One benefit per monster per play. No charge-bar or once-use restoration. Same-type neutrality and bench pause apply. |
| Recharge / frequency | Creator cooldown 6 / 5 / 4 / 3 offensive plays; starts creation and cannot receive its own field recharge. |
| Lifetime / persistence | Pending carries halves; created common field clears half. Spawn play counts. |
| Exceptions / counterplay | Receiver can help enemy recharge. Light family immune gains no acceleration. Ordinary status timers untouched. |
| Visuals | Golden low rectangle with small clock particles along perimeter. |
| Progression / notes | Approved Light field exposure cadence finalized in closeout10. Keep existing creator lifetime/placement/mastery. |

**Missing:** the lifetime in plays.

**Recommendation:**
- The field lasts **1 / 1 / 2 / 2 participating offensive scrimmage plays, counting the play it appears on**, by mastery (Developing → Mastered).
- The same lifetime applies to both forms.
- It clears at halftime, as already approved.

**Why:**
- Every comparable Common field uses exactly this scale: Runway, Shadow Patch and Bulwark Grid.
- The creator's cooldown is never shorter than 3 plays, so the field always expires before Lumini can create a new one.

**Departures:** none. This fills a gap.

## P4 — Mastery-only values apply to every form

**In plain language:** Seven abilities list numbers only by mastery tier, not by form:
- Lightning Rod;
- Emergency Cover;
- Beacon Lane;
- Dawn Song;
- Anchor Plate;
- Iron Lungs;
- Tempered Guard.

This confirms that a first-form and an evolved monster at the same mastery tier get the same value.

**Recommendation:** confirm.

**Departures:** none. This interprets the text as written.

---

## P5 — Pancakes: formulas and tuning bounds

**In plain language:**
- Once per play, an offensive lineman who has clearly won his block gets one chance to flatten the defender.
- If it works, the defender is Knocked Down for the rest of the play.
- If it fails, the lineman's Awareness decides whether he keeps his block.
- If he doesn't keep it, he loses the block and stumbles.

**What is already approved:**

| Source | Rule |
| --- | --- |
| Spec §12 | One ordinary attempt per OL per play; establish an advantage first; Awareness informs attempt risk and failure recovery; Strength, Blocking and Tackling contribute; defender Strength/Agility resist. **"Exact contest weights and thresholds are not authorized for Claude to invent."** |
| Spec §10 | Success applies Knocked Down through the shared status gate, lasting the rest of the play. |
| Spec §9 | Failure Stumbled = lose 40% of current speed, normal re-acceleration, block ends, legal re-engagement only. |
| Round 1, item 7 | Failure does not automatically cause Stumbled; Awareness decides recovery; replace the old timer with an advantage condition. |

So every number below is a **proposal for you to approve**, as the spec requires.

| Step | Proposed formula | Start | Bounds tuning may use | Plain language |
| --- | --- | --- | --- | --- |
| Lineman block score | B = 0.6 Blocking + 0.4 Strength | from today's engine | not tunable | How well the lineman holds the block (unchanged from today). |
| Defender shed score | DL, CB, S: S = 0.5 Agility + 0.3 Strength + 0.2 Tackling. LB: S = 0.5 Strength + 0.3 Agility + 0.2 Tackling | proposal | not tunable | How well the defender escapes. Today everyone uses the LB formula; this follows the approved roles (Agility first for DL, CB and S). |
| Advantage | A = (B − S) / 100, type-scaled as today | — | — | How clearly the lineman is winning. |
| When a chance appears | The first time A ≥ θ during a block. Checked when the block starts and when it switches between pass and run blocking. | θ = 0.10 | 0.05–0.20 | Only a clearly winning lineman gets a chance. |
| Pancake power | P = 0.4 Strength + 0.4 Blocking + 0.2 Tackling (lineman) | proposal | not tunable | |
| Resistance | R = 0.6 Strength + 0.4 Agility (defender) | proposal | not tunable | |
| Success chance | p = clamp(0.30 + 1.5 × (P − R)/100, 0.05, 0.80) | b 0.30, s 1.5, floor 0.05, ceiling 0.80 | b 0.20–0.40; s 1.0–2.0; floor 0.02–0.10; ceiling 0.70–0.90 | Even monsters: 30%. Never below 5% or above 80%. |
| Recovery after a miss | r = clamp(0.30 + 0.60 × Awareness/99, 0.30, 0.90) | c 0.30, k 0.60, cap 0.90 | c 0.20–0.40; k 0.40–0.70; cap 0.80–0.95 | An aware lineman usually keeps the block. |
| Miss, recovered | block continues unchanged; the attempt is used up | — | — | |
| Miss, not recovered | block ends; Stumbled attempted through the shared gate | approved | — | |

**Tuning targets:**
- 0.2–0.6 pancakes per starting OL per game;
- 30–50% of attempts succeed;
- at most 15% of attempts end in a lost block.

Only the constants marked tunable may move, and only inside their bounds.

**Worked example:**

| Monster | Ratings |
| --- | --- |
| Lineman | Strength 70, Blocking 75, Tackling 40, Awareness 60 |
| DL | Strength 60, Agility 65, Tackling 50 |

- B = 73, S = 60.5, so A = 0.125: a chance appears.
- P = 66 and R = 62, so p = 0.36.
- If it misses, r = 0.66.

**Departures and interpretations, all flagged:**
1. **Contest weights.** The shed, power and resistance weights, θ and the constants are new numbers. That is why they need your approval rather than being "fixed".
2. **Shed formula change.** The new shed formula changes today's engine for DL, CB and S. It also affects ordinary block sheds, not only pancakes.
3. **"Awareness informs attempt risk."** This is read as the risk of losing the block after a miss, which the recovery roll covers. If you also want Awareness in the success chance, say so.
4. **Recovered miss.** A recovered miss leaves the block in place. Spec §9 says the failed engagement "ends", but round 1 item 7 says Awareness can prevent that, so item 7 governs.

---

## P6 — Exact event order

**In plain language:** When several things happen at once, this fixes which happens first, so every replay of a seed gives the same result. Within any one step, ties go to event order, then source ID, then ability ID (spec §9). There is never a random tie roll.

### Football

**A. Before the snap**
1. Possession and period changes. At halftime:
   - clear non-legendary fields (keeping the approved Burning Wake and Tsunami Line exceptions);
   - restore 50% of maximum stamina (spec §12).
2. Serve pending absences (Sovereign Arm).
3. Place pending fields against the upcoming formation reference (spec §11).
4. Show the placed fields and readiness to both teams.
5. Both teams choose their plays; audibles happen here.
6. Manual activation: Dragon Roar at the field-goal decision.
7. Snap. Record the formation and the on-field participants.

**B. Every 0.05 s tick.** Today's engine order, with the new steps (marked ★) inserted at fixed points:
1. Position history.
2. QB facing.
3. Snap positions (first tick only).
4. ★ Field exposure:
   - entering and leaving fields;
   - Electric first-entry Stunned rolls;
   - field movement modifiers recalculated.
5. ★ Auras and timed ability effects.
6. Offense:
   - ★ status disables (Stunned, Knocked Down) stop steering;
   - steering and route cuts, including ★ Water-slip Stumbled checks at sharp cuts and stops;
   - blocks, with ★ the pancake check inside the block.
7. Defensive read update.
8. Defense:
   - the same status and steering rules;
   - sheds.
9. Movement for players not engaged in a block.
10. Body separation, then ★ object collisions (walls, guards, gates, snowballs).
11. Ball flight and catch resolution.
12. Contact, in this order:
    1. sacks and tackles;
    2. the fumble roll, where ★ a Shielded save happens;
    3. strips.
13. Boundaries.
14. ★ Ability triggers from this tick's events, in event order. Ties go to source ID, then ability ID.

**C. Whistle**
1. Fix the play result.
2. Clear within-play effects:
   - Stumbled;
   - Knocked Down;
   - rest-of-play Stunned;
   - clones, guards, walls, gates and projectiles;
   - afterimages.
3. Close the play's records.

**D. After the play**
1. Stamina drain for participants, then the exhaustion check.
2. Status durations count down for participants. The play a status was applied on doesn't count.
3. Field lifetimes count down; expired fields are removed.
4. Cooldowns count down, then the Light field's extra step (after the ordinary step, per spec §11), then charges.
5. Mastery credit.
6. Pending effects queued for the next snap.
7. Reward ledger and records entry.

### Beast Clash exchange

1. **Round start:** reserve start-of-round effects in stable ID order (Eclipse Call, then Second Wind before initiative).
2. **Initiative:** explicit interrupts, then priority attacks (Night Swoop), then ordinary speed, then a seeded tie-break.
3. **Each active monster's turn, in initiative order:**
   1. Turn-start adjustments: the Lightning Rod transfer and its one-turn countdown.
   2. Stunned check. A skipped turn still counts as a turn, as approved for Arc Rebound and Heat Mirage.
   3. Choose the action. A team support action (Feather Relay) replaces the attack.
   4. **Launch:**
      - pay costs;
      - spend once-only effects;
      - lock targets;
      - Confused redirect roll;
      - Snowbank Shot's own launch accuracy.
   5. Interception: Stone Divide.
   6. **Explicit miss effects only:** the Heat Mirage decoy and the ability-specific miss sources in P10. There is no ordinary evasion roll.
   7. Survival effects before damage:
      - Emergency Cover redirect;
      - Last Root's survival at 1 HP.
   8. Damage: Guarded reduction, then the shield, then HP. Shared Burden splits here.
   9. Attached effects:
      - status attempts through the shared gate (a blocked status never cancels the damage);
      - Spore Detonation removal.
   10. Retaliation and reactions to that hit, with no chains (Stoke the Flame fires here).
   11. After the whole hit:
       - Glacier Wall rebuild;
       - Wing Shelter;
       - Mirage Veil;
       - Forge Swipe;
       - Shadow Pounce counter;
       - Rubble Reprisal.
   12. Follow-ups that need retaliation settled first: Twin Thunder bolts, Bank Shot ricochet.
   13. Knockouts:
       1. clear the knocked-out monster's status;
       2. the replacement enters and its entry effects run;
       3. Victory Surge.
   14. End of turn:
       1. Afflicted damage;
       2. that turn's countdowns;
       3. Dawn Song pulses;
       4. owner and recipient countdowns.
4. **Rotation phase:** see P8.
5. **End of exchange:** delayed impacts (Falling Star, Faultline). Their targets are fixed when the impact starts.
6. **End check:** a double knockout goes to the existing seeded coin.

**Departures:**
- **Football:** none. Spec §9 requires preserving the established order, and the new steps are inserted into it, not reordered.
- **Clash rotation (one engine change, flagged):** rotation moves from the *start* of the exchange to *after both turns*. No approved rule fixes the old placement, but two approved contracts require the new one:
  - Falling Star / Faultline: "impact at end of following exchange after rotations";
  - Cinder Clamp: "next legal rotation opportunity".

---

## P7 — Special teams: is new return gameplay needed?

**In plain language:**
- **Counting who played on special teams needs no new gameplay.**
- **One ability, Dawn Signal, does need it.** Its approved text requires a real kickoff-coverage player to run faster, and today no coverage players exist.

**Today's engine:**
- Kicks and returns are resolved by a formula that reads only the kicker and one returner.
- Nobody else runs, blocks or tackles, and no return tackle is credited.

**Participation (no new gameplay):**
- Each side declares a special-teams unit of 7 from a depth list.
- Those monsters count as participating for status countdowns, stamina drain and rewards.
- No play result changes.
- This answers round 1 item 21 ("check actual special-teams actors").

**Every kick-related ability, checked against today's formula:**

| Ability | What it needs | Works with today's formula? |
| --- | --- | --- |
| Stone Cradle | ends a caught punt at the catch spot ("Current engine resolves punts abstractly; no new bounce system requested") | Yes |
| Gear Grid | punt net distance ("current return sim sufficient without bounce physics") | Yes |
| Echo Landing | kickoff caught and returned without a TD; return-end spot | Yes |
| Frostmark, Second Chance, Dragon Roar | field-goal results | Yes |
| Tsunami Line, Hoard Flight, Daybreak | interception or recovery returns from scrimmage | Yes (scrimmage plays, not kicks) |
| **Dawn Signal** | **a coverage teammate who runs faster** | **No** |

**Dawn Signal approved text** (LIG-02-F, Solchirp → Heliark; Common K):

| Section | Approved rule |
| --- | --- |
| Trigger / eligibility | Solchirp; common; K; After successful extra point ONLY, bank support for own next kickoff. Field goals excluded. |
| Targets / placement | One nearest eligible non-K teammate on kickoff coverage at snap, stable lineup tie. |
| Core resolution | Attempt Quickened +15 / +20% Speed by Solchirp / Heliark for that kickoff play only; increases max speed AND acceleration. Does not affect kick distance or returner. |
| Recharge / frequency | No extra cooldown; max one pending, consumed on eligible kickoff cast even status blocked. |
| Lifetime / persistence | Pending persists halftime if kickoff delayed. Buff clears whistle; kickoff is one play. No eligible target retains token until next own kickoff. |
| Exceptions / counterplay | No guaranteed tackle/touchback; existing different status blocks; Stunned source at cast delays pending. |
| Visuals | Song notes fly to coverage teammate; green boot badge if accepted. |
| Progression / notes | Quickened strength +0 / +3 / +6 / +9 percentage points by mastery. Special teams may lack controllable coverage actors; **needs real coverage simulation, not decorative stat bonus. Flag implementation prerequisite.** |

**Options:**
- **(a) Live kickoff returns. Recommended; the only option with no departure.**
  - Kickoffs become a real play: 7 versus 7 using the existing movement, blocking and tackling code.
  - Kick distance and hang time still come from today's kicking formula.
  - Punts, field goals and extra points stay as they are.
  - Consequences:
    - kickoff return yards and touchdowns will change;
    - return tackles get credited and graded;
    - a balance check against today's return averages is needed;
    - it adds roughly one live play per score to simulation time.
- **(b) Leave Dawn Signal inert until a later task builds coverage.**
  - **Departs from spec §9,** which says to implement every approved ability.
  - Dawn Signal would be reported as unimplemented.
- **(c) Reduce return yards by a factor.** Return yards × (1 − 0.5 × the Quickened bonus).
  - **Departs from Dawn Signal's own approved note** ("not decorative stat bonus").
  - Listed only because revision 1 proposed it.

---

## P8 — Clash rotation: timing and entry cost

**In plain language:** "Rotation" means voluntarily swapping the active fighter for a reserve. Two questions:
- *when* in the exchange the swap happens;
- whether the incoming monster pays a price on arrival.

**Timing (recommendation, fills a gap):**
- Swaps happen **after both monsters have taken their turns**, before delayed impacts.
- Each side may swap at most once every 4 exchanges (existing cadence).
- Requests are decided from the state at the start of the phase.
- They resolve side A, then side B, each in this order:
  1. Cinder Clamp's delay check;
  2. Riptide Pursuit's hit on the departing monster;
  3. Shell Harvest cash-out;
  4. the departure;
  5. the entering monster's entry effects;
  6. Cold Welcome and Downdraft on the entrant.
- The entrant first acts in the **next** exchange.

**Entry cost: what is approved now.**
- The approved Clash balance setting is `swapCost: 'half'` (Gate B.2; `src/clash/balance-manifest.js`, `APPROVED_SETTINGS`). Under it the incoming monster **acts in the same exchange** at half strength:
  - damage, heals and shields are halved;
  - status chances are halved;
  - effects without a size (sweeps, dodge setups, stacking boosts) are withheld;
  - entry effects stay full.
- Round 1 item 26 approved rotation but asked for "half-strength entry" to be explained before it is approved for Task 8.

**The problem:**
- Moving the swap after both turns means the incoming monster no longer acts in the swap exchange, so "half" as written no longer applies to anything.
- With no cost at all, a swap would cost **nothing**: the outgoing monster already acted in full.
- That makes swapping cheaper than the approved balance, which made a swap cost half an action.

**Options:**
- **(a) Half on the first turn. Recommended.** The half-strength cost moves to the entrant's first normal turn after a *voluntary* swap.
  - **Halved** (before rounding):
    - every damage multiplier, including ability-boosted attacks;
    - heals and shields it grants;
    - its status-application chances.
  - **Unchanged:**
    - entry effects;
    - reactions, retaliation and defensive effects;
    - charges, counters and trigger progress (they still advance);
    - once-only effects (still spent);
    - knockout replacements and forced swaps (no cost).
  - **Nothing is withheld outright.**
  - **Departures:**
    1. The cost applies one exchange later than today.
    2. Size-less effects are no longer withheld. Withholding them would switch off approved Dex abilities on that turn; halving doesn't.
  - **Consequence to note:** an entry-based ability such as Ambush (130–175% on first active entry) is halved after a voluntary swap, but not after a knockout replacement.
- **(b) Free.**
  - **Departs from the approved `half` setting.**
  - Makes swapping cheaper than the approved balance.
- **(c) The swap uses the side's turn.**
  - The outgoing monster forfeits its turn in the swap exchange.
  - **Departs from the approved setting.** It was the Gate B configuration that Gate B.2 replaced.

---

## P9 — Maximum simultaneous effects and what happens at a cap

**In plain language:** This gives the most fields and objects that can ever exist at once, so the game can be tested at that worst case. It also fixes what happens if a limit is ever reached: nothing is cancelled.

**Method:**
- Each ability's maximum is (lifetime ÷ shortest time before it can make another) rounded up, × the pieces it makes each time.
- Each team takes the worst case over its 19 depth-chart slots: the strongest field maker for each position, in every slot, with duplicate families allowed.
- These maxima are worked out from the contract text. A static test will recompute them from the Dex.

**Football field rectangles, per-source maximum:**

| Max | Source |
| --- | --- |
| 4 | Frostmark (K): lasts up to 4 opposing plays; a new one after each made field goal |
| 3 | Echo Landing (K): lasts up to 3; one per returned kickoff |
| 2 | Bloom Break (WR, 2 patches); Crosswind Rescue (S, 1 pair); Bulwark Grid (TE, can re-earn on its creation play) |
| 1 | every other field ability (its cooldown or charge is at least its lifetime, or it allows only one at a time) |

**Worst case per team, by slot:**

| Slot | Rectangles |
| --- | ---: |
| QB | 1 |
| RB | 1 |
| WR × 3 | 6 |
| TE | 2 |
| OL × 3 | 0 |
| DL × 3 | 3 |
| LB × 2 | 2 |
| CB × 2 | 2 |
| S × 2 | 4 |
| K | 4 |
| **Total** | **25** |

Both teams: **50 rectangles**.

**Physical objects in one play** (7 per side on the field):

| Side | Worst case | Objects |
| --- | --- | ---: |
| Offense | QB: 2 Stormguard guards. 3 WR × (1 tornado + 3 blasts) = 12. TE: 1 wall or afterimage. 2 OL × 1 Landslide wall = 2. | 17 |
| Defense | 3 DL × 2 gate panels = 6. 2 LB × 2 snowballs = 4. 2 CB × 1 Frost Nip snowball = 2. | 12 |
| **Both** | | **29** |

**Living Terrain:** 4 vine clumps per Nature–Earth overlap. No current ability makes an Earth field, so today the count is 0.

**Beast Clash, per side** (at most 5 in a lineup):

| Effect | Maximum |
| --- | --- |
| Delayed impacts | 5 (one Falling Star or Faultline per member) |
| Twin Thunder constructs | 2 per Voltarch |
| Dawn Song heal schedules | one per caster per target, so at most 25 |

**Recommended cap behaviour:**
- **Cap values:** 50 fields, 29 objects per play, 4 clumps per overlap, 5 delayed impacts per Clash side, 2 constructs per Voltarch.
- **Build check:** content that raises a maximum fails the build until the cap is raised.
- **During play, a legitimate effect is never refused, delayed or deleted.** If a count somehow went over, the effect still happens, a diagnostic is logged and the test suite fails, because that can only be a bug.
- **Under heavy load:** only optional particles and secondary visuals are reduced (spec §14). Gameplay objects, their collision and their outlines always draw.
- **If a spot is illegal**, the game searches outward on a half-yard grid:
  - ties go to the smaller sideways shift, then the smaller depth shift, then stable ID;
  - if nothing fits, the ability's own rule applies (for example, Stormguard summons only if both guards fit);
  - otherwise the ability stays ready.

**Departures:** none. Spec §14 already says to reduce secondary visuals first and never misrepresent state; this adds the never-refuse rule and the test.

---

## P10 — Abilities that only trigger on a miss

**In plain language:**
- Under the approved rule, ordinary attacks always connect.
- Misses come only from explicit effects:
  - Heat Mirage's decoy (30 / 35 / 40 / 45% to divert one whole attack);
  - Snowbank Shot's own 80% launch accuracy.
- That leaves three abilities that trigger *only* on a miss with almost nothing to trigger them.
- This decision chooses an ability-specific fix for each. There is **no universal evasion system**.

**No change needed: 39 contracts.** Their wording ("normal evasion applies", "spent even if evaded", "each hit independently respects evasion") simply means "if an explicit miss effect applies". They work as written:
- Falling Star, Molten Brand, Faultline, Shared Burden, Wash Away, Riptide Charge;
- Riptide Pursuit (undodgeable: it bypasses decoys);
- Spore Detonation, Canopy Assist, Phase Strike, Circuit Breaker, Victory Surge, Twin Thunder, Emergency Cover, Rubble Reprisal, Bank Shot, Stone Divide, Cold Welcome, Snowbank Shot, Gust Hop, Night Swoop, Predator Rhythm, Ambush, Refraction, Radiant Pursuit, Daybreak Lance;
- Gear Shot (there is no critical-hit system, so none needs preserving);
- Iron Bite, Mirage Veil, Foresight, Echo Strike, Astral Strike, Dragon Pounce, Coil Renewal, Dragonhide, Dragon Roar, Sovereign Balance, Stoke the Flame, Cinder Clamp.

### Shadow Pounce (DAR-01-C, Umbrikit → Obscurat; Common CB; Balanced)

| Section | Approved rule |
| --- | --- |
| Trigger / eligibility | First enemy normal-action attack, including an enhanced normal attack, whose entire attack misses the active, able source triggers a counter after the whole attack. Counters and reactions never qualify. |
| Targets / placement | Same attacker if still active and alive; no target replacement. |
| Core resolution | Counter at 70 / 80% normal damage by Umbrikit / Obscurat, standard evasion/type/shields; not ordinary attack for archetype perks. |
| Recharge / frequency | One counter per Clash, committed at eligible miss; no passive guaranteed dodge is granted. |
| Lifetime / persistence | If unable at reaction point, preserve use; no queue. No carry from actual Clash to another Clash. |
| Exceptions / counterplay | Multi-hit move qualifies only if EVERY hit misses; shield absorption is not miss. No reaction to counters or own Confused self-hit. |
| Visuals | Shadow crouches then lunges back along attack trail. |
| Progression / notes | Counter power +0 / +5 / +10 / +15 percentage points by mastery. Needs completed-attack all-miss event, counter recursion guard and one-use state. |

**Problem:** nothing makes an enemy attack miss Umbrikit except an enemy using Snowbank Shot. In practice the counter almost never fires.

**Options:**
- **(a) Shadow-step. Recommended.**
  - While the counter is unused, each enemy normal attack on the active Umbrikit rolls **15% (Umbrikit) / 20% (Obscurat)** to miss entirely, which triggers the approved counter.
  - Once the counter is used, the shadow-step ends for that Clash.
  - Undodgeable attacks bypass it, as with Heat Mirage.
  - Over 8 enemy attacks, the counter fires in about 73% (Umbrikit) or 83% (Obscurat) of Clashes.
  - **Departure:** this adds a chance-based dodge the contract doesn't contain. It respects "no passive *guaranteed* dodge", since it is neither guaranteed nor permanent, but it is still new behaviour.
- **(b) Keep as written.**
  - No departure.
  - The ability is near-inert and is reported as an outlier.

### Mind Game, Clash version (PSY-05-C, Enigmane; Rare TE; Disruptor)

| Section | Approved rule |
| --- | --- |
| Trigger / eligibility | Direct enemy normal attack missing source completely earns one trick. Every hit of multihit attack must miss. Reactions cannot earn trick. |
| Targets / placement | Next normal attack intended active enemy. Maximum one stored trick. No extra cooldown. |
| Core resolution | Next performed normal attack consumes trick on launch even miss. Connected hit, including shield-absorbed hit, attempts Confused under usual slot rules. Base attack normal damage, Confused 25% self-side redirect chance. |
| Recharge / frequency | No charge accumulation beyond one. No extra normal attack. Once launched trick spent even status blocked or evaded. |
| Lifetime / persistence | Confused 1 / 2 / 2 / 3 recipient normal turns by mastery, application turn excluded under shared rules. Stored trick persists reserve, clears knockout/Clash end. Existing status mode carry applies. |
| Exceptions / counterplay | No extra accuracy roll for application once hit connects, only shared eligibility. Exact enhanced/ordinary archetype policy follows final shared reconciliation. |
| Visuals | Purple afterimage flashes where missed attack landed to signal stored trick. Next hit sends ghostly grin past enemy, standard Confused badge on acceptance. |
| Progression / notes | Disruptor retained. All seven A approved. Duration varies, fixed 25% redirect chance at every tier. |

**Problem:** the same as Shadow Pounce. A trick is earned only on a miss.

**Options:**
- **(a) Afterimage. Recommended.**
  - While no trick is stored, each enemy normal attack on the active Enigmane rolls **15%** to strike an afterimage. That is a full miss, and it earns the trick.
  - The approved visual ("afterimage flashes where missed attack landed") already shows this.
  - **Departure:** this adds a chance-based miss the contract doesn't contain.
- **(b) Keep as written.**
  - No departure.
  - The ability is near-inert and is reported as an outlier.

### Arc Rebound (ELE-02-C, Volcoil → Eelectra; Common RB; Balanced)

| Section | Approved rule |
| --- | --- |
| Trigger / eligibility | While ready, an ordinary normal attack is evaded by normal dodge, decoy or applicable miss effect. A shield absorbing a connected attack is not a miss. |
| Targets / placement | Redirect once at the first living enemy reserve in stable lineup order. No eligible reserve: preserve readiness; do not store damage. |
| Core resolution | Rebound deals 60% of normal attack damage for Volcoil, 75% for Eelectra. New target resolves its own normal type, damage reduction, shield and evasion checks. A second miss ends the sequence. |
| Recharge / frequency | Cooldown 5 / 4 / 3 / 2 subsequent owner normal turns, starts at launch even if rebound misses. Stunned skipped normal turns count; reserve and reaction events pause. |
| Lifetime / persistence | No stored rebound or recursive redirection. Ordinary original attack retains its normal resource accounting. |
| Exceptions / counterplay | Rebound is reaction damage: no retaliation chain, extra normal turn, charge consumption, normal attack-counter progress or ordinary-only offensive archetype perks. Do not consume original attack resources twice. |
| Visuals | Missed bolt curves sharply toward the reserve target. |
| Progression / notes | Balanced archetype retained. Different trigger and target from knockout-earned Victory Surge and voluntary-exit Riptide Pursuit. |

**Recommendation: keep as written. No departure.**
- Here it is Volcoil's *own* attack that has to miss, so it triggers against Heat Mirage, Shadow Pounce or Mind Game users. That makes it a natural counter-pick.
- It is reported as a rare-trigger outlier for mastery pacing, which spec §16 allows.
- Making a shield block count as a miss would contradict its approved text, so that is not proposed.

Football has no evasion, so no football ability is affected.

---

## Summary of decisions requested

| ID | Decision | Recommendation | Departure from an approved rule? |
| --- | --- | --- | --- |
| P1 | Stoke the Flame damage | 60 / 70 / 80% by form, +0 / 5 / 10 / 15 by mastery | No (fills a gap) |
| P2 | Blazing Resolve carry threshold | at least 4 / 3 / 2 / 1 yards by mastery | No (fills a gap) |
| P3 | Beacon Lane lifetime | 1 / 1 / 2 / 2 plays including the spawn play | No (fills a gap) |
| P4 | Mastery-only values apply to every form | Confirm | No |
| P5 | Pancake formulas and bounds | Approve the table | New numbers by design; changes today's shed formula for DL, CB and S |
| P6 | Event order | Approve both lists | Clash rotation moves after both turns (engine change, required by two contracts) |
| P7 | Special teams | Count participation; (a) live kickoff returns for Dawn Signal | (a) none; (b) and (c) depart |
| P8 | Rotation timing and entry cost | After both turns; (a) half on first turn | (a) cost timing moves and nothing is withheld; (b) and (c) depart from `half` |
| P9 | Caps and cap behaviour | Computed caps; never refuse a legitimate effect | No |
| P10 | Miss-only abilities | Shadow Pounce shadow-step 15 / 20%; Mind Game afterimage 15%; Arc Rebound unchanged | Shadow Pounce and Mind Game (a) add behaviour; (b) keeps the text |

## Other open items, outside P1–P10

- **Round 1 item 16, Football Stunned.** Stunned disables a monster for the rest of the play (approved). It is still undecided how that interacts with a remaining multi-play duration. The round-2 proposal (R2-8) is withdrawn, and no replacement is offered without your direction.
- **Round 1 item 6, TE Strength and contested catches.** Not approved. Only WR Strength is approved (spec §12). It stays as Clarify.
- **Round 2 items.** R2-1–7, R2-9–16 and R2-18–22 carry their round-2 recommendations unless you object. R2-16 (entry cost) is replaced by P8.

## §11 Contradictory active instructions to remove at consolidation

When P1–P10 are resolved, these are rewritten or marked superseded in the GitHub specification and Dex data, before any new
system is connected to gameplay:

1. **`abilities.json` FIR-01-F, Blazing Resolve core resolution:** the "one live second" text. Spec §9 and §19 already retire it.
2. **The phrases "normal evasion", "normal dodge" and "standard evasion"** in the 39 + 3 Clash contracts in P10. Restate them as "explicit miss effects".
3. **Dawn Signal's "Flag implementation prerequisite" note.** Replace it with the P7 ruling.
4. **`src/clash/balance-manifest.js`, `swapCost: 'half'`.** Redefine it under the P8 ruling.
5. **Beacon Lane's "Keep existing creator lifetime", and Blazing Resolve's "thresholds are in Progression".** Replace them with the P3 and P2 values.
6. **Spec §9's failed-pancake "End failed engagement".** Qualify it with the recovery roll (round 1 item 7, P5).
7. **The Nov 5 natural-growth cap wording in spec §6.** Already marked superseded; delete it from the active text.
8. **Legacy `src/data/species.js` and the old Nature multipliers.** These are retired once the Dex adapter is connected to gameplay (spec §3, §19).
