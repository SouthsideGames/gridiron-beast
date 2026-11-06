# Shardok

**Ice · Rare · OL · Clash: Tank**

[Position comparison](../positions/OL.md) · [Beast Dex](../README.md)

Family ID: `glaciron`. Source labels are not runtime implementation proof.

**Approved build:** Technical pass protector.

## Shardok

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 30–40 | 58–70 | Yes |
| Agility | 55–65 | 85–94 | — |
| Strength | 40–50 | 68–80 | Yes |
| Awareness | 59–69 | 89–94 | — |
| Catching | 20–30 | 40–54 | — |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 10–20 | 25–39 | — |
| Blocking | 60–70 | 90–94 | — |
| Tackling | 35–45 | 55–69 | Yes |
| Coverage | 20–30 | 40–54 | — |
| Durability | 52–62 | 82–92 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Cold Snap

Ability ID: `ICE-05-F`. Category: Aura.

First enemy new activation while source block-engaged

Blocking-dependent three-yard aura suppresses one enemy new ability for rest of current play

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Source OL, blocking assignment AND actually block-engaged, while ready. Stunned / Knocked Down prevents activation.

### Targets / placement

THREE-yard aura follows source. First opposing monster attempting NEW ability inside range; simultaneous attempts use stable lineup order.

### Core resolution

B: Suppressed enemy cannot activate its ability OR gain new ability charge for remainder of current play, even after leaving aura. Existing charge / readiness remains intact and no enemy ability cooldown is spent. Suppression begins at blocked activation; earlier charge gain is not undone. Only first eligible enemy per source activation; simultaneous attempts use stable lineup order.

### Recharge / frequency

One enemy per activation, cooldown 5/4/3/2 subsequent OFFENSIVE plays. Enemy retains charge/readiness and spends no activation cooldown.

### Lifetime / persistence

Suppression ends whistle. Later play requires ordinary legal trigger; do not auto-fire or replay earlier event.

### Exceptions / counterplay

No canceling already active effects, passives, fields or launched objects. Suppression is ability state, not shared status; existing status cannot block it. Source Stunned / Knocked Down prevents activation. Enemy must meet a fresh legal trigger on a later play; no automatic replay.

### Visuals

Low frost ring while aura active; pulse briefly crystallizes affected enemy ABILITY indicator, separate from shared status badge.

### Progression / notes

Rare OL. Owner chose Aura over missing Self enhancement category. Ice Lock / Icebound Recovery withdrawn. Shares broad activation-denial theme with Eclipse; finite one-target blocking-dependent cooldown identity explicitly reviewed.

## Beast Clash: Glacier Wall

Ability ID: `ICE-05-C`. Category: Original shield rebuild.

First active entry plus first eligible depletion of own original shield

Entry shield with once-only smaller rebuild after full hit/effects resolution

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

First ACTIVE entry including opening active attempts Shielded worth 20% maximum HP. Blocked application spends initial entry opportunity.

### Targets / placement

Only original Glacier Wall-created shield may trigger rebuild. Stronger other-source replacement removes eligibility; original equal duration extension retains ownership under existing rule.

### Core resolution

A: After each complete individual enemy direct hit and its attached effects, surviving Shardok may attempt once-only smaller rebuild if its original own pool was depleted. Rebuild can protect against later strikes in same action, never triggering-hit overflow. Rebuilt pool 10 / 12 / 14 / 16% maximum HP for two recipient normal turns by mastery. Blocked rebuild attempt is spent.

### Recharge / frequency

ONE rebuild per Clash, no normal action cost. Blocked rebuild spends opportunity. Rebuilt shield NEVER rebuilds again. Rotation/revival restores neither opportunity.

### Lifetime / persistence

Initial THREE owner normal turns; rebuilt TWO owner normal turns; application turn excluded, reserve pauses.

### Exceptions / counterplay

No rebuild for expiry/status removal. Cannot undo overflow HP damage or prevent an already-caused KO. Both applications use normal shared-status gate; attached harmful status may block replacement.

### Visuals

Ice plates on entry. Original breaks to fragments, reassembles visibly smaller and cracked. Standard Shielded badge and pool.

### Progression / notes

Tank retained. Only rebuilt pool scales mastery. Legacy immediate same-size regrow occurs too early and must be replaced, not reused unchanged.
