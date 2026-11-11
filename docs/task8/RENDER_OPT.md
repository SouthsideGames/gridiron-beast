# Task 8 renderer optimisation and the end-of-play save

Branch `task8-render-opt` from `task8-implementation` 5b2ae99. Owner direction (2026-11-08 23:13): fix the known bottlenecks now
with short targeted checks, mobile first: cut per-frame cost and stutter. Owner clarification (2026-11-09 01:03): identity is
proven against the current visuals; the ability artwork is being changed separately on `task8-fx-football`.

**Every change below is a renderer optimisation, pixel-identical. None of them is an artwork change.** No ability look, colour,
sprite, badge, label, field marking or layout was changed; the screenshots prove the same pixels. Gameplay is untouched: nothing
under `src/sim` changed, nothing in the franchise rules changed, and the store writes the same bytes (section 4).

Rulings followed: SPECIFICATION_BASELINE §26 (optimisations never change gameplay; graphics settings are not the primary strategy
and are not implemented) and APPROVAL_REGISTER N8f (renderer optimisation approved: sprite caching, reusable field layers, no
redundant drawing, compatible with the current visuals; the end-of-play save hitch investigated with reliable saving and reward
persistence preserved).

## 1. Changes (each: renderer optimisation, pixel-identical)

| # | Commit | Change | What it removes |
| --- | --- | --- | --- |
| 1 | f150be2 | **Sprite caching.** Each monster's field sprite (form, individual tint, facing) is built once as an SVG `<symbol>` (`sprite16Symbol`, `monsterSpriteRef`) in the field's `<defs>`, and placed per player with a `<use>` of the same 16×16 viewBox, 3.4×3.4 size and `crispEdges`. | ~70 `<rect>` per player per draw: about 1,000 elements and 70,000 characters of markup per frame |
| 2 | f150be2 | **Static and dynamic layers.** `fieldLayers()` splits the field: static (turf, end zones, yard lines, numbers, hashes, sidelines, scrimmage and to-gain lines, goal posts, pre-snap art, Task 8 field rectangles, underlay) and dynamic (trail, effects, players, ball, badges, status marks). `fieldDraw(svg, o)` updates a live `<svg>`: new symbols appended to `<defs>`, the static layer replaced only when its markup changed (camera move or new situation), the dynamic layer per draw. `fieldSvg(o)` still returns the whole field as one string for one-off draws. | re-parsing the turf and lines 10–20 times a second |
| 3 | 2a21c42 | **No whole-screen re-render at a play's start and end.** `render()` is split into `screenParts()` (the same strings) placed in regions; `refresh()` rewrites the regions in the mounted screen (title, head, field-wrap class, field via `fieldDraw`, field overlays, panels under the field, controls) and repeats the after-render effects `mount()` runs (halftime sheet, play clock, Auto scheduling, moment tips). Used at play start and end, replay start and end, a play-card pick and non-animated steps. | rebuilding the top bar, scoreboard, controls, play cards and the whole field at every snap and whistle |
| 4 | 4cf0699 | **No redraw when nothing changed.** `fieldDraw` leaves a layer alone when its markup is unchanged; `refresh()` rebuilds a region only when its markup changed (controls always when the live play clock is on). | still frames of the end-of-play hold; unchanged regions |
| 5 | fc12f54 | **Players keep their nodes.** The dynamic layer is three attribute-less groups (under the players, the players one `<g>` each keyed by team and slot, over the players). For the same line-up `fieldDraw` sets only the changed attributes of each player's base ellipse and `<use>`, so a `<use>` keeps its instance of the symbol instead of being re-created (and its shadow tree cloned and styled) every frame. Players whose status marks change are rebuilt from markup; a new line-up rebuilds the group. | per-frame re-instancing of 14 `<use>` shadow trees (style and parse cost) |
| 6 | b931c32 | Practice, AI Lab, ability reviewer and ability audit animate through `fieldDraw` too (first draws still `fieldSvg`). | the same costs on those screens |

