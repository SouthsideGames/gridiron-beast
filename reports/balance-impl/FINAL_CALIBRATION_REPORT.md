# Gridiron Beast: Final Balance Implementation and Calibration

Branch `impl/balance-audit-2026-11`, PR #191. Not merged and not released.

The evidence is in `reports/balance-impl/final-cal/`. The code was measured at 230e3ba. The "before" code is 4b6ea6f, the follow-up state before this brief.

**Production and experiments are kept apart:**
- **Production changes:** F-01, F-04, F-05, F-08, F-10, F-11, F-12 and F-14.
- **Experiments only:** F-02, F-03 and F-13. They run through test hooks (`tools/balance-audit/*-hooks.mjs`). Production values are unchanged until the owner approves a value.

## 1. Executive summary

- **Salary cap (F-01).** The new cap is 1.6 M, with cap-aware founding.
  - Every seed founds legally: **0** over-cap problems in 120 club-seasons-worth of 15-season runs. The follow-up's 1.6 M runs had 32 season-1 problems.
  - AI clubs use 90–92% of their usable cap, and about 39–60% of club-seasons end within 100,000 of it.
  - AI strength, roster sizes (mean 36.7, minimum 28–30) and the spread of titles are unchanged from 1.8 M.
  - Existing saves keep 1.8 M. Three migration policies are proposed (section 3.4). Nothing is implemented for them.
- **Rookie difficulty (F-02, experiment).** −7 raises the hands-off benchmark owner from **35.7% to 50.0%** wins, and 11 playoff seasons against 8. That is the closest any difficulty gets to its reference band. Development rates are unchanged.
  - Under the 1.6 M cap, all four difficulties sit below their bands with this owner: Rookie −7 50.0, Pro 36.0, All-Star 21.9.
  - The benchmark owner never manages money. Treat the bands as a ceiling a real owner can reach, not a measure of the cap.
  - **Recommendation: adopt −7.**
- **Quarterback Awareness (F-03, experiment).** Making read time depend more steeply on Awareness (up to 2.5× the current slope) changes almost nothing: sacks −0.1 pp at Awareness 95, time to throw −0.02 s.
  - Awareness already matters a great deal through recognising pressure and escaping. At the current slope, sacks run 5.1% of dropbacks at Awareness 30 against 1.3% at 95.
  - **Recommendation: do not adopt.**
- **Beast Clash, measured as the ability's own effect on its family's win rate (paired battles):**
  - **Eye of the Storm** (F-05): −4.5 → **+0.4** pp. Fixed.
  - **Root Communion** (F-04): −7.4 → **−1.5** pp. Mostly fixed.
  - **Foresight** (F-08): −1.6 → **−1.45** pp. Not fixed. Only 14% of its preparations ever intercept anything.
  - The unchanged abilities are unchanged: Deep Winter and Eclipse Theft replay 99% of their battles identically.
- **Playbook:**
  - **Counter** (F-10) is no longer an outlier: 12.8 → 11.3 yards against AI calls, 18.2 → 13.0 against run fronts.
  - **Draws** (F-11) gain against zone and man.
  - **Jet Sweep** (F-12) improves (2.0 → 3.0 against AI calls) but is still stuffed by run fronts and blitzes.
  - **One test failure** follows from F-10: Awareness no longer helps defenders recover against the Counter. Owner decision D-4.
- **Roster study (F-13).** The study's errors are corrected. With carry-over fatigue up to four times stronger, depth still does not pay: a thin bench stays about +3 wins, deep rosters −1.6 to −2.0. **Recommendation: keep production recovery.**
- **Kicker (F-14).** A missing kicker is now a warning, never a blocker.
- **Football, 500-game study, same seed:** points 12.51 → 12.50, completion 52.3% → 52.3%, sacks 3.3% → 3.3%, third downs 34.1% → 33.6%, 0 forfeits.
- **Published game files:** still **512**.
- **The full fast and simulation suites were not run** (as the brief says). Targeted tests are in section 11.

