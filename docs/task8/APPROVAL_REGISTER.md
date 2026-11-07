# Task 8 approval register

This is the single register of every Task 8 decision item. It covers round 1 (items 1–40), round 2 (R2-1 to R2-22) and the
final packet (P1–P10).

The specification is **not closed** while any row is **Open**.

## Status values

| Status | Meaning |
| --- | --- |
| **Approved** | A binding owner ruling exists, cited in the row. |
| **Superseded** | Replaced by a later item. The row names that item, which carries the ruling. |
| **Withdrawn** | Proposal removed at the owner's instruction. |
| **Open** | No binding ruling yet. A recommendation is not approval, and silence is never approval. |

## Ruling sources

| Code | Source |
| --- | --- |
| **R1** | Owner rulings on items 1–40, 2026-11-06 23:46 ([DECISIONS.md](DECISIONS.md)) |
| **N7a** | Owner instruction, 2026-11-07 00:13: withdraw universal evasion and multi-play Stunned; ordinary attacks normally connect |
| **N7b** | Owner rulings on P1–P10 and additional rulings, 2026-11-07 09:21 (quoted in [RULINGS_2026-11-07.md](RULINGS_2026-11-07.md)) |

Committing a file is not an owner ruling.

## Final packet P1–P10

| ID | Item | Status | Ruling (N7b) |
| --- | --- | --- | --- |
| P1 | Stoke the Flame damage | **Approved** | 60 / 70 / 80% normal attack damage by form, +0 / 5 / 10 / 15 points by mastery; normal mitigation |
| P2 | Blazing Resolve qualifying carry | **Approved** (owner values) | Form thresholds: Flaroo rushes over 7 yards, Blazynx over 4, Infernox any positive gain; replaces the 4 / 3 / 2 / 1 proposal; other charge and encounter rules unchanged |
| P3 | Beacon Lane lifetime | **Approved** | 1 / 1 / 2 / 2 participating offensive scrimmage plays by mastery, counting the creation play; created field clears at halftime; pending creation follows its approved carryover |
| P4 | Mastery-only values across forms | **Approved** | Apply equally across forms unless an explicit approved form exception exists |
| P5 | Pancake | **Partly approved** | Structure approved: one attempt per OL per play; advantage-based eligibility; Awareness-based recovery; rest-of-play Knocked Down; recovered failure keeps the block; unrecovered failure ends the engagement and attempts Stumbled. **Open:** corrected constants and bounds; the ordinary shed change is separated out (batch B1, B2) |
| P6 | Event order | **Open** | "Revise before approval": add pre-resolution hooks; Shared Burden raw split; immediate KO handling (batch B3) |
| P7 | Special teams / Dawn Signal | **Approved** | Live kickoff returns using existing movement, blocking and tackling; credit actual participants and return events; punts, FG and XP keep approved scope |
| P8 | Rotation timing and entry cost | **Approved** (option A) | After both normal turns, before delayed impacts; entrant acts next exchange; half strength on its first normal turn; a Stunned skip consumes the penalty; entry effects, reactions and defensive effects unchanged; nonnumeric effects usable; 4-exchange restriction; explicit ability exceptions kept |
| P9 | Caps | **Partly approved** | Diagnostic overflow approved: never cancel, delay or delete a legitimate effect. **Open:** verified limits (batch B4) |
| P10 | Miss-only abilities | **Approved** | Shadow Pounce 15 / 20% dodge while its counter is unused; Mind Game 15% afterimage miss while no trick is stored; eligibility and undodgeable exceptions kept; Arc Rebound unchanged; no universal evasion |

## Additional rulings (N7b)

