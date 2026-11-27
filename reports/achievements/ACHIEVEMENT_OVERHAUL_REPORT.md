# Achievement Overhaul: 200 Achievements

> **Updated after the owner's review (2026-11-26).** The changes and findings are in `ACHIEVEMENT_REVIEW_FOLLOWUP.md`:
> - renamed and replaced rows;
> - category-based speakers;
> - tracking notices;
> - account eligibility;
> - founding exclusions;
> - queue safety;
> - Golden Boot and Return King;
> - metric tests.
>
> The catalogue (§3), the distributions (§4) and the provisional list (§12) below are regenerated. Where an older section disagrees, the follow-up governs.

Branch: `feature/achievement-overhaul-200`, from `main` at 58c33ee. Not merged; it waits for the owner's review.
It is a separate worktree from the balance work. No gameplay balance, simulation probability, attribute, ability or economy value changed.

## 1. Executive summary

- **The catalogue: 200 achievements.**
  - The 24 originals keep their ids, checks and cutscenes, and earned records are untouched.
  - There are 176 new ones.
  - The category totals match the brief exactly: Game 20, Franchise 15, Championships 12, Offense 15, Defense 15, Special Teams 10, Beast Dex 15, Evolution 15, Beast Clash 20, Gym 10, Legendary 8, Draft 10, Trades/FA 12, Coaching 8, Awards 9, Hidden 6.
  - So do the rarity totals: Common 50, Uncommon 45, Rare 45, Epic 35, Legendary 20, Mythic 5.
  - A test checks all of these totals.
- **Data-driven.**
  - Each new achievement is one data row: metric, comparison, one threshold, trigger, scope, hidden, retroactive, provisional.
  - Rows are evaluated by about 120 reusable metrics. Evaluation is event-driven and never per frame.
  - All 200 rows cost well under 5 ms per check.
- **Earned by play.**
  - Founding gifts do not count: a founding roster's evolved forms, its levels, an Apex, or creation-draft picks.
  - A game or battle counts once.
  - A franchise played by the developer shortcut earns nothing, and neither does an archive.
  - Rewards are cosmetic only.
- **Older saves.** A one-time backfill grants only what the save proves, and announces it in one line.
- **The screen is redesigned:**
  - completion, rarity and category counts, recently unlocked;
  - search, filters, progress bars, unlock dates, a detail sheet, hidden placeholders, scene replay;
  - CSS rarity badges.
- **Unlocks are shown by rarity:**
  - Common/Uncommon: a toast, consolidated when several arrive at once.
  - Rare/Epic: a card.
  - Legendary/Mythic: a reveal with the commissioner.
  - They appear only on HQ, behind any other scene, and never during a play or a Clash. There is no audio.
- **Published game files:** still 512. No new `src` file; release check `RELEASE FILE LIST OK: 512 files`.
- **Testing:**
  - The new test file and the affected existing tests pass.
  - 167 of 167 targeted save, cloud, rules and Clash tests pass, and 79 of 79 on a rerun of the final code (section 11).
  - Two 4-season soaks were run.
  - Phone screenshots are **emulated** (Playwright Chromium, iPhone 14 profile).
  - The full fast and sim suites were **not** run.
- **40 thresholds are provisional** (section 12). The balance branch will move some distributions, so they should be re-measured after it merges.

## 2. The original system

- **The 24 achievements:**
  - Defined in `src/data/achievements.js` with `when(f, ctx)` checks.
  - Each is delivered as a cutscene by the commissioner, the rival GM or the Board.
  - Checked by `checkAchievements(f, trigger)` from 7 call sites: sunday, season, playoffs, legend and trade, plus `any`.
- **Account store:** `achievement-store.js` keeps localStorage and the cloud mirror. Earliest first-earn wins, and franchise lists merge through seed→uid links. It was sound and is unchanged.
- **Screen:** a flat list of 24 cards. It had no rarity, categories, search, filters or progress. Locked titles with `{rival}` showed a generic line.
- **Gaps found:**
  1. Beast Clash results were not kept beyond the current week (`f.week.encounter`, `pregame`, `overtime` are replaced every week).
  2. Nothing recorded a score timeline, so a comeback could not be measured.
  3. `dexCounts(f)` is account-inclusive (a family collected in any franchise counts), so the 3 original dex achievements are effectively account-wide. This is kept as it was.
  4. The GDD said "21" and the old UI smoke script expected 21 cards, both stale (it was 24). Both are updated.
  5. A founding roster already contains final-form monsters (single-stage families), level-50 veterans, sometimes an Apex, and three creation-draft picks. Any roster-state achievement had to be defined as growth with you, or it would unlock at creation. The first soak showed exactly this, and it was fixed (section 12).

## 3. Full catalogue

Machine-readable: `docs/achievements/catalogue.json`. Readable, with every field (id, name, category, rarity, description, exact requirement, progress method, trigger, scope, hidden, retroactive, testing status): `docs/achievements/CATALOGUE.md`. Both are generated from the code by `node tools/achievements-catalogue.mjs`. The compact list:

**Game Performance (20)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `first_win` | First blood | common | original check (unchanged): Win your first game with a franchise. | original retro |
| `rival_beaten` | A word from {rival} | common | original check (unchanged): Beat your rival club for the first time. | original retro |
| `rival_swept` | The sweep | uncommon | original check (unchanged): Beat your rival twice in one season without losing to them. | original |
| `gp_shutout` | Clean Sheet | common | a win in which the opponent scores 0 ≥ 1 | retro |
| `gp_score_30` | Thirty Up | common | your points in one game ≥ 30 | retro |
| `gp_road_wins` | Road Warriors | common | road wins (tracked) ≥ 10 | retro |
| `gp_no_turnover_win` | Ball Security | common | a win with 0 turnovers committed ≥ 1 |  |
| `gp_ot_win` | Extra Time | common | a win in overtime ≥ 1 |  |
| `gp_hold_100` | Brick Wall | common | the opponent's total yards in a win < 100 |  |
| `gp_blowout_20` | Statement Win | uncommon | the winning margin of one game ≥ 20 | retro |
| `gp_streak_5` | Hot Streak | uncommon | the longest run of consecutive wins, playoffs included (tracked) ≥ 5 | retro |
| `gp_home_unbeaten` | Fortress | rare | every home game of a regular season won ≥ 1 | retro |
| `gp_blowout_35` | Rout | rare | the winning margin of one game ≥ 35 | retro |
| `gp_score_45` | Points Machine | rare | your points in one game ≥ 45 | retro |
| `gp_comeback_14` | Never Out of It | rare | the largest deficit you overcame in a win ≥ 14 | provisional |
| `gp_beat_25` | Around the League | rare | different clubs beaten ≥ 25 | retro |
| `gp_comeback_21` | The Great Escape | epic | the largest deficit you overcame in a win ≥ 21 | provisional |
| `gp_streak_10` | Unstoppable | epic | the longest run of consecutive wins, playoffs included (tracked) ≥ 10 | retro |
| `gp_score_60` | Scoreboard Broken | legendary | your points in one game ≥ 60 | retro provisional |
| `gp_streak_20` | Dynasty Run | legendary | the longest run of consecutive wins, playoffs included (tracked) ≥ 20 | provisional |

