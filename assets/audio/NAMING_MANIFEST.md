# Home Crowd Football: file naming

110 sounds, 7 of them seamless loops. Every file ships as `wav/<id>.wav` and `ogg/<id>.ogg` with the same id, so switching format needs no renaming.

## The convention

- `snap_exchange_NN`, `shotgun_snap_NN`: the snap. `throw_<speed>`: one rung of the throw ladder, `lob`, `touch`, `bullet`, each faster and brighter.
- `catch_<hands|body|diving>_NN`, `drop_incomplete_NN`, `fumble_bounce_NN`: catches, drops and the oblong ball bouncing loose.
- `kick_<power>`: one rung of the kick ladder, `pooch`, `punt`, `field`, `off`. `ball_hold_NN`, `blocked_kick_NN`, `upright_hit_NN`: the rest of the kicking game.
- `hit_<surface>_<force>_NN`: a body meeting something. Surfaces: `pads`, `helmet`, `turf`, `wall`. Forces: `light`, `firm`, `heavy`. Change one word to change the play.
- `tackle_wrap_NN`, `tackle_pile_NN`, `stiff_arm_NN`: tackles. `cleats_<run|cut|concrete>_NN`: cleats. `chin_strap_NN`, `helmet_knock_NN`, `facemask_rattle_NN`: helmets. `chains_<move|measure>_NN`: the chains.
- `whistle_<short|dead>_NN`, `stadium_horn_NN`: the officials and the horn, one pitch each, never a voice. `stadium_<state>`: one rung of the stadium ladder, `hum` to `roar`; `stadium_touchdown_NN`, `stadium_big_hit_NN`, `stadium_turnover_NN`, `stadium_applause_NN` are reactions.
- `sled_*`, `tarp_*`, `launcher_*`: one thing through its states (see Mechanisms). Files ending `_loop` are seamless.
- A name ending `_loop` loops seamlessly (loop points in the WAV `smpl` chunk and the OGG `LOOPSTART`/`LOOPLENGTH` tags). Nothing else does.
- A name ending `_NN` is one take of a variation set; pick one at random that did not play last.

## Ladders (wire the rung to a number your game already has)

- **kick** (4 rungs, rising in brightness): `kick_pooch` → `kick_punt` → `kick_field` → `kick_off`. A kick from a pooch kick to a kickoff, each struck harder and brighter than the last.
- **throw** (3 rungs, rising in brightness): `throw_lob` → `throw_touch` → `throw_bullet`. A throw from a lob to a bullet, each faster and brighter than the last.
- **stadium** (5 rungs, rising in brightness): `stadium_hum` → `stadium_stir` → `stadium_rise` → `stadium_surge` → `stadium_roar`. The stadium from a hum to a full roar, each fuller and brighter than the last.

## Mechanisms (each state of one thing, with a loop to hold where it lasts)

- **Blocking sled**: hit `sled_hit`, drive (loop) `sled_drive_loop`, stop `sled_stop`.
- **Field tarp**: start `tarp_start`, roll (loop) `tarp_roll_loop`, stop `tarp_stop`.
- **Ball launcher**: start `launcher_start`, spin (loop) `launcher_spin_loop`, shot `launcher_shot`.

## The grid (surface by force)

| surface | Light | Firm | Heavy |
|---|---|---|---|
| Shoulder pads | `hit_pads_light_NN` (2) | `hit_pads_firm_NN` (2) | `hit_pads_heavy_NN` (2) |
| A helmet | `hit_helmet_light_NN` (2) | `hit_helmet_firm_NN` (2) | `hit_helmet_heavy_NN` (2) |
| The turf | `hit_turf_light_NN` (2) | `hit_turf_firm_NN` (2) | `hit_turf_heavy_NN` (2) |
| A padded sideline wall | `hit_wall_light_NN` (2) | `hit_wall_firm_NN` (2) | `hit_wall_heavy_NN` (2) |

## Variation sets

`snap_exchange` (3), `shotgun_snap` (2), `catch_hands` (3), `catch_body` (2), `catch_diving` (2), `drop_incomplete` (2), `fumble_bounce` (3), `ball_hold` (2), `blocked_kick` (2), `upright_hit` (2), `hit_pads_light` (2), `hit_pads_firm` (2), `hit_pads_heavy` (2), `hit_helmet_light` (2), `hit_helmet_firm` (2), `hit_helmet_heavy` (2), `hit_turf_light` (2), `hit_turf_firm` (2), `hit_turf_heavy` (2), `hit_wall_light` (2), `hit_wall_firm` (2), `hit_wall_heavy` (2), `tackle_wrap` (3), `tackle_pile` (2), `stiff_arm` (2), `cleats_run` (3), `cleats_cut` (2), `cleats_concrete` (2), `chin_strap` (2), `helmet_knock` (2), `facemask_rattle` (2), `chains_move` (2), `chains_measure` (2), `whistle_short` (2), `whistle_dead` (2), `stadium_horn` (2), `stadium_touchdown` (2), `stadium_big_hit` (2), `stadium_turnover` (2), `stadium_applause` (2).

