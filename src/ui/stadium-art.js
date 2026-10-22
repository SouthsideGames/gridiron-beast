// Stadium environments on the field (GDD §33.1): turf colours, a field texture, end-zone and sideline decor, and a light
// tint. Everything is drawn under the players and the play art, as a handful of SVG elements: textures are SVG patterns
// (the browser tiles them, so a frame costs one rect per layer whatever the camera), decor is a few shapes per sideline.
// Weather is not here: it is a CSS layer over the field (styles/app.css .weather-*), so it never redraws with the play.

import { ENVIRONMENTS, WEATHER } from '../data/stadiums.js';

const PATTERNS = {
  // Each: [width, height, inner svg, opacity] in yards. Low opacity, so yard lines, hashes and numbers stay on top and readable.
  ice: [7, 7, '<path d="M0.5 1.2 L2.2 2.4 L3 1.6 M4.2 4.8 L5.6 5.9 L6.6 5.1 M1.5 5.6 L2.8 6.6" stroke="#e8f7ff" stroke-width="0.12" fill="none"/><circle cx="5.2" cy="1.4" r="0.18" fill="#fff"/><circle cx="3.4" cy="4.1" r="0.12" fill="#fff"/><circle cx="0.8" cy="3.6" r="0.1" fill="#fff"/>', 0.35],
  lava: [8, 8, '<path d="M0.3 2 Q2 2.6 3.1 1.6 T6.2 2.4 M1.4 6.1 Q3 5.2 4.6 6.4 T7.7 5.8" stroke="#ff6a2a" stroke-width="0.14" fill="none"/><circle cx="6.6" cy="4.1" r="0.16" fill="#ffb13d"/>', 0.32],
  leaves: [5, 5, '<ellipse cx="1.2" cy="1.1" rx="0.42" ry="0.2" fill="#56c26c" transform="rotate(30 1.2 1.1)"/><ellipse cx="3.6" cy="3.4" rx="0.4" ry="0.19" fill="#14532d" transform="rotate(-40 3.6 3.4)"/><circle cx="4.4" cy="0.8" r="0.12" fill="#a3e07f"/>', 0.55],
  storm: [6, 6, '<path d="M0 6 L6 0" stroke="#9fb4ff" stroke-width="0.06"/><path d="M-3 6 L3 0 M3 6 L9 0" stroke="#9fb4ff" stroke-width="0.04"/>', 0.25],
  sand: [9, 4, '<path d="M0 1.2 Q2.25 0.6 4.5 1.2 T9 1.2 M0 3.2 Q2.25 2.6 4.5 3.2 T9 3.2" stroke="#c9a067" stroke-width="0.13" fill="none"/><circle cx="6.8" cy="2.2" r="0.12" fill="#5e4122"/>', 0.45],
  panels: [5, 5, '<path d="M0 0 H5 M0 0 V5" stroke="#bcd3dc" stroke-width="0.07"/><circle cx="0.4" cy="0.4" r="0.1" fill="#d7e6ee"/>', 0.3],
};

