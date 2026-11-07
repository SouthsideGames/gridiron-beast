# Phase 1 / D: Presentation, Ability Reviewers, Settings (inventory)

Repo: /home/claude/gridiron-beast, read-only. The working tree was clean. HEAD read as 816b572 at the start and 73e762f at the end (other agents may be committing). All `src/` citations were read from the working tree.
Spec: docs/beast-dex/SPECIFICATION_BASELINE.md §5 (l.129-143), §6 (l.145-186), §10 (l.376-393), §12 (l.437-448), §13 (l.450-459), §14 (l.461-471), §15 (l.473-480).

Headline counts:
- The current game has 72 species (`SPECIES_DEX`). 48 have a football signature `ability`. The other 24 commons have a shared `trait`, drawn from 10 traits.
- `CLASH_MOVES` has 72 moves (src/data/clash-moves.js:10).
- The spec target is 144 mode abilities: docs/beast-dex/data/abilities.json has 72 Football and 72 Beast Clash entries, keyed by `familyId` and `mode`.
- docs/beast-dex/data/forms.json has 222 forms. It includes the 120 Basics, which have no unique abilities (BASIC_CREATION_BRIEF.md:26,66).
- The football ability names in abilities.json differ from the shipped ones. For example, emberfox is "Blazing Resolve" in the data and has the `quick_feet` trait in game. So the football reviewer catalogue must be rebuilt from new data, not extended.

---

## 1. Existing football Ability Reviewer ("Ability Audit")

### Current
- **Entry point.** Developer Tools menu button at src/ui/screens/menu.js:139 (`ability-audit`). The screen is registered at src/ui/screens/ability-audit.js:156.
- **What it enumerates.**
  - `entries = SPECIES_DEX.map(auditEntry)` (ability-audit.js:153) covers all 72 species.
  - `auditEntry` picks the `ability`, or falls back to the `TRAITS[sp.trait]` (ability-audit.js:55-61).
  - Only `eff.kind === 'ability'` rows (48) get Staged/In-play buttons and review controls (ability-audit.js:159,181).
  - The review queue uses `REVIEWABLE_ABILITIES = SPECIES_DEX.filter(sp => sp.ability)`, which is 48 (src/ui/dev-review.js:21).
  - Plays are also reviewed through `REVIEWABLE_PLAYS` (dev-review.js:22).
  - There is no Clash move and no form, stage or mastery variant. One entry per species, at the species' own position only (ability-audit.js:134 "one position per species").
- **The effect is classified by its first non-passive effect key.** The key maps to one of 7 FX families: move, block, contact, throw, cover, aura, passive (ability-fx.js:26-40 `FAMILY_OF`). Hook descriptions are hand-written in `HOOKS` (ability-audit.js:30-50).
- **Two preview modes.**
  - **Staged** (`stagedSim`, ability-audit.js:67-128).
    - Builds *synthetic* frames: 24 frames at 10 fps, with a subject S, opponent T and teammate U. It uses one scripted choreography per FX family, plus synthetic `ability` and outcome events.
    - It is not the engine. The header admits "the staged scene is synthetic frames only" (ability-audit.js:7).
    - This is the same path as the player-facing "See it" preview (`openAbilityPreview`, ability-audit.js:242-264). That preview is used by the roster (roster.js:165), the Dex (dex.js:64) and scouting.
    - **This violates §13, "cannot ... simulate fake visuals unrelated to gameplay".**
  - **In play** (`findActivation`, ability-audit.js:131-149).
    - Runs the real `simulatePlay` up to 80 times, with fixed `createRng(11)`, seeds 100+i, quality-76 generated monsters, hard-coded play lists per family, ballOn 35 and Q4 memory. It stops when an `ability` event from the subject slot appears.
    - There is no scenario control: target conditions, statuses, obstacles and charge state cannot be set.
    - On failure it shows a "did not fire in 80 tries" sheet (ability-audit.js:214).
