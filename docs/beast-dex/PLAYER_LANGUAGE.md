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