## Every group

- **The snap** (5): `snap_exchange_01`, `snap_exchange_02`, `snap_exchange_03`, `shotgun_snap_01`, `shotgun_snap_02`
- **Throws** (3): `throw_lob`, `throw_touch`, `throw_bullet`
- **Catches, drops and fumbles** (12): `catch_hands_01`, `catch_hands_02`, `catch_hands_03`, `catch_body_01`, `catch_body_02`, `catch_diving_01`, `catch_diving_02`, `drop_incomplete_01`, `drop_incomplete_02`, `fumble_bounce_01`, `fumble_bounce_02`, `fumble_bounce_03`
- **Kicks and the uprights** (10): `kick_pooch`, `kick_punt`, `kick_field`, `kick_off`, `ball_hold_01`, `ball_hold_02`, `blocked_kick_01`, `blocked_kick_02`, `upright_hit_01`, `upright_hit_02`
- **Contact** (24): `hit_pads_light_01`, `hit_pads_light_02`, `hit_pads_firm_01`, `hit_pads_firm_02`, `hit_pads_heavy_01`, `hit_pads_heavy_02`, `hit_helmet_light_01`, `hit_helmet_light_02`, `hit_helmet_firm_01`, `hit_helmet_firm_02`, `hit_helmet_heavy_01`, `hit_helmet_heavy_02`, `hit_turf_light_01`, `hit_turf_light_02`, `hit_turf_firm_01`, `hit_turf_firm_02`, `hit_turf_heavy_01`, `hit_turf_heavy_02`, `hit_wall_light_01`, `hit_wall_light_02`, `hit_wall_firm_01`, `hit_wall_firm_02`, `hit_wall_heavy_01`, `hit_wall_heavy_02`
- **Tackles** (7): `tackle_wrap_01`, `tackle_wrap_02`, `tackle_wrap_03`, `tackle_pile_01`, `tackle_pile_02`, `stiff_arm_01`, `stiff_arm_02`
- **Cleats** (7): `cleats_run_01`, `cleats_run_02`, `cleats_run_03`, `cleats_cut_01`, `cleats_cut_02`, `cleats_concrete_01`, `cleats_concrete_02`
- **Helmets** (6): `chin_strap_01`, `chin_strap_02`, `helmet_knock_01`, `helmet_knock_02`, `facemask_rattle_01`, `facemask_rattle_02`
- **The chains** (4): `chains_move_01`, `chains_move_02`, `chains_measure_01`, `chains_measure_02`
- **Whistles and the horn** (6): `whistle_short_01`, `whistle_short_02`, `whistle_dead_01`, `whistle_dead_02`, `stadium_horn_01`, `stadium_horn_02`
- **The stadium** (13): `stadium_hum`, `stadium_stir`, `stadium_rise`, `stadium_surge`, `stadium_roar`, `stadium_touchdown_01`, `stadium_touchdown_02`, `stadium_big_hit_01`, `stadium_big_hit_02`, `stadium_turnover_01`, `stadium_turnover_02`, `stadium_applause_01`, `stadium_applause_02`
- **Blocking sled** (3): `sled_hit`, `sled_drive_loop`, `sled_stop`
- **Field tarp** (3): `tarp_start`, `tarp_roll_loop`, `tarp_stop`
- **Ball launcher** (3): `launcher_start`, `launcher_spin_loop`, `launcher_shot`
- **Field and stadium beds** (4): `practice_field_loop`, `stadium_quiet_loop`, `stadium_third_down_loop`, `stadium_tunnel_loop`

<!-- every file: generated by HomeCrowd/Internal_Ops/make_docs.js from pack.json -->

## Every file (110)

Measured from the shipped files: duration in seconds and brightness as the energy weighted spectral centroid.

### The snap

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `snap_exchange_01` | take | 1 | 0.44 s | 1624 Hz |
| `snap_exchange_02` | take | 2 | 0.29 s | 1723 Hz |
| `snap_exchange_03` | take | 3 | 0.63 s | 1572 Hz |
| `shotgun_snap_01` | take | 1 | 0.80 s | 1291 Hz |
| `shotgun_snap_02` | take | 2 | 0.52 s | 1722 Hz |