- **Rendering.**
  - Both modes use the real `fieldSvg` (src/ui/field-view.js:28) and `buildFx` (src/ui/ability-fx.js:93), with signature looks from `SIG` (src/ui/ability-sigs.js:41).
  - Quality is only `app.settings.reducedMotion ? 'min' : 'full'` (ability-audit.js:220). There is no quality picker, though fxSvg supports `'full'|'low'|'min'` (ability-fx.js:140-142).
  - The loop uses rAF with `ms = 100 / speed`. It holds 10 frames, then loops (ability-audit.js:225-233).
  - An event log of ability and outcome events is shown under the field (ability-audit.js:221).
- **Controls offered.**
  - Status filter chips (all, to review, approved, waiting on dev, card mismatch, new cards) and element filter chips (ability-audit.js:27,172-173).
  - Staged and In-play buttons.
  - Review buttons: Looks good, Needs work, Note, plus a "gameplay change" checkbox, a card-mismatch toggle and a proposed-card approve/reject (dev-review.js:100-113,150-158).
  - Copy notes (ability-audit.js:190).
  - Missing: no replay or reset button (it only auto-loops), no scrub or step, no seed control, no monster, form or mastery selection, no team selection, no inspection of hitboxes or targets, no readiness or cooldown view.
- **Review persistence.**
  - src/franchise/review-store.js keeps the localStorage keys `gridiron-beast-ability-reviews` and `gridiron-beast-play-reviews` (review-store.js:11). It mirrors them to the artifact DB collections `ability_reviews/<id>` and `play_reviews/<id>` through `cloudSaveReview` and `cloudLoadReviews` (src/franchise/cloud-save.js:364,369). Newest `updatedAt` wins (review-store.js:38-44).
  - Each review stores a fingerprint `fp` (review-store.js:52-66).
  - States are new, changed, updated, approved and needs_work, computed from the fingerprint (dev-review.js:36-43). `abilityFingerprint` hashes the ability, element, ELEMENT_FX, family, FX_REVISION and SIG_REV (dev-review.js:24-27).
  - The queue feeds the menu badges (dev-review.js:47-52,76) and a one-time toast (dev-review.js:83-97, localStorage `gridiron-beast-review-announced`).
  - Card mismatches come from `CARD_CHECK` and `CARD_PROPOSALS` (src/data/card-check.js).
  - Reviews are keyed by species id only, in two namespaces: `ability` and `play`.
- **Related dev tools that also use the real engine and renderer.** None of them is an ability reviewer.
  - **Practice Field.** src/ui/screens/practice.js:29-73. It runs the player team or a generated team through `simulatePlay`, then `buildFx`, then `fieldSvg`. It reads the franchise but does not write it: no `app.save` in the file.
  - **Playbook Audit.** practice.js:80-139. Seeded and walk-through; `fxQuality: 'min'` (l.114); trails; "flag this moment" (dev-review.js:136).
  - **AI Lab.** src/ui/screens/ai-lab.js:180, with src/lab/qb-lab.js. It has a Paused mode at the decision point and uses `options.fork` re-seeding (qb-lab.js:1-9). Its own IndexedDB is in src/lab/lab-store.js.
  - **Attribute Lab and Defensive scenario.** src/ui/screens/attr-lab.js:160, src/lab/attr-trials.js:29 and src/lab/def-scenario.js. Plain 65-rated monsters with no abilities, and an `options.trace` developer trace. **This is the closest existing "scenario setup" machinery**: choice of play, call, slot under test and QB behaviour (def-scenario.js:1-8).
  - **Evolution Preview.** src/ui/screens/evo-preview.js:26, with src/lab/evo-preview.js. It runs the real `tryEvolve` on throwaway copies and calls the real `openEvolutionScene`. This is a good template for the no-write guarantee and for the Playwright fingerprint check (tools/evo-preview-check.py).
- **Tests.** tests/dev-review.test.js covers the queue and fingerprints. **No Playwright tool or test drives `ability-audit`**: grep for `ability-audit|stagedSim|findActivation` in tools/ and tests/ found nothing.

### Task 8 change (§13)
- **Enumerate abilities from the new data.** The catalogue should come from the 144-entry Beast Dex data (abilities.json, Football and Clash), not from `SPECIES_DEX.ability`.
  - Add an explicit list of form and mastery variants (Developing, Practiced, Expert, Mastered per §6) that shows all of them.
  - Add a "no silent missing entries" assertion: count == 72 per mode, plus the variant counts.
  - The commons' 10 shared traits go away as review subjects, because every family gets a football signature.
