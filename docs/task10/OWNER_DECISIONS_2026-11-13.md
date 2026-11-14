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

**The practice clubs no longer represent a franchise league, not even a new one.** Completion measured in the franchise leagues themselves, season by season (four recorded franchises, Rookie to All-Star):

| Season | 1 | 2 | 3 | 5 | 10 | 15 | 20 |
|---|---|---|---|---|---|---|---|
| Completion | 57 to 62% | 59 to 65% | 63 to 66% | 63 to 67% | 64 to 71% | 64 to 69% | 67 to 70% |

- A new league's median starting quarterback has Accuracy 65 to 70; the practice clubs are weaker than that (a third of their attempts come from quarterbacks under 60).
- The eight corrected franchises' season-20 leagues complete **67.1%** (62.9 to 71.0%, 18,674 attempts).
- So in the games people actually play, completion is 3 to 8 points under the target in season 1, at the target from about season 3 to 5, and 0 to 5 points over it late on.

**What this means for the target (no change made):** "about 65% in representative games with abilities on" is met in franchise play for most of a franchise and missed by the practice-club study. Two things for the owner:
- say which games the 65% describes (I recommend the franchise league, measured by the recorder, with a band such as 62 to 68% across seasons 1 to 20; then seasons 1 and 2 are slightly low and the rest pass);
- the practice-club study should either be retired as the measure or the practice clubs rebuilt to match a real season-1 league.

**Matrix: F-1 stays FAIL on the practice-club measure as written; on the franchise measure it would be a PASS from season 3. The open point is the owner's definition.**

**F-20, football drifts with development.** Scoring rises as monsters develop, by an amount that depends on the league: 14 points per team per game in season 1 to 25 to 31 late on in seed 3 (all three difficulties), 12 to 13 rising to 15 to 23 in seed 4 (and back to 13 in one of its three runs). Yards per attempt in the season-20 leagues is 10.4 and yards per carry 8.0 (practice clubs: 7.1 and 6.2). Sacks stay at 1.2 to 3.4% of dropbacks in every season.

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

## 1. Repeat MVPs (DONE on six recorded franchises: 120 seasons, Rookie, Pro and All-Star)

The recorder recomputes the whole race every season (about 200 eligible monsters, not the saved top five), and its winner matched the game's own winner in every season.

**Is the same monster really the strongest candidate each season? Yes.** In every repeat, the winner is first on the award's own measure, by a mean margin of 0.32 award points over second place (median 0.24). Example (seed 3, Rookie): Scorchulk, a defensive lineman, wins 15 of 20; in season 11 he has 16 sacks, 27 tackles for loss and 55 pressures in 9 games, in a league where a team is sacked about once in three games.

**Why it is the same monster: the long runs are Apex monsters.** The most MVPs by one monster in the six franchises: 15, 11 and 8 (all Apex), then 7, 6 and 5 by Aurelion, a legendary wide receiver who is not an Apex and does age. An Apex reaches 99 in all twelve attributes and never ages, declines or retires (Task 8 rule, tested).
- 72 of the 120 MVPs went to Apex monsters, and half of all top-three places (179 of 360), although Apex monsters are only 7 to 17 of about 200 eligible players.
- The first Apex to reach all-99 at a position keeps the top of that position for the rest of the franchise.
- Take the Apex monsters out and the award looks ordinary: the best non-Apex candidate was a quarterback in 53 seasons, a wide receiver in 45, a tight end in 13 and a running back in 9.

**Does the calculation evaluate positions properly? No, not evenly.**

| Position | MVPs (120) | Best candidate's median rank in the race | His best component, in standard deviations above his position |
|---|---|---|---|
| DL | 44 | 2nd | 4.2 |
| WR | 33 | 3rd | 3.1 |
| RB | 21 | 3rd | 2.6 |
| QB | 16 | 3rd | 2.1 |
| TE | 6 | 5th | 2.6 |
| CB | 0 | 10th | 3.1 |
| S | 0 | 13th | 2.9 |
| LB | 0 | 15th | 2.7 |
| OL | 0 | 25th | 1.8 |

