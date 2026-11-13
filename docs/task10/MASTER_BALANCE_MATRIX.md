# Task 10: Master Balance Verification Matrix

Scope (owner, 2026-11-12): the final comprehensive balance audit of the whole game. This matrix lists every balance requirement found in the Task 7, Task 8 and Task 9 records and the GDD, its approved target, the test that decides it and where it stands today.

**Status words**
- **PASS**: measured on the released game (or on a build whose gameplay results are identical to it) and inside the approved target.
- **FAIL**: measured and outside the approved target.
- **PENDING**: no valid measurement yet. The reason is given: never measured, measured only before a later change, or waiting for the corrected harness.
- **BLOCKED**: cannot be decided by simulation (needs the owner, or a physical device).

**Evidence age**
- *Pre-T8*: measured before Task 8 (v42.21.0 to v42.22.0). Task 8 replaced the monster catalogue and abilities, so these need new evidence.
- *M6*: measured at Task 8 M6 on simulation f716b02, before the owner's adoption of 2026-11-11 changed Apex training, pancake constants, mastery credits, Foresight and the Apex ask.
- *Release*: measured on v43.10 to v43.12. Central text and Task 9 changed no gameplay result (verified season by season), so these are current.

**Harness note.** Every 20-season franchise run so far used a hands-off owner whose roster nobody manages. On the released game that club forfeits whole seasons (6 of 8 Rookie franchises). League-wide figures from those runs are marked PENDING until rerun with the repair owner (R-1).

## 0. Deferred Task 7 tests recovered

Source: GDD §59.10 "Task 7 → Task 8 dependency" (owner decision 2026-11-05), `docs/TASK7_REMEDIATION_PROPOSAL.md` §9, `docs/TASK7_BENCHMARK_PLAN.md`, `docs/TASK7_NEGOTIATION_RESULTS.md` §7.

1. **The comprehensive Task 7 franchise-balance benchmark** was waived for the Task 7 release and deferred until after Task 8. It was never run on a build with the negotiation rework, and never on Task 8. Rows T7-1 to T7-24.
2. **The 18-point mandatory validation after Task 8** (GDD §59.10). Rows T7-25 to T7-42. Task 8 M6 measured four of the eighteen (roster coverage, market integrity, cap room, gyms); the other fourteen have no post-Task 8 evidence.
3. **Four Task 7 decisions left with the owner** and never closed. Rows T7-43 to T7-46.
4. **Design-review notes** recorded for a later look (the balance nudge, AI injury cover, the AI staff allowance, cap-exempt gym legendaries, difficulty quality targets). Row T7-47.

Not found: I found no other deferred Task 7 test in the Task 7 documents, the GDD or the commit history. If you remember one that is not in this list, name it and I will trace it.

## R. Harness

| ID | Requirement | Target | Test | Status |
|---|---|---|---|---|
| R-1 | The study owner does not forfeit for lack of a legal lineup | Forfeits at or near 0; the benchmark owner otherwise unchanged | Repair owner (does what the lineup warning asks: signs the cheapest legal free agent for an open slot), `tools/study-owner.mjs`: before a game and in the offseason | **FAIL**, improved: 5.8% of owner games forfeited over 8 franchises × 20 seasons (2.5% in seven of them; one franchise 53 forfeits). Before: whole seasons in 6 of 8. The rest are positions with no free agent to sign (T7-27, T7-31) |
| R-2 | Hands-off owner reported beside the repair owner | Both lines in every league-wide table (GDD §59.10: the repair owner is a separate diagnostic, not a replacement) | Paired runs, same seeds | PENDING |

## 1. Football simulation and gameplay

