# Task 7 — Contract Negotiations: Audit, Implementation and Targeted Results (2026-11-05)

**Status:**
- Development branch `task7-free-agency` only. Nothing is merged, nothing is published, and the final consolidated benchmark has **not** been run.
- The original pre-registered results and the earlier targeted results (`TASK7_REMEDIATION_RESULTS.md`, `TASK7_AMBITION_STAFF_RESULTS.md`) stand unchanged.
- The figures below are targeted comparisons at the corrected measuring point (`--measure=start`, both builds), on the development seed sets: indicative, not gate results.

---

## 1. Audit of the previous negotiation flow (owner's §8)

| Question | What the code did |
|---|---|
| 1. How many club offers? | **Owner renewal:** no fixed number. Each offer was evaluated; a close one drew a counter, for up to three rounds. **Owner extension:** unlimited and stateless (the same offer always got the same answer, but any number of different offers could be tried). **AI extension and renewal:** one offer, plus his counter when affordable. **Free-agency market:** two revisions per offer per period (unchanged). |
| 2. Did the monster counter? | Yes (`counterTerms`): the salary that just satisfies him, at his preferred term. It was static, not a concession: always the same number for the same club. |
| 3. What ended talks? | **Owner renewal:** any offer below 90% of what he needed ended it at once, and he went to free agency. Also the third round, or the Ambition talk draw. **Extensions:** nothing ended them. |
| 4. Could he reject one offer and keep talking? | Only when the offer was within 90% of what he needed. |
| 5. Did an extension refusal carry into the renewal? | **Yes: the main defect.** The Ambition talk draw was keyed to the contract, so a monster who would not discuss an extension also refused the renewal at expiry and reached the market. The club never had a real final opportunity. |
| 6. Same opportunities for AI clubs? | **No.** AI clubs got one offer and a counter; the owner got up to three rounds at renewal and unlimited attempts at extension. |
| 7. Were attempts stored? | Renewal rounds were stored on the offseason item (saved). Extension attempts were not stored at all. |
| 8. Did the UI show attempts left? | No. |
| 9. Could he refuse to negotiate entirely? | Yes, through the Ambition talk draw per contract (and, in the market, a club that lowballed twice in a league year). |

**Reused, not rebuilt:**
- the shared offer evaluation (`rateOffer`: money, years, role, results, Ambition weights and mood);
- the counter mathematics (generalized from `counterTerms` into `reservationAt`, the salary that just satisfies him at any term and bonus);
- the talk decision (`talksOpen`), the lowball and patience rule, the cap checks and extension sealing;
- the AI's Task 6 terms (`aiYears`, mode) and R6 cap-saving bonus;
- the offseason renewal book and the negotiation sheet.

The free-agency market periods (offers, revisions, deadlines, ranking of rival offers) are unchanged.

---

## 2. The negotiation now (GDD §59.4a)

**Windows** (each is its own negotiation, saved in `f.freeAgency.talks`):

| Window | When | Who |
|---|---|---|
| Early extension | from the league year's turn (free agency opening) to week 5 of the contract's final season | owner any time; AI clubs at the turn |
| Mid-season extension | week 6 to the season's close | owner any time; AI clubs at week 6 |
| Renewal | at the season's close, when the contract expires, **before free agency opens** | owner's offseason book; AI clubs at the close |

**Offseason timing (unchanged):**
1. Season close: ageing; the AI clubs' Task 6 renewal decisions and their renewal negotiations; the owner's renewal book opens.
2. The owner settles every renewal.
3. Free agency opens (Period 1). The league year turns, signed extensions take effect, and the AI clubs' early-extension window runs.
4. Periods 1–5, then the draft, then the season start (depth signings), then week 6 (the AI mid-season window).

**The process:**
1. **Talks:** in each window the monster first decides whether to negotiate. This is an independent seeded draw for that window, against his Ambition-based chance computed from the circumstances then.
   - For the renewal the refusal chance is halved: refusing it means he has decided to test free agency.
   - An early refusal is never carried into the renewal.
2. **Opening demand:** his market ask at his preferred term, moved by the circumstances at this club. The move is half the difference between his reservation here and an ordinary club's. Then a margin: 4%, plus 6 for Money and 2 for Championship and Opportunity. The result stays between 0.92 and 1.35 of the ask.
3. **The club** may accept his current demand at any time. That is binding and uses no attempt. Or it makes a **counteroffer, at most two per window.**
   - An offer the cap cannot carry is refused before it counts.
   - Every attempt is saved: closing the screen, saving and reloading, or repeating an offer never gives a new chance.
