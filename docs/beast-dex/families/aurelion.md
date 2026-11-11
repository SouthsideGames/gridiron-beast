# Aurelion

**Light · Legendary · WR · Clash: Striker**

[Position comparison](../positions/WR.md) · [Beast Dex](../README.md)

Family ID: `aurelion`. Source labels are not runtime implementation proof.

**Approved build:** Elite receiving technician.

## Aurelion

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 61–71 | 90–98 | — |
| Agility | 66–76 | 95–99 | — |
| Strength | 30–40 | 55–69 | Yes |
| Awareness | 66–76 | 95–99 | — |
| Catching | 67–77 | 96–99 | — |
| Arm | 20–30 | 40–54 | — |
| Accuracy | 25–35 | 45–59 | — |
| Blocking | 20–30 | 40–54 | Yes |
| Tackling | 20–30 | 40–54 | — |
| Coverage | 30–40 | 50–64 | — |
| Durability | 42–52 | 70–82 | Yes |
| Kicking | 15–25 | 30–44 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Daybreak

Ability ID: `LIG-06-F`. Category: Special action.

Every opposing touchdown, including offense, defense and returns, adds one charge even with Aurelion off field. Two charges arm the ability. On its next eligible live successful reception, flare after catch resolution.

Daybreak: Guaranteed ability-specific Daybreak flash disrupts football assignments, targeting, deliberate pursuit, blocking and tackle initiation. Affected monsters wander independently with random direction changes at movement checkpoints. This is not a status effect or zone; an occupied status slot cannot block it.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Every opposing touchdown, including offense, defense and returns, adds one charge even with Aurelion off field. Two charges arm the ability. On its next eligible live successful reception, flare after catch resolution.

### Targets / placement

Every other monster on field from both teams, including Light types and allies. Aurelion alone is exempt. A touchdown scored by the catch itself preserves readiness.

### Core resolution

Guaranteed ability-specific Daybreak flash disrupts football assignments, targeting, deliberate pursuit, blocking and tackle initiation. Affected monsters wander independently with random direction changes at movement checkpoints. This is not a status effect or zone; an occupied status slot cannot block it.

### Recharge / frequency

Spend both charges when flare activates, then recharge after two more opposing touchdowns. No once-game limit. An unable source preserves readiness.

### Lifetime / persistence

Wandering persists until whistle, even after fumble or possession change during the play. Restore ordinary behavior at whistle. Charge persists across quarters, possessions, halftime and overtime; clears at actual game end.

### Exceptions / counterplay

Existing statuses remain unchanged and continue operating. Immobilized monsters remain immobilized until restrictions end. Wandering respects boundaries, bodies and obstacles; bodies can obstruct movement but no new deliberate or accidental tackle attempt occurs while blinded. No new shared status badge.

### Visuals

Sun charge icon half fills at one opposing touchdown, full at two. Golden flare on catch, then all others visibly wander while Aurelion runs. Keep ball and Aurelion readable; softened flash for reduced-flash setting.

### Progression / notes

Two opposing touchdowns per activation at every mastery. Blindness lasts the remainder of current play. No seconds timer and no unapproved mastery scaling. Implement independent saved per-play behavior override, deterministic wandering, TD charge ledger and no-tackle gate without occupying status slot. Test fumbles, collision deadlocks, immobilization recovery, replay/save and whistle cleanup. Legendary strength requires balance testing.

## Beast Clash: Daybreak Lance

Ability ID: `LIG-06-C`. Category: Signature action.

Aurelion; legendary; WR; Clash archetype Striker → Striker. Once per Clash on own ready normal action; replaces attack.

Deal 145 / 160 / 175 / 190% normal damage by mastery. Standard evasion, shield and damage reduction apply. Suppress only attack retaliation caused by this strike; passive damage auras and attached status responses remain. This replaces the normal attack and receives no ordinary-attack archetype perk.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Aurelion; legendary; WR; Clash archetype Striker → Striker. Once per Clash on own ready normal action; replaces attack.

### Targets / placement

Current enemy active target.

### Core resolution

**Approved Task 8 rule (N9d):** Deal 145 / 160 / 175 / 190% normal damage by mastery. Standard evasion, shield and damage reduction apply. Suppress only attack retaliation caused by this strike; passive damage auras and attached status responses remain. This replaces the normal attack and receives no ordinary-attack archetype perk.

> Superseded v18 text: 160% normal damage, standard evasion/shield/DR. Suppress only ATTACK retaliation caused by this strike; passive damage auras and attached status responses still resolve. No skipped enemy normal turn.

### Recharge / frequency

Once per Clash, spent on launch even miss. Stunned preserves.

### Lifetime / persistence

No persistent modifier or cross-mode payload.

### Exceptions / counterplay

Does not silence enemy next action, bypass shield, dodge or resistance. Confused can redirect whole strike; then retaliation suppression still part of attack.

### Visuals

Sun phoenix dives as long golden lance; opposing retaliation icon briefly crossed during resolution.

### Progression / notes

Damage 145 / 160 / 175 / 190% by mastery. Attack context needs suppress-retaliation flag without suppressing all afterHit effects.
