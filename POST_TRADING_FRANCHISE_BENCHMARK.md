# Post-Trading Franchise Benchmark (Task 5.5)

Diagnostic only. No gameplay, AI behaviour, trading rule, draft generation, progression, retirement, balance value, save schema or
published file was changed. The plan is `docs/POST_TRADING_BENCHMARK_PLAN.md`, including its execution record, which was committed
before any result of this checkpoint was read. Its thresholds come from `docs/TRADING_SECOND_PASS_PLAN.md` (T1–T15) and
`docs/AI_FRANCHISE_BENCHMARK_PLAN.md` (Task 4); none was changed. Every figure below is reproducible from `docs/post-trading-benchmark/`
(see §3).

## 1. Executive summary

**Question.** Did Task 5's trading second pass measurably improve long-term AI franchise management, and which Task 4 weaknesses remain
for Task 6?

**Answer.** Yes for what trading touches, and no for the structural weaknesses Task 4 ranked highest.

**What trading improved.** Figures are 60 matched seeds × 10 seasons unless stated; the interval is a bootstrap 95% interval over seeds.
- **Fewer persistent weak groups.**
  - Club-seasons that carry the same weak group into the next season: 14.6% → 11.9% (paired −2.7 points [−4.2, −1.2]).
  - The same with 100k+ cap room: 12.0% → 9.8%.
  - Over 20 seasons (seeds 106–110): 23.3% → 16.5%.
  - On seeds 1–8 the effect is the same size with the balance nudge switched off as with it on (−5.1 points [−9.7, −0.8] against −5.6 [−9.8, −1.5]), so it comes from trading, not the balance machinery.
- **Better trades on measures independent of the valuation.** Each deal was compared with its own undoing at the same moment, using plain ratings:
  - deals with no lineup gain: 16.4% → 8.5%;
  - deals gaining 4+ lineup points: 53% → 70%;
  - a weak group the buyer had was resolved by the deal in 76% of cases (47% before);
  - acquired monsters still starting for the buyer a season later: 74% → 85%;
  - sellers never lost 4+ lineup points.
- **Kicker misuse gone.** Kickers fell from 15.4% to 2.7% of deals, and first-round picks spent on kickers from 147 to 4.
- **Draft capital kept.**
  - First-round picks traded away: 14.4 → 4.2 per seed.
  - Club-drafts with no first-round pick: 9.6% → 2.7%.
  - Struggling clubs with no first-rounder: 16.1% → 3.6%.
  - Clubs ever without a first-rounder in two drafts running: 15.1% → 0.9%.
- **The in-season window works within the deadline.**
  - 0.02 → 0.97 deals a season, with a lineup gain of 4+ in 92% of them.
  - No deadline rush: week 8 carries 9.5% of in-season deals. No deal and no offer was found after week 8.
- **Slightly stronger, younger lineups.** Team overall +0.17 [+0.10, +0.24]; starter age in the last season −0.2 years.

**What trading did not change** (Task 4 weaknesses 1–3 and 6–8):
- **Ageing:** starters still average 35.1 years by season 20 (35.6 before).
- **Draft:** round-1 picks still rarely become starters. Over 20 seasons, 8% of round-1 picks start for their club two seasons later, unchanged.
- **Development:** reserves still gain about 1.5 overall over three seasons.
- **Contracts:** the same rules, with the same synchronised expiries.
- **Situational strategy:** none. Strugglers and contenders trade alike.
- **Competitive balance:** gym clubs win 95–99% of AI titles; persistent losers 38% → 40%, within noise.
- **Rebuilding:** recovery is no faster (median 2 seasons in 10-season runs, 3 in 20-season runs).

**New concerns:**
1. **Production defect D1.** The offer a club may make "as the offseason opens" is never attempted in v42.17.0. v42.16.0 attempted it every season.
2. **Incoming offers stop after season 2.** The benchmark owner received 130 offers in seasons 1–2 and 5 in seasons 3–20 (570 franchise-seasons). v42.16.0 gave 62 in the later seasons. The cause is roster-room gates in the new offer builder.
3. **Fewer young successors.** AI deals pay with young spares, so starters aged 30+ have a ready young successor less often: 21.4% → 17.6% (paired −3.8 [−4.8, −2.9]), and on every sample.
4. **Small side effects:**
   - The balance nudge now slows more clubs: +3.3 points of club-seasons.
   - 2.5% of traded monsters move again within a season.
   - The 20-season sample shows fewer distinct champions (7 → 5). This is provisional: there are only 5 seeds, and the 60-seed sample shows no change.

**Task 6 should address, in order:**
1. succession planning (contracts and age-aware needs);
2. need- and age-aware drafting, which now matters more because clubs keep their first-round picks;
3. protecting young successors when clubs pay for trades;
4. developmental playing time;
5. quality-aware free agency;
6. situational strategy.

D1 and the incoming-offer design are trading-system follow-ups for the owner to decide, not Task 6 work. Section 13 lists the decisions the owner must make first.

