# AI Franchise Benchmark — pre-registered plan and criteria (Task 4)

Written and committed **before** the Stage B–D runs, so the metric definitions and the thresholds that turn a measurement into
a finding are fixed before any result is seen. Results are reported in `AI_FRANCHISE_BENCHMARK.md`. If a definition has to
change after this point, the report will say so and why.

## Code and environment
- Baseline: `main` at `cc99673` (v42.16.0-run-game, published), branch `ai-franchise-benchmark`.
- Node v22.22.0, Linux container, 2 CPU cores; no browser, no real save touched (every run is in memory).
- Difficulty Pro (the standard league), tier as created (one tier is enabled), 16 clubs: 15 persistent AI clubs + the owner.

## Owner policy (fixed)
`tools/franchise-soak.mjs runFranchise` — the hands-off owner the existing soaks use: staff auto-run each week, the trainer spends
points, the first commissioner goal and postseason option, every expiring contract re-signed when the owner's rules allow (else
walked), the best visible prospect at every pick, the cheapest free agents only up to the 26 minimum, no trades, no calls
answered. A dismissed owner is reinstated after the season (`withBoardReset`, simulation only, owner's rule of 2026-10-24) so
every seed runs its full length. The owner's club is reported separately and never counted among the 15.

## Stages and seeds
| Stage | Seeds | Seasons | Purpose |
|---|---|---|---|
| A pilot | 1–2 | 2 | lifecycle exercised, decisions observable, determinism (same hash twice), non-interference (identical records with and without the harness), time and memory |
| B broad | 1–20 | 10 | behaviour and outcomes across franchise conditions |
| C long | 101–105 | 20 | sustainability, generations of monsters, dynasties and rebuilds |
| D stress | 1–5 | 6 | six scenarios (`tools/ai-benchmark-scenarios.mjs`: aging, expiring, thin, injuries, rebuild, picks), each against the matched Stage B seeds and clubs |
| E diagnostic | 1–8 | 10 | balance mechanisms switched off in scratch trees (`tools/ai-benchmark-variant.mjs`: no-nudge, flat-market), matched to Stage B seeds 1–8 |

## Metric definitions (per AI club-season, read at the season's end after the draft, unless stated)
- **Starters** — the club's best players by overall at each position group, as many as the group has starting slots
  (`GROUP_SLOTS`: QB 1, RB 1, WR 3, TE 1, OL 3, DL 3, LB 2, CB 2, S 2, K 1). **Backups** — the rest of the group.
- **Team overall** — `teamOverall(aiTeam)`, the game's own figure. **Target** — today's generator for that club and season
  (`strategy.today`), the balance anchor.
- **Lineup failure** — `lineupProblems` non-empty at the season's end, or a `validateClubs` problem at a season start.
- **Shortage** — a group with fewer natural players than starting slots.
- **Weak group** — a group whose starter mean is 6 or more below the club's starter mean, or a shortage.
- **Persistent weak group** — the same group weak at two consecutive season ends.
- **Resources available** — cap room at the season end of at least 100,000 cr (about one mid-grade starter's salary).
- **Surplus group** — at least slots + 1 backups whose mean is within 2 of the group's starter mean.
- **Cap usage** — counted payroll against the cap less the staff allowance; **violation** — negative room at a season start.
- **Draft pick quality** — the pick's overall and potential against the best still on the board at that moment (the class minus
  the earlier picks); **need alignment** — the club's `positionNeeds` at the pick's position, computed on its roster without
  this draft's picks, against its top need and the best prospect still available at that need.
- **Misaligned pick** — a pick at a position where the club's need is 0 while a need of 0.25 or more existed and a prospect
  within 3 overall of the pick was available at that need.
- **Draftee contribution** — a drafted monster who is a starter for the club that drafted him at the end of a later season.
- **Arrival source** — from the monster's own history plus where the harness last saw him: drafted, signed from the pools,
  signed from the waivers, signed and generated (a new regional veteran the market creates), traded, original (the club's
  creation roster).
- **Departure reason** — the monster's history: walked (contract), released (cap or room), traded.
- **Trade value at the time** — `playerValue` for the monsters and `pickValue` for picks (future discount), read at the first
  check after the deal (no ratings change between a deal and that check); **ratio** = value received by the shopping club ÷
  value it gave.
- **Development** — season-on-season change in overall of monsters on the same club; evolutions in the season (career events);
  stage distribution.
- **Competition** — wins, playoffs, finals, titles; distinct champions per seed; repeat champions; persistent loser (3 or fewer
  wins in 3 straight seasons); recovery time (seasons from a season of 2 or fewer wins to the next season of 5 or more wins).
- **Balance intervention** — nudge signings (`strategy.boost`), slowed club-seasons (`strategy.slow`), runaway-veteran clubs at
  contract time, and generated arrivals.
- **Integrity** — the soak's franchise and league invariants after every week (unique ids, one club per monster, protected
  monsters in place on permanent deals, rosters 26–38 and legal lineups at season start, the cap, the standings), the
  registry's structural check, a save export/import round trip of the whole league at every season end, exceptions, and the
  determinism hash.

## Thresholds that make a measurement a finding (fixed in advance)
| Area | A weakness is recorded when |
|---|---|
| Integrity | any invariant violation, exception, save round-trip change or determinism difference (always reported separately as a defect) |
| Lineups and cap | any lineup failure or cap violation at a season start |
| Unaddressed weakness | 20% or more of club-seasons have a persistent weak group while resources were available |
| Draft needs | 30% or more of AI picks are misaligned |
| Draft value | the median pick is 5 or more overall below the best available, or 25% or more of picks are a kicker or a duplicate position within the same draft without need |
| Draft contribution | fewer than 25% of round-1 picks start for their drafting club two seasons later |
| Free agency | 40% or more of AI starters are generated arrivals by season 10, or 25% or more of arrivals are at a position the club already had in surplus |
| Trades | the median value ratio falls outside the owner's 0.85–1.15 band, or 30% or more of acquired players are not starters for the club that acquired them at the end of that season |
| Contracts and aging | 10% or more of departures at contract time are starters, or a club's starter count by age 30+ exceeds half its starters in 15% or more of club-seasons |
| Development | own development (drafted + original) supplies under 40% of starters by season 10 |
| Competition | one club wins 40% or more of a seed's titles, or median recovery time exceeds 3 seasons, or 10% or more of clubs are persistent losers |
| Balance dependence | removing a mechanism (Stage E) changes the spread of team overalls (standard deviation) by 50% or more, or creates any club whose team overall falls 8 or more below the league mean for 3 straight seasons |

Measurements near a threshold are reported as such, with the sample size; a threshold crossed on one stage only is reported as
provisional. Correlation is not read as causation: a decision is judged on what the club could see at the time (its roster, its
cap, the board, the market), never on the outcome alone.
