# Franchise quality-of-life backlog

Updated November 17, 2026. Planning only. Owner: Kareem Butler.

## Status and boundaries

The owner approved all twenty items, QOL-01 through QOL-20, on November 17. The first eight were approved initially, followed by all twelve deeper-review recommendations. Implementation was scheduled after Claude finished validating PR #130. That report has now been received and reviewed; the Implementation Handoff below records the new code and its pending validation.

The original planning version lives on `codex/franchise-qol-backlog`. This implementation copy is on `codex/franchise-polish`. Neither changes PR #130, the main game link or any installed phone app. It supplements the shipped November 11 update documented in `FRANCHISE_QOL_UPDATE.md`; it does not replace that historical report or earlier game-design ideas.

Review baseline: local source tree `782a2e146ff98db8ab838f0e37719815d42474a5` (PR #130 implementation), based on main `e7750be`. Claude may subsequently change that branch. Reconcile this plan against the final tested/merged code before implementing. Findings below come from source inspection, not a new browser or real-device playthrough. Previously reported browser restrictions remain unresolved here.

## Approved implementation queue

| ID | Approved change | Player outcome |
| --- | --- | --- |
| QOL-01 | Cleaner HQ hierarchy | Today's activity, urgent problems and the opponent appear first; career, records and news remain accessible below. |
| QOL-02 | Actionable warnings | A warning takes the player to the exact lineup slot, beast or appropriately filtered market needed to address it. |
| QOL-03 | Prospect shortlist | Save draft/free-agent candidates and view them together without remembering names. |
| QOL-04 | Consistent comparisons | Compare a candidate against the relevant current starter with position-relevant known information. |
| QOL-05 | Temporary versus permanent growth | Clearly distinguish this week's boost, permanent attributes, level progress and ability mastery. |
| QOL-06 | Useful notifications | Separate decisions requiring attention from informational team updates and developer reviews. |
| QOL-07 | Easier manual point spending | Preview several investments before confirming and move directly to the next beast with points. |
| QOL-08 | Welcome-back summary | Restore context with day/week, next task and an important issue, or an unfinished game's situation. |
| QOL-09 | Offseason progress tracker | See the current stage, what is finished and what still blocks the next season. |
| QOL-10 | Free-agency advance preview | Review the named offers and terms that advancing or finishing will resolve. |
| QOL-11 | Faster salary entry | Enter amounts directly, retain step buttons and see cap impact near the offer action. |
| QOL-12 | Pinned action buttons | Keep Save Plan, Make Offer and Review Trade within reach while content scrolls. |
| QOL-13 | Preserve unfinished selections | Opening details or returning from another screen retains unsubmitted choices. |
| QOL-14 | Reusable lineups and game plans | Save named setups and preview legal changes before applying them. |
| QOL-15 | Better search and filters | Find candidates by name, affordability and team need; retain browsing context. |
| QOL-16 | Deliberate interruption pause/resume | Pause automatic progression when leaving the app and resume deliberately. |
| QOL-17 | Comfortable mobile controls | Improve touch areas, readable text and tappable explanations. |
| QOL-18 | Match-log filters | Find scoring, turnovers, injuries and ability events without reading the entire log. |
| QOL-19 | Native export sharing | Use the phone's sharing/file workflow for reports and saves, with a web fallback. |
| QOL-20 | Predictable dialogs and Back | Close the top dialog first, restore focus and preserve underlying drafts. |

### Acceptance requirements for approved work

**QOL-01 — HQ hierarchy**

Source: `src/ui/screens/hq.js`, HQ render and `nextAction`; `src/ui/guided-week.js`.
Keep the next required action obvious on a short phone screen. Fold secondary sections without removing information. Preserve expansion preferences appropriately. First-week lessons must continue to highlight the correct controls; do not hide a required tutorial action in a collapsed section. Keep live games, commissioner gates and season transitions correctly prioritized.

**QOL-02 — Actionable warnings**

Source: `src/franchise/assist-advice.js` (`rosterWarnings`), `src/ui/tutorial.js` (`warningsHtml`), roster assignment and lineup-gate UI.
Warnings already carry destination screens, while the generic warning renderer primarily shows text. Add precise destinations, not just a general Roster link. An injured QB can lead to the QB assignment screen; a position with no eligible replacement can lead to an appropriate available signing route. Preserve calendar restrictions and tutorial navigation rules. A warning never makes the decision or changes a lineup automatically.

**QOL-03 — Shortlist**

Source: draft class and free-agent UI in `hq.js` and `fa-ui.js`; save/migration code when adding persistence.
Persist stable beast IDs within the franchise, scoped to the correct draft class/market. Keep selected/signed/taken entries legible rather than silently removing them. Never confuse two beasts with the same species/name. Do not reveal unscouted ratings. A shortlist is planning, not a reserved signing or draft pick. Define retention/cleanup before adding unlimited notes or history.

**QOL-04 — Comparison**

Source: `hq.js` (`compareHtml`, `prospectSheet`), `src/franchise/assist-advice.js` (`upgradeOver`), roster assignment, free-agent negotiation.
Reuse recruiting's comparison approach across drafting, signing and lineup changes. For WR/OL and other multi-starter positions, show the relevant replaceable starter rather than assuming the strongest beast is the comparison. Permit another eligible comparison target. Prioritize overall, a few relevant attributes, age, salary, fatigue and known potential/fit; unknown values stay `???`. Do not collapse those factors into an unsupported guaranteed recommendation.

**QOL-05 — Growth labels**

Source: `hq.js` (`trainingResultHtml`), roster attribute and development/mastery panels, `src/ui/ability-info.js`.
Use short categories such as This Week, Permanent Growth and Ability Mastery. Show before/after values only when actually recorded. Distinguish base and effective attributes. Do not change training bonuses, Temper costs, caps, XP or mastery progression to simplify presentation.

**QOL-06 — Notifications**

Source: `src/franchise/franchise.js` (`notices`), `src/main.js` (`tabs`), roster notices, developer-review badges.
Group Needs Your Decision separately from Team Updates. Deep-link to the relevant entity/action. Deduplicate repeated notices and distinguish a read update from a still-unresolved problem. Keep developer work outside normal franchise counts. Persistent critical problems must not disappear simply because the player dismisses an informational notification.

**QOL-07 — Point spending**

Source: `src/ui/screens/roster.js`, development/Temper investment functions.
Add a local preview with Confirm/Cancel and Next Beast With Points. Preview must use actual Temper efficiency, partial investments and ceilings. Commit only a valid selection against the currently available bank. Cancel changes nothing. Never offer undo after a match or other outcome that could enable reallocation exploits. Preserve automatic spending as an optional existing alternative.

**QOL-08 — Return context**

Source: menu Continue action, HQ `nextAction`, active match state, save status.
Keep it compact and non-blocking. Show current week/day and the next real action, not stale cached advice. For a match show score, quarter, possession and down/distance when applicable. Existing Continue/Resume behavior stays accessible. Avoid repeating an introductory popup on every routine navigation; decide a meaningful session-return trigger.

## Approved additions from the deeper review — QOL-09 through QOL-20

### QOL-09 — Offseason progress tracker

**Observed:** `hq.js` computes multiple readiness gates, then presents renewals, staff, free agency, the draft and season-start controls on a long screen. A disabled season-start button explains a blocker below it, but the overall journey is spread across sections.

**Proposal:** A compact tracker: Contracts → Free Agency → Draft → Team Ready. Show the current stage and unresolved count, with direct actions. Display optional ceremonies/job decisions as applicable, rather than implying every franchise has identical gates. Existing cap/roster rules decide readiness; the tracker does not invent new requirements or call optional choices mandatory.

**Verify:** New and veteran saves, career club changes, Hall of Fame day, incomplete staff, all renewals resolved, market closed, draft complete and season-start legality.

### QOL-10 — Preview what advancing free agency will resolve

**Observed:** `fa-ui.js` already confirms due offers using a count; Finish Now separately warns that all live offers will settle.

**Proposal:** Upgrade that existing confirmation with the actual beast names and terms due for resolution, a short explanation of whether the market will close, and an easy way to review an offer. Keep it brief when there are no decisions due. Clearly distinguish Advance One Period from Finish Free Agency. Do not preview future random acceptance results.

**Verify:** Counters, revised deadlines, withdrawn offers, final period and Finish Now all match the engine's actual due set.

### QOL-11 — Faster salary entry

**Observed:** The negotiation sheet adjusts salary and bonus using repeated ±1,000 buttons and redraws the sheet body.

**Proposal:** Add direct numeric entry with a phone numeric keyboard, retain the step buttons, and provide a visible cap-room-after summary next to the offer action. Existing cap panels and advanced schedules should be reused, not duplicated with conflicting numbers. Validate the same minimums and offer increments as the real rules. Preserve an unsubmitted draft of terms when simply opening more information.

**Verify:** Blank/pasted/invalid input, very large values, currency formatting, bonus allocation, cap reservations and keyboard visibility. A draft does not reserve money or send an offer.

### QOL-12 — Important actions stay within reach

**Observed:** Game-plan Save appears after both play grids; offer actions follow a long negotiation body; trade selection involves nested scroll areas. The shared sheet fixes its header but has no shared action footer.

**Proposal:** Use a compact pinned action footer where useful: Save Plan, Review Trade or Make Offer. Pin only enough context to identify the decision and its cost/count. Content scrolls underneath; actions remain above the keyboard and phone's home indicator. Keep dangerous actions visually separated.

**Verify:** 320 px width, short/landscape phones, larger text, keyboard open, stacked dialogs and safe areas. A pinned bar must not hide the last row or consume most of the screen.

### QOL-13 — Keep unfinished selections when viewing details

**Observed:** Friday's game-plan choices are stored in a local `Set` inside `mount`; Play Details navigates to the playbook. Returning mounts a fresh set from the saved starting plan. Negotiation/trade drafts are also local to their sheets.

**Proposal:** Preserve the in-progress plan when opening a play's details and returning. Show a concise discard confirmation only when leaving would genuinely lose edits. Separate a draft selection from the committed weekly plan. Apply the same principle to offer/trade drafts where appropriate, without silently submitting them.

**Status:** High-priority interaction issue to reproduce. Source structure strongly suggests selection loss, but a browser reproduction has not been run in this review.

**Verify:** Select/deselect several plays → open details → Back; switch tabs; cancel versus confirm; reload policy; tutorial paths; changing franchise must never import another franchise's draft edits.

### QOL-14 — Reusable lineup and game-plan presets

**Observed:** Roster supports per-position ordering and Best Lineup; Friday supports choosing an equipped set of plays. No named preset interface was found in the reviewed flows.

**Proposal:** Let the player save a few named setups and preview changes before applying them. A balanced lineup, developing-youngsters lineup or a favorite play selection can reduce repeated setup. Revalidate missing, traded, retired or injured beasts and unavailable plays when loading. Never deploy an illegal lineup silently or replace a user's choices merely because a suggested setup has higher OVR.

**Scope:** Cover reusable lineups and reusable game-plan play sets. This is larger than a cosmetic improvement and needs save compatibility plus availability checks.

### QOL-15 — Better finding and filtering, with remembered context

**Observed:** Free agency has position and Interested In You filters, with a Show All action; contracts have several sorts; draft has position and scouting-order options. These are useful existing tools, not missing features.

**Proposal:** Add name search and practical filters such as Affordable and Fills a Team Need where meaningful. Preserve filter/sort and list position while opening reports and returning. Scope preferences correctly; clear filters that are invalid after a new class/club/save is loaded. Show an obvious Clear Filters action and result count so an empty filtered list is not mistaken for an empty market.

**Verify:** Hidden scouting information, multiple franchises, empty results, shortlists, after-signing updates and full-class rank stability.

### QOL-16 — Deliberate pause/resume when the app is interrupted

**Observed:** `main.js` saves/journals on visibility changes, and the audio module pauses audio. The match Auto scheduler explicitly waits for sheets/replays, but has no explicit document-hidden check in the inspected path. The advisory play clock also lacks that check. Native WebView timer suspension may mask or alter this behavior.

**Proposal:** Freeze automatic game progression, battle presentation and advisory countdowns when backgrounded; return to a clear paused state so the player chooses when to continue. First prove the actual behavior rather than declaring phone background simulation broken from static inspection. Preserve the current play result and deterministic RNG; no reroll, extra snap or duplicate rewards on resume.

**Status:** High-priority lifecycle test candidate, not a confirmed real-device bug. The live 40-second countdown is advisory only; it currently does not create delay penalties.

**Verify:** Home button/app switch, phone lock, brief interruption, long background, OS process kill/reload, match Auto and live Clash at decision boundaries on iPhone and Android.

### QOL-17 — Mobile-readable explanations and reliable tap targets

**Observed:** Several explanations rely on HTML `title` attributes, although some attributes already have proper tappable Stat Info. Small buttons and point controls use heights down to 36 and 28 px; many supporting labels are 10–12 px. The viewport includes `maximum-scale=1`.

**Proposal:** Keep existing tap-for-info patterns and apply them consistently to essential explanations currently available mainly on hover. Increase touch areas without unnecessarily enlarging every graphic. Test larger text and an optional comfortable text size; review the zoom restriction with actual device behavior. Never communicate injury, affordability or selection by color alone. These are source-level review points, not a formal accessibility compliance finding.

**Verify:** Thumb accuracy, screen reader names/focus, text wrapping, small/large phones, selected/disabled states and existing safe-area/sticky-preview behavior.

### QOL-18 — Find meaningful moments in the match log

**Observed:** `match.js` groups the log by quarter and offers Simple/Technical views. Instant replay already reuses recorded frames; it never reruns the simulation.

**Proposal:** Add useful log filters: Scoring, Turnovers, Injuries and Abilities, plus Our Team/All where reliable. Link a log entry to available evidence/replay only when that data is actually retained. Let players see what an ability changed without exposing internal debug detail by default.

**Scope limit:** Do not promise replay of every past play or retain unlimited frames. The problem recorder already has storage limits. This proposal should initially filter existing events and clearly mark unavailable replay data.

**Verify:** Quarter order, defensive scoring, multiple abilities on one play, older saves, no fabricated causal explanation and no replay/RNG side effects.

### QOL-19 — Native sharing for reports and save exports

**Observed:** `file-offer.js` handles Claude-host downloads specially and otherwise uses a browser blob/download link. The Test Session report uses the same helper. No native share path was found there.

**Proposal:** On installed apps, offer the phone's Share/Save to Files workflow with an honest success/cancel result; retain the existing web fallback. Make sending a recorded issue or backing up a franchise straightforward. Report inclusion of the franchise save remains explicit and opt-in; nothing uploads or emails automatically.

**Verify:** Both platforms, cancellation, supported filename/MIME, large reports, save inclusion checkbox, failed sharing and a round-trip import. Do not delete a report simply because sharing was attempted.

### QOL-20 — Predictable modal Back, close and focus behavior

**Observed:** Shared sheets close on backdrop or X and lock background scrolling. They have dialog semantics, but no explicit focus capture/return or Escape handling was found in the helper; no native Android Back integration was found in the inspected router/main paths.

**Proposal:** Define one modal stack: Back closes the top sheet first, then navigates; focus returns to the originating control. Nested confirmation Cancel must return to the intact offer/trade sheet. Protect genuinely unsaved edits. Disable an action while its asynchronous submission is in progress, with a concise busy state.

**Verify:** Keyboard/screen reader, Android Back, nested dialogs, repeated taps, sheet close callbacks and game Auto/tutorial pause behavior. Native host behavior must be checked before diagnosing a current Android defect.

## What already exists and should be improved rather than rebuilt

- Router Back restores scroll and same-screen rerenders retain it.
- Recruiting comparisons, fit indicators, roster warnings and automatic best-lineup tools exist.
- Staff can run the week; automatic point spending and several match/Clash speeds exist.
- Offer interest/deadlines, cap reservations, draft reserves, trade previews and confirmations already exist.
- Saves expose pending/saving/committed/error states, backups, import preview and deletion safeguards. Show existing truthful status more conveniently if needed; do not claim saving is absent or display success before commit.
- Match logs, replays, substitution controls, reduced motion/flashes, 30 FPS mode and stat help already exist.
- Keep the separately approved Beast Dex 2.0 design outside this QoL implementation scope unless the owner explicitly combines them.

## Suggested implementation and validation sequence

1. Receive Claude's PR #130 report, fix/review any outstanding problems and reconcile the final code. Do not change its active test branch underneath the run.
2. Implement all twenty approved items on a new branch based on the agreed current main. This planning branch contains documentation only.
3. Implement in coordinated groups: shared navigation/mobile controls and HQ; roster/comparisons/growth; shortlist/search and offseason decisions; game plans, match log, interruption handling and export sharing. Keep all twenty in the implementation checklist. Add targeted regression tests at the behavior boundaries as changes land.
4. All twenty items are approved. Reproduce the suspected existing selection-loss and background-progression issues in QOL-13 and QOL-16 before describing them as confirmed bugs; the requested selection preservation and interruption behavior are approved regardless. Shared UI foundations should reduce duplication without changing game balance or adding unrelated features.
5. Give Claude the completed implementation for real click/tap playthroughs at 320/390/440 px and short/landscape sizes, existing/new saves and the guided first week. Explicitly test critical gates, hidden scouting data, cancel/reload, save failures and native interruptions.
6. Follow `docs/TESTING_POLICY.md`: targeted checks during development, full suite on final source before approval, exact commit/results/duration reported. Investigate failures without weakening assertions. Code changes after final validation require the policy's appropriate repeat checks.
7. Real iPhone/Android checks remain distinct from browser emulation. Merge, publish and installing/rebuilding the phone app are separate actions; do not imply that updating GitHub changes an installed app.

Historical planning checkpoint: no tests were run and no game files were changed during the original documentation-only review. See the current implementation results below.

## Implementation handoff — v43.23.0

Implementation branch: `codex/franchise-polish`, based directly on PR #130's validated head `7d31600` (tested code `9fadf11`, followed by documentation only). PR #130 has not been merged by this work. The polish PR is stacked on that branch so its diff contains only this update. Retarget/reconcile after #130 merges; do not merge the wrong base merely to clear a dependency.

All twenty approved items now have implementation on this branch. They are **awaiting Claude's full regression and browser/device validation**, not approved for release. The new source uses additive `f.polish` planning data; saves without it remain valid. No simulation, draft ownership, roster limits, Temper cost, progression rate or salary rules were changed.

| ID | Implementation |
| --- | --- |
| 01 | HQ puts the current activity ahead of collapsible career/story, trades, last-game and news sections. |
| 02 | Warning review actions and injured-beast notices link to relevant screens/assignment slots. |
| 03 | Franchise-scoped shortlists store only public identity, retain taken entries and have a 100-entry limit. |
| 04 | Shared comparison sheet chooses the weakest eligible actual starter at multi-starter positions, allows changing the target, respects unknown scouting values and shows the relevant salary. |
| 05 | Weekly training is marked This Week Only; the beast screen distinguishes permanent base ratings, current effects, levels and mastery. |
| 06 | HQ separates Needs Your Decision from Team Updates; developer review counts no longer inflate the normal More-tab count. |
| 07 | Point planner previews actual Temper spending on a copy, supports undo before confirmation and rejects stale/double confirmations. Next Beast With Points is available. |
| 08 | Continue shows current week/day and next task, or the saved match's score and situation. |
| 09 | Offseason stage tracker displays Contracts, Free Agency, Draft and Team Ready, using existing readiness checks. |
| 10 | Period/Finish confirmations list due offers by name and terms, rather than counts alone. |
| 11 | Salary/bonus numeric entry retains step buttons, validates existing increments, preserves unsubmitted terms and shows cap impact. |
| 12 | Shared sheet action footers, game-plan Save and trade submission remain reachable while the body scrolls. |
| 13 | Unsubmitted play selections survive details navigation/reload within the same club/week/day. Offer/trade drafts are also preserved separately from commitments. |
| 14 | Up to five named lineup and play-set presets per club/kind; review changes and missing/injured entries before applying, and reject illegal setups/unavailable plays. |
| 15 | Name, known-affordable, team-needs and shortlist filters retain context; existing draft/market/contract sort/filter preferences are franchise-scoped. |
| 16 | Visibility/native lifecycle pauses automatic match progression and Clash presentation, saves paused context and requires explicit Resume. |
| 17 | Larger coarse-pointer controls/supporting text, optional larger text, zoom restriction removed, and tap-to-explain buttons on supporting stat/status chips. |
| 18 | Match log filters use structured scoring/turnover/injury/ability fields, never localized prose. No extra frame retention or fabricated replays. |
| 19 | Native share bridge plus supported Web Share and existing browser/Claude fallbacks; cancellation/unknown completion never claims a saved file. |
| 20 | Shared modal focus return/trap, Escape/top-sheet Back, and asynchronous delegated-action busy protection; optional native Back bridge. |

### Checks performed here

- Expanded targeted run before the final UI refinements: 96/96 tests passed, 0 failed/cancelled/skipped, 172.92 seconds. Includes coach-assist, lineup gates, negotiations and stat guide in addition to the feature/core checks.
- Final affected-file/release targeted run: 74/74 tests passed, 0 failed/cancelled/skipped, 5.25 seconds. Includes the new 13-test polish suite, draft, audio, guided week, text, file export, icons, native audio helper and release stamp.
- JavaScript syntax and whitespace checks pass; release stamp discovers 472 modules; release file discovery passes with 483 files.
- The new browser harness `tools/franchise-polish-check.py` compiles, but Chromium aborts before opening a page with `socket() failed: Operation not permitted`. **No new browser pass is claimed.**
- The full suite has not been rerun on the polish code; Claude's 2,272-test pass applies only to PR #130's earlier tested code. All visual layout, guided-week navigation interactions and native behavior remain subject to validation.

### Native checkout setup (not performed here)

The source repository does not contain the owner's native projects. After this update is eventually merged, copy the current game files into the existing Mac checkout's `www` as usual. Install the plugins matching that checkout's Capacitor major (the owner's current setup is Capacitor 8), plus the local build helper:

```sh
npm install @capacitor/app@8 @capacitor/share@8 @capacitor/filesystem@8
npm install --save-dev esbuild
node tools/prepare-mobile.mjs
node tools/configure-ios-audio.mjs
npx cap sync ios
npx cap open ios
```

`prepare-mobile.mjs` bundles a native-only bridge into `www/native-plugins.js` and inserts its script into **www/index.html only**. Run it again after replacing that HTML during future updates. It leaves source index.html, signing, bundle ID and saves untouched. For Android also run `npx cap sync android` and build the existing Android project. Reconcile the plugins' current native platform/store requirements during the native build; native code and store submission are not validated here.

Sharing writes the selected export to the app cache and opens the system share menu; it does not upload automatically. The OS manages cached files; do not treat that cache as a backup. A real device must confirm sharing/cancellation, Back handling, external audio/PiP, silent-switch behavior and lifecycle pause/resume. The native helper is optional for website builds.

Official references: https://capacitorjs.com/docs/apis/share and https://capacitorjs.com/docs/apis/filesystem.

### Separate known defect: AI draftees can disappear

Claude's PR #130 audit found that a full 38-beast AI club can select a prospect, fail to make room, and leave that draftee on no club. It occurred in 17 of 1,800 selections across 40 seeded drafts, identically on main and #130. **Not fixed in this polish update.** Preserve this reproduction and decide the ownership/roster rule in a separate change; do not hide the problem by changing ranks, suppressing logs or weakening tests.

### Claude validation priorities

Run the new polish browser harness, then guided-week, navigation, roster/feature/league checks and the affected save/export checks. Compare every failure with the tested base. Exercise all twenty checklist items, not only the new helper unit tests. Specifically test point cancellation/stale confirmation, named preset changes and missing beasts, unscouted comparisons/filters, nested modal Back/Escape/focus, plan details-return/reload, salary editing/cancel/reopen, due-offer names/terms, short/landscape/larger-text layouts, and app interruptions during Auto/live Clash.

Run the full suite on final source with no heavy parallel jobs. Fix defects with regression coverage; record the exact final source commit, test counts/duration and real-device limitations. Keep the polish PR unmerged and do not deploy or update the phone installation.
