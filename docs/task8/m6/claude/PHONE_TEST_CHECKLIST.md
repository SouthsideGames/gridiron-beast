# Physical phone testing checklist

**Nothing in Task 8 has been measured on a phone.** Every frame-rate figure recorded so far is from a desktop or a headless
browser. This list is what to run on a real device so the §14 gates (60 FPS target, selectable 30 FPS mode) can be judged.

## Before you start

- Device, OS version and browser (for example: iPhone 13, iOS 18, Safari). One recent phone and one older phone if you can.
- Battery above 50%, not charging, Low Power Mode **off** (it caps Safari at 30 FPS and would hide the result).
- Open the private preview, confirm the build label on the main menu, and continue an existing franchise.
- Settings: Frame rate 60, Reduce flashes off, Reduce motion off.

## What to watch for

"Smooth" means motion without visible stepping. A "hitch" is a single freeze you can see (longer than about a tenth of a second).

| # | Scene | How to reach it | Record |
| --- | --- | --- | --- |
| 1 | Ordinary football play | Play a Sunday game, several run and pass plays | Smooth / steps / hitches (count in 10 plays) |
| 2 | Several abilities at once | A game where both clubs have ability monsters; or Developer → Ability Reviewer, any multi-ability play | Same |
| 3 | Overlapping fields | Ability Reviewer: Static Field, Bloom Break, Charge Strip (fields on the turf) | Same; note whether the field art itself stutters |
| 4 | Summons, walls and clones | Ability Reviewer: any ability that puts a wall, guard or clone on the field (for example Stone Screen) | Same |
| 5 | Delayed effects | Ability Reviewer: Meteor Impact; Clash Reviewer: Falling Star | Same |
| 6 | Busy legendary play | Ability Reviewer: any legendary (Stormguard, Landslide) | Same |
| 7 | Beast Clash, ordinary exchange | Tuesday encounter, Watch | Same |
| 8 | Beast Clash, heavy ability | Clash Reviewer: Twin Thunder, Riptide Charge | Same |
| 9 | Apex discovery panel | Developer → test tools → unidentified Apex → finish the report | Smooth reveal? any flash that bothers you? |
| 10 | Auto through a week | HQ → Auto to Sunday | Longest freeze you notice |
| 11 | Saving | Finish a game and return to HQ; then switch apps and come back | Any freeze at the save; anything lost on return |
| 12 | Long session | Play three games back to back | Does it get slower or hotter? |

## Then repeat scenes 1, 2, 3 and 7 with

- [ ] Frame rate 30: is it steady, and is the difference from 60 acceptable?
- [ ] Reduce flashes on: no bright full-screen flash on a touchdown or in the Apex panel.
- [ ] Reduce motion on: nothing essential disappears.
- [ ] The phone rotated, and with the notch or home bar: nothing is cut off.

## If you can attach the phone to a computer (optional, gives numbers)

- iPhone: Safari → Develop → the phone → Timelines, record 20 seconds of scene 2 and of scene 7.
- Android: Chrome `chrome://inspect` → Performance, same recordings.
- Note the share of frames over 16.7 ms and over 33 ms, and the longest frame.

## What to send back

For each scene: device, setting, smooth / steps / hitches, and anything that looked wrong. A screen recording of the worst scene
is the most useful single thing.

## Still unmeasured after this list

- Battery drain per hour at 60 against 30 FPS.
- Devices you do not own.
- Graphics-quality presets: none exist for players (deferred by your ruling), so there is nothing to compare.
