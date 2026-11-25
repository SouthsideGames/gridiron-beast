# League layouts

Owner decision, 2026-11-24. Source: `src/data/league.js` (`LEAGUE_LAYOUTS`).

## Why

In the first 32-club league, all eight starter clubs were in two divisions, Golden Valley and Greenheart, and neither had a Gym Leader. A new owner's six division games were all against ordinary clubs, so the first seasons were too easy. The starter clubs' records were bad in the league history, but on the field they were rated like any other ordinary club. The real gap was the missing Gym Leaders.

## Layout 2 (new franchises)

- **One starter club in each division.** A new owner chooses from eight clubs, one per region.
- **Gym Leaders spread by two swaps.** Each conference still has 6 Gym Leaders. Four divisions have two and four have one, so every starter club plays at least one Gym Leader twice a season.

| Division | Clubs | Gym Leaders | Starter (last season) |
|---|---|---|---|
| Frostlands | Frostpeak, Glacier, Northstar, Ironpeak | 2 | Northstar Novas (4-10) |
| Redrock | Stormport, **Pinecrest**, Sundown, Thunder Mesa | 1 | Sundown Drakes (5-9) |
| Golden Valley | Goldhaven, Riverbend, **Canyon**, Skyvale | 1 | Riverbend Rapids (3-11) |
| Suncoast | Emberfall, Coral Bay, Cliffhaven, Palm Isle | 2 | Palm Isle Mystics (4-10) |
| Kingsport | Stonehaven, Eastport, Harbor, Ashford | 2 | Ashford Cinders (4-10) |
| Everwild | Ember City, Bayou, **Fernhaven**, Palmetto | 1 | Bayou Stalkers (5-9) |
| Greenheart | Thornwood, Silvergrove, Mossvale, **Sunfire** | 1 | Mossvale Quakes (3-11) |
| Azure Isles | Aetheria, Deepwater, Mistport, Westhaven | 2 | Mistport Veils (4-10) |

The swaps are Canyon Crushers ⇄ Pinecrest Wardens and Sunfire Solars ⇄ Fernhaven Wisps. On the league map each pair also swaps home grounds (`mapPins` in `league-hub.js`), so every club stands in its own region. A club's region styling around the field follows its new division.

Starter clubs are not weaker on the field (owner: "leave it for now").

**History.** The league realigned the year the new owner arrived. The archive's seasons are played in layout 1's divisions (`ARCHIVE_LAYOUT` in `preleague-history.js`), so every franchise has the same past, with the same champions, including Skyvale's two titles and Thornwood's one. Layout 2's starter clubs are pinned to their picker records in the season before year 1. The archive is validated against layout 1.

**Schedules.** The layout keys the schedule cache only. The schedule draws (`gb-schedule|seed|season`) are the same as before layouts existed, so an existing save's fixtures do not change. The golden-vector test checks this under layout 1.

## Layout 1 (existing saves)

Layout 1 is the original league: Golden Valley and Greenheart, eight starter clubs, no Gym Leader in either division. A save without `leagueLayout` is layout 1 and is never reshuffled.

## How it works

- `f.leagueLayout` is set when a franchise is created (`CURRENT_LAYOUT`).
- `DIVISIONS`, `STARTER_CLUBS`, `STARTER_DIVISIONS`, `ALL_TEAMS` and `divisionOf` are live bindings to the active layout. They switch when:
  - a save is read (`Save.migrate`, which restores the previous layout afterwards, so reading a backup never moves the league in play)
  - a franchise is created
  - a franchise becomes active (`adopt` in `main.js`)
  - any screen renders for the open franchise (the router context)
- The schedule cache is keyed by layout.
- The club picker always reads the current layout directly, because an older save may be open while a new franchise is started.
- Slot summaries store each save's own division.
