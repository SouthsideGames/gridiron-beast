# Ferronox

**Metal · Uncommon · DL · Clash: Striker**

[Position comparison](../positions/DL.md) · [Beast Dex](../README.md)

Family ID: `ironjaw`. Source labels are not runtime implementation proof.

**Approved build:** Physical turnover hunter.

## Ferronox

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 37–47 | 65–75 | — |
| Agility | 25–35 | 48–60 | Yes |
| Strength | 51–61 | 79–84 | — |
| Awareness | 22–32 | 45–57 | Yes |
| Catching | 20–30 | 35–49 | — |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 5–15 | 20–34 | — |
| Blocking | 25–35 | 45–59 | — |
| Tackling | 52–62 | 80–84 | — |
| Coverage | 10–20 | 25–39 | — |
| Durability | 42–52 | 70–80 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Ball Clamp

Ability ID: `MET-04-F`. Category: Targeted effect.

Ferronox; uncommon; DL; After own sack while ready, earn token for next tackle attempt against a ball carrier.

Ball Clamp: On successful normal tackle, if first fumble check did not fumble perform ONE additional ordinary forced-fumble check at mastery factor0.25 / 0.40 / 0.55 / 0.70 of normal probability. Shielded can prevent actual fumble normally. No guaranteed turnover or second tackle.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Ferronox; uncommon; DL; After own sack while ready, earn token for next tackle attempt against a ball carrier.

### Targets / placement

Actual tackled ball carrier, including QB sack; no returner unless explicit owner approval of special teams, default scrimmage only.

### Core resolution

On successful normal tackle, if first fumble check did not fumble perform ONE additional ordinary forced-fumble check at mastery factor0.25 / 0.40 / 0.55 / 0.70 of normal probability. Shielded can prevent actual fumble normally. No guaranteed turnover or second tackle.

### Recharge / frequency

One banked token, consumed on successful tackle eligible for extra roll; failed tackle preserves. Cannot earn and spend on same play.

### Lifetime / persistence

Token carries halftime and possessions until used; max1; only defensive scrimmage.

### Exceptions / counterplay

Tackle ending in safety/endzone/whistle follows normal fumble legality; no retroactive turnover after finalized score.

### Visuals

Iron jaws briefly snap around ball at tackle point; no body biting/damage or new status.

### Progression / notes

Extra check factor 0.25 / 0.40 / 0.55 / 0.70 of normal fumble chance by mastery. Needs fumble probability reuse without double stats/ball spawning; resolve before dead-ball finalization.

## Beast Clash: Iron Bite

Ability ID: `MET-04-C`. Category: Signature action.

Ferronox; uncommon; DL; Clash archetype Striker → Striker. Ready own normal action replaces attack if enemy active has Shielded with positive pool.

120% normal damage, shield multiplier1.5/1.75/2/2.25, HP overflow retains ordinary budget under approved closeout13.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Ferronox; uncommon; DL; Clash archetype Striker → Striker. Ready own normal action replaces attack if enemy active has Shielded with positive pool.

### Targets / placement

That active Shielded enemy; one target.

### Core resolution

120% normal damage. Shield multiplier1.5/1.75/2/2.25 by mastery. Compute ordinary mitigated attack budget D and shield multiplier M. Remove min(S,D*M) shieldHP. If shield S is broken, remaining HP budget=max(0,D-S/M), otherwise zero. Do not amplify HP overflow. Example D100,M2,S100 gives100 shield damage and50 HP budget.

### Recharge / frequency

Cooldown 5 owner turns fixed, spent launch even evaded.

### Lifetime / persistence

No status strip; depleted shield ends normally. No lingering wound.

### Exceptions / counterplay

If no shield ordinary attack preserve. Phase Strike bypasses pool, this consumes it; normal type/DR apply before shield-specific multiplier.

### Visuals

Metal bite strikes shield surface, fragments match actual pool loss.

### Progression / notes

Shield multiplier 1.5 / 1.75 / 2 / 2.25 by mastery. Need separate shield and HP budgets; document exact overflow formula G08 to avoid amplified HP damage.
