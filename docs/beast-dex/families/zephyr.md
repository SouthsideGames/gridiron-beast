# Zephiro

**Wind · Rare · QB · Clash: Support**

[Position comparison](../positions/QB.md) · [Beast Dex](../README.md)

Family ID: `zephyr`. Source labels are not runtime implementation proof.

**Approved build:** Mobile playmaker.

## Zephiro

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 60–70 | 88–94 | — |
| Agility | 61–71 | 89–94 | — |
| Strength | 22–32 | 42–54 | Yes |
| Awareness | 46–56 | 78–88 | — |
| Catching | 35–45 | 60–74 | — |
| Arm | 42–52 | 72–82 | Yes |
| Accuracy | 52–62 | 83–91 | — |
| Blocking | 12–22 | 30–44 | — |
| Tackling | 15–25 | 35–49 | — |
| Coverage | 22–32 | 45–59 | — |
| Durability | 38–48 | 65–77 | Yes |
| Kicking | 12–22 | 30–44 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Tailwind Huddle

Ability ID: `WIN-05-F`. Category: Aura.

Zephiro; rare Wind QB. At offensive snap while ready/able choose one eligible allied NON-Wind blocker with legal blocking assignment and running cooldown, inside mastery radius4 /5 /6 /7 yards of initial QB alignment.

Snap-local QB aura grants one extra ally blocker cooldown unit at whistle

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Zephiro; rare Wind QB. At offensive snap while ready/able choose one eligible allied NON-Wind blocker with legal blocking assignment and running cooldown, inside mastery radius4 /5 /6 /7 yards of initial QB alignment.

### Targets / placement

Nearest eligible blocker in mastery radius4 /5 /6 /7 yards, stable lineup ties. Snapshot candidate at snap, never switch later.

### Core resolution

At whistle, after ordinary participating-play cooldown decrement, remove1 extra play from chosen blocker's still-running eligible cooldown. Radius eligibility is the SNAP snapshot at mastery4 /5 /6 /7 yards, not fixed4 and not continuous following. Never charge/once-use refill or replay missed trigger.

### Recharge / frequency

Zephiro own cooldown 4 subsequent offensive plays, application play excluded; only spent if bonus actually removes a unit.

### Lifetime / persistence

Per-play candidate lock, no later target switching. No effect on once-game/possession uses or status clocks.

### Exceptions / counterplay

Stunned / Knocked Down at snap prevents. Cannot accelerate self, constructs or an already-ready ability.

### Visuals

Low pale wind ring around QB; chosen blocker recharge bar pulses once at whistle.

### Progression / notes

Aura radius 4 / 5 / 6 / 7 yards by mastery. One bonus cooldown unit fixed. Need separate ordinary cooldown decrement and extra decrement to avoid same-play activation or negative counts.

## Beast Clash: Tailwind Pact

Ability ID: `WIN-05-C`. Category: Signature action.

Zephiro; rare; QB; Clash archetype Support → Support. Once per Clash on own normal action when at least two living allies have empty slots; replaces attack.

Once normal action attempts gated team Empowered without healing or override

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Zephiro; rare; QB; Clash archetype Support → Support. Once per Clash on own normal action when at least two living allies have empty slots; replaces attack.

### Targets / placement

All living allies including reserves and self with empty slots; no replacement or cleanse.

### Core resolution

Attempt Empowered +15 /18 /21 /24% by mastery for2 recipient normal turns on all living allies/self/reserves with empty slots. No heal/extra attack/overwrite. Football converts same percentage to Strength for remaining plays.

### Recharge / frequency

Once per Clash, committed on cast even if some allies blocked.

### Lifetime / persistence

App turn excluded; reserve pauses. Football conversion is same-percent Strength for remaining plays; no immediate field trigger.

### Exceptions / counterplay

Existing other statuses block. Equal same-status extension follows normal cap; targeting requires two empty slots, not two extendable slots.

### Visuals

Team wind stream links eligible allies; one ordinary fist badge per accepted ally.

### Progression / notes

Empowered strength 15 / 18 / 21 / 24% by mastery. Requires multi-target shared-status application and defined cross-mode payload.
