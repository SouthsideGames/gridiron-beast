# Task 8 approval register

This is the single register of every Task 8 decision item: round 1 (items 1–40), round 2 (R2-1 to R2-22), the final packet
(P1–P10) and the remaining batch (B1–B20).

## Status values

| Status | Meaning |
| --- | --- |
| **Approved** | A binding owner ruling exists, cited in the row. |
| **Superseded** | Replaced by a later item. The row names that item, which carries the ruling. |
| **Withdrawn** | Proposal removed at the owner's instruction. |
| **Open** | No binding ruling yet. A recommendation is not approval, and silence is never approval. Committing a file is not a ruling. |

## Ruling sources

| Code | Source |
| --- | --- |
| **R1** | Owner rulings on items 1–40, 2026-11-06 23:46 ([DECISIONS.md](DECISIONS.md)) |
| **N7a** | Owner instruction, 2026-11-07 00:13: no universal evasion; no multi-play Stunned proposal; ordinary attacks normally connect |
| **N7b** | Owner rulings on P1–P10, 2026-11-07 09:21 ([RULINGS_2026-11-07.md](RULINGS_2026-11-07.md)) |
| **N7c** | Owner rulings on B1–B20, 2026-11-07 10:00 ([RULINGS_2026-11-07b.md](RULINGS_2026-11-07b.md)) |
| **N7f** | Owner rulings on club strength, franchise identity, free agency, testing record and scope, 2026-11-07 12:44 ([RULINGS_2026-11-07d.md](RULINGS_2026-11-07d.md)) |
| **N7e** | Owner ruling on fractional training display, 2026-11-07 10:32 |
| **N7d** | Owner rulings on G1–G3, 2026-11-07 10:21 ([RULINGS_2026-11-07c.md](RULINGS_2026-11-07c.md)) |

The consolidated rules are in [SPECIFICATION_BASELINE.md §20–§21](../beast-dex/SPECIFICATION_BASELINE.md) and
[task8-overrides.json](../beast-dex/data/task8-overrides.json).

## Field-wording gaps G1–G3 (N7d)

| Gap | Status | Ruling |
| --- | --- | --- |
| **G1** | **Approved** | Impact Pyre, Burning Wake and Tsunami Line count every completed scrimmage play by either team, including incompletions; special teams don't count; creation-play and halftime exceptions preserved |
| **G2** | **Approved** | Runway and Beacon Lane decrement only when their creator participates in an offensive scrimmage play; the field stays active while paused |
| **G3** | **Approved** | The eight listed abilities wait for their creator's next eligible on-field snap; the five explicit off-field permissions are preserved |

The field limits were recalculated under these clocks: 44 rectangles, and 0 objects on a live kickoff (B4 below; P9_VERIFIED_LIMITS.md §9).

## Remaining batch B1–B20 (all N7c)

