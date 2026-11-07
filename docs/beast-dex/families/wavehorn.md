# Tideram

**Water · Uncommon · TE · Clash: Balanced**

[Position comparison](../positions/TE.md) · [Beast Dex](../README.md)

Family ID: `wavehorn`. Source labels are not runtime implementation proof.

Owner-approved rarity change: Rare → Uncommon.

**Approved build:** Balanced blocking tight end.

## Tideram

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 25–35 | 48–60 | Yes |
| Agility | 22–32 | 45–57 | Yes |
| Strength | 50–60 | 78–84 | — |
| Awareness | 49–59 | 77–84 | — |
| Catching | 42–52 | 70–80 | — |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 15–25 | 30–44 | — |
| Blocking | 51–61 | 79–84 | — |
| Tackling | 25–35 | 45–59 | — |
| Coverage | 15–25 | 35–49 | — |
| Durability | 46–56 | 74–84 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Breakwater

Ability ID: `WAT-05-F`. Category: Aura.

Only blocking-assignment plays

Moving aura reduces opponents entire effective Strength

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Active only when SNAP ASSIGNMENT is blocking, including block-and-release. Route assignment does not qualify. Snap assignment remains the eligibility decision for that play; no physical-engagement toggling.

### Targets / placement

Opponents within THREE yards center-to-center of Tideram; reduce their entire effective Strength for ALL Strength-based actions against anyone. No type immunity was approved. Supports Tideram as well as nearby allies. Leave range removes reduction.

### Core resolution

Opponents in range lose 25/30/35/40% of ENTIRE effective Strength by mastery, affecting all Strength-based actions against anyone. No additional displacement reduction and NO Stumbled protection; supporting stumble mechanic removed by owner. Not a shared status.

### Recharge / frequency

Passive on eligible blocking play; no cooldown.

### Lifetime / persistence

No lingering shared status or field. Dynamic range during play; inactive when assigned route. Assignment changes within play require clarification rather than guessing.

### Exceptions / counterplay

Strongest overlapping Strength reduction only. Each additional eligible overlapping Breakwater adds one yard of radius, capped at FIVE yards. Determine eligibility from original THREE-yard radii to prevent chain expansion. Resolve Strength contests using reduced Strength, then apply Earth displacement resistance normally; never apply obsolete extra Breakwater displacement multiplier.

### Visuals

Water barrier appears ONLY when protection occurs; no persistent barrier. Exact visual cue for full-Strength reduction requires alignment with revised mechanic.

### Progression / notes

Group Strength reduction distinct from Scorch Mark pair-specific Strength AND Blocking; explicitly owner approved. Blocking snap assignment gates aura, including block-and-release. Stumbled mitigation removed. Strength mastery 25/30/35/40%.

## Beast Clash: Riptide Charge

Ability ID: `WAT-05-C`. Category: Balanced.

Every second performed normal attack

Charged hit forces surviving target to reserve with opponent choice

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Every SECOND performed normal attack becomes charged. Skipped turns/reactions do not build progress.

### Targets / placement

Opposing active monster; if it survives, send into reserve and opposing team chooses living replacement.

### Core resolution

Charged damage 130/135/140/145% normal attack. Connected hit can force rotation even when shield absorbs all damage. If no living reserve, damage still applies with no rotation.

### Recharge / frequency

Attack counter retained across own rotations; normal attack cadence, no seconds timer.

### Lifetime / persistence

Immediate damage then forced rotation; preserve departing target status and remaining duration. Reset ability counter for separate Clash.

### Exceptions / counterplay

Evasion prevents damage AND rotation; charge spent. KO uses ordinary replacement. Explicit forced-rotation immunity blocks lineup change but NOT charged damage. Audit confirms existing side-wide forced-rotation pacing and just-entered protection: preserve unless owner changes. Target choice must be recorded for player and deterministic AI.

### Visuals

Stationary horn strike followed by splash and lineup change. No running charge or football pulling.

### Progression / notes

Balanced retained. Damage scaling approved; replacement choice differs from original automatic next-in-line sweep.
