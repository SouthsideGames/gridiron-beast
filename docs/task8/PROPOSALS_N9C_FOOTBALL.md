# Proposals requested by owner ruling N9c (2026-11-09 18:14): Foresight and Prism Break before the play choice

> Superseded by owner approval N9d of the nine recommendations. See `N9D_APPROVED_IMPLEMENTATION.md` for current rules and validation. This packet is retained as decision history.


Status: **proposals only.** Nothing in this file is implemented, and no mechanic was changed to write it (N9c: "Requests for
proposals are not approval of unspecified mechanics"). Both abilities play today exactly as they did at `4e41043`; their rows in
`docs/task8/ABILITY_COMPLETION_MATRIX.md` stay **partial** until the owner chooses.

What "today" means on the match screen for both: the effect is drawn in the time before the snap that the match plays after both
calls are final (the pre-roll, integration item I6), never on the play-call screen.

---

## 1. PSY-03-F Foresight (Cerebrix, QB)

### The Dex contract (quoted)

- Trigger / eligibility: "Before either side selects plays while ready, randomly mark one initially aligned opposing LB within 3
  yards of LOS. Both sides see candidate. At snap validate marked defender actually blitzes."
- Targets / placement: "Only marked LB. No future defensive choice inspection, substitute target or new audible selection. Keep same
  candidate through audibles and use final assignment at snap."
- Core resolution: "If marked LB blitzes and Cerebrix able, roll fixed 50% chance to apply Confused. Success attempts 20% effective
  Awareness reduction for current play with normal shared status-slot rules."
- Lifetime / persistence: "Current-play Confused expires whistle. Candidate seeded/saved before choices."
- Visuals: "Psychic eye above Cerebrix and lavender floor marker under warned LB. Standard Confused badge after accepted application."
- Ability story: "The defender must decide whether the blitz is worth the risk, while the offense cannot count on the prediction
  working."

### What the engine does now (`src/sim/abilities/cerebrix.js`)

- There is no step before the play choice. At `playStart` (inside the snap, both calls final), while his cooldown is 0, the contract
  lists the opposing linebackers whose alignment **in the defensive play that was called** is within 3 yards of the line, sorted by
  slot, and picks one with one draw of the play's own random stream (`ctx.rng.next()`: the engine's in-play stream, seeded from the
  game's dice for that play).
- It logs the mark (`foresight_mark`), then: no blitz assignment (rush / contain) keeps readiness; an unable Cerebrix keeps
  readiness; otherwise the cooldown is spent and a second draw (`ctx.rng.chance(0.5)`) decides the Confused attempt.
- So the candidate (a) does not exist before the choices, (b) depends on the called defense's personnel and alignment, and (c)
  consumes a draw of the in-play stream. The defense cannot react to it, which is the opposite of the Dex story.

### The data available before the choice

- Whether Cerebrix is ready (his game-scope state, `cd === 0`) and on his club's offense.
- The defending club's linebackers and its **pre-snap look**: personnel and the package's base alignment, which is what the
  play-call screen already draws for the opponent (`field-view.js presnapLook`; never the call or its assignments).
- Not available without reading a hidden choice: the defensive call, its exact alignment, and whether the linebacker will blitz.

### Option A (recommended): a pre-choice candidate drawn from the look, validated at the snap

- **When:** at the start of the offensive scrimmage snap's play-call step, once per snap, while Cerebrix is ready, able and in the
  offensive personnel on the field. (His club's play is not chosen yet; the candidate is drawn against the personnel he lines up
  in, the same "conditional on the creator taking part" rule the owner approved for Runway in N9c: if the play then called leaves
  him out, nothing happens and readiness is kept.)
- **From what data:** the linebackers of the defense's pre-snap look whose look alignment is within 3 yards of the line (the range
  and the alignment condition are unchanged; only the alignment used is the look's base alignment instead of the called play's).
  One draw from a pre-snap stream seeded by the game seed, the play index and Cerebrix (the stream the other pre-snap producers
  already use: `rules.js preSnapHooks`), so the game's dice and the in-play stream keep their order except for the one in-play draw
  that is no longer made.
- **What is stored:** `{ play: index, mid: linebacker id }` in his game-scope state ("Candidate seeded/saved before choices"): a
  reload, an audible or a re-render cannot reroll it.
