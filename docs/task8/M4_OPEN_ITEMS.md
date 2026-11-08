# M4 open items: D6, D8, D13, D14, plus the D16 ability-kind table

This is a read-only survey of `task8-implementation` (working tree clean) and `origin/task8-m4-core` (081c590). No files were changed.

Conventions:
- Quotes are exact.
- **[Inference]** marks my own reading of code or text.
- **[Silent]** marks points no source addresses.
- Ruling text: SPECIFICATION_BASELINE.md §25 (lines 728–775) and APPROVAL_REGISTER.md "M4 decisions D1–D19" (lines 221–247).

---

## 6. Tank bruise (D6, open)

**Ruling status.** §25 item 6: "**Tank bruise.** Open: explanation requested." APPROVAL_REGISTER.md:232: "Explanation requested: effect, duration, stacking, presentation, and relationship to the single-status rule".

### 6.1 What the old engine does

**Values.** `src/clash/values.js:25–29`, group `conditions`, tag `'approved'`:
`healAfflicted: 0.7, healBruised: 0.75, bruiseExchanges: 2` (line 28).

**Trigger.** `src/clash/handlers.js:100`, inside `hit()`:
```js
if (att.c.archetype === 'Tank') def.bruisedUntil = E.ex + V.conditions.bruiseExchanges;
```
- Any hit made through `hit()` by an attacker whose archetype is Tank bruises the defender.
- The line runs after the shield step and the HP update, and runs whatever the damage was. **[Inference]** A hit fully absorbed by a shield (0 to HP) still bruises.
- A miss returns earlier (dodge, veil or illusion, handlers.js:64–68), so it does not bruise.
- Damage that skips `hit()` does not bruise. **[Inference]** That covers splash (engine.js:213), Magma Crust/thorns reflection (engine.js:70–71) and Burn ticks (engine.js:329).
- The defender can be any monster, not only the front. The blink and arrival hits also go through `hit()`.
- **[Inference]** "Tank" here is the legacy archetype from the old move row (`stats.js archetypeOf`). M4_PLAN.md:27 says 11 families disagree with the Dex, so the set of monsters that bruise differs from the Dex's Tanks.

**Effect.** `handlers.js:106–121`, `heal()`:
- The function's doc comment reads: "A heal with every approved cut: afflicted x0.7, bruised x0.75, the duration model, O1 for later heals."
- Line 112: `if (target.bruisedUntil >= E.ex) { k *= V.conditions.healBruised; why.push('bruised'); }`
- It multiplies the heal factor `k` with the C6/R2 factor, Afflicted ×0.7, healCut, O1 and the half-swap ×0.5. The result is `Math.round(maxHp × share × k)`, capped at missing HP (line 117).
- It does **not** affect shields: `grantShield`, handlers.js:125–130, has no bruise check.
- It does **not** affect HP gains written outside `heal()`. **[Inference]** These are regrowOnHit (engine.js:80), Dragonhide (engine.js:81) and Iron Bite's KO heal (engine.js:110).

**Duration.**
- `bruisedUntil = ex + 2`, and the bruise holds while `bruisedUntil >= ex`. So it covers the rest of the hit exchange plus the next two exchanges.
- It is counted in absolute exchange numbers. **[Inference]** It is not counted in turns, and it keeps running while the target is on the bench. Nothing pauses it; compare `pauseCondition` in conditions.js:59, which bruise does not use.
- **[Inference]** Legacy heals mostly happen in `backRow()`, which runs before initiative (engine.js:338). So in practice a bruise reduces heals in exchanges ex+1 and ex+2, plus any `selfHeal` later in exchange ex.

**Stacking.**
- A new Tank hit overwrites `bruisedUntil`, so the window is refreshed from the latest hit. There is only one field.
- The ×0.75 applies at most once per heal.
- Bruise is a separate field (`bruisedUntil: -1`, engine.js:57) from the condition slot `cs.cond`, so it coexists with any condition. inventory/C-clash.md:394 lists bruisedUntil among "Other non-status flags … None of them use the slot."
- inventory/C-clash.md:163 summarises it: "hits it lands make the target "bruised" for 2 exchanges, so heals on that target x0.75 (handlers.js:100, 112; values.js:28)".

**Presentation.** There is no dedicated UI.
- **No badge or icon.** The replay snapshot carries only `hp, shield, cond, paused` (engine.js:48). The arena's status icon reads `s.cond || s.paused` (arena.js:121, 126).
- **The only trace is heal-event text.** The heal log reads "`… heals <target> <n> (reduced: bruised)`" (handlers.js:120), and the reason list can also include "stalemate", "burn" and so on.
  - That text appears as the arena caption: `caption.textContent = result.log[st.i]?.text` (src/ui/clash/arena.js:134).
  - It also appears in the Clash Lab "Full log" (src/ui/screens/clash-lab.js:92).
- **The heal float shows only the number** (`+N`, arena.js:257; choreographer.js:71).
- **Help and Lab text never mention bruise.** The Help text (src/ui/screens/clash-battle.js:24) does not. The Lab's stat card mentions only "5. Guard in front (Tank 0.88 unless pierced)" (clash-lab.js:83).
- **[Inference]** A player sees bruise only by reading the caption of a heal event.
- No "bruise" string appears anywhere in src/ui (grep).

### 6.2 Task 8: is it a status, and does it use the slot?

- **Not among the 12 identities.** Appendix B lists STA-01..12: Stunned, Slowed, Stumbled, Knocked Down, Afflicted, Weakened, Confused, Healing Reduced, Shielded, Empowered, Quickened, Guarded. `src/sim/t8/status.js:7–18` has the same 12. Bruised is not one of them.
- **Appendix B folds the name into Healing Reduced.** STA-08 (SPECIFICATION_APPENDICES.md:871): "Clash only. Consolidates Bruised and Healing Blocked." Its Beast Clash line (:867): "Reduce all HP restoration by application percentage; 100% blocks self/ally healing, regeneration and damage/KO-triggered healing. Shields still work."
- **Archetype traits are not statuses.** STA-12 (:919): "Permanent archetype traits remain traits, not extra statuses."
- **The single-slot rule.** §10 (SPECIFICATION_BASELINE.md:387): "Exactly one shared status type is active per monster, beneficial or harmful. Different statuses cannot replace it without an explicit removal/replacement ability."
- **[Silent]** No source says whether the Tank bruise is an "archetype trait" or a "Bruised" status. Spec §10, §20–§25 and the Dex never mention the Tank bruise. The only Task 8 authority for keeping perks is R1 item 28: "preserve approved shared type rules and archetype perks" (DECISIONS.md:34, approved via B13). That item names no bruise.
- **D7 retires the legacy Afflicted heal penalty.** §25 item 7: "Its legacy healing penalty is retired. Healing Reduced handles healing reduction." The ruling does not mention bruise.

### 6.3 M4 core branch (origin/task8-m4-core)