- **Retire the synthetic `stagedSim`.** It is also the "See it" player preview. Replace it with engine-driven scenario setups: real placement, geometry, movement, obstacles and status gates.
  - The engine needs a scenario-injection API: forced statuses, charges, positions and absences. `simulatePlay` currently accepts `options: { forcedTarget, maxTime, frameEvery, edge, memory, dryRun, qb, fork, trace }` (engine.js:11). Of these, `memory.used` is the only per-ability readiness input, used for once-per-drive and once-per-game effects (ability-audit.js:145).
- **New controls.**
  - Monster, form and mastery picker.
  - Team side (§13 asks for "both teams" readiness).
  - Scenario variants: valid, invalid/blocked, multi-target, depletion, cleanup, source-KO.
  - Charge/readiness preset, replay/reset, scrub/step.
  - Quality picker (full/low/min), reduced-flash toggle, camera-intensity control, Apex appearance toggle.
  - Inspection overlay: hitboxes, affected targets, optional pre-snap tactical overlay.
  - Mobile-sized controls.
- **Review store.** Reviews should be keyed by mode, ability id and variant, not by species. The fingerprint must hash the new ability record and the rendering revision. The old `ability` namespace entries become orphaned; a fresh-save break is authorized (§15), but review data is separate from saves, so the migration policy for reviews is UNDECIDED. `CARD_CHECK` and `CARD_PROPOSALS` are tied to the old abilities and must be revisited.
- **No writes.** Preview must not modify progression and must award nothing (§6 "Labs, reviewers, previews and replays award nothing"). Reuse the evo-preview no-write fingerprint pattern.

## 2. Beast Clash presentation

### Current
- **Engine first, then presentation.** `simulateClash({a,b,seed,config})` (src/clash/engine.js:31) produces a full `result.log` before anything is drawn. It also returns a `replayKey` (engine.js:386-398).
- **Choreographer.** src/ui/clash/choreographer.js. It is pure:
  - `stateAt(result,i)` gives HP, shield, cond, paused, ko and order (l.22).
  - `cuesFor(result)` gives one cue per log event, with a tier (tick/routine/power/major) and a camera (zoom/shake/dim) (l.48-107).
  - Durations are in `DURATION` (l.13); speeds are 1/2/4 (l.11).
  - Camera shake is hard-coded at 3-8 px (l.66,68,90).
- **Arena.** `createArena(root,result,opts)` (src/ui/clash/arena.js:50) is DOM plus WAAPI animations plus a canvas FX layer (`createFx`, src/ui/clash/fx.js:21).
  - It plays cues sequentially with `await anim(...)` and `setTimeout` waits (arena.js:40,316-322).
  - Playback API: `setCursor`, `play`, `pause`, `step`, `skip`, scrub slider, next exchange, speed buttons, and an FX full/low toggle (arena.js:77,316-344).
  - `simple: true` (franchise battles) hides step, scrub and the FX toggle (arena.js:44-48).
  - Tapping a monster or card shows an inspection caption with HP, shield, cond and the move text (arena.js:323).
  - Reduced motion comes from `opts.reducedMotion` or `html[data-reduced-motion]` (arena.js:56). It disables the camera (arena.js:184) and cuts particles to 30% (fx.js:49,81).
- **Franchise screen.** src/ui/screens/clash-battle.js.
  - The engine result is created first. The arena is created with `simple: true`, `reducedMotion`, and no quality option (clash-battle.js:169,237).
  - `finish(f)` calls `B().resolve(f)` and saves only after the arena's `onEnd` or Skip (clash-battle.js:174-177). Watch and Skip are the same battle (clash-battle.js:5,21).
  - The XP rows after a battle are at clash-battle.js:178-183.
- **Clash Lab.** src/ui/screens/clash-lab.js:185. It has five views: Lineup, Replay, Batch, Load, Moves (l.36).
  - The Replay view uses the full arena with quality, scrub and step (l.33).
  - A replay key can be pasted to rebuild a battle (l.207).
  - The Moves view lists all 72 moves with their numbers and validation, but no animation preview (l.172-182).
  - Generated monsters only; nothing saved (l.1-3).
