# GRIDIRON BEAST — MASTER GAME DESIGN DOCUMENT v3.0
Southside Games | October 11, 2026 | HTML prototypes → Unity mobile beta

**Decision key:** LOCKED = approved; PROPOSED = initial design awaiting playtest; FUTURE = deferred. This is a design specification, not an implementation claim.

## 1. Vision
Pixel-art 7-on-7 American-football monster franchise RPG. Create a franchise owner, hire a coaching staff, rebuild a struggling team, scout and draft unique monster athletes, develop their stats, build offensive/defensive plays, coach games, and manage a dynasty. Strategic decisions and individual monster identity matter. No monster-purchase shop.

**LOCKED:** iOS/Android Unity target, landscape pixel art, HTML/JS/CSS prototypes first, JSON data, four reviewable prototype phases, single-player offline-first franchise, permanent collection history, hybrid play editor, interactive coaching.

## 2. Game modes and new game flow
Main menu: **Franchise Mode**, **Multiplayer (Coming Soon)**, **Draft Mode (Coming Soon)**, **Settings**. Continue Franchise appears if saved. Unimplemented buttons must show an explanation, never silently fail.

Franchise New Game → commissioner office → owner creation → choose a struggling team and division → hire Head Coach, Offensive Coordinator, Defensive Coordinator and Head Scout → action-driven tutorial → Franchise Headquarters. Commissioner: “Ah, there you are. I knew our new franchise owner would be here soon. Tell me about yourself.” Advance/skip dialogue. Owner creator: first/last name, male/female, default portrait selection, hometown city; preview and confirm. Initial team candidates: Ember City Beasts (2–12), Stonehaven Titans (1–13), Frostpeak Howlers (3–11), Stormport Bolts (2–12). Records are fictional placeholders; teams need distinct rosters, weaknesses, and assets. Headquarters: Next Game, Weekly Calendar, Roster, Playbooks, Scouting, Training, League, Front Office, Coach Profile, Settings, Feature Review.

## 3. Monster data
Each monster instance has immutable ID, species, nickname, elemental type, rarity, archetype, nature, personality, age, level/XP, potential, stats, bond, fatigue, injury state, evolution, abilities, equipment, contract, position experience and career stats. Species supplies baseline visual/physical identity; individuals vary. Rarity affects availability and trait complexity, not automatic superiority.

**PROPOSED stats, 1–100:** Speed, Strength, Agility, Intelligence, Instinct, Endurance, Durability, Ability Power; Throw Power, Short Accuracy, Deep Accuracy, Catching, Route Running, Run Blocking, Pass Blocking, Tackling, Coverage, Pass Rush, Ball Security, Kicking. Overall rating is position-specific, with transparent weights.

**LOCKED archetypes:** QB Pocket Passer/Scrambler/Dual Threat/Gunslinger; RB Power/Speed/Receiving/Balanced; WR Speedster/Possession/Physical/Route Technician; OL Power/Pass Protector/Agile; DL Power Rusher/Speed Rusher/Run Stopper; LB Field General/Coverage/Blitz/Run Enforcer; DB Man/Zone/Ball Hawk/Press/Blitzing DB. Archetypes never forbid unconventional assignments.

**LOCKED natures:** 25 permanent nature definitions in data/natures.json; most increase one stat by 10% and decrease another by 10%; three are neutral. Natures affect football behavior as well as effective stats. Scout skill controls whether a nature is revealed.

**Growth:** XP from games, training and achievements; level-ups influenced by species, nature, archetype, potential, training, equipment. Evolution may require level and football milestones; branch choices possible; retain nature, history and contract. Age causes eventual decline and retirement; archived retired monsters remain in collection history.

**Items (LOCKED):** Ankle Weights increase Speed growth at level-up without match boost; Shoulder Pads boost blocking in games. **PROPOSED:** one training and one match equipment slot; explicit caps and no direct purchases of monster individuals.

