// Stadium environments on the field (GDD §33.1): turf colours, a field texture, end-zone and sideline decor, and a light
// tint. Everything is drawn under the players and the play art, as a handful of SVG elements: textures are SVG patterns
// (the browser tiles them, so a frame costs one rect per layer whatever the camera), decor is a few shapes per sideline.
// Weather is not here: it is a CSS layer over the field (styles/app.css .weather-*), so it never redraws with the play.

import { ENVIRONMENTS, WEATHER } from '../data/stadiums.js';
import { designField } from '../data/stadium-designs.js';
import { lookFor, edgeSvg } from './stadium-fx.js';

const PATTERNS = {
  // Each: [width, height, inner svg, opacity] in yards. Low opacity, so yard lines, hashes and numbers stay on top and readable.
  ice: [7, 7, '<path d="M0.5 1.2 L2.2 2.4 L3 1.6 M4.2 4.8 L5.6 5.9 L6.6 5.1 M1.5 5.6 L2.8 6.6" stroke="#e8f7ff" stroke-width="0.12" fill="none"/><circle cx="5.2" cy="1.4" r="0.18" fill="#fff"/><circle cx="3.4" cy="4.1" r="0.12" fill="#fff"/><circle cx="0.8" cy="3.6" r="0.1" fill="#fff"/>', 0.35],
  lava: [8, 8, '<path d="M0.3 2 Q2 2.6 3.1 1.6 T6.2 2.4 M1.4 6.1 Q3 5.2 4.6 6.4 T7.7 5.8" stroke="#ff6a2a" stroke-width="0.14" fill="none"/><circle cx="6.6" cy="4.1" r="0.16" fill="#ffb13d"/>', 0.32],
  leaves: [5, 5, '<ellipse cx="1.2" cy="1.1" rx="0.42" ry="0.2" fill="#56c26c" transform="rotate(30 1.2 1.1)"/><ellipse cx="3.6" cy="3.4" rx="0.4" ry="0.19" fill="#14532d" transform="rotate(-40 3.6 3.4)"/><circle cx="4.4" cy="0.8" r="0.12" fill="#a3e07f"/>', 0.55],
  storm: [6, 6, '<path d="M0 6 L6 0" stroke="#9fb4ff" stroke-width="0.06"/><path d="M-3 6 L3 0 M3 6 L9 0" stroke="#9fb4ff" stroke-width="0.04"/>', 0.25],
  sand: [9, 4, '<path d="M0 1.2 Q2.25 0.6 4.5 1.2 T9 1.2 M0 3.2 Q2.25 2.6 4.5 3.2 T9 3.2" stroke="#c9a067" stroke-width="0.13" fill="none"/><circle cx="6.8" cy="2.2" r="0.12" fill="#5e4122"/>', 0.45],
  waves: [8, 4, '<path d="M0 1 Q1 0.4 2 1 T4 1 T6 1 T8 1 M0 3 Q1 2.4 2 3 T4 3 T6 3 T8 3" stroke="#7fe3e0" stroke-width="0.12" fill="none"/><circle cx="5" cy="2" r="0.1" fill="#d6fbff"/>', 0.34],
  rays: [8, 8, '<path d="M4 4 L4 1.6 M4 4 L6.1 4 M4 4 L4 6.4 M4 4 L1.9 4" stroke="#ffe9a3" stroke-width="0.08"/><rect x="3.8" y="3.8" width="0.4" height="0.4" fill="#fff6d0"/><rect x="0.3" y="0.4" width="0.2" height="0.2" fill="#fff"/><rect x="7.2" y="6.9" width="0.2" height="0.2" fill="#fff"/>', 0.3],
  mist: [10, 6, '<ellipse cx="2.5" cy="1.4" rx="2" ry="0.35" fill="#b9a6e6"/><ellipse cx="7.4" cy="4.3" rx="2.3" ry="0.4" fill="#8d7bc0"/><ellipse cx="5" cy="5.6" rx="1.2" ry="0.22" fill="#b9a6e6"/>', 0.16],
  scales: [4, 4, '<path d="M0 2 Q1 0.8 2 2 Q3 0.8 4 2 M-2 4 Q-1 2.8 0 4 Q1 2.8 2 4 Q3 2.8 4 4 M0 0 Q1 -1.2 2 0 Q3 -1.2 4 0" stroke="#1f1b26" stroke-width="0.1" fill="none"/><rect x="1.9" y="2.7" width="0.2" height="0.2" fill="#c0394b"/>', 0.3],
  slab: [10, 8, '<path d="M0 0 H10 M0 4 H10 M3 0 V4 M8 4 V8" stroke="#2f2b26" stroke-width="0.1"/><path d="M4.5 0.8 l0.8 1 l-0.4 0.9 l0.9 0.8 M1 5 l0.9 0.7 l-0.2 1" stroke="#d8cbb4" stroke-width="0.07" fill="none"/>', 0.32],
  comb: [5.2, 6, '<path d="M1.3 0 L2.6 0.75 V2.25 L1.3 3 L0 2.25 V0.75 Z M3.9 3 L5.2 3.75 V5.25 L3.9 6 L2.6 5.25 V3.75 Z" stroke="#ffd24a" stroke-width="0.08" fill="none"/>', 0.3],
  breeze: [14, 8, '<path d="M1 2.6 h4.2 q1.5 0 1.5 -0.9 q0 -0.8 -0.9 -0.8 q-0.7 0 -0.7 0.6 M8 6 h3.6 q1.3 0 1.3 -0.8 q0 -0.7 -0.8 -0.7 q-0.6 0 -0.6 0.5 M2.5 5.2 h2.4 M9.5 2 h2" stroke="#fff" stroke-width="0.14" fill="none" stroke-linecap="round"/>', 0.3],
  clouds: [12, 7, '<ellipse cx="3" cy="1.8" rx="2.2" ry="0.55" fill="#fff"/><ellipse cx="4.2" cy="1.4" rx="1.2" ry="0.5" fill="#fff"/><ellipse cx="9.2" cy="5.2" rx="2" ry="0.5" fill="#eaf6ff"/><ellipse cx="8.2" cy="4.8" rx="1.1" ry="0.45" fill="#eaf6ff"/>', 0.2],
  stars: [9, 9, '<path d="M1.5 1.6 L3.6 2.8 L5.4 1.2 M3.6 2.8 L4.4 5.2 L7.2 6.4" stroke="#c9a4ff" stroke-width="0.06" fill="none"/><circle cx="1.5" cy="1.6" r="0.16" fill="#fff0fb"/><circle cx="3.6" cy="2.8" r="0.2" fill="#ff9ae6"/><circle cx="5.4" cy="1.2" r="0.12" fill="#fff"/><circle cx="4.4" cy="5.2" r="0.15" fill="#fff0fb"/><circle cx="7.2" cy="6.4" r="0.18" fill="#b48cff"/><circle cx="8.1" cy="2.2" r="0.09" fill="#fff"/><circle cx="0.8" cy="7.4" r="0.1" fill="#fff"/>', 0.42],
  panels: [5, 5, '<path d="M0 0 H5 M0 0 V5" stroke="#bcd3dc" stroke-width="0.07"/><circle cx="0.4" cy="0.4" r="0.1" fill="#d7e6ee"/>', 0.3],
};

