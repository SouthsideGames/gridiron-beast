# Owner play-test feedback (UI), received during the balance implementation

Recorded 2026-11-25, 23:16. **Owner decision (23:17): these go in with the balance work, on this branch, done right after the balance phases (as an extra phase before the final report), whatever the balance report concludes.** Later UI feedback from the owner joins this list and is handled the same way.

## Roster: Depth chart
1. **Remove the captain ⓘ** next to a captain's species line (the ⓘ beside the "C" badge). It only says he is a captain, and the "C" already shows that.
2. **Fewer info buttons:**
   - Remove the ⓘ between **Best Lineup** and **Details**.
   - The ⓘ next to the cap pill ("30/38 · 498k room") takes over that button's job. Today it explains roster count and cap room; that explanation moves to **? Help** at the top.
3. **Apex monsters are not visible.** On the roster card:
   - the name in golden yellow;
   - a new **A** badge beside the **C** badge (both shown when an Apex is also captain: yellow name, C, then A).
4. **Redo the depth chart layout** (the owner's view: "it just doesn't look good"). Seen on an iPhone:
   - the fatigue % sits on top of the ⓘ, which sits on top of the position badge;
   - the overall number touches the ▲▼ buttons;
   - the top controls (Search & Filters, Shortlist, Saved Lineups, Lineup/Depth, cap pill, Best Lineup, Details) leave empty space on the left with most buttons pushed right.

## League News
5. **An AI club signing an Apex monster** should be a League News item. The owner wants to keep an eye on that club.

Screenshots: four iPhone captures, 11:04–11:14 (Roster depth chart offense and defense, HQ League News, and the depth chart with fatigue %).

## Status (2026-11-26): done
| # | Change | Where |
|---|---|---|
| 1 | No ⓘ beside a captain's "C" badge anywhere, and none inside a depth-chart row (polish.js skips `.cap-badge` and `.dc-row`). | src/ui/polish.js |
| 2 | The ⓘ between Best Lineup and Details is gone (also from the Lineup view). The cap pill has no tooltip ⓘ now; the ⓘ beside it opens the lineup notes the old button opened (scheme locks, captain partnerships, package players). The roster-size and cap-room explanation is a new **? Help** topic, "Roster size and cap room", first-listed on the Roster screen after "Your roster". | src/ui/screens/roster.js, src/franchise/assist.js, src/text/en.js |
| 3 | A discovered Apex shows a gold name and a gold **A** badge after the **C** (depth chart, lineup slot card; gold name in the reserve list, which already carries the Apex emblem). An Apex the owner has not discovered looks ordinary, as before (discovery rules unchanged). | src/ui/apex-ui.js (`apexBadge`, `apexNameClass`), roster.js, styles/app.css |
| 4 | Depth chart redone: each row is number · sprite · name over a second line (species · C · A · slot tag · fatigue %) · overall · ▲▼, with a gap between the overall and ▲▼. Nothing overlaps at 390 px (emulated) or on desktop. Top controls: Lineup and Depth share the row, the cap pill and its ⓘ sit at the right (they take their own full row on a narrow screen); Best Lineup and Details fill the width as two equal buttons. Lineup slot badges (C, A) moved to the card corner so they no longer cover the slot label. | styles/app.css, roster.js |
| 5 | League News: an AI club signing an Apex is always a news line, "Apex signing: …", ranked high. **Choice:** only for an Apex the owner has already discovered (scouting, draft or free-agent report, or one who played for him), so the news never reveals an undiscovered Apex. | src/franchise/league-registry.js (`moveIdentity`), src/franchise/league-news.js |

Screenshots (emulated iPhone width 390 px and desktop 1280 px, disposable save): reports/balance-impl/ui/ (before-*, after-*). Script: tools/balance-audit/roster-ui-shots.py.
