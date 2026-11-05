# Task 7 — Remediation: Implementation and Targeted Results (2026-11-05)

**Status:**
- Development branch `task7-free-agency` only. Nothing is merged and nothing is published.
- The final consolidated benchmark has **not** been run. It waits for the owner's review of these targeted results.
- The original pre-registered results (`docs/TASK7_FINAL_REPORT.md`) and its nine failures stand unchanged.
- The figures below are a separate, targeted comparison at the corrected measuring point. They have no held-out set and are not a gate result.

---

## 1. What was implemented (owner approval of 2026-11-05)

| Item | What changed | Main code | Tests |
|---|---|---|---|
| **Measuring point** | `--measure=start` records every season at the next season's start in both builds. A run's last season is followed by its offseason and the next season's start, unless the franchise has ended (season 20). The default `end` is the pre-registered method, unchanged. | `tools/ai-franchise-benchmark.mjs` | tool tests; identical games checked on both builds |
| **R1** AI free agency by Task 6 strategy | **(a)** Before the draft, bids only for urgent holes and the R5 upgrade; depth after the draft. **(b)** Strategy value by mode (potential weight, ageing horizon, cost, readiness, gym element). **(c)** Upgrade with a release, made only when the signing completes. **(d)** Priority terms (preferred term within the mode's rule; the engine's counter terms when worth pursuing). | `fa-strategy.js` (new), `fa-ai.js`, `fa-engine.js`, `league-season.js` | `task7-remediation` R1 a–d |
| **R2** | No change: AI renewal answers stay. | — | — |
| **R3** renewal outlook | Interested, Listening or Not interested in the final contract season: the extension evaluation itself. The optional GM Assistant recommends extensions and never acts. | `fa-ui.js`, `screens/roster.js` | R3 test; browser check |
| **R4** gym element | Generated gym arrivals of the gym's element where a species exists at the position; draft and market tie-breaks (1.5). No position changes. | `league-season.js`, `draft.js`, `fa-strategy.js` | R4 test |
| **R5** lineup and package warnings | Slot, position, formation, why, fix, on the lineup screen and in the GM Assistant. Nobody is substituted out of position. | `franchise.js lineupWarnings`, `screens/roster.js`, `fa-ui.js` | R5 test; browser check (320 and 390 px) |
| **R6** AI extensions and bonuses | Task 6 core extended mid-season (week 6) and at the league year's turn, through the shared engine. A bonus only where it gives the same value for less cap. An extended contract no longer counts as ending; this also corrects the owner's extensions. | `fa-ai.js`, `contracts.js`, `franchise.js` | R6 tests |
| **R7** draft and staff affordability | Draft reserve shown; an unaffordable owner pick gives its shortfall and options; AI picks affordable prospects, otherwise releases or makes an explained pass. Staff renewals and hires checked against next season's cap; logged minimum-staff exception. The staff demand is unchanged (10%) pending the Section 9 design. | `draft.js`, `franchise.js`, `fa-ui.js`, `screens/hq.js` | `task7-r7` (3 tests) |
| **Existing saves** | Family position for every monster, once, at the next offseason boundary. Identity, attributes, contract and history kept; lineup repaired; report panel and news. | `position-migration.js` (new), `save.js`, `franchise.js` | `task7-migration` (2 tests); two real v42.21.0 saves |
| **Staff negotiation** | Design proposal only (`docs/TASK7_STAFF_NEGOTIATION_PROPOSAL.md`). | — | — |

**Full test suite:** after the remediation, 855 of 860 passed. The 5 failures were tests that predate the remediation: two seed-dependent assumptions, the module-map stamp, and two API return expectations. All were fixed and re-run; see §6.

---

## 2. How the targeted diagnostics were run

