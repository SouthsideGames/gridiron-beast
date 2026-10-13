> **Current prototype: HTML v4.0, 11-on-11.** Current approved financial rules and implementation are documented in Section 35. Earlier historical 7-on-7 statements are superseded; see the implementation register for remaining football engine limitations.

> **Implementation update:** HTML v3.5 now has a 40-monster 11v11 roster model, two fixed starter selections, five staff hires, 22-position practice and match drawings, simplified XP/injuries, temporary training and kicking/punting. The match engine and playbook are still provisional; the migration is **PARTIAL**, not feature-complete. Older sections describing a hold were written before explicit implementation authorization and are superseded by Section 30.

> **CURRENT FOOTBALL FORMAT: 11-on-11 (LOCKED, October 11, 2026).** The existing HTML prototype is still 7-on-7 v3.0 and has NOT been converted. Earlier 7-on-7 formations, rosters and play definitions in this historical document are superseded by Section 26. See [migration audit](FOOTBALL_11V11_MIGRATION_AUDIT.md) and [implementation status](IMPLEMENTATION_STATUS.md).

# GRIDIRON BEAST — MASTER GAME DESIGN DOCUMENT v4.8
Southside Games | October 11, 2026 | HTML prototypes → Unity mobile beta

**Decision key:** LOCKED = approved; PROPOSED = initial design awaiting playtest; FUTURE = deferred. This is a design specification, not an implementation claim.

## 1. Vision
Pixel-art 11-on-11 American-football monster franchise RPG. Create a franchise owner, hire a coaching staff, rebuild a struggling team, scout and draft unique monster athletes, develop their stats, build offensive/defensive plays, coach games, and manage a dynasty. Strategic decisions and individual monster identity matter. No monster-purchase shop.

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

## 24. Defensive coverage visualization and practice ball ownership — v3.0

**LOCKED visual alignment:** The practice play result must match visible football action. A completed pass shows the ball traveling from QB to a receiver and finishing attached to the receiving monster. A run ends with the ball at the ball carrier. An incompletion or stopped play must not depict an unrelated receiver holding the ball. Field displacement should approximately reflect announced yards; precise physics and tackles remain future work.

**LOCKED defensive play diagrams:** Defense dropdown selection must immediately redraw alignment and assignments, before a rep starts. Man coverage uses yellow assignment lines between defenders and receivers and tracking motion; zone uses translucent blue ellipses showing each defender's coverage area; blitz/pressure uses orange arrows and forward rusher movement. Defensive playbook diagrams use the same man/zone/blitz visual vocabulary as the practice field. Future JSON-defined plays will specify individual assignments rather than relying on a name-based classifier.

**HTML v3.0:** Shared scheme classification; distinct man, zone and blitz diagrams; defense selector redraws practice field; on-snap defensive tracking/rushing; pass and run ball ownership interpolated to the relevant player; outcome shown at animation end. This is an SVG schematic prototype, not full physics or finalized pixel-art football gameplay. Man matchups and coverage areas are simplified.

**Unity parity:** Reproduce coverage indicators and ball-carrier ownership, then replace prototype interpolation with formation, pursuit, coverage and collision systems. Validate switching defensive looks changes visible assignments; test run handoff, completed pass and incomplete pass separately. Canonical UI specification: data/ui-gameplay.json.

## 25. Shared football formations and Cover Two correction — v3.0

**LOCKED:** All 7-on-7 practice and playbook diagrams use the same canonical formation data and position labels rather than numbers. Offense consists of OL1, OL2, OL3 on the line of scrimmage; QB behind the line (under center or shotgun); WR1 and WR2 wide; RB behind the QB. The QB must never line up even with the offensive linemen. Defense consists of DL1, DL2, LB1, LB2, DB1, DB2, DB3. The attacking offense advances toward the defense.

**LOCKED Cover Two:** Exactly two defensive linemen rush the passer, and exactly five other defenders own five visible zone responsibilities: DB1 and DB3 deep/outer zones, LB1 and LB2 underneath middle zones, and DB2 the remaining central zone. No defender is responsible for multiple independently drawn zones. Draw rush arrows for DL1/DL2. Cover Two remains a schematic 7-on-7 adaptation rather than literal NFL 11-on-11 assignments.

**LOCKED offensive visualization:** Show receiver route paths with directional arrows and OL blocking directions on the practice field before snapping. Position abbreviations identify the ball carrier, QB, receivers, linemen and defenders. Practice animation should follow those concepts; the playbook preview uses the same formations, labels and route/coverage vocabulary.

**Prototype v3.0:** Shared practiceOffense/practiceDefense coordinate definitions, offenseOverlay and defenseOverlay functions drive both practice and playbook SVG. Zone display reduced from seven to five; two DL rush arrows; QB positioned behind OL; players labeled by football position. The motion engine remains schematic and does not yet simulate individual collisions or full tactical football. These rules are authoritative for Unity parity; canonical UI JSON is data/ui-gameplay.json.

## 25. Corrected 7-on-7 tactical alignment — v3.0
**Locked:** Offense is OL1/OL2/OL3 on the line, QB behind the center (under center or shotgun), WR1/WR2 wide, RB behind the line. Position abbreviations replace numeric markers on the field and in play diagrams. Offensive routes and blocking assignments appear in yellow and blue respectively, alongside defensive responsibilities.
**Locked Cover Two for 7-on-7:** DL1 and DL2 rush the quarterback; exactly five other defenders (LB1, LB2, DB1, DB2, DB3) each own one zone. No single safety owns three independent zones. Man and blitz diagrams must remain coherent with the same seven-player positional structure.
**Prototype:** v3.0 uses shared offensive/defensive positional definitions, five coverage zones, labeled markers and visible offensive routes in Practice and playbook previews. Schematics are not final player AI, physics, or pixel-art rendering. Canonical JSON: data/ui-gameplay.json.