## 2. Exact version comparison
| | Baseline (pre-trading) | Post-trading |
|---|---|---|
| Build | v42.16.0-run-game | v42.17.0-trading-second-pass (published, artifact version 115) |
| Commit used | `db7c0c6`: the v42.16.0 game code; PR #81 added tooling only | `fc19d34`: PR #82 merged at `68267c6`, release stamp `ca1266b`, manifest |
| Difference in `src/` | — | 9 files, trading only: `trade-desk.js`, `trade-value.js`, `trade-window.js` (new), `franchise.js`, `league-trades.js`, `trades.js`, `ui/screens/hq.js`, `ui/trade-desk-ui.js`, `version.js`. No football-engine, draft, progression, contract or balance file differs |
| Harness | `tools/ai-franchise-benchmark.mjs` v3 (`a0df7d5`, this branch), run from its own frozen copy for both trees, `--root` pointing at each tree | same |
| Runtime | Node v22.22.0, Linux container, 2 cores | same |
| Rules | Pro difficulty, one tier, 16 clubs (15 persistent AI clubs plus the owner) | same |
| Owner policy | The soak's hands-off owner: staff run the week; every contract re-signed; best prospect at each pick; cheapest free agents to the minimum; never trades; never answers a call. A dismissed owner is reinstated (simulation only) | same |

**Reproduction checks:**
- The baseline tree reproduces the stored Task 4 results exactly: every Stage B summary figure, for example 407 trades, 12,792 arrivals, 14,244 departures, persistent losers 35.3% and owner win rate 57.8%.
- The released tree reproduces Task 5's own final benchmark exactly: 1,600 club-season rows over seeds 1–10 × 10 seasons; 3.27 deals a season and 183 in-season deals on seeds 1–20.
- So the Task 4 report stays the historical baseline, and Task 5's results describe the build that was published.

## 3. Methodology and reproducibility

**Samples (both trees, matched seed for seed):**

| Stage | Seeds | Seasons | Role |
|---|---|---|---|
| B 21–40 | 21–40 | 10 | The plan's main sample. Disclosure: Task 5 ran these seeds once to confirm its final design, so they are not unseen; nothing was tuned on them |
| B 1–20 | 1–20 | 10 | Matched with Task 4 and Task 5 |
| B 41–60 | 41–60 | 10 | Added: never run before, an unseen confirmation |
| C | 106–110 | 20 | Long-run sustainability. Genuinely fresh: Task 5's 20-season stage used 101–105. Its results document said 106–110; corrected on this branch |
| D | 1–5 | 6 | The six Task 4 stress scenarios: aging, expiring, thin, injuries, rebuild, picks |
| E | 1–8 | 10 | The no-nudge variant of each tree (`tools/ai-benchmark-variant.mjs`), to separate trading from the balance nudge. Not production behaviour |
| P | 1–2 | 3 | Determinism and timing: each tree twice, run alone |
| O | 51–55 | 1–3 | Owner trading scenarios, the incoming-offer probe and funnel, save compatibility |

In all, 1,920 simulated seasons (960 per tree), plus Stage P and the probes.

**Harness v3 (recording only).** It reads the franchise between the game's own steps, through `tools/franchise-soak.mjs runFranchise`, which is the production lifecycle. It adds:
- each deal's cap room before and after, and depth at the position on both sides;
- each deal measured against its own undoing at the same moment (lineup points and the position's starters, for both clubs);
- what became of every traded monster, season by season;
- first-round selections, read from the drafts themselves;
- starter and backup ages;
- a pick-ownership integrity check;
- incoming offers to the owner.

Non-interference: every value the v2 harness records is identical under v3 (24,000+ values compared, both trees).

**Pilot.** Repeated runs were identical. Cost was about 17.6 s per simulated season per lane, so the whole plan was affordable.

**Measures that do not use the valuation that approved the deals:**
- Lineup points: the sum of the starters' overalls, best by overall.
- Deal versus its undoing: rosters at the first check after the deal, with and without it. Without this, offseason deals would be credited with the draft, free agency and nudge that run between the check before them and the check after.
- Weak group: Task 4's rule (group mean 6+ below the club's starter mean, or fewer players than slots).
- Weak response: whether a weak group was resolved by the next season end, by whether the club received a monster at that position by trade.
- Draft capital: first-round selections per club per draft.
- Succession cover: a starter aged 30+ (not protected) with a backup aged 26 or younger within 8 overall.

**Statistics.** Paired per-seed differences, with a bootstrap 95% interval (2,000 resamples, generator seed 55, deterministic). Each paired cell also shows how many seeds moved up and how many moved down.

**Reproduce:**
```
git worktree add --detach B db7c0c6 ; git worktree add --detach N fc19d34
tools/post-trading-benchmark.sh --out=RUN --tree=base=B,t55=N --valuation=N/src/franchise/trade-value.js --B=21-30,31-40 --C=106-108,109-110 --stages=B,C
tools/post-trading-benchmark.sh --out=RUN --tree=base=B,t55=N --valuation=N/src/franchise/trade-value.js --B=1-10,11-20 --D=1-5 --stages=B,D
tools/post-trading-benchmark.sh --out=RUN --tree=base=B,t55=N --valuation=N/src/franchise/trade-value.js --B=41-50,51-60 --stages=B
node B/tools/ai-benchmark-variant.mjs --variant=no-nudge --out=VB ; node N/tools/ai-benchmark-variant.mjs --variant=no-nudge --out=VN
node tools/ai-franchise-benchmark.mjs --root=VB --seeds=1-8 --seasons=10 --valuation=N/src/franchise/trade-value.js --json=RUN/base-E-nonudge-1-8.json   # and VN → t55-E-…
node tools/post-trading-analyze.mjs --dir=RUN --base=base --new=t55 --out=OUT            # summary.json and the CSVs
node tools/post-trading-tables.mjs --summary=OUT/summary.json > OUT/tables.md             # every table in this report
node tools/trade-benchmark-compare.mjs --dir=<one sample's files> --base=base --new=t55 --md=T.md   # T1–T13
node tools/save-compat-check.mjs SAVE.json … --root=N ; node tools/offseason-call-check.mjs --root=B|N
node tools/incoming-offer-probe.mjs --root=N --seeds=51-55 --seasons=2 ; node tools/offer-funnel.mjs --root=N --out=SCRATCH --seed=21
(cd N && node tools/owner-trading-scenarios.mjs --seeds=51,52,53,54,55 && node tools/trade-perf-check.mjs)
```

