# Task 6 — M3 Remediation Pass (2026-11-03)

**Scope:** the owner's remediation instructions of 2026-11-03. This is not Phase E.

**Branch:** `task6-m3-remediation`, on `task6-phase-d`.

**Build status:**
- The validated Phase D build is unchanged. It stays on `task6-phase-d`, and it is what the private link runs.
- The remediation branch adds proposals behind flags that are all **off**, so it plays exactly as Phase D.
- Nothing is merged or published, and no approved rule or balance value was changed.

**Method:** focused diagnostics on the existing Phase D validation runs, then targeted experiments on scratch builds (never committed).
- **Experiments:** each ran on the C development seeds 106–115 × 20 seasons, paired against Phase D on the same seeds.
- **No held-out runs:** those are reserved for final confirmation of whatever the owner approves.
- **Noise:** ten 20-season seeds give about ±7–10 points on the ordinary persistent-loser rate (70 ordinary clubs). Differences smaller than that are reported as unresolved.

## 1. Root causes

### 1.1 Ordinary persistent losers (95.7%)
| Finding | Evidence (C, 10 × 20 seasons) |
|---|---|
| **The target sits on a structural floor.** Ordinary clubs win 3 or fewer games in **56%** of their seasons in every Task 6 build (v42.17.0 63%). At that rate, even if each club's seasons came in random order, **84%** of clubs would string three together in 20 seasons. Reaching ≤ 50% needs that share below about **38%**, roughly 1.5 more wins per ordinary club a season, taken from gyms | `tools/task6-loser-baseline.mjs`: v42.17.0 90.0 (random order 89.6); Phase C 87.1 (83.0); Phase D 95.7 (83.9) |
| **What Phase D added is clustering, not more losing.** Phase D's losing seasons are as frequent as Phase C's (56.1 against 55.9%) but bunched into runs: 95.7 against the 83.9 that random order would give | as above |
| **Rebuilds last too long.** Mean 4.4 seasons; 37% last 5 or more. 90% of the seasons a club spends rebuilding are kept by "losing with an ageing roster". The ageing test (≥ 35% of starters within 2 seasons of onset) sits **below the league norm**: the median club has 47%, and 69% of club-seasons exceed 35%. So any losing club qualifies, and it stays in Rebuild until it stops losing | `tools/task6-rebuild-diag.mjs` |
| **The ordinary-club brakes act on losing clubs (approved A-2 rules).** See the detail below | `decisions.nudge`, harness rows |
| **Rebuilders lose starters to successors who are not ready.** Phase D's Rebuild contract rule lets a starter past onset go once anyone is lined up behind him, ready or not | departures by mode |

**The ordinary-club brakes in detail:**
- The runaway-veteran attrition fired in **about 49% of ordinary club-seasons**, and **54%** of those came straight after a season of 3 or fewer wins.
- **67% of all starter departures at contract time** happened under it, in Phase C as well as Phase D.
- The XP slowdown applied to **44%** of ordinary club-seasons, and **56%** of those were losing seasons.
- Both are triggered by strength above the club's anchor, not by results. Ordinary anchors are low, so a club that loses to gyms is still braked.

**Starter walks by mode:** a Rebuild club loses **2.7 starters a season** at contract time; other modes lose 0.6.

### 1.2 Persistent weak position groups (worse than Phase C)
- **Weak groups are hardly more frequent:** 0.661 → 0.675 per club-season on C.
- **They last longer:** persistence rose from 18.2 to 20.5%, mostly at RB, TE and DL.
- **By mode:**

| Mode | Weak groups per club-season | Persistent |
|---|---|---|
| Contend | 0.91 | 25.7% |
| Rebuild | 0.80 | 24.8% |
| Compete | 0.47 | 14.6% |

