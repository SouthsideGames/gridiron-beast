# Gridiron Beast — Game Design Document (Rebuild v6)

**Owner:** Southside Games · **Branch:** `rebuild/mobile-7v7` · **Supersedes:** `docs/GRIDIRON_BEAST_MASTER_GDD.md` v4.9 for all football, UI and roster rules. Franchise rules from v4.9 that are not restated here remain in force.

Decision key — **LOCKED**: approved for this build. **TUNABLE**: implemented, value may change in playtest. **LATER**: designed, not in this build.

---

## 1. Pillars

1. **Coach, not spreadsheet.** Every screen answers "what should I do next?" with one primary action. Depth is available, never required.
2. **Football that makes sense.** Plays end only on real dead-ball events. Blocking, coverage, reads and tackles produce the result; the picture and the box score always agree.
3. **Monsters matter.** Every visible attribute changes something on the field. A Swift receiver separates; a Sturdy back breaks tackles; a Cerebral QB finds the open man.
4. **Five-minute sessions.** A week of franchise management takes under a minute; a game takes 6–10 minutes in Full Coaching or ~2 in Key Moments.

**Platform (LOCKED):** mobile-first portrait web app (installable PWA) for iOS Safari and Android Chrome; desktop works but is not the design target. Zero runtime dependencies. All game logic is pure, deterministic JavaScript so it can later be ported to Unity/C# using the same data and golden tests.

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
| Overtime | College format: each team gets one possession from the opponent 25; repeat until untied; from the 3rd OT period possessions are two-point tries only |
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
| Tue | Recruit | Pick an approach; success adds the monster to the roster (cap and roster limit enforced) |
| Wed | Training focus | Temporary Sunday bonus to the related attributes (Passing, Rushing, Coverage, Pass Rush), scaled by the trainer |
| Thu | Scout opponent | Reveals the opponent's real tendencies and best monster |
| Fri | Game plan | 6 + 6 play cards |
| Sat | Lineup check | Auto-fills injuries; warns about fatigue |
| Sun | Game | All other league games are simulated with the same engine |

**League:** 16 teams, 2 conferences, 4 divisions, 10-week regular season (9 games + bye) using the existing deterministic schedule generator. Standings come from simulated games. Ties broken by head-to-head, then point differential. **Postseason:** 8 teams, Weeks 11–13, Beast Bowl. Beast Bowl champion earns a championship badge. Promotion and relegation (v4.9 §18–19) are **hidden in this release** (`TIERS_ENABLED = false`): the data model keeps a single tier so the three-tier pyramid can return later, and the player-facing goal is one great season — rival storyline, playoff race, end-of-season awards.

**Progression:** XP for participation and contributions (yards, TDs, tackles, sacks, interceptions). Each level adds attribute points to the position's key attributes. Trainer bonuses are never permanent.

**Economy (TUNABLE):** annual caps Challenger 1.8M, Vanguard 2.6M, Sovereign 3.6M credits. Monster salary = 18,000 + 280 × OVR. Staff salaries unchanged. Over the cap ⇒ games locked until you release a monster.

**Saves:** key `gridiron-beast-v6`, `schemaVersion: 6`, export/import JSON. A v5 (11v11) save is never modified; on first launch the player may import owner, club, staff, rival, season, record and history from it. Its 40 placeholder monsters are re-mapped into 7v7 positions, keeping the cornerstones.

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

* Everything in §2–§9 is implemented unless marked LATER, with these simplifications: the promotion challenge game is replaced by automatic promotion once the badge goal is met; relegation uses the two-season bottom-four rule; AI clubs are regenerated each season from a deterministic seed with tier-based quality drift (no persistent AI rosters yet); the opponent's two-point try defense is chosen by the AI rather than the player.
* The player's scouting report reads the opponent's real coach profile, strengths and favourite plays. Training bonuses are real attribute adds on Sunday only.
* Engine tunables (speed curve, blocking engagement, shed rates, throw error, catch/interception formulas, tackle resolution, pursuit effort) are constants at the top of the relevant functions in `src/sim/engine.js`; balance bands are enforced by `tests/engine.test.js`.

## 11. Out of scope for this build (LATER)

Promotion/relegation UI, Multiplayer, Draft Mode, trades, free agency, contracts beyond a single annual salary, custom play editor, penalties beyond delay of game, wind/weather, evolution, equipment, audio.

