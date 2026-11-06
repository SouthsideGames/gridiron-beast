# Statyx

**Electric · Uncommon · S · Clash: Disruptor**

[Position comparison](../positions/S.md) · [Beast Dex](../README.md)

Family ID: `stormlynx`. Source labels are not runtime implementation proof.

**Approved build:** Fast coverage safety.

## Statyx

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 52–62 | 80–84 | — |
| Agility | 51–61 | 79–84 | — |
| Strength | 20–30 | 40–52 | Yes |
| Awareness | 37–47 | 65–75 | — |
| Catching | 37–47 | 65–75 | — |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 10–20 | 25–39 | — |
| Blocking | 15–25 | 30–44 | — |
| Tackling | 22–32 | 45–57 | Yes |
| Coverage | 50–60 | 78–84 | — |
| Durability | 32–42 | 60–70 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Static Field

Ability ID: `ELE-04-F`. Category: Zone.

Ready defensive pre-play including first

Ready safety field spans fixed LB-to-safety depth band with entry stun

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Automatically create before a ready participating defensive scrimmage play, including the first. No tackle-earning requirement.

### Targets / placement

Twelve yards wide by seven yards long. Depth runs from five to twelve yards beyond upcoming LOS. Lateral center is Statyx initial alignment. Normal inward shift / boundary rules apply.

### Core resolution

Each non-Electric monster of either team independently rolls 15% Stunned on first entry; starting inside counts. No re-entry reroll and no total stun cap. Electric monsters are unaffected.

### Recharge / frequency

Cooldown 5 / 4 / 3 / 2 subsequent defensive plays, starts on creation.

### Lifetime / persistence

One completed play INCLUDING spawn. Accepted Stunned lasts remainder of play and clears at whistle; normal status gate applies. Nonlegendary zone clears halftime / actual game end under normal rules.

### Exceptions / counterplay

REMOVE legacy catching penalty; do not combine the approved field with the old 10% catching restriction. This is not an Awareness or Coverage debuff.

### Visuals

Ground electrical lines, clear rectangle boundary and small sparks. Reveal before both teams select plays and lock initial placement. Screenshot preview was illustrative, not implementation.

### Progression / notes

Chance and geometry fixed across mastery; cooldown scales. Ask before creating future visual mockups.

## Beast Clash: Circuit Breaker

Ability ID: `ELE-04-C`. Category: Cooldown disruption.

Active enemy ability currently recharging

Once-only attack extends running enemy ability cooldown by two owner turns

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Once per Clash, automatically replace normal attack when active opponent has an ability currently recharging. Otherwise attack normally and preserve use.

### Targets / placement

Among the active enemy’s currently running ability cooldowns, extend the one with the LEAST time remaining. Not limited to its signature. No running cooldown: ordinary attack, preserve use.

### Core resolution

Deal 100% / 110% / 120% / 130% normal attack damage by mastery. Connected hit adds TWO of target’s own normal turns to its remaining cooldown.

### Recharge / frequency

Once per Clash. Normal evasion; miss spends use without delay. Shield absorption still counts as connected for delay.

### Lifetime / persistence

Add two to the selected remaining cooldown counter and continue its ordinary schedule, including an upcoming target turn in the current round. No added grace round. Rotation preserves remaining cooldown and ordinary reserve pause rules.

### Exceptions / counterplay

Do not restore spent once-per-battle abilities, remove charges or disable passives. No shared status slot. No new instant action or global timing clock.

### Visuals

Jagged bolt followed by a brief broken-circuit symbol over the enemy ability indicator; no additional status badge.

### Progression / notes

Disruptor retained. Fixed two-turn extension; mastery scales attack damage only. Owner approved least-remaining running cooldown selection (2B). Stable tie handling must use the implementation’s deterministic ability ordering.