The draw itself is unchanged in what it contains: `fieldLayers()` is the old `fieldSvg()` body, producing the same elements in
the same paint order; only wrappers without attributes (`<g>`), `data-fv` hooks and the `<symbol>`/`<use>` indirection were added.

### The ability-effects hook (kept stable for `task8-fx-football`)

`src/ui/ability-fx.js` was not modified and its descriptor interface is unchanged. The field calls, per frame, exactly as before
(documented at the top of `src/ui/field-view.js`):

- `movementSvg(carrierPos, { quality })` → string, under everything in the dynamic layer;
- `fxSvg(fx, t, posOf, { quality, halfWidth, toSvg, ball, pball })` → `{ under, over, ball }`: `under` below the players, `ball`
  just under the ball, `over` above the players; `posOf(team, slot)` → `[x, y, dx, dy]` in SVG units or null, `toSvg(x, y)` → `[x, y]`;
- `statusMarks(status, cx, cy, t, seed)` → `{ under, over, tf }` per marked player.

New artwork returned through these strings composes with the layers as it does today: `under`/`movementSvg` land in the
`fv-pre` group, `ball`/`over`/status `over` in `fv-post`, status `under`/`tf` inside the player's own group. Those parts are
rebuilt from markup whenever their string changes, so no assumption is made about their content.

## 2. Screenshot identity

Tool: `tools/perf/render/shots.mjs` (headless Chromium via `createRequire('playwright')`, 390×844, DPR 3). The playback clock is
held through the inert harness hook (`globalThis.__gbRenderPerf.clock`, defined only by the harness), so each frame is
photographed exactly; CSS animations and transitions are disabled for the capture (wall-time effects, identical code on both
sides). 65 images per run:

- the live franchise game (seed 3, week 3) played by hand: the screen before the kickoff; for 4 steps (kickoff, 3 snaps) the full
  screen at play start and play end, and the field at engine frame 0, frame 2 + half-step, the middle frame, the last frame and the
  end-of-play hold (where effects run on);
- 3 plays each of F1 (ordinary) and F4 (legendary scene: Sovereign Arm, Cyclonic Release, Landslide, Night Veil, Grove Guardian)
  through the match screen's playback: the same frames plus a frame just after the first ability activation (badge, effect and
  label on screen).

The baseline at 5b2ae99 (+ the inert clock hook) was captured twice and was byte-identical to itself (65/65). Each step was
compared with it:

| After | Result |
| --- | --- |
| sprite symbols + layers (f150be2) | 65 of 65 pixel-identical |
| in-place play start/end (2a21c42) | 65 of 65 pixel-identical |
| save in worker, idle scheduling (5a2bdd3) | 65 of 65 pixel-identical |
| no redraw when unchanged (4cf0699) | 65 of 65 pixel-identical |
| players keep their nodes (fc12f54) | 65 of 65 pixel-identical |
| save-queue fix and other screens (3c6f6d1, final code) | 65 of 65 pixel-identical |

**No pixel difference had to be accepted**: every compared image is pixel-identical (not only within anti-aliasing). Ball,
targets, field boundaries, ability effects and labels, status badges and the scoreboard are in the compared images. Not
photographed: the practice, AI Lab, reviewer and audit screens (change 6 uses the same `fieldLayers`/`fieldDraw` proven on the
match screen), the instant replay (same draw path), simple markers (same layer code; the setting and fxQuality/reduced motion
keep working: `fieldMarkers: 'simple'` gives `sprites: null`, untouched).

## 3. Short measurements (PRELIMINARY)

Command (as briefed, with the live scene named so the live block runs): `node tools/perf/render/run.mjs
--scenes=F1-ordinary,F4-legendary-scene,L1-franchise-auto --modes=render,live --configs=full --live-configs=full --repeats=1
--throttle=1`. One repeat each, headless desktop Chromium, 2-CPU VM. **The machine was shared with other agents during these runs
(competing load up to about 1 CPU of 2): every block is PROVISIONAL.** To make the comparison fair, the base (5b2ae99, extracted
with `git archive`) and this branch were run back to back with the same command (pairs p1 and p2). Mobile: NOT VERIFIED.

