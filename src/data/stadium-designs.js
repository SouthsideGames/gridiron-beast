// Stadium Polish (v1): field designs that no club plays on yet.
//
// These are looks only, kept apart from ENVIRONMENTS (data/stadiums.js) on purpose: the game picks fields from ENVIRONMENTS, so
// nothing here can be scheduled, generated or given a type bonus. Each has the same drawing data as an environment (palette,
// texture) so the field renderer can show it when a venue names it, which today only the review tools do. Assigning one to a
// club later means moving its entry into ENVIRONMENTS (or pointing a club at it) as a deliberate change.
// Imports nothing.

export const DESIGN_FIELDS = Object.freeze({
  sky: { id: 'sky', name: 'Sky Stadium', short: 'Sky', type: null, indoor: false, icon: '☁', texture: 'breeze',
    // An island of bright grass high in the sky: fresh green turf with the breeze drawn across it, sky-blue end zones.
    palette: { a: '#3f9a6c', b: '#46a473', c: '#399064', end: '#3a7fc4', apron: '#5fa9de', tint: 'rgba(235,250,255,0.05)', decor: '#ffffff' } },
  oracle: { id: 'oracle', name: 'Oracle Stadium', short: 'Oracle', type: null, indoor: false, icon: '🔮', texture: 'stars',
    palette: { a: '#3a2a63', b: '#41306d', c: '#34255a', end: '#5a2466', apron: '#221740', tint: 'rgba(255,140,225,0.05)', decor: '#ff9ae6' } },
  rock: { id: 'rock', name: 'Rock Stadium', short: 'Rock', type: null, indoor: false, icon: '🪨', texture: 'slab',
    palette: { a: '#625d55', b: '#69645b', c: '#5a564e', end: '#403c36', apron: '#4c4841', tint: 'rgba(230,215,190,0.04)', decor: '#c9b79a' } },
  bug: { id: 'bug', name: 'Bug Stadium', short: 'Bug', type: null, indoor: false, icon: '🐝', texture: 'comb',
    palette: { a: '#4d7a2a', b: '#55842f', c: '#467026', end: '#7a6418', apron: '#3a5f20', tint: 'rgba(255,220,90,0.04)', decor: '#ffd24a' } },
  specter: { id: 'specter', name: 'Specter Stadium', short: 'Specter', type: null, indoor: false, icon: '👻', texture: 'plain',
    palette: { a: '#2f4448', b: '#354a4e', c: '#2a3e42', end: '#1c2a31', apron: '#24363a', tint: 'rgba(140,255,200,0.04)', decor: '#8dffc8' } },
});
export const designField = (id) => (Object.hasOwn(DESIGN_FIELDS, id) ? DESIGN_FIELDS[id] : null);
