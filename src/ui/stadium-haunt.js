// Stadium Polish (v1): the Specter stadium's orbs.
//
// A few small, half-faded orbs of light drift slowly about the field, the kind people point at in a night photograph and call a
// ghost. They are meant to be missed: watching the football, a player should barely notice them. Presentation only: they sit in
// a layer over the field that takes no taps, the game never reads them, and they use their own random numbers (never the game's).
// Nothing is created while a game runs: the same few orbs wander for as long as the screen is up.

import { lookFor } from './stadium-fx.js';

export const HAUNT_ORBS = 5;
/** The orb layer for a venue ('' unless its look asks for it, and at Off). `rand` is for tests. */
export function hauntHtml(venue, level = 'full', rand = Math.random) {
  const look = lookFor(venue?.env); if (!look?.haunt || level === 'off') return '';
  let out = '';
  for (let i = 0; i < HAUNT_ORBS; i++) {
    const size = (7 + rand() * 7).toFixed(0), left = (8 + rand() * 84).toFixed(1), top = (14 + rand() * 72).toFixed(1);
    const dx = ((rand() - 0.5) * 220).toFixed(0), dy = ((rand() - 0.5) * 160).toFixed(0), drift = (16 + rand() * 14).toFixed(1), fade = (7 + rand() * 6).toFixed(1);
    out += `<i class="sfx-orb" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;--dx:${dx}px;--dy:${dy}px;animation-duration:${drift}s;animation-delay:-${(rand() * 20).toFixed(1)}s"><b style="animation-duration:${fade}s;animation-delay:-${(rand() * 10).toFixed(1)}s"></b></i>`;
  }
  return `<div class="sfx-haunt" style="--sfx-a:${look.colors[0]};--sfx-c:${look.colors[2]}" aria-hidden="true">${out}</div>`;
}
