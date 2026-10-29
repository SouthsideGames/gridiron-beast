# AI Franchise Benchmark (Task 4)

Diagnostic only. No gameplay, AI behaviour, balance value, save schema or UI was changed. The pre-registered plan, written and
committed before any Stage B–E run, is `docs/AI_FRANCHISE_BENCHMARK_PLAN.md`; every threshold below comes from it.

## 1. Executive summary

**Central question:** can the 15 AI franchises recognise their weaknesses, make sound long-term decisions, and build competitive
teams without leaning too hard on balancing mechanisms?

**Short answer:** the AI clubs are reliable caretakers, not strategists. Over 640 simulated seasons, the moment-to-moment roster
work was clean:
- legal lineups at every season start;
- never over the cap when a season opens;
- depth refilled by position;
- fair trades;
- injuries covered.

There were no exceptions, invariant violations or save failures, and every run was deterministic.

There is almost no forward planning. The decisions that matter over many seasons are rule-driven:
- **Draft:** best player available, ignoring needs and age.
- **Contracts:** keep anyone who starts, at any age.
- **Lineups:** strongest monster plays.
- **Development:** only monsters who play gain experience.

The consequences follow from those rules:
- clubs never replace an ageing core;
- the draft supplies few starters;
- reserves barely develop.

**Strength comes from the anchor, not from decisions.** Competitive outcomes are set mainly by each club's fixed quality anchor
(`clubQuality`), which is an approved design:
- the eight gym clubs, whose anchor grows three times faster, won 282 of 294 AI titles;
- the club's anchor correlates 0.89–0.94 with its long-run win rate.

**What the balance machinery does.** Removing the balance nudge in a scratch tree (Stage E) does not expose collapsing AI clubs.
Instead:
- the spread of team strength narrows;
- clubs keep their own monsters;
- their starters age faster.

So the nudge mostly imposes the difficulty curve and hides the ageing problem. It is not rescuing bad AI decisions.

**Confirmed AI weaknesses, in order:**
1. no succession planning or retirement, so starters reach a mean age of 36 by season 20;
2. the draft rarely produces starters — 17% of round-1 picks start two seasons later, falling over a franchise;
3. reserves and draftees do not develop;
4. trade valuation ignores position — kickers are the most-traded position, bought with 51 round-1 picks;
5. the in-season trade and signing windows are almost inert — 2 trades in 200 seasons.

Several headline imbalances are owner-approved design rather than AI defects:
- gym dominance;
- persistent losing clubs;
- the runaway-veteran rule.

They are listed for owner decision (§17).

