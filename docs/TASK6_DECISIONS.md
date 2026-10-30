# Task 6 — decision record

This record tracks the owner's decisions on the Task 6 proposal (`docs/TASK6_AI_FRANCHISE_INTELLIGENCE_PLAN.md`, PR #84). Decision
identifiers D1–D16 and T1–T4 are those of the proposal (§8). **Nothing is implemented**: every approval below is a design approval, and
each phase still needs its own authorisation.

| Group | Decisions | Status |
|---|---|---|
| 1 — Aging and Longevity | D1–D8 | **Approved with modifications, 2026-10-30** (below) |
| 2 — Draft Quality and Competitive Balance | D9, D10 | **Approved with modifications, 2026-10-30** (below); numbers provisional pending Phase A testing |
| 3 — AI Roster Intelligence | D13, D14, D15, T3 (and Phase B items) | **Approved with modifications, 2026-10-30** (below); thresholds provisional |
| 4 — Prospect Development | D12 | Presented 2026-10-30, awaiting decision (below) |
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

## Group 2 — Draft Quality and Competitive Balance (D9, D10): presented 2026-10-30 (decision recorded below)

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

### Owner decision on Group 2 (2026-10-30): approved with modifications
**D9 — draft-class quality.** Provisionally approved, pending Phase A testing.
- Class overall rises by about +0.5 a season, with matching potential scaling, capped at +10.
- The gem / solid / project distribution is unchanged.
- The same rules apply to the owner and AI.
- Generation stays deterministic, and existing saves need no migration.
- **Validation.**
  - No excessive rookie strength.
  - Veterans keep their value.
  - Evaluated together with Group 1 (ageing and retirement) and Group 4 (development).

**D10a — gym growth plateau.** Approved.
- Gyms grow +1.5 a season through season 10, then +0.5 (the ordinary rate).
- Unchanged: tier offsets, legendaries, coaching advantage, studied tape, and the progression of gym difficulty.
- Purpose: stop an endlessly growing advantage, not make gyms ordinary.

**D10b — ordinary-club brake.** Testing approved; the threshold is provisional.
- Slow ordinary clubs only above anchor + 8 (today + 4). Lift for clubs below their anchor is unchanged at first.
- Compare +4, +6 and +8 on matched seeds; +8 is adopted only if it gives the best balance.
- No hidden penalties for an ordinary club simply because it is competitive.

**D10 — nudge recalibration.** Authorised for design and testing within Phase A; this does not authorise implementation.
- **Must account for:**
  - retirement turnover;
  - position-specific ageing;
  - draft quality;
  - prospect development;
  - gym anchor changes;
  - the wider band.
- **No additional hidden balance mechanisms** without owner approval.

**Gym protection floor.** Provisional design target.
- Gym win rate ≥ 60% against ordinary clubs.
- Gym share of AI titles ≥ 75%.
- Gym team-overall lead ≥ 6 in seasons 5–20.
- Tier order preserved.
- Outcomes are never forced to meet it: if it conflicts with realistic development or integrity, report the conflict and recommend adjustments.

**Ordinary-franchise competitive health.** Provisional evaluation targets, not pass/fail until the benchmark shows they are achievable.
- Persistent losers ≤ 50%.
- About 5–15% of AI titles.
- About 20–30% of playoff berths, subject to league structure.
- Season-20 gym lead of about 6–12.
- Ordinary success must come from roster decisions.

**Benchmark requirements (Group 2).**
1. At least 10 independent 20-season seeds for long-run balance claims.
2. Matched seeds against v42.17.0.
3. Held-out seeds 61–80 for confirmation.
4. Gym and ordinary clubs measured separately.
5. Championship diversity, persistent losing and playoff representation measured.
6. Share of gym starters from generated-veteran assistance tracked.
7. Ordinary-club XP slowdowns tracked, including whether they suppress successful AI development.
8. Owner win-rate contract (§45.6) verified.
9. Determinism, legal rosters, cap integrity and save compatibility preserved.
10. Observed outcomes distinguished from projections.
- Success is never declared on championship distribution alone.

