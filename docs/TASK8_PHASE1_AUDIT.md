# Task 8 Phase 1 audit

Phase 1 of the consolidated specification (§17): implementation map, dependency order, test plan, R01–R15 analysis and one consolidated decision batch. **No gameplay, data or art was changed by this audit.**

## 1. Audited revision

| Item | Value |
| --- | --- |
| Code audited | `cbd0d77` on `task8-basic-families`. Its `src/` is identical to the handoff baseline `d65c1a5`; the commits between change docs only. |
| Audit branch | `task8-implementation` |
| Beast Dex | `docs/beast-dex/` at the same commit; validator PASS, 28,478 assertions |
| Game version | 42.22.0 (Task 7 release `43976f4` is contained) |
| Baseline tests | 895 tests; 893 passed and 2 failed (release stamp), fixed in `d65c1a5` and rechecked |

## 2. Sources and precedence

1. **Owner decisions of 2026-11-06,** recorded in `docs/beast-dex/PROGRESSION_DECISIONS.md`:
   - The Basics are in scope.
   - The Nov 6 growth-allowance rule governs.
2. **Later approvals in the Dex:** `APPROVED_RULES.md`, `PROGRESSION_DECISIONS.md`, `BASIC_CREATION_BRIEF.md`, `data/rules.json`.
3. **The consolidated specification, Revision 1:** `SPECIFICATION_BASELINE.md`, plus the newly imported `SPECIFICATION_APPENDICES.md`.
   - The appendices were missing from the repository.
   - The repository copy matches the owner's .docx in content.
4. **Ability contracts:** `data/abilities.json` (workbook v18), subject to the overrides in specification §9–§12.
5. **Existing code:** implementation evidence only. The four inventories below give file:line citations.

Inventories:
- [A: generation and progression](task8/inventory/A-generation-progression.md)
- [B: football](task8/inventory/B-football.md)
- [C: Beast Clash](task8/inventory/C-clash.md)
- [D: presentation and reviewers](task8/inventory/D-presentation.md)

Each was written by a separate read-only reviewer, and I checked their headline claims against the code and data.

## 3. Scope accounting: 192 families, 222 forms

The family-by-family table is in [task8/FAMILY_ACCOUNTING.md](task8/FAMILY_ACCOUNTING.md).

| Group | Families | Forms | Unique abilities | In the game today |
| --- | ---: | ---: | --- | --- |
| Original (26 Common, 21 Uncommon, 13 Rare, 12 Legendary) | 72 | 102 | 72 Football and 72 Clash | All 72, but with legacy data (below) |
| Basic | 120 | 120 (stage 0, no evolution) | none; shared type rules, archetype perks, development, teammate effects | none (not in `SPECIES_DEX`) |

**How far today's code is from the Dex:**
- **Abilities:**
  - Football: 0 match, 7 partial, 42 different mechanics, 23 shared-trait-only.
  - Clash: 0 match, 24 partial, 48 different mechanics.
  - Six Clash and seven football abilities share a name with code that does something else.
- **Family data:**
  - 7 position changes (Glacivern S→K, Granigor DL→K, Echolot LB→K, Vyrnax DL→K, Nocturne WR→QB, Ferrhorn OL→TE, Aegistron CB→DL).
  - 7 rarity changes.
  - 11 Clash archetype changes.
- **All of these differences are approved.** All 72 positions and archetypes in `families.json` match spec Appendix A exactly, and the rarities match the amendment table in `APPROVED_RULES.md`.

## 4. R01–R15: what later GitHub rules resolve, and what remains

Each entry gives:
- **Resolved:** what the later rules settle, with the citing file and section.
- **Gap:** what genuinely remains.
- **Technical:** an implementation choice I will make without changing gameplay.
- **Decision:** the item number in §8 that needs owner approval.

### R01: profiles, ceilings, growth and evolution

**Resolved:**
- All 222 forms have complete 12-attribute starting and potential ranges (`data/forms.json`; `APPROVED_RULES.md` *Attribute ratings and rarity*; Cindruff correction in `rules.json.approvedCorrections`).
- Rolls are independent and uniform (`rules.json.generation`).
- Evolution formula: `min(newP, roundHalfUp(old × newP / oldP))` with relative ceiling placement preserved (`APPROVED_RULES.md` *Generation and evolution*; `rules.json.evolution`).
- Automatic growth is an allowance of `floor((P−S)/2)`, independent of training and bounded by the ceiling (owner decision, 2026-11-06).
- The aging ledger scales proportionally (`PROGRESSION_DECISIONS.md` bullet 3, worked example).
- An unfinished bar keeps its funded percentage at evolution (bullet 6).
- Evolved forms are never generated below their level (bullet 7).

