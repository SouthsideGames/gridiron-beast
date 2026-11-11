# P9: verified simultaneous-effect limits

Scope: every football ability that creates a field rectangle or a physical/projectile object, the Nature–Earth and other overlap-derived objects, and Beast Clash persistent effect objects. Sources: `docs/beast-dex/data/abilities.json` (v18 rows) as overridden by `docs/beast-dex/data/task8-overrides.json` and `SPECIFICATION_BASELINE.md` §20 (the only override that touches a counted ability is Beacon Lane's lifetime, P3). Positions are the Dex positions (`families.json`), not the older runtime species positions (see §7, A10).

Lifetimes and cooldowns are taken at the mastery that maximises the count (longest lifetime, shortest cooldown). A limit below is an upper bound under the rules. Where a contract can be read two ways, both numbers are given: **firm** (the natural reading) and **conservative** (the reading that allows more effects). The diagnostic cap should use the conservative number.

---

## 1. Roster, formation and lineup facts used

| Fact | Value | Citation |
|---|---|---|
| Football team size | 7 v 7; 11v11 not authorised | `SPECIFICATION_BASELINE.md:15`; `src/data/personnel.js:1` |
| Every play has exactly 7 on the field per side | checked for all 187 offensive and 179 defensive plays (my tally: all `onField.length === 7`) | `src/data/playbook.js:456` (validator), `:329-337` (onField built from package) |
| Offense on field | QB + LG + RG + 4 package skill slots | `src/data/personnel.js:32-36` |
| Offensive packages | Pro: RB WR1 WR2 TE · Spread: RB WR1 WR2 WR3 · Tight: C RB TE WR1 | `src/data/personnel.js:18-22` |
| Max per position on the field (offense) | QB 1, RB 1, WR 3 (Spread only), TE 1 (not in Spread), OL 3 (Tight only, else 2) | derived from the lines above; same maxima from tallying every play |
| Defensive packages | Base DL1 DL2 LB1 LB2 CB1 CB2 FS · Nickel DL1 DL2 LB1 CB1 CB2 FS SS · Heavy DL1 DL2 DL3 LB1 LB2 CB1 CB2 · Pressure DL1 DL2 DL3 LB1 CB1 CB2 FS | `src/data/personnel.js:25-30` |
| Max per position on the field (defense) | DL 3 (Heavy/Pressure), LB 2 (Base/Heavy), CB 2 (always), S 2 (Nickel only). K never on a scrimmage play | same |
| Depth-chart slots | 19: QB RB WR1 WR2 WR3 TE LG C RG / DL1 DL2 DL3 LB1 LB2 CB1 CB2 FS SS / K | `src/data/personnel.js:4-9`; `src/franchise/roster.js:15` (GROUP_SLOTS) |
| One monster per slot | chart builder keeps a `used` set | `src/franchise/roster.js:33-39` |
| One position per monster (no cross-slot) | a monster fills only its own group's slots | `src/data/personnel.js:55-62` |
| In-game substitution | none in the current engine: the chart is fixed for the game; only package rotation moves WR3/C/DL3/SS/LB2/FS/TE/WR2 on and off | `src/sim/game-runner.js:36-110` (no substitution step); `src/sim/engine.js:137-138` (actors from `onField` only) |
| Roster size | max 38, min 26; AI clubs carry 38 | `src/data/monsters.js:381-382`, `:317-319` |
| Duplicate non-legendary families | allowed. Fresh rosters avoid repeats except a gym club's home element ("Aquip II"); draft classes draw species at random and the owner's pick checks only roster size | `src/data/monsters.js:324-337`; `src/franchise/draft.js:27-40`, `:132-140` |
| Legendary limit | at most 1 offensive + 1 defensive legendary per club, across every acquisition route | `src/franchise/fa-legendary.js:3-12`, `:39-49` |
| Legendary uniqueness | "Each exists once in the league" | `src/data/species.js:13`; `src/franchise/legendary.js:18` |
| Kickoffs | now live 7 v 7 plays; punts, FG and XP stay formula-resolved | `SPECIFICATION_BASELINE.md:596`; `task8-overrides.json:58`; `docs/task8/DECISION_PACKET_FINAL.md:367`; today's formula: `src/sim/special-teams.js:42` |
| Kickoff unit composition | **not defined anywhere** (no slot list for coverage or return units) | see A7 |
| Clash lineup sizes | encounter 3, pregame 3, overtime 3, playoff overtime 5 | `src/franchise/clash-link.js:11` |
| Clash engine bound | 1–5 per side | `src/clash/values.js:30`; `src/clash/engine.js:40` |
| Clash active fighters | exactly one active per side; the rest are reserves | `SPECIFICATION_BASELINE.md:15` |
| Clash duplicates | the auto lineup takes roster entries without deduplicating species, so duplicate non-legendaries can enter; legendaries are capped by the club rules above | `src/clash/ai.js:54-63`; `src/franchise/clash-link.js:46-50` |
| Clash Lab (test tool only) | any species, up to 5 per side, no dedupe, so legendary duplicates are possible there | `src/ui/screens/clash-lab.js:199` |
| Clash turn structure | one normal turn per side per exchange; voluntary rotation "after both normal turns and before delayed impacts, at most once per side every four exchanges. The entrant acts next exchange." | `SPECIFICATION_BASELINE.md:601`; `task8-overrides.json:57` |

---

## 2. Football sources: every field and object creator

Abbreviations: **Bench?** = can the field appear while the creator is off the field. **Clock** = which plays count the lifetime. Fields are stationary unless stated. "Clears halftime" means nonlegendary halftime clearing.

### 2a. Field rectangles (19 abilities)

| id | Name | Pos | Creates per creation | Lifetime (Dex) | Re-creation (Dex) | Bench? / possession / halftime | Per-source max alive |
|---|---|---|---|---|---|---|---|
| FIR-02-F | Impact Pyre | LB | 1 (6×4 Fire) | "1/2/3/4 completed plays by mastery, counting SPAWN play as first" | "Three qualifying tackle/assist/sack plays needed again. Spawn play cannot earn charge" | needs a participating defensive snap; clears halftime | **1**: the next spawn needs at least 3 more participating defensive plays plus the spawn snap (≥4 plays later), and the old field is gone after 4 |
| FIR-06-F | Eruption — Burning Wake | TE (L) | 1 (5×5 up to field-width×5 Fire) | "TWO completed plays INCLUDING SPAWN play as play1" | "Once per offensive possession … at most ONE pending activation" | placement uses "Pyroclast INITIAL pre-play position"; participation not stated (A3); legendary: survives halftime "without refresh"; token survives possessions | **2**: F1 spawns on possession N+1 play 1 (token earned in N), F2 earned the same play and spawned on play 2; a third needs another possession, by which time F1 has expired |
| WAT-01-F | Splashdown | CB | 1 (6×4 Water) | "Creation play excluded; lasts TWO subsequent completed football plays regardless possession/creator participation" | "Three subsequent defensive plays: trigger play 1, unavailable 2–4, ready 5" | created live at the deflection spot; persists regardless of the creator; clears halftime | **1**: the next possible creation is ≥4 plays later, and the old one is gone after 2 |
| WAT-06-F | Tsunami Line | S (L) | 1 (full width × 5 Water) | "TWO completed plays including FIRST OFFENSIVE SPAWN PLAY as play1"; "Preserve remaining duration over halftime" | "FIVE subsequent defensive plays; interception activation play excluded" | **yes**: spawns on the creator team's offensive snap, when the S is not on the field | firm **1**; conservative **2** (if only own offensive plays count, F1 waits with 1 play left through the opponent's possession, then a new INT after the 5-play cooldown adds F2; A2) |
| NAT-01-F | Bloom Break | WR | **2** (6×4 Nature, non-overlapping) | "ONE completed play INCLUDING spawn play" | "Cooldown 5/4/3/2 subsequent OFFENSIVE plays … Spawn play cannot earn new activation" | participation at spawn not stated (A3); pending waits through possessions and halftime | **2** (only on the spawn play) |
| NAT-05-F | Bramble Trap | TE | 1 (8×6 Nature) | "ONE completed play including spawn play" | "THREE subsequent offensive plays cooldown starts spawn; no re-earn on spawn play" | spawned zone clears whistle/halftime | **1** |
| ELE-02-F | Charge Strip | RB | 1 (8×5 Electric) | "One completed play INCLUDING spawn" | "Cooldown 5/4/3/2 … Cannot earn another token during the spawn play" | "Next participating offensive scrimmage pre-play" (participation required) | **1** |
| ELE-04-F | Static Field | S | 1 (12×7 Electric) | "One completed play INCLUDING spawn" | "Cooldown 5/4/3/2 subsequent defensive plays" | "ready participating defensive scrimmage play" | **1** |
| ICE-01-F | Frostmark | K | 1 (8×6 Ice) | "1/2/3/4 completed opposing offensive scrimmage plays INCLUDING spawn" | "No additional cooldown … Each made field goal may earn max ONE pending field" | **yes**: "even while kicker benched"; the clock counts only opposing offensive plays (paused otherwise); clears halftime | **4**: four made FGs in one half with ≤1 opposing scrimmage play between them leaves fields at 4/4, 3/4, 2/4 and 1/4 alive |
| ICE-04-F | Permafrost | DL | 1 (10×6 Ice) | "TWO completed defensive scrimmage plays INCLUDING creation" | "Cooldown 5/4/3/2 subsequent defensive plays starts CREATION. Cannot earn again during creation play" | participating snap; pending survives possessions/halftime; field clears halftime | **1** |
| WIN-01-F | Runway | WR | 1 (6×10 Wind) | "1/1/2/2 participating offensive scrimmage plays" | "Cooldown 6/5/4/3 subsequent participating offensive plays, starts creation" | "next participating offensive scrimmage snap"; clears halftime | **1** (both clocks are the same, and 2 < 3+1) |
| WIN-04-F | Crosswind Rescue | S | **2** (paired 4×7 Wind lanes) | "1/2/2/3 completed defensive scrimmage plays … INCLUDING creation" | "If own previous lanes remain, hold full bar until they expire. At most1 own created pair" | "while source able"; clears halftime | **2** (one pair) |
| DAR-01-F | Shadow Patch | CB | 1 (6×6 Dark) | "1/1/2/2 defensive scrimmage plays including spawn" | "Cooldown 5 defensive plays fixed after creation; cannot bank during cooldown" | clears halftime | **1** |
| DAR-05-F | Blackout Pocket | QB | 1 (12×5 Dark) | "1/2/2/3 offensive scrimmage plays including spawn" | "Cooldown 6 subsequent offensive plays after creation; one pending" | clears halftime | **1** (3 < 6+1) |
| LIG-01-F | Beacon Lane | WR | 1 (8×6 Light) | override P3: "1/1/2/2 participating offensive scrimmage plays by mastery, counting its creation play" | "Creator cooldown 6/5/4/3 offensive plays; starts creation" | placement on ball, participation not stated (A3); clears halftime | **1** |
| MET-03-F | Gear Grid | K | 1 (10×6 Metal) | "Life 1/2/2/3 defensive scrimmage plays including spawn" | "No extra cooldown; one pending token and max one own field" | **yes** (kicker not on a scrimmage play) | **1** (explicit cap) |
| MET-05-F | Bulwark Grid | TE | 1 (8×4 Metal) | "Life 1/1/2/2 offensive scrimmage plays including spawn" | "Cooldown 6/5/4/3 offensive plays after creation. Max one pending" | clears halftime | firm **1** (cooldown blocks creation for 3 plays; life 2). The old figure of 2 assumed a token earned on the creation play could spawn during cooldown (A4). That changes nothing in the totals because the TE slot's max is 2 from Pyroclast anyway |
| PSY-01-F | Mind Bend | S | 1 (8×6 Psychic) | "1/1/2/2 defensive scrimmage plays … including creation" | "Cooldown 6/5/4/3 subsequent participating defensive scrimmage plays … Cannot bank during cooldown" | clears halftime | **1** |
| PSY-04-F | Echo Landing | K | 1 (6×8 Psychic) | "Life 1/2/2/3 defensive scrimmage plays … Kickoff consumes no life" | "Six subsequent team defensive scrimmage plays cooldown after creation, counting while kicker benched. Maximum one pending field" | **yes**: "Source bench does not prevent creation"; clears halftime | **1** (the old figure was 3, which confused lifetime with count: 3 < 6+1) |