### Remaining calibration risks (Group 2)
1. **Runaway-veteran rule (code evidence, new).**
   - `leagueContracts` lets an AI club whose team overall is more than `BAND` (4) above its pre-season target release expiring veterans aged 27+ (`RUNAWAY_VETERAN_AGE`).
   - So the +4 threshold appears in a second place besides the XP brake.
   - Under D10b, an ordinary club between +4 and +8 would no longer be slowed but would still shed veterans.
   - **Recommendation:** test the runaway threshold at the same width as the brake (+4 / +6 / +8). It is an approved attrition rule (decision A), so this is raised for the owner, not changed.
2. **Interactions.** Draft scaling, retirement turnover and the wider band all raise ordinary rosters at once, so the lift and runaway thresholds must be calibrated jointly, not one at a time.
3. **Gym floor against plateau.** The plateau measured a team-overall gym lead of 10.0 at season 20 on 5 seeds. With the wider band the lead may fall towards the floor of 6. If the floor and the ordinary corridor conflict, report the conflict rather than tune the outcome.
4. **Owner contract.** All Group 2 changes alter the league's strength curve, so §45.6 needs re-measurement on every difficulty. The hands-off owner proxy is not the contract itself.
5. **Cost.** 10 twenty-season seeds for each of 3 brake widths (plus the runaway variants) is about 3–4 hours on 2 lanes per calibration round. Phase A should budget at least two rounds.

## Group 3 — AI Roster Intelligence (D13, D14, D15, T3; Phase B and D designs): presented 2026-10-30 (decision recorded below)

### Shared principles
- Every decision reads observable data only (Group 1, Modification 3): the forecast window, never hidden longevity.
- There is no new balance mechanism (Group 2): anchors, nudge and arrivals keep their rules, and AI success must come from roster decisions.
- All work happens in the offseason. The cost is linear in league size, with no weekly cost.
- No new random draws except the existing draft noise.
- The only stored state is the strategy mode, added to the existing `clubRecord.strategy`. A missing value is read as "Compete", so existing saves still load.

### R1 — Roster plan (B1, B4, D15)
Derived once per offseason per AI club, after retirements and before contracts. Not stored.

For each position group:
- **Gap:** the starter group's mean minus the league mean of starters at that position that season. This is D15, the position-relative measure, and replaces the club-relative `positionNeeds` term.
  - Weak at a gap of −4 or worse; severe at −8 or worse.
- **Horizon:** for each starter, the forecast decline onset minus his age. "Ageing" means a horizon of 2 or less, or already past onset.
- **Successor:** the best backup aged 26 or under (or at least 4 years younger than the starter) who is within 8 overall of the starter, or whose potential is at or above the starter's overall. He is "ready" when within 4.
- **Needs:**
  - Succession need 2: an ageing starter with no successor.
  - Succession need 1: a successor who is not ready while the starter's horizon is 1 or less.
  - Weakness need: from the gap.
  - These needs are read by the draft, contracts, free agency and trades.

### R2 — Strategy mode (Phase D)
**Modes:** Contend, Compete, Retool, Rebuild.

**Inputs:**
- two-season win % (because 10-game seasons are noisy);
- team overall against the league mean;
- share of starters past onset;
- next-season salary committed;
- own draft picks.

**Rules:**
- **Contend:** two-season win % ≥ 0.60, or team overall ≥ league mean + 3 with fewer than 40% of starters ageing.
- **Rebuild:** two-season win % ≤ 0.35 and (≥ 40% of starters ageing, or committed salary above 90% of the cap).
- **Retool:** two-season win % ≤ 0.35 with a young roster.
- **Compete:** everything else.

**Hysteresis:** a change needs the new condition in two consecutive offseasons, or a swing of ≥ 0.30 in win %. Rebuild lasts at least 2 seasons.

**Gyms (option):** gyms never go below Compete, an open intended advantage that preserves the boss role. The alternative is the same rules as everyone else.

### R3 — Contracts (B3)
- **Re-signing:** by projected overall over the term (from the forecast), against the monster's role.
- **Length:** 3 years until onset − 2; 2 years near onset; 1 year past onset. This staggers expiries.
- **Starters past onset:** re-signed for 1 year if the club is Contending or has no ready successor; otherwise allowed to walk.
- **Successors:** a designated successor always counts as "value" and is re-signed as a reserve.
- **Reserve age limit (option):** replace the fixed `RESIGN_AGE_LIMIT` 32 with a position-aware limit: no new deal for a reserve past his public onset + 2.
- **Unchanged:**
  - the runaway rule (its threshold is under test, per the Group 2 risks);
  - `trimToCap`;
  - `renewalAsk`.

