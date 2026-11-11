# Vyrnax

**Dragon · Rare · K · Clash: Striker**

[Position comparison](../positions/K.md) · [Beast Dex](../README.md)

Family ID: `vyrnax`. Source labels are not runtime implementation proof.

**Approved build:** Strong ordinary kicker.

## Vyrnax

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 15–25 | 35–49 | — |
| Agility | 20–30 | 40–54 | — |
| Strength | 50–60 | 80–90 | — |
| Awareness | 40–50 | 70–80 | — |
| Catching | 25–35 | 45–59 | — |
| Arm | 15–25 | 35–49 | — |
| Accuracy | 10–20 | 30–44 | — |
| Blocking | 30–40 | 50–64 | — |
| Tackling | 30–40 | 55–69 | — |
| Coverage | 10–20 | 30–44 | — |
| Durability | 52–62 | 82–92 | — |
| Kicking | 60–70 | 90–94 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Dragon Roar

Ability ID: `DRA-05-F`. Category: Special action.

Player chooses one field-goal attempt per game to activate before kick. Eligible chosen attempt up to90 yards. Canceled before launch preserves use.

Dragon Roar / Exact activated success chart all mastery:90yd30%,85yd40%,80yd45%,75yd50%,70yd55%,65yd or less100%. Smooth linear interpolation between listed distances. Supplies sufficient range up to90 and uses chart directly.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Player chooses one field-goal attempt per game to activate before kick. Eligible chosen attempt up to90 yards. Canceled before launch preserves use.

### Targets / placement

Own kicker and selected actual FG attempt. Extra points/punts/kickoffs follow ordinary rules.

### Core resolution

Exact activated success chart all mastery:90yd30%,85yd40%,80yd45%,75yd50%,70yd55%,65yd or less100%. Smooth linear interpolation between listed distances. Supplies sufficient range up to90 and uses chart directly.

### Recharge / frequency

Once per game spent on activated kick launch whether made/missed. Preserve spent state halftime/OT. Other kicks use ordinary calculations.

### Lifetime / persistence

One actual kick at real distance. Record actual FG distance and result. No retry, fake short distance, new field or shared status.

### Exceptions / counterplay

Chart replaces original distance-relief/floor/automatic45-yard proposal. Exact percentages fixed all mastery. Normal activation availability required. Above90 outside this signature chart.

### Visuals

Vyrnax roar summons spectral dragon coiling around football and following kick toward uprights. Clear pre-kick activation indicator.

### Progression / notes

Player-selected once-game custom curve explicitly approved, supplied power range. Curve values must be exact and stored as data. No invented mastery bonus.

### Ability story

Vyrnax gathers its breath and sends a dragon roar downfield. A spectral dragon coils around the football, carrying the force of the roar toward distant uprights.

## Beast Clash: Dragon Roar

Ability ID: `DRA-05-C`. Category: Signature action.

First performed normal attack each Clash, even later active entry, becomes enhanced roar. Support actions and Stunned skips preserve first-attack opportunity.

Dragon Roar / Attack120/130/140/150% normal by mastery. Connected hit guarantees application attempt with normal shared gate, no separate accuracy roll. Weakened reduces outgoing damage15% for2 recipient normal turns, application turn excluded.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

First performed normal attack each Clash, even later active entry, becomes enhanced roar. Support actions and Stunned skips preserve first-attack opportunity.

### Targets / placement

Current enemy active. Connected hit including shield absorption attempts Weakened.

### Core resolution

Attack120/130/140/150% normal by mastery. Connected hit guarantees application attempt with normal shared gate, no separate accuracy roll. Weakened reduces outgoing damage15% for2 recipient normal turns, application turn excluded.

### Recharge / frequency

Once opening strike per Clash spent on launch even evaded or status blocked. Rotation/revival do not refresh.

### Lifetime / persistence

Remaining Weakened turns carry to participating football plays as15% Strength reduction under normal 1:1 carry.

### Exceptions / counterplay

Ordinary evasion/type/shields/reduction. Exclude ordinary-only Striker bonuses. 15% is status magnitude, not application probability.

### Visuals

Focused dragon-shaped sound wave strikes active target. Standard cracked-fist badge on accepted Weakened.

### Progression / notes

Attack120/130/140/150%, Weakened15% fixed2turns. Striker retained.

### Ability story

Vyrnax announces its arrival with a roar that shakes the opponent confidence. The first blast leaves its target struggling to put full strength behind the answer.
