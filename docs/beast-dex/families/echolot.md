# Echolot

**Psychic · Uncommon · K · Clash: Balanced**

[Position comparison](../positions/K.md) · [Beast Dex](../README.md)

Family ID: `echolot`. Source labels are not runtime implementation proof.

**Approved build:** Recovery specialist.

## Echolot

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 45–55 | 73–83 | — |
| Agility | 47–57 | 75–84 | — |
| Strength | 10–20 | 30–44 | — |
| Awareness | 34–44 | 62–72 | — |
| Catching | 25–35 | 45–59 | — |
| Arm | 15–25 | 30–44 | — |
| Accuracy | 20–30 | 35–49 | — |
| Blocking | 10–20 | 25–39 | — |
| Tackling | 25–35 | 50–64 | — |
| Coverage | 20–30 | 40–54 | — |
| Durability | 23–33 | 45–59 | — |
| Kicking | 49–59 | 77–84 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Echo Landing

Ability ID: `PSY-04-F`. Category: Zone.

Own legal kickoff caught in field of play and returned without touchdown while ready banks next opposing offensive scrimmage Psychic field. Touchback, out-of-bounds kick and return touchdown give no reward.

Echo Landing / Standard Psychic field: both teams non-Psychic inward pull 20% applicable maximum speed, 1-yard center deadband, same-type neutrality. Echolot can be benched when pending field appears.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Own legal kickoff caught in field of play and returned without touchdown while ready banks next opposing offensive scrimmage Psychic field. Touchback, out-of-bounds kick and return touchdown give no reward.

### Targets / placement

6 yards wide by 8 yards long, extending from upcoming LOS into offensive backfield, centered laterally on initial opposing QB. Shift only enough to fit field-of-play boundaries.

### Core resolution

Standard Psychic field: both teams non-Psychic inward pull 20% applicable maximum speed, 1-yard center deadband, same-type neutrality. Echolot can be benched when pending field appears.

### Recharge / frequency

Six subsequent team defensive scrimmage plays cooldown after creation, counting while kicker benched. Maximum one pending field.

### Lifetime / persistence

Life 1 / 2 / 2 / 3 defensive scrimmage plays by mastery including creation and incomplete passes. Kickoff consumes no life. Pending survives possessions/half, created zone clears half. Stationary after creation.

### Exceptions / counterplay

Reveal before both choices. Audibles do not reposition zone. Ordinary collision and boundaries, no altered kick physics or guaranteed return stop. Source bench does not prevent creation.

### Visuals

Psychic ripples beneath ball at return end reform into magenta backfield rectangle before next play choices. Zone does not remain at kickoff landing spot.

### Progression / notes

Mastery improves created lifetime only. All eleven A approved. Approved K reassignment retained.

### Ability story

Echolot hears the final echo of a returned kick and folds it into the opponent backfield, trading the safety of a touchback for a chance to disturb the next drive.

## Beast Clash: Echo Strike

Ability ID: `PSY-04-C`. Category: Signature action.

Ready own normal action uses stored latest positive direct enemy HP hit. Each individual hit of a multihit attack replaces memory, leaving last qualifying hit.

Echo Strike / One attack with 100% normal damage plus 35 / 50 / 65 / 80% stored HP damage by mastery. Bonus capped at 15% target maximum HP before normal evasion/type/Guarded/shield defenses apply to combined budget.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Ready own normal action uses stored latest positive direct enemy HP hit. Each individual hit of a multihit attack replaces memory, leaving last qualifying hit.

### Targets / placement

Current active enemy. Store most recent qualifying individual actual HP damage, not maximum or sum. Exclude DOT, self damage and shield-absorbed damage.

### Core resolution

One attack with 100% normal damage plus 35 / 50 / 65 / 80% stored HP damage by mastery. Bonus capped at 15% target maximum HP before normal evasion/type/Guarded/shield defenses apply to combined budget.

### Recharge / frequency

Five subsequent owner normal turns cooldown, paused reserve. New qualifying hits update memory during cooldown. Consume memory on launch even if evaded. No memory or unable source preserves readiness; ordinary attack/skip as applicable.

### Lifetime / persistence

Memory survives rotation in same Clash. Clear on knockout, football entry or actual Clash end. No extra action or immediate retaliation.

### Exceptions / counterplay

Ordinary eligible damage rules apply. This is one enhanced normal attack, not separate bonus hit. Shared ordinary-only perk policy remains subject to final global reconciliation.

### Visuals

Psychic outline replays latest impact behind source, then launches vibrating sonic ring toward opponent.

### Progression / notes

Balanced retained. Stored-hit factor 35 / 50 / 65 / 80%, cap fixed 15% target maxHP. All twelve A approved.

### Ability story

Echolot remembers the last blow it heard through its own body and returns that echo in its next strike. A smaller follow-up hit can quiet the memory.
