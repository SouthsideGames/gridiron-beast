// Task 8 M1 (WP2): which family a generation event produces (N7c B17). Rarity first: a channel's fixed Basic share picks a Basic
// family; otherwise the channel's existing rule picks among the original families, so today's mix among the original rarities is
// kept exactly. Legendaries keep their own routes and never enter here. The share applies per generation event; existing rosters and
// markets are never forced to a composition.
import { approvedRule } from '../../data/beast-dex.js';

const V = approvedRule('basic-shares').values;
export const BASIC_SHARE = Object.freeze({ roster: V.rosters, scouting: V.scouting, encounter: V.encounters, draft: V.draft, arrival: V.faArrivals });

/**
 * @param rng      the game's seeded generator (one `next()` draw for the rarity step, then the pick)
 * @param channel  'roster' | 'scouting' | 'encounter' | 'draft' | 'arrival'
 * @param basics   eligible Basic families for this event (already filtered by position, region/element, exclusions)
 * @param originals eligible original (non-legendary) families, same filters
 * @param pickOriginal (rng, originals) => family — the channel's existing weighting among original rarities
 */
export function pickFamily(rng, { channel, basics, originals, pickOriginal }) {
  const s = BASIC_SHARE[channel]; if (s == null) throw new Error(`unknown generation channel ${channel}`);
  if (originals.some((f) => f.rarity === 'basic' || f.rarity === 'legendary')) throw new Error('originals must exclude Basic and legendary families');
  const roll = rng.next();
  if (basics.length && (roll < s || !originals.length)) return basics[rng.int(basics.length)];
  if (!originals.length) return null;
  return pickOriginal(rng, originals);
}