- **Conditions in the current Clash.** burn, chill, daze, shock (arena-art.js:96-97; fx.js:106-113; choreographer.js:75-80). They differ from the §10 shared twelve-status list (Afflicted, Stunned, etc.).
- **Tests.** tests/clash/presentation.test.js covers event coverage, state consistency against the engine on 20 golden battles, playback-control equivalence, purity (no clock or randomness), camera bounds (zoom ≤ 1.15, shake ≤ 8), and themes. The DOM arena is only exercised by a "scratch Playwright run" (presentation.test.js:3), not by a committed tool. UNVERIFIED: no committed Clash Playwright check exists; none was found in tools/.

### Task 8 change (§13, §10, §14)
- **The Clash reviewer has a natural host.** Clash Lab's Replay view plus `createArena` already provides real-engine and real-rendering replay/reset, scrub, step, quality and reduced motion.
- **Gaps against §13:**
  - Per-ability catalogue (72 Clash abilities plus form and mastery variants) with review status. This would reuse or generalize review-store under a new `clash_ability` namespace.
  - Scenario presets: active/reserve arrangement, HP, shields, statuses, delayed effects, support and commanded interactions. Today a scenario is only a lineup plus a seed; `simulateClash` takes no initial-state injection. UNVERIFIED whether `config` can seed HP, status or shield; it was not read in depth.
  - Valid, blocked, multi-target, depletion, cleanup and source-KO/rotation cases.
  - Charge/readiness setup and the badge/charge/battery cycle.
  - Apex appearance.
  - A camera-intensity setting: today shake magnitudes are constants in choreographer.js and only gated by reduced motion.
  - Reduced flash, which is distinct from reduced motion: `flash()` in fx.js:71 is still used under reduced motion.
- **Status vocabulary.** The burn/chill/daze/shock icons and colours must be replaced with the shared neutral status badge and the twelve-status identities (§10, §13).

## 3. Status, charge and stamina badges over monsters

### Current
- **Football on-field status.**
  - Each frame carries a per-slot status code (5th tuple element). It is drawn by `statusMarks(code, …)` (src/ui/ability-sigs.js:152-171).
  - The codes are stun, flat, frozen, spin, stumble, lost, confused, slow, charged, cower, fooled and pinched.
  - They are drawn as animated cartoon marks (spinning stars, ice block, "?", snail emoji) or as sprite transforms. There is no duration number and no shared badge.
  - Called from field-view.js:91-96, collected into `statusOver` and drawn last (l.125).
  - **Status is hidden entirely when `fxQuality === 'min'`, i.e. under reduced motion** (field-view.js:114-116). That misrepresents actual state, against §13 "never ... misrepresent actual state".
- **Football ability presentation.** Activation badge, pulse ring, action effect and outcome label. These come from `fxSvg` (ability-fx.js:1-13,142-185). There is also a trait cue emoji (`TRAIT_CUE`, ability-fx.js:21).
- **Type matchup badges.** Shown pre-snap only (field-view.js:130-141).
- **Clash.**
  - Each monster tag has a name, an HP bar with ghost and shield segments, a `.cl-cond` emoji icon and a `.cl-sh` shield number (arena.js:89,116-123).
  - Cards repeat HP, shield and condition (arena.js:126).
  - A paused condition is shown at 0.6 opacity (arena.js:121).
  - There is no duration number, application count or charge bar.
- **Charge, readiness and cooldown.** No UI exists anywhere. grep for charge, cooldown and readiness in field-view, ability-fx, match and arena found only the `overcharge` key name.
- **Stamina and fatigue.**
  - Fatigue is shown only as text, `Fatigue ${m.fatigue}%`, on the monster profile (src/ui/screens/roster.js:159), on the depth and assign rows (roster.js:67,133; UNVERIFIED exact rendering), in the HQ recovery toast (hq.js:144) and in the Clash pick cards (clash-battle.js:142).
  - There is no on-field battery or stamina indicator in football or Clash.
  - The model is "fatigue % high when tired", which §12 tells us not to mix with remaining stamina.

