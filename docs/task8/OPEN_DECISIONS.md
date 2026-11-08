# Open roster-strength and economy decisions, with recommendations (2026-11-07)

Each item says what is open, what the evidence shows, and what I recommend. Nothing here is implemented beyond today's behaviour
until the owner rules. Evidence: `M1_STARTER_CALIBRATION.md`, `LEAGUE_HEALTH_M2.md` (10-season study), the M1 preview.

| # | Decision | Recommendation |
| --- | --- | --- |
| D1 | Founding-roster strength | **Option 2**: map the selection target onto each channel's post-history ratings |
| D2 | Draft-class growth (+0.5 per season) | **Retire it** with the other seasonal boosts |
| D3 | Salary cap and pool thresholds on the Dex rating scale | **Percentile-based thresholds**, set at the M6 economy recalibration (#30); interim: no change |
| D4 | Level-XP multiplier (B6) | **Keep 1.0** until the M6 pacing benchmark; adjust only within the 5–8-season target |
| D5 | Comeback mode | **Retire it** under N7f (no rubber-banding) |
| D6 | Stat guide versus the Appendix C role register | **Follow the register** in the guide (M6 presentation) |
| D7 | AI identities (four questions in AI_IDENTITIES.md) | Approve as proposed (details below) |
| D8 | Cheap free agents accepting half their ask | **Review at #30**; no change now |
| D10 | Live kickoff return balance | **Keep live returns; tune only the return unit's escort blocking within the existing engine at M6 if the season reports confirm short returns** |
| D9 | Gyms losing their strength edge over 10 seasons | **Structural, not boosts**: implement the identities (D7) and the gym mode floor, then re-measure at season 5/10 reports |

## D1. Founding-roster strength

**What happens now.** Starters average 49.3 OVR (10th percentile 34, lowest 21) against 57.9 (52) before Task 8. The approved
mapping picks a percentile of each form's *level-1* distribution, and the prior-career simulation then adds growth by age, so a
young starter lands far below the old floor. Running backs average 41.

**Options.**
1. Keep it. Wider spread; age and development matter more; the engines (tuned on 52–66) see much weaker lineups.
2. Map the target onto the channel's post-history distribution: draw the nine candidates, simulate each candidate's prior career
   first, and pick by the resulting current rating. Ratings stay legal and untouched; only which individual is kept changes.
3. Give founding starters a veteran age profile (fewer 20–22-year-old starters).

**Recommendation: option 2.** It keeps the approved mechanism (nine legal candidates, one Apex roll, Temper-neutral) and the
percentile meaning (a 50th-percentile starter is a typical starter at his age), and it fixes the cause rather than the symptom.
Cost: about nine prior-career simulations per veteran generated (measured later; the reference sample would be cached per form
and age band). Option 3 changes the league's age structure, which drives ageing and contracts.

## D2. Draft-class growth

**What happens now.** Draft classes rise +0.5 quality per season, capped at +10 (Task 6 D9). D9 existed to keep classes level with
the league's seasonal growth, which N7f retired. With N7f, it is an automatic yearly rise in incoming talent.

**Recommendation: retire it.** Class strength then comes from the generator alone, every season alike. If later seasons prove too
weak in the franchise-health reports, adjust the class quality tiers once, not per season.

## D3. Salary cap and pool thresholds

**What happens now.** Salaries follow OVR (18,000 + 280 × OVR). With lower Dex ratings, AI payrolls sit well under the fixed caps
(about 1.12M re-sign asks against a 1.8M Challenger cap in one measured club), so the cap trim rarely fires. The pool thresholds
(`POOL_WORTH`: castoffs worth keeping at OVR 52, the owner's market mark at 60) were set for the old scale, so fewer AI castoffs
reach the owner's market.

**Recommendation.** Express both as positions in the league's own distribution instead of fixed numbers, and set them at the M6
economy recalibration (#30) from the franchise-health runs:
- the caps at the payroll percentile they held before Task 8 (median AI payroll as a share of the cap);
- `POOL_WORTH.ovr` and `.market` at the starter percentiles that 52 and 60 represented before (about the 10th and 70th).

No interim change: the M1/M2 previews keep today's numbers so the effects stay visible.

## D4. Level-XP multiplier

**What happens now.** B6 approves 75 XP per level and a multiplier tuned to the benchmark (median level 50 in 5–8 seasons). The
M2 awards (50 XP per full game, 25 per Clash, 12.5 per reserve game) run with multiplier 1.0.

**Recommendation.** Keep 1.0 until the M6 pacing benchmark measures played monsters (not generated veterans) under mixed
participation; then adjust once within the 5–8-season band. Today's evidence is in `LEAGUE_HEALTH_M2.md`.

## D5. Comeback mode

**What happens now.** On Pro and All-Star, a side trailing by 10+ in the fourth quarter plays with +5 on every core rating
(GDD §17; shown to the player; off on Rookie).

**Recommendation: retire it.** N7f rules out rubber-banding and forced results. Comeback mode is symmetric and visible, but it is
an in-game rubber band. If the owner wants to keep it as a difficulty option, it needs an explicit exception to N7f.

## D6. Stat guide versus the role register

**What happens now.** The in-game stat guide's "does nothing for this position" marks disagree with the approved Appendix C role
register on 21 position/attribute pairs (examples: a kicker's speed and strength, a quarterback's blocking). The trainer follows the
register.

**Recommendation: follow the register** and show two levels in the guide: "counts toward OVR" and "used by the position" (the
register's approved non-OVR uses). Presentation only (M6).

## D7. AI identities

Recommendations on the four questions in `AI_IDENTITIES.md`:
1. **Gym mode floor:** keep it. Gyms never fall below Compete, so they stay the stronger strategic tests.
2. **Ordinary coaches:** fix each ordinary club's coach tendencies for the franchise, matching its identity.
3. **Identity table:** approve as proposed; the strategies use only the gyms' approved legendary abilities, with Glacivern's
   field-position plan built on Second Chance and Deep Winter (no Avalanche, N7g).
4. **Rookie:** "more forgiving ordinary opponents" applies to ordinary clubs only. Today Rookie's −4 also lowers gyms; change it to
   ordinary clubs only, so gyms remain the stronger tests on every difficulty.

## D8. Cheap free agents

**What happens now.** Many low-salary free agents accept half their ask outright. This is consistent with the unchanged
negotiation and the 85% floor not being extended (N7f).

**Recommendation.** No change now. Re-examine with D3 at #30, because the asks themselves move with the rating scale.

## D9. Gyms' strength edge over time

**What happens now** (`LEAGUE_HEALTH_M2.md`). With no seasonal boosts, gyms lead ordinary clubs by 4.9 OVR in season 1 but only 0.9
by season 10. With the old nudge the lead held at about 2. The gym tier bonus sets initial strength only.

**Recommendation.** Keep gyms stronger through legal, visible structure rather than boosts, all already proposed:
- the identity-guided drafting, training and signings (D7, item 3);
- the gym mode floor (never below Compete, D7, item 1);
- element-first rosters with their legendary.

Re-measure in the franchise-health reports at seasons 5 and 10. If the edge still collapses, the owner can choose a structural
lever, for example a larger initial tier gap or a scouting/draft priority for gyms. No automatic yearly boost.

## D10. Live kickoff returns

**What happens now.**
- Kickoffs are live plays (P7). The approved kicking formula still decides distance and touchback, so touchbacks are unchanged at 46%.
- The return and coverage are played by the engine's existing movement, blocking and tackling.
- Over 1,500 kickoffs (`tools/ko-probe.mjs`):
  - live returns average 20.2 yards, to a start at the 23.5;
  - the formula averaged 23.8 yards, to the 28.0;
  - live returns produced 0 return touchdowns in 804 (the formula had 6 in 923) and 5 lost fumbles.

**Choices made where the spec is silent** (minimal; for review):
- 7 per side, with the unit fill orders taken from the starters, package slots first;
- a hang time of 2.6 s, reused from the existing kickoff animation;
- the kickoff still takes 5 s off the clock;
- no muffed catches;
- coverage tackles counted separately (`stTackles`);
- no comeback, scheme edge or partnership credit on kickoffs.

**Recommendation.** Keep live returns as they are for the M2 preview, so the owner can watch them. If the franchise-health reports
confirm the shorter returns and the missing touchdowns, tune only the return unit's escort blocking inside the existing engine at
M6. Do not reintroduce formula yards.

### D10 update: verification before tuning (owner 18:20)

`tools/ko-diagnose.mjs 1000`. "Before" is commit 0019383; "after" is the fix at 3d1ad9f (branch task8-m2-kickoffs-fix, merged).

| Check | Before | After the fix |
| --- | --- | --- |
| Coverage starts within a yard behind the kick, 7 lanes | 523/523 | 523/523 |
| Catch | every live return, at 2.65 s | same |
| Blockers engaging anyone | 11.7%, first contact 3.15 s after the catch (median) | 68.1%, first contact 1.95 s after the catch |
| Blocks on a man already past the blocker | 10.9% (probe of the real pairs) | 0% |
| Tackled with no block engaged | 325 of 519 | 98 of 517 |
| Returner lateral path, median / p90 | 4.2 / 6.0 yd | 5.7 / 8.6 yd |
| Play length after the catch, median | 3.2 s | 4.5 s |
| Plays ending within 1 s of the catch | 0 | 0 |
| Return yards p10 / p50 / p90, max | 17 / 20 / 23, 27 | 21 / 29 / 37, 98 |
| Returns over 30 / over 40 | 0 / 0 | 198 / 27 |
| Touchdowns, turnovers (1,000 kicks) | 0, 4 | 1, 5 |

**What was wrong** (correctness, not balance):
- blockers had no target and waited as a convoy;
- engagements in flight were not resolved;
- coverage abandoned its lanes at the catch, so the K made 92 tackles.

**What changed** (engine primitives only):
- blockers share out the legal targets in front of them and meet them with the pursuit's intercept maths;
- coverage holds its lanes, then pursues;
- the K keeps the safety cushion.

**Remaining observations** (not tuned):
- the returner still runs mostly straight, because his carrier logic looks only 4–10 yards ahead;
- LB1 makes more tackles than LB2 (ratings, not geometry).

Hang time 2.6 s and the 5 s clock runoff stay provisional. No muffed catches.

## D11. Rebuilding clubs' starter sales (R4) have nearly stopped

**What we measured** (leagues 51–55, three seasons each, before Task 8's progression at dd2245d against the current build):

| | Before | Now |
|---|---:|---:|
| AI–AI trades | 36 | 35 |
| R4 starter sales | 4 | 0 |

Seed 11's four seasons show where sales stop. In those seasons:
- rebuilding clubs looked at 16 sellable ageing starters;
- 4 of them had a replacement within 4 overall;
- that produced 31 buyers with a need and 102 fair-price offers;
- every one of those offers failed the existing deal rules: 89 on the buyer's minimum gain (8 in the offseason, 16 in season), 11 on a full roster and 2 on the seller floor.

So the sale rules work as written. What has changed is the league: Task 8's ratings make a qualifying ageing starter with a close replacement rare, and the gain bar then stops the trade. `tests/task6-phase-d.test.js` "R4 in play" fails for this reason. I have left it failing rather than pick a seed.

**Options**
1. **Accept that sales are rare now.** The in-play test becomes an explicit staged scenario, and the rules stay as they are.
2. **Loosen the replacement margin.** It is 4 now (F4, owner-approved 2026-11-03).
3. **Lower the buyer's gain bar for sales only.**

**Recommendation:** option 1 for now, and look at the number again with the franchise-health reports at seasons 5, 10, 15 and 20. Options 2 and 3 change approved rules, so they are yours to make.