### R4 — Rebuilding and starter sales (D13)
- Rebuild-mode clubs may sell a starter to an AI club. This changes the approved rule that AI sellers sell only spares.
- **Who may be sold:**
  - only a starter aged at least his public onset − 1;
  - never a successor, never a protected monster.
- **Payment:** picks and/or monsters aged 25 or under only.
- **Seller safeguards:**
  - the seller keeps a legal lineup;
  - the seller has a replacement within 8 overall, or a successor.
- **Limits:**
  - at most one starter sold per window;
  - buyers must be Contend or Compete clubs with a need at that position.
- **Owner trades:** unchanged here. Rebuilders offering veterans to the owner belongs to the T2 track, if approved.

### R5 — Free-agency upgrades (C3, D14)
- **When:** a starting group is weak (gap ≤ −4) or has a succession need, the club has cap room, and a pool candidate is +3 over the starter (or is a successor-age fit).
- **Making room:**
  - the club may release its weakest unprotected spare, never a successor and never below the legal composition;
  - limit of 2 upgrades per offseason for Contend clubs, 1 for others.
- **Source:** pool candidates only. Generated arrivals keep today's anchor rule, so there is no new generation rule.
- **Owner:** the owner still has first choice (AI free agency runs after the owner, decision F), and released spares join the pools.

### R6 — Successor protection (T3 / A4)
- **Valuation:** in `rosterWorth`, the designated successor's role share rises from 0.45 to:
  - 0.8 when the starter is within 2 seasons of forecast onset or past it;
  - 0.6 when he is 3–4 seasons away;
  - 0.45 otherwise.
- **Where it applies:** whenever an AI club prices its own roster — AI–AI deals, the owner's proposals and incoming offers.
- **Owner:** the owner's own monsters are unaffected.
- Contracts (R3) and free-agency releases (R5) also never discard a successor.

### R7 — Drafting (B2)
- **Score:** the existing score, plus +4 for a succession need at the position, plus up to +3 for a weak group, minus 3 at a position with a good young starter and a successor.
- **By mode:**
  - Contend raises the overall weight (readiness);
  - Rebuild raises the potential weight from 0.2 to 0.35.
- **Unchanged:** the noise, the kicker penalty and the duplicate penalty. The owner's picks are unaffected.

### Expected effects (projections; not measured)
**By season 10:**
- succession cover from 17.6% to at least 40%;
- persistent weak groups with cap room from 9.8% to at most 5%;
- misaligned picks from 24.5% to at most 15%;
- staggered expiries;
- rebuilding clubs younger, with higher potential, after 3 seasons.

**By season 20:**
- succession cover from 10.7% (6.6% at season 20) to at least 30%;
- shorter losing streaks (up to 14 seasons today);
- a better recovery rate from 2-win seasons (46.7% never recover today).

Titles are not a target. The nudge and anchors still bound outcomes, and the wider band from D10b lets some gains show.

### Risks
1. Mode oscillation (handled by hysteresis).
2. Contract churn, and cap lock-in from 3-year deals.
3. A tighter owner market: successors become pricier and the pools more contested.
4. Task 5 trading gains (T3–T10) must still pass.
5. Rebuild selling could weaken the gym floor if gyms rebuild (handled by the gym option).
6. Gains can stay invisible if the D10b band is not widened.

### Owner decision on Group 3 (2026-10-30): approved with modifications. All numbers are provisional pending benchmarks.

**R1 / D15 — shared roster plan.** Approved.
- One coordinated plan per AI club each offseason, and every AI roster decision reads it.
- **What the plan evaluates:**
  - position strength against the league;
  - starter age and expected decline;
  - retirement risk;
  - successor availability;
  - development potential;
  - cap commitments;
  - draft capital;
  - competitive position.
- **Thresholds:**
  - weak at −4 against the league position benchmark;
  - approaching decline within 2 seasons of forecast;
  - a successor is aged 26 or under, within 8 overall or with realistic potential to reach that level;
  - a successor is ready within 4.

