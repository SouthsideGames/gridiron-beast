# Gridiron Beast — Test Plan

All automated tests run with `npm test` (`node --test "tests/**/*.test.js"`), no dependencies. The browser tools need Python Playwright and Chromium (dev only). Every gameplay case is reproducible from its seed.

## 0. Current status (2026-10-22, build v35.0-franchise-foundation: Coach Assist 1.0 + Tuesday companions + revised Board)

- `npm test`: **300 tests, all passing**.
- `tools/franchise-soak.mjs` on the combined build: 12 franchises × 5 seasons (59 seasons played, all three difficulties) with 0 invariant violations, 0 dead ends and 0 save round-trip failures; 1 owner dismissed (Rookie: 8-1, 5-4, 5-4, 4-5, three straight seasons under a contender's forecast); Tuesday encounters the staff entered: 21 of 25 won.
- `tools/ui-walkthrough.py` on the combined build: new franchise → Season 2 at 390×844 (Guided), 360×640 (Expert) and 320×568 (Standard) with no page errors, no horizontal overflow and no dead ends; ? Help on every complex screen; no automatic tip in Expert.
- Balancing measurements (GDD §29): the automatic lineup wins 81–86% of Tuesday encounters in every season (before: 89–100%). On identical seasons, 7 of 36 hands-off owners are dismissed within five seasons (before: 25 of 36), and every one had sustained records below forecast.
- **Not done: testing on real phones.** All browser checks above run in emulated headless Chromium. See §3.

## 1. Automated suites (`npm test`)

| Area | Files | What it proves |
|---|---|---|
| Football engine and rules | `engine.test.js`, `rules.test.js`, `playbook.test.js`, `playbook-reserve.test.js`, `abilities.test.js`, `species.test.js` | Plays end in legal dead balls, boundaries hold, downs/scoring/clock/overtime rules (including the single overtime period used in Franchise Mode), playbook personnel and routes, species abilities |
| Stats and attributes | `stats.test.js`, `stat-guide.test.js` | Box scores and season stats; what each attribute does per position; points only spent where they help |
| Franchise | `franchise.test.js` | Schedule golden vectors, the weekly loop, recruiting, training, media, injuries and XP, cap and contracts, the draft and trades, postseason and Legend Tracks, board goals, seasons 1→3, legacy import |
| Franchise acceptance | `franchise-acceptance.test.js` | Regressions from the soak (duplicate names on signing, repair of older saves), a two-season soak with every invariant, mid-battle save/load, encounter fatigue, Skip Encounter costs nothing |
| Beast Clash in Franchise Mode | `franchise-clash.test.js` | 3v3 encounters, offer/pitch rules, Play/Auto/Skip identity, swap decisions, staff auto-run, XP display, pregame possession, overtime 3v3/5v5, no ties left in the standings |
| Save compatibility | `franchise-save-compat.test.js`, `save.test.js` | Saves from before the Clash load, continue through Tuesday/Sunday and into the next season; schema and key unchanged |
| Tuesday companions | `tuesday-companions.test.js` | The prospect leads unchanged; two unsignable companions at the club's strength; deterministic and independent of the lineup chosen; grow with the club; never join the roster; stored battles and older saves rebuild; Play/Auto/Skip identity; Skip Encounter costs nothing |
| Board | `board-balance.test.js` | Forecast against the league average; safe goal = rounded forecast; one achievable badge for rebuilding clubs; one miss is never a dismissal; narrow miss on the hot seat = final warning; clear miss = out; three straight misses = out even with winning records; older saves rebuild the miss streak |
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
| Play replay | `node tests/tools/replay.js CODE` | Re-run a scrimmage play from its repro code |

## 3. Manual checklist (real devices; still required)

Run on at least one small iPhone (SE size) and one large Android, in the browser and as an installed app.

1. New franchise → choose a Coach Assist level on the welcome screen → HQ in under 2 minutes.
2. Guided: a full first week, including a Tuesday encounter in Play mode (make one swap, close the sheet once and reopen it with *Skip to results*), a draft pick and a trade call; every tip is readable and dismisses.
3. Expert: the same week with no tip appearing; ? Help still opens on each screen.
3a. Tuesday: the two wild companions are labelled *cannot sign*; only the chosen prospect is offered; the battle feels winnable but not automatic with the automatic lineup.
3b. Board: the goal screen shows the forecast "against this league" and the rules; at season's end the verdict names the wins, the forecast and the reason (try a narrow miss on the hot seat if a season allows).
4. Sunday: pregame Clash, possession choice, a full game in Key Moments and one in Full Coaching; force a tie if possible and play the overtime Clash.
5. Reload mid-week, mid-Clash (Play mode, at a decision) and mid-game: the state resumes exactly.
6. Finish a season: playoffs, awards, offseason contracts, the draft, free agency, Season 2 week 1.
7. One-handed reach, text size, battle speed 1×/2×/4×, reduced motion, screen rotation, backgrounding the app during a battle.
8. Import a save exported from an older build.

## 4. Reproducing a bug

Every scrimmage play in the in-game Play Log shows a repro code `offense|defense|ballOn|seed`; `node tests/tools/replay.js CODE` re-runs it (add `--save export.json` for the franchise's starters). Franchise problems reproduce from the soak's seed and difficulty (`node tools/franchise-soak.mjs --n=1 --seed=N`); Clash battles rebuild from the seed and lineup snapshots stored in the save.