## 2. Code version and environment
| Item | Value |
|---|---|
| Baseline | `main` at `cc99673` — v42.16.0-run-game, the published build; Phases A, B and C merged (PRs #78, #79, #80) |
| Branch | `ai-franchise-benchmark` (benchmark tooling and documentation only) |
| Runtime | Node v22.22.0, Linux container, 2 CPU cores, no browser |
| Rules | Pro difficulty (the standard league), the single enabled tier, 16 clubs (15 persistent AI clubs plus the owner), 20-season franchise cap, production balance values |
| Saves | Every run is in memory; no real save or game link was read or written |

## 3. Franchise lifecycle and feature availability map
Verified in code, not taken from the GDD. Unless stated otherwise, the functions live in `src/franchise/`.

| Lifecycle step | Who decides | Implementation (file → function) | Status |
|---|---|---|---|
| Weekly lineup | AI, automatic | `roster.js buildDepthChart`: best available by overall at each position; injured monsters skipped; fatigue and development ignored | Implemented and active |
| Playing time for development | — | No code path gives reserves or prospects snaps | Not implemented |
| In-season injury cover | AI | `league-season.js leagueInjuryCover`: waivers, then pools, then a generated veteran (may sign at the floor regardless of cap room) | Implemented and active (rarely needed) |
| In-season pool and waiver signings | AI | `franchise.js poolActivity`: 15% a week per pooled monster, given to the neediest club with roster and cap room | Implemented, rarely exercised (19 signings in 200 seasons; rosters are full) |
| In-season AI–AI trades (weeks 2–8) | AI | `league-trades.js aiTrades` with `window: 'season'` | Implemented, rarely exercised (2 trades in 200 seasons) |
| Contracts at season end | AI | `league-season.js leagueContracts`: re-sign starters and value (overall ≥ roster median, or age ≤ 25 with upside); reserves 32+ walk; runaway clubs let veterans 27+ go; trim to cap | Implemented and active |
| Ageing and decline | Rules | `progression.js offseason`: +1 age; from 30, −1–2 to speed, agility and durability; to 23, growth; salary refresh | Implemented and active |
| Retirement | — | No age- or decline-based retirement. Monsters leave only through contract attrition and the pool cap; a decorated leaver becomes a legend stub | Partially implemented (attrition only) |
| Offseason AI–AI trades | AI | `league-trades.js aiTrades`: need ≥ 0.25, upgrade ≥ 2, value band 0.85–1.15, at most 3 a window, never protected or rookie-deal monsters | Implemented and active (about 2 a season) |
| Draft | AI | `draft.js aiDraftPick`: overall + 0.2 × (potential − 70) ± noise, −4 for a position already taken this draft, −6 for a kicker; no needs, no ages | Implemented and active |
| Free agency | AI | `league-season.js leagueFreeAgency`: fill toward the 38-man composition by position count (lineup holes first); waivers, then pools, then a generated veteran at the club's target quality | Implemented and active |
| Development | Rules | `progression.js afterGame`: XP only for monsters in a depth-chart slot; points auto-spent; auto-evolve when ready | Implemented and active |
| Competitive balance | Rules | Target = today's generator (`clubQuality`, per-club hash offset, gym tiers growing 1.5 a season, ordinary clubs 0.5); the nudge (`leagueNudge`: up to 3 generated signings below the band, slower XP above it); runaway-veteran attrition; protected legendaries and rival signatures (ageless, cap-exempt, never moved) | Implemented and active (owner-approved, decisions A, C, V, Y) |
| Contend versus rebuild strategy, age-aware drafting, positional value, cap planning | — | No code path | Not implemented |
| Owner–AI trades (AI calls, owner asks) | Owner-controlled | `trades.js` / `franchise.js maybeTradeCall` | Implemented; not exercised by the benchmark owner policy |

## 4. Methodology and pilot (Stage A)

**Harness.**
- `tools/ai-franchise-benchmark.mjs` drives the production lifecycle through `tools/franchise-soak.mjs runFranchise` — the game's own functions, the same path the existing soaks use.
- It observes the franchise object between the game's steps (the weekly `check` and the `onSeason` hook) and never calls a mutating function.
- It records:
  - every AI draft pick, against the board at that moment;
  - every arrival with its source and every departure with its reason;
  - every AI–AI trade, valued at the first check after the deal;
  - season-end club state;
  - integrity checks after every week;
  - a save export/import round trip of the whole league at every season end.

**Owner policy (fixed).** The soak's hands-off owner: the staff run every week, the trainer spends points, every possible
contract is re-signed, the owner takes the best visible prospect at each pick and the cheapest free agents up to 26, makes no
trades and answers no calls. A dismissed owner is reinstated after the season (simulation only, owner's rule of 2026-10-24). The
owner's club is reported separately and never counted among the 15.

**Pilot (seeds 1–2, 2 seasons):**
- Every lifecycle step executed: draft, contracts, free agency, offseason trades, ageing, development and evolution, injury
  cover, the nudge.
- Decisions were recorded: in the first pilot run, 180 AI picks, 144 arrivals, 241 departures and 5 trades.
- **Determinism:** the same hash twice (`9811693e…`). Re-running Stage B seed 3 (10 seasons) and Stage C seed 102 (20 seasons)
  reproduced their stored results byte for byte.
- **Non-interference:** 30 of 30 club-season records and both champions are identical with and without the harness.
- **Cost:** 18.5–20.4 s per simulated season, peak heap 273–289 MB. The full plan was affordable, so no reduced plan was needed.
- **Saves:** no save written; the repository is unchanged apart from the new files.
- No system could not be exercised. The in-season trade and signing windows ran but rarely produced moves (§10).

## 5. Seeds, sample sizes and configuration
| Stage | Seeds | Seasons | Club-seasons (AI) | Notes |
|---|---|---|---|---|
| B broad | 1–20 | 10 | 3,000 | 9,000 AI picks, 12,792 arrivals, 14,244 departures, 407 trades |
| C long | 101–105 | 20 | 1,500 | 4,500 picks, 229 trades |
| D stress | 1–5 | 6 per scenario | 90 stressed per scenario (3 clubs × 5 seeds × 6) | Six scenarios (`tools/ai-benchmark-scenarios.mjs`), compared with the same clubs in Stage B seeds 1–5 |
| E diagnostic | 1–8 | 10 per variant | 1,200 per variant | no-nudge and flat-market scratch trees (`tools/ai-benchmark-variant.mjs`), compared with Stage B seeds 1–8 |

Run hashes are in `docs/ai-benchmark/run-hashes.json`.

**Reproduce:**
```
node tools/ai-franchise-benchmark.mjs --seeds=1-20 --seasons=10 --json=B.json
node tools/ai-franchise-benchmark.mjs --seeds=101-105 --seasons=20 --json=C.json
node tools/ai-franchise-benchmark.mjs --seeds=1-5 --seasons=6 --scenario=aging --json=D-aging.json   # and expiring, thin, injuries, rebuild, picks
node tools/ai-benchmark-variant.mjs --variant=no-nudge --out=/tmp/v
node tools/ai-franchise-benchmark.mjs --seeds=1-8 --seasons=10 --root=/tmp/v --json=E.json
node tools/ai-benchmark-analyze.mjs --B=B.json --C=C.json --D=aging:D-aging.json --E=no-nudge:E.json --out=summary.json --csv=club-seasons.csv
```

**Machine-readable results** are in `docs/ai-benchmark/`:
- `summary.json` — every metric;
- `club-seasons.csv` — every club-season, Stages B and C;
- `draft-picks.csv`;
- `trades.csv`;
- `run-hashes.json`.

## 6. Results by evaluation category

Pre-registered thresholds come from the plan. ✔ means the threshold was not crossed; ✖ means it was.

### A. Roster construction
| Metric | B (10 seasons) | C (20 seasons) | Threshold |
|---|---|---|---|
| Lineup failure at a season start | 0 | 0 | ✔ |
| Lineup failure at a season end (most likely late-season injuries: cover runs before each next week, and the final week has none) | 23 of 3,000 | 19 of 1,500 | (reported) |
| Over the cap at a season start | 0 | 0 | ✔ |
| Over the cap at a season end (consistent with injury cover's floor signings, which may exceed cap room by rule) | 0 | 9 | (reported) |
| Roster size, median (min–max) | 38 (27–38) | 37 (27–38) | — |
| Shortage (fewer natural players than slots) | 2.8% of club-seasons | 3.1% | — |
| Weak group (starters 6+ below the club's starter mean) | 28.4% | 36.3% | — |
| Persistent weak group with ≥100k cap room | 11.8% | 13.2% | ✔ (< 20%) |
| Longest persistent weak streak | 9 seasons (seed 4, Sunfire Lions, S) | 15 seasons (seed 102, Ashford Hawks, RB, cap room never below 109k) | — |
| Surplus group | 0.1% | 0.1% | — |
| Starter − backup gap (overall) | 13–18 | 16–22 | — |

Free agency fills each position to its count, so depth is never wildly excessive and lineups stay legal. Quality is a different
matter: about one club-season in eight carries the same weak group into the next season while it has cap room. The rule fills
counts, not quality (§10 I.1).

### B. Draft intelligence
| Metric | B | C | Threshold |
|---|---|---|---|
| Median overall gap to the best available | 1 | 1 | ✔ (< 5) |
| Median potential gap to the best potential available | 5 | 5 | — |
| Picks where the club's need at the position is 0 | 46.6% | 45.8% | — |
| Misaligned picks | 24.6% | 25.2% | ✔ (< 30%, close) |
| Picks that would neither start nor fill a need | 42.2% | 42.9% | — |
| Picks at the club's top need | 11.5% | 9.8% | — |
| Kicker picks / same-draft duplicates | 1.9% / 0.1% | 2.2% / 0% | ✔ |
| Round-1 picks starting for the drafter 2 seasons later | **17%** | **6.7%** | ✖ (< 25%) |
| Round-1 picks starting for the drafter 5 and 6+ seasons later | 29% / 35% | 12% / 15.5% | — |
| Round-2 / round-3 picks starting 6+ seasons later | 5.7% / 2.3% | 1.1% / ~1% | — |

**Why round-1 picks stop starting (Stage C).** The draft class is generated at a fixed quality: round-1 picks average about 60–61
overall in every season. Club starters climb with the anchor, so the gap between a club's starter mean and its round-1 pick grows:

| Draft year | 1 | 5 | 10 | 15 | 20 |
|---|---|---|---|---|---|
| Gap (starter mean − round-1 pick) | 3.1 | 8.8 | 13.6 | 18.6 | 21.5 |
| Round-1 picks that would start immediately | 48% | 21% | 12% | 8% | 3% |

### C. Free agency
| Metric | B | C | Threshold |
|---|---|---|---|
| Non-draft arrivals by source (generated / waivers / pools / trades) | 1,464 / 2,131 / 787 / 423 | 849 / 1,807 / 349 / 238 | — |
| Arrivals at a position already in surplus | 0% | 0% | ✔ |
| Non-draft arrivals who start that season | 45.5% | 49% | — |
| Generated arrivals among starters at the last season | 10.8% (season 10) | 32% (season 20) | ✔ (< 40%) |
| Arrivals at a group that was weak at the previous season end | 15.6% | 16.7% | — |
| In-season signings | 19 | 35 | — |

Signings are affordable (never over the cap at a season start), never redundant, and they replace departures. The limitation is
the system's design: it fills position counts toward a fixed composition, so a weak starter with a full group is never upgraded
through free agency.

### D. AI trading
| Metric | B | C |
|---|---|---|
| Trades per season | 2.04 (390 picks-for-player, 17 swaps) | 2.29 |
| Window | 405 offseason, **2 in-season** | 226 offseason, 3 in-season |
| Value ratio at the time, median (range) | 1.03 (0.87–1.18) | 1.02 (0.86–1.18) |
| Acquired player starts for the acquirer | 81.3% | 72.1% |
| Acquired player gone within one season | 12% | 20.5% |
| **Kickers acquired** | **58 of 407 trades (14%), paid with 93 picks, 51 of them round 1** | 38 of 229 |

Trades are fair by the owner's own value band, and they fill real starter holes. Valuation is position-blind (§10 I.10). The
in-season window almost never produces a deal: about 350 attempts were expected (200 seasons × 7 weeks × 0.25), and they produced
2 deals. Player-for-picks needs the buyer below 38, and AI rosters are full mid-season.

### E. Contracts, ageing and retirement
| Metric | B | C |
|---|---|---|
| Contract-time departures that were starters | 15.2% (1,788) | 16.3% |
| … of which forced by the runaway-veteran rule (decision A) | 1,741 (97%) | — |
| … others (mostly 32+, injured at contract time) | 47 | — |
| Group change in starter overall after losing a starter (median) | +3.5 | +3.7 |
| Mean starter age, season 1 → season 10 → season 20 | 23.7 → 30.2 | 23.6 → 30.2 → **36.1** |
| Club-seasons with mean starter age ≥ 30 | 16.5% (proxy) | 99% from season 17 |
| Oldest starting group | — | 40.5 (seed 102, Northstar Wolves, season 20, 2–7) |

The pre-registered "starters lost at contract time" threshold (10%) is crossed, but 97% of those departures are the owner-approved
runaway-veteran attrition, an intentional balance mechanism. The remaining rate (47 of 11,772 contract departures, 0.4%) is not a
weakness.

The ageing threshold is crossed (✖). It uses the club's mean starter age as a proxy; individual starter ages were not recorded. AI
clubs re-sign every starter at any age, and nothing retires a monster. The creation cohort ages together and is replaced only
when a better player happens to arrive. That is usually a generated or waived veteran, and the nudge brings most of those in
(§11).

### F. Monster development
| Season | 2 | 5 | 10 | 20 (C) |
|---|---|---|---|---|
| Development of returning monsters (overall per season) | +1.2 | +0.7 | +0.4 | +0.2 |
| Evolutions per club-season | 0.47 | 1.84 | 0.54 | 0.31 |
| Starters developed in-house (original + drafted) | 98% | 92% | 69% | **41%** |
| Mean level | 4.4 | 7.0 | 9.5 | 12.5 |

Overall gained by draftees still on the roster 3+ seasons later (Stage B):

| Draftee | Round 1 | Round 2 | Round 3 |
|---|---|---|---|
| Became a starter | +9.5 | +6.6 | +5.3 |
| Stayed a reserve | +1.6 | +1.5 | +1.2 |

XP only reaches monsters in a depth-chart slot, and AI lineups play the strongest monster, so reserves and prospects barely grow.
The "in-house under 40% by season 10" threshold is not crossed (✔, 69%), but in-house starters fall below 40% by season 20 in
Stage C.

### G. Competitive balance
| Metric | B | C | Threshold |
|---|---|---|---|
| AI titles won by the 8 gym clubs | 282 of 294 (96%) across B and C, against 53% of club-seasons | | — |
| Seeds where one club wins ≥ 40% of the titles | 15 of 20 | 5 of 5 (max 15 of 20, seed 104) | ✖ |
| Distinct champions per seed (median) | 4 of 10 | 5 of 20 | — |
| Clubs with a run of 3+ straight seasons of ≤ 3 wins | 35.3% | 57.3% | ✖ (> 10%) |
| Recovery time from ≤ 2 wins to ≥ 5 wins (median) / never within the run | 2 / 45.8% | 3 / 47.6% | ✔ (median ≤ 3) |
| Correlation: anchor (`clubQuality`) with wins / with team overall | 0.58 / 0.92 | 0.62 / 0.97 | — |
| Correlation: club's mean anchor with long-run win rate | 0.89 | 0.94 | — |
| Year-on-year win correlation | 0.53 | 0.67 | — |
| Spread of team overall (SD), season 1 → 10 → 20 | 3.5 → 4.8 | 4.0 → 5.2 → 8.1 | — |
| Owner (hands-off) win rate / titles | 57.8% / 4 | 47.4% / 2 | — |

Two pre-registered thresholds are crossed: title concentration and persistent losers. The cause is the approved anchor design, not
AI management: an AI club cannot out-build its anchor, because the nudge slows a club above its band. Stage E (§11) separates the
two. This is listed for owner decision, not as an AI defect.

### H. Franchise integrity (data defects reported separately)
Integrity was clean across all 640 seasons (B, C, D, E and the re-runs). There were zero instances of:
- invariant violations — unique ids, one club per monster, protected monsters in place on permanent deals, rosters 26–38 and
  legal lineups at season start, the cap at season start, the standings;
- registry structural problems;
- save round-trip changes;
- exceptions;
- determinism differences.

No data-integrity defect was found. The season-end lineup failures and season-end over-cap club-seasons in §6A follow documented
rules: most likely late-season injuries after the last weekly cover, and injury cover's floor signings. Each is corrected before
the next season opens.

## 7. League-wide metrics, season by season

**Stage B**, means over 20 seeds and 15 AI clubs:

| Season | Team OVR | Target | OVR SD | Starter age | In-house starters % | Generated % | Waivers % | Evolutions per club | Development |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 62.9 | 63.6 | 3.52 | 23.7 | 100 | 0 | 0 | 0.03 | – |
| 2 | 65.1 | 65.1 | 3.56 | 24.5 | 98.2 | 0.3 | 0.6 | 0.47 | 1.2 |
| 3 | 66.7 | 67.0 | 3.44 | 25.3 | 97 | 0.5 | 1.3 | 1.18 | 1.0 |
| 4 | 67.7 | 67.9 | 3.59 | 26.0 | 94.8 | 1.0 | 2.0 | 1.88 | 0.8 |
| 5 | 69.0 | 69.5 | 3.33 | 26.9 | 92.4 | 1.2 | 3.8 | 1.84 | 0.7 |
| 6 | 69.5 | 70.0 | 3.72 | 27.5 | 89.4 | 2.1 | 5.0 | 1.51 | 0.6 |
| 7 | 70.6 | 71.6 | 3.37 | 28.4 | 86.1 | 2.7 | 7.9 | 1.18 | 0.5 |
| 8 | 71.3 | 72.2 | 4.02 | 29.0 | 79.9 | 5.5 | 10.2 | 0.85 | 0.4 |
| 9 | 72.5 | 73.8 | 4.01 | 29.8 | 75.0 | 7.1 | 13.6 | 0.62 | 0.4 |
| 10 | 73.4 | 74.3 | 4.79 | 30.2 | 69.4 | 10.8 | 15.3 | 0.54 | 0.4 |

**Stage C** (5 seeds, 20 seasons): seasons 11–20 continue the trend:
- team OVR 74.8 → 80.7, against a target of 76.0 → 83.3;
- SD 5.4 → 8.1;
- starter age 30.8 → 36.1;
- in-house starters 64% → 41%; generated 13% → 32%; waivers 18% → 22%.

Nudge activity in Stage B:
- **Signings:** none in seasons 1–2, rising to 38% of clubs in season 10.
- **Slowed (developing at reduced XP):** about 16% of club-seasons.

The full per-club, per-season table is `docs/ai-benchmark/club-seasons.csv`.

## 8. Club-by-club and season-by-season results
Every AI club-season of Stages B and C is in `docs/ai-benchmark/club-seasons.csv`. It has 4,800 rows (both stages, owner rows
included) and these columns:
- record, playoffs, finals, titles;
- team overall, mid-season overall, target, anchor and growth;
- nudge state;
- roster size, payroll and cap room;
- starters and backup counts by position;
- weak and surplus groups;
- ages;
- development, evolutions and stages;
- starter provenance.

Each pick and trade is in `draft-picks.csv` and `trades.csv`.

Champions per seed, as distinct champions / most titles by one club:

| Stage | Seeds |
|---|---|
| B (10 seasons) | 1: 5/5 · 2: 4/5 · 3: 4/4 · 4: 3/5 · 5: 4/6 · 6: 8/2 · 7: 5/6 · 8: 5/3 · 9: 3/4 · 10: 3/6 · 11: 3/5 · 12: 3/5 · 13: 5/4 · 14: 7/3 · 15: 4/4 · 16: 4/4 · 17: 3/7 · 18: 5/5 · 19: 4/5 · 20: 4/7 |
| C (20 seasons) | 101: 5/10 · 102: 6/6 · 103: 5/8 · 104: 3/15 · 105: 7/6 |

## 9. Successful versus struggling AI franchises
Clubs ranked by win rate over their run; top and bottom quarter.

| | B top (75) | B bottom (75) | C top (18) | C bottom (18) |
|---|---|---|---|---|
| Win rate | 75.9% | 28.4% | 78.4% | 26.2% |
| Titles per club | 2.24 | 0.01 | 4.28 | 0 |
| Anchor at season 1 | 61.8 | 53.5 | 62.7 | 53.3 |
| Team overall at season 1 | 67.5 | 59.2 | 68.4 | 59.2 |
| Mean anchor over the run | 69.3 | 56.6 | 77.9 | 59.2 |
| Team overall minus target | −3.0 | +2.1 | −4.1 | +2.3 |
| Nudge signings received | 3.64 | 0.11 | 15.7 | 0.5 |
| Seasons slowed | 0.08 | 4.12 | 0.28 | 8.11 |
| Persistent weak groups (seasons) | 0.51 | 2.00 | 1.5 | 6.0 |
| In-house starter share | 93.9% | 79.4% | 71.6% | 60.0% |
| Development per season | 0.62 | 0.73 | 0.42 | 0.53 |

What separates successful clubs from struggling ones is where they started and their anchor: anchor 61.8 against 53.5, team
overall 67.5 against 59.2 in season 1. Nothing in their decisions sets them apart: they draft the same way (pick age 20.5,
potential 66–68, gap to best available 0.7–0.9) and develop at the same rate. The nudge pushes the strong clubs up, because a
gym club's anchor outgrows its roster, and slows the weak clubs whenever they rise above their low band. Struggling clubs do
carry more persistent weak groups (2.0 against 0.5 seasons), the one decision-quality difference that shows. Matched-seed
comparison: the same clubs keep their tier across seeds in proportion to their anchor (correlation 0.89), so the differences are
initial conditions and design rather than random variance or management.

## 10. Decision-making intelligence findings
Each finding is judged on what the club could see at the time (its roster, cap, the board and the market).

1. **Recognising its strongest and weakest positions: partly.**
   - Trades and free agency use `positionNeeds` and `clubNeeds`, which mostly measure depth counts. A group with no backup scores
     at least 0.25 even when its starters are excellent. Starter quality is judged against the club's own roster mean, not
     against opponents.
   - Arrivals land at a weak group 15.6% of the time; draft picks land at the top need 11.5% of the time.
2. **Starters versus backups versus prospects: starters only.** The lineup is pure best-by-overall, and no snaps go to
   development. Reserves gain about 1.5 overall over three seasons; draftees who start gain 5–10.
3. **Immediate versus future needs: immediate only.** No code looks ahead. The draft ignores roster age and expiring deals.
4. **Ageing starters: not planned for.** Every starter is re-signed at any age, and nothing retires anyone. Starter age reaches 36
   (§6E). In the aging scenario (§12), clubs whose starters were 31–33 still had a mean starter age of 31.7 six seasons later,
   against 27 for the same clubs unstressed, and won 0.5 fewer games a season.
5. **Avoiding excess depth: yes.** Surplus groups appear in 0.1% of club-seasons, and 0% of signings are at a surplus position.
6. **Reassessing after each move: yes, within free agency.** Needs are recomputed after every signing. The draft does not reassess
   needs at all.
7. **Acting on its competitive situation: no.** Contenders (6+ wins) and strugglers (≤ 3 wins) draft identically: pick age 20.5,
   potential 66.4 against 67.9. Strugglers sign more players (2.0 against 1.1 a season) only because more players leave them.
8. **Recognising a rebuild: no code path.** In the rebuild scenario, gutted clubs recovered their team overall by season 3–4
   through waivers, the pools and generated signings — the same rule as always. Recovery came from the market, not from a plan.
9. **Using available resources: partly.**
   - Median cap room is 139k (Stage B) and 115k (Stage C); 27% of club-seasons hold 200k or more.
   - 11.8% of club-seasons carry a persistent weak group with 100k+ room. Free agency stops once counts are met, and trades need
     a need of 0.25 or more.
10. **Avoiding repeated weakening decisions: no, for kickers.**
    - A club with one kicker shows a need of at least 0.25 at K. `playerValue` is position-blind. Kickers do not count in team
      overall.
    - Result: 58 kicker trades in Stage B, paid with 51 round-1 picks — the most-traded position. Example: seed 1, season 7, Ember
      City Beasts sent a season-8 round-1 and round-2 pick to Bayou Stalkers for a 67-overall kicker.
    - The 15-season RB weakness at Ashford Hawks (seed 102) persisted while cap room never fell below 109k.

## 11. Effects of competitive-balance mechanisms (Stage E, diagnostic trees)
Matched seeds 1–8, 10 seasons. These are NOT production behaviour.

| Metric | Production | no-nudge | flat-market |
|---|---|---|---|
| Spread of team overall (SD), season 1 → 10 | 3.45 → **4.71** | 3.38 → **2.15** | 3.38 → 2.24 |
| Mean SD over the run | 3.65 | 2.83 | 2.82 |
| Clubs 8+ below the league mean for 3+ seasons | 0% | 0% | 0% |
| Gym clubs' share of AI titles | 73 of 80 | 68 of 78 | 75 of 79 |
| Gym / other team overall at season 10 | 76.8 / 69.5 | 73.0 / 71.2 | 73.1 / 71.0 |
| Correlation of anchor with wins / with team overall | 0.55 / 0.92 | 0.43 / 0.81 | 0.47 / 0.81 |
| Persistent losers / unrecovered | 35.8% / 40.3% | 35.0% / 39.3% | 34.2% / 31.0% |
| In-house starters at season 10 | 69% | **94%** | 94% |
| Generated starters at season 10 | 10% | 0.7% | 1% |
| Mean starter age at season 10 | 30.2 | **31.5** | 31.6 |
| Owner win rate | 53.2% | 56.7% | 59.0% |
| Integrity problems | 0 | 0 | 0 |

**What the mechanisms do:**
- **The nudge widens the league rather than narrowing it.** It boosts clubs below their band — in practice gym clubs, whose anchor
  grows 1.5 a season — and slows clubs above it, usually the low-anchor clubs. Without it, the spread shrinks to about half by
  season 10. No club collapses: no club sat 8 or more below the mean for 3 seasons in any variant.
- **It is not compensating for poor AI decisions.** Removing it creates no failing clubs. What changes is that clubs keep their
  own monsters (94% in-house starters).
- **It masks the ageing problem.** Its generated signings (age 24–30) are what bring the starter mean age down from 31.5 to 30.2.
  Without them, the cohort ages faster.
- **Gym dominance persists without the nudge** (68 of 78 titles). It comes from the gym clubs' stronger starting rosters and their
  protected legendaries, not from the nudge alone.
- **The per-club target in the free-agency market barely matters** (flat-market ≈ no-nudge).
- **Protected monsters** (legendaries and rival signatures) were never moved, released or re-signed. They are ageless and
  cap-exempt, as designed (decisions T, U, V). **The runaway-veteran rule** accounts for 97% of starter departures at contract
  time.

The balance threshold (spread changes by 50% or more) is crossed at season 10 only (4.71 against 2.15) and not on the run mean
(−22%). It is reported as provisional.

## 12. Stress scenarios (Stage D)
Each scenario stresses 3 clubs per seed over 5 seeds and 6 seasons, compared with the same clubs in Stage B.

| Scenario | Season-1 effect (stressed vs base) | Recovery | Notes |
|---|---|---|---|
| aging (starters 31–33) | wins 3.6 vs 3.6 | wins −0.5/season across 6 seasons (3.29 vs 3.81); starter age stays 31–32 (base 24–27) | no succession: the old core is re-signed and decline is mild |
| expiring (every deal ends after season 1) | roster 32.3 vs 35.6 at season end | refilled to 38 in the next offseason (generated 82 vs 40, pools 62 vs 31) | rosters then oscillate 38 → 34 → 38 → 34 because every new deal is 2 years (synchronised expiries) |
| thin (no QB, OL, CB, S backups) | backups 1.5 vs 6.7; no lineup failure | backups back to 7.1 after one offseason | free agency fills counts; it oscillates again at season 3 (2-year deals) |
| injuries (5 best starters out 4–6 weeks) | wins 2.93 vs 3.60 | equal from season 2; no lineup failure | in-season cover works |
| rebuild (6 best starters released) | wins 2.60 vs 3.60; team overall −2.1 | team overall back by season 3–4, wins by season 4–5 | waivers 88 vs 39, pools 52 vs 31, generated 73 vs 40, 5 nudge signings |
| picks (3 extra round-1 picks) | 131 round-1 picks vs 78 | 43 of 60 extra round-1 picks start 5 seasons later (draft year 1, when classes are still competitive) | extra picks were used, not traded away (the 15 stressed club-runs made 3 pick-paying trades in seasons 1–2) |

There were no integrity problems in any scenario.

## 13. Confirmed weaknesses, ranked
**AI strategy weaknesses** (Task 5, Task 6 or future):

| Rank | Weakness | Severity | Evidence | Category |
|---|---|---|---|---|
| 1 | No succession planning, no retirement: starters age to a mean of 36 by season 20, and the nudge masks it | **High** | §6E, §11, aging scenario | Task 6 (planning) + owner decision (retirement mechanic) |
| 2 | The draft rarely produces starters (17% of round-1 picks after 2 seasons, falling to 3% immediate starters by year 20); needs and age are ignored | **High** | §6B, `draft-picks.csv` | Task 6 (needs and age) + owner decision (class quality does not scale) |
| 3 | Reserves and prospects do not develop (+1.5 over 3 seasons; no developmental snaps) | **Medium** | §6F | Task 6 (lineup and development policy) |
| 4 | Position-blind trade valuation: kickers are 14% of trades, paid with 51 round-1 picks | **Medium** | §6D, `trades.csv` | Task 5 (valuation) |
| 5 | In-season AI trade and signing windows almost inert (2 trades and 19 signings in 200 seasons) | **Medium** | §6C–D | Task 5 |
| 6 | Free agency fills counts, not quality: persistent weak groups with cap room (11.8–13.2%, below threshold), streaks up to 15 seasons | **Low** | §6A, §10.9 | Task 6 |
| 7 | No situational strategy (contend versus rebuild identical) | **Low** | §10.7–8 | Task 6 |
| 8 | Synchronised 2-year contracts cause roster oscillation after a cliff | **Low** | expiring and thin scenarios | Task 6 / future |

**Data-integrity defects:** none.

**Intentional, owner-approved mechanisms (not defects; see §17):**
- gym clubs' title monopoly and the persistent losing clubs (anchor design, decision C);
- the runaway-veteran rule (decision A);
- protected monsters (decisions T, U, V);
- the nudge widening the spread (decision C).

## 14. Reproducible evidence per weakness
| # | Reproduce | What to look for |
|---|---|---|
| 1 | `--seeds=101-105 --seasons=20`, then `summary.json → C.aging.byYear`, `C.development.byYear` | `starterAge` 23.6 → 36.1; in-house starters 100 → 41%; no-nudge variant age at season 10 = 31.5 |
| 2 | `draft-picks.csv`; `summary.json → B.draft.contributionByRoundHorizon["1\|2"]` = 17%; the Stage C draft-year gap table above | round-1 `wouldStart` 48% → 3% across years 1–20 |
| 3 | Stage B `draftOutcome` joined to `draft-picks.csv` (§6F) | non-starter draftees +1.2–1.6 after 3+ seasons |
| 4 | `trades.csv` filtered to `toAPos=K` | 58 rows in B with 51 round-1 picks; e.g. seed 1, year 7, Ember City Beasts |
| 5 | `trades.csv` with `week>0`; `summary.json → B.arrivals.byPhase` | 2 in-season trades and 19 in-season signings in 200 seasons |
| 6 | `club-seasons.csv` (`weakGroups`, `capRoom`) | seed 102, Ashford Hawks, RB weak from season 6 to 20 |
| 7 | `summary.json → B.decisions` | identical draft profile for contenders and strugglers |
| 8 | `D-expiring` and `D-thin` runs (`--scenario=expiring`) | roster size 32 → 38 → 34 → 38 → 34 → 38 |

## 15. Systems functioning correctly (preserve)
- **Integrity and determinism:** 640 seasons, 0 violations, exceptions or save round-trip changes; byte-identical re-runs.
- **Legal rosters and the cap at every season start;** validation (`validateClubs`, `verifyLeague`).
- **Free agency by need count:** no surplus signings; depth restored after one offseason (thin scenario); affordable.
- **In-season injury cover:** injury scenario with no lineup failure and recovery by season 2.
- **AI–AI offseason trades:** fair by the owner's band (median 1.03); 81% fill a starter hole; protected and rookie-deal monsters
  never moved.
- **Protected monsters:** never moved, released or aged, as approved.
- **Rebuild recovery through the market:** a gutted club is competitive again by season 3–4.
- **Draft execution:** best available is taken (median gap 1), with almost no duplicates or kicker reaches. The weakness is what
  the draft values, not how it is executed.
- **The balance targets** hold the league to today's difficulty curve (team overall within about 1 of target on average), as
  designed.

## 16. Recommended priorities

### Task 5 — Trading Second Pass (Sonnet 5.5; trading scope only)
| # | Change | Problem and evidence | Root cause and files | Expected effect | Complexity | Regression risk | Validation |
|---|---|---|---|---|---|---|---|
| T5-1 | Positional value in trade valuation (kickers, and optionally QB scarcity) | Kicker trades are 14% of trades, with 51 round-1 picks (§6D) | `trades.js playerValue` (position-blind), `positionNeeds` (K need ≥ 0.25 with one kicker) | Kicker trades fall to the margin; picks are spent on positions that move team overall | Low | Low–Medium: the owner's asks and the AI's calls use the same values (needs owner sign-off, §17) | Re-run Stage B: kicker share of trades and round-1 picks spent on K; owner trade-offer tests |
| T5-2 | Make the in-season window able to act: allow need-for-need swaps, or let a full club release a spare to take a player | 2 in-season trades in 200 seasons (§6D) | `league-trades.js attempt`: picks route needs roster < 38; AI rosters are full mid-season | About 1–2 in-season deals a season, as GDD §46.5 intended | Medium | Medium: mid-season roster churn, League News volume | Stage B in-season trades per season; weekly invariants |
| T5-3 | Hindsight report on owner–AI trades (not changed here) | Not measured: the benchmark owner never trades | — | Baseline for Task 5's owner-facing work | Low | None | Add an owner trade policy to the harness |

### Task 6 — AI Franchise Intelligence (Opus 5.5)
| # | Change | Problem and evidence | Root cause and files | Expected effect | Complexity | Regression risk | Validation |
|---|---|---|---|---|---|---|---|
| T6-1 | Succession planning: weigh age and decline at contract time (stop automatically re-signing ageing starters when a younger option exists); age-aware needs | Starter age 36 by season 20; aging scenario never rejuvenates (§6E, §12) | `league-season.js leagueContracts` (any-age starter retention), `clubNeeds` / `positionNeeds` (no age term) | Starter age stays near the late-20s; less reliance on nudge veterans | Medium | Medium: the balance calibration (the nudge, LIFT_SHARE) was tuned against current behaviour; re-measure the target bands | Stage C: starter age by season, in-house starter share, team overall against target, owner win rate within ±5 of today |
| T6-2 | Need- and age-aware drafting (blend best available with the club's needs and ageing groups) | 46.6% of picks at need 0; 11.5% at the top need (§6B) | `draft.js aiDraftPick` | More picks fill real future holes; better retention | Low–Medium | Low: the owner's draft position is unaffected; class quality is unchanged | Misaligned % (< 15%), round-1 starter rate at 2 and 5 seasons |
| T6-3 | Developmental playing time: package snaps or garbage-time rotation for prospects, so reserves gain XP | Reserves +1.5 over 3 seasons (§6F) | `roster.js buildDepthChart` (strongest only); `progression.js afterGame` (XP only by slot) | Draftees grow into starters; the in-house share holds | Medium | Medium–High: affects game results and the balance calibration; the owner's lineup logic must not change | Draftee overall growth by status; team overall against target; win distributions |
| T6-4 | Quality-aware free agency: upgrade a persistently weak starter when cap room allows, not only fill counts | Persistent weak groups with room 11.8–13.2%; streaks to 15 (§6A) | `league-season.js leagueFreeAgency` / `clubNeeds` (count-based) | Fewer multi-season holes | Low–Medium | Medium: cap usage rises and pool supply shrinks for the owner | Persistent-weak-with-room % (< 5%); owner market size |
| T6-5 | Situational strategy: contend or rebuild mode affecting draft (youth and upside), contracts and trades | Contenders and strugglers behave identically (§10.7) | No code path (new decision layer reading record, age and anchor) | Visible club identities; more natural recovery | High | High: interacts with the nudge and the anchor | Recovery time, dynasty duration, owner win rate |
| T6-6 | Staggered contract lengths (1–2 years by age and value) | Synchronised cliffs and oscillation (§12) | `league-season.js` (`newContract(year, 2)` everywhere) | Smoother rosters | Low | Low | Expiring-scenario roster-size variance |

### Future development (outside Tasks 5 and 6, needs owner approval)
- **A retirement mechanic** (age or decline based) for every persistent monster. Today there is none (§3).
- **Draft class quality that scales with the league's growth** (the gap reaches 21 overall by season 20).
- **A review of the anchor design** (gym growth and per-club offsets) if a more open title race is wanted (§17).

## 17. Unresolved questions requiring owner approval
1. **Gym monopoly.** The anchor design gives the eight gym clubs 96% of AI titles and leaves a third to a half of clubs as
   persistent losers. Is that the intended experience? This is approved design (decision C, gym growth §15.3), so changing it
   needs a design decision, not an AI fix.
2. **Retirement.** Should persistent monsters retire? There is no mechanic today. T6-1 can reduce ageing through contract
   decisions alone, but a true retirement rule is a new game rule.
3. **Draft class quality.** Should classes scale with league growth? Today they cannot keep pace, for the AI and the owner alike.
4. **Nudge interaction.** Any Task 6 change that keeps clubs younger or stronger will interact with the calibrated nudge, the
   runaway-veteran rule and LIFT_SHARE (decisions A and C). Re-calibration should be authorised as part of Task 6.
5. **Positional trade value (T5-1).** This touches the values the owner's own trade offers use. Is a change to those values
   approved, or should it apply to AI–AI trades only?
6. **Developmental snaps (T6-3).** This changes who plays in AI games. Is a small win-probability cost for AI clubs acceptable in
   exchange for development?

## 18. Limitations and confidence
- **One difficulty (Pro) and one owner policy.** A trading or active owner, and Rookie or All-Star, were not benchmarked.
  Confidence in AI-only findings is high; owner-interaction findings (owner–AI trades) are untested.
- **The "starter" definition** is best-by-overall at each position (the AI's own notion). The ageing threshold uses the mean
  starter age, a proxy, because individual starter ages were not recorded.
- **Draft contribution** is measured at each run's end, by horizon since the draft, not season by season per draftee. Horizons
  of 6+ seasons pool several draft years.
- **Trade valuation** is read at the first weekly check after the deal (ratings do not change in between). Positional need is not
  recomputed for the pre-trade roster.
- **Stage D and E samples are smaller** (5 or 8 seeds), so their thresholds are reported as provisional.
- **Correlations are not causation.** The decision findings rest on code paths plus behaviour, not on outcomes alone.

**Confidence by finding:**

| Finding | Confidence | Basis |
|---|---|---|
| Ageing and no succession | High | Measured in B, C, D and E; code confirms |
| Draft contribution | High | B and C, with a mechanism |
| Reserves not developing | High | Code plus measurement |
| Kicker valuation | High | 96 trades across B and C; code confirms |
| In-season windows almost inert | High | Code plus measurement |
| Free-agency quality gaps | Medium | Below threshold |
| Situational strategy | Medium | Inferred from identical behaviour plus code |