## 2. Implementation tracker

| # | Decision | Status | Where |
|---|---|---|---|
| F-01 | $1.6 M cap with cap-aware founding | **Implemented** (new franchises; older saves keep 1.8 M pending section 3.4) | `league.js` `tierCap`/`LEGACY_TIER_CAPS`/`CAP_ERA`; `franchise.js` `foundWithinCap`, `creationCapSettle` |
| F-02 | Rookie quality −7, development rates retained | **Experiment** (hook `CAL_ROOKIE_Q`); production −4 | `calib-hooks.mjs`, section 4 |
| F-03 | Awareness-based QB read times | **Experiment** (hook `qbk`); production unchanged | `qb-read-hooks.mjs`, section 5 |
| F-04 | Root Communion casts in addition to the attack | **Implemented** | `clash/abilities/elderoot.js` |
| F-05 | Eye of the Storm casts in addition to the attack | **Implemented** | `clash/abilities/tempestra.js` |
| F-06 | Deep Winter unchanged | Unchanged, verified (99.0% identical battles) | section 6 |
| F-07 | Eclipse Theft unchanged | Unchanged, verified (98.4% identical battles) | section 6 |
| F-08 | Foresight prepares only against the active foe's status threat | **Implemented** | `clash/abilities/cerebrix.js` |
| F-09 | Lightning Rod, Clear Light unchanged | Unchanged | — |
| F-10 | Counter geometry | **Implemented** (B gap) | `playbook.js` |
| F-11 | Draw show-pass deception (targeted) | **Implemented** (4 draws, `show` 0.9 s) | `engine.js`, `playbook.js`, `reserve/offense-runs.js` |
| F-12 | Flip the Jet Sweep motion | **Implemented** | `playbook.js` |
| F-13 | Correct roster-study errors; test carry-over fatigue | **Study corrected**; fatigue an **experiment** (`--recovery`); production unchanged | `roster-season.mjs`, section 8 |
| F-14 | Offseason kicker: warning, not blocker | **Implemented** | `franchise.js` `lineupGate`/`lineupCheck`, `fa-ui.js`, `hq.js` |

Two side fixes were exposed by this work:
- **AI trade news:** the consideration was being saved as finished wording, which failed `text-never-decides`. It is now saved as data and worded when shown. This came up because the 1.6 M cap brings AI pick trades into the test season.
- **Clash replays:** a replay re-runs the stored battle on today's rules. When the rules changed after the battle was played, the replay now says so; the stored result is never rewritten.

## 3. Salary cap

### 3.1 What changed
- The Challenger cap is 1,600,000. The Vanguard and Sovereign tiers are unused and keep their ratios: 2.3 M and 3.2 M.
- The salary curve, the staff allowance (405,000) and AI signing bonuses are unchanged.
- **Founding.** A generated club drops its least valuable reserves until it fits its usable cap. Starters, package players and protected monsters always stay, and no club goes below the roster minimum. The creation draft settles the same silent way.
- Gym clubs keep their advantages: gym minus ordinary club overall at season 1 is +4.8 on Pro (follow-up +4.8).

### 3.2 Results (15 seasons, seeds 3 and 4, the hands-off "repair" owner; `cap-analyze.mjs --cap=1600000`)