**Franchise Milestones (15)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `winning_season` | A winning season | common | original check (unchanged): Finish your first winning season. | original retro |
| `undefeated` | Perfect | epic | original check (unchanged): Go unbeaten through a regular season. | original retro |
| `wins_10` | Ten wins | common | original check (unchanged): Reach 10 career wins. | original retro |
| `wins_30` | Thirty wins | uncommon | original check (unchanged): Reach 30 career wins. | original retro |
| `wins_50` | Fifty wins | rare | original check (unchanged): Reach 50 career wins. | original retro |
| `fm_seasons_5` | Settled In | common | seasons completed ≥ 5 | retro |
| `fm_games_100` | Century | common | games played (tracked) ≥ 100 | retro |
| `fm_seasons_10` | Decade at the Helm | uncommon | seasons completed ≥ 10 | retro |
| `fm_winning_5` | Consistent Winner | rare | winning regular seasons ≥ 5 | retro |
| `fm_winning_run_3` | Built to Last | rare | consecutive winning regular seasons ≥ 3 | retro |
| `fm_points_300` | High-Octane Season | rare | points scored in one regular season ≥ 300 | retro provisional |
| `fm_twelve_wins` | Twelve and Counting | epic | regular-season wins in one season ≥ 12 | retro |
| `fm_wins_100` | One Hundred Wins | epic | career wins ≥ 100 | retro |
| `fm_seasons_15` | The Full Fifteen | uncommon | seasons completed ≥ 15 | retro |
| `fm_wins_150` | Hall of Wins | legendary | career wins ≥ 150 | retro provisional |

**Championships (12)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `first_playoffs` | The playoffs | uncommon | original check (unchanged): Make the playoffs for the first time. | original retro |
| `conference_title` | Conference champions | rare | original check (unchanged): Win a conference championship. | original retro |
| `first_title` | Beast Bowl champions | epic | original check (unchanged): Win the Beast Bowl. | original retro |
| `second_title` | Two titles | epic | original check (unchanged): Win a second Beast Bowl. | original retro |
| `ch_playoff_win` | Moving On | uncommon | playoff wins (tracked) ≥ 1 | retro |
| `ch_playoffs_5` | Postseason Regulars | rare | playoff appearances ≥ 5 | retro |
| `ch_playoff_wins_10` | Postseason Pedigree | epic | playoff wins (tracked) ≥ 10 | retro |
| `ch_conf_titles_3` | Conference Kings | legendary | conference championships (tracked) ≥ 3 | retro |
| `ch_back_to_back` | Back to Back | legendary | consecutive Beast Bowl titles ≥ 2 | retro |
| `ch_two_franchises` | Champion Anywhere | legendary | eligible franchises with a Beast Bowl title ≥ 2 | retro account |
| `ch_five_titles` | Five Rings | mythic | Beast Bowl titles ≥ 5 | retro |
| `ch_perfect_season` | The Perfect Season | mythic | an unbeaten regular season ending in the Beast Bowl title ≥ 1 | retro |

**Offensive Performance (15)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `of_pass_250` | Air Raid | common | one monster's passing yards in a game ≥ 250 |  |
| `of_rec_150` | Go-To Target | common | one monster's receiving yards in a game ≥ 150 |  |
| `of_rush_150` | Workhorse | common | one monster's rushing yards in a game ≥ 150 |  |
| `of_rush_td_3` | Hat Trick | common | one monster's rushing touchdowns in a game ≥ 3 |  |
| `of_season_rec_1500` | Route Runner | common | one monster's receiving yards in a season ≥ 1500 | retro |
| `of_pass_td_4` | Four Strikes | uncommon | one monster's touchdown passes in a game ≥ 4 |  |
| `of_rec_250` | Uncoverable | uncommon | one monster's receiving yards in a game ≥ 250 |  |
| `of_long_80` | Home Run | uncommon | the longest run or reception in a game ≥ 80 |  |
| `of_season_pass_3000` | Gunslinger | uncommon | one monster's passing yards in a season ≥ 3000 | retro |
| `of_season_rush_1000` | Thousand-Yard Back | uncommon | one monster's rushing yards in a season ≥ 1000 | retro |
| `of_rush_250` | Stampede | uncommon | one monster's rushing yards in a game ≥ 250 |  |
| `of_pass_450` | Aerial Assault | epic | one monster's passing yards in a game ≥ 450 | provisional |
| `of_team_yards_500` | Yardage Avalanche | rare | your total yards in a game ≥ 500 |  |
| `of_season_pass_td_40` | Touchdown Factory | rare | one monster's touchdown passes in a season ≥ 40 | retro |
| `of_pass_td_7` | Seven Up | epic | one monster's touchdown passes in a game ≥ 7 | provisional |

**Defensive Performance (15)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `df_first_int` | Picked Off | common | your interceptions in a game ≥ 1 |  |
| `df_sacks_3` | Pocket Collapse | common | your sacks in a game ≥ 3 |  |
| `df_tfl_5` | Into the Backfield | uncommon | your tackles for loss in a game ≥ 5 |  |
| `df_int_2` | Ball Hawks | uncommon | your interceptions in a game ≥ 2 |  |
| `df_tackles_12` | Everywhere at Once | uncommon | one monster's tackles in a game ≥ 12 |  |
| `df_pick_six` | Pick Six | uncommon | defensive touchdowns (tracked) ≥ 1 |  |
| `df_takeaways_4` | Turnover Machine | rare | turnovers you forced in a game ≥ 4 |  |
| `df_shutouts_5` | Zero Club | rare | shutout wins (tracked) ≥ 5 | retro |
| `df_season_allowed` | Lockdown Season | rare | points allowed in one complete regular season ≤ 100 | retro provisional |
| `df_season_sacks_25` | Sack Party | rare | team sacks in a season ≥ 25 | retro provisional |
| `df_player_sacks_4` | Quarterback Hunter | epic | one monster's sacks in a game ≥ 4 | provisional |
| `df_int_3` | Ballhawk Clinic | epic | your interceptions in a game ≥ 3 |  |
| `df_player_season_sacks` | Double-Digit Sacks | epic | one monster's sacks in a season ≥ 14 | retro provisional |
| `df_sacks_7` | Siege | epic | your sacks in a game ≥ 7 | provisional |
| `df_season_int_10` | No-Fly Zone | legendary | team interceptions in a season ≥ 10 | retro provisional |