### Task 8 change (§13, §12, §10)
- **Shared status badge.** A new small light-grey circular badge with a dark neutral symbol and a duration number, for both modes. Football status marks must not disappear under reduced motion or min quality.
- **Alternating cycle.** Status badge, then charge/recharge bar, then low-stamina battery (≤ 25%). They alternate and are never shown together.
  - The timing must come from render time only; it must not influence sim.
  - It is needed in field-view's `marker()` (field-view.js:91-102) and in the arena's `.cl-bar` (arena.js:89).
- **Inspection.** Strength and applications out of 3 are shown in inspection only (the reviewer panel and the arena caption), not as extra icons.
- **Data.** Frames and logs must carry status id, duration, strength, applications, charge and stamina. Today frames carry only a status code, and the Clash log only `cond` and `paused`.

## 4. Settings

### Current
- **Where settings are defined.**
  - Franchise settings defaults: src/franchise/franchise.js:96, `{ quarterLength, mode, speed, reducedMotion:false, liveClock, difficulty }`.
  - Without a franchise: `app.defaultSettings` (src/main.js:53), read through the `app.settings` getter (main.js:52).
  - **Settings are per franchise.** They are stored in the save, and the no-franchise defaults are in memory only. UNVERIFIED: no persistence of `defaultSettings` was found.
- **The Settings screen.** src/ui/screens/menu.js:81-117.
  - Options: speed (Slow/Normal/...) at l.91, Clash mode and speed at l.92-93, and field markers (sprites/simple) at l.95.
  - Toggles for replays, type icons and auto points (l.96-98).
  - `reducedMotion` (l.100): "no play animation, no particles".
  - `screenShake` (l.101): screen shake plus vibration.
  - `evoSound` (l.102): "the game has no other sound".
  - `devNotices` (l.103) and `liveClock` (l.104).
  - The setter writes `f.settings[k]`, or the defaults, and sets `html[data-reduced-motion]` (l.112; main.js:191).
  - The Clash settings sub-object is in src/franchise/clash-link.js:31-34 (`{mode:'ask', speed:2}`).
- **Effect quality is derived, not chosen.**
  - Match: `fxQualityFor(f) = reducedMotion ? 'min' : fieldMarkers==='simple' ? 'low' : 'full'` (src/ui/screens/match.js:552).
  - Practice and Audit: only `reducedMotion ? 'min' : 'full'`.
  - Clash: a per-arena FX toggle in the Lab only, not saved (arena.js:332; clash-lab.js:33 keeps `st.fxQuality` in memory).
- **Reduced motion.**
  - The football match skips play animation entirely (match.js:402-403) and the weather layer (l.208).
  - Replay zoom is off (l.494) and shake is off (l.555).
  - CSS kills all transitions and animations under `html[data-reduced-motion="1"]` (styles/app.css:210 and others).
  - The evolution scene respects reducedMotion, the OS `prefers-reduced-motion`, screenShake and evoSound (src/ui/evolution-scene.js:75-76).
- **Camera shake.** Football: `shakeField` adds a CSS `.shake` class plus `navigator.vibrate(35)` (match.js:553-560), driven by `shakeBetween(fx.shakes)` (ability-fx.js:131). Clash: per-cue shake constants (choreographer.js), gated only by reduced motion (arena.js:184). **The Clash arena ignores `screenShake`.** createArena receives no screenShake option (clash-battle.js:169).
- **Missing settings.** No FPS cap or FPS mode, no reduced flash separate from reduced motion, and no camera-intensity scale.

### Task 8 change (§14, §13, §5)
- **New settings.**
  - FPS mode 60 (default) / 30.
  - Effect quality, user-selectable and applied to both modes.
  - Camera intensity, covering zoom and shake for football and Clash.
  - Reduced flash: steady outline and fade, no reveal shake. It must be distinct from reduced motion, which currently removes play animation entirely.
  - Respect sound settings for the Apex panel. Sound currently exists only as `evoSound`; a general sound setting is UNDECIDED.
- **Reviewers.** They need local overrides for quality, reduced flash and Apex appearance that never write the saved settings. The evo-preview pattern already does this for sound (evo-preview.js:1-5,24).

## 5. Rendering loop and timing (sim/render decoupling)

