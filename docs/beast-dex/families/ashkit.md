# Cindruff

**Fire · Common · LB · Clash: Disruptor**

[Position comparison](../positions/LB.md) · [Beast Dex](../README.md)

Family ID: `ashkit`. Source labels are not runtime implementation proof.

**Approved build:** Physical run stopper.

## Cindruff

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 22–32 | 47–57 | — |
| Agility | 13–23 | 33–43 | Yes |
| Strength | 37–47 | 62–67 | — |
| Awareness | 25–35 | 50–60 | — |
| Catching | 8–18 | 23–33 | Yes |
| Arm | 3–13 | 13–27 | — |
| Accuracy | 3–13 | 13–27 | — |
| Blocking | 13–23 | 33–47 | — |
| Tackling | 38–48 | 63–67 | — |
| Coverage | 8–18 | 23–33 | Yes |
| Durability | 34–44 | 59–67 | — |
| Kicking | 3–13 | 13–27 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Magmaul

Stage 1; evolution level 14; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 29–39 | 54–64 | — |
| Agility | 20–30 | 40–50 | — |
| Strength | 44–54 | 69–74 | — |
| Awareness | 32–42 | 57–67 | — |
| Catching | 15–25 | 30–40 | Yes |
| Arm | 10–20 | 20–34 | — |
| Accuracy | 10–20 | 20–34 | — |
| Blocking | 20–30 | 40–54 | — |
| Tackling | 45–55 | 70–74 | — |
| Coverage | 15–25 | 30–40 | Yes |
| Durability | 41–51 | 66–74 | — |
| Kicking | 10–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Impact Pyre

Ability ID: `FIR-02-F`. Category: Zone.

Three tackle-play charges -> next defensive snap

Tackle-earned charge creates stationary Fire at owner next snap

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Three defensive SCRIMMAGE PLAYS with personally credited tackle/assist/sack fill bar, max1charge/play. No charge while full. At next participating defensive scrimmage snap create zone and empty bar. Punts/special teams do not spend/build it; readiness waits through possession changes.

### Targets / placement

Stationary field-aligned Fire rectangle centered at linebacker STARTING position on activation snap;6wide x4long. It does not follow owner.

### Core resolution

Create a 6-yard sideline-to-sideline width by 4-yard end-zone-to-end-zone length Fire zone.

### Recharge / frequency

Charge requirement REPLACES old3-defensive-play cooldown. Three qualifying tackle/assist/sack plays needed again. Spawn play cannot earn charge; resume afterward.

### Lifetime / persistence

1/2/3/4 completed plays by mastery, counting SPAWN play as first. Partial/full bar survives possession changes and halftime; created nonlegendary zone clears halftime, all game state clears actual game end.

### Exceptions / counterplay

Fire types immune. All other types both teams slowed only inside. Uses global zone replacement/reaction rules.

### Visuals

Visible3-part charge bar cycles with status/stamina indicators. Full bar waits next defensive snap; Fire rectangle blooms at owner start position, bar empties.

### Progression / notes

Cindruff15% slowdown/Magmaul20%;6x4 footprint; mastery1/2/3/4plays including spawn. No separate cooldown. Placement no longer centered on prior tackle.

## Beast Clash: Cinder Clamp

Ability ID: `FIR-02-C`. Category: Rotation control.

Successful direct attack while ready

Finite mark; queued voluntary rotation delay

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Successful normal direct attack dealing HP or shield damage applies grip. No miss, fully prevented zero damage, counter or reaction application.

### Targets / placement

Attacked opponent

### Core resolution

Connected normal direct attack dealing HP or shield damage applies grip when ready. Next voluntary rotation request consumes grip and waits until AFTER marked target NEXT NORMAL TURN, then executes at next legal rotation opportunity. Stunned skipped normal turn counts; reactions do not. Same request cannot be delayed twice. No seconds or exchange countdown.

### Recharge / frequency

THREE subsequent OWNER NORMAL TURNS; application turn excluded, Stunned skips count, reserve time/reactions do not. No new grip while existing grip or delayed rotation pending. Ready after all three turns complete.

### Lifetime / persistence

Unused grip duration counts marked TARGET own normal turns, not exchanges: Cindruff 3/4/5/6, Magmaul 4/5/6/7 by mastery. Exclude application turn; Stunned skips count; reserve time pauses. Requested rotation waits through target next normal turn, then executes next legal opportunity. Existing forced-swap and owner-KO cleanup retained.

### Exceptions / counterplay

Forced swap removes grip and cancels pending request. Owner knockout removes grip; pending rotation is released next legal rotation phase without remaining delay. An owner rotating out was not approved to remove it.

### Visuals

Visible smoldering grip on target; delayed rotation indicator.

### Progression / notes

Unused grip TARGET-turn duration Cindruff 3/4/5/6, Magmaul 4/5/6/7. Cooldown three subsequent OWNER turns. Rotation delay through next TARGET normal turn fixed. Supersedes old exchange units; this non-status grip does not occupy shared status slot.
