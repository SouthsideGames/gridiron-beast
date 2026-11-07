# Ripplet

**Water · Rare · WR · Clash: Disruptor**

[Position comparison](../positions/WR.md) · [Beast Dex](../README.md)

Family ID: `tidefin`. Source labels are not runtime implementation proof.

Owner-approved rarity change: Uncommon → Rare.

**Approved build:** Speed-focused receiver with Catching capped at 78.

## Ripplet

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 60–70 | 90–94 | — |
| Agility | 57–67 | 87–94 | — |
| Strength | 23–33 | 45–57 | Yes |
| Awareness | 45–55 | 75–85 | — |
| Catching | 38–48 | 70–78 | Yes |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 10–20 | 25–39 | — |
| Blocking | 15–25 | 35–49 | Yes |
| Tackling | 15–25 | 30–44 | — |
| Coverage | 20–30 | 35–49 | — |
| Durability | 45–55 | 75–83 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Second Touch

Ability ID: `WAT-04-F`. Category: Special action.

Eligible physically reached dropped pass

One ordinary extra catch attempt after eligible drop

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Physically reached pass with failed catch, including contested drop. Unreachable pass, interception or defender deflection does NOT qualify. Normal scrimmage only, not returns or two-point attempts.

### Targets / placement

Ripplet and same live bobbled ball; no teleporting unreachable throws into reach.

### Core resolution

One additional ordinary catch attempt using normal Catching, position and contest checks. NO guaranteed catch and NO extra retry bonus. Defenders may intercept or bat bobble. Second failure ends ability sequence.

### Recharge / frequency

Offensive-play cooldown 5/4/3/2 by mastery. Spend activation/cooldown even if retry fails.

### Lifetime / persistence

Extra attempt occurs in same live pass sequence; no lingering buff/status.

### Exceptions / counterplay

Fully trained permanent Catching CEILING 78 and Speed CEILING 95, NOT starting ratings. Generation, training and permanent progression respect ceilings; temporary boosts/reductions may cross them. No extra forced-drop chance.

### Visuals

Physical bobble, fin tap and second reach. Recharge bar; no extra status/field/label.

### Progression / notes

Standalone Uncommon WR. Permanent max Catching 78 and Speed 95. Offensive cooldown 5/4/3/2 plays. Reference generator starting values remain separate.

## Beast Clash: Wash Away

Ability ID: `WAT-04-C`. Category: Disruptor.

Normal-turn beneficial-status removal attempt

Sacrifice attack to strip opposing active beneficial status

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

When ready on own normal turn, wait until opposing active has a beneficial status, then attempt instead of attack. No beneficial status: attack normally, preserve use. This final A overrides earlier waste-on-no-target answer.

### Targets / placement

Opposing ACTIVE monster only, not reserve. Benefits only; no traits, charges, marks or harmful-status removal.

### Core resolution

Non-damaging utility replaces attack. On success remove ENTIRE beneficial status, stacked duration and remaining Shield HP included. No steal, heal or new status.

### Recharge / frequency

ONCE per separate Clash. Fixed effect/use limit at all mastery; no cooldown progression.

### Lifetime / persistence

Immediate attempt; reset readiness for separate Clash.

### Exceptions / counterplay

Normal evasion check applies. Evasion or explicit removal immunity wastes action AND use. Respect immunity; cannot remove permanent archetype traits. Exact normal-evasion integration for utility needs engine work.

### Visuals

Splash breaks beneficial badge apart; no water jet, field or extra status.

### Progression / notes

Disruptor retained. Once-per-Clash choice supersedes old 5/4/3/2-turn cooldown proposal.
