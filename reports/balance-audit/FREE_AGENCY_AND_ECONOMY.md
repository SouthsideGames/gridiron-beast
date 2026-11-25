# Free agency and franchise economy

**Build:** `v43.50.0-sideline` at `58c33ee`.

## Method

**The runs.** Production franchise lifecycle (`tools/franchise-soak.mjs` `runFranchise`), recorded by `tools/ai-franchise-benchmark.mjs`, which observes and changes nothing.

- **What each run is:** seed 3, 15 seasons (the lifecycle cap, see `DIFFICULTY_AND_BOARD_BALANCE.md`), and 32 clubs: the owner plus 31 AI clubs.
- **Two opt-in harness flags** were added for this audit. Both default to off.
  - `--owner=repair` is the Task 10 repair owner (`tools/study-owner.mjs`): he fills an open starting slot with the cheapest legal free agent, and does nothing else.
  - `--board=content` keeps the Board content after every season, so every run plays all 15 seasons.
- **Difficulties:** Pro and All-Star complete. Rookie is in `FRANCHISE_SIMULATION.md` if it finished.
- **Raw data:**
  - `raw/franchise-{pro,allstar}-seed3.json`: every club-season, every monster at every season end, every market, trade, arrival and departure;
  - `raw/franchise-summary-pro-allstar.json`: the per-season summary from `tools/balance-audit/franchise-analyze.mjs`.
- **What this is evidence of:** two franchises are one seed per difficulty. These are long, detailed observations of real league economies, not a statistical sample across seeds.

