# Gridiron Beast: final balance calibration and follow-up report

**Branch:** `impl/balance-audit-2026-11` (PR #191). **Date:** 2026-11-26. **Status:** implemented, investigated and tested with targeted
tests; **not merged, not released, no release version stamped.**
Every number was measured on this branch unless labelled otherwise. Phone and desktop timings are **emulated** in headless Chromium
(phone = 390 px, touch, CPU throttled 4×), not real devices. **The full fast and simulation suites were not run** (section 10).
Evidence files: `reports/balance-impl/followup/`. Tools are listed with each result so every number can be reproduced.

---

## 1. Executive summary

**Implemented (A-1 to A-5, all completed):**
- **A-1:** Gym Leader clubs on Rookie now use Rookie quality. Rookie and Pro separate a little more (2 points at season 15, was 0.9) but
  still converge. Options are listed; none implemented.
- **A-2:** Golden Boot and Return King awards added beside STBOY, with participation minimums, per-attempt measures and no Hall of Fame
  double counting.
- **A-3:** A club with no available kicker plays on: no field goals, punts or kicked extra points; two-point tries; kickoffs replaced by
  the receiver at its own 20. No forfeit for a missing kicker. One rule conflict is reported (the offseason gate still requires a K).
- **A-4:** Scheme-fit thresholds ship as a fixed table, identical to the derivation (18,000 fits compared). It removes about 1.2–1.5 s of
  work from the first fit after load. The browser reopen time is in section 9.
- **A-5:** Intermediate evidence directories removed after their findings, seeds and commands were preserved; `M6_STATUS.md` marked as a
  closed historical record; GDD §61.13 written.
- **Play-test fix (owner, 2026-11-26):** a called two-point play is now the play that runs (section 7.4).

**Most important findings:**
1. **The Clash "ability effect" used until now overstated how weak abilities are.** It switched every monster's ability off at once.
   Measured alone, only two of the four legendary signatures hurt their side: **Root Communion −7.4** and **Eye of the Storm −4.5**.
   Deep Winter (−0.2) and Eclipse Theft (+0.6) are neutral. All 11 rarely-triggered abilities are neutral (−0.45 to +0.65). Foresight
   (−1.6) is the one remaining real negative, entirely in matchups against status-applying beasts. Section 6.
2. **Salary cap:** 1.4 M fails at league creation (every club over the cap). 1.5 M puts half of all club-seasons within 50,000 of the
   cap and drives elite monsters out. **1.6 M is the only workable candidate**; section 3 has its 15-season validation.
3. **Sacks are low because the ball comes out in about 1.8–1.9 seconds and only about one pressure in ten becomes a sack**, not because
   rushers fail to beat blockers (they do so on 55% of snaps, first at about 1.1 s). Personnel matters strongly: an elite DL gives
   4.9% sacks, an elite OL 1.0%. Section 5.
4. **Counter is the real playbook outlier:** 12.8 yards a carry against the AI's own calls, double an average run (6.6). Draws work
   against man coverage and lose to blitzes, which is a coherent purpose. Section 7.
5. **Roster depth does not pay at constant real payroll**, because starters miss only about 2.5 games a season and fatigue clears
   every week. Heavy rotation costs about a win a season. Section 8.

**Owner decisions needed:** section 12.

---

## 2. A-tracker

| Item | Status | What was done | Measured result | Tests (targeted) |
|---|---|---|---|---|
| A-1 Rookie gym quality | **Completed** | `difficultyQuality` returns the difficulty's quality for every club; aiDev 0.6/1.0/1.5 unchanged; no attribute ceiling | Rookie gym generated arrivals 38.1 → 33.8 overall; Rookie–Pro AI overall gap at S1/5/10/15: 2.7 / 2.9 / 1.5 / 1.9 (was 2.2 / 2.5 / 1.4 / 0.9) | task8-identities (updated) |
| A-2 Golden Boot, Return King | **Completed** | Two awards beside STBOY; minimum participation; per-attempt main measures; hub, review, profiles, timeline, news, history; Hall weight 5, one special-teams honour per season counted | 15 seasons: Golden Boot always a K, Return King always a returner, pools 16–26; STBOY coincided with one of them every season | 41 of 41 (special-teams-awards new, task10-honour-ledger, preleague-history, monster-hof-voting) |
| A-3 No available kicker | **Completed; one conflict reported** | No FG/punt/PAT kick; 4th down goes; two-point try; kickoffs and free kicks replaced at the receiver's 20 with no clock, dice or stats; no forfeit for K alone; AI follows; UI notes | Whole games with one kickerless club finish with no forfeit and no kicks | no-kicker (new, 7); 52 related files, 289 results, 0 failures |
| A-4 Fixed scheme-fit table | **Completed** | `FIT_THRESHOLD_TABLE`, equality test, `tools/fit-thresholds.mjs` check / `--write` | 18,000 fits hash-identical; first fit in Node 1,182–1,454 ms → 0 ms; browser in section 9 | fit-thresholds (new); 155 of 155 related |
| A-5 Cleanup | **Completed** | Intermediate directories removed after preserving findings (section 11); M6_STATUS fixed; GDD §61.13 | — | — |
| Play test: two-point call | **Fixed** | The called play runs on a two-point try | New test fails on the old code (called Trap, ran Power Left) | 40 of 40 |

---

## 3. Salary cap comparison (I-1; investigation only, nothing changed)

**Method.** `tools/balance-audit/cap-experiment.mjs` overrides the Challenger cap **in the run's own process** (no game file changes) and
runs the standard benchmark: Pro, hands-off "repair" owner, board content, seeds 3 and 4. Exploratory runs: 5 seasons at each cap.
Validation: 15 seasons for the configuration that survived. Analysed with `tools/balance-audit/cap-analyze.mjs`. The elite salary curve
is unchanged throughout. AI usable cap = cap − 405,000 staff allowance.

### 3.1 Exploratory (5 seasons, 2 seeds; per AI club-season unless stated)

| Measure | 1.8 M (control) | 1.6 M | 1.5 M | 1.4 M |
|---|---|---|---|---|
| Utilisation of usable cap, mean / median | 76% / 76% | 89% / 89% | 95% / 96% | 98% / 98% |
| Tightest club's room, mean per season | 205,700 | 33,500 | 10,200 | 500 |
| Club-seasons within 50k / 100k of the cap | 0% / 0% | 7% / 26% | 51% / 91% | 88% / 98% |
| AI signing bonuses (10 seasons) | 1 | 9 | 15 | 26 |
| Free-agent signings contested | 57% | 58% | 58% | 72% |
| Releases per season (veterans 29+) | 20 (0.8) | 20.5 (0.9) | 23.9 (3.4) | 29.2 (10) |
| Elite (75+) monsters lost to money per season | 0.4 | 1.6 | 4.9 | 8.2 |
| Young prospects lost to money per season | 2.1 | 3.1 | 4.8 | 7.4 |
| Mean roster size | 37.5 | 37.5 | 37.4 | 35.7 |
| **Payroll-over-cap integrity problems** | **0** | **32** | **192** | **922** |
| AI overall, season 5 | 62.7 | 62.5 | 61.0 | 58.2 |
| Owner win % | 52.9 | 45.0 | 51.4 | 54.3 |
| Owner cap room, minimum | 44,100 | 900 | −65,100 | −65,600 |

**Eliminated:**
- **1.4 M:** every AI club is founded over the cap (founding rosters are generated for the current economy, not sized to the cap), so
  the league is illegal from creation; AI strength drops 4.5 points by season 5 and eight elite monsters a season leave for money.
- **1.5 M:** half of all club-seasons sit within 50,000 of the cap, AI clubs repeatedly carry payroll over the cap in season, the owner's
  club goes over, and 89% of elite departures are money-driven (4.9 a season).

**Kept for validation: 1.6 M.** It is the only setting that makes the cap matter (26% of club-seasons near it, nine bonuses, more
elite turnover) without breaking legality broadly. Its 32 problems are one club per seed founded about 44,000 over the cap and carried
through season 1; see 3.2.

### 3.2 15-season validation (1.6 M against the 1.8 M control, same seeds, same code)

VALIDATION_TABLE

### 3.3 Recommendation (not implemented)
CAP_RECOMMENDATION

---

## 4. Difficulty and Gym Leaders (A-1, M-2)

**Method.** 15 seasons, seeds 3 and 4, repair owner; `tools/balance-audit/difficulty-study.mjs`. Rookie and Pro were run on the current
code (A-1 to A-4 included). All-Star and the "before A-1" Rookie are the round-2 runs (before A-1 and A-3; A-3 only changes games in
which a kicker is unavailable, so All-Star is close but not identical). Two seeds: treat title counts as indicative.

| AI overall (mean of seeds) | S1 | S5 | S10 | S15 |
|---|---|---|---|---|
| Rookie after A-1 | 50.0 | 59.8 | 61.7 | 61.4 |
| Rookie before A-1 | 50.7 | 60.2 | 62.2 | 61.6 |
| Pro (current code) | 52.7 | 62.7 | 63.2 | 63.3 |
| All-Star (round 2) | 56.9 | 64.0 | 63.8 | 64.2 |
| **Rookie–Pro gap** | **2.7** (was 2.2) | **2.9** (2.5) | **1.5** (1.4) | **1.9** (0.9) |

| | Rookie after A-1 | Rookie before | Pro | All-Star |
|---|---|---|---|---|
| Gym − ordinary overall, S1 / S15 | 3.8 / 0.6 | 5.7 / −0.6 | 4.8 / 0.5 | 3.7 / 0.9 |
| Gym titles (of 30) | 25 | 21 | 21 | 24 |
| Owner win % (repair owner) | 44.8 | 49.0 | 38.8 | 26.2 |
| Generated arrivals' overall, gym / ordinary | 33.8 / 37.5 | 38.1 / 39.1 | 39.4 / 39.6 | 40.9 / 42.8 |
| Development, overall per season (age 19–23 / 28+) | 1.8 / 0.2 | 1.8 / 0.2 | 2.0 / 0.0 | 2.2 / −0.3 |

**Findings:**
- **A-1 did what it was meant to:** Rookie gyms now receive Rookie-quality arrivals (33.8, below ordinary clubs' 37.5, because gyms
  replenish more often), and their season-1 head start fell from 5.7 to 3.8 points.
- **Rookie still converges with Pro.** The gap is wider than before at every snapshot but only 1.5–2.9 points. Development rates per age
  are almost the same on both difficulties, because AI development is mostly bounded by each monster's attribute ceilings, not by the
  rate. Rookie is still clearly easier for the owner (44.8% against 38.8%).
- **Gym titles on Rookie rose (21 → 25 of 30)** even though gyms got weaker. With two seeds this is within noise (titles follow the
  ageless signature legendaries, as R-19 found). No gym nerf was made (M-2).

**Options if the owner wants more separation (none implemented):**
- **(a)** Lower Rookie `aiDev` further (0.6 → 0.4): cheap, but the ceiling still binds later; expect a smaller late effect.
- **(b)** Lower Rookie founding and replenishment quality further (−4 → −7): acts at every snapshot, including late (replenishment).
- **(c)** Give Rookie AI clubs a lower development ceiling share. Excluded by this brief (no Rookie ceilings); listed only for completeness.
- Recommended next step: (b), measured with the same tool on seeds 3 and 4.

---

## 5. Pass rush (I-2; investigation only)

**Method.** `tools/balance-audit/pass-rush-study.mjs`: single dropback passes on the production engine (24 dropback passes × 8 defences,
including 2 blitzes × 16 club pairs × 4 seeds = 12,288 snaps a scenario). "Elite" = the same monsters with +20 on every attribute
(capped 99), because the team generator clamps quality. Developed league = generated quality 62; new league = 52. Pressure is the engine's
own definition (a rusher changed a throw or made a sack). **Completion in these isolated snaps is 34–41%, well below the 59–64% of full
games, so read the table for comparisons between scenarios, not as game rates.**

| Developed league | Sack % | Pressure % | Time to throw (s) | First shed (s) | Pressure → sack | Nearest defender to QB at 2.0 s (yd) | Blitz sack % |
|---|---|---|---|---|---|---|---|
| Average v average | 2.0 | 18.2 | 1.88 | 1.11 | 10.9% | 4.9 | 3.9 |
| Elite OL v average DL | 1.0 | 19.2 | 1.87 | 1.29 | 5.2% | 4.3 | 2.5 |
| Average OL v elite DL | 4.9 | 31.2 | 1.80 | 0.88 | 15.8% | 4.3 | 7.1 |
| Elite QB v average rush | 0.8 | 15.4 | 1.82 | 1.08 | 5.5% | 5.0 | 1.9 |
| Average QB v elite rush (DL+LB) | 5.2 | 32.5 | 1.80 | 0.89 | 16.2% | 4.2 | 7.8 |
| Elite v elite | 1.6 | 25.2 | 1.77 | 1.03 | 6.5% | 4.6 | 3.5 |

New league (quality 52): average 1.8% sacks, elite DL 5.2%, elite OL 0.8%, elite QB 0.5%. New and developed leagues behave the same.

**Root causes (in order of weight):**
1. **The ball is out fast.** Median time to throw is about 1.8–1.9 s and about half of throws go to the first read. A rusher who beats
   his blocker at about 1.1 s is still 4–5 yards away at 2.0 s.
2. **Pressure rarely finishes.** Only about 1 pressure in 10 becomes a sack: a pressured quarterback in this engine throws "hot" (it has
   no throw-away and no hold-and-take-the-sack behaviour by design) and the throw usually beats the rusher.
3. **Protection is not the limit.** Blockers are beaten on about half of snaps; when a sack does come, about 30% are unblocked rushers.
4. **Blitzes work** (about 3× the base sack rate), so play calling, not rush strength, decides much of the rate.

**Recommendations (none implemented; the brief forbids forcing sacks):**
- If the owner wants more sacks, the honest lever is **quarterback decision time** (how long reads take, especially for low-Awareness
  quarterbacks), not rush speed or a sack probability. That is a QB-model change for owner approval.
- Otherwise accept the current rate: it responds strongly and sensibly to personnel and play calls, which is what a player can act on.

---

## 6. Beast Clash abilities (I-3; investigation only, no ability changed)

### 6.1 The measurement problem
The audit's "ability effect" compared a team's win rate with **all abilities on** against **all abilities off**. That also switches off
every team-mate's and opponent's ability. A new isolation measure switches off **only the focus ability**
(`tools/balance-audit/clash-legendary-options.mjs --variant=X`, loaded through `clash-variant-hooks.mjs` in the run's own process; no
file changes) and compares the same battles with it on and off (`clash-pair.mjs`, paired standard errors). Control: Astral Strike, a
strong legendary, measures +13.4 ± 0.9 alone against +6.3 on the old measure, so the old measure shrank strong and weak abilities alike
toward zero, and its negatives were mostly the other abilities in the battle. Battles: last form, full mastery, random 3 v 3 teams,
3,000 a legendary, 8,000 for the three re-checked abilities, 2,000 for the rare ones.

### 6.2 The four legendary signatures

| | Eye of the Storm | Deep Winter | Eclipse Theft | Root Communion |
|---|---|---|---|---|
| Family / rarity | Tempestra, legendary (Wind) | Glacivern, legendary (Ice) | Nyxshade, legendary (Dark) | Elderoot, legendary (Nature) |
| What it does | Once per Clash, instead of attacking: the foe's ready repeatable signature is restricted for its next 2 turns (ordinary attacks only) | Once, instead of attacking: every enemy already under a harmful status has that status's countdown frozen for 2 of its turns | Once, instead of attacking: steals the foe's Shielded / Guarded / Empowered / Quickened, if its own status slot is empty | Once, instead of attacking, when an ally is at ≤25% HP: all living allies' HP is pooled and spread to the same percentage (total conserved) |
| Activation needs | A foe with a ready, repeatable signature | An enemy with a harmful status | A foe holding a stealable benefit, own slot empty | An ally at ≤25% HP that would gain |
| Battles with no activation | 61% | 97% | 79% | 26% |
| Its ordinary hit (mean damage) | 23.5 | 25.8 | 24.4 | 17.6 |
| Damage per battle / per turn | 96.5 / 21.4 | 138.3 / 25.6 | 117.5 / 23.4 | 79.3 / 15.1 |
| Signature's own damage | none | none | none | none (HP moved, not healed) |
| Share of its turns spent on the signature | 8.7% | 0.6% | 4.1% | 14.1% |
| Old measure (all abilities off) | −11.7 | −9.6 | −8.4 | −10.3 |
| **Alone (this study)** | **−4.5 ± 0.5** | **−0.2 ± 0.15** | **+0.6 ± 0.4** | **−7.4 ± 0.7** |
| Root cause | Spends an attack to deny two turns of a signature; the foe still attacks, so the trade is an attack for part of an attack | Almost never has a target; when it does, freezing a countdown is worth little | Rarely has a target; the steal is worth about the attack it replaces | Spends an attack and gains no HP: moving HP from healthy allies to a low one rarely saves the low one and weakens the others |
| Intentional? | The trade-off is designed; its size is not | Rarity is designed (a combo ability); its emptiness alone is not | Designed as situational; working as such | Unintended: the design assumes redistribution is a gain |

**Options (defined now).** The earlier report referred to A/B/C but **did not write them out**; its only recorded wording was "cast in
addition to the attack, or a stronger effect". They are defined here, and each was measured in-process only:
- **A — No change.** Keep each signature as designed and document it as situational.
- **B — Cast in addition to the attack.** The signature's effect happens and the monster still makes its ordinary attack that turn (once
  per Clash, conditions unchanged).
