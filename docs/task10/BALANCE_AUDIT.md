# Task 10: final Franchise Mode balance audit

Branch `task10-franchise-final-balance`, from the Task 9 release tree. Nothing here is merged to `main`. This file is the running record; sections marked **pending** have no measurement yet.

## Method

- **Real franchises only.** Every figure comes from hands-off franchises played by the game itself (`tools/franchise-soak.mjs`), 20 seasons each.
- **Runs so far.** Eight franchises, seeds 3 to 10, rookie difficulty, board kept content so the owner is never dismissed (`tools/task9-history-study.mjs`). Their saves are the input of the Hall of Fame study.
- **Runs in progress.** Seeds 11 to 14, default difficulty, with the per-club, per-season recorder of the Task 8 league-health study (`tools/t8-league-health.mjs`).
- **Earlier evidence still valid.** Task 9 changed no gameplay result (40 of 40 seasons identical to the previous release), so the Task 8 M6 20-season records (`docs/task8/m6/`, seeds 1 to 3) and their approved targets (`docs/task8/m6/OWNER_ADOPTION_2026-11-11.md`) still describe the released game.

## A. Hall of Fame — measured

Full results: `docs/task9/HALL_OF_FAME.md`. Summary over 8 franchises (1,564 eligible retirees):

| Measure | Result |
|---|---|
| Inductees after 20 seasons | 12 to 20 per franchise, mean 15.9 |
| Eligible per election | 78 |
| Nominees per election | 12.9 (limit 15) |
| With enough votes per election | 1.1 |
| Kept out by the limit of three | 0.1 per election; 9% of elections |
| Wait from eligibility to induction | mean 0.4 seasons; 83% first ballot |
| Classes of 0 / 1 / 2 / 3 | 49% / 20% / 15% / 16% |
| Highly accomplished, never inducted | 6 |
| By position | QB 15%, TE 14%, RB 11%, DL 8%, LB 8%, K 7%, S 7%, CB 6%, WR 6%, OL 4% |
| Titles | 3% of an inductee's points; 117 of 127 inducted with title points removed |

- **Passes:** titles no longer carry a case; the ballot of 15 and the class of three do not build a backlog; no position is shut out.
- **Open (owner decision):** how selective the Hall should be; quarterbacks enter at about four times the rate of linemen because awards and records favour them.
- **Finding (medium):** every induction falls in seasons 8 to 20, because a career is counted from the franchise's first season and a monster needs a long recorded career. The first seven or eight ceremonies of every franchise are empty.

## C. League competitive balance — first findings (8 franchises, rookie difficulty)

- **Finding (high, needs confirming): a hands-off owner's club stops winning for years.** In 6 of 8 franchises the owner's club had runs of 0-9 seasons; seed 3 was winless for its last 12 seasons and seed 10 for 12 of its last 14. A club that never wins a game over many seasons points to forfeited games (the hands-off owner continues under the forfeit rule when the lineup is incomplete), not to weak play. The league-health runs record lineups and roster sizes and will show which. If it is forfeits, real players are protected by the lineup safeguard, but every other club's record, and every award and record set against that club, is distorted in these studies.
- **Finding (medium): titles concentrate.** One club won 6 to 11 of the 20 titles in 7 of 8 franchises (11 for the owner's own club in seed 4). Distinct champions per franchise: 6 to 12.

## E. Awards and records — first findings

- **Finding (high): one monster wins the MVP again and again.** The most MVP awards won by a single monster in a franchise: 4, 4, 5, 5, 6, 8, 9 and 12. In seed 10 a defensive lineman won 12 of 20.
- **MVP by position (160 awards):** RB 39, QB 35, DL 37, WR 37, TE 11, CB 1. No linebacker, safety, lineman or kicker won one.
- **Pending:** the other awards, record-breaking frequency by season, and whether award winners match production.

## B, D, F — pending

- **B. Monster progression:** attribute growth, peaks, decline, retirement ages, Apex progress. Source: league-health runs and `docs/task8/m6/CAREER_FINDINGS.md`.
- **D. Economy and rosters:** cap use, contracts, free agency, AI spending, kicker coverage. Source: league-health runs and `tools/task8-m6-economy-review.mjs`.
- **F. Football and abilities:** offence against defence, pass against run, abilities, fields, pancakes, statuses. Source: `docs/task8/m6/PANCAKE_FINDINGS.md`, `final-gameplay-comparison.json`, and new game samples.

## Decisions waiting for the owner

1. Hall selectivity (the Board's standard), and whether linemen and defensive backs should have an award of their own.
2. Whether repeated MVP awards by one monster should be limited, and how (voter fatigue, a stronger team-record part, or nothing).
3. Whether a career should count seasons played before the franchise began.
