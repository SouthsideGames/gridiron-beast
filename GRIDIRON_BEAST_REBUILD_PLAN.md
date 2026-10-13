# Gridiron Beast — Rebuild Plan

Branch `rebuild/mobile-7v7`. `main` stays untouched as the working reference; the v5.0 prototype is also copied, runnable, to `legacy/` on this branch. Every milestone ends with `npm test` green and a descriptive commit.

## Target architecture

```
index.html                 app shell (loads src/main.js as an ES module)
manifest.webmanifest       installable PWA, portrait
styles/app.css             design system + screens
src/
  core/      rng.js · field.js (yards, boundaries, spot math) · util.js
  data/      personnel.js · routes.js · playbook.js (single play source) · monsters.js · league.js · staff.js
  sim/       engine.js (one play) · rules.js (game state machine) · special-teams.js · coach-ai.js · game-runner.js (headless full games)
  franchise/ roster.js · progression.js · season.js (schedule, standings, playoffs) · week.js · economy.js · save.js (v6 + legacy import)
  ui/        dom.js · router.js · field-view.js · play-art.js · pixel-monster.js · screens/*.js
tests/       *.test.js run by node --test (zero dependencies) · ui/responsive.py (Playwright, dev-only)
legacy/      v5.0 prototype, unchanged
docs/        historical GDD, migration audit, status register (kept, marked superseded)
```

Rules: no gameplay logic in UI files; Practice, Key Moments, AI-vs-AI league games and Full Coaching all call the same `engine.simulatePlay` and `rules.applyPlay`. All randomness flows from seeded RNGs stored in the game state.

## Milestones

| # | Milestone | Deliverables | Exit criteria |
|---|---|---|---|
| M0 | Docs & scaffolding | Audit, GDD, this plan, test plan; legacy copy; package.json with `node --test` | Docs committed; legacy runs from `/legacy/` |
| M1 | Football data | `field`, `personnel`, `routes`, `playbook` (≈24 offense, ≈16 defense) with validator | Personnel = 7 per side for every play; one primary per pass play; no geometry beyond the end line; colours/endpoint roles derivable for every assignment |
| M2 | Play engine | `engine.js` with blocking, routes, reads, coverage, pursuit, tackles, ball flight, returns | 5,000-seed batch: zero stalled plays, every result is a dead-ball event, boundaries respected, sacks/TDs/INTs all occur at plausible rates, determinism |
| M3 | Game rules, special teams, coaching AI | `rules.js`, `special-teams.js`, `coach-ai.js`, `game-runner.js` | 300 headless full games finish with legal scores; 4th-down, PAT, clock, OT, safety tests pass; AI punts 4th & long in own territory |
| M4 | Franchise systems | Monster model with attributes/natures/types/abilities, roster & depth chart, staff, week loop, league sim + standings + playoffs, XP/injuries/fatigue, economy, save v6 + legacy import | Schedule golden vectors match the v5 generator; a full simulated season + playoffs completes; attributes measurably change results |
| M5 | Mobile UI | Design system, router, all screens, portrait match view, 3×2 cards, practice, playbook audit, settings | Playwright passes at 320×568, 375×667, 390×844, 412×915: no horizontal scroll, Snap visible without scrolling, cards 3×2, touch targets ≥ 44 px |
| M6 | QA & polish | Balancing pass, regression tests, docs sync, PR | Full test suite green; checklist in the test plan signed off |

## Key decisions (with options considered)

| Decision | Options | Choice | Why |
|---|---|---|---|
| Player count | 7v7 · 11v11 · both | **7v7** (owner decision) | Brief, portrait readability, simulation cost |
| Platform | Stay HTML/JS · Unity now · React Native | **HTML/JS PWA** | Already deployed, zero deps, fastest iteration for a solo dev; pure logic keeps a Unity port open |
| Modules | Single file · ES modules · bundler | **Native ES modules** | No build step; works in Safari/Chrome and in Node tests |
| Rendering | Canvas · SVG | **SVG** with persistent nodes | 14 actors is cheap; crisp at any DPR; same code draws cards and field |
| Field orientation | Horizontal · vertical fixed ends · vertical offense-up | **Vertical, offense attacks up** | Matches play cards; readable in portrait |
| Overtime | NFL · college · ties | **College** | Guarantees a result in a short session; still real football |
| League results | Hash · simplified model · real engine | **Real engine, headless** | 7v7 is cheap enough (~50 ms/game) and keeps standings coherent |
| Special teams | Full 7v7 sim · attribute-driven resolution | **Attribute-driven resolution with animation** | Correct rules with far less code; full kick coverage sim LATER |
| Old saves | Convert in place · import copy | **Import a copy** | Never destroys owner data |

## Risks

* **Balance** of a from-scratch engine — mitigated by batch statistics tests with target bands.
* **Scope** — the franchise loop is simplified to one action per day; trades/free agency/draft remain LATER as in the original GDD.
* **Safari quirks** — CSS uses only widely supported features; Playwright WebKit run where available.