**R2 — strategy modes.** Approved: Contend, Compete, Retool, Rebuild.
- **Inputs:** recent results, roster quality, age distribution, salary commitments, draft capital.
- **Stability:**
  - a change normally needs two consecutive evaluations;
  - an immediate change is allowed after a major shift;
  - a rebuild normally lasts at least 2 seasons.
- **Gyms** never fall below Compete. They must still recognise ageing starters, develop successors, manage contracts and fix weaknesses: the floor must not make them unintelligent.

**R3 — contracts.** Approved: flexible 1-, 2- or 3-year deals.
- **Inputs:** current overall, projected performance, position decline, retirement risk, cap impact, replacement availability, strategy.
- Age-based lengths are guidelines; an exceptional veteran may get longer when projection justifies it.
- The fixed age-32 reserve rule is replaced by position-specific evaluation.
- Valuable young successors are protected from unnecessary expiry. They are not forced through when unaffordable, no longer viable, or replaced by better prospects.

**R4 / D13 — rebuilding clubs selling starters.** Approved, testing one starter sale per window.
- **Conditions:**
  - the player is approaching or past decline;
  - the club receives useful young players or draft capital;
  - the club keeps a legal lineup;
  - the player is not protected;
  - the buyer has a legitimate need;
  - existing valuation and integrity rules are met.
- Productive young stars are never sold indiscriminately.
- Evaluate whether one sale per window is too restrictive, but do not raise it without approval.

**R5 / D14 — free-agency upgrades.** Approved.
- **Triggers:** a weak starting group, or a succession need, with a legal finance position and a meaningful improvement (+3 provisional).
- Releasing the weakest expendable reserve is approved.
- **Never release:**
  - protected monsters;
  - necessary injury replacements;
  - valuable designated successors without a better replacement;
  - anyone whose release breaks roster or cap rules.
- **Limits:** 2 upgrades per offseason for contenders, 1 for others.
- Pools only; the GM's free-agency priority is kept.

**R6 / T3 — successor protection.** Approved, provisional.
- A qualifying successor is valued at 0.8 of a starter when the starter is within 2 seasons of decline or declining, and 0.6 at 3–4 seasons. Both replace 0.45.
- Applied consistently in AI–AI deals and in AI valuation of deals with the GM.
- Successors are never untradeable: a sufficiently valuable offer overcomes the premium, subject to protection and legality.

**R7 — need-aware drafting.** Approved.
- +4 for a succession need; up to +3 for a weak position; −3 at a position with a strong young starter and successor.
- Contenders favour immediate contribution; rebuilders weight potential more.
- Test a rebuild potential weight of 0.35 against 0.20.
- Draft randomness, the kicker penalty and the duplicate penalty are kept.
- Need bonuses must not make clubs consistently pick significantly inferior prospects.
- Both draft quality and positional suitability are measured.

**Group 2 follow-up — runaway veteran rule.** Approved for experiment.
- Test the veteran-release threshold at anchor +4, +6 and +8 alongside the XP-slowdown thresholds.
- The owner prefers aligning both thresholds if the benchmark supports it.
- Legitimate cap pressure and normal veteran departures are kept.

**Benchmark requirements (Group 3).**
- **Compared against:** the Task 5.5 baseline and the approved Phase A foundation.
- **Measures:**
  - succession coverage;
  - weak-position persistence;
  - picks spent at unneeded positions;
  - young successors traded away;
  - contract-length distribution;
  - veteran retention and retirement;
  - free-agency starter improvements;
  - rebuilding recovery rates;
  - strategy-mode stability;
  - gym roster intelligence;
  - cap and roster integrity;
  - the existing trading regression tests.
- Held-out seeds and at least 10 twenty-season seeds for long-run conclusions. Projections are never treated as confirmed results.

### Interactions: strategy modes, contracts, trading and balance anchors
1. **Mode inputs do not read the anchor.** Modes use results and roster facts, not `teamOvr − target`, so a club cannot be steered into a mode by the balance system itself.
2. **Rebuild against the nudge (code evidence).**
   - A rebuilding club that sells veterans can fall more than 4 below its anchor.
   - The nudge then signs up to 3 generated veterans aged 24–30 at target + 2, partly undoing the rebuild.
   - **Options for the Phase A recalibration (owner decision; not changed here):**
     - leave as is;
     - make the nudge's arrivals for a Rebuild club younger (for example 22–26) at the same quality;
     - count draft picks gained towards the lift.
