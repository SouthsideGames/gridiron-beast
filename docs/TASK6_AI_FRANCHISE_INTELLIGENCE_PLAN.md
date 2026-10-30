# Task 6 — Long-Term AI Franchise Intelligence: implementation proposal

**Status: proposal for owner approval. Nothing here is implemented.**
- No production file was changed. The published game is v42.17.0. PR #83 (Task 5.5) is open and unmerged.
- Evidence comes from:
  - the Task 4 report (`AI_FRANCHISE_BENCHMARK.md`);
  - the Task 5.5 report (`POST_TRADING_FRANCHISE_BENCHMARK.md`, with data in `docs/post-trading-benchmark/`);
  - the code as it stands on `main`;
  - two read-only diagnostics made for this plan (`docs/task6-plan/`):
    - per-monster tracking over seeds 106–107 × 20 seasons (`tools/task6-diagnostics.mjs`, summarised by `tools/task6-diagnostics-report.mjs`);
    - draft and gym tables from the Task 5.5 20-season runs.

## 1. Executive summary

**Not AI decisions alone.** Most of the weaknesses Task 5.5 lists come from game rules first and AI decisions second. The code shows four mechanisms:
1. **Old starters never decline.**
   - Ageing takes 1–2 points a season from speed, agility and durability after 30.
   - Starters also gain 1–2 levels a season from XP, which more than cancels that.
   - So starters improve slightly at every age: +0.33 overall a season at 30–32, +0.14 at 33–35, +0.02 at 36+.
   - Nothing retires them, and starters are re-signed at any age.
   - 89% of 33+ starters still start the next season. By season 20, 62% of starters are 33+, and the oldest is 47.
2. **The draft cannot keep up.**
   - Draft classes are generated at a fixed quality: round-1 picks average about 61 overall every year.
   - Club strength grows every season.
   - The gap between a club's starter mean and its round-1 pick widens from 2 points in year 1 to 21 in year 19. Picks that would start at once fall from 49% to 3%.
3. **Only starters develop.**
   - XP goes only to monsters in a depth-chart slot.
   - Starters gain about 2 levels a season; reserves about 0.1.
   - Young reserves who stay reserves gain 0.7 overall over three seasons.
4. **Gym dominance is built into the anchor.**
   - The balance anchor (`clubQuality`) gives gym clubs a starting offset and growth three times faster: 1.5 a season against 0.5. By season 20 that is 25 points of anchor.
   - The nudge enforces it:
     - it signs veterans for gyms at their anchor (59% of gym starters are such signings by season 20);
     - it slows ordinary clubs' development in 29–57% of their seasons.
   - Gyms also carry an ageless, cap-exempt legendary each and a coaching IQ bonus.
   - Drafting, contracts and free agency are not the cause.

**AI decision gaps on top of those rules:**
- re-signing every starter;
- best-available drafting that ignores needs and age;
- free agency that fills position counts, not quality;
- trades that pay with young successors (48% of payment monsters are 24 or younger);
- no contend-or-rebuild layer.

**Two consequences for how Task 6 is built:**
- **AI intelligence work alone cannot fix ageing or the draft.** It needs the approved ageing and retirement design and a decision on draft-class quality first. So Phase A (foundations) must come first, as proposed.
- **Wins and titles cannot be the main measure of AI intelligence.** The nudge holds every club to its anchor, so better ordinary clubs are slowed back. Task 6 success should be judged on roster health:
  - starter ages;
  - draft conversion;
  - reserve growth;
  - succession readiness;
  - weak-position persistence.

  Competitive balance stays a separate owner decision about the anchors.

**Proposed order:**
- **Phase 0, measurement.** Upgrade the benchmark harness and pre-register thresholds, before any behaviour change.
- **Phase A, foundations.** Ageing curves including how XP behaves with age, retirement, draft-class quality, successor protection in trade valuation, and the balance recalibration and anchor decision.
- **Phase B, drafting and succession.** Age-aware needs, need- and age-aware drafting, contract planning, staggered contracts.
- **Phase C, development and free agency.** Development for reserves, free agency that upgrades starters.
- **Phase D, contend or rebuild.**
- **Trading follow-ups, separate from Task 6.** The offseason-offer defect has a one-line fix, already tested in a scratch copy and ready for your authorisation. The other three (offers to a full roster, successor protection, a repeat-trade lock) are separate decisions.

## 2. Existing system assessment (verified in code)

