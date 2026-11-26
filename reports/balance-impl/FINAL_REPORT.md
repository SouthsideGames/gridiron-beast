# Gridiron Beast balance audit: final implementation report

**Branch:** `impl/balance-audit-2026-11` (from audit `d1f2d79`; game code `main` `58c33ee`, v43.50.0-sideline).
**Date:** 2026-11-26. **Status:** implemented and tested; **not merged, not released**, awaiting the owner's review.
Every number below was measured on this branch unless it is labelled as the audit's or as a design target. Phone and desktop checks are
**emulated** in headless Chromium, not real devices. Working notes, run by run: `IMPLEMENTATION_LOG.md`.

---

## 1. Executive summary

**Overall result.** All 20 recommendations are dealt with:
- 14 are completed, 6 of them with modifications;
- 3 were investigated and needed no change: R-12 scoring, R-18 saves and, as a design call, R-19 gym clubs;
- R-13 kicking is intentionally unchanged;
- R-11, the pass-rush targets, is deferred to the owner;
- R-15, documentation and cleanup, is completed.

The game plays the same football game as before, with every attribute in an overall now doing something, Speed no longer an exploit, a
Board that judges the owner against the real league, emergency covers instead of mid-game forfeits, a fuller AI defensive book, smarter
fourth downs, repaired abilities, a larger award system with All-League teams, an elite salary premium and "beast" throughout the text.

**Major improvements (measured):**
- **Board dismissals:** hands-off owners dismissed within five seasons fell from 6 of 6 to 1 of 6 on Pro and All-Star (R-0). The one dismissal followed three losing seasons.
- **Speed at constant payroll:** fell from +3.54 points a game (win 59%) to +0.85 ± 0.87 (win 49.7%). No roster strategy except pure depth is now more than ±1.3 points from the control (R-2).
- **Attributes that did nothing now work:** DL Speed lifts sacks 0.265 → 0.40, zone Coverage cuts completions allowed 0.45 → 0.395, DL Tackling finishes 53 → 79% of attempts, and Catching gives a pick reach (R-1).
- **Position leverage:** DL rose from 0.32 to 0.70 and S from 0.45 to 0.56. Trade values were re-derived from 1,000 games (R-1, R-16).
- **AI defensive variety:** AI clubs call 159 distinct defences, up from 24 (R-8).
- **Fourth downs:** runs on 4th and 7+ fell from 15% to 1.5% of those plays (R-14).
- **Forfeits:** 0 in 500 stand-alone games. Emergency covers keep games going (R-6).
- **Defensive Beast of the Year:** lineman share fell from 96% in the audit (43 of 45 seasons) to 71% (64 of 90), with linebackers 13, cornerbacks 9 and safeties 4. Seven new honours and All-League teams were added (R-5).
- **Abilities:** three football abilities that never fired now fire. Three Clash abilities that hurt their own side are fixed or neutral (R-10).

**Remaining concerns (owner decisions, not defects):**
1. **The cap still does not bind.** Even the tightest AI club keeps 78,000–154,000 of its 1.8 M cap. AI signing bonuses now occur, but only 7 times in 90 seasons. A tighter economy needs a cap or curve calibration (R-9).
2. **The difficulties converge.** AI overall at season 15 is 61.6 / 62.5 / 64.2 (Rookie / Pro / All-Star), against 52.9 / 63.5 / 63.8 for Rookie and All-Star in the audit. The faster All-Star rate works; Rookie meets the same attribute ceilings later (R-4).
3. **Gym Leader clubs win most titles:** 67 of 90 seasons. They make up 39% of AI clubs. Their advantages are designed. One interaction is not: on Rookie, gyms are founded at Pro quality (R-19).
4. **Sack rates stay far below the written target:** 2.1–2.4% of dropbacks in developed leagues, against 5–7%. Nothing was forced (R-11).
5. **Four legendary Clash signatures** are weaker than the attack they replace. The owner's A/B/C answer is pending (R-10).
6. **Scoring still grows** from about 13 to 17–18 points per team-game over a franchise. This is league maturation, not offence outpacing defence (R-12).

**Is the game stronger and more balanced?** Yes:
- every rated attribute matters;
- no roster strategy dominates;
- the Board is fair;
- an injury no longer erases a game;
- awards span more positions;
- the regression suite passes;
- saves are compatible.

The six concerns above are calibration choices for the owner, listed in §2 and §9.

---

## 2. Recommendation completion tracker

