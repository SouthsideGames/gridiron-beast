# Monster attribute balance

**Build:** `v43.50.0-sideline` at `58c33ee`.

## Method

**The controlled experiment.**
- **Tool:** `tools/balance-audit/attr-sweep.mjs` (new; a thin wrapper).
- **Trials:** it runs the Attribute Testing Lab's 46 trials (`src/lab/attr-trials.js`, the same trials `tools/attr-study.mjs` runs at 50/75/95) at five levels:
  - 30 (low);
  - 50;
  - 65 (the Lab's base: average);
  - 80 (high);
  - 95 (elite).
- **How it isolates one attribute:** each trial changes one attribute on its subject slot(s) and leaves every other attribute of every monster at 65. The play, the defence and the seeds are identical at every level.
- **Sample:** 200 seeds per level.
- **Raw data:** `raw/attr-sweep-n200.json`.

**Durability and kicking** use the Lab's own studies at the same five levels, 2,000 seeds each (`raw/attr-sweep-durability-kicking.json`).

**Reading the numbers.** At 200 seeds, a rate near 50% has a standard error of about 3.5 points and a rate near 20% about 2.8. A difference smaller than about two standard errors is reported as "no measurable effect".

**What the overall rating counts.** The overall (OVR) is a weighted mean of each position's attributes (`src/data/personnel.js` `POSITION_WEIGHTS`):

| Position | OVR weights |
|---|---|
| QB | accuracy 3, awareness 3, arm 2, agility 1, speed 1 |
| RB | speed 3, agility 3, strength 2, awareness 2, catching 1, blocking 1 |
| WR | speed 3, catching 3, agility 2, awareness 1, strength 1 |
| TE | catching 2, blocking 2, strength 2, speed 1, agility 1, awareness 1 |
| OL | blocking 4, strength 3, awareness 1, agility 1 |
| DL | strength 3, tackling 2, agility 2, speed 1, awareness 1 |
| LB | tackling 3, awareness 2, speed 2, strength 1, coverage 1 |
| CB | coverage 3, speed 3, agility 2, awareness 1, catching 1 |
| S | coverage 2, awareness 2, speed 2, tackling 2, catching 1 |
| K | kicking 6, awareness 1 |

**Durability appears in no position's overall.**

## Results, attribute by attribute

Each row is the trial's main measure at 30 / 50 / 65 / 80 / 95.

### Speed: the strongest attribute in the game

| Trial | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| WR go route, ball forced: yards per throw | 9.3 | 9.7 | 14.6 | 19.8 | **23.8** |
| WR go route: separation when the ball arrives (yd) | 0.96 | 1.55 | 2.49 | 3.86 | 5.73 |
| WR go route: interceptions | 13.5% | 9.5% | 4.5% | 2.0% | 0.5% |
| RB outside zone: yards per carry | 3.9 | 5.2 | 6.2 | 9.0 | **9.6** |
| RB outside zone: 15+ runs | 0% | 1.5% | 7.0% | 21.0% | 12.5% |
| CB man on a go route: completion allowed | 47% | 41% | 37.5% | 27.5% | 27.5% |
| S and LB pursuit of an outside zone: yards allowed | 10.9 | 8.9 | 6.2 | 4.9 | **3.8** |
| **DL pass rush: seconds to pressure** | 2.47 | 2.57 | 2.55 | 2.52 | 2.50 |
| **DL pass rush: sack rate** | 26.5% | 26.5% | 30.0% | 25.0% | 28.0% |

- **Speed is the most valuable attribute for WR, RB, CB and S.** It moves yards per play by 2.5 times from low to elite, with little diminishing return.
- **The diminishing returns that do show:**
  - RB yards flatten above 80 (9.0 to 9.6);
  - CB completion allowed flattens above 80.
- **Speed does nothing for a DL pass rusher.** There is no change in time to pressure or sack rate from 30 to 95, yet it carries weight 1 in the DL overall.

### Agility

| Trial | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| RB inside zone: yards | 4.00 | 3.94 | 4.32 | 5.11 | 5.87 |
| RB inside zone: jukes | 1.5% | 5.5% | 8.5% | 14% | 22% |
| QB vs all-out blitz: escapes | 35.5% | 45% | 45.5% | 58.5% | 60% |
| QB vs all-out blitz: sacks | 78% | 71.5% | 70.5% | 67% | 63% |
| WR curl: separation at 2.0 s | 1.28 | 1.65 | 1.70 | 2.45 | 2.45 |
| **WR curl, ball forced: completion** | 71% | 72.5% | 71.5% | 72% | 62.5% |

- **Agility works for RB elusiveness and QB escapes.** It only starts to matter above 65.
- **It gives a WR separation but not catches.** Separation on the curl rises, while forced-ball completion is flat and even lower at 95.

### Strength

| Trial | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| OL pass protection (blocking fixed 65): sacks | 33% | 33% | 30% | 25.5% | 20% |
| DL vs two blockers: sacks | 24% | 26% | 30% | 32.5% | 35.5% |
| RB inside zone: broken tackles | 3.5% | 5% | 9% | 17% | 31.5% |
| LB and S vs inside zone (tackling 65): yards allowed | 4.95 | 4.69 | 4.32 | 4.15 | 4.02 |

Strength has a steady, moderate effect on the line and on the ball-carrier, with no plateau.

### Awareness

| Trial | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| RB inside zone (vision): yards | 4.21 | 4.47 | 4.32 | 4.36 | 4.26 |
| RB power: yards | 6.68 | 6.76 | 6.84 | 6.96 | 7.09 |
| RB toss: yards | 3.40 | 3.53 | 3.42 | 3.52 | 3.61 |
| RB vs cover 2 zone: yards | 5.70 | 5.75 | 5.98 | 5.99 | 5.86 |
| RB outside zone: yards | 5.72 | 5.81 | 6.24 | 6.46 | 6.47 |
| RB flat route: yards after the catch | 9.47 | 8.98 | 9.06 | 9.58 | 9.94 |
| LB and S vs inside zone: yards allowed | 5.70 | 4.61 | 4.32 | 3.74 | 4.02 |
| LB vs outside zone: jukes allowed | 20.5% | 11% | 10.5% | 6% | 7% |
| **LB vs play-action post: completion allowed** | 37% | 34.5% | 35% | 36% | 34% |
| QB curl/flat read: completion | 80.5% | 77.5% | 80% | 82% | 76% |
| QB curl/flat read: decision time (s) | 1.69 | 1.63 | 1.60 | 1.55 | 1.50 |

- **Ball-carrier awareness ("vision") has almost no measurable effect** in six run trials. The largest gain from 30 to 95 is 0.75 yards (outside zone) or 0.4 (power); the others are flat.
  - Awareness is weight 2 of 12 in the RB overall, so an RB's overall overstates what awareness gives him.
  - Task 10's QB audit found awareness does lower QB sacks and bad reads, so the QB weight is justified.
- **Linebacker run recognition works** (yards allowed fall by 1.4 from 30 to 80). It does **not** help against play-action: the "bite on the fake" never changes.
- **Diminishing return:** LB run defence is best at 80, not 95 (3.74 against 4.02 yards allowed; within noise).

### Catching

| Trial | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| WR open curl, ball forced: completion | 57% | 65.5% | 71.5% | 75.5% | 81% |
| WR contested go: completion | 35% | 37.5% | 43% | 47% | 48% |
| RB ball security: fumbles per carry | 2.0% | 1.5% | 1.0% | 1.0% | 1.0% |
| **CB ball forced into his coverage: interceptions** | 0.5% | 0.5% | 0.5% | 1.0% | 1.0% |

- **Catching is a strong, linear receiver attribute.**
- **It does nothing for a defender's interceptions.** A cornerback with 95 Catching intercepts 1 ball in 100 forced into his coverage, the same as at 30. Catching is in the CB (weight 1) and S (weight 1) overall.

### Arm and Accuracy (QB)

| Trial | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| Arm, go route forced: flight time (s) | 2.37 | 2.00 | 1.79 | 1.61 | 1.44 |
| Arm, go route forced: completion | 27% | 25.5% | 28.5% | 27% | 31.5% |
| **Arm, real read on three verticals: yards per dropback** | 2.89 | 5.83 | **10.77** | 9.36 | 9.00 |
| Arm, real read: sacks | 16.5% | 10% | 2% | 3% | 3.5% |
| Accuracy, short curl forced: completion | 58% | 69% | **71.5%** | 68.5% | 67% |
| Accuracy, deep go forced: completion | 20.5% | 32% | 37.5% | 39.5% | 44% |

- **Arm is a threshold attribute.**
  - Below about 65 the QB will not attempt the deep read, takes more sacks and gains a third of the yards.
  - Above 65 extra Arm only shortens flight time and adds nothing to completion or yards: 9.0 yards at 95 against 10.8 at 65.
- **Short accuracy saturates at about 65**, where completion stops rising (71.5%, 68.5%, 67%, within noise). Deep accuracy keeps rising.

### Blocking

| Trial | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| Run blocking (guards and TE, inside zone): yards per carry | 1.77 | 2.63 | 4.32 | 5.88 | **7.67** |
| Run blocking: stuffed at ≤1 yard | 75.5% | 63.5% | 42.5% | 21.5% | 10.5% |
| Pass protection: sacks | 37.5% | 34% | 30% | 24.5% | 20.5% |

**Run blocking is the second most powerful attribute in the game**, after speed: a 4.3 times swing in yards per carry from low to elite, with no plateau. It is correctly the heaviest OL weight.

### Tackling

| Trial | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| LB and S: broken tackles allowed | 28% | 14.5% | 9% | 6.5% | 6% |
| CB open field: broken tackles allowed | 57% | 33% | 22% | 15.5% | 10.5% |
| **DL sack attempt: sacks completed** | 69.5% | 67.5% | 70.5% | 72.5% | 70.5% |

- **Tackling has a strong effect in the open field, and a clear diminishing return above 80.**
- **DL Tackling does not convert sacks.** This was already open as F-10 in the Task 10 matrix and is still open; Tackling is weight 2 in the DL overall.

### Coverage

| Trial | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| CB man: completion allowed | 43% | 39.5% | 37.5% | 32.5% | 26% |
| CB man: interceptions | 0.5% | 2.5% | 4.5% | 6.0% | 8.0% |
| CB on a breaking route: completion allowed | 77.5% | 74.5% | 75% | 67% | 66.5% |
| **Safety in zone: completion allowed** | 80% | 80% | 80% | 80% | 80% |
| Safety in zone: yards allowed | 5.51 | 4.99 | 5.01 | 5.06 | 4.91 |

- **Man coverage works.**
- **Zone coverage by a safety has no effect at all on completion** (80.0% at every level). Coverage is the safety's heaviest overall weight (2 of 9).

### Durability (not in any overall)

| Measure | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| Injury per game | 5.8% | 5.1% | 4.8% | 3.8% | 3.0% |
| Fatigue gained per game | 25.6 | 23.6 | 21.5 | 20.5 | 18.5 |

Durability halves injury risk from low to elite and cuts fatigue by a quarter. It also feeds in-game injury odds (`src/sim/substitutions.js`). Because it is in no overall, it is **invisible to every decision that ranks by overall**, including the depth chart.

### Kicking

| Measure | 30 | 50 | 65 | 80 | 95 |
|---|---|---|---|---|---|
| FG from 35 | 67% | 72% | 75.7% | 79.5% | **83.2%** |
| FG from 45 | 42.7% | 51.6% | 58.2% | 64.8% | 71.4% |
| FG from 52 | 3% | 37.3% | 45.9% | 54.6% | 63.2% |
| Punt average | 38.0 | 40.9 | 43.4 | 45.9 | 47.9 |
| Kickoff touchbacks | 5.4% | 19.4% | 34.3% | 55.1% | 72% |

Kicking scales cleanly. **Even an elite kicker misses one 35-yard kick in six**, and the extra point (32 yards) is about 84% for an average kicker. That is the cause of the 83.6% extra-point rate in `GAMEPLAY_BALANCE.md`.

## Findings

| # | Finding | Severity | Evidence |
|---|---|---|---|
| A-1 | **Speed dominates.** It is the largest single driver of yards for WR and RB, and of yards allowed for CB and S, with little diminishing return. Together with blocking, it decides most plays. | Medium (design) | Speed and blocking tables above |
| A-2 | **Five attribute uses in the overall formula have no measurable effect:** DL Speed (pass rush), DL Tackling (sack completion), CB/S Catching (interceptions), S Coverage (zone completion), RB Awareness (run vision). An overall built on them overstates those monsters. The depth chart ranks by overall (`roster.js` `buildDepthChart`), and so do the other decisions that read it. | **High** | Tables above |
| A-3 | **Durability matters but is in no overall.** Injury risk falls from 5.8% to 3.0% per game from 30 to 95, and fatigue by about 28%. | Medium | Durability table |
| A-4 | **Arm is a threshold, not a scale.** It is decisive up to about 65, then adds nothing to completion or yards. It is weight 2 in the QB overall. | Low | Arm table |
| A-5 | **Short accuracy saturates at about 65.** | Low | Accuracy table |
| A-6 | **Tackling** (above 80) and LB **awareness** (above 80) show clear diminishing returns. That is desirable, and intended. | — | — |
| A-7 | **Play-action ignores defender awareness**: completion allowed is 37% at 30 and 34% at 95. | Low | LB play-action table |

**Do overall ratings represent on-field effectiveness?** Broadly yes for QB, WR, OL and CB. Not for:
- DL, whose overall includes speed and tackling, neither of which affects the pass rush;
- S, whose overall includes coverage, which does nothing in zone;
- RB, whose overall includes awareness, which is nearly inert.

`POSITIONAL_BALANCE.md` measures this at team level with the position-leverage study. The proposed correction is in `RECOMMENDED_CHANGES.md` (R-3).

**Extreme combinations.** No single attribute creates a break on its own. The biggest compound is speed plus blocking on a run play: blocking 95 alone lifts inside zone to 7.7 yards, and speed 95 alone lifts outside zone to 9.6. Together they are the source of the 10-yard run plays in `GAMEPLAY_BALANCE.md` §3. This audit did not run combined sweeps.