## 26. LOCKED 11-on-11 football migration — GDD v3.1

**Production lock:** All future Gridiron Beast football gameplay uses eleven offensive and eleven defensive players per snap. No further new 7v7 football features should be built. Earlier 7v7 design locks are superseded only for football-specific systems. The HTML v3.0 football renderer and 14-monster starter roster are legacy implementation, not approved 11v11 output.

**Base offensive personnel:** QB, LT, LG, C, RG, RT, RB, TE, WR1, WR2, WR3. WR3 may be represented by a flexible lineup slot, but FLEX is not a separate football position. Five linemen, QB behind center/shotgun, seven legal on-line players, eligible receiver rules. Future 12/21 personnel and additional formations through substitutions.

**Base defensive personnel:** DE1, DT1, DT2, DE2, LB1, LB2, LB3, CB1, CB2, FS, SS (4-3). 3-4, nickel and dime packages are future packages. All positions retain the ability to blitz, with corresponding coverage/gap responsibility changes.

**Plays and editor:** The ten offensive and ten defensive legacy play names are provisional concepts, NOT certified 11v11 plays. Every play requires a JSON formation, personnel, all eleven assignments, legal positioning, distinct routes or rush/coverage instructions, visualization and gameplay counterplay. The hybrid route editor, unlocks and audibles remain approved, but must use the new 11v11 schema. No generic name-based play templates may be considered finished plays.

**Football engine:** Match and practice must animate 22 actors and the football, with meaningful pass protection, blocking, rushing, route running, coverage, ball control, tackles, turnovers, downs, scoring, game clock and live 40-second play clock. Existing randomized Sunday yardage results are temporary legacy behavior and must be replaced.

**Roster and saves:** Existing 14 starter monsters must not be silently expanded into 22 owned monsters. Preserve every monster's species, nature, progression and eligibility. Map old positions to legal new roles and provide an explicit roster-completion flow. Version saves and preserve legacy snapshots. Active roster size and two-way eligibility are pending.

**Preserved franchise systems (no redesign authorized):** Commissioner/owner creation, staff hiring, monster types and natures, scouting/recruitment, daily weekly actions, coach styles, league and conference structure, rotating 10-week schedule, season archives, three-tier leagues, championship badges, promotion challenges, relegation, and tier-specific rival GMs. UI changes needed to support 11v11 must not discard or reset these systems.

**Migration phases:** M0 audit/schema (complete); M1 roster/personnel; M2 JSON plays/formations; M3 visual practice; M4 full match and AI; M5 franchise regression and save migration. Each phase has explicit acceptance criteria in `data/football-11v11-migration.json` and `docs/FOOTBALL_11V11_MIGRATION_AUDIT.md`.

**Implementation status:** GDD decision and migration documents complete. Actual 11v11 HTML, starter roster, play definitions, match engine and save migration are NOT IMPLEMENTED. Keep v3.0 HTML as the testable legacy prototype until phased replacement passes acceptance testing.

## 27. Fixed starter monsters and Monster Trainer — approved design v3.2 (NOT IMPLEMENTED)

**Implementation gate:** The owner explicitly requested design locking and planning only. No HTML, onboarding code, gameplay, save data or runtime behavior may be modified for these additions until the owner explicitly says **proceed**. Current playable HTML remains legacy 7v7 v3.0.

**Commissioner onboarding sequence (LOCKED):** Create franchise owner → select one of four struggling Challenger franchises → reveal automatically assigned same-division rival GM → select **one of three fixed offensive starter monsters** → select **one of three fixed defensive starter monsters** → hire Head Coach, Offensive Coordinator, Defensive Coordinator, Head Scout and **Monster Trainer** → interactive tutorial → Franchise Headquarters. Both selections occur before staff hiring so the player can hire coaches to complement their monsters.

**Starter choices (LOCKED):** The same three offensive candidates and the same three defensive candidates are offered in each new franchise. Player chooses exactly one from each group. Each chosen starter begins at **67–70 OVR** and must be the **strictly highest-rated monster on its side of the ball** at initial roster reveal. The other offensive starters must be lower OVR than the selected offensive monster; the same applies independently to defense. Candidate profiles must display pixel-art sprite, position/archetype, elemental type, nature, base/effective stats, ability and coach-scheme fit. The fixed candidates' species, exact stats, nature rolls and defensive position mix remain to be designed. These two initial gifts are a **one-time onboarding exception** to the rule that future monster acquisition occurs through franchise recruitment/drafting, not a shop.

**Trainer staffing (LOCKED):** Five mandatory hires total: HC, OC, DC, Head Scout, Monster Trainer. The trainer has hireable candidates, quality, philosophy/specialty and cost. Quality and specialization influence **temporary training bonuses for the current game week only**, not permanent stat growth, XP multipliers or level-up stat increases. Normal leveling and nature-based permanent growth continue under existing rules; the trainer does not accelerate them.

**Weekly timing (LOCKED):** Tuesday remains recruitment. Wednesday remains team training, directed by the selected trainer and the player's training focus. Weekly bonuses expire after the relevant Sunday game/week. Trainer bonuses should be visible in effective game-week stats and match calculations, and must not overwrite permanent monster attributes.

**Acceptance tests to design before implementation:** (1) Fixed candidate pools persist across new franchises; (2) only one offensive and one defensive candidate can be chosen; (3) chosen starter OVR is 67–70 and strictly higher than other initial starters on that side; (4) staff hiring cannot begin before both choices; (5) fifth staff slot is Trainer; (6) Tuesday recruitment and Wednesday training remain distinct; (7) trainer bonus affects the week's game, expires afterward, and never changes permanent stats; (8) legacy saves are not erased.