| ID | Requirement | Approved target | Source | Test | Evidence | Status |
|---|---|---|---|---|---|---|
| F-1 | Completion rate, abilities on | about 65% | GDD §53.5c | `tools/passing-calibration.mjs`, 48 matched games | Release: 56.8% (120 matchups, `docs/task8/m6/FINAL_VERIFICATION.md`); 64.5% pre-T8 | **FAIL** against the recorded target. No later ruling moving the target was found |
| F-2 | Sacks per dropback | 5–7% (rebuild plan); 2.5% accepted at v42.8 | `GRIDIRON_BEAST_REBUILD_PLAN.md`, GDD §53.5c | passing calibration | Release: 2.0% | PENDING: which target stands is an owner question |
| F-3 | Interception rate | none recorded (1.4% at v42.8) | GDD §53.5c | passing calibration | not re-measured after Task 8 | PENDING |
| F-4 | Yards per attempt, yards per carry, points per team game | none recorded (7.9 / 6.2 / 13.7 at v42.8) | GDD §53.5c | passing calibration, matched study | Release: 6.41 per carry, 13.7 points | PENDING (no target; report against the v42.8 reference) |
| F-5 | Run and pass share by AI coaches | follows club identity | `docs/task8/AI_IDENTITIES.md` | league-health identity rows | Release: pass clubs 81% pass, run clubs 43%, balanced 66% (seeds 11–12) | PASS (identity separates clubs as specified) |
| F-6 | Deep ball rewards receiver Speed | catch rate rises with Speed | GDD §53.5b/c | `tools/attr-study.mjs`, 300 seeds | Pre-T8: 38/45/53% | PENDING (re-measure on Task 8 engine) |
| F-7 | Man Coverage on breaking routes | higher Coverage allows less | GDD §53.5b/c | attr-study | Pre-T8: fixed | PENDING |
| F-8 | Ball-carrier Awareness has an effect | yards rise with Awareness | GDD §53.5b/c | attr-study | Pre-T8: fixed | PENDING |
| F-9 | The other nine attributes each have a measurable effect | each works at 50/75/95 | GDD §53.5b | attr-study, Attribute Testing Lab | Pre-T8 | PENDING |
| F-10 | Smaller audit items: DL Tackling on sacks, defender Catching on interceptions, run-recognition cliff, play-action bite | recorded as open, never closed | GDD §53.5b | attr-study | none after v42.8 | PENDING |
| F-11 | Every position's production is plausible | none recorded | — | 20-season league tables by position | not measured | PENDING |
| F-12 | Production playbooks: every play and formation used and viable | none recorded | GDD §53, AI identities | play-level yards and success by play, RPO and play-action rows | not measured on Task 8 | PENDING |
| F-13 | Play-action and RPO behave as designed | GDD §53 tests | `tests/qb-read.test.js`, `tests/run-read.test.js` | Release: in the full suite, passing | PASS (rules); effectiveness PENDING under F-12 |
| F-14 | Special teams: field goals by distance, extra points, kickoffs, punts | none recorded | GDD §8, M5 kicking grades | kick outcome tables from league runs | not measured | PENDING |
| F-15 | Ordinary pancakes per starting OL per game | 0.2–0.6 | `docs/task8/DECISION_PACKET_FINAL.md` | `tools/task8-m6-league-pancake-probe.mjs` | M6 defaults 0.69–0.86 (fail); adopted qmax 0.10 / b 0.30 measured in the decision sheet | PENDING: re-measure on the release with the adopted constants |
| F-16 | Pancake attempts that succeed | 30–50% | same | same | same | PENDING |
| F-17 | Pancake attempts ending in a lost block | at most 15% | same | same | M6: 11.6% | PENDING (re-measure with F-15) |
| F-18 | Offence against defence balance | none recorded | — | points, turnovers, three-and-outs per game | not measured | PENDING |
| F-19 | Engine CPU against the pre-Task 8 baseline | at most +10% in every scene | `docs/task8/APPROVAL_REGISTER.md` | CPU protocol | M6: under 1.10 in all 13 scenes, provisional (noisy host) | PASS, provisional |

## 2. Task 8 ability balance