| ID | Item | Status | Ruling |
| --- | --- | --- | --- |
| B1 | Pancake constants | **Approved** | Proposed constants and bounds. One opportunity roll per OL per play, not per tick. Positive advantage required; a0 ≥ 0. Rebenchmark with Dex-generated ratings. |
| B2 | Ordinary shed formula | **Approved** | DL, CB, S: 0.5 Agility + 0.3 Strength + 0.2 Tackling; LB unchanged; initial values. Report ordinary shed effects separately from pancake results. |
| B3 | Event order | **Approved** (corrected) | Revised order. Correction: determine whether a fumble would occur first; Shielded then prevents it and consumes its episode. Post-KO exceptions verified against each contract ([RULINGS_2026-11-07b.md](RULINGS_2026-11-07b.md)). |
| B4 | Effect limits | **Approved** | Thresholds recalculated under N7d: 44 rectangles, 0 kickoff objects. Verified limits are diagnostic thresholds, never gameplay restrictions; legitimate effects execute on overflow. Legendary uniqueness verified against the approved GDD. |
| B5 | Special-teams units | **Approved** | Depth-list units, including kickoff kicking and return units. Formula-only participation grants the participation foundation without fabricated performance events. |
| B6 | Level-XP curve | **Approved** | 75 XP per level (starting curve), subject to the development benchmarks. |
| B7 | Veteran history | **Approved** | Simulated prior seasons, subject to the stated benchmarks. |
| B8 | Telemetry | **Approved** (with direction) | Attributable pressure approved. One-yard separation is an initial coverage measurement only; a viable window must account for responsibility, ball travel and interception paths. |
| B9 | Apex contract ask | **Approved** | Halfway-to-OVR-99 formula; the dollar amount is illustrative; revalidate after economy recalibration. |
| B10 | Afflicted drain | **Approved** | Exact drain = permanent Durability ÷ max(1, effective Durability); exhaustion begins immediately at zero. |
| B11 | Mid-Clash save | **Approved** | Exchange-boundary saving; preserve committed decisions, RNG state and reward idempotency. |
| B12 | Test matrix | **Approved** | Contract-based cases. Freeze each probability's tolerance and sample size before testing. Guaranteed behaviour requires exact success. |
| B13 | Legacy common traits | **Approved** | Retire. |
| B14 | Nature side effects | **Approved** | Retire, preserving legitimate Ambition behaviour. |
| B15 | Cornerstones | **Approved** | Retire the fixed legacy list; keep no-K cornerstone eligibility. |
| B16 | AI information | **Approved** | Equal scouting-information rules; close both player information leaks. |
| B17 | Basic shares | **Approved** | 25 / 25 / 30 / 35 / 40% (rosters, scouting, encounters, drafts, FA arrivals). Governs generation events, not forced composition of existing rosters or markets. |
| B18 | Clash Stunned into football | **Approved** (recommendation rejected) | Preserve remaining duration 1:1 across Clash and football; each remaining unit disables one participating football play. Multi-play Stunned from carryover is approved; unrelated future sources still need approval. |
| B19 | Legendary kickers | **Approved** | All legendary kickers count toward the offensive legendary limit. |
| B20 | Ambiguous wording | **Approved** in part | Kickoff catches are not receptions; kickoffs are not defensive snaps. Per-ability field clocks and creation eligibility are preserved (the blanket readings are not adopted). Impact Pyre waits for its creator's next eligible defensive snap. A cooldown cannot cancel an already-earned queued field. Clock table published; G1–G3 resolved by N7d. |

## Final packet P1–P10

| ID | Item | Status | Ruling |
| --- | --- | --- | --- |
| P1 | Stoke the Flame damage | **Approved** | N7b |
| P2 | Blazing Resolve threshold | **Approved** | N7b; at least 8 / 5 / 1 whole yards confirmed (N7c) |
| P3 | Beacon Lane lifetime | **Approved** | N7b (whose participation: G2) |
| P4 | Mastery-only values across forms | **Approved** | N7b |
| P5 | Pancake | **Approved** | Structure N7b; constants B1 (N7c) |
| P6 | Event order | **Approved** | Via B3 (N7c) |
| P7 | Live kickoffs, Dawn Signal | **Approved** | N7b; units B5 |
| P8 | Rotation timing and entry cost | **Approved** | N7b; Stunned skip consumes the penalty (confirmed N7c) |
| P9 | Effect limits | **Approved** | Behaviour N7b; limits B4 (N7c) |
| P10 | Miss-only abilities | **Approved** | N7b; one roll per whole attack (confirmed N7c) |

## Additional rulings (N7b)

| Topic | Status | Ruling |
| --- | --- | --- |
| TE contested catching | **Approved** | Agility-based role only |
| Football Stunned | **Approved** | Approved rest-of-play sources, plus carryover multi-play (B18). No other multi-play sources |
| AI and Basics | **Approved** | AI may start a Basic when it is the best eligible individual |
| Collection achievements | **Approved** | Separate 72, 120 and 192; evolutions add no family count |
| Art and reviewers | **Approved** | Art polish deferred; functional visuals and both runtime-backed reviewers required |

## Round 2

