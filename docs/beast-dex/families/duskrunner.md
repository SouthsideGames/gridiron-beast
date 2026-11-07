# Duskyre

**Dark · Rare · RB · Clash: Striker**

[Position comparison](../positions/RB.md) · [Beast Dex](../README.md)

Family ID: `duskrunner`. Source labels are not runtime implementation proof.

Owner-approved rarity change: Uncommon → Rare.

**Approved build:** Patient cutback runner.

## Duskyre

Stage 0; starting reference level 1. Evolution preserves rarity.

| Attribute | Level-1 start | Individual potential | Below-band weakness |
| --- | ---: | ---: | --- |
| Speed | 45–55 | 75–85 | — |
| Agility | 58–68 | 88–94 | — |
| Strength | 47–57 | 77–87 | — |
| Awareness | 59–69 | 89–94 | — |
| Catching | 32–42 | 60–70 | Yes |
| Arm | 15–25 | 30–44 | — |
| Accuracy | 20–30 | 35–49 | — |
| Blocking | 23–33 | 45–57 | Yes |
| Tackling | 25–35 | 40–54 | — |
| Coverage | 25–35 | 40–54 | — |
| Durability | 45–55 | 75–85 | — |
| Kicking | 5–15 | 20–34 | — |

These are ordinary non-Apex profiles. Apex has separate 10–15 starting ratings and all-99 potential. Starting reference rows for evolved forms do not themselves award evolution gains.

## Football: Vanishing Cut

Ability ID: `DAR-03-F`. Category: Self enhancement.

Duskyre; uncommon; RB; On own rushing play, first successful ordinary juke after gaining mastery-required net rushing yards while ready.

DAR-03-F: Vanishing Cut; Become non-targetable for that defender NEXT tackle attempt on this play only: defender cannot initiate it but can pursue/block routes; all other defenders normal. No global invisibility or full stop.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Duskyre; uncommon; RB; On own rushing play, first successful ordinary juke after gaining mastery-required net rushing yards while ready.

### Targets / placement

Self and the one juked defender.

### Core resolution

Become non-targetable for that defender NEXT tackle attempt on this play only: defender cannot initiate it but can pursue/block routes; all other defenders normal. No global invisibility or full stop.

### Recharge / frequency

Cooldown 5 subsequent offensive plays fixed; spent at successful juke.

### Lifetime / persistence

Opportunity expires whistle; no status slot, no literal visual disappearance of football.

### Exceptions / counterplay

If defender never tries again, no refund. No bypass of existing tackle, body collisions, sideline or end-zone rules. Source disable prevents.

### Visuals

A dark afterimage peels away; actual runner/ball keep bright readable outline.

### Progression / notes

Required rush gain5 / 4 / 3 / 2 yards by mastery; no other stat changes. Needs per-opponent tackle-attempt exclusion token and preserved targeting for everyone else.

## Beast Clash: Predator Rhythm

Ability ID: `DAR-03-C`. Category: Clash ability.

Duskyre; uncommon; RB; Clash archetype Striker → Striker. After two consecutive performed normal attacks damage the SAME enemy monster HP, next own normal attack on that monster is empowered.

DAR-03-C: Predator Rhythm; Third strike deals140 / 150 / 160 / 170% normal damage by mastery. Miss, shield-only hit, change of target or target departure resets sequence; no bonus dodge.

Source: workbook v18. Apply the later shared overrides in [Approved Rules](../APPROVED_RULES.md) and the Task 8 specification.

### Trigger / eligibility

Duskyre; uncommon; RB; Clash archetype Striker → Striker. After two consecutive performed normal attacks damage the SAME enemy monster HP, next own normal attack on that monster is empowered.

### Targets / placement

Previously damaged monster only while still enemy active.

### Core resolution

Third strike deals140 / 150 / 160 / 170% normal damage by mastery. Miss, shield-only hit, change of target or target departure resets sequence; no bonus dodge.

### Recharge / frequency

Sequence cycles to zero after enhanced attempt; no turns timer.

### Lifetime / persistence

Partial sequence pauses in own reserve; enemy departure destroys target-specific sequence.

### Exceptions / counterplay

No free follow-up, healing or execute. Confused redirected hit does not advance valid enemy sequence.

### Visuals

Three claw slashes fill on ability marker; final slash becomes long shadow.

### Progression / notes

Third-strike damage140 / 150 / 160 / 170% by mastery. Same-target streak rules fixed. Need target-ID sequence ledger and HP-damage provenance, single normal action.