| ID | Requirement | Approved target | Source | Test | Evidence | Status |
|---|---|---|---|---|---|---|
| A-1 | All 72 football abilities implemented and reviewable | 72 of 72; 408 reviewer variants complete | `docs/task8/ABILITY_COMPLETION_MATRIX.md` | `tools/ability-completion-matrix.mjs --check`, reviewer tests | Release: in the full suite | PASS (presence, not strength) |
| A-2 | All 72 Clash abilities implemented and reviewable | 72 of 72; 408 variants | same | same | Release | PASS (presence) |
| A-3 | Each football ability's effect in play | no numeric target per ability was approved | spec, Dex | paired games with and without each ability (`tools/ability-balance.mjs`), by family, form and mastery | not measured on Task 8 for all 72 | **PENDING** (largest gap) |
| A-4 | Each Clash ability's effect | none approved | Dex, `BEAST_CLASH_BALANCE_MANIFEST.md` | `tools/clash-balance.mjs` over all 72, win-rate with and without | not measured for all 72 | **PENDING** |
| A-5 | Twelve types: no type dominant in football or Clash | type chart as approved | GDD §32 | type win and yardage matrix | not measured on Task 8 | PENDING |
| A-6 | Every base field zone: effect size and duration | as approved per field | `docs/task8/FIELD_CLOCKS.md` | field-on against field-off scenes | clocks tested; strength not measured | PENDING |
| A-7 | Field overlaps and combined abilities | rules as approved | spec §21, rulings | contract tests (rules); combined-effect games (strength) | rules in the suite; strength not measured | PASS (rules) / PENDING (strength) |
| A-8 | Status effects: one slot, stacking, durations, overrides | spec §10, Appendix B | `tests/**/status*`, shared gate tests | Release: in the suite | PASS (rules) |
| A-9 | Legendary abilities | Legendary Plays as approved | GDD §36, `tools/legendary-balance.mjs` | legendary-balance on Task 8 | not re-run on Task 8 | PENDING |
| A-10 | Conditional, passive and zone-creating abilities fire when they should | M3 rare-activation list | `docs/task8/M3_RARE_ACTIVATIONS.md` | activation counts per family from league runs | M6 mastery exposure: counts by family | PENDING: rare triggers remain documented outliers |
| A-11 | Activation frequency per ability | none approved | — | executions per game by family | M6: `mastery-football-by-family.json` | PENDING (report; no target) |
| A-12 | Position-specific ability balance | none approved | — | A-3 grouped by position | not measured | PENDING |
| A-13 | Mastery reached in 3–6 seasons of sustained use | 3–6 seasons | Task 8 spec | `tools/task8-m6-career-analyze.mjs` | M6: 475 of 2,859 sustained starters in the window, 1,754 never (fail). Adopted: 2 credits per game. Not re-measured | **PENDING** (re-measure; the owner accepted slow families as documented outliers) |
| A-14 | Foresight executes | executes in play | owner adoption | activation count | M6: 0 of 563 before the fix; adopted fix not re-measured in league play | PENDING |
| A-15 | AI ability use | abilities chosen sensibly by AI | M5 status | AI activation share against opportunity | not measured | PENDING |
| A-16 | Apex accumulation with stronger Apex | "needs a follow-up comparison" | owner adoption 2026-11-11 | Apex count and club strength by season | Release: 15 to 23 Apex in the league by season 20 (seeds 11–14); M6: 53 across 4 franchises | PENDING: effect on club strength and titles not analysed |
| A-17 | Ability overhead, all scenes | at most 1.25 (provisional budget) | `APPROVAL_REGISTER.md` | CPU protocol, quiet host | M6: A2–A5 unresolved (moved 0.27 between runs) | PENDING |
| A-18 | Ability overhead, overlapping fields (A1) | at most 1.25 | same | same | M6: 1.36–1.40 | **FAIL** |
| A-19 | Ability overhead, worst case (X1) | at most 1.25 | same | same | M6: 1.44–1.50 | **FAIL** |
| A-20 | Owner approval of each ability in the Ability Reviewer and Clash Ability Reviewer | owner review | owner adoption | on the device | pending, not waived | BLOCKED (owner) |
| A-21 | Performance on a physical iPhone | — | `PHONE_TEST_CHECKLIST_IPHONE17PM.md` | on the device | never measured | BLOCKED (device) |

## 3. Task 7 balance

### 3a. Hard gates of the benchmark (`docs/TASK7_BENCHMARK_PLAN.md` §3)

| ID | Gate | Target | Evidence | Status |
|---|---|---|---|---|
| T7-1 | Integrity | 0 problems in every run | Release: 0 problems in 12 franchises × 20 seasons (seeds 3–14) | PASS on 12 runs; the full seed sets PENDING |
| T7-2 | Cap | no signing over usable cap | Pre-T8 pass; M6 market integrity 0 problems in 60 markets | PENDING on the release seed sets |
| T7-3 | Rosters | every club 26–38 at every season start | Release: 28–38 (seeds 11–14) | PASS on 4 runs; full sets PENDING |
| T7-4 | Legendary limits | at most 1 offensive and 1 defensive per club | M6: 0 violations in 1,220 club-seasons | PASS (M6; rule unchanged since) |
| T7-5 | Determinism | identical runs reproduce | Release: seeds 3 and 4 reproduce across builds | PASS |
| T7-6 | Performance | at most +10% per season | Pre-T8: +4.8% | PENDING |

