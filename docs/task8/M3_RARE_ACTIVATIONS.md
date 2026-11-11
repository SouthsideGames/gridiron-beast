# M3: rarely activating football abilities (measured)

Measured on a frozen copy of `task8-implementation` at 7f08c36 (no ability, engine or rules change between 7f08c36 and 529c2d2
except the AI Dragon Roar policy, re-checked below). Read-only: no module, trigger or approved value was changed.

**Method.** Reviewer-style games (`review.js` clubs: two `generatedTeam` clubs at quality 62, the subject at his Dex position's
first slot on the home club, form `:0`, mastery 0 unless stated, quarter 180 s as in franchise games, the AI on both sides, seeds
`1 + g * 7919`). Each funnel is counted by wrapping the subject's own contract hooks at runtime in the scratch copy (filtered to the
subject's id), and an activation is an increment of `t8.mastery[subject].executions`. "Forced" runs hold the charge bar full (or the
use armed) before every play, so the in-play geometry can be measured apart from the charge rate. "Staged" runs change only the
clubs (a playbook or one opposing monster). Per club and game there are about 27 offensive and 27 defensive scrimmage plays.

Classes: **(a)** genuinely rare situation; **(b)** broken detection / implementation defect; **(c)** impossible or near-impossible
placement or geometry given the engine.

## Summary

| Ability | Approved trigger (one line) | Opportunities | Activations | Sample | Class | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Foresight PSY-03-F (Cerebrix QB) | Ready: mark a random opposing LB aligned within 3 yd of the LOS; fires if he blitzes | 759 ready snaps; 38 had an LB within 3 yd | 19 (all 19 marked LBs that blitzed) | 30 games | (c) | Base LB alignments are 3.5–5 yd deep; only goal_line, goal_line_man and double_a_mug put an LB within 3 yd (5 of 36 base LB alignments, 2 of them blitzing) |
| Crossed Wires ELE-01-F (Flicker WR) | Ready route snap with an allied WR/TE route runner within 5 yd | 571 ready route snaps; 0 with a partner within 5 yd | 0 | 30 games | (c) | Nearest route-running WR/TE at the snap: min 7.0, median 28 yd. No callable play has a pair within 5 yd; 10 of 150 reserve plays do, and no coach or AI can call reserve plays. Staged bunch playbook: 50 of 72 ready snaps, 50 activations in 10 games |
| Fortress Gate MET-06-F (Aegistron DL) | After 3 plays allowing ≤3 yd, next defensive snap raises two panels (once per possession) if the placement is legal | 798 def plays, 388 at ≤3 yd; 131 armed snaps (25 already used this possession) | 93 (13 refused: 11 body, 2 end zone) | 30 games | not rare; (c) in 3-DL fronts | 3.1 per game. Two-lineman fronts: 90 of 91 legal. Three-lineman fronts: 12 of 15 refused (11 body: a neighbouring lineman in the panel; 1 end zone). Forced: 152 legal of 174, all 19 body refusals in 3-DL fronts |
| Hoard Flight DRA-03-F (Sablewing CB) | Any fumble he recovers on a defensive scrimmage play | 12 fumbles in 3,163 def plays, all recovered by the defense (LB 7, DL 3, S 1, CB 1); 1 by him | 1 (1 of 1) | 120 games | (a) | The engine fumbles on 0.38% of plays (0.1 per club per game), and a CB is rarely the recoverer. The one recovery fired (placed at the opponent 35 from a recovery at the opponent 38) |
| Tsunami Line WAT-06-F (Tsunarok S) | A personally secured interception while ready | 21 INTs in 2,969 def plays (CB 10, LB 8, S 2, DL 1); 2 by him | 2 (2 of 2; 2 fields spawned) | 120 games | (a) | Interceptions are 0.7% of defensive plays, and a safety makes 1 in 10 |
| Frostmark ICE-01-F (Snowmoth K) | Each made field goal (one pending token at most) | 63 FG attempts, 48 made | 47 (1 make skipped: a token was already pending) | 100 games | (a) | A club tries 0.63 field goals a game; activations occurred in 37 of 100 games |
| Second Chance ICE-06-F (Glacivern K) | First missed field goal of the game: one fresh retry | 62 FG attempts; 14 games with a miss | 14 (10 retries good) | 100 games | (a) | Every first miss fired. The rarity comes from few attempts and a 77% make rate |
| Slipstream Step WIN-02-F (Breezefang RB) | 3 personal broken tackles fill the bar; next rushing carry fires at his first LOS crossing | 332 carries, 79 broken tackles; 40 armed snaps, 11 armed carries, 10 crossings | 10 (10 of 10 crossings) | 30 games | (a) | The bar fills about once in three games; one armed carry never crossed the LOS |
| Crosswind Rescue WIN-04-F (Galyx S) | 2 personal pass breakups fill the bar; lanes at the next defensive pre-play | 990 def plays; 12 PBUs by him; 4 games with ≥2 | 4 (4 of 4 fills) | 40 games | (a) | 0.3 PBUs per safety per game. Forced: 128 activations, 256 lanes (outer edge on the sidelines, LOS+5 to +12) |
| Clean Sweep EAR-01-F (Pebble OL) | An ordinary pancake banks one guarantee for a later play's first pancake opportunity | 699 engaged plays, 50 pancakes; 30 banked snaps, 25 banked opportunities | 25 (25 of 25) | 30 games | not rare (a) | 0.8 per game. The other banked snaps had no engagement |
| Stone Cradle EAR-04-F (Granigor K) | First punt of the game caught in the field of play (once per game) | 168 punts: 68 caught and returned, 77 fair catches, 15 touchbacks, 4 blocked, 4 downed | 49 (19 more returns came after the use) | 100 games | (a) | Activations in 49 of 100 games; 46% of punts are fair caught |
| Shadow Exchange DAR-06-F (Nyxshade CB) | 2 personal PBUs fill the bar; at a release, swap with an ally within 3 yd of the catch point, closer than him, within 8/10/12/14 yd of him | Natural: 16 PBUs in 30 games, 18 armed releases. Forced m0: 704 armed releases; 44 with an ally within 3 yd of the landing; 3 within swap range | Natural 0; forced m0 2; forced m3 8 of 539 | 30 + 40 + 30 games | (c), plus (a) for the charge | At the release the nearest ally to the landing point is a median 8.5 yd away and Nyxshade 18.5 yd. The bar fills in about 5% of games and then succeeds on 0.3% (m0) to 1.5% (m3) of releases |
| Air Brake WIN-03-F (Aeralis CB) | 3 personal PBUs fill the bar; a catch by the receiver he guards, within 8 yd | Natural: 18 PBUs in 30 games; 1 game reached 3; 1 armed catch | 1 (1 of 1) | 30 games | (a) | Forced: 417 armed catches; 27 already ended the play, 316 by a receiver he did not guard, 74 guarded, 65 within 8 yd, giving 65 activations (1.6 per game). The limit is 3 PBUs by one CB in one game (no game of the 40 forced-run games reached 3) |
| Night Watch DAR-02-F (Noctlet S) | Passive: non-Dark allies within 4/5/6/7 yd ignore a Dark base field's Awareness penalty (credit when one stands in it) | Natural: 979 def plays, 5 with any Dark field on the field, 1 with an ally inside one | 0 | 40 games | (a) + (c) | See the note: an opposing Nocturne QB or an allied Shadowkit is needed, and the field sits at the LOS while the safety is deep. Staged opposing Nocturne: 65 plays with an ally inside, 7 within 4 yd (7 games credited); at m3 26 within 7 yd (22 of 40 games) |
| Prism Break LIG-04-F (Prismara S) | 3 tackle/PBU charges; next defensive pre-choice removes the nearest enemy zone (base or overlap) | 195 armed pre-choice snaps; 19 had an enemy zone | 19 (all base zones) | 40 games | not rare for base zones; overlaps (a) under the implemented reading, (c) under the literal one | Forced bar: 961 snaps, 121 removals (all base), 0 snaps with an enemy overlap candidate. Staged direct test: see the note |

