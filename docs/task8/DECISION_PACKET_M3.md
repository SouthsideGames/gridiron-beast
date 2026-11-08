# Decision packet: M3 football abilities and the economy (2026-11-07)

Nothing in this packet is owner-approved unless marked so. "Recommendation" means mine. Every value marked **PROVISIONAL** is a
test value in the build, labelled in code, not a balance decision.

## 1. Prism Break (LIG-04-F): why overlaps could not be selected, and the fix

**Approved rule** (Dex, Targets / placement):
- Choose the nearest existing enemy-created environmental zone anywhere on the field.
- "Nearest" is the distance to the zone's nearest edge; creation order breaks ties.
- Base, legendary-created and overlap zones are eligible.

**Why overlaps can never win when zones are whole rectangles.** An overlap O of parents A and B lies inside both A and B.
- From any point outside, the nearest edge of A (or B) is never farther away than the nearest edge of O.
- From a point inside O, the distance to O, A and B is 0 for all three.

So O is at best tied with a parent. The tie then goes to creation order, and O's creation order is its later parent's, so the
earlier parent always wins. O is never selected.

Example: A covers yards 0–10 and B yards 6–16, both 10 wide, with overlap O at yards 6–10.

| Prism Break's position | Whole rectangles (nearest-edge distance) | Picked |
| --- | --- | --- |
| Inside O, yard 8 | A 0, B 0, O 0 | A (created first) |
| Yard 20 | A 10, B 4, O 10 | B |
| Yard −3 | A 3, B 9, O 9 | A |

**Proposed reading** (implemented; your ruling needed). Measure each zone by the area it actually occupies on the field:
- O's footprint is O itself.
- A's footprint is A minus O, because inside O the hybrid replaces A (§11). Likewise for B.

The selection rule itself is unchanged: nearest edge, then creation order, over the same eligible set. Under this reading the
monster standing inside O is nearest O (distance 0; A and B are now farther away), so overlaps become selectable when they really
are nearest. Removing a footprint stores a "hole" so the removed area is never rebuilt, which the contract requires. Code:
`src/sim/abilities/prism.js`, header and `subtract()`.

**Options.**
1. Approve the footprint reading.
2. Keep whole rectangles. Overlap selection is then impossible, and the contract's "overlap zones are eligible" clause is dead text.

**Recommendation:** option 1.

## 2. Missing numbers

### Calibration only (motion; no gameplay duration): **PROVISIONAL test values**

These only set how fast an effect travels across the field. Each still resolves once, at the approved moment.

| Ability | Value | What it changes |
| --- | --- | --- |
| Cyclonic Release (WIN-06-F) | blast 20 yd/s | When a blast reaches a defender, and so whether he is still within 5 yd at impact |
| Landslide (EAR-06-F) | push 8 yd/s | How long the 2–3.5 yd push takes (0.25–0.44 s) |
| Frost Nip (ICE-02-F) | snowball 15 yd/s | Flight time over 2–4 yd (0.13–0.27 s), after which the conditions are rechecked |

### Gameplay duration: Snowfall Slam (ICE-03-F) landing time (**PROVISIONAL 0.6 s**)

The contract says the linebacker "cannot move, cover, block or tackle until both land". So the landing time is exactly how long
he is out of the play.

Sample: 240 plays per setting, the same plays and seeds with and without the ability, a full bar, mastery 0, against a mix of runs
and passes.

| Landing time | Snowballs on an offensive player | Stuns accepted | Obstacles | LB1 tackles (37 without the ability) | Yards a play (5.61 without) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0.3 s | 23 / 480 | 5 | 457 | 32 | 5.75 |
| 0.6 s | 22 / 480 | 4 | 455 | 25 | 5.85 |
| 1.0 s | 21 / 480 | 5 | 443 | 26 | 5.91 |

What this shows:
- Whatever the landing time, about 95% of the snowballs land on empty ground. They become obstacles that block both teams.
- Only about 5% land on an offensive player, so a stun is rare.
- Meanwhile the defense loses its linebacker for the landing time. As built, the ability costs the defense yards at every setting.

That is a consequence of random placement in the 5-yard backfield band (approved), not a timing defect. A shorter landing time
reduces the cost (0.3 s: 32 tackles and +0.14 yards a play, against 0.6 s: 25 tackles and +0.24).

Decision: a landing time, knowing it is a time out of the play. My recommendation is 0.3–0.4 s, and to review the placement rule
if you want the ability to help its defense.

### Contest curves (**PROVISIONAL**; contracts give no formula)

Both use the engine's tackle-contest scale: P(success) = 1 / (1 + e^(−d/16)).

| d | −30 | −20 | −10 | −5 | 0 | +5 | +10 | +20 | +30 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P | 13% | 22% | 35% | 42% | 50% | 58% | 65% | 78% | 87% |