**Special Teams (10)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `st_first_fg` | Three Points | common | field goals made (tracked) ≥ 1 | retro |
| `st_fg_50` | Big Leg | uncommon | your longest made field goal (yards) ≥ 50 | retro |
| `st_golden_boot` | Golden Boot | rare | Golden Boot awards (from the balance branch) ≥ 1 | retro |
| `st_return_king` | Return King | rare | Return King awards (from the balance branch) ≥ 1 | retro |
| `st_fg_60` | From Downtown | uncommon | your longest made field goal (yards) ≥ 60 | retro |
| `st_season_fg_12` | Points on the Board | uncommon | field goals made in a season ≥ 12 | retro |
| `st_kr_td` | Return to Sender | uncommon | kickoff-return touchdowns (tracked) ≥ 1 | retro |
| `st_fg_3_game` | Three for Three | epic | field goals made in one game ≥ 3 |  |
| `st_kr_td_3` | Return Specialist | epic | kickoff-return touchdowns (tracked) ≥ 3 | retro |
| `st_perfect_kicker` | Automatic | legendary | field-goal attempts in a season with every field goal and extra point made ≥ 10 | retro provisional |

**Beast Dex (15)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `dex_original` | The original 72 | epic | original check (unchanged): Acquire a beast from all 72 original families to complete this Beast Dex collection. | original retro |
| `dex_basic` | Every Basic | legendary | original check (unchanged): Acquire a beast from all 120 Basic families to complete this Beast Dex collection. | original retro |
| `dex_all` | The complete Beast Dex | mythic | original check (unchanged): Acquire a beast from all 192 families to complete the Beast Dex. | original retro |
| `dx_seen_60` | Field Notes | common | different families faced in games ≥ 60 | provisional |
| `dx_seen_100` | Keen Observer | common | different families faced in games ≥ 100 | provisional |
| `dx_signed_10` | Growing Collection | common | different families collected by this franchise in play (founding roster and creation draft excluded) ≥ 10 | retro provisional |
| `dx_original_20` | Original Collector | common | original families collected in play (founding excluded) ≥ 20 | retro provisional |
| `dx_signed_25` | Collector | uncommon | different families collected by this franchise in play (founding roster and creation draft excluded) ≥ 25 | retro provisional |
| `dx_knowledge_30` | Hands-On Research | common | different families you have played in games ≥ 30 | retro |
| `dx_types_all` | Every Element | uncommon | families collected in play in your least-collected type ≥ 2 | retro provisional |
| `dx_seen_140` | Scout of Beasts | uncommon | different families faced in games ≥ 140 | provisional |
| `dx_seen_170` | Bestiary | rare | different families faced in games ≥ 170 | provisional |
| `dx_signed_50` | Menagerie | rare | different families collected by this franchise in play (founding roster and creation draft excluded) ≥ 50 | retro provisional |
| `dx_account_100` | Lifetime Collector | rare | families collected in play across your eligible franchises (achievements dex, not the shared Beast Dex) ≥ 100 | retro provisional account |
| `dx_seen_all` | Seen Them All | epic | different families faced in games ≥ 192 | provisional |

**Evolution & Development (15)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `ev_first_evolve` | Transformation | common | evolutions made ≥ 1 | retro |
| `ev_level_50` | Fully Trained | common | monsters on the roster trained to level 50 with you ≥ 1 |  |
| `ev_evolve_10` | Evolution Lab | uncommon | evolutions made ≥ 10 | retro |
| `ev_final_stage` | Final Form | uncommon | monsters on the roster that evolved to their final form with you ≥ 1 | retro |
| `ev_level50_x10` | Veteran Core | uncommon | monsters on the roster trained to level 50 with you ≥ 10 |  |
| `ev_ovr_80` | Rising Star | uncommon | the overall of a monster who was below the target when first seen on your roster ≥ 80 |  |
| `ev_growth` | Breakout Season | uncommon | overall gained by one monster in a season ≥ 10 | retro |
| `ev_evolve_25` | Master Breeder | rare | evolutions made ≥ 25 | retro |
| `ev_ovr_90` | Superstar | rare | the overall of a monster who was below the target when first seen on your roster ≥ 90 |  |
| `ev_drafted_80` | Homegrown Talent | rare | the overall of a monster you drafted ≥ 80 | retro |
| `ev_apex` | Apex Predator | rare | an Apex monster you acquired (not a founding one) ≥ 1 | retro provisional |
| `ev_ovr80_x10` | Stacked Roster | epic | monsters at 80 overall or better on the roster at once ≥ 10 | retro provisional |
| `ev_level50_x20` | Elite Academy | epic | monsters on the roster trained to level 50 with you ≥ 20 | provisional |
| `ev_ovr_95` | Generational | legendary | the overall of a monster who was below the target when first seen on your roster ≥ 95 | provisional |
| `ev_final_x5` | Evolved Dynasty | legendary | monsters on the roster that evolved to their final form with you ≥ 5 | retro provisional |

**Beast Clash (20)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `cl_first_win` | First Clash | common | Beast Clash wins ≥ 1 |  |
| `cl_wins_10` | Clash Contender | common | Beast Clash wins ≥ 10 |  |
| `cl_battles_25` | Battle-Hardened | common | Beast Clashes fought ≥ 25 |  |
| `cl_recruit_first` | Earned the Signature | common | monsters signed after a won recruiting Clash ≥ 1 |  |
| `cl_enc_wins_10` | Recruiter | common | recruiting Clash wins ≥ 10 |  |
| `cl_pre_wins_10` | Coin-Toss Champions | common | opening Clash wins ≥ 10 |  |
| `cl_recruits_10` | Talent Magnet | common | monsters signed after a won recruiting Clash ≥ 10 |  |
| `cl_close` | By a Whisker | common | Clash wins with team health under the stated share ≥ 1 (pct 10) | provisional |
| `cl_ot_win` | Sudden Death | common | overtime Clash wins ≥ 1 |  |
| `cl_wins_50` | Clash Veteran | uncommon | Beast Clash wins ≥ 50 |  |
| `cl_streak_5` | Clash Streak | uncommon | the longest run of consecutive Clash wins ≥ 5 |  |
| `cl_quick` | Lightning Round | uncommon | Clash wins within the stated exchanges ≥ 1 (ex 12) | provisional |
| `cl_wins_100` | Clash Master | epic | Beast Clash wins ≥ 100 |  |
| `cl_ot_wins_5` | Overtime Specialists | rare | overtime Clash wins ≥ 5 |  |
| `cl_dominant` | Dominant Victory | rare | Clash wins with team health at or above the stated share (dominant wins) ≥ 1 (pct 60) | provisional |
| `cl_commanded_25` | Field General | rare | Clash wins in which you made at least one rotation call (live, not simulated) ≥ 25 |  |
| `cl_playoff_ot` | Playoff Showdown | epic | playoff overtime Clash wins ≥ 1 |  |
| `cl_streak_15` | Untouchable | epic | the longest run of consecutive Clash wins ≥ 15 | provisional |
| `cl_wins_250` | Clash Legend | legendary | Beast Clash wins ≥ 250 | provisional |
| `cl_season_unbeaten` | Perfect Clash Season | legendary | Clashes fought in a season with every one won ≥ 10 | provisional |