**Defects found:** none in the fifteen ability modules. Every observed opportunity that met the approved conditions activated, or
was refused by a stated contract rule (cooldown, once per possession, a pending token, illegal placement, the play already over).
One reviewer defect is listed at the end.

## Notes per ability

**Foresight (c).** The funnel per ready snap: LB within 3 yd 5.0%, then the marked LB blitzing 50%, so 2.5% of ready snaps fire.
Across 1,088 in-game LB alignments the depth was min 1.2, p10 3.5, median 4.5, max 5 yd. The mark is drawn only on goal_line,
goal_line_man and double_a_mug; reserve fronts add six mug or zero looks (7 of 219 LB alignments, 6 blitzing). Per game it still
fires about 0.6 times, because the AI calls those fronts. The rarity per snap comes from where the playbook puts the LBs, not from the
detection.

**Crossed Wires (c).** This cannot happen in a live game today. Among the 34 callable offensive plays the closest pair of route
runners is 7.0 yd apart (mesh WR1–WR3); smash, levels, dagger and three_verticals are at 8 yd. Only reserve plays (bunch_*, whip_corner,
y_pivot, corner_arrow, post_wheel: 2–2.2 yd) qualify, and the practice screen says no coach or AI club can call a reserve play yet.
With the reviewer's staged bunch playbook it fires on 69% of ready route snaps (bunch_scissors and bunch_slant_arrow leave the WR1 slot
beyond 5 yd). For this to happen in live games, a base play would need a close pair or the reserve plays would need releasing.

**Fortress Gate: not rare.** It fires 3.1 times a game. The 3-lineman refusals ("body") happen in double_a_mug, goal_line(_man),
bear_front, cover_0 and run_wall: a 1.5 yd panel with its 1 yd gap reaches 2.5 yd sideways, where the next lineman stands. The bar and
the use are kept, as the contract says, so it fires on a later 2-lineman snap. The once-per-possession rule was the most common reason
an armed snap did not fire (25).

**Hoard Flight (a).** In 120 games there were 12 fumbles, all recovered by the defense. The one Sablewing recovery fired. The trigger
works; recoveries by the CB are rare because fumbles are rare in this engine and an LB or DL is usually nearest.

