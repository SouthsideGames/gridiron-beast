> **Superseded status:** the owner authorized adoption and main integration after this report. See [owner adoption](../OWNER_ADOPTION_2026-11-11.md) and [final verification](../FINAL_VERIFICATION.md). Historical evidence and proposals below are preserved. Phone/visual approval and remaining performance limits are still open.

# M6 owner decision sheet (2026-11-11)

Every decision still open in M6, in one place. **Nothing on this sheet is implemented or assumed.** A blank answer means the
current rule stays. Simulation evidence is from f716b02 unless a row says otherwise; the runtime is unchanged since
(d544fec plays identically).

"Authorized" means the approved documents already allow the change and only your choice is missing. "New" means it changes or
adds a rule and needs a ruling before any code.

## Summary

| # | Decision | My recommendation | Kind |
| --- | --- | --- | --- |
| 1 | Apex training rate | Adopt ×2 with 42 offseason points (validated; awaiting your approval) | New (validation authorized, adoption not) |
| 2 | Ordinary pancakes | qmax 0.10, b 0.30 | Authorized |
| 3 | Football mastery pacing | At most 2 active credits a game | New |
| 4 | Foresight never fires | Judge the look from the defence's most-called formation | New |
| 5 | Rare triggers (5 football, 5 Clash) | Report as outliers; no change | Authorized |
| 6 | AI Clash lineups | Keep best three for this release | New if changed |
| 7 | Cap room | A: leave as it is | Authorized |
| 8 | Apex contract ask against concealment | (b): the ask applies once the offering club knows | New |
| 9 | Played-starter gate | Count genuine mixed-mode starters; record the AI figure | Interpretation |
| 10 | Apex accumulation | Not excessive; do not run the rate comparison yet | Authorized |
| 11 | Interrupted Apex panel | Keep: closing the app counts as shown | New |
| 12 | Training any attribute | Keep: all twelve trainable, unused ones faded | New |
| 13 | Free-agent cards discover an Apex | Keep | New |
| 14 | Achievement wording | Approve or replace the three entries | New |
| 15 | Ability wording and "Full rules" | Rewrite only the Clash summaries you mark; keep "Full rules" folded | New |
| 16 | Graphics presets | Keep deferred until the phone results exist | Already ruled (N8e) |
| 17 | CPU measurement conditions | Accept quiet-host runs as official but provisional; no budget ruling yet | Interpretation |

---

## 1. Apex training rate

- **Current rule:** an Apex earns training exactly like anyone else: 25% of a bar per activity and 2 points each offseason (§5:
  "Apex does not receive an extra training multiplier").
- **Problem:** he needs 522 trained points to reach all 99s. The rules supply 4 to 13 a season. In the controlled cohort 0 of
  1,000 are all-99 by season 15 on any schedule; the goal is 90%.
- **Alternatives:**
  - (a) Activity training ×2 and 34 offseason points, Apex only. Validated first; fails in real careers.
  - (a2) Activity training ×2 and 42 offseason points, Apex only. **Validated on eight seeds.**
  - (b) 37 offseason points and no multiplier (leaves the §5 sentence true).
  - (c) Keep the rules and change the goal.
- **Evidence, controlled cohort** (every activity played, no injuries): (a) 90% by season 14 / 13 / 10 for football-only /
  mixed / maximum; (b) 14 / 14 / 11.
- **Evidence, real club careers under (a)** (8 franchises, 20 seasons, 170 Apex followed from level 1; injuries, benching,
  releases and AI training as the game plays them; `APEX_VALIDATION.md`):

  | Schedule | All entrants | Sustained starters |
  | --- | --- | --- |
  | Football only | 1.4% | 4.2% |
  | Mixed | 40.0% | 70.8% |
  | Maximum | 79.6% | 95.7% |

  AI clubs bench a new Apex (he is the worst player on the roster), so he misses seasons and levels late; 14 of 170 were
  released. Sustained starters fall short by about 1 to 3 points a season.
- **Owner ruling (2026-11-11):** the goal is at least 90% of **sustained starters** at all 99s by the end of their fifteenth
  season (`APEX_GOAL_DEFINITION.md`).
- **Validation of ×2 with 42 total offseason points** (8 franchises, `APEX_VALIDATION_42.md`): sustained starters 30 of 30,
  30 of 30 and 36 of 36 (football-only / mixed / maximum); all entrants 71.2% / 91.2% / 86.5%. Nobody finished before season
  12 on AI clubs. A human owner at maximum participation is not measured; my estimate is about season 9.
