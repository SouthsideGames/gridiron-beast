# Sablewing

**Dragon · Uncommon · CB · Clash: Balanced**

[Position comparison](../positions/CB.md) · [Beast Dex](../README.md)

Family ID: `sablewing`. Source labels are not runtime implementation proof.

**Approved build:** Physical turnover hunter.

## Sablewing

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 42–52 | 70–80 | — |
| Agility | 27–37 | 50–62 | Yes |
| Strength | 52–62 | 80–84 | — |
| Awareness | 36–46 | 64–74 | — |
| Catching | 20–30 | 40–52 | Yes |
| Arm | 15–25 | 30–44 | — |
| Accuracy | 10–20 | 25–39 | — |
| Blocking | 30–40 | 55–69 | — |
| Tackling | 52–62 | 80–84 | — |
| Coverage | 25–35 | 48–60 | Yes |
| Durability | 48–58 | 76–84 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Hoard Flight

Ability ID: `DRA-03-F`. Category: Special action.

Any valid fumble Sablewing recovers on a defensive scrimmage play triggers flight, regardless of who forced fumble. Not restricted to own forced fumbles.

Hoard Flight / End live return and place next offense at opponent 35. If recovery already at better field position, preserve better recovery spot. Preserve already-earned touchdown. Validate actual recovery ownership before applying placement.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Any valid fumble Sablewing recovers on a defensive scrimmage play triggers flight, regardless of who forced fumble. Not restricted to own forced fumbles.

### Targets / placement

Sablewing and recovered football. Use opponent goal direction to identify opponent 35-yard line.

### Core resolution

End live return and place next offense at opponent 35. If recovery already at better field position, preserve better recovery spot. Preserve already-earned touchdown. Validate actual recovery ownership before applying placement.

### Recharge / frequency

Every qualifying recovery, no extra cooldown or game-use limit. Special teams excluded.

### Lifetime / persistence

Flight ends play, then offense prepares normally at awarded spot. No temporary roster actor or status effect.

### Exceptions / counterplay

No interception trigger or lateral transfer. Exact permanent Tackling/base/ceiling and lower Coverage ceiling to be authored comparing all CBs. Re-audit actual forced-fumble attribute consumers before assigning final ratings.

### Visuals

Sablewing clutches recovered ball, launches into flight and lands at opponent 35 before offense enters. Preserve clear possession and spot indicator.

### Progression / notes

No invented mastery scaling. Special action. Owner 1B, remaining A. Wing Shadow, Wing Signal and Dragon Relay rejected/superseded.

### Ability story

Sablewing sees a loose football as treasure. Once it claims the prize, its hoarding instinct takes over and it carries that treasure deep into enemy territory.

## Beast Clash: Wing Shelter

Ability ID: `DRA-03-C`. Category: Signature action.

While active, after surviving complete direct enemy attack removing at least 20% own maximum HP, trigger if ready. Automatic even Stunned.

Wing Shelter / After damage and attached effects finish, restore 4/6/8/10% own maximum HP by mastery, subject to ordinary Healing Reduced and maximum HP.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

While active, after surviving complete direct enemy attack removing at least 20% own maximum HP, trigger if ready. Automatic even Stunned.

### Targets / placement

Self only, active fighter only. Sum actual HP damage over multihit whole attack and trigger once.

### Core resolution

After damage and attached effects finish, restore 4/6/8/10% own maximum HP by mastery, subject to ordinary Healing Reduced and maximum HP.

### Recharge / frequency

Three subsequent owner normal turns cooldown after reaction, first decrement next owner turn. Reserve pauses. Automatic recovery preserves normal action.

### Lifetime / persistence

Immediate self heal. Counter/state persists rotation under shared rules. Lethal attack cannot trigger recovery.

### Exceptions / counterplay

Exclude shield absorption, damage over time and self damage. No protection before lethal/attached effects finish. Balanced archetype owner approved.

### Visuals

Wings close around body, then green-gold restorative pulse appears and HP rises.

### Progression / notes

Threshold 20% maximum HP fixed, healing4/6/8/10%. Disruptor to Balanced.

### Ability story

Sablewing guards its remaining strength as fiercely as its treasure. After a heavy blow, it folds its wings around itself and releases a restorative pulse beneath its scales.