- **C — Stronger effect, still replaces the attack.** Eye of the Storm 2 → 4 turns; Deep Winter 2 → 4 frozen turns; Root Communion
  threshold 25% → 40%; Eclipse Theft strips the foe's benefit when its own slot is occupied instead of falling back to the attack.

| Win % change of the family's team (paired, same battles) | A | B | C |
|---|---|---|---|
| Eye of the Storm | −4.5 (as now) | ≈ +0.7 (B vs A +5.2 ± 0.5) | ≈ −3.8 (C vs A +0.7 ± 0.3) |
| Deep Winter | −0.2 | ≈ +0.3 (+0.5 ± 0.2) | ≈ 0.0 (+0.2 ± 0.1) |
| Eclipse Theft | +0.6 | ≈ +3.1 (+2.5 ± 0.4) | ≈ +0.7 (+0.1 ± 0.2) |
| Root Communion | −7.4 | ≈ −1.5 (+5.9 ± 0.6) | ≈ −8.7 (−1.3 ± 0.4) |

("≈" = the ability's own value plus the option's measured change; the option runs were paired against the shipped ability.)

**Consequences:**
- **B** turns both harmful signatures roughly neutral (Eye of the Storm slightly positive, Root Communion still slightly negative) and
  makes Eclipse Theft a small genuine plus. It changes what these legendaries feel like (an extra effect, not a choice) and needs Dex
  text, review scenarios and contract tests updated. It does not fix Deep Winter, whose problem is activation.
