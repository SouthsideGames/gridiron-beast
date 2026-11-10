# M4 Clash ability matrix (72 abilities)

> Follow-up: N9c A/B/C/E/G/H are implemented on `codex/task8-presentation-followup`. Perk identity, Dawn Song caster targeting, voluntary Feather Relay interactions, Clear Light owner-turn cooldown and active-position delayed targeting are resolved. The historical rows below may still name those gates; `ABILITY_COMPLETION_MATRIX.md` and `CODEX_APPROVED_CLASH_FOLLOWUP.md` identify the remaining unresolved points. No other decisions were approved.

Branch `task8-m4-core`, head after S11 (`3d822f2`). The table is generated from the code: `reviewMatrix()`, `listScenarios()`,
`ABILITY_KINDS` and `PROVISIONAL_POINTS`.

**Summary**
- **Implemented:** 72 / 72. Every contract is registered and has acceptance scenarios on the real engine for every Dex form × mastery
  tier (408 rows).
- **Blocked:** none. No ability is missing.
- **Partly gated in normal gameplay:** 25 abilities reach at least one point awaiting a ruling. For Stone Divide's contested strikes, this counts both Stone Divide and
  the strike's owner. On those paths they report
  `unmet: awaiting ruling (<point>)` and keep their use. Everything else they do runs as approved. The gated readings run only in
  provisional mode (`config.provisional: 'on'`), in scenarios marked provisional and in `tests/clash/t8-provisional-*.test.js`.
- **Contract cases:** 1,280 acceptance cases (scenario × form × tier) in `t8-abilities-{a..f}` and `t8-pilots`, plus 86 provisional
  tests.

**Columns**
- **D16 row:** `review` marks one of the 22 "needs owner review" rows. Each is implemented literally; any classification that changes
  behaviour is a switchable flag.
- **Acceptance scenarios:** the scenario count, with the scenario kinds in brackets.
- **Contract cases:** the number of acceptance scenario runs across every form × tier.
- **Provisional scenarios:** scenarios labelled PROVISIONAL, which are not acceptance.
- **Provisional points:** the gates in `flags.js`.
- **Open question:** a short form of each question. The full wording is in `M4_DECISIONS_PENDING.md` and `M4_STATUS.md`.