| Topic | Status | Ruling |
| --- | --- | --- |
| TE contested catching | **Approved** | Keeps the approved Agility-based role; no new Strength contribution (closes round 1 item 6's open part) |
| Football Stunned | **Approved** | Implement only currently approved rest-of-play football Stunned sources; future multi-play Stunned remains unapproved (closes R2-8) |
| AI and Basics | **Approved** | AI may start a Basic when it is the best eligible individual (reaffirms item 39) |
| Collection achievements | **Approved** | Separate achievements for the original 72 families, the 120 Basics, and all 192; evolutions add no family count (clarifies item 40) |
| Art and reviewers | **Approved** | Art refinement stays paused; both runtime-backed ability reviewers remain required |

## Round 2

| ID | Item | Status | Ruling or reason |
| --- | --- | --- | --- |
| R2-1 | Level-XP curve to level 50 | **Open** | No ruling (batch B6) |
| R2-2 | Veteran and starting-history generation | **Open** | No ruling (batch B7) |
| R2-3 | Mastery-only values across forms | **Superseded** by P4 | Approved through P4 |
| R2-4 | Missing ability values | **Superseded** by P1–P3 | Approved through P1, P2 and P3 |
| R2-5 | Pancake contest | **Superseded** by P5 | See P5 |
| R2-6 | Grading telemetry definitions | **Open** | No ruling (batch B8) |
| R2-7 | Apex contract ask | **Open** | No ruling (batch B9) |
| R2-8 | Multi-play Stunned rule | **Withdrawn** | N7a; N7b keeps multi-play Stunned unapproved |
| R2-9 | Event order | **Superseded** by P6 | See P6 (open) |
| R2-10 | Rotation after both actions | **Approved** | Through P8 (N7b) |
| R2-11 | Special-teams units | **Partly approved** | Kickoffs live, actual participants credited (P7). **Open:** participation on formula-resolved punts, FG and XP (batch B5) |
| R2-12 | Afflicted drain formula | **Open** | No ruling (batch B10) |
| R2-13 | Mid-Clash save | **Open** | No ruling (batch B11) |
| R2-14 | Caps | **Superseded** by P9 | See P9 |
| R2-15 | Test matrix and probability acceptance | **Open** | No ruling (batch B12) |
| R2-16 | Rotation entry cost | **Superseded** by P8 | Approved through P8 option A |
| R2-17 | Ordinary evasion | **Withdrawn** | N7a; replaced by P10 |
| R2-18 | Retire the ten common traits | **Open** | No ruling (batch B13) |
| R2-19 | Retire Nature side effects | **Open** | No ruling (batch B14) |
| R2-20 | Cornerstone rule | **Open** | No ruling (batch B15) |
| R2-21 | AI information rules | **Open** | No ruling (batch B16) |
| R2-22 | Basic appearance shares | **Open** | No ruling (batch B17) |

## Round 1

| # | Item | Status | Ruling or open part |
| ---: | --- | --- | --- |
| 1 | Natural-growth schedule | **Approved** | R1 |
| 2 | Growth through evolution | **Approved** (condition) | R1 |
| 3 | Generation level | Prospects at level 1 **Approved** (R1). Veteran rule **Open** | Batch B7 |
| 4 | Prior training, initial league | **Open** | Batch B7 |
| 5 | Missing ability values | **Approved** | P1–P3 (N7b) |
| 6 | Attribute roles | **Approved** | R1. TE: Agility role, no Strength (N7b) |
| 7 | Pancake | Structure **Approved** (R1, N7b P5). Constants **Open** | Batch B1 |
| 8 | Telemetry | **Open** | Batch B8 |
| 9–12 | Reserve XP; eligibility; offseason stamp; partial bonus | **Approved** | R1 |
| 13 | Benchmark freeze | **Approved** (condition) | R1 |
| 14 | Apex | Sampling **Approved** (R1). Contract **Open** | Batch B9 |
| 15 | Apex for Basics | **Approved** | R1 |
| 16 | Football Stunned | Rest of play **Approved** (R1); multi-play unapproved (N7b). **Open:** a Clash-applied Stunned carried into football | Batch B18 |
| 17–18 | Physics recoveries; rounding | **Approved** | R1 |
| 19 | Event order | **Open** | P6, batch B3 |
| 20 | Clash attribution | **Approved** (condition) | R1 |
| 21 | Kicks | Targets and grouping **Approved** (R1). Kickoffs live **Approved** (P7). Formula-kick participation **Open** | Batch B5 |
| 22 | Stamina / Afflicted | **Open** | Batch B10 |
| 23 | Save boundaries | Football **Approved** (R1). Clash **Open** | Batch B11 |
| 24 | Caps | Behaviour **Approved** (P9). Limits **Open** | Batch B4 |
| 25 | Test matrix | **Open** | Batch B12 |
| 26 | Bench and rotation | **Approved** | R1; entry cost via P8 (N7b) |
| 27 | Evasion | **Approved** | P10 (N7b); no universal evasion (N7a) |
| 28 | Shared traits | **Open** | Batch B13 |
| 29 | Nature side systems | **Open** | Batch B14 |
| 30 | Economy recalibration | **Approved** (numbers for review) | R1 |
| 31 | Parallel growth paths | **Approved** | R1 |
| 32 | Granigor | K **Approved** (R1). Cornerstone **Open** | Batch B15 |
| 33–34 | Venue bonus; decline floor | **Approved** | R1 |
| 35 | AI knowledge | **Open** | Batch B16 |
| 36 | Basic appearance | **Open** | Batch B17 |
| 37–38 | Basic Clash action; contracts | **Approved** | R1 |
| 39 | AI use of Basics | **Approved** | R1, reaffirmed N7b |
| 40 | Dex and collection | **Approved** | R1; achievement scope N7b |

**Open rows: 18 decision groups (B1–B18)** in [REMAINING_DECISIONS.md](REMAINING_DECISIONS.md). The specification stays open until
each one has a ruling.
