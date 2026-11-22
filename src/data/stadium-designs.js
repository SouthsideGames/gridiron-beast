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
});
export const designField = (id) => (Object.hasOwn(DESIGN_FIELDS, id) ? DESIGN_FIELDS[id] : null);
