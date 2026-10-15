# Gridiron Beast — Monster Naming Guide

How species get their names, and the full audit of the current dex. Applies to every monster added from here on. Written during the monsters pass (October 2026), from the owner's naming brief.

## 1. Philosophy

Monsters are living species in the Gridiron Beast world, not football roles. A name should:

- read as a natural species name (think how a field guide names animals), be memorable and easy to say out loud;
- be 5–11 letters and two to four syllables, with sensible exceptions;
- connect to what the player sees — the sprite's body, size, element, personality;
- fit the monster's evolutionary stage (friendlier first, more imposing later);
- be original: never a Pokémon, Digimon or other franchise name, and never a close respelling of one.

Avoid flat two-word fusions of element + body part (Firestorm, Shadowclaw, Icefang, Rockguard). They are the first thing anyone thinks of, so they read as generic. Never put a football position in a name (no Quarterblaze, no Tacklesaur).

## 2. Techniques

Use a mix; never force one formula across the dex.

| Technique | How | Examples in the dex |
|---|---|---|
| Word fusion | Two concepts blended into one word | Flaroo (flare + kangaroo), Crustank (crustacean + tank), Granigor (granite + gorilla), Volcoil (volt + coil) |
| Modified animal names | Start from the animal the sprite is, then bend it toward the element | Galyx (gale + lynx), Glaciram (glacier + ram), Ferrcub (ferrum + cub), Haloryx (halo + oryx) |
| Mythic and scientific roots | Latin, Greek, mythology, natural phenomena | Umbrikit (umbra + kit), Aegistron (aegis + -tron), Pyronix (pyro + -nix), Ouroborn (ouroboros + born) |
| Invented phonetic names | Believable made-up words that still suggest the creature | Vyrnax, Nyxshade, Cindruff, Statyx |
| Diminutives for small commons | -let, -it, -kit, -ling, -pup | Muddlet, Pebblit, Zippit, Drakling, Frostpup |

## 3. Element voice

Each element has a recognisable vocabulary. It is a palette, not a prefix rule: not every Electric monster starts with "Volt", not every Fire monster with "Pyro".

- **Fire**: heat, ash, cinders, magma, scorch, hard consonants.
- **Water**: currents, tides, ripples, marine life, liquid sounds.
- **Nature**: plants, fungi, roots, sprigs, brambles, botanical Latin.
- **Electric**: volts, static, zap, jolt, snappy phonetics.
- **Earth**: stone, crags, granite, boulders, mass.
- **Ice**: frost, glaciers, shards, cryo-, cold-climate animals.
- **Wind**: gusts, gales, zephyrs, flight, light vowels.
- **Dark**: umbra, dusk, murk, nocturnal animals, obscure myth.
- **Light**: sol, lumen, halo, radiance, celestial words.
- **Metal**: ferrum, chrome, cogs, forges, armour.
- **Psychic**: psy-, mind, wisps, mirages, dreams.
- **Dragon**: drake, wyrm, wyvern, draconic Latin and Greek.

## 4. Rarity tone

- **Common**: approachable, playful, often diminutive (Flaroo, Aquip, Pebblit).
- **Uncommon**: more developed, without necessarily sounding stronger (Zappard, Bramblet, Scalor).
- **Rare**: unusual and a little intimidating (Flarynx, Joltrex, Shardok, Nocturne).
- **Legendary**: mythic and majestic, but not long for its own sake (Pyroclast, Tsunarok, Aurodrax).

Rarity is not evolution stage: a legendary is not an evolved common, and an evolved common is not rarer.

## 5. Evolution families

A family's names should climb: the first stage is simple and friendly, the middle sounds capable, the final sounds powerful. They do not need a shared prefix or suffix, only a recognisable theme.

- Flaroo → Blazynx → Infernox (fire kangaroo grows into a flame beast)
- Aquip → Aquarrel → Abyssin (otter pup to deep-sea cat)
- Pebblit → Cobblon → Orogon (pebble to mountain)
- Gustling → Squallow → Stratosoar (chick to stratosphere glider)

Evolution levels, abilities, rarities and stats never change in a renaming pass. Only commons evolve in this dex (18 once, 6 twice).

## 6. Adding a monster

1. Design first: body, size, look, features, colours, personality. Name what you see.
2. Pick a technique from §2 and the element voice from §3; match the rarity tone in §4.
3. Check the whole dex (base names and evolution names) for duplicates and near-duplicates: same first four letters, same last three letters, or one letter apart.
4. Check it is not an existing franchise's monster name.
5. If it evolves, name the whole family at once and make sure it climbs.
6. Write a one-line rationale next to it (the audit table below is the format).
7. Add it to `src/data/species.js`; `tests/species.test.js` enforces unique names and valid fields.

