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

## Claude: visual polish, motion and QA (2026-11-14)

Preview build `v43.14.0-dev.dex2`, commit `c1caf29`, published as a test build (`test: true` in the published `src/version.js` only)
to a separate private Beast Dex 2.0 link, https://claude.ai/artifact/XjRp8wPrCxenG8wCwKXvgK (the main game link and the shared test
link are unchanged). PR #114 stays a draft until the owner approves merging.

### What changed
- **Profile presentation** (`src/ui/screens/dex.js`, `styles/app.css` "Beast Dex 2.0"): Species View (blue) and My Beast View (gold,
  star badge, nickname, level) are distinct; the portrait sits in an element-tinted pixel stage, stays on screen while reading and
  shrinks once the reader scrolls (two-thirds or more of the sheet stays for text at 320 px, 82% at 440 px); segmented tabs; facts grid;
  attribute bars (My Beast: current rating against the form's natural starting band); evolution chain with tappable forms; lore cards
  with locked progress bars that show only the threshold and games left; relationship cards (kind, related sprite or silhouette).
- **Abilities**: each ability opens with its readable scouting line (sentence-cased), then "Exact mechanics — View details" for
  football and Beast Clash alike. No ability text or value changed.
- **Motion** (`src/ui/dex-motion.js`): idle, tap and rare reactions per form from its sprite body plan, drawn features, look, size,
  stage and Dex temperament; driven by the `beast-dex-reaction` hook; Web Animations cancelled on the next reaction and on close; idle
  loops are CSS and stop with the element; off under the system preference or the game's reduced-motion setting (text still shows).
  Serpents, blobs and shelled forms never hop on legs; only winged forms take off. The reviewer prints each form's motion line, and a
  visuals verdict now covers the motion (its fingerprint includes it).
- **Sheets**: Escape closes the top Dex sheet only; focus returns to the opener; keyboard openings focus the first tab, touch
  openings the dialog; one listener controller per scroll host, aborted on rebind, close and route exit.
- **Reviewer**: sticky Prev/Next with a six-component status strip, filters collapsed into one line, segmented View and Lore-games
  controls, verdict cards with autosave state and a note when changed content returned a verdict to pending, and a persistent
  storage-failure warning.
- **Fixes**: knowledge keys in the franchise save no longer embed the per-run franchise uid (the shared Dex adds the franchise when
  merging; an unattributed id never counts): `text-never-decides` was failing on the branch for this reason. Habitat repeated the
  first fun fact; the template development line repeated Personality (now hidden in the Dex, labelled in the reviewer). A beast that
  joined already evolved said "No evolutions yet". Two inherited Title Case failures. Four repeated adjectives in drafts. The Dex 2 sheet had dropped the old sheet's
  gameplay lines (collection status and number on your roster, cornerstone, "from week", legendary unlock / Legend Tracks, "you
  have seen this species evolve"), which left 13 `src/text/en.js` lines unused and failed `central-text`; they are back in the new
  layout (Profile facts grid and "Where to find it", Evolution note).

### Checks
- Full suite on `e78c853`: 2,165 of 2,166 passed; the one failure (`central-text`, the dropped lines above) also fails on ChatGPT's
  `b7ce1f8` and is fixed in `c1caf29`. Full suite on the preview commit `c1caf29`: 2,166 of 2,166 passed. Deploy check on the preview folder: everything passes except "BUILD.test is false", which is
  expected for a test build.
- `node tools/audit-dex-content.mjs --require-complete`: 222/222. Targeted tests: dex-2, dex-text, task8-dex-collection, and the new
  `tests/dex-2-integration.test.js` (counting rule through replay/reload/import/cloud merge; no locked lore, title or relationship
  at 4/14/29 for any form; profiles and reviewer previews write nothing; samples have no career; motion matches anatomy).
- Browser (Chromium, 440×956 touch, plus 320, 375, 390, 820, 1280): 25 scripted checks (rendering of all 222 forms in both views,
  context opening, view/form switching with the right individual's ratings, keyboard tabs, Escape and focus, multiple sheets, cries
  per stage with mute/volume and stop on close/route exit, reduced motion, 25 open/close cycles with no extra listeners, animations
  or audio, reviewer notes/verdicts through every navigation, export, content-change invalidation, storage failure, real vs sample
  beasts, previews changing nothing). Layouts have no horizontal overflow and no touch target under 40 px.

### Needs the owner's decision
- **Template writing**: 208 forms' "personality development" line only restates Personality (hidden for now); the lore titles are
  the same three for every templated form ("Getting to know X", "Behind the routine", "A closer bond"); the rare reaction reuses the
  second fun fact word for word in 208 forms. Writing distinct lines is substantial new content and awaits the owner.
- **Basic families' theme**: many Basic drafts share one arc (being judged by appearance, then understood); the 5- and 15-game Basic
  lore entries are single short sentences.
- **Clash scouting lines** are the registry's short summaries, sentence-cased; plain-language Clash explanations would be new copy.
- **New UI copy** is English only (not yet in `src/text/en.js`).
- **Knowledge storage** grows about 12 KB per franchise season (0.3% of a 3.8 MB save); a cap at 30 per family would bound it if wanted.

## Claude: plain-language pass validation (2026-11-14, evening)

Preview build `v43.14.1-dev.dex2`, commit `d714e25`, published as a test build to the same private Beast Dex 2.0 link
(https://claude.ai/artifact/XjRp8wPrCxenG8wCwKXvgK); main game link and shared test link unchanged. Builds on ChatGPT's
`0a9e07b`–`20eb0de` (72 plain Clash explanations in `src/text/clash-simple.js`, simpler central text in `src/text/en.js`,
regenerated `docs/text/GAME_TEXT.csv`, `docs/beast-dex/PLAYER_LANGUAGE.md`).

### Fixes
- The Beast Clash arena's tap caption (translated view) read the engine mechanic line; it now uses the same plain explanation.
- In the native arena view (the game's normal path) tapping a fighter showed the raw ability id (e.g. `FIR-01-C`); it now shows the
  ability name and plain line. One helper, `clashMove`, serves both views. Display text only; the engine and choreographer read
  names and ids, not this text.

### Checks
- Full suite on `d714e25`: running at the time of this note; the result is recorded in PR #114 and below when it finishes.
- `node tools/audit-dex-content.mjs --require-complete`: 222/222. `python3 tools/text-export.py --check`: current.
- Deploy check on the preview folder: all pass (461 files, version and label, 3 saves load) except the expected "BUILD.test is false".
- Every changed `en.js` line keeps its placeholders and HTML tags; 19 lines whose number words differ were read side by side and keep
  the same rules (the differences are the word "one" used as a pronoun, or a number now spelled once instead of twice).
- Browser (Chromium, preview build): a fresh preview with nothing discovered reaches Developer → Beast Dex Reviewer (Next through all
  222 forms) and Developer → Beast Dex (everything revealed) (all 192 families, all 222 forms); discovery and knowledge stay empty,
  including after a reload. The Dex shows the plain line for all 72 Clash abilities, with exact rules under View details; monster
  details (roster) and the arena caption show the same plain line. At 320, 390 and 440 px: 32 screens plus the Clash help sheet,
  a monster sheet and a sheet of all 234 changed lines show no horizontal overflow, clipped text, unfilled placeholders or visible tags.

### Still open
- Football ability summaries are still the dense engine wording (all 72 use `SPECS[...].expect`, about 21 words on average), and the
  football "Full rules" sections read like engine notes; the plain-language pass has not reached them.
- The Clash help sheet repeats "An exchange is one round of actions." in two consecutive paragraphs.
- The Dex tab that holds both abilities is labelled "Football"; the Beast Clash ability sits under it.
- Clash review verdicts return to pending for all 72 Clash abilities because the plain line is part of what a Clash verdict covers.