| | Rookie −4 | Rookie −7 | Pro | All-Star | Follow-up Pro, 1.8 M |
|---|---|---|---|---|---|
| Usable-cap utilisation, mean | 89.8% | 89.7% | 90.8% | 92.1% | 79% |
| Club-seasons within 50k / 100k of the cap | 14 / 39% | 13 / 40% | 19 / 48% | 25 / 60% | 0 / 0.8% |
| Legality problems / over-cap rows | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 | 0 |
| AI signing bonuses (30 seasons) | 18 | 12 | 17 | 20 | 1 |
| Elite (75+) monsters lost to money, per season | 2.9 | 2.9 | 3.8 | 3.9 | 1.8 |
| Young prospects lost to money, per season | 2.5 | 2.3 | 2.6 | 3.3 | 1.5 |
| Releases per season (veterans) | 13.5 (1.0) | 13.8 (0.8) | 13.6 (1.3) | 15.6 (1.4) | 11.9 (0.7) |
| Roster size, mean (min) | 36.8 (28) | 36.8 (28) | 36.7 (30) | 36.7 (30) | 36.9 (30) |
| AI overall at S1 / S5 / S10 / S15 | 49.9 / 59.5 / 60.8 / 60.4 | 48.8 / 59.3 / 61.1 / 61.0 | 52.7 / 62.3 / 62.5 / 62.9 | 56.7 / 63.5 / 63.0 / 64.0 | 52.7 / 62.7 / 63.2 / 63.3 |
| Distinct champions / most titles by one club | 14 / 5 | 17 / 5 | 13 / 9 | 13 / 6 | 15 / 8 |
| Owner cap room, mean / minimum | 45,600 / 600 | 44,200 / −11,500 | 45,500 / −68,200 | 35,400 / −59,100 | 139,100 / 7,800 |

**Reading it:**
- **Cap-aware founding works.** The follow-up's season-1 problems (clubs founded over the cap) are gone. No other legality problem appears in 120 seasons.
- **The cap now binds.** Bonuses and departures for money roughly double, as the follow-up predicted, and it holds steady over 15 seasons. AI strength and title spread are unaffected.
- **The benchmark owner goes over the cap on Pro and All-Star.** It re-signs everyone and never manages money. A real owner meets the commissioner's warnings first. This is why owner win percentages fall under 1.6 M (section 4), and it is the main owner-facing consequence of F-01.

### 3.3 Tests
46 cap, founding, contract, free-agency, Clash-franchise and lineup files: **434 of 434 pass**. The file list is in section 11.

### 3.4 Existing saves: migration policy (proposed, not implemented)
Today, an existing franchise keeps 1.8 M for ever, because it has no `capEra`. The brief rules out releasing beasts, rewriting salaries, deleting contracts and reducing attributes. Three policies fit those rules:

- **(A) Grandfather, the current state.** Older franchises stay at 1.8 M; new franchises play at 1.6 M. Nothing changes in old saves.
  - Simplest and safest.
  - Two economies exist side by side.
- **(B) Step down at offseasons as contracts expire.** At each offseason an older franchise's cap moves down 100,000 (1.8 → 1.7 → 1.6), and only once every club in that league fits the next step with its existing contracts. A club that does not fit holds the league at the current step. Clubs over a step can keep everyone but cannot add salary (no signings or extensions that raise payroll) until under.
  - Nobody is released and no contract is touched.
  - It converges in about 2–4 offseasons as contracts expire.
  - It needs a "cap step" news line and a Desk note.
- **(C) Switch at the next offseason with remediation.** Not recommended. Clubs over the new cap would need releases or salary changes, which the brief forbids.

**Recommendation: (B)** if the owner wants one economy everywhere; otherwise (A). **Owner decision D-1.**

## 4. Rookie difficulty (F-02: −4 against −7)

The same seeds (3, 4), 15 seasons, 1.6 M cap, repair owner. Production development rates are retained (`aiDev` unchanged). Only founding and replenishment quality differ.

**Owner win %.** A single season is 28 games over 2 seeds, so single-season numbers carry about ±9 points of noise. The blocks are more reliable.