- **C** barely helps and makes Root Communion worse (triggering earlier means giving up an attack sooner for the same zero gain).
- **A** leaves two legendaries that cost their own team 4–7 points whenever they act.

**Recommendation (not implemented):** **B for Root Communion and Eye of the Storm**; **A for Eclipse Theft and Deep Winter**. Deep Winter's
emptiness is an activation question (it needs a status-applying team-mate) rather than a strength one; if the owner wants it to matter,
that is a design change to its trigger, not to its numbers.

### 6.3 The three re-checked abilities (8,000 battles each)

| Ability | Old measure | Alone | Significant? | Matchup dependence |
|---|---|---|---|---|
| Snowdrift Shelter (Icehorn) | +0.3 | **+2.0 ± 0.4** | Yes, positive | None |
| Unbroken Charge (Boulderox) | −0.8 | **+1.1 ± 0.15** | Yes, positive | None |
| Foresight (Cerebrix) | −3.0 (now −3.4) | **−1.6 ± 0.2** | Yes, negative | All of it: about −7 points against foe teams with a status-applying beast (the only battles where it prepares, 23%); 0 otherwise |

Foresight's remaining loss is a mechanical issue, not noise: when it prepares the mirror it gives up an attack that the reflected status
rarely repays. Options (not implemented): let it prepare only when the status source is the current active foe, or cast it in addition
to the attack (as B above).