### Current
- **Football.**
  - `simulatePlay` runs to completion first, at a fixed `DT = 0.05` s tick (src/sim/engine.js:32). It records a frame every 2 ticks, i.e. 10 fps (engine.js:68; replay.js:5).
  - Rendering only indexes the recorded frames by wall-clock time: `idx = floor((now-start)/msPerFrame)`, with `msPerFrame = 100/(speed*autoSpeed)` (match.js:412,419).
  - It draws a midpoint half-step at 20 fps unless a draw took more than 18 ms (match.js:433-444).
  - Practice, Audit and the labs use the same pattern (practice.js:59-63; ability-audit.js:225-233; attr-lab.js:65; ai-lab.js:69,97).
  - The game state advances in `finishAnim` after the animation. Reduced motion skips straight to it. UNVERIFIED: `finishAnim` was not read in full, but the comments say a replay "touches nothing in f.game" (match.js:483).
- **Clash.** The engine runs fully before the arena (clash-battle.js:169). The arena waits on WAAPI and `setTimeout`. `finish → resolve(f)` happens on `onEnd` or Skip, so the outcome is independent of rendering.
- **Perception noise** in the engine comes from a seed hash (engine.js:421,450), not wall time. A grep for `Math.random` and `Date.now()` in src/sim and src/clash returned no hits.
- **Live play clock.** This is the only wall-clock gameplay input: an opt-in `setInterval` 40 s clock that applies a delay-of-game penalty to the player (match.js:655-668). It pauses during animation. It is player-input timing, not frame-rate dependent, but its 250 ms polling is wall-time based.
- **Conclusion.** The current architecture means a 30/60 FPS cap would change only draw frequency, not outcomes. The risk is in new code: Apex panels, cycle timers or reviewers that gate game-state transitions on render completion. §13 says "gameplay timing is authoritative and cannot wait for optional render completion". Note that the Clash `onEnd` currently does gate `resolve` on the animation ending (Watch path), though the result is fixed in advance.

### Task 8 change (§14, §15)
- **A central frame scheduler** honouring the 60/30 FPS mode. Today every screen has its own rAF loop: match, practice, ability-audit ×2, attr-lab, ai-lab, Clash fx.js:34, and the evolution scene. Each would need the cap. Also add frame-time telemetry for the §14 gates.
- **Tests.** An identical-outcome test across FPS, quality, reduced flash and camera settings. It should be largely trivially true for the sim, but must cover reward application and status transfer.

## 6. Monster profile and roster UI (Temper, Apex emblem, three bars)

### Current
- **Profile screen** `monster`: src/ui/screens/roster.js:151-205.
  - Header: sprite at 72 px, name, a CORNERSTONE chip, position, type and age (l.157).
  - `Level ${m.level} · XP ${m.xp}/${xpForLevel} · potential ${m.potential}`, followed by a single XP bar (l.157-158).
  - Fatigue, injury and salary on one line (l.159).
  - A Nature panel showing `NATURES[m.nature]` with ±10% chips (l.164). Temper replaces this.
  - Signature ability with "See it" (l.165); evolution (l.166); Dex link (l.167).
  - Points panels: "✨ N attribute points to spend" and the locked variant (l.171). They are fed by `levelUp`, which adds `POINTS_PER_LEVEL` to `m.points` (src/data/monsters.js:233-243). **Spec §6 retires level-up points.**
  - Twelve attributes with spend buttons (l.172).
  - Ageless text for legendaries (l.149).
- **Roster list row** (roster.js:124): sprite at 36 px, name, type glyph, notice dot, CORNERSTONE chip, "Fits scheme", "✨ N pts", "⬆ ready to evolve".
- **Other places that show monsters.**
  - The career card canvas export shows Level and OVR (src/ui/career-card.js:38-44).
  - The career profile is in src/ui/screens/career.js:152 and src/ui/career-ui.js.
  - The Clash post-battle XP bars are at clash-battle.js:178-183.
- **Sprite pipeline.** `monsterSprite(m,size,{tint,flip})` (src/ui/pixel-monster.js:13) wraps `sprite16(spec,size,{tint,flip,cls})` (src/ui/sprite16.js:317). There is no outline or accent parameter. On-field sprites are injected by string-replacing the `<svg>` attributes (field-view.js:100).
- **No Apex, Temper, training bar or mastery fields** were found in the UI. grep for apex, temper and mastery was not exhaustive; UNVERIFIED for non-UI modules.