## 4. Roster and details
**LOCKED:** 7 on field per team, 14 visible during a snap, clickable icons/cards. **PROPOSED 20-monster active roster:** offense QB1/RB1/WR2/OL3, defense DL2/LB2/DB3, plus six reserves. No individual simultaneously occupies two live slots. Allow positional switches with suitability penalty. Roster shows sprite, species, name, type, archetype, nature, age, level, position rating, fatigue and contract. Detail tabs: Overview, Stats, Abilities, Growth, Equipment, Career, Contract. Swap starters, compare players, view specific ability mechanics.

## 5. Football rules and match presentation
**LOCKED:** complete 7-on-7 exhibition, four quarters, 40-second **live** play clock, offensive and defensive calls, full coaching and key moments. **PROPOSED rules:** 100-yard field plus two 10-yard end zones; 3 simulated minutes/quarter; 4 downs for 10 yards; TD 6, PAT 1, two-point try 2, field goal 3, safety 2; abstract kickoffs and punts initially; three timeouts per half; simple overtime possessions.

Field MUST show numbered yard lines, hash marks, end zones, line of scrimmage, first-down marker, home/away labels, possession indicator, all 14 pixel-art monsters, ball, score, down/distance, yardline, quarter, game clock and **integer** play clock. No emoji-only field in review-ready build. Separate game and play clocks. At play-clock zero: five-yard delay of game and appropriate reset. Pause freezes both. Audibles consume live time.

Play resolution: validate formation/clock → offensive and defensive calls → attributes/chemistry/fatigue/training/scheme → protection or run lane → pass/run/contact → mutually exclusive catch, incompletion, sack, fumble, interception or score → update ball/downs/clock/score → structured play event → animate and log. Seeded randomness for reproducible tests. Cover possession changes, turnover on downs, punts, field goals, safeties, period transitions and final statistics.

## 6. Coaching and defensive freedom
**LOCKED:** Franchise owner can choose Full Coaching to call every offensive and defensive play; Key Moments uses the player's own equipped playbook for routine plays and returns control on third/fourth downs, red zone, critical late-game possessions and major events. Toggle anytime; takes effect at next pre-snap. AI observes tendencies but cannot see hidden player selection. Every defensive position, **including corners**, may blitz. Blitzing creates coverage vacancies and matchup risk. Plays: inside/outside run, quick/screen/intermediate/deep pass, play action, trick; defenses man, zone, two-deep, run focus, blitz, prevent and custom packages. Timeouts, substitutions, audibles and halftime strategy changes.

## 7. Hybrid playbook editor
**LOCKED navigation:** HQ → Playbooks → Offense/Defense → list existing plays → inspect; Create Play shows locked level until unlocked. Preset plays from start. **PROPOSED unlocks:** level 3 expanded routes, level 5 custom offense, level 8 custom defense, level 12 advanced protection/blitz, level 15 ability combinations, level 20 advanced audibles. Thresholds not final.

**Offensive editor:** name, formation, all seven monster assignments, run/pass family, target priority, WR templates Go/Post/Slant/Corner/Curl/Drag/Out; adjust depth, angle, break point and timing with constrained draggable waypoints; RB handoff/block/route; OL protection; ability triggers and situational tags. Preview vs defensive look, practice, save/duplicate/rename/delete custom plays.

**Defensive editor:** shell and alignments, all seven assignments: rush, edge/interior/delayed blitz, fake blitz/drop, man, zone, QB spy, contain. All positions can blitz. Show exposed coverage gaps. Reject contradictory assignments and invalid formations. Audibles can change equipped plays, hot routes, targets, protection, coverage and rushers before snap while play clock runs.

**Deep pass baseline:** 20+ air yards, Go/Post/Corner/Play-Action Bomb/Hail Mary. Resolve protection → release/sack → separation → accuracy → interception/catch → yards after catch. Two-deep safety, coverage leverage and pressure counter vertical attacks. **PROPOSED formulas:** WR separation = .40 Speed + .35 Route Running + .25 Agility; DB coverage = .40 Coverage + .30 Speed + .30 Instinct; QB deep = .65 Deep Accuracy + .20 Intelligence + .15 Throw Power. Add scheme, depth, fatigue and abilities; bound probabilities; never simultaneously catch and intercept. Calibrate with seeded simulations.