**Results** (`docs/post-trading-benchmark/`):
- `summary.json`: every metric, per sample and tree;
- `tables.md`: the full tables;
- `trades.csv`: 4,150 deals with every measure;
- `club-seasons.csv`: 23,400 AI club-seasons;
- `calls.csv`: incoming offers;
- `paired-seeds.csv`: per-seed metrics;
- `thresholds/*.md|json`: T1–T13 per sample;
- `run-hashes.json`: every run's hash, plus Stage P;
- `probes/`: saves, offers, the funnel, owner scenarios and performance.

## 4. Matched-seed results

### Pre-registered thresholds (T1–T13), by sample
| | B 21–40 | B 1–20 | B 41–60 | B pooled (60) | C (20 seasons) |
|---|---|---|---|---|---|
| T1 integrity | pass | pass | pass | pass | pass |
| T2 lineups, cap, rosters | pass | **fail** (season-end lineup problems 23 → 38) | pass | **fail** (77 → 90) | **fail** (lineup 22 → 26; over the cap at season end 18 → 11: the rule wants zero, so both trees fail it, as in Task 4) |
| T3 kickers | pass | pass | pass | pass (147 → 4 first-round picks) | **fail** (4 first-round picks for kickers in 5 seeds) |
| T4 fairness | pass | pass | pass | pass | pass |
| T5 shoppers improve | pass | pass | pass | pass | pass |
| T6 sellers do not lose | pass | pass | pass | pass | pass |
| T7 in-season | pass | pass | pass | pass | pass |
| T8 volume ≤ 1.5× | **fail** (1.56×) | **fail** (1.61×) | **fail** (1.63×) | **fail** (1.60×) | **fail** (1.58×) |
| T9 consequences | pass | pass | pass | pass | pass |
| T10 weak groups with cap room | pass | pass | pass | pass | pass |
| T11 competition | pass | **fail** (persistent losers +4.0; max title share 0.7 → 0.8) | pass | pass | **fail** (distinct champions 7 → 5; persistent losers 52.0% → 54.7%, above base + 2) |
| T13 performance | pass | pass | pass | pass | pass (Stage P below) |

**Reading the fails:**
- **T8** is the volume exception the owner accepted. The whole excess is the in-season window, about 0.95 deals a season, and offseason volume is 1.14× baseline.
- **T2:** paired, the season-end lineup problems are +0.22 per seed [−0.27, +0.70], within noise. Season-start lineups are clean in both trees.
- **T3 in C** repeats Task 5's marginal fail. The four cases are all elite kickers (74–82 overall), against 37 before.
- **T11:**
  - Persistent losers on seeds 1–20: +4.0 [+0.3, +8.0], but 0.0 on seeds 21–40 and +0.3 on seeds 41–60; pooled +1.4 [−1.4, +4.3]. In C: +2.7 [−5.3, +10.7].
  - Max title share on seeds 1–20: 0.7 → 0.8 (the seed-level paired difference is −0.06 [−0.13, +0.02]).
  - Distinct champions in C: −1.2 [−2.2, −0.4] on 5 seeds, against +0.05 [−0.33, +0.42] on 60 seeds.
  - Both are reported as provisional and unconfirmed rather than explained away.

The T1–T13 rows are in `thresholds/*.md`. T14 (owner scenarios) and T15 (gameplay untouched) are covered in §11.

### Paired differences, t55 − base (mean over seeds, [95% interval], seeds up/down)
| Measure | B pooled (n=60) | C (n=5, 20 seasons) | E no-nudge (n=8) |
|---|---|---|---|
| Deals per season | 2.07 → 3.32: +1.24 [1.12, 1.36] | 2.49 → 3.94: +1.45 [1.24, 1.75] | 0.86 → 2.55: +1.69 |
| First-round picks traded per seed | 14.4 → 4.2: −10.2 [−11.1, −9.2] | 36.4 → 15.4: −21 [−24, −18] | 7.6 → 1.9: −5.8 |
| Persistent weak group (% club-seasons) | 14.6 → 11.9: −2.7 [−4.2, −1.2] (36↓ 18↑) | 23.3 → 16.5: −6.8 [−9.2, −3.9] | 13.8 → 8.7: −5.1 [−9.7, −0.8] |
| … with 100k+ cap room | 12.0 → 9.8: −2.2 [−3.5, −0.9] | 14.5 → 11.2: −3.4 [−5.4, −0.8] | 9.1 → 5.9: −3.2 [−6.3, −0.5] |
| OL persistent weak (club-seasons per seed) | 6.0 → 5.9: −0.1 [−1.3, 1.2] | 11.4 → 11.4: 0 | 5.9 → 5.8: −0.1 |
| Team overall | 68.96 → 69.13: +0.17 [0.10, 0.24] | 73.39 → 73.51: +0.12 [0.08, 0.18] | +0.37 [0.27, 0.47] |
| Team-overall SD (spread) | 3.93 → 3.84: −0.09 [−0.13, −0.05] | −0.07 [−0.20, 0.06] | −0.22 [−0.30, −0.14] |
| Starter age, last season | 30.15 → 29.95: −0.20 [−0.26, −0.14] | 35.57 → 35.07: −0.50 [−0.99, 0] | −0.20 |
| Own (original + drafted) starters, last season (%) | 68.7 → 65.0: −3.7 | 40.3 → 33.7: −6.6 | 93.7 → 88.2: −5.5 |
| Succession cover (%) | 21.4 → 17.6: −3.8 [−4.8, −2.9] (51↓ 8↑) | 12.9 → 10.7: −2.2 [−3.2, −1.3] | 25.3 → 20.9: −4.4 [−6.0, −2.7] |
| Club-drafts without a first-rounder (%) | 9.6 → 2.7: −6.9 [−7.5, −6.3] | 12.1 → 4.9: −7.2 | 5.1 → 1.3: −3.8 |
| Persistent losers (%) | 38.2 → 39.7: +1.4 [−1.4, 4.3] | 52.0 → 54.7: +2.7 [−5.3, 10.7] | 35.0 → 34.2: −0.8 |
| Distinct champions per seed | 3.97 → 4.02: +0.05 [−0.33, 0.42] | 6.6 → 5.4: −1.2 [−2.2, −0.4] | 0 |
| Gym clubs' share of AI titles (%) | 96.6 → 95.1: −1.5 [−3.5, 0.6] | 100 → 99 | 87.5 → 86.5 |
| Nudge: slowed club-seasons (%) | 16.8 → 20.2: +3.3 [2.4, 4.3] | 20.5 → 20.8: +0.3 | 0 (no nudge) |
| Owner (hands-off) win % | 59.3 → 59.1: −0.3 [−2.2, 1.6] | 37.3 → 37.1 | 56.7 → 59.9: +3.2 [0.4, 6.3] |

