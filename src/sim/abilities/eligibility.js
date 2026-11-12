// Owner ruling N8b (2026-11-08): special-play eligibility for the football abilities, one source for the reviewer, the docs table
// (docs/task8/SPECIAL_PLAY_ELIGIBILITY.md) and the tests. The engine enforces it in its contract hook dispatcher (engine.js mayAct).
import { familyById } from '../../data/beast-dex.js';
import { E as $E } from '../../core/english.js';

/** Kicker abilities whose own approved conditions are kickoff conditions. */
export const KICKOFF_KICKER_ABILITIES = Object.freeze({
  sunwhistle: $E('sim.yes_casts_dawn_signal_on_his'),
  echolot: $E('sim.yes_banks_echo_landing_from_his'),
});
/** { kickoff, twoPoint } eligibility text for a family. */
export function specialPlayEligibility(family) {
  const f = familyById(family); const k = f?.position === 'K';
  return {
    kicker: k,
    kickoff: k ? (KICKOFF_KICKER_ABILITIES[family] || $E('sim.no_its_approved_conditions_are_not')) : $E('sim.no_neither_activates_nor_charges'),
    twoPoint: k ? $E('sim.no_not_on_the_field_no') : $E('sim.no_neither_activates_nor_charges'),
  };
}
