# Task 10: the owner's eight decisions of 2026-11-13, and what the investigation found

Branch `task10-franchise-final-balance`. Nothing here changes the game: every result is a measurement, and every proposed change waits for the owner. No approved target was changed.

Status words used below: **DONE** (investigated, evidence complete), **PRELIMINARY** (reduced seed set or partial data; the direction is clear, the numbers are not final), **RUNNING** (the study is still computing).

Tools added for this work (all measurement only):
- `tools/task10-league-recorder.mjs`: full MVP races, the free-agent market by position every game week, AI lineups, club strength, league football totals by season.
- `tools/task10-ability-strength.mjs`: every football ability in paired full games (same seeds, same monster, ability on and off).
- `tools/task10-clash-strength.mjs`: every Clash ability in isolation, in a one-against-one round robin, and in random three-against-three teams.
- `tools/study-owner.mjs` (earlier): the repair owner.

---

## 5. Completion percentage: why 55 to 57% and not 65% (DONE)

**The method matches the original.** I reran the original study exactly (`tools/passing-calibration.mjs`, 48 matched games, three variants, the same seeds) on the released game and on eleven earlier builds.

| Build | Abilities on | Abilities off | Sacks per dropback |
|---|---|---|---|
| v42.8.0, the calibration release | 64.5% | 62.8% | 2.5% |
| v42.10 / v42.11 | 63.4% | 64.2% | 2.7% |
| v42.14 to v42.17 | 64.3 to 65.4% | 63.5 to 64.1% | 2.2 to 2.5% |
| v42.21 (Task 6) | 65.0% | 64.1% | 2.2% |
| v42.22 (Task 7) | 64.9% | 63.3% | 2.2% |
| Task 8, before the catalogue switch (M1 fixtures) | 65.4% | 64.1% | 2.1% |
| Task 8, after the catalogue switch (M1 "Dex individuals in every channel") | 61.1% | 59.7% | 2.5% |
| Task 8, after stamina and the first abilities (M3 start) | 62.3% | 57.6% | 2.3% |
| Task 8, after the main ability batches | 56.3% | 58.2% | 2.3% |
| Task 8 final, and every release since (v43.6 to v43.12) | 55.3% | 59.7% | 1.7% |

The 64.5% on v42.8.0 reproduces the original record to the decimal, so the tool and the seeds are the ones the target was set with. The 56.8% in the Task 8 final verification is the same measure on 120 matchups; 55.3% is the 48-game original.

**So the game changed, in three steps inside Task 8, and the target was never recalibrated afterwards:**
1. **The catalogue switch (about 4 points).** The study plays generated practice clubs. Before Task 8 almost every quarterback in them had Accuracy 60 or more (about 3% of attempts came from a quarterback under 60). Since the switch to Dex individuals, about a third of the attempts come from quarterbacks under Accuracy 60, and they complete 48.5% with abilities on.
2. **Per-game stamina (about 2 points with abilities off).**
3. **The Task 8 abilities (about 6 points).** Before Task 8, abilities added about 1 point of completion. Now they take away 4.4 points (55.3% on, 59.7% off). Deep completion shows it most: 50% with abilities off, 36.7% with them on. Defensive abilities now outweigh offensive ones in the passing game. The per-ability study (decision 8) will name which.

**The practice clubs no longer represent a franchise league.** In the eight corrected 20-season franchises, the season-20 leagues complete **67.1%** of passes (62.9 to 71.0% by franchise, 18,674 attempts), because quarterbacks develop: the median starting quarterback there has Accuracy about 76, and several are all-99 Apex monsters. Scoring moves the same way: in the first recorded franchise, 14.3 points per team per game in season 1, 21 to 24 by seasons 3 to 5, and 27 to 34 from season 13 on. Yards per attempt in the season-20 leagues is 10.4 and yards per carry 8.0 (practice clubs: 7.1 and 6.2).

