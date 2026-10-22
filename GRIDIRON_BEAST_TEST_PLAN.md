# Gridiron Beast — Test Plan

All automated tests run with `npm test` (`node --test "tests/**/*.test.js"`), no dependencies. The browser tools need Python Playwright and Chromium (dev only). Every gameplay case is reproducible from its seed.

## 0. Current status (2026-10-22, branch `franchise-acceptance-coach-assist`)

- `npm test`: **284 tests, all passing** (about 6–7 minutes on the cloud workspace).
- `tools/franchise-soak.mjs`: 28 franchises × up to 5 seasons, **0 invariant violations** after the fixes in GDD §28.2.
- `tools/ui-walkthrough.py`: new franchise → Season 2 with **no page errors, no horizontal overflow and no dead ends** at 320×568, 360×640, 390×844 and 412×915, in Guided, Standard and Expert.
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
| Coach Assist | `coach-assist.test.js` | Defaults, mode switching, preferences in the save, old saves, first-use tips that stay dismissed, Expert with no automatic tips on any screen, help on every complex screen, warnings, Guided-only suggestions, consequence switch, and the same weeks played in Guided and Expert produce identical saves |
| Beast Clash engine | `tests/clash/*.test.js` | Values 1.1.0 and the historical 1.0.0 ruleset, calculators, conditions, the knockout fix, presentation, the Gate B suites, the boundary rule (only `clash-link.js` imports the engine) |
| Developer review | `dev-review.test.js` | Change notices for plays and abilities |

## 2. Tools

| Tool | Command | Purpose |
|---|---|---|
| Multi-season soak | `node tools/franchise-soak.mjs --n=12 --seasons=5 --seed=1` | Hands-off franchises through full seasons and offseasons; invariants after every game; exits 1 on any violation or dead end |
| Tuesday difficulty study | `node tools/tuesday-study.mjs --n=24 --seasons=3 --reps=3` | Win rates of weak / average / strong / automatic lineups against real scouted prospects, by season and OVR gap (GDD §26.1) |
| Phone walkthrough | `python3 tools/ui-walkthrough.py --assist=guided --width=390 --height=844 --shots=DIR` | The real app in headless Chromium from a new franchise into Season 2, clicking what a player would; checks page errors, overflow, dead ends, ? Help on complex screens, and that Expert shows no tips |
| Clash balance | `npm run clash:balance`, `clash:gateb*`, `clash:manifest` | Beast Clash balance reports (values are locked; read-only) |
| Play replay | `node tests/tools/replay.js CODE` | Re-run a scrimmage play from its repro code |

## 3. Manual checklist (real devices; still required)

Run on at least one small iPhone (SE size) and one large Android, in the browser and as an installed app.

1. New franchise → choose a Coach Assist level on the welcome screen → HQ in under 2 minutes.
2. Guided: a full first week, including a Tuesday encounter in Play mode (make one swap, close the sheet once and reopen it with *Skip to results*), a draft pick and a trade call; every tip is readable and dismisses.
3. Expert: the same week with no tip appearing; ? Help still opens on each screen.
4. Sunday: pregame Clash, possession choice, a full game in Key Moments and one in Full Coaching; force a tie if possible and play the overtime Clash.
5. Reload mid-week, mid-Clash (Play mode, at a decision) and mid-game: the state resumes exactly.
6. Finish a season: playoffs, awards, offseason contracts, the draft, free agency, Season 2 week 1.
7. One-handed reach, text size, battle speed 1×/2×/4×, reduced motion, screen rotation, backgrounding the app during a battle.
8. Import a save exported from an older build.

## 4. Reproducing a bug

Every scrimmage play in the in-game Play Log shows a repro code `offense|defense|ballOn|seed`; `node tests/tools/replay.js CODE` re-runs it (add `--save export.json` for the franchise's starters). Franchise problems reproduce from the soak's seed and difficulty (`node tools/franchise-soak.mjs --n=1 --seed=N`); Clash battles rebuild from the seed and lineup snapshots stored in the save.