## 9a. Personnel (revised)

Seven base starters per side are what the owner manages. **Offense:** QB, RB, WR1, WR2, TE, LG, RG. **Defense:** DL1, DL2, LB1, LB2, CB1, CB2, FS. Two package slots per side rotate in for specific groupings and replace a starter for that snap: WR3 (Spread), C (Tight — third lineman), DL3 (Heavy, Pressure), SS (Nickel). Every play still fields exactly seven. Display names are unique within a club (a second monster of the same species gets a numeral).

## 10a. Platforms

* **Primary target (first release):** iOS and Android phones and tablets, portrait-first, installable as a PWA and wrappable for the stores. Tablets get the same layout with wider margins; nothing depends on a hover state.
* **Possible later release: PC** (Windows/macOS/Linux via a desktop wrapper or the browser). The architecture already supports it — zero-dependency ES modules, no touch-only input paths, keyboard-safe forms — but PC is not a design constraint for v6: layouts stay portrait-first and a landscape/wide layout, keyboard shortcuts and mouse hover affordances are LATER work.

## 11. Release 6.1 adjustments (focus pass)

* **Many seasons, one league.** The franchise continues indefinitely: at season end the owner starts the next season with the same club, roster (aged, progressed, re-signed), rival and history; recruiting classes, injuries, XP and awards make each season different. What is hidden is only promotion/relegation between tiers; HQ shows the rival and the playoff race from week 5; the season ends with an awards sheet (MVP, leaders, rivalry record) that is also stored in franchise history.
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
* Recruiting draws from the region's elements by rarity weight. Rares appear only in one home region from week 4. Legendaries are never scouted.
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

* **Schedule guarantee (implemented):** the old rotation gave each club only six distinct opponents a season, which cannot cover eight gyms, so the campaign schedule replaces it. The sixteen clubs form two groups of eight (gym / ordinary, two of each per division). Rounds 1–8 are the bipartite round robin, so every ordinary club meets every gym club once a season and vice versa; round 9 is the division game against the same-group division mate, so all three division mates are still played once. Nine games and one bye in ten weeks, as before; the conference round is gone. The round order rotates by season; in a first season the four starter clubs meet the early gyms in the first half and the late gyms in the second. Standings, divisions, conferences, the rival and the playoff format are unchanged.
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
* **The title raises the floor:** each Beast Bowl the player wins adds +1 quality to every club for all later seasons, so a champion never cruises through the next year. This replaces the old Challenger / Vanguard / Sovereign tiers (already disabled).
* **Legend Tracks:** win the Beast Bowl → choose one track toward any legendary no club owns (or a gym legendary whose badge you hold). Three tracks on the same legendary put it in your recruiting pool in its home region; you still have to sign it and fit it under the cap.
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
* **Gym strength:** tier offsets early +1 / mid +4 / late +7 on top of difficulty, +1.5 per season, +1 after the player's first win. An AI-run club on Pro earns about five badges in its first season and seven by its second; tune after human playtests.
* **Levelling:** `xpForLevel = 30 + 18 × level` with roughly 2.5× the old per-game XP, so a starter reaches level 10 (first evolution) in about two seasons and level 20 (second) over a long career. AI clubs field evolved commons from season 2 (gyms) / 3 (ordinary).
* **AI stars:** AI clubs no longer borrow the player cornerstones; each gets two stars of its own, gym clubs their legendary, the rival its signature monster (a species that evolves, stronger each season).
* **Difficulty win rates (AI-coached player club, week 1, 120 games):** Rookie 66 % / Pro 49 % / All-Star 26 %.
* **Losing-season event pool:** star wants out (raise / promise a start / let go to the rival), coordinator offer (bonus / let go), scheme mutiny when under half a side's starters fit (change scheme / keep / fire). Raises, bonuses and severance land on next season's cap as dead money; mid-season firings leave the rest of the salary on this season's books.
* **Commissioner:** three names (five on Rookie), the cheapest that each alone clears the cap, else the three most expensive until under. Games are never locked by the cap itself; the review is what blocks Sunday.
* **Stores outside the franchise:** the Beast Dex (`gridiron-beast-dex`) and the Hall of Fame (`gridiron-beast-hof`), both mirrored to the cloud save. Evolved forms are revealed in the dex once seen.
