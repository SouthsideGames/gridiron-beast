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

The contract says the linebacker "cannot move, cover, block or tackle until both land". So the landing time is how long he is out
of the play. A snowball that lands on empty ground becomes a physical obstacle for both teams, as approved; that is part of the
ability, not a failure.

**Do the obstacles work?** Yes. Over 400 plays (200 runs, 200 passes), each with a full bar and mastery 0:
- 750 obstacles stood on 399 of the plays.
- Offensive players ran into them on 49 plays: 57 offensive players and 21 defenders were stopped or deflected by one.
- The ball carrier was in contact with an obstacle on 823 ticks (0.05 s each).

The footprints lie between the line and 5 yards into the backfield. So they obstruct handoff paths, the running lanes behind the
line, pulling linemen and the QB's drop, not routes downfield. Routes start at the line and leave that band at once.

**Their effect, separated from the linebacker's hold.** The same 400 plays and seeds, four ways:

| Variant | Run yards | Runs stuffed (≤1 yd) | Pass yards | LB1 tackles |
| --- | ---: | ---: | ---: | ---: |
| No ability | 6.01 | 28% | 6.71 | 75 |
| Full ability (hold + obstacles) | 5.48 | 23% | 7.04 | 77 |
| Hold only (no obstacles) | 5.53 | 22% | 6.76 | 75 |
| Obstacles only (no hold) | 5.76 | 28% | 6.96 | 78 |

At this sample the differences are within noise: about ±0.5 yards a play, since the sample is 200 plays of each kind and plays
vary widely. **My earlier statement that the ability "costs the defense yards" is withdrawn.** The 240-play difference it rested
on (+0.24 yards) was also within noise.

What the measurement does establish:
- The obstacles function as approved.
- They act in the backfield band, not on routes.
- The linebacker's 0.6 s hold does not measurably lower his tackles at this sample.

Separating the two effects properly needs about 2,000 plays per variant, which I can run if you want the number.

Decision: confirm 0.6 s as the landing time (equal to his time out of the play), or set another value.

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

## 3. Rare activations: execution correctness and gameplay usability

Two separate questions for every ability:
- **Execution correctness:** when its conditions occur, does the effect resolve exactly as approved?
- **Gameplay usability:** are those conditions realistically attainable in supported, released gameplay?

Evidence: `docs/task8/M3_RARE_ACTIVATIONS.md`. That file gives, for each ability, the trigger, opportunities, activations, reasons
and class:
- (a) a rare situation;
- (b) broken detection;
- (c) geometry.

**Execution correctness:** no defect found in the 15 abilities measured. Every opportunity that met the approved conditions
activated, or was refused by a stated rule. The reviewer's own stop rule was faulty and is fixed (68add50).

**Gameplay usability:** three abilities are not usable in released gameplay as built, and need a change. Proposals below; none is
applied.

| Ability | Correct when conditions occur | Usable in released gameplay | Smallest proposed change |
| --- | --- | --- | --- |
| Guiding Halo LIG-03-F, mastery 0–1 | Yes (mastery 3: 8 shields from 10 qualifying catches) | **No**: 0 of 102 completions within 6 or 8 yd of the QB; the nearest was 9 yd | Measure from the **snap spot** (the ball on the line), not the QB's current spot |
| Crossed Wires ELE-01-F | Yes (staged bunch playbook: 50 activations in 10 games) | **No**: no released pass play aligns two route runners within 5 yd (closest 7, Mesh) | **Release** the designed bunch/stack reserve plays (10 have a pair within 5 yd); no rule change |
| Shadow Exchange DAR-06-F | Yes (forced: 2 at mastery 0, 8 at mastery 3) | **Barely**: at the release a partner is within 3 yd of the catch point in 5% of cases, and also within Nyxshade's 8-yd range in 0.7% | Test the partner's **projected position at the ball's arrival**, with the swap still at the release |

