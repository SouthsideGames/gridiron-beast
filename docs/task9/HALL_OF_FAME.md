# Monster Hall of Fame: rules and measurement

Owner decisions of 2026-11-12. Code: `src/franchise/monster-hof-voting.js` (the vote), `src/franchise/hall-ceremony.js` (Hall of Fame Day). Study tools: `tools/task9-history-study.mjs` (plays real franchises), `tools/hall-of-fame-study.mjs` (holds every election again on finished saves).

## Rules

- **Eligibility.** A monster must be retired for three completed seasons. Only retirements recorded by the retirement pass count; monsters who retired before Task 9 are not added. Nobody is inducted twice.
- **Nomination.** Each year every eligible career is scored and the 15 strongest are nominated. The rest stay eligible and can be nominated in a later year. There is no expiry.
- **The Board.** 15 anonymous seats. Each seat holds the same facts to its own standard, fixed by the year, the seat and the candidate (57 to 87 points). No coach or owner votes. A nominee needs 70% (11 seats). At most three are inducted, in vote order.
- **Sealed result.** The election is held and stored when the season closes. It is shown nowhere until Hall of Fame Day is held. Reloading cannot change it: the stored election is never held again.
- **Hall of Fame Day.** An offseason event on HQ's next-step button, after any postseason decision and Legend Track choice, before contracts (and before retiring the franchise after season 20). The next season cannot be started from the offseason page until it is held. Finishing it records the year and writes one League News item. A replay records nothing.

## The Hall case (points)

| Part | How it is counted | Ceiling |
|---|---|---|
| Awards | MVP 30 · OPOY, DPOY 22 · SMOY 12 · OROY, DROY 8 | none |
| Records | season record 10 · single-game record 5 | 30 |
| Production | 40 × (standing among retired monsters at the same position)², plus 16 for the most productive career the position has seen and 8 for the second (once 10 are on record) | 56 |
| Longevity | 2 per season on record (12 count) · 1 per 16 games (160 count) | 34 |
| Titles | 2 each (3 count) | 6 |

Production is read from the preserved career totals by position (`careerProduction`): passing for QB, rushing and receiving for RB, receiving for WR and TE, tackles, sacks and losses for DL and LB, coverage plays for CB and S, kicking points for K, blocks won for OL. It is only ever compared within a position.

## Measurement: 8 real franchises, 20 seasons each (seeds 3 to 10, hands-off owner)

Every election held again with the rules above on the retired monsters each franchise recorded (1,887 retirees, 1,564 eligible by season 20).

| | First Task 9 rules (titles ×18, everyone on the ballot) | Interim rules (titles ×5, top 15) | Rules above |
|---|---|---|---|
| Inductees per franchise | 24 to 26 (2 franchises) | 23 to 32 (6 franchises) | 12 to 20, mean 15.9 |
| Classes of three | every year from about season 13 | every year from about season 12 | 16% of elections |
| Empty classes (once anyone is eligible) | none late | none late | 49% |
| Inductees with 3+ titles and no award | 14 to 15 per franchise | 2 to 11 per franchise | see "titles" below |

With the rules above:

- **Rate.** 8% of eligible retirees are inducted (127 of 1,564). Per election with a candidate: 78 eligible, 12.9 nominated, 1.1 with enough votes, 1.0 inducted.
- **Class size.** None 49%, one 20%, two 15%, three 16%. The limit of three kept somebody out in 9% of elections.
- **Wait.** 83% are inducted in their first eligible year; 5% wait three seasons or more; the longest wait was 7.
- **Backlog.** 65 eligible careers a year are not nominated. Almost none of them has a case near the Board's standard, so the ballot of 15 is not what keeps anyone out.
- **Position.** Inducted share of eligible: QB 15%, TE 14%, RB 11%, DL 8%, LB 8%, K 7%, S 7%, CB 6%, WR 6%, OL 4%. Quarterbacks lead because they win most MVP and OPOY awards; linemen have no award or record open to them and enter only as the best their position has seen.
- **Awards.** No award 4% inducted, one 32%, two 80%, three or more 100%.
- **Longevity.** 1 to 4 seasons on record 0%, 5 to 8 3%, 9 to 12 8%, 13 or more 21%.
- **Production.** Bottom half of a position 0%, 50th to 75th 3%, 75th to 90th 38%, top tenth 100%.
- **Titles.** 3% of an inductee's points. With every title point removed, 117 of the 127 are still inducted; 10 owe their place to titles. Induction by titles: none 7%, one or two 6%, three to five 18%, six or more 19% (long careers on strong clubs collect both).
- **Where the points come from.** Production 37%, longevity 30%, awards 22%, records 9%, titles 3%.

## Who was left out

Six eligible careers with two or more awards, or the best production at their position, were never inducted:

- A running back with the most productive career at his position, 14 seasons, no award (80 points; eligible for only the last three elections).
- A tight end with the most productive career at his position at 11 seasons (69 points).
- A tight end with an MVP and an OPOY who retired after one recorded season (67 points).
- A quarterback with two SMOY awards over 10 seasons and middling production (66 points).
- A linebacker with two DROY awards over 13 seasons and middling production (59 points).
- A quarterback with two SMOY awards who played three seasons (35 points).

The strongest cases left out otherwise are 14- to 16-season linemen and defenders at the 84th to 88th percentile of their position with no award, most of them eligible only for the last one to three elections of a 20-season franchise.

## Open questions

1. **How selective?** About 16 inductees in 20 seasons, all in the second half. Raising the Board's lowest standard from 57 to 60 gave about 12; 54 gave about 17.
2. **Seasons on record.** A career is counted from the franchise's first season. A veteran who was already old when the league began has few seasons on record, however long he played before.
3. **Late retirees.** A monster who retires after season 17 can never be elected, because the franchise ends after season 20.
4. **Linemen and defensive backs** have no league award and few records open to them. A lineman award, or all-league teams, would give the Board more to judge them by.
