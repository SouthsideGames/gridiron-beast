# Achievement Overhaul: Follow-up to the Owner's Review (PR #192)

Branch `feature/achievement-overhaul-200`. **PR #192 stays in draft.** Nothing has been merged.

The constraints still hold:
- exactly 200 achievements;
- the 24 original ids and earned records kept;
- category totals unchanged: 20 / 15 / 12 / 15 / 15 / 10 / 15 / 15 / 20 / 10 / 8 / 10 / 12 / 8 / 9 / 6;
- rarity totals unchanged: 50 / 45 / 45 / 35 / 20 / 5;
- no gameplay rewards, no audio and no balance change;
- no new published file (still 512).

The four 15-season balance runs were not touched. They finished separately.

## 1. Changes made following this review

**Owner decisions:**

| # | Decision | Implementation |
|---|---|---|
| 1 | Re-measure provisional thresholds after the balance merge | Not finalized here (section 7). The count is now **40**: the 36, plus 4 collection rows re-defined to count only play (section 2). |
| 2 | Keep permanent franchise-level disqualification for the developer shortcut | Kept: `f.achDev` stops all further awards. What was earned before stays, and other franchises stay eligible. The franchise is also recorded as disqualified in the account store, which syncs through the cloud (section 3). |
| 3 | One summary notice for backfilled achievements | Kept: "N achievements were awarded from your franchise's history", with plural forms. |
| 4 | Legendary and Mythic speakers by category | Done. The 24 original cutscenes are untouched. See the speaker breakdown below. |
| 5 | Notice for rows whose history cannot be reconstructed | Done, with the tracking start shown (section 4 shows screenshots 13 and 14). See the notice breakdown below. |

