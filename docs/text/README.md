# Game text

`GAME_TEXT.csv` lists the wording in the game's source, one row per distinct line: id, area, kind, text, file, line, and an empty `correction` column. `{…}` marks a value the game inserts.

Regenerate it after any wording change:

```
python3 tools/text-export.py          # rewrite docs/text/GAME_TEXT.csv
python3 tools/text-export.py --check  # exit 1 if the committed file is out of date
```

It is a listing for proofreading, not the place the game reads its text from. Wording still lives in the source files named in each row. Moving the text into one central file the game reads (and translators can work from) is the planned next step.

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
