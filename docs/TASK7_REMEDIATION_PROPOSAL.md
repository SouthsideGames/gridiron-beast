# Task 7 — Investigation and Remediation Proposal (2026-11-05)

**Status: every proposal below is PENDING THE OWNER'S APPROVAL. Nothing in this document has been implemented.**

**Scope and boundaries:**
- This is read-only analysis and targeted diagnostics only.
- No gameplay value, difficulty setting or rule was changed.
- Task 8 was not started, and the single-position rule was not altered.
- The pre-registered benchmark methodology, its thresholds and the nine failed measures stand as reported in `docs/TASK7_FINAL_REPORT.md`. Nothing is reclassified here.

**Evidence used:**
- the consolidated benchmark (`9df9d50`) and the v42.21.0 baseline files;
- the Phase 2 attribution build (`df419d5`);
- four diagnostic variants. Each one is a copy of the candidate outside the repository, with one switch, used for attribution only:

| Variant | What it switches | Runs |
|---|---|---|
| **V1** | every AI renewal accepted | C 106–115, B 1–20 |
| **V2** | every owner renewal accepted | All-Star drift seeds 1–12 |
| **DS-R / DS-T** | the harness records each season at the start of the next season (after the offseason), for v42.21.0 and Task 7 | C 106–115, B 1–20 |
| — | renewal-answer and roster logs, gym element snapshots | targeted seeds |

---

## 1. Summary

1. **Measurement point (new finding, methodology).**
   - Task 7 moved ageing and the AI clubs' offseason (expiries, renewals, the market) from the season start to the season's close. Those steps now run **before** the harness takes its season record, while in v42.21.0 they ran **after** it.
   - The two builds' season records are therefore taken at different points of the calendar, and every age- and rating-based measure is shifted by one ageing step and by the AI offseason.
   - Measured at a common point (§3), three of the nine regressions reverse or become inconclusive: struggler starter age, young-reserve growth and high-potential growth.
   - Five remain real: recovery, position-relative persistent weak groups, late round-1 starts, generated gym starters, and persistent weak groups with cap room (not interpretable across points).
   - One becomes inconclusive: persistent weak groups.
   - The pre-registered results are not reclassified. §7 asks the owner whether to correct the measuring point for the final validation.
