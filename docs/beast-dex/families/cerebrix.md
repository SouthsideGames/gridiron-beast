# Cerebrix

**Psychic · Uncommon · QB · Clash: Disruptor**

[Position comparison](../positions/QB.md) · [Beast Dex](../README.md)

Family ID: `cerebrix`. Source labels are not runtime implementation proof.

**Approved build:** Anticipation specialist.

## Cerebrix

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 32–42 | 60–72 | — |
| Agility | 36–46 | 65–77 | — |
| Strength | 18–28 | 35–47 | Yes |
| Awareness | 58–68 | 81–84 | — |
| Catching | 22–32 | 45–59 | — |
| Arm | 43–53 | 74–84 | — |
| Accuracy | 50–60 | 76–84 | — |
| Blocking | 10–20 | 25–39 | — |
| Tackling | 10–20 | 25–39 | — |
| Coverage | 10–20 | 55–69 | — |
| Durability | 25–35 | 48–60 | Yes |
| Kicking | 10–20 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Foresight

Ability ID: `PSY-03-F`. Category: Targeted effect.

Before either side selects plays while ready, randomly mark one initially aligned opposing LB within 3 yards of LOS. Both sides see candidate. At snap validate marked defender actually blitzes.

Foresight / If marked LB blitzes and Cerebrix able, roll fixed 50% chance to apply Confused. Success attempts 20% effective Awareness reduction for current play with normal shared status-slot rules. Application chance and penalty magnitude are separate.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Before either side selects plays while ready, randomly mark one initially aligned opposing LB within 3 yards of LOS. Both sides see candidate. At snap validate marked defender actually blitzes.

### Targets / placement

Only marked LB. No future defensive choice inspection, substitute target or new audible selection. Keep same candidate through audibles and use final assignment at snap.

### Core resolution

If marked LB blitzes and Cerebrix able, roll fixed 50% chance to apply Confused. Success attempts 20% effective Awareness reduction for current play with normal shared status-slot rules. Application chance and penalty magnitude are separate.

### Recharge / frequency

Cooldown 6 / 5 / 4 / 3 subsequent participating offensive plays by mastery. Spend on eligible cast whether 50% roll succeeds, fails or existing status blocks. No eligible blitz or unable source preserves readiness.

### Lifetime / persistence

Current-play Confused expires whistle. Candidate seeded/saved before choices. Ordinary charge/cooldown game persistence applies.

### Exceptions / counterplay

Can activate on run or pass if candidate blitzes. No automatic wrong direction, stun, forced pass or guaranteed protection. Different status blocks, same status follows shared stronger/equal policy.

### Visuals

Psychic eye above Cerebrix and lavender floor marker under warned LB. Standard Confused badge after accepted application.

### Progression / notes

Fixed 50% application roll and 20% Awareness reduction, all mastery. Mastery improves cooldown. Owner explicitly replaced original guaranteed attempt with 50% gamble.

### Ability story

Cerebrix warns one linebacker that it has seen the rush coming. The defender must decide whether the blitz is worth the risk, while the offense cannot count on the prediction working.

## Beast Clash: Foresight

Ability ID: `PSY-03-C`. Category: Signature action.

Once per Clash, spend own normal action while active and able to prepare psychic mirror, replacing attack. Once-use spent on preparation.

Foresight / Prevent incoming status and redirect one application to its caster with same strength and proposed duration. Caster ordinary status eligibility applies, with no second application accuracy roll. If caster cannot receive, incoming application still prevented and mirror consumed.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Once per Clash, spend own normal action while active and able to prepare psychic mirror, replacing attack. Once-use spent on preparation.

### Targets / placement

Source only. Intercept next successful enemy ability-applied harmful-status roll before source shared slot check. Exclude reflected applications and environmental effects.

### Core resolution

Prevent incoming status and redirect one application to its caster with same strength and proposed duration. Caster ordinary status eligibility applies, with no second application accuracy roll. If caster cannot receive, incoming application still prevented and mirror consumed.

### Recharge / frequency

One preparation per Clash. Mirror lasts 2 / 2 / 3 / 3 owner normal turns by mastery, preparation turn excluded. Source inability before preparation preserves use.

### Lifetime / persistence

Rotation or knockout clears mirror; once-use stays spent through rotations/revival. Existing source status remains and does not block preparing/intercepting. Mirror clears after one interception, expiry or Clash end.

### Exceptions / counterplay

Attack damage resolves normally. Source must survive and remain able to reflect. No reflected-effect bounce or extra riders copied. No new shared status slot or badge.

### Visuals

Floating psychic eye opens on preparation. Lavender mirror catches harmful-status symbol and returns it, then shatters. Prepared indicator lives beside ability icon.

### Progression / notes

Archetype Disruptor retained. Prepared duration is only mastery scaling. All twelve A approved.

### Ability story

Cerebrix sees an incoming affliction before it takes hold and places a psychic mirror in its path, turning the opponent plan back toward its caster.