### 3b. The nine comparative measures (against v42.21.0; last measured on the negotiation build, pre-T8)

| ID | Measure | Last result | Status |
|---|---|---|---|
| T7-7 | Rebuild recovery within 3 seasons | −1.3, inconclusive | PENDING |
| T7-8 | Struggler starter age after 3 seasons | +0.06, inconclusive | PENDING |
| T7-9 | Persistent weak groups | −0.04, inconclusive | PENDING |
| T7-10 | Persistent weak groups with cap room | +9.8, not interpretable | PENDING |
| T7-11 | Persistent weak groups, position-relative | +0.9, worse | PENDING |
| T7-12 | Young-reserve growth over 3 seasons | −0.01, inconclusive | PENDING |
| T7-13 | High-potential growth over 3 seasons | −0.14, worse (small) | PENDING |
| T7-14 | Round-1 pick starting by year 2 | −2.8, worse | PENDING |
| T7-15 | Generated gym starters, final season | +3.7, worse | PENDING |

A new baseline is needed: GDD §59.10 says the post-Task 8 validation establishes it, with the Task 7 results kept as history.

### 3c. Accepted Task 6 exceptions, reported against their bands

| ID | Exception | Band | Last result | Status |
|---|---|---|---|---|
| T7-16 | Ordinary persistent losers | at most 50% | 95.7% | PENDING |
| T7-17 | Ordinary title share | 5–15% | 1.5% | PENDING (M6: gyms won 61 of 78 titles) |
| T7-18 | Gym lead from season 8 | at least 6 | 5.35 | PENDING |
| T7-19 | Young-reserve growth | at least +3 | 2.44 | PENDING |
| T7-20 | Persistent weak groups | at most 8% / 5% | 12.3% / 11.2% | PENDING |
| T7-21 | Young-player payments | reported | 52.8 | PENDING |

### 3d. Owner balance

| ID | Requirement | Target | Last result | Status |
|---|---|---|---|---|
| T7-22 | Hands-off owner win rate, Rookie | 54–70% | 69.4% (pre-T8) | PENDING |
| T7-23 | Hands-off owner win rate, Pro | 45–53% | 53.1% (pre-T8) | PENDING |
| T7-24 | Hands-off owner win rate, All-Star | 32–40% | 32.6% (pre-T8) | PENDING |

### 3e. Mandatory validation after Task 8 (GDD §59.10)

| ID | Item | Evidence | Status |
|---|---|---|---|
| T7-25 | Monster availability by position | M6 `position-coverage.json` | PENDING (re-read against the release) |
| T7-26 | Legal starting-lineup completion | M6: 0 flags in 8,505 AI club-weeks. Release: the hands-off owner forfeits whole seasons | AI clubs PASS (M6); owner **FAIL** as a study owner, real player protected by the lineup safeguard |
| T7-27 | Injury and departure replacement availability | none | PENDING |
| T7-28 | Long-term roster stability | Release: rosters 28–38 for 20 seasons | PASS on 4 runs |
| T7-29 | Draft position distribution | none | PENDING |
| T7-30 | First-round development and starting chances | none post-T8 | PENDING (with T7-14) |
| T7-31 | Free-agent availability by position | none | PENDING |
| T7-32 | Generated replacement frequency | none post-T8 | PENDING (with T7-15) |
| T7-33 | Gym elemental identity and starter composition | M6: each gym 2.7–4.0 times the league share of its element | PASS (M6) |
| T7-34 | Rebuilding recovery | none post-T8 | PENDING (with T7-7) |
| T7-35 | Persistent weak franchises | none post-T8 | PENDING (with T7-16) |
| T7-36 | Monster development and high-potential growth | M6 career findings (level pace) | PENDING for the Task 7 measures |
| T7-37 | Contract retention and departures | none post-T8 | PENDING |
| T7-38 | Salary-cap sustainability | M6 `ECONOMY_FINDINGS.md`: spare cap room reviewed | PENDING (20-season solvency on the release) |
| T7-39 | Forfeit frequency | Pre-T8: 5.6–9.4% of hands-off owner games. Release: whole seasons | **FAIL** for the hands-off owner; repair-owner figure PENDING (R-1) |
| T7-40 | AI franchise-management performance | league-health identity and trades rows | PENDING |
| T7-41 | Rookie, Pro and All-Star win rates | none post-T8 | PENDING (T7-22 to T7-24) |
| T7-42 | Owner and AI competitive balance over many seasons | Release: AI club strength holds at 58–63 overall from season 6 to 20 | PASS for AI strength; owner side PENDING |

