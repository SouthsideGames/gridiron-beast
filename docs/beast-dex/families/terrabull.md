# Terrabull

**Earth · Uncommon · TE · Clash: Disruptor**

[Position comparison](../positions/TE.md) · [Beast Dex](../README.md)

Family ID: `terrabull`. Source labels are not runtime implementation proof.

Owner-approved rarity change: Rare → Uncommon.

**Approved build:** Mobile receiving tight end.

## Terrabull

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 49–59 | 77–84 | — |
| Agility | 48–58 | 76–84 | — |
| Strength | 37–47 | 65–75 | — |
| Awareness | 27–37 | 50–62 | Yes |
| Catching | 50–60 | 78–84 | — |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 10–20 | 25–39 | — |
| Blocking | 22–32 | 45–57 | Yes |
| Tackling | 20–30 | 40–54 | — |
| Coverage | 10–20 | 30–44 | — |
| Durability | 37–47 | 65–75 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Stone Screen

Ability ID: `EAR-05-F`. Category: Special action.

Reception at least five yards beyond LOS

Catch creates moving one-sided physical stone wall for five further forward yards

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Secure reception at least FIVE yards beyond LOS while ready. No handoffs, returns or blocking-only activation.

### Targets / placement

Nearest defender determines side at catch; equal distance uses stable lineup order. THREE-yard width, HALF-yard thickness, ONE-yard clear gap between owner body and near wall face. Lock field orientation, never rotate toward new threats.

### Core resolution

Wall follows Terrabull UNTIL first obstructing defender contact, then stops moving and remains a STATIONARY physical barrier until existing distance/whistle expiration. Defenders must go around. No push, damage, status, automatic tackle break or fumble protection; other approaches remain open.

### Recharge / frequency

Cooldown 5 / 4 / 3 / 2 subsequent offensive plays, spent on successful creation. Illegal overlapping/trapping placement: preserve readiness.

### Lifetime / persistence

Ends after FIVE additional forward yards after activation or whistle. No seconds-based duration; no next-play obstacle.

### Exceptions / counterplay

Not a zone, status or extra monster. Never spawn through/trap a monster; illegal overlap or boundary placement preserves readiness. Moving wall STOPS on obstructing defender contact; never displaces the defender.

### Visuals

Jagged slab rises, travels with visible ground seam, then cracks into fading rubble. Ask before generating visual preview.

### Progression / notes

Rare standalone TE. Prior Quake Step proposals WITHDRAWN. Similarity to Stormguard is acknowledged but wall has no AI, attributes or block contests.

## Beast Clash: Stone Divide

Ability ID: `EAR-05-C`. Category: Extra-attack denial.

Active non-Stunned source observes enemy extra strike

Once automatic wall cancels enemy follow-up or attack retaliation before evasion and damage

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Once per Clash, source ACTIVE and not Stunned, automatically intercept first eligible enemy extra strike.

### Targets / placement

Any living teammate, self or reserve. Includes Twin Thunder bolt, Victory Surge, Arc Rebound, Riptide Pursuit and attack-based retaliation.

### Core resolution

Cancel ONE strike and its attached effects BEFORE evasion or damage. Do not consume target dodge / shield. Intercepted attack counts as launched and attacker resources remain spent.

### Recharge / frequency

No normal action cost; once per Clash, no mastery scaling. Rotation/revival do not restore spent use.

### Lifetime / persistence

Instant interception; subsequent remaining strikes resolve normally. No persistent shield or field.

### Exceptions / counterplay

**Approved Task 8 rule (N9d):** N9d: ordinary attacks, normal-action specials and their secondary/commanded/assist hits, delayed impacts, DOT and transferred damage remain unaffected. Intercept eligible attack-triggered retaliation, including Molten Brand eruption. Healing-triggered Rubble Reprisal is unaffected. Preserve explicit Twin Thunder, Victory Surge, Arc Rebound and Riptide Pursuit inclusions and the active/able/once-use restrictions.

> Superseded v18 text: Ordinary attacks, normal-action specials, delayed meteors/fissures, DOT and transferred damage unaffected. No reflection, bonus attack, HP pool or attributes.

### Visuals

Tall slab erupts between attacker and target, takes impact, collapses. No persistent obstacle or status.

### Progression / notes

Disruptor retained. Requires explicit attack-kind tags shared with earlier mode signatures; never guess from animation alone.
