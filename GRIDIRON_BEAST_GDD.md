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

### 1b. Emergent Football Outcomes — Strategy Influences Probability, Never Guarantees Results (PERMANENT, owner directive 2026-10-27)

This principle governs every gameplay system, now and in every future change. Football results emerge from players' decisions, positions, attributes, abilities and the play's physics; no system decides a result in advance.

- **No fixed yards by matchup.** A play call against a defensive call never produces a set gain or loss.
- **No matchup yardage floors or caps.** Nothing clamps a run or a pass to a range because of who called what.
- **Long gains remain possible against the best defense; tackles for loss remain possible against a favorable offense.** A good call makes success more likely, never certain.
- **Attributes and abilities influence, never guarantee.** A higher rating or an ability shifts the odds over many plays; on any one play the lower-rated side can win.
- **No luck meter, forced upsets or scripted comebacks.** Nothing tracks "due" outcomes or steers a game toward a story.
- **Existing randomness is preserved.** Changes refine how players decide and move; they do not remove the variance that comes from contact, reads and execution.
- **Different seeds vary; identical seeds reproduce.** The same seed replays the same play exactly (developer traces included); different seeds give different plays.
- **Exceptional outcomes are never suppressed to hit statistics.** Calibration targets are diagnostics: a long run, a sack, a broken tackle or a perfect throw is never removed or capped to bring an average into a band.
- **No artificial yardage caps, and the game's rules stay the rules.** Results come from football events (tackles, forward progress, the sideline, the end zone, penalties as the rules define them), never from a limiter.

Fixing a gameplay problem means fixing the decision or the positioning that causes it (who reads what, who stands where, who moves when), never adjusting the final yardage.

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
* **19.6c Trading, second pass (PROPOSED, Task 5, awaiting owner review; see §54).** The pick-only desk above is unchanged and still works. A new **Trade desk** lets the owner trade monsters and picks both ways with any club, one valuation for every deal in the league, and incoming offers that come from the calling club's own roster. The "owner sees up to three offers" and "a starter is for sale only if a replacement within 6 OVR is ready" rules are kept.
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

### 27.0 Current roadmap register (2026-10-26; documentation reconciliation)

This register is the **current planning index** for Franchise Mode. The detailed specifications in §§25–27 and the implementation history in §§28–53 remain intact. Historical phase headings, old branch labels, old release snapshots and superseded next-step notes are not instructions to redo shipped work. Status here describes the repository documentation and must be checked against the live deployment before claiming a release. No new feature or implementation approval is granted by this register.

**Status vocabulary:** RELEASED = merged and explicitly documented as published to the main game; IMPLEMENTED = code or feature documented as built, with publication/verification not established; APPROVED = owner-approved roadmap scope not yet confirmed implemented; PROPOSED = candidate requiring owner decision; DEFERRED = intentionally outside current completion scope. Independently record validation gaps; passing automated tests is not real-device acceptance.

| Workstream | Current status | Evidence / authoritative detail | Outstanding action |
|---|---|---|---|
| Core 7v7 football, 16-club franchise, nine-game season, gym campaign, Beast Bowl | RELEASED (foundation) | §§1–23, 26, 30, 47 | Validate complete real-device season and edge cases |
| Beast Clash: Tuesday recruitment, pregame possession, overtime tiebreak | RELEASED (documented integration) | §§25–26, 28–31 | Real-device full-season acceptance; no new balance approval implied |
| Coach Assist: Guided, Standard, Expert | RELEASED (documented foundation) | §§27.3, 30 | Real-device usability acceptance |
| Type chart and football matchup effects | IMPLEMENTED (documented) | §32 | Confirm deployed version and real-device behavior |
| Stadium environments, replays, Beast Bowl ceremony, legendary plays pilot | IMPLEMENTED (documented) | §§33–37 | Confirm deployment and real-device presentation |
| Monster career timeline, full-screen profiles, accomplishments | RELEASED (documented) | §§38, 40–41, 48 | Confirm old-save and real-device navigation |
| Captain Partnerships (replaces original generic partnership proposal) | RELEASED | §49 | Long-term balance and clarity checks |
| Monster career injury history | IMPLEMENTED; release status requires reconciliation | §§50, 52 (earlier §50 says not released; later release history may supersede it) | Verify main-link deployment; update this row with evidence |
| Evolution presentation overhaul | RELEASED | §§51–52 | Verify real-device animation, audio and reduced motion |
| Three save slots, 20-season lifecycle, retirement and Hall of Fame | RELEASED | §§42–44, 47 | Full-lifecycle, recovery and migration validation |
| Persistent AI rosters, league-wide careers, AI–AI trades | RELEASED | §§45–47 | Multi-season balance and integrity validation |
| QB intelligence, AI testing lab, defensive AI corrections | IMPLEMENTED; release status requires reconciliation | §53 historical implementation entries; recent main commits | Verify latest merged release and deployment; do not rely on §53's original NOT MERGED heading |
| Broader owner trading: monster-for-monster, monster-plus-pick, incoming offers, Simple/Advanced | APPROVED | §27.5A | Define exact scope, implement and test; in-season trading remains conditional on rules |
| Smarter AI long-term management | APPROVED | §27.5B; existing AI improvements in §§45–46 | Benchmark existing AI first; implement only demonstrated gaps |
| Free-agency clarity and AI decisions | APPROVED | §27.5C; later owner-feedback work in §53 | Verify which improvements shipped; close remaining acceptance criteria |
| GM mobility, stadium management, mentorship, weather/expanded penalties, 32 clubs, separate Battle Room/Career Mode | DEFERRED | §§24, 27.6–27.7 | No implementation without separate approval |

**Next approved work:** Finish release-status reconciliation and existing acceptance evidence, then resume the uncompleted §27.5 trading/AI/free-agency roadmap in the owner's approved sequence. The 2026-10-25 pause and §53's branch-specific status were historical snapshots; they must not be used as a perpetual hold after later merges. Do not silently promote proposed monster-depth additions into approved work.

**Completion gate:** Franchise Mode cannot be marked feature-complete solely because individual features are coded. Require: (1) all approved completion-scope features implemented or explicitly re-scoped by owner; (2) multi-season football and monster progression, Clash, recruitment, trading, offseason and retirement tested together; (3) save migration, backup/restore and deterministic simulation verified; (4) real iOS/Android device walkthroughs and owner acceptance; (5) no critical gameplay, data-loss or progression blockers. The football/monster 50–50 depth assessment is a separate design review, not an approval to add features.

**Maintenance rule:** Every future feature PR updates this register in the same PR with status, evidence (PR/commit and GDD section), remaining validation and next action. Only mark RELEASED after main-link publication is confirmed. If a historical section conflicts with this register, treat its *status and sequencing* as historical; preserve its technical rules unless an explicit later owner decision supersedes them.

---

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

**B. Monster Partnerships — SUPERSEDED (2026-10-24) by the Captain Partnership System, §49 (implemented on branch `captain-partnerships`, v42.2.0).** The original automatic concept follows for the record. **(HIGH PRIORITY; lightweight automatic chemistry).** Teammates who repeatedly play together may develop a visible partnership (examples: QB–WR, QB–RB, compatible defensive pair). It develops passively through actual shared participation, not chores. Any benefit is **small, capped, transparent**, and must not outweigh a significant player-rating advantage or punish experimentation. No happiness upkeep, jealousy, mandatory friendship tasks, or complicated morale spreadsheet. Exact qualifying pairs, thresholds, bonus formula, reset/transfer behavior, and save migration are tunable specifications to approve before code.

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

**Roadmap resumed (owner, 2026-10-25)** after v42.4.1, with the QB Intelligence Overhaul (§53) as the next approved item. **Temporary priority change (owner, 2026-10-25).** The approved roadmap is paused, not changed: no item is removed or abandoned. Order: (1) finish the v42.2.1 release — done; (2) pause the roadmap; (3) Monster Career Injury History (§50) — done; (4) the owner's review and approval — approved and merged (PR #58), not released; (5) the Evolution Experience Overhaul (§51) — implemented, in review; (6) the owner's review and approval; (7) resume the previously approved roadmap where it paused. No unrelated feature starts in between.

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

## 33. Stadium environments (IMPLEMENTED 2026-10-22, owner brief; branch `stadiums-replays-legendary`)

**33.0 Audit.** Before this work the game had no stadium data: every field was the same grass. The football type system (§32) was already merged, so the field bonus is built into the same contest modifier rather than a second system. Of the eight gym clubs, four have an element the brief's environments cover (Ice, Electric, Earth, Metal), and each of those plays in its element's stadium. The other four (Water, Light, Dark, Dragon) keep classic grass, because the brief named no environment of their type. No club's name, colours, roster or schedule changed.

**33.1 Environments and clubs.**

| Environment | Type favoured | Look | Clubs (stadium) |
|---|---|---|---|
| Traditional Grass | none | the classic field, unchanged | Northstar Wolves (Northstar Park), Stonehaven Titans (Stonehaven Field), Eastport Phantoms (Gaslight Park), Harbor Sentinels (Sentinel Pier Field), Ashford Hawks (Ashford Commons), Sunfire Lions (Sunfire Coliseum) |
| Frozen Stadium | Ice | frost-glazed teal turf, ice-crack texture, snowbanks on the sidelines, snow drift in the end zones | Frostpeak Howlers (Howling Glacier Bowl), Glacier Guardians (Guardian Icefield) |
| Volcanic Stadium | Fire | dark scorched turf, glowing cracks, vents on the sidelines, a lava seam in the end zones | Ember City Beasts (The Ember Pit) |
| Forest Stadium | Nature | deep grass with leaf litter, tree crowns on the sidelines | Bayou Stalkers (Cypress Hollow), Palmetto Vipers (Palmetto Grove) |
| Storm Stadium | Electric | slate turf under a dark tint, rain streak texture, lightning rods, a bolt in the end zones | Stormport Bolts (The Bolt Yard), Thunder Mesa (Thunderhead Stadium) |
| Desert Stadium | Earth | packed-sand field with ripples, red rock on the sidelines | Canyon Crushers (Crusher Canyon), Sundown Drakes (Sundown Mesa Field) |
| Metallic Dome | Metal | synthetic turf with panel seams, light strips; **indoor** | Ironpeak Rams (Ironpeak Foundry Dome) |

Every turf keeps the white yard lines, hashes, numbers and end zones at the same field size (white on the darkest and lightest turfs measures at least 5:1). Decor is drawn under the players and the play art. Textures are SVG patterns: one shape per layer per frame, whatever the camera does. The renderer reads the venue; with no venue the field is byte-for-byte the old grass (tested). A dev page, `tools/stadium-gallery.html`, shows all seven.

**33.2 Field bonus.**
- A monster whose type matches the field's gets **+2%** on his side of the same direct contests type effectiveness uses (§32.2): blocks and sheds, open-field blocks, tackles and broken tackles, sack attempts, separation and contested catches.
- Both teams are eligible equally. There is no home-team bonus.
- Grass and unknown fields give nothing.
- The type edge and the field add together, with the positive total **capped at +6%** (`contestMod`; e.g. Fire vs Nature on the Volcanic field = 4 + 2 = 6). The cap never softens a negative edge.
- Nothing is stored on a monster. Ratings and overall never change.
- Each play's `typeContests` marks field-assisted contests with `env`.

Values live in `FOOTBALL_TYPE_VALUES` (`envMatch` 0.02, `positiveCap` 0.06; version f1.1).

*Balance* (`node tools/type-balance.mjs --only=env --games=300`). The same 300 games were played at real themed stadiums with the bonus off and on:

| | bonus off | bonus on |
|---|---|---|
| Points per team | 12.65 | 13.18 |
| Completion % | 60.6 | 60.4 |
| INT % | 1.9 | 1.9 |
| Sack % | 1.7 | 1.7 |
| Yards per carry | 6.35 | 6.42 |
| Tackle success % | 79.2 | 78.8 |
| Home wins | 49.0% | 47.7% |
| Higher-rated club wins | 79.8% | 74.9% |

The second test made a home club **all of the field's type** (the most a field can do for one side), on the same games:
- that stacked club won 48.3% of decisive games;
- with its natural types it won 47.7%;
- stacked again but with the bonus off, it won 49.0%.

So the bonus is a flavour, not a home-field edge. **No values changed.** Watch item: the higher-rated club's win rate moved by about 5 points, about 1.9 standard errors on 243 games. It is the same direction as the type study (§32.6). If playtests show too many upsets, lower `envMatch` to 0.01.

**33.3 Weather.**
- Each outdoor game draws weather from its environment's weights: Clear, Overcast, Rain, Snow, Wind, Thunderstorm. The dome is always Indoors.
- The draw is a hash of franchise, season, week and home club, never the game's dice, so the preview and the game always agree. Adding venues changed no game's outcome by itself.
- **Weather is visual only.** It is a CSS layer over the field (rain, snow, wind streaks, a thunderstorm tint with a rare soft flash), so it never redraws with the play. Reduced motion stills it, and indoor games never get it. No weather gameplay effect is enabled: passing, kicking and running would need their own study first.

**33.4 Where you see it.**
- The **venue card** appears on the pregame screen and on Thursday's scouting report. It shows the stadium name, the home club, the environment and its blurb, the expected weather, the bonus with the type that benefits, how many starters on each side benefit, and a note that weather is atmosphere only.
- **More → Stadiums** lists all 16 clubs' fields, the owner's own first.
- The live field takes the environment's turf and border colour.

*Stadium management later:* `stadiumFor(club, overrides)` reads an optional `f.stadiums` map ({club: {name, env}}), which nothing writes yet. A future stadium feature changes a club's field there, without touching this data.

## 34. Instant replays (IMPLEMENTED 2026-10-22; branch `stadiums-replays-legendary`)

**34.1 Recording.**
- The engine already records every play at 10 frames a second: every player's position, engagement and status mark, the ball and its holder, and the phase. It also records the play's events with timestamps: catches, tackles, sacks, takeaways, ability activations and outcomes.
- A replay draws **those frames**, with the same ability effects built from the same events. It never reruns the simulation, the rules or the game runner, so it cannot show a different catch, tackle or score.
- The buffer is **the one most recent eligible play**, kept in memory only (about 10–30 KB) and never saved.

**34.2 Triggers** (`src/ui/replay.js`, pure and tested):
- touchdowns, including defensive ones;
- interceptions, fumbles lost and other turnovers;
- safeties;
- game-winning and late go-ahead field goals;
- fourth-down conversions needing 3+ yards, or any in the fourth quarter;
- clutch plays: in the last two minutes of the fourth quarter or overtime, within one score, a 15+ yard gain or a sack;
- ability plays: a signature ability decides a 20+ yard play, a denied interception, a blink past the tackler or a flattening.

Routine plays, including long gains in the middle of a game, are never replayed. Measured over 12 AI games (52 plays each), about 7.6 plays per game qualify, counting both teams: touchdowns 3.6, ability plays 2.3, clutch plays 0.8, interceptions 0.5, fourth-down conversions 0.3, other turnovers 0.2. In Key Moments only the animated downs can replay, so the owner sees fewer. A first cut (any ability on a 12+ yard play) gave 4.9 ability replays a game and was tightened.

**34.3 Presentation.** The play finishes, its result and callout show, and the game saves. Then, 0.35 s later:
1. a gold wipe;
2. the **INSTANT REPLAY · TOUCHDOWN** badge (the reason);
3. the last 7.5 s at most, starting about 2.6 s before the decisive moment (the catch, pick, fumble, ability outcome or kick);
4. **slow motion at 40%** from 0.6 s before to 0.5 s after it, flagged SLOW-MO;
5. a 1.35× camera zoom that tracks the ball.

Kick replays follow the ball as the live kick did. When the replay ends, the screen returns exactly as it was. The touchdown flash and score pulse are not played a second time.

**34.4 Controls.**
- **Skip replay** (or tap the field) ends it at once.
- **Settings → Instant replays** is on by default.
- **📼 Replay** watches the last big play again: it is in the play controls between snaps and on the kickoff and try screens right after a touchdown. Auto mode waits for the replay and shows Skip replay too.

**34.5 Safety** (tested). With a replay running or skipped, the score, clock, quarter, play count, possession, down, ball spot, log and box score are unchanged (UI check, every run). The pure planner reads frames only, and the test plays a whole AI game to confirm it. The replay code calls nothing that steps the game or saves.

**34.6 Limits.**
- Plays that are never animated are never replayed: Key Moments' simulated downs, *Sim to final*, and every play with **reduced motion** on, where plays do not animate at all.
- After a reload the buffer is empty.
- Only field goals that win or take the lead late are replayed among kicks.

## 35. Beast Bowl championship ceremony (IMPLEMENTED 2026-10-22; branch `stadiums-replays-legendary`)

**35.1 Trigger.** Only when the owner's club wins the Beast Bowl (the playoff final), after the final-whistle sheet (and a gym handshake if the final was a badge game). Other playoff wins keep their normal postgame.

`finishSunday` has already saved the result, the title, the season's end, awards, the Legend Track offer and the Board's verdict. Skipping the ceremony therefore skips nothing that counts.

**35.2 Record.** `championshipRecord` is written into that season's `f.history` entry when the title is won (about 6 KB, no animation data). It holds:
- the final: opponent, score, OT, venue;
- the season record and the playoff record;
- the league awards the club's monsters won, empty if none (nothing is invented);
- the captain: the cornerstone if he started, else the best-rated starter;
- small snapshots of the **14 starters** (7 offense + 7 defense; the game is 7-on-7) and the rest of the healthy roster: name, species, type, position, slot, ability name.

**35.3 Scenes** (CSS animation on a few dozen elements, about 17 s):
1. **Final whistle.** The final score on a scoreboard, the BEAST BOWL CHAMPIONS banner, confetti, sweeping lights. The turf is the venue's colours.
2. **Team enters.** The bench files in behind; the starters step forward in two rows with their slot tags, using the real monsters' sprites.
3. **Ability showcase.** One starter every 0.52 s, never more than three effects at once. Each hops, and a burst in his element's colours and glyph rises, falls or spins with the element's style. A centred caption names him and his ability (or trait). It is visual only: no engine, no stats.
4. **Trophy.** The trophy rises, the captain lifts it, team-coloured and gold confetti falls, and the club name shows.
5. **Summary.** Club, season, final score and venue, season record, playoff record, Beast Bowl result, captain, league awards. Then **Replay ceremony** and **Continue**.

**Skip ▸▸** jumps to the summary at any moment. Reduced motion opens on the summary.

**35.4 Revisit.** Franchise History shows **🏆 Ceremony** on every title season. It replays the full ceremony and summary from the record. Developer Tools has a *preview* that builds the record on the fly and saves nothing.

## 36. Legendary Plays pilot (IMPLEMENTED 2026-10-22; branch `stadiums-replays-legendary`)

**36.0 Scope.** The game defines **12 Legendaries**, one per type, not 60. The pilot gives six of them a play, three offense and three defense. Each was chosen because its position, slot and existing signature ability give the play a real tactical identity. All six are existing species, and none was created for this.

| Legendary (type, position) | Play | Side | Why this monster |
|---|---|---|---|
| Aurodrax (Dragon, QB) | **Dragon's Gambit** | O | A rollout deep shot fits a Dragon wildcard. Sovereign Arm makes first-read throws un-interceptable, which pays off the aggressive deep read. |
| Tempestra (Wind, WR) | **Eye of the Storm** | O | Cyclone spins the defender on her hip at her first break, so a slant-and-go is built around that moment. |
| Titanolith (Earth, OL) | **Fault Line** | O | Landslide makes runs behind him fall forward. A counter that cuts behind his slot uses it; it is the only lineman Legendary. |
| Nyxshade (Dark, CB) | **Phantom Coverage** | D | Night Veil hides him from the quarterback, so a disguised rotation where he vanishes into the middle is the brief's Phantom Coverage. |
| Glacivern (Ice, S) | **Avalanche** | D | Whiteout freezes the first read; a disguised safety blitz arrives while the quarterback holds the ball. |
| Elderoot (Nature, LB) | **Rootbound** | D | Ancient Grove stops bites on fakes within 5 yards, so a run-stopping front packed inside his radius uses it. |

Not in the pilot: Pyroclast (TE), Tsunarok (S), Voltarch (QB; a second QB play), Aegistron (CB) and Astralux (RB). The six chosen cover six positions and six types.

**36.1 The plays.** Each is built from the playbook's existing assignments (routes, blocks, pulls, boots, man and zone keys, rushes and disguised alignments). Each carries a lesson saying when to call it, what to watch, what it beats and what beats it.

| Play | What it does | Strong against (measured) | Weak against (measured) |
|---|---|---|---|
| Dragon's Gambit | Run fake, QB boots right; the left receiver runs a deep **over** across the whole field, TE corner high, WR2 comeback | Bear Front 17.4, Cover 0 12.7, QB Spy 12.7 yd/play | DB Blitz −0.5, Corner Blitz 3.9, Cover 2 Zone 4.6 |
| Eye of the Storm | Trips left: Tempestra **sluggo** (slant-and-go), whip and dig underneath; five-step drop | All-Out Pressure 44.4, Run Wall 16.5, Max Drop 15.0 | Bear Front −6.9, Goal Line Stand −4.9, Goal Line Man −3.9 |
| Fault Line | Tight I: false step right, back cuts through the left B gap behind Titanolith at LG; RG pulls to kick out | Bear Front 23.4, All-Out Pressure 15.3, Cover 3 13.1 | Goal Line Stand 0.9, Safety Blitz 1.2, Run Wall 2.9 |
| Phantom Coverage | Nyxshade shows press at CB1, drops to the robber spot; FS rotates down to his man, SS to the deep middle | Bubble Screen 1.5, Quick Slants 2.1, Levels 2.2 yd allowed | PA Post 14.0, Three Verticals 11.3, PA Boot 10.7 |
| Avalanche | Glacivern shows robber at FS, blitzes the A gap; corners bail to deep halves, SS takes the right flat | Deep Post −4.9, PA Boot 0.4, Power Left 1.3 | Stretch Left 21.4, Levels 16.3, PA Shot 16.1 |
| Rootbound | Base: Elderoot at short middle, FS in the hook, LB2 man inside, corners man; everyone within his grove | Toss Sweep −0.5, QB Draw 0.0, Inside Zone 0.7 | Jet Sweep 28.1, Stretch Left 28.0, PA Boot 17.5 |

**36.2 Balance** (`node tools/legendary-balance.mjs --n=240`). Every play was run against every play on the other side, on the same snaps, with quality-62 lineups. It was compared with the same play with an ordinary monster of the same position in the slot, and with the standard plays of its kind.

| Play | yd/play (allowed for D) | success % | sack % | turnover % | Same play, ordinary monster | Standard plays of its kind |
|---|---|---|---|---|---|---|
| Dragon's Gambit | 8.73 | 48 | 3.9 | 2.5 | 8.89 · TO 3.1 | 8.47 · TO 0.8 |
| Eye of the Storm | 9.32 | 45 | 7.1 | 3.2 | 10.94 | 8.73 · sacks 3.6 |
| Fault Line | 8.10 | 75 | 0.3 | 0.5 | 6.68 | 6.47 · 59% |
| Phantom Coverage | 5.94 | 52 | 0.7 | 2.6 | 5.91 | 6.61 · 46% |
| Avalanche | 6.27 | 40 | 5.6 | 2.0 | 7.60 · sacks 0.8 | 5.80 · sacks 6.2 |
| Rootbound | 7.51 | 37 | 0.7 | 1.6 | 7.32 | 6.65 · 47% |

*Reading.* None is a dominant call, and each has clear counters. The deep shots (Gambit, Storm) are higher-variance than standard passes: more yards on a hit, more sacks and turnovers. Fault Line is the strongest, a short-yardage run with a high success rate, but a full box or a gap blitz stops it. The defenses each trade one area for another: Phantom gives up play action, Avalanche the middle and the outside run, Rootbound the outside.

The Legendary's own ability matters most for Fault Line (Landslide: +1.4 yd), Avalanche (Whiteout: the blitz arrives) and Gambit's turnovers. Eye of the Storm's "ordinary monster" row used a different WR with better ratings. On a paired check with identical ratings, Cyclone added about 1 yd/play.

*Changes made during balancing:*
- Eye of the Storm's route moved from out-and-up (12.2 yd/play, too strong) to the sluggo.
- Avalanche's safety moved from 11 to 7.2 yards deep (1.8% sacks to 5.6%).

**No ratings or abilities were changed.**

**36.3 Unlocking and eligibility** (`src/franchise/legendary.js`).
- A play is **discovered** the first time its Legendary is on the club's roster, however he arrived (Legend Track and scouting, the draft, a trade, free agency). It stays discovered forever.
- HQ shows **LEGENDARY PLAY DISCOVERED!** once, with *Open the game plan* or *Later*, and the news feed records it.
- The play is **available** only while that monster is on the roster, healthy, and able to play the play's slot.
- It uses **one of the normal six slots**. The coordinator's default plan never adds it, so the owner decides.
- If the monster leaves or is hurt, the play is taken out of this week's plan and the remembered plan, and the coordinator's pick fills the slot (with a news line). `playerTeam` also never hands an unavailable one to the game. When he returns it can be equipped again.
- When it is called, the Legendary **takes the play's slot for that snap**, swapping with whoever had it or coming off the bench (`pickSlots`). He always takes part.

**36.4 AI.**
- A club whose roster holds a pilot Legendary equips its play in place of the plan play most like it (same run or pass kind, most shared tags), unless he is hurt.
- Its coaches call it through the normal situational weights, with a ×1.25 lean.
- Gym clubs hold four of the six (Palmetto Vipers, Canyon Crushers, Eastport Phantoms, Frostpeak Howlers). Tested: equipped and called in a full game.

**36.5 Interface.**
- Gold Legendary cards in the game plan (selectable when available) and in the Playbook.
- Unavailable or locked cards show a lock and the reason when tapped. Undiscovered plays show "??? Legendary Play" with the Legendary needed.
- The detail sheet has the requirement, art, description, when and watch, strengths and weaknesses, and status.
- During a game the play card has the gold style.

**36.6 Adding the rest.** A new Legendary Play is a playbook entry with `legendary: { species, slot }` (in `LEGENDARY_OFFENSE` or `LEGENDARY_DEFENSE`) plus a `LESSONS` entry. Discovery, plan rules, placement, AI equipping, the cards and the tests read that data. The other six existing Legendaries, or new ones if the dex grows toward the brief's 60, need no new code.

*Testing aid:* Developer Tools → *Feature testing* can add any pilot Legendary to the roster (the franchise is marked `devAssisted`) and preview the ceremony.

## 37. Integration notes for §33–36

- **Preserved:**
  - 7-on-7 with 16 clubs and the six-play plans;
  - every attribute, OVR and ability;
  - Beast Clash (untouched);
  - staff, scouting, fatigue and injuries, playoffs;
  - the save key and schema.
- **Promotion and relegation are switched off in this build** (`TIERS_ENABLED = false`) and were not touched. Career Mode was not started.
- **New save fields, all optional:**
  - `f.legendaryPlays`;
  - `f.history[].championship`;
  - `f.game.state.venue`;
  - `f.settings.replays`;
  - `f.devAssisted` and `m.devGranted` (developer aid only);
  - `f.stadiums` (read, not written).

  Older saves load. A game saved before venues plays on with no field bonus.
- **Performance.**
  - Field textures are patterns, and themed fields add about 3 KB per drawn frame.
  - Weather is pure CSS.
  - Replays redraw at the play's own frame rate, and the zoom is a CSS transform.
  - The ceremony is CSS animation, with at most three ability bursts at once.
- **Tests:**
  - `tests/stadiums.test.js` (6), `tests/replay.test.js` (3), `tests/legendary-plays.test.js` (6);
  - `tools/feature-ui-check.py` (headless Chromium at 390, 360 and 320 px).

## 38. Monster Career Timeline (IMPLEMENTED 2026-10-22, Monster Identity and Attachment, Phase 1; branch `monster-career-timeline`)

**38.0 What it is.** Every monster card has a **Career Timeline**: the moments of that monster's football life, newest first, kept in the franchise save and attached to the monster's permanent id. It follows him through trades, releases and returns.

The timeline only reads the game. It never changes a stat, rating, XP, contract, award, Board verdict or result. This is tested: the same three-season franchise played with the timeline writers switched off is byte-for-byte identical, timeline data aside.

**38.1 Events and where they come from.** The timeline stores only what no other record keeps, as small keyed entries in `m.career.ev`. Club moves and draft details are read from what the game already records (`m.history`, `m.drafted`, `m.joined`).

| Group | Events | Source | Weight |
|---|---|---|---|
| Beginnings | Founding roster (cornerstones marked), Drafted (round and pick), Recruited after a Tuesday Beast Clash (region), Free-agent signing (pool region), Traded in (from which club), Returned to a former club, Developer addition (test aid) | logged when he joins | career |
| Team history | Released, Left as a free agent, Cut by the commissioner, Signed with another club from a pool | `m.history` (existing) | career |
| Development | Evolution (from → to); reaching level **10 / 20 / 30**; a season of **+7 OVR or more** | logged when it happens | notable |
| Firsts | First professional game (rookies only); first game for a new club; first touchdown; first touchdown pass (QBs); first interception; first sack. "First career …" only when his recorded career starts in his rookie season, otherwise "First … with the [club]" | after each game, from his game log | notable |
| Career milestones | passing yards 5,000/10,000/20,000; TD passes 25/50/100; rushing or receiving yards 1,500/3,000/6,000; touchdowns 10/25/50; sacks 10/20/40; interceptions 5/10/20; tackles 100/200/400 | crossed in a game | notable |
| Season marks (regular season) | 1,500 passing yards; 15 TD passes; 800 rushing; 600 receiving; 10 touchdowns; 4 sacks; 3 interceptions; 40 tackles | season end | notable |
| Big games | **Playoff performance** or **Beast Bowl star**; **Rivalry hero** (a win over the rival). Both need a big line: 3+ TD passes or 250+ passing yards, 2+ touchdowns, 100+ rushing or receiving yards, 2+ sacks, or an interception in the playoffs | after each game | notable |
| Postseason | First playoff game; Played in the Beast Bowl (lost); **Beast Bowl champion**. Counted in order: "His first title", "×2"; the earliest final appearance reads "First Beast Bowl appearance" | after each game; title-run members who played earlier rounds at season end | notable / **major** |
| Honours | **League awards** (MVP, OPOY, DPOY, OROY, DROY, Signature Monster; repeats counted ×2…), **League records** for one game or one season (from season 2 on), **Hall of Fame** (named on the owner's Hall of Fame card at retirement) | season end; the game's records book; retirement | **major** |

Thresholds were measured for 7-on-7 and nine-game seasons from simulated seasons:

| Stat | Season median | Season 90th percentile |
|---|---|---|
| Passing yards | 1,271 | 1,770 |
| Rushing yards | 234 | 933 |
| Receiving yards | 276 | 618 |
| Touchdowns | 3 | 9 |
| Sacks | 1 | 3 |
| Interceptions | 1 | 2 |
| Tackles | 12 | 38 |

Participation is required. Every game event reads the monster's own game log for that week: no entry, no event. The bench never gets a debut, a first or a title.

The records book keeps names, not ids. A record is credited only when the name, club, season, week (for game records) and the value all match the monster's own line, so a namesake can never inherit it. Records start counting from season 2, because in the first season every number is a "record".

Not tracked, because the game has no such systems:
- position changes (positions are fixed);
- monster retirement (only owners retire);
- a monster's history while on an AI club (AI rosters are rebuilt each season, so a monster traded away leaves the save).

**38.2 Engine of the timeline** (`src/franchise/career.js`).
- `noteJoin` is called by the founding roster, the draft, the Tuesday signing, free agency, trades and the developer aid.
- `careerAfterGame` runs in `finishSunday` after the stats are recorded.
- `noteEvolution` runs when the owner evolves a monster, or when an evolution is reported by a game.
- `careerSeasonEnd` runs in `endSeason` after awards and records are settled.
- `noteHallOfFame` runs at retirement.
- Every entry has a unique key (`first:td`, `mile:tdTotal:10`, `award:mvp:3`, `champ:3`…), so nothing is written twice, whether by weeks advancing, loading twice or a backfill.

**38.3 Saves.**
- **Persistence.** Events live in `m.career` on each monster: about 4 entries per monster after four seasons, about 19 KB per roster, **1.6% of the save**. The save key and schema are unchanged.
- **Older saves.** They are rebuilt **once** per monster (`backfillCareer`, flag `bf`) from what they prove:
  - from the archived season books: firsts and career milestones by season, season marks, playoff appearances, a rookie's debut;
  - from the franchise history: awards and titles (with playoff participation);
  - from the monster's stage: evolutions, shown under **"Before the timeline"** because the season is unknown;
  - cornerstones as founding members.

  Nothing whose season or club cannot be shown is invented. A veteran's unknown arrival gets no entry, though the Bio still shows his stints. A rebuilt "first" has a season but no week. Loading again adds nothing.

**38.4 The interface** (`src/ui/career-timeline.js`). A **Career Timeline** section sits on the monster card right under the Bio, before nature and ratings, and replaces nothing.
- **Header.** "Career Timeline", an **All / Highlights** filter, and a summary: *13 moments · 1 major · 2 seasons*.
- **Seasons.** Newest first. Each season has a separator (*SEASON 1202 · 5 moments*, with ★ when it holds a major moment) that sticks while scrolling. Entries his record can't date go under *Before the timeline*.
- **Order within a season.** Season-end honours on top, then weeks newest first, arrivals at the bottom.
- **Entries.** An icon, a title, a meta line (*Week 6* or the playoff round, *Conference finals* or *Beast Bowl*, plus the club in its colour) and one sentence.
- **Weight.**
  - Major: a gold card, glowing icon, a ★ and a single light sweep when first shown.
  - Notable: a blue node and accented card.
  - Career moves: compact and quiet.
- **Fold.** The first 6 entries show; **Show the whole career (N more)** unfolds in place, and *Show less* folds it back. The filter and the fold redraw only this section and keep it where your thumb left it. There is no new screen and no popup.
- **Empty state.** *"[Name]'s story starts here."* with what will appear, worded for the All and Highlights filters.

**38.5 Polish pass** (from a phone player's view):
- the visual hierarchy, the season separators and the club colours;
- the reveal (cards fade up in a short stagger) and the major entries' one-time shine and star pop, all switched off by reduced motion;
- touch feedback on the filter and fold (≥ 32 px chips, 44 px fold button);
- the empty states;
- the scroll-anchored redraw (the first version jumped to the top of the card when filtering; fixed);
- counted honours (first title, ×2 MVP, first Beast Bowl appearance);
- plain-English descriptions that say when a "first" or milestone only counts games with the club;
- level marks cut from every 5 to 10/20/30, and growth raised from +5 to +7, because the first draft gave a third of the roster a growth entry every season (*keep it meaningful*).

**38.6 Verified.**
- `tests/career-timeline.test.js` (10 tests).
- `tools/career-study.mjs`: 6 franchises × 4 seasons (24 seasons, 228 monsters), 976 stored events, 59% of monsters with at least one highlight, 76 major moments, 0 duplicates or out-of-season events, and every timeline identical after save and load.
- The soak's invariants now also check timelines.
- `tools/career-ui-check.py` in headless Chromium: the section is under the Bio, the fold and the filter work without a full redraw and without moving the section, the empty state shows, touch targets are adequate, and there is no overflow and no page errors.

**38.7 Later: Career Presentation phase** (Phase 2 is built: §40; the remaining ideas are in §40.9):
- a career summary header (seasons, clubs, career line, honours count) and a shareable "career card";
- timelines for pool and draft monsters in their scouting sheets (the data already follows them);
- tapping an event to open that game's box score or that season's awards;
- news items that link to the timeline;
- a team-wide "franchise moments" view built from the same events;
- retired-monster legends once monster retirement exists;
- Monster Partnerships (explicitly out of scope here);
- a Coach Assist tip for the timeline on the monster card.

## 39. League News, the defensive suggestion, the Clash lineup (IMPLEMENTED 2026-10-22, playtest feedback; branch `league-news-fixes`, v38.1)

Three items from the owner's playtest of v38.0.

**39.1 League News.** The HQ News list was the owner's inbox: level-ups, trainer notes and recovery days, plus one line about the rival's score. It is now **League News**, the league's week:
- **Scoreboard.** Every game of every week, eight tiles. Each tile shows away over home with the winner bold. Your game is outlined gold, the rival's red, and overtime and Beast Clash finishes are tagged.
- **Headlines.** Six a week at most, most important first, one per club:
  - league records broken, with the mark they beat;
  - change of award-race leader (MVP, OPOY, DPOY);
  - upsets (a win-rate gap of .300 or more, both clubs 4+ games in);
  - perfect starts at 4, 6 and 8 wins, the first loss of a 4-0 or better club, and an unbeaten regular season;
  - win and losing streaks at 4, 6 and 8;
  - overtime and Beast Clash finishes;
  - shutouts;
  - blowouts (21+, about the league's 95th percentile).
- **Award races.** From week 3: the leader and second place for every award (the HQ card shows MVP, OPOY and DPOY).
- **Award winners.** When the playoffs are drawn.
- **Playoffs.** The playoff field, each round's scoreboard and who advanced, and the champion.
- **Season records.** At the end of the season.

**Rules:**
- League records count only once a full season is in the book, because week-1 "records" are not news. The records book now keeps the previous holder (`prev`) when a record falls, once per week.
- A league-wide bye week writes nothing.

**Where it lives:**
- On HQ, the latest week is shown: up to four headlines, the scoreboard and the top three races. **All league news** opens every week kept.
- The owner's own notices (signings, trades, injuries, evolutions, the commissioner, your own result) are in **Club notes**, folded under the panel.
- Level-ups are no longer written to either feed. They are shown after the game and on the Career Timeline (§38). Old level-up and "Rival watch" lines are removed from saves on load.

**Read-only.** League News is written after every game of the week is in the books (`writeLeagueNews` in `advanceWeek` and `advancePlayoffs`). It draws no random numbers and changes nothing the simulation reads.

**Save:**
- `f.leagueNews` (items) and `f.leagueNewsMeta` (last award leaders) are additive fields; the schema is still 6.
- The feed holds this season and the last. Last season keeps its headlines but drops its scoreboards, and only the newest award-race snapshot is kept per season.
- An older save is backfilled once with the current season's scoreboards and results headlines, rebuilt from its results (no races or records, because those need the week they happened).

**39.2 The defensive Coach's Suggestion.**
- **Cause:** on defense the coach's repeat penalty (a call made recently is weighted down) read the *offense's* list of defensive calls, never the defending club's own. The suggestion is the highest-weighted play, so it stayed on one play down after down, and AI defenses never felt the penalty either.
- **Fix:** `weighDefense`, `chooseDefensePlay` and `suggestPlay` take the defending club's own history. One recent repeat halves a call's weight, two quarter it, as for offense, so the suggestion now rotates. The AI's defensive calls vary a little more for the same reason.

**39.3 The Beast Clash lineup.**
- **Cause:** removing the last monster from a Clash lineup refilled it with the automatic lineup, and a lineup edited for one battle carried into the next.
- **Fix:** the automatic lineup is only the starting proposal, or what **Auto lineup** asks for. Removals stick, down to an empty lineup, and the Enter buttons wait for at least one monster. A short lineup says the battle shrinks to match (3 picked of 5: a 3v3). A different battle starts from its own proposal.

**39.4 Verified.**
- `tests/league-news.test.js` (7 tests): the defensive rotation, headlines and caps, streak marks, playoffs and races, the records book's previous holder, the feed's trimming, and the backfill.
- `tools/league-news-study.mjs`, 3 franchises × 3 seasons:
  - every current-season week has an 8-game scoreboard with at most one game marked as yours;
  - about 2.9 headlines a week, never over the cap;
  - no duplicate ids and no broken text;
  - every record line names the old mark;
  - the save round-trip keeps the feed;
  - no level-up lines;
  - the feed is about 3.7% of the save (38 KB).
- `tools/news-ui-check.py` in headless Chromium at 390 and 320 px:
  - the panel, scoreboard, races and folded club notes render;
  - the full sheet opens;
  - removing every Clash monster leaves the lineup empty with Enter disabled, adding one gives one, and Auto lineup refills;
  - no page errors, no horizontal overflow.

  This is an emulated browser, not a real device.


## 40. Monster Career Presentation, Phase 2 (IMPLEMENTED 2026-10-22, Monster Identity and Attachment; branch `career-presentation`, v39.0)

Phase 1 (§38) records a career; Phase 2 presents it. This is a presentation and accessibility layer, not a gameplay system:
- nothing here changes football, the Beast Clash, progression, contracts, the Board or balance;
- nothing grants XP, attributes, currency or rewards;
- nothing new is simulated.

**One source of truth.** `src/franchise/career-profile.js` derives every career view from records the game already keeps:
- `m.stats`: season books, career totals and the current season's game log;
- `m.career`: the Phase 1 timeline, its events and keys unchanged;
- `m.history` and `m.drafted`: club moves;
- `f.history`: awards, schedules and championship records;
- the records book;
- the league tables, for other clubs' players.

Nothing is stored twice. `src/ui/career-ui.js` renders it in one place, used by the monster card and by every career sheet.

**40.1 Career summary header.** It sits at the top of the Career Timeline section and shows:
- the sprite, name, species form, type and position;
- the current or most recent club, in its colour;
- seasons (or "Rookie season"), level and overall;
- honour chips (titles, awards, records, Hall of Fame);
- four position-relevant statistics, from the game's own keys:

| Position | Statistics |
|---|---|
| QB | pass yards, pass TD, INT thrown, completion % |
| RB | rush yards, rush TD, yards per carry, receiving yards |
| WR | catches, receiving yards, receiving TD, yards per catch |
| TE | catches, receiving yards, receiving TD, blocks won % |
| OL | starts, blocks won %, sacks allowed, pass blocks |
| DL | tackles, sacks, tackles for loss, pressures |
| LB | tackles, sacks, interceptions, tackles for loss |
| CB | interceptions, passes defended, tackles, completion % allowed |
| S | tackles, interceptions, passes defended, forced fumbles |
| K | field goals, FG %, longest FG, points |

**Behaviour:**
- **Career and This season** switch the four statistics.
- A rate without enough volume shows a dash, never a misleading 100%.
- The clubs represented appear in order, with their seasons.
- A note appears when career totals cannot include seasons played before this franchise kept the monster's stats.
- Rookies and monsters without games say so in plain words; a veteran free agent with no games on record is not called a rookie.

**40.2 Trophy case.** The case shows tiles for Hall of Fame, Beast Bowl Champion, MVP, OPOY, DPOY, SMOY, OROY, DROY and league records, most prestigious first. Each tile has:
- the honour's icon and name;
- the seasons it was won;
- a ×N count for repeats;
- gold for titles and the major awards, silver for the rest, marble for the Hall of Fame.

**How it works:**
- Tapping a tile lists every season it was won; each entry opens its detail (the final, the award sheet, the record).
- Honours come from the timeline's events plus the franchise's award history, matched by id and deduplicated by key.
- The tiles reveal in a short stagger (off with reduced motion).
- The empty state says what will be kept there.
- Purely historical recognition: it grants nothing.

**40.3 Interactive timeline.** Phase 1's structure is unchanged: seasons, the All/Highlights filter and the fold. What is new:
- **Links.** An event with a verified record behind it is a button with a › mark:

| Event | What it opens |
|---|---|
| Beast Bowl title | The final (opponent, score, venue), the season and playoff records, his part (starter at a slot, on the title roster, or played in the final), his playoff line, and the ceremony again |
| League award | The award, season, club and record, the award sheet's reason, and his season line |
| League record | The value and the game, whether it still stands or who broke it since (and with what), and whose mark he broke |
| Evolution | Both stages' sprites, from the species' own chain, and the season, or "before the timeline began" |
| Game moment (debut, firsts, playoff and rivalry performances, milestones, Beast Bowl appearances) | The game: from the current season's game log (his line), or from that season's schedule (the club's result, labelled as such) |

- **No link without a record.** An event with nothing behind it (season marks, level marks, growth, club moves, game moments from seasons whose result is gone) stays a plain card.
- **Navigation.** Details open in a sheet over the card. Closing returns to the same place, filter and fold (the section never re-renders the screen).

**40.4 Shareable career cards.** Real PNG files, drawn on a canvas from the game's own 16×16 sprites (`spritePixels`, the same grid and tint as on screen). There is no network, account or image service.

**Layouts:**
- **Portrait**, 1080×1350: the monster large, then name, identity, club band, seasons, honour pills and three statistics.
- **Square**, 1080×1080: the monster on the left and the identity on the right, with the statistics underneath.

**Both layouts carry:**
- the Gridiron Beast wordmark;
- the club's colour;
- the type's glow behind the sprite;
- a tier ribbon.

**Tiers** (presentation only): Rookie, Established, Veteran, Decorated, Champion, Dynasty (2+ titles: a double frame and stars) and Hall of Famer (laurels).

**Text and statistics:**
- Every text is fitted to its box.
- Long names wrap to two lines in the square layout.
- A card before a first game shows level, overall and seasons instead of empty statistics.

**Sharing:**
- **Share** uses the system share sheet where the device offers file sharing.
- **Save image** downloads `name-career-layout.png`.
- A toast confirms either.
- Object URLs are released when the layout changes or the sheet closes, and the canvas is emptied after encoding.
- Drawing a card never touches the franchise.

**40.5 Career links across the game.** A career opens by stable id from anywhere. One listener (`data-career`) opens a sheet over the current screen, so closing it returns to the same screen and scroll position. Two monsters with the same name never open each other's career.

| Where | What opens |
|---|---|
| Roster | A 🏆 chip on rows of decorated monsters; **🏆 Career** on the monster card jumps to the section. Back from a monster card restores the roster's scroll position (the router now remembers each screen's position on the way back). |
| Free agency | The free-agent sheet shows a career block (summary and honours) and **Full career ›**. A pool monster's history carries over from his clubs. |
| Draft | The prospect sheet says plainly that a prospect has no professional career yet; drafted players (yours and other clubs') link to their careers from the draft room. No professional accomplishments are shown for a prospect. |
| League awards | Award history, the season's award sheets, the award races, league leaders and club leaders link the winners. |
| News | League News award, record and race-lead lines link the monster they name; the award races link both leaders. Club notes that name a monster (evolutions, injuries, signings, trades, draft picks) link him. |
| Records book | Holders link when the record carries an id (records set from v39.0 on). |
| Hall of Fame | A retirement now writes a compact career snapshot (about 1–2.5 KB) for each best monster on the card. The card's monsters open their summary, trophy case and highlights as they stood. Cards written before v39.0 say careers were not kept. |

**Scouting is respected.** A free agent's overall follows his scout report, and a prospect's follows the draft report: hidden ratings stay hidden in career views. Statistics and honours are public records.

**Other clubs' players.** The league keeps their season lines, not a career. Their sheet is a "league profile": the seasons on record from the archived tables (8 seasons) and their league awards. It has no timeline, and it does not invent history.

**40.6 Historical data limitations** (nothing is fabricated):
- Only the current season's game lines are kept. A game from an earlier season shows the club's result from the schedule, labelled.
- A championship's full final is kept only for titles won since the ceremony record (§35). Otherwise the detail shows what the timeline event recorded.
- Career totals count seasons with this franchise's records. Earlier pro seasons are acknowledged, not estimated.
- Records set before v39.0 carry a name but no id. They show, but do not link, and the Phase 1 record events keep matching by name for them. Records with an id now match by id, so a namesake never gets another monster's record.
- AI clubs' rosters are generated each season. Another club's player is known for the seasons his line is in the tables.

**40.7 Save compatibility.**
- The save key and schema 6 are unchanged.
- No new franchise field was needed for the presentation itself; it is derived.
- **Small additive fields:**
  - `id` on new records-book entries;
  - `mid`/`mname` on new League News and club-note items that name a monster;
  - `careers` on new Hall of Fame cards (stored outside the franchise).
- **Phase 1 is untouched:** event keys and the timeline are unchanged, with no duplicates and no backfill changes.
- Older saves load and show everything their records prove.

**40.8 Polish pass** (from a phone player's view):
- the summary's hierarchy and club colours;
- a gentle sprite bob;
- gold, silver and marble trophy treatments with a staggered reveal;
- › marks and 44 px touch targets on linked events;
- detail sheets with a hero line and plain facts;
- the species line dropped when the name already is the species;
- unique seasons on trophy tiles;
- "Rookie season" only for a current rookie;
- the card's footer saying "Awaiting his first game" instead of repeating level and overall;
- scroll memory on Back;
- the roster honours chip;
- id-based record matching;
- scouting-aware career views.

Every animation stops with reduced motion, from Settings or the system setting.

**40.9 Later** (recommendations, not built):
- tapping a season header for that season's full line;
- a career comparison of two monsters;
- persistent AI rosters, which would allow league-wide careers and AI career cards;
- the franchise Moments Museum;
- retirement and legends;
- Monster Partnerships (not started: it needs the owner's authorisation);
- video or animated cards.

**40.10 Verified.**
- `tests/career-presentation.test.js` (10 tests): summary totals and position focus, rookies, older saves and several clubs, trophy counts and history agreement, links only where a record exists, record details (standing, broken, namesakes by id), career links by id (pool, league, prospect, drafted), scouting visibility, the real franchise (titles and awards match the history, every link opens, reading changes nothing, the save round-trip), card content and tiers, and the Hall of Fame snapshot.
- `tools/career-presentation-study.mjs`, 4 franchises × 4 seasons: 150 monsters, 34 honours and 202 linked events, every one opening its record; 0.14 ms per profile; the largest Hall of Fame snapshot is 2.5 KB; 0 problems.
- **Franchise progression is unchanged.** The `--fingerprint` run on `main` and on this branch (4 franchises × 3 seasons) produced identical records, champions, award winners and roster levels.
- `npm test`: 357 passing. `tools/franchise-soak.mjs`, 8 × 4 (29 seasons): 0 problems.
- `tools/career-presentation-check.py` in headless Chromium at 320, 360, 390 and 412 px:
  - the summary, trophies and timeline on the card;
  - details that open and close without moving the card or losing the filter;
  - trophy shelves;
  - both card layouts in the sheet and a saved PNG file;
  - exported PNGs for rookie, real, veteran, dynasty (long name) and Hall of Fame careers, checked for size and clipped text;
  - links from League News, award history, league leaders, the records book, the free-agent sheet, the draft room and the Hall of Fame;
  - namesakes;
  - Back restoring the roster's scroll position;
  - no page errors and no horizontal overflow.

  This is an emulated browser, not a real device.

## 41. Career history completion and Career Presentation corrections (IMPLEMENTED 2026-10-23; branch `career-presentation`, PR #42, v39.1)

**41.1 Archived game lines.**
- **What is kept.** When a season closes (`rolloverMonster`), each monster's game log is packed into that season's book as `b.g`.
- **Format.** One entry per game: `[week, opponent abbreviation, flags (1 home · 2 won · 4 playoff), score, line]`.
  - The line keeps only the box-score keys (`GAME_KEYS`: passing, rushing, receiving, defence, coverage, blocking, kicking, ability plays), under 2-letter aliases.
  - Snap counts, first downs, ability bookkeeping and other detail stay in the season totals only.
  - No play-by-play is kept.
- **Identity.** The permanent id is the monster's own. The season is the book's year and the team is the book's team. The playoff round comes from the week (11–13).
- **Consistency.** The games of an archived season add up exactly to its book, for every kept key and in both buckets (tested on every archived season in the studies). Career totals and records are unchanged: they still come from the season books.
- **What it opens.**
  - Career Timeline game moments from past seasons (debuts, firsts, playoff and Beast Bowl performances, rivalry games, milestones) open his own line.
  - Season marks, growth entries and season headers open a season sheet: regular-season totals, playoffs apart, and game by game.
- **Older saves.** Seasons closed before v39.1 keep totals only. Their game moments show the club's result, worded as such. Nothing is reconstructed.
- **Cost.** About 50 bytes per game. Measured on hands-off franchises (two seeds, identical within 1%):

| Seasons | Save | Archived game lines | Share of save |
|---|---|---|---|
| 5 | 1.45–1.49 MB | 40 KB | 2.7% |
| 10 | 2.2 MB | 86 KB | 3.9% |
| 20 | 2.9 MB | 170 KB | 5.9% |

**41.2 Older records linked by evidence.** Records set from v39.0 carry the holder's id. Older entries (name, club, season, week, value) link only when the evidence leaves exactly one candidate (`resolveRecordHolder`).
- **Candidates are:**
  - monsters the save keeps whose book for that season is with that club and whose numbers fit (the archived game's line equals the value, else the season total can hold it; for a season record, the regular-season total equals it);
  - league-table rows of that season and club with that name and fitting numbers.
- **The result.** Two candidates (namesakes on one club in one season) or none: unlinked. An accomplishment is never assigned by name alone.
- **Where it applies.** The records book, and record details ("still the league record" checks the resolved holder).

**41.3 Hall of Fame cards written before careers were kept.**
- **The source.** The franchise save is cleared at retirement, so the card is the only record left.
- **What the monster opens.** Each monster on an older card opens a clearly labelled partial history (`legacyHofProfile`):
  - his name and species form (read from the species chain), position, rating and level at retirement;
  - the card itself as his one honour.
- **The club's context.** The club's seasons, record and Beast Bowl years under that owner are shown as the club's. The card does not record which games he played, and it says so.
- **Not invented:** no awards, titles, statistics or earlier clubs.
- **Existing cards and honours are unchanged.**

**41.4 Career vs This Season (verified and corrected).**
- **The definition.** The game's statistics screens, award models and records book count a career as regular-season games, with the playoffs kept apart.
- **What was wrong.** The v39.0 summary added playoff games into both views.
- **The fix.** Both views now show regular-season totals. The games figure always matches the scope (33 career games, 6 this season). A separate line gives playoff games and numbers, for the career or for this season. The career card's numbers carry the same caption ("Career · regular season · N games").
- **Rates.** Every rate is derived from summed totals, never averaged across seasons: a test checks 165/230 = 71.7% rather than the 60.6% average. Below a volume floor a rate shows a dash.
- **Bug found and fixed:** completion % allowed (corners) was shown without its % sign.
- **Scenarios tested:**
  1. a rookie mid-season;
  2. a veteran with three completed seasons;
  3. a traded-in monster;
  4. a free agent;
  5. incomplete records;
  6. no games;
  7. percentage positions (QB, CB, K);
  8. postseason appearances;
  9. every monster of a real three-season franchise against its books.

**41.5 Navigation and scroll restoration (verified and corrected).** Ten scenarios run in headless Chromium at 320, 360, 390 and 412 px (`tools/navigation-check.py`):

| # | Scenario |
|---|---|
| 1 | Roster → card → Back |
| 2 | Card → timeline detail → Close |
| 3 | League News → career → card → Back |
| 4 | Awards → career → card → Back |
| 5 | Free agency → career → close |
| 6 | Draft room → career → close |
| 7 | More → menu screen → Back |
| 8 | Tabs after scrolling |
| 9 | Modal sheets |
| 10 | Navigation after a weekly action |

**Fixed in the shared layers:**
- **Router.** A pending scroll restore is now consumed by the very next render only, so a render that ended early can never carry an old position into an unrelated screen. Tabs and reset flows start at the top. Back restores the previous screen once.
- **Sheets.** While any sheet is open, the page behind it is locked: a drag or wheel on the dimmed backdrop used to scroll the screen underneath. Scrolling inside a sheet never chains into the page. A body observer keeps the lock in step with the sheets actually present, however they close.
- **Sticky headers.** The timeline's season headers stuck at the very top of the window, under the 48 px top bar; they now stop below it (inside sheets, at the sheet's top). Jump targets (🏆 Career, Show the whole career) land below the top bar, and the last block of a screen clears the tab bar.

**Intentional behaviour kept:** a re-render of the same screen keeps its position, a new screen opens at the top, and the roster's Lineup/Depth view is kept.

**41.6 Save Image: what the page can and cannot know.**
- **What the page can confirm:**
  - the PNG was drawn;
  - the share sheet completed (`navigator.share` resolves);
  - the clipboard accepted the image (`clipboard.write` resolves).
- **What it cannot confirm:** that a download arrived. A browser may ask first, save silently, or (in a sandboxed preview such as an embedded artifact, which reports "File downloads aren't available") refuse without telling the page.
- **The v39.0 problem.** The game said "Saved" either way.

**Now:**
- **Download image** says "Download requested: name.png. Check your downloads."
- When the game runs embedded, it says the preview may block downloads and how to save the card instead: press and hold (or right-click) the card, or open the game in its own tab.
- **Copy image** (where the clipboard API exists) reports a copy only when the clipboard accepted it.
- **Share…** uses the system share sheet where the device can share files.
- A status line under the preview repeats the outcome for screen readers.
- "Saved" is never claimed.

**Verified** (`tools/card-export-check.py`):
- **A normal page.** Both layouts arrive as real PNG files (1080×1350 and 1080×1080), the wording is "Download requested", and the copied clipboard holds `image/png`.
- **A sandboxed iframe without allow-downloads.** No file arrives, the wording says so, and Copy says it is blocked.

**41.7 Polish.**
- **Season headers** on the timeline open the season sheet.
- **Season sheets** list every game with opponent, result and his line, playoff games outlined.
- **Inline career links** in News and the award races have a 32 px tap target without moving the text, plus an active state and a keyboard focus ring; the older News check flagged them at 16 px.
- **The career card** labels its three numbers.
- **The export status** is announced to screen readers.

**41.8 Remaining limitations.**
- Seasons closed before v39.1 keep totals, not game lines.
- Hall of Fame cards written before v39.0 keep only what the card recorded.
- Records set before v39.0 link only when the evidence is unique.
- Another club's players are known from the league tables until persistent AI rosters exist (§42).
- **The save keeps growing:** about 2.9 MB at 20 seasons. Archived game lines are only 6% of it. Where the rest goes, measured at season 20 (seed 1):

| Part of the save | Size | Growth |
|---|---|---|
| Archived league tables | 1.08 MB | Capped at 8 seasons |
| `draftResults` | 599 KB | Every AI draftee ever drafted, about +30 KB per season; the game only reads the last three classes |
| Award sheets in the history | 449 KB | Finalists with full stat lines, about +22 KB per season |
| Roster | 388 KB | Stats 330 KB, career events 38 KB |
| Current season | 214 KB | |

- **Not changed here.** Pruning `draftResults` older than three classes, and slimming award finalists to the fields the award sheets show, are save-hygiene changes outside this brief. They are now Phase 1 of the approved plan (§42.11; decision K in §42.13).
- **The limit.** Browser storage commonly allows 5–10 MB, so storage needs a plan before persistent AI rosters (§42.8).

**41.9 Verified.**
- `npm test`: 368 passing, including `tests/career-history.test.js` (11 tests):
  - archived games: packing, unpacking, and books that add up across a real franchise;
  - old moments opening archived lines, and season sheets;
  - record matching by evidence (unique, contradicted, ambiguous namesakes, league tables);
  - partial Hall of Fame careers;
  - Career vs This Season (synthetic scenarios and the real franchise);
  - the router's scroll memory (stubbed DOM);
  - timeline filters and folds;
  - export wording;
  - saves, including one stripped of game lines and record ids.
- `tools/history-growth.mjs`: two franchises, 20 seasons each, measured at 5, 10 and 20. Every archived season adds up to its book, career games equal the books, every linked event opens, no accomplishment repeats: 0 problems.
- **Franchise progression and game outcomes are unchanged.** The fingerprint (records, champions, award winners, roster levels) on `main` and on this branch, 4 franchises × 4 seasons, is identical.
- **Browser checks** in headless Chromium, clean:
  - `tools/career-presentation-check.py`, `tools/navigation-check.py` and `tools/card-export-check.py` at 320–412 px;
  - the League News and Career Timeline checks.

  This is an emulated browser, not a real device.

## 42. Franchise lifecycle, save slots and persistent AI rosters — APPROVED DESIGN (updated 2026-10-24; Phase 1 implemented in §43, Phase 2 in §44, Phase 3 in §45, Phase 4 in §46; all four phases released in v42.0.1, §47)

> **Status.** This section is the approved design. Phase 1 (storage foundation) is implemented in §43, Phase 2 (franchise lifecycle, three slots, the Legacy) in §44, Phase 3 (persistent AI rosters) in §45 and Phase 4 (career integration and polish) in §46. It merges the persistent AI roster proposal (first written 2026-10-23) with the franchise rules the owner locked on 2026-10-23. No code may be written for a phase until the owner authorises it (§42.11).
>
> Three kinds of statement are marked throughout:
> - **[IMPLEMENTED]**: how the game works today.
> - **[APPROVED]**: locked rules, and the design built on them.
> - **[OPEN]**: technical questions or decisions still to settle.

### 42.1 Locked franchise rules [APPROVED]
1. **20-season maximum.** A franchise plays at most 20 complete seasons.
   - Retirement is mandatory after Season 20.
   - Season 20 runs in full first: playoffs, the Beast Bowl, awards, and every historical update.
2. **Three save slots.** At most three franchises exist at once.
   - Active, retired and fired franchises all occupy a slot.
   - Creating a franchise needs an empty slot; with all three full, the owner must delete or replace one first, explicitly.
3. **Read-only retirement archives.** A retired franchise stays in its slot.
   - Its history, rosters, awards, records, monster careers, championships and career cards can be viewed.
   - No progression and no transactions.
4. **Export before deletion.** Deleting a franchise always offers an export first and then needs an explicit confirmation. The export keeps everything needed to restore the franchise later. Nothing is ever silently deleted or overwritten.

### 42.2 Where the game stands today [IMPLEMENTED]

**Saves:**
- **One franchise:** localStorage `gridiron-beast-v6` (schema 6) plus a weekly backup key, `gridiron-beast-v6-backup`.
- **Cloud mirror:** inside claude.ai, a chunked per-viewer copy (`data/users/<viewer>/save_meta` and `save_c<n>`, 180,000 characters per chunk).
- **Kept outside the franchise:** Hall of Fame cards (`gridiron-beast-hof`), achievements and the Beast Dex.
- **Exports:** JSON `{ app, schemaVersion, exportedAt, franchise }`.

**Retirement and firing:**
- **Retiring** (allowed once the Hall of Fame checklist is met) writes a Hall of Fame card and then clears the franchise.
- **Firing** ends the franchise: `startNextSeason` is refused. A fired owner who already qualified can still write a Hall of Fame card.
- **There is no season limit.**

**AI clubs:**
- **Rosters** are regenerated every season from a hash of club, season and seed (§42.6 has the details).
- **Monster ids** are `m_` plus 32 bits drawn from the franchise generator. They are unique in practice within one save today, but they are not guaranteed unique, and two franchises created with the same seed would produce the same ids.

**Measured save growth for one franchise** (hands-off, seed 1, §41.8):

| Seasons | Save |
|---|---|
| 5 | 1.49 MB |
| 10 | 2.22 MB |
| 20 | 2.90 MB |

**The largest parts at season 20:**

| Part | Size | Note |
|---|---|---|
| Archived league tables | 1.08 MB | 8 seasons kept |
| `draftResults` | 599 KB | |
| Award sheets | 449 KB | |
| Roster | 388 KB | |
| Current season | 214 KB | |
| League News | 35 KB | |
| Archived game lines | 170 KB | Inside the roster |

### 42.3 The franchise universe [APPROVED]
Each slot holds one **franchise universe**: a self-contained world that never refers to another slot.

| Part | Contents |
|---|---|
| `uid` | A random 128-bit identifier (`crypto.randomUUID`), set at creation or migration, never reused. Imports keep it (§42.9). |
| `lifecycle` | `{ status: 'active' \| 'retired' \| 'fired', seasonsCompleted, finalSeason, retiredAt, firedAt, legacy }` |
| League | All 16 clubs: the owner's club (`f.roster`, unchanged) and the 15 AI clubs (the registry, §42.6), with contracts, cap state and strategy |
| Monsters | One identity space for every monster in this universe: the owner's, the AI clubs', the pools', the draft classes' |
| History | Draft and transaction history, career timelines, awards, league records, season archives, League News |

**Monster identity:**
- **Ids are unique within a universe.** The registry checks every new id against all ids ever issued in that universe (a compact `idsIssued` set: about 6 bytes per monster) and re-draws on a clash. That turns today's "unique in practice" into a guarantee.
- **Across universes, an id is never meaningful alone.** Anything outside a slot (Hall of Fame cards, achievements, exports, a future shared gallery) refers to a monster as `(uid, id)`.
- **The global stores move from `f.seed` to `uid`.** Hall of Fame, achievements and the dex record `uid`, so two franchises built from the same seed can never be confused.

### 42.4 The franchise lifecycle [APPROVED]

**States:**
- **active:** today's game.
- **retiring:** a short guarded state at the end of Season 20, or on a voluntary retirement.
- **retired:** read-only.
- **fired:** read-only, reached through the Board's existing rules.

**Season 20 retirement.** Retirement is a step after the season, never inside it, and it only begins when every one of these holds:
- `f.season.finished` is true;
- the Beast Bowl has a champion;
- awards are frozen and the season's awards are written;
- the records book and career season-end events are written;
- league tables are archived;
- League News is written;
- no game, Clash or ceremony is in progress;
- no achievement scene is queued.

If the owner was eliminated and is spectating, the remaining playoff rounds are simulated first, as Skip to the offseason does today, so the champion and awards exist. A save interrupted at any point resumes the same checklist; nothing is half-written.

**The steps:**
1. **Complete the final season**, including the guards above.
2. **Finalise statistics and awards.** These are already done in `endSeason`; retirement only verifies them (checks for the champion, awards and archived tables).
3. **Finalise monster histories:**
   - the current season's books roll over, so game lines are archived (§41.1) without starting a new season;
   - career events for the final season;
   - the Hall of Fame events for the card's monsters.
4. **Generate the Franchise Legacy summary:**
   - the owner and club;
   - seasons and record;
   - titles and Beast Bowl appearances;
   - badges, league awards won by the club's monsters, and records held;
   - the best monsters (with career snapshots, §40.5);
   - the rival head-to-head;
   - the Board's history;
   - a season-by-season table.

   It is built from the save's own records, like the career profile (§40).
5. **Create the retirement snapshot.** The universe is compacted for the archive (§42.8): working-only data is dropped (the draft class, the offseason market, recorded-game keys, AI-call caches, today's week state). A checksum is stored and the result written atomically.
6. **Mark the franchise retired** (`lifecycle.status = 'retired'`, `retiredAt`, `finalSeason`).
7. **Prevent further progression.** One guard, `assertActive(f)`, at every mutating entry point (days, games, signings, trades, the draft, contracts, `startNextSeason`, settings that change the game) returns "This franchise is retired: read-only". The UI shows the archive shell (§42.7), never the weekly HQ.
8. **Keep the archive accessible** in its slot until the owner deletes it (§42.7, export first).

**Hall of Fame:**
- **[OPEN, decision L]** Today a Hall of Fame card needs the checklist to be met. The design keeps that: a Season-20 retirement that meets the checklist writes a card, and every retirement gets the Legacy summary in its archive.
- The alternative is a Hall of Fame card for every completed 20-season career.

**Early retirement and firing:**
- **Voluntary retirement** (today's Retire button, once the checklist is met) is allowed before Season 20, by the same guarded steps. It no longer clears the franchise: the slot becomes a retired archive.
- **Firing** (the Board's rules, unchanged) moves the franchise to **fired** at the moment it happens today, after the season is settled. It gets the same Legacy summary and read-only archive, marked "Dismissed after N seasons". A fired owner who already qualified may still write the Hall of Fame card, as today.
- **Neither can interrupt a championship or a historical update,** because both run only after `endSeason` has completed.

**Existing franchises beyond 20 seasons** (possible today: there is no cap):
- **[OPEN, decision M]** Recommended: grandfather them. The current season is completed, then mandatory retirement runs at that season's end, with nothing deleted.
- The alternative is retiring at the next safe point even if the season is unfinished. That is not recommended, because the rules require a completed final season.

### 42.5 The three-slot save manager [APPROVED design]

**The Franchises screen** (the first screen of the app, replacing the single Continue):

| Slot state | The card shows | Actions |
|---|---|---|
| Empty | "Empty slot" | **New franchise**, **Import** |
| Active | Slot number; club name, colour and crest; owner; "Season 7 of 20 · week 4, Thursday"; Beast Bowl titles; last played (date and time); save size | **Continue**, **Export**, **Delete** |
| Retired | As above, with "Retired after 20 seasons" and the Legacy summary's headline | **View archive**, **Export**, **Delete** |
| Fired | As above, with "Dismissed after 6 seasons" | **View archive**, **Export**, **Delete** |

**Deleting:**
1. A sheet names the franchise and its size and offers **Export first** (primary).
2. Export runs (it can only be *requested*, §41.6). The sheet then shows the result line.
3. The owner confirms by typing the club's name (or the word DELETE) and pressing **Delete forever**. A plain tap never deletes.
4. The slot record is removed in one transaction; the backup for that slot is kept for one launch as **Undo delete** *([OPEN, decision N])*.

**Replacing** (creating or importing into a full set of slots): the owner first chooses which slot to free. That runs the delete flow above, including the export offer. There is no "overwrite" button.

**Importing:**
1. Choose a file.
2. It is validated on a copy (§42.9).
3. A preview card shows the club, owner, season, status, size and `uid`.
4. Choose an **empty** slot. With none empty, the owner must delete one first.
5. A file whose `uid` matches an occupied slot is offered **Replace slot N** (delete flow) or **Import as a copy** (a new `uid`; monster ids stay, scoped to the new universe).
6. Nothing is ever replaced silently.

**Creating.** Only into an empty slot. The new universe gets a `uid`, `lifecycle.status = 'active'` and an id registry.

**Accessibility and safety:**
- Every destructive action is a two-step sheet.
- Slot sizes come from the stored records.
- A storage meter on the screen shows the total against the browser's estimate (§42.8).

### 42.6 Persistent AI rosters for the 20-season universe [APPROVED design; IMPLEMENTED in §45 with the deviations noted there]

**Today [IMPLEMENTED].** `aiTeam(f, club, year)` regenerates each AI roster from a hash, every time it is needed. The same 38 monsters play all season and a new set arrives each season. What persists today:
- AI draftees (`draftResults`, injected for three seasons);
- traded-for monsters (removed through `aiTransfers`);
- pool signings by AI clubs (the monster leaves the save with a history line).

**The registry [APPROVED].**
- **Structure.** `f.league = { v, clubs: { [club]: { roster: [ids], strategy, contracts, capUsed } }, monsters: { [id]: monster }, pools, persistentFrom, idsIssued }`, in a pure module `src/franchise/league-registry.js`.
- **The owner's roster stays `f.roster`**, so every owner-facing system works unchanged.
- **AI teams are built from registry rosters** (`buildTeam`, already used) and cached per club per week. Coaches, playbooks, Legendary plays and the rival's signature monster keep their current rules.
- **Determinism.** Every AI decision draws from the franchise generator in a fixed club order. One seed gives one league.

**What it supports (reusing the owner's rules, not inventing new ones):**
- **Development and evolution:** the owner's experience, level and evolution rules (`afterGame`, `offseason`, `tryEvolve`), with AI clubs evolving automatically when ready.
- **Contracts and the salary cap:** the same contract and salary functions, and the owner's cap. Expiring deals are re-signed for starters and good value, otherwise the monster walks to his region's pool. Clubs over the cap release the lowest value per salary.
- **Drafting and recruitment:** AI picks (already made league-wide) join the registry rosters instead of `draftResults`. AI clubs recruit from the pools for their needs.
- **Free agency:** the pools, as today. The weekly 15% in-season chance is kept, plus a needs-first offseason pass after the owner (decision F).
- **Releases and trades:** releases go to the pools. The owner's trades take real monsters from real rosters, replacing `aiTransfers`. AI–AI trades are optional, in Phase 4 (decision E).
- **Long-term career statistics:** season books for AI monsters through the same `recordGame` path. AI game lines are not archived (decision G: totals only).
- **Career Timeline:** season-end events for every AI monster (awards, titles, records, season marks, club moves, evolutions), plus per-game firsts, milestones and playoff stars from the game logs the simulation already produces.
- **League News and awards:** ids are permanent, so news lines link full careers and repeat winners are recognised across seasons.
- **Former owner monsters:** a released, walked or traded monster moves as the same object into the pools or an AI club, career intact. He can return.
- **Competitive balance:** `clubQuality` remains the target. Clubs more than ±4 overall from it are nudged after each offseason (generated regional free agents for weak clubs, slower development for runaway clubs), which keeps difficulty, gym growth and the "league lifts when you win" rule (decision C).
- **Exits:** old monsters who stop being re-signed drift into the pools, where the cap of 12 per region lets the oldest go (decision A: attrition first). Departed monsters without honours are pruned after two seasons out of the league; decorated ones keep a compact legend stub (summary and trophies, about 0.8 KB) so news, awards and records still resolve.

**Season transition** (each season end before 20; at Season 20 only steps 1–2, then retirement, §42.4):
1. awards and records;
2. career season-end events for the AI clubs;
3. aging and decline;
4. contracts: re-sign or release;
5. the draft;
6. AI free agency;
7. roster validation (26–38, positions, cap);
8. the balance nudge;
9. stat books roll over;
10. pruning of departed monsters;
11. the next season starts.

**The 20-season horizon helps.**
- Every universe ends, so data growth is bounded by design.
- Tuning targets 20 seasons, not open-ended dynasties.
- Pruning can be gentle because the archive at retirement is compacted once (§42.8).

### 42.7 The retirement archive [APPROVED design]

**The archive shell.** A retired or fired slot opens a read-only shell instead of HQ. Its tabs:
- **Legacy:** the summary, the season-by-season table and the Hall of Fame card if written.
- **Seasons:** history, standings, schedules, playoffs and the Beast Bowl ceremonies (§35, replayable).
- **League:** award history, leaders, the records book and League News for the final two seasons kept.
- **Roster:** the final roster.
- **Careers:** every monster the universe kept, with timelines, trophy cases and career cards (§40, read-only).

**What it does and doesn't do:**
- **No writes** except view preferences (filters, the last tab), which are stored outside the archive record.
- **Exports and career cards work.**
- **Size:** the compacted archive is about 10% smaller than the active save, and it can be compressed (§42.8).

### 42.8 Storage architecture [APPROVED direction; numbers are estimates]

**Where the bytes go today (one slot, season 20):**

| Part | Size | Reduction |
|---|---|---|
| Archived league tables | 1.08 MB | Store rows with 2-letter keys like the game lines (§41.1): about −45%. Phase 1 |
| `draftResults` | 0.60 MB | Keep only the three classes the game reads: about −0.5 MB. Phase 1; superseded by the registry in Phase 3 |
| Award sheets | 0.45 MB | Keep finalists to the fields the sheets show (id, name, team, position, species, type, record, a short reason, score, a stat-line string): about −75%. Phase 1 |
| Roster | 0.39 MB | Already compact: stats books plus archived lines and career events |

**Duplicate-data removal (Phase 3):**
- Once AI monsters keep season books, the per-player rows of the archived league tables duplicate them for registry monsters. The tables then keep team-level totals and a reference by id, and leaders and award history read the books.
- Award finalists reference ids instead of copying stat rows.

**Projected storage per slot** (estimates from the measured growth, ±25%):

| Season | Today, no cleanup | After Phase 1 cleanup | With persistent AI (Phase 3) | Retired archive, compressed |
|---|---|---|---|---|
| 5 | 1.5 MB | 1.0 MB | 1.6 MB | about 0.3 MB |
| 10 | 2.2 MB | 1.4 MB | 2.2 MB | about 0.4 MB |
| 20 | 2.9 MB | 1.6 MB | 2.7 MB | about 0.5 MB |

**Projected totals with every occupied slot active at the same season** (Phase 3 sizes, uncompressed):

| Season | 1 slot | 2 slots | 3 slots |
|---|---|---|---|
| 5 | 1.6 MB | 3.2 MB | 4.8 MB |
| 10 | 2.2 MB | 4.4 MB | 6.6 MB |
| 20 | 2.7 MB | 5.4 MB | 8.1 MB |

**Reading the tables:**
- **Three active slots at season 20 (8.1 MB):** under the 9 MB target, but without much room.
- **More typical, two retired archives (compressed) and one active slot at season 20:** about 3.7 MB.
- **Everything compressed:** three active slots at season 20 come to about 1.4 MB.
- **Without the Phase 1 cleanup:** three active slots at season 20 would reach about 12 MB. **Cleanup is therefore required before persistent AI rosters.**

**IndexedDB [APPROVED for Phase 1].**
- **Layout:** one database `gridiron-beast` with stores:
  - `slots`: `{ slot, uid, meta }`;
  - `saves`: `{ uid, version, checksum, data }`;
  - `backups`: the two latest good saves per `uid`;
  - `global`: Hall of Fame, achievements, dex.
- **Why:** the quota is far larger than localStorage's 5–10 MB, and writes are asynchronous and transactional.
- **localStorage keeps only a tiny pointer**, `{ activeSlot, schema }`, for a fast start.
- **On start,** ask for persistent storage (`navigator.storage.persist()`).

**Save format versioning.** Schema 7 introduces `uid`, `lifecycle`, slots and IndexedDB; the registry lands in schema 8.
- Every save stores `version`, `checksum` (length plus FNV-1a of the JSON) and `savedAt`.
- Migrations are pure functions, applied in order on a copy and verified before they replace anything.

**Backup and rollback:**
- Each save write keeps the previous good copy in `backups` (two per slot), plus the weekly backup that exists today.
- Loading verifies the checksum. On failure, the game offers the latest backup and then the one before it, and names the data and time of each.
- An explicit **Restore backup** sits in the slot's menu.

**Recovery after interrupted saves:**
- The data and its meta are written in **one** IndexedDB transaction, so it either commits or leaves the previous version intact.
- A crash mid-save can therefore lose at most the last few seconds, never the slot.

**Quota handling:**
- Check `navigator.storage.estimate()` at launch and before season transitions.
- Warn at 80% of the estimate (the meter on the Franchises screen) and suggest exporting or compressing archives.
- A `QuotaExceededError` keeps the game state in memory, shows a blocking banner (Export now / Free a slot) and retries. Nothing is lost silently.

**Export and import:**
- **The file:** `.gbfranchise`, a JSON envelope `{ app, format: 'gridiron-beast-franchise', version, uid, exportedAt, checksum, meta, franchise }`. It is gzip-compressed where `CompressionStream` exists, with a plain JSON fallback.
- **Contents:** everything needed to restore, including the slot's Hall of Fame cards and the achievements tied to its `uid`.
- **Import** runs the §42.9 validation.

**Historical-data compaction:**
- **At retirement:** drop working data and optionally compress the archive record.
- **During play:** league tables beyond 8 seasons are already dropped (unchanged), and departed AI monsters are pruned (§42.6).
- Within the 20-season cap nothing else needs dropping.

**Cloud mirror [OPEN, decision O].** The per-viewer mirror moves to `data/users/<viewer>/slots/<n>/…`, chunked as today. Per-viewer database quotas for three slots of up to about 8 MB (about 45 chunk documents) must be confirmed. The fallback is to mirror the active slot and keep compressed archives only.

**Mobile eviction [OPEN, risk].** iOS Safari can clear script-written storage for sites not added to the home screen after a period without use. Mitigations:
- `persist()`;
- the cloud mirror inside claude.ai;
- an "export your franchises" reminder when a slot has not been exported for a while.

### 42.9 Migration and recovery [APPROVED design]
1. **A legacy single save goes to slot 1.** On the first start of schema 7, a `gridiron-beast-v6` save (or its backup, if the main copy fails its checks) is migrated on a copy:
   - it gets a `uid`;
   - `lifecycle` is set from its state (active, or fired if the Board has fired the owner);
   - it is written to IndexedDB slot 1 and read back;
   - its checksum is compared.

   Only then is the pointer switched.
2. **Nothing is deleted.** The legacy keys stay untouched for at least two releases (shown as "Legacy copy kept" in Settings, with an Export button), then are offered for cleanup, never removed silently. The cloud documents are copied to the slot path the same way.
3. **Backups** are taken before every migration step: the legacy JSON is copied into `backups` first.
4. **An interrupted migration** leaves the pointer on the legacy save. The next start sees an incomplete marker and restarts the migration from the legacy copy, which is idempotent.
5. **Older Hall of Fame cards, achievements and the dex** are copied into the `global` store unchanged. Older cards keep their partial careers (§41.3). Career data inside franchises is unchanged (§38, §40, §41).
6. **Franchises beyond Season 20** are grandfathered (decision M).
7. **Import validation** runs on a copy, before anything is written:
   - the format and version, with migrations applied in order;
   - the checksum, when present;
   - required fields, and every monster id unique within the universe;
   - `lifecycle` consistent with the seasons played (no more than 20, or grandfathered);
   - references resolve (roster ids, award ids where present);
   - the size against the quota;
   - the `uid` against occupied slots (§42.5).

   A file failing any check is rejected with the reason, and no slot changes.

### 42.10 Testing strategy [APPROVED design]

**Automated:**
- **Three independent universes** in one profile: no shared ids, no cross-slot references, each saves, loads and continues alone.
- **Slot capacity:** a fourth create or import is refused with an explanation; replace requires the delete flow.
- **Season 20:** a 20-season soak per difficulty. The retirement checklist must hold, the Legacy summary must match the records, the archive must be read-only (every mutating function returns the read-only reason), and career cards and timelines must open.
- **Early firing:** the fired lifecycle, the archive, and the Hall of Fame card when eligible.
- **Export and import** round trip (byte-identical franchise after migration), `uid` clashes, copies, corrupt files (truncated, wrong checksum, wrong version, duplicate ids).
- **Confirmed deletion:** a single tap never deletes; export is offered; undo for one launch if adopted.
- **Interrupted writes and migration:** kill points injected between steps (fake IndexedDB), followed by recovery, with no data lost.
- **Corruption recovery:** a bad checksum leads to the backup choice.
- **Storage limits:** a simulated quota and `QuotaExceededError` give the blocking banner, keep the state in memory and retry.
- **Persistent identity:** a monster's id and career survive transfers, the pools, a return to the owner, pruning and legend stubs. The registry never puts one monster on two clubs.
- **Contracts and cap:** every club's cap and roster limits are valid weekly and after each offseason.
- **Twenty-season simulations** at all difficulties: invariants, save size per season against the budgets above, timing.
- **Competitive balance:** club overall against `clubQuality`, title spread, the owner's win rates by difficulty, and Board forecast calibration, compared with today's game.
- **Determinism:** golden seeds give identical leagues.

**Manual, on real phones** (an iPhone SE-size device and a large Android, in the browser and installed):
- creating three franchises;
- the save manager at 320–412 px;
- delete with export and typed confirmation;
- importing a file from the phone's storage;
- a Season 20 retirement and browsing the archive;
- a full storage warning;
- killing the app mid-save and reopening;
- leaving the phone unused for a week (iOS eviction);
- timing a season transition on a low-end device.

### 42.11 Four-phase implementation plan [APPROVED outline; each phase needs the owner's go-ahead]

**Phase 1 — Storage foundation** — *IMPLEMENTED in v39.2, see §43 (draft results kept whole and packed losslessly instead of limited to three classes; the save is 1.41 MB packed, 0.34 MB stored, at season 20).*
- **Work:**
  - storage cleanup (compact league tables, `draftResults` limited to three classes, slim award finalists);
  - IndexedDB stores with the localStorage pointer;
  - checksums, two backups per slot, atomic writes;
  - schema 7 migration of the legacy save to slot 1 (with `uid` and `lifecycle`);
  - a storage meter;
  - `persist()`.
- **Depends on:** nothing new.
- **Risks:** migration bugs, mitigated by copy-verify-switch and kept legacy keys; asynchronous saves racing gameplay, mitigated by a serialised save queue.
- **Accepted when:**
  - legacy saves migrate with byte-identical franchises (apart from the new fields);
  - injected crashes never lose a slot;
  - the 20-season save is 1.6 MB ±25%;
  - all existing tests pass and the progression fingerprint is unchanged.
- **Save size:** about −45% (2.9 → 1.6 MB at season 20).

**Phase 2 — Franchise lifecycle** — *IMPLEMENTED in v40.0, see §44.*
- **Work:**
  - the three-slot manager;
  - create, continue, export, import and delete (the export-first, typed-confirmation flow);
  - `lifecycle` states with the 20-season limit and the guarded retirement steps;
  - the Legacy summary and the read-only archive shell (`assertActive` everywhere);
  - firing into the archive;
  - Hall of Fame and achievements keyed by `uid`;
  - grandfathering.
- **Depends on:** Phase 1.
- **Risks:**
  - a missed mutating path in a retired franchise, mitigated by one guard plus a test that calls every exported mutating function;
  - retirement during an unfinished season, mitigated by the checklist guard.
- **Accepted when:**
  - the automated lifecycle and slot tests pass;
  - a 20-season soak ends in a valid archive;
  - nothing can be deleted without the confirmation;
  - real-phone checks are done.
- **Save size:** retired archives about −10%, or about −80% compressed.

**Phase 3 — Persistent AI rosters** — *IMPLEMENTED in v41.0, see §45 (protected monsters, the owner's rules of 2026-10-24; the balance calibration measured against today's generator; league waivers).*
- **Work:**
  - the league registry with guaranteed-unique ids and migration from the current season's rosters (`persistentFrom`);
  - AI teams built from the registry;
  - development and evolution;
  - contracts and the cap;
  - the draft into rosters, free agency, releases, the owner's trades from real rosters;
  - strategies, the balance nudge, pruning and legend stubs;
  - schema 8.
- **Depends on:** Phases 1 and 2 (the storage budget and `uid`).
- **Risks:**
  - balance drift, mitigated by `clubQuality` targets and studies against today;
  - save growth, mitigated by budgets per season, pruning and duplicate removal;
  - performance on low-end phones, mitigated by weekly caching and a one-time transition;
  - migration mid-season, mitigated by matching ids from the current rosters.
- **Accepted when:**
  - weekly invariants hold for 16 clubs over 20 seasons on every difficulty;
  - balance metrics stay within the agreed bands;
  - one active slot is 2.7 MB ±25% at season 20;
  - a season transition takes under 0.5 s on a throttled CPU.
- **Save size:** about +1.1 MB per active slot at season 20, before duplicate removal.

**Phase 4 — Career integration and polish** — *IMPLEMENTED in v42.0, see §46 (the owner's decisions of 2026-10-24: News thresholds, AI–AI trades, forward-only compaction, retirement as a permanent exit, the League Hub, the Board reset for simulation only).*
- **Work:**
  - league-wide career histories (AI timelines, trophy cases, career cards);
  - awards, records and News integration (repeat winners across seasons, transfer news);
  - duplicate-data removal (tables and award references);
  - optional AI–AI trades;
  - UI polish;
  - long-term balance testing.
- **Depends on:** Phase 3.
- **Risks:** noise in News, mitigated by existing caps and priorities; event volume, mitigated by season-end writers and caps.
- **Accepted when:**
  - every award winner and record holder opens a full career;
  - no repeated events;
  - the 20-season balance report is reviewed;
  - real-phone checks are done.
- **Save size:** about −0.3 to −0.5 MB from duplicate removal, partly offsetting Phase 3.

### 42.12 Risks and tradeoffs
- **Storage against richness:** persistent careers for about 650 AI monsters cost about +1 MB per slot. The cleanup and duplicate removal pay most of it back; compression is the safety margin.
- **Asynchronous saves:** IndexedDB adds complexity (save queue, races with gameplay) in exchange for quota and atomicity.
- **Balance:** organic AI clubs can drift away from today's carefully tuned difficulty. Keeping `clubQuality` targets trades some realism for predictability.
- **Read-only retirement changes today's flow:** retiring no longer clears the franchise, so players keep their history but use a slot.
- **Mobile eviction and quota differences between browsers:** exports and the cloud mirror are the only real protection outside an installed app.
- **Scope:** Phases 1 and 2 are valuable on their own, even if persistent rosters were postponed.

### 42.13 Decisions requiring the owner's approval
**Carried over from the first proposal** (A–G and J approved by the owner on 2026-10-23; H, I and K are done in Phase 1):

| | Decision | Status |
|---|---|---|
| A | Monster exits: attrition through the pools first | **Approved** (2026-10-23) |
| B | Exact per-game development for AI monsters | **Approved** (2026-10-23) |
| C | `clubQuality` targets with nudges | **Approved** (2026-10-23) |
| D | The owner's contract and cap rules for AI clubs | **Approved** (2026-10-23) |
| E | AI–AI trades later, optional | **Approved** (2026-10-23) |
| F | The owner first in offseason free agency | **Approved** (2026-10-23) |
| G | AI season totals only, no archived AI game lines | **Approved** (2026-10-23) |
| J | Seasons before migration stay table-only | **Approved** (2026-10-23) |
| K | Storage cleanup | Done in Phase 1, losslessly (§43.2) |
| H | IndexedDB | Implemented in Phase 1 (§43.3) |
| I | Schema versioning | Storage version 7 in Phase 1 (§43.3: the franchise stays schema 6-compatible); franchise schema 8 in Phase 3 (§45.7) |

**New with the lifecycle rules** (L, M, N, P, Q and R approved on 2026-10-23 as recommended; O pending):

| | Decision | Recommendation |
|---|---|---|
| L | A Hall of Fame card at Season-20 retirement only when the checklist is met (today's rule), or for every completed 20-season career | Keep today's rule; the Legacy summary is for every career |
| M | Existing franchises beyond Season 20 | Grandfather: finish the current season, then mandatory retirement, with nothing deleted |
| N | **Undo delete** for one launch (the slot's backup kept until the next start) | Yes |
| O | The cloud mirror for three slots | **Approved (2026-10-23):** every slot is protected, active, retired and fired alike; an archive is uploaded once as a single verified copy and never again (it is read-only), so it costs one copy; the Phase 1 protections (write-once snapshots, deletion markers, never evicting a franchise's newest copy) stay (§44.6) |
| P | Compress retired archives by default (smaller; slower to open the first time) | Yes |
| Q | The export file format | **Revised (2026-10-23):** plain JSON everywhere (`.gbfranchise`, named `.gbfranchise.json` inside claude.ai, where the platform allows only some file types and gzip would be refused); compression stays internal, for stored parts and archives (§43.2, §44.4) |
| R | Voluntary retirement before Season 20 stays available once the checklist is met | Yes |

**Phase 3 decisions (owner, 2026-10-23 and 2026-10-24; all approved and implemented, §45):**

| | Decision | Status |
|---|---|---|
| S | **Protected monsters.** Gym legendaries stay with their clubs for all 20 seasons; rival signature monsters stay with their rivals; neither is ever traded, released, moved through free agency, aged or retired; both keep their ids, statistics, progression and history; no successor system. Normal AI monsters follow every ordinary rule | **Approved (2026-10-23)** |
| T | **Ageless legendaries.** Legendary monsters do not age or decline whether the owner or an AI club holds them; the permanent-club rule applies to AI gym legendaries and rival signatures only, and the owner manages an owner-held legendary like any monster | **Approved (2026-10-24)** |
| U | **The cap for protected monsters:** an explicit exemption (their salary never counts against the AI club's cap); AI clubs never routinely sit over the cap; the owner's cap rules are unchanged | **Approved (2026-10-24)** |
| V | **Signature progression:** the rival's signature monster keeps gaining a season's growth (+2 points on what his position uses), within the existing attribute and potential caps, verified by balance testing | **Approved (2026-10-24)** |
| W | Separate build-compatibility environments: a schema-8 save is never shared with a v39/v40 build (the private test link and the normal game stay apart until the normal game is upgraded with the migration) | **Approved (2026-10-24)** |
| X | A fixed staff allowance for AI clubs' caps (the default staff's cost) | **Approved (2026-10-24)** |
| Y | Natural progression and roster-based balancing, never direct rating edits | **Approved (2026-10-24)** |
| Z | The storage acceptance figure is the packed logical payload, as Phase 1 reported it | **Approved (2026-10-24)** |
| AA | Historical `draftResults` retained; new AI draftees join persistent rosters | **Approved (2026-10-24)** |
| AB | Today's generator kept for migration and as the parity and balance baseline | **Approved (2026-10-24)** |

## 43. Storage foundation — Phase 1 of §42 (IMPLEMENTED 2026-10-23; branch `storage-foundation`, v39.2)

Phase 1 of the plan in §42.11, and nothing beyond it. **Not in this phase:** the three-slot manager, retirement and archives, the 20-season limit, persistent AI rosters, the full import screen and the cloud policy for several slots (decision O). Those are Phases 2–4 and stay designs in §42.

### 43.1 Audit (what the game did before this build) [IMPLEMENTED: findings]
- **The save.** One JSON copy in localStorage (`gridiron-beast-v6`), written synchronously by `app.save()` on about 90 call sites (every play of a match, every action). A weekly copy (`gridiron-beast-v6-backup`) after each Sunday. Load at start was synchronous.
- **Size.** A 20-season franchise is about 2.9 MB of JSON (league tables 1.08 MB, draft results 0.60 MB, award sheets 0.45 MB, roster 0.39 MB). The save and its weekly copy together are about 5.8 MB, more than the roughly 5 MB that browsers give localStorage per site, so from about season 15 the weekly copy could fail to be written (silently, depending on the browser) and the save itself was getting close to the limit.
- **Failure reporting.** A failed write showed one toast per session ("your cloud save is still kept"); nothing offered a retry or an export.
- **Cloud mirror** (`cloud-save.js`, only inside Claude). The artifact's per-viewer database: `save_meta` plus `save_c<n>` chunks of 180,000 characters (the per-document limit is 256 KiB), written chunks first and meta last, at most every 4 s or at once after a game or a new day. Writes were not serialised: two could interleave, and the meta read `f.savedAt` after the chunks had been written, so a save landing in between left a copy that the reader then rejected. At start, a newer cloud copy replaced the local save without keeping it. A throttled write could also bring back a franchise the player had just deleted.
- **Global data outside the franchise.** The Hall of Fame, achievements and the Beast Dex have their own localStorage keys and cloud documents. They stay there in Phase 1 (they are small and per player, not per franchise; the `global` store is reserved for them when slots arrive in Phase 2).
- **Synchronous assumptions found.** Start (`Save.load()` before the first screen); `app.reset()` (clear then go to the menu); the weekly backup; the Settings restore and import; `beforeunload`/`pagehide` saves (which could rely on a synchronous write). Every one is handled below.

### 43.2 Lossless compaction [IMPLEMENTED]
`src/franchise/pack.js`. The franchise is packed only on its way to storage; in memory it is unchanged, so no game code can be affected.
- **Field names** that repeat (stat keys in thousands of table rows) and **string values** that repeat (clubs, positions, species, names) become short dictionary codes.
- **Object shapes:** an object whose exact field list repeats (a league-table row, an award finalist, a drafted monster) is stored as a row of values plus one shared field list.
- **Escaping:** a real key or string starting with `~` is stored as `~~…`, so codes can never collide with data.
- **Exact round trip, key order included,** tested on real 20-season saves and fuzzed; every value, including every older draft class and every award sheet, is kept. Then gzip (`CompressionStream`).
- **Verified before it is stored.** Each part is unpacked again and compared with its JSON before it is written. If it ever differed, the plain JSON would be stored instead, so a packer bug could cost space but never data.
- **Draft results.** Readers audited: `draft.js` writes the class and `injectDraftees` uses the last three classes; `ageDraftees` ages every class; `career-profile` `findMonster` looks monsters up in every class. All read the unchanged in-memory form. The three most recent classes are kept in full detail, and so are the older ones: they are only stored more compactly. Nothing is stubbed or deleted (§42.11 had proposed limiting the file to three classes; the owner's rule that history is never sacrificed takes priority).

**Results at season 20 (seed 1; seed 2 within 1%):**

| | v39.1 JSON | Packed (logical payload) | Packed + gzip (stored) |
|---|---|---|---|
| Whole franchise | 2,903 KB | **1,413 KB** (−51%) | **336 KB** (−88%) |
| League tables | 1,077 KB | 630 KB | 143 KB |
| Draft results | 599 KB | 198 KB | 43 KB |
| Award sheets | 449 KB | 190 KB | 40 KB |
| Careers and stats on the roster | 369 KB | 236 KB | 53 KB |

The §42.11 target (1.6 MB ±25% at season 20) is met by the logical payload alone, with nothing removed.

### 43.3 IndexedDB as the primary store [IMPLEMENTED]
`src/franchise/store.js`.
- **Database `gridiron-beast`, version 1.**
  - `slots`: the pointer for slot 1 (uid, state `migrating|active|empty`, the migration record).
  - `saves`: the live manifest of slot 1.
  - `backups`: rolling, weekly and safety copies, and the protected original.
  - `parts`: content-addressed save parts. This store is an addition to the §42.8 list: it lets backups share unchanged parts and lets a save write only what changed.
  - `global`: reserved (see 43.1).
- **A save is three parts:** the core, `history` and `draftResults`. Each is packed and compressed on its own, so the archive is re-packed only when it changes (once a season), not on every play.
- **Each manifest carries:**
  - the franchise `uid`;
  - storage version 7 and the pack format;
  - `savedAt`;
  - a sequence number and the writer;
  - the checksum of every part, in its stored form and as raw JSON;
  - the lifecycle;
  - the slot;
  - a summary for menus (club, season, week).
- **Checksums:** FNV-1a 32-bit plus length, for corruption detection only (not security). They are verified on every load, on every backup listed or restored, before a version is rotated into a backup, during migration (read back and compared) and on export and import.
- **Slot 1 only.** The existing franchise becomes slot 1; slots 2 and 3 are not created or shown.
- **Schema and the storage version.** The franchise keeps `schemaVersion: 6`. Version 7 belongs to the storage layer (manifest, envelope, export), and the franchise only gains two fields that older builds ignore: `uid` (a platform UUID, never the game RNG) and `lifecycle` (`{status: active|fired, seasonsCompleted}`, recorded for Phase 2 and acted on by nothing).
  - *Tradeoff:* a cached older build (v39.1) that sees a franchise with a new schema number rejects it and would offer a new franchise, possibly overwriting the cloud copy. Keeping the franchise schema compatible avoids that.
  - The cost is that the franchise JSON alone does not say it came from v7 storage; the manifest and the export envelope do.

### 43.4 Saving [IMPLEMENTED]
- **The queue.** One write at a time. A newer request replaces a pending one, and every caller's promise resolves when its state, or a newer one, is committed.
- **Debounce.** Ordinary saves wait 1.2 s; a finished game, a new day, a week change or a roster change saves at once, as the cloud did before.
- **The snapshot** is serialised synchronously before any asynchronous work, so a save never mixes two moments of the game.
- **The transaction** puts the new parts, rotates backups, puts the manifest, updates the slot and removes unreferenced parts in one IndexedDB transaction: all or nothing.
- **No stale overwrite: one rule for every tab.** Each tab remembers what it last saw in the save slot: the manifest it loaded or last wrote, or an empty slot (it saw none, or deleted the franchise itself). If the slot holds anything else, another tab or window changed it, and this tab's save, deletion and unload journal are all refused, whatever the clocks say. That covers:
  - a different manifest being live;
  - none being live (deleted elsewhere);
  - one having appeared where this tab saw an empty slot (a franchise created in another tab).
  - The same rule also refuses an older save from this tab's own writer id.
  - When a tab returns to the front, it checks at once and, if the franchise changed elsewhere, says so before the player plays on: **Reload the game** or **Export this tab's franchise**.
  - Saves still queued for a franchise that was replaced (restore, delete, new or imported franchise) are dropped, and the status returns to "Saved".
- **A save that changed nothing writes nothing.** `savedAt` lives in the manifest, not in a part. When nothing but the time changed since the save a tab committed or loaded, nothing is written: no part, no manifest, no backup rotation. An idle tab's leave-save therefore never becomes the newest writer, and never locks out the tab being played.
- **Honest status.** "✓ Saved on this device" (with the time) appears only after the commit. "Saving…" shows while a write is pending, and "⚠ Last save failed" shows on error.
  - On failure, the game state stays in memory, a sheet says the latest progress is not saved yet, and it offers **Retry save**, **Export franchise** and **Keep playing**.
  - A full device or browser store is named as such.
  - Recovery after an error is announced ("Saved.").
- **Leaving the page.** The pending save starts at once. If it changed anything, the parts that differ from the last commit (normally only the core) are also written synchronously to a localStorage journal. Each tab has its own key (`gridiron-beast-v7-journal:<writer>`), so one tab closing can never overwrite another's. At the next start, a journal is used only if all of these hold:
  - it has the same `uid`;
  - it is newer than the live save;
  - it was built on the live save, or on an earlier save by the same tab that committed after the journal was written (the page was hidden mid-save);
  - the committed parts it builds on pass their checksums.
  - If several qualify, the newest wins.
  - Every other journal is stale and is cleared. A journal that matches but cannot be read this time (a passing storage error) is kept and tried again at the next start; once a newer save exists it is stale and is cleared. If another tab has saved even while the journal is being adopted, the live save is loaded instead.
- **Failures handled:**
  - IndexedDB missing or refused (private modes, policies): fallback mode on the v39.1 localStorage path, labelled in Settings.
  - An upgrade blocked by another tab: a clear message, and fallback mode.
  - The browser closing the connection (site data cleared, version change): it is reopened once, transparently.
  - Quota (the save fails and the previous one is intact), an aborted transaction, a serialisation error, a checksum failure (recovery, 43.6) and interruption at any point (the journal, and idempotent migration).

### 43.5 Migration of the v39.1 save [IMPLEMENTED]
**Steps:**
1. Detect the localStorage save and validate it with the existing migration (`Save.migrate`).
2. Store a protected copy in IndexedDB (`legacy-original`, the exact text with its checksum) and record step `copied`.
3. Migrate a *separate* copy and give it its `uid` and `lifecycle`.
4. Write it with slot state `migrating`, step `written`.
5. Read it back and compare it byte for byte.
6. Switch the slot to `active`, step `done`.

**Guarantees:**
- **Idempotent.** An interrupted attempt restarts from the untouched localStorage save with the same `uid` (no duplicate franchise, attempts counted). Until a migration completes, the game plays the localStorage save in fallback mode, so no progress is lost.
- **The localStorage save is never modified or deleted** by this build. It stays at least two releases; any later removal will be announced in the game and will need the owner's approval, never done silently. The v39.1 weekly copy is carried over as the weekly backup.
- **An older copy of the game writing later.** A cached v39.1 tab or app may write the localStorage save after migration (its checksum changes). Its timestamp cannot tell genuinely newer progress from an old tab's stale state, so neither replaces the other:
  - The live IndexedDB franchise stays.
  - The other save is kept as a `legacy-newer` backup (the exact text, checksummed, the three most recent by content), restorable by the player's choice.
  - The game says so once.
  - If keeping that copy fails, nothing changes and it is tried again at the next start. The localStorage save itself is never touched.
  - (Before the final audit the newer-stamped legacy save was adopted, which could replace weeks of progress with an old tab's state.)
- **No season limit is enforced:** saves past season 20 migrate unchanged (tested with 42 seasons).

### 43.6 Backups and recovery [IMPLEMENTED]
- **Rolling backups.**
  - `roll0` and `roll1` are the two latest previous versions, taken only when content changed, in the same transaction as the save.
  - Every generation is verified before it moves: the outgoing live save before it becomes `roll0`, and `roll0` before it replaces `roll1`. A damaged generation is dropped rather than promoted, so a valid backup is never overwritten by a damaged or unverified one, whether the damage is in a shared or an unshared part.
  - They share unchanged parts with the live save, which costs about 0.3 MB extra at season 20.
- **Independent copies,** each self-contained so that damage to shared parts cannot reach them:
  - `weekly`, after each Sunday, as before;
  - `pre-restore` and `pre-cloud`;
  - `legacy-newer`, a localStorage save written by an older cached build after migration;
  - `replaced`, when a new or imported franchise replaces the current one. A new franchise from onboarding now takes the same commit-first path as every other activation: if the safety copy or the commit fails, the current franchise stays active and the onboarding screen says why;
  - `deleted`: Delete franchise keeps the franchise recoverable. This anticipates decision N.
  - The weekly copy is one record; every other kind keeps its **three most recent** copies, so a second replacement never erases the first.
  - A deletion that cannot complete deletes nothing, locally or in the cloud. Retiring and being let go use the same path, and the franchise leaves only after its copy is kept.
- **Recovery screen.** When the live save fails its checks, the game stops at **Save recovery** instead of loading it. The screen:
  - lists every backup with its kind, club, season, week and time, each verified;
  - warns that progress after the backup is not in it;
  - restores only the one the player picks (after a confirmation);
  - keeps the damaged save (`quarantine`) either way;
  - never overwrites anything automatically: a newer cloud copy is *offered* in the list rather than loaded.
  - Import is available from the same screen.
- **Settings → Save data → Restore a backup** opens the same verified list at any time. A restore keeps the current franchise first and is stamped as the newest state, so no older cloud or legacy copy can override it.
- **Commit first, then adopt** (`store.replace`, `src/franchise/activation.js`). A restore, an import, the v39.1 weekly backup and the cloud copy are all activated in the same order, with the save queue held:
  1. The backup is read and verified; a corrupt backup changes nothing.
  2. A safety copy of the current franchise is committed. If that fails, nothing else happens.
  3. The new franchise is committed as the live save, with verification, rotation and the other-tab guard. If that fails, nothing has changed.
  4. Only then is the current franchise retired (its late saves are ignored), the new one adopted in memory, and the cloud mirrored.
- **On any failure** the current franchise stays active, saving normally and mirrored as before, with no reload needed. The player is told which step failed. A new franchise from onboarding is the one exception: it is active in memory at once so the next screen can show it, but storage still copies the old franchise first and commits the new one after it, and the cloud receives it only after that commit.

### 43.7 Export and import [IMPLEMENTED: validation and restore; the import screen is Phase 2]
- **`.gbfranchise`:** plain JSON, so `.json` readers work (decision Q's gzip variant is left for Phase 2: an uncompressed file is easier to verify and recover by hand). The envelope holds:
  - `app`, `format: gridiron-beast-franchise`, `version: 1` and `storage: 7`;
  - `schemaVersion`, `uid` and `exportedAt`;
  - the checksum of the franchise text;
  - a summary;
  - the complete franchise.
- **Verified before it is offered.** The file is checked before the browser is asked to save it. The message is "Export file prepared (2.8 MB, verified). Check that your browser saved it": the game never claims a download finished.
- **Inside claude.ai (found on a real iPhone in Stage 2, 2026-10-23).** A page there cannot start a download itself: the platform blocked the file ("File downloads aren't available for this artifact") while the game said "Export file prepared". The export now goes through the platform's `downloads` capability (`src/ui/file-offer.js`), which the artifact must declare: the player confirms, and the Claude iPhone app opens the share sheet. That capability accepts `.json` but not `.gbfranchise`, so there the file is named `….gbfranchise.json` (the import reads files by content and accepts both). The message reports what really happened: saved (with the file name), cancelled, or not possible in this view, always adding that the progress is still saved on the device. Outside claude.ai the browser download and its message are unchanged. The v39.0 export ("Export save as JSON") has the same limitation on the live link until this build is released with the capability declared. Tests: `tests/file-offer.test.js` (5). Not changed: the career card image share (`career-card.js`, same limitation, outside the save system).
- **Never refused.** If the franchise fails that check (for example, two monsters sharing an id), it is still offered. The file is named `…-unverified.gbfranchise` and the message says it did not pass its check, because it may be the player's only copy of their current progress.
- **`validateImport`** works on a copy before anything is written. It:
  - checks the envelope and the checksum, refusing edited or truncated files;
  - runs the franchise migration;
  - checks required fields, roster ids and the envelope `uid`.
  - Older `.json` exports from Settings are accepted, with a note that they carry no checksum.
- **Settings import** uses it and keeps the replaced franchise as a backup. The full import UI (slot choice, conflicts by `uid`) is Phase 2.

### 43.8 Cloud mirror [IMPLEMENTED: snapshot design, 2026-10-23; policy recommended]
The device's own save is the primary copy. Inside claude.ai the franchise is also mirrored to the artifact's private per-viewer database, so a new device, or a device whose browser storage was cleared, can recover it. The store keeps JSON documents (at most 256 KiB each, at most 25,000 per artifact database, plus a total-size cap whose value is not documented); writes are last-writer-wins, there are no transactions, and its only lock expires, so a lock cannot stop a request that arrives late. The mirror therefore never depends on a lock for correctness (redesign approved by the owner after the Codex review of `cd1a849`, 43.13).
- **Snapshots, written once.** Each upload writes its own snapshot under a unique generation id (`gen` = `savedAt` in base 36 plus 8 random characters), all inside `data/users/<id>/cloud/`:
  - `snaps/<gen>~w`, the intent (franchise identity, `savedAt`, chunk count), written first;
  - `chunks/<gen>_c<i>`, each chunk, next;
  - `snaps/<gen>`, the commit (identity, `savedAt`, chunk count, length, FNV-1a checksum, `storage: 8`), written last, only after every chunk was acknowledged.
  - No upload ever changes another upload's documents, so a delayed, reordered or retried request can only add documents, never overwrite newer progress.
  - The JSON is written with every non-ASCII character escaped (`\uXXXX`, the same JSON value), in 120,000-character chunks: at most about 240 KB once the store escapes quotes and backslashes, under the 256 KiB limit.
- **Identity.** Two copies belong to the same franchise when their `uid`s are equal or their `createdAt`s are equal (both non-empty). The game passes `createdAt` with each upload. A franchise with neither is not uploaded (status "too old to identify"; Export keeps a copy).
- **Reading (recovery).** The reader lists the commits (small documents) and deletion markers, then takes the newest commit whose chunks are all present and match the length, checksum and `savedAt`. A damaged or missing chunk makes it try the next older commit. If every commit was missing chunks, it lists again, up to three passes, because a newer snapshot may have been published and the old one cleaned up while it was reading. A network error returns nothing (and the status says so); it never falls back to an older copy. The markers are read again once a snapshot is assembled, so a deletion that lands meanwhile is respected.
  - With a franchise on the device, only copies of that franchise are considered: the game never switches a device to another franchise.
  - With none, the newest valid copy of any franchise is returned, unless this device has just deleted its franchise (then nothing is adopted; the flag clears with the next upload from this device).
- **Clean-up** runs after each successful upload, from one listing of commits, then markers. A snapshot is removed only:
  - (a) when its franchise was deleted (a marker voids it); or
  - (b) when two newer **committed** snapshots of the same franchise exist.
  - Both facts stay true once seen, so a delayed or repeated removal stays correct. The two newest commits of each franchise are never removed by anyone and are always complete: a snapshot whose chunks were removed while it was still being written always has newer commits above it. A commit is removed first, then its chunks, then its intent (so leftovers stay findable).
  - Once per session, a sweep (`where('gen','not-in', …)`, `limit(10)`) removes leftover chunks whose writer stopped after its intent was removed, under the same two rules. It is skipped when more than 30 snapshots are listed.
- **Deletion.** Deleting a franchise records the deletion on this device first, before waiting for anything (retried at every start until it reaches the cloud), then writes a marker `deleted/<id>` with the franchise's identity and a **cut-off** fixed at that moment: the newest of this device's `savedAt`, the newest copy of it visible in the cloud, and the time of deletion. Every snapshot of that franchise saved at or before the cut-off is invalid for every reader, whatever order requests arrive in, and is removed by clean-up. Then the v39.0/v39.1 `save_meta` is removed if it holds this franchise (so a cached old tab cannot adopt it).
  - An upload already in flight, queued or throttled in any tab, or a stale tab still holding the franchise, can therefore never bring it back.
  - A marker that only reaches the cloud later keeps its original cut-off, so it never invalidates progress made afterwards on another device.
  - A franchise the player restores from a device backup is saved with a new `savedAt` and is backed up again from that save.
  - Markers are never removed (one small document per deletion). New franchises have a new `uid` and `createdAt`, so earlier markers never affect them.
  - Old-build timestamps are not trusted: any marker voids the v39.0/v39.1 copy of that franchise.
- **Older builds.** v39.0/v39.1 read and write only `save_meta` and `save_c<n>`, and delete only `save_meta`: they cannot touch any snapshot. On first run of v39.2 the old copy is read (also the unreleased layout with `gen`), but only when that franchise has no v39.2 commit yet. After that it is ignored and left in place. A v39.1 copy with no `createdAt` is offered to the device (the game compares dates and keeps its own copy as a backup).
- **Writes are serialised** within a tab (one at a time; only the newest pending state is written next). The JSON and its `savedAt` are fixed when the write is authorised. An older state of the franchise this tab last wrote is never uploaded, and an upload is skipped when the cloud already holds a commit of that franchise at least as new.
- **Full cloud.** On `quota_exceeded` the upload removes its own failed, uncommitted snapshot (after the retry too), runs clean-up with every franchise kept to its newest commit (that commit is still never removed), and retries once. If it still fails, the status says the cloud save is full (the device's save is unaffected) and nothing more is removed.
- **Only a committed save reaches the cloud.** The upload is that save's committed snapshot, fixed when the write is authorised, never the live object. A failed local save authorises no upload, whatever the reason. This replaces v39.1's "the cloud still keeps it" behaviour after a device failure; the failure sheet's Export is the way to keep that progress.
- **At start,** the cloud copy of the device's own franchise replaces the local save only when it is newer, and the local franchise is first kept as `pre-cloud`. The cloud copy is committed locally before the game adopts it. If that backup cannot be made, the cloud copy is not loaded. When the local save failed its checks, the cloud copy is only offered on the recovery screen. When the local copy is newer, the cloud copy is brought up to date. If the player kept playing while the backup was being made, the cloud copy is not loaded (this device is newer now). In fallback storage, which has no backups, a newer cloud copy is loaded only if the player says yes.
- **Offline and reconnect.** Failures set the cloud status shown in Settings, in plain words; the next write after reconnecting succeeds.
- **Tests** (simulated store with delays, reordering, interruption and failures: `tests/cloud-save.test.js`, `tests/cloud-concurrency.test.js`, `tests/cloud-regressions.test.js`, `tests/cloud-review-fixes.test.js`, helper `tests/helpers/cloud-sim.js`; and the browser check, 43.12).
- **Measured usage.** A snapshot is the raw franchise JSON: about 0.6 MB at season 1, 2.2 MB at season 10, 2.9 MB at season 20 (about 25 chunks of 120,000 characters, plus 2 small documents). Normally two snapshots per franchise are kept (about 6 MB at season 20), plus the deletion markers, the legacy copy until it is deleted, and the dex, Hall of Fame and achievements documents. The document count stays far below 25,000.
- **Quotas.** Documented for runtime 0.2.77: 256 KiB per document, 25,000 documents per artifact database, and a total-size cap whose value is not stated (handled as "Full cloud" above). Other franchises' copies are kept (two each) until they are deleted or the cloud is full.
- **Recommendation for decision O (pending):** mirror only the **active** slot in the cloud. Retired archives would be cloud-mirrored only as compressed exports (about 0.35 MB each) once a total quota is confirmed. Do not mirror three full slots.

### 43.9 Benchmarks [IMPLEMENTED: tool and results]
- **Tool:** `tools/storage-benchmark.mjs`, on the two 20-season runs (seeds 1 and 2, rookie).
- **What it simulates:** each run is migrated, then gets a week of saves, a weekly copy and a season transition (archive re-packed).
- **Columns:**
  - *IDB save*: the live save's parts.
  - *Rolling*: the extra space of `roll0` and `roll1`.
  - *Weekly*: an independent copy.
  - *Original*: the protected v39.1 text, gzip.
  - *Game total*: everything in IndexedDB plus the v39.1 localStorage save left in place.
- **Main (v39.1):** the save plus the weekly copy in localStorage, when the copy still fitted.

| Season | v39.1 save | Packed | IDB save | Rolling | Weekly | Original | IDB total | Game total | v39.1 storage (save + weekly) | Cloud docs |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 605 KB | 270 KB | 78 KB | 73 KB | 78 KB | 82 KB | 310 KB | 915 KB | 1,210 KB | 5 |
| 5 | 1,492 KB | 748 KB | 191 KB | 177 KB | 191 KB | 217 KB | 776 KB | 2,268 KB | 2,984 KB | 10 |
| 10 | 2,219 KB | 1,114 KB | 275 KB | 251 KB | 275 KB | 317 KB | 1,118 KB | 3,336 KB | 4,438 KB | 14 |
| 15 | 2,561 KB | 1,267 KB | 305 KB | 271 KB | 305 KB | 357 KB | 1,237 KB | 3,798 KB | 5,122 KB (at the ~5 MB limit: the weekly copy can fail) | 16 |
| 20 | 2,903 KB | 1,413 KB | 336 KB | 294 KB | 336 KB | 395 KB | 1,361 KB | 4,264 KB | 5,806 KB (over the ~5 MB limit: the weekly copy fails) | 18 |

**Projections at season 20** (Phase 2–4 layouts, not built):
- *Without AI:* the space for the slots plus the one-time migration copies (the v39.1 localStorage save and its protected original, 3.3 MB, which a new player never has).
- *AI estimate:* the §42 persistent AI rosters estimated separately (15 clubs × today's roster size × today's average monster record, at the measured compression); AI careers would add to it.
- These are estimates, not a promise that storage stays under any figure.

| Layout | Without AI | AI estimate | Total |
|---|---|---|---|
| 1 active | 4.2 MB | 0.8 MB | 5.0 MB |
| 2 active | 5.1 MB | 1.6 MB | 6.7 MB |
| 3 active | 6.1 MB | 2.4 MB | 8.4 MB |
| 1 active + 2 retired | 4.8 MB | 2.4 MB | 7.2 MB |
| 3 retired | 4.2 MB | 2.4 MB | 6.6 MB |

**Timings** (headless Chromium on the development machine, season-20 save, `tools/storage-check.py`; *4× CPU* is Chrome's CPU throttling, an approximation of a mid-range phone, not a real device):

| | Desktop | 4× CPU |
|---|---|---|
| Migration (first start, to the menu) | 0.70 s | 2.8 s |
| Typical save (core changed) | 107 ms | 599 ms |
| Large save (archive re-packed, as at a season transition) | 195 ms | 965 ms |
| Load (reload to the menu) | 195 ms | 599 ms |

Part of each save runs on the main thread: the synchronous snapshot, packing the changed parts and unpacking them again to verify them (43.2). Compression runs in the browser's stream. v39.1 serialised and wrote 2.9 MB synchronously on every save; the debounce means a match no longer saves on every play.

**Measured again at the final audit** on a slower machine, the commit before the audit and the final commit back to back: they are equivalent. On the desktop the final commit is faster (typical save 159 ms vs 260 ms); on the 4× CPU it is close (typical save 0.84 s vs 0.66 s, archive save 1.3 s vs 1.2 s, migration 3.7 s for both, load 0.9 s for both). Timings depend on the machine, so these are comparisons, not phone figures.

**Risk:** on a throttled CPU a save that re-packs the core takes about 0.6 s and one that re-packs the archive about 1 s, and part of that time is on the main thread. Moving packing to a Worker is the follow-up if real phones show stutter at saves; it was not done in Phase 1, because verifying correctness came first.

### 43.10 Storage meter [IMPLEMENTED]
**Settings → Save data shows:**
- the save status;
- the cloud status;
- this franchise's stored size;
- the backups' extra space;
- the protected original;
- the v39.1 save left in place;
- the browser's estimate (`navigator.storage.estimate()`), with the caveat that it covers the whole site and may be rounded or padded;
- a warning when the browser offers under 100 MB or is over 80% used.

**Ask the browser to keep this data** calls `navigator.storage.persist()`. It is shown only while the data is not yet persistent, and the game says plainly that the browser may decline.

### 43.11 Parity [IMPLEMENTED: verified]
- **Two complete 20-season franchises,** seeds 1 and 2 (rookie), were run on unchanged `main` and on this branch. The full franchise JSON was compared at seasons 1, 5, 10, 15 and 20, excluding only `uid`, `lifecycle`, `createdAt` and `savedAt`.
- **Result: identical at every mark,** with the same RNG state. That covers outcomes, standings, champions, awards, progression, roster levels, the draft, gyms, the Board and season transitions.
- **No Board mechanic was touched.** The full suite passes (§43.12).

### 43.12 Tests [IMPLEMENTED]
- **`tests/storage-foundation.test.js`** (23 tests), through the in-memory backend, which has the same all-or-nothing transactions and injectable failures. It covers:
  - exact packing round trips, escapes and corruption;
  - migration, and interruption at each step;
  - an older build writing later, and saves past season 20;
  - ordering and no interleaving; stale-save refusal; another tab's newer save never overwritten, journaled over or deleted; changed-parts-only writes;
  - transaction failure and retry; quota;
  - rotation that never takes in a damaged version;
  - corruption recovery; restore and delete copies (three per kind); the weekly copy and its carry-over;
  - the journal; export integrity;
  - career, timeline, history and draft preservation;
  - uid assignment without the RNG.
- **Cloud mirror** (43.8), on a simulated store with delays, reordering, interruption and failures (`tests/helpers/cloud-sim.js`):
  - `tests/cloud-save.test.js` (14 tests): serialised writes, newest wins, offline and reconnect, the payload fixed when authorised, recovery past damaged, missing or interrupted snapshots, network errors never falling back to an older copy, no switching franchises, identity, v39.0/v39.1 copies on first run, old cached tabs, document size with worst-case text, a 20-season franchise and 40 uploads, a full cloud;
  - `tests/cloud-concurrency.test.js` (11 tests): simultaneous uploads, random delays (the copy read never goes backwards or disappears), delayed clean-up, interrupted uploads, deletion against in-flight, queued, throttled and stale uploads, a deferred deletion, clock skew, restore after deletion, identity aliases, the v39.1 copy of a deleted franchise, concurrent clean-up;
  - `tests/cloud-regressions.test.js` (3 tests), `tests/cloud-review-fixes.test.js` (7 tests) and `tests/cloud-codex-21c0829.test.js` (3 tests): the problems found in `cd1a849`, by the reviews and by Codex in `21c0829` (43.13).
- **`tests/storage-restore-safety.test.js`** (14 tests), **`tests/storage-interleavings.test.js`** (10 tests) and **`tests/storage-final-audit.test.js`** (14 tests): the review corrections, the invariants A–H and the final audit, see 43.13.
- **`tools/storage-check.py`:** the real IndexedDB in headless Chromium at 320, 360, 390 and 412 px. It checks:
  - migration identity and the untouched localStorage save;
  - reload from IndexedDB;
  - the Settings panel, meter and backups sheet;
  - a verified export download;
  - a refused write (quota): the failure sheet, an honest retry, recovery;
  - a closed connection reopened;
  - a damaged part stopping at recovery, then a restore;
  - the timings above, normal and 4× CPU;
  - with a simulated cloud: the start-up upload, restores, a delayed upload carrying only committed state, and deleting the franchise from the game (one marker, its snapshots removed, nothing adopted afterwards).
- **Not done: real iPhone or Android devices.**

### 43.13 Safety corrections after review (PR #43, 2026-10-23) [IMPLEMENTED]
Three defects found in code review (Codex), each reproduced by a failing test before it was fixed:

| Finding | Root cause | Correction |
|---|---|---|
| Restored franchise adopted before it was saved (P1) | `restoreBackup` replaced `app.f` and uploaded the restored state to the cloud before checking that the local commit succeeded. A failed restore said "Nothing was changed" while the game was playing the unsaved backup, and the cloud had it. | The restore commits first; adoption and the cloud mirror follow only a successful commit (`restoreThenAdopt`). Imports, the v39.1 weekly backup and the cloud copy use the same order (`replaceThenAdopt`). |
| Current save retired before its backup (P1) | `store.restore` marked the current franchise as replaced before the safety copy was written. When the copy failed, every later save of the still-active franchise was silently ignored until a reload. | Retirement happens only after both the safety copy and the new live save are committed. The queue is held during a restore or deletion, so nothing interleaves, and queued saves of the replaced franchise are dropped only on success. |
| Damaged `roll0` promoted over a valid `roll1` (P2) | Rotation verified the outgoing live save but copied `roll0` into `roll1` unchecked. | `roll0` is verified before promotion; when it fails, `roll1` is kept. |

**Found by the further audit and fixed:**
- Ordinary saves no longer mirror to the cloud ahead of the local attempt, nor from a stale tab.
- Deletion holds the queue, so a save queued meanwhile cannot bring the franchise back.
- In fallback storage, a replacement is written before it is adopted.

**Tests:**
- `tests/storage-restore-safety.test.js` (14). These cover:
  - restores failing at the safety copy, at the commit (abort, quota), on a corrupt backup and on another tab;
  - activation order and the cloud;
  - imports;
  - fallback storage;
  - the mirror policy;
  - playing on after failed restores;
  - corruption in each backup generation, shared and unshared;
  - deletion racing a save.
- `tools/storage-check.py` now also restores in the browser with a simulated cloud. Run against the commit before the corrections, it reported the same two failures as the review: after a failed restore the active franchise was the unsaved backup and the cloud had been written; after a failed safety copy, saving stopped.

**Second review (2026-10-23), four P1 findings on `089e4a4`, each reproduced by a failing test first:**

| Finding | Root cause | Correction |
|---|---|---|
| A stale tab could recreate a franchise deleted in another tab | The other-tab check needed a live manifest. After a deletion there was none, so the stale tab's save passed. It also reused cached parts that the deletion had removed, and committed a manifest pointing at missing data that reported success. | A missing manifest, when this tab had loaded one, is a cross-tab change: the save is refused with "changed or deleted in another tab". Every commit also checks, inside its transaction, that each referenced part is present and intact. A missing cached part is written again once, never referenced. |
| A delayed cloud upload could carry changes never saved locally | The cloud throttle kept the live franchise object and serialised it when the timer fired. | `cloudSave` fixes the payload when it is called. App saves pass the committed snapshot from the store, so the upload is exactly what was committed. Only a committed save authorises an upload, and each write first checks that the cloud does not already hold newer progress. |
| A cloud replacement could overwrite progress made during it | The check for local play ran before the asynchronous safety copy and commit, and the cloud copy was adopted afterwards whatever had happened in between. | A `guard` ("the player has not played on") is rechecked inside the store's exclusive operation, right before the commit and right after it. If it fails before, nothing is committed; if it fails after, the local state is committed back as the live save. The cloud copy is then not adopted. A failed safety copy stops the replacement. |
| Two exclusive operations could run at once | The lock was set only after awaiting the queue, so a second operation could pass the same check meanwhile. A restore also read its backup before joining the queue. | Exclusive operations join a promise chain synchronously, when they are called, and run in call order. Each rechecks whether its franchise was already replaced; if so it is answered "stale" and changes nothing. Saves requested before the call are written first. Saves requested after it wait and then run, or are answered "stale". The reservation is released in `finally`. |

**Invariants**, each tested with deterministic barriers (a gate holds a chosen IndexedDB transaction until released), not timing sleeps. Tests are in `tests/storage-interleavings.test.js` (10), `tests/cloud-save.test.js` (+2) and `tests/storage-restore-safety.test.js`:
- **A.** An unsuccessful local save never authorises a cloud upload.
- **B.** A failed restore or replacement never changes the active franchise.
- **C.** A stale tab never recreates deleted or superseded state.
- **D.** Two exclusive storage operations never overlap.
- **E.** A successful storage operation never references missing or corrupted parts.
- **F.** Newer local progress is never silently replaced by older cloud progress.
- **G.** A failed backup never disables ordinary saving.
- **H.** No failed operation reports success.

**In the browser.** `tools/storage-check.py` now also deletes in one tab and saves from another, and lets a throttled cloud upload fire after the franchise has changed. Against `089e4a4` it reported both defects: the upload carried the unsaved change, and the stale tab reported success and wrote a manifest after the deletion.

**Codex review of `21c0829` (the snapshot redesign, completed 2026-10-23), three findings, each reproduced by a failing test first (`tests/cloud-codex-21c0829.test.js`):**

| Finding | Root cause | Correction |
|---|---|---|
| (P1) Closing the page while a deletion waited for a stalled upload lost the deletion | The deletion was recorded on the device only after waiting | Recorded (with the "just deleted" flag) before waiting for anything; the cut-off can still rise to cover a newer copy the cloud holds |
| (P1) A deletion landing while a reader assembled a snapshot was missed | Markers were read only before the chunks | Markers are read again after a snapshot is assembled; a voided one is not returned |
| (P2) When the retry after a full cloud also failed, its partial snapshot stayed | Only the first attempt was removed | Every failed attempt removes its own uncommitted snapshot |
| (found while fixing) An upload from before a deletion, finishing after it, cleared the "just deleted" flag | The flag was now set before waiting | Only an upload authorised after the deletion clears it |

**Codex review of `cd1a849` (completed 2026-10-23) and the cloud redesign.** Two findings, plus a third problem of the same kind found while checking them. Each was reproduced by a failing test (`tests/cloud-regressions.test.js`, written against behaviour only, so the same file failed on `cd1a849` and passes now):

| Problem | Root cause | Correction |
|---|---|---|
| (P1) Deleting the franchise in one tab was undone by another tab's or device's upload already in flight | The deletion was local to the tab (`epoch`) and only removed the pointer | Deletion markers with a cut-off fixed at deletion time (43.8) |
| (P2) A reader that lost its generation to clean-up while reading reported an empty cloud | One pointer read, no retry | The reader tries the next complete commit and lists again |
| (found) A delayed publish of an older copy, arriving after the newer upload had released the lock, replaced it (the cloud copy could become unreadable) | An expiring lock cannot fence a late request | No lock: append-only snapshots, nothing is ever overwritten |

The owner approved replacing the lock-based mirror rather than patching it again. The design was reviewed by a separate agent before and after implementation:
- **First review** (3 critical, 3 major): deletion by timestamp broken by clock skew; one franchise under two identities; clean-up trusting a commit whose chunks had been removed; a failed deletion forgotten; the reader switching franchises; quota freezing the mirror. Addressed by matching on `uid` or `createdAt`, a local deletion record with retry, clean-up limited to rules (a) and (b), and a reader restricted to the device's franchise.
- **Second review** (2 critical, 2 major, in a "revive" mechanism added for restored franchises): a late deletion wiping a revived franchise; a revived franchise left unreadable. Addressed by removing the mechanism: the cut-off is fixed at deletion time, so later progress is never invalidated. Also: quota eviction limited to keeping each franchise's newest commit, and identity fields must be non-empty.
- **Review of the code** (`tests/cloud-review-fixes.test.js`, each reproduced first):

| Finding | Correction |
|---|---|
| A franchise with neither `uid` nor `createdAt` could never be cleaned up or deleted | Not uploaded; the status says so |
| A full cloud hit mid-upload could not free room for its own retry | The failed, uncommitted attempt is removed before the retry |
| Two tabs of one browser could overwrite each other's not-yet-written deletion record, and the "just deleted" flag | localStorage is always read and records are merged by id; memory is used only when storage is blocked |
| A v39.1 copy without `createdAt` was never offered on first run | Offered to the device; the game compares dates |
| The leftover sweep had no test | Tested |

**Codex review of `da63189` (completed 2026-10-23), three findings, each reproduced by a failing test first:**

| Finding | Root cause | Correction |
|---|---|---|
| (P1) An upload stalled past its lease while publishing could overwrite the newer copy published meanwhile (in the test the cloud copy became unreadable: the newer upload had already removed the stalled one's chunks) | The lease was renewed before the meta read and write, but the write itself was unconditional | The lease is held on `save_meta` and the meta is published through the lease grant, which the store applies only to the current holder |
| (P1) Deleting the franchise did not cancel an upload waiting to retry after a busy lease, so it could bring the deleted franchise back | The retry timer kept its payload outside the throttle and queue that deletion clears | Deletion cancels the retry, and uploads authorised before a deletion are void |
| (P2) A journal that failed to load because of a passing read error was deleted, losing the unsaved progress it protected | Every journal not adopted was cleared | A matching journal that could not be read is kept for the next start |

**Codex review of `af5255d` (completed 2026-10-23), two findings, each reproduced by a failing test first:**

| Finding | Root cause | Correction |
|---|---|---|
| (P1) Cloud clean-up running past the lease could delete a new lease holder's chunks | No lease renewal or ownership check after the last chunk: not before publishing, not during clean-up | The lease is renewed and confirmed before publishing and before every deletion. An upload that lost it stops |
| (P2) The startup snapshot could be read while another tab committed, and then mirror stale state | `base` was checked only before the asynchronous read of the parts | The live manifest is read again after the snapshot is built. It must still be the same one this tab knows, or nothing is mirrored |

**Codex review of `7e73413` (completed 2026-10-23), three findings, each reproduced by a failing test first:**

| Finding | Root cause | Correction |
|---|---|---|
| (P1) A deletion could remove a save another tab made while the deletion copy was being written | The cross-tab check ran before the copy; the deleting transaction deleted unconditionally | The check is repeated inside the transaction that deletes |
| (P1) The cloud newest-write check was not atomic: concurrent uploads could publish an older copy last, or mix chunks | Read-then-write on a last-writer-wins store, with chunk keys shared by every upload | The upload lease plus generation-specific chunks (43.8). Tests: `tests/cloud-concurrency.test.js` (4) |
| (P2) An empty or older cloud copy got no upload at start | Startup relied on a save to produce the upload, and a save that changes nothing writes nothing | Startup uploads a verified snapshot of the committed save (`committedSnapshot`), writing nothing locally |

**Final audit (2026-10-23, `f7ba186`).** Codex's review of `f7ba186` did not complete; it showed "running" for over an hour. An independent audit of the whole save system found eight more problems, all reproduced first by `tests/storage-final-audit.test.js` (10 tests, 9 failing on `f7ba186`):

| Problem | Correction |
|---|---|
| An idle second tab's leave-save made it the newest writer, locking the played tab out of saving | A save that changed nothing writes nothing. A tab returning to the front checks at once and warns (Reload or Export) |
| A journal written while a save was mid-commit was discarded once that save committed | A journal built on an earlier save by the same tab is accepted |
| One journal key for all tabs: a stale tab closing could erase the live tab's journal | One key per tab. The newest qualifying journal wins, the rest are cleared |
| Onboarding switched to the new franchise before its safety copy and commit, so a failure could lose the old franchise | One commit-first path for every activation, onboarding included |
| A cached v39.1 tab's save, stamped later, replaced newer IndexedDB progress, and could erase it if the backup failed | Keep both, adopt neither (43.5) |
| A tab that opened on an empty slot could overwrite a franchise created in another tab | The empty slot is part of what a tab remembers: one cross-tab rule (43.4) |
| A cloud copy taken on an empty device skipped its post-commit check | The check applies with or without a current franchise |
| The status could stay at "Saving…" after a restore dropped a late save | The status settles when the queue empties |
| (minor) Emergency export was refused when the franchise failed its own check | Never refused (43.7) |

**Simplified along the way:**
- One `matchesBase` rule replaces three separate cross-tab checks and the same-writer sequence check.
- One activation path (`replaceFranchise`) replaces the separate onboarding path.
- The legacy re-adoption path (re-migration, `pre-legacy` copies) is gone.
- Two tests that asserted less than their names claimed now exercise the real code: the same-writer stale save, and saves queued during an exclusive operation.

**Known cosmetic issue, not fixed in Phase 1:** the save status shows a time without a date ("✓ Saved on this device 10:13 AM"), so a save from an earlier day reads like today's. Display only.

**Remaining risks after Phase 1:**
- **Real devices.** Real-device testing has not been done.
- **Save speed.** Saves take about 0.7–1.3 s on a 4× throttled CPU, partly on the main thread.
- **Stale tabs.** A tab behind another must be reloaded; it warns.
- **Cloud and v39.1 clients.** Concurrent cloud uploads from a v39.1 client (which ignores the lease) can still race with v39.2 uploads. Local saves are unaffected, and an older cloud copy never replaces newer local progress.
- **Cloud after a failed save.** A failed device save no longer goes to the cloud (invariant A); Export keeps it.

### 43.14 What remains for Phases 2–4 [Phase 2 IMPLEMENTED in §44; Phase 3 in §45; Phase 4 in §46]
- **Phase 2:** implemented in v40.0 (§44): slots 2 and 3 and the slot manager, the import flow, the lifecycle states, retirement and the archive, the 20-season limit, Hall of Fame and achievements keyed by `uid` (kept in localStorage with their mirrors rather than moved into the `global` store, which stays reserved), and the cloud policy (decision O, approved).
- **Accepted residual risks of the cloud mirror (43.8):**
  - a device whose clock runs ahead of the deleting device's by more than the time an upload is in flight could keep that one in-flight copy valid;
  - a franchise restored on a device whose clock runs behind the deleting device's is not backed up until its clock passes the cut-off (the status says "deleted");
  - progress made on a device still running v39.0/v39.1 after the franchise's first v39.2 snapshot is not picked up by other devices until that device updates;
  - leftover chunks are swept only when 30 or fewer snapshots are listed;
  - the total-size cap of the store is not documented; a full cloud is reported and never affects the device's save;
  - the simulated store answers each listing atomically; the design does not depend on consistent listings for safety (a listing that misses documents removes less), but a reader shown an incomplete listing could choose an older complete copy.
- **Phase 3:** persistent AI rosters and schema 8, implemented in §45. **Phase 4:** career integration (§42.11), implemented in §46.
- **Phase 1 lays the ground for these:** `uid` on every franchise, the slot pointer, verified backups, a storage version on every record, and room in the measured budget.

## 44. Franchise lifecycle — Phase 2 of §42 (IMPLEMENTED 2026-10-23; branch `franchise-lifecycle`, v40.0)

Phase 2 builds the three-slot save manager, the 20-season career, retirement and firing into a read-only **Franchise Legacy**, Hall of Fame and achievement records keyed by the permanent franchise `uid`, export and import for slots, and migration from v39.0 and from Phase 1. It uses Phase 1's storage (§43) and introduces no second storage system. Nothing in Phases 3–4 (persistent AI rosters, schema 8) is touched.

### 44.1 The three slots [IMPLEMENTED]
- **One store per slot** over the one database (`createStore({ slot })`, §43.3). Every record carries its slot (`slot<n>` saves, `<n>:kind` backups); the backup list, the unload journal, the storage figures and the legacy migration are scoped to the slot. The v39.0/v39.1 localStorage save belongs to slot 1 only (§42.9).
- **The slot manager** (`src/franchise/slots.js`) reads every card from storage, never from memory: state (`empty`, `active`, `retired`, `fired`, `migrating`, `damaged`), the save's summary (club, owner, season, week, record, competitive tier, titles), the Legacy headline for an archive, the last save time, the stored size and the backup count. The slot being played is a small localStorage pointer (`gridiron-beast-v7-active-slot`; absent means slot 1, where the Phase 1 and legacy saves live).
- **The Franchises screen** (main menu → Franchises; also where "Start a New Franchise" leads when a slot must be chosen): three cards with the actions of §42.5. Playing another slot saves and leaves the current one in place, opens the other slot's store, and reconciles it with the cloud. A card's record and competitive tier (league/division; the promotion-relegation data model stays switched off, `TIERS_ENABLED`) come from the manifest's summary, so older manifests show what they have.
- **Rule 2 of §42.1:** a new franchise or an import needs an empty slot; with none, the owner is told to delete or export one first. There is no overwrite button.

### 44.2 The 20-season career and retirement [IMPLEMENTED]
- **`src/franchise/lifecycle.js`:** `SEASON_CAP = 20`. `startNextSeason` refuses a 21st season with the retirement reason (`cap: true`), after the board's own refusal when fired. Retirement is **due** only after a complete season: `fired` (the board), `season-cap` (20 complete seasons; a franchise already beyond the cap finishes its current season first, decision M), or `voluntary` (the owner asked; available once the Hall of Fame checklist is met, decision R; it takes effect at season end and can be cancelled until then).
- **The checklist** (§42.4) is verified before anything is written: season finished, a Beast Bowl champion, awards written, the season in the history with its tables archived, the records book and League News written, no game in progress, no scene waiting. If it fails, nothing changes and the player is told what is missing.
- **The steps:** the Hall of Fame card is built when the checklist is met (decision L); the **Legacy summary** is built from the save's own records (owner and club, seasons and record, titles and playoff appearances, badges, league awards, records held, the five best monsters with career snapshots, the rival head-to-head, the Board's goal history, a season-by-season table); working-only state is dropped (draft, offseason market, recorded-game keys, the week's working content, scenes); the lifecycle record is written (`status`, `seasonsCompleted`, `finalSeason`, `retiredAt`/`firedAt`, `legacy`); the archive is committed **once** and mirrored once. **Deviation from §42.4 step 3:** the final season's monster books are not rolled over into the archived seasons (the stats readers assume one current book); the game lines stay in the final season's books as they do in any offseason. Nothing is lost by it.
- **Read-only, two layers.** Every mutating export of `franchise.js` (`MUTATORS`, 80 functions: seasons and days, the week, match and Clash, roster and depth, staff, offseason, draft and trades, board and story, achievements, dex, news, retirement) is wrapped by one guard that returns the read-only error for an archive; a test calls each against an archive. Independently, the store refuses to commit any different content over a committed archive of the same franchise (`code: 'read-only'`), and `app.save` refuses too, so a missed path could not persist a change. An archive is defined as a franchise carrying its Legacy record: Phase 1's `status: 'fired'` without one is a franchise the board fired whose season is then settled and archived.
- **Firing** no longer deletes the franchise: when the board lets the owner go and the season is settled, the same steps run with reason `fired`, and the slot becomes a dismissed archive ("Dismissed after N seasons"). The Hall of Fame card is written when eligible, as before.
- **HQ** shows the due retirement as the next step (Season 20 complete, a planned retirement, or the board's dismissal) and the Retire button once eligible; an archive never opens HQ: it opens the Legacy shell.

### 44.3 The Franchise Legacy shell [IMPLEMENTED]
`src/ui/screens/legacy.js`, read-only, five tabs: **Legacy** (the summary, the Hall of Fame card when written, the best monsters' snapshots, badges, the season table), **Seasons** (every season with its awards sheet and, for a title, the ceremony; final standings and schedule), **League** (the records book, standings, League News of the final season, the schedule), **Roster** (the final roster with career links), **Careers** (every monster's timeline, trophy case and card through the existing read-only career sheets). Export works from the shell. The only state it keeps is the last tab, outside the archive record. Fields the save does not record (Beast Bowl appearances beyond titles) are shown as not recorded, never invented.

### 44.4 Export, import and deletion for slots [IMPLEMENTED]
- **Export** is Phase 1's verified plain-JSON `.gbfranchise` (decision Q as revised: plain JSON everywhere; inside claude.ai through the platform's file-saving permission, named `.gbfranchise.json`, §43.7). An archive exports like any franchise.
- **Import** (Franchises screen, an empty slot's "Import a file", or Settings): validated on a copy (§43.7), then a preview (club, owner, season, status, size, `uid`), then the choice of an empty slot. A file whose `uid` already occupies a slot is offered **Replace slot N** (which runs the delete flow first) or **Import as a copy** (a new `uid`). With no empty slot the owner must free one first. Nothing is replaced silently, and a failed import changes nothing.
- **Deleting** (§42.5): the sheet names the franchise, its seasons and stored size, offers **Export first** and shows its result line, then needs the club's name or DELETE typed before **Delete forever** is enabled. The slot record is cleared in one transaction; the deleted copy stays among the slot's backups (Phase 1's `deleted` kind); **Undo delete** is offered on the Franchises screen for the launch that deleted (decision N: a new launch withdraws the offer; the backup itself remains, restorable from the empty slot's "Restore a backup"). Deleting also voids the franchise's cloud copies (§43.8 markers). A failed deletion changes nothing and says so.

### 44.5 Identity: Hall of Fame, achievements, dex [IMPLEMENTED]
- A new franchise gets its `uid` at creation (`createFranchise`), so every record it writes carries it from the first week.
- Hall of Fame cards carry `uid` (and the seed) and their id is `hof_<uid>_…`; achievements record the franchise as `uid`. Records are read per franchise by `uid` (`hofCardsFor`, `achievementsFor`): two franchises with the same club name never share history, and a new franchise never inherits another's.
- **Older records** (written by seed before franchises had a `uid`) are linked to their own franchise when it is loaded (`linkHofCards`, `linkAchievements`: a record naming that seed and no `uid` gets the `uid`; anything already linked or naming another seed is untouched; counts do not change). Nothing is invented and nothing is moved.
- The dex stays player-wide (it never named a franchise). The Hall of Fame, achievements and dex stay in localStorage with their cloud mirrors, as in Phase 1.

### 44.6 Cloud mirror for three slots (decision O) [IMPLEMENTED]
- Phase 1's snapshot design (§43.8) already keeps copies per franchise, so every slot's franchise is protected as before. The reader for a slot considers only that slot's franchise; an **empty slot** on a new or wiped device is offered the cloud's franchises on the Franchises screen (a small display summary rides on each commit), and never silently loads a franchise another slot of the device already holds.
- **Archives are uploaded once.** The archive commit carries `archive: true`; one archived commit above a snapshot retires it, so a retired or fired franchise costs one verified cloud copy. No further uploads happen (the franchise is read-only), and the newest copy of a franchise is never evicted under quota pressure. Deletion markers and the other Phase 1 protections are unchanged.

### 44.7 Migration [IMPLEMENTED]
- **From v39.0 (today's players):** Phase 1's copy-verify-switch migration runs for slot 1 only; slots 2 and 3 open empty; the localStorage save stays untouched. An interrupted migration resumes at the next start (the slot record says `migrating`; the Franchises screen shows it).
- **From Phase 1 (v39.2 test builds):** the save is already slot 1; nothing is rewritten. The pointer defaults to slot 1.
- Hall of Fame, achievements and dex are not moved; records are linked by `uid` when their franchise loads (44.5).

### 44.8 Developer shortcut for test builds [IMPLEMENTED]
`BUILD.test` is `false` in the repository and in every release. A private test publish flips it, which enables one Developer-screen tool: play the current season to its end (or five seasons) headlessly through the game's own functions, so a Season-20 retirement can be reached on a phone in minutes (`src/franchise/dev-shortcut.js`). The released game never shows it; a test asserts the flag is off.

### 44.9 Tests [IMPLEMENTED]
- `tests/slots-store.test.js` (5): three independent slots, slot-scoped backups, journals and usage, legacy migration in slot 1 only.
- `tests/lifecycle.test.js` (7): the cap, when retirement is due (never mid-season; grandfathering), the checklist, the archive and its Legacy, every mutator refused, firing, the store refusing changes to an archive.
- `tests/uid-isolation.test.js` (2): same club name, separate records; older records linked to their own franchise only.
- `tests/slot-manager.test.js` (7): a v39.0 device into slot 1 of three, an interrupted migration resumed, a Phase 1 device unchanged, capacity and `uid` lookup, archive summaries, undo delete for one launch, the pointer.
- `tests/slots-cloud.test.js` (5): per-slot cloud copies, archive once, archives never evicted, empty-slot offers excluding held franchises, deletion.
- `tests/phase2-build.test.js`: the test flag is off in the repository.
- `tools/lifecycle-soak.mjs`: a real 20-season career ending in a valid archive (run for seeds 1 and 2; results in the test plan).
- `tools/storage-check.py`: the Franchises screen, creating in slot 2, switching, the delete flow (disabled until typed, undo), import as a copy into slot 3, archiving slot 1 and the Legacy shell's five tabs, at 320, 360, 390 and 412 px.

### 44.10 Not in Phase 2
Persistent AI rosters and schema 8 (Phase 3, since implemented in §45); league-wide AI careers and duplicate-data removal (Phase 4); compressed archive records beyond Phase 1's per-part compression (decision P is met by the stored form; a dedicated archive compaction is left for when sizes require it); real-device checks (decided by the owner at release time).

## 45. Persistent AI rosters — Phase 3 of §42 (IMPLEMENTED 2026-10-24; branch `persistent-rosters`, v41.0)

Phase 3 makes the 15 AI clubs real franchises inside each universe: their monsters are permanent objects that play, develop, evolve, get hurt, sign, walk, are drafted, traded and released by the owner's own rules, and the two kinds of monster the owner declared untouchable (gym legendaries and rival signature monsters) stay where they are for all 20 seasons. Difficulty is held to today's curve by measurement against today's generator, which is kept in the code for exactly that purpose. Nothing in Phase 4 (league-wide career presentation, AI–AI trades, duplicate-data removal) is touched.

### 45.1 The league registry [IMPLEMENTED]
- **`src/franchise/league-registry.js`:** `f.league = { v, persistentFrom, ids, clubs, monsters, waivers, legends, staffAllowance }`. `clubs[club] = { roster: [ids], protected: [ids], strategy: { slow, boost, pre, grew } }`; `monsters[id]` holds one object per AI monster, never on two clubs; `legends[id]` holds the compact stub of a decorated monster who left the league; `waivers` is the league's own list of castoffs (§45.4). The owner's roster stays `f.roster`, the regional pools stay `f.pool`.
- **Ids are unique in the universe.** Every id ever issued is recorded (`ids`, a space-separated string of the 32-bit parts, about 8 bytes an id; about 2,400–2,500 ids by Season 20, 20 KB raw). `claimMonster` registers a fresh monster's id and re-keys it deterministically on a clash; it is called wherever a monster is generated (draft classes, scouting prospects, the offseason market, developer grants, league arrivals). Measured on `main`: today's generator repeats an id about 90 times in 11,400 across 20 seasons, which persistence could not tolerate; the registry makes the §42.3 guarantee real.
- **`aiTeam` reads the registry.** With a registry a club's team is built from its live roster (`buildTeam`: injuries and fatigue now matter for AI clubs), with the same coach, playbook, scouting adaptation and Legendary Play rules as before. Without one (a save not yet migrated, the baselines) `legacyAiTeam`, today's generator, is used unchanged.
- **Books.** Every AI monster keeps season and career totals through `recordGame` (the box-score keys of §41.1, no game logs: decision G); the league tables keep every key for the current season as before. Books roll over at each `startSeason`.

### 45.2 Protected monsters [IMPLEMENTED; owner's rules of 2026-10-23 and 2026-10-24]
- **Who:** a gym's legendary (`legendary: true`) and the rival GM's signature monster (`signature: true`), listed in the club record's `protected` and recognised by `isProtected` everywhere a monster can move or go: the registry's `removeFromClub` (throws `code: 'protected'`), `releaseFromClub`, the cap trim, the contracts pass, free agency, the pools and waivers, draft-day room, the nudge's releases, pruning, and trades (`tradable()` in `trades.js`; `executeTrade` refuses outright).
- **Permanent deals:** `contract = { permanent: true }`; they never expire, never walk, never re-sign.
- **The cap exemption (decision U):** a protected monster's salary is excluded from the club's counted payroll (`clubPayroll`), so a club is never over the cap because of him; every other monster counts, and the club is trimmed to the cap like any other. The owner's cap rules are unchanged.
- **Ageless:** `progression.offseason` skips the age increment and the decline for every legendary (the owner's included, decision T) and for the signature monster; they still gain a season of experience, rest, heal, play, gain XP, level and evolve. An owner-held legendary is otherwise an ordinary roster monster: the owner may trade or release him.
- **Signature progression (decision V):** `growSignature` adds 2 points a season to the attributes his position weighs most, never past his potential or 99. Measured over 20 seasons (seed 2, Pro): the signature monster reached his potential ceiling at 90 OVR by season 5 and stayed there; the rival club's team overall stayed within one point of, or below, today's generator's figure for it in every season.
- **No succession:** when nothing happens to them, nothing needs replacing. They keep their ids, books, career events and history for the life of the franchise and into its archive.

### 45.3 Development, injuries and the weekly loop [IMPLEMENTED]
- After every simulated league and playoff game both AI rosters go through `afterGame` with the club spending points and evolving when ready (decision B); after the owner's Sunday game the opponent does too. Injured AI monsters sit out; `recoverWeek` runs for the 15 rosters once a week.
- **Cover:** a club that injuries leave without a legal lineup signs cover before the next week (`leagueInjuryCover`): from the waivers or the pools at the position, else a replacement-level regional veteran, after making roster and cap room among its unprotected spares. The owner faces the forfeit rule instead (§17.2); an AI club behaves as a club would.
- `poolActivity` keeps the weekly 15% chance per pooled (and waived) monster, but the signing club is now the one that needs his position most with roster room and cap room, and he really joins it.

### 45.4 The economy [IMPLEMENTED; decisions A, D, F]
- **Contracts** (`league-season.js`, at season end): expiring deals re-sign for starters (on the depth chart) and value (at or above the roster's median, or 25 or younger with potential 5+ above his overall) at `renewalAsk`, two seasons; a reserve of 32 or more is not re-signed; everyone else walks. A club far above today's strength (§45.6) also lets its expiring veterans of 27 or more go (attrition, decision A). Then the cap: a club over it releases its lowest value per salary among the unprotected reserves until under, never below 26.
- **The cap for AI clubs (decision D, X):** the tier cap less a fixed staff allowance equal to the default staff's salaries (`STAFF_ALLOWANCE`, 405,000 cr), less the counted payroll. A full 38-monster roster at today's qualities costs 1.29 M cr in season 1 and 1.52 M cr by season 20, so AI clubs carry 30–38 monsters and cheaper depth as the seasons pass, the owner's own problem. The trim runs after the salary refresh of the ageing pass and again after the nudge; a club that cannot get under at the roster floor is reported in `f.leagueOffseason.overCap` (0 clubs in every 20-season run), never silently tolerated and never a reason to block the owner's season.
- **The draft:** AI picks join their clubs' registry rosters on rookie deals (70% of market, two seasons, `contract.rookie`); a full club releases its weakest unprotected spare at the rookie's position to make room (at the creation draft the displaced monster simply never existed). Older `draftResults` classes stay as the history they are (decision AA); new picks are not written there, and a draft history reads `m.drafted`.
- **Free agency after the owner (decision F):** when the owner starts the next season, each club in a fixed order fills its needs toward the full 38 from the league's waivers first, then the pools (the best monster at the position it can afford), then generated regional veterans whose quality follows the club's `clubQuality` for the coming season (how today's curve is carried, §45.6), never over the cap; a club short of a legal lineup signs at the minimum quality regardless.
- **Exits and the owner's market:** a walked or released AI monster goes to his region's pool only at the owner's market grade (60 OVR or less, and worth having: 52+ or 24 or younger); a better one goes to the league's **waivers** (40 at most), where AI clubs claim him weekly and in the offseason. A regional pool holds at most 3 AI castoffs (the oldest leaves the league), so the owner's offseason market stays about the size it is today. Whoever leaves the league is pruned unless decorated (a league award, a record, a title run, read from the save's own award history, records book and champions, never from the Career Timeline, which must not change what the game does), in which case a legend stub (identity, final ratings, career totals, honours, major career events; about 0.8 KB) keeps awards, records and News resolving.
- **Trades:** the owner's asks and the clubs' calls read the real rosters; an accepted deal moves the very monster into `f.roster` with his books, career and history (the club's roster is one lighter); `aiTransfers` is no longer written. A monster on his rookie deal, a cornerstone and a protected monster are never offered. AI–AI trades remain Phase 4 (decision E).

### 45.5 The season transition [IMPLEMENTED; §42.6 order]
At season end (`endSeason`): career season-end events for every AI monster (`careerSeasonEnd`, the owner's writer); the clubs' growth over the season is measured; contracts and the cap. At the next start (`startNextSeason`, after the owner's own offseason, draft and market): ageing with the ageless exemption; a cap trim after the salary refresh; free agency; the balance nudge; a cap trim and injury cover; validation (`validateClubs`: 26–38, a legal lineup, under the cap, protected monsters in place and on their permanent deals); the registry's structural check (`verifyLeague`), the only failure that stops the season, because it would mean a damaged save. The books roll over in `startSeason`. The transition is recorded in `f.leagueOffseason` (its duration, 72–109 ms in node for 15 clubs, is kept out of the save: `leagueTransitionMs()`). Today's generated strength for the coming season is computed once at the season end (`strategy.today`) and reused by the contracts, the nudge and the Board's forecast, so no team is generated twice.

### 45.6 Competitive balance [IMPLEMENTED; decisions C and Y; measured]
- **The target is today's generator.** `clubQuality` is unchanged, and `legacyAiTeam` is kept as the yardstick: for every club and season the game can build the team today's generator would field and measure its overall. Per-club identity (the fixed −4…+4 offset, gym tiers and growth, the rival's +2, the title floor) therefore carries over unchanged, and clubs never converge.
- **The measured problem and its fix.** Persistent monsters gain levels as they play; today's rosters never move within a season. Measured on `main`, a club that opened a season at today's strength ended it 4–5 points above it in its first season and 1–2 later, and the owner's win rate fell from 58% to 44% (Pro, 6 seeds × 6 seasons). Each club's in-season growth is therefore measured (`strategy.pre` at the start, `grew` at the end) and `LIFT_SHARE` (0.75) of it is taken off the club's preseason target, so over a season the club is as strong as today's would be; a new universe's rosters open `CREATION_LIFT` (3 quality points) under today's year-1 quality for the same reason. The Board's forecast and Coach of the Year keep reading preseason talent from today's generator, so their calibration is unchanged (a first study without this read the live rosters and fired the owner three times as often on All-Star).
- **The nudge (`leagueNudge`, decision C):** after free agency, a club more than 4 points below its target signs up to three generated regional free agents at the target at its weakest starting groups (making room among its unprotected spares); a club more than 4 above it develops at 75% of the XP for the season (50% when 3 or more above) and, at the season's end, lets its expiring veterans go. No rating of an existing monster is ever edited (decision Y). Protected monsters are never touched by any of it; the brake does not apply to them.
- **Results** (`tools/balance-compare.mjs`, the same seeds hands-off with the registry and with today's generator, 8 seeds × 8 seasons per difficulty):

| Difficulty | Owner win rate: today → registry | AI mean team overall at mid-season: today → registry | Owner playoff rate | Firings (seasons played) | Distinct champions per 8 seasons |
|---|---|---|---|---|---|
| Rookie | 64.1% → 64.0% (−0.1) | 64.0 → 64.8 (+0.8) | 68.8% → 71.0% | 3 (48) → 1 (62) | 3.4 → 5.5 |
| Pro | 54.8% → 57.1% (+2.3) | 67.1 → 67.2 (+0.1) | 48.2% → 70.3% | 2 (56) → 0 (64) | 4.0 → 5.0 |
| All-Star | 38.1% → 33.6% (−4.5) | 70.7 → 69.9 (−0.8) | 7.8% → 14.3% | 2 (51) → 4 (42) | 4.0 → 3.5 |

  The agreed bands hold on every difficulty: the owner's win rate within ±5 points (−0.1, +2.3, −4.5) and the AI clubs' mid-season mean within ±2 (+0.8, +0.1, −0.8); the season-end mean sits 0.0–1.3 above today's, the price of the in-season growth that is now real. The rival's club finished each study within 0.4 of its generated strength. The owner's playoff rate on Pro rose more than the win rate suggests because the hands-off owner sits on the qualification line (about 5 wins in 9), where two points of win rate move many seasons across it; the spread of AI records (standard deviation 2.1 wins against 2.2 today) and the playoff cut (4.3 wins in both) are unchanged. Titles spread over more clubs on Rookie and Pro: persistent clubs have real injuries and real depth, so the generated powerhouses no longer win by rote. Firings differ by one to two in 40–60 seasons, within the noise of a hands-off owner.
- **Twenty seasons** (`tools/league-soak.mjs`): seed 2 on Pro and on Rookie, 20 seasons each, every weekly invariant held for 16 clubs; the AI clubs' mean team overall stayed within 2 points of today's generator in every one of the 20 seasons (Pro: +1.7 in season 1 to −1.4 in season 20); the rival's club at or below its generated strength; every protected monster on his club, same id, same age, all 20 seasons; no club over the cap at any season start.

### 45.7 Schema 8, migration and protection [IMPLEMENTED; decisions W, AB]
- **Schema 8** is a franchise that carries `f.league`; `Save.migrate` reads 6 and 8, verifies a registry it finds (a damaged one is refused with `code: 'league'`, as is an 8 without its registry), and never captures by itself, so backups, cloud copies and imports are shown as they are. Storage version 7, the manifests, parts, journals, backups and the cloud mirror are unchanged: the registry lives in the `core` part.
- **Capture (`ensureLeague`):** a new franchise gets its registry at creation; an active save from v40 or before gets one the first time this build adopts it, built from the very rosters `legacyAiTeam` would field that week (draftees injected, traded monsters removed; the monsters are copies, so `draftResults` keeps its history), with `persistentFrom = { year, week }`, contracts staggered so half end this season and half next, and each monster's season book opened from his current table row (decision J: earlier seasons stay table-only). Every id already in the save keeps its place; a captured monster whose id clashes is re-keyed and the current season's table rows and club-log lines follow. The capture is verified on the copy (15 clubs resolved, no id on two clubs, every protected monster listed, each club's team overall identical to the generator's) and rolled back on any failure, in which case the game plays on with today's generator and says so in the boot notes; it never blocks the franchise from opening. At start the slot keeps the save as it was as a named backup (`pre-league`, restorable from Settings → Save data); restores, imports and cloud copies keep the previous franchise by their own rules. Archives are never migrated.
- **Compatibility (decision W):** a v39/v40 build cannot read a schema-8 save (`migrate` returns null and the game stops at recovery, nothing destroyed). The private test link and the normal game therefore never share a franchise until the normal game is upgraded with this migration.
- **Archives:** `compactForArchive` drops the waivers and the transition record; the rosters, books and legends are part of the Legacy. The read-only guard covers `ensureLeague` (81 mutators), and a Season-20 soak ends in a valid archive with its registry intact (`tools/lifecycle-soak.mjs`, seed 2 rookie: 94-86, one title, ten playoff runs, a Hall of Fame card, 451 KB stored).

### 45.8 Storage and time [IMPLEMENTED; measured]
- **Season 20, one active slot** (seed 2, the packed logical payload of decision Z): **1.89 MB packed** (Pro and Rookie alike), 3.9 MB raw, 450 KB stored; of which the registry is 0.64 MB packed (1.48 MB raw, 168 KB stored). Under the §42.11 target of 2.7 MB ±25% (the GDD's +1.1 MB estimate came out at +0.5 MB packed, because AI books keep the box-score keys only and departed monsters are pruned).
- **Time:** a 20-season hands-off career takes 206–212 s in node, the same as before Phase 3 (the 14 simulated games a week dominate; building a team from the registry is cheaper than generating one). The season transition, measured in headless Chromium on a season-5 save: the league's own work (ageing, free agency, the nudge, trims, cover, validation) takes 68 ms, 293 ms at 4× CPU throttling, inside the 0.5 s target; the whole `startNextSeason` (the owner's offseason, the league, the new season's schedule, books and expectations) takes 149 ms, 634 ms at 4×, against 130 ms and 519 ms for today's generated league on the same save: about +115 ms throttled for a persistent league.

### 45.9 Tests [IMPLEMENTED]
- `tests/league-registry.test.js` (8): a new universe (15 × 38, ids unique, protected listed on permanent deals, schema 8); ids (clash re-keying, existing ids remembered, `issueId`); one monster on one club, protected never removed, released, pooled or traded; the cap exemption and the staff allowance; migration mid-season (the same monsters, ids and lineups, an injected clash re-keyed with its table row, the owner's side untouched, the season played on under the Phase 3 invariants, AI contracts at season end); an archive never migrated and a failed capture leaving the save as it was; schema 8 round trips and refusals; the pools, waivers and legend stubs.
- `tests/league-season.test.js` (5): ageing exemptions (the owner's legendary too); signature growth within the caps; contracts, walks and the cap trim with every protected monster untouched; free agency to a legal 38 under the cap and the nudge lifting the weak and braking the strong without a rating edit; three seasons with every protected monster on his club at his age and the signature stronger.
- `tests/league-flows.test.js` (5): injury cover within the cap; the owner's market no bigger than today's; migration at the offseason and mid-draft; a trade moving the real monster; a retirement archive keeping the registry read-only.
- Existing tests updated for persistence: `franchise.test.js` (draftees in rosters, the signature as one individual, `tradable()`), `species.test.js` and the Legend Tracks test (today's generator for the generated-roster assertions), `stats-filters.test.js` (the most-played monster), `career-presentation.test.js` (another club's player now has a full profile; a title-winning seed).
- Tools: `tools/league-soak.mjs` (weekly league invariants, per-season metrics, sizes), `tools/balance-compare.mjs` (the registry against today's generator on the same seeds), the Phase 2 soaks and `tools/storage-check.py` (migration on first start builds the registry; Phase 1 and 2 flows unchanged; passed at 320–412 px).

### 45.10 Not in Phase 3
**Verification not completed at the merge (2026-10-24; closed in §46.8):** a full 20-season All-Star soak (the All-Star run ended after 6 seasons with the hands-off owner dismissed; Pro and Rookie completed 20) and a 20-season balance comparison (8 seeds × 8 seasons per difficulty were compared; the 20-season evidence is the single-seed soaks). Both stay open for the release verification (test plan §0).

League-wide career presentation for AI monsters (timelines, trophy cases, career cards beyond the profile that already opens), News lines for signings, trades and releases, duplicate-data removal between the tables and the books, AI–AI trades (Phase 4); real-device checks (the owner decides at release time).

## 46. Career integration and polish — Phase 4 of §42 (IMPLEMENTED 2026-10-24; branch `league-careers`, v42.0; MERGED to main 2026-10-24 as PR #47, released as v42.0.1, §47)

Phase 4 makes the persistent league of §45 meaningful and visible: every monster in the universe has a career the player can open from wherever his name appears, League News tells the league's own stories without noise, AI clubs trade with each other sparingly and fairly, the one duplicate the books make safe to remove is removed forward-only with its reconstruction proved, and the two verification gaps left at the Phase 3 merge are closed. Football, the cap, contracts, free agency and the nudge are untouched; every save and archive opens as it is.

### 46.1 League-wide careers [IMPLEMENTED]
- **Per-game writers for every persistent club.** `careerAfterGame` runs for both rosters of every simulated game and for the owner's opponent, with the game's line handed over by `recordGame` (`onLine`) because AI monsters keep no logs (decision G): debuts, firsts, career milestones, playoff stars and title runs, big games against the owner's club for his rival, single-game records, level marks. AI evolutions are noted where they happen. Season-end events (awards, records, season marks, titles) already ran (§45). Measured: about 40 KB raw of events a season across the 15 clubs.
- **Profiles, timelines, trophy cases and career cards** need no new renderer: `careerProfile` already opens a full profile for a registry monster (§45); the Career Timeline, the trophy case and the career card read the same books and events. **Team history** is the monster's own `history` (every club, how he came and went).
- **Legend stubs keep more:** a decorated leaver's stub now carries his season books, his last clubs and his major, milestone, evolution and debut events, so his profile keeps its seasons after he is gone and the award sheets' numbers keep their one copy (§46.6).
- **"Achievements" for monsters** are the Timeline's milestones and the trophy case; no second system. The owner's achievements stay the owner's.

### 46.2 Every name opens a career [IMPLEMENTED]
`careerLink` now wraps every rendered monster name: the box score (leaders and players of the game), league leaders, the records book (holders resolved by id), award sheets, races and the awards history, the club awards and the HQ award line, the scouting report's star, the league's recent picks and the draft digest, trade calls, the offseason market, the pools, League News and its digests, the Legacy's tabs, and the new League Hub. The Records book's "Your careers" tab became **Careers** over the whole universe (`universeCareerLeaders`, with the owner's roster as a filter).

### 46.3 The League Hub [IMPLEMENTED; decision 5]
`src/ui/screens/league-hub.js`, from the main menu and from HQ and the standings: **Clubs** (the 16 clubs by division with record, overall, size and their protected monsters; a club opens its roster with position, overall, age, level, tenure, deal and injuries), **Leaders** (career totals across every monster the universe holds, retired legends included; "Your monsters" as a filter), **Moves** (the league's transactions, by week, from the News writers), **Races** (the award races, frozen awards after week 10) and **Rivals** (the rival GM, the all-time head-to-head, his signature monster's continuity block; every gym legendary with its club). Existing list, chip, sheet and segmented-control styles only; passes at 320–412 px (`tools/league-hub-check.py`); the hub renders in 149 ms and a career sheet opens in 249 ms at 4× CPU throttling.

### 46.4 League News: the league's own moves [IMPLEMENTED; decision 1]
- **Kinds:** `signing`, `release`, `trade`, `draft`, `retire`, `milestone`, `moves` (the offseason digest). Queued by the league operations themselves (`leagueEvent`, stamped with the week they belong to; the offseason's moves belong to week 0, "Preseason", of the coming season) and written by the News step after the fact, with no random draws.
- **Meaningful only** (`meaningfulMove`): a starter or a 65+ monster, a former monster of the owner's, the owner's rival or division, a first-round pick, a retirement, a career milestone (the second mark and up: 25 touchdowns, 3,000 rushing yards…, read from the books, never from the Timeline). **Two lines a week** in season (`TRANSACTIONS_PER_WEEK`), ranked by the monster's value and the owner's connection; **one offseason digest of eight lines** and **one draft digest** (the owner's picks, the top five, scouted prospects taken by others) as the new season opens; one line per monster per window (a walk followed by a claim reads as the claim, "late of …"). The feed's caps (6 headlines a week, 200 items, two seasons) stand.
- **Careers in the lines:** award winners' repeats are counted ("his third"); a record holder who beats his own mark is told so (the records book's previous mark keeps the holder's id).

### 46.5 AI–AI trades [IMPLEMENTED; decision 2, E]
`src/franchise/league-trades.js`. Two windows: the offseason, **before** free agency (a need filled by a deal) and weeks 2–8 (one attempt a week with a 25% chance). A club shops when a position's need reaches 0.25 (`positionNeeds`); the incoming monster must beat its weakest starter by 2; a deal is need-for-need (the other club's need, both within the 0.85–1.15 value band) or player-for-picks (the next two classes, `pickValue` with the future discount); both clubs must end under the cap and inside 26–38; never a protected monster, a cornerstone or a rookie on his first deal (`tradable`); at most three deals an offseason and one per club per window; every decision from the franchise generator in a fixed order (one seed, one league). Measured: 2–3 deals a season. The owner's own trades and the clubs' calls are unchanged; the rival's club trades ordinary monsters only. **Superseded in part by §54 (PROPOSED, Task 5):** the need gate, the position-blind value and the picks-only in-season path are replaced by one position-aware valuation and a swap-capable in-season path; the windows, the band, the legality rules and the seller-only-spares rule are unchanged.

### 46.6 Historical compaction [IMPLEMENTED; decision 3, forward-only]
**What was measured.** At season 20 the award winner rows in the season history copy their season line (about 600 bytes each, 140 rows); the archived league tables (eight seasons) copy, for registry monsters, what their season books hold — but AI books keep the box-score keys only (decision G), so a table row cannot be rebuilt from a book byte for byte, and the leaders snapshots are already seven fields a row. **What is removed:** at each season end, a winner row drops only the keys his book for that year holds (`history-compact.js`; the owner's monsters since v39, every persistent monster since Phase 3; the stat line is kept as text; a decorated leaver's stub keeps his books). Every number keeps exactly one copy and `expandWinner` rebuilds the original row. **Proof:** `tools/compaction-check.mjs` expands every slimmed winner of every season against the archived table row it was copied from, key by key (0 mismatches over the soaks), and `tests/league-careers.test.js` does the same on a played franchise and checks that saves without a registry are never touched. **Saving:** about 115 bytes a winner, 16 KB raw at season 20 — honest but small; the tables stay as they are, bounded by the eight-season window, and nothing already in a save is rewritten.

### 46.7 Rivalry continuity and retirement [IMPLEMENTED; decision 4]
Protection is exactly §45.2; Phase 4 shows it: badges on rosters and the hub, the signature's head-to-head block, the Legacy's Careers tab listing the whole universe with the protected marked. **Retirement** is the word for one thing only: a monster leaving the active league for good (a decorated veteran whose departure writes his legend stub). A walk, a release, a waiver claim or a pool entry is never called a retirement; an undecorated leaver is pruned silently.

### 46.8 Verification [IMPLEMENTED; decision 6, simulation only]
`tools/league-soak.mjs --boardReset=1` and `tools/balance-compare.mjs --boardReset=1` reinstate a dismissed owner after each season so a hands-off career reaches 20 seasons on All-Star; the game's Board and firing rules are untouched.

**Results (3 seeds × 20 seasons per difficulty, the registry against today's generator; `tools/balance-compare.mjs --boardReset=1`; the All-Star soaks `tools/league-soak.mjs --boardReset=1`, seeds 1 and 2):**

| Difficulty, seasons | AI mid-season mean: today → registry | Owner win rate: today → registry | Rival's club against today's rival |
|---|---|---|---|
| Rookie 1–5 / 6–10 / 11–15 / 16–20 | 62.4→62.5 · 69.1→69.0 · 74.0→73.9 · 78.7→77.8 | 69.6→62.2 · 57.8→57.0 · 45.9→36.3 · 34.8→25.9 | −0.3 · −3.4 · −3.1 · −3.5 |
| Pro 1–5 / 6–10 / 11–15 / 16–20 | 64.8→65.3 · 71.2→71.5 · 76.1→75.8 · 80.6→79.4 | 56.3→57.8 · 48.1→46.7 · 40.7→30.4 · 30.4→25.9 | −0.3 · −3.1 · −3.3 · −3.9 |
| All-Star 1–5 / 6–10 / 11–15 / 16–20 | 68.7→68.7 · 74.9→74.4 · 79.6→78.4 · 83.8→81.2 | 40.0→45.9 · 36.3→40.7 · 21.5→29.6 · 14.8→25.9 | +0.1 · −3.5 · −3.3 · −3.9 |

- **Both Phase 3 gaps are closed:** two 20-season All-Star careers completed with every weekly invariant holding, no club over the cap, every protected monster in place (2.12–2.16 MB packed at season 20, 499–512 KB stored); the 20-season comparison ran on all three difficulties.
- **What held:** the AI clubs' mid-season mean within 1.2 of today's through season 15 on every difficulty, and the title spread is at least today's.
- **Remaining deviations, documented rather than tuned away (the owner asked for no extended cycle):** (1) in seasons 16–20 the persistent league sits under today's very steep late curve by 0.9 (Rookie), 1.2 (Pro) and 2.6 (All-Star, beyond the ±2 band); (2) the hands-off owner's win rate over 20 seasons differs from today's by −6.6 (Rookie), −3.7 (Pro) and +7.5 (All-Star) points, in opposite directions, with three seeds a difficulty and a reinstated owner whose roster carries the marks of the dismissals — the 8-seed, 8-season study of §45.6 held the ±5 band on all three; (3) the rival's club ran 3–4 under today's rival from season 6, because the signature monster's growth is capped by his potential (decision V) while today's generated signature kept inflating. For (3) the rival's club is now held to a ±2 band by the nudge (`RIVAL_BAND`); two further 20-season soaks (Pro seed 2, All-Star seed 1) brought the gap to −1 to −2 in most seasons (−4 once). (1) and (2) are left for the release calibration, with more seeds, if the owner wants them narrowed; the levers are `LIFT_SHARE`, `BAND` and the late-season targets.
- **A Phase 3 defect found by the All-Star run and fixed here:** the structural check a save is read with (`verifyLeague`) required 26 monsters a club, but a save taken between a season's end and the next start can hold a club below that (its walks happen before free agency), so such an offseason save would have been refused on load by v41.0. The structural check now requires only that every club has monsters; the playing limits are checked when a season opens, as before.

### 46.9 Tests [IMPLEMENTED]
`tests/league-careers.test.js` (6): per-game careers for AI monsters with no duplicates and full profiles; the News rules (thresholds, two a week, digests of eight, one line per monster, repeat winners, own records); AI–AI trades (frequency, fairness, cap, limits, protection, determinism); the compaction proof on a played franchise and the untouched v40 save; the hub's data; retirement as a permanent exit. Updated: the timeline-parity test strips legend stubs' event copies; the records News test reads the new wording; the awards test expands the slimmed winner. `tools/compaction-check.mjs`, `tools/league-hub-check.py` (passed at 320–412 px), `tools/storage-check.py` (the Phase 1–3 flows, passed on this build). **528 tests pass.**
- **Storage at season 20** (the packed logical payload, decision Z): 2.09 MB (Pro) to 2.16 MB (All-Star) with the league's careers, 493–512 KB stored; the §42.11 target (2.7 MB ±25%) still holds with Phase 4's events in the save.

### 46.10 Not in Phase 4
Career cards and timelines as separate full screens for AI monsters (the sheet is the card; built in v42.1.0, §48); AI–AI trades in the playoffs; compaction of the archived tables (not lossless for AI rows under decision G); real-device checks (the owner decides at release time).

## 47. Release v42.0 / v42.0.1 — Phases 1–4 on the main game (RELEASED 2026-10-24)

The first release of §42 to the main game. The main game ran v39.0 until this release; v39.1–v41.0 existed only on branches and the private test link. No gameplay or balance change was made for the release; the §46.8 deviations stand as documented.

### 47.1 Merge
- **PR #47** (`league-careers` → `main`, Phase 4) merged by the owner on 2026-10-24 at 18:07 UTC as a fast-forward: merge commit `49778b229a52ce0d653bae0317213ba2c39c3def`, the exact commit the release checks ran on. **PR #48** added the release harness (`tools/release-check.py`, no game file); `main` = `9a1b64f`.
- **PR #49** (`fix-achievement-link`): the v42.0.1 save fixes of §47.4 and this record. Built on `9a1b64f`; the game files differ from v42.0 only in `src/core/uid.js`, `src/franchise/achievement-store.js`, `src/franchise/hall-of-fame.js`, `src/franchise/store.js`, `src/main.js`, `src/version.js` and `index.html`.

### 47.2 Deployment
- **Main game link (unchanged URL):** https://claude.ai/artifact/GJG2k6eqG3qfeteJEbXvFq. v42.0 was published at 14:24 local (artifact version 91), v42.0.1 at 14:53 (version 92) and again with the relink fix of §47.4 (version 93). 132 files (the page plus 131 tracked files: `manifest.webmanifest`, `src/**`, `styles/**`); capabilities `db`, `user` and `downloads` (new: the backup export inside the Claude app); runtime contract 0.2.77 unchanged.
- **Read back after publishing:** the served `src/version.js` carries the release label, the file list is complete, the served files match the commit byte for byte, and the stored capabilities are as declared.
- **The private test link** (v39.2, https://claude.ai/artifact/YaeuhvNLm5HS8ZG2YKg6Tj) was not touched.

### 47.3 Save migration path (v39.0 → v42.0.1)
1. **First start on a device holding a v39.0 save.** The localStorage save (`gridiron-beast-v6`) is copied, migrated on the copy, written to IndexedDB slot 1, read back and compared, then switched on (§43). The legacy key and its weekly backup stay in localStorage untouched, and a `legacy-original` backup is kept.
2. **The league registry** (schema 6 → 8, §45) is built on a verified copy and rolled back on failure. A `pre-league` backup of the v39.0 franchise is kept before anything else reads it.
3. **The cloud.** v42 reads the v39.0 layout (`save_meta` + `save_c<n>`) on first run and never writes it. New copies go to `cloud/snaps` and `cloud/chunks`. Only an explicit delete removes cloud documents.
4. **Identity (v42.0.1).** A franchise from before ids gets a uid derived from its creation stamp and seed (`legacyUid`), the same on every device. Franchises created in v40+ keep their random uid. An imported v39 file gets the same uid, so a copy already on the device is recognised and the existing "Replace / Import as a copy" choice applies.
5. **Ordering (v42.0.1).** On the boot that migrates, the cloud is compared by the legacy save's own time, not by the stamp the migration's writes give it. The registry's first save waits for that comparison. A newer cloud copy of the franchise is adopted, and the device's copy is kept as `pre-cloud`.
6. **Retry safety.** An interrupted migration resumes with the same uid. A reopened device does not migrate again (release check: two reopenings, identical fingerprint, no duplicated career events).
7. **Not migrated.** Retirement archives are kept as they are (§44). Nothing is deleted, overwritten or reset during the update.

**History.** AI monsters' careers start when the persistent league is built at the first v42 start; their earlier seasons are not reconstructed, and nothing is fabricated. Seasons before the update keep what v39.0 recorded: tables, awards and the owner's monsters' careers (§45, §46).

### 47.4 Defects found at release and fixed in v42.0.1
A read-only dry run of the migration on a **copy of the owner's real v39.0 cloud save** (Ember City Beasts, Beast League, season 2 week 8, 11 achievements) found two defects the synthetic release check could not show:
1. **Achievements counted one franchise twice.** Linking the old seed to the new uid was undone by the next cloud merge, so every achievement read "earned by 2 franchises".
   - The seed → uid link is now kept in the achievements data (`links`) and applied to every merged copy.
   - An entry already duplicated is repaired by the next link.
2. **Two devices holding the same v39 save became two franchises.** Worse, a device's stale copy, stamped "newest" by its own migration, could replace newer progress in the cloud. A backup was kept, but the progress silently went backwards.
   - Fixed by items 4 and 5 of §47.3.
   - The owner opened v42.0 on one device before v42.0.1 was published: that device gave the franchise a random uid (`e2e70dc8…`) and uploaded it. A device migrating its own copy later adopts that cloud copy (matched by creation stamp, as before), and its achievements and Hall of Fame cards follow the adopted uid (`relinkAchievements`, `relinkHofCards`). Replayed on a copy of the live cloud state: one uid, every achievement at one franchise, the v39 documents and the v42.0 snapshot untouched, the device's own copy kept as `pre-cloud`.

### 47.5 Verification
- **`npm test`:** 531 tests pass (528 at the merge, plus three for §47.4). The slot tests' helper gave three different franchises the same creation stamp and seed, which the new identity rule treats as one franchise; it now gives distinct clubs distinct stamps.
- **`tools/release-check.py` against the live v39.0 files (byte-identical to commit `ec106e9`), seeds 7 and 11, passed on v42.0 and again on v42.0.1:**
  - v39.0 plays a season, an offseason and four weeks.
  - v42 migrates with every original field unchanged and the `pre-league` backup restoring exactly; the legacy localStorage and cloud documents are untouched; two reopenings show no re-migration.
  - The rest of season 2, the offseason and draft, an owner trade, the season transition and six weeks of season 3 each read back exactly after the browser is closed and reopened.
  - Export → validate → import on a fresh device gives exact equality, and it plays on.
  - A second device receives the franchise through the cloud.
  - Screens at 320/360/390/412 px have no overflow and no page errors.
- **Real-save dry runs (copies, nothing written back):**
  - Migration: no differing fields, backups `legacy-original`, `pre-league` and `roll0`, boot 3.9–4.3 s, 332 KB payload stored.
  - Reopen; play a week and read back exactly; export (0.81 MB) and import.
  - A fresh device with only the v39.0 cloud documents.
  - Two devices, and the live state of §47.4.
- **Browser regression on v42.0.1, all passed with no page errors:** `ui-walkthrough` at 320×640 and 412×915 (new franchise → Season 1 → offseason → draft → Season 2), `navigation-check` (10 scenarios), `feature-ui-check`, `career-ui-check`, `news-ui-check`, `storage-check` and `league-hub-check`.
- **Storage:** IndexedDB, about 223 KB for the real save; a 20-season franchise stays within the §42.11 target (§46.9).

### 47.6 Limitations
- **The claude.ai runtime cannot be driven from the development environment.** Every check above ran in headless Chromium with the claude.ai database simulated. The storage layer is the one phone-tested on the test link at v39.2, unchanged apart from §47.4. The owner's first open on each device is the final live check.
- **A cached v39.0 tab left open after the update** can still save to the legacy localStorage key. v42 keeps such a save as a backup and never lets it replace the live franchise (§43).
- **Real iPhone and Android devices** were not run for this release (the owner's decision, §42.10).

### 47.7 What is implemented and what is not
- **Implemented and released:** Phases 1–4 of §42.
  - The storage foundation and backup export/import.
  - Three slots, the franchise lifecycle and the Legacy.
  - Persistent AI rosters with permanent gym legendaries and rival signatures.
  - League careers, the League Hub, League News moves and digests, AI–AI trades and forward-only compaction.
  - Every system before §42.
- **Not implemented:**
  - Anything after Phase 4 ("Phase 5" was not started).
  - The items listed in §46.10.
  - The balance narrowing left open in §46.8.

## 48. Full-screen Monster Career Profiles — MONSTER CAREER TIMELINES — FEATURE COMPLETE — RELEASED v42.1.0 (IMPLEMENTED and RELEASED 2026-10-24; PR #53)

The last presentation item of the career feature (§46.10): every monster with a record has a full-screen career page, like a player page in a sports game. It is a presentation and navigation layer over the career system of §38, §40, §41, §45 and §46. No second career-tracking system was created, no career data was added to the save, and opening a page writes nothing.

### 48.1 Where it reads from
`src/franchise/career-page.js` builds the page from `careerProfile` (`career-profile.js`), the one profile every career view already uses:
- the timeline (`career.js`);
- the season books and career totals (`stats.js`);
- the trophy case and the club history;
- the league tables for players the save keeps no career for;
- Hall of Fame snapshots.

The page is drawn by `src/ui/screens/career.js` (route `career`). Building a page calls no backfill and no stats initialisation, so the franchise is byte-for-byte unchanged after viewing (tested in Node and in the browser).

### 48.2 Who has a page
Every monster the game holds a record of:
- **The owner's roster** (status Active, "Your club").
- **Former owner monsters**, now in a pool, on waivers or with another club. Their seasons with the owner stay in their team history.
- **AI clubs' players** (Active, "With the …").
- **The rival's signature monster** (⚔️ Rival signature) and the **gym legendaries** (★ Gym legendary). The owner's own legendary species show ★ Legendary.
- **Retired AI legends** (Retired, "Left the league after season N"). They show no current rating or level, because they have none.
- **Players known only from the league tables** ("Not on a current roster").
- **Draft prospects.**
- **Hall of Fame cards:** the snapshot, or the labelled partial profile of a card written before v39.0.
- **An archived franchise's final roster** ("Final roster") and its best monsters' snapshots.

A historical monster never shows an old rating as current.

### 48.3 The page
- **Header:** sprite, name, species and type, position, current or last club, OVR (active monsters only), status, designation, Hall of Fame mark, career tier and level.
- **Five sections:**
  1. **Overview:** seasons, games, teams, titles, awards and records; the career span; regular-season highlights for the position, with a separate playoffs line; honours with seasons; the clubs; notable moments; the record's own notes; the shareable career card.
  2. **Timeline:** the §38/§40 timeline in full, newest or oldest first, with the All/Highlights filter. Linked entries open their records, and a season header opens the season.
  3. **Stats:** one row per season (team, the position's columns, a stat-group switch for monsters with several roles) and a career total row. Regular season, playoffs or both. Tapping a season opens its games where the save keeps them. A number the save does not hold, or a rate with too little volume, shows "—", never 0.
  4. **Awards:** the trophy case (shelves open their seasons), honours by season, Hall of Fame recognition, and the milestones (debut, firsts, career milestones, big seasons, playoff and rivalry moments, evolutions).
  5. **Teams:** each club with its span, the seasons and games on record, the recorded moves (draft, signing, trade, release, return) and the honours won there.
- **Spans:** a club's span covers everything the record proves for that club. Club entries reset their start date at each contract renewal, so the span also takes in seasons with lines and the moves.
- **Mobile:** designed for 320–412 px. The section bar is sticky, the stats table scrolls sideways with the season column pinned, and long names wrap. Below 360 px the header and section bar tighten so all five sections stay in view.

### 48.4 Entry points and Back
- **One listener covers every career link.** Any element with `data-career` now opens the page through the router instead of the sheet. That covers:
  - the League Hub (club rosters, Leaders, Moves, Races, Rivals);
  - Records, Leaders, award history, box scores and League News;
  - the free-agent market and the draft room;
  - the Legacy's final roster and award winners;
  - every career block.
- **New buttons:** the monster card has a "📖 Full career profile ›" button; the Hall of Fame opens the page for each card monster; the Legacy's best monsters open their snapshot page.
- **Back:** returns to the same screen, tab and scroll position. Verified from:
  - a League Hub club roster (same club, same scroll);
  - the League Hub Leaders tab (tab kept);
  - Records and award history;
  - League News on HQ;
  - the free-agent market and the draft room;
  - the monster card.
- **Section memory:** the section and filters chosen on a page live on that page's history entry, so they survive a detour and Back.
- **Links inside sheets:** a career link inside a sheet closes the sheet through its own close button, then opens the page. Back returns to the screen beneath. The scroll lock is released.

### 48.5 Defects found and fixed (career scope, no gameplay change)
- **Retired legends showed "Lv 1 · 1 OVR".** The rating was read from a stub with empty attributes. They now show no rating.
- **Retired legends' playoff games were counted as regular season.** This affected the profile, the career sheet and the League Hub career leaders, because a stub keeps one combined career line. The regular season and the playoffs are now rebuilt from the stub's season books.
- **A monster's current season had no club.** The current season's book names no team, so the page uses the club he plays for now.

### 48.6 Historical-data limitations (nothing is fabricated)
- **Seasons closed before v39.1** keep totals, not game lines (§41.1).
- **Hall of Fame cards written before v39.0** keep only the monster's name, position, rating and level (§41.3).
- **Records set before v39.0** link only when the evidence is unique (§41.2).
- **Earlier AI careers:**
  - An AI monster's league career starts when the persistent league was built (§45). Earlier seasons are not reconstructed.
  - AI veterans created with professional years carry the note that earlier seasons were played before the franchise kept their stats.
- **Players from before persistent rosters** are known only by the league tables' season lines (status "Not on a current roster"). They have no timeline.
- **Older legend stubs:** a stub written without season books shows its combined career line as the regular season.
- **Older saves** show the timeline they hold. Viewing never backfills.

### 48.7 Verification
- **`tests/career-page.test.js` (9 tests):**
  - every kind of monster, with the status, designation and rating rules;
  - a former owner monster's history with the owner's club;
  - chronological order both ways, with no duplicated events;
  - season rows adding up to the career totals on every bucket and stat checked;
  - dashes for unavailable values;
  - retired legends' regular-season and playoff split (profile, page and leaders);
  - team moves exactly as recorded;
  - an older save unchanged by viewing;
  - Hall of Fame, older-card and archived-franchise pages;
  - every page in every section leaving the franchise unchanged.
- **`npm test`:** 540 passing.
- **Renders:** every monster in a 4-season franchise in every section and filter (669 monsters, 10,035 renders, 0.18 ms each), and in a 20-season franchise (765 monsters, 44 retired legends, the longest career 19 seasons; 11,475 renders, 0.34 ms each). There were 0 problems, and the franchise was unchanged.
- **Gameplay unchanged:** `tools/career-presentation-study.mjs --fingerprint` gives identical seasons, champions, awards and rosters on `main` and on this branch.
- **`tools/career-profile-check.py`:** headless Chromium at 320, 360, 390 and 412 px over a played 12-season franchise.
  - **Monsters:** own, former owner, AI, rival signature, gym legendary, retired legend, table-only and Hall of Fame. Each was checked in all five sections, with no overflow, overlapping controls or clipped text.
  - **Back:** from a club roster, the Leaders tab, Records and the monster card, with the section kept across a detour; plus a link from inside a sheet.
  - **The franchise** was unchanged after all of it. **Passed.** The 19-season career was also checked at 320 px.
- **Updated for the page and passed:** `career-presentation-check.py`, `navigation-check.py`, `league-hub-check.py` and `release-check.py` (v39.0 → v42.1, seed 7). Also passed: `ui-walkthrough` at 320 and 412 px, `feature-ui-check`, `career-ui-check`, `news-ui-check` and `storage-check`.

This is an emulated browser, not a real device.

### 48.8 Career feature audit (§27.4 A, §38, §40, §41, §46 and the owner's brief of 2026-10-24)

| Requirement | Status |
|---|---|
| Draft or recruitment origin | Complete |
| Team changes | Complete; older saves show what they recorded (§48.6) |
| Evolution | Complete; evolutions before the timeline began are labelled as such |
| First touchdown and other reliable firsts | Complete |
| Championships, awards, career records | Complete |
| Notable rivalry performances | Complete |
| Highlights view and detailed statistics | Complete (All/Highlights filter; Stats section) |
| No fabricated history for older saves | Complete; tested (§48.7) |
| Career summary header and trophy case (§40.1–40.2) | Complete |
| Interactive timeline with linked records (§40.3) | Complete |
| Shareable career cards (§40.4) | Complete |
| Career links by stable id from anywhere (§40.5, §46.2) | Complete; now open the full page |
| League-wide careers, legends and retirement (§46.1, §46.7) | Complete |
| Full-screen profiles for every monster (§46.10, owner's brief) | Complete |
| Five sections: Overview, Timeline, Statistics, Awards & Trophy Case, Team History | Complete |
| Entry points: roster cards, timelines, League Hub, leaders, Records, Hall of Fame, Legacy | Complete |
| Back to the same screen, tab and scroll position | Complete, with one documented limitation: a link inside a sheet returns to the screen beneath it, not to the sheet |
| Mobile 320–412 px | Complete (emulated); real devices not run |
| Viewing never changes the franchise | Complete; tested |
| Save compatibility and the v42.0.1 fixes | Complete; no save field added, release check passed |

**Not in scope, and not started:** Monster Partnerships (§27.4 B); a career comparison of two monsters; the Moments Museum (§40.9). Each needs the owner's approval.

**Known issues:**
- Real iPhone and Android devices were not run.
- A Hall of Fame snapshot shows "Retired" rather than "Hall of Famer" when the card's monster carried no Hall of Fame event at retirement. Cards written by the retirement flow carry it.

**Every approved requirement of the Monster Career Timeline feature is satisfied: MONSTER CAREER TIMELINES — FEATURE COMPLETE.**

### 48.9 Release v42.1.0 (2026-10-24)
- **Merge:** PR #53 (`career-profiles` → `main`, one commit `d51026e`), merged on the owner's approval as merge commit `606bd62d807360d55a75f859e8169c30b4f70ef5`. `main`'s game files are identical to the tested PR head.
- **Pre-merge checks:**
  - The PR was based on the latest `main` (`df45acf`, v42.0.3).
  - It changed no save-layer file (store, cloud sync, slots, ids, achievements, Hall of Fame store, save migration, registry, lifecycle, packing).
  - **No migration:** v42.1.0 adds no save field and no schema change.
- **Dry run on read-only copies of the owner's live cloud data** (two v42 snapshots of franchise `e2e70dc8…`, the v39.0 documents, the repaired achievements). A fresh device loaded the same franchise under v42.0.3 and v42.1.0:
  - Ember City Beasts, 1202 week 8, 4–2, 34 monsters;
  - byte-identical franchise data (same size and hash);
  - no migration notes and no cloud writes;
  - achievements at one franchise.
  - Under v42.1.0, career pages for 12 of the owner's monsters (3 gym legendaries among them) opened in all five sections, the franchise was unchanged, and League Hub Leaders → career → Back kept the tab.
- **Deployment:**
  - **Link:** https://claude.ai/artifact/GJG2k6eqG3qfeteJEbXvFq (URL unchanged), artifact version 96 (`1792891572-ac8d`).
  - **Files:** 134 (index.html and 133 game files). The 11 changed files were published and match `main` byte for byte; the unchanged files are those verified at v42.0.1/v42.0.3.
  - **Capabilities and runtime:** db, downloads and user carried forward; runtime contract 0.2.77 unchanged.
  - **Build label:** `src/version.js` serves `v42.1.0-career-profiles`.
- **Live data:** after publishing, the owner's database is unchanged: the same documents and versions (achievements 30, Dex 77, both v42 snapshots, the v39.0 documents). The private test link was not touched.
- **Limitations:**
  - The claude.ai runtime itself cannot be driven from the development environment, and real devices were not run. The owner's first open is the live check.
  - A device whose local save is newer than the cloud keeps its own progress, under the v42.0.1 rules (§47.3), unchanged here.

## 49. Captain Partnerships — RELEASED v42.2.0 (IMPLEMENTED 2026-10-25; PR #55 merged as `06edb9b`; design, the DL–DL and DL–CB changes and the AI selection approved by the owner)

Replaces the automatic Monster Partnerships concept of §27.4 B. Approved design (owner, 2026-10-24) after the feasibility and balance audit, with three owner decisions taken during implementation (2026-10-25, §49.3). Every club names **four captains** each season — two on offense, two on defense — forming **one offensive and one defensive partnership**. Captains who make successful football plays together build **chemistry**, which gives the pair a small bonus (at most **+4%**) on its own key ratings when both are on the field. Football only: Beast Clash, encounters, practice and exhibitions never earn or use chemistry. No morale, jealousy, chores or permanent OVR changes.

### 49.1 Pairings and what earns chemistry

Exactly eight pairings, by **primary position**, the type fixed when the captains are named:

| Side | Pairing | A play earns one credit when… |
|---|---|---|
| Offense | QB + RB | the play succeeds and is a handoff from the captain QB to the captain RB (who carries it), or a completion from one to the other |
| Offense | QB + WR | a successful completion from the captain QB to the captain WR |
| Offense | QB + TE | a successful completion from the captain QB to the captain TE |
| Offense | RB + OL | a successful handoff run by the captain RB with the captain lineman's run block engaged and not lost |
| Offense | OL + OL | a successful play on which both captain linemen engaged, neither lost his block, and neither allowed the pressure or the sack |
| Defense | DL + DL | the offense's play failed and: one made the tackle and the other the recorded assist (tackle or sack); or one's recorded pressure and the other's tackle or sack; or one's recorded shed of his blocker and the other's tackle or sack (§49.3) |
| Defense | DL + LB | the offense's play failed and: tackle + assist; pressure + tackle or sack; DL pressure + LB interception; forced fumble + recovery; or the DL's recorded shed and the LB's tackle |
| Defense | DL + CB | the offense's play failed and: tackle + assist; or the DL's recorded pressure with the CB's interception, pass breakup, or coverage on the incompletion |

**Success** (offense) is the game's success-rate rule: 40% of the distance on 1st down, 60% on 2nd, the first down on 3rd/4th; a touchdown always; turnovers, sacks, incompletions and throwaways never. **Not supported** (audit): LB–LB, CB–S, LB–S — the engine names one coverage defender per play, and no help-defender tracking was added. Both shedding blockers never counts by itself. Everything is read from what the engine already records (`sim.stats`, `sim.events`) with the slot → monster mapping the play used; nothing in the engine changed.

Rules for every credit: at most **one credit per pair per play**; both captains must be **in that play's on-field slots**; **garbage time** — 4th quarter, the crediting side leading by more than 21 before the snap — earns nothing (offense and defense; the play counts for everything else); a **per-game ceiling** of 25% of the pair's Elite target, rounded half up, never below 3 (§49.3); **league games only** (regular season and playoffs, owner and AI–AI alike). Two-point tries, kicks and returns neither earn nor use chemistry.

### 49.2 Levels, thresholds and the bonus

| Level | Name | Bonus |
|---|---|---|
| 0 | New | 0% |
| 1 | Developing | +1% |
| 2 | Established | +2% |
| 3 | Strong | +3% |
| 4 | Elite | +4% |

Thresholds are lifetime joint successful plays for the exact pair, per type. Elite = what a strong (75th-percentile) pair of the type earns in one nine-game regular season; Developing / Established / Strong = 20 / 45 / 70% of that.

| Pairing | +1% | +2% | +3% | +4% | Per-game cap |
|---|---|---|---|---|---|
| QB–RB | 15 | 34 | 53 | 75 | 19 |
| QB–WR | 6 | 14 | 21 | 30 | 8 |
| QB–TE | 7 | 16 | 25 | 36 | 9 |
| RB–OL | 6 | 14 | 22 | 32 | 8 |
| OL–OL | 4 | 9 | 14 | 20 | 5 |
| DL–DL | 1 | 3 | 4 | 6 | 3 |
| DL–LB | 2 | 4 | 6 | 9 | 3 |
| DL–CB | 1 | 3 | 4 | 6 | 3 |

**Counts are stored, never levels** (`src/franchise/partnerships.js`, `THRESHOLDS`), so the table can be retuned without touching saves. After Elite the count keeps rising (career history) but the bonus stays +4%.

**Bonus** (`src/sim/partnership-play.js`, `boostSlots`): in `runScrimmagePlay`, after `pickSlots` and before `simulatePlay`, each side's active pair — only when **both** captains are on the field for that snap — plays with `clampAttr(attr × (1 + level/100))` on its listed attributes; everyone else, and every other attribute, is untouched; level 0 returns the same objects (the game as before). Speed is never boosted.

| Pairing | Captain 1 | Captain 2 |
|---|---|---|
| QB–RB | QB: accuracy, awareness | RB: agility, awareness, catching |
| QB–WR / QB–TE | QB: accuracy, awareness | catching, awareness |
| RB–OL | RB: agility, awareness | OL: blocking, awareness |
| OL–OL | blocking, awareness | blocking, awareness |
| DL–DL | strength, agility | strength, agility |
| DL–LB | DL: strength, agility | LB: tackling, awareness |
| DL–CB | DL: strength, agility | CB: coverage, awareness |

**The level is fixed at kickoff** (`newGame` snapshots `state.partners`); credits are tallied in the game state and committed after the final whistle, so a new level starts with the next game.

### 49.3 Owner decisions taken during implementation (2026-10-25)

1. **DL–DL (stop condition).** On the strict rule (joint tackles, sacks and pressures only) DL–DL pairs earned a median of 0 credits a season (75th percentile 1, maximum 3; 128 club-seasons). The owner chose to count **one lineman's recorded shed with the other lineman's tackle or sack** (the rule approved for DL–LB): median 5, 75th percentile 6, 90th 9, maximum 11 → thresholds 1/3/4/6. Both shedding still never counts by itself.
2. **DL–CB.** Median 1 credit a season, 75th percentile 2, 90th 4, maximum 7. Kept at the approved 1/3/4/6 and labelled **"Slow to build"** on the selection screen. A single play can move it a whole level (the steps are one or two plays); a strong pair takes about three seasons to reach Elite.
3. **Per-game cap.** Measured on game-level data: 25% rounded lost 0.1–6% of credits for most types but cut DL–LB (cap 2) in 12% of games. Now **25%, minimum 3**. Credits lost to the cap: QB–RB 0.1%, QB–WR 1.3%, QB–TE 4.3%, RB–OL 5.4%, OL–OL 6.4%, DL–LB 3.6%, DL–CB 1.0%, DL–DL 0.7%.

### 49.4 Captains through the season

- **Offseason selection.** Once the season is over, HQ offers "Captains for next season" (never blocks anything). The pick is checked when made and again at `startNextSeason`, which names every club's captains for the new season. A pick that is no longer valid (a captain gone) falls back to the suggestion for that side, explained in the club log.
- **Automatic selection.** One deterministic function (`suggestCaptains`) chooses for every AI club, for the owner when he does not choose, and marks "Suggested" on the screen. No random numbers. For each side: pairs of an approved type among base starters, else starters including package slots, else anyone; score = 10 × existing chemistry level + type priority (QB–RB 3, QB–WR 3, QB–TE 2, RB–OL 1, OL–OL 1, DL–DL 2, DL–LB 2, DL–CB 1) + both OVRs / 20 (+1 when both are base starters); ties to the lower pair key. A monster holds one captaincy.
- **No valid pair** on a side: no partnership for that side this season, with the reason; never an invalid pair; the season always advances.
- **Locked** from week 1 through the playoffs: there is no in-season way to change captains.
- **Trades and releases are unrestricted.** Captains can be released (with the warning "This monster is a team captain…"), and AI clubs trade captains with their normal logic (`aiTrades` unchanged). The pair stays the season's official pair and is inactive while separated; League News notes the deactivation. If the captain returns to his club the same season, the partnership is eligible again automatically. A club receiving captains cannot activate them until its next offseason.
  - **Limitation found in Phase 0:** the owner cannot trade monsters away in this build (trades give draft picks; §19.6, §27.5 A plans owner monster trades later). The warning therefore appears on every release path (roster card, contracts, the commissioner). Owner trades that bring in an AI club's captain deactivate that club's pair.
- **Injuries and benching.** The captain stays designated; no bonus and no credit on any play he is not on the field for. The lineup strip says why ("is injured", "is not in the lineup", "is no longer on the team"); moving a captain out of the starting lineup shows a gentle note. Nobody is forced into the lineup.
- **Position changes.** The game has no position-change system; the pairing type is fixed at selection in any case. Evolution keeps the id, so chemistry is kept.
- **Existing franchises — one-time initial selection.** A franchise with no captains for the current season (an existing save, or a new franchise's first season) is offered a one-time pick on HQ, explained as an exception. Skipped, the suggested captains are named before the next game (`ensureCaptains`), and the club log says so. All 16 clubs are named at the same moment. The exception cannot reopen: once a season has captains it is used. Archived franchises are read-only.
- **Permanent history.** Chemistry belongs to the sorted pair of monster ids — not a club, slot, name or season — and survives separation, trades, free agency, evolution and retirement. A pair named again resumes its count (reunions included).

### 49.5 Save data (one optional key; save code unchanged)

`f.partnerships = { v: 1, startedYear, initial?: { year, mode }, pick?: { year, offense: [id, id], defense: [id, id] }, pairs: { "<idA>|<idB>": { a, b, type, n, first, last, seasons: [{ y, club, type }] } }, captains: { "<year>": { "<club>": { offense: { type, a, b } | null, defense, mode, reason } } }, credited: { "<year>": { "<gameId>": 1 } } }`.

- Outside the verified league registry; no schema bump; `save.js`, `cloud-save.js` and `store.js` are unchanged.
- **Lazy:** loading never creates it; it appears at the first activation (initial pick, offseason pick, the first game or season under this build). No chemistry is fabricated: there is no play-by-play history to read, so every pair starts at 0.
- **Duplicate protection:** each game commits once under a stable id (`year|w<week>|home|away`, playoffs `year|p<round>|home|away`), in the same in-memory step that records the game's result, before the save is written; a game id already in the ledger adds nothing (reload, replay, re-simulation). The ledger keeps this season and the last.
- **Older builds:** v42.1.0 loads a save carrying the key, plays a week, saves, and the key comes back byte-identical; this build then continues from it (`tools/partnerships-oldbuild-check.mjs`). Local storage, the device store and the cloud mirror round-trip it (tests).

### 49.6 Interface

- **Captain screen** (`captains`): two slots per side with portraits, the choosing sheet (eligible partners only, with the chemistry each pair already has), "Use suggested captains", the pairing label, the chemistry meter (four pips, the level name, a bar and "N more to …"), "Slow to build" on DL–CB, and the lock explained. Read-only once the season's captains are named.
- **HQ:** the one-time pick card, or next season's pick in the offseason.
- **Lineup:** a "C" badge on captains (lineup slots, depth chart, the commissioner's list) and a partnership strip per side: portraits, pairing, level, progress, current bonus, active or why not; tapping it opens the captain screen.
- **Post-game:** a short Captain Partnerships section (plays together, level and progress, a new level, plays lost to garbage time or the cap).
- **League News:** captains named (the owner's club), Established and Elite for the owner's pairs, Elite for AI pairs, captains traded or released. No routine updates.
- **Career Profile:** a Partnerships card on Overview (current captaincy, every partner with level, plays together and seasons as captains, "Not active" for former ones) and two timeline events: named captain (each season, in the full timeline) and Established/Elite chemistry.

### 49.7 Results (multi-season league simulations, real feature on)

- **Credits per season** (shipped detection, garbage time excluded, 8 seeds × 16 clubs, median / 75th percentile): QB–RB 56/75, QB–WR 23/33, QB–TE 26/41, RB–OL 23/36, OL–OL 17/25, DL–DL 5/6, DL–LB 5/7, DL–CB 1/2.
- **Seasons to Elite** (6 franchises × 5 seasons, all 16 clubs, 243 captain pairs; seasons counted from the pair's first captaincy): QB–RB 94% reached Elite (35% in one season, 86% within two); QB–WR 76% (36% in one); DL–DL 88% (39% in one); DL–LB 80% (12% in one, 68% within two). Pairs that never reached Elite were mostly captains for a single season. DL–CB was chosen once (not Elite after five seasons); the automatic selection never chose QB–TE, RB–OL or OL–OL in these runs (owner picks can).
- **Balance** (720 games: every club against every other at a season's start, with its real captains and chemistry, then the same games with every level at 0): the side with more chemistry won 65.4% with it, 58.7% without (average gap 3.6 levels) — about **+1 win percentage point per level of difference**, +0.12 points of margin per level. Against team strength: higher-OVR side's win rate for OVR gaps 2–4 62.6% → 61.3%, 4–8 75.7% → 75.2%, 8+ 80.5% → 85.7% (with chemistry). Chemistry is worth roughly one to two points of team OVR and does not overturn a meaningful rating gap. (Single games change result about a third of the time between the two runs because any change reshuffles later events; that is variance, not size.)

### 49.8 Known limitations

- The owner cannot trade monsters away in this build (§49.4), so the trade warning applies to releases.
- AI clubs favour QB–RB, QB–WR, DL–DL and DL–LB (they earn fastest). **Owner decision (2026-10-25): approved as is** — AI clubs choose the strongest partnerships; no artificial variety. All eight pairings stay eligible and functional for every club (tested).
- DL–CB and, to a lesser degree, DL–DL and DL–LB move in single plays; luck matters more for them.
- Real phones were not tested; layouts were checked in an emulated browser at 320, 360, 390 and 412 px (`tools/captains-ui-check.py`).

### 49.9 Release v42.2.0 (2026-10-25)
- **Merges (owner's approval):** PR #54 (v42.1.0 release record) as `07b649b`, then PR #55 (`captain-partnerships`, updated on that `main`; the GDD conflict resolved by keeping §48.9 before §49) as `06edb9b`. `main`'s files are identical to the tested PR head `753d6d8`. PR #56: the cache-busting `?v=42.2.0` in `index.html`.
- **Tests:** `npm test` 576/576 on the updated branch (540 existing + 36 new); post-merge the partnership suites (36) and the captains UI check pass on `main`.
- **Simulations:** 4 franchises × 5 seasons (franchise soak, 0 problems); league soaks of 12 and 5 seasons (0 problems; the second owner was dismissed by the Board, normal play); the §49.7 study (6 × 5 seasons, 0 problems).
- **Existing saves (disposable copies only):** a v42.1.0 franchise made by v42.1.0 itself, mid-Season 3, loads byte-identical in v42.2.0 (ids, levels, attributes, evolution, career statistics, achievements, clubs, rosters, schedules, standings, history); no partnership data appears on load; captains are chosen at once mid-season with no chemistry fabricated; a game saved and reloaded mid-way ends with the same tally and a repeated commit adds nothing; the season plays out with playoff chemistry (`tools/partnerships-release-check.mjs`, two seeds). The same in a real browser profile: v42.1.0 writes the device storage, v42.2.0 opens it unchanged, captains are chosen on screen, a week is played, a reload returns everything (`tools/captains-upgrade-check.py`). The older-build round trip passes.
- **Save layer:** `save.js`, `cloud-save.js`, `store.js`, `slots.js`, the registry, lifecycle, achievements, Hall of Fame and Dex stores are unchanged since v42.1.0; the cloud's same-franchise, newer-copy and backup protections are untouched.
- **Deployment:** https://claude.ai/artifact/GJG2k6eqG3qfeteJEbXvFq (URL unchanged), artifact version 97 (`1792937454-ed70`), 138 files: the 14 changed or new game files published and verified byte for byte against `main`; capabilities db, downloads, user and runtime contract 0.2.77 carried forward. The private test link was not touched. The owner's real cloud save was not opened.
- **Limitations:** the claude.ai runtime and real iPhones cannot be driven from the development environment; layouts were checked in an emulated browser at 320, 360, 375, 390, 393, 412 and 430 px.

### 49.10 v42.2.1 polish (owner's iPhone test of v42.2.0, 2026-10-25; PR #57)
- **Captain badge spacing:** 8 px between a name (and its scheme-fit ✦) and the "C" badge on the depth chart, lists and the career card.
- **Evolution is a big deal:** when a monster can evolve, the Evolve button pulses and glows with sparkles and the next form's silhouette shimmers; under reduced motion a steady glow. Two class names and CSS only, no logic, so the coming Evolution Experience Overhaul can keep, restyle or delete it at no cost.
- **Post-game partnership notes:** the section always explains itself: a pair that never shared a snap says so and why (injured or no longer on the team); a pair on the field together that earned nothing says so; a game that kicked off before captains were named says chemistry starts next game. A game begun under v42.2.0 and finished under v42.2.1 carries no snap count and gets no note (never a false "never played together").
- **Read-only snap counter:** `creditPartnerships` (rules.js) counts the snaps each active pair was on the field together (`partnerCredits[side][offense|defense].together`) and `commitGame` passes it to the post-game rows. It is read after the play from the slots the play used; the engine never reads it and no random number is drawn. Proof (`tools/snap-counter-check.mjs`): 36 games at chemistry levels none and 0-4 under the v42.2.0 code and this build are identical in score, play log, team and player statistics, random state and chemistry tally, apart from the new count. It lives in the game state and in the post-game rows (`f.lastGame.partnerships`); no new save field, no schema change.
- **Tests and checks:** `npm test` all passing (two new tests); captains UI check at 320-430 px; navigation check; the v42.1.0 save release check and the device upgrade check pass.
- **Owner decision:** after v42.2.1 is approved and released, the existing development roadmap pauses.

## 50. Monster Career Injury History (IMPLEMENTED 2026-10-25, owner brief; v42.3.0; APPROVED and MERGED (PR #58), NOT RELEASED)

A career record, not an injury mechanic: who gets hurt, for how long and how anyone recovers are exactly as before (injury rolls after each game for the game-day lineup, the owner's practice roll, the weekly recovery, the clear at the season rollover; durability and fatigue untouched).

### 50.1 What is recorded, and when
- **Where it is read:** at fixed points of every league game, for both clubs — the owner's game (live or simulated), every AI–AI game and every playoff game — before kickoff and after the final whistle (`src/franchise/injury-history.js`, hooks in `finishSunday`, `simulateLeagueWeek`, `simulatePlayoffWeek`, `forfeitSunday`). Generated (v40) AI rosters are not recorded (they change every season); every persistent club is.
- **An injury** is opened when it is first seen: after a game, "in the game against X"; before a game, "in practice" for the owner's club ("away from a game" for an AI club, which has no other source); in the opening week of tracking, "already injured when tracking began" (shown, not counted as a career injury). The injury object is stamped with its incident key, so it is never opened twice and a later injury is never merged into an earlier one, even across reloads. A monster cannot be hurt again while injured (he neither plays nor practises), so injuries never overlap.
- **Games missed:** every scheduled game (regular season, playoffs, a forfeit) his club plays while he is injured and on its roster: one per game id, never twice (reloads, re-simulation). Byes and weeks without a game are not games missed. Playoff games are kept apart (`mp`).
- **Recovery:** an open injury whose monster is healthy again before a game is closed with that week (his return); one cleared by the season rollover without missing a game of the new season reads "recovered in the offseason".
- **Opportunity** (for the indicator): games in the game-day lineup (the players injury rolls are made for; the kicker aside) + games missed to injury.

### 50.2 Data model (one optional key; save code unchanged)
`f.injuryHistory = { v: 1, since: { y, w }, opp: { id: appearances }, open: { id: { k, y, w, po?, type, sev, est, src, club, vs?, g: [gameIds] } }, log: { id: [ { y, w, po?, type?, sev?, est?, src? ('game' omitted), vs?, missed, mp?, back: { y, w } | { y, off: 1 } } ] }, done: { year: { "gameId|club": 1 } }, seq }`.
- By stable monster id, outside the monster objects: trades, release, evolution and retirement cannot lose it (a retired legend keeps his).
- **Lazy:** loading never creates it; it begins with the first game played under this build (`since`). No past injury is fabricated; a monster whose career began earlier shows "Injury history tracking began in <season>". Current injuries and recovery state are untouched (only stamped).
- **Size:** about 60–65 KB after five seasons of the 16-club league (≈ 78 records a season). The pre-game ledger keeps the current season; records of monsters who have left the save entirely (not legends) are dropped at season end.

### 50.3 Injury History indicator (a record of the past, not a forecast)
Classified once a monster has 9 games of opportunity: **High** when games missed per game ≥ 10% or injuries per nine games ≥ 1.0; **Moderate** when ≥ 5% or ≥ 0.6; else **Low**. Before 9 games: "Not enough history yet" (owner decision pending: §50.6). Calibrated on 4 franchises × 5 seasons (1,275 monsters with 9+ games): 84% Low, 12% Moderate, 4% High; 29% had no injury. Three injuries over a long career read Low; three in one season read High.

### 50.4 Interface
On the Career Profile's Overview: **Injury History** with the indicator chip, three numbers (career injuries, games missed, the existing Durability attribute), the tracking note when it applies, and a folded injury log (opened when he is injured now), newest first: season · week (· playoffs), the game's own words (severity and body part), where it happened and the expected time out, games missed (and how many in the playoffs), and the return ("back Week 6", "recovered in the offseason", or "Out now"). No injury since tracking: "No injuries recorded since tracking began." Hall of Fame snapshots and archived pages show no section.

### 50.5 Career Timeline
Three entries, kept few: **First career injury**; **Returned after missing N games** (3 or more; shorter absences stay in the log only); **Played every game of a season** (the first full regular season with every game played, once per career, from the season books; only for a season tracking covered from week 1).

### 50.6 Owner decisions (approved 2026-10-25)
- The thresholds in §50.3: **approved** as proposed.
- The fourth state "Not enough history yet" before 9 games of opportunity: **approved**.
- **Participation-based denominator, verified** (`tools/injury-verify.mjs`, seeds 41 and 77, 3 seasons of the 16-club league): opportunity counts only games in the game-day lineup (exactly the players `progression.afterGame` rolls injuries for, kicker aside) plus games missed to injury. A bench monster gains none, so he reads "Not enough history yet", never "Low" for lack of exposure (seed 41: 217 bench monsters, all "Not enough history yet"); backups and starters are rated by the same per-game rates (seed 41: starters 216 Low / 46 Moderate / 18 High; backups 20 Low / 4 High / 38 not enough history). Appearances agree with the box scores (box-score games ≤ appearances ≤ club games; the ~3% extra are lineup players with an empty stat line, who were still exposed to the injury roll). Tracking that begins mid-career (season 3, week 5) counts only the tracked games, dates nothing earlier and shows the note for every veteran. The summary recomputes by hand for every monster.

### 50.7 Testing
`tests/injury-history.test.js`: opened once, games missed once per game, return week, byes, a second injury never merged, the offseason, injuries before tracking, practice vs away, playoff misses kept apart, the indicator (not by raw totals), a played league (owner and AI, AI–AI, playoffs), tracking never changes the game, trades/release/evolution/legends, save and reload, an existing save (nothing created on load), the profile section and the timeline. `tools/injury-study.mjs`: multi-season accuracy (no duplicates; games played + regular-season games missed ≤ the season's games for every monster on one club all season). `tools/injury-ui-check.py`: the section at 320–430 px. `tools/injury-release-check.mjs`: a real v42.2.1 save opened by this build (nothing fabricated, tracking from the first week played). `tools/injury-oldbuild-check.mjs`: v42.2.1 plays and saves a save carrying the record and keeps it byte-identical.

## 51. Evolution Experience Overhaul (IMPLEMENTED 2026-10-25, owner brief; v42.4.0; APPROVED, MERGED (PR #59) and RELEASED to the main link, artifact version 100)

A presentation overhaul. Evolution rules are exactly as before: ready at the species' level (`evolutionReady`), performed by `tryEvolve` (+3 to what the position uses, +1 elsewhere, capped at 99; potential +4; the same id, level, experience, ability, contract and salary until renewal), manual for the owner's monsters from the monster page.

### 51.1 Order of operations (integrity)
Tapping **Evolve** snapshots the monster, calls `F.evolveMonster` once (which evolves, writes the Career Timeline entry, the dex and the news) and saves; only then does the scene open, built from a report of the two snapshots (`src/franchise/evolution-report.js`). The animation never decides anything: Skip, Replay, Continue, the back button, closing the app or a reload mid-animation cannot cancel or repeat the evolution. A second tap is refused by the existing rule (not ready again until the next form's level); the button is disabled while the scene opens.

### 51.2 The sequence (`src/ui/evolution-scene.js`, full screen over the game)
- **A Evolution begins** (0 s): darkened scene tinted by the monster's type, "EVOLUTION" and the name, the monster centred at stage size, a soft pulse and float, sparks gathering.
- **B Energy buildup** (1.8 s): the glow climbs, three energy rings pulse outward, the body brightens, sparks spiral faster, a controlled 2 px shake (off with Screen shake off).
- **C Transformation** (4.3 s): the body becomes a bright silhouette, which morphs between the old shape and the evolved form's own silhouette three times (0.45–0.55 s apart: never more than about two swaps a second), then one soft flash (0.9 s, not repeated).
- **D Reveal** (7 s): the evolved form, large and in colour, with a pop, rotating type-coloured rays, a burst of its type and the banner "FLAROO EVOLVED INTO BLAZYNX!" with type, position and form ("First evolution"). Tap or "See results" moves on.
- **E Results** (10.4 s): previous form → new form (sprites, names, base form / first evolution / final form), Overall and Potential before → after, **Attribute improvements** (Before / After / +n with growing bars) for the changed attributes the position uses, "+1 to N other attributes", **Show all 12 attributes** (unchanged ones read "no change"), a new ability only if one differs (none under today's rules), "Next evolution at level N" or "Final form reached", "Salary unchanged until contract renewal", and the Career Timeline milestone. **Replay** and **Continue**.
- **Skip** (top right) goes straight to the results at any time; Escape does too (and Continue on the results).

### 51.3 Sprites and effects
- Sprites are the game's own 16×16 SVG art, drawn with `crispEdges` at a whole multiple of 16 (208 px at 320 wide, 256 px at 390, 272 px at 430; at most 66% of the width and 38% of the height): sharp, whole, centred, never clipped. The evolved form is the real evolved design (`formOf`), with the individual's own tint.
- One canvas particle engine (`src/ui/evolution-fx.js`) with a theme per type: Fire embers, Water bubbles, Electric lightning arcs, Nature leaves, Ice crystals, Dark shadow wisps, Light rays, Metal sparks, Earth dust and stones, Wind swirls, Psychic floating rings, Dragon aura. Particles are pixel squares, kept around the monster, never over the results. Phases follow the stages (gather, build, burst, celebrate, off).

### 51.4 Reduced motion
With the game's Reduce motion setting or the system preference: no particles, rings, shake, flash, swaps or spinning rays; the scene fades in, the old form cross-fades into the new one with a soft glow (1 s), then the reveal and the results (about 5.6 s; Skip still works).

### 51.5 Sound (owner decision to confirm)
The game had no audio system and no mute setting. Three short cues (buildup, transformation, reveal) are synthesized with the Web Audio API (no files, no library), **off by default**, switched on from the scene's 🔇/🔊 button or Settings → "Evolution sounds" (`settings.evoSound`). The audio context starts only after a tap; unsupported browsers stay silent; the scene never waits for a sound.

### 51.6 Career Timeline
The existing entry (`evo:<stage>`: previous form, new form, season, week) now also keeps the level and overall before → after, shown in its detail sheet and description ("Flaroo evolved into Blazynx at level 10 (overall 56 → 59)"). Older entries without them still render; pre-evolution records and career statistics continue unchanged.

### 51.7 Save compatibility
No schema change. New optional data: `x.lvl` / `x.ovr` on new evolution entries and `settings.evoSound`. A v42.3.0 save opens byte-identical and its old evolution entries render; v42.3.0 opens a save made here, plays a week and keeps both fields byte-identical (`tools/evolution-compat-check.mjs`).

### 51.8 Performance
CSS for the sprites, glow, rings, rays and flash; one canvas (device pixel ratio capped at 2, ≤110 particles, halved automatically if frames run slow) that stops when the scene closes. Headless Chromium at 390 px: ~56 fps; with the CPU throttled 4× (a lower-powered phone) ~50 fps average, 95th-percentile frame 33 ms, no downgrade needed. Nothing runs during football; nothing is added to the save path.

### 51.9 Testing
`tests/evolution-overhaul.test.js` (8): eligibility; the evolution exactly as `tryEvolve` makes it; the real forms and sprites; only real changes in the report (capped attributes and potential); the Career Timeline; captain chemistry, injury history and the rest of the franchise untouched; no duplicate rewards, save and reload, determinism; sprite sizes, timings, labels and the twelve themes. `tools/evolution-ui-check.py`: the real Evolve button at 320–430 px, every stage checked for full screen, overflow, whole sprites, touch-sized visible buttons and overlapping text; Skip, Replay, Continue, reload mid-animation, reduced motion, the sound toggle, frame times with the CPU throttled 4×; screenshots. `tools/evolution-saves.mjs`: the disposable save (test fixture: one evolvable monster of each type raised to its evolution level).

### 51.10 Owner review (2026-10-25) and pre-merge verification
- **Approved:** the five-stage presentation and design. **Sound:** keep the three synthesized cues, **off by default**, switchable from Settings and the evolution screen, the choice saved with the franchise (`settings.evoSound`) so it persists between sessions.
- **Audio and browser rules:** when sound is on, the audio context is created inside the Evolve tap itself (the scene opens synchronously in that tap), so iPhone Safari allows the later cues; a context that is still suspended is asked to resume and that cue is skipped, never forced. With sound off no audio context is ever created.
- **Verified** (`tools/evolution-verify.py`, Chromium with autoplay requiring a tap, reloads standing in for closing the game): saved exactly once (and once after a reload); Replay ×3, Skip and Continue add nothing and evolving again is refused; Captain Partnerships, Injury History and the roster byte-identical; the full sequence plays with sound off and creates no audio context; the Settings choice and the scene button both persist across reloads, audio starts only inside a tap, 12 tones play when on and none when off; reduced motion plays the calm sequence with no particles, rings or flash; every number on the results panel (all 12 attributes, overall, potential, forms, salary) equals the monster's real change. Save compatibility: `tools/evolution-compat-check.mjs`.

### 51.11 Possible future improvement: resuming an interrupted reveal
Today, closing or reloading during the animation keeps the evolution (it was saved before the scene opened) but the scene does not come back: the monster page shows the new form and the Career Timeline entry keeps the before/after forms, level and overall. Resuming the reveal would need a small pending-reveal record in the save (`f.evoReveal = { report, fromStage }`) written with the evolution, cleared by Continue with a **second save write**, and a check at app start (after the franchise loads, before the first screen) that reopens the scene at the reveal or results. It cannot repeat the evolution (the scene only shows the report), but it adds a save field, an extra cloud write per evolution and app-start routing (and on two devices the reveal could reopen on the other one). Not done in v42.4.0 by the owner's instruction to avoid expanding save state; recorded for a later release.

### 51.10 Preview Evolution (Developer Tools, v42.9.0)
Main Menu → Developer Tools → ✨ Preview Evolution (`src/ui/screens/evo-preview.js`, data in `src/lab/evo-preview.js`). Pick any species that evolves (24 species, 30 transitions read from the dex; Legendaries and standalone species are never listed) and, for a two-stage species, the transition. The card shows the current form, the destination, the evolution level, the overall change on the preview copy, any new ability and the next form. **Start Preview** opens the game's own scene (`openEvolutionScene`, the call the roster's Evolve button makes) on a temporary monster: the real `tryEvolve` applied to a deep copy and the real `evolutionReport`, without `franchise.evolveMonster`'s bookkeeping. **Replay Evolution** plays the last one again, as often as wanted; **Return to Developer Tools** goes back. Strictly visual: no roster, level, XP, attribute, ability, collection, achievement, timeline, save or resource is read or written, and the scene's sound button changes only the preview, never a saved setting. Works without a franchise loaded. Tests: `tests/evo-preview.test.js`, `tools/evo-preview-check.py` (phones at 320/375/390/430 px).

## 52. v42.4.1 release fix: stale cached files and the Injury History section before the first game (2026-10-25, owner report)

**Owner report (iPhone, after v42.4.0 was published):** no Injury History section in the Career profile, no sound option in Settings.

- **Cause 1, stale cached files.** Only `index.html`'s two entries carried the release (`app.css?v=`, `main.js?v=`); the ~140 modules main.js imports did not, so a phone could keep running older cached copies (here an older `menu.js` without the sound switch, an older `career.js` without the section) next to a new `main.js`. Reproduced in Chromium with game files cached for a day (`tools/cache-upgrade-check.py`, case 1: every run kept the old Settings).
- **Fix.** `tools/stamp-release.mjs` writes an import map into `index.html` sending every module reachable from `main.js` (138) to its `?v=<release>` URL, so every changed file is fetched on a new release. `src/fresh.js` (no imports, runs before `main.js`) checks with `import.meta.resolve` that the map is in effect; if not, it re-fetches every listed file from the network once per release and reloads, and `main.js` waits so nothing is read or saved with mixed files. Settings shows "files up to date / refreshed" next to the build. `tests/release-stamp.test.js` fails if `index.html` is not stamped for the version in `src/version.js`. Release step: bump `src/version.js`, run `node tools/stamp-release.mjs`. Cache check: from v42.2.1 and from v42.4.0, three runs each, the stamped page and the map-ignored backstop always land on v42.4.1 with the sound switch. A cached copy of `index.html` itself is outside the game's control (the host decides); then a full close and reopen loads it.
- **Cause 2, Injury History hidden before the first game.** The record starts with the first game played on v42.3.0+, and the section was hidden until then. It now shows at once for an existing save: "Tracking starts next game", Durability, and "Injury history tracking starts with your next game (season, week). Earlier seasons are not on record." Viewing writes nothing.- **Quality of life (owner request): Previous / Next on a monster page.** A slim bar under the title (Back and Help stay where they are): "‹ previous name · 3 / 32 · DL · next name ›", pinned while scrolling. It walks the roster in the Depth view's order (offense QB→OL, defense DL→S, then the kicker; each monster once, at his own position) and wraps around. Each step replaces the page, so Back returns to wherever the owner came from (the Roster), not through every monster browsed. Browsing writes nothing (`tools/roster-nav-check.py`).

## 53. QB Intelligence Overhaul: Read Progression and the AI Testing Lab (IMPLEMENTED 2026-10-25, owner brief; branch `qb-intelligence`, v42.5.0; NOT MERGED, NOT RELEASED)

### 53.1 Root cause (Phase 1 audit, measured)
The engine already had a progression (primary → secondary → …, paced by Awareness), so the target was never hard-coded. The QB judged "open" by `projectedSeparation`: each defender projected in a straight line at his current velocity, ignoring that every coverage defender sprints to the ball once it is thrown (`baseBreak` 9–12 yd). Measured against the real separation at the ball's arrival, it overestimated by **3.6 yd (median) and 7.8 yd (90th percentile)**: the QB saw 7.5 yd of space where there were 3.5. The first read therefore almost always cleared the bar and the progression rarely advanced: **~80% of throws went to the primary on the first read**, regardless of defense (Stick → TE 78/78, Y-Cross → TE 78/78), and Awareness barely mattered (primary 79% / 81% / 82% at Awareness 50 / 75 / 95; completion even fell slightly with Awareness). Also: only the nearest defender counted (double coverage invisible); judgement noise was redrawn every 0.05 s tick (a covered receiver could flicker "open"); scrambles were a flat 30% roll above modest agility and throw-aways a flat 12% roll with no grounding rule; pressure was one on/off distance. Read-option, play-action, boot and screens are separate branches (kept). There is no RPO play in the playbook.

### 53.2 Production read progression (`src/sim/engine.js`, `src/sim/qb-read.js`; one engine, no second passing engine)
- **Arrival window** (`arrivalWindow`): the catch point (the receiver led along his route for the wind-up and flight) and, per defender, the margin = distance after the wind-up − his full-speed closing distance over (flight − 0.2 s reaction). m1 / m2 = nearest / second-nearest; `lane` = the nearest is undercutting (between passer and catch point). Night Veil defenders are invisible to the QB. Calibrated: median error 0.4 yd (was 3.6).
- **Throw odds** (`throwOdds`): from the engine's own catch radius (plus the receiver adjusting to the ball in flight), accuracy error, contest and pick rules → pComp, pInt, **quality = pComp − 2.5·pInt**, EV. Calibrated on 1,179 forced throws: predicted vs actual completion within ~5–10 points across the range.
- **Reads take time**: one look per receiver; the first look is taken as he finishes the drop (no throw before his feet are set). Each look draws **one** judgement from the QB's own random stream (perception never shifts the play's physics). He throws when the perceived quality clears the **bar** (`acceptBar`: 0.56, −0.04 on the designed first read, −0.07 per completed cycle, falling after 1.6 s in the pocket, −0.14 under pressure). Otherwise: next read; after the last, a **revisit** of the best he has seen (memory expires: coverage changes after the snap are re-read).
- **Awareness** (`awarenessProfile`, a = Awareness/99, low = 1 − a): look 0.40 − 0.22a s; judgement noise 0.30 + 2.0·low^1.25 yd; fixation (overrating the primary) 1.6·low^1.5 yd; lock (staring at the primary again) 0.6·low^1.3; missing the second defender 0.75·low^1.2; peripheral recognition of a clearly open receiver 0.08 + 0.6a²; pressure sense 1.6 + 3.2a yd; reacting in time 0.35 + 0.65a; lane-judgement noise 0.05 + 0.35·low s. Guidance bands: 40–54 often locks on; 55–69 progresses but forces some; 70–82 sound; 83–92 quick and clean; 93–99 elite, still fallible.
- **Pressure**: a threat is a free rusher (in the backfield or on a rush/contain assignment) closing at ≥ 1.5 yd/s; time to hit from his closing speed. Sensed pressure shortens each look (×0.7) and lowers the bar. A rusher about to arrive (< 0.3 s, < 3.4 yd): a lesser passer may freeze (react chance); otherwise a hot glance across his receivers (hot routes count as ready) and the best throw if it clears the hot bar; a clearly open lane for a mobile passer; a legal throw-away; or he takes the hit.
- **Scrambles** (`runningLane`, `expectedRun`): five directions, 5 yd out, defenders carrying 0.35 s of momentum; expected yards = −1.5 + 10·margin + 5·(mobility − 0.6), fitted on forced scrambles. Scramble only when it beats the alternatives: after a full cycle with nothing open (lane worth ≥ 0.9 yd), late in the down (≥ 0.5 yd), or escaping a rusher with a clearly open lane (≥ 3.2 yd). Never just because the first read is covered.
- **Throw-aways and grounding**: outside the tackle box (|y| > 3.4 from the snap) any throw-away is legal; inside it only toward an eligible receiver's area (a route runner within 22 yd); never in a defender's grasp. The AI throws away only when legal; a human's illegal throw-away in the Lab is recorded as intentional grounding (there is no grounding penalty in the rules engine; noted as a limitation).
- **Late in the down** (after ~2.6–3.0 s): the best throw he has (quality ≥ 0.22), else a scramble, else a legal throw-away, never reading forever.
- **Abilities kept**: Foresight (faster hot reads vs a blitz), Pressure Sense, Refraction (+20% misjudgement near him), Night Veil, Whiteout (first read frozen), Sovereign Arm (first-read throw), Tailwind range. `options.forcedTarget` (tools, future player control) keeps the old single-read path untouched.
- **Defense**: unchanged. Defenders react to the throw as before (no knowledge of the intended target before the release); coverage and awareness ratings keep their effect.
- **Difficulty**: changes opposing club quality only (GDD §17); the QB's decision logic is the same at every difficulty.

### 53.3 Recorded read log (`sim.qb`) and replays
`sim.qb = { v: QB_MODEL_VERSION, order, reads, decision, aiWould, sensedAt }`. `reads`: `{ t, kind: 'read', n, slot, why: progression|fixed|noticed|periph|revisit|hot, reason: open|covered|double|lane|tight|not_ready|out_of_range|noticed, q (perceived quality), trueQ, bar }` and `{ kind: 'pressure', by, dd, lane }`. `decision`: `{ t, action, slot, reason, read, m1, m2, odds, q, trueQ, bestTrueQ, board, windows, forced, missed, sensed, pressured, lane, legal, by }`. The same entries are in `sim.events` (kind `qb_read` / `qb_pressure` / `qb_decision`, readable text). Frames carry `read` (the current read, then the target through the wind-up). **Replays** list the recorded reads under the field (`src/ui/qb-read-ui.js`): "Read 1: WR1 — Double coverage · Read 2: … · Decision · Missed opportunity · Result", only from what was recorded. **Settings → Show QB Read Indicators** (off by default, saved with the franchise, live without restarting): a thin dashed ring on the receiver being read during passing plays; off, the field is unchanged. The Practice Field shows both.

### 53.4 Results (tools/qb-study.mjs; before = v42.4.1 engine)
- Full games (36 per side): points per team per game 12.5 → 13.4; completion 55.5% → 55.7%; yards per attempt 7.17 → 7.36; interceptions 1.6% → 1.8%; sacks 1.1% → 1.7%; scrambles 0.6% → 1.0%; throw-aways 0.2% → 0.6%; **primary-target share 82.5% → 54.2%**; top target per play 87.8% → 69.4%; throw time 1.82 → 1.99 s.
- Awareness 50 / 75 / 95 (every pass play × every base defense): primary share 60 / 51 / 49%; **missed open receivers 12.3 / 6.1 / 3.6%**; forced throws 1.7 / 0.9 / 0.5%; sacks 5.4 / 3.2 / 1.6%; interceptions 1.2 / 1.4 / 0.9%; completion 59.0 / 60.7 / 61.5%; decision quality 0.629 / 0.660 / 0.674 (91 / 95 / 96% of the best available).
- Mobility: a 95-speed QB scrambles ~0.9% of dropbacks for +2.8 yd; a 40-speed QB almost never.

### 53.5 AI Testing Lab (Developer Tools → 🧠 AI Testing Lab)
- **Engine**: the real `simulatePlay` with generated practice clubs (never a franchise). `options.qb` = `{ mode: 'hold' }` (the AI never acts; `aiWould` records what it would have done) or `{ mode: 'human', at, action, target }` (the human's decision applied through the normal mechanics). Because perception has its own random stream and the AI is held, the AI's play, the held play and the human's play are **frame-for-frame identical up to the first decision** (verified). `options.fork = { at, seed }` re-seeds only what happens after the decision: each decision is rolled out 10 times for a fair comparison (expected yards, completion, interception, sack), so one lucky completion proves nothing.
- **Mode A, Live**: the defensive call comes from the game's defensive coach AI (`chooseDefensePlay`); Snap; the play runs in real time (QB held); the owner taps WR1/WR2/WR3/TE/RB (whatever routes the play has), Scramble or Throw away. **Mode B, Paused**: the play freezes at the AI's decision point (or while the QB still has the ball if the AI never decided); the same situation can be repeated. Nothing measured is shown before the decision.
- **After the decision**: both decisions and times, agreement, every receiver's measured window at that moment (quality, separation, double coverage, lane), pressure and coverage, both actual results, expected outcomes over 10 replays, the AI's recorded reads; Watch the AI's play; Same situation; Next.
- **Data** (src/lab/lab-store.js): IndexedDB database `gb-ai-lab`, separate from franchise saves and the cloud save; nothing uploaded. Data tab: totals, agreement, sessions, by offensive play / coverage / Awareness band, missed-open and forced-throw analysis, scrambles and throw-aways, findings with suggested model adjustments (review only, never applied automatically), export (JSON via the downloads capability), import with validation, clear, storage estimate and a nearly-full warning.
- **Training record** (`gridiron-beast/qb-decisions` v1, ~4 KB): id, timestamp, sim (build, qbModel, seed), mode, situation (plays, ball, down, distance, coverage, blitz, tags), QB ratings, receivers (route, progression index, ratings), defenders (assignment, zone, key, ratings), progression and read order, field at the decision (positions, velocities, engaged), windows (m1, m2, lane, developed, reachable, air yards, quality) and board, pressure, running lane, decision time, human action/target/quality/legality/response ms, AI action/target/time/reason/quality/forced/missed/reads, the AI's would-be decision in the held play, both results, expected outcomes, agreement. Designed so a learned model could be trained later; no machine-learning dependency.
- **Calibration process**: findings (e.g. "the AI threw into double coverage on N% of throws", "you took the checkdown when the AI did not", "high- and low-Awareness AI decided almost equally") name the parameter to revisit (§53.2). Changes are made in a branch, re-run through tests and `tools/qb-study.mjs`, and approved by the owner before reaching the production engine.

### 53.5a AI Testing Lab gameplay and controls (v42.6.0)
- **No intentional throw-away anywhere** (owner, 2026-10-25): the production QB AI and the Lab no longer throw the ball away (the `no_receivers`, `pressure` and `nothing_open` branches of the read progression, the random throw-aways of the forced-read path and the Lab's button are gone). On a pass play the quarterback throws, scrambles, or keeps holding the ball while he reads; if the rush gets home it is a sack. Nothing replaces the throw-away (no automatic pass or scramble). The `throwaway` result stays readable for older saves and older Lab records. Quick check (24 games): throw-aways 0.9% → 0%, sacks 3.2% → 3.6%, completion and points unchanged.
- **Play like a quarterback**: the owner picks any live pass play (play-action included; the playbook has no RPO with a passing branch) or Random pass play. Before the snap the field shows that play's own art (the Franchise Mode renderer: routes, blocks, special routes, colours) and the defense only in its base alignment, as in a game. The art goes at the snap. The defensive call, its name, coverage and diagram are never shown before the play is over; the results open with the defense's name, coverage and play diagram.
- **Controls**: tap a receiving monster on the field to throw to him (any route runner: WRs, TE, RB), tap the quarterback to scramble; defenders cannot be selected; 3.2-yard touch zones, nearest monster wins on overlap, the field ignores scrolling during the play. The tap acts at that moment (Lab human mode applies the decision at once; the AI's own timing is unchanged). The normal rules still apply after the tap (accuracy, coverage, interceptions; a rusher who reaches the QB during the wind-up can sack, strip or be escaped). Not tapping is allowed: the play runs on and is recorded as `hold`.
- **Defensive rotation**: per offensive play, every live defense once in a shuffled order, none repeated until all have been tested, then a new shuffle (a new cycle never opens with the last defense). Next situation moves on; a situation left unfinished (another play chosen) does not count and its defense stays next for that play. Kept in the Lab's database (`gb-ai-lab` v2 adds a `meta` store; decisions are kept on upgrade) with matchup counts. Shown as "Defenses tested: 8/26 · cycle 2"; the next defense is never shown.
- **Camera**: 10 yards behind to 36 yards beyond the line (deeper than the match camera) so deep routes stay in view.

### 53.5b Attribute audit and the Attribute Testing Lab (v42.7.0, GDD §8.2)
- **Audit** (report: "Gridiron Beast — Attribute Effectiveness Report (v42.6 audit)"): every read of the twelve attributes traced through engine.js, special-teams.js, progression.js, monsters.js and the Clash engine; controlled tests on the real engine with every monster a plain 65, no ability, no type, only the subject's attribute at 50/75/95, 300 identical seeds per level (`tools/attr-study.mjs`). Nine attributes work; three confirmed problems, none fixed yet: (1) deep passes punish fast receivers (the lead is computed for a shorter flight than the ball takes and the receiver overruns the landing spot: open deep ball caught 48% at Speed 50, 13% at 95); (2) man Coverage is inverted on routes that break back (a 95 overruns the break and never drives back: 4.9 vs 3.0 yards after a comeback); (3) ball-carrier Awareness (vision) has no measurable effect (lane choice starts after contact). Smaller: DL Tackling does not finish sacks, defender Catching rarely picks, run recognition is a cliff between 50 and 75, play-action bite is invisible. Beast Clash: nine attributes act only through overall; archetype multipliers outweigh any single attribute.
- **Attribute Testing Lab** (Developer Tools → 📊 Attribute Testing Lab, `src/ui/screens/attr-lab.js`, trials in `src/lab/attr-trials.js`): pick an attribute, a trial (position · situation), a low and a high rating and a play count; both ratings run on the real engine with the same seeds; the results table is the engine's own measurements with units and a noise note; "Watch one play side by side" animates the same seeded play at both ratings on two fields with the subject ringed. Durability and Kicking run their own functions. Nothing stored, no franchise touched.

### 53.5c Attribute fixes: Speed, Coverage, carrier Awareness (v42.8.0)
Three defects from the §53.5b audit, fixed in the engine (`src/sim/engine.js`); the QB read progression, its Awareness formulas, decision timing and target selection are untouched. Before/after from `tools/attr-study.mjs` (300 seeds, plain 65s) and 24 headless games.
- **Deep-ball lead and receiver tracking.** `throwTo` now iterates the lead so the predicted spot and the ball's flight time agree (the old lead used the distance to where the receiver stood plus a tenth, shorter than the real flight, so a fast receiver outran the ball). The target now runs to the landing spot at the pace that arrives with the ball and brakes into it at no less than 75% of top speed (he used to run there flat out and stop only inside 0.2 yards, overrunning by his braking distance). Vertical routes (go, fade, seam, wheel, post, corner) keep working 14 yards past their drawn line instead of 6, so a receiver is not parked where a strong arm's ball cannot be chased. Open deep ball caught, Speed 50/75/95: 48/29/13% → 38/45/53%; with the AI quarterback, deep targets completed 47/32/25% → 30/44/53% and yards per target 14/13/14 → 9/18/30. A receiver at full stride still cannot run under an overthrow, which is why 50 Speed lost ten points.
- **Man coverage on breaks.** The man defender now reacts only to what he can see: the receiver's position and velocity a reaction delay ago (`observedVelocity`, Coverage shortens the delay), never his true velocity or route. He anticipates along that observed line (capped at 3.5 yards), drops the projection when the receiver slows for a break (a 95 notices an 11% gear-down, a 50 a 27% one), plants for the break with the same 1.9× burst the receiver's cut gets, and drives downhill to a receiver who has broken back or sat down instead of shuffling. The man defender on the target also plants when a ball is thrown behind his run. Comeback, Coverage 50/75/95: separation after the break 3.0/4.3/4.9 → 1.0/2.3/1.6 yards, completion allowed 60/62/64% → 65/63/50%; go route completion allowed 22/17/21% → 23/15/13%. Zone coverage was reviewed and left as it was (it was not inverted; an observed-velocity version moved a linebacker 0.7 yards and broke inside-zone blocking, so it was reverted).
- **Carrier vision.** Two changes. (1) Open field: the carrier steers to his chosen lane 8 yards ahead instead of to the end line at that lateral (a lane 6 yards over used to be a 6° lean, so lane choice and jukes were never actually run); a sharp runner re-reads every 0.2 s, a poor one every 0.3 s; defenders near the far edge of his read barely count. (2) Pre-contact (`preContactLane`): from the handoff he presses the designed hole and reads it on the way in (from 5 yards out at 95 Awareness, under 4 at 50), seeing unengaged defenders between him and just past the hole (missing 45% of them at 50 and placing them 1.6 yards off; a 95 reads the flow of their movement), weighing each lane by defenders in it against free blockers, and bending the rest of his path to a neighbouring lane only when it reads clearly better (once per carry, with a plant; event `cutback`). The playbook's drawn path is never changed. Awareness 50/75/95: power 5.2/5.5/6.0 yards, inside zone vs cover 2 7.4/7.6/7.7, toss 2.9/3.2/3.3, stacked front 0.0/0.4/1.0, yards after a flat catch 7.1/8.0/7.9; inside zone vs cover 3 stays flat (5.9/5.8/6.0: the call is the best lane there). Cutbacks are rare (2–10% of inside-zone carries).
- **Kept in balance.** Picks: a defender within a yard of the ball now plays it when the receiver is not clearly closer (0.35 yards), and the pick roll on a reachable ball went from 0.5× to 0.78×, so interceptions stay at the pre-fix rate (1.1% → 1.2% per attempt on the engine's balance batch) now that under-led balls no longer fall to trailing defenders.
- **Passing calibration** (owner's target: about 65% completion in representative games with abilities on, NFL average as the reference). `tools/passing-calibration.mjs` plays matched games in three variants (as played: species abilities and types on; abilities off; abilities and types off), same seeds, and reports completion per attempt (sacks are not attempts), sacks per dropback, interceptions, yards per attempt, deep completion, ability activations (about 220 a game, on 97% of plays). With the fixes alone, completion rose to 74.4% with abilities on (68.1% off; 59.8% on before the fixes), because the accuracy error model had been tuned against the under-led ball. One change: the landing error's base is ×1.45 (`throwTo`: `err`); Accuracy's, pressure's and distance's shares of it are unchanged, no ability formula was touched. 48 matched games after: abilities on 64.5% (by QB Accuracy band <60 / 60–69 / 70+: 60.9 / 62.7 / 66.7%), off 62.8%, both off 63.0%; sacks 2.5% of dropbacks (3.3% before the fixes); interceptions 1.4% (0.9%); yards per attempt 7.9 (7.2); deep completion 50% (47%); rushing 6.2 yards per carry (6.7); points per team 13.7 (12.8). Controlled spreads at the new scale: Accuracy 50/75/95 completes 64/75/82% on a forced curl; Catching 62/68/78%; open deep ball by Speed 29/38/46%.
- **Rushing** 6.66 → 6.23 yards per carry (lanes are now really run to) is the one remaining balance shift from the fixes.

### 53.5d Defensive AI audit and the Defensive scenario lab (v42.9.0, audit only)
An audit of the defense, not a change to it: every measurement runs the real engine, and the defensive gameplay is byte-for-byte the v42.8.0 engine (proved over 1,768 play pairings, and by `tests/def-scenario.test.js`). The full report, with the ranked recommendations awaiting the owner's approval, is the "Defensive AI Audit" document; the numbers come from `node tools/defense-audit.mjs [--n=200] [--games=24] [--only=...] [--json=FILE]`.
- **Developer trace** (`simulatePlay(..., { trace: true })`, `src/sim/engine.js`): every defender's branch of `defenseTick` (engaged, ball, run-fit, pursue, pa-bite, rush, contain, man with the read he made, zone with the receiver he took and how many were in his zone, spy) and the point `steer` is driving him to are recorded on each frame as `frame.dbg = [[slot, why, detail, aimX, aimY, recognisedRun]]`. Off by default; when on it only writes these fields, so the play is identical. Normal games, the match screen and the field view never set or read it.
- **Defensive scenario mode** of the Attribute Testing Lab (Developer Tools → 📊 Attribute Testing Lab → 🛡 Defensive scenario; `src/lab/def-scenario.js`, overlay `src/ui/def-overlay.js`): any offensive play against any defensive call (grouped Man / Zone / Blitz / Run front), presets for the audit's cases (man go / comeback / drag / back to the flat, zone curl / post / flood, pass rush hold, DB blitz, inside and outside zone, play-action); the tested defenders (one slot, the coverage group, the pass rushers, or everyone) and the attribute; the quarterback as the real AI, holding 4 s (rush test) or throwing to a chosen receiver at a chosen time; low/high ratings and a play count with the same seeds. Summary table: yards allowed, explosive plays, completion allowed, separation at arrival, interceptions, sacks, time to pressure, yards per carry, broken tackles. "Watch one play side by side" draws both ratings with the developer overlay: each defender's assignment (orange line to his man, dashed circle for his zone), intended movement (cyan dashes to the engine's steering point), actual movement (white trail, last second) and decision label, plus a per-defender decision list; Pause, frame step back/forward, 0.25×/0.5×/1×; each layer can be switched off and one defender focused. The overlay exists only in this mode.

### 53.5e Defensive fixes 1 and 2: lateral man coverage, reading the throw (v42.10.0, PROPOSED, awaiting owner approval)
The first two fixes from the §53.5d audit, in `src/sim/engine.js` only. The QB read progression, its decisions and the passing calibration are untouched, and passing was deliberately not recalibrated afterwards.
- **Man coverage on lateral routes.** When the man defender sees his receiver moving across the field in front of him (observed velocity, the same reaction delay as v42.8: more than 2.5 yd/s and at least 1.5× more across than upfield), he plants once and mirrors him at full speed from a yard over the top, anticipating along the observed line by Coverage, and never aims behind the line of scrimmage (x ≥ 1). The old "shuffle" (a third of his speed, never closing) remains only for a receiver still releasing toward him. Speed and Agility decide whether he keeps up.
- **Reading the throw.** Defenders no longer know the landing spot at release. Each first has to see the release: 0.32 − 0.12×Awareness − 0.12×Coverage s (normalised ratings), +0.08 s for a man defender whose man is not the target, minus the Reaction ability, at least 0.05 s; until then he keeps playing his assignment. Then he steers to where the throw looks headed (`ball.aim`, the passer's intended point on the receiver's path), moving to the true landing spot over the first 0.85 − 0.3×Awareness − 0.2×Coverage of the flight. Deterministic (no dice). Receivers still run to the true spot (unchanged).
- **Review fix (before merge).** Once the cross is read, the mirror anticipates by Coverage (0.12 + 0.3×Coverage s of observed speed, at most 3.5 yd) even while the receiver is still gathering out of his cut; the general lead had shrunk to nearly nothing there and left a Coverage-50 corner standing on a dig's break (dig gap at arrival 3.5 → 2.6 yd).
- **Measured** (`tools/defense-fix-compare.mjs`, `tools/defense-audit.mjs --root`, `tools/passing-calibration.mjs --root`, `tools/qb-quality-compare.mjs --root`; before = v42.9.0, same seeds): drag in man 5.6 → 3.2 yd separation at Coverage 50 (2.4 at 95); back to the flat 10.4 → 5.8 yd (4.7), yards allowed 3.0 → 2.3 (1.2); reaction to the throw 0.05 s at every rating → 0.20 s (Awareness or Coverage 95: 0.15 s). Comebacks and digs vs man: separation at the throw is unchanged; the gap after it now grows with the defender's break-read delay, so it shrinks with Coverage (comeback CB gap at arrival 1.85 / 1.61 / 1.27 yd at Coverage 50 / 75 / 95, where v42.9 was 1.04 / 1.45 / 1.21, inverted at 50). Full games with abilities on (120): completion 63.8 → 63.4%, interceptions 1.2 → 1.4%, yards per attempt 8.20 → 8.37, sacks 3.0 → 3.0%, deep completion 48.8 → 45.9%; calibration tool (48 games) 64.5 → 63.4%. QB decisions on 2,032 matched plays: the same target 99.4% of the time, decision quality share 0.925 → 0.922, throws to a covered receiver while another was open 11.9 → 12.3%; in games the same covered receiver twice in a row 0.6 → 0.7% of consecutive passes. Interceptions in the 3,000-play engine batch across 12 seed ranges: 1.00–1.90% → 0.85–1.52%.
- Tests: `tests/def-fixes.test.js` (7); `engine.test.js` interception floor 1.0% → 0.8% (separates every healthy seed range from an engine with the pick chance halved).

### 53.5f Owner feedback fixes (v42.11.0, PROPOSED)
- **Free agents are fully known.** `freeAgentView` returns the complete card for every free agent (overall, potential, nature, all ratings, exact ask): they are veterans with public pro records. Scouting still governs the draft class and regional recruits.
- **Roster fit.** `positionFit(f, m, { ovr })` rates a monster against the owner's roster at his position: an open starting spot, better than the weakest healthy starter, the only backup, or covered; blue for offense, red for defense. Free-agent rows and sheets and draft prospect rows get a coloured border (solid would start, dashed would be the backup) and a one-line reason; the market lists fits first. Prospects use only the overall the scout knows.
- **Team needs.** `ownerNeeds(f)` (positions short of starters or with no backup, worst first) and the two weakest starting groups, shown in a "Your team needs" panel on the live draft, the draft class and the free-agent market.
- **Awards on career cards.** The current season's awards count on career cards as soon as they are announced (`f.season.awardsFinal`), not only after the playoffs archive the season; the same key as the later Career Timeline entry, so never twice.
- **Beast Bowl banner.** The post-game hero called any playoff game whose tag contained "final" the Beast Bowl, so a conference semifinal win read "BEAST BOWL CHAMPIONS". Now only the Beast Bowl itself (`isBeastBowlTag`); other playoff wins read "PLAYOFF WIN".
- Tests: `tests/owner-feedback-v4211.test.js` (5); the free-agent estimate test now checks the public card.

### 53.5g Final whistle fix and development-only QB reads (v42.11.1)
- **Continue after the final whistle.** v42.11.0 put a comment in front of `const playoff` on the same line, so the result screen threw ("playoff is not defined") after the game had been recorded and Continue appeared to do nothing. Fixed; `finishGame` also ignores a second tap. The game was always recorded exactly once (the second tap found no game to finish). `tools/final-whistle-check.py` now plays a regular-season and a playoff game to the end on a phone and taps Continue.
- **QB reads are a development display.** `BUILD.release` (src/version.js, false while in development) and `qbReadsShown(settings, { live })` gate every in-game QB read display: the replay read list and ring, the Practice Field list, and the live read ring. While in development they show by default and can be switched off in Developer Tools → Development displays; the released game never shows them. The toggle left player Settings. The AI Testing Lab keeps them (a developer tool).

### 53.5h Zone coverage intelligence (v42.12.0, gameplay approved by the owner; awaiting merge)
Audit fixes 5, 6 and 8 and the zone half of fix 3, in `src/sim/engine.js`. The QB read progression, passing accuracy, abilities, man coverage, run fits, pass rush and tackling are unchanged; passing was not recalibrated.
- **What was wrong.** A zone defender took the deepest receiver in his area, always; he saw that receiver's true velocity this tick; and Awareness played no part. Underneath overloads left the shallow receiver open, and Coverage barely mattered underneath.
- **Threat read** (`zoneRead`). Once the play shows pass (the quarterback dropping back with the ball, or the ball in the air; not on a run or while a play-action fake sells), each receiver the defender sees inside his area, or about to enter it, is scored on: inside / entering / leaving; depth for his role; distance; how open the receiver is; whether a closer teammate already has him (not when the receiver is visibly leaving that teammate's zone); the quarterback's facing and throwing motion; a small hysteresis for his current receiver; and a misjudgement term that grows as Awareness falls. Underneath: two close threats are split, leaning to the bigger one, never more than 2 yards out of the zone; a receiver still running upfield past him is handed to the deep help, a curl that has settled is not.
- **Deep defenders.** The deepest threat; never up for an underneath receiver while a deep one is there; the receiver only he covers before one a deep teammate's zone also covers (a Cover 3 corner carries the outside go, the middle safety the seams; weighted by Awareness); never doubles a receiver a closer deep teammate already carries (he holds his landmark instead); splits two deep threats until the throwing motion (more often when aware); within a yard of his landmark while anything near him runs vertically, down to 4 yards under it once nothing does.
- **The quarterback is read only from what shows** (revision): his facing direction (head, or shoulders in the throwing motion), seen after a perception delay (0.11 s at Awareness 50, 0.07 s at 95) and only as a direction, matched against where the quarterback stood and where each receiver was at that same moment, so receivers on one line share it. The defense never reads `qr.cur` (whom he is reading) or `qb.windup.r` (whom he chose). An unaware defender bites on every look; an aware one trusts a look in proportion to how long it is held (full weight after 0.5 s), and a deep defender weighs eyes less against his depth. Deep reads decided by the eyes: 10.1% at Awareness 50, 5.8% at 95 (13.2% / 10.8% in the first PR version).
- **Awareness** (reading): re-read interval (about 0.35 s at 50, 0.12 s at 95), lookahead for receivers coming in, how soon the facing and throwing motion are seen, resistance to look-offs, trust in a teammate's coverage, the deep split, the deep-help handoff, misjudgement, and half of the break read.
- **Coverage** (technique): the perception delay (0.45 − 0.33×Coverage − 0.12×Awareness s; 0.21 / 0.15 / 0.06 s at Coverage 50 / 65 / 95, Awareness 65), how far ahead he plays the receiver, and half of the window over which he judges direction. Speed and Agility still decide whether he gets there.
- **Observed movement only** (`zoneObserve`): position and velocity from the same delayed trail as man coverage, plus the latest seen step, so a receiver throttling down shows at once. On runs the old deepest-receiver drop remains, on observed movement.
- **Goal Line Man run support** (owner-approved correction, 2026-10-28). *Cause:* in one-back sets (11 of the 34 offensive plays) the call's second linebacker has no man to cover; the unassigned-man fallback sent him to the short middle 6 yards deep, while the linebacker manned on the back sits at the 4.5-yard man cushion. Before Phase A both knew a run at the snap and recovered; with the observable read nobody stood in the run fit (LB2 5.7–6.6 yards deep at the handoff). *Fix* (`src/sim/engine.js`, man case): an unassigned man defender on a run-front or goal-line call, while the ball is still with the offense, not in the air, and the quarterback has not shown him pass, stays at his snap alignment (2.5 yards) and moves toward the existing run fit by his graded read (`readLean`, `readFit`); once he commits he uses the established fit. Nothing else changes: assigned man defenders keep the 4.5-yard cushion, the read uses no hidden information, there is no yardage change and no guaranteed stop. Of all calls only Goal Line Man has a man key that can resolve to nobody on these calls (its 'back' key); 179 calls × 34 plays × 3 seeds replay identically except Goal Line Man (33 plays change). *Mechanism:* LB2 is 1.4–1.6 yards deep at the handoff, still commits only after it (about 0.29 s), and makes most stops (counter 153 and Power Left 140 of 200 tackles); long runs remain (longest 34/29/59 on counter/Power Left/Stretch Left). *Measured* (plain 65s, v42.13 → before the correction → final): 12-run average 2.13 → 3.63 → 2.49 yards (Counter 3.67 → 11.89 → 2.42, Power Left 1.64 → 5.08 → 1.97, Power Right 2.40 → 3.00 → 2.18); interior runs 1.00 → 3.82 → 1.71; outside runs 4.3 → 5.5 → 6.1 (Stretch Left 18.1 → 18.8 → 18.5: with the free linebacker inside, the edge is the call's run weakness); quick passes 6.47 → 6.81 → 6.82, screens 2.86 → 2.13 → 2.13, play-action 7.99 → 8.92 → 8.87, deep 5.89 → 7.99 → 7.99 yards per play. From the 5: inside-run touchdowns 3 → 13 → 3%, play-action touchdowns 30 → 27 → 29% (Goal Line Stand 5.87 yards per play on play-action, 10.18 on screens; Goal Line Man still beats it on screens and the quick game and is still the weaker call against play-action). In games against it: 3.04 → 6.21 → 3.67 yards per carry, touchdowns on 11.2 → 19 → 17% of plays. League totals barely move (yards per carry 6.03 → 6.01, points 13.9 → 14.0); every other call's matrix cell is identical.
- **Developer Lab.** The Defensive scenario overlay draws, for each zone defender, dotted yellow lines to every receiver he sees in his zone, a green line to the one he is playing (dashed to the second when splitting), a pink ring when he switches, and labels such as "WR2 · his alone (2 in zone)", "carried by a teammate", "two deep, splitting", "OVERLOAD". Four zone presets. Only in the Lab.
- **Measured** (same seeds, teams and calls, before = v42.10.0): 120 full games with abilities: completion 63.4 → 63.5%, interceptions 1.4 → 1.1%, yards per attempt 8.37 → 8.16, sacks 3.0 → 3.0%, deep completion 45.9 → 44.5%, yards per carry 6.19 → 6.05. Passing calibration 63.4 → 63.4%. Zone scenarios (20 cases, 200 plays each): Awareness 50 → 95 lowers completion by 1.1 points on average (before 0.0); Coverage 50 → 95 by 4.4 points (before 3.8). Four verticals vs Cover 3 over 800 plays per level: Awareness 50 / 95 completion 44.9 / 43.3%, yards 14.5 / 13.2, separation 2.28 / 1.82 yd (v42.10.0: 54% and 21 yards at every level). Accuracy over seven forced throws: +13.4 points from 50 to 95 before, +13.5 now.
- **Known trade-offs.** Without true velocity, zone defenders react to a break about 0.2 s later: a forced curl vs Cover 3 (61.5 → 74.5%) and the out into the Cover 2 hole on flood (67.5 → 72.5%) are easier at Coverage 65, and Coverage 95 restores most of it (curl 64.5%). The deep post vs Cover 3 completes more (65 → 70%) because the post is covered and the quarterback checks down: yards fall 7.1 → 5.5.
- Tests: `tests/zone-intel.test.js` (8); `tests/def-scenario.test.js` and `tools/def-lab-check.py` cover the overlay; the career fixture is seed 10 again. Owner-approved: the single forced-curl Accuracy assertion is replaced by `accuracyRoutesStudy` (seven forced throws; Accuracy 95 must complete at least 5 points more than 50 and reach the receiver more often), and each route's numbers are printed as test diagnostics so a curl regression stays visible. Final: 664 tests pass; calibration 63.1%; 120 games 63.4% complete, 1.1% interceptions, 8.17 yards per attempt.

### 53.5i Pursuit and ball-carrier Speed (v42.13.0, PROPOSED, awaiting owner review)
Investigation of the audit's pursuit finding, and one targeted rule in `src/sim/engine.js` (`pursuitEffort`). Route running, the QB, zone coverage, the pass rush, tackling, abilities and passing calibration are unchanged.
- **Where the multipliers are.** `maxSpeed = 5.4 + 4.1 × Speed/99` yd/s (50 → 7.47, 65 → 8.09, 95 → 9.33). Every steering call scales it: route runners and most defenders at 1.0; a ball carrier in the open at **0.94** (`carrierMove`; on his designed path behind the line, 1.0); a pursuer at **1.05** (`pursue`, used for chasing any ball carrier, for the pass rush on a quarterback in his pocket, a spy, contain after a scramble, and the offense after an interception). Both date from the first engine (M1–M2) with the note "carrying the ball costs a little top speed; pursuers run with full effort". Kick returns are formula-based and not affected. No type matchup scales speed; Burst, Slipstream / Lightning Break / Quick Feet (after the catch), Close Speed, Radiant Pursuit, Daybreak and Bramble Shell do, multiplicatively on top.
- **What it did.** Equal ratings: the pursuer 11.7% faster (65: 8.50 vs 7.61 yd/s), closing about 0.5–0.8 yd/s from behind on every open-field chase. A carrier needed about +27 Speed to merely hold his lead: a 95 against a 65 defense held even (closing +0.05 yd/s), an 85 or 75 against a 65 was still run down. A fast receiver separated on his route at 1.0, then lost 12% the moment he caught the ball.
- **Realistic or not.** Being caught by a faster defender, by a better angle, by the carrier having to cut, or by an ability: realistic, and unchanged. Being caught from behind in a straight race by a SLOWER defender: the hidden multiplier, not football.
- **Why not simply remove it.** Measured over 120–240 matched games, every reduction of the sustained boost moved the whole game: pursuit at 1.0 → +0.84 yards per carry, +0.84 yards per attempt, +18% points; 1.0 with carriers at 0.97 → +33% points; 1.02 → +19%; a short closing burst instead (within 3–5 yards) → no balance change but no Speed change either. The 1.05/0.94 pair is load-bearing: completion, yards after the catch and scoring are calibrated on it.
- **The rule** (revised after owner review: judged from the carrier's movement, not field position). In a straight-line chase of a FASTER carrier the extra effort fades with the Speed gap: `effort = 1.05 − 0.05 × fade × chase`, `fade = clamp((carrier maxSpeed − pursuer maxSpeed) / 0.5, 0, 1)` (all gone at half a yard per second, about 12 Speed points). `chase` (`chaseWeight`, exported) comes from the pursuer's position relative to the carrier's actual velocity: 0 at 120° or less off his heading (beside him, head-on), 1 at 150° or more (trailing him), graded between; and only while the carrier is running (0 below 2.5 yd/s, full from 5 yd/s), so a nearly stationary carrier never flips it. It works the same on lateral runs, reversals, scrambles and returns the other way. A pursuer's effort eases by at most 0.01 a tick (the full swing takes a quarter second), so a cut or a pursuer swinging from beside to behind never changes his pace abruptly (largest change per tick: 0.01, was a 0.05 switch). Everything else is exactly as before: an equal or slower carrier, the side and head-on, the pass rush on a quarterback in his pocket. Equal-Speed plays are byte-identical to v42.12.0.
- **Measured** (same seeds; v42.12.0 → v42.13.0): chasing from behind, a Speed 95 carrier against Speed 65 pursuers now pulls away (−0.33 yd/s, was +0.05); 85 vs 65 holds even (+0.03, was +0.32). Deep go caught in stride (50 yards to go), touchdowns: 75 vs 65 4.9 → 20.7%, 85 vs 65 31.3 → 42.2%, 65 vs 50 17.9 → 33.3%; equal Speeds unchanged (2–7%). Full games (pursuit study, 120): yards per carry 6.05 → 6.26, 40+ runs 0.53 → 0.72%, yards after the catch 6.75 → 6.95, touchdowns per game 3.17 → 3.26, 20+ yard touchdowns 0.81 → 0.93; carriers rated 70–79 6.0 → 6.3 yards per carry and 8.9 → 9.6 after the catch. 120 games with abilities: completion 63.4 → 64.4%, interceptions 1.1 → 1.0%, yards per attempt 8.17 → 8.31, sacks 3.0 → 3.0%, explosive passes 13.1 → 13.1%, explosive runs 21.7 → 22.0%, yards per carry 6.05 → 6.31, points per team-game 12.4 → 12.8 (240 games: 8.36 → 8.42, 6.08 → 6.25, 12.3 → 12.7). Passing calibration 63.1 → 64.5% (inside 63–67%). QB decisions on matched plays identical.
- **Goal Line Man run support** (owner-approved correction, 2026-10-28). *Cause:* in one-back sets (11 of the 34 offensive plays) the call's second linebacker has no man to cover; the unassigned-man fallback sent him to the short middle 6 yards deep, while the linebacker manned on the back sits at the 4.5-yard man cushion. Before Phase A both knew a run at the snap and recovered; with the observable read nobody stood in the run fit (LB2 5.7–6.6 yards deep at the handoff). *Fix* (`src/sim/engine.js`, man case): an unassigned man defender on a run-front or goal-line call, while the ball is still with the offense, not in the air, and the quarterback has not shown him pass, stays at his snap alignment (2.5 yards) and moves toward the existing run fit by his graded read (`readLean`, `readFit`); once he commits he uses the established fit. Nothing else changes: assigned man defenders keep the 4.5-yard cushion, the read uses no hidden information, there is no yardage change and no guaranteed stop. Of all calls only Goal Line Man has a man key that can resolve to nobody on these calls (its 'back' key); 179 calls × 34 plays × 3 seeds replay identically except Goal Line Man (33 plays change). *Mechanism:* LB2 is 1.4–1.6 yards deep at the handoff, still commits only after it (about 0.29 s), and makes most stops (counter 153 and Power Left 140 of 200 tackles); long runs remain (longest 34/29/59 on counter/Power Left/Stretch Left). *Measured* (plain 65s, v42.13 → before the correction → final): 12-run average 2.13 → 3.63 → 2.49 yards (Counter 3.67 → 11.89 → 2.42, Power Left 1.64 → 5.08 → 1.97, Power Right 2.40 → 3.00 → 2.18); interior runs 1.00 → 3.82 → 1.71; outside runs 4.3 → 5.5 → 6.1 (Stretch Left 18.1 → 18.8 → 18.5: with the free linebacker inside, the edge is the call's run weakness); quick passes 6.47 → 6.81 → 6.82, screens 2.86 → 2.13 → 2.13, play-action 7.99 → 8.92 → 8.87, deep 5.89 → 7.99 → 7.99 yards per play. From the 5: inside-run touchdowns 3 → 13 → 3%, play-action touchdowns 30 → 27 → 29% (Goal Line Stand 5.87 yards per play on play-action, 10.18 on screens; Goal Line Man still beats it on screens and the quick game and is still the weaker call against play-action). In games against it: 3.04 → 6.21 → 3.67 yards per carry, touchdowns on 11.2 → 19 → 17% of plays. League totals barely move (yards per carry 6.03 → 6.01, points 13.9 → 14.0); every other call's matrix cell is identical.
- **Developer Lab.** The Defensive scenario mode can test the ball carrier's Speed (subject "Ball carrier …"), with four pursuit presets; each pursuer's trace records his effort multiplier, the carrier's pace, the gap, the angle off a straight chase, whether he is behind, and both Speed ratings, shown in the decision list (the field label shows the effort) with a red line to the carrier. Developer-only.
- Tests: `tests/pursuit.test.js` (7: straight-line, side, head-on, lateral, reversal, stationary, graded boundary, no abrupt pace change in play, equal and slower carriers, the pocket rush, scrambles, interception returns, Radiant Pursuit stacking, trace); `tools/pursuit-study.mjs`; `tools/def-lab-check.py` covers the pursuit view; the career-page fixture is seed 5 again.

### 53.5j Phase A: run-defense intelligence, the observable run read (v42.14.0, RELEASED 2026-10-28; PR #78 merged as `2bc3141`)
Owner's Phase A authorization (2026-10-27), in `src/sim/engine.js` and the Bear Front in `src/data/playbook.js`; follows §1b. The QB read progression, passing accuracy, pursuit speeds, tackling, the offense's plays and abilities' numbers are unchanged; passing was not recalibrated.
- **What was wrong (v42.13 reassessment).** Defenders recognised runs from hidden information: `d.recognised || isRun` in the ball-carrier goal, the zone drop and zone pass-read phases (set from the play type), a run clock, the misdirection tag, the play-action designation, Permafrost's play-type check, the green dog reading the back's assignment, and (found in Phase A) the zone read using a back's route assignment. Yet run defense was poor: Bear Front allowed 6.13 yards per carry (#20 of 26) with a 13.5-yard hole at the left B gap, Run Wall 7.9 on Power Right and 9.4 on Dive. Much of the run defense that did work came from artifacts (a zone linebacker carrying a blocking tight end into the play).
- **The read** (`readCues`, `updateRead`). Each defender holds a belief from −1 (pass) to +1 (run), built only from what he sees a perception delay ago: the line (firing forward or setting back, weight 0.45 fading to 0.20 after 0.6 s), the quarterback (a drop says pass, staying near the line leans run, weight 0.35 rising to 0.60; a back converging on him means the step back to the mesh is not a drop), the mesh (a back meeting the quarterback, 0.6), the ball seen with a back (decisive, only after the handoff plus 0.08 s of mesh concealment, or a carrier seen past the line), a back leaving the mesh without the ball (−0.5), the quarterback running forward or seen keeping on an option (decisive), and a man defender's own man firing out into a block (+1). Misdirection (the line flowing one way, the back the other) slows the read (×0.6) and leans an unaware defender the wrong way for 0.6 s. Perception delay 0.22 − 0.14×Awareness − reaction abilities, ±0.04 per defender (a hash of the seed and his slot, no random draws); re-read every 0.30 − 0.18×Awareness s on his own clock (the schedule carries its remainder, so the interval is not rounded to the 0.05 s tick); the belief moves toward the evidence at κ = 3 + 3×Awareness per second. He commits to the run at +0.45 (defensive backs, man and deep defenders +0.60) and lets go 0.10 lower; the play shows pass to him at −0.35. A catch or a scramble is seen at once (as before).
- **Call priors.** Goal Line +0.50, run fronts +0.35, prevent and long-yardage −0.30, balanced, man and blitz 0, other zone calls −0.15, deep defenders a further −0.25. A run front's prior also stays in the evidence as a standing term that fades by 0.8 s.
- **Responsibilities and positioning.** Run fronts: linemen hold their gaps until they read pass (Goal Line: until they read run, then penetrate). Linebackers: a committed linebacker fits before the handoff at read depth, keying the near back's flow from an alignment squeezed 40% toward the middle, never more than a yard inside his alignment against a back or quarterback flowing toward him; a reading zone linebacker stands between his drop and that fit in proportion to his read and does not come up to a receiver near the line. Defensive backs keep their drop until they see a carrier. Nobody knows the running lane.
- **Bear Front** (§11 of the brief): B-left, head-up nose, B-right (DL1 `B_L` at [1, −2.6], DL3 `A_M` at [1, 0], DL2 `B_R` at [1, 2.6]). The alignment alone on the old engine changes little (6.19 → 5.90; the left B gap 12.9 → 13.3): the hole was the linebackers'. The read alone takes Bear Front to 4.75; both together 2.46.
- **Abilities on the read.** Cold Read and Sharp Eyes shorten the perception delay (recognition 0.07 s sooner; 3.27 → 3.02 / 3.07 yd on runs). Echo Read: the mesh moves him half as much and a back leaving without the ball counts twice; he bites on 17% of fakes against 69% without it, 0.19 s each time either way, and is logged only when he reads a fake (0.6 a game; 0.3 before Phase A from the hidden designation). His card said "bites half as long"; measured on the same seeds he comes forward as far on a fake (1.27 vs 1.30 yd) and lets go at the same moment once he sees the back leave, but commits on 13% of fakes against 66%. The owner approved a corrected card (2026-10-28): "Reads play-action a beat early: he commits to a run fake far less often than other defenders." Ancient Grove and the no-bite effect (no current card carries no-bite): once the fake shows, the mesh no longer holds a guarded defender (bite share 0.27 → 0.02) and the misdirection lean never moves him; against misdirection it is now neutral (4.13 → 4.38): before Phase A every defender read a misdirection play 0.3 s late because of the play's tag and the Grove removed that penalty (6.55 → 4.30); with no tag there is no penalty to remove, and the observable misdirection lean it still blocks is rare. Permafrost fires on contact with a handed-off or kept ball, never on the play type. Crushing Rush unchanged (engagement information).
- **Measured** (same seeds, teams and calls; before = v42.13.0). 240 matched games with abilities (final, with the Goal Line Man correction): yards per carry 6.25 → 6.01, explosive runs 21.3 → 20.0%, completion 64.8 → 64.3%, interceptions 1.0 → 1.2%, yards per attempt 8.42 → 8.57, sacks 3.0 → 2.2%, points per team-game 12.7 → 14.0. Over three independent 120-game seed ranges sacks fall in every range (3.01/2.88/2.74 → 2.48/2.13/1.97%) while the pressure rate holds (35.3/34.8/35.2 → 36.3/35.5/35.2%) and time to throw is unchanged (2.0 s); points rise 0.3–1.7. Passing calibration 64.7 → 65.0%. QB decision quality 0.94 → 0.94. Controlled matrix (plain 65s, yards per carry): Bear Front 6.13 → 2.54 (#20 → #3), Run Wall 3.60 → 3.03, Goal Line 1.03 → 1.07, Edge Contain 4.23 → 3.04, Cover 2 Zone 7.58 → 5.53, Goal Line Man 2.10 → 3.18 (4.28 before its correction), Cover 0 2.63 → 4.00, Double A Mug 1.57 → 4.10. Play-action against run fronts: completion 58.9 → 61.3%, 11.2 → 12.9 yards per attempt (other calls 11.1 → 11.2). Awareness 50 → 95 of every defender lowers yards per carry by 0.99 (run fronts; 1.23 before the Goal Line Man correction, whose free linebacker depends less on Awareness), 1.22 (zone calls), 0.83 (man calls); the largest step between adjacent ratings is 0.31, and no rise exceeds 0.25.
- **Known trade-offs.**
  - *Sacks.* Coverage no longer knows a pass from the snap: underneath zone defenders read it at about 0.49 s (0.96 s on play-action), and a man defender's green dog comes when he SEES the back stay in (about 1.0 s, was 0.55 s from the back's assignment), so fewer pressures become sacks (8.2 → 6.1 per 100 pressures). Sacks against man calls fell most (Man Press and Cover 1 2.6–3.1% → 0.4% of dropbacks in the Lab).
  - *Trap* (7.5 → 2.5 yards per carry in games). The play runs as drawn: the guard pulls to his landmark and the back follows his path, but the drawn blocks leave a linebacker unblocked on 99% of snaps, before and after Phase A. Before, that linebacker was out of position (he carried a receiver or ran into the pulling guard before he knew it was a run) and the free safety made the tackle 8–9 yards downfield; now he reads the back and tackles near the line. Future offense work, not in Phase A: a second-level block in the Trap design.
  - *Man and blitz calls* lost run defense (Cover 0, Double A Mug; Goal Line Man until its correction below): their man defenders no longer know a run from the snap.
  - *Inside Zone into Goal Line Stand* loses yards on every plain-65 snap, before and after: two linemen against four interior rushers, and the A-gap rusher tackles the back about 0.3 s after the handoff (177 of 200). It is not a limit: with a 99-rated back and line the same play averages +15.9 (47 of 200 go the distance), against a 35-rated defense +4.5.
  - *Carrier vision* is worth +0.26 yd across six run concepts against seven calls (v42.13: +0.26). On Inside Zone vs Cover 3 the linebacker now fills the called hole more often and the aware back cuts back on 76% of snaps, for about the same yards.
- **Strategic review** (owner request before merge; plain 65s by concept family, and 240 matched games by call). Each call keeps a purpose and a price:
  - *Cover 0*: pass defense unchanged (deep 7.2 → 7.1 yards per play, quick 5.3 → 5.2, sacks and pressure unchanged); in games 7.79 → 6.51 yards per play (#19 → #7 of 23), sacks 4.8 → 3.4%, pressure 48 → 54%. The later green dog (about 1.45 s) did not cost it its rush. Weaker against QB runs (1.4 → 4.8).
  - *Double A Mug*: still the strongest pressure call (intermediate passes 0.7 → 1.3, play-action 1.6 → 1.7 yards per play; 11.1% sacks in games, #3 of 23); no green dog involved. Runs hurt it more (inside 2.2 → 3.9, outside 0.0 → 2.9, read option); it still beats QB Draw.
  - *Goal Line Man*: the call that lost most. Its run stop came from man defenders knowing a run at the snap (inside runs 1.0 → 3.8); against passes it is close to before (quick 6.5 → 6.8, deep 5.9 → 8.0). In games 5.72 → 8.09 yards per play and touchdowns on 11 → 19% of the plays it faced (158 plays). Against Goal Line Stand it then won only against screens (2.1 vs 10.2) and the quick game. Corrected with the owner's approval (2026-10-28), see *Goal Line Man run support* below.
  - *Bear Front*: elite against runs (inside 7.9 → 2.9, outside 8.1 → 2.6) and exposed to the pass (deep 12.6 → 17.2, Slot Fade 29 yards per attempt, screens 6.9 → 9.5); its pressure rate fell (51 → 37%) because its linemen hold their gaps.
  - *Run Wall*: elite against runs (inside 4.5 → 2.0) and badly exposed to play-action (15.9 → 22.5 yards per play, 54% explosive).
  - Coaching texts that were already wrong before Phase A and still are (future text review): Cover 0 "loses Deep Post", Double A Mug "loses Toss Sweep, Outside Zone, Bubble Screen", Goal Line Man "beats Slot Fade", Bear Front "loses Toss Sweep, Outside Zone". Bear Front's "watch" line now describes the nose and B-gap alignment.
- **Goal Line Man run support** (owner-approved correction, 2026-10-28). *Cause:* in one-back sets (11 of the 34 offensive plays) the call's second linebacker has no man to cover; the unassigned-man fallback sent him to the short middle 6 yards deep, while the linebacker manned on the back sits at the 4.5-yard man cushion. Before Phase A both knew a run at the snap and recovered; with the observable read nobody stood in the run fit (LB2 5.7–6.6 yards deep at the handoff). *Fix* (`src/sim/engine.js`, man case): an unassigned man defender on a run-front or goal-line call, while the ball is still with the offense, not in the air, and the quarterback has not shown him pass, stays at his snap alignment (2.5 yards) and moves toward the existing run fit by his graded read (`readLean`, `readFit`); once he commits he uses the established fit. Nothing else changes: assigned man defenders keep the 4.5-yard cushion, the read uses no hidden information, there is no yardage change and no guaranteed stop. Of all calls only Goal Line Man has a man key that can resolve to nobody on these calls (its 'back' key); 179 calls × 34 plays × 3 seeds replay identically except Goal Line Man (33 plays change). *Mechanism:* LB2 is 1.4–1.6 yards deep at the handoff, still commits only after it (about 0.29 s), and makes most stops (counter 153 and Power Left 140 of 200 tackles); long runs remain (longest 34/29/59 on counter/Power Left/Stretch Left). *Measured* (plain 65s, v42.13 → before the correction → final): 12-run average 2.13 → 3.63 → 2.49 yards (Counter 3.67 → 11.89 → 2.42, Power Left 1.64 → 5.08 → 1.97, Power Right 2.40 → 3.00 → 2.18); interior runs 1.00 → 3.82 → 1.71; outside runs 4.3 → 5.5 → 6.1 (Stretch Left 18.1 → 18.8 → 18.5: with the free linebacker inside, the edge is the call's run weakness); quick passes 6.47 → 6.81 → 6.82, screens 2.86 → 2.13 → 2.13, play-action 7.99 → 8.92 → 8.87, deep 5.89 → 7.99 → 7.99 yards per play. From the 5: inside-run touchdowns 3 → 13 → 3%, play-action touchdowns 30 → 27 → 29% (Goal Line Stand 5.87 yards per play on play-action, 10.18 on screens; Goal Line Man still beats it on screens and the quick game and is still the weaker call against play-action). In games against it: 3.04 → 6.21 → 3.67 yards per carry, touchdowns on 11.2 → 19 → 17% of plays. League totals barely move (yards per carry 6.03 → 6.01, points 13.9 → 14.0); every other call's matrix cell is identical.
- **Developer Lab.** The Defensive scenario decision list shows each defender's read ("Read +0.42 | Line +0.60 | QB −0.10 | Mesh +0.60 | Delay 0.12 s | State: Reading", plus ball seen, back released, his man blocks, misdirection), the field labels the short read, rush assignments their gap; four run-read presets (inside zone vs Cover 3 with linebacker Awareness, power right vs Run Wall, power left vs Bear Front, counter vs Bear Front). Only in the Lab; the trace never changes a play and never reaches a game or a save.
- Tests: `tests/attr-trials.test.js` checks carrier vision across six run concepts and that the aware back leaves the called lane because the defense fills it (replacing two single-cell checks, owner review of PR #78); `tests/run-read.test.js` (17: Goal Line Man's free linebacker in run support before the handoff and his scope, pass defense with pass shown, screens, quick game and play-action against Goal Line Stand; hidden information, tags and names change nothing, the ball seen only after it changes hands, trace and seed determinism, outcome spread, long runs against strong fronts and stops by favorable offenses, Awareness as an aggregate edge, no yardage clamps, call priors, play-action, counter recovery, Bear Front alignment, the read abilities); `tests/def-scenario.test.js` (the read in the Lab); `tools/run-read-study.mjs`, `tools/defense-reassess.mjs`; `tools/def-lab-check.py` covers the run-read view.

- **Release v42.14.0 (2026-10-28).** Approved for merge and publication by the owner on 2026-10-28.
  - **Merge:** PR #78 (`phase-a-run-defense` → `main`), merged at the approved head `e4d4e80` as merge commit `2bc3141e2eb01d579ef21375c1d4fc31c6249dbc`. The merge tree equals the approved head's tree (`1c43cae`), so `main` holds exactly the tested code; the full suite was not rerun (§ testing policy 5).
  - **Tested tree:** full suite 690/690 on `e4d4e80` (run once on the final gameplay tree); performance test alone pass (2.3 s); browser checks `def-lab-check`, `attr-lab-check`, `final-whistle-check`, `ai-lab-check`, `navigation-check` pass. Release smoke after the merge: `release-stamp` and `run-read` tests 19/19.
  - **Release files:** `tools/release-files.py`: 156 files, the same set as v42.13.0 (no additions, no removals), 9 with changed content (`index.html`, `src/data/card-check.js`, `src/data/playbook.js`, `src/data/species.js`, `src/lab/def-scenario.js`, `src/sim/engine.js`, `src/ui/def-overlay.js`, `src/ui/screens/attr-lab.js`, `src/version.js`). Every published file byte-identical to `git show 2bc3141:<file>`.
  - **Deploy check** (iPhone Safari emulation, 390×844, touch) on the publish folder and again on the files read back from the live link: build label v42.14.0-run-defense, `test: false`, two existing franchise saves (Stonehaven Titans 1201 week 4; Ember City Beasts week 14) load after a reload, AI Testing Lab opens by taps, a setting survives a reload, live franchise plays draw the QB read ring and the replay shows the read list. WebKit itself is not installed in the development environment; the check runs Chromium with the iPhone Safari user agent.
  - **Deployment:** https://claude.ai/artifact/GJG2k6eqG3qfeteJEbXvFq (URL unchanged), artifact version 112 (`1793188890-20bc`). Before publishing, the live files to be replaced were read and matched the v42.13.0 manifest. The page and the 8 changed game files were published; after publishing the live list has 156 files, all 155 game files read back byte-identical to the publish folder, the built page sits unchanged inside the host's wrapper, and `src/version.js` serves v42.14.0-run-defense. Capabilities db, downloads and user and runtime contract 0.2.77 carried forward. `release/manifest.json` regenerated for v42.14.0 (artifact version 112).
  - **Saves:** no save format change and no migration; the save layer is untouched (no file under the save, store, cloud or slot modules changed). The owner's cloud franchise was not opened. The private test link (YaeuhvNLm5HS8ZG2YKg6Tj) was not touched.
  - **Limitations:** the claude.ai runtime and real iPhones cannot be driven from the development environment; the owner's first open on a device is the final live check.
- **Future work recorded at release (not implemented in v42.14.0):**
  1. *Trap's missing second-level block:* the drawn blocks leave a linebacker unblocked on 99% of snaps; an offensive-balance investigation of a second-level block in the Trap design.
  2. *Goal Line Man's remaining touchdown-rate vulnerability:* touchdowns on 17% of the plays it faces in games (11.2% in v42.13; 19% before its correction), mainly through the edge (outside runs 6.1 yards per play, Stretch Left) and passes.
  3. *Lower sack conversion:* with hidden defensive information removed, fewer pressures become sacks (8.2 → 6.1 per 100; sacks 3.0 → 2.2% of dropbacks) while the pressure rate holds; accepted as a documented diagnostic deviation.
  4. *Goal Line Man's deep-pass pressure timing:* deep passes against it 5.89 → 7.99 yards per play; the 4.5-yard man cushion was deliberately left unchanged.
  5. *Coaching-description mismatches* that predate Phase A: Cover 0 "loses Deep Post", Double A Mug "loses Toss Sweep / Outside Zone / Bubble Screen", Goal Line Man "beats Slot Fade", Bear Front "loses Toss Sweep / Outside Zone".
### 53.5k Phase B: bracket coverage and deep defensive intelligence (v42.15.0, RELEASED 2026-10-28; PR #79 merged as `9e3b327`)
Owner's Phase B brief and approval of the audit (2026-10-28), in `src/sim/engine.js` and `src/data/playbook.js` (with the reserve Double Bracket). Follows §1b: every change comes from observable movement, assignments and football responsibilities; no defender reads a receiver's route, the intended target or the play call. Not changed (owner): catch resolution (no second-defender contest), Night Veil, no new abilities, offensive blocking, QB mechanics, pass rush. Baseline v42.14.0 (`3c0f3df`), identical seeds throughout; probes in `tools/coverage-study.mjs`.
- **Audit (v42.14.0).**
  - *Bracket Left was not a bracket.* A corner in ordinary man plus a safety in an ordinary deep quarter, with nothing linking them. The corner played on top as if alone. The safety treated the corner as "a teammate has him" (the zone hand-off rule) and stayed on the receiver only because nobody else entered his quarter. At the throw the two were about a yard apart, both level with or under the receiver (1.3 yards under on a go). Forced throws to the bracketed receiver did barely better than against Cover 1 (post 30 vs 32%).
  - *Deep defenders had no cushion.* The depth rule (two yards over the receiver, not shallower than the landmark minus one) made a deep defender walk up to his landmark while a vertical came at him, then turn and run from a standstill.
  - *No middle-of-field help.* A deep zone saw only receivers inside its lateral area: the Cover 1 free safety stood at 12 yards until 2.4 s on a post and was 3.9 yards under the receiver at the throw (200 of 200 plays); the Cover 3 middle safety stayed at his spot on 199 of 200 posts. The "teammate has him" penalty also stopped deep help over any man-covered receiver.
  - *A Phase A read defect.* A back blocking beside a quarterback who had finished his drop read as a handoff mesh: 29% of shotgun dropbacks had a coverage defender swing back toward the run about two seconds in, 14% of throws had one reverted a quarter second before the release.
  - *Awareness hardly mattered in man coverage* (separation identical at every Awareness level); perception delays were rounded to whole 0.05 s ticks.
  - *Ability mismatches:* Heat Haze read the route's assignment; Sticky's "within a step" and Canopy Read's "deep zone" were not applied.
- **Fixes.**
  1. *Run read:* once a defender sees the quarterback more than three yards behind his snap depth, a back beside him is a protector, not a mesh (handoffs and play-action fakes meet the quarterback earlier and read as before).
  2. *Deep cushion* (`cushionDepth`, `holdDepth`, `deepSteer`): a deep defender plays over a receiver he sees at two yards plus the ground the receiver covers while he turns (seen upfield speed × 0.3–0.5 s, shorter with Coverage) plus up to two yards when Awareness tells him he is the slower man; he never steps up toward a receiver running upfield at him; once on top he runs at the receiver's seen pace instead of sprinting away. Defenders breaking on a thrown ball brake into the spot they read, and *judge* that stop (owner-approved after a three-way review, below): he brakes as if he could stop `judge` times as hard as his acceleration (Agility) allows; `judge` = 1 + (1 − ball skill) × (2h − 0.5), ball skill the mean of Awareness and Coverage, h a hash of the seed, his slot and the throw (deterministic, no random draw, no quota), at least 0.6: about 0.98–1.06 at 95/95, 0.83–1.51 at 65/65, 0.75–1.75 at 50/50. Above 1 he brakes late and overshoots (more so coming fast), below 1 early and arrives short or late.
  3. *Deep help:* a man defender on a receiver no longer makes a zone helper look elsewhere; a middle-of-field deep defender sees a vertical stem visibly working inside from farther out; a deep defender with nobody in his zone keeps the deepest vertical near his area in front of him (at most ten yards past his landmark).
  4. *Bracket* (`BRACKET(key, zone)` in the playbook): the safety plays over the top of the left receiver with a cushion, half a step outside, and a step inside once he sees him working inside (a post); the corner plays inside and underneath (`MAN(key, 'under')`) at the receiver's hip. When the receiver shows no vertical threat (under eight yards and not running upfield), the safety lets him go and plays his deep zone for everyone else. Double Bracket (reserve) brackets both outside receivers the same way.
  5. *Cover 2 Man:* its man defenders play the same underneath technique under the two halves. Cover 1 is unchanged.
  6. *Awareness in man coverage:* the perception delay is 0.4 − 0.3×Coverage − 0.2×(Awareness − 65) − reactions (the v42.14 delay at Awareness 65), read between ticks (interpolated), so a rating difference smaller than a tick still shows.
  7. *Abilities as their cards say:* Heat Haze on a route he sees going deep (1.5+ yards downfield on a fast release within 45 degrees of straight upfield; it stops counting the moment a comeback turns back; a slant's two-yard stem looks the same for an instant, worth −0.06 to −0.26 yards, so the ability is announced only once the route is plainly deep, eight yards); Sticky only with the receiver within a step (1.5 yards); Canopy Read's break radius and reaction only in a deep zone.
- **Measured** (same seeds; v42.14.0 → Phase B).
  - *Bracket Left, forced throws to the bracketed receiver* (600 throws a route on fresh seeds; completion / yards per attempt, v42.14 → final, final Cover 1 in brackets): post 39.8/10.3 → 35.7/9.8 (36.8/10.5), go 39.2/13.4 → 33.0/11.9 (33.3/11.7), skinny post 40.5/12.5 → 34.2/11.0 (37.8/13.1), dig 52.5/6.5 → 50.2/6.2 (55.0/7.2), comeback 73.5/8.8 → 69.3/8.3 (75.7/11.3), corner 40.3/11.4 → 33.7/10.3 (40.8/12.8), double move 42.8/13.9 → 40.5/12.5 (47.3/18.4). Over seven routes: 42.4% and 9.6 yards against Cover 1's 46.7% and 11.1 (v42.14: no difference). The catch is still contested by the nearest defender alone (catch resolution unchanged), so the bracket shows more in the yards than in completion, and hardly at all in completion on the go. (An earlier 120-throw sample, seeds 61000, put the go at 22 vs 35%; at 600 throws that gap is not there.) At the throw the safety is 0.9–1.6 yards over the receiver and the corner 1–2 yards under and inside, about three yards apart (one before). The real quarterback (400 plays a concept) throws to him on Three Verticals 43 → 12% of throws (Cover 1: 33%), Deep Corner 18 → 3% (29%), Double Move 10 → 9% (24%), Deep Post 30 → 39% (65%).
  - *Bracket Left's price* (400 forced throws each): the other receivers average 11.7 yards per attempt against it (Cover 1 9.7, Cover 2 Man 10.0; v42.14 Bracket Left 10.5): the back's wheel up the left 19.5 (Cover 1 9.7), the fade to the right 13.4 (10.7); the tight end's seam is not a weakness (10.8 vs 11.3). Against all 22 pass concepts with the real quarterback it allows 5.97 yards per play (6.09 before; #3 of 26), against the run 6.52 yards per carry (6.38; #25 of 26).
  - *Deep calls* (all 22 pass concepts, real quarterback, yards per play; 20+ yard completions; final engine): Cover 3 7.55 → 6.66 (12.5 → 8.6%), Cover 4 7.57 → 6.62 (10.3 → 6.3%), Cover 2 Zone 7.96 → 7.61, Max Drop 8.11 → 7.43, Edge Contain 10.24 → 8.84, Robber 7.47 → 7.28, Tampa 2 6.95 → 6.78, Cover 6 6.92 → 6.83, Cover 2 Man 6.72 → 6.59, Cover 1 6.68 → 6.73, Bracket Left 6.09 → 6.03, Man Press 8.48 → 8.32. Interceptions rise where defenders now arrive at the ball (Cover 4 1.5 → 3.6%, Cover 3 1.4 → 2.3%, Cover 1 3.0 → 3.8%). By concept: Three Verticals 14.58 → 13.47, TE Seam 9.92 → 9.05, PA Shot 12.48 → 11.16, Double Move 8.97 → 8.51, Deep Post 9.75 → 9.98 (still the deep shots that pay).
  - *Run read:* dropbacks with a defender reverting from pass 29 → 2.2%; throws with one reverted 0.25 s before the release 14 → 0.7%.
  - *Attributes* (eight deep cells, every coverage defender 50 → 95, yards per play saved; final engine): Coverage 2.01 → 2.72, Awareness 0.92 → 1.54, Speed 5.85 → 4.81; no adjacent step exceeds the noise except Speed below 65 (a defender slower than the receiver loses: real, graded). Distance from the ball when it comes down on a go against a Cover 3 corner, Speed 50 → 95: 2.2 → 2.0 yards without braking, 2.0 → 1.0 now. Double move against a Cover 1 corner, his distance behind the receiver at the throw: Awareness 50 / 65 / 95 −2.93 / −2.55 / −2.12 yards (−2.55 at every level before). Matchups: 95-rated receivers against 50-rated defenders still gain 27–41 yards per play, 50 against 95 still complete 26–83%.
  - *Abilities* (with and without, same seeds, forced throws; completion and yards; final engine): Heat Haze on the go 37.5 → 30.5% and −1.8 yards (v42.14 33 → 26%); Sticky beyond a step: identical plays; Canopy Read in man: identical plays, in a deep zone it fires on 8–22% of throws; Static Field −0.5 to −1.0 yards; Wing Shadow −0.3 to −1.1; Fortress 70 → 40% on comebacks; Undertow +1.5 to +2.0 points of interceptions; Updraft and Aerial Lock within noise. None guarantees a result (Night Veil, unchanged, is the one absolute).
  - *League* (240 matched games, abilities on; final engine with judged braking): completion 64.3 → 64.1%, interceptions 1.2 → 1.3%, yards per attempt 8.57 → 8.37, sacks 2.2 → 2.7%, explosive passes 14.1 → 12.3%, deep completion 44.9 → 40.9%, yards per carry 6.01 → 6.18, explosive runs 20.0 → 21.9%, points per team-game 14.0 → 13.2. Abilities off: 63.0 → 63.4%, 8.57 → 8.34, sacks 2.4 → 2.4%, 6.17 → 6.23 yards per carry, 14.1 → 13.5 points. Passing calibration (48 games) 64.3 → 65.4%; QB decision quality 0.93 → 0.94.
  - *Phase A:* run defense by call within ±0.15 yards per carry (run calls ±0.03); play-action against run calls 12.89 → 13.39 yards per attempt, against pass calls 11.22 → 10.89; the run-defense Awareness total 0.84 → 0.88.
  - *Simulation cost:* 3.9–4.1 ms per play on both engines (same 40 games).
- **Catch-point braking, owner review (2026-10-28).** Three engines differing only in that line, all seven fixes and every seed identical: no braking, exact braking (he brakes exactly enough to stop at the spot he reads; the first Phase B commit), judged braking (adopted).
  - *Without braking* a defender who got within a yard of the spot before the ball ran 0.75+ yards past it on 35–77% of deep throws, more often the faster he was (go against a Cover 3 corner: 48% at Speed 50, 74% at 95), so a faster corner allowed more completions (34 → 44%). Heat Haze lost its effect on the go (−0.15 yards) and Undertow added no interceptions (the defender never stayed at the ball).
  - *Exact braking* removed the overrun (0–4%) but stopped him too precisely: within 0.3 yards of the spot on 18–35% of throws (6–9% without), and interceptions on these throws 5–8% (1–3% without).
  - *Judged braking:* overruns 0–8% (Speed 95 5–8%, Agility 50 3–4%, Coverage 50 2–3%; a 95/95 defender under 1%); within 0.3 yards 12–24%; arriving short, still closing, 14–40% (as without braking); late arrivals as in every version; completion flat across Speed (33 / 30 / 31 / 30%) while his distance at the catch still shrinks with it (2.0 → 1.0 yards). Interceptions on these throws 4–10%.
  - *League* (240 matched games, abilities on; none / exact / judged): completion 65.0 / 64.3 / 64.1%, interceptions 1.0 / 1.4 / 1.3%, yards per attempt 8.50 / 8.31 / 8.37, explosive passes 12.8 / 12.0 / 12.3%, points 13.5 / 13.6 / 13.2. Passing calibration (48 games): 68.1% without braking (above the 63–67% band), 65.4% judged.
  - *Abilities (judged):* Heat Haze on the go 37.5 → 30.5% and −1.8 yards; Undertow +1.5 to +2.0 points of interceptions; Fortress, Wing Shadow and Static Field as before. Updraft (+12% closing speed on the ball) is neutral to slightly negative in every version, as in v42.14: recorded for the separate ability review, not changed here. Canopy Read is now about neutral in these cells (it fires on 8–22% of throws).
- **Trade-offs and notes.** Deep cushions give up more underneath: completion holds while yards per attempt fall. Interceptions rise a little (defenders now reach the ball). The bracketed receiver's contested catches are still decided by the nearest defender alone (catch resolution unchanged by decision); the bracket works through position, the quarterback's reads and the windows. Heat Haze now also trims a comeback on its vertical stem (−1.5 yards), as its observable reading cannot tell the stem from a go. The count of run matchups with one large Awareness step rose from 6 to 13 of 66 (single cells of 150 plays; the totals did not change).
- **Coaching text** (updated after the final measurements, 150 plays per cell, real quarterback): Bracket Left (beats TE Seam, Levels, Three Verticals and Deep Post; loses the Wheel, RB Screen, Deep Corner and the run), Cover 1 (beats the short game; loses play-action shots, Slot Fade, Wheel), Cover 2 Man (trail underneath; beats Dagger, Smash, Y Cross, TE Seam; loses Three Verticals and Wheel), Cover 3 (beats Deep Corner, Deep Post, Double Move; loses Y Cross, Quick Slants, Flood), Cover 4 (beats play-action shots, Flood, Levels; loses Mesh, Y Cross, Quick Slants and the run), Cover 6 (beats Deep Corner, Mesh, Slot Fade; loses Three Verticals, TE Seam, Hail Mary).
- **Recorded for later (not in Phase B):** a second-defender contest at the catch (separate review); Night Veil's guaranteed incompletion (legendary-ability review); Updraft's closing speed, which does not help (ability review).
- Tests: `tests/coverage.test.js` (12; all fail on v42.14.0; the two braking tests also fail on the no-braking and exact-braking engines): the dropback mesh, the cushion, Speed and Coverage at the catch, deep help over man and in the middle, the bracket's geometry and hand-off, its strength and its price, Cover 2 Man's technique against Cover 1's, Awareness in man coverage, the three abilities, the judged braking (it corrects the overrun and keeps a fast defender from being worse; it still overshoots and misses, more with poorer ball skills, and is not on the exact spot most of the time), and the future-route test (a receiver's route changed after a point changes no defender before he visibly changes course: 126 plays across seven calls, Heat Haze on the field).

- **Release v42.15.0 (2026-10-28).** Approved for merge and publication by the owner after the judged-braking review.
  - **Merge:** PR #79 (`phase-b-coverage` → `main`) merged at the approved head `8007ef9` as merge commit `9e3b3277019b456b705dbd7d08b7246e8e2bc1d6`. The merge tree equals the approved head's tree (`d3a59af`), so the full suite (702/702 on `8007ef9`) was not rerun. Release smoke: `release-stamp` and `coverage` tests 14/14.
  - **Release files:** 156, the same set as v42.14.0, 5 with changed content (`index.html`, `src/data/playbook.js`, `src/data/reserve/defense-coverage.js`, `src/sim/engine.js`, `src/version.js`), each byte-identical to `git show 9e3b327:<file>`.
  - **Deploy check** (iPhone Safari emulation) on the publish folder and on the files read back from the live link: build label v42.15.0-coverage, `test: false`, two existing franchise saves load after a reload, the AI Testing Lab opens by taps, a setting survives a reload, live plays draw the QB read ring and the replay shows the read list.
  - **Deployment:** https://claude.ai/artifact/GJG2k6eqG3qfeteJEbXvFq (URL unchanged), artifact version 113 (`1793216121-96e1`). The live files replaced were first confirmed to be v42.14.0 (manifest hashes); the page and 4 changed game files were published; afterwards all 155 game files read back byte-identical, the built page sits unchanged in the host wrapper, `src/version.js` serves v42.15.0-coverage. Capabilities db, downloads, user and runtime contract 0.2.77 carried forward. `release/manifest.json` regenerated (artifact version 113). The private test link was not touched.
  - **Saves:** no save format change, no migration, no save-layer file changed.

### 53.5l Phase C: the offensive run game (C1 + C2, v42.16.0, released 2026-10-29)
Phase C ships as one release: C1 (below, owner-approved 2026-10-28) and C2 (running-back vision and the Outside Zone redesign, at the end of this section).
Owner's Phase C audit (2026-10-28, audit-only) and approval of fixes F1–F6. In `src/sim/engine.js` and `src/data/playbook.js`. Follows §1b: blockers and the ball carrier act on where players are and how they move; nobody reads an assignment or the play call. No scripted yardage, no guaranteed block. Not changed (owner): running-back vision (F7) and Outside Zone's design (F8), both for Phase C2; Blink, Quake Step, Vanishing Cut, Riptide and Updraft stay in the ability review. Baseline v42.15.0 (`9e3b327`); identical seeds throughout; probes in `tools/run-study.mjs`.
- **Audit findings (v42.15.0).**
  - *Teleport handoff.* Stretch Left's back ran away from the mesh. The quarterback's 1.1 s fallback handed him the ball from about 7 yards, at the line, so the defence saw no run until then. The result was 11.4 yards per carry (plain 65s), 61% of runs 10+, and 12.5 in games. Read Option's paths never came within 2.8 yards, so every give also moved the ball 3–6 yards.
  - *Designed blocks ended at the handoff.* Every free blocker switched to the escort at 0.3–0.8 s. Receivers' stalk blocks landed on 0–5% of runs, and pulling guards on Power and Counter on 12–27%.
  - *A blocker silently dropped.* Eight of the twelve runs (and 15 passes, with no effect) assigned the centre in Pro and Spread sets, which have no centre. Inside Zone and Trap left the linebacker unblocked by design.
  - *Trap could not trap.* The guard who should release the tackle blocked him.
  - *Pullers trailed the back.* At 1.1 s the back was 0.7–1.7 yards ahead of his pulling guard.
  - *Bulwark did nothing on runs* (pass-protection assignments only).
  - *The 13.2 points per team-game is game length.* Franchise games use 3-minute quarters, about 5.1 drives per team-game at 2.56 points per drive.
- **Fixes.**
  1. *F1 handoff integrity.* A handoff happens only hand to hand: the event records `reach`, the distance between quarterback and back, which is always 1.5 yards or less. When the back has run past a mesh he never reached, the quarterback keeps it (`mesh_missed`; the defence reads it as it reads an option keep) instead of the ball jumping to him.
     - Stretch Left's back steps to the quarterback's hip, then bends outside: the handoff comes at about 0.45 s, behind the line.
     - Read Option: the back crosses the quarterback's face (Gun Pro). The quarterback waits for a back still coming to him and rides the mesh while the back is in his hands. He gives before the back is out of reach, or keeps. A pitch can still wait for the read defender, as before. The owner's read rule (who is read, and when) is unchanged.
  2. *F2 designed blocks persist.* On a designed run a run-block, pull, stalk or default block job lasts until the carrier is past the blocker; then he escorts as before.
     - A block in space by a puller, a climber, or anyone still on his job after the handoff, against a defender off the line, is one try. Its landing chance between equal 65s is the open-field block's own 0.58. Blocking is set against the defender's Agility and Awareness, and a defender who slips him is past him for the rest of the play.
     - The 0.3 s pause after a missed open-field block, set but never checked before, now applies on runs.
     - A blocker in space takes an angle on where the defender will be 0.25 s later.
  3. *F3 restored blockers.* Each of the eight runs gives the absent centre's role to a player on the field:
     - Inside Zone, Dive and QB Draw: the tight end climbs to the linebacker.
     - Trap and Toss Sweep: the tight end blocks down.
     - Outside Zone: the tight end reaches the play-side edge.
     - Read Option: the tight end seals the keep side.
     - Jet Sweep: the back leads to the edge.

     `offFieldAssignments` / `validatePlaybook` now report any assignment for a slot the package leaves off the field.
  4. *F4 climb blocks and Trap.* A `CLIMB` run block works past defenders on the line of scrimmage (judged by where they lined up and are now) to the second level. It ends once at its landmark or 1.2 s in.
     - Trap: the left guard climbs, the tight end blocks down, and the pulling guard kicks out the lineman who was let through.
     - On a designed run, a defender held up by a block can reach for a carrier who passes within a yard of him, once a play. His chance is a clean tackle's chance × (0.15 + 0.35 × Awareness), 0.33× at 65. It triggers no tackle ability, and a miss is not a broken tackle.
  5. *F5 pulls and pacing.* Power and Counter pull just behind the centre (via 1.2 yards deep instead of 2–2.5), so the guard reaches the hole first. A puller takes the first defender who shows in the hole, moving or not. The back reads his lead block: once the puller engages near the hole, the back bends his path once to the side away from the defender. There is no change of pace and no waiting.
  6. *F6 Bulwark* reaches run-block and pull assignments as well as blocks. It still reaches only blockers lined up within 2.2 yards, and is applied once however many Bulwarks stand beside a blocker. In Pro and Spread sets the two guards are 3.4 yards apart, so a guard Bulwark reaches nobody there (an existing limit, recorded).
- **Measured** (v42.15.0 → v42.16.0, same seeds).
  - *All 12 runs × 26 calls, plain 65s, 100 plays per cell* (yards per carry, success, 10+):

    | Play | Yards per carry | Success | 10+ |
    |---|---|---|---|
    | Stretch Left | 11.39 → 5.91 | 85 → 50% | 61 → 18% |
    | Read Option | 5.81 → 3.34 | 62 → 34% | |
    | Counter | 5.36 → 5.93 | | |
    | Power Left | 5.01 → 6.13 | | |
    | Power Right | 4.56 → 5.59 | | |
    | Toss Sweep | 4.18 → 3.44 | | |
    | Dive | 3.61 → 3.34 | | |
    | QB Draw | 3.07 → 3.21 | | |
    | Outside Zone | 2.78 → 2.36 | | |
    | Jet Sweep | 2.76 → 2.52 | | |
    | Trap | 1.78 → 3.33 | 11 → 28% | |
    | Inside Zone | 1.70 → 2.56 | 17 → 25% | |
    | All | 4.33 → 3.97 | | |

  - *Run calls still stop the run.* Lowest yards per carry: All-Out 0.72, Goal Line 0.94, Double A Mug 1.24, Run Wall 2.25, Bear Front 2.87. Call order correlates 0.89 (Spearman) with v42.15. Lesson claims that hold: 11 → 15 of 37.
  - *Blocking.*
    - Receivers' stalk blocks land on 23–64% of runs (0–5%).
    - Pullers block someone on 38–54% on Power and Counter, and 78% on Toss (12–27%). They are 0.35–1.08 yards ahead of the back at 1.1 s (−0.7 to −1.7).
    - Trap's pulling guard kicks out a lineman on 74%, and its left guard's block is at the second level.
    - Stretch Left hands off by 0.7 s (1.15 s before).
  - *Attributes* (9 runs × 10 calls, 50 → 95):
    - RB Agility +0.65 → +1.40.
    - OL Blocking +1.71 → +2.55.
    - RB Speed +5.5 → +5.9 (still the dominant lever).
    - RB Awareness +0.21 → +0.22 (F7).
    - The defensive attributes as before.
  - *Abilities on runs* (with vs without): a Bulwark centre adds +0.28 to +0.65 yards per carry on tight-set runs (it added 0) and cuts his guards' sheds by 6–15%. Others are within noise of v42.15. Blink still adds about 24 yards per use (ability review).
  - *League, 360 matched games in three seed sets:*
    - Points per team-game 13.10 → 13.06; per drive 2.56 → 2.46.
    - Yards per carry 5.66 → 5.50; success 48.4 → 46.1%; negative 6.4 → 7.9%; 10+ 20.0 → 18.1%.
    - Yards per pass play 7.96 → 8.00; run share 35.6 → 35.4%.
    - By play: Stretch Left 12.54 → 7.74, Trap 2.59 → 5.55, Inside Zone 2.48 → 3.35, Counter 5.81 → 7.00, Read Option 7.23 → 3.80.
  - *Phase A and B:*
    - Every pass play, play-action included, replays identically in the Lab (1,716 of 1,716 on fixed seeds).
    - Play-action against run calls is unchanged (13.24 yards per attempt).
    - The run-defense Awareness total is 0.95 → 1.09.
    - The counter against Cover 3 still rewards defensive Awareness, by less: 50 → 95 lowers it 0.3–0.9 yards, against 1.7 before.
- **Trade-offs.**
  - Read Option and Stretch Left lose the yards the teleport gave them.
  - Outside Zone stays weak (F8).
  - Toss Sweep loses about 0.7 yards to arm tackles and missed blocks in space.
  - Negative runs rise slightly, because an attacking defender now sometimes meets a back who has the ball earlier.
  - Goal Line Man and Edge Contain give up more to Power and Counter. Both lessons say so; Goal Line Man's free linebacker is now blocked by the puller on about half of those plays.
- **Test amended (owner-approved, 2026-10-28).** `run-read.test.js`, "Goal Line Man: the free linebacker makes plays…": his share of solo tackles on Counter and Power fell from about 0.5 to 0.24, against a bar of 0.25. The assertion now counts tackles and assists (0.34), with the threshold unchanged. A new behaviour test guards him without a quota: he recognises the observable run on more than 80% of plays (measured 0.92–0.96 over three seed sets), and on the plays no blocker engages him he is in on the stop more than 45% of the time (measured 0.61–0.84). The alignment and run-support test is unchanged and passes.
- **Recorded for Phase C2 (addressed below):** running-back vision (Awareness still near inert, with more negative runs at 95 on Inside Zone); the Outside Zone redesign; Stretch Left (7.7 in games, the edge left open by some fronts); Counter against Bear Front; and the run lessons that do not hold (22 of 37). The Toss pitch still has no ball flight.
- **Reserve-play accessibility audit (owner request, 2026-10-28).** Pin and Pull, End Around, Pistol Zone Read and Midline Read cannot be reached by any franchise, AI club, saved plan or practice:
  - They are reserve plays, not in `OFFENSE_IDS`, and none is legendary.
  - None of the six coordinator playbooks (`PLAYBOOKS`) contains a reserve play, and no version ever has.
  - Generated AI playbooks draw from fixed live lists (`playbookFor`), and scouting swaps draw from `OFFENSE_IDS` (`adaptPlaybook`). None of 5,000 generated clubs carries one.
  - A franchise plan is filtered to the coordinators' catalogs plus available Legendary Plays (`setGamePlan`, `startingPlan`), so no save the game writes can hold one.
  - The Practice Field lists only the catalog (`teamsForPractice`).
  - The owner's "OK to add this play to the practice field" review flag is stored but read by nothing.

  The only routes in are the development tools (Developer → Playbook Audit, and the Defensive scenario lab in the Attribute Testing Lab), which never touch a franchise. There the Audit marks them "built and reviewable here, but no coach, AI club or practice field can call it yet".

  Corrections are deferred to the reserve-play release. Measured on this engine (26 calls × 10 seeds):
  - Pin and Pull misses the mesh on 100% of plays: its back runs straight away from the quarterback, like v42.15's Stretch Left. Adding the same hip point (`[-4.6, -1.4]`) gives 0% misses and handoffs within 1.48 yards.
  - Pistol Zone Read misses on 39%, Midline Read on 24%: the quarterback never steps toward the back's track. A one-point mesh step (`[-3.6, 0.6]` and `[-3.4, 0.5]`) gives 0% misses.
  - End Around misses on 99%. The receiver needs about two seconds to loop back to the quarterback, so it needs a small timing rule for reverses, not a path point; even a quarterback who waits for a carrier still coming leaves 59% missed.
- Tests: `tests/run-game.test.js` (13): every live handoff in reach, Stretch Left's mesh, the missed mesh keeps, the read option's keeps and gives, receivers' blocks and their limits, the hand-over to the escort, the off-field check, Trap's kick-out and climb, slipping a block in space, pullers ahead of the back and blocking, the back not held back, and Bulwark's reach, single count and measurable but uncertain effect.
- **Phase C2 (owner-approved 2026-10-28): running-back vision (F7) and Outside Zone (F8).** Baseline for every comparison: v42.15.0, same seeds; "C1" is the C1 head (`8d0d2e3`).
  - *F7 vision.* The pre-contact read (`preContactLane`, v42.8) made a sharp back worse on Inside Zone: at Awareness 95 he cut back more and lost more (negative runs 26% → 36%). Its read is kept: from the handoff the back presses the designed hole and reads it and the lanes 2 and 4 yards either side every quarter second, then bends his path once if a lane reads clearly better. Corrected:
    - A defender held by a block counts for part of his weight, because the block may not hold. Before, he did not count at all.
    - A defender running straight at the carrier is counted where he stands, since he will follow the cut. Before, his motion was read as leaving the lane.
    - A free defender whom a team-mate is visibly closing on (a puller, a climber, a lead back) counts for less: the pickup is in sight but can miss.
    - A cut has a price: the plant costs ground (less for an agile back, more for a wider cut), and much more the farther short of the hole he makes it, because a plant in the backfield lets the chase catch up.
    - A poor reader needs the other lane to look much better before he leaves the call.
    - His misreads come from a hash of the seed, his slot and the tick, not the play's dice, so reading well or badly changes nothing else in the play.

    Nothing reads a defender's assignment, attributes or next move. A tried alternative, a race-to-the-lane model, was rejected: it multiplied Speed's effect and never cut on Inside Zone.
  - *F8 Outside Zone.*
    - The back aligns in Gun Pro beside the quarterback and meets him at a mesh point behind the line (about 0.45 s, always within 1.5 yards), then presses toward the edge: through 6.5 yards wide at the line and 9 at five yards.
    - The left guard and the right guard reach to the play side, the tight end reaches the edge, and both receivers stalk.
    - No block is certain, and nothing is scripted after the mesh.
  - *F8 Edge Contain.*
    - Its ends now line up outside the tackle box (±5 yards; they were over the guards, where nothing outside was contained).
    - Before the handoff, an end who has read the run (Phase A) sets the edge outside the ball.
    - Leverage: a contain end plays with his outside arm free. Once the carrier comes to his side (no more than 1.5 yards inside him, or outside him), a blocker who reached him sheds at +1.5 a second. This is his own assignment and where the ball plainly is, and the shed is still a rate, not a certainty.
    - Only Edge Contain uses contain, and only on runs.
  - *Measured, plain 65s, all 12 runs × 26 calls × 100 plays* (v42.15 → C1 → C2):
    - Outside Zone 2.78 → 2.36 → 4.39 yards per carry: negative runs 33 → 30 → 11%, success 32 → 29 → 43%, 10+ 9 → 5 → 15%.
    - Inside Zone 1.70 → 2.56 → 2.60, negative runs 30 → 27 → 25%.
    - Power Right 4.56 → 5.59 → 6.00; Power Left 5.01 → 6.13 → 6.36; Counter 5.36 → 5.93 → 6.13.
    - Stretch Left 11.39 → 5.91 → 5.55; Read Option 5.81 → 3.34 → 3.60.
    - The rest within 0.2 yd of C1.
    - All runs 4.33 → 3.97 → 4.20; negative runs 14.0 → 16.3 → 14.1%.
  - *The run calls still stop the run.* Lowest: All-Out 1.03, Goal Line Stand 1.35, Double A Mug 1.60, Run Wall 2.71, Cover 0 2.94. Call order correlates 0.84 (Spearman) with v42.15.
    - Outside Zone is stopped by Goal Line Man (−0.9), Cover 0 (−0.9), Goal Line Stand (0.1), All-Out (0.9) and the blitzes.
    - Edge Contain holds it to 3.9 (12th of 26). It holds Stretch Left to −0.9 and Toss Sweep to 0.5, and gives up 12 to Power Left and Counter.
  - *Edge Contain against Outside Zone (investigated before the lesson changed).*
    - In this 7-on-7 the redesigned play blocks every play-side Edge Contain defender: the tight end reaches the end, the right guard climbs to the lone linebacker, and a receiver stalks the corner.
    - The leverage rule wins the edge some of the time (5.9 → 3.9 yards per carry). Calls that penetrate before the edge forms do better.
    - Also measured, not adopted, so as not to tune a matchup to its lesson: a +2.0 leverage rate (3.7), and ends at ±6 yards (2.9, but Power Right gained 9.6 against it).
  - *Running back, RB only, 10 runs × 26 calls × 20 seeds, 50 → 95* (v42.15 → C2):

    | Attribute | v42.15 | C2 |
    |---|---|---|
    | Awareness | +0.53 yd, negative runs 12.7 → 14.3% | +0.41 yd, negative runs 12.0 → 12.3% |
    | Agility | +0.89 | +1.67 |
    | Speed (weighting unchanged) | +8.24 | +7.43 |
    | Strength | +1.30 | +1.48 |

    - Inside Zone at Awareness 50 → 95 (30 seeds): v42.15 1.50 → 2.08 with negatives 26 → 36%; C2 2.31 → 2.52 with negatives 24 → 24%.
    - Power Right is the clearest gain (4.93 → 6.64): the aware back sees the cutback behind the pull.
    - On Power and Counter, a back's cutback gains about 4 yards over the same seed uncut at 50. Cuts on Inside Zone, Dive and the rest still sometimes lose.
  - *Line and defence attributes* (9 runs × 10 calls, 50 → 95, v42.15 → C2): OL Blocking +1.71 → +2.91; OL Strength +1.40 → +1.36; DL Strength −1.68 → −1.36; DL Agility −1.29 → −1.23; LB/DB Tackling −0.56 → −0.87; LB/DB Speed −0.80 → −1.05.
  - *Blocking* as in C1: every handoff is in reach, stalks land on some runs and not others, and pullers lead. Outside Zone's tight end reach is the play's key block and can be lost.
  - *Abilities on runs* within noise of C1 (Bulwark centre +0.18 to +0.73; Landslide +0.9; Eruption +0.8). Blink still adds about 24.6 yards per use (ability review).
  - *Read Option:* keeps 3.42, gives 2.18; there are no missed meshes.
  - *League, 360 matched games* (v42.15 → C1 → C2):
    - Points per team-game 13.10 → 13.06 → 13.39; per drive 2.56 → 2.46 → 2.57.
    - Yards per carry 5.66 → 5.50 → 5.85; success 48.4 → 46.1 → 47.7%; negative 6.4 → 7.9 → 7.0%; 10+ 20.0 → 18.1 → 18.9%.
    - Yards per pass play 7.96 → 8.00 → 8.00; run share 35.6 → 35.4 → 35.6%.
    - By play: Power Right 5.93 → 6.17 → 7.33 (the best run in games); Power Left 5.64 → 5.49 → 6.47; Outside Zone 5.47 → 5.11 → 6.46; Inside Zone 2.48 → 3.35 → 3.67; Stretch Left 12.54 → 7.74 → 7.51; Read Option 7.23 → 3.80 → 4.39.
  - *Phase A and B:*
    - Every pass play replays identically except against Edge Contain (1,659 of 1,716). The 57 that differ are all against Edge Contain, from its new alignment: 8.87 → 9.32 yards per pass play, sacks 0.8 → 0.3%.
    - Defensive Awareness still lowers run yards in every call group with no inversion (largest step 0.41).
    - The run-defense Awareness total is 1.09 → 1.17. Play-action against run calls is 13.24 → 13.39 yards per attempt.
    - Counter against run fronts: Awareness 50 → 95 lowers it 9.6 → 4.5.
  - *Lessons.* The 37 run claims in the v42.15 text hold 11 (v42.15) → 15 (C1) → 16 on this engine. The lessons were rewritten where the engine contradicts them, after the matchup was checked first. The rewritten text makes 58 claims, of which 57 hold. The one exception, Dive losing to Run Wall, ranks 10th on one 100-seed range and 8th on another.
    - Edge Contain against Outside Zone: see above.
    - Power Right against Goal Line Stand: the aware back now finds the cutback the front leaves (24 of 100 plays cut, for 14.9 yards).
    - Power Right against Cover 0: middling in every version.
  - *Speed test (owner-approved revision, 2026-10-28).* The old `attr-trials.test.js` "Speed: … a 95 back gains more" used one cell, Outside Zone against Cover 3, over seeds 1000–1059, and asks for +1.5 yards.
    - The redesigned play measures +1.06 there. On other ranges it measures +2.04, +3.10 and +4.75, and across ten calls +21.
    - v42.15 measured +31.6 in that cell, because the back outran a defence that saw no run.
    - Cover 3's strong safety now comes down and meets a fast back who arrives before his receiver's stalk block. The slower back gets the block.
    - Replaced (owner-approved) by "Speed: a faster back gains more across run concepts, calls and seed ranges". It runs six live runs (Inside Zone, Power Right, Counter, Outside Zone, Stretch Left, Toss Sweep) × six calls (Cover 3, Cover 1, Cover 2 Zone, Run Wall, Edge Contain, Tampa 2) × three independent 8-seed ranges, at Speed 50, 65, 80 and 95.
    - The same +1.5-yard bar now applies to the aggregate and to each seed range on its own. Every concept must gain at least 0.5. The aggregate must rise at every step. No concept may fall more than 0.5 between neighbouring levels (an inversion).
    - Measured: all runs 3.81 → 4.65 → 6.85 → 11.35; seed ranges +6.3, +9.9 and +6.4. By concept, 50 → 95: Inside Zone +4.7, Power Right +3.0, Counter +4.6, Outside Zone +15.8, Stretch Left +11.6, Toss Sweep +5.5.
    - The old cell is printed as a diagnostic only (5.72 → 6.78). Speed weighting and gameplay are unchanged.
- **Final validation (owner request, 2026-10-28).**
  - *Running-back Awareness, behaviour* (9 runs × 26 calls × 12 seeds, two independent seed ranges; Awareness 50 / 65 / 80 / 95). Future frames are used to judge the read, never to make it.
    - Yards per carry: 4.02 / 4.21 / 4.43 / 4.38 on the first range, 4.99 / 5.16 / 5.46 / 5.53 on the second.
    - How often he cuts: 1.9% / 3.5% / 5.5% / 8.6% of runs (1.9% / 3.4% / 4.8% / 7.6%).
    - When he cuts, the lane he chooses really is more open than the called one (nearest free defender over the next 0.8 s) on 88–95% of cuts. Only 4–6% of cuts go into a lane a free defender closes to within a yard.
    - Against the same seed at Awareness 50 without a cut, a cut gains +1.4 yd on the first range and +3.2 to +5.1 on the second.
    - Cuts stopped short (under 2 yd) fall from 56–65% at 50 to 45–51% at 95; cuts gaining 4+ rise from 11–19% to 21–30%.
    - Negative runs are the same at every level on every play except Trap, because they are settled before the read: penetration in the backfield.
    - So Awareness improves decisions on the plays where a read matters. The aggregate gain stays modest because only about 1 run in 12 offers a read worth changing.
  - *Findings reported for the owner (both corrected below, owner-approved):*
    - Reading the lead block (F5, C1) does not use Awareness. Every back follows his engaged puller the same way, on about 46% of Power, Counter, Trap and Toss runs at every level.
    - Trap at Awareness 80–95 sometimes cuts 4.5 yards short of the hole, mostly against All-Out Pressure, giving up a 0-yard run for −1 (negative runs 7 → 11%). On 48 such cuts in 312 plays the net is −0.8 yd. It is a small early-cut case that the cut price does not fully cover.
  - *Power Right in games* (5.93 → 7.33 in the first three sets).
    - Over six independent 120-game sets: C1 6.03 → C2 7.09 pooled (about 1,550 runs each). The median is 4 in both; runs of 20+ yards rise from 3.4% to 5.3%.
    - The rise is in the tail and against fronts. Cuts (30 of 1,556) add 0.26. Against Edge Contain it rises 4.05 → 12.81 (its intended inside weakness, now real since the ends moved outside), adding 0.33. Against Goal Line Man (2.76 → 15.19), Bear Front (2.53 → 6.76) and Goal Line Stand (2.39 → 4.88) it adds 0.42.
    - Against coverage calls it is unchanged.
    - The same mechanics with only the dice stream changed measure 6.58, so about 0.5 of any one set's figure is noise.
    - Lab, plain 65s, three 60-seed ranges, v42.15 → C1 → C2:

      | Front | v42.15 | C1 | C2 |
      |---|---|---|---|
      | Goal Line Stand | 3.5 | 2.3 | 4.8 |
      | Goal Line Man | 2.8 | 8.1 | 8.9 |
      | Bear Front | 1.2 | 2.7 | 5.2 |
      | Run Wall | 1.8 | 3.1 | 3.3 |
      | Edge Contain | 3.5 | 3.1 | 4.9 |
      | All-Out Pressure | 1.1 | 1.3 | 1.3 |

    - Traced plays: the gains come from the back bouncing outside a front that has nobody outside the box (Bear Front, Goal Line Man), or cutting back behind a linebacker or corner who has pursued into the backfield, where he chased the carrier's earlier position (Phase A perception delay). Both are visible on the field.
    - No hidden information and no defect was found. Not rebalanced.
  - *Edge Contain against v42.15* (three 40-seed ranges):
    - Edge runs: Stretch Left 14.8 → −1.2; Toss Sweep 3.8 → −0.7.
      - The unblocked contain end makes 88% of Stretch Left's tackles. No blocker is assigned to him, and he is never engaged, so this is the scheme, not the shed.
      - Stretch Left still gains 4+ on 8 of 120 plays, Toss on 18.
    - Outside Zone 1.7 → 3.4: 4+ on 46 of 120, 10+ on 6.7%, its end engaged on every play. The leverage shed is a rate, not a win.
    - Jet Sweep −0.4 → 2.2; Read Option 2.4 → 3.6.
    - Inside, its intended weakness, now real: Power Left 1.6 → 9.7, Counter 2.1 → 11.7, QB Draw −0.2 → 5.5, Inside Zone −0.3 → 3.5, Power Right 3.4 → 4.6, Dive 2.2 → 2.9, Trap 0.3 → 3.6. In v42.15 Edge Contain stopped nearly every run, because its ends lined up inside.
    - Passing:
      - Play-action: 8.61 → 8.19 yards per play, completion 46.7 → 45.9%, sacks 6.7 → 2.2%, interceptions 1.5 → 1.5%.
      - Other passes: 7.65 → 7.59 yards, completion 59.9 → 58.7%, sacks 0.2 → 1.3%, interceptions 2.6 → 3.2%.
      - PA Boot against it: 7.46 (13th of 26) → 6.55 (11th).
    - Nothing abnormal.
- **Final refinements (owner-approved, 2026-10-28): premature cutbacks and the lead-block read.** Both are in `src/sim/engine.js`. All comparisons use matched seeds against the Phase C commit `c57a1e8` and v42.15.0.
  - *Premature cuts (the defect).*
    - The lane read dropped any defender whose motion carried him behind the carrier.
    - A lineman who had penetrated beside the back and was chasing the quarterback therefore vanished from the read. A cut toward him then looked clean.
    - Against All-Out Pressure, the aware back cut 4.5 yards short of Trap's hole into that defender: 8 of 48 plays at Awareness 95 against the four pressure calls.
  - *Corrections.*
    - A free defender already across the line, beside the back (within 2.5 yards behind him and 6 to the side), is counted where he is.
    - More than 3 yards short of the hole, the back keeps pressing unless something he can see threatens his own track now: a free defender across the line, near the path between him and the hole. A penetrator can still force an early adjustment. A crowded hole further on cannot, because it may open by the time he gets there.
    - The existing cut price (more the farther short of the hole) is unchanged.
  - *Lead-block read (Awareness).* Before, every back followed his engaged puller the same way. Now:
    - The open side is the blocker's side away from the man he has engaged. A poor reader sometimes takes the wrong shoulder: chance 0.3 × (1 − Awareness)^1.5, about 11% at 50 and 0.3% at 95.
    - He then compares the free defenders he can see near the lane beside the block and near the designed lane. He uses the lane read's own perception: Awareness sets how many defenders he misses and how far off he places them, and an aware back reads a scraping defender's current flow. A chaser counts where he is.
    - He stays on the design (`lead_pass`) only when the lane beside the block reads clearly more crowded.
    - The rule is the same for every back. Nothing knows whether the block will hold or where anyone goes next.
    - Considered and rejected: letting a sharp back wait until closer to the hole before reading the block. It cut lead-block reads from 46% to 7–16% of runs, and least for the sharpest backs, so following the block would no longer be a normal choice.
  - *Measured* (9 runs × 26 calls × 12 seeds per range, Awareness 50 / 65 / 80 / 95). Future frames judge the read; they never feed it.

    | | v42.15 | Phase C before | Final |
    |---|---|---|---|
    | Cut rate at 95 | 27.8% | 8.6% | 9.4% |
    | Cut into a lane closing to within 1 yard | 9–13% | 4–6% | 3–5% |
    | Cut chose a more open lane than the call | 86–90% | 89–93% | 91–95% |
    | Premature cuts (more than 3 yd short) at 95 | 14.7% of runs | 1.2% | 0.7–0.8% |
    | Negative runs, 50 → 95 | 10.7 → 13.0% | 10.7 → 11.1% | 10.7 → 10.8% |
    | Trap vs All-Out, Double A Mug, Cover 0, Zone Blitz, Goal Line Stand, Bear Front at 95 | 0.68 yd, 50% negative | 0.61 yd, 31.9% negative | 1.21 yd, 16.7% negative (range 2: 0.32, 26.4%, the same as at 50) |

    - Trap's negative runs no longer rise with Awareness: 6.7 → 7.1% (was 7.1 → 11.2%).
    - Against the four pressure calls, early cuts at 95 fell from 8 of 48 to at most 3. Negative runs there are 1 at 50 against 9 at 95 before the fix.
    - Yards per carry: 4.06 / 4.26 / 4.43 / 4.37 and 5.03 / 5.19 / 5.46 / 5.49.
    - RB-only sweep (10 runs × 26 calls × 20 seeds): Awareness +0.38 yd, negatives 12.1 → 12.2%. Phase C before: +0.41, 12.0 → 12.3%. v42.15: +0.53, 12.7 → 14.3%.
  - *Lead-block read, measured* (Power Right, Power Left, Counter, Trap, Toss Sweep):
    - The block is read on about 46% of those runs at every level.
    - The back follows it on 92–95% of reads at every level, so it stays the normal choice. Before, he followed 100% of the time.
    - Where the 95 back stays and the 50 back follows on the same seed: +1.5 yd (n 34). Where the 95 back follows and the 50 back stayed: −1.0 yd (n 55).
    - Stays gain 6.16 vs 4.23 yd (95 vs 50) on one range, but 3.88 vs 5.41 on the other.
    - So the read is now Awareness-dependent, as specified, but its yardage effect is within noise: it changes the decision on about 3% of lead plays. Nothing was tuned toward a yardage target.
  - *Speed and Agility with Awareness* (9 runs × 10 calls × 10 seeds, Awareness 50 → 95):
    - At Speed 50 → 95 the Awareness gain is +0.30 → +2.76 (v42.15 +0.15 → +2.70): a fast back's open-field reads, unchanged.
    - At Agility 50 → 95 it is +0.48 → +0.59 (v42.15 +0.64 → +0.65).
    - The Speed curve is 3.25 / 4.29 / 6.74 / 10.82 and the Agility curve 3.62 / 4.29 / 4.79 / 5.31, both unchanged.
  - *Regression.*
    - Plain-65 matrix within 0.15 yd of the Phase C commit on every run: all runs 4.20 → 4.22; Counter 6.13 → 6.22; Toss Sweep 3.35 → 3.48.
    - Lesson claims 56 of 58 hold. Dive vs Run Wall ranks 10th, and Trap vs Fire Zone 17th here and 18th on a second range: both borderline.
    - League, 360 games: points 13.39 → 13.14; yards per carry 5.85 → 5.78; Power Right 7.33 → 7.35; Counter 6.53 → 6.51.
    - Power Right over six 120-game sets: 7.09 → 7.08 (median 4; Edge Contain 12.8 → 11.9, Goal Line Man 15.2 → 13.9).
    - Edge Contain runs and passes unchanged, except Power Right 4.6 → 5.3 and Read Option 3.6 → 3.2.
    - Pass plays identical except against Edge Contain (unchanged).
    - Phase A Awareness studies: no inversions; mean total 1.12; play-action unchanged.
    - Abilities within noise; Read Option split unchanged.
  - *Tests* (`tests/run-vision.test.js`, 3 more):
    - Trap against pressure: at most 3 premature cuts at Awareness 95, and negative runs no more than 5 points above Awareness 50. The Phase C commit measured 8 premature cuts and 2% → 19% negative runs, so it fails this test.
    - Every early cut has a free defender across the line near the back, and early cuts still happen.
    - Following the lead block is at least 80% of reads at every level, and staying on the design is a real choice.
- Tests (C2): `tests/run-vision.test.js` (4):
  - a sharp back does not lose more on Inside Zone;
  - cutbacks are reads, not certainties;
  - Outside Zone meets behind the line, early and in reach, and reaches the line outside the tackle box;
  - Edge Contain lines up outside, holds Outside Zone below the median and gives up more to Power, but Outside Zone still breaks some.

  The carrier-vision, attribute-fixes and awareness-matters tests pass unchanged.

- **Release v42.16.0 (2026-10-29).** The owner approved the merge and publication of the complete Phase C (C1 + C2 and the final refinements).
  - **Merge:**
    - PR #80 (`phase-c-run-plays` → `main`) was merged at the approved head `e7986c3` as merge commit `ffd488b0a147c723df18f37129925df8b96fc330`.
    - The merge tree equals the approved head's tree (`6c746d0`), so the full suite was not rerun. It had passed 724/724 on `e7986c3`.
    - Release smoke: the `release-stamp`, `run-vision` and `run-game` tests, 22/22.
  - **Release files:** 156, the same set as v42.15.0. Four have changed content (`index.html`, `src/data/playbook.js`, `src/sim/engine.js`, `src/version.js`), each byte-identical to `git show ffd488b:<file>`.
  - **Deploy check** (iPhone Safari emulation), run twice: on the publish folder, and on the files read back from the live link. Both passed:
    - the build label reads v42.16.0-run-game, with `test: false`;
    - two existing franchise saves load after a reload;
    - the AI Testing Lab opens by taps;
    - a setting survives a reload;
    - live franchise plays draw the QB read ring, and the replay shows the read list.
    - A phone-width (390 px) smoke test on the release build also reached the Practice Field through Developer Tools and ran a play, with no page errors and no horizontal overflow.
  - **Deployment:** https://claude.ai/artifact/GJG2k6eqG3qfeteJEbXvFq (URL unchanged), artifact version 114 (`1793261185-337e`).
    - Before publishing, the live files to be replaced were confirmed to be v42.15.0 (manifest hashes).
    - The page and the 3 changed game files were published.
    - Afterwards, all 155 game files read back byte-identical, and the built page sits unchanged in the host wrapper.
    - `src/version.js` serves v42.16.0-run-game.
    - The separate test link was not touched.
    - `release/manifest.json` was regenerated (version v42.16.0-run-game, commit `ffd488b`, artifact version 114).
  - **Saves:** no save format change and no migration; no save-layer file changed.

### 53.6 Testing
`tests/qb-read.test.js` (17): the owner's tests 1–16 on the real engine (primary open; primary double-covered at Awareness 95; secondary open; checkdown; everyone covered; blitz timing; zone windows; play action; option/RPO; the same play against different defenses; Awareness 50 vs 95; save/load; replay accuracy; the indicator setting; the Lab; a named target obeyed) plus model sanity. `tools/qb-study.mjs` (before/after and Awareness sweeps), `tools/ai-lab-check.py` (Lab at 320–430 px: live, paused, comparison only after deciding, storage across reloads, export → clear → import, no franchise touched), `tools/qb-compat-check.mjs` (a v42.4.1 save opened byte-identical and played on; the new setting both ways). Replay planner fix: a long catch-and-run touchdown no longer exceeds the replay window (lead-in shortened first, then the end trimmed).

### 53.7 Known limitations
- Scrambles are rarer than the old random 1.5–3%, but productive; the Lab can calibrate the lane thresholds. The engine's open-field running after a scramble limits how much a scramble can gain.
- Since v42.6 there is no throw-away at all (§53.5a); intentional grounding no longer arises.
- No mid-flight deflections exist in the engine, so "throwing lane" means a defender undercutting the catch point, not a ball tipped at the line.
- No RPO plays exist; the read-option branch is unchanged.
- Hot throws under pressure are about 40% of decisions (a free rusher arrives on about a third of dropbacks, as before).
- Scoring is up slightly (≈ +0.9 points per team per game in a 36-game sample) because quarterbacks find better throws.

## 54. Trading, second pass (PROPOSED 2026-10-29, owner brief "Task 5"; branch `trading-second-pass`; NOT merged, NOT released; awaiting owner review)
Baseline: `main` at `db7c0c6` (the published v42.16.0-run-game plus the merged AI Franchise Benchmark, PR #81). No game version is published and no link changes. No football-engine, XP, evolution, draft-class or competitive-balance code is touched. Pre-registered plan: `docs/TRADING_SECOND_PASS_PLAN.md`; results: `docs/TRADING_SECOND_PASS_RESULTS.md`; the Task 5.5 checkpoint plan: `docs/POST_TRADING_BENCHMARK_PLAN.md`.

### 54.1 What the Task 4 benchmark found
Over 20 seeds × 10 seasons the AI clubs made 407 trades (2.0 a season): 390 were a player for picks, 17 were swaps, 2 were in season. Kickers were the most-acquired position (58 deals, 14%) and 51 of those paid a first-round pick, the most of any position. Prices were position-blind: a point of overall cost the same at kicker as at quarterback.

### 54.2 One valuation for every deal (`src/franchise/trade-value.js`)
- **Market value** = `(max(6, (overall − 50) × 4.2) × age factor + potential upside) × position leverage × contract factor`. The slope is the one the pick scale was calibrated against. Age: 1.15 at 22 or younger down to 0.6 at 33+. Contract: years left (×0.9 with one year, ×0.7 expiring) and paid below or above rating (±10%).
- **Position leverage** (measured, then softened): `tools/position-leverage.mjs` plays 2,000 paired games with and without +10 overall for one group's starters (data in `docs/trading-second-pass/position-leverage-study.json`). The engine says a point of overall moves the score most at RB, TE, QB, CB and least at OL, DL, S, K. The measured ratios are as wide as 9 : 1, which an owner could trade against, so the table is taken at **half strength** (square root), clamped to 0.6–1.6 and rescaled to a slot-weighted mean of 1: **QB 1.37 · RB 1.60 · WR 1.01 · TE 1.45 · OL 0.63 · DL 0.86 · LB 1.02 · CB 1.21 · S 0.90 · K 0.79.** Kickers are cheaper, never worthless and never banned. *Half strength is a judgement call, flagged for the owner.*
- **Roster worth** = every monster's market value times the role he plays on that club: starter 1, first backup 0.45, second backup 0.15, the rest 0.05; a monster out three or more weeks counts as a reserve. The same player is worth more to a club that needs him, less to a deep one. A deal's net to a club = change in roster worth + picks taken in − picks sent out.
- A deal happens only if it is **fair in market value** (the AI–AI band 0.85–1.15 is unchanged) **and better for each club by its own measure**. No random draw is involved; nothing reads a result the club could not see.

### 54.3 Owner-initiated trades (`src/franchise/trade-desk.js`, `src/ui/trade-desk-ui.js`; HQ → Trades → 🤝 Trade desk)
Choose a club, tap what you send and what you ask (monsters, up to three, and picks, up to three), see the roster, cap and depth change, and send. The preview says whether the deal is **legal**, never whether the club will say yes. A club answers once, on the spot: a done deal, or a no with plain reasons (value, need, roster, cap, no ready replacement, limit) and, when one exists, a counter it would accept.
- **The AI judges benefit to itself:** the margin above fair value is **Rookie 3% · Pro 6% · All-Star 12%**, plus a temperament of ±2% hashed from the proposal, so the same proposal always gets the same answer (also after a reload).
- **Legality is unchanged:** roster 26–38 on both sides, each position keeps its starters, the cap on both sides, never a protected monster, a cornerstone or a rookie on his first deal; windows are the draft clock and the offseason before the draft. A starter is for sale only if the next man is within 6 overall.
- **Exploit prevention:** 3 proposals per club and 8 per window; a monster just traded cannot be traded again that season (no flipping); bench bodies are worth almost nothing to a club, so dumping fails; picks are valued by round, slot and distance as the game always has, and more than three picks a side is refused; asking again changes nothing.
- A monster arriving from a club gets a new two-year deal starting next year (the contract the pick trade always gave); one going out joins that club's registry with his history closed and his contract intact.

### 54.4 Incoming offers
`maybeTradeCall` asks `buildIncomingOffer`, which looks at the league's rosters: a club that is short at a position and sees a spare of the owner's that would start for it **buys**, one with a spare that would start for the owner **sells**, or the two **swap**. Each candidate is built from that club's real need, checked by the same `evaluateProposal` the desk uses, and the call shows its effect ("roster 35 → 34 · cap room · WR best 79 → 79"). The owner always decides; there is no quota: a week with no real need has no call. Accepting re-validates the offer; one that is no longer legal or acceptable is withdrawn with a reason. Counteroffers on the desk are validated the same way (`findCounter`: the cheapest addition of a pick or a monster of yours, or dropping one of your asks, first that the club would accept). Calls from older saves (picks for one player) are still answered the old way.

### 54.5 In-season AI trading: root cause and fix
The Task 4 funnel (`tools/trade-funnel.mjs`, replaying the old gates on real leagues) showed in-season deals died at three gates: needs came only from the depth gap (≥ 0.25), almost no spare beat a club's weakest starter by 2 once the offseason had filled the holes, and full rosters (38) closed the picks-only path. The fix is narrow: need now comes from the roster-worth gain of the best available spare, and a deal may be a swap or a swap plus picks, which needs no roster slot. The weekly 25% attempt chance, the window (weeks 2–8), the three-deals cap, "only spares are sold", the band and the legality rules are **unchanged**. There is no forced minimum. *Not relaxed:* the owner's in-season window stays closed.

### 54.6 Flags for owner review (proposed changes to approved behaviour)
1. Position leverage at half strength (above).
2. The 6-overall replacement rule now also applies to owner proposals and incoming offers (it applied to asks before).
3. The pick ask is unchanged and can still buy at the Rookie-difficulty generosity (a pick buys a player at 1/1.35 of his market value); combined with selling that player to a club in a **later** year this is a small residual arbitrage that the same-season flip lock does not cover. Not fixed here; named for the owner.
4. AI–AI clubs still sell only spares. Letting them sell starters would relax an approved rule and is not done.

### 54.7 Saves
No save migration. `f.tradeDesk` (proposal counts and the window stamp) appears only once the desk is used; the flip lock reads the `traded` mark every traded monster already carries, so there is no other new field. A save without `f.tradeDesk` trades as normal (tested). AI–AI deal records gain optional fields (`mv`, `fl`, `sm`) that older saves lack.

### 54.8 Tests and tools
`tests/trading-second-pass.test.js` (34 with the neighbours: valuation, desk, adversarial, incoming offers, a played franchise end to end, reload). `tools/owner-trading-scenarios.mjs` (12 scenarios), `tools/trade-desk-check.py` (320–412 px), `tools/trade-perf-check.mjs`, `tools/trade-benchmark-compare.mjs`, `tools/post-trading-benchmark.sh`, `tools/trade-funnel.mjs`, `tools/position-leverage.mjs`.

