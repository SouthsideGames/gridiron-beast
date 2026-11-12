# Game text

## The central text file

`src/text/en.js` holds the game's wording, one line per permanent key. **To change a line, edit it there.** Nothing else needs touching: the code asks for the line by key.

```js
'menu.week': 'Week {week}',                                   // {week} is filled in by the game; keep it in the line
'menu.seasons_played': { one: '{played} season played', other: '{played} seasons played' },   // a plural
```

- Change wording freely. Never change a key.
- `{name}` marks a value the game inserts. It can move within the line, but it has to stay.
- Simple tags such as `<b>` inside a line are formatting; keep them around the same words.
- The code reads a line with `$t('key', { values })` (the reader from `src/text/index.js`, imported as `$t` so it can never clash with a local `t`; the stage 1 files import it as `t`). English is the fallback for any line another language has not translated.
- Text never decides anything: no rule, id or saved value comes from this file, and the game engines do not read it.

### How much has moved (stages 1 to 5 of 7)

| Stage | Area | Lines | Status |
| --- | --- | ---: | --- |
| 1 | Foundation; menus, settings, office, Developer Tools; new-franchise flow; stadiums and weather; Media Day | 808 | done |
| 2 | Remaining player-facing screens: headquarters and week, match day, roster, Beast Clash screens, careers, league, franchise slots, free agency and trades, shared cards and sheets | 2,827 | done |
| 3 | Franchise: news, notices, reasons and rules text; the club log and League News are saved as lines that follow the language | 1,031 | done |
| 4 | Data: dialogue, achievements, staff, stat guide, leagues, gyms, club identities, tempers, offseason meetings, the playbook, monster natures and scheme fit, rarities, coach appearance | 1,041 | done |
| 5 | Beast Dex: 1,584 shown lines under translator keys (see "The Beast Dex" below) | 1,584 | done |
| 6 | Game logs: football play-by-play and the Beast Clash log; ability banners in the effect files | about 2,300 | approved (decision 3) |
| 7 | Translator round trip (export a language, import it back) and a language setting | | on hold until the owner is ready to translate |

`docs/text/GAME_TEXT.csv` lists every line, moved or not. A row with a `key` is in `en.js`; a row without one still lives in the source file named on the row.

### The Beast Dex

The Dex is governed data: `docs/beast-dex/data` is its one source, built into `src/data/beast-dex.generated.js`, and the simulations read ids and values from it. Its English therefore stays where it is. To change a Dex line, change the Dex and rebuild it, as before.

For translation, each Dex line a screen shows has a key (`dex.family.<id>.description`, `dex.ability.<ID>.name`, `.mechanic`, `.trigger`, `.targets`, `.core`, `.recharge`, `.lifetime`, `.exceptions`, `.progression`, `.story`, and `dex.summary.<family>`). A screen asks `dexLine(key, english)` (`src/text/dex.js`): in English it gets the Dex's own line; in another language, that language's line for the key. `node tools/dex-text.mjs` lists every key with its English, and `GAME_TEXT.csv` carries the same rows. Nothing is duplicated in the game's download.

### Saved lines (news follows the language)

A sentence that is kept in the save used to be saved as finished English. The club log (`f.news`) and League News (`f.leagueNews`) now save a **line**: the key and its values beside the sentence (`src/text/index.js`).

- `line(key, values)` gives `{ text, tk, tv }`; `lineParts(a, b, …)` gives `{ text, tp }` for several lines and plain values in a row. A value inside a line may itself be a line. In the franchise code they are imported as `$L` and `$P`.
- `lineText(saved)` is the sentence to show now, in the language chosen now. A plain string, or an item saved before lines existed, shows as written.
- `text` is still saved (the English at the time), so nothing that reads `text` breaks and an older build can open the save.
- `lineEnglish(saved)` is the English whatever is shown; Media Day uses it to recognise a recent evolution, trade or signing in the club log.

`tests/fixtures/saved-wording.json` is the inventory of the places where a finished sentence is still saved (award citations, a free agent's clue, the Board goal's label, and the plain fragments inside some news lines). `tests/text-never-decides.test.js` fails if a new place appears. To take a place off the list, save a line there and show it with `lineText`.

### Wording never decides anything

`tests/text-never-decides.test.js` plays one franchise season and 120 Beast Clash battles twice: in English, and with every central line replaced by a made-up translation. Results, rosters, ratings, money, ids and random draws must be identical. Stage 3 added four more it or the review found: Media Day read the club log's wording to spot an evolution, trade or signing; the Board's final warning was read off the reason's first word; the commissioner's welcome compared the difficulty's label; and the migration tool had moved 77 non-wording strings (random-number seeds, record ids, CSS transforms) into the text file, which are back in the code and now refused by the tool. It found one real case in stage 4: the coaching hints matched play names inside the lesson sentences. They now match in English whatever language is shown (`english()` in `src/data/playbook.js`).

### Moving more text

```
python3 tools/text-migrate.py AREA FILE [FILE...] --title="Section title" [--data] [--also="Word|Word"] [--fields="label|text"] [--name-arg="offense|defense"]
```

