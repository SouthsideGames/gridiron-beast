# Task 6 Phase 0 — Benchmark Methodology

How every Task 6 phase is measured. This document was written in Phase 0, before any behaviour change.

**Governing records:**
- the owner's Group 5 decision (`docs/TASK6_DECISIONS.md`);
- the approved specification (`docs/TASK6_APPROVED_SPECIFICATION.md` §4).

**Pre-registered values** are in `docs/task6-phase0/thresholds.json`. The v42.17.0 baseline results are in `docs/task6-phase0/`.

## 1. Scope

**The benchmark is observational.**
- The harness reads the franchise between the game's own steps. It never calls a mutating function and never writes a save.
- That this holds is proved by §7, not assumed.
- The tools live in `tools/`. Nothing in `src/` changes in Phase 0.

**Tools:**

| Tool | Role |
|---|---|
| `tools/ai-franchise-benchmark.mjs` (harness v4) | Plays the production franchise lifecycle with the hands-off owner and records everything (v3 fields unchanged, plus `v4`) |
| `tools/task6-harness-check.mjs` | Non-interference, determinism and v3 reproduction |
| `tools/task6-baseline.sh` | Runs every baseline job in parallel lanes (resumable) |
| `tools/task6-analyze.mjs` | Task 6 measures per seed, and pooled distributions |
| `tools/task6-compare.mjs` | Phase report: baseline against candidate, per pre-registered measure |
| `tools/task6-balance-gates.mjs` | The §45.6 owner contract and the owner difficulty drift check |
| `tools/task6/stats.mjs` | Paired bootstrap, effect size, outcome classes |
| `tools/balance-compare.mjs` (existing, unchanged) | Persistent league against today's generator (the contract), and the drift runs |

## 2. Seed sets and runs

| Set | Seeds | Seasons | Role | Harness files |
|---|---|---|---|---|
| **B** | 1–60 | 10 | Development and tuning | `<label>-B-1-10.json` … `-51-60.json` |
| **H** | 61–80 | 10 | Held-out confirmation for B measures; run once per phase, on the final commit | `<label>-B-61-70.json`, `-71-80.json` |
| **C** | 106–115 | 20 | Long-term development and tuning | `<label>-C-106-108.json`, `-109-110.json`, `-111-115.json` |
| **CH** | 116–125 | 20 | Long-term held-out confirmation (Phases A and D) | `<label>-C-116-120.json`, `-121-125.json` |
| Scenarios | 1–5 | 6 | The six stress scenarios (aging, expiring, thin, injuries, rebuild, picks) | `<label>-D-<scenario>.json` |
| Contract | 1–8 | 8 | §45.6, persistent against legacy, per difficulty | `<label>-contract-<difficulty>-<mode>.json` |
| Drift | 1–12 | 20 | Owner difficulty drift, per difficulty (board reset) | `<label>-drift-<difficulty>-<seeds>.json` |

**How runs are made.**
- All harness runs are on Pro unless stated, with the hands-off owner policy of `tools/franchise-soak.mjs` (`docs/AI_FRANCHISE_BENCHMARK_PLAN.md`, owner policy).
- A dismissed owner is reinstated so every seed runs its full length (simulation only).
- **Command:** `tools/task6-baseline.sh --out=DIR --root=TREE --label=LABEL`, run from a tree that has harness v4.
- The tree is frozen in its own worktree for the duration of the run.

**Held-out discipline.**
- H and CH are run **once per phase, on the commit put forward for review**, and never used to choose a parameter.
- If a held-out result leads to a change, the change is re-tested on B or C, and the held-out run is repeated only on the owner's instruction. The report records it.

## 3. Measures

The definitions below are the code in `tools/task6-analyze.mjs`, with the same names.