**Gap:**
- the per-level schedule shape (levels 2–50);
- how the allowance and its earned fraction map through evolution;
- generation level and age rules per channel;
- how much prior training the initial league rosters get.

**Technical:** exact rational bookkeeping of entitlement, with the integer part applied per level. Ledgers are reconciled to the authoritative evolution result.

**Decision:** #1–#4.

### R02: final Dex publication and pin

**Resolved:**
- Counts are validated at 192 / 222 / 144 (validator).
- GitHub is authoritative and the workbook is not required (owner, 2026-11-06).

**Gap:**
1. No final revision is pinned yet.
2. `abilities.json` still carries superseded text: Blazing Resolve's "one live second" (spec §9 overrides) and the legacy "Burning" names in Stoke the Flame and Falling Star (spec §10).
3. Two contracts give no numbers for their scaling: Stoke the Flame ("damage scales by form/mastery") and Victory Surge.
4. Three multi-form families name no form-specific values: Blazing Resolve, Stoke the Flame, Clean Sweep.

**Technical:**
- Pin the Dex commit at implementation start.
- Annotate superseded text, as was done for growth.

**Decision:** #5.

### R03: target branch, attribute contests, pancake, telemetry

**Resolved:**
- The target-branch audit is this document.
- Attribute *roles* per position are in spec Appendix C. §12 fixes Speed → max speed and acceleration, Agility → turning, Strength → fumble resistance, and WR Strength → contested catches.

**Gap:**
- **Numeric contest weights.** The engine today uses Agility for acceleration and Catching for fumbles (inventory B §2).
- **Pancake.** No pancake or Knocked Down exists in the engine.
- **Telemetry definitions.** Pressure is currently proximity within 3.2 yd, which §7 forbids. There are no hit/hurry, viable-window, gap, contain or tackle-attempt records, and stats are keyed by slot, not monster.

**Technical:**
- a per-play, per-monster telemetry ledger with provenance (ability override, clone);
- dedupe the broken-tackle events;
- credit missed tackles to the defender;
- record down and field position per play;
- store the field-goal `p`.

**Decision:** #6–#8.

### R04: reserve XP, offseason stamp, partial bonus, denominators

**Resolved:**
- Reserve training is 25% of the standard award, i.e. 6.25% of a bar (§6).
- Slots stay 6, at most 2 per position (§6).
- Apex is exempt from the age and headroom checks (§5).
- The offseason award is 2 points (§6).

**Gap:**
- the reserve level-XP award;
- post-level-50 and headroom eligibility under per-attribute ceilings;
- the eligibility stamp;
- scaling of the partial-participation bonus.

**Technical:** the denominators follow §7's own definitions, recorded in the event contract (§6 of this document).

**Decision:** #9–#12.

### R05: career benchmarks and tuning order

**Resolved:** sample sizes, policies and gates (§16).

**Gap:** schedules, seeds, creation ages, allocation algorithms, the median treatment of retirees, the ceiling observation window, and the tuning tie order.

**Technical:** fixed seeds recorded in the test manifest.

**Decision:** #13.

### R06: Apex details

**Resolved:**
- the 1% chance;
- starts of 10–15;
- 99 potential in all attributes;
- neutral Temper;
- ageless;
- eligibility includes Basics (`BASIC_CREATION_BRIEF.md`);
- no reroll.

**Gap:**
- how the neutral Temper and the starts are sampled;
- the contract value;
- whether Apex frequency should follow appearance rates;
- details of discovery persistence.

**Technical:** a per-player knowledge ledger keyed by monster ID. The AI uses an equivalent ledger.

**Decision:** #14–#15.

### R07: status payloads and within-play recovery

**Resolved:**
- the twelve identities (Appendix B, now in the repository);
- the shared slot and episode rules (§10);
- the ability-specific durations stated in the contracts. 100 status mentions across the 144 abilities: Stunned 66, Shielded 18, Knocked Down 16, others fewer.

**Gap:**
- how long a football Stunned disables "within the play" (no seconds rule is authorized);
- which current physical micro-recoveries (juke 0.3 s, missed tackle 0.45 s, beaten blocker 0.45 s) stay physics and which become statuses;
- the destination payload of every creator. It can mostly be compiled from the contracts.

**Technical:** compile the per-creator payload table from `abilities.json`, listing anything without a value as a gap.

**Decision:** #16–#17.

### R08: integer rounding

