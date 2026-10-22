# Gridiron Beast — Test Plan

All automated tests run with `npm test` (`node --test "tests/**/*.test.js"`), no dependencies. The browser tools need Python Playwright and Chromium (dev only). Every gameplay case is reproducible from its seed.

## 0. Current status (2026-10-22, branch `type-matchups`: type effectiveness in football and the Type Chart, GDD §32)

- `npm test`: **315 tests, all passing** (306 on `main` after PR #36 plus 9 in `tests/type-matchups.test.js`).
- `tools/type-balance.mjs`: 300 paired AI-vs-AI games (before / lean / types), the rating × type grid, the one-on-one check and the Dragon study (400 paired games per strength). Results are in GDD §32.6. No values changed.
- `tools/type-ui-check.py` (headless Chromium at 390×844, 360×640 and 320×568): the type icons appear before the snap. Tapping one opens the matchup panel without changing the game (snap, selection and clock are compared). The panel closes, and the Type Chart opens from the panel, the monster card and More. No icons during the play and no popups after the snap. The setting hides them. No page errors and no horizontal overflow.
- `tools/franchise-soak.mjs --n=6 --seasons=3 --seed=11`: 18 seasons, 0 invariant violations and 0 dead ends with types on in every game (173 pregame Clashes, 6 overtime Clashes).
- Visual checks (headless screenshots, not a real device): the pre-snap field with three icons, the panel, and the chart (Dragon and Psychic selected).
- Merging `main` (PR #36) into this branch exposed a bug from #36: league leaders' **Both** view (regular season + playoffs) counted every regular-season stat twice, apart from games and starts. Fixed in `combinedTable`; the test now checks every number for every playoff player.
- **Not done: testing on real phones.** See §3, item 4b.

The previous status (build v36.0, PR #36) follows.

## 0. Current status (2026-10-22, branch `polish-clash-stats`: Beast Clash one-selection flow, statistics filters, presentation polish)

- `npm test`: **306 tests, all passing (about 7 minutes on the cloud workspace)**.
- `tools/franchise-soak.mjs`: 8 franchises × 4 seasons on every difficulty (30 seasons played) with 0 invariant violations and 0 dead ends; Tuesday encounters the staff entered: 15 of 16 won; 308 pregame Clashes and 8 overtime Clashes under the fixed-order rule.
- `tools/ui-walkthrough.py` (headless Chromium): new franchise → Season 2 at 390×844 (Standard), 360×640 (Expert) and 320×568 (Guided) with no page errors, no horizontal overflow, no dead ends and **no swap-decision sheet during any battle**; 16 Tuesday encounters each, alternating Watch (fastest) and Skip to results.
- Visual checks (headless Chromium screenshots at 390×844, not a real device): the Clash selection, battle, and result screens; the monster statistics filters; league leaders (current, past season, playoffs, both); the match screen's callouts (touchdown, first down, big play, loss, routine, score) and the final-whistle sheet.
- **Not done: testing on real phones.** See §3.

## 1. Automated suites (`npm test`)

| Area | Files | What it proves |
|---|---|---|
| Football engine and rules | `engine.test.js`, `rules.test.js`, `playbook.test.js`, `playbook-reserve.test.js`, `abilities.test.js`, `species.test.js` | Plays end in legal dead balls, boundaries hold, downs/scoring/clock/overtime rules (including the single overtime period used in Franchise Mode), playbook personnel and routes, species abilities |
| Stats and attributes | `stats.test.js`, `stat-guide.test.js` | Box scores and season stats; what each attribute does per position; points only spent where they help |
| Franchise | `franchise.test.js` | Schedule golden vectors, the weekly loop, recruiting, training, media, injuries and XP, cap and contracts, the draft and trades, postseason and Legend Tracks, board goals, seasons 1→3, legacy import |
| Franchise acceptance | `franchise-acceptance.test.js` | Regressions from the soak (duplicate names on signing, repair of older saves), a two-season soak with every invariant, mid-battle save/load, encounter fatigue, Skip Encounter costs nothing |
| Beast Clash flow (one selection, one battle) | `franchise-clash.test.js` | Fixed-order policies on both sides; the chosen order is the order of entry; the next monster steps up on a knockout; no decision event or pending decision ever; HP persists; a knockout win means the other side has nobody left; 3v3 and 5v5 (playoff overtime); Watch = Skip; legacy play/auto records and settings; the pregame Clash continues into football with the chosen possession and is never fought twice |
| Beast Clash in Franchise Mode | `franchise-clash.test.js` | 3v3 encounters, offer/pitch rules, Play/Auto/Skip identity, swap decisions, staff auto-run, XP display, pregame possession, overtime 3v3/5v5, no ties left in the standings |
| Save compatibility | `franchise-save-compat.test.js`, `save.test.js` | Saves from before the Clash load, continue through Tuesday/Sunday and into the next season; schema and key unchanged |
| Tuesday companions | `tuesday-companions.test.js` | The prospect leads unchanged; two unsignable companions at the club's strength; deterministic and independent of the lineup chosen; grow with the club; never join the roster; stored battles and older saves rebuild; Play/Auto/Skip identity; Skip Encounter costs nothing |
| Board | `board-balance.test.js` | Forecast against the league average; safe goal = rounded forecast; one achievable badge for rebuilding clubs; one miss is never a dismissal; narrow miss on the hot seat = final warning; clear miss = out; three straight misses = out even with winning records; older saves rebuild the miss streak |
| Type effectiveness | `type-matchups.test.js` | One chart for the Clash and football (the Clash's 144 pairs unchanged); football strengths ±4% and Dragon +2%; neutral or missing types change nothing; every recorded edge is the pair actually in the contest (blocks, sheds, tackles, sacks, separation, contested catches); a catch contested by a defender other than the pre-snap man assignment uses that defender; tackles use the tackler only; inputs never change; edges move outcomes the right way and ratings outweigh them; expected pre-snap matchups from the player's call and the visible alignment only; the AI's lean is capped and rating-first; the field draws icons only for edges |
| Statistics filters | `stats-filters.test.js` | The current season is a selectable book that updates per game; past seasons and the career; playoffs in their own bucket; "both" adds without double counting; league tables archived at season end and selectable; combined tables merge by player; archive pruning keeps records and awards; older saves load |
| Coach Assist | `coach-assist.test.js` | Defaults, mode switching, preferences in the save, old saves, first-use tips that stay dismissed, Expert with no automatic tips on any screen, help on every complex screen (the goal screen included), warnings, Guided-only suggestions (Tuesday, draft, contracts, Board goal), consequence switch, the Tuesday and Board explanations, and the same weeks played in Guided and Expert produce identical saves |
| Beast Clash engine | `tests/clash/*.test.js` | Values 1.1.0 and the historical 1.0.0 ruleset, calculators, conditions, the knockout fix, presentation, the Gate B suites, the boundary rule (only `clash-link.js` imports the engine) |
| Developer review | `dev-review.test.js` | Change notices for plays and abilities |

## 2. Tools

| Tool | Command | Purpose |
|---|---|---|
| Multi-season soak | `node tools/franchise-soak.mjs --n=12 --seasons=5 --seed=1` | Hands-off franchises through full seasons and offseasons; invariants after every game; exits 1 on any violation or dead end |
| Tuesday difficulty study | `node tools/tuesday-study.mjs --n=6 --seasons=5 --reps=1 --rule=both [--gaps=7,9]` | Win rates of weak / average / strong / automatic lineups, the original rule against the companion rule (and tuning gaps) on identical weeks and battle seeds, by season and difficulty (GDD §29.1) |
| Board study | `node tools/board-study.mjs --mode=live\|facts --n=4 --seasons=5` | Hands-off franchises on every difficulty: firing rates, goal met, confidence, dismissed records (live), or season facts for the replay |
| Board replay | `node tools/board-replay.mjs facts-*.json [--goal=safe\|medium\|stretch]` | The original and revised Board rules on identical seasons; forecast calibration (GDD §29.2) |
| Phone walkthrough | `python3 tools/ui-walkthrough.py --assist=guided --width=390 --height=844 --shots=DIR` | The real app in headless Chromium from a new franchise into Season 2, clicking what a player would; checks page errors, overflow, dead ends, ? Help on complex screens, and that Expert shows no tips |
| Clash balance | `npm run clash:balance`, `clash:gateb*`, `clash:manifest` | Beast Clash balance reports (values are locked; read-only) |
| Type balance | `node tools/type-balance.mjs --games=300 --plays=1500` and `--only=dragon --games=400 --dragon=0.02,0.01,0` | Football type effectiveness on identical games: league stats before/after, rating × type, Dragon (GDD §32.6) |
| Type UI check | `python3 tools/type-ui-check.py --width=390 --height=844 --shots=DIR` | Matchup icons, the panel and the Type Chart in the real app (headless Chromium) |
| Play replay | `node tests/tools/replay.js CODE` | Re-run a scrimmage play from its repro code |

## 3. Manual checklist (real devices; still required)

Run on at least one small iPhone (SE size) and one large Android, in the browser and as an installed app.

1. New franchise → choose a Coach Assist level on the welcome screen → HQ in under 2 minutes.
2. Guided: a full first week, including a Tuesday encounter (reorder the lineup, watch it at Fast, confirm no menu interrupts the battle and the next monster steps up on a knockout), a draft pick and a trade call; every tip is readable and dismisses.
3. Expert: the same week with no tip appearing; ? Help still opens on each screen.
3a. Tuesday: the two wild companions are labelled *cannot sign*; only the chosen prospect is offered; the battle feels winnable but not automatic with the automatic lineup.
3b. Board: the goal screen shows the forecast "against this league" and the rules; at season's end the verdict names the wins, the forecast and the reason (try a narrow miss on the hot seat if a season allows).
4. Sunday: the matchup header, the pregame Clash (one selection, then the battle runs to the end), possession choice, a full game in Key Moments and one in Full Coaching: watch for the callouts (touchdown, turnover, sack, first down), the score pulse and the final-whistle hero; force a tie if possible and play the overtime Clash.
4a. Statistics: on a monster card switch This season / past season / Career × Regular / Playoffs / Both; on League leaders pick a past season and Playoffs; confirm every empty combination shows a message, never a blank.
4b. Type matchups: before a snap, find a ▲ or ▼ beside one of your monsters; tap it (the panel opens, nothing snaps), read it, close it with ✕, *Got it* and a tap outside; open the Type Chart from the panel, a monster card and More; tap every type; switch Settings → Type matchup icons off and on. Check the icons never hide a monster or the ball in tight formations (the line, bunch sets) and are easy to hit with a thumb.
5. Reload mid-week, mid-Clash (Play mode, at a decision) and mid-game: the state resumes exactly.
6. Finish a season: playoffs, awards, offseason contracts, the draft, free agency, Season 2 week 1.
7. One-handed reach, text size, battle speed 1×/2×/4×, reduced motion, screen rotation, backgrounding the app during a battle.
8. Import a save exported from an older build.

## 4. Reproducing a bug

Every scrimmage play in the in-game Play Log shows a repro code `offense|defense|ballOn|seed`; `node tests/tools/replay.js CODE` re-runs it (add `--save export.json` for the franchise's starters). Franchise problems reproduce from the soak's seed and difficulty (`node tools/franchise-soak.mjs --n=1 --seed=N`); Clash battles rebuild from the seed and lineup snapshots stored in the save.
