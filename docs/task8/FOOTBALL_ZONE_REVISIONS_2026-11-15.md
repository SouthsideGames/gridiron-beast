# Football ability and zone revisions — 2026-11-15

Approved by Kareem in the football ability review conversation. Build: **v43.16.0-zone-review**. This branch implements the revision; publishing the existing main Claude artifact remains a separate release step.

## Placement

All 19 football zone abilities return to Pending Review, preserving saved notes. The 10 revised non-zone abilities also require review again (29 revised football fingerprints total). Fortress Gate and all Clash review revisions stay unchanged.

After choosing a play, the match shows zones ready for that snap. Select a highlighted legal area or use Auto Place; the actual snap confirms the choice. Previews are read-only and do not consume charges or RNG. Selections are saved for the current snap, validated against legal option IDs, and discarded after use. Changing the play recomputes legal suggestions; stale choices use the coach fallback.

Lane suggestions intersect the owner's own movement paths and preserve each ability's backfield/front/LB/safety role. They never inspect an opponent's hidden assignments. Full-width zones offer short/middle/deep bands. Crosswind Rescue retains both sideline lanes and chooses their shared depth. Bloom Break moves its two patches into the selected lane with a one-yard lateral gap. Available compatible existing zones add overlap options. AI and simulated games use the same legal options and deterministic coach fallback.

Splashdown stays at its deflection spot. Bramble Trap, Charge Strip and Static Field retain their defining target/alignment placements. These still have Test Placement demonstrations, but do not offer arbitrary relocation.

The Ability Reviewer includes **Test Placement** for every zone. **Prepare Ready Zone** plays real staged prerequisites until a zone is ready (or an event zone has appeared). Kicker-earned zones first play their kick prerequisite, then switch to the defensive follow-up. **Snap / Confirm Placement** uses the same rules and UI controls as live games; **Restart Test** allows another placement. The sandbox does not write franchise progress or review verdicts.

## Zone duration

Counts are relevant team scrimmage snaps. A zone's creator need not remain on the field for its lifetime to count. Creation counts, except for Splashdown, which is created after the whistle and begins counting on the next relevant snap. Existing halftime rules and legendary exceptions remain. A previous active episode blocks a replacement from the same creator/ability; earned pending readiness is preserved.

| Ability | Plays at mastery 0 / 1 / 2 / 3 | Clock |
| --- | --- | --- |
| Impact Pyre | 3 / 4 / 5 / 5 | Owner defense |
| Burning Wake | 5 / 5 / 5 / 5 | Owner offense |
| Splashdown | 3 / 3 / 3 / 3 | Owner defense |
| Tsunami Line | 5 / 5 / 5 / 5 | Owner offense |
| Bloom Break | 3 / 3 / 3 / 3 | Owner offense |
| Bramble Trap | 3 / 3 / 3 / 3 | Owner offense |
| Charge Strip | 3 / 3 / 3 / 3 | Owner offense |
| Static Field | 3 / 3 / 3 / 3 | Owner defense |
| Frostmark | 3 / 4 / 5 / 5 | Owner defense |
| Permafrost | 3 / 3 / 3 / 3 | Owner defense |
| Runway | 3 / 3 / 4 / 5 | Owner offense |
| Crosswind Rescue | 3 / 4 / 4 / 5 | Owner defense |
| Shadow Patch | 3 / 3 / 4 / 5 | Owner defense |
| Blackout Pocket | 3 / 4 / 4 / 5 | Owner offense |
| Beacon Lane | 3 / 3 / 4 / 5 | Owner offense |
| Gear Grid | 3 / 4 / 4 / 5 | Owner defense |
| Bulwark Grid | 3 / 3 / 4 / 5 | Owner offense |
| Mind Bend | 3 / 3 / 4 / 5 | Owner defense |
| Echo Landing | 3 / 4 / 4 / 5 | Owner defense |

Zones remain at absolute field coordinates when the line moves. Hybrid previews name the recipe and shared lifetime when the parents share a clock; differing clocks are described as lasting while both remain. Actual hybrid footprints use the engine's recipe precedence and respect removed holes. Parent areas outside the overlap keep their original effects. Hybrids never gain an independent timer or restore a removed footprint.