- **Recommendation:** adopt ×2 with 42, after deciding whether a season-9 finish for a human at maximum participation is
  acceptable, and together with decision 8. **Not adopted until you say so.**
- **For the player:** an Apex he keeps in the lineup gains ratings about seven times faster than now and can be complete in
  about 14 or 15 seasons instead of never. One he benches still will not get there. Ordinary monsters, Temper and level XP do not change.
- **Kind:** new. Candidate testing is authorized; adoption is not.

## 2. Ordinary pancakes

- **Current rule:** `pancake-structure` at qmax 0.15, b 0.35 (approved bounds: qmax 0.10–0.20, b 0.25–0.45).
- **Problem:** targets are 0.2–0.6 pancakes per starting lineman per game, 30–50% success per attempt, at most 15% lost blocks.
  Defaults give 0.861 and 51.4%: too many and too easy.
- **Alternatives and evidence** (10 franchise seeds × 6 seasons each, every league game, about 4,700 games per row; ability
  knockdowns and guaranteed pancakes counted separately and excluded):

  | Setting | Per lineman per game | Success | Lost block | All three targets? |
  | --- | --- | --- | --- | --- |
  | Default (0.15 / 0.35) | 0.861 (0.843–0.879) | 51.4% | 8.1% | No |
  | qmax 0.12, the earlier handoff candidate | 0.679 (0.663–0.693) | 50.7% (50.1–51.4) | 8.4% | No: both over, intervals included |
  | qmax 0.10 | 0.561 (0.548–0.574) | 50.9% (50.2–51.5) | 8.6% | No: success over |
  | **qmax 0.10, b 0.30** | **0.513 (0.501–0.525)** | **46.3% (45.6–47.0)** | **9.6% (9.2–10.0)** | **Yes** |

- **Why the earlier candidate fell:** it looked adequate in the controlled benchmark; on real league rosters it still gives 0.68
  a game and 50.7% success.
- **Recommendation:** qmax 0.10, b 0.30. It is the only measured in-bounds setting that meets all three. qmax 0.10 is the floor
  of the approved range, so there is no room below it.
- **For the player:** about 40% fewer ordinary pancakes than today (roughly one per lineman every two games), and a pancake
  attempt succeeds a little under half the time. Ability knockdowns are untouched.
- **Kind:** authorized tuning. Lands as its own simulation commit with regression, identity baseline and replay check.

## 3. Football mastery pacing

- **Current rule:** one credit per valid execution, no per-game limit for active abilities, passive abilities one a game;
  shared thresholds 0 / 10 / 30 / 60.
- **Problem:** the target is Mastered in 3–6 seasons of sustained use. Abilities fire between 0 and 18 times a game, so one
  threshold cannot fit. Of 2,859 sustained starters: 409 Mastered before season 3 (112 in their first season), 475 in seasons
  3–6, 221 later, 1,754 never.
- **Alternatives:**
  - (a) Keep; report fast and slow abilities as outliers and restate the target as "typical".
  - (b) At most 2 active credits a game, thresholds unchanged.
  - (c) Higher shared thresholds (0/15/45/90 or 0/20/60/120; already authorized).
  - (d) Per-ability thresholds (the specification forbids them).
- **Evidence:** (c) removes fast cases (8 families to 1) but pushes more out of reach (36 to 48 never). Projected from measured
  per-game counts, (b) puts 20 of 60 families in the 3–6 band against 12 now, and no first-season Mastered.
- **Recommendation:** (b). It is one shared number and fixes the fast end without slowing the slow end. If you would rather
  not add a rule, (a).
- **For the player:** under (b) no ability can be Mastered in a handful of games; the fastest take about three seasons. Slow
  abilities are unchanged.
- **Kind:** (a) and (c) authorized; (b) and (d) new. (b)'s numbers are a projection and would be confirmed after implementation.

## 4. Foresight never fires

- **Current rule (N9d):** its candidate is a linebacker within 3 yards of the line in the defence's pre-choice look, taken from
  the first play of the defence's plan.
- **Problem:** 0 executions in 563 starts. Linebackers stand 3.5 to 5 yards deep in every standard formation; only mug and
  goal-line looks qualify.
- **Alternatives:** (a) keep; (b) judge the look from the defence's most-called formation; (c) widen to 5 yards.
- **Recommendation:** (b). It keeps the 3-yard idea and makes it depend on what the defence really shows. (c) would make it
  fire nearly every snap.
