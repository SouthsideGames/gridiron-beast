# Franchise Mode quality-of-life and personality update (2026-11-11)

Branch `franchise-qol-personality`, from main 65391d2. **Not merged, not published.** Build label unchanged (v43.6.0-task8-review); a release number is the owner's call at publication.

Only targeted tests were run for this update. **The full regression suite was not run**, and no multi-season simulation was run.

## 1. Skip Wednesday

- `F.skipTraining(f)` and a "⏭️ Skip Wednesday" button on the training screen.
- Goes straight to Thursday (or to the rest of a bye week). Sets no training focus, factor or result; adds no fatigue; rolls no injury; is not added to the training history (so it neither builds nor counts as a streak); uses no franchise dice.
- Only on Wednesday and only once: training cannot follow a skip, and a skip cannot follow training.
- `setTraining`, `trainingOdds` and the Sunday training bonus are unchanged.
- New save field: `f.week.trainingSkipped` (cleared with the week).

## 2. Field generator

- `src/data/field-generator.js`. Ordinary games: 65% grass, 35% elemental, the elemental share split evenly across the six implemented fields (Ice, Fire, Nature, Electric, Earth, Metal).
- The draw is a hash of the save's seed, year, week and the two clubs. It uses no franchise dice, so the same save always gets the same field.
- **Boss encounters** (any game involving one of the eight gym clubs; the home gym when two meet) always use the field of the boss's element.
- A per-save stadium override (`f.stadiums`), where one exists, still wins.
- Field effects, immunities, abilities and weather tables are untouched. `stadiumFor`/`venueFor` are unchanged and remain the engine default outside Franchise Mode.

**Missing mappings, reported and not substituted:** four bosses have an element with no implemented field and play on grass.

| Boss | Element | Field |
| --- | --- | --- |
| Harbor Sentinels | Water | none: grass |
| Sunfire Lions | Light | none: grass |
| Eastport Phantoms | Dark | none: grass |
| Palmetto Vipers | Dragon | none: grass (previously hosted on the Nature field) |
| Thunder Mesa | Electric | Storm |
| Canyon Crushers | Earth | Desert |
| Frostpeak Howlers | Ice | Frozen |
| Ironpeak Rams | Metal | Dome |

Consequences to know about:

- Non-boss clubs that used to have a permanent elemental home (for example an always-volcanic stadium) now draw 65/35 like everyone else. The stadium keeps its name.
- The Stadiums list and the ceremony screen still show the home stadium's own environment; the pregame venue card shows the field actually drawn and why.
- Because fields differ, a given seed's results differ from the previous build. They are still reproducible.

## 3. Saturday Media Day

- Three questions each Saturday, four answers each: Professional, Trash Talk, Comedy, Unhinged.
- Three recurring reporters with pixel portraits (drawn by the coach portrait layers): Dirk Stirwell (The Instigator, The Daily Snap), Dr. Prudence Ledger (The Serious Analyst, Gridiron Quarterly), Toby Fumbleton (The Clueless Rookie, Beast Beat Junior).
- Library `src/data/press.js`: 85 question templates (33 generic, 41 situational, 11 storyline), 340 answers; 38 headlines, 42 subheadlines, 10 kickers. Logic in `src/franchise/press.js`.
- **Situational questions are asked only when the save shows the event:** winning or losing streak of three, rival week, playoff race, playoff game, defending champions, hot seat, an injured starter, a legendary on the roster, last game a blowout either way, an upset win, overtime, a quarterback with three or more interceptions or touchdown passes, a 120-yard rusher or receiver, a big defensive game, and this week's or last week's evolution, trade or signing. Names and numbers come from the stored game log and news log.
- Up to two situational questions a week; the rest generic. No question repeats within a season while unused ones remain: 33 generic questions cover eleven fully generic Saturdays, and the regular season has nine. In a deep playoff run with nothing to ask about, generic questions can come round again.
- **Storylines** (narrative only, kept in `f.press`): an insulted reporter brings it up the next week; a bold prediction is revisited after the game; rival trash talk is answered by result; an Unhinged quote resurfaces two weeks later; a monster put in the spotlight three times becomes a media favourite.
- **Gameplay effects: none added.** The two existing ones remain: Trash Talk on a rival-week rival question is the hype gamble, and marked answers put a monster in the spotlight. The spotlight goes to the monster the question is about when he is healthy, otherwise to the club's best healthy monster as before.
- THE BEAST TIMES headline after the third answer (by overall tone, subheadline from a live situation when there is one), then "On to Sunday".
- Staff auto-run answers all three professionally. Bye weeks hold no press conference. Lineup confirmation and the commissioner's Saturday cap review run as before.
- The former 250-question nature library (`src/data/media.js`) is no longer asked; the file stays for its constants.
- New optional save fields: `f.press`, `f.week.media.styles`, `f.week.media.headline`. String question ids replace numeric ones; a save from before the update gets fresh questions on its next Saturday.

## 4. Coach appearance

- `src/ui/coach-portrait.js`: a 16×16 layered portrait saved as one string (`coach2|…`). No image files, no new dependency.
- 22 hairstyles, 14 hair colours, 10 skin tones, 5 face shapes, 6 eyes, 6 eyebrows, 5 noses, 9 facial-hair styles, 12 outfits in 16 colours (team colour, black, grey, white, 12 hues), 8 hats, 5 glasses, 7 accessories, 4 builds.
- `src/ui/coach-editor.js`: live preview, five categories, previous/next steppers and tappable choices, "Surprise me". Used in franchise creation and in My office → Edit appearance.
- Editing after creation changes `f.owner.portrait` only.
- Older portraits (numbered presets and `custom|…`) draw exactly as before; opening the editor on one starts from the nearest new look and nothing changes until Save.
- **Limitation, body builds:** the portrait is a bust, so the four builds change shoulder width and neck only. Full-body builds would need a new sprite and are not attempted.

## 5. Tests

New: `tests/qol-wednesday-skip.test.js` (4), `tests/qol-field-generator.test.js` (5), `tests/qol-media-day.test.js` (8), `tests/qol-coach-portrait.test.js` (6), `tests/qol-integration.test.js` (2).
Updated: `tests/franchise.test.js` (the media-day test now reads the new library; it still checks three questions, no nature boost, only hype and spotlight, no repeats, a rival question in a rival week), `tests/media-boost.test.js` (all 64 style combinations), `tests/stadiums.test.js` (venue shape).
`index.html` was re-stamped so the five new modules are in the import map.

## 6. Decisions for the owner

1. Fields for Water, Light, Dark and Dragon bosses (new field behaviour needs approval), or keep grass.
2. Whether "boss encounter" should mean any game involving a gym club (implemented) or only games at the gym's home.
3. Whether non-boss clubs should keep their old permanent elemental home fields instead of the 65/35 draw.
4. Whether the Stadiums list should show the drawn field for the coming game.
5. Whether the spotlight should follow the monster a question is about (implemented) or always the club's best monster.
6. Remove the retired 250-question library, or keep it.
7. Build label and release number for publication.
