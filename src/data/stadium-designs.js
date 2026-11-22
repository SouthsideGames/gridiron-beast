// Stadium Polish (v1): field designs that no club plays on yet.
//
// These are looks only, kept apart from ENVIRONMENTS (data/stadiums.js) on purpose: the game picks fields from ENVIRONMENTS, so
// nothing here can be scheduled, generated or given a type bonus. Each has the same drawing data as an environment (palette,
// texture) so the field renderer can show it when a venue names it, which today only the review tools do. Assigning one to a
// club later means moving its entry into ENVIRONMENTS (or pointing a club at it) as a deliberate change.
// Imports nothing.

export const DESIGN_FIELDS = Object.freeze({
  sky: { id: 'sky', name: 'Sky Stadium', short: 'Sky', type: null, indoor: false, icon: '☁', texture: 'clouds',
    palette: { a: '#4f86bd', b: '#5890c7', c: '#497db2', end: '#2f5f96', apron: '#3b6da5', tint: 'rgba(210,235,255,0.06)', decor: '#eaf6ff' } },
  oracle: { id: 'oracle', name: 'Oracle Stadium', short: 'Oracle', type: null, indoor: false, icon: '🔮', texture: 'stars',
    palette: { a: '#3a2a63', b: '#41306d', c: '#34255a', end: '#5a2466', apron: '#221740', tint: 'rgba(255,140,225,0.05)', decor: '#ff9ae6' } },
});
export const designField = (id) => (Object.hasOwn(DESIGN_FIELDS, id) ? DESIGN_FIELDS[id] : null);