### Task 8 change (§5, §6)
- **Profile.**
  - Replace the Nature panel with Temper.
  - Replace the single XP bar with three bars: Level (MAX at 50), the mastery for the relevant mode, and shared Training. Per-ability mastery tiers are Developing, Practiced, Expert and Mastered.
  - Replace the "points to spend" text: points now come from training-bar completions and offseason banks, not level-ups.
  - Add an Apex emblem on the profile and roster cards, shown only once the player knows.
  - Add the Apex text: Potential 99 in every attribute, Starts undeveloped, Ageless, Neutral Temper. Show current ratings separately.
  - Add a "replay Apex discovery" button.
- **Sprites.** Add a gold double-outline option for Apex to `monsterSprite`/`sprite16`, used on cards and as the on-field accent. It must not be a permanent overhead badge.
- **Apex discovery panel.** A new 4-6 s skippable overlay: silhouette, outline reveal, "APEX DISCOVERED". The evolution scene is the closest template (src/ui/evolution-scene.js:73; skip at l.130; sound at l.84). It needs a ledger, kept outside rendering, so skip or replay never re-awards.
- **Clash post-battle.** Should show the same three bars, with Clash mastery.

## 7. Dex screen and scaling

### Current
- src/ui/screens/dex.js:19-50 renders *all* species, grouped by `TYPES` element, into a grid of `dex-cell` buttons, each with an inline `sprite16` SVG at 40 px (dex.js:32). Every render regenerates every sprite SVG; there is no virtualization or lazy loading.
- `speciesSheet` (dex.js:53-67) shows the football ability or trait and "See it". It shows **no Beast Clash move**.
- Evolution forms are shown as sprites or silhouettes using `dexFormSeen` (dex.js:56).
- Rarities come from `RARITIES`. The Basic rarity is not present in current data.
- Counts use `SPECIES_DEX.length` (dex.js:26): 72 today.

### Task 8 change (§13 / data scope)
- **Scaling.** At 192 families and 222 forms, the grid grows to about 2.7× the cells. Each sprite16 SVG is generated synchronously on render. BASIC_AUDIT.md:232 flags performance on low-end phones as untested. Consider sprite caching, per-element collapsible sections, or lazy rendering.
- **Content.**
  - Show both mode abilities.
  - Show "no unique ability" for Basics, represented explicitly per BASIC_CREATION_BRIEF.md:26.
  - Add a Basic rarity chip and copy; the footer text at dex.js:38 is stale.
  - Forms per family: show the stage list from forms.json.
- **Apex.** Apex is per individual, not per species, so the Dex should not show Apex badges.
- **Cross-check of the brief.** The brief said "192 families/222 forms". SPECIFICATION_BASELINE.md:13 says "72 families, 102 forms". The 192/222 figure comes from PROGRESSION_DECISIONS.md:22 and BASIC_CREATION_BRIEF.md:16, which add the 120 Basics. Both are consistent once Basics are included. The 144-ability count is unchanged by Basics.

## 8. Dev and test harness relevant to reviewers

### Current
- **`npm test`** runs `node --test "tests/**/*.test.js"` (package.json:8).
- **Tiers** are defined in tools/test-tier.mjs:
  - **fast:** everything not in SIM.
  - **sim:** 26 long files (l.15-23).
  - **perf:** `tests/clash/engine.test.js` with the pattern `^performance:` (l.24).
  - **list:** prints each tier's files.
  - New test files land in **fast** by default.
