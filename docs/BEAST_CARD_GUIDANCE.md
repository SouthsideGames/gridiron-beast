# Beast card tutorial polish

New-player guidance now outlines the beast portrait/name controls on the assignment screen during Meet Your Team. All eligible beast-open rows are marked; Compare, Start and the Roster tab are not highlighted on this screen. Existing Reduced Motion styles keep the outline without pulsing.

During Know Your Beast, scrolling into Overview, Level/XP, Mastery, Health, Temper, Abilities or Ratings shows one short dismissible tip above the tab bar. A tip is marked seen when displayed and saved with the franchise. Scrolling back, changing beasts and reloading do not replay seen sections. Scrolling quickly skips past sections instead of queuing messages. Sheets take priority. Navigation and rerenders remove the listeners, timer and tip.

Section explanations are also available in the Guidebook after the beast-card lesson becomes available. All new copy is in src/text/en.js. The tutorial still ends at the first football game; these tips do not change stats, randomness, lineup assignments or lesson completion.

## Validation

- 32/32 targeted tests passed: guided-week, central-text and release-stamp.
- New tests cover assignment targets, tutorial scope, viewport section selection, dismissal, once-only persistence, sheet priority and lifecycle cleanup.
- The guided-week browser harness now checks assignment highlights and a scroll-triggered Ratings tip at 320, 390 and 440 px.
- Browser execution is pending: local Chromium cannot launch because socket() is denied by this environment. No emulated or real-phone visual pass is claimed.
- No full regression suite was run for this tutorial UI change. No merge, deployment or Capacitor installation was performed.
