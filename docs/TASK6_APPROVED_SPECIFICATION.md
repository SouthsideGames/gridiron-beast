# Task 6 — Approved Specification (AI Franchise Intelligence)

The consolidated result of the owner's five decision groups of 2026-10-30. The decisions themselves, in the owner's words, are in
`docs/TASK6_DECISIONS.md`, which governs where the two differ. The original proposal and its evidence are in
`docs/TASK6_AI_FRANCHISE_INTELLIGENCE_PLAN.md`.

**Status.**
- Design approved.
- **Phase 0 authorised; nothing else.** No game code changes until a phase is authorised.
- Every number below is **provisional** until its phase benchmark confirms it.

**Contents:**
1. Approved specification, by system.
2. Phases 0 and A–D.
3. Trading follow-up plan (separate).
4. Quantitative acceptance criteria.
5. Regression and save-compatibility requirements.
6. Outstanding technical risks.
7. Implementation sequence.

**Principles that bind every system:**
- The same rules for GM-controlled and AI monsters, unless a rule says otherwise.
- AI decisions read observable information only, never hidden longevity.
- No new hidden balance mechanism without owner approval.
- Deterministic, from the franchise generator in a fixed order.
- Additive save fields only.
- Pure JavaScript, safe for the browser and Capacitor.
- Heavy work in the offseason; weekly cost negligible.
- The Franchise Legacy System stays separate except where retirement, career progression or roster intelligence directly overlap.

---

## 1. Approved specification

### 1.1 Ageing (Group 1; D1–D4)

**Position curve.** Planning values are in `tools/task6/aging-proposal.mjs`.

| Position | Physical onset (normal longevity) | Technical onset | Physical rate |
|---|---|---|---|
| RB | 27 | 29 | 1.3 |
| WR, CB | 28 | 30 | 1.15 |
| LB, S, DL, TE | 29 | 31 | 1.0 |
| OL | 30 | 33 | 0.9 |
| QB | 30 | 33 | 0.8 |
| K | 32 | 35 | 0.6 |

**Attributes.**
- Physical: speed, agility, strength, durability.
- Technical and mental: everything else.

**Decline.**
- Physical loss in the y-th season past the true onset: rate × (1.5 + 0.75 (y − 1)).
- Technical loss past the technical onset: 0.75 + 0.5 (y − 1).
- Both are integer draws around the mean.

**Hidden longevity.**
- −3 to +3 years, distribution 5 / 10 / 20 / 30 / 20 / 10 / 5 %.
- Derived from the monster's id, so there is no stored field.

**Durability.**
- 75 or more shifts onset one year later; 45 or less, one year earlier.
- It also acts through the existing injury risk. There is no separate retirement term.

**Public onset.** Position plus durability, without longevity. This is what training cost and forecasts read.

**Legendaries and the rival's signature monster** stay ageless and never retire.

### 1.2 Age-adjusted training (Group 1 Modification 1)

**Cost of a physical +1,** by seasons past the public onset:

| Seasons past onset | 0 or before | 1–2 | 3–4 | 5+ |
|---|---|---|---|---|
| Cost | 1 | 2 | 3 | 4 |

**Rules.**
- A technical +1 costs 1, and 2 past the public technical onset.
- A level-up's automatic physical pick succeeds with probability 1 / cost.
- AI auto-spend weights options by position weight ÷ cost.
- The GM can still buy physical points at the higher cost.
- Training cost is shown wherever points are spent.

### 1.3 Retirement (Group 1; D5–D8)

**When.** In the offseason only. There is no hard age, and retirement is permanent.

**Base hazard,** by seasons from the career age (true onset + 4):

| Seasons from career age | −3 | −2 | −1 | 0 | +1 | +2 | +3 | +4+ |
|---|---|---|---|---|---|---|---|---|
| Hazard | 2% | 5% | 10% | 20% | 35% | 55% | 75% | 90% |

**Odds multipliers.**
- A starter near his peak: ×0.5.
- A reserve 10+ below his peak: ×1.8.
- Unsigned: ×2.
- **One** injury factor, the most significant that applies:
  - a severe injury last season: ×1.5;
  - else 4+ weeks lost: ×1.25;
  - else a High Injury History: ×1.15.
- Capped at 0.97.

**Severe-injury decline.** A severe injury past onset costs −1 to each physical attribute, once.

