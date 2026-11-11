# Joltrex

**Electric · Rare · DL · Clash: Striker**

[Position comparison](../positions/DL.md) · [Beast Dex](../README.md)

Family ID: `joltrex`. Source labels are not runtime implementation proof.

**Approved build:** Explosive edge rusher.

## Joltrex

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 60–70 | 90–94 | — |
| Agility | 60–70 | 90–94 | — |
| Strength | 32–42 | 60–72 | Yes |
| Awareness | 46–56 | 76–86 | — |
| Catching | 30–40 | 50–64 | — |
| Arm | 15–25 | 30–44 | — |
| Accuracy | 10–20 | 25–39 | — |
| Blocking | 20–30 | 40–54 | — |
| Tackling | 55–65 | 85–94 | — |
| Coverage | 30–40 | 50–64 | — |
| Durability | 32–42 | 60–72 | Yes |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Chain Break

Ability ID: `ELE-05-F`. Category: Targeted effect.

Successful ordinary block shed while ready

Successful shed arcs Stumbled to a different nearby engaged offensive blocker

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

First successful ordinary block shed while ready, on either run or pass play.

### Targets / placement

Nearest DIFFERENT offensive monster currently engaged in blocking within three yards of Joltrex at shed time. Exclude the escaped blocker. Equal distance: stable lineup order. No eligible target: preserve readiness for later successful shed.

### Core resolution

Arc attempts Stumbled, removing 40% of current movement speed. Normal reacceleration applies; no maximum-Speed or other attribute reduction.

### Recharge / frequency

Cooldown 5 / 4 / 3 / 2 subsequent defensive plays, starts when arc fires. Blocked status application still spends it.

### Lifetime / persistence

Accepted Stumbled clears at whistle, following shared status gate. One target per activation.

### Exceptions / counterplay

Target’s existing block continues normally; no automatic second shed. A stationary blocker loses no movement speed immediately. No hidden Strength or Blocking penalty.

### Visuals

Spark as Joltrex tears free, visible arc to second blocker, feet skid if Stumbled applies.

### Progression / notes

Rare standalone DL. Owner selected stable lineup tie-break. Normal shared status gate: a different existing status blocks Stumbled but the fired arc still spends readiness. No hidden stationary-block penalty.

## Beast Clash: Victory Surge

Ability ID: `ELE-05-C`. Category: Knockout follow-up.

Ordinary normal attack knocks out active enemy

Normal-attack knockout earns one immediate strike at chosen replacement

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Once per Clash, Joltrex personally knocks out active enemy with an ordinary normal attack. Reaction, special and damage-over-time knockouts do not qualify.

### Targets / placement

Opponent chooses replacement normally. Resolve its entry effects first. No living replacement / battle ended: no follow-up attack or animation.

### Core resolution

Follow-up deals 60% / 70% / 80% / 90% normal attack damage. Normal type, evasion, shields, Guarded and active Tank defense apply; miss spends follow-up.

### Recharge / frequency

Once per Clash; rotation and revival do not restore spent use.

### Lifetime / persistence

Immediate one-strike sequence. If replacement entry effects leave Joltrex knocked out or Stunned, surge is lost.

### Exceptions / counterplay

No further Victory Surge chain even on knockout. Follow-up grants no normal turn, attack-counter progress or ordinary-only archetype perks. Normal damage-triggered retaliation applies.

### Visuals

Knockout releases electricity into horns; after replacement arrives, Joltrex lunges as a lightning streak, strikes and returns.

### Progression / notes

Striker retained. Damage scales by mastery; no permanent attack boost from legacy Overcharge.
