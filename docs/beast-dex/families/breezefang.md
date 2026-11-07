# Zephyroo

**Wind · Common · RB · Clash: Balanced**

[Position comparison](../positions/RB.md) · [Beast Dex](../README.md)

Family ID: `breezefang`. Source labels are not runtime implementation proof.

**Approved build:** Elusive speed specialist.

## Zephyroo

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 38–48 | 63–67 | — |
| Agility | 38–48 | 63–67 | — |
| Strength | 13–23 | 33–41 | Yes |
| Awareness | 30–40 | 55–65 | — |
| Catching | 21–31 | 41–51 | — |
| Arm | 8–18 | 18–32 | — |
| Accuracy | 8–18 | 18–32 | — |
| Blocking | 13–23 | 33–39 | Yes |
| Tackling | 8–18 | 18–32 | — |
| Coverage | 15–25 | 28–42 | — |
| Durability | 13–23 | 33–43 | Yes |
| Kicking | 8–18 | 18–32 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Mistralope

Stage 1; evolution level 12; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 45–55 | 70–74 | — |
| Agility | 45–55 | 70–74 | — |
| Strength | 20–30 | 40–48 | — |
| Awareness | 37–47 | 62–72 | — |
| Catching | 28–38 | 48–58 | — |
| Arm | 15–25 | 25–39 | — |
| Accuracy | 15–25 | 25–39 | — |
| Blocking | 20–30 | 40–46 | — |
| Tackling | 15–25 | 25–39 | — |
| Coverage | 22–32 | 35–49 | — |
| Durability | 20–30 | 40–50 | — |
| Kicking | 15–25 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Slipstream Step

Ability ID: `WIN-02-F`. Category: Special action.

Zephyroo / Mistralope; common Wind RB. Each personal broken tackle earns1 charge; threshold3 /2 by form. When full, next participating rushing play activates on first crossing beyond LOS while carrying ball and able. No activation on qualifying charge-filling play.

Broken-tackle charge displaces everyone but runner opposite run vector on later rush

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Zephyroo / Mistralope; common Wind RB. Each personal broken tackle earns1 charge; threshold3 /2 by form. When full, next participating rushing play activates on first crossing beyond LOS while carrying ball and able. No activation on qualifying charge-filling play.

### Targets / placement

ALL other on-field monsters on BOTH teams, including other Wind monsters; source RB alone excluded. One simultaneous snapshot of positions and current RB movement vector at activation. No radius limitation selected.

### Core resolution

One wind gust displaces targets1 /1.5 /2 /2.5 yards by mastery OPPOSITE RB movement direction, including diagonal. Stop safely at bodies, obstacles and field bounds, without domino pushing. No extra stun, stumble, tackle break or football duplication.

### Recharge / frequency

Bar empties on activation, no additional cooldown; activation play cannot recharge. Each broken tackle counts once, bar caps at full with no overflow. Unable source preserves readiness; failed LOS crossing preserves full bar.

### Lifetime / persistence

Partial/full charge carries possessions, halftime and overtime until actual game end. One impulse only, no persistent zone or seconds duration; save/reload preserves charge/use.

### Exceptions / counterplay

Other Wind monsters are intentionally eligible: this is an ability, not Wind terrain. Source must be able and ball carrier. Do not apply generic shared-status gate to physical displacement. Ordinary explicit movement-immunity/collision rules need implementation tests.

### Visuals

Charge bar alternates with status badge. At LOS crossing, visible gust drives affected monsters opposite runner heading; runner/ball remain readable. No new status badge.

### Progression / notes

Push1 /1.5 /2 /2.5 yards by mastery; broken-tackle threshold3 Zephyroo /2 Mistralope fixed by form. No old evasion-chance bonus. Requires broken-tackle event provenance, later-play armed flag, simultaneous collision-safe displacement and correct football stats. Snapshot heading; if velocity zero use last nonzero route/runner heading then offensive forward direction as deterministic technical fallback. Design closed by all13 A choices; runtime/balance pending.

## Beast Clash: Gust Hop

Ability ID: `WIN-02-C`. Category: Signature action.

Zephyroo; common; RB; Clash archetype Balanced → Balanced. Every third performed normal attack, replacing that attack with a two-hit leap.

Every third performed attack becomes two independently evadable same-target hits

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Zephyroo; common; RB; Clash archetype Balanced → Balanced. Every third performed normal attack, replacing that attack with a two-hit leap.

### Targets / placement

Current intended enemy active target; lock target at launch.

### Core resolution

Two separately evadable hits, EACH60 /65 /70 /75% normal damage by mastery. Same target locked at launch; no retarget if first KO. Each hit normal shield/DR; one performed attack, no ordinary-only archetype perks on special hits.

### Recharge / frequency

Three performed attacks to recharge; Stunned skips and support actions do not build count; no time cooldown.

### Lifetime / persistence

Partial count carries reserve rotation within same Clash, clears actual Clash end; same-game status carry unchanged.

### Exceptions / counterplay

Confused rolls once at launch for whole move; no second target or free attack after KO. Standard retaliation after each connected hit subject to no-recursion rule.

### Visuals

Two low wind hops with separate readable impact flashes.

### Progression / notes

Per-hit power 60 / 65 / 70 / 75% by mastery; both forms same power. Needs multi-hit pipeline with per-hit shield/rebuild and single normal-action accounting.