**Open decisions:** exact six starter monsters and defensive position mix; whether fixed species have fixed or randomized natures/attributes; how to populate remaining legal 11v11 positions and preserve old saves; roster/bench size and two-way/special-teams policy; trainer specialties/candidates and temporary bonus formula, caps and stacking; which training focuses affect which monsters and plays. These must be resolved before coding relevant systems.

**Migration sequencing:** Extend M1 to include starter selection, five-staff onboarding, 22-player lineup validation and safe old-save handling. M3 practice must visualize temporary Wednesday training bonuses. M4 match engine must consume bonuses and clear them at the correct boundary. M5 regression must verify all preserved franchise systems. Canonical requirements: `data/football-11v11-migration.json`.

## 28. Roster cap, fatigue, injuries, special teams and permanent growth — approved design v3.3

**IMPLEMENTATION HOLD:** These decisions are approved design specifications only. Do not modify the playable HTML, runtime saves or simulation until the owner explicitly instructs us to proceed. The HTML remains legacy 7v7 v3.0.

**LOCKED 40-monster franchise roster cap:** Each franchise may roster at most 40 monsters, including 11 offensive starters, 11 defensive starters, reserves and special-teams specialists. Exact position distribution, game-day active limits, two-way eligibility, injured reserve and replacement rules remain to be defined. The previously discussed 40-slot positional breakdown is illustrative, not a mandatory positional quota.

**LOCKED balanced injury frequency:** Football contact, fatigue, durability and injury history should influence injuries, with a balanced frequency that creates meaningful substitutions without routinely destroying seasons. Every monster detail profile must display current fatigue and injury status; headquarters will have a Medical Report showing unavailable monsters, severity, recovery and recommended replacements. Fatigue accumulates through snaps, contact and exertion; recovery occurs through rest, reduced workload and bye weeks. Higher fatigue increases injury risk and temporarily reduces effective performance. Exact formulas, severity distribution and recovery durations are pending balance testing. Injuries do not delete permanent levels, nature, XP or base stats.

**LOCKED simplified special teams for initial 11v11 gameplay:** Include field-goal and punt decisions and outcomes; kickoff, return and other special-teams sequences may be simulated initially. Extra-point/PAT resolution must still be handled by the scoring engine even if it is not fully animated. Dedicated K and P eligibility and depth-chart assignments must be modeled within the 40-monster cap. Full animated kickoffs, returns and coverage are deferred.

**LOCKED permanent progression source:** Monsters gain permanent attributes **only through game-earned XP and level-up progression**. Monster Trainer quality and Wednesday training must NEVER add permanent stat gains, XP multipliers or accelerated leveling. Nature-based growth modifiers remain part of the normal level-up formula, not trainer bonuses.

**LOCKED weekly training:** Tuesday remains monster recruitment. Wednesday is the only weekly team-training decision. The fifth mandatory hire, Monster Trainer, affects the strength and specialization of **temporary game-week performance bonuses** only. Buffs affect effective game calculations, not permanent OVR, and expire after that game/week. Buff magnitude, stacking, affected stats/plays and caps are not yet locked.

**Implementation acceptance:** A legal 40-monster roster supports 22 simultaneous on-field assignments plus backups/specialists; injured/unavailable monsters cannot be illegally selected; fatigue appears on profiles and changes effective performance; injury incidence follows tested balanced probabilities; K/P choices work; XP and leveling are the only permanent stat-growth pathway; trainer bonuses expire without modifying saved base stats; legacy franchise and monster saves remain intact.

**Remaining decisions:** final positional allocation; initial roster-fill and old-save conversion; injured-reserve policy; two-way play; fatigue/injury formulas and injury lengths; simplified special-teams scope (particularly PAT and kickoff outcomes); game XP for low-snap and special-teams monsters. Source of truth: `data/football-11v11-migration.json` schema v3.

## 29. Injured reserve, secondary positions, recovery and XP — approved v3.4

**IMPLEMENTATION HOLD:** Design only. The owner has not authorized gameplay conversion. HTML remains legacy 7v7 v3.0; do not change runtime code, game saves or football systems before an explicit instruction to proceed.

**LOCKED injured reserve:** All injured monsters continue to occupy one of the franchise's 40 roster slots. No separate injured-reserve capacity or automatic replacement monsters. When a monster cannot play, the owner must use an existing eligible roster member. The Medical Report and depth chart must flag injury unavailability and prevent illegal selections.

**LOCKED secondary positions:** Each monster has a primary position and may have compatible secondary positions, with a temporary effective-performance penalty when assigned outside its primary role. Eligibility must follow a position-compatibility matrix; unrelated positions are not automatically allowed. Full offense/defense two-way eligibility is not approved. Exact compatibility and penalty values are pending.

**LOCKED short injury recovery:** Minor injuries require 0–1 weeks, moderate 2–3 weeks, severe 4–6 weeks. Balanced injury frequency remains approved. Fatigue and durability affect risk; recovery cannot erase earned levels, XP, permanent base stats or natures. Injury severity, exact probability formulas, bye-week recovery and whether a 0-week injury allows return later in the same game require balance rules.

**LOCKED game XP:** A monster earns participation XP for actually taking part in a game, plus bonuses for meaningful football contributions such as receptions, touchdowns, blocking, sacks, tackles and interceptions. XP leads to leveling and is the only source of permanent monster-stat growth. Trainer quality and Wednesday training never add permanent growth or XP multipliers; trainer effects are temporary weekly gameplay buffs. Exact XP weights, per-game caps, special-teams XP and unused-bench eligibility are pending.

**Required implementation tests:** Injured players still count toward 40; unavailable players cannot start; secondary-position effective ratings apply a reversible penalty; injury recovery windows match severity; XP requires participation and performance bonuses; level-up gains persist, trainer buffs expire; existing 7v7 saves remain intact until migrated.