**Gym Challenges (10)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `first_badge` | The first badge | common | original check (unchanged): Win your first gym badge. | original retro |
| `half_badges` | Six of twelve | rare | original check (unchanged): Hold six of the twelve gym badges. | original retro |
| `all_badges` | All twelve | legendary | original check (unchanged): Hold all twelve gym badges. | original retro |
| `gy_badges_3` | Badge Collector | common | gym badges held now ≥ 3 | retro |
| `gy_gym_wins_10` | Gym Regular | common | wins over gym clubs ≥ 10 | retro |
| `gy_season_4` | Gym Tour | uncommon | badges won and still held at the end of a season ≥ 4 |  |
| `gy_regained` | Taking It Back | uncommon | gym badges won back after losing them ≥ 1 |  |
| `gy_gym_wins_30` | Gym Conqueror | rare | wins over gym clubs ≥ 30 | retro |
| `gy_badges_9` | Nine Badges | epic | gym badges held now ≥ 9 | retro |
| `gy_season_6` | Grand Gym Tour | epic | badges won and still held at the end of a season ≥ 6 | provisional |

**Legendary Monsters (8)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `legend_tracked` | A Legend Track | epic | original check (unchanged): Choose your first Legend Track. | original retro |
| `legend_unlocked` | A legend unlocked | legendary | original check (unchanged): Unlock a legendary monster (three Legend Tracks on one). | original retro |
| `lg_sighting` | Legend Sighting | uncommon | a legendary monster in the opponent's lineup ≥ 1 |  |
| `lg_legendary_play` | Legendary Play | rare | legendary plays discovered ≥ 1 | retro |
| `lg_signed` | Myth Made Real | epic | a legendary monster on the roster ≥ 1 | retro |
| `lg_legend_win` | Legend on the Field | epic | a win with a legendary monster in the lineup ≥ 1 |  |
| `lg_legend_playoff` | Legend in the Playoffs | legendary | a playoff win with a legendary monster in your lineup ≥ 1 |  |
| `lg_legend_title` | Legendary Champions | mythic | a Beast Bowl title with a legendary on the roster ≥ 1 |  |

**Draft & Scouting (10)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `dr_first_pick` | On the Clock | common | draft picks made (season drafts) ≥ 1 | retro |
| `dr_scout_full` | Full Report | common | prospects fully scouted ≥ 1 |  |
| `dr_picks_25` | Draft Room Veteran | common | draft picks made (season drafts) ≥ 25 | retro |
| `dr_scouts_10` | Scouting Department | common | scouting trips ≥ 10 |  |
| `dr_regions` | Globetrotter | uncommon | different regions scouted ≥ 8 |  |
| `dr_top_pick` | First Overall | uncommon | first overall picks made ≥ 1 | retro |
| `dr_drafted_games` | Franchise Cornerstone | rare | games played by a monster you drafted ≥ 50 | retro |
| `dr_late_gem` | Hidden Gem | rare | the overall of a third-round pick you drafted ≥ 75 | retro |
| `dr_draftee_award` | Drafted a Winner | epic | a league award won by a monster you drafted ≥ 1 | retro |
| `dr_draftee_hof` | Draft-Day Legend | legendary | Hall of Fame inductees you drafted ≥ 1 | retro |

**Trades & Free Agency (12)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `traded_up` | The phone works | common | original check (unchanged): Make your first trade. | original retro |
| `fa_first_sign` | New Arrival | common | free agents signed ≥ 1 | retro |
| `fa_sign_10` | Open Market | common | free agents signed ≥ 10 | retro |
| `fa_extend_5` | Keeping the Band Together | common | contract extensions agreed ≥ 5 | retro |
| `tr_trades_5` | Deal Maker | uncommon | trades completed ≥ 5 | retro |
| `tr_rival_trade` | Across the Aisle | uncommon | trades with your rival club ≥ 1 | retro |
| `fa_cap_clean_5` | Books Balanced | uncommon | seasons finished under the salary cap ≥ 5 |  |
| `tr_trade_80` | Blockbuster | rare | the highest overall acquired by trade ≥ 80 | retro |
| `tr_pick_haul` | Pick Haul | rare | draft picks received in one trade ≥ 3 | retro |
| `fa_sign_80` | Marquee Signing | rare | the highest overall of a free agent signed ≥ 80 |  |
| `tr_trades_15` | Wheeler-Dealer | epic | trades completed ≥ 15 | retro |
| `tr_loyal_10` | One-Club Monster | epic | seasons one monster has spent on your roster ≥ 10 | retro |

**Coaching & Management (8)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `hot_seat_survived` | Off the hot seat | rare | original check (unchanged): Meet the Board’s goal while on the hot seat. | original |
| `co_first_hire` | New Hire | common | staff hired ≥ 1 |  |
| `co_plays_1000` | Play Caller | common | offensive plays called ≥ 1000 | retro |
| `co_hires_10` | Talent Scout | uncommon | staff hired ≥ 10 |  |
| `co_new_club` | New Challenge | uncommon | a general manager job taken at another club ≥ 1 | retro |
| `co_board_max` | Board’s Favorite | rare | seasons ending at the Board's highest confidence ≥ 3 | retro provisional |
| `co_goals_5` | Promises Kept | rare | Board season goals met ≥ 5 | retro |
| `co_coy` | Coach of the Year | epic | Coach of the Year awards ≥ 1 | retro |

**Awards & Legacy (9)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `first_award` | A league award | uncommon | original check (unchanged): Have one of your monsters win a league award. | original retro |
| `hof_eligible` | The Hall of Fame | legendary | original check (unchanged): Qualify for the Hall of Fame. | original retro |
| `aw_awards_5` | Trophy Cabinet | rare | league awards won by your monsters ≥ 5 | retro |
| `aw_record` | Record Breaker | rare | a league record held by your monster ≥ 1 | retro |
| `aw_monster_hof` | Enshrined | rare | Monster Hall of Fame inductees who played for you ≥ 1 | retro |
| `aw_mvp` | Most Valuable | epic | MVP awards ≥ 1 | retro |
| `aw_season_3` | Awards Night | epic | league awards in one season ≥ 3 | retro |
| `aw_all_awards` | Grand Slam of Awards | legendary | different league award categories won ≥ 7 | retro provisional |
| `aw_monster_hof_5` | Hall of Monsters | legendary | Monster Hall of Fame inductees who played for you ≥ 5 | retro |

