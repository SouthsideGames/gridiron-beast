import { POSITION_WEIGHTS } from '../data/personnel.js';
// Presentation only: show up to four actual attributes, ranked by the same
// positional importance used for OVR. A kicker has just two: no filler tiles.
export function positionRatingAttributes(position) {
 const weights=POSITION_WEIGHTS[position]||{};
 // Durability joined every overall (balance audit R-17) but is a body rating, not a position skill: never a headline (a kicker's
 // headline stays Kicking and Awareness).
 return Object.keys(weights).filter((k)=>k!=='durability').sort((a,b)=>weights[b]-weights[a]).slice(0,4);
}