4. **His answer to the first counteroffer:**
   - At or above his reservation: he accepts with a chance from 35% (at his reservation) to 85% (at his demand); otherwise he counters.
   - Below his reservation: he counters. After an insulting offer (money under 75% of his ask) he may instead end the talks: Money 50%, Championship and Opportunity 35%, Loyalty 15%.
   - **His counter** moves from his demand toward the offer by 35% of the gap (Money), 60% (Loyalty) or 50% (the others). It is never below his reservation at this club or 85% of his ask.
5. **The second counteroffer gets his final decision:** accept (60–95% when at or above his reservation; at most 15% just below it), or end the talks.
6. **After a breakdown:** an extension window simply closes ("not now"; the next window is new talks). A renewal breakdown means he tests free agency when Period 1 opens; his club may still bid there.

**Safeguards:**
- Nothing below 85% of his market ask is ever inside his reservation (the existing lowball rule). So no Ambition, Loyalty included, allows a lowball contract.
- One seeded draw per negotiation and round.
- Screens show a negotiation without opening it.
- An agreed contract is binding. Bonuses and terms work as before.

**AI clubs, same engine:**
- Target: the ask × its mode (Contend 1.0, Compete 0.96, Retool 0.94, Rebuild 0.92).
- Ceiling: 1.12 × the ask for its core, 1.03 otherwise, +0.04 in Contend.
- Every offer must fit its cap, with the R6 bonus only where it saves cap.
- It accepts an opening at or near its target. Otherwise it counters at its target, takes his counter within its ceiling, or else counters once more halfway (within its ceiling). It may fail, and it may lose the monster.

---

## 3. How Ambition shapes the negotiation

All through the one evaluation (no fixed behaviour):

| Ambition | Opening demand | Counters | Final decision |
|---|---|---|---|
| Money | +6% margin; the money weight ×1.6 makes below-ask offers score low | concedes 35% of the gap | an insult ends talks half the time; still accepts below his demand often |
| Loyalty | at his drafting or established club, a bounded value (≤ 6% of the money part) lowers his reservation, so lower demands at home | concedes 60% | an insult ends talks only 15% of the time; never below 85% of his ask |
| Championship | the club's outlook ×1.7: lower demands at a contender, higher at a struggling club | 50%, but never below a reservation that is high at a struggling club | more willing at a contender; still can take the larger contract elsewhere in free agency |
| Opportunity | the role ×1.7 against the role his level earns elsewhere: lower at a club where he starts, higher where he is blocked | 50% | the role is read from the actual roster (`roleAt`), so no promise can be faked |

Measured on one league (the negotiation tests and a 600-monster probe): opening demand ÷ ask, mean: Money 1.02, Opportunity 0.98, Championship 0.98, Loyalty 0.95. Championship monsters ask clearly less from the strongest club than from the weakest, more so than other Ambitions. Every Ambition both accepts and declines some offers at 92% of its opening.

---

## 4. Extension refusals and renewals now

- **Declining early talks:** a "not now" for that window. The mid-season window and the renewal are new decisions with their own draws.
- **Rejecting an offer:** one step in a negotiation. He usually counters; only an insulting offer may end it, and not always.
- **Testing free agency:** decided only at the renewal, either by declining to negotiate (half as likely as declining an early extension) or by ending the renewal talks.
- On one league, more than 30% of monsters who would refuse early talks negotiate their renewal (test), and fewer refuse the renewal than refuse early talks.

---

## 5. Tests

RESULTS_TESTS

---

## 6. Targeted diagnostics

**How they were run:**
- **Builds:** v42.21.0 (the same baseline files as the previous targeted results) and this build (`bc75960`). Both recorded with `--measure=start`.
- **Seeds:** C 106–115 (20 seasons) and B 1–20 (10 seasons). Owner drift: seeds 1–12 × Rookie, Pro, All-Star, seasons 1–8.
- **Statistics:** `task6-compare`, unchanged thresholds, 95% bootstrap, matched seeds, no held-out set: indicative only.
- **Integrity:** 0 harness problems in 30 runs; 0 market problems; usable cap never negative; 0 legendary-limit violations; 0 minimum-staff exceptions.

**Two intermediate versions were measured and are reported, not hidden:**
- **First version:** AI clubs accepted his counter at his own term. Contract structure regressed: 3-year deals fell to 22.4% and the largest expiry share rose by 6.5.
- **Second version:** AI clubs insisted on their own term in every offer and counter. Negotiations broke down far more often: recovery −16.8 on C, and young departures from losing clubs rose to 1.31.
- **This build:** an AI club opens at its own term (Task 6 R3, moved to his preference when one season apart and its mode allows). It takes his counter, at his term, within its ceiling. The monster's preference and the club's planning both count, and talks rarely break down over the term alone. No probability in the monster's model was changed between the versions.