Each 20-seed sample is in `tables.md`. They agree in direction on every measure above except three, all near zero: OL persistent weak (−0.25, −0.30, +0.25), distinct champions (+0.45, +0.15, −0.45), and the owner's win rate (−0.17, 0, −0.67). Persistent losers keep their sign but vary in size (+4.0, 0, +0.3).

## 5. Trading intelligence findings
Pooled B, base → t55; C in brackets.

| # | Measure | Finding |
|---|---|---|
| 1 | Frequency | 2.07 → 3.32 deals a season (C 2.49 → 3.94). Per club-season: 0.14 → 0.22. At most 3 deals by one club in a season |
| 2 | In season vs offseason | Offseason 2.06 → 2.35 a season; in season 0.02 → 0.97 (C 1.34). Deal form changed: 1,188 picks-for-player and 56 swaps before; 873 swaps, 1,104 swap + pick and 13 picks-only after |
| 3 | By position acquired | Kickers 191 → 53. Bought far more often: WR 82 → 345, DL 102 → 281, CB 104 → 249, OL 118 → 235, LB 113 → 223, S 115 → 194, RB 115 → 145. Bought less: QB 130 → 112, TE 174 → 152. The mix follows starter slots rather than the kicker's old pull |
| 4 | Starter improvement | Acquired monster starts for the buyer: 84.0% → 91.8% (C 77.1% → 88.3%). Lineup points against the deal's undoing: median 4 → 5, mean 4.9 → 6.2. No gain: 16.4% → 8.5% (C 24.5% → 12.2%). 4+ points: 53% → 70%. Position starter floor: median +3 → +4 |
| 5 | Backup and depth | Buyer left with no backup at the position: 0.4% → 0%. Seller lineup falls: 0% → 0.2%, never by 4+. AI sellers sell only spares (the approved rule), so what moves is depth: 48% of the monsters sent as payment are aged 24 or under, and 11% start for the club that receives them (see §10.3) |
| 6 | Draft assets | Picks given (R1 / R2 / R3): 862 / 485 / 547 → 253 / 371 / 504. First-round picks per position fell everywhere: OL 74 → 0, DL 59 → 1, WR 58 → 3, S 81 → 4, K 147 → 4. A first-rounder now buys a QB, RB or TE (45, 76, 78) |
| 7 | Contract and cap | Salary taken on per deal: median 35,080 → 1,400 cr, because swaps balance payroll. A deal pushes the buyer under 1.5% cap room: 2.2% → 1.5% (C 23.3% → 16.0%). Season-end over the cap: 0 → 0 (C 18 → 11) |
| 8 | Shortages resolved | Deals made at a weak group: 44.7% → 30.7% (fewer, because fewer kicker and depth buys). Weak group resolved by the deal: 47% → 76%. Still weak at that season's end: 24.8% → 15.6% (C 36.4% → 14.8%). Weak groups traded for are resolved a season later 81% → 86% of the time, against 50% → 57% for weak groups left alone |
| 9 | Later seasons | Acquired monster still with the buyer at the season end: 94.9% → 98.1%. Starting for it a season later: 74.4% → 85.4%. Still there two seasons later: 73.8% → 86.0% (C 68% → 81%). Leaving within a season (T9): 12.9% → 8.7% |
| 10 | The Week 8 deadline | In-season deals by week, 2 → 8: 131, 103, 70, 78, 81, 61, 55. Front-loaded, no rush: week 8 is 9.5% (uniform would be 14%). Deals after week 8: 0. Offers alive after week 8: 0 |

**More trades are not automatically better trades, so each deal was also checked.**
- The 5.4% of in-season deals that show no lineup gain all had a positive starter-floor gain at the deal itself, measured by the game's own availability rule. They cover a long-injured starter, which the best-by-overall measure cannot see.
- 9.9% of offseason deals show no gain. In 132 of those 139, the acquired monster was a starter at the deal but no longer by the season start. Trades run before free agency and the nudge, so a later signing or a returning starter displaced him. Before Task 5 the same figure was 16.5%.
- Valuation-independent measures agree with the valuation's own: the deals help the buyer and do not hurt the seller.