No Earth field exists: none of the six Earth football abilities (EAR-01…06) is a Zone.

Not rectangles, but spatial: the moving auras FIR-05 Heat Haze (CB), WAT-05 Breakwater (TE), ICE-05 Cold Snap (OL), WIN-05 Tailwind Huddle (QB), DAR-02 Night Watch (S), LIG-03 Guiding Halo (QB), MET-02 Iron Lungs (LB), DRA-02 Dragon Call (TE pulse). They exist only on holders who are on the field. That gives at most 5 per side: offense QB 1 + TE 1 + 3 OL (Tight package) = 5; defense 5 in Base or Nickel. So **≤10 auras per play**. Prism Break (LIG-04-F) only removes fields.

### 2b. Physical, projectile and actor objects (football)

| id | Name | Pos | Object(s) per activation | Lifetime | Re-creation | Kickoff? | Max per play |
|---|---|---|---|---|---|---|---|
| ELE-06-F | Stormguard | QB (L, off.) | 2 real blockers (collision) | "disappear at whistle" | "Fixed FIVE subsequent offensive plays cooldown" | no (passing play) | 2 |
| EAR-05-F | Stone Screen | TE | 1 moving, then stationary wall | "FIVE additional forward yards … or whistle … no next-play obstacle" | cooldown 5/4/3/2 | no ("No … returns") | 1 |
| EAR-06-F | Landslide | OL (L, off.) | 1 advancing wall (momentary) | "advances through approved push distance and immediately crumbles" | "Once per offensive possession"; "Special teams … excluded" | no | 1 |
| WIN-06-F | Cyclonic Release | WR (L, off.) | 1 tornado emitter (no collision) + ≤3 wind-blast projectiles | "Emitter ends at3 blasts or whistle … live objects clean at whistle" | 3 receptions refill | ambiguous (A6) | 1 + 3 |
| PSY-05-F | Mind Game | TE | 1 afterimage (pursuit decoy, no football) | "ends catch/whistle" | 4 qualifying plays | no (route cut) | 1 |
| ICE-02-F | Frost Nip | CB | 1 snowball projectile | cancels on pass release or play end | cooldown 5/4/3/2 | no | 1 |
| ICE-03-F | Snowfall Slam | LB | 2 snowballs (projectile, then obstacle if no offensive hit) | "Obstacles … clear whistle" | 3 low-yardage plays; one banked | no ("special teams … excluded") | 2 |
| MET-06-F | Fortress Gate | DL (L, def.) | 2 gate panels (collision) | "disappear whistle" | "Once per defensive possession" | ambiguous (A6) | 2 |
| NAT-06-F | Grove Guardian | LB (L, def.) | 1 clone defender (collision) | "ONE completed play; clear clone … at whistle" | 5 defensive plays | no ("defensive scrimmage SNAP") | 1 |
| EAR-02-F | Stonewall Swat | LB | 1 rock projectile to the ball ("no field obstacle") | instant | "If multiple able users are armed, stable lineup order selects ONE" | no | 1 per team per pass |
| DAR-04-F | Ambush Tag | LB | 1 shadow-claw visual at snap (no collision) | instant | 3 plays | no | 1 per Murklaw |