**Exit path.** Through the existing departure path: a "retired" career event, legend stubs for decorated monsters, and the retirement archive budget (GDD §42.7).

**Who it applies to.** GM monsters retire under the same rules. Career-stage labels and offseason retirement notices are shown.

### 1.4 Forecasts (Group 1 Modification 3)

**Estimated onset.**
- Starts from the public onset.
- +1 if the monster is past it with no visible decline yet.
- −1 after a visible drop of 4+ physical points, or with a High Injury History.

**Estimated retirement window:** [likely − 2, likely, likely + 3], where likely = estimated onset + 5.

**Next-season risk:** the hazard at the estimate, with the visible modifiers.

**Who reads it:** AI succession, contracts and drafting, and the GM's labels. Hidden values are never read.

### 1.5 Old-save transition (Group 1 Modification 4; variant B)
- Real ages are kept.
- With s = offseasons under the new rules (1 for the first), decline reads min(true seasons past onset, 2s), and the hazard is scaled by min(1, s/4).
- While s ≤ 3, at most 15% of a club's roster may retire in one offseason.
- From s = 4 the normal rules apply.
- Needs one additive franchise field.

### 1.6 Draft-class quality (Group 2; D9)
- Class overall and potential rise by about +0.5 a season, capped at +10.
- The gem / solid / project distribution is unchanged.
- The same classes for GM and AI.
- Deterministic, with no migration needed.
- **Must show:** no excessive rookie strength, and veterans keep their value.

### 1.7 Competitive balance (Group 2; D10)

**Gym growth plateau (D10a).**
- Gym anchors grow +1.5 a season through season 10, then +0.5.
- Kept unchanged: tier offsets, legendaries, coaching advantage, studied tape and gym progression.

**Ordinary-club XP slowdown (D10b).**
- Test +4, +6 and +8; +8 is the proposal.
- Lift below anchor − 4 is unchanged at first.
- No hidden penalty for being competitive.

**Runaway-veteran rule.**
- Test +4, +6 and +8 alongside the slowdown.
- The owner prefers aligned thresholds.
- Cap pressure and normal departures are kept.

**Nudge recalibration.**
- Authorised as design and testing within the phases.
- Accounts for turnover, ageing, draft quality, development, gym anchors and the wider band.
- No new hidden balance mechanism.

**Rebuilding clubs and the nudge.**
- Not changed.
- Options 1, 2 and 3 are evaluated in Phase D. The owner's preference is option 2: younger generated replacements, aged 22–26.
- A change needs owner approval with evidence.

**Gym protection floor (provisional target).**
- Gym win rate against ordinary clubs ≥ 60%.
- Gym share of AI titles ≥ 75%.
- Gym team-overall lead ≥ 6 in seasons 5–20.
- Tier order kept.
- Outcomes are never forced to meet it. Conflicts are reported.

**Ordinary-club health (provisional evaluation targets, not pass/fail until shown achievable).**
- Persistent losers ≤ 50%.
- 5–15% of AI titles.
- 20–30% of playoff berths.
- Gym team-overall lead at season 20 about 6–12.

### 1.8 AI roster intelligence (Group 3; D13–D15, T3)

**R1 — shared roster plan.**
- Built once per offseason per AI club, and read by every AI roster decision.
- **It evaluates:**
  - strength against the league at each position (D15);
  - starter age and expected decline;
  - retirement risk;
  - successors;
  - potential;
  - cap commitments;
  - draft capital;
  - competitive position.
- **Thresholds:**
  - weak at −4 against the league position benchmark;
  - approaching decline within 2 seasons;
  - a successor is aged 26 or under, within 8 overall or with realistic potential to reach that;
  - a successor is ready within 4.

**R2 — strategy modes: Contend, Compete, Retool, Rebuild.**
- **Inputs:** recent results, roster quality, age distribution, salary commitments, draft capital.
- **Stability:**
  - a change normally needs two consecutive evaluations;
  - immediate on a major shift;
  - a rebuild normally lasts at least 2 seasons.
- Gyms never fall below Compete, but stay fully intelligent otherwise.

**R3 — contracts.**
- 1-, 2- or 3-year deals by projected performance, decline, retirement risk, cap, replacements and strategy.
- Lengths by age are guidelines; an exceptional veteran may get longer.
- The age-32 reserve rule is replaced by position-specific evaluation.
- Valuable successors are protected from unnecessary expiry, but not forced through.