**Common conventions:**
- "AI" means the 15 AI clubs; the owner's club is excluded unless stated.
- A **starter** is one of the best players by overall at each position, filling its slots (the harness's own rule, independent of the game's depth chart).
- **Protected** monsters (legendaries, the rival's signature monster) are excluded from age measures.
- The **public onset** is the position's normal physical onset, plus or minus 1 for durability (≥ 75 or ≤ 45), read from the monster's current durability. This approximates "durability at peak"; see §9.

**Ageing (Group 1):**
- `starterAgeS10/S20/Final`: mean age of AI starters.
- `starters33PctS10/S20/Final`: share of AI starters aged 33+.
- `veteransStartingPct`: share of AI monsters aged at least public onset + 2 who start.
- `improvingAt33Pct`: share of monster-seasons aged 33+ whose overall rose over the season.
- `physChangePastOnset`: mean season change in the physical-attribute mean, for monsters aged at least public onset + 1.
- **Pooled across seeds:**
  - physical change by seasons past public onset;
  - retirements by position (mean age; early = age ≤ base − 2; exceptional = age ≥ base + 3; base = normal onset + 5);
  - career seasons (years in the league at the last snapshot) p10, p50 and p90.

**Draft:**
- `r1StartSeason1Pct`: share of round-1 picks starting at the end of their first season.
- `r1StartWithin2Pct`: share starting by the end of the second season (anywhere in the league). `r1StartWithin2LatePct` is the same for picks from draft year 12 on.
- `r1StarterAt2Pct` (and `r1StarterAt2LatePct` for draft year 12 on): starter **for the drafting club** at the end of the second season after the draft. This is the Task 4 sense that the spec's targets were written for.
- `r1GapToFloor`: the club's starter floor at the position minus the pick's overall.
- `r1Ovr`: the round-1 pick's overall.
- `misalignedPosRelPct`: share of picks made at a position where the club's starters are at or above the league mean at that position, while another of its positions is weak and the board had a player there within 3 overall.

**Succession and roster planning (Group 3):**
- `successionCoverPct`: share of AI starters aged 30+ with a backup at the position aged 26 or under, within 8 overall or with potential at least the starter's overall. `successionReadyPct` is the share whose backup is within 4.
- `weakPosRelPct`: share of position groups 4 or more below the league's starter mean at that position. `persistentWeakPosRelPct` is the share weak at two consecutive season ends.
- `contract1Pct`, `contract2Pct`, `contract3PlusPct`: contract lengths on AI rosters at the final snapshot. `maxExpiryShare` is the largest share of a roster expiring in one year.
- `youngPaymentPct`: share of AI trade payments aged 24 or under.

**Development (Group 4):**
- `youngReserveGain3`: overall gain over 3 seasons for AI monsters aged 24 or under who were reserves at three consecutive season ends.
- `youngStarterGain3`: the same for those starting in the second and third.
- `highPotentialGain3` against `lowPotentialGain3`: young monsters split at potential − overall ≥ 12.
- `evolutionsPerClubSeason`.
- `leagueStarterOvrS10/S20`.

**Balance (Group 2):**
- `gymVsOrdinaryWinPct`: the gyms' win rate in games against ordinary AI clubs, head to head from the season's results (owner games excluded; ties count half).
- `gymWinPct` and `ordinaryWinPct`: win rates against all opponents.
- `gymTitleSharePct` and `ordinaryTitleSharePct`.
- `ordinaryPlayoffSharePct`.
- `ordinaryPersistentLoserPct` and `gymPersistentLoserPct`: clubs with a run of three seasons at 3 wins or fewer.
- `gymLeadS5/S10/S20` and `gymLeadMinS5on`: gym mean team overall minus the ordinary mean.
- `gymLeadMinS8on`: the same minimum from season 8, reported alongside the approved floor (see §8).
- `gymTierOrderHeld`: from season 5, the early < mid < late gym tiers by mean team overall, per seed. `gymEarlyOvrS5on`, `gymMidOvrS5on` and `gymLateOvrS5on` give the pooled tier means.
- `gymGeneratedStarterPctFinal` and `ordinaryGeneratedStarterPctFinal`: share of starters who are generated signings.
- `ordinarySlowedPct`: share of ordinary club-seasons under the XP slowdown. `ordinarySlowedDev` against `ordinaryUnslowedDev` compares their development.
- `distinctChampions`.
- `ownerWinPctS1to8` and `ownerWinPctS9to20`.

**Strategy:** `modeChangesPer10`, once Phase D adds a mode to the club strategy record (null before).

**Task 4 and 5 measures** (`task5.*`, from `tools/post-trading-analyze.mjs`, unchanged) are carried alongside for continuity. These include the club-relative persistent-weak measures, trade counts, and succession cover by the v3 definition.

## 4. Statistics

**Matched seeds.**
- Every comparison is baseline against candidate on the same seeds.
- The difference per seed is candidate minus baseline. Seeds without a value on both sides are left out.

**For each measure, the report gives:**
- the mean difference;
- a **95% bootstrap percentile interval** over seeds (2,000 resamples, fixed generator, so the interval is reproducible);
- a standardised **effect size** (mean difference ÷ standard deviation of the per-seed differences);
- the number of seeds that moved each way.

**Outcome classes** (owner's Group 5 standard). They are reported separately, never merged:
1. **Functional requirement** — pass or fail (the hard gates).
2. **Target achieved** — the candidate's value is inside its band. A target can be met without a supported improvement, or missed despite one.
3. **Statistically supported improvement** — the interval on the development set excludes zero in the better direction, **and** the held-out set moves the same way. Long-term claims also need C (and CH for final confirmation).
4. **Inconclusive** — anything else, stated plainly. "Worse" (the interval excludes zero in the wrong direction, with the held-out set agreeing) is flagged.

**Other rules.**
- Significance is never the only measure; effect sizes and target bands are always shown.
- Competitive-balance conclusions need at least 10 independent 20-season seeds (C), with CH for final confirmation.
- Pooled distributions (retirement by position, careers) are reported with their counts. They need many seeds and are never reported per seed.

## 5. Owner balance gates

**Contract (GDD §45.6), a hard gate.**
- `tools/balance-compare.mjs`, persistent against legacy, seeds 1–8 × 8 seasons, on Rookie, Pro and All-Star.
- On every difficulty: the owner's win rate within ±5 points and the AI mid-season mean team overall within ±2.
- Checked with `tools/task6-balance-gates.mjs --contract`.

**What the contract cannot see.**
- The legacy generator reads `clubQuality`, so any anchor change moves both sides of the comparison.
- The contract therefore confirms that persistent rosters follow the anchors, but not that absolute difficulty is unchanged.

**Drift against published v42.17.0** (owner decision of 2026-10-30).
- balance-compare persistent with the board reset, seeds 1–12 × 20 seasons, per difficulty. Candidate against the v42.17.0 baseline files, matched seeds.
- **Seeds:** 1–12 on Rookie and Pro; All-Star 1–24 for formal phase validation (24 seeds are not run repeatedly during implementation).
- **Seasons 1–8:** the mean paired difference in owner win rate must be within ±5 points (hard gate). If the 95% interval reaches past ±5 while the point estimate is inside, the gate passes but is escalated to the owner as uncertain.
- **Seasons 9–20:** reported only.
- **If an approved change genuinely conflicts with drift:** stop and present the evidence. Never tune to conceal it.

**Limits of the hands-off owner proxy.**
- **What the simulated owner does:**
  - uses the soak's fixed policy;
  - re-signs every expiring contract it can;
  - drafts the best visible prospect;
  - signs the cheapest free agents only up to the roster minimum;
  - makes no trades and answers no calls;
  - does not hand-spend points beyond the trainer's auto-spend;
  - is reinstated after a dismissal.
- **Consequences:**
  - It represents a passive player. A real owner improves the roster, so the absolute win rate, especially in seasons 9–20, understates what a player achieves.
  - Changes that reward active management (development slots, contracts, trades) will not show in it.
  - A hands-off owner's roster also ages under the new rules without the owner's response, so late-run drift will overstate the difficulty a real player meets.
  - Drift is therefore a regression guard for the start of a career, not a measure of the late-career experience.

## 6. What each phase delivers

Each phase is a separate PR. Its report contains:
1. The hard gates:
   - integrity;
   - determinism and non-interference (`task6-harness-check`);
   - full suite;
   - trading tests;
   - save compatibility;
   - contract;
   - drift for seasons 1–8;
   - Stage P;
   - browser checks.
2. `tools/task6-compare.mjs --base=<v42.17.0 baseline> --cand=<phase>` on B, H, C and CH as the phase requires. Phases B–D also report against the previous phase.
3. The pooled distributions for the phase's measures.
4. Monitor measures.
5. For every missed target: the result, the likely cause and a recommendation. Approved parameters are never changed quietly.
6. Observed results and projections clearly separated.

## 7. Reproducibility

**Non-interference.** `tools/task6-harness-check.mjs` plays the same seed with the game alone and under the harness, and compares the final franchise.
- The comparison is the sha-256 of the whole object, less `uid` and `createdAt`, the two wall-clock identity fields that differ on every run of the game itself.
- Harness v4 records that hash for every run (`v4.finalState`).

**Determinism.** The check runs the harness twice on the same seeds and compares both hashes. Phase 0 also re-runs a whole baseline file (B 51–60) into a separate file and compares hashes.

**v3 reproduction.**
- Every v4 file carries `hashV3`: the v3 hash of its runs with the `v4` field removed.
- For the seed groups the Task 5.5 benchmark ran on v42.17.0 (B 1–60, C 106–110), `hashV3` must equal the published v3 hash in `docs/post-trading-benchmark/run-hashes.json`.

**Environment.** Node v22, 2 CPUs, two lanes. Timings are recorded but are not part of any hash.

## 8. Threshold change log

| Date | Change | Approved by |
|---|---|---|
| 2026-10-30 | Version 1 pre-registered (Groups 1–5) | Owner, Groups 1–5 |
| 2026-10-30 | **Version 2 — owner approval of Phase 0.** Approved: round-1 target ≥ 44% (late ≥ 30% kept); succession targets on the Task 4 definition (≥ 40% / ≥ 30%), with the expanded definition reported; misaligned picks ≤ 7.4% without loss of draft quality; physical decline (no improvement past onset, ≥ 1.5 at 3 seasons, ≥ 2.5 at 5, progressive); gym lead ≥ 6 from season 8, seasons 5–7 no worse than v42.17.0 (`gymLeadS5to7Min`); tier order judged on pooled means, per-seed inversions reported; All-Star drift on 24 seeds for formal phase validation only (`--only=drift,drift24`); Stage P with 3 repetitions, median | Owner, 2026-10-30 |
| 2026-10-30 | **After the v42.17.0 baseline, before any candidate data.** Re-based measures whose Task 6 definition differs from the Task 4/5 measure the spec's target was written against. This is not a change to any approved value. Marked `proposed` in thresholds.json, awaiting owner review | Proposed, Phase 0 |

**Detail of the post-baseline re-basing:**
- **Round-1 conversion.**
  - The target applies to `r1StarterAt2Pct`, starter for the drafting club at draft year + 2 (baseline 33.0%), with a proposed band of ≥ 44%, the spec's +10.7-point intent.
  - The late target of ≥ 30% applies to `r1StarterAt2LatePct` (baseline 14.4%, as the spec's 14%).
  - The looser "started anywhere" measures are reported.
- **Succession.**
  - The spec's ≥ 40% (B) and ≥ 30% (C) targets apply to `task5.successionCoveredPct`, the definition they were written for (baseline 17.6% and 11.4%).
  - The approved R1 definition, which also counts potential (`successionCoverPct`, baseline 36.1% and 25.1%), is reported against baseline.
- **Misaligned picks.**
  - The Task 6 position-relative yardstick has a baseline of 10.6%, already inside the spec's 15% (written for the club-relative 24.5%).
  - Proposed: −30% against baseline, a band of ≤ 7.4%.
- **Physical decline.**
  - The aggregate `physChangePastOnset` (−0.44) already meets "≤ 0".
  - Proposed pooled rule: never positive from 1 season past the public onset, mean ≤ −1.5 at 3 seasons and ≤ −2.5 at 5 seasons.

**Conflicts found in the approved gym floor.** Reported to the owner; nothing changed.
- **Gym lead ≥ 6 in seasons 5–20.**
  - v42.17.0 is below 6 in seasons 5–7 (C: 4.7, 5.6, 5.2; CH: 4.3, 5.1, 4.8) and above from season 8.
  - The approved plateau leaves seasons 1–10 unchanged, so the floor as worded cannot hold in seasons 5–7 without a change nobody has proposed.
  - `gymLeadMinS8on` is reported alongside.
- **Tier order.**
  - Held per seed in 90% (C) and 70% (CH) of baseline seeds; the inversions are within 0.5 points between neighbouring tiers.
  - Pooled tier means are reported alongside.

## 9. Known limitations

1. **Public onset** reads current durability, not durability at peak. Monsters whose durability has already declined are counted as having an earlier onset. The effect is small before Phase A (durability falls only from 30 today).
2. **Starter definition.** "Starter" is by overall, not the game's depth chart. Injured starters are still counted as starters at season end.
3. **Career length** is years in the league at the last snapshot before retiring. Monsters generated as veterans carry the game's derived `yearsPro`.
4. **Retirement measures** are empty at baseline: v42.17.0 has no retirement. Phase A-1 is compared with the projection bands in the decision record.
5. **Seed balance.** All harness sets are Pro. Other difficulties are covered by the contract and drift sets only.
6. **The yardstick of the Task 4/5 measures.** `task5.*` measures and the harness's draft fields `needAtPos`/`misalignedPct` use the game's own `positionNeeds`. If Phase B changes that function, those yardsticks move with it. The Task 6 measures above are computed from the snapshot and do not.