Instant visual events with no lingering object, listed so the reviewer does not count them: FIR-03-F Meteor Impact shockwave ("Instant bounded displacement; no lingering zone"), DRA-04-F spectral dragon foot, DRA-05-F spectral dragon (FG), DRA-06-F dragon swallow (leaves a vacancy, not an object), DAR-06-F swap, DAR-03-F and PSY-02-F afterimages ("no extra actor"), LIG-06-F flare (not an object or zone).

---

## 3. Whole-field FIELD rectangles (both teams)

**Can bench or depth creators create?** Most cannot: they require a "participating" snap, an "able" source, or a personal event (catch, tackle, PBU, INT). In the current engine, monsters outside the 19 chart slots never take part in a game. Four sources create while their creator is off the field:
- Frostmark ("even while kicker benched")
- Echo Landing ("Source bench does not prevent creation")
- Gear Grid (kicker)
- Tsunami Line (spawns on the S's team's offensive snap)

Eruption, Bloom Break and Beacon Lane state no participation requirement for the spawn itself (A3).

**Persistence that matters.** Most field clocks count only one unit's plays: own offensive plays, own defensive plays, or opposing offensive plays. A field with life remaining therefore waits, stationary, through the other unit's plays and through possession changes. Only halftime clears nonlegendary fields; the legendary Burning Wake and Tsunami Line survive halftime. One-play fields (Bloom Break, Bramble Trap, Charge Strip, Static Field) die at the whistle of their spawn play, so they never carry over.