- **Browser checks** are Python Playwright scripts in tools/*-check.py. The `playwright` Python module imports fine here. Examples: evo-preview-check.py, ai-lab-check.py, attr-lab-check.py, def-lab-check.py, navigation-check.py.
  - Pattern (tools/evo-preview-check.py:1-30): an in-process static HTTP server, a phone touch viewport at 320/375/390/430 px, navigation through `import('./src/ui/router.js').then(R => R.go(...))`, and a `FINGER` snapshot of localStorage, every IndexedDB store and `window.__gb.f` to prove nothing was written.
  - The evolution layout probe is shared from tools/evolution-ui-check.py.
  - tests/ui/responsive.py exists (UNVERIFIED content).
- **Clash.** tests/clash/presentation.test.js holds the choreographer unit tests. tests/tools/{batch,lineup,replay}.js are helpers. tools/clash-snapshot.mjs exists (UNVERIFIED purpose).
- **Reviewer coverage.** tests/dev-review.test.js covers queue and fingerprint logic only. **No browser check exists for Ability Audit or Clash Lab.**

### Task 8 change (§13, §16)
- **Football reviewer browser check**, modelled on evo-preview-check.py:
  - Every one of the 144 abilities and every variant is listed.
  - Every scenario runs through the real engine with no page errors.
  - Quality, reduced flash and Apex toggles work.
  - Replay and reset work.
  - FINGER is unchanged, meaning no progression writes. Reviews are only written to the review store.
- **Same check for the Clash reviewer.**
- **Headless unit tests** for catalogue completeness (count 72+72, variants) and for "reviewer scenario outcome == gameplay outcome for the same seed". These go in the fast tier.
- **The §14 FPS frame-time gates need physical devices.** Desktop Playwright cannot verify them (§14 says "report unverified").

---

## Risks / surprises
1. **"See it" is synthetic.** The player-facing preview and the reviewer's Staged mode both use scripted `stagedSim` frames, not the engine (ability-audit.js:7,67,242). §13 forbids "fake visuals unrelated to gameplay". Replacing it touches the roster, Dex, scouting and the first-time tip callers of `openAbilityPreview` and `seeItButton`.
2. **The football catalogue is a rewrite.** Current reviewable abilities: 48 species signatures. Target: 72 football plus 72 Clash plus variants. The names and mechanics in abilities.json differ from the shipped `SPECIES_DEX.ability` and `TRAITS`. Fingerprints and review ids will all change, so existing owner approvals are invalidated. A review-data migration policy is needed (UNDECIDED).
3. **Reduced motion hides real state.** In football, `fxQuality 'min'` hides all on-field status marks (field-view.js:114). The match screen skips play animation entirely (match.js:402). §13 requires that state is never misrepresented, and §5/§14 want reduced *flash*, not removal. The existing setting semantics need to be split.
4. **Clash ignores `screenShake`.** The setting is gated only by reduced motion (arena.js:184; clash-battle.js:169). Shake magnitudes are hard-coded. A camera-intensity setting must be threaded through the choreographer and arena.
5. **No scenario injection.** Neither engine accepts forced initial statuses, charges, HP, shields or obstacle placements. `simulatePlay` has `memory.used` only; `simulateClash` takes lineup, seed and config. Reviewer scenarios (valid, blocked, depletion, source-KO) need a deterministic, test-only state-injection API that does not diverge from gameplay code paths.
6. **Duplicated status systems with different vocabularies.** Football frame codes (stun, flat, frozen, …, ability-sigs.js:152) versus Clash conditions (burn, chill, daze, shock, arena-art.js:96). §10 requires one shared twelve-status model with cross-mode transfer, so both presentations need a new data contract.
7. **Many rAF loops, no central scheduler.** There are at least eight independent loops. A 30/60 FPS mode must be applied to all of them.
8. **The football frame rate is fixed by the sim.** Frames are recorded at 10 fps and interpolated to 20 fps. A "60 FPS" target means interpolation, not more sim frames, so the reviewer hitbox inspection must state which frame is authoritative.
9. **Settings live in the franchise save.** The no-franchise defaults are in memory (main.js:53). The new FPS, quality, camera and flash settings probably need to be device-level rather than per-save; this is UNDECIDED and affects the fresh-save break.
10. **The Clash `onEnd` gates `resolve(f)`** on the Watch path (clash-battle.js:169,174). The outcome is pre-computed, but reward application is triggered by render completion. This conflicts in spirit with §13 "gameplay timing ... cannot wait for optional render completion" and matters for §15 atomic reward application.
11. **Dex performance.** 222 forms with synchronous inline SVG generation per render is untested on low-end phones (BASIC_AUDIT.md:232).
12. **No browser test for the existing reviewers.** Phase 2 has no baseline Playwright check to extend for Ability Audit or Clash Lab; the evo-preview check is the best template.
