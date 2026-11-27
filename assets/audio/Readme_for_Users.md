# Home Crowd Football: Snap, Pads and Stadium Sound Effects

**110 sound effects in WAV and OGG for any game engine: American football, the snap, the pads and the stadium: the snap and the shotgun snap, a throw ladder from a lob to a bullet, catches with the hands, against the pads and diving, drops and fumbles with an oblong ball bouncing, a kick ladder from a pooch kick to a kickoff, the hold, a blocked kick and a ball off the upright, a body meeting shoulder pads, a helmet, the turf and a padded wall at three forces, wrap tackles, a pile and a stiff arm, cleats on turf and concrete, chin straps, helmets and facemasks, the chains, two whistles and a stadium horn, the stadium from a hum to a roar with a touchdown, a big hit, a turnover and applause, a blocking sled, a field tarp, a ball launcher and seamless field and stadium beds.**

Football is a floodlit concrete stadium with a long slapback off the stands. One oblong ball body is rung by hands, boots and the turf; pads and helmets are hard shells over foam. The kick, the throw and the stadium are ladders a game can map to a power or excitement value; contact is a grid (surface by force), so a game picks the file from what was hit and how hard; the sled, the tarp and the launcher start, run as seamless loops and stop.

Part of *Home Crowd: Soccer, Basketball and American Football Sound Effects in Three Packs* by Core Systems Asset Factory. Every sound is synthesised from code: no samples, no recordings, no third party audio of any kind, and no generative audio model. Nothing here is musical.

---

## What is in the box

| | |
|---|---|
| Sounds | **110** |
| Formats | `.wav` (16 bit, 44.1 kHz, mono) **and** `.ogg` |
| Seamless loops | 7, loop points written into every loop file |
| Ladders | 3 |
| Mechanisms | 3 |
| Variation sets | 40 |
| Total audio | 1 min 60 s |
| Shortest / longest | 258 ms / 4.00 s |

## Licence, the short version

**Royalty free. Commercial use. No attribution required.** Use these sounds in any number of commercial and non commercial games, on any platform, forever. You may modify them freely. The only thing you may not do is resell or redistribute the sounds themselves as a sound library or asset pack. Full terms in `LICENSE.txt`. If you would like to credit it anyway, this line is enough:

```
Sound effects: "Home Crowd Football: Snap, Pads and Stadium Sound Effects" by Core Systems Asset Factory
```

## The groups

| Group | Files |
|---|---|
| **The snap** | 5 |
| **Throws** | 3 |
| **Catches, drops and fumbles** | 12 |
| **Kicks and the uprights** | 10 |
| **Contact** | 24 |
| **Tackles** | 7 |
| **Cleats** | 7 |
| **Helmets** | 6 |
| **The chains** | 4 |
| **Whistles and the horn** | 6 |
| **The stadium** | 13 |
| **Blocking sled** | 3 |
| **Field tarp** | 3 |
| **Ball launcher** | 3 |
| **Field and stadium beds** | 4 |

## The grid

4 x 3: shoulder pads, a helmet, the turf and a padded sideline wall, each answering light, firm and heavy. Change one word in a file name to change the feel without changing the code.

| | Light | Firm | Heavy |
|---|---|---|---|
| Shoulder pads | `hit_pads_light` | `hit_pads_firm` | `hit_pads_heavy` |
| A helmet | `hit_helmet_light` | `hit_helmet_firm` | `hit_helmet_heavy` |
| The turf | `hit_turf_light` | `hit_turf_firm` | `hit_turf_heavy` |
| A padded sideline wall | `hit_wall_light` | `hit_wall_firm` | `hit_wall_heavy` |

The gate compares every pair along each row and each column (at least **9%** apart in brightness or **18%** in length): **30** pairs compared, indistinct: **0**.

## The ladders

Measured from the shipped files, so a game can wire the rung to a number it already has.

- **kick** (brightness): a kick from a pooch kick to a kickoff, each struck harder and brighter than the last. `kick_pooch` 498 Hz < `kick_punt` 637 Hz < `kick_field` 861 Hz < `kick_off` 1215 Hz
- **throw** (brightness): a throw from a lob to a bullet, each faster and brighter than the last. `throw_lob` 1095 Hz < `throw_touch` 1936 Hz < `throw_bullet` 3348 Hz
- **stadium** (brightness): the stadium from a hum to a full roar, each fuller and brighter than the last. `stadium_hum` 689 Hz < `stadium_stir` 1159 Hz < `stadium_rise` 1733 Hz < `stadium_surge` 2463 Hz < `stadium_roar` 3090 Hz

