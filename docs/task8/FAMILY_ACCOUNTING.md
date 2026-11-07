# Task 8: family and form accounting (192 families, 222 forms)

Generated 2026-11-06 for the Phase 1 audit from `docs/beast-dex/data/{families,forms,abilities}.json` and the code at `cbd0d77` (`src/data/species.js`, `src/data/clash-moves.js`). The code-status columns come from the football and Beast Clash inventories ([inventory/B-football.md](inventory/B-football.md) §3, [inventory/C-clash.md](inventory/C-clash.md) §3).

Code status: **partial** = same trigger/target concept but different mechanics; **legacy-different** = different mechanic (often the same name); **missing** = only a shared common trait. No ability is implemented as specified (0 matches in either mode).

| Totals | Families | Forms | Football abilities | Clash abilities |
| --- | ---: | ---: | ---: | ---: |
| Original (incl. 12 legendary) | 72 | 102 | 72 | 72 |
| Basic | 120 | 120 | 0 | 0 |
| **All** | **192** | **222** | **72** | **72** |

| Family ID | Name | Type | Rarity | Position | Clash archetype | Forms | Football ability (Dex) | Football code today | Clash ability (Dex) | Clash code today | Current game vs Dex |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| emberfox | Flaroo | Fire | common | RB | Balanced | 3 | FIR-01-F Blazing Resolve | missing | FIR-01-C Stoke the Flame | legacy-different | archetype Striker→Balanced |
| ashkit | Cindruff | Fire | common | LB | Disruptor | 2 | FIR-02-F Impact Pyre | missing | FIR-02-C Cinder Clamp | legacy-different | archetype Balanced→Disruptor |
| firestorm | Pyronix | Fire | uncommon | QB | Striker | 1 | FIR-03-F Meteor Impact | legacy-different | FIR-03-C Falling Star | legacy-different | unchanged |
| cinderclaw | Scorchulk | Fire | uncommon | DL | Balanced | 1 | FIR-04-F Ember Grip — Scorch Mark | legacy-different | FIR-04-C Molten Brand | legacy-different | archetype Striker→Balanced |
| pyrelynx | Flarynx | Fire | rare | CB | Tank | 1 | FIR-05-F Heat Haze | legacy-different | FIR-05-C Heat Mirage | legacy-different | archetype Disruptor→Tank |
| pyroclast | Pyroclast | Fire | legendary | TE | Disruptor | 1 | FIR-06-F Eruption — Burning Wake | legacy-different | FIR-06-C Faultline | legacy-different | archetype Tank→Disruptor |
| tidepaw | Aquip | Water | common | CB | Support | 3 | WAT-01-F Splashdown | missing | WAT-01-C Second Tide | partial | unchanged |
| mudcub | Muddlet | Water | common | OL | Tank | 2 | WAT-02-F Divided Guard | missing | WAT-02-C Shared Burden | legacy-different | archetype Disruptor→Tank |
| reefclaw | Crustank | Water | uncommon | DL | Tank | 1 | WAT-03-F Pressure Drain | legacy-different | WAT-03-C Shell Renewal | legacy-different | unchanged |
| tidefin | Ripplet | Water | rare | WR | Disruptor | 1 | WAT-04-F Second Touch | legacy-different | WAT-04-C Wash Away | legacy-different | rarity uncommon→rare |
| wavehorn | Tideram | Water | uncommon | TE | Balanced | 1 | WAT-05-F Breakwater | legacy-different | WAT-05-C Riptide Charge | partial | rarity rare→uncommon |
| tsunarok | Tsunarok | Water | legendary | S | Disruptor | 1 | WAT-06-F Tsunami Line | legacy-different | WAT-06-C Riptide Pursuit | legacy-different | unchanged |
| thornkit | Spriglet | Nature | common | WR | Support | 3 | NAT-01-F Bloom Break | missing | NAT-01-C Second Spring | legacy-different | unchanged |
| mossclaw | Mossmaw | Nature | common | DL | Balanced | 2 | NAT-02-F Vine Vault | missing | NAT-02-C Spore Detonation | legacy-different | unchanged |
| rootram | Bramblet | Nature | uncommon | OL | Tank | 1 | NAT-03-F Deep Roots | partial | NAT-03-C Last Root | legacy-different | unchanged |
| leafhorn | Florant | Nature | uncommon | S | Support | 1 | NAT-04-F Surefoot Canopy | legacy-different | NAT-04-C Canopy Assist | legacy-different | unchanged |
| thornback | Thornback | Nature | rare | TE | Tank | 1 | NAT-05-F Bramble Trap | legacy-different | NAT-05-C Shell Harvest | partial | unchanged |
| elderoot | Elderoot | Nature | legendary | LB | Support | 1 | NAT-06-F Grove Guardian | legacy-different | NAT-06-C Root Communion | legacy-different | unchanged |
| flicker | Zippit | Electric | common | WR | Support | 2 | ELE-01-F Crossed Wires | missing | ELE-01-C Lightning Rod | legacy-different | unchanged |
| voltfin | Volcoil | Electric | common | RB | Balanced | 2 | ELE-02-F Charge Strip | missing | ELE-02-C Arc Rebound | legacy-different | unchanged |
| voltfang | Zappard | Electric | uncommon | WR | Striker | 1 | ELE-03-F Phase Release | legacy-different | ELE-03-C Phase Strike | legacy-different | unchanged |
| stormlynx | Statyx | Electric | uncommon | S | Disruptor | 1 | ELE-04-F Static Field | legacy-different | ELE-04-C Circuit Breaker | legacy-different | unchanged |
| joltrex | Joltrex | Electric | rare | DL | Striker | 1 | ELE-05-F Chain Break | legacy-different | ELE-05-C Victory Surge | legacy-different | unchanged |
| stormcrown | Voltarch | Electric | legendary | QB | Striker | 1 | ELE-06-F Stormguard | legacy-different | ELE-06-C Twin Thunder | legacy-different | unchanged |
| snowmoth | Flurrit | Ice | common | K | Support | 2 | ICE-01-F Frostmark | missing | ICE-01-C Fresh Start | legacy-different | unchanged |
| hailfang | Frostpup | Ice | common | CB | Disruptor | 2 | ICE-02-F Frost Nip | missing | ICE-02-C Cold Welcome | legacy-different | unchanged |
| frostclaw | Cryolynx | Ice | uncommon | LB | Balanced | 1 | ICE-03-F Snowfall Slam | legacy-different | ICE-03-C Snowbank Shot | legacy-different | unchanged |
| icehorn | Glaciram | Ice | common | DL | Tank | 1 | ICE-04-F Permafrost | legacy-different | ICE-04-C Snowdrift Shelter | legacy-different | rarity uncommon→common |
| glaciron | Shardok | Ice | rare | OL | Tank | 1 | ICE-05-F Cold Snap | legacy-different | ICE-05-C Glacier Wall | partial | unchanged |
| glacivern | Glacivern | Ice | legendary | K | Disruptor | 1 | ICE-06-F Second Chance | legacy-different | ICE-06-C Deep Winter | legacy-different | position S→K |
| gustling | Gustling | Wind | common | WR | Support | 3 | WIN-01-F Runway | missing | WIN-01-C Feather Relay | partial | unchanged |
| breezefang | Zephyroo | Wind | common | RB | Balanced | 2 | WIN-02-F Slipstream Step | missing | WIN-02-C Gust Hop | partial | unchanged |
| skywarden | Aeralis | Wind | uncommon | CB | Disruptor | 1 | WIN-03-F Air Brake | legacy-different | WIN-03-C Downdraft | partial | unchanged |
| windlynx | Galyx | Wind | rare | S | Support | 1 | WIN-04-F Crosswind Rescue | legacy-different | WIN-04-C Second Wind | partial | rarity uncommon→rare |
| zephyr | Zephiro | Wind | rare | QB | Support | 1 | WIN-05-F Tailwind Huddle | legacy-different | WIN-05-C Tailwind Pact | partial | unchanged |
| tempestra | Tempestra | Wind | legendary | WR | Disruptor | 1 | WIN-06-F Cyclonic Release | legacy-different | WIN-06-C Eye of the Storm | legacy-different | unchanged |
| pebble | Pebblit | Earth | common | OL | Tank | 3 | EAR-01-F Clean Sweep | missing | EAR-01-C Emergency Cover | legacy-different | unchanged |
| rockram | Craggo | Earth | common | LB | Balanced | 2 | EAR-02-F Stonewall Swat | missing | EAR-02-C Rubble Reprisal | legacy-different | unchanged |
| boulderox | Bouldrox | Earth | uncommon | RB | Tank | 1 | EAR-03-F Stone Charge | legacy-different | EAR-03-C Unbroken Charge | legacy-different | unchanged |
| stoneguard | Granigor | Earth | uncommon | K | Striker | 1 | EAR-04-F Stone Cradle | legacy-different | EAR-04-C Bank Shot | legacy-different | position DL→K |
| terrabull | Terrabull | Earth | uncommon | TE | Disruptor | 1 | EAR-05-F Stone Screen | legacy-different | EAR-05-C Stone Divide | legacy-different | rarity rare→uncommon |
| titanolith | Titanolith | Earth | legendary | OL | Tank | 1 | EAR-06-F Landslide | legacy-different | EAR-06-C Mountain Shelter | legacy-different | unchanged |
| shadowkit | Umbrikit | Dark | common | CB | Balanced | 2 | DAR-01-F Shadow Patch | missing | DAR-01-C Shadow Pounce | legacy-different | unchanged |
| nightowl | Noctlet | Dark | common | S | Striker | 2 | DAR-02-F Night Watch | missing | DAR-02-C Night Swoop | partial | archetype Balanced→Striker |
| duskrunner | Duskyre | Dark | rare | RB | Striker | 1 | DAR-03-F Vanishing Cut | partial | DAR-03-C Predator Rhythm | legacy-different | rarity uncommon→rare |
| mireclaw | Murklaw | Dark | uncommon | LB | Striker | 1 | DAR-04-F Ambush Tag | legacy-different | DAR-04-C Ambush | partial | unchanged |
| nocturne | Nocturne | Dark | rare | QB | Disruptor | 1 | DAR-05-F Blackout Pocket | legacy-different | DAR-05-C Eclipse Call | legacy-different | position WR→QB |
| nyxshade | Nyxshade | Dark | legendary | CB | Disruptor | 1 | DAR-06-F Shadow Exchange | legacy-different | DAR-06-C Eclipse Theft | legacy-different | unchanged |
| glimmer | Lumini | Light | common | WR | Support | 2 | LIG-01-F Beacon Lane | missing | LIG-01-C Glow Mend | partial | unchanged |
| sunwhistle | Solchirp | Light | common | K | Support | 2 | LIG-02-F Dawn Signal | missing | LIG-02-C Dawn Song | partial | unchanged |
| lumen | Lumen | Light | common | QB | Support | 1 | LIG-03-F Guiding Halo | legacy-different | LIG-03-C Clear Light | partial | rarity uncommon→common |
| prism | Prismara | Light | uncommon | S | Disruptor | 1 | LIG-04-F Prism Break | legacy-different | LIG-04-C Refraction | partial | unchanged |
| halofang | Haloryx | Light | rare | LB | Striker | 1 | LIG-05-F Radiant Pursuit | legacy-different | LIG-05-C Radiant Pursuit | partial | unchanged |
| aurelion | Aurelion | Light | legendary | WR | Striker | 1 | LIG-06-F Daybreak | legacy-different | LIG-06-C Daybreak Lance | partial | unchanged |
| ironcub | Ferrcub | Metal | common | OL | Balanced | 2 | MET-01-F Anchor Plate | missing | MET-01-C Forge Swipe | partial | unchanged |
| steelpaw | Steelpaw | Metal | common | LB | Tank | 2 | MET-02-F Iron Lungs | partial | MET-02-C Tempered Guard | partial | archetype Balanced→Tank |
| gearwing | Coglet | Metal | uncommon | K | Balanced | 1 | MET-03-F Gear Grid | legacy-different | MET-03-C Gear Shot | partial | unchanged |
| ironjaw | Ferronox | Metal | uncommon | DL | Striker | 1 | MET-04-F Ball Clamp | partial | MET-04-C Iron Bite | legacy-different | unchanged |
| metalhorn | Ferrhorn | Metal | rare | TE | Support | 1 | MET-05-F Bulwark Grid | legacy-different | MET-05-C Shield Wall | partial | position OL→TE |
| aegistron | Aegistron | Metal | legendary | DL | Tank | 1 | MET-06-F Fortress Gate | legacy-different | MET-06-C Fortress | legacy-different | position CB→DL |
| mindwing | Psyflutter | Psychic | common | S | Support | 2 | PSY-01-F Mind Bend | missing | PSY-01-C Mind Mend | legacy-different | unchanged |
| shadewisp | Wispira | Psychic | common | CB | Tank | 2 | PSY-02-F Mirror Step | missing | PSY-02-C Mirage Veil | legacy-different | archetype Support→Tank |
| cerebrix | Cerebrix | Psychic | uncommon | QB | Disruptor | 1 | PSY-03-F Foresight | legacy-different | PSY-03-C Foresight | legacy-different | unchanged |
| echolot | Echolot | Psychic | uncommon | K | Balanced | 1 | PSY-04-F Echo Landing | legacy-different | PSY-04-C Echo Strike | partial | position LB→K |
| enigmane | Enigmane | Psychic | rare | TE | Disruptor | 1 | PSY-05-F Mind Game | partial | PSY-05-C Mind Game | legacy-different | unchanged |
| astralux | Astralux | Psychic | legendary | RB | Striker | 1 | PSY-06-F Blink | partial | PSY-06-C Astral Strike | legacy-different | unchanged |
| drakeling | Drakling | Dragon | common | RB | Striker | 3 | DRA-01-F Dragon Pounce | missing | DRA-01-C Dragon Pounce | partial | unchanged |
| wyrmkit | Wyrmlet | Dragon | common | TE | Support | 2 | DRA-02-F Dragon Call | missing | DRA-02-C Coil Renewal | partial | archetype Balanced→Support |
| sablewing | Sablewing | Dragon | uncommon | CB | Balanced | 1 | DRA-03-F Hoard Flight | legacy-different | DRA-03-C Wing Shelter | legacy-different | archetype Disruptor→Balanced |
| scaleguard | Scalor | Dragon | uncommon | OL | Balanced | 1 | DRA-04-F Dragon Stomp | legacy-different | DRA-04-C Dragonhide | legacy-different | unchanged |
| vyrnax | Vyrnax | Dragon | rare | K | Striker | 1 | DRA-05-F Dragon Roar | legacy-different | DRA-05-C Dragon Roar | legacy-different | position DL→K |
| aurodrax | Aurodrax | Dragon | legendary | QB | Balanced | 1 | DRA-06-F Sovereign Arm | partial | DRA-06-C Sovereign Balance | legacy-different | unchanged |
| kindlet | Kindlet | Fire | basic | QB | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| charbun | Charbun | Fire | basic | RB | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| sparkwick | Sparkwick | Fire | basic | WR | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| coalump | Coalump | Fire | basic | TE | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| kilnback | Kilnback | Fire | basic | OL | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| scorchub | Scorchub | Fire | basic | DL | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| embadger | Embadger | Fire | basic | LB | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| singecat | Singecat | Fire | basic | CB | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| ashpeck | Ashpeck | Fire | basic | S | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| fusebug | Fusebug | Fire | basic | K | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| brookit | Brookit | Water | basic | QB | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| ottrip | Ottrip | Water | basic | RB | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| minnodart | Minnodart | Water | basic | WR | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| kelpup | Kelpup | Water | basic | TE | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| barnaclod | Barnaclod | Water | basic | OL | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| sploshog | Sploshog | Water | basic | DL | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| newtide | Newtide | Water | basic | LB | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| pondskip | Pondskip | Water | basic | CB | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| wadelet | Wadelet | Water | basic | S | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| bubblop | Bubblop | Water | basic | K | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| acornet | Acornet | Nature | basic | QB | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| thistlehop | Thistlehop | Nature | basic | RB | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| fernflit | Fernflit | Nature | basic | WR | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| stumpkin | Stumpkin | Nature | basic | TE | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| trunkle | Trunkle | Nature | basic | OL | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| briarhog | Briarhog | Nature | basic | DL | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| barkbug | Barkbug | Nature | basic | LB | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| fawnleaf | Fawnleaf | Nature | basic | CB | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| ivyowl | Ivyowl | Nature | basic | S | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| podling | Podling | Nature | basic | K | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| ampette | Ampette | Electric | basic | QB | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| fuzzvolt | Fuzzvolt | Electric | basic | RB | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| boltdart | Boltdart | Electric | basic | WR | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| wattram | Wattram | Electric | basic | TE | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| capaclod | Capaclod | Electric | basic | OL | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| zaphog | Zaphog | Electric | basic | DL | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| staticub | Staticub | Electric | basic | LB | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| neonnewt | Neonnewt | Electric | basic | CB | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| buzzhawk | Buzzhawk | Electric | basic | S | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| wattlet | Wattlet | Electric | basic | K | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| slatelet | Slatelet | Earth | basic | QB | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| gravelpup | Gravelpup | Earth | basic | RB | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| mudlark | Mudlark | Earth | basic | WR | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| clodhorn | Clodhorn | Earth | basic | TE | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| cobblump | Cobblump | Earth | basic | OL | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| quarrox | Quarrox | Earth | basic | DL | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| diggit | Diggit | Earth | basic | LB | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| pumicat | Pumicat | Earth | basic | CB | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| siltadillo | Siltadillo | Earth | basic | S | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| geodot | Geodot | Earth | basic | K | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| chillip | Chillip | Ice | basic | QB | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| skiddle | Skiddle | Ice | basic | RB | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| snowdart | Snowdart | Ice | basic | WR | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| walrump | Walrump | Ice | basic | TE | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| floebear | Floebear | Ice | basic | OL | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| rimeboar | Rimeboar | Ice | basic | DL | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| hoarcub | Hoarcub | Ice | basic | LB | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| shiverkit | Shiverkit | Ice | basic | CB | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| ptarmilet | Ptarmilet | Ice | basic | S | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| cubeling | Cubeling | Ice | basic | K | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| breezle | Breezle | Wind | basic | QB | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| whirlhare | Whirlhare | Wind | basic | RB | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| kitelet | Kitelet | Wind | basic | WR | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| sailmoth | Sailmoth | Wind | basic | TE | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| nimbulk | Nimbulk | Wind | basic | OL | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| galebuck | Galebuck | Wind | basic | DL | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| windrook | Windrook | Wind | basic | LB | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| swallit | Swallit | Wind | basic | CB | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| pinwhirl | Pinwhirl | Wind | basic | S | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| gustpuff | Gustpuff | Wind | basic | K | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| murkit | Murkit | Dark | basic | QB | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| minkurk | Minkurk | Dark | basic | RB | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| batwhisk | Batwhisk | Dark | basic | WR | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| gloamtoad | Gloamtoad | Dark | basic | TE | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| umbruin | Umbruin | Dark | basic | OL | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| vexhound | Vexhound | Dark | basic | DL | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| crowlurk | Crowlurk | Dark | basic | LB | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| spindlet | Spindlet | Dark | basic | CB | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| gloomoth | Gloomoth | Dark | basic | S | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| inklet | Inklet | Dark | basic | K | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| beamlet | Beamlet | Light | basic | QB | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| glowhare | Glowhare | Light | basic | RB | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| dawnfinch | Dawnfinch | Light | basic | WR | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| lanternox | Lanternox | Light | basic | TE | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| waxwick | Waxwick | Light | basic | OL | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| solram | Solram | Light | basic | DL | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| lumbear | Lumbear | Light | basic | LB | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| glarefly | Glarefly | Light | basic | CB | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| dazzlet | Dazzlet | Light | basic | S | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| twinklet | Twinklet | Light | basic | K | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| rivetto | Rivetto | Metal | basic | QB | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| tinhare | Tinhare | Metal | basic | RB | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| springlet | Springlet | Metal | basic | WR | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| anvilox | Anvilox | Metal | basic | TE | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| kettlump | Kettlump | Metal | basic | OL | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| ingotusk | Ingotusk | Metal | basic | DL | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| brasshound | Brasshound | Metal | basic | LB | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| gyroflit | Gyroflit | Metal | basic | CB | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| clockcrow | Clockcrow | Metal | basic | S | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| washerling | Washerling | Metal | basic | K | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| mindle | Mindle | Psychic | basic | QB | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| dreamhop | Dreamhop | Psychic | basic | RB | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| trancefin | Trancefin | Psychic | basic | WR | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| pondermoose | Pondermoose | Psychic | basic | TE | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| thinkump | Thinkump | Psychic | basic | OL | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| omenox | Omenox | Psychic | basic | DL | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| seerling | Seerling | Psychic | basic | LB | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| riddlet | Riddlet | Psychic | basic | CB | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| gazeling | Gazeling | Psychic | basic | S | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| orblet | Orblet | Psychic | basic | K | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| scalekin | Scalekin | Dragon | basic | QB | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| raptlet | Raptlet | Dragon | basic | RB | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| glidrake | Glidrake | Dragon | basic | WR | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| crestback | Crestback | Dragon | basic | TE | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| bulwyrm | Bulwyrm | Dragon | basic | OL | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| gnashlet | Gnashlet | Dragon | basic | DL | Striker | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| drakhound | Drakhound | Dragon | basic | LB | Tank | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| wyvlet | Wyvlet | Dragon | basic | CB | Disruptor | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| skinklet | Skinklet | Dragon | basic | S | Support | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
| eggling | Eggling | Dragon | basic | K | Balanced | 1 | none (Basic) | — | none (Basic) | — | not in game (new) |