**Blocking design questions:** exact 40-slot roster distribution; six fixed starter candidates and initial roster completion; secondary-position eligibility matrix/penalty; injury incidence and fatigue formulas; game XP rates and low-snap handling; special-teams XP and PAT/field-goal mechanics; safe migration of existing monster and franchise saves.

## 30. Authorized 11-on-11 HTML conversion — prototype v3.5

**Implementation authorized:** The owner explicitly said "Implement." Previous hold instructions in Sections 26–29 no longer apply to implementing approved features, but remain useful design history.

**Implemented first-pass features:** (1) two fixed three-monster starter selection screens after the rival reveal and before hiring; (2) offensive and defensive chosen monsters at 67–70 OVR, above all initial teammates on their respective side; (3) 40-monster roster model comprising 22 starting slots and 18 reserves including K/P; (4) eleven-player offensive and defensive depth chart, eligible position selection; (5) fifth mandatory hire Monster Trainer; (6) 22 positional player shapes in practice and match diagrams; (7) temporary Wednesday trainer performance bonus; (8) basic game XP/leveling, fatigue and balanced injury rolls with short recovery; (9) simplified field goal and punt actions.

**Still incomplete:** Real 22-actor collision-based simulation, legal formation and eligible receiver validation, 11-assignment playbook integration, defensive coverage AI, animation fidelity, passing/tackling outcomes, fully functional special teams, full medical/injury management, per-monster snap participation tracking, XP for individual performance, league-wide match simulation, full 7v7 save migration and polished pixel-art sprites. Current match still uses simplified stochastic yardage, and 11v11 play JSON is **provisional**, not certified gameplay. Do not claim complete NFL-style rules or production readiness.

**Source files:** `data/football-roster-11v11.json` defines the roster/initial choices, `data/football-plays-11v11.json` defines provisional 11-assignment play concepts, and `data/football-11v11-migration.json` retains migration acceptance criteria. The HTML remains a development prototype.

**Next gates:** Validate new-franchise onboarding and five hires end-to-end in Safari; integrate play JSON and 22-player assignment-driven animations; build actual defensive AI and possession/clock rules; test injury/fatigue and save migration without loss of franchise records; update the GDD and implementation register for every subsequent change.

## 31. Practice truth, coaching roles, zoomable play previews and starter scouting — HTML v3.6

**Practice field truth (partial fix):** The prototype now uses a shared line-of-scrimmage reference at SVG x=185 and 5 field units per yard. For a completed run or pass, the carrier/receiver's final x-coordinate is x=185+5×awarded yards; the football follows that monster and the field shows a distance indicator. Stopped/incomplete plays display no gain. This removes the specific contradiction where a 12-yard gain was announced despite the ball carrier remaining behind the line. The underlying gain is still sampled from a probability model before animation, **not determined by physical contact**; defensive pursuit, blocking, tackles, and real match play simulation remain incomplete.

**Staff responsibilities:** Head Coach governs leadership, overall game management, morale, fatigue management and situational decision making, not an offensive play catalog. Offensive Coordinator supplies offensive playbooks; Defensive Coordinator supplies defensive schemes; Monster Trainer supplies temporary Wednesday boosts; Head Scout specializes in regional recruitment. Current HC general bonus is a prototype stand-in, not a complete leadership engine.

**Play previews:** Offensive coordinator cards show offense-only diagrams without defenders; defensive coordinator diagrams show both sides. Play cards are tappable to open an enlarged modal. The same modal provides starter-monster details before selection, including ability descriptions, nature, example stats and injury susceptibility. Injury susceptibility is higher when more injury-prone and contributes to the preliminary injury-risk formula.

**Further acceptance work:** Validate all modal buttons and scrolling on iOS Safari, test 0/short/deep gain geometry and ball possession frame-by-frame, eliminate contradictions in the Sunday match engine, and replace stochastic practice gains with genuine collision/assignment-based outcomes. Full playable pixel-art animations remain unimplemented.

## 32. Simulation-first 11v11 engine vertical slice — HTML v3.7

**Implementation:** A standalone deterministic engine (`engine.js`) now advances 22 actor positions in discrete steps, animates pass flight and handoffs, models simplified pass protection, pursuit and proximity tackles, and derives yards from the final ball spot. Practice and the owner's Sunday snaps both replay stored engine frames. This replaces the previous practice pre-rolled gain and home-Sunday randomized yardage logic. It is a **prototype vertical slice**, not a finished physics engine.

**Non-negotiable acceptance rule:** The displayed gain, down-and-distance update, and final visible football position must agree. All game outcomes must eventually come from simulation events, with player stats, fatigue, natures, abilities and coaching schemes affecting actual movement and decisions.

**Known gaps:** Simulation geometry is simplified; the opponent still uses probabilistic drives; JSON play assignments are not yet driving unique actor behaviors; monster ratings are not yet fully integrated; game-day field scrolling and clock logic need QA; interceptions, fumbles, realistic tackles and special teams remain incomplete. Headless test of 300 simulated plays found no runtime exceptions or spot/yardage contradictions, but poor balance and insufficient outcome variety. Safari end-to-end validation is pending.

**Design inspiration:** Mobile football references such as Retro Bowl demonstrate legible routes and moving ball carriers, while franchise sims such as Pocket GM show how roster and staff decisions can drive match outcomes. Gridiron Beast remains a manager-led game, not a requirement for manual QB controls.

### v3.7 engine tuning addendum
Seeded movement variation and starting-monster overall ratings now affect player movement. Pass targets favor WR/TE routes; throw dispersion produces some incompletions. A 300-play headless test produced 15 incompletions and consistent field spots for every result, with average gains of 2.68 yards (Power Run), 13.74 (Quick Pass) and 14.97 (Deep Pass). These numbers are prototype diagnostics, **not balanced final football statistics**. Defenders still force tackles too reliably; interceptions, fumbles, scheme-specific individual assignments and the opponent's use of this engine remain pending.

## 33. Quarterback reads, practice controls and coordinator play packages — HTML v3.8