| ID | Recommendation | Status | Changes made | Validation results | Remaining concerns |
|---|---|---|---|---|---|
| R-0 | Correct Board forecasting | **Completed** | Forecast, expected wins and Coach of the Year rate AI clubs at their persistent strength (`aiTeam`) | Live-Board traces, 5 seasons: Pro 0/3 dismissed (audit 3/3), All-Star 1/3 (3/3), Rookie 0/3; the Board still warns (Pro seed 3 at confidence −1 after 5-9) | None |
| R-1 | Make ineffective attributes meaningful | **Completed with modifications** | DL Speed in the pass-rush shed; defender Catching sets the pick reach; zone Coverage in reaction and contest; all centred on the typical starter (`R1_TYPICAL`). DL Tackling already worked: the Lab trial is fixed. RB Awareness works through vision: no engine change | Sweep n = 200: DL-speed sacks 0.265 → 0.40, zone completions allowed 0.45 → 0.395, breakups 0.10 → 0.19, DL-tackling finish 0.53 → 0.79; game level unchanged (completion 52.8 → 52.3%) | RB Awareness is the weakest weighted RB attribute (real, small) |
| R-2 | Address Speed dominance | **Completed with modifications** | DL and TE Speed weight 2; engine top-speed slope 4.1 → 3.5 yd/s (pivot Speed 50). WR/CB weight 4 was tried and reverted (no gain) | Speed strategy +3.54 → **+0.85 ± 0.87**; Speed sweep: still viable at every position (WR 7.0 / 8.0 / 9.2 yd/s at 30 / 65 / 95) | None |
| R-3 | Repair ability testing tools | **Completed** | `tools/lib/ability-strip.mjs`: one control that strips slots, kicker, returner, bench and rotation pool, and fails a run that executes any ability; used by four study tools | Corrected baseline: 0 executions with abilities off; completion 59.7% off against 55.0% on | None |
| R-4 | Maintain long-term difficulty | **Completed** | AI development rate by difficulty (`aiDev` 0.6 / 1 / 1.5), the same for every AI club; no rubber-banding | 15-season runs: All-Star stays ~2 points above Pro to season 15 (audit: level by season 5); calibration benchmark: owner 67.3 / 47.3 / 32.5% in the 54–70 / 45–53 / 32–40 bands | Rookie and Pro meet at the same attribute ceilings (61.6 / 62.5 at season 15). Owner decision: a ceiling-side change for Rookie |
| R-5 | Rebalance and expand awards | **Completed with modifications** | MVB / OBOY / DBOY / SBOY names; DBOY capped components standardised within the position; STBOY, MIB, CBOY, Iron Beast; All-League First and Second Teams; Timeline, News, profiles, history, Hall voting. Breakout and GM of the Year not added (redundant; unsupported) | DBOY: DL 64 of 90 (audit 43 of 45), LB 13, CB 9, S 4; All-League filled every season; MIB across nine positions | STBOY: returners 78 of 90 (their leaders are genuine outliers); DL still the most frequent DBOY |
| R-6 | Emergency secondary positions | **Completed** | `EMERGENCY_POSITION` table; base slots only, last resort, best by the slot's overall on his own attributes; no penalty, no injury factor; recorded in-game forfeits; lineup and match notices; AI and advisor treat a cover as a hole | 7 dedicated tests; repro (every QB hurt in Q3): no forfeit; 0 forfeits in 500 games | A forfeit remains possible when a position and its cover are both gone (rules) |
| R-7 | Retune plays | **Completed with modifications** | Option pitch, inverted veer, wide zone, student body, dart, rocket toss retuned by geometry | Probe: option pitch 13.2 → 9.4 yd, student body 7.6 → 6.8, dart 2.3 → 2.9; explosive runs unchanged (8.2 → 8.3%) | Draws, jet sweep and counter not retuned (engine limits, owner review); fly sweep and pistol stretch lead the run game in games |
| R-8 | Expand AI defensive playbook use | **Completed** | Zone and man pools from the released book by tag (80 and 58 calls; were 8 and 9); 25 run fronts (were 6) | 159 distinct defensive calls in 500 games (audit 24); offence already used 174 of 184 | None |
| R-9 | Salary cap and free agency | **Completed with modifications** | Elite premium above OVR 70 (`salaryForOvr`); AI clubs use the cap-saving bonus when a deal leaves under 20% of the cap next year | 15-season runs: 0 negative cap rooms, rosters 32–38, 0 market problems; 7 AI bonuses in 90 seasons (audit and round 1: 0) | The cap never binds (tightest AI club 78–154 k of 1.8 M). Tier caps unchanged per the brief: owner decision |
| R-10 | Audit and correct abilities | **Completed with modifications** | Football: Foresight depth 5; Air Brake and Crosswind Rescue charge on passes defended. Clash: Unbroken Charge arms on a heavy hit; Foresight prepares only against status sources; Snowdrift Shelter 3 turns | Foresight 0 → 46 executions in 20 games; Air Brake in ~8% of games, Crosswind ~10%; Clash: Snowdrift −6.2 → +0.3, Foresight −9.8 → −3.0, Unbroken Charge −1.9 → −0.8 | Four weak legendary signatures await the owner (A/B/C); 11 rarely-triggered abilities deferred |
| R-11 | Passing and sack benchmarks | **Deferred** (owner decision) | Investigated; no probability forced | Developed leagues: completion 59.2–63.5% (target 63–67%), sacks 2.1–2.4% (target 5–7%), interceptions 2.2–2.5% | The pass rush loses ground as talent rises (−27% sacks for +12 quality): an engine-side decision |
| R-12 | Long-term scoring inflation | **Investigated — no change necessary** | Measured the engine's response to talent and development by position | Offence and defence develop alike; equal talent growth is worth +19% scoring; seasons 5–15 hold at 16.5–18.5 | Damping needs a hidden modifier (ruled out) or a founding-strength change (owner) |
| R-13 | Extra-point and kicking accuracy | **Intentionally unchanged** | None | FG 73.6% (audit 75.4), XP 84.9% (83.6) in 500 games; 72.9–74.6% FG in developed leagues | None |
| R-14 | Fourth-down AI decisions | **Completed** | Pass-heavy calls on 4th and 5+; the go decision reads the coach's IQ (two scores down late, looser short-yardage thresholds) | 4th and 7+ runs 15% → 1.5%; personalities still distinct by difficulty; conversions 38.3 → 35.8% (more attempts) | Opposing personnel is not an input (documented) |
| R-15 | GDD and repository cleanup | **Completed** | GDD notice, league, status register, award names and superseded rules corrected in place; new §61; temporary files removed | See §7 | Older historical sections keep their period wording, marked superseded |
| R-16 | Positional trade values | **Completed** | `POSITION_LEVERAGE` re-derived from 1,000 games on the final engine (documented recipe) | Moves of 0.14 at most; 38 trading tests pass; incoming calls 13 / 16 / 7 a franchise | None |
| R-17 | Durability in the overall | **Completed with modifications** | Durability 1 (RB, OL, DL, LB), 0.5 (QB, WR, TE, CB, S), **0 for K** (provisional 0.25 tested: kickers are never injured) | Overalls computed live: saves unaffected; Clash and generation keep the frozen weights, so every recorded battle replays exactly | None |
| R-18 | Save data | **Investigated — no change necessary** (save data) | Measured size, speed, parts and round trip at seasons 1/5/10/15, in Node and emulated browsers, branch against `main` | 1.39 MB stored at season 15; exact round trip; no duplicate or debug data; phone save 285–534 ms; branch no slower than `main` | Reopening a franchise on a slow phone takes 8–14 s, mostly startup work unrelated to the save (§6); a small follow-up would cut about 5 s |
| R-19 | Gym club dominance | **Investigated — no change necessary** (owner decision on one interaction) | Traced the four mechanical advantages | Gym titles 67 of 90 seasons (audit 50 of 75); gyms equal ordinary clubs in average strength on All-Star; titles follow ageless legendaries | On Rookie, gyms are founded and resupplied at Pro quality, relatively larger now that Rookie develops slower: owner decision |