### 6.4 The 11 rarely-triggered abilities (2,000 battles each)

| Ability (family) | Purpose | Battles with an activation | Condition | Occurs naturally? | Effect when it fires | Alone | Verdict |
|---|---|---|---|---|---|---|---|
| Bank Shot (stoneguard) | Strike that carries through a shield to a reserve | 7% | Foe active Shielded and has a living reserve | Rarely | 14.9 damage (ordinary 30.2) | −0.3 ± 0.25 | No change; weak hit, rare |
| Iron Bite (ironjaw) | Bite against a shield | 5% | Foe active Shielded (positive pool) | Rarely | 20.4 (ordinary 26.6) | −0.05 ± 0.15 | No change |
| Phase Strike (voltfang) | Damage that bypasses a shield | 6% | Foe active Shielded | Rarely | 30.9 (ordinary 24.8) | −0.25 ± 0.13 | No change |
| Stone Divide (terrabull) | Intercepts an enemy extra strike at a team-mate | 9% | An enemy extra strike (Twin Thunder, Arc Rebound, Riptide Pursuit…) | Sometimes | Protective | +0.6 ± 0.25 | No change |
| Rubble Reprisal (rockram) | Punishes enemy healing | 4% | The enemy active receives HP restoration | Rarely | 17.8 (ordinary 18.6) | +0.45 ± 0.18 | No change |
| Arc Rebound (voltfin) | A dodged attack rebounds at a reserve | 3% | Its ordinary attack evaded by a miss source | Rarely | 14.0 | −0.2 ± 0.14 | No change |
| Spore Detonation (mossclaw) | Consumes the foe's status for a stronger hit | 3% | Foe active has a removable harmful status | Rarely | 20.5 | +0.1 ± 0.14 | No change |
| Shell Renewal (reefclaw) | Answers a harmful status on itself | 10% | A harmful status applied while active | Sometimes | Protective | +0.65 ± 0.21 | No change |
| Fresh Start (snowmoth) | Resets a team-mate's ability cooldown | 8% | A team-mate has a cooldown running | Sometimes | Utility | −0.45 ± 0.25 | No change; watch |
| Lightning Rod (flicker) | Takes a reserve ally's harmful status onto itself | 1% | A reserve ally with a removable status, own slot empty | Rarely | Utility | +0.05 ± 0.05 | Design question (very rare) |
| Clear Light (lumen) | Cleanses an ally instead of attacking | 1% | Another ally with a removable harmful status | Rarely | Utility | +0.1 ± 0.07 | Design question (very rare) |