## 8. Weekly calendar and acquisition
**LOCKED:** Monday choose scouting region; Tuesday recruitment minigame for scouted prospects; Wednesday choose team training focus (e.g., blitz or coverage) that boosts Sunday's relevant calls; Thursday scout opponent offense **or** defense for intel; Sunday league games. **LOCKED:** Friday select five offensive and five defensive plays in Head Coach Office; Saturday prepare lineup; Sunday game. One primary action per day; missing an action must have explicit consequence.

Recruitment minigames: Sprint timing, Reflex Catch, Strength meter, Focus pattern, Endurance rhythm. Chance depends on species, challenge performance, scout skill and difficulty. Failure means escape. Monsters enter franchise through scouting/recruitment, annual draft, free agency and trades; **no shop buying exact monsters or exact natures**. Draft prospects and realm prospects must have distinct league eligibility rules to avoid undermining the annual draft.

## 9. League, draft, trades, free agency
**LOCKED league:** 16 teams in four divisions: North, West (Aurora Conference), East, South (Titan Conference). Four teams per division. Regular season: ten weeks, nine games and one bye. Each team plays each of its three divisional rivals once at home and once away (six games); two teams in the partner division of its own conference (one home and one away); one opposite-conference opponent. In-conference opponents rotate with least-recently-faced priority and mixed pairs allowed. Out-of-conference opponents cycle through all eight before repeating. Season home/away totals alternate 5/4 and 4/5. Bye varies among Weeks 4–8. All fixtures must be reciprocal across the league.

**LOCKED postseason:** Eight qualifiers (two division winners plus two wild cards per conference). Week 11 conference semifinals: #1 division champion vs #2 wild card, #2 division champion vs #1 wild card, hosted by division winners. Week 12 conference finals hosted by highest remaining seed. Week 13 Beast Bowl between conference champions. Venue and tiebreaker details pending. Postseason simulation not yet implemented.

**LOCKED annual draft:** generate rookie individuals from species pool with randomized natures, archetypes, age, potential, skills and personality. Scouting reveals imperfect information. Draft lottery weighted toward weaker teams; draft picks are tradeable; show lottery odds and results. **PROPOSED:** two rounds, 8 picks per round; bottom four non-playoff teams in weighted lottery, remaining teams reverse standings. Odds to balance.

**LOCKED trades:** player offers and AI-initiated offers; monsters and draft picks; trade deadline; AI evaluates team need, age, rating, potential, contract and draft value. Enforce roster and cap limits, record transactions.

**LOCKED free agency:** expiring contracts create market; competing offers; accept/reject; cap restrictions. **PROPOSED salary cap:** contracts have annual salary, years, guarantees, release/extension rules; use fictional values, not NFL numbers. Offseason tasks: draft, sign/release, renegotiate, training camp, manage aging and retirement, develop facilities. Younger drafted individual of same species can replace retiring veteran but starts with new growth and nature.

## 10. Coach progression, art and accessibility
Coach XP unlocks playbook tools, scouting and coaching options. Monster XP and franchise facilities progress separately. Facilities (PROPOSED): training, scouting, medical, stadium. Consistent pixel sprites and portraits, 2D top-down field, idle/run/block/catch/tackle/ability animations, team colors, clear silhouettes. Settings: music/SFX volume, animation speed, text scale, reduced motion, high-contrast indicators, default coaching mode. Touch and mouse input.

## 11. JSON architecture
Authoritative definitions: `species.json`, `archetypes.json`, `natures.json`, `abilities.json`, `items.json`, `teams.json`, `formations.json`, `plays.json`, `rules.json`, `balance.json`, `unlocks.json`. Save file: `schemaVersion`, coach, team, monsters, contracts, schedule, league, inventory, playbooks, statistics, random seed. Feature review JSON: build ID, feature ID, implementation status, decision and notes. Validate JSON and migrate saves across versions.

```json
{
  "id":"monster_001","speciesId":"firestorm","age":21,"level":4,
  "archetypeId":"wr_speedster","natureId":"guardian","position":"WR",
  "stats":{"speed":94,"durability":66,"abilityPower":72,"catching":79,"ballSecurity":70},
  "abilityIds":["flame_burst"],"contract":{"salary":6,"yearsRemaining":2}
}
```

