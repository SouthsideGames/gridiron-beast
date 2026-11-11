# Nyxshade

**Dark · Legendary · CB · Clash: Disruptor**

[Position comparison](../positions/CB.md) · [Beast Dex](../README.md)

Family ID: `nyxshade`. Source labels are not runtime implementation proof.

**Approved build:** Elite coverage organizer.

## Nyxshade

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 65–75 | 94–99 | — |
| Agility | 66–76 | 95–99 | — |
| Strength | 23–33 | 45–59 | Yes |
| Awareness | 68–78 | 97–99 | — |
| Catching | 59–69 | 88–96 | — |
| Arm | 15–25 | 35–49 | — |
| Accuracy | 20–30 | 40–54 | — |
| Blocking | 20–30 | 40–54 | — |
| Tackling | 30–40 | 55–69 | Yes |
| Coverage | 68–78 | 97–99 | — |
| Durability | 37–47 | 65–79 | Yes |
| Kicking | 10–20 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Shadow Exchange

Ability ID: `DAR-06-F`. Category: Special action.

Two personal pass breakups fill the bar; interceptions do not. On a later eligible forward pass release, evaluate Shadow Exchange using the intended receiver projected catch point.

DAR-06-F: Shadow Exchange; Simultaneously swap actual positions of Nyxshade and the chosen defender. Each retains its own assignment, speed and movement heading. Football and receiver never move through this ability. Ordinary catch/interception resolution follows.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Two personal pass breakups fill the bar; interceptions do not. On a later eligible forward pass release, evaluate Shadow Exchange using the intended receiver projected catch point.

### Targets / placement

Real allied defender within 3 yards of that catch point, closer to it than Nyxshade, and at most 8 / 10 / 12 / 14 yards from Nyxshade by mastery. Choose closest to catch point; stable lineup ordering breaks ties. Both must be able, not block/tackle-engaged, with legal in-bounds endpoints.

### Core resolution

Simultaneously swap actual positions of Nyxshade and the chosen defender. Each retains its own assignment, speed and movement heading. Football and receiver never move through this ability. Ordinary catch/interception resolution follows.

### Recharge / frequency

Spend the full bar only on a successful legal swap. No additional cooldown. Invalid opportunities preserve it. The activation play cannot earn charge.

### Lifetime / persistence

Partial and full charge carry across possessions and halftime. Swap is immediate at pass release; no lingering zone or status.

### Exceptions / counterplay

No clones, extra actors, guaranteed breakup or interception, virtual catch contest, or teleportation of the receiver/ball. Stun/Knockdown and engagement invalidate participation.

### Visuals

Both defenders dissolve into shadow and emerge at exchanged positions, with readable football and essential markers.

### Progression / notes

Maximum caster-to-teammate swap distance 8 / 10 / 12 / 14 yards. Partner catch-point radius fixed 3 yards. Two personal PBUs per activation. Implement atomic position exchange, pass-release projected catch-point selection and legal endpoint checks. Preserve current 7v7 model. Design approved; implementation and balance verification remain.

## Beast Clash: Eclipse Theft

Ability ID: `DAR-06-C`. Category: Clash ability.

Nyxshade spends its own normal action, once per Clash, to steal an eligible opposing active fighter benefit, provided Nyxshade shared status slot is empty.

DAR-06-C: Eclipse Theft; Guaranteed atomic transfer on legal eligibility. Remove benefit from foe only when accepted by Nyxshade. Preserve strength, remaining duration, remaining shield HP and accepted application count out of three. No damage or extra attack.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Nyxshade spends its own normal action, once per Clash, to steal an eligible opposing active fighter benefit, provided Nyxshade shared status slot is empty.

### Targets / placement

Opposing single active fighter only. Eligible benefits: Shielded, Guarded, Empowered, Quickened. No eligible target or occupied own slot falls back to an ordinary attack and preserves the use.

### Core resolution

Guaranteed atomic transfer on legal eligibility. Remove benefit from foe only when accepted by Nyxshade. Preserve strength, remaining duration, remaining shield HP and accepted application count out of three. No damage or extra attack.

### Recharge / frequency

Use commits only on successful transfer. Stunned source cannot activate. Rotation and revival do not reset the once-use.

### Lifetime / persistence

Preserve the existing status episode and remaining clock with shared turn/application provenance; no extra tick or hidden duration refresh from transfer. Normal existing cross-mode status conversion applies.

### Exceptions / counterplay

Transfer the basic status only. Shardok shield rebuild and Aegistron Guarded repair are not stolen. No source ability uses, riders or flags transfer. Transfer is not shield depletion.

### Visuals

A shadow serpent carries the benefit badge from the enemy to Nyxshade; enemy badge disappears and the same basic status appears over Nyxshade.

### Progression / notes

Once per Clash at every mastery. No numerical refill, duration refresh, application-cap reset or additional damage. Implement atomic status-owner transfer with episode provenance, shield pool and application history, excluding source-only riders. Preserve one active fighter per side and one shared status slot.
