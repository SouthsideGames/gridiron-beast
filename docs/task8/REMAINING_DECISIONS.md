# Task 8: remaining decisions (one batch)

> **Resolved 2026-11-07 10:00 (N7c).** Every item below has a binding ruling; see [APPROVAL_REGISTER.md](APPROVAL_REGISTER.md) and [RULINGS_2026-11-07b.md](RULINGS_2026-11-07b.md). Where a ruling differs from a recommendation here (B3 fumble order, B18, B20), the ruling governs. Kept as the proposal record.

This batch lists every row still **Open** in [APPROVAL_REGISTER.md](APPROVAL_REGISTER.md). Each item gives a recommendation and
flags any departure from an approved rule. Nothing here is approved until you rule on it.

---

## B1 — Pancake constants (P5 correction)

**What was wrong with revision 2.** Its example lost the block on about 22% of attempts: (1 − 0.36) × (1 − 0.66) = 0.218. The
target maximum was 15%.

The constants were then measured on real games rather than a single example. The setup:

- 120 engine games between current league AI clubs;
- 11,034 lineman-plays, about 28.7 per starting OL per game;
- each lineman paired with an opposing starting DL.

That measurement shows revision 2 was miscalibrated far beyond the example:

| Revision 2 rule | Pancakes per OL per game | Success | Attempts losing the block |
| --- | ---: | ---: | ---: |
| Hard threshold θ = 0.10 | **1.55** (target 0.2–0.6) | 37% | **25%** |
| Hard threshold θ = 0.15 | 0.27 | 54% | 11% |

The θ = 0.15 row looks acceptable, but **one lineman produced 100% of the league's pancakes**.

The reason: ratings make each lineman–defender pairing's advantage fixed, so a hard threshold gives some pairings a pancake
chance on every play and all other pairings none.

**Corrected rule (recommended).** The approved structure is unchanged:

- one attempt per OL per play;
- no chance without an advantage;
- Awareness decides recovery;
- rest-of-play Knocked Down on success.

Only the eligibility step becomes **advantage-scaled instead of a hard threshold**:

1. **Advantage.** A = (B − shed) / 100, type-scaled. B = 0.6 Blocking + 0.4 Strength. The shed score is whatever ordinary shed formula is in force (today's, or B2's if approved).
2. **Opportunity.** At the lineman's first engagement of the play, one roll with chance q = qmax × clamp((A − a0) / w, 0, 1). There is no chance at all when A ≤ a0.
3. **Success.** p = clamp(b + s × (P − R) / 100, lo, hi). P = 0.4 Strength + 0.4 Blocking + 0.2 Tackling (lineman); R = 0.6 Strength + 0.4 Agility (defender).
4. **Recovery after a miss.** r = clamp(c + k × Awareness / 99, c, rmax). Recovered: the block continues. Not recovered: the block ends and Stumbled is attempted (approved).

| Constant | Start | Bounds |
| --- | ---: | --- |
| a0 (advantage where chances begin) | 0.00 | −0.05 to 0.05 |
| w (advantage width to reach the full chance) | 0.15 | 0.10–0.20 |
| qmax (largest opportunity chance) | 0.15 | 0.10–0.20 |
| b (success at equal power and resistance) | 0.35 | 0.25–0.45 |
| s (success slope) | 1.5 | 1.0–2.0 |
| lo, hi (success floor, ceiling) | 0.05, 0.80 | 0.02–0.10, 0.70–0.90 |
| c (recovery floor) | 0.60 | 0.55–0.70 |
| k (Awareness slope) | 0.40 | 0.30–0.45 |
| rmax (recovery ceiling) | 0.95 | 0.90–0.97 |

**Measured with these start values (same 120 games):**

| Measure | Result | Target |
| --- | ---: | --- |
| Attempts per OL per game | 0.76 | — |
| **Pancakes per OL per game** | **0.30** | 0.2–0.6 |
| **Success per attempt** | **39%** | 30–50% |
| **Attempts that lose the block** | **12.1%** | ≤ 15% |
| Share of pancakes by the top 10% of linemen | 37% | — |
| Starting linemen with any pancake chance | 20 of 36 | — |

How the measured results move across the bounds:

| Change | Effect |
| --- | --- |
| qmax 0.10 / 0.20 | 0.20 / 0.40 pancakes per OL per game |
| b 0.25 / 0.45 | 29% / 49% success |
| c 0.50 / 0.70 | 18% / 6% lost blocks |

c = 0.50 fails the 15% target, which is why c's lower bound is 0.55.