- **Rebuild clubs:** the cause is the starter losses above.
- **Contend clubs:** the measure is club-relative (a group below the club's own mean), and contenders have the highest means, so their ordinary depth reads as weak. Keeping veterans adds to it.
- **Starter sales are a minor cause.** Only 62% of sales had a ready replacement (within 4) behind the sold starter. The position was weak afterwards in **22%** of sales without a ready replacement, against 6% with one. But sales are limited to one per window.

### 1.3 Young-player trade payments (owner decision 3)
The original combined measure is kept; the R4-excluded figure is reported alongside it, never instead of it.

| Set | v42.17.0 | Phase C | Phase D, all deals | Phase D, excluding R4 starter sales |
|---|---|---|---|---|
| B (1–60) | 48.2 | 46.6 | **56.4** | **48.7** |
| H (61–80, held-out) | 49.3 | 51.4 | **55.8** | **48.1** |

- The target (below 48.2) is **unmet** on the combined measure. Excluding R4 sales it is about at the baseline, not below it.
- Every R4 sale was paid with a young player. The existing judge always ranks that above picks alone.
- `youngPaymentExSalesPct` is added to the analyzer; `youngPaymentPct` is unchanged.

### 1.4 Why ordinary clubs cannot contend (owner decision 7)
- **The best ordinary club ranks 7th–8th of 15 by overall,** about **4.5 overall below the fourth-best gym**.
- **The two strongest ordinary clubs are XP-slowed in 31% of their seasons,** and are in Contend mode only 5% of the time: Contend needs a 60% win rate.
- **By the strength-only title yardstick** (Phase D report §7), ordinary playoff clubs need about **+2 overall** for 5% of titles.

## 2. Experiments (C 106–115 × 20, paired against Phase D; 95% intervals)
| Arm | What | Persistent losers | Recovery within 3 | Rebuild length | Persistent weak | Young pay (all) | Gym lead from s8 | Ordinary titles | Owner s9–20 |
|---|---|---|---|---|---|---|---|---|---|
| Phase D | — | 95.7 | 42.0 | 4.46 | 20.5 | 55.4 | 5.02 | 1.0 | 23.1 |
| **D5: Rebuild potential 0.20** | draft weight | −10.0 [−20, 0] | +3.3 n.s. | −0.5 n.s. | 0.0 | +0.3 | **+0.46 [+0.07, +0.89]** | +1.5 n.s. | −1.4 n.s. |
| A: F1 relative ageing + F2–F4 | see §3 | −5.7 [−11, 0] | +4.7 n.s. | −1.1 | +1.2 n.s. | −11.6 | −0.2 | +1.0 | +0.7 |
| **B: F1b + F2 + F3 + F4** | see §3 | −7.1 n.s. | +4.5 n.s. | **−1.68 [−2.10, −1.26]** | +2.7 n.s. | **−7.2 [−9.7, −4.8]** | −0.1 | +0.5 | +1.3 |
| D: B + potential 0.20 | | 0.0 [−7, +7] | +3.2 n.s. | **−1.64** | +1.0 n.s. | **−5.3** | −0.2 | +0.5 | −1.2 |
| C1: brakes off after a losing season | rule change | −4.3 n.s. | +5.8 n.s. | −0.5 | +1.7 n.s. | −0.5 | **−0.74 [−1.18, −0.36]** | +2.0 [0, +4] | +1.6 |
| C2: B + C1 + potential 0.20 | rule changes | −2.9 n.s. | **+9.8 [+5.3, +14.3]** | **−1.58** | −0.3 | −2.8 | **−0.71 [−1.26, −0.12]** | +1.0 | +2.6 |
| X2: two strongest ordinary clubs exempt from the brakes | rule change | −4.3 n.s. | +1.1 | −0.4 | +0.8 | +0.2 | 0.0 | +1.0 n.s. | **−6.4 [−11.6, −0.5]** |

Full per-arm detail is in `docs/task6-m3/arms-vs-phased.txt`.

**What the experiments show:**
- **Rebuild length responds clearly to the in-scope fixes** (B, D): 4.5 → 2.8 seasons, and rebuilds of 5+ seasons fall from 37% to 7%.
  - Sales then happen only with a ready replacement (92% of sales); the position is weak afterwards in 5% instead of 12%.
  - Rebuild clubs leave mostly to Compete or Retool.
- **No arm measurably lowers persistent losers or persistent weak groups.** The point estimates move by 3–10 points with intervals of ±7–10, and arms that should stack do not (D = B + 0.20 shows 0.0). This is noise around the structural floor in §1.1.
- **Only removing the brakes on losing ordinary clubs moves recovery significantly** (C2 +9.8), and it costs the gym lead (−0.7 from season 8, already below the floor of 6).
  - C1 alone gives ordinary clubs +2.3 points of playoff berths (supported) and 3% of titles (from 1%).
- **X2** keeps the average gym lead and lifts the best ordinary club (rank 7.6 → 7.0; top-4 playoff appearances 14 → 20; titles 1 → 2%, n.s.). But it makes the owner's late seasons harder (−6.4).
- **D5, 0.20 against 0.35:**
  - **Gains:** the gym lead (+0.46) on its own and persistent losers (−10, interval touching zero). Neither replicates when combined with B (gym lead −0.19, losers 0.0). Rebuild outcomes (age, potential) are identical.
  - **Losses:** none measurable.
  - **Verdict:** **not a supported improvement** under the owner's criterion. Not recommended for adoption on this evidence; 0.35 stays.

## 3. Proposed fixes
**Within the approved Phase D scope.** These are implementation choices inside R2, R3 and R4: no approved constant, threshold or rule text changes. They are written and tested, off by default (`M3` flags in `strategy.js`), and await approval.

| Fix | What it does | Expected benefit | Tradeoff |
|---|---|---|---|
| **F1b rebuild exit** (R2 "age distribution") | A club already rebuilding counts as "ageing" only while its ageing share is at or above the league median. Entry keeps the validated 0.35 test, so rebuilds still start as before | Rebuilds 4.5 → 2.8 seasons (supported); 5+ season rebuilds 37% → 7% | Rebuild share of club-seasons 22.6 → 18–19%. Struggling clubs very slightly older after 3 seasons (+0.1 year) |
| **F2 rebuild contracts tied to readiness** (R3) | A rebuilder lets a starter past onset go to a ready successor, or to any successor once he is 2+ seasons past onset (not "anyone, ready or not") | Fewer holes; part of B's shorter rebuilds | Rebuilders keep some veterans a little longer |
| **F3 contender contracts** (R3) | A contender keeps a veteran past onset unless a ready successor at least as good is behind him | Fewer blocked successors | Small; contenders' club-relative weak groups are a measurement effect and do not move |
| **F4 ready replacement for sales** (R4 "legal lineup" and "existing integrity rules") | A rebuilder sells a starter only with a replacement within 4 behind him | Weak after a sale 12% → 5%; young-player payments 55.4 → 48–50 | Sales 1.4 → 0.8 a season, so rebuilders receive fewer young players and picks |

**Recommended in-scope package: B (F1b + F2 + F3 + F4), potential weight kept at 0.35.**
- It delivers the realistic path back the owner asked for: rebuilds that end, safer sales.
- No gym measure changes, and the owner's later seasons are unchanged (+1.3, n.s.).
- It does **not** move the persistent-loser or persistent-weak targets, which are structurally capped.

**Rule changes that need the owner's approval** (not implemented):
1. **R-1: ordinary brakes skip a club coming off a losing season** (win share ≤ 0.40), for the XP slowdown and the runaway attrition (D10b).
   - **Benefit:** ordinary playoff share +2.3 (supported); recovery up to +9.8 with the package (C2, supported); ordinary titles 1 → 2–3%.
   - **Cost:** gym lead from season 8 falls 0.7 (5.0 → 4.3), further below the ≥ 6 floor; gym win rate against ordinary clubs −2 to −3 (still about 78%, floor 60).
   - This is the only lever found that makes rebuilding clubs climb back measurably. It conflicts directly with the gym floor.
2. **R-2: the two strongest ordinary clubs exempt from the brakes each season.**
   - **Benefit:** average gym lead unchanged; the best ordinary club rises; ordinary titles 1 → 2% (n.s.).
   - **Cost:** owner's seasons 9–20 −6.4 (supported worse).
   - It can produce a legitimate ordinary contender without lowering the average gym advantage, but not enough for 5–15% of titles.
3. **Anchor or gym-floor decision.** Neither 5–15% ordinary titles nor ≤ 50% persistent losers is reachable while gym anchors keep every gym above every ordinary club and the floor requires a ≥ 6 lead. The owner must prioritise one, or reword the targets as evaluation measures (as the spec already calls the ordinary-health targets).

## 4. Owner decisions carried (no change)
- **Rookie drift:** still unresolved (−4.1 [−6.7, −1.4] on the approved 36 seeds; FAIL preserved).
- **Rookie §45.6:** the standard 8-seed failure is preserved (+7.2); 24 seeds +0.7 [−2.3, +4.2].
- **D6:** the current nudge is kept; no further experiments.

## 5. Recommendation for the remaining M3 blockers
1. **Approve package B** (in scope). Then run one final confirmation of that build: the hard gates (drift 36 × 3, §45.6 with extensions, Stage P, suite, saves) plus the held-out sets. Package B changes AI behaviour, so drift and §45.6 must be re-measured, not assumed.
2. **Keep D5 at 0.35:** the 0.20 trial shows no supported, replicated improvement.
3. **Decide the gym-floor conflict:**
   - **(a)** keep the gym floor and the brakes as approved, and record ordinary titles and persistent losers as structurally unmet evaluation measures; or
   - **(b)** approve R-1 and accept a lower gym lead.
   - R-2 is optional either way.
4. **The two Rookie gates are the only hard-gate failures left.** No Task 6 lever addresses them without an ageing or difficulty change, which the owner has ruled out. The managing-owner diagnostic shows the free-agent market is the limit on an owner's ability to offset decline.
   - A defensible M3 decision therefore has two options: release with the two Rookie gates as documented, owner-accepted exceptions, or hold M3 until a separately authorised owner-side change (outside Task 6).
   - Re-running or re-seeding the gates to turn them green is not proposed.

## 6. Files
- **Tools:**
  - `tools/task6-rebuild-diag.mjs`
  - `tools/task6-loser-baseline.mjs`
  - `tools/task6-weak-groups.mjs`
  - `tools/task6-pair-c.mjs`
  - `tools/task6-analyze.mjs` (`youngPaymentExSalesPct`)
- **Data:** `docs/task6-m3/`: rebuild diagnostics (Phase D, arms B and D), X2 gym dominance, per-arm comparison, and the scratch patches for the rule-change arms.
- **Code:** `src/franchise/strategy.js`, `league-season.js` and `league-trades.js` hold the in-scope fixes behind `M3` flags (all off).