- **Vine Vault** (NAT-02-F, DL): d = his Agility − the blocker's Blocking (type-scaled). Measured against generated clubs (120
  pairings): d at p10 / median / p90 = −26 / −6 / +21, giving chances of 16% / 41% / 79%; mean chance 45%.
- **Stone Charge** (EAR-03-F, RB): d = his Strength − the defender's Strength. Measured over 280 pairings: d at p10 / median / p90 =
  −4 / +23 / +47, giving 44% / 81% / 95%; mean chance 75%.

Decision: confirm the curve, or give a target success rate.

## 3. Rare activations

Full evidence: `docs/task8/M3_RARE_ACTIVATIONS.md` (approved trigger, opportunities, activations, failure reasons, classification
for each). Summary in §3a below.

**Guiding Halo (LIG-03-F) is investigated; detection works.** Ten games with Lumen at QB:

| | Mastery 0 (6-yd radius) | Mastery 3 (12-yd radius) |
| --- | ---: | ---: |
| Offensive plays | 265 | 265 |
| Completions | 102 | 102 |
| Catches within the radius | 0 | 10 |
| Shields applied | 0 | 8 (2 on cooldown) |

The QB-to-receiver distance at the catch was p10 12.2, median 20.4, minimum 9.0 yards. The QB's drop puts every catch at least about
9 yards away, so the approved 6- and 8-yard radii (mastery 0 and 1) cannot be met in this engine. This is geometry, not broken
detection. Nothing is changed.

Decision options for Guiding Halo:
1. Measure the radius from the QB's spot at the throw, or from the line of scrimmage, instead of his position at the catch.
2. Change the radii.
3. Keep it, accepting that mastery 0 and 1 almost never apply.

## 4. Dragon Roar (DRA-05-F): AI use (implemented, **PROVISIONAL policy**)

A player-selectable action is now available to AI kickers under exactly the player's rules:
- the same availability (unused, the real distance up to 90 yards);
- the same chart;
- once per game, spent on the launch.

Policy (`src/sim/coach-ai.js`):
- **In range:** the AI counts a kick as in range when the Roar chance is at least its ordinary range bar of 45%, which is up to
  80 yards.
- **When to use it:** the AI activates on a kick when the Roar improves the chance by more than 5 points. It does not spend the
  single use on a kick its ordinary leg already makes.

The player's button is unchanged. Tested in real AI games (`tests/task8-ai-signatures.test.js`): never more than once a game, and
the chart applied exactly.

Decision: approve the policy, or set different thresholds.

## 5. General readings, contract by contract

**Already approved (preserved):**
- Passive and aura mastery earns at most one credit per game when its core effect applies (SPECIFICATION_BASELINE line 190).
- Eclipse: it prevents starting an active signature inside it; existing effects, passives, launched effects, charges and cooldowns
  continue; a blocked start spends nothing (line 437).
- B20: kickoff catches are not receptions, and kickoffs are not defensive snaps.

**What the 72 contracts say about two-point tries:** 13 exclude them explicitly.

| Contract | Wording |
| --- | --- |
| FIR-01-F | two-point attempts neither charge nor trigger ignition |
| FIR-03-F | neither activate nor advance cooldown |
| FIR-06-F | cannot trigger |
| WAT-04-F | normal scrimmage only, not two-point attempts |
| NAT-01-F | no two-point |
| NAT-05-F | no two-point |
| ELE-01-F | two-point attempts excluded |
| ELE-02-F | two-point attempts do not qualify |
| EAR-02-F | excluded |
| EAR-06-F | excluded |
| ICE-03-F | excluded |
| DAR-04-F | two-point plays do not |
| LIG-03-F | offensive scrimmage play |

The other 59 are silent. The batches nonetheless excluded two-point tries everywhere. That is a reading, not a rule.

**What the contracts say about kickoffs.** The relevant ones:
- **Explicit:** Dawn Signal (LIG-02-F) and Echo Landing (PSY-04-F) are kickoff abilities. Stone Cradle (EAR-04-F) is "punts only,
  not kickoffs". Frostmark (ICE-01-F): "kickoffs do not consume". Dragon Roar: "kickoffs follow ordinary rules".
- **Special teams excluded:** Impact Pyre (FIR-02-F), Hoard Flight (DRA-03-F), Ball Clamp (MET-04-F, "default scrimmage only"), and
  Sovereign Arm's absence (DRA-06-F).
- **No returns:** Blazing Resolve, Bloom Break, Bramble Trap, Charge Strip and Second Touch.
- **"Scrimmage play" wording:** 32 contracts. A live kickoff is not a scrimmage snap (B20 for defense).
- **Silent:** the rest.

**Recommendation.** Follow each contract literally:
- **Kickoffs** are excluded only where the contract excludes them, or says "scrimmage play / snap", or cannot apply to a kickoff.
- **Two-point tries** are excluded only where the contract excludes them, or says "scrimmage" with an explicit exclusion.
  Everywhere else a try is an ordinary play for the ability.