3. **Contend against the runaway rule.**
   - An ordinary Contend club above +4 today sheds expiring veterans aged 27+, contradicting R3's one-year veteran deals.
   - The aligned-threshold test (+4 / +6 / +8) resolves this, and the result is reported per mode.
4. **The brake and development.** A slowed club's XP scale applies to all its XP. Under D10b that happens only above +8.
5. **Contracts against the cap.**
   - Three-year deals raise committed salary.
   - `trimToCap` releases the reserve with the lowest value per salary, which can be a successor or prospect.
   - Phase B should give successors the same release protection in cap trims as in R5, where legal.
6. **Trading.**
   - Successor premiums change payment choices in the Task 5 search, and starter sales add a new class of deal (Rebuild → Contend/Compete).
   - The Task 5 tests (T3–T10) and the persistent-weak measures must still pass.
   - The T4 flip lock applies to sold starters too.
7. **Gyms.** The Compete floor removes Rebuild selling for gyms only. R1, R3, R5, R6 and R7 apply to them in full, which supports the gym protection floor (Group 2) without forcing outcomes.

## Group 4 — Prospect Development (D12; Phase C1, C2): presented 2026-10-30, awaiting decision

### Existing behaviour (verified)
- `progression.js afterGame` gives XP only to monsters in a depth-chart slot: 24 base, +10 for a win, plus stats. A reserve who does not play earns nothing.
- The only reserve growth is `offseason`: +1 awareness and strength a season up to age 23, towards potential.
- The owner's Wednesday practice (`setTraining`, `INTENSITIES`) is a temporary game-week bonus with an injury risk, not permanent growth.
- Level cost `xpForLevel = 30 + 18 × level`. Draftees start at level 1. Each level gives 3 weighted +1s (30% chance of +2) and 2 auto-spent points, capped at the monster's single potential value.
- **Measured (v42.17.0):**
  - young reserves gain +0.7 overall in three seasons;
  - round-1 reserves about +1.5, against about +10 for round-1 picks who start.

### Model (`tools/development-model.mjs`, `docs/task6-plan/group4-development-model.txt`; planning only)
- **Method:**
  - real generated draftees aged 21;
  - the real `levelUp` and auto-spend;
  - 11 games a season;
  - starters at 39 XP a game (reproduces the measured starter gain).
- **Results** — gain over 3 seasons, the same in every draft band:

| Regime | Gain over 3 seasons |
|---|---|
| Starter | +8.4 |
| Reserve today | +0.5 |
| Practice 0.25 | +4.0 |
| Practice 0.35 | +4.0 |
| Practice 0.5 | +5.0 |
| Practice 0.35 + maturation | +4.6 |
| Practice 0.5 + maturation | +5.5 |

- Level thresholds quantise the results: shares 0.25 and 0.35 happen to land on the same levels.

### Recommendation as presented
- **C1 — development slots with practice XP (D12 option a).**
  - **Who:** up to 6 reserves per club (at most 2 per position), aged 25 or under, with potential at least overall + 3, not injured.
  - **What they get:** after every game each one gains 0.35 × 24 base XP (about 8). No win bonus, no stats, no fatigue or injury roll, and the club's existing XP scale still applies.
  - **AI selection:** from the roster plan — successors first, then the largest gap between potential and overall.
  - **Owner:** the same rules and limits. Slots are filled automatically by the same priority, and the owner may override them (one additive save field).
- **C2 — maturation.** One extra position-weighted +1 per offseason up to age 24, towards potential, for every young monster.
- **Target:** prospects in slots gain about 55% of a starter's development over 3 seasons (+4.5 against +8.4). Starting remains the fastest route, and potential still caps every attribute.
- **Alternatives:**
  - share 0.5 (+5.5);
  - an offseason training-camp lump of XP instead of per game;
  - real game snaps (engine work; changes results; deferred);
  - maturation only (+1.2; insufficient).