| Owner win % | S1 | S5 | S10 | S15 | S1–3 | S4–7 | S8–11 | S12–15 | All 15 | Playoff seasons |
|---|---|---|---|---|---|---|---|---|---|---|
| **Rookie −4** (production) | 75.0 | 21.4 | 32.1 | 14.3 | 67.9 | 25.9 | 25.0 | 32.1 | **35.7** | 8 |
| **Rookie −7** (experiment) | 78.6 | 53.6 | 39.3 | 42.9 | 71.4 | 41.1 | 42.0 | 50.9 | **50.0** | 11 |
| Pro | 39.3 | 32.1 | 25.0 | 32.1 | 50.0 | 38.4 | 27.7 | 31.2 | **36.0** | 3 |
| All-Star | 21.4 | 42.9 | 7.1 | 7.1 | 26.2 | 31.2 | 17.0 | 14.3 | **21.9** | 0 |
| *Reference band* | | | | | | | | | Rookie 54–70, Pro 45–53, All-Star 32–40 | |

**AI club overall:**

| AI overall | S1 | S5 | S10 | S15 | Gym − ordinary at S1 / S15 | Gym titles (of 30) |
|---|---|---|---|---|---|---|
| Rookie −4 | 49.9 | 59.5 | 60.8 | 60.4 | 3.9 / 2.8 | 20 |
| Rookie −7 | 48.8 | 59.3 | 61.1 | 61.0 | 3.0 / 2.0 | 15 |
| Pro | 52.7 | 62.3 | 62.5 | 62.9 | 4.8 / 0.6 | 24 |
| All-Star | 56.7 | 63.5 | 63.0 | 64.0 | 3.7 / 1.2 | 23 |

**Findings:**
- **−7 makes Rookie clearly easier for the owner through the whole career.** +14 points overall, +15 to +18 in the middle and late blocks, and more playoff seasons.
- **It acts mainly through what the owner meets, not the AI's long-run strength.** The AI overall at S10–S15 is almost the same as at −4, because development is bounded by ceilings. What changes:
  - weaker founding rosters and early replenishment;
  - the gym clubs' head start (gym titles 20 → 15);
  - the early market the owner signs from.
- **Under 1.6 M, every difficulty is below its band for this owner.** The ordering and the steps are right: Rookie −7 50 > Pro 36 > All-Star 22.
  - In the follow-up at 1.8 M, the same owner had Rookie 44.8, Pro 38.8 and All-Star 26.2.
  - The drop comes from the cap and the owner's money handling (section 3.2), not from difficulty.
  - A human owner who manages the cap should land higher. The bands remain a target to check in a play test.
- **Development is unchanged:** about 1.8 a season at ages 19–23 on both settings. The rates were retained as directed.

**Recommendation: adopt −7 for Rookie.** Re-check the Pro and All-Star bands with a cap-managing benchmark owner, or a play test, before tuning them. **Owner decision D-2.**

## 5. Quarterback Awareness (F-03, experiment)

**Method.** `pass-rush-study.mjs` with `qb-read-hooks.mjs`. Read time per look is `look_k(aw) = look(70) + k·(look(aw) − look(70))`, bounded [0.10, 0.55] s. Here k = 1 is production and k = 2.5 makes it two and a half times as steep. Setup: 12 clubs, quality 62, 2 seeds each, 8 coverages, 24 pass plays; scenarios average, elite defensive line and elite offensive line; separate blitz, zone and man runs. The evidence is in `final-cal/qb/`.

| Average protection | Awareness 30 | Awareness 50 | Awareness 70 | Awareness 95 |
|---|---|---|---|---|
| Sack %, k=1 (production) | 5.1 | 2.5 | 1.8 | 1.3 |
| Sack %, k=2.5 | 5.7 | 2.7 | 1.8 | 1.2 |
| Time to throw (s), k=1 / k=2.5 | 1.89 / 1.94 | 1.87 / 1.90 | 1.85 / 1.85 | 1.82 / 1.80 |
| Yards per dropback, k=1 / k=2.5 | 5.51 / 5.42 | 5.47 / 5.60 | 5.83 / 5.83 | 5.99 / 5.88 |

