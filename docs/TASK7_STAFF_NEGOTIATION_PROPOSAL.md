# Task 7 — Performance-Based Staff Contract Negotiation: Design Proposal (2026-11-05)

**Status: APPROVED WITH REFINEMENTS (owner, 2026-11-05 §8) and IMPLEMENTED on `task7-free-agency`.** The implemented rule is GDD §59.6c and `src/franchise/staff-negotiation.js`; results are in `docs/TASK7_AMBITION_STAFF_RESULTS.md`. This document is kept as the proposal that was approved. Differences in the implementation:
- **Scout and trainer measures changed after verification (the owner asked for it).** In the game code the trainer affects only the Wednesday training bonus (success chance and size), not development; the scout affects prospect reveals and region scouting, not who starts. So the scout is judged on the value of his club's picks against the picks made around them, and the trainer on the training bonus delivered against a league-average trainer in the same sessions. Both scores are shrunk by 0.6 because the owner's own choices share the result.
- **Negotiation made less predictable, as the owner asked:** a seeded ±2% pride on the reservation, 2 more points of flexibility when a comparable candidate would take the job for the offer, and an acceptance chance (from 35%) rather than a certain counter between reservation and demand. Excellent staff therefore sometimes take a little less, and poor staff usually but not always take a cut.
- **The five options are concrete offers:** the demand; half the raise; the same salary; a 5% cut (from the lower of the salary and the demand); let go and replace.

---

## 1. The staff today (code and data)

| Role | Count in the game | Base salary range | What the role does in play today |
|---|---|---|---|
| Head coach | 3 candidates | 96,000–117,000 | Team identity: offence and defence style, aggression, pass bias. Named in awards and postseason events. |
| Offensive coordinator | 3 | 75,000–90,000 | Offensive scheme (pass, run, balanced). Scheme fit for monsters (fit markers, play adaptation). |
| Defensive coordinator | 3 | 72,000–93,000 | Defensive scheme (pressure, coverage, man). Scheme fit. |
| Head scout | 3 | 66,000–75,000 | Scouting skill by biome. Reveals prospects and recruits. |
| Monster trainer | 3 | 66,000–75,000 | Training-focus bonuses (passing, rushing, coverage, pass rush). |

**Owner's staff:**
- **Defaults:** the default staff costs 405,000 in total. That is 22.5% of the Challenger cap (1,800,000), 15.6% of Vanguard (2,600,000) and 11.2% of Sovereign (3,600,000).
- **Contracts:** 1 or 2 seasons (`staffContracts`).
- **Renewal:** at the end of a contract the owner either re-signs at +10% (`STAFF_RAISE`, multiplied into `staffRaise[role]`) or lets the member go.
- **Hiring:** a new hire starts at the candidate's base salary.
- **Severance:** firing mid-season leaves the rest of that season's salary on the books.