Species ids (`emberfox`, `tidepaw`, …) are permanent and never change when a display name does; saves store the id. Old display names are mapped in `LEGACY_SPECIES_ALIASES` (`src/data/monsters.js`) so older saves keep loading.

## 7. Audit: current dex

Decision key: KEEP = the previous name already fit; REPLACE = renamed (the owner chose most of these in the review); NEW = an evolved form, designed now and built in Prototype 2.

| Species ID | Previous name | Name | Element | Rarity | Evolution family | Decision | Rationale |
|---|---|---|---|---|---|---|---|
| emberfox | Emberfox | Flaroo | Fire | common | Flaroo → Blazynx → Infernox | REPLACE | owner pick |
| ashkit | Ashkit | Cindruff | Fire | common | Cindruff → Magmaul | REPLACE | owner pick |
| firestorm | Firestorm | Pyronix | Fire | uncommon | — | REPLACE | owner pick |
| cinderclaw | Cinderclaw | Scorchulk | Fire | uncommon | — | REPLACE | owner pick |
| pyrelynx | Pyrelynx | Flarynx | Fire | rare | — | REPLACE | owner pick |
| pyroclast | Pyroclast | Pyroclast | Fire | legendary | — | KEEP | already fits (owner approved) |
| tidepaw | Tidepaw | Aquip | Water | common | Aquip → Aquarrel → Abyssin | REPLACE | owner pick |
| mudcub | Mudcub | Muddlet | Water | common | Muddlet → Sludgeon | REPLACE | owner pick |
| reefclaw | Reefclaw | Crustank | Water | uncommon | — | REPLACE | owner pick |
| tidefin | Tidefin | Ripplet | Water | uncommon | — | REPLACE | owner pick |
| wavehorn | Wavehorn | Tideram | Water | rare | — | REPLACE | owner pick |
| tsunarok | Tsunarok | Tsunarok | Water | legendary | — | KEEP | already fits (owner approved) |
| thornkit | Thornkit | Spriglet | Nature | common | Spriglet → Floracat → Sylvanyx | REPLACE | owner pick |
| mossclaw | Mossclaw | Mossmaw | Nature | common | Mossmaw → Fungorilla | REPLACE | owner pick |
| rootram | Rootram | Bramblet | Nature | uncommon | — | REPLACE | owner pick |
| leafhorn | Leafhorn | Florant | Nature | uncommon | — | REPLACE | owner pick |
| thornback | Thornback | Thornback | Nature | rare | — | KEEP | already fits (owner approved) |
| elderoot | Elderoot | Elderoot | Nature | legendary | — | KEEP | already fits (owner approved) |
| flicker | Flicker | Zippit | Electric | common | Zippit → Zaptera | REPLACE | owner pick |
| voltfin | Voltfin | Volcoil | Electric | common | Volcoil → Eelectra | REPLACE | owner pick |
| voltfang | Voltfang | Zappard | Electric | uncommon | — | REPLACE | owner pick |
| stormlynx | Stormlynx | Statyx | Electric | uncommon | — | REPLACE | owner pick |
| joltrex | Joltrex | Joltrex | Electric | rare | — | KEEP | already fits (owner approved) |
| stormcrown | Stormcrown | Voltarch | Electric | legendary | — | REPLACE | owner pick |
| snowmoth | Snowmoth | Flurrit | Ice | common | Flurrit → Blizzmoth | REPLACE | owner pick |
| hailfang | Hailfang | Frostpup | Ice | common | Frostpup → Hoarhound | REPLACE | owner pick |
| frostclaw | Frostclaw | Cryolynx | Ice | uncommon | — | REPLACE | owner pick |
| icehorn | Icehorn | Glaciram | Ice | uncommon | — | REPLACE | owner pick |
| glaciron | Glaciron | Shardok | Ice | rare | — | REPLACE | owner pick |
| glacivern | Glacivern | Glacivern | Ice | legendary | — | KEEP | already fits (owner approved) |
| gustling | Gustling | Gustling | Wind | common | Gustling → Squallow → Stratosoar | KEEP | already fits (owner approved) |
| breezefang | Breezefang | Zephyroo | Wind | common | Zephyroo → Mistralope | REPLACE | owner pick |
| skywarden | Skywarden | Aeralis | Wind | uncommon | — | REPLACE | owner pick |
| windlynx | Windlynx | Galyx | Wind | uncommon | — | REPLACE | owner pick |
| zephyr | Zephyr | Zephiro | Wind | rare | — | REPLACE | owner pick |
| tempestra | Tempestra | Tempestra | Wind | legendary | — | KEEP | already fits (owner approved) |
| pebble | Pebble | Pebblit | Earth | common | Pebblit → Cobblon → Orogon | REPLACE | owner pick |
| rockram | Rockram | Craggo | Earth | common | Craggo → Ramparte | REPLACE | owner pick |
| boulderox | Boulderox | Bouldrox | Earth | uncommon | — | REPLACE | owner pick |
| stoneguard | Stoneguard | Granigor | Earth | uncommon | — | REPLACE | owner pick |
| terrabull | Terrabull | Terrabull | Earth | rare | — | KEEP | already fits (owner approved) |
| titanolith | Titanolith | Titanolith | Earth | legendary | — | KEEP | already fits (owner approved) |
| shadowkit | Shadowkit | Umbrikit | Dark | common | Umbrikit → Obscurat | REPLACE | owner pick |
| nightowl | Nightowl | Noctlet | Dark | common | Noctlet → Strixen | REPLACE | owner pick |
| duskrunner | Duskrunner | Duskyre | Dark | uncommon | — | REPLACE | owner pick |
| mireclaw | Mireclaw | Murklaw | Dark | uncommon | — | REPLACE | owner pick |
| nocturne | Nocturne | Nocturne | Dark | rare | — | KEEP | already fits (owner approved) |
| nyxshade | Nyxshade | Nyxshade | Dark | legendary | — | KEEP | already fits (owner approved) |
| glimmer | Glimmer | Lumini | Light | common | Lumini → Photara | REPLACE | owner pick |
| sunwhistle | Sunwhistle | Solchirp | Light | common | Solchirp → Heliark | REPLACE | owner pick |
| lumen | Lumen | Lumen | Light | uncommon | — | KEEP | already fits (owner approved) |
| prism | Prism | Prismara | Light | uncommon | — | REPLACE | owner pick |
| halofang | Halofang | Haloryx | Light | rare | — | REPLACE | owner pick |
| aurelion | Aurelion | Aurelion | Light | legendary | — | KEEP | already fits (owner approved) |
| ironcub | Ironcub | Ferrcub | Metal | common | Ferrcub → Forgursa | REPLACE | owner pick |
| steelpaw | Steelpaw | Steelpaw | Metal | common | Steelpaw → Chromane | KEEP | already fits (owner approved) |
| gearwing | Gearwing | Coglet | Metal | uncommon | — | REPLACE | owner pick |
| ironjaw | Ironjaw | Ferronox | Metal | uncommon | — | REPLACE | owner pick |
| metalhorn | Metalhorn | Ferrhorn | Metal | rare | — | REPLACE | owner pick |
| aegistron | Aegistron | Aegistron | Metal | legendary | — | KEEP | already fits (owner approved) |
| mindwing | Mindwing | Psyflutter | Psychic | common | Psyflutter → Psyraptor | REPLACE | owner pick |
| shadewisp | Shadewisp | Wispira | Psychic | common | Wispira → Mirageist | REPLACE | owner pick |
| cerebrix | Cerebrix | Cerebrix | Psychic | uncommon | — | KEEP | already fits (owner approved) |
| echolot | Echolot | Echolot | Psychic | uncommon | — | KEEP | already fits (owner approved) |
| enigmane | Enigmane | Enigmane | Psychic | rare | — | KEEP | already fits (owner approved) |
| astralux | Astralux | Astralux | Psychic | legendary | — | KEEP | already fits (owner approved) |
| drakeling | Drakeling | Drakling | Dragon | common | Drakling → Drakyra → Dracolossus | REPLACE | owner pick |
| wyrmkit | Wyrmkit | Wyrmlet | Dragon | common | Wyrmlet → Ouroborn | REPLACE | owner pick |
| sablewing | Sablewing | Sablewing | Dragon | uncommon | — | KEEP | already fits (owner approved) |
| scaleguard | Scaleguard | Scalor | Dragon | uncommon | — | REPLACE | owner pick |
| vyrnax | Vyrnax | Vyrnax | Dragon | rare | — | KEEP | already fits (owner approved) |
| aurodrax | Aurodrax | Aurodrax | Dragon | legendary | — | KEEP | already fits (owner approved) |
| emberfox_e1 | (new) | Blazynx | Fire | evolved form of Flaroo | L10 | NEW |  |
| emberfox_e2 | (new) | Infernox | Fire | evolved form of Flaroo | L20 | NEW |  |
| ashkit_e1 | (new) | Magmaul | Fire | evolved form of Cindruff | L14 | NEW |  |
| tidepaw_e1 | (new) | Aquarrel | Water | evolved form of Aquip | L10 | NEW |  |
| tidepaw_e2 | (new) | Abyssin | Water | evolved form of Aquip | L20 | NEW |  |
| mudcub_e1 | (new) | Sludgeon | Water | evolved form of Muddlet | L14 | NEW |  |
| thornkit_e1 | (new) | Floracat | Nature | evolved form of Spriglet | L10 | NEW |  |
| thornkit_e2 | (new) | Sylvanyx | Nature | evolved form of Spriglet | L20 | NEW |  |
| mossclaw_e1 | (new) | Fungorilla | Nature | evolved form of Mossmaw | L14 | NEW |  |
| flicker_e1 | (new) | Zaptera | Electric | evolved form of Zippit | L12 | NEW |  |
| voltfin_e1 | (new) | Eelectra | Electric | evolved form of Volcoil | L12 | NEW |  |
| snowmoth_e1 | (new) | Blizzmoth | Ice | evolved form of Flurrit | L12 | NEW |  |
| hailfang_e1 | (new) | Hoarhound | Ice | evolved form of Frostpup | L14 | NEW |  |
| gustling_e1 | (new) | Squallow | Wind | evolved form of Gustling | L10 | NEW |  |
| gustling_e2 | (new) | Stratosoar | Wind | evolved form of Gustling | L20 | NEW |  |
| breezefang_e1 | (new) | Mistralope | Wind | evolved form of Zephyroo | L12 | NEW |  |
| pebble_e1 | (new) | Cobblon | Earth | evolved form of Pebblit | L10 | NEW |  |
| pebble_e2 | (new) | Orogon | Earth | evolved form of Pebblit | L20 | NEW |  |
| rockram_e1 | (new) | Ramparte | Earth | evolved form of Craggo | L14 | NEW |  |
| shadowkit_e1 | (new) | Obscurat | Dark | evolved form of Umbrikit | L12 | NEW |  |
| nightowl_e1 | (new) | Strixen | Dark | evolved form of Noctlet | L14 | NEW |  |
| glimmer_e1 | (new) | Photara | Light | evolved form of Lumini | L12 | NEW |  |
| sunwhistle_e1 | (new) | Heliark | Light | evolved form of Solchirp | L14 | NEW |  |
| ironcub_e1 | (new) | Forgursa | Metal | evolved form of Ferrcub | L14 | NEW |  |
| steelpaw_e1 | (new) | Chromane | Metal | evolved form of Steelpaw | L14 | NEW |  |
| mindwing_e1 | (new) | Psyraptor | Psychic | evolved form of Psyflutter | L12 | NEW |  |
| shadewisp_e1 | (new) | Mirageist | Psychic | evolved form of Wispira | L14 | NEW |  |
| drakeling_e1 | (new) | Drakyra | Dragon | evolved form of Drakling | L10 | NEW |  |
| drakeling_e2 | (new) | Dracolossus | Dragon | evolved form of Drakling | L20 | NEW |  |
| wyrmkit_e1 | (new) | Ouroborn | Dragon | evolved form of Wyrmlet | L14 | NEW |  |
### Unchanged names (23)

