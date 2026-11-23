// Home-field branding (owner ruling 2026-11-23, second set). The home club owns the field: its logo at midfield, its place name in
// the end zone it defends and its nickname in the other one, at every one of the 32 home stadiums, in every game played there
// (regular season and playoffs; the visitors never repaint it). Drawn in the field's static layer under the yard lines, so the
// lines and numbers stay on top and readable, and never touched by the Stadium Effects setting (Full, Reduced and Off all show it).
//
// The twenty clubs without a Gym Leader paint their end zones in their colours (place on the primary, nickname on the secondary).
// The twelve Gym Leader fields keep their approved surfaces: only the lettering and the logo are added, nothing is recoloured.
import { TEAM_META } from '../data/league.js';
import { endZoneNames } from '../data/club-identity.js';
import { isGymClub } from '../data/gyms.js';
import { teamLogoSymbol, contrast } from './team-logo.js';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => `#${rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
/** The lettering colour that reads best on `fill`, from the club's own colours and white (accent first when it reads). */
function ink(fill, m) { const options = [m.accent, '#ffffff', m.color, m.secondary]; const ok = options.find((c) => contrast(c, fill) >= 3.2); return ok || options.sort((a, b) => contrast(b, fill) - contrast(a, fill))[0]; }

/** Midfield logo size in yards (the field is 53⅓ wide; the hash marks sit 6 yards either side of the middle). */
export const LOGO_YARDS = 14;
/**
 * What the home club paints on its field, or null for a game with no known home club (practice fields, the lab). `{ club, place,
 * nickname, gym, logo, ends: { place: { fill, ink, line }, nickname: { … } } }`; `fill` is null on a Gym Leader's field (its
 * own end-zone surface stays).
 */
const cache = new Map();
export function fieldBrand(venue) {
  const club = venue?.club; const m = TEAM_META[club]; const names = endZoneNames(club); if (!m || !names) return null;
  const key = `${club}|${venue.env}`; if (cache.has(key)) return cache.get(key);
  const gym = isGymClub(club) || (venue.env && venue.env !== 'grass');
  const placeFill = gym ? null : mix(m.color, '#000000', 0.12), nickFill = gym ? null : m.secondary;
  const gymFill = '#1a2a30'; // a Gym Leader's end zones are dark and varied; light lettering with a dark line reads on all of them
  const end = (fill) => { const f = fill || gymFill; const i = fill ? ink(fill, m) : (contrast(m.accent, f) >= 3.2 ? m.accent : '#ffffff'); return { fill, ink: i, line: contrast(i, '#000000') > 8 ? mix(m.secondary, '#000000', 0.55) : '#ffffff' }; };
  const b = { club, place: names.place, nickname: names.nickname, gym, logo: teamLogoSymbol(club), ends: { place: end(placeFill), nickname: end(nickFill) } };
  cache.set(key, b); return b;
}

/** One end zone's paint and lettering. `y0`/`h` are its svg top and height, `HW` the field's half width, `which` 'place' | 'nickname'. */
export function brandEndZone(brand, which, HW, y0, h) {
  const e = brand.ends[which]; const word = brand[which]; const W = HW * 2;
  const fs = 5.6; const est = word.length * fs * 0.7 + (word.length - 1) * 0.5; const room = W - 8;
  const fit = est > room ? ` textLength="${room.toFixed(1)}" lengthAdjust="spacingAndGlyphs"` : '';
  const cy = y0 + h / 2 + fs * 0.36;
  const paint = e.fill ? `<rect x="${-HW}" y="${y0}" width="${W}" height="${h}" fill="${e.fill}"/><rect x="${-HW}" y="${y0 + 0.7}" width="${W}" height="0.35" fill="${e.ink}" opacity="0.55"/><rect x="${-HW}" y="${y0 + h - 1.05}" width="${W}" height="0.35" fill="${e.ink}" opacity="0.55"/>` : '';
  return `<g class="ez-brand" data-ez="${which}" data-word="${word}">${paint}<text x="0" y="${cy.toFixed(2)}" text-anchor="middle" font-size="${fs}" font-weight="900" letter-spacing="0.5" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" fill="${e.ink}" stroke="${e.line}" stroke-width="0.32" paint-order="stroke"${fit}>${word}</text></g>`;
}
/** The logo at midfield, centred on the 50 (`Y` maps yards to svg y). `ring`: an event colour (rivalry, playoffs) drawn around it. */
export function brandMidfield(brand, Y, ring = null) {
  const L = LOGO_YARDS; const y = Y(50);
  return `<g class="mid-brand" data-club="${brand.club}"><use href="#${brand.logo.id}" x="${-L / 2}" y="${(y - L / 2).toFixed(2)}" width="${L}" height="${L}" opacity="${brand.gym ? 0.88 : 0.94}"/>${ring ? `<circle cx="0" cy="${y.toFixed(2)}" r="${(L / 2 + 0.9).toFixed(2)}" fill="none" stroke="${ring}" stroke-width="0.45" opacity="0.7"/>` : ''}</g>`;
}
