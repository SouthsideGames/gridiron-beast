> Historical consolidated specification, November 5. Later approvals in APPROVED_RULES.md and data/forms.json override conflicting profile, rarity and evolution statements below. This snapshot is retained for the shared engine requirements, not a second active profile source.

# Gridiron Beast Task 8 Implementation Specification
Consolidated owner decisions through November 5 2026

Owner: Kareem Butler. Intended implementer: Claude. Revision 1 of the consolidated specification.

This document replaces the October 31 foundational Task 8 document. It consolidates the approved monster, ability, progression, Temper, Apex, presentation, and validation requirements. Use it with the Beast Dex for individual abilities and evolution values. Later decisions in this document override conflicting older workbook or repository statements.

The consolidation is complete as a record of approved decisions. The implementation package is not yet ready for an unattended start: the release dependencies and remaining specifications in Section 18 must be closed first. These are explicit blockers, not permission for Claude to invent gameplay. No runtime tests or production changes have been performed by producing this document.

## 1 Scope and authority
Implement the current 72 monster families, 102 forms and 12 legendaries across Fire, Water, Nature, Electric, Earth, Ice, Wind, Dark, Light, Metal, Psychic and Dragon. Each family has one football signature and one distinct Beast Clash ability: 144 mode abilities, with form-specific evolution values. The long-term 500-monster and 60-legendary expansion is outside this task.

Preserve the target engine's existing football team size. The inspected source uses 7v7; this task does not authorize an 11v11 conversion. Preserve one active Clash fighter per side with reserves. Do not interpret opening 3v3 lineups as three simultaneous active fighters. Approved reserve and rotation mechanics require explicit integration with the current franchise battle policy.

