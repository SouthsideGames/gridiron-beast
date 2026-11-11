# Muddlet

**Water · Common · OL · Clash: Tank**

[Position comparison](../positions/OL.md) · [Beast Dex](../README.md)

Family ID: `mudcub`. Source labels are not runtime implementation proof.

**Approved build:** Aware protection specialist.

## Muddlet

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 13–23 | 33–41 | Yes |
| Agility | 23–33 | 43–53 | — |
| Strength | 18–28 | 38–48 | Yes |
| Awareness | 37–47 | 62–67 | — |
| Catching | 13–23 | 28–42 | — |
| Arm | 3–13 | 13–27 | — |
| Accuracy | 3–13 | 13–27 | — |
| Blocking | 37–47 | 62–67 | — |
| Tackling | 13–23 | 33–47 | Yes |
| Coverage | 8–18 | 18–32 | — |
| Durability | 30–40 | 55–65 | — |
| Kicking | 3–13 | 13–27 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Sludgeon

Stage 1; evolution level 14; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 20–30 | 40–48 | — |
| Agility | 30–40 | 50–60 | — |
| Strength | 25–35 | 45–55 | — |
| Awareness | 44–54 | 69–74 | — |
| Catching | 20–30 | 35–49 | — |
| Arm | 10–20 | 20–34 | — |
| Accuracy | 10–20 | 20–34 | — |
| Blocking | 44–54 | 69–74 | — |
| Tackling | 20–30 | 40–54 | — |
| Coverage | 15–25 | 25–39 | — |
| Durability | 37–47 | 62–72 | — |
| Kicking | 10–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Divided Guard

Ability ID: `WAT-02-F`. Category: Self enhancement.

Automatic snap when ready

Two simultaneous block engagements with split effectiveness

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Automatically activates at snap on eligible offensive play when ready, even if ultimately zero or one defender engaged.

### Targets / placement

Self; up to TWO defenders simultaneously, within normal physical reach. May replace freed targets during play; no ranged blocking.

### Core resolution

With two engagements, each uses 50% Strength and form/mastery Blocking fraction. With only one engagement, use normal 100% attributes. No pancake while double-engaged; single engagement uses ordinary OL one-attempt-total-per-play rule.

### Recharge / frequency

Three subsequent offensive plays; activation spent at snap even if double block never occurs.

### Lifetime / persistence

Active entire activation play; ends at whistle. Cooldown carries halftime/OT; resets actual game end.

### Exceptions / counterplay

No two fixed targets for whole play. Reach, collision and ordinary contest rules remain. Does not duplicate monster, ball or statuses.

### Visuals

Body divides into two visible lobes, each bracing against its engaged defender. Shared cooldown bar/status cycling.

### Progression / notes

Muddlet Blocking per defender 70/73/76/79%; Sludgeon 80/83/86/89%. Strength split fixed at 50%.

## Beast Clash: Shared Burden

Ability ID: `WAT-02-C`. Category: Tank.

Spend first eligible normal turn creating link

Reserve owner absorbs fraction of raw incoming active-ally attack

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Once per Clash, first own normal turn able to act with another living ally creates link INSTEAD of attack. If last survivor, attack normally. No automatic free setup.

### Targets / placement

Protect current active ally only while Muddlet/Sludgeon is in RESERVE. Never protects self. Current active ally changes with rotation; no reset.

### Core resolution

Original target evasion first; miss damages neither. Split RAW attack, then each recipient own type/defense/shield. Owner share 30/32/34/36% Muddlet or 40/42/44/46% Sludgeon; ally remainder. IMPORTANT: Tank damage reduction applies ONLY while active, so reserve source receives NO Tank guard on transferred share. No second source evasion; no spill between shield pools. Transferred share not direct attack, status transfer or retaliation trigger; no link chain.

### Recharge / frequency

One setup per Clash; no recharge/cooldown. Only strongest available link protects a hit.

### Lifetime / persistence

Link lasts THREE protected active-ally OWN NORMAL TURNS while source in reserve; Stunned skips count. Protection and countdown pause while source active. Rotation of protected ally does not reset duration.

### Exceptions / counterplay

Owner KO ends link immediately. Current hit keeps its original split with no overflow back to ally; later hits recalculate without link. Status attempts remain on original target. Rounding/tie rules and attack-modifier attribution still require implementation specification.

### Visuals

Visible watery link between reserve owner and active ally, showing redirected hit; no extra shared status slot.

### Progression / notes

Muddlet Tank; transfer 30/32/34/36%. Sludgeon 40/42/44/46%. Owner expressly chose NO reserve Tank guard on transferred damage (21B). Other explicitly applicable defenses and own shield still resolve; original active target may use its active defenses.
