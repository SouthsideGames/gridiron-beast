# Flurrit

**Ice · Common · K · Clash: Support**

[Position comparison](../positions/K.md) · [Beast Dex](../README.md)

Family ID: `snowmoth`. Source labels are not runtime implementation proof.

**Approved build:** Dependable scoring kicker.

## Flurrit

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 8–18 | 23–33 | — |
| Agility | 13–23 | 28–38 | — |
| Strength | 8–18 | 18–32 | — |
| Awareness | 23–33 | 43–53 | — |
| Catching | 13–23 | 28–42 | — |
| Arm | 3–13 | 13–27 | — |
| Accuracy | 8–18 | 18–32 | — |
| Blocking | 8–18 | 18–32 | — |
| Tackling | 8–18 | 18–32 | — |
| Coverage | 8–18 | 18–32 | — |
| Durability | 30–40 | 55–65 | — |
| Kicking | 38–48 | 63–67 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Blizzmoth

Stage 1; evolution level 12; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 15–25 | 30–40 | — |
| Agility | 20–30 | 35–45 | — |
| Strength | 15–25 | 25–39 | — |
| Awareness | 30–40 | 50–60 | — |
| Catching | 20–30 | 35–49 | — |
| Arm | 10–20 | 20–34 | — |
| Accuracy | 15–25 | 25–39 | — |
| Blocking | 15–25 | 25–39 | — |
| Tackling | 15–25 | 25–39 | — |
| Coverage | 15–25 | 25–39 | — |
| Durability | 37–47 | 62–72 | — |
| Kicking | 45–55 | 70–74 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Frostmark

Ability ID: `ICE-01-F`. Category: Zone.

Made field goal earns next opposing-offense field

Made field goal banks fixed-size random Ice braking patch for later defensive series

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Successful field goal ONLY, regardless distance. Extra points excluded. Each made field goal may earn max ONE pending field; no extra cooldown.

### Targets / placement

Eight yards WIDE by six yards LONG. Randomize lateral and depth placement, keeping ENTIRE rectangle between opponent upcoming LOS and fixed 12-yard safety-depth reference. Normal playable boundaries. This replaces fixed-center and 5-to-11-depth proposals.

### Core resolution

Ice reduces braking deceleration 20% Flurrit / 25% Blizzmoth. Both teams non-Ice affected; Ice receives neither benefit nor penalty. No max Speed / acceleration / catching penalty or automatic Stumbled/Stunned.

### Recharge / frequency

No additional cooldown. Fixed geometry and strength by form; mastery changes lifetime. Maximum one pending token.

### Lifetime / persistence

Next opposing offensive scrimmage pre-play, even while kicker benched. Reveal BEFORE both play choices and lock; formation changes do not reroll. 1/2/3/4 completed opposing offensive scrimmage plays INCLUDING spawn; stationary world location after spawn.

### Exceptions / counterplay

Kickoffs do not consume pending activation. Pending survives possession changes/halftime; created field clears halftime under nonlegendary rule; actual game end clears all. Missed FG cannot earn it.

### Visuals

Frost sweeps across flat translucent rectangle, clear boundary and readable yard lines. Owner-requested example preview generated; random placement is not locked to pictured location. Ask before future visuals.

### Progression / notes

Common K family, rarity fixed across evolution. Owner explicitly likes FG-vs-touchdown trade-off and team-neutral risk. Braking change is environmental, not shared status.

## Beast Clash: Fresh Start

Ability ID: `ICE-01-C`. Category: Ally cooldown support.

Eligible other living ally cooldown while source ready

Replace attack to reduce longest-running other ally ability cooldown

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

While ready, replace normal attack if another living teammate has eligible cooldown running. Otherwise ordinary attack and preserve readiness. Stunned prevents use, preserves readiness.

### Targets / placement

Other living teammates including reserves, never self. Select individual eligible ability with MOST cooldown turns remaining; tie uses stable lineup order.

### Core resolution

Flurrit removes ONE remaining turn; Blizzmoth TWO, minimum zero. No extra normal action or attack.

### Recharge / frequency

Cooldown 5/4/3/2 subsequent OWNER normal turns, setup/application turn excluded. Reserve pauses; Stunned skipped normal turns count.

### Lifetime / persistence

Reaching zero restores readiness only. Requires next ordinary legal trigger; never replay missed entry trigger or immediately activate ability.

### Exceptions / counterplay

Running ability cooldowns ONLY. No stored-charge refill, once-per-Clash reset, status-duration change, cleanse or status-slot occupation. Multiple timers on one tied ally require stable secondary ordering.

### Visuals

Snowflakes travel to ally; existing ability indicator flashes as TURN count decreases. No new head/status badge or seconds clock.

### Progression / notes

Support retained. Old periodic entry-shield support replaced. Distinct resource help from Second Tide healing and Lightning Rod transfer.