Bruise is not implemented.
- `src/clash/t8/values.js:44–45`: `{ id: 'tank-bruise-not-implemented', waitsOn: 'D6', rule: 'The legacy Tank bruise perk (heals x0.75) is not implemented in t8: no heal exists in S1 and its form is an open decision.' }`
- M4_STATUS.md:102 repeats this.

### 6.4 The proposal (M4_PLAN.md:251–257, D6)

> - *The gap:* Appendix B STA-08 says Healing Reduced "consolidates Bruised". The Tank perk (hits make the target heal ×0.75 for 2 exchanges) is an archetype trait, and STA-12 says "permanent archetype traits remain traits, not extra statuses".
> - *Options:* (a) keep bruise as a non-status trait effect, on a recipient-normal-turn clock (2 turns); (b) make it a Healing Reduced 25% application through the gate (it would occupy the slot on almost every Tank hit); (c) retire it.
> - *Recommendation:* (a). It preserves "archetype perks remain" (R1 28/37) without flooding the single slot.

What each option means for the slot, restated from the plan with my reading of §10:
- **(a)** Bruise stays outside the slot, as in legacy. Its clock changes from 2 exchanges to 2 recipient normal turns. **[Inference]** It would then pause in reserve, as all §10 clocks do.
- **(b)** It becomes a Healing Reduced 25% episode in the one slot. **[Inference]** Under §10 it would be blocked when the target already holds any other status, would block every other status while it lasts, and would count toward the 3-application cap.
- **(c)** It is removed.

---

## 8. Battle-length rules (D8, open)

**Ruling status.** §25 item 8: "Open: explanation requested of the exact damage ramp, the healing reduction, the battle cap, and how pending delayed effects and knockouts resolve at the cap."

**Tags.** `src/clash/values.js`:

| Group | Line | Tag |
|---|---|---|
| `battle` (exchangeCap 30) | 30 | `'approved'` |
| `tiebreak` | 31 | `'approved'` |
| `suddenDeath` | 32 | **`'provisional'`** ("Gate A baselines; owner decides at Gate B", comment at :44 for the provisional block; TAG_LABEL :214 "Provisional (Gate B decides)") |
| `duration` (C6) | 56 | `'approved'`, comment :55: "Approved permanently in values 1.1.0 (owner, 2026-10-21): C6. Values 1.0.0 played Model F." |
| `experiments.sdFromE` | 70 | inside `experiments`, tag `'experimental'`: "Model E sudden-death start (1-3 per side)", default 12, options [12, 15, 18, 99] |

M4_STATUS.md:162–163, finding 5: "Sudden death is tagged `provisional` in `values.js`. The plan calls the ramp, C6 and the cap approved values 1.1.0, but only C6 and the cap are tagged approved in code."

**[Silent]** No Task 8 document (spec §1–§25, Appendices, rulings) mentions the ramp, C6 or the 30-exchange cap. The plan says so too (M4_PLAN.md:264: "approved values 1.1.0 that Task 8 never mentions").

### 8.1 Sudden-death damage ramp

**Values.** values.js:33–34:
```
E: { from: 12, step: 0.15, cap: 2.25, sides: [1, 2, 3] },
F: { from: 12, step: 0.25, cap: 4.0, sides: [4, 5] },
```

**Model choice.** engine.js:22: `rampModelFor(perSide) { return perSide >= 4 ? 'F' : 'E'; }`, with `perSide = Math.max(a.length, b.length)` (engine.js:41).

**Formula.** engine.js:21:
`rampFor(model, ex, from) = Math.min(m.cap, 1 + m.step * Math.max(0, ex - (f - 1)))`
- `f` is `cfg.sdFromE` for Model E (default 12) and `m.from` (12) for F (engine.js:42).
- It is recomputed at the start of every exchange (engine.js:303).
- It first exceeds 1 at exchange 12. Values computed with `rampFor`:

| Exchange | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23+ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E (1–3 a side) | 1 | 1.15 | 1.30 | 1.45 | 1.60 | 1.75 | 1.90 | 2.05 | 2.20 | **2.25 cap** | 2.25 | 2.25 | 2.25 |
| F (4–5 a side) | 1 | 1.25 | 1.50 | 1.75 | 2.00 | 2.25 | 2.50 | 2.75 | 3.00 | 3.25 | 3.50 | 3.75 | **4.00 cap** |

**What it multiplies (legacy).**
- Every `hit()` damage roll: `Math.round(att.c.atk * mult * E.ramp * type * spread * daze * guard * bonus)` (handlers.js:83). That covers strikes, specials, arrival hits and refused-swap hits.
- Magma Crust eruption and thorns: `def.c.atk * mv.erupt * E.ramp` (engine.js:70–71).
- Splash, indirectly: it is a share of the already-ramped `dealt` (engine.js:213).
- Not Burn ticks: `maxHp * burnPerExchange` (conditions.js:40).
- Separately, Sovereign Arm's `suddenDeathBonus` applies "while `E.ramp > 1`" (handlers.js:81).
- The alternative duration model R2 divides heals by the ramp (engine.js:171), but it is a Lab experiment only.

**Presentation.**
- Log events "Sudden death begins: damage x1.15, rising each exchange", then "Sudden death: damage x…" (engine.js:304–305).
- Banner "Sudden death!" (choreographer.js:93, arena.js:294).
- HUD "⚡ Sudden death ×N" with a `sudden` viewport class (arena.js:132).

**t8 core.**
- Reads the same `L.suddenDeath` (t8/values.js:19, "values 1.1.0 (tagged provisional there); its t8 scope waits on D8").
- Uses `sdFrom = V.suddenDeath[model].from`, so there is no sdFromE experiment (t8/engine.js:64).
- Applies the ramp to the raw ordinary attack: `const raw = x.c.atk * ramp * spread;` (t8/engine.js:137).
- Provisional entry `sudden-death-scope` (t8/values.js:30–31).

### 8.2 C6 stalemate healing and shield reduction

**Value.** values.js:60:
`C6: { label: 'C6 stalemate rule: from exchange 12, no knockout for 5 exchanges halves healing and shields; for 9, quarters them', from: 12, halfAfter: 5, quarterAfter: 9, half: 0.5, quarter: 0.25 }`

**Formula.** engine.js:170–174:
```js
if (cfg.duration === 'C6') { if (ex < dur.from) return 1; const quiet = ex - lastKO; if (quiet >= dur.quarterAfter) return dur.quarter; if (quiet >= dur.halfAfter) return dur.half; }
```
- `lastKO` starts at 0 (engine.js:44) and is set to `ex` by every `knockout()` call (engine.js:105). That includes Burn, splash and reflected KOs.
- It is computed once at exchange start (engine.js:303). **[Inference]** A KO during exchange n changes the multiplier only from exchange n+1.
- **[Inference]** Because `lastKO` starts at 0, a battle with no KO before exchange 12 is already at ×0.25 at exchange 12 (quiet = 12 ≥ 9).
- Example: a last KO at exchange 10 gives ×1 at 12–14, ×0.5 at 15–18 and ×0.25 from 19.