- **Against an elite line:** sacks are 14.5% (Awareness 30) against 3.4% (95) at k=1, and 15.7% against 3.3% at k=2.5.
- **Against blitzes:** 11.4% against 2.5% at k=1, and 12.3% against 2.3% at k=2.5.
- **Completion and interceptions** move by noise only (±0.5).

**Findings:**
- **Awareness already separates quarterbacks strongly.** At the current slope a 30-Awareness quarterback is sacked about 4 times as often as a 95, and 4–5 times as often under pressure. This comes through pressure recognition, the hot throw and escape timing, not through read speed.
- **A steeper read time adds very little.** It makes low-Awareness quarterbacks slightly worse (+0.6 pp sacks) and high-Awareness ones about the same.

**Recommendation: do not adopt.** Production is unchanged. **Owner decision D-3**, only if the owner still wants it: k = 1.75 is the mildest measured option.

## 6. Beast Clash

**Measure.** The focus ability's own effect on its family's win rate: paired battles, same seeds, the ability on against off, everything else equal (`clash-pair.mjs`). Evidence: `final-cal/clash/`.

| Ability | Before (follow-up) | After | Paired SE | Battles changed |
|---|---|---|---|---|
| Eye of the Storm (Tempestra, F-05) | −4.5 pp | **+0.43** | 0.3 | 81 / 3,000 |
| Root Communion (Elderoot, F-04) | −7.4 pp | **−1.5** | 0.6 | 329 / 3,000 |
| Foresight (Cerebrix, F-08) | −1.6 pp | **−1.45** | 0.19 | 238 / 8,000 |

- **Eye of the Storm** no longer costs its holder. Casting no longer skips the attack.
- **Root Communion** is close to neutral. Its remaining cost is the 25% trigger: it fires when the holder is already losing.
- **Foresight** is not fixed by F-08. The root cause: only **14%** of its preparations ever intercept a status (178 of 1,270). A prepared turn still replaces the attack, so most preparations cost a full attack for nothing.
  - Possible fixes are owner decisions (D-5), none implemented:
    - prepare only when the foe's status ability is ready to fire this turn;
    - cast in addition to the attack (as F-04/F-05);
    - let a preparation persist until used.
- **Unchanged abilities stay unchanged.** Same seeds as the follow-up's shipped runs:
  - Deep Winter: 2,971 of 3,000 battles identical; win rate 72.1 → 72.2.
  - Eclipse Theft (Nyxshade): 2,952 of 3,000 identical; 68.1 → 67.9.
  - The few differences are battles against a Tempestra, Elderoot or Cerebrix.
  - Lightning Rod and Clear Light were not touched.
- **Tests:** ability review scenarios pass at every tier, with new `casts-and-attacks` (Tempestra) and `reserve-source-only` (Cerebrix) scenarios. `t8-interactions` is updated for F-08 and still covers the reflection through an active status source.

## 7. Playbook

**Method.** `playbook-situations.mjs`: 16 club pairs, 3 seeds, defence families taken from the book's own tags plus the coach AI's own calls. Each cell is yards a carry / success. Evidence: `final-cal/plays/`.

| 1st & 10, own 30 | vs zone | vs man | vs blitz | vs run fronts | vs AI calls |
|---|---|---|---|---|---|
| **Counter**, before | 8.76 | 14.64 | 14.34 | 18.24 | 12.79 |
| **Counter**, after (F-10) | 6.49 | 6.95 | 6.61 | 12.98 | 11.25 |
| QB Draw, after (before) | 5.74 (4.8) | 8.51 (7.3) | −0.47 | 2.89 | 2.93 |
| Lead Draw, after (before) | 5.56 (2.8) | 8.23 | −1.44 | 8.44 (3.3) | 3.47 (2.1) |
| Spread Draw, after | 1.89 | 11.62 | −2.85 | 3.07 | 0.67 |
| Empty QB Draw, after | 2.37 | 9.00 | −3.04 | 1.63 | 1.21 |
| **Jet Sweep**, after (before) | 3.52 | 3.20 | 1.31 (0.8) | 1.03 | 2.99 (2.0) |
| Ordinary runs (reference) | 6.52 | 9.10 | 5.02 | 7.89 | 6.47 |

