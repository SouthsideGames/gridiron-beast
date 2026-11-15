# Player language standard

Target fifth-grade reading level for player-facing explanations across the game. Use direct, respectful language rather than baby talk.

- Explain what happens, when it happens, and the important cost or limit.
- Prefer one or two short sentences before expandable details.
- Use “teammate on the bench,” “switch out,” “heal,” “hit back,” and “wait for an ability to recharge” instead of internal engine terms.
- Explain named effects in context: Guarded means taking less damage; Empowered means dealing more damage.
- Preserve conditions, targets, uncertainty and tradeoffs. “Try to” must not become “always.”
- Keep precise numbers and full exception rules available under View details. Do not change gameplay to simplify its explanation.
- Use the same shared explanation wherever the same rule appears. Include new copy in translation exports.

First implementation pass: all 72 Beast Clash abilities now have shared brief explanations through abilityInfo. The longer ability story is moved into the expanded details on shared Clash cards. Exact rule sections remain unchanged. Summary changes invalidate the relevant Dex review verdict.

Remaining game-wide audit: football ability summaries, Clash onboarding and status help, training/mastery/evolution explanations, roster attributes and scouting, franchise contracts and salary cap, notifications/errors/tutorials. Developer diagnostics may retain technical terminology; ordinary player flows should explain the practical meaning first.

Full browser/device review and semantic review of simplified copy remain required before release. This change does not publish the private preview or merge main.

## Central-file review — November 14, 2026

Reviewed the central English table and rewrote 100 entries in src/text/en.js. Changes cover menu/settings help, onboarding, contract renewals, salary-cap warnings, scouting, clock controls, training and attribute help, captain requirements, Clash rules/switching/statuses, career records, field bonuses, save/backup warnings, free agency/trades, Board goals, and Hall of Fame requirements.

All permanent keys, fixed names, inserted-value placeholders, plural forms, and HTML formatting are preserved. Developer diagnostics, proper names, balance formulas, log identifiers, and comic dialogue were not globally replaced. Existing legacy or conflicting rule text was not silently changed into a new gameplay rule.

Regenerated docs/text/GAME_TEXT.csv with the repository export tool. This also refreshes its inventory of recently added Dex content; the large CSV diff is generated inventory, not thousands of rewritten player lines.

Validation: 19 central-text, style, saved-line, and text-never-decides tests passed. The latter verifies a franchise season and 120 Clash battles. A separate before/after check confirms unchanged keys, fixed names, placeholders, and HTML. Export --check passes. The complete release suite and device review must be rerun on the final preview build.

Publish the branch to the existing private Beast Dex preview, not the main game or shared test link. Keep PR #114 unmerged.

## Detailed rules and Beast Dex review notifications

- The shared ability display now runs all seven detail sections for every one of the 144 abilities through the vocabulary/punctuation presentation layer in src/text/ability-rules-plain.js. Clauses are shown as bullets, with a glossary for turn timing, benches, shared effects, recharge, and numeric lists. Both Developer ability reviewers use the shared ability cards too.
- Engine contracts and their original rule data are unchanged. New readable-rule translation keys coexist with the original source keys. Exact numeric-token preservation is tested for all 1,008 sections; this is a mechanical safeguard, not a substitute for semantic/editorial review. The same vocabulary transformations are reused across all rules; the complete ability contracts have not been replaced with independently authored summaries.
- Dex component fingerprints include the displayed wording revision, so changed football/Clash details require another review without changing unrelated components.
- Beast Dex now participates in reviewQueue, menu/More/Developer badge totals, Developer notice cards, one-time announcements, and targeted reviewer navigation. Counts are per form (222 total), not six copies of every form. Any component needing revision marks its form for revision; a form is approved only when all six current components are approved.
- Existing on-device Dex reviews remain readable. New verdicts mirror to beast_dex_reviews using the existing cloud-review API, with one document per form/component. Startup sync merges by updatedAt and uploads local-only reviews. Existing play, football, and Clash review collections are untouched. Cloud storage is still scoped by the host game artifact; a different preview artifact does not automatically share main's data.
- Local-storage failure remains visible and feedback can be exported. A cloud connection is not assumed; it must be tested on the real hosted main game.
- The owner has explicitly authorized Claude to merge the finished branch to main and update the existing main game link after validation. Do not require another design approval. Preserve the existing main artifact identity, saves and review collections. This authorization does not automatically mark any content or motion approved.
