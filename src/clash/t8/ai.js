// Beast Clash t8 (M4 S4): the AI rotation policy. D2 (approved, §25 item 2): "Adapt the existing AI to the new abilities, the
// rotation rules and the approved information restrictions." D1 (approved): Skip, headless play and staff use this policy, and a
// player's "Auto for the rest" switches that side to it.
//
// This is the legacy `smart` policy (src/clash/ai.js, frozen) carried onto the t8 model with three changes and nothing else:
//   1. Rotation rules. It is asked only at a legal rotation phase (after both turns; cadence 4; a living reserve; no lock), never at
//      the start of the exchange. Its thresholds (gain > 1.45 x stay; or, when the active is about to fall, >= 0.8 x stay) are kept:
//      they were tuned for the approved half-strength swap cost, which P8 keeps as the x0.5 entry penalty on the first normal turn.
//   2. Statuses. The legacy condition factors (daze x0.75, shock x0.5) become the t8 statuses' real effect on outgoing damage:
//      Weakened (1 - pct) and Empowered (1 + pct). Stunned keeps the legacy x0.5 for a lost action over its two-exchange horizon,
//      which matches D4: a Stunned monster loses at most one of any two consecutive normal turns. Other statuses do not change its
//      expected damage and are ignored, as the legacy policy ignored them.
//   3. Information (the approved restrictions: B16 "AI clubs scout under the player's rules"; D17's "only legitimately available
//      information and no future RNG outcomes", applied here the same way). The policy reads only what the battle
//      screen shows both players: types, current HP / max HP, visible status badges, its OWN side's attack, and damage already dealt
//      in this battle. The legacy "about to fall" test read the opposing active's hidden ATK; it now uses the largest single hit that
//      opponent has actually dealt in this battle (0 until it has hit, so the test cannot fire on information nobody has seen).
// Deterministic: no random draw (the legacy smart policy drew none either); ties go to stable combatant ID.
import { typeFactor } from '../types.js';
import { clashEffect } from './status.js';

export const T8_POLICIES = Object.freeze(['none', 'ai', 'manual']);
export const T8_POLICY_LABEL = Object.freeze({
  none: 'Never rotates (tests and staged scenarios only)',
  ai: 'Adapted smart policy (D2): rotates only for a clear expected gain, or when the active is about to fall',
  manual: 'The player decides at each legal rotation phase (Watch); "Auto for the rest" hands the side to the AI policy (D1)',
});

const hpShare = (x) => x.hp / x.c.maxHp;
/** Expected-damage factor of a monster's visible status (see the header). */
export function statusDamageFactor(slot) {
  const e = clashEffect(slot);
  return e.outgoing * (e.stunned ? 0.5 : 1);
}

/**
 * Choose a reserve to rotate in, or null to stay. Inputs are live engine records, read only through the fields listed in the header.
 * `observedFoeHit` is the largest single hit the opposing active has dealt in this battle.
 */
export function chooseRotationAI({ active, reserves, foe, observedFoeHit = 0 }) {
  if (!active || !reserves.length || !foe) return null;
  const edge = (x) => typeFactor(x.c.type, foe.c.type) - typeFactor(foe.c.type, x.c.type); // + when x is favoured
  const value = (x) => x.c.atk * (1 + edge(x) * 4) * statusDamageFactor(x.status) * Math.min(1, hpShare(x) + 0.5);
  const stay = value(active);
  const dying = hpShare(active) < 0.22 && observedFoeHit > 0 && active.hp <= observedFoeHit * 1.3;
  const ranked = reserves.filter((x) => hpShare(x) > 0.35).map((x) => ({ x, v: value(x) })).sort((p, q) => q.v - p.v || p.x.c.id.localeCompare(q.x.c.id));
  const best = ranked[0]; if (!best) return null;
  if (dying && best.v >= stay * 0.8) return best.x;
  if (best.v > stay * 1.45) return best.x;
  return null;
}
