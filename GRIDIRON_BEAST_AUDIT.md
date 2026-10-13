# Gridiron Beast — Project Audit

**Audited:** `main` @ `3681056` (PR #25, Oct 13 2026), HTML prototype v5.0
**Scope:** every source file, all data/doc/test files, 328 commits, 25 merged pull requests (no open issues exist).
**Method:** full read of `index.html` (457 lines, ~140 KB of minified inline JS), `engine.js`, `play-library.js`, all JSON and docs; then a headless probe that ran **3,000 seeded plays** through the shipped engine (every offensive play against a rotating defense) to measure behaviour instead of trusting the status register.

---

## 1. Executive summary

Gridiron Beast has a genuinely rich franchise *design* — owner onboarding, five-role staff hiring, a deterministic 16-team rotating schedule, three-tier promotion/relegation rules, rivals, natures, salary caps — and a large, carefully reviewed tactical vocabulary (100 named plays, several hand-audited by the owner). The project was iterated very fast (two days, 328 commits), and that speed shows: most systems are scaffolding that *displays* correctly but is not wired into gameplay.

The three findings that drive the rebuild:

1. **Format conflict.** The rebuild brief specifies **7-on-7**. The repository was deliberately migrated to **11-on-11** on Oct 11 (GDD §26 "LOCKED"), yet the UI data (`data/ui-gameplay.json`), GDD §4/§5/§7/§25 and the legacy roster array still describe 7-on-7. **Resolution (owner decision, Oct 13): ship 7-on-7.** The reviewed 11-man concepts are re-expressed as 7-man plays; the 11v11 data is preserved in `legacy/` as reference.
2. **The football simulation does not produce football.** In 3,000 seeded plays: **0 touchdowns, 0 sacks**, runs average 2.9 yards, 91 plays ended by a hidden "extended pursuit" timer, and the engine's idea of the goal line is fixed 73 yards from the line of scrimmage regardless of real field position.
3. **Monster attributes are mostly cosmetic.** The 40-monster franchise roster stores only an `ovr` number. Detail-screen stats are derived on the fly (`speed = ovr + 5` …), natures only modify a legacy 14-monster array, defensive ratings never reach the engine, and training, scouting choice, fatigue, abilities and the Friday "plan" dropdown have no gameplay effect.

None of this is a criticism of the vision — it is the normal state of a two-day prototype. But the brief asks for a coherent game, and that requires replacing the engine and the data model rather than polishing them.

---

## 2. Architecture and technologies

| Item | Finding |
|---|---|
| Stack | Static HTML + vanilla JS + inline SVG. No build step, no dependencies. Hosted via GitHub Pages (`.nojekyll`). |
| Files | `index.html` (all UI, styles and ~95% of game logic in one IIFE), `engine.js` (play sim, `window.GridironEngine`), `play-library.js` (play definitions + SVG play art, `window.GridironPlays`). |
| Modules | None. Globals on `window`; one 13,874-character line holds the entire click handler. |
| State | One `localStorage` key `gridiron-beast-p1`; shape grows by ad-hoc `if(!x)x=…` migrations scattered through getters. No schema version on the save root. |
| Tests | `tests/schedule-vectors.json` (golden fixtures) only. **No test runner, no executable tests.** Every "tested" claim in `IMPLEMENTATION_STATUS.md` refers to ad-hoc scripts that are not in the repo. |
| Docs | GDD (93 KB) is an append-only changelog; earlier sections contradict later ones (7v7 vs 11v11, five vs six game-plan plays, landscape vs portrait). |
| Cache busting | Manual `?v=` query strings, repeatedly the cause of "fix didn't show up" PRs (#8, #10, #12, #13, #14). |
| Target platform | GDD says Unity port later, landscape. Brief says mobile-first portrait. **Decision:** keep HTML/JS (zero dependencies, already deployed), make it an installable portrait PWA; keep logic pure and data-driven so a Unity port remains possible. |

---

## 3. Inventory of existing systems

Status key: **W** works as described · **P** partial · **V** visual only (not wired to gameplay) · **B** broken/incorrect · **D** dead code.

### Onboarding and front office
| System | Status | Notes |
|---|---|---|
| Main menu, Multiplayer/Draft "coming soon" | W | |
| Commissioner 8-step intro (name, gender/portrait, hometown, team, rival reveal, two cornerstone monsters) | W | Good flavour; keep. |
| Five-role staff hiring with cap check | W | HC, OC, DC, Scout, Trainer. |
| HC/coordinator scheme alignment score | P | Feeds a small movement-speed bonus via `practiceRatings`; `staffBonus()` is **D**. |
| Coordinator playbooks (15 plays each) | W | Defines the team's play catalog. |
| Owner orientation tutorial | D | Deliberately suspended (`tutorialAction(){}`). |
| Feature Review screen + JSON export/import | W | Developer feedback tool. |
| Playbook Audit (dev) with notes, status, image upload | W | Owner relied on this heavily; keep in Developer menu. |

### Weekly loop
| Day | Status | Notes |
|---|---|---|
| Mon scouting region | P | Scout biome skill determines prospect count; 8 regions offered but only 3 map to prospect names. |
| Tue recruitment | **B** | Successful recruits go to `w.recruited` and **never join the roster** (acknowledged gap). |
| Wed training | **V** | `trainingBonus` is stored, displayed and reset; never read by the simulation. |
| Thu opponent scouting | **V** | Text is hard-coded ("Preferred plays: Cover Two…") and identical for every opponent. Only read by dead `simulateAway`. |
| Fri game plan | **B** | Head Coach Office lists the **legacy 10-name catalogs** (`offensiveCatalog`, containing "Corner Fire", "Man Lock") rather than the coordinator's catalog; picks that are not in the coordinator catalog are silently filtered out at kickoff. The "Game Plan" Balanced/Pass/Run dropdown is never read. |
| Sat prep | W | Text only. |
| Sun game | P | See §5. |

### Franchise, roster, league
| System | Status | Notes |
|---|---|---|
| 40-monster roster, 22 starters, depth chart, eligible substitution | P | Roster entries are `{name, position, ovr, nature, type, fatigue, injury…}` — **no attributes**. Two `showSlot` functions exist; the second silently overrides the first. |
| Monster detail screen | **V** | Stats invented at render time (`speed: ovr+5, strength: ovr+3…`). |
| Natures (25) | **V** | `monsterRecord()` applies natures to the legacy 14-monster `roster` array that the 11v11 game no longer uses. `natureImpact()` is **D**. |
| Elemental types (12) | V | Display only. |
| Signature abilities | V | UI says "proposed; not yet connected". |
| XP / levels | P | +12–18 XP per game for starters, +1 OVR per level. |
| Fatigue | V | Accumulates; affects injury risk only. Not used in simulation or lineup. |
| Injuries | P | Weekly risk roll; injured monsters can stay in `lineup11` because `footballSlot` returns the assigned monster without checking injury. |
| Salary cap (three tiers) + release | W | Over-cap lock works. |
| 16-team schedule generator | **W** | Deterministic, reciprocal, alternating 5/4 home splits, bye rotation. Golden vectors exist. **Best-tested system in the repo — port as-is.** |
| League standings | P | Non-player games resolved by an FNV hash of the fixture key, not by playing football. |
| Tiers, badges, relegation rules | P | Displayed; nothing awards titles or moves teams. Postseason not simulated. |
| Rival GM | W | Random same-division rival persisted per tier. |
| Season archive | W | |

### Match flow
| System | Status | Notes |
|---|---|---|
| Pregame lineups, coin toss (receive/kick/defer, direction) | W | Opponent lineup is generated placeholder text. |
| Kickoff | P | Animated ball; return = `15 + random(0..18)` yards. No touchbacks, no coverage, no kick distance. |
| Scrimmage downs/distance/score | P | See bugs below. |
| Player punt | **B** | `changePossession` always spots the ball at the receiving team's 25 — a punt from your own 5 and a punt from midfield give identical field position. |
| Turnovers | **B** | Interceptions, fumbles, turnovers on downs and missed FGs all reset to the new offense's 25 regardless of spot. No returns. |
| Field goals | P | Probability from distance; kicker rating ignored for FGs (used for PATs only). |
| PAT / 2-pt | P | Owner chooses; opponent always kicks. 2-pt runs Power Run vs Goal Line Stand only. |
| Safeties | **Missing** | No code path. |
| Overtime / ties | Missing | Ties are recorded as neither W nor L in `w.record`. |
| Game clock | P | 3-minute quarters; runoff = `max(7, frames × 0.375s)`; never stops for incompletions or out of bounds; no timeouts. |
| Live 40-second play clock with delay-of-game | W | Real-time, keep as an option. |
| Key Moments mode | P | Random plays from the plan, not situational calls. |
| Play log | W | |

---

## 4. Football simulation engine (`engine.js`)

### Measured behaviour (3,000 seeded plays, 58 offensive × 42 defensive library)

| Outcome | Count | Share |
|---|---|---|
| Tackle | 2,400 | 80.0% |
| Out of bounds | 286 | 9.5% |
| Incomplete | 246 | 8.2% |
| Interception | 62 | 2.1% |
| Fumble | 6 | 0.2% |
| **Touchdown** | **0** | 0% |
| **Sack** | **0** | 0% |

Average gain: runs **2.86** yd, passes **15.4** yd. 91 plays (3%) ended through the "extended pursuit" rule.

### Structural problems

1. **Fixed local coordinate frame.** The engine always simulates on a 600×260 board with the line of scrimmage at x=185 and the "goal" at x=550 (73 yd). It is never told the real ball spot, so:
   - A run from your own 20 that reaches local x=550 is reported as `touchdown` but scores 73 yards and stops at the opponent 7.
   - From the opponent 10 the runner keeps running ~60 yards "through" the end zone until tackled; the renderer clamps him to the goal line, so **the picture and the result disagree** — the exact class of bug PRs #19 and #25 tried to patch visually.
   - Sidelines are y=15/245 (≈46 yd wide) rather than 53⅓ yd.
2. **Plays end on timers.** PR #19 removed the 92-frame whistle, but `carryTicks > 48 && defender within 21` still ends the play ("brings down after extended run"), and the 320-tick cap teleports the nearest defender onto the runner (`nearest.d.x = runner.x`). The QB being `held` at the cap becomes a **sack** with nobody touching him.
3. **Linemen don't block.** Pass/run-blocking OL simply drift `x += 0.4` per tick. Rushers are "blocked" by a push-back if any lineman is within 22 units — so four rushers essentially never reach the QB (0 sacks).
4. **Positions differ between art and simulation.** The engine has its own `OFF`/`DEF` arrays; it uses the play library's positions only when a play defines `positions` (Screen Pass and the five audited defenses). For every other play the simulation starts players somewhere else than the art draws them: QB 126 vs 135, RB 91 vs 105, **CB at x=280 in the sim vs 224 in the art (11 yards apart)**, safeties 363 vs 405.
5. **Only offensive ratings exist.** `simulate(play, defense, seed, ratings)` receives one rating map; when the owner is on defense the match passes `{}` — **your own defenders' ratings are never used**. No defender attribute (tackling, coverage, speed) affects anything.
6. **Assignment fidelity.** Route waypoints are followed by time slices (`time < .9 ? 1 : time < 2 ? 2 : 3`) rather than by arrival, so routes are stretched or truncated by speed. Man coverage aims at the target's current position (always trailing by construction); zone defenders run to an ellipse centre and stand there. `contain`, `spy`, `pitch`, `option_read`, `wham_block`, `pull_block` are drawn in the art but have no specific simulation behaviour.
7. **Ball physics.** Passes fly a fixed 0.6 s regardless of distance; catches require <30 units from the target and no defender within 15 units, then 32% of the remaining incompletions become interceptions.
8. **Determinism** is good: a seeded LCG drives everything, and frames are recorded. Keep this property.

### Play-art vs simulation mismatches (brief item 9)

| Art shows | Simulation does |
|---|---|
| OL blocking arrows with T-bars to specific landmarks | OL drift forward 0.4 units/tick regardless of assignment (except Screen Pass releases). |
| WR/TE blocking on runs (white T-bars) | Followed as waypoints, then stand still; no engagement. |
| Zone ellipses with drop paths | Defender runs to centre and stops; no reaction to receivers in the zone. |
| Man coverage dotted line to an exact receiver | Defender chases the receiver's current position. |
| QB Spy | Moves toward QB. |
| Option / pitch / jet / reverse paths | Treated as a generic RB handoff; QB path ignored. |
| Pre-snap defender positions (art) | Different start positions in sim for 37 of 42 defensive plays. |
| Routes that leave the field | 48 waypoints lie outside the drawable field (e.g. Deep Corner WR1 to y=−16); art clamps them, sim follows the raw point. |
| `data/play-library.json` (canonical Unity export) | **79 of 100 plays differ** from the runtime `play-library.js`; all owner audits (PR #6–#21) were applied only to the JS override blocks. |

---

## 5. Play library (`play-library.js`)

* 100 plays (58 offense / 42 defense), generated by templates, then mutated in **five successive override passes** (concept tweaks → hash-based "distinctness" offsets → audited Cover 3/4 → Audit #5 → Audit #6 → Screen → primary receiver). Later passes silently undo earlier ones; the hash pass deliberately perturbs one endpoint per play by up to 17 units purely so diagrams look different.
* Every play has exactly 11 assignments (no personnel mismatches), but plays share one offensive formation except Screen Pass.
* **Owner-reviewed concepts to preserve** (from PR descriptions):
  * Cover Two → **Cover 2 Man**: two deep-half safeties, everyone else in man, four-man rush (PR #6).
  * Cover Three → nickel personnel, three deep thirds, two flats, two hook zones (PR #9, #13).
  * Cover Four → 3-4 personnel, four deep quarters (PR #9).
  * DB Blitz → both corners rush, LBs/safeties in man (PR #2).
  * Deep Zone → safeties start deep and hold (PR #13). Goal Line Stand → safeties near LOS. Drop Eight → three rushers, eight in coverage. All-Out Pressure → everyone rushes (PR #13).
  * Draw → **designed QB run** with RB blocking (PR #16).
  * Screen Pass → RB is the primary, interior linemen release to lead-block, delayed throw (PR #20, #21).
  * Exactly **one primary receiver** per pass play, QB prefers it when reasonably open (PR #14).
  * Play-art colour system and T-bar/arrowhead conventions (PR #12, #15, #21) — identical to the brief.
  * Vertical play art, offense at the bottom, routes upfield; private six-card 3×2 picker; opponent call hidden (PR #18, #22, #23).
* "100 plays" overstates distinct football: many offensive plays are the same five-route template with one route swapped, and run plays differ mainly by RB lane y-value.

---

## 6. Opponent coaching AI

| Decision | Current logic |
|---|---|
| Opponent offensive play | `Math.random() < .43 ? random(3 runs) : random(3 passes)` from a hard-coded list — ignores down, distance, score, the opponent's own playbook and roster. |
| Opponent defensive play | Uniform random of Cover Two / Man Lock / Corner Fire Blitz / Cover Three. |
| Fourth down | `opponentFourthDownChoice` (PR #24) — reasonable rule table: punt inside own 45, FG from 65+, go on short yardage past midfield, desperation late. Uses the untested non-seeded `Math.random`. **Keep the intent.** |
| Punt result | Opponent punts place your offense at a random 25–45 regardless of where they punted from. |
| PAT/2-pt | Always kick. |
| Clock management, timeouts, kneel | None. |
| Tendencies | None (GDD says the AI should observe the player's tendencies). |

---

## 7. Mobile UI and navigation

* PR #23 added a mobile layer: viewport-fit, 44 px touch targets, 3×2 play cards. It sits **on top of** desktop styles; four successive `.match-play-card` rule blocks override each other with `!important`.
* The match screen stacks 9 controls (mode select, flip checkbox, Snap, Simulate, FG, Punt, Pause, Log, play clock bar) below the field; on a 375×667 phone the Snap button is below the fold once the 3×2 grid renders.
* The live field is **horizontal** (600×280) inside a portrait phone (≈ 375×175 px on screen), so 22 markers with 7–8 px labels are unreadable. Play cards are vertical (rotated −90°) — the card and the field use different orientations.
* Navigation is a single global "Back" button whose target is recomputed per screen; 30+ screens are `<section>`s toggled by `hidden`. No bottom navigation, no in-app hierarchy.
* Heavy emoji use for monsters, staff, teams; inconsistent with "clean pixel-inspired graphics".
* Accessibility: no `aria-live` on score changes, colour-only role coding in play art, `alert()`/`confirm()` used for core flows.

---

## 8. Duplicated, conflicting, temporary or dead code

* **Duplicated:** `showSlot` (×2); two practice renderers (`practiceScene` **D** and `practiceRender`); two field renderers (`homeFieldArt` and `renderField` draw different yard lines); practice vs match each assemble ratings/awareness differently (`effectiveStats?.awareness ?? stats?.awareness ?? ovr` — `effectiveStats` is never set); two roster models (`roster` 14-monster legacy array and `monsters11`).
* **Conflicting:** five vs six game-plan plays (GDD §8 vs code); legacy catalogs vs coordinator catalogs; 7v7 docs vs 11v11 code; JSON play library vs JS runtime; landscape (GDD) vs portrait (brief, PR #23).
* **Dead:** `simulateAway`, `simulateAwayAfterChange`, `practiceScene`, `natureImpact`, `staffBonus`, `tutorialAction`, custom play editor (`saveplay` returns before saving), `savecoach` handler (no matching UI), `#help` section, `data-action="start"`.
* **Temporary:** hash-based play distinctness offsets; emoji "sprite placeholders"; opponent lineups generated from string hashes; league results from FNV hashes; `Math.random()` throughout match flow (non-reproducible games).

---

## 9. Features that exist visually but are not implemented (brief item 10)

Training bonus · opponent scouting report · Friday game-plan style · natures (on the live roster) · monster attributes · signature abilities · fatigue effects · recruited monsters joining the roster · opponent rosters (pregame "estimated" lineups) · league standings from real games · championship badges, promotion and relegation · postseason · custom play creator · flip-play affects nothing defensively · OC/DC "fit" beyond a movement multiplier · stadium identity on the field (removed in PR #19).

---

## 10. Format resolution: 7-on-7

**Decision:** the owner chose 7-on-7 for the rebuild (Oct 13). Rationale recorded for the GDD:

* The brief explicitly targets 7-on-7 and Retro-Bowl-style accessibility.
* On a portrait phone a full-width field is ≈ 375 px; 14 markers can be 22–26 px and labelled, 22 markers cannot.
* 7v7 halves simulation cost, which lets AI-vs-AI league games be **actually simulated** rather than hashed.
* A ~24-monster roster is meaningfully smaller than 40, reducing the "spreadsheet" feel.

**Personnel (from the legacy 7v7 rules, extended):** offense = 3 OL + QB + 3 skill players drawn from RB/WR/TE according to the play's personnel package; defense = 7 drawn from DL/LB/CB/S by package (Base 2-2-3, Nickel 2-1-4, Heavy 3-2-2, Dime 1-2-4). Every reviewed 11-man concept is re-expressed with the same coverage structure (e.g., Cover 2 Man keeps two deep halves + man underneath + rush).

**Preservation:** the full v5.0 prototype is kept, playable, under `legacy/` on the rebuild branch, and untouched on `main`. Existing browser saves under `gridiron-beast-p1` are never modified; the new build imports owner, team, staff, rival, records and history from them on request.

---

## 11. What to keep, rebuild, or retire

| Keep (port with tests) | Rebuild | Retire |
|---|---|---|
| Schedule generator + golden vectors | Simulation engine (yards, real field, blocking, coverage, ball physics, dead-ball rules) | Hash-based play "distinctness" |
| Owner/commissioner onboarding copy | Play library as declarative data, one source of truth | Legacy 14-monster array, legacy catalogs |
| Staff roles, salaries, scheme identities | Monster data model with real attributes | Hashed league results |
| Natures, types, cornerstone starters | Game state machine: downs, clock, special teams, safeties, OT | `Math.random()` in game flow |
| Tier/rival/archive rules | Coaching AI (offense, defense, 4th down, PAT, clock) | Manual `?v=` cache busting (use versioned module URLs) |
| Play-art colour & endpoint conventions | Mobile UI and design system | Desktop-first stacked controls |
| Playbook Audit + Feature Review dev tools | Weekly loop wiring (training, scouting, plan, recruiting) | |