**Hidden (6)**

| id | name | rarity | requirement | flags |
|---|---|---|---|---|
| `hd_one_point` | So Close | common | the margin of a loss = 1 | hidden retro |
| `hd_tiebreak` | Decided by the Beasts | uncommon | a win decided by the overtime Beast Clash ≥ 1 | hidden |
| `hd_outgained` | Stolen Victory | rare | yards by which the opponent outgained you in a win ≥ 200 | hidden |
| `hd_old_club` | Old Friends | rare | a win over a club you managed before ≥ 1 | hidden |
| `hd_rival_10` | Nemesis | epic | wins over your rival club ≥ 10 | hidden retro |
| `hd_badges_title` | Absolute Dominion | mythic | a Beast Bowl title while holding every gym badge ≥ 1 | hidden retro |

## 4. Distributions

**By category and rarity.** Every column below adds up to the brief's totals: 50, 45, 45, 35, 20 and 5.

| Category | Total | C | U | R | E | L | M |
|---|---|---|---|---|---|---|---|
| Game Performance | 20 | 8 | 3 | 5 | 2 | 2 | 0 |
| Franchise Milestones | 15 | 4 | 3 | 4 | 3 | 1 | 0 |
| Championships | 12 | 0 | 2 | 2 | 3 | 3 | 2 |
| Offensive Performance | 15 | 5 | 6 | 2 | 2 | 0 | 0 |
| Defensive Performance | 15 | 2 | 4 | 4 | 4 | 1 | 0 |
| Special Teams | 10 | 1 | 4 | 2 | 2 | 1 | 0 |
| Beast Dex | 15 | 5 | 3 | 3 | 2 | 1 | 1 |
| Evolution & Development | 15 | 2 | 5 | 4 | 2 | 2 | 0 |
| Beast Clash | 20 | 9 | 3 | 3 | 3 | 2 | 0 |
| Gym Challenges | 10 | 3 | 2 | 2 | 2 | 1 | 0 |
| Legendary Monsters | 8 | 0 | 1 | 1 | 3 | 2 | 1 |
| Draft & Scouting | 10 | 4 | 2 | 2 | 1 | 1 | 0 |
| Trades & Free Agency | 12 | 4 | 3 | 3 | 2 | 0 | 0 |
| Coaching & Management | 8 | 2 | 2 | 3 | 1 | 0 | 0 |
| Awards & Legacy | 9 | 0 | 1 | 3 | 2 | 3 | 0 |
| Hidden | 6 | 1 | 1 | 2 | 1 | 0 | 1 |
| **Total** | **200** | **50** | **45** | **45** | **35** | **20** | **5** |

**Other counts:**
- Hidden: 6, all in the Hidden category.
- Account scope: 2 (`ch_two_franchises`, `dx_account_100`); all other rows are franchise scope.
- Retroactive: 122 rows may be granted from a save's history.
- Provisional thresholds: 40.

**Where the thresholds come from.** All measurements are on `main` at 58c33ee and are observation only:
- 300 single games between generated clubs (quality 50–69, 180 s quarters):
  - points: p50 13, p90 28, p99 49;
  - one passer's yards: p90 239, p99 346;
  - one receiver's yards: p90 153, p99 305;
  - one rusher's yards: p90 110, p99 304;
  - team sacks: p97 3;
  - interceptions: p99 2;
  - made field goal of 50+ yards: in 8% of games;
  - kickoff-return touchdown: 1.8% of games;
  - shutouts: 12.8%;
  - overtime: 7%;
  - win by 20+: 8.2%; by 14+: 16.3%;
  - opponent held under 100 yards: 13.5%.
- 300 Clashes (3 against 3):
  - exchanges: p10 14, p50 17;
  - winner's team health left: p50 14%, p97 54%;
  - at least 60% health left: 0.7%;
  - won within 12 exchanges: 3.3%.
- 96 club-seasons from a 3-season soak:
  - leading passer: p90 2,924 yards;
  - leading rusher: p90 1,002;
  - team sacks: p90 11;
  - team interceptions: p90 6;
  - field goals: p90 12;
  - fewest-missed kicker: 0.95 (nobody perfect with 10+ attempts).

Rarity was then set by expected frequency. Common is likely within a season or two of normal play. Mythic is a career-defining feat.

**Soaks.** Two 4-season headless franchise runs (`tools/franchise-soak.mjs`, Pro, AI-managed owner). Both ran *before* the final epic retune below; rarities are from the run.

| Seed | Club | Unlocked | C | U | R | E | L | M |
|---|---|---|---|---|---|---|---|---|
| 11 | losing seasons | 46 | 30 | 12 | 3 | 1 | 0 | 0 |
| 23 | strong club (12-win seasons, 10-game streak, Coach of the Year) | 65 | 33 | 20 | 3 | 9 | 0 | 0 |

Commons dominate as intended, and no Legendary or Mythic achievement unlocked within 4 seasons. Seed 23 unlocked 9 Epics, mostly single-game feats of a dominant team. Those thresholds were raised and marked provisional:

- passing yards in a game: 400 → 450 (`of_pass_400` → `of_pass_450`);
- touchdown passes in a game: 6 → 7 (`of_pass_td_6` → `of_pass_td_7`);
- team sacks in a game: 6 → 7 (`df_sacks_6` → `df_sacks_7`);
- sacks by one monster in a game: 3 → 4 (`df_player_sacks_3` → `df_player_sacks_4`);
- one monster's sacks in a season: 10 → 14 (`df_player_season_sacks`).

The other Epics are legitimate milestones of a great season: 12 wins, a 10-game streak, Coach of the Year, and 3 field goals in a game. The renamed ids have never been released.

Seed 23 unlocked (ids as they were then): `cl_first_win`, `cl_recruit_first`, `first_win`, `gp_no_turnover_win`, `df_first_int`, `df_int_2`, `st_first_fg`, `st_fg_50`, `aw_record`, `rival_beaten`, `df_tackles_12`, `ev_level_50`, `gp_shutout`, `gp_blowout_20`, `of_pass_250`, `of_rec_150`, `dx_seen_60`, `rival_swept`, `df_tfl_5`, `first_badge`, `gp_streak_5`, `gp_score_30`, `of_pass_td_4`, `of_rec_250`, `of_long_80`, `of_pass_400`, `df_sacks_3`, `df_player_sacks_3`, `dx_seen_100`, `cl_close`, `dr_scouts_10`, `cl_streak_5`, `wins_10`, `gp_streak_10`, `df_sacks_6`, `cl_wins_10`, `gp_hold_100`, `gp_blowout_35`, `of_pass_td_6`, `dr_scout_full`, `gy_badges_3`, `first_playoffs`, `ch_playoff_win`, `winning_season`, `first_award`, `fm_twelve_wins`, `of_season_rec_1500`, `of_season_pass_3000`, `df_player_season_sacks`, `co_coy`, `dr_first_pick`, `cl_battles_25`, `gp_road_wins`, `dx_seen_140`, `st_fg_3_game`, `cl_pre_wins_10`, `gp_ot_win`, `co_plays_1000`, `gy_gym_wins_10`, `gy_regained`, `wins_30`, `fm_winning_run_3`, `cl_quick`, `dx_knowledge_30`, `ev_ovr_80`.


