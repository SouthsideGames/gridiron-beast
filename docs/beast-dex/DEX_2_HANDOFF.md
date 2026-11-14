# Beast Dex 2.0 — implementation checkpoint

Branch: `codex/beast-dex-2`. Do not merge before the owner's review.

## Implemented behavior

- Main Dex opens Species View; roster's species detail opens My Beast View.
- Four keyboard-accessible tabs, with one sticky portrait. Revealed evolved forms can be selected in Species View. An owned-species selector switches between Species View and each real My Beast entry without modifying the roster.
- `src/dex/content.js` supplies stage-specific editorial content for every current form. Existing canonical descriptions are retained as the anchor of new base-form biographies. The fallback remains for future species added without editorial records; the strict release content audit rejects missing current entries.
- Flaroo / Blazynx / Infernox use family ID `emberfox`. New biographies, personality development, fun facts, nine lore entries, and three reciprocal family relationship drafts are included. These are NEW DRAFTS, not a recovered copy of the previous chat's approved prototype.
- Other forms retain their actual existing descriptions. Relationships involving Spriglet, Cindruff, and Pyroclast have matching reciprocal drafts. Expanded stage-specific drafts now also cover Spriglet / Floracat / Sylvanyx, Cindruff / Magmaul, Pyroclast, Aquip / Aquarrel / Abyssin, and Muddlet / Sludgeon. The full live catalog is now drafted: 222 expanded form entries across all 192 families, including all evolved forms and Basics. There are 444 biography paragraphs and 666 milestone lore entries. No current form relies on the existing-description fallback.
- Natural scouting uses the authoritative form's starting attribute bands, declared below-band weaknesses, build identity, and the existing football / Clash ability explanations. Exact mechanics remain sourced from the existing registry; no ability effects are changed.
- My Beast uses existing career profiles and timeline records, with evolution history, attributes, statistics, and a stable cosmetic quirk derived from individual identity.
- Portrait taps emit cosmetic text reactions. Rare reactions have a 5% chance using UI randomness, independent of simulation RNG. The portrait dispatches `beast-dex-reaction` with `{ rare, reaction, familyId, stage }` for visual animation work. Actual animation choreography is not implemented.
- Species knowledge counts once per family per completed owner football game if at least one individual appears in the played lineup. Multiple family members do not multiply credit. Reserve practice, opponent appearances, and Clash do not count. This counting interpretation should be included in owner acceptance review.
- Knowledge uses franchise/game identity for deduplication, survives in the global Dex and franchise save, and merges by event union. Thresholds: 5, 15, 30. No historical games are invented or backfilled. Lore is cosmetic, with no mastery cosmetics or gameplay rewards.
- Developer → Beast Dex Reviewer covers all forms from the actual catalog (currently 192 families / 222 forms, not 500 distinct live entries). Filter by component, status, element, name, or content coverage; preview species or real/sample My Beast; preview exact lore boundaries; audition each form's cry; preview normal and rare reactions deterministically; jump among family forms. The active tab is preserved across reviewer selections.
- Six independent component verdicts and notes, per form. Notes are autosaved after typing and flushed on change/navigation/export/route exit. Export includes session feedback even when storage fails. Verdicts return to pending when the component-specific reviewed payload changes. Compact revision digests avoid storing repeated biography and ability payloads in limited device storage. Older fingerprint formats return to pending while retaining notes. No franchise unlocks are modified by previews.
- Existing Monster Cry Reviewer is retained. Its review store and this store remain separate; Dex audio approval does not automatically approve the cry review queue.

## Claude: visuals and testing

Work on this branch. Preserve functionality and authoritative gameplay values.

- Style the tab list, sticky portrait, readable scouting, lore cards, relationship cards, and reviewer controls for iPhone and desktop. Review portrait height and scroll behavior on small screens.
- Add sprite-compatible idle/tap/rare reactions through the existing portrait hook; respect reduced motion. Do not infer limbs or movements from type alone.
- Verify cry stops on close/route changes, evolved cries match selected form, and audio respects mute/volume.
- Verify keyboard focus, Arrow/Home/End tab navigation, tab labels, touch targets, screen-reader feedback, and multiple open sheets.
- Verify an actual roster beast and a sample preview separately. Samples must never acquire invented personal accomplishments.
- Test lore boundaries at 4/5, 14/15, 29/30; multiple individuals; replay/reload; save export/import; cloud union; blocked/full storage.
- Test review edits through form switches, view/lore/filter changes, export, and content revisions. Approvals are component-specific.
- Review the three new Flaroo-family drafts with the owner before using their exact prose as the production standard. The rest of the catalog is fully drafted and remains subject to the same editorial review. Completeness is not approval of prose or animation fit.

## Content pipeline

- Run `node tools/audit-dex-content.mjs` to validate expanded drafts and print coverage.
- Add `--json` for the exact missing form IDs, or `--require-complete` for a strict release content gate.
- `src/dex/content/linked-families.js` holds the initial connected-family batch; six further paired-element modules cover every remaining family. Each authored row explicitly supplies two narrative paragraphs, personality, two facts, three lore beats, and a normal reaction. `catalog-format.js` binds those records to authoritative names, forms, regions, milestones, and a rare reaction. `src/dex/content.js` retains Flaroo and the curated relationship registry.
- Every expanded form needs at least two biography paragraphs, personality, habitat, two fun facts, personality development, lore at exactly 5/15/30 games, and normal/rare text reactions. Relationships are optional, capped at three, use real family IDs, and require reciprocal entries. Legendary folklore is explicitly a story, not a gameplay rule.
- The audit checks schema completeness and references; the owner and Claude still review prose quality, visual fit, gameplay accuracy and world consistency.

## Remaining work

Full-catalog editorial approval and any requested revisions; complete art/animation presentation; localization of new UI/editorial copy; integration with existing audio review notifications if requested; browser/device QA and full release validation. No merge or published game-link update has been performed.

## Full-catalog checkpoint

- 192 live families, 222 live forms, all 222 expanded; 0 missing drafts.
- 444 biography paragraphs and 666 lore entries at 5/15/30 games.
- The original 500-monster design target is not the live repository catalog. No unnamed or absent monsters have been fabricated to reach that number.
- The completeness gate, reference checks, distinct-profile check, and all-form lore-boundary tests pass. A regression caught and fixed a 30-game lore leak through development notes; development now reads always-visible character information instead.
- All new writing remains review drafts. Existing reviews invalidate only for affected content; no review verdict has been automatically approved.
- No balance values, positions, names, evolution levels, roster counts, music assets, or cry assets were changed by this content pass.
