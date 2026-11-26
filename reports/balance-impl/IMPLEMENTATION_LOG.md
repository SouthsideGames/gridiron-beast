# Balance audit implementation log (working notes for the final report)

Branch `impl/balance-audit-2026-11`, from audit `d1f2d79` (game code = `main` `58c33ee`, v43.50.0-sideline).

## Phase 1: tools and baselines (R-3)
- `tools/lib/ability-strip.mjs`: one "abilities off" control for every study tool. It strips the slots, kicker, returner, bench and rotation pool, and asserts that nothing is left.
- Applied to `passing-calibration`, `task10-ability-strength`, `defense-audit` and `defense-fix-compare`. A control game that executes any ability now fails the run.
- Removed the audit-only `tools/balance-audit/passing-calibration-rotation-strip.mjs`, which is superseded.
- Test `tests/ability-strip.test.js` (3 tests).
- Corrected baselines are in `baseline/`. With abilities off there are 0 executions; completion is 59.7% off against 55.0% on.

## Phase 2
### R-0: Board forecast uses the real league
- `startSeason` rates AI clubs at their persistent strength (`aiTeam`) once a league exists, otherwise at today's generator.
- Talent, expected win % and Coach of the Year all read `f.season.expectations`, which now holds the real strength.
- Old saves keep the current season's stored expectations, because they are only written at season start.
- Live-Board traces (hands-off owner, 5 seasons):
  - Pro seeds 1–3: 0 of 3 dismissed (audit: 3 of 3).
  - All-Star seeds 1–3: 1 of 3 dismissed, after 2-12, 5-9 and 3-11 (audit: 3 of 3). The other two owners met their goals in 9 of 10 seasons.
  - In all: 1 of 6 dismissed, against the audit's 6 of 6 (experiment X-2: 2 of 6). The one dismissal followed three clearly losing seasons.
  - Missed goals still occur (Pro seed 3 went 5-9 with confidence −1), so the Board still bites.
  - Caveat: Pro seeds 1–3 and All-Star seed 1 ran on R-0 alone. All-Star seeds 2–3 started after the R-1 and R-6 commits, so they ran with those too.

### GM and coaching turnover
- None exists for AI clubs: `headCoachName` is fixed per franchise, gym coaches are fixed, and the staff allowance is fixed ("no carousel, no poaching, no promotions").
- **Deferred, as instructed.** Not built; the rival is unchanged.

### R-1: attribute uses
- DL Speed: added to the pass-rush shed, as 0.2 × (Speed − 40).
- Defender Catching: sets the pick reach (1.0 yd at 35; about 1.24 at 65 and 1.48 at 95).
- Zone Coverage: reaction weight 0.30, contest reach ×(1 + 0.6Δ), contest weight 0.45.
- All three are centred on the typical new-league starter (`R1_TYPICAL`: DL Speed 40, DB Catching 35, zone Coverage 45; measured over 300 generated clubs: 35, 30–31, 36–48).
- DL Tackling: works per sack attempt (finish 52 → 72%). Only the Lab trial was saturated; it is now fixed in the Lab (finish 46.5 → 77%). No engine change.
- RB Awareness: works modestly through vision (yards per carry 4.28 → 5.08). Pending: decision after the attribute sweep.
- Game level, 500 mixed games (seed 1), audit → first version (centred on 65) → final version (centred on typical):

  | Measure | Audit | Centred on 65 | Centred on typical |
  |---|---|---|---|
  | Completion % | 52.8 | 53.3 | 53.1 |
  | Sacks, % of dropbacks | 2.7 | 2.7 | 2.8 |
  | Interceptions, % of attempts | 1.1 | **0.7** | 1.1 |
  | Points per team-game | 12.87 | 13.03 | 12.69 |
  | Yards per carry | 5.31 | 5.46 | 5.33 |

  Centring on 65 cut interceptions by a third, because real defenders' Catching is about 30. Centring on the typical starter fixed it.
- Targeted tests: 76 of 76 passed (attr-trials, coverage, def-fixes, def-scenario, pursuit, run-game, zone-intel, engine), on the version centred on 65.

### R-6: emergency positions
- `EMERGENCY_POSITION` in `personnel.js` (the approved table).
- The cover fills base slots only, last resort, best by the slot position's overall on his own attributes:
  - before the game: `buildDepthChart`, after every base slot's own-position pick; `legalFiller`;
  - in the game: `selectUnit`, a second pass;
  - the engine fallback: `pickSlots`;
  - the play check: `eligiblePlays` → `emergencyFeasible`, exact for the one-cover-per-position table.
- Removed the dormant ×0.9 secondary-position attribute factor in `effectiveAttributes`, so there is no artificial penalty. It was unreachable under one-position eligibility.
- Normal eligibility is unchanged (`canPlay`, one position per family). The owner cannot list a beast at his emergency position. Package slots never take a cover.
- Forfeit, when it is still unavoidable:
  - `lineupForfeit` keeps the played score, quarter and clock (`state.forfeit.played`); the official result stays 0-21;
  - stats played stay recorded (as before);
  - league, player, fixture and playoff results carry `forfeit`, `inGame`, `forfeitBy` and `playedScore` (`inGameForfeit`);
  - League News names it ("forfeit: no legal lineup mid-game; 14-3 when play stopped").
- Lineup interface: an emergency cover is announced in the match strip and in Lineup & Substitutions ("X (K) covers QB in an emergency"). The depth chart already shows the slot chip on the cover.
- Mapping validation:
  - **K → QB is the only QB cover.** A kicker at QB plays on his own attributes. In the repro (seed 11) he went 4 of 15 for 56 yards with one interception, plus a 17-yard run, and still kicked. That is weak but legal.
  - **Nobody covers K**, so an empty K is still a forfeit.
  - Flag, not a problem: a K at QB who is then hurt leaves both slots to the next cover (none for K).
  - The other mappings use the same formation slots and attributes the engine already reads. No technical problem found.
- Repro (`repro-ingame-forfeit`, seeds 11–13, every home QB hurt in Q3): no forfeit. The games finished 17-3, 0-7 and 7-24.
- Test: `tests/emergency-positions.test.js` (7 tests).
