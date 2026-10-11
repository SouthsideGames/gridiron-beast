# Gridiron Beast — 7v7 → 11v11 Football Systems Audit and Migration Plan

**Decision:** LOCKED — full 11-on-11 American football. **Audit date:** October 11, 2026. **GDD target:** v3.1. **Implementation:** NOT STARTED. The playable HTML prototype remains 7v7 v3.0 pending phased migration.

## Executive finding

The present game is not an NFL-style 11-on-11 simulation. The roster has 14 starter monsters (7 offense, 7 defense), the practice formations draw seven per side, and the match renderer uses separate hard-coded seven-player coordinate arrays. The Friday game-plan catalog contains 10 offensive and 10 defensive play names, but its entries are not 11-player tactical definitions. The practice simulator groups several play names into shared route templates, and the Sunday engine uses randomized yardage rather than blocking, coverage and pursuit resolution. **Simply increasing the player count would preserve invalid football logic.**

## System-by-system audit

| System | Observed current HTML implementation | 11v11 requirement | Risk | Migration |
|---|---|---|---|---|
| Starter roster | 14 starter monsters, 7 per side; QB, WR×2, RB, OL×3; DL×2, LB×2, DB×3 | 11 offense + 11 defense with legal personnel and eligible positions | Critical | Replace positional slot model, do not invent acquired monsters |
| Depth chart | Hard-coded 7-player offensive/defensive rows and OL/DL/DB grouping | Five OL, QB, RB, TE, 3 WR; 4 DL, 3 LB, 2 CB, 2 S as base | High | Data-driven slots, packages and bench |
| Eligible substitutions | Prefix-matching generic positions; recruits assigned to chosen slot without true position eligibility | Position eligibility, archetypes, development and substitution packages | High | Stable position IDs and eligibility matrix |
| Practice | Seven blue and seven red shapes, name-based route and defense scheme templates | 22 actors, assignment-driven motion, collision/possession resolution | Critical | Rebuild around 11-player JSON plays |
| Offensive playbook | 10 names; routes grouped into run/deep/screen/other; generic OL blocking | 11 individual responsibilities per play, formations, personnel, blocking and QB progressions | Critical | Re-author and validate every concept |
| Defensive playbook | 10 names; coverages inferred by keywords; 5-zone 7v7 Cover Two | 11 assignments, fronts, run fits, rush/coverage, nickel/dime substitutions | Critical | Re-author every coverage, blitz and front |
| Play editor/unlocks | Create Play gated; limited playable authoring | Hybrid editable routes, assignments, audibles, unlocks | High | Defer authoring until 11v11 schema and renderer |
| Friday Head Coach Office | Five offensive and five defensive *names* | Select five validated plays each, including compatible personnel and substitutions | Medium | Retain workflow; change catalog to IDs |
| Sunday match | 7 vs 7 static schematic, simple snap/yardage randomizer, limited opposing AI | 22 actors, football rules, ball physics, drives, defense and decisions | Critical | Replace match engine in stages |
| Play clock | 40-second live timer exists | Retain, ensure snap/penalty/reset/pause correctness | Medium | Regression test |
| Monster nature/stats | Permanent natures and effective attributes; position archetypes partly generic | Position-specific football ratings, blocking, coverage, tackling, pass rush | Medium | Preserve natures; map new rating uses |
| Staff & scouting | HC, OC, DC, scout; preferences and regions | 11v11 scheme fits and depth/position scouting | Medium | Preserve staff, revise tactical effects |
| Weekly schedule | Monday–Sunday franchise workflow | Unchanged | Low | Regression only |
| League/promotion | Three tiers, 16 clubs/tier, 10-week schedule, one-slot promotion design | Unchanged | Low | Regression only |
| Rival & archives | Per-tier rival, scheduled rivalry markers, archived seasons | Unchanged | Low | Regression only |
| Save format | Current franchise saves have 7v7 slots and play names | Versioned, non-destructive migration | Critical | Snapshot legacy save; migrate IDs and leave missing positions open |
| UI | Pixel-art direction, mobile HTML, schematic SVG | Readable 22-player formations on small screens, labels and tap targets | High | Responsive field zoom and scalable diagram coordinates |

## 11-on-11 baseline personnel

**Base offense (11):** QB, LT, LG, C, RG, RT, RB, TE, WR1, WR2, WR3. Use FLEX as a *lineup slot* for WR3 in base 11 personnel, not a fictional on-field position. Support 12 personnel (2 TE), 21 personnel (2 RB/FB) and other packages later. Exactly seven players must line up on the line of scrimmage in legal conventional formations; tackle/TE/WR eligibility must follow alignment.

**Base defense (11):** DE1, DT1, DT2, DE2, LB1, LB2, LB3, CB1, CB2, FS, SS (4-3). Additional 3-4, nickel and dime packages change positions and personnel without changing the 11-player limit. Every defensive position may blitz, with coverage/run-fit consequences.