2. **Rebuilding recovery is a real regression.** Its main cause is the market itself:
   - the stronger free agents choose winning clubs (decision 25's "winning" priority), while AI clubs offer only the monster's ask;
   - losing clubs therefore fill with generated replacement-level arrivals: 2.82 per losing club-season at 57.5 OVR, against 0.66 at 59.3 in v42.21.0, while their waiver signings (about 64 OVR) fall from 1.73 to 1.28;
   - meanwhile they lose more monsters through expiries (7.4 against 4.4 walks).

   AI renewal refusals are **not** the cause: V1, with every AI renewal accepted, recovers no better.
3. **The All-Star drift** comes from the owner's renewals now being answered by the monster:
   - a losing hands-off owner loses more of them and refills with the cheapest free agents;
   - with owner renewals accepted (V2), All-Star owner wins return to 40.5% (v42.21.0 39.5%, Task 7 36.7%, 12 seeds);
   - no difficulty coefficient is involved.
4. **Gym generated starters and elemental identity:** a mix of an intended consequence of one position per species (the catalogue has 3–8 non-legendary species per position, across 12 elements, so each element can fill only 42–63% of the starting slots) and a pre-existing erosion that Task 6 already had: gym arrivals and draftees are of random element.
5. **The roster-minimum dead ends (D8)** were caused, at root, by the owner's staff raises compounding by 10% at every renewal. By season 18 the staff took 53% of the cap. This matters for Decision 3.
6. **Positional coverage is better under Task 7 than before:**
   - base-lineup holes per ordinary club-season: 3.9% → 0.8%;
   - groups without a backup roughly halved.

   One position alone (Phase 2) doubled the holes. The market more than repairs that.

---

## 2. Investigation findings

### A. Positional supply and roster coverage

**Catalogue (current: 72 species, of which 60 are not legendary; the table counts those 60):**

| | QB | RB | WR | TE | OL | DL | LB | CB | S | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Species | 4 | 6 | 7 | 5 | 7 | 8 | 7 | 7 | 6 | 3 |

- Each element has species at 4–5 positions only. Of the 19 starting slots it can fill 8–12:
  - Water and Nature 63%; Ice 58%; Earth, Dark and Dragon 53%;
  - Fire, Electric, Wind, Light and Metal 47%; Psychic 42%.
- **Evolution:** an evolution line is one species record (the name changes, the species id and position do not). One position per family through every evolution stage holds in the code today.

**Coverage (AI clubs, season records, C seeds 106–115):**

| | v42.21.0 | Phase 2 (one position only) | Task 7 |
|---|---|---|---|
| Base-lineup holes, ordinary clubs (% of club-seasons) | 3.9 | **7.8** | 0.8 |
| Base-lineup holes, gyms | 0.6 | 0.7 | 0.1 |
| Groups without a backup per club-season, ordinary clubs | 1.20 | 1.30 | 0.69 |
| Groups without a backup per club-season, gyms | 0.77 | 0.76 | 0.32 |
| Weak starting groups per club-season, ordinary clubs | 0.71 | 0.69 | 0.57 |
| Weak starting groups per club-season, gyms | 0.72 | 0.70 | 0.70 |

**Owner (checkpoint soak and All-Star diagnostics):**
- base holes 0.018 per week (v42.21.0 0.007);
- unavailable package slots 0.093 per week (v42.21.0 0). Plays needing a package that nobody can legally fill drop out (D6).

**Reading:**
- One position, on its own, makes lineup holes more likely (the species supply is thin at QB, TE and K).
- The Task 7 market supplies the missing positions, so coverage is better than in v42.21.0.
- The "persistent weak groups" regressions are therefore not shortages of eligible monsters. They come from the measuring point (§3) and from which monsters clubs acquire (B, C).

### B. Acquisition and retention priorities (code and data)

| Path | Task 6 strategy used? | Finding |
|---|---|---|
| **Draft** (`draft.js aiDraftPick`) | yes: potential weight by mode, need bonus, readiness for Contend | Unchanged by Task 7. It now runs **after** the market, so a starting need already filled by a free agent no longer gives a draftee a starting place: gym round-1 picks that would start fell from 27.4% to 20.8% (C). |
| **Free agency, needs fill** (`fa-ai.js`) | **no** | Ranks candidates by overall only, for every mode. Fills depth up to 38 **before** the draft (keeping places only for the picks held). Offers exactly the ask; raises 5% only when outbid. |
| **Free agency, R5 upgrade** (`bestUpgrade`) | yes | An upgrade that needs a release is skipped in the market. Task 6 made it with a release. AI releases fell from 0.34 to 0.07 per ordinary club-season (C). |
| **Renewals** (`leagueContracts`) | yes: the Task 6 keep rule, R3 length by mode | Unchanged. The monster now answers (decision 25): 4.6% refused overall; on losing clubs 8–25% refused and 35–46% countered (renewal log, 5,026 answers). V1 shows the refusals do not cause the regressions. |
| **Extensions** | — | The AI never extends (Decision 4). |
| **Trades** | yes | Unchanged except that contracts are kept. |
| **Development** (playing time) | — | Unchanged. Starters grow faster than reserves in every build. |

**Is the AI keeping veterans when it should be preparing replacements?**
- Not through renewals. The Task 6 keep rule is unchanged, and the drafted share of walks fell (26.9% → 15.1% of walks).
- The veteran increase comes through **acquisition**: AI clubs sign veterans from the waivers and generated arrivals, ranked by overall regardless of mode.
- In the final season (no measurement-point effect), veterans past onset + 2 who start rose from 78% to 90%.

### C. Veteran-heavy free agency

**Who is on the market:**
- monsters whose contracts expired and were not renewed: 4.4 per ordinary club-season walked in v42.21.0, 6.5 in Task 7;
- the waivers;
- the regional pools;
- 13 generated veterans per offseason, ages 20–28, quality 50–59.

Free agents' asks fall up to 30% while they stay unsigned, so the older ones become cheap.

**Why signings skew old:**
- **The AI's ranking:** by overall only. Overall peaks in the late 20s.
- **The supply:** walks of 1-year deals. Veterans past onset get 1-year terms by Task 6 R3, so they come back to the market every year and are re-signed elsewhere.
  - Waiver-signed veterans aged 30+ per AI club: 1.25 → 2.18 (C).
  - Retirements per season fell by 3.5. This is consistent with veterans moving between clubs on 1-year deals where they used to retire from a roster.
  - Unsigned retirement itself is unchanged on average (the personality factor is 0.75–1.25 around the Task 6 chance).
- **Contract affordability:** not the cause. AI clubs are never over the cap; usable cap at a market's close averages about 9% of the cap.
- **Prospect valuation and playing time:** the market has no prospect valuation. The Task 6 potential weight exists only in the draft.

**Where it conflicts with strategy:**
- A Rebuild or Retool club signs a 29–30-year-old for depth, or as a starter, ahead of a young monster. Task 6 Rebuild's purpose is the opposite.
- Losing clubs (w% < .35) sign 1.72 free agents per club-season (mean age 27.9) and receive 2.23 generated arrivals per offseason (v42.21.0: 0.62). The stronger free agents (waiver monsters averaging 64–65 OVR) prefer winning clubs.

### D. Gym roster replenishment

**Elemental share of gym starters** (seeds 1–3; legendaries excluded):

| Build | Season 1 | Season 4 | Season 8 |
|---|---|---|---|
| v42.21.0 | 47% | 43% | 27% |
| Task 7 | 38% | 33% | 21% |

Roster share follows the same pattern (45% → 19% against 33% → 14%).

**Reading:**
- One position lowers the starting point by about 9 points. That is the catalogue's structural limit (42–63% of slots per element) and an intended consequence.
- The decline over seasons exists in both builds: gym draftees and generated arrivals are of random element (`generateArrival` picks a random region).

**Generated gym starters:**
- **Measure:** 33.4% at v42.21.0, 38.8% at Phase 2, 37.9% at Task 7, in the final season, where there is no measuring-point effect.
- **By position (Task 7 against v42.21.0, all seasons):** QB +5.5, WR +4.1, CB +2.9, OL +2.2, S +2.0, LB +1.7; RB −4.8.
- **Mechanism:** with one position per species, fewer pool and draft candidates exist at the thin positions, and the AI falls back to a generated arrival more often.
- **Classification:** largely the catalogue's supply (intended), plus the random-element replenishment that is not intended (R4).

### E. Prospect development

- **Young-reserve growth and high-potential growth:** both select monsters "aged 24 or under at a season record". Task 7's records already include that year's ageing step, so the selected group is one development step older.
- **Phase 2:** young-reserve growth does not move (+0.01); high-potential growth falls by 0.09.
- **Common measuring point:** both turn positive: +0.11 [0.07, 0.15] and +0.12 [−0.02, 0.26] (§3). The reported falls are measuring-point effects, not slower development.
- **Late round-1 starters at year 2:** real, −6.3 at the common point. The draft now follows the market. Clubs whose starting needs were filled by veteran free agents give draftees fewer starting places (B, R1).
- **Development itself:** unchanged. Gains per season by starter and reserve are similar in every build. Starting monsters grow more in Task 7, not less.
- **Task 8 boundary:** Task 8's individual potentials and Tempers play no part in this diagnosis.

### F. All-Star drift

**All-Star owner win %, seasons 1–8, 12 matched seeds:**

| Build | Owner win % |
|---|---|
| v42.21.0 | 39.5 |
| Task 7 | 36.7 |
| Task 7 with owner renewals accepted (V2) | **40.5** |

**What the hands-off owner's roster looks like:**
- starting overall: equal or better than v42.21.0;
- top backups: 2–3 OVR weaker from season 2 on;
- renewals refused: 0.8–1.9 per offseason. The harness's hands-off policy takes a counter, otherwise lets him go, then signs the cheapest free agents up to 26.

**Conclusion:**
- The drift is caused by decision 25 (the monster answers renewals) applied to a hands-off owner. It is largest on All-Star, where the owner loses more often and is refused more often.
- No defect in difficulty coefficients was found.
- One-position package gaps (0.09 unavailable package slots per week) are present in Task 7 but are not the cause: V2 has them too.

---

## 3. The measuring point (methodology)

**Where each build ages and runs its AI offseason:**
- **v42.21.0:** `startNextSeason` (franchise.js 2245).
- **Task 7:** `closeSeasonTask7` (franchise.js 2348), before free agency.

**What the harness sees:** it records each season in `onSeason`, after the owner's offseason and before `startNextSeason`. So:
- v42.21.0's records show rosters **before** ageing and before the AI's expiries, renewals and free agency;
- Task 7's records show rosters **after** all of them.

**Confirmations:**
- Starter age at season 10: +0.88. At season 20, which has no following offseason in either build: +0.14.
- Young AI monsters per club, Task 7 against v42.21.0: 11.0 against 15.5 at season 1, but 13.1 against 12.7 at season 20.

**DS-R / DS-T** record both builds at the start of the next season, after the whole offseason in either build; the games played are identical.

**DS sets and how to read them:**
- Sets: C 106–115 and B 1–20. There is no held-out set, so this is diagnostic only. The pre-registered results stand.
- Draft records are taken from the original runs: the games are identical, and only the moment of the roster record moves.

| Measure | Pre-registered (v42.21.0 → Task 7) | At the common point (DS-R → DS-T) | Reading |
|---|---|---|---|
| Recovery within 3 seasons | −9.3 [−13.5, −4.9] worse | −9.3 [−13.5, −4.9] worse | **real** (wins only, no measuring effect) |
| Struggler starter age after 3 | +0.68 [0.53, 0.83] worse | **−0.29 [−0.42, −0.16]** better | measuring-point effect |
| Persistent weak groups | +1.7 [0.4, 3.1] worse | +0.7 [−1.9, 3.3] inconclusive | mostly measuring point |
| Persistent weak groups with cap room | +2.5 [1.2, 3.9] worse | +9.4 [7.3, 11.6] worse | not interpretable across points: at a v42.21.0 season start the AI clubs have just spent their room in the needs fill (base 0.6%) |
| Persistent weak groups, position-relative | +0.9 [0.5, 1.3] worse | +1.3 [0.7, 2.0] worse | **real** |
| Young-reserve growth (3 seasons) | −0.14 [−0.17, −0.11] worse | **+0.11 [0.07, 0.15]** better | measuring-point effect |
| High-potential growth (3 seasons) | −0.11 [−0.18, −0.04] worse | +0.12 [−0.02, 0.26] inconclusive | measuring-point effect |
| Round-1 starter at year 2, late seasons | −4.3 [−7.5, −1.1] worse | −6.3 [−9.4, −3.3] worse | **real** |
| Generated gym starters, final | +4.6 [2.1, 7.0] worse | +4.6 [2.1, 7.0] worse | **real** (season 20, no measuring effect) |
| Retirements per season (no gate) | −3.5 | −3.5 | real |
| Veterans starting, final (no gate) | +12.2 | +12.2 | real |
| Succession cover (no gate) | +1.4 better | −2.2 [−3.8, −0.4] worse | measuring point; worse at the common point |

**One more caution, for the B set:**
- Its last season (season 10) is followed by a Task 7 offseason in the candidate, but by nothing in v42.21.0. Task 7 closes every season except the franchise's 20th.
- So measures taken at season 10 of a 10-season run are still not comparable at either point:
  - starter age at season 10: +0.95 at the common point;
  - the 3-year contract share.
- At season 20 of the 20-season runs, which neither build follows with an offseason, starter age differs by only +0.14 [0, 0.3].

**Reading:**
- Of the nine failed measures, five remain real when measured at a common point: recovery, position-relative persistent weak groups, late round-1 starts, generated gym starters, and persistent weak groups with room (not interpretable).
- Three come from the measuring point: struggler starter age, young-reserve growth and high-potential growth.
- One becomes inconclusive: persistent weak groups.
- The pre-registered classification stands until the owner decides (§7, decision 1).

---

## 4. Proposed fixes (all pending approval)

Priority follows the owner's order: rebuilding recovery, veteran retention, young development, positional shortages, gym replenishment. Every fix uses the existing rules (decision 25's evaluation, caps, limits, locks). None changes a value, a weight or a difficulty setting.