1. **Scores are distances from the position's average, with no ceiling.** Sacks and pressures are rare and unevenly spread, so a dominant pass rusher sits 4 standard deviations above the other linemen; passing numbers are spread evenly, so the best quarterback is about 2 above his peers. The quarterback's 1.35 weight against a defender's 0.85 does not make up the difference.
2. **Four positions cannot win.** No OL, LB, CB, S or K won in 120 seasons here, and none of OL, LB, S or K in the 160 seasons of the eight earlier franchises. The best offensive lineman of a season is typically 25th.
3. **A low sack rate feeds it.** With sacks at about 2% of dropbacks, most linemen have almost none, which is what makes one dominant rusher such an outlier (decision 6).

**What a ceiling would do (a what-if on the recorded races, not a change):** with every component limited to 3 standard deviations, the winner changes in 41 of 120 seasons and the awards split QB 37, RB 34, WR 29, DL 12, TE 8.

**Recommendations (each needs approval; nothing changed):**
- No repeat limit and no voter fatigue, as decided. The repeats are the Apex rule working as written.
- If one monster winning 8 to 15 MVPs is not wanted, the lever is the Apex rule (all-99 and ageless), a Task 8 design question, not the award.
- Independently of that, I recommend a ceiling of 3 standard deviations on each award component. The evidence supports it: it removes the lineman's structural advantage without touching any statistic, and a truly dominant season still wins.
- OL, LB and S cannot win under any setting examined. If the owner wants them eligible in practice, that needs a different measure for those positions; I have not designed one.

**Matrix:** H-8 **PASS** (the repeat winner is the strongest candidate; no limit by decision). H-9 **FAIL** against "positions evaluated properly", with the ceiling proposed.

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

## 3. Free-agent availability and legal rosters (DONE on six recorded franchises: 1,242 game weeks, Rookie, Pro and All-Star)

**Why the owner's club still forfeits: the owner and the AI clubs do not have the same supply.**
- When an AI club cannot field a legal lineup, the weekly cover (`leagueInjuryCover`) signs from the waivers or the pools and, when nobody is there, **generates a replacement-level veteran at that position on the spot**. The AI's offseason free agency does the same. The code comment says so: "The owner faces the same rule through the forfeit; an AI club simply signs."
- The owner can only sign monsters that already exist on the market.
- **AI clubs: 0 open starting slots at kickoff in 18,630 club-weeks.**
- **The owner: an open starting slot before 39 games; the repair owner could fix 5. In all 34 he could not fix, the market had nobody at that position.** 32 forfeits in 1,080 regular-season games (3.0%).
- In the eight earlier franchises' league logs, 66 of 123 recorded in-season AI cover signings (54%) were generated arrivals, most at LB (25), CB (17) and RB (9).

**How empty the market is** (healthy free agents a club could sign on game day):

| Position | Game weeks with nobody available | Mean available |
|---|---|---|
| RB | 71% | 0.4 |
| CB | 60% | 0.6 |
| S | 60% | 0.8 |
| WR | 54% | 1.1 |
| LB | 53% | 1.1 |
| TE | 49% | 0.9 |
| OL | 42% | 1.3 |
| K | 38% | 1.2 |
| DL | 36% | 1.3 |
| QB | 22% | 2.0 |

- **When:** it dries up in the second half of a franchise. Seasons 1 to 5: 14 free agents on average, 3.5 of the 10 positions empty. Seasons 6 to 10: 16 and 3.4. Seasons 11 to 15: **7 and 6.1**. Seasons 16 to 20: **6 and 6.3**. All 32 forfeits fell in season 7 or later, 31 of them from season 9 on.
- Within a season the market is flat until the last weeks, then falls by half.
- Offseason (seed 3): RB, TE, LB, CB and S average under two available monsters each after the draft, and the owner was short of a full starting group somewhere in 10 of 20 offseasons.
- The same on every difficulty: Rookie, Pro and All-Star show the same pattern.