**Counter (F-10).** It is no longer an outlier against coverage and blitz calls: about 6.5–7 yards, the book's run average. It is still strong against run fronts that over-commit, which is the play's purpose.
- **Test consequence.** `run-read.test.js` pins "aware defenders recover against the counter" for the Bear Front, Run Wall and Cover 3. With the B-gap path:
  - the Bear Front still holds (9.2 yards at Awareness 50, 6.3 at 95);
  - Run Wall (2.8 → 3.3) and Cover 3 (4.4 → 4.6) no longer drop with Awareness, because there is almost no misdirection left to recover from.

  The test was **not changed**. **Owner decision D-4.**

**Draws (F-11).** The designated show-pass draws gain against zone and man, where the show sells:
- QB Draw: 4.8 → 5.7 against zone.
- Lead Draw: 2.8 → 5.6 against zone, 2.1 → 3.5 against AI calls.

Blitzers still arrive (negative yards against blitzes, by design: defenders read the same cues). Two side effects:
- **Lead Draw against run fronts rose 3.3 → 8.4**, which was not intended. It is listed for the owner (D-6).
- **Spread Draw and Empty QB Draw are slightly worse against blitzes**, because the show holds the ball longer.

**Jet Sweep (F-12).** The flip helps (AI calls 2.0 → 3.0, blitz 0.8 → 1.3), but the play is still stuffed on 65–71% of snaps against run fronts and blitzes. No further change was made.

**New finding.** Power Left is now the outlier: 13.4 yards against AI calls and 18.4 against run fronts. It shares the pulling-guard geometry the Counter had, and the likely cause is the run fronts' defence against pulls. **Owner decision D-6.**

All other plays are byte-identical in their results.

## 8. Roster depth and fatigue (F-13)

**Study corrections in `roster-season.mjs`:**
- **Strategy ratings were being reset after week 1.** After each game, `afterGame → applyAward → syncFromDev` rebuilt attributes from `dev.current`. The tool now commits the strategy's ratings to `dev.current`.
- **Payroll could exceed the control.** Targets are now reduced when donors reach their floor.
- **New option:** `--recovery=N`.

**What weekly fatigue does.** It only affects `effectiveAttributes` (at most 6% of speed, strength and agility). In-game stamina and injuries do not use it.

**Results.** 24 seasons, quality 60, the same seeds for every strategy. Wins out of 16 against the control (± SE):

| Strategy | Production recovery (28) | Recovery 24 | Recovery 20 |
|---|---|---|---|
| Starter fatigue at kickoff / peak, control | 0.5 / 1.6 | 4.8 / 9.5 | 20.2 / 37.3 |
| Thin bench | **+3.04 ± 0.50** | +3.29 ± 0.56 | +3.38 ± 0.44 |
| Thin bench, starters play | +2.96 ± 0.51 | +3.46 ± 0.57 | +2.75 ± 0.42 |
| Elite QB | +0.29 ± 0.55 | +0.46 ± 0.56 | +0.23 ± 0.53 |
| Control, starters play | +0.08 ± 0.31 | −0.52 ± 0.42 | +0.04 ± 0.44 |
| Control, heavy rotation | −1.06 ± 0.41 | −1.13 ± 0.45 | −1.21 ± 0.45 |
| Depth | **−1.58 ± 0.44** | −2.04 ± 0.54 | −1.73 ± 0.40 |
| Superstars | −2.23 ± 0.66 | −2.31 ± 0.78 | −2.38 ± 0.69 |
| Depth, heavy rotation | −3.13 ± 0.59 | −3.25 ± 0.64 | −2.50 ± 0.63 |