```json
{
  "id":"lightning_strike","side":"offense","formationId":"spread",
  "family":"deep_pass","unlockLevel":5,"primaryTarget":"WR1",
  "assignments":[{"slot":"WR1","action":"route","template":"post","depth":28,
    "waypoints":[{"x":0,"y":0},{"x":0,"y":14},{"x":8,"y":28}]}]
}
```

## 12. Implementation architecture
**HTML:** modules for navigation, state, JSON validation, roster, playbook editor, seeded football engine, opponent AI, event renderer, franchise calendar, draft, trade, contracts, save/migration, review. Local storage for convenience plus export/import JSON backups. GitHub Pages for hosting. Automated game-state tests and browser interaction smoke tests (including Safari). Disable unsupported controls with explanatory feedback.

**Unity:** port rules to pure C# services and models; UI Toolkit menus, sprite-based 2D field, JSON imports or ScriptableObject authoring, versioned JSON saves. Reuse schemas, balancing fixtures and seeded test cases; do not assume HTML/JS code directly runs in Unity.

## 13. Four prototypes and approval gates
**P1 — Football vertical slice:** Complete navigation, commissioner/coach/team onboarding, distinct starter rosters, clickable monster details, offense/defense playbook browsing and unlock messaging, 14-player field, accurate clock/down/score, full exhibitions, Full/Key Moments, usable settings, practice, JSON feature review. **Gate:** start a new franchise, reach final whistle, no dead buttons, save/reload and review works.

**P2 — Recruitment/development:** realms, Tuesday challenges, generated monster natures/archetypes, equipment, XP/evolution, coach unlocks, draft lottery and draft rounds. **Gate:** complete an offseason draft and a scouting recruitment; new individuals are unique and persistent.

**P3 — Franchise operations:** Monday–Sunday calendar, league schedule, opponent scouting, training boosts, AI rosters, contracts/cap, trades and trade deadline, free agency, aging and retirement. **Gate:** complete at least two seasons with valid rosters, budgets and transactions.

**P4 — Integrated game:** combine all systems, finish pixel-art polish, balancing, accessibility, AI, save migration and mobile responsiveness. **Gate:** full career from commissioner introduction through multiple seasons with no blocking errors.

**Review policy:** Each feature starts Planned → In Development → Ready for Testing. Only Ready features may receive ✓ Keep / ○ Rework / ✕ Remove, plus notes. Approved is not equivalent to coded. Export review JSON and preserve prior versions.

## 14. Outstanding decisions for playtesting
1. Draft lottery odds, draft rounds and roster eligibility for realm-caught prospects.
2. Salary cap scale, contract duration and free-agent bidding rules.
3. Evolution frequency and monster growth caps.
4. Exact playbook unlock levels and coaching XP pacing.
5. Match length, penalties, overtime and injury severity.
6. AI difficulty, balancing targets and long-term league economy.
7. Final original monster sprites, animation budgets and audio.

**Next production step:** Build P1 against this document; write feature acceptance tests before marking anything Ready for Testing. Do not request Keep/Rework/Remove feedback for placeholders.
## 15. Owner, scouting and monster systems (approved additions)
The player is the **franchise owner**, not head coach. Hire a Head Coach, Offensive Coordinator, Defensive Coordinator and Head Scout. Each has ratings, salary, preferred plays or regional specialties, philosophy and development potential. Staff/roster compatibility affects preparation and simulation; the player retains Full Coaching and Key Moments controls.

Monster types (locked): Fire, Water, Nature, Electric, Earth, Ice, Wind, Dark, Light, Metal, Psychic, Dragon. Types, natures, archetypes and rarity are independent.

Scouting regions (locked): Volcanic Fields, Coral Coast, Emerald Wilds, Frostpeak Range, Thunder Plains, Shadow Marsh, Iron Wastes, Celestial Highlands. Better region-specialist scouts discover more prospects and reveal more accurate stats, nature and potential. Tuesday recruitment uses Monday prospects; acquisition is not a shop.

Owner onboarding must advance on actual player actions. Gender selection filters portrait options immediately. Team selection shows previous record, division and conference.

