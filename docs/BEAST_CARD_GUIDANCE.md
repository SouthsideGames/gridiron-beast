# Beast card tutorial polish

## Current behavior (v43.28.1)

Meet Your Team outlines the beast portrait/name controls on the assignment screen. All eligible beast-open rows are marked; Compare and Start are not highlighted. Yellow guidance now has a more visible breathing outline and glow. Reduced Motion keeps a static outline.

Meet Your Coaches highlights HQ when the player is in Roster, an assignment screen or a beast card. The highlighted HQ tab opens HQ itself, bypassing a remembered subpage during this lesson. On HQ, the real Coaching Staff button is outlined. The Show Me Where shortcut is still available. Outside this lesson, normal tab history is unchanged.

Know Your Beast now has four scroll-triggered modal stops instead of small floating tips:

1. **Bio:** birthplace and clubs played for.
2. **Temper and Abilities:** training efficiency and special moves.
3. **Ratings:** comparing beasts and choosing starters.
4. **Statistics:** season, career and individual-game performance.

The normal sheet pauses background scrolling and provides focus trapping, Continue, close, Escape and native Back dismissal. After dismissal, the player continues scrolling from the same place. Only one stop can be open; other sheets take priority. Section ranges extend beyond short headings so a normal scroll past a heading still finds its section. Fast scrolling does not queue old stops or move the page automatically.

Acknowledgments are saved in guide.cardTourSeen, separately from the previous small tips. This lets players still on Know Your Beast see the revised tour even if they saw the old tips. A stop is recorded only when dismissed. Navigation cleanup closes an unread popup without acknowledging it. Acknowledged stops do not repeat across beasts or reloads. The Guidebook keeps all four explanations.

The tour remains limited to Know Your Beast. It never enrolls existing unguided saves and does not reopen after the first football game. Stats, randomness, assignments and lesson completion are unchanged. All new copy is in src/text/en.js.

## Validation

- 40/40 targeted tests passed: guided-week, central-text, release-stamp and phone-navigation.
- Regression checks cover assignment targets; HQ-first coaches routing and bypassing remembered subpages; tour scope; section selection after passing a heading; dismissal; acknowledgment persistence; old-tip compatibility; modal priority; cleanup without acknowledging unread content; unchanged tutorial index and RNG.
- The guided-week browser harness now checks all four modal stops, the page scroll-lock class, no repeat after dismissal, HQ-to-coaches navigation and card highlights at 320, 390 and 440 px.
- Browser execution remains pending: Chromium fails to launch because socket() is denied in this environment. No emulated or real-phone visual pass is claimed.
- No full regression suite was run for these tutorial UI changes. No merge, deployment or Capacitor installation was performed.