**The worked example, recomputed.** Lineman: Strength 70, Blocking 75, Tackling 40, Awareness 60. DL: Strength 60, Agility 65,
Tackling 50.

| Step | Result |
| --- | --- |
| Advantage | A = 0.125 |
| Opportunity chance | q = 0.15 × 0.125 / 0.15 = 0.125 |
| Success | p = 0.35 + 1.5 × 0.04 = 0.41 |
| Recovery | r = 0.60 + 0.40 × 60 / 99 = 0.84 |
| Lost block per attempt | 0.59 × 0.16 = **9.3%** |

**How the 15% target works.** It is a league average per attempt, not a per-attempt guarantee:

| Lineman | Lost block per attempt |
| --- | ---: |
| Low-Awareness (35) at p = 0.30 | 18% |
| Awareness 0 at the success floor (absolute worst case) | (1 − lo)(1 − c) = 38% |

**Departures:**
- The advantage-scaled opportunity chance (q) replaces revision 2's hard threshold. It is still advantage-based (no chance without an advantage), but it adds three constants (a0, w, qmax) for approval.
- All constants are new numbers.

**Caveat:** this was measured on today's species ratings. Task 8 rosters regenerate from the Dex, so the constants are
re-measured at the integration milestone, moving only within these bounds.

## B2 — Ordinary block-shed formula (separated from pancakes)

**Context.**
- Round 1 item 6 approved the Appendix C attribute roles: Agility is the primary shed attribute for DL, CB and S; Strength is primary for LB.
- The engine uses one Strength-primary formula for every defender.

**Recommendation.**

| Defender | Shed score |
| --- | --- |
| DL, CB, S | 0.5 Agility + 0.3 Strength + 0.2 Tackling |
| LB | 0.5 Strength + 0.3 Agility + 0.2 Tackling (unchanged) |

**What changes.**
- This changes ordinary blocking for those positions: sacks, run stops and pressures. It is checked by the football balance run at the first integration milestone.
- It also moves pancake advantages. With B1's start values and this formula: 0.43 pancakes per OL per game, 37% success, 12.7% lost blocks, all within target.

**Departure:** none from approved roles. The weights are new numbers.

## B3 — Event order, revised phases (P6 correction)

Only the affected phases are shown. Everything else in the packet's lists is unchanged.

### Football tick, step 11: catch resolution (replaces the old step 11)

| Step | What happens |
| --- | --- |
| 11a | **Provisional outcome:** catch, incomplete or interception, from the ordinary catch contest. |
| 11b | **Pre-resolution hooks**, before the outcome becomes final. **Sovereign Arm:** a protected pass that would be intercepted becomes incomplete, and the defender's absence is queued. |
| 11c | **Final outcome**, then post-outcome triggers: Second Touch on a failed reachable catch, Tsunami Line on a secured interception, and the rest. |

### Football tick, step 12: contact (replaces the old step 12)

