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
