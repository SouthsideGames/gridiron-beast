# Cryolynx

**Ice · Uncommon · LB · Clash: Balanced**

[Position comparison](../positions/LB.md) · [Beast Dex](../README.md)

Family ID: `frostclaw`. Source labels are not runtime implementation proof.

**Approved build:** Coverage linebacker.

## Cryolynx

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 44–54 | 72–82 | — |
| Agility | 50–60 | 78–84 | — |
| Strength | 22–32 | 45–57 | Yes |
| Awareness | 47–57 | 75–84 | — |
| Catching | 49–59 | 77–84 | — |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 10–20 | 25–39 | — |
| Blocking | 15–25 | 30–44 | — |
| Tackling | 42–52 | 70–80 | — |
| Coverage | 51–61 | 79–84 | — |
| Durability | 27–37 | 50–62 | Yes |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Snowfall Slam

Ability ID: `ICE-03-F`. Category: Special action.

Three participating low-yardage defensive plays charge next snap

Stationary summoning of two random snowballs that stun offense or remain as bilateral obstacles

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Three participating defensive scrimmage plays allowing <=THREE yards fill bar, max one per play. Include losses/incompletions; no personal credit needed. Touchdowns, special teams and two-point attempts excluded.

### Targets / placement

Next participating defensive scrimmage snap after full bar. Two independently random NONOVERLAPPING legal footprints between LOS and FIVE yards into offensive backfield, across full legal width. TWO-yard-diameter snowballs.

### Core resolution

At impact, check actual occupancy, not launch occupants. Offensive hit: attempt Stunned at 20/25/30/35% by mastery; ball disappears regardless blocked status. Miss: physical obstacle blocks BOTH teams, no damage/status on later contact.

### Recharge / frequency

Summon starts -> empty bar. Activation play earns no charge; no extra cooldown. Maximum one banked summon.

### Lifetime / persistence

Landing markers at snap. Source cannot move/cover/block/tackle until BOTH land, then resumes assignment subject to other statuses. Fixed landing-animation duration is a balance-testing parameter, not a play/turn duration or pause of live game. Obstacles and accepted impact Stunned clear whistle.

### Exceptions / counterplay

A: If no offensive target is hit but a defender occupies landing footprint, snowball crumbles without Stunned or obstacle. Never trap or displace that defender. A: Each offensive player within landing footprint receives an independent mastery-based Stunned roll through normal shared-status gate. Snowball disappears after offensive impact, regardless of roll or blocked status. Obstacles affect both teams physically, including Ice. No football displacement or extra damage.

### Visuals

Ground slam, two visible shadow markers, two snowballs fall. On offensive impact burst away; otherwise remain solid route/lane obstacles. Source visibly occupied through landing.

### Progression / notes

False Blitz decoy withdrawn. Uncommon standalone LB. Explicit trade-offs: abandoned coverage during cast and obstacles can hinder own defense.

## Beast Clash: Snowbank Shot

Ability ID: `ICE-03-C`. Category: Attack with defensive miss fallback.

Ready own normal action

Oversized snowball attack with extra accuracy check and Shielded fallback on miss

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Replace normal attack while ready. Stunned prevents activation and preserves readiness.

### Targets / placement

Enemy active; normal attack targeting and current applicable redirection rules. No reserve splash.

### Core resolution

80% LAUNCH accuracy check first, then ordinary target evasion. Failed launch does NOT consume target dodge/decoy. Connected damage 130% normal, type/shield/DR normal.

### Recharge / frequency

Cooldown 5/4/3/2 subsequent owner normal turns, spent on launch. Costs normal action. No extra attack, ordinary-only archetype perks or second attack-charge consumption.

### Lifetime / persistence

Launch miss or enemy evasion attempts Shielded worth 20% source max HP, TWO owner normal turns, application turn excluded, reserve pauses.

### Exceptions / counterplay

Normal status gate: other status can block fallback; equal shield strength extends duration without pool refill. Full absorption by enemy shield is CONNECTED, no fallback. Normal connected-damage retaliation.

### Visuals

Pack oversized snowball, launch. Miss bursts into snow that whips back to form personal barrier, then standard Shielded badge/pool.

### Progression / notes

Balanced retained. Accuracy/damage/shield fixed, mastery cooldown only. No independent cloak/icebody status. Distinct from offensive reserve-target Arc Rebound after miss.
