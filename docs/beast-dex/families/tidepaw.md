# Aquip

**Water · Common · CB · Clash: Support**

[Position comparison](../positions/CB.md) · [Beast Dex](../README.md)

Family ID: `tidepaw`. Source labels are not runtime implementation proof.

**Approved build:** Balanced coverage defender.

## Aquip

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 27–37 | 52–62 | — |
| Agility | 25–35 | 50–60 | — |
| Strength | 10–20 | 30–40 | Yes |
| Awareness | 34–44 | 59–64 | — |
| Catching | 10–20 | 30–40 | Yes |
| Arm | 1–10 | 10–24 | — |
| Accuracy | 5–15 | 15–29 | — |
| Blocking | 10–20 | 30–44 | — |
| Tackling | 25–35 | 50–60 | — |
| Coverage | 34–44 | 59–64 | — |
| Durability | 25–35 | 50–60 | — |
| Kicking | 1–10 | 10–24 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Aquarrel

Stage 1; evolution level 10; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 32–42 | 57–67 | — |
| Agility | 30–40 | 55–65 | — |
| Strength | 15–25 | 35–45 | Yes |
| Awareness | 39–49 | 64–69 | — |
| Catching | 15–25 | 35–45 | Yes |
| Arm | 5–15 | 15–29 | — |
| Accuracy | 10–20 | 20–34 | — |
| Blocking | 15–25 | 35–49 | — |
| Tackling | 30–40 | 55–65 | — |
| Coverage | 39–49 | 64–69 | — |
| Durability | 30–40 | 55–65 | — |
| Kicking | 5–15 | 15–29 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Abyssin

Stage 2; evolution level 20; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 37–47 | 62–72 | — |
| Agility | 35–45 | 60–70 | — |
| Strength | 20–30 | 40–50 | — |
| Awareness | 44–54 | 69–74 | — |
| Catching | 20–30 | 40–50 | — |
| Arm | 10–20 | 20–34 | — |
| Accuracy | 15–25 | 25–39 | — |
| Blocking | 20–30 | 40–54 | — |
| Tackling | 35–45 | 60–70 | — |
| Coverage | 44–54 | 69–74 | — |
| Durability | 35–45 | 60–70 | — |
| Kicking | 10–20 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Splashdown

Ability ID: `WAT-01-F`. Category: Zone.

Personal pass breakup

PBU-created small Water slip patch

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Personally credited pass breakup only; interceptions do NOT trigger. Automatic when ready.

### Targets / placement

Water rectangle centered on deflection spot; 6 yards wide sideline-to-sideline by 4 yards long end-zone-to-end-zone, fixed field alignment.

### Core resolution

On distinct sharp cut or sudden stop, roll form/mastery slip chance, never per frame. Water types immune; both teams otherwise affected. Slip attempts Stumbled via shared single-status gate: lose 40% CURRENT speed, maximum speed unchanged, Speed controls reacceleration. No Knocked Down. Maximum one successful slip per monster per play.

### Recharge / frequency

Three subsequent defensive plays: trigger play 1, unavailable 2–4, ready 5. Recharge even if creator benched; no seconds timer.

### Lifetime / persistence

Creation play excluded; lasts TWO subsequent completed football plays regardless possession/creator participation. Clear halftime/actual game end. Slip Stumbled clears at current whistle, not carried into next snap: explicit application-play exception.

### Exceptions / counterplay

Environmental field is not shared status. Water immunity; explicit Stumbled attempt can be blocked by active different status. Existing overlap rules apply. No interception activation.

### Visuals

Visible shallow wet rectangle; recharge bar fills thirds and alternates via fade with status badge rather than crowding overhead UI.

### Progression / notes

Aquip slip chances 20/22/24/26%; Aquarrel 25/27/29/31%; Abyssin 30/32/34/36%. Duration, footprint and slip loss fixed.

## Beast Clash: Second Tide

Ability ID: `WAT-01-C`. Category: Support.

Every second eligible normal action

Heal most injured percentage; surplus attempts Shielded

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Every second own normal turn on which able to act replaces attack. First eligible action attacks. Stunned skipped actions do not build ability counter (but do tick status duration).

### Targets / placement

Living ally INCLUDING self with largest missing-HP percentage. If tied, active ally first, then reserve lineup order. If all healthy, active ally.

### Core resolution

Compute healing budget from recipient maximum HP and form/mastery; apply Healing Reduced to budget FIRST. Restore missing HP; 100% remaining surplus attempts Shielded. 100% Healing Reduced means no heal or surplus shield. No damage.

### Recharge / frequency

Every second eligible action, not exchanges or wall-clock seconds. Action counter preserved on rotation; reset for separate Clash.

### Lifetime / persistence

Shield lasts THREE recipient own normal turns, excluding application turn; pause reserve time; clear when pool depleted. Same-game transfer preserves remaining duration 1:1 and becomes one football fumble save.

### Exceptions / counterplay

Normal shared status gate applies to shield; healing still resolves if shield blocked. Equal Shielded extends duration only without refill; stronger replaces; blocked surplus is lost. No undoing restored HP.

### Visuals

Water healing animation then visible shield if accepted. Use shared Shielded badge; no extra status identity.

### Progression / notes

Healing fractions: Aquip 15/16/17/18%; Aquarrel 18/19/20/21%; Abyssin 21/22/23/24%. Support retained.
