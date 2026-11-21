# Clash setup and pregame polish

Build v43.35.0-clash-pregame, based on merged main 09bf2d3 (PR #148).

## Changes

- Removed the repeated recruiting pitch advice and the venue's weather/implementation disclaimer. Weather, venue bonuses and simulation rules are unchanged.
- Expected Type Matchups now shows both actual slot occupants' sprites alongside the existing names. Uses the same individual/form art as the rest of the game, without looking up randomized names.
- Clash setup uses a taller, flexible faceoff area with all three beasts from each team: starter in front, two reserves behind. Team tabs, lineup and speed/start controls follow below. The duplicate content Help button is removed; navbar Help remains. Short/landscape screens retain natural overflow, and the lineup picker remains available.
- Removed the persisted away-pause gate, banner, Resume Play action and arena Resume Play prompt. Old playbackPaused flags are ignored. Hidden/native-inactive activity is still throttled automatically; foregrounding resumes a previously playing Clash, preserving explicit manual Pause. Lifecycle transitions do not save, simulate or consume RNG.
- A lost wild Clash no longer guarantees a consolation pitch. New settlements use the seeded franchise generator exactly once and persist hearsPitch plus the terminal/pitch status. Repeat resolution/reload cannot reroll. Refusal advances to Wednesday without signing or releasing anyone. Wins still offer a signing; a willing monster's pitch success rules remain unchanged. Previously settled pending pitches are honored.

| Rarity | Chance of hearing a pitch after a loss |
| --- | ---: |
| Basic | 90% |
| Common | 75% |
| Uncommon | 40% |
| Rare | 0% |
| Legendary | 0% |

Recruitment willingness is the only balance change. The attached validation JSON samples 10,000 seeded decisions for each rarity against the former guaranteed-pitch behavior. It tests the production willingness function; it does not estimate overall signing rates or change the Clash engine.

## Validation

The UI/lifecycle/stadium/type/text/release targeted run passed 59/59, with no failures, cancellations or skips (11.1 seconds). A follow-up after the final result-message and navigation cleanup passed all 12 central-text and draft/setup rendering checks (3.6 seconds).

The encounter/companion run passed all 18 franchise Clash and 7 Tuesday companion checks, including seeded replay, staff auto-run, rewards, possession and overtime. That earlier combined run also exposed two obsolete UI expectations (retired text keys and Resume Play action); both were fixed and passed in the targeted reruns above. The final focused encounter run passed 2/2 with no failures, cancellations or skips (39.7 seconds).

Syntax and whitespace checks pass. The final focused tests cover rarity willingness and actual wins/losses, refusal, signing, one allowed pitch, replay hash and reload idempotence. The seeded willingness sample is docs/validation/clash-pitch-willingness.json.

Full-suite approval gate and browser/device visual review remain pending; this PR is draft. Chromium visual checks are unavailable in this environment (socket creation blocked). Review the six-beast layout on narrow portrait, short landscape and Larger Text, each tab/picker and mode, plus background/foreground transitions during Auto, Watch and explicit Pause. No merge, deployment or phone install was performed.