- **Builds:** v42.21.0 (the published tree) and the remediation build `2a012fe`. Both were recorded with `--measure=start` by the same harness.
- **Seeds:** C 106–115 (20 seasons) and B 1–20 (10 seasons, final offseason included).
- **Owner drift:** balance-compare, persistent league, board reset, seeds 1–12 × Rookie, Pro, All-Star, against the v42.21.0 drift files (wins only, so the measuring point does not matter).
- **Statistics:** `task6-compare` with unchanged thresholds, 95% bootstrap, matched seeds. There is no held-out set here, so read the classifications as indicative.
- **Integrity:**
  - 0 problems in all 60 harness runs and all 36 drift runs; no board firings.
  - 0 market problems; 0 legendary-limit violations.

---

## 3. The nine originally failed measures

| Measure | Pre-registered (end point) | Task 7, common point | **Remediation, common point** |
|---|---|---|---|
| Rebuild recovery within 3 seasons | −9.3 [−13.5, −4.9] worse | −9.3 worse | **−5.3 [−10.1, +0.2] inconclusive** (46.4 → 41.2) |
| Struggler starter age after 3 | +0.68 worse | −0.29 better | **−0.02 [−0.15, 0.10] inconclusive** |
| Persistent weak groups | +1.7 worse | +0.7 inconclusive | **+0.3 [−1.8, 2.3] inconclusive** |
| Persistent weak groups with cap room | +2.5 worse | +9.4 worse | **+9.0 worse**. Not interpretable across points: at a v42.21.0 season start the AI has just spent its room, so the baseline is 0.6%. |
| Persistent weak groups, position-relative | +0.9 worse | +1.3 worse | **+0.2 [−0.3, 0.7] inconclusive** |
| Young-reserve growth (3 seasons) | −0.14 worse | +0.11 better | **−0.05 [−0.09, −0.01] worse** (small) |
| High-potential growth (3 seasons) | −0.11 worse | +0.12 inconclusive | **−0.08 [−0.20, 0.04] inconclusive** |
| Round-1 starter at year 2, late seasons | −4.3 worse | −6.3 worse | **−1.9 [−7.0, 3.1] inconclusive** |
| Generated gym starters, final season | +4.6 worse | +4.6 worse | **+5.3 [2.6, 8.3] worse** |

**Reading:**
- Four improve to inconclusive at the common point: recovery, persistent weak groups, position-relative weak groups and late round-1 starts.
- Two of the measuring-point effects stay settled: struggler starter age, and high-potential growth (inconclusive).
- Still worse:
  - young-reserve growth, slightly (−0.05);
  - generated gym starters (§4 D);
  - weak groups with cap room, which cannot be compared across measuring points.

---

## 4. Other measures and the investigated mechanisms

### A. Composition (C and B, common point; AI clubs)

| | v42.21.0 | Task 7 (pre-reg build) | Remediation |
|---|---|---|---|
| Young monsters (≤ 23) per club | 11.44 | 11.77* | 11.53 |
| Veterans (≥ 30) per club | 6.82 | 5.86* | 6.38 |
| Young starters per club | 3.79 | 3.85* | 3.58 |
| Starter age | 26.86 | 26.79* | 26.93 |
| Young (≤ 25) walks per losing club-season | 0.15 | 1.05 | 0.27 |
| Generated arrivals per losing club-season | 0.63 | 2.35 | 0.96 |
| Losing clubs' strength gain the next season (mid-season overall, C) | +0.94 | +0.62 | +0.95 |
| Waiver signings who start at once | 35.6% | 48.3% | 32.4% |

\*The Task 7 column is recorded at the season's end. Its age figures are therefore not comparable (§3 of the proposal); the walks, arrivals and strength-gain rows are.

### B. Free agency (remediation build, common point, 400 offseasons)