### Throws

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `throw_lob` | ladder rung | - | 0.51 s | 1095 Hz |
| `throw_touch` | ladder rung | - | 0.37 s | 1936 Hz |
| `throw_bullet` | ladder rung | - | 0.26 s | 3348 Hz |

### Catches, drops and fumbles

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `catch_hands_01` | take | 1 | 0.42 s | 1195 Hz |
| `catch_hands_02` | take | 2 | 0.28 s | 1461 Hz |
| `catch_hands_03` | take | 3 | 0.61 s | 1204 Hz |
| `catch_body_01` | take | 1 | 0.48 s | 993 Hz |
| `catch_body_02` | take | 2 | 0.31 s | 1635 Hz |
| `catch_diving_01` | take | 1 | 0.88 s | 1593 Hz |
| `catch_diving_02` | take | 2 | 0.57 s | 2170 Hz |
| `drop_incomplete_01` | take | 1 | 0.97 s | 1492 Hz |
| `drop_incomplete_02` | take | 2 | 0.72 s | 1637 Hz |
| `fumble_bounce_01` | take | 1 | 1.02 s | 1298 Hz |
| `fumble_bounce_02` | take | 2 | 0.65 s | 1751 Hz |
| `fumble_bounce_03` | take | 3 | 1.58 s | 1261 Hz |

### Kicks and the uprights

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `kick_pooch` | ladder rung | - | 0.34 s | 498 Hz |
| `kick_punt` | ladder rung | - | 0.34 s | 637 Hz |
| `kick_field` | ladder rung | - | 0.34 s | 861 Hz |
| `kick_off` | ladder rung | - | 0.34 s | 1215 Hz |
| `ball_hold_01` | take | 1 | 0.52 s | 1234 Hz |
| `ball_hold_02` | take | 2 | 0.33 s | 1907 Hz |
| `blocked_kick_01` | take | 1 | 0.53 s | 1624 Hz |
| `blocked_kick_02` | take | 2 | 0.34 s | 2735 Hz |
| `upright_hit_01` | take | 1 | 1.80 s | 1032 Hz |
| `upright_hit_02` | take | 2 | 1.13 s | 1225 Hz |

### Contact

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `hit_pads_light_01` | take | 1 | 0.48 s | 271 Hz |
| `hit_pads_light_02` | take | 2 | 0.31 s | 541 Hz |
| `hit_pads_firm_01` | take | 1 | 0.53 s | 615 Hz |
| `hit_pads_firm_02` | take | 2 | 0.34 s | 693 Hz |
| `hit_pads_heavy_01` | take | 1 | 0.68 s | 1598 Hz |
| `hit_pads_heavy_02` | take | 2 | 0.45 s | 2257 Hz |
| `hit_helmet_light_01` | take | 1 | 0.55 s | 853 Hz |
| `hit_helmet_light_02` | take | 2 | 0.37 s | 969 Hz |
| `hit_helmet_firm_01` | take | 1 | 0.60 s | 977 Hz |
| `hit_helmet_firm_02` | take | 2 | 0.42 s | 1350 Hz |
| `hit_helmet_heavy_01` | take | 1 | 0.62 s | 1211 Hz |
| `hit_helmet_heavy_02` | take | 2 | 0.48 s | 1795 Hz |
| `hit_turf_light_01` | take | 1 | 0.71 s | 454 Hz |
| `hit_turf_light_02` | take | 2 | 0.47 s | 773 Hz |
| `hit_turf_firm_01` | take | 1 | 0.82 s | 652 Hz |
| `hit_turf_firm_02` | take | 2 | 0.54 s | 852 Hz |
| `hit_turf_heavy_01` | take | 1 | 0.97 s | 929 Hz |
| `hit_turf_heavy_02` | take | 2 | 0.64 s | 1164 Hz |
| `hit_wall_light_01` | take | 1 | 0.55 s | 238 Hz |
| `hit_wall_light_02` | take | 2 | 0.35 s | 399 Hz |
| `hit_wall_firm_01` | take | 1 | 0.61 s | 314 Hz |
| `hit_wall_firm_02` | take | 2 | 0.39 s | 476 Hz |
| `hit_wall_heavy_01` | take | 1 | 0.70 s | 506 Hz |
| `hit_wall_heavy_02` | take | 2 | 0.46 s | 1444 Hz |

### Tackles

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `tackle_wrap_01` | take | 1 | 0.69 s | 1363 Hz |
| `tackle_wrap_02` | take | 2 | 0.45 s | 1551 Hz |
| `tackle_wrap_03` | take | 3 | 0.90 s | 1643 Hz |
| `tackle_pile_01` | take | 1 | 1.32 s | 914 Hz |
| `tackle_pile_02` | take | 2 | 0.87 s | 1355 Hz |
| `stiff_arm_01` | take | 1 | 0.55 s | 722 Hz |
| `stiff_arm_02` | take | 2 | 0.36 s | 959 Hz |

