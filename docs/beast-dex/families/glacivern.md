# Glacivern

**Ice · Legendary · K · Clash: Disruptor**

[Position comparison](../positions/K.md) · [Beast Dex](../README.md)

Family ID: `glacivern`. Source labels are not runtime implementation proof.

**Approved build:** Premium kicking specialist.

## Glacivern

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 10–20 | 30–44 | — |
| Agility | 15–25 | 35–49 | — |
| Strength | 25–35 | 50–64 | — |
| Awareness | 46–56 | 75–85 | — |
| Catching | 30–40 | 50–64 | — |
| Arm | 10–20 | 30–44 | — |
| Accuracy | 20–30 | 40–54 | — |
| Blocking | 15–25 | 35–49 | — |
| Tackling | 10–20 | 30–44 | — |
| Coverage | 15–25 | 35–49 | — |
| Durability | 61–71 | 90–99 | — |
| Kicking | 68–78 | 97–99 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Second Chance

Ability ID: `ICE-06-F`. Category: Special action.

First eligible missed field goal in game

Once-game failed FG reroll at original distance before result finalization

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Legendary primary K per approved roster amendment. Automatic on first eligible missed FIELD GOAL; extra points and blocked kicks excluded. Wide/short qualify.

### Targets / placement

Same football, original kick distance and currently applicable kicking conditions. Fresh ordinary FG success check; not guaranteed success.

### Core resolution

B: Record TWO field-goal attempts: initial miss plus retry. Retry success records one make; double miss records zero makes. One football play, one clock runoff and one final score / possession resolution. Log both checks and ability use. Fresh normal success check from original distance and applicable conditions, no guaranteed score.

### Recharge / frequency

ONCE per GAME including overtime. Rescue attempt spends use whether succeeds/fails; original success preserves use.

### Lifetime / persistence

One original kicking play with two checks, not a bonus play. No halftime refresh or separate mastery scaling.

### Exceptions / counterplay

Only first eligible missed field goal, not extra point or blocked kick; current resolver has no blocked-kick mechanic, do not invent one. Successful original kick preserves use. Final good result alone awards three points and triggers made-field-goal abilities once.

### Visuals

Before final miss declaration, Glacivern launches ice shard into football to visibly redirect toward uprights. Resolve final good/miss once.

### Progression / notes

Old safety Whiteout Football signature superseded by approved K identity. Distinct from Ripplet dropped-catch retry in trigger/scoring/frequency.

## Beast Clash: Deep Winter

Ability ID: `ICE-06-C`. Category: Harmful-status countdown freeze.

Own action when living enemy has existing harmful status

Once action pauses existing enemy harmful status expiration for two recipient normal turns

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Once per Clash replace own normal action when at least one living enemy has harmful status. Otherwise ordinary attack, preserve use. Stunned prevents activation, preserves readiness.

### Targets / placement

ALL living enemies including reserves with harmful status ALREADY present at activation. No new status is created; later new statuses count normally.

### Core resolution

Freeze EXPIRATION countdown for next TWO recipient normal turns. Existing count stays unchanged through those turns. Harmful strength/effects continue: Afflicted ticks normally, Stunned skips subject to consecutive-action safeguards.

### Recharge / frequency

Once per Clash, no damage or mastery scaling. Freezing neither consumes nor resets episode three-application cap.

### Lifetime / persistence

Recipient reserve pauses freeze duration. After two affected normal turns, thaw; ordinary status countdown resumes following normal turn. A: Carry remaining frozen turns into football as same number of frozen participating plays, and remaining frozen plays into Clash as recipient normal turns. Underlying status also carries normally. Bench / reserve pauses both. Continue existing mode-specific harmful effects and safeguards. No extra DOT tick at application.

### Exceptions / counterplay

B: Successful new application of same harmful status ends that status episode's Deep Winter freeze, including accepted equal-strength duration extension or stronger replacement. Ignored weaker / rejected application does not end freeze. Normal strength, duration and three-application cap remain. Cleanse removes underlying status and ends its freeze; uncleansable restrictions remain. Existing consecutive-action Stunned safeguard still applies.

### Visuals

Blizzard across enemy lineup; ICE ENCASES EXISTING STATUS BADGE, count readable. No additional status badge or full-body freeze. Thaw visual when expiration resumes.

### Progression / notes

Disruptor retained. Direct add-two-turn extension proposal withdrawn. Must separate harmful effect execution from expiration decrement, not freeze whole status tick.