**R4 — rebuilding clubs selling starters (D13).**
- One starter sale per window (test).
- **Conditions:**
  - the player is approaching or past decline;
  - the club receives young players or picks;
  - the club keeps a legal lineup;
  - the player is not protected;
  - the buyer has a legitimate need;
  - existing valuation and integrity rules are met.
- Never young stars.
- The limit is not raised without approval.

**R5 — free-agency upgrades (D14).**
- **Triggers:** a weak group or succession need, with legal finances and a +3 improvement.
- May release the weakest expendable reserve. **Never:**
  - protected monsters;
  - necessary injury cover;
  - a valuable successor without a better replacement;
  - a release that breaks roster or cap rules.
- 2 upgrades per offseason for contenders, 1 for others.
- Pools only; the GM keeps first choice.

**R6 — successor valuation (T3).**
- A qualifying successor is valued at 0.8 of a starter when the starter is within 2 seasons of decline (or past it), and 0.6 at 3–4 seasons. This replaces 0.45.
- Applied in AI–AI deals and in AI valuation of GM deals.
- Never untradeable.

**R7 — drafting.**
- +4 for a succession need; up to +3 for a weak position; −3 at a position with a strong young starter and successor.
- Contenders favour readiness. Rebuilders weight potential 0.35 against 0.20 (test).
- Randomness, the kicker penalty and the duplicate penalty are kept.
- Need must not cause consistently inferior picks.

### 1.9 Prospect development (Group 4; D12)

**C1 — development slots.**
- 6 per club, at most 2 per position.
- **Eligibility:** reserves aged 25 or under, healthy, with potential ≥ overall + 3.
- **Practice XP:**
  - 0.35 × base game XP after each completed game (benchmark 0.35 against 0.50; preference 0.35);
  - no win or stat bonus;
  - no extra injury or fatigue roll;
  - the XP slowdown applies;
  - existing level-ups;
  - **never on top of starter XP for the same game.**
- No XP multiplier by draft classification.

**C2 — maturation.** One position-weighted +1 each offseason through age 24, never above potential. Applies to starters and reserves alike.

**GM slots.**
- Filled automatically by the same priority, with manual override.
- Manual choices persist until changed or until the monster becomes ineligible; then the game explains why and suggests a replacement.
- Development XP is shown after games.
- Works on mobile.
- Additive save field.

**Deferred.** Real-game developmental snaps. The engine is not changed in Task 6.

---

## 2. Phases

| Phase | Contents | Depends on | Status |
|---|---|---|---|
| **0** | Harness v4 (recording only), v3 reproduction, written thresholds, v42.17.0 baselines on all seed sets, owner drift check, comparison tools, methodology, reproducibility checks | — | **Authorised** |
| **A-1** | Ageing, age-adjusted training, retirement, old-save transition, career-stage labels, retirement notices | 0 | Planned |
| **A-2** | Draft scaling, gym plateau, XP-slowdown and runaway threshold comparisons (+4/+6/+8), initial nudge recalibration (checkpoint 1) | A-1 | Planned |
| **B** | Roster plan (R1, D15), succession, contracts (R3), successor valuation (R6/T3), need-aware drafting (R7), successor protection in cap trims | A | Planned |
| **C** | Development slots (C1, AI and GM UI), maturation (C2), free-agency upgrades (R5), evolution checks, recalibration checkpoint 2 | B | Planned |
| **D** | Strategy modes (R2), starter sales (R4), mode-specific weights in R3/R5/R7, rebuilding-nudge experiments, final recalibration (checkpoint 3), long-term held-out confirmation | C | Planned |

**Every phase needs:**
- its own authorisation;
- its own branch and PR;
- a benchmark report against v42.17.0 (and the previous phase);
- a review checkpoint.

## 3. Trading follow-up plan (separate track)

| Item | What | Status | When |
|---|---|---|---|
| **T1** | Offseason-opening offer fix: move `maybeTradeCall` after `s.finished = true` (patch `docs/task6-plan/d1-offseason-offer-fix.patch`, tested in scratch only) | Owner inclined to approve; **needs separate approval** | Any time; independent of Task 6 |
| **T2** | Offers when rosters are full: roster-neutral swaps, the widened swap match, offseason picks-only buys (owner prefers roster-compliant offers) | **Needs separate approval** | After T1 |
| **T3** | Successor valuation (R6) | Approved in design | **Phase B** |
| **T4** | AI–AI repeat-trade restriction: not again the same season, no return within a year; the owner prefers a limited version | **Needs separate approval** | Independent |