**What it multiplies (legacy).**
- Every `heal()` (`let k = E.healMult`, handlers.js:109).
- Every `grantShield()` (`* E.healMult`, handlers.js:126), which covers entry shields and Support shields.
- Glacier Wall regrow (engine.js:76).

**What it does not multiply** **[Inference from code]**: regrowOnHit (engine.js:80), Dragonhide (engine.js:81) and Iron Bite's KO heal (engine.js:110).

**Which rulesets.**
- C6 is the `current` ruleset's duration model (values.js:77).
- `v1.0.0` uses Model F, "no healing reduction" (values.js:58, 78).
- BEAST_CLASH_BALANCE_MANIFEST.md:67 records the reason: "Ends defensive stalemates (5 Supports mirror reached the cap in 6.8% of battles under Model F)".

**Presentation.** A `stalemate` event, "Stalemate rule: no knockout for N exchanges, healing and shields at 50%/25%" (engine.js:306). The arena shows it as a "dim" overlay (choreographer.js:94, arena.js:305). Heal text adds "(reduced: stalemate)" (handlers.js:110).

**t8 core.**
- `stalemate: L.duration.models.C6` (t8/values.js:20).
- The multiplier is computed identically (t8/engine.js:175–177), but nothing reads it yet, because S1 has no heal or shield.
- Provisional entry `stalemate-c6-scope` (t8/values.js:32–33).

### 8.3 The battle cap, the HP-share tiebreak and the coin

**Cap.**
- `battle: { exchangeCap: 30 }` (values.js:30).
- Loop: `while (ex < V.battle.exchangeCap)` (engine.js:302), so at most 30 exchanges.
- t8: `while (ex < V.battle.exchangeCap && !winner)` (t8/engine.js:185).

**Tiebreak.**
- `tiebreak: { rule: 'hp_share', exactTie: 'seeded_coin' }` (values.js:31).
- engine.js:374–378: `hpShare(side) = Σ max(0, hp) / Σ maxHp` over the whole line. Knocked-out monsters count 0. Shields are not counted.
- Higher share wins (`by: 'hp'`). An exact equality goes to `rng.chance(0.5)` (`by: 'coin'`).
- Result flag: `capped: ex >= 30 && by !== 'knockout'` (engine.js:384).
- t8 does the same at t8/engine.js:226–233 and :240.

**Presentation.** Banner "Exchange cap" or "Coin flip" (choreographer.js:95, arena.js:295). Help text: "or the side with more health left after 30 exchanges" (clash-battle.js:24).

### 8.4 Pending delayed effects and knockouts at the cap

**Old engine.**
- **No delayed impacts exist.** No legacy move delays damage. Falling Star's predecessor "Meteor Pass" is an every-second-strike 1.4× hit (src/data/clash-moves.js:13).
- **Nothing that deals damage is left pending at the cap.** Burn ticks at the start of an exchange (engine.js:325–331), so the last tick of a capped battle is the one at the start of exchange 30.
- **A knockout in exchange 30 that leaves a side empty decides the battle by knockout, not by HP.** `ended()` runs after each action and at the replacement points (engine.js:333, 340, 356, 361). The HP-share block runs only `if (!winner)` (engine.js:376).
- **Double KO.** A double KO at any point goes to the seeded coin (`ended()`, engine.js:370).
- **[Inference]** If the first actor's KO empties the opposing side, the second actor does not act (the `break` at engine.js:356).

**What the Task 8 contracts imply.** These are [Inference] from the text; no ruling covers the cap.

*Exchange order.* P6 as corrected by B3 (DECISION_PACKET_FINAL.md:314–315) runs "5. **End of exchange:** delayed impacts (Falling Star, Faultline)… 6. **End check:** a double knockout goes to the existing seeded coin." The t8 skeleton follows it: rotation, then `endOfExchange`, then `endCheck`, then the cap block after the loop (t8/engine.js:216–233).

*Falling Star (FIR-03-C) and Faultline (FIR-06-C).*
- Falling Star: "Impact at end of following exchange after rotations." Lifetime: "Once launched, persists through owner rotation/knockout **while Clash ongoing**."
- Faultline: "erupt at end of following exchange after rotations"; "Pending attack persists through source rotation/KO **while Clash ongoing**."
- **[Inference]** A launch in exchange 29 impacts at the end of exchange 30, before the end check and before the cap tiebreak. A launch in exchange 30 would impact at the end of a 31st exchange that never runs.
- **[Silent]** No source says what happens to it at the cap. The "while Clash ongoing" wording suggests it lapses when the Clash ends.

*Astral Strike (PSY-06-C) is not a delayed impact.* Its contract makes it commanded attacks inside Astralux's own normal action ("use own normal action to command every eligible living enemy reserve … then perform Astralux own attack"). **[Inference]** It resolves entirely within that turn, so nothing of it is pending at the cap.

*Effects that the contracts say end with the Clash:*
- Dawn Song: "KO/actual Clash end cancels" its pending pulses.
- Second Spring: "Cannot activate after Clash ended."
- Victory Surge: "No living replacement / battle ended: no follow-up attack or animation."
- Echo Strike memory, Mind Game trick, Foresight mirror, Gust Hop count, Coil Renewal count and Eye of the Storm also clear at "(actual) Clash end".
- **[Silent]** Whether Fortress's "At natural expiry heal stored amount" can fire at the cap.

*Post-KO exceptions (B3).*
- REMAINING_DECISIONS.md:166–179 gives the immediate-KO rules 1–6. Rule 3 lists the exceptions: Falling Star/Faultline impacts with last pre-KO strength, Molten Brand's lethal eruption ("settle both knockouts before winner"), the Shared Burden current split, Mountain Shelter, Riptide Pursuit/Astral Strike continuation, Cinder Clamp release, and Second Spring.
- RULINGS_2026-11-07b.md:58–73 verifies each one and removes Riptide Pursuit from the list.
- Rule 6: "A side with no living monster loses at the end of the current hit's resolution, after simultaneous KOs are settled. A double KO goes to the existing seeded coin."
- **[Inference]** At exchange 30, a KO that empties a side ends the battle by knockout before the cap, as in legacy (t8 `settleHit` → `endCheck`, t8/engine.js:115–127).
- **[Silent]** Whether the remaining meteor hits of a Falling Star impact keep resolving after a side has already lost under rule 6.

*t8 core.* Provisional entry `exchange-cap`: "the battle ends after the 30th exchange. What happens to pending delayed impacts at the cap waits on D8; none exist in S1." (t8/values.js:34–35)

### 8.5 The D8 proposal (M4_PLAN.md:263–270)

> - Keep all three.
> - The ramp multiplies every direct-damage computation at its 8a step: normal and special attacks, reactions, counters, follow-ups, commanded attacks, and delayed impacts at the impact exchange. It does not affect Afflicted ticks, HP costs or HP transfers.
> - C6 scales every heal and shield grant. It does not affect HP transfers (Mind Mend, Root Communion) or revival (Second Spring is "not ordinary healing").
> - At the cap the battle ends and pending delayed impacts are discarded; no extra exchange.