**Quarterback awareness:** QB receiver selection now scores eligible targets by separation from defenders and downfield progress. Higher awareness increases the probability of choosing the highest-scored open receiver; lower awareness creates more imperfect reads. This is a prototype heuristic, not full route-progression AI. QB effective OVR currently proxies awareness; a dedicated awareness attribute and nature adjustments are future work.

**Practice focus:** Player may set QB target to automatic, WR1, WR2, WR3, TE or RB. Target override only applies to passing plays; rushing plays disable the control. The QB attempts the specified target even when defended, enabling comparison of possible play outcomes. Practice results still depend on actual simulated catch, ball flight and tackle checks.

**Practice display:** Show/hide schematic play lines, mirror the play left-to-right across the field's horizontal centerline (flip), and overlay the actual roster's monster type/selected-starter icons on the position markers. These icons are interim stand-ins for final monster sprites; the current prototype does not yet render individual animated monster artwork. The player positions are sourced from the selected 40-monster franchise roster.

**Game-day flip:** Sunday match screen now exposes a Flip Play checkbox. The same simulation renderer mirrors the formation without changing ball spot, scoring or play outcome. Flipped tactical assignments will need full play-schema support in a later milestone.

**Coordinator packages:** Each of the three offensive and three defensive coordinator candidates now brings a ten-play package reflecting Air Raid, Ground Attack, Balanced, Pressure, Zone or Man philosophies. Practice catalogs use the currently hired coordinators' packages, with defaults if staff are not yet hired. The Sunday offensive selector uses the hired coordinator's package unless a five-play Friday game plan overrides it. Package names are stored in `data/football-plays-11v11.json`. Some named plays still share simplified run/short/deep simulation behaviors and lack unique validated 11-player assignments.

**Acceptance and remaining gaps:** Test QB awareness at multiple ratings with consistent seeds, verify forced target selection for all five eligible roles, ensure run plays disable pass targeting, verify flip consistency and correct overlay visibility, confirm hired coordinator packages appear in practice and matches, and implement unique play-specific routes and authentic monster sprites. No claim of fully distinct simulation behavior for all twenty coordinator plays is made.

## 34. Practice toggle defect correction and Unity implementation parity contract — v3.9

**Observed defect and root cause:** In v3.8, changing Show Play Lines or Flip Play did not re-render the practice SVG. The practice entry screen also drew a separate legacy schematic, while simulated playback used a different renderer. This created stale visuals and made the toggles appear broken.

**Implemented v3.9 correction:** Practice entry now uses the same deterministic `GridironEngine` frame renderer as playback. Toggle changes (lines, flip, monster icon visibility, target) invoke immediate practice re-render. The latest completed simulation is retained for visual replay when toggles change. Changing the offensive/defensive play invalidates that replay and creates a new preview. The actual outcome is not recalculated by toggling presentation settings. Show Lines hides/shows route and defensive assignment overlays; Flip Play mirrors player/ball/assignment coordinates across the field's horizontal axis with upright player labels. Practice uses roster-linked monster type icons; actual animated sprite art is still pending. Game-day Flip Play uses the same mirrored rendering option.

**Unity/Claude parity is a product requirement, not a suggestion:** The HTML prototype is the acceptance reference for all approved and implemented systems, but any known bugs are to be fixed, not faithfully reproduced. The C# port must preserve (1) owner onboarding and rivalry; (2) starter selection and 40-monster rosters; (3) five staff roles, coordinator packages and Wednesday temporary training; (4) 11v11 formations and playable match rules; (5) simulation-first physics, receiver reads and player attributes; (6) practice target/flip/line/icon controls; (7) scouting, recruiting, natures, abilities, injury/fatigue, XP and levels; (8) ten-week scheduling, conferences, playoffs and three-tier promotion/relegation; (9) save persistence, historic records and UI navigation. Source-of-truth JSON schemas and deterministic simulation fixtures must accompany the port.

**Mandatory acceptance process:** Before handoff, produce a versioned feature inventory, C# parity mapping for each feature, JSON schema version and sample data, UI screen/transition matrix, football rule/assignment tests, deterministic seeded replay fixtures with expected frames and ball spots, persistence/migration tests, and an explicit known-issues register. Each implemented feature must be demonstrably working in HTML before being marked Unity-ready. The goal is a port with minimal redesign or exploratory playtesting, not a claim that Unity can be accepted without testing.

**Still unverified:** iOS Safari end-to-end interactions, every coordinator play's distinct assignment and outcome, full 22-monster sprite animation, opponent simulation parity and long-term season regression. These must not be represented as complete.

## 35. Lightweight salary cap and roster payroll — approved v4.0

**Design intent:** Meaningful franchise ownership decisions without accounting micromanagement. Currency is credits. Each franchise has a simple **annual salary cap** covering the salaries of all rostered monsters (including injured players) and all five hired staff members. No payroll tax, daily expenses, financial spreadsheets, or mandatory contract renegotiation in the initial prototype.

| League | Annual cap |
| --- | ---: |
| Challenger League (Tier III) | 2,500,000 credits |
| Vanguard League (Tier II) | 3,700,000 credits |
| Sovereign League (Tier I) | 5,200,000 credits |

**Initial roster safety:** The player starts with 40 monsters and a roster payroll below Challenger's cap, leaving enough room to hire all five staff members. The current generated monster salary formula is 18,000 + 280 × initial OVR, with a 3,000 cornerstone premium. Salaries are assigned once on generation and persisted as individual monster properties; XP/leveling does not automatically renegotiate salaries. Staff salaries come from the existing staff candidate data. In an isolated sample using a high-priced five-person staff, the 40-monster roster cost 1,356,280 and staff cost 755,000, totaling 2,111,280 credits, leaving 388,720 under the Challenger cap. All nine cornerstone combinations and all staff combinations should be covered by release acceptance tests.

