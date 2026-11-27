# Monster Career Mode: readiness of the existing systems

Monster Career Mode is a planned feature and was **not implemented** in this audit. This document checks the existing code (`main` at `58c33ee`) against what a single-monster career would need.

Every statement below is from reading the source, and each names the file it comes from. Long-run figures come from the franchise runs in `FRANCHISE_SIMULATION.md`.

## Summary

| Need | Exists today | Reusable as is? | Gap |
|---|---|---|---|
| Per-monster game statistics | Yes: `src/franchise/stats.js` `recordGame` | Partly | AI monsters keep **box-score keys only** (`GAME_KEYS`) and **no game logs**. The owner's monsters keep the last 20 game logs. |
| Position-specific statistics | Yes: `POSITION_COLUMNS` for all 10 positions | Partly | OL pancakes, block-win %, snaps and special-teams stats are kept for the owner's monsters only, not in AI books. |
| Season and career totals | Yes: season and career books per monster (`rolloverMonster`) | Yes | The league tables keep **8 seasons** only (`ARCHIVE_SEASONS = 8`); older seasons survive only in the monster's own book. |
| Individual progression | Yes: level XP, per-attribute training bars and ceilings, Temper, mastery (`progression.js`, `development.js`) | Yes | — |
| Playing time | Rotation philosophies heavy / balanced / starters (`src/sim/substitutions.js` `ROTATION_RULES`); XP scales with live snaps, `min(1, snaps/10)` (`progression.js` `afterGame`) | Yes | There is no per-game snap-share target a player could chase. AI books record no snaps. |
| Depth-chart movement | Automatic by overall (`roster.js` `buildDepthChart`), owner's manual order, AI identity preference | Partly | No "earn the job" model: a reserve becomes a starter only when his overall passes the starter's (or the owner sets it). Career Mode needs competition events a player can see and influence. |
| Reserves' development | Development slots: 6 per club, 2 per position, age ≤ 25, 35% of game XP (`development.js` `DEV`) | Yes | — |
| Training and evolution | Training points, `tryEvolve`, evolution timeline events | Yes | — |
| Ageing and retirement | Position curves (onset RB 27 to K 32), hidden longevity −3 to +3, retirement hazard by years past onset (`src/data/aging.js`, `retirement.js`) | Yes | Ageless monsters (legendaries, signatures, Apex) never age or retire, so a Career Mode built on one never ends. |
| Contracts and movement | Contracts, free agency, trades, `m.history` stints, league events | Yes | The monster has no agency: no requests, no preferences a player could set. That is new design, not a gap in a system. |
| Awards | MVP, OPOY, DPOY, OROY, DROY, SMOY, COY (`awards.js`) | Partly | **No award an OL, K, LB or S can realistically win**: see the MVP distribution in `FRANCHISE_SIMULATION.md`. Career Mode for those positions needs positional honours (an All-League team, a "Wall" award for linemen, a kicking award). |
| Milestones and timeline | 26 timeline event types (`career.js`: debut, first, milestone, record, sacks, tackles, interceptions, touchdowns, evolve, level, …) | Yes | No milestone types for blocking or kicking. |
| Records | Game, season and team records (`stats.js` `RECORD_CATEGORIES`, `TEAM_RECORDS`) | Partly | Record categories are offence and defence production. There are none for OL or special teams. |
| Hall of Fame | Annual monster ballot (`monster-hof-voting.js`) and honour ledger | Yes | Prior study (Task 10): QB 15% of inductees, OL 4%. Positions without awards or records reach the Hall far less often. |
| Contribution to team success | Not modelled per monster | No | A Career Mode needs an individual impact measure: on/off splits, share of team EPA, a performance grade per game. The M5 performance grade (`progression.js` M5) is the nearest existing piece. |

## Can every position support a rewarding career?

| Position | Stats a career can show | Awards realistically in reach | Records | Verdict |
|---|---|---|---|---|
| QB | Full passing line | MVP, OPOY | Yes | Ready |
| RB, WR, TE | Full rushing or receiving line | MVP, OPOY | Yes | Ready |
| DL, LB | Tackles, TFL, sacks, pressures | DPOY (and MVP for DL) | Yes | Ready |
| CB, S | Coverage targets, yards allowed, PD, INT | DPOY rarely | Partly (interceptions) | Needs positional honours |
| OL | Pass and run block snaps, beaten, sacks allowed; pancakes for the owner's monsters only | None in practice | None | **Not ready**: there are no AI books for pancakes, no award and no record |
| K | FG by distance, XP, long | None | Long FG only | **Not ready** for a full career layer |

## What should be reused, changed or added

- **Reuse unchanged:**
  - the progression, training, evolution and ageing systems;
  - contracts, free agency and trades;
  - the career timeline and profile pages;
  - the Hall ballot.
- **Change:**
  - **Keep the full stat line in AI books**, at least for the monster a Career Mode follows. Today an AI monster keeps box-score keys only (`stats.js`, decision G). A career that changes clubs into the AI league would otherwise lose pancakes, snaps and special-teams lines.
  - **Archive the league tables beyond 8 seasons** for awards and record context, or keep a compact per-season summary.
  - **Award coverage:** an All-League team by position would give every position an honour each season.
- **Add:**
  - a per-game individual impact measure;
  - depth-chart competition events;
  - a rule for an ageless career's end.
