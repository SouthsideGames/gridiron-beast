// Personal names are presentation data. No gameplay RNG is read or advanced.
import { hashString } from '../core/rng.js';
import { FORMS } from './beast-dex.js';

const GIVEN = 'Rocco Bram Tavo Nilo Vexa Kiro Mira Zeno Luma Daro Fenn Orin Runa Sora Bexi Jori Varo Tali Nera Kavi Rilo Zuri Pavo Elio Davi Mako Reni Tova Yori Zavi Cora Nori Boro Kora Vino'.split(' ');
const START = 'Al Ari Ba Bel Bo Bra Bre Ca Cel Co Cor Da Del Do Dra El En Fa Fen Fi Ga Gal Gra Ha Hel Ho Iri Ivo Ja Jor Ka Kel Ki Ko La Len Lo Lu Ma Mel Mi Mo Na Nel Ni No Ora Or Pa Pel Pi Po Ra Ren Ri Ro Ru Sa Sel Sha Si So Ta Tel Ti To Tu Ul Uma Va Val Ve Vi Vo Wa Wel Wi Wo Xa Xel Ya Yel Yo Za Zel Zi Zo'.split(' ');
const MIDDLE = ['', 'a', 'e', 'i', 'o', 'u', 'la', 'le', 'li', 'lo', 'ra', 're', 'ri', 'ro'];
const END = 'bin bon dan den din don dor fen fin gan gar gen gin gon gor ka ken kin ko lan lar len lin lon lor ma mar men min mo mon na nar nen nin no non nor ra ran ren ri rin ro ron ros sa sen sin so son ta tan ten tin to ton tor va van ven vin vo von wen win ya yan yen yo yon za zan zen zin zo zon'.split(' ');
const FORBIDDEN = /fuck|shit|cunt|nigg|fag|piss|rape|sex|porn|asshole|bitch/i;
const SPECIES_NAMES = new Set(FORMS.map(f => f.name.toLowerCase()));
export const validIndividualName = name => typeof name === 'string' && /^[A-Z][a-z]{3,7}$/.test(name) && !FORBIDDEN.test(name) && !SPECIES_NAMES.has(name.toLowerCase());
// A finite, vetted vocabulary of syllables; no numerals, punctuation or type-based pools.
const POOL = Object.freeze([...new Set([...GIVEN, ...START.flatMap(a => MIDDLE.flatMap(b => END.map(c => a + b + c)))])].filter(validIndividualName));
export const individualNamePoolSize = POOL.length;
export function individualName(id, taken = new Set()) {
  const reserved = new Set([...taken].map(x => String(x).toLowerCase()));
  const start = hashString(`beast-name-v1|${id}`) % POOL.length;
  for (let n = 0; n < POOL.length; n++) {
    const name = POOL[(start + n) % POOL.length];
    if (!reserved.has(name.toLowerCase())) return name;
  }
  throw new Error('Personal name pool exhausted');
}
/** Legacy catalogue labels, including evolved forms, are not individual names. */
export function catalogueName(name) {
  const base = String(name || '').replace(/ (?:II|III|IV|V|VI|\d+)$/, '').toLowerCase();
  return SPECIES_NAMES.has(base);
}
const caches = new WeakMap();
function registry(f) {
  const state = f.individualNames ||= { v: 1, byId: {} };
  state.byId ||= {};
  let used = caches.get(state);
  if (!used) { used = new Map(Object.entries(state.byId).map(([id, name]) => [name.toLowerCase(), id])); caches.set(state, used); }
  return { state, used };
}
/** Reserve a name across this franchise universe. Names stay attached to IDs across clubs and seasons. */
export function reserveIndividualName(f, m, extra = []) {
  if (!m?.id) return m;
  const { state, used } = registry(f);
  const existing = Object.hasOwn(state.byId, m.id) ? state.byId[m.id] : null;
  if (existing) { m.name = existing; m.personalName = true; return m; }
  const desired = m.name;
  const custom = desired && !catalogueName(desired) && (!m.personalName || m.customName);
  const taken = new Set([...used.keys(), ...extra.map(x => String(x).toLowerCase())]);
  const name = (custom || validIndividualName(desired)) && !taken.has(desired.toLowerCase())
    ? desired : individualName(m.id, taken);
  state.byId[m.id] = name; used.set(name.toLowerCase(), m.id);
  m.name = name; m.personalName = true;
  return m;
}
/** Canonical individuals first; ID-bearing snapshots are synchronized afterwards. */
export function namedIndividuals(f) {
  return [
    ...(f.roster || []), ...Object.values(f.league?.monsters || {}),
    ...(f.league?.waivers || []), ...Object.values(f.league?.legends || {}),
    ...Object.values(f.pool || {}).flat(), ...(f.draft?.class || []),
    ...(f.week?.prospects || []).map(p => p.monster), ...(f.offseason?.market || []),
  ].filter(m => m?.id && (m.species || m.dev));
}

export function ensureIndividualNames(f) {
  const individuals = namedIndividuals(f);
  const canonical = new WeakSet(individuals);
  const objects = new WeakSet();
  function collect(value) {
    if (!value || typeof value !== 'object' || objects.has(value) || value === f.individualNames) return;
    objects.add(value);
    // Snapshots reserve identities too, but must not gain live-monster metadata on every reload.
    if (!canonical.has(value) && value.id && value.species && value.position && typeof value.name === 'string') individuals.push({ ...value });
    for (const child of Object.values(value)) if (typeof child === 'object') collect(child);
  }
  collect(f);
  // Old custom names get priority over generated names. Deterministic order handles collisions.
  const ordered = [...individuals].sort((a, b) => Number(catalogueName(a.name)) - Number(catalogueName(b.name)) || String(a.id).localeCompare(String(b.id)));
  for (const m of ordered) reserveIndividualName(f, m);
  const byId = f.individualNames?.byId || {};
  // Only typed identity fields are updated; old narrative prose is left intact. Human/staff names are never matched by text.
  const seen = new WeakSet();
  function visit(value) {
    if (!value || typeof value !== 'object' || seen.has(value) || value === f.individualNames) return;
    seen.add(value);
    const id = value.mid || value.id;
    if (id && Object.hasOwn(byId, id)) {
      if (typeof value.name === 'string') value.name = byId[id];
      if (typeof value.mname === 'string') value.mname = byId[id];
    }
    if (value.partner && Object.hasOwn(byId, value.partner) && typeof value.pname === 'string') value.pname = byId[value.partner];
    for (const child of Object.values(value)) if (typeof child === 'object') visit(child);
  }
  visit(f);
  return f;
}