**Tsunami Line (a).** Both interceptions by Tsunarok fired and each spawned its Water field before the next offensive snap.

**Frostmark and Second Chance (a).** Field goals are uncommon: 0.63 attempts per club per game. Every made kick banked a field
(except one while a token was pending, a contract rule). Every first miss was retried. These are plain counting rarities.

**Slipstream Step (a).** Broken tackles average 2.6 per game, bursty (0 to 10). Each of the 10 armed crossings fired. Armed passing
snaps wait (29 of 40 armed snaps were not runs he carried), as the contract says.

**Crosswind Rescue (a).** PBUs by one safety average 0.3 per game, so 2 in a game is uncommon. Each of the 4 fills fired, and forced
runs show the lanes created where the contract places them.

**Clean Sweep: not rare (a).** A pancake comes on 7% of his engaged plays; every banked opportunity was guaranteed.

**Stone Cradle (a).** It is once per game and fired in 49 of 100 games. In the rest, the club's punts were fair caught (46% of all
punts), went for touchbacks, or were downed or blocked, all of which keep the use.

**Shadow Exchange (c) + (a).** The contract evaluates the swap at the pass release, at the projected catch point. When the ball is
released the defenders have not converged on the catch point yet: in 704 forced releases only 6% had any ally within 3 yd of the
landing, and 40 of those 44 allies were beyond 8 yd from Nyxshade (the radius is 14 yd at mastery 3: 9 of 539). On top of that the bar
(2 PBUs by one CB in one game) fills in about 5% of games. Natural activation is about 1 in several hundred games.

**Air Brake (a).** The swap geometry is not the limit: with a full bar it fires 1.6 times a game (the 8 yd range held on 65 of 74
guarded catches). The limit is the charge, 3 PBUs by the same CB in one game, which happened in 1 of 30 natural games.

**Night Watch (a) + (c).** A Dark base field rarely exists while Noctlet's team defends. Of the two Dark field makers, an opposing
Shadowkit creates its field on its own defense, which is Noctlet's offense, so it can never help. Only an opposing Nocturne QB (on 9%
of generated clubs; 37 of 400) after a completion of 15+ yards, or an allied Shadowkit CB (37% of clubs; 147 of 400) after his own pass
breakup, puts one on the field. In 40 natural games (24 had one of them in a lineup) that happened on 5 of 979 defensive plays.
Even with one, Nocturne's field runs from the LOS to LOS+5 around the QB, while the safety lines up deep. With a staged opposing Nocturne
in every game, an ally stood in the field on 65 plays, but only 7 were within 4 yd of Noctlet (26 within 7 yd at mastery 3).

**Prism Break: base zones are not rare; overlaps are.** It fired 19 times in 40 natural games, always on a base zone (Wind 7,
Nature 7, Electric 2, Light 2, Metal 1). In 961 forced pre-choice snaps no enemy hybrid overlap ever existed: that needs two enemy
fields of a recipe pair (Fire/Water, Light/Dark, ...) overlapping at once. Direct staged test (`prismBreak` with an enemy Fire field
yard 40–50 × lat −6..6 and an enemy Water field yard 45–55 × lat 0..10): a source standing in the overlap selects the overlap under the
implemented footprint reading. Measured on whole rectangles (the literal wording), the older parent is picked at every point tested,
because the overlap's distance is never smaller than its parents' and its creation order is the later parent's. So the literal wording
makes overlap selection impossible (c). The implemented reading makes it possible but naturally near-absent (a). The owner ruling on
this reading is still open (M3_STATUS finding 6).

## The other 57 abilities

Strict check (the subject's own `executions` count, not the reviewer's event match), 3 games each, unstaged, mastery 0, same seeds:
**54 of the 57 execute within 3 games.** The other three:

- **Pyroclast FIR-06-F**: first own execution in game 4 (7 in 10 games).
- **Guiding Halo LIG-03-F**: none at mastery 0 (known, geometry; see the brief's earlier measurement); at mastery 3 it executes in
  game 2.
- **Dragon Roar DRA-05-F**: at 7f08c36 it is player-activated only; it executes in game 2 with the reviewer's staged call. At 529c2d2
  (the AI now calls it, 5911be9) it executes unstaged in 6 of 10 games.

Aegistron and Prismara also executed within 3 games, so 56 of 72 execute strictly within 3 unstaged games.

**Reviewer defect (src/sim/abilities/review.js:66 and :94).** `contractEvents` matches any event carrying the ability id, and the
stop condition is `executionsOf(...) > n0 || evs.length`. So a review can stop on an event that is not an execution (`ability_charge`,
`ability_ready`, `ability_target`, `foresight_mark`), or on an event from an opposing monster of the same family (no subject filter).
Unprimed, 8 of 72 reviews stop on such an event and return `executed: false`: ashkit, pyroclast, mudcub, thornkit, zephyr, mireclaw,
ironjaw and aurodrax. For mudcub and mireclaw the event was the opponent's monster. All eight do execute for the subject (strict
check). The reviewer's "found within 3 games" sweep therefore overstates by one (pyroclast).