- **Volume:** 24.4 signings per offseason, most of them after the draft at the season start.
- **Competition:** 1.11 bidders per signing; 5% of signings had a rival offer. Before the remediation these were 2.5 and 69%: competitive bidding before the draft has largely stopped, because clubs extend their core and bid there only for holes.
- **AI extensions:** 171 per offseason window on average.
- **Bonuses:** 0% of signings. The cap saving a bonus brings never decided an offer, so none was forced.
- **Renewals refused:** 9.5%. The remaining expiries are mostly monsters Task 6 does not extend.
- **Signing age:** mean 29.7, against a league mean of 25.8. 21.9% of signings are 33 or older.
- **By strategy mode:**

  | Mode | Mean signing age | Share 30 or older |
  |---|---|---|
  | Rebuild | 28.8 | 43.7% (pre-reg 45.0%) |
  | Retool | 28.5 | 38.7% |
  | Compete | 29.7 | 57.8% |
  | Contend | 30.9 | 70.6% |

  - Contenders' veteran signings fit their strategy.
  - Rebuilders still sign many veterans for depth, because the market is now mostly veterans: young core monsters are extended before they reach it.
- **Final-season effects:** veterans starting +10.5 [6.6, 14.5]; retirements −3.0 per season. Both are still away from v42.21.0.

### C. Contracts and succession (affected by the measuring point, as the owner asked)

| Measure | Pre-registered | Task 7, common point | Remediation, common point | Note |
|---|---|---|---|---|
| Succession cover | +1.4 better | −2.2 worse | −1.2 inconclusive | the end-point figure flattered Task 7 |
| Succession ready | +2.8 better | −2.8 worse | −1.4 [−2.3, −0.5] worse | same |
| 3-year contracts | −4.9 | −5.1 | **−13.9** (50.4% → 36.6%) | AI terms now honour the monster's preferred term (R1 d, R6). Still within the Task 6 band (≥ 1). |
| Largest expiry share | −0.8 better | −1.0 better | **+2.8 [1.5, 4.0] worse** | same cause: more 1- and 2-year deals |
| Physical change past onset | −0.2 better | +0.14 worse | +0.14 worse | measuring point |
| Improving at 33+ | −2.4 better | −3.9 better | +1.6 worse | small |

### D. Gyms and positions

**Gym starters of the gym's element** (legendaries excluded):

| Build | Season 1 | Season 4 | Season 8 |
|---|---|---|---|
| v42.21.0 | 47% | 43% | 27% |
| Task 7 | 38% | 33% | 21% |
| Remediation | 38% | 34% | **31%** |

- **Roster share at season 8:** 19%, 14% and **24%**.
- **R4 effect:** elemental identity is now sustained above v42.21.0's late level, within the one-position catalogue's limit (42–63% of starting slots per element).
- **Gym strength is unchanged:** gym win % 63.8 against 64.3. AI lineup holes are unchanged at 0.13% of club-seasons.
- **Generated gym starters** stay higher (+5.3). R4 changes *which* species replacements are, not how often a replacement is generated. The Phase 2 attribution put this on the one-position catalogue's thin positions (§7 decision 2).

### E. Owner drift (seasons 1–8, 12 seeds, paired against v42.21.0)

| Difficulty | v42.21.0 | Task 7 | Remediation | Remediation against v42.21.0 |
|---|---|---|---|---|
| Rookie | 73.7 | 69.2 | 69.8 | −3.9 [−10.6, 2.3] |
| Pro | 58.1 | 54.4 | 55.7 | −2.4 [−8.6, 3.9] |
| All-Star | 39.5 | 36.7 | 35.3 | −4.2 [−9.8, 1.9] |

- No difference is significant on 12 seeds.
- The All-Star drift is the accepted consequence of monsters answering renewals (R3) and is reported transparently.
- The hands-off owner's win % in seasons 9–20 is −8.4 [−15.9, −0.4]. Most of it is the long-run staff and cap pressure in F.

### F. Salary cap and affordability

- **AI clubs:** usable cap never negative; 0 AI floor releases needed; 0 AI draft passes in the soaks.
- **Owner over the cap at an offseason's end:**

  | Build | Share of offseasons |
  |---|---|
  | v42.21.0 | 72% |
  | Task 7 (pre-reg) | 53% |
  | Remediation | 16% (64 of 400) |

  Staff renewals can no longer push the owner over the cap; the remaining cases are the logged minimum-staff exceptions.