### R1 — AI market strategy aligned to Task 6 (highest priority)

1. **Problem and evidence:**
   - recovery within 3 seasons −9.3 [−13.5, −4.9];
   - losing clubs fill with generated replacement-level arrivals (2.82 per club-season at 57.5 OVR against 0.66 at 59.3; waiver signings 1.73 → 1.28);
   - the next season's mid-season strength gain for losing clubs is 0.81 against 1.08;
   - veterans starting in the final season: 78% → 90%;
   - late round-1 starters −4.3;
   - AI releases fell from 0.34 to 0.07 per ordinary club-season.
2. **Responsible code:** `fa-ai.js` `aiClubTurn` and `aiTerms`; the market's treatment of `bestUpgrade` with a release.
3. **Change:**
   - **(a) Draft-aware timing:** before the draft, an AI club bids only for urgent base-lineup holes and its R5 upgrade. Non-urgent depth is filled after the draft, at the season start, by immediate negotiation (the existing `leagueFreeAgency` path). This restores Task 6's order: draft, then depth.
   - **(b) Strategy-aware ranking:** candidates are ranked with Task 6's own valuation by mode, instead of overall alone:
     - Rebuild and Retool use the draft's potential weights and the R3 onset horizon, so they avoid a monster past onset for depth when a young one is on the roster;
     - Contend values readiness;
     - Compete keeps overall.
   - **(c) Upgrade with a release:** the R5 upgrade may release its weakest expendable reserve, as in Task 6. The release happens only when the signing completes, so it is atomic, and zero dead cap applies.
   - **(d) Negotiation, within the owner's rules:** for a priority target (urgent hole, upgrade, successor), the club may improve its terms:
     - the monster's preferred term, when the club's mode allows it;
     - the starting role it can actually offer;
     - salary up to the Task 6 market value, which bounds what it pays;
     - a bonus, under D4.

     This is how a losing club can still attract the monsters who weigh money and role. It changes no weight in decision 25.
