# M5 implementation — 2026-11-10

M5 runtime integration and verification are complete on `codex/task8-m5`. The frozen build passed all 2,003 tests. Task 8 as a whole remains open for M6 and owner review.

## Runtime connections

| Area | Implementation |
| --- | --- |
| Football grades | `t8/grading.js` implements all ten positional formulas. `sim/t8/performance.js` collects a separate per-individual record; `progression.js` aggregates slots by monster before grading and awarding XP/training. Box-score totals remain separate. |
| Assignment telemetry | Pressure requires a committed pressured throw, scramble or sack. Coverage observes live throwing windows using the production flight/interception calculation and man/zone responsibility. Blocks measure engagement intervals and lane contributions. Lane redirection requires a counterfactual over the actual perceived lane, without RNG. Gap/contain failures use assigned crossings; failed tackles require real attempts. |
| Exclusions | Clone events keep their box-score owner but carry provenance; their production never enters the owner's performance grade. Forced coverage movement, Daybreak/afterimage overrides, uncatchable targets and drops do not become ordinary defender execution failures. Unknown attribution stays neutral. |
| Kicking | Pre-attempt make probabilities, including individual Second Chance checks, feed kicking grades. Punt/kickoff targets are selected without future RNG; placement is measured before returns. Blocked punts are protection failures rather than kicker execution opportunities. |
| Clash grades | `clash/t8/performance.js` collects actual-benefit ratios independently of logs; `clash-link.js` applies the fixed role weights. Never-involved reserves keep neutral performance and full participation. |
| Mastery | Engine execution counters settle inside the activity/monster reward transaction. Valid failed executions count; passive scope stamps persist across saves/evolution. Opening/OT Clash share a game scope. Modes are separate, and lineups convert use counts to tiers at 0/10/30/60 before invoking abilities. |
| Reward parity | Both persistent sides receive Clash progression in owner games and AI–AI games. Opponent and owner rewards use the same formulas, ledger and passive-cap rules. Staged, probed, pending and provisional battles award no progression. |
| AI scouting | Each computer club saves its own scouting level/reports. Weekly full/glance capacity uses the player's scouting function; founding clubs inherit the same initial report coverage as the player. Hidden draft ratings, potential and Temper do not enter valuation, succession or scheme-fit scoring. Own-roster knowledge remains legitimate. |
| Player information | Draft advice uses potential only after reveal. Regional advice does not expose unknown overall or hidden salary affordability. Recruit cards show a public salary range while information is hidden. |
| Existing AI rules | Verified that Basics may start and legendary kickers count toward the offensive limit. Existing positional training allocation remains in use. |

## Benefit-ledger conventions

These are implementation conventions for the specification's attribution requirements, not new ability effects or changes to category weights.

- Each damaging action aggregates real enemy HP/shield damage, deduplicating enemies in the reference denominator. Self/friendly damage and overkill earn no positive offense credit; a valid miss remains an opportunity with ratio zero.
- Protection uses sequential marginal prevention in the actual mitigation order, bounded by damage that could have affected the protected recipient. Transfer/cover earns absorption credit only for HP actually spent protecting an ally. Losing HP without an explicit protection operation earns no protection credit.
- Support groups recipients within the source's action boundary. Each recipient's actual restoration is divided by 15% of its own max HP and capped at one; a useful cleanse shares that cap. Recipient ratios are equally averaged. Overheal is zero. Redistribution credits only actual gains; revival credits actual restored HP. Shield creation alone earns no nominal protection bonus.
- Harmful control applications begin at zero; observed skips, confusion redirects, outgoing/healing changes and initiative reversals mark an application useful once. Forced rotations, cooldown changes and signature restrictions retain source attribution. Transfer/removal and shield theft keep distinct support, disruption and protection benefits separate.
- Incoming cross-mode statuses without a current-battle source cannot award an unrelated combatant whose slot happens to reuse an earlier source ID.

## Validation

- The focused attribution/mastery/status/primitive run passed **41 tests**.
- Dedicated grading, knowledge and integration tests cover formula boundaries, missing categories, failure priority, role fairness, hidden-information invariance, separate scouting records, clone exclusion, JSON reload idempotency, passive scopes, mastery-tier conversion, Basics and legendary kickers.
- A one-seed, one-season production AI benchmark completed with **zero errors and zero integrity problems**. The matching pre-M5 run also had zero. This is an integration smoke benchmark, not M6's long-term development/economy acceptance.
- `index.html` includes the new runtime modules in its import map.
- Final full regression: **2,003 / 2,003 passed**, zero failures, in 450.4 seconds (`npm test`). M5 verification is closed. Machine-readable results are in `m5/verification.json`.

## Fixture changes

- Task 6/identity draft valuation fixtures explicitly mark prospects fully scouted. They still test the same need, potential-weight and identity rules; separate M5 tests assert that unrevealed information cannot influence choices.
- The media-boost fixture explicitly selects an offensive starter, rather than depending on whether the new draft makes a kicker the highest-rated media choice. The contract-flow fixture explicitly accepts forfeits when its two-season roster has a positional hole; lineup safeguards remain covered separately.
- The successor-contract fixture selects a real club with a qualifying successor and preserves incumbent order on exact ties, rather than depending on old draft outcomes. Contract assertions are unchanged.
- The atomic upgrade fixture uses seed 31 (37 before B16); signing/release/zero-dead-cap/no-return assertions are unchanged.
- The lineup-forfeit fixture advances to Sunday without authorizing staff recruitment to fill its deliberately open slot. The gate and actual 0–21 forfeit remain tested.
- Basic encounter fixtures allow the approved performance adjustment while retaining the 25% level-XP-only bonus, training bounds and once-only settlement checks.

## Handoff

M6 still owns screens, long-term career/development/economy tests, balance tuning and finished-game CPU/rendering gates. The added telemetry has not yet passed M6's performance budget. Owner visual approval and physical-device measurements remain pending. No preview, main branch or live release was updated.

This checkout also contains the earlier owner-approved N9c/N9d follow-ups after remote `task8-fx-finish-2` (`7998b23`). They must be preserved in the development handoff; they are not new M5 design decisions.
