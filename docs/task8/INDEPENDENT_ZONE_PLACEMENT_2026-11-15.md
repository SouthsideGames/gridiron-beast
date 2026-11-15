# Independent placement correction — v43.16.2-zone-placement

Owner request: choose each zone separately in multi-zone abilities; every football Zone ability must offer placement; repair Prepare Ready Zone in the Ability Reviewer. Supersedes the fixed-location exceptions and shared-pair placement in the earlier November 15 zone design.

- Bloom Break and Crosswind Rescue carry a stable per-part placement index. Zone 1 and Zone 2 have independent buttons, field overlays, saved choices, and AI choices. Both may choose the same lane, or different lanes. Same-lane patches retain their spacing; existing footprints and lifetimes remain.
- All 19 football Zone abilities offer coach placement, including Splashdown, Bramble Trap, Charge Strip, and Static Field. Full-width fields retain meaningful depth-band options. Other fields offer legal lateral lanes and compatible parent overlap choices.
- Splashdown's personal pass breakup now banks a Water patch for the next defensive scrimmage snap instead of creating it immediately at the whistle. This provides a real selection window. The bank survives an intervening offensive possession. Its three defensive-play lifetime starts at creation and includes that snap.
- The reviewer only considers the selected monster's zones when checking readiness or rendering controls. Another teammate's ready ability no longer stops preparation early.
- Prepare Ready Zone explicitly stages readiness in the isolated sandbox for Splashdown, Permafrost, and Shadow Patch, whose natural triggers cannot reliably be reached by every form in the bounded scenario. The UI labels this setup. Restart Test retains the natural replay path. Other prerequisites continue through actual staged plays.
- Updated exact Dex mechanics and reopened all 19 football zones with review revision 3. Existing notes are retained. Fortress Gate and Clash revisions remain unchanged.
- Includes the prior AI change from PR #116: varied, seeded choices from the same legal options, no preview RNG consumption, and no enemy pending-placement reveal until the snap. This branch is based on that commit and can be merged directly to main.

Validation: focused ability/field/placement/reviewer/notification/release tests, including every legal option in both directions and all 124 zone form/mastery configurations through selected placement and an actual snap. No full regression requested. Device layout and the existing published main link require the owner's post-publish review.

Publish the existing main game link from this branch after merging; preserve the existing origin and save/review storage. Do not replace the link or reset reviews or franchise saves.
