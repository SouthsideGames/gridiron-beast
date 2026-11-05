# Task 7 — Ambition, Staff Negotiation and the Remaining Changes: Implementation and Targeted Results (2026-11-05)

**Status:**
- Development branch `task7-free-agency` only. Nothing is merged and nothing is published.
- The final consolidated benchmark has **not** been run. It waits for the owner's approval of these targeted results.
- The original pre-registered results (`docs/TASK7_FINAL_REPORT.md`) and the previous targeted results (`docs/TASK7_REMEDIATION_RESULTS.md`) stand unchanged.
- The figures below are targeted comparisons at the corrected measuring point (`--measure=start`, both builds), on the development seed sets. They have no held-out set and are not gate results.

---

## 1. What was implemented (owner's message of 2026-11-05, 07:36)

| Owner section | What changed | Main code | Tests |
|---|---|---|---|
| **1. Hidden Ambition** | One of Money, Loyalty, Championship, Opportunity per monster, individually, about a quarter each; permanent; saved; existing saves migrated once; never shown. Changes offer evaluation weights, adds a seeded mood, and gives each monster his own say on extension talks (§2). Owner and AI use one evaluation. | `ambition.js` (new), `fa-engine.js`, `franchise.js`, `league-season.js`, `data/monsters.js`, `position-migration.js`, `save.js`, `fa-ui.js`, `screens/roster.js` | `task7-ambition` (6 tests) |
| **2. Market activity** | Nothing forced: no quotas, no minimum bids, extension windows and Task 6 logic unchanged. Measured (§5 B). | — | — |
| **3. 32 teams** | Not implemented. Nothing in the Ambition or staff code counts 16 clubs: ranks and outlooks use the league's actual club count. | — | — |
| **4. Recovery** | No buffs. Measured (§5 A). | — | — |
| **5. Gym replacements** | Reviewed (§4). One narrow change: before a balance-nudge arrival is generated, a gym signs an available waiver or pool monster at the position who is at least as good (target + 1), fits its cap and accepts. | `league-season.js leagueNudge` | suite; diagnostics |
| **6. Younger depth** | For a non-essential depth place (starting group complete, no lineup hole), Rebuild and Retool subtract 0.75 and 0.4 points per year past 26 from a candidate's strategy value. Veterans can still win; contenders and starters unaffected; nothing generated. | `fa-strategy.js`, `league-season.js` | suite; diagnostics |
| **7. Contract lengths** | Unchanged (monster preferences kept). Measured (§5 C). | — | — |
| **8. Staff negotiation** | Performance-based demands in the approved bands; the five options; accept, counter or reject; seeded, two rounds, no reroll; cap check before every offer; AI allowance and candidate pool unchanged (§3). | `staff-negotiation.js` (new), `franchise.js`, `screens/hq.js` | `task7-staff` (5 tests) |
| **9. Saves** | Position migration unchanged. Ambition migration added (once, deterministic, nothing else touched). | `position-migration.js`, `save.js` | migration tests |
| **10. Earlier remediation** | Kept, all of it. | — | full suite |

