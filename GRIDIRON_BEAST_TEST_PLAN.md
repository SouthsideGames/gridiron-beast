# Gridiron Beast — Test Plan

All automated tests run with `npm test` (`node --test tests/`), no dependencies. UI responsiveness runs with `python3 tests/ui/responsive.py` (requires Playwright; dev-only). Every failing gameplay case is reproducible from its seed.

## 0. Current status

`npm test`: **40 tests, all passing** (≈45 s). `tests/ui/responsive.py`: **all checks pass** at 320×568, 375×667, 390×844 and 412×915, including a complete game played to the final whistle at 390×844.

## 1. Automated suites

| Suite | File | What it proves |
|---|---|---|
| RNG & determinism | `rng.test.js` | Same seed ⇒ same sequence; same play inputs ⇒ identical frames and result |
| Personnel | `playbook.test.js` | Every play fields exactly 7; package slots exist; no duplicate slots; offense has 3 OL; every assignment has a valid type |
| Route assignments | `playbook.test.js` | Exactly one primary on every pass play; routes start at the player's alignment; art role (primary/secondary/alternate/block/deep/middle/flat/rush/man) resolvable for every assignment; block assignments end in T-bars, routes in arrowheads |
| Field geometry | `field.test.js` | Route/zone points clamped inside end line and sidelines at every ball spot 1–99; yard-line labels; spot math |
| Engine: dead balls | `engine.test.js` | 5,000 seeds × random plays: every play ends in an allowed dead-ball result, never by the safety guard; ball spot = reported yards |
| Engine: boundaries | `engine.test.js` | No player outside sideline+1 yd or end line at any frame; carrier crossing sideline ⇒ out of bounds at that spot |
| Engine: blocking | `engine.test.js` | Linemen engage rushers on pass plays (engagement events); sack rate falls as Blocking rises |
| Engine: execution | `engine.test.js` | Receivers reach their route's final landmark region when not targeted; man defenders stay within N yards of targets; zone defenders occupy their zones; QB Draw carrier is QB; Screen target is RB |
| Engine: attributes | `attributes.test.js` | Speed ↑ ⇒ yards/play ↑; Accuracy ↑ ⇒ completion ↑; Tackling ↑ ⇒ yards allowed ↓; Awareness ↑ ⇒ RB yards ↑; Catching ↑ ⇒ INT ↓ (paired seeds, statistically bounded) |
| Engine: balance bands | `balance.test.js` | Over 3,000 plays: run avg 3–7 yd, completion 50–75%, sack 3–12% of dropbacks, INT 1–5% of attempts, TD share > 0 |
| Rules: downs & scoring | `rules.test.js` | First downs, goal-to-go, turnover on downs, TD/PAT/2-pt, FG, safety, touchbacks, interception touchbacks |
| Rules: clock | `rules.test.js` | Runoff on running clock, stops on incompletion/score/turnover/timeout, OOB only last 2:00, play snapped at 0:01 completes, quarter/half transitions, halftime kickoff to the right team, OT |
| Special teams | `special-teams.test.js` | Kickoff/punt distances in range, touchbacks, FG make% declines with distance, miss spot, onside |
| Coaching AI | `coach-ai.test.js` | 4th & long in own territory ⇒ punt; in range ⇒ FG; 4th & 1 at opp 40 ⇒ go; trailing by 4 late ⇒ go; 2-pt chart; kneel when leading at the end; hurry-up when trailing late |
| Full games | `game.test.js` | 200 headless games complete, scores legal (no 1-point totals impossible), every game has a winner after OT, no stalled phase |
| Franchise | `franchise.test.js` | Schedule matches golden vectors; season + playoffs complete; injuries respect durability; XP/levels; cap lock; legacy v5 save import preserves owner/team/staff/record |
| UI smoke (DOM) | `ui/responsive.py` | At 320×568, 375×667, 390×844, 412×915: no horizontal overflow, match Snap visible above the fold, play grid is 3 columns × 2 rows, all buttons ≥ 44 px, no console errors through onboarding, every tab, the weekly loop, a game to the final whistle, practice, audit, settings and standings |

## 2. Manual checklist (device QA)

1. New franchise → onboarding → five hires → HQ in under 2 minutes.
2. Complete a week; recruit a monster; it appears on the roster and the cap updates.
3. Sunday: coin toss, kickoff, drive, punt, FG, TD + PAT + kickoff, interception, timeout, end of half, halftime kickoff, final; record updates.
4. Key Moments returns control on 3rd down and inside the 20.
5. Play art: colours and endpoints match the legend; nothing drawn past the end line at the opponent 3.
6. Practice and Playbook Audit run the same engine as matches.
7. Reload mid-game and mid-week; state resumes.
8. iPhone SE (320 pt) and a 6.7" Android: everything reachable one-handed.

## 3. Reproducing a bug

Every scrimmage play in the in-game Play Log shows a repro code `offense|defense|ballOn|seed`. `node tests/tools/replay.js CODE` re-runs it with generated attributes and prints the event trace; add `--save export.json` (a Settings export) to replay with the franchise's actual starters.