**AI clubs:** they have no individual staff. Each carries a fixed staff allowance against its cap (owner's decision, 2026-10-23).

**What the current rule does over 20 seasons** (always renewing on 2-season contracts, 9 renewals by season 19):

| Renewal change | Multiplier | Staff cost (default staff) | Share of Challenger / Vanguard / Sovereign cap |
|---|---|---|---|
| +10% (current) | ×2.36 | 955,000 | 53.1% / 36.7% / 26.5% |
| +8% | ×2.00 | 810,000 | 45.0% / 31.1% / 22.5% |
| +5% | ×1.55 | 628,000 | 34.9% / 24.2% / 17.5% |
| +4% | ×1.42 | 576,000 | 32.0% / 22.2% / 16.0% |
| +2% | ×1.20 | 484,000 | 26.9% / 18.6% / 13.4% |
| 0% | ×1.00 | 405,000 | 22.5% / 15.6% / 11.2% |
| −3% | ×0.76 | 308,000 | 17.1% / 11.8% / 8.6% |

The 53% figure is reached only by an owner who renews everyone every time. Under the proposal that becomes a choice with alternatives (§6), not an automatic outcome.

---

## 2. Statistics the game already tracks (no invented metrics)

| Statistic | Where |
|---|---|
| Wins, losses, ties; points for and against | `f.season.records[club]` (`w`, `l`, `t`, `pf`, `pa`) every season |
| Final place, playoffs, champion | `f.history[]` (`record`, `place`, `playoffs`, `champion`) |
| Per-monster season statistics for every club | `f.season.leagueStats` and the archived `history[].leagueStats`: passing and rushing yards, touchdowns, interceptions thrown, fumbles; sacks, interceptions, pressures, yards and touchdowns allowed, and more |
| Team strength (talent) | `teamOverall` of a club's starters, the same measure the strategy and the benchmark use. Computable for every club at any moment. |
| Development | each monster's overall season to season (Career Timeline) |
| Draft results | `m.drafted` (year, round, overall), the depth chart (starter or not) |

**One small recording addition is proposed (not a new statistic):** at each season's close, store for every role's evaluation the season's
- `pf` and `pa`;
- the club's preseason talent rank;
- the team's offensive and defensive yards from `leagueStats`.

This is needed because `history[].record` keeps only W-L-T today.

---

## 3. Performance evaluation (proposed)

Each season, each role gets a score **P_season** between −1 and +1.

**The expectation comes from talent:** the club's rank (1–16) in the matching talent measure at the season's start, among the league's 16 clubs.

**Actual against expected:**

| Role | Actual | Talent measure | Score |
|---|---|---|---|
| Head coach | win % rank; a playoff appearance +0.15, a title +0.3 (capped at +1) | team overall rank | `(expected rank − actual rank) / 15` + bonuses |
| Offensive coordinator | points-for-per-game rank (yards per game as a tie-break) | offensive starters' overall rank | `(expected − actual) / 15` |
| Defensive coordinator | points-against-per-game rank (fewest = 1; yards allowed as a tie-break) | defensive starters' overall rank | `(expected − actual) / 15` |
| Head scout | the share of the club's draft picks of the last 3 classes who start within 2 seasons, against the league's share | — | difference / 0.25, clamped to ±1 |
| Monster trainer | mean overall gain of the club's monsters aged 25 or under, against the league mean | — | difference / 1.5 points, clamped |

**Why this is fair to a coordinator with a rebuilding roster:**
- The DC of the 14th-ranked defensive roster who allows the 9th-fewest points scores **+0.33** (good).
- The DC of the 2nd-ranked roster who allows the 8th-fewest scores **−0.40** (poor).

**Contract-period evaluation:** over the seasons of the expiring contract, with recency weights.
- 1 season: 1.0.
- 2 seasons: 0.6 latest, 0.4 earlier.
- 3 or more: 0.5, 0.3, 0.2.
- So two excellent seasons and one poor one average out rather than being judged on the last season.

**Bands:**

| Band | P (contract) |
|---|---|
| Excellent | ≥ +0.45 |
| Good | +0.15 to +0.45 |
| Average | −0.15 to +0.15 |
| Poor | −0.45 to −0.15 |
| Very poor | < −0.45 |

---

## 4. Salary demands (proposed ranges for approval)

**Demand** = current salary × (1 + change). The change is placed inside the band by P, plus up to one point for the member's quality: his overall above 85 adds leverage, below 80 removes it.

| Band | Proposed change | Recommendation |
|---|---|---|
| Excellent | +6% to +8% | Successful staff become clearly more expensive. |
| Good | +3% to +5% | |
| Average | 0% to +2% | A freeze is possible. |
| Poor | −4% to 0% | Will consider a reduction to keep the job. |
| Very poor | −8% to −4% | Readier to accept a cut, or to leave (§5). |

**About the 5% the owner mentioned:**
- The data supports about +5% as the *Good* ceiling and +8% as the *Excellent* ceiling.
- An owner who keeps an always-excellent staff for 20 seasons ends near ×2.0 (45% of the Challenger cap): expensive, as intended.
- An average staff ends near ×1.2.
- A flat 5% for everyone would treat good and poor staff alike, which is the problem the owner wants solved.
- These numbers are recommendations, not approved values.

---

## 5. Negotiation (proposed)

**The owner's options at expiry:**
1. accept the demand;
2. offer a smaller increase;
3. offer the same salary;
4. ask for a reduction;
5. decline and hire another member.

**The staff member's answer:**
- **Reservation salary** = demand × (1 − flexibility):

  | Band | Flexibility |
  |---|---|
  | Excellent | 0% |
  | Good | 2% |
  | Average | 4% |
  | Poor | 8% |
  | Very poor | 12% |

  Members with overall ≥ 85 get 2 points less flexibility (they have leverage).
- **Offer ≥ demand:** accepts.
- **Reservation ≤ offer < demand:** counters once, halfway between the offer and the demand. A second offer at or above the counter is accepted; anything lower ends the talks.
- **Offer < reservation:** declines. A member in the Very poor band leaves at once. Others may be offered again once; a repeat below reservation ends the talks.
- **Determinism:** the member's "pride" is a seeded ±2% around the reservation (the franchise seed, the member and the season), so the same save always gives the same answer.

**Guarantees:**
- A poor performer accepting a cut is plausible but not guaranteed.
- No answer depends on whose club it is.
- An offer must also fit next season's cap (R7). If it does not, the screen says so before the offer is made.

---

## 6. Alternatives and turnover

- **Replacements:** every role always has candidates at their base salary (3 per role today).
- **Turnover:**
  - Base salaries do not inflate; a member's salary rises only through his own renewals. A successful, expensive coach can therefore always be replaced by a cheaper candidate.
  - Keeping him is a real cap decision.
  - Replacing him costs the coach's quality and scheme fit, which is the trade-off the owner wants.
- **Default staff:** stays the quick-start choice; the R7 minimum-staff exception stays as approved.
- **Owner's question to consider (not proposed):** 3 candidates per role is a small pool. A larger pool of candidates would make turnover richer, but it is a content change. It also borders on the coaching carousel, which needs separate approval.

---

## 7. AI clubs

- No change proposed: AI clubs keep the fixed staff allowance (owner's decision of 2026-10-23).
- The evaluation could later drive an AI allowance by results, but that is not proposed for Task 7.
- The owner-versus-AI cap comparison is unaffected because AI staff costs do not change.

---

## 8. Cap effects over 20 seasons (expected)

**By staff performance**, for an owner who always renews at demand:

| Staff | Season-19 multiplier | Staff cost | Share of the Challenger cap |
|---|---|---|---|
| Excellent | ≈ ×1.7–2.0 | 690,000–810,000 | 38–45% |
| Good | ≈ ×1.3–1.55 | 530,000–630,000 | 29–35% |
| Average | ≈ ×1.0–1.2 | 405,000–485,000 | 22–27% |
| Poor | ≈ ×0.7–1.0 | — | — |

- Most owners promote to Vanguard or Sovereign over 20 seasons, where the shares fall by about a third and about a half.
- The diagnostics after implementation will measure the actual paths on the benchmark seeds with the hands-off owner. The harness owner accepts the demand (or the counter) and replaces a member only when the cap forces it.

---

## 9. Save compatibility

- **What stays:** existing `staffRaise` multipliers stay; a member's current salary is unchanged and becomes the basis of his next demand. Existing contracts run to their end; nothing is renegotiated mid-contract.
- **Missing history:** a save without per-season staff records evaluates the seasons it has (`history[].record`, place, playoffs, champion). Missing `pf`/`pa` falls back to the win-rank evaluation for coordinators for those seasons.
- **No schema change:** the new per-season staff record is optional, so the schema stays at 9.

---

## 10. Tests (on approval)

- Evaluation: the bands from fixed inputs, including a strong roster that under-performs and a weak roster that over-performs; recency weighting.
- Demand within the band; the quality adjustment; determinism.
- Negotiation:
  - each of the five owner options gives accept, counter or reject per the rules;
  - a counter then a second offer;
  - a Very poor member walks;
  - poor performers accept some cuts and not others (seeded).
- R7 integration: an unaffordable offer is refused before it is made; the exception path is unchanged.
- Saves: old saves evaluate without the new records.
- Diagnostics: staff cost paths over 20 seasons (hands-off owner); dead ends 0; cap solvency.

---

## 11. Decisions requested

1. Approve the evaluation formulas in §3, or adjust them.
2. Approve or adjust the demand bands in §4, including the Good and Excellent ceilings.
3. Approve the negotiation rules in §5.
4. Confirm that AI staff stays a fixed allowance (§7).
5. Confirm that the candidate pool stays as it is for Task 7 (§6).