**Assessment against the deferred Task 7 requirements (GDD §59.10):**
- (7) free-agent availability by position: **FAIL**. Six of ten positions have nobody available in at least half of all game weeks.
- (2) legal starting-lineup completion: AI clubs **PASS**; the owner's club **FAIL** when the market is empty.
- (3) injury and departure replacement availability: **FAIL** for the owner, PASS for AI (by generation).
- (8) generated replacement frequency: more than half of AI in-season cover. The larger catalogue did not create a market that sustains itself; AI clubs are kept legal by generation.
- (15) forfeit frequency: 3.0% of the repair owner's games here (5.8% in the eight earlier franchises), 0 for AI clubs.

**Can a human player keep a legal roster for 20 seasons?** Not reliably by his own actions. A careful player who keeps depth at every position avoids most of it, but after season 10 an injury at RB, CB, S or LB will often find an empty market, and the game then offers no legal move.

**Options (each needs approval; nothing changed):**
- (a) **Give the owner the cover the AI already has**: when he has an open starting slot and the market has nobody healthy at that position, a replacement-level veteran is offered at the minimum deal. This is the smallest change and makes the two sides equal. I recommend it.
- (b) A standing floor on the market (the league always keeps one or two healthy replacement-level free agents at every position). Fixes the same thing and also gives depth signings, but changes the market for everyone.
- (c) Let the lineup rule bend (a monster plays out of position at a penalty) instead of forfeiting. A larger design change.

**Matrix:** R-1 FAIL (game issue). T7-25, T7-27, T7-31, T7-39 **FAIL**; T7-26 PASS for AI clubs, FAIL for the owner; T7-32 measured.

---

## 7. Championship concentration (PRELIMINARY: two seeds on each of Rookie, Pro and All-Star, repair owner; the benchmark runs will add seeds)

| Seed | Difficulty | Owner's win rate | Owner's titles | Leading club | Different champions | Owner's Apex monsters at the start |
|---|---|---|---|---|---|---|
| 3 | Rookie | 54% | 0 | Northstar Wolves 7 | 9 | 0 |
| 3 | Pro | 24% | 0 | Ironpeak Rams 5 | 6 | 0 |
| 3 | All-Star | 37% | 0 | Palmetto Vipers 8 | 8 | 0 |
| 4 | Rookie | **92%** | **13** | the owner's club | 7 | 2 |
| 4 | Pro | 76% | 5 | the owner's club | 8 | 2 |
| 4 | All-Star | **84%** | **13** | the owner's club | 5 | 2 |

**The club that wins 13 titles and goes undefeated a dozen times is the owner's own club, and nobody is managing it.** The study owner trains through his staff and repairs his lineup; he does not trade, scout or set a lineup. In seed 4 that club went 9-0 in twelve Rookie seasons and nine All-Star seasons.

**What separates the two seeds is the founding roster, not the difficulty.**
- In seed 4 the owner's club starts with two Apex monsters and a club rating of 56 to 58 against an AI average of 51 to 55. In seed 3 it starts with none, level with the AI clubs.
- Apex monsters never age, so a founding advantage never erodes. The seed-4 club still has them in season 20 and has added one or two.
- **Difficulty barely moves it.** The AI clubs' average rating in season 1 is 52 on Rookie, 53 on Pro and 55 on All-Star, and by season 20 it is 60 to 63 on every difficulty. A club with two founding Apex monsters wins 92% on Rookie and 84% on All-Star.
- The approved owner win-rate targets (Rookie 54 to 70%, Pro 45 to 53%, All-Star 32 to 40%) are missed in both directions depending on the seed: 54 and 92 on Rookie, 24 and 76 on Pro, 37 and 84 on All-Star. Two seeds cannot fix a mean, but the spread between seeds is three times the spread between difficulties.

**AI roster quality and parity.**
- Club ratings are close together in every season (standard deviation 3 to 4 points; 55 to 72 in season 20) and the title winner is often not the top-rated club (in seed 3 Rookie, the seven-time champion was top-rated in three of its seven title seasons).
- Results are far more spread than the ratings: the standard deviation of season win rate is 0.2 to 0.3 every season, where sixteen equal clubs over nine games would give about 0.17. A few all-99 monsters on a club decide games that the club rating does not predict.
- The league's Apex count grows from 5 to 11 at the start to 12 to 25 by season 20, at most 4 on one club.