Injuries are 3.1–4.4 a season and starter games missed 2.3–3.9 a season, the same across every setting.

**Findings:**
- **Even when starters carry 20–37 fatigue, rotating and deep rosters still lose.** Fatigue reaches only a few attribute points, while the starter–backup gap is much larger.
- **Thin bench (money moved to the starters) stays about +3 wins** at every recovery setting. Late-season and playoff margins do not reverse.

**Recommendation: keep production recovery (28).** Making depth valuable would need fatigue to reach in-game stamina or injury risk, which this brief does not authorise. **Owner decision D-7.**

## 9. Kicker (F-14)

- **Offseason lineup gate.** It now blocks only on the base lineup and the roster minimum. A missing kicker returns a warning, `{ missing, slot, warning, market }`.
- **The warning names every consequence:**
  - no field goals, punts or kicked extra points;
  - fourth downs are played;
  - two-point tries;
  - after your kickoffs the opponent starts at its own 20.

  It is shown in the lineup-gate sheet (`fa-ui.js`) and on the Saturday lineup screen (`hq.js`).
- The weekly `lineupCheck` reports the kicker separately and leaves it out of `problems`.
- AI clubs still treat K as a roster need. Kicking accuracy is unchanged.
- **Tests:** `tests/no-kicker.test.js` has 2 new tests (the gate does not block; the warning is complete). They pass, along with the file's other tests.

## 10. Combined validation

**Football.** 500 games, seed 1, the same tool against both trees (`final-cal/game-study/`):

| | Before (4b6ea6f) | After (230e3ba) |
|---|---|---|
| Points per team-game | 12.51 | 12.50 |
| Yards per team-game | 177.8 | 175.2 |
| Completion / yards per attempt | 52.3% / 7.57 | 52.3% / 7.52 |
| Yards per carry | 4.87 | 4.70 |
| Sacks per dropback / interceptions per attempt | 3.3% / 1.2% | 3.3% / 1.1% |
| Third-down / fourth-down conversion | 34.1% / 36.0% | 33.6% / 37.2% |
| Red zone touchdown % | 62.9 | 64.5 |
| Overtime / ties | 5.8% / 2.6% | 6.6% / 2.8% |
| One-score games / blowouts (21+) | 50.4% / 16% | 54.0% / 14% |
| Favourite wins at an overall gap of 3–5 / 6–9 / 10+ | 62.1 / 80.1 / 95.3 | 62.9 / 78.7 / 96.5 |
| Forfeits / errors | 0 / 0 | 0 / 0 |

Nothing moved outside noise except yards per carry (−0.17, the Counter fix) and slightly closer games.

**Franchise.** 8 runs of 15 seasons (sections 3–4):
- 0 errors and 0 problems;
- legality 0;
- roster minimums held;
- AI strength unchanged from 1.8 M;
- the 15-season limit preserved (every run ends at season 15).

**Clash.** Section 6.

## 11. Testing and documentation

- **The full fast and simulation suites were NOT run** (brief: targeted testing only). The matched seeds and the start-small-then-expand order are recorded in the evidence files.
- **Targeted test runs:**
  - **Cap, founding, contracts, free agency, Clash franchise, abilities, lineup gate, news, cloud and save slots:** 46 files, **434 of 434**. The files: slots-store, task6-phase-c, preleague-integration, live-console-fields, task8-abilities-light-metal, cloud-concurrency, aging-retirement, task10-clash-franchise, task8-abilities-psychic-dragon, cloud-save, task7-floor, ai-zone-placement, qol-coach-portrait, task8-abilities-nature-electric, franchise-followup, task8-abilities-earth-ice, draft-presentation, storage-foundation, dex-2-integration, no-kicker, cloud-review-fixes, task6-phase-b, clash/presentation, clash/arena-reconcile, task8-activation-gates, preleague-history, slot-manager, trading-second-pass, tuesday-companions, task8-review-sequences-named, task8-ability-pilots, task8-encounter-bonus, ai-trade-band, task10-rookie-rollover, task8-abilities-wind-dark, task7-lineup-gate, task10-badge-goal, task7-r7, task6-phase-d, task10-gym-badges, task8-abilities-fire-water, task8-m6-screens, task8-foundations, sim-ahead, league-news.
  - **Playbook, engine, QB reads, special plays, legendary plays, draws, handoffs, no-kicker, Clash interactions and text:** 14 files, **114 of 115**. The one failure is the Counter test in section 7 (D-4). It is not weakened. The files: engine, final-whistle-qb-reads, legendary-plays, no-kicker, playbook-reserve, playbook, qb-read, run-read, task10-handoff-plays, task10-qb-draw, task8-special-plays, clash/t8-interactions, central-text, text-never-decides.
  - Earlier in this brief: central-text, text-never-decides and the news/trade tests (9 of 9), after their fixes.
