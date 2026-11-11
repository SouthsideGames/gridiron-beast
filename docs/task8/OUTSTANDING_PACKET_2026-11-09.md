# Outstanding-work packet: abilities (Task 8, branch task8-implementation at 4e41043)

> Superseded by owner approval N9d of the nine recommendations. See `N9D_APPROVED_IMPLEMENTATION.md` for current rules and validation. This packet is retained as decision history.


Read-only review. Nothing was changed. Where I interpret rather than quote, the text says "inference".

State of the 144 abilities (completion matrix): all 144 are built and every reviewer variant runs first time (816 of 816). What is left: 11 football and 3 Clash abilities whose presentation is partial, and 25 Clash abilities with one path switched off "awaiting ruling".

---

## Section 1. The eight football abilities that cannot be shown before the play choice

**Background that applies to all eight.**
- The game has no step between "the previous play ended" and "both plays are chosen". Who is on the field and where each monster lines up exist only as part of a chosen play.
- Measured from the playbook: 187 offensive and 178 defensive plays. The first receiver, the running back and the first linebacker are on the field in every play. The second receiver is in 141 of 187 offensive plays, the third receiver in 60, the tight end in 127. The free safety is in 149 of 178 defensive plays, the strong safety in 76, the second linebacker in 80. Line-up spots vary play to play (the running back has 7 lateral spots, from the centre to 11 yards wide; the safeties range across most of the field).
- The opponent's chosen play is hidden until the snap. The play-call screen already refuses to draw any banked field whose position reads a defender's line-up in the opponent's call, for that reason.
- Today all eight are computed after both choices, are locked from then on (no reroll), and are shown in the short "before the snap" run-in. The six fields then show on later play-call screens while they last.
- General rule, spec §11: "Earned next-snap fields use the upcoming formation reference, not stale prior-ball locations. Show them before both teams' choices and keep placement stable through audibles where approved."
- Owner ruling G3 (N7d): Bloom Break, Bramble Trap and Crosswind Rescue "wait for their creator's next eligible on-field snap before spawning".

