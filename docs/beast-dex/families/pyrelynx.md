# Flarynx

**Fire · Rare · CB · Clash: Tank**

[Position comparison](../positions/CB.md) · [Beast Dex](../README.md)

Family ID: `pyrelynx`. Source labels are not runtime implementation proof.

**Approved build:** Physical coverage corner.

## Flarynx

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 40–50 | 68–80 | Yes |
| Agility | 37–47 | 65–77 | Yes |
| Strength | 58–68 | 88–94 | — |
| Awareness | 53–63 | 83–93 | — |
| Catching | 37–47 | 65–77 | Yes |
| Arm | 10–20 | 25–39 | — |
| Accuracy | 10–20 | 25–39 | — |
| Blocking | 30–40 | 55–69 | — |
| Tackling | 55–65 | 85–93 | — |
| Coverage | 59–69 | 89–94 | — |
| Durability | 59–69 | 89–94 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Heat Haze

Ability ID: `FIR-05-F`. Category: Aura.

Passive live play

Passive opponent Catching debuff; moving aura

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Active while Flarynx on field during live play.

### Targets / placement

Opponents within 3 yards; opposing Fire types immune

### Core resolution

Reduce effective Catching attribute, not flat catch probability. Effect ends outside aura.

### Recharge / frequency

No cooldown; duplicates use strongest only.

### Lifetime / persistence

Moving aura; no field remains.

### Exceptions / counterplay

Teammates unaffected. Fire immunity is explicitly approved for this aura. No guaranteed drops.

### Visuals

Moving visible heat shimmer, readable ball and player markers.

### Progression / notes

Catching reduction 10/12/14/16%.

## Beast Clash: Heat Mirage

Ability ID: `FIR-05-C`. Category: Entry defense.

Starting active or entering active position while ready

Entry decoy; probabilistic whole-attack evasion

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Eligible starting-active or entry creates one decoy even if Flarynx cannot act; creation is automatic entry effect, not action. No new creation just because cooldown ends.

### Targets / placement

Self; next direct attack

### Core resolution

Normal direct attacks and delayed offensive attacks trigger one diversion roll for entire attack including all hits. Success diverts whole attack; failure resolves normally. Both consume decoy. Other targets of area attacks resolve independently.

### Recharge / frequency

THREE subsequent OWNER NORMAL TURNS after decoy creation. Creation turn excluded; Stunned skips count; reserve time/reactions do not. Opening entry starts same counter at zero. Entry creates decoy only when ready; no automatic creation merely because cooldown expires while already active. Supersedes exchange readiness examples.

### Lifetime / persistence

Until direct attack consumes it or Flarynx leaves active position.

### Exceptions / counterplay

Counters, reaction damage and damage over time neither roll nor consume decoy. Explicitly undodgeable attacks bypass it without consuming. Unused decoy ends when owner leaves active position.

### Visuals

Recognizable shimmering decoy; successful attack visibly strikes it.

### Progression / notes

Diversion chance 30/35/40/45%.