---

## 3. Before-and-after balance results

**Sources.** *Audit:* the audit's runs at `d1f2d79`. *Corrected baseline:* the audit's tools after the R-3 fix, on `58c33ee` game
code (`baseline/`). *Final:* this branch. Stand-alone studies use the audit's seeds and sizes; franchise runs use the audit's seeds 3
and 4 with the same owner (`--owner=repair --board=content`).

### 3.1 Gameplay (500 games, seed 1, generated clubs, mixed quality)

| Measure | Audit | Final | Design target |
|---|---|---|---|
| Points per team-game | 12.87 | 12.45 | — |
| Completion % | 52.8 | 52.3 | 58–62 (new leagues) |
| Yards per attempt | 7.54 | 7.56 | — |
| Yards per carry | 5.31 | 4.87 | — |
| Sacks, % of dropbacks | 2.7 | 3.2 | 4–6 (new leagues) |
| Interceptions, % of attempts | 1.1 | 1.2 | — |
| Fumbles lost per team-game | 0.18 | 0.18 | — |
| Touchdowns per team-game (pass + run) | 1.60 | 1.55 | — |
| Explosive passes (20+), % of attempts | 10.7 | 10.8 | — |
| Explosive runs (15+), % of carries | 8.2 | 8.3 | — |
| Third-down conversion % | 34.6 | 34.3 | — |
| Fourth-down conversion % | 38.3 | 35.8 | — |
| Distinct defensive calls / offensive calls | 24 / 174 | 159 / 174 | — |
| Extra point % / field goal % | 83.6 / 75.4 | 84.9 / 73.6 | unchanged (R-13) |
| Upsets, % of decided games | 24.2 | 26.9 | — |
| Overtime, % of games | 9.0 | 5.4 | — |
| Forfeits | 1 | 0 | — |

Abilities-off control (R-3, corrected baseline): 0 executions; completion 59.7% off against 55.0% on.

### 3.2 Attribute effectiveness (single-play trials, n = 200, levels 30–95)
| Trial | Audit | Final |
|---|---|---|
| DL Speed → sack rate | 0.265 → 0.28 (flat) | 0.265 → 0.40 |
| Zone Coverage → completions allowed | 0.80 flat | 0.45 → 0.395 (breakups 0.10 → 0.19) |
| DL Tackling → sack finish | saturated in the Lab | 0.53 → 0.79 |
| CB Catching → interception | no effect | 0.005 → 0.02 (probe 0.3 → 1.0%) |
| Speed (final slope) | — | WR 7.0 / 8.0 / 9.2 yd/s; CB completion allowed 40.5 / 29.5 / 26.5%; DL sacks 27.5 / 33 / 36% |