- **The hands-off owner under the unchanged 10% staff raise:** reaches the minimum-staff exception by seasons 4–6. Diagnostic soak seeds 1 and 2: 1 and 3 exceptions by season 8. Each is logged, at most once per role per league year, and the season always starts. This is what the Section 9 staff design is meant to address.
- **Roster-minimum releases (D8):** the hands-off owner made 22 releases in 6 of 30 runs. No dead ends.

### G. Existing saves

| Real v42.21.0 save | Monsters moved | When | Result |
|---|---|---|---|
| In season 1 | 145 | at the season's close | owner hole CB2 filled in the offseason; 4 more seasons, 0 problems |
| At the end of season 2 | 156 | at load | 4 more seasons; 0 game problems (the soak tool's load shortcut reports pending renewals, which is the tool, not the game) |

- Migration runs once per save, confirmed by a save round trip.

### H. Performance

- Stage P passes (−0.3% against the +10% limit; §6).

---

## 5. Remaining risks and decisions for the owner

1. **Rebuilding recovery:**
   - Improved from −9.3 (worse) to −5.3 (inconclusive) on the development sets.
   - The losing clubs' composition is back to v42.21.0 levels: walks, generated arrivals, strength gain.
   - The rest is about the size of the one-position Phase 2 effect (−3.8 on C in the attribution).
   - Recommendation: measure it with held-out sets in the final benchmark before any further change.
2. **Generated gym starters (+5.3):** one-position supply. Decide whether to accept this as an intended consequence of the final position rule (elemental identity is now restored), or to ask for a change in how gyms replenish thin positions (for example, preferring draft and pool depth over generated arrivals). That would be a new design decision.
3. **Veteran-heavy signings and veterans starting late:** supply-driven, since core monsters are extended before they reach the market. Rebuilders still sign veterans for depth (43.7% aged 30+). Possible next step (needs approval): Rebuild and Retool clubs fill non-urgent depth with younger monsters (pool or generated), or leave a place for development, instead of the best available veteran.
4. **Contract structure:** honouring the monster's preferred term (R1 d, R6) lowered 3-year deals to 36.6% and raised the largest expiry share by 2.8. Keep it (personality realism, still within the Task 6 band), or bias AI terms back toward the Task 6 R3 lengths?
5. **A quieter market before the draft:**
   - With AI extensions and draft-aware timing, pre-draft competition is rare: 1.1 bidders per signing, 5% with rivals.
   - This is a direct consequence of R1 a and R6; the owner should decide whether that is the intended market feel.
   - The extension windows could be narrowed (for example to starters only) if more competition is wanted.
6. **Staff:** the Section 9 design (separate proposal) is needed. The current 10% compounding raise and the new cap checks lead hands-off owners into logged minimum-staff exceptions by mid-career.
7. **Measuring point:**
   - The common point reverses three of the pre-registered failures and two pre-registered successes (succession cover, succession ready).
   - For runs shorter than 20 seasons, the final season is now followed by its offseason and the next season's start in both builds.
   - Recommendation: run the final benchmark with `--measure=start` for **both** builds, including held-out sets. The original file set stays on record.

---

## 6. Test and performance record

- **Full suite** (commit `e25afa6` plus documentation): **860 of 860 passed**, including 13 new remediation tests.
- **Browser checks:** market UI (320, 390, 430 px); renewal outlook, GM Assistant advice and lineup warnings (320, 390 px); the roster-minimum panel. No overflow, no page errors.
- **Stage P** (interleaved, run alone, seeds 1–3 × 6 seasons × 3 repetitions):
  - v42.21.0: 15.64 and 16.05 s per season;
  - remediation: 16.51 and 15.09;
  - means 15.85 against 15.80, a change of −0.3%. The limit is +10%: **pass**.