Roster UI (locked): interactive position-based 7-on-7 depth chart with offensive rows OL / WR-QB-WR / RB and defensive rows DL / LB / DB. Tapping a position opens eligible monsters. Detail screen shows portrait area, effective stats, nature and ability; back returns to roster.

## 16. Season fixture generator (approved v2.2)
- Generate one league-wide reciprocal schedule per season. No independently randomized contradictory fixtures.
- Three unique divisional round-robin pairings repeated with venues reversed produce six games per team.
- Two in-conference inter-division matching rounds use least-recently-played offset selection; one home and one away. Mixed pairs are permitted if rotation priority allows.
- One interconference matching round cycles through eight unique opponents across eight seasons before repeating.
- The cross-conference hosting conference flips each season, ensuring every team alternates five-home/four-away and four-home/five-away seasons.
- One bye between Weeks 4–8. **Current HTML limitation:** league-wide simultaneous bye, rotating by season; staggered byes are future work.
- The postseason occupies Weeks 11–13 but is **not yet playable**.
- Preserve team, staff and roster across seasons; reset season record and generate new fixtures.
- Canonical league definitions: data/league.json. Canonical nature definitions: data/natures.json.
- Validate reciprocal matchups, exactly nine games and one bye per club, six division, two in-conference, one out-of-conference, and venue balance.

## 17. Prototype-to-Unity implementation register (October 11, 2026)
| Feature | HTML status | Unity parity requirement |
|---|---|---|
| Owner creation, gender-specific portraits, commissioner dialogue | In development | Preserve flow and verify interaction |
| Four mandatory staff hires and compatibility | Partial | Port staff models and gameplay effects |
| 12 monster types, 25 natures and profiles | Partial | Preserve nature modifiers and behavior |
| Position-based 7-on-7 roster | Partial | Preserve eligibility, assignment and persistence |
| Monday scouting and Tuesday recruitment | Partial | Scout information quality and recruitment outcomes |
| Thursday opponent scouting, Friday ten-play game plan | Partial | Preserve weekly choices and effects |
| Football match, animation, opposing AI | Early prototype | Needs full football rules and realistic movement |
| 16-team reciprocal rotating schedule | Implemented in HTML, logic validated | Port exact schedule algorithm and test vectors |
| Eight-team postseason and Beast Bowl | Planned | Implement seeding and playoff matches |
| Annual draft, trades, contracts, free agency | Planned | Complete before feature parity claim |

**Mandatory change control:** Every approved change must update the actual HTML prototype, applicable JSON definitions, this master GDD, and implementation status. Mark untested work In Development. Earlier v2.0 proposals are superseded where they conflict with later locked decisions.

## 18. Three-tier football pyramid — locked v2.3

**Locked league identities:** Tier III Challenger League (initial team OVR <=70), Tier II Vanguard League (initial team OVR 71–82), Tier I Sovereign League (initial team OVR >=83). Each tier contains 16 teams organized as two conferences (Aurora and Titan), each with two four-team divisions (North/West and East/South). Full pyramid: 48 teams. The four initial struggling franchise choices all begin in Challenger, one from each division. The commissioner must explain the tier, championships and relegation before selection.

**Locked promotion:** Earn four Challenger championships to unlock a challenge for entry into Vanguard; earn six Vanguard championships to unlock a challenge for Sovereign. Championship badges are permanent historical achievements. Promotion is not automatic upon reaching the title threshold. AI franchises may also qualify. Specific challenge rules are not yet approved.

**Locked relegation:** In Vanguard or Sovereign, two consecutive bottom-four **overall league** finishes (out of 16, not bottom of division) trigger relegation eligibility. Challenger has no relegation. All AI teams and the player are subject to this rule. Relegation consequences are reduced revenue, contract pressure, morale impact and possible roster departures, **never automatic permanent monster-stat reductions**.

**League Central:** From Headquarters, browse Challenger, Vanguard and Sovereign; inspect divisions, teams, records, standings, championships and relegation risk. Records must be based on actual league simulations, not invented. While league AI is not implemented, show 0–0 placeholders and explicitly mark them unplayed. Other-tier franchise names in HTML are provisional placeholders, not final canon.