4. **Task:** Task 7. It does not depend on Task 8.
5. **Expected effects:**
   - losing and rebuilding clubs get younger and stronger acquisitions; fewer generated replacement-level arrivals;
   - fewer veterans starting for Rebuild and Retool clubs;
   - draftees regain starting places;
   - AI payroll moves toward market value.
   - Saves: no format change; offers already in a save keep their terms.
6. **Tests:**
   - unit: ranking by mode; no pre-draft depth bids; the release-on-signing upgrade is atomic and leaves no dead cap; terms never exceed market value or usable cap; parity, i.e. every AI offer passes the owner's `blocker`;
   - diagnostics: recovery, veterans starting, generated arrivals for losing clubs, round-1 starts, AI releases, AI payroll and cap solvency.
7. **Risks:**
   - stronger AI rebuilding could tighten owner balance (watch drift);
   - higher AI payroll leaves less room for other signings;
   - post-draft depth fills rely on the season-start immediate negotiation, where monsters may refuse, with the existing generated fallback.
8. **Approval:** required.

### R2 — No change to AI renewal answers (attribution result)

- **Evidence:** V1 (every AI renewal accepted) leaves recovery, young-reserve growth, retirements and veterans starting as they are, or worse.
- **Proposal:** no change to the rule. AI retention is addressed through D4 (R6) and R1(d).
- **Approval:** none needed (no change).

