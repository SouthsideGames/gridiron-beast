# M4 decisions pending

> Follow-up: N9c A/B/C/E/G/H are implemented on `codex/task8-presentation-followup`. Perk identity, Dawn Song caster targeting, voluntary Feather Relay interactions, Clear Light owner-turn cooldown and active-position delayed targeting are resolved. The historical rows below may still name those gates; `ABILITY_COMPLETION_MATRIX.md` and `CODEX_APPROVED_CLASH_FOLLOWUP.md` identify the remaining unresolved points. No other decisions were approved.

One line per open point or provisional reading. Branch `task8-m4-core`.

**How these are isolated (owner ruling 2026-11-09 01:03, rule 1).**
- In normal gameplay (`config.provisional` off, the default), an ability that reaches one of the points in part A does not activate. It logs `unmet: awaiting ruling (<point>)` and keeps its use.
- The readings run only with `config.provisional: 'on'`: in reviewer scenarios marked `provisional` and in `tests/clash/t8-provisional-*.test.js`. Those cases are labelled PROVISIONAL and are not part of the acceptance set.
- Code: `src/clash/t8/flags.js` (`PROVISIONAL_POINTS`, `T8_FLAGS`). A ruling is a one-line change there.

## A. Points that gate an ability (awaiting ruling in normal gameplay)