### Cleats

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `cleats_run_01` | take | 1 | 1.01 s | 1599 Hz |
| `cleats_run_02` | take | 2 | 0.69 s | 2143 Hz |
| `cleats_run_03` | take | 3 | 1.44 s | 2012 Hz |
| `cleats_cut_01` | take | 1 | 0.53 s | 2997 Hz |
| `cleats_cut_02` | take | 2 | 0.34 s | 3885 Hz |
| `cleats_concrete_01` | take | 1 | 1.23 s | 4094 Hz |
| `cleats_concrete_02` | take | 2 | 0.81 s | 5021 Hz |

### Helmets

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `chin_strap_01` | take | 1 | 0.49 s | 2057 Hz |
| `chin_strap_02` | take | 2 | 0.32 s | 2729 Hz |
| `helmet_knock_01` | take | 1 | 0.51 s | 815 Hz |
| `helmet_knock_02` | take | 2 | 0.33 s | 1065 Hz |
| `facemask_rattle_01` | take | 1 | 0.81 s | 1620 Hz |
| `facemask_rattle_02` | take | 2 | 0.53 s | 2004 Hz |

### The chains

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `chains_move_01` | take | 1 | 1.25 s | 3501 Hz |
| `chains_move_02` | take | 2 | 0.81 s | 4502 Hz |
| `chains_measure_01` | take | 1 | 0.87 s | 3210 Hz |
| `chains_measure_02` | take | 2 | 0.59 s | 3824 Hz |

### Whistles and the horn

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `whistle_short_01` | take | 1 | 0.58 s | 4466 Hz |
| `whistle_short_02` | take | 2 | 0.37 s | 5359 Hz |
| `whistle_dead_01` | take | 1 | 1.34 s | 4475 Hz |
| `whistle_dead_02` | take | 2 | 0.88 s | 5386 Hz |
| `stadium_horn_01` | take | 1 | 1.93 s | 1190 Hz |
| `stadium_horn_02` | take | 2 | 1.28 s | 1637 Hz |

### The stadium

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `stadium_hum` | ladder rung | - | 2.14 s | 689 Hz |
| `stadium_stir` | ladder rung | - | 2.14 s | 1159 Hz |
| `stadium_rise` | ladder rung | - | 2.14 s | 1733 Hz |
| `stadium_surge` | ladder rung | - | 2.16 s | 2463 Hz |
| `stadium_roar` | ladder rung | - | 2.17 s | 3090 Hz |
| `stadium_touchdown_01` | take | 1 | 3.44 s | 2721 Hz |
| `stadium_touchdown_02` | take | 2 | 2.34 s | 3236 Hz |
| `stadium_big_hit_01` | take | 1 | 1.84 s | 1786 Hz |
| `stadium_big_hit_02` | take | 2 | 1.25 s | 2011 Hz |
| `stadium_turnover_01` | take | 1 | 2.50 s | 2101 Hz |
| `stadium_turnover_02` | take | 2 | 1.67 s | 2532 Hz |
| `stadium_applause_01` | take | 1 | 2.92 s | 2617 Hz |
| `stadium_applause_02` | take | 2 | 1.83 s | 3567 Hz |

### Blocking sled

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `sled_hit` | one shot | - | 0.78 s | 313 Hz |
| `sled_drive_loop` | loop | - | 4.00 s | 1315 Hz |
| `sled_stop` | one shot | - | 1.51 s | 662 Hz |

### Field tarp

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `tarp_start` | one shot | - | 1.58 s | 1711 Hz |
| `tarp_roll_loop` | loop | - | 4.00 s | 2249 Hz |
| `tarp_stop` | one shot | - | 1.33 s | 1169 Hz |

### Ball launcher

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `launcher_start` | one shot | - | 1.67 s | 1170 Hz |
| `launcher_spin_loop` | loop | - | 4.00 s | 1920 Hz |
| `launcher_shot` | one shot | - | 0.82 s | 1987 Hz |

### Field and stadium beds

| File | Type | Take | Duration | Brightness |
|---|---|---|---|---|
| `practice_field_loop` | loop | - | 4.00 s | 735 Hz |
| `stadium_quiet_loop` | loop | - | 4.00 s | 1352 Hz |
| `stadium_third_down_loop` | loop | - | 4.00 s | 2203 Hz |
| `stadium_tunnel_loop` | loop | - | 4.00 s | 592 Hz |