**Resolved:**
- Shared Burden: floor the source share; the remainder goes to the target (§9).
- Mind Mend: floor (§9).
- Root Communion: conserving apportionment (§9).
- Exact fractions are kept internally (§15).

**Gap:**
- the convention for ordinary hits, heals and shields (the engine rounds half-up everywhere today);
- the Dragon Pounce HP cost;
- partial split mitigations.

**Decision:** #18.

### R09: event phases

**Resolved:**
- same-boundary ties go by event order, then sourceID, then abilityID (§9);
- Glacier Wall rebuilds after the whole hit (§10);
- Afflicted ticks at the end of the recipient's turn (§10).

**Gap:** one full phase order for a Clash turn and a football play.

**Technical:** I propose the order in decision #19 and pin it with fixtures.

**Decision:** #19.

### R10: Clash support and prevention attribution

**Resolved:** the four categories and their weights; no overheal credit; no nominal unused credit (§8).

**Gap:**
- averaging when recipients have unequal maxHP;
- heal plus cleanse together;
- splitting prevention between overlapping protectors;
- how to classify outgoing-damage debuffs.

**Decision:** #20.

### R11: kick placement grading

**Resolved:**
- field-goal and PAT scoring is `2(result − p)`; the engine already computes `p` but does not store it;
- the punt and kickoff tables (§7).

**Gap:**
- §7 says "use existing catch/landing physics", but **no kick physics exists**: kicks are formulas (inventory B §8);
- no punt or kickoff target exists;
- retry grouping is open (Second Chance).

**Decision:** #21.

### R12: stamina and Afflicted

**Resolved:**
- stamina capacity = permanent Durability, 1:1;
- drain of 1 per played play;
- halftime restores 50%;
- one-time exhaustion halving that persists into the deciding Clash;
- a battery shown at 25% (§12).

**Gap:**
- whether the weekly `fatigue` field and its −6% penalty survive;
- how Afflicted interacts with stamina;
- when exhaustion starts;
- whether Clash drains stamina.

**Decision:** #22.

### R13: save/resume, refunds, fractional display

**Resolved:**
- the fresh-save break (§15);
- age-change refunds: keep the invested points and recompute the bar (§4);
- the reward ledger per activity and monster (§15).

**Gap:**
- mid-play and mid-Clash save boundaries;
- how fractional balances are displayed and when the exact-cost button is affordable.

**Technical:** the activityID + monsterID ledger with atomic application.

**Decision:** #23.

### R14: field and object caps, spawn ties, performance scenes

**Resolved:**
- never silently delete gameplay objects to save frames;
- the FPS gates (§14).

**Gap:**
- operational caps;
- spawn search and tie rules;
- the frozen scene set.

**Decision:** #24.

### R15: the per-ability 100-case matrix and tolerances

**Resolved:**
- 100 cases per mode ability, 14,400 in total (§16);
- the scenario kinds (§13).

**Gap:** the matrix composition and the probability tolerances.

**Technical:** a generated matrix: each contract field × valid, blocked, multi-target, depletion, cleanup, source-KO/rotation, carryover × mastery tier.

**Decision:** #25.

## 5. Additional gaps found in the code audit

These are not in R01–R15. Decision numbers refer to §8.