/** Decor along both sidelines, every few yards of the visible window: under the players, half outside the field. */
function sidelineDecor(env, cam, HW, Y) {
  const out = []; const c = env.palette.decor; const start = Math.ceil(cam.bottom / 6) * 6;
  for (let yard = start; yard < cam.top; yard += 6) {
    for (const side of [-1, 1]) {
      const x = side * (HW - 0.45), y = Y(yard + (side > 0 ? 3 : 0)); const k = Math.abs((yard / 6 + (side > 0 ? 1 : 0)) % 3);
      if (env.texture === 'ice') out.push(`<ellipse cx="${x}" cy="${y}" rx="0.9" ry="${1.6 + k * 0.4}" fill="${c}" opacity="0.75"/>`); // snowbanks
      else if (env.texture === 'lava') out.push(`<circle cx="${x}" cy="${y}" r="0.55" fill="#2a120c"/><circle cx="${x}" cy="${y}" r="0.32" fill="${c}" opacity="${0.55 + 0.15 * k}"/>`); // glowing vents
      else if (env.texture === 'leaves') out.push(`<circle cx="${x}" cy="${y}" r="${1.1 + k * 0.25}" fill="#174a2c"/><circle cx="${x - side * 0.3}" cy="${y - 0.3}" r="${0.7 + k * 0.2}" fill="${c}" opacity="0.7"/>`); // tree crowns
      else if (env.texture === 'storm') out.push(`<line x1="${x}" y1="${y - 1.2}" x2="${x}" y2="${y + 1.2}" stroke="#c9d3e6" stroke-width="0.14"/><circle cx="${x}" cy="${y - 1.3}" r="0.22" fill="${c}"/>`); // lightning rods
      else if (env.texture === 'sand') out.push(`<path d="M${x - 0.8} ${y + 0.6} L${x - 0.2} ${y - 0.7} L${x + 0.7} ${y + 0.6} Z" fill="#7a4f2a" opacity="0.85"/>`); // red rock
      else if (env.texture === 'panels') out.push(`<rect x="${x - 0.25}" y="${y - 1}" width="0.5" height="2" rx="0.2" fill="${c}" opacity="0.8"/>`); // light strips
    }
  }
  return out.join('');
}
/** End-zone art in the environment's style (low opacity, under the end-zone label). */
function endZoneDecor(env, x0, y0, w, h) {
  const c = env.palette.decor;
  if (env.texture === 'ice') return `<path d="M${x0} ${y0 + h * 0.65} Q${x0 + w * 0.25} ${y0 + h * 0.45} ${x0 + w * 0.5} ${y0 + h * 0.62} T${x0 + w} ${y0 + h * 0.55} V${y0 + h} H${x0} Z" fill="${c}" opacity="0.22"/>`;
  if (env.texture === 'lava') return `<path d="M${x0} ${y0 + h * 0.5} Q${x0 + w * 0.3} ${y0 + h * 0.2} ${x0 + w * 0.55} ${y0 + h * 0.55} T${x0 + w} ${y0 + h * 0.4}" stroke="${c}" stroke-width="0.35" fill="none" opacity="0.45"/>`;
  if (env.texture === 'storm') return `<path d="M${x0 + w * 0.7} ${y0 + 0.5} l-1.2 2.6 h1 l-1.4 3" stroke="${c}" stroke-width="0.3" fill="none" opacity="0.5"/>`;
  if (env.texture === 'sand') return `<path d="M${x0} ${y0 + h * 0.7} Q${x0 + w * 0.5} ${y0 + h * 0.4} ${x0 + w} ${y0 + h * 0.7}" stroke="${c}" stroke-width="0.25" fill="none" opacity="0.4"/>`;
  return '';
}

/**
 * The turf for one frame: base, stripes, texture, end zones, tint and decor. `venue` is {env, weather} (a game's venue);
 * without one, the classic grass is drawn exactly as before. Returns { turf, endZones } so the caller keeps its own order.
 */
export function turfSvg(venue, cam, HW, SPAN, Y) {
  const env = ENVIRONMENTS[venue?.env] || ENVIRONMENTS.grass; const P = env.palette;
  let s = `<rect x="${-HW}" y="0" width="${HW * 2}" height="${SPAN}" fill="${P.a}"/>`;
  for (let yard = Math.floor(cam.bottom / 10) * 10; yard < cam.top; yard += 10) {
    if (yard < 0 || yard >= 100) continue;
    s += `<rect x="${-HW}" y="${Y(yard + 10)}" width="${HW * 2}" height="10" fill="${(yard / 10) % 2 ? P.b : P.c}"/>`;
  }
  const pat = PATTERNS[env.texture];
  if (pat) {
    const [w, h, inner, op] = pat; const id = `tx-${env.id}`;
    s += `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}" patternTransform="translate(0 ${(cam.top % h).toFixed(2)})">${inner}</pattern></defs><rect x="${-HW}" y="0" width="${HW * 2}" height="${SPAN}" fill="url(#${id})" opacity="${op}"/>`;
  }
  return { env, turf: s, endZone: (y0, h) => `<rect x="${-HW}" y="${y0}" width="${HW * 2}" height="${h}" fill="${P.end}"/>${endZoneDecor(env, -HW, y0, HW * 2, h)}`,
    over: `${P.tint ? `<rect x="${-HW}" y="0" width="${HW * 2}" height="${SPAN}" fill="${P.tint}"/>` : ''}${env.id === 'grass' ? '' : sidelineDecor(env, cam, HW, Y)}` };
}

/** The CSS class for the weather layer over the field ('' when nothing is drawn: clear, overcast handled by a tint, indoors). */
export function weatherClass(venue) {
  const w = venue?.weather; if (!w || w === 'clear' || w === 'indoor') return '';
  return `weather-${w}`;
}
export const weatherLabel = (venue) => (WEATHER[venue?.weather] || WEATHER.clear);
