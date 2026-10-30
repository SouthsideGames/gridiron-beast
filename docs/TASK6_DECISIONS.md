# Task 6 — decision record

This record tracks the owner's decisions on the Task 6 proposal (`docs/TASK6_AI_FRANCHISE_INTELLIGENCE_PLAN.md`, PR #84). Decision
identifiers D1–D16 and T1–T4 are those of the proposal (§8). **Nothing is implemented**: every approval below is a design approval, and
each phase still needs its own authorisation.

| Group | Decisions | Status |
|---|---|---|
| 1 — Aging and Longevity | D1–D8 | **Approved with modifications, 2026-10-30** (below) |
| 2 — Draft Quality and Competitive Balance | D9, D10 | **Presented 2026-10-30, awaiting decision** (below) |
| 3 — AI Roster Intelligence | D13, D14, D15, T3 (and Phase B items) | Not yet presented |
| 4 — Prospect Development | D12 | Not yet presented |
| 5 — Benchmark and Implementation Authorization | D11, D16, Phase 0 | Not yet presented |
| Trading follow-ups | T1–T4 | Owner's provisional preferences recorded: approve T1; roster-compliant offers for T2; valuation-based protection for T3; a limited repeat-trade restriction for T4. Not final authorisation |

## Group 1 — Aging and Longevity (D1–D8): owner decision of 2026-10-30

### Approved as proposed
| # | Decision | Proposal id |
|---|---|---|
| 1 | Position-specific ageing curves: RBs decline earliest; QBs, offensive linemen and kickers generally have longer careers | D1 |
| 2 | Physical attributes decline before technical and mental attributes | D2 |
| 3 | Physical and technical decline increase over time | D2 |
| 4 | Hidden individual longevity, −3 to +3 years, distribution 5 / 10 / 20 / 30 / 20 / 10 / 5 % | D4 |
| 5 | Durability influences longevity and injury risk | D4 |
| 6 | Retirement only in the offseason; **no hard retirement age** | D5, D8 |
| 7 | Retirement is permanent; the GM cannot reverse it | D5 (principle approved earlier) |
| 8 | Legendary monsters stay ageless and never retire | (principle approved earlier) |
| 9 | The same ageing and retirement rules for GM-controlled and AI monsters | D6 |
| 10 | Career-stage labels and offseason retirement notices | D6 |
| 11 | AI franchises judge retirement risk from observable information, never the hidden longevity | D4 |

The decline rates and retirement probabilities are **provisionally approved, subject to simulation testing**.

### Modifications ordered by the owner, and the updated design
All values live in one planning module, `tools/task6/aging-proposal.mjs`. It is not game code: nothing in `src/` imports it.

**Position curve (D1).**

| Position | Physical peak | Physical onset (normal) | Technical onset | Physical rate |
|---|---|---|---|---|
| RB | 23–26 | 27 | 29 | 1.3 |
| WR, CB | 24–27 | 28 | 30 | 1.15 |
| LB, S, DL, TE | 25–28 | 29 | 31 | 1.0 |
| OL | 26–29 | 30 | 33 | 0.9 |
| QB | 26–29 | 30 | 33 | 0.8 |
| K | 28–31 | 32 | 35 | 0.6 |

- **Physical attributes:** speed, agility, strength and durability.
- **Technical and mental attributes:** awareness, accuracy, arm, catching, blocking, tackling, coverage and kicking.
- **Physical loss** per attribute in the y-th season past the (hidden) onset: rate × (1.5 + 0.75 (y − 1)).
- **Technical loss** past the technical onset: 0.75 + 0.5 (y − 1).
- Losses are drawn as integers around those means from the franchise generator, in a fixed order.

**Modification 1: age-adjusted training (replaces "no physical points after onset").** It applies identically to AI and GM monsters.
- **Cost.** A +1 to a physical attribute costs points by seasons past the **public** onset (position plus durability, no hidden longevity, so the cost reveals nothing hidden):

| Seasons past public onset | 0 or before | 1–2 | 3–4 | 5 or more |
|---|---|---|---|---|
| Points per physical +1 | 1 | 2 | 3 | 4 |

  Technical and mental attributes cost 1, and 2 once past the public technical onset.