| System | Where | What it does today | Working correctly? | Needs improvement |
|---|---|---|---|---|
| Ageing | `progression.js offseason()` (line 67), applied to AI clubs by `league-season.js leagueAgeing` (line 106) | +1 age a season. From 30: speed, agility and durability each −1 or −2. To 23: +1 awareness and strength toward potential. Salary refresh. Legendaries and the rival's signature are ageless | As written | Same for every position; physical only. Its effect on overall depends on the position's weights: RB loses about 0.75 a season on paper, QB about 0.3, OL about 0.17, K nothing. XP growth outweighs it for starters (§3.1) |
| Overall | `monsters.js overall()` with `personnel.js POSITION_WEIGHTS` | A weighted mean of attributes by position (for example OL is blocking 4, strength 3, awareness 1, agility 1; K is kicking 6, awareness 1) | Yes | — |
| Retirement | none | Monsters leave only by walking, release or the pool cap; a decorated leaver becomes a legend stub | — | **Missing** (Task 4 §3; confirmed: no retirement code in `src/franchise`) |
| XP and development | `progression.js afterGame()` (line 13) | XP only for monsters in a depth-chart slot, 24 + 10 for a win plus stats; points auto-spent; auto-evolve. The nudge scales XP to 75% or 50% for clubs above their band | As designed | Reserves get almost nothing (§3.3). A 10-game season gives a starter about 10–13 games of XP |
| Depth chart | `roster.js buildDepthChart()` (line 32) | Best by overall at each slot; injured skipped | Yes | No developmental rotation |
| Draft class | `draft.js generateDraftClass()` (line 17) | Ages 19–22. Quality by roll: 8% "gems" 62–67, 27% "solid" 55–60, 65% "projects" 47–54. Fixed every year | As written | Does not scale with the league (§3.2); reserved decision |
| AI draft pick | `draft.js aiDraftPick()` (line 77) | Overall + 0.2 × (potential − 70) ± 1.5 noise; −4 for a position already taken this draft; −6 for a kicker | Executes well (median gap to best available 1) | Ignores needs, ages and how soon a pick could start |
| Contracts | `league-season.js leagueContracts()` (line 59) | Re-sign if starter or "value" (overall ≥ roster median, or age ≤ 25 with potential ≥ overall + 5). A reserve aged 32+ is never re-signed. Clubs above their band let expiring veterans aged 27+ walk (runaway rule). Every deal is 2 years | As designed | Starters re-signed at any age; synchronised expiries |
| Free agency | `league-season.js leagueFreeAgency()` (line 137), `clubNeeds()` (line 123) | Fills toward the 38-man composition: lineup holes first, then missing counts. Waivers, then pools, then generated veterans at the club's anchor (+1 for a starter slot, −4 otherwise), aged 24–30 | Yes for counts and legality | Never upgrades a weak starter when the count is full (§3.6) |
| Balance | `franchise.js clubQuality()` (line 655), `league-season.js leagueNudge()` (line 184), `BAND = 4`, `LIFT_SHARE = 0.75`, runaway rule | Anchor = tier base + hash offset (−4 to +4) + rival +2 + difficulty + growth. Gyms grow by tier offset (1, 4 or 7) + 1.5 a season; ordinary clubs 0.5. The nudge signs up to 3 veterans at anchor + 2 for clubs more than 4 below it, and slows XP for clubs above | As approved (decisions A, C, V, Y; GDD §45.6) | Sets competitive outcomes (§3.8); will absorb Task 6 gains unless recalibrated |
| Gym extras | `data/gyms.js`, `franchise.js aiCoach()` (line 667) | Each gym holds its element's legendary (ageless, cap-exempt, never traded); gym coaches have IQ + 0.2 | As designed | Part of the gym advantage |
| Trading (Task 5) | `trade-value.js`, `league-trades.js`, `trade-desk.js`, `trade-window.js` | Position-aware value, roster worth by role, fair band, in-season swaps, Week 8 deadline | Yes (Task 5.5) | Pays with young successors (§3.5); D1 offseason offer; offers to a full roster |
| Owner balance contract | GDD §45.6 | The owner's win rate within ±5 points and the AI mid-season mean within ±2 of today's generator, per difficulty | Measured and held | Every Task 6 phase must re-measure it |

**Working correctly and to preserve:**
- integrity and determinism;
- legal rosters and cap at every season start;
- protected monsters;
- draft execution;
- free agency by count;
- injury cover;
- fair, position-aware trading inside the deadline;
- the owner's balance contract.

## 3. Root-cause analysis of the Task 5.5 findings

### 3.1 Starters averaging about 35 by season 20
- **Evidence.** Per-monster changes, seeds 106–107 × 20 seasons, from `docs/task6-plan/diagnostics-seeds106-107.txt`.

| Age band | Starters: Δ overall a season (levels gained) | Reserves: Δ overall (levels) |
|---|---|---|
| ≤ 22 | +1.83 (2.0) | +0.37 (0.09) |
| 23–25 | +1.15 (1.7) | +0.10 (0.09) |
| 26–29 | +0.84 (1.6) | +0.35 (0.5) |
| 30–32 | +0.33 (1.2) | −0.07 (0.3) |
| 33–35 | +0.14 (1.0) | −0.5 (0.2, n=6) |
| 36+ | +0.02 (0.8) | −0.45 (0.3, n=11) |