> **Approved Task 8 ruling (2026-11-07, N7b P8; R1 item 26).** Ordinary bench attacks are removed; explicit reserve abilities remain. Voluntary rotation, its timing and its entry penalty are defined in [§20](#20-approved-task-8-rulings-2026-11-07).

Every species family has one fixed football position through evolution. No random individual position, secondary position, cross-position eligibility or position-changing evolution. Type, football position, Clash archetype, Temper and Apex designation are separate concepts. Evolution preserves family rarity. Do not raise rarity automatically on evolution.

Position targets count families once, not individual roster copies or forms.

| Position | Families | Legendary families |
| --- | --- | --- |
| QB | 7 | 2 |
| RB | 7 | 1 |
| WR | 8 | 2 |
| TE | 7 | 1 |
| OL | 7 | 1 |
| DL | 7 | 1 |
| LB | 7 | 1 |
| CB | 8 | 1 |
| S | 7 | 1 |
| K | 7 | 1 |
| Total | 72 | 12 |

The reviewed Clash archetype totals are Striker 14, Balanced 15, Disruptor 15, Tank 13 and Support 15. Aim for diversity over future additions, but do not change approved archetypes to force equal counts. The default category distribution is a design aid, not a reason to undo approved exceptions. Zone creators may share their base zone effect; different percentages alone do not make non-zone abilities unique.

### Source precedence
1. This document's later owner-approved rules and explicit corrections.
2. The final approved, versioned Beast Dex and its referenced ability details, progression rows, status definitions and individual exceptions, except where superseded here.
3. Existing repository behavior for implementation evidence, not authority to override the design.

The current companion workbook is Gridiron_Beast_Beast_Dex.xlsx, Library identity libfile_9251839d08b08191a12777876b1b274c, version 18. It includes historical columns and old audit notes. Legacy columns are not approved final mechanics. The final GitHub data URL and immutable commit must be inserted before handoff. The workbook's old 0/100/300/600 mastery thresholds and inactive-attribute training prohibition are superseded.

The workflow is: consolidate this specification; finish the player-facing Beast Dex and 72-family attribute profiles; publish the finalized implementation data at the agreed GitHub location; pin that revision; only then give Claude the complete package. No provisional profiles may be silently treated as final.

### Relationship to Task 7
Keep the single-position rule. Task 7 must independently address positional shortages, lineup coverage, gym replenishment, veteran preference and rebuilding. Task 8 supplies the approved family assignments and new development model; it is not proof that Task 7 regressions are fixed. Element-themed gyms may need mixed-type supporting players. Do not create dual eligibility to make themed teams complete.

Preserve unrelated Task 7 systems, including contract and Ambition behavior when present in the eventual target branch. Temper does not replace Ambition. Re-audit the actual integration branch and record its SHA; the workbook's historical fc19d345 baseline is not a fresh implementation audit.

## 2 Monster identity and individual variation
Use a constrained generator, not a closed list of 30 exact copies. Species profiles define recognizable strengths, weaknesses, starting ranges and ceilings. Individuals vary in both starting ratings and permanent per-attribute potential. Roll attribute potential independently within species boundaries; no compulsory total-potential budget forces a weakness to compensate for a strong roll. Distribution shape and exact ranges remain data specifications to finalize.

An individual retains its generated identity, potential and Temper through saving, loading, trades, free agency and evolution. Evolution applies defined growth without rerolling individuality. No reload, acquisition or evolution rerolls. Hidden longevity remains associated with individual identity. Current ratings can train, grow and decline; underlying potential is not the same as current strength.

Keep all 12 attributes: Speed, Agility, Strength, Awareness, Catching, Arm, Accuracy, Blocking, Tackling, Coverage, Durability and Kicking. All monsters can train all 12, respecting their individual ceilings. Attributes irrelevant to football position remain excluded from that position's OVR where appropriate; allowing training does not make Kicking useful to a QB on ordinary football plays.

The global permanent rating maximum is 99. Ordinary individuals obey their species and individual limits. Ripplet's ordinary fully trained Catching maximum is 78 and Speed maximum is 95; these are not starting ratings. Apex is the explicit exception to ordinary species ceilings. Temporary gameplay modifiers are separate from permanent development.

## 3 Temper System
Temper replaces the old Nature mechanic. A Temper changes training efficiency only. It never directly modifies starting ratings, current effective ratings, development ceilings, automatic level growth, ability power or AI behavior. Delete the old Nature 1.10/0.90 effective-attribute multipliers from active gameplay paths.

An ordinary new individual receives one of the 25 Tempers uniformly at random. There is no weighting by species, type, rarity, football position or Clash archetype. There are 22 specialized and three neutral Tempers. Each has 4% probability; combined neutral probability is 12%. Apex is the explicit exception and always receives a neutral Temper.

| Temper | Favored attribute | Unfavored attribute |
| --- | --- | --- |
| Swift | Speed | Strength |
| Powerful | Strength | Speed |
| Forceful | Strength | Blocking |
| Protective | Blocking | Strength |
| Patient | Blocking | Awareness |
| Adaptive | Awareness | Blocking |
| Instinctive | Awareness | Accuracy |
| Precise | Accuracy | Awareness |
| Measured | Accuracy | Arm |
| Bold | Arm | Accuracy |
| Gifted | Arm | Durability |
| Resistant | Durability | Arm |
| Hardy | Durability | Tackling |
| Relentless | Tackling | Durability |
| Aggressive | Tackling | Coverage |
| Disciplined | Coverage | Tackling |
| Watchful | Coverage | Catching |
| Surehanded | Catching | Coverage |
| Secure | Catching | Agility |
| Elusive | Agility | Catching |
| Explosive | Agility | Speed |
| Driven | Speed | Agility |
| Calm | None | None |
| Balanced | None | None |
| Steady | None | None |

Each of the 11 non-Kicking attributes appears twice as favored and twice as unfavored. Kicking is always neutral. Any Temper can appear at any position, including combinations with irrelevant football benefits or drawbacks. Do not restrict the pool to useful position pairings.

Favored training progress is 2x; neutral is 1x; unfavored is 0.5x. Equivalent training-cost multipliers are 0.5, 1 and 2. The older 0.75/1/1.25 and 0.5/1/1.5 cost proposals are superseded. All specialized Tempers have the same modifier strength; no rare superior Temper.

Reveal Temper at the first completed individual scouting report, showing favored and unfavored attributes. Before that show Temper unknown. Owners always see an acquired monster's Temper. AI cannot use unrevealed Temper information. A Temper remains unchanged through evolution.

## 4 Training investment and ageing
Let C be the neutral training cost for a +1 increase at the monster's current age. Let E be Temper effectiveness: 2, 1 or 0.5. The effective cost is C/E. One invested point contributes E/C of a rating increase at that cost. Use exact fractional accounting internally; bars represent partial progress. Do not round each purchase up to a whole point.

At C=1, one point grants +2 favored, +1 neutral or half a bar unfavored. At C=2, it grants +1 favored, half a bar neutral or one-quarter bar unfavored. At C=4, it grants half a bar favored, one-quarter neutral or one-eighth unfavored. Carry excess investment into subsequent increases, respecting ceilings.

Allow one-point investment and an exact-cost full-increase option when affordable. Banked points and invested progress belong to that individual, not a team pool. Partial investment cannot be withdrawn to another attribute. Preserve it through saves, trades and evolution. Evolution does not consume the investment. At a ceiling, refund unused investment to that individual's bank.

If age changes the cost, preserve invested points and recalculate the bar using the new cost; do not preserve bar percentage by creating free investment. Saved unspent points use the monster's age when spent. They do not retain young training prices and do not expire.

Show progress bars without decimal balances, plus banked whole points and a whole-number training-bar percentage. Explain normal cost, age effect and Temper effect in words or inspection. Examples: Unfavored Speed development; Age increases physical training cost. Exact-cost purchases must remain understandable despite hidden fractional balances. The precise display and affordability treatment of banked fractions is a release specification gap.

### Existing ageing rules to preserve
These rules were inspected in src/data/aging.js and remain separate from the new Temper system. The integration audit must verify the eventual target branch rather than overwrite newer approved Task 7 changes.

| Position | Base physical threshold | Technical offset |
| --- | --- | --- |
| RB | 27 | 2 years |
| WR and CB | 28 | 2 years |
| TE DL LB and S | 29 | 2 years |
| QB and OL | 30 | 3 years |
| K | 32 | 3 years |

Physical attributes are Speed, Agility, Strength and Durability. Other attributes are technical. Peak Durability 75+ delays the threshold one year; 45 or less brings it forward one year. Record peak Durability using the existing peak-window logic so later decline does not keep moving the threshold.

Neutral physical training cost is 1 at or below the adjusted public threshold; 2 at 1-2 years past; 3 at 3-4 years past; and 4 at 5+ years past. Technical cost is 1 until after the public threshold plus its technical offset, then 2. Temper applies to these costs.

Hidden longevity varies from -3 to +3 years and affects actual decline, not hidden training prices. Ageing and decline occur in the offseason. Retirement is probabilistic, not a universal mandatory age. Preserve existing legendary and rival-signature exemptions and add the approved Apex exemption. Ageless individuals still use their Temper; Apex happens to be neutral.

AI allocation considers actual positional benefit, current ratings, individual ceilings, age and known Temper efficiency. It must not ignore an important unfavored attribute merely because it is expensive. Owners can enable automatic allocation under the same costs and constraints.

## 5 Apex individuals
Apex is exceptional individual potential, not species rarity or an additional ability. Eligible newly generated nonlegendary individuals independently have a fixed initial 1% Apex chance. Multiple Apex copies of the same species are allowed; there is no species quota. Do not change the rate without owner approval.

An Apex independently starts each of its 12 attributes at 10-15 inclusive, at level 1 in the development benchmark. Every underlying attribute ceiling is 99, including Kicking. Apex retains species position, type, abilities and evolution family. It receives a neutral Temper. Exact sampling among the three neutral Tempers and the 10-15 start range must be specified before handoff; equal selection is the natural proposal but was not separately finalized.

Apex does not receive an extra training multiplier. It is ageless and exempt from age-related decline and retirement, making eventual all-99 development genuinely possible. It remains subject to fatigue, injuries, ordinary recovery and temporary gameplay effects. Injury does not remove Apex or its underlying all-99 ceilings; Apex does not automatically heal or restore lost current ratings.

Apex can use reserve-development slots under normal slot and participation limits, with exemption from age and potential-headroom restrictions that would incorrectly exclude it. It remains subject to other eligibility, such as injury. Contract valuation must reflect current ability, exceptional potential and agelessness; an undeveloped Apex is less expensive than a developed one but is not valued as an ordinary weak prospect. Exact valuation rules remain a release dependency coordinated with Task 7.

### Discovery and presentation
Conceal the badge, appearance accent, exact all-99 ceilings and Apex-specific text until the potential-revealing scouting report. Acquiring an unidentified Apex immediately reveals it. A player's discovery remains known in future encounters; another club's discovery does not automatically reveal it to the player. AI follows equivalent knowledge rules.

Play a dedicated 4-6 second panel once automatically per individual for the player: silhouette, restrained gold/white outline reveal, APEX DISCOVERED, monster name and potential summary. It is immediately skippable, with confirmation information available afterward, and replayable from the profile. Reacquisition does not reroll or automatically repeat the first-discovery sequence.

State Potential 99 in every attribute, Starts undeveloped, Ageless and Neutral Temper. Display current ratings separately. Preserve species colors and silhouette; add a subtle gold double-outline and an emblem on roster/profile cards. Do not add a permanent extra overhead badge. Reduced-flash mode uses a steady outline/fade and no reveal camera shake; respect sound settings. Skip, replay and interruption cannot change identity or award rewards again.

## 6 Three progression bars
Store monster level XP, training progress, football mastery and Clash mastery independently. The relevant-mode interface presents three bars: level, that mode's mastery, and shared training. Two mastery records exist even when only one is displayed.

| Track | Earned from | Reward and limit |
| --- | --- | --- |
| Level | Eligible football and Clash activity and reserve development | Automatic attribute growth and evolution eligibility; maximum level 50 |
| Training | Eligible participation plus bounded positive performance; reserve and offseason awards | One spendable point per full training bar; continues at level 50 |
| Ability mastery | Actual valid ability use in its own mode | Developing Practiced Expert Mastered; preserved through evolution |

Level-ups no longer award spendable training points. The earlier six-points-per-level proposal and 4-8 tuning range are retired. Training-bar completions carry excess progress forward. At level 50 show MAX, stop level XP and automatic level-up growth, and do not convert excess level XP into training. Training and mastery can continue.

### Natural growth
> **Superseded wording (owner decision, 2026-11-06).** The rating cap below ("capped at the automatic-growth limit" and the rule that skipped natural gains are lost once training reaches the limit) is superseded by the Nov 6 allowance rule in [PROGRESSION_DECISIONS.md](PROGRESSION_DECISIONS.md). Under that rule, S + floor((P−S)/2) − S is an automatic-growth *allowance* computed from the approved starting rating and individual ceiling, independent of training. Early training does not reduce it, all gains stay bounded by the individual ceiling, and reaching the ceiling never creates overflow or bonus training points. The original text is kept for traceability.

For an attribute starting at S with individual ceiling P, the automatic-growth limit is S + floor((P-S)/2). Thus S=40, P=78 gives limit 59; S=10, P=99 gives limit 54. Evolution adjustments must be explicitly authored. Level growth is a fixed per-attribute schedule through level 50, with fractional scheduled entitlement preserved. Temper and age do not change that schedule; separate age-related decline still applies.

Track natural entitlement separately from training. Apply only the newly earned scheduled increase, capped at the automatic-growth limit. Early training does not consume future natural entitlement while the current rating remains below that limit. Once training has raised an attribute to or above the limit, do not redirect skipped natural gains into other attributes or banked points. Past entitlement is never re-awarded to restore age-related losses. Keep growth and decline records separate.

Evolution preserves trained progress, ceilings appropriate to the new form and mastery. It does not reroll or reset individuality. Exact evolution growth and updated natural limits are deferred to the finalized profile work; Claude must not retain old +3/+1 and +4-potential code merely because it exists.

### Level XP and training awards
| Activity | Initial award |
| --- | --- |
| Football full participation | 50 level XP before positional adjustment; 25% training bar |
| Partial non-kicker football participation | Multiply base XP and standard training award by min(1, actual live snaps/10) |
| Kicker football participation | One eligible actual kick qualifies for base participation; category sample protections still apply |
| Clash selected lineup member | 25 level XP before archetype adjustment; 25% training bar, including unused reserves |
| Reserve development after football | Training progress 25% of standard participation award: initially 6.25% of a bar; no double starter/reserve reward |
| Eligible offseason | 2 banked training points per individual; replaces separate direct maturation increases |

A monster on the field under immobilization still participates in a live snap. Mere depth-chart listing is insufficient. Kicker zero-kick eligibility and detailed eligible-snap definitions must be frozen in the release specification. Ordinary reserve development retains existing slot limits (inspected baseline: six total, at most two per position) and its non-Apex eligibility unless explicitly revised. Its new level-XP award remains to be fixed; do not silently choose between the old 24-based reserve formula and the new football base.

Clash participation intentionally includes every selected lineup member, overriding the earlier actual-combat-only proposal. Never-involved members get no performance adjustment. Status-forced skipped turns and early knockouts do not remove participation rewards. Each completed opening, standalone and overtime Clash separately awards participation; passive/aura mastery uses the separate same-game cap below. Watch and Skip award identically. Labs, reviewers, previews and replays award nothing.

The initial standard participation training award is 25% for both football and Clash. It may be tested from 20-50% in five-percentage-point steps, preserving equality. Reserve share stays 25% of that standard. Performance bonus is max(0, final performance adjustment/0.20) times 5 percentage points, capped at five points. A +10% XP grade yields +2.5 training percentage points; zero or negative performance yields no bonus. How this bonus scales for partial football participation must be finalized explicitly.

Offseason awards apply once at rollover to eligible individuals that existed in the league for the completed season, across all ages and level 50, including Apex and legendaries. Define the creation/season eligibility stamp precisely before implementation. No retroactive awards for prior seasons. Earned balances and progress persist in new saves.

### Mastery
Initial cumulative valid-use thresholds are 0, 10, 30 and 60. Authorized alternatives for testing are 0/15/45/90 and 0/20/60/120. Use one shared set initially; do not give individual multipliers without approval. The workbook's older thresholds are superseded.

An active valid execution earns one credit regardless of hit, tackle, touchdown, interception, healing result or win. Invalid or prevented pre-execution activations earn none. Multiple hits or targets do not multiply a single execution's credit. Define each ability's exact execution boundary in its event contract.

Passive/aura mastery earns at most one credit per game when its core effect actually applies. Standalone Clash battles each have their own cap. Opening and overtime Clash share one passive/aura cap within the surrounding football game. Football and Clash mastery never grant each other credit. No participation-only mastery. Evolution retains both records.

## 7 Football performance calculations
Use actual individual assignments and telemetry, not nearest-player assumptions. Unknown attribution gives no individual execution penalty. Keep ordinary box-score statistics intact even where a grading exclusion applies. Unless explicitly excepted, unavoidable ability overrides are not ordinary execution errors. Every final positional adjustment is bounded at -20% to +20%.

Notation: clamp(x) bounds x to -1..1. sample(n,k)=min(1,n/k). Rates use decimal fractions. A category with no applicable opportunities contributes zero; do not redistribute its weight. Weighted-category adjustment = 0.20 times sum(weight times grade times sample). Single-score formulas are stated separately. Negative grades reduce only this activity's award, never previously earned XP.

### Offensive lineman
One scored opportunity per OL per play. Use the most severe attributable failure if one exists, otherwise the strongest positive. A single breakdown receives sack rather than shed + pressure + sack penalties. Use assignments and engagements to distinguish an unblocked blitzer, another blocker's error and a QB holding the ball. No penalty from field side alone.

| Outcome | Score |
| --- | --- |
| Pancake | +2 |
| Successful assigned pass protection or run block | +1 |
| Neutral or uncertain | 0 |
| Disruptive block shed allowed | -1 |
| Attributable pressure without sack | -2 |
| Attributable sack | -3 |

Adjustment = clamp(average score) times 20% times sample(opportunities,10). Ordinary blocks count; pancakes are not required. Exact definitions of a successful protection interval and run-lane contribution require telemetry contracts, not a final-play-result shortcut.

### Quarterback
Score one eligible passing or QB rushing play: TD or first down +2; other completion or QB run gaining at least four yards +1; neutral/uncertain 0; attributable INT or QB fumble -3. Fumbles override positives. Designed handoffs, kneels and spikes do not enter performance opportunities, although valid participation remains. Do not penalize QB sacks or inaccurate incompletions separately. Do not award extra YAC yardage XP.

The play component is clamp(average score) times 20% times sample(eligible plays,10). Add the ordinary box-score completion-rate component below, then cap the combined adjustment at +/-20%. No passing attempts means no rate adjustment. The completion-rate component has NO small-sample reduction, by explicit owner choice. Receiver drops and ability-forced incompletions remain in this ordinary rate even when they do not establish QB error for other events.

| Completion rate | Adjustment |
| --- | --- |
| Below 50% | -10% |
| 50% to below 60% | -5% |
| 60% to below 70% | 0% |
| 70% to below 80% | +5% |
| 80% or above | +10% |

### Running back
Grade rushing and receiving only. No blocking component. Rushing first downs receive no separate bonus. TD +2; non-TD receiving first down +2; other reception +1; negative-yard carry or catchable drop -1; fumble regardless of recovery -3; other outcome 0. One score per play, fumble priority. Negative carries intentionally affect both YPC and the explicit negative-carry score.

Outcome component = clamp(average score) times 20% times sample(eligible rushing/receiving opportunities,10). Efficiency component below is scaled by sample(carries,10). Add and cap at +/-20%. Zero carries gives no efficiency component.

| Yards per carry | Adjustment before sample scaling |
| --- | --- |
| Below 2.5 | -10% |
| 2.5 to below 3.5 | -5% |
| 3.5 to below 4.5 | 0% |
| 4.5 to below 5.5 | +5% |
| 5.5 or above | +10% |

### Wide receiver
Use the ten owner-selected receiving measures, not untargeted-route or blocking scores. Use ordinary recorded targets including uncatchable targets. No targets gives no receiving adjustment. Catchable-drop attribution is separate. Sum the components below and cap at +/-20%.

| Measure | Approved adjustment |
| --- | --- |
| Catch rate | Below50% -4%; 50 to below70% 0%; 70 to below85% +2%; 85%+ +4% |
| Receiving yards | 25-49 +1%; 50-74 +2%; 75-99 +3%; 100+ +4%; below25 neutral |
| Yards per reception | 12 to below15 +2%; 15+ +3%; no reception neutral |
| Yards per target | Below4 -3%; 4 to below8 neutral; 8 to below12 +2%; 12+ +3% |
| TDs | +4% each, maximum +8% |
| First downs | +1% each or +2% on third/fourth down, maximum +4%; no TD duplication |
| Drops | -3% each, maximum -9%; zero gives no extra reward |
| Average YAC per reception | At least5 gives +2%; otherwise no penalty |
| Explosive receptions | +2% per 20+yard reception including YAC, maximum +4% |
| Red zone | +1% per non-TD receiving first down inside opponent20, maximum +2% |
| Ball security | -6% per fumble regardless of recovery, maximum -12% |

Scale catch rate, YPR, YPT and average YAC components by sample(targets,5). Counting-stat components remain earned without an extra general sample multiplier. Zero-denominator efficiency components are neutral. Overlap between catch rate, YPT and drops is deliberate; test sensitivity to poor passing opportunities.

### Tight end
Use fixed weights Production20%, Efficiency20%, Situational20%, Blocking25%, Reliability15%. No role-based weight redistribution. Each category is clamped to -1..1 before weighting.

| Category | Grade | Sample factor |
| --- | --- | --- |
| Production | receptions/5 + receivingYards/60 + receivingTDs - 1; no targets neutral | sample(targets,5) |
| Efficiency | Mean of clamped (catchRate-.70)/.20, (YPT-8)/4, (YPR-12)/6; undefined YPR neutral | sample(targets,5) |
| Situational | +.25 per non-TD receiving first down; extra .25 third/fourth conversion; .25 non-TD red-zone reception; cap 1 | sample(relevant targeted plays,5) |
| Blocking | Mean OL opportunity scores, clamped | sample(block opportunities,10) |
| Reliability | 1 - .5*drops - 2*fumbles - .5*accepted attributable penalties; no opportunities neutral | sample(relevant plays,5) |

Situational denominator counts targeted third/fourth downs, red-zone targets, or plays producing a receiving first down, once per play. Explicit drops/fumbles penalties appear only in Reliability; their ordinary production consequences remain. Count only accepted attributable penalties actually supported by the engine; do not invent a penalty system. Reliability requires catchable targets, possession or supported penalty opportunities. A block-and-release play's exact opportunity classification must be specified without changing these fixed weights.

### Defensive lineman
Use PassRush30%, RunDefense30%, Disruption20%, Assignment10%, Discipline10%. Per-opportunity categories average their scores; use only the highest positive outcome per category/play. Clamp each category. Scale every category by its relevant opportunities/10, capped1; no opportunity neutral.

| Category | Grade inputs |
| --- | --- |
| Pass Rush | +2 sack; +1 hit/pressure/hurry; 0 otherwise; highest only |
| Run Defense | +2 TFL; +1 run stop of2 yards or fewer; +1 gap control forcing redirection; 0 otherwise |
| Disruption | +3 forced fumble; +1 tip; +1 penetration demonstrably disrupting play; highest only |
| Assignment | +1 successful contain, productive double-team occupation or direct teammate enablement; maximum1/play |
| Discipline | Start1; subtract .5 per missed tackle and 1 per lost contain allowing improvised QB scramble10+yards |

Mere proximity is not pressure, crossing LOS is not disruption, and taking damage/displacement is not automatically failure. Designed QB runs use run assignments rather than the improvised-scramble rule. Missed tackles and contain penalties appear only in Discipline. A strip sack can contribute sack to Pass Rush and forced fumble to Disruption. Avoid stacked sack/hit/pressure/hurry credit on one rush.

### Linebacker
Use RunDefense25%, Coverage25%, PassRush20%, Tackling20%, Impact10%.

| Category | Grade inputs | Sample factor |
| --- | --- | --- |
| Run Defense | Mean: +2 TFL; +1 run stop<=2yd; +1 gap control redirect; -1 verified gap failure; one/play, failure priority | sample(run opportunities,10) |
| Coverage | Mean per attributable target: +2 INT; +1 breakup; 0 other incompletion; -1 completion; -2 first down/TD; one/target | sample(targets,5) |
| Pass Rush | Mean: +2 sack; +1 pressure/hurry/hit; 0 otherwise; highest only | sample(rush opportunities,10) |
| Tackling | Mean: +1 solo tackle<=2YAC; +.5 assist; 0 other completed tackle; -1 miss or completed tackle>5YAC; one/attempt | sample(valid attempts,5) |
| Impact | Sum .5 forced fumble +.25 recovery +.5 INT +.25 personal fourth-down tackle/breakup stop; cap 1 | sample(defensive snaps,10) |

Clamp all category grades. Actual man/zone responsibility applies. QB incoverage snaps are not pass-rush opportunities. Do not penalize an unsuccessful chase of a faster carrier as a missed tackle without a valid attempt. Drops and uncatchable passes earn no personal coverage success. No extra fourth-down credit for an INT. Gap errors score only in Run Defense; misses only in Tackling. An INT may improve Coverage and Impact; an effective short tackle may improve Run Defense and Tackling. These overlaps are approved.

### Cornerback
Use Efficiency35%, Execution25%, BallDisruption20%, Tackling15%, Impact5%.

| Category | Grade inputs | Sample factor |
| --- | --- | --- |
| Efficiency | Mean of clamped (.60-completionRateAllowed)/.30, (8-YPTallowed)/6, (.40-firstDownOrTDrateAllowed)/.40; then -.5 per TD allowed; clamp again | sample(attributable targets,5) |
| Execution | Mean +1 correct assignment prevents viable window; -1 verified failure creates viable window; 0 otherwise; failure priority | sample(coverage plays,10) |
| Ball Disruption | Sum .25 breakup +.5 INT; cap 1; no INT/breakup duplication | sample(attributable targets,5) |
| Tackling and Run Support | Mean +1 solo tackle<=2YAC; +.5 assist; +1 containment redirect; -1 miss/lost contain/completed tackle>5YAC; failure priority, one/play | sample(relevant opportunities,5) |
| Impact | Sum .5 forced fumble +.25 recovery +.25 personal fourth-down tackle/breakup stop; cap 1; no INT fourth-down duplication | sample(defensive snaps,10) |

No targets means neutral Efficiency; Execution can reward verified untargeted coverage. A first-down TD target counts once in the combined rate. The extra TD penalty is deliberate. Evaluate separation relative to assigned responsibility, not every short route conceded under deep coverage. A viable window must be established while a throw remains possible. Uncertain attribution and unavoidable ability overrides are excluded from grading opportunities, without editing the ordinary box score. Explicit misses and contain penalties appear only in Tackling/Run Support. Do not penalize normal execution for Daybreak or afterimage override behavior.

### Safety
Use Coverage30%, Tackling25%, Assignment20%, BallDisruption15%, Impact10%.

| Category | Grade inputs | Sample factor |
| --- | --- | --- |
| Coverage | Same CB Efficiency formula including additional TD penalty | sample(attributable targets,5) |
| Tackling and Run Support | Mean +1 solo tackle<=2YAC; +.5 assist; +1 assigned gap/edge redirect; -1 missed tackle/attributable gap-edge failure/completed tackle>5YAC; one/play, failure priority | sample(relevant opportunities,5) |
| Assignment and Deep Protection | Mean +1 deep-window prevention/correct pursuit redirect/assigned QB contain; -1 verified deep failure/harmful pursuit-angle error/lost QB contain; one/play, failure priority | sample(assigned opportunities,10) |
| Ball Disruption | Same CB .25 breakup +.5 INT, cap 1 | sample(attributable targets,5) |
| Impact | Same CB .5 forced fumble +.25 recovery +.25 personal fourth-down stop, cap 1 | sample(defensive snaps,10) |

Keep gap/edge execution in Run Support and deep positioning/pursuit/QB contain in Assignment. Do not explicitly score the same error or redirection in both. A long play elsewhere is not automatically the safety's fault. Merely staying deep gives no prevention bonus. Unavoidable effects and uncertain responsibility give no execution penalty.

### Kicker
Use FieldGoals50%, PAT15%, Punting20%, Kickoffs15%. For each category multiply its clamped grade by sample(eligible attempts,3), then weight. No attempts neutral.

FG and kicked-PAT attempt score = 2*(result - p), where make=1, miss=0 and p is documented pre-attempt probability including relevant ability effects. Average before clamping the category. Two-point plays are not PAT kicking opportunities. At p=.90 a make scores+.20 and a miss-1.80; at p=.30 a make+1.40 and miss-.60. A guaranteed make scores0. Ability mastery still follows valid use. Exclude documented non-kicker protection failures and unavoidable overrides from individual failure grading.

| Placement category | Distance error from legitimate pre-launch target |
| --- | --- |
| Punt | <=3yd +1; >3 to 7 +.5; >7 to 12 0; >12 -1 |
| Kickoff | <=5yd +1; >5 to 10 +.5; >10 to 20 0; >20 -1 |

Average one score per kick. Unintended punt touchback or premature out-of-bounds placement failure scores-1 instead of distance score. Attributable illegal out-of-bounds kickoff scores-1. Intended legal kickoff touchback is successful placement. Targets must be legal, attainable and selected without future RNG knowledge. Use existing catch/landing physics, not new roll/bounce mechanics. Net field position remains a reported statistic, not an extra XP component. Teammate return-coverage errors are not kicker penalties.

## 8 Beast Clash performance calculations
All selected lineup members earn base participation. Never-involved members receive neutral performance. Evaluate contribution using Clash archetype, not football position. Actual useful effects matter; ability mastery still credits valid uses even when results fail.

| Archetype | Offense | Defense | Support | Disruption |
| --- | --- | --- | --- | --- |
| Striker | 60% | 20% | 5% | 15% |
| Tank | 15% | 65% | 15% | 5% |
| Support | 10% | 20% | 60% | 10% |
| Disruptor | 20% | 15% | 15% | 50% |
| Balanced | 35% | 30% | 20% | 15% |

Weights stay fixed. Unavailable categories are neutral, not redistributed. Average contribution ratios per opportunity, convert to grade 2*average-1 bounded at +/-1, then multiply by sample(opportunities,3), archetype weight and .20. Add categories; final performance is +/-20%, giving20-30 initial level XP from 25. Positive performance also determines the bounded training bonus.

Offense: per executed damaging action, ratio=(actual enemy HP damage + .5*shield damage)/(20% of affected enemies' combined maxHP). Count each enemy once in the reference total; cap ratio1. A KO adds .25, still cap 1. Exclude overkill, self damage, friendly damage and allied KOs from positive credit. Zero-target invalid actions do not create a denominator. An executed miss is an opportunity with zero damage contribution.

Defense: per enemy damaging action against the monster or an ally it protects, ratio=damage prevented or absorbed by its protection/(25% of protected target maxHP), cap 1. Losing HP alone earns no protection credit. Unused protection facing no eligible attack is not failure. Group/multiple-source allocation and overlapping prevention require an explicit bounded benefit ledger before implementation.

Support: per executed support action, evaluate each recipient's actual healing relative to 15% of its maxHP; a successful harmful-status cleanse gives that recipient full contribution. Cap recipient contribution1, then average recipients. The approval described both combined-maxHP and per-recipient averaging; mixed-size targets and heals-plus-cleanses require the final arithmetic convention in Section 18. No overheal credit. A heal restoring half its reference gives ratio.5, neutral grade before sample reduction.

Disruption: per executed control/debuff application, contribution1 if it subsequently denies an action or measurably changes enemy action, targeting, damage or resource use; otherwise0. Multiple consequences of the same application do not multiply credit. Store attribution until use, expiry or battle end, including when source is in reserve or KO.

Count each actual benefit once: damage Offense, healing/cleanse Support, shield absorption and protective reduction Defense, enemy-action interference Disruption. Multi-effect abilities can contribute distinct benefits. The exact classification of outgoing-damage debuffs versus defensive prevention needs a frozen ledger rule, not duplicate scoring. No nominal unused-shield or unused-control full credit. Do not infer no contribution opportunity merely because an executed action failed.

## 9 Ability execution and shared runtime
Implement all approved abilities and form/mastery variations from the final Beast Dex. Each contract needs source and target eligibility, trigger, charge/cost, spent-versus-preserved conditions, effect, lifetime, cooldown unit, carryover, cleanup, counters, visual events and acceptance fixtures. Automatic conditional football activation is the default. Vyrnax's player-selected once-per-game special field goal is an explicit manual exception.

Do not guarantee tackles, catches, interceptions or other outcomes unless the individual ability expressly does so. Legendary mechanics may be powerful and unusual; preserve their explicit costs and exceptions rather than replacing them with generic buffs. Shared technical primitives are encouraged, but unique tactical identity remains required. Compare all future abilities against the register and legacy mechanics, not names alone.

Store charge, once-use ledgers, delayed events, readiness and cooldowns in authoritative state. Rendering, replay and reviews cannot tick or apply them. Preserve per-ability scopes: participating plays versus all qualifying plays, recipient turns versus owner turns, first eligible action versus launch, and source-KO persistence. Do not impose a single clock on every ability.

### Later corrections overriding the workbook
Blazing Resolve: first eligible tackle begins one tackle encounter. Snapshot all defenders already within tackling reach, break their attempts, spend ignition; later arrivals can tackle normally. No one-second window. Keep other approved charge, rushing eligibility, fumble and persistence rules. Do not copy old Eruption's defender stun. Exact encounter snapshot and duplicate-contact handling must be defined in event tests.

> **Approved values (N7b P2).** A completed official rushing attempt qualifies when its net gain exceeds the form threshold: Flaroo over 7 yards, Blazynx over 4 yards, Infernox any positive gain. See §20.

Failed-pancake Stumbled: remove one-second recovery. Lose40% current speed, preserve maximum speed and use ordinary acceleration. Clear at whistle. End failed engagement; require legal ordinary reacquisition, with no automatic reattachment and no additional timed lock. A stationary OL can still lose its engagement. This is distinct from Slowed and from Knocked Down.

> **Superseded in part (R1 item 7; N7b P5).** A failed pancake no longer ends the engagement automatically: Awareness decides recovery. A recovered failure keeps the block; only an unrecovered failure ends the engagement and attempts Stumbled as described above. See §20.

Shared Burden: compute attacker power and outgoing modifiers once before raw splitting; apply each recipient's own type, defense and shield rules. Floor source share and give original target remainder, conserving raw budget. Example101 at 30% gives30 and 71. Strongest link applies; equal links choose earliest creation then stable monsterID. Keep active-only Tank protection, no reserve Tank guard, no link chains and approved owner-KO behavior.

Mind Mend: floor percentage donation, bound by target missingHP and source currentHP-1, debit and intended credit equal whole amount. Then apply recipient healing reduction and floor actual gain; prevented healing is lost, no refund. No affordable positive donation preserves readiness under normal fallback. Debit/credit is atomic, not damage or a shield-generating event.

Root Communion: simultaneous bounded whole-HP apportionment, conserve total living HP before healing reductions, each living recipient>=1 and<=maxHP, fractional ties stableID. Healing reductions apply only to gains; lost gains are not redistributed. Donor reductions do not trigger damage or retaliation. Pin the exact apportionment algorithm with fixtures rather than independent per-recipient rounding.

If different statuses attempt application at the same boundary, preserve established event order; genuine ties use stable sourceID then abilityID. First accepted status occupies the shared slot; later attempts use normal gates. No extra random tie roll.

Movement priority: existing immobilization constrains movement first; otherwise Daybreak wandering overrides afterimage pursuit, which overrides ordinary assignment. Suppression does not extend or pause either override's lifetime. Resume only an independently still-valid effect when a higher-priority one ends.

Clone football records remain credited to the owner as individually approved, but clone-generated events are excluded from owner performance XP and training bonuses. No extra clone XP, mastery or owner ability triggers. Distinguish clone event provenance from ordinary owner events. Nature clones and Voltarch guards retain their different approved status/environment eligibility; do not universalize clone immunity.

## 10 Shared statuses and cross mode continuity
Appendix B retains the complete twelve-status identity list from the approved workbook. Shared rules below are authoritative together with individual exceptions. Neutral names replace elemental labels: Afflicted, not Burning; Stunned, not separate Shock or Frozen statuses. Preserve elemental source animations without adding duplicate status identities.

Exactly one shared status type is active per monster, beneficial or harmful. Different statuses cannot replace it without an explicit removal/replacement ability. Equal same-status applications add duration only, not strength, shieldHP or charges. An episode accepts at most three applications total; ticking does not reopen slots. Stronger same-status acceptance replaces strength and remaining duration, counts another application and does not reset the episode. Weaker applications are ignored and consume no slot. At three applications even stronger attempts are blocked until the episode ends.

Football counts completed plays the monster actually participates in, including special teams and conversions where status rules permit. Bench and other-unit plays pause countdown. Clash counts recipient normal turns, including Stunned skips; reserve, reactions and counters do not tick. The application play/turn does not consume duration, unless an explicit within-play exception applies. Effect persists through the last counted participation, then expires. Afflicted ticks at end of recipient normal turn before decrement; not on application turn or in reserve.

Supported statuses transfer1:1 between opening/overtime Clash and football, keeping remaining duration and episode history. Unsupported destination effects clear rather than remain dormant in the slot. Preserve through possessions, halftime and overtime; actual complete football-game end clears. Clash KO immediately clears that monster's status and episode. Standalone battle boundaries must not accidentally clear same-game carryover.

> **Approved scope (R1 item 16; N7b; N7c B18).** Football-applied Stunned sources are the currently approved rest-of-play sources only. A Stunned carried from Clash keeps its remaining duration 1:1, and each remaining unit disables one participating football play. Football Stunned left over at a mode transfer carries back 1:1 the same way. No other multi-play football Stunned source is approved.

Pancake is a blocking outcome applying existing Knocked Down through the shared gate; every pancake-caused knockdown lasts the rest of current play and clears at whistle. Stumbled is football-only current-speed loss, not complete immobilization; Slowed changes maximum speed. Keep explicit Water slip once-success-per-play and application-play cleanup exceptions.

Ordinary cleanses remove harmful statuses only; buff removal needs explicit permission. Faultline's100% Healing Reduced remains uncleansable except where an approved legendary replacement explicitly overrides it. Mountain Shelter creates a fresh Guarded episode for every living ally, self and reserves, overriding existing status/episode as specifically approved. Dragon Call does not stop Daybreak or Sovereign Arm capture because those are not shared statuses.

Blocked status application does not cancel independent damage or physical effects, and spends normal resources unless an ability says otherwise. Do not retry every frame. Confused defaults to 25% redirect of an eligible normal attack to the attacker's own side, with launch-time handling for delayed attacks; individual application chances are separate from this redirect chance. Astral commanded Confused reserves misfire against self, without recursive confusion or retaliation chains.

Shielded absorbs damage in Clash and prevents one otherwise-occurring football fumble. A football save consumes the entire episode. Equal extensions do not refill shields or grant more fumble saves. Compare original shield strength, not depleted remainingHP. Preserve original pool, remaining fraction, spent-save flag and application history across modes. First football-created shield starts fraction1; source-defined Clash shield scales by saved fraction. Legitimate stronger replacement follows the episode rule.

Deep Winter pauses expiry only while harmful effects continue. Preserve remaining freeze counters across mode transfer; reserve/bench pauses both. Accepted same-status new applications end that episode's freeze; rejected/weaker attempts do not. Glacier Wall rebuild resolves only after the triggering whole hit and attached effects; source must survive and triggering overflow is not retroactively protected. Preserve special ownership conditions from the Dex.

## 11 Fields geometry and overlap
Fields are environmental modifiers, not shared statuses or head badges. Base matching-type monsters receive neither benefit nor penalty. Eligible other types on both teams are affected. An explicit field-inflicted status uses normal status gates. Direct abilities remain team-aware unless individually approved otherwise.

| Base field | Approved property |
| --- | --- |
| Fire | Reduce maximum movement speed, not automatic fatigue damage |
| Water | Sharp-cut/stop slip attempts Stumbled; approved40% current-speed loss; no automatic Knocked Down |
| Nature | Reduce turning control; straight speed and acceleration unchanged |
| Electric | Chance to apply Stunned |
| Earth | Increase resistance to contact displacement without guaranteed immunity |
| Ice | Reduce braking control and extend stopping slide; no automatic fall |
| Wind | Increase maximum movement speed |
| Dark | Reduce Awareness; essential UI remains truthful |
| Light | Extra repeatable-signature cooldown unit under approved end-play rule |
| Metal | Defer first changed automatic decision inside field by one AI decision update |
| Psychic | Bounded inward environmental pull; approved center deadband |
| Dragon | No base field |

Exact source strength, geometry, probabilities and duration come from each ability's approved data, not a universal invented magnitude. Width means sideline-to-sideline; length means end-zone-to-end-zone. Rectangles and squares are supported. Shift laterally inward to preserve width, clip length at playable bounds and never expand the physical field.

Earned next-snap fields use the upcoming formation reference, not stale prior-ball locations. Show them before both teams' choices and keep placement stable through audibles where approved. Pending bars wait through special teams and possession changes per individual rules. World-positioned fields do not automatically follow the new LOS. Count incomplete plays where the approved lifetime does; do not introduce completion-only clocks.

Impact Pyre charges from three qualifying defensive plays then creates6x4 Fire at the LB's next eligible defensive starting position. Burning Wake earns a pending Fire rectangle after 5+YAC: fixed5-yard length at opposing LB depth, minimum5-yard width increasing with total qualifying YAC, bounded by field width; preserve final Dex geometry. Splashdown remains at the deflection location and excludes creation play from its two-subsequent-play lifetime. Tsunami Line places a full-width5-yard-long Water band in the next opposing secondary. Bloom Break creates its approved random patches for the next eligible offense. Do not restore deprecated trail/previous-stop placements.

Add modifiers for the same movement property: -15% status plus -10% field yields-25%; leaving restores-15%. Opposite changes cancel arithmetically. Maximum ordinary speed reduction75%, boost50%; hard immobilization remains separate. Current-speed loss is not a maximum-speed modifier. Exhaustion's attribute halving remains its own layer.

### Approved overlap recipes
Only six listed recipes create hybrids. Parent effects are replaced within overlap; parent types are exempt. Unlisted types keep both effects with same-property cancellation. Same-type overlap uses strongest magnitude rather than addition. At a point with3+types choose one compatible recipe by oldest parent-pair creation order and stable IDs, apply unpaired base effects, and never recursively react hybrids.

| Hybrid | Parents | Approved effect |
| --- | --- | --- |
| Steam | Fire and Water | Visible cloud; nonparent Catching-15% and Blocking-15% inside; no double catching penalty |
| Eclipse | Light and Dark | Prevent starting active signatures inside; existing effects/passives/launched effects and charge/cooldowns continue; blocked start spends nothing |
| Living Terrain | Nature and Earth | At most4 safe1-yard-diameter vine clumps per connected overlap; path around for nonparents; parents pass through; no ball collision/status |
| Magnetic Storm | Electric and Metal | Once/play nearest eligible nonparent pair within 3yd, one partner each; resist separation>3yd with20% applicable-max-speed pull; break at 6yd, exit or whistle |
| Froststorm | Ice and Wind | Side drift15% applicable maximum speed; seeded direction fixed/play; net2yd cap; collision-safe |
| Mindstorm | Psychic and Electric | One echo2yd behind per affected monster/play; opposing eligible AI may follow for one decision update; no actor/collision/ball; truthful UI |

Light: non-Light finishing a participating scrimmage play inside receives one extra cooldown unit after ordinary decrement on the shortest positive running repeatable-signature cooldown, once/monster/play. No charge bars or once-use refresh. Metal: non-Metal first changed AI target/assignment/engagement decision inside is adopted after one ordinary AI update; retain a valid prior action or hold. Never delay user input or physics.

Keep approved legendary halftime exceptions for Burning Wake and Tsunami Line: same footprint and remaining count, no duplication or refresh. Nonlegendary fields clear at halftime where specified. Prism Break removes exactly its selected approved zone/overlap region and corresponding parent contributions; do not remove all fields. Preserve the final22 closeouts in the companion data.

## 12 Stamina attributes and special objects
Permanent Durability defines maximum and initial stamina1:1. Temporary Durability modifiers do not resize the pool. Initial participation drain is1 stamina point per completed played football play, explicitly a balance input requiring testing. Bench/other-unit time does not drain ordinary stamina. Only halftime restores50% of maximum, capped at full; no first-down, possession or bench rest. Preserve the approved resource definition rather than mixing the old fatigue-is-high-when-tired field with remaining stamina.

At zero stamina halve all 12 effective attributes once for the remaining actual game, including overtime/deciding Clash. Halftime restoration does not erase the game-long exhaustion flag. Apply other normal modifiers and the single halving consistently without compounding. Show a low-stamina battery at 25% capacity or below, cycling with status/charge; it is informational, not a status. Reconcile Afflicted's fatigue-resistance role against permanent-capacity rules in the final formulas.

Speed governs movement maximum and acceleration; Agility turning and the approved position-specific evasive behavior. Strength governs contact displacement, fumble resistance and applicable contests; WR Strength improves contested catching. Blocking governs maintaining blocks/block-shed opposition according to approved position rules. Appendix C preserves the full attribute-role register. Those are intended effects, not finalized numeric contest weights.

> **Approved (N7b).** TE contested catching keeps the approved Agility-based role; TE Strength adds no contested-catch contribution.

OL has one ordinary pancake attempt total per play. Establish an advantage first; Awareness informs attempt risk and failure recovery. Strength, Blocking and Tackling contribute as approved; defender Strength/Agility resist. Exact contest weights and thresholds are not authorized for Claude to invent. Guaranteed individual pancake abilities use their explicit exceptions and shared status gate.

Implement physical clones, blockers, walls, obstacles, projectiles, bounded pushes, teleports and temporary defender absence as their own primitives where approved. Do not force them into shared status slots or environmental fields. Source identity, collision ownership, actual football possession, deterministic legal placement, source-KO handling and whistle cleanup are part of each contract. No new pulling ability is authorized merely because Psychic and Magnetic environmental forces remain approved.

Sovereign Arm preserves one pending defender absence across possessions/halftime/OT, serves it on the next qualifying same-team offensive scrimmage play with no substitute, pauses absent status durations, then restores normal formation. Stone Cradle ends the eligible caught punt without a hidden stun. Stone Screen uses its displacement/forward-yard lifetime, not seconds. Daybreak wandering includes both teams except its source, persists after same-play possession changes until whistle, and allows collision obstruction without new tackle attempts. Preserve these individual exceptions.

## 13 Presentation and both ability reviewers
Update the existing football Ability Reviewer and add a dedicated Beast Clash reviewer. Both are mandatory implementation deliverables, not optional documentation. Enumerate all 144 mode abilities and every approved form/mastery variant with no silent missing entries.

Use actual gameplay ability/event/rendering code. Allow monster/form/mastery selection, relevant scenario and target conditions, charge/readiness setup, replay/reset, quality selection, reduced-flash mode and Apex appearance. Football scenarios need real placement references, field geometry, movement, obstacles and status gates. Clash scenarios need active/reserve arrangements, HP/shields/statuses, delayed effects and support/commanded interactions. Preview controls cannot modify franchise progression or simulate fake visuals unrelated to gameplay.

Expose valid activation, invalid/blocked activation, multi-target, depletion, cleanup and relevant source-KO/rotation scenarios. Show primary VFX, affected targets and hitboxes where inspection is enabled. Include the charge/status/battery fade cycle. Ability readiness and cooldown inspection works for both teams with mobile controls and optional pre-snap tactical overlay. Never hide the ball or misrepresent actual state to create spectacle.

Use a small light-grey circular shared status badge with dark neutral symbol and small duration number. No extra stack icons. Inspect strength, accepted applications out of3 and mode-specific behavior. Alternate badge, charge/recharge bar and low-stamina battery; no simultaneous crowding. Field effects stay on the field or in inspection, not as additional head badges. Apex emblem is a profile/roster marker, with on-field visual accent rather than another permanent badge.

Keep full recognizable primary animation at all quality levels. Prioritize main events; throttle secondary particles, camera shake and ambient effects. Cosmetic reductions never change simulation. Cinematics are short and interruptible as specified; gameplay timing is authoritative and cannot wait for optional render completion. User visual approval occurs through the reviewers after implementation; automated tests do not claim aesthetic approval.

## 14 Mobile rendering and performance
Default to a60 FPS target with a selectable30 FPS battery-saving mode. Both settings must produce identical outcomes, clocks and seeded results. Reduce authorized secondary VFX first if performance suffers; keep the selected mode and offer30 FPS rather than silently changing the setting or simulation. Provide effect-quality, camera-intensity and reduced-flash controls.

| Mode | Average minimum | Frame-time requirement |
| --- | --- | --- |
| 60 FPS | 58 FPS | 95% of frames <=20ms |
| 30 FPS | 29 FPS | 95% of frames <=40ms |

Reference devices are iPhone12 and Pixel6, or explicitly agreed documented equivalents before testing. Test packaged builds on physical devices,10 minutes after warm-up, three runs per device per mode. Record device, OS, package/build, quality, power/thermal conditions and scenario. Desktop emulation is not physical-device verification. If access is unavailable, report the requirement as unverified, not passed.

CPU simulation processing must be no more than 10% slower than matched baseline on the same hardware and scenarios. Rendering FPS and headless CPU processing are separate gates. Freeze a representative ability-heavy scene set before testing, including overlapping fields, summons, delayed effects and a legendary sequence. Exact scene manifests and warm-up duration remain handoff dependencies.

## 15 Saves replay and deterministic state
Owner authorizes a fresh-save break because the game is not live and only the owner is testing. Old-save compatibility and old Nature/profile/mastery migration are not required. Questions264-270 are retired. No old save is deleted by this planning document.

At actual release, identify incompatible saves clearly and provide Start New Franchise. Do not silently parse incompatible data as current. A backup/export option is advisable but was not approved as a mandatory gate. New saves must be reliable: preserve generated attributes/ceilings, Temper, Apex/knowledge/reveal ledger, longevity, training investment, level/mastery, charge/status/field/absence state where saving is supported and activity-reward completion records.

Award rewards once per persistent activityID and monsterID; aggregate football statistics and actual participation by monster, not occupied slot. Starter and reserve-development awards cannot both apply for the same football activity. Interrupted reward application must resume or finish atomically without duplication or partial rerolls. Preserve exact fractions internally; display rounding does not change balances. Same seed and inputs produce identical simulation outcomes, regardless of Watch/Skip,30/60 FPS, quality or replay.

The complete scope of mid-play/mid-Clash save/resume needs to be frozen before handoff. Existing active-game fields and approved continuity tests do not authorize silently dropping state on load. Replays render recorded authoritative events and award nothing. Apex results are fixed at generation, not acquisition.

## 16 Validation and authorized tuning
Approved values are starting inputs until tested, not claims that balance or performance passes. Hard logic tests and statistical targets are different. Guaranteed behavior must pass every applicable case; a1% random effect is not required to occur in every trial.

| Gate | Approved requirement |
| --- | --- |
| Per-ability functional coverage | 100 distinct scripted cases per mode ability, all passing; 14400 cases across 144 abilities before additional form/interaction coverage |
| New save and reward persistence | 100/100 fixtures pass; legacy migration requirement retired |
| Football and Clash continuity | 100/100 scenarios pass across statuses, durations, halftime, OT and game end |
| Generation invariants | 100000 individuals, zero eligibility, ceiling, Temper or Apex violations |
| Apex frequency | Separate10000 eligible generation roll report; expected about100 at 1%, not exact100 |
| Seed replay | 100 identical-seed/input comparisons with identical gameplay outcomes |
| Mastery pacing | Ordinary abilities target Mastered in 3-6 seasons of sustained eligible use; report rare-trigger/legendary outliers separately |
| Ordinary level pacing | Median level 1-to 50 in 5-8 seasons under documented mixed participation |
| Level attainment | At least75% of ordinary mixed-mode starters reach 50 within 8 seasons; retirees count as non-attainment |
| Position fairness | Equal base rewards under matched neutral participation; flag median progression differences>15% from overall median |
| Ordinary ceiling attainment | Fewer than 10% non-Apex nonlegendary individuals reach all 12 ceilings simultaneously in mixed-mode benchmark |
| Apex development | At least90% reach all 99s by season 15 under sustained legal participation and equal attribute investment |
| Simulation CPU | <=10% slowdown against matched baseline |
| Mobile frame pacing | Section 14 physical-device gates |
| Reviewer completeness | All abilities/forms/masteries available using actual runtime rendering; owner visual signoff separate |

Career sample:100 individuals per position per schedule,1000 across 10 positions for each of football-only, mixed and maximum-legal participation. Run position-focused, evenly distributed and approved AI training policies separately using matched individuals. Do not tune against a survivor-only subset or select only a favorable allocation strategy. Report attainment rates, time-to-level distributions, decline, training investments and ceilings by position/Temper. The exact schedule, creation ages, RNG seeds, allocation algorithms and treatment of retirement in the median must be frozen first.

Apex sample:100 per position,1000 total, level 1, independent starting ratings10-15, neutral Tempers, normal earning rules, legal participation and equal attribute investment. Track all 99s, not only position-relevant stats. State contributions of natural growth, evolution and banked training. Test ageless population accumulation separately in real franchise runs, including acquisition, retention, contract burden and development.

Run10000 initial Apex rolls at 1%, report count, observed percentage and species distribution; verify no Apex rule violations and exact repeatability. Do not infer a statistical bug solely from count differing from 100. If league accumulation is excessive, compare0.25%,0.5% and 1% in report-only experiments; keep production setting1% until owner approves a change. No quotas or guaranteed Apex per draft.

### Permitted tuning only
| Parameter | Initial | Authorized tests |
| --- | --- | --- |
| Standard training participation | 25% per football/Clash activity | 20-50%, steps5 percentage points, same rate both modes |
| Shared level-XP award multiplier | 1.00 | .50-2.00, steps.10, same multiplier football/Clash/reserve XP |
| Mastery thresholds | 0/10/30/60 | Also0/15/45/90 and 0/20/60/120; one shared set initially |
| Apex chance | 1% | .25/.5/1% comparisons only; no automatic production change |

Performance-grade formulas, category weights, Temper multipliers, Apex ceilings, level cap and individual ability mechanics are fixed unless another explicit permission is recorded. Do not change them merely to pass a benchmark. Keep reward ratios and automatic-growth rules intact when tuning level XP. Record each tested candidate and all gate results. The exact tuning selection/tie policy remains to freeze.

If no authorized candidate satisfies all targets, preserve approved mechanics, complete independent work and provide failure evidence and bounded alternatives. Do not redesign, quietly widen ranges, weaken tests or claim completion. Full functional cases pass100%; balance targets use their stated tolerances. Unavailable device testing is unverified.

## 17 Implementation work sequence
Phase 1: pin target branch and finalized Dex commit; run baseline tests; inventory actual ability, status, attribute, progression, Clash, rendering, reviewer and save paths. Reconcile Task7 changes and preserve unrelated features. Produce a field-by-field implementation map and test manifest without changing gameplay to fit assumptions.

Phase 2: implement validated data contracts and the new fresh-save schema; generator, per-attribute potential, Temper, Apex, knowledge and progression ledgers. Remove old direct Nature effects and point-on-level awards. Implement authoritative reward transactions and telemetry before grading.

Phase 3: implement movement/attribute consumer corrections, shared statuses, stamina, fields/overlaps, charge/cooldown clocks and special object primitives. Apply approved individual exceptions. Test same-frame ordering, boundaries, source KO, reserve actions, halftime/OT and state cleanup.

Phase 4: implement all football and Clash abilities from the finalized registry, including form/mastery variations, target eligibility, resource spending, fallback and special-team exceptions. Preserve ordinary-only archetype perks where approved. Verify no recursive reactions or invented companion effects.

Phase 5: integrate tactical AI using legitimate known state, actual hazards, readiness, matchups and positional needs. Implement all positional and archetype grading, use-based mastery, reserve development and post-level 50 training. Keep simulation outcomes independent of presentation.

Phase 6: update both reviewers, actual gameplay animations, status journal, inspection, Apex sequence, tactical overlays and settings. Conduct mobile render tests and provide owner review scenarios. Do not replace real preview coverage with pre-rendered unrelated clips.

Phase 7: run functional, deterministic, new-save, statistical, career and performance gates. Tune only permitted parameters. Update Dex implementation status and documentation to actual behavior; preserve design-versus-implementation distinction. Deliver development branch, exact commits, reports, reviewer instructions and known limitations. Nothing merges or publishes without separate owner instruction.

The implementer chooses code structure, helper names and refactoring details within these contracts. Missing gameplay rules and conflicts are not technical discretion. The intent is a complete handoff requiring minimal questions; unresolved requirements must be closed before that handoff rather than delegated to implicit interpretation.

## 18 Release dependencies and remaining specifications
These items are not new approved mechanics. They identify what still prevents this consolidation from being a no-decisions implementation package. Complete them with owner review or an explicitly approved technical contract before handing the final package to Claude.

| ID | Required closure |
| --- | --- |
| R01 | Finish72-family starting ranges and all 102 form ceilings, evolution growth, ordinary roll distributions and generated level/age rules. Freeze natural-growth schedule and evolution-limit math. |
| R02 | Publish final Beast Dex implementation data to GitHub, pin URL/commit/hash, validate72/102/144 counts, reconcile all workbook copies and remove superseded active instructions. |
| R03 | Audit actual target branch and Task7 integration. Specify exact attribute contest weights, pancake opportunity/contest/whiff rules, and telemetry definitions for viable windows, protection success, pursuit and gap responsibility. |
| R04 | Fix reserve level-XP award and post-level 50 reserve eligibility under per-attribute potential; define offseason eligibility stamp, partial-participation training bonus and score denominators. |
| R05 | Freeze career schedules, seeds, generation ages, lineup/allocation policies, retirement-inclusive median convention and ordinary ceiling observation window; choose deterministic tuning order/ties. |
| R06 | Define Apex contract valuation with Task7, neutral-Temper/start-rating sampling, and any remaining discovery persistence details. Preserve1% setting and all 99 potential. |
| R07 | Enumerate every status creator's destination payload, within-play disable/recovery behavior, and source-specific strength comparison. No universal invented duration/magnitude. Complete unreviewed timing audit beyond corrections here. |
| R08 | Freeze integer damage/heal/shield conversion rounding for remaining abilities, including Dragon Pounce HP cost, Root Communion bounded allocation and partial split mitigations. |
| R09 | Freeze event phases for simultaneous delayed effects, protection, cleanse, retaliation, final KO and final-whistle transitions. Tie rules alone do not define the whole phase order. |
| R10 | Reconcile Clash support contribution arithmetic for unequal recipient maxHP and heal-plus-cleanse; define damage-prevention attribution and outgoing-debuff classification without duplicate credit. |
| R11 | Define exact kick target selection/distance metric, retry-attempt grouping, field boundary cases and placement telemetry; preserve approved retry statistics. |
| R12 | Reconcile stamina, Afflicted, legacy fatigue data and Clash load consumers; specify exhaustion timing and remaining resource formulas without losing approved flags or changing temporary-capacity rules. |
| R13 | Freeze active-game save/resume boundaries, partial training refunds after age changes, display of spendable fractional balances, and idempotent event/reward recovery. |
| R14 | Set operational field/object caps, collision-safe spawn/search tie rules and exact representative performance scenes/warm-up. Do not silently delete active gameplay objects to improve FPS. |
| R15 | Consolidate per-ability100-case matrix and numerical probability tolerances; verify reviewer variant coverage, visual journal icons and rendering checklist. Actual tests remain implementation work. |

The remaining profile work occurs in the later player-facing Beast Dex phase, as instructed. The final handoff must not contain these unresolved alternatives. Final owner visual approval and physical-device verification occur after implementation and must be reported honestly rather than substituted with an automated claim.

## 19 Superseded instructions and source record
Retired (2026-11-07 additions, see §20–§21): universal ordinary evasion; football Stunned from unapproved multi-play sources (carryover is approved, §21 B18); clearing Stunned on mode transfer; hard pancake advantage threshold; slot-sum effect caps as gameplay limits; legendary-kicker refusal; Dawn Signal as a stat bonus without live coverage; voluntary rotation at the start of an exchange; free or action-cost rotation entry; ordinary bench attacks; TE Strength contested catching.

Retired:500-monster implementation scope;11v11 mandate in this task; secondary positions; rarity increasing with evolution; identical fully trained individuals; hard30-build cap; direct Temper stat multipliers; Kicking favored/unfavored Tempers; Apex limited by ordinary species ceilings; Apex nonneutral Temper; Apex instant all 99 starts; finite post-level 50 training ban; six training points per level; mastery from participation alone; old mastery XP thresholds; one-second Blazing Resolve; one-second pancake-failure recovery; five-second pancake Knocked Down; and old-save migration requirements.

Do not delete historical audit evidence to hide changes. Label it historical and link the replacement rule. The present consolidation records later approvals even while the version 18 workbook still contains older text. It does not claim that the workbook itself has been updated by this operation.

Primary source records are the October31 foundational document, Beast Dex version 18 and owner approvals in this conversation through the final presentation batch. Static repository inspections covered src/data/monsters.js, src/data/aging.js, src/data/personnel.js, src/franchise/progression.js, src/franchise/development.js, src/franchise/clash-link.js, src/clash/xp.js and src/clash/values.js on main. Those inspections explain integration risks and are not new simulation results.

Repository: https://github.com/SouthsideGames/gridiron-beast
Companion Dex: https://chatgpt.com/library?file_id=libfile_9251839d08b08191a12777876b1b274c&account_id=personal

The appendices preserve the family ability index, status journal and attribute-role reference to make the consolidated document reviewable. Per-ability trigger/target/visual/progression details remain in the companion Dex; the finalized GitHub dataset must carry them into implementation. Where an appendix retains older wording, the explicit overrides in the main document take precedence.

## 20 Approved Task 8 rulings, 2026-11-07

Owner rulings N7b (2026-11-07 09:21, recorded verbatim in docs/task8/RULINGS_2026-11-07.md) and N7a (2026-11-07 00:13). They override any conflicting statement above, in the appendices and in the v18 ability rows. Machine-readable values and the replaced ability sections are in `docs/beast-dex/data/task8-overrides.json`; the build (`tools/build-beast-dex.mjs`) applies them and keeps the v18 text as `supersededRule`. Items not listed here are not approved by this section; the full status of every item is in docs/task8/APPROVAL_REGISTER.md.

**Abilities**
- **Stoke the Flame (P1).** Counterburst deals 60 / 70 / 80% of normal attack damage for Flaroo / Blazynx / Infernox, plus 0 / 5 / 10 / 15 percentage points by mastery. Normal mitigation applies.
- **Blazing Resolve (P2).** Qualifying carry: net rushing gain over 7 yards (Flaroo), over 4 yards (Blazynx), any positive gain (Infernox). All other approved charge and tackle-encounter rules unchanged.
- **Beacon Lane (P3).** Created field lasts 1 / 1 / 2 / 2 participating offensive scrimmage plays by mastery, counting its creation play. Created fields clear at halftime; pending creation follows its approved carryover rule.
- **Mastery-only values (P4).** Apply equally across forms unless an explicit approved form exception exists.
- **Dawn Signal and kickoffs (P7).** Kickoffs are live plays using existing movement, blocking and tackling, which makes Dawn Signal functional. Credit actual participants and return events. Punts, field goals and extra points keep their approved scope.
- **Miss-only Clash abilities (P10).** Shadow Pounce: explicit 15% (Umbrikit) / 20% (Obscurat) dodge against enemy normal attacks while its counter is unused. Mind Game: explicit 15% afterimage miss while no trick is stored. Their stated eligibility and undodgeable exceptions are preserved. Arc Rebound is unchanged.

**Shared rules**
- **Ordinary attacks connect (N7a, P10).** No universal evasion system. Misses come only from explicit effects; contract wording such as "normal evasion" refers to those effects.
- **Clash rotation (P8).** Voluntary rotation occurs after both normal turns and before delayed impacts, at most once per side every four exchanges. The entrant acts next exchange. On its first normal turn after a voluntary rotation its damage multipliers, heals, shields and status-application chances are halved; a Stunned skip consumes that penalty. Entry effects, reactions and defensive effects are unchanged and nonnumeric effects remain usable. Explicit ability exceptions are preserved.
- **Pancakes (P5, structure only).** One attempt per OL per play, eligible from an established block advantage. Success: Knocked Down for the rest of the play. Failure: Awareness decides recovery; recovered keeps the block; unrecovered ends the engagement and attempts Stumbled through the shared gate. Contest constants: §21 (B1); ordinary shed formula: §21 (B2).
- **Football Stunned.** Only currently approved rest-of-play sources are implemented, plus carried-over Stunned under §21 (B18). No other multi-play football Stunned source is approved.
- **Simultaneous-effect limits (P9, behaviour only).** Limits are diagnostics: a legitimate effect is never cancelled, delayed or deleted because a limit is exceeded. Verified limits: §21 (B4).
- **TE contested catching.** Agility-based role only; no TE Strength contribution.
- **AI and Basics.** AI may start a Basic when it is the best eligible individual.
- **Collection achievements.** Separate achievements for the original 72 families, the 120 Basics and all 192 families. Evolutions add no family count.
- **Art and reviewers.** Art refinement remains paused. Both runtime-backed ability reviewers (football and Beast Clash) remain required.

Items listed as open when this section was written were resolved by N7c; see §21.

## 21 Approved Task 8 rulings, 2026-11-07 (B1–B20)

Owner rulings N7c (2026-11-07 10:00, verbatim in docs/task8/RULINGS_2026-11-07b.md). They override conflicting text above. Status of every item: docs/task8/APPROVAL_REGISTER.md.

**Football**
- **Pancake constants (B1).**
  - Opportunity: one roll per OL per play (not per tick), at the OL's first engagement of the play, with chance q = qmax × clamp((A − a0)/w, 0, 1). A = (B − shed)/100, type-scaled; B = 0.6 Blocking + 0.4 Strength. A positive advantage is required, and a0 is never tuned below 0.
  - Success: p = clamp(b + s(P − R)/100, lo, hi), with P = 0.4 Strength + 0.4 Blocking + 0.2 Tackling (OL) and R = 0.6 Strength + 0.4 Agility (defender).
  - Recovery: r = clamp(c + k·Awareness/99, c, rmax).
  - Start values (bounds): a0 0.00 (0–0.05), w 0.15 (0.10–0.20), qmax 0.15 (0.10–0.20), b 0.35 (0.25–0.45), s 1.5 (1.0–2.0), lo 0.05 (0.02–0.10), hi 0.80 (0.70–0.90), c 0.60 (0.55–0.70), k 0.40 (0.30–0.45), rmax 0.95 (0.90–0.97).
  - Targets: 0.2–0.6 pancakes per starting OL per game; 30–50% success; at most 15% of attempts losing the block (league average). Rebenchmark with Dex-generated ratings.
- **Ordinary shed (B2).** DL, CB, S: 0.5 Agility + 0.3 Strength + 0.2 Tackling; LB: 0.5 Strength + 0.3 Agility + 0.2 Tackling (initial values). Report ordinary block-shed effects separately from pancake results.
- **Event order (B3).** The packet's football and Clash order (docs/task8/DECISION_PACKET_FINAL.md §P6), with the revised phases in docs/task8/REMAINING_DECISIONS.md §B3:
  - catches: provisional outcome, then Sovereign Arm, then the final outcome;
  - contact: tackle declared, then carrier pre-tackle hooks, then the contest, then **the fumble determination; a fumble that would occur is prevented by Shielded, which consumes its episode**; then strips, then post-tackle triggers;
  - Clash: raw damage once, then Emergency Cover, then the Shared Burden raw split, then each recipient's mitigation, then Last Root, then HP;
  - immediate KO on every damage path, with only the contract-verified post-KO exceptions;
  - the replacement enters right after the current hit finishes resolving.
- **Special teams (B5).** Kickoff kicking and return units, and punt / FG / XP units, come from depth lists. Live kickoffs credit actual participants and return events. Formula-resolved plays grant the participation foundation (status countdown, stamina, participation rewards) with no fabricated performance events.
- **Telemetry (B8).**
  - Pressure is credited only for attributable disruption.
  - Separation of at least 1.0 yd from the responsible defender is an initial coverage measurement only. A viable window additionally requires, at a tick when a throw is possible, that along the actual ball-flight path and time no defender could reach the ball first to intercept or break it up.
  - Grading measurements change no gameplay.
- **Field clocks (B20).**
  - Kickoff catches are not receptions; kickoffs are not defensive snaps.
  - Each field ability keeps its own contract clock and creation eligibility (docs/task8/FIELD_CLOCKS.md).
  - Impact Pyre creates at its creator's next eligible defensive snap.
  - A cooldown never cancels an already-earned queued field; the field waits under its contract's pending rule.
  - Gaps G1–G3 were resolved by N7d (§22).
- **Stunned carryover (B18).** Remaining duration transfers 1:1 between Clash and football; each remaining unit disables one participating football play. This is the only approved multi-play football Stunned.

**Limits (B4).**
- Diagnostic thresholds only, never gameplay restrictions; legitimate effects always execute, and an overflow logs a diagnostic and fails the test suite. Derivation: docs/task8/P9_VERIFIED_LIMITS.md.
- Thresholds:
  - 44 field rectangles on the whole field (recalculated under §22);
  - 13 objects per scrimmage play, 9 of them collision objects;
  - 0 on a live kickoff (N7c B20); 0 persisting between plays;
  - 4 Living Terrain clumps per connected Nature–Earth overlap;
  - 15 Mindstorm echoes and 10 moving auras per play;
  - Clash: 2 delayed impacts per side, 2 Twin Thunder constructs per battle, Dawn Song schedules up to lineup size per side.
- Legendary uniqueness (one copy in the league) is an approved rule (GRIDIRON_BEAST_GDD.md §15).

**Progression and economy**
- **XP and veterans (B6, B7).**
  - 75 XP per level to level 50 is the starting curve; the approved multiplier is tuned to the 5–8 season median benchmark.
  - Veterans are generated at level 1, then their prior seasons are simulated under the approved model. Accept when the median is within 1 level and 2 rating points, and quartiles within 2 levels.
- **Apex contract (B9).** Ask = salary(current OVR) + 0.5 × (salary(OVR 99) − salary(current OVR)); revalidated after economy recalibration.
- **Afflicted (B10).** Stamina drain per counted play = permanent Durability ÷ max(1, effective Durability), as an exact fraction. Exhaustion begins the moment stamina reaches 0.
- **Basic shares (B17).** Per generation event: rosters 25%, scouting 25%, encounters 30%, drafts 35%, FA arrivals 40%. Rarity is picked first; the remaining share keeps today's mix among the original rarities. Existing rosters and markets are never forced to a composition.

**Clash and saves**
- **Mid-Clash save (B11).** At exchange boundaries, preserving committed decisions, RNG state and reward idempotency.

**Retirements and AI**
- **Retired (B13–B15).**
  - The ten legacy common traits.
  - Nature side effects; legitimate Ambition behaviour is preserved.
  - The fixed legacy cornerstone list. No-K cornerstone eligibility is kept.
- **AI information (B16).** AI clubs scout under the player's rules. Close both player information leaks: the recruit card's exact salary, and the assistant's use of hidden potential.
- **Legendary kickers (B19).** Count toward the offensive legendary limit. This supersedes Task 7's "No legendary kickers or special teams".

**Testing (B12)**
- Contract-derived cases.
- Each probability's tolerance and sample size are frozen before testing, with N = 3.29²·p(1 − p)/h².
- Guaranteed behaviour must succeed in every case.

## 22 Approved field-clock rulings, 2026-11-07 (G1–G3)

Owner rulings N7d (2026-11-07 10:21, verbatim in docs/task8/RULINGS_2026-11-07c.md). Per-ability table: docs/task8/FIELD_CLOCKS.md.

- **G1, lifetime clocks.** Impact Pyre, Burning Wake and Tsunami Line count every completed scrimmage play by either team, including incompletions. Special-teams plays don't count. Their explicit creation-play and halftime exceptions are preserved.
- **G2, paused clocks.** Runway and Beacon Lane decrement only when their creator participates in an offensive scrimmage play. The field stays active while the countdown is paused.
- **G3, creation.** Burning Wake, Bloom Break, Bramble Trap, Beacon Lane, Bulwark Grid, Shadow Patch, Crosswind Rescue and Mind Bend wait for their creator's next eligible on-field snap before spawning. Frostmark, Echo Landing, Gear Grid, Tsunami Line and Splashdown keep their explicit off-field creation permissions.
- **Recalculated limits.** Diagnostic thresholds only: 44 field rectangles on the whole field, and 0 objects on a live kickoff. Derivation: docs/task8/P9_VERIFIED_LIMITS.md §9.

- **Fractional training display (owner ruling N7e, 2026-11-07 10:32).**
  - Banked points are shown rounded down to whole numbers, and each attribute's bar as a whole percentage.
  - The exact-cost purchase is enabled when the exact banked balance covers the exact remaining cost. That cost is shown to two decimals, rounded up.
  - Display rounding never changes balances, never deducts extra points and never decides affordability.
  - Exact fractions are preserved through saves and evolution.
  - This closes the §4 display gap.

## 23 Approved rulings, 2026-11-07 15:08 (N7g)

Owner rulings N7g (verbatim in docs/task8/RULINGS_2026-11-07e.md).

- **Basic scouting encounter XP bonus.**
  - Winning a scouting encounter whose recruitable target is a Basic awards 25% extra level XP to the eligible participants, under the normal participation rules.
  - Recruiting the Basic is not required. Basic companions alone do not activate the bonus.
  - Training progress and ability mastery get no bonus.
  - It is awarded once per encounter through the reward ledger (§15): no stacking, and no duplication on replay or reload.
  - The encounter preview and the reward breakdown show it.
  - It is a shared encounter rule, not a unique monster ability.
- **Encounter companions.** The approved 30% Basic share (B17) applies to encounter companions. Strength matching is best-effort within legal development limits; easier encounters are acceptable.
- **Glacivern.**
  - Glacivern keeps K, Second Chance and Deep Winter.
  - The pilot legendary play Avalanche and its unlock references are retired and not replaced.
  - Not every legendary needs an unlocked play.

The Task 8 specification has no open decisions.


## 24. Special-play eligibility (owner ruling N8b, 2026-11-08)

Kickoffs and two-point conversions:
- Non-kicker abilities cannot activate or charge during kickoffs or two-point conversions.
- Kicker abilities may activate only when their own approved conditions permit; this is not blanket permission for every kicker
  ability.
- Effects explicitly created by an eligible kicker ability, such as Dawn Signal's teammate boost, are permitted.
- Ordinary shared-status carryover and countdown rules are preserved; this restriction does not cleanse statuses.
- This ruling overrides conflicting individual ability wording for these two play types.

Eligibility table: docs/task8/SPECIAL_PLAY_ELIGIBILITY.md. Of the 72, the kicker abilities with a kickoff condition are Dawn Signal
(LIG-02-F, cast on his own kickoff) and Echo Landing (PSY-04-F, banked from his own returned kickoff). None acts on a two-point
conversion.