| # | Id | Ability | Family | Batch | D16 row | Forms x tiers | Acceptance scenarios (kinds) | Contract cases | Provisional scenarios | Provisional points | Open question |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | FIR-01-C | Stoke the Flame | emberfox | D | ok | 3 x 4 | 4 (valid, blocked, interaction) | 48 | 0 | - | - |
| 2 | FIR-02-C | Cinder Clamp | ashkit | E | ok | 2 x 4 | 3 (valid, blocked, depletion) | 24 | 0 | `feather-relay-voluntary` | relay rotation voluntary? |
| 3 | FIR-03-C | Falling Star | firestorm | S5 | ok | 1 x 4 | 5 (valid, depletion, sourceKO, blocked) | 20 | 1 | `delayed-slot`, `d8-cap-delayed` | "lineup position" vs "Empty main slot"; D8 cap |
| 4 | FIR-04-C | Molten Brand | cinderclaw | D | review | 1 x 4 | 4 (valid, depletion, blocked, sourceKO) | 16 | 0 | `stone-divide-scope` | - |
| 5 | FIR-05-C | Heat Mirage | pyrelynx | D | ok | 1 x 4 | 4 (valid, miss, blocked, depletion) | 16 | 0 | - | which strike tags roll against the decoy |
| 6 | FIR-06-C | Faultline | pyroclast | F | ok | 1 x 4 | 3 (valid, blocked) | 12 | 1 | `delayed-slot`, `d8-cap-delayed` | "lineup position" vs "Empty main slot"; D8 cap |
| 7 | WAT-01-C | Second Tide | tidepaw | C | ok | 3 x 4 | 3 (valid, multiTarget, blocked) | 36 | 0 | - | - |
| 8 | WAT-02-C | Shared Burden | mudcub | S5 | ok | 2 x 4 | 4 (valid, blocked, sourceKO) | 32 | 0 | - | - |
| 9 | WAT-03-C | Shell Renewal | reefclaw | B | review | 1 x 4 | 4 (valid, rotation, blocked) | 16 | 0 | - | - |
| 10 | WAT-04-C | Wash Away | tidefin | F | ok | 1 x 4 | 3 (valid, blocked) | 12 | 0 | - | "normal evasion": no miss source applies (plan §5a) |
| 11 | WAT-05-C | Riptide Charge | wavehorn | E | ok | 1 x 4 | 3 (valid, miss, blocked) | 12 | 0 | - | - |
| 12 | WAT-06-C | Riptide Pursuit | tsunarok | E | ok | 1 x 4 | 3 (valid, blocked, depletion) | 12 | 0 | `feather-relay-voluntary` | relay rotation voluntary?; replacement choice prompt (S13/S14) |
| 13 | NAT-01-C | Second Spring | thornkit | C | ok | 3 x 4 | 3 (valid, blocked, interaction) | 36 | 0 | - | - |
| 14 | NAT-02-C | Spore Detonation | mossclaw | A | ok | 2 x 4 | 4 (valid, blocked, depletion) | 32 | 0 | - | - |
| 15 | NAT-03-C | Last Root | rootram | D | ok | 1 x 4 | 3 (valid, interaction, blocked) | 12 | 0 | - | - |
| 16 | NAT-04-C | Canopy Assist | leafhorn | E | review | 1 x 4 | 3 (valid, blocked, interaction) | 12 | 0 | `stone-divide-scope` | - |
| 17 | NAT-05-C | Shell Harvest | thornback | B | ok | 1 x 4 | 3 (valid, blocked, depletion) | 12 | 0 | `feather-relay-voluntary` | relay rotation voluntary? |
| 18 | NAT-06-C | Root Communion | elderoot | C | ok | 1 x 4 | 3 (valid, blocked, interaction) | 12 | 0 | - | - |
| 19 | ELE-01-C | Lightning Rod | flicker | C | ok | 2 x 4 | 3 (valid, blocked, cleanup) | 24 | 0 | - | - |
| 20 | ELE-02-C | Arc Rebound | voltfin | D | ok | 2 x 4 | 3 (valid, blocked) | 24 | 0 | - | - |
| 21 | ELE-03-C | Phase Strike | voltfang | A | ok | 1 x 4 | 3 (valid, blocked, depletion) | 12 | 0 | - | - |
| 22 | ELE-04-C | Circuit Breaker | stormlynx | F | review | 1 x 4 | 3 (valid, blocked) | 12 | 1 | `d5-perk` | D5; "ready" read as no running cooldown |
| 23 | ELE-05-C | Victory Surge | joltrex | D | ok | 1 x 4 | 3 (valid, blocked) | 12 | 0 | - | - |
| 24 | ELE-06-C | Twin Thunder | stormcrown | D | ok | 1 x 4 | 3 (valid, blocked, sourceKO) | 12 | 0 | - | - |
| 25 | EAR-01-C | Emergency Cover | pebble | D | ok | 3 x 4 | 4 (valid, blocked, multiTarget) | 48 | 0 | - | - |
| 26 | EAR-02-C | Rubble Reprisal | rockram | D | review | 2 x 4 | 3 (valid, blocked, depletion) | 24 | 0 | `stone-divide-scope` | which HP gains count as healed (healed-hook-kinds) |
| 27 | EAR-03-C | Unbroken Charge | boulderox | D | review | 1 x 4 | 3 (valid, blocked, sourceKO) | 12 | 0 | - | - |
| 28 | EAR-04-C | Bank Shot | stoneguard | A | review | 1 x 4 | 4 (valid, blocked, miss) | 16 | 0 | `stone-divide-scope` | - |
| 29 | EAR-05-C | Stone Divide | terrabull | D | ok | 1 x 4 | 4 (valid, blocked) | 16 | 1 | `stone-divide-scope` | D16 Q1-2 scope; "enemy" for commanded strikes read as ability owner |
| 30 | EAR-06-C | Mountain Shelter | titanolith | B | ok | 1 x 4 | 3 (valid, blocked, interaction) | 12 | 0 | - | - |
| 31 | ICE-01-C | Fresh Start | snowmoth | C | ok | 2 x 4 | 3 (valid, blocked, interaction) | 24 | 0 | - | - |
| 32 | ICE-02-C | Cold Welcome | hailfang | E | ok | 2 x 4 | 3 (valid, blocked) | 24 | 0 | `feather-relay-voluntary` | relay rotation voluntary? |
| 33 | ICE-03-C | Snowbank Shot | frostclaw | B | review | 1 x 4 | 4 (valid, miss, blocked, interaction) | 16 | 0 | - | - |
| 34 | ICE-04-C | Snowdrift Shelter | icehorn | B | ok | 1 x 4 | 3 (valid, blocked) | 12 | 0 | - | - |
| 35 | ICE-05-C | Glacier Wall | glaciron | B | ok | 1 x 4 | 3 (valid, blocked, depletion) | 12 | 0 | - | - |
| 36 | ICE-06-C | Deep Winter | glacivern | F | ok | 1 x 4 | 3 (valid, blocked, interaction) | 12 | 0 | - | - |
| 37 | WIN-01-C | Feather Relay | gustling | E | ok | 3 x 4 | 4 (valid, blocked, interaction) | 48 | 2 | `feather-relay-voluntary` | voluntary status for the four rotation triggers |
| 38 | WIN-02-C | Gust Hop | breezefang | A | review | 2 x 4 | 3 (valid, blocked, multiTarget) | 24 | 0 | - | - |
| 39 | WIN-03-C | Downdraft | skywarden | E | ok | 1 x 4 | 3 (valid, blocked) | 12 | 0 | - | - |
| 40 | WIN-04-C | Second Wind | windlynx | E | review | 1 x 4 | 3 (valid, blocked) | 12 | 0 | - | Second Wind vs interrupt tier |
| 41 | WIN-05-C | Tailwind Pact | zephyr | B | ok | 1 x 4 | 3 (valid, blocked, multiTarget) | 12 | 0 | - | - |
| 42 | WIN-06-C | Eye of the Storm | tempestra | F | ok | 1 x 4 | 3 (valid, blocked) | 12 | 0 | - | - |
| 43 | DAR-01-C | Shadow Pounce | shadowkit | D | ok | 2 x 4 | 3 (valid, blocked) | 24 | 0 | - | - |
| 44 | DAR-02-C | Night Swoop | nightowl | A | review | 2 x 4 | 4 (valid, blocked, depletion) | 32 | 1 | `d5-perk` | - |
| 45 | DAR-03-C | Predator Rhythm | duskrunner | A | review | 1 x 4 | 4 (valid, blocked, rotation) | 16 | 1 | `d5-perk` | - |
| 46 | DAR-04-C | Ambush | mireclaw | A | ok | 1 x 4 | 4 (valid, blocked, rotation, depletion) | 16 | 0 | - | - |
| 47 | DAR-05-C | Eclipse Call | nocturne | F | ok | 1 x 4 | 3 (valid, miss, blocked) | 12 | 0 | - | - |
| 48 | DAR-06-C | Eclipse Theft | nyxshade | F | ok | 1 x 4 | 3 (valid, blocked, interaction) | 12 | 0 | - | - |
| 49 | LIG-01-C | Glow Mend | glimmer | C | ok | 2 x 4 | 3 (valid, blocked, interaction) | 24 | 0 | - | - |
| 50 | LIG-02-C | Dawn Song | sunwhistle | C | review | 2 x 4 | 1 (blocked) | 8 | 2 | `d14-dawn-song-target` | D14 self only / self included |
| 51 | LIG-03-C | Clear Light | lumen | C | review | 1 x 4 | 2 (blocked) | 8 | 1 | `d13-values`, `clear-light-cooldown-unit` | D13; cooldown unit |
| 52 | LIG-04-C | Refraction | prism | A | review | 1 x 4 | 3 (valid, blocked, interaction) | 12 | 0 | `stone-divide-scope` | - |
| 53 | LIG-05-C | Radiant Pursuit | halofang | A | review | 1 x 4 | 3 (valid, blocked) | 12 | 1 | `d5-perk` | - |
| 54 | LIG-06-C | Daybreak Lance | aurelion | A | review | 1 x 4 | 2 (valid, blocked) | 4 | 2 | `d13-values`, `d5-perk` | D13; Molten Brand eruption counted as attack retaliation (molten-brand-vs-suppression) |
| 55 | MET-01-C | Forge Swipe | ironcub | B | ok | 2 x 4 | 3 (valid, blocked) | 12 | 1 | `forge-swipe-duration` | Core 2 turns vs Progression 1/2/2/3 |
| 56 | MET-02-C | Tempered Guard | steelpaw | B | ok | 2 x 4 | 3 (valid, blocked) | 24 | 0 | - | - |
| 57 | MET-03-C | Gear Shot | gearwing | A | ok | 1 x 4 | 3 (valid, blocked, interaction) | 12 | 0 | - | - |
| 58 | MET-04-C | Iron Bite | ironjaw | A | review | 1 x 4 | 2 (blocked) | 8 | 1 | `d5-perk` | always perk-decisive vs Shielded / Tank (D5) |
| 59 | MET-05-C | Shield Wall | metalhorn | B | ok | 1 x 4 | 3 (valid, blocked, depletion) | 12 | 0 | - | - |
| 60 | MET-06-C | Fortress | aegistron | B | ok | 1 x 4 | 3 (valid, blocked, cleanup) | 12 | 0 | `fortress-storage-cap` | Core cap 20% vs Progression 10/15/20/25% |
| 61 | PSY-01-C | Mind Mend | mindwing | C | ok | 2 x 4 | 3 (valid, blocked, interaction) | 24 | 0 | - | - |
| 62 | PSY-02-C | Mirage Veil | shadewisp | B | ok | 2 x 4 | 3 (valid, blocked, depletion) | 24 | 0 | - | - |
| 63 | PSY-03-C | Foresight | cerebrix | F | ok | 1 x 4 | 3 (valid, depletion, blocked) | 12 | 0 | - | - |
| 64 | PSY-04-C | Echo Strike | echolot | A | ok | 1 x 4 | 3 (valid, blocked, interaction) | 12 | 0 | - | - |
| 65 | PSY-05-C | Mind Game | enigmane | D | review | 1 x 4 | 3 (valid, blocked) | 12 | 1 | `d5-perk` | - |
| 66 | PSY-06-C | Astral Strike | astralux | F | review | 1 x 4 | 3 (valid, blocked, sourceKO) | 12 | 0 | `stone-divide-scope` | own attack literal ordinary; commanded strikes vs Stone Divide |
| 67 | DRA-01-C | Dragon Pounce | drakeling | A | ok | 3 x 4 | 3 (valid, blocked, miss) | 36 | 0 | - | - |
| 68 | DRA-02-C | Coil Renewal | wyrmkit | C | ok | 2 x 4 | 3 (valid, blocked, cleanup) | 24 | 0 | - | - |
| 69 | DRA-03-C | Wing Shelter | sablewing | C | ok | 1 x 4 | 3 (valid, blocked, sourceKO) | 12 | 0 | - | - |
| 70 | DRA-04-C | Dragonhide | scaleguard | B | review | 1 x 4 | 3 (valid, blocked, cleanup) | 12 | 0 | - | - |
| 71 | DRA-05-C | Dragon Roar | vyrnax | A | ok | 1 x 4 | 3 (valid, blocked, interaction) | 12 | 0 | - | - |
| 72 | DRA-06-C | Sovereign Balance | aurodrax | A | review | 1 x 4 | 3 (valid, blocked) | 12 | 0 | - | - |