## 5. Architecture

Details are in `docs/achievements/TECHNICAL.md`.

- **Definitions** (`src/data/achievements.js`): pure data, with one threshold per row. They are separate from the logic and from the UI.
- **Engine** (`src/franchise/achievement-store.js`):
  - a registry of about 120 reusable metrics, one per kind of measurement;
  - `evaluateCatalogue` checks the unearned rows that match the trigger;
  - `achievementProgress` gives the screen its bars;
  - `achEligible` decides eligibility;
  - the tracker.
  It lives in the store's file so that the published game gains no file.
- **Integration** (`src/franchise/franchise.js`): one call in `checkAchievements`, plus one-line hooks at each owner action and settled Clash. Unlocks are recorded once per franchise, written to the account store and queued for presentation.
- **Presentation** (`src/ui/screens/menu.js`, hooked from HQ).
- **No new file in the published game.** It is still 512 files, and `tools/release-files.py` reports OK.

## 6. New tracking

New tracking lives in `f.achTrack`, about 2 KB for a 3-season save (the whole save is about 8.8 MB). It is written only from results that already happened, and nothing in the game reads it.

**Games:**
- games played and road wins;
- shutout wins and playoff wins;
- conference titles;
- the current and best win streak, playoffs included;
- clubs beaten;
- defensive, kick-return and field-goal totals;
- wins over gym clubs;
- badges lost and won back;
- families faced.

**Beast Clash, by occasion (encounter, opening, overtime):**
- wins and battles;
- playoff overtime wins;
- Clashes you commanded (live, not headless);
- the current and best streak;
- close, quick and dominant wins;
- the season's record.

**Owner actions:**
- evolutions and recruits;
- draft picks, players drafted and first-overall picks;
- scouting trips and regions;
- full scouting reports;
- free-agent signings and the best overall signed;
- extensions and staff hires;
- seasons finished under the cap.

**The roster:** who was below level 50, and each monster's lowest overall seen here. This is pruned to the current roster, so "trained to 50" and "reached N overall" count only growth that happened with you.

**Comebacks:** `game-runner.step` keeps `state.maxDeficit` after each step, using the score alone. A test plays the same seeded game twice and gets the same score and RNG state.

Everything else reads records the save already keeps:
- campaign and history (results, box scores, awards);
- records and the dex;
- trades and the board;
- play stats and the Monster Hall of Fame;
- monster careers.

## 7. UI and screenshots

**The screen** is the main menu's 🏅 Achievements, and it is account-wide. It shows:
- `x / 200` and the completion share;
- rarity counts;
- recently unlocked (4);
- a "By category" fold-out with each category's count (tap one to filter);
- search;
- category and rarity filters;
- All / Unlocked / Locked.

**Each card shows:**
- the badge, name, rarity and description;
- the unlock date, or a progress bar for the open franchise (only where a number measures it).

**The detail sheet shows:**
- rarity, category and scope;
- who delivers the scene, for the originals;
- progress;
- the first earn (club and difficulty) and how many franchises earned it;
- when this franchise earned it, and whether that came from history;
- scene replay.

Hidden rows show "Hidden Achievement" and a ❓ until earned. Search never reveals them.

**Badges** are one CSS component: a category glyph inside a rarity ring (grey, green, blue, purple, gold). Mythic has a spectrum ring. Locked badges keep their ring and dim the glyph. There are no images.

**Phone layout** (emulated, Playwright Chromium, iPhone 14 profile, 390×844):
- no horizontal overflow;
- no tap target under 44 px on the screen;
- 200 cards render;
- category "Hidden" shows 1 earned name and 5 placeholders;
- searching "clash" finds 20;
- "Unlocked" lists the 7 seeded.

The screenshots are in `reports/achievements/screenshots/`:

| File | What it shows |
|---|---|
| 01-achievements-top.png | the summary |
| 02-achievements-list.png | the list |
| 03-hidden-placeholders.png | hidden placeholders |
| 04-search-clash.png | search |
| 05-detail-legacy.png | an original, with its scene |
| 06-detail-mythic.png | a Mythic detail |
| 07-toast-common.png | a Common toast |
| 08-cards-rare-epic.png | Rare and Epic cards plus the consolidated toast |
| 09-reveal-mythic.png | the Mythic reveal |

The emulator's font has no colour emoji, so some category glyphs render in monochrome; phones render them in colour.

## 8. Presentation

The queue is `f.achQueue`. It is kept in the save, so a reload loses nothing. Presenting removes the entries, so nothing shows twice. It is capped at 40.

**When unlocks show:** on HQ only, and only when no game is in progress. If a scene, sheet or modal is open (an Apex discovery, a cutscene), the queue waits and retries every 1.5 s, up to 8 times; then it waits for the next visit to HQ. It never shows during a play or a Clash.

**How they show:**

| Rarity | Presentation |
|---|---|
| Common and Uncommon | One toast. Several at once become "N achievements unlocked". |
| Rare and Epic | Up to 3 cards at the top, each with its description. They dismiss after 5 s or on tap. |
| Legendary and Mythic | A reveal sheet: badge, rarity and category, description, and a word from the commissioner (one line for Legendary, one for Mythic). |

- **Backfill** shows one line: "N achievements were awarded from your franchise's history."
- **The 24 originals** keep their cutscenes exactly. Those play first, as before.
- **Audio:** none added. The toasts are explicitly silent.

## 9. Save compatibility

**Nothing is removed:**
- `f.achievements` keeps its shape (`{year, week}`, plus `backfilled`).
- The account store's API, merge rules (earliest first-earn wins, franchise lists unioned through seed→uid links) and cloud mirror are unchanged.
- Catalogue entries carry `scene: null`.

**New franchise fields** (`achTrack`, `achQueue`, `achCatalogue`, `achDev`) are all optional, so an older build ignores them.

**Duplicates:**
- an id is earned once per franchise;
- a game or battle is counted once by its own id;
- the account store is keyed by id, so merging a copy of itself adds nothing (tested);
- an id earned in several franchises lists each franchise once (tested).