The tool gives each piece of wording a key, writes it to `en.js`, and replaces it in the code with `$t('key', { values })`. A sentence with values inside it becomes one line. It reports the single words it left alone. After each run:

1. `node --test tests/central-text.test.js tests/text-style.test.js`
2. For data files, confirm the module's exports are identical before and after.
3. For screens, render them before and after and compare the HTML. Stage 1: 333 renders across 64 screens and the new-franchise flow were byte-identical, apart from the browser's own storage estimate. Stage 2: 1,229 renders (every screen in seven franchise states, plus one press of each control on each screen) were byte-identical, with the same exception.
4. `--also="Word|Word"` moves single-word labels the tool would otherwise leave alone (it cannot tell a label from an id). Read each one in context first.
5. In data files, `--fields="label|text|desc"` moves only the named properties (everything else in such a file is an id or a value), and `--name-arg="builder"` moves the display name in `builder('id', 'Name', …)`. Messages only a developer reads (`throw new Error(…)`, validator lists) are never moved.

### Decisions (owner, 2026-11-11)

1. **Names stay in English in every language:** club, stadium, species and reporter names, and the reporters' outlets. `src/text/names.js` lists their keys; a translation cannot replace them.
2. **Saved text follows the language:** news items and headlines will be saved as a key plus its values (stage 3), so old news shows in whatever language is chosen. Text already saved as sentences in existing franchises stays as written.
3. **Game logs move too** (stage 6): the engines will record keys and values, and the Clash reference battles will be re-recorded once more, with the same proof as before that no battle changed.
4. **Developer Tools stay in English** (owner, 2026-11-12): they are for the developer only, so their wording stays in the code and is not given to translators.

### Still open

1. **Words that are both a saved value and a label** (for example the owner's gender, "Female" and "Male") are still in the code. Translating them needs a small code change to separate the value from the label.
2. **Left in the code on purpose** (all listed without a key in `GAME_TEXT.csv`):
   - Developer Tools screens (Clash Lab, AI Testing Lab, Attribute Lab, the two ability reviewers, Practice, evolution preview): about 690 lines only the developer sees. Not translated (decision 4).
   - Reserve plays (`src/data/reserve/`, about 1,660 lines): built but kept out of every game system until the owner releases them. They move when they are released.
   - The original Clash move table (`src/data/clash-moves.js`) and the original 72 species cards (`src/data/species-legacy.js` personalities and ability cards): retired from display; the Dex lines replace them.
   - Ability banners in the effect files and the Clash animation captions read off the battle log: they belong to game events and move with the logs in stage 6.
   - People's names (coaches, general managers) and club names: names stay English (decision 1), so they need no key.
3. **Values saved as wording, still in the code:** playoff round tags ("Aurora Semifinal", "Beast Bowl", which also decides the title game), schedule categories ("Division"), monster archetype labels ("Workhorse"), gym badge names, scouting region names, and element and conference names used as ids. Each needs its saved value separated from what is shown.
4. **Save and storage messages** (`src/franchise/store.js`, `save.js`, `slots.js`, `cloud-save.js`, about 60 lines) stay in the code: the save path must never depend on the text file (a test holds this).
5. **Media Day's headline** is kept only for the week it is printed, as a finished sentence.
6. **Value names** in a few lines are machine-chosen (`{b}`, `{played2}`). They work; renaming them for translators is a tidy-up.

## The full listing

`GAME_TEXT.csv` lists the wording in the game's source, one row per distinct line: id, key, area, kind, text, file, line, and an empty `correction` column. `{…}` (or `{name}` for central lines) marks a value the game inserts.

Regenerate it after any wording change:

```
python3 tools/text-export.py          # rewrite docs/text/GAME_TEXT.csv
python3 tools/text-export.py --check  # exit 1 if the committed file is out of date
```

## Style rules (owner, 2026-11-11)

- **American spelling** throughout.
- **Title Case** for buttons, screen titles, popup titles and dialog buttons: capitalize every word except a, an, the, and, but, or, nor, for, as, at, by, in, of, on, to, via, vs, per (unless first or last). Abbreviations (QB, OVR) and units (yd, yr) stay as written.
- **Sentence case** for descriptions, help text, news and dialogue.

`tests/text-style.test.js` checks the spelling rule across the source and the Title Case rule on titles, dialog buttons and plain buttons.

## Known exceptions

- **Beast Clash battle log and the original 72 species' text** were converted on 2026-11-11 with the owner's go-ahead. Nine of the twenty Clash reference battles had their wording hash re-recorded (`tests/clash/fixtures/golden-t8-wording-2026-11-11.json`); every battle's state hash is unchanged and the logs are identical once wording is left out. One stored species fingerprint (Refraction: "judgment") was updated.
- **Clash Lab** (Developer Tools) shows raw option ids on some chips; they are not Title Case.
- **Section headings inside screens** were not changed; the Title Case rule was applied to buttons and titles only.
- **Review verdicts:** twelve plays had wording changes. `src/data/review-fp-aliases.js` keeps their earlier Playbook Audit verdicts valid.