| # | Ability | (a) Approved creation and visibility text (Dex) | (b) What it needs that does not exist before the choice | Hidden from opponent? | (c) Smallest proposed resolution | (d) Class |
|---|---|---|---|---|---|---|
| 1 | **Runway** | "Before BOTH play choices on next participating offensive scrimmage snap while ready. Activate regardless of later route-running or blocking assignment; never read future selected play." "Needs pre-choice field creation and seeded geometry snapshot". Its own row has no "both teams see" sentence; visibility before the choice comes only from the general §11 rule and from "pre-choice field creation" (inference). | Position needs nothing: it already uses a fixed reference per receiver slot, never the chosen play. The only missing fact is whether he is on the field in the offence's chosen play ("next participating"). Certain for the first receiver; not for the second or third. | Yes (the offence's choice) | Work out the corridor before the choice and draw it with the existing play-call field drawing. One edge to confirm: if he is not in the play the offence then picks, does the shown corridor simply not appear and stay ready? (That is what G2/"participating" implies; inference.) | **ENGINEERING LIMITATION** (one edge confirmation) |
| 2 | **Bloom Break** | "Before play selection use initial pre-play formation snapshot. Create TWO recorded random, non-overlapping 6-yard-wide x 4-yard-long rectangles between initial defensive line and FIXED safety-reference depth 12 yards beyond upcoming LOS." "Both teams see patches before choosing plays; later changes never move/reroll them." "Show recorded placement to BOTH teams before choosing plays." | Position needs nothing from the choices: two seeded random draws inside a fixed band from the ball spot ("initial defensive line" is read as the line of scrimmage). The only missing fact is whether he is on the field in the offence's chosen play (G3). | Yes (the offence's choice) | Same as Runway: draw the two patches before the choice. Same edge: if he is not in the chosen play, G3 keeps the activation waiting; the draw is seeded per play, so the patches would land elsewhere next time, against "never move/reroll them" (inference: confirm this is acceptable, or fix the draw when first shown). | **ENGINEERING LIMITATION** (one edge confirmation) |
| 3 | **Crosswind Rescue** | "Next eligible defensive scrimmage pre-play creates lanes while source able, before BOTH play selections." "Left/right outer edges meet playable sidelines; longitudinal band upcoming LOS+5 throughLOS+12. Normal field-boundary clipping; locked after reveal." "no pre-choice reroll/audible reposition." | Position needs nothing: both lanes are fixed to the sidelines and the ball spot. Missing: whether the safety is on the field in the defence's chosen play (G3; free safety 149 of 178 plays, strong safety 76 of 178). "Able" is known beforehand. | Yes (the defence's choice) | Same as Runway: draw the lanes before the choice. Same edge to confirm when the defence then picks a play without him. | **ENGINEERING LIMITATION** (one edge confirmation) |
| 4 | **Charge Strip** | "Next participating offensive scrimmage pre-play: eight yards sideline-to-sideline by five yards longitudinal, from LOS to the fixed five-yard LB reference. Lateral center uses Volcoil's initial alignment". "Reveal before both teams select plays, then lock placement." | The strip's sideways position is the running back's line-up spot in the offence's chosen play (7 different spots). Depth is fixed. He is on the field in every offensive play. | Yes. Drawing it early would show the defence where the back will line up. | Owner rules what "initial alignment" means before a play exists. Smallest: use one fixed reference spot for the slot, as Runway already does; the strip can then be shown before the choice. This moves the strip on plays where he lines up elsewhere. Alternative with no build: accept the present timing (after both calls, before the snap). | **GENUINE GAMEPLAY DECISION** |
| 5 | **Static Field** | "Automatically create before a ready participating defensive scrimmage play, including the first." "Depth runs from five to twelve yards beyond upcoming LOS. Lateral center is Statyx initial alignment." "Reveal before both teams select plays and lock initial placement." | The field's sideways position is the safety's line-up spot in the defence's chosen play (anywhere from the middle to about 14 yards wide), and whether he is in that play at all. Depth is fixed. | Yes. Drawing it early would show the offence where the safety will stand. | Same ruling as Charge Strip: a fixed reference spot for "initial alignment", or accept the present timing. | **GENUINE GAMEPLAY DECISION** |
| 6 | **Bramble Trap** | "Before play selection choose uniformly from participating NON-NATURE defenders in initial pre-play formation. Center stationary8wide x6long patch on chosen defender INITIAL position." "Recorded target and initial position are locked before both teams choose plays; no reload/audible reroll." Visuals: "Both teams see target/patch before snap; seed drops beneath chosen defender and blooms." Note: the visibility sentence says "before snap", not "before the choice"; that is already met today. Only the "locked before both teams choose" wording and the general §11 rule point to before the choice. | Which defenders take part, and where the chosen one stands. Both come only from the defence's chosen play. Also whether the tight end is on the field in the offence's chosen play (127 of 187). The chooser itself is a seeded random pick. | Yes (the defence's choice; the patch would mark a defender's exact spot) | Smallest: confirm that "Both teams see target/patch before snap" is the visibility rule, in which case nothing further is owed. Otherwise the owner must define an "initial pre-play formation" that exists before any call (a new rule), and the patch would sit on that reference spot rather than on the defender's real spot. | **GENUINE GAMEPLAY DECISION** (possibly not a defect at all, on the Visuals wording) |
| 7 | **Foresight** | "Before either side selects plays while ready, randomly mark one initially aligned opposing LB within 3 yards of LOS. Both sides see candidate. At snap validate marked defender actually blitzes." "No future defensive choice inspection, substitute target or new audible selection. Keep same candidate through audibles and use final assignment at snap." "Candidate seeded/saved before choices." Story: "The defender must decide whether the blitz is worth the risk". | The candidate list is "linebackers lined up within 3 yards of the line", and line-up depth exists only in the defence's chosen play. Today the mark is drawn at the snap from that play. Whether he blitzes is meant to be checked at the snap and is not the problem. Also missing: any moment at which the defence chooses while seeing the mark, which the story text depends on. | Yes. A mark drawn from the real line-up tells the offence a linebacker is close to the line in the call. | Owner defines "initially aligned" without a call (a standard depth per linebacker slot), and approves a mark step before both choices. Caution from the M3 report: "12 of 258 playbook LB alignments are within 3 yards of the line", so the reference chosen decides how often the ability can fire at all. Whether the computer-run defence should react to a mark is a further question the sources do not answer. | **GENUINE GAMEPLAY DECISION** |
| 8 | **Prism Break** | "Three charges arm Prism Break for the next eligible defensive pre-choice opportunity." "Choose nearest existing enemy-created environmental zone anywhere on field, distance to nearest edge, creation order breaks ties." Visuals: "selected field fractures into fading light before play choices." | (i) "Nearest" to what is not stated; the build measures from his line-up spot in the defence's chosen play. (ii) Whether he is in that play. (iii) The build runs it after this snap's new fields appear, so it can remove a field created at that same snap, which cannot be known before the choice. | Yes (the defence's choice). It also changes the field both sides plan around. | Owner rules the measuring point before a call exists (a fixed reference spot, or the ball), and that only fields already standing before the choice can be removed. With exactly one enemy field and a certain participant the answer is the same either way (inference). | **GENUINE GAMEPLAY DECISION** |

**Section 1 result.** Three are engineering only (Runway, Bloom Break, Crosswind Rescue): their position never depends on a chosen play, so the completion matrix's blanket wording "created inside the snap from the two chosen plays" overstates the obstacle for them. They share one small edge to confirm (creator not in the play then chosen). Five need the owner: Charge Strip and Static Field (one shared question: what "initial alignment" means before a play exists), Bramble Trap, Foresight, Prism Break.

---

## Section 2. The 25 Beast Clash abilities awaiting a ruling

**Count check.** The matrix lists 25 and the groups below add to 25 distinct names:
Falling Star, Faultline, Night Swoop, Predator Rhythm, Radiant Pursuit, Daybreak Lance, Iron Bite, Mind Game, Circuit Breaker, Stone Divide, Bank Shot, Refraction, Canopy Assist, Astral Strike, Molten Brand, Rubble Reprisal, Feather Relay, Cinder Clamp, Riptide Pursuit, Cold Welcome, Shell Harvest, Forge Swipe, Fortress, Dawn Song, Clear Light.
(7 perk + 7 Stone Divide + 5 Feather Relay + 2 delayed + Forge Swipe, Fortress, Dawn Song, Clear Light = 25; Daybreak Lance sits in two groups.)

**Behaviour common to every group (owner direction N9a).** In normal play the ability does not act on the disputed path: it reports "awaiting ruling" and keeps its use; everything else in the ability runs as approved. The provisional reading runs only in the reviewer and in labelled provisional tests. A ruling is a one-line switch.

### Group A. Core text against the mastery ladder (4 abilities)

| Ability | Core text | Progression text | Differs at | Reviewer reading |
|---|---|---|---|---|
| Daybreak Lance | "160% normal damage" | "Damage 145 / 160 / 175 / 190% by mastery" | tiers 1, 3, 4 | ladder |
| Clear Light | "heal 10% maxHP" | "Heal 8 / 10 / 12 / 14% by mastery" | tiers 1, 3, 4 | ladder |
| Forge Swipe | "for 2 owner normal turns" | "Duration 1 / 2 / 2 / 3 turns by mastery" | tiers 1, 4 | ladder |
| Fortress | "store prevented HP damage up to20% maxHP" | "Storage cap 10 / 15 / 20 / 25% maxHP by mastery" | tiers 1, 2, 4 | ladder |

- Question: which text governs where they differ?
- Prior decisions: **not settled.** N8d D13 is open by the owner's own words: "show the conflicting text and the Progression values before applying any precedence decision"; the texts are now shown (open-items §13). Spec §1 precedence approves the Dex with its "progression rows" but does not rank one row of a contract against another. Forge Swipe and Fortress are the same question found later.
- One answer covers all four.

### Group B. Do the archetype perks apply to these strikes? (7 abilities)

Approved rule (N8d D5): "Striker shield-break and Disruptor pierce apply to ordinary attacks only. Tank guard applies only while the Tank is active. Explicit ability exceptions are preserved." The open point is whether each strike is an "ordinary attack". It matters only when a Striker hits a Shielded target, or a Disruptor hits an active Tank. Reviewer reading: no perk for six of them; perk kept for Mind Game's trick attack.

| Ability (archetype) | Contract wording | Does D5 already settle it? |
|---|---|---|
| Iron Bite (Striker) | "Ready own normal action replaces attack if enemy active has Shielded with positive pool"; own "Shield multiplier1.5/1.75/2/2.25 by mastery" | **Appears settled (inference):** it replaces the attack, so it is not an ordinary attack, and it carries its own explicit shield rule. Same as the reviewer reading. |
| Daybreak Lance (Striker) | "Once per Clash on own ready normal action; replaces attack"; "Does not ... bypass shield" | **Appears settled (inference):** replaces the attack. Same as the reviewer reading. |
| Circuit Breaker (Disruptor) | "automatically replace normal attack when active opponent has an ability currently recharging" | **Appears settled (inference):** replaces the attack. Same as the reviewer reading. |
| Mind Game (Disruptor) | "Base attack normal damage"; "Exact enhanced/ordinary archetype policy follows final shared reconciliation." | **Appears settled (inference):** the contract defers to the shared policy, D5 is that policy, and the attack is at normal damage. Same as the reviewer reading (perk kept). |
| Radiant Pursuit (Striker) | "Own normal attack when enemy target HP is below 35%"; "retain normal-attack identity for ordinary archetype perks only where global perk policy permits (G06)" | **Not settled.** The contract leans toward keeping the perk; the reviewer reading removes it. Needs the owner. |
| Night Swoop (Striker) | "Resolve this first normal attack ... at 110 / 120% normal damage" (silent on perks) | **Not settled.** D5 does not say whether a boosted normal attack is still "ordinary". |
| Predator Rhythm, third strike (Striker) | "next own normal attack on that monster is empowered" (silent on perks) | **Not settled.** Same question. |

- Flag: for the first four, the gate could be lifted without a new ruling if the owner accepts that D5 already covers "replaces attack" and Mind Game's deferral. The plan's own list was never approved ("Recommendations are not approved by silence"), which is why the team left all seven gated.
- Real remaining question (one): is a normal attack with a damage bonus still an ordinary attack for perks? It decides Radiant Pursuit, Night Swoop and Predator Rhythm together.
- Not gated but listed for review: Astral Strike's own attack, which its contract calls a "100% ordinary normal attack".

### Group C. How far Stone Divide reaches (7 abilities)

- Stone Divide's text: "automatically intercept first eligible enemy extra strike"; "Includes Twin Thunder bolt, Victory Surge, Arc Rebound, Riptide Pursuit and attack-based retaliation"; "Ordinary attacks, normal-action specials, delayed meteors/fissures, DOT and transferred damage unaffected."
- Question 1: does it stop the second hits that happen inside a normal action: Bank Shot's ricochet, Refraction's secondary hit, Canopy Assist's strike, Astral Strike's commanded attacks? The unapproved plan lists them as extra strikes; the contract says "normal-action specials ... unaffected".
- Question 2: are Molten Brand's eruption and Rubble Reprisal "attack-based retaliation"? Molten Brand: "Eruption is reaction damage" set off by the branded monster's attack. Rubble Reprisal: "reacts after enemy healing with one rock attack" (set off by healing, not by an attack).
- Reviewer reading: Stone Divide stops all six. Normal play: Stone Divide does not act against these six; the six strikes themselves still resolve.
- Prior decisions: **not settled.** D16 approved only the process of showing the table. Spec §1 ranks the Dex contract above the plan, and the contract's words lean against the reviewer reading for Question 1 (inference), but "follow-up" is not defined, so this still needs the owner. D17 (Canopy Assist "strongest") is settled and is not part of this gate.

### Group D. Delayed impacts: which position is marked, and the battle cap (2 abilities)

- Falling Star: "Mark the normal target lineup position, not combatant identity; normally the opposing front. Current occupant takes main hit." "Empty main slot: splash still hits every living opponent." Faultline: "Mark lineup position occupied by normal attack target, not monster identity. Current occupant at eruption receives main hit." "Empty marked slot: no damage/status."
- Question 1: when the original target is no longer the active fighter at impact, who is hit? Reading "the active position": the new active fighter (then "empty slot" can practically never happen). Reading "the line-up place": the original monster's place, which may now be in reserve or empty.
- Question 2: a delayed impact still in the air when the battle reaches its 30-exchange cap: discarded, or resolved before the tiebreak?
- Reviewer reading: active position; discarded at the cap. Normal play: awaiting ruling only in those two situations.
- Prior decisions: **not settled.** Spec §1 fixes one active fighter per side but does not say which reading applies. Question 2 is part of N8d D8, which the owner left open ("how pending delayed effects and knockouts resolve at the cap").

### Group E. Is a Feather Relay rotation "voluntary"? (5 abilities)

- Feather Relay itself is ruled and built (N8d D3, reconciled by N9a): "Counts as a rotation without the 50% entry penalty. Every other rotation restriction (locks, legal availability, cadence) is kept unless the contract explicitly exempts it." No conflict with its contract was found.
- Still open: four abilities react only to voluntary rotations. Cinder Clamp: "the target side's NEXT VOLUNTARY rotation request consumes the grip". Riptide Pursuit: "react to the first OPPOSING VOLUNTARY rotation"; "Forced rotations and KO replacements do not trigger it". Cold Welcome: "on a SUCCESSFUL ENEMY VOLUNTARY rotation only (forced rotations and KO replacements excluded)". Shell Harvest: "A SUCCESSFUL VOLUNTARY departure consumes the entire remaining ORIGINAL Shell Harvest shield". Feather Relay's contract never uses the word.
- Reviewer reading: voluntary. Normal play: the relay happens; the four do not react to it.
- Prior decisions: **not explicitly settled, but they point one way (inference).** The entry penalty and the four-exchange cadence belong to voluntary rotations (P8), and the ruling treats the relay as subject to both (exempting one, keeping the other). A relay is also neither of the two exclusions the triggers name (forced, knockout replacement). A one-line confirmation of "voluntary" would lift the gate for all five.

### Group F. Clear Light's cooldown unit (1 ability)

- Text: "Heal 8 / 10 / 12 / 14% by mastery; cooldown 5 turns fixed." No unit; its Recharge row states no cooldown at all.
- Question: whose turns? Reviewer reading: the owner's normal turns, as every other Clash cooldown is worded (for example Iron Bite "Cooldown 5 owner turns fixed", Dawn Song "Cooldown 6 owner turns fixed").
- Prior decisions: **not settled** (no ruling names it). Small.

### Group G. Dawn Song's target (1 ability)

- Text: "Ready own normal action replaces attack if active front ally is injured and has empty status slot." "Front ally, self only if actually front."
- N8d D14 (open): "show the approved target text and clarify whether the proposal means 'self only' or 'self included'." Answer from the plan: it meant self only.
- Prior decisions: **effectively settled, pending acknowledgement.** Spec §1: "Preserve one active Clash fighter per side with reserves." Dawn Song is cast on the caster's own turn, so the caster is always the front; both readings give the same target. The only thing to confirm is the consequence: Dawn Song is a self-heal. The gate could be lifted without choosing between readings.

### The three whose only valid demonstration is provisional

| Ability | Why every real use lands on a gated point | What would release it |
|---|---|---|
| **Iron Bite** | It can only be used against a Shielded target, and its owner is a Striker. Striker against Shielded is exactly the case where the perk question (Group B) decides the numbers. All 4 variants gated. | Accepting that D5 already covers an ability that "replaces attack" (no new rule needed; inference). |
| **Dawn Song** | Every cast must pick its target, and the target is the open D14 point. All 8 variants gated. | Acknowledging that it heals the caster (Group G). |
| **Clear Light** | Every cast starts its cooldown, whose unit is unstated (Group F); the heal amount is also disputed at three of four tiers (Group A). All 4 variants gated. | The cooldown unit and the Group A answer. |

For all three the artwork exists and is correct in the reviewer; it is "partial" only because normal play never reaches it.

### Engine defaults that have no "off" state (a battle cannot run without some rule; each keeps the default shown until ruled)

| Default | In force now |
|---|---|
| Sudden-death ramp (part of open D8) | Earlier approved-values ramp from exchange 12, on every direct strike; not on Afflicted ticks, heals or shields |
| Stalemate reduction (part of open D8) | The earlier "C6" factor on every heal and every shield granted; not on damage |
| Battle cap (part of open D8) | Ends after exchange 30; HP-share tiebreak; exact tie to a seeded coin |
| Tank bruise (open D6) | Not implemented at all |
| Knockout replacement | First living reserve in line-up order, for player and computer |
| Stunned countdown on the protected turn (D4 approved; handling to be documented) | The protected turn does not count Stunned down; each unit costs exactly one skipped turn |
| Initiative ties | Speeds closer than 2 are a tie, decided by one seeded coin |
| When a status starts counting | Applied outside the recipient's own turn: its next turn counts. Applied during its own turn: that turn does not |
| Multi-hit against a target that is knocked out | Remaining hits cancelled; nothing retargets (Gust Hop) |
| Order of reactions | The hit's recipients first, then other monsters by stable id |
| Reaction chains | None: a reaction or counter never triggers further reactions |
| Suppressed or reaction strikes | Other monsters' reaction strikes are refused; heals, statuses and the attacker's own follow-ups still happen (Daybreak Lance and all reactions) |
| "Performed attack" | Counts when launched, even if it misses (Riptide Charge, Gust Hop, Refraction, Forge Swipe, Coil Renewal, Night Swoop, Dragon Roar) |
| What counts as "healed" for Rubble Reprisal | Heals and Mind Mend donations yes; redistribution, revival and HP costs no |
| Molten Brand against Daybreak Lance | The eruption is treated as attack retaliation and suppressed |
| Heat Mirage decoy | Rolls against normal-action and delayed attacks only |
| Second Wind | Moves its ally past a priority tier, not past an interrupt |
| Riptide Charge "opposing team chooses" | First living reserve (no player prompt yet) |
| Feather Relay turn | The active ally's turn used by the relay counts as its normal turn |
| Delayed impact position | The active position (the reading behind Group D) |
| Tempered Guard cap | 30% of max HP, rounded down |
| HP transfers (Mind Mend, Root Communion) | No entry penalty and no stalemate factor |
| Entry penalty on status chances | Applies to nothing (no Clash ability has such a chance on a normal turn) |
| Post-knockout exceptions | The N7c list of eight: Falling Star, Faultline, Molten Brand, Shared Burden, Mountain Shelter, Astral Strike, Cinder Clamp, Second Spring |
| Shared Burden rounding (D9 approved; reading) | Raw damage made whole once before the split, then each share rounded once |
| Shield break rounding (D9 approved; reading) | Pool loss and HP loss each rounded once, half up |
| Knockout and clocks | Clears status and duration clocks; keeps cooldowns |
| Afflicted tick | Exactly its stated amount (0 if none stated); direct HP loss with no type, guard or shield |
| Empty shield | A pool at 0 ends Shielded |
| Shield strength across modes (D11 approved; unit reading) | Clash strength is the pool in HP; carried as a percentage of max Clash HP; never refilled |
| Line-up order | Rotations never reorder the line-up |
| Unspent entry penalty | Ends if the entrant leaves again before its first turn |
| Order of rotation effects | Delay (Cinder Clamp), pursuit (Riptide Pursuit), cash-out (Shell Harvest), departure, entry, arrival (Cold Welcome, Downdraft) |
| What the computer opponent may see | Only what both players see |
| Deep Winter freeze | Counts every recipient turn, including the protected turn |

Settled and not on any list above: D9 arithmetic, D15 Emergency Cover, D17 Canopy Assist "strongest", D18 Second Spring.

---

## Section 3. Every presentation partial (11 football, 3 Clash)

| # | Ability | What exists | What remains | What it needs | Size |
|---|---|---|---|---|---|
| 1 | Runway | Reveal in the run-in before the snap; field shown on later play-call screens while it lasts | Show before both choices | Reuse of the play-call field drawing plus an early calculation; one edge confirmation | Small to medium |
| 2 | Bloom Break | Same | Same | Same | Small to medium |
| 3 | Crosswind Rescue | Same | Same | Same | Small to medium |
| 4 | Charge Strip | Same | Same | A ruling on "initial alignment", then the same reuse | Medium (after ruling) |
| 5 | Static Field | Same | Same | The same ruling, then the same reuse | Medium (after ruling) |
| 6 | Bramble Trap | Same, with the seed dropping under the chosen defender | Show before both choices, if required at all (Dex Visuals says "before snap") | A ruling; nothing to build if "before snap" is accepted | None, or medium |
| 7 | Foresight | Eye and floor marker in the run-in, after both calls | Mark shown to both sides before either chooses | A ruling and a new step before the choice (new screen state) | Large |
| 8 | Prism Break | Prism, beam and fracture in the run-in, after both calls | Fracture before the choices | A ruling on the measuring point and same-snap fields, then reuse | Medium (after ruling) |
| 9 | Night Watch | Owl-eye ring on the field; protection note in the last play's ability strip | Dex: "allies inspect shows Dark-awareness protection" | A new inspect panel on the match screen (none exists), or acceptance of the strip | Medium (one panel serves 9 and 10) |
| 10 | Iron Lungs | Breath plume; saved-drain tick in the last play's ability strip | Dex: "saved-drain tick on stamina inspect" | The same new inspect panel, or acceptance of the strip | Small once the panel exists |
| 11 | Sovereign Arm | Seal, dragon mouth, incomplete pass; portrait indicator in the scoreboard strip while the defender is out | Dex: "return animation before formation" | A formation animation on the play-call screen (none exists today) | Medium |
| 12 | Iron Bite (Clash) | Complete look, shown only in the reviewer's provisional mode | Appear in normal play | A ruling or acknowledgement only (Group B); no build | None |
| 13 | Dawn Song (Clash) | Complete look, provisional mode only | Appear in normal play | Acknowledgement only (Group G); no build | None |
| 14 | Clear Light (Clash) | Complete look, provisional mode only | Appear in normal play | Rulings only (Groups A and F); no build | None |

---

## Summary

**Needs the owner (decisions).** Football: 4 questions covering 5 abilities (the meaning of "initial alignment" before a play exists, shared by Charge Strip and Static Field; Bramble Trap's timing; Foresight's mark step; Prism Break's measuring point), plus 1 small edge confirmation shared by Runway, Bloom Break and Crosswind Rescue. Clash: 7 grouped questions covering all 25 gated abilities (Core against ladder; perks on boosted normal attacks; Stone Divide's reach; delayed-impact position and cap; Feather Relay "voluntary"; Clear Light's cooldown unit; Dawn Song's target), of which Dawn Song, the Feather Relay point and four of the seven perk abilities (Iron Bite, Daybreak Lance, Circuit Breaker, Mind Game) look answerable from decisions already made and need only a yes; plus the two long-open items D6 (Tank bruise) and D8 (battle length) that sit behind the engine defaults, and optionally a read-through of the other defaults listed. **Engineering only.** 3 football reveals (Runway, Bloom Break, Crosswind Rescue), the inspect panel for Night Watch and Iron Lungs (or acceptance of the strip), and Sovereign Arm's return animation: 6 abilities, no rule change. The 3 Clash partials need no engineering at all; they clear the moment their rulings land.
