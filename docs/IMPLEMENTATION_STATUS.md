## v4.0 lightweight salary management — implemented in HTML, mobile QA pending
- Challenger / Vanguard / Sovereign annual caps: 2,500,000 / 3,700,000 / 5,200,000 credits.
- All rostered monsters (including injured) and all five staff salaries count against the cap. Existing monster saves without salary use a deterministic fallback; newly generated monsters store a fixed annual salary.
- Budget summaries are visible in Headquarters, roster and hiring. Hiring cards show projected remaining room and prevent unaffordable hires.
- Salary Management allows confirmed permanent roster releases, with a 22-monster minimum. Over-cap status blocks Sunday entry, Snap and special-teams actions.
- Verified in isolated JavaScript test: a 40-monster starter roster with a 755,000-credit staff package totals 2,111,280 credits, leaving 388,720 under Challenger's 2,500,000 cap. Additionally, all nine fixed offensive/defensive cornerstone combinations were tested with a 765,000-credit staff sample and remained under the 2,500,000-credit Challenger cap (minimum 377,600 credits remaining). This does not cover every staff combination or browser path.
- Updated data/salary-caps.json and data/league.json; master GDD v4.0 records the rules and C# parity requirements.
- **Known gap:** Tuesday recruitment currently records prospects in a separate recruited list and does not automatically add them to the 40-monster salary roster. Recruit signing, salary validation and replacement decisions must be integrated before this economy is considered complete.
- Not yet verified: end-to-end iOS Safari UI, import/export salary migration, relegation-to-lower-cap scenario, game lock under all navigation paths, or AI franchise payroll.

## v3.9 toggle repair and Unity parity tracking
- FIXED IN SOURCE: practice line visibility, flip, monster icon and target controls now trigger an immediate redraw rather than waiting for another practice rep. The practice preview and replay use the same simulation renderer.
- FIXED IN SOURCE: switching plays clears the prior replay preview; toggling display controls does not alter completed simulation outcomes.
- CONFIRMED: HTML JavaScript syntax validation. NOT YET CONFIRMED: physical iOS Safari tap behavior or full game regression.
- UNITY PORT CONTRACT: treat working HTML gameplay and the GDD/JSON as the behavioral reference, with explicit acceptance tests and known-issues register. Do not claim all prototype systems are Unity-ready until tests are green.
- PENDING: C# parity matrix, JSON schema audit, deterministic fixture pack, complete coordinator play implementation, full UI flow and persistence regression.

## v3.8 practice and coordinator improvements
- QB awareness now influences receiver-read quality using separation from defenders and downfield progress. Forced WR1/WR2/WR3/TE/RB target selection is available in practice for pass plays; run plays disable it.
- Practice has Show Play Lines, Flip Play and Show Monster Portraits toggles. The 'portraits' are currently roster-linked elemental/emoji icons rather than finished sprite artwork.
- Game-day Flip Play control added; mirrored actor positions retain upright labels. Play geometry remains simplified.
- Each OC and DC candidate offers ten plays aligned to their philosophy. Practice uses hired staff's catalog; match play selector uses the same package except when Friday's five-play plan overrides it.
- Coordinator packages synchronized in JSON. Some new play names lack distinct 11-assignment play definitions and unique match behavior; this remains unfinished.
- Engine test: five forced passing targets selected correctly. Awareness sample shows greater selection of the top-rated open target at high QB awareness. Syntax and direct engine simulation checked, but full Safari click-through has not been verified.

## v3.7 simulation tuning and validation addendum
- The new engine accepts position-specific starting-monster OVR ratings and uses them to influence movement speed; same play, defense and seed reproduce identical frames.
- The pass target pool now favors eligible WR/TE rather than repeatedly selecting RB checkdowns. Seeded QB throw accuracy produces some incomplete passes.
- Retested 300 plays (100 each Power Run, Quick Pass, Deep Pass): mean gains 2.68, 13.74 and 14.97 yards; 15 incompletions total; 300/300 final ball spots consistent with recorded yards. All completed sampled plays still ended in tackles, so outcome diversity and balance need additional work.
- Practice and Sunday home snaps use engine.js; away drives remain probabilistic. Player OVR is used for movement only, not yet for catches, blocking quality, tackling or decision-making.
- Full mobile Safari UI test and end-to-end franchise save regression remain outstanding.

