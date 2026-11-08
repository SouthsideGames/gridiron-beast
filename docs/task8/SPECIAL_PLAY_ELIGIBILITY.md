# Special-play eligibility: kickoffs and two-point conversions (owner ruling N8b, 2026-11-08 01:30)

The rule (SPECIFICATION_BASELINE.md §24):
- On a kickoff or a two-point conversion, a **non-kicker** ability cannot activate or charge.
- A **kicker** ability may act there only when its own approved conditions permit. This is not blanket permission for kicker
  abilities.
- Effects explicitly created by an eligible kicker ability are permitted, for example Dawn Signal's Quickened on a coverage
  teammate.
- Shared statuses carry over and count down as usual; the restriction does not cleanse them.
- The rule overrides conflicting wording in individual contracts for these two play types.

How it is enforced:
- **Engine** (`src/sim/engine.js`, the contract hook dispatcher): on these plays no contract hook runs for anyone except a kicker
  ability (Dex position K) in the kicking unit's K slot on a kickoff.
- **Formula kicks** (field goals, extra points, punts) are not kickoffs or two-point conversions and are unaffected.
- **Tests:** `tests/task8-special-plays.test.js`.
- **Reviewer:** the football Ability Reviewer shows each ability's line from this table.

| # | Ability | Family | Pos | Kickoff | Two-point conversion |
| --- | --- | --- | --- | --- | --- |
| 1 | FIR-01-F Blazing Resolve | emberfox | RB | No: neither activates nor charges | No: neither activates nor charges |
| 2 | FIR-02-F Impact Pyre | ashkit | LB | No: neither activates nor charges | No: neither activates nor charges |
| 3 | FIR-03-F Meteor Impact | firestorm | QB | No: neither activates nor charges | No: neither activates nor charges |
| 4 | FIR-04-F Ember Grip — Scorch Mark | cinderclaw | DL | No: neither activates nor charges | No: neither activates nor charges |
| 5 | FIR-05-F Heat Haze | pyrelynx | CB | No: neither activates nor charges | No: neither activates nor charges |
| 6 | FIR-06-F Eruption — Burning Wake | pyroclast | TE | No: neither activates nor charges | No: neither activates nor charges |
| 7 | WAT-01-F Splashdown | tidepaw | CB | No: neither activates nor charges | No: neither activates nor charges |
| 8 | WAT-02-F Divided Guard | mudcub | OL | No: neither activates nor charges | No: neither activates nor charges |
| 9 | WAT-03-F Pressure Drain | reefclaw | DL | No: neither activates nor charges | No: neither activates nor charges |
| 10 | WAT-04-F Second Touch | tidefin | WR | No: neither activates nor charges | No: neither activates nor charges |
| 11 | WAT-05-F Breakwater | wavehorn | TE | No: neither activates nor charges | No: neither activates nor charges |
| 12 | WAT-06-F Tsunami Line | tsunarok | S | No: neither activates nor charges | No: neither activates nor charges |
| 13 | NAT-01-F Bloom Break | thornkit | WR | No: neither activates nor charges | No: neither activates nor charges |
| 14 | NAT-02-F Vine Vault | mossclaw | DL | No: neither activates nor charges | No: neither activates nor charges |
| 15 | NAT-03-F Deep Roots | rootram | OL | No: neither activates nor charges | No: neither activates nor charges |
| 16 | NAT-04-F Surefoot Canopy | leafhorn | S | No: neither activates nor charges | No: neither activates nor charges |
| 17 | NAT-05-F Bramble Trap | thornback | TE | No: neither activates nor charges | No: neither activates nor charges |
| 18 | NAT-06-F Grove Guardian | elderoot | LB | No: neither activates nor charges | No: neither activates nor charges |
| 19 | ELE-01-F Crossed Wires | flicker | WR | No: neither activates nor charges | No: neither activates nor charges |
| 20 | ELE-02-F Charge Strip | voltfin | RB | No: neither activates nor charges | No: neither activates nor charges |
| 21 | ELE-03-F Phase Release | voltfang | WR | No: neither activates nor charges | No: neither activates nor charges |
| 22 | ELE-04-F Static Field | stormlynx | S | No: neither activates nor charges | No: neither activates nor charges |
| 23 | ELE-05-F Chain Break | joltrex | DL | No: neither activates nor charges | No: neither activates nor charges |
| 24 | ELE-06-F Stormguard | stormcrown | QB | No: neither activates nor charges | No: neither activates nor charges |
| 25 | ICE-01-F Frostmark | snowmoth | K | No: its approved conditions are not kickoff conditions (field goal, extra point or punt only) | No: not on the field; no kicker condition applies |
| 26 | ICE-02-F Frost Nip | hailfang | CB | No: neither activates nor charges | No: neither activates nor charges |
| 27 | ICE-03-F Snowfall Slam | frostclaw | LB | No: neither activates nor charges | No: neither activates nor charges |
| 28 | ICE-04-F Permafrost | icehorn | DL | No: neither activates nor charges | No: neither activates nor charges |
| 29 | ICE-05-F Cold Snap | glaciron | OL | No: neither activates nor charges | No: neither activates nor charges |
| 30 | ICE-06-F Second Chance | glacivern | K | No: its approved conditions are not kickoff conditions (field goal, extra point or punt only) | No: not on the field; no kicker condition applies |
| 31 | WIN-01-F Runway | gustling | WR | No: neither activates nor charges | No: neither activates nor charges |
| 32 | WIN-02-F Slipstream Step | breezefang | RB | No: neither activates nor charges | No: neither activates nor charges |
| 33 | WIN-03-F Air Brake | skywarden | CB | No: neither activates nor charges | No: neither activates nor charges |
| 34 | WIN-04-F Crosswind Rescue | windlynx | S | No: neither activates nor charges | No: neither activates nor charges |
| 35 | WIN-05-F Tailwind Huddle | zephyr | QB | No: neither activates nor charges | No: neither activates nor charges |
| 36 | WIN-06-F Cyclonic Release | tempestra | WR | No: neither activates nor charges | No: neither activates nor charges |
| 37 | EAR-01-F Clean Sweep | pebble | OL | No: neither activates nor charges | No: neither activates nor charges |
| 38 | EAR-02-F Stonewall Swat | rockram | LB | No: neither activates nor charges | No: neither activates nor charges |
| 39 | EAR-03-F Stone Charge | boulderox | RB | No: neither activates nor charges | No: neither activates nor charges |
| 40 | EAR-04-F Stone Cradle | stoneguard | K | No: its approved conditions are not kickoff conditions (field goal, extra point or punt only) | No: not on the field; no kicker condition applies |
| 41 | EAR-05-F Stone Screen | terrabull | TE | No: neither activates nor charges | No: neither activates nor charges |
| 42 | EAR-06-F Landslide | titanolith | OL | No: neither activates nor charges | No: neither activates nor charges |
| 43 | DAR-01-F Shadow Patch | shadowkit | CB | No: neither activates nor charges | No: neither activates nor charges |
| 44 | DAR-02-F Night Watch | nightowl | S | No: neither activates nor charges | No: neither activates nor charges |
| 45 | DAR-03-F Vanishing Cut | duskrunner | RB | No: neither activates nor charges | No: neither activates nor charges |
| 46 | DAR-04-F Ambush Tag | mireclaw | LB | No: neither activates nor charges | No: neither activates nor charges |
| 47 | DAR-05-F Blackout Pocket | nocturne | QB | No: neither activates nor charges | No: neither activates nor charges |
| 48 | DAR-06-F Shadow Exchange | nyxshade | CB | No: neither activates nor charges | No: neither activates nor charges |
| 49 | LIG-01-F Beacon Lane | glimmer | WR | No: neither activates nor charges | No: neither activates nor charges |
| 50 | LIG-02-F Dawn Signal | sunwhistle | K | Yes: casts Dawn Signal on his own kickoff (Quickened on the nearest coverage teammate, an allowed created effect) | No: not on the field; no kicker condition applies |
| 51 | LIG-03-F Guiding Halo | lumen | QB | No: neither activates nor charges | No: neither activates nor charges |
| 52 | LIG-04-F Prism Break | prism | S | No: neither activates nor charges | No: neither activates nor charges |
| 53 | LIG-05-F Radiant Pursuit | halofang | LB | No: neither activates nor charges | No: neither activates nor charges |
| 54 | LIG-06-F Daybreak | aurelion | WR | No: neither activates nor charges | No: neither activates nor charges |
| 55 | MET-01-F Anchor Plate | ironcub | OL | No: neither activates nor charges | No: neither activates nor charges |
| 56 | MET-02-F Iron Lungs | steelpaw | LB | No: neither activates nor charges | No: neither activates nor charges |
| 57 | MET-03-F Gear Grid | gearwing | K | No: its approved conditions are not kickoff conditions (field goal, extra point or punt only) | No: not on the field; no kicker condition applies |
| 58 | MET-04-F Ball Clamp | ironjaw | DL | No: neither activates nor charges | No: neither activates nor charges |
| 59 | MET-05-F Bulwark Grid | metalhorn | TE | No: neither activates nor charges | No: neither activates nor charges |
| 60 | MET-06-F Fortress Gate | aegistron | DL | No: neither activates nor charges | No: neither activates nor charges |
| 61 | PSY-01-F Mind Bend | mindwing | S | No: neither activates nor charges | No: neither activates nor charges |
| 62 | PSY-02-F Mirror Step | shadewisp | CB | No: neither activates nor charges | No: neither activates nor charges |
| 63 | PSY-03-F Foresight | cerebrix | QB | No: neither activates nor charges | No: neither activates nor charges |
| 64 | PSY-04-F Echo Landing | echolot | K | Yes: banks Echo Landing from his own live kickoff caught and returned without a touchdown | No: not on the field; no kicker condition applies |
| 65 | PSY-05-F Mind Game | enigmane | TE | No: neither activates nor charges | No: neither activates nor charges |
| 66 | PSY-06-F Blink | astralux | RB | No: neither activates nor charges | No: neither activates nor charges |
| 67 | DRA-01-F Dragon Pounce | drakeling | RB | No: neither activates nor charges | No: neither activates nor charges |
| 68 | DRA-02-F Dragon Call | wyrmkit | TE | No: neither activates nor charges | No: neither activates nor charges |
| 69 | DRA-03-F Hoard Flight | sablewing | CB | No: neither activates nor charges | No: neither activates nor charges |
| 70 | DRA-04-F Dragon Stomp | scaleguard | OL | No: neither activates nor charges | No: neither activates nor charges |
| 71 | DRA-05-F Dragon Roar | vyrnax | K | No: its approved conditions are not kickoff conditions (field goal, extra point or punt only) | No: not on the field; no kicker condition applies |
| 72 | DRA-06-F Sovereign Arm | aurodrax | QB | No: neither activates nor charges | No: neither activates nor charges |
