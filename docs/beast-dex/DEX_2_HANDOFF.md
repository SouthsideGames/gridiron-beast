# Beast Dex 2.0 — implementation checkpoint

Branch: `codex/beast-dex-2`. Do not merge before the owner's review.

## Implemented behavior

- Main Dex opens Species View; roster's species detail opens My Beast View.
- Four keyboard-accessible tabs, with one sticky portrait. Revealed evolved forms can be selected in Species View.
- Existing species descriptions remain the fallback. `src/dex/content.js` supplies stage-specific editorial content.
- Flaroo / Blazynx / Infernox use family ID `emberfox`. New biographies, personality development, fun facts, nine lore entries, and three reciprocal family relationship drafts are included. These are NEW DRAFTS, not a recovered copy of the previous chat's approved prototype.
- Other forms retain their actual existing descriptions. Relationships involving Spriglet, Cindruff, and Pyroclast have matching reciprocal drafts. No other expanded biographies have been authored.
- Natural scouting uses the authoritative form's starting attribute bands, declared below-band weaknesses, build identity, and the existing football / Clash ability explanations. Exact mechanics remain sourced from the existing registry; no ability effects are changed.
- My Beast uses existing career profiles and timeline records, with evolution history, attributes, statistics, and a stable cosmetic quirk derived from individual identity.
- Portrait taps emit cosmetic text reactions. Rare reactions have a 5% chance using UI randomness, independent of simulation RNG. The portrait dispatches `beast-dex-reaction` with `{ rare, reaction }` for visual animation work. Actual animation choreography is not implemented.
- Species knowledge counts once per family per completed owner football game if at least one individual appears in the played lineup. Multiple family members do not multiply credit. Reserve practice, opponent appearances, and Clash do not count. This counting interpretation should be included in owner acceptance review.
- Knowledge uses franchise/game identity for deduplication, survives in the global Dex and franchise save, and merges by event union. Thresholds: 5, 15, 30. No historical games are invented or backfilled. Lore is cosmetic, with no mastery cosmetics or gameplay rewards.
- Developer → Beast Dex Reviewer covers all forms from the actual catalog (currently 192 families / 222 forms, not 500 distinct live entries). Filter by component/status; preview species or real/sample My Beast; preview 0/5/15/30 games; audition each form's cry.
- Six independent component verdicts and notes, per form. Notes are saved on change/navigation/export. Export includes session feedback even when storage fails. Verdicts return to pending when the reviewed payload changes. No franchise unlocks are modified by previews.
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
- Review the three new Flaroo-family drafts with the owner before using their exact prose as the production standard. Other expanded content remains an editorial backlog.

## Remaining work

Full-catalog biography/lore/relationship authoring and review; complete art/animation presentation; localization of new UI/editorial copy; integration with existing audio review notifications if requested; browser/device QA and full release validation. No merge or published game-link update has been performed.
