# Gridiron Beast — Game Design Document (Current Design + Historical Build Record)

> **CURRENT DESIGN / AUTHORITY NOTICE (2026-10-21).** Active Franchise Mode is **7-on-7 football**, **16 clubs**, **one league/campaign** (no Challenger/Vanguard/Sovereign promotion or relegation). The nine-game regular season plus bye, gym-badge campaign, Beast Bowl, Legend Tracks, Board, draft, contracts and awards are active. **32 clubs are a long-term expansion goal, not current implementation.** Section **27** is the approved feature roadmap and accessibility policy; Section **26** records the implemented Beast Clash integration (Tuesday encounters, pregame and overtime Clash). Sections **1–23** contain historical build/playtest notes and must not override newer locked design. Section **24** (Career Mode) is **documentation-only**; its old references to 11-on-11 and league tiers are superseded. Section **25** governs Beast Clash. Git history retains previous revisions; maintain this file as the sole authoritative GDD.


**Owner:** Southside Games · **Branch:** `rebuild/mobile-7v7` · **Supersedes:** `docs/GRIDIRON_BEAST_MASTER_GDD.md` v4.9 for all football, UI and roster rules. Franchise rules from v4.9 that are not restated here remain in force.

Decision key — **LOCKED**: approved for this build. **TUNABLE**: implemented, value may change in playtest. **LATER**: designed, not in this build.

---

## 1. Pillars

1. **Coach, not spreadsheet.** Every screen answers "what should I do next?" with one primary action. Depth is available, never required.
2. **Football that makes sense.** Plays end only on real dead-ball events. Blocking, coverage, reads and tackles produce the result; the picture and the box score always agree.
3. **Monsters matter.** Every visible attribute changes something on the field. A Swift receiver separates; a Sturdy back breaks tackles; a Cerebral QB finds the open man.
4. **Five-minute sessions.** A week of franchise management takes under a minute; a game takes 6–10 minutes in Full Coaching or ~2 in Key Moments.

**Platform (LOCKED):** mobile-first portrait web app (installable PWA) for iOS Safari and Android Chrome; desktop works but is not the design target. Zero runtime dependencies. All game logic is pure, deterministic JavaScript so it can later be ported to Unity/C# using the same data and golden tests.

### 1a. Game modes (overview, 2026-10-21)

| Mode | The player is | Status |
|---|---|---|
| **Franchise Mode** | The owner of an organization: staff, roster, scouting, the cap, the Board (§8, §15–§23) | **Current development priority.** Everything else in this document describes it unless marked otherwise |
| **Career Mode** (working name) | One monster they create, playing a career on a team (§24) | **Documented only. Not approved for development.** No code, menus, placeholders or systems are to be built from §24 until the owner authorizes it |
| **Beast Clash** | Monster battles inside Franchise Mode: Tuesday encounters, the pregame Clash and the overtime Clash (§26), on the permanent balance configuration values 1.1.0 (§25.10) | **Integrated into Franchise Mode (owner authorization 2026-10-21, §26).** Every unapproved balance change is an inactive Lab experiment |

The two modes share the football world (clubs, league structure, rules, the match engine, monster data and species art conventions). Their progression and save data are separate: nothing earned in one mode changes the other.

---

## 2. Format — 7-on-7 (LOCKED)

Full American-football rules on a regulation 100-yard field with 10-yard end zones and 53⅓-yard width. Seven players per side.

### 2.1 Offense — 3 linemen + QB + 3 skill players

Depth-chart slots: `QB, RB, WR1, WR2, WR3, TE, LG, C, RG` (9 starters). Each play declares a **personnel package** that selects which three skill slots take the field:

| Package | Skill players | Use |
|---|---|---|
| **Pro** | RB, WR1, WR2 | Balanced run/pass |
| **Spread** | WR1, WR2, WR3 | Pass-first, empty backfield |
| **Tight** | RB, TE, WR1 | Power run, play action, goal line |

Alignment rule: LG, C, RG on the line; at least one skill player on the line on each side of the center is not required (7v7 relaxation); QB under center or in shotgun. All skill players and the QB are eligible receivers; linemen are not.

### 2.2 Defense — 7 from DL / LB / CB / S

Depth-chart slots: `DL1, DL2, DL3, LB1, LB2, CB1, CB2, FS, SS` (9 starters).

| Package | Personnel | Typical calls |
|---|---|---|
| **Base 2-2-3** | DL1 DL2 · LB1 LB2 · CB1 CB2 FS | Cover 1, QB Spy, Zone Blitz, DB Blitz |
| **Nickel 2-1-4** | DL1 DL2 · LB1 · CB1 CB2 FS SS | Cover 2 Man, Cover 3, Cover 4, Tampa 2, Prevent |
| **Heavy 3-2-2** | DL1 DL2 DL3 · LB1 LB2 · CB1 CB2 | Goal Line, Run Wall |
| **Pressure 3-1-3** | DL1 DL2 DL3 · LB1 · CB1 CB2 FS | Cover 0, All-Out Pressure, Edge Contain |

Every defender may blitz. The defense lines up in its package's base alignment pre-snap; a play may rotate defenders to new landmarks after the snap (disguise). When the computer is on defense the player only ever sees the base alignment, so the hidden call is never revealed.

### 2.3 Roster (LOCKED / TUNABLE values)

* Positions: QB, RB, WR, TE, OL, DL, LB, CB, S, K (kicker also punts).
* **Roster limit 26**, minimum 16 to play a game. New franchise roster: 22 monsters (QB2 RB2 WR3 TE1 OL4 DL3 LB2 CB3 S1 K1).
* No monster plays both ways or two slots at once. A monster may fill another position in its **position group** (OL↔—, CB↔S, WR↔TE, LB↔DL) at −10% effective attributes.
* Injured monsters are removed from the lineup automatically; the best healthy eligible reserve is promoted.

---

## 3. Rules of play (LOCKED unless noted)