**Release and success criteria for each trading item:**
- **Released** through the normal process, with the trading tests (T3–T10).
- **T1:** one offseason attempt per season.
- **T2:** offers persist after season 2 at about 0.1+ a season, 100% legal, none past week 8.
- **T3:** succession cover ≥ 21.4% (v42.16.0), with Task 5's gains kept.
- **T4:** re-trades within a season ≤ 0.5%.

## 4. Quantitative acceptance criteria

**Classes:**
- **Hard gate:** the phase fails.
- **Target:** report, explain, recommend; never quietly tune.
- **Monitor:** report only.

**Where things are defined:**
- Baselines are the Phase 0 v42.17.0 runs (`docs/task6-phase0/`).
- Exact definitions and statistics: `docs/TASK6_PHASE0_METHODOLOGY.md`.
- Machine-readable form: `docs/task6-phase0/thresholds.json`.

**Hard gates (every phase):**
- integrity 0;
- deterministic (same seed, same hash);
- legal rosters and cap at every check;
- save play-through and round trip;
- full suite (671+ tests) on the final commit, none weakened or removed;
- trading tests;
- §45.6 on each difficulty: owner ±5, AI mid-season ±2;
- owner drift against v42.17.0, seasons 1–8, within ±5 on each difficulty;
- Stage P time ≤ +10%;
- phone-width browser checks for affected screens.

**Targets by phase.** Baselines and bands are filled from Phase 0.

| Measure | Phase | Target (provisional) |
|---|---|---|
| Mean retirement age by position | A-1 | RB 29–32; WR, CB 31–34; LB, DL, S, TE 32–35; QB, OL 33–36; K 34–39 |
| Early (≤ base − 2) / exceptional (≥ base + 3) retirements | A-1 | ≤ 30% (backup QB ≤ 35%) / 3–20% (K ≤ 40%) |
| Career length p50 / p90 | A-1 | 9–13 / ≤ 18 |
| Retirement age by longevity | A-1 | monotonic; spread ≥ 4 years |
| Starter mean age, season 10 / 20 | A-1 | 27–30 |
| Starters aged 33+, season 20 | A-1 | ≤ 18% |
| Retirements a season (seasons 11–20) | A-1 | 20–50 |
| Veterans (≥ public onset + 2) still starting | A-1 | ≥ 50% |
| Physical change per season past onset | A-1 | never positive; increasing decline |
| Durability effect (≤ 45 against 75+) | A-1 | ≤ 4 years |
| Old-save transition peak / steady retirements | A-1 | ≤ 2.5×; no lasting difference |
| Rookie strength (D9) | A-2 | round-1 picks do not routinely start in season 1 above established starters; veteran share of starters reported |
| Gym protection floor | A-2 onward | win rate ≥ 60%; title share ≥ 75%; lead ≥ 6 in seasons 5–20; tier order |
| Ordinary-club health | A-2 onward | persistent losers ≤ 50%; titles 5–15%; playoff berths 20–30%; season-20 lead 6–12 (evaluation only) |
| Generated-veteran share of gym starters | A-2 onward | report against baseline |
| Ordinary XP slowdowns and suppressed development | A-2 onward | report |
| Succession cover (30+ starters with a successor), B / C samples | B | ≥ 40% / ≥ 30% |
| Young successors traded away | B | below baseline |
| Persistent weak group (club-relative) / with cap room / position-relative | B, C | ≤ 8% / ≤ 5% / −30% |
| Misaligned draft picks | B | ≤ 15%, with no fall in pick quality |
| Contract-length distribution | B | 1-, 2- and 3-year deals all present; expiries staggered |
| Young reserves' 3-season gain | C | ≥ +3, with a measured gap to starters |
| Round-1 starting within 2 seasons, all / drafted in years 12+ | B, C | ≥ 35% / ≥ 30% |
| Gem / solid / project development | C | ordered by potential |
| Evolutions per prospect against baseline | C | report; recommend if excessive |
| Mode stability (changes a club per 10 seasons) | D | report |
| Rebuilding clubs after 3 seasons (age, potential) | D | younger and higher potential than baseline |
| Recovery from ≤ 2 wins to ≥ 5 | D | report; improved only if anchors permit |

