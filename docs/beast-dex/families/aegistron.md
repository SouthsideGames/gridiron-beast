# Aegistron

**Metal · Legendary · DL · Clash: Tank**

[Position comparison](../positions/DL.md) · [Beast Dex](../README.md)

Family ID: `aegistron`. Source labels are not runtime implementation proof.

**Approved build:** Dominant interior anchor.

## Aegistron

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 10–20 | 30–44 | Yes |
| Agility | 20–30 | 40–54 | Yes |
| Strength | 67–77 | 96–99 | — |
| Awareness | 65–75 | 94–99 | — |
| Catching | 35–45 | 55–69 | — |
| Arm | 15–25 | 35–49 | — |
| Accuracy | 10–20 | 30–44 | — |
| Blocking | 40–50 | 65–79 | — |
| Tackling | 65–75 | 94–99 | — |
| Coverage | 25–35 | 45–59 | — |
| Durability | 68–78 | 97–99 | — |
| Kicking | 10–20 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Fortress Gate

Ability ID: `MET-06-F`. Category: Special action.

Aegistron; legendary; DL; Once per defensive possession, after 3 participating plays where opponent gains at most3 yards, next defensive snap auto-activates if able.

Fortress Gate: Panels stationary for current play, block BOTH teams movement, not football. Leave center lane/source position open. No push, damage, status or extra player.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Aegistron; legendary; DL; Once per defensive possession, after 3 participating plays where opponent gains at most3 yards, next defensive snap auto-activates if able.

### Targets / placement

Two physical gate panels beside initial DL position. Each panel width 1.5 / 2 / 2.5 / 3 yards by mastery; thickness 0.5 yard, clear side gap 1 yard. Safe placement only; the former illustrative fixed 2-yard width is superseded by mastery width.

### Core resolution

Panels stationary for current play, block BOTH teams movement, not football. Leave center lane/source position open. No push, damage, status or extra player.

### Recharge / frequency

One use per defensive possession; activation play cannot charge. Illegal placement preserves full bar and use.

### Lifetime / persistence

Panels disappear whistle; charge carries halftime/possessions but possession use resets only new opposing possession.

### Exceptions / counterplay

Cannot spawn inside body/endzone boundary; skip panel pair if either illegal. Opponent can run center or pass. Source continues normal DL role after cast visual.

### Visuals

Ancient machine plants two glowing steel gates with open gap; visible before snap movement.

### Progression / notes

Panel width 1.5 / 2 / 2.5 / 3 yards by mastery; thickness/gap fixed. Needs physical obstacle pipeline shared with Earth/Ice but paired safe-placement validation. DL reassignment needs permanent ratings later.

## Beast Clash: Fortress

Ability ID: `MET-06-C`. Category: Signature action.

Aegistron; legendary; DL; Clash archetype Tank → Tank. Once per Clash own normal action replaces attack if no status and HP below60%.

Fortress: Attempt Guarded50% for2 owner normal turns; while own episode active, store prevented HP damage up to20% maxHP. At natural expiry heal stored amount, subject Healing Reduced. No healing if removed/replaced/KO.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Aegistron; legendary; DL; Clash archetype Tank → Tank. Once per Clash own normal action replaces attack if no status and HP below60%.

### Targets / placement

Self only.

### Core resolution

Attempt Guarded50% for2 owner normal turns; while own episode active, store prevented HP damage up to20% maxHP. At natural expiry heal stored amount, subject Healing Reduced. No healing if removed/replaced/KO.

### Recharge / frequency

Once per Clash on successful cast attempt; no reset rotation/revival.

### Lifetime / persistence

App turn excluded, reserve pauses; natural expiry only. Football unsupported clears without payout.

### Exceptions / counterplay

No Shielded pool, counterattack or fresh episode override. Existing other status blocks setup; ordinary attack preserve.

### Visuals

Fortress plates glow as prevention meter fills at base, then release small repair sparks on expiry.

### Progression / notes

Storage cap 10 / 15 / 20 / 25% maxHP by mastery; Guarded50 fixed. Need damage-prevention provenance, cap accumulator and natural-expiry reason distinct from cleanse/transition.