| Rule | Value |
|---|---|
| Quarters | 4, **4:00** game clock each (TUNABLE: 3/4/5 in Settings) |
| Downs | 4 downs to gain 10; goal-to-go when line to gain is inside the 10 |
| Scoring | TD 6, PAT kick 1 (snapped from the 15, 33-yd kick), two-point try 2 (from the 2, real scrimmage play), FG 3, safety 2 |
| Kickoff | From own 35; touchback to the 25; onside kick available |
| Punt | Distance from Kicking; fair catch or return; touchback to the 20 |
| Field goal | Distance = yards to goal + 17. Miss → defense takes over at the spot of the kick (or its 20 if better) |
| Safety | Ball carrier downed in his own end zone. Free kick (punt) from own 20 |
| Interceptions | Returnable; pick-six possible; downed in end zone = touchback at 20 |
| Fumbles | Only on a tackle by a defender; ball recovered by nearest player; dead at recovery |
| Timeouts | 3 per half per team |
| Clock | Runs during plays. Stops on incomplete, score, change of possession, timeout, end of quarter; on out of bounds only in the last 2:00 of each half. Between plays a running clock loses 25 s (Hurry-up 12 s, Milk 38 s) |
| End of quarter | A play snapped with time on the clock always finishes. A touchdown's try is always attempted |
| Overtime | One overtime period, college format: each team gets one possession from the opponent 25. Still tied after that: an **overtime Beast Clash** decides the game (3v3 in the season, 5v5 in the playoffs; §26.3). The football score stands; no points are invented. (The engine's classic repeat-until-untied rule remains available when `otPeriods` is unset.) |
| Penalties | Delay of game only (real-time play clock, optional). Others LATER |

**Field orientation (LOCKED):** the match field is vertical and the team with the ball always attacks **up** the screen. Yard labels show `OWN 30` / `OPP 30`. This keeps play art, cards and the live field in one orientation.

---

## 4. Play-by-play loop

1. **Pre-snap.** Scoreboard → field → your six play cards (3×2) → Snap. Only *your* selected play's art is drawn on the field, transformed to the live ball spot; routes are compressed so nothing extends past the back of the end zone. The opponent's call is never shown.
2. **Snap.** Play art disappears; the simulation runs in real time (speed adjustable) on the same coordinates.
3. **Dead ball.** A result banner explains what happened ("Voltfang 14-yd catch, tackled by Frostclaw"). Tap to continue (or auto-continue in Key Moments).
4. **Between plays.** Clock runoff, coach's suggestion, 4th-down options (Go / Punt / Field Goal), timeout, tempo.

### Coaching modes
* **Full Coaching:** you call every offensive and defensive play.
* **Key Moments:** the coaching AI calls routine plays *from your six-card plan* and returns control on 3rd/4th down, inside the opponent 20, the final 2:00 of a half, overtime, and after scores/turnovers.

---

## 5. Simulation (LOCKED behaviour, TUNABLE constants)

Coordinates are **yards**: `x` upfield from the line of scrimmage, `y` lateral from the ball (negative = offense's left). The engine knows the real ball spot, so the goal line (`100 − ballOn`), the end line (`110 − ballOn`), the offense's own goal line (`−ballOn`) and the sidelines (`±26.67 − ballY`) are exact. Tick = 0.05 s. Seeded RNG; same seed + inputs ⇒ identical play.

**Player model:** max speed 5.5–9.5 yd/s from Speed; acceleration from Agility; collisions with personal space; blocks are engagements, not proximity checks.

| Actor | Behaviour |
|---|---|
| OL pass pro | Each lineman owns a zone (L/M/R), engages the most dangerous rusher, gives ground based on Blocking + Strength vs the rusher's Strength + Agility; rushers shed probabilistically. |
| OL/TE/WR run block | Engage the defender nearest the designed gap; drive him off the lane; climb to the second level if unoccupied; pullers run to their landmark first. |
| Receivers | Run authored routes waypoint-by-waypoint (sharpness from Agility); once the ball is thrown, the target works back to the ball. |
| After catch/handoff | Every non-carrier teammate becomes an escort blocker and engages the defender most threatening the carrier. |
| QB | Drops back (quick/3/5-step, play-action fake). Reads the **primary first**, then the progression, then checkdown. Read speed and openness judgement from Awareness; throw velocity/range from Arm; error from Accuracy and pressure. Throws away, scrambles or takes the sack when nothing is open. |
| Ball carrier | Follows the designed path to the mesh/gap, then evaluates lanes every 0.25 s; Awareness controls look-ahead and lane quality; Agility controls cuts and jukes; avoids the sideline unless saving clock. |
| Man coverage | Trails the assigned receiver with a reaction delay from Coverage and Awareness; press alignment if called. |
| Zone coverage | Drops to the landmark, then matches the most dangerous receiver in the zone, staying on top for deep zones; breaks on the throw. |
| Rush / blitz | Attacks the assigned gap toward the QB; contains if told to; converts to pursuit on a run. |
| Pursuit | Takes an intercept angle; better Awareness ⇒ better angle; Speed ⇒ closing. |
| Tackle | Contact triggers a tackle attempt: Tackling + Strength + closing speed + gang tackle vs carrier Strength + Agility. Broken tackles stun the defender. |

**Dead-ball events:** tackle, sack, out of bounds, incomplete, touchdown, safety, interception (then return to a dead ball), fumble recovery, kneel, spike. There is no play timer; a 90-second safety guard exists only to fail automated tests.

### 5.1 Attributes (1–99) and what they do

| Attribute | Gameplay effect |
|---|---|
| **Speed** | Top speed; pursuit closing; separation on vertical routes |
| **Agility** | Acceleration, route breaks, cuts/jukes, evading tackles, catch radius |
| **Strength** | Blocking power, shedding blocks, tackling, breaking tackles, falling forward |
| **Awareness** | QB read speed and judgement; RB lane choice; defender reaction delay and pursuit angles; recognising play action |
| **Catching** | Catch probability, contested catches, interceptions, fumble resistance |
| **Arm** | Throw velocity and maximum distance |
| **Accuracy** | Throw error radius; under-pressure penalty |
| **Blocking** | Engagement strength for OL/TE/RB/WR blockers |
| **Tackling** | Tackle success, sack finishing |
| **Coverage** | Man trail distance, zone reaction, pass break-ups |
| **Durability** | Injury risk, fatigue accumulation |
| **Kicking** | FG range and accuracy, punt and kickoff distance |

**Overall (OVR)** is a published per-position weighted average of these attributes.

**Natures** (25, unchanged) multiply one attribute by 1.10 and another by 0.90 using the mapping in `src/data/monsters.js`. **Elemental types** (12) bias generation (e.g., Electric +Speed, Earth +Strength, Psychic +Awareness). **Signature abilities** of the six cornerstone monsters are real in-engine effects (e.g., *Lightning Break*: +12% speed for 1.5 s off the line).

**Fatigue** reduces Speed/Strength/Agility by up to 6% and increases injury risk; recovers during the week. **Injuries** are rolled after each game per participating monster from snaps, fatigue and Durability: minor 1 week, moderate 2–3, severe 4–6.

---

## 6. Playbooks (LOCKED conventions)

Each play defines: name, side, personnel package, formation, alignment per slot, assignment per slot (route / block / carry / handoff / rush / man / zone / spy), route or coverage geometry, primary receiver, QB drop, tags for the coaching AI. One data source drives the cards, the field art, the audit tool and the engine.

**Offensive art:** primary route **yellow** (exactly one per pass play), secondary routes **red**, alternate/special assignments (screens, flats, wheels, ball-carrier paths, QB keepers) **green**, blocks **white**. Routes end in arrowheads; blocks end in perpendicular **T-bars**.

**Defensive art:** deep zones **blue**, middle zones **yellow**, flat/sideline zones **purple**, rush/blitz **red**, man coverage **yellow dotted line** to the receiver.

**Owner-reviewed concepts preserved:** Cover 2 Man (two deep halves, man under), Cover 3 (three deep thirds), Cover 4 (four quarters), DB Blitz (both corners rush, man behind), Deep Zone (safeties start deep and hold), Goal Line Stand, Max Drop (the 7v7 Drop Eight: one rusher, a lineman drops into a middle zone), All-Out Pressure (everyone rushes), QB Draw (designed QB keeper, RB blocks), RB Screen (RB primary, interior line releases, delayed throw).

**Game plan:** equip up to **6 offensive and 6 defensive** plays from the coordinators' catalogs on Friday. Your coordinators' philosophy decides the catalog (15–18 plays each).

---

## 7. Coaching AI (LOCKED inputs)

Every decision uses down, distance, field position, score differential, quarter, time remaining, timeouts, team strengths (pass vs run ratings, kicker range) and the coach's aggression profile.

* **Play calling:** weighted by situation tags (short-yardage, long, red zone, two-minute, backed-up, protect-lead) and by the opponent's observed tendencies. It never sees the player's hidden call.
* **Fourth down:** punt on 4th-and-long in its own territory; field goal within kicker range; go for it on short yardage in plus territory, or when trailing late.
* **After TD:** standard two-point chart late in the game, else kick.
* **Kickoff:** onside kick when trailing late by one score.
* **Clock:** hurry-up when trailing late, milk when leading, timeouts on defense when trailing late, kneel to end a won game.
* The same AI powers your **Coach's Suggestion** and Key Moments.

---

## 8. Franchise (LOCKED unless noted)

**Onboarding** (unchanged): commissioner → owner name/look/hometown → pick one of four rebuilding clubs → random division rival GM → offensive cornerstone → defensive cornerstone → hire Head Coach, OC, DC, Scout, Trainer within the cap.

**Week (one primary action per day; HQ always shows the next one):**

| Day | Action | Effect |
|---|---|---|
| Mon | Scout a region | Generates real prospects; scout skill reveals attributes/nature/potential |
| Tue | Monster encounter (Beast Clash, §26.1) | Battle one scouted monster 3v3 with your roster, or skip. Win: it offers to sign (cap and roster limit enforced). Lose: one recruiting pitch at the usual odds. Skip: nothing happens, nothing is lost |
| Wed | Training focus | Temporary Sunday bonus to the related attributes (Passing, Rushing, Coverage, Pass Rush), scaled by the trainer |
| Thu | Scout opponent | Reveals the opponent's real tendencies and best monster |
| Fri | Game plan | 6 + 6 play cards |
| Sat | Lineup check | Auto-fills injuries; warns about fatigue |
| Sun | Game | All other league games are simulated with the same engine |

**League (CURRENT):** 16 clubs, 2 conferences, 4 divisions, one campaign; 10-week regular season (9 games plus bye), 8-team postseason and Beast Bowl. Gym badges and Legend Tracks drive campaign progression. **No active promotion or relegation; no tiers.** See §15 and §26.

**Progression:** XP for participation and contributions (yards, TDs, tackles, sacks, interceptions). Each level adds attribute points to the position's key attributes. Trainer bonuses are never permanent.

**Economy (CURRENT):** one franchise salary cap and offseason contract/renewal/free-agent system, as specified in §15–§22 and implemented in `src/franchise/`. The former tier-specific cap amounts and old automatic game lock are obsolete; the commissioner's cap-review rules in §15.6 supersede them.

**Saves:** key `gridiron-beast-v6`, `schemaVersion: 6`, export/import JSON. A v5 (11v11) save is never modified; on first launch the player may import owner, club, staff, rival, season, record and history from it. Its 40 placeholder monsters are re-mapped into 7v7 positions, keeping the cornerstones.

### 8.2 What the twelve attributes do, by position (2026-10-21)

Read from what the football engine actually uses (`src/sim`), plus each position's overall-rating weights (which also set the Beast Clash rating). The table lives in `src/data/stat-guide.js` and is shown in the game under **More → What the stats mean** and from every monster card (tap an attribute name). **Attribute points can only be spent on an attribute that helps the monster's position**; the trainer and level-up growth already only raise those. Points spent before this rule are kept.

| Attribute | Helps | Does nothing for |
|---|---|---|
| Speed | Everyone but K: top speed, separation, pursuit, return distance | K |
| Agility | Everyone but K: cuts, jukes, catch radius, escaping the rush, getting around blocks | K |
| Strength | Everyone but K: holding blocks (40%), shedding blocks, breaking tackles, tackling | K |
| Awareness | QB reads and decisions; ball carriers' vision; defenders' reactions, angles and play-action discipline; OL and K overall rating | (helps everyone) |
| Catching | QB, RB, WR, TE (catches and ball security: fewer fumbles); LB, CB, S (interceptions) | OL, DL, K |
| Arm | QB: ball speed, range, release | everyone else |
| Accuracy | QB: where the ball lands | everyone else |
| Blocking | OL, TE, RB (60% of a block); WR (stalk blocks) | QB, defenders, K |
| Tackling | DL, LB, CB, S: sure tackles and sacks | offense, K |
| Coverage | LB, CB, S: reacting to cuts, contesting catches | offense, DL, K |
| Durability | Everyone but K: slower fatigue, fewer injuries | K (kickers are never injured and fatigue does not touch kicking) |
| Kicking | K: field goals, punts, kickoffs | everyone else |


---

## 9. Mobile UX (LOCKED)

* Portrait, 320–430 px wide first; safe-area aware; 44 px minimum touch targets; one-handed reach for primary actions (bottom of screen).
* **Design system:** dark pitch-green/ink palette, one accent (gold) for primary actions and the primary route; 4/8/12/16/24 spacing; 3 type sizes; pixel-style 2 px borders and step shadows; procedurally generated **pixel monsters** (8×8 symmetric sprites tinted by elemental type) instead of emoji.
* **Navigation:** top bar (title + back), bottom tab bar in Franchise (HQ, Roster, Playbook, League, More). Modal sheets for details. No `alert()` for core flows.
* **Match screen priority:** (1) scoreboard strip: score, quarter, clock, down & distance, ball spot, timeouts; (2) vertical field (~45 yards visible, camera follows the ball); (3) 3×2 play cards; (4) Snap; (5) secondary: tempo, timeout, mode, log.
* **Screens:** Main Menu, Franchise HQ, Roster (depth chart by package), Monster Details, Coaching Staff, Game Plan, Training, Scouting & Recruiting, Schedule & Standings, Practice, Playbook Audit (Developer), Settings.
* Accessibility: text never relies on colour alone (route labels in the audit tool, shapes for offense/defense), reduced-motion setting, `aria-live` scoreboard.

---

## 10. Implementation notes (what the build does today)

* **HISTORICAL IMPLEMENTATION NOTE (superseded):** this paragraph formerly described promotion/relegation and regenerated AI rosters. Those are not the active campaign rules. Current franchise behavior is specified in §15–§22 and §26 (Beast Clash integration); the roadmap is §27.
* The player's scouting report reads the opponent's real coach profile, strengths and favourite plays. Training bonuses are real attribute adds on Sunday only.
* Engine tunables (speed curve, blocking engagement, shed rates, throw error, catch/interception formulas, tackle resolution, pursuit effort) are constants at the top of the relevant functions in `src/sim/engine.js`; balance bands are enforced by `tests/engine.test.js`.

## 11. Out of scope for this build (LATER)

**CURRENT SCOPE:** Multiplayer, standalone Battle Room/Draft Clash, Career Mode, custom play editor, expanded penalties, wind/weather, equipment and audio remain outside the approved Franchise completion scope. Drafting, trades (first pass), free agency, contracts and evolution are already implemented in Prototype 2; do not list them as unbuilt. Trading second pass and other planned improvements are tracked in §26.

## 9a. Personnel (revised)

Seven base starters per side are what the owner manages. **Offense:** QB, RB, WR1, WR2, TE, LG, RG. **Defense:** DL1, DL2, LB1, LB2, CB1, CB2, FS. Two package slots per side rotate in for specific groupings and replace a starter for that snap: WR3 (Spread), C (Tight — third lineman), DL3 (Heavy, Pressure), SS (Nickel). Every play still fields exactly seven. Display names are unique within a club (a second monster of the same species gets a numeral).

## 10a. Platforms

* **Primary target (first release):** iOS and Android phones and tablets, portrait-first, installable as a PWA and wrappable for the stores. Tablets get the same layout with wider margins; nothing depends on a hover state.
* **Store release — decision pending (after the prototypes).** Once the prototypes are signed off, the owner decides between two routes to the App Store and Google Play, and nothing in the prototypes should pre-empt it:
  1. **Capacitor wrapper (default recommendation).** The existing web app ships unchanged inside a native iOS/Android shell; one codebase, the prototype *is* the store build, local saves become reliable. Needs icons/splash, an Apple Developer account ($99/yr), a Google Play account ($25), Xcode on a Mac, and a replacement for the claude.ai cloud save (plain local save or an owner-run backend).
  2. **Unity port.** A rewrite in C#: sim, sprite builder, UI and balance all rebuilt by hand. Gains the Unity toolchain and asset pipeline; costs a full re-implementation and the risk that the port drifts from the prototype the owner approved. Sprites can be exported as PNG sheets either way (`tools/export-sprites.mjs`).
  The decision point is a line item at the end of the prototype plan; until then the game stays a zero-dependency web app and every feature is built so either route can carry it.
* **Possible later release: PC** (Windows/macOS/Linux via a desktop wrapper or the browser). The architecture already supports it — zero-dependency ES modules, no touch-only input paths, keyboard-safe forms — but PC is not a design constraint for v6: layouts stay portrait-first and a landscape/wide layout, keyboard shortcuts and mouse hover affordances are LATER work.

## 11. Release 6.1 adjustments (focus pass)

* **Many seasons, one league.** The franchise continues indefinitely: at season end the owner starts the next season with the same club, roster (aged, progressed, re-signed), rival and history; recruiting classes, injuries, XP and awards make each season different. The obsolete promotion/relegation system is not part of this campaign; HQ shows the rival and the playoff race from week 5; the season ends with an awards sheet (MVP, leaders, rivalry record) that is also stored in franchise history.
* **Four headline attributes.** Speed, Power, Hands, Smarts are derived per position from the twelve underlying attributes (`headlineAttributes`), which remain in the engine and are visible under a disclosure. Scouting reveals headline values progressively.
* **Three-step onboarding.** Name and portrait → club (rival revealed inline) → one offensive cornerstone. A balanced default staff is hired automatically and the owner lands in HQ on Monday of week 1 with a short guide to the weekly routine (scout → recruit → train → scout opponent → game plan → lineup → play). The front office opens via Staff → Replace.
* **Defaults.** Key Moments is the default coaching mode; game length defaults to 3-minute quarters (~25 plays; league AI games use the same length so scoring lines up), with 5- and 7-minute presets that quote play counts and real time; the live play clock stays opt-in.
* **Practice lessons.** Every play carries a lesson (when to call it, what to watch, what it beats and loses to) shown on the practice field and in play detail.
* **Rival games are events.** Purple banner, painted midfield crest and end zones, all-time record on the pregame screen; playoff games get the gold variant.

## 12. Release 6.2 (playtest round 2)

* **Saves:** device storage plus a cloud mirror per Claude account (chunked, restored when newer); weekly local backup with Restore.
* **Match day:** box score at halftime, full time and on demand (leaders with monster art, team totals, Players of the Game, monster stats: abilities fired, jukes, broken tackles, sheds); animated kickoffs, punts and field goals; monster sprites on the field (Settings: simple markers).
* **Opponents:** every AI club equips exactly 6+6 plays shaped by its coach and only calls those; scouting shows all six as play art; coaching hints outline counters in the game plan (Settings toggle). **Difficulty** (Rookie / Pro / All-Star) changes AI quality (±4) and coach IQ (play-call sharpness): AI-coached win rates ≈ 78 / 50 / 35 %.
* **The week:** depth chart (owner order; next healthy monster steps in), training with intensity, success odds, injury risk and a repetition penalty, Saturday media day (temperament boosts, trash talk), scheme-fit outlines, release-to-sign on a full roster, "let the staff run the week". Coordinators pre-select a balanced default plan.
* **Season:** league-wide stats drive named awards (MVP, OPOY, DPOY, ROY, Coach of the Year) with an Award Watch on the League tab from week 3; winners join the season awards sheet and history.

## 13. Prototype 1 sign-off pass

* **Boosts are real:** training and media-day boosts are applied to the Sunday lineup (`playerTeam` → effective attributes) and shown on Match Day with a green **T** (training) and gold **+** (media day) badge per starter, plus a "Today's boosts" panel. Covered by a test.
* **AI scouting:** every play call is recorded; opponents prepare from the owner's film (`playerProfile` → `adaptPlaybook`): a rematch opponent remembers that game, others read the last four. They swap in counters to the owner's most-used calls (from the play lessons), lean toward run or pass, and The adaptation is hidden: the player only sees the opponent's (already adapted) six plays in Thursday scouting, never why they changed. Difficulty sets how many swaps (1/2/3). Measured effect, AI-coached player: deep-passing spam 67% → 53% win, balanced 63% → 47%.
* **Coverage fix:** with four eligible receivers, man schemes keyed the back as the "inside" receiver and left the slot uncovered (Slot Fade vs Cover 1 scored a touchdown on 19% of snaps). Man keys now prioritise slot/tight end; Cover 1, Cover 0 and Man Press cover the back; a back who stays in to block frees his defender to rush (green dog).
* **Deep ball:** more throw error beyond 20 air yards, trailing defenders count as contesting at a step and a half, over-the-shoulder catch penalty, bigger required window.

## 14. Defensive playbook to 26

Eight defensive plays added (60 plays in all: 34 offense, 26 defense): Cover 2 Zone, Cover 6, Corner Blitz, Safety Blitz, Bear Front, Double A Mug, Bracket Left, Goal Line Man — each with a lesson and counters, placed in the coordinators' books and the AI pools. Balance pass alongside: linebackers flow to the ball and run calls key the run (Run Wall had been allowing 16 yd/carry on inside zone; now ~2–3, while play-action beats it badly, as intended), underneath zones squeeze a little tighter. Difficulty: Rookie −4 / Pro −1 / All-Star +3 quality, IQ 0.6 / 1 / 1.5 → AI-coached win rates ≈ 68 / 53 / 26 % over 120 games each.

## 15. Prototype 2 — the campaign (LOCKED design, 2026-10-15)

Agreed with the owner after Prototype 1 sign-off and the monsters pass. Franchise mode *is* the campaign: no new mode, no map, no cutscenes longer than a few lines. The campaign is a layer of goals, characters and consequences on top of the season loop that already exists. Everything below is built on the `prototype-2` branch after the `monsters` branch merges.

### 15.1 The species dex (done on `monsters`, carried into P2)

* 72 species, 6 per element: 2 common, 2 uncommon, 1 rare, 1 legendary. Fixed element, natural + secondary position, rarity, signature ability (uncommon and up) or shared trait (commons). Source of truth: `src/data/species.js`; naming rules and audit in `docs/MONSTER_NAMING.md`.
* Recruiting draws from the region's elements by rarity weight. Rares appear only in one home region from week 4. Legendaries are never scouted until unlocked by Legend Tracks (§15.8).
* 16×16 sprites built from each species' design spec (body, size, look, features, pattern, colours).
* **Beast Dex** lives on the main menu, not inside a franchise, and **carries across franchises** (one dex per player, stored under its own key and mirrored to the cloud save). Species are discovered by scouting them or facing them; signed species are marked. The dex is *not* part of Hall of Fame eligibility: it is the player's collection, the Hall of Fame is the GM's career.
* Prototype 2 makes species abilities and traits take effect in the simulation (today only the six cornerstone abilities do), and builds evolution (30 evolved forms, commons only, designed now).

### 15.2 Difficulty is chosen at franchise creation and locked

* Rookie / Pro / All-Star is picked on the onboarding screen and never changes for that franchise. Settings shows it read-only ("set when the franchise was created"). To play another difficulty, start a new franchise. Reason: Hall of Fame thresholds, commissioner rules and postseason events all key off it; switching mid-franchise would be unfair or buggy.
* Settings keeps the safe, cosmetic options: game length, coaching mode, animation speed, field markers, hints, reduced motion.

### 15.3 Gym clubs (fixed, same in every franchise)

Eight of the sixteen clubs are **gym clubs**: a permanent home element, a named head coach with a personality and a scheme, and that element's legendary on the roster (the only copy in the league). The other eight clubs stay ordinary and are the ones a player may choose at creation, so every player meets the same eight gyms. Draft assignment (names are placeholders for the owner to approve on the review page):

| Club | Element | Legendary | Coach (draft) | Scheme | Tier |
|---|---|---|---|---|---|
| Harbor Sentinels | Water | Tsunarok | Nadia Reyes | Zone Control | early |
| Sunfire Lions | Light | Aurelion | Elias Dawn | Air Raid | early |
| Thunder Mesa | Electric | Voltarch | Lena Volkov | Air Raid / Blitz | mid |
| Canyon Crushers | Earth | Titanolith | Dolores Crag | Ground Attack | mid |
| Eastport Phantoms | Dark | Nyxshade | Silas Mourne | Man Coverage | mid |
| Frostpeak Howlers | Ice | Glacivern | Sigrid Hale | Zone Control | mid |
| Ironpeak Rams | Metal | Aegistron | Brock Ferris | Ground / Blitz | late |
| Palmetto Vipers | Dragon | Aurodrax | Marcus Vane | Balanced / Man | late |

Fire (Pyroclast), Nature (Elderoot), Wind (Tempestra) and Psychic (Astralux) are not held by any club: they are the four legendaries the player hunts first through Legend Tracks. Gym legendaries can be tracked too once the player holds that gym's badge.

* **Schedule (implemented, revised 2026-10-15):** the old rotation gave each club only six distinct opponents a season, so the campaign schedule replaces it. The sixteen clubs form two groups of eight (gym / ordinary, two of each per division). Each season an ordinary club plays **four gym clubs** and five clubs from its own group, alternating (ordinary, gym, ordinary, gym …) so **week 1 is never a badge game** and badge games never come back to back. The other four gyms come the season after, so all eight badges take at least two seasons on every difficulty; the starter clubs get the easier half first. Nine games and one bye in ten weeks. Standings, divisions, conferences, the rival and the playoff format are unchanged.
* **Gym assignment (implemented, two per division):** North: Frostpeak Howlers (Ice), Ironpeak Rams (Metal). West: Thunder Mesa (Electric), Canyon Crushers (Earth). East: Harbor Sentinels (Water), Eastport Phantoms (Dark). South: Sunfire Lions (Light), Palmetto Vipers (Dragon). Sundown Drakes is ordinary. Starter clubs: Ember City Beasts, Stonehaven Titans, Glacier Guardians, Stormport Bolts.
* **Strength:** gym clubs have a quality offset by tier (early 0, mid +2, late +4 on top of the difficulty offset) that rises +1.5 per season, plus +1 the first time the player beats them ("they studied tape"). Ordinary clubs rise +0.5 per season. Their legendary levels with the calendar and (once evolution is in) their signature monster evolves around season 3. On any difficulty the first two gym games are winnable with the starting roster; the last two are "come back next year" games for most first-season teams.
* **No replays.** A loss stands, the season moves on, the standings matter. Nothing in the campaign offers a rematch outside the schedule and the bracket.

### 15.4 Badges

* Beating a gym club, in any game that counts (regular season or playoffs), earns its badge the first time. Badges are permanent for the franchise.
* A gym club is **not** guaranteed a playoff place. If you lost to them in the season and they missed the bracket, that badge waits until next season. The schedule guarantee makes a missing badge always the player's own doing.
* HQ shows the badge row: eight slots, dim until earned, with the coach's portrait and the season won. The pregame intro flags "Badge game" with the empty slot before the lineups.

### 15.5 Pregame coach dialogue

Two or three lines on the pregame screen, before the lineups, from the opposing head coach's portrait, with one optional reply from the player (confident / respectful / say nothing). Same presentation as media day; the reply may carry the same small hype/calm boost media day uses, or nothing. Lines are picked by relationship state, never branching: first meeting · they beat you last time · you beat them last time · you hold their badge · you have lost to them three times running · playoffs · they signed a monster that left you (15.7). Gym coaches and the rival GM have full pools; ordinary clubs get a single generic line or none, so the characters stand out.

### 15.6 Budget and the commissioner's office

* Signing a prospect that takes the club over the cap is **allowed**, with a clear warning: "The commissioner reviews the books every Saturday." The player has the week to fix it themselves (release the expensive veteran, keep the cheap young ones).
* If the club is still over the cap at Saturday's lineup check, a short scene plays: the commissioner calls the GM in ("You're over budget. I'm guessing you didn't read the league rules."). He names **three monsters, the three cheapest that would each alone bring the club under the cap**, and the player must release one. Nothing comes back for it. Cornerstones and legendaries are not protected. If no single monster covers the gap, he names the three most expensive and the player keeps choosing until under. Rookie: five names instead of three.
* The same commissioner character delivers Hall of Fame eligibility (15.9), so he is not only the bad guy.

### 15.7 Postseason story events

* **Losing season = losing record** (fewer wins than losses). A 5–5 team that misses the bracket pays through no Legend Track and no title, not through an event. A losing record makes one postseason event **mandatory**; a winning season skips them (the goal: "even if I can't win it all this year, keep the team together").
* Format: one scene, portrait, two or three lines, two or three options; same look as media day. Starting pool:
  * **Star wants out.** Raise their salary 15% (may push toward the commissioner) · promise a starting spot (benched three games next season and they walk mid-season) · let them go, and they sign with the rival or a gym club, whose coach mentions it before your next game.
  * **Coordinator has an offer.** Pay a retention bonus from the budget · let them leave and hire from the pool.
  * **Scheme mutiny.** The coordinator says the roster doesn't fit his scheme: change the scheme to the roster · keep him and reach a fit count by week 4 · fire him now.
* Rookie events always include a free "talk them into staying" option.
* Support: a **Roster fit** line on the staff screen ("Offense: 7 of 11 fit Air Raid · Defense: 4 of 9 fit Man") and a one-line fire-and-replace with a cost from the budget, so "my players are run guys but my OC is a pass guy" is a visible, fixable decision.

### 15.8 Getting stronger each season

* Gym clubs scale per 15.3; the rival GM's signature monster evolves between seasons as you keep meeting them.
* **The title raises the floor:** each Beast Bowl the player wins adds +1 quality to every club for all later seasons, so a champion never cruises through the next year. This is the current single-league difficulty progression; the former tier pyramid is retired.
* **Legend Tracks:** win the Beast Bowl → choose one track toward any legendary no club owns (or a gym legendary whose badge you hold). Three tracks on the same legendary put it in your recruiting pool in its home region — guaranteed to appear the first time you scout that region each season (a three-title reward, not a lottery ticket); you still have to sign it and fit it under the cap.
* Rematch scouting: the Thursday report on a club you have faced before shows one extra play.

### 15.9 Hall of Fame and retirement

Eligibility is a checklist visible on HQ from day one. Thresholds scale with the locked difficulty:

| Requirement | Rookie | Pro | All-Star |
|---|---|---|---|
| Gym badges | 8 | 8 | 8 |
| Beast Bowl titles | 1 | 2 | 4 |
| Career wins | 30 | 50 | 80 |
| League awards won by the club's monsters | 2 | 3 | 5 |

Badges are the campaign and stay at eight everywhere; the other three rows are the grind. Numbers are a first pass and will be tuned in playtests.

* When the last box ticks, the commissioner calls the GM in: eligible. From then on a **Retire** button sits in HQ.
* Retiring writes a **Hall of Fame card** to the main menu (name, club, difficulty, seasons, record, titles, badges, awards, best monsters) and keeps the retired franchise read-only. The player then starts a new franchise; nothing carries over mechanically except the dex (15.1). The retired GM may appear once in the next franchise's news.
* Difficulty ladder by design: Rookie for a first card, Pro or All-Star for the one that counts.

### 15.10 Build order on `prototype-2`

1. Merge `monsters` (dex, sprites, Beast Dex screen, naming).
2. Species abilities and traits take effect in the simulation.
3. Difficulty chosen at creation and locked; Settings read-only.
4. Dex moves to its own store, carried across franchises.
5. Eight fixed gym clubs: coaches, schemes, legendaries; schedule guarantee; strength tiers and seasonal scaling.
6. Badges and the Hall of Fame tracker on HQ; pregame "Badge game" flag.
7. Pregame coach dialogue.
8. Budget: over-cap signing with warning; commissioner's office.
9. Postseason story events; roster-fit line; fire-and-replace.
10. The title raises the floor; rival signature monster.
11. Legend Tracks.
12. Retirement and the Hall of Fame card.
13. Evolution (last: the biggest art and balance job, and nothing else depends on it).

### 15.11 Open for owner review (not blocking)

* Gym coach names, personalities and lines go onto the review page for approval before they ship.
* Whether the player may choose a gym club at creation (design says no, to keep the campaign identical for everyone).
* Tuning of all numbers in 15.3, 15.6, 15.8 and 15.9 after the first Prototype 2 playtest.

### 15.12 Prototype 2 build notes (2026-10-15, branch `prototype-2`)

All thirteen steps of §15.10 are built. Where the build settled a detail the design left open:

* **Species effects:** every ability and trait is an `effect` object of engine primitives (`src/data/species.js`, `src/sim/engine.js`). The six cornerstone abilities keep their legacy ids.
* **Gym strength:** tier offsets early +1 / mid +4 / late +7 on top of difficulty, +1.5 per season, +1 after the player's first win. Four badges are available per season (schedule), so eight takes two seasons at best.
* **Levelling:** `xpForLevel = 30 + 18 × level` with roughly 2.5× the old per-game XP, so a starter reaches level 10 (first evolution) in about two seasons and level 20 (second) over a long career. AI clubs field evolved commons from season 2 (gyms) / 3 (ordinary).
* **AI stars:** AI clubs no longer borrow the player cornerstones; each gets two stars of its own, gym clubs their legendary, the rival its signature monster (a species that evolves, stronger each season).
* **Difficulty win rates (AI-coached player club, week 1, 120 games):** Rookie 66 % / Pro 49 % / All-Star 26 %.
* **Losing-season event pool:** star wants out (raise / promise a start / let go to the rival), coordinator offer (bonus / let go), scheme mutiny when under half a side's starters fit (change scheme / keep / fire). Raises, bonuses and severance land on next season's cap as dead money; mid-season firings leave the rest of the salary on this season's books.
* **Commissioner:** three names (five on Rookie), the cheapest that each alone clears the cap, else the three most expensive until under. Games are never locked by the cap itself; the review is what blocks Sunday.
* **Stores outside the franchise:** the Beast Dex (`gridiron-beast-dex`) and the Hall of Fame (`gridiron-beast-hof`), both mirrored to the cloud save. Evolved forms are revealed in the dex once seen.

### 15.13 Owner's playtest round 1 (2026-10-15)

* **Badge pacing:** four gym games a season, never week 1, alternating with ordinary games; all eight badges take two seasons on every difficulty (see 15.3).
* **Starter monsters:** three cornerstone offers of different positions and elements per franchise (uncommon or rare, each with its signature ability), two rerolls. One cornerstone, chosen by the player; no hidden second one.
* **Owner creation:** Look step (gender, skin, hair colour and style, extras, shirt) builds a custom portrait; Background step (hometown + Former player / Former scout / Analyst / Businessperson) gives one small perk: +6 % training success, +1 scouting reveal, an extra opponent play on Thursday from week 1, or +4 % cap.
* **Tutorial** *(historical: superseded by Coach Assist, §27.3, 2026-10-22)***:** a tip panel on each screen the first time it is reached in a new franchise (HQ, Monday to Sunday, pregame, the first game as an overlay, after the game, roster, plays, league), written for someone new to American football, with a "How football works" primer (field, downs, scoring, fourth down, positions, turnovers, what the player controls). Tips are dismissed one by one, can be turned off from any tip, and Settings can bring them back or open the primer.

### 15.14 Owner's playtest round 2 (2026-10-16)

* **Auto mode** in the match: the coach's suggested play every snap, including fourth-down, try and kneel decisions; toggling it off returns control on the next play.
* **Fatigue cycle (bug fix + design):** Sunday's fatigue is visible all week; Wednesday practice adds 4 / 8 / 14 % by intensity (Iron Lungs scales it) on top of its 1 / 4 / 9 % injury roll; Saturday's lineup check recovers 28 %, a bye recovers 50 %. Fatigue and injury are separate rolls, in games and in practice.
* **Play cards** show uses and average yards (gained on offense, allowed on defense) this season; the detail sheet adds career totals. Play levels are LATER.
* **Ability visuals:** a ring and the ability's name flash over the monster when it fires; the result banner lists what fired (traits dimmer).
* **Bye week:** Monday to Wednesday as normal, then straight to the bye; no opponent scouting, game plan or media day.
* **Badge celebration** after the final box score: badge N of 8, the beaten coach's line, legendary now trackable.
* **Award races** open a top-5 sheet with games, stat line, score and the rule; every race requires at least 60 % of the league's weeks played.
* **Save loss fix:** the cloud save was debounced by per-play saves and could lag far behind; it now writes within 4 s regardless and immediately after a game or day change. On phones the cloud copy is primary (the in-app local copy can be evicted).
* **Next:** the owner opens the `prototype-2` pull request when this round feels right; then the platform decision in §10a.

## 16. Statistics and season awards (LOCKED design, 2026-10-16; branch `prototype-2`)

Owner's playtest round 3 found career stats at zero for a 320-yard quarterback: the old sheet summed rushing and receiving only. This section replaces it.

### 16.1 Accounting (one path for played and simulated games)
* The sim writes per-slot lines into `state.stats[side].players` (`src/sim/rules.js → recordPlayerStats`), the same code whether the owner plays the game, Auto plays it, or the league week is simulated. Stats belong to the action, not the slot: a scrambling quarterback gets a carry, a back who throws gets a pass attempt.
* The engine attributes responsibility (`src/sim/engine.js`): the rusher who brought pressure and the blocker he beat in the last 1.2 s (a rusher nobody touched is *unblocked*, charged to no one); the sack the same way (1.5 s); coverage to the **man defender assigned** to the target, or in zone only to a defender within 2.5 yards of the catch point, otherwise *open* and charged to nobody; a second defender within 1.3 yards at the tackle is the assist; drops vs pass break-ups; who fumbled and who recovered.
* Sacks are not pass attempts; sack yardage is a separate key. One passing TD credits passer and receiver, one team touchdown. Kneels and spikes never reach the engine. Two-point conversions are their own keys. Rates are never stored: `derive()` computes them from totals (season % = sum of games), and a rate with no denominator is null, shown as —, never 0.
* `src/franchise/stats.js → recordGame` books each game once (`season.recorded` keys), into the regular table `season.leagueStats` **or** the playoff table `season.playoffStats`, and for the owner's monsters into `m.stats = { season: {reg, post}, career: {reg, post}, log[], seasons[] }`. Playoff production never touches a regular-season total. Rollover archives the season under its year and clears the log. Legacy saves migrate in place (`ensureStats`).

### 16.2 What is recorded
* All: games, starts, offensive/defensive snaps, TD by type, fumbles / fumbles lost, 2-pt.
* QB: att, comp, yards, TD, INT, sacked, sack yards, passing first downs, long, times pressured, rushing line; derived: comp %, Y/A, Y/G, NFL passer rating (labelled as such).
* RB / WR / TE: carries, yards, TD, first downs, long; targets, receptions, yards, TD, first downs, long, YAC, drops; derived: Y/C, Y/R, catch %, scrimmage, touches.
* OL (and TEs/backs who block): pass-block and run-block snaps, blocks lost, sacks and pressures allowed (only when beaten); derived: block win %.
* DL / LB / CB / S: solo, assists, TFL, sacks, pressures, FF, FR, PD, INT, defensive TD, coverage targets / receptions / yards / TD allowed; derived: yards per target, comp % allowed.
* K: FGA/FGM by distance band (<30, 30s, 40s, 50+), long, XPA/XPM, points.
* **Not recorded, and never shown as zero:** penalties (the engine has none), punter and return stats (no punter position, no returns), QB hits, missed tackles, routes run, EPA / CPOE / RYOE (no defensible model). AI monsters are regenerated each season with new ids, so their careers are per season; the owner's monsters carry full careers.

### 16.3 Screens
* Monster card → **Statistics**: Season · Playoffs · Career (per year) · Game log, position-appropriate columns, a group switch when a monster has stats in several roles, "N seasons pro".
* League → **Stats**: leaders by category with regular-season / playoff filter and minimums for rates; **Award history**: winners by season with their explanation.
* Award watch: every race opens its finalists with record, games, stat line, a one-line explanation from the recorded numbers, and the rule; points are labelled game-generated evaluation points.

### 16.4 Awards (`src/franchise/awards.js`, Gridiron Beast's own models)
* Regular season only: frozen the moment the playoffs are drawn (`finalizeAwards`), so playoff games cannot move them.
* Gate: ≥ 60 % of the league's weeks played and ≥ 50 % of the position's maximum snaps (kickers exempt). Rookie = `yearsPro === 0`, an explicit field set at generation and incremented each offseason — never age, rarity, stage or signing date.
* Components are z-scores within the position group across the league, so nothing is tied to NFL thresholds or season length. Offense: production 45 % · efficiency 30 % · impact 25 % (+0.2 versatility). Defense weights by position — DL rush .4 / run .3 / takeaways .2 / coverage .1; LB .3/.3/.2/.2; CB coverage .45 / takeaways .3 / tackles .15 / rush .1; S .4/.3/.2/.1.
* MVP = individual × responsibility (QB 1.25, RB/WR 1.0, TE .95, OL .8, defenders .85) × .75 + team (win % − .5) × 4 × .2 + availability × .3. OPOY/DPOY as above, no team factor; the MVP is not excluded. OROY/DROY: rookies on the same scale against the whole league. COY = wins over the **preseason** forecast (talent → expected win %, recorded in week 1) × 2 + improvement on last season + margin × .08 + wins × .15; recipient is the club's head coach (gym coach, the owner's hired coach, or a stable generated name).
* Ties: score → production component → games → name. Deterministic; no simulated voters.
* Verified by `tests/stats.test.js`: books add up play by play and determinism holds; reg/post separation; duplicate booking rejected; rollover and careers; legacy migration; scenarios — elite QB on a winner, dominant back over average QBs, edge rusher, shutdown corner with two picks, 21-year-old veteran vs 27-year-old rookie, two-game cameo, rookie MVP, turnaround coach vs talented coaster, alphabetical dead heat; a full season freezes the awards and the history keeps the leaders.

## 17. Playtest round 3 — build 2 (2026-10-17, branch `prototype-2`)

* **Badge win, made a big deal.** Found and fixed the real bug: the "BADGE EARNED" sheet existed but was never called after the box score. Now: box score titled *Final · 🏅 BADGE GAME WON* → a midfield handshake with the beaten coach (two `beaten` lines per gym in `dialogue.js`) → the badge sheet (badge N of 8, legendary now trackable) → HQ, which carries a glowing badge banner for the rest of that week and the next, plus the league news item. `f.campaign.lastBadge` remembers it.
* **Auto speed.** With Auto on, a 1× / 2× toggle: 2× halves the animation frame time and the pause between plays.
* **Comeback mode** (`COMEBACK = { margin: 10, edge: 5 }`): on Pro and All-Star, whichever side trails by 10+ in the fourth quarter (never overtime) plays with +5 on every core rating — symmetric, the player included; off on Rookie. Applies identically to played, Auto and simulated games (`rules.comebackSide / edgesFor`, `engine options.edge`), and shows as a pulsing 🔥 COMEBACK chip under the scoreboard. Difficulty text says so.
* **Scheme lock** (`SCHEME_LOCK_EDGE = 3`): when every starter on a side fits the coordinator's scheme, that side plays with +3 on every core rating; the roster screen shows a glowing *SCHEME LOCKED* banner with the boost, or how many more starters it needs when two or fewer are short; the match shows a ✦ chip (yours and theirs). Carried on `team.schemeLock`, so AI clubs could use it later.
* **Build label** (`src/version.js`): shown on the main menu and in Settings, so a playtest report can say which build it saw (a stale cached build is the first suspect when a feature "isn't there").

### 17.1 Playtest round 3 — second pass (2026-10-17, build 4)

The owner's full-season report. All LOCKED unless marked.

* **17.2 Package rule and forfeits.** A depth-chart slot may be filled only by a monster whose primary or secondary position matches it (`SECONDARY_ELIGIBILITY`): a healthy reserve first, else a base starter who sits out in the packages that use the slot (SS ← LB2, DL3 ← LB2/FS, WR3 ← TE, C ← WR2). Base starters are filled across every group before package slots. A package slot nobody legal can fill makes every play using that package unavailable (greyed in the game plan and the match, never called by Auto or the AI). A game is a **forfeit** (0–21 loss, no stats, no XP, in the standings) only when the base seven or the kicker cannot be fielded legally, or every play in a side's plan needs a package that cannot be fielded. Out-of-position monsters carry **1.75×** injury risk in games and practice, stated on the assign screen.
* **17.3 Attribute points.** Level-ups keep the automatic +1s and bank **2 points** (`POINTS_PER_LEVEL`) the owner spends on the monster card, capped by potential, **only on an attribute that helps the monster's position** (§8.2; revised 2026-10-21, it was any attribute). A setting lets the trainer spend them. AI monsters regenerate each season (no points to spend).
* **17.4 The board.** *(Forecast, goals and dismissal rules revised 2026-10-22: see §29.2, which governs where it differs from this paragraph.)* Before each season (and at creation) the commissioner offers three goals scaled to the preseason forecast — safe (win N, never more than 7 of 9 so a contender's safe goal stays easier than the title), medium (playoffs, or badges when the forecast is poor), stretch (the Beast Bowl, worth +2). Winning the Beast Bowl meets whatever goal was set: the champion is never fired. One commitment per season, settled at season end into **board confidence**: +1 per goal met (+2 title), −1 per miss; a met goal also lifts any deficit to 0 and funds one extra prospect every Monday next season. At −1 the owner is on the **hot seat** (rival GM needles, the postseason story event fires even on a winning record); at −2 the board **fires** the owner: the franchise ends (a Hall of Fame card only if already eligible). Nothing else in the game can end a franchise. Currency chosen so goals do not pile onto the cap (already four features) or the dex.
* **17.5 Season flow.** When the playoffs are drawn: a **season recap** (record, standing, club leaders, badges, the goal, the league awards, and the playoff announcement with seed and first opponent, or "missed"). Awards news lands at that moment. An eliminated or non-qualified owner **watches the bracket** round by round (results sheet per round) or skips to the offseason. When the season ends: **how we finished** (elimination round or title, playoff record, board verdict, Hall of Fame progress, the awards book). The HQ button reads *Continue to the offseason*.
* **17.6 Scouting for depth.** Monday shows every position as short / no backup / ok, lets the owner ask the scout for a position, and the scout otherwise targets the thinnest; prospects are outlined red (short-handed) or orange (no backup) with the reason.
* **17.7 Rival presence.** An HQ rival card every week: standings gap, head-to-head (all-time and this season), next meeting, and a weekly line from the rival GM keyed to who is ahead and to rivalry week.
* **17.8 Records book.** League → Records: single-game player records, single-season records (written at season end), team game records (points, margin, yards) and the owner's monsters' career leaders. League-wide careers wait for persistent AI rosters (LATER).
* **Also:** Sim to final; Auto controls stay on screen during plays; field goal on any down; more coach looks (12 styles, 11 extras, 13 shirts), red shirt fixed, hometown removed from creation.

## 18. Playtest round 4 (2026-10-17, build 5) — LOCKED unless marked

* **18.1 Contracts and the offseason.** New signings are two-year deals from the season signed; at renewal the owner chooses **one season or two** (two is the maximum — a one-year deal for the veteran who will be too old in two); salary is fixed for the deal (level-ups and attribute points change the next ask, not today's cost). A fresh franchise has about **35% of its founding roster on one-year deals** (never a cornerstone, spread across positions), so the first offseason already brings renewals, walks and the market; the rest are signed through season 2 (changed 2026-10-18 so a new owner meets the contract loop early). All renewals happen in the offseason: the book lists every expiring monster with an **ask** = market rate for today's ratings (`salaryFor`) +10% after a big season (1,500 passing / 900 scrimmage / 50 tackles / 8 sacks / 4 INT / 12 FGM) +15% for a league award. Three choices: sign at the ask, counter at 85% (calm natures and a winning season say yes more often; a refusal walks), or let walk. Coaches: re-sign at +10% or let walk (the role must be re-hired). The next season cannot start until every decision is made, the roster is at the floor and the staff is full. The cap itself is unchanged for now; contracts and the bigger roster are what make it bite — revisit after a three-season playtest.
* **18.2 Roster 26–38.** Maximum 38 (one backup per depth-chart slot: 2 QB, 2 RB, 6 WR, 2 TE, 6 OL, 6 DL, 4 LB, 4 CB, 4 S, 2 K); minimum 26 to play (below it a game is a forfeit). The owner starts with 28; AI clubs carry 38.
* **18.3 The free-agent pool.** Released, commissioner-cut and walked monsters return to their home region's pool with their stats and history (`m.history`), appear fully revealed on that region's Monday board, and are signed by AI clubs at 15% a week. The offseason market shows every pool monster plus a dozen generated veterans; signing over the cap is allowed and reviewed in week 1.
* **18.4 League stats scope.** Leaders filter by whole league / conference / division. Awards always judge the whole league.
* **18.5 Signature Monster of the Year.** A seventh league award: on every play where a monster's *ability* fired (traits excluded — they fire constantly), impact = yards beyond a normal play (±4), +15 TD, +20 takeaway; effectiveness = impact per firing × √(firings per game, capped at 6), compared across the league; needs at least one firing per game. Counts toward the Hall of Fame like every league award.
* **18.6 My office.** Under More: the GM's portrait and background, board confidence and this season's goal with progress, career record, titles, awards, badges, Hall of Fame checklist, and (later) franchise cards.
* **18.7 LATER — structure.** *Selling a franchise:* the owner may sell the club and start another; the sold club becomes a card in My office with its history, facing it is an event, and **board confidence resets to zero at the new club** (a legitimate escape from the hot seat). *League growth:* the target is **32 clubs, 8 divisions, 2 conferences**; schedule, playoff seeding and the gym calendar are written against `league.js` so the expansion is data, not a rewrite.
* **18.8 LATER — the career outlives the franchise (2026-10-18).** Being fired (or selling) ends the *franchise*, not the *career*. The GM card is the persistent object: every club run, its seasons, titles, badges, awards, and the year and reason the owner left. A new franchise starts fresh on confidence and roster; the card carries the history and the Hall of Fame can be judged on the career. All-Star is meant to fire a GM now and then — the ten-season simulation (3 of 9 owners fired at Rookie/Pro/All-Star before the board fix; 1 of 9 after) is the intended feel.
* **18.9 LATER — playoff scarcity with 32 clubs.** Note for the expansion: 8 spots per conference out of 32 is the same 50% ratio as today's 8 of 16, so the berth gets no harder, only the bracket longer. If the berth itself should mean something, lower the ratio: 6 per conference (12 of 32) or 4 division winners + 2 wild cards. Decide at expansion time. *The owner also has a "more monster-like" idea that bears on this — to be heard after build 3, which closes prototype 2.*
* **Also:** the recap reads "points scored · allowed"; scouting focus guarantees one extra *prospect* at the asked position, not a signing; practice injuries are real (4% a week at normal intensity).

## 19. The draft (LOCKED design, 2026-10-18, build 6)

Rookie of the Year needs rookies arriving together, so the league drafts.

* **The class.** In the final regular-season week a class of ~50 first-year monsters appears (ages 19–22, `yearsPro 0`, from every region; a few gems, many projects), with a public **board rank** (consensus with noise). It is written into the Beast Dex as seen.
* **The draft window.** From the final regular-season week through the playoffs there is **no region scouting and no recruiting**. Monday is *Scout the draft class*: the head scout studies 1–3 prospects fully (by skill; +1 with the board's scouting bonus), focus position first, and glances at three more. Tuesday is a **recovery day**: −15% fatigue for everyone and every injury a week closer to healed. Owners who are out of the playoffs still get these days while they watch the bracket.
* **Offseason order.** Postseason → awards → contracts → **draft** → free-agent market → commissioner's goal → season.
* **The draft.** Three rounds, sixteen clubs, **snake order from the worst record** (the champion picks last in round one, first in round two). The owner picks or passes on each of their turns; AI clubs pick best available with positional taste. **Rookie deals: two seasons at 70% of market rate**, fixed — the reason to draft rather than sign veterans. Roster room (38) is required to pick.
* **AI draftees persist** (`f.draftResults[year][club]`): they are swapped into their club's generated roster at their position for three seasons, so "he'll be gone by your pick" is real and AI clubs have rookie-of-the-year candidates. Their ages and years pro advance with the calendar; the class just drafted enters the coming season at `yearsPro 0`.
* **Rookie of the Year** keeps the rule "first professional season"; a rookie signed from a regional pool in week 10 is eligible but will not have the games.
* LATER: trading picks; a combine week; a second scout.
* **19.2 A new GM arrives on draft day.** Creation flow: coach → club → difficulty → cornerstone → **draft day** → commissioner's goal → week 1. A lottery gives the new club pick 1–5 (**15 / 20 / 22 / 22 / 21 %**); the other clubs slot by natural level, snake after that. The outgoing staff's notes scout the top 12 prospects fully and the next 10 partially, so the first pick is a decision, not a dice roll. The market is skipped at creation (the roster is 28). Week 10 of season 1 brings a fresh class.


* **19.3 The commissioner's welcome.** After the cornerstone pick and before headquarters, one screen: the commissioner in six beats, tapped through one at a time — the situation at the club (and the rival GM already asking how long you'll last), the one piece of good news (the lottery pick, "the one gift this office gives a new GM, and it gives it once"), **the Board** (the league's board, not the club's: their forecast, the commitment before week one, two misses and they let you go, "I won't be consulted"), and the close: *you answer to me, I answer to the Board, nobody is above the Board and nobody can save you from it — and nobody, the commissioner included, has ever seen a face or heard a name, only the letters.* The last two beats are styled dark. Shown once (`f.welcomed`). **Canon:** the Board is the league's unseen authority; every "board" in the game (goals, confidence, hot seat, firing) is this Board. The commissioner is its messenger, never its master.

* **19.4 Draft room usability.** The clock panel shows the last pick made and an **All picks** button (every pick so far, newest first, tappable where scouted). A **fully scouted** prospect's row is a button: the scout's report — bio, nature, ability or trait, all twelve attributes, potential, projected rookie deal, and how it compares with the owner's best at the position. Glanced and unscouted prospects stay closed: the report is what scouting buys.

* **19.5 The league calendar.** Seasons are numbered 1, 2, 3… inside a save; everywhere the player reads them they are **league years** from an invented epoch (season 1 = 1201), so stats, contracts, bios and draft picks read "1202 R2". Real years would make the league feel like a real one. One constant (`EPOCH` in `src/data/calendar.js`).
* **19.6 Trading draft picks (LOCKED design, 2026-10-18).** Two clubs only, picks only going out. The owner gives any picks they hold — this class or the next three — and asks for one of two things: **a veteran at a position**, or **picks in a future class** (year, round, how many). Every AI club scores the ask from its own situation: whether it is in the market at all (by difficulty: Rookie most clubs, All-Star few), its depth at the position (a starter is for sale only if a replacement within 6 OVR is ready; a short club parts with less), whether a prospect at a need position is likely to reach the pick, and how far away a future pick is (**a pick this year is worth about a round better next year**). The owner sees **up to three offers** and chooses; a club that will not meet a picks ask **counters** with the nearest package it would take. **Protected:** legendaries, rival signature monsters, cornerstones and just-drafted rookies. **Two asks per pick**, deterministic for a given ask (re-asking does not help). Trades are open **on the clock** and on the **offseason screen** before the draft opens. A veteran arrives on a two-year deal at his salary (over the cap means the commissioner's week-1 review, like any signing) with the trade in his bio; the pick he cost goes to the clock at once and the new holder uses it. Future picks are an ownership table that the draft order honors when that class arrives. **Pass** is gone from the main flow; **Forfeit pick** remains as a last resort at the bottom. Calibration (creation draft, six franchises): a player ask finds a taker **78% / 55% / 25%** on Rookie / Pro / All-Star (targets 74 / 50 / 30); picks-for-picks is answered more often, with counters. No Board mechanics — one line of news. *Second pass, LATER:* AI clubs calling the owner with offers; in-season trading; monsters going out.
* **19.7 Scheme fit on prospects.** A fully scouted prospect whose nature and ratings fit the coordinators' scheme gets the same gold outline and ✦ as a recruit; the report says why. Unscouted and glanced prospects show nothing — fit is part of what scouting buys.

## 20. Playtest round 3, build 3 (2026-10-18, v25) — LOCKED

* **20.1 Media day speaks in natures.** Temperaments are gone everywhere (the four groups, the pregame reply, the Saturday screen). The press bank is **250 questions, ten about each of the 25 natures**, plus six situational questions (rival week, hot seat, playoff game, three straight wins, three straight losses, an injured starter) that jump the queue when live and are never asked otherwise. Every answer is written in the voice of one nature; the monsters who share that nature play Sunday with **+3 to the nature's strength** (awareness for Balanced/Calm/Hardy) and +1 awareness; the same nature twice in one presser caps at +4. Questions are drawn by the natures on the owner's field (a starter weighs three, a reserve one), so the press mostly asks about the monsters the owner actually has; no question repeats within a season. Each answer shows how many of the owner's monsters it reaches (starters and reserves), and an answer that reaches nobody is dimmed but still legal. The pregame reply to the other coach now lifts the **physical** natures (speed, strength, agility, arm, tackling, durability) when confident, the **thinking** natures when respectful. TUNABLE: the +3.
* **20.2 Monster bios.** The monster card carries a Bio panel: birthplace (the origin region, or the element's home region), seasons pro, the draft pick when drafted (round, overall, by which club), and a stint per club — the regional league before the first known club, every past club from `m.history` with why it ended (walked, released, cut by the commissioner, signed from the pool), and the current club from `m.joined`.
* **20.3 Balance from the ten-season simulation.** See §17.4 (safe goal ≤ 7 wins; a title meets any goal) and §15.8 (unlocked legendaries guaranteed). Headless results, three franchises per difficulty with a plain staff-run owner: Rookie first title in S1 of one franchise, none in the other two over ten seasons but 8–9 playoff trips each; Pro one title (S3); All-Star none, one owner fired after S2. Making the playoffs is easy (≈75%); the Beast Bowl is hard (3 titles in 90 seasons). AI clubs grow every season while a monster stops at its potential, so by season 8 a dynasty needs churn through the draft and recruiting. Human coaching with scouting counters is the edge the simulation does not use.
* **20.4 The clock, made visible (2026-10-18).** The clock is charged in chunks: each play's own seconds, then — only if the last play left the clock running — the runoff at the next snap (18 s normal, 8 hurry-up, 30 milking). That was invisible, so timeouts, spike, kneel and tempo looked pointless. Now: a line under the score reads **▶ RUNNING · −18 s at snap** or **⏸ STOPPED · snap costs 0 s** (and "can't be stopped" when the other side is out of timeouts with under 30 s); a **victory-formation rule** — a kneel with the clock running, no defensive timeouts and under 30 s left runs the clock out and ends the half or game at once (the "I knelt and nothing happened" bug); a **ⓘ button** in the match header opens "How a match works" (downs, the clock, timeout/spike/kneel/tempo, calling plays, the modes, the edges); and a tutorial sheet, *The clock*, fires the first time the player is inside two minutes of a half. Spike and timeouts stay: they are real decisions in the runoff model, and spike's honest niche is "no timeouts, seconds left".
* **20.5 The cap, re-based (2026-10-18).** Measured at creation: the five coaches cost 675k — 37.5% of the 1.8M cap — so a founding 28 sat at 91% before the draft and a new owner was over the cap after three rookies and a signing; a full 38 at league-average quality was unreachable. Fix: **staff salaries scaled to 60%** (head coaches 96–117k, coordinators 66–93k); the cap stays 1.8M. Now: founding 28 ≈ 76%, after the creation draft ≈ 80% with ~365k of room (ten average monsters or five good ones). Ten-season check: ~330k free in season 1, a full 38 by season 3, 8–16k to spare from then on — the cap binds on upgrades and renewals, not on filling the roster. TUNABLE: the 60%.
* **20.6 Notices, manual evolution, the scheme section (2026-10-18).** *Notices* are computed from state (nothing to dismiss): a red count on the tab where something wants the owner, a red dot on the roster row, the thing itself on the card. Today: a monster ready to evolve, unspent attribute points (when the trainer is not spending them), contract decisions waiting in the offseason, the commissioner waiting on a cap decision. *Evolution is by hand for the owner's monsters:* reaching the level makes the monster "ready" (notice, chip, an Evolve button on the card with a before→after celebration); AI clubs still evolve automatically. The card shows the next form as a **silhouette** until it happens. Evolution no longer changes salary mid-contract (it was repricing it — a bug against §18.1). *Scheme section* on the card: every scheme on the monster's side, best fit first, with "your scheme" marked and what each wants; a monster that does not fit yours now says what it prefers instead of just "not a fit".
* **20.7 Media day without the crib sheet (2026-10-18).** The answer cards name their nature but no longer say how many of the owner's monsters share it, and the "natures on your field" line is gone: picking the biggest boost was becoming arithmetic, and knowing your own monsters' natures is the point. The done-screen still names who heard themselves, so the lesson lands after the choice. *Also:* Salary & Contracts sorts by salary, position, OVR, contract end or cost per OVR; the Roster tab shows a notice strip (each row tappable, "Trainer: spend all points" when points are banked) and every lineup tile, depth-chart row and list row carries the red dot; a monster card's points panel has "Let the trainer spend them", and the global setting remains.
* **20.8 Best lineup and the bracket (2026-10-18).** *Best lineup:* one button on the Roster tab (both views) orders every position by overall rating, best first, and clears manual slot picks — injured monsters keep their place and are skipped on Sunday as always. *The bracket:* the playoff screen opens on a broadcast-style bracket — Aurora semis and championship on the left, the Beast Bowl in the middle, Titan on the right — team-colored cells with seed and abbreviation (dark text on light colors), scores once played, losers greyed, winners outlined, the owner's club ringed in gold, TBD cells until a round is drawn, and a red CHAMPION bar beneath. The game-by-game list stays below it.

## 21. Playtest: the silent championship (2026-10-19, v28)

A first season from the worst roster to the Beast Bowl "felt silent". Three changes.

* **21.1 Achievements are cutscenes.** 21 one-time achievements, each delivered as a scene, never a banner: the **commissioner** in his office (first win, first badge, four badges, a winning season — "this is happening very fast" — an undefeated season, the playoffs, a league award, 10/30/50 wins, a Legend Track, surviving the hot seat), the **rival GM** on the phone (first win over them, a season sweep, a conference title, your first trade), or a typed **letter from the Board** (all eight badges, a Beast Bowl, a second title, a legendary unlocked, and Hall of Fame eligibility: "IT HAS NEVER WRITTEN THIS LETTER TO THE SAME NAME TWICE"). Scenes queue and play full-screen before headquarters, tapped through beat by beat; My office lists every achievement (earned with its year, unearned as ???). Checked after every game, at the playoff draw, at season's end, on a Legend Track and on a trade.
* **21.2 The HQ header in the playoffs** shows the round ("Playoffs · Conference championships") and the matchup instead of the week and record; afterwards, the result ("Beast Bowl champions", "Eliminated in the conference semifinals"). The rival is labelled as the rival in the regular season (it read like an opponent) and hidden in the playoffs.
* **21.3 The MVP bug.** Replaying the owner's real league: a QB with the league's best passing season (2,273 yds, 23 TD, 3 INT, 136.9 rating) ranked fourth because efficiency averaged every role 50/50 — his 13 scrambles and kneel-downs at 2.3 yds/carry counted as much as 205 throws. Efficiency now weights each role by its volume (throws, carries, targets, blocking snaps). Also: the team-record factor is smaller (a 9-0 club +1.5 instead of +2; still a boost), the versatility bonus is halved (0.1), and quarterback responsibility is 1.35 (was 1.25). The playtest case now ranks the QB first and the 22-TD back second; across twelve simulated seasons MVPs went QB 4, RB 5, WR 1, CB 1, DL 1 — no position owns the award.
* **21.4 Achievements belong to the player.** Kept outside any franchise like the Beast Dex and the Hall of Fame (localStorage, mirrored to the per-viewer cloud document `achievements`). Cutscenes still play inside the franchise that earns them (each franchise earns each achievement once, so a new career replays "first win"); the account remembers the first time ever (club, league year, difficulty), how many franchises have earned it, and the scene exactly as it played. **Main menu → 🏅 Achievements** lists all 21 with what each takes, earned ones with **Replay the scene**, locked ones dimmed with their requirement (the scene itself stays a surprise). My office shows only this franchise's tally and points to the menu. Saves that earned achievements before the account store existed are synced into it when they load.
* **21.5 Depth chart "More details".** A toggle on the depth chart adds a second line to every monster — 📄 the league year its contract runs through (⏳ and amber in its final year) and its nature — plus a summary panel: who is in a final year, grouped by position, and a count of every nature on the roster. Built for scouting: see at a glance which positions are about to open up and which natures the roster already leans on (useful now that media day no longer counts them for you).
* **21.6 The banked-points loophole.** An owner could leave a monster's attribute points unspent through his contract year, re-sign him at the price of his current overall, then spend the points. Two fixes: the **ask is priced as if every banked point were already spent** (one at a time to the attribute the position weighs most, capped at potential), so holding points saves nothing; and **attribute points are frozen while any contract decision is open** (the card shows them banked and locked, the trainer's spend-all is off, the notice is hidden until the book is settled).
* **21.7 The league year turns over at the draft.** As in real football, the new year starts when the old one's business is done: once every contract decision is made, headquarters and the offseason screen read the next year ("1202 · Offseason · draft & free agency"); before that, "1201 · Offseason · contracts". Stats, history and the finished season's summary keep their own year.

## 22. Prototype 2 — complete (2026-10-19, v28.3)

Signed off by the owner after a full playtest: a season from the worst roster to the Beast Bowl, the offseason (renewals, counters, walks, the cap review, releases), the draft with pick trading for players and for future picks, evolution, and achievements live and replayed. Git tag `prototype-2-complete`.

**What prototype 2 is.** A complete franchise loop on a phone: create a GM and club, the commissioner's welcome, a lottery pick in the creation draft; ten-week seasons (scout, recruit, train, scout the opponent, game plan, media day, Sunday) against eight gym clubs and a rival; the match engine with Key Moments / Full Coaching / Auto, a visible clock, comeback mode and scheme lock; full stats, seven league awards, a records book; playoffs on a broadcast bracket; the Board's goals, the hot seat and firing; two-year contracts, a 26–38 roster and a cap that binds on choices; a three-round draft with scouting reports and pick trading; evolution, attribute points, natures that matter on media day; Legend Tracks, the Hall of Fame, the Beast Dex; 21 achievements as cutscenes; notices; cloud saves.

**Deliberately left for later** (designed, not built):
* Selling a franchise / the career outliving the franchise (§18.7–18.8): the GM card as the persistent object, confidence resetting at a new club.
* League growth to 32 clubs, 8 divisions, 2 conferences, and playoff scarcity (§18.7, §18.9).
* Trading, second pass (§19.6): AI clubs calling the owner with offers; in-season trades; monsters going out in a deal.
* The store-release decision, Capacitor vs Unity (§10a).
* Tuning to watch in prototype 3: late-career AI growth vs. monster potential (§20.3), the 60% staff salaries (§20.5), media day without hints (§20.7), the MVP weights (§21.3).

**Next:** the owner's idea to make the game feel more *monster-like* — held since build 3, and expected to bear on playoff scarcity — opens prototype 3.


## 23. Polish 2.0 (2026-10-19, v29, branch `polish-2.0`)

Continual polish on prototype 2 before prototype 3. If the owner prefers the plain version, `prototype-2` is the fallback.

* **23.1 Ability presentation.** Abilities used to draw one yellow ring and a name for every monster alike. Now every signature ability runs an *activation → action → outcome* sequence, read straight from the engine's log and never from a timer: the engine tags each `ability` event with the effect that fired (`key`) and tags outcome events (shed, broken tackle, juke, strip, interception, pass broken up, sack, tackle, contested catch) with `ability: true` only when the acting monster's signature ability has that mechanic. Presentation lives in `src/ui/ability-fx.js` and is data: `ELEMENT_FX` gives each of the twelve elements a look (fire trail, water ripple, leaf burst, electric sparks, ice shards, wind streaks, earth dust, dark smoke, light rays, metal flash, psychic pulse, dragon flare: two colours, a glyph, a particle style) and the effect key picks the *family* (movement trail, blocking shield arc, contact burst, passing flare, coverage lock ring, aura ring). Activation is a pulse ring and the glyph plus name (0.35 s); the elemental action follows the monster for 1.2 s with a glow at its feet; the outcome label ("BLOCK SHED", "TACKLE BROKEN", "JUKED", "BALL STRIPPED", "PICKED OFF", "PASS DEFLECTED", "SACKED", "READ & STOPPED", "CONTESTED CATCH") rises over the pair for 0.9 s. Caps for a phone: two live effects and one label per frame, priority to the effect that produced an outcome, then the ball; one ability name at a time and none while a label is up. Particles are deterministic per frame (no flicker); everything clears with the play. Traits (commons) stay silent on the field: they are in the strip under the banner, not the fireworks. Outcomes are untouched: 400 plays with every species on the field compare identical before and after.
* **23.2 Movement and contact.** Sprites face their lateral direction of travel (and their team's way when still); the ball carrier kicks up dust on a hard cut; every tackle and sack gets a short contact ring. A short screen shake on sacks, fumbles and ability-driven breaks and sheds, behind a *Screen shake* setting (on by default). *Reduce motion* now also drops particles and shake (labels stay). Simple markers get a lighter particle load.
* **23.3 Missing hooks found and added.** Auras (Elderoot, Ferrhorn) and *noPlayActionBite* (Echolot) never logged; they do now (presentation only). Still passive by design: Coglet (flat kicking bonus), zone range, blocker stun, fumble resistance.
* **23.4 Developer → Ability Audit.** Every species with its ability or trait, grouped by element, the engine hook it fires on and whether one exists. *Staged* loops a scripted scene for the family through the real renderer; *In play* runs the engine with the monster in its slot until the ability fires (45 of 48 within 80 tries; strips, picks and the no-fumble shell are rare by nature) and plays it back with the effects on.
* **23.5 No more dashes.** Em and en dashes are gone from the game's copy (commas, colons and full stops instead; scores and records read 21-14).
* **Missing assets.** There is no audio in the repo: activation and impact sounds wait on assets (and a mute setting). Effects are drawn SVG, not sprite sheets; a pixel-art particle sheet per element would be the next step up.
* **23.6 Reviewing abilities.** Each signature ability in the Ability Audit has *✓ Looks good* / *✎ Needs work* and a note (opens with Needs work, or via 💬 Note), in the list and under the preview while it loops. A summary bar counts good / need work / to go, and status filters (Unreviewed, Good, Needs work) combine with the element filter. Reviews save instantly on the device and, inside claude.ai, to the shared artifact database (`ability_reviews/<speciesId>` {status, note, updatedAt}; newest wins), where the developer reads them. *Copy notes* gives a plain-text list for builds outside claude.ai.
* **23.7 Review notices.** The notification system now covers the Developer section. Every signature ability and every play has a fingerprint of what the owner judges (ability: name, text, effect, element look, effect family, plus `FX_REVISION` numbers in `ability-fx.js` that the developer bumps when drawing code changes; play: its full definition). An item needs the owner when it is **NEW** (never reviewed), **CHANGED** (edited after he approved it) or **UPDATED** (edited after he asked for work); an item marked Needs work and not yet edited is *waiting on dev* and stays out of his queue. The count shows as a red badge on the main menu's Developer button, the More tab (and a Developer button that appears on the More screen while anything is waiting), each audit button, and the Playbook Audit's offense/defense switch; a toast announces each genuinely new batch once (reviewing never re-announces). Settings → *Developer review notices* turns it off. The Playbook Audit uses the same Looks good / Needs work / note controls as abilities (its old v6 notes carried over), marks every play in the picker (✓ good, ✎ waiting on dev, • new, 🔔 changed) and has *Next to review*. Both audits add a **⚙ gameplay change** flag on the note, so "make it look different" and "make it do something different" stay separate. Play reviews live in `play_reviews/<playId>`.
* **23.8 Card text vs. engine (superseded by 23.9).** A first pass flagged 15 abilities; the full check below found 33.
* **23.9 Card check: abilities must do what they say.** Owner's rule (2026-10-19): if a card says it, the game does it; "a stronger block" is not "drags his defender to the sideline". Every signature ability's card was checked against engine.js. **22 don't do what the card says at all** (Eruption, Pincer Hold, Riptide, Undertow, Bramble Shell's slow, Ancient Grove's 5-yard Awareness, Overcharge, Thunderclap's no-breakup, Whiteout, Vanishing Cut, Night Veil, Refraction, Daybreak, Precision Gears, Blink, Sovereign Arm, Dragon's Roar, Mind Game, Cyclone, Eclipse Route, Landslide, Permafrost) and **11 only roughly** (wrong condition or range, or a percentage nobody measured: Heat Haze, Foresight, Glacier Wall, Deep Roots, Quake Step, Radiant Pursuit, Ambush, Static Field, Wing Shadow, Fortress, Tailwind). They live in `src/data/card-check.js` with what the engine really does; an entry is deleted when the mechanic is built to match, which clears its notice and (through the fingerprint) asks the owner to review the new version. None is impossible in this engine; several need memory across plays (once per drive, half or game), which the engine does not keep yet. In the Ability Audit each shows an amber block and a CARD or ROUGH chip, with a ⚠ Card mismatch filter; the owner can flag any other ability with *⚠ Card doesn't match what I see* (or confirm a listed one). Mismatches show as an amber ⚠ badge beside the red review count (main menu, More, Developer, Ability Audit) and in the one-time toast. Stored as `mismatch: true` on the review.
* **23.10 Signature ability rules (owner, 2026-10-19).** (1) A signature ability belongs to one monster and is never given to another (unlike Pokémon); its evolution line is the same monster. Today: 48 signature abilities on 48 species (12 legendary, 12 rare, 24 uncommon; commons have shared traits), no name shared, the six legacy cornerstone ability ids each ride only on their own species with identical effects. A test enforces it. (2) Legendary-strength effects belong only on legendaries: *extreme but reasonable*, an absolute with a built-in limit, so three legendaries on one roster still lose games. The owner's model: "the quarterback never throws two incompletions in a row" is legendary (an absolute, but drops on fourth down and interceptions still happen); "receivers never drop a pass" is broken; "25% fewer drops" is too generic. (3) Non-legendary signature abilities may exist but are not absolutes; nine uncommon/rare cards currently use legendary-style wording (never / always / every time): Pincer Hold, Deep Roots, Bramble Shell, Vanishing Cut, Precision Gears, Foresight, Echo Read, Mind Game, Dragonhide.
* **23.11 Abilities built to match their cards (v29.4).** 26 signature abilities now do exactly what their cards say, and only that: bonuses a card does not mention were removed, so the card is the whole truth. The engine gained play-to-play memory: the game passes `{drive, half, quarter, used}` (a drive is its team plus the play it began on) and the engine returns what it spent (`memoryUsed`, kept in `state.abilityMemory`). Legendaries: **Eruption** (once per drive, the first defender he blocks or who hits him is flattened), **Undertow** (deep throws into his half: interception chance x1.25), **Ancient Grove** (teammates within 5 yards get +5 Awareness, live), **Thunderclap** (ball 15% faster; a trailing defender cannot break up or pick a quick pass), **Whiteout** (once per half the QB's first read freezes), **Cyclone** (her first break stuns whoever covers her 0.35 s), **Landslide** (runs through his gap fall forward 2 more yards; never shed in pass protection), **Night Veil** (left out of the QB's read of openness), **Daybreak** (new card: once per game, on an open catch, nobody can catch him from behind), **Fortress** (catch chance x0.65 for his man), **Blink** (once per game he appears 5 yards past the first tackler), **Sovereign Arm** (first-read throws cannot be intercepted; +10 Arm/Accuracy in the fourth quarter). Others: Riptide (drags his man a yard toward the sideline), Overcharge (+8 Speed for the rest of the drive after his sack), Refraction (QB judgement error x1.2 near him), Dragon's Roar (the blocker across cannot engage for 0.4 s), Eclipse Route (deep route: his coverage stunned 0.5 s), Permafrost (a run meeting him loses a yard), Heat Haze (0.15 s tighter on deep routes), Glacier Wall (sacks from his side fail 30%), Quake Step (a cut makes defenders within 2 yards tackle 20% worse), Radiant Pursuit (+15% speed from behind only), Ambush (each blocker's one try to pick him up on a blitz fails 30%), Static Field (x0.9 catches in his zone), Wing Shadow (x0.85 contested), Tailwind (20% more range, softer landing). Measured by A/B simulation (same plays with and without): Night Veil 30% → 44% of throws into his coverage; Sovereign Arm 72 → 21 interceptions per 3,000 man-coverage throws; Undertow +27% deep picks; Fortress x0.65 at the catch; Overcharge roughly doubles a charged rusher's sacks. New effects: FLATTENED, BLINK! (with a teleport streak), READ FROZEN, SACK DENIED, PICK DENIED, TOO FAST, SPUN AROUND, LOST HIM, +2 YARDS, LOST A YARD, DRAGGED WIDE, SLIPPED THE BLOCK. Seven abilities remain on the card check, all among the nine non-legendary cards with proposed new wording (`CARD_PROPOSALS`, approved or rejected in the Ability Audit; built after approval). `tests/abilities.test.js` covers the once-per scopes and key mechanics.
* **23.12 The owner's first ability review, answered (v29.5).** Read from the review store: 38 abilities judged, 21 notes, all nine proposed cards approved, no play reviews yet. *His rule:* an effect should explain itself without reading the card, and abilities must not share a look because they share an element. So 36 abilities got a **signature look** (`src/ui/ability-sigs.js`), each its own drawing: Meteor Pass sets the ball on fire with an ember trail; Ember Grip leaves glowing claw slashes; Eruption cracks a crater with lava; Slipstream lays a solid stream on the ground; Riptide shows a current pulling his man wide; Undertow opens a whirlpool and drops an anchor; Pincer Hold clamps crab pincers; Ancient Grove sends roots out to every teammate within 5 yards; Deep Roots digs roots in; Bramble Shell rings him in thorns; Overcharge flashes a big bolt; Thunderclap claps two yellow hands; Cold Read and Foresight open an icy and a purple blinking eye; Whiteout snows on the frozen receiver; Permafrost spreads frost under the runner; Cyclone spins up a funnel; Tailwind trails wind lines behind the ball; Quake Step cracks the ground; Vanishing Cut leaves a smoke cloud; Ambush leaves a shadow streak; Eclipse Route rings him in an eclipse; Night Veil cloaks him; Clear Sight locks a reticle on the open receiver; Refraction splits light into a rainbow; Radiant Pursuit leaves a light trail and a halo; Daybreak raises a sunrise behind him for the rest of the play; Iron Bite snaps steel jaws; Bulwark links his line with steel plates; Fortress raises walls around his receiver; Blink sparkles at both ends of the teleport; Echo Read pings sonar rings; Mind Game swirls at his man; Dragon's Roar sends sound waves (and shakes the screen); Wing Shadow spreads wings over the catch; Dragonhide flashes scales. The 11 abilities he approved keep their look (their review fingerprints are unchanged). **Status marks** for any monster, from the engine's frames: spinning stars when stunned (any stun, ability or not), an ice block when frozen, squashed flat when flattened, spinning when spun, a "?" and a head-turn when lost, a dizzy swirl when confused, a snail when slowed, a bolt while charged, a flinch and "!" when roared at, a "!" when fooled, pincers when pinned. **Layers:** ground effects draw under the monsters, icons and labels over them (his note). **End-of-play hold:** effects that fire as a play ends (a label at the tackle, Fortress at an incompletion) were never seen because the animation stopped on that frame; the last frame now holds up to 0.9 s while anything is running. **Gameplay he asked for:** Whiteout's first-read receiver really freezes in place for 0.8 s; Permafrost's runner freezes for 0.35 s (card: "Runs at his gap are frozen on contact and lose a yard"); Cyclone's spin lasts 0.5 s. **The nine new cards, built:** Pincer Hold (a shed blocker is held a full second), Deep Roots (pass rushers drive him back at half speed), Bramble Shell (fumbles half as often; a tackler who misses him is slowed 1 s), Vanishing Cut (the first defender he jukes freezes 1 s), Precision Gears (+12 Kicking, +6 more on field goals of 40+), Foresight (against a blitz, to his hot read twice as fast), Echo Read (bites on play-action half as long), Mind Game (his man bites on his first fake half the time), Dragonhide (recovers twice as fast when beaten). The card check is empty: every signature ability now does what its card says.
* **23.13 Free agents have hidden information.** Tapping a free agent opens a report like a recruit's: the bio, clubs, ability and the ask are public; headline ratings, overall (report 4+), potential (5+), nature and the full attribute sheet (6) depend on the head scout's skill in the monster's home region (`freeAgentView`). Monsters who played for the club are fully known. The market row shows "?? OVR" until the scout knows.
* **23.14 Second review pass (v29.6).** 36 of the 37 reworked abilities approved. Outcome labels now size their box to the text and hold the text inside it (long labels like "BLOCK SHED" or "SLIPPED THE BLOCK" ran out of the box). Staged scenes in the Ability Audit show the outcome the ability really produces (Dragon's Roar showed "BLOCK SHED"). Vanishing Cut's smoke now draws over the monsters, thick enough to hide the defenders where he cut (owner's note).
* **23.15 Polish batch (v29.7).** *Ability balance:* `tools/ability-balance.mjs` measures every ability over 2,000 paired snaps (same plays and seeds with and without the ability, with drive, half and game memory). Value is yards of field position per snap on the field, a turnover worth 45 yards. Results live in `src/data/ability-balance.js` and on Developer → ⚖️ Ability Balance, ranked by rarity with flags (a legendary weaker than a typical uncommon, a non-legendary stronger than a typical legendary, an ability that hurts its own team, a signature that rarely fires). First run: legendaries lead by median (+0.36 against rare +0.06, uncommon +0.07, traits +0.01), but five of the twelve sit at or below a typical uncommon: Night Veil measures -0.65 (hiding him from the QB's read sends more throws at the corner beside him); Landslide, Whiteout, Daybreak and Ancient Grove sit near zero; Eclipse Route (+0.90), Dragon's Roar (+0.83) and Ember Grip (+0.66) lead. Cards change only with the owner's approval. *▶ See it:* every card with a signature ability (roster card, dex, draft and free-agent reports, onboarding, trade calls) opens a looping staged preview of the ability. *First-time tips:* the first time an ability fires in a real game, a short sheet names it, says what it did and offers ▶ See it again (a toast during Auto; off when tutorial tips are off). *Trait cues:* commons' shared traits show a small icon when they fire near the ball (💨 🧱 💥 🫧 🧲 👀 🧤 🐂), only when no signature effect is on screen. *Vibration:* big hits vibrate the phone briefly (the screen-shake setting covers both). *Free-agent ask:* salary follows overall, so until the scout knows his overall the ask shows as an estimate ("asks about 340k"), a steady ±10%; he signs for the real figure. *Roster:* a compact bar (Lineup/Depth, cap room chip) and shorter tool buttons fit at 320. *Tutorial:* the lineup tip lost a stale sentence, punctuation fixes, and a new offseason tip. *AI clubs call:* in weeks 2 to 8 and once when the offseason opens, a club may call offering a real upgrade (2+ OVR over your best) at one of your three biggest needs, for the pick or two picks worth 85 to 130% of him; never a legendary, signature, cornerstone or rookie. The call waits on HQ until the week ends; Accept, No thanks, or ▶ his ability.
* **23.16 Balance pass, approved by the owner (v29.8).** Measured with `tools/ability-balance.mjs` (2,000 paired snaps; a third argument re-measures only the listed species). **Night Veil** (-0.65 → +0.22): quarterbacks still never see him as covering, and now a ball that arrives with him within a yard of it is never caught (it can still be intercepted; not while he is engaged or stunned); new outcome label NEVER SAW IT. **Whiteout** (0.00 → +0.55): once per drive instead of once per half. **Daybreak** (+0.02 → +0.66): after any catch, nobody can catch him from behind (was once per game, on an open catch); defenders in front can still tackle him. **Ancient Grove** (+0.04 → +0.26): defenders within 5 yards of him never bite on play action or misdirection, and keep +5 Awareness. **Ember Grip** (+0.66 → +0.13, uncommon): +3 Strength when shedding a block; the extra blocker stun is gone. The five changed cards return to the Ability Audit queue for the owner's review.
* **23.17 Second balance pass, approved by the owner (v29.9).** The three non-legendaries that out-measured legendaries were brought to their rarity: **Eclipse Route** (rare, +0.90 → +0.25): his defender loses track of him for a fifth of a second (was half). **Dragon's Roar** (rare, +0.83 → +0.17): the lineman across is slow to engage for 0.15 s (was 0.4). **Crushing Rush** (uncommon, +0.51 → +0.19): now +4 Strength when shedding a block against the run (was +10 on every shed), which also keeps it distinct from Ember Grip (+3 on any shed), so no two signature abilities share an effect. Legendaries now hold the top three places (Daybreak, Whiteout, Sovereign Arm); the strongest non-legendaries left are Cold Read (uncommon, +0.44), Tailwind (rare, +0.39) and Radiant Pursuit (rare, +0.34); all 48 abilities and 60 plays were approved before this pass, and the three changed cards return to the Ability Audit.

## 24. Career Mode (DOCUMENTED ONLY, 2026-10-21; NOT APPROVED FOR DEVELOPMENT)

> **Status.** This section records the owner's Career Mode design request and a proposed design around it. It does **not** authorize implementation: no gameplay code, menus, buttons, placeholders, data files or saves are to be created for Career Mode until the owner approves it explicitly. Franchise Mode remains the development priority, and no Franchise decision in §1–§23 is changed by this section.

**Labels used in this section.** **CONFIRMED**: stated by the owner as a requirement. **PROPOSED**: a design suggestion awaiting the owner's approval. **OPEN**: a question the owner needs to answer. Anything not marked CONFIRMED is a proposal, however detailed.

### 24.1 Confirmed requirements

1. **Two separate modes.** Franchise Mode (the player is the owner) and Career Mode (the player creates one monster, joins a team and lives its career). Career Mode shares the football world, clubs, league tiers, rules and monster systems where appropriate; its progression and save data are separate from Franchise Mode.
2. **Create your own monster** with its own identity, appearance, position, archetype and a customizable signature ability. Ability creation is built from supported effects, triggers and tradeoffs, then personalized in name and presentation; never unrestricted.
3. **Five playable positions only:** quarterback, wide receiver, running back, linebacker, cornerback. Tight end, offensive line, defensive line, kicker and punter are never playable career positions; they remain AI teammates in the normal match.
4. **No joystick or manual movement.** The AI moves the monster according to the play, its assignment, the situation and its attributes. The player controls decisions, action timing and ability activation.
5. **Minimal mobile controls:** tap the field to start an offensive play; one **contextual action button** whose label changes clearly; one **ability button** on the right; at quarterback, tap a receiver directly. No permanent button per action.
6. **Position sequences** as set out in §24.3 (QB: snap, automatic drop and pocket, tap a receiver; WR: Call for Ball, Catch, Evade; RB: automatic run, timed evade/contact; LB: Tackle / Intercept / Swat on one button, Ready before a defensive snap; CB: timed pass defense and tackles on one button).
7. **A press is an attempt, not an outcome.** A well-timed tap never guarantees a completion, catch, tackle or interception; attributes, positioning and the situation decide the result. Specifically for cornerback (owner's prototype feedback): pressing Intercept inside the timing window must not be an easy interception; the result must account for the monster's ratings and the situation, without relying only on overall rating or arbitrary failure rolls.
8. **Life outside games matters.** A weekly loop of meaningful, limited choices (practice, film, team chemistry, development, ability training, recovery, relationships, personal events) with visible consequences; not a checklist of mandatory tasks. Separate from the owner's Franchise week.
9. **Career progression** from creation through recruitment/draft, joining a team, earning playing time, development, honours, and possible transfers **within the current single-league 16-club campaign**. The three-tier promotion/relegation system is retired and is not a Career Mode prerequisite.
10. **Performance grades reward the position's job**, not only headline statistics.
11. **Presentation:** the existing top-down field and play-art conventions (§6); the user team's play art before the snap, hidden during live play; the controlled monster easy to identify; restrained, clear feedback for opportunities, timing, results and ability readiness.

### 24.2 Fit with the current design (read before approving)

Three points where the request meets the current document and an owner decision is needed. They are repeated in §24.10.

* **Field format (CURRENT):** Franchise Mode is **7-on-7**. Career Mode must use the same 7-on-7 field and active positions if approved for implementation. The former 11-on-11 discussion is obsolete.
* **League structure (CURRENT):** one 16-club league; no Challenger/Vanguard/Sovereign pyramid, promotion, relegation, or tier-transfer mechanics. Career Mode is documentation-only and must not reactivate these rules.
* **Signature-ability rules.** §23.9–§23.10 already govern abilities: a card must do exactly what it says; a signature ability belongs to one monster and is never shared; legendary-strength absolutes belong only to legendaries; non-legendary abilities are never absolutes. The creation system in §24.4 is written to obey those rules.

### 24.3 Controls and gameplay by position

**Universal model (CONFIRMED in principle, details PROPOSED).**

* The **coaching AI calls the plays** for the player's team (§7); the player does not pick plays in live games (PROPOSED; see OPEN Q4 on audibles and suggestions). Before each snap the user team's play art is drawn on the field with the controlled monster's own assignment emphasized; at the snap the art disappears, as in §4.
* **Offense:** tap the field to snap. **Defense:** tap **Ready**; the AI offense snaps automatically after a short, readable delay.
* **Contextual button** (bottom right, thumb reach, ≥ 56 px): shows one verb at a time. It is **disabled and grey** when no action is available, **lit with its verb** when an opportunity opens, and shows a **timing ring** that closes toward the ideal moment when the action is timing-based. The verb changes with a short label transition so the player always sees what a tap will do.
* **Ability button** (right edge, above the contextual button): shows readiness (charges or cooldown), lights when its trigger condition is met, and is never required to play a snap.
* **Inputs become engine inputs.** Every tap is recorded as `{tick, action}` and fed to the deterministic engine (§5), so the same seed and the same taps replay identically and outcomes stay testable (PROPOSED technical rule).
* **Timing feedback, in words and shape, never colour alone (§9):** after each timed action a short tag appears under the button: *Early*, *Good*, *Perfect*, *Late*, with the outcome banner explaining the result in football terms ("Perfect timing, but the throw was behind him: broken up").

**Quarterback (CONFIRMED sequence).**

1. Tap the field to snap. 2. The QB drops (quick / 3 / 5-step or play-action, from the play) and handles pocket movement automatically: stepping up, sliding away from the rusher, scrambling only when the play is broken (Awareness, Agility). 3. Receivers run their assigned routes. 4. The player taps a receiver to throw. 5. The throw is resolved from timing, situation and attributes.

* **Throwing away** (PROPOSED): when the QB is pressured, the contextual button becomes **Throw Away**; otherwise it reads **Scramble** only when the pocket collapses. No permanent extra buttons.
* **Touch targets** (CONFIRMED need, PROPOSED solution): each eligible receiver carries an invisible hit circle of at least 48 px; when two circles overlap, the tap goes to the receiver nearest the finger, and a long-press on an overlap fans out the receivers' badges briefly for an exact pick. Receivers show a small position badge (WR1, TE, RB) so they can be told apart at speed.
* **What decides the throw (PROPOSED, mapped to existing attributes §5.1):**
  * *Accuracy* sets the error radius; *pressure* (a rusher within 2 yards, or a hit as the ball leaves) widens it, reduced by Awareness.
  * *Arm* sets velocity and range; a deep target beyond the QB's range arrives late and short.
  * *Awareness* lets the AI QB set his feet and lead the receiver correctly; low Awareness throws to where the receiver *is* rather than where he will be.
  * *Separation* at the moment of release (the engine's openness measure) and the *passing lane* (defenders between QB and catch point, underneath zones) set how contested the ball is.
  * *Timing:* releasing as the receiver breaks (the play art's break point) adds accuracy; releasing late lets coverage close; releasing early on a deep route leads the receiver into the safety's zone.
  * The tap never guarantees a completion: a perfect read into a tight window can still be broken up or intercepted.

**Wide receiver (CONFIRMED sequence).** The monster runs the route shown in the play art.

* **Call for Ball:** available from the snap until the throw. It raises the AI QB's willingness to target this receiver; it does not force a throw. The response weighs openness (separation now and projected), pressure on the QB, the QB's Awareness (a smart QB ignores a call into coverage), **chemistry** with the QB and **coach trust** (§24.5). Repeated calls while covered lower trust slightly (PROPOSED).
* **Catch:** the button becomes **Catch** as the ball enters catch range; the timing ring closes on arrival. Catch result = timing quality × Catching × pass quality (velocity, placement) × contest (nearest defender's Coverage and position, Agility for catch radius). A perfect tap on a bad ball can still be dropped or broken up; a late tap on a perfect ball is a juggle or drop.
* **Evade:** after possession the monster runs automatically (ball-carrier logic §5); the button becomes **Evade** when a tackler closes. Timing plus Agility decides a juke; Strength decides a stiff-arm if the play's context is contact (PROPOSED: the label reads **Stiff-arm** instead of Evade when the closing tackler is head-on).

**Running back (CONFIRMED model).** The monster takes the handoff, follows blocks, chooses lanes and advances automatically (§5 ball-carrier behaviour). The player times one contextual action and the ability.

* **Contextual action** (PROPOSED): **Juke** when a tackler approaches from the side, **Truck** when one is head-on, **Dive** near the goal line or the line to gain. One button; the label tells the player which.
* **Pre-snap running approach** (PROPOSED for review): before the snap, a small toggle under the play art offers **Follow blocks** (default: patience, stays in the designed lane), **Look for cutback** (Awareness-weighted chance of a backside lane, more negative plays), **Attack contact** (falls forward, fewer jukes, more broken tackles for strong backs). Chosen once per snap; no live steering.
* **What decides the run (PROPOSED):** Awareness = vision (lane choice and look-ahead); Agility = acceleration, cuts, juke success; Speed = breakaway and pursuit escape; Strength = broken tackles and falling forward; Catching = ball security (fumble resistance on contact, §3: fumbles only on a tackle); blocking quality and defensive pursuit angles from the engine.

**Linebacker (CONFIRMED model).** Movement follows the assigned zone, man, blitz or run fit.

* Tap **Ready**; the offense snaps.
* Contextual button: **Tackle** when a ball carrier is in reach; **Intercept** when a reachable pass offers a pick chance; **Swat** when the ball is reachable but a catch is not realistic (behind him, high, or contested). One button; it shows the best available verb.
* **Discipline is part of good play (PROPOSED):** the AI keeps the linebacker in his fit. The player's timing chooses *when* to commit; committing early to a run fake (play action) costs position; holding the fit until the ball shows earns the "assignment" credit in grading (§24.7). There is no control that abandons the assignment to chase the ball.

**Cornerback (CONFIRMED model, owner's prototype feedback included).** Movement follows the coverage and becomes pursuit after the catch or a run.

* Contextual button: **Intercept**, **Break up** or **Tackle**, chosen from the situation, with a timing ring as the ball arrives.
* **Outcome model (PROPOSED).** A tap is an *attempt*. Resolution happens in two layers, so ratings shape the chance and timing shapes the execution:
  1. **Opportunity**, set by the coverage before the tap: distance to the catch point at arrival (Coverage, Speed, recovery after a break from Agility), whether he can see the ball (facing the QB vs trailing; Awareness for ball tracking), and how good the throw is (QB Accuracy, placement away from the defender).
  2. **Execution**, set by the tap: timing quality (Early / Good / Perfect / Late) multiplies the chance of the action he attempted. An Intercept needs a high opportunity and Catching; a Break up needs less; going for the pick when only a breakup was available risks a **miss** and yards after catch.
  * Results include interception, breakup, contested catch allowed, or a clean catch allowed. A badly timed attempt (early jump) can leave the receiver open.
  * **Risk choice (PROPOSED):** the button offers Intercept only when the opportunity is real; otherwise it offers Break up. A player who wants the pick when it is offered accepts the risk.
  * **No arbitrary rolls:** the probability shown to developers is a product of named factors that a replay can explain; the banner names the deciding factor ("Late break: he caught it in front of you").

### 24.4 Monster and ability creation

**Identity and appearance (CONFIRMED scope, PROPOSED detail).** Built on the existing species sprite spec (§15.1: body, size, look, features, pattern, colours) so a created monster draws with the same 16×16 builder and the same top-down conventions:

* **Name** (unique within the save; profanity filter; never one of the 72 species names or the 48 signature-ability names).
* **Element**, one of the twelve (§5.1), biasing starting attributes as generation already does (Electric +Speed, Earth +Strength, Psychic +Awareness …).
* **Body plan, size, look, features, pattern and two colours**, from the same option lists the species use.
* **Nature**, one of the 25 (+10% / −10%, §5.1). PROPOSED: the player picks it, because it is the clearest strength/weakness lever. OPEN: pick vs roll.
* **Whether a created monster is a new species or a member of an existing one** is OPEN; PROPOSED: a *new, one-off form* that uses the species art system but is not one of the 72, so it never collides with the dex.

**Position and archetype (PROPOSED, from the locked v4.9 archetypes).**

| Position | Archetypes |
|---|---|
| QB | Pocket Passer, Scrambler, Dual Threat, Gunslinger |
| RB | Power, Speed, Receiving, Balanced |
| WR | Speedster, Possession, Physical, Route Technician |
| LB | Field General, Coverage, Blitz, Run Enforcer |
| CB | Man, Zone, Ball Hawk, Press |

**Starting attributes, strengths, weaknesses and growth (PROPOSED).**

* The archetype sets a starting template on the existing 12 attributes (§5.1), totalling a rookie-level overall (about 55–62 at the chosen position). The element and nature then shift it.
* **Point allocation:** a small pool (PROPOSED 12 points) the player may move between the position's key attributes, with a cap per attribute and a matching **weakness**: raising one key attribute above the template requires lowering another, so every build has a visible tradeoff.
* **Potential** is fixed at creation (PROPOSED: the same for every created monster, so no creation is strictly better), and growth follows the existing levelling and attribute-point rules (§15.12, §17.3) plus Career Mode's weekly development (§24.5).

**Signature ability (CONFIRMED: built from supported parts; PROPOSED system).** A created ability is assembled from the engine's existing effect primitives (§15.12: every ability is an `effect` object of primitives) and must obey §23.9–§23.10:

1. **Choose an effect** from a curated list for the position, each a real engine primitive with a fixed magnitude band at non-legendary strength. Examples: QB *release speed* (+x% ball velocity on first-read throws), WR *route snap* (sharper breaks on one route family), RB *contact balance* (fewer tackles completed by the first tackler), LB *read the mesh* (shorter play-action bite), CB *recovery burst* (+x% speed for 1 s after being beaten).
2. **Choose a trigger** from the supported list: once per drive / half / game (the engine's play-to-play memory, §23.11), on a situation (third down, red zone, fourth quarter, after a big play), or **on activation** with the ability button and a charge count.
3. **Choose a tradeoff**, required: a stronger magnitude costs a narrower trigger or fewer charges; a broad trigger costs magnitude. A points budget makes every combination land in the same measured value band.
4. **Personalize:** name (unique, never an existing signature name), a short card line written from the chosen parts (so the card always matches the engine, §23.9), and a look from the signature-look families (§23.12) tinted by element.
* **Balance gate (PROPOSED):** the allowed combinations are measured offline with `tools/ability-balance.mjs` (paired snaps, §23.15) and published as fixed bands, so a created ability always measures near a typical rare signature ability, never a legendary. No absolutes ("never", "always") are offered.
* **Activation model** (OPEN): whether the right-hand button activates the ability itself (charges per game) or only fires abilities whose trigger is "on activation". PROPOSED: both kinds exist; the button lights only when the equipped ability is activatable and its trigger is met.

### 24.5 Weekly preparation and life outside games

**Goal (CONFIRMED):** the week is part of the fun, with visible consequences, limited choices and no mandatory checklist. **Proposed loop:**

* **Activity budget:** each week offers **4 energy** (PROPOSED). Game day is free. Activities cost 1 or 2. Unspent energy carries into recovery, so resting is a real choice, not a forfeit.
* **Activities (PROPOSED list):**

| Activity | Cost | Consequence |
|---|---|---|
| Position drill (30–60 s skill challenge using the live controls) | 1 | XP toward the drilled attributes, scaled by the drill grade; teaches timing without game stakes |
| Film study (opponent) | 1 | Pre-snap hint on one opponent tendency this week (e.g. the coverage they play on third down); small Awareness edge on matching plays |
| Team practice | 1 | Chemistry with the unit (QB–WR timing, LB–DL fits); coach trust |
| Strength / speed work | 1 | Attribute XP on Speed, Strength or Agility; adds fatigue (§15.14) |
| Signature ability training | 2 | Ability progression (an extra charge, or a step up within its band) |
| Recovery | 1 | Fatigue down, injury recovery a week sooner, avoids burnout |
| Meet a coach or teammate | 1 | Relationship and story beats; can unlock a role change or a favour |
| Personal event (when offered) | 0–1 | One choice with a consequence: media, rivalry, a mentor, an offer from another club |

* **Consequences are visible:** the pregame screen lists what the week bought ("Film: they blitz on 3rd and long", "Chemistry +1 with the QB"), and post-game grades refer back to it.
* **Variety, not repetition (PROPOSED):** repeating the same activity three weeks running yields less (the existing training repetition penalty, §12), and personal events only appear when the career state makes them relevant.
* **Separate from Franchise:** no scouting, recruiting, game plans, cap or staff decisions. The coaching AI does all of that for the club.

### 24.6 Career progression

**Path (CONFIRMED stages, PROPOSED detail):**

1. **Creation** (§24.4).
2. **Entry:** the created monster enters the league through the **draft** (§19; a first-year class member with a public board rank) or, if undrafted, an **open tryout** with a club in the current league (PROPOSED: a short drill-based tryout week). OPEN: draft, tryout or both.
3. **Joining a team:** depth-chart position as a backup or rotation player; **coach trust** (0–100, PROPOSED) earned through grades, practice and relationships decides snaps.
4. **Earning the starting role:** a starter's job opens through trust, injury or form; the coach announces it in a short scene.
5. **Development:** levels and attribute points as in Franchise (§17.3), weekly development (§24.5), ability progression, and **evolution** where the created form has one (OPEN: do created monsters evolve).
6. **Honours:** league awards (§16.4, §18.5), championships, Beast Bowl, records (§17.8), rivalries with specific opposing monsters, career milestones as cutscenes in the §21.1 style.
7. **Offers and movement:** at contract end, other clubs in the **same active league** may offer. A player changing clubs does not change league structure. Career Mode transfer behavior remains proposed and requires approval.
8. **Retirement:** age and decline end the career; a **Career card** (PROPOSED) records clubs, tiers, seasons, stats, awards and titles, separate from the Franchise Hall of Fame (OPEN: a Career Hall of Fame).

### 24.7 Performance evaluation

**Principle (CONFIRMED):** grades reward the position's job. **Proposed per-snap grades** (built on the engine's existing responsibility accounting, §16.1, which already attributes pressures, sacks, coverage targets and assists to specific monsters):

| Position | Graded on |
|---|---|
| QB | Read quality (throw to the most open target available at release), timing, avoiding sacks and turnovers, situational throws (third down, red zone), not only yards |
| WR | Route timing to the break point, separation created, Call for Ball judgement, catch timing, yards after catch, drops |
| RB | Lane choice vs the best available lane, yards after contact, ball security, approach choice fit |
| LB | Fit discipline (in the gap or zone the play assigned), reaction to play action, tackles and missed tackles, coverage results |
| CB | Targets prevented (QB looked and went elsewhere), separation allowed, breakups and interceptions, timing quality, tackles after the catch |

Game grade (A–F, PROPOSED) = weighted snap grades; it feeds coach trust and XP. The post-game screen shows the three best and the three worst snaps with a one-line reason each.

### 24.8 Attribute-driven outcomes and balancing principles (PROPOSED)

1. **Skill and ratings both matter.** Ratings set the size of the opportunity; timing sets how much of it is realized. A perfect tap with low ratings beats a late tap with low ratings, and a high-rated monster still needs good timing to reach its ceiling.
2. **Use the existing attributes.** Every outcome maps to the 12 attributes in §5.1 (vision = Awareness, acceleration = Agility, ball security = Catching, ball tracking = Awareness + Catching, reaction = Awareness + Coverage). No new attributes unless the owner approves them.
3. **No guaranteed outcomes and no hidden dice.** Every probability is a product of named factors; the result banner names the deciding one.
4. **One engine.** Career snaps run on the same deterministic engine as Franchise games, with the player's taps as recorded inputs. AI teammates and opponents behave exactly as in Franchise. Career Mode never gets a separate, easier physics.
5. **Difficulty** (PROPOSED: Rookie / Pro / All-Star, locked at creation, as §15.2) widens or narrows the timing windows and adjusts AI quality; it never changes the attribute formulas.
6. **Validated by measurement.** Before approval of any build, simulated "perfect", "average" and "poor" timing players are run against each position to show that ratings and timing each move results, and that no position is trivially easy (the cornerback feedback).

### 24.9 Presentation

* The existing top-down vertical field (§3) and play-art colours (§6). The user team's play art before the snap, the controlled monster's assignment emphasized (thicker line), all art hidden at the snap.
* The controlled monster: a gold ring at its feet and a small marker above it, always on top of the draw order; the camera follows it rather than the ball when it is not the ball carrier (PROPOSED).
* Feedback: the timing ring on the contextual button, a short timing tag, the outcome banner; ability readiness as a filled pip ring. Reduced-motion and screen-shake settings apply (§23.2).

### 24.10 Open questions for the owner

1. **Format (RESOLVED):** Career Mode, if built, uses the active **7-on-7** format unless the owner separately authorizes a format change.
2. **League structure (RESOLVED):** Career Mode, if built, uses the active **single 16-club league**. No tier system or promotion/relegation prerequisite.
3. **Created monster identity:** a one-off new form (proposed) or a member of an existing species? Does it evolve? Is nature picked or rolled?
4. **Play calling:** may the player suggest or audible plays (e.g. a QB audible from the six-card plan), or does the coaching AI always call them?
5. **Ability activation:** activatable abilities with charges, triggered abilities, or both (proposed)? How many charges per game?
6. **Entry:** draft, open tryout, or both?
7. **Energy budget:** 4 per week (proposed), and which activities make the first version?
8. **Career length and end:** retirement by age only, or also by choice? A Career Hall of Fame?
9. **Relationships:** how deep should coach and teammate relationships go (a trust number and a few scenes, proposed, or a fuller social system)?
10. **Cross-mode links:** confirmed separate saves; may a retired Career monster ever appear in Franchise Mode (e.g. as a free agent or a coach), or are the modes fully isolated?

### 24.11 Possible implementation sequence (NOT APPROVED FOR DEVELOPMENT)

> Recorded only so the scope is visible. **Nothing below may begin without the owner's explicit approval.** Order assumes Franchise Mode work is finished or paused by the owner's decision.

1. **Input model in the engine:** recorded `{tick, action}` inputs, a controlled-monster flag, deterministic replays; regression proof that Franchise games are unchanged.
2. **One position as a vertical slice** (PROPOSED: cornerback, because it carries the most specific feedback), with the two-layer outcome model and timing feedback; measured with simulated players.
3. **The other four positions**, one at a time, each with its contextual verbs and grading.
4. **Monster creation** (appearance, position, archetype, attributes) and the **ability builder** with measured bands.
5. **The weekly loop** (energy, activities, consequences).
6. **Career progression** (entry, trust, starting role, contracts, offers, movement between tiers), dependent on the tiered league from Franchise.
7. **Presentation and polish**, then a Career save store separate from Franchise.

---

## 25. Beast Clash — design philosophy and balance policy (REVISED 2026-10-21)

> **Owner decision, 2026-10-21.** This section records the revised philosophy that governs Beast Clash from Gate B.5 onward. It **supersedes the earlier requirement that every species demonstrate a statistically proven competitive role**. That requirement is **retired**. The Gate B–B.5 reports remain the historical research record and are not rewritten: they were run under the old requirement and should be read that way.

### 25.1 What Beast Clash is

Beast Clash is a **collection-first battle experience with meaningful strategic depth**. Players build 3v3 or 5v5 teams from the monsters they collect and fight seeded, turn-based battles: front monsters exchange strikes; Supports and bench Disruptors act from the back; teams swap under fixed rules; sudden death and the stalemate rule end long battles. Beast Clash is an additional reason to collect and use monsters. It does not replace football as the heart of Gridiron Beast.

### 25.2 Design principles

1. **Unequal power is intentional.** Some monsters will be excellent Clash competitors, some average, some weak in most battles. Weak individual performance is **not, by itself, a balance defect**. A monster is not buffed because it sits below the median, and is not redesigned because another species does the same job better.
2. **Every monster keeps a recognizable identity.** Players must be able to understand what their monster does. Abilities do not have to be mechanically unique: simple moves, familiar effects and overlapping roles are fine. Mechanical complexity is never added only to make a monster different.
3. **Strategic decisions must matter at the team level.** Battles reward complementary picks, type and ability interactions, starting lineups, reading matchups, voluntary swaps, built-around combinations, discovering counters, and adjusting after losses. A stronger team should usually win, but a battle with real tactical options should not feel predetermined. These are goals for the system as a whole, not tests every species must pass.
4. **Powerful monsters and combinations are allowed.** Legendaries may carry substantial advantages, rare monsters may be especially valuable, and ordinary monsters may turn out to be excellent. Players are rewarded for finding strong combinations. **High performance alone never justifies a nerf.** A strategy is investigated only when it creates a real problem: an effectively unavoidable exploit; an interaction that stops opponents taking meaningful actions; one strategy that consistently invalidates most reasonable alternatives (no practical counter exists); an ability that bypasses intended combat restrictions; or an unintended interaction that makes matches frustrating or nonfunctional.
5. **Football value and Clash value are distinct.** A great quarterback may be a weak Clash monster and the reverse; some monsters are useful in both modes, others are collected for appearance, rarity, evolution or personality. Football value and Clash value are **never equalized**, and football attributes, abilities, positions and overall ratings are **never changed to correct Beast Clash balance**.

### 25.3 Balance evaluation standards

| Category | Standard |
|---|---|
| **Combat integrity** (required) | Battles resolve correctly; actions occur in valid order; conditions expire correctly; damage and healing are valid; swaps respect the approved rules; no infinite loops; seeded battles replay identically |
| **Strategic quality** (desired, system-level) | Composition and lineup order influence outcomes; archetypes offer distinct play styles; strong teams have identifiable weaknesses; swapping creates real decisions; several broad strategies are worth exploring |
| **Power distribution** (allowed) | Weak, average, strong and dominant monsters; powerful Legendaries; strong ordinary monsters; specialized counter teams; unfavorable archetype matchups. **No universal win-rate targets.** Win rates are diagnostic information, not pass/fail thresholds |
| **Player experience** (priority) | Enjoyable battles, interesting discoveries, clear ability feedback, exciting combinations, understandable losses, reasonable pacing, consequential choices |

A mathematically balanced game is not necessarily a fun one.

### 25.4 Archetype matchups and powerful teams

- **Pure-archetype matchups may be lopsided.** Gate B.5 showed practical 3v3 counterplay through mixed compositions. 5v5 is harder for Disruptor-heavy teams, partly because of the bench-action limit (back-row Test E); that rule is **not** being changed now and is revisited only if real gameplay shows a serious problem. There is no 75/25 matchup threshold. Players should learn that composition matters and that one-archetype teams can have serious weaknesses.
- **Florant's Canopy Shade stays at 17.2%.** The 14% experiment is not implemented. The Wispira + Florant + Galyx combination has several accessible counters, which is the intended loop: a player finds a strong combination, others experiment and find answers, the game rewards learning. Powerful combinations are not weakened merely because they beat random teams.

### 25.5 Closure of the broad balance gates

**Gate B.5 is the final scheduled broad combat-balance gate for the current Beast Clash foundation.** (Owner addendum, 2026-10-21: the final implementation authorization nevertheless approved Elderoot's 12% Ancient Grove and Tempestra's Storm Cyclone as part of the permanent configuration, §25.10.) There is no automatic Gate B.6, and no further multi-species improvement project. The seven species Gate B.5 found functionally outclassed (Terrabull, Lumini, Elderoot, Crustank, Murklaw, Astralux, Muddlet) and the borderline ones (Tideram, Bramblet, Flurrit, Zippit) are acceptable as they are, unless a verified mechanical defect, a misleading description, an exploit or another real gameplay problem is found. The Gate B–B.5 evidence and tooling are kept for reference.

### 25.6 Testing levels

| Level | Use for | Required | Full-roster simulation? |
|---|---|---|---|
| **1. New monster validation** (default) | Adding a species with existing mechanics | Ability functions; combat-rule compliance; determinism; 3v3 and 5v5; a small set of reference matchups; no critical exploit | No |
| **2. Targeted interaction testing** | A new ability mechanic, status condition, swapping interaction, defensive effect, targeting rule or unusual combination | The affected mechanics and the existing species they touch | Only if the change has broad systemic effects |
| **3. Major system validation** | Combat-engine revisions, new global rules, large changes to conditions or swapping, new team-size formats, major expansions, serious problems seen in real play | System health across the roster | May be appropriate; individual species viability is still not a pass/fail requirement |

Reference teams for Levels 1–2 live in `src/clash/reference-teams.js` (offensive, defensive, support, disruption and mixed teams, in 3v3 and 5v5) and the Level 1 check runs with `npm run clash:level1 -- --species=<id>`. They are reused for every addition so results stay comparable and reproducible.

### 25.7 Introducing a new monster (toward 500 species)

1. **Define its identity:** name, type, rarity, evolution family, intended football role, Beast Clash ability and its player-facing description, and the combat interactions it touches. It does not need a unique Clash niche or to beat any existing species; its football and Clash value may differ widely.
2. **Validate the ability (mandatory):** it activates under the intended conditions, produces the correct effect, respects battle rules, handles missing or invalid targets, behaves correctly when the monster is knocked out, interacts correctly with swaps, works in 3v3 and 5v5, and never creates an invalid state. Its description must match what it does (the card-text check in `validate.js` must pass).
3. **Run the small representative suite** (Level 1 reference teams). The goal is to catch broken interactions and extreme unintended outcomes, not to hit a win rate; the monster is not compared against every species by default.
4. **Check for severe interactions:** excessively long or capped battles, opponents prevented from acting indefinitely, bypassed combat restrictions, unintended invulnerability, invalid damage or healing, effects repeating without limits, or a combination that invalidates normal play. Being very strong is not a failure.
5. **Approve for inclusion** when the mechanics work, the presentation is accurate and nothing critical is found. A weak monster is not held back for its win rate; a strong one is not held back for exceeding a target.
6. **Monitor after introduction.** Track notable issues as the roster grows; do not rebalance the roster after each addition; make focused corrections only when evidence shows a real problem.

### 25.8 How changes are evaluated from now on

Each proposed change answers: does it improve the experience; does it make an ability work as intended; does it add an interesting decision; does it remove an exploit or a frustrating interaction; does it keep the system stable; does it add unnecessary complexity; and **was it made only to lift a weak monster's statistics?** Changes of the last kind are flagged for reconsideration, not automatically rejected: a weak monster may have gained a genuinely enjoyable ability worth keeping.

### 25.9 Owner approval

**No Beast Clash balance change becomes permanent without the owner's explicit approval.** Experimental changes live as named, reversible Lab switches (`src/clash/values.js` `movePatches`, recorded in `src/clash/balance-manifest.js`); the game's defaults change only in an approved implementation step, with the golden replay fixtures and football fingerprints re-verified. Franchise integration, save-schema changes and new development phases each need their own authorization.

### 25.10 Permanent balance configuration — values 1.1.0 (implemented 2026-10-21)

The owner's Final Balance Implementation Authorization (2026-10-21) made this configuration the permanent Beast Clash game. It is recorded in `src/clash/balance-manifest.js` (`APPROVED_PATCHES`, `APPROVED_SETTINGS`) and generated into `BEAST_CLASH_BALANCE_MANIFEST.md`.

| Status | What | Where it lives |
|---|---|---|
| **Permanent** (values 1.1.0) | Duration **C6** (stalemate rule) and **half-cost voluntary swaps**; 15 move changes: Scorchulk `scorchulk_maul_first`, Wispira `wispira_veil_every4`, Duskyre `duskyre_cut_every3`, Umbrikit `umbrikit_pounce_not_voluntary`, Echolot `echolot_echo_flat`, Zephiro `zephiro_tailwind_combo`, Tsunarok `tsunarok_undertow_hit_chill`, Ripplet `ripplet_undercurrent_08`, Aurodrax `aurodrax_sovereign_surge`, Cindruff `cindruff_tumble_always`, Cerebrix `cerebrix_foresight_refused_daze` (B.2 version, no 0.15x hit), Nocturne `nocturne_eclipse_2` (B.2 version, no opening trigger), Aeralis `aeralis_downdraft_daze` (B.3 version, no front activation or initiative), Elderoot `elderoot_grove_12` (heal 6% → 12%, nothing else), Tempestra `tempestra_cyclone_storm`; Terrabull card text only ("From the back, every second exchange shakes the opposing front two, Chilling them") | `src/data/clash-moves.js` (values and card text), `src/clash/values.js` defaults (`duration`, `swapCost`), `battleConfig({})` |
| **Declined** | Noctlet `noctlet_always_first` and the always-first validation exception. Validation has no exception option; the patch fails validation and the permanent ruleset refuses it | `validateMoves()`; `battleConfig` guard |
| **Inactive Lab experiments** | Every other patch in `movePatches`, duration R2, swap cost `free`, back-row tests A–D/E2, O1–O3, sudden-death start variants | Off unless the Clash Lab turns them on; never part of the permanent game |
| **Historical** | Gate A–B.5 and the final review were measured on the values 1.0.0 game. The `v1.0.0` ruleset (frozen table `src/data/clash-moves-v1.0.0.js`, Model F, action-cost swaps) replays them exactly; `gateConfig(gate)` uses it, and old replay keys map to it | `tests/clash/fixtures/golden-v1.0.0.json`, `pre-1.1.0-snapshot.json` |
| **Future** | New monsters follow §25.7 (Level 1). Further balance work, franchise integration and save changes each need their own authorization | — |

**Engine correction in values 1.1.0 (owner authorization 2026-10-21): reflected-damage knockouts.** Before, when Pyroclast's Magma Crust or Thornback's thorns dropped the attacker to 0 HP, no knockout was recorded: the attacker finished its action at 0 HP (further hits, on-strike effects, arrival conditions), its side's next monster could be struck before stepping up, and the stalemate counter and knockout credit missed it (about 2% of battles involving those two Tanks). Now, under the permanent ruleset: the blow that broke the shield lands; the attacker is knocked out once, right after that blow (after the defender's own knockout if the blow also felled it); nothing else in its action happens; its replacement steps up before the opponent acts; and a bench attacker knocked out by an arrival hit is not healed or used again that exchange. The values 1.0.0 ruleset keeps the old behaviour so historical battles replay exactly. Tests: `tests/clash/reflect-ko.test.js`.

Engine hooks used by the permanent table: `arrivalCond`, `refusedEffect`, `hitMult`, `dodgeEntry`, `echoFlat`, `cycloneArrival` (plus pre-existing Gate A mechanics). The other Gate B.4–B.5 hooks stay in the engine, inert, for Lab experiments and historical replays; a test proves the permanent table carries none of their keys.

**Rollback:** the values 1.0.0 game is commit `59cfa7a` (tag `clash-v1.0.0-pre-implementation`, local). Restoring it is a revert of the implementation commit, touching only `src/clash/`, `src/data/clash-moves*.js`, Clash tests and fixtures, the Clash Lab screen and documentation; no football, franchise or save file is involved. Without a revert, `battleConfig({ ruleset: 'v1.0.0' })` plays the old game exactly.

## 26. Beast Clash in Franchise Mode (IMPLEMENTED 2026-10-21, owner authorization)

> The owner authorized full implementation on 2026-10-21: Tuesday Monster Encounters, the pregame Clash in place of the coin toss, the overtime Clash tiebreaker, battle speed and lineups from the real roster. Every battle uses the real engine on the permanent values 1.1.0 configuration; no balance value changed. Decisions taken while implementing are recorded here as they were made. Not in scope (later roadmap phases): advanced trading, Monster Partnerships, career timelines, full Coach Assist, stadium management, 32 teams, Career Mode, the Battle Room, new balance changes.

### 26.0 Shared rules

- **One adapter.** `src/franchise/clash-link.js` is the only franchise file that imports the engine (`tests/clash/boundary.test.js` enforces it); `franchise.js` imports that adapter. The football sim, the core, the save and cloud code never touch Beast Clash.
- **Deterministic and rebuildable.** A franchise battle is a seed drawn once from the franchise generator, two lineups of real monsters and the player's recorded decisions. The save keeps that record plus a summary (winner, how, exchanges, log hash); the full battle is rebuilt from it whenever the screen, a replay or a test needs it. Reloading mid-battle resumes it.
- **Lineups come from the roster.** Injured monsters never battle. The automatic lineup is the engine's own rule (a Tank in front when available, then the best overalls, at most two of one archetype, Supports and Disruptors at the back); the player can change it on the battle screen. Battle stats are built from the monster's real attributes, nature, fatigue, level and evolution stage, exactly as the Clash Lab does. No replacement monsters are ever generated for the player.
- **One selection, one battle** *(revised 2026-10-22, owner brief; §31.1)*. Before the battle the player picks the monsters and their **order of entry** (the first fights until it is knocked out, then the next steps up; HP and conditions carry on). Once the battle starts it runs on its own to the end: **no swap menus, no decisions**. Both sides use the engine's fixed-order policy (`none`: no voluntary swaps; `FRANCHISE_POLICIES` in `clash-link.js`). *Watch battle* animates it at Normal / Fast / Fastest; *Skip to results* is the identical battle settled instantly; skipping never lowers the chance of winning. Records store the policies they were played with, so battles recorded under the earlier rule (Play with `manual` decisions, Auto with `smart`) still replay exactly. *(Historical: until 2026-10-22 Play mode asked at every voluntary-swap window and Auto used the smart policy on both sides.)*
- **Effects on the roster.** Each monster that battled earns Arena XP (Model C2, the Phase 1 formula, about 9 XP a battle; football games give 24+) through the same level-up loop as a football game (evolutions still wait for the owner); the result screen lists each battler's XP gained, its level and a bar toward the next level (about 9 XP a battle: a level-1 monster needs 48). It also gains a little fatigue (encounter and pregame 5, overtime 6: the Phase 1 load values).
- **Settings** (`settings.clash`, filled with defaults for older saves): the suggested way to battle (Ask every time / Watch / Skip to results; the lineup is always confirmed first) and battle speed Normal (1×), Fast (2×, default), Fastest (4×). Older saves' *Play* and *Auto* become *Watch*. Speed changes presentation only.
- **Save compatibility.** No schema change: new fields are additive (`week.encounter`, `settings.clash`, and per-game Clash records) and every older save loads as before.

### 26.1 Tuesday Monster Encounters

Tuesday's recruiting pitch is replaced by an encounter with one of the monsters the scout found on Monday. **Encounters are 3v3** (owner, 2026-10-22: briefly changed to 1v1 on 2026-10-21, then restored to 3v3).

- **Enter Beast Clash:** choose one prospect; the battle is up to 3v3 (smaller only when fewer than three roster monsters are healthy). The wild side is the chosen monster in front with **two wild companions** (revised 2026-10-22, §29.1; before, the week's other prospects were its companions). Companions cannot be signed; the wild group as a whole is matched to the club's strength, and the prospect keeps every rating it was scouted with. **Win:** the monster offers to sign; the player may accept (the usual roster-limit release and salary-cap rules apply, exactly as before) or let it go. **Lose:** one ordinary recruiting pitch (development / facilities / playing time) at the existing odds; a refusal ends the day. Either way the battlers earn Arena XP and 5 fatigue. With the automatic lineup the player wins about four encounters in five in every season (§29.1).
- **Skip encounter:** no battle, no signing this week, and nothing else changes: no morale, board confidence or progression penalty. The screen says so in plain words, and the Help sheet explains the difference from *Skip to results*.
- One encounter per Tuesday. Staff auto-run enters an encounter only for a clear upgrade (the same criterion as before) and plays it in Auto; otherwise it skips.
- The final regular-season week and the playoffs keep Monday draft scouting and the Tuesday recovery day; no encounters then.

### 26.2 The pregame Clash (possession)

The coin toss is gone. Before every game, three monsters from each roster battle; the winner chooses the opening possession.

- **Player games:** the Match Day screen leads to the battle screen (lineup and order, then Watch or Skip to results). If the player wins the Clash they choose **receive**, **defer** or **kick** (the same three choices the toss offered). If the AI wins, it chooses for itself: defer two times in three, otherwise receive (the coin-toss AI's rule, one seeded draw). The football engine then starts with that `coinWinner` and `choice`, exactly as it did after a toss. The AI side's lineup is the engine's automatic lineup from its real roster.
- **League games** (all AI-vs-AI, regular season and playoffs) are opened the same way, headless: automatic lineups, smart policies, one seed, the AI choice rule. Each result records `pregameClash` (winner side, choice, how it ended, exchanges).
- **Headless player games** (tests, "sim to end" before kickoff) settle a pending Clash headless; a Play battle from before 2026-10-22 left mid-decision finishes as it would have in Auto, and an unmade choice defaults to receive.
- A forfeit (no legal lineup) is unchanged: no Clash, the 0-21 loss as before.

### 26.3 The overtime Clash (tiebreaker)

Football plays **one** overtime period (`otPeriods: 1` in every franchise game, player and league). If the score is still tied, the football engine finishes the game with no winner and flags `needsTiebreak`; Franchise Mode then settles it with a Beast Clash: **3v3** in the regular season, **5v5** in the playoffs.

- **Player games:** the match screen shows *Still tied* and leads to the battle screen (lineup and order, then Watch or Skip to results). The winner of the Clash wins the game; the final panel and the box score say so ("OT · won by 3v3 Beast Clash").
- **The record keeps the football score.** `winner` is set on the finished state and the result carries `clash` (size, winner, how it ended, exchanges); `homeScore` / `awayScore` are the football points as played and never change. Standings count a win and a loss (never a tie), points for and against are the football score, head-to-head and division/conference records follow the Clash winner, the player's schedule, campaign wins, badges, rivalry memory, news and monster game logs all use the same winner, and playoff brackets name the winner from the result.
- **League games** are settled headless the same way (automatic lineups, smart policies, one seed); a club with no healthy monster would lose a seeded coin instead (not reachable with full AI rosters).
- **Headless player games** (tests, "sim to end") settle the tiebreak in Auto.

## 27. Franchise Mode — accessible-depth roadmap (OWNER APPROVED, 2026-10-21; DOCUMENTATION ONLY)

**Status:** The feature direction and priority order below are owner-approved for the roadmap. This section does **not** authorize implementation, alter Beast Clash's existing approval gates, or authorize new game modes. Finish the Beast Clash engine, integrate it into Franchise Mode, and validate the existing franchise before building new roadmap features. UI polish is secondary to feature correctness.

### 27.1 Product audience and design rule

Gridiron Beast must be enjoyable for players roughly **10 years old through adulthood (50+)**. A younger player should be able to collect monsters, coach football, win trophies, and enjoy the campaign without mastering salary-cap strategy. A football-management enthusiast should have meaningful optional decisions. **Depth is welcome; mandatory complexity is not.**

Rules for every new feature:
- Preserve the existing weekly franchise rhythm; do not add mandatory extra days or repetitive maintenance chores.
- Teach mechanics contextually at first use; avoid front-loading long tutorials.
- Let players disable automatic hints, but keep on-demand help available.
- Make optional advanced controls affect the same underlying rules as simple controls; no separate easier trade engine.
- Explain material consequences in plain language. Irreversible actions (e.g., releasing a Legendary, forfeiting a draft pick, deleting a save) retain confirmation even in Expert guidance mode.
- Avoid punitive relationship meters, obscure penalties, or mechanics that trap a player in one roster configuration.
- Do not tie tutorial preferences to difficulty, competitive balance, Hall of Fame eligibility, or achievements.

### 27.2 Phase 1 — Complete existing Beast Clash and franchise integration (REQUIRED FIRST)

> **Status (2026-10-22): implemented and merged to `main`; acceptance-tested on branch `franchise-acceptance-coach-assist` (§28).** (Beast Clash values 1.1.0 and the knockout fix, §25.10; franchise integration, §26). The open decisions listed below were settled by the owner during implementation and are recorded in §26: Tuesday encounters are 3v3 (briefly 1v1, restored 2026-10-22), a win guarantees a signing offer and a loss gives one standard pitch (§26.1); draft-window weeks keep scouting and the recovery day; overtime eligibility, fatigue, AI behaviour and playoff ties are specified in §26.0 and §26.3. Acceptance testing (§28): multi-season automated runs, the Clash integration checks, the Tuesday difficulty review and an emulated-phone walkthrough from a new franchise into Season 2 all pass; five bugs were found and fixed. **Still required: owner playtests on real phones over full seasons** (no real-device testing has been done by the developer).

Finish the already-approved Beast Clash balance/engine work and its full regression and replay requirements before integration. Preserve historical Values 1.0.0 behavior and the approved Values 1.1.0 rules; do not bypass failing tests.

Integrate the combat system into the current franchise campaign:
1. **Monday scouting** remains part of the weekly schedule.
2. **Tuesday encounter:** use Beast Clash as the monster encounter/recruitment activity. Winning should provide a better recruitment outcome, while losing still yields a meaningful outcome. **Exact capture/reward rates, failure consequences, and late-season draft-window behavior are OPEN design decisions**; do not silently override the existing final-week/playoff draft-scouting and recovery schedule (§19).
3. **Pregame possession:** a **3v3 Beast Clash** replaces the football coin toss. The winner chooses **kick, receive, or defer**; this does not award football points.
4. **Battle speed:** default **2×**, with **1× / 2× / 4×** player options.
5. **Football overtime:** play one normal football overtime quarter; if still tied, resolve the winner through Beast Clash. **Regular-season tiebreaker: 3v3; playoff tiebreaker: 5v5.** Exact roster eligibility, fatigue, injuries, AI behavior, and postseason tie handling must be specified before implementation.
6. Clash must not corrupt franchise saves, football statistics, standings, awards, injuries, or historical replays.

**Acceptance:** New and loaded franchises can complete multiple full seasons, including bye weeks, scouting, encounters, football games, playoffs, contracts, draft, progression, records, and Hall of Fame flow, with deterministic results and no dead ends. Run automated checks and actual mobile-oriented playtests. No separate Battle Room, Draft Clash, Custom Clash, or Career Mode development during this phase.

### 27.3 Phase 2 — Coach Assist: optional contextual tutorials (APPROVED ROADMAP FEATURE)

> **Status (2026-10-22): Coach Assist 1.0 implemented** (owner authorization 2026-10-22; PR #33, integrated with the §29 balancing in build v35.0). It replaces the first-week tutorial of §15.13. What the build does:
> - **Modes** (Settings, the welcome screen, or any ? Help sheet; switchable at any time): **Guided** (first-use tip on each screen with a numbered walk-through, Guided suggestions at hard choices: which Tuesday prospect, which draft prospect, re-sign or let go), **Standard** (default: a short first-use tip per screen), **Expert** (no automatic tips of any kind, including moment tips and first-ability tips).
> - **Switches:** *Contextual hints* (counter-play outlines on Friday, roster notes such as a thin position, injuries, tight cap room, unspent points) and *routine consequence explanations* (cap room after a signing, a rookie deal's cost, what a trade gives up). Both default on and apply in every mode.
> - **Always shown, whatever the setting:** confirmations for choices that cannot be undone (draft pick, forfeit, release, trade, retire, delete), the over-the-cap warning, the below-26-monsters warning and the no-legal-lineup warning.
> - **? Help** in the top bar of every complex screen (HQ, each weekday screen, the Clash screen, pregame, roster and monster card, playbook, league, offseason and contracts, draft, staff), in every mode: that screen's topics first, the mode switch, then all topics by area, the football primer and *What the stats mean*. The match screen's ⓘ sheet links to it.
> - **Topics:** getting started (owner role, staff, weekly schedule, after the game); scouting and signing (scouting, ratings and potential, the Tuesday encounter, wild companions — why 3v3, only the chosen prospect can join, companions follow the club and cannot be signed, a stronger lineup wins more often — and *Skip the encounter* vs *Skip to results*); Beast Clash (how it works, elements and abilities, swap decisions, pregame, overtime); football (first game, Key Moments vs Full Coaching, the clock, plays, training, opponent scouting, game plan, media day, game day); roster (roster, injuries and fatigue, levels and evolution); contracts and the cap; the draft; trading picks (the existing system only); the Board (how the forecast is made, what the safe goal means, rebuilding vs contender goals, how confidence moves, the narrow-miss final warning, the three-strike rule; ? Help on the goal screen and My office, a Guided goal suggestion and a consequence line when committing); the league.
> - **First-use rules:** one tip at a time per screen, the screen's own topic first; *Got it* dismisses it for good (every mode, across save/load); *Turn tips off* switches to Expert; *Show all tips again* (Settings) brings them back. Moment tips (the clock late in a half, the first swap decision, the first overtime Clash) show once.
> - **Saved with the franchise** (`settings.assist = { mode, hints, consequences }`; dismissed tips in `tutorial.seen`). Older saves: tips previously turned off → Expert, the old *Coaching hints* switch → contextual hints, tips dismissed under older names stay dismissed; otherwise Standard.
> - Coach Assist reads the game and never writes to it: it makes no decision, changes no number, and does not touch achievements or the Hall of Fame (a test plays the same weeks in Guided and Expert and compares the whole save).

Introduce a unified guidance system rather than a separate intrusive tutorial for every feature. Guidance setting may change at any time within a save:
- **Guided:** step-by-step first-use instruction, plain-language explanation, and decision support; recommended for newcomers.
- **Standard:** concise first-use help and important contextual tips; recommended default for most players.
- **Expert:** no automatic walkthroughs; always retain a visible **? Help** entry on complicated screens.
- Separate optional toggles for **contextual hints** and **routine consequence explanations**, where practical.
- Always display essential irreversible-action confirmations and critical safety/data-loss warnings, regardless of setting.

Apply contextual teaching to drafting, scouting, Beast Clash type advantages and move effects, contracts/cap, trading, staff schemes, game plans, monster evolution, and postseason rules. Reveal help at the moment of decision, never as a forced encyclopedia. A younger player must understand what a choice does without needing to learn real NFL front-office terminology. Advanced users should be able to dismiss or disable the guidance permanently and re-enable it later.

**Acceptance:** A first-time player can complete onboarding, a trade, a draft pick, and a Clash battle using Guided; an experienced player can complete the same without automatic interruptions in Expert. Help remains available in both.

### 27.4 Phase 3 — Monster identity and attachment (APPROVED ROADMAP FEATURES)

**A. Career history and accomplishments (HIGH PRIORITY; primarily reuse existing data).** Add a readable monster career timeline/profile showing draft or recruitment origin, team changes, evolution, first touchdown/major firsts where reliable event data exists, championships, awards, career records, and notable rivalry performances. Existing statistics, awards, evolution and Hall of Fame records are the source of truth; do not fabricate missing historical events for older saves. Offer a simple highlights view and an optional detailed statistics view. This is not a second progression economy.

**B. Monster Partnerships (HIGH PRIORITY; lightweight automatic chemistry).** Teammates who repeatedly play together may develop a visible partnership (examples: QB–WR, QB–RB, compatible defensive pair). It develops passively through actual shared participation, not chores. Any benefit is **small, capped, transparent**, and must not outweigh a significant player-rating advantage or punish experimentation. No happiness upkeep, jealousy, mandatory friendship tasks, or complicated morale spreadsheet. Exact qualifying pairs, thresholds, bonus formula, reset/transfer behavior, and save migration are tunable specifications to approve before code.

**Acceptance:** A younger player can understand badges and partnership labels without studying formulas; a veteran can inspect the mechanics. Bonuses cannot snowball across many seasons.

### 27.5 Phase 4 — Accessible team-building depth (APPROVED ROADMAP FEATURES)

**A. Trading, second pass.** Keep existing draft-pick-for-veteran/future-pick trading intact while adding optional broader deals. Target features: owner-initiated monster-for-monster or monster-plus-pick offers, incoming AI trade offers, and potentially in-season trading after rules are defined. Keep protected monsters and deterministic offer logic unless explicitly redesigned. Avoid three-team trades, salary-retention accounting, complex clauses, or opaque trade-value formulas.

Use **one trade engine, two interfaces**:
- **Simple:** ask what the owner needs (e.g., better receiver, stronger defense, young prospect); staff suggests valid offers and clearly shows *you give / you receive / roster impact / salary impact*.
- **Advanced:** manually select eligible monsters and picks, inspect values and cap effects, and negotiate/counter.
- Both views follow the same eligibility, roster, cap, AI valuation, and save rules. Advanced is optional; Simple is not a different difficulty.
- Contextual Coach Assist explanations can be disabled; irreversible confirmations remain.

**B. Smarter AI franchises.** Improve opponent long-term roster management behind the scenes: positional needs, aging and retirement replacement, depth, scheme fit, injuries, cap constraints, draft development, and meaningful rival identity. The player should experience better opponents without additional weekly tasks. Evaluate across multiple seasons, not only single-game strength. Do not assume existing AI is broken; benchmark before changes.

**C. Free agency:** keep the existing offseason market approachable. Improve clarity and AI decisions before adding complexity; no advanced contract clauses required for franchise completion.

### 27.6 Phase 5 — Long-term possibilities (NOT APPROVED FOR IMPLEMENTATION)

- **GM career mobility:** selling/leaving a club, job offers, carrying a GM career to another club, preserving personal accomplishments after firing or retirement. Worth revisiting after core franchise validation; no new mandatory management layer now.
- **Stadium management:** optional hybrid owner feature, deferred; no stadium economy or construction requirements now.
- **Mentorship:** possible small training interaction between veterans and rookies; fold into existing training if pursued, not a new weekly chore.
- **Weather and expanded penalties:** future football realism only if playtests justify the learning and balance costs.
- **League expansion to 32 clubs:** **owner-confirmed long-term intention, not cancelled**. The current active league remains **16 clubs, four divisions, two conferences, one competition/campaign**. A future design phase may expand to **32 clubs** and revisit divisional alignment, schedules, playoff scarcity, AI rosters, statistics, franchise migrations, gym-club distribution, and performance. **No target release or implementation authorization exists.** Do not confuse expansion with the abandoned three-tier promotion/relegation pyramid.
- **Separate modes:** a possible Battle Room (Draft Clash first; Custom Clash later) and Career Mode are future proposals only. Franchise Mode remains the development priority.

### 27.7 Explicit exclusions and documentation policy

**Not part of the active franchise design:** 11-on-11 play, Challenger/Vanguard/Sovereign tiers, promotion/relegation challenges, tier-specific salary caps, and a 48-club three-tier pyramid. These are legacy concepts, **not** future prerequisites for Career Mode or the 32-club expansion. Do not reintroduce them without a new owner decision.

Do not confuse **documented**, **approved for roadmap**, **authorized to implement**, and **implemented/tested**. Maintain this file as the sole authoritative GDD. Use Git commit history for previous versions, not separate archived GDD copies. Active sections should use the latest approved design. Historical playtest notes may remain for traceability only when clearly marked historical and not actionable.

### 27.8 Feature acceptance and sequencing

For each new roadmap feature: first record exact behavior and unresolved decisions, then owner approval for implementation, then isolated development, tests, save compatibility, mobile playtest, and regression checks. Do not launch phases concurrently. **Priority:** Beast Clash and existing franchise stability → Coach Assist → monster history and partnerships → trading and AI → optional long-term features. Polish is not a substitute for functional completion.

## 28. Franchise acceptance testing (2026-10-22, branch `franchise-acceptance-coach-assist`)

### 28.1 What was tested
- **Automated multi-season runs** (`tools/franchise-soak.mjs`): franchises on every difficulty played by a hands-off owner (the staff runs each week, Tuesday encounters in Auto when the staff sees an upgrade, every pregame and overtime Clash, byes, playoffs, postseason events, Legend Tracks, re-signing, the draft with real picks, free agency to the roster minimum, the next season). After every game it checks: roster within limits, every attribute 1–99, no NaN, unique monster ids and names, lineup slots pointing at roster monsters, finite cap figures, league wins equal losses, no ties in the standings, every tied result carries a Clash verdict, and a save round-trip at each season boundary. Runs after the fixes: 34 franchises, 121 seasons, 0 violations (about 1,200 of the player’s games plus the rest of the league’s, 1,133 pregame Clashes involving the player’s club, 30 overtime Clashes).
- **Clash integration:** one encounter per Tuesday; Play, Auto and Skip to results are the same battle (Play differs only by the player's swap decisions); Skip Encounter changes nothing but the day (board, roster, cap, generator untouched); the pregame Clash sets possession and the overtime Clash the winner (3v3 season, 5v5 playoffs); injured monsters never battle; every battler takes the occasion's fatigue and nobody else; a Play battle saved and reloaded mid-decision finishes identically; saves from before the Clash load and play on.
- **Emulated phone walkthrough** (`tools/ui-walkthrough.py`, headless Chromium at 320×568, 360×640, 390×844 and 412×915): a brand-new franchise through onboarding, the creation draft, every weekday screen, Tuesday encounters in Skip / Auto / Play (including closing the swap sheet), Sunday games with the pregame Clash and overtime, the end of the season, postseason, contracts, the draft and into Season 2, checking page errors, horizontal overflow, dead ends, ? Help on every complex screen, and Coach Assist in each mode. This is an emulated browser, **not a real device**.

### 28.2 Bugs found and fixed (each with a regression test or walkthrough check)
1. **Duplicate monster names.** A walked free agent sitting in a region pool kept his name while a newer monster took it; signing him back gave the roster two monsters with one name (5 of 12 soak franchises by season 3). Names are now made unique wherever a monster joins (encounter, free agency, draft, trade), and older saves with duplicates are repaired on load.
2. **Tuesday result screen without a way on.** After signing or letting the encounter monster go, the result screen lost its *Continue* button (the week's prospects are cleared). It now names the monster from the battle snapshot and always offers *Continue*.
3. **Play-mode decision dead end.** Closing the swap-decision sheet left the battle paused with no way to reopen it. *Skip to results* now reopens the decision.
4. **Draft toast** read "X is a Beasts."; now "X joins the <club>."
5. **Friday dead end after a coordinator change.** Last week's plan could hold plays no longer in the playbook; the Friday screen counted them, *Save game plan* was refused, and the staff's auto-run left the week stuck on Friday. Friday now starts from the valid plays topped up from the coordinators' default.
6. **Full roster after a lost Tuesday battle** (found in the combined build, v35.0). The one pitch needs a release choice when the roster is full, but the screen only showed an error and offered no way on. It now asks who would leave if the pitch works, and the pitch panel also offers *Let them go*.

### 28.3 Findings left for the owner (resolved in §29, 2026-10-22)
- **Tuesday difficulty** rises with the roster (§26.1). If the owner wants Tuesday to stay near 80% for the automatic lineup, the least invasive option was opponent selection only (implemented in §29.1): give the chosen prospect's two companions a quality that follows the club's own top-three OVR (they are not signable), leaving the prospect, the rewards and every combat value untouched.
- **Board pressure on a hands-off owner:** in the soak, 7 of 12 staff-run franchises (with the trainer spending points) were dismissed within five seasons, some after winning records, because the safe goal follows the forecast. Players who manage the roster themselves are not affected by this measurement. Board rules were not changed in this milestone; the owner then authorized the revision in §29.

## 29. Tuesday difficulty and Board fairness (IMPLEMENTED 2026-10-22, owner authorization; branch `tuesday-board-balance`)

### 29.1 Tuesday wild companions
**Why encounters got too easy.** The wild side was the chosen prospect plus the other prospects scouted that week. Prospects are generated at a fixed quality (about 58 OVR in every season), while the club's automatic lineup averages about 72 in season 1 and climbs as monsters level, are drafted and are signed. The gap grew every season: the automatic lineup won 94% in season 1 and 98–100% from season 3 (tools/tuesday-study.mjs, original rule).

**Rule.** One encounter per Tuesday, 3v3. The chosen prospect leads, exactly as scouted. Two **wild companions** fight beside it:
- *Strength:* the wild group (prospect + companions) averages the club's **battle strength** minus `COMPANION_RULE.gap` (9 under the smart-swap battles of the morning of 2026-10-22; **4** since the fixed-order battles of §31.1, where the "never above the club" ceiling binds and the automatic lineup wins about 86%). Battle strength is the average overall of the club's automatic 3v3 lineup, healthy monsters only. Companions make up for a weak or strong prospect (a ±2 spread), but never fight above the club's battle strength and never below 50. Scaling follows the roster, so it follows franchise progression.
- *Fairness:* the chosen lineup never changes the companions; fielding weaker monsters cannot make the battle easier.
- *Identity:* companions are species from the scouted region, named "Wild <species>", marked *cannot sign*, never added to the roster, the pool or the Beast Dex.
- *Determinism:* companions come from their own seed (franchise seed, season, week, prospect), so the preview equals the battle and the franchise generator is not touched. Battles keep their lineup snapshots, so replays and older saves rebuild exactly; a Tuesday saved before the change simply meets companions under the new rule.
- Beast Clash values 1.1.0, recruitment rewards (win → offer, loss → one pitch), Play / Auto / Skip to Results and Skip Encounter are unchanged.

**Results** (validation run: 6 hands-off franchises × 5 seasons on every difficulty, every prospect each week, 2,888 battles under the revised rule; both rules on the same weeks and battle seeds; the gap was tuned on a separate set of franchises):

| Lineup | Original rule | Revised rule |
|---|---|---|
| Automatic | 96% | **83%** |
| Strongest three | 99% | 90% |
| Average three | 66% | 28% |
| Weakest three | 19% | 4% |

By season (automatic lineup, revised): season 1 83%, 2 81%, 3 86%, 4 82%, 5 84% (original rule: 89%, 94%, 96%, 99%, 100%). By difficulty: Rookie 92%, Pro 82%, All-Star 77% (two franchises each, so this split is noisy; the companions do not depend on difficulty). The lineup choice matters more than before: the three weakest monsters rarely win, which is the intended cost of fielding them.

### 29.2 Board expectations and dismissal
**Why owners with winning records were fired.**
1. *The forecast was absolute.* Each club's forecast was 0.5 + 0.025 × (team overall − 60). Real leagues run at 63–69 average overall (higher on All-Star), so the forecast overstated nearly every club: on average by about 1 win, and by 2.4 wins on All-Star.
2. *The safe goal added a win on top* for any club forecast at .550 or better. Owners committed to "safe" goals met them only 37% of the time.
3. *Dismissal ignored the margin.* Two net misses ended a franchise, whether the club went 1-8 or 6-3.
4. *The badge goal could be impossible.* It counted every gym on the schedule, including gyms whose badge the owner already held (a badge is won once).

On identical seasons, the original rules dismissed 25 of 36 hands-off owners within five seasons: Rookie 4/12, Pro 9/12, All-Star 12/12. Nine of them had a winning record in their last season.

**Rules (BOARD_RULES in `src/franchise/board.js`).**
- *Forecast:* 0.5 + 0.035 × (team overall − this season's league average overall), kept between .15 and .85. The slope is calibrated on simulated seasons (0.0365 measured). The awards' Coach of the Year expectations are unchanged.
- *Goals:* the safe goal is the rounded forecast (at least 2, at most 7 of 9). The medium goal is the playoffs for a club forecast at .450 or better. Below that it is **one** badge from a gym on the schedule whose badge the owner does not hold yet; with none left, the playoffs. The title is unchanged (+2).
- *Confidence:* a met goal gives +weight and lifts any deficit to 0 first; a miss is −1; the hot seat is −1 and dismissal −2, as before. Two changes:
  - A **narrow miss** on the hot seat is a **final warning**: the owner stays at −1. A narrow miss is within one win of a wins goal, or a season at or above the forecast for any goal.
  - **Three missed seasons in a row end a franchise however narrow the misses** (sustained underperformance).
- A Beast Bowl title still meets any goal.
- *Transparency:* the goal screen states the forecast "against this league" and the rules. Each verdict names the wins, the forecast and the reason. The goal history marks narrow misses.
- *Older saves:* the miss streak is rebuilt from the Board history; old history entries simply lack the new fields.

**Results.**
- *Replay* (tools/board-replay.mjs) on the same 180 simulated seasons (36 hands-off franchises × 5, safe goal every year):

  | | Original | Revised |
  |---|---|---|
  | Dismissed within five seasons | 25/36 (69%) | 7/36 (19%) |
  | Rookie / Pro / All-Star | 4/12 · 9/12 · 12/12 | 2/12 · 1/12 · 4/12 |
  | Safe goals met | 37% | 67% |
  | Average Board confidence | −0.04 | +0.97 |
  | Dismissed after a winning season | 9 | 1 (5-4, 5-4, 5-4 against forecasts of 6.0–6.3) |
  | Owners with two or more seasons at least two wins under forecast who were dismissed | 8/8 | 3/3 |

  Every revised dismissal was three missed seasons in a row. All seven had sustained records under their forecasts (for example 3-6, 3-6, 3-6 against 4.0).
- *Live* (the real Board deciding, same seeds as the first twelve franchises of the replay): 1 of 12 owners dismissed (All-Star: 4-5, 2-7, 3-6, 2-7). The original rules dismissed 8 of those 12 on the same seasons.
- *Goal choice still matters:* an owner who commits to the title every season is dismissed almost always under either rule; the playoffs/badge goal sits between the two.

**Unintended effects checked.** The Board only touches goals, confidence, the scouting bonus and the hot-seat story event, so the football, recruitment and draft are unaffected. More met goals mean more seasons with the scouting department's extra prospect. The forecast change does not alter awards or club strength.

## 30. Integrated Franchise Mode foundation (build v35.0, 2026-10-22)

Build **v35.0-franchise-foundation** combines Coach Assist 1.0 and the acceptance fixes (§27.3, §28; PR #33) with the Tuesday companions and the revised Board (§29; PR #34). Coach Assist explains both balancing changes in every mode (§27.3).

- **Franchise acceptance milestone (§27.2 Phase 1): complete in automated and emulated testing.** Six bugs were fixed (§28.2; the sixth found while integrating). Multi-season runs of the combined build: 12 franchises × 5 seasons (59 seasons played, all three difficulties) with 0 invariant violations, 0 dead ends and 0 save round-trip failures; 1 owner dismissed (Rookie: 8-1, 5-4, 5-4, 4-5, three straight seasons under a contender's forecast); Tuesday encounters the staff entered: 21 of 25 won. The emulated phone walkthrough passes in all three Coach Assist modes: new franchise → Season 2 at 390×844 (Guided), 360×640 (Expert) and 320×568 (Standard) with no page errors, no horizontal overflow and no dead ends; ? Help on every complex screen; no automatic tip in Expert.
- **Still required: real-device playtesting.** No testing on real phones has been done by the developer. Use the checklist in GRIDIRON_BEAST_TEST_PLAN.md §3, which covers the Tuesday companions and the Board.
- **Next roadmap step** (§27.8) waits for that playtest feedback. Monster history and partnerships (§27.4) have not been started.

## 31. Polish update: Beast Clash flow, statistics, presentation (2026-10-22, branch `polish-clash-stats`)

### 31.1 Beast Clash: one selection, one continuous battle
**What the owner saw.** In the Opening Clash a lineup menu, then a battle that stopped every few exchanges with a "keep or switch" menu, after which the battle "appeared to restart", about three times.

**Root cause.** The engine never restarted and the battle state was never reset: a Play battle was regenerated from the same seed with the recorded decisions and shared its log prefix exactly (tested). Two things produced the experience: (1) *Play* mode was designed to stop at **every voluntary-swap window** (the engine's `voluntaryEvery` = 4 exchanges), so a 12-exchange battle asked about three times; (2) after each answer the screen **destroyed and rebuilt the arena** at the decision index: the stage was drawn fresh at full health for a frame, then jumped to the decision, which on a phone reads as a restart.

**Rule now.** The battle has **one selection phase** (the monsters and their order of entry: *enters first*, *2nd in*, *last*; move up/down, remove, add from the healthy roster; the automatic lineup as the default; a ▲/▼ type-edge marker against their front monster; their team shown in its order) and then **one continuous battle**: both sides use the engine's fixed-order policy (no voluntary swaps), the next monster in line steps up when the front one is knocked out, HP and conditions persist, and the battle ends when one side has nobody left (or on health after 30 exchanges, as before). No menus interrupt it. *Watch battle* (Normal / Fast / Fastest) and *Skip to results* are the identical battle. Tuesday encounters, the pregame Clash (3v3) and the overtime Clash (3v3; 5v5 in the playoffs) all follow this flow; their rewards and consequences are unchanged (§26). One encounter per Tuesday is unchanged.

**Compatibility.** Records now store `policies`; records without the field (before this change) rebuild with the policies they were played with (`manual` + decisions for Play, `smart` otherwise), so saved battles, replays and hashes are untouched. A Play battle left mid-decision in an old save finishes as it would have in Auto. Settings and records saying `play`/`auto` read as `watch`. No schema change.

**Balance.** Fixed-order battles favour the stronger lineup more than smart-swap battles did (the AI's swaps had mattered more than the player's). On identical weeks and seeds the automatic lineup won 92% at the old companion gap; the gap is now 4, giving **86%** across seasons 1–4 (87 / 84 / 87 / 85), the strongest three 84%, an average trio 15%, the weakest 0%. The "companions never above the club's battle strength" rule binds, so 86% is the floor under that rule; lowering it further would need companions stronger than the club (an owner decision; not done). Beast Clash values 1.1.0 are untouched.

**Presentation.** Team names on the strips and the victory banner, a live matchup line (front vs front with the type edge), a standing count in the HUD, entry/knockout/damage/condition animations as before, a result panel (who won and how, standing and knocked-out sprites, knockouts by side, XP per battler) and a Watch / Speed / Skip control row. The Clash Lab keeps its step/scrubber controls.

### 31.2 Statistics
**Current season missing.** The monster card's Career tab listed only *archived* seasons in its year picker; the current season was reachable only through the separate Season tab, and the Playoffs tab showed only the current season's playoff line. In a new season that tab therefore said "no playoff games" while the Career view still showed a playoff row from the season before: the filters were tabs, not a grid.
**Playoff filter empty.** League leaders kept only the current season's tables (`f.history` never archived them); the Playoffs view in a new season rendered an empty list with no message.
**Now.** Two filters that work together everywhere: **Season** (This season / each past season / Career) × **Game type** (Regular season / Playoffs / Both), plus the game log on the monster card and league / conference / division scope on the leaders. *Both* adds the two books by player (no double counting); the career is the sum of the seasons. Every empty combination explains itself. Season tables are archived into the history at season end (the last `ARCHIVE_SEASONS` = 8 full tables; records, awards and leaders snapshots stay for every season). Leaders show ranks, highlight the leader and the player's own monsters, and format numbers consistently. Existing saves load unchanged; nothing is fabricated.

### 31.3 Presentation and feedback
- **Football:** play callouts weighted to the event (TOUCHDOWN!, INTERCEPTED!, FUMBLE!, SACK, FIRST DOWN, BIG PLAY +N, +N / −N yds, NO GAIN, INCOMPLETE, FIELD GOAL / NO GOOD, SAFETY, EXTRA POINT), coloured for yours vs theirs, with a one-time pop; the score pulses when it changes; a touchdown or turnover flashes the field; abilities that fired show as chips (yours gold). The final whistle opens with a result hero weighted to the occasion (narrow / dominant win, playoff win, Beast Bowl champions), then the box score, level-ups with the rating change, injuries, and XP with a progress bar for every starter. Play animation draws a midpoint between the sim's 10 frames a second (20 fps) and backs off on a slow device; the simulation itself is unchanged.
- **Pregame:** a matchup header (both clubs, records, team OVR, home/away, the occasion) above the dialogue and lineups.
- **Franchise:** HQ shows last week's result with its level-ups and injuries; the depth chart shows fatigue at 30%+ (red at 60%+); disabled buttons say why.
- **Everywhere:** screens slide in on navigation (never on a re-render), every tappable surface has press feedback, bars animate, sheets rise, section headers carry a rule, empty states look deliberate; reduced motion turns all of it off.

### 31.4 Performance
The football animation redraws only when the frame (or half-frame) changes and throttles the end-of-play hold to 30 fps; the arena cancels every live animation on destroy and removes its resize listener; document-level listeners are registered once. No architectural change.

### 31.5 Not changed
7-on-7, 16 clubs, positions, playbooks, staff, weekly schedule, scouting, progression, abilities, fatigue and injuries, playoffs, the season, Beast Clash combat values, save files and monster data. (The brief's references to 11-on-11 and promotion/relegation describe the legacy prototype; the active design is 7-on-7 with one league, §27.7.)


## 32. Type effectiveness in football and the Type Chart (IMPLEMENTED 2026-10-22, owner brief; branch `type-matchups`)

**32.0 Owner decisions (2026-10-22).** The brief listed two five- and six-type rings that disagree with the approved Beast Clash chart (values 1.1.0) in most pairs. The owner chose to **keep the game's chart** for both football and the Clash, so the Clash is unchanged. Dragon in football uses the chart's own edges **plus +2% against the types the chart lists as neutral**.

**32.1 The chart.** There is one table, `BEATS` in `src/data/type-chart.js`. The Beast Clash (`src/clash/types.js`, which re-exports it), football (`src/sim/type-matchups.js`) and the Type Chart screen all read it, so the screen cannot disagree with the game. Every type is strong against two types and weak against two. The other seven matchups, and a type against itself, are neutral.

| Type | Strong against | Weak against |
|---|---|---|
| Fire | Nature, Ice | Water, Earth |
| Water | Fire, Earth | Electric, Nature |
| Nature | Water, Light | Fire, Ice |
| Electric | Water, Metal | Earth, Dark |
| Earth | Electric, Fire | Water, Wind |
| Ice | Dragon, Nature | Fire, Metal |
| Wind | Dark, Earth | Dragon, Psychic |
| Psychic | Dragon, Wind | Light, Dark |
| Dark | Psychic, Electric | Light, Wind |
| Light | Dark, Psychic | Nature, Metal |
| Metal | Ice, Light | Electric, Dragon |
| Dragon | Metal, Wind | Ice, Psychic |

*Type Chart screen.* It opens as a sheet, so a live match is never left. There are three ways in:
- the **🔺 Type Chart** button on every monster card, which opens on that monster's type and also lists its strengths and weaknesses in a line;
- **More → Type Chart**;
- the **Type Chart** button in the on-field matchup panel.

The sheet shows a grid of the twelve types in their colours and glyphs; tap one to select it. Below the grid is the selected type's profile: **▲ Strong against** in green, **▼ Weak against** in amber, then the neutral types. Dragon also gets a note on the wildcard. After that come a short "In football / In Beast Clash" explanation and an "All matchups" table. All of it fits 320 px wide.

**32.2 Football calculations.** Each strength is its own number, separate from the Clash's ×1.05 / ×0.952 (`FOOTBALL_TYPE_VALUES` = `f1.0`):

| Edge | Football | Beast Clash |
|---|---|---|
| Strong | +4% to that monster's side of the contest | damage ×1.05 |
| Weak | −4% | damage ×0.952 |
| Neutral | 0 | ×1 |
| Dragon vs a type the chart lists as neutral | +2% for the Dragon; nothing for its opponent; never Dragon vs Dragon | ×1 |

A modifier applies only to a contest between two opposing monsters who are actually meeting. Each side scales its own score by its own edge against that opponent, inside the engine's existing formulas:

| Contest (engine) | Who | What is scaled |
|---|---|---|
| Block engagement, push and shed (`resolveEngagement`) | the blocker and the defender he is engaged with: OL vs DL, TE or RB vs any defender he blocks, pass pro vs rushers, run blocks, escorts | blocker score (blocking, strength, abilities) and defender score (strength, agility, tackling, abilities) |
| Open-field block (`tryEngage`, soft) | the blocker and the defender he reaches | the blocker's chance to make the block |
| Tackle (`tryTackle`) | the tackler making the attempt and the carrier | the rating part of the tackle score and of the carry score. Closing speed and the gang bonus are untouched, so helpers never add their own type. |
| Sack attempt (`trySack`) | the rusher who reaches the QB, and the QB | rusher tackling, QB agility |
| Route separation (`resolveArrival`) | the receiver and the defender **nearest the ball when it arrives** | the distance from which that defender can still contest the catch: shrunk by the receiver's edge, grown by the defender's |
| Contested catch (`resolveArrival`) | the same pair | receiver catching, defender coverage |

Not affected:
- unopposed throws, accuracy and arm;
- kicks, punts and returns as kicks;
- movement and speed;
- the QB's reads;
- interceptions, which are the defender against the ball;
- abilities;
- every rating and overall.

Nothing is written to a monster. The input lineups are checked to be unchanged after a play.

*Why separation is read at the catch point.* The first version scaled the coverage reaction timer. Measured on 2,000 forced throws, that timer moves in 0.05 s ticks and is not monotonic in Coverage (lower Coverage sometimes covered better), so a type edge there pushed completions the wrong way. The edge now acts where separation is decided: whether the defender at the ball is close enough to contest. This is a design choice. No values changed.

**32.3 Dynamic opponents.** There is no stored matchup. Each contest reads the pair at the moment of contact:
- the block uses whoever the blocker is engaged with now;
- the tackle uses whoever is trying it;
- the catch uses the defender actually nearest the ball, which may be a safety or a zone defender rather than the man who lined up on the receiver.

A new opponent means a new pair. Every edge that applied on a play is in the result's `typeContests`: the contest, the time, both slots, and both modifiers. The tests check each entry against the monsters' real types over 400 plays, every contest type is reached, and some contested catches are made by a defender other than the pre-snap man assignment. User and AI teams run through the same engine.

**32.4 On-field indicators.** Before the snap, the match screen asks `expectedMatchups` for each of the player's monsters. That function uses only what the player can see: **the player's own call** (or the base look when no play is picked yet) and **the other side's alignment**. It never reads the AI's call. It pairs:
- receivers with their man defender, or the nearest defender who can cover;
- blockers with the nearest front defender;
- the ball carrier with the nearest unblocked linebacker or safety.

Each monster appears at most once. Icons:
- A **green ▲** or **amber ▼** dot sits just above the inside shoulder, clear of the head, the ball and a straight stem.
- Nothing is drawn for a neutral matchup.
- Icons are drawn only for the player's own monsters, which keeps the field readable. The opponent's side is shown in the panel.

Tapping an icon opens a sheet with:
- the two monsters, their types and positions;
- **Type advantage / Type disadvantage / Dragon wildcard edge**;
- each affected contest with its modifier (e.g. *Route separation +4%, Contested catch +4%*);
- the reason (*Fire is strong against Nature.*);
- the opponent's side;
- the note that these are situational modifiers, not permanent stat increases, and that the edge only counts if the two actually meet.

The panel closes with ✕, *Got it* or a tap outside. The tap never skips, selects a play or snaps; the UI check compares the game state before and after. Icons stay up for the whole pre-snap. After the snap there are no icons and no popups. **Settings → Type matchup icons** turns them off (default on; an older save without the setting shows them).

**32.5 AI.** League and opponent coaches call plays through the same numbers:
- `matchupScore` is the rating gap first, plus each side's type modifier from the same `typeMod` the engine uses.
- On offense, the AI leans toward the play whose primary target or carrier wins his usual matchup (WR1 against CB1, the TE or RB against LB1, and so on).
- On defense, it leans toward man coverage when its defenders win their matchups, and toward zone when they lose them.
- The lean is capped at −15% / +20% of a play's weight. Down and distance, field position, the score and clock, the coach's style, Coach IQ and the repeat penalty still decide the call.
- Neither coach reads the other's call. The player's Coach's Suggestion uses the same lean.

**32.6 Balance (measured with `tools/type-balance.mjs`; no values changed).** The tables below compare three versions on the same AI-vs-AI games, with identical clubs and seeds (300 games each):
- *before*: the game before this section, with types off and no lean;
- *lean*: types off, the rating lean on;
- *types*: the shipped game.

| | before | lean | types |
|---|---|---|---|
| Points per team per game | 13.99 | 13.84 | 13.60 |
| Completion % | 60.3 | 60.1 | 60.0 |
| Interception % | 1.8 | 2.1 | 2.0 |
| Sack % of dropbacks | 1.4 | 1.6 | 1.5 |
| Yards per carry | 6.58 | 6.52 | 6.73 |
| Tackle success % | 78.3 | 78.5 | 78.6 |
| Higher-rated club wins | 79% | 79% | 75.4% |
| Average margin | 9.2 | 9.5 | 9.4 |

*Rating against type* (single plays, every monster on a side the same type, the extreme case):
- With equal ratings, a whole unit with the edge on every pair runs for 6.7 yd against 5.6 neutral and 5.1 unfavoured.
- **+6 rating points with every pair against them** runs for 6.7 against the lower-rated unit's 6.7 with every pair for it, so the two are about even.
- **+12 rating points** wins clearly: 8.9 against 6.7 on runs, 16.2 against 9.5 per pass.
- Passing shifts less: completion moves about ±0.8 points.

In real rosters types are mixed, so edges mostly cancel. The league table above shows no shift outside noise in completions, interceptions, sacks, rushing, tackling or scoring. Upsets rise slightly: the higher-rated club wins 75% instead of 79% (252 decisive games; inside about 1.5 standard errors).

*Dragon* (paired study, 400 games per row; the same clubs with every monster Dragon against the same opponents and seeds):

| Wildcard | All Dragon wins | Same clubs, natural types | Lift |
|---|---|---|---|
| +2% (shipped) | 53.5% | 50.7% | +2.8 pts |
| +1% | 50.2% | 50.2% | 0 |
| 0 | 48.8% | 50.5% | −1.7 pts |

Even a club of seven Dragons gains under 3 points of win rate, inside noise. Against a random opponent, Dragon's average net edge per contest is +1.2%; every other type's is about 0. Dragons are about 10% of league starters. **Decision: keep the owner's +2%.** If playtests show Dragon players dominating their pairings, +1% is the measured neutral point.

*Watch items for the owner:*
- the small rise in upsets;
- a whole unit favoured on every pair, compared with one unfavoured on every pair, is worth about 4 rating points on runs.

Both values live in `FOOTBALL_TYPE_VALUES`.

**32.7 Compatibility.**
- No save change: same key and schema. The only new setting, `typeIcons`, is additive and optional.
- No roster or type data changed.
- The Beast Clash chart and strengths are byte-for-byte the same in behaviour (a test compares all 144 pairs with the 1.1.0 table), and the Clash engine files are untouched apart from `types.js` importing the shared table.
- `src/sim` still never imports `src/clash` (the boundary test).
- Tests: `tests/type-matchups.test.js` (9 tests).
- Tools: `tools/type-balance.mjs` for balance, and `tools/type-ui-check.py` for the indicators, the panel and the chart at 390, 360 and 320 px in headless Chromium (emulated, not a real device).