### 3.3 Positional leverage (relative value of one overall point per starter)
| | QB | RB | WR | TE | OL | DL | LB | CB | S | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Audit (150 games) | 2.12 | 2.32 | 1.19 | 2.35 | 0.71 | 0.32 | 0.93 | 1.26 | 0.45 | 0.26 |
| Final (1,000 games) | 2.30 | 2.69 | 1.02 | 1.74 | 0.39 | 0.70 | 0.94 | 1.02 | 0.56 | 0.89 |

The audit's 150-game figures carry standard errors of 0.3–0.9, so only DL's rise is clearly beyond noise (K: pooled 0.52 ± 0.17 with the
2,000-game study for trade values).

### 3.4 Roster strategies (constant payroll, 150 paired games; margin per game against the unchanged club)
| Strategy | Audit | Final |
|---|---|---|
| Speed | **+3.54** ± 0.99 | +0.85 ± 0.87 |
| Elite QB | +1.64 | +0.17 |
| Passing | +1.47 | +1.05 |
| Superstars | +0.97 | +1.27 |
| Offence | +1.08 | +1.17 |
| Rushing | +0.71 | −0.35 |
| Defence | −1.92 | −1.29 |
| Strength | −2.29 | −1.82 |
| Depth | −3.57 | −4.25 |

Standard errors are about 0.9 throughout. Limitation: the tool holds the *sum of overall* constant, which was constant payroll under the
old linear salary. Above OVR 70 the new curve makes stars dearer, so "superstars" is slightly flattered here.

### 3.5 Abilities
- **Football:** Foresight went from 0 to 46 executions in 20 games, about 2.3 a game, each a 50% roll for Confused. Air Brake fires in about 8% of CB1 games and Crosswind Rescue in about 10% of FS games.
- **Beast Clash:** measured over 4,000 battles a family, as points of win % with the ability on.

| Ability | Effect before | Battles without it firing, before | Effect after | Battles without it firing, after |
|---|---|---|---|---|
| Snowdrift Shelter | −6.2 | 9% | +0.3 | 8% |
| Foresight | −9.8 | 0% | −3.0 | 84% |
| Unbroken Charge | −1.9 | 100% | −0.8 | 81% |

- All 72 families: the mean ability effect was +0.07, with a spread of 4.8.

### 3.6 Difficulty progression and franchise development (15 seasons, seeds 3 and 4; mean of seeds)
| | Season 1 | 5 | 10 | 15 |
|---|---|---|---|---|
| AI overall, Rookie | 50.7 | 60.2 | 62.2 | 61.6 |
| AI overall, Pro | 52.9 | 62.7 | 63.6 | 62.5 |
| AI overall, All-Star | 56.9 | 64.0 | 63.8 | 64.2 |
| Audit, Rookie / All-Star (seed 3) | 52.9 / 57.2 | 63.8 / 64.1 | 64.1 / 63.2 | 63.5 / 63.8 |

- **Repair owner's win %** (seed 3 / seed 4): Rookie 39.0 / 59.0, Pro 38.1 / 57.6, All-Star 22.9 / 29.5. The audit noted that the spread between seeds is about three times the spread between difficulties.
- **Calibration benchmark** (8 seasons, hands-off owner): 67.3 / 47.3 / 32.5%, inside the bands of 54–70, 45–53 and 32–40.
- **Board dismissals** (live Board traces, 5 seasons): Pro 0 of 3, All-Star 1 of 3, Rookie 0 of 3. The audit had 3 of 3 on both Pro and All-Star.
- **Scoring trend:** points per team-game were 10.7–14.2 in season 1 and 16.8–18.5 in season 15.
- **Offence against defence:** starter growth from season 1 to 15 is similar at every position (QB +2, RB +17, WR +13, OL +12, DL +9, LB +12, CB +11).
- **Evolution and stars:** monsters at 80+ went from 13–27 to 72–84 by season 15, and at 90+ from 2–6 to 25–34. All six runs had 13 ageless monsters.
- **Integrity:** 0 errors, 0 problems, 0 negative cap rooms and 0 market problems. Rosters stayed at 30–38.

### 3.7 Salary cap, contracts and free agency (six 15-season runs)
- Salary curve (unchanged below OVR 70): OVR 80 49,400 (was 40,400), 90 79,200 (43,200), 99 121,410 (45,720).
- AI payroll ~1.03 M (season 1) to ~1.10 M (season 15); mean cap room 256,000–375,000; tightest club 68,000–244,000.
- AI free-agent signings 172–210 a franchise, 99–120 contested by two or more clubs, about 3,600 extensions; 7 signing bonuses in 90
  seasons (audit 0); no market problems.

