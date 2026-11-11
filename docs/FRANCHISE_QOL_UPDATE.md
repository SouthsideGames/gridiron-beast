# Franchise Mode quality-of-life and personality update (2026-11-11)

Branch `franchise-qol-personality`, from main 65391d2 (PR #99). Final update the same day: four new fields, the final field rules, the Developer Tools cleanup and ability-review tracking. Merged as d303aee and published to the main testing link as **v43.7.0-franchise-qol** (artifact version 120) on the owner's authorisation; the 24 changed or added files were read back and match the merge commit.

Only targeted tests were run for this update. **The full regression suite was not run**, and no multi-season simulation was run.

## 1. Skip Wednesday

- `F.skipTraining(f)` and a "⏭️ Skip Wednesday" button on the training screen.
- Goes straight to Thursday (or to the rest of a bye week). Sets no training focus, factor or result; adds no fatigue; rolls no injury; is not added to the training history (so it neither builds nor counts as a streak); uses no franchise dice.
- Only on Wednesday and only once: training cannot follow a skip, and a skip cannot follow training.
- `setTraining`, `trainingOdds` and the Sunday training bonus are unchanged.
- New save field: `f.week.trainingSkipped` (cleared with the week).

## 2. Fields

### Ten elemental fields

Six existed (Frozen, Volcanic, Forest, Storm, Desert, Metallic Dome). Four were added with the same environment system (a palette, one tiled SVG pattern, a few sideline shapes, an end-zone motif; no animation, no image files):

| Field | Element | Look | Type bonus |
| --- | --- | --- | --- |
| Tidal Arena | Water | Blue and turquoise turf, wave markings, tide pools on the sidelines, wave bands in the end zones | The existing matching-type bonus, for Water |
| Radiant Coliseum | Light | Sun-gold turf, white and gold lanterns, a sunburst in the end zones | The existing matching-type bonus, for Light |
| Shadow Grounds | Dark | Deep purple and charcoal turf, low mist, dim lamps | The existing matching-type bonus, for Dark |
| Dragon's Den | Dragon | Stone-grey scaled turf, dragon statues and crimson and purple banners, crimson end zones with a horned crest | **None** |

**Dragon's Den and the type bonus.** The engine gives a field's `type` a small bonus in direct contests. Giving Dragon's Den `type: 'Dragon'` would have created a Dragon field bonus that was never approved, so the field has `type: null` (the engine sees a neutral field) and a separate `element: 'Dragon'` that only ties it to the Dragon gym. Water, Light and Dark use the generic bonus exactly as the six older fields do, at the same value; no hazard, status or ability was added to any field. If Water, Light or Dark should also be look-only, set their `type` to `null` the same way.

### Field selection, in priority order

1. **Gym leader.** Any game against a gym club is played on that gym's field, home or away. Two gym clubs: the home gym's field. This beats everything below.
2. **Saved stadium override** for the home club (non-gym games).
3. **Permanent elemental home field.** A club whose stadium is elemental keeps it (Ember City Beasts volcanic, Glacier Guardians frozen, Stormport Bolts storm, Sundown Drakes desert, Bayou Stalkers forest).
4. **The draw**, for what is left: home games of clubs with an ordinary grass stadium (Northstar Wolves, Stonehaven Titans, Ashford Hawks) against a non-gym opponent. 65% grass, 35% elemental, the 35% split evenly across the ten elemental fields.

The stadium always keeps the home club's name. The draw is a hash of the save's seed, year, week and the two clubs; it uses no franchise dice, so the same save always gets the same field.

| Gym leader | Element | Field |
| --- | --- | --- |
| Harbor Sentinels | Water | Tidal Arena |
| Sunfire Lions | Light | Radiant Coliseum |
| Eastport Phantoms | Dark | Shadow Grounds |
| Palmetto Vipers | Dragon | Dragon's Den |
| Thunder Mesa | Electric | Storm |
| Canyon Crushers | Earth | Desert |
| Frostpeak Howlers | Ice | Frozen |
| Ironpeak Rams | Metal | Dome |

The four gyms' own stadiums now carry their field permanently (Sentinel Pier Field, Sunfire Coliseum, Gaslight Park, Palmetto Grove), so the Stadiums list shows it. The Stadiums list shows permanent stadium information; the pregame card shows the field actually selected and why, and the game is started with that same venue.

Because fields differ from the previous build, a given seed's results differ too. They are still reproducible.

## 3. Saturday Media Day

- Three questions each Saturday, four answers each: Professional, Trash Talk, Comedy, Unhinged.
- Three recurring reporters with pixel portraits (drawn by the coach portrait layers): Dirk Stirwell (The Instigator, The Daily Snap), Dr. Prudence Ledger (The Serious Analyst, Gridiron Quarterly), Toby Fumbleton (The Clueless Rookie, Beast Beat Junior).
- Library `src/data/press.js`: 85 question templates (33 generic, 41 situational, 11 storyline), 340 answers; 38 headlines, 42 subheadlines, 10 kickers. Logic in `src/franchise/press.js`.
- **Situational questions are asked only when the save shows the event:** winning or losing streak of three, rival week, playoff race, playoff game, defending champions, hot seat, an injured starter, a legendary on the roster, last game a blowout either way, an upset win, overtime, a quarterback with three or more interceptions or touchdown passes, a 120-yard rusher or receiver, a big defensive game, and this week's or last week's evolution, trade or signing. Names and numbers come from the stored game log and news log.
- Up to two situational questions a week; the rest generic. No question repeats within a season while unused ones remain: 33 generic questions cover eleven fully generic Saturdays, and the regular season has nine. In a deep playoff run with nothing to ask about, generic questions can come round again.
- **Storylines** (narrative only, kept in `f.press`): an insulted reporter brings it up the next week; a bold prediction is revisited after the game; rival trash talk is answered by result; an Unhinged quote resurfaces two weeks later; a monster put in the spotlight three times becomes a media favourite.
- **Gameplay effects: none added.** The two existing ones remain: Trash Talk on a rival-week rival question is the hype gamble, and marked answers put a monster in the spotlight. The spotlight goes to the monster the question is about when he is healthy, otherwise to the club's best healthy monster (owner-confirmed).
- THE BEAST TIMES headline after the third answer (by overall tone, subheadline from a live situation when there is one), then "On to Sunday".
- Staff auto-run answers all three professionally. Bye weeks hold no press conference. Lineup confirmation and the commissioner's Saturday cap review run as before.
- The former 250-question nature library (`src/data/media.js`) is kept in the repository (owner decision) and is not used by Media Day.
- New optional save fields: `f.press`, `f.week.media.styles`, `f.week.media.headline`. String question ids replace numeric ones; a save from before the update gets fresh questions on its next Saturday.

## 4. Coach appearance

- `src/ui/coach-portrait.js`: a 16×16 layered portrait saved as one string (`coach2|…`). No image files, no new dependency.
- 22 hairstyles, 14 hair colours, 10 skin tones, 5 face shapes, 6 eyes, 6 eyebrows, 5 noses, 9 facial-hair styles, 12 outfits in 16 colours (team colour, black, grey, white, 12 hues), 8 hats, 5 glasses, 7 accessories, 4 builds.
- `src/ui/coach-editor.js`: live preview, five categories, previous/next steppers and tappable choices, "Surprise me". Used in franchise creation and in My office → Edit appearance.
- Editing after creation changes `f.owner.portrait` only.
- Older portraits (numbered presets and `custom|…`) draw exactly as before; opening the editor on one starts from the nearest new look and nothing changes until Save.
- **Limitation, body builds:** the portrait is a bust, so the four builds change shoulder width and neck only. Full-body builds would need a new sprite and are not attempted.

## 5. Developer Tools and ability reviews

- **Legacy Ability Audit** is removed from the Developer Tools menu. Its module stays because Ability Balance and the in-game ability preview live in it; its queue and its card-mismatch count no longer feed any badge.
- The menu entries read **Ability Reviewer** and **Clash Ability Reviewer** (with the menu's usual icon), as do the screen titles.
- **Review inventory** (`src/ui/ability-review-inventory.js`): built from the registries, never a hard-coded list. Football: every Dex family with a football ability. Clash: every ability registered on the Clash engine. A new ability enters its reviewer and the counts automatically, as Pending Review.
- **Statuses** use the existing review store and fingerprints: Pending Review (never reviewed, or changed since the verdict), Approved (on exactly the current version), Needs Revision (stays outstanding until the corrected version is approved). Football and Clash keep separate records (`football_ability_reviews`, `clash_ability_reviews`) and separate id sets.
- **Re-review after a change:** an ability's fingerprint is its Dex contract (name, category, activation, mechanic, details, ruling, values). A material change the contract text does not show (engine behaviour behind the same wording, or the look) is recorded by raising that ability's number in `src/data/ability-review-revisions.js`; only that ability returns to Pending Review. Abilities with no entry keep the fingerprint they had, so earlier verdicts stay valid.
- **Notifications** extend the play-review system (derived counts, no stored notification entries): the Developer badge on the main menu and the More tab, a notice per reviewer on the Developer screen ("Ability Reviewer — 72 abilities need review"), a count on each reviewer's button, and the once-per-batch toast. Tapping a notice opens that reviewer on what is outstanding; abilities marked Needs Revision are listed on the notice and open on that ability.
- Review status is oversight only: nothing in the football or Clash engines reads it.

Inventory at this commit: 72 football abilities and 72 Clash abilities, all on their engines, none missing from a reviewer, none duplicated. The main link's shared review database holds no football or Clash ability verdicts, so all 144 start as Pending Review there.

## 6. Tests

New: `tests/qol-wednesday-skip.test.js` (4), `tests/qol-field-generator.test.js` (7), `tests/ability-review-tracking.test.js` (6), `tests/qol-media-day.test.js` (8), `tests/qol-coach-portrait.test.js` (6), `tests/qol-integration.test.js` (2).
Updated: `tests/franchise.test.js` (the media-day test now reads the new library; it still checks three questions, no nature boost, only hype and spotlight, no repeats, a rival question in a rival week), `tests/media-boost.test.js` (all 64 style combinations), `tests/stadiums.test.js` (venue shape).
`index.html` was re-stamped so the five new modules are in the import map.

## 7. Open points

1. Water, Light and Dark fields give their type the existing field bonus; Dragon's Den gives none. Say if the three should be look-only too.
2. The legacy Ability Audit module is still in the code (Ability Balance and the ability preview use it). Removing it entirely is a separate cleanup.
3. Each Media Day, coach editor and field item above still wants an owner look on a phone; no physical phone was used.