**The salary model** (`src/data/monsters.js` `salaryFor`): salary = 18,000 + 280 × overall. Protected monsters (gym legendaries, the rival's signature) are cap-exempt. The cap is 1,800,000 in the Challenger league; cap room = cap − staff allowance − payroll.

## 1. The cap: legal, solvent and loose

| Measure, AI clubs | Pro | All-Star |
|---|---|---|
| Club-seasons | 465 | 465 |
| With negative cap room | **0** | **0** |
| Mean payroll | 1.03–1.07 M | 1.03–1.09 M |
| Mean cap room | 320–368 k | 308–369 k |
| Lowest cap room of any club in any season | 232 k | 226 k |
| Roster size | 30–38 | 26–38 |
| Club-seasons with a lineup problem | 1 | 1 |
| Integrity problems | 0 | 0 |

- **Every AI club stays legal for 15 seasons.** Rosters stay within the 26–38 limits, and the market integrity checks (`marketProblems`) find nothing in any of the 30 markets.
- **E-1 (High): the cap is not a constraint.**
  - No AI club ever comes within 12% of the cap. The tightest club-season still had 226 k of room, worth about 7 average starters.
  - Mean room is about a fifth of the cap (18–21%) in every season. There is no visible cap pressure, now or later.
- **No inflation or deflation.** Mean payroll is flat from season 1 to season 15 (1.03 M to 1.03 M on Pro), because salary follows overall and league overall plateaus after season 5 (`PROGRESSION_AND_EVOLUTION.md`).

## 2. Salary barely separates quality

**Mean salary of AI starters by position, season 15 (Pro):**

| Position | Mean salary | Mean OVR |
|---|---|---|
| K | 36,968 | 75.4 |
| QB | 35,410 | 68.1 |
| LB | 35,101 | 65.9 |
| TE | 33,887 | 64.3 |
| S | 33,264 | 64.9 |
| CB | 32,998 | 64.2 |
| WR | 32,943 | 64.0 |
| DL | 32,180 | 61.9 |
| OL | 32,066 | 63.7 |
| RB | 31,726 | 61.6 |

- **E-2 (High): salary is a fixed function of overall, so the market cannot price anything else.**
  - **The range is narrow:** a 46-overall reserve costs 30,900 and a 99 costs 45,700. The best monster in the league costs 1.5 times a replacement-level one.
  - **Position is not priced.** The kicker is the most expensive starter only because kickers carry high overall (kicking is weighted 6 of 7).
  - **Hidden value is not priced:**
    - Speed is the most valuable attribute and the one strategy that wins at constant payroll (`POSITIONAL_BALANCE.md` P-1).
    - Durability is not in the overall at all.
  - Together these make a "buy speed, ignore overall" plan strictly better for the same money. **That is the exploitable contract valuation the brief asks about.**
- **Contract lengths are mixed:** in season 15 on Pro, 180 one-year, 661 two-year and 311 three-year contracts. The three-year share rose from 11% in season 1 to 27% by season 15.

## 3. Free agency

Over the 15 offseason markets of each run:

| Measure | Pro | All-Star |
|---|---|---|
| AI free-agent signings | 223 (about 15 a market for 31 clubs) | 221 |
| Signings with 2+ bidders | 124 (56%) | 117 (53%) |
| Signings with 4+ bidders | 59 | 52 |
| Signing bonuses offered by AI | **0** | **0** |
| Mean AI signing salary | 31,304 | 30,819 |
| Mean age at signing | 28.8 | 28.4 |
| Unsigned at market close (mean) | 34.0 | 36.3 |
| Owner signings (repair owner) | 5 | 8 |
| Extensions (both runs ~3,500) | 3,520 | 3,579 |
| Renewals signed / declined | 1,496 / 255 | 1,612 / 227 |

**Where AI clubs' new monsters come from** (arrivals over 15 seasons):

| Source | Pro | All-Star |
|---|---|---|
| Draft | 1,302 | 1,302 |
| Generated arrivals | 389 | 362 |
| Free-agent pool | 180 | 178 |
| Waivers | 139 | 134 |
| Trades | 115 | 119 |

**Findings:**
- **E-3 (Medium): free agency is a minor talent channel.**
  - The draft supplies about 61% of arrivals.
  - Generated arrivals supply 18%: monsters created on demand when a club has a need (Task 10 T7-32).
  - The free-agent pool supplies 8%.
  - About one signing in two is contested, so the market is real. But at about half a signing per club per offseason, it rarely changes a club.
- **E-4 (Medium): AI clubs never use a signing bonus.** 0 of 444 signings. This is the open Task 7 decision T7-44, unchanged.
- **The owner's supply problem has gone in the 32-club league.**
  - Task 10 found the owner forfeiting whole seasons because the market was empty at his position (R-1, T7-25 to T7-31).
  - Here the repair owner needed only 0 pre-game signings and 4 to 8 offseason signings in 15 seasons.
  - The owner's club played 210 games with 0 forfeits on Pro and at most 1 0–21 result on All-Star. That one may be a genuine 21–0 game, see `TECHNICAL_ISSUES.md` T-1.
  - With 34–36 monsters still unsigned at every market close, supply is no longer the bottleneck.

## 4. Retention, movement, draft and trades

**Departures over 15 seasons (Pro):**

| Reason | Departures |
|---|---|
| Contract not renewed (walked) | 1,321 |
| Retired | 636 |
| Released | 187 |
| Traded | 116 |

All-Star is similar.
- **Retention:** renewals are signed six times as often as declined (1,496 against 255). Extensions are routine, about 235 a season.
- **Trades:** 58 AI–AI trades on Pro and 61 on All-Star, about **4 a season across 32 clubs**. That is a quiet trade market: one trade per club every eight seasons.
- **The draft:** 1,395 draftees per run, 465 of them in round 1. **62% of first-rounders on Pro (290 of 465) are starters at the end of the run**, including recent picks who have had little time. The draft is the main way clubs rebuild.

## 5. Questions in the brief

| Question | Answer | Evidence |
|---|---|---|
| Do AI clubs build competitive and legal rosters? | **Yes.** No illegal roster or cap breach in 930 club-seasons; AI team overall SD 3–4 points | §1 |
| Do some positions become too expensive or too cheap? | Not by price: salary follows overall only. **But speed-heavy monsters are undervalued in play** relative to their price | §2, `POSITIONAL_BALANCE.md` |
| Does free agency let a club improve? | Rarely: about 15 signings a market across 31 AI clubs | §3 |
| Can players exploit contract valuations? | **Yes:** speed-heavy and durable monsters are underpriced, because the price reads overall only | §2, P-1 |
| Irrational AI acquisition or retention? | None found. Renewals are 85% signed; no over-cap signing; no market problem | §3, §4 |
| Is cap pressure meaningful? | **No.** At least 12% of the cap is always unused | §1 |
| Long-term inflation or deflation? | None. Payroll is flat for 15 seasons | §1 |
| Are high-quality monsters too easy or too hard to get? | Hard: the top players come through the draft and development, not the market | §3 |
| Can clubs recover from poor roster construction? | Yes in this sample: the champion changes often (7 distinct champions on Pro) | `FRANCHISE_SIMULATION.md` |
| Does the economy create real decisions? | **Weakly.** With a loose cap and a flat price, the decisions that matter are about which attributes to buy, which the price does not show | §1–2 |