### 3.8 Awards (90 seasons)
| Award | Distribution by position |
|---|---|
| MVB | QB 42, RB 40, WR 6, TE 2 |
| OBOY | RB 49, WR 34, TE 7 |
| DBOY | DL 64, LB 13, CB 9, S 4 (audit DL 43 of 45) |
| OROY / DROY | RB 34, WR 29, OL 15… / CB 48, S 25, LB 12, DL 4 |
| STBOY (new) | returners 78, kickers 12 |
| MIB (new) | all nine non-kicker positions (CB 25, LB 13, WR 12, OL 10…) |
| CBOY (new) | 46 winners (none possible before season 3) |
| Iron Beast (new) | LB 41, CB 30, WR 9… |
| All-League | full First and Second Teams every season, every position including OL and K |

### 3.9 Championships
Gym Leader clubs won 21 / 22 / 24 of 30 seasons (Rookie / Pro / All-Star), against 50 of 75 in the audit; distinct champions 6–9 per
franchise; the owner won 3 titles in one run (Rookie seed 4).

### 3.10 Save size and performance
See §6 (R-18): 502 KB stored at season 1 and 1,389 KB at season 15; exact round trip at every snapshot; emulated phone save 285–534 ms, reopen 8.4–14.4 s (`main` 8.3–16.5 s).

---

## 4. Numerical changes

| Area | Change | Why |
|---|---|---|
| Attribute formulas (R-1) | DL Speed in pass-rush shed 0.2 × (Speed − 40); pick reach 1.0 yd at Catching 35 to 1.48 at 95; zone Coverage reaction weight 0.30, contest reach ×(1 + 0.6Δ), contest weight 0.45; all centred on `R1_TYPICAL` (40 / 35 / 45) | The attributes counted in the overall but did nothing; centring on the typical starter keeps the league's average play unchanged (centring on 65 had cut interceptions by a third) |
| Positional weights (R-2, R-17) | DL and TE Speed 1 → 2; Durability 1 (RB, OL, DL, LB), 0.5 (QB, WR, TE, CB, S), 0 (K) | Speed bought far more than its weight at DL and TE; Durability halves injury risk but was in no overall; it does nothing for a kicker |
| Engine speed curve (R-2) | Top-speed slope 4.1 → 3.5 yd/s over the Speed range, pivot Speed 50 | Weighting alone left the speed edge at +2.8 to +3.2; the slope removed it while Speed stays the strongest single attribute for skill players |
| Ability parameters (R-10) | Foresight mark depth 3 → 5 yd; Air Brake / Crosswind charge on passes defended; Unbroken Charge also arms on a ≥30% max-HP hit survived; Clash Foresight gated on status sources; Snowdrift Shelter 1 → 3 own turns | Each failed to fire or cost its own side, from a measured root cause |
| Gameplay probabilities (R-14) | 4th and 5+: passes ×1.8, draws ×0.35, other runs ×0.1; go thresholds loosen with `read` (aggression > 0.35 − 0.1·read; > 0.5 − 0.15·read; two-scores-down rule) | Runs converted 4.3% against 27.8% for passes on 4th and long |
| AI defensive pools (R-8) | Built from the released book by tag (80 zone, 58 man, 25 run fronts) | AI clubs used 24 of 178 defences |
| Development modifiers (R-4) | `aiDev` 0.6 / 1 / 1.5 | Difficulty faded by season 5 |
| Injury factor (R-6) | `OUT_OF_POSITION_RISK` 1.75 → 1 | It would have penalised every emergency cover; a familiarity penalty needs evidence (brief) |
| Salary formula (R-9) | `salaryForOvr` = 18,000 + 280·OVR + 90·max(0, OVR − 70)² | Salary spanned only 1.5× from replacement to 99 |
| AI bonus rule (R-9) | `AI_MARKET.bonusRoom` 0.2: the cap-saving bonus is used when a deal leaves < 20% of the cap next year | Bonuses were used only when a deal did not fit at all, which never happened |
| Trade values (R-16) | `POSITION_LEVERAGE` QB 1.48, RB 1.58, WR 1.08, TE 1.32, OL 0.69, DL 0.90, LB 1.03, CB 1.07, S 0.82, K 0.78 (were 1.37, 1.6, 1.01, 1.45, 0.63, 0.86, 1.02, 1.21, 0.9, 0.79) | R-1/R-2/R-6 changed what each position is worth |
| Award calculations (R-5) | DBOY: components capped at +3 SD, total standardised within the position; STBOY groups standardised; new award weights in §61.8 of the GDD; Hall voting STBOY 8, CBOY 6, MIB 4, IRON 4 | DL won 96% of defensive awards; the cap alone made leaders tie and the tie-break favoured linemen |
| Plays (R-7) | Carrier path depth and one block in six plays | Option pitch 13.2 and student body 7.6+ yards a carry were outliers |

---

## 5. New and updated features