**Monitor (every phase):**
- championship distribution;
- unique champions;
- gym and ordinary playoff representation;
- the hands-off owner's win rate in seasons 9–20 (drift);
- league strength progression;
- unusual roster or contract patterns.

## 5. Regression and save-compatibility requirements

**Tests.**
- Targeted tests by area while building (`docs/TESTING_POLICY.md` §2).
- The full suite once on each phase's final commit.
- Browser checks at phone width for any changed screen.
- New unit tests for every rule:
  - curves, costs and the hazard;
  - the transition;
  - draft scaling;
  - anchor and brake widths;
  - the roster plan;
  - contract choice;
  - modes;
  - the sale and upgrade rules;
  - slots and maturation.
- The Task 5 trading tests every phase.

**Determinism.**
- Every phase runs `tools/task6-harness-check.mjs` (non-interference and determinism) and records new baseline hashes wherever simulation output legitimately changes.

**Save compatibility.**
- **Additive fields only:**
  - the transition start season;
  - the strategy mode, in the existing `clubRecord.strategy`;
  - GM slot assignments.
- **Derived, never stored:** longevity and the roster plan.
- **Old saves** (v42.16 and v42.17; mid-season, offseason and draft) load and play through `tools/save-compat-check.mjs`, and a save round trip leaves the league registry unchanged.

**Storage.**
- Retirement adds about 30 archived monsters a season; this is checked against the storage meter (GDD §42.7, §45.8).

## 6. Outstanding technical risks

1. **Evolution.**
   - Evolutions raise potential (+4) and were left out of the ageing and development models.
   - Practice XP raises AI evolution frequency.
   - Measured in A-1 and C.
2. **Balance coupling.** Turnover, draft scaling, development and the wider slowdown band all raise ordinary rosters, so thresholds must be calibrated jointly; the three checkpoints exist for this.
3. **Gym floor against the ordinary corridor.**
   - These may be incompatible.
   - The plateau measured a season-20 gym lead of 10.0 on 5 seeds; a wider band may push it towards 6.
   - Report, never force.
4. **The owner-contract yardstick moves with the anchors.**
   - §45.6 compares with a generator that reads the same anchors.
   - The drift check covers absolute difficulty, but the hands-off owner is only a proxy (Phase 0 methodology §5).
5. **Cap lock-in** from 3-year deals, and `trimToCap` releasing successors. Phase B protects successors where legal.
6. **The rebuild-nudge interaction.** It can only be measured once Rebuild mode exists (Phase D).
7. **Determinism shifts.** New random draws change every stored benchmark hash, so each phase records new baselines; v3 and v4 hashes remain the historical record.
8. **Owner experience.**
   - The GM's stars retire.
   - Training costs rise with age.
   - Successors cost more in trades.
   - Pools are more contested.
   - All need clear UI, and owner-difficulty drift is gated.
9. **Compute.**
   - A full 10-seed 20-season run is about 1 hour on 2 lanes; a calibration round with three widths is about 3–4 hours.
   - The Phase 0 baseline is about 5 hours.
10. **Performance.** Ageing, retirement and planning are offseason-only; practice XP is per game and small. Stage P is gated at +10%.

## 7. Implementation sequence

| Order | Step | Gate to proceed |
|---|---|---|
| 1 | **Phase 0** | v4 reproduces v3; non-interference; baselines; owner reviews the thresholds; **owner authorises A-1** |
| 2 | A-1 | Hard gates; Group 1 targets reported; owner authorises A-2 |
| 3 | A-2 (checkpoint 1) | Hard gates; balance report on 10+ twenty-season seeds; owner chooses widths; authorises B |
| 4 | B | Hard gates; Group 3 targets; **M1 release decision (A + B)**; owner authorises C |
| 5 | C (checkpoint 2) | Hard gates; Group 4 targets; **M2 release decision**; owner authorises D |
| 6 | D (checkpoint 3, held-out confirmation) | Hard gates; all targets reported; **M3 release decision** |
| — | T1, T2, T4 | Each by separate approval, at any point |

Merging to `main` and publishing are separate authorisations at every step.