- **What is shown, to both sides, on the play-call screen:** the psychic eye over Cerebrix and the lavender floor marker under the
  candidate (the existing look, drawn through the existing pre-snap effect hook), plus one line under the field: "Foresight:
  Cerebrix has seen <name>. If he blitzes, a 50% chance he is Confused this play." The AI defense is told the same fact when it
  picks its call (see consequence 2).
- **At the snap:** if the stored candidate is on the field in the called defense, validate as now (blitz assignment, Cerebrix able,
  gate), spend the cooldown and roll the 50%. If he is not on the field (the called package leaves him out), nothing happens and
  readiness is kept ("no substitute target").
- **Consequences:**
  1. A linebacker within 3 yards in the look but aligned elsewhere in the call (or the reverse) is judged on the look. The Dex words
     ("initially aligned") fit the look; today's code reads the call because nothing earlier exists. Needs the owner's word that
     the look alignment is the "initial alignment".
  2. The defense now decides knowing the mark. For the human on defense that is the marker on the screen. For the AI coach it is a
     behaviour question that needs its own ruling: (a) the AI ignores the mark (simplest; the mark then only informs the human), or
     (b) the AI lowers its blitz weight for calls that send the marked linebacker (a tuning value to be approved). This proposal
     does **not** choose; (a) changes no AI call.
  3. Simulation change: yes (when the candidate is drawn, which alignment qualifies, one in-play draw removed). The identity
     reference would differ in every game where Foresight marks; balance should be re-measured (`tools/ability-balance.mjs`).

### Option B: keep the engine, show only readiness before the choice

- **What is shown before the choice:** the eye over a ready Cerebrix and one line: "Foresight is ready: one linebacker near the
  line will be marked at the snap." No candidate, because none exists.