**UI:** Show current league, annual cap, monster payroll, staff payroll, committed total, and available/over-cap amount at franchise headquarters, staff hiring, roster, and salary management. Coach cards display projected cap room after hiring; hires that exceed the cap are blocked. The roster-management screen lists every monster's salary and permits releasing a monster with explicit irreversible confirmation.

**Game lock:** If total payroll exceeds the current league's cap, block entry into Sunday games and block match actions until the owner reduces payroll. Released monsters free their annual salary immediately and are not automatically replaced or returned via a shop. A minimum 22-monster roster guard prevents releasing below 22, but actual positional lineup validation remains to be completed. The 40-monster cap remains in force. Promotion or relegation changes the applicable cap immediately, so a relegated franchise may need to release players before its next game. Existing saves without explicit monster salaries use the same formula as a fallback; no automatic deletion or reset.

**Source-of-truth files:** `data/salary-caps.json` defines canonical tier caps and salary rules; `data/league.json` mirrors the tier limits for league configuration; `index.html` contains the playable prototype calculations and UI. Unity/C# must read the JSON policy and reproduce the same results, salary persistence, hire validation, roster-release action and game locks.

**Not yet implemented:** multi-year contracts, negotiation, free agency cap exceptions, AI salary management, salary inflation, trade payroll validation, and realistic market valuation. These are deliberately outside the lightweight v4.0 scope.

**Acceptance tests:** Starting franchise remains under cap after all five hires; each tier shows the correct cap; projected staff hires cannot exceed budget; an imported or relegated over-cap save cannot start a match; releasing a rostered monster reduces committed payroll; salaries survive save/reload; no released monster reappears automatically; monster leveling does not alter the agreed annual salary; existing franchise history remains intact.

## 36. Team identity and original tactical play library — v4.1

**Approved direction:** Head Coach defines the enduring offensive and defensive philosophy of the franchise; the OC and DC implement the philosophy with their own scheme-specific playbooks; the GM recruits monsters whose archetypes, attributes, natures and abilities complement those schemes. A mismatch anywhere in the chain reduces tactical effectiveness but must not make games unwinnable. Team identity persists as a recognizable trait across seasons and evolves primarily with Head Coach turnover, not random weekly playbook changes. AI teams should receive distinct, partially overlapping playbooks. Future expansion can draw on thousands of football concepts but only fully specified and validated original plays should enter the playable catalog.

**Initial identities:** Marcus Flint = physical/run-first + aggressive/blitz; Avery Vale = balanced/flexible + multiple/adaptive; Jordan Reyes = pass-dominant/tempo + coverage/speed. OCs: Swift pass, Brock power run, Park balanced. DCs: Stone pressure, Frost coverage, Fox man. Alignment currently scores 100 exact, 80 when balanced, and 45–68 for conflicting styles; it affects effective movement ratings in the first simulation implementation. Roster archetype synergy, AI team identity, season continuity and full tactical modifiers are pending.

**Defensive play-art correction:** Four formerly near-identical previews (Cloud Flats, QB Spy, Zone Trap, Deep Zone) now have separate original SVG assignment diagrams. Cover Two, Cover Three, Cover Four, man and pressure concepts have separate coverage/rush representations. All are 11v11 schematic approximations, not copied Madden assets or certified Madden assignments. These previews are still generated from named play logic rather than a single unified per-play JSON assignment source. **Must fix:** make the same structured per-player assignments drive diagrams, defensive AI and the future Unity renderer.

**Reference research:** Madden School organizes plays by team playbook, formation, personnel, coverage, blitz, run and passing concept. Use it to research real football tactics; do not bulk-copy proprietary diagrams, protected play-art assets or website content. A large external catalog is a future reference library, not 7,000 implemented game plays.

**Unity port requirement:** Every implemented play needs unique ID, side, personnel, formation, per-position alignment, 11 assignments, zone shapes or man targets, rush lanes, motion/route paths, compatible coaching styles, mirrored variant and deterministic seeded replay test. Every AI franchise needs an identity profile and stable playbook package. Play art and simulation must never silently diverge.

## 37. Unified 54-play original tactical library — v4.2

**User acceptance issue:** The previous Outside Run play art looked like passing routes, and multiple named defensive plays shared nearly identical drawings. This was a schema problem, not merely a styling problem.

**Reference reviewed:** Madden School plays database, including Gun Bunch Str Offset Inside Zone and Outside Zone concepts and team playbook formations. It is a tactical reference, **not a license to copy 7,000 proprietary Madden diagrams or import Madden's original images**. All new Gridiron Beast graphics and assignment coordinates are independently authored.

**Implementation:** A canonical `data/play-library.json` contains **54 unique plays** (30 offense, 24 defense). Each play defines its side, formation label, concept and eleven positional assignments with routes, blocking lanes, handoff/carry paths, coverage zones, man targets or rush lanes. `play-library.js` mirrors those definitions in a browser-loadable runtime, draws the SVG previews, and supplies assignment data to `engine.js`. The prototype's hiring previews, Playbook and Practice overlays now use the new diagrams. Each OC/DC offers a 15-play identity-based package. The old `data/football-plays-11v11.json` coordinator packages now reference the new canonical library.

**Run-play integrity:** Outside Run directs RB to an outside lane with WR/TE run blocking and OL lateral assignments; Inside Zone attacks interior gaps; Counter uses pulling guard; HB Stretch uses the opposite edge; Draw and Read Option have different QB assignments. Receivers must not display vertical passing routes on run plays.

**Defensive integrity:** QB Spy has a designated quarterback tracker; Cloud Flats protects the short sidelines; Zone Trap moves cornerbacks into underneath lanes; Cover Two/Three/Four, Deep Zone, pressure and man schemes differ in assignment data. The same assignments feed diagram rendering and first-pass defender movement.