const SIDELINE_MOTION = {
  ice: '<path d="M-.5 -.6h.3m.55 .5h.23m-.6 1h.24" stroke="#e6f7ff" stroke-width=".18"/>',
  lava: '<circle cx="-.2" cy="-.5" r=".12" fill="#ffab42"/><circle cx=".25" cy="-1" r=".09" fill="#ffd075"/>',
  leaves: '<ellipse cx="-.55" cy=".7" rx=".25" ry=".12" fill="#a8eb8a"/>',
  sand: '<path d="M-.7 -.25q.65 -.45 1.4 0m-1.1 .45h.78" fill="none" stroke="#e6be83" stroke-width=".16"/>',
  waves: '<ellipse rx=".52" ry=".85" fill="none" stroke="#b1fffc" stroke-width=".16"/>',
  rays: '<circle cy="-1.05" r=".62" fill="#ffe3a1" opacity=".55"/>',
  mist: '<ellipse cy=".35" rx="1.15" ry=".45" fill="#c5b2fa" opacity=".42"/>',
  scales: '<ellipse cx=".1" cy="-.75" rx=".42" ry=".18" fill="#ff8d82" opacity=".55"/>',
  panels: '<rect x="-.18" y="-.86" width=".36" height=".55" rx=".1" fill="#cff8ff"/>',
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
      else if (env.texture === 'storm') { const L = lookFor(env.id); out.push(`<circle cx="${x}" cy="${y}" r="0.62" fill="#0c1430" stroke="${L.colors[0]}" stroke-width="0.14"/><circle class="sfx-node sfx-anim" style="animation-delay:-${k * 0.8}s" cx="${x}" cy="${y}" r="0.34" fill="${L.colors[2]}"/>`); } // energy nodes on the channel
      else if (env.texture === 'sand') out.push(`<path d="M${x - 0.8} ${y + 0.6} L${x - 0.2} ${y - 0.7} L${x + 0.7} ${y + 0.6} Z" fill="#7a4f2a" opacity="0.85"/>`); // red rock
      else if (env.texture === 'waves') out.push(`<ellipse cx="${x}" cy="${y}" rx="0.8" ry="${1.2 + k * 0.3}" fill="#0c3346"/><ellipse cx="${x}" cy="${y}" rx="0.5" ry="${0.8 + k * 0.25}" fill="${c}" opacity="0.7"/>`); // tide pools
      else if (env.texture === 'rays') out.push(`<rect x="${x - 0.18}" y="${y - 0.9}" width="0.36" height="1.8" fill="#f6f1df"/><rect x="${x - 0.4}" y="${y - 1.3}" width="0.8" height="0.5" fill="${c}"/><rect x="${x - 0.22}" y="${y - 1.2}" width="0.44" height="0.3" fill="#fff"/>`); // lanterns
      else if (env.texture === 'mist') out.push(`<ellipse cx="${x}" cy="${y}" rx="1.1" ry="${0.5 + k * 0.15}" fill="${c}" opacity="0.28"/><rect x="${x - 0.15}" y="${y - 0.9}" width="0.3" height="1.2" fill="#17131f"/><rect x="${x - 0.2}" y="${y - 1.15}" width="0.4" height="0.3" fill="${c}" opacity="0.8"/>`); // mist and dim lamps
      else if (env.texture === 'scales') out.push(k === 0
        ? `<rect x="${x - 0.5}" y="${y + 0.3}" width="1" height="0.5" fill="#2b2730"/><rect x="${x - 0.3}" y="${y - 0.7}" width="0.6" height="1" fill="#6b6672"/><rect x="${x - 0.3 + (side > 0 ? -0.35 : 0.35)}" y="${y - 1.1}" width="0.6" height="0.5" fill="#6b6672"/><rect x="${x + (side > 0 ? -0.45 : 0.3)}" y="${y - 0.95}" width="0.15" height="0.15" fill="${c}"/>` // a dragon statue: plinth, body, head turned to the field, one red eye
        : `<rect x="${x - 0.08}" y="${y - 1.1}" width="0.16" height="2" fill="#2b2730"/><rect x="${x - 0.08 + (side > 0 ? -0.6 : 0.16)}" y="${y - 1.1}" width="0.6" height="0.9" fill="${k === 1 ? c : '#7b3fa0'}"/>`); // banners, crimson and purple
      else if (env.texture === 'panels') out.push(`<rect x="${x - 0.25}" y="${y - 1}" width="0.5" height="2" rx="0.2" fill="${c}" opacity="0.8"/>`); // light strips
      if (env.texture === 'storm') {
        // Current jumps from this marker to the next one up the sideline. Each jump waits its turn (the delay follows the marker's
        // place on the field), so the electricity cycles along the sideline, marker to marker, on both sides.
        const step = Math.round(yard / 6) + (side > 0 ? 3 : 0); const dy = -6; const j = side * 0.42;
        out.push(`<path class="sfx-chain sfx-anim" style="animation-delay:-${(((7 - (step % 7)) % 7) * 0.26).toFixed(2)}s" d="M${x} ${y - 0.5} l${-j} ${dy * 0.17} ${j * 1.7} ${dy * 0.16} ${-j * 1.9} ${dy * 0.17} ${j * 1.6} ${dy * 0.16} ${-j * 0.4} ${dy * 0.17}" fill="none" stroke="#dff3ff" stroke-width=".24" stroke-linecap="round" stroke-linejoin="round"/>`);
      } else if (SIDELINE_MOTION[env.texture]) {
        out.push(`<g transform="translate(${x} ${y})"><g class="venue-detail venue-detail-${env.texture}" style="animation-delay:-${k * .85}s">${SIDELINE_MOTION[env.texture]}</g></g>`);
      }
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
  if (env.texture === 'waves') return `<path d="M${x0} ${y0 + h * 0.4} Q${x0 + w * 0.125} ${y0 + h * 0.2} ${x0 + w * 0.25} ${y0 + h * 0.4} T${x0 + w * 0.5} ${y0 + h * 0.4} T${x0 + w * 0.75} ${y0 + h * 0.4} T${x0 + w} ${y0 + h * 0.4} M${x0} ${y0 + h * 0.7} Q${x0 + w * 0.125} ${y0 + h * 0.5} ${x0 + w * 0.25} ${y0 + h * 0.7} T${x0 + w * 0.5} ${y0 + h * 0.7} T${x0 + w * 0.75} ${y0 + h * 0.7} T${x0 + w} ${y0 + h * 0.7}" stroke="${c}" stroke-width="0.3" fill="none" opacity="0.45"/>`;
  if (env.texture === 'rays') return `<g opacity="0.4" stroke="${c}" stroke-width="0.25">${[-0.36, -0.18, 0, 0.18, 0.36].map((k) => `<line x1="${x0 + w * 0.5}" y1="${y0 + h * 0.5}" x2="${x0 + w * (0.5 + k)}" y2="${y0 + (Math.abs(k) > 0.2 ? h * 0.15 : 0.4)}"/><line x1="${x0 + w * 0.5}" y1="${y0 + h * 0.5}" x2="${x0 + w * (0.5 + k)}" y2="${y0 + h - (Math.abs(k) > 0.2 ? h * 0.15 : 0.4)}"/>`).join('')}</g><rect x="${x0 + w * 0.5 - 0.9}" y="${y0 + h * 0.5 - 0.9}" width="1.8" height="1.8" fill="#fff6d0" opacity="0.45"/>`;
  if (env.texture === 'mist') return `<ellipse cx="${x0 + w * 0.3}" cy="${y0 + h * 0.4}" rx="${w * 0.22}" ry="${h * 0.12}" fill="${c}" opacity="0.18"/><ellipse cx="${x0 + w * 0.68}" cy="${y0 + h * 0.65}" rx="${w * 0.26}" ry="${h * 0.13}" fill="${c}" opacity="0.14"/>`;
  if (env.texture === 'scales') return `<path d="M${x0 + w * 0.5 - 4} ${y0 + h * 0.7} l1.2 -${h * 0.45} l1 ${h * 0.3} l1.8 -${h * 0.4} l1.8 ${h * 0.4} l1 -${h * 0.3} l1.2 ${h * 0.45} Z" fill="#7b3fa0" opacity="0.3"/><rect x="${x0}" y="${y0 + h * 0.5 - 0.15}" width="${w}" height="0.3" fill="${c}" opacity="0.35"/>`; // a crown of horns and a crimson band
  if (env.texture === 'sand') return `<path d="M${x0} ${y0 + h * 0.7} Q${x0 + w * 0.5} ${y0 + h * 0.4} ${x0 + w} ${y0 + h * 0.7}" stroke="${c}" stroke-width="0.25" fill="none" opacity="0.4"/>`;
  if (env.texture === 'slab') return `<path d="M${x0} ${y0 + h * 0.5} h${w * 0.3} l${w * 0.05} ${-h * 0.2} l${w * 0.08} ${h * 0.35} l${w * 0.07} ${-h * 0.15} h${w * 0.5}" stroke="${c}" stroke-width="0.25" fill="none" opacity="0.35"/>`;
  if (env.texture === 'comb') return `<g opacity="0.35" fill="none" stroke="${c}" stroke-width="0.22">${[-2, 0, 2].map((k) => { const cx = x0 + w * 0.5 + k * 3.2, cy = y0 + h * 0.5 + (k ? 0 : 0); return `<path d="M${cx} ${cy - 2.6} l2.25 1.3 v2.6 l-2.25 1.3 l-2.25 -1.3 v-2.6 Z"/>`; }).join('')}</g>`;
  if (env.texture === 'clouds' || env.texture === 'breeze') return `<ellipse cx="${x0 + w * 0.26}" cy="${y0 + h * 0.42}" rx="${w * 0.2}" ry="${h * 0.16}" fill="${c}" opacity="0.2"/><ellipse cx="${x0 + w * 0.36}" cy="${y0 + h * 0.34}" rx="${w * 0.11}" ry="${h * 0.14}" fill="${c}" opacity="0.2"/><ellipse cx="${x0 + w * 0.74}" cy="${y0 + h * 0.66}" rx="${w * 0.18}" ry="${h * 0.14}" fill="${c}" opacity="0.16"/>`;
  if (env.texture === 'stars') return `<g opacity="0.4" fill="none" stroke="${c}" stroke-width="0.2"><path d="M${x0 + w * 0.5 - 5} ${y0 + h * 0.5} Q${x0 + w * 0.5} ${y0 + h * 0.5 - 3.4} ${x0 + w * 0.5 + 5} ${y0 + h * 0.5} Q${x0 + w * 0.5} ${y0 + h * 0.5 + 3.4} ${x0 + w * 0.5 - 5} ${y0 + h * 0.5} Z"/><circle cx="${x0 + w * 0.5}" cy="${y0 + h * 0.5}" r="1.5"/></g>`;
  return '';
}

/**
 * The turf for one frame: base, stripes, texture, end zones, tint and decor. `venue` is {env, weather} (a game's venue);
 * without one, the classic grass is drawn exactly as before. Returns { turf, endZones } so the caller keeps its own order.
 */
export function turfSvg(venue, cam, HW, SPAN, Y) {
  const env = ENVIRONMENTS[venue?.env] || designField(venue?.env) || ENVIRONMENTS.grass; const P = env.palette; // a design no club plays on yet draws like any field
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
    over: `${P.tint ? `<rect x="${-HW}" y="0" width="${HW * 2}" height="${SPAN}" fill="${P.tint}"/>` : ''}${lookFor(env.id) ? edgeSvg(env.id, cam, HW, Y, SPAN) : env.id === 'grass' ? '' : sidelineDecor(env, cam, HW, Y)}` };
}

/** The CSS class for the weather layer over the field ('' when nothing is drawn: clear, overcast handled by a tint, indoors). */
export function weatherClass(venue) {
  const w = venue?.weather; if (!w || w === 'clear' || w === 'indoor') return '';
  return `weather-${w}`;
}
export const weatherLabel = (venue) => (WEATHER[venue?.weather] || WEATHER.clear);