## v3.7 simulation-first football engine (October 11, 2026)
- Added standalone engine.js and loaded it before the HTML prototype script.
- Practice now simulates 22 moving actors, pass flight, pass catch/incompletion, defender pursuit, offensive-line interference, contact tackles and sacks. The reported yardage is calculated from the ball's final x-coordinate relative to the line of scrimmage, not randomly awarded in advance.
- Sunday home-team Snap now uses the same engine and plays back recorded simulation frames before applying the result to down/distance and scoring.
- Seeded player speed variation added. Engine simulation is deterministic for a given play/defense/seed.
- Validation: JavaScript compiled and 300 headless simulated plays ran without exceptions; final ball-spot and yardage were consistent. **Balance not acceptable yet**: all sampled plays ended in tackles, runs averaged roughly 2 yards, and deep passes averaged roughly 12 yards. This is a vertical slice, not a completed football engine.
- Limitations: simplified geometric collisions; route paths not yet fully authored per JSON play; monster-specific attributes not yet wired into the new engine; opposing-team drives still use the old probabilistic simulation; Sunday animation uses a fixed 600×260 field and is not yet tied to world-coordinate field scrolling; limited incomplete/sack diversity; Safari interaction not tested.
- Next: improve pass rush and blocking balance, distinct play-specific routes, monster attribute effects, opponent simulation parity, accurate match clock/quarter transitions, and mobile visual QA. Preserve all franchise data and saves.

## v3.6 targeted fixes — committed, mobile testing pending
- Head Coach hiring and staff room now show leadership responsibilities rather than offensive plays; OC/DC retain distinct tactical playbooks.
- Coordinator play diagrams are tappable and enlarge in a modal; offensive previews hide defenders, defensive previews retain them.
- Starter selection has a Details button displaying nature, illustrative stats, ability explanation and injury susceptibility.
- Injury susceptibility is persisted on newly generated monsters and included in preliminary injury-risk calculations.
- Practice ball carrier/receiver final x-position is tied to the same yard value shown in the result and a visible gain marker; zero-gain plays are labeled accordingly.
- Important limitation: yardage remains probability-selected BEFORE animation; collisions do not determine gain. Sunday match remains a simplified probabilistic engine and is NOT corrected by this practice-only change.
- JavaScript syntax checked. Safari end-to-end interactions and actual match outcomes not verified.

# Current implementation status — HTML v3.6, GDD v3.6

The owner has authorized gameplay conversion. HTML now draws 11 players per side and includes a 40-monster roster model, but the football simulation is **not fully migrated**. Historical status below reflects prior milestones.

| System | Status | Notes |
|---|---|---|
| Fixed 3-choice offensive and defensive starters | Implemented, browser test pending | One chosen each; OVR 67–70 |
| 40-monster roster | Implemented, browser test pending | 22 starters, 18 reserves including K/P |
| 11v11 depth chart and eligible substitutions | Implemented, browser test pending | Secondary group eligibility; penalty balance incomplete |
| Fifth mandatory Monster Trainer | Implemented, browser test pending | Three candidates |
| Wednesday temporary trainer bonus | Basic implementation | No permanent stat growth |
| XP, fatigue and injuries | Basic implementation | XP at completed match, simple injury probabilities |
| 22-player practice and match diagrams | Implemented schematically | SVG shapes, not finished sprites |
| 20 plays with 11 assignments in JSON | Provisional | NOT connected to full simulation |
| Field goals and punts | Basic implementation | Probability model, no special-team animation |
| Full 11v11 tactical match AI | Not implemented | Legacy stochastic outcome model persists |
| Legacy save migration and regression | Partial / untested | No data deletion intended; test existing saves |
| League tiers, schedules, rivals and owner flow | Preserved in code | Full regression not yet verified |

## Immediate acceptance tests
1. New owner → rival → offensive starter → defensive starter → all five hires → HQ.
2. Confirm exactly 40 monsters and 22 starting positions; starter is highest-rated on each side.
3. Switch offensive/defensive depth chart and assign eligible healthy backup.
4. Run practice and verify 22 shapes and routes.
5. Wednesday training bonus affects game and expires after game; no permanent stats changed by trainer.
6. Test game XP, injuries and simplified punts/field goals.
7. Reload and verify prior league history, staff, rivals and saves.

**Testing completed:** JavaScript syntax checked after each change. Full Safari playthrough and deterministic match integration tests not completed.

---

# Current migration status: 11-on-11 LOCKED, NOT YET IMPLEMENTED

The playable HTML prototype remains v3.0 7-on-7. Do not describe it as 11-on-11. New football development is gated by the migration plan. Non-football franchise systems are preserved. See [audit](FOOTBALL_11V11_MIGRATION_AUDIT.md).

# Gridiron Beast — Implementation Status

Updated: 2026-10-11 | HTML prototype: v3.0 (legacy 7v7) | GDD: v3.4 (11v11 design locked)

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

## v3.0 Madden-style schematic practice improvements

- Defensive dropdown redraws formation instructions before a rep.
- Man Lock: assignment lines and tracking; Cover Two/zone: coverage circles; Corner Fire/blitz: rush arrows and rusher motion.
- Completed pass: football interpolates to receiving monster; run: football stays with ball carrier after handoff. Stopped passes do not show receiver possession.
- Playbook diagrams now vary by man, zone and blitz instead of reusing near-identical overlays.
- Updated data/ui-gameplay.json and master GDD v3.0.
- JavaScript syntax validated. Mobile Safari visual/interaction tests remain unverified.
- Limitations: no genuine collision, pass interception, defender reaction AI or true yard-accurate animation yet; full Sunday match still needs animation overhaul.