| ID | Status | Ruling |
| --- | --- | --- |
| R2-1 | **Approved** | B6 |
| R2-2 | **Approved** | B7 |
| R2-3 | **Superseded** by P4 | Approved |
| R2-4 | **Superseded** by P1–P3 | Approved |
| R2-5 | **Superseded** by P5 and B1 | Approved |
| R2-6 | **Approved** | B8, with direction |
| R2-7 | **Approved** | B9 |
| R2-8 | **Withdrawn** | N7a. Carryover multi-play Stunned is approved separately (B18) |
| R2-9 | **Superseded** by P6 and B3 | Approved |
| R2-10 | **Approved** | P8 |
| R2-11 | **Approved** | P7 and B5 |
| R2-12 | **Approved** | B10 |
| R2-13 | **Approved** | B11 |
| R2-14 | **Superseded** by P9 and B4 | Approved |
| R2-15 | **Approved** | B12 |
| R2-16 | **Superseded** by P8 | Approved |
| R2-17 | **Withdrawn** | N7a; replaced by P10 |
| R2-18 | **Approved** | B13 |
| R2-19 | **Approved** | B14 |
| R2-20 | **Approved** | B15 |
| R2-21 | **Approved** | B16 |
| R2-22 | **Approved** | B17 |

## Round 1

| # | Item | Status | Ruling |
| ---: | --- | --- | --- |
| 1 | Natural-growth schedule | **Approved** | R1 |
| 2 | Growth through evolution | **Approved** (condition) | R1 |
| 3 | Generation level | **Approved** | R1 (prospects at level 1); B7 (veterans) |
| 4 | Prior training, initial league | **Approved** | B7 |
| 5 | Missing ability values | **Approved** | P1–P3 |
| 6 | Attribute roles | **Approved** | R1; TE ruling (N7b); shed weights B2 |
| 7 | Pancake | **Approved** | R1, P5, B1 |
| 8 | Telemetry | **Approved** | B8 |
| 9–12 | Reserve XP; eligibility; offseason stamp; partial bonus | **Approved** | R1 |
| 13 | Benchmark freeze | **Approved** (condition) | R1 |
| 14 | Apex | **Approved** | R1 (sampling); B9 (contract) |
| 15 | Apex for Basics | **Approved** | R1 |
| 16 | Football Stunned | **Approved** | R1; N7b; B18 |
| 17–18 | Physics recoveries; rounding | **Approved** | R1 |
| 19 | Event order | **Approved** | B3 |
| 20 | Clash attribution | **Approved** (condition) | R1 |
| 21 | Kicks | **Approved** | R1; P7; B5 |
| 22 | Stamina and Afflicted | **Approved** | B10 |
| 23 | Save boundaries | **Approved** | R1 (football); B11 (Clash) |
| 24 | Caps | **Approved** | P9; B4 |
| 25 | Test matrix | **Approved** | B12 |
| 26 | Bench and rotation | **Approved** | R1; P8 |
| 27 | Evasion | **Approved** | P10; N7a |
| 28 | Shared traits | **Approved** | B13 |
| 29 | Nature side systems | **Approved** | B14 |
| 30 | Economy recalibration | **Approved** (numbers for review) | R1 |
| 31 | Parallel growth paths | **Approved** | R1 |
| 32 | Granigor and cornerstones | **Approved** | R1 (K); B15 |
| 33–34 | Venue bonus; decline floor | **Approved** | R1 |
| 35 | AI knowledge | **Approved** | B16 |
| 36 | Basic appearance | **Approved** | B17 |
| 37–38 | Basic Clash action; contracts | **Approved** | R1 |
| 39 | AI use of Basics | **Approved** | R1; N7b |
| 40 | Dex and collection | **Approved** | R1; N7b |

## M3 and economy rulings (N8b, 2026-11-08 01:30; RULINGS_2026-11-08.md)

