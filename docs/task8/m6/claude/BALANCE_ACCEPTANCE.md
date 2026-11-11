# M6 remaining balance acceptance: played starters, gyms, legendaries, Apex, pancakes (2026-11-10)

**Status: measured and reported. No production change.** Simulation f716b02. Real franchise runs: seeds 11–14 × 20 seasons
(5,985 football games, 12,558 Clash settlements, 6,936 individuals) recorded by `tools/task8-m6-career-probe.mjs` in a measurement
copy; analysis by `tools/task8-m6-career-analyze.mjs` and `tools/task8-m6-league-checks.mjs`. Evidence: `career-analysis.json`,
`league-checks.json`, `league-pancakes.json`.

## Gate summary

| Gate | Result | Verdict |
| --- | --- | --- |
| At least 75% of ordinary mixed-mode starters reach level 50 within 8 seasons | 26 of 26 mixed-mode starters; 188 of 268 (70.1%) for all eight-season starters | **Met for mixed-mode starters on a small sample; not met for AI-club starters, who are mostly football-only** |
| Ordinary median level 1 to 50 in 5–8 seasons, mixed | Season 7 for the mixed starters here; season 7 in the controlled run | Met |
| Mastery, 3–6 seasons of sustained use | See `MASTERY_FINDINGS.md` | **Not met** |
| Apex, 90% all 99s by season 15 | See `APEX_OPTIONS.md` | **Cannot be met under current rules** |
| Legendary limit, kickers as offensive | 0 violations in 1,220 club-seasons | Met |
| Gym acquisition prefers its element | 2.7 to 4.0 times the league share at all eight gyms | Met |
| Ordinary pancake targets | See below | **Not met at defaults; one in-bounds setting meets all three** |

## Played-starter progression

Entrants: ordinary individuals first seen at a season start at level 5 or lower with no pro seasons, entering by season 12.
Level is read at each following season start. Anyone no longer in the league (retired, released out) counts as not reaching 50.

| Cohort | Entrants | Level 50 within 8 seasons | Median season | Football starts in 8 seasons | Clash lineups in 8 seasons |
| --- | --- | --- | --- | --- | --- |
| All entrants | 2,239 | 10.3% | not reached | 21.0 | 1.5 |
| Starter from the first season | 412 | 51.7% | 8 | 65.4 | 6.1 |
| Starter in at least 6 of the 8 seasons | 437 | 51.7% | 8 | 70.9 | 5.8 |
| Starter in all 8 seasons | 268 | **70.1%** | 8 | 75.2 | 8.0 |
| Starter in all 8 and at least 4 Clash lineups a season (mixed) | 26 | **100%** | 7 | 73.5 | 50.8 |
| Never a starter | 1,253 | 0% | not reached | 0.7 | 0 |

- **A starter means at least 7 football starts in the season.**
- **The gate's wording is "mixed-mode starters".** Those who really are mixed (football every week and four or more Clashes a
  season) all make it, median season 7, as the controlled run predicted. There are only 26 of them.
- **Most AI-club starters are not mixed.** An AI club's Clash lineup is its best three every week, so the typical eight-season
  starter averages one Clash a season and reaches level 50 in season 8 or later: 70.1%, below 75%.
- **By position** (starters in at least 6 of 8 seasons; positions with 20 or more of them) the share ranges from 33.8% (CB) to
  78.3% (OL). The four kickers in the cohort all made it. The positions that reach level 50 most often are the ones picked for
  Clashes most often: OL starters averaged 17.7 Clash lineups in the eight seasons, kickers 42.3, CB 0.6. Base
  rewards are equal by position (controlled run); the difference is Clash selection.
- **For a human player** every Tuesday encounter uses the lineup he picks, so his starters can be mixed-mode by choice. That
  was not simulated here.

**Decision for the owner:** accept the gate as met for genuine mixed-mode starters and record that AI-club starters are mostly
football-only (controlled median 9 seasons), or treat AI Clash selection as something to change (it is decision 3 in
`MASTERY_FINDINGS.md`). No authorized tuning was applied: the shared XP multiplier (0.5–2.0) could lift the football-only pace,
but it would also speed up mixed-mode starters, who already meet the target.

## Gyms

| | Gym clubs | Other AI clubs |
| --- | --- | --- |
| Club-seasons (seeds 11–14, 20 seasons) | 640 | 560 |
| Mean team OVR | 59.1 | 57.5 |
| Win share | 58.1% | 44.2% |
| Playoff seasons | 62.7% | 39.8% |
| Titles | 61 | 17 |

