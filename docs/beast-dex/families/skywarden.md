# Aeralis

**Wind · Uncommon · CB · Clash: Disruptor**

[Position comparison](../positions/CB.md) · [Beast Dex](../README.md)

Family ID: `skywarden`. Source labels are not runtime implementation proof.

**Approved build:** Agile coverage specialist.

## Aeralis

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 48–58 | 76–84 | — |
| Agility | 52–62 | 80–84 | — |
| Strength | 20–30 | 40–52 | Yes |
| Awareness | 44–54 | 72–82 | — |
| Catching | 37–47 | 65–75 | — |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 10–20 | 25–39 | — |
| Blocking | 15–25 | 30–44 | — |
| Tackling | 22–32 | 45–57 | Yes |
| Coverage | 51–61 | 79–84 | — |
| Durability | 35–45 | 63–73 | — |
| Kicking | 10–20 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Air Brake

Ability ID: `WIN-03-F`. Category: Targeted effect.

Aeralis; uncommon Wind CB.3 personal pass breakups fill bar; interceptions excluded. On later successful forward-pass catch by assigned/tracked receiver, activate if Aeralis within8 yards and able. No activation on charge-filling play.

PBU charge displaces guarded catcher opposite heading with actual yardage loss

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Aeralis; uncommon Wind CB.3 personal pass breakups fill bar; interceptions excluded. On later successful forward-pass catch by assigned/tracked receiver, activate if Aeralis within8 yards and able. No activation on charge-filling play.

### Targets / placement

One actual guarded receiver: man assignment or currently tracked zone receiver at catch. Range measured source-to-receiver at completed catch. Wind receivers eligible; no environmental immunity.

### Core resolution

Frontal wind displaces receiver5 /6.5 /8 /10 yards by mastery OPPOSITE receiver movement vector, including lateral crossing route. Ball moves with carrier. Stop safely at bodies, obstacles and field bounds; no pull, automatic tackle, status or stripped ball.

### Recharge / frequency

Consume full bar when legal activation occurs; no extra cooldown; activation play cannot recharge. If source disabled, range invalid or target not assigned, preserve bar for later legal catch.

### Lifetime / persistence

Partial/full charge survives possessions/halftime/OT and saves; actual game end clears. One catch-triggered impulse; no continuing field or unselected seconds timer.

### Exceptions / counterplay

Can genuinely lose football yardage; later normal stop at new location sets spot. Never undo completed touchdown or dead-ball finalized event. No automatic PBU or second catch roll. Carrier can keep running afterward.

### Visuals

Deflection charge bar; visible gust from ahead of receiver drives it backward relative to heading. No Stumbled badge, because this is physical movement rather than status.

### Progression / notes

Push5 /6.5 /8 /10 yards by mastery. Charge threshold3 PBUs, range8 yards fixed. Replaces rejected40% current-speed-loss proposal. Audit catch-before-score eligibility, vector fallback, collision and forward-progress ledger; do not award negative catch distance twice. Design values approved all-A; implementation must reconcile normal stop/scoring rules explicitly.

## Beast Clash: Downdraft

Ability ID: `WIN-03-C`. Category: Enemy lineup disruption.

Aeralis; Disruptor. Ready own normal action replaces attack when enemy has active fighter plus living first reserve and legal forced exchange.

Normal action swaps enemy active with first reserve then attempts incoming Weakened

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Aeralis; Disruptor. Ready own normal action replaces attack when enemy has active fighter plus living first reserve and legal forced exchange.

### Targets / placement

Swap enemy ACTIVE fighter with FIRST living reserve in stable lineup order. There are NOT two simultaneously active enemies.

### Core resolution

After legal swap and normal entry effects, attempt Weakened15% on incoming active fighter for2 recipient normal turns. No damage; ordinary one-status gate.

### Recharge / frequency

Illegal swap preserves use; legal swap spends even if status blocked. Source Stunned prevents. No extra reserve action or invented fallback stun.

### Lifetime / persistence

App turn excluded; reserve pauses cooldown/status. Football status carry converts to15% Strength reduction for remaining plays, normal episode count.

### Exceptions / counterplay

Respect existing rotation locks/immunity. Incoming Shielded entry can block Weakened. Normal rotation/action-order rules apply; no second same-team attack.

### Visuals

Downward wind spiral exchanges active/reserve pedestals; normal entry effects then cracked-fist badge if accepted.

### Progression / notes

Cooldown6 /5 /4 /3 source owner normal turns by mastery; status15% and2-turn duration fixed. Owner selected12A. Active/reserve action order and entry-status timing need target-branch tests; design does not change Clash format.