**Important distinction:** OVR bands are approved starting classifications, but whether they remain hard restrictions after roster development or promotion is unresolved. No arbitrary cap or nerf is to be applied until the policy is decided.

**Essential unresolved decisions:**
1. How many teams exchange places between adjacent tiers per offseason, and how promotion challenges pair winners with relegation candidates while maintaining 16 teams per tier.
2. Promotion challenge format (one match or series, home/away/neutral venue, attempts per year) and whether qualifying badges are consumed.
3. Whether the initial OVR bands remain enforced after team development, relegation or promotion.
4. How AI teams earn and attempt promotion, including championship accumulation and relegation replacement.
5. Bottom-four tie-breakers and whether postseason outcomes affect the relegation standings.
6. How finances, salary caps, player departures and morale scale on relegation.
7. Whether a relegated franchise retains badges and must earn new championships to challenge promotion again (historical badges remain permanent regardless).

**Implementation boundary:** v2.3 HTML includes League Central browsing, tier rules and badge-progress fields. It does NOT yet include simulated 48-team standings, promotion challenges, relegation transactions, or dynamic league membership. These are explicitly in development, not approved for final feature review. Canonical tier rules are in data/league.json.

## 19. Promotion and relegation final rules — v2.4

**LOCKED one-slot exchange:** Each adjacent tier pair (Challenger/Vanguard and Vanguard/Sovereign) can exchange **at most one franchise per offseason**. One eligible lower-tier challenger faces one eligible higher-tier relegation candidate in a **single winner-take-all match**. A challenger victory atomically swaps the clubs' tiers; a loss leaves both unchanged. A swap cannot occur without both eligible clubs. Each adjacent boundary may independently conduct one exchange per offseason.

**LOCKED promotion:** Four qualifying Challenger championships unlock a challenge to Vanguard; six qualifying Vanguard championships unlock a challenge to Sovereign. Championships remain permanently recorded in historical badge totals and are not consumed by a challenge. Store historical championships separately from active qualification. Following relegation, the franchise keeps its history but must earn four or six **new championships** in the new tier to qualify again. A failed challenge does not automatically erase qualification; retry timing is pending.

**LOCKED OVR bands:** The <=70 Challenger, 71–82 Vanguard, and >=83 Sovereign bands are **initial placement classifications only**, never permanent stat caps. Relegation can affect finances, contracts, morale and retention, but cannot permanently lower monster attributes.

**LOCKED relegation eligibility:** Two consecutive bottom-four finishes in the **overall 16-team regular-season standings** create relegation eligibility for Vanguard or Sovereign. Finishing outside the bottom four resets the streak. Challenger has no relegation. A relegation candidate moves only after a successful paired challenger under the one-slot rule.

**Required franchise save fields:** tier, championshipBadges (historical), activeQualification (titles earned since last tier entry or relegation), bottomFourStreak, and tierTransactionHistory. An eventual exchange must update both team memberships and standings atomically.

**Still unresolved:** priority if multiple teams qualify for one slot; overall standings tie-breakers; challenge venue/overtime and retry limits; AI championship accumulation and promotion qualification; numerical financial and contract consequences; handling missing eligible opponents.

**Prototype status:** v2.4 displays these rules in League Central and implements eligibility/exchange evaluation functions. It does not yet simulate championship tournaments, promotion matches, 48-team standings, or actual tier swaps. These features remain In Development, not Ready for Testing.

## 20. Season visibility and franchise history — v2.5

**LOCKED:** The League Schedule screen must display only the current season and previously completed seasons. Future season fixtures must never be revealed in the player-facing interface. The deterministic fixture generator may internally compute future seasons for league consistency and testing, but this is not exposed until the owner starts that season.

**LOCKED history:** When a season ends, archive its season number, team identity, tier, final W/L record, weekly opponents, home/away designation, bye, game results, postseason result (when implemented), earned championships, and eventually monster/player statistics, franchise milestones, and transactions. Historical records are read-only, persist across subsequent seasons, and are selectable from the League Schedule screen.