The related D9 is approved (§25 item 9): "Applicable rotation, healing-cut and ramp modifiers multiply, and the result is rounded once."

---

## 13. Daybreak Lance and Clear Light (D13, open)

**Ruling status.** §25 item 13: "Open: show the conflicting text and the Progression values before applying any precedence decision." Neither contract carries a `values` object or a ruling tag in the generated Dex (`abilityById(...).values === undefined`). APPROVED_RULINGS has no rule naming either ability.

**Forms.** Both families have a single form:
- Aurelion has only Aurelion (stage 0).
- Lumen has only Lumen (stage 0).

"Form × mastery" is therefore mastery only.

| | Daybreak Lance (LIG-06-C, Aurelion, Light, legendary, Striker) | Clear Light (LIG-03-C, Lumen, Light, Support) |
|---|---|---|
| Mechanic summary (families/aurelion.md:80; lumen.md:82) | "Daybreak Lance: **160% normal damage**, standard evasion/shield/DR. …" | "Clear Light: Remove harmful status first, then **heal 10% maxHP**. …" |
| Core resolution (aurelion.md:94; lumen.md:96) | "**160% normal damage**, standard evasion/shield/DR. Suppress only ATTACK retaliation caused by this strike; passive damage auras and attached status responses still resolve. No skipped enemy normal turn." | "Remove harmful status first, then **heal 10% maxHP**. If status cannot be removed, no cast; no generic heal fallback." |
| Recharge / frequency (aurelion.md:98; lumen.md:100) | "Once per Clash, spent on launch even miss. Stunned preserves." | "Stunned source prevents; successful cleanse spends, even if healing capped." (no cooldown stated here) |
| Progression / notes (aurelion.md:114; lumen.md:116) | "Damage **145 / 160 / 175 / 190%** by mastery. Attack context needs suppress-retaliation flag without suppressing all afterHit effects." | "Heal **8 / 10 / 12 / 14%** by mastery; **cooldown 5 turns fixed**. Requires removable-status eligibility, atomic cleanse-before-heal and reserve target access." |

**Progression values (single form × 4 mastery tiers, tier order as listed):**

| Mastery tier | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Daybreak Lance damage | 145% | 160% | 175% | 190% |
| Clear Light heal | 8% | 10% | 12% | 14% |

**Where they conflict.**
1. **Daybreak Lance.** Core and the summary give one flat value, 160%. Progression gives a mastery ladder whose **second** tier is 160%. At tiers 1, 3 and 4 the two texts give different numbers (145, 175 and 190 against 160).
2. **Clear Light, heal.** Core and the summary give a flat 10%. Progression's ladder has 10% at its **second** tier. At tiers 1, 3 and 4 the texts give 8, 12 and 14 against 10.
3. **Clear Light, cooldown.** This is a gap rather than a numeric conflict. Only Progression states a recharge ("cooldown 5 turns fixed"). The Recharge/frequency section states none. **[Silent]** Neither section gives the turn unit; "5 turns" is not qualified as owner normal turns.

**Precedence background.**
- Spec §1, "Source precedence" (SPECIFICATION_BASELINE.md:39–42), item 2 approves "the final approved, versioned Beast Dex and its referenced ability details, **progression rows**, status definitions and individual exceptions." It does not rank Core against Progression.
- **[Silent]** No source resolves a Core-versus-Progression conflict inside one contract. (Stoke the Flame's Progression row explicitly supersedes its earlier text: ruling N7b P1, `supersededRule`. Neither of these two contracts has such a marker.)

**The proposal.** M4_PLAN.md:293–296 (D13): "the Progression ladders govern. The Core value is the Practiced tier." **[Inference]** "Practiced" is the plan's name for the second mastery tier, where both Core values sit.

---

## 14. Dawn Song (D14, open)

**Ruling status.** §25 item 14: "Open: show the approved target text and clarify whether the proposal means "self only" or "self included"."

**Approved contract.** LIG-02-C (Solchirp → Heliark, Light, common, Support), verbatim from the Dex (families/sunwhistle.md:101–137):
- **Trigger / eligibility (:109):** "Solchirp; common; K; Clash archetype Support → Support. Ready own normal action replaces attack if active front ally is injured and has empty status slot."
- **Targets / placement (:113):** "**Front ally, self only if actually front.**"
- **Core resolution (:117):** "Heal5 / 6 / 7 / 8% maxHP by mastery immediately, then same amount at end of NEXT2 owner normal turns. This is ability-linked healing schedule, not new status; empty status slot gates initial cast only."
- **Recharge / frequency (:121):** "Cooldown 6 owner turns fixed, cast turn excluded. Cannot stack own schedules on same target; eligible only if no Dawn Song schedule there."
- **Lifetime / persistence (:125):** "Reserve pauses future pulses; KO/actual Clash end cancels. Healing Reduced evaluated separately at each pulse."
- **Exceptions (:129):** "Different later status does not erase schedule. No cross-mode healing: discard pending pulses on football transition. No cleanse/revive."
- **Progression / notes (:137):** "Retain separately saved healing schedule outside shared status slot, with approved empty-slot requirement at cast. Heal immediately and at next2 owner-turn endpoints. Pause in reserve, clear knockout/football/actual Clash end. Keep approved5/6/7/8% healing by mastery."

**Related rulings.**
- P4, approved (APPROVAL_REGISTER.md:73; DECISION_PACKET_FINAL.md:132–143): Dawn Song is one of seven "Mastery-only values apply to every form". Solchirp and Heliark get the same 5/6/7/8%.
- RULINGS_2026-11-07b.md:87: Dawn Song "KO … cancels".
- **[Silent]** No ruling addresses the target.

**Why the target is in question.** Spec §1 (SPECIFICATION_BASELINE.md:15): "Preserve one active Clash fighter per side with reserves. Do not interpret opening 3v3 lineups as three simultaneous active fighters."
- Dawn Song is cast on Solchirp's "own normal action". Reserves never take normal actions (M4_PLAN R1).
- So the caster is always the active fighter, and there is no other "front ally".
- P9_VERIFIED_LIMITS.md:231 (A8): "'Front ally, self only if actually front'. With one active fighter per side, the casting Solchirp is the front, and it is unclear whose turns 'owner normal turns' means. I used the per-target cap (≤ N), which holds under either reading."

**"Self only" vs "self included."**
- **Self only.** The only legal recipient is the casting Solchirp/Heliark itself, because it is the only front ally at cast time.
  - **[Inference]** "Owner normal turns" and "target turns" are then the same monster's turns, so the pulses and the reserve pause track that one monster.
  - Per side, the number of schedules is bounded by the number of Solchirp/Heliark in the lineup, each on itself.
- **Self included.** The recipient pool would contain the caster plus other allies (for example reserves or a later active). The contract has no wording for that. It names only "Front ally", and Dawn Song has no reserve-target clause, unlike Glow Mend's "including reserves/self" or Clear Light's "including reserves".
  - **[Inference]** A schedule could still sit on another ally only if that ally were "front" when Solchirp casts. Under one active fighter that never happens.
- **The P9 lineup-size bound covers both readings.**
  - P9 (P9_VERIFIED_LIMITS.md:205): "Dawn Song heal schedules (LIG-02-C) | 'eligible only if no Dawn Song schedule there'; pulses 'at end of NEXT2 owner normal turns' | **≤ N = 5** (one per living ally); ≤ 2 pending pulses each, so ≤ 10 pending pulse events". :255 "5 per side / 10 total … (3 per side in 3v3)".
  - It is the approved diagnostic: spec §21 B4 and SPECIFICATION_BASELINE.md:651, "Dawn Song schedules up to lineup size per side".
  - That bound is a per-target cap: one schedule per living ally. It was chosen because it "holds under either reading". It does not imply that allies other than the caster can receive one.

**What the D14 proposal meant.** M4_PLAN.md:298–300:
> *The gap:* "active front ally ... self only if actually front". The caster is always the active fighter, so the only legal target is Solchirp itself.
> *Recommendation:* the target is the active Solchirp. Pulses run at the end of its next 2 owner normal turns and pause while it is in reserve. Confirm, because this makes Dawn Song a self-heal.

So the proposal means **self only**: Dawn Song becomes a self-heal on the caster. Its short list (M4_PLAN.md:424) says the same: "targets the active Solchirp itself; confirm."

---

## D16. Complete ability-kind table for owner review

**Ruling.** §25 item 16: "The complete table is presented for owner review before the first ability batch." APPROVAL_REGISTER.md:242 lists D16 as an "Approved process".

**Extra strike, the plan's definition, verbatim** (M4_PLAN.md:309):
> **Extra strike** = any damaging strike that is not the attacker's own normal-action attack (ordinary or special), and not delayed, DOT or transferred damage. That includes Twin Thunder bolts, Victory Surge, Arc Rebound, Riptide Pursuit, Stoke the Flame, Molten Brand eruptions, the Shadow Pounce counter, Rubble Reprisal, the Bank Shot ricochet, the Refraction secondary hit, the Canopy Assist strike and Astral commanded attacks.

**Stone Divide's own contract (EAR-05-C) for comparison:**
- Targets: "Includes Twin Thunder bolt, Victory Surge, Arc Rebound, Riptide Pursuit and attack-based retaliation."
- Mechanic: "cancels enemy follow-up or attack retaliation".
- Exceptions: "Ordinary attacks, normal-action specials, delayed meteors/fissures, DOT and transferred damage unaffected."

**The D5 ordinary-attack reading proposed by the plan** (M4_PLAN.md:246–249; D5 itself is approved in §25 item 5: "Striker shield-break and Disruptor pierce apply to ordinary attacks only … Explicit ability exceptions are preserved"):
> Striker shield-break ×2 and Disruptor pierce apply only to an **ordinary normal attack**: the plain attack, a Basic's attack, and contracts whose text keeps "normal attack identity" with no enhancement (Gear Shot, Mind Game's trick attack). Every enhanced/special attack, reaction, counter, follow-up, commanded, delayed and assist strike is excluded.

