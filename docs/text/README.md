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
- The code reads a line with `t('key', { values })` from `src/text/index.js`. English is the fallback for any line another language has not translated.
- Text never decides anything: no rule, id or saved value comes from this file, and the game engines do not read it.

### How much has moved (stage 1 of 7)

| Stage | Area | Lines | Status |
| --- | --- | ---: | --- |
| 1 | Foundation; menus, settings, office, Developer Tools; new-franchise flow; stadiums and weather; Media Day | 808 | done |
| 2 | Remaining screens: headquarters and week, match day, roster, Beast Clash screens, shared cards and sheets | about 3,500 | next |
| 3 | Franchise news, notices and rules text | about 1,300 | |
| 4 | Data: dialogue, achievements, staff, stat guide, league, gyms, playbook | about 3,300 | |
| 5 | Beast Dex (generated from `docs/beast-dex/data`) | about 2,100 | |
| 6 | Game logs: football play-by-play and the Beast Clash log | about 2,300 | needs a decision (below) |
| 7 | Translator round trip (export a language, import it back) and a language setting | | |

`docs/text/GAME_TEXT.csv` lists every line, moved or not. A row with a `key` is in `en.js`; a row without one still lives in the source file named on the row.

### Moving more text

```
python3 tools/text-migrate.py AREA FILE [FILE...] --title="Section title" [--data] [--also="Word|Word"]
```

The tool gives each piece of wording a key, writes it to `en.js`, and replaces it in the code with `t('key', { values })`. A sentence with values inside it becomes one line. It reports the single words it left alone. After each run:

1. `node --test tests/central-text.test.js tests/text-style.test.js`
2. For data files, confirm the module's exports are identical before and after.
3. For screens, render them before and after and compare the HTML. Stage 1: 333 renders across 64 screens and the new-franchise flow were byte-identical, apart from the browser's own storage estimate.

### Decisions (owner, 2026-11-11)

1. **Names stay in English in every language:** club, stadium, species and reporter names, and the reporters' outlets. `src/text/names.js` lists their keys; a translation cannot replace them.
2. **Saved text follows the language:** news items and headlines will be saved as a key plus its values (stage 3), so old news shows in whatever language is chosen. Text already saved as sentences in existing franchises stays as written.
3. **Game logs move too** (stage 6): the engines will record keys and values, and the Clash reference battles will be re-recorded once more, with the same proof as before that no battle changed.

### Still open

1. **Words that are both a saved value and a label** (for example the owner's gender, "Female" and "Male") are still in the code. Translating them needs a small code change to separate the value from the label.
2. **Value names** in a few lines are machine-chosen (`{b}`, `{played2}`). They work; renaming them for translators is a tidy-up.

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