- **Manual spending.** The GM can still put points into physical attributes; they simply cost more.
- **Automatic level-up gains.** A level-up's three picks that land on a physical attribute succeed with probability 1 / cost.
- **AI spending.** AI auto-spend chooses by position weight ÷ cost, so it prefers the cheaper technical points.
- **Demonstration** (`docs/task6-plan/group1-training-model.txt`; 200 generated starters per position, kept as starters all career). These are the shares of starters aged 33+ who still improve in a season:

| Position | Today's rules | Proposal, AI spending | Proposal, GM putting every point into physical |
|---|---|---|---|
| RB | 14% | 0% | 0% |
| WR | 14% | 0% | 0% |
| LB | 6% | 0% | 0% |
| OL | 9% | 0% | 0% |
| QB | 3% | 0% | 1% |

- **Mean overall under the proposal**, from peak to age 39:
  - RB 71 → 27, WR 72 → 35, LB 74 → 50, OL 72 → 56, QB 73 → 61;
  - today's rules: flat at 73–75.
- **What it shows.** Technical development partly offsets decline in the technique positions (QB 73 at 33, 71 at 35; OL 71 and 68). Physical investment can slow but never reverse decline once it accelerates.
- **Caveat.** In the real game, evolutions raise potential (+4), which this model leaves out. The Phase A benchmark measures the real effect.

**Modification 2: injuries.**
- **One injury factor only.** A retirement roll uses the single most significant injury factor:
  - a severe injury last season (4+ weeks in one injury): ×1.5 odds;
  - else 4+ weeks lost in total: ×1.25;
  - else a career High Injury History: ×1.15.
- **One decline penalty.** A severe injury past the true onset costs −1 to each physical attribute once. It is not stacked with weeks lost.
- **Durability's three channels only:** ±1 year of onset, the existing per-game injury risk, and its own physical decline (which raises that risk). There is no separate durability term in retirement. The projection shows a moderate effect: mean retirement age 30.3–31.1 at durability ≤ 45, 33.0 at 46–74, 34.0–35.2 at 75+ (small samples at the extremes).
- **Other adjustments.** A starter near his peak ×0.5; a reserve 10+ below his peak ×1.8; unsigned ×2.
- **Cap.** 0.97 a year.
- **Base hazard**, by seasons from the career age (true onset + 4): −3: 2%, −2: 5%, −1: 10%, 0: 20%, +1: 35%, +2: 55%, +3: 75%, +4 or more: 90%.