Every brightness step is at least **8%**, every length step at least **12%**, and every ladder at least **1.5x** end to end: **9** steps compared, failing steps: **0**. A ladder climbs by brightness or length, never by a musical scale.

## States

| Mechanism | States |
|---|---|
| Blocking sled | hit `sled_hit`, drive `sled_drive_loop`, stop `sled_stop` |
| Field tarp | start `tarp_start`, roll `tarp_roll_loop`, stop `tarp_stop` |
| Ball launcher | start `launcher_start`, spin `launcher_spin_loop`, shot `launcher_shot` |

**9** state pairs compared, each at least **9%** apart in brightness or **18%** in length; indistinct pairs: **0**. Play the enter, start the hold loop under its tail, and play the exit when the state ends.

## Loops

Only files named `_loop` loop, and the loop region is the **whole file**, written as `smpl` points in the `.wav` and as `LOOPSTART` and `LOOPLENGTH` tags in the `.ogg`.

`sled_drive_loop`, `tarp_roll_loop`, `launcher_spin_loop`, `practice_field_loop`, `stadium_quiet_loop`, `stadium_third_down_loop`, `stadium_tunnel_loop`.

## Avoiding repetition

40 sounds ship as **variation sets**: separate renders, not copies of one file. Play a random member that did not play last. Measured on the shipped files: brightness differs between takes by 9% to 96%, and length by 25% to 86%.

## One level

Every file is normalised to one loudness target. The measured inner loudness range (10th to 90th percentile) across all 110 files is **3.78 dB**.

## Import notes

**Unity**: drop the `ogg` folder into `Assets/`. For a `_loop` file, tick *Loop* on the `AudioSource`. Hold a variation set in an `AudioClip[]` and call `AudioSource.PlayOneShot(clip)`.

**Unreal**: import the `wav` folder. For a `_loop` file, tick *Looping* on the Sound Wave. Make a Sound Cue with a **Random** node over a variation set.

**Godot**: import the `wav` folder for the `_loop` files; Godot reads their `smpl` loop points on import with default settings. The `.ogg` loops import with *Loop* off: select them, tick *Loop* in the Import dock (Loop Offset 0) and press *Reimport*. One shots import with *Loop* off. Put a variation set in an `AudioStreamRandomizer` (Godot 4).

**GameMaker**: import the `ogg` folder as sounds. For a `_loop` file: `audio_play_sound(snd, priority, true)`. Resolve a built name with `asset_get_index`.

**RPG Maker MV / MZ**: use the `ogg` files. One shots go in `audio/se`; `_loop` files go in `audio/bgs`, and their loop tags are read by the engine.

**Web / HTML5**: use the `ogg` files. For a `_loop` file, set `loop = true` on the `AudioBufferSourceNode`.

## Proof

`pack_proof.json` carries a **sha256 for every audio file** and the full measurement record (peak, RMS, duration, spectral centroid, edge trim, loop seam) behind **1,008 signal checks, 0 of which failed**. `cross_pack_proof.json` compares every file here against the studio's nearest packs (Kickoff, Matchday/Baseball, Matchday/IceHockey, Footfall, Haymaker and Squall: **129,580** pairs), on spectral shape and envelope, each tolerant of a transposition: **129,580** of 129,580 measure as separate sounds.

## Honest limits

- There is no snap count, no announcer, no referee call, no band and no chant: nothing here is a voice or a tune. The stadium is noise, feet and hands.
- The whistle and the stadium horn are one pitch each; ladders climb by brightness, never by a musical scale.
- Every hit is one contact; the kit does not model a cracked shell or an injury.
- The files are mono. Position them yourself.
- The proof files measure **signal**, not taste. They certify there is no measurable defect: no clipping, no silence, no abrupt edges, no broken loop, no ladder step out of order. They cannot tell you the kit sounds good to you. Listen to the free demo first; that is what it is for.

---

*Core Systems Asset Factory · Home Crowd Football: Snap, Pads and Stadium Sound Effects · version 1.0.0 · 110 sounds · 1,008 checks passed*