## v3.0 formation and assignment correction

- Implemented shared offense and defense 7-on-7 positional formation definitions across practice and playbook diagrams.
- QB now lines up behind OL1/OL2/OL3, with WR1/WR2 wide and RB in the backfield.
- Replaced numeric player labels with positional abbreviations.
- Cover Two draws five coverage zones owned by LB1/LB2/DB1/DB2/DB3, plus DL1/DL2 rush arrows.
- Offensive route arrows and OL blocking directions are visible before and during practice.
- Schematic motion still lacks true football collision, possession and play-calling AI. Visual validation on Safari remains outstanding.
- Updated data/ui-gameplay.json and GDD v3.0.

## v3.0 position and coverage correction
- Corrected QB alignment behind three offensive linemen.
- Position labels replace numeric IDs; WR and RB align as 7-on-7 skill positions.
- Offensive routes and line blocking instructions are displayed with defensive instructions.
- Cover Two now uses five assigned coverage zones and two DL rushers.
- HTML syntax and source inspection performed; mobile Safari playthrough remains unverified.

## v3.1 football format decision and migration readiness

| Item | Status | Evidence |
|---|---|---|
| 11v11 football design decision | LOCKED | GDD Section 26 |
| Existing 7v7 systems audited | COMPLETE | docs/FOOTBALL_11V11_MIGRATION_AUDIT.md |
| JSON migration contract | COMPLETE | data/football-11v11-migration.json |
| 22-player starter roster and depth chart | NOT STARTED | Current HTML remains 14 starters |
| 11-player offensive/defensive JSON plays | NOT STARTED | Existing names are concepts, not certified plays |
| 22-player visual practice | NOT STARTED | Current renderer 7+7 |
| Full 11v11 match engine | NOT STARTED | Current renderer 7+7; stochastic yardage |
| 11v11 save migration | NOT STARTED | Must preserve existing saves and monster progression |
| Owner/staff/scouting/leagues/schedules/rivals | PRESERVE | Regression test in migration phase M5 |
| HTML release version | v3.0 LEGACY | No premature v3.1 gameplay version claim |

**Next development gate:** M1 roster/personnel and legacy-save compatibility. Do not begin M2 playbook implementation until legal 11-player lineups and position eligibility are specified. Existing game data and saves must not be erased or overwritten.

## v3.2 specification update
The fixed three-choice offensive and defensive starter pools, one selection per side, OVR 67-70, and highest-rating-on-side requirement are approved. A fifth mandatory staff role, Monster Trainer, is approved. Tuesday remains recruitment; Wednesday training grants temporary weekly game bonuses only. HTML remains legacy v3.0. No gameplay changes authorized until explicit approval.

## v3.3 design lock — implementation on hold

- LOCKED: 40-monster total franchise roster including starters, reserves and specialists.
- LOCKED: balanced injury frequency; visible fatigue and injury status, with temporary fatigue-related performance/risk effects.
- LOCKED: simplified special teams (field goals and punts prioritized; kickoff/returns simulated initially; PAT must be resolved).
- LOCKED: permanent stat growth only through game XP and level-ups.
- LOCKED: Wednesday trainer buffs are temporary current-week performance modifiers; never permanent growth or XP multipliers.
- Updated data/football-11v11-migration.json schema v3 and master GDD v3.3.
- NOT IMPLEMENTED: roster conversion, health/injury engine, special teams, trainer effects and 11v11 gameplay.
- HTML remains v3.0 legacy 7v7. No runtime changes authorized until user says proceed.
- Open: positional quotas, initial roster population, injured reserve, two-way roles, formulas, special-teams resolution and XP distribution.

## v3.4 design-only approval

- LOCKED: injured monsters remain within the 40-monster cap, replaced from existing eligible roster.
- LOCKED: compatible secondary positions permitted with reversible effective-performance penalty; no automatic full two-way eligibility.
- LOCKED: short injury recovery — minor 0–1 weeks, moderate 2–3, severe 4–6.
- LOCKED: participation XP plus bonuses for meaningful individual contributions; trainer buffs never award permanent growth or XP multipliers.
- Updated GDD v3.4 and data/football-11v11-migration.json schema v4.
- NOT IMPLEMENTED: these rules, 11v11 roster, injury engine, XP awards, secondary-position calculations or save migration.
- HTML remains legacy v3.0. Continue implementation hold until the owner explicitly says proceed.
- Pending: roster composition, starter definitions, eligibility matrix, penalty rates, injury probabilities, XP scaling, special-teams rules and save migration.
