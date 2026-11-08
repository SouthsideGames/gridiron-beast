// Task 8 M3: fields in a football game (spec §11; FIELD_CLOCKS.md G1–G3). Kept in the game state's Task 8 block. Producers are the
// zone abilities (src/sim/abilities/*); this module places, ages and clears fields, holds pending creations until their creator's
// next eligible snap (G3), and answers which fields contain a point. Field effects by element live with their consumers.
import { placeRect, contains } from './fields.js';

const book = (t8) => (t8.fields ||= { list: [], pending: [], seq: 0 });
/** Queue a field that is created at its creator's next eligible on-field snap (G3). `spec` carries placement and clock data. */
export function queueField(t8, spec) { book(t8).pending.push({ ...spec }); }
/**
 * At a snap: create every pending field whose creator is on the field and eligible for this snap (`eligible(spec)`); placement is
 * computed from the upcoming formation reference (`place(spec)` returns placeRect arguments). Returns the fields created.
 */
export function createPending(t8, { onField, eligible = () => true, place, playIndex }) {
  const b = book(t8); const made = []; const keep = [];
  for (const p of b.pending) {
    if (!onField.has(p.owner) || !eligible(p)) { keep.push(p); continue; }
    const r = placeRect({ id: `F${++b.seq}`, type: p.type, createdAt: playIndex, owner: p.owner, strength: p.strength ?? null, ...place(p) });
    // `payload`: the producing ability's approved per-field data the in-play effects read (src/sim/t8/field-effects.js)
    const f = { ...r, lat: [...r.lat], yard: [...r.yard], ability: p.ability, ownerTeam: p.ownerTeam ?? null, payload: p.payload ?? null, remaining: p.lifetime, clock: p.clock, clearsAtHalftime: p.clearsAtHalftime !== false, createdThisPlay: true };
    b.list.push(f); made.push(f);
  }
  b.pending = keep; return made;
}
/** The fields active now (all of them: a paused clock keeps its field active, G2). */
export const activeFields = (t8) => book(t8).list;
export const fieldsAt = (t8, yard, lat) => book(t8).list.filter((f) => contains(f, yard, lat));
/**
 * After a completed play: each field's clock counts the play when its rule says so (`counts(field)`), the creation play included
 * where the contract counts it; a field at zero is removed.
 */
export function afterPlay(t8, counts) {
  const b = book(t8);
  b.list = b.list.filter((f) => { if (counts(f)) f.remaining -= 1; f.createdThisPlay = false; return f.remaining > 0; });
}
/** Halftime: fields that clear at halftime go (approved legendary exceptions keep theirs: clearsAtHalftime false). */
export function halftime(t8) { const b = book(t8); b.list = b.list.filter((f) => !f.clearsAtHalftime); }