- **Starter ages over the run:** mean 23.4 / 26.7 / 29.5 / 32.5 / 34.8 at seasons 1 / 5 / 10 / 15 / 20.
- **Starters aged 33+:** 0% / 0% / 27% / 53% / 62% of starters at those seasons; the oldest is 47.
- **Fate of starters aged 33+:** 89% start again the next season, 3% are benched, 8% leave.
- **Root causes:**
  1. Decline is physical only, identical for every position, and small against XP growth. A starter's level-ups more than cancel it at every age.
  2. No retirement.
  3. `leagueContracts` re-signs every starter whatever his age.
  4. Needs have no age term, so no successor is sought.
  5. The nudge's veterans (24–30) arrive only for clubs below their anchor. For gyms they slow the ageing; ordinary clubs are slowed rather than refreshed.

### 3.2 Only 8% of round-1 picks starting within two seasons (20-season sample)
- **Evidence.** `docs/task6-plan/draft-and-gym-seeds106-110.txt`.
  - Round-1 picks average 60.1–61.5 overall in every draft year.
  - The gap to the drafting club's starter mean: 1.8 / 5.1 / 8.7 / 13.3 / 16.6 / 21.4 points in draft years 1 / 2 / 5 / 10 / 15 / 19.
  - Picks that would start at once: 49% / 39% / 20% / 16% / 9% / 3%.
  - Per-monster tracking: round-1 draftees start for their club within two seasons 45% of the time when drafted in years 1–5, and 14% in years 12+.
- **Root causes:**
  1. **Fixed class quality** (`generateDraftClass`) against anchors that grow by 0.5 or 1.5 a season. This is structural.
  2. Draftees do not develop as reserves (§3.3).
  3. `aiDraftPick` ignores needs and age, so picks land at positions with young, good starters (46.6% at need 0 in Task 4). An AI decision.
- **Consequence.** Better drafting decisions alone could move the 8% only modestly; class quality and development decide the rest.

### 3.3 Reserves improving by about 1.5 overall over three seasons
- **Evidence:**
  - Young reserves (24 or under) who stay reserves for three seasons gain 0.69 overall in total.
  - Round-1 draftees who stay reserves gain about 1.5 after 3+ seasons, against about 10 for those who start.
  - Reserves gain about 0.1 level a season; starters 1.6–2.
- **Root cause.** `afterGame` gives XP only to depth-chart slots, and `buildDepthChart` plays the strongest monster. The only reserve growth is +1 awareness and strength a season to age 23, toward potential (`offseason`).
- **The calendar compounds it.** With a 10-game regular season, a starter's XP comes from about 10–13 games; a reserve plays almost none of them.

### 3.4 No effective succession planning
- **Evidence.** Starters aged 30+ who have a young successor (a backup aged 26 or under, within 8 overall): 17.6% (60 seeds), 10.7% in the 20-season runs, falling to 6.6% by season 20.
- **Root causes:**
  - No code identifies an ageing group, so needs have no age term (`positionNeeds`, `clubNeeds`).
  - Contracts keep every starter, so a successor is never needed.
  - The draft does not target ageing groups.
  - Trades consume successors (§3.5).

### 3.5 AI teams trading away promising young replacements
- **Evidence:** 48% of the monsters sent as payment in v42.17.0 AI deals are 24 or younger. Succession cover is −3.8 points against v42.16.0 (51 of 60 seeds lower); the 20-season runs and the no-nudge runs agree.
- **Root cause.** `league-trades.js attempt` (lines 72–81) pays with any tradable spare whose value is in the band. `trade-value.js rosterWorth` values a first backup at 0.45 of a starter whatever the starter's age (`ROLE_SHARE`, line 36). Market value even prefers paying with a young spare, because youth and upside make him worth more on the market than to his own club.

### 3.6 Free agency failing to upgrade weak starters
- **Evidence:**
  - Persistent weak groups with cap room: 9.8% of club-seasons (v42.17.0, 60 seeds); streaks up to 14 seasons in the 20-season runs.
  - Non-draft arrivals land at a weak group 13.3% of the time.
- **Root cause.** `clubNeeds` lists only lineup holes and positions below the 38-man composition. When the count is full, a weak starter is never upgraded, whatever the room. Generated arrivals follow the club's anchor rather than the weak group's gap.

### 3.7 Contending and rebuilding clubs behaving alike
- **Evidence:**
  - Strugglers (≤ 3 wins) and contenders (6+) buy monsters of the same age (median 24 against 25) and pay the same (0.14 against 0.13 first-round picks a deal; Task 5.5).
  - They draft identically (Task 4 §10.7).
- **Root cause.** There is no code path for a strategy: no club state reads record, age profile, anchor gap or draft capital.

### 3.8 Gym clubs winning about 95–99% of AI titles
Evidence (`docs/task6-plan/draft-and-gym-seeds106-110.txt`, v42.17.0, 5 seeds × 20 seasons), gym against ordinary:

| Season | Anchor | Team overall | Wins / 9 | Gym starters who are generated veterans | Ordinary club-seasons slowed by the nudge |
|---|---|---|---|---|---|
| 1 | 60.0 vs 54.5 | 65.4 vs 60.3 | 5.5 vs 3.1 | 0% | 0% |
| 5 | 66.3 vs 56.5 | 71.7 vs 66.7 | 5.4 vs 3.3 | 1% | 37% |
| 10 | 74.4 vs 59.5 | 77.5 vs 68.6 | 6.0 vs 3.0 | 18% | 57% |
| 20 | 89.5 vs 64.5 | 88.0 vs 72.6 | 6.5 vs 2.7 | 59% | 29% |

Causes, by the categories the brief asks about:

| Category | Contribution | Evidence |
|---|---|---|
| **Existing balance modifiers** (anchor and nudge) | **Primary** | Gym anchors start 1–7 higher and grow 1.5 a season against 0.5: +25 by season 20. The nudge signs generated veterans at the gyms' anchor (59% of gym starters by season 20) and slows ordinary clubs' XP in 29–57% of their seasons. Gyms are never slowed. Task 4: the anchor correlates 0.89–0.94 with long-run win rate |
| **Roster composition** | Secondary | Gym tier offset at creation (team overall +5 in season 1). One ageless, cap-exempt legendary per gym (mean overall about 80 at season 20; 12 of 18 starting). Without the nudge gyms still won 68 of 78 titles (Task 4 Stage E) |
| **Other structural** | Secondary | Gym coaches have IQ + 0.2 (`aiCoach`). Schedule: each ordinary club plays four gyms a season |
| **Contracts and free agency** | Carry the anchor | Generated free agents arrive at the club's anchor; the runaway-veteran rule makes clubs above their band let veterans go, and those are ordinary clubs, not gyms |
| **Player development** | Not a gym advantage in decisions | The same rules for all; ordinary clubs lose development to the slowing brake |
| **Drafting** | Not a cause | Classes are fixed quality, gyms pick late, and the draft supplies few starters to anyone by mid-run |

- **Conclusion.** Gym dominance is the approved anchor design (GDD §15.3, §45.6; decisions C and V), enforced by the nudge. It is not a product of AI decisions. No AI intelligence change can alter it without an anchor decision, and the nudge would undo any club rising above its anchor. That is why Task 6's acceptance criteria must not hinge on titles, and why §7 sets the anchor as a decision.

### 3.9 Offensive-line weakness possibly overstated
- **Evidence (Task 5.5 §10.5):**
  - OL is the lowest-rated starting group league-wide: starter mean 67.0 against 68.3–74.5 elsewhere, and 2.2 below the club's own starter mean on average.
  - 20% of weak-OL flags are OL groups at or above the league's OL mean.
  - OL groups 6+ below the league's OL mean did not fall with trading (788 → 830).
  - In paired engine games a point of OL overall moves the score least: 0.34 relative per point per slot.
- **Root cause.** The Task 4 weak rule compares a group with its own club's starter mean, so positions that are rated lower everywhere are flagged more. The same club-relative, position-blind idea is in the AI's own `trades.js positionNeeds` (`(avg − quality) / 20`).
- **Status.** A measurement issue, and partly an AI-needs issue (§4.2 B1).

## 4. Recommended system designs

### 4.0 Phase 0: measurement first (no behaviour change)
- **Harness v4** (recording only, the same non-interference test as v3). Merge per-monster tracking from `task6-diagnostics.mjs` and add:
  - position-relative weak groups (the group mean against the league mean at that position that season);
  - succession readiness;
  - draftee conversion by draft year;
  - reserve progression;
  - starter-age distribution;
  - retirement events, once they exist.
- **Pre-registered Task 6 plan and thresholds** (§7), and a `task6-compare` tool in the style of `trade-benchmark-compare.mjs`.
- **A new v42.17.0 baseline under harness v4.** The Task 5.5 data stay the historical record.

### 4.1 Phase A: franchise foundations

**A1. Ageing curves, with how XP behaves at age** (needs decisions 1–4, §8)
- **Position-specific curves.** Each position has a decline onset and a slope. The proposed starting values, for your review:
  - RB: onset 28, steep;
  - WR and CB: 29;
  - LB and S: 30;
  - DL and TE: 31;
  - OL: 32;
  - QB: 33;
  - K: 35, shallow.
- **Physical and technical decline separately.**
  - Physical attributes (speed, agility, strength, durability) decline from onset, accelerating each year past it.
  - Mental and technical attributes (awareness, accuracy, arm, catching, blocking, coverage, tackling, kicking) decline later, about +2–3 years, and more slowly, so veterans can stay effective in technique-weighted roles (QB, OL, K).