**Prototype v2.5:** Archive creation is triggered on explicit Next Season. Current season and archived seasons are selectable; future seasons are hidden. Completed archives store available team records, fixtures and match results. The prototype currently does **not** calculate player season statistics or playoff results; those fields are labeled unavailable rather than fabricated. Archives from seasons completed before this feature was implemented cannot be reconstructed reliably from old saves. Keep the archived season snapshot independent of the newly generated current season schedule.

**Unity parity:** Use versioned save schema with a seasonHistory array. Store immutable snapshots for completed seasons and migrate old saves without inventing missing match statistics. Test current-season-only visibility, archived results after reload, multiple consecutive season transitions and cross-tier historical continuity.

## 21. Franchise rival general manager system — v2.6

**LOCKED:** Following initial team selection, the commissioner introduces another newly appointed GM from the player's division. The player selects one of the other three division franchises as a persistent rival. The rival has a distinct GM name and team identity; the same division pairing meets twice per regular season (once home and once away). Both games must be visibly labeled RIVAL GAME in the schedule. The selection is part of action-driven onboarding, prior to staff hiring.

**LOCKED per-tier rivalry:** The owner has a separate rival in Challenger, Vanguard, and Sovereign. The Challenger rival is not automatically the Vanguard or Sovereign rival. When the player reaches a new tier, introduce a new rival from that tier and the owner's division. Retain historical rival identity and head-to-head history through promotion/relegation and subsequent seasons. Do not delete prior rivalries.

**Data model:** franchise.rivals keyed by tier; each rival stores tier, team, GM name, introduced season and eventual head-to-head wins/losses. Season archives store the rival active that year. Schedule fixture rendering highlights the current rival without changing the league-wide reciprocal schedule.

**HTML v2.6 status:** Added sixth commissioner introduction step to choose a Challenger rival; saves rival information, labels rival schedule games, stores rivalry in season archives, and shows current tier rival in League Central. Existing saves receive a default same-division rival without overwriting chosen rivals. A distinct higher-tier rival record is initialized upon entering another tier, but **the tier transition and cinematic introduction are not yet playable**. GM names and higher-tier franchise names are provisional. Rival dialogue events, actual head-to-head statistics and rival AI development are planned, not implemented.

**Unity parity:** Reproduce the rival introduction and selection, same-division eligibility, schedule highlighting, per-tier identity, archive persistence and future rivalry-specific match events. Do not claim head-to-head tracking until games update it.

## 22. Automatic rival GM assignment — v2.7 revision

**LOCKED revision:** The player does NOT choose a rival. After the player selects a franchise, randomly assign exactly one of the other three franchises in that same division as their Challenger League rival. The commissioner introduces the randomly assigned rival GM and team in a reveal scene; no reroll control is provided. The rival is generated once and saved so returning to the introduction or reloading does not change it. Selecting a different starting team before confirmation invalidates the previous assignment and generates a new eligible rival.

When entering Vanguard or Sovereign, independently assign a random rival from the owner's division in that tier; never reuse the Challenger rival as the automatic higher-tier rival. Retain each tier's prior rival identity and history. Mark two divisional games per season as rivalry games, once home and once away. Existing saves keep their already-assigned rival; do not overwrite.

**Prototype:** v2.7 replaces radio choices with an automatic rival reveal, uses random assignment for missing tier rival records, and preserves the previous schedule and archive features. Higher-tier entry cutscenes and rival AI development are still pending.

## 23. Visual practice, playbook, staff and weekly match UX — v2.8

**LOCKED:** Coaching Staff displays hired staff, philosophy, preferred-play field diagrams and scout region ratings. Remove the post-hiring "Compare all coaching candidates" expansion; comparison is relevant only during hiring.

**LOCKED official franchise game access:** The weekly scheduled franchise game is entered on Sunday through the weekly calendar. Do not place a misleading always-active Exhibition Game button in Franchise Headquarters. Weekday football experimentation belongs in Practice. No weekday button may start or reset the official game. A separate exhibition mode, if reintroduced, must be clearly distinct and cannot alter franchise results.

**LOCKED visual practice:** Practice must display a football field with seven offensive and seven defensive monsters, formation positions, route/rush motion and a visible moving football. Results such as 12-yard gains must be animated on-field, not reported only as text. v2.8 uses a 2.3-second SVG motion demonstration, with routes, defenders and ball moving and outcome text displayed at the end. This is an interim visualization, not final pixel-art animation, physics or complete match AI.

