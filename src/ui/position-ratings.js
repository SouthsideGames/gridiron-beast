import { POSITION_WEIGHTS } from '../data/personnel.js';
// Presentation only: show up to four actual attributes, ranked by the same
// positional importance used for OVR. A kicker has just two: no filler tiles.
export function positionRatingAttributes(position) {
 const weights=POSITION_WEIGHTS[position]||{};
 return Object.keys(weights).sort((a,b)=>weights[b]-weights[a]).slice(0,4);
}