**Not touched:** Nature assignments and mechanics, Temper, training-point costs, development formulas, training efficiency and attribute ceilings (a test checks that personality, training cost and overall are identical whatever a monster's Ambition, and that the development, ageing and personality modules never read it).

---

## 2. The Ambition system and its probability model

**Assignment.** `ambitionFor(id)`: a slice of the game's seeded hash of the monster's id. Ids come from the seeded generator, so a franchise seed always gives the same Ambitions. No generator draw is used, so every generated roster, draft class and pool is unchanged. On a 40,000-id sample: Money 9,918, Loyalty 9,990, Championship 10,066, Opportunity 10,026. One species family holds several Ambitions.

**Persistence.** Stored as `m.ambition` from generation. Evolution, trades, release and free agency keep the object, so the value never changes. Existing saves: `migrateAmbitions` gives every monster without one the same value his id would give, once (`f.ambitionMigration`), and fills any stragglers at a season's close (idempotent; never a reroll).

**Hidden.** No file under `src/ui` reads it (a test fails if one does). The outlook, the negotiation sheet, the GM Assistant and every screen checked in the browser contain no Ambition word. The player sees observations only:
- "He appears concerned about the team's competitive direction."
- "He is looking for a stronger financial offer."
- "He would like a clearer path to a starting role."
- "He appears interested in remaining with the organization."
- neutral lines ("He seems open to talking", "He seems curious about what the market would offer").

An observation is picked from the circumstances that hold, with a seeded draw that favours (65%) the one that matters to him, so it hints without disclosing.

**Model (one evaluation for every club, `rateOffer`).** The existing score (money, years, role, club success, weighted by his personality) gets:

| Ambition | Weight change | Circumstance read |
|---|---|---|
| Money | money ×1.6, winning ×0.7 | the offer against his ask |
| Loyalty | security ×1.2; at his drafting or established club (2+ seasons) a value worth at most 6% of the money part | where he was drafted or has played longest |
| Championship | winning ×1.7 | the club's competitive outlook: half recent results (this season and the last two, 0.5/0.3/0.2), half its starter strength's rank among the league's clubs |
| Opportunity | role ×1.7 | his role on the club against the role his level earns elsewhere |

Plus a **mood**: ±5% of the score, seeded per monster, club and league year. The same offer to the same club always gets the same answer; a better offer is never less likely to be accepted; two clubs with equal offers can get different answers.

**Extension talks (the monster's say).** Before an extension or renewal offer is evaluated, the monster decides whether to talk at all: one seeded draw per monster, club and contract, against a chance computed when asked:

| Ambition | Chance to talk |
|---|---|
| Default | 0.86 |
| Money | 0.90 |
| Loyalty | 0.97 at home, 0.86 elsewhere |
| Championship | 0.30 + 0.75 × competitive outlook (≈ 0.5 at a struggling club, 0.9+ at a contender) |
| Opportunity | 0.92 starter, 0.62 backup, 0.50 depth; 0.18 less when his level earns a bigger role elsewhere |
| Adjustments | +0.08 past his onset; −0.04 for a monster who would start anywhere (not Loyalty); always 0.15–0.98 |

- Asking again never rerolls (the draw is keyed to the contract). Changed circumstances (a club that starts winning, a promotion to starter) can reopen talks.
- Declining talks refuses nothing in free agency: his club may still bid there.
- The same rule applies to the owner's extensions, the owner's renewal book, AI extensions (both windows) and AI renewals.

**Safeguards.** Contract value, cap and roster checks, the counter and deadline rules and the lowball/patience rules are unchanged. Loyalty's value is bounded (≤ 6% of the money part). No Ambition makes any outcome certain (tests check both accept and refuse occur for every Ambition, and every talk chance stays inside 0.15–0.98).

---

## 3. Staff negotiation: implementation and behaviour

**As approved** (bands +6–8 / +3–5 / 0–2 / −4–0 / −8 to −4%; five options; accept, counter, reject; seeded; AI allowance and candidate pool unchanged). Full rule: GDD §59.6c.

**Verification of the scout and trainer measures (owner's request).** The proposal's measures did not reflect what these roles do in the code:
- The **trainer** affects only the Wednesday training bonus (success chance from his overall, bonus size by focus). He does not affect development. He is now judged on the bonus his sessions delivered against a league-average trainer in the same sessions.
- The **scout** affects prospect reveals and regional scouting, not who later starts. He is now judged on the value of the club's draft picks (overall + 0.3 × (potential − 70)) against the picks made within three slots.
- Both scores are multiplied by 0.6 because the owner's own choices share the result.

**Refinements as asked.** Two offers at most; a repeated offer gets the same answer. Answers in 400 seeded trials:

| Situation | Accept | Counter | Reject |
|---|---|---|---|
| Excellent member (asks +7%), offered +5% | 33% | 44% | 24% |
| Excellent member, offered the same salary | 0% | 20% | 80% |
| Good member (asks +4%), offered the smaller raise (+2%) | 69% | 31% | 0% |
| Average member (asks +1%), offered the same salary | 90% | 10% | 0% |
| Poor member (asks −2%), asked for a 5% cut | 82% | 18% | 0% |

The Excellent-at-+5% acceptance (33%) is the value most open to the owner's judgment of "limited" (§7).

**Observed behaviour (hands-off owner accepting every demand, 30 runs, 950 renewals):**
- Bands: Average 42%, Good 38%, Excellent 10%, Poor 9%, Very poor 1%.
- Mean change +2.3% per renewal.
- Owner staff cost as a share of the cap: 22.5% at season 1, 24.4% at season 8, 28.1% at season 19 (max 29.6%). Under the old +10% rule the same owner reached 53%.
- Minimum-staff exceptions: **0** in 400 offseasons (previous build: hands-off owners reached it by seasons 4–6).
- Browser check (320 and 390 px): staff rows show the band, the seasons behind it, the demand and change, cap fit, the five options; an offer gets an answer; no overflow; no page errors.

**Recovery from expensive staff:** base salaries never inflate, so a replacement at base salary is always available; letting a member go and hiring another is one decision, checked against the cap first; the default staff and the logged exception remain the last resort.

---

## 4. Gym replacements: review

The existing order already is: roster → draft → the market (urgent holes and the R5 upgrade before the draft; waivers and pools after it, monsters may refuse) → a generated arrival only when needed for a full, legal roster. One path skipped available monsters: the **balance nudge** (decision C), which generates an arrival at the target for a gym below its target band. On one 10-season run it was most of the gyms' generated arrivals from season 4 on (8–10 a season across 8 gyms, against 1–3 from the fill). It now tries an available waiver or pool monster at least as good (target + 1) first. Pool monsters that good are rare, so the effect is small (§5 D).

---

## 5. Targeted diagnostics

**How they were run:**
- **Builds:** v42.21.0 (the published tree; the same files as the previous targeted results) and this build `18af5b3`. Both recorded with `--measure=start` by the same harness.
- **Seeds:** C 106–115 (20 seasons) and B 1–20 (10 seasons, final offseason included). Owner drift: balance-compare, persistent league, board reset, seeds 1–12 × Rookie, Pro, All-Star, seasons 1–8.
- **Statistics:** `task6-compare`, unchanged thresholds, 95% bootstrap, matched seeds. No held-out set: indicative only.
- **A sensitivity variant (not implemented, C only):** the same build with the Ambition's talk decision limited to the extension windows, so the renewal at expiry is an ordinary offer the monster evaluates (with his Ambition's weights and mood). It isolates the largest new mechanism (§6).
- **Integrity:** 0 harness problems in 40 runs; 0 market problems; usable cap never negative in this build; 0 legendary-limit violations; no board firings in the 36 drift runs; 0 minimum-staff exceptions.

### A. The nine originally failed measures

| Measure | Previous targeted (remediation) | **This build** | Variant (talks for extensions only, C) |
|---|---|---|---|
| Rebuild recovery within 3 seasons (C) | −5.3 inconclusive | **−8.3 [−14.0, −2.6] worse** | −5.4 [−11.0, 1.0] inconclusive |
| Struggler starter age after 3 (C) | −0.02 inconclusive | −0.04 [−0.15, 0.09] inconclusive | — |
| Persistent weak groups (B) | +0.3 inconclusive | **+5.0 [2.9, 7.3] worse** | (B not run) |
| Persistent weak groups with cap room (B) | +9.0 (not interpretable across points) | +14.2 (not interpretable) | — |
| Persistent weak, position-relative (B) | +0.2 inconclusive | **+1.3 [0.8, 2.0] worse** | — |
| Young-reserve growth (B) | −0.05 worse | **+0.01 [−0.03, 0.05] inconclusive** | — |
| High-potential growth (B) | −0.08 inconclusive | +0.06 [−0.04, 0.17] inconclusive | — |
| Round-1 starter at year 2, late seasons (C) | −1.9 inconclusive | **−9.5 [−12.7, −6.4] worse** | −5.3 [−8.2, −2.7] worse |
| Generated gym starters, final season (C) | +5.3 worse | **+7.4 [5.6, 9.1] worse** | +5.9 [2.8, 8.6] worse |

**Reading:** young-reserve growth is now inconclusive. Four measures that the remediation had brought to inconclusive or near it are worse again. The mechanism is §6.

### B. Free agency and the Ambition (400 offseasons; previous build in brackets)

- **Volume:** 38.3 signings per offseason [24.4]. Unsigned at close 24.7 [29.5].
- **Competition:** 1.17 bidders per signing [1.11]; 7.5% of signings had a rival offer [5.0%]. Per offseason: mean 2.9 contested signings, from 0 to 8.
- **Extension talks declined (offseason window):** 12.5% of AI offers; per Ambition Money 7.0%, Loyalty 4.0%, Championship 23.4%, Opportunity 16.7%.
- **Starters declining talks per offseason window:** mean 10.4, median 8, range 0 to 50. Some offseasons have almost none and some many: the variation the owner asked for, not a quota.
- **Mid-season window:** 54% declined, mostly monsters who had already declined at the league year's turn (the same contract's draw, re-read against the season's circumstances); 41% of those asked signed.
- **Renewals at expiry refused:** 42.5% of AI renewal offers [9.5%]. 18.3 per offseason are talk refusals. The monsters reaching expiry are mostly those who already declined to extend, so the share is high by selection.
- **Signing age:** 28.1 [29.7]. By mode, share aged 30 or older: Rebuild 36.3% [43.7%], Retool 26.6% [38.7%], Compete 40.1% [57.8%], Contend 52.8% [70.6%]. The younger-depth rule and the younger free agents the Ambition releases both contribute.
- **Contract lengths:** 1 year 31.8%, 2 years 41.3%, 3 years 26.9% of signings. Three-year deals league-wide 36.1% [36.6%] (v42.21.0 50.4%); largest expiry share +2.2 [+2.8] worse; succession ready −1.2 worse [−1.4]. No material change from the previous build.

### C. Young-monster retention and composition (C, AI clubs, per club-season)

| | v42.21.0 | Previous build | **This build** | Variant |
|---|---|---|---|---|
| Young (≤ 25) walks, losing clubs | 0.15 | 0.24 | **1.37** | 0.48 |
| Young walks, middle clubs | 0.22 | 0.17 | **1.06** | 0.27 |
| Young walks, winning clubs | 0.32 | 0.22 | **0.93** | 0.32 |
| Generated arrivals, losing clubs | 0.63 | 1.12 | **1.67** | 1.20 |
| Young monsters per club | 11.03 | 11.17 | 10.96 | 11.15 |

Round-1 starts at year 2 fall (all seasons −8.4 [−10.8, −5.9]); veterans starting +8.4; retirements −2.4 per season; "young payment" (pay to young monsters) −8.3.

### D. Gyms

- **Generated gym starters:** +7.4 (above). Gyms lose more monsters to the Ambition: walks per gym club-season 4.47 [3.43; v42.21.0 3.11], generated arrivals 1.29 [0.99; 1.12]. The pool-first nudge works but rarely finds a monster as good as the target.
- **Strength:** gym against ordinary win% +1.2 inconclusive; gym title share 100% [98.5]; gym lead in season 20 +1.7; tier order held 9 of 10 seeds (same as v42.21.0).
- **Elemental identity:** GYM_ELEMENT_LINE
- **Lineup completeness:** AI club-seasons recorded with an open starting slot: 0.08% (5 of 6,000), the same as the previous build (0.08%) and v42.21.0 (0.13%).

### E. Owner drift (seasons 1–8, 12 seeds, against v42.21.0; previous build in brackets)

| Difficulty | v42.21.0 | Previous build | This build | This build against v42.21.0 | Against previous |
|---|---|---|---|---|---|
| Rookie | 73.7 | 69.8 | 65.6 | **−8.1 [−13.9, −2.0]** | −4.2 [−9.5, 1.4] |
| Pro | 58.1 | 55.7 | 55.6 | −2.5 [−9.1, 3.9] | −0.1 [−3.1, 3.5] |
| All-Star | 39.5 | 35.3 | 32.9 | **−6.6 [−12.4, −0.5]** | −2.4 [−6.5, 1.4] |

The owner's monsters answer with the same Ambition rule, so the hands-off owner loses more renewals. The change against the previous build is not significant at any difficulty, but Rookie and All-Star are now significantly below v42.21.0. No difficulty coefficient was changed. Owner win% in seasons 9–20 (C): −9.8 [−16.1, −2.5].

### F. Salary cap and staff

- **AI clubs:** usable cap never negative; 0 AI floor releases; 0 AI draft passes.
- **Owner staff over 20 seasons:** 22.5% of the cap at season 1, 24.4% at 8, 28.1% at 19 (max 29.6%). Under the old rule: 53%.
- **Minimum-staff exceptions: 0** in 400 offseasons (previous build: by seasons 4–6 for the hands-off owner).
- **Owner roster-minimum releases:** 0 in 30 runs.

### G. Saves

- **Ambition migration:** a stripped save gets every Ambition back exactly (same value as its id gives), once; nature, attributes and potential unchanged; a second load changes nothing.
- **Position migration:** unchanged, all migration tests pass.
- **Staff:** old offseason books without an evaluation are evaluated when first decided; saves without staff records are judged as Average.

### H. Tests and performance

- **Full suite: 871 of 871 passed** (`18af5b3`), including 11 new tests (6 Ambition, 5 staff). Three older tests were updated: the staff-raise expectation (now the performance-based demand), a stats test that now fills the roster when monsters decline to renew, and the R3/R7 tests (talks first; a real current salary on the injected staff item).
- **Browser check (320 and 390 px):** staff renewal rows, the renewal outlook with its observation, HQ: no Ambition words, no overflow, no page errors.
- **Stage P:** STAGE_P_LINE

---

## 6. The mechanism behind the new regressions

The new regressions come from one design choice in the Ambition system: **the talk decision covers the whole contract**. A monster who declines to discuss an extension also declines his club's renewal at expiry (the same seeded draw, re-read against the circumstances then), so he reaches the market.

- About 35 more monsters a season leave AI clubs: about 18 renewal talk refusals plus the extension refusals behind them.
- They are disproportionately young: Opportunity monsters who are backups or depth (talk chance 0.32–0.62) and Championship monsters at losing clubs (about 0.5). Losing clubs' young walks rise from 0.24 to 1.37 per season.
- R1's draft-aware timing means AI clubs bid before the draft only for urgent holes and their upgrade. So a club rarely wins its own departing monster back, and the places are filled after the draft from the pools and, when needed, by generated arrivals.
- Result: weaker groups for longer (persistent weak +5.0), slower recovery (−8.3), fewer round-1 picks still starting at year 2 (they leave at their first expiry), more generated gym starters.

**The variant confirms it:** when the talk decision covers only the extension windows and the renewal at expiry is an ordinary evaluated offer, young walks at losing clubs fall to 0.48, recovery returns to −5.4 (inconclusive, as before the Ambition), and generated gym starters to +5.9. But only 5.9% of renewals are then refused, so most monsters who declined to extend still re-sign at expiry. The market grows less (32.8 signings, 4.3% contested), and the Ambition's effect on who reaches free agency is much smaller.

No parameter was tuned toward a benchmark number. Both readings are within the owner's specification; which one is intended is a design decision (§7).

---

## 7. Decisions requiring the owner's approval before the final benchmark

1. **How far a declined extension carries (the main one).**
   - **A. As implemented:** declining talks covers the renewal at expiry too, so the monster tests the market (his club may still bid there). Strong agency and a busier, more varied market, but the regressions in §5 A and C, and owner drift that is now significant on Rookie and All-Star.
   - **B. The variant:** talks govern the extension windows only; at expiry the club's renewal offer is evaluated like any offer (with his Ambition's weights and mood). Regressions back to the previous build's level on the measures run; weaker agency.
   - **C. A middle reading (not measured):** A for monsters past the rising stage (over 25, or at their second contract onward), B for young monsters on their first contracts. This would keep stars' agency and protect development. It is a new rule and needs approval before it is built and measured.

   My recommendation is C, or B if a simpler rule is preferred. Under A the size of the youth effect is larger than "believable variation" seems to call for.
2. **Talk-chance values:** the table in §2 is my calibration, not owner-approved values. If the owner prefers A, Opportunity's backup and depth chances (0.62 and 0.50, less 0.18 when blocked) are the main lever on youth departures.
3. **Staff acceptance of less than the demand:** Excellent staff accept an offer 2% under their demand 33% of the time. Lower it if "limited" should mean rarer.
4. **Generated gym starters** remain worse under every reading. The pool-first nudge is the narrow change the owner allowed; it rarely finds a monster good enough. Accept this as the one-position catalogue's limit, or approve a further change.
5. **Round-1 starts at year 2, late seasons** remain worse in the variant (−5.3). Under B or C this should be re-measured with B seeds and held-out sets before any change.
6. **Final benchmark:** once 1 is decided, run it at the season-start point for both builds with held-out seeds, keeping the original and previous results on record. It waits for approval.

---

## 8. Files

- Code: `src/franchise/ambition.js`, `src/franchise/staff-negotiation.js` (new); `fa-engine.js`, `fa-ai.js`, `fa-strategy.js`, `franchise.js`, `league-season.js`, `position-migration.js`, `save.js`, `data/monsters.js`; UI `fa-ui.js`, `screens/roster.js`, `screens/hq.js`.
- Harness (recording only): `tools/ai-franchise-benchmark.mjs` records the extension windows, renewal talk refusals, each signing's Ambition and the owner's staff.
- GDD §59.5a (younger depth, gym replacements), §59.5b (Ambition), §59.6a, §59.6c (staff).
- The staff proposal (`TASK7_STAFF_NEGOTIATION_PROPOSAL.md`) is marked approved, with the implementation differences listed.