| Item | Status | Ruling |
| --- | --- | --- |
| H Special-play eligibility | **Approved (replacement)** | Kickoffs and two-point conversions: non-kicker abilities neither activate nor charge; kicker abilities only under their own approved conditions; effects an eligible kicker ability creates are allowed; statuses carry over and count down normally; overrides conflicting contract wording |
| A Prism Break exposed-area measure | **Approved** | Footprint reading |
| B/C/D calibration | **Approved as PROVISIONAL** | 20 / 8 / 15 yd/s; Snowfall 0.6 s; logistic (d/16) curves |
| E Crossed Wires | **Approved** | Release the bunch/stack reserve plays with a pair within 5 yd |
| F Fortress Gate | **Approved** | Longest safe panel, at least 1.5 yd |
| G Dragon Roar AI | **Approved (PROVISIONAL policy)** | Including desperation attempts up to 90 yd |
| I Shadow Exchange | **Approved** | Predicted partner position from current position, velocity and known flight time; no simulation, no RNG |
| D1, D2, D3, D4, D6, D8, D10, D11 | **Approved** | As recommended; D11 test split, sale rules not loosened |
| D7 identities | **Approved** | Persistent club identities; coaches may change; gyms keep the Compete floor and the soft element preference |

## M3 rulings (N8a, 2026-11-08 00:41; RULINGS_2026-11-08.md)

| Item | Status | Ruling |
| --- | --- | --- |
| Guiding Halo radius reference | **Approved** | Existing radii measured from the ball's line-of-scrimmage spot, not the QB; other mechanics unchanged |
| Shadow Exchange partner prediction | Not approved | A concrete before/after example requested |
| Comeback mode (GDD §17, D5) | **Approved: retire** | Unrelated approved comeback abilities and mechanics preserved |
| AI identities (D7) | Pending | All proposed club identities to be presented together before implementation |
| Gym acquisition (D9) | **Approved** | Prefer matching-element monsters among similarly useful candidates; legendary synergy and legal lineups first; no hard quota |

## Encounters and Glacivern (N7g, 2026-11-07 15:08)

Verbatim: [RULINGS_2026-11-07e.md](RULINGS_2026-11-07e.md).

| Item | Status | Ruling |
| --- | --- | --- |
| Basic scouting encounter XP bonus | **Approved** | Winning an encounter whose recruitable target is a Basic: +25% level XP for eligible participants (normal participation rules); recruiting not required; Basic companions alone do not activate it; no bonus to training progress or mastery; once per encounter through the reward ledger; shown in the preview and the reward breakdown; a shared encounter rule, not an ability |
| Encounter companions | **Approved** | Keep the 30% Basic share (B17) for companions; strength matching best-effort within legal development limits; easier encounters acceptable |
| Glacivern | **Approved** | Keeps K, Second Chance and Deep Winter; Avalanche and its unlock references retired, not replaced; not every legendary has an unlocked play |

## Club strength, identity and scope (N7f)

| Item | Status | Ruling |
| --- | --- | --- |
| Club strength in the Dex generator | **Approved** | Option A: nine-candidate percentile selection (initial calibration). Family by channel share first; one independent 1% Apex roll per event (never selected among or discarded); legal ratings and ceilings; Temper-neutral; current strength versus potential distinguished by channel ([CLUB_STRENGTH_SELECTION.md](CLUB_STRENGTH_SELECTION.md)) |
| No seasonal regeneration or boosts | **Approved** | Initial strength only; no automatic yearly boosts; no rubber-banding, forced results or hidden matchup boosts |
| AI club identities | **Open: proposal for review** | Long-term offensive and defensive identities; gyms add an element and a legendary-built strategy; the player's club has none ([AI_IDENTITIES.md](AI_IDENTITIES.md)) |
| Free-agency 85% floor | **Approved: not applied** | Market negotiation unchanged |
| Season scope | **Approved** | 20 seasons; franchise-health reports at seasons 5, 10, 15 and 20 |
| Ability deliverables | **Approved** | Functional football and Clash visuals, updated football reviewer, Beast Clash review support, affected developer tools; art polish deferred |

## Fractional training display (N7e)

| Item | Status | Ruling |
| --- | --- | --- |
| Fractional training display (spec §4 gap) | **Approved** (N7e) | Floor banked points and whole-percent bars; the exact-cost purchase is affordable on exact balances, with its cost shown to two decimals rounded up; display never changes balances, deducts extra or decides affordability; fractions preserved through saves and evolution |

**Specification status: closed.** Every item has a binding ruling (N7d resolved the last gaps).