**Roster policy:** 22 on-field roles does not require 22 distinct permanent monsters if two-way play is explicitly supported later; default model should not silently allow a single monster to occupy offense and defense simultaneously. Active-roster size, bench size, fatigue and two-way eligibility require separate balancing approval before coding.

## Playbook audit: current names are NOT certified 11v11 plays

| Existing offensive concept | Required rewrite |
|---|---|
| Quick Pass | 5-man protection, eligible routes, timing and QB progression |
| Deep Post | Distinct post route, complementary routes and deep protection |
| Power Run | Explicit pull/drive blocks, RB path and run fits |
| Screen Pass | OL release timing, target route, defenders and QB timing |
| Outside Run | Edge setting, blocking angles, RB track |
| Play Action | Run fake, protection, eligible route combinations |
| Four Verticals | Four eligible vertical routes with legal personnel |
| Slant Combo | Multiple distinct slant/flat concepts and progression |
| Inside Zone | Zone blocking and RB read rules |
| Deep Corner | Corner break, spacing and protection |

| Existing defensive concept | Required rewrite |
|---|---|
| Cover Two | Two deep halves, underneath defenders, defined pass rush |
| Man Lock | Eleven-player rush/man assignments, including matchup responsibility |
| Corner Fire | CB blitz, rotated coverage and hot-read counters |
| Run Wall | Front alignment, gap integrity and run fits |
| Zone Trap | Trap responsibility and coverage rotation |
| All-Out Pressure | Rush count, coverage sacrifice and risk |
| Deep Zone | Named coverage shell, not generic circles |
| DB Blitz | Assigned DB rush lane and replacement coverage |
| QB Spy | Dedicated spy and remaining coverage |
| Press Coverage | Press technique with specific man/zone call |

**No play passes acceptance merely because its name exists or a diagram is displayed.** Each requires legal 11-player alignment, assignment for every actor, run/pass result handling, counterplay, and visual/logic consistency.

## Migration phases and gates

**M0 — Specification and audit (this change).** Lock 11v11, publish audit, migration JSON, GDD and status. No gameplay modification. Preserve v3.0 HTML as reference.

**M1 — Personnel and roster.** New position catalog, 22 on-field slots, eligibility, starter/bench UI, package substitution, stable monster IDs, old-save migration preview. Gate: legal lineup and no duplicated or invented monsters.

**M2 — Data-driven plays.** JSON formation and play definitions; 11 assignments each; offense/defense visual diagrams, legal coverage, blocking, route paths, play unlocks. Gate: play validator rejects missing/duplicate positions, illegal alignment and invalid coverage.

**M3 — Practice simulation.** 22 sprites/shapes, real assignment paths, QB/ball-carrier control, ball flight, defender tracking, run fits and visible results. Gate: routes and possession match play outcome; defense switch changes assignments.

**M4 — Sunday match engine.** Four downs, distance, turnovers, punts, scoring, game clock, 40-second play clock, AI possessions, fatigue, tactical counters and reliable animation. Gate: complete full match with reproducible deterministic test scenarios and no free scoring loop.

**M5 — Franchise integration and regression.** Staff styles, scouting positions, training, Friday play selection, rivalry, schedules, league standings, historical stats and tier progression. Gate: old save survives and every non-football workflow is retained.

## Save compatibility and rollout

- Create a **new schema version** and preserve the original 7v7 save as a backup before conversion.
- Map legacy QB/WR/RB/OL/DL/LB/DB monsters to eligible 11v11 position groups; never create phantom owned monsters.
- Convert old play names to stable play IDs only when an approved 11v11 equivalent exists; otherwise mark the legacy entry unavailable pending replacement.
- Preserve owner identity, commissioner progress, hired staff, monster species/nature/levels, recruits, rival identities, division/tier, records, season archives and badges.
- If a roster cannot field 11 legal players, provide a transparent roster-completion flow rather than starting an invalid match.
- Keep the current HTML v3.0 playable during migration; release 11v11 only after the core lineup and practice gates pass.

## Open football-specific decisions

1. Active roster and bench size, including injuries, fatigue and optional two-way monsters.
2. Whether to support special teams (kicker/punter/returners) from first 11v11 playable milestone.
3. Whether the match is a full 100-yard field with standard downs, scoring, overtime and timing, or a shortened arcade rule set.
4. Initial starter-monster allocation and how existing 7v7 owners fill missing 11v11 positions without violating recruitment-only acquisition.
5. Exact offensive and defensive starter formations/packages to ship first.
6. Whether on-field monsters have position eligibility based on species, individual archetype or trainable secondary positions.

**Change-control requirement:** Every football migration step must update the HTML, relevant JSON, master GDD and implementation status together. Mark features as not implemented until functional tests pass.