### 3f. Task 7 decisions never closed, and economy items

| ID | Item | Source | Status |
|---|---|---|---|
| T7-43 | The draft and staff raises are not cap-checked | `TASK7_FINAL_REPORT.md` §8.3 | BLOCKED (owner decision) |
| T7-44 | AI clubs never offer signing bonuses or extensions | §8.4 | BLOCKED (owner decision); behaviour to re-measure |
| T7-45 | Negotiation values are initial calibration, not approved values | `TASK7_NEGOTIATION_RESULTS.md` §7.1–7.2 | BLOCKED (owner decision) |
| T7-46 | Contract structure: share of 3-year deals, largest expiry share | 50% at v42.21.0, 32% after negotiation | PENDING |
| T7-47 | Design-review notes: balance nudge, AI injury cover, AI staff allowance, cap-exempt gym legendaries, difficulty quality targets | GDD §59.10 | BLOCKED (owner review); no test defined |
| T7-48 | Free agency: signings, bidders, counteroffers, unsigned at close, AI spending by mode | `TASK7_FINAL_REPORT.md` §7 (reported, no gate) | PENDING |
| T7-49 | AI cap use | M6: mean committed share and spare room by mode | PENDING on the release |
| T7-50 | Kicker and specialist coverage | M6: the two "no kicker" rosters were a snapshot artifact | PASS (M6) |
| T7-51 | Retirement ages and aging curves | GDD §55 targets | PENDING (compare league runs with §55) |
| T7-52 | Apex contract ask (B9) implemented as adopted | owner adoption | PENDING (tests exist; effect on Apex movement not measured) |

## 4. Monster progression and competitive balance

| ID | Requirement | Approved target | Source | Evidence | Status |
|---|---|---|---|---|---|
| P-1 | Ordinary mixed-mode starters reaching level 50 within 8 seasons | at least 75% | Task 8 spec; owner kept the mixed-mode denominator | M6: 26 of 26 mixed-mode; 70.1% of all eight-season starters | PASS as defined (small sample); all-starter figure reported separately |
| P-2 | Ordinary median level 1 to 50 | 5–8 seasons | Task 8 spec | M6: season 7 | PASS (M6) |
| P-3 | Apex: sustained starters all 99s by the end of season 15 | 90% | Task 8 spec | Adopted rules: 96 of 96 in the 8-seed validation | PASS (validation harness); real-franchise confirmation PENDING |
| P-4 | Apex accumulation does not unbalance the league | none set | owner adoption | see A-16 | PENDING |
| P-5 | Evolution timing and Temper | as specified | Task 8 spec | contract tests; no league measurement | PENDING |
| P-6 | Training efficiency and age-adjusted costs | GDD §55 | league-health `trained` and `decline` rows | Release: recorded for seeds 11–14, not analysed | PENDING |
| P-7 | Career peaks and decline | GDD §55 | same | not analysed | PENDING |
| P-8 | Position strength and rarity | none set | — | not measured | PENDING |
| P-9 | AI team strength over time | no progressive weakening | owner brief | Release: 58–63 overall from season 6 to 20 | PASS |
| P-10 | Gym clubs against ordinary clubs | no numeric target found | M6 | M6: gyms win 58%, hold 61 of 78 titles | PENDING (no target; owner question) |
| P-11 | League parity: win distribution, playoff spread | none set | — | contaminated by forfeits | PENDING (R-1) |
| P-12 | Championship concentration | Task 6 band: ordinary title share 5–15% | T7-17 | Corrected runs: the leading club won 5–13 of 20 titles; 5–10 different champions per franchise | PENDING (ordinary against gym share not yet split; Rookie difficulty only) |