**Speakers for Legendary and Mythic reveals (decision 4):**
- **The commissioner** (wry, keeps the league's tallies): Beast Dex, Evolution, Beast Clash, Legendary Monsters, Draft.
- **The rival GM, on the phone, with his portrait and club** (needling): Game, Offense, Defense, Special Teams, Gym, Hidden.
- **The Board's typed letter** ("TO THE GENERAL MANAGER OF …" … "THE BOARD"): Championships, Franchise, Awards, Coaching, Trades.

Each category has its own line, and each speaker has a Mythic line.

**History notice (decision 5):** every row is classified as one of:
- **complete:** 103 rows. The save keeps everything the row reads, so no notice.
- **partial:** 21 rows. Past seasons count where the record proves them, such as a win streak within one season. Notice: "Earlier seasons count where the record proves them; full tracking began {year}, week {week}."
- **tracked:** 76 rows. Notice: "Counted from {year}, week {week}, when tracking began."

The notice appears only in a franchise that existed before tracking began. A franchise tracked from its first week never shows one. It appears on the card and in the detail sheet.

**Implementation review items:**

- **Flawless.**
  - A true flawless condition (no combatant lost) measured at **46% of Clash wins** (68 of 148 wins in 300 battles), so it could not be Rare.
  - The row is renamed **Dominant Victory** (`cl_flawless` → `cl_dominant`): win with at least 60% of your team's health left, 0.7% of battles.
- **Field General.**
  - Watch mode alone is not participation: the game can settle a watched battle with no tap.
  - The row now counts only Clashes in which **the owner made at least one rotation call** (`e.decisions.a` not empty, including "stay"), played live (not headless).
  - It is renamed `cl_commanded_25`: "Win 25 Clashes in which you made a rotation call yourself."
- **Notification queue.**
  - Still capped at 40.
  - When full, the oldest Common/Uncommon toasts fold into one "N achievements unlocked" count, then the oldest Rare/Epic cards.
  - **Legendary/Mythic reveals and the backfill notice are never dropped.**
  - Earned records (`f.achievements` and the account store) are written before the queue and never depend on it.
- **Golden Boot and Return King** (follow-up A-2 on the balance branch, award keys `gboot` and `rking`).
  - Two weak Special Teams rows are replaced: "Make 50 field goals" and "30 touchbacks in a season". The new rows are **`st_golden_boot`** and **`st_return_king`**, both Rare and retroactive.
  - To keep the rarity totals, `st_kr_td` and `st_season_fg_12` move from Rare to Uncommon. Their measured frequency supports it: a kick-return touchdown comes in 1.8% of games, and 12 field goals is the p90 of club seasons.
  - These two rows can only be earned once the balance branch is merged, which is why it must merge first (section 8).
  - `aw_all_awards` ("7 different award categories") stays reachable before and after: 7 kinds before, 9 after.
- **Bug fixed.** Opening or importing a franchise copied only the original 24 achievements into the account store. The catalogue rows hit a missing cutscene and were silently skipped. Now all are copied, with `scene: null`.
- **Front Office hires** (`replaceStaff`) now count toward the staff rows. Before, only the onboarding hire did.

## 2. Achievement condition audit

All 200 rows were reviewed for names, descriptions, requirements, rarity and whether they can be obtained.

**Mechanically wrong or misleading (fixed):**

| Row | Problem | Fix |
|---|---|---|
| `lg_tracks_3` "Choose 3 legend tracks" (Uncommon) | A track is chosen only after winning a Beast Bowl, so this needed 3 titles. | Replaced by **`lg_sighting`** "Face a legendary monster in a game" (Uncommon). |
| `lg_unlocked_2` "Unlock 2 legendaries" (Legendary) | Needs 6 titles (3 tracks each), harder than the Mythic "Five Rings". | Replaced by **`lg_legend_playoff`** "Win a playoff game with a legendary in your lineup" (Legendary). |
| `legend_tracked` (original, Uncommon) | Needs a Beast Bowl title, so it is as hard as `first_title` (Epic). | Rarity → **Epic**. Id, check and cutscene unchanged. |
| `legend_unlocked` (original, Epic) | Needs 3 titles. | Rarity → **Legendary**. Id, check and cutscene unchanged. |
| `fm_seasons_15` (Legendary) | Rewards persistence, not skill; any franchise that keeps playing gets there. | Rarity → **Uncommon**, balancing the two original-row changes above. |
| `cl_flawless`, `cl_watch_25` | Misleading names. | Section 1. |
| `dx_signed_*`, `dx_original_*`, `dx_types_all`, `dx_account_100` | Counted the founding roster's 28–31 families (and `dx_account_100` counted the shared Beast Dex). | Count only families collected **in play**. Targets reset to 10 / 25 / 50, 20 originals, and 2 of every type. Descriptions say "founding roster not counted". All provisional. |
| `ev_level_*`, `ev_ovr_*`, `ev_final_*`, `ev_apex`, `dr_first_pick` | Descriptions did not say that founding gifts and creation-draft picks don't count. | Rewritten, e.g. "Train a monster to level 50 on your roster", "Develop a monster to 80 overall on your roster", "Make a pick in a season's draft (the creation draft not counted)". |
| `ch_playoffs_5` "October Regulars" | The game has no October. | Renamed **"Postseason Regulars"**. |
| `cl_quick` "Blitzkrieg" | Unsuitable name. | Renamed **"Lightning Round"**. |
| Descriptions with large numbers | Shown as "3000". | Thousands separators: "3,000 yards". |

**Can each row be obtained?** Checked against game data:
- **The league:** 32 clubs, 192 families (16 per type, so "2 of every type" is reachable).
- **Gyms:** 12 Gym Leaders; an owner meets 4–7 different gym clubs a season, so "6 badges in a season" is possible.
- **Scouting:** 8 scouting regions.
- **Clash:** overtime Clashes exist in the playoffs (5 against 5).
- **Clubs faced:** all 192 families appear on AI rosters, so "face every family" is possible.
- **Drafts and trades:** 3 draft rounds; trades with the rival are allowed; staff can be replaced through the Front Office.

No row is impossible on the merged code. Two rows depend on the balance branch: Golden Boot and Return King.

**Redundancy check.** Tiered ladders such as 30/45/60 points, 5/10/20 streaks and 10/50/100/250 Clash wins are intended. No two rows measure the same thing at the same threshold.

**Kept and flagged** for the post-balance check:
- `fa_cap_clean_5`: its difficulty depends on the cap.
- `co_hires_10`: needs staff turnover.
- `st_perfect_kicker` (Legendary): no club-season in 96 met it, but it is plausible for a good kicker.

## 3. Eligibility and exploit prevention

| Path | Finding | Status |
|---|---|---|
| Developer shortcut | `fastForwardSeason` sets `f.achDev`, so nothing more is awarded. The franchise key goes on the account store's disqualified list (`markDisqualified`). | Tested |
| Account Dex | Before: account-wide dex rows read the **shared Beast Dex**, which every franchise feeds, including a disqualified or imported one. Now the achievements keep their own dex (`achDex`), written only by eligible franchises, with founding families marked. Disqualified franchises' entries are excluded when counting. The original three dex rows now read this franchise plus eligible franchises, never the shared Beast Dex. | Fixed and tested |
| Account titles | "Champion with 2 franchises" excludes disqualified franchises. | Tested |
| Cloud sync | The disqualified list and `achDex` merge like the rest (union, canonical uids). A merged copy keeps the disqualification. | Tested |
| Imports | Opening an imported disqualified franchise marks it on that device. Its earlier, legitimately earned record is still copied. | Tested |
| Archived franchises | `achEligible` is false for archives, so no new awards. Their past records stay. | Covered |
| Founding roster and creation draft | Excluded from: <br>• collection: families first collected in year 1, week 1; <br>• Apex: join `via: 'founding'`; <br>• level 50 and overall marks: the monster must be seen below the mark on your roster; <br>• final form: an evolve event at your club, not the founding backfill; <br>• drafting: `drafted.year ≥ 1`, and the live hook skips the creation draft; <br>• free agency: joins via a signing only. | Tested on 4 founding seeds: no collection, evolution, draft, trade or legendary row is granted at creation or on backfill |
| Duplicate events | Each game is counted once by its activity id and each battle by its key. An id is earned once per franchise. | Tested |
| Edited saves | A hand-edited save's records cannot be told from real ones. The legacy backfill now also respects eligibility. | Limitation (section 6) |

## 4. Updated UI screenshots

Emulated: Playwright Chromium, iPhone 14 profile, 390×844. Files are in `reports/achievements/screenshots/`. Checks:
- no horizontal overflow;
- no tap target under 44 px;
- no page errors;
- the responsive layout is unchanged.

| File | Shows |
|---|---|
| 01 | Summary |
| 02 | List |
| 03 | Hidden placeholders |
| 04 | Search |
| 05 | An original with its scene |
| 06 | Mythic detail |
| 07 | Common toast |
| 08 | Rare/Epic cards plus the folded count |
| 09 | Mythic reveal (Board: Five Rings) |
| **10** | Legendary reveal, **Board letter** (Back to Back) |
| **11** | Legendary reveal, **rival GM** (Scoreboard Broken) |
| **12** | Legendary reveal, **commissioner** (Generational) |
| **13** | **Tracking notices** on tracked rows (10 on the Offense filter) |
| **14** | **Detail sheet** with the "partial history" notice (Hot Streak) |

A complete row (Clean Sheet) shows no notice; the screenshot check confirmed 0 notes on it. The emulator has no colour emoji font, so some glyphs render in monochrome.

## 5. Targeted regression tests

**New: `tests/achievements-metrics.test.js`, 7 of 7 passing in 52 s.** It covers:
- **Every metric** the catalogue uses (136) has a positive case and a negative case.
  - The cases are built from realistic franchise state: game facts, played-out tracker calls, history entries, rosters, the dex, awards and records.
  - For thresholds, the positive is at the target and the negative just below it.
  - Founding and creation-draft variants are the negative cases.
- **Real play:** up to 7 weeks through `simOneWeek` (game, Clash, evolution hooks).
  - Games, faced families and opening Clashes are tracked.
  - Catalogue achievements are earned and reach the account store.
  - Evolutions made on the card are counted.
  - A Front Office replacement counts as a hire.
- **Founding:** 4 seeds, no acquisition, development or drafting row granted.
- **Developer disqualification:** stops awards and keeps earlier ones; account titles and the shared Beast Dex are excluded; the disqualified list survives a cloud merge and an import.
- **Queue:** reveals and the backfill notice survive overflow; toasts fold into a count; every record persists.
- **Persistence:**
  - Reload: export and import keep the records, the queue and the tracker, and nothing is earned twice.
  - Franchise switching: each franchise has its own records, and the account lists both once each.
  - Cloud: merging the same copy twice changes nothing.
- **History coverage and tracking start.**

**Existing achievement test:** `tests/achievements-catalogue.test.js` (12 tests). It was updated for the renamed `commanded` metric.

**Targeted regression run (2026-11-26):** 18 test files, **137 of 137 tests passing**, 0 failing (26 min). The files include
`achievements-catalogue`, `achievements-metrics`, `central-text`, `text-style`, `text-never-decides`, `task8-m6-screens`, `save`, `cloud-save`,
`franchise-save-compat`, `guided-week`, `task10-clash-franchise`, `uid-isolation`, `lifecycle`, `task10-gym-badges` and `task8-encounter-bonus`.

**Not run:** the full fast and sim suites. The brief asks for targeted testing only.

## 6. Remaining issues and limitations

- **Golden Boot and Return King** need the balance branch. On this branch alone they can't be earned.
- **Hand-edited or fabricated saves** cannot be detected. Their records are trusted like any other franchise's, as before.
- **"Founding" families** are those first collected in year 1, week 1. A real signing made in the opening week is also excluded. This is conservative.
- **Old saves** show the tracking notice on 97 rows (76 tracked plus 21 partial). Those rows count only from the update, or from what the record proves.
- **Clash replays in Watch mode** settled with no tap don't count as commanded. This is intended.
- **40 provisional thresholds** wait on the balance merge (section 7).

## 7. Post-balance threshold calibration

**Not done yet, as instructed.** The balance branch is not merged, and these thresholds must not be finalized on the current balance.

The plan once `impl/balance-audit-2026-11` is merged into this branch's base:
1. **Reuse the existing evidence:**
   - the 8 runs of 15 seasons (Rookie −4/−7, Pro, All-Star; `reports/balance-impl/final-cal/franchise/`);
   - the 500-game study;
   - the Clash pairs.
2. **Add only targeted measurements:**
   - single-game box-score distributions on the merged engine, with the same 300-game method;
   - soaks at each difficulty for the collection and Clash rows.
3. **Report each of the 40 rows** with id and name, current rarity, current requirement, observed distribution, observed unlock frequency, recommended requirement, recommended rarity (only if justified), and the reason.
4. **Judge each row on its own** across Rookie, Pro and All-Star. A single 4-season run is not a reason to raise a threshold.

The 40 rows:
- **Game:** gp_comeback_14, gp_comeback_21, gp_score_60, gp_streak_20.
- **Franchise:** fm_points_300, fm_wins_150.
- **Offense:** of_pass_450, of_pass_td_7.
- **Defense:** df_season_allowed, df_season_sacks_25, df_player_sacks_4, df_player_season_sacks, df_sacks_7, df_season_int_10.
- **Special teams:** st_perfect_kicker.
- **Beast Dex:** dx_seen_60, dx_seen_100, dx_signed_10, dx_original_20, dx_signed_25, dx_types_all, dx_seen_140, dx_seen_170, dx_signed_50, dx_account_100, dx_seen_all.
- **Evolution:** ev_apex, ev_ovr80_x10, ev_level50_x20, ev_ovr_95, ev_final_x5.
- **Beast Clash:** cl_close, cl_quick, cl_dominant, cl_streak_15, cl_wins_250, cl_season_unbeaten.
- **Gym:** gy_season_6.
- **Coaching:** co_board_max.
- **Awards:** aw_all_awards.

## 8. Final merge readiness

**Not ready to merge yet.** It is ready for the owner to review the non-balance changes.

**Done:**
- every review item except post-balance calibration;
- tests pass on the targeted set;
- the published file count is unchanged.

**Blocking merge:**
1. The balance branch must merge first. Golden Boot and Return King need its awards, and the thresholds must be calibrated on it.
2. The post-balance threshold calibration (section 7).
3. The owner's review of these changes.

**Known merge conflict:** `GRIDIRON_BEAST_GDD.md` only. Both branches append a section; keep §61 and then §62.