This would change the 59 silent modules' handling of two-point tries. I have not changed them; it waits for your ruling. A
per-contract table can be generated for your sign-off.

Other cross-batch readings (also for confirmation; listed in M3_STATUS.md):
- Cooldowns count the owner's participating plays.
- Activation gates:
  - Cold Snap is not gated.
  - Auras that spend a cooldown or bar are gated.
  - Banking a token counts as a charge gain, which an Eclipse does not stop.

## 6. Economy and roster strength: D1–D11

Full text and evidence: `docs/task8/OPEN_DECISIONS.md`. None is approved.

| # | Decision | Measurement | Recommendation |
| --- | --- | --- | --- |
| D1 | Founding-roster strength | Starters average 49.3 OVR (p10 34, min 21) against 57.9 (p10 52) before Task 8; RBs 41 | Pick founding starters by their post-history rating percentile (option 2) |
| D2 | Draft-class growth (+0.5 per season) | An automatic yearly rise once N7f retired the league boosts | Retire it |
| D3 | Salary cap and pool thresholds on the Dex scale | AI re-sign asks about 1.12M against a 1.8M cap; cap trims rarely fire; fewer castoffs reach the market | Percentile-based thresholds at the M6 recalibration; no interim change |
| D4 | Level-XP multiplier | 50 / 25 / 12.5 XP per game, Clash and reserve game, at 1.0 | Keep 1.0 until the M6 pacing benchmark |
| D5 | Comeback mode (+5 when trailing by 10+ late) | An in-game rubber band | Retire it under N7f (or approve an explicit exception) |
| D6 | Stat guide against the role register | 21 position/attribute pairs disagree | Follow the register (M6 presentation) |
| D7 | AI identities | See AI_IDENTITIES.md | Approve as proposed; gym mode floor; Rookie −4 applies to ordinary clubs only |
| D8 | Cheap free agents accepting half their ask | Consistent with the unchanged negotiation | Review with D3 at M6 |
| D9 | Gyms' strength edge | Edge 4.9 OVR in season 1, 0.9 by season 10; **new measurement below** | Investigate structure first (below); no boosts |
| D10 | Live kickoff returns | 1,500 kicks: average 20.2 against the formula's 23.8; 0 TD in 804 returns. **New since the legacy retirement:** shorter kicks, so 40 of 80 kicks are returned (28 before), and returns span 17–36 yards over 200 kicks | Keep live; tune only escort blocking at M6 if the season reports confirm |
| D11 | Rebuilding clubs' starter sales | 4 sales before Task 8 against 0 now (5 leagues × 3 seasons); AI–AI trades unchanged at 36 against 35 | Investigate (below) before deciding |

### D9: new measurement, legendary and element synergy

Two leagues: league 1 for seasons 1–6 and league 2 for seasons 1–3. The franchise-soak runs stop when the simulated owner is fired.
Averages are over the 8 gyms.

| League, season | Legendary on the roster and starting | Legendary OVR | Own-element share of starters | Own-element share of roster | Gym starter OVR |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1, S1 | 7 of 8 | 71.5 | 0.40 | 0.43 | 54.2 |
| 1, S3 | 7 of 8 | 77.1 | 0.39 | 0.37 | 58.3 |
| 1, S6 | 8 of 8 | 82.9 | 0.30 | 0.28 | 61.4 |
| 2, S1 | 8 of 8 | 77.5 | 0.38 | 0.42 | 54.2 |
| 2, S3 | 8 of 8 | 82.4 | 0.35 | 0.34 | 59.1 |

Findings:
- The legendaries are not the problem. They stay, start, grow by about 11 OVR over six seasons, and do not age (legendaries are
  ageless).
- What erodes is the element identity. The own-element share of gym starters falls from 0.40 to 0.30 in six seasons: drafts,
  signings and trades replace element players with off-element ones.
- That matters for synergy as well as ratings:
  - fields grant immunity to their own element;
  - several gym legendaries' plans (D7) assume same-element support;
  - Task 8 contracts often exempt same-type allies (for example Night Watch, Heat Haze, the Psychic pull).

**Recommendation:** make element-first acquisition part of the gym identities (D7 item 3) and measure the share alongside OVR in the
season 5 and 10 reports. This is structural, not a boost.

### D11: what to investigate

The sale rules filter as written. The bottleneck is upstream:
- few rebuilding clubs;
- only 4 of 16 ageing starters have a replacement within 4 OVR (F4);
- then the buyer's gain bar (8 in the offseason, 16 in season) rejects 89 of 102 fair offers.

Next measurements before any decision:
1. Rebuild-mode frequency before and after Task 8.
2. The rating gap between a starter and his backup under Dex ratings, compared with the pre-Task 8 gap the F4 margin was set
   against.
3. How the buyer's gain for an ageing starter compares between the two builds.

If (2) shows backups now sit further behind starters, F4's "within 4" is the binding constraint, and that is your call.