"Alone" is the change in the family's win % with the ability compared to without it (positive = helps). None needs correcting:
rarity here is situational, not harmful. Lightning Rod and Clear Light fire in about 1% of battles; whether something that rare is worth
keeping is a design choice for the owner. Purposes and conditions are summarised from each module's Dex contract
(`src/clash/abilities/<family>.js`). The status-and-shield abilities fire rarely because few monsters apply statuses or shields in
random teams; on teams built around them they would fire far more.

---

## 7. Playbook (I-4; investigation only, no play retuned)

**Method.** `tools/balance-audit/playbook-situations.mjs`: every play in six situations (1st & 10 own 30; 2nd & 6 midfield; 3rd & 2;
3rd & 8; red zone 1st & 10; 1st & goal at the 3) against four defences each from the playbook's zone, man, blitz, run-front and
goal-line families, plus **AI call**: what the coach AI's own `weighDefense` calls in that situation. 16 club pairs × 3 seeds. Success =
40% of the distance on 1st down, 60% on 2nd, all of it on 3rd. Baseline = 16 ordinary run plays measured the same way.

### 7.1 Yards a carry (success %) on 1st & 10 at the own 30

| Play | vs zone | vs man | vs blitz | vs run front | vs AI call |
|---|---|---|---|---|---|
| Baseline run (16 plays) | 6.7 (51%) | 9.6 (47%) | 5.5 (31%) | 8.2 (39%) | 6.6 (42%) |
| **Counter** | 8.8 (58%) | 14.6 (65%) | 14.3 (59%) | **18.2 (65%)** | **12.8 (65%)** |
| Pistol Counter | 4.6 (42%) | 3.9 (13%) | 7.0 (34%) | 4.2 (17%) | 5.9 (35%) |
| QB Counter | 5.6 (57%) | 5.7 (33%) | 2.8 (23%) | 6.2 (41%) | 3.6 (30%) |
| Jet Sweep | 4.1 (39%) | 4.1 (31%) | 0.8 (12%) | 1.2 (14%) | 2.0 (20%) |
| Empty Jet | 10.7 (67%) | 3.9 (21%) | 4.2 (26%) | 5.1 (35%) | 8.1 (58%) |
| Fly Sweep | 4.1 (37%) | 5.7 (50%) | 1.8 (25%) | 3.4 (42%) | 3.6 (34%) |
| Pistol Stretch | 4.6 (31%) | **15.0 (71%)** | 9.6 (48%) | 13.0 (64%) | 7.3 (34%) |
| QB Draw | 4.8 (48%) | 7.3 (47%) | 0.4 (5%) | 2.6 (22%) | 3.4 (32%) |
| Lead Draw | 2.8 (25%) | 9.2 (38%) | −0.8 (4%) | 3.3 (20%) | 2.1 (19%) |
| Spread Draw | 1.1 (11%) | 12.8 (59%) | −0.8 (3%) | 3.6 (24%) | 1.4 (13%) |
| Empty QB Draw | 3.2 (30%) | 10.2 (74%) | 0.4 (5%) | 2.0 (17%) | 2.1 (21%) |

