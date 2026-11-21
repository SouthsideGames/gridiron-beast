# Compact roster screen

Build: v43.34.0-compact-roster. Based on merged main `483204e` (PR #147).

- Roster Search & Filters starts closed. Search, Team Needs, Clear Filters and the result count remain inside. Saved filters are retained; a Filters On badge stays visible when a saved/current filter is active. Other screens' search panels are unchanged.
- Shortlist and Saved Lineups have a left-aligned flex container with consistent gaps. Lineup and Depth use the same gap; the groups have vertical separation so borders no longer touch.
- Reserves & Specialists and Development Slots are native disclosures, initially closed. Manual expansion survives roster redraws while changing sides or development picks. Entering the screen again starts them closed.
- A square 44px info toggle sits beside Best Lineup. It reveals/hides the scheme explanation, partnership details, starter/cornerstone/gold-outline instructions and package-use explanation. Those sections no longer occupy space in the default view. The toggle updates aria-expanded and retains its setting during same-visit redraws. Warnings and actionable notices remain visible.
- Development copy is reduced to: “Train backups age 25 or younger here. After a game they don’t start, they earn +12.5 level XP and 6.25% of a training bar. Level 50 beasts gain training only.” Amounts are read from reserveAward(), not duplicated constants. Eligibility, Apex exceptions, slot limits, selections and rewards are unchanged.

## Validation

```
node --test tests/compact-roster.test.js tests/franchise-polish.test.js tests/phone-navigation.test.js tests/guided-week.test.js tests/central-text.test.js tests/release-stamp.test.js tests/text-style.test.js
```

65/65 passed; no failures, cancellations or skips; 8.1 seconds. New checks cover closed Search with retained filters and active indicator, grouped shortcut markup, default-closed panels, expansion across redraws and reset on re-entry, repeated info toggles, accessibility state, unchanged development selection/team/save state, and concise copy with the exact reward amounts. Existing guided-week/navigation and shared filtering tests pass.

Syntax, release stamping and git diff whitespace checks pass. No gameplay or save format changed. No full suite or balance study was run. The full-suite approval gate remains pending.

Browser/phone visual review was not run here; this environment previously blocked Chromium socket creation. Check narrow portrait, short landscape and Larger Text, the four top buttons' spacing, Best Lineup plus info, native disclosure tapping, filtering while collapsed and development picks while expanded. Draft only; nothing merged, deployed or installed.