| Point | Question | Recommended default (provisional mode) | Abilities affected |
|---|---|---|---|
| `d13-values` | Core flat value or Progression ladder? Gated only at the tiers where the two differ (both give the Core value at Practiced) | Progression (145/160/175/190%; heal 8/10/12/14%) | Daybreak Lance (LIG-06-C), Clear Light (LIG-03-C) |
| `forge-swipe-duration` | Core "for 2 owner normal turns" or Progression "Duration 1 / 2 / 2 / 3 turns by mastery"? Gated at Developing and Mastered | Progression | Forge Swipe (MET-01-C) |
| `fortress-storage-cap` | Core "up to 20% maxHP" or Progression "Storage cap 10 / 15 / 20 / 25% maxHP"? Gated at every tier but Expert | Progression | Fortress (MET-06-C) |
| `clear-light-cooldown-unit` | "cooldown 5 turns fixed": whose turns? | Owner normal turns | Clear Light (LIG-03-C) |
| `d14-dawn-song-target` | "Self only" or "self included"? Under one active fighter both give the caster | The active caster itself | Dawn Song (LIG-02-C) |
| `d5-perk` | Do the ordinary-only perks apply to these strikes? It matters only for a Striker against a Shielded target, or a Disruptor against an active Tank | Special (no perk), except Mind Game's trick attack (ordinary) | Radiant Pursuit (LIG-05-C), Mind Game (PSY-05-C), Night Swoop (DAR-02-C), Predator Rhythm (DAR-03-C, 3rd strike), Daybreak Lance (LIG-06-C), Iron Bite (MET-04-C, always decisive in those pairings), Circuit Breaker (ELE-04-C). Astral Strike's own attack (PSY-06-C) is literally "ordinary" and is not gated |
| `stone-divide-scope` | Does Stone Divide intercept normal-action special strikes and non-attack-triggered reactions? | Yes (the plan's extra-strike list) | Stone Divide (EAR-05-C), against Bank Shot ricochet, Refraction secondary, Canopy Assist, Astral commanded attacks, Molten Brand eruption, Rubble Reprisal. For commanded strikes, "enemy" is read as the ability's owner |
| `delayed-slot` | "Lineup position, not identity" against "Empty main slot", when the launch target is no longer active at impact | The active position (the new occupant takes the main hit) | Falling Star (FIR-03-C), Faultline (FIR-06-C) |
| `d8-cap-delayed` | A delayed impact still pending at the exchange cap | Discarded | Falling Star, Faultline |
| `feather-relay-voluntary` | Is a Feather Relay rotation "voluntary" for the enemy and owner rotation triggers? The contract is silent | Voluntary (plan D3) | Feather Relay (WIN-01-C), Cinder Clamp (FIR-02-C), Riptide Pursuit (WAT-06-C), Cold Welcome (ICE-02-C), Shell Harvest (NAT-05-C) |

## B. Engine defaults with no "off" state

A battle cannot run without some rule here, so each one keeps the default named in `T8_PROVISIONAL`. Each is listed for a ruling.

| Id | Default | Abilities affected |
|---|---|---|
| D8 ramp / C6 / cap (`sudden-death-scope`, `stalemate-c6-scope`, `exchange-cap`) | Values 1.1.0 ramp on direct strikes; C6 on heals and shields; cap 30 with HP share | All |
| D6 Tank bruise (`tank-bruise-not-implemented`) | Not implemented | Every Tank |
| `ko-replacement-line-order` | First living reserve in stable lineup order | All |
| `d4-protected-turn-hold` (Stunned countdown) | The protected turn holds Stunned's remaining duration | Unbroken Charge; anything Stunned by carry-over |
| `initiative-tie-band` | Speeds closer than 2 are a tie (coin) | All |
| `application-turn-in-clash` | A status applied outside the recipient's turn counts its next turn | Every status producer |
| `multi-hit-target-ko` | Remaining hits are cancelled when the target is knocked out | Gust Hop |
| `reaction-order`, `reaction-chains`, `retaliation-suppression-scope` | Recipients first, then stable id; no chains; a suppressed strike refuses other monsters' strikes only | All reactions |
| `performed-attack-at-launch` | An attack counts as performed when it launches | Riptide Charge, Gust Hop, Refraction, Forge Swipe, Coil Renewal, Night Swoop, Dragon Roar |
| `healed-hook-kinds` | Heals and Mind Mend donations trigger Rubble Reprisal; redistribution, revival and HP cost do not | Rubble Reprisal |
| `molten-brand-vs-suppression` | A Molten Brand eruption on a Daybreak Lance strike is suppressed as attack retaliation | Molten Brand, Daybreak Lance |
| `retaliation-suppression-scope` | A suppressed or reaction strike refuses other monsters' reaction strikes; heals, statuses and the attacker's own follow-ups still resolve | Daybreak Lance; all reactions |
| `heat-mirage-roll-tags` | The decoy rolls against normal-action and delayed attacks; follow-ups, commanded and assist strikes do not roll | Heat Mirage |
| `second-wind-vs-interrupt` | Second Wind moves its ally past a priority tier, not past an interrupt | Second Wind |
| `riptide-replacement-choice` | "Opposing team chooses" the replacement: the first living reserve (a player prompt is S13/S14 work) | Riptide Charge |
| `relay-turn-counts` | The active ally's relay turn counts as its normal turn | Feather Relay |
| `delayed-slot-active-position` | The reading behind the `delayed-slot` gate (part A) | Falling Star, Faultline |
| `hit-cap-floor`, `transfers-no-p8-c6`, `p8-status-chances-none`, `post-ko-exceptions-n7c` | Tempered Guard cap is floor(30%); HP transfers take no P8 or C6 factor; P8 halves no Clash chance; B3 post-KO list is the N7c eight | Tempered Guard; Mind Mend, Root Communion; none; Riptide Pursuit |
| `afflicted-tick-*`, `shield-*`, `lineup-order-stable`, `p8-*`, `ai-visible-information`, `rotation-hook-order`, `deep-winter-freeze-counts-protected-turn` | See `T8_PROVISIONAL` (S2–S4 readings) | Various |

## C. Rulings applied (not pending)

- **Feather Relay (D3, reconciled 2026-11-09).** A rotation without the P8 penalty. Locks, legal availability and the 4-exchange cadence apply. It acts at the team's normal action when the active ally is below 50% HP. It heals the departing ally 8/10/12% by form, and the team makes no normal attack that turn. Built at S10. Only its "voluntary" status for the four trigger abilities is pending (part A). The conflict analysis, with quotes, is in `M4_STATUS.md` (D3 section). No conflict between the ruling and WIN-01-C was found. The ruling overrides P8's rotation-phase timing for this ability.

## D. Classification rows with no behaviour change

- **Tank bruise (D6, rule 3).** Pending and not implemented.

These rows were marked "needs owner review" in the D16 table but are implemented from the contract text, so no ruling changes how they play:

- Shell Renewal
- Snowbank Shot
- Gust Hop (one performed attack; not an extra strike)
- Second Wind
- Unbroken Charge
- Dragonhide
- Sovereign Balance
- Canopy Assist's batch placement
- Echo Strike

The Stone Divide question for the contested strikes is in part A.

## E. Readings found during the batches (implemented literally; no gate)

- **Wash Away (WAT-04-C), "normal evasion".** No miss source applies under one active fighter (plan §5a), so the clause never fires.
- **Circuit Breaker (ELE-04-C), "ready".** Read as "no running cooldown".
- **Deep Winter (ICE-06-C).** The freeze counts the D4 protected turn (`deep-winter-freeze-counts-protected-turn`).
