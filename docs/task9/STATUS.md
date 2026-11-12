# Task 9: Franchise History Completion — status

Branch `task9-franchise-history-completion`. Not merged. Awaiting the owner's review on an iPhone.

## What the player sees

- **History strip.** Four screens joined by one strip: Franchise History, Award History, Records, Monster Hall of Fame (`src/ui/screens/history.js`). Moving along the strip replaces the screen, so Back leaves the history in one step.
- **Entry points.** HQ ("History & Records"), the League Hub (the strip under every tab) and the League tab of an archived franchise. Before Task 9, Franchise History and Award History had no live button: the old League screen that linked to them had been replaced by the League Hub.
- **Franchise History.** Totals (seasons, all-time record, titles, playoff trips, league awards, Hall of Famers), accomplishments, past champions, and every season in folds of ten (only the newest open).
- **Award History.** By season, or by award with the most frequent winners. Coach of the Year has no monster link.
- **Records.** Single game, season, career leaders and team records. A previous holder is shown only when the record book kept one.
- **Monster Hall of Fame.** Plaques for inductees, every election (one open at a time, ballot shortened to the inductees and leading votes), and the retired candidates (30 most recent first). No player vote.
- **Career pages.** Hall class on the header, retirement year, a Monster Hall of Fame section (inducted, last ballot, or first eligible year) and records held.

The owner's own Hall of Fame card (the GM Hall of Fame) is unchanged and separate.

## Rules left as found

15 voters, 70% needed, at most 3 inductees a year, three-season wait. No gameplay, balance, retirement, contract or save-schema change.

## Verification (2026-11-12)

- **Full suite:** 2,088 of 2,088 passed at 4fedf4c (`npm test`, 51 min, nothing else running). It includes 10 new tests in `tests/task9-history-screens.test.js` and `tests/task9-save-compat.test.js`.
- **Real franchises:** two hands-off franchises played to the 20-season limit with `tools/task9-history-study.mjs`, on this branch and on `main`.
  - All 40 seasons give the same save digest on both builds, leaving out the Hall data and the saved-line origin notes (which depend on what was read on screen and which no rule reads).
  - No problems from the per-season checks: one election per season, nobody inducted twice, while active or early; candidates match preserved retirement records; awards, records and season summaries match the franchise; every inductee opens a career page; a JSON round trip changes nothing.
  - The study keeps the board content so the owner is not dismissed; `--real-board` turns that off.
- **30 and 35 seasons:** the game ends a franchise after 20 seasons, so these lengths are tested with constructed history records only (`tests/task9-long-franchise.test.js`, `tests/task9-history-screens.test.js`).
- **Save size at season 20:** Hall data 175 to 209 KB in a 6.2 to 6.5 MB save (about 3%). Building the whole history view takes 1 to 3 ms.
- **Browser walkthrough:** Chromium at 320, 360, 390 and 440 px wide and 956×440 landscape, with real 17- and 20-season saves and an archived franchise: no page errors, no horizontal overflow, links and Back correct. This is not an iPhone test.

## Known limits and open questions for the owner

1. **Titles dominate the vote.** Each title is worth 18 points and the bar is about 63, so long-serving members of a dynasty are inducted almost automatically (a kicker with six titles received 15 of 15 votes).
2. **The ballot never shrinks.** A candidate who is not inducted stays on every later ballot. After 17 seasons one ballot held 118 names, several with enough votes but no room in the class of three.
3. **Earlier retirements are not candidates.** Only retirements that happen after this update are recorded; a monster who retired before it never reaches the ballot.
4. **"Seasons" on a candidate** counts seasons the league has on record for him, not seasons played, and the vote uses that number.
5. **Induction is quiet.** Nothing announces a new class in League News; adding a line would change saved news and was left out.

## Preview

"Gridiron Beast Task 9 Preview", a new private artifact (https://claude.ai/artifact/XBwh7qiC9RZD74AeWvEchs), build `v43.12.0-task9-preview-1`, 435 files, staged from the branch with `BUILD.test = true` and the title changed. The main game link and the two older test links were not touched.