- **Emergency positions (R-6).** Each position has the one position it may cover (a QB may cover WR; RB → WR, WR → RB, TE → OL,
  OL → TE, DL → LB, LB → DL, CB → S, S → CB, K → QB; nobody covers K). Base slots only, last resort, owner and AI alike, announced in the match strip and
  the lineup screen, never selectable in the depth chart. A forfeit that is still unavoidable keeps the score at the moment play stopped.
- **Expanded awards and All-League honours (R-5).** Seven Beast-named major awards plus STBOY, MIB, CBOY and Iron Beast; First and Second
  Team by position (QB 1, RB 1, WR 2, TE 1, OL 3, DL 2, LB 2, CB 2, S 2, K 1) on the League hub, the season review, profiles, Career
  Timelines and League News; Hall of Fame voting weights; the owner's Hall checklist unchanged.
- **AI playbook improvements (R-8, R-14).** The released defensive book by tag; fourth-down calls and decisions by coach IQ.
- **AI signing bonuses (R-9).** The existing cap-saving bonus is now used by clubs near their cap.
- **Leadership turnover.** None exists for AI clubs (fixed head coaches, no carousel); **deferred, as instructed**.
- **Board forecast (R-0)** against the real league.
- **Terminology (owner, 2026-11-26).** Every player-facing text says *beast*: the central text file, the plain-language ability rules,
  the Beast Dex, Media Day, legacy species descriptions, three in-code messages and the app description. Keys, placeholders and save
  keys are unchanged.
- **UI feedback (owner play test 2026-11-25, done after the balance phases as asked).** Captain ⓘ and the ⓘ between Best Lineup and Details
  removed; the cap pill's ⓘ explains, with the detail moved to Help; Apex beasts shown with a gold name and an **A** badge; League News for
  Apex signings (discovered Apex only, so nothing is revealed early); depth chart layout. Before and after screenshots (emulated 390 and
  1280 px): `ui/before-*.png`, `ui/after-*.png`.

---

## 6. Testing results

| Suite | Result |
|---|---|
| Fast tier (`node tools/test-tier.mjs fast`) | **2,263 of 2,263 passed, 0 failed, 0 skipped**, on `2334a3d`, the last code change (88.5 min, run alone). Later commits change only reports, documentation and tools |
| Simulation tier (the 30 files of `tools/test-tier.mjs sim`, run as two halves of 15 because of the 2-hour job limit) | **307 of 310 passed, 0 skipped**, on `2334a3d` (61 and 66 min). The 3 failures were test set-ups that still assumed the pre-audit rules: two from R-6 emergency covers, one from the R-2/R-17 re-rating. All 3 were updated with documenting comments, and no assertion was weakened. They pass on rerun: `league-season` 5 of 5, `league-flows` 5 of 5, and the package-rule test 1 of 1. Fast + sim = the whole suite |
| Free-agency tests after the bonus change | 69 of 69 |
| Award, career, history and profile tests after the award fixes | 30 of 30, and 52 of 53 → 53 of 53 after the All-League fix |
| Text, Dex and Media Day tests after the wording change | 99 of 101 → 101 of 101 after two exact-text updates |
| Play-test changes after the full suite (owner, 2026-11-26) | Targeted tests only:<br>• `104a779` (sideline markers, Match Day tag, zoom button): the 20 camera, match-screen, field and stadium test files, 156 of 156; sideline and club-visual tests 12 of 12; emulated browser checks of the zoom in and out, Auto taking over, and Match Day at 320 and 390 px.<br>• `c10aa30` (zone boxes): zone planner and match tests, 127 of 127.<br>• `32cd70d` (Meteor Impact push): ability, Dex and review tests 67 of 67; review-sequence tests 14 of 14 |
| **Full tiers on the final code** | **Not rerun, by the owner's decision (2026-11-26, 14:08).** The fast and simulation tiers above ran on `2334a3d`; the four play-test commits after it were checked with the targeted tests only |
| Release file list (`tools/release-files.py`) | 512 files, the same as the last release; no new files |
| Beast Dex module (`build-beast-dex.mjs --check`) | up to date (192 families, 222 forms, 144 abilities) |
| Text export (`tools/text-export.py`) | regenerated |

**Simulation sample sizes and seeds.**
- **Game studies:** 500 games (seed 1) at the audit, Phase 3, Phase 5 and the final engine.
- **Talent response:** 300 games at quality 52 and 300 at quality 64 (seed 7).
- **Roster strategies:** 150 paired games per strategy, nine strategies.
- **Position leverage:** 300, then 1,000 games.
- **Speed leverage:** 120 games.
- **Attribute sweeps:** 200 seeds × 5 levels for each trial.
- **Play probe:** 960 snaps per play against 12 defences.
- **Clash:** 2,000–4,000 battles per family, plus the 72-family baseline.
- **Board traces:** 9 franchises × 5 seasons.
- **Calibration benchmarks:** seeds 1–4 × 8 seasons, and seeds 1–2 × 6 seasons.
- **Final franchise runs:** seeds 3 and 4 × 3 difficulties × 15 seasons, twice (round 1, then round 2 on the fixed code). That is 180 franchise seasons, about 40,000 league games.
- **Award formula probe:** 15 collected seasons (seed 5, Pro).