**LOCKED visual playbooks:** Both offensive and defensive playbooks display actual field diagrams for each unlocked play. Diagrams show formation, routes, coverage zones or blitz lanes, not names alone. The future hybrid editor must reuse shared JSON play definitions and support offensive routes, defensive assignments, monster positioning, audible variations and preview.

**LOCKED standings legibility:** The player's franchise is visibly distinguished in League Central with bold italic styling, a contrasting background and "YOUR TEAM" label.

**Prototype status:** v2.8 removes coach comparison and HQ Exhibition Game shortcut, restricts direct match navigation to Sunday, animates practice plays, renders offensive/defensive play diagrams, and highlights the owner's franchise in League Central. Full live-match animation, accurate individual routes and tactical defensive AI are not complete. Source-of-truth UI requirements: data/ui-gameplay.json.

## 24. Defensive coverage visualization and practice ball ownership — v2.9

**LOCKED visual alignment:** The practice play result must match visible football action. A completed pass shows the ball traveling from QB to a receiver and finishing attached to the receiving monster. A run ends with the ball at the ball carrier. An incompletion or stopped play must not depict an unrelated receiver holding the ball. Field displacement should approximately reflect announced yards; precise physics and tackles remain future work.

**LOCKED defensive play diagrams:** Defense dropdown selection must immediately redraw alignment and assignments, before a rep starts. Man coverage uses yellow assignment lines between defenders and receivers and tracking motion; zone uses translucent blue ellipses showing each defender's coverage area; blitz/pressure uses orange arrows and forward rusher movement. Defensive playbook diagrams use the same man/zone/blitz visual vocabulary as the practice field. Future JSON-defined plays will specify individual assignments rather than relying on a name-based classifier.

**HTML v2.9:** Shared scheme classification; distinct man, zone and blitz diagrams; defense selector redraws practice field; on-snap defensive tracking/rushing; pass and run ball ownership interpolated to the relevant player; outcome shown at animation end. This is an SVG schematic prototype, not full physics or finalized pixel-art football gameplay. Man matchups and coverage areas are simplified.

**Unity parity:** Reproduce coverage indicators and ball-carrier ownership, then replace prototype interpolation with formation, pursuit, coverage and collision systems. Validate switching defensive looks changes visible assignments; test run handoff, completed pass and incomplete pass separately. Canonical UI specification: data/ui-gameplay.json.

## 25. Shared football formations and Cover Two correction — v3.0

**LOCKED:** All 7-on-7 practice and playbook diagrams use the same canonical formation data and position labels rather than numbers. Offense consists of OL1, OL2, OL3 on the line of scrimmage; QB behind the line (under center or shotgun); WR1 and WR2 wide; RB behind the QB. The QB must never line up even with the offensive linemen. Defense consists of DL1, DL2, LB1, LB2, DB1, DB2, DB3. The attacking offense advances toward the defense.

**LOCKED Cover Two:** Exactly two defensive linemen rush the passer, and exactly five other defenders own five visible zone responsibilities: DB1 and DB3 deep/outer zones, LB1 and LB2 underneath middle zones, and DB2 the remaining central zone. No defender is responsible for multiple independently drawn zones. Draw rush arrows for DL1/DL2. Cover Two remains a schematic 7-on-7 adaptation rather than literal NFL 11-on-11 assignments.

**LOCKED offensive visualization:** Show receiver route paths with directional arrows and OL blocking directions on the practice field before snapping. Position abbreviations identify the ball carrier, QB, receivers, linemen and defenders. Practice animation should follow those concepts; the playbook preview uses the same formations, labels and route/coverage vocabulary.

**Prototype v3.0:** Shared practiceOffense/practiceDefense coordinate definitions, offenseOverlay and defenseOverlay functions drive both practice and playbook SVG. Zone display reduced from seven to five; two DL rush arrows; QB positioned behind OL; players labeled by football position. The motion engine remains schematic and does not yet simulate individual collisions or full tactical football. These rules are authoritative for Unity parity; canonical UI JSON is data/ui-gameplay.json.