Pyroclast, Tsunarok, Thornback, Elderoot, Joltrex, Glacivern, Gustling, Tempestra, Terrabull, Titanolith, Nocturne, Nyxshade, Lumen, Aurelion, Steelpaw, Aegistron, Cerebrix, Echolot, Enigmane, Astralux, Sablewing, Vyrnax, Aurodrax.

### Names from the previous species list that no longer exist

These names appeared in old saves and in the pre-dex generator. Monsters carrying them are mapped onto a common of the element they used to roll as, and renamed with their numeral kept (e.g. "Flarehorn II" → "Spriglet II").

| Old name | Now |
|---|---|
| Flarehorn | Spriglet (thornkit) |
| Magmaw | Noctlet (nightowl) |
| Mosswing | Pebblit (pebble) |
| Ashwing | Flaroo (emberfox) |
| Graniteox | Gustling (gustling) |
| Ironfin | Lumini (glimmer) |
| Cloudram | Psyflutter (mindwing) |
| Duskbeak | Muddlet (mudcub) |
| Wavewhistle | Psyflutter (mindwing) |
| Ashcub | Noctlet (nightowl) |
| Magmabeak | Volcoil (voltfin) |
| Wildcub | Frostpup (hailfang) |
| Stormwing | Steelpaw (steelpaw) |
| Stonehorn | Wyrmlet (wyrmkit) |
| Coalpaw | Spriglet (thornkit) |
| Brasshorn | Volcoil (voltfin) |
| Quillback | Frostpup (hailfang) |