**Churn.** 101 monsters were traded again in the same or the next season (2 before), 2.5% of the 3,958 traded monsters.
- 70 of them arrived first as swap payment and were then traded on.
- 7 went back to the club they came from.
- 21 were traded twice within the same season.

AI–AI deals have no flip lock; the owner's desk has one.

## 6. Roster and franchise sustainability findings
| Area | Base → t55 (pooled B; C in brackets) | Reading |
|---|---|---|
| Persistent weak groups | 14.6% → 11.9% (23.3% → 16.5%); longest streak 9 → 8 (17 → 14) | Improved by trading, and still present: about one club-season in ten carries a weak group forward while it has cap room |
| Starters and backups | Starter mean +0.15; backup gap unchanged (13–18 overall) | Better starters through trades; depth quality unchanged |
| Draft-pick contribution | Round-1 picks starting 2 / 5 / 6+ seasons later: 20.3 / 30.7 / 33.0% → 24.3 / 26.9 / 33.4%. C at 2 seasons: 8% → 8% | Unchanged; the first two figures move in opposite directions. The draft rules decide this, not trading |
| Ageing starters | Starter age by season 1 / 5 / 10 / 15 / 20 (C): 23.6 / 26.7 / 29.9 / 33.0 / 35.6 → 23.6 / 26.8 / 29.8 / 32.7 / 35.1. Starter slots held by a 33+ starter: 32.2% → 30.5% (C) | Essentially unchanged: no succession planning |
| Contract decisions | Contract-time departures that were starters 15.8% → 17.4%; departures by walking 35,551 → 37,274, releases 6,204 → 5,099 | Same rules. Fewer releases, because swaps do not add bodies the way picks-for-player deals did |
| Prospect development | Returning monsters +0.7 a season in both; round-1 draftee reserves +1.6 → +1.5 after 3+ seasons; round-1 starters +9.8 → +10.0 | Unchanged |
| Free-agency effectiveness | Non-draft arrivals at a weak group 15.0% → 13.3%; who start 46.7% → 45.8%; pool and waiver signings 8,876 → 9,556 | Free agency resolves more of the weak groups trading did not touch (signed starters: 27% → 34% of weak groups), because swaps leave roster spots open |
| Rebuilding speed | Median seasons from ≤ 2 wins to ≥ 5 wins: 2 → 2 (3 → 3); never recovered: 47.8% → 46.7%. Rebuild scenario: the same team-overall recovery by season 3–4 | Not faster |
| Long-run sustainability (C) | Own starters at season 20: 40.4% → 33.8%; generated and waived veterans and traded monsters fill the rest | Trading replaces part of the nudge's veterans with traded starters; the in-house share falls further |
| Competitive balance | §7 | Unchanged |
| Persistent losing clubs | 38.2% → 39.7% (52.0% → 54.7%), within noise | Unchanged: set by the anchor |

## 7. Changes in competitive balance
- **Gym dominance is unchanged.** Gym clubs win 96.6% → 95.1% of AI titles (C 100% → 99%), with 53% of club-seasons. The anchor correlates with wins at 0.58 → 0.56.
- **The spread narrows slightly.** Team-overall SD −0.09 [−0.13, −0.05].
  - Matched clubs: the initially weakest quarter gains +1.15 win points and +0.38 team overall; the strongest quarter −0.74 win points and 33 fewer titles over 60 seeds.
  - The changes are small against a club-to-club spread of 7.4 win points.
- **Title concentration is mixed and within noise.**
  - Max title share: 0.49 → 0.47 on 60 seeds.
  - Distinct champions: unchanged on 60 seeds, 7 → 5 on the 5 twenty-season seeds (4 of 5 seeds fell). The latter is the one balance signal against trading. It is not seen on the 60-seed sample, so it needs more 20-season seeds before it is treated as real.
- **The nudge absorbs part of the gain.** Slowed club-seasons rise by 3.3 points: clubs that trade above their band develop at reduced XP. The nudge's signings are unchanged (−0.01 a club-season).
- **No strength anchor or nudge value was touched.**

## 8. Task 4 weaknesses resolved or improved
| Task 4 rank | Weakness | Task 4 | Task 5.5 | Verdict |
|---|---|---|---|---|
| 4 | Position-blind trade valuation (kickers) | 14% of trades; 51 first-round picks on 20 seeds | 2.7% of deals; 4 first-round picks on 60 seeds | **Resolved** |
| 5 | In-season trade window inert | 2 trades in 200 seasons | 0.97 a season, 92% with a 4+ lineup gain, within weeks 2–8 | **Resolved** (in-season signings were not targeted and are unchanged) |
| 6 | Persistent weak groups with cap room | 11.8% (seeds 1–20) | 9.7% on the same seeds; pooled 12.0% → 9.8% (−2.2 [−3.5, −0.9]) | **Improved**: about a fifth less, not gone |
| — | Draft capital lost through trades | 9.7% of club-drafts without a first-rounder (seeds 1–20) | 2.6% on the same seeds; pooled 9.6% → 2.7% | **Improved** |
| — | Old or short-lived trade acquisitions | Leaving within a season 12.9%; 31+ acquired 11.4% | 8.7%; 5.2% | **Improved** |