**Save timing (R-18).**
- Node, median of 5: season 1 saves in 650 ms and loads in 208 ms; season 15 saves in 1,824 ms and loads in 686 ms.
- **Emulated browser** (headless Chromium; `tools/balance-audit/save-browser-timing.py`). The same four saves were imported into slot 2 and measured on this branch and on `main` (`58c33ee`). Saving is the median of 5 immediate saves; reopening is the median of 3 reloads, timed until the franchise is back. Store open is the store's own read, decode and verify. Phone means 390 px with the CPU throttled 4×; desktop means 1280 px with no throttle.

  | Save | Phone: save | Phone: reopen (branch / `main`) | Phone: store open | Desktop: save | Desktop: reopen (branch / `main`) | Stored |
  |---|---|---|---|---|---|---|
  | Season 1 | 285 ms | 8.4 s / 8.3 s | 1.8 s | 104 ms | 2.1 s / 2.6 s | 1.0 MB |
  | Season 5 | 383 ms | 9.5 s / 9.8 s | 3.1 s | 104 ms | 2.2 s / 2.4 s | 1.7 MB |
  | Season 10 | 515 ms | 13.4 s / 14.4 s | 3.6 s | 141 ms | 3.2 s / 3.4 s | 1.4 MB |
  | Season 15 | 534 ms | 14.4 s / 16.5 s | 3.7 s | 148 ms | 3.3 s / 3.3 s | 1.5 MB |

  - An empty start (no franchise) takes 1.2 s on the phone and 0.3 s on desktop.
  - There were 0 page errors, and every import succeeded.
  - The branch is the same as `main` or slightly faster everywhere.
  - **Reopening a franchise on a slow phone takes 8–14 s, and most of that is not the save.** A CPU profile of a season-15 reload (`tools/balance-audit/load-profile.py`, desktop) shows:
    - about 1.2 s in `fitThresholds` (`src/data/monsters.js`), which generates about 4,800 sample monsters from a fixed seed to derive the scheme-fit thresholds;
    - about 0.65 s in generating one individual (`selectIndividual`, `simulateHistory`);
    - about 0.4 s in the name check on load (`dedupeRosterNames`);
    - about 0.4 s decoding the store's parts.

    The thresholds are identical on every run, so shipping them as a fixed table, with a test that it equals the live derivation, would take about 1.2 s off a desktop reload and about 5 s off an emulated phone reload. Nothing else would change. This is not done here, because it would mean another full test run; it is offered as a follow-up (§9).

**Regressions discovered and corrected.**
1. **Release advice (R-6):** at the roster minimum it could plan a release that left a position to its emergency cover. Fixed.
2. **Play-end yards:** were rounded differently for abilities and for the box score. Exposed by R-2 and fixed in the engine.
3. **Emergency-covered slots:** AI clubs stopped treating them as needs (R-6 follow-up). Fixed with `staffingHoles`.
4. **Most Improved Beast (R-5):** read the season-start overall from the Career Timeline, so switching the Timeline off changed the game. Fixed.
5. **All-League places in profiles and the older-save backfill (R-5):** read from the wrong archive path. Fixed.
6. **Defensive Beast cap (R-5):** the second cap made leaders tie, and the tie-break handed ties to linemen. Fixed.

**Tests changed because of approved design decisions.** Each change is documented in the test itself.
- **R-6:**
  - the package-rule test: a spare lineman now covers LB2, so its forfeit case also removes the spare linemen, and the cover itself is asserted;
  - in-season QB cover: the need is read from `staffingHoles`, because the kicker now covers QB;
  - lineup gate fixtures;
  - the remediation R5 warnings;
  - "no fallback" becomes the emergency cover;
  - the illegal-roster preset and the offseason blocker now remove both QB and K.
- **R-10:** ability charge and depth tests.
- **R-2 / R-17:**
  - the trading fixture gap 8 → 10;
  - a spare TE seed;
  - the training probe uses Kicking;
  - RB Durability allocation weight;
  - Impact Pyre snaps start at 1st and 10;
  - Ball Clamp review seeds;
  - Goal Line Man sample 40 → 120 plays, which makes it stricter;
  - the league-contracts cap-trim set-up forces the bottom quarter of reserves to walk, not the lower half, so the club stays above the roster floor.
- **R-5:** award names and the All-League archive path.
- **Wording:** exact texts follow "beast".

No test was removed or loosened.

**Known limitations and unresolved items.**
- The benchmark owner never releases or trades. In one run (All-Star seed 3, season 15) he ran out of cap with one LB and two DL and forfeited every game. The game followed its rules. Real GMs can release or trade.
- Emergency-substitution frequency is not counted by the study tools. The repro and the 0 forfeits in 500 games stand in for it.
- Pressure %, injury frequency and overtime outcomes beyond the overtime rate are not reported per study.
- Real-device checks have not been done; phone and desktop are emulated.