- **Consequences:** no simulation change, identity unchanged. It does **not** meet "Both sides see candidate" before the choice, and
  the defender still cannot weigh the blitz; the row would stay partial against the Dex as written unless the owner accepts the
  readiness cue as sufficient (as was done for Bramble Trap's before-snap visibility).

---

## 2. LIG-04-F Prism Break (Prism family, S)

### The Dex contract (quoted)

- Trigger / eligibility: "Personal tackles and pass breakups grant one charge per participating play, maximum one total per play.
  Three charges arm Prism Break for the next eligible defensive pre-choice opportunity. Activation play cannot recharge."
- Targets / placement: "Choose nearest existing enemy-created environmental zone anywhere on field, distance to nearest edge,
  creation order breaks ties. Base, legendary-created and overlap zones eligible. No target preserves full bar."
- Core resolution: "Remove one selected base zone entirely. For a selected hybrid overlap, remove the hybrid and contributing parent
  effects within that overlap footprint only; no underlying parent effect returns there. Remaining parent portions stay intact."
- Exceptions: "Cannot remove physical obstacles, walls, clones, auras or statuses. Unable source preserves readiness."
- Visuals: "Floating prism fires rainbow beam; selected field fractures into fading light before play choices."

### What the engine does now (`src/sim/abilities/prism.js`, `src/sim/rules.js runScrimmagePlay`)

Order inside a scrimmage snap, both calls final:

1. pre-snap producers queue their fields (Runway, Crosswind Rescue, Bloom Break, Static Field, Charge Strip, Bramble Trap);
2. every pending field eligible for this snap is created (`createPending`), including the ones just queued;
3. **Prism Break**: for each defender whose contract has the game hook, with 3 charges and not sitting the play out: the candidate
   zones are the enemy-created base fields and enemy-made hybrid overlaps in the active list (so a field created in step 2 of this
   same snap is eligible); the distance is measured from **his alignment in the called defensive play** to each zone's nearest
   edge (0 inside); ties by creation order, then id; the zone is removed (a base field entirely, an overlap's footprint only) and
   the charges are spent. No target keeps the bar;
4. a pending absence is served, the play is simulated.

So today the removal happens after both calls, measures from an alignment the offense has not seen, and can remove a field that
did not exist when the plays were chosen.

### The data available before the choice

- The active fields (all of them are already on the play-call screen, I2), their owners, footprints and creation order.
- The pending fields: banked ones (their place may depend on the calls) and the conditional ones of N9c (Runway, Bloom Break,
  Crosswind Rescue: known place, created only if the creator takes part).
- The defending club's pre-snap look (personnel, base alignment). Not available: the defensive call and its alignment.

### The measuring reference: three candidates

| Reference | Hidden information used | Notes |
| --- | --- | --- |
| R1. His alignment in the called defensive play (today) | **Yes** (the call) | Excluded by N9c ("No hidden future alignment") |
| R2. His base alignment in the defense's pre-snap look | No: the look is what both sides already see | Changes when the package shown changes; the human defender could pick the removed field by choosing a package before choosing a play (needs the lock below) |
| R3. A fixed reference: the safety reference point, 12 yards beyond the upcoming line on the ball's lateral | No | The same point other abilities use ("FIXED safety-reference depth 12 yards", Bloom Break; Tsunami Line); independent of package and slot; fully predictable to both sides |

Recommended: **R3**. It uses no alignment at all, cannot be steered by showing a different package, and is already an approved
reference elsewhere in the Dex. R2 is the closest to today's behaviour without hidden information, at the price of a lock rule.

### Option A (recommended): removal at a pre-choice step, existing fields only

- **Event order of a defensive scrimmage snap for his club:**
  1. the previous play's whistle has run every field clock (unchanged);
  2. **pre-choice step** (new): if he has 3 charges, is able, and is in the defensive personnel of the look, choose the nearest
     enemy-created zone among the fields **active at that moment**, measured from the reference (R3 or R2), ties as now; remove it;
     spend the charges; store `{ play: index }` so a reload or re-render cannot repeat or re-target it;
  3. both sides choose their plays with the field already gone (the play-call screen plays the prism, the beam and the fracture
     once, through the existing reveal clock, then shows the field without the removed zone);
  4. the snap: producers queue, pending fields are created, the play runs. Prism Break does nothing more at this snap.
- **Pending fields:** **cannot be removed.** The Dex targets the "nearest **existing** enemy-created environmental zone"; a pending
  field is not a zone yet, its place can still depend on the calls, and removing a banked activation would be a new mechanic
  (a counter to readiness, not to a zone). A field created at this very snap (step 4) therefore survives this Prism Break and is
  eligible at the next opportunity. This is a change from today, where a field created in the same snap can be removed at once.
- **No target:** the bar is kept (unchanged). **Unable source:** readiness kept (unchanged).
- **Conditional on taking part?** The removal happens before the defense's call, so it cannot depend on the call. Two readings to
  choose from: (i) it requires him in the personnel of the look (then showing a package without him holds the bar; simple, but the
  human can time it); (ii) it requires only that he is able and on the roster of the defense's active line-up for the game. The
  proposal recommends (i), the same "creator takes part" rule as the N9c fields, with the lock that the choice is made once per
  snap from the first look shown.
- **Consequences:** simulation change (when the removal happens, the reference, same-snap fields no longer removable); the offense
  now chooses its play knowing the field is gone, which is what the Dex Visuals row describes; identity differs wherever Prism
  Break fires; balance to re-measure. The charge rule "Activation play cannot recharge" is unchanged (the activation play is the
  snap that follows the pre-choice step).

### Option B: keep the removal inside the snap, announce it before the choice

- **Before the choice:** over a full-bar, able safety in the look, the floating prism, and a line under the field: "Prism Break is
  armed: the nearest enemy field will be shattered at the snap." The target is **not** named or marked, because under today's
  reference (R1) naming it would reveal the called alignment; with R2 or R3 as the reference it can be marked (a dashed outline on
  the doomed field), and then only fields existing before the choice should be eligible, which is Option A's rule under another
  name.
- **Consequences:** with R1 kept, no simulation change and identity unchanged, but the Dex Visuals row ("fractures ... before play
  choices") is not met and N9c's "no hidden future alignment" is not addressed: the row stays partial. With the reference changed
  to R2 / R3 it is a simulation change of the same size as Option A without its benefit (the offense still chooses with the field
  on the screen). Listed for completeness; not recommended.

### Questions for the owner (Prism Break)

1. Reference: R3 (fixed 12-yard safety reference) or R2 (his alignment in the pre-snap look)?
2. Confirm that pending fields cannot be removed and that a field created at the same snap survives until the next opportunity.
3. Participation: reading (i) or (ii) above.

### Questions for the owner (Foresight)

1. Is the look's base alignment the "initial alignment" for the 3-yard condition (Option A), or is the readiness cue enough
   (Option B)?
2. If Option A: does the AI defense ignore the mark, or weigh it (and by how much)?