## 9. Task 4 weaknesses unchanged
| Task 4 rank | Weakness | Evidence now | Structural or decision? |
|---|---|---|---|
| 1 | No succession planning or retirement | Starter age 35.1 by season 20; 33+ starters hold 30.5% of slots in C; succession cover lower (§10.3) | Both. The retirement and ageing rule is a reserved design decision. The any-age re-signing in `leagueContracts` is an AI decision |
| 2 | The draft rarely produces starters | Round-1 starting 2 seasons later: 24% over 10 seasons, 8% over 20; misaligned picks 24.5% | Both. Class quality does not scale (reserved decision). Best-available drafting that ignores needs and age is an AI decision (`draft.js aiDraftPick`) |
| 3 | Reserves and prospects do not develop | Reserves +1.5 after 3+ seasons; development +0.7 a season | Decision and design: XP goes only to depth-chart slots (`progression.js afterGame`, `roster.js buildDepthChart`) |
| 6 (rest) | Free agency fills counts, not quality | 9.8% persistent weak with room; OL unchanged (§10.5) | AI decision (`leagueFreeAgency`, `clubNeeds`) |
| 7 | No situational strategy | Strugglers and contenders buy monsters of the same age (median 24 against 25) and pay the same (0.14 against 0.13 first-round picks a deal) | AI decision (no code path) |
| 8 | Synchronised two-year contracts | Expiring scenario roster sizes 32.7 → 38 → 33.2 → 38 → 33.4 → 38, as before | AI decision (`newContract(year, 2)` everywhere) |
| — | Gym monopoly, persistent losers | §7 | Structural: anchor design, reserved |

## 10. New weaknesses or regressions

### 10.1 Production defect D1: the offseason-opening offer is never attempted
- **What happens.** `franchise.js` (line 2083) calls `maybeTradeCall` as the season ends, "a club may call as the offseason opens". That runs before `s.finished = true` (line 2094). The Task 5 calendar (`trade-window.js`, line 29) reads that moment as the postseason (`inPlayoffs` is true), so calls are closed and nothing is attempted. An instrumented copy shows the calendar at that point as `{ finished: false, inPlayoffs: true, phase: 'postseason', calls: false }`.
- **Evidence.** `tools/offseason-call-check.mjs`, seeds 51–53 × 2 seasons: v42.16.0 attempts 6 of 6; v42.17.0 attempts 0 of 6. Across the benchmark, offseason offers went from 8 to 0.
- **Impact.** It touches only the owner. No integrity, save or AI–AI effect. It matters more because of §10.2: in the offseason, clubs' rosters have room, and the offer builder finds an offer at 21 of 22 offseason points probed.
- **Fix (not made).** Make the call after the season is marked finished, or let the calendar treat an open offseason as open during the final playoff step. It needs a regression test for one offseason call per season.

### 10.2 Incoming offers stop after the second season
- **What happens.** The benchmark owner received 130 offers in seasons 1–2 and 5 in seasons 3–20, over 570 franchise-seasons. v42.16.0 gave 27 and 62.
- **Funnel** (`tools/offer-funnel.mjs`, seed 21):
  - **Buy offers** (the owner's spare for the club's picks) are refused every week because all 15 AI rosters are at 38 all season (`rosterFull`).
  - **Sell offers** (the club's spare for the owner's picks) are refused on value in seasons 1–2. Once the owner's roster is full they are refused as `rosterFull`. Season 3 also produced no spare that would start for the owner by 3.
  - **Swaps** never qualified.
- **With roster room.** Even with four bench monsters set aside, offers stay near zero after season 2: 1 of 18 weeks in season 2, 0 in season 3, 2 in season 4, 0 in season 5 (seeds 21–23, `probes/incoming-offer-probe-seeds21-23-5seasons.json`). On seeds 51–55 the probe found offers in 25 of 30 weeks in season 1 and 9 of 30 in season 2.
- **Cause.** The new builder offers only deals that are legal for both sides at the moment of the call, which is correct. The old one offered deals the owner might not be able to take. The cost is that offers vanish once rosters fill.
- **Status.** A design limitation, not a crash. It needs an owner decision (§13).

### 10.3 Trades consume successors
- **Measure.** Starters aged 30+ with a young successor (26 or under, within 8 overall): 21.4% → 17.6% (−3.8 [−4.8, −2.9], 51 of 60 seeds down). In C, 12.9% → 10.7%. In E, −4.4.
- **Cause.** Clubs pay for upgrades with spares (`league-trades.js attempt`, lines 72–81): 48% of payment monsters are aged 24 or under. Roster worth values a first backup at 0.45 of a starter whatever the starter's age (`trade-value.js ROLE_SHARE`), so a young backup behind a 32-year-old costs a club nothing extra to give up.
- **Status.** A strategic weakness of the trading AI that feeds Task 4's top weakness. It is not a defect.

### 10.4 Smaller effects
- **The nudge absorbs part of the gain.** Slowed club-seasons +3.3 points (§7).
- **Churn.** 2.5% of traded monsters are traded again in the same or the next season (§5).
- **Balance in C.** Distinct champions 7 → 5 and persistent losers +2.7, both provisional on 5 seeds (§4, §7).
- **T3 in C.** 4 first-round picks for kickers in 5 seeds, marginal.