- **Save compatibility:**
  - Older saves keep the 1.8 M cap: `tierCap` without `capEra`, covered in the cap tests above.
  - No beast is released, no salary is rewritten, no contract is deleted and no attribute is reduced.
  - Clash replays of older battles are not rewritten; a note appears.
  - AI trade news saved before the fix still displays.
- **Published game files:** `python3 tools/release-files.py` reports **RELEASE FILE LIST OK: 512 files**. No `src` file was added.
- **Documentation:**
  - GDD §61.14 (cap, Clash, plays, kicker, experiments not adopted);
  - superseded markers on §20.5, §61.9, §61.6 Foresight and §61.13.3;
  - the beast-dex ability texts and family pages for WIN-06-C, NAT-06-C and PSY-03-C (regenerated `beast-dex.generated.js`).
- **New or updated tools:**
  - `calib-experiment.mjs`, `calib-hooks.mjs`, `qb-read-hooks.mjs`;
  - `pass-rush-study.mjs` (`--qbk`, `--qbAware`);
  - `playbook-situations.mjs` (`--patch`);
  - `clash-variant-hooks.mjs`, `clash-legendary-options.mjs` (variant X), `clash-pair.mjs`;
  - `roster-season.mjs` (corrected);
  - `cap-analyze.mjs` (`--cap`).
- **Repository cleanup:**
  - the temporary baseline worktree was removed after the before/after runs;
  - the evidence is consolidated under `final-cal/`;
  - no stray outputs in the repository.

## 12. Remaining owner decisions

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D-1 | Cap for existing saves (section 3.4) | (A) grandfather 1.8 M; (B) step down 1.8 → 1.7 → 1.6 at offseasons when every club fits, with no releases; (C) switch with remediation (excluded) | (B), or (A) if two economies are acceptable |
| D-2 | Rookie founding and replenishment quality (F-02) | keep −4, or adopt −7 | **Adopt −7** |
| D-3 | Awareness-based read times (F-03) | adopt k=1.75 or 2.5, or keep production | **Keep production** (it adds nothing measurable) |
| D-4 | Counter test (`run-read.test.js`, "aware defenders recover") after F-10 | (a) accept the new geometry and update the test to the Bear Front only, with owner approval; (b) restore some misdirection (a sold false step); small variants broke the handoff mesh in testing, so it needs care | (a), the counter is meant to beat over-committed fronts |
| D-5 | Foresight still costs its holder (−1.45 pp) | prepare only when the foe's status is ready this turn; cast in addition to the attack; keep the preparation until used | Cast in addition to the attack, matching F-04/F-05 |
| D-6 | New play outliers: Power Left (13.4 against AI calls), Lead Draw against run fronts (8.4) | review the run fronts' pull and draw fits; retune the plays; leave them | Investigate the run fronts' response to pulls before retuning plays |
| D-7 | Roster depth (F-13) | keep production recovery; link weekly fatigue to in-game stamina or injury (not authorised here) | Keep production |