**Player development.** AI clubs gain about 5 to 9 rating points in the first ten seasons and then level off; the owner's club gains 6 to 15 in the same time and also levels off. Development is not what separates clubs late on.

**Reading.** Concentration comes from ageless all-99 monsters being unevenly dealt at the start and never leaving, in a nine-game season. It is the same root as the repeat MVPs (decision 1). Before recommending anything I want the benchmark seeds (C and CH sets, 20 seasons, Pro) to confirm how often a founding roster hands one club two or more Apex monsters, and how the hands-off and repair owners compare.

**Matrix:** P-12 PENDING with a cause identified; T7-22 to T7-24 and T7-41 (difficulty win rates) FAIL on preliminary evidence (the bands are missed on every difficulty in at least one of two seeds).

---

## 8. The complete ability audit (DONE: Clash in full, football first pass)

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

### Football (72 abilities): DONE (first pass, 40 paired games each; nine abilities rechecked at 160)

Method:
- **Paired games** (`tools/task10-ability-strength.mjs`). The same two clubs and the same seed are played twice as whole real games: once with the family's monster carrying his ability, once with the very same monster (same ratings, same type) without it. Nobody else on either club has an ability, so the two games are identical until the ability acts. Measured at the first form with no mastery and at the last form with full mastery: 11,520 games, then 2,880 more for the recheck.
- **Census** (`tools/task10-ability-census.mjs`): 300 ordinary games between generated clubs with every monster's ability on, counting each ability's executions per game. This catches abilities that only react to other abilities.
- What 40 paired games can see: an effect of about 2 points a game or more. Smaller effects need more games, which is why the candidates were rerun at 160.

**Overall: football abilities are close to neutral one at a time.** The mean effect of one ability on the point margin is +0.07 points a game at full mastery and 0.00 at none. No position group, element or rarity stands out (every group mean is within 0.7 points of zero, inside the noise). That is very different from Clash, where abilities change the winner of one battle in five.

**One ability is clearly strong: Stonewall Swat (rockram, a common linebacker).** +2.6 points a game (±0.65, 160 games), from 1.9 fewer points allowed, and its club wins 13 points of win rate more often. It executes 3.6 times a game. At no mastery it measured higher still (+5.0 ±1.3 on 40 games). Second: Crossed Wires (flicker) +1.2 (±0.5).

**Combinations: no pair is stronger together than its parts** (six pairs of the strongest singles on one club, 120 paired games each; margin in points a game):

| Pair | Together | The two alone, added |
|---|---|---|
| Stonewall Swat + Pressure Drain | +3.5 (±0.8) | +3.3 |
| Stonewall Swat + Crossed Wires | +3.0 (±0.9) | +3.8 |
| Stonewall Swat + Bulwark Grid | +3.0 (±0.8) | about +3.9 |
| Stonewall Swat + Blink | +2.8 (±0.7) | about +4.1 |
| Crossed Wires + Pressure Drain | +1.4 (±0.8) | +1.9 |
| Pressure Drain + Breakwater | +1.3 (±0.9) | about +2.1 |

Every pair that includes Stonewall Swat is worth about 3 points; the partner adds little.

**Abilities that almost never execute in an AI-played game** (census, executions per game appearance):

| Ability | Executions per game | Games with none |
|---|---|---|
| Foresight (cerebrix, QB) | 0 in 154 appearances | 100% |
| Air Brake (skywarden, CB) | 0.01 | 99% |
| Night Watch (nightowl, S) | 0.01 | 99% |
| Crosswind Rescue (windlynx, S) | 0.02 | 98% |
| Prism Break (prism, S) | 0.02 | 98% |
| Hoard Flight (sablewing, CB) | 0.03 | 97% |
| Ball Clamp (ironjaw, DL) | 0.05 | 96% |
| Tsunami Line (tsunarok, S, legendary) | 0.03 (paired games) | 98% |
| Shadow Exchange (nyxshade, CB, legendary) | 0.03 (paired games) | 98% |
| Second Chance (glacivern, K, legendary) | 0.13 (paired games) | 88% |

