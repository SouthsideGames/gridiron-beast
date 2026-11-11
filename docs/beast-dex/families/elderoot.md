# Elderoot

**Nature · Legendary · LB · Clash: Support**

[Position comparison](../positions/LB.md) · [Beast Dex](../README.md)

Family ID: `elderoot`. Source labels are not runtime implementation proof.

**Approved build:** Defensive organizer.

## Elderoot

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 32–42 | 60–74 | Yes |
| Agility | 27–37 | 55–69 | Yes |
| Strength | 57–67 | 86–94 | — |
| Awareness | 68–78 | 97–99 | — |
| Catching | 56–66 | 85–93 | — |
| Arm | 15–25 | 35–49 | — |
| Accuracy | 20–30 | 40–54 | — |
| Blocking | 35–45 | 60–74 | — |
| Tackling | 65–75 | 94–99 | — |
| Coverage | 66–76 | 95–99 | — |
| Durability | 67–77 | 96–99 | — |
| Kicking | 10–20 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Grove Guardian

Ability ID: `NAT-06-F`. Category: Special action.

Ready defensive scrimmage snap

One independent temporary extra defender with copied assignment

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

At ready defensive scrimmage SNAP, including first. No tackle-charge requirement.

### Targets / placement

One clone nearest legal unoccupied spot beside Elderoot on defensive side. Independent roaming; copies Elderoot chosen assignment: blitz/zone/man target. No tether radius.

### Core resolution

Clone effective ratings 60/65/70/75% source by mastery, normal rounding. Source unchanged. Can cover, contest passes, intercept, tackle, be blocked; real collision. No abilities/new clones/roster slot/XP/mastery/independent stamina pool.

### Recharge / frequency

FIVE subsequent defensive-play cooldown fixed all mastery. Temporary extra player must not be dropped by normal personnel count.

### Lifetime / persistence

ONE completed play; clear clone/statuses/injuries at whistle. Applicable statuses affect clone normally; later source Stunned does not disable it. Clone has no lasting injury, XP, mastery, roster or independent stamina state. Normal goal/end-zone possession rulings occur before cleanup.

### Exceptions / counterplay

Credit football statistics to ELDEROOT, no extra clone XP or owner ability triggers. Clone injuries vanish with clone and never injure Elderoot; no independent stamina pool. Clone possession ends play immediately without return, but NORMAL touchdown/touchback rulings apply before cleanup. Preserve football and legal next spot; no-space handling uses deterministic nearest legal unoccupied spawn search.

### Visuals

Root at snap grows into leafy Elderoot copy with distinct outline, both teams see; disappears whistle. Not fake echo or decoy.

### Progression / notes

Legendary LB, Special action. Clone effective-rating fraction60/65/70/75%; fixed5 subsequent defensive-play cooldown. Owner credits football stats only, not extra XP/ability triggers; transient clone injuries do not transfer. Category exception approved.

## Beast Clash: Root Communion

Ability ID: `NAT-06-C`. Category: Support.

Eligible normal turn redistributes living team current HP

Once-per-Clash simultaneous HP-percentage equalization

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Own normal turn while unused, living ally at 25% max HP or less and redistribution would increase that ally HP. Otherwise ordinary attack preserve use; Stunned skips cannot activate.

### Targets / placement

ALL living allies including Elderoot/reserves. KO allies excluded; cannot revive. Shield HP not pooled or changed.

### Core resolution

Common target percentage=sum CURRENT HP/sum MAX HP. Redistribute current HP toward target simultaneously. Contributions not attacks; shields do not absorb. No HP created via rounding; keep >=1 HP each living member. Apply Healing Reduced to allocated GAINS; blocked healing LOST, can reduce total HP.

### Recharge / frequency

ONCE per Clash replaces normal attack, same effect all mastery levels.

### Lifetime / persistence

Instant redistribution; no lasting link, status, charge or attribute modifier. Existing status remains.

### Exceptions / counterplay

No retaliation/damage-triggered charges/status cleanse. Recipient gains constrained by healing rules; donor reductions not damage. Need deterministic apportionment with 1 HP lower bounds and finite accounting; implementation should not invent extra healing.

### Visuals

Glowing roots link living team; light flows healthy -> injured; HP bars settle then roots retract.

### Progression / notes

Support retained; fixed trigger 25%, no mechanical mastery scaling. Replace old periodic team heal.
