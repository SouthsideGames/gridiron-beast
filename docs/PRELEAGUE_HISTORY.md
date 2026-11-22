# Pre-Franchise League History

A new franchise opens with eight seasons of league history already played (league years −7 … 0; year 1 is the owner's first). The archive is written once, when the franchise is created, and is never changed or regenerated afterwards. Existing saves are not given one.

Code: `src/franchise/preleague-history.js` (generator, readers, validator), `src/ui/preleague-ui.js` (panels), `tools/preleague-study.mjs` (validation and realism study), `tests/preleague-history.test.js`, `tests/preleague-integration.test.js`.

## What the archive holds

| Part | Content |
|---|---|
| `seasons[8]` | Overall standings (W-L, points for and against), division order, the four playoff seeds of each conference, all seven playoff games with scores, champion, runner-up, and the MVP, OPOY and DPOY. |
| `careers` | One entry per veteran in the league at creation (as many seasons as his `yearsPro`, at most eight) and per retired legend: identity, debut year, transfers, and a regular-season and playoff line for each season. |
| `legends[6]` | The ids of six retired legends (QB, RB, WR, DL, LB, CB). They exist only in the archive. |

Career totals, records and legend summaries are computed from the season lines when read (and cached per archive); they are not stored.

## Rules it follows

- **League format.** Seasons use the game's own code: `leagueSeasonFixtures` (nine games and a bye), `applyResult` and `standings` (the real tiebreakers and seeding), and `playoffRound` (Conference Semifinals, Conference Championships, Beast Bowl).
- **Last season agrees with the club picker.** The four clubs a new owner can take finished year 0 with exactly the records the picker shows (`STARTER_CLUBS`: 2-7, 1-8, 3-6, 2-7). The picker previously showed 14-game records ("2-12"), which a nine-game league cannot produce.
- **Club strength.** Last season leans on each club's present quality (`clubQuality`), which also orders the creation draft; strength drifts as the years go back.
- **Statistics.** Lines use the ledger's own keys (`stats.js`) and store only non-zero counts. Derived values (`tacklesTotal`, `kickPts`, rates) are never stored. Starters are the best archived monsters at a position on a club; others get a reserve's share.
- **Realism.** Per-position medians match the game's simulated seasons, and the top end stays inside what real seasons produce. `node tools/preleague-study.mjs --real=…` prints the comparison.
- **Awards.** Each season's winners come from the game's own `computeAwards` run on that season's league table. Signature Monster of the Year is not awarded: it needs ability impact, which a past season cannot prove.
- **Ages.** A monster was a year younger each season back. Apex, gym-legendary and rival-signature monsters are ageless in the game, so their age does not change.
- **Transfers.** About a quarter of veterans with three or more seasons changed clubs once (a few twice). Gym legendaries, rival signatures and cornerstones never did.
- **Legends.** Each has a real species (so a sprite), a name from the game's name pool reserved for the life of the franchise, one club, and a career that ended in year −2, −1 or 0.

## Separation from the playable game

- The generator draws nothing from the franchise's random generator. A franchise created with `leagueArchive: false` is identical in every other field, including the draft class (tested).
- Nothing is written to a monster's statistics ledger, `f.history`, `f.records`, the Hall of Fame candidates or the GM career. A new GM starts at zero seasons, titles, awards and records.
- Pre-franchise records are a separate book (`preLeagueRecords`). The playable record book starts empty; a playable record is set and broken without reference to the archive.
- Legends are never in a roster, the league registry, a draft class, a pool, the market or a ballot (tested after two full seasons).

## Where it shows

- **Franchise History:** "The League Before You Arrived" panel under the franchise's own history: champions, each season's awards, bracket and division standings, and the retired legends.
- **Award History:** archived seasons below a "Before 1201" divider; never highlighted as the GM's.
- **Records Book:** a "Before 1201" tab with single-season and career marks.
- **Monster Hall of Fame:** "Legends From Before 1201" on the Inductees view, stated as not inductees.
- **Monster career page:** archived seasons merged into the statistics table (italic, not tappable: they have no game log), career totals for the whole career, earlier clubs, and a "Before 1201" section with titles, awards and moves. The compact career card keeps showing the ledger and says where the earlier seasons are.
- A name opens the career page while the save can show one. A legend, or a veteran released on draft day and gone from the league, opens his archived career in a sheet.
