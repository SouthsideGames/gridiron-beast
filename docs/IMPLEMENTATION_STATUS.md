# Gridiron Beast — Implementation Status

Updated: 2026-10-11 | HTML prototype: v2.8 | GDD: v2.8

This document must be updated together with every prototype and JSON change. **Locked design** does not mean implemented or tested.

| System | Design | HTML implementation | Tested | Unity |
|---|---|---|---|---|
| 16-team, two-conference, four-division league | Locked | Implemented | Fixture logic: 16 seasons validated | Not started |
| Six divisional games (home and away against each rival) | Locked | Implemented | Passed | Not started |
| Two in-conference games, opponent rotation | Locked | Implemented | Passed | Not started |
| One out-of-conference game, 8-year cycle | Locked | Implemented | Passed | Not started |
| Alternating 5/4 and 4/5 home/away | Locked | Implemented | Passed | Not started |
| Bye Weeks 4–8, rotating by year | Locked | Implemented as league-wide bye | Passed | Not started |
| Schedule viewer, preview eight seasons | Locked | Implemented | Syntax only; browser unverified | Not started |
| New season transition | Locked | Implemented, postseason bypass warning | Syntax only; browser unverified | Not started |
| Three-tier League Central browsing | Locked | Tier tabs, division lists and placeholder records implemented | Syntax checked, Safari unverified | Not started |
| Promotion badges and challenge unlocks | Locked | Badge data initialized; challenges not implemented | Not tested | Not started |
| Consecutive bottom-four relegation and financial consequences | Locked | Rules documented; movement not implemented | Not tested | Not started |
| 48-team league simulation and standings | Locked | Placeholder team names/0–0 records only | Not tested | Not started |
| 8-team, 3-week Beast Bowl playoffs | Locked | Display only | Not tested | Not started |
| Owner creation and mandatory staff hires | Locked | Partial | Browser verification needed | Not started |
| 12 monster types and 25 natures | Locked | Partial | Browser verification needed | Not started |
| Scout reports and Tuesday recruitment | Locked | Partial | Browser verification needed | Not started |
| Interactive roster depth chart | Locked | Partial | Browser verification needed | Not started |
| Friday 5 offense / 5 defense playbook | Locked | Partial | Browser verification needed | Not started |
| Full 7-on-7 football, defense and match AI | Locked | Early simulation | Not ready | Not started |
| Draft, trade, contracts, free agency | Locked | Planned | Not tested | Not started |

## Schedule acceptance test results

Verified deterministic scheduling for 16 seasons × 16 teams:
- Exactly 9 games and 1 bye per team, in 10 regular-season weeks
- 6 divisional, 2 same-conference inter-division, 1 opposite-conference
- No club double-booked within a week; 8 reciprocal fixtures in each active week
- Each team's home count alternates 5 and 4 by season
- All 8 opposite-conference teams faced before repeating
- Bye moves among Weeks 4, 5, 6, 7 and 8
- Zero failures in these logic checks

Fixture parity examples: [tests/schedule-vectors.json](../tests/schedule-vectors.json).

**Not yet verified:** complete Safari end-to-end game flows, saved-season migration and actual league standings/postseason simulation.

## Change control

Every implementation task must update the code, any applicable JSON definitions, the [master GDD](GRIDIRON_BEAST_MASTER_GDD.md), and this status register. For any Unity migration, preserve approved rules and identify any HTML features that are still incomplete rather than treating placeholders as final behavior.

## v2.3 three-tier update
- League Central added to Headquarters with tabs for Challenger, Vanguard and Sovereign.
- Commissioner now explains starting tier, four-title promotion challenge unlock and two-season bottom-four relegation rule.
- Canonical JSON and master GDD updated together.
- Records in other tiers remain 0–0 placeholders, not simulated standings. AI promotion, relegation and tier exchanges are not active.
- Mandatory pending decisions: promotion/relegation exchange count, promotion challenge format, rating-band enforcement, AI championship accumulation, and relegation economics.
- JavaScript syntax validated; full Safari interactions not yet tested.

## v2.4 promotion/relegation rule update

- LOCKED: one reciprocal exchange slot per adjacent tier pair per offseason.
- LOCKED: single winner-take-all challenge; no automatic promotion.
- LOCKED: team OVR bands are starting classifications only.
- LOCKED: relegated teams retain historical badges but must earn new qualifying championships.
- HTML: League Central text, badge qualification display, and pure eligibility/exchange evaluation logic updated. JavaScript syntax checked.
- JSON: data/league.json version 4 contains the new rules.
- Not implemented: actual championship awarding, AI standings, challenge match gameplay, tie-breaking, relegation consequences, and tier membership swaps.
- Unresolved: selection priority when multiple clubs qualify, challenge venue/ties/retries, and AI qualification.
- Browser playthrough and Unity port remain unverified.

## v2.5 season archive update

- LOCKED: no player-facing future-season schedules; selector includes only current and archived years.
- HTML: current-season schedule and archive selection implemented; Next Season snapshots completed schedule, available W/L record, results, tier and championship badge totals.
- HTML: archived seasons are read-only and retain original opponents, home/away and bye information.
- Not implemented: individual monster season statistics, postseason simulation and retroactive recovery of incomplete old saves. These are labeled unavailable.
- JavaScript syntax checked; full Safari end-to-end save/reload test not yet completed.
- Unity parity: versioned seasonHistory save data, immutable archive snapshots, migration and season-history regression tests.

## v2.6 rival GM feature

- LOCKED: Owner selects a new same-division rival GM after team selection.
- LOCKED: Separate rivals per league tier; previous rival history remains available across tier movement.
- HTML: Sixth commissioner onboarding step with rival radio selection and GM names; saved Challenger rival; existing-save default rival migration; current tier rival in League Central; rival schedule labels; archived rival snapshots.
- JSON: data/league.json version 6 contains rivalry requirements.
- Planned: Rival head-to-head record calculations, rival GM story events, playable higher-tier introduction, persistent AI rival growth and distinct finalized 48-team roster.
- Testing: JavaScript syntax verified; end-to-end Safari interaction unverified.

## v2.7 rival assignment correction

- Revised rule: rivals are automatically randomly assigned from the other three franchises in the owner's division; no player selection or reroll.
- HTML: commissioner rival reveal replaces selectable radio options; assignment persists across navigation; new tier rival defaults are randomized.
- Existing save data retains its assigned rival. Higher-tier promotion cutscenes remain unimplemented.
- Updated data/league.json and master GDD. JavaScript syntax checked, full Safari interaction unverified.

## v2.8 visual gameplay and UI revision

- Removed post-hiring coaching candidate comparison; hired staff diagrams remain.
- Removed always-available Headquarters Exhibition Game shortcut; official Sunday game remains accessible via the weekly calendar. Direct weekday match navigation is blocked.
- League Central player-owned franchise highlighted bold italic with contrast and explicit YOUR TEAM.
- Practice now includes an SVG field with seven offensive and seven defensive players, ball motion, and animated route/run demonstration, with result shown at the end. This is not full pixel-art gameplay.
- Offensive and defensive playbooks now display play diagrams rather than only play names.
- Updated data/ui-gameplay.json for Unity parity.
- JavaScript syntax validation passed; actual mobile Safari interactions and animation performance are not yet verified.
- Known limitation: Sunday match movement remains simplistic; full route animations, defensive pursuit and ball physics are future work.
