# Franchise HQ and My Office navigation

Added to the same unmerged PR as the guided beast-card tour, at the owner's request.

## HQ

- Keep This Week, Your Team & Career, and League News available.
- Do not render Trades & Offers unless a current trade call is waiting. A pending call opens expanded, with its existing Accept/No Thanks actions and trade-window information. Declined and expired offers leave no empty section behind.
- Do not render Needs Your Decision when its combined warnings/notices list is empty. Pending actions open expanded. Existing lineup-review reminders remain conditional on real roster changes.
- Remove the permanent GM Career accordion. Job decisions that genuinely need action (for example, finding a job after dismissal) still appear as the main next action.
- Keep the recent-game section conditional on a recent result, as before.

## Bottom navigation

HQ · Roster · My Office · League · More

My Office replaces Plays. Its appearance editor and GM Career screen belong to the My Office tab and retain that tab's navigation history. A second tap on the active tab returns to My Office itself. More no longer duplicates My Office and does not gain a Plays entry.

The GM Career button now lives in My Office. Playbook browsing remains available from Game Plan, with Back restored because it is no longer a primary tab. Game Plan and its play details belong to HQ for navigation purposes. The underlying game-plan, coaching and trade rules are unchanged.

## Validation

61/61 targeted tests passed on the combined tutorial and HQ code: guided-week, hq-navigation, phone-navigation, franchise-polish, central-text and release-stamp. New regression tests exercise empty/nonempty decisions, waiting/declined/expired trade offers, permanent HQ sections, My Office tab membership, the GM Career action, removal from More and Back for play browsing. The existing router history, Back and guided-week checks also pass.

The phone-navigation browser harness was extended to cover My Office, GM Career, tab history and missing empty sections at 320/390/440 px and short landscape. Browser execution is still pending: Chromium fails at launch because socket() is denied in this environment. No visual or real-device pass is claimed.

Build: v43.28.2-hq-and-guidance. No full regression suite, merge, deployment or Capacitor installation performed.