- **Individual longevity.** A per-monster offset of about −2 to +2 years on onset and on retirement age.
  - It is derived deterministically from the monster's id with the existing `hashString`, so no new saved field and no schema change.
  - Durability shifts it further.
- **Gradual decline.** Per-attribute random draws around the curve (no identical penalties), from the franchise generator in a fixed order.
- **XP at age, the root cause in §3.1.**
  - From the physical onset, level-up points cannot raise physical attributes, and points go to mental and technical attributes up to potential.
  - Optionally, XP per game tapers after onset.
  - Without this, starters keep improving at 35 whatever the decline curve.
- **Unchanged:** legendaries and the rival's signature stay ageless (`isAgeless`).
- **Files:** `progression.js offseason()` and `afterGame()`/level-up spend; `monsters.js levelUp` or `autoSpendPoints`; `league-season.js leagueAgeing`.
- **Expected:** starter ages fall and stabilise with replacement; 33+ starters become uncommon.

**A2. Career-based retirement** (needs decisions 5–8)
- **When:** offseason only, at the same point as ageing (`leagueAgeing` / `startNextSeason`), never in season.
- **Probability** of retiring, from:
  - age against the position curve plus longevity;
  - performance, as overall against the club's role (a declining reserve retires sooner, an elite starter later);
  - injury history (weeks lost in recent seasons, from the injury history already kept);
  - durability.
- **Hard ceiling:** a maximum age per position (for example 37–40) so no monster plays at 47.
- **Never:** legendaries and the rival's signature.
- **Exit path:** a retiring AI monster leaves the league through the existing departure path:
  - a career event "retired";
  - decorated players become legend stubs, as walked legends do now;
  - storage follows the retirement archive budget (GDD §42.7).
- **Files:** a new `retirement.js` module; `league-season.js`; `career.js` event; `league-registry.js releaseFromClub` (reason "retired").
- **Owner's monsters:** whether retirement applies to them, and how it is shown, is a decision. The Franchise Legacy system stays outside Task 6; only the retirement event it might later display is shared.

**A3. Draft-class quality** (needs decision 9)
- **Options:**
  - **(a) Scale class quality** with league growth: a class offset that follows the mean anchor growth, for example +0.5 a season.
  - **(b) Scale potential and development** instead: prospects grow faster as reserves (Phase C).
  - **(c) Both.**
- **Recommendation: (c) at moderate strength.** (a) alone makes prospects start but not develop. (b) alone leaves round-1 picks 20 points short by year 19.
- **The owner's classes:** the owner drafts from the same class, so this changes the owner's experience too.
- **File:** `draft.js generateDraftClass()`.

