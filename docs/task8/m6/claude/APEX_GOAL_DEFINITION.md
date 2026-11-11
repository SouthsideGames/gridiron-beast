# Apex goal and sustained-starter eligibility (owner ruling 2026-11-11; written before the validation run)

## The goal

**At least 90% of sustained starters have all twelve attributes at 99 by the end of their fifteenth career season.**

This replaces "90% of Apex by season 15" as the M6 acceptance wording for Apex progression. It is a measurement definition;
it changes no game rule.

## Terms

| Term | Definition |
| --- | --- |
| **Entrant** | An Apex first seen at level 1 at a season start, in franchise seasons 1 to 5. Later entrants cannot complete 15 seasons inside a 20-season franchise. |
| **Career season k** | Franchise season (entry year + k − 1). The clock never pauses: a season he is injured, benched, unsigned or out of the league still counts as a career season. |
| **Starter season** | A career season with at least 7 football starts, for any club. A start is being in a finished game's lineup (offence, defence or kicker). |
| **Sustained starter** | An entrant with at least 12 starter seasons among career seasons 1 to 15. |
| **End of the fifteenth season** | His attributes as they stand when the offseason that follows career season 15 begins: after that season's last game and awards, **before** the offseason award. The 15th offseason award does not count. |
| **Success** | All twelve current attributes are 99 at that moment. Unspent training points do not count. |

## How each case is handled

| Case | Handling |
| --- | --- |
| **Injury during a season** | No exemption. Games missed are starts not made. If he still reaches 7 starts it is a starter season; if not, it is one of his at most three non-starter seasons. |
| **A season lost to injury** | A non-starter season. More than three such seasons (for any mix of reasons) and he is not a sustained starter. |
| **Benched** | Same as injury: counted by starts only. |
| **Traded or re-signed, same or another club** | Career continues. Starts for every club in the season are added together. |
| **Released and unsigned at a season start** | The season counts; any starts after a later signing count. Usually a non-starter season. |
| **Out of the league at the end of season 15** | Not a success. If he had already made 12 starter seasons he stays in the denominator as a failure; otherwise he is not a sustained starter. |
| **Entered above level 1** (veterans generated with development, mid-season arrivals) | Excluded from entrants: their career start is not observed. Counted and reported. |
| **Entered after season 5** | Excluded: fewer than 15 seasons observable. Counted and reported. |

## Why "12 of 15 at 7 starts"

- A regular season is 9 games; 7 starts allows two missed games.
- Three non-starter seasons allow the usual pattern seen in real careers: a new Apex is the weakest player on his club and
  is often benched for a season or two before he earns a place.
- Sensitivity will be reported at 10 of 15 and at 15 of 15 so the choice of 12 can be judged.

## What is always reported next to the primary result

1. All entrants on the same schedule (no eligibility filter), with the same success test.
2. Exclusion counts: above level 1 at first sight; entered after season 5; entrants who are not sustained starters, split
   into "fewer than 12 starter seasons" by main cause (injured, benched, unsigned or out of the league).
3. Cohort sizes and a 95% interval (Wilson) for every percentage.
4. The same success test at the end of seasons 10 and 12, to show whether anyone finishes too quickly.
5. The older, looser reading (all 99s at the **start** of season 16, after the 15th offseason award), labelled as such, so the
   new figures can be compared with the earlier report.

## Schedules

Assigned at random per Apex by a hash of his id, and imposed only on Clash lineups:

| Schedule | Rule imposed |
| --- | --- |
| Football only | Never placed in a Clash lineup |
| Mixed | Placed in his club's first four Clash lineups of each season, then never |
| Maximum | Placed in every Clash lineup his club fields |

Football participation is never imposed. On an AI club "maximum" is about 7 to 9 Clashes a season; a human owner's calendar
allows up to 33, which these runs do not represent.