| Step | What happens |
| --- | --- |
| 12a | **Tackle attempt declared:** a defender in reach who may initiate. Vanishing Cut removes that defender's next attempt here. |
| 12b | **Carrier pre-tackle hooks**, before any contest: **Blink** (teleport; a successful relocation avoids the tackle); **Blazing Resolve** (encounter snapshot of every defender already in reach; all their attempts break; ignition spent); **Dragon Pounce** (replaces the contest's chance). A carrier has at most one of these. |
| 12c | **Tackle contest and final tackle or break.** Sacks use the same path. |
| 12d | **Pre-fumble hook:** a Shielded save prevents one otherwise-occurring fumble. |
| 12e | **Fumble roll, then strips:** Ball Clamp's token is resolved on the tackle it applies to. |
| 12f | **Post-tackle triggers:** Bramble Trap after a broken tackle, and the rest. |

### Clash exchange, damage and knockouts (replaces steps 7, 8, 13 and 14 of a turn)

**Step 7 becomes part of step 8.** Survival hooks now run per recipient, after mitigation is known.

**Step 8: damage.**

| Step | What happens |
| --- | --- |
| 8a | **Raw damage**, computed once: attacker power and outgoing modifiers, before any recipient's type or defence. |
| 8b | **Emergency Cover check** for the original active target. Lethality is predicted after its defences. If triggered, the damage is redirected whole to the reserve source before any split (approved: "predict lethality before applying damage or spending survival abilities"). |
| 8c | **Shared Burden split of the raw amount.** The source share is floored and the original target gets the remainder (approved: "compute attacker power and outgoing modifiers once before raw splitting"). |
| 8d | **Each recipient's own mitigation,** in recipient order (original target first, then stable ID): type multiplier, then Guarded, then shield, giving the HP loss. |
| 8e | **Pre-KO hook,** for each recipient whose HP loss would knock it out: **Last Root** sets HP to 1 (approved: "all damage paths need pre-KO hook", including reaction and Afflicted damage). |
| 8f | **Apply HP loss. Immediate KO rule:** a monster at 0 HP is knocked out at that moment (see below). |

**Immediate KO rule (any damage path: direct, follow-up, reaction or retaliation, delayed impact, Afflicted).**

1. **At 0 HP the monster is knocked out immediately.** Its status and episode clear (approved, spec §10).
2. **A knocked-out monster takes no further part.**
   - Its own pending reactions, retaliation, counters, charges, stored tricks, constructs and remaining multi-hit hits are cancelled.
   - Its later turn in this exchange is cancelled.
   - This follows the approved "must survive" clauses: Stoke the Flame, Mirage Veil, Foresight, Wing Shelter, Twin Thunder, Bank Shot and Victory Surge.
3. **Only these explicitly approved exceptions continue after a KO:**
   - Falling Star and Faultline impacts, using the owner's last pre-KO strength;
   - Molten Brand's lethal-hit eruption ("settle both knockouts before winner");
   - Shared Burden: the current hit keeps its split, and the link ends;
   - Mountain Shelter protection already granted;
   - Riptide Pursuit and Astral Strike: ordinary replacement, then continue as written;
   - Cinder Clamp: the owner's KO releases the grip;
   - Second Spring revival on a later own turn.
4. **The replacement enters immediately after the current hit finishes resolving.** That means after every *living* monster's reactions to that hit, and before the next hit, the next follow-up or the next actor. Entry effects run, then Victory Surge (approved: "after replacement arrives").
5. **Afflicted at the end of a turn:** a KO is immediate (subject to Last Root), the replacement enters at once, and the remaining end-of-turn countdowns skip the knocked-out monster.
6. **A side with no living monster loses** at the end of the current hit's resolution, after simultaneous KOs are settled. A double KO goes to the existing seeded coin.

**Step 13** of the old list is replaced by rule 4. **Step 14** keeps its order (Afflicted damage, countdowns, Dawn Song pulses,
owner and recipient countdowns), with rule 5 applied.

**Departures:** none from approved text. Rule 4 fixes a placement the approved text leaves open: the replacement enters after
the current hit, not at the end of the turn.

## B4 — Verified effect limits (P9)

**Method.** The limits are re-derived from real rules, not slot sums. Full derivation with file citations:
[P9_VERIFIED_LIMITS.md](P9_VERIFIED_LIMITS.md).

**Inputs used:**

| Input | Rule |
| --- | --- |
| On-field players | Exactly 7 per side. WR 3 only in Spread; no TE in Spread; OL 3 only in Tight; DL 3 only in Heavy or Pressure; S 2 only in Nickel |
| Substitution | No in-game substitution |
| Legendaries | One offensive and one defensive legendary per club; each legendary unique in the league |
| Fields | Fields persist across possessions on paused clocks |
| Clash lineups | 3, or 5 in playoff overtime; one normal turn per side per exchange |

**Recommended diagnostic limits.** These use the reading that allows the most effects, so each is a true upper bound:

| Quantity | Limit | Revision 2 |
| --- | ---: | ---: |
| Field rectangles, whole field, any instant | **45** | 50 |
| Objects in one scrimmage play, all kinds | **13** | 29 |
| Collision objects in one scrimmage play | **9** | — |
| Objects on a live kickoff | **6** | — |
| Objects persisting between plays | **0** | — |
| Living Terrain clumps | **4 per connected Nature–Earth overlap** (0 today) | 4 |
| Mindstorm echoes per play | **15** | — |
| Moving auras per play | **10** | — |
| Clash delayed impacts | **2 per side** | 5 |
| Clash Twin Thunder constructs | **2 per battle** | 2 per Voltarch |
| Clash Dawn Song heal schedules | **lineup size per side** (3, or 5) | 25 |
| Other Clash persistent state | Cinder Clamp grips, Molten Brand marks, Shared Burden links, Echo Strike memories, Mind Game tricks: at most lineup size per side (Shared Burden: lineup − 1). Heat Mirage decoy and Foresight mirror: 1 per side | — |

**Biggest corrections.**
- **The legendary limit was ignored.** Tempestra, Voltarch and Titanolith are all offensive legendaries, and Aegistron is unique. That cuts objects per play from 29 to 13.
- **Echo Landing and Bulwark Grid reach 1 each, not 3 and 2.** Their cooldowns are longer than their lifetimes.
- **Clash delayed impacts are 2 per side**, because each side has one normal turn per exchange.

**Assumptions.**
- The limits apply within league play.
- The Clash Lab test screen allows duplicate legendaries, so its diagnostics scale with the copies in its lineup.
- If in-game substitution is ever added, these must be recomputed.
- The B20 interpretations use the conservative reading. The approved never-cancel rule (P9) applies regardless.

## B5 — Participation on formula-resolved punts, field goals and extra points (R2-11, item 21)

**Context.** Kickoffs become live plays (P7), so their actual participants are credited. Punts, FG and XP stay formula-resolved
(P7), and today only the kicker and one returner are read.

**Recommendation.**
- **Kickoffs (live, approved P7) need defined units,** which no source specifies. Recommendation: a kicking unit (K plus 6) and a return unit (returner plus 6), declared from a depth list, auto-filled from non-starters first and then starters.
- Each side declares a 7-player punt / FG unit from a depth list.
- That unit counts as participating for status countdowns, stamina drain and rewards.
- No play outcome changes, and no return tackle is credited on formula punts.
- The alternative is to count only the kicker and the returner.

**Departure:** none.

## B6 — Level-XP curve (R2-1)

**Problem.** No curve exists in the new model. Today's 30 + 18 × level needs about 40 seasons to reach level 50, against the
approved median of 5–8 seasons.

**Recommendation.**
- A flat 75 XP per level (3,675 XP to reach level 50).
- The approved XP multiplier (0.5–2.0) is tuned so the median mixed-participation starter reaches 50 in 5–8 seasons.

## B7 — Veteran and starting-history generation (R2-2, items 3–4)

**Recommendation.**
- A generated veteran is created at level 1, then its prior seasons are simulated with the approved model: participation, XP, natural growth, training, evolution and ageing.
- **Accept** when generated and actually-played distributions match: median within 1 level and 2 rating points; quartiles within 2 levels.
- Prospects stay at level 1 (approved).

## B8 — Grading telemetry definitions (R2-6, item 8)

**Recommendation.** These are measurements only; they change no gameplay.

| Measure | Definition |
| --- | --- |
| Pressure | Verified disruption: an altered or early throw, a pressured-throw error, a scramble start, a sack or a hit. Mere proximity does not count. |
| Viable window | Judged against the *responsible* defender only (man key, or zone owner). Viable when he could not reach the catch point by at least 1.0 yd while a throw was possible. No responsible defender: no credit or penalty. |
| Gap and contain | Read from assignments. |

## B9 — Apex contract ask (R2-7, item 14)

**Recommendation (A).**
- Ask = salary(current OVR) + 0.5 × (salary(OVR 99) − salary(current OVR)).
- An undeveloped Apex would ask about 33,540, close to an ordinary OVR-56 starter.
- It is checked by the 20-season cap benchmark.

## B10 — Afflicted and stamina (R2-12, item 22)

**Recommendation.**
- While Afflicted, each counted play drains 1 × (permanent Durability ÷ effective Durability) stamina, as an exact fraction. Capacity never changes.
- Exhaustion is set the moment stamina reaches 0. If the last OT play empties a monster, it enters the deciding Clash exhausted.

## B11 — Mid-Clash save (R2-13, item 23)

**Recommendation.**
- Save the recorded rotation decisions and the last completed exchange, and resume from the seed plus decisions.
- Rewards stay a single once-only step at the end (already enforced by the reward ledger).

## B12 — Test matrix and probability acceptance (R2-15, item 25)

**Recommendation.**
- Contract-derived distinct cases per ability, in eight categories. Duplicates are rejected; shortfalls are reported, not padded.
- Each probability is tested on a fixed seed list, with N = 3.29² × p(1 − p) / h². Pass if |observed − p| ≤ h, with h = 0.02 to 0.05, or 25% relative at very small p.

## B13 — Retire the ten legacy common traits (R2-18, item 28)

**Recommendation.**
- Retire Quick Feet, Anchor, Hard Hitter, Slick, Sticky, Sharp Eyes, Steady Leg, Soft Hands, Bull Rush and the legacy Iron Lungs trait.
- Shared type rules and archetype perks are untouched, and every carrier has its own Dex signature.

## B14 — Retire Nature side effects (R2-19, item 29)

**Recommendation.** Remove the remaining Nature effects without mapping them to Ambition:

| Effect | What remains |
| --- | --- |
| Media-day nature boost | Removed; the hype and star boosts stay |
| Press-question weighting | Removed |
| Pregame +1 by nature group | Removed |
| Legacy contract counter | Removed |
| FA calm / fiery persona terms | Removed |

Temper affects training only.

## B15 — Cornerstone rule (R2-20, item 32)

**Recommendation (A).**
- Keep "no K cornerstones". Granigor stays K and is no longer offered.
- Retire the fixed legacy list with old-save import.

## B16 — AI information rules (R2-21, item 35)

**Recommendation.**
- AI clubs scout under the player's rules and use only public information before a reveal.
- Their own roster is fully known to them.
- Free agents are known to everyone except Temper and Apex, which follow spec §3 and §5.
- Fix the two player-side leaks: the recruit card's exact salary, and the assistant's use of hidden potential.

## B17 — Basic appearance shares (R2-22, item 36)

**Recommendation.** Pick the rarity first, then the family:

| Channel | Basic share |
| --- | ---: |
| Founding and AI rosters, roster fill | 25% |
| Regional scouting | 25% |
| Encounters | 30% |
| Draft | 35% |
| FA arrivals and offseason market | 40% |

- Today's mix among the original rarities is kept for the rest.
- Legendaries keep their own routes, and Apex stays an independent 1%.

## B18 — A Clash-applied Stunned carried into football (item 16)

**Context.**
- Spec §10 transfers supported statuses 1:1 between the opening or overtime Clash and football, with their remaining duration.
- A Clash Stunned can have turns left. You ruled that only the approved rest-of-play football Stunned sources are implemented, and multi-play Stunned is unapproved.

**Options.**

| Option | Effect | Departure |
| --- | --- | --- |
| **(a) Recommended** | A Stunned from Clash clears when the monster enters football, as an unsupported destination effect | From §10's 1:1 transfer, for Stunned only. It adds no new football behaviour. |
| (b) | It disables the monster for the rest of its first participating play, then clears | Adds a new football Stunned source |
| (c) | It counts down over football plays | Multi-play Stunned; unapproved |

Football Stunned always clears at the whistle, so nothing carries from football into Clash.

## B19 — Glacivern is a legendary K, but the legendary rule refuses kickers (new conflict)

**Context.**
- The Dex (authoritative, Appendix A, approved) makes Glacivern a K.
- The approved Task 7 legendary policy allows one offensive and one defensive legendary per club, and states "no legendary is a kicker". The code refuses a legendary K (`src/franchise/fa-legendary.js`).
- Without a rule, Glacivern escapes the per-side limit.

**Options.**
- **(a) Recommended.** A legendary K counts toward the **offensive** limit, since field goals and extra points are scoring plays.
- (b) It counts toward the defensive limit.
- (c) A separate special-teams limit of 1, allowing three legendaries per club.

**Departure.** Every option changes the Task 7 text "no legendary is a kicker", which the Dex has already overtaken. (c) also raises the per-club legendary count.

## B20 — Ability wording the limits check found ambiguous

These decide how some approved abilities are implemented, not just the limits. Each recommendation picks the reading closest to
similar approved text.

| # | Question | Recommendation |
| --- | --- | --- |
| a | **Field clocks.** Do "participating" plays (Runway, Beacon Lane, Mind Bend) mean the creator's own participation, or the field team's? | The **field team's** offensive scrimmage plays. Fields are environmental and persist without their creator (Echo Landing: "Source bench does not prevent creation"). |
| b | **Can an earned field spawn with its creator off the field?** (Burning Wake, Bloom Break, Beacon Lane) | **Yes.** Placement uses the creator's or the ball's initial reference, as each contract states. |
| c | **Cooldown "after creation".** Does it block creating a field earned during the creation play? (Bulwark Grid, Blackout Pocket, Echo Landing) | **Yes, it blocks**, matching Splashdown's explicit wording. |
| d | **Tsunami Line and Burning Wake "two completed plays" / Impact Pyre "completed plays".** Which plays count? | The **creating team's** scrimmage plays on the side where the field sits: defensive plays for Tsunami Line and Impact Pyre, offensive plays for Burning Wake. Kickoffs and formula kicks don't count. |
| e | **Is a kickoff catch a "reception", and is a kickoff a "defensive snap"?** (Cyclonic Release, Fortress Gate) | **No to both.** Kickoffs are special teams, which these contracts' scrimmage wording excludes. |