Full tables for all six situations: `followup/playbook-situations.json`.

### 7.2 Findings
- **Counter is the outlier.** It gains 12.8 against the AI's own calls (baseline 6.6) and, against the run fronts built to stop it, 18.2
  with 38% explosive runs. It is strong in every situation, including 3rd & 2 (86% success against run fronts). This is not a matchup
  play; it is simply better. The R-7 variants moved it by at most 0.4, so it needs a geometry look (its pulling path and the backside),
  not a number.
- **Draws have a coherent purpose:** strong against man coverage (9–13 yards, 47–74% success, because man defenders turn and run with
  receivers), useless against blitzes (−0.8 to 0.4). That is football-correct. What is not: they are also poor against zone (1–5),
  where a real draw does well, because the engine has **no "show pass" phase**: defenders key the carrier at the handoff (about 0.6 s)
  whatever the coverage. Draws therefore lose their purpose against any defence that is not man.
- **Jet Sweep** (2.0 against AI calls) is weak everywhere and collapses against blitzes and run fronts (0.8 and 1.2, with 60–80% of
  carries stopped at or behind the line). It runs into the trips strength of its own formation. **Empty Jet**, the same idea from an
  empty set, works against zone (10.7). The difference is formation, not the play.
- **Fly Sweep** (3.6) is below average, with a clear purpose against man (5.7, 50%); it is not the leader in this study (the earlier game
  study saw it lead because AI play-calling met it with man coverage often).
- **Pistol Stretch** is a man-coverage and run-front beater (15.0 and 13.0) that stalls against zone (4.6). That is a strong but
  legitimate matchup play; against the AI's mixed calls it is about average (7.3).
