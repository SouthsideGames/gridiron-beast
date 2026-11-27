# Final achievement calibration

Branch `feature/achievement-overhaul-200` (PR #192), on main after the balance merge (`eff67df`), 2026-11-27.
Owner brief: "Final Merge, Achievement Calibration and Mobile Update", §6–7.

Tools and evidence:
- Tools: `tools/achievements-calibration.mjs` and `tools/achievements-calibration-report.mjs`.
- Evidence: `reports/achievement-audit/data/`, which holds the six careers (gzipped) and the summary.

## 1. Executive summary

**The catalogue design is preserved.**
- Exactly 200 achievements.
- The category totals and the rarity totals (50 / 45 / 45 / 35 / 20 / 5) are unchanged.
- The 24 original ids, earned records and cutscenes are unchanged.
- No row changed category or rarity.

**What changed:**
- 22 thresholds, set from measured distributions.
- One rule: "Record Breaker" no longer counts year-one records.
- One requirement now counts: "Drafted a Winner" needs three awards won by your draftees, instead of one.
- Two renames to match new thresholds: "Four on the Board" and "Sack Specialist".
- The provisional flag is removed from all 40 rows that carried it.

**How it was measured:**
- **Careers.** Six 15-season careers through the production lifecycle, all on the merged build: Rookie, Pro and All-Star, two seeds each.
  - The owner is the hands-off one (soak policy). It is kept in its job if the board fires it.
  - It never uses a developer shortcut, so every career stays eligible.
  - These careers produced 653 recorded box scores and 45 recorded seasons.
- **Targeted scenarios.** A positive and a negative case for every one of the 137 catalogue metrics. They cover the rows the simulated owner can't reach.

**Shape of the result** (before adjustments, 6 careers):

| Rarity | Rows | Share of row × career unlocks | Unlocked in season 1 | Median first-unlock season |
|---|---|---|---|---|
| Common | 50 | 83% | 48% | 1 |
| Uncommon | 45 | 68% | 22% | 3 |
| Rare | 45 | 44% | 6% | 6 |
| Epic | 35 | 27% | 8% | 6 |
| Legendary | 20 | 5% | 0% | 11 |
| Mythic | 5 | 0% | 0% | — |

- The rarities are well separated.
- Legendary rows are rare: 6 unlocks in 120 row-careers. Mythic rows never unlock passively.
- About 8% of Epic row × career unlocks came in season 1. Most were titles, 12-win seasons and Legend Tracks in the strongest Rookie and Pro careers, which is earned success. Of the adjusted rows, only the field-goal and passing rows contributed.
- Season 1 grants 21–52 unlocks, mostly Common rows plus the start-of-career originals. That is intended: Common rows are the accessible milestones.
- Every later season adds 0–13, so there is no early exhaustion: careers were still earning in seasons 11–15.

**Release-blocking issues:** none. No row is impossible, needs a redesign, or conflicts with an approved rule. A few rows depend on actions the simulated owner never takes (section 6); they are validated by scenario.

## 2. Complete calibration results

Columns:
- **Unlocked:** how many of the 6 careers earned the row. For adjusted rows this was at the **old** threshold; section 3 replays the new ones.
- **Earliest and Median:** the season of first unlock.
- **Stage:** where the median falls (early 1–3, mid 4–9, late 10–15).
- **Overlap and exploitability:** reviewed in section 6. No duplicate requirement exists. Steps such as 150 / 250 rushing, or 3 / 4 team sacks, are intended ladders.

| ID | Name | Category | Rarity | Requirement | Threshold | Unlocked (6 careers) | Earliest | Median | Stage | Assessment |
|---|---|---|---|---|---|---|---|---|---|---|
| `first_win` | First blood | game | common | Win your first game with a franchise. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `rival_beaten` | A word from {rival} | game | common | Beat your rival club for the first time. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `rival_swept` | The sweep | game | uncommon | Beat your rival twice in one season without losing to them. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `first_badge` | The first badge | gym | common | Win your first gym badge. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `half_badges` | Six of twelve | gym | rare | Hold six of the twelve gym badges. | 6 | 5/6 | 1 | 4 | mid (4–9) | Kept |
| `all_badges` | All twelve | gym | legendary | Hold all twelve gym badges. | 12 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `winning_season` | A winning season | franchise | common | Finish your first winning season. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `undefeated` | Perfect | franchise | epic | Go unbeaten through a regular season. | 1 | 0/6 | — | — | not reached | Kept: not reached by the hands-off owner; attainable with an active owner |
| `first_playoffs` | The playoffs | championship | uncommon | Make the playoffs for the first time. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `conference_title` | Conference champions | championship | rare | Win a conference championship. | 1 | 2/6 | 1 | 1 | early (1–3) | Kept |
| `first_title` | Beast Bowl champions | championship | epic | Win the Beast Bowl. | 1 | 2/6 | 1 | 1 | early (1–3) | Kept |
| `second_title` | Two titles | championship | epic | Win a second Beast Bowl. | 2 | 1/6 | 8 | 8 | mid (4–9) | Kept |
| `first_award` | A league award | awards | uncommon | Have one of your beasts win a league award. | 1 | 5/6 | 1 | 1 | early (1–3) | Kept |
| `wins_10` | Ten wins | franchise | common | Reach 10 career wins. | 10 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `wins_30` | Thirty wins | franchise | uncommon | Reach 30 career wins. | 30 | 6/6 | 3 | 3 | early (1–3) | Kept |
| `wins_50` | Fifty wins | franchise | rare | Reach 50 career wins. | 50 | 6/6 | 4 | 5 | mid (4–9) | Kept |
| `legend_tracked` | A Legend Track | legendary | epic | Choose your first Legend Track. | 1 | 2/6 | 1 | 1 | early (1–3) | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `legend_unlocked` | A legend unlocked | legendary | legendary | Unlock a legendary beast (three Legend Tracks on one). | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `hof_eligible` | The Hall of Fame | awards | legendary | Qualify for the Hall of Fame. | 1 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `hot_seat_survived` | Off the hot seat | coaching | rare | Meet the Board’s goal while on the hot seat. | 1 | 2/6 | 10 | 10 | late (10–15) | Kept |
| `traded_up` | The phone works | trades | common | Make your first trade. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `dex_original` | The original 72 | dex | epic | Acquire a beast from all 72 original families to complete this Beast Dex collection. | 72 | 0/6 | — | — | not reached | Kept: not reached by the hands-off owner; attainable with an active owner |
| `dex_basic` | Every Basic | dex | legendary | Acquire a beast from all 120 Basic families to complete this Beast Dex collection. | 120 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `dex_all` | The complete Beast Dex | dex | mythic | Acquire a beast from all 192 families to complete the Beast Dex. | 192 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `gp_shutout` | Clean Sheet | game | common | Win a game without allowing a point. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `gp_score_30` | Thirty Up | game | common | Score 30 or more points in a game. | 30 | 6/6 | 1 | 2 | early (1–3) | Kept |
| `gp_road_wins` | Road Warriors | game | common | Win 10 road games. | 10 | 6/6 | 2 | 2 | early (1–3) | Kept |
| `gp_no_turnover_win` | Ball Security | game | common | Win a game without turning the ball over. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `gp_ot_win` | Extra Time | game | common | Win a game in overtime. | 1 | 6/6 | 1 | 3 | early (1–3) | Kept |
| `gp_hold_100` | Brick Wall | game | common | Win a game holding the opponent under 100 total yards. | 100 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `gp_blowout_20` | Statement Win | game | uncommon | Win a game by 20 or more points. | 20 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `gp_streak_5` | Hot Streak | game | uncommon | Win 5 games in a row. | 5 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `gp_home_unbeaten` | Fortress | game | rare | Win every home game of a regular season. | 1 | 3/6 | 1 | 1 | early (1–3) | Kept |
| `gp_blowout_35` | Rout | game | rare | Win a game by 35 or more points. | 35 | 3/6 | 2 | 3 | early (1–3) | Kept |
| `gp_score_45` | Points Machine | game | rare | Score 45 or more points in a game. | 45 | 4/6 | 1 | 2 | early (1–3) | Kept |
| `gp_comeback_14` | Never Out of It | game | rare | Win a game after trailing by 14 or more points. | 14 | 6/6 | 1 | 4 | mid (4–9) | Kept |
| `gp_beat_25` | Around the League | game | rare | Beat 25 different clubs. | 25 | 3/6 | 5 | 6 | mid (4–9) | Kept |
| `gp_comeback_21` | The Great Escape | game | epic | Win a game after trailing by 21 or more points. | 21 | 1/6 | 1 | 1 | early (1–3) | Kept |
| `gp_streak_10` | Unstoppable | game | epic | Win 10 games in a row. | 10 | 1/6 | 1 | 1 | early (1–3) | Kept |
| `gp_score_60` | Scoreboard Broken | game | legendary | Score 60 or more points in a game. | 60 | 2/6 | 9 | 9 | mid (4–9) | Kept |
| `gp_streak_20` | Dynasty Run | game | legendary | Win 20 games in a row, playoffs included. | 20 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `fm_seasons_5` | Settled In | franchise | common | Complete 5 seasons with this franchise. | 5 | 6/6 | 5 | 5 | mid (4–9) | Kept |
| `fm_games_100` | Century | franchise | common | Play 100 games, playoffs included. | 100 | 6/6 | 7 | 7 | mid (4–9) | Kept |
| `fm_seasons_10` | Decade at the Helm | franchise | uncommon | Complete 10 seasons with this franchise. | 10 | 6/6 | 10 | 10 | late (10–15) | Kept |
| `fm_winning_5` | Consistent Winner | franchise | rare | Finish 5 winning regular seasons. | 5 | 4/6 | 5 | 5 | mid (4–9) | Kept |
| `fm_winning_run_3` | Built to Last | franchise | rare | Finish 3 winning regular seasons in a row. | 3 | 4/6 | 3 | 3 | early (1–3) | Kept |
| `fm_points_300` | High-Octane Season | franchise | rare | Score 300 points in a regular season. | 300 | 4/6 | 2 | 2 | early (1–3) | Kept |
| `fm_twelve_wins` | Twelve and Counting | franchise | epic | Win 12 or more regular-season games. | 12 | 2/6 | 1 | 1 | early (1–3) | Kept |
| `fm_wins_100` | One Hundred Wins | franchise | epic | Reach 100 career wins. | 100 | 2/6 | 9 | 9 | mid (4–9) | Kept |
| `fm_seasons_15` | The Full Fifteen | franchise | uncommon | Complete all 15 seasons of a franchise career. | 15 | 6/6 | 15 | 15 | late (10–15) | Kept |
| `fm_wins_150` | Hall of Wins | franchise | legendary | Reach 150 career wins. | 150 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `ch_playoff_win` | Moving On | championship | uncommon | Win a playoff game. | 1 | 5/6 | 1 | 1 | early (1–3) | Kept |
| `ch_playoffs_5` | Postseason Regulars | championship | rare | Reach the playoffs 5 times. | 5 | 4/6 | 5 | 5 | mid (4–9) | Kept |
| `ch_playoff_wins_10` | Postseason Pedigree | championship | epic | Win 10 playoff games. | 10 | 1/6 | 8 | 8 | mid (4–9) | Kept |
| `ch_conf_titles_3` | Conference Kings | championship | legendary | Win 3 conference championships. | 3 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `ch_back_to_back` | Back to Back | championship | legendary | Win the Beast Bowl in consecutive seasons. | 2 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `ch_two_franchises` | Champion Anywhere | championship | legendary | Win the Beast Bowl with 2 different franchises. | 2 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `ch_five_titles` | Five Rings | championship | mythic | Win 5 Beast Bowls with one franchise. | 5 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `ch_perfect_season` | The Perfect Season | championship | mythic | Go unbeaten through the regular season and win the Beast Bowl. | 1 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `of_pass_250` | Air Raid | offense | common | Have a beast throw for 250 yards in a game. | 250 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `of_rec_150` | Go-To Target | offense | common | Have a beast catch for 150 yards in a game. | 150 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `of_rush_150` | Workhorse | offense | common | Have a beast rush for 150 yards in a game. | 150 | 3/6 | 1 | 1 | early (1–3) | Kept |
| `of_rush_td_3` | Hat Trick | offense | common | Have a beast score 3 rushing touchdowns in a game. | 3 | 4/6 | 1 | 1 | early (1–3) | Kept |
| `of_season_rec_1500` | Route Runner | offense | common | Have a beast catch for 1,500 yards in a regular season. | 1500 | 5/6 | 2 | 3 | early (1–3) | Kept |
| `of_pass_td_4` | Four Strikes | offense | uncommon | Have a beast throw 4 touchdown passes in a game. | 4 | 6/6 | 1 | 2 | early (1–3) | Kept |
| `of_rec_250` | Uncoverable | offense | uncommon | Have a beast catch for 250 yards in a game. | 250 | 6/6 | 1 | 4 | mid (4–9) | Kept |
| `of_long_80` | Home Run | offense | uncommon | Gain 80 or more yards on a single play. | 80 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `of_season_pass_3000` | Gunslinger | offense | uncommon | Have a beast throw for 3,000 yards in a regular season. | 3000 | 4/6 | 2 | 5 | mid (4–9) | Kept |
| `of_season_rush_1000` | Thousand-Yard Back | offense | uncommon | Have a beast rush for 1,000 yards in a regular season. | 1000 | 2/6 | 2 | 2 | early (1–3) | Kept |
| `of_rush_250` | Stampede | offense | uncommon | Have a beast rush for 200 yards in a game. | 200 (was 250) | 1/6 | 8 | 8 | mid (4–9) | **Adjusted:** 250 → 200 |
| `of_pass_450` | Aerial Assault | offense | epic | Have a beast throw for 500 yards in a game. | 500 (was 450) | 5/6 | 1 | 6 | mid (4–9) | **Adjusted:** 450 → 500 |
| `of_team_yards_500` | Yardage Avalanche | offense | rare | Gain 500 total yards in a game. | 500 | 3/6 | 1 | 7 | mid (4–9) | Kept |
| `of_season_pass_td_40` | Touchdown Factory | offense | rare | Have a beast throw 40 touchdown passes in a regular season. | 40 | 3/6 | 5 | 5 | mid (4–9) | Kept |
| `of_pass_td_7` | Seven Up | offense | epic | Have a beast throw 7 touchdown passes in a game. | 7 | 3/6 | 1 | 7 | mid (4–9) | Kept |
| `df_first_int` | Picked Off | defense | common | Intercept a pass. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `df_sacks_3` | Pocket Collapse | defense | common | Record 3 sacks as a team in a game. | 3 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `df_tfl_5` | Into the Backfield | defense | uncommon | Make 5 tackles for loss as a team in a game. | 5 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `df_int_2` | Ball Hawks | defense | uncommon | Intercept 2 passes in a game. | 2 | 6/6 | 1 | 2 | early (1–3) | Kept |
| `df_tackles_12` | Everywhere at Once | defense | uncommon | Have a beast make 12 tackles in a game. | 12 | 6/6 | 1 | 2 | early (1–3) | Kept |
| `df_pick_six` | Pick Six | defense | uncommon | Score a defensive touchdown. | 1 | 4/6 | 2 | 5 | mid (4–9) | Kept |
| `df_takeaways_4` | Turnover Machine | defense | rare | Force 4 turnovers in a game. | 4 | 2/6 | 5 | 5 | mid (4–9) | Kept |
| `df_shutouts_5` | Zero Club | defense | rare | Win 5 games without allowing a point. | 5 | 5/6 | 2 | 3 | early (1–3) | Kept |
| `df_season_allowed` | Lockdown Season | defense | rare | Allow 150 points or fewer in a regular season. | 150 (was 100) | 1/6 | 1 | 1 | early (1–3) | **Adjusted:** 100 → 150 |
| `df_season_sacks_25` | Sack Party | defense | rare | Record 10 team sacks in a regular season. | 10 (was 25) | 0/6 | — | — | not reached | **Adjusted:** 25 → 10 |
| `df_player_sacks_4` | Quarterback Hunter | defense | epic | Have a beast record 3 sacks in a game. | 3 (was 4) | 1/6 | 14 | 14 | late (10–15) | **Adjusted:** 4 → 3 |
| `df_int_3` | Ballhawk Clinic | defense | epic | Intercept 3 passes in a game. | 3 | 6/6 | 1 | 3 | early (1–3) | Kept |
| `df_player_season_sacks` | Sack Specialist | defense | epic | Have a beast record 7 sacks in a regular season. | 7 (was 14) | 0/6 | — | — | not reached | **Adjusted:** 14 → 7; renamed Sack Specialist |
| `df_sacks_7` | Siege | defense | epic | Record 4 sacks as a team in a game. | 4 (was 7) | 0/6 | — | — | not reached | **Adjusted:** 7 → 4 |
| `df_season_int_10` | No-Fly Zone | defense | legendary | Intercept 10 passes in a regular season. | 10 | 3/6 | 10 | 14 | late (10–15) | Kept |
| `st_first_fg` | Three Points | special | common | Make a field goal. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `st_fg_50` | Big Leg | special | uncommon | Make a field goal of 50 yards or longer. | 50 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `st_golden_boot` | Golden Boot | special | rare | Have your kicker win the league’s Golden Boot. | 1 | 2/6 | 12 | 12 | late (10–15) | Kept |
| `st_return_king` | Return King | special | rare | Have your returner win the league’s Return King award. | 1 | 1/6 | 8 | 8 | mid (4–9) | Kept |
| `st_fg_60` | From Downtown | special | uncommon | Make a field goal of 60 yards or longer. | 60 | 3/6 | 8 | 11 | late (10–15) | Kept |
| `st_season_fg_12` | Points on the Board | special | uncommon | Make 12 field goals in a regular season. | 12 | 4/6 | 1 | 5 | mid (4–9) | Kept |
| `st_kr_td` | Return to Sender | special | uncommon | Return a kickoff for a touchdown. | 1 | 3/6 | 2 | 3 | early (1–3) | Kept |
| `st_fg_3_game` | Four on the Board | special | epic | Make 4 field goals in a game. | 4 (was 3) | 6/6 | 1 | 2 | early (1–3) | **Adjusted:** 3 → 4; renamed Four on the Board |
| `st_kr_td_3` | Return Specialist | special | epic | Return 3 kickoffs for touchdowns. | 3 | 2/6 | 9 | 9 | mid (4–9) | Kept |
| `st_perfect_kicker` | Automatic | special | legendary | Make every field goal and extra point of a regular season, with at least 10 field-goal attempts. | 10 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `dx_seen_60` | Field Notes | dex | common | Face 60 different families in games. | 60 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `dx_seen_100` | Keen Observer | dex | common | Face 100 different families in games. | 100 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `dx_signed_10` | Growing Collection | dex | common | Collect 10 families in play with this franchise (founding roster not counted). | 10 | 6/6 | 3 | 6 | mid (4–9) | Kept |
| `dx_original_20` | Original Collector | dex | common | Collect 10 of the original families in play (founding roster not counted). | 10 (was 20) | 0/6 | — | — | not reached | **Adjusted:** 20 → 10 |
| `dx_signed_25` | Collector | dex | uncommon | Collect 20 families in play with this franchise (founding roster not counted). | 20 (was 25) | 0/6 | — | — | not reached | **Adjusted:** 25 → 20 |
| `dx_knowledge_30` | Hands-On Research | dex | common | Play beasts from 30 different families in games. | 30 | 6/6 | 3 | 4 | mid (4–9) | Kept |
| `dx_types_all` | Every Element | dex | uncommon | Collect at least 1 families of every type in play (founding roster not counted). | 1 (was 2) | 0/6 | — | — | not reached | **Adjusted:** 2 → 1 per type |
| `dx_seen_140` | Scout of Beasts | dex | uncommon | Face 140 different families in games. | 140 | 6/6 | 2 | 2 | early (1–3) | Kept |
| `dx_seen_170` | Bestiary | dex | rare | Face 170 different families in games. | 170 | 6/6 | 6 | 6 | mid (4–9) | Kept |
| `dx_signed_50` | Menagerie | dex | rare | Collect 35 families in play with this franchise (founding roster not counted). | 35 (was 50) | 0/6 | — | — | not reached | **Adjusted:** 50 → 35 |
| `dx_account_100` | Lifetime Collector | dex | rare | Collect 100 families in play across all your franchises. | 100 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `dx_seen_all` | Seen Them All | dex | epic | Face every one of the 192 families in games. | 192 | 0/6 | — | — | not reached | Kept: not reached by the hands-off owner; attainable with an active owner |
| `ev_first_evolve` | Transformation | evolution | common | Evolve a beast. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `ev_level_50` | Fully Trained | evolution | common | Train a beast to level 50 on your roster. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `ev_evolve_10` | Evolution Lab | evolution | uncommon | Evolve 10 beasts. | 10 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `ev_final_stage` | Final Form | evolution | uncommon | Evolve a beast to its final form. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `ev_level50_x10` | Veteran Core | evolution | uncommon | Have 10 beasts you trained to level 50 on your roster at once. | 10 | 6/6 | 4 | 5 | mid (4–9) | Kept |
| `ev_ovr_80` | Rising Star | evolution | uncommon | Develop a beast to 80 overall on your roster. | 80 | 6/6 | 3 | 3 | early (1–3) | Kept |
| `ev_growth` | Breakout Season | evolution | uncommon | Have a beast gain 8 overall in one season. | 8 (was 10) | 0/6 | — | — | not reached | **Adjusted:** 10 → 8 |
| `ev_evolve_25` | Master Breeder | evolution | rare | Evolve 25 beasts. | 25 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `ev_ovr_90` | Superstar | evolution | rare | Develop a beast to 90 overall on your roster. | 90 | 2/6 | 11 | 11 | late (10–15) | Kept |
| `ev_drafted_80` | Homegrown Talent | evolution | rare | Have a beast you drafted reach 80 overall. | 80 | 4/6 | 8 | 10 | late (10–15) | Kept |
| `ev_apex` | Apex Predator | evolution | rare | Sign, draft, trade for or recruit an Apex beast (founding roster not counted). | 1 | 1/6 | 10 | 10 | late (10–15) | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `ev_ovr80_x10` | Stacked Roster | evolution | epic | Have 10 beasts at 80 overall or better at once. | 10 | 0/6 | — | — | not reached | Kept: not reached by the hands-off owner; attainable with an active owner |
| `ev_level50_x20` | Elite Academy | evolution | epic | Have 15 beasts you trained to level 50 on your roster at once. | 15 (was 20) | 0/6 | — | — | not reached | **Adjusted:** 20 → 15 |
| `ev_ovr_95` | Generational | evolution | legendary | Develop a beast to 95 overall on your roster. | 95 | 1/6 | 11 | 11 | late (10–15) | Kept |
| `ev_final_x5` | Evolved Dynasty | evolution | legendary | Have 5 beasts you evolved to their final form on your roster at once. | 5 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `cl_first_win` | First Clash | clash | common | Win a Beast Clash. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `cl_wins_10` | Clash Contender | clash | common | Win 10 Beast Clashes. | 10 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `cl_battles_25` | Battle-Hardened | clash | common | Fight 25 Beast Clashes. | 25 | 6/6 | 2 | 2 | early (1–3) | Kept |
| `cl_recruit_first` | Earned the Signature | clash | common | Sign a beast after winning its recruiting Clash. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `cl_enc_wins_10` | Recruiter | clash | common | Win 5 recruiting Clashes. | 5 (was 10) | 5/6 | 8 | 13 | late (10–15) | **Adjusted:** 10 → 5 |
| `cl_pre_wins_10` | Coin-Toss Champions | clash | common | Win 10 opening Clashes. | 10 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `cl_recruits_10` | Talent Magnet | clash | common | Sign 5 beasts after winning their recruiting Clashes. | 5 (was 10) | 5/6 | 8 | 13 | late (10–15) | **Adjusted:** 10 → 5 |
| `cl_close` | By a Whisker | clash | common | Win a Clash with less than 10% of your team’s health left. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `cl_ot_win` | Sudden Death | clash | common | Win an overtime Clash. | 1 | 6/6 | 1 | 3 | early (1–3) | Kept |
| `cl_wins_50` | Clash Veteran | clash | uncommon | Win 50 Beast Clashes. | 50 | 6/6 | 5 | 9 | mid (4–9) | Kept |
| `cl_streak_5` | Clash Streak | clash | uncommon | Win 5 Clashes in a row. | 5 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `cl_quick` | Lightning Round | clash | uncommon | Win a Clash in 12 exchanges or fewer. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `cl_wins_100` | Clash Master | clash | epic | Win 100 Beast Clashes. | 100 | 1/6 | 10 | 10 | late (10–15) | Kept |
| `cl_ot_wins_5` | Overtime Specialists | clash | rare | Win 5 overtime Clashes. | 5 | 1/6 | 9 | 9 | mid (4–9) | Kept |
| `cl_dominant` | Dominant Victory | clash | rare | Win a Clash with at least 60% of your team’s health left. | 1 | 4/6 | 7 | 10 | late (10–15) | Kept |
| `cl_commanded_25` | Field General | clash | rare | Win 25 Clashes in which you made a rotation call yourself. | 25 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `cl_playoff_ot` | Playoff Showdown | clash | epic | Win an overtime Clash in the playoffs. | 1 | 0/6 | — | — | not reached | Kept: not reached by the hands-off owner; attainable with an active owner |
| `cl_streak_15` | Untouchable | clash | epic | Win 15 Clashes in a row. | 15 | 0/6 | — | — | not reached | Kept: not reached by the hands-off owner; attainable with an active owner |
| `cl_wins_250` | Clash Legend | clash | legendary | Win 150 Beast Clashes. | 150 (was 250) | 0/6 | — | — | not reached | **Adjusted:** 250 → 150 |
| `cl_season_unbeaten` | Perfect Clash Season | clash | legendary | Win every Clash of a season, with at least 10 fought. | 10 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `gy_badges_3` | Badge Collector | gym | common | Hold 3 gym badges at once. | 3 | 5/6 | 1 | 1 | early (1–3) | Kept |
| `gy_gym_wins_10` | Gym Regular | gym | common | Beat gym clubs 10 times. | 10 | 6/6 | 2 | 3 | early (1–3) | Kept |
| `gy_season_4` | Gym Tour | gym | uncommon | Win 4 gym badges in a single season. | 4 | 4/6 | 1 | 1 | early (1–3) | Kept |
| `gy_regained` | Taking It Back | gym | uncommon | Win back a gym badge you lost. | 1 | 6/6 | 2 | 3 | early (1–3) | Kept |
| `gy_gym_wins_30` | Gym Conqueror | gym | rare | Beat gym clubs 30 times. | 30 | 2/6 | 7 | 7 | mid (4–9) | Kept |
| `gy_badges_9` | Nine Badges | gym | epic | Hold 9 gym badges at once. | 9 | 1/6 | 5 | 5 | mid (4–9) | Kept |
| `gy_season_6` | Grand Gym Tour | gym | epic | Win 6 gym badges in a single season. | 6 | 1/6 | 1 | 1 | early (1–3) | Kept |
| `lg_sighting` | Legend Sighting | legendary | uncommon | Face a legendary beast in a game. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `lg_legendary_play` | Legendary Play | legendary | rare | Discover a legendary play. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `lg_signed` | Myth Made Real | legendary | epic | Have a legendary beast on your roster. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `lg_legend_win` | Legend on the Field | legendary | epic | Win a game with a legendary beast in your lineup. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `lg_legend_playoff` | Legend in the Playoffs | legendary | legendary | Win a playoff game with a legendary beast in your lineup. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `lg_legend_title` | Legendary Champions | legendary | mythic | Win the Beast Bowl with a legendary beast on your roster. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `dr_first_pick` | On the Clock | draft | common | Make a pick in a season’s draft (the creation draft not counted). | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `dr_scout_full` | Full Report | draft | common | Fully scout a draft prospect. | 1 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `dr_picks_25` | Draft Room Veteran | draft | common | Make 10 draft picks. | 10 (was 25) | 6/6 | 11 | 11 | late (10–15) | **Adjusted:** 25 → 10 |
| `dr_scouts_10` | Scouting Department | draft | common | Scout 10 times. | 10 | 6/6 | 1 | 1 | early (1–3) | Kept |
| `dr_regions` | Globetrotter | draft | uncommon | Scout 8 different regions. | 8 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `dr_top_pick` | First Overall | draft | uncommon | Make the first overall pick of a draft. | 1 | 4/6 | 12 | 14 | late (10–15) | Kept |
| `dr_drafted_games` | Franchise Cornerstone | draft | rare | Have a beast you drafted play 50 games for you. | 50 | 6/6 | 5 | 5 | mid (4–9) | Kept |
| `dr_late_gem` | Hidden Gem | draft | rare | Have a beast you drafted in round 3 reach 65 overall. | 65 (was 75) | 0/6 | — | — | not reached | **Adjusted:** 75 → 65 |
| `dr_draftee_award` | Drafted a Winner | draft | epic | Have beasts you drafted win 3 league awards. | 3 | 6/6 | 6 | 7 | mid (4–9) | **Adjusted:** one award → 3 awards (counted) |
| `dr_draftee_hof` | Draft-Day Legend | draft | legendary | Have a beast you drafted enter the Beast Hall of Fame. | 1 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `fa_first_sign` | New Arrival | trades | common | Sign a free agent. | 1 | 1/6 | 15 | 15 | late (10–15) | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `fa_sign_10` | Open Market | trades | common | Sign 10 free agents. | 10 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `fa_extend_5` | Keeping the Band Together | trades | common | Extend 5 contracts. | 5 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `tr_trades_5` | Deal Maker | trades | uncommon | Complete 5 trades. | 5 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `tr_rival_trade` | Across the Aisle | trades | uncommon | Complete a trade with your rival club. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `fa_cap_clean_5` | Books Balanced | trades | uncommon | Finish 5 seasons under the salary cap. | 5 | 6/6 | 5 | 5 | mid (4–9) | Kept |
| `tr_trade_80` | Blockbuster | trades | rare | Acquire a beast of 80 overall or better by trade. | 80 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `tr_pick_haul` | Pick Haul | trades | rare | Receive 3 draft picks in a single trade. | 3 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `fa_sign_80` | Marquee Signing | trades | rare | Sign a free agent of 80 overall or better. | 80 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `tr_trades_15` | Wheeler-Dealer | trades | epic | Complete 15 trades. | 15 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `tr_loyal_10` | One-Club Beast | trades | epic | Keep a beast on your roster for 12 seasons. | 12 (was 10) | 6/6 | 10 | 10 | late (10–15) | **Adjusted:** 10 → 12 |
| `co_first_hire` | New Hire | coaching | common | Hire a staff member. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `co_plays_1000` | Play Caller | coaching | common | Call 1,000 offensive plays. | 1000 | 6/6 | 1 | 2 | early (1–3) | Kept |
| `co_hires_10` | Talent Scout | coaching | uncommon | Hire 10 staff members. | 10 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `co_new_club` | New Challenge | coaching | uncommon | Take a general manager job at another club. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `co_board_max` | Board’s Favorite | coaching | rare | Finish 3 seasons with the Board’s highest confidence. | 3 | 6/6 | 4 | 6 | mid (4–9) | Kept |
| `co_goals_5` | Promises Kept | coaching | rare | Meet the Board’s season goal 5 times. | 5 | 6/6 | 5 | 6 | mid (4–9) | Kept |
| `co_coy` | Coach of the Year | coaching | epic | Win Coach of the Year. | 1 | 1/6 | 1 | 1 | early (1–3) | Kept |
| `aw_awards_5` | Trophy Cabinet | awards | rare | Have your beasts win 5 league awards. | 5 | 1/6 | 15 | 15 | late (10–15) | Kept |
| `aw_record` | Record Breaker | awards | rare | Have a beast hold a league record. | 1 | 6/6 | 1 | 1 | early (1–3) | **Adjusted:** rule: a record set after year 1 that beat an earlier mark |
| `aw_monster_hof` | Enshrined | awards | rare | Have a beast who played for you enter the Beast Hall of Fame. | 1 | 4/6 | 8 | 11 | late (10–15) | Kept |
| `aw_mvp` | Most Valuable | awards | epic | Have a beast win the league Most Valuable Beast award. | 1 | 0/6 | — | — | not reached | Kept: not reached by the hands-off owner; attainable with an active owner |
| `aw_season_3` | Awards Night | awards | epic | Win 3 league awards in one season. | 3 | 0/6 | — | — | not reached | Kept: not reached by the hands-off owner; attainable with an active owner |
| `aw_all_awards` | Grand Slam of Awards | awards | legendary | Win 7 different league award categories. | 7 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `aw_monster_hof_5` | Hall of Beasts | awards | legendary | Have 5 beasts who played for you enter the Beast Hall of Fame. | 5 | 0/6 | — | — | not reached | Kept: exceptional by design |
| `hd_one_point` | So Close | hidden | common | Lose a game by a single point. | 1 | 6/6 | 1 | 3 | early (1–3) | Kept |
| `hd_tiebreak` | Decided by the Beasts | hidden | uncommon | Win a game settled by an overtime Clash. | 1 | 6/6 | 1 | 3 | early (1–3) | Kept |
| `hd_outgained` | Stolen Victory | hidden | rare | Win a game in which you were outgained by 200 yards or more. | 200 | 2/6 | 9 | 9 | mid (4–9) | Kept |
| `hd_old_club` | Old Friends | hidden | rare | Beat a club you used to manage. | 1 | 0/6 | — | — | not reached | Needs an owner action the simulated owner never takes; attainability by targeted test |
| `hd_rival_10` | Nemesis | hidden | epic | Beat your rival 20 times. | 20 (was 10) | 5/6 | 5 | 7 | mid (4–9) | **Adjusted:** 10 → 20 |
| `hd_badges_title` | Absolute Dominion | hidden | mythic | Hold every gym badge when you win the Beast Bowl. | 1 | 0/6 | — | — | not reached | Kept: exceptional by design |

## 3. Threshold adjustments

Each change is based on the recorded distributions:
- **Per game:** 653 box scores of the owner's club.
- **Per season:** 45 completed seasons.
- **Replay:** the first season each new threshold would have been met in the three seed-2 careers (Rookie / Pro / All-Star).

| Row | Rarity | Old → new | Evidence | Replay at the new threshold |
|---|---|---|---|---|
| `aw_record` Record Breaker | Rare | Any record held → a record set after year one that beat an earlier mark (the record book's own rule) | Unlocked in season 1 in 6/6 careers: every category is "held" in year one | Needs a broken record from season 2 on |
| `of_pass_450` Aerial Assault | Epic | 450 → 500 passing yards in a game | 2.30% of games reach 450 (every career within 1–11 seasons); 0.61% reach 500 | 7 / – / 13 |
| `st_fg_3_game` → Four on the Board | Epic | 3 → 4 field goals in a game | 3 FGs: 0.92% of games, 6/6 careers; 4 FGs: 0.15% | – / – / 9 |
| `df_sacks_7` Siege | Epic | 7 → 4 team sacks in a game | Never 7 in 653 games (max 5); 4 or more: 0.46% | 11 / 8 / 14 |
| `df_player_sacks_4` Quarterback Hunter | Epic | 4 → 3 sacks by one beast | 4 sacks: 0.15% (1 game); 3 or more: 0.31% | 11 / – / 14 |
| `df_season_sacks_25` Sack Party | Rare | 25 → 10 team sacks in a season | Season max 14; 10 or more in 13% of seasons | 8 / – / 13 |
| `df_player_season_sacks` → Sack Specialist | Epic | 14 → 7 sacks by one beast in a season | Season max 9; 7 or more in about 2% | 11 / – / – |
| `df_season_allowed` Lockdown Season | Rare | ≤ 100 → ≤ 150 points allowed | 0 of 45 seasons at 100; 4% at 150 | 1 / – / – |
| `of_rush_250` Stampede | Uncommon | 250 → 200 rushing yards in a game | 1/6 careers at 250; 0.77% of games at 200 (this engine passes 68% of the time) | 8 / – / – |
| `cl_enc_wins_10` Recruiter | Common | 10 → 5 recruiting Clash wins | About 0.8 a season: 10 took 8–15 seasons, once never | Season 5–7 |
| `cl_recruits_10` Talent Magnet | Common | 10 → 5 recruits | Same as above | Season 5–7 |
| `dr_picks_25` Draft Room Veteran | Common | 25 → 10 draft picks | About 2.2 picks a season: 25 took 11–14 seasons | About season 5 |
| `hd_rival_10` Nemesis (hidden) | Epic | 10 → 20 rival wins | Passive: seasons 5–8 in 5/6 careers | About season 10–13 |
| `tr_loyal_10` One-Club Beast | Epic | 10 → 12 seasons on the roster | Earned in season 10–11 in 6/6 careers just by waiting | Season 12 or later, if a beast stays |
| `dr_draftee_award` Drafted a Winner | Epic | One award → three awards won by your draftees | Seasons 6–8 in 6/6 careers (there are 13 award kinds since the balance merge) | Later and less certain |
| `cl_wins_250` Clash Legend | Legendary | 250 → 150 Clash wins | About 6–10 wins a season: 250 cannot be reached in a 15–20-season career; the best career had 147 wins at season 15 | Late career for a strong Clash club |
| `dx_original_20` Original Collector | Common | 20 → 10 original families in play | 7 by season 5 and 14–15 by season 15 (hands-off owner) | About season 6–7 |
| `dx_signed_25` Collector | Uncommon | 25 → 20 families collected | 18–22 at season 15 (hands-off owner) | Late for the hands-off owner; earlier with recruiting |
| `dx_signed_50` Menagerie | Rare | 50 → 35 | Same; 50 is far out of reach in a career | Needs an active collector |
| `dx_types_all` Every Element | Uncommon | 2 → 1 family of every type | 0 at season 15: at least one type was never collected | Needs a deliberate collector |
| `ev_growth` Breakout Season | Uncommon | +10 → +8 overall in one season | Best +9 in 15 seasons; never reached +10 | Close to the observed best |
| `ev_level50_x20` Elite Academy | Epic | 20 → 15 trained level-50 beasts at once | Peak 13 (season 5), falling later | Needs deliberate training |
| `dr_late_gem` Hidden Gem | Rare | 75 → 65 overall for a round-3 pick | Best round-3 draftee 44–49 at season 15 | Needs a developed late pick |

**Not changed, with reasons:**
- **`df_int_3` (3 interceptions in a game, Epic).** It unlocked in 6/6 careers by season 6, but a 4-interception game never happened in 653 games. Raising it would make it near-impossible.
- **`of_season_rush_1000` "Thousand-Yard Back" (Uncommon).** 9% of seasons reach 1,000. The name carries the number.
- **Everything else.** It falls where its rarity says.

## 4. Unlock distribution by rarity

Before adjustment, 6 careers (section 1). Careers earned 88–119 achievements in 15 seasons.

| Career | Total | Titles | Unlocks per season, 1 to 15 |
|---|---|---|---|
| rookie seed 1 | 112 | 0 | 44, 15, 6, 8, 7, 2, 1, 4, 1, 6, 3, 5, 2, 5, 3 |
| pro seed 1 | 95 | 0 | 35, 8, 7, 7, 6, 10, 3, 1, 3, 6, 0, 1, 1, 2, 5 |
| allstar seed 1 | 88 | 0 | 33, 11, 7, 5, 6, 5, 6, 3, 4, 3, 2, 0, 0, 1, 2 |
| rookie seed 2 | 119 | 2 | 52, 9, 5, 2, 11, 9, 6, 7, 5, 5, 1, 1, 3, 1, 2 |
| pro seed 2 | 107 | 1 | 49, 8, 5, 4, 13, 4, 3, 1, 0, 5, 0, 5, 4, 2, 4 |
| allstar seed 2 | 92 | 0 | 21, 5, 12, 2, 6, 3, 2, 9, 7, 5, 13, 3, 1, 1, 2 |

**Effect of the adjustments.**
- They move nine Epic and Rare per-game and per-season rows from "always early" or "never" into the middle and late career. In the seed-2 replay they fall between seasons 7 and 14.
- They bring four slow Common rows (recruiting Clashes, recruits, draft picks, original families) forward from the late career to about seasons 5–7.
- Legendary and Mythic are unchanged and stay exceptional.

## 5. Progression findings

- **Early career (seasons 1–3):**
  - most Common rows;
  - the first-playoffs and rival rows;
  - the first gym badge;
  - Dex sightings, because 100 families are faced in season 1.

  That is the intended onboarding.
- **Mid career (seasons 4–9):**
  - win totals (30 and 50);
  - Clash 50 wins;
  - board confidence and goals;
  - drafted beasts' games;
  - the first Hall of Fame entries for former players (seasons 8–15).
- **Late career (seasons 10–15):**
  - the season-count rows (10 and 15 seasons, by design);
  - 100 wins, and Clash 100 and 150 wins;
  - the second title;
  - loyalty;
  - the new Epic thresholds.
- **Championship rows depend on winning.** The hands-off owner won 3 titles in 6 careers (2 at Rookie, 1 at Pro), so title rows are rare, as intended. Hall of Fame and award rows follow from playing time and are reached by every difficulty.
- **The economy does not lock anything out.** The 1.6 M cap and Rookie −7 left the cap-clean row earned in 6/6 careers by season 5, and nothing financial is unattainable.

## 6. Exploit and attainability checks

**Exploits:**

| Check | Result |
|---|---|
| Developer shortcuts | A franchise that used one earns nothing afterwards. Its account key is disqualified and survives a cloud merge and an import. Earlier records are kept. Tested in `achievements-metrics`. |
| Archived franchises | Never evaluated (`achEligible`). |
| Founding gifts and creation-draft picks | Excluded from acquisition, development, draft and Dex rows. 4 founding seeds grant none of them (tested). |
| Watching a Clash | Does not count as commanding (`cl_commanded_25` needs live play with a rotation decision). |
| Year-one records | Fixed (section 3). |
| Waiting it out | Loyalty raised to 12 seasons. The season-count rows (5 / 10 / 15) are milestones by design. |
| Repeated or replayed games and battles | Counted once (event ids; tested). |
| Undesirable play | "Lose by one point" and the tiebreak row are hidden, and the owner cannot steer them. No row rewards tanking: the top pick needs the worst record, but it only exists as Uncommon. |

**Attainability by targeted scenario** (positive and negative cases, `tests/achievements-metrics.test.js`):
- The rows the hands-off owner never reaches because it takes no such action: evolution, trades, free-agent signings beyond the minimum, extensions, staff hires, moving clubs, scouting regions, commanded Clashes, Legend Tracks and legendary beasts, two-franchise and account rows, the old-club rematch.
- Each was checked on realistic franchise state built through the game's own trackers and records. Nothing was forced.
- The real-play test (7 weeks of `simOneWeek`) confirms that evolution, hire and Clash hooks fire.

## 7. Targeted test results

**Targeted validation: 20 files, 146 of 146 passing, 0 failing** (2026-11-27, branch head after calibration).

| Area | Files |
|---|---|
| Definitions, ids, totals, boundaries, backfill, queue, duplicates, hidden rows, account store and cloud merge, evaluation cost | `achievements-catalogue` |
| Every metric positive and negative, real play, founding, developer disqualification, queue overflow, persistence (reload, switching, cloud), history coverage | `achievements-metrics` |
| Achievement screen (200 rows, the 24 originals), HQ-only presentation | `task8-m6-screens`, `hq-navigation` |
| Awards and Hall of Fame (Golden Boot, Return King, Special Teams Beast of the Year, voting, induction day) | `special-teams-awards`, `task8-awards`, `monster-hof-voting`, `hall-of-fame-day` |
| Text and terminology | `central-text`, `text-style`, `text-never-decides` |
| Saves and existing franchises | `franchise-save-compat`, `save`, `cloud-save`, `uid-isolation`, `lifecycle`, `cap-transition` |
| Weekly flow and Clash, so achievements never interrupt a live game or battle | `guided-week`, `task10-clash-franchise`, `beast-dex-notifications` |

**Emulated phone check** (iPhone 14 profile, Playwright; `reports/achievement-audit/screenshots/`):
- The catalogue shows 200 cards with no horizontal overflow and no small tap targets.
- Hidden placeholders, search and the history notes work.
- A Common toast, Rare and Epic cards, the reveals for each speaker (Commissioner, rival GM, Board) and the Mythic reveal all render, showing the new thresholds (Aerial Assault, 500 yards).
- There were no console errors.
- Unlocks appear only on HQ; the queue keeps them during games and Clashes.

**Not run:** the full fast and simulation suites, as the brief asks. They follow the phone build.

## 8. Remaining limitations

- **One owner policy.** The simulated owner is hands-off. Active-owner rows are validated by scenario, not by an observed career.
- **Small sample.** Six careers. Rare and Legendary rows were judged on distributions, not on whether they happened in the sample.
- **Adjusted rows not replayed in a full career.** Their new thresholds were checked by replaying the recorded box scores and seasons, not by fresh careers.
- **No human playtest yet.** The owner's playtesting will show whether the pacing feels right.