### R3 — Owner renewals: visibility, not difficulty (the All-Star drift)

1. **Problem:** the All-Star drift of −3.5, explained by the monster answering the owner's renewals (V2).
2. **Responsible system:** decision 25 applied to owner renewals (`renewTask7`), together with the hands-off owner policy.
3. **Change:** none to difficulty or to the rule. Optional interface help:
   - in a contract's final season, the Salary & Contracts screen shows each monster's renewal outlook (Interested / Listening / Not interested, from the same evaluation);
   - the GM Assistant suggests extensions for core monsters while they are still Interested.

   Recommendation: treat the drift as an intended consequence of decision 25, reported against v42.21.0.
4. **Task:** Task 7.
5. **Expected effects:** owners who manage renewals keep their core. The hands-off measure stays as it is. No save change.
6. **Tests:** outlook equals `rateOffer`; no automatic action.
7. **Risks:** none to balance. The drift remains in the hands-off measure by design.
8. **Approval:** required. The owner chooses: accept the drift as intended, or add the outlook.

### R4 — Gym elemental replenishment

1. **Problem:** gym starters' element share falls from 38% to 21% over 8 seasons (v42.21.0: 47% to 27%), and generated gym starters stand at 37.9%.
2. **Responsible code:** `league-season.js generateArrival` (random region), the AI draft tie-break, and the market's ranking for gyms.
3. **Change:** for a gym, among candidates of equal standing within a small band, prefer the gym's element at that position where the element has a species:
   - generated arrivals choose the gym element's species at the position when one exists, otherwise any element (mixed supporting players);
   - the draft gives gym-element prospects a small tie-break;
   - the market does the same at equal value.

   No species position changes; positions without an element species keep mixed players.