- **Engine limitation:** 3rd & 2 and 3rd & 8 give identical yardage for the same defence. Down and distance change only the defence
  called and the success threshold, never how defenders play.

### 7.3 Recommendations (no retune made)
1. **Counter:** review its path geometry (owner approval), target near the baseline against run fronts.
2. **Draws:** a "show pass" delay before defenders key the carrier would give draws their real purpose against zone. That is a new
   engine behaviour (owner approval). Without it, leave draws as man-coverage beaters.
3. **Jet Sweep:** either flip the motion away from the trips side or retire it in favour of Empty Jet; owner choice.
4. **Fly Sweep, Pistol Stretch:** no change.

### 7.4 Play-test fix: the called two-point play now runs
On a two-point try the runner narrowed the offence's plays to short-yardage / goal-line / red-zone tags and accepted the coach's call
only if it was in that narrowed list, so any other called play was silently replaced by the AI's pick (usually a run). The filter now
narrows only the AI's own pick; a called play from the plan that can be fielded always runs. AI-only games are unchanged (they pass no
called play). Test `two-point-call` fails on the old code (called Trap, ran Power Left) and passes now.

---

## 8. Roster depth at real payroll (I-5; investigation only, no mechanic changed)

**Method.** `tools/balance-audit/roster-season.mjs` corrects the earlier tool, which held the summed overall constant: each strategy
now holds the **actual payroll** (the elite salary curve) at or below the control's. A season is 14 games plus 2 postseason games
against stronger clubs, with production injuries, game fatigue, practice fatigue and weekly recovery between games; injured monsters drop
out and the rotation fills in. Development is held at zero. 24 seasons a strategy, paired against the same roster unchanged.

| Strategy | Wins vs control (of 16) | Margin a game | Postseason margin a game | Starter games missed / season |
|---|---|---|---|---|
| Thin bench + "starters" rotation* | +0.65 ± 0.30 | +0.87 ± 0.31 | −1.3 ± 1.1 | 2.8 |
| Thin bench (money to starters)* | +0.38 ± 0.18 | +0.45 ± 0.29 | −0.6 ± 0.7 | 2.4 |
| Elite QB | +0.29 ± 0.20 | −0.12 ± 0.29 | −1.1 ± 0.6 | 2.3 |
| Control, "starters" rotation | +0.08 ± 0.31 | +0.40 ± 0.33 | −1.4 ± 1.1 | 2.8 |
| Depth (money to the bench) | −0.35 ± 0.35 | −0.70 ± 0.39 | −3.0 ± 1.1 | 1.9 |
| Superstars (top 3 starters) | −0.63 ± 0.30 | −0.70 ± 0.49 | −2.5 ± 1.4 | 2.2 |
| Control, "heavy" rotation | −1.06 ± 0.41 | −1.67 ± 0.51 | −1.4 ± 1.3 | 3.2 |
| Depth + "heavy" rotation** | −1.15 ± 0.39 | −1.69 ± 0.50 | −1.4 ± 1.3 | 2.8 |

\* These two strategies overspent by about 9,560 (0.8% of payroll): the bench reached its rating floor before the money balanced. They
are slightly flattered. \*\* Its late-season and postseason figures equal the "heavy" control's to two decimals, which is improbable;
treat that row as unverified.

**Findings:**
- **Depth does not pay**, in the regular season or the postseason (−3.0 a game, the largest postseason loss). Starters miss only about
  2.5 games a season, and fatigue returns to about zero every week (a game adds 16–26, practice 8, recovery removes 28), so a deep
  bench rarely plays meaningful snaps.
- **Rotation philosophy matters more than roster shape:** "heavy" rotation costs about one win a season because it plays weaker monsters
  with no fatigue to justify it.
- **Superstars lose slightly** once their real salary premium is paid (−0.6 wins), the correction the brief asked for.
- No strategy is dominant; the spread is about ±1 win in 16. No artificial depth reward exists or was added.

**If the owner wants depth to matter (not implemented):** fatigue that carries across weeks (smaller weekly recovery) or more frequent
short injuries would create the need; both are mechanic changes for owner approval.

---

## 9. Loading (A-4)

LOADING_SECTION

---

## 10. Testing