### A. The nine originally failed measures (v42.21.0 → this build; previous builds for reference)

| Measure | Remediation (before Ambition) | Ambition as first built | **This build** |
|---|---|---|---|
| Rebuild recovery within 3 seasons (C) | −5.3 inconclusive | −8.3 worse | **−1.3 [−7.2, 5.1] inconclusive** |
| Struggler starter age after 3 (C) | −0.02 inconclusive | −0.04 inconclusive | +0.06 [−0.06, 0.17] inconclusive |
| Persistent weak groups (B) | +0.3 inconclusive | +5.0 worse | **−0.04 [−2.6, 2.4] inconclusive** |
| Persistent weak groups with cap room (B) | +9.0 (not interpretable) | +14.2 | +9.8 (not interpretable) |
| Persistent weak, position-relative (B) | +0.2 inconclusive | +1.3 worse | +0.9 [0.4, 1.4] worse |
| Young-reserve growth (B) | −0.05 worse | +0.01 inconclusive | −0.01 [−0.06, 0.03] inconclusive |
| High-potential growth (B) | −0.08 inconclusive | +0.06 inconclusive | −0.14 [−0.24, −0.05] worse (small) |
| Round-1 starter at year 2, late seasons (C) | −1.9 inconclusive | −9.5 worse | −2.8 [−4.4, −1.1] worse |
| Generated gym starters, final season (C) | +5.3 worse | +7.4 worse | **+3.7 [1.7, 6.0] worse** (the smallest of any Task 7 build) |

### B. Departures and composition (C, AI clubs, per club-season)

| | v42.21.0 | Remediation | Ambition as first built | **This build** |
|---|---|---|---|---|
| Young (≤ 25) walks, losing clubs | 0.15 | 0.24 | 1.37 | **0.60** |
| Young walks, all clubs | 0.23 | 0.21 | 1.11 | **0.43** |
| Starter walks (established starters) | 1.06 | 0.97 | 1.47 | **0.94** |
| Starter walks, 75+ overall | 0.19 | 0.18 | 0.30 | **0.17** |
| Generated arrivals, losing clubs | 0.63 | 1.12 | 1.67 | **1.06** |
| Recovery within 3 seasons (raw, C) | 41.8% | 36.2% | 32.9% | **38.6%** |

Young monsters still leave more often than in v42.21.0, by their own decisions: about 0.2 more per club-season. Established stars leave at the v42.21.0 rate.

### C. The negotiations (400 offseasons)

- **AI extension windows** (at the league year's turn; mid-season):
  - accepted at the opening: 36% and 26%;
  - agreed after counteroffers: 45% and 40%;
  - no agreement after negotiating: 1.2% and 3.7%;
  - not negotiating in that window: 18% and 30%.
- **Not negotiating early, by Ambition** (turn window): Money 11%, Loyalty 4.5%, Championship 34%, Opportunity 23%.
- **Starters declining early talks per offseason:** mean 16.8, median 15, range 5 to 52.
- **AI renewals at expiry:** 85% re-signed. Of the 15% refused, two-thirds declined to negotiate (they test free agency) and one-third broke down in negotiation (previous build: 42.5% refused).
- **Free agency:**
  - 27.8 signings per offseason (remediation 24.4; Ambition as first built 38.3);
  - 1.14 bidders per signing;
  - 6.2% of signings contested; per offseason from 0 to 6 contested signings, median 2.

  The market is a little busier than before the Ambition and varies naturally; nothing is forced.
- **Signing age:** 29.0.
- **Contract lengths** (signings): 1 year 37.9%, 2 years 38.7%, 3 years 23.4%. League-wide 3-year deals 32.4% (remediation 36.6%, v42.21.0 50.4%). Largest expiry share +3.1 worse (remediation +2.8). Succession ready −0.9 and succession cover −0.5, both inconclusive.

### D. Other measures (this build against v42.21.0)

- Round-1 starters at year 2, all seasons: −5.6 worse.
- Veterans starting: +6.9.
- Retirements: −1.9 per season.
- Improving at 33+: +1.2, inconclusive.
- Physical change past onset: +0.12 worse (a measuring-point effect, unchanged).
- Gyms: against ordinary clubs +0.6, inconclusive; lead in season 20 +1.2; tier order held as in v42.21.0.
- Staff: owner staff 22.5% of the cap at season 1, 24.1% at 8, 27.2% at 19; 0 minimum-staff exceptions.
- GYM_LINE

### E. Owner drift

DRIFT_LINE

### F. Performance

STAGEP_LINE


---

## 7. Remaining regressions and decisions

RESULTS_DECISIONS
