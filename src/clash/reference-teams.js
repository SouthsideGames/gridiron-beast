// Beast Clash reference teams (GDD §25.6): a small, fixed set of teams that represent the major strategies, reused for every
// Level 1 (new monster) and Level 2 (targeted interaction) check so results stay comparable and reproducible. Species ids only;
// monsters are generated from them at a fixed overall by the batch runner. Changing a team changes every later comparison, so
// edit this list only deliberately and note it in the GDD. Lab and tools only; nothing in the game imports this file.
export const REFERENCE_TEAMS = Object.freeze({
  3: Object.freeze({
    offense: Object.freeze(['drakeling', 'emberfox', 'voltfang']), // Drakling, Flaroo, Zappard: three Strikers
    defense: Object.freeze(['pebble', 'metalhorn', 'icehorn']), // Pebblit, Ferrhorn (shield Support), Glaciram: a shield wall
    support: Object.freeze(['tidepaw', 'mindwing', 'sunwhistle']), // Aquip, Psyflutter, Solchirp: a healer line
    disruption: Object.freeze(['stormlynx', 'pyrelynx', 'hailfang']), // Statyx, Flarynx, Frostpup: Shock, Daze/Burn, Chill
    mixed: Object.freeze(['icehorn', 'cinderclaw', 'mindwing']), // Glaciram, Scorchulk, Psyflutter: Tank, Striker, Support
    power: Object.freeze(['shadewisp', 'leafhorn', 'windlynx']), // Wispira, Florant, Galyx: the strongest known combination
  }),
  5: Object.freeze({
    offense: Object.freeze(['drakeling', 'emberfox', 'voltfang', 'cinderclaw', 'halofang']),
    defense: Object.freeze(['pebble', 'icehorn', 'boulderox', 'metalhorn', 'thornback']),
    support: Object.freeze(['tidepaw', 'mindwing', 'sunwhistle', 'lumen', 'gustling']),
    disruption: Object.freeze(['stormlynx', 'pyrelynx', 'hailfang', 'mudcub', 'voltfin']),
    mixed: Object.freeze(['icehorn', 'cinderclaw', 'mindwing', 'stormlynx', 'wyrmkit']),
    power: Object.freeze(['shadewisp', 'leafhorn', 'windlynx', 'icehorn', 'cinderclaw']),
  }),
});
/** Partners a tested monster is paired with (one per size), drawn from ordinary species so the monster itself is what varies. */
export const REFERENCE_PARTNERS = Object.freeze({ 3: Object.freeze(['wyrmkit', 'tidepaw']), 5: Object.freeze(['wyrmkit', 'tidepaw', 'pebble', 'emberfox']) });
