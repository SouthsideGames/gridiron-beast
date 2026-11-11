# Granigor

**Earth · Uncommon · K · Clash: Striker**

[Position comparison](../positions/K.md) · [Beast Dex](../README.md)

Family ID: `stoneguard`. Source labels are not runtime implementation proof.

**Approved build:** Sturdy specialist.

## Granigor

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 10–20 | 25–39 | — |
| Agility | 15–25 | 30–44 | — |
| Strength | 47–57 | 75–84 | — |
| Awareness | 32–42 | 60–70 | — |
| Catching | 20–30 | 40–54 | — |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 10–20 | 25–39 | — |
| Blocking | 30–40 | 50–64 | — |
| Tackling | 35–45 | 60–74 | — |
| Coverage | 5–15 | 20–34 | — |
| Durability | 50–60 | 78–84 | — |
| Kicking | 51–61 | 79–84 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Stone Cradle

Ability ID: `EAR-04-F`. Category: Special action.

First eligible caught punt in field of play

Once-game caught-punt return ends immediately at catch spot

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Once per game, automatically on first eligible Granigor punt caught inside field of play. Granigor approved primary K.

### Targets / placement

Receiving opponent at secured catch spot. Punts ONLY, not kickoffs. Normal punt distance and placement still use Kicking.

### Core resolution

Stone cuffs trap legs, immediate whistle at catch spot, ZERO return yards. No live immobilized-player tackle sequence.

### Recharge / frequency

Once per game, no mastery scaling. Touchback, out-of-bounds punt and fair catch preserve use.

### Lifetime / persistence

Stone disappears after whistle. Actual game includes overtime; no refresh at halftime or possession change.

### Exceptions / counterplay

Special kick-ending rule, not shared status; Earth typing / existing statuses do not block. End-zone catches follow ordinary touchback rules, never force safety. Blocked / downed punts require ordinary result mapping, not invented roll simulation.

### Visuals

Stone cuffs form around both legs, then crumble after whistle; no lingering obstacle or field.

### Progression / notes

All bounce/roll Stone Cradle and Heavy Return proposals withdrawn. Current engine resolves punts abstractly; no new bounce system requested.

## Beast Clash: Bank Shot

Ability ID: `EAR-04-C`. Category: Shield ricochet.

Shielded active enemy plus living reserve

Once special attacks shield then ricochets to last reserve if shield HP removed

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Once per Clash replace normal attack when enemy active is Shielded and has living reserve. Otherwise ordinary attack, preserve use.

### Targets / placement

Primary active target. Secondary LAST living enemy in reserve order.

### Core resolution

Primary 100% normal attack with normal defenses/evasion. If removes at least one shield HP, launch ricochet for 50 / 60 / 70 / 80% normal attack by mastery. Shield need not break.

### Recharge / frequency

Launching primary spends use even if misses or no ricochet. No additional normal action for bounce.

### Lifetime / persistence

Primary retaliation resolves before bounce. If source KO or Stunned, cancel ricochet. Maximum one bounce.

### Exceptions / counterplay

Secondary normal type/evasion/shield/DR; no active-only Tank guard in reserve. No secondary retaliation chains or extra charge consumption. Neither hit receives ordinary-only Striker perks.

### Visuals

Short kicking approach, boot stone into shield, visible direction change to reserve, shatter on impact.

### Progression / notes

Striker retained. Distinct from miss-triggered Arc Rebound and shield-bypassing Phase Strike.
