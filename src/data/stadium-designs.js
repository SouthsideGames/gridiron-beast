// Stadium Polish (v1): field designs that no club plays on. Sky and Oracle left this list on 2026-11-23, when the Wind and
// Psychic Gym Leaders arrived: they are fields in data/stadiums.js now. The five below match no monster type and are kept, unused,
// out of the Gym Leader line-up (owner, 2026-11-22). The original header:
// Stadium Polish (v1): field designs that no club plays on yet.
//
// These are looks only, kept apart from ENVIRONMENTS (data/stadiums.js) on purpose: the game picks fields from ENVIRONMENTS, so
// nothing here can be scheduled, generated or given a type bonus. Each has the same drawing data as an environment (palette,
// texture) so the field renderer can show it when a venue names it, which today only the review tools do. Assigning one to a
// club later means moving its entry into ENVIRONMENTS (or pointing a club at it) as a deliberate change.
// Imports nothing.

export const DESIGN_FIELDS = Object.freeze({
  rock: { id: 'rock', name: 'Rock Stadium', short: 'Rock', type: null, indoor: false, icon: '🪨', texture: 'slab',
    palette: { a: '#625d55', b: '#69645b', c: '#5a564e', end: '#403c36', apron: '#4c4841', tint: 'rgba(230,215,190,0.04)', decor: '#c9b79a' } },
  bug: { id: 'bug', name: 'Bug Stadium', short: 'Bug', type: null, indoor: false, icon: '🐝', texture: 'comb',
    palette: { a: '#4d7a2a', b: '#55842f', c: '#467026', end: '#7a6418', apron: '#3a5f20', tint: 'rgba(255,220,90,0.04)', decor: '#ffd24a' } },
  specter: { id: 'specter', name: 'Specter Stadium', short: 'Specter', type: null, indoor: false, icon: '👻', texture: 'plain',
    palette: { a: '#2f4448', b: '#354a4e', c: '#2a3e42', end: '#1c2a31', apron: '#24363a', tint: 'rgba(140,255,200,0.04)', decor: '#8dffc8' } },
  clash: { id: 'clash', name: 'Clash Stadium', short: 'Clash', type: null, indoor: false, icon: '🥊', texture: 'ring',
    palette: { a: '#8a4a34', b: '#93503a', c: '#814530', end: '#22305a', apron: '#6e3a28', tint: 'rgba(255,120,90,0.04)', decor: '#ffd24a' } },
  corrupt: { id: 'corrupt', name: 'Corrupt Stadium', short: 'Corrupt', type: null, indoor: false, icon: '🧪', texture: 'ooze',
    palette: { a: '#3b2450', b: '#422959', c: '#352048', end: '#243f1d', apron: '#2a1a3a', tint: 'rgba(150,255,80,0.035)', decor: '#9cff4a' } },
});
export const designField = (id) => (Object.hasOwn(DESIGN_FIELDS, id) ? DESIGN_FIELDS[id] : null);