- **For the player:** a Foresight monster's ability would start working against defences that crowd the line. Today it is
  decorative.
- **Kind:** new: (b) and (c) change an approved N9d condition. Needs a short measured check after implementation.

## 5. Rare triggers

- **Current rule:** each ability's approved trigger.
- **Problem:** five football abilities fire about once in fifty games (Ball Clamp, Hoard Flight, Crosswind Rescue, Air Brake,
  Night Watch). Five Clash abilities were in lineups and never fired (Fresh Start, Deep Winter, Unbroken Charge, Clear Light,
  Mind Game): AI-against-AI battles rarely create their conditions.
- **Alternatives:** (a) report as outliers, which the gate allows; (b) review each trigger.
- **Recommendation:** (a). These are situational by design, and the Clash five depend on what opponents do. Revisit after the
  owner's own play shows whether they feel dead.
- **For the player:** no change. Their mastery will be slow.
- **Kind:** (a) authorized; (b) new, ten separate reviews.

## 6. AI Clash lineups

- **Current rule:** an AI club's lineup is its automatic best three (a Tank first), chosen again every week.
- **Problem:** only 17% of ability holders on AI clubs ever fight a Clash; 27 of 72 Clash abilities never appeared in 2,915
  settlements; 2 of 2,136 Basics fought. It is also why AI-club starters are mostly football-only (decision 9).
- **Alternatives:** (a) keep; (b) AI clubs rotate part of the lineup.
- **Recommendation:** (a) for this release. (b) changes AI behaviour and Clash results league-wide and needs its own design
  and benchmark. The player's own Tuesday lineups are his choice either way.
- **For the player:** none under (a). Under (b) opponents would show more varied Clash abilities and be slightly weaker.
- **Kind:** (a) no change; (b) new.

## 7. Cap room

- **Current rule:** salary $18,000 + $280 × OVR; cap $1.8M; staff allowance $405,000.
- **Problem:** AI clubs carry $369,100 of spare room (20.5% of the cap). Before Task 8 it was $246,400 (13.7%). Dex ratings are
  about 12 OVR lower, so payroll fell 10.7%. The cap did not bind before Task 8 either.
- **Evidence the league still works:** 50.8% of AI signings contested, 81.4% of extensions signed, 0 market integrity problems
  in 60 markets, weakest clubs 70.6% stronger three seasons later, 19 different champions in 57 titles.
- **Alternatives:** (A) leave; (B) raise the salary base by $3,300, restoring the old payroll and 14% room.
- **Recommendation:** A. B changes every contract figure and still does not make the cap bind. Lowering the cap is not proposed.
- **For the player:** A: none. B: every salary about $3,300 higher, about $123,000 less room.
- **Kind:** authorized (item 30, numbers reported for review).

## 8. Apex contract ask against concealment

- **Current rule:** B9 is approved: an Apex asks his ordinary salary plus half the gap to an OVR-99 salary (about $33,540
  undeveloped). §5 says an unidentified Apex must not be revealed.
- **Problem:** B9 is not implemented. An undeveloped Apex asks $21,360, less than an ordinary rookie. Implementing it as
  written would print $33,540 on an OVR-12 prospect's card and reveal him.
