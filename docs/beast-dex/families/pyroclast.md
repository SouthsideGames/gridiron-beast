# Pyroclast

**Fire · Legendary · TE · Clash: Disruptor**

[Position comparison](../positions/TE.md) · [Beast Dex](../README.md)

Family ID: `pyroclast`. Source labels are not runtime implementation proof.

**Approved build:** Powerful receiving threat.

## Pyroclast

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 59–69 | 88–96 | — |
| Agility | 37–47 | 65–77 | Yes |
| Strength | 66–76 | 95–99 | — |
| Awareness | 56–66 | 85–93 | — |
| Catching | 65–75 | 94–99 | — |
| Arm | 15–25 | 35–49 | — |
| Accuracy | 10–20 | 30–44 | — |
| Blocking | 37–47 | 65–79 | Yes |
| Tackling | 35–45 | 60–74 | — |
| Coverage | 15–25 | 35–49 | — |
| Durability | 65–75 | 94–99 | — |
| Kicking | 10–20 | 25–39 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Eruption — Burning Wake

Ability ID: `FIR-06-F`. Category: Zone.

Five YAC earns next-offensive-play zone

Total-YAC-width Fire rectangle at upcoming LB depth

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Catch-and-run reaches5YAC while ready; finalize earned width AFTER return ends. Before next offensive snap create zone at opposing linebackers INITIAL alignment depth for upcoming play. No live-run Fire strip. Once per offensive possession as previously approved.

### Targets / placement

Before play selection create fixed5-yard-long rectangle centered at LB REFERENCE DEPTH, always FIVE yards beyond upcoming LOS regardless actual linebackers. Center laterally on Pyroclast INITIAL pre-play position. Width TOTAL earned YAC, min5/cap FIELD.width; symmetric lateral expansion and inward boundary shift. Later play/formation changes do not move it.

### Core resolution

After qualifying catch-and-run, pending earned rectangle becomes Fire zone before NEXT offensive snap.5YAC ->5x5;10YAC ->10wide x5long;20YAC ->20wide x5long. Slow25/28/31/34% by mastery; Fireimmune, both teams others affected.

### Recharge / frequency

Once per offensive possession as approved; at most ONE pending activation. Pending token waits through touchdowns, possession changes and halftime. Do not bank extra tokens while one is pending. Two-point attempts cannot trigger. Stored token is spent when its zone actually spawns.

### Lifetime / persistence

TWO completed plays INCLUDING SPAWN play as play1. Pending token and already-created legendary field preserve remaining state through halftime without refresh. Hold pending token across possession changes; all clear actual game end. Earlier suggestion to exclude spawn play was explicitly withdrawn by owner.

### Exceptions / counterplay

Fire types immune; other types on both teams slowed. Use fixed5-yard LB reference, not actual LB count/depth. Show before play selection and lock placement. Only one pending activation; existing boundary/overlap rules apply.

### Visuals

Earn size during catch-and-run; before next snap create clearly bounded Fire rectangle at upcoming LB depth. Visible earned width, symmetric lateral expansion; no obsolete live trail. Specific pre-snap creation choreography not newly approved.

### Progression / notes

Slow25/28/31/34%, fixed5length; width TOTALYAC at least5 cappedfullfield. Not extra yards beyond5, not previous live-anchor footprint.

## Beast Clash: Faultline

Ability ID: `FIR-06-C`. Category: Delayed slot disruption.

Normal action replaced by fissure creation

Delayed single-target eruption plus 100% Healing Reduced

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Marks slot of normal attack target.

### Targets / placement

Mark lineup position occupied by normal attack target, not monster identity. Current occupant at eruption receives main hit. Healing block attaches to hit MONSTER and follows rotations; no persistent slot suppression.

### Core resolution

Create fissure instead of normal attack; erupt at end of following exchange after rotations. Deal single-target direct damage; attempt Healing Reduced at 100% for TWO affected target TURNS, blocking all HP restoration while allowing shields. Apply shared status gate/strength/three-application rules. If status is blocked, eruption damage still resolves and use is spent.

### Recharge / frequency

Once per Clash.

### Lifetime / persistence

Once per Clash. Pending attack persists through source rotation/KO while Clash ongoing. Offensive strength recalculates at impact; KO source uses last pre-KO strength. Accepted Healing Reduced follows target through rotations, pauses in reserve, starts decrement on next normal turn, applies through final turn. Target KO clears it; entering football clears it because no Football effect is defined.

### Exceptions / counterplay

Faultline Healing Reduced is a harmful UNCLEANSABLE status at 100%. It CANNOT coexist with another shared status type. Shield-absorbed connected hit can attempt it; dodge/decoy prevents it. Empty marked slot: no damage/status. Same-status stronger/equal/weaker and episode cap rules apply. No splash.

### Visuals

Visible fissure marks lineup position; eruption synchronized to hit. If Healing Reduced applies, show shared green-cross/red-down-arrow badge and remaining target-turn count. No separate healing-block badge or slot-suppression indicator.

### Progression / notes

Damage 150/160/170/180% by mastery. Healing Reduced is 100% for two affected target turns; no application-turn decrement. Old two-exchange timer and condition coexistence are superseded. Formation suppression removed. Approved archetype Disruptor.
