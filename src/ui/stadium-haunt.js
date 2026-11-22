// Stadium Polish (v1): the Specter stadium's ghosts.
//
// Every so often the pale shape of a monster drifts across the field from one sideline to the other and is gone. It is any
// species in the game, picked at random each time the screen is built, drawn from the same pixels as the real sprite and turned
// into a ghost by the stylesheet. Presentation only: it sits in a layer over the field that takes no taps, the game never reads
// it, and it uses its own random numbers (never the game's). Nothing is created while a game runs: three ghosts take turns.

import { SPECIES_DEX } from '../data/species.js';
import { sprite16 } from './sprite16.js';
import { lookFor } from './stadium-fx.js';

export const HAUNT_GHOSTS = 3;
export const HAUNT_CYCLE_S = 30; // each ghost crosses once in this time, so one drifts by about every ten seconds
/** The ghost layer for a venue ('' unless its look asks for ghosts, and at Off). `rand` is for tests. */
export function hauntHtml(venue, level = 'full', rand = Math.random) {
  const look = lookFor(venue?.env); if (!look?.haunt || level === 'off' || !SPECIES_DEX.length) return '';
  const start = rand() * HAUNT_CYCLE_S; let out = '';
  for (let i = 0; i < HAUNT_GHOSTS; i++) {
    const sp = SPECIES_DEX[Math.floor(rand() * SPECIES_DEX.length) % SPECIES_DEX.length]; const toRight = rand() < 0.5;
    const top = (18 + rand() * 58).toFixed(1); const delay = -(start + (i * HAUNT_CYCLE_S) / HAUNT_GHOSTS).toFixed(2);
    out += `<span class="sfx-ghostmon ${toRight ? 'sfx-ghostmon-r' : 'sfx-ghostmon-l'}" style="top:${top}%;animation-delay:${delay}s"><span>${sprite16(sp, 44, { flip: !toRight, cls: 'sprite' })}</span></span>`;
  }
  return `<div class="sfx-haunt" style="--sfx-a:${look.colors[0]}" aria-hidden="true">${out}</div>`;
}
