import { trace } from '../../testing/trace.js';
// Task 8 M3: fields in a football game (spec §11; FIELD_CLOCKS.md G1–G3). Kept in the game state's Task 8 block. Producers are the
// zone abilities (src/sim/abilities/*); this module places, ages and clears fields, holds pending creations until their creator's
// next eligible snap (G3), and answers which fields contain a point. Field effects by element live with their consumers.
import { placeRect, contains, PLAYABLE } from './fields.js';

const book = (t8) => (t8.fields ||= { list: [], pending: [], seq: 0 });
/** Queue a field that is created at its creator's next eligible on-field snap (G3). `spec` carries placement and clock data. */
export function queueField(t8, spec) { book(t8).pending.push({ ...spec }); }
/**
 * At a snap: create every pending field whose creator is on the field and eligible for this snap (`eligible(spec)`); placement is
 * computed from the upcoming formation reference (`place(spec)` returns placeRect arguments). Returns the fields created.
 */
export function createPending(t8, { onField, eligible = () => true, place, playIndex, teamOf = null }) {
  const b = book(t8); const made = []; const keep = [];
  const prior = [...b.list];
  for (const p of b.pending) {
    if (prior.some((f) => f.owner === p.owner && f.ability === p.ability)) { keep.push(p); continue; }
    if ((!p.benchOk && !p.offField && !onField.has(p.owner)) || !eligible(p)) { keep.push(p); continue; } // M3 hook: benchOk / offField (approved off-field creation, e.g. Frostmark, Gear Grid; N7d G3)
    const r = placeRect({ id: `F${++b.seq}`, type: p.type, createdAt: playIndex, owner: p.owner, strength: p.strength ?? null, ...place(p) });
    // `payload`: the producing ability's approved per-field data the in-play effects read (src/sim/t8/field-effects.js)
    const f = { ...r, ...(b.snap && !p.immediate ? { followLOS: relativeToSnap(r, b.snap) } : {}), lat: [...r.lat], yard: [...r.yard], ability: p.ability, ownerTeam: p.ownerTeam ?? null, team: teamOf?.(p.owner) ?? p.ownerTeam ?? null, /* the club that placed it (owner 2026-11-24: zones pick sides); ownerTeam can name the other club for its clock */ payload: p.payload ?? null, remaining: p.lifetime, clock: p.clock, clearsAtHalftime: p.clearsAtHalftime !== false, createdThisPlay: true };
    b.list.push(f); made.push(f); trace(t8, 'field-created', { field: f });
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
/** Halftime: every zone already on the field goes before the second-half kickoff, legendary ones included, whichever club
 *  receives or recovers the kickoff (owner decision 2026-11-19; the old clearsAtHalftime exception is no longer honoured).
 *  Banked creations (pending) are not on the field yet: they keep waiting for their own snap. No charge, cooldown or lifetime
 *  changes; the first half's recorded plays keep their own zone pictures. */
export function halftime(t8) { const b = book(t8); b.list = []; b.clearOnNextSnap = false; }

// Persistent terrain follows the next line of scrimmage, never the live carrier.
const snapPose = state => ({ possession: state.possession, yard: state.possession === 'home' ? state.ballOn : 100 - state.ballOn, lat: (state.ballLat || 0) * (state.possession === 'home' ? 1 : -1) });
const relativeToSnap = (f, pose) => ({ yard: f.yard.map(y=>y-pose.yard), lat:f.lat.map(y=>y-pose.lat) });
function fitRange(range, lo, hi) {
  const width=Math.min(hi-lo,range[1]-range[0]);
  const start=Math.max(lo,Math.min(hi-width,range[0]));
  return [start,start+width];
}
/** Pure projection shared by presentation and the authoritative snap. */
export function fieldsForNextSnap(state) {
  const b=state.t8?.fields, pose=snapPose(state);
  if(!b)return {list:[],pending:[],seq:0,snap:pose};
  // A new possession clears every zone on the field (both clubs). Banked creations (pending) are not on the field yet:
  // each waits for its own approved snap (Frostmark, Gear Grid, Tsunami Line, Splashdown, Permafrost) and is placed fresh
  // at the new line, so it survives (owner decision 2026-11-18; clearing it stranded the creator's ability).
  if(b.clearOnNextSnap || (b.snap && b.snap.possession!==pose.possession))
    return {...b,list:[],pending:b.pending||[],seq:b.seq||0,snap:pose,clearOnNextSnap:false};
  const list=(b.list||[]).map(f=>{
    // Legacy fields adopt their current reference once; their old offset was not saved.
    const followLOS=f.followLOS||relativeToSnap(f,b.snap||pose);
    const yard=fitRange(followLOS.yard.map(y=>y+pose.yard),PLAYABLE.yardMin,PLAYABLE.yardMax);
    const lat=fitRange(followLOS.lat.map(y=>y+pose.lat),PLAYABLE.latMin,PLAYABLE.latMax);
    const dy=yard[0]-f.yard[0],dl=lat[0]-f.lat[0];
    return {...f,followLOS,yard,lat,...(f.holes?.length?{holes:f.holes.map(h=>({...h,yard:h.yard.map(y=>y+dy),lat:h.lat.map(y=>y+dl)}))}:{})};
  });
  return {...b,list,pending:b.pending||[],seq:b.seq||0,snap:pose};
}
export function prepareFieldsForSnap(state) {
  if(state.phase!=='scrimmage'||state.finished)return;
  (state.t8||={status:{}}).fields=fieldsForNextSnap(state);
}
/** Whistle-created fields anchor at the NEW spot, avoiding a second advance. */
export function anchorWhistleFields(state) {
  const b=state.t8?.fields;if(!b)return;
  const pose=snapPose(state);
  for(const f of b.list)if(f.createdThisPlay&&!f.followLOS)f.followLOS=relativeToSnap(f,pose);
}
export function clearFieldsOnNextSnap(state) {
  if(state.t8?.fields)state.t8.fields.clearOnNextSnap=true;
}
