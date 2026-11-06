# Zippit

**Electric · Common · WR · Clash: Support**

[Position comparison](../positions/WR.md) · [Beast Dex](../README.md)

Family ID: `flicker`. Source labels are not runtime implementation proof.

**Approved build:** Catch-and-run receiver.

## Zippit

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 37–47 | 62–67 | — |
| Agility | 37–47 | 62–67 | — |
| Strength | 13–23 | 33–41 | Yes |
| Awareness | 23–33 | 43–53 | — |
| Catching | 26–36 | 51–61 | — |
| Arm | 8–18 | 18–32 | — |
| Accuracy | 8–18 | 18–32 | — |
| Blocking | 10–20 | 23–33 | Yes |
| Tackling | 13–23 | 23–37 | — |
| Coverage | 18–28 | 28–42 | — |
| Durability | 23–33 | 43–53 | — |
| Kicking | 5–13 | 13–27 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Zaptera

Stage 1; evolution level 12; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 44–54 | 69–74 | — |
| Agility | 44–54 | 69–74 | — |
| Strength | 20–30 | 40–48 | — |
| Awareness | 30–40 | 50–60 | — |
| Catching | 33–43 | 58–68 | — |
| Arm | 15–25 | 25–39 | — |
| Accuracy | 15–25 | 25–39 | — |
| Blocking | 17–27 | 30–40 | Yes |
| Tackling | 20–30 | 30–44 | — |
| Coverage | 25–35 | 35–49 | — |
| Durability | 30–40 | 50–60 | — |
| Kicking | 12–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Crossed Wires

Ability ID: `ELE-01-F`. Category: Special action.

Ready route snap

Snap-time exchange of two receivers remaining routes plus local Confused attempt

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

At a ready offensive scrimmage snap, Zippit must be running a receiving route. Blocking assignments, special teams and two-point attempts are excluded.

### Targets / placement

Select a random eligible allied WR or TE running a route within five yards. No eligible teammate: preserve readiness and original route. At activation, collect unique opposing defenders within three yards of either receiver.

### Core resolution

Exchange remaining routes: each receiver heads toward the other route’s next waypoint and follows its remaining path; no teleportation. QB targets remain attached to the monster and use its actual new route. Each collected defender gets one Confused roll: Zippit 35%, Zaptera 45%.

### Recharge / frequency

One exchange per activation. Cooldown 5 / 4 / 3 / 2 subsequent offensive plays; spend only on actual exchange.

### Lifetime / persistence

Confused reduces effective Awareness by 20%, immediately for the current play plus one subsequent participating play. Ordinary shared-status gate applies; not a separate environmental penalty.

### Exceptions / counterplay

No Speed or Coverage change, forced wrong target or input delay. Preserve normal catch, coverage and route movement rules. Deterministic random choices must be saved for replay.

### Visuals

Brief electrical connection and updated offensive route art. Both teams see the actual route change / effects; do not expose defensive play art.

### Progression / notes

Evolutions retain WR, rarity and ability identity. Charge / cooldown and status displays alternate rather than crowding the head area.

## Beast Clash: Lightning Rod

Ability ID: `ELE-01-C`. Category: Status transfer.

Before own attack while empty status slot

Transfer reserve ally harmful status to self with immediate one-turn duration reduction

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Once per Clash, automatically before its own attack, provided its shared status slot is empty.

### Targets / placement

Choose a living reserve ally with a removable harmful status; lowest current HP percentage wins, then stable reserve order. No eligible ally or occupied own slot: preserve use and perform ordinary action.

### Core resolution

Transfer the entire status, retaining strength, accepted application count and remaining duration, then immediately subtract one turn. If duration becomes zero it expires before the attack; otherwise Confused or Stunned may affect that action normally.

### Recharge / frequency

Once per Clash, no action replacement or extra turn. No mastery scaling.

### Lifetime / persistence

Transfer immediately subtracts one remaining turn. Do NOT decrement again at end of that same turn. Ordinary countdown begins on the next owner normal turn; reserve pauses normally. Preserve transferred strength and episode application count.

### Exceptions / counterplay

Exclude uncleansable statuses. No heal, damage or retaliation. Do not reset the transferred episode’s stack cap.

### Visuals

Show harmful-status energy moving from the reserve ally to Zippit and update the ordinary shared status badge.

### Progression / notes

Support archetype retained. Transfer is distinct from Crustank self-cleanse and Ripplet enemy benefit removal.