### 3a. Simple bound: sum of per-slot maxima (valid but loose)

Each slot takes its best Dex family, duplicates allowed, legendaries limited to 1 offensive and 1 defensive per team:

| Slot | Best source | Max |
|---|---|---|
| QB | Blackout Pocket | 1 |
| RB | Charge Strip | 1 |
| WR1–3 | Bloom Break ×3 | 6 |
| TE | Burning Wake (Pyroclast, offensive legendary) | 2 |
| OL ×3 | none | 0 |
| DL1–3 | Permafrost ×3 | 3 |
| LB1–2 | Impact Pyre ×2 | 2 |
| CB1–2 | Shadow Patch / Splashdown | 2 |
| FS, SS | Crosswind pair + (Crosswind pair or Tsunami Line ×2) | 4 |
| K | Frostmark | 4 |
| **Team** | | **25** |

1+1+6+2+0+3+2+2+4+4 = 25 per team, so **≤50 for both teams**. The total matches the old 25/50 by coincidence; several parts were wrong (TE 2 comes from Pyroclast, not Bulwark; Echo Landing is 1, not 3).

### 3b. Tight bound at a single instant (verified)

Take the instant of a team-A offensive snap, after both sides' pre-play creations. Five groups of fields can be alive:

**I. A's offense (fields that spawned now or are still running).**
- Spread package: QB 1 + RB 1 + 3 Spriglets × 2 = 6, plus TE off the field: one running field (Bulwark, or Burning Wake spawned the previous play) = 1. Total 9.
- Pro package: QB 1 + RB 1 + 2 Spriglets × 2 = 4 + Pyroclast spawning F2 with F1 still running = 2, plus WR3 off the field = 0 or 1. Total 8–9.
- Firm: **9**. Conservative: **10**, if Burning Wake or Bloom Break may spawn while the creator is off the field (A3). That gives 1+1+6+2, the full per-slot value.
- A's Tsunami Line also spawns on this snap: firm 1, conservative 2.