### 10.5 OL: the AI recognises it more but does not resolve it
- **What the AI does.** Deals acquiring an OL: 118 → 235. First-round picks spent on OL: 74 → 0.
- **What does not change.** OL persistent weak club-seasons: 358 → 352. Weak OL groups resolved a season later: 77.6% → 71.8% when traded for, 39.5% → 42.2% when left alone.
- **Why.**
  1. **Partly an artefact of the rule.** OL is the lowest-rated starting group league-wide (starter mean 67.0 against 68.3–74.5 elsewhere). The OL group sits 2.2 below the club's own starter mean on average, so the club-relative weak rule flags OL most. 20% of weak-OL flags are OL groups at or above the league's OL mean, and the count of OL groups 6+ below the league's OL mean did not fall (788 → 830).
  2. **Arithmetic.** With 3 slots, one traded OL moves the group mean by a third of his upgrade.
  3. **By design.** In paired engine games OL is the position where a point of overall moves the score least (0.34 relative per point per slot). Market value prices it at 0.63, so other upgrades rank first in a club's search.
- **Verdict.** The AI is acting consistently with the measured value of OL. Whether OL weakness matters, and how to measure it, is a design question (§13).

## 11. Systems functioning correctly (preserve)
- **Integrity**, across 1,920 seasons, every stage and scenario, both trees: 0 of each of the following:
  - exceptions;
  - invariant problems (ids, one club per monster, registry, season-start lineups and cap, standings);
  - save round-trip changes;
  - pick-ownership errors (every pick of the next four classes, every season);
  - protected monsters moved;
  - AI–AI deals after week 8;
  - offers alive after week 8.
- **Legal rosters:** season-end roster range 27–38 (C 26–38 base, 27–38 t55). The `expiring` scenario's 25 is the known transient state between contract expiry and refill (Task 5 follow-up §1); no season starts below 26.
- **Determinism:** identical hashes on repeat for both trees (Stage P and the pilot); reproduction of Task 4 and Task 5 as in §2.
- **Save compatibility** (`probes/save-compat.json`). Four existing exports loaded in v42.17.0 and were played through the Week 8 deadline, two season boundaries, the draft and free agency, with no problems, no AI–AI deal after week 8 and an identical round trip:
  - a save from before the persistent league (schema 6, October 19);
  - two in-season saves (seasons 1 and 4, week 4);
  - an offseason save.
- **Performance:** Stage P, run alone: base 79–83 s, t55 80–84 s for 6 seasons, equal within run-to-run noise. Owner preview p95 0.53 ms (limit 50); incoming-offer build p95 34.5 ms (limit 150).
- **Owner trading scenarios (T14):** all 12 pass on 5 franchises (seeds 51–55). Scenario 3 is covered by tests rather than live.
- **Gameplay untouched (T15):** the `src/` difference between the trees is the nine trading files listed in §2.
- **Free agency by need count, injury cover, protected monsters and the balance targets** behave as in Task 4.

## 12. Recommended Task 6 priorities
Ranked by impact, then complexity and regression risk. Each needs the owner decisions in §13 first where noted.

| # | Change | Confirmed problem | Reproducible evidence | Suspected root cause | Files | Proposed improvement | Expected impact | Complexity / risk | Validation after |
|---|---|---|---|---|---|---|---|---|---|
| T6-1 | Succession planning in contracts and needs | Starters age to 35 by season 20; 30.5% of slots held by 33+ starters (C); cover falling | `summary.json → C.*.task4.aging.byYear`, `C.*.extra.succession`; C seeds 106–110 | Any-age re-signing of starters; needs and roster worth have no age term | `league-season.js leagueContracts` (line 59), `clubNeeds` (line 123); `trades.js positionNeeds` | Weigh age and decline at contract time when a younger option exists; add an ageing-group term to needs | Starter age near the late 20s; less reliance on nudge veterans | Medium / Medium: interacts with the nudge and the runaway-veteran rule (recalibration needed) | C: starter age by season, 33+ share < 15%, succession cover ↑, owner win rate within ±5, team overall against target |
| T6-2 | Need- and age-aware drafting | Round-1 picks rarely start (24% at 2 seasons, 8% in C); 24.5% misaligned. Clubs now keep their picks (2.7% without one), so the draft decides more | `draft-picks` fields in each run; `summary.json → *.task4.draft` | Best available with noise, no needs or ages | `draft.js aiDraftPick` (line 77) | Blend best available with needs and ageing groups; keep the kicker and duplicate penalties | More picks fill real holes; better retention | Low–Medium / Low: the owner's picks are unaffected | Misaligned < 15%; round-1 starting at 2 and 5 seasons ↑; persistent weak ↓ |
| T6-3 | Protect successors when clubs pay for trades | Succession cover −3.8 points from trading | `paired.Bpool.metrics.successionCoveredPct`; `payment` (48% of payment aged ≤ 24) | Roster worth values a young backup behind an old starter like any backup | `trade-value.js rosterWorth`, `ROLE_SHARE` (line 36); `league-trades.js attempt` (lines 72–81) | A succession premium in roster worth for the best young backup behind a 30+ starter (or a payment-selection rule) | Cover back to baseline or better, with the trading gains kept | Low / Low–Medium: changes which spare pays; T3–T6 must still hold | Succession cover ≥ baseline; T3–T10 unchanged; persistent weak unchanged or better |
| T6-4 | Developmental playing time | Reserves +1.5 over 3 seasons | `*.extra.draftee`; `*.task4.development` | XP only for depth-chart slots; AI plays the strongest | `roster.js buildDepthChart` (line 32), `progression.js afterGame` (line 13) | Garbage-time or package snaps for prospects in AI games | Draftees grow into starters; in-house share holds | Medium / Medium–High: changes AI game results and the calibration | Draftee growth by status; win distributions; team overall against target |
| T6-5 | Quality-aware free agency (and how OL is judged) | 9.8% persistent weak with cap room; OL unchanged | `*.task4.roster`, `*.extra.ol`, `weakResponse.byPos.OL` | Free agency fills counts; the club-relative weak rule flags OL structurally | `league-season.js leagueFreeAgency` (line 137), `clubNeeds` | Upgrade a persistently weak starter when room allows, with need measured against the league at each position | Fewer multi-season holes | Low–Medium / Medium: pools shrink for the owner | Persistent weak with room < 5%; owner market size |
| T6-6 | Situational strategy (contend or rebuild) | Strugglers and contenders draft and trade alike | `*.trading.byBuyerStatus`; `*.task4.decisions` | No code path | New decision layer | Mode by record, age and anchor, steering draft, contracts and trades | Club identities; possibly faster recovery | High / High: interacts with the anchor and the nudge | Recovery time, dynasty length, owner win rate |
| T6-7 | Staggered contract lengths | Synchronised cliffs (expiring scenario) | `stress.expiring` | Two-year deals everywhere | `league-season.js` (`newContract(…, 2)`) | Deals of 1–3 years by age and value | Smoother rosters | Low / Low | Expiring-scenario roster variance |

