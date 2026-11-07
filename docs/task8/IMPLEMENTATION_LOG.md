# Task 8 implementation log

Branch `task8-implementation`. Nothing here is merged or published. The specification is **not closed**: items P1–P10 in
`DECISION_PACKET_FINAL.md` await the owner. Only work that depends on approved rules alone is built, and none of it is wired
into gameplay yet; the running game still uses `src/data/species.js`, the current engines and the current save format.

## Foundation modules (no gameplay wiring)

| Module | Work package | What it does | Rule source |
| --- | --- | --- | --- |
| `tools/build-beast-dex.mjs` → `src/data/beast-dex.generated.js` | WP1 | Builds a browser module from the four GitHub Dex JSON files, with sha256 source hashes; `--check` fails when the module is stale | GitHub Beast Dex is authoritative |
| `src/data/beast-dex.js` | WP1 | Frozen read-only lookups: families, forms (`family:stage`), abilities by mode, archetype, rarity order (Basic below Common), evolution; no hash fallback to another family | Dex data; APPROVED_RULES |
| `src/data/temper.js` | WP2 | The 25 Tempers, efficiency 2 / 1 / 0.5, uniform draw, Apex draws only the three neutral Tempers | Spec §3; round 1 item 14 |
| `src/core/fraction.js` | WP4 | Exact rationals with safe-integer guards; JSON-serializable | Spec §4, §15 |
| `src/franchise/reward-ledger.js` | WP4 | Awards once per activityID + monsterID, aggregates by monster rather than slot, resumes after interruption | Spec §15 |
| `src/lab/ability-catalogue.js` | WP10 | Lists all 144 abilities × forms × 4 mastery tiers (816 variants) and the 120 Basics without unique abilities, with a completeness check for both reviewers | Spec §13, §6 |

Tests: `tests/task8-foundations.test.js` (fast tier), including the generated-module drift check.

## Not built, pending the owner

Everything that depends on P1–P10 or on items still marked revise / clarify / pending in `DECISIONS.md`: ability effects,
pancakes, event ordering, return gameplay, Clash rotation, simultaneous-effect caps, evasion-dependent contracts, reward
amounts, the level-XP curve, and the reviewer scenario and rendering layers.