- **Alternatives:**
  - (a) The ask applies everywhere; the player sees the ordinary figure until discovery and pays the real one on signing.
  - (b) The ask applies only once the offering club knows he is an Apex (AI clubs included, under B16's knowledge rules).
  - (c) Withdraw B9.
- **Recommendation:** (b). It never leaks and never charges a hidden price. It matters more if decision 1 is adopted.
- **For the player:** a hidden Apex is cheap until someone identifies him; once known, he costs about 60% more than his rating
  suggests.
- **Kind:** new ruling on how two approved rules combine.

## 9. Played-starter gate

- **Current rule:** at least 75% of ordinary mixed-mode starters reach level 50 within 8 seasons.
- **Problem:** genuine mixed-mode starters do (26 of 26, median season 7), but there are few. All eight-season AI starters:
  188 of 268, 70.1%. By position, 33.8% (CB) to 78.3% (OL); the difference is Clash selection, not rewards.
- **Alternatives:** (a) the gate is met for mixed-mode starters, with the AI figure recorded; (b) the gate covers all starters
  and is not met; then change AI Clash selection (decision 6) or raise the shared XP multiplier.
- **Recommendation:** (a). The gate's wording is "mixed-mode", and raising XP for everyone would speed up starters who already
  meet it.
- **For the player:** none under (a). His own starters reach 50 in about seven seasons if he uses them in Clashes.
- **Kind:** interpretation of an approved gate.

## 10. Apex accumulation

- **Current rule:** 1% Apex chance per eligible generation event; an Apex never retires.
- **Problem to judge:** across four 20-season franchises (64 clubs) there were 13 / 25 / 42 / 53 Apex at seasons 5 / 10 / 15 /
  20; at most 4 on one club. Only 10 of 58 reached level 50 and none was near all 99s. The specification asks for a rate
  comparison (0.25% / 0.5% / 1%) only "if league accumulation is excessive".
- **Alternatives:** (a) not excessive, no comparison; (b) run the comparison now.
- **Recommendation:** (a) under current rules. **If decision 1 is adopted, run it then:** 53 Apex who can all reach 99 is a
  different league from 53 who cannot.
- **For the player:** none now.
- **Kind:** authorized (the comparison is already specified).

## 11. Interrupted Apex discovery panel

- **Current behaviour:** closing the app during the panel counts as having seen it; it does not replay.
- **Alternatives:** (a) keep; (b) replay until finished or skipped.
- **Recommendation:** (a). The monster page shows the emblem and the facts afterwards.
- **For the player:** (b) would show the panel again on the next launch.
- **Kind:** new (my implementation choice).

## 12. Training any attribute

- **Current behaviour:** all twelve attributes can be trained; the ones a position does not use are faded.
- **Why:** the old screen offered only position attributes. The engine has no such rule, and an Apex could never reach 99
  everywhere under it.
- **Alternatives:** (a) keep; (b) restrict to position attributes for ordinary monsters and allow all for an Apex.
- **Recommendation:** (a). One rule for everyone, and the fade already steers the player.
- **For the player:** (b) removes the option of spending points on off-position attributes.
- **Kind:** new.

## 13. Free-agent cards discover an Apex

- **Current behaviour:** opening a free agent's card shows his potential, so it counts as discovering an Apex.
- **Alternatives:** (a) keep; (b) hide potential on free-agent cards until scouted.
- **Recommendation:** (a). The card is public information in the game's own rules.
- **For the player:** (b) adds a scouting step before a free-agent Apex is recognisable.
- **Kind:** new.

## 14. Achievement wording

- **Current text (mine):** "The original 72", "Every Basic", "The complete Beast Dex", each with two lines
  (`OWNER_REVIEW_CHECKLIST.md` has them in full).
- **Decision:** approve, or give replacements. Speakers: the commissioner for the first two, the board for the third.
- **Kind:** new wording.

## 15. Ability wording and "Full rules"

- **Current behaviour:** football summaries are the reviewer's "expected result" lines (written for players). Clash summaries
  are the Dex mechanic line (written for designers). "Full rules" is the Dex contract under seven headings, folded by default.
- **Alternatives:** summaries: (a) ship as they are, (b) rewrite the ones you mark, (c) rewrite all 72 Clash summaries.
  "Full rules": keep folded, shorten, or hide.
- **Recommendation:** (b), and keep "Full rules" folded. Six Clash abilities are enough to judge the pattern.
- **For the player:** clearer Clash descriptions; the exact rules stay one tap away.
- **Kind:** new wording.

## 16. Graphics presets and camera intensity

- **Current state:** not implemented. N8e marks them not authorized until the visual performance results are reviewed.
- **Recommendation:** keep deferred. The phone results are the review; they do not exist yet.
- **Kind:** already ruled. Listed so it is not forgotten.

## 17. CPU measurement conditions

- **Current rule:** engine at most 10% slower than the fixed pre-Task 8 baseline in every scene; provisional 1.25 ability
  budget; a result is PROVISIONAL when the spread exceeds 10% of the median.
- **Problem:** on the shared two-CPU host every row is provisional, and the ability ratio moves by up to 0.27 between runs of
  the same code.
- **Alternatives:** (a) accept quiet-host runs as the official record, still labelled provisional; (b) require a steadier
  machine before any gate is called; (c) rule on the 1.25 budget now.
- **Recommendation:** (a), and not (c) yet: A1 and X1 are over in every run, and the garbage-collection work
  (`GC_DIAGNOSIS.md`) comes first.
- **For the player:** none directly.
- **Kind:** interpretation.
