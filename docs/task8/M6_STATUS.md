# M6 status — 2026-11-10

Branch `task8-m6-presentation`, built on `codex/task8-m5` at f716b02 (verified M5 snapshot: 2,003 tests). Task 8 stays open:
the M6 benchmarks below are not finished, and owner visual review and physical-device measurements remain separate.

## Who does what (owner instruction, 2026-11-10 13:14)

| Part of M6 | Owner | State |
| --- | --- | --- |
| Player screens and presentation | Claude | **Done on this branch**, listed below |
| Verification of this branch, private preview | Claude | See "Verification" |
| Career and development tests | ChatGPT | **Not run here.** Not claimed |
| Economy and balance rebenchmarks | ChatGPT | **Not run here.** Not claimed |
| Performance benchmarks (CPU scenes, rendering) | ChatGPT | **Not run here.** Not claimed |

## Coordination around exact commits

- **Simulation baseline for every long run: f716b02.** This branch changes screens, settings and bookkeeping only.
- **Proof that results at f716b02 hold for this branch:**
  - `node tools/perf/identity.mjs` on f716b02 and on this branch: **IDENTICAL**, 19 scene variants (13 scenes) and 12 full games.
  - `node tools/ai-franchise-benchmark.mjs --seeds=1 --seasons=1`: hash `77ce08b7…985a` and hashV3 `e04831ba…0098` on both,
    the values recorded in `m5/verification.json`.
- **What a long run on this branch could see that f716b02 does not:**
  - `f.discovery` is written only by the browser screens, never by the simulation or a headless runner.
  - Three collection achievements exist. They fire only when the Beast Dex is complete for a group (72, 120 or 192 families).
- **If a benchmark leads to tuning** (authorized parameters only), that is a new simulation commit. The preview and this
  record then name that commit, and the regression is rerun on it.

## Screens audited and finished

| Area | Before | Now |
| --- | --- | --- |
| Ability names and text | Player screens showed the retired legacy cards for 48 families ("Meteor Pass" where the ability is Meteor Impact), nothing for the other 24, and never the Clash ability | Every screen reads the Beast Dex record: profile, Dex sheet, draft, scouting and free-agent reports, cornerstone choice, in-match tip, championship ceremony, Clash lineup. Basics say plainly that they have none |
| "See it" | A synthetic staged scene of the retired ability | The football reviewer's real-engine demonstration at the monster's form and mastery, without the review tools |
| Three bars | Level and training only | Level, the mode's ability mastery (tier, uses toward the next tier), shared training. A switch shows the Football or the Clash record |
| Training | "Level-ups bank 0 points"; one scalar potential as the cap; cost shown before Temper | Each attribute against its own ceiling; cost per +1 after Temper and age; progress of a part-paid +1; disabled at the ceiling |
| Development slots | "+8 XP" | The real award: 12.5 level XP and 6.25% of a training bar |
| Apex | No presentation at all; an Apex showed a retirement window | Concealed until discovered; emblem and gold double outline on roster and profile cards; the four facts with current ratings apart; ageless |
| Apex discovery | None | Persistent records; the first-discovery panel; skip, replay, reduced-flash version |
| Post-game rewards | XP and training | Also the mastery credits earned and the performance grade, football and Clash |
| Collection achievements | None | The original 72, the 120 Basics and all 192, by family |
| Settings | Reduce flashes | Also 60 FPS (default) or 30 FPS battery saver |

Checked and left as they were: Temper explanations, the attribute guide (wording about where points may go updated), the shared
status badge, charge bar and battery cycle, the inspect sheet, scouting visibility from M5.

## Apex discovery, as built (spec §5)

- **Hidden until discovered:** emblem, outline, "potential 99", the facts block and the ageless line. An unidentified Apex prospect
  reads "potential unknown" like any other.
- **What discovers one:** a report that reveals potential (draft report level 6, a regional report with potential, a free
  agent's public card), or acquiring the monster.
- **The record** (`f.discovery`, optional save fields, schema 10 unchanged) keeps the season, week and source. It outlives the draft
  class or prospect list it came from, and it is the player's only: another club's report reveals nothing.
- **The panel** runs about 5 seconds: silhouette, gold and white outline, APEX DISCOVERED, name, the four facts. Skip is immediate; the
  confirmation stays; Replay is on the profile. Reduced flash or reduced motion gives a steady outline and plain fades with no shake.
- **Once only:** the panel is stamped as shown, and saved, when it opens. A reload, an interruption or a reacquisition never plays
  it automatically again, and nothing about the monster changes.

## Decisions I made that need the owner's confirmation

1. **Interrupted panel.** Closing the app mid-panel counts as shown. The alternative is to replay it until it is finished or skipped.
2. **Training any attribute.** The old screen let points go only into the attributes a position uses. The engine has no such
   rule, and an Apex could not reach 99 everywhere under it, so the screen now allows every attribute and fades the unused ones.
3. **Free-agent cards discover an Apex.** A free agent's card is public and shows potential, so opening it is a discovery.
4. **Achievement wording.** The three collection achievements needed a title and two lines each; that text is new.
5. **Ability wording.** Football summaries are the reviewer's "expected result" lines; Clash summaries are the Dex mechanic line.
   The full Dex rules sit under "Full rules". They are accurate but written for designers.

## Not implemented, on purpose

- **Graphics-quality presets and a camera-intensity control.** §14 lists them; the later ruling N8e (§26) marks graphics-quality
  settings "not authorized for implementation" until the visual performance results are reviewed. The existing Screen shake and
  Reduce motion settings are unchanged. The reviewers keep their own quality switch.
- **30 FPS scope.** It limits the layers the game redraws itself (Clash ability layer and particles). The football field already
  redraws at most 20 to 30 times a second. CSS animations are left to the browser.

## Verification

| Check | Commit | Result |
| --- | --- | --- |
| New tests: discovery (6), screens data (5) | this branch | 11 of 11 |
| Browser check `node tools/m6-screens-check.mjs` (headless Chromium, phone size) | f9e7581 | 34 checks, 0 page errors |
| Outcome identity against f716b02 | f9e7581 | IDENTICAL |
| One-seed, one-season AI benchmark hash against f716b02 | f9e7581 | identical |
| Release stamp, completion matrix, generated Dex freshness | this branch | pass |
| Full regression `node --test "tests/**/*.test.js"` on a frozen copy | f9e7581 | see the final report |
| Saves made on preview versions 7 and 8 | preview build | 8 of 8 load, round-trip and play on |

An Apex cannot retire: every generated Apex has a fixed age of 20 to 22, and the retirement chance at that age is zero in the
worst case (tested on 12,000 generation events and two offseasons).

## Limitations

- No long-term career, economy or performance result is claimed here.
- The headless browser check is not the owner's visual review, and nothing was measured on a phone.
- The player-facing ability text has not had a copy edit.
