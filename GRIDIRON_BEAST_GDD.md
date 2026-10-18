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
* **Store release — decision pending (after the prototypes).** Once the prototypes are signed off, the owner decides between two routes to the App Store and Google Play, and nothing in the prototypes should pre-empt it:
  1. **Capacitor wrapper (default recommendation).** The existing web app ships unchanged inside a native iOS/Android shell; one codebase, the prototype *is* the store build, local saves become reliable. Needs icons/splash, an Apple Developer account ($99/yr), a Google Play account ($25), Xcode on a Mac, and a replacement for the claude.ai cloud save (plain local save or an owner-run backend).
  2. **Unity port.** A rewrite in C#: sim, sprite builder, UI and balance all rebuilt by hand. Gains the Unity toolchain and asset pipeline; costs a full re-implementation and the risk that the port drifts from the prototype the owner approved. Sprites can be exported as PNG sheets either way (`tools/export-sprites.mjs`).
  The decision point is a line item at the end of the prototype plan; until then the game stays a zero-dependency web app and every feature is built so either route can carry it.
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
* **The title raises the floor:** each Beast Bowl the player wins adds +1 quality to every club for all later seasons, so a champion never cruises through the next year. This replaces the old Challenger / Vanguard / Sovereign tiers (already disabled).
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
* **Tutorial:** a tip panel on each screen the first time it is reached in a new franchise (HQ, Monday to Sunday, pregame, the first game as an overlay, after the game, roster, plays, league), written for someone new to American football, with a "How football works" primer (field, downs, scoring, fourth down, positions, turnovers, what the player controls). Tips are dismissed one by one, can be turned off from any tip, and Settings can bring them back or open the primer.

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
* **17.3 Attribute points.** Level-ups keep the automatic +1s and bank **2 points** (`POINTS_PER_LEVEL`) the owner spends on the monster card, any attribute, capped by potential. A setting lets the trainer spend them. AI monsters regenerate each season (no points to spend).
* **17.4 The board.** Before each season (and at creation) the commissioner offers three goals scaled to the preseason forecast — safe (win N, never more than 7 of 9 so a contender's safe goal stays easier than the title), medium (playoffs, or badges when the forecast is poor), stretch (the Beast Bowl, worth +2). Winning the Beast Bowl meets whatever goal was set: the champion is never fired. One commitment per season, settled at season end into **board confidence**: +1 per goal met (+2 title), −1 per miss; a met goal also lifts any deficit to 0 and funds one extra prospect every Monday next season. At −1 the owner is on the **hot seat** (rival GM needles, the postseason story event fires even on a winning record); at −2 the board **fires** the owner: the franchise ends (a Hall of Fame card only if already eligible). Nothing else in the game can end a franchise. Currency chosen so goals do not pile onto the cap (already four features) or the dex.
* **17.5 Season flow.** When the playoffs are drawn: a **season recap** (record, standing, club leaders, badges, the goal, the league awards, and the playoff announcement with seed and first opponent, or "missed"). Awards news lands at that moment. An eliminated or non-qualified owner **watches the bracket** round by round (results sheet per round) or skips to the offseason. When the season ends: **how we finished** (elimination round or title, playoff record, board verdict, Hall of Fame progress, the awards book). The HQ button reads *Continue to the offseason*.
* **17.6 Scouting for depth.** Monday shows every position as short / no backup / ok, lets the owner ask the scout for a position, and the scout otherwise targets the thinnest; prospects are outlined red (short-handed) or orange (no backup) with the reason.
* **17.7 Rival presence.** An HQ rival card every week: standings gap, head-to-head (all-time and this season), next meeting, and a weekly line from the rival GM keyed to who is ahead and to rivalry week.
* **17.8 Records book.** League → Records: single-game player records, single-season records (written at season end), team game records (points, margin, yards) and the owner's monsters' career leaders. League-wide careers wait for persistent AI rosters (LATER).
* **Also:** Sim to final; Auto controls stay on screen during plays; field goal on any down; more coach looks (12 styles, 11 extras, 13 shirts), red shirt fixed, hometown removed from creation.

## 18. Playtest round 4 (2026-10-17, build 5) — LOCKED unless marked

* **18.1 Contracts and the offseason.** New signings are two-year deals from the season signed; at renewal the owner chooses **one season or two** (two is the maximum — a one-year deal for the veteran who will be too old in two); salary is fixed for the deal (level-ups and attribute points change the next ask, not today's cost). A fresh franchise is signed through season 2, so the first renewals come in the offseason before season 3. All renewals happen in the offseason: the book lists every expiring monster with an **ask** = market rate for today's ratings (`salaryFor`) +10% after a big season (1,500 passing / 900 scrimmage / 50 tackles / 8 sacks / 4 INT / 12 FGM) +15% for a league award. Three choices: sign at the ask, counter at 85% (calm natures and a winning season say yes more often; a refusal walks), or let walk. Coaches: re-sign at +10% or let walk (the role must be re-hired). The next season cannot start until every decision is made, the roster is at the floor and the staff is full. The cap itself is unchanged for now; contracts and the bigger roster are what make it bite — revisit after a three-season playtest.
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
