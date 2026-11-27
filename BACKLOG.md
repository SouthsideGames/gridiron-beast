# Held changes

Items the owner has asked to hold. Implement on "PROCEED" (all) or "PROCEED n" (some); "DROP n" removes one.

3. **Finalize the monster roster before Prototype 2 (gate).** DONE (merged, PR #27). Done: 72-species dex with fixed element, natural + secondary position and rarity (`src/data/species.js`); 16×16 body-template sprites with patterns; recruiting by region and rarity (rares in one home region from week 4, legendaries never scouted); Beast Dex screen on the main menu (seen / signed / ???); owner's round-1 names applied; naming guide (`docs/MONSTER_NAMING.md`); old saves migrate. Still open before merge:
   - Prototype 2 (GDD §15) is built on the `prototype-2` branch; see §15.12 for the numbers that need playtest tuning. Gym coach names and lines are drafts for the owner's review.

## Future development

20. **Roster Depth and Rotation Effectiveness** (deferred enhancement, owner 2026-11-26; not a release blocker). The production rules stay
    as they are: weekly recovery 28, full starting stamina, injury odds, Durability weights, rotation thresholds, fatigue gain and bench ratings.
    Findings (`reports/balance-impl/FINAL_DECISIONS_REPORT.md` §7, `FINAL_CALIBRATION_REPORT.md`; evidence in `reports/balance-impl/decisions/stamina/`):
    - In the controlled study a thin-bench roster beats a balanced roster by about 2.5–3.5 wins a season on the same payroll.
    - Reserves play about 3.3% of snaps under balanced rotation.
    - Heavy rotation raises reserve snaps (to about 11%) but makes the team weaker (−1 to −3 wins).
    - Lowering weekly recovery below 28 did not make depth meaningfully more valuable.
    - Linking weekly fatigue to starting game stamina did not either (variants B and C).
    - Investigate next: substitution thresholds, in-game stamina use, how well rotation works, and how roster building values reserves.
    - Reusable tools: `tools/balance-audit/roster-season.mjs` (`--fatigueStart`, `--practice`, `--rosterSize`, `--recovery`),
      `calib-experiment.mjs`, `calib-hooks.mjs`.

## Done
1. Recruiting: ⓘ compare prospect with roster — done (sheet with headline ratings, OVR, age, starter/package tags, verdict, cap after signing).
2. Species-consistent sprites — done (shape from species, colour from type, small per-individual tint).

## Playtest notes, round 2 — done (PROCEED 2026-10-14)
4. Depth chart view on Roster (Starter / 2nd / 3rd per position, reorderable); injuries promote the next monster in order.
5. Full-roster week: recruiting signs via "release to make room"; scheme-fit makes recruiting worthwhile.
6. Scheme-fit outline on prospect and roster cards (based on coordinators' schemes).
7. More menu: remove Salary & Contracts and Franchise History (already on Roster and League).
8. News: bold the rival's team name.
9. Training: success odds, injury risk, intensity choice; same focus 3 weeks running likely fails.
10. Opponent scouting: play art for scouted calls; AI teams equip exactly 6+6 and only call those (they currently carry 15/9). Check the "Star ~48" line.
11. Coaching hints: recommended counter plays outlined in the game plan after scouting; Settings toggle.
12. Saturday media day: questions whose answers boost monsters of certain natures; lineup check folds into it.
13. Animate kickoffs, punts, field goals and returns.
14. Monster sprites on the field instead of circles/squares; Settings toggle for simple markers.
15. Reduce weekday tedium: "Auto-run to Sunday" with staff defaults.
16. Save lost after the app sat in the background: move saves to durable storage plus auto-backup.
17. AI challenge: difficulty setting; ongoing AI improvement.
18. Named awards (MVP, OPOY, DPOY, ROY, Coach of the Year) and an Award Watch panel.
19. Halftime and final box score: leaders per category, team totals, Players of the Game, monster stats (abilities, jukes, broken tackles).