| Finding | Evidence | Decision |
| --- | --- | --- |
| **The Clash battle model breaks spec §1.** Supports heal and Disruptors act from the bench every exchange. Franchise battles never allow voluntary rotation, yet Cinder Clamp, Riptide Pursuit, Cold Welcome, Shell Harvest and others trigger on voluntary rotation. | C §1 | #26 |
| **"Normal evasion" is referenced by about 30 Clash contracts, but the engine has no accuracy or evasion system.** Misses come only from ability flags. | C §2; `abilities.json` | #27 |
| **Clash counts exchanges, not turns.** Durations, cooldowns and charges in the Dex use recipient or owner normal turns. A 3-duration Burn affects only 2 actions today. | C §4 | spec-mandated: technical |
| **Shield is a free-stacking pool.** It becomes the Shielded status, which occupies the slot. | C §4 | spec-mandated: technical |
| **The ten shared common traits** (Quick Feet, Anchor, …) have no place once every original family has a Dex signature, and Basics get no unique ability. | B §3 | #28 |
| **Nature side systems.** Nature also drives media-day rating boosts, contract counter acceptance, the FA persona and press dialogue. Temper may not affect AI or ratings. | A §6.1 | #29 |
| **The economy is calibrated on one scalar.** Salary, club quality 56/64/72, draft and FA values, development headroom, Clash HP/ATK and engine speed all assume today's OVR 45–75 scale. Dex starting ranges begin at 1–43. | A risk R1 | #30 |
| **Parallel growth paths not covered by the spec.** These are the rival-signature +2 per offseason, AI evolve-stage level jumps, AI "stars" regenerated at +10, "+1 awareness/strength to 23" and C2 maturation. | A §2, §4 | #31 |
| **Granigor is a Task 7 cornerstone at DL.** It becomes a K, and the cornerstone offer rule excludes kickers. The gym legendaries Glacivern and Aegistron also change position. | A risk R4 | #32 |
| **The stadium type bonus** (matching type +2%) contradicts §11's same-type neutrality. | B §5 | #33 |
| **Ageing on the new rating scale.** The decline floor of 20 *raises* low ratings. The Durability ≤45 onset shift will apply to most ordinary monsters. | A risks R5, R6 | #34 |
| **AI knowledge.** The AI reads true potential everywhere. The spec restricts only Temper and Apex knowledge. | A §3.5 | #35 |
| **No kicker or coverage actors.** Special teams have no participant list for status and stamina counting. | B §8 | #21 |
| **2-man OL in 7v7.** Landslide "qualified front", Stormguard "outside both line ends" and Divided Guard need geometry interpretations. | B risks | technical, per contract fixture |
| **"See it" previews and the reviewer's Staged mode use synthetic frames**, which §13 forbids. Reviews are keyed to old species abilities, so existing approvals become void. | D §1 | technical (reviews archived) |
| **Reduced motion hides real status state.** The Clash arena ignores Screen shake. There is no FPS mode, quality, camera or reduced-flash setting. | D §3–§4 | technical; device-level settings |
| **Clash rewards are applied when the animation ends** (Watch path). | D §5 | technical: resolve independently |
| **Basics break lookups.** The rarity table throws, they are excluded from or mis-weighted in pools, and Clash throws on a species without a move. | A risk R2; C §6 | #36–#40 |

## 6. Implementation map

Each row maps current code to the new contract and the work package (WP) that changes it.