## Other ability revisions

- **Shadow Patch:** dense smoke obscures monsters inside. On exit, non-Dark monsters on either team attempt rest-of-play Confused through the status gate: 20% Awareness loss and wrong-assignment movement. This replaces its former environmental Awareness penalty. Night Watch and harmful-status wards protect; cleansing removes the confusion. Manual QB controls are not redirected.
- **Night Watch:** all allied cornerbacks and safeties are protected from Dark-field Awareness loss and new Shadow Patch confusion while the source is able, regardless of distance. Multiple sources remain independently valid.
- **Ambush Tag:** keep the opposing running back target. Weakened applies on the current play and lasts two subsequent participating plays; bench time pauses the timer. Larger claw visual and ordinary status badge.
- **Landslide:** eligible front defenders move toward five yards beyond the original line, not five additional yards from each starting point. Once per possession, with existing resistance, obstruction and boundary rules.
- **Guiding Halo:** the next completed pass while ready shields its actual receiver anywhere. One fumble save, two subsequent participating plays, five subsequent participating offensive plays of cooldown. No radius gate; changed from Aura to Targeted effect.
- **Vanishing Cut:** dense shared-style Dark smoke at the juke. Existing tackle avoidance unchanged.
- **Dragon Call:** stronger pulse at the true radius, stronger recipient markers and cleanse flashes. Mechanics unchanged.
- **Hoard Flight:** a recorded post-whistle presentation trip carries the ball to the actual awarded spot. Outcome statistics and game elapsed time do not change. Camera follows the flight; spot label is shown.
- **Prism Break:** full bar stays Ready until a legal enemy zone exists. Check again after pending zones spawn, before the play. Spend only on legal removal and never twice on the same snap.
- **Iron Lungs:** qualified ally keeps protection for three participating defensive snaps, including qualification, after leaving range or after the source is substituted. No refresh within the same episode; copies do not stack. Every second protected play saves one ordinary stamina. Bench time pauses recipient duration.
- **Mirror Rift** replaces Mirror Step: one live pass is relocated per ball. Uniform choice among eligible receiver/defender vicinities and four open-grass options, with random player-vicinity offsets up to two yards on each axis. Destination stays between goal lines and inside sidelines. Ball vanishes for 0.15 seconds and provides 0.85 seconds airborne reaction time after return. Actual position and normal catching/interception checks decide the result, including catches by another receiver. Cooldown 6 / 5 / 4 / 3 subsequent defensive participating plays. Portals, camera follow and discontinuity-safe ball drawing make the relocation visible.

Exact descriptions are updated in the authoritative Dex source and regenerated runtime module. Reviewer explanations use the current zone contracts.

## Validation and limits

- Focused football ability, effect, reviewer, zone, description and release-stamp checks: 181 tests passed, with subsequent affected tests rerun after final text and sandbox adjustments.
- Ordinary play-engine safety set (engine, rules, QB reads, pursuit, zone intelligence, defensive fixes, type matchups, abilities, legendary plays, attribute trials and final-whistle reads): 100 tests passed.
- Zone integration tests exercise every offered placement for both clubs on offense and defense, preview purity, clocks with a benched creator, legal fallback, hidden-call independence, Steam and removed footprints, smoke/status gates, retained Iron Lungs, newly spawned Prism targets, all Rift outcomes and deterministic replay.
- Fixed-seed Mirror Rift study, 240 forced passing plays: 77 completions (58 to a different receiver), 10 interceptions and 153 incompletions. This confirms outcome paths, not overall season balance.
- DOM interaction QA: all 19 zone sandboxes opened, prepared their real prerequisites and ran three further real snaps without errors or invalid SVG values. Selection and replay were exercised. Actual field SVG was rendered for visual inspection.
- Release import closure and manifest scan passed. Version/import map stamping and generated Dex consistency passed.
- Full regression was intentionally not run under the requested focused workflow. This is not a claim that all repository tests passed.
- Headless Chromium could not start in this execution environment (socket permission restriction); DOM/SVG QA does not replace the requested iPhone visual review. That device review is still pending after publishing the existing main game link. No cloud save/reset/migration or deployment has been performed by this branch.
