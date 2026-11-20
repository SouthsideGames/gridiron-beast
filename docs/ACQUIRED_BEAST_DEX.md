# Beast Dex unlocks require acquisition

Owner ruling: 2026-11-20. Build v43.31.1-auto-camera-audio-dex, added to PR #145.

## Cause and behavior

Previously the Dex revealed any family marked `seen`: the entire creation/offseason draft class, regional scouting prospects and the Sunday opponent's roster. The menu and collection counters counted these sightings. This could fill much of the Dex without acquiring those beasts.

The player-facing Dex now uses acquisition records (`signed`) exclusively. Starting-roster beasts, drafted recruits, successful recruiting/signings, trades and inherited rosters on a successful GM job change count. Merely scouting, viewing or facing a beast does not unlock its entry or advance collection achievements. Acquired families stay unlocked after release, trade or retirement, and the collection continues to span the player's franchises.

Evolution forms now require an acquisition or evolution on the player's roster. Seeing an opponent's evolved form does not reveal it, even if the player owns the family's base form. Family totals remain 72 original, 120 Basic and 192 overall; evolutions do not add family counts. The internal `seen` tally name is retained for API/save compatibility, but both displayed tallies now count acquired families. Labels and collection achievement descriptions explain the ownership rule.

## Existing saves and cloud records

- Sightings remain as historical metadata, but sight-only entries relock automatically through the shared status/count functions. Nothing needs to be wiped.
- Existing `signed` stamps retain previous acquisitions, including beasts that have left the team.
- Old `forms` records mixed ownership and opponent sightings, so they cannot safely establish acquisition. New `ownedForms` records are separate. Loading a franchise rebuilds provable evolved forms from its current roster; cloud merging only imports explicit owned-form records for acquired families.
- Limitation: an evolved form acquired and lost before this update cannot always be reconstructed from old sighting-only stage metadata. Its family remains unlocked; the form may require reacquisition. Existing lore credits and already-awarded achievements/rewards are retained.
- The schema stays 10. No simulation, RNG, contracts, roster membership or match outcomes are changed by the migration.

## Validation

- Expanded affected run: **81/81 passed**, 0 failed/canceled/skipped, 59.3 seconds. Covers Dex, species, collection achievements, full first-game integration, save compatibility, GM careers, central text and release stamping.
- After adding the rendered-player-Dex regression and final wording, the affected subset passed **30/30**, 0 failed/canceled/skipped, 37.2 seconds. It verifies 192 sight-only silhouettes/0 unlocked, then 191 silhouettes/1 acquired entry.
- The prior PR #145 camera/audio areas were rechecked: **33/33 passed**, 0 failed/canceled/skipped.
- All three initial acquisition regressions fail against merged baseline `6030334`: sight-only collection inflation, legacy/cloud sightings unlocking entries, and roster migration retaining unowned evolved forms. The corrected tests pass on this branch.
- A real first-game integration asserts that playing and finishing football neither acquires the opposing roster nor increases collection completion. Existing save compatibility continues through encounters, multiple weeks, a full season and GM job changes.
- Existing tests that explicitly expected scouting/sightings to unlock entries were updated to the owner's new rule. Collection achievement tests now first see every species and assert that no collection achievement is earned, then acquire each group to verify the exact completion thresholds and one-time awards.
- `git diff --check` and the release-stamp check pass.

Full regression remains pending before approval. Browser/native review remains pending because Chromium cannot launch in this sandbox; no browser or real-device pass is claimed. Nothing was merged, deployed or installed.