**What this means for the target (no change made):** "about 65% in representative games with abilities on" was written when a generated club was a mature club. Since Task 8 a new league starts well below it and a developed league ends above it. The owner needs to say which games the 65% describes:
- (a) a new league in season 1 (then the released game is about 10 points low and passing needs recalibrating);
- (b) a developed league (then the released game is at or slightly above it from mid-franchise, and the question becomes the early seasons and the late-franchise scoring);
- (c) a band over the life of a franchise.

The season-by-season completion series is being recorded now (see decision 7's runs) so this can be put in numbers. **Matrix: F-1 stays FAIL against the practice-club measure; the cause is now known and the open point is the owner's definition of "representative".**

A second point to raise: **football drifts with development.** Offense gains more than defense as ratings rise (scoring doubles over 20 seasons). That is a balance finding in its own right, recorded as F-20.

---

## 6. Sack rate: which target is authoritative (DONE)

Every statement about the sack rate in the repository:

| Date | Source | What it says | Kind |
|---|---|---|---|
| 2026-10-13 | `GRIDIRON_BEAST_REBUILD_PLAN.md`, "Known gaps" | "sack rate in AI-vs-AI games is ~1.5–3% (target 5–7%)" | A developer note in the rebuild plan. The only numeric target ever written. Never copied into the GDD. |
| since M2 | `tests/engine.test.js` | sack rate between 3% and 13% | A different measure: a 3,000-play engine batch of evenly rotated calls, not games. It passes today. |
| 2026-10-26 | GDD §53.5c (v42.8.0, owner-approved passing calibration) | "sacks 2.5% of dropbacks (3.3% before the fixes)" | A measured result. The owner's target in that section is completion only. |
| 2026-10-28 | GDD release record for v42.14.0, "Future work" item 3 | sacks 3.0 → 2.2% of dropbacks "accepted as a documented diagnostic deviation" | An owner-approved release accepting the lower rate, as a deviation. |
| GDD §2 (principles) | "Calibration targets are diagnostics" | exceptional outcomes are never suppressed to hit a band | Governs how any target is used. |
| Task 7 specification, benchmark plan, final report | nothing | Task 7 set no sack target | |
| Task 8 specification, approval register, decision packets, M6 acceptance | nothing | Task 8 set no sack target; the final verification reports 2.0% descriptively | |
| today | released game | 1.7% (48 games) to 2.0% (120 games) in practice games; 1.8% in the season-20 franchise leagues (1.2 to 2.3%) | |

**Finding.** There is no owner-approved sack-rate target in the GDD, the Task 7 records or the Task 8 records. The matrix row F-2 named "2.5% accepted at v42.8" as if it were a target; that was my wording and it was wrong: 2.5% was a measurement. The discrepancy is between one early developer target (5 to 7%) and a series of later measurements that the owner saw and released without setting a number.

**Recommendation on which governs (the owner decides):** the rebuild plan's 5 to 7% is the only target on record and nothing later replaced it, so formally it still stands and the game has been below it since the rebuild; the v42.14 note is the owner accepting that gap as a known deviation, not a new target. I recommend the owner now state the sack target in the GDD, because two things depend on it:
- at 1.7 to 2.0% a team is sacked about once every three games, so pass rushers have very thin sack numbers, and one dominant rusher stands far above his position (decision 1: the repeat MVP had 16 sacks in 9 games);
- Task 8 lowered it further (2.2% → 1.7%), mostly through abilities.

Until the owner rules, **F-2 is BLOCKED (owner), not PASS and not FAIL**, with 5 to 7% listed as the standing written target and 1.7 to 2.0% as the measurement.

---

## 1. Repeat MVPs (PRELIMINARY: one franchise recorded in full; five more running)

**Is the same monster really the strongest candidate each season? Yes.** The recorder recomputes the whole race every season (about 200 eligible monsters, not the saved top five). In the first franchise (seed 3, Rookie), Scorchulk (DL, Northstar Wolves) wins 15 of 20. In each of those seasons he is first by a clear margin (3.0 to 3.7 award points against 2.2 to 2.9 for second), on clubs that go 7-2 to 9-0. Season 11: 16 sacks, 27 tackles for loss, 55 pressures in 9 games, in a league where a team is sacked about once in three games.

**Why it is the same monster: he is an Apex.** He reached 99 in all twelve attributes by season 3, and an Apex never ages, declines or retires (Task 8 rule, tested). Every repeat winner in the eight corrected franchises is an Apex: Scorchulk (seeds 3 and 4), Pyronix II, Zaptera, Quarrox III, and so on. Of the 20 MVPs in seed 3, 17 went to Apex monsters; non-Apex monsters won only in seasons 1, 2 and 15. The number of Apex monsters among eligible players grows from 7 in season 1 to 14 to 17 late on, but the first one to reach all-99 at a position keeps the top of that position for the rest of the franchise.

**Does the calculation evaluate positions properly? Partly.** Three structural effects, all visible in the full races:
1. **Scores are distances from the position's average, with no ceiling.** Sacks and pressures are rare and very unevenly spread, so a dominant pass rusher sits 4 to 5 standard deviations above the other linemen. Passing numbers are spread more evenly, so the best quarterback is usually about 2 above his peers. Even with the quarterback's 1.35 weight against a defender's 0.85, the best lineman outscored the best quarterback in 15 of 20 seasons. In season 20 an all-99 Apex quarterback on an 8-1 club scored 2.91 and lost to the Apex lineman's 3.18.
2. **Some positions cannot win.** The best offensive lineman of a season ranked between 14th and 32nd in every season; the best linebacker and the best safety were rarely in the top ten. Over the 160 MVPs of the eight corrected franchises: WR 44, DL 44, QB 37, RB 27, TE 6, CB 2, and none for OL, LB, S or K.
3. **Group size.** There are about 30 eligible linemen, corners and defensive linemen against 15 quarterbacks, backs and tight ends. The best of 30 is usually further from the average than the best of 15.

**What I recommend looking at (nothing changed; each needs approval):**
- No repeat limit and no voter fatigue, as decided.
- The repeat itself is the Apex rule working as designed (all-99, ageless). If a monster winning 15 MVPs is not wanted, the lever is in the Apex rules, not in the award. That is a Task 8 design question for the owner.
- The award's position effect is real and can be shown without touching the Apex question: a ceiling on how far above his position one statistic can lift a candidate (for example 3 standard deviations) would stop one skewed statistic deciding the award. I will put numbers on that from the six recorded franchises before proposing it.

**Matrix:** H-8 moves from BLOCKED (owner) to PENDING (investigation running); P-12 (award distribution by position) is new evidence, FAIL against "no position structurally excluded" if the owner adopts that as a requirement.

---

## 2. Hall of Fame: the seven accomplished monsters left out (DONE)

Standards unchanged, as decided. I traced each of the seven through every election they were eligible for (the Board seats' standards run from 57 to 87 points; 11 of 15 votes are needed).

| Monster | Case | What happened in the elections | Is the exclusion justified? |
|---|---|---|---|
| **Terrabull** (TE, seed 4) | MVP and SMOY; 5 recorded seasons, 51 games; 74 to 78 points | On nine ballots. First on the ballot in three elections in which nobody was inducted. Votes: 9, 8, 8, 6, 8, 7, 10, 10, 7. One vote short twice. | **Borderline, and unlucky.** A 77-point case gets each seat's vote about two times in three, so 11 of 15 is roughly a one-in-five chance each year. In the same franchise a wide receiver was inducted with 78.7 points and a cornerback with 80.4. Defensible, not clear-cut. |
| **Ripplet III** (WR, seed 3) | Most productive wide receiver of the franchise (90th percentile); 9 seasons; 75 points | Retired in season 17, so the season-20 election was his only ballot: 7 of 15. | **Not excluded: the franchise ended.** He would stay eligible. Any monster who retires after season 17 gets at most one election before the 20-season limit. |
| **Duskyre** (RB, seed 4) | MVP and OPOY in one season; 4 recorded seasons, 42 games; 62 points | Three ballots, 3 to 4 votes. | **Justified** on the record: one great season. But see the note on unrecorded careers. |
| **Enigmane** (TE, seed 3) | MVP and OPOY in season 1; 1 recorded season; 63 points | Sixteen ballots, never more than 5 votes; dropped off the fifteen-name ballot in seasons 19 and 20. | **Justified** on the record: one season. Same note. |
| **Nocturne** (QB, seed 6) | 2× SMOY; 6 seasons; 57 points | Never among the fifteen nominees. | **Justified.** SMOY rewards ability impact; his football production was at the 66th percentile. |
| **Nocturne** (QB, seed 6, a second monster of the same name) | 2× SMOY; 6 seasons; 43 points | Never nominated. | **Justified.** Production at the 31st percentile. |
| **Murklaw** (LB, seed 9) | "2× DROY"; 12 seasons; 56 points | Five ballots, no votes. | **Justified**, and his two rookie awards are a defect (below). |

**Verdict: the voting is recognising careers, not single awards.** Six of the seven exclusions hold up; the seventh (Terrabull) is a coin-flip case that fell the wrong way nine times.

**Three things the trace turned up:**
1. **Unrecorded careers.** A monster's Hall case counts only seasons played inside the franchise. Enigmane was 28 with six seasons behind him when the franchise began; Duskyre arrived as a generated veteran at 28. Their earlier seasons exist as ratings, not as statistics, so they can never build a full case. That is consistent ("the Hall honours what happened in this league") but the owner should know that founding veterans and generated arrivals are structurally disadvantaged.
2. **Late retirees and the 20-season limit.** With a three-season wait, nobody who retires after season 17 can be inducted. The Hall's last three classes are drawn only from earlier retirees.
3. **Defect D-1: a monster won Defensive Rookie of the Year twice** (Murklaw, seed 9, seasons 1 and 2: age 20 and zero seasons played in both). One case in 300 rookie awards. A founding-roster rookie was treated as a first-year monster again in his second season. Small, but it is a wrong award and it fed two award credits into a Hall case. Logged for a fix with approval.

**Matrix:** H-4 and H-5 move from BLOCKED (owner) to **PASS** (standards kept by decision; exclusions examined). D-1 is added as a FAIL.

---

## 3. Free-agent availability and legal rosters (PRELIMINARY: mechanism established, one franchise measured week by week; five more running)

**Why the owner's club still forfeits: the owner and the AI clubs do not have the same supply.**
- When an AI club cannot field a legal lineup, the weekly cover (`leagueInjuryCover`) signs from the waivers or the pools and, when nobody is there, **generates a replacement-level veteran at that position on the spot**. The same happens in the AI's offseason free agency. The code comment says so: "The owner faces the same rule through the forfeit; an AI club simply signs."
- The owner can only sign monsters that already exist on the market. When the market has nobody at the position, there is nothing to do but forfeit.
- In the first recorded franchise, **no AI club had an open starting slot at kickoff in 2,940 club-weeks.** In the corrected franchises' league logs, 66 of 123 recorded in-season AI cover signings (54%) were generated arrivals, most often at LB (25), CB (17) and RB (9): the same positions where the owner finds nobody.

**How empty the market is (seed 3, Rookie, 196 game weeks, healthy free agents a club could sign that day):**

| Position | Game weeks with nobody available | Mean available |
|---|---|---|
| RB | 80% | 0.2 |
| LB | 77% | 0.35 |
| CB | 76% | 0.5 |
| WR | 63% | 1.45 |
| TE | 58% | 0.8 |
| S | 55% | 0.8 |
| DL | 42% | 1.4 |
| K | 37% | 1.35 |
| OL | 31% | 1.4 |
| QB | 14% | 2.5 |

- The whole market holds a median of 9 monsters in season (0 to 27).
- **It dries up over the franchise:** 15 free agents on average in seasons 1 to 5, 14 in seasons 6 to 10, 9 in seasons 11 to 15, **5 in seasons 16 to 20** (8 of 10 positions empty).
- Within a season it is flat until the last weeks, then falls (11 in weeks 1 to 10, 5 by week 13).
- Offseason, after the draft: RB, TE, LB, CB and S average under two available monsters each; at least one position was empty in most offseasons; the owner was short of a full starting group somewhere in 10 of 20 offseasons.
- Every time the repair owner could not fix an open slot, the market had nobody at that position (3 of 3).

**Assessment against the deferred Task 7 requirements (GDD §59.10):**
- (7) free-agent availability by position: **FAIL** for the owner at RB, LB, CB, TE, S and WR in season.
- (2) legal starting-lineup completion: AI clubs **PASS** (0 open slots); the owner's club **FAIL** without a source of cover.
- (3) injury and departure replacement availability: **FAIL** for the owner, PASS for AI (by generation).
- (8) generated replacement frequency: more than half of AI in-season cover. The catalogue expansion did not create a market that sustains itself; the AI clubs are kept legal by generation.
- (15) forfeit frequency: 5.8% of the repair owner's games across eight franchises (one franchise accounts for most), 0 for AI clubs.

**The design question for the owner (no change made):** a human player who manages well can still be left with no legal move, because the fix the AI uses does not exist for him. Options, each needing approval:
- (a) give the owner the same emergency cover (a replacement-level veteran offered when the market has nobody at an open starting position);
- (b) keep a standing floor on the market (the league keeps at least one or two healthy replacement-level free agents at every position);
- (c) let the lineup rule bend (play a monster out of position at a penalty) instead of forfeiting.

I will size these against the six recorded franchises and the reduced Task 7 benchmark before recommending one.

**Matrix:** R-1 stays FAIL and is reclassified from "harness" to "game"; T7-25, T7-27, T7-31 are FAIL (owner side) on preliminary evidence; T7-26 PASS for AI clubs.

---

## 7. Championship concentration (PRELIMINARY: one franchise analysed; Rookie, Pro and All-Star on two seeds running)

First recorded franchise (seed 3, Rookie, repair owner):
- Northstar Wolves won 7 of 20 titles; nine different champions; seven clubs had an undefeated regular season at least once (Northstar four times).
- **Club overall rating does not explain it.** Club overalls sit in a narrow band (standard deviation 3 to 4 points; in season 20 the clubs run from 57 to 70). Northstar was the top-rated club in only three of its seven title seasons and was sixth and eighth in two.
- **Apex monsters do.** Northstar held three Apex monsters from season 9, including the lineman who won 15 MVPs. League-wide the Apex count rises from 10 to 25 over the franchise, at most 2 on a club early and 4 late.
- **Results are far more spread than evenly matched clubs would give.** The standard deviation of season win rate is 0.24 to 0.30 every season; for sixteen equal clubs over nine games it would be about 0.17. Nine-game seasons with a few all-99 monsters produce 8-1 and 9-0 clubs regularly.

Still to come before any recommendation: the same analysis on Rookie, Pro and All-Star (two seeds each), the hands-off against the repair owner, how AI club quality targets differ by difficulty, and whether the clubs that win 10 to 13 titles are the ones that collect Apex monsters.

---

## 8. The complete ability audit (Clash: DONE; football: RUNNING)

### Clash (72 abilities): DONE

Method: mature monsters (five seasons played), every battle seeded and repeatable, about 700,000 battles in all.
- **(A) Isolation.** Each family's monster against monsters with no Clash ability, alone against as many of them as makes the fight even, at no mastery and at full mastery. The same battles with abilities on and off, so the difference is that one ability.
- **(B) One against one**, a round robin of all 72.
- **(D) Three against three, the size the game plays** (encounters, the opening contest, overtime): 150,000 battles between random teams of three different families, abilities on and off with the same seeds. About 12,500 battles per family, so a family's figure is good to about half a point.

**Type chart: works as designed.** With abilities off, the favoured type wins 58.2% and the unfavoured 41.8%; even matchups 50.0%.

**Abilities decide one battle in five.** In three against three, switching abilities on changes the winner in 20.2% of battles. Battle length is unchanged (14.2 exchanges against 14.3).

**One ability is far stronger than every other: Falling Star (firestorm, uncommon).** Teams with Pyronix win 47.1% without abilities and **72.9%** with them: +25.8 points. The next strongest are Mind Game (enigmane) +10.0, Shadow Pounce (shadowkit) +9.2, Riptide Charge (wavehorn) +7.6, Astral Strike (astralux) +7.3 and Glacier Wall (glaciron) +6.6. Falling Star is the only Clash ability that damages every opponent, reserves included, and nothing in the catalogue answers it. Fire is the strongest element in three against three (+5.9 points on average) for that reason alone; every other element is within 2.2 points of level.

**Twelve abilities almost never execute in a real three-against-three battle** (share of battles with no execution): Unbroken Charge (boulderox) **100%, never once in 12,520 appearances**, Lightning Rod (flicker) 98.7%, Clear Light (lumen) 98.3%, Arc Rebound (voltfin) 98.0%, Spore Detonation (mossclaw) 97.5%, Deep Winter (glacivern, legendary) 95.9%, Rubble Reprisal (rockram) 94.5%, Phase Strike (voltfang) 94.4%, Iron Bite (ironjaw) 94.3%, Stone Divide (terrabull) 93.8%, Bank Shot (stoneguard) 93.6%, Shell Renewal (reefclaw) 93.1%. Four more are idle in most battles: Fresh Start (snowmoth) 88.7%, Wash Away (tidefin) 80.8%, Eclipse Theft (nyxshade, legendary) 79.6%, Circuit Breaker (stormlynx) 72.0%.
- They work when triggered (the reviewers and the contract tests show that). The trigger is the problem: each one answers something another ability must first do (an enemy who is Shielded, Stunned or carrying a harmful status, an enemy heal, an enemy extra strike, a dodge), and too few abilities in the catalogue do those things. Unbroken Charge needs its owner to actually lose a turn to Stunned.
- A dormant ability is a handicap: with abilities on, the teams carrying Deep Winter lose 9.7 points of win rate, Eclipse Theft 9.1, Bank Shot 8.1, simply because the other side's abilities work.

**Abilities that make their own user worse** (implemented as specified; the specified trade loses more than it gains):

| Ability | Alone, even odds | Three against three, among the 72 | Why |
|---|---|---|---|
| **Foresight** (cerebrix) | 77% → 47% (−30) | −9.1 | Spends an attack turn preparing a mirror that only matters against an enemy ability that applies a status. Executes in 98% of battles. Identical at no mastery and full mastery |
| **Snowdrift Shelter** (icehorn) | 59% → 31% (−28) | −4.9 | At half HP it gives up its attack to halve one hit, automatically. **Mastery makes it worse**: the shorter cooldown means it gives up more attacks (no mastery −17, full mastery −28) |
| **Cinder Clamp** (ashkit) | 48% → 36% (−13) | −1.5 | **Worse with mastery** (−6 → −13) |
| **Mountain Shelter** (titanolith, legendary) | 59% → 52% (−8) | −1.6 | Replaces an attack with a team guard |
| **Second Tide** (tidepaw) | +1 | −5.0 | Heals every second turn whether or not anyone is hurt |
| **Eye of the Storm** (tempestra, legendary) | never executes alone | **−9.8** | Executes in 36% of battles and its teams still lose ground |
| **Root Communion** (elderoot, legendary) | never executes alone | −7.1 | Executes in 75% of battles |
| **Radiant Pursuit** (halofang) | +2 | −6.8 | Identical at no mastery and full mastery |
| **Shared Burden** (mudcub), **Feather Relay** (gustling), **Sovereign Balance** (aurodrax, legendary), **Dragon Roar** (vyrnax) | 0 to +16 | −2.9 to −3.8 | |

**Rarity is upside down for Clash abilities.** Legendary abilities are the weakest group in three against three: −2.5 points on average, against +0.8 for uncommon, +0.5 for rare and +0.3 for common. Five of the twelve legendary abilities are in the bottom twelve (Eye of the Storm, Deep Winter, Eclipse Theft, Root Communion, Sovereign Balance). Legendary monsters still win more battles (66% against 37% for commons), but through their ratings, not their abilities.

**Position groups** (ability effect in three against three): TE +3.9, QB +2.9, OL +2.4, RB +2.0, S −0.2, CB −0.3, WR −2.0, DL −2.3, LB −2.5, K −3.6.

**Ability combinations: no broken pair.** All 2,556 pairs of families were measured as team-mates (about 350 battles each). No pair gains more together than its two members' own effects predict, beyond what chance gives across that many pairs (the largest surplus is 3.3 standard errors, where about 3.4 is expected by chance). The strongest negative interactions are all Falling Star with another strong monster (the team was already winning).

**Mastery.** Across all 72, full mastery raises the mean isolated effect from +2.7 to +6.1 points. It adds nothing measurable for Last Root, Radiant Pursuit and Foresight, and it hurts Snowdrift Shelter and Cinder Clamp.

**One against one** follows rarity and archetype more than ability (legendary families win 79% of the round robin, common 25%; several Support commons win almost nothing alone). The game never plays one against one, so this is context only.

### Football (72 abilities)

Method: whole real games in pairs. The same two clubs and the same seed are played twice: once with the family's monster carrying his ability, once with the very same monster without it. Nobody else on either club has an ability. Measured at the first form with no mastery and at the last form with full mastery, 40 paired games each (11,520 games): executions per game, games in which it never executes, and the paired change in margin, points, yards per play and turnovers. **Running now.** Early rows already show the pattern the owner asked about: Guiding Halo (lumen) executes 0.7 to 0.8 times a game and changed the result of none of the first six paired games.

### Still to do under decision 8
- Positional and elemental balance tables from the football run.
- Football type advantage at club level (one club all of a favoured type).
- Football ability pairs on one club (the strongest singles together).
- The same abilities compared between Football and Clash.

---

## 4. Task 7 benchmark, reduced seed set (RUNNING, preliminary by decision)

The Task 6/7 harness (`tools/ai-franchise-benchmark.mjs` v4) runs on the released game without change (checked: 0 problems on a two-season smoke run). Running now, on the released game, four whole jobs of the original plan so the results can be reused in the complete run: C 106–108 × 20 seasons, B 1–10 × 10, CH 116–120 × 20, H 61–70 × 10 (Pro).

Two facts for the complete run:
- **The Task 6 baseline files are gone.** The comparative gate compares against the `rc-*` run files of v42.21.0, which lived in an earlier work area and are not in the repository. The complete benchmark therefore needs the baseline rerun too (the v42.21.0 tree is checked out and its harness runs).
- **Size.** The complete plan is 255 jobs on each build. On this machine (two cores) that is roughly 15 to 20 hours of computing for the candidate and about half that for the baseline. It can be done in stages in the background; nothing will be declared passed before it is complete.

---

## New matrix rows from this investigation

| ID | Finding | Status |
|---|---|---|
| F-20 | Football drifts with development: scoring doubles over a franchise (14 → 27 to 34 points per team per game), completion rises from about 55% to 67% | New. PENDING an owner target for late-franchise football |
| D-1 | A monster won Defensive Rookie of the Year in two consecutive seasons | FAIL (defect, 1 of 300 rookie awards) |
| A-22 | Clash abilities that lower their own user's win rate (Foresight, Snowdrift Shelter, Cinder Clamp, Second Tide, Eye of the Storm, Root Communion and others) | FAIL against "useful"; implemented as specified |
| A-23 | Clash abilities that get worse with mastery (Snowdrift Shelter, Cinder Clamp) | FAIL |
| A-24 | Twelve Clash abilities execute in fewer than 1 battle in 14 (Unbroken Charge never) | FAIL against "useful" |
| A-25 | Falling Star is worth +25.8 points of team win rate, 2.5 times the next ability | FAIL against "balanced" |
| A-26 | Legendary Clash abilities are the weakest rarity group (−2.5 points) | FAIL against the rarity order |
| A-27 | Clash type chart: favoured 58.2%, unfavoured 41.8% | PASS |
| A-28 | No Clash ability pair is stronger together than its parts (2,556 pairs) | PASS |