**What the plan classifies.**
- The plan gives kinds only as **build batches** (M4_PLAN.md:169–175). Pilots (S5): Falling Star = delayed, Shared Burden = reserve link / raw split. Batch A = "attack modifiers and enhanced attacks". B = "protection and self/team statuses". C = "healing and support". D = "reactions, counters, misses, survival". E = "rotation and lineup". F/G = "disruption, control and the second delayed attack".
- §3.6 (M4_PLAN.md:134–143) defines the per-row fields but assigns none:
  - action kind: normal-action replacement, conditional enhanced normal attack, passive, reaction, entry, reserve window, team action;
  - strike tags: ordinary, special, reaction, counter, commanded, follow-up, delayed, DOT, transfer.
- The table file `ability-kinds.js` was deferred (M4_STATUS.md:20).

**Reading the table.**
- The "Plan kind" column is the plan's batch, verbatim.
- The "Kind (finer)" column is **[Inference]**: my mapping onto the requested vocabulary, from the contract phrase quoted in the last column.
- "Ordinary (D5)" gives the plan's D5 reading for the strike the ability itself produces:
  - "n/a" means the ability produces no strike of its own; the owner's other attacks are unaffected.
  - "moot" means the owner's archetype has no offensive ordinary-only perk (Balanced, Tank, Support).
  - Tank guard is defensive, active-only, and not per-ability.
- "Extra strike" = Yes only where the plan's list names it. Other Yes/No values follow the definition text.

