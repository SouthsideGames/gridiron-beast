// Owner ruling N8b (2026-11-08): special-play eligibility for the football abilities, one source for the reviewer, the docs table
// (docs/task8/SPECIAL_PLAY_ELIGIBILITY.md) and the tests. The engine enforces it in its contract hook dispatcher (engine.js mayAct).
import { familyById } from '../../data/beast-dex.js';

/** Kicker abilities whose own approved conditions are kickoff conditions. */
export const KICKOFF_KICKER_ABILITIES = Object.freeze({
  sunwhistle: 'Yes: casts Dawn Signal on his own kickoff (Quickened on the nearest coverage teammate, an allowed created effect)',
  echolot: 'Yes: banks Echo Landing from his own live kickoff caught and returned without a touchdown',
});
/** { kickoff, twoPoint } eligibility text for a family. */
export function specialPlayEligibility(family) {
  const f = familyById(family); const k = f?.position === 'K';
  return {
    kicker: k,
    kickoff: k ? (KICKOFF_KICKER_ABILITIES[family] || 'No: its approved conditions are not kickoff conditions (field goal, extra point or punt only)') : 'No: neither activates nor charges',
    twoPoint: k ? 'No: not on the field; no kicker condition applies' : 'No: neither activates nor charges',
  };
}