4. **Task:** Task 7. Task 8's catalogue will change which positions each element covers; the rule stays valid.
5. **Expected effects:** elemental identity is sustained (up to the catalogue's structural 42–63% per element); lineups stay legal. Little effect on strength. No save change.
6. **Tests:** element preference only where a species exists; no illegal lineup; diagnostics on gym element share and generated starters.
7. **Risks:** a slight drop in gym strength if the band is too wide. The band is kept small and measured.
8. **Approval:** required.

### R5 — Lineup warning for unavailable package slots (one position)

1. **Problem:** the owner had 0.093 unavailable package slots per week (v42.21.0: 0), so some plays drop out silently.
2. **Responsible code:** `roster.js unavailableSlots`, which is already computed.
3. **Change:** a warning on the lineup screen and in the GM Assistant naming the package slot and the position needed (interface only).
4. **Task:** Task 7.
5. **Expected effects:** the owner can fix package gaps. No gameplay change.
6. **Tests:** the warning appears exactly when `unavailableSlots` is non-empty.
7. **Risks:** none.
8. **Approval:** required (small).

### R6 — Decision 4: AI signing bonuses and extensions (integration design)

See §6. Approval of the design is required before implementation.

### R7 — Decision 3: draft and staff affordability (safe process)

See §5. Approval of the process is required before implementation.

---

## 5. Decision 3 — safe process for the draft and staff (pending approval)

### Draft selections

1. **Draft reserve:**
   - From free agency onward, each club's cap panel shows a *draft reserve*: the rookie-scale charge of its remaining picks at their expected slot (70% of market, as today).
   - AI clubs keep it out of their market budget, as they already keep roster places.
   - For the owner it is shown and warned about, not locked.
2. **At the pick:** a selection is allowed when the rookie's first-year charge fits usable cap. If no available prospect is affordable, the owner's screen gives the exact shortfall and the choices:
   - a cheaper prospect;
   - an offseason release, which the offseason allows below 26, with zero dead cap and the saving shown;
   - trade the pick;
   - pass, which is explicit and confirmed.

   Nothing is discarded silently.
3. **AI clubs:** the best affordable prospect on their board. If none is affordable, they release a well-paid expendable (the D8 rule), otherwise they pass. The pass is recorded in League News and the decision log.
4. **Dead ends:** none. Releasing is always possible in the offseason, and the 26 minimum is reached through the D8 path.
5. **Saves:** picks already made keep their contracts. A draft in progress applies the check only to selections made after loading.

### Staff renewals and hires (owner; AI staff is a fixed allowance and is unchanged)

1. **Renewals:** a staff renewal (with its raise) must fit next season's usable cap. If it does not, the screen shows the shortfall and the choices:
   - free room (release monsters);
   - let him go and hire a candidate who fits;
   - let him go and hire the role's default member.
2. **Minimum-staff exception (the only commissioner exception):**
   - **When:** a required role is empty and no candidate, including the default, fits the cap.
   - **What is allowed:** hiring that role's default member at his base salary, with no raise.
   - **How it is made explicit:** shown on Salary & Contracts, written to an exception log (`f.capExceptions`: year, role, amount) and announced in the news. The existing commissioner review then applies, as today.
   - **Limits:** required roles only; defaults only; once per role per league year.
3. **Existing staff contracts** are kept; nothing is cancelled. The check applies to renewals and hires decided after loading.
4. **Finding for the owner:** staff raises compound by 10% at every renewal, without limit.
   - An owner who always renews reached 2.36× base staff salaries by season 18, which is 53% of the cap. That was the root of the D8 dead ends.
   - Whether to bound the compounding (for example at a ceiling) is a balance decision for the owner and is not proposed here.
5. **Tests:**
   - unaffordable pick or renewal → options, never a silent loss;
   - AI pass logged;
   - exception limited and logged;
   - draft-in-progress migration;
   - a 20-season soak with no dead end.

---

## 6. Decision 4 — AI signing bonuses and extensions: integration (pending approval)

**One engine:** the AI uses `submitOffer` and `reviseOffer` with a bonus, and `extend()`, under the owner's validation (`blocker`, usable cap, the future-year cap, the bonus at most half of the contract) and the same evaluation (`rateOffer`, counters). It never forces usage.

**Extensions:**

| | |
|---|---|
| When | Two windows. Mid-season (week 6, when Task 6 strategies already re-evaluate), and the offseason before renewals for contracts entering their final season. |
| Who | Monsters the Task 6 keep rule would renew at expiry (starter not past onset, designated successor, young monster with upside by mode), core first. Never a monster Task 6 would let walk. |
| Terms | The Task 6 length (`contractLength`, `modeLength`), moved one season toward his preferred term when the mode allows it; salary at his renewal ask. If he counters, the AI accepts when the cap and the future-year cap allow. |
| Cap | The extension's first season must fit the club's committed cap for that year. The AI keeps the same future-year margin as in the market. |

**Bonuses:**

| | |
|---|---|
| When | Only where a bonus is worth more to the monster per cap credit than salary: a money-minded personality (money weight above his other priorities) in a bidding war, a counter, or a core extension. |
| How much | The part of the salary increase that the bonus replaces at equal value to him, within the 50% rule and the club's usable cap now. |
| Mode | Contend and Compete for starters and upgrades; Rebuild for its young core; never for a monster past onset. |
| Zero dead cap | Unchanged: the remaining allocation leaves with the monster and is never refunded. |

**Interaction with existing AI contract management:**
- `leagueContracts` remains the renewal at expiry.
- An extended monster skips it, because his contract continues through `contract.next` and `promoteExtensions`.
- The R3 lengths, the runaway rule and trim-to-cap are unchanged.

**Tests:**
- parity (an AI extension or bonus passes the owner's validation);
- determinism;
- no double contracts;
- bonus allocation sums;
- the future-year cap respected;
- usage appears only under the stated conditions;
- diagnostics: bonus share, extensions per offseason, AI payroll, cap solvency.

---

## 7. Decisions requested from the owner

1. **Measuring point:** for the final validation, take each season's record at the start of the next season in **both** builds (DS-R / DS-T method).
   - For runs shorter than 20 seasons, the harness also starts the season after the last one before recording it, so that both builds have run the same offseason.
   - Thresholds, seeds and statistics stay unchanged.
   - The pre-registered results stay on record as they are.
   - Recommended: yes. Otherwise Task 7 is measured at a different calendar point from v42.21.0.
2. **R1:** AI market strategy aligned to Task 6. Recommended.
3. **R3:** accept the All-Star drift as an intended consequence of decision 25, with or without the renewal outlook.
4. **R4:** gym elemental replenishment. Recommended.
5. **R5:** package-slot warning. Recommended.
6. **Decision 3:** approve the safe process in §5, and say whether staff raise compounding should be bounded (a balance decision).
7. **Decision 4:** approve the integration design in §6.
8. **Existing saves under the final single-position rule:** see §8.

---

## 8. The final single-position rule and existing saves (decision needed)

**Current implementation:** D6 as clarified on 2026-11-04 01:21. New monsters get only their family's position; existing monsters keep the position they hold.

**The conflict:**
- A v42.21.0 league holds monsters outside their family's position: **24.9%** of all monsters in a season-1 save (748 of 3,005 over 5 seeds). The most common cases are LB→DL, RB→WR, CB→S and DL→OL.
- The final rule says monsters of one family "cannot be assigned different football positions". Kept as they are, these monsters contradict it.

**Options:**
- **(a) Migrate to the family position.**
  - The monster, its stats, contract and history are kept; only its position changes.
  - Measured on 5 season-1 saves:
    - 29 of 80 clubs would get 1–3 base-lineup holes;
    - moved monsters' overall changes by −4 on average (10th percentile −11, 90th +2), because ratings are weighted by position.
  - **Repair:**
    - AI clubs fill the holes immediately (the injury-cover path);
    - the owner gets a migration report, the lineup repair already in place, and the market and D8 release path;
    - the migration runs at the next offseason boundary, never in mid-season, so no game is forfeited.
- **(b) Keep the existing assignments (as implemented now).** Old saves keep mixed-position families until those monsters leave the game.
- **(c) Migrate only the owner's roster.** Not recommended: AI and owner would be under different rules.

**Recommendation:** (a) at the next offseason boundary. Approval required: it changes D6's "existing monsters keep their position" clarification.

---

## 9. Validation after approved fixes

**Targeted diagnostics first** (C 106–115, B 1–20, plus All-Star seeds 1–12 for drift):
- positional coverage and lineup holes (owner and AI, package slots);
- gym generated starters and element share;
- rebuilding recovery;
- veteran signing and retention by mode;
- young and high-potential development;
- round-1 progression;
- cap solvency (AI payroll, owner over the cap at season start);
- legendary limits;
- All-Star drift;
- save round trips and 20-season progression.

**Then:**
- the consolidated benchmark once, pre-registered method, at the final checkpoint (with the measuring point of decision 1 if approved);
- the Task 6 accepted exceptions stay documented exceptions;
- the nine measures are evaluated as before. Any still worse is reported as such.

**Task 8:** a new multi-season validation is planned after Task 8 against the then-approved baseline. Task 8 is not assumed to fix anything here.