**Validation completed:** All 54 plays have 11 positional assignments, 54 distinct diagram SVG strings, and 54/54 smoke simulations completed without JavaScript exceptions. Syntax of the main HTML script validated. This is NOT a completed physics engine or mobile-browser acceptance test. Coverage decisions, route timing, legal formations, blocking quality, interceptions, stamina, roster-attribute integration and football realism still require testing and refinement.

**Unity/C# contract:** Treat `data/play-library.json` as the canonical play definition and serialize it into Unity data classes. Rebuild a single assignment evaluator for play previews and gameplay. Do not maintain a separate hand-drawn visual catalog that can diverge from the simulation. Port play definitions and tests before building additional teams or generating thousands of variations.

## 38. Expanded 100-play library and salary visibility — HTML v4.3

**Catalog:** Expanded from 54 to **100** original 11v11 play definitions (58 offensive, 42 defensive), stored in `data/play-library.json` and mirrored in `play-library.js`. All 100 definitions have exactly 11 positional assignments and produce distinct SVG diagram output. New concepts include toss, trap, wham, sweep, option, play-action variants, smash, levels, spacing, drive, screens, additional Cover 0/2/3/4/6 variants, blitzes, simulated pressure, prevent and goal-line defenses. These are prototype approximations, not licensed Madden art or football-coach-certified implementations.

**Execution:** The same runtime assignment data is read by play previews and the first-pass simulation for running lanes, routes, rushers and coverage. The 100-play catalog is a league-wide source of concepts; coordinators continue to bring smaller 15-play identity packages. More play definitions do not automatically imply every team can call all 100 plays. Some variations share formation families and underlying simplified movement logic; unique preview output alone does not establish unique realistic gameplay.

**Salary & Roster Management:** Show a prominently labeled **TOTAL ANNUAL SALARY** equal to all monster contracts plus all five staff salaries, along with cap usage percentage, progress bar, annual cap, and available/over-cap amount. Salary management shows the full summary immediately above the monster release controls. Salary cap enforcement remains unchanged.

**Tests:** 100/100 headless simulation smoke tests completed without exceptions; 100/100 distinct diagram outputs and 11 assignments per play; main inline JavaScript syntax validated. Not yet tested on physical mobile Safari. More work needed on gameplay balancing, route realism, formation variety, special teams, AI play calling and automated end-to-end franchise progression.

## 39. Interactive defensive snaps, ball-carrier continuation and event history — HTML v4.4

**Problem discovered during playtesting:** The old match loop automatically resolved away-team drives immediately after the player's touchdown, often returning possession to the player without any visible defense. Receiver and running-back motion also stopped prematurely and failed to model yards after catch, tackle breaks or stiff arms. Important events were insufficiently communicated, and no accessible match history existed.

**Current implementation:** Sunday match now alternates offensive and defensive possessions. On defense the owner selects a defensive coordinator play, sees the opposing offense run a simulation against the selected defense, and remains on defense until a scoring play, turnover, or turnover on downs. The defensive view renders the player's defenders blue and the opposing offense red. Automatic opponent drive resolution is no longer called after every player touchdown, punt or field goal. Key Moments can select an available play automatically but still resolves one visible snap at a time.

**Continuation:** After a completed pass or running handoff, the carrier continues advancing until tackled, a simulated fumble, reaching the end zone, or the current simulation time budget ends. Defender proximity triggers tackle attempts; stronger offensive ratings increase the chance of breaking a tackle or stiff-arming a defender. Interceptions are possible on contested throws. Fumbles can occur during extended carries. Ball position and yardage derive from the final simulated ball coordinates; touchdowns are awarded only when accumulated drive yardage reaches the end zone.

**Communication:** Major touchdowns, interceptions, fumbles, and turnovers display visible notifications. The in-game Play Log records play descriptions with quarter and clock, survives save/load as part of the game object, and pauses gameplay while open. Closing the log resumes the match. Special teams outcomes and delay penalties also enter the log. Logging is bounded to 350 entries to avoid unlimited storage growth.

**Simplifications:** Seven points are awarded on touchdowns as an implicit successful extra point; actual kick/try, kickoffs, penalties, field position and complete possession rules still require implementation. The match simulator does not yet use full opponent rosters, fatigue, AI coaching style or all individual defensive monster attributes. Carry and tackle outcomes are heuristic, not physics-grade football. A match should not be declared production-ready without mobile Safari tests, possession regression, scoring and field-position tests, and deterministic event replay.

**Unity parity:** Port the event-driven possession state, simulated tackle/ball carrier continuation, defense play selection, log persistence, pause state and notifications, preserving save compatibility and correct color ownership. Replace remaining shortcuts with validated rules before handoff.

## 40. Match presentation, pregame sequence, key moments and stadium identity — HTML v4.5

**Field branding:** Each of the 16 currently defined franchises has a stable mascot icon. The *actual scheduled home team* owns the midfield logo and end-zone text, including when the player's franchise is the visitor. Home team names are split between end zones (e.g., EMERALD CITY / BEASTS for a future Emerald City Beasts franchise; existing South club is Ember City Beasts). The current field uses original SVG mascot icons and wordmarks; final brand artwork and logos are future assets. Stadium presentation must work in both possession directions and be independent of which team the player controls.

**Practice toggles:** Separate Show Offensive Play Lines and Show Defensive Play Lines, alongside existing Flip Play and Show Monster Portraits. Either toggle immediately re-renders the same practice simulation frame; neither changes the actual play outcome. Both controls default to on.

**Key Moments:** Full Coaching animates one user-called snap at a time. Key Moments now advances multiple simulated snaps automatically, stops at a major event, third/fourth down, red-zone opportunity, quarter boundary or end of match, and records the skipped play events in the log. The button label changes to Simulate to Key Moment. The current threshold and cap (16 plays per activation) are provisional balance rules, not a completed Madden-like broadcast simulation.

