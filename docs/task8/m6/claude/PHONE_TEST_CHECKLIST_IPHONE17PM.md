# iPhone 17 Pro Max testing checklist for the final Task 8 preview

**Phone performance is not verified.** No Task 8 build has been measured on a phone. The CPU figures are from a cloud server and
the frame-time figures from a headless desktop browser. This list is how to produce the phone result; until you send it back,
the §14 gates (60 FPS target, selectable 30 FPS mode) stay open.

About 35 minutes. Parts A to D need only the phone. Part E needs a Mac and a cable and gives numbers.

## A. Set up (3 minutes)

- [ ] Note the iOS version (Settings → General → About).
- [ ] **Low Power Mode off** (Settings → Battery). When it is on, Safari draws at 30 FPS and every result is wrong.
- [ ] Battery above 50%, unplugged, phone cool, other apps closed.
- [ ] Open the private preview **in Safari**, not inside the Claude app: Part E can only inspect Safari.
- [ ] Main menu: confirm the build label matches the one named in my report.
- [ ] Continue your existing preview franchise (this also checks the save carried over).
- [ ] Settings: Frame rate 60, Reduce flashes off, Reduce motion off.

One thing to know: on this phone Safari normally draws web pages at up to 60 FPS even though the screen can do 120. So 60 is the
most the game can show, and "smooth" below means no visible stepping at 60.

## B. Twelve scenes (20 minutes)

For each one write: **smooth**, **steps** (constant judder) or **hitches** (count the freezes you can see).

| # | Scene | How to reach it | Result |
| --- | --- | --- | --- |
| 1 | Ordinary football | Play a Sunday game: 5 runs, 5 passes | |
| 2 | Several abilities at once | The same game, any play where two or more ability banners show | |
| 3 | Overlapping fields | Developer → Ability Reviewer: Static Field, then Bloom Break, then Charge Strip | |
| 4 | Walls, guards and clones | Ability Reviewer: Stone Screen, Stormguard | |
| 5 | Delayed effects | Ability Reviewer: Meteor Impact | |
| 6 | Busy legendary play | Ability Reviewer: Landslide | |
| 7 | Beast Clash, ordinary | Tuesday encounter → Watch | |
| 8 | Beast Clash, heavy | Developer → Clash Reviewer: Twin Thunder, Riptide Charge, Falling Star | |
| 9 | Apex discovery panel | Developer → Task 8 test tools → Unidentified Apex prospect → Finish the scout report | |
| 10 | Auto through a week | HQ → Auto to Sunday. Write the longest freeze you notice | |
| 11 | Saving | Finish a game, return to HQ. Then switch to another app for a minute and come back | |
| 12 | Long session | Three games back to back. Slower at the end? Phone warm or hot? | |

Scene 3 is the one I most want: overlapping fields were the heaviest thing on the server, and this build changes that code.

## C. Settings (6 minutes)

Repeat scenes 1, 3 and 7 for each line.

- [ ] **Frame rate 30:** steady, and acceptable next to 60?
- [ ] **Reduce flashes on:** no bright full-screen flash on a touchdown or in the Apex panel.
- [ ] **Reduce motion on:** nothing essential disappears.
- [ ] **Low Power Mode on, Frame rate 60:** the game still plays correctly, only less smoothly.

## D. Fit and touch (3 minutes)

- [ ] Portrait and landscape: nothing sits under the Dynamic Island or the home bar.
- [ ] Monster page: the three bars and the Football / Beast Clash switch fit on one screen.
- [ ] Post-game rows (XP, training, mastery, grade): readable without sideways scrolling.
- [ ] Every button in the Clash lineup screen is easy to hit with a thumb.

## E. Numbers, with a Mac (optional, 10 minutes)

1. iPhone: Settings → Apps → Safari → Advanced → **Web Inspector** on.
2. Connect the cable. Mac: Safari → Settings → Advanced → "Show features for web developers".
3. Mac: Develop menu → your iPhone → the preview page.
4. Timelines tab → record 20 seconds each of scenes 2, 3, 7 and 10.
5. For each recording note: frames over 16.7 ms, frames over 33 ms, and the longest frame.

Pass marks I would use, for your decision: at 60, no more than 1 frame in 20 over 16.7 ms during play and none over 50 ms; during
Auto, no freeze over a quarter of a second.

## What to send back

- iOS version, and whether you used Safari or the Claude app.
- The table in Part B filled in, and the Part C and D ticks.
- A screen recording of the worst scene (Control Centre → Screen Recording). It is the most useful single thing.
- Part E numbers if you did it.

## Still unmeasured after this list

- Any phone other than this one. An iPhone 17 Pro Max is the fastest iPhone there is; a pass here says nothing about a
  four-year-old phone or a mid-range Android.
- Battery use per hour at 60 against 30.
- Graphics-quality presets: none exist for players (deferred by your ruling).