**Modification 3: forecasts under uncertainty (AI and the owner's labels).** A shared outlook from observable data only:
- **Estimated onset:** the public onset (position plus durability).
  - +1 if the monster is past it with no visible physical decline yet;
  - −1 after a visible drop of 4+ physical points in one offseason, or a High Injury History.
- **Estimated retirement window:** [likely − 2, likely, likely + 3], where likely = estimated onset + 5.
- **Estimated next-season risk:** the hazard at that estimate, with the visible modifiers (role, contract, injury class).
- **Who reads it:** succession, contracts and the draft (Phase B), alongside age, position, visible decline, durability, injury history and current performance.
- **Hidden values are never read.** `forecast()` in `tools/task6/aging-proposal.mjs`.

**Modification 4: transition for saves made before the rules (recommended: variant B).** Veterans keep their real ages. With `s` = offseasons under the new rules in that save (1 for the first):
- **Decline** reads min(true seasons past onset, 2s), so an old veteran's decline climbs to its true rate within a few seasons.
- **Retirement hazard** is scaled by min(1, s / 4).
- **Club cap:** while s ≤ 3, at most 15% of a club's roster may retire in one offseason; the rest are re-checked the next offseason.
- **From s = 4** the normal rules apply in full: no permanent extension, no lasting advantage.
- **Storage.** It needs one additive franchise field (the season the rules began). Old saves load unchanged.

Tested on real leagues: franchises played 15 seasons under today's rules, seeds 106 and 107, projected 8 seasons. Retirements per season:

| Seed | Rules at once (no transition) | Variant A (ramp 3, 20% cap for 2) | **Variant B (ramp 4, 15% cap for 3)** | Variant C (ramp 4, 12% cap for 4) |
|---|---|---|---|---|
| 106 | **114**, 41, 21, 27, 21, 30, 43, 32 | 26, 59, 71, 33, 19, 38, 19, 25 | 21, 44, 65, 52, 24, 30, 24, 26 | 21, 44, 58, 46, 30, 32, 29, 31 |
| 107 | **122**, 38, 23, 28, 10, 32, 29, 40 | 19, 67, 75, 30, 23, 25, 26, 30 | 16, 45, 68, 41, 32, 28, 35, 32 | 16, 42, 65, 52, 28, 28, 30, 31 |

- **Without a transition**, the first offseason retires about a fifth of the league's monsters.
- **Variant B** spreads the wave over 4 seasons and peaks at about twice the steady rate.
- **No lasting effect.** By season 5 the starter age (28.0–28.3) and starter overall match the no-transition run within about 1 point (seed 106, season 8: 66.0 with B against 66 without).

### Numerical validation: projection of the proposed rules
Source: `tools/aging-projection.mjs`, seeds 106 and 107 (`docs/task6-plan/group1-projection-seed10{6,7}.txt`). This is a lifecycle model built on the game's own rosters, generators and overall formula. It has no games, nudge or contracts beyond today's 32+ reserve rule, so these are **estimates**; the binding numbers come from the Phase A benchmark on the game itself.

| Measure (new league, 20 seasons) | Seed 106 | Seed 107 | Benchmark band proposed for Phase A |
|---|---|---|---|
| Mean retirement age: RB / WR / CB | 30.7 / 32.0 / 32.1 | 31.1 / 32.2 / 32.4 | RB 29–32, WR and CB 31–34 |
| LB / DL / S / TE | 33.2 / 33.2 / 33.4 / 33.5 | 33.3 / 32.9 / 33.2 / 33.1 | 32–35 |
| QB / OL / K | 34.0 / 34.3 / 37.5 | 34.6 / 34.1 / 36.6 | QB and OL 33–36; K 34–39 |
| Early retirements (≤ position base − 2), by position | 6–35% | 14–35% | ≤ 30% for every position except backup-heavy QB (≤ 35%) |
| Exceptional (≥ position base + 3), by position | 2–20% (K 38%) | 7–19% | 3–20% (K ≤ 40%): possible but uncommon |
| Career length (seasons in the league) p10 / p50 / p90 | 7 / 11 / 15 | 7 / 11 / 15 | p50 9–13; p90 ≤ 18 |
| Retirement age by hidden longevity, against position base (−3 … +3) | −1.9 … +3.7 | −2.5 … +4.2 | monotonic, spread ≥ 4 years |
| Starter mean age, season 10 / 20 | 28.3 / 28.4 | 28.5 / 28.6 | 27–30 |
| Starters aged 33+, season 10 / 20 | 12.0% / 12.6% | 16.1% / 15.5% | ≤ 18% |
| Oldest non-protected starter, season 20 | 36 | 37 | no limit; report |
| Retirements a season across the league, seasons 11–20 | 31 | 31 | 20–50 |
| Veterans (age ≥ public onset + 2) still starting, season 20 | 72% | 70% | ≥ 50% (veterans stay competitive) |
| Physical change per season for starters, by seasons past true onset (1 / 3 / 5 / 7) | −1.6 / −3.1 / −4.5 / −4.8 | −1.6 / −3.1 / −4.5 / −5.7 | increasing decline; never positive past onset |
| Durability effect on retirement age (≤ 45 against 75+) | 31.1 against 34.0 | 30.3 against 35.2 | ≤ 4 years between extremes |
| Old-save transition: peak retirements / steady rate | 65 / about 28 | 68 / about 31 | peak ≤ 2.5× steady; no difference after the transition |

**Reading.** The rules produce the intended shape:
- position order RB < WR/CB < LB/DL/S/TE < QB/OL < K;
- longevity spreads careers by about 6 years;
- starters settle at about 28 years old instead of 35;
- 33+ starters fall from 62% to 12–16%;
- most veterans remain starters.

**Watch items for Phase A tuning:**
- early retirements are high for backup QBs (reserves 10+ below peak retire sooner, by design);
- kicker careers are long;
- neither is forced into a narrow band.

### Remaining technical risks (Group 1)
1. **Evolution and potential.** Evolutions raise potential (+4) and stage changes alter attributes. The model omits them, so real veterans may hold their rating slightly longer; measure in Phase A.
2. **Balance contract.** Turnover rises from about 0 to about 30 retirements a season. Free agency and the nudge refill them with generated veterans at the club's anchor, so league strength should hold. The owner's win-rate band (§45.6) must be re-measured, and the nudge recalibration (Group 2) is a prerequisite.
3. **Save compatibility.**
   - Longevity is derived from the id (no field).
   - The transition needs one additive franchise field.
   - Retired monsters leave through the existing departure path (legend stubs, retirement archive budget, GDD §42.7). Archive growth of about 30 a season must be checked against the storage meter.
4. **Determinism.** New random draws in the offseason shift later sequences. Results stay deterministic, but every stored benchmark hash changes; a new v42.17.0 baseline under the Phase 0 harness is required.
5. **Owner-facing.**
   - The owner's cornerstones and stars will now retire.
   - Retirement notices and career-stage labels are UI work, with phone-width checks.
   - Training costs must be shown wherever points are spent.
6. **Pools and waivers.** Unsigned monsters age and retire too (×2 odds), or the market fills with ancient veterans.
7. **Performance.** All work is offseason-only and linear in league size; no weekly cost.

## Group 2 — Draft Quality and Competitive Balance (D9, D10): presented 2026-10-30, awaiting decision

Evidence: `docs/task6-plan/group2-gym-balance.txt`, `docs/task6-plan/draft-and-gym-seeds106-110.txt`, Task 5.5 data (PR #83).
Every 20-season figure comes from 5 seeds and is provisional. Any balance claim must be confirmed on 10 or more twenty-season seeds before implementation.

### Intended gym advantage (protected; the benchmark must not remove it)
- Gym anchors start 1, 4 or 7 points above their tier (`GYM_TIER`), plus studied tape after a loss to the owner.
- Each gym has one ageless, cap-exempt legendary, and gym coaches get IQ + 0.2.
- Gyms are never slowed by the nudge.
- Gyms should remain favourites and win most AI titles, and each later gym should be harder than the one before.
- **Proposed protection floor**, measured on 10+ seeds × 20 seasons:
  - gym win % against ordinary clubs ≥ 60;
  - gym share of AI titles ≥ 75%;
  - gym team-overall lead over the ordinary mean ≥ 6 at every season from 5 to 20;
  - gym tier order preserved.

### Unintended long-term imbalance (to correct)
- Gym growth of 1.5 a season against 0.5 has no end. The anchor gap is 5.5 / 14.9 / 24.9 at seasons 1 / 10 / 20.
- Ordinary AI clubs become near-permanent losers: 63.6% over 10 seasons (60 seeds) and 91.4% over 20 seasons. They win 4.8% and 1% of titles respectively.
- Gyms reach their anchor through nudge signings: 58.6% of gym starters are generated veterans at season 20.
- The brake slows ordinary clubs above anchor + 4, so ordinary clubs that improve are pushed back. This would also hide Task 6 AI gains.
- Draft classes have fixed quality while anchors grow, so the draft stops supplying starters: 49% → 2.7% of round-1 picks would start.

### Recommendation as presented
- **D9:** draft-class quality and potential rise by `round(0.5 × (year − 1))`, the ordinary growth rate, capped at +10. The owner drafts from the same classes.
- **D10a (measured):** gym growth plateau. 1.5 a season up to season 10, then 0.5 a season (the ordinary rate). Tier offsets, legendary and coach IQ are unchanged.
- **D10b (not yet measured):** an asymmetric band for ordinary clubs. Lift below anchor − 4 (unchanged), but slow only above anchor + 8 (today + 4). Gyms and the rival are unchanged.
- **D10c:** nudge recalibration authorised after Group 1, measured against §45.6. The values are confirmed in Phase 0 and A.
- **Proposed corridor for ordinary clubs**, 10+ seeds × 20 seasons:
  - persistent losers ≤ 50%;
  - 5–15% of AI titles;
  - 20–30% of AI playoff berths;
  - gym lead at season 20 between 6 and 12 team-overall points.
