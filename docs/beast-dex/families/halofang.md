# Haloryx

**Light · Rare · LB · Clash: Striker**

[Position comparison](../positions/LB.md) · [Beast Dex](../README.md)

Family ID: `halofang`. Source labels are not runtime implementation proof.

**Approved build:** Sideline-to-sideline tackler.

## Haloryx

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 60–70 | 90–94 | — |
| Agility | 55–65 | 85–93 | — |
| Strength | 32–42 | 60–72 | Yes |
| Awareness | 58–68 | 88–94 | — |
| Catching | 45–55 | 75–85 | — |
| Arm | 15–25 | 30–44 | — |
| Accuracy | 15–25 | 30–44 | — |
| Blocking | 15–25 | 35–49 | — |
| Tackling | 60–70 | 90–94 | — |
| Coverage | 47–57 | 77–87 | — |
| Durability | 50–60 | 80–90 | — |
| Kicking | 10–20 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Radiant Pursuit

Ability ID: `LIG-05-F`. Category: Self enhancement.

Haloryx; rare; LB; After mastery-required personal successful tackles on rushing plays (3 / 3 / 2 / 2), arm next participating defensive snap. Assists qualify once per play.

Radiant Pursuit: Ignore ordinary allied-body path obstruction while chasing ball carrier; enemy blockers still collide normally. Ends BEFORE tackle contest, no pass-through enemy or automatic win.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Haloryx; rare; LB; After mastery-required personal successful tackles on rushing plays (3 / 3 / 2 / 2), arm next participating defensive snap. Assists qualify once per play.

### Targets / placement

Self until it makes first tackle attempt on current ball carrier.

### Core resolution

Ignore ordinary allied-body path obstruction while chasing ball carrier; enemy blockers still collide normally. Ends BEFORE tackle contest, no pass-through enemy or automatic win.

### Recharge / frequency

Charge empties at snap; activation play cannot recharge. No additional cooldown.

### Lifetime / persistence

Ability state expires whistle even no tackle. Partial/full charge carries halves/possessions.

### Exceptions / counterplay

No teleport or increased stats. Stunned/Knocked Down prevents snap activation and preserves bar. Cannot ghost physical walls, environmental vines or enemy bodies.

### Visuals

Radiant trail links source to runner; allied intersections shimmer without hiding source.

### Progression / notes

Required tackles 3 / 3 / 2 / 2 by mastery. Need collision filtering by team and stable pursuit mode; do not disable tackle geometry.

## Beast Clash: Radiant Pursuit

Ability ID: `LIG-05-C`. Category: Signature action.

Haloryx; rare; LB; Clash archetype Striker → Striker. Own normal attack when enemy target HP is below 35% at action commit.

Radiant Pursuit: Deal115 / 125 / 135 / 145% normal damage by mastery, no auto-KO, healing or extra hit.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Haloryx; rare; LB; Clash archetype Striker → Striker. Own normal attack when enemy target HP is below 35% at action commit.

### Targets / placement

Intended active enemy; not a reserve, no target switch.

### Core resolution

Deal115 / 125 / 135 / 145% normal damage by mastery, no auto-KO, healing or extra hit.

### Recharge / frequency

Passive conditional attack; no cooldown or charge.

### Lifetime / persistence

Eligibility evaluated before hit; if target heals afterward use ordinary current event order. No persistent buff.

### Exceptions / counterplay

Normal evasion/shield/Guarded/Tank apply. Does not bypass Last Root or guaranteed survival.

### Visuals

Halo narrows into spearhead only when target visibly below threshold.

### Progression / notes

Multiplier 115 / 125 / 135 / 145% by mastery, threshold35 fixed. Conditional multiplier metadata; retain normal-attack identity for ordinary archetype perks only where global perk policy permits (G06).
