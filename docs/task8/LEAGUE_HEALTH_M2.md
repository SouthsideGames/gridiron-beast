# League health without seasonal boosts (M2, 2026-11-07)

**Question (owner, 16:42).** Does removing the annual club-strength boosts preserve normal AI progression, training, ageing and
roster management?

**Answer.** Yes for progression, training, ageing and roster management. There is one balance concern for the owner: without
any boost, gyms' strength advantage over ordinary clubs shrinks from about 5 points to about 1 by season 10 (D9 in OPEN_DECISIONS.md).

## Method

- **Tool:** `tools/t8-league-health.mjs`.
  - Hands-off franchises (`tools/franchise-soak.mjs`), Pro difficulty, seeds 1–3, 10 seasons each.
  - The study owner is never dismissed, so all 10 seasons run.
  - Figures are means over the three seeds, measured after each season's offseason.
- **"After"** is commit 8f1ab56: no seasonal growth (N7f, M1), rubber-banding retired, and the M2 activity rewards.
- **"Before"** is commit 918b838: the old decision-C balance nudge still running, and the M1 rewards.
  - Two things differ between the runs (the nudge and the rewards), so treat the comparison as context, not an isolated effect.
- **Problems:** 0 game-invariant problems in all six runs.
- **Raw data:** `data-league-health-m2-after.json` and `data-league-health-m2-baseline.json`.

## After: no boosts, M2 rewards

| Season | Gym starters | Ordinary starters | Owner (hands-off) | Club 10th–90th pct | Roster sizes | Mean age | Mean level | Trained pts/monster | Decline pts/monster | Level-50 monsters | Retired legends |
| ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 55.2 | 50.3 | 52.2 | 47–60 | 33–38 | 24.3 | 13.0 | 12.2 | 1.4 | 25 | 0 |
| 2 | 57.8 | 53.1 | 53.2 | 50–61 | 34–38 | 24.7 | 14.7 | 13.9 | 2.2 | 38 | 2 |
| 3 | 59.5 | 55.4 | 55.5 | 52–62 | 35–38 | 25.1 | 16.4 | 15.7 | 3.2 | 53 | 9 |
| 5 | 61.5 | 58.0 | 55.7 | 56–64 | 32–38 | 25.7 | 18.3 | 17.9 | 5.9 | 66 | 20 |
| 7 | 61.5 | 60.4 | 56.5 | 57–64 | 34–38 | 26.0 | 19.5 | 19.3 | 8.0 | 81 | 45 |
| 10 | 61.5 | 60.6 | 56.1 | 58–64 | 31–38 | 26.2 | 18.9 | 20.0 | 9.5 | 106 | 93 |

## Before: balance nudge, M1 rewards

| Season | Gym starters | Ordinary starters | Owner (hands-off) | Club 10th–90th pct | Roster sizes | Mean age | Mean level | Trained pts/monster | Decline pts/monster | Level-50 monsters | Retired legends |
| ---: | ---: | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 54.2 | 49.0 | 52.0 | 46–57 | 32–38 | 24.2 | 12.4 | 10.9 | 1.3 | 24 | 1 |
| 2 | 56.0 | 51.1 | 53.1 | 49–59 | 35–38 | 24.7 | 13.6 | 11.7 | 2.0 | 34 | 3 |
| 3 | 57.1 | 52.5 | 53.9 | 50–59 | 34–38 | 25.1 | 14.5 | 12.3 | 2.8 | 40 | 8 |
| 5 | 57.9 | 54.3 | 56.2 | 52–60 | 33–38 | 25.6 | 15.2 | 12.8 | 4.8 | 48 | 21 |
| 7 | 57.5 | 54.8 | 54.6 | 53–61 | 32–38 | 25.8 | 14.8 | 12.7 | 5.4 | 43 | 47 |
| 10 | 57.4 | 55.2 | 52.9 | 53–59 | 30–38 | 26.0 | 14.8 | 13.1 | 7.2 | 46 | 100 |

## Findings

1. **Progression is natural and bounded.**
   - AI starters rise from about 50–55 OVR (the weak founding rosters of M1) to about 61, then plateau from season 6.
   - Ageing decline keeps growing (1.4 to 9.5 points per monster), and the plateau holds without any boost or brake.
2. **Training works for AI clubs.**
   - Invested training rises steadily (12 to 20 points per monster).
   - The approved allocation spends the banked points.
3. **Ageing and turnover work.**
   - Mean age moves from 24 to 26; decline accumulates; retirements and legend stubs grow (93 legends by season 10).
   - Monsters reaching level 50 rise from 25 to about 106 (out of about 570 AI monsters).
4. **Roster management holds.**
   - Every AI roster stays between 31 and 38, above the 26 minimum, in every season of every run.
   - Strategy modes keep cycling: in season 10, 7 clubs are rebuilding and 17 contending across the three seeds.
5. **Parity tightens.** The clubs' 10th–90th percentile range narrows from 47–60 to 58–64.
6. **Gyms lose most of their edge (concern).**
   - Gyms lead ordinary clubs by 4.9 points in season 1 but by 0.9 in season 10. With the nudge, the lead was 2.2.
   - The tier bonus sets only initial strength, and nothing structural keeps gyms ahead. See D9.
7. **The hands-off owner lags.** At 52–57, the owner's club trails the AI because the study owner never spends training points. This is a study artefact, not a game rule.
8. **Pacing.** Mean level rises about 0.6 levels per season after season 2 across the whole league, which includes generated veterans and rookies.
   - The B6 benchmark (median level 50 in 5–8 seasons for played monsters) needs the dedicated M6 pacing run.
