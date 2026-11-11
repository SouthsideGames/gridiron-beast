# Voltarch

**Electric · Legendary · QB · Clash: Striker**

[Position comparison](../positions/QB.md) · [Beast Dex](../README.md)

Family ID: `stormcrown`. Source labels are not runtime implementation proof.

**Approved build:** Elite pocket passer.

## Voltarch

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 24–34 | 44–56 | Yes |
| Agility | 28–38 | 50–62 | Yes |
| Strength | 40–50 | 65–77 | Yes |
| Awareness | 64–74 | 94–99 | — |
| Catching | 22–32 | 42–56 | — |
| Arm | 60–70 | 88–96 | — |
| Accuracy | 66–76 | 95–99 | — |
| Blocking | 20–30 | 40–54 | — |
| Tackling | 22–32 | 42–56 | — |
| Coverage | 20–30 | 40–54 | — |
| Durability | 56–66 | 85–94 | — |
| Kicking | 10–20 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Stormguard

Ability ID: `ELE-06-F`. Category: Special action.

After eligible offensive passing play selected

Two real temporary electrical pass blockers outside both offensive line ends

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

After an eligible passing play is selected, including play-action and RPO passing options, summon if ready. Available on the first eligible play.

### Targets / placement

One guard just outside EACH end of offensive line, on offensive side of LOS. Find nearest legal empty spot on its respective side, remaining behind LOS. Summon only if BOTH can be legally placed; otherwise no guards, preserve readiness.

### Core resolution

Both guards provide pass protection using ordinary reach, movement, collision and block contests. Attributes are 60% / 65% / 70% / 75% of Voltarch PERMANENT Strength, Blocking, Speed, Agility and Awareness, rounded to whole ratings. No inherited temporary modifiers or separate stamina pool.

### Recharge / frequency

Fixed FIVE subsequent offensive plays cooldown; mastery improves guard ratings instead. Successful summon spends readiness even if neither guard engages.

### Lifetime / persistence

Remain through entire creation play and disappear at whistle. On an RPO run branch, remain but retain pass-protection assignments; never become lead blockers. No roster slot, independent progression or lasting injury.

### Exceptions / counterplay

Owner override: guards are immune to ALL statuses and environmental modifiers. Ordinary collision, block sheds and pushback still work. No ball handling, routes, tackles, pancakes, abilities or further summons. Track NO guard statistics and credit none to Voltarch; no extra participation XP or source ability triggers. Guard injuries disappear with them and never injure Voltarch.

### Visuals

Two lightning strikes, left and right of offensive line, spawn recognizable electrical blocker silhouettes with subtle sparks. Strikes cosmetic, no damage or obscuring cloud. User declined additional placement visual.

### Progression / notes

Legendary standalone QB. Earlier route-link and block-retry aura versions withdrawn. Owner closed placement, RPO branch, permanent-rating, immunity and no-stat boundaries. Physical knockdown must not bypass the explicit shared-status immunity. Implementation and balance checks remain.

## Beast Clash: Twin Thunder

Ability ID: `ELE-06-C`. Category: Setup constructs.

First eligible own action summons instead of attacking

Two setup constructs bolt after future HP-damaging normal attacks against surviving active target

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Once per Clash, replace first eligible own normal action with summoning two guards. Stunned postpones setup until Voltarch can act.

### Targets / placement

After a qualifying normal attack that deals actual HP damage, one guard targets the SAME surviving ACTIVE enemy. Knockout, target removal or replacement before launch preserves guard; do not redirect or follow into reserve.

### Core resolution

Guard bolt deals 40% / 50% / 60% / 70% normal attack damage. Launch ONLY if Voltarch’s normal attack deals actual HP damage. Miss or full shield absorption preserves guard. Bolt uses separate evasion, type, shield and damage-reduction checks; launching spends it even if the bolt misses.

### Recharge / frequency

Once per Clash setup. No repeat summon after rotation or revival.

### Lifetime / persistence

Unused guards persist in reserve with no turn countdown. Voltarch KO removes them; revival does not restore use. Constructs have no HP, collision, shared status slots or independent turns.

### Exceptions / counterplay

Resolve retaliation from original attack FIRST. If Voltarch is then KO or Stunned, do not launch; surviving Stunned Voltarch retains unused guard. Bolts grant no extra turn, attack-counter progress or ordinary-only archetype perks and cannot trigger retaliation chains.

### Visuals

Two lightning strikes form guards beside Voltarch. Guards STAY STATIONARY and fire lightning bolts (owner 10B), disappearing after their individual launch.

### Progression / notes

Striker retained. Owner final closeout 9B requires actual HP damage, superseding earlier connected-hit wording; 10A preserves guard if original target is removed/replaced before launch. Setup and two finite constructs, not permanent attack growth.