| Fortress Gate MET-06-F, mastery 2–3 | Yes (refusals are the contract's "safe placement only") | **Nearly no**: across the 26 released fronts and their DL slots (60 placements), panels are legal in 39 of 60 at mastery 0–1 but only 3 of 60 at mastery 2–3. The wider 2.5 / 3-yd panels reach the neighbouring lineman (all 156 refusals were "body"). Higher mastery makes it less usable. | Place each panel at the **longest safe length, never shorter than the mastery-0 width (1.5 yd)**, instead of refusing the whole gate |

Measurements behind each proposal:

**Guiding Halo**, the share of completions inside the radius (10 games, 101 completions):

| Measured from | 6 yd | 8 yd | 10 yd | 12 yd |
| --- | ---: | ---: | ---: | ---: |
| QB's position at the catch (built) | 0% | 0% | 2% | 10% |
| QB's spot at the snap | 1% | 5% | 11% | 13% |
| **The snap spot of the ball (the line)** | **11%** | **13%** | **24%** | **27%** |

The proposal keeps the radii and changes only the reference point. It matches the contract's visual ("a thin gold halo connects
the QB to the short-catch receiver"): short catches become the qualifying ones.

**Crossed Wires.** The contract checks for a partner within five yards at the snap. Of the 24 released pass plays, none has such a
pair; the closest are Mesh and Eye of the Storm at 7 yards. Ten reserve plays do (Bunch Snag, Whip Corner, Y Pivot and others at
2–2.2 yards). Releasing them needs no rule change. The alternatives are a radius of 8 yards, which 8 released plays meet, or
measuring the distance later in the route; each changes approved text.

**Shadow Exchange.** Its purpose: when a pass is thrown, Nyxshade takes the place of a teammate who is about to contest the catch.
The trigger moment is the release, at which defenders have not yet converged. Over 400 passes, testing each defender as Nyxshade
(1,400 cases):

| Partner test | Ally within 3 yd of the catch point | And within 8 yd of Nyxshade |
| --- | ---: | ---: |
| Positions at the release (built) | 73 (5%) | 10 (0.7%) |
| Positions at the ball's arrival | 521 (37%) | 49 (3.5%) |

The nearest ally to the catch point is a median 8.0 yards away at the release and 4.1 at the arrival. The catch point is already
a projection made at the release, so projecting the partner the same way is the minimal reading that serves the purpose. The swap
stays at the release.

Lesser findings (correct, and usable but rare):
- **Foresight:** about 0.6 activations a game, because LBs line up 3.5–5 yards deep except in three fronts.
- **Night Watch:** a natural Dark field is rare, because an opposing Shadowkit's field forms on Night Watch's offense.
- **Prism Break overlaps:** see §1.
- **Genuinely rare situations, no change needed:** Hoard Flight, Tsunami Line, Frostmark, Second Chance, Slipstream Step, Crosswind
  Rescue, Air Brake and Stone Cradle.

**Reviewer: deterministic scenarios, built and merged (b9317fc).**
- "▶ Scenario" (the default) runs a fixed-seed staged setup on the real engine for every one of the 72 abilities. It covers every
  form and all four mastery tiers, and two runs give the same result.
- "▶ Natural game" stays as the optional search.
- A scenario that stages conditions released gameplay does not reach says so on screen. That applies to Crossed Wires (reserve
  bunch plays), Shadow Exchange (reserve passes thrown at chosen receivers) and Guiding Halo at mastery 0–1 (chosen short throws).
- Hoard Flight's scenario uses one review-only engine option that forces a fumble on a tackle; recovery stays the engine's ordinary
  pick. The option is a JavaScript Symbol key, so it cannot come from a save, a setting or the UI, and a test checks who uses it.
- The scenarios also exposed two usability details:
  - Guiding Halo's short catches are reachable on a base play (pa_boot) when the target is chosen; the AI's reads never choose them.
  - Fortress Gate at mastery 2–3: see the table above.

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
| D11 | Rebuilding clubs' starter sales | 4 sales before Task 8 against 0 now (5 leagues × 3 seasons); AI–AI trades unchanged at 36 against 35; backups now further behind starters (below) | Keep the rules for now; recalibrate with D3 at M6 (simulated alternatives below) |

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

Legendary synergy and elemental identity, evaluated together:
- **The legendary half holds.** Each gym keeps its legendary, starts him (7–8 of 8 every season), and he gains about 11 OVR in six
  seasons. Legendaries are ageless.
- **The identity half erodes.** The own-element share of gym starters falls from 0.40 to 0.30 over six seasons, and of rosters from
  0.43 to 0.28. Drafts, signings and trades fill places without regard to element.
- **The two interact less in football than the identity suggests.** I read the eight gym legendaries' football contracts:
  - Only Tsunami Line (Harbor Sentinels) gains from same-element teammates: its full-width Water field slows non-Water monsters, so
    Water teammates are immune.
  - Daybreak explicitly affects every monster, Light types and allies included.
  - Stormguard, Landslide, Shadow Exchange, Second Chance, Fortress Gate and Sovereign Arm do not depend on teammates' element.
- **Elsewhere, element matters through fields and other contracts:** fields spare their own element; Heat Haze spares Fire; the
  Psychic pull spares Psychic; Night Watch and Tailwind Huddle select by element. So a declining element share weakens what a gym's
  element-mates do for each other, more than what its legendary does.
- **The Clash side** (gym legendaries' Clash abilities, M4) is not measured yet.

**Conclusion.** The gyms' shrinking OVR edge (4.9 down to 0.9) is mainly acquisition: their starters grow no faster than ordinary
clubs', while the legendary stays strong. The elemental identity erodes alongside it.

**Options, none applied; no roster quota.**
1. Leave it, and re-measure OVR, element share and legendary use in the season 5 and 10 reports.
2. An element preference in the gyms' acquisition weighting, as part of the D7 identities. This is a tie-breaker, not a quota.
3. A structural strength lever (initial tier gap, scouting priority) under D9.

**Recommendation:** option 1 now, plus a measurement of the Clash side at M4. Option 2 needs your approval because it changes AI
acquisition.

### D11: investigated

Measured on leagues 51–53 over 2 seasons, per club-season (90 samples). The gap is between the last starter and the first backup at
each position, 831 to 840 samples.

| | Before Task 8 (dd2245d) | Now |
| --- | ---: | ---: |
| Clubs in Rebuild mode | 3 of 90 | 7 of 90 |
| Starters older than 26 | 33% | 46% |
| Gap, p25 / median / p75 | 3 / 6 / 11 OVR | 5 / 9 / 16 OVR |
| Backup within 4 OVR (F4) | 38% | 24% |

Earlier funnel, seed 11, 4 seasons:
- 16 sellable starters;
- 4 with a replacement within 4;
- 102 fair offers, all failing the deal rules: 89 on the buyer's minimum gain, 11 on a full roster, 2 on the seller floor.

**Finding.** Sellers are not missing; there are more rebuilding clubs and more ageing starters than before. The binding constraint is
F4: under Dex ratings a starter's backup sits further behind him (median 9 OVR against 6), so "a replacement within 4" holds for
24% of positions instead of 38%. The gain bar then rejects most of the remaining offers. This is a property of the new rating
spread, not a defect in the sale code.

**Alternatives, simulated before any change.** Leagues 51–54, 3 seasons each, 12 league-seasons per variant. Each variant ran in a
scratch copy and nothing was changed in the build. Before Task 8 the rate was 4 sales in 15 league-seasons, about 3.2 per 12.

| Variant | Starter sales | Sale ages | Buyer gain | All AI trades | Invariant problems |
| --- | ---: | --- | --- | ---: | ---: |
| Current (F4 within 4) | 1 | 30 | 19 | 32 | 0 |
| F4 within 6 | 2 | 30, 29 | 19, 9 | 31 | 0 |
| F4 within 7 | 2 | 30, 29 | 19, 9 | 31 | 0 |
| Half the buyer's gain bar, for sales only | 1 | 30 | 19 | 32 | 0 |

**Reading.** Neither lever restores the old rate. Widening F4 to 6 or 7 adds one sale, and halving the gain bar adds none. The two
constraints bind together: few qualifying starters, then few offers that clear the gain bar. Overall AI trading is unaffected
(31–32 deals). The samples are small, so differences of one sale are within noise.

**Options.**
1. Keep the rules and re-measure at the season 5 and 10 reports.
2. Combine F4 within 6 with a lower sale gain bar, then simulate before deciding.
3. Re-derive the sale rules from the Dex rating spread, recalibrated at M6 (#30) with D3.

All change approved rules except option 1, so they are yours to make. **Recommendation:** option 1 now and option 3 at M6. A
single-lever change does not restore sales and would only move the number slightly.