### 3.1 Frame time (render: precomputed plays through the match screen; live: the real franchise game in Auto)

| Block | Pair | Base 5b2ae99: avg / p95 ms, frames >33 / >50, long tasks (max ms) | Branch: avg / p95 ms, frames >33 / >50, long tasks (max ms) |
| --- | --- | --- | --- |
| render F1 ordinary | p1 | 21.2 / 49.9, 63 / 23, 11 (209) | 19.8 / 33.3, 30 / 15, 2 (52) |
| render F1 ordinary | p2 | 23.1 / 50.0, 90 / 33, 13 (349) | **17.3 / 16.8, 7 / 2, 1 (112)** |
| render F4 legendary | p1 | 28.0 / 66.7, 182 / 99, 17 (120) | 18.2 / 16.8, 32 / 16, 6 (200) |
| render F4 legendary | p2 | 24.8 / 50.0, 171 / 54, 5 (112) | **17.0 / 16.8, 8 / 2, 0** |
| live L1 (in play) | p1 | 30.1 / 83.3, 275 / 155, 37 (308) | 19.4 / 33.3, 73 / 33, 22 (321) |
| live L1 (in play) | p2 | 22.8 / 50.0, 157 / 71, 13 (100) | **17.5 / 16.8, 30 / 11, 8 (88)** |
| live L1 (session: plays, gaps, saves) | p2 | 21.5 / 50.0, 180 / 78 | **17.6 / 16.8, 44 / 14** |

Competing CPU per block 0.7–1.15 (of 2) in every row, base and branch alike; p1's branch run was earlier code (before the queue
fix and the other screens). The quiet-machine figures for the base (official run, 3 repeats) were F1 17.5 / 16.8, F4 18.1 / 33.3,
live 18.2 / 33.3; a single quiet-ish base run on this VM at the start of this work gave F1 18.1 / 16.8 (27 / 8), F4 16.9 / 16.8
(7 / 0), live 17.7 / 16.8 (22 / 11, 13 long tasks, max 235 ms).

### 3.2 Main-thread time by group (trace, ms per second of playback, pair p2)

| Block | Base: script / style / layout / parse / paint / GC | Branch: script / style / layout / parse / paint / GC |
| --- | --- | --- |
| render F1 | 88 / 95 / 16 / 84 / 86 / 27 | 42 / 23 / 9 / 2.6 / 78 / 4 |
| render F4 | 48 / 84 / 17 / 75 / 78 / 167 | 38 / 19 / 8 / 3.0 / 77 / 5 |
| live L1 | 48 / 60 / 14 / 56 / 78 / 138 | 53 / 21 / 11 / 6.1 / 81 / 23 |

### 3.3 Draw profile (per engine frame, outside the timed blocks, pair p2)