**Backfill** runs once per save, guarded by `achCatalogue`:
- the tracker is seeded only from seasons before tracking began, so nothing is counted twice (tested);
- only rows marked retroactive are checked;
- they are checked against what the save proves.

What it never infers:
- single-game box-score feats (a past game's player lines are not kept per game);
- Clash results, comebacks, faced families;
- anything about a founding roster.

**Import, franchise change and cloud sync:** these use the existing code paths. Earned records are only added to, never deleted.

**Live saves:** none were read. Checks used generated saves and soaks only.

## 10. Performance

- **Evaluation:** on a 3-season save with nothing earned (the worst case), measured while other simulations shared the CPU:
  - 1.0 ms per `sunday` check;
  - 1.2 ms per `season` check;
  - 0.34 ms per `clash` check;
  - 0.22 ms per `any` check.

  A season has roughly 100 checks: about 16 games, 35 Clashes and the owner's actions. That is about 0.1 s per season in total. Earned rows are skipped, so it gets cheaper over a career. The test budget is under 5 ms per full check.
- **Screen:** 200 cards render in one pass. Filtering redraws only the list.
- **Save:** the tracker is about 2 KB (`seen` holds at most 48 ids; sets are bounded by the league and the roster). The queue holds at most 40 entries.

## 11. Testing

**New:** `tests/achievements-catalogue.test.js`, 12 tests, all passing. They cover:
- exactly 200 unique rows, with the category and rarity totals and the 24 ids;
- every row complete: trigger, metric, threshold, text, numbers filled;
- boundaries: at, just below and just above each comparison, and a metric that does not apply;
- streaks: best and current run, duplicates ignored, road and shutout counts;
- Clash tracking: by occasion, close, dominant and quick wins, the streak, duplicates;
- season checks: home games, points allowed only over a complete season, a perfect kicker;
- franchise integration: earned once, queued once, written to the account store; a developer-shortcut franchise earns nothing;
- backfill: only what the save proves; founding rosters grant nothing; once; one notice; no double counting;
- the account store: several franchises, cloud merge, earliest first-earn, merging a copy of itself, the account-scope metric;
- hidden rows and the queue cap;
- the comeback tracker's neutrality: same score and RNG state;
- evaluation cost.

**Updated:**
- `tests/task8-m6-screens.test.js` now expects 200 achievements, including the 24 originals. The dex collection checks are unchanged and pass.
- `tests/ui/responsive.py` was stale (it expected 21) and now expects 200. It was not run.

**Run and passing:**
- central-text (every key used, no orphan lines, values supplied);
- text-style, text-never-decides;
- menu-onboarding-polish, evo-preview, qol-coach-portrait;
- task10-gym-badges, task8-m6-screens, task8-foundations.

**Targeted run: 17 files, 167 of 167 passing in 38 minutes.** The run covers:
- saves and compatibility: `save`, `franchise-save-compat`, `task9-save-compat`, `saved-lines`;
- storage: `storage-foundation`, `storage-final-audit`;
- cloud: `cloud-save`, `cloud-regressions`;
- identity and lifecycle: `uid-isolation`, `lifecycle`;
- league, replay and rules: `league-32`, `replay`, `rules`;
- Clash and weekly play: `task10-clash-franchise`, `task8-encounter-bonus`, `guided-week`, `coach-assist`.

It ran on the branch as it stood at commit d6394f1. **Rerun on the final code: 9 files, 79 of 79 passing.** The files are `achievements-catalogue`, `save`, `cloud-save`, `franchise-save-compat`, `guided-week`, `task10-clash-franchise`, `task8-m6-screens`, `central-text` and `text-style`.

**Emulated phone check:** section 7. No page errors.

**Not run:** the full fast and sim suites, and no large balance simulations (as the brief says).

## 12. Provisional thresholds

There are 40 provisional rows. Each is configurable in its one row, and each should be re-measured once the balance branch lands: its cap, Rookie quality and play changes move scoring and roster strength.

| id | name | rarity | requirement |
|---|---|---|---|
| `gp_comeback_14` | Never Out of It | rare | the largest deficit you overcame in a win ≥ 14 |
| `gp_comeback_21` | The Great Escape | epic | the largest deficit you overcame in a win ≥ 21 |
| `gp_score_60` | Scoreboard Broken | legendary | your points in one game ≥ 60 |
| `gp_streak_20` | Dynasty Run | legendary | the longest run of consecutive wins, playoffs included (tracked) ≥ 20 |
| `fm_points_300` | High-Octane Season | rare | points scored in one regular season ≥ 300 |
| `fm_wins_150` | Hall of Wins | legendary | career wins ≥ 150 |
| `of_pass_450` | Aerial Assault | epic | one monster's passing yards in a game ≥ 450 |
| `of_pass_td_7` | Seven Up | epic | one monster's touchdown passes in a game ≥ 7 |
| `df_season_allowed` | Lockdown Season | rare | points allowed in one complete regular season ≤ 100 |
| `df_season_sacks_25` | Sack Party | rare | team sacks in a season ≥ 25 |
| `df_player_sacks_4` | Quarterback Hunter | epic | one monster's sacks in a game ≥ 4 |
| `df_player_season_sacks` | Double-Digit Sacks | epic | one monster's sacks in a season ≥ 14 |
| `df_sacks_7` | Siege | epic | your sacks in a game ≥ 7 |
| `df_season_int_10` | No-Fly Zone | legendary | team interceptions in a season ≥ 10 |
| `st_perfect_kicker` | Automatic | legendary | field-goal attempts in a season with every field goal and extra point made ≥ 10 |
| `dx_seen_60` | Field Notes | common | different families faced in games ≥ 60 |
| `dx_seen_100` | Keen Observer | common | different families faced in games ≥ 100 |
| `dx_signed_10` | Growing Collection | common | different families collected by this franchise in play (founding roster and creation draft excluded) ≥ 10 |
| `dx_original_20` | Original Collector | common | original families collected in play (founding excluded) ≥ 20 |
| `dx_signed_25` | Collector | uncommon | different families collected by this franchise in play (founding roster and creation draft excluded) ≥ 25 |
| `dx_types_all` | Every Element | uncommon | families collected in play in your least-collected type ≥ 2 |
| `dx_seen_140` | Scout of Beasts | uncommon | different families faced in games ≥ 140 |
| `dx_seen_170` | Bestiary | rare | different families faced in games ≥ 170 |
| `dx_signed_50` | Menagerie | rare | different families collected by this franchise in play (founding roster and creation draft excluded) ≥ 50 |
| `dx_account_100` | Lifetime Collector | rare | families collected in play across your eligible franchises (achievements dex, not the shared Beast Dex) ≥ 100 |
| `dx_seen_all` | Seen Them All | epic | different families faced in games ≥ 192 |
| `ev_apex` | Apex Predator | rare | an Apex monster you acquired (not a founding one) ≥ 1 |
| `ev_ovr80_x10` | Stacked Roster | epic | monsters at 80 overall or better on the roster at once ≥ 10 |
| `ev_level50_x20` | Elite Academy | epic | monsters on the roster trained to level 50 with you ≥ 20 |
| `ev_ovr_95` | Generational | legendary | the overall of a monster who was below the target when first seen on your roster ≥ 95 |
| `ev_final_x5` | Evolved Dynasty | legendary | monsters on the roster that evolved to their final form with you ≥ 5 |
| `cl_close` | By a Whisker | common | Clash wins with team health under the stated share ≥ 1 (pct 10) |
| `cl_quick` | Lightning Round | uncommon | Clash wins within the stated exchanges ≥ 1 (ex 12) |
| `cl_dominant` | Dominant Victory | rare | Clash wins with team health at or above the stated share (dominant wins) ≥ 1 (pct 60) |
| `cl_streak_15` | Untouchable | epic | the longest run of consecutive Clash wins ≥ 15 |
| `cl_wins_250` | Clash Legend | legendary | Beast Clash wins ≥ 250 |
| `cl_season_unbeaten` | Perfect Clash Season | legendary | Clashes fought in a season with every one won ≥ 10 |
| `gy_season_6` | Grand Gym Tour | epic | badges won and still held at the end of a season ≥ 6 |
| `co_board_max` | Board’s Favorite | rare | seasons ending at the Board's highest confidence ≥ 3 |
| `aw_all_awards` | Grand Slam of Awards | legendary | different league award categories won ≥ 7 |

**Tightened during this work** because the first soak or a new franchise met them too easily:
- "face N families" counted prospects and draft classes. It now counts families faced in games: 60 / 100 / 140 / 170 / 192.
- "collect N families" counted the founding roster's 28–31 families. It is now 40 / 60 / 100, and the types row asks for 5 per type.
- Points allowed in a season: ≤150 → ≤100. A low-scoring league year let a 5–9 club meet 150.
- Team sacks in a season: 15 → 25.
- The Board's top confidence is easy to touch once, so it now needs 3 seasons.
- Level 50, final form, the overall marks and Apex count only growth or signings with you. Founding rosters already hold them.
- Creation-draft picks do not count as draft picks.

## 13. Limitations

- **Single-game box-score feats** cannot be backfilled: past games keep results, not per-game player lines. The same goes for Clash records, comebacks, faced families and draft-pick history before tracking began. These count from the update on.
- **The original 3 dex achievements** read the account-inclusive dex (unchanged behaviour). The new franchise dex rows read this franchise only.
- **"Commanded" Clashes** are Clashes watched live in `watch` mode. Clashes settled headless (simulated) count as wins but not as commanded.
- **Developer shortcut:** a franchise played by `fastForwardSeason` (test builds only) earns no further achievements. Edited or imported saves are not detected beyond that. The account store copies a loaded franchise's earned list, as before.
- **The badge glyphs are emoji**, so their look depends on the platform.
- **Thresholds** reflect `main` today. The balance branch will move several of them (section 12).

## 14. Merge conflicts with the balance work

Checked with `git merge-tree` against `origin/impl/balance-audit-2026-11`.

- **Conflict:** `GRIDIRON_BEAST_GDD.md`. Both branches append a new section at the end (§61 there, §62 here). Resolve by keeping both, §61 then §62.
- **Auto-merges cleanly:**
  - `src/franchise/franchise.js`: different functions (cap, lineup and kicker there; achievement hooks here);
  - `src/text/en.js`: new keys in different places;
  - `src/ui/screens/hq.js`, `src/ui/screens/menu.js`;
  - `src/sim/game-runner.js`: only here;
  - `styles/app.css`: the achievement styles sit beside the toast rules, which avoided an end-of-file conflict.
- **Behaviour after the merge:**
  - The 1.6 M cap, the Rookie quality experiment and the play changes shift scoring, sacks, roster strength and draft value. The 40 provisional thresholds should be re-measured on the merged build (`tools/achievements-catalogue.mjs` plus a soak).
  - `fa_cap_clean_5` reads `salarySummary(f).over`, so it follows whichever cap applies, including legacy caps for existing saves.
  - Kicker: with no kicker the owner can still play (F-14), and the special-teams rows simply do not progress.

## 15. Decisions for the owner

1. **Provisional thresholds:** approve as they are, or re-measure them after the balance merge (recommended).
2. **Developer shortcut:** should a franchise played by it lose further achievements (current), or should only the shortcut's own seasons be excluded?
3. **Backfill:** grant retroactive rows silently with one summary line (current), or present them one by one?
4. **Legendary and Mythic reveals:** keep the commissioner's line, or vary the speaker by category (the rival for rivalry rows, the Board for titles)?
5. **Old saves:** should achievements that cannot be backfilled be shown as "tracking began on <date>" on the screen?

## 16. Future improvements

- Per-category commissioner lines for Legendary and Mythic reveals. This needs dialogue writing.
- Keep a compact per-game box-score line in history, so future single-game feats could be backfilled.
- An HQ "next achievements" nudge showing the three closest by progress.
- Share or export an achievement card.
- Re-run the threshold measurement automatically with a soak in the release checks.

## 17. Modified and new files

**Game (published): no new files.**

| File | Change |
|---|---|
| `src/data/achievements.js` | catalogue, categories, rarities, presentation, thresholds, `achievementDesc` |
| `src/franchise/achievement-store.js` | engine: metrics, tracker, evaluation, progress, eligibility |
| `src/franchise/franchise.js` | `checkAchievements` catalogue pass, `awardCatalogue`, `gameFacts`, Clash and owner-action hooks, `backfillCatalogue`, unlock queue |
| `src/franchise/dev-shortcut.js` | `achDev` flag |
| `src/sim/game-runner.js` | `maxDeficit` (sim-neutral) |
| `src/ui/screens/menu.js` | screen, badges, presentation |
| `src/ui/screens/hq.js` | backfill and presentation hooks |
| `src/ui/screens/legacy.js` | filled descriptions |
| `src/text/en.js` | 352 achievement lines and 55 screen lines; 4 unused menu lines removed |
| `styles/app.css` | `.ach-*` |

**Not published:**
- `tests/achievements-catalogue.test.js` (new);
- `tests/task8-m6-screens.test.js`, `tests/ui/responsive.py` (updated counts);
- `tools/achievements-catalogue.mjs` (new);
- `docs/achievements/CATALOGUE.md`, `catalogue.json`, `TECHNICAL.md` (new);
- `GRIDIRON_BEAST_GDD.md` (§62; §21.1 marked superseded in part);
- `reports/achievements/` (this report and the screenshots).