**The complete fast suite and the complete simulation suite were NOT run** (the brief's instruction). Everything below is targeted.
Nothing here is full regression validation.

| Change | Tests run | Result |
|---|---|---|
| A-1 | `task8-identities` (updated test: gyms on Rookie take Rookie quality) | pass |
| A-2 | `special-teams-awards` (new, 5), `task10-honour-ledger`, `preleague-history`, `monster-hof-voting` | 41 of 41 |
| A-3 | `no-kicker` (new, 7) plus every fast-tier file that touches kicks, fourth downs, tries, lineups or forfeits (52 files) | 289 results, 0 failures (one file's results were reported in both runs after a timeout split the batch) |
| A-4 | `fit-thresholds` (new) and the scheme-fit / generation files | 155 of 155 |
| Two-point call | `two-point-call` (new, 2), `task8-special-plays`, `task8-abilities-light-metal`, `phone-match-polish`, `no-kicker` | 40 of 40 |
| Determinism | A-4: 18,000 scheme fits hash-identical before and after | identical |
| Simulations | All franchise runs: 0 errors; integrity problems only at the experimental caps (section 3) | — |

**Not run:** the full fast tier, the full simulation tier, real-device checks, and an emulated UI walkthrough of the A-3 notes (covered
by logic tests only).

---

## 11. Documentation and repository

- **GDD** (authoritative): §61.13 added (Rookie gyms, Golden Boot and Return King, no available kicker, the scheme-fit table); §61.7
  marked superseded for Rookie gyms; §17.2 forfeit rule amended (the kicker no longer causes a forfeit); §61.8 points to the new awards.
- **`docs/task8/M6_STATUS.md`**: now opens with a status note — Task 8 closed, merged 2026-11-11, its M6 benchmarks superseded by the
  balance audit and §61 — with the original record kept unchanged below it.
- **Intermediate evidence removed** (A-5): `reports/balance-impl/baseline/`, `phase3/`, `phase4/`, `phase5/`, `r0/`, `r1/`, `r4/`, `r10/`.
  Their findings, seeds, configurations and reproduction commands are preserved in `IMPLEMENTATION_LOG.md` (unchanged) and in
  `followup/REPRODUCE.md`; git history keeps the files. Kept: `final/`, `followup/`, `ui/`, `r18-save-audit-seed3.json`, both reports.
- **New tools** (observation only): `cap-experiment.mjs`, `cap-analyze.mjs`, `difficulty-study.mjs`, `pass-rush-study.mjs`,
  `playbook-situations.mjs`, `clash-legendary-options.mjs`, `clash-variant-hooks.mjs`, `clash-pair.mjs`, `roster-season.mjs`,
  `fit-thresholds.mjs`. None changes game behaviour (M-3); the cap and Clash variants act only inside their own process.
- Published file count unchanged at 512; no new `src` file.

---

## 12. Owner decision matrix

| Decision | Finding | Option A | Option B | Option C | Recommended | Reason |
|---|---|---|---|---|---|---|
| Salary cap | DECISION_CAP_FINDING | Keep 1.8 M | 1.6 M with cap-aware founding | 1.5 M | DECISION_CAP_REC | DECISION_CAP_REASON |
| Rookie difficulty | Rookie–Pro gap 1.5–2.9 points; converges | Accept | Lower Rookie founding/replenishment quality (−4 → −7) | Lower Rookie aiDev (0.6 → 0.4) | B, measured first | Acts at every season including late |
| Pass rush | 2% sacks: fast release, pressure rarely finishes | Accept | Longer read times for low-Awareness QBs | — | A (or B if a higher rate is wanted) | Rate responds to personnel and calls; forcing is ruled out |
| Root Communion | −7.4 alone | Keep | Cast in addition to the attack | Trigger at 40% | B | Only option that removes most of the loss |
| Eye of the Storm | −4.5 alone | Keep | Cast in addition to the attack | 4 turns | B | B ≈ +0.7; C barely moves it |
| Deep Winter | −0.2; fires in 3% of battles | Keep | Cast in addition | 4 frozen turns | A | Harmless; rarity is its issue, not strength |
| Eclipse Theft | +0.6 | Keep | Cast in addition | Strip when slot full | A | Already neutral |
| Foresight | −1.6, all against status sources | Keep | Prepare only vs the active foe's status | Cast in addition | B | Targets the mechanical cause |
| Counter | 12.8 yd against AI calls (baseline 6.6) | Keep | Geometry review | — | B | Outlier in every situation |
| Draws | Good vs man, dead vs zone and blitz | Keep | "Show pass" delay (engine) | — | A for now | B is a new engine behaviour |
| Jet Sweep | 2.0 yd; collapses vs blitz/run front | Keep | Flip the motion | Retire for Empty Jet | B | Keeps the play, fixes the formation clash |
| Depth | Does not pay at real payroll | Accept | Carry-over fatigue | More short injuries | A | Rotation already gives a real choice; B/C are mechanics changes |
| Offseason K gate (A-3) | The gate still requires a K although a missing K no longer forfeits | Keep the gate | Make a missing K a warning only | — | A | A K remains a real roster need; the gate keeps owners from forgetting one |
| Lightning Rod, Clear Light | Fire in ~1% of battles, harmless | Keep | Widen triggers | — | A | Design call; balance-neutral |