**II. B's current defense.** DL 3 (Permafrost, spawned now or last play; DL3 on the field in Heavy) + LB 2 + CB 2 + S 4 (two Galyx pairs, life 3, spawned in Nickel within the last 2 plays) = **11**.

**III. A's paused defense** (A's defensive-clock fields still alive after A's last defensive play):
- Life-2 fields must have spawned on that last play. In Heavy that allows 3 Permafrost + 2 Shadow Patch; plus 2 Impact Pyre (life 4) and Galyx pairs (life 3, spawned the play before, in Nickel).
- If A's S slots are two Galyx: 3+2+2+4 = **11**. If one S slot is Tsunarok (counted in I): **9**.

**IV. B's paused offense.** One-play fields are gone. Fields with life ≥2 that are still alive must have spawned on B's last offensive play, and no package fits 3 WR plus a TE. So: QB 1 + 3 WR (Runway/Beacon) or 2 WR + TE (Bulwark) = **4**. Conservative **5** if a Runway or Beacon field pauses while its creator is off the field, or Beacon spawns with Lumini off the field (A1, A3). Pyroclast is already A's, and is unique in the league.

**V. Kickers.**
- A's Frostmark counts B's offensive plays, so it is paused now: 4.
- B's Frostmark counts A's offensive plays, so it is running: 4 (the newest spawning now).
- Total **8**.