- **Element preference (D9) is working without a quota.** Each gym's roster is 22% to 37% its own element, against a league
  share of 7% to 12% for that element.
- **Gym strength is stable across the run:** win share 58.7% in seasons 1–5, 57.8% in 6–10, 58.0% in 11–20. Early, mid and late
  tiers win 61.4%, 57.4% and 56.2%.
- **Compared with before Task 8** (seeds 1–3, first ten seasons): gyms won 61.2% then and 59.0% now; other AI clubs 37.0% then
  and 41.5% now; gym titles 29 of 30 then and 27 of 28 now. Task 8 did not make gyms stronger.
- I found no numeric target for gym strength in the approved documents, so this is reported, not graded.

## Legendaries

- **Limit:** one offensive and one defensive legendary per club. In 1,220 club-seasons the most any club held was 1 and 1.
- **Legendary kickers (B19):** present in 76 club-seasons and counted on the offensive side; no club exceeded the offensive limit.
- **Synergy:** each gym holds its own element's legendary, the only copy in the league (`src/data/gyms.js`), and builds an
  element-heavy roster around it (table above). Four legendaries (Pyroclast, Elderoot, Tempestra, Astralux) never appeared on an
  AI roster in these runs.

## Apex in real franchises

| Season | Apex on AI rosters (4 franchises, 64 clubs) | Mean per club | Most on one club |
| --- | --- | --- | --- |
| 5 | 13 | 0.20 | 2 |
| 10 | 25 | 0.39 | 3 |
| 15 | 42 | 0.66 | 3 |
| 20 | 53 | 0.83 | 4 |

- **Accumulation is steady, about 0.6 a season per franchise,** because an Apex never retires. 25 club-seasons had three or more.
- **Development:** of 58 Apex individuals seen, 33 ever started a game and 10 reached level 50. None is close to all 99s
  (`APEX_OPTIONS.md`).
- **Acquisition and retention:** an Apex stayed with 1.62 clubs on average and none spent a season unsigned. Under the current
  code an undeveloped Apex asks the ordinary salary for his rating ($21,360 at OVR 12): the approved Apex ask (B9) is not
  implemented (`ECONOMY_FINDINGS.md`), so he is cheap to hold.
- **Rate comparison (0.25% / 0.5% / 1%):** not run. The specification asks for it only "if league accumulation is excessive". One
  Apex per club after twenty seasons, none of them developed, did not seem excessive to me; that is a judgement for the owner.

## Ordinary pancakes (league-weighted)

10 franchise seeds × 6 seasons per configuration, every league game, real club rosters. Dragon Stomp knockdowns (about 23,000
per configuration) and guaranteed pancakes (about 300 to 400) are counted separately and excluded.

| Configuration | Per base starting OL per game | Success per attempt | Lost block per attempt | Games |
| --- | --- | --- | --- | --- |
| Default (qmax 0.15, b 0.35) | 0.861 (0.843–0.879) | 51.4% (50.9–52.0) | 8.1% | 4,687 |
| qmax 0.12 (the handoff candidate) | 0.679 (0.663–0.693) | 50.7% (50.1–51.4) | 8.4% | 4,660 |
| qmax 0.10 | 0.561 (0.548–0.574) | 50.9% (50.2–51.5) | 8.6% | 4,716 |
| **qmax 0.10, b 0.30** | **0.513 (0.501–0.525)** | **46.3% (45.6–47.0)** | **9.6% (9.2–10.0)** | 4,698 |
| Target | 0.2–0.6 | 30–50% | at most 15% | |

- **The handoff candidate is not supported** on league rosters: frequency and success are both above target, intervals included.
  It was not integrated.
- **qmax 0.10 with b 0.30 meets all three targets,** intervals included. Both values are inside the approved bounds
  (qmax 0.10–0.20, b 0.25–0.45); 0.10 is the floor for qmax.
- **Ordinary shed events** are reported apart from pancakes: about 370,000 to 379,000 per configuration, 1.47 to 1.50 per
  scrimmage play, unchanged by the candidates.

**Decision for the owner:** approve qmax 0.10 with b 0.30. Integration would edit `pancake-structure` in
`docs/beast-dex/data/task8-overrides.json`, regenerate the Dex, and land as its own simulation commit with a fresh regression,
identity baseline and replay check.

## Not done

- A human-played mixed-mode starter cohort (the runs are hands-off).
- The Apex generation-rate comparison (see above).
- A re-run of anything under a changed rule: no rule was changed.