- Legendary families do not appear in generated clubs, so their figures come from the paired games.
- Cold Snap and Tailwind Huddle never execute when theirs is the only ability on the field, but do in ordinary games (0.6 and 0.9 a game): they react to other abilities.
- Whether Foresight and the others are meant to wait for a human player's activation I have not confirmed; in AI-played games, which is every AI club's game and every simulated game, they do nothing.

**Abilities that execute and change nothing.** In the paired games the score was identical with and without the ability in every game:

| Ability | Executions per game | Games whose result differed |
|---|---|---|
| **Surefoot Canopy** (leafhorn, S) | **25** | **0 of 200** |
| Chain Break (joltrex, DL) | 2.1 | 0 of 80 |
| Beacon Lane (glimmer, WR) | 1.8 | 0 of 80 |
| Radiant Pursuit (halofang, LB) | 1.1 | 0 of 80 |
| Dragon Call (wyrmkit, TE) | 1.0 | 0 of 80 |
| Guiding Halo (lumen, QB) | 0.9 | 1 of 80 |
| Mind Game (enigmane, TE) | 0.6 | 0 of 80 |
| Splashdown (tidepaw, CB) | 0.3 | 0 of 80 |
| Sovereign Arm (aurodrax, QB, legendary) | 0.2 | 0 of 80 |

Some of these protect against something only another ability does (Surefoot Canopy, Night Watch), so alone they have nothing to protect against. The combined test below is the measure of whether that matters. A further nine changed three games or fewer of 40 at full mastery (Ambush Tag, Iron Lungs, Permafrost, Frostmark, Shadow Patch, Stone Screen, Cyclonic Release, Bramble Trap, Vanishing Cut).

**No ability is reliably harmful to its own club.** Four looked negative on 40 games (Deep Roots −1.9, Blackout Pocket −1.6, Clean Sweep −1.2, Gear Grid −1.0). At 160 games: Deep Roots +0.5 (±0.7), Blackout Pocket −0.4 (±0.3), Gear Grid −0.1 (±0.3), Clean Sweep −0.5 (±0.27). Only Clean Sweep remains slightly negative, and not conclusively.

