# Tempestra

**Wind · Legendary · WR · Clash: Disruptor**

[Position comparison](../positions/WR.md) · [Beast Dex](../README.md)

Family ID: `tempestra`. Source labels are not runtime implementation proof.

**Approved build:** Powerful yards-after-catch receiver.

## Tempestra

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 47–57 | 77–87 | Yes |
| Agility | 64–74 | 93–99 | — |
| Strength | 66–76 | 95–99 | — |
| Awareness | 56–66 | 85–93 | — |
| Catching | 60–70 | 89–97 | — |
| Arm | 20–30 | 40–54 | — |
| Accuracy | 15–25 | 35–49 | — |
| Blocking | 30–40 | 55–69 | Yes |
| Tackling | 30–40 | 55–69 | — |
| Coverage | 25–35 | 45–59 | — |
| Durability | 65–75 | 94–99 | — |
| Kicking | 15–25 | 30–44 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Cyclonic Release

Ability ID: `WIN-06-F`. Category: Special action.

Tempestra; legendary Wind WR.3 successful receptions fill bar. NEXT eligible reception while charged and able creates ONE stationary tornado at catch location. Activation reception cannot recharge.

Reception charge creates stationary three-distinct-defender Stumbled wind-blast emitter

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Tempestra; legendary Wind WR.3 successful receptions fill bar. NEXT eligible reception while charged and able creates ONE stationary tornado at catch location. Activation reception cannot recharge.

### Targets / placement

First3 DIFFERENT non-Wind defenders within5 yards: initial occupants qualify, then new entrants. Nearest first at selection; stable lineup ties. Offense and all Wind defenders unaffected. One shot per selected defender.

### Core resolution

Launch visible crescent wind blast at each selected defender. Once launched it reaches that target without extra accuracy roll, even after leaving radius; whistle cancels unfinished projectile. Each hit attempts Stumbled with40% current-speed loss ONCE; max speed unchanged, ordinary reacceleration and status gate.

### Recharge / frequency

Full bar consumed on tornado creation, no additional cooldown. No activation-play recharge. Blocked status still spends shot/target eligibility; no every-frame retry or repeated defender target.

### Lifetime / persistence

Emitter ends at3 blasts or whistle, whichever first. Stationary catch point, no movement obstruction, lingering zone or pull. Partial/full bar survives possessions/halftime/OT until actual game end; live objects clean at whistle.

### Exceptions / counterplay

Wind defenders/offense unaffected. No automatic Stunned, damage, tackle break or ball loss. Launched projectiles follow normal independent-effect resolution; source disable cannot retroactively undo launched shots. Technical event ordering and boundary tests remain.

### Visuals

Visible rotating tornado at catch point fires crescent wind blasts. Standard Stumbled badge on accepted status only; charge bar alternates with badge. No pulling animation.

### Progression / notes

Fixed3 catches,5-yard radius,3 distinct shots,40% current-speed loss at all4 mastery tiers; no new power progression selected. Owner approved original5 recommended choices and closeout9A targeting plus8A charge handling. Need stable target ledger, collision-free emitter/projectile presentation, whistle cancellation and saved charge. Design closed; game implementation/balance pending.

## Beast Clash: Eye of the Storm

Ability ID: `WIN-06-C`. Category: Signature action.

Tempestra; legendary; WR; Clash archetype Disruptor → Disruptor. Once per Clash own normal action replaces attack if enemy front active has a ready, repeatable signature.

Once normal action temporarily restricts enemy active to ordinary attacks without cooldown extension

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Tempestra; legendary; WR; Clash archetype Disruptor → Disruptor. Once per Clash own normal action replaces attack if enemy front active has a ready, repeatable signature.

### Targets / placement

Current enemy front active, lock monster identity.

### Core resolution

For next 2 recipient normal turns it must use ordinary attack instead of a ready signature. Existing charges/cooldowns continue normally; no forced rotation prevention.

### Recharge / frequency

Once per Clash; normal shared status is not applied.

### Lifetime / persistence

Countdown follows target; reserve pauses. Ends actual Clash end, not transferred to football.

### Exceptions / counterplay

Cannot suppress passives, entry effects, reactions, launched effects or once-Clash legendary casts. Source Stunned prevents. Ordinary attacks remain usable.

### Visuals

A clear eye within dark wind around target ability panel; show restriction in inspect, no extra status badge.

### Progression / notes

2 recipient turns fixed; no mastery power growth. Need signature eligibility metadata and choice override BEFORE action commit; target does not spend forbidden ability.