**Totals.**
- Firm (Tsunami 1, so A's best use of the S slots is two Galyx): I 9 + III 11 + II 11 + IV 4 + V 8 = **43**.
- Conservative (Tsunarok with A: Tsunami 2; A's S = Tsunarok + Galyx): I 10 + 2 + III 9 + II 11 + IV 5 + V 8 = **45**.

Moving Tsunarok to B is worse: 42/43. A snapshot on a kickoff, punt, try or two-point play is never higher, because nothing spawns on those plays and the one-play fields are absent.

**Recommended diagnostic limit: 45 field rectangles on the whole field**, within one half plus overtime. The loose bound of 50 also holds. A per-team split is not meaningful at an instant: team A reaches 25 only while team B reaches 20.

Assumptions:
- the current engine has no in-game substitution, so only the 19 chart monsters ever create;
- the opponent cooperates with the timing needed (1-play possessions, early field goals, two interceptions ≥5 defensive plays apart, and so on) within one half;
- hybrid overlap regions are not counted as extra rectangles (§5).

**If in-game substitution is ever added**, any creator that requires participation could rotate in, and the bound would rise toward the roster-wide sum. The per-source maxima still hold. Two kinds of source become unbounded by the chart: the K slot (only one kicker kicks, so it stays 4) and the S/CB/WR families, whose counts would be limited only by the per-play events (for example, one PBU per pass means at most 3 Splashdowns alive).

---

## 4. Physical objects in a single play

Only monsters on the field. The legendary limit decides most of this: Voltarch, Titanolith and Tempestra are all **offensive** legendaries, so a team fields at most one of them. Aegistron and Elderoot are both **defensive** legendaries, so at most one of those.

**Offense, maximum by choice of offensive legendary:**

| Legendary | Objects |
|---|---|
| Tempestra (WR) | 1 tornado + 3 blasts + TE Enigmane afterimage 1 = **5**. Stone Screen also needs a reception, and a play has one completed forward pass, so the TE cannot also add a wall on a Tempestra catch |
| Voltarch (QB) | 2 guards + 1 TE wall or afterimage = **3**, all collision |
| Titanolith (OL) | 1 wall + 1 TE object = 2 |

**Defense:** Aegistron DL (2 panels) + 2 Cryolynx LB (2 snowballs each = 4) + 2 Frostpup CB (1 snowball each = 2) = **8**, in the Base or Heavy package. The Elderoot option is 1 clone + 1 Cryolynx (2) + 2 Frostpup (2) = 5. A Craggo rock would replace a Cryolynx, which is fewer.

**Scrimmage play maximum:**
- All objects (including projectiles, the tornado and the afterimage): 5 + 8 = **13**.
- Collision objects only (guards, walls, panels, snowball obstacles, clone): offense 3 (Voltarch) + defense 6 (2 panels + 4 snowball obstacles) = **9**.

**Kickoff plays (now live):** firm **0**. Every object creator is limited to scrimmage, passing or route plays, or excludes special teams. Conservative **6**: a Tempestra returner's tornado and 3 blasts if a kick catch counts as a "reception", plus Aegistron's 2 panels if a kickoff counts as a "defensive snap" (A6). The kickoff unit composition is undefined (A7), but under the firm reading it does not affect the count.

**Persisting across plays: 0 objects.** Every object clears at the whistle or sooner (quotes in §2b). The only cross-play non-field state is the Sovereign Arm absence (a vacancy, not an object): at most 1 per game, because Aurodrax is unique.

---

## 5. Overlap-derived objects

- **Living Terrain** (Nature + Earth): "At most4 … vine clumps per connected overlap". No Earth field exists, so **0** today. If an Earth field is added, the limit is 4 × the number of connected Nature∩Earth components. Nature rectangles alive at once are at most 6, because Bloom Break and Bramble Trap last one play and belong only to the current offense (Spread: 6; Pro: 4 + 1).
- **Mindstorm** (Psychic + Electric) is reachable today: Mind Bend or Echo Landing overlapping Charge Strip or Static Field. "One echo2yd behind per affected monster/play; no actor/collision/ball". The limit is one echo per affected nonparent monster on the field: 14 + 1 Grove clone = **≤15 per play**. Stormguard guards are immune to environmental effects.
- **Magnetic Storm** creates tethers, not objects: at most floor(15/2) = 7 pairs if "once/play" is per monster pair. **Steam, Eclipse and Froststorm** are regions, not counted objects.
- If the engine stores hybrid regions as separate shapes, their number is bounded by the products of compatible parent-type counts. That is not a small fixed number, so the field cap should count base rectangles only.

---

## 6. Beast Clash (one active per side; lineup N ≤ 5, normally 3)

Duplicates of non-legendary families are allowed. In franchise and league play each legendary appears at most once in a battle. The Lab has no such rule; see the last column.

| Effect | Rule (Dex) | Per side | Both sides | Lab (dupes) |
|---|---|---|---|---|
| Delayed attacks: Falling Star (FIR-03-C) and Faultline (FIR-06-C) | Each replaces the active fighter's normal action; impact "at end of following exchange"; "one meteor in flight per owner"; once per Clash each | **2**. One normal turn per side per exchange, so at most one launch per exchange. A launch in exchange k is still pending when a second launcher (entered by rotation or KO replacement) launches in k+1. A third launch comes after the first impact | **4** | 2 |
| Hits from one delayed impact | Falling Star: main hit + "Every OTHER living opponent, including reserves" | ≤ N = 5 hit events per impact | | 5 |
| Twin Thunder constructs (ELE-06-C) | "summoning two guards"; "Once per Clash setup"; Voltarch is a legendary | **2** | **2**: Voltarch is unique in the league | 10 per side |
| Dawn Song heal schedules (LIG-02-C) | "eligible only if no Dawn Song schedule there"; pulses "at end of NEXT2 owner normal turns" | **≤ N = 5** (one per living ally); ≤ 2 pending pulses each, so ≤ 10 pending pulse events | **10** | 5 |
| Cinder Clamp grip / delayed rotation (FIR-02-C) | "No new grip while existing grip or delayed rotation pending" | ≤ 5 grips (one per Cindruff); ≤ 1 delayed voluntary rotation per side (one rotation per 4 exchanges) | 10 / 2 | same |
| Molten Brand marks (FIR-04-C) | "Once per Clash; cannot reapply" | ≤ 5 | 10 | same |
| Heat Mirage decoy (FIR-05-C) | ends "when owner leaves active position" | 1 | 2 | 1 |
| Shared Burden links (WAT-02-C) | one setup per Clash; works only while the source is in reserve | ≤ N−1 = 4 | 8 | 4 |
| Foresight mirror (PSY-03-C) | "Rotation or knockout clears mirror" | 1 | 2 | 1 |
| Echo Strike memory / Mind Game trick (PSY-04-C, PSY-05-C) | one stored each per monster | ≤ 5 each | 10 each | 5 |
| Deep Winter freeze counters (ICE-06-C) | applies to all living enemies with a harmful status; once per Clash; legendary | ≤ 5 (on the enemy side) | 5 (unique) | 5 per Glacivern |
| Riptide Pursuit readiness (WAT-06-C) | "One use per active entry … Re-entry replaces unused opportunity" | 1 | 1 (unique) | 1 |

The previous Clash figures are corrected:
- delayed impacts: 2 per side, not 5;
- Twin Thunder constructs: 2 in the whole battle, not 2 per side per Voltarch;
- Dawn Song schedules: 5 per side, not 25.

---

## 7. Ambiguities that prevent a firmer number

- **A1. "Participating" lifetime clocks** (Runway, Beacon Lane, Mind Bend): "lasts 1 / 1 / 2 / 2 participating offensive scrimmage plays". If participation means the creator's own, a field pauses while its creator is off the field in another package. That adds +1 to paused-offense IV (4 → 5).
- **A2. Tsunami Line and Burning Wake "TWO completed plays"**: it is unclear whether kickoffs, opposing plays and formula kicks count. Under an own-offense-only clock, Tsunami can have 2 alive (firm 1, conservative 2).
- **A3. Spawn without participation.** Burning Wake: "Center laterally on Pyroclast INITIAL pre-play position" when Pyroclast may not be in the package. Bloom Break: patches from the "formation snapshot". Beacon Lane: "centered on initial ball lateral position". If these can spawn while the creator is off the field, offense I rises from 9 to 10.
- **A4. Cooldown "after creation" versus earning on the creation play** (Bulwark Grid, Blackout Pocket, Echo Landing): "Cooldown 6 / 5 / 4 / 3 offensive plays after creation. Max one pending." If a token earned during the creation play could spawn while the cooldown is running, Bulwark could reach 2 and Echo Landing 3. I read cooldown as blocking creation, matching Splashdown's explicit "unavailable 2–4, ready 5". The totals do not change, because these slots are already maxed by other families.
- **A5. Impact Pyre "1/2/3/4 completed plays"**: it is unclear whether offensive and special-teams plays tick it. I counted it as persisting (conservative).
- **A6. Kickoff eligibility.** Cyclonic Release: "NEXT eligible reception" (is a kick catch a reception?). Fortress Gate: "next defensive snap", "Once per defensive possession" (is the kicking unit on defense?).
- **A7. Kickoff units are undefined.** "7 versus 7 using the existing movement, blocking and tackling code" names no slots. This only matters if A6 is resolved toward eligibility.
- **A8. Dawn Song target**: "Front ally, self only if actually front". With one active fighter per side, the casting Solchirp is the front, and it is unclear whose turns "owner normal turns" means. I used the per-target cap (≤ N), which holds under either reading.
- **A9. Clash "exchange" = round** with one normal turn per side. This is assumed from P8's "after both normal turns". Any future extra normal-action ability would raise the delayed-attack bound above 2 per side.
- **A10. Positions and legendaries: Dex versus runtime.**
  - The Dex has Glacivern as K and Aegistron as DL. Runtime `species.js` has Glacivern as S (`:83`) and Aegistron as CB (`:123`).
  - `legendSide` refuses a kicker legendary (`fa-legendary.js:21`), so the Dex's legendary K escapes the per-side limit.
  - None of these change field counts, because Glacivern's football ability creates nothing. Aegistron's 2 panels are counted as the defensive legendary either way.
- **A11. Feasibility.** Several limits (Frostmark 4 per team, Tsunami 2, the 45 total) need long, cooperative sequences within one half: eight early field goals with one-play possessions, two interceptions, and so on. They are true upper bounds, not likely states.

---

## 8. Summary of verified limits

| Quantity | Firm | Conservative (use for the diagnostic) |
|---|---|---|
| Field rectangles, whole field, one instant | 43 | **45** (loose per-slot bound 50) |
| Objects in one scrimmage play, all kinds | 13 | **13** |
| Collision objects in one scrimmage play | 9 | **9** |
| Objects on a live kickoff | 0 | **6** |
| Objects persisting across plays | 0 | **0** |
| Living Terrain clumps | 0 | **0** (4 per connected overlap if Earth fields ever exist) |
| Mindstorm echoes per play | 15 | **15** |
| Auras per play | 10 | **10** |
| Clash delayed attacks | 2 per side / 4 total | same |
| Clash Twin Thunder constructs | 2 total | same (Lab: 10 per side) |
| Clash Dawn Song schedules | 5 per side / 10 total | same (3 per side in 3v3) |

---

## 9. Recalculation under the approved clocks (N7c B20, N7d G1–G3)

The bounds in §3–§4 were computed under readings A1–A6. The owner has now ruled on each one. Recalculated at the same worst instant (a team-A offensive snap):

| Group | Before (firm / conservative) | Ruling applied | Now |
| --- | --- | --- | ---: |
| I. A's current offense | 9 / 10 | **G3:** Burning Wake, Bloom Break, Beacon Lane and Bulwark Grid spawn only with the creator on the field. The 10 required an off-field spawn. **G2:** a WR3 Runway or Beacon field stays alive while paused off the field. In Pro that gives QB 1 + RB 1 + 2 Bloom × 2 + Pyroclast 2 + paused WR3 field 1 = 9. Spread is also 9. | **9** |
| Tsunami Line | 1 / 2 | **G1:** every completed scrimmage play by either team counts, so a field can't wait out the opponent's possession. Two fields can't coexist (5-play cooldown, life 2). | **1** |
| II. B's current defense | 11 | Unchanged. Impact Pyre now also counts offensive plays, which only shortens its life. | **11** |
| III. A's paused defense | 11 (two Galyx) / 9 (Tsunarok) | **G3:** satisfied, since every field there spawned with its creator on the field (Heavy, then Nickel). **G1:** Impact Pyre keeps ticking during A's offense, but at A's first offensive snap it has used only 1 of up to 4 plays. | **11** |
| IV. B's paused offense | 4 / 5 | **G2:** a Runway or Beacon field pauses while its creator is off the field, and over a whole opponent possession. So QB 1 + 3 WR fields (one created earlier in Spread and paused) + TE Bulwark 1 = 5. | **5** |
| V. Kickers (Frostmark × 2 teams) | 8 | Unchanged: the clock counts opposing offensive scrimmage plays only. | **8** |

**Scope of the creator-presence rule (N7d G3).** The requirement that the creator be on the field at the spawn snap applies only to the eight named abilities: Burning Wake, Bloom Break, Bramble Trap, Beacon Lane, Bulwark Grid, Shadow Patch, Crosswind Rescue and Mind Bend. The five explicit off-field creation permissions remain approved and are counted that way above: Frostmark, Echo Landing, Gear Grid, Tsunami Line and Splashdown.

**Whole-field maximum.**
- With two Galyx at A's S slots: 9 + 11 + 11 + 5 + 8 = **44**.
- With Tsunarok replacing a Galyx: 9 + 1 + 9 + 11 + 5 + 8 = 43.
- **Approved diagnostic threshold: 44 field rectangles** (was 45).

**Kickoff objects.** N7c B20 rules that kickoff catches are not receptions and kickoffs are not defensive snaps, so neither Cyclonic Release nor Fortress Gate can act on a kickoff. **0 objects on a live kickoff** (was 6).

All other limits are unchanged:
- 13 objects (9 collision) per scrimmage play;
- 0 between plays;
- 4 clumps per Nature–Earth overlap;
- 15 Mindstorm echoes and 10 auras per play;
- Clash: 2 delayed impacts per side, 2 Twin Thunder constructs per battle, Dawn Song up to lineup size per side.