**A4. Successor protection in trade valuation** (needs decision T3, §5.3)
- **Behaviour.** In `rosterWorth`, the best young backup (26 or under, within 8 overall, or with potential at or above the starter's overall) behind a 30+ starter counts at a higher role share. Proposed: 0.45 → 0.8, tapering as the starter's decline onset nears. Clubs then stop paying with him unless the price covers it.
- **Files:** `trade-value.js`, `league-trades.js`.
- **Ships with:** the trading follow-ups or with A1. It only reads ages.

**A5. Balance recalibration and the anchor decision** (needs decisions 10–11)
- **Recalibrate after A1–A3 change roster turnover.** A1–A3 will change how fast rosters turn over, so the nudge's targets (`LIFT_SHARE`, `BAND`, the runaway age) must be re-measured against the owner contract (§45.6), with the existing `tools/balance-compare.mjs` method.
- **Anchor options** (decision 10):
  - **keep** gyms as growing bosses;
  - **slow** gym growth or plateau it after a season;
  - **narrow** the ordinary clubs' slowing brake so ordinary clubs that build well can rise;
  - **re-base** anchors on a shared league curve, with gyms as a fixed offset.

### 4.2 Phase B: drafting and succession
- **B1. Age- and position-aware needs.**
  - A shared `needsOf(club)` replaces the position-blind, club-relative term in `trades.js positionNeeds` and complements `clubNeeds`.
  - Starter quality is measured against the league at that position (fixes §3.9 for AI decisions).
  - An ageing term: the years until the starter's projected decline, from A1.
  - A succession term: whether a successor exists.
- **B2. Need- and age-aware drafting** (`aiDraftPick`).
  - Score = best available, plus a need term (B1), plus a readiness horizon (will he start within his rookie deal?), plus upside for young prospects.
  - Keep the kicker and duplicate penalties and the noise.
  - The owner's picks are unaffected.
- **B3. Contract planning** (`leagueContracts`).
  - Re-sign by projected value over the contract term, using the A1 curve.
  - A starter past his onset is re-signed only if no successor within N overall exists or the club is contending (Phase D).
  - Contract length of 1–3 years by age and value, which also fixes the synchronised two-year expiries (Task 4 #8).
  - Keep the runaway rule as an approved attrition mechanism.
- **B4. Young-player succession.**
  - When a group's starter is within 2 seasons of onset and has no successor, the club marks a succession need, read by the draft (B2), free agency (C3) and trades (buy a young backup rather than an old starter).

### 4.3 Phase C: development and free agency
- **C1. Developmental XP for reserves** (decision 12). Two designs:
  - **(a) Practice XP:** after each game, the club's best prospect at each position (age 25 or under) gains a share, for example 30–40%, of a starter's base XP. Game results do not change. Low risk.
  - **(b) Real snaps:** garbage-time or package rotation in AI games. More realistic, but it changes AI results and needs engine work.
  - **Recommendation: (a)**, with (b) as a later option.
  - **Calendar:** with a 10-game season, the share must be calibrated so prospects progress over 2–3 seasons, not one.
- **C2. Reserve progression.** Extend the young-growth rule (currently to 23, awareness and strength) along the A1 curve: a physical growth phase to the position's peak, toward potential.
- **C3. Free agency that upgrades starters** (`leagueFreeAgency`).
  - When a starting group is weak by the position-relative measure (B1) for a season and room allows, sign an upgrade even with the count full.
  - Make room by releasing the weakest spare, or by not re-signing one (B3).
  - Prefer arrivals younger than the starter they replace when the group is ageing (B4).
  - Generated quality follows the gap, within the anchor's limits, so the nudge's role is unchanged.

### 4.4 Phase D: contend-or-rebuild intelligence
- **Strategy state** per club per offseason, stored additively in `clubRecord.strategy`, which already exists. Four modes:
  - **Contend:** top of the division or a winning record, roster mostly at its peak.
  - **Compete:** middle.
  - **Retool:** losing, roster mostly young.
  - **Rebuild:** losing, roster old or capped out.
- **Inputs:** last season's record, the anchor gap (`teamOvr − target`), roster age profile, draft capital, contracts expiring.
- **Behaviour by mode:**

| | Contend | Rebuild |
|---|---|---|
| Draft (B2) | Favours readiness | Favours upside |
| Contracts (B3) | Re-signs veterans on 1-year deals | Lets veterans past onset walk |
| Trades (Task 5 search) | Buys starters, pays with picks and older spares | Sells veterans 29+ for picks and young backups (AI sellers may sell a starter in rebuild mode: a change to an approved rule, decision 13) |
| Free agency (C3) | Veterans | Young upside |
| Lineup (C1) | Starters | More development share |

- **Constraint.** The nudge and anchors still bound results. Phase D success is measured on roster age, potential and draft capital in rebuilding clubs, and on recovery time, not on titles, unless decision 10 changes the anchors.

## 5. Trading follow-ups (separate from Task 6; each a separate decision)

### 5.1 T1: the offseason-opening offer defect (fix prepared, not applied)
- **Cause.** `franchise.js` calls `maybeTradeCall` (line 2083) before `s.finished = true` (line 2094), and `trade-window.js` reads that moment as the postseason (line 29).
- **Fix.** Move the call to just after `s.finished = true`. The patch is `docs/task6-plan/d1-offseason-offer-fix.patch`: one line removed, one line added, in one file.
- **Tested in a scratch copy only:**
  - offseason attempts 6 of 6, against 0 of 6 unpatched (`tools/offseason-call-check.mjs`, seeds 51–53);
  - `tests/trading-second-pass.test.js` 38 of 38;
  - league state identical to unpatched v42.17.0 (rows, trades, draft, arrivals, departures; seed 1 × 3 seasons). Only the owner's offers change, from 3 to 5.
- **Still needed when authorised:**
  - a regression test (one offseason attempt per season, accepted or declined within the offseason window);
  - the release process.

### 5.2 T2: offers when the owner's roster is full (design for approval)
- **Problem.**
  - Sell offers need room on the owner's roster.
  - Buy offers need room on the club's roster, and AI rosters are at 38 all season.
  - Swaps qualify only within a 0.9–1.15 value match.
  - Result: offers stop after season 2 (130 offers in seasons 1–2 against 5 in seasons 3–20).
- **Proposal.** Use roster-neutral exchanges only, and never release anyone from the owner's roster.
  1. **Sell as a swap.** The club offers its spare who would start for the owner. It asks for one of the owner's spares at a position where the club is thin (never a starter without cover, the same rule as the desk), plus or minus picks to close the value gap. Same counts both ways.
  2. **Buy as a swap.** A club at 38 that wants the owner's spare sends one of its own spares back, plus picks.
  3. **Widen the swap match.** Reuse the AI–AI attempt logic: spare for spare in band, or spare + pick (`league-trades.js` options), instead of the narrow 0.9–1.15 swap-only path.
  4. **Offseason buy offers.** Once T1 is fixed, offers at the offseason opening can use picks-only buys, because AI rosters have room then (the probe found an offer at 21 of 22 offseason points).
- **Keep:** the deadline, protection, rookie-deal and flip-lock rules, the desk's acceptance re-check, and owner choice (decline always possible).
- **Success:** in a 10-season benchmark with the hands-off owner, offers persist after season 2 at a rate comparable to v42.16.0's later seasons (about 0.1 a season or more), 100% legal for both sides on acceptance, and none past week 8.
- **Files:** `trade-desk.js buildIncomingOfferNow`.

### 5.3 T3: young-successor protection (AI–AI and AI–owner)
- **Option 1 (recommended): soft protection in valuation (A4).** Clubs value a successor more, so he costs more. It applies whenever an AI club prices him: AI–AI deals, owner proposals, incoming offers. The owner's own monsters are not affected; the owner decides for himself.
- **Option 2: hard rule.** A designated successor cannot be sent as payment in AI–AI deals.
  - **Exceptions:** the club has two or more successors at the position; the starter is long-term injured; the club is in rebuild mode and the deal returns a younger prospect (Phase D).
- **Success:** succession cover at or above the v42.16.0 level (21.4%) with Task 5's gains kept (T3–T10 still pass, persistent weak no worse).

### 5.4 T4: repeat-trade restriction (AI–AI flip lock)
- **Evidence:** 101 monsters traded again in the same or the next season (2.5%): 70 had arrived as swap payment, 7 went back to the club they came from, and 21 were traded twice within the same season. The owner's desk already locks a just-bought monster for the season.
- **Proposal:**
  - an AI–AI-acquired monster cannot be traded again by his new club in the same season, including its offseason window;
  - he cannot return to the club that traded him within a year.
- **Exceptions:**
  - season rollover;
  - an injury-cover emergency where the club would otherwise field an illegal lineup, which in practice is handled by signings, so likely none needed.
  - The owner's own trades keep their existing lock.
- **Success:** re-trades within a season at most 0.5% of traded monsters, with no loss of lineup gain in in-season deals.

## 6. Phase-by-phase roadmap

| Phase | Work | Dependencies | Complexity | Regression risk | Main risks |
|---|---|---|---|---|---|
| 0 | Harness v4, pre-registered Task 6 plan, v42.17.0 baseline under v4 | None | Low | None (tools only) | — |
| T1–T4 (separate track) | Offseason offer fix; offers to a full roster; successor protection; flip lock | T1 none; T2 after T1; T3 = A4 | Low (T1, T3, T4), Medium (T2) | Low | Owner-facing offers; T3 changes payment choices |
| A | A1 ageing and XP at age, A2 retirement, A3 draft classes, A4 = T3, A5 recalibration and anchor decision | 0; decisions 1–11 | High | **High**: changes every roster's lifecycle and the owner's difficulty curve | Owner win rate outside ±5; save compatibility; storage of retired monsters |
| B | B1 needs, B2 drafting, B3 contracts and lengths, B4 succession | A1 (curves), A2 | Medium | Medium | Contract churn, cap behaviour |
| C | C1 practice XP, C2 reserve growth, C3 free-agency upgrades | A1, B1 | Medium | Medium (C1 interacts with the nudge's XP brake; C3 shrinks the owner's market) | Over-strong AI development; pools emptier for the owner |
| D | Strategy modes steering B and C and trading | B, C, decision 13 | High | High (interacts with the anchor and nudge) | Oscillating modes; owner-facing difficulty |

**Per phase:**
- **Specific systems.** As listed in §4.
- **Every phase must:**
  - keep integrity at 0;
  - be deterministic;
  - keep save compatibility (additive fields only; the longevity value derived, not stored);
  - stay pure JavaScript, browser and Capacitor safe;
  - do its heavy work in the offseason, so the weekly loop's cost is unchanged.
- **Benchmark and regression tests per phase:**
  - unit tests for each rule (curves, retirement odds, draft score, contract choice, needs);
  - the full suite on the final implementation commit;
  - matched-seed benchmarks against v42.17.0 (§7);
  - the balance-compare study for the owner contract;
  - save-compatibility play-through (`tools/save-compat-check.mjs`);
  - performance (Stage P, within +10%).

## 7. Proposed benchmark acceptance criteria

**Framework:**
- Harness v4 on matched seeds against the published v42.17.0, including:
  - 10-season samples: B seeds 1–60 (development) and **held-out 61–80** (final confirmation, run once);
  - 20-season samples: C seeds 106–115 (10 seeds, enough to support balance claims, about 1 hour on 2 lanes);
  - the six stress scenarios;
  - the no-nudge variant for attribution;
  - Stage P for determinism and timing;
  - save play-through and the owner contract (balance-compare, 8 seeds × 8 seasons per difficulty).
- **A finding counts as confirmed only when** its paired bootstrap interval excludes zero on the pooled B sample, agrees in direction on the held-out seeds, and (for long-run claims) holds on C with 10 seeds. Anything else is reported as uncertain.
- **Competitive balance:** no claim from fewer than 10 twenty-season seeds.

**Starting thresholds** (to pre-register in Phase 0; baselines are v42.17.0):

| Measure | Baseline (v42.17.0) | Target | Phase |
|---|---|---|---|
| Starter mean age at season 20 (C) | 35.1 | 28–30 | A |
| Starter slots held by 33+ (season 20, per-monster) | 62% | ≤ 15% | A |
| Oldest starter (non-protected) | 47 | ≤ the position's ceiling | A |
| Round-1 starting within 2 seasons, drafted in years 12+ | 14% | ≥ 30% | A, B, C |
| Round-1 starting within 2 seasons, all years (B) | 24.3% | ≥ 35% | B, C |
| Young reserves' gain over 3 seasons as reserves | +0.7 | ≥ +3 | C |
| Succession cover (30+ starters with a successor), B / C | 17.6% / 10.7% | ≥ 40% / ≥ 30% | A4, B |
| Persistent weak group (club-relative), B | 11.9% | ≤ 8% | B, C |
| Persistent weak with cap room, B | 9.8% | ≤ 5% | C |
| Persistent weak, position-relative (new measure) | measured in Phase 0 | −30% | B, C |
| Misaligned draft picks | 24.5% | ≤ 15% | B |
| Recovery from ≤ 2 wins to ≥ 5 (never recovered) | 46.7% | monitor; ≤ 35% only if decision 10 relaxes anchors | D |
| Rebuilding clubs: starter age and potential after 3 seasons | measured in Phase 0 | younger and higher potential than baseline (interval excludes 0) | D |
| Gym share of AI titles; distinct champions | 95.1%; 4 per 10 seasons | no target unless decision 10; report with 10+ C seeds | A5 |
| Owner win rate; AI mid-season mean against target | §45.6 bands | within ±5 and ±2 on every difficulty | every phase |
| Integrity, determinism, cap and roster legality | 0 problems | 0 | every phase |
| Stage P time per season | 80–84 s per 6 seasons | ≤ +10% | every phase |
| Save play-through (old saves) | pass | pass | every phase |

## 8. Decisions requiring owner approval
**Ageing and retirement (Phase A):**
1. **Position curves.** Approve the onset and slope table (§4.1 A1) or supply your own.
2. **Physical against technical decline.** Approve that mental and technical attributes decline later and more slowly, and the offset (+2–3 years).
3. **XP at age.** Approve that from the physical onset level-up points cannot raise physical attributes (and optionally XP tapers). Without it the ageing design will not take effect.
4. **Longevity.** Approve a per-monster longevity offset (−2 to +2 years) derived from the id (no save change), with durability shifting it.
5. **Retirement factors and ceiling.** Age, performance, injury history, durability and longevity; a hard ceiling per position (for example 37–40).
6. **Owner's monsters.** Do they age on the same curves and retire? If yes, how is the owner told (offseason news, contract screen), and may the owner talk a monster out of retiring? The Legacy system stays out of scope.
7. **Retired monsters' records.** Use the existing legend-stub and retirement-archive path (storage budget per GDD §42.7).
8. **Timing.** Retirement in the offseason only, at ageing, before free agency.

**Draft and balance:**

9. **Draft-class quality.** Scale class quality, potential or both (recommended both, moderate), knowing the owner drafts from the same classes.
10. **Balance anchors.** Keep gyms as growing bosses; slow or plateau gym growth; narrow the ordinary clubs' slowing brake; or re-base the anchors. Recalibration of `LIFT_SHARE`, `BAND` and the runaway age is authorised as part of Phase A either way.
11. **The owner contract.** Keep §45.6's bands (owner ±5 win points, AI ±2 overall) as the binding acceptance test for every phase.

**Development and strategy:**

12. **Developmental XP.** Practice XP share for prospects (recommended) or real game snaps.
13. **Selling starters.** May AI clubs in rebuild mode sell starters to AI clubs? This changes the approved "AI–AI sellers sell only spares" rule.
14. **Free-agency upgrades.** May AI clubs release a spare to sign a starter-quality upgrade? It shrinks the owner's pools somewhat.
15. **Measuring weakness.** Position-relative (league-based) weakness for the AI's needs and the benchmark, replacing the club-relative rule that overstates OL.

**Trading follow-ups (separate track):**

- **T1.** Authorise the offseason-offer code change (patch ready).
- **T2.** Approve the roster-neutral offer design for full rosters.
- **T3.** Successor protection: soft valuation premium (recommended) or hard rule, and whether it applies when AI clubs price the owner's proposals.
- **T4.** AI–AI flip lock: same season plus no return within a year, with the listed exceptions.

**Sequencing:**

16. Approve Phase 0 now, so the baseline and thresholds are fixed before any behaviour change. Decisions 1–11 are needed before Phase A starts; 12–15 before Phases C and D.