| Scene | Base: one draw (innerHTML of the whole field) | Branch: one playback draw (`fieldDraw`) |
| --- | --- | --- |
| F1 | 97,549 characters, 1,321 elements; parse 4.88 + style/layout 3.81 = **8.7 ms** | dynamic layer 3,238 characters, 46 elements replaced or updated; static layer re-drawn on 4% of frames (the play's first); draw incl. forced style/layout **3.3 ms** mean (p95 17.1 under load) |
| F4 | 103,989 characters, 1,413 elements; parse 4.63 + style/layout 3.58 = **8.2 ms** | 4,510 characters, 58 elements; static 3%; **3.3 ms** mean (p95 12.7) |

The 14 sprite symbols live in `<defs>` for the life of the field element (about 1,000 rects, drawn once); each frame touches the
14 players' ellipse and `<use>` attributes plus the effect and ball markup. A full one-off draw of the new markup (`fieldSvg`, used
for a screen's first render) costs more than the old full draw (parse 11.4 + style/layout 21.7 ms in p2 under load) because the
14 `<use>` instances are created; this happens once per screen render, not per frame.

### 3.4 Script attribution (CPU profile, ms per second, pair p2)

| Block | Base: browser native / GC / field draw / save | Branch: browser native / GC / field draw / save |
| --- | --- | --- |
| render F1 | 224 / 170 / 81 / 0.03 | 152 / 22 / 10 / 18 |
| live L1 | 223 / 140 / 86 / 0.02 | 165 / 31 / 15 / 9 |

The branch's save time is real work that the base did not do: in these harness runs the base build's save queue had wedged
(section 4), so it saved almost nothing. On the branch every play's save is written; its main-thread share (snapshot and commit)
runs while the screen is idle, outside the animation windows (the frame statistics above include the live session's gaps).

**Reading.** Per-frame DOM parse fell from about 56–84 ms/s to 3–6 ms/s, style from 60–95 to 19–23 ms/s and GC from 27–167 to
4–23 ms/s; the field-draw script from about 80 to 10–15 ms/s. Paint is unchanged (same pixels). On this loaded machine the branch
held a 16.8 ms p95 in every block of p2 against 50 ms for the base, with frames over 33 ms down by 80–95%. These are single
repeats on a shared VM: preliminary, desktop only; mobile not verified.

## 4. The end-of-play save

### What was found

- Main-thread cost of one save of a week-3 franchise (Node, measured): `JSON.stringify` of the 1.8 MB core part 13–48 ms (the
  snapshot), packing 127–193 ms, verification 50–85 ms, gzip 28–64 ms, checksums 6–15 ms: **150–300 ms of encoding**, run as
  async chunks on the main thread, landing in the next play when the next snap came within the debounce.
- **A save-queue wedge (pre-existing bug, fixed in 3c6f6d1).** In the base build the end-of-play saves intermittently stopped being
  written for the rest of the session (seen in 2 of 4 runs of a 4-play check in Chromium at 5b2ae99: the committed save stayed at play 1 for 33 s of
  idle; `flush()` returned at once). Cause: a debounced request taken by the running write left its timer armed; when that timer
  fired with nothing pending, `drain()` finished synchronously and `writing = drain()` stored the settled promise, so `writing` was
  never null again and no later save (immediate ones included) was written; only the unload journal still wrote. This is why the
  official run measured 0 ms/s of save. `tests/store-save-queue.test.js` reproduces it on the old code.

### What changed

1. **Encoding off the main thread** (5a2bdd3). `pack.js encodeRaw` is the old `encodePart` algorithm (pack, verify by unpacking,
   gzip, checksum), moved so a module worker can run it. Where the page can run one, `store.js` sends the frozen part strings to a
   worker loaded from `pack.js`'s own release-stamped URL (`import.meta.resolve`, so the import map's `?v=` applies); otherwise
   (Node, an old browser, any worker error) it encodes inline exactly as before. The snapshot (`freeze`), the manifest, the
   rolling backups, the cross-tab guard and the single IndexedDB transaction stay on the main thread in the same order.
2. **Scheduling** (5a2bdd3). `finishAnim` requests the save as before (`app.save()`: stamped then, queued, debounced). The match
   screen then writes it as soon as the browser is idle after the end-of-play update (`requestIdleCallback`, hard deadline 300 ms;
   `setTimeout(0)` where there is no idle callback), and at the latest synchronously at the next snap (before the simulation),
   play start, replay start or screen exit (`settleSave()`), so no save request fires inside an animation.
3. **The queue fix** (3c6f6d1): `drain` clears the debounce timer of the request it takes; a timer starts `drain` only with something
   pending.

### The guarantee kept

- Every play's result is requested for saving at the whistle, as before, and its write starts before the player can start
  anything else on the match screen: when the screen goes idle, or, at the latest, synchronously at the next snap, replay or
  screen exit. The write itself completes asynchronously (worker encode + one IndexedDB transaction), as it always did.
- Leaving the page or backgrounding the app keeps the store's existing guarantee (`main.js` `leaving()` on `pagehide`,
  `visibilitychange: hidden` and `beforeunload`): an immediate save plus the synchronous localStorage journal of anything still
  queued or being written, adopted at the next start. This path is unchanged.
