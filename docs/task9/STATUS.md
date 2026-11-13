# Task 9: Franchise History Completion — status

Branch `task9-franchise-history-completion`, released as `v43.12.0-franchise-history`. Hall of Fame rules and measurement: `docs/task9/HALL_OF_FAME.md`.

## What the player sees

- **History strip.** Franchise History, Award History, Records and the Monster Hall of Fame, joined by one strip (`src/ui/screens/history.js`). Reached from HQ ("History & Records"), the League Hub and an archived franchise's League tab.
- **Franchise History.** Totals, accomplishments, past champions, every season in folds of ten.
- **Award History.** By season, or by award with the most frequent winners.
- **Records.** Single game, season, career leaders and team records, with the previous holder where the book kept one.
- **Monster Hall of Fame.** Plaques, every election (one open at a time, with a replay of its ceremony) and the retired candidates. A sealed result shows only a notice.
- **Career pages.** Hall class, retirement year, Hall status and records held.
- **Hall of Fame Day.** An offseason step on HQ's next-step button and a card on the offseason page (`src/ui/screens/hall-ceremony.js`): the commissioner's address, the nominees, the anonymous Board, one reveal per inductee, the class, closing remarks, a League News item. Years with no nominee or no inductee have a short ceremony.

The owner's own Hall of Fame card (the GM Hall of Fame) is unchanged and separate.

## Safeguards

- The election is stored when the season closes; the ceremony only shows it. Reloading cannot change it.
- Holding the ceremony writes the year into `monsterHallOfFame.ceremonySeenYears` and one League News item, once. Nothing else in the save moves (tested on a real franchise against a twin that never attends).
- The next season cannot be started from the offseason page until the ceremony is held. Hands-off tools that start the season directly are not blocked; the result then becomes public when the season starts, with no news item.
- No save-schema change. `monsterHallOfFame` and its fields are optional.

## Verification (2026-11-12 and 13)

- **Full suite:** 2,103 of 2,103 passed, none skipped, at 6fcaaf3 (`npm test`, 50 min, nothing else running).
- **Baseline comparison:** two hands-off franchises played to the 20-season limit on the final code and on `main` (seeds 3 and 4): all 40 seasons give the same save digest, leaving out the Hall data and saved-line origin notes. No problem from the per-season history checks.
- **Hall measurement:** eight real 20-season franchises (seeds 3 to 10); see `HALL_OF_FAME.md`.
- **30 and 35 seasons:** the game ends a franchise after 20 seasons, so these lengths are tested with constructed history records only.
- **Save size at season 20:** Hall data 70 to 75 KB in a 6.1 to 6.4 MB save (about 1%).
- **Browser walkthrough (Chromium, not an iPhone):** history screens at 320, 360, 390 and 440 px and 956×440 landscape; Hall of Fame Day at 320, 390 and 440 px, landscape and reduced motion, with real 20-season saves, including the no-inductee and no-nominee ceremonies and a replay. No page errors, no horizontal overflow, footer never covers content.

## Known limits

1. A career is counted from the franchise's first season, so a veteran who was old when the league began has few seasons on record.
2. A monster who retires after season 17 can never be elected: the franchise ends after season 20.
3. Monsters who retired before Task 9 are not candidates (owner decision).
4. Linemen and defensive backs have no league award and few records open to them; they enter the Hall mainly as the best their position has seen.
5. A ceremony skipped by a hands-off tool writes no League News item.