**Outside Task 6 (trading follow-ups, for the owner):**
- **D1:** fix the offseason-call ordering. Tiny change, no balance effect; it needs a test.
- **Incoming-offer design (§10.2).**
- **Optionally, a short AI–AI flip lock** against re-trading (§5).

## 13. Findings requiring owner design decisions
1. **D1 fix:** approve the one-line ordering fix for the offseason-opening offer (a published-game defect), and decide whether it ships alone or with other work.
2. **Incoming offers after the roster fills:**
   - keep (offers only when legal for both sides); or
   - let a full AI club include a spare in a buy offer (a swap); or
   - let offers propose a release; or
   - add an offseason-only buy window once D1 is fixed.
3. **Retirement and ageing (reserved).** T6-1 can reduce ageing through contract decisions alone; a true retirement rule is a new game rule. Task 6 depends on which.
4. **Draft-class quality scaling (reserved).** T6-2 improves which prospects are taken, but the gap between round-1 picks and starters (8% start by year 20) comes from fixed class quality.
5. **Long-term balance and anchors (reserved).** Trading did not change gym dominance or persistent losers. Any Task 6 change that strengthens or rejuvenates clubs will meet the nudge (which already slows 3.3 points more club-seasons) and the runaway-veteran rule. Recalibration should be authorised as part of Task 6.
6. **How OL weakness is judged:** relative to the club (today's rule, which flags OL structurally) or to the league's OL; and whether the AI should weigh positions by engine leverage (the trade valuation does, at half strength).
7. **Successor protection (T6-3):** it changes which spares AI clubs pay with. AI–AI only, or also when clubs price the owner's offers?
8. **AI–AI flip lock:** add one, as the owner's desk has, or accept 2.5% re-trades.

**Dependencies of Task 6 on the reserved designs:**
- T6-1 depends on the retirement and ageing design.
- T6-2's ceiling depends on class-quality scaling.
- T6-1, T6-4 and T6-6 all need the balance calibration (nudge bands, LIFT_SHARE, the runaway-veteran rule) to be re-measurable or re-tunable.

## 14. Limitations and confidence
- **One owner policy and one difficulty.** The hands-off owner never trades or answers calls, so owner–AI trading in a real franchise is measured only by the scenarios, the probe and the funnel. Its full roster from season 3 also shapes §10.2.
- **"Starter" means best by overall**, as in Task 4. The deal-against-undoing measure ignores injuries, which is why some injury-cover deals read as no gain (§5).
- **Seeds 21–40 were seen once in Task 5.** Seeds 41–60 were added as an unseen check and agree on every trading measure.
- **The 20-season stage has 5 seeds.** Its balance signals (distinct champions, persistent losers, T3) are provisional.
- **Stages D and E are small** (5 and 8 seeds).
- **The weak-response comparison is observational:** clubs choose where to trade. The tree comparison (matched seeds, same code except trading) and Stage E carry the attribution.
- **A tool defect was found and fixed during the run.** `tools/trade-benchmark-compare.mjs` read the harness version per run instead of per file, so it re-valued v2+ data as v1. This affected only baseline valuation rows such as T4's baseline median; Task 5's published figures came from v1 files and are unaffected.
- **A harness field was superseded.** `picksNext`, the draft-capital snapshot, cannot see picks moved by the offseason deals of the same window. Draft capital is read from the drafts instead.

| Finding | Confidence | Basis |
|---|---|---|
| Kicker misuse resolved, draft capital kept | High | 60 seeds, every sample, 0↑ against 60↓ for first-round picks |
| In-season window working, inside the deadline | High | 579 in-season deals; deadline checks in runs, saves and probes |
| Persistent weak groups reduced by trading | High (direction), Medium (size) | Every sample including E; size −2 to −7 points |
| Deal quality better on independent measures | High | Deal-against-undoing on 3,876 deals (B and C, both trees) |
| Ageing, draft, development, strategy unchanged | High | B, C, D and E; code unchanged |
| Succession cover reduced | High | 51 of 60 seeds; C and E agree |
| D1 offseason-offer defect | High | Code path, instrumented copy, 6 of 6 against 0 of 6 |
| Offers vanish after season 2 | High for this owner policy, Medium in general | Benchmark, probe and funnel; a real owner's roster may differ |
| Balance unchanged | Medium | Gym and losers stable; C distinct champions provisional |
| OL largely a definitional and structural effect | Medium | League-relative counts, leverage study, three-slot arithmetic |