- The final whistle (`finishSunday`) saves immediately as before (a finished game changes the save signature).
- The saved content is unchanged: the store freezes the live franchise when the write starts, as before (now at the end of the
  play rather than up to 1.2 s later, so a save never captures a half-started next play), with the same encoder and the same bytes
  for the same state (below).

### Evidence

- `node tools/perf/render/save-check.mjs --steps=6` (Chromium, real IndexedDB store): 16/16 — the store encodes in a worker; for
  every part, worker and inline encoding give the same checksum, the same bytes and the same entry; the committed manifest equals
  the inline encoding of the live franchise and reads back as the live franchise (JSON); reload after 6 plays gives the franchise
  back exactly (through the load-time migration, `savedAt` aside, which the reload's own unload save restamps); Sim to final +
  Continue (`finishSunday`: result, XP, level-ups, rewards), reload: the franchise back exactly, the game closed, week 3 → 4.
- Base-vs-branch store (Node, memory backend, the same franchise saved in four states): every committed record — slots, saves,
  rolling backups, parts — byte-identical.
- In the browser after 4 plays: the base build left saves pending in 2 of 4 runs; the branch committed every play each time.
- Tests: storage, save, slot and cloud suites 119/119 including the new queue test.

## 5. Tests run (targeted only)

- `tests/replay.test.js`, `tests/owner-feedback-v4211.test.js`, `tests/task8-review-scenarios.test.js`,
  `tests/task8-review-sequences-{a,b,named}.test.js`, `tests/save.test.js`, `tests/store-save-queue.test.js`,
  `tests/release-stamp.test.js`: 50/50. (There is no `tests/match*.test.js`; the match screen is covered by
  `final-whistle-qb-reads`, `partnership-franchise`, `qb-read`, `type-matchups`, `stadiums`: pass.)
- Storage and save: `storage-foundation`, `storage-interleavings`, `storage-restore-safety`, `storage-final-audit`, `save`,
  `slots-store`, `slots-cloud`, `cloud-save`, `franchise-save-compat`, `cloud-regressions`, `cloud-review-fixes`,
  `cloud-concurrency`, `uid-isolation`, `store-save-queue`: 119/119.
- Reviewer / dev review screens: `task8-ability-review`, `dev-review`, `task8-review-scenarios`: pass. `sprite-gen`: pass.
- The release stamp needed no change (no module added or removed; the worker loads `pack.js`, already in the import map).
- The full suite was not run (per the brief).

## 6. What remains

- **Official numbers.** The figures above are one repeat on a shared machine; the official protocol (3 repeats, quiet machine) was
  not run. **Mobile: NOT VERIFIED** (no device, no Capacitor project).
- **Paint.** Paint time per second is unchanged (~75–85 ms/s): the same pixels are painted. Remaining per-frame cost is mostly
  paint and compositing of a full-field SVG; a compositor-friendly weather layer (RENDER_PERF §7 item 7) and moving the dynamic
  layer to canvas (item 4) were not attempted (canvas would need its own identity proof).
- **The snapshot.** `JSON.stringify` of the 1.8 MB franchise (13–48 ms desktop) still runs on the main thread when a save starts
  (now at idle, or at the latest in the snap task before the simulation). Making it smaller needs a change to what is saved per
  play (out of scope: saved content must not change).
- **The snap frame.** The simulation still runs in the same task as the play start (RENDER_PERF §7 item 6).
- **Adaptive half-steps** (item 8) unchanged: `anim.slow` still decides from one draw over 18 ms (now far rarer).
- The first draw of each play (static layer, symbols, 14 `<use>` instances) costs about as much as one old full draw; it happens
  once per play.
- The cloud mirror (signed-in players only) still serialises the committed snapshot on the main thread after each commit (4 s
  debounce); not measured here (no cloud in the harness).