**Post-play acknowledgement:** After an animated snap or key-moment sequence, the game shows the outcome and requires Tap to Continue before the next snap. The last animated field frame remains visible while awaiting acknowledgement, and the play clock is frozen. The Play Log remains available and continues to pause the game. This prevents the play from visually disappearing before the user can evaluate it.

**Pregame:** Sunday game entry now opens a matchup screen, displaying the player's 11 offensive and 11 defensive starters with icon, position, name and OVR, versus an opponent panel with 11 offensive and 11 defensive *estimated placeholders*. The opponent roster is not yet generated as persistent, real franchise data, and the opponent record is explicitly marked unavailable rather than fabricated. Continue opens a randomized coin toss. The winner may receive, kick, or defer; the loser chooses initial field direction. For simplicity, the prototype allows the player to choose direction when the AI wins. Choice of kickoff and second-half possession are stored in the game state. Q1 and Q3 use the opening orientation; Q2 and Q4 reverse it. The teams also attack opposite directions on each possession. At halftime, the second-half receiving side is assigned according to the opening choice/defer logic.

**Remaining NFL-rules gaps:** True defer and side-selection priority in every edge case, overtime, physical kickoff/punt return animations, changing ends at quarter boundaries while maintaining exact ball spot, weather/wind vector, scoring tries, actual AI team rosters and records, legal formation/clock enforcement, and automated regression tests. Current field directions are visual; wind and directional gameplay modifiers are not implemented. Treat this milestone as presentation and flow improvement, not complete NFL simulation.

**Unity port contract:** Preserve pregame transitions, franchise field art keyed to home-team ID, coin toss and second-half kickoff state, independently toggled practice overlays, automatic key-moment simulation with event logging, paused post-play review, and alternating quarter directions. Create actual AI franchise roster data before final parity signoff.

## 41. Field fidelity, render order, boundaries and directional continuity — HTML v4.6

**Playtest defects:** (1) offensive routes and monster markers could leave the visible SVG viewport; (2) route/assignment strokes sometimes rendered above monsters; (3) field lacked appropriate sideline yard numbers, hash marks and goalposts; (4) the last frame of a play could reverse horizontal orientation relative to its start, because the final render used `quarterDirection` while live frames used `driveDirection`.

**Corrections:** Clamp simulated monster positions to the field and use an SVG clip path to keep moving markers and route art inside the 600×260 practice view. Render offensive/defensive assignment lines behind player markers; render monster icons as the topmost visual layer. In match frames, all players and the ball are in the foreground above stadium graphics. The static and animated stadium share an original top-down field renderer, with mowing bands, ten-yard stripes, five-yard lines, hash marks, white goal lines, numbered yards on both sidelines, top-down goalposts, home-team midfield mascot and split end-zone wordmarks. For scheduled away games, stadium identity belongs to the opponent, not the player. Every animation frame and its retained final frame use the same `driveDirection`, so the field does not flip when a play finishes.

**Implementation and validation:** `index.html` and `engine.js` updated, HTML version 4.6. Main JavaScript syntax and standalone engine renderer tested, including clipped foreground markers, stadium SVG and same-direction live/final render call sites. Browser rendering and mobile Safari playtesting are still required. Goalposts are a simplified top-down SVG representation; not a 3D goalpost or special-teams targeting system. Preserve this layering and field geometry in the Unity renderer.

## 42. Sunday match entry, restart restriction, tutorial suspension — HTML v4.7

**Entry bug:** The Weekly Franchise Schedule Sunday action was calling `reset();show('match')`, bypassing the pregame matchup and coin toss. The Sunday action now calls `openPregame()` when no match has begun, or resumes the existing match if `introComplete` is true. Direct match-screen navigation follows the same entry rule. A started game must not be reset simply by revisiting Sunday's action.

**Restart restriction:** Removed the Restart Game button and its action handler. No in-progress match restart is permitted. Full franchise reset remains in Settings as an explicitly confirmed destructive operation.

**Tutorial:** Owner Orientation and its persistent global banner are temporarily hidden, with progress handlers disabled. The feature is deferred pending a separate action-gated tutorial redesign. Retain the planned tutorial specification in the GDD, but do not display incomplete prompts in Settings, schedules, practice or other screens. Previously stored tutorial progress may remain in save data for future migration.

**QA:** Inline JavaScript syntax checked, restart button/handler removed, and the Sunday direct-match bypass removed. Browser end-to-end navigation and mobile Safari tests remain outstanding.

## 43. Franchise navigation and practice field parity — HTML v4.8

**Navigation:** Every normal Franchise Mode subsidiary screen uses the shared bottom navigation to return to Headquarters rather than Main Menu. Monster profile and lineup selection return to Roster; franchise HQ returns to Main Menu. The Monster Types and Practice Field screens additionally provide an explicit Back to Headquarters button inside their panels. Main menu, commissioner introduction, pregame and coin-toss flow retain their own contextual navigation.

**Practice field parity:** Practice renders the same upgraded original SVG stadium field as the live match, including ten-yard and five-yard lines, sideline yard numerals, hash marks, goal lines, goalposts, alternating grass and midfield branding. Practice end zones use PRACTICE and FIELD instead of a team name. The simulation renderer continues to show the offense and defense over the stadium artwork, with tactical routes behind monster markers.

**Bounds:** All play preview polylines are constrained to the 600×260 pitch, and zone ellipses are positioned so their full radii fit inside the pitch. Runtime simulation monster markers remain clamped and clipped. The current approach clips out-of-range routes for visibility; route geometry and play spacing should later be authored inside legal bounds rather than relying on clamps. This matters for Unity parity and for accurate route running.

**QA:** HTML and play-library JavaScript syntax checked and all 100 plays still load. Full mobile Safari interaction and end-to-end practice regression remain unverified.