| # | Family | Ability | Element / archetype | Plan kind (batch) | Kind (finer) [Inference] | Ordinary attack for D5? | Extra strike? | Contract phrase | Review |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Flaroo (emberfox) | FIR-01-C Stoke the Flame | Fire / Balanced | D: reactions, counters, misses, survival | reaction/counter | No (reaction); moot | **Yes** (listed) | "immediate Fire counterburst outside normal turn"; "Counterburst is reaction damage; no reaction chain" | Stone Divide covers "attack-based retaliation"; the counterburst fits it. OK |
| 2 | Cindruff (ashkit) | FIR-02-C Cinder Clamp | Fire / Disruptor | E: rotation and lineup | rotation/lineup (mark on ordinary attack) | Yes: the grip rides a "normal direct attack", so pierce applies to that attack | No | "Successful normal direct attack … applies grip"; "this non-status grip does not occupy shared status slot" | OK |
| 3 | Pyronix (firestorm) | FIR-03-C Falling Star | Fire / Striker | S5 pilot (delayed) | delayed | No (delayed) | No (delayed excluded) | "Launch meteor in place of normal attack"; "Impact at end of following exchange after rotations" | OK |
| 4 | Scorchulk (cinderclaw) | FIR-04-C Molten Brand | Fire / Balanced | D | reaction (attached mark) | Brand rides an ordinary attack; eruption: No; moot | **Yes** (eruption, listed) | "Eruption is reaction damage and triggers no retaliation" | **Needs owner review**: Stone Divide names "attack-based retaliation"; whether a mark-triggered eruption counts is not stated in EAR-05-C |
| 5 | Flarynx (pyrelynx) | FIR-05-C Heat Mirage | Fire / Tank | D | explicit miss (entry decoy) | n/a | No | "Entry decoy; probabilistic whole-attack evasion"; "creation is automatic entry effect, not action" | OK |
| 6 | Pyroclast (pyroclast) | FIR-06-C Faultline | Fire / Disruptor | F/G (second delayed attack) | delayed + disruption (Healing Reduced 100%) | No (delayed) | No | "Create fissure instead of normal attack; erupt at end of following exchange" | OK |
| 7 | Aquip (tidepaw) | WAT-01-C Second Tide | Water / Support | C: healing and support | heal (surplus → Shielded) | n/a | No | "Every second own normal turn … replaces attack"; "Restore missing HP; 100% remaining surplus attempts Shielded" | OK |
| 8 | Muddlet (mudcub) | WAT-02-C Shared Burden | Water / Tank | S5 pilot (reserve link, raw split) | split (reserve protection) | n/a | No (transferred) | "creates link INSTEAD of attack"; "Split RAW attack"; "Transferred share not direct attack" | OK |
| 9 | Crustank (reefclaw) | WAT-03-C Shell Renewal | Water / Tank | B: protection and self/team statuses | passive (self-cleanse) | n/a | No | "Automatic and can trigger while Stunned"; "Remove removable harmful status" | **Needs owner review**: a self-cleanse placed in "protection" (fits loosely) |
| 10 | Ripplet (tidefin) | WAT-04-C Wash Away | Water / Disruptor | F/G | disruption (benefit strip) | n/a | No | "Non-damaging utility replaces attack" | OK |
| 11 | Tideram (wavehorn) | WAT-05-C Riptide Charge | Water / Balanced | E | enhanced attack + forced rotation | No (charged special); moot | No | "Every SECOND performed normal attack becomes charged"; "send into reserve and opposing team chooses living replacement" | OK (an enhanced attack placed in rotation) |
| 12 | Tsunarok (tsunarok) | WAT-06-C Riptide Pursuit | Water / Disruptor | E | reaction (rotation-triggered strike) | No (reaction) | **Yes** (listed) | "Undodgeable reaction punishes voluntary enemy departure"; "Costs no normal action" | OK |
| 13 | Spriglet (thornkit) | NAT-01-C Second Spring | Nature / Support | C | revive | n/a | No | "Replace attack; restore max-HP percentage"; "Distinct revival NOT ordinary healing" | OK |
| 14 | Mossmaw (mossclaw) | NAT-02-C Spore Detonation | Nature / Balanced | A: attack modifiers and enhanced attacks | enhanced attack (consumes status) | No (enhanced); moot | No | "+10% per remaining turn … max3 counted turns"; "remove entire harmful status" | OK |
| 15 | Bramblet (rootram) | NAT-03-C Last Root | Nature / Tank | D | passive survival (pre-KO) | n/a | No | "Set surviving HP to ONE instead of KO"; "active OR reserve" | OK |
| 16 | Florant (leafhorn) | NAT-04-C Canopy Assist | Nature / Support | E | commanded reserve assist (support) | No ("No … offensive archetype perks") | **Yes** (listed) | "Replace Florant attack; assist basic damage 75/80/85/90%"; "Reserve ally attacks without active entry or extra normal turn" | **Needs owner review**: (1) placed in rotation/lineup although no rotation occurs; (2) the strike replaces Florant's normal action, so it may be a "normal-action special", which Stone Divide excludes |
| 17 | Thornback (thornback) | NAT-05-C Shell Harvest | Nature / Tank | B | protection (entry shield) + heal on departure | n/a | No | "ONCE first ACTIVE entry attempts Shielded"; "Successful voluntary departure … heals100% of eligible remaining Shield HP" | OK |
| 18 | Elderoot (elderoot) | NAT-06-C Root Communion | Nature / Support | C | transfer (HP redistribution) | n/a | No | "Redistribute current HP toward target simultaneously. Contributions not attacks" | OK |
| 19 | Zippit (flicker) | ELE-01-C Lightning Rod | Electric / Support | C | transfer (status) | n/a | No | "Transfer reserve ally harmful status to self"; "no action replacement or extra turn" | OK |
| 20 | Volcoil (voltfin) | ELE-02-C Arc Rebound | Electric / Balanced | D | reaction (miss redirection) | No (explicit) | **Yes** (listed) | "Rebound is reaction damage: no … ordinary-only offensive archetype perks" | OK |
| 21 | Zappard (voltfang) | ELE-03-C Phase Strike | Electric / Striker | A | enhanced attack (shield bypass) | No (explicit) | No | "No ordinary-only Striker shield-break perk on this special" | OK |
| 22 | Statyx (stormlynx) | ELE-04-C Circuit Breaker | Electric / Disruptor | F/G | disruption (cooldown extension) on a special attack | No (special, per D5 reading) | No | "automatically replace normal attack"; "Deal 100% / 110% / 120% / 130% normal attack damage" | **Needs owner review**: the contract is silent on pierce; at tier 1 the hit is 100%, the same as an ordinary attack |
| 23 | Joltrex (joltrex) | ELE-05-C Victory Surge | Electric / Striker | D | follow-up | No (explicit) | **Yes** (listed) | "Follow-up grants no normal turn, attack-counter progress or ordinary-only archetype perks" | OK. Its trigger needs "an ordinary normal attack", which reads the same D5 table |
| 24 | Voltarch (stormcrown) | ELE-06-C Twin Thunder | Electric / Striker | D | construct | Bolts: No (explicit) | **Yes** (listed) | "summoning two guards"; "Bolts grant no extra turn … or ordinary-only archetype perks" | OK |
| 25 | Pebblit (pebble) | EAR-01-C Emergency Cover | Earth / Tank | D | protection (reserve lethal redirect / transfer) | n/a | No (transferred) | "Redirect DAMAGE ONLY to reserve source"; "NO active-only Tank guard in reserve" | OK |
| 26 | Craggo (rockram) | EAR-02-C Rubble Reprisal | Earth / Balanced | D | reaction (healing-triggered) | No (explicit "ordinary-only perks") | **Yes** (listed) | "Active source reacts after enemy healing with one rock attack" | **Needs owner review**: not a "follow-up or attack retaliation" in Stone Divide's wording (it is triggered by healing, not by an attack) |
| 27 | Bouldrox (boulderox) | EAR-03-C Unbroken Charge | Earth / Tank | D | enhanced attack (armed by a Stunned skip; undodgeable) | No (explicit); moot | No | "Costs next performed normal action"; "No ordinary-only archetype perks" | **Needs owner review**: an enhanced attack placed in reactions/survival |
| 28 | Granigor (stoneguard) | EAR-04-C Bank Shot | Earth / Striker | A | enhanced attack + ricochet | No (explicit, both hits) | **Yes** (ricochet, listed) | "Neither hit receives ordinary-only Striker perks"; "No additional normal action for bounce" | **Needs owner review**: the ricochet happens inside Granigor's normal action. Plan D16 calls it an extra strike; Stone Divide excludes "normal-action specials" |
| 29 | Terrabull (terrabull) | EAR-05-C Stone Divide | Earth / Disruptor | D | reaction (extra-strike denial) | n/a | No | "intercept first eligible enemy extra strike"; "Ordinary attacks, normal-action specials, delayed meteors/fissures, DOT and transferred damage unaffected" | It is the consumer of this column |
| 30 | Titanolith (titanolith) | EAR-06-C Mountain Shelter | Earth / Tank | B | protection (team Guarded, override) | n/a | No | "replace normal action"; "EVERY living teammate … GUARANTEED"; "REPLACE existing harmful or beneficial status" | OK |
| 31 | Flurrit (snowmoth) | ICE-01-C Fresh Start | Ice / Support | C | support (ally cooldown reduction) | n/a | No | "Replace attack to reduce longest-running other ally ability cooldown" | OK |
| 32 | Frostpup (hailfang) | ICE-02-C Cold Welcome | Ice / Disruptor | E | disruption (Slowed on enemy voluntary entry) | n/a | No | "Incoming enemy after entry effects receives attempted Slowed"; "No damage" | OK |
| 33 | Cryolynx (frostclaw) | ICE-03-C Snowbank Shot | Ice / Balanced | B | enhanced attack + explicit miss (80% launch) + Shielded fallback | No (explicit); moot | No | "80% LAUNCH accuracy check first"; "Connected damage 130% normal"; "No … ordinary-only archetype perks" | **Needs owner review**: placed in protection, but the core is an enhanced attack, and R6 counts it as an explicit miss source |
| 34 | Glaciram (icehorn) | ICE-04-C Snowdrift Shelter | Ice / Tank | B | protection (self Guarded) | n/a | No | "Sacrifice attack for one-next-owner-turn self Guarded shelter" | OK |
| 35 | Shardok (glaciron) | ICE-05-C Glacier Wall | Ice / Tank | B | protection (entry shield + once rebuild) | n/a | No | "First ACTIVE entry … attempts Shielded worth 20%"; "once-only smaller rebuild" | OK |
| 36 | Glacivern (glacivern) | ICE-06-C Deep Winter | Ice / Disruptor | F/G | disruption/control (countdown freeze) | n/a | No | "Freeze EXPIRATION countdown for next TWO recipient normal turns" | OK |
| 37 | Gustling (gustling) | WIN-01-C Feather Relay | Wind / Support | E | rotation/lineup (reserve team action) + heal | n/a | No | "This SUPPORT ACTION replaces team attack"; "Rotate, then heal DEPARTING ally" | D3 ruled conditionally (§25 item 3) |
| 38 | Zephyroo (breezefang) | WIN-02-C Gust Hop | Wind / Balanced | A | enhanced attack (two hits) | No (explicit); moot | No ("one performed attack") | "Every third performed attack becomes two independently evadable same-target hits"; "no ordinary-only archetype perks on special hits" | **Needs owner review**: the plan's extra-strike list omits the second hit, consistent with "one performed attack"; confirm |
| 39 | Aeralis (skywarden) | WIN-03-C Downdraft | Wind / Disruptor | E | rotation/lineup (forced swap) + Weakened | n/a | No | "Normal action swaps enemy active with first reserve then attempts incoming Weakened" | OK |
| 40 | Galyx (windlynx) | WIN-04-C Second Wind | Wind / Support | E | support (reserve initiative window) | n/a | No | "Once reserve support moves active ally existing second action before enemy"; "NO extra action" | **Needs owner review**: placed in rotation/lineup although it changes initiative and no rotation occurs |
| 41 | Zephiro (zephyr) | WIN-05-C Tailwind Pact | Wind / Support | B | support (team Empowered) | n/a | No | "Once normal action attempts gated team Empowered" | OK |
| 42 | Tempestra (tempestra) | WIN-06-C Eye of the Storm | Wind / Disruptor | F/G | disruption/control (signature restriction) | n/a | No | "temporarily restricts enemy active to ordinary attacks"; "if enemy front active has a ready, repeatable signature" | It consumes the table's "repeatable signature" field |
| 43 | Umbrikit (shadowkit) | DAR-01-C Shadow Pounce | Dark / Balanced | D | explicit miss (15/20%) + counter | Counter: No (explicit) | **Yes** (counter, listed) | "not ordinary attack for archetype perks"; "explicit 15% / 20% chance to miss entirely" | OK |
| 44 | Noctlet (nightowl) | DAR-02-C Night Swoop | Dark / Striker | A | enhanced attack (first attack, priority) | No (enhanced, per D5 reading) | No | "Resolve this first normal attack before opponents … at 110 / 120% normal damage" | **Needs owner review**: the contract is silent on Striker perks; the plan's reading excludes them |
| 45 | Duskyre (duskrunner) | DAR-03-C Predator Rhythm | Dark / Striker | A | attack modifier (third-strike enhancement) | Strikes 1–2 Yes; strike 3 No (per D5 reading) | No | "Third strike deals140 / 150 / 160 / 170% normal damage" | **Needs owner review**: the contract is silent on perks |
| 46 | Murklaw (mireclaw) | DAR-04-C Ambush | Dark / Striker | A | enhanced attack (armed on first entry) | No (explicit) | No | "Boost is special attack, no ordinary-only archetype stacking" | OK |
| 47 | Nocturne (nocturne) | DAR-05-C Eclipse Call | Dark / Disruptor | F/G | disruption (reserve start-of-round Confused) | n/a | No | "From reserve … at the first eligible start-of-round opportunity"; "No damage or extra attack" | OK |
| 48 | Nyxshade (nyxshade) | DAR-06-C Eclipse Theft | Dark / Disruptor | F/G | transfer (benefit steal) | n/a | No | "spends its own normal action … to steal an eligible opposing active fighter benefit" | OK |
| 49 | Lumini (glimmer) | LIG-01-C Glow Mend | Light / Support | C | heal (two allies) | n/a | No | "Ready own normal action replaces attack"; "Heal each 7 / 10%" | OK |
| 50 | Solchirp (sunwhistle) | LIG-02-C Dawn Song | Light / Support | C | heal (immediate + schedule) | n/a | No | "ability-linked healing schedule, not new status" | Target open (D14) |
| 51 | Lumen (lumen) | LIG-03-C Clear Light | Light / Support | C | heal + cleanse | n/a | No | "Remove harmful status first, then heal" | Values open (D13) |
| 52 | Prismara (prism) | LIG-04-C Refraction | Light / Disruptor | A | enhanced attack (primary + reserve secondary) | No (explicit "No ordinary-only archetype bonus") | **Yes** (secondary, listed) | "Primary100% normal attack, then secondary30/40/50/60% … against first living reserve" | **Needs owner review**: same issue as Bank Shot; the secondary is part of a normal-action special |
| 53 | Haloryx (halofang) | LIG-05-C Radiant Pursuit | Light / Striker | A | attack modifier (conditional, below 35%) | Plan: No (enhanced) | No | "Passive conditional attack"; Progression: "retain normal-attack identity for ordinary archetype perks only where global perk policy permits (G06)" | **Needs owner review**: the contract leaves Striker shield-break open (G06); the D5 proposal's exclusion of "every enhanced" attack would deny it |
| 54 | Aurelion (aurelion) | LIG-06-C Daybreak Lance | Light / Striker | A | enhanced attack (once; suppresses retaliation) | No (special, per D5 reading) | No | "Once per Clash on own ready normal action; replaces attack"; "Suppress only ATTACK retaliation" | **Needs owner review**: the contract is silent on perks; damage value open (D13) |
| 55 | Ferrcub (ironcub) | MET-01-C Forge Swipe | Metal / Balanced | B | self status (Empowered after every third attack) | Yes, the attack is ordinary ("No instant bonus on triggering attack"); moot | No | "Every third performed normal attack attempts self Empowered AFTER full attack resolves" | OK |
| 56 | Steelpaw (steelpaw) | MET-02-C Tempered Guard | Metal / Tank | B | protection (self Guarded + hit cap) | n/a | No | "Attempt Guarded25 / 30 / 35 / 40%"; "enemy direct HP hit cannot exceed30% maxHP" | OK |
| 57 | Coglet (gearwing) | MET-03-C Gear Shot | Metal / Balanced | A | passive attack modifier (variance floor) | Yes (named in D5 as ordinary); moot | No | "Every performed normal attack"; "Passive no cooldown; no extra attack or status" | OK |
| 58 | Ferronox (ironjaw) | MET-04-C Iron Bite | Metal / Striker | A | enhanced attack (shield multiplier) | No (plan §5c: "Iron Bite is a special, so it gets no Striker ×2") | No | "Ready own normal action replaces attack if enemy active has Shielded"; "120% normal damage. Shield multiplier1.5/1.75/2/2.25" | **Needs owner review**: the contract is silent on the Striker perk; the plan (§5c) gives the reading |
| 59 | Ferrhorn (metalhorn) | MET-05-C Shield Wall | Metal / Support | B | protection (reserve-ally Shielded) | n/a | No | "Ready own normal action replaces attack when a living RESERVE ally has empty status slot" | OK |
| 60 | Aegistron (aegistron) | MET-06-C Fortress | Metal / Tank | B | protection (Guarded 50%) + delayed self-heal on expiry | n/a | No | "store prevented HP damage up to20% maxHP. At natural expiry heal stored amount" | OK |
| 61 | Psyflutter (mindwing) | PSY-01-C Mind Mend | Psychic / Support | C | transfer (HP donation) | n/a | No | "replace attack to donate own HP to an injured living teammate" | OK |
| 62 | Wispira (shadewisp) | PSY-02-C Mirage Veil | Psychic / Tank | B | protection (reactive self Guarded) | n/a | No | "Two completed enemy direct normal attacks … damage source HP"; "Attempt Guarded 25 / 30 / 35 / 40%" | OK (reactive trigger, no strike) |
| 63 | Cerebrix (cerebrix) | PSY-03-C Foresight | Psychic / Disruptor | F/G | disruption (status reflection) | n/a | No | "prepare psychic mirror, replacing attack"; "redirect one application to its caster" | OK |
| 64 | Echolot (echolot) | PSY-04-C Echo Strike | Psychic / Balanced | A | enhanced attack (stored-hit bonus) | No (enhanced); moot (Balanced) | No | "This is one enhanced normal attack, not separate bonus hit. Shared ordinary-only perk policy remains subject to final global reconciliation." | Moot in practice (Balanced has no offensive perk); the contract defers to reconciliation |
| 65 | Enigmane (enigmane) | PSY-05-C Mind Game | Psychic / Disruptor | D | explicit miss (15%) + attack modifier (Confused on next attack) | Plan: Yes (D5 names "Mind Game's trick attack" ordinary) | No | "Base attack normal damage"; "Exact enhanced/ordinary archetype policy follows final shared reconciliation" | **Needs owner review**: Disruptor pierce depends on it; the contract defers to "final shared reconciliation" |
| 66 | Astralux (astralux) | PSY-06-C Astral Strike | Psychic / Striker | F/G | commanded attacks + own attack | Commanded: No; own 100% attack: [Silent] in the plan; the contract calls it "100% ordinary normal attack" | **Yes** (commanded, listed) | "command every eligible living enemy reserve to basic-attack their own active teammate, then perform Astralux own attack"; "Commanded attacks cannot activate signatures, counters or extra-attack chains" | **Needs owner review**: (1) whether Astralux's own follow-on attack gets the Striker perk (the D5 proposal does not say); (2) the commanded attacks sit inside Astralux's normal action, the same normal-action-special question as Bank Shot; (3) the plan lists F/G as "the second delayed attack", but Astral Strike is not delayed (that is Faultline) |
| 67 | Drakling (drakeling) | DRA-01-C Dragon Pounce | Dragon / Striker | A | enhanced attack (HP cost) | No (explicit) | No | "Exclude ordinary-only Striker bonuses" | OK |
| 68 | Wyrmlet (wyrmkit) | DRA-02-C Coil Renewal | Dragon / Support | C | heal (on every third damaging attack) | Yes, "Trigger attack ordinary damage"; moot | No | "Every third performed normal-action attack with positive direct enemy HP damage triggers ally healing" | OK |
| 69 | Sablewing (sablewing) | DRA-03-C Wing Shelter | Dragon / Balanced | C | heal (reactive self) | n/a | No | "after surviving complete direct enemy attack removing at least 20% … restore 4/6/8/10%"; "Automatic recovery preserves normal action" | OK |
| 70 | Scalor (scaleguard) | DRA-04-C Dragonhide | Dragon / Balanced | B | protection (entry Guarded) + enhanced attack (conversion) | Conversion: No (explicit); moot | No | "First active entry … attempts own Guarded"; "Convert full Guarded percentage into damage bonus"; "ordinary-only archetype attack bonuses excluded" | **Needs owner review**: dual kind; placed in B, but the payoff is an enhanced attack |
| 71 | Vyrnax (vyrnax) | DRA-05-C Dragon Roar | Dragon / Striker | A | enhanced attack + Weakened | No (explicit) | No | "Exclude ordinary-only Striker bonuses" | OK |
| 72 | Aurodrax (aurodrax) | DRA-06-C Sovereign Balance | Dragon / Balanced | A | enhanced attack (high HP) / protection (low HP Guarded) | No (explicit); moot | No | "HighHP attack130/140/150/160% normal. LowHP replaces attack with Guarded" | **Needs owner review**: dual kind; the low-HP branch is protection |

**Counts.**
- Batches: S5 pilots 2, A 16, B 13, C 11, D 13, E 8, F/G 9, for 72 in total. This matches M4_PLAN.md:170–175.
- Extra strikes: 12 rows marked Yes, exactly the plan's list. Rows 4, 16, 26, 28, 52 and 66 are flagged against Stone Divide's narrower wording.

**Questions the owner may want to settle with the table** (restated from the sources; no new rules):
1. Does Stone Divide's "normal-action specials … unaffected" exclude the Bank Shot ricochet, the Refraction secondary, the Canopy Assist strike and the Astral commanded attacks, which the plan's extra-strike list includes?
2. Do Molten Brand's eruption and Rubble Reprisal count as "attack-based retaliation"?
3. On D5, should these get the ordinary-only perks: Radiant Pursuit (G06 left open), Mind Game's trick attack (pierce), Astralux's own 100% attack, and the silent-contract Striker/Disruptor specials (Night Swoop, Predator Rhythm strike 3, Daybreak Lance, Iron Bite, Circuit Breaker)?