## 5. Task 9 history and Hall of Fame

| ID | Requirement | Approved target | Evidence | Status |
|---|---|---|---|---|
| H-1 | Eligibility after three completed seasons; no retroactive candidates; nobody twice | rule | tests; 12 franchises, 0 problems | PASS |
| H-2 | Ballot of the 15 strongest; class of at most three; results sealed; deterministic | rule | tests | PASS |
| H-3 | Individual merit outweighs titles | "substantially more" | Corrected runs: titles 3% of points; 109 of 123 inducted without title points | PASS |
| H-4 | Selectivity | none set (owner: "selective and prestigious") | Corrected runs: 10–20 inductees per franchise (mean 15.4), 49% empty classes, 15% classes of three | BLOCKED (owner sets the target) |
| H-5 | Positional fairness | "considered fairly", including specialists | Corrected runs: QB 13%, RB 12%, K 11%, LB 11%, TE 10%, DL 8%, OL 6%, WR 6%, CB 5%, S 5% | BLOCKED (owner judges whether this is fair enough) |
| H-6 | No backlog from the ballot or class limits | — | Corrected runs: the class limit binds in 8% of elections; 85% of inductees enter on their first ballot | PASS |
| H-7 | Highly accomplished monsters left out | — | Corrected runs: 7 of 1,515 eligible (listed in `BALANCE_AUDIT.md`) | PASS (measured); owner may review the names |
| H-8 | MVP distribution and repeat winners | none set | Corrected runs: the most MVPs by one monster per franchise: 4, 6, 6, 6, 7, 7, 12, 15 of 20 | BLOCKED (owner: is this acceptable?) |
| H-9 | Awards by position | none set | Corrected runs, 160 MVPs: WR 44, DL 44, QB 37, RB 27, TE 6, CB 2; no LB, S, OL or K | BLOCKED (owner) |
| H-10 | Record-breaking frequency; records stay meaningful over 20 seasons | none set | not measured | PENDING |
| H-11 | Awards reflect performance | GDD §16.4 model | not measured | PENDING |
| H-12 | Hall of Fame Day safeguards: nothing but the ceremony record changes | rule | twin-franchise test | PASS |

## Summary

| Area | PASS | FAIL | PENDING | BLOCKED |
|---|---|---|---|---|
| Harness | 0 | 0 | 2 | 0 |
| Football | 2 | 1 | 16 | 0 |
| Abilities | 3 | 2 | 14 | 2 |
| Task 7 | 5 | 2 | 41 | 4 |
| Progression and competition | 3 | 0 | 9 | 0 |
| History and Hall of Fame | 4 | 0 | 7 | 1 |
| **All (118 rows)** | 17 | 5 | 89 | 7 |

Counts take each row once; a row with two statuses is counted as FAIL if any part fails, otherwise BLOCKED, otherwise PENDING.

## Tests that exist nowhere yet

These requirements have no tool that measures them on the Task 8 game. They are the missing tests.

1. **Per-ability strength for all 144 abilities** (A-3, A-4, A-12): paired with-and-without runs per family, form and mastery tier, football and Clash. `tools/ability-balance.mjs` and `tools/clash-balance.mjs` predate Task 8 and must be checked against the new registry.
2. **Field-zone strength and combined-ability effects** (A-6, A-7).
3. **Type balance on the Task 8 catalogue** (A-5).
4. **AI ability use** (A-15).
5. **Playbook, formation, play-action and RPO effectiveness** (F-12).
6. **Special teams outcome tables** (F-14) and **offence against defence** (F-18).
7. **Per-position production plausibility** (F-11) and **position strength** (P-8).
8. **A league recorder for standings, playoff spread, titles, cap use, contracts and awards per season** (P-11, P-12, T7-37, T7-38, T7-48, T7-49, H-8 to H-11). The league-health recorder does not capture these.
9. **The Task 7 comparative benchmark on Task 8** (T7-7 to T7-24): the tools exist (`tools/task6-compare`, `balance-compare.mjs`, `task6-balance-gates.mjs`) but there is no approved Task 8 baseline, and the seed sets (320 franchise runs) take many hours.
10. **Attribute effectiveness on the Task 8 engine** (F-6 to F-10): `tools/attr-study.mjs` exists and needs re-running.