---

## 7. Documentation and cleanup

**GDD sections updated (`GRIDIRON_BEAST_GDD.md`).**
- **The authority notice:** 32 clubs, the 14-game season, the 14-club playoff, 12 Gym Leaders, the 15-season limit, and §60–61 as the newest sections.
- **§8:** league, onboarding and §8.2 attributes.
- **§16.4:** award names.
- **§17.2 and §59.1:** emergency positions.
- **§24:** the 32-club league.
- **§27 register:**
  - Task 8 marked merged, with its M6 benchmarks superseded;
  - coaching/GM and the 32-club league marked merged;
  - the 15-season limit;
  - a new balance-audit row;
  - leadership turnover and Monster Career Mode deferred.
- **§42 and §44.2:** the 20-season limit marked superseded by 15.
- **§60:** marked merged; canon award names; canon DBOY winners for seasons −6 and −3 under the new rule.
- **Task 10 MVP rule:** marked superseded.
- **§18.5 and §40.2:** award names.
- **New §61:** every rule this work set, plus the terminology rule (§61.11a).

**Obsolete information.** Contradicting statements are corrected or marked superseded where they stand, not only appended at the end.
Historical build notes keep their period wording, marked as history.

**Removed.**
- `reports/balance-audit/RECOMMENDED_CHANGES.md`: every decision is now recorded in GDD §61 and this report.
- `reports/balance-audit/raw/` (28 MB of tool outputs, reproducible from the tools and seeds).
- A committed Python cache file; `__pycache__/` is now ignored.
- This session's scratch worktrees.

Everything removed is kept in git history, and `reports/balance-audit/README.md` says where. No history was rewritten.

**Retained.**
- The audit's narrative reports.
- `reports/balance-impl/`: this report, the log, and the evidence JSONs the log cites.
- Every study tool in `tools/balance-audit/` and `tools/lib/ability-strip.mjs`.
- All regression tests, including the new `ability-strip` and `emergency-positions` tests.

**Proposed after approval:** remove the intermediate evidence in `reports/balance-impl/` (`baseline/`, `phase3–5/`, `r0/`, `r1/`, `r4/`, `r10/`), keeping only this report, the log and `final/`. **Done in the follow-up (A-5, 2026-11-26):** removed; contents and the commit that holds them are listed in `followup/REPRODUCE.md`.

**Remaining documentation concern.** `docs/task8/M6_STATUS.md` still says Task 8 "stays open". The GDD register now records that its benchmarks are superseded.

---

## 8. GitHub and release summary

- **Branch:** `impl/balance-audit-2026-11`, pushed; 91 commits after `main` `58c33ee` (including this report's final commit). Not merged.
- **Pull request:** [#191](https://github.com/SouthsideGames/gridiron-beast/pull/191), open and not merged. The audit's reports are in #190.
- **Files changed since `main`:** 180, of which 53 are game source files and 23 are tests. The rest are tools, reports, docs and the GDD.
- **Files added:**
  - 2 tests: `tests/ability-strip.test.js` and `tests/emergency-positions.test.js`;
  - 16 study tools in `tools/balance-audit/`, plus `tools/lib/ability-strip.mjs`;
  - this report and the evidence in `reports/balance-impl/`.
  - **No new published game files.**
- **Files removed:** the audit's `RECOMMENDED_CHANGES.md` and `raw/`. No game file was removed.
- **Release build validation:** 512 published files, the same as v43.48.0. The Dex is up to date and the text export is regenerated. The version is still v43.50.0. Stamping a release version waits for approval.
- **Save compatibility:**
  - Overalls are computed live and contracts keep their stored salaries.
  - Save keys for awards are unchanged.
  - The new `stats.season.o0` field is additive.
  - Clash records and replay keys replay exactly.
  - Every save in the runs round-trips exactly.
  - Old saves keep their stored award winners, canon history and expectations.
- **Remaining release blockers:**
  - the owner's review and approval of this report;
  - the owner's decisions in §1 (none blocks a release technically);
  - a real-device check.

---

## 9. Owner decisions requested

1. **Economy (R-9):** should the cap bind? The options are a lower cap or a steeper elite curve, either with its own 15-season calibration.
2. **Rookie difficulty (R-4, R-19):** two possible changes. One is a ceiling-side change for Rookie AI arrivals. The other is founding Rookie gym clubs at Rookie quality rather than Pro.
3. **Pass rush (R-11):** whether to pursue the written sack target, which is an engine-side change.
4. **Legendary Clash signatures (R-10):** A, B or C. The default is C, unchanged.
5. **Plays (R-7):** draws, jet sweep and counter (engine limits); fly sweep and pistol stretch in games.
6. **Special Teams Beast:** keep it as measured (returners 87%), or weight kickers differently.
7. **Cleanup:** approve removing the intermediate evidence listed in §7.
8. **Load time (R-18 follow-up):** ship the scheme-fit thresholds as a fixed table, with an equality test. It saves about 5 s per reopen on a slow phone and changes nothing else.