**All abilities together** (the passing study, 48 matched games, every monster's ability on against all off): completion 55.3% against 59.7%, deep completion 36.7% against 50.0%, yards per carry 6.2 against 5.8, sacks 1.7% against 2.0%, points per team 12.5 against 12.8. Together the abilities suppress passing, mostly deep passing, and help the run a little. No single ability accounts for it in the paired games, so it is the sum of many small defensive effects. Stonewall Swat is the largest single piece.

**Mastery and forms.** Full mastery raises executions for many abilities (for example Runway 4.1 to 6.9 a game, Static Field 4.7 to 9.0, Deep Roots 4.5 to 8.6) without a measurable change in results.

**Elemental advantage in football.** With abilities off, a club whose every monster has the favoured type against a club of the unfavoured type gains 2.2 points a game (±1.0) and wins 57% instead of 42% (120 games); the unfavoured club loses 0.8 (±1.0). That is the largest type effect possible, and it is modest, as the ±4% contest value intends.

### Football against Clash

| | Football | Clash |
|---|---|---|
| Effect of abilities on results | Small: one ability of 72 measurably moves the score | Large: the winner changes in 20% of battles |
| Strongest ability | Stonewall Swat, +2.6 points a game | Falling Star, +26 points of win rate |
| Abilities that rarely or never execute | 10 | 12 (16 counting those idle in most battles) |
| Abilities that execute without effect | 9 or more | few |
| Abilities that hurt their own side | none confirmed | about 10 |
| Type advantage | +2.2 points a game for a whole favoured club | 58% against 42% |
| Rarity | no measurable order | legendary abilities weakest |

The same family can be on both lists: Cerebrix's football Foresight never executes in AI games and its Clash Foresight costs its team 9 points; Halofang's Radiant Pursuit changes nothing in football and costs 7 points in Clash; Glacivern, Nyxshade and Tsunarok (all legendary) are nearly dormant in both.

### Limits of this audit
- Football effects under about 1 point a game are not resolved for most abilities; a full 160-game pass over all 72 takes about three hours and can be run if wanted.
- Clash was measured with the AI's rotation policy on both sides; a human choosing rotations may get more from situational abilities.
- The reviewers were used to confirm each named ability's trigger from its contract; I did not rerun all 816 reviewer variants here (they pass in the regression suite).

---

## 4. Task 7 benchmark, reduced seed set (PRELIMINARY by decision; two of four jobs finished, two running)

The Task 6/7 harness (`tools/ai-franchise-benchmark.mjs` v4, hands-off owner as the plan defines him) runs on the released game without change. The reduced set is four whole jobs of the original plan, so the results are reused in the complete run: C 106–108 × 20 seasons and B 1–10 × 10 (finished), CH 116–120 × 20 and H 61–70 × 10 (running), all Pro.

**Finished so far (13 franchises, 160 franchise-seasons). Preliminary, not a pass.**

| Hard gate | Result on the reduced set |
|---|---|
| Integrity (soak, league, save round trip, market checks) | 0 problems in 13 runs |
| Cap (no club below zero usable room) | 0 of 2,560 AI club-seasons |
| Rosters 26 to 38 with a legal lineup | Sizes 27 to 38. **7 AI club-seasons of 2,560 ended with a lineup problem** (to be examined: the gate requires none at season start) |
| Legendary limits, determinism, performance | not yet run |

| Reported measure | Result |
|---|---|
| Hands-off owner win rate, Pro (target 45 to 53%) | 10-season runs: **42.9%** (25 to 75% by seed). 20-season runs: **25.3%** (9, 24, 43%) |
| Hands-off owner forfeits | 12% of his games in the 10-season runs, **44%** in the 20-season runs. This is the unmanaged owner the plan specifies; it is why his win rate collapses, and it is the free-agent problem of decision 3 |
| Leading AI club's titles | 3 to 8 of 10 seasons; 4 to 8 of 20 |
| AI signings that were generated arrivals | 20-season runs: 824 generated against 535 from pools and waivers (**61%**, about 14 per league-season). In season: 17 of 29. By position: WR 131, LB 115, CB 108, DL 99, OL 95, S 80, RB 74, K 58, TE 42, QB 22 |
| Unsigned monsters at the offseason market's close | 26 to 29 on average |

**The comparative gate cannot be judged yet**, for two reasons:
- **The Task 6 baseline files are gone.** The gate compares against the `rc-*` run files of v42.21.0, which lived in an earlier work area and were never in the repository. The baseline has to be rerun (the v42.21.0 tree is checked out here and its harness runs).
- The reduced set is too small for the plan's statistics (matched seeds, 2,000-resample intervals, held-out confirmation).

**Size of the complete run.** 255 jobs on each build. On this machine (two cores) the candidate takes roughly 15 to 20 hours and the baseline about half that. It can run in stages in the background. Nothing is declared passed until it is complete.

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
| A-29 | Football: Stonewall Swat is worth +2.6 points a game, alone among the 72 | FAIL against "balanced" |
| A-30 | Football: ten abilities almost never execute in AI-played games | FAIL against "useful" |
| A-31 | Football: nine abilities execute with no effect on any result when alone | FAIL against "useful", pending the owner's view of protective abilities |
| A-32 | Football: abilities together take 4.4 points off completion and 13 points off deep completion | PENDING an owner target |
| A-33 | Football type advantage: +2.2 points a game for a whole favoured club | PASS |
| A-27 | Clash type chart: favoured 58.2%, unfavoured 41.8% | PASS |
| A-28 | No Clash ability pair is stronger together than its parts (2,556 pairs) | PASS |