| Area | Current (inventory ref) | New contract (spec) | WP |
| --- | --- | --- | --- |
| Species data | `species.js` 72 entries; `RARITIES` without Basic; traits | Generated from the Beast Dex at build time: 192 families, 222 forms (`stage`-keyed IDs), archetype on the family, Basic rarity, explicit null abilities | 1 |
| Generation | `generateMonster(quality)`: template + type bias + Nature + scalar potential (A §1.2) | Uniform per-attribute start and potential from form ranges; Temper uniform over 25; Apex 1% (neutral, 10–15, all 99); level/age by channel; no reroll | 2 |
| Monster record | ~20 fields (A §1.3) | Add: potential map, `temper`, `apex` plus knowledge ledger, level-1 reference S, growth entitlement, aging-loss ledger, per-attribute training investment, training bar, football and Clash mastery, offseason stamp; schema bump | 2 |
| Level and growth | `levelUp` random +1/+2 and 2 points; unbounded XP (A §1.2) | Cap 50; fixed per-attribute cumulative schedule (#1); no points from levels | 3 |
| Training | Integer points, position-only spending | One point per full bar; cost C/E with exact fractions; all 12 attributes; refund at the ceiling; AI and auto allocation (§4) | 3 |
| Evolution | +3/+1 attributes, +4 potential | Approved percentage formula; ledgers and bar preserved | 3 |
| Ageing | `aging.js` rules; growth to 23; C2 maturation | Rules kept; maturation replaced by the 2-point offseason award; floor fix (#34); Apex ageless in all three predicates | 3 |
| Rewards | XP per depth-chart slot; Clash XP to fighters only | activityID+monsterID ledger; football 50 XP + 25% bar; Clash 25 XP + 25% to every selected member; reserve awards; atomic and resumable (§6, §15) | 4 |
| Telemetry | Slot-keyed box score; proximity pressure (B §7) | Per-play, per-monster opportunity ledger; ordinary box score unchanged | 4 |
| Football grading | none | §7 formulas per position, bounded ±20% | 8 |
| Clash grading | contribution share (C §5) | §8 archetype ledger (#20) | 8 |
| Mastery | none | Per-mode records; thresholds 0/10/30/60; credit per valid execution; passive cap once per game; ability event contracts define "valid" | 8 |
| Shared statuses | Football seconds-based codes; Clash four conditions (B §4, C §4) | One slot, twelve identities, episode rules, play/turn clocks, cross-mode transfer, KO clear, badge payload | 5 |
| Stamina | Weekly `fatigue` only | Per-game stamina, exhaustion flag, battery (#22) | 5 |
| Fields | none (stadium bonus only) | Field primitive in authoritative state: geometry, base effects, six hybrids, lifetimes, same-type neutrality (§11) | 5 |
| Football attribute consumers | Agility → acceleration; Catching → fumbles | Appendix C roles with approved weights (#6) | 5 |
| Pancake / Knocked Down / Stumbled | none | One attempt per OL per play; Knocked Down for the rest of the play; Stumbled current-speed loss (§9, §10; #7) | 5 |
| Special objects | none | Clones, walls, obstacles, projectiles, absences, teleports as their own primitives (§12) | 5 |
| Football ability runtime | ~60 inline effect keys; per-play actors (B §3) | Contract registry: charge, cooldown and once-ledgers in game state; event bus; manual-activation hook (Vyrnax) | 6 |
| 72 football abilities | 42 different / 23 missing / 7 partial | Each from its contract plus §9–§12 overrides, with form and mastery values | 6 |
| Clash engine | Exchange model with back-row actions | One active fighter, reserves, normal-turn clock, voluntary rotation (#26), evasion (#27), delayed events, cooldowns, charges, counters, commanded reserves, revive, transfer, split, constructs | 7 |
| 72 Clash abilities | 48 different / 24 partial | Each from its contract, with form and mastery values | 7 |
| Opening / OT link | Possession or winner only; nothing carried | Status, charge, stamina and exhaustion transfer both ways (§10, §12) | 7 |
| Basics in pools | Excluded or mis-weighted | Per-channel weights (#36); Clash action (#37) | 2 / 7 |
| AI | Omniscient potential; Nature-free | Knowledge rules (#35); training allocation by benefit, cost and known Temper; ability-aware tactics | 9 |
| Football reviewer | Ability Audit: 48 species, synthetic staged frames (D §1) | Real-engine catalogue of 72 abilities × form/mastery variants; scenario injection; replay/reset; quality, reduced-flash and Apex toggles; inspection; review store keyed by ability and variant | 10 |
| Clash reviewer | none (Clash Lab replay exists) | New screen on the arena: 72 abilities × variants; active/reserve, HP/shield/status, delayed-effect presets | 10 |
| Presentation | Cartoon status marks; emoji conditions | Shared grey status badge cycling with the charge bar and battery; the Apex emblem, panel and outline; Temper; three bars; Dex for 192 families | 11 |
| Settings | Reduced motion, screen shake, per-save | Device-level: 60/30 FPS, effect quality, camera intensity, reduced flash; central frame scheduler | 11 |
| Saves | Schema 9, legacy migrations | New schema; clear incompatible-save message with a Start New Franchise path; legacy migrations retired | 2 |

## 7. Dependency order

Work packages in build order. Each lists what it depends on and what it is gated by. Decision numbers refer to §8.

| WP | Content | Depends on | Gated by decisions |
| --- | --- | --- | --- |
| 1 | Dex-to-game data adapter (192/222/144), fresh-save schema, rarity table with Basic, archetype on the family, validation rewrite | none | #5 (pin), #28, #32 |
| 2 | Generator, Temper, Apex, knowledge ledger, monster record | WP 1 | #2–#4, #14–#15, #30, #36 |
| 3 | Level schedule, training economy, evolution, ageing changes | WP 2 | #1, #2, #31, #34 |
| 4 | Reward ledger and football telemetry | WP 2 | #8–#12 |
| 5 | Shared statuses, stamina, fields and overlaps, attribute consumers, pancake, special objects | WP 1, 4 | #6, #7, #16–#18, #22, #24, #33 |
| 6 | Football ability registry and the 72 football abilities | WP 5 | #5, #19, #21 |
| 7 | Clash turn model, rotation, evasion, primitives, the 72 Clash abilities, opening/OT carryover, Basic Clash action | WP 1, 5 | #18–#20, #26, #27, #37 |
| 8 | Grading (football §7, Clash §8) and mastery | WP 4, 6, 7 | #8, #20, #21 |
| 9 | AI integration: knowledge, training allocation, tactics, roster policy for Basics | WP 3, 6, 7 | #29, #35, #39 |
| 10 | Football reviewer update and new Clash reviewer | WP 6, 7 (catalogue shell can start after WP 1) | #25 |
| 11 | Presentation and settings | WP 5–8 | none beyond the above |
| 12 | Gates and tuning | everything | #13, #25 |

**What can start before the decisions:** WP 1 except the pin, the reward-ledger and telemetry plumbing in WP 4, and the reviewer catalogue shells in WP 10. None of these require an unapproved gameplay rule.

## 8. Test plan

Gates follow spec §16. Each functional gate passes 100%; balance gates use their stated tolerance.

| Gate | Test | Tier |
| --- | --- | --- |
| Dex adapter | Counts 192/222/144; every family has an archetype; Basics have explicit null abilities and no evolution; Dex hash pinned | fast |
| Generation invariants | 100,000 individuals: start ≤ potential ≤ firm rarity maximum (Apex excepted); Temper uniform over 25; Apex neutral, 10–15 starts, all-99 potential; no reroll on save, trade, FA or evolution | sim |
| Apex frequency | 10,000 eligible rolls at 1%: count, rate, species distribution, repeatability (reported, not exact-100) | fast |
| Training math | Fixtures for C/E at C = 1, 2, 4 with favoured, neutral and unfavoured; carry; ceiling refund; age-change recompute; one-point and exact-cost purchases | fast |
| Growth and evolution | Allowance fixtures (40/78 → 19; 10/99 → 44); evolution formula boundaries; ledger scaling, including the worked 30/40 → 45/60 example | fast |
| Rewards | 100/100 new-save and reward-persistence fixtures; idempotency under interrupted application; no double starter/reserve award; Watch = Skip; labs and reviewers award nothing | fast |
| Statuses | Episode rules (equal, stronger, weaker, 3-cap); play and turn clocks; bench pause; application turn not counted; KO clear; 100 continuity scenarios across halftime, OT and game end | fast |
| Fields | Geometry clip and shift; same-type neutrality; six hybrids; 3+ type overlap ordering; additive caps | fast |
| Per-ability functional | 100 scripted cases × 144 = 14,400, plus form/mastery coverage, through the reviewer scenario API | sim |
| Determinism | 100 identical-seed comparisons; outcomes equal across Watch/Skip, 30/60 FPS, quality and replay | sim |
| Grading | Per-position formula fixtures including sample scaling, zero-opportunity neutrality and the ±20% bound; Clash archetype ledger fixtures | fast |
| Career and pacing | Mastery 3–6 seasons; median level 50 in 5–8 seasons; ≥75% of starters reach 50 by season 8; position fairness ±15%; under 10% reach all ceilings; Apex ≥90% all-99 by season 15 | sim (reported) |
| CPU | ≤10% slowdown against matched baseline scenes | perf |
| Reviewers | Browser checks modelled on `tools/evo-preview-check.py`: all 144 abilities and every variant listed; every scenario runs on the real engine with no page errors; toggles work; no progression writes | browser |
| Mobile frame gates | iPhone 12 / Pixel 6, physical devices only. Reported unverified if unavailable. | device |

**Existing suite:** 895 tests. Golden fixtures and calibration tests tied to legacy mechanics will change, by design, as each package lands. Each change is listed in its PR. **Art-only changes** run the sprite and species tests only, per the owner's instruction.

## 9. Consolidated decisions (one batch)

Each item gives:
- **G:** a gameplay decision needing approval;
- **T:** a technical matter where I recommend a default and ask only for a veto;
- **Rec:** my recommendation.

### Progression and generation

1. **G: shape of the natural-growth schedule.**
   - Rec: linear cumulative entitlement. Entitlement at level L = allowance × (L−1)/49, exact fraction, and each level applies the newly earned whole points within the ceiling.
2. **G: growth through evolution.**
   - Rec: scale the level-1 reference S and the earned contribution by newP/oldP, using the approved formula's rounding.
   - Remaining allowance = new allowance − scaled earned. Never negative, never replayed.
3. **G: generation level and age by channel.**
   - Rec: keep today's ages. Draft, scouting and encounter newcomers start at level 1. Veterans (FA arrivals, initial rosters, rival signature) are generated at level 1 and advanced by the same model to a level derived from career years: level = min(50, 1 + 7 × yearsPro).
   - Evolve them when eligible. This replaces evolve-stage jumps and the rival's 1 + 3 × seasons.
4. **G: prior training for the initial league rosters** (creation only).
   - Rec: 2 points per prior professional season (the offseason award), allocated by the approved AI policy, with no banked remainder.
   - Prospects get none.

### Data and pin

5. **G: missing ability values and the Dex pin.**
   - Missing values: Stoke the Flame damage scaling; Victory Surge scaling; form-specific values for Blazing Resolve, Stoke the Flame and Clean Sweep. Rec: please supply them. I will not invent numbers.
   - Pin. Rec: pin the Dex at the commit where these are supplied.

### Football engine

6. **G: attribute consumers that move between attributes.**
   - Rec: keep today's coefficient magnitudes and re-route them to the approved attribute: acceleration to Speed, fumble resistance to Strength, and Agility to turning.
   - Add WR and TE Strength to the contested-catch roll at the same 0.3 weight Agility has today.
   - The owner then reviews outcomes in the career benchmarks.
7. **G: pancake rules.**
   - Rec: one attempt per OL per play, checked once an engagement has been held for 0.6 s and the block score leads by at least 15%.
   - Chance = 0.25 × (Strength, Blocking and Tackling weighted 0.4 / 0.4 / 0.2, against defender Strength 0.6 / Agility 0.4), plus Awareness reducing the whiff risk.
   - A whiff applies Stumbled (40% current speed, engagement lost). Success applies Knocked Down for the rest of the play.
   - All numbers are open to tuning.
8. **G: telemetry definitions.** Rec:
   - **Pressure:** the defender wins its engagement or is unblocked and closes within 2 yd of the QB while the ball is held, forcing a throw, scramble or sack within 0.5 s.
   - **Hit:** contact on the QB at or after release.
   - **Viable window:** the receiver is separated from the responsible defender by ≥2 yd, in throwing range, for ≥0.3 s before release.
   - **Gap and contain responsibility:** from assignments in the play call.

### Rewards and grading

9. **G: reserve level XP.**
   - Rec: 25% of the football base, i.e. 12.5 XP, mirroring the training share.
10. **G: reserve eligibility under per-attribute ceilings.**
    - Rec: eligible while any position-relevant attribute is at least 3 below its individual ceiling. At level 50, eligibility is for training progress only.
11. **G: offseason eligibility stamp.**
    - Rec: the monster existed in the league (any roster, pool or free agency) before the final regular-season week of the completed season and has not retired.
12. **G: partial-participation performance bonus.**
    - Rec: scale it by the same min(1, snaps/10) factor.
13. **T: career benchmark freeze.**
    - Rec: seeds 1–100 per position.
    - Schedules: football-only, mixed (all opening and OT Clashes plus weekly encounters) and maximum-legal.
    - Creation age 21.
    - Retirees count as non-attainment.
    - Ceiling window: 20 seasons.
    - Tuning order: training share, then XP multiplier, then mastery set. Ties go to the smaller change.

### Apex

14. **G: Apex sampling and value.**
    - Sampling. Rec: neutral Temper chosen uniformly (1/3 each); starts drawn independently and uniformly at 10–15.
    - Contract ask. Rec: the larger of the current-OVR salary and the salary at its projected OVR three seasons ahead, with no age discount (ageless).
15. **G: Apex share for Basics.**
    - Rec: 1% per generated eligible individual, so Apex frequency follows each channel's appearance rates. There is no family-uniform roll.

### Statuses and rounding

16. **G: football Stunned "within the play".**
    - Rec: the disable lasts until the end of the current play. That is consistent with Knocked Down and needs no seconds rule.
    - Alternative: a fixed number of engine ticks.
17. **G: which physical micro-recoveries stay physics.**
    - Rec: juke, missed tackle and beaten blocker stay physics. They are not statuses and never occupy the slot.
18. **G: rounding for ordinary damage, heal and shield.**
    - Rec: keep today's round-half-up, with no minimum damage.
    - Pinned exceptions: the §9 floor rules, and Dragon Pounce HP cost rounded up (it is a cost).
19. **G: event phases.**
    - Clash turn. Rec:
      1. start-of-round reserve windows;
      2. initiative;
      3. actor normal turn (skip or act, then hit resolution: evasion, then damage with protection order Guarded → shield → HP);
      4. reactions and counters;
      5. KO;
      6. end-of-turn effects (Afflicted, then decrement);
      7. delayed effects due;
      8. replacement.
    - Football. Rec: pre-snap fields and choices; per tick (statuses, movement, contacts); whistle cleanup; end-of-play decrements; delayed and pending fields.
    - Ties within a phase follow §9.
20. **G: Clash attribution.**
    - Support. Rec: average per recipient, each recipient's ratio = min(1, heal / 15% of its maxHP); a successful cleanse makes that recipient 1.
    - Prevention. Rec: credited in the order it was applied, each protector getting only what it prevented.
    - Rec: debuffs that cut enemy outgoing damage count as Disruption, not Defense.

### Kicks and stamina

21. **G: kick placement without kick physics.**
    - Rec: no new physics. Use the existing distance formula, plus a declared pre-launch target chosen by the kicker AI from legal targets without future RNG. Error = |landing − target| in field length.
    - Second Chance: the retry and the original are one attempt, graded on the final result with p from before the first kick.
    - Special-teams participants for status and stamina: K and the returner only, until coverage units exist.
22. **G: stamina integration.**
    - Rec: retire the weekly fatigue −6% in-game penalty and keep weekly fatigue only for injury risk.
    - Afflicted lowers effective Durability for injury checks only and does not resize or drain stamina.
    - Exhaustion applies from the next play after stamina reaches 0.
    - Clash does not drain stamina, but an exhausted monster enters the deciding Clash with halved attributes.

### Saves and performance

23. **T: save boundaries.**
    - Rec: saves happen between plays and between Clash battles, never mid-play or mid-Clash.
    - Display: banked whole points plus bar %. The exact-cost button is enabled only when the banked points cover the remaining cost.
24. **T: field and object caps.**
    - Rec: caps set from the maximum the approved abilities can create at once, so nothing is ever truncated.
    - Performance scene set: two overlapping hybrids, Twin Thunder constructs, Falling Star, Sovereign Arm absence, Daybreak, and a legendary sequence.
25. **T: functional matrix and tolerances.**
    - Rec: each ability × the scenario kinds × mastery tiers fills its 100 cases.
    - Probabilistic checks use a 99.9% two-sided binomial interval at N = 2,000.

### Clash model

26. **G: one active fighter and voluntary rotation in franchise battles.**
    - Rec: remove bench actions except the Dex-named reserve abilities.
    - Allow player-chosen rotation in every franchise Clash under the existing cadence: one voluntary swap every 4 exchanges, half-strength entry.
    - The AI uses the existing "smart" policy.
27. **G: "normal evasion".**
    - Rec: no base miss chance. Evasion exists only through dodge, decoy and miss effects that abilities create. "Normal evasion" in the contracts means those apply as usual.
    - There is no critical-hit system.

### Legacy systems

28. **G: the ten shared common traits.**
    - Rec: retire them. Every original family uses its Dex signature, and Basics have no unique ability.
29. **G: Nature's side systems.**
    - Rec: re-key media-day dialogue, contract counters and the FA persona to Ambition.
    - Drop the media-day temporary rating boost, which Temper cannot carry.
30. **G: economy recalibration to the Dex rating scale.**
    - Rec: re-derive every OVR-based constant (salary, club quality targets, draft and FA values, development headroom, Clash HP/ATK and engine speed normalisation) by percentile mapping from today's distribution, so relative economics are preserved.
    - The owner then reviews the benchmark report.
31. **G: parallel growth paths.**
    - Rec: remove growth to 23, C2 maturation, the AI "star" +10 regeneration and the rival-signature +2 per offseason. Rival and star strength then come from generation level (#3) and normal training.
32. **G: Granigor cornerstone and gym legendary position changes.**
    - Rec: allow a K cornerstone offer, or replace Granigor in the cornerstone set with a DL family.
    - Gyms keep their legendaries at the new positions.
33. **G: stadium type bonus.**
    - Rec: keep it as a separate home-venue contest bonus. It is not a field, so §11 neutrality does not apply to it.
34. **G: ageing on the new scale.**
    - Rec: the decline floor becomes min(20, current), so it never raises a rating.
    - Keep the approved 75/45 Durability thresholds as written, and report their effect.
35. **G: AI knowledge of ordinary potential.**
    - Rec: unchanged, i.e. the AI keeps true potential. Apply knowledge rules only to Temper and Apex, as the spec states.

### Basics integration

36. **G: Basic appearance rates.**
    - Rec: a rarity weight of 40 (Common 60, Uncommon 30, Rare 9) in roster fill, scouting, encounters and free agency.
    - Draft classes switch from uniform species to rarity weights.
37. **G: Basic Clash action.**
    - Rec: Basics use the ordinary normal attack plus their archetype's existing perks.
    - A per-type shared move set remains a future design. It is approved in principle but not specified.
38. **G: Basic contracts.**
    - Rec: the same salary formula on the recalibrated scale, with the existing minimum salary and no special rookie scale.
39. **G: AI roster use of Basics.**
    - Rec: allowed as depth, never generated as an opening-day starter unless no non-Basic family exists at that position in the club's pool.
40. **G: Dex milestones.**
    - Rec: the completion badge stays at the 72 originals. Basics get a separate tally with no rewards. The milestone rewards are text-only today and stay unchanged.